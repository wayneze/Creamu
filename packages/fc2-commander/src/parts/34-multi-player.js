// Each tile owns one FC2 control connection and one HLS engine. No native room is loaded.
function createFc2MultiPlayer({ id, container, onStatus, onQualities, onChannel, onSound }) {
  let run = null;
  let generation = 0;
  let disposed = false;
  let blocked = false;
  let retries = 0;
  let retryTimer = 0;
  let paused = false;
  let awaitingGesture = false;
  let audible = false;
  let selectedQuality = 'auto';
  let healthySince = 0;
  let lastProgressAt = performance.now();
  let lastFrames = 0;
  let lastStatus = '';
  const publishStatus = text => {
    if (text !== lastStatus) { lastStatus = text; onStatus(text); }
  };
  if (typeof Artplayer !== 'function' || typeof Hls !== 'function' || !Hls.isSupported()) {
    publishStatus('HLS 播放不可用 · 请打开原房间');
    return { destroy() {}, reload() {}, setAudible() {}, setQuality() { throw new Error('HLS 播放不可用'); } };
  }
  Artplayer.REMOVE_SRC_WHEN_DESTROY = false;
  Artplayer.LOG_VERSION = false;
  Artplayer.DBCLICK_FULLSCREEN = false;
  function perform(action) {
    Promise.resolve().then(action).catch(() => publishStatus('操作未完成 · 请点击播放器重试'));
  }
  function fullscreen() {
    if (document.fullscreenElement) return document.exitFullscreen();
    if (container.requestFullscreen) return container.requestFullscreen();
    throw new Error('浏览器不支持全屏');
  }
  const art = new Artplayer({
    container, url: '', isLive: true, lang: 'zh-cn', theme: '#f3a18c',
    autoplay: false, muted: true, volume: 1, mutex: false, hotkey: false,
    fullscreen: false, pip: !!document.pictureInPictureEnabled,
    icons: { loading: '<span class="fc-player-spinner" aria-hidden="true"></span>' },
    controls: [
      {
        name: 'sound', position: 'left', index: 20,
        html: fc2Button('声音', onSound, { class: 'fc-player-button', 'aria-label': '切换这路声音' })
      },
      {
        name: 'fullscreen', position: 'right', index: 50,
        html: fc2Button('全屏', () => perform(fullscreen), { class: 'fc-player-button', 'aria-label': '全屏' })
      }
    ]
  });
  art.off('video:error');
  // ArtPlayer 5.4.0's metadata hook leaves document fullscreen listeners after destroy.
  // Like the single-room player, this tile owns fullscreen through disposable listeners.
  art.off('video:loadedmetadata');
  art.on('video:loadedmetadata', () => art.emit('resize'));
  art.proxy(document, 'fullscreenchange', () => art.emit('resize'));
  const video = art.video;
  art.proxy(video, 'dblclick', () => perform(fullscreen));
  container.tabIndex = 0;
  container.setAttribute('aria-label', `房间 ${id} 的播放器`);
  function keyboard(event) {
    if (event.target.closest('button,input,select,textarea,[contenteditable]')) return;
    const actions = {
      Space: () => video.paused ? art.play() : art.pause(), KeyM: onSound,
      KeyF: fullscreen,
      ArrowUp: () => { art.volume = Math.min(1, art.volume + .1); },
      ArrowDown: () => { art.volume = Math.max(0, art.volume - .1); }
    };
    if (!actions[event.code]) return;
    event.preventDefault();
    perform(actions[event.code]);
  }
  container.addEventListener('keydown', keyboard);
  // Volume selection belongs to the board; media events must never change another room.
  art.on('video:volumechange', () => { if (video.muted === audible) video.muted = !audible; });
  art.on('pause', () => { paused = true; publishStatus('已暂停'); });
  art.on('play', () => { paused = false; awaitingGesture = false; lastProgressAt = performance.now(); });
  const active = attempt => !disposed && run === attempt && attempt.generation === generation;
  function release() {
    generation++;
    const previous = run;
    run = null;
    clearTimeout(retryTimer);
    retryTimer = 0;
    if (previous) {
      previous.controller.abort();
      clearTimeout(previous.timeout);
      clearInterval(previous.heartbeat);
      previous.socket?.close();
      previous.hls?.destroy();
    }
    video.pause();
    video.removeAttribute('src');
    video.load();
    onQualities([]);
    healthySince = 0;
    awaitingGesture = false;
  }
  function stop(message) {
    blocked = true;
    release();
    art.loading.show = false;
    publishStatus(message);
  }
  function recover(reason) {
    if (disposed) return;
    release();
    if (!navigator.onLine) { publishStatus('网络已断开'); return; }
    if (retries >= 3) { publishStatus(`${reason} · 请重载或打开原房间`); return; }
    const delay = [1000, 3000, 8000][retries++];
    publishStatus(`连接中断 · ${delay / 1000} 秒后重试（${retries}/3）`);
    retryTimer = setTimeout(start, delay);
  }
  function denied(code) {
    const messages = {
      4107: '需要登录', 4507: '需要登录', 4108: '需要点数或观看权限', 4508: '需要点数或观看权限',
      4103: '需要观看票', 4116: '需要观看票', 4525: '需要观看票',
      4509: '需要年龄确认', 4512: '重复连接已被原站断开',
      4511: '直播未开播', 4502: '直播未开播', 4526: '需要身份确认'
    };
    stop(`${messages[code] || `原站已断开（${code}）`} · 请打开原房间`);
  }
  function qualities(attempt) {
    if (!active(attempt) || !attempt.hls?.levels.length) return;
    const hls = attempt.hls;
    onQualities([
      { value: 'auto', label: '自动', selected: selectedQuality === 'auto', bitrate: null },
      ...hls.levels.map((level, index) => ({
        value: String(index), label: `${level.height ? `${level.height}p · ` : ''}${Math.round(level.bitrate / 1000)} Kbps`,
        bitrate: level.bitrate, selected: selectedQuality === String(index)
      }))
    ]);
  }
  function attachMedia(attempt, payload) {
    if (!active(attempt) || attempt.hls) return;
    // Match FC2's default balanced transport, which can differ from its lowest-latency stream.
    const offered = payload.playlists_middle_latency || payload.playlists;
    const playlists = Array.isArray(offered) ? offered : [];
    const playlist = playlists.find(item => item.status === 0 && typeof item.url === 'string' && item.url.includes('master_playlist'))
      || playlists.find(item => item.status === 0 && typeof item.url === 'string');
    if (!playlist) { stop('原站未提供 HLS 流 · 请打开原房间'); return; }
    let url;
    try { url = new URL(playlist.url); } catch (_) { stop('原站播放地址无效'); return; }
    if (url.protocol !== 'https:') { stop('原站播放地址不支持'); return; }
    clearTimeout(attempt.timeout);
    const hls = attempt.hls = new Hls({
      backBufferLength: 30, maxBufferLength: 10, maxMaxBufferLength: 20,
      maxBufferSize: 12 * 1000 * 1000, liveSyncDuration: 6, liveMaxLatencyDuration: 15,
      xhrSetup(xhr) { xhr.withCredentials = true; }
    });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (active(attempt) && data.fatal) recover('媒体加载失败');
    });
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (!active(attempt)) return;
      if (selectedQuality !== 'auto' && !hls.levels[Number(selectedQuality)]) selectedQuality = 'auto';
      hls.currentLevel = selectedQuality === 'auto' ? -1 : Number(selectedQuality);
      qualities(attempt);
      if (!paused) video.play().catch(error => {
        if (!active(attempt) || (paused && error.name === 'AbortError')) return;
        if (error.name === 'NotAllowedError') {
          awaitingGesture = true;
          publishStatus('点击播放以开始观看');
        } else recover('媒体启动失败');
      });
    });
    hls.on(Hls.Events.MEDIA_ATTACHED, () => { if (active(attempt)) hls.loadSource(url.href); });
    lastFrames = 0;
    lastProgressAt = performance.now();
    hls.attachMedia(video);
  }
  async function start() {
    if (disposed) return;
    release();
    if (!navigator.onLine) { publishStatus('网络已断开'); return; }
    publishStatus('正在连接');
    art.loading.show = true;
    const attempt = run = { generation, controller: new AbortController(), socket: null, hls: null, sequence: 0, heartbeatId: null };
    const post = async (endpoint, data) => {
      const response = await fetch(endpoint, {
        method: 'POST', credentials: 'include', signal: attempt.controller.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
        body: new URLSearchParams(data)
      });
      if (!response.ok) throw new Error('FC2 接口连接失败');
      return response.json();
    };
    attempt.timeout = setTimeout(() => { if (active(attempt)) recover('原站连接超时'); }, 20000);
    try {
      const member = await post('/api/memberApi.php', { channel: '1', profile: '1', user: '1', streamid: id });
      if (!active(attempt)) return;
      const channel = member.data?.channel_data;
      if (!member.status || !channel) { stop('房间信息不可用 · 请打开原房间'); return; }
      if (String(id).startsWith('2_')) { stop('双向直播请打开原房间'); return; }
      onChannel({ id, name: fc2Text(member.data.profile_data?.name) || `房间 ${id}`, title: fc2Text(channel.title) });
      const control = await post('/api/getControlServer.php', {
        channel_id: id, mode: 'play', orz: '', channel_version: channel.version,
        client_version: '2.1.0\n [1]', client_type: 'pc', client_app: 'browser_hls', ipv6: '', comment: '0'
      });
      if (!active(attempt)) return;
      if (!control.url || !control.control_token) { stop('原站未允许连接 · 请打开原房间'); return; }
      if (typeof control.orz_raw === 'string') document.cookie = `l_ortkn=${encodeURIComponent(control.orz_raw)}; path=/; secure; SameSite=Lax`;
      const endpoint = new URL(control.url);
      if (endpoint.protocol !== 'wss:') { stop('控制连接地址不支持'); return; }
      endpoint.searchParams.set('control_token', control.control_token);
      const socket = attempt.socket = new WebSocket(endpoint.href);
      const send = name => {
        const requestId = ++attempt.sequence;
        socket.send(JSON.stringify({ name, arguments: {}, id: requestId }));
        return requestId;
      };
      socket.onmessage = event => {
        if (!active(attempt)) return;
        let message;
        try { message = JSON.parse(event.data); } catch (_) { return; }
        const data = message.arguments || {};
        if (message.name === 'control_disconnection' || message.name === 'media_disconnection') {
          denied(data.code ?? '未知');
          return;
        }
        if (message.name === 'publish_stop') { stop('直播已结束 · 可稍后重载'); return; }
        if (message.name === 'connect_complete' && !attempt.playlistId) {
          attempt.playlistId = send('get_hls_information');
          attempt.heartbeat = setInterval(() => {
            if (!active(attempt)) return;
            if (attempt.heartbeatId !== null) { recover('控制连接无响应'); return; }
            if (socket.readyState !== WebSocket.OPEN) { recover('控制连接已关闭'); return; }
            attempt.heartbeatId = send('heartbeat');
          }, 30000);
        }
        if (message.name === '_response_') {
          if (message.id === attempt.heartbeatId) attempt.heartbeatId = null;
          if (message.id === attempt.playlistId) {
            const result = Number(data.status ?? data.code ?? 0);
            if (result !== 0) denied(result);
            else attachMedia(attempt, data);
          }
        }
      };
      socket.onclose = () => { if (active(attempt)) recover('控制连接已关闭'); };
      socket.onerror = () => { if (active(attempt)) recover('控制连接失败'); };
    } catch (_) {
      if (active(attempt)) recover('连接失败');
    }
  }
  const monitor = setInterval(() => {
    if (!run?.hls || disposed) return;
    const now = performance.now();
    if (paused || awaitingGesture) {
      healthySince = 0;
      lastProgressAt = now;
      publishStatus(paused ? '已暂停' : '点击播放以开始观看');
      return;
    }
    const frames = video.getVideoPlaybackQuality().totalVideoFrames;
    if (!video.paused && video.readyState >= 3 && frames !== lastFrames) {
      lastFrames = frames;
      lastProgressAt = now;
      if (!healthySince) healthySince = now;
      if (now - healthySince >= 30000) retries = 0;
      publishStatus('播放中');
    } else if (now - lastProgressAt >= 15000) {
      recover('直播长时间未更新');
    } else {
      if (now - lastProgressAt >= 3000) healthySince = 0;
      if (video.readyState < 3) publishStatus('正在缓冲');
    }
  }, 1000);
  function offline() { if (!blocked) { release(); publishStatus('网络已断开'); } }
  function online() { if (!blocked) { retries = 0; void start(); } }
  window.addEventListener('offline', offline);
  window.addEventListener('online', online);
  void start();
  return {
    reload() { retries = 0; blocked = false; void start(); },
    setAudible(value) { audible = value; video.muted = !audible; },
    setQuality(value) {
      const hls = run?.hls;
      if (!hls || (value !== 'auto' && (!/^\d+$/.test(value) || !hls.levels[Number(value)]))) throw new Error('这一路暂无对应画质');
      selectedQuality = value;
      hls.currentLevel = value === 'auto' ? -1 : Number(value);
      qualities(run);
    },
    destroy() {
      disposed = true;
      release();
      clearInterval(monitor);
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
      container.removeEventListener('keydown', keyboard);
      art.destroy();
    }
  };
}
