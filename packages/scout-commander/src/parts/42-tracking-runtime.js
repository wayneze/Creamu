// @@creamu-part:tracking-runtime

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
 * 仅在搜索页绑定；是否写入取决于当前 URL 能否匹配收藏 track。
 */
const SCOUT_SEARCH_TRACK_EVENTS = ['click', 'auxclick'];

function markSearchTrackingBreakpointFromEvent(e) {
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
  if (!meta || !meta.url || !getScoutVideoNavigationLink(e, meta.url)) return;

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

}

function enableSearchClickTracking() {
  if (typeof detectPageKind === 'function' && detectPageKind() !== 'search') return;
  if (window.__creamuScoutClickTrackTarget) return;
  const target = document.body;
  if (!target) return;

  // 捕获阶段：新标签打开（preventDefault）前也能记断点；中键 auxclick 一并覆盖
  SCOUT_SEARCH_TRACK_EVENTS.forEach((type) => {
    target.addEventListener(type, markSearchTrackingBreakpointFromEvent, true);
  });
  window.__creamuScoutClickTrackTarget = target;
}

function disableSearchClickTracking() {
  const target = window.__creamuScoutClickTrackTarget;
  if (!target) return;
  SCOUT_SEARCH_TRACK_EVENTS.forEach((type) => {
    target.removeEventListener(type, markSearchTrackingBreakpointFromEvent, true);
  });
  window.__creamuScoutClickTrackTarget = null;
}

function applySearchClickTrackingMode() {
  const isSearch =
    typeof detectPageKind !== 'function' || detectPageKind() === 'search';
  if (isSearch) enableSearchClickTracking();
  else disableSearchClickTracking();
}

function setupSearchClickTracking() {
  applySearchClickTrackingMode();
}

function checkSearchTrackingBreakpoints() {
  if (detectPageKind() !== 'search') return;
  setupSearchClickTracking();
  enhanceSearchTrackSubscribe();
}
