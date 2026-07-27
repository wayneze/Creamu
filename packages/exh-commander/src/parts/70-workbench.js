  let wbSession = null;
  /** 主动检查更新运行态 */
  let trackingCheckRuntime = null;
  let trackingListPaintId = 0;
  let trackingListPaintTimer = null;
  const TRACKING_QUERY_DEBOUNCE_MS = 180;

  function cancelScheduledTrackingListPaint() {
    if (!trackingListPaintTimer) return;
    clearTimeout(trackingListPaintTimer);
    trackingListPaintTimer = null;
  }

  function invalidateTrackingListPaint() {
    cancelScheduledTrackingListPaint();
    trackingListPaintId += 1;
  }

  function scheduleTrackingListPaint() {
    invalidateTrackingListPaint();
    trackingListPaintTimer = setTimeout(() => {
      trackingListPaintTimer = null;
      void paintTrackingList();
    }, TRACKING_QUERY_DEBOUNCE_MS);
  }

  function ensureCreamuSync() {
    if (window.__creamuWdExh) return window.__creamuWdExh;
    if (typeof createCreamuWebDavSync !== 'function') return null;
    window.__creamuWdExh = createCreamuWebDavSync({
      product: 'exh',
      notify: (msg) => showToast(msg),
      exportPayload: () => exportBackup(),
      importPayload: async (payload) => {
        // pull 后不标脏；revision 由 WebDAV applyRemote 收尾
        await importBackup(payload, { fromSync: true });
        try {
          if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
          if (window.__excRefreshPage) window.__excRefreshPage();
          const settingsOpen = document.getElementById('jlc-wb-settings')?.classList.contains('is-open');
          if (settingsOpen && typeof renderSettingsSections === 'function') {
            const active =
              document.querySelector('#jlc-wb-settings-nav button.active')?.getAttribute('data-jlc-settings-tab') ||
              'sync';
            renderSettingsSections(active);
          }
        } catch (_) { /* ignore */ }
      },
      getSettings: () => ({
        enabled: !!config.webdav_enabled,
        url: config.webdav_url || '',
        user: config.webdav_user || '',
        password: config.webdav_password || '',
        path: config.webdav_path || '/Creamu',
        auto: config.webdav_auto !== false,
        conflict: config.webdav_conflict || 'ask',
      }),
    });
    return window.__creamuWdExh;
  }

  function applyFabPosition(fab, session) {
    if (!fab) return;
    const left = Number(session && session.fabLeft);
    const top = Number(session && session.fabTop);
    if (!Number.isFinite(left) || !Number.isFinite(top)) return;
    const w = fab.offsetWidth || 34;
    const h = fab.offsetHeight || 34;
    const point = clampCreamuWorkbenchPoint({ left, top }, { width: w, height: h }, window);
    fab.style.left = point.left + 'px';
    fab.style.top = point.top + 'px';
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
  }

  function bindFabDrag(fab) {
    if (!fab) return;
    applyFabPosition(fab, wbSession || loadSession());
    bindCreamuFabDrag(fab, {
      boundKey: 'exhFabDragBound',
      eventType: 'mouse',
      threshold: 10,
      suppressDuration: 50,
      applyPosition: (point) => {
        fab.style.left = point.left + 'px';
        fab.style.top = point.top + 'px';
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
      },
      savePosition: (point) => {
        wbSession = wbSession || loadSession();
        wbSession.fabLeft = Math.round(point.left);
        wbSession.fabTop = Math.round(point.top);
        saveSession(wbSession);
      },
      onActivate: (event) => {
        event.stopPropagation();
        try {
          toggleWorkbench();
        } catch (e) {
          console.warn('[ExC] toggleWorkbench', e);
          showToast('打开工作台失败: ' + ((e && e.message) || e));
        }
      },
      onViewportChange: () => applyFabPosition(fab, wbSession || loadSession())
    });
  }

  function ensureFab() {
    let fab = document.getElementById('jlc-wb-fab');
    if (!fab) {
      fab = document.createElement('button');
      fab.id = 'jlc-wb-fab';
      fab.type = 'button';
      fab.title = 'Creamu · ExH（可拖动 · 点击打开）';
      fab.innerHTML = '<span>⌘</span><span class="jlc-wb-fab-badge">0</span>';
      document.body.appendChild(fab);
    }
    bindFabDrag(fab);
    return fab;
  }

  async function updateFabBadge(preloaded) {
    const fab = document.getElementById('jlc-wb-fab');
    if (!fab) return;
    const badge = fab.querySelector('.jlc-wb-fab-badge');
    try {
      const state = preloaded ? await preloaded : null;
      const list = state && Array.isArray(state.records)
        ? state.records
        : await listTrackingSearches();
      // 含 top≠断点：打开列表会清 has_update，但不能因此丢掉角标
      const n = list.filter((r) =>
        typeof trackingHasPendingUpdate === 'function' ? trackingHasPendingUpdate(r) : !!r.has_update
      ).length;
      if (n > 0) {
        fab.classList.add('has-updates');
        if (badge) badge.textContent = n > 99 ? '99+' : String(n);
      } else fab.classList.remove('has-updates');
    } catch (_) {
      fab.classList.remove('has-updates');
    }
  }

  function ensureWorkbenchShell() {
    let shell = document.getElementById('jlc-wb');
    if (shell) return shell;
    shell = document.createElement('div');
    shell.id = 'jlc-wb';
    shell.innerHTML =
      '<div class="jlc-wb-resize-w" title="拖拽调整宽度"></div>' +
      '<div class="jlc-wb-resize-h" title="拖拽调整高度"></div>' +
      '<div class="jlc-wb-resize-corner" title="拖拽调整大小"></div>' +
      '<div class="jlc-wb-header" title="按住标题栏拖动窗口">' +
      '  <div><div class="jlc-wb-title">Creamu · ExH</div>' +
      '  <div class="jlc-wb-subtitle" id="jlc-wb-header-sub">加载中… · 可拖动</div></div>' +
      '  <div class="jlc-wb-header-actions">' +
      '    <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-settings-btn" title="设置">⚙</button>' +
      '    <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-min-btn" title="收起">—</button>' +
      '    <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-close-btn" title="关闭">×</button>' +
      '  </div>' +
      '</div>' +
      '<div class="jlc-wb-nav">' +
      '  <button type="button" data-nav="tracking" class="active">追更</button>' +
      '  <button type="button" data-nav="works">作品状态</button>' +
      '</div>' +
      '<div class="jlc-wb-body">' +
      '  <div data-jlc-wb-page="tracking"><div id="exc-wb-tracking-root"></div></div>' +
      '  <div data-jlc-wb-page="works" hidden><div id="exc-wb-works-root"></div></div>' +
      '</div>' +
      '<div class="jlc-wb-footer">' +
      '  <div class="jlc-wb-footer-summary" id="jlc-wb-footer-summary">—</div>' +
      '  <div class="jlc-wb-footer-actions">' +
      '    <button type="button" class="jlc-wb-btn primary" id="jlc-wb-save-current">⭐ 收藏当前</button>' +
      '    <button type="button" class="jlc-wb-btn ghost" id="exc-check-updates" title="默认只查首页（快）；可在设置开启跨页精确未读。条目间隔 5～10 秒">检查更新</button>' +
      '    <button type="button" class="jlc-wb-btn ghost" id="exc-sync-all" title="同时同步 WebDAV 与 LRR（已配置的项）">同步</button>' +
      '  </div>' +
      '</div>' +
      '<div class="jlc-wb-settings" id="jlc-wb-settings">' +
      '  <div class="jlc-wb-settings-panel">' +
      '    <div class="jlc-wb-settings-head">' +
      '      <strong>设置</strong>' +
      '      <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-settings-close">×</button>' +
      '    </div>' +
      '    <div class="jlc-wb-settings-nav" id="jlc-wb-settings-nav">' +
      '      <button type="button" data-jlc-settings-tab="sync" class="active">同步</button>' +
      '      <button type="button" data-jlc-settings-tab="tags">标签</button>' +
      '      <button type="button" data-jlc-settings-tab="pref">偏好</button>' +
      '      <button type="button" data-jlc-settings-tab="ui">界面</button>' +
      '      <button type="button" data-jlc-settings-tab="data">数据</button>' +
      '    </div>' +
      '    <div class="jlc-wb-settings-body" id="exc-settings-body"></div>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(shell);

    document.getElementById('jlc-wb-close-btn').onclick = () => toggleWorkbench(false);
    document.getElementById('jlc-wb-min-btn').onclick = () => toggleWorkbench(false);
    document.getElementById('jlc-wb-settings-btn').onclick = () => openSettings(true);
    document.getElementById('jlc-wb-settings-close').onclick = () => openSettings(false);
    document.getElementById('jlc-wb-save-current').onclick = async () => {
      await saveCurrentPageAsTracking({ chooseFolder: true });
      renderWorkbench();
    };
    document.getElementById('exc-check-updates').onclick = () => {
      void refreshAllTrackingSearches();
    };

    shell.querySelectorAll('.jlc-wb-nav button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nav = btn.getAttribute('data-nav') || 'tracking';
        wbSession = wbSession || loadSession();
        wbSession.nav = nav;
        saveSession(wbSession);
        activateNav(nav);
        renderWorkbench();
      });
    });

    shell.querySelectorAll('[data-jlc-settings-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        shell.querySelectorAll('[data-jlc-settings-tab]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderSettingsSections(btn.getAttribute('data-jlc-settings-tab'));
      });
    });

    bindFooterActions();
    initWbDrag(shell.querySelector('.jlc-wb-header'), shell);
    initWbResizeHandles(shell);
    return shell;
  }

  function activateNav(nav) {
    if (nav !== 'tracking') invalidateTrackingListPaint();
    const shell = document.getElementById('jlc-wb');
    if (!shell) return;
    shell.querySelectorAll('.jlc-wb-nav button').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-nav') === nav);
    });
    shell.querySelectorAll('[data-jlc-wb-page]').forEach((p) => {
      const id = p.getAttribute('data-jlc-wb-page');
      if (id === nav) p.removeAttribute('hidden');
      else p.setAttribute('hidden', '');
    });
  }

  function openSettings(open) {
    const el = document.getElementById('jlc-wb-settings');
    if (!el) return;
    el.classList.toggle('is-open', !!open);
    if (open) {
      renderSettingsSections('sync');
      const nav = document.getElementById('jlc-wb-settings-nav');
      if (nav) {
        nav.querySelectorAll('button').forEach((b) =>
          b.classList.toggle('active', b.getAttribute('data-jlc-settings-tab') === 'sync')
        );
      }
    }
  }

  function splitCsvField(s) {
    return String(s == null ? '' : s)
      .split(/[,，\n]/)
      .map((x) => compactText(x))
      .filter(Boolean);
  }

  function settingsSaveFooter() {
    return (
      '<button type="button" class="jlc-wb-btn primary jlc-wb-save-action" id="exc-cfg-save">💾 保存本页</button>'
    );
  }

  /** 同步页：WebDAV / LRR 按钮（与保存分离） */
  function bindSyncSettingsHandlers(body) {
    if (!body) return;
    const readWdForm = () => {
      const typed = body.querySelector('#exc-cfg-wd-pass')?.value || '';
      const patch = {
        webdav_url: body.querySelector('#exc-cfg-wd-url')?.value?.trim() || '',
        webdav_user: body.querySelector('#exc-cfg-wd-user')?.value?.trim() || '',
        webdav_path: body.querySelector('#exc-cfg-wd-path')?.value?.trim() || '/Creamu',
        webdav_enabled: !!body.querySelector('#exc-cfg-wd-en')?.checked,
        webdav_auto: !!body.querySelector('#exc-cfg-wd-auto')?.checked,
        webdav_conflict: body.querySelector('#exc-cfg-wd-conflict')?.value || 'ask',
      };
      if (typed) patch.webdav_password = typed;
      return patch;
    };
    const refreshWdStatus = () => {
      const el = document.getElementById('exc-wd-status');
      const o = ensureCreamuSync();
      if (el && o) el.textContent = o.statusText();
    };
    const both = body.querySelector('#exc-cfg-sync-both');
    if (both) {
      both.onclick = () => {
        saveConfig(readWdForm());
        void runCombinedSync({ reason: 'manual' });
      };
    }
    const wdTest = body.querySelector('#exc-wd-test');
    if (wdTest) {
      wdTest.onclick = async () => {
        saveConfig(readWdForm());
        const o = ensureCreamuSync();
        if (!o) return showToast('同步模块未加载');
        try {
          await o.testConnection();
          refreshWdStatus();
        } catch (e) {
          showToast('测试失败: ' + ((e && e.message) || e));
          refreshWdStatus();
        }
      };
    }
    const wdSync = body.querySelector('#exc-wd-sync');
    if (wdSync) {
      wdSync.onclick = async () => {
        saveConfig(readWdForm());
        try {
          await ensureCreamuSync().syncNow({});
          refreshWdStatus();
          renderWorkbench();
        } catch (e) {
          showToast('同步失败: ' + ((e && e.message) || e));
          refreshWdStatus();
        }
      };
    }
    const wdPush = body.querySelector('#exc-wd-push');
    if (wdPush) {
      wdPush.onclick = async () => {
        saveConfig(readWdForm());
        try {
          await ensureCreamuSync().syncNow({ force: 'push' });
          refreshWdStatus();
        } catch (e) {
          showToast('推送失败: ' + ((e && e.message) || e));
        }
      };
    }
    const wdPull = body.querySelector('#exc-wd-pull');
    if (wdPull) {
      wdPull.onclick = async () => {
        saveConfig(readWdForm());
        try {
          await ensureCreamuSync().syncNow({ force: 'pull' });
          refreshWdStatus();
          renderWorkbench();
        } catch (e) {
          showToast('拉取失败: ' + ((e && e.message) || e));
        }
      };
    }
    const lrrNow = body.querySelector('#exc-cfg-lrr-sync-now');
    if (lrrNow) {
      lrrNow.onclick = async () => {
        if (!lrrConfigured()) return showToast('请先配置 LRR');
        showToast('正在同步 LRR…');
        const r = await syncLanraragi({ replace: true });
        if (r && r.ok) {
          showToast(
            'LRR ' +
              r.count +
              ' 条' +
              (r.familiar_artists != null
                ? ' · 熟人' + r.familiar_artists + '/' + r.familiar_groups
                : '')
          );
        } else showToast('LRR 失败: ' + ((r && r.error) || ''));
        renderWorkbench();
        if (window.__excRefreshPage) window.__excRefreshPage();
      };
    }
  }

  function bindFooterActions() {
    const syncBtn = document.getElementById('exc-sync-all');
    if (syncBtn && !syncBtn.dataset.bound) {
      syncBtn.dataset.bound = '1';
      syncBtn.onclick = () => {
        void runCombinedSync({ reason: 'manual' });
      };
    }
  }

  /**
   * 工作台「同步」：WebDAV + LRR 一起跑（各自已配置才执行）
   */
  async function runCombinedSync(options) {
    options = options || {};
    const bits = [];
    let didAny = false;

    // WebDAV
    try {
      const sync = typeof ensureCreamuSync === 'function' ? ensureCreamuSync() : null;
      const st = sync && sync.settings ? sync.settings() : {};
      const wdReady =
        sync &&
        st.enabled &&
        typeof sync.isConfigured === 'function' &&
        sync.isConfigured();
      if (wdReady) {
        didAny = true;
        showToast('正在同步 WebDAV…');
        const r = await sync.syncNow({ reason: options.reason || 'manual' });
        if (r && r.action === 'error') {
          bits.push('WebDAV 失败');
        } else if (r && r.action === 'pull') {
          bits.push('WebDAV 已拉取');
        } else if (r && r.action === 'push') {
          bits.push('WebDAV 已推送');
        } else if (r && (r.action === 'noop' || r.action === 'same' || r.action === 'busy')) {
          bits.push(r.action === 'busy' ? 'WebDAV 忙碌' : 'WebDAV 已一致');
        } else {
          bits.push('WebDAV 完成');
        }
      } else if (sync && st.enabled && !sync.isConfigured()) {
        bits.push('WebDAV 未配齐');
      }
    } catch (e) {
      bits.push('WebDAV 失败: ' + ((e && e.message) || e));
    }

    // LRR
    try {
      if (typeof lrrConfigured === 'function' && lrrConfigured()) {
        didAny = true;
        showToast('正在同步 LRR…');
        const r = await syncLanraragi({ replace: true });
        if (r && r.ok) {
          const famA = r.familiar_artists != null ? r.familiar_artists : 0;
          const famG = r.familiar_groups != null ? r.familiar_groups : 0;
          bits.push(
            'LRR ' + r.count + ' 条' + (famA || famG ? ' · 熟人' + famA + '/' + famG : '')
          );
        } else {
          bits.push('LRR 失败: ' + ((r && r.error) || ''));
        }
      }
    } catch (e) {
      bits.push('LRR 失败: ' + ((e && e.message) || e));
    }

    if (!didAny) {
      showToast('请先配置 WebDAV 或 LRR');
      return;
    }
    showToast(bits.join(' · ') || '同步完成');
    try {
      renderWorkbench();
    } catch (_) { /* ignore */ }
    updateFabBadge();
    if (window.__excRefreshPage) window.__excRefreshPage();
  }

  function getExhWorkbenchInteractionRect(panel) {
    const rect = panel.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  function persistExhWorkbenchRect(panel, rect, saveWidth = false) {
    wbSession = wbSession || loadSession();
    wbSession.left = Math.round(rect.left);
    wbSession.top = Math.round(rect.top);
    wbSession.width = Math.round(rect.width) || wbSession.width || 500;
    wbSession.height = Math.round(rect.height) || wbSession.height || 560;
    clampWorkbenchShellPos(panel, wbSession);
    saveSession(wbSession);
    if (saveWidth) saveConfig({ workbench_width: wbSession.width });
  }

  function initWbDrag(handle, panel) {
    bindCreamuWorkbenchDrag(panel, {
      boundKey: 'exhPanelDragBound',
      eventType: 'mouse',
      shouldIgnoreDrag: (event) => !!event.target?.closest?.('.jlc-wb-header-actions'),
      getStartRect: () => getExhWorkbenchInteractionRect(panel),
      applyRect: (rect) => applyCreamuInteractionRect(panel, rect),
      onEnd: (rect) => persistExhWorkbenchRect(panel, rect),
      lockBodySelection: false,
      geometryOptions: { minWidth: 360, minHeight: 280, maxWidth: 720, margin: 12 }
    });
  }

  function initWbResizeHandles(panel) {
    bindCreamuWorkbenchResize(panel, {
      boundKey: 'exhPanelResizeBound',
      handleBoundPrefix: 'exhResizeHandle',
      eventType: 'mouse',
      getStartRect: () => getExhWorkbenchInteractionRect(panel),
      applyRect: (rect) => applyCreamuInteractionRect(panel, rect),
      onEnd: (rect) => persistExhWorkbenchRect(panel, rect, true),
      lockBodySelection: false,
      geometryOptions: { minWidth: 360, minHeight: 280, maxWidth: 720, margin: 12 }
    });
  }

  function clampWorkbenchShellPos(wb, session) {
    if (!wb) return;
    const margin = 12;
    const maxH = Math.max(280, window.innerHeight - margin * 2);
    const defaultWidth = Math.min(720, Math.max(360, Number(config.workbench_width) || 500));
    const defaultHeight = Math.min(maxH, Math.max(280, Math.round(window.innerHeight * 0.78)));
    const defaultRect = {
      left: Math.max(margin, window.innerWidth - defaultWidth - 24),
      top: Math.max(24, Math.round(window.innerHeight * 0.08)),
      width: defaultWidth,
      height: defaultHeight,
    };
    const rect = clampCreamuWorkbenchRect({
      left: session.left,
      top: session.top,
      width: session.width || config.workbench_width,
      height: session.height,
    }, window, {
      margin,
      minWidth: 360,
      minHeight: 280,
      maxWidth: 720,
      defaultRect,
      fallbackWidth: defaultWidth,
      fallbackHeight: defaultHeight,
    });
    wb.style.width = rect.width + 'px';
    wb.style.height = rect.height + 'px';
    wb.style.right = 'auto';
    wb.style.bottom = 'auto';
    wb.style.left = rect.left + 'px';
    wb.style.top = rect.top + 'px';
    session.left = rect.left;
    session.top = rect.top;
    session.width = rect.width;
    session.height = rect.height;
  }

  function forceWorkbenchVisible(wb) {
    if (!wb) return;
    wbSession = wbSession || loadSession();
    const w = Math.min(
      720,
      Math.max(360, Number(wbSession.width || config.workbench_width) || Math.min(520, window.innerWidth - 48))
    );
    const maxH = Math.max(280, window.innerHeight - 24);
    let h = Math.round(Number(wbSession.height) || 0);
    if (!Number.isFinite(h) || h < 280) h = Math.min(maxH, Math.round(window.innerHeight * 0.78));
    h = Math.min(maxH, Math.max(280, h));
    const top = Math.max(24, Math.round(window.innerHeight * 0.08));
    const left = Math.max(12, window.innerWidth - w - 24);
    wb.classList.add('is-open');
    document.getElementById('jlc-wb-fab')?.classList.add('is-panel-open');
    wb.style.setProperty('display', 'flex', 'important');
    wb.style.setProperty('visibility', 'visible', 'important');
    wb.style.setProperty('opacity', '1', 'important');
    wb.style.setProperty('pointer-events', 'auto', 'important');
    wb.style.setProperty('position', 'fixed', 'important');
    wb.style.setProperty('z-index', '2147483000', 'important');
    wb.style.setProperty('transform', 'none', 'important');
    wb.style.setProperty('max-height', 'none', 'important');
    wb.style.left = left + 'px';
    wb.style.top = top + 'px';
    wb.style.right = 'auto';
    wb.style.bottom = 'auto';
    wb.style.width = w + 'px';
    wb.style.height = h + 'px';
    wbSession.width = w;
    wbSession.height = h;
    wbSession.left = left;
    wbSession.top = top;
  }

  function forceWorkbenchHidden(wb) {
    if (!wb) return;
    wb.classList.remove('is-open');
    document.getElementById('jlc-wb-fab')?.classList.remove('is-panel-open');
    wb.style.setProperty('display', 'none', 'important');
  }

  function toggleWorkbench(force) {
    const wb = ensureWorkbenchShell();
    if (!wb) {
      showToast('工作台创建失败');
      console.warn('[ExC] ensureWorkbenchShell returned null');
      return;
    }
    // 保证挂在 body 上（防止被夹进隐藏容器）
    if (wb.parentElement !== document.body) {
      document.body.appendChild(wb);
    }
    wbSession = wbSession || loadSession();
    const currentlyOpen =
      wb.classList.contains('is-open') &&
      window.getComputedStyle(wb).display !== 'none';
    const open = force === undefined ? !currentlyOpen : !!force;
    wbSession.open = open;
    if (open) {
      // 每次打开重置到安全可见位置，避免旧 session 屏外坐标
      wbSession.left = null;
      wbSession.top = null;
      forceWorkbenchVisible(wb);
      activateNav(wbSession.nav === 'works' ? 'works' : 'tracking');
      saveSession(wbSession);
      console.info('[ExC] workbench open', wb.getBoundingClientRect());
      Promise.resolve()
        .then(() => renderWorkbench())
        .catch((e) => {
          console.warn('[ExC] renderWorkbench', e);
          showToast('工作台内容渲染失败（面板应已打开）: ' + ((e && e.message) || e));
        });
    } else {
      invalidateTrackingListPaint();
      forceWorkbenchHidden(wb);
      saveSession(wbSession);
      console.info('[ExC] workbench close');
    }
  }

  /**
   * 从工作台打开追更项：先收起面板（新标签不带弹层；本页跳转也不挡内容）
   * @param {object} rec
   * @param {'default'|'tab'|'same'} mode
   */
  async function openTrackingRecordFromWorkbench(rec, mode) {
    if (!rec) return;
    const url = rec.open_url || rec.page_url;
    if (!url) {
      showToast('没有可打开的地址');
      return;
    }
    wbSession = wbSession || loadSession();
    wbSession.open = false;
    wbSession.nav = 'tracking';
    wbSession.lastOpenedId = rec.id;
    wbSession.lastOpenedAt = nowMs();
    saveSession(wbSession);
    try {
      toggleWorkbench(false);
    } catch (_) { /* ignore */ }

    rec.last_browsed_at = nowMs();
    // 仅清「新检查到」旗标；若顶仍≠断点，角标/leaf 仍算有更新
    rec.has_update = 0;
    try {
      await saveTrackingRecord(rec);
    } catch (_) { /* ignore */ }

    const wantTab =
      mode === 'tab' || (mode !== 'same' && (mode === 'default' ? !!config.open_best_in_new_tab : false));
    if (wantTab) {
      const opened = window.open(url, '_blank', 'noopener');
      if (!opened) {
        showToast('浏览器拦截了新标签，已改为本页打开');
        location.href = url;
        return;
      }
      updateFabBadge();
      if (document.getElementById('jlc-wb-list-scroll')) {
        try {
          await paintTrackingList();
        } catch (_) { /* ignore */ }
      }
      return;
    }
    location.href = url;
  }

  function setHeaderSub(text) {
    const el = document.getElementById('jlc-wb-header-sub');
    if (el) el.textContent = text;
  }
  function setFooterSummary(text) {
    const el = document.getElementById('jlc-wb-footer-summary');
    if (el) el.textContent = text;
  }

  async function renderWorkbench() {
    ensureWorkbenchShell();
    bindFooterActions();
    wbSession = wbSession || loadSession();
    const st = getLrrStatus();
    const ctx = parseExhPageContext(location.href);
    let lrrBit = '未配LRR';
    if (st.configured) {
      if (st.syncing) lrrBit = 'LRR同步中';
      else if (st.last_error) lrrBit = 'LRR失败';
      else if (st.last_sync) {
        const rel = formatCompactRelativeTime(st.last_sync);
        lrrBit = rel ? 'LRR/' + rel : 'LRR已同步';
      } else lrrBit = 'LRR待同步';
    }
    setHeaderSub(
      'v' +
        VERSION +
        ' · ' +
        (ctx && ctx.trackable ? '可收藏当前搜索' : '单本页：收藏请用标签/搜索') +
        ' · ' +
        lrrBit
    );

    const nav = wbSession.nav === 'works' ? 'works' : 'tracking';
    activateNav(nav);
    if (nav === 'works') await renderWorksPage();
    else await renderTrackingPage();
    updateFabBadge();
  }
