// @@creamu-part:workbench

    function ensureCreamuSync() {
        if (window.__creamuWdJlc) return window.__creamuWdJlc;
        if (typeof createCreamuWebDavSync !== 'function') return null;
        window.__creamuWdJlc = createCreamuWebDavSync({
            product: 'jlc',
            notify: (msg) => {
                if (typeof showAlert === 'function') showAlert(msg);
                else if (typeof showToast === 'function') showToast(msg);
            },
            exportPayload: () => buildBackupPayload(),
            importPayload: async (payload) => {
                await applyBackupPayload(payload, 'full');
                syncWorkbenchSettingsForm();
                await renderWorkbenchTrackingList().catch(() => {});
            },
            getSettings: () => ({
                enabled: !!config.webdav_enabled,
                url: config.webdav_url || '',
                user: config.webdav_user || '',
                password: config.webdav_password || '',
                path: config.webdav_path || '/Creamu',
                auto: !!config.webdav_auto,
                conflict: config.webdav_conflict || 'ask'
            })
        });
        return window.__creamuWdJlc;
    }

    function clampUiBtnScale(value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return 100;
        return Math.min(110, Math.max(70, Math.round(n / 5) * 5));
    }

    /** 仅缩放工作台/FAB/页栏等按钮尺寸，列表内容不受影响 */
    function applyUiBtnScale(value) {
        const pct = clampUiBtnScale(value != null ? value : (typeof Status !== 'undefined' ? Status.get('uiBtnScale') : 100));
        const scale = String(pct / 100);
        try {
            document.documentElement.style.setProperty('--jlc-btn-scale', scale);
        } catch (_) { /* ignore */ }
        const shell = document.getElementById('jlc-wb');
        if (shell) shell.style.setProperty('--jlc-btn-scale', scale);
        const fab = document.getElementById('jlc-wb-fab');
        if (fab) {
            fab.style.setProperty('--jlc-btn-scale', scale);
            applyWorkbenchFabPosition(fab);
        }
        return pct;
    }

    function getJlcWorkbenchCss() {
        return `
        :where(#jlc-wb, #jlc-wb-fab, #jlc-wb-dialog, #jlc-tracking-pagebar) {
            --creamu-wb-bg: var(--jlc-bg);
            --creamu-wb-surface: var(--jlc-surface);
            --creamu-wb-surface-soft: var(--jlc-bg);
            --creamu-wb-surface-muted: var(--jlc-soft);
            --creamu-wb-surface-raised: var(--jlc-surface);
            --creamu-wb-text: var(--jlc-text);
            --creamu-wb-text-strong: var(--jlc-text);
            --creamu-wb-title: var(--jlc-text);
            --creamu-wb-text-muted: var(--jlc-muted);
            --creamu-wb-text-subtle: var(--jlc-muted);
            --creamu-wb-border: var(--jlc-line);
            --creamu-wb-border-strong: #c6b7a8;
            --creamu-wb-card-border: var(--jlc-line);
            --creamu-wb-card-hover-border: #c6b7a8;
            --creamu-wb-secondary-ink: var(--jlc-muted);
            --creamu-wb-inset-surface: var(--jlc-soft);
            --creamu-wb-divider: var(--jlc-line);
            --creamu-wb-accent: var(--jlc-accent);
            --creamu-wb-accent-light: var(--jlc-accent);
            --creamu-wb-accent-dark: var(--jlc-accent);
            --creamu-wb-accent-hover: #784326;
            --creamu-wb-accent-ring: #ddc0a6;
            --creamu-wb-on-accent: #fff;
            --creamu-wb-control-radius: 8px;
            --creamu-wb-panel-radius: 16px;
            --creamu-wb-card-radius: 10px;
            --creamu-wb-control-elevation: none;
            --creamu-wb-card-elevation: none;
            --creamu-wb-card-hover-elevation: 0 3px 12px #34261a0a;
            --creamu-wb-focus-elevation: 0 0 0 2px #ddc0a6;
            --creamu-wb-focus-surface: #fcf6ef;
            font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
            color-scheme: light;
        }
        #jlc-wb-fab {
            width: auto; min-width: 112px; height: 44px; padding: 0 14px 0 9px; gap: 9px;
            border: 1px solid var(--jlc-line) !important; border-radius: 12px;
            background: var(--jlc-surface) !important; color: var(--jlc-text) !important;
            box-shadow: 0 4px 20px #34261a18 !important; font-size: 13px; font-weight: 600;
            bottom: max(20px, env(safe-area-inset-bottom)); right: 20px;
        }
        #jlc-wb-fab:active, #jlc-wb-fab.is-dragging { transform: none; }
        .jlc-brand-mark {
            display: inline-grid; place-items: center; flex-shrink: 0;
            width: 30px; height: 30px; border-radius: 9px 9px 9px 3px;
            background: var(--jlc-accent); color: white; font: bold 23px/1 Georgia, serif;
        }
        #jlc-wb-fab .jlc-wb-fab-badge {
            top: -6px; right: -6px; min-width: 19px; height: 19px;
            background: var(--jlc-accent); border: 2px solid var(--jlc-surface);
            font-size: 10px; box-shadow: none;
        }
        #jlc-wb-fab.is-panel-open { visibility: hidden; pointer-events: none; }
        #jlc-wb {
            min-width: 0; background: var(--jlc-bg); color: var(--jlc-text);
            box-shadow: 0 18px 60px #34261a26, 0 2px 8px #34261a0d;
            font-size: 14px; text-align: left;
        }
        #jlc-wb button, #jlc-wb input, #jlc-wb select, #jlc-wb textarea { font-family: inherit; }
        #jlc-wb :is(button, input, select, textarea):focus-visible,
        #jlc-wb-fab:focus-visible, #jlc-wb-dialog :focus-visible {
            outline: 2px solid var(--jlc-accent); outline-offset: 3px;
        }
        #jlc-wb input::placeholder, #jlc-wb textarea::placeholder { color: var(--jlc-muted); opacity: 1; }
        #jlc-wb .jlc-wb-header { padding: 20px 20px 16px; gap: 12px; background: var(--jlc-surface); }
        #jlc-wb .jlc-wb-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
        #jlc-wb .jlc-wb-title { font-size: 18px; line-height: 1.3; font-weight: 600; letter-spacing: 0; }
        #jlc-wb .jlc-wb-subtitle { font-size: 11px; letter-spacing: .6px; margin-top: 5px; }
        #jlc-wb .jlc-wb-header-actions { flex-wrap: nowrap; gap: 6px; }
        #jlc-wb .jlc-wb-icon-btn { width: 36px; height: 36px; border-radius: 8px; }
        #jlc-wb .jlc-wb-header-actions .jlc-wb-btn { padding: 8px 10px; }
        #jlc-wb.is-docked {
            top: 0 !important; bottom: 0 !important; right: 0 !important; left: auto !important;
            width: var(--jlc-dock-width) !important; height: 100dvh !important;
            border-radius: 0; border-top: 0; border-bottom: 0; border-right: 0;
            box-shadow: -8px 0 28px #34261a08;
        }
        #jlc-wb.is-docked .jlc-wb-header { cursor: default; }
        #jlc-wb.is-docked .jlc-wb-resize-w, #jlc-wb.is-docked .jlc-wb-resize-h, #jlc-wb.is-docked .jlc-wb-resize-corner { display: none; }
        #jlc-wb.is-docked .jlc-wb-filter-row { grid-template-columns: 1fr 1fr; }
        #jlc-wb .jlc-wb-open-btn {
            background: var(--jlc-soft); color: var(--jlc-accent); border: 1px solid var(--jlc-line);
        }
        #jlc-wb .jlc-wb-nav {
            padding: 0 20px; gap: 24px; background: var(--jlc-surface);
            border-bottom: 1px solid var(--jlc-line);
        }
        #jlc-wb .jlc-wb-nav button {
            flex: 0 1 auto; padding: 12px 2px; border-radius: 0; font-size: 14px;
            background: transparent; color: var(--jlc-muted); border-bottom: 2px solid transparent;
        }
        #jlc-wb .jlc-wb-nav button.active {
            background: transparent; color: var(--jlc-accent); border-bottom-color: var(--jlc-accent); box-shadow: none;
        }
        #jlc-wb .jlc-wb-tracking-actions {
            flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between;
            flex-direction: row; flex-wrap: wrap; gap: 8px; padding: 16px 16px 12px;
        }
        #jlc-wb .jlc-wb-tracking-actions > div { display: flex; gap: 6px; }
        #jlc-wb .jlc-wb-footer-summary { max-width: none; font-size: 12px; }
        #jlc-wb .jlc-wb-tracking-actions .jlc-wb-btn { padding: 8px 10px; font-size: 12px; }
        #jlc-wb .jlc-wb-toolbar { padding: 0 16px 14px; gap: 10px; border-bottom: 1px solid var(--jlc-line); }
        #jlc-wb .jlc-wb-toolbar-row { gap: 6px; }
        #jlc-wb .jlc-wb-filter-row { display: grid; grid-template-columns: auto auto 1fr 1fr; }
        #jlc-wb .jlc-wb-search { padding: 10px 12px; border-radius: 8px; font-size: 13px; }
        #jlc-wb .jlc-wb-chip, #jlc-wb select.jlc-wb-select { padding: 8px; font-size: 12px; min-width: 0; }
        #jlc-wb .jlc-wb-chip.is-on {
            background: #f1e4d6; border-color: #d7bfa7; color: #784326;
        }
        #jlc-wb .jlc-wb-list-scroll { padding: 4px 16px 32px; }
        #jlc-wb .jlc-wb-group { margin-bottom: 12px; }
        #jlc-wb .jlc-wb-group-toggle { font-size: 12px; padding: 12px 0 8px; }
        #jlc-wb .jlc-wb-group-body { gap: 8px; }
        #jlc-wb .jlc-wb-item-title { font-weight: 600; font-size: 14px; }
        #jlc-wb .jlc-wb-open-btn {
            min-width: 52px; padding: 8px 10px; border-radius: 7px; font-weight: 600;
        }
        #jlc-wb .jlc-wb-more-btn { width: 36px; height: 28px; }
        #jlc-wb .jlc-site-pill.is-last { background: transparent; border-color: transparent; color: var(--jlc-muted); font-weight: 400; }
        #jlc-wb .jlc-wb-settings-panel { width: 100%; border-left: 0; background: var(--jlc-bg); }
        #jlc-wb .jlc-wb-settings-head { padding: 18px 20px; background: var(--jlc-surface); }
        #jlc-wb .jlc-wb-settings-nav { background: var(--jlc-surface); gap: 8px; }
        #jlc-wb .jlc-wb-settings-nav button { flex: 1; padding: 9px 6px; border-radius: 8px; }
        #jlc-wb .jlc-wb-settings-footer { flex-direction: row; background: var(--jlc-surface); }
        #jlc-wb .jlc-wb-settings-footer .jlc-wb-btn { width: auto; flex: 1; }
        #jlc-wb .legacy-row.legacy-toggle {
            border: 0; border-bottom: 1px solid var(--jlc-line); border-radius: 0;
            background: transparent; padding: 12px 0; margin: 0; letter-spacing: 0;
            display: flex; cursor: pointer;
        }
        #jlc-wb .jlc-wb-settings h3 { font-size: 14px; color: var(--jlc-text); letter-spacing: 0; }
        #jlc-wb .jlc-wb-empty { margin-top: 12px; border-color: var(--jlc-line); background: var(--jlc-surface); }
        #jlc-wb-dialog .jlc-wb-btn {
            border: 1px solid var(--jlc-line); border-radius: 8px; padding: 10px 16px;
            background: var(--jlc-bg); color: var(--jlc-text); cursor: pointer;
        }
        #jlc-wb-dialog .jlc-wb-btn.primary { background: var(--jlc-accent); border-color: transparent; color: white; }
        @media (max-width: 820px) {
            #jlc-wb { height: min(90dvh, 840px) !important; padding-bottom: env(safe-area-inset-bottom); }
            #jlc-wb .jlc-wb-resize-w, #jlc-wb .jlc-wb-resize-h, #jlc-wb .jlc-wb-resize-corner { display: none; }
            #jlc-wb-fab { width: auto; height: 44px; }
            #jlc-wb .jlc-wb-header { padding: 16px; }
            #jlc-wb .jlc-wb-nav { padding: 0 16px; }
            #jlc-wb-layout-toggle { display: none; }
        }
        @media (max-width: 440px) {
            #jlc-wb .jlc-wb-filter-row { grid-template-columns: 1fr 1fr; }
            #jlc-wb .jlc-wb-tracking-actions { align-items: flex-start; }
            #jlc-wb .jlc-wb-item-row { gap: 8px; }
            #jlc-wb .jlc-wb-cover { width: 42px; height: 52px; border-radius: 8px; }
            #jlc-wb .jlc-wb-item { padding: 10px; }
        }
        @media (pointer: coarse) {
            #jlc-wb input:not([type=checkbox]):not([type=range]), #jlc-wb textarea, #jlc-wb select { font-size: 16px; }
            #jlc-wb .jlc-wb-more-btn, #jlc-wb .jlc-wb-icon-btn { min-width: 40px; min-height: 40px; }
        }
        @media (prefers-reduced-motion: reduce) {
            #jlc-wb *, #jlc-wb-fab { transition: none !important; animation: none !important; }
        }
        #jlc-wb .jlc-wb-tag-editor {
            display: flex; flex-direction: column; gap: 8px;
        }
        #jlc-wb .jlc-wb-tag-list {
            display: flex; flex-wrap: wrap; gap: 6px; min-height: 8px;
        }
        #jlc-wb .jlc-wb-tag {
            display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 999px;
            background: var(--creamu-wb-surface-raised); border: 1px solid var(--creamu-wb-border-strong);
            color: var(--creamu-wb-text-strong); font-size: 12.5px; font-weight: 650;
        }
        #jlc-wb .jlc-wb-tag button {
            appearance: none; border: 0; background: transparent; color: #b09070;
            cursor: pointer; font-size: 14px; line-height: 1; padding: 0 0 0 2px; font-weight: 800;
        }
        #jlc-wb .jlc-wb-tag button:hover { color: var(--creamu-wb-danger); }
        #jlc-wb .jlc-wb-tag-input {
            width: 100%; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--creamu-wb-border);
            background: var(--creamu-wb-surface-raised); color: var(--creamu-wb-text); font-size: 14px;
        }
        #jlc-wb .jlc-wb-tag-input:focus { outline: none; border-color: var(--creamu-wb-accent); }
        #jlc-wb .jlc-wb-settings-section #jlc-wb-view-root {
            padding: 0; overflow: visible; flex: none; min-height: 0;
        }
        #jlc-wb #jlc-wb-config-diag {
            margin: 0 0 12px; padding: 10px 12px; border-radius: 10px; line-height: 1.6;
            background: var(--creamu-wb-surface); border: 1px solid var(--jlc-line);
            color: var(--creamu-wb-text-strong);
        }
        #jlc-wb .jlc-wb-tracking-alert { color: #9a6700; font-size: 12px; }
        #jlc-wb .jlc-wb-virtual-note { color: #4f769c; font-size: 11px; }
        #jlc-tracking-pagebar.jlc-wb-pagebar {
            background: var(--jlc-surface); border: 1px solid var(--creamu-wb-border);
            color: var(--creamu-wb-text); box-shadow: none;
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-title {
            color: var(--creamu-wb-text);
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagehint {
            color: var(--jlc-muted) !important; font-weight: 550; font-size: 12px;
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-meta {
            color: var(--creamu-wb-text-muted);
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button {
            appearance: none; border: 1px solid var(--creamu-wb-border-strong);
            background: var(--creamu-wb-surface-soft); color: var(--creamu-wb-text-strong);
            border-radius: 8px; padding: 8px 12px; cursor: pointer; font-size: 13px; font-weight: 600;
            zoom: var(--jlc-btn-scale, 1);
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button.primary {
            background: var(--creamu-wb-accent); border-color: transparent; color: var(--creamu-wb-on-accent);
        }
        `;
    }

    function initWorkbenchV3Styles() {
        if (typeof injectCreamuWorkbenchStyles !== 'function') {
            console.warn('[Creamu·JLC] workbench styles unavailable');
            return;
        }
        injectCreamuWorkbenchStyles({
            styleId: 'jlc-wb-style',
            extraCss: getJlcWorkbenchCss()
        });
        applyUiBtnScale();
    }

    function focusTrackingInWorkbench(recordId, options = {}) {
        const id = compactText(recordId || '');
        persistWorkbenchSession({
            panelOpen: true,
            nav: 'tracking',
            settingsOpen: false,
            tracking: id ? { focusRecordId: id } : {}
        });
        openWorkbenchV3('tracking');
        if (id) {
            window.requestAnimationFrame(() => {
                const row = document.querySelector('#jlc-wb [data-jlc-wb-id="' + CSS.escape(id) + '"]');
                if (row) {
                    row.classList.add('is-focus');
                    row.scrollIntoView({ block: 'center', behavior: 'auto' });
                } else if (options.alertIfMissing !== false) {
                    // list may still be rendering
                    window.setTimeout(() => {
                        const retry = document.querySelector('#jlc-wb [data-jlc-wb-id="' + CSS.escape(id) + '"]');
                        retry?.classList.add('is-focus');
                        retry?.scrollIntoView({ block: 'center', behavior: 'auto' });
                    }, 120);
                }
            });
        }
    }

    function getWorkbenchEl() {
        return document.getElementById('jlc-wb');
    }

    function isWorkbenchOpen() {
        return !!getWorkbenchEl()?.classList.contains('is-open');
    }

    /** 设置抽屉 Tab；兼容旧 session id（system→services, data→backup） */
    const WORKBENCH_MAIN_NAVS = ['tracking', 'library', 'filter'];
    const WORKBENCH_SETTINGS_TABS = ['resource', 'services', 'display', 'backup'];

    function normalizeWorkbenchSettingsTab(tabId = '') {
        const id = compactText(tabId || '');
        if (id === 'system' || id === 'settings' || id === 'connect') return 'services';
        if (id === 'data') return 'backup';
        if (id === 'view' || id === 'legacy') return 'display';
        // 旧「库/过滤」在设置里：现已为主 Tab，落到显示以免打不开
        if (id === 'library' || id === 'filter' || id === 'hidden' || id === 'block') return 'display';
        if (WORKBENCH_SETTINGS_TABS.includes(id)) return id;
        return 'resource';
    }

    function normalizeWorkbenchMainNav(nav = 'tracking') {
        const id = compactText(nav || '');
        if (WORKBENCH_MAIN_NAVS.includes(id)) return id;
        return 'tracking';
    }

    function mapCommanderTabToWorkbench(tabId = '') {
        const id = compactText(tabId || '');
        if (!id || id === 'tracking') return { nav: 'tracking', settings: false, section: '' };
        if (id === 'library') return { nav: 'library', settings: false, section: '' };
        if (id === 'filter' || id === 'hidden' || id === 'block') return { nav: 'filter', settings: false, section: '' };
        if (id === 'legacy' || id === 'view' || id === 'display') return { nav: 'tracking', settings: true, section: 'display' };
        if (id === 'resource') return { nav: 'tracking', settings: true, section: 'resource' };
        if (id === 'backup' || id === 'data') return { nav: 'tracking', settings: true, section: 'backup' };
        if (id === 'settings' || id === 'services' || id === 'system') return { nav: 'tracking', settings: true, section: 'services' };
        return { nav: 'tracking', settings: false, section: '' };
    }

    function getWorkbenchListScroller(shell = getWorkbenchEl()) {
        if (!shell) return null;
        const session = getWorkbenchSession();
        const body = shell.querySelector('.jlc-wb-body');
        if (session.nav === 'library') return shell.querySelector('#jlc-wb-library-root') || body;
        if (session.nav === 'filter') return shell.querySelector('#jlc-wb-filter-root') || body;
        return shell.querySelector('#jlc-wb-list-scroll') || body;
    }

    function captureWorkbenchScroll() {
        const shell = getWorkbenchEl();
        if (!shell) return;
        const session = getWorkbenchSession();
        const key = normalizeWorkbenchMainNav(session.nav);
        const scroller = getWorkbenchListScroller(shell);
        if (!scroller) return;
        const nextTop = scroller.scrollTop || 0;
        // 滚动中频繁 GM_setValue 会卡顿，值没变就别写
        const prevTop = Number(session.scrollTops?.[key] || 0) || 0;
        let settingsTop = Number(session.scrollTops?.settings || 0) || 0;
        const settingsBody = shell.querySelector('.jlc-wb-settings-body');
        if (settingsBody && session.settingsOpen) {
            settingsTop = settingsBody.scrollTop || 0;
        }
        if (prevTop === nextTop && Number(session.scrollTops?.settings || 0) === settingsTop) return;
        persistWorkbenchSession({
            scrollTops: Object.assign({}, session.scrollTops, {
                [key]: nextTop,
                settings: settingsTop
            })
        });
    }

    function scheduleWorkbenchScrollSave() {
        if (workbenchScrollSaveTimer) window.clearTimeout(workbenchScrollSaveTimer);
        workbenchScrollSaveTimer = window.setTimeout(() => {
            workbenchScrollSaveTimer = null;
            captureWorkbenchScroll();
        }, 320);
    }

    function restoreWorkbenchScroll(options = {}) {
        const shell = getWorkbenchEl();
        if (!shell) return;
        const session = getWorkbenchSession();
        const key = normalizeWorkbenchMainNav(session.nav);
        const scroller = getWorkbenchListScroller(shell);
        const top = Number(options.scrollTop != null ? options.scrollTop : session.scrollTops?.[key] || 0) || 0;
        // 默认不要 scrollIntoView：会和用户手势抢位置，造成“滚一下又弹回”
        const focusId = options.forceFocus
            ? (options.focusId || session.tracking?.focusRecordId || '')
            : '';
        window.requestAnimationFrame(() => {
            if (scroller) scroller.scrollTop = top;
            if (focusId && session.nav === 'tracking') {
                const row = shell.querySelector('[data-jlc-wb-id="' + CSS.escape(focusId) + '"]');
                if (row) {
                    row.classList.add('is-focus');
                    if (options.scrollIntoFocus) {
                        row.scrollIntoView({ block: 'nearest', behavior: 'auto' });
                    }
                }
            }
            const settingsBody = shell.querySelector('.jlc-wb-settings-body');
            if (settingsBody && session.settingsOpen) {
                settingsBody.scrollTop = Number(session.scrollTops?.settings || 0) || 0;
            }
        });
    }

    
    function markWorkbenchListScrolling() {
        workbenchListScrolling = true;
        if (workbenchScrollIdleTimer) window.clearTimeout(workbenchScrollIdleTimer);
        workbenchScrollIdleTimer = window.setTimeout(() => {
            workbenchListScrolling = false;
            workbenchScrollIdleTimer = null;
            if (workbenchListRenderPending) {
                const opts = workbenchListRenderPending;
                workbenchListRenderPending = null;
                void renderWorkbenchTrackingList(opts);
            }
        }, 320);
    }

    function scheduleRenderWorkbenchTrackingList(options = {}, delayMs = 0) {
        if (workbenchListScrolling) {
            workbenchListRenderPending = Object.assign({}, workbenchListRenderPending || {}, options);
            return;
        }
        if (delayMs > 0) {
            if (workbenchListRenderTimer) window.clearTimeout(workbenchListRenderTimer);
            workbenchListRenderTimer = window.setTimeout(() => {
                workbenchListRenderTimer = null;
                if (workbenchListScrolling) {
                    workbenchListRenderPending = Object.assign({}, workbenchListRenderPending || {}, options);
                    return;
                }
                void renderWorkbenchTrackingList(options);
            }, delayMs);
            return;
        }
        if (workbenchListRenderTimer) {
            window.clearTimeout(workbenchListRenderTimer);
            workbenchListRenderTimer = null;
        }
        void renderWorkbenchTrackingList(options);
    }

    function updateWorkbenchFabBadge(updateCount = 0) {
        const fab = document.getElementById('jlc-wb-fab');
        if (!fab) return;
        const badge = fab.querySelector('.jlc-wb-fab-badge');
        const count = Number(updateCount || 0) || 0;
        fab.classList.toggle('has-updates', count > 0);
        fab.setAttribute('aria-label', '打开 Creamu 控制台' + (count > 0 ? '，' + count + ' 项有更新' : ''));
        if (badge) badge.textContent = count > 99 ? '99+' : String(count);
    }

    async function refreshWorkbenchFabBadge() {
        try {
            const list = (await getWorkbenchTrackingRecordsState()).records
                .filter(record => !record.archived);
            const updateCount = list.filter(record => {
                const top = normalizeCode(record.top_avid || '');
                const seen = normalizeCode(record.last_seen_avid || '');
                return top && top !== seen;
            }).length;
            updateWorkbenchFabBadge(updateCount);
            const sub = document.getElementById('jlc-wb-header-sub');
            if (sub) sub.textContent = '更新 ' + updateCount + ' · 共 ' + list.length;
        } catch (e) {
            /* ignore */
        }
    }

    function setWorkbenchSettingsOpen(open, section = '') {
        const shell = getWorkbenchEl();
        if (!shell) return;
        const drawer = shell.querySelector('.jlc-wb-settings');
        if (!drawer) return;
        const wasOpen = drawer.classList.contains('is-open');
        drawer.classList.toggle('is-open', !!open);
        shell.querySelector('#jlc-wb-settings-btn')?.setAttribute('aria-expanded', String(!!open));
        shell.querySelectorAll(':scope > .jlc-wb-header, :scope > .jlc-wb-nav, :scope > .jlc-wb-body')
            .forEach(region => { region.inert = !!open; });
        const nextSection = normalizeWorkbenchSettingsTab(
            section || getWorkbenchSession().settingsSection || 'resource'
        );
        persistWorkbenchSession({
            settingsOpen: !!open,
            settingsSection: nextSection
        });
        if (open && typeof activateWorkbenchSettingsTab === 'function') {
            activateWorkbenchSettingsTab(nextSection);
        }
        if (open && !wasOpen) drawer.querySelector('#jlc-wb-settings-close')?.focus();
        else if (!open && wasOpen && isWorkbenchOpen()) shell.querySelector('#jlc-wb-settings-btn')?.focus();
    }

    async function activateWorkbenchNav(nav = 'tracking', options = {}) {
        const shell = getWorkbenchEl();
        if (!shell) return;
        const next = normalizeWorkbenchMainNav(nav);
        captureWorkbenchScroll();
        shell.querySelectorAll('.jlc-wb-nav button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.nav === next);
            if (btn.dataset.nav === next) btn.setAttribute('aria-current', 'page');
            else btn.removeAttribute('aria-current');
        });
        shell.querySelectorAll('[data-jlc-wb-page]').forEach(page => {
            page.hidden = page.dataset.jlcWbPage !== next;
        });
        persistWorkbenchSession({ nav: next });
        if (next === 'tracking') {
            // 列表渲染内部会保留/恢复滚动，这里不要再 restore + scrollIntoView 抢位置
            if (options.forceRender !== false) await renderWorkbenchTrackingList(options);
            else restoreWorkbenchScroll({ scrollTop: Number(getWorkbenchSession().scrollTops?.tracking || 0) || 0 });
        } else if (next === 'library') {
            try { syncWorkbenchSettingsForm(); } catch (_) { /* ignore */ }
            try { await refreshLibraryUI(); } catch (_) { /* ignore */ }
            restoreWorkbenchScroll();
        } else if (next === 'filter') {
            try { syncWorkbenchSettingsForm(); } catch (_) { /* ignore */ }
            try { mountWorkbenchFilterEditors(); } catch (_) { /* ignore */ }
            restoreWorkbenchScroll();
        }
    }

    function mountWorkbenchFilterEditors() {
        const hosts = [
            document.getElementById('jlc-wb-tags-hidden-word'),
            document.getElementById('jlc-wb-tags-hidden-avid')
        ].filter(Boolean);
        hosts.forEach((host) => {
            if (host.dataset.bound === '1') return;
            const key = host.getAttribute('data-key') || '';
            if (!key || typeof Status === 'undefined') return;
            host.dataset.bound = '1';
            let data = Array.isArray(Status.get(key)) ? Status.get(key).slice() : [];
            host.innerHTML = ''
                + '<div class="jlc-wb-tag-list"></div>'
                + '<input type="text" class="jlc-wb-tag-input" autocomplete="off" aria-label="'
                + (key === 'hiddenWord' ? '添加屏蔽标题词' : '添加屏蔽番号') + '" placeholder="'
                + escapeHtml(host.getAttribute('data-placeholder') || '回车添加') + '">';
            const listEl = host.querySelector('.jlc-wb-tag-list');
            const input = host.querySelector('.jlc-wb-tag-input');
            const paint = () => {
                listEl.innerHTML = data.map((t, i) => ''
                    + '<span class="jlc-wb-tag">' + escapeHtml(String(t))
                    + '<button type="button" data-i="' + i + '" title="删除">×</button></span>').join('');
            };
            const persist = () => {
                Status.set(key, data.slice());
                try { syncWorkbenchSettingsForm(); } catch (_) { /* ignore */ }
                try { if (typeof refreshCommanderDecorations === 'function') refreshCommanderDecorations(); } catch (_) { /* ignore */ }
            };
            const addTokens = (raw) => {
                const parts = String(raw || '').replace(/，/g, ',').split(',').map((s) => s.trim()).filter(Boolean);
                if (!parts.length) return;
                parts.forEach((p) => {
                    if (!data.some((x) => String(x).toLowerCase() === p.toLowerCase())) data.push(p);
                });
                paint();
                persist();
            };
            listEl.addEventListener('click', (e) => {
                const btn = e.target?.closest?.('button[data-i]');
                if (!btn) return;
                const i = Number(btn.getAttribute('data-i'));
                if (!Number.isFinite(i) || i < 0) return;
                data.splice(i, 1);
                paint();
                persist();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                addTokens(input.value);
                input.value = '';
            });
            paint();
        });

        const fav = document.getElementById('jlc-wb-i-fav');
        if (fav && fav.dataset.bound !== '1') {
            fav.dataset.bound = '1';
            const saveFav = () => setFavoriteTags(fav.value);
            fav.addEventListener('change', saveFav);
            fav.addEventListener('blur', saveFav);
        }
    }

    function closeWorkbenchV3() {
        const shell = getWorkbenchEl();
        if (!shell) return;
        closeCoverDownloadDialog();
        captureWorkbenchScroll();
        shell.classList.remove('is-open');
        document.getElementById('jlc-wb-fab')?.classList.remove('is-panel-open');
        document.getElementById('jlc-wb-fab')?.setAttribute('aria-expanded', 'false');
        persistWorkbenchSession({ panelOpen: false, settingsOpen: false });
        applyWorkbenchShellGeometry({}, { skipPersist: true });
        setWorkbenchSettingsOpen(false);
        document.getElementById('jlc-wb-fab')?.focus({ preventScroll: true });
    }

    function applyWorkbenchShellGeometry(patch = {}, options = {}) {
        const shell = getWorkbenchEl();
        if (!shell) return null;
        const session = getWorkbenchSession();
        const docked = session.panelMode === 'dock' && window.innerWidth >= 1180;
        shell.classList.toggle('is-docked', docked);
        document.documentElement.classList.toggle('jlc-console-docked', docked && isWorkbenchOpen());
        const dockWidth = Math.min(520, Math.max(380, window.innerWidth * .32));
        document.documentElement.style.setProperty('--jlc-dock-width', dockWidth + 'px');
        const layoutToggle = shell.querySelector('#jlc-wb-layout-toggle');
        if (layoutToggle) {
            layoutToggle.textContent = session.panelMode === 'dock' ? '浮窗' : '并排';
            layoutToggle.setAttribute('aria-label', session.panelMode === 'dock' ? '切换为自由浮窗' : '切换为并排停靠');
            layoutToggle.disabled = window.innerWidth < 1180;
            layoutToggle.title = window.innerWidth < 1180 ? '窗口宽度达到 1180 像素后可并排' : '切换并排停靠与自由浮窗';
        }
        const def = getCreamuDefaultWorkbenchRect(window);
        // 宽高只信任 session / 显式 patch，禁止用 live getBoundingClientRect 反写（会越拖越胀）
        const nextWidth = patch.width != null
            ? patch.width
            : (Number(session.shellWidth) > 0 ? session.shellWidth : def.width);
        const nextHeight = patch.height != null
            ? patch.height
            : (Number(session.shellHeight) > 0 ? session.shellHeight : def.height);
        const nextLeft = patch.left != null
            ? patch.left
            : (session.shellLeft != null && Number.isFinite(Number(session.shellLeft)) ? session.shellLeft : def.left);
        const nextTop = patch.top != null
            ? patch.top
            : (session.shellTop != null && Number.isFinite(Number(session.shellTop)) ? session.shellTop : def.top);
        const rect = clampCreamuWorkbenchRect({
            left: nextLeft,
            top: nextTop,
            width: nextWidth,
            height: nextHeight
        }, window);
        shell.style.left = rect.left + 'px';
        shell.style.top = rect.top + 'px';
        shell.style.right = 'auto';
        shell.style.bottom = 'auto';
        shell.style.width = rect.width + 'px';
        shell.style.height = rect.height + 'px';
        shell.style.maxHeight = 'none';
        if (!options.skipPersist) {
            persistWorkbenchSession({
                shellLeft: rect.left,
                shellTop: rect.top,
                shellWidth: rect.width,
                shellHeight: rect.height
            });
        }
        return rect;
    }

    function applyWorkbenchShellSize(width, height) {
        const patch = {};
        if (width != null) patch.width = width;
        if (height != null) patch.height = height;
        applyWorkbenchShellGeometry(patch);
    }

    function writeWorkbenchFabPosition(fab, point) {
        // Dragging and saved positions use viewport pixels; CSS zoom also scales left/top.
        const zoom = Number.parseFloat(getComputedStyle(fab).zoom) || 1;
        fab.style.left = point.left / zoom + 'px';
        fab.style.top = point.top / zoom + 'px';
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
    }

    function applyWorkbenchFabPosition(fab, session = getWorkbenchSession()) {
        if (!fab) return;
        if (session.fabLeft == null || session.fabTop == null) return;
        const left = Number(session.fabLeft);
        const top = Number(session.fabTop);
        if (!Number.isFinite(left) || !Number.isFinite(top)) return;
        const rect = fab.getBoundingClientRect();
        const point = clampCreamuWorkbenchPoint({ left, top }, rect, window);
        writeWorkbenchFabPosition(fab, point);
    }

    function bindWorkbenchFabDrag(fab) {
        if (!fab) return;
        applyWorkbenchFabPosition(fab);
        bindCreamuFabDrag(fab, {
            boundKey: 'jlcFabDragBound',
            threshold: 5,
            thresholdMode: 'axis',
            applyPosition: (point) => writeWorkbenchFabPosition(fab, point),
            savePosition: (point) => {
                persistWorkbenchSession({
                    fabLeft: Math.round(point.left),
                    fabTop: Math.round(point.top)
                });
            },
            onActivate: () => toggleWorkbenchV3(),
            onViewportChange: () => applyWorkbenchFabPosition(fab),
            preventClick: false
        });
    }

    function getWorkbenchInteractionRect(shell) {
            const session = getWorkbenchSession();
            const rect = shell.getBoundingClientRect();
            return {
                left: rect.left,
                top: rect.top,
                width: Math.round(Number(session.shellWidth) > 0 ? session.shellWidth : rect.width),
                height: Math.round(Number(session.shellHeight) > 0 ? session.shellHeight : rect.height)
            };
    }

    function bindWorkbenchDrag(shell) {
        bindCreamuWorkbenchDrag(shell, {
            boundKey: 'jlcPanelDragBound',
            isDragDisabled: () => window.innerWidth <= 820 || shell.classList.contains('is-docked'),
            shouldIgnoreDrag: (event) => !!event.target?.closest?.('.jlc-wb-header-actions'),
            getStartRect: () => getWorkbenchInteractionRect(shell),
            applyRect: (rect) => applyWorkbenchShellGeometry(rect, { skipPersist: true }),
            onEnd: (rect) => applyWorkbenchShellGeometry(rect),
            lockBodySelection: true
        });
    }

    function bindWorkbenchResize(shell) {
        bindCreamuWorkbenchResize(shell, {
            boundKey: 'jlcPanelResizeBound',
            handleBoundPrefix: 'jlcResizeHandle',
            isDragDisabled: () => window.innerWidth <= 820 || shell.classList.contains('is-docked'),
            getStartRect: () => getWorkbenchInteractionRect(shell),
            applyRect: (rect) => applyWorkbenchShellGeometry(rect, { skipPersist: true }),
            onEnd: (rect) => applyWorkbenchShellGeometry(rect),
            lockBodySelection: true
        });
    }

    function ensureWorkbenchDialog() {
        let dialog = document.getElementById('jlc-wb-dialog');
        if (dialog) return dialog;
        dialog = document.createElement('div');
        dialog.id = 'jlc-wb-dialog';
        dialog.innerHTML = ''
            + '<div class="jlc-wb-dialog-card" role="dialog" aria-modal="true">'
            + '  <h4 id="jlc-wb-dialog-title">输入</h4>'
            + '  <p id="jlc-wb-dialog-note"></p>'
            + '  <input id="jlc-wb-dialog-input" type="text" autocomplete="off">'
            + '  <div class="jlc-wb-dialog-actions">'
            + '    <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-dialog-cancel">取消</button>'
            + '    <button type="button" class="jlc-wb-btn primary" id="jlc-wb-dialog-ok">确定</button>'
            + '  </div>'
            + '</div>';
        document.body.appendChild(dialog);
        return dialog;
    }

    function showWorkbenchPrompt(options = {}) {
        const dialog = ensureWorkbenchDialog();
        const title = dialog.querySelector('#jlc-wb-dialog-title');
        const note = dialog.querySelector('#jlc-wb-dialog-note');
        const input = dialog.querySelector('#jlc-wb-dialog-input');
        const ok = dialog.querySelector('#jlc-wb-dialog-ok');
        const cancel = dialog.querySelector('#jlc-wb-dialog-cancel');
        title.textContent = options.title || '输入';
        note.textContent = options.note || '';
        note.style.display = options.note ? 'block' : 'none';
        input.value = options.value || '';
        input.placeholder = options.placeholder || '';
        dialog.classList.add('is-open');
        window.setTimeout(() => {
            input.focus();
            input.select();
        }, 0);
        return new Promise((resolve) => {
            const close = (value) => {
                dialog.classList.remove('is-open');
                ok.onclick = null;
                cancel.onclick = null;
                dialog.onclick = null;
                input.onkeydown = null;
                resolve(value);
            };
            ok.onclick = () => close(input.value);
            cancel.onclick = () => close(null);
            dialog.onclick = (event) => {
                if (event.target === dialog) close(null);
            };
            input.onkeydown = (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    close(input.value);
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    close(null);
                }
            };
        });
    }
