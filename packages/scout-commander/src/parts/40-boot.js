// 40-boot.js

function findBreakpointVideoElement(track) {
  const els = getVideoElements();
  const target = track && track.last_seen_item;
  if (!target) return null;
  for (const el of els) {
    const meta = parseVideoElement(el);
    if (!meta || !meta.url) continue;
    const videoId = videoIdFromUrl(meta.url);
    const match =
      typeof videoIdsMatch === 'function'
        ? videoIdsMatch(videoId, target)
        : videoId && videoId === target;
    if (match) return el;
  }
  return null;
}

/**
 * 列表点击 → 写追更断点（与 JLC last_seen 类似）。
 * 在搜索页始终绑定；是否写入取决于当前 URL 能否匹配收藏 track。
 */
function setupSearchClickTracking() {
  if (window.__creamuScoutClickTrackBound) return;
  window.__creamuScoutClickTrackBound = true;

  const markBreakpointFromEvent = (e) => {
    const site = detectSite();
    if (!site) return;
    if (detectPageKind() !== 'search') return;

    const videoEl = e.target.closest(
      '.mozaique .thumb-block, .mozaique [id^="video_"], .video-block, ' +
        '#videos-list .post, .post, .post-container, ' +
        '#vidresults .mb, .mb[data-id], div.mb'
    );
    if (!videoEl) return;

    const meta = parseVideoElement(videoEl);
    if (!meta || !meta.url) return;

    const searchCtx = parseSearchContext();
    if (!searchCtx.query) return;

    const matchedTrack =
      typeof findTrackBySiteQuery === 'function'
        ? findTrackBySiteQuery(site, searchCtx.query)
        : null;
    if (!matchedTrack) return;

    const videoId = videoIdFromUrl(meta.url);
    const currentPage = parseListPage(site);

    updateTrack(matchedTrack.id, {
      last_seen_item: videoId,
      last_seen_page: currentPage,
      url: searchCtx.url || matchedTrack.url,
      updated_at: new Date().toISOString()
    });

    markVideoClicked({
      site,
      videoId,
      title: meta.title,
      url: meta.url,
      thumb: meta.thumb,
      uploader: meta.uploader
    });
  };

  // 捕获阶段：新标签打开（preventDefault）前也能记断点；中键 auxclick 一并覆盖
  document.body.addEventListener('click', markBreakpointFromEvent, true);
  document.body.addEventListener('auxclick', markBreakpointFromEvent, true);
  document.body.addEventListener('pointerdown', markBreakpointFromEvent, true);
}

function showTrackingPagebar(track, targetEl) {
  let bar = document.getElementById('jlc-tracking-pagebar');
  if (bar) return;

  bar = document.createElement('div');
  bar.id = 'jlc-tracking-pagebar';
  bar.className = 'jlc-wb-pagebar';
  // 单行矮条：少占高度（PC/手机同一套）
  bar.style.cssText =
    'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:999999;' +
    'width:min(420px,94vw);display:flex;align-items:center;gap:8px;' +
    'padding:5px 8px 5px 10px;border-radius:999px;box-sizing:border-box;' +
    'background:rgba(18,20,28,.92);border:1px solid rgba(255,255,255,.12);' +
    'box-shadow:0 4px 14px rgba(0,0,0,.28);color:#e8eaef;font-size:12px;';

  let hint = '';
  let buttonText = '';
  let actionFn = null;
  const label = escapeHtml(track.label || '');
  const page = track.last_seen_page || 1;

  if (targetEl) {
    hint = `本页有断点 · p${page}`;
    buttonText = '定位';
    actionFn = () => {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetEl.classList.add('scout-breakpoint-highlight');
      setTimeout(() => {
        targetEl.classList.remove('scout-breakpoint-highlight');
      }, 5000);
      bar.remove();
    };
  } else {
    hint = `上次 p${page}`;
    buttonText = '续看';
    const targetUrl = applyListPageToUrl(track.url, track.site, track.last_seen_page);
    actionFn = () => {
      location.href = targetUrl;
    };
  }

  bar.innerHTML = `
    <span class="jlc-tracking-pagebar-text" title="${label}" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:650;">
      ⭐ ${label} · ${hint}
    </span>
    <button type="button" class="jlc-bp-continue" id="scout-bp-jump-btn"
      style="flex:0 0 auto;padding:3px 10px;font-size:11.5px;border-radius:999px;cursor:pointer;border:0;background:var(--scout-accent,#5b8def);color:#fff;font-weight:650;">${buttonText}</button>
    <button type="button" id="scout-bp-close-bar-btn"
      style="flex:0 0 auto;padding:3px 8px;font-size:11.5px;border-radius:999px;cursor:pointer;background:transparent;border:1px solid rgba(255,255,255,.2);color:#c8cdd8;">忽略</button>
  `;

  document.body.appendChild(bar);

  bar.querySelector('#scout-bp-jump-btn').addEventListener('click', actionFn);
  bar.querySelector('#scout-bp-close-bar-btn').addEventListener('click', () => {
    bar.remove();
  });
}

function checkSearchTrackingBreakpoints() {
  const site = detectSite();
  if (!site) return;
  const kind = detectPageKind();
  if (kind !== 'search') return;

  // 搜索页始终挂断点监听（收藏可后发生）
  setupSearchClickTracking();

  const searchCtx = parseSearchContext();
  if (!searchCtx.query) return;

  const matchedTrack =
    typeof findTrackBySiteQuery === 'function'
      ? findTrackBySiteQuery(site, searchCtx.query)
      : null;
  if (!matchedTrack) return;

  const currentPage = parseListPage(site);
  const lastPage = Number(matchedTrack.last_seen_page) || 1;

  if (matchedTrack.last_seen_item && currentPage === lastPage) {
    setTimeout(() => {
      const foundEl = findBreakpointVideoElement(matchedTrack);
      if (foundEl) {
        showTrackingPagebar(matchedTrack, foundEl);
      } else if (lastPage > 1) {
        // 本页未找到该片，仍提示可跳页
        showTrackingPagebar(matchedTrack, null);
      }
    }, 800);
  } else if (lastPage > 1 && currentPage !== lastPage) {
    // 不在断点页（含从首页回来）→ 提示继续
    showTrackingPagebar(matchedTrack, null);
  }
}

// ----------------------------------------
// 列表预览：点缩略图播预览，再点一次进详情（xvideos/xnxx 的 data-pvv；eporner 不做预览）
let __scoutPreviewVideo = null;
let __scoutPreviewHost = null;
let __scoutPreviewTimer = null;

function isScoutMobileListViewport() {
  try {
    if (window.matchMedia && window.matchMedia('(max-width: 820px)').matches) return true;
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) return true;
  } catch (_) { /* ignore */ }
  return window.innerWidth <= 820;
}

function stopListPreview() {
  if (__scoutPreviewTimer) {
    clearInterval(__scoutPreviewTimer);
    __scoutPreviewTimer = null;
  }
  if (__scoutPreviewVideo) {
    try {
      const layer = __scoutPreviewVideo.closest('.scout-list-preview-layer');
      __scoutPreviewVideo.pause();
      __scoutPreviewVideo.removeAttribute('src');
      __scoutPreviewVideo.load();
      if (layer) layer.remove();
      else __scoutPreviewVideo.remove();
    } catch (_) { /* ignore */ }
    __scoutPreviewVideo = null;
  }
  if (__scoutPreviewHost) {
    __scoutPreviewHost.classList.remove('scout-preview-playing');
    __scoutPreviewHost.querySelectorAll('img[data-scout-orig-src]').forEach((img) => {
      if (img.dataset.scoutOrigSrc) img.src = img.dataset.scoutOrigSrc;
    });
    const img = __scoutPreviewHost.querySelector('img');
    if (img && img.dataset.scoutOrigSrc) img.src = img.dataset.scoutOrigSrc;
    __scoutPreviewHost = null;
  }
  document.querySelectorAll('.scout-preview-playing').forEach((el) => {
    el.classList.remove('scout-preview-playing');
  });
  document.querySelectorAll('.scout-list-preview-layer').forEach((el) => el.remove());
}

/** 列表预览地址：仅站内 data-pvv 等；不用 gvideo（黑屏且撑布局） */
function getListPreviewUrl(img) {
  if (!img) return '';
  return (
    img.getAttribute('data-pvv') ||
    img.getAttribute('data-spvv') ||
    img.getAttribute('data-preview') ||
    ''
  ).trim();
}

/** eporner 列表没有可用预览源（无 data-pvv，gvideo 黑屏，换帧会撑卡）→ 不做预览 */
function isEpornerListContext(el) {
  if (detectSite && detectSite() === 'eporner') return true;
  if (!el || !el.closest) return false;
  return !!el.closest('#vidresults, .mb[data-id], body.creamu-site-eporner');
}

function mountPreviewVideo(host, url) {
  // 用与缩略图同尺寸的覆盖层，避免撑大卡片
  const wrap = document.createElement('div');
  wrap.className = 'scout-list-preview-layer';
  const v = document.createElement('video');
  v.className = 'scout-list-preview-video';
  v.muted = true;
  v.defaultMuted = true;
  v.loop = true;
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.setAttribute('webkit-playsinline', '');
  v.setAttribute('muted', '');
  v.preload = 'metadata';
  v.setAttribute('aria-label', '列表预览');
  wrap.appendChild(v);
  host.appendChild(wrap);
  __scoutPreviewVideo = v;

  let failed = false;
  const fail = () => {
    if (failed) return;
    failed = true;
    try {
      wrap.remove();
    } catch (_) { /* ignore */ }
    if (__scoutPreviewVideo === v) __scoutPreviewVideo = null;
    stopListPreview();
  };
  v.addEventListener('error', fail);
  v.src = url;
  const p = v.play();
  if (p && typeof p.catch === 'function') p.catch(fail);
  setTimeout(() => {
    if (v && v.readyState < 2 && !failed) fail();
  }, 1800);
  return v;
}

function playListPreviewOnHost(host, img) {
  if (!host || !img) return false;

  // eporner：列表无可靠预览，直接放行（不拦截点击、不改 DOM）
  if (isEpornerListContext(img) || isEpornerListContext(host)) {
    return false;
  }

  // 已在本卡播放 → 交给外层去导航
  if (__scoutPreviewHost === host && host.classList.contains('scout-preview-playing')) {
    return false;
  }

  const pvv = getListPreviewUrl(img);
  if (!pvv) return false;

  stopListPreview();
  __scoutPreviewHost = host;
  host.classList.add('scout-preview-playing');

  // 仅在已有定位上下文时叠层；不强制改 eporner 式布局
  try {
    const cs = window.getComputedStyle(host);
    if (cs.position === 'static') host.style.position = 'relative';
  } catch (_) {
    host.style.position = 'relative';
  }

  mountPreviewVideo(host, pvv);
  return true;
}

function setupListPreviewPlayback() {
  if (window.__scoutListPreviewBound) return;
  window.__scoutListPreviewBound = true;

  let lastScrollY = window.scrollY || 0;

  // 点缩略图区域：先预览；再点同卡缩略图 → 放行进详情
  document.addEventListener(
    'click',
    (e) => {
      if (!isScoutMobileListViewport()) return;
      if (detectPageKind && detectPageKind() === 'video') return;
      if (e.target.closest('#jlc-wb, #jlc-wb-fab, #scout-search-track-bar')) return;

      // 标题/元信息区：不拦截
      if (e.target.closest('.thumb-under, .mbtit, p.title, .title, .mbunder, .mbstats, .uploader')) {
        return;
      }

      // eporner 列表无预览能力：完全不拦截
      if (isEpornerListContext(e.target)) return;

      // xvideos / xnxx 卡
      const card = e.target.closest('.thumb-block, .mozaique [id^="video_"]');
      const img =
        (e.target.tagName === 'IMG' ? e.target : null) ||
        (card && card.querySelector('.thumb img, .thumb-inside img, img'));
      if (!img) return;

      // 必须点在图区域
      const inThumb = e.target.closest('.thumb, .thumb-inside, a[href*="/video"]');
      if (!inThumb && e.target !== img) return;

      const a =
        img.closest('a[href*="/video"]') ||
        (card && card.querySelector('a[href*="/video"]'));
      if (!a) return;

      const host = img.closest('.thumb, .thumb-inside') || a || img.parentElement;
      if (!host) return;

      // 第二次点同一预览中的图 → 不拦截，进详情
      if (__scoutPreviewHost === host && host.classList.contains('scout-preview-playing')) {
        stopListPreview();
        return;
      }

      const ok = playListPreviewOnHost(host, img);
      if (ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  // 明显滚动才停预览（避免点按微抖立刻关掉）
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY || 0;
      if (Math.abs(y - lastScrollY) < 48) return;
      lastScrollY = y;
      if (__scoutPreviewHost || __scoutPreviewVideo) stopListPreview();
    },
    { passive: true, capture: true }
  );
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopListPreview();
  });
}

// ----------------------------------------
// 关闭站点列表自动预览（不影响 Creamu 点按预览）
// ----------------------------------------

function isSiteListPreviewHost(el) {
  if (!el || !el.closest) return false;
  return !!el.closest(
    '.thumb-block, .thumb, .thumb-inside, .mozaique, .video-block, ' +
      '.mb, .mbimg, .mbcontent, #vidresults, #videos-list .post, .post'
  );
}

function isMainDetailPlayerVideo(v) {
  if (!v || !v.closest) return false;
  return !!v.closest(
    '#html5video, #html5video_base, #video-player-bg, .video-player, ' +
      '#player, .x-video-player, [class*="player-container"]'
  );
}

/** 暂停列表里非 Creamu 的预览 video */
function pauseSiteListPreviewVideos() {
  if (typeof isBlockSiteAutoPreview === 'function' && !isBlockSiteAutoPreview()) return;
  if (typeof detectPageKind === 'function' && detectPageKind() === 'video') return;
  document.querySelectorAll('video').forEach((v) => {
    if (!v || v.classList.contains('scout-list-preview-video')) return;
    if (isMainDetailPlayerVideo(v)) return;
    if (!isSiteListPreviewHost(v) && !v.closest('.mozaique, #vidresults, #content')) return;
    try {
      v.autoplay = false;
      v.removeAttribute('autoplay');
      if (!v.paused) v.pause();
    } catch (_) { /* ignore */ }
  });
}

function setupBlockSiteAutoPreview() {
  if (window.__scoutBlockSitePreviewBound) return;
  window.__scoutBlockSitePreviewBound = true;

  const stopHoverPreview = (e) => {
    if (typeof isBlockSiteAutoPreview === 'function' && !isBlockSiteAutoPreview()) return;
    if (typeof detectPageKind === 'function' && detectPageKind() === 'video') return;
    if (e.target && e.target.closest && e.target.closest('#jlc-wb, #jlc-wb-fab, .scout-list-preview-layer')) {
      return;
    }
    if (!isSiteListPreviewHost(e.target)) return;
    e.stopPropagation();
  };
  ['mouseenter', 'mouseover', 'pointerenter', 'pointerover'].forEach((type) => {
    document.addEventListener(type, stopHoverPreview, true);
  });

  document.addEventListener(
    'play',
    (e) => {
      const v = e.target;
      if (!v || v.tagName !== 'VIDEO') return;
      if (v.classList.contains('scout-list-preview-video')) return;
      if (typeof isBlockSiteAutoPreview === 'function' && !isBlockSiteAutoPreview()) return;
      if (typeof detectPageKind === 'function' && detectPageKind() === 'video') return;
      if (isMainDetailPlayerVideo(v)) return;
      if (!isSiteListPreviewHost(v) && !v.closest('.mozaique, #vidresults')) return;
      try {
        v.pause();
      } catch (_) { /* ignore */ }
    },
    true
  );
}

// ----------------------------------------
// 详情 / 全屏：横向滑动调进度
// ----------------------------------------

function formatScoutSeekTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ':' + String(r).padStart(2, '0');
}

function findScoutDetailVideo() {
  const sels = [
    '#html5video video',
    '#html5video_base video',
    '#video-player-bg video',
    '.video-player video',
    '#player video',
    'video'
  ];
  for (const s of sels) {
    const v = document.querySelector(s);
    if (v && v.tagName === 'VIDEO') return v;
  }
  return null;
}

function getScoutFullscreenRoot() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null
  );
}

function showScoutSeekHud(text, mountRoot) {
  const root = mountRoot || document.documentElement;
  let el = document.getElementById('scout-seek-hud');
  if (!el) {
    el = document.createElement('div');
    el.id = 'scout-seek-hud';
    el.style.cssText =
      'position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:2147483646;' +
      'padding:10px 16px;border-radius:12px;background:rgba(0,0,0,.72);color:#fff;' +
      'font-size:16px;font-weight:700;pointer-events:none;white-space:nowrap;' +
      'box-shadow:0 6px 20px rgba(0,0,0,.35);display:none;';
  }
  if (el.parentNode !== root) {
    try {
      root.appendChild(el);
    } catch (_) {
      document.documentElement.appendChild(el);
    }
  }
  el.textContent = text;
  el.style.display = 'block';
  el.classList.add('is-on');
  if (el._scoutHideTimer) clearTimeout(el._scoutHideTimer);
  el._scoutHideTimer = setTimeout(() => {
    el.style.display = 'none';
    el.classList.remove('is-on');
  }, 700);
}

function setupVideoSeekGesture() {
  if (window.__scoutSeekGestureBound) return;
  window.__scoutSeekGestureBound = true;

  let tracking = false;
  let axisLocked = '';
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let video = null;
  let moved = false;

  const reset = () => {
    tracking = false;
    axisLocked = '';
    video = null;
    moved = false;
  };

  const onStart = (e) => {
    if (typeof detectPageKind === 'function' && detectPageKind() !== 'video') return;
    if (!e.touches || e.touches.length !== 1) return;
    const fs = getScoutFullscreenRoot();
    if (!fs) return;
    const v = findScoutDetailVideo();
    if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return;
    const target = e.target;
    if (!fs.contains(target) && target !== fs) return;
    const t = e.touches[0];
    tracking = true;
    axisLocked = '';
    moved = false;
    startX = t.clientX;
    startY = t.clientY;
    startTime = v.currentTime || 0;
    video = v;
  };

  const onMove = (e) => {
    if (!tracking || !video || !e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (!axisLocked) {
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      axisLocked = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      if (axisLocked === 'v') {
        reset();
        return;
      }
    }
    if (axisLocked !== 'h') return;
    e.preventDefault();
    moved = true;
    const w = Math.max(window.innerWidth || 320, 320);
    const span = Math.min(90, Math.max(30, (video.duration || 90) * 0.25));
    const delta = (dx / w) * span;
    let next = startTime + delta;
    next = Math.max(0, Math.min(video.duration - 0.25, next));
    const sign = delta >= 0 ? '+' : '−';
    const abs = formatScoutSeekTime(Math.abs(delta));
    const fs = getScoutFullscreenRoot() || document.documentElement;
    showScoutSeekHud(
      sign + abs + ' → ' + formatScoutSeekTime(next) + ' / ' + formatScoutSeekTime(video.duration),
      fs
    );
    try {
      video.currentTime = next;
    } catch (_) { /* ignore */ }
  };

  const onEnd = () => {
    if (tracking && moved && video && typeof showToast === 'function') {
      try {
        showToast('进度 ' + formatScoutSeekTime(video.currentTime));
      } catch (_) { /* ignore */ }
    }
    reset();
  };

  document.addEventListener('touchstart', onStart, { passive: true, capture: true });
  document.addEventListener('touchmove', onMove, { passive: false, capture: true });
  document.addEventListener('touchend', onEnd, { passive: true, capture: true });
  document.addEventListener('touchcancel', onEnd, { passive: true, capture: true });
}

// ----------------------------------------
// Page lifecycle: MutationObserver + history
// ----------------------------------------
let __scoutEnhancing = false;
let __scoutRefreshTimer = null;
let __scoutLastHref = '';
let __scoutLastKind = '';

function refreshPageEnhancements(reason) {
  if (__scoutEnhancing) return;
  __scoutEnhancing = true;
  try {
    const site = detectSite();
    if (site) {
      // 站点 class 只加不乱删其它 creamu-site-*
      if (!document.body.classList.contains('creamu-site-' + site)) {
        ['xvideos', 'xnxx', 'eporner'].forEach(s => document.body.classList.remove('creamu-site-' + s));
        document.body.classList.add('creamu-site-' + site);
      }
    }

    const href = location.href;
    const kind = detectPageKind();
    const navigated = href !== __scoutLastHref || kind !== __scoutLastKind;
    __scoutLastHref = href;
    __scoutLastKind = kind;

    if (kind === 'video') {
      markCurrentVideoPageClicked();
      enhancePageTags();
      enhancePagePublisher();
    } else if (kind === 'search') {
      applyListBlocks(); // 内含已点 + 词库列表流
      // 再显式刷一次列表词库流（防止 applyListBlocks 中途 return/抛错漏掉）
      if (typeof enhanceListLexiconHitFlows === 'function') {
        try { enhanceListLexiconHitFlows(); } catch (e) { console.warn(e); }
      }
      // 搜索页顶栏：订阅/取消追更（不依赖打开工作台）
      if (typeof enhanceSearchTrackSubscribe === 'function') {
        try { enhanceSearchTrackSubscribe(); } catch (e) { console.warn(e); }
      }
      if (typeof setupListPreviewPlayback === 'function') {
        try { setupListPreviewPlayback(); } catch (e) { console.warn(e); }
      }
      if (navigated || reason === 'boot') {
        checkSearchTrackingBreakpoints();
      }
      pauseSiteListPreviewVideos();
    } else {
      // 首页/分类等列表页
      applyClickedEnhancements();
      if (typeof enhanceListLexiconHitFlows === 'function') {
        try { enhanceListLexiconHitFlows(); } catch (e) { console.warn(e); }
      }
      if (typeof setupListPreviewPlayback === 'function') {
        try { setupListPreviewPlayback(); } catch (e) { console.warn(e); }
      }
      document.getElementById('scout-search-track-bar')?.remove();
      pauseSiteListPreviewVideos();
    }

    if (kind === 'video') {
      document.getElementById('scout-search-track-bar')?.remove();
      if (typeof stopListPreview === 'function') stopListPreview();
    }
  } catch (err) {
    console.warn('[Creamu Scout] refresh failed:', reason, err);
  } finally {
    __scoutEnhancing = false;
  }
}

function schedulePageRefresh(reason) {
  if (__scoutEnhancing) return;
  if (window.__scoutUiMutating) return;
  if (__scoutRefreshTimer) clearTimeout(__scoutRefreshTimer);
  __scoutRefreshTimer = setTimeout(() => {
    __scoutRefreshTimer = null;
    refreshPageEnhancements(reason || 'debounced');
  }, 280);
}

/** 是否我们自己的 UI 节点（改这些不应再触发全页增强） */
function isScoutUiNode(node) {
  if (!node || node.nodeType !== 1) return false;
  if (
    node.id === 'scout-lex-hit-bar' ||
    node.id === 'scout-work-fav-bar' ||
    node.id === 'scout-search-track-bar' ||
    node.id === 'scout-tags-toggle' ||
    node.id === 'scout-desc-toggle' ||
    node.id === 'jlc-tracking-pagebar' ||
    node.id === 'jlc-wb' ||
    node.id === 'jlc-wb-fab'
  ) {
    return true;
  }
  if (node.classList && (
    node.classList.contains('scout-lex-flow-card') ||
    node.classList.contains('scout-lex-flow-overlay') ||
    node.classList.contains('scout-lex-hit-bar') ||
    node.classList.contains('scout-tag-addon') ||
    node.classList.contains('scout-tag-heart') ||
    node.classList.contains('scout-pub-addon') ||
    node.classList.contains('scout-pub-badge') ||
    node.classList.contains('scout-visited-item') ||
    node.classList.contains('scout-list-preview-video') ||
    node.classList.contains('scout-preview-playing')
  )) {
    return true;
  }
  if (node.id === 'scout-seek-hud') return true;
  return !!(node.closest && node.closest(
    '#scout-lex-hit-bar, #scout-work-fav-bar, #jlc-wb, #jlc-wb-fab, #scout-seek-hud, .scout-lex-flow-overlay, .scout-tag-addon, .scout-pub-addon, .scout-list-preview-video'
  ));
}

function setupScoutPageLifecycle() {
  if (window.__creamuScoutLifecycleBound) return;
  window.__creamuScoutLifecycleBound = true;

  // DOM 变更：列表懒加载 / 局部刷新（忽略我们自己的 UI，防详情页词库条死循环跳动）
  try {
    const obs = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        const nodes = [];
        if (m.target) nodes.push(m.target);
        if (m.addedNodes && m.addedNodes.length) {
          m.addedNodes.forEach((n) => nodes.push(n));
        }
        if (m.removedNodes && m.removedNodes.length) {
          m.removedNodes.forEach((n) => nodes.push(n));
        }
        // 任意非 scout 节点变化才刷新
        if (nodes.some((n) => n && !isScoutUiNode(n))) {
          schedulePageRefresh('mutation');
          return;
        }
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {
    console.warn('[Creamu Scout] MutationObserver unavailable', e);
  }

  // SPA / 站内 pushState 翻页
  if (!window.__creamuScoutHistoryHooked) {
    window.__creamuScoutHistoryHooked = true;
    const wrap = (type) => {
      const orig = history[type];
      if (typeof orig !== 'function') return;
      history[type] = function () {
        const ret = orig.apply(this, arguments);
        schedulePageRefresh('history:' + type);
        return ret;
      };
    };
    wrap('pushState');
    wrap('replaceState');
    window.addEventListener('popstate', () => schedulePageRefresh('popstate'));
    window.addEventListener('hashchange', () => schedulePageRefresh('hashchange'));
  }

  // 兜底：极低频轮询（站点偶发不触发 mutation）
  setInterval(() => {
    if (location.href !== __scoutLastHref) {
      refreshPageEnhancements('href-poll');
    } else {
      const kind = detectPageKind();
      if (kind === 'search') applyListBlocks();
      else if (kind === 'video') {
        enhancePageTags();
        enhancePagePublisher();
      }
    }
  }, 8000);
}

function bootCreamuScout() {
  const currentSite = detectSite();
  if (currentSite) {
    document.body.classList.add(`creamu-site-${currentSite}`);
  }

  initScoutWebDav();
  initScoutWorkbench();
  if (typeof setupSearchClickTracking === 'function') {
    try { setupSearchClickTracking(); } catch (_) { /* ignore */ }
  }
  if (typeof applyScoutSiteTheme === 'function') {
    try { applyScoutSiteTheme(); } catch (_) { /* ignore */ }
  }
  // 启动纠正：屏蔽词踢出词库、合并历史重复
  if (typeof purgeBlockedTermsFromLexicon === 'function') {
    try { purgeBlockedTermsFromLexicon(); } catch (_) { /* ignore */ }
  }
  if (typeof dedupeLexiconTermsStore === 'function') {
    try { dedupeLexiconTermsStore(); } catch (_) { /* ignore */ }
  }
  if (typeof dedupeBlockListStore === 'function') {
    try { dedupeBlockListStore(); } catch (_) { /* ignore */ }
  }
  setupScoutPageLifecycle();
  if (typeof setupBlockSiteAutoPreview === 'function') {
    try { setupBlockSiteAutoPreview(); } catch (_) { /* ignore */ }
  }
  if (typeof setupVideoSeekGesture === 'function') {
    try { setupVideoSeekGesture(); } catch (_) { /* ignore */ }
  }
  refreshPageEnhancements('boot');
  if (typeof applyVideoOpenMode === 'function') {
    try { applyVideoOpenMode(); } catch (_) { /* ignore */ }
  }

  if (scoutSync) {
    scoutSync.bootSync().catch((err) => {
      console.warn('[Creamu Scout] Sync on boot failed:', err);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootCreamuScout);
} else {
  bootCreamuScout();
}

})();
