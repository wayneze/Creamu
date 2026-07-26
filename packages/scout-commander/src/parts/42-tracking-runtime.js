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
const SCOUT_SEARCH_TRACK_EVENTS = ['click', 'auxclick', 'pointerdown'];

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

function showTrackingPagebar(track, targetEl) {
  let bar = document.getElementById('jlc-tracking-pagebar');
  if (bar) return;

  bar = document.createElement('div');
  bar.id = 'jlc-tracking-pagebar';
  bar.className = 'jlc-wb-pagebar scout-tracking-pagebar';

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
    <span class="jlc-tracking-pagebar-text" title="${label}">
      ⭐ ${label} · ${hint}
    </span>
    <button type="button" class="scout-tracking-pagebar-action jlc-bp-continue" id="scout-bp-jump-btn">${buttonText}</button>
    <button type="button" class="scout-tracking-pagebar-action scout-bp-dismiss" id="scout-bp-close-bar-btn">忽略</button>
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
