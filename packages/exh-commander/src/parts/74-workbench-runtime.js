
  async function loadPageTrackingState() {
    const context = parseExhPageContext(location.href);
    const records = await listTrackingSearches();
    const record = context && context.trackable
      ? await findTrackingForContext(context, records)
      : null;
    return { context, record, records, resolved: true };
  }

  function bindTrackingStoreLiveRefresh() {
    if (window.__excTrackingStoreLiveBound) return;
    window.__excTrackingStoreLiveBound = true;
    let timer = null;
    const kick = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void loadPageTrackingState().then(async (state) => {
          if (typeof window.__excRefreshWorkbench === 'function') window.__excRefreshWorkbench(state);
          await refreshListVolatileState(state);
        }).catch((error) => console.warn('[ExC] tracking live refresh', error));
      }, 80);
    };
    if (typeof GM_addValueChangeListener === 'function') {
      GM_addValueChangeListener(GM_TRACKING_REV_KEY, (_name, _old, _next, remote) => {
        if (remote) kick();
      });
    }
    window.addEventListener('pageshow', kick);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') kick();
    });
    window.addEventListener('focus', kick);
  }

  function createWorkbench() {
    wbSession = loadSession();
    if (!wbSession.nav) wbSession.nav = 'tracking';
    ensureFab();
    ensureWorkbenchShell();
    // 仅当会话显式 open 时恢复；默认不弹
    if (wbSession.open === true) toggleWorkbench(true);
    window.__excRefreshWorkbench = (trackingState) => {
      const wb = document.getElementById('jlc-wb');
      if (wb && wb.classList.contains('is-open')) renderWorkbench();
      updateFabBadge(trackingState);
    };
    window.__excRefreshPage = () => {
      refreshCurrentPageUi().catch(() => {});
    };
    bindTrackingStoreLiveRefresh();
    const trackingState = (async () => {
      const state = await loadPageTrackingState();
      const { context: ctx, record: rec } = state;
      if (!rec) return state;

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
      return state;
    })();
    void updateFabBadge(trackingState);
    return trackingState;
  }
