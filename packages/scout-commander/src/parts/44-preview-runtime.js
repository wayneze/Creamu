// @@creamu-part:preview-runtime

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
    __scoutPreviewHost.classList.remove('scout-preview-playing', 'scout-preview-positioned');
    __scoutPreviewHost.querySelectorAll('img[data-scout-orig-src]').forEach((img) => {
      if (img.dataset.scoutOrigSrc) img.src = img.dataset.scoutOrigSrc;
    });
    const img = __scoutPreviewHost.querySelector('img');
    if (img && img.dataset.scoutOrigSrc) img.src = img.dataset.scoutOrigSrc;
    __scoutPreviewHost = null;
  }
  document.querySelectorAll('.scout-preview-playing').forEach((el) => {
    el.classList.remove('scout-preview-playing', 'scout-preview-positioned');
  });
  document.querySelectorAll('.scout-list-preview-layer').forEach((el) => el.remove());
}

/** 站方预览属性与脚本侧备份属性 */
const SCOUT_SITE_PREVIEW_ATTR_MAP = [
  ['data-pvv', 'data-scout-pvv'],
  ['data-spvv', 'data-scout-spvv'],
  ['data-preview', 'data-scout-preview']
];

/** 列表预览 URL（备份优先；不用 gvideo） */
function getListPreviewUrl(img) {
  if (!img) return '';
  for (let i = 0; i < SCOUT_SITE_PREVIEW_ATTR_MAP.length; i++) {
    const siteAttr = SCOUT_SITE_PREVIEW_ATTR_MAP[i][0];
    const scoutAttr = SCOUT_SITE_PREVIEW_ATTR_MAP[i][1];
    const v = (img.getAttribute(scoutAttr) || img.getAttribute(siteAttr) || '').trim();
    if (v) return v;
  }
  return '';
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
    if (cs.position === 'static') host.classList.add('scout-preview-positioned');
  } catch (_) {
    host.classList.add('scout-preview-positioned');
  }

  mountPreviewVideo(host, pvv);
  return true;
}

function enableListPreviewPlayback() {
  if (typeof detectPageKind === 'function' && detectPageKind() === 'video') return;
  if (window.__creamuScoutListPreviewRuntime) return;
  let lastScrollY = window.scrollY || 0;

  // 点缩略图区域：先预览；再点同卡缩略图 → 放行进详情
  const onClick = (e) => {
    if (!isScoutMobileListViewport()) return;
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
  };
  document.addEventListener('click', onClick, true);

  // 明显滚动才停预览（避免点按微抖立刻关掉）
  const onScroll = () => {
    const y = window.scrollY || 0;
    if (Math.abs(y - lastScrollY) < 48) return;
    lastScrollY = y;
    if (__scoutPreviewHost || __scoutPreviewVideo) stopListPreview();
  };
  window.addEventListener('scroll', onScroll, { passive: true, capture: true });

  const onVisibilityChange = () => {
    if (document.hidden) stopListPreview();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.__creamuScoutListPreviewRuntime = { onClick, onScroll, onVisibilityChange };
}

function disableListPreviewPlayback() {
  const runtime = window.__creamuScoutListPreviewRuntime;
  if (!runtime) return;
  document.removeEventListener('click', runtime.onClick, true);
  window.removeEventListener('scroll', runtime.onScroll, true);
  document.removeEventListener('visibilitychange', runtime.onVisibilityChange);
  window.__creamuScoutListPreviewRuntime = null;
  stopListPreview();
}

function applyListPreviewPlaybackMode() {
  const isList =
    typeof detectPageKind !== 'function' || detectPageKind() !== 'video';
  if (isList) enableListPreviewPlayback();
  else disableListPreviewPlayback();
}

function setupListPreviewPlayback() {
  applyListPreviewPlaybackMode();
}

// 站点列表自动预览拦截（block_site_auto_preview）

function isSiteListPreviewHost(el) {
  if (!el || !el.closest) return false;
  return !!el.closest(
    '.thumb-block, .thumb, .thumb-inside, .mozaique, .video-block, ' +
      '.mb, .mbimg, .mbcontent, #vidresults, #videos-list .post, .post'
  );
}

function isMainDetailPlayerVideo(v) {
  if (!v || !v.closest) return false;
  if (v.classList && v.classList.contains('scout-list-preview-video')) return false;
  return !!v.closest(
    '#html5video, #html5video_base, #video-player-bg, .video-player, ' +
      '#player, .x-video-player, [class*="player-container"]'
  );
}

/** 是否列表侧站点预览 video（详情与 .scout-list-preview-video 除外） */
function isBlockedSiteListVideo(v) {
  if (!v || v.tagName !== 'VIDEO') return false;
  if (v.classList && v.classList.contains('scout-list-preview-video')) return false;
  if (typeof detectPageKind === 'function' && detectPageKind() === 'video') return false;
  if (isMainDetailPlayerVideo(v)) return false;
  if (isSiteListPreviewHost(v)) return true;
  return !!v.closest('.mozaique, #vidresults, #content .thumb-block, #content .video-block');
}

/** site 预览属性 → data-scout-* */
function stashSitePreviewAttrs(root) {
  const scope = root && root.querySelectorAll ? root : document;
  const imgs = scope.querySelectorAll
    ? scope.querySelectorAll('img[data-pvv], img[data-spvv], img[data-preview], img[data-scout-pvv], img[data-scout-spvv], img[data-scout-preview]')
    : [];
  const list = [];
  if (root && root.nodeType === 1 && root.tagName === 'IMG') list.push(root);
  imgs.forEach((img) => list.push(img));
  for (let i = 0; i < list.length; i++) {
    const img = list[i];
    if (!img || !img.getAttribute) continue;
    if (!isSiteListPreviewHost(img) && !img.closest('.mozaique, #vidresults, .thumb-block')) continue;
    for (let j = 0; j < SCOUT_SITE_PREVIEW_ATTR_MAP.length; j++) {
      const siteAttr = SCOUT_SITE_PREVIEW_ATTR_MAP[j][0];
      const scoutAttr = SCOUT_SITE_PREVIEW_ATTR_MAP[j][1];
      const cur = (img.getAttribute(siteAttr) || '').trim();
      if (cur) {
        img.setAttribute(scoutAttr, cur);
        img.removeAttribute(siteAttr);
      }
    }
  }
}

/** data-scout-* → site 预览属性 */
function restoreSitePreviewAttrs(root) {
  const scope = root && root.querySelectorAll ? root : document;
  const imgs = scope.querySelectorAll
    ? scope.querySelectorAll('img[data-scout-pvv], img[data-scout-spvv], img[data-scout-preview]')
    : [];
  const list = [];
  if (root && root.nodeType === 1 && root.tagName === 'IMG') list.push(root);
  imgs.forEach((img) => list.push(img));
  for (let i = 0; i < list.length; i++) {
    const img = list[i];
    if (!img || !img.getAttribute) continue;
    for (let j = 0; j < SCOUT_SITE_PREVIEW_ATTR_MAP.length; j++) {
      const siteAttr = SCOUT_SITE_PREVIEW_ATTR_MAP[j][0];
      const scoutAttr = SCOUT_SITE_PREVIEW_ATTR_MAP[j][1];
      const cur = (img.getAttribute(scoutAttr) || '').trim();
      if (cur && !img.getAttribute(siteAttr)) {
        img.setAttribute(siteAttr, cur);
      }
    }
  }
}

function killSiteListPreviewVideo(v) {
  if (!v || !isBlockedSiteListVideo(v)) return;
  try {
    v.autoplay = false;
    v.removeAttribute('autoplay');
    v.preload = 'none';
    v.muted = true;
    try {
      v.pause();
    } catch (_) { /* ignore */ }
    try {
      v.removeAttribute('src');
      while (v.firstChild) v.removeChild(v.firstChild);
      v.load();
    } catch (_) { /* ignore */ }
    try {
      if (v.parentNode && !v.classList.contains('scout-list-preview-video')) {
        v.dataset.scoutKilledPreview = '1';
        v.classList.add('scout-site-preview-disabled');
      }
    } catch (_) { /* ignore */ }
  } catch (_) { /* ignore */ }
}

function pauseSiteListPreviewVideos() {
  if (typeof isBlockSiteAutoPreview === 'function' && !isBlockSiteAutoPreview()) return;
  if (typeof detectPageKind === 'function' && detectPageKind() === 'video') return;
  stashSitePreviewAttrs(document);
  document.querySelectorAll('video').forEach((v) => killSiteListPreviewVideo(v));
}

const SCOUT_SITE_PREVIEW_HOVER_EVENTS = [
  'mouseenter',
  'mouseover',
  'pointerenter',
  'pointerover'
];

function shouldRunBlockSiteAutoPreview() {
  const enabled =
    typeof isBlockSiteAutoPreview !== 'function' || isBlockSiteAutoPreview();
  const pageKind = typeof detectPageKind === 'function' ? detectPageKind() : '';
  return enabled && pageKind !== 'video';
}

function enableBlockSiteAutoPreview() {
  if (!shouldRunBlockSiteAutoPreview()) return false;
  if (window.__creamuScoutBlockSitePreviewRuntime) return false;

  const runtime = {
    stopHoverPreview: null,
    stopPlayingPreview: null,
    observer: null,
    mediaPrototype: null,
    originalPlay: null,
    guardedPlay: null
  };
  window.__creamuScoutBlockSitePreviewRuntime = runtime;

  const stopHoverPreview = (e) => {
    if (e.target && e.target.closest && e.target.closest('#jlc-wb, #jlc-wb-fab, .scout-list-preview-layer')) {
      return;
    }
    if (!isSiteListPreviewHost(e.target)) return;
    e.stopPropagation();
  };
  runtime.stopHoverPreview = stopHoverPreview;
  SCOUT_SITE_PREVIEW_HOVER_EVENTS.forEach((type) => {
    document.addEventListener(type, stopHoverPreview, true);
  });

  try {
    const mediaPrototype =
      typeof HTMLMediaElement !== 'undefined' ? HTMLMediaElement.prototype : null;
    if (mediaPrototype && typeof mediaPrototype.play === 'function') {
      runtime.mediaPrototype = mediaPrototype;
      runtime.originalPlay = mediaPrototype.play;
      runtime.guardedPlay = function scoutGuardedPlay() {
        if (
          shouldRunBlockSiteAutoPreview() &&
          this &&
          this.tagName === 'VIDEO' &&
          isBlockedSiteListVideo(this)
        ) {
          killSiteListPreviewVideo(this);
          return Promise.resolve();
        }
        return runtime.originalPlay.apply(this, arguments);
      };
      mediaPrototype.play = runtime.guardedPlay;
    }
  } catch (e) {
    console.warn('[Creamu Scout] play() patch failed', e);
  }

  runtime.stopPlayingPreview = (e) => {
    const v = e.target;
    if (!v || v.tagName !== 'VIDEO') return;
    if (!isBlockedSiteListVideo(v)) return;
    killSiteListPreviewVideo(v);
  };
  document.addEventListener('play', runtime.stopPlayingPreview, true);

  try {
    runtime.observer = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.type === 'attributes' && m.target && m.target.tagName === 'IMG') {
          const name = m.attributeName || '';
          if (name === 'data-pvv' || name === 'data-spvv' || name === 'data-preview') {
            stashSitePreviewAttrs(m.target);
          }
          continue;
        }
        if (!m.addedNodes || !m.addedNodes.length) continue;
        m.addedNodes.forEach((n) => {
          if (!n || n.nodeType !== 1) return;
          if (n.tagName === 'VIDEO') {
            killSiteListPreviewVideo(n);
            return;
          }
          if (n.tagName === 'IMG') {
            stashSitePreviewAttrs(n);
            return;
          }
          if (n.querySelectorAll) {
            stashSitePreviewAttrs(n);
            n.querySelectorAll('video').forEach((v) => killSiteListPreviewVideo(v));
          }
        });
      }
    });
    runtime.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-pvv', 'data-spvv', 'data-preview']
    });
  } catch (e) {
    console.warn('[Creamu Scout] preview attr observer failed', e);
  }
  return true;
}

function disableBlockSiteAutoPreview() {
  const runtime = window.__creamuScoutBlockSitePreviewRuntime;
  if (!runtime) return;

  SCOUT_SITE_PREVIEW_HOVER_EVENTS.forEach((type) => {
    if (runtime.stopHoverPreview) {
      document.removeEventListener(type, runtime.stopHoverPreview, true);
    }
  });
  if (runtime.stopPlayingPreview) {
    document.removeEventListener('play', runtime.stopPlayingPreview, true);
  }
  if (runtime.observer) {
    try { runtime.observer.disconnect(); } catch (_) { /* ignore */ }
  }
  if (
    runtime.mediaPrototype &&
    runtime.guardedPlay &&
    runtime.mediaPrototype.play === runtime.guardedPlay
  ) {
    runtime.mediaPrototype.play = runtime.originalPlay;
  }
  window.__creamuScoutBlockSitePreviewRuntime = null;
}

function applyBlockSiteAutoPreviewMode() {
  if (shouldRunBlockSiteAutoPreview()) {
    const started = enableBlockSiteAutoPreview();
    if (started) pauseSiteListPreviewVideos();
    return;
  }

  disableBlockSiteAutoPreview();
  if (typeof isBlockSiteAutoPreview === 'function' && !isBlockSiteAutoPreview()) {
    restoreSitePreviewAttrs(document);
  }
}

function setupBlockSiteAutoPreview() {
  applyBlockSiteAutoPreviewMode();
}
