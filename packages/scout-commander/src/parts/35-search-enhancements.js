// @@creamu-part:search-enhancements

/**
 * 搜索页订阅追更入口
 * - PC：顶部细条
 * - 手机：FAB 旁小圆钮（不再铺底大横条）
 */
function enhanceSearchTrackSubscribe() {
  const site = typeof detectSite === 'function' ? detectSite() : null;
  if (!site || typeof detectPageKind !== 'function' || detectPageKind() !== 'search') {
    document.getElementById('scout-search-track-bar')?.remove();
    return;
  }

  const ctx = typeof parseSearchContext === 'function' ? parseSearchContext() : { query: '', url: location.href };
  const query = compactText(ctx && ctx.query);
  if (!query) {
    document.getElementById('scout-search-track-bar')?.remove();
    return;
  }

  let isNarrow = false;
  try {
    isNarrow = !!(window.matchMedia && window.matchMedia('(max-width: 820px)').matches);
  } catch (_) { /* ignore */ }

  const existing =
    typeof findTrackBySiteQuery === 'function' ? findTrackBySiteQuery(site, query) : null;
  const on = !!existing;
  const qShort = query.length > 28 ? query.slice(0, 26) + '…' : query;

  let bar = document.getElementById('scout-search-track-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'scout-search-track-bar';
    bar.setAttribute('data-scout-ui', '1');
    (document.body || document.documentElement).appendChild(bar);
  }
  bar.className = isNarrow ? 'scout-track-fab' : 'scout-track-banner';
  bar.classList.toggle('is-on', on);

  const doToggle = () => {
    if (on) {
      if (!confirm(`取消订阅「${query}」？断点会一并删除。`)) return;
      deleteTrack(existing.id);
      showToast('已取消搜索追更');
    } else {
      addTrack({
        site,
        query,
        label: query,
        url: (ctx && ctx.url) || location.href
      });
      if (typeof setupSearchClickTracking === 'function') setupSearchClickTracking();
      showToast('已订阅：' + qShort);
    }
    enhanceSearchTrackSubscribe();
    refreshScoutWorkbenchPageIfActive('tracks');
    refreshScoutWorkbenchPageIfActive('combo');
  };

  if (isNarrow) {
    // 手机：小圆钮，一点即订/取消；叠在工作台钮上方
    bar.innerHTML = '';
    bar.title = on ? `已订阅：${query}（点按取消）` : `订阅追更：${query}`;
    bar.setAttribute('role', 'button');
    bar.setAttribute('aria-label', on ? '取消搜索追更' : '订阅搜索追更');
    bar.innerHTML = `<span class="scout-track-fab-ico">${on ? '⭐' : '☆'}</span>`;
    bar.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      doToggle();
    };
    if (typeof dockMobileFabStack === 'function') dockMobileFabStack();
    return;
  }

  // PC：顶部细条
  bar.onclick = null;
  bar.removeAttribute('role');
  bar.innerHTML = `
    <span class="scout-track-banner-text" title="${escapeHtml(query)}">
      ${on ? '⭐ 已订阅' : '☆ 追更'} · <b>${escapeHtml(qShort)}</b>
    </span>
    <button type="button" id="scout-search-track-toggle" class="scout-track-banner-btn">
      ${on ? '取消' : '订阅'}
    </button>
  `;
  bar.querySelector('#scout-search-track-toggle')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    doToggle();
  });
}
