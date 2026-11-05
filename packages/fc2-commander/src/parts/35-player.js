// FC2 remains the only owner of media sources, authentication, quality and reconnects.
function createFc2NativeControls(area) {
  const find = selector => area.querySelector(`#js-player_controls ${selector}`);
  function click(selector) {
    const target = find(selector);
    if (!target || target.disabled) throw new Error('当前播放模式不支持这项操作');
    target.click();
  }
  function read() {
    const qualityArea = find('.js-hlsQualityBtnArea');
    const qualities = qualityArea && getComputedStyle(qualityArea).display !== 'none'
      ? [...qualityArea.querySelectorAll('#js-hlsQualityList li[data-index]')]
        .filter(element => !element.classList.contains('is-disabled'))
        .map(element => {
          const label = fc2Text(element.textContent);
          const rate = label.match(/([\d.]+)\s*([km])bps/i);
          return {
            value: element.dataset.index, label, selected: element.classList.contains('is-current'),
            bitrate: rate ? Number(rate[1]) * (rate[2].toLowerCase() === 'm' ? 1000000 : 1000) : null
          };
        }) : [];
    const latencyArea = find('.js-hlsLatencyArea');
    const latency = latencyArea && getComputedStyle(latencyArea).display !== 'none'
      ? find('[data-name="changeHlsLatency"] .js-slider_value') : null;
    return {
      qualities,
      latency: latency ? {
        value: Number(latency.textContent), min: Number(latency.dataset.min),
        max: Number(latency.dataset.max), step: Number(latency.dataset.step)
      } : null,
      comment: find('.js-commentMoveBtn_on')?.style.display !== 'none',
      gift: find('.js-giftMoveBtn_on')?.style.display !== 'none',
      hasComment: !!find('.js-commentMoveBtn'),
      hasGift: !!find('.js-giftMoveBtn'),
      canReload: !!find('.js-reloadBtn')
    };
  }
  return {
    read,
    reload: () => click('.js-reloadBtn'),
    comment: () => click('.js-commentMoveBtn'),
    gift: () => click('.js-giftMoveBtn'),
    quality(value) {
      if (!read().qualities.some(item => item.value === value)) throw new Error('当前播放模式未提供这项画质');
      const target = [...area.querySelectorAll('#js-hlsQualityList li[data-index]')]
        .find(element => element.dataset.index === value);
      if (!target) throw new Error('画质列表已更新，请重新选择');
      target.click();
    },
    latency(value) {
      // FC2 exposes this setting only through its delegated slider gesture.
      // Keep that widget laid out (but invisible) so its own handler owns the change.
      const slider = find('[data-name="changeHlsLatency"]');
      const track = slider?.querySelector('.js-slider_range')?.parentElement;
      const state = read().latency;
      if (!track || !state || !Number.isFinite(value) || state.max <= state.min) {
        throw new Error('当前播放模式不支持延迟调整');
      }
      const bounds = track.getBoundingClientRect();
      if (bounds.width <= 0) throw new Error('延迟控件尚未就绪');
      const fraction = (Math.min(state.max, Math.max(state.min, value)) - state.min) / (state.max - state.min);
      const mouse = (type, clientX) => new MouseEvent(type, { bubbles: true, clientX, clientY: bounds.top + 1, button: 0 });
      slider.dispatchEvent(mouse('mousedown', bounds.left + 1));
      document.dispatchEvent(mouse('mousemove', bounds.left + bounds.width * fraction));
      document.dispatchEvent(mouse('mouseup', bounds.left + bounds.width * fraction));
    }
  };
}

function mountFc2Player(onModeChange) {
  const scope = document.querySelector('.m-viewPlayer');
  let enabled = !readFc2Preferences().nativePlayer;
  let session = null;
  let frame = 0;
  const preferences = readFc2Preferences();
  let sound = preferences.playerVolume == null ? null
    : { volume: preferences.playerVolume, muted: preferences.playerMuted === true };
  let userPaused = false;
  let disposed = false;
  const mediaSelector = '#js-video_area, #js-player_controls, video:not(.subVideo)';
  const bridgeSelector = '.js-hlsQualityBtnArea, .js-hlsLatencyArea, .js-commentMoveBtn, .js-giftMoveBtn, .js-reloadBtn';

  function nativeVisible(element, boundary) {
    for (let node = element; node && node !== boundary; node = node.parentElement) {
      if (node.hidden || getComputedStyle(node).display === 'none') return false;
    }
    return true;
  }
  function activeVideo(area) {
    return [...area.querySelectorAll('#js-videoComponentBox video:not(.subVideo)')]
      .filter(video => nativeVisible(video, area))
      .sort((a, b) => (Number(b.style.zIndex) || 0) - (Number(a.style.zIndex) || 0))[0] || null;
  }
  function restoreAttribute(element, name, value) {
    if (value == null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }
  function detach() {
    if (!session) return;
    const { art, video, anchor, host, area, nativeControls, nativeAttributes, videoAttributes } = session;
    clearInterval(session.statusTimer);
    if (area.classList.contains('fc-player-web')) setWebFullscreen(false);
    session = null;
    sound = { volume: video.volume, muted: video.muted };
    area.classList.remove('fc-art-active');
    // Return the same node before destroying the ArtPlayer DOM; never call load(), clear src or stop tracks.
    if (anchor.parentNode && host.isConnected && host.contains(video)) anchor.replaceWith(video);
    else anchor.remove();
    video.classList.remove('art-video');
    for (const [name, value] of Object.entries(videoAttributes)) restoreAttribute(video, name, value);
    for (const [name, value] of Object.entries(nativeAttributes)) restoreAttribute(nativeControls, name, value);
    art.destroy();
    host.remove();
  }
  function attempt(action) {
    Promise.resolve().then(action).catch(error => fc2Toast(error.message || '操作失败，请重试'));
  }
  function setWebFullscreen(value) {
    if (!session) return;
    session.area.classList.toggle('fc-player-web', value);
    document.documentElement.classList.toggle('fc-player-web-open', value);
    window.dispatchEvent(new Event('resize'));
  }
  function rememberSound(video) {
    const next = { volume: video.volume, muted: video.muted };
    if (sound?.volume === next.volume && sound?.muted === next.muted) return;
    sound = next;
    setFc2Preferences({ playerVolume: next.volume, playerMuted: next.muted });
  }
  function fullscreen() {
    if (!session) return;
    if (document.fullscreenElement) return document.exitFullscreen();
    if (session.area.requestFullscreen) return session.area.requestFullscreen();
    throw new Error('此浏览器不支持页面全屏，请使用网页全屏');
  }
  function controlButton(name, label, action, position = 'right', index = 10) {
    return {
      name, position, index,
      html: fc2Button(label, () => attempt(action), { class: 'fc-player-button', 'aria-label': label, title: label })
    };
  }
  function refreshMenu() {
    if (!session) return;
    const { bridge, quality, latency, comment, gift, reload } = session;
    const state = bridge.read();
    const signature = JSON.stringify(state);
    if (signature === session.menuSignature) return;
    session.menuSignature = signature;
    quality.replaceChildren(...state.qualities.map(item => fc2El('option', { value: item.value, text: item.label })));
    quality.value = state.qualities.find(item => item.selected)?.value || '';
    quality.parentElement.hidden = !state.qualities.length;
    latency.parentElement.hidden = !state.latency;
    if (state.latency) {
      const { min, max, step, value } = state.latency;
      latency.replaceChildren(...Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, index) => {
        const level = min + index * step;
        return fc2El('option', { value: level, text: level === min ? '低延迟' : level === max ? '更流畅' : '均衡' });
      }));
      latency.value = String(value);
    }
    for (const [button, available, active, label] of [
      [comment, state.hasComment, state.comment, '弹幕'], [gift, state.hasGift, state.gift, '礼物动画']
    ]) {
      button.hidden = !available;
      button.setAttribute('aria-pressed', String(active));
      button.textContent = `${label}：${active ? '开' : '关'}`;
    }
    reload.disabled = !state.canReload;
  }
  function status() {
    if (!session) return;
    const { art, video, status: label } = session;
    const now = performance.now();
    const progress = video.videoWidth && video.getVideoPlaybackQuality
      ? video.getVideoPlaybackQuality().totalVideoFrames : video.currentTime;
    if (progress !== session.progress || video.paused) session.lastProgressAt = now;
    session.progress = progress;
    const tracks = video.srcObject instanceof MediaStream ? video.srcObject.getTracks() : [];
    const ended = video.ended || (tracks.length > 0 && tracks.every(track => track.readyState === 'ended'));
    // WebRTC can keep readyState=4 after packets stop; allow short jitter, then report missing frames.
    const stalled = !video.paused && now - session.lastProgressAt >= 8000;
    if (video.readyState >= 3 && !art.isReady) art.emit('video:canplay');
    if (video.readyState >= 3) {
      if (art.loading.show) art.loading.show = false;
      if (art.mask.show !== video.paused) art.mask.show = video.paused;
    }
    const state = !navigator.onLine ? 'offline' : video.error ? 'error' : ended ? 'ended'
      : video.readyState < 3 ? 'waiting' : video.paused ? 'paused' : stalled ? 'stalled' : 'playing';
    const text = {
      offline: '网络已断开', error: '播放异常 · 可重连', ended: '媒体已结束',
      stalled: '画面中断 · 等待恢复', waiting: '等待直播', paused: '已暂停', playing: '直播'
    }[state];
    const title = video.videoWidth ? `${video.videoWidth} × ${video.videoHeight}` : '等待原站连接';
    if (label.textContent !== text) label.textContent = text;
    if (label.title !== title) label.title = title;
  }
  function attach(video, area) {
    const nativeControls = area.querySelector('#js-player_controls');
    if (!nativeControls) return;
    const bridge = createFc2NativeControls(area);
    const anchor = document.createComment('Creamu video position');
    const host = fc2El('div', { class: 'fc-art-host' });
    const videoAttributes = Object.fromEntries(['controls', 'preload', 'playsinline', 'webkit-playsinline', 'disablepictureinpicture']
      .map(name => [name, video.getAttribute(name)]));
    const nativeAttributes = Object.fromEntries(['aria-hidden', 'inert'].map(name => [name, nativeControls.getAttribute(name)]));
    const originalClass = video.className;
    video.before(anchor);
    video.parentElement.append(host);
    const label = fc2El('span', { class: 'fc-player-status', text: '等待直播', role: 'status' });
    const quality = fc2El('select', { 'aria-label': '直播画质' });
    const latency = fc2El('select', { 'aria-label': '直播延迟' });
    const fit = fc2El('select', { 'aria-label': '画面适配' },
      fc2El('option', { value: 'contain', text: '完整画面' }),
      fc2El('option', { value: 'cover', text: '铺满（裁切）' }),
      fc2El('option', { value: 'fill', text: '拉伸铺满' }));
    fit.addEventListener('change', () => host.style.setProperty('--fc-video-fit', fit.value));
    quality.addEventListener('change', () => attempt(() => bridge.quality(quality.value)));
    latency.addEventListener('change', () => attempt(() => bridge.latency(Number(latency.value))));
    const comment = fc2Button('弹幕', () => attempt(bridge.comment));
    const gift = fc2Button('礼物动画', () => attempt(bridge.gift));
    const reload = fc2Button('重新连接', () => attempt(bridge.reload), { class: 'fc-player-button' });
    const menuContent = fc2El('div', {},
      fc2El('label', { text: '画质' }, quality), fc2El('label', { text: '延迟 / 稳定性' }, latency),
      fc2El('label', { text: '画面适配' }, fit),
      fc2El('div', { class: 'fc-player-menu-actions' }, comment, gift),
      fc2El('div', { class: 'fc-player-menu-mobile' },
        fc2Button('重新连接', () => attempt(bridge.reload)),
        fc2Button('截图', () => attempt(() => art.screenshot()))),
      fc2El('p', { text: `快捷键：空格 播放/暂停 · ↑↓ 音量 · M 静音 · F 全屏 · W 网页全屏` }));
    let art;
    try {
      Artplayer.REMOVE_SRC_WHEN_DESTROY = false;
      Artplayer.LOG_VERSION = false;
      Artplayer.DBCLICK_FULLSCREEN = false;
      Artplayer.MOBILE_DBCLICK_PLAY = false;
      const currentSound = sound || { volume: video.volume, muted: video.muted };
      art = new Artplayer({
        container: host, url: '', proxy: () => video, isLive: true,
        lang: 'zh-cn', theme: '#f3a18c', mutex: false, hotkey: false,
        // The default SVG keeps its SMIL animations ticking even while the loading layer is hidden.
        icons: { loading: '<span class="fc-player-spinner" aria-hidden="true"></span>' },
        volume: currentSound.volume, muted: currentSound.muted,
        pip: !!document.pictureInPictureEnabled, setting: false,
        fullscreen: false, fullscreenWeb: false, screenshot: false,
        moreVideoAttr: { controls: false, preload: video.preload },
        controls: [
          { name: 'live', position: 'left', index: 30, html: label },
          { name: 'reconnect', position: 'left', index: 40, html: reload },
          controlButton('settings', '播放设置', () => { art.setting.toggle(); refreshMenu(); }),
          controlButton('screenshot', '截图', () => art.screenshot().catch(() => { throw new Error('当前直播无法截图（可能受视频跨域限制）'); }), 'right', 15),
          controlButton('web', '网页全屏', () => setWebFullscreen(!area.classList.contains('fc-player-web')), 'right', 40),
          controlButton('fullscreen', '全屏', fullscreen, 'right', 50)
        ]
      });
      video.className = `${originalClass} art-video`.trim();
      video.volume = currentSound.volume;
      video.muted = currentSound.muted;
      // The site already owns source errors and reconnects. ArtPlayer owns controls only.
      art.off('video:error');
      // ArtPlayer defers its empty-URL spinner; an already decoding proxy has no new source to load.
      art.on('loading', visible => {
        if (visible && video.readyState >= 3 && !video.seeking) art.loading.show = false;
      });
      // Use the native video-area fullscreen so payment/permission covers and comment canvases stay visible.
      art.off('video:loadedmetadata');
      art.hotkey.keys = {};
      for (const [key, action] of Object.entries({
        Space: () => art.toggle(), ArrowUp: () => { art.volume = Math.min(1, art.volume + .1); },
        ArrowDown: () => { art.volume = Math.max(0, art.volume - .1); },
        KeyM: () => { art.muted = !art.muted; }, KeyF: fullscreen,
        KeyW: () => setWebFullscreen(!area.classList.contains('fc-player-web')),
        Escape: () => { art.setting.show = false; setWebFullscreen(false); }
      })) art.hotkey.add(key, () => {
        if (key !== 'Escape' && document.activeElement?.closest('input,textarea,select,button,[contenteditable]')) return;
        attempt(action);
      });
      art.proxy(art.template.$player, 'dblclick', event => {
        if (event.target === video) attempt(fullscreen);
      });
      // Share ArtPlayer's setting state so its idle timer knows the menu is in use.
      const menu = art.template.$setting;
      menu.classList.add('fc-player-menu', 'fc-app');
      menu.setAttribute('aria-label', '播放设置');
      menu.append(...menuContent.childNodes);
      const settingsButton = art.controls.settings.querySelector('button');
      settingsButton.setAttribute('aria-expanded', 'false');
      art.on('setting', visible => {
        settingsButton.setAttribute('aria-expanded', String(visible));
        if (visible) art.controls.show = true;
      });
      art.on('document:click', event => {
        // Delegated native actions synthesize clicks outside ArtPlayer; only user clicks dismiss the menu.
        if (event.isTrusted && !menu.contains(event.target) && !settingsButton.contains(event.target)) art.setting.show = false;
      });
      session = { art, video, anchor, host, area, bridge, nativeControls, nativeAttributes, videoAttributes,
        status: label, quality, latency, comment, gift, reload, menu, menuSignature: '',
        progress: null, lastProgressAt: performance.now(), statusTimer: setInterval(status, 1000) };
      nativeControls.setAttribute('aria-hidden', 'true');
      nativeControls.setAttribute('inert', '');
      area.classList.add('fc-art-active');
      art.on('play', () => { userPaused = false; });
      art.on('pause', () => { userPaused = true; });
      art.on('video:volumechange', () => rememberSound(video));
      for (const event of ['canplay', 'playing', 'pause', 'waiting', 'loadedmetadata', 'error', 'emptied', 'ended']) art.on(`video:${event}`, status);
      art.on('video:loadedmetadata', () => art.emit('resize'));
      for (const [selector, name] of [['.art-control-playAndPause', '播放 / 暂停'], ['.art-control-pip', '画中画']]) {
        const element = host.querySelector(selector);
        if (!element) continue;
        element.setAttribute('role', 'button');
        element.setAttribute('aria-label', name);
        element.tabIndex = 0;
        art.proxy(element, 'keydown', event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          if (selector === '.art-control-playAndPause') attempt(() => art.toggle());
          else element.click();
        });
      }
      if (userPaused) video.pause();
      refreshMenu();
      status();
      if (!video.paused && video.readyState >= 3) art.emit('video:playing');
    } catch (error) {
      if (session) detach();
      else {
        if (anchor.parentNode) anchor.replaceWith(video);
        video.className = originalClass;
        for (const [name, value] of Object.entries(videoAttributes)) restoreAttribute(video, name, value);
        art?.destroy();
        host.remove();
      }
      enabled = false;
      onModeChange(false);
      fc2Toast(`增强播放器未能启动，已保留原生播放器：${error.message}`);
    }
  }
  function reconcile() {
    frame = 0;
    if (!enabled || disposed) return;
    const area = scope.querySelector('#js-video_area');
    const video = area && activeVideo(area);
    if (session && (video !== session.video || area !== session.area)) detach();
    if (video && !session) attach(video, area);
    refreshMenu();
  }
  function schedule() {
    if (!frame && enabled && !disposed) frame = requestAnimationFrame(reconcile);
  }
  const observer = new MutationObserver(records => {
    if (records.some(record => {
      const target = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
      if (!target || (target.closest('.fc-art-host') && target.tagName !== 'VIDEO')) return false;
      // Only source visibility/membership and the controls we bridge can change our session.
      // FC2 also animates comments and updates playback statistics in this subtree.
      if (target.closest('#js-player_controls')) return !!target.closest(bridgeSelector)
        || [...record.addedNodes, ...record.removedNodes].some(node =>
          node.nodeType === 1 && (node.matches(bridgeSelector) || node.querySelector(bridgeSelector)));
      if (record.type === 'attributes') return target.matches('video:not(.subVideo)')
        || !!target.querySelector('video:not(.subVideo)');
      return record.type === 'childList' && [...record.addedNodes, ...record.removedNodes].some(node =>
        node.nodeType === 1 && (node.matches(mediaSelector) || node.querySelector(mediaSelector)));
    })) schedule();
  });
  observer.observe(scope, { childList: true, subtree: true, attributes: true,
    attributeFilter: ['class', 'style', 'src', 'hidden', 'data-index', 'disabled'], characterData: true });
  for (const event of ['loadedmetadata', 'loadstart', 'emptied', 'play']) scope.addEventListener(event, schedule, true);
  function onPageHide(event) {
    if (event.persisted) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    for (const event of ['loadedmetadata', 'loadstart', 'emptied', 'play']) scope.removeEventListener(event, schedule, true);
    window.removeEventListener('pagehide', onPageHide);
    detach();
  }
  window.addEventListener('pagehide', onPageHide);
  function setEnabled(value) {
    enabled = value;
    if (enabled && typeof Artplayer !== 'function') {
      enabled = false;
      fc2Toast('ArtPlayer 依赖未加载，请更新脚本后刷新页面');
    }
    if (enabled) schedule();
    else detach();
    onModeChange(enabled);
  }
  setEnabled(enabled);
  return {
    toggle() {
      setEnabled(!enabled);
      setFc2Preferences({ nativePlayer: !enabled });
    }
  };
}
