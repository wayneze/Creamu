  /** 启动：壳先可点 → DB+页面增强 → WebDAV/LRR 后台 */
  async function boot() {
    if (bootReady) return;
    const site = detectSite();
    if (!site) return;

    const t0 = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const logPhase = (name) => {
      try {
        const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
        console.info('[Creamu·ExH boot]', name, Math.round(now - t0) + 'ms');
      } catch (_) { /* ignore */ }
    };

    loadConfig();
    injectBaseStyles();
    applyCreamSiteTheme();
    applyGalleryThumbScale();

    const issue = detectAccessIssue();
    if (issue && (issue.type === 'sad_panda' || issue.type === 'challenge')) {
      showDiagnosticBanner(issue);
    } else if (issue && issue.type === 'rate_limit') {
      showDiagnosticBanner(issue);
    }

    try {
      createWorkbench();
      logPhase('workbench-shell');
    } catch (e) {
      console.warn('[ExC] workbench shell', e);
    }

    try {
      await openDb();
      logPhase('openDb');
    } catch (e) {
      console.warn('[ExC] IndexedDB unavailable', e);
      showToast('本地数据库不可用，收藏等功能可能失效');
    }

    const kind = detectPageKind();
    try {
      if (kind === 'gallery') {
        await enhanceGalleryPage();
      } else if (kind === 'image') {
        await enhanceImagePage();
      } else {
        await enhanceListPage();
        observeListMutations();
      }
      logPhase('page-enhance');
    } catch (e) {
      console.error('[ExC] page enhance failed', e);
    }

    bootReady = true;
    console.info('[Creamu·ExH] ready', VERSION, site, kind);
    logPhase('ready');

    // WebDAV / LRR 后台跑，不 await 挡点击
    void Promise.resolve()
      .then(async () => {
        const sync = typeof ensureCreamuSync === 'function' ? ensureCreamuSync() : null;
        if (!sync) return;
        const st = sync.settings ? sync.settings() : {};
        if (!st.enabled) {
          console.info('[ExC] WebDAV auto-sync skipped (disabled)');
          return;
        }
        if (st.auto === false) {
          console.info('[ExC] WebDAV auto-sync skipped (auto off)');
          return;
        }
        if (typeof sync.isConfigured === 'function' && !sync.isConfigured()) {
          console.info('[ExC] WebDAV auto-sync skipped (not configured)');
          return;
        }
        try {
          const r = await sync.bootSync();
          if (r && r.action === 'pull') {
            if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
            if (window.__excRefreshPage) window.__excRefreshPage();
          } else if (r && r.action === 'error') {
            const err = r.error;
            showToast('WebDAV 同步失败: ' + (err && err.message ? err.message : err || ''));
          }
          console.info('[ExC] WebDAV boot', r && r.action);
        } catch (e) {
          console.warn('[Creamu WD]', e);
          showToast('WebDAV 同步失败: ' + ((e && e.message) || e));
        }
        logPhase('webdav');
      })
      .catch((e) => console.warn('[Creamu WD]', e));

    // LRR：已配置则按间隔自动同步；本地档案库为空则强制拉一次
    if (lrrConfigured()) {
      void Promise.resolve()
        .then(async () => {
          const st = getLrrStatus();
          const intervalMin = Math.max(5, Number(config.lrr_sync_interval_min) || 60);
          const interval = intervalMin * 60 * 1000;
          let forceEmpty = false;
          try {
            const arcs = typeof listArchives === 'function' ? await listArchives() : null;
            forceEmpty = Array.isArray(arcs) && arcs.length === 0;
          } catch (_) {
            forceEmpty = !st.last_sync;
          }
          const due = forceEmpty || !st.last_sync || nowMs() - st.last_sync > interval;
          if (!due) {
            console.info(
              '[ExC] LRR auto-sync skipped (last',
              st.last_sync ? Math.round((nowMs() - st.last_sync) / 60000) + 'm ago' : 'n/a',
              ', interval',
              intervalMin + 'm)'
            );
            return;
          }
          const r = await syncLanraragi({ replace: true });
          if (r.ok) {
            console.info(
              '[ExC] LRR synced',
              r.count,
              'linked',
              r.linked,
              'familiar',
              r.familiar_artists,
              r.familiar_groups,
              forceEmpty ? '(force empty)' : ''
            );
            showToast(
              'LRR 已同步 ' +
                r.count +
                ' 条' +
                (r.familiar_artists != null
                  ? ' · 熟人 画师' + r.familiar_artists + '/团队' + r.familiar_groups
                  : '')
            );
            if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
            if (window.__excRefreshPage) window.__excRefreshPage();
          } else {
            console.warn('[ExC] LRR sync', r.error);
            showToast('LRR 同步失败: ' + (r.error || ''));
          }
          logPhase('lrr');
        })
        .catch((e) => {
          console.warn('[ExC] LRR sync', e);
          showToast('LRR 同步失败: ' + ((e && e.message) || e));
        });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      boot().catch((e) => console.error('[ExC] boot', e));
    });
  } else {
    boot().catch((e) => console.error('[ExC] boot', e));
  }
})();
