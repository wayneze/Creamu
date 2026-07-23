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
                auto: config.webdav_auto !== false,
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
        if (fab) fab.style.setProperty('--jlc-btn-scale', scale);
        return pct;
    }

    function getJlcWorkbenchCss() {
        return `
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
            box-shadow: 0 2px 0 var(--creamu-wb-divider);
        }
        #jlc-wb .jlc-wb-tag button {
            appearance: none; border: 0; background: transparent; color: #b09070;
            cursor: pointer; font-size: 14px; line-height: 1; padding: 0 0 0 2px; font-weight: 800;
        }
        #jlc-wb .jlc-wb-tag button:hover { color: var(--creamu-wb-danger); }
        #jlc-wb .jlc-wb-tag-input {
            width: 100%; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--creamu-wb-border);
            background: var(--creamu-wb-surface-raised); color: var(--creamu-wb-text); font-size: 14px;
            box-shadow: 0 2px 0 var(--creamu-wb-divider);
        }
        #jlc-wb .jlc-wb-tag-input:focus { outline: none; border-color: var(--creamu-wb-accent); }
        #jlc-wb .jlc-wb-settings-section #jlc-wb-view-root {
            padding: 0; overflow: visible; flex: none; min-height: 0;
        }
        #jlc-wb #jlc-wb-config-diag {
            background: var(--creamu-wb-surface) !important; border: 1px solid #efe0cc !important;
            color: var(--creamu-wb-text-strong) !important;
        }
        #jlc-wb #jlc-wb-config-hint {
            background: #fff7ea !important; border-color: #f0d7a0 !important; color: #9a6700 !important;
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar {
            background: rgba(255,253,248,.97); border: 1px solid var(--creamu-wb-border);
            color: var(--creamu-wb-text); box-shadow: 0 10px 24px rgba(90,60,30,.12);
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-title {
            color: var(--creamu-wb-text);
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagehint {
            color: #a89078 !important; font-weight: 550; font-size: 12px;
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-meta {
            color: var(--creamu-wb-text-muted);
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button {
            appearance: none; border: 1px solid var(--creamu-wb-border-strong);
            background: var(--creamu-wb-surface-soft); color: var(--creamu-wb-text-strong);
            border-radius: 999px; padding: 7px 12px; cursor: pointer; font-size: 13px; font-weight: 650;
            zoom: var(--jlc-btn-scale, 1);
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button.primary {
            background: var(--creamu-wb-accent); border-color: transparent; color: var(--creamu-wb-on-accent);
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button.jlc-bp-continue {
            background: linear-gradient(135deg, #ff5f56, #e54840); border: 0; color: var(--creamu-wb-on-accent);
            font-weight: 800; box-shadow: 0 3px 0 #b8322b, 0 8px 18px rgba(255,95,86,.22);
        }`;
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
        if (badge) badge.textContent = count > 99 ? '99+' : String(count);
    }

    async function refreshWorkbenchFabBadge() {
        try {
            const list = (await getTrackingSearches()).filter(record => !record.archived);
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
        drawer.classList.toggle('is-open', !!open);
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
    }

    async function activateWorkbenchNav(nav = 'tracking', options = {}) {
        const shell = getWorkbenchEl();
        if (!shell) return;
        const next = normalizeWorkbenchMainNav(nav);
        captureWorkbenchScroll();
        shell.querySelectorAll('.jlc-wb-nav button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.nav === next);
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

    /** 过滤页：本页内联编辑屏蔽词/番号（不跳 TabPanel） */
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
                + '<input type="text" class="jlc-wb-tag-input" autocomplete="off" placeholder="'
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
            const saveFav = () => {
                const list = String(fav.value || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean);
                config.fav_tags = list;
                try { GM_setValue('jlc_config_stable', config); } catch (_) { /* ignore */ }
                try { if (typeof ensureCreamuSync === 'function') ensureCreamuSync()?.markLocalDirty(); } catch (_) { /* ignore */ }
                try { if (typeof refreshCommanderDecorations === 'function') refreshCommanderDecorations(); } catch (_) { /* ignore */ }
            };
            fav.addEventListener('change', saveFav);
            fav.addEventListener('blur', saveFav);
        }
    }

    function closeWorkbenchV3() {
        const shell = getWorkbenchEl();
        if (!shell) return;
        captureWorkbenchScroll();
        shell.classList.remove('is-open');
        document.getElementById('jlc-wb-fab')?.classList.remove('is-panel-open');
        persistWorkbenchSession({ panelOpen: false, settingsOpen: false });
        setWorkbenchSettingsOpen(false);
    }

    function applyWorkbenchShellGeometry(patch = {}, options = {}) {
        const shell = getWorkbenchEl();
        if (!shell) return null;
        const session = getWorkbenchSession();
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

    function applyWorkbenchFabPosition(fab, session = getWorkbenchSession()) {
        if (!fab) return;
        const left = Number(session.fabLeft);
        const top = Number(session.fabTop);
        if (!Number.isFinite(left) || !Number.isFinite(top)) return;
        const w = fab.offsetWidth || 34;
        const h = fab.offsetHeight || 34;
        const point = clampCreamuWorkbenchPoint({ left, top }, { width: w, height: h }, window);
        fab.style.left = point.left + 'px';
        fab.style.top = point.top + 'px';
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
    }

    function bindWorkbenchFabDrag(fab) {
        if (!fab) return;
        applyWorkbenchFabPosition(fab);
        bindCreamuFabDrag(fab, {
            boundKey: 'jlcFabDragBound',
            threshold: 5,
            thresholdMode: 'axis',
            applyPosition: (point) => {
                fab.style.left = point.left + 'px';
                fab.style.top = point.top + 'px';
                fab.style.right = 'auto';
                fab.style.bottom = 'auto';
            },
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
            isDragDisabled: () => window.innerWidth <= 820,
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
            isDragDisabled: () => window.innerWidth <= 820,
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
