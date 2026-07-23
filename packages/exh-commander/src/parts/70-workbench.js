  let wbSession = null;
  let wbDragging = null;
  let wbResizing = null;
  /** 主动检查更新运行态 */
  let trackingCheckRuntime = null;

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
    if (!fab || fab.dataset.dragBound === '1') return;
    fab.dataset.dragBound = '1';
    applyFabPosition(fab, wbSession || loadSession());
    let active = false;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;
    const MOVE_PX = 10;

    const onMove = (event) => {
      if (!active) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!dragging && Math.abs(dx) + Math.abs(dy) > MOVE_PX) {
        dragging = true;
        fab.classList.add('is-dragging');
      }
      if (!dragging) return;
      event.preventDefault();
      const w = fab.offsetWidth || 34;
      const h = fab.offsetHeight || 34;
      const point = clampCreamuWorkbenchPoint(
        { left: originLeft + dx, top: originTop + dy },
        { width: w, height: h },
        window
      );
      fab.style.left = point.left + 'px';
      fab.style.top = point.top + 'px';
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
    };

    const onUp = () => {
      if (!active) return;
      active = false;
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', onUp, true);
      fab.classList.remove('is-dragging');
      if (dragging) {
        dragging = false;
        const rect = fab.getBoundingClientRect();
        wbSession = wbSession || loadSession();
        wbSession.fabLeft = Math.round(rect.left);
        wbSession.fabTop = Math.round(rect.top);
        saveSession(wbSession);
        fab.dataset.skipClick = '1';
        window.setTimeout(() => {
          delete fab.dataset.skipClick;
        }, 50);
      }
    };

    // 用 mousedown 启动拖动（Firefox 站点页更稳）；点击仍走 click
    fab.addEventListener('mousedown', (event) => {
      if (event.button !== 0) return;
      active = true;
      dragging = false;
      startX = event.clientX;
      startY = event.clientY;
      const rect = fab.getBoundingClientRect();
      originLeft = rect.left;
      originTop = rect.top;
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('mouseup', onUp, true);
    });
    fab.addEventListener('click', (event) => {
      if (fab.dataset.skipClick === '1' || dragging) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      try {
        toggleWorkbench();
      } catch (e) {
        console.warn('[ExC] toggleWorkbench', e);
        showToast('打开工作台失败: ' + ((e && e.message) || e));
      }
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

  async function updateFabBadge() {
    const fab = document.getElementById('jlc-wb-fab');
    if (!fab) return;
    const badge = fab.querySelector('.jlc-wb-fab-badge');
    try {
      const list = await listTrackingSearches();
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
      '  <div style="display:flex;gap:8px;flex-wrap:wrap;">' +
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
      await saveCurrentPageAsTracking();
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
      '<button type="button" class="jlc-wb-btn primary" id="exc-cfg-save" style="width:100%;margin-top:14px;">💾 保存本页</button>'
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

  function initWbDrag(handle, panel) {
    handle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.jlc-wb-header-actions')) return;
      const rect = panel.getBoundingClientRect();
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.width = rect.width + 'px';
      panel.style.height = rect.height + 'px';
      wbDragging = {
        startRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        startPoint: { x: e.clientX, y: e.clientY },
      };
      panel.classList.add('is-dragging');
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (wbResizing) {
        const mode = wbResizing.mode || 'w';
        const rect = resizeCreamuWorkbenchRect(
          wbResizing.startRect,
          wbResizing.startPoint,
          { x: e.clientX, y: e.clientY },
          mode,
          window,
          { minWidth: 360, minHeight: 280, maxWidth: 720, margin: 12 }
        );
        panel.style.left = rect.left + 'px';
        panel.style.top = rect.top + 'px';
        panel.style.width = rect.width + 'px';
        panel.style.height = rect.height + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        return;
      }
      if (!wbDragging) return;
      const rect = moveCreamuWorkbenchRect(
        wbDragging.startRect,
        wbDragging.startPoint,
        { x: e.clientX, y: e.clientY },
        window,
        { minWidth: 360, minHeight: 280, maxWidth: 720, margin: 12 }
      );
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
      panel.style.width = rect.width + 'px';
      panel.style.height = rect.height + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    });
    window.addEventListener('mouseup', () => {
      if (wbResizing) {
        const handleEl = wbResizing.handle;
        if (handleEl) handleEl.classList.remove('is-dragging');
        wbResizing = null;
        wbSession = wbSession || loadSession();
        const rect = panel.getBoundingClientRect();
        wbSession.width = Math.round(rect.width) || 500;
        wbSession.height = Math.round(rect.height) || 560;
        wbSession.left = Math.round(rect.left);
        wbSession.top = Math.round(rect.top);
        saveSession(wbSession);
        saveConfig({ workbench_width: wbSession.width });
        return;
      }
      if (!wbDragging) return;
      wbDragging = null;
      panel.classList.remove('is-dragging');
      const rect = panel.getBoundingClientRect();
      wbSession = wbSession || loadSession();
      wbSession.left = rect.left;
      wbSession.top = rect.top;
      wbSession.width = Math.round(rect.width) || wbSession.width;
      wbSession.height = Math.round(rect.height) || wbSession.height;
      clampWorkbenchShellPos(panel, wbSession);
      saveSession(wbSession);
    });
  }

  function initWbResizeHandles(panel) {
    if (!panel || panel.dataset.resizeBound === '1') return;
    panel.dataset.resizeBound = '1';
    const bind = (sel, mode) => {
      const handle = panel.querySelector(sel);
      if (!handle) return;
      handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        const rect = panel.getBoundingClientRect();
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.left = rect.left + 'px';
        panel.style.top = rect.top + 'px';
        panel.style.width = rect.width + 'px';
        panel.style.height = rect.height + 'px';
        wbResizing = {
          mode: mode,
          startRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          startPoint: { x: e.clientX, y: e.clientY },
          handle: handle,
        };
        handle.classList.add('is-dragging');
        panel.classList.add('is-resizing');
        e.preventDefault();
        e.stopPropagation();
      });
    };
    bind('.jlc-wb-resize-w', 'w');
    bind('.jlc-wb-resize-h', 'h');
    bind('.jlc-wb-resize-corner', 'corner');
    window.addEventListener('mouseup', () => {
      panel.classList.remove('is-resizing');
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

  async function collectManualFolderOptions() {
    const all = await listTrackingSearches();
    const map = new Map();
    (all || []).forEach((r) => {
      const name = compactText(r.custom_folder || '');
      if (!name) return;
      const key = 'uf:' + name.toLowerCase();
      if (!map.has(key)) map.set(key, name);
    });
    return Array.from(map.entries())
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  }

  async function renderTrackingPage() {
    const root = document.getElementById('exc-wb-tracking-root');
    if (!root) return;
    const query = compactText(wbSession.trackingQuery || '');
    let groupFilter = wbSession.trackingGroup || 'all';
    // 旧版按 group_type 的筛选项作废，回到全部
    if (
      groupFilter !== 'all' &&
      groupFilter !== 'none' &&
      groupFilter.indexOf('uf:') !== 0
    ) {
      groupFilter = 'all';
      wbSession.trackingGroup = 'all';
      saveSession(wbSession);
    }
    const folders = await collectManualFolderOptions();

    root.innerHTML =
      '<div class="jlc-wb-toolbar">' +
      '  <div class="jlc-wb-toolbar-row">' +
      '    <input class="jlc-wb-search" id="exc-trk-q" type="search" placeholder="筛选追更标题…" value="' +
      escapeHtml(query) +
      '">' +
      '    <select class="jlc-wb-select" id="exc-trk-group">' +
      '      <option value="all"' +
      (groupFilter === 'all' ? ' selected' : '') +
      '>全部分组</option>' +
      '      <option value="none"' +
      (groupFilter === 'none' ? ' selected' : '') +
      '>未分类</option>' +
      folders
        .map(
          (f) =>
            '<option value="' +
            escapeHtml(f.key) +
            '"' +
            (groupFilter === f.key ? ' selected' : '') +
            '>' +
            escapeHtml(f.name) +
            '</option>'
        )
        .join('') +
      '    </select>' +
      '  </div>' +
      '  <div class="jlc-wb-toolbar-row" style="color:#9a7d60;font-size:12.5px;line-height:1.45">' +
      '分组靠手动：菜单「设分类」。未设的在「未分类」。自由词搜索不再自动拆组。检查更新间隔 5～10 秒。' +
      '  </div>' +
      '</div>' +
      '<div class="jlc-wb-list-scroll" id="jlc-wb-list-scroll"></div>';

    document.getElementById('exc-trk-q').oninput = (e) => {
      wbSession.trackingQuery = e.target.value;
      saveSession(wbSession);
      paintTrackingList();
    };
    document.getElementById('exc-trk-group').onchange = (e) => {
      wbSession.trackingGroup = e.target.value;
      saveSession(wbSession);
      paintTrackingList();
    };
    await paintTrackingList();
  }

  function formatCompactRelativeTime(value) {
    if (!value) return '';
    const time = typeof value === 'number' ? value : new Date(value).getTime();
    if (!Number.isFinite(time)) return '';
    const diff = Date.now() - time;
    if (diff < 60 * 1000) return '刚刚';
    if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + '分钟前';
    if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + '小时前';
    if (diff < 30 * 24 * 60 * 60 * 1000) return Math.floor(diff / (24 * 60 * 60 * 1000)) + '天前';
    const d = new Date(time);
    return d.getMonth() + 1 + '/' + d.getDate();
  }

  function updateTrackingCheckButton() {
    const btn = document.getElementById('exc-check-updates');
    if (!btn) return;
    if (trackingCheckRuntime && trackingCheckRuntime.active) {
      btn.disabled = true;
      btn.textContent =
        '检查中 ' +
        trackingCheckRuntime.completed +
        '/' +
        trackingCheckRuntime.total +
        (trackingCheckRuntime.note ? ' · ' + trackingCheckRuntime.note : '');
    } else {
      btn.disabled = false;
      btn.textContent = '检查更新';
    }
  }

  async function refreshAllTrackingSearches(options) {
    options = options || {};
    if (trackingCheckRuntime && trackingCheckRuntime.active) {
      showToast('正在检查更新…');
      return;
    }
    let list = await listTrackingSearches();
    if (options.recordIds && options.recordIds.length) {
      const set = new Set(options.recordIds.map(String));
      list = list.filter((r) => set.has(String(r.id)));
    }
    if (!list.length) {
      showToast('没有可检查的追更项');
      return;
    }

    trackingCheckRuntime = {
      active: true,
      completed: 0,
      total: list.length,
      note: '开始',
      cancelled: false,
      updates: 0,
      errors: 0,
    };
    updateTrackingCheckButton();
    setFooterSummary('检查更新 0/' + list.length);

    try {
      for (let i = 0; i < list.length; i++) {
        if (trackingCheckRuntime.cancelled) break;
        const rec = list[i];
        const title = getTrackingDisplayTitle(rec);
        trackingCheckRuntime.note = title.slice(0, 18);
        updateTrackingCheckButton();
        setFooterSummary(
          '检查 ' +
            (i + 1) +
            '/' +
            list.length +
            ' · ' +
            title.slice(0, 24)
        );
        try {
          await refreshSingleTrackingRecord(rec);
          if (
            typeof trackingHasPendingUpdate === 'function'
              ? trackingHasPendingUpdate(rec)
              : rec.has_update
          ) {
            trackingCheckRuntime.updates += 1;
          }
        } catch (err) {
          trackingCheckRuntime.errors += 1;
          try {
            rec.last_check_at = nowMs();
            rec.last_check_error = (err && err.message) || String(err);
            await saveTrackingRecord(rec);
          } catch (_) { /* ignore */ }
          const msg = (err && err.message) || String(err);
          if (/限流|429|封禁|Sad Panda|banned/i.test(msg)) {
            showToast('已暂停：' + msg);
            break;
          }
        }
        trackingCheckRuntime.completed = i + 1;
        updateTrackingCheckButton();
        updateFabBadge();
        // 轻量刷新列表状态（不整页重绑过多）
        if (document.getElementById('jlc-wb-list-scroll')) {
          await paintTrackingList();
        }
        if (i < list.length - 1 && !trackingCheckRuntime.cancelled) {
          const wait = pickTrackingCheckDelayMs();
          trackingCheckRuntime.note = '间隔 ' + Math.round(wait / 1000) + 's';
          updateTrackingCheckButton();
          setFooterSummary(
            '冷却 ' +
              Math.round(wait / 1000) +
              's · 已检 ' +
              trackingCheckRuntime.completed +
              '/' +
              list.length
          );
          await sleepMs(wait);
        }
      }
      const done = trackingCheckRuntime.completed;
      const total = trackingCheckRuntime.total;
      const errN = trackingCheckRuntime.errors;
      showToast(
        '检查完成 ' +
          done +
          '/' +
          total +
          (errN ? ' · 失败 ' + errN : '')
      );
    } finally {
      trackingCheckRuntime = null;
      updateTrackingCheckButton();
      await paintTrackingList();
      updateFabBadge();
    }
  }

  /** 对齐 JLC buildTrackingStatus：有估数时 leaf 显示 +N */
  function buildExhTrackingStatus(r) {
    if (!r) return { tone: 'gray', text: '未检查', note: '' };
    if (r.last_check_error) {
      return { tone: 'red', text: '检查失败', note: String(r.last_check_error).slice(0, 80) };
    }
    const top = compactText(r.top_gid || '');
    const bp = compactText(r.breakpoint_gid || '');
    const pill =
      typeof getTrackingUpdatePillText === 'function' ? getTrackingUpdatePillText(r) : '';
    const unreadN =
      typeof getTrackingUnreadEstimate === 'function' ? getTrackingUnreadEstimate(r) : 0;
    const unreadNote = unreadN
      ? r.unread_estimate_capped
        ? '约 ' + unreadN + '+ 条未读'
        : '约 ' + unreadN + ' 条未读'
      : '';
    // 最新 ≠ 断点作品 → 必有更新（用户贴的就是这种：不该显示「已检查」）
    if (top && bp && top !== bp) {
      const noteBits = [
        '最新 ' + (getTrackingTopMetaLabel(r) || '—'),
        '断点 ' + (getTrackingBpMetaLabel(r) || '—'),
      ];
      if (unreadNote) noteBits.push(unreadNote);
      return {
        tone: 'red',
        text: pill || '更新',
        note: noteBits.join(' · '),
      };
    }
    if (r.has_update) {
      return {
        tone: 'yellow',
        text: pill || '更新',
        note:
          (unreadNote ? unreadNote + ' · ' : '') +
          (getTrackingTopMetaLabel(r) || '列表顶部有变化'),
      };
    }
    if (top && bp && top === bp) {
      return { tone: 'green', text: '已追到', note: '断点已在最新' };
    }
    if (r.last_check_at) {
      const rel = formatCompactRelativeTime(r.last_check_at);
      return { tone: 'gray', text: '已检查', note: rel ? '检查于 ' + rel : '已检查' };
    }
    return {
      tone: 'gray',
      text: '未检查',
      note: r.last_browsed_at
        ? '上次浏览 ' + (formatCompactRelativeTime(r.last_browsed_at) || '')
        : '尚未浏览',
    };
  }

  /**
   * ExH 卡片：
   * 标题 + leaf(更新/…)
   * 胶囊行：[最新 YY-MM-DD HH:mm] [断点 YY-MM-DD HH:mm]
   * （发布时间改放胶囊，不再占 meta 长行；「当前/上次」去掉，当前页用卡片 is-current 描边）
   */
  function buildExhTrackingItemHtml(r, curSig) {
    const isCurrent = !!(curSig && r.query_signature === curSig);
    const title = getTrackingDisplayTitle(r);
    const status = buildExhTrackingStatus(r);
    const hasBp = trackingHasAnyBreakpoint(r);
    const hasWorkBp = trackingHasWorkBreakpoint(r);
    const bpPage = Number(r.breakpoint_page);
    const hasBpPage = Number.isFinite(bpPage) && bpPage >= 0 && (hasBp || hasWorkBp);
    const topGid = compactText(r.top_gid || '');
    const bpGid = compactText(r.breakpoint_gid || '');

    const topPosted = getTrackingTopMetaLabel(r);
    const bpPosted = getTrackingBpMetaLabel(r);

    const topHover =
      '最新 ' +
      (topPosted || '未知时间') +
      (r.top_title ? ' · ' + compactText(r.top_title) : topGid ? ' · g' + topGid : '');
    const bpHoverBits = [
      '断点 ' + (bpPosted || '未知时间'),
      r.breakpoint_title
        ? compactText(r.breakpoint_title)
        : bpGid
          ? 'g' + bpGid
          : '',
      hasBpPage ? '列表第' + (bpPage + 1) + '页' : '',
    ].filter(Boolean);
    const bpHover = bpHoverBits.join(' · ');

    // 胶囊：最新 / 断点（替代原「当前 · 上次」行）
    const subPills = [];
    if (topGid || topPosted) {
      subPills.push(
        '<span class="jlc-site-pill is-top" title="' +
          escapeHtml(topHover) +
          '">' +
          escapeHtml('最新 ' + (topPosted || '—')) +
          '</span>'
      );
    }
    if (bpGid || bpPosted || hasWorkBp) {
      subPills.push(
        '<span class="jlc-site-pill is-bp' +
          (hasWorkBp ? ' is-last' : '') +
          '" title="' +
          escapeHtml(bpHover) +
          '">' +
          escapeHtml('断点 ' + (bpPosted || '—')) +
          '</span>'
      );
    }

    const leafTitle = status.note || status.text || '';
    const isFocus = !!(
      status.tone === 'red' ||
      status.tone === 'yellow' ||
      (typeof trackingHasPendingUpdate === 'function'
        ? trackingHasPendingUpdate(r)
        : r.has_update) ||
      isCurrent
    );

    return (
      '<div class="jlc-wb-item tone-' +
      escapeHtml(status.tone || 'gray') +
      (isFocus ? ' is-focus' : '') +
      (isCurrent ? ' is-current' : '') +
      '" data-trk="' +
      escapeHtml(r.id) +
      '" title="点击打开">' +
      '<div class="jlc-wb-item-row">' +
      buildTrackingCoverHtml(r) +
      '<div class="jlc-wb-item-body">' +
      '<div class="jlc-wb-item-title-row">' +
      '<div class="jlc-wb-item-title">' +
      escapeHtml(title) +
      '</div>' +
      '<span class="jlc-wb-leaf tone-' +
      escapeHtml(status.tone || 'gray') +
      '" title="' +
      escapeHtml(leafTitle) +
      '">' +
      escapeHtml(status.text) +
      '</span>' +
      '</div>' +
      (subPills.length
        ? '<div class="jlc-wb-item-pills">' + subPills.join('') + '</div>'
        : '<div class="jlc-wb-item-pills"></div>') +
      '</div>' +
      '<div class="jlc-wb-item-side">' +
      '<button type="button" class="jlc-wb-open-btn" data-tact="open" title="打开">Open</button>' +
      '<button type="button" class="jlc-wb-more-btn" data-tact="menu" title="更多">···</button>' +
      '<div class="jlc-wb-item-menu" data-menu="' +
      escapeHtml(r.id) +
      '" hidden>' +
      '<button type="button" data-tact="open-same">本页打开</button>' +
      '<button type="button" data-tact="check">检查更新</button>' +
      '<button type="button" data-tact="rename">改名</button>' +
      '<button type="button" data-tact="folder">设分类</button>' +
      (hasBp ? '<button type="button" data-tact="bp">继续断点</button>' : '') +
      '<button type="button" data-tact="clear-bp">清除断点</button>' +
      '<button type="button" class="is-danger" data-tact="del">删除</button>' +
      '</div>' +
      '</div></div></div>'
    );
  }

  async function paintTrackingList() {
    const host = document.getElementById('jlc-wb-list-scroll');
    if (!host) return;
    let list = await listTrackingSearches();
    const q = compactText(wbSession.trackingQuery || '').toLowerCase();
    const gf = wbSession.trackingGroup || 'all';
    if (gf === 'none') {
      list = list.filter((r) => !compactText(r.custom_folder || ''));
    } else if (gf.indexOf('uf:') === 0) {
      const want = gf.slice(3);
      list = list.filter((r) => compactText(r.custom_folder || '').toLowerCase() === want);
    } else if (gf !== 'all') {
      // 兼容旧筛选：不再按自动类型拆，忽略
    }
    if (q) {
      list = list.filter(
        (r) =>
          getTrackingDisplayTitle(r).toLowerCase().includes(q) ||
          (r.f_search || '').toLowerCase().includes(q) ||
          compactText(r.custom_folder || '')
            .toLowerCase()
            .includes(q)
      );
    }

    const ctx = parseExhPageContext(location.href);
    const curSig = ctx && ctx.trackable ? ctx.query_signature : '';

    // 旧记录可能没有发布时间：DOM / editions / gdata 批量回填
    try {
      await enrichTrackingListPosted(list);
    } catch (_) { /* ignore */ }

    if (!(trackingCheckRuntime && trackingCheckRuntime.active)) {
      const pending = list.filter((r) =>
        typeof trackingHasPendingUpdate === 'function' ? trackingHasPendingUpdate(r) : !!r.has_update
      );
      const unreadSum = pending.reduce((s, r) => {
        const n =
          typeof getTrackingUnreadEstimate === 'function' ? getTrackingUnreadEstimate(r) : 0;
        return s + n;
      }, 0);
      setFooterSummary(
        (list.length ? list.length + ' 个追更' : '还没有追更') +
          (pending.length ? ' · ' + pending.length + ' 更新' : '') +
          (unreadSum ? ' · 约 +' + unreadSum : '') +
          (ctx && ctx.trackable ? ' · 可收藏当前' : '')
      );
    }
    updateTrackingCheckButton();

    if (!list.length) {
      host.innerHTML =
        '<div class="jlc-wb-empty">' +
        (ctx && ctx.trackable
          ? '没有匹配的追更项。可点顶部条「⭐ 收藏」或底部「⭐ 收藏当前」。'
          : '还没有追更项。请先打开标签/搜索/社团页，再点「⭐ 收藏」。') +
        '</div>';
      return;
    }

    // 分组：仅手动分类；无分类 →「未分类」
    const groups = {};
    list.forEach((r) => {
      const g = getTrackingListGroupKey(r);
      if (!groups[g]) groups[g] = [];
      groups[g].push(r);
    });
    const groupKeys = Object.keys(groups).sort((a, b) => {
      // 未分类置顶，便于先处理再「设分类」
      if (a === 'none' && b !== 'none') return -1;
      if (b === 'none' && a !== 'none') return 1;
      const la = getTrackingListGroupLabel(a, groups[a][0]);
      const lb = getTrackingListGroupLabel(b, groups[b][0]);
      return la.localeCompare(lb, 'zh');
    });

    if (!wbSession.collapsedGroups || typeof wbSession.collapsedGroups !== 'object') {
      wbSession.collapsedGroups = {};
    }
    const collapsedMap = wbSession.collapsedGroups;

    const chunks = [];
    groupKeys.forEach((g) => {
      const rows = groups[g];
      if (!rows || !rows.length) return;
      const updates = rows.filter((r) =>
        typeof trackingHasPendingUpdate === 'function' ? trackingHasPendingUpdate(r) : !!r.has_update
      );
      const unreadSum = updates.reduce((s, r) => {
        const n =
          typeof getTrackingUnreadEstimate === 'function' ? getTrackingUnreadEstimate(r) : 0;
        return s + n;
      }, 0);
      const gLabel = getTrackingListGroupLabel(g, rows[0]);
      const collapsed = !!collapsedMap[g];
      const updateLabel = updates.length
        ? '（' +
          updates.length +
          ' 更新' +
          (unreadSum ? ' · +' + unreadSum + (updates.some((r) => r.unread_estimate_capped) ? '+' : '') : '') +
          '）'
        : '';
      chunks.push(
        '<section class="jlc-wb-group' +
          (collapsed ? ' collapsed' : '') +
          '" data-jlc-group="' +
          escapeHtml(g) +
          '">' +
          '<button type="button" class="jlc-wb-group-toggle" data-jlc-toggle-group="' +
          escapeHtml(g) +
          '"><span>' +
          escapeHtml(gLabel) +
          escapeHtml(updateLabel) +
          '</span><small>' +
          rows.length +
          ' 项</small></button>' +
          '<div class="jlc-wb-group-body">'
      );
      rows.forEach((r) => {
        chunks.push(buildExhTrackingItemHtml(r, curSig));
      });
      chunks.push('</div></section>');
    });

    host.innerHTML = chunks.join('');
    // 点列表外关掉 fixed 菜单
    if (!host.dataset.excMenuDocBound) {
      host.dataset.excMenuDocBound = '1';
      document.addEventListener(
        'click',
        (ev) => {
          if (ev.target.closest && ev.target.closest('#jlc-wb .jlc-wb-item-menu, #jlc-wb .jlc-wb-more-btn')) {
            return;
          }
          const sc = document.getElementById('jlc-wb-list-scroll');
          if (!sc) return;
          sc.querySelectorAll('.jlc-wb-item-menu').forEach((m) => {
            m.hidden = true;
            m.classList.remove('is-fixed-menu', 'is-up');
            m.style.cssText = '';
          });
          sc.querySelectorAll('.jlc-wb-more-btn.is-open').forEach((b) => b.classList.remove('is-open'));
          sc.querySelectorAll('.jlc-wb-item.is-menu-open').forEach((c) => c.classList.remove('is-menu-open'));
        },
        true
      );
    }
    host.onclick = async (e) => {
      // 分组折叠/展开
      const toggle = e.target.closest('[data-jlc-toggle-group]');
      if (toggle) {
        e.preventDefault();
        e.stopPropagation();
        const gk = toggle.getAttribute('data-jlc-toggle-group') || '';
        const section = toggle.closest('.jlc-wb-group');
        if (!gk || !section) return;
        wbSession = wbSession || loadSession();
        if (!wbSession.collapsedGroups || typeof wbSession.collapsedGroups !== 'object') {
          wbSession.collapsedGroups = {};
        }
        const next = !section.classList.contains('collapsed');
        section.classList.toggle('collapsed', next);
        if (next) wbSession.collapsedGroups[gk] = true;
        else delete wbSession.collapsedGroups[gk];
        saveSession(wbSession);
        return;
      }

      const menuBtn = e.target.closest('[data-tact="menu"]');
      const tactBtn = e.target.closest('[data-tact]');
      const item = e.target.closest('[data-trk]');
      if (!item) return;
      const id = item.getAttribute('data-trk');
      const list2 = await listTrackingSearches();
      const rec = list2.find((r) => r.id === id);
      if (!rec) return;

      if (menuBtn) {
        e.preventDefault();
        e.stopPropagation();
        const menu = item.querySelector('.jlc-wb-item-menu');
        const moreBtn = item.querySelector('.jlc-wb-more-btn');
        const willOpen = !!(menu && menu.hidden);
        // 关掉其它菜单并清掉 fixed 定位
        host.querySelectorAll('.jlc-wb-item-menu').forEach((m) => {
          m.hidden = true;
          m.classList.remove('is-up', 'is-fixed-menu');
          m.style.cssText = '';
        });
        host.querySelectorAll('.jlc-wb-more-btn.is-open').forEach((b) => b.classList.remove('is-open'));
        host.querySelectorAll('.jlc-wb-item.is-menu-open').forEach((c) => c.classList.remove('is-menu-open'));
        if (menu && willOpen) {
          menu.hidden = false;
          if (moreBtn) moreBtn.classList.add('is-open');
          item.classList.add('is-menu-open');
          // fixed 挂到视口：避免列表 overflow 裁切 / 上翻被组头挡住
          const anchor = moreBtn || menuBtn;
          const r = anchor.getBoundingClientRect();
          menu.classList.add('is-fixed-menu');
          menu.style.position = 'fixed';
          menu.style.zIndex = '1000200';
          menu.style.left = 'auto';
          menu.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
          menu.style.top = r.bottom + 4 + 'px';
          menu.style.bottom = 'auto';
          requestAnimationFrame(() => {
            const mr = menu.getBoundingClientRect();
            if (mr.bottom > window.innerHeight - 8) {
              // 下方不够：贴按钮上方，仍用 fixed，不会被列表裁
              menu.style.top = 'auto';
              menu.style.bottom = Math.max(8, window.innerHeight - r.top + 4) + 'px';
            }
            if (mr.right > window.innerWidth - 4) {
              menu.style.right = '8px';
            }
          });
        }
        return;
      }

      if (!tactBtn) {
        // 点卡片空白：按默认方式打开，并收起工作台
        await openTrackingRecordFromWorkbench(rec, 'default');
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const act = tactBtn.getAttribute('data-tact');
      if (act === 'open') {
        await openTrackingRecordFromWorkbench(rec, 'default');
      } else if (act === 'open-same') {
        await openTrackingRecordFromWorkbench(rec, 'same');
      } else if (act === 'check') {
        if (trackingCheckRuntime && trackingCheckRuntime.active) {
          showToast('正在批量检查中…');
          return;
        }
        showToast('检查中…');
        try {
          await refreshSingleTrackingRecord(rec);
          {
            const pending =
              typeof trackingHasPendingUpdate === 'function'
                ? trackingHasPendingUpdate(rec)
                : !!rec.has_update;
            const pill =
              typeof getTrackingUpdatePillText === 'function' ? getTrackingUpdatePillText(rec) : '';
            showToast(
              pending
                ? '有更新' + (pill && pill !== '更新' ? ' ' + pill : '') + '：' + getTrackingDisplayTitle(rec)
                : '无新顶栏'
            );
          }
        } catch (err) {
          showToast('检查失败: ' + ((err && err.message) || err));
        }
        paintTrackingList();
        updateFabBadge();
      } else if (act === 'bp') {
        wbSession = wbSession || loadSession();
        wbSession.open = false;
        saveSession(wbSession);
        try {
          toggleWorkbench(false);
        } catch (_) { /* ignore */ }
        await openTrackingBreakpoint(rec);
      } else if (act === 'clear-bp') {
        rec.breakpoint_page = '';
        rec.breakpoint_url = '';
        rec.breakpoint_at = 0;
        rec.breakpoint_gid = '';
        rec.breakpoint_token = '';
        rec.breakpoint_title = '';
        rec.breakpoint_posted_at = 0;
        await saveTrackingRecord(rec);
        showToast('已清除断点');
        paintTrackingList();
      } else if (act === 'rename') {
        const next = prompt('追更显示名', getTrackingDisplayTitle(rec));
        if (next == null) return;
        rec.custom_label = compactText(next);
        await saveTrackingRecord(rec);
        paintTrackingList();
      } else if (act === 'folder') {
        const next = prompt(
          '手动分类名（用于列表分组；留空=放回「未分类」）',
          rec.custom_folder || ''
        );
        if (next == null) return;
        rec.custom_folder = compactText(next);
        await saveTrackingRecord(rec);
        // 分类变更后重刷整页，更新筛选下拉里的分类名
        await renderTrackingPage();
      } else if (act === 'del') {
        if (!confirm('删除追更「' + getTrackingDisplayTitle(rec) + '」？')) return;
        await deleteTrackingRecord(id);
        paintTrackingList();
        updateFabBadge();
      }
    };
  }

  async function renderWorksPage() {
    const root = document.getElementById('exc-wb-works-root');
    if (!root) return;
    const tab = ['blocked', 'better', 'lrr'].includes(wbSession.workTab) ? wbSession.workTab : 'lrr';
    root.innerHTML =
      '<div class="jlc-wb-toolbar">' +
      '  <div class="jlc-wb-toolbar-row" id="exc-work-chips"></div>' +
      '  <div class="jlc-wb-toolbar-row" style="color:#9a7d60;font-size:12.5px">在库=同步后的 LRR 档案；有更好版/抛弃依赖已浏览作品。搜索收藏请用「追更」。</div>' +
      '</div>' +
      '<div class="jlc-wb-list-scroll" id="jlc-wb-works-scroll"></div>';

    const chips = [
      { id: 'lrr', label: 'LRR 在库' },
      { id: 'better', label: '有更好版' },
      { id: 'blocked', label: '已抛弃' },
    ];
    const chipHost = document.getElementById('exc-work-chips');
    chipHost.innerHTML = chips
      .map(
        (c) =>
          '<button type="button" class="jlc-wb-chip' +
          (c.id === tab ? ' is-on' : '') +
          '" data-wtab="' +
          c.id +
          '">' +
          c.label +
          '</button>'
      )
      .join('');
    chipHost.onclick = (e) => {
      const b = e.target.closest('[data-wtab]');
      if (!b) return;
      wbSession.workTab = b.getAttribute('data-wtab');
      saveSession(wbSession);
      renderWorksPage();
    };
    await paintWorksList(tab);
  }

  async function paintWorksList(tab) {
    const host = document.getElementById('jlc-wb-works-scroll');
    if (!host) return;

    // LRR 在库：直接列档案（同步后即有），不依赖是否点过画廊
    if (tab === 'lrr') {
      await paintLrrLibraryList(host);
      return;
    }

    let works = [];
    if (tab === 'blocked') works = await listBlockedWorks();
    else if (tab === 'better') {
      const all = await listAllWorks();
      for (const w of all) {
        const eds = await listEditionsByWork(w.work_id);
        if (!eds.length) continue;
        const lib = await resolveLibraryState(Object.assign({}, eds[0], { work_id: w.work_id }));
        if (lib.has_better_remote) works.push(Object.assign({}, w, { _lib: lib }));
      }
    }

    setFooterSummary((works.length ? works.length + ' 本' : '无') + ' · 作品');
    if (!works.length) {
      host.innerHTML =
        '<div class="jlc-wb-empty">暂无条目。有更好版需先浏览过相关画廊；画廊页可「抛弃」屏蔽单本。</div>';
      return;
    }
    const chunks = [];
    for (const w of works.slice(0, 80)) {
      const eds = await listEditionsByWork(w.work_id);
      const best = pickBestEdition(eds, config);
      const title = w.title_raw || (best && best.title_raw) || w.work_id;
      const url = best ? best.url || buildGalleryUrl(location.origin, best.gid, best.token) : '';
      chunks.push(
        '<div class="jlc-wb-item" data-work="' +
          escapeHtml(w.work_id) +
          '">' +
          '<div class="jlc-wb-item-title">' +
          (url ? '<a href="' + escapeHtml(url) + '" style="color:inherit;text-decoration:none">' + escapeHtml(title) + '</a>' : escapeHtml(title)) +
          '</div>' +
          '<div class="jlc-wb-item-actions">' +
          '<button type="button" class="jlc-wb-btn primary" data-wact="best">最佳版</button>' +
          '<button type="button" class="jlc-wb-btn ghost" data-wact="bind">LRR</button>' +
          '</div></div>'
      );
    }
    host.innerHTML = chunks.join('');
    host.onclick = async (e) => {
      const btn = e.target.closest('[data-wact]');
      if (!btn) return;
      const workId = btn.closest('[data-work]')?.getAttribute('data-work');
      if (!workId) return;
      const eds = await listEditionsByWork(workId);
      const best = pickBestEdition(eds, config) || eds[0];
      if (btn.getAttribute('data-wact') === 'best') await openBestEdition(workId);
      if (btn.getAttribute('data-wact') === 'bind' && best) {
        best.work_id = workId;
        await openBindModal(best);
      }
    };
  }

  async function paintLrrLibraryList(host) {
    const entries = typeof listLibraryArchiveEntries === 'function' ? await listLibraryArchiveEntries() : [];
    const total = entries.length;
    setFooterSummary((total ? total + ' 本' : '无') + ' · LRR 档案');
    if (!total) {
      const st = typeof getLrrStatus === 'function' ? getLrrStatus() : {};
      host.innerHTML =
        '<div class="jlc-wb-empty">' +
        (st.configured
          ? st.last_error
            ? 'LRR 上次同步失败：' + escapeHtml(st.last_error) + '。请到「设置 → 同步」重试。'
            : st.last_sync
              ? '本地无档案。可到「设置 → 同步」重新同步 LRR。'
              : '尚未同步 LRR。请到「设置 → 同步」拉取在库列表。'
          : '未配置 LRR。请到「设置 → 同步」填写 Base URL / API Key 后同步。') +
        '</div>';
      return;
    }

    const limit = 200;
    // 当前画廊页：对应档案置顶 + 高亮
    let pageGid = '';
    try {
      if (typeof parseGalleryUrl === 'function') {
        const gt = parseGalleryUrl(location.href);
        if (gt && gt.gid) pageGid = String(gt.gid);
      }
    } catch (_) { /* ignore */ }
    const isEntCurrent = (ent) => {
      if (!pageGid || !ent) return false;
      const a = ent.archive || {};
      if (a.eh_gid && String(a.eh_gid) === pageGid) return true;
      if (ent.edition && String(ent.edition.gid) === pageGid) return true;
      if (ent.source && String(ent.source.gid) === pageGid) return true;
      if (ent.link && ent.link.edition_id && String(ent.link.edition_id).indexOf('e_' + pageGid + '_') === 0) {
        return true;
      }
      return false;
    };
    const ranked = entries.slice().sort((x, y) => {
      const cx = isEntCurrent(x) ? 1 : 0;
      const cy = isEntCurrent(y) ? 1 : 0;
      if (cy !== cx) return cy - cx;
      const tx = String((x.archive && x.archive.title) || '').toLowerCase();
      const ty = String((y.archive && y.archive.title) || '').toLowerCase();
      return tx < ty ? -1 : tx > ty ? 1 : 0;
    });
    const shown = ranked.slice(0, limit);
    const chunks = [];
    if (total > limit) {
      chunks.push(
        '<div class="legacy-note" style="margin:0 0 8px">共 ' +
          total +
          ' 本，先显示前 ' +
          limit +
          ' 本（当前页相关置顶，其余按标题）。</div>'
      );
    }
    for (const ent of shown) {
      const a = ent.archive;
      const title =
        (ent.work && ent.work.title_raw) ||
        (ent.edition && ent.edition.title_raw) ||
        a.title ||
        a.arcid;
      const lrrUrl = typeof buildLrrReaderUrl === 'function' ? buildLrrReaderUrl(a.arcid) : '';
      let galleryUrl = '';
      if (ent.edition && ent.edition.gid && ent.edition.token) {
        galleryUrl = ent.edition.url || buildGalleryUrl(location.origin, ent.edition.gid, ent.edition.token);
      } else if (ent.source && ent.source.gid && ent.source.token) {
        galleryUrl = buildGalleryUrl(location.origin, ent.source.gid, ent.source.token);
      }
      const onPage = isEntCurrent(ent);
      const metaBits = [];
      if (onPage) metaBits.push('当前页');
      if (a.pages) metaBits.push(a.pages + 'p');
      if (a.eh_gid) metaBits.push('gid ' + a.eh_gid);
      if (ent.link) metaBits.push(ent.link.same_version ? '已确认同源' : '已绑定');
      else if (ent.edition) metaBits.push('ehgid 命中');
      else metaBits.push('仅档案');

      const mono = compactText(title).charAt(0) || '本';
      const actions =
        (lrrUrl
          ? '<a class="jlc-wb-btn primary" href="' +
            escapeHtml(lrrUrl) +
            '" target="_blank" rel="noopener">开 LRR</a>'
          : '') +
        (galleryUrl
          ? '<a class="jlc-wb-btn ghost" href="' +
            escapeHtml(galleryUrl) +
            '" target="_blank" rel="noopener">画廊</a>'
          : '') +
        (ent.work && ent.work.work_id
          ? '<button type="button" class="jlc-wb-btn ghost" data-wact="best">最佳版</button>'
          : '');

      chunks.push(
        '<div class="jlc-wb-item' +
          (onPage ? ' is-current is-lrr-page' : '') +
          '" data-arcid="' +
          escapeHtml(a.arcid) +
          '"' +
          (ent.work && ent.work.work_id ? ' data-work="' + escapeHtml(ent.work.work_id) + '"' : '') +
          '>' +
          '<div class="jlc-wb-item-row">' +
          '<div class="jlc-wb-cover is-poster" data-lrr-cover="' +
          escapeHtml(a.arcid) +
          '" data-group="tag">' +
          '<span class="jlc-wb-cover-fallback">' +
          escapeHtml(mono) +
          '</span></div>' +
          '<div class="jlc-wb-item-body">' +
          '<div class="jlc-wb-item-title">' +
          (onPage ? '<span class="exc-ed-cur-tag">当前</span> ' : '') +
          escapeHtml(title) +
          '</div>' +
          (metaBits.length
            ? '<div class="jlc-wb-item-meta"><div class="jlc-wb-item-meta-line">' +
              escapeHtml(metaBits.join(' · ')) +
              '</div></div>'
            : '') +
          (actions ? '<div class="jlc-wb-item-actions">' + actions + '</div>' : '') +
          '</div></div></div>'
      );
    }
    host.innerHTML = chunks.join('');
    if (typeof hydrateLrrThumbnailsIn === 'function') {
      try {
        hydrateLrrThumbnailsIn(host);
      } catch (_) { /* ignore */ }
    }
    host.onclick = async (e) => {
      const btn = e.target.closest('[data-wact]');
      if (!btn) return;
      const workId = btn.closest('[data-work]')?.getAttribute('data-work');
      if (!workId) return;
      if (btn.getAttribute('data-wact') === 'best') await openBestEdition(workId);
    };
  }

  function renderSettingsSections(tab) {
    const body = document.getElementById('exc-settings-body');
    if (!body) return;
    const st = getLrrStatus();

    // 兼容旧 tab id
    if (tab === 'lrr') tab = 'sync';
    if (tab === 'block') tab = 'tags';

    if (tab === 'sync') {
      const intervalMin = Math.max(5, Number(config.lrr_sync_interval_min) || 60);
      const sync = ensureCreamuSync();
      const syncStatus = sync ? sync.statusText() : '同步模块未加载';
      const conf = config.webdav_conflict || 'ask';
      const pwdSaved = !!(config.webdav_password || '');
      body.innerHTML =
        '<section class="jlc-wb-settings-section is-active">' +
        '<h3>一键同步</h3>' +
        '<div class="legacy-note">工作台底部「同步」= WebDAV + LRR（已配置的项）。本页可单独配置与触发。</div>' +
        '<button type="button" class="jlc-wb-btn primary" id="exc-cfg-sync-both" style="width:100%;margin-top:8px;">同步 WebDAV + LRR</button>' +
        '<h3 style="margin-top:18px">WebDAV</h3>' +
        '<div class="legacy-note">坚果云 / Nextcloud 等。读写 {路径}/exh.vault.json。请用应用密码。</div>' +
        '<label>地址</label><input id="exc-cfg-wd-url" type="text" value="' +
        escapeHtml(config.webdav_url || '') +
        '" placeholder="https://dav.jianguoyun.com/dav/">' +
        '<label>用户名</label><input id="exc-cfg-wd-user" type="text" value="' +
        escapeHtml(config.webdav_user || '') +
        '" autocomplete="username">' +
        '<label>应用密码</label><input id="exc-cfg-wd-pass" type="password" value="" placeholder="' +
        (pwdSaved ? '已保存（留空不修改）' : '应用密码') +
        '" autocomplete="new-password">' +
        '<label>远端路径</label><input id="exc-cfg-wd-path" type="text" value="' +
        escapeHtml(config.webdav_path || '/Creamu') +
        '">' +
        '<div class="legacy-row legacy-toggle"><span>启用 WebDAV</span><input type="checkbox" id="exc-cfg-wd-en" ' +
        (config.webdav_enabled ? 'checked' : '') +
        '></div>' +
        '<div class="legacy-row legacy-toggle"><span>打开页面时自动同步 WebDAV</span><input type="checkbox" id="exc-cfg-wd-auto" ' +
        (config.webdav_auto !== false ? 'checked' : '') +
        '></div>' +
        '<label>冲突策略</label><select id="exc-cfg-wd-conflict" class="jlc-wb-select" style="width:100%;margin-top:6px;">' +
        '<option value="ask"' +
        (conf === 'ask' ? ' selected' : '') +
        '>询问</option>' +
        '<option value="remote"' +
        (conf === 'remote' ? ' selected' : '') +
        '>云端优先</option>' +
        '<option value="local"' +
        (conf === 'local' ? ' selected' : '') +
        '>本机优先</option>' +
        '</select>' +
        '<div class="legacy-note" id="exc-wd-status" style="margin-top:8px;">' +
        escapeHtml(syncStatus) +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-wd-test" style="flex:1">测试连接</button>' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-wd-sync" style="flex:1">仅同步 WebDAV</button>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-wd-push" style="flex:1">强制推送</button>' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-wd-pull" style="flex:1">强制拉取</button>' +
        '</div>' +
        '<h3 style="margin-top:18px">LANraragi</h3>' +
        '<div class="legacy-note">' +
        (st.configured
          ? st.last_error
            ? '错误: ' + escapeHtml(st.last_error)
            : '已配置' +
              (st.last_sync
                ? ' · 上次 ' +
                  new Date(st.last_sync).toLocaleString() +
                  (st.last_count ? ' · ' + st.last_count + ' 条' : '')
                : ' · 尚未同步')
          : '未配置 Base URL / API Key') +
        ' · 自动间隔 ' +
        intervalMin +
        ' 分钟</div>' +
        '<label>Base URL</label><input id="exc-cfg-lrr-url" type="text" value="' +
        escapeHtml(config.lrr_base_url || '') +
        '">' +
        '<label>API Key</label><input id="exc-cfg-lrr-key" type="password" value="' +
        escapeHtml(config.lrr_api_key || '') +
        '">' +
        '<label>自动同步间隔（分钟，≥5）</label><input id="exc-cfg-lrr-interval" type="number" min="5" step="5" value="' +
        escapeHtml(String(intervalMin)) +
        '">' +
        '<div class="legacy-row legacy-toggle"><span>结构指纹自动链接</span><input type="checkbox" id="exc-cfg-struct" ' +
        (config.auto_link_structural ? 'checked' : '') +
        '></div>' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-cfg-lrr-sync-now" style="width:100%;margin-top:10px;">仅同步 LRR</button>' +
        settingsSaveFooter() +
        '</section>';
      bindSyncSettingsHandlers(body);
    } else if (tab === 'pref') {
      const foldMode = ['preference', 'newest', 'list_order'].includes(config.fold_primary_mode)
        ? config.fold_primary_mode
        : 'preference';
      body.innerHTML =
        '<section class="jlc-wb-settings-section is-active">' +
        '<h3>版本偏好</h3>' +
        '<label>语言序</label><input id="exc-cfg-lang" type="text" value="' +
        escapeHtml((config.lang_order || []).join(', ')) +
        '">' +
        '<label>码级序</label><input id="exc-cfg-censor" type="text" value="' +
        escapeHtml((config.censor_order || []).join(', ')) +
        '">' +
        '<label>汉化组白名单</label><input id="exc-cfg-gwhite" type="text" value="' +
        escapeHtml((config.group_whitelist || []).join(', ')) +
        '">' +
        '<label>汉化组黑名单</label><input id="exc-cfg-gblack" type="text" value="' +
        escapeHtml((config.group_blacklist || []).join(', ')) +
        '">' +
        '<div class="legacy-row legacy-toggle"><span>列表折叠同 Work</span><input type="checkbox" id="exc-cfg-fold" ' +
        (config.list_fold_works ? 'checked' : '') +
        '></div>' +
        '<div class="legacy-row legacy-toggle"><span>列表打开画廊用新标签页</span><input type="checkbox" id="exc-cfg-list-newtab" ' +
        (config.list_open_in_new_tab ? 'checked' : '') +
        '></div>' +
        '<div class="legacy-note" style="margin:0 0 8px">开启后，列表点作品默认 target=_blank（站点本身是本页打开）。</div>' +
        '<div class="legacy-row legacy-toggle"><span>列表显示重点标签流</span><input type="checkbox" id="exc-cfg-tag-stream" ' +
        (config.list_show_tag_stream !== false ? 'checked' : '') +
        '></div>' +
        '<label>标签流最多条数</label><input id="exc-cfg-tag-stream-max" type="number" min="1" max="8" step="1" value="' +
        escapeHtml(String(Math.max(1, Math.min(8, Number(config.list_tag_stream_max) || 4)))) +
        '">' +
        '<div class="legacy-note" style="margin:0 0 8px">标签流只补标题/熟人看不出的信息：无码·全彩·内容(mother…)·角色。画师/组仅熟人徽章；在库用绿框+徽章，不进标签流。</div>' +
        '<label>折叠时主显示版本</label>' +
        '<select id="exc-cfg-fold-mode" class="jlc-wb-select" style="width:100%;margin-top:6px;">' +
        '<option value="preference"' +
        (foldMode === 'preference' ? ' selected' : '') +
        '>偏好最佳（语言→码级→体积→汉化组→页数）</option>' +
        '<option value="newest"' +
        (foldMode === 'newest' ? ' selected' : '') +
        '>最新上传</option>' +
        '<option value="list_order"' +
        (foldMode === 'list_order' ? ' selected' : '') +
        '>列表原序（页面里更靠前）</option>' +
        '</select>' +
        '<div class="legacy-note" style="margin-top:8px">「偏好最佳」与打开最佳版一致；「最新」看 posted；「列表原序」保留站点排序。</div>' +
        '<div class="legacy-row legacy-toggle"><span>自动聚类</span><input type="checkbox" id="exc-cfg-auto-cluster" ' +
        (config.auto_cluster ? 'checked' : '') +
        '></div>' +
        '<h3 style="margin-top:16px">库内对照容差</h3>' +
        '<div class="legacy-note">页数/体积容差：超容差只标打包差异，不判更优。</div>' +
        '<label>页数容差比例（%）</label><input id="exc-cfg-page-tol-pct" type="number" min="0" max="100" step="1" value="' +
        escapeHtml(String(Math.round((Number(config.pages_tolerance_ratio) || 0.1) * 100))) +
        '">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">' +
        '<div style="flex:1;min-width:100px"><label>页数容差最小</label><input id="exc-cfg-page-tol-min" type="number" min="0" step="1" value="' +
        escapeHtml(String(Number(config.pages_tolerance_min) || 1)) +
        '"></div>' +
        '<div style="flex:1;min-width:100px"><label>页数容差最大</label><input id="exc-cfg-page-tol-max" type="number" min="1" step="1" value="' +
        escapeHtml(String(Number(config.pages_tolerance_max) || 25)) +
        '"></div></div>' +
        '<label style="margin-top:8px">体积容差比例（%）</label><input id="exc-cfg-size-tol-pct" type="number" min="0" max="100" step="1" value="' +
        escapeHtml(String(Math.round((Number(config.size_tolerance_ratio) || 0.12) * 100))) +
        '">' +
        '<label>体积容差最小（MB）</label><input id="exc-cfg-size-tol-mb" type="number" min="0" step="0.5" value="' +
        escapeHtml(String(Math.round(((Number(config.size_tolerance_min_bytes) || 1048576) / (1024 * 1024)) * 10) / 10)) +
        '">' +
        '<label>页均体积容差（%）</label><input id="exc-cfg-bpp-tol-pct" type="number" min="0" max="100" step="1" value="' +
        escapeHtml(String(Math.round((Number(config.bpp_tolerance_ratio) || 0.2) * 100))) +
        '">' +
        settingsSaveFooter() +
        '</section>';
    } else if (tab === 'tags') {
      const radar = typeof getFamiliarRadar === 'function' ? getFamiliarRadar() : { artistList: [], groupList: [] };
      const lrrArtists = (loadLrrMeta().familiar_artists || []).length;
      const lrrGroups = (loadLrrMeta().familiar_groups || []).length;
      body.innerHTML =
        '<section class="jlc-wb-settings-section is-active">' +
        '<h3>心动标签</h3>' +
        '<div class="legacy-note">逗号分隔。中英文都可：「母」「mother」「巨乳」等会扩别名。极简列表若无标签，需标题里出现关键词，或先点开过该本（会缓存标签）。命中后橙框 + ♥。</div>' +
        '<textarea id="exc-cfg-fav-tags" rows="3" style="width:100%;margin-top:6px;border-radius:12px;border:1px solid #e4d4bc;padding:10px;background:#fff;color:#4a3728" placeholder="母, mother, 巨乳, pantyhose">' +
        escapeHtml((config.fav_tags || []).join(', ')) +
        '</textarea>' +
        '<h3 style="margin-top:16px">过滤 / 屏蔽</h3>' +
        '<label>屏蔽标签</label><textarea id="exc-cfg-hate-tags" rows="2" style="width:100%;margin-top:6px;border-radius:12px;border:1px solid #e4d4bc;padding:10px;background:#fff;color:#4a3728">' +
        escapeHtml((config.hate_tags || []).join(', ')) +
        '</textarea>' +
        '<label>标题屏蔽词</label><input id="exc-cfg-title-kw" type="text" value="' +
        escapeHtml((config.block_title_keywords || []).join(', ')) +
        '">' +
        '<div class="legacy-row legacy-toggle"><span>隐藏已屏蔽条目</span><input type="checkbox" id="exc-cfg-hide-block" ' +
        (config.hide_blocked ? 'checked' : '') +
        '></div>' +
        '<h3 style="margin-top:16px">熟人（画师 / 团队）</h3>' +
        '<div class="stat-box" style="margin-bottom:10px">' +
        '<div class="stat-item"><b>' +
        (radar.artistList || []).length +
        '</b><span>画师</span></div>' +
        '<div class="stat-item"><b>' +
        (radar.groupList || []).length +
        '</b><span>团队</span></div>' +
        '<div class="stat-item"><b>' +
        lrrArtists +
        '/' +
        lrrGroups +
        '</b><span>LRR汇总</span></div>' +
        '</div>' +
        '<div class="legacy-note">同步 LRR / 点「刷新熟人」只汇总档案里带 <b>artist:</b> / <b>group:</b> 的标签。名单里没有的名字（如 emori uki）不会点亮——请确认 LRR 该本有 artist 标签，或手动加到手动画师。画师与团队已去重（同名优先算画师）。</div>' +
        '<label>手动画师（补 LRR 没打上的）</label><textarea id="exc-cfg-custom-artists" rows="2" style="width:100%;margin-top:6px;border-radius:12px;border:1px solid #e4d4bc;padding:10px;background:#fff;color:#4a3728" placeholder="emori uki, other artist">' +
        escapeHtml((config.custom_artists || []).join(', ')) +
        '</textarea>' +
        '<label>手动团队/汉化组</label><textarea id="exc-cfg-custom-groups" rows="2" style="width:100%;margin-top:6px;border-radius:12px;border:1px solid #e4d4bc;padding:10px;background:#fff;color:#4a3728" placeholder="group name">' +
        escapeHtml((config.custom_groups || []).join(', ')) +
        '</textarea>' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-cfg-rebuild-familiar" style="width:100%;margin-top:10px;">从本地 LRR 库刷新熟人</button>' +
        '<div id="exc-fam-preview" class="legacy-note" style="margin-top:8px;max-height:140px;overflow:auto">' +
        '<div style="margin-bottom:4px"><b>画师 ' +
        (radar.artistList || []).length +
        '</b> · <b>团队 ' +
        (radar.groupList || []).length +
        '</b> · LRR汇总 ' +
        lrrArtists +
        '/' +
        lrrGroups +
        '</div>' +
        (radar.artistList && radar.artistList.length
          ? '<b>画师</b> ' + escapeHtml(radar.artistList.slice(0, 40).join(' · ')) +
            (radar.artistList.length > 40 ? ' …' : '')
          : '暂无画师') +
        '<br>' +
        (radar.groupList && radar.groupList.length
          ? '<b>团队</b> ' + escapeHtml(radar.groupList.slice(0, 40).join(' · ')) +
            (radar.groupList.length > 40 ? ' …' : '')
          : '暂无团队') +
        '</div>' +
        settingsSaveFooter() +
        '</section>';
      const rebuildBtn = body.querySelector('#exc-cfg-rebuild-familiar');
      if (rebuildBtn) {
        rebuildBtn.onclick = async () => {
          if (typeof rebuildFamiliarFromLrrArchives !== 'function') {
            showToast('熟人模块未加载');
            return;
          }
          showToast('正在汇总…');
          try {
            const fam = await rebuildFamiliarFromLrrArchives();
            saveLrrMeta(
              Object.assign({}, loadLrrMeta(), {
                familiar_artists: fam.artists,
                familiar_groups: fam.groups,
              })
            );
            showToast('熟人 · 画师 ' + fam.artists.length + ' · 团队 ' + fam.groups.length);
            renderSettingsSections('tags');
            if (window.__excRefreshPage) window.__excRefreshPage();
          } catch (e) {
            showToast('刷新失败: ' + ((e && e.message) || e));
          }
        };
      }
    } else if (tab === 'data') {
      body.innerHTML =
        '<section class="jlc-wb-settings-section is-active">' +
        '<h3>备份</h3>' +
        '<div class="legacy-note" style="margin-bottom:10px;">导出/导入本机追更、配置、作品状态等。WebDAV 请到「同步」页。</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-export" style="flex:1">导出到剪贴板</button>' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-import" style="flex:1">从 JSON 导入</button>' +
        '</div>' +
        '</section>';
      const exp = body.querySelector('#exc-export');
      if (exp) {
        exp.onclick = async () => {
          const data = await exportBackup();
          if (typeof GM_setClipboard === 'function') {
            GM_setClipboard(JSON.stringify(data, null, 2));
            showToast('已复制备份 JSON');
          } else showToast('当前环境无法写剪贴板');
        };
      }
      const imp = body.querySelector('#exc-import');
      if (imp) {
        imp.onclick = async () => {
          const textIn = prompt('粘贴备份 JSON');
          if (!textIn) return;
          try {
            await importBackup(JSON.parse(textIn));
            showToast('导入完成');
            renderWorkbench();
          } catch (e) {
            showToast('导入失败');
          }
        };
      }
    } else if (tab === 'ui') {
      body.innerHTML =
        '<section class="jlc-wb-settings-section is-active">' +
        '<h3>外观</h3>' +
        '<div class="legacy-row legacy-toggle"><span>站点奶油主题</span><input type="checkbox" id="exc-cfg-cream-site" ' +
        (config.cream_site_theme ? 'checked' : '') +
        '></div>' +
        '<div class="legacy-note">e/exhentai 页面奶油底色。可随时关。</div>' +
        '<label style="margin-top:12px">详情页缩略图倍率</label>' +
        '<select id="exc-cfg-gdt-scale" class="jlc-wb-select" style="width:100%;margin-top:6px;">' +
        [1, 1.25, 1.5, 1.75, 2]
          .map((s) => {
            const cur = clampGalleryThumbScale(config.gallery_thumb_scale);
            const sel = Math.abs(cur - s) < 0.01 ? ' selected' : '';
            const lab =
              s === 1 ? '1.0× 原样' : s === 1.5 ? '1.5× 默认' : s + '×';
            return '<option value="' + s + '"' + sel + '>' + lab + '</option>';
          })
          .join('') +
        '</select>' +
        '<h3 style="margin-top:16px">列表悬停预览</h3>' +
        '<div class="legacy-row legacy-toggle"><span>悬停显示前几张</span><input type="checkbox" id="exc-cfg-hover-preview" ' +
        (config.list_hover_preview !== false ? 'checked' : '') +
        '></div>' +
        '<label>预览张数</label><select id="exc-cfg-hover-count" class="jlc-wb-select" style="width:100%;margin-top:6px;">' +
        [3, 4, 5, 6, 8]
          .map((n) => {
            const cur = clampHoverPreviewCount(config.list_hover_preview_count);
            return (
              '<option value="' +
              n +
              '"' +
              (cur === n ? ' selected' : '') +
              '>' +
              n +
              ' 张</option>'
            );
          })
          .join('') +
        '</select>' +
        '<label>悬停延迟</label><select id="exc-cfg-hover-delay" class="jlc-wb-select" style="width:100%;margin-top:6px;">' +
        [500, 1000, 2000, 3000, 4000, 5000]
          .map((n) => {
            const cur = clampHoverPreviewDelay(config.list_hover_preview_delay_ms);
            const closest = [500, 1000, 2000, 3000, 4000, 5000].reduce((a, b) =>
              Math.abs(b - cur) < Math.abs(a - cur) ? b : a
            );
            const sec = n >= 1000 ? n / 1000 + ' 秒' : n + ' ms';
            return (
              '<option value="' +
              n +
              '"' +
              (closest === n ? ' selected' : '') +
              '>' +
              sec +
              '</option>'
            );
          })
          .join('') +
        '</select>' +
        '<h3 style="margin-top:16px">追更检查更新</h3>' +
        '<div class="legacy-note">默认只请求每条追更的<strong>首页</strong>（与改跨页扫描前一样快）。断点不在首页时用断点页码估算未读（显示 +N+）。开启「跨页精确未读」才会向后翻页计数，会明显变慢。</div>' +
        '<div class="legacy-row legacy-toggle" style="margin-top:8px"><span>跨页精确未读（较慢）</span><input type="checkbox" id="exc-cfg-deep-scan" ' +
        (config.tracking_unread_deep_scan === true ? 'checked' : '') +
        '></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">' +
        '<div style="flex:1;min-width:100px"><label>条目间隔最小（秒）</label><input id="exc-cfg-chk-lo" type="number" min="2" max="60" step="1" value="' +
        escapeHtml(String(Math.round((Number(config.tracking_check_interval_min_ms) || 5000) / 1000))) +
        '"></div>' +
        '<div style="flex:1;min-width:100px"><label>条目间隔最大（秒）</label><input id="exc-cfg-chk-hi" type="number" min="2" max="120" step="1" value="' +
        escapeHtml(String(Math.round((Number(config.tracking_check_interval_max_ms) || 10000) / 1000))) +
        '"></div>' +
        '<div style="flex:1;min-width:100px"><label>精确扫描最多页数</label><input id="exc-cfg-scan-pages" type="number" min="1" max="40" step="1" value="' +
        escapeHtml(String(Math.max(1, Math.min(40, Number(config.tracking_unread_scan_max_pages) || 12)))) +
        '"></div></div>' +
        settingsSaveFooter() +
        '</section>';
      const creamToggle = body.querySelector('#exc-cfg-cream-site');
      if (creamToggle) {
        creamToggle.addEventListener('change', () => {
          config.cream_site_theme = !!creamToggle.checked;
          applyCreamSiteTheme();
        });
      }
      const gdtScaleSel = body.querySelector('#exc-cfg-gdt-scale');
      if (gdtScaleSel) {
        gdtScaleSel.addEventListener('change', () => {
          config.gallery_thumb_scale = clampGalleryThumbScale(gdtScaleSel.value);
          applyGalleryThumbScale();
        });
      }
      const hoverPrev = body.querySelector('#exc-cfg-hover-preview');
      if (hoverPrev) {
        hoverPrev.addEventListener('change', () => {
          config.list_hover_preview = !!hoverPrev.checked;
          if (!config.list_hover_preview && typeof hideHoverPreview === 'function') {
            hideHoverPreview();
          }
        });
      }
    } else {
      body.innerHTML =
        '<section class="jlc-wb-settings-section is-active"><div class="legacy-note">未知设置页</div></section>';
    }

    const saveBtn = body.querySelector('#exc-cfg-save');
    if (saveBtn) {
      saveBtn.onclick = () => {
        const patch = {};
        const v = (id) => body.querySelector('#' + id)?.value || '';
        const c = (id) => !!body.querySelector('#' + id)?.checked;
        if (tab === 'sync') {
          patch.lrr_base_url = v('exc-cfg-lrr-url');
          patch.lrr_api_key = v('exc-cfg-lrr-key');
          patch.auto_link_structural = c('exc-cfg-struct');
          {
            const iv = parseInt(v('exc-cfg-lrr-interval'), 10);
            if (Number.isFinite(iv)) patch.lrr_sync_interval_min = Math.max(5, iv);
          }
          patch.webdav_url = v('exc-cfg-wd-url').trim();
          patch.webdav_user = v('exc-cfg-wd-user').trim();
          patch.webdav_path = v('exc-cfg-wd-path').trim() || '/Creamu';
          patch.webdav_enabled = c('exc-cfg-wd-en');
          patch.webdav_auto = c('exc-cfg-wd-auto');
          patch.webdav_conflict = body.querySelector('#exc-cfg-wd-conflict')?.value || 'ask';
          const typedPass = v('exc-cfg-wd-pass');
          if (typedPass) patch.webdav_password = typedPass;
        } else if (tab === 'tags') {
          if (body.querySelector('#exc-cfg-fav-tags')) {
            patch.fav_tags = splitCsvField(v('exc-cfg-fav-tags'));
          }
          patch.hate_tags = splitCsvField(v('exc-cfg-hate-tags'));
          patch.block_title_keywords = splitCsvField(v('exc-cfg-title-kw'));
          patch.hide_blocked = c('exc-cfg-hide-block');
          patch.custom_artists = splitCsvField(v('exc-cfg-custom-artists'));
          patch.custom_groups = splitCsvField(v('exc-cfg-custom-groups'));
        } else if (tab === 'pref') {
          const lang = splitCsvField(v('exc-cfg-lang'));
          const censor = splitCsvField(v('exc-cfg-censor'));
          if (lang.length) patch.lang_order = lang;
          if (censor.length) patch.censor_order = censor;
          patch.group_whitelist = splitCsvField(v('exc-cfg-gwhite'));
          patch.group_blacklist = splitCsvField(v('exc-cfg-gblack'));
          patch.list_fold_works = c('exc-cfg-fold');
          patch.list_open_in_new_tab = c('exc-cfg-list-newtab');
          patch.list_show_tag_stream = c('exc-cfg-tag-stream');
          {
            const tm = Number(body.querySelector('#exc-cfg-tag-stream-max')?.value);
            if (Number.isFinite(tm) && tm >= 1) {
              patch.list_tag_stream_max = Math.min(8, Math.max(1, Math.floor(tm)));
            }
          }
          {
            const fm = body.querySelector('#exc-cfg-fold-mode')?.value || 'preference';
            patch.fold_primary_mode = ['preference', 'newest', 'list_order'].includes(fm)
              ? fm
              : 'preference';
          }
          patch.auto_cluster = c('exc-cfg-auto-cluster');
          {
            const pagePct = Number(body.querySelector('#exc-cfg-page-tol-pct')?.value);
            if (Number.isFinite(pagePct) && pagePct >= 0) {
              patch.pages_tolerance_ratio = Math.min(1, pagePct / 100);
            }
            const pageMin = Number(body.querySelector('#exc-cfg-page-tol-min')?.value);
            if (Number.isFinite(pageMin) && pageMin >= 0) patch.pages_tolerance_min = Math.floor(pageMin);
            const pageMax = Number(body.querySelector('#exc-cfg-page-tol-max')?.value);
            if (Number.isFinite(pageMax) && pageMax >= 1) {
              patch.pages_tolerance_max = Math.max(patch.pages_tolerance_min || 1, Math.floor(pageMax));
            }
            const sizePct = Number(body.querySelector('#exc-cfg-size-tol-pct')?.value);
            if (Number.isFinite(sizePct) && sizePct >= 0) {
              patch.size_tolerance_ratio = Math.min(1, sizePct / 100);
            }
            const sizeMb = Number(body.querySelector('#exc-cfg-size-tol-mb')?.value);
            if (Number.isFinite(sizeMb) && sizeMb >= 0) {
              patch.size_tolerance_min_bytes = Math.round(sizeMb * 1024 * 1024);
            }
            const bppPct = Number(body.querySelector('#exc-cfg-bpp-tol-pct')?.value);
            if (Number.isFinite(bppPct) && bppPct >= 0) {
              patch.bpp_tolerance_ratio = Math.min(1, bppPct / 100);
            }
          }
        } else if (tab === 'ui') {
          patch.cream_site_theme = c('exc-cfg-cream-site');
          {
            const sc = Number(body.querySelector('#exc-cfg-gdt-scale')?.value);
            if (Number.isFinite(sc)) patch.gallery_thumb_scale = clampGalleryThumbScale(sc);
          }
          if (body.querySelector('#exc-cfg-hover-preview')) {
            patch.list_hover_preview = c('exc-cfg-hover-preview');
            const hc = Number(body.querySelector('#exc-cfg-hover-count')?.value);
            if (Number.isFinite(hc)) patch.list_hover_preview_count = clampHoverPreviewCount(hc);
            const hd = Number(body.querySelector('#exc-cfg-hover-delay')?.value);
            if (Number.isFinite(hd)) patch.list_hover_preview_delay_ms = clampHoverPreviewDelay(hd);
          }
          {
            const loSec = Number(body.querySelector('#exc-cfg-chk-lo')?.value);
            const hiSec = Number(body.querySelector('#exc-cfg-chk-hi')?.value);
            if (Number.isFinite(loSec) && loSec >= 2) {
              patch.tracking_check_interval_min_ms = Math.min(60000, Math.round(loSec * 1000));
            }
            if (Number.isFinite(hiSec) && hiSec >= 2) {
              patch.tracking_check_interval_max_ms = Math.min(120000, Math.round(hiSec * 1000));
            }
            if (
              patch.tracking_check_interval_min_ms &&
              patch.tracking_check_interval_max_ms &&
              patch.tracking_check_interval_max_ms < patch.tracking_check_interval_min_ms
            ) {
              patch.tracking_check_interval_max_ms = patch.tracking_check_interval_min_ms;
            }
            const scanP = Number(body.querySelector('#exc-cfg-scan-pages')?.value);
            if (Number.isFinite(scanP) && scanP >= 1) {
              patch.tracking_unread_scan_max_pages = Math.min(40, Math.max(1, Math.floor(scanP)));
            }
            if (body.querySelector('#exc-cfg-deep-scan')) {
              patch.tracking_unread_deep_scan = !!body.querySelector('#exc-cfg-deep-scan').checked;
            }
          }
        }
        // data 页无表单保存
        if (tab !== 'data') {
          saveConfig(patch);
          showToast('已保存');
          injectBaseStyles();
          applyCreamSiteTheme();
          applyGalleryThumbScale();
        }
      };
    }
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
    // 仅在列表真·首页回写 top；next=/深页不污染「最新」
    const ctx = parseExhPageContext(location.href);
    if (ctx && ctx.trackable) {
      const pageState =
        typeof getListPageState === 'function'
          ? getListPageState(location.href, document)
          : { index: 0, known: true, isFirst: true };
      const pageIdx = pageState.known && pageState.index >= 0 ? pageState.index : -1;
      const isFirst =
        pageState.isFirst === true ||
        ctx.page_is_first === true;
      const finder =
        typeof findTrackingForContext === 'function'
          ? findTrackingForContext(ctx)
          : getTrackingBySignature(ctx.query_signature);
      finder.then((rec) => {
        if (!rec) return;
        rec.last_browsed_at = nowMs();
        rec.last_page = pageIdx;
        if (rec.open_url && typeof canonicalizeTrackingOpenUrl === 'function') {
          const canon = canonicalizeTrackingOpenUrl(rec.open_url);
          if (rec.open_url !== canon) {
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
        saveTrackingRecord(rec).then(() => updateFabBadge());
      });
    }
    updateFabBadge();
  }
