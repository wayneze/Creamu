// @@creamu-part:search-enhancements
function enhanceSearchTrackSubscribe() {
  const site = detectSite();
  const ctx = detectPageKind() === 'search' ? parseSearchContext() : null;
  const query = compactText(ctx?.query);
  if (!site || !query) { document.getElementById('scout-search-track-bar')?.remove(); return; }
  const list = getVideoElements()[0]?.closest('.mozaique, #vidresults, #videos-list');
  if (!list) return;
  let bar = document.getElementById('scout-search-track-bar');
  if (!bar) { bar = document.createElement('div'); bar.id = 'scout-search-track-bar'; bar.dataset.scoutUi = '1'; }
  if (bar.nextElementSibling !== list) list.insertAdjacentElement('beforebegin', bar);
  const track = findTrackBySiteQuery(site, query);
  const found = track && Number(track.last_seen_page || 1) === parseListPage(site) ? findBreakpointVideoElement(track) : null;
  bar.innerHTML = `<span class="scout-track-banner-text"><small>当前搜索</small><b>${escapeHtml(query)}</b></span>
    ${track ? `<button type="button" id="scout-bp-jump-btn">${found ? '定位上次作品' : '继续 · 第 ' + (track.last_seen_page || 1) + ' 页'}</button>` : ''}
    <button type="button" id="scout-search-track-toggle">${track ? '已追更 · 管理' : '收藏搜索'}</button>`;
  bar.querySelector('#scout-search-track-toggle').onclick = () => {
    if (track) { window.__scoutOpenWorkbench('tracks'); return; }
    addTrack({ site, query, label: query, url: ctx.url, recipe: getScoutCurrentSearchRecipe() });
    enhanceSearchTrackSubscribe();
    refreshScoutWorkbenchPagesIfActive('tracks', 'combo');
    showToast('已收藏搜索，下次可继续浏览');
  };
  const resume = bar.querySelector('#scout-bp-jump-btn');
  if (resume) resume.onclick = () => {
    if (!found) { openTrackAtBreakpoint(track); return; }
    found.scrollIntoView({ behavior: 'smooth', block: 'center' });
    found.classList.add('scout-breakpoint-highlight');
    setTimeout(() => found.classList.remove('scout-breakpoint-highlight'), 3000);
  };
}
