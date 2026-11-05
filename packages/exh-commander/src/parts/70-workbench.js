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
        auto: !!config.webdav_auto,
        conflict: config.webdav_conflict || 'ask',
      }),
    });
    return window.__creamuWdExh;
  }

  function applyFabPosition(fab, session) {
    if (!fab) return;
    if (session?.fabLeft == null || session?.fabTop == null) return;
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
      eventType: 'pointer',
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
      fab.title = '打开 Creamu · ExH 控制台 · 拖动可调整位置';
      fab.setAttribute('aria-label', '打开 Creamu · ExH 控制台');
      fab.setAttribute('aria-controls', 'jlc-wb');
      fab.setAttribute('aria-expanded', 'false');
      fab.innerHTML = '<span class="exc-brand-mark" aria-hidden="true">c</span><span>控制台</span><span class="jlc-wb-fab-badge" aria-hidden="true">0</span>';
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
    shell.setAttribute('role', 'region');
    shell.setAttribute('aria-label', 'Creamu · ExH 控制台');
    shell.tabIndex = -1;
    shell.innerHTML =
      '<div class="jlc-wb-resize-w" title="拖拽调整宽度"></div>' +
      '<div class="jlc-wb-resize-h" title="拖拽调整高度"></div>' +
      '<div class="jlc-wb-resize-corner" title="拖拽调整大小"></div>' +
      '<div class="jlc-wb-header" title="按住标题栏拖动窗口">' +
      '  <div class="exc-wb-brand"><div class="jlc-wb-title">ExH 控制台</div>' +
      '  <div class="jlc-wb-subtitle" id="jlc-wb-header-sub">追更与作品库</div></div>' +
      '  <div class="jlc-wb-header-actions">' +
      '    <button type="button" class="jlc-wb-btn ghost" id="exc-wb-layout-toggle">浮窗</button>' +
      '    <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-settings-btn" aria-controls="jlc-wb-settings" aria-expanded="false">设置</button>' +
      '    <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-close-btn" title="收起控制台" aria-label="收起控制台">×</button>' +
      '  </div>' +
      '</div>' +
      '<div class="jlc-wb-nav">' +
      '  <button type="button" data-nav="tracking" class="active">追更</button>' +
      '  <button type="button" data-nav="works">作品库</button>' +
      '</div>' +
      '<div class="jlc-wb-body">' +
      '  <div data-jlc-wb-page="tracking"><div id="exc-wb-tracking-root"></div></div>' +
      '  <div data-jlc-wb-page="works" hidden><div id="exc-wb-works-root"></div></div>' +
      '</div>' +
      '<div class="jlc-wb-footer">' +
      '  <div class="jlc-wb-footer-summary" id="jlc-wb-footer-summary">—</div>' +
      '  <div class="jlc-wb-footer-actions">' +
      '    <button type="button" class="jlc-wb-btn primary" id="jlc-wb-save-current">收藏当前搜索</button>' +
      '    <button type="button" class="jlc-wb-btn ghost" id="exc-check-updates" title="从每条追更首页向后翻到断点。条目间隔 5～10 秒">检查更新</button>' +
      '    <button type="button" class="jlc-wb-btn ghost" id="exc-sync-all" title="同时同步 WebDAV 与 LRR（已配置的项）">同步</button>' +
      '  </div>' +
      '</div>' +
      '<div class="jlc-wb-settings" id="jlc-wb-settings" role="region" aria-label="控制台设置" inert>' +
      '  <div class="jlc-wb-settings-panel">' +
      '    <div class="jlc-wb-settings-head">' +
      '      <strong>设置</strong>' +
      '      <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-settings-close" aria-label="返回控制台" title="返回控制台">←</button>' +
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
    document.getElementById('exc-wb-layout-toggle').onclick = () => {
      wbSession = wbSession || loadSession();
      wbSession.panelMode = wbSession.panelMode === 'float' ? 'dock' : 'float';
      clampWorkbenchShellPos(shell, wbSession);
      saveSession(wbSession);
    };
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
    window.addEventListener('resize', () => clampWorkbenchShellPos(shell, wbSession || loadSession()), { passive: true });
    shell.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      if (document.getElementById('jlc-wb-settings').classList.contains('is-open')) openSettings(false);
      else toggleWorkbench(false);
    });
    return shell;
  }

  function activateNav(nav) {
    if (nav !== 'tracking') invalidateTrackingListPaint();
    const shell = document.getElementById('jlc-wb');
    if (!shell) return;
    shell.querySelectorAll('.jlc-wb-nav button').forEach((b) => {
      const active = b.getAttribute('data-nav') === nav;
      b.classList.toggle('active', active);
      if (active) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
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
    el.inert = !open;
    const shell = document.getElementById('jlc-wb');
    Array.from(shell.children).filter((node) => node !== el).forEach((node) => { node.inert = !!open; });
    const trigger = document.getElementById('jlc-wb-settings-btn');
    trigger.setAttribute('aria-expanded', String(!!open));
    if (open) {
      renderSettingsSections('sync');
      const nav = document.getElementById('jlc-wb-settings-nav');
      if (nav) {
        nav.querySelectorAll('button').forEach((b) =>
          b.classList.toggle('active', b.getAttribute('data-jlc-settings-tab') === 'sync')
        );
      }
    }
    (open ? document.getElementById('jlc-wb-settings-close') : trigger).focus({ preventScroll: true });
  }

  function splitCsvField(s) {
    return String(s == null ? '' : s)
      .split(/[,，\n]/)
      .map((x) => compactText(x))
      .filter(Boolean);
  }

  function settingsSaveFooter() {
    return (
      '<button type="button" class="jlc-wb-btn primary jlc-wb-save-action" id="exc-cfg-save">保存并应用</button>'
    );
  }

  /** 同步页：WebDAV / LRR 按钮（与保存分离） */
  function bindSyncSettingsHandlers(body) {
    if (!body) return;
    const readWdForm = () => {
      const url = body.querySelector('#exc-cfg-wd-url')?.value?.trim() || '';
      const typed = (body.querySelector('#exc-cfg-wd-pass')?.value || '').trim();
      const patch = {
        webdav_url: url,
        webdav_user: body.querySelector('#exc-cfg-wd-user')?.value?.trim() || '',
        webdav_path: body.querySelector('#exc-cfg-wd-path')?.value?.trim() || '/Creamu',
        webdav_enabled: !!body.querySelector('#exc-cfg-wd-en')?.checked,
        webdav_auto: !!body.querySelector('#exc-cfg-wd-auto')?.checked,
        webdav_conflict: body.querySelector('#exc-cfg-wd-conflict')?.value || 'ask',
      };
      if (typed) {
        patch.webdav_password = /jianguoyun\.com/i.test(url || config.webdav_url || '')
          ? typed.replace(/\s+/g, '')
          : typed;
      }
      return patch;
    };
    const passInput = body.querySelector('#exc-cfg-wd-pass');
    const passToggle = body.querySelector('#exc-cfg-wd-pass-toggle');
    if (passInput && passToggle) {
      passToggle.onclick = () => {
        if (passInput.type === 'password') {
          passInput.type = 'text';
          passToggle.textContent = '🔒';
        } else {
          passInput.type = 'password';
          passToggle.textContent = '👁';
        }
      };
    }
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
      eventType: 'pointer',
      isDragDisabled: () => panel.classList.contains('is-docked') || window.innerWidth <= 820,
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
      eventType: 'pointer',
      isDragDisabled: () => panel.classList.contains('is-docked') || window.innerWidth <= 820,
      getStartRect: () => getExhWorkbenchInteractionRect(panel),
      applyRect: (rect) => applyCreamuInteractionRect(panel, rect),
      onEnd: (rect) => persistExhWorkbenchRect(panel, rect, true),
      lockBodySelection: false,
      geometryOptions: { minWidth: 360, minHeight: 280, maxWidth: 720, margin: 12 }
    });
  }

  function clampWorkbenchShellPos(wb, session) {
    if (!wb) return;
    const mobile = window.innerWidth <= 820;
    const docked = !mobile && window.innerWidth >= 1200 && session.panelMode !== 'float';
    const dockWidth = Math.round(Math.min(500, Math.max(400, window.innerWidth * .30)));
    wb.classList.toggle('is-docked', docked);
    wb.classList.toggle('is-mobile', mobile);
    document.documentElement.classList.toggle('exc-console-docked', docked && wb.classList.contains('is-open'));
    document.documentElement.style.setProperty('--exc-dock-width', dockWidth + 'px');
    const toggle = document.getElementById('exc-wb-layout-toggle');
    toggle.hidden = window.innerWidth < 1200;
    toggle.textContent = docked ? '浮窗' : '并排';
    toggle.setAttribute('aria-label', docked ? '切换为自由浮窗' : '切换为并排停靠');
    wb.querySelector('.jlc-wb-header').title = docked || mobile ? 'Creamu · ExH 控制台' : '按住标题栏拖动窗口';
    if (docked || mobile) {
      applyCreamuInteractionRect(wb, {
        left: docked ? window.innerWidth - dockWidth : 0,
        top: docked ? 0 : Math.round(window.innerHeight * .08),
        width: docked ? dockWidth : window.innerWidth,
        height: docked ? window.innerHeight : Math.round(window.innerHeight * .92),
      });
      return;
    }
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
    applyCreamuInteractionRect(wb, rect);
    session.left = rect.left;
    session.top = rect.top;
    session.width = rect.width;
    session.height = rect.height;
  }

  function forceWorkbenchVisible(wb) {
    if (!wb) return;
    wbSession = wbSession || loadSession();
    wb.classList.add('is-open');
    const fab = document.getElementById('jlc-wb-fab');
    fab.classList.add('is-panel-open');
    fab.setAttribute('aria-expanded', 'true');
    clampWorkbenchShellPos(wb, wbSession);
    wb.focus({ preventScroll: true });
  }

  function forceWorkbenchHidden(wb) {
    if (!wb) return;
    if (document.getElementById('jlc-wb-settings').classList.contains('is-open')) openSettings(false);
    wb.classList.remove('is-open');
    document.documentElement.classList.remove('exc-console-docked');
    const fab = document.getElementById('jlc-wb-fab');
    fab.classList.remove('is-panel-open');
    fab.setAttribute('aria-expanded', 'false');
    fab.focus({ preventScroll: true });
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
   * 从工作台打开追更项。
   * 新标签：当前页面板保持开着（开合只记在本标签）；本页跳转才收起。
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
    const wantTab = mode !== 'same';
    wbSession = wbSession || loadSession();
    wbSession.nav = 'tracking';
    wbSession.lastOpenedId = rec.id;
    wbSession.lastOpenedAt = nowMs();
    if (wantTab) {
      // 开合只记在本标签：新标签不得把原页「开着」写成关
      if (isWorkbenchDomOpen()) wbSession.open = true;
      saveSession(wbSession);
    } else {
      wbSession.open = false;
      saveSession(wbSession);
      try {
        toggleWorkbench(false);
      } catch (_) { /* ignore */ }
    }

    rec.last_browsed_at = nowMs();
    // 仅清「新检查到」旗标；若顶仍≠断点，角标/leaf 仍算有更新
    rec.has_update = 0;
    try {
      await saveTrackingRecord(rec);
    } catch (_) { /* ignore */ }

    if (wantTab) {
      if (!openUrlInNewTab(url)) {
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
    setHeaderSub(lrrBit.replace('未配LRR', '追更与作品库'));
    const collect = document.getElementById('jlc-wb-save-current');
    collect.disabled = !(ctx && ctx.trackable);
    collect.title = collect.disabled ? '在搜索或标签列表收藏追更' : '收藏搜索并设置分类';

    const nav = wbSession.nav === 'works' ? 'works' : 'tracking';
    activateNav(nav);
    if (nav === 'works') await renderWorksPage();
    else await renderTrackingPage();
    updateFabBadge();
  }
