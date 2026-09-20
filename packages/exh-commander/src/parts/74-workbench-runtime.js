
  function bindTrackingStoreLiveRefresh() {
    if (window.__excTrackingStoreLiveBound) return;
    window.__excTrackingStoreLiveBound = true;
    let timer = null;
    const kick = (includeList) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (typeof window.__excRefreshWorkbench === 'function') window.__excRefreshWorkbench();
        if (includeList && typeof refreshListVolatileState === 'function') {
          refreshListVolatileState().catch(() => {});
        }
      }, 80);
    };
    if (typeof GM_addValueChangeListener === 'function') {
      GM_addValueChangeListener(GM_TRACKING_REV_KEY, (_name, _old, _next, remote) => {
        if (remote) kick(true);
      });
    }
    window.addEventListener('pageshow', () => kick(false));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') kick(false);
    });
    window.addEventListener('focus', () => kick(false));
  }

  function createWorkbench() {
    wbSession = loadSession();
    if (!wbSession.nav) wbSession.nav = 'tracking';
    ensureFab();
    ensureWorkbenchShell();
    // 仅当会话显式 open 时恢复；默认不弹
    if (wbSession.open === true) toggleWorkbench(true);
    window.__excRefreshWorkbench = () => {
      const wb = document.getElementById('jlc-wb');
      if (wb && wb.classList.contains('is-open')) renderWorkbench();
      updateFabBadge();
    };
    window.__excRefreshPage = () => {
      refreshCurrentPageUi().catch(() => {});
    };
    bindTrackingStoreLiveRefresh();
    const ctx = parseExhPageContext(location.href);
    const trackingState = (async () => {
      const records = await listTrackingSearches();
      const rec = ctx && ctx.trackable
        ? await findTrackingForContext(ctx, records)
        : null;
      if (!rec) return { context: ctx, record: null, records, resolved: true };

      // 仅在列表真·首页回写 top；next=/深页不污染「最新」
      const pageState =
        typeof getListPageState === 'function'
          ? getListPageState(location.href, document)
          : { index: 0, known: true, isFirst: true };
      const pageIdx = pageState.known && pageState.index >= 0 ? pageState.index : -1;
      const isFirst =
        pageState.isFirst === true ||
        ctx.page_is_first === true;
      rec.last_browsed_at = nowMs();
      rec.last_page = pageIdx;
      if (rec.open_url && typeof canonicalizeTrackingOpenUrl === 'function') {
        const canon = canonicalizeTrackingOpenUrl(rec.open_url);
        const losesIdentity =
          typeof trackingOpenUrlLosesIdentity === 'function' &&
          trackingOpenUrlLosesIdentity(rec.open_url, canon);
        if (rec.open_url !== canon && !losesIdentity) {
          rec.open_url = canon;
          rec.page_url = canon;
        }
      }
      // ctx.top_gid 仅首页有值；再加 isFirst 双保险
      if (isFirst && ctx.top_gid) {
        if (rec.top_gid && rec.top_gid !== ctx.top_gid) {
          rec.has_update = 1;
          rec.prev_top_gid = rec.top_gid;
        }
        rec.top_gid = ctx.top_gid;
        if (ctx.top_title) rec.top_title = compactText(ctx.top_title).slice(0, 160);
        if (ctx.top_posted_at) rec.top_posted_at = Number(ctx.top_posted_at) || 0;
        if (ctx.top_cover) applyTrackingCoverFields(rec, ctx.top_cover);
      }
      void saveTrackingRecord(rec).catch(() => {});
      return { context: ctx, record: rec, records, resolved: true };
    })();
    void updateFabBadge(trackingState);
    return trackingState;
  }
