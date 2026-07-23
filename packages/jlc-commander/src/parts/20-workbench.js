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

    const WB_VIRT_THRESHOLD = 99999; // 关闭虚高虚拟列表，避免底部空滚
    let WB_VIRT_ITEM_H = 112;
    let WB_VIRT_GROUP_H = 44;
    let workbenchVirtState = null;

    /** 胶囊用短相对时间：刚刚 / 5分钟前 / 3小时前 / 1天前 */
    function formatCompactRelativeTime(value) {
        if (!value) return '';
        const time = new Date(value).getTime();
        if (!Number.isFinite(time)) return '';
        const diff = Date.now() - time;
        if (diff < 60 * 1000) return '刚刚';
        if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + '分钟前';
        if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + '小时前';
        if (diff < 30 * 24 * 60 * 60 * 1000) return Math.floor(diff / (24 * 60 * 60 * 1000)) + '天前';
        // 更久：用月-日，避免胶囊过长
        const d = new Date(time);
        return (d.getMonth() + 1) + '/' + d.getDate();
    }

    /** 上次打开时效色阶：越近越暖 */
    function getLastOpenedRecencyClass(value) {
        if (!value) return 'recency-mid';
        const time = new Date(value).getTime();
        if (!Number.isFinite(time)) return 'recency-mid';
        const diff = Date.now() - time;
        if (diff < 60 * 60 * 1000) return 'recency-fresh'; // <1h
        if (diff < 24 * 60 * 60 * 1000) return 'recency-warm'; // <1d
        if (diff < 7 * 24 * 60 * 60 * 1000) return 'recency-mid'; // <7d
        return 'recency-cool';
    }

    function buildWorkbenchTrackingItemHtml(record, session, context, currentSignature, focusId) {
        const status = buildTrackingStatus(record);
        const displayTitle = getTrackingDisplayTitle(record);
        const pageHints = buildTrackingPageHintSummary(record);
        const pageSummary = pageHints.length ? pageHints.join(' · ') : '';
        // 最新/断点单独一行；页码单独一行；浏览时间改挂在「上次」胶囊
        const avidBits = [];
        if (record.top_avid) avidBits.push('最新 ' + record.top_avid);
        if (record.last_seen_avid) avidBits.push('断点 ' + record.last_seen_avid);
        const avidLine = avidBits.join(' · ');
        const metaHtml = ''
            + (avidLine
                ? '<div class="jlc-wb-item-meta-line is-avid" title="' + escapeHtml(avidLine) + '">' + escapeHtml(avidLine) + '</div>'
                : '')
            + (pageSummary
                ? '<div class="jlc-wb-item-meta-line is-sub" title="' + escapeHtml(pageSummary) + '">' + escapeHtml(pageSummary) + '</div>'
                : '');
        const isFocus = focusId && record.id === focusId;
        const isCurrent = currentSignature && record.query_signature === currentSignature;
        const canQuery = isJavLibraryResolvableSearchUrl(record.page_url || record.open_url || '');
        const leafTitle = status.note || status.text || '';
        const subPills = [];
        subPills.push('<span class="jlc-site-pill">' + escapeHtml(getSiteLabel(record.site)) + '</span>');
        if (isCurrent) subPills.push('<span class="jlc-site-pill is-current">当前</span>');
        // 「上次」必须来自可同步字段 last_browsed_at（追更记录），不能只靠本机 session.lastOpened*
        // session 仅用于本机「刚打开」高亮：取二者较新者展示
        {
            const sessionIsLast = record.id === session.tracking.lastOpenedId;
            const sessionOpenedAt = sessionIsLast ? compactText(session.tracking.lastOpenedAt || '') : '';
            const browsedAt = compactText(record.last_browsed_at || '');
            let lastAt = '';
            if (sessionOpenedAt && browsedAt) {
                const st = Date.parse(sessionOpenedAt) || 0;
                const bt = Date.parse(browsedAt) || 0;
                lastAt = st >= bt ? sessionOpenedAt : browsedAt;
            } else {
                lastAt = sessionOpenedAt || browsedAt;
            }
            if (lastAt) {
                const rel = formatCompactRelativeTime(lastAt);
                const lastLabel = rel ? ('上次/' + rel) : '上次';
                const fromSessionOnly = sessionIsLast && lastAt === sessionOpenedAt && lastAt !== browsedAt;
                const lastTitle = fromSessionOnly
                    ? ('本机刚打开 · ' + formatDateTime(lastAt))
                    : ('上次浏览（已同步） · ' + formatDateTime(lastAt));
                const recency = getLastOpenedRecencyClass(lastAt);
                subPills.push(
                    '<span class="jlc-site-pill is-last ' + recency + '" title="' + escapeHtml(lastTitle) + '">'
                    + escapeHtml(lastLabel)
                    + '</span>'
                );
            }
        }
        return ''
            + '<div class="jlc-wb-item tone-' + escapeHtml(status.tone || 'gray') + (isFocus ? ' is-focus' : '') + (isCurrent ? ' is-current' : '') + '" data-jlc-wb-id="' + escapeHtml(record.id) + '" data-jlc-wb-card-open="' + escapeHtml(record.id) + '" title="点击打开">'
            + '  <div class="jlc-wb-item-row">'
            + buildWorkbenchCoverHtml(record)
            + '    <div class="jlc-wb-item-body">'
            + '      <div class="jlc-wb-item-title-row">'
            + '        <div class="jlc-wb-item-title">' + escapeHtml(displayTitle) + '</div>'
            + '        <span class="jlc-wb-leaf tone-' + escapeHtml(status.tone || 'gray') + '" title="' + escapeHtml(leafTitle) + '">' + escapeHtml(status.text) + '</span>'
            + '      </div>'
            + '      <div class="jlc-wb-item-meta">' + metaHtml + '</div>'
            + '      <div class="jlc-wb-item-pills">' + subPills.join('') + '</div>'
            + '    </div>'
            + '    <div class="jlc-wb-item-side">'
            + '      <button type="button" class="jlc-wb-open-btn" data-jlc-wb-open="' + escapeHtml(record.id) + '" title="按默认方式打开">Open</button>'
            + '      <button type="button" class="jlc-wb-more-btn" data-jlc-wb-more="' + escapeHtml(record.id) + '" title="更多操作" aria-label="更多">···</button>'
            + '      <div class="jlc-wb-item-menu" data-jlc-wb-menu="' + escapeHtml(record.id) + '" hidden>'
            + '        <button type="button" data-jlc-wb-open-same="' + escapeHtml(record.id) + '">本页打开</button>'
            + '        <button type="button" data-jlc-wb-refresh="' + escapeHtml(record.id) + '">刷新</button>'
            + (canQuery ? '        <button type="button" data-jlc-wb-query="' + escapeHtml(record.id) + '">改词</button>' : '')
            + '        <button type="button" data-jlc-wb-label="' + escapeHtml(record.id) + '">改名</button>'
            + (hasPendingTrackingVerification(record)
                ? '        <button type="button" data-jlc-wb-verify="' + escapeHtml(record.id) + '">验证</button>'
                : '')
            + '        <button type="button" class="is-danger" data-jlc-wb-delete="' + escapeHtml(record.id) + '">删除</button>'
            + '      </div>'
            + '    </div>'
            + '  </div>'
            + '  <div class="jlc-wb-item-edit" data-jlc-wb-edit="' + escapeHtml(record.id) + '">'
            + '    <input type="text" data-jlc-wb-edit-input>'
            + '    <button type="button" class="jlc-wb-btn primary" data-jlc-wb-edit-save>保存</button>'
            + '    <button type="button" class="jlc-wb-btn ghost" data-jlc-wb-edit-cancel>取消</button>'
            + '  </div>'
            + '</div>';
    }

    function buildWorkbenchGroupHeaderHtml(groupType, records, collapsedState) {
        const groupKey = 'group_' + groupType;
        const collapsed = !!collapsedState[groupKey];
        const hasUpdate = records.filter(trackingRecordHasUpdate).length;
        return ''
            + '<section class="jlc-wb-group' + (collapsed ? ' collapsed' : '') + '" data-jlc-group="' + escapeHtml(groupKey) + '">'
            + '  <button type="button" class="jlc-wb-group-toggle" data-jlc-toggle-group="' + escapeHtml(groupKey) + '">'
            + '    <span>' + escapeHtml(getTrackingGroupLabel(groupType)) + (hasUpdate ? '（' + hasUpdate + ' 更新）' : '') + '</span>'
            + '    <small>' + records.length + ' 项</small>'
            + '  </button>'
            + '</section>';
    }

    function openWorkbenchInlineEdit(root, recordId, mode, initialValue) {
        root.querySelectorAll('.jlc-wb-item-edit.is-open').forEach(el => {
            el.classList.remove('is-open');
            delete el.dataset.mode;
        });
        const box = root.querySelector('[data-jlc-wb-edit="' + CSS.escape(recordId) + '"]');
        if (!box) return;
        const input = box.querySelector('[data-jlc-wb-edit-input]');
        box.dataset.mode = mode;
        box.classList.add('is-open');
        if (input) {
            input.value = initialValue || '';
            input.placeholder = mode === 'query' ? '原搜索词' : '备注名（可空恢复自动标题）';
            input.focus();
            input.select();
        }
    }

    function bindWorkbenchTrackingActions(root, list, context, resumePendingIds, refreshResume) {
        const findRecord = (id) => list.find(item => item.id === id);
        const stopBubble = (event) => {
            event.stopPropagation();
        };
        const closeAllMenus = () => {
            root.querySelectorAll('.jlc-wb-item-menu').forEach(menu => {
                menu.hidden = true;
                menu.classList.remove('is-up');
            });
            root.querySelectorAll('.jlc-wb-more-btn.is-open').forEach(btn => btn.classList.remove('is-open'));
            root.querySelectorAll('.jlc-wb-item.is-menu-open').forEach(item => item.classList.remove('is-menu-open'));
        };
        const placeMenu = (menu, card) => {
            if (!menu || !card) return;
            menu.classList.remove('is-up');
            // 先按默认向下打开，再根据列表可视区决定是否上翻
            window.requestAnimationFrame(() => {
                const menuRect = menu.getBoundingClientRect();
                const scroller = menu.closest('.jlc-wb-list-scroll') || root;
                const scrollerRect = scroller?.getBoundingClientRect?.() || null;
                const overflowBottom = scrollerRect
                    ? menuRect.bottom > (scrollerRect.bottom - 6)
                    : menuRect.bottom > (window.innerHeight - 8);
                if (overflowBottom) menu.classList.add('is-up');
            });
        };
        // 点整张卡片 = 默认打开；点按钮/菜单不冒泡
        root.querySelectorAll('[data-jlc-wb-card-open]').forEach(card => {
            card.addEventListener('click', (event) => {
                if (event.target.closest('button, input, a, .jlc-wb-item-side, .jlc-wb-item-menu, .jlc-wb-item-edit, [data-jlc-wb-edit]')) {
                    return;
                }
                closeAllMenus();
                const record = findRecord(card.getAttribute('data-jlc-wb-card-open'));
                if (!record) return;
                void openTrackingRecordFromWorkbench(record);
            });
        });
        root.querySelectorAll('.jlc-wb-item-side, .jlc-wb-item-edit, .jlc-wb-item-menu').forEach(el => {
            el.addEventListener('click', stopBubble);
        });
        root.querySelectorAll('[data-jlc-wb-more]').forEach(button => {
            button.addEventListener('click', (event) => {
                stopBubble(event);
                const id = button.getAttribute('data-jlc-wb-more') || '';
                const menu = root.querySelector('[data-jlc-wb-menu="' + CSS.escape(id) + '"]');
                const card = button.closest('.jlc-wb-item');
                const willOpen = !!(menu && menu.hidden);
                closeAllMenus();
                if (menu && willOpen) {
                    menu.hidden = false;
                    button.classList.add('is-open');
                    card?.classList.add('is-menu-open');
                    placeMenu(menu, card);
                }
            });
        });
        root.querySelectorAll('[data-jlc-wb-open]').forEach(button => {
            button.addEventListener('click', (event) => {
                stopBubble(event);
                closeAllMenus();
                void openTrackingRecordFromWorkbench(findRecord(button.getAttribute('data-jlc-wb-open')));
            });
        });
        root.querySelectorAll('[data-jlc-wb-open-same]').forEach(button => {
            button.addEventListener('click', (event) => {
                stopBubble(event);
                closeAllMenus();
                void openTrackingRecordFromWorkbench(findRecord(button.getAttribute('data-jlc-wb-open-same')), { mode: 'same' });
            });
        });
        root.querySelectorAll('[data-jlc-wb-refresh]').forEach(button => {
            button.addEventListener('click', async (event) => {
                stopBubble(event);
                closeAllMenus();
                const recordId = button.getAttribute('data-jlc-wb-refresh');
                const prev = button.textContent;
                button.disabled = true;
                button.textContent = '…';
                try {
                    await refreshSingleTrackingRecord(recordId);
                } finally {
                    button.disabled = false;
                    button.textContent = prev;
                    await renderWorkbenchTrackingList();
                }
            });
        });
        root.querySelectorAll('[data-jlc-wb-label]').forEach(button => {
            button.addEventListener('click', (event) => {
                stopBubble(event);
                closeAllMenus();
                const record = findRecord(button.getAttribute('data-jlc-wb-label'));
                if (!record) return;
                openWorkbenchInlineEdit(root, record.id, 'label', record.custom_label || getTrackingDisplayTitle(record, context));
            });
        });
        root.querySelectorAll('[data-jlc-wb-query]').forEach(button => {
            button.addEventListener('click', (event) => {
                stopBubble(event);
                closeAllMenus();
                const record = findRecord(button.getAttribute('data-jlc-wb-query'));
                if (!record) return;
                openWorkbenchInlineEdit(root, record.id, 'query', getTrackingSearchQuery(record, context) || '');
            });
        });
        root.querySelectorAll('[data-jlc-wb-edit-cancel]').forEach(button => {
            button.addEventListener('click', (event) => {
                stopBubble(event);
                const box = button.closest('.jlc-wb-item-edit');
                box?.classList.remove('is-open');
            });
        });
        root.querySelectorAll('[data-jlc-wb-edit-save]').forEach(button => {
            button.addEventListener('click', async (event) => {
                stopBubble(event);
                const box = button.closest('.jlc-wb-item-edit');
                const recordId = box?.getAttribute('data-jlc-wb-edit') || '';
                const record = findRecord(recordId);
                if (!record || !box) return;
                const input = box.querySelector('[data-jlc-wb-edit-input]');
                const mode = box.dataset.mode || 'label';
                const value = input?.value ?? '';
                if (mode === 'query') {
                    if (!compactText(value)) {
                        showAlert('原搜索词不能为空。');
                        return;
                    }
                    applyTrackingSearchQuery(record, value);
                    await saveTrackingRecord(record);
                } else {
                    record.custom_label = compactText(value || '');
                    await saveTrackingRecord(record);
                }
                await renderWorkbenchTrackingList();
            });
        });
        root.querySelectorAll('[data-jlc-wb-edit-input]').forEach(input => {
            input.addEventListener('click', stopBubble);
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    input.closest('.jlc-wb-item-edit')?.querySelector('[data-jlc-wb-edit-save]')?.click();
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    input.closest('.jlc-wb-item-edit')?.querySelector('[data-jlc-wb-edit-cancel]')?.click();
                }
            });
        });
        root.querySelectorAll('[data-jlc-wb-verify]').forEach(button => {
            button.addEventListener('click', (event) => {
                stopBubble(event);
                closeAllMenus();
                const record = findRecord(button.getAttribute('data-jlc-wb-verify'));
                if (!record) return;
                const verifyUrl = buildTrackingVerifyUrl(record);
                if (!verifyUrl) {
                    showAlert('当前没有可打开的验证页面。');
                    return;
                }
                openTrackingVerificationUrl(verifyUrl, { fallbackToNavigate: true });
            });
        });
        root.querySelectorAll('[data-jlc-wb-delete]').forEach(button => {
            button.addEventListener('click', async (event) => {
                stopBubble(event);
                closeAllMenus();
                const record = findRecord(button.getAttribute('data-jlc-wb-delete'));
                if (!record) return;
                if (!window.confirm('确定删除追更项“' + getTrackingDisplayTitle(record) + '”吗？')) return;
                await deleteVal(TRACKING_STORE, record.id);
                await renderWorkbenchTrackingList();
                void refreshWorkbenchFabBadge();
            });
        });
        root.querySelectorAll('[data-jlc-toggle-group]').forEach(button => {
            button.addEventListener('click', () => {
                const groupKey = button.getAttribute('data-jlc-toggle-group') || '';
                const collapsedState = getTrackingUiState().collapsed || {};
                const nextCollapsed = !collapsedState[groupKey];
                setTrackingGroupCollapsed(groupKey, nextCollapsed);
                void renderWorkbenchTrackingList();
            });
        });
        root.querySelector('[data-jlc-wb-open-verify]')?.addEventListener('click', () => {
            const verifyRecord = list.find(record => record.id === refreshResume?.record_id)
                || list.find(record => resumePendingIds.includes(record.id));
            const verifyUrl = compactText(refreshResume?.verify_url || '') || buildTrackingVerifyUrl(verifyRecord);
            if (!verifyUrl) {
                showAlert('当前没有可打开的验证页面。');
                return;
            }
            openTrackingVerificationUrl(verifyUrl, { fallbackToNavigate: true });
        });
        root.querySelector('[data-jlc-wb-resume]')?.addEventListener('click', async (event) => {
            if (!resumePendingIds.length) {
                clearTrackingRefreshResumeState();
                await renderWorkbenchTrackingList();
                return;
            }
            const verifyRecord = list.find(record => record.id === refreshResume?.record_id)
                || list.find(record => resumePendingIds.includes(record.id));
            const verifyUrl = compactText(refreshResume?.verify_url || '') || buildTrackingVerifyUrl(verifyRecord);
            const probe = await probeTrackingVerificationReady(verifyRecord, verifyUrl);
            if (!probe.ok) {
                if (verifyUrl) openTrackingVerificationUrl(verifyUrl);
                showAlert((probe.note || '验证尚未生效') + '，请在打开的 JavLibrary 页面完成验证后再点继续。');
                return;
            }
            clearTrackingRefreshResumeState();
            if (verifyRecord) {
                clearTrackingVerificationRequired(verifyRecord, { restoreStatus: true });
                await saveTrackingRecord(verifyRecord);
            }
            void refreshAllTrackingSearches(event.currentTarget, {
                recordIds: resumePendingIds,
                total: Number(refreshResume?.total || 0) || resumePendingIds.length,
                completedBase: Number(refreshResume?.completed || 0) || 0,
                resumeVerified: true
            });
        });
    }


    function openWorkbenchV3(tabId = '') {
        createWorkbenchV3();
        const shell = getWorkbenchEl();
        if (!shell) return;
        const mapped = mapCommanderTabToWorkbench(tabId);
        const session = getWorkbenchSession();
        const nav = compactText(tabId || '') ? mapped.nav : (session.nav || 'tracking');
        shell.classList.add('is-open');
        document.getElementById('jlc-wb-fab')?.classList.add('is-panel-open');
        applyWorkbenchShellGeometry();
        persistWorkbenchSession({ panelOpen: true, nav });
        activateWorkbenchNav(nav, { forceRender: true });
        const wantSettings = !!(mapped.settings || (compactText(tabId || '') ? false : session.settingsOpen));
        if (wantSettings || mapped.settings) {
            setWorkbenchSettingsOpen(true, mapped.section || session.settingsSection || '');
            syncWorkbenchSettingsForm();
            void refreshLibraryUI();
        } else {
            setWorkbenchSettingsOpen(false);
        }
        if (nav !== 'tracking') void refreshWorkbenchFabBadge();
    }

    function toggleWorkbenchV3(tabId = '') {
        if (isWorkbenchOpen() && !compactText(tabId || '')) {
            closeWorkbenchV3();
            return;
        }
        openWorkbenchV3(tabId);
    }

    function trackingRecordHasUpdate(record) {
        const top = normalizeCode(record?.top_avid || '');
        const seen = normalizeCode(record?.last_seen_avid || '');
        return !!(top && top !== seen);
    }

    function sortTrackingRecordsForWorkbench(list, sortKey, session, options = {}) {
        const lastOpenedId = session?.tracking?.lastOpenedId || '';
        const currentSignature = compactText(options.currentSignature || '');
        const pinCurrent = options.pinCurrent !== false && !!session?.tracking?.pinCurrent;
        const arr = list.slice();
        const byName = (a, b) => String(getTrackingDisplayTitle(a) || '').localeCompare(String(getTrackingDisplayTitle(b) || ''), 'zh-Hans-CN');
        const byTime = (key) => (a, b) => String(b?.[key] || '').localeCompare(String(a?.[key] || ''));
        const isCurrent = (record) => !!(currentSignature && record?.query_signature === currentSignature);
        let sorted;
        if (sortKey === 'name') sorted = arr.sort(byName);
        else if (sortKey === 'last_browsed') sorted = arr.sort(byTime('last_browsed_at'));
        else if (sortKey === 'last_opened') {
            sorted = arr.sort((a, b) => {
                if (a.id === lastOpenedId) return -1;
                if (b.id === lastOpenedId) return 1;
                return byTime('last_browsed_at')(a, b);
            });
        } else {
            // updates_first
            sorted = arr.sort((a, b) => {
                const au = trackingRecordHasUpdate(a) ? 1 : 0;
                const bu = trackingRecordHasUpdate(b) ? 1 : 0;
                if (au !== bu) return bu - au;
                return byTime('last_check_at')(a, b) || byName(a, b);
            });
        }
        if (pinCurrent && currentSignature) {
            sorted.sort((a, b) => Number(isCurrent(b)) - Number(isCurrent(a)));
        }
        return sorted;
    }

    async function prepareTrackingRecordNavigation(record, targetUrl) {
        const targetMode = resolveTrackingSearchMode(record, parseTrackingUrl(targetUrl || record.open_url || ''));
        const targetPageHint = targetMode === 'backfill'
            ? (Number(record.last_seen_page_hint || record.top_page_hint || record.last_browsed_page_hint || 0) || 1)
            : (Number(getCurrentListPageHint(targetUrl) || 0) || 1);
        record.last_browsed_at = new Date().toISOString();
        record.last_browsed_page_hint = targetPageHint;

        if (isJavLibraryResolvableSearchUrl(record.page_url || record.open_url || targetUrl || '')) {
            let searchQuery = getTrackingSearchQuery(record);
            if (!searchQuery) {
                searchQuery = promptTrackingSearchQuery(record);
                if (searchQuery == null) return { ok: false, cancelled: true };
            }
            searchQuery = compactText(searchQuery || '');
            if (!searchQuery) {
                showAlert('原搜索词不能为空。');
                return { ok: false };
            }
            applyTrackingSearchQuery(record, searchQuery);
            const resolved = await resolveJavLibrarySearchUrl(record, {
                keyword: searchQuery,
                pageHint: targetPageHint
            });
            if (!resolved.ok || !resolved.url) {
                await saveTrackingRecord(record);
                showAlert('重新生成 JavLibrary 搜索失败：' + (resolved.error || '未知错误'));
                return { ok: false };
            }
            record.open_url = resolved.url;
            await saveTrackingRecord(record);
            return { ok: true, url: resolved.url };
        }

        await saveTrackingRecord(record);
        return { ok: true, url: targetUrl };
    }

    async function openTrackingRecordFromWorkbench(record, options = {}) {
        if (!record) return;
        const session = getWorkbenchSession();
        const openMode = options.mode || session.openMode || config.open_mode || 'tab';
        const targetUrl = buildTrackingNavigationUrl(record) || record.open_url;
        if (!targetUrl) {
            showAlert('没有可打开的地址。');
            return;
        }

        const openedAt = new Date().toISOString();
        // 本机 UI 高亮（不同步）+ 可同步浏览时间（进 tracking 记录 / WebDAV）
        persistWorkbenchSession({
            panelOpen: false,
            settingsOpen: false,
            nav: 'tracking',
            tracking: {
                focusRecordId: record.id,
                lastOpenedId: record.id,
                lastOpenedAt: openedAt
            }
        });
        // 先落盘 last_browsed_at，避免只改了 session 导致其它设备永远看不到「上次」
        try {
            record.last_browsed_at = openedAt;
            await saveTrackingRecord(record);
        } catch (_) { /* prepare 里还会再写一次 */ }
        try { closeWorkbenchV3(); } catch (_) {}

        const prepared = await prepareTrackingRecordNavigation(record, targetUrl);
        if (!prepared.ok) return;
        const url = prepared.url;
        if (openMode === 'tab') {
            const opened = window.open(url, '_blank', 'noopener');
            if (!opened) {
                showAlert('浏览器拦截了新标签，已改为本页打开。');
                location.href = url;
                return;
            }
            showAlert('已在新标签打开，列表位置已保留。');
            void renderWorkbenchTrackingList();
            return;
        }
        location.href = url;
    }

    async function renderWorkbenchTrackingList(options = {}) {
        const root = document.getElementById('jlc-wb-tracking-root');
        if (!root) return;
        // 整表 innerHTML 会把 scrollTop 清零；先记下当前滚动，渲染后再写回
        const prevScroller = root.querySelector('#jlc-wb-list-scroll');
        const preservedScrollTop = prevScroller
            ? (prevScroller.scrollTop || 0)
            : (Number(getWorkbenchSession().scrollTops?.tracking || 0) || 0);
        const session = getWorkbenchSession();
        const context = getCurrentTrackingPageContext();
        const currentSignature = context?.query_signature || '';
        const allRecords = (await getTrackingSearches()).filter(record => !record.archived);
        let list = allRecords.slice();

        const query = compactText(session.tracking.query || '').toLowerCase();
        const groupFilter = session.tracking.groupFilter || 'all';
        if (session.tracking.filterUpdatesOnly) {
            list = list.filter(trackingRecordHasUpdate);
        }
        if (groupFilter && groupFilter !== 'all') {
            list = list.filter(record => getTrackingEffectiveGroupType(record) === groupFilter);
        }
        if (query) {
            list = list.filter(record => {
                const hay = [
                    getTrackingDisplayTitle(record),
                    record.top_avid,
                    record.last_seen_avid,
                    record.custom_label,
                    record.site,
                    getSiteLabel(record.site)
                ].map(x => String(x || '').toLowerCase()).join(' ');
                return hay.includes(query);
            });
        }

        list = sortTrackingRecordsForWorkbench(list, session.tracking.sort || 'updates_first', session, {
            currentSignature,
            pinCurrent: session.tracking.pinCurrent !== false
        });
        const updateCount = list.filter(trackingRecordHasUpdate).length;
        const allUpdateCount = allRecords.filter(trackingRecordHasUpdate).length;
        updateWorkbenchFabBadge(allUpdateCount);
        const headerSub = document.getElementById('jlc-wb-header-sub');
        if (headerSub) {
            headerSub.textContent = '更新 ' + allUpdateCount + ' · 共 ' + allRecords.length;
        }

        const refreshRuntime = getTrackingRefreshRuntimeState();
        const runtimeSummary = buildTrackingRefreshRuntimeSummary(refreshRuntime);
        const runtimeButtonText = buildTrackingRefreshRuntimeButtonText(refreshRuntime);
        const refreshResume = getTrackingRefreshResumeState();
        const resumePendingIds = Array.isArray(refreshResume?.pending_ids)
            ? refreshResume.pending_ids.filter(id => list.some(record => record.id === id))
            : [];
        const collapsedState = getTrackingUiState().collapsed || {};
        const focusId = session.tracking.focusRecordId || session.tracking.lastOpenedId || '';

        const groups = new Map();
        list.forEach(record => {
            const key = getTrackingEffectiveGroupType(record);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(record);
        });
        const orderedGroups = Array.from(groups.entries()).sort((a, b) => {
            const aIndex = TRACKING_GROUP_ORDER.indexOf(a[0]);
            const bIndex = TRACKING_GROUP_ORDER.indexOf(b[0]);
            const normalizedA = aIndex === -1 ? TRACKING_GROUP_ORDER.length : aIndex;
            const normalizedB = bIndex === -1 ? TRACKING_GROUP_ORDER.length : bIndex;
            return normalizedA - normalizedB || String(a[0]).localeCompare(String(b[0]));
        });

        const flatRows = [];
        orderedGroups.forEach(([groupType, records]) => {
            const groupKey = 'group_' + groupType;
            const collapsed = !!collapsedState[groupKey];
            flatRows.push({ type: 'group', groupType, groupKey, records, collapsed, height: WB_VIRT_GROUP_H });
            if (!collapsed) {
                records.forEach(record => {
                    flatRows.push({ type: 'item', record, groupKey, height: WB_VIRT_ITEM_H });
                });
            }
        });

        const footerSummary = document.getElementById('jlc-wb-footer-summary');
        if (footerSummary) {
            footerSummary.textContent = runtimeSummary
                || ('筛选 ' + list.length + ' 项' + (updateCount ? ' · ' + updateCount + ' 有更新' : ''));
        }
        const refreshAllBtn = document.getElementById('jlc-wb-refresh-all');
        if (refreshAllBtn) {
            refreshAllBtn.disabled = !!refreshRuntime;
            refreshAllBtn.textContent = runtimeButtonText;
        }

        const useVirtual = list.length >= WB_VIRT_THRESHOLD;
        const toolbarHtml = ''
            + '<div class="jlc-wb-toolbar">'
            + '  <div class="jlc-wb-toolbar-row">'
            + '    <input class="jlc-wb-search" id="jlc-wb-tracking-query" type="search" placeholder="搜索标题 / 番号 / 备注…" value="' + escapeHtml(session.tracking.query || '') + '">'
            + '  </div>'
            + '  <div class="jlc-wb-toolbar-row">'
            + '    <button type="button" class="jlc-wb-chip' + (session.tracking.filterUpdatesOnly ? ' is-on' : '') + '" data-jlc-wb-filter-updates>仅有更新</button>'
            + '    <button type="button" class="jlc-wb-chip' + (session.tracking.pinCurrent !== false ? ' is-on' : '') + '" data-jlc-wb-pin-current>当前页置顶</button>'
            + '    <select class="jlc-wb-select" id="jlc-wb-group-filter">'
            + '      <option value="all"' + (groupFilter === 'all' ? ' selected' : '') + '>全部分组</option>'
            + TRACKING_GROUP_ORDER.map(key => '<option value="' + key + '"' + (groupFilter === key ? ' selected' : '') + '>' + escapeHtml(getTrackingGroupLabel(key)) + '</option>').join('')
            + '    </select>'
            + '    <select class="jlc-wb-select" id="jlc-wb-sort">'
            + '      <option value="updates_first"' + (session.tracking.sort === 'updates_first' ? ' selected' : '') + '>有更新优先</option>'
            + '      <option value="last_opened"' + (session.tracking.sort === 'last_opened' ? ' selected' : '') + '>最近打开</option>'
            + '      <option value="last_browsed"' + (session.tracking.sort === 'last_browsed' ? ' selected' : '') + '>最近浏览</option>'
            + '      <option value="name"' + (session.tracking.sort === 'name' ? ' selected' : '') + '>名称</option>'
            + '    </select>'
            + '    <button type="button" class="jlc-wb-chip" data-jlc-wb-continue>继续上次</button>'
            + '  </div>'
            + (resumePendingIds.length
                ? '  <div class="jlc-wb-toolbar-row" style="color:#fde68a;font-size:12px;">刷新已暂停 · 待验证后继续 ' + resumePendingIds.length + ' 项'
                + '    <button type="button" class="jlc-wb-btn ghost" data-jlc-wb-open-verify>去验证</button>'
                + '    <button type="button" class="jlc-wb-btn ghost" data-jlc-wb-resume>验证后继续</button></div>'
                : '')
            + (useVirtual ? '  <div class="jlc-wb-toolbar-row" style="color:#93c5fd;font-size:11px;">虚拟列表已启用（' + list.length + ' 项）</div>' : '')
            + '</div>';

        const emptyHtml = '<div class="jlc-wb-empty">' + (context ? '没有匹配的追更项。可点底部「收藏当前搜索」。' : '还没有追更项，先在列表页收藏一个搜索吧。') + '</div>';

        if (!flatRows.length) {
            root.innerHTML = toolbarHtml + '<div class="jlc-wb-list-scroll" id="jlc-wb-list-scroll">' + emptyHtml + '</div>';
        } else if (!useVirtual) {
            const groupMarkup = orderedGroups.map(([groupType, records]) => {
                const groupKey = 'group_' + groupType;
                const collapsed = !!collapsedState[groupKey];
                const hasUpdate = records.filter(trackingRecordHasUpdate).length;
                const rows = collapsed ? '' : records.map(record => buildWorkbenchTrackingItemHtml(record, session, context, currentSignature, focusId)).join('');
                return ''
                    + '<section class="jlc-wb-group' + (collapsed ? ' collapsed' : '') + '" data-jlc-group="' + escapeHtml(groupKey) + '">'
                    + '  <button type="button" class="jlc-wb-group-toggle" data-jlc-toggle-group="' + escapeHtml(groupKey) + '">'
                    + '    <span>' + escapeHtml(getTrackingGroupLabel(groupType)) + (hasUpdate ? '（' + hasUpdate + ' 更新）' : '') + '</span>'
                    + '    <small>' + records.length + ' 项</small>'
                    + '  </button>'
                    + '  <div class="jlc-wb-group-body">' + rows + '</div>'
                    + '</section>';
            }).join('');
            root.innerHTML = toolbarHtml + '<div class="jlc-wb-list-scroll" id="jlc-wb-list-scroll">' + groupMarkup + '</div>';
        } else {
            root.innerHTML = toolbarHtml + '<div class="jlc-wb-list-scroll" id="jlc-wb-list-scroll"><div class="jlc-wb-virt" id="jlc-wb-virt"><div class="jlc-wb-virt-window" id="jlc-wb-virt-window"></div></div></div>';
            const body = document.querySelector('#jlc-wb .jlc-wb-body');
            const virt = root.querySelector('#jlc-wb-virt');
            const windowEl = root.querySelector('#jlc-wb-virt-window');
            const offsets = [];
            let totalH = 0;
            flatRows.forEach(row => {
                offsets.push(totalH);
                totalH += row.height;
            });
            virt.style.height = totalH + 'px';
            workbenchVirtState = { flatRows, offsets, totalH, session, context, currentSignature, focusId };

            const paint = () => {
                if (!workbenchVirtState || !body || !windowEl) return;
                const scrollTop = body.scrollTop || 0;
                const viewH = body.clientHeight || 600;
                const pad = 400;
                const startY = Math.max(0, scrollTop - pad);
                const endY = scrollTop + viewH + pad;
                let start = 0;
                while (start < offsets.length - 1 && offsets[start + 1] < startY) start += 1;
                let end = start;
                while (end < offsets.length && offsets[end] < endY) end += 1;
                end = Math.min(flatRows.length, end + 1);
                const slice = flatRows.slice(start, end);
                const top = offsets[start] || 0;
                windowEl.style.transform = 'translateY(' + top + 'px)';
                windowEl.innerHTML = slice.map(row => {
                    if (row.type === 'group') {
                        return '<div class="jlc-wb-virt-row is-group" style="height:' + row.height + 'px">' + buildWorkbenchGroupHeaderHtml(row.groupType, row.records, collapsedState) + '</div>';
                    }
                    return '<div class="jlc-wb-virt-row" style="min-height:' + row.height + 'px">' + buildWorkbenchTrackingItemHtml(row.record, session, context, currentSignature, focusId) + '</div>';
                }).join('');
                // 只绑可视窗口内节点，避免滚动重绘时在 toolbar 上叠监听
                bindWorkbenchTrackingActions(windowEl, list, context, resumePendingIds, refreshResume);
                const sampleItem = windowEl.querySelector('.jlc-wb-item');
                const sampleGroup = windowEl.querySelector('.jlc-wb-group-toggle');
                let changed = false;
                if (sampleItem) {
                    const h = Math.ceil(sampleItem.getBoundingClientRect().height) + 10;
                    if (h > 60 && Math.abs(h - WB_VIRT_ITEM_H) > 2) { WB_VIRT_ITEM_H = h; changed = true; }
                }
                if (sampleGroup) {
                    const gh = Math.ceil(sampleGroup.getBoundingClientRect().height) + 10;
                    if (gh > 30 && Math.abs(gh - WB_VIRT_GROUP_H) > 2) { WB_VIRT_GROUP_H = gh; changed = true; }
                }
                if (changed && !virt.dataset.calibrated) {
                    virt.dataset.calibrated = '1';
                    let nh = 0;
                    const noff = [];
                    flatRows.forEach(row => {
                        row.height = row.type === 'group' ? WB_VIRT_GROUP_H : WB_VIRT_ITEM_H;
                        noff.push(nh);
                        nh += row.height;
                    });
                    workbenchVirtState.offsets = noff;
                    workbenchVirtState.totalH = nh;
                    virt.style.height = nh + 'px';
                    paint();
                }
            };

            if (body && body.dataset.jlcVirtBound !== '1') {
                body.dataset.jlcVirtBound = '1';
                body.addEventListener('scroll', () => {
                    if (workbenchVirtState) paint();
                    scheduleWorkbenchScrollSave();
                }, { passive: true });
            }
            paint();
        }

        const queryInput = root.querySelector('#jlc-wb-tracking-query');
        queryInput?.addEventListener('input', () => {
            persistWorkbenchSession({ tracking: { query: queryInput.value || '' } });
            window.clearTimeout(queryInput._jlcTimer);
            queryInput._jlcTimer = window.setTimeout(() => { void renderWorkbenchTrackingList(); }, 180);
        });
        root.querySelector('[data-jlc-wb-filter-updates]')?.addEventListener('click', () => {
            persistWorkbenchSession({ tracking: { filterUpdatesOnly: !session.tracking.filterUpdatesOnly } });
            void renderWorkbenchTrackingList();
        });
        root.querySelector('[data-jlc-wb-pin-current]')?.addEventListener('click', () => {
            persistWorkbenchSession({ tracking: { pinCurrent: session.tracking.pinCurrent === false } });
            void renderWorkbenchTrackingList();
        });
        root.querySelector('#jlc-wb-group-filter')?.addEventListener('change', (e) => {
            persistWorkbenchSession({ tracking: { groupFilter: e.target.value || 'all' } });
            void renderWorkbenchTrackingList();
        });
        root.querySelector('#jlc-wb-sort')?.addEventListener('change', (e) => {
            persistWorkbenchSession({ tracking: { sort: e.target.value || 'updates_first' } });
            void renderWorkbenchTrackingList();
        });
        root.querySelector('[data-jlc-wb-continue]')?.addEventListener('click', () => {
            const id = session.tracking.focusRecordId || session.tracking.lastOpenedId || '';
            if (!id) {
                showAlert('还没有上次打开记录。');
                return;
            }
            persistWorkbenchSession({ tracking: { focusRecordId: id } });
            const row = root.querySelector('[data-jlc-wb-id="' + CSS.escape(id) + '"]');
            if (row) {
                row.classList.add('is-focus');
                row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                return;
            }
            showAlert('上次打开的项不在当前筛选结果里。');
        });

        if (!useVirtual) {
            bindWorkbenchTrackingActions(root, list, context, resumePendingIds, refreshResume);
        } else {
            // 虚拟模式下条目动作在 paint 内绑定；工具条验证/续刷绑在 root
            root.querySelector('[data-jlc-wb-open-verify]')?.addEventListener('click', () => {
                const verifyRecord = list.find(record => record.id === refreshResume?.record_id)
                    || list.find(record => resumePendingIds.includes(record.id));
                const verifyUrl = compactText(refreshResume?.verify_url || '') || buildTrackingVerifyUrl(verifyRecord);
                if (!verifyUrl) {
                    showAlert('当前没有可打开的验证页面。');
                    return;
                }
                openTrackingVerificationUrl(verifyUrl, { fallbackToNavigate: true });
            });
            root.querySelector('[data-jlc-wb-resume]')?.addEventListener('click', async (event) => {
                if (!resumePendingIds.length) {
                    clearTrackingRefreshResumeState();
                    await renderWorkbenchTrackingList();
                    return;
                }
                const verifyRecord = list.find(record => record.id === refreshResume?.record_id)
                    || list.find(record => resumePendingIds.includes(record.id));
                const verifyUrl = compactText(refreshResume?.verify_url || '') || buildTrackingVerifyUrl(verifyRecord);
                const probe = await probeTrackingVerificationReady(verifyRecord, verifyUrl);
                if (!probe.ok) {
                    if (verifyUrl) openTrackingVerificationUrl(verifyUrl);
                    showAlert((probe.note || '验证尚未生效') + '，请在打开的 JavLibrary 页面完成验证后再点继续。');
                    return;
                }
                clearTrackingRefreshResumeState();
                if (verifyRecord) {
                    clearTrackingVerificationRequired(verifyRecord, { restoreStatus: true });
                    await saveTrackingRecord(verifyRecord);
                }
                void refreshAllTrackingSearches(event.currentTarget, {
                    recordIds: resumePendingIds,
                    total: Number(refreshResume?.total || 0) || resumePendingIds.length,
                    completedBase: Number(refreshResume?.completed || 0) || 0,
                    resumeVerified: true
                });
            });
        }
        const listScroll = root.querySelector('#jlc-wb-list-scroll');
        if (listScroll) {
            // 整表重绘后立刻写回滚动，避免先闪回顶部再被 restore 抢位置
            listScroll.scrollTop = preservedScrollTop;
            if (listScroll.dataset.boundScroll !== '1') {
                listScroll.dataset.boundScroll = '1';
                listScroll.addEventListener('scroll', () => {
                    markWorkbenchListScrolling();
                    scheduleWorkbenchScrollSave();
                }, { passive: true });
            }
        }
        const highlightId = session.tracking.focusRecordId || session.tracking.lastOpenedId || '';
        if (highlightId) {
            root.querySelector('[data-jlc-wb-id="' + CSS.escape(highlightId) + '"]')?.classList.add('is-focus');
        }
        if (options.forceFocus && options.focusId) {
            restoreWorkbenchScroll({
                scrollTop: preservedScrollTop,
                forceFocus: true,
                focusId: options.focusId,
                scrollIntoFocus: true
            });
        }
    }

    function renderWorkbenchViewSettings() {
        const container = document.getElementById('jlc-wb-view-root');
        if (!container) return;
        const items = getLegacySettingsSchema().filter(item => item.type !== 'button');
        const toggles = items.filter(item => item.type === 'toggle');
        const layoutRanges = items.filter(item => item.type === 'range' && (item.key === 'columnNum' || item.key === 'waterfallWidth'));
        const uiRanges = items.filter(item => item.type === 'range' && item.key === 'uiBtnScale');
        const openMode = getWorkbenchSession().openMode || config.open_mode || 'tab';

        const renderRangeRow = (item) => {
            const value = item.key === 'columnNum' ? Status.getColumnNum()
                : item.key === 'uiBtnScale' ? clampUiBtnScale(Status.get(item.key))
                : Status.get(item.key);
            const step = item.step != null ? item.step : 1;
            return ''
                + '<div class="legacy-row">'
                + '  <div style="display:flex;justify-content:space-between;margin-bottom:6px;align-items:center;"><span>' + escapeHtml(item.label) + '</span><b style="color:#d4883a" data-jlc-wb-range-value="' + escapeHtml(item.key) + '">' + value + '</b></div>'
                + '  <div class="legacy-range"><input type="range" data-jlc-wb-range="' + escapeHtml(item.key) + '" min="' + item.min + '" max="' + item.max + '" step="' + step + '" value="' + value + '"></div>'
                + (item.key === 'uiBtnScale' ? '<div class="legacy-note" style="margin-top:6px;">只缩放工作台按钮与悬浮球，列表封面/文字不变。笔记本可试 80–90。</div>' : '')
                + '</div>';
        };

        // 与设置其它页一致：直接 h3 + legacy-row，不再套 view-block 卡片
        container.innerHTML = ''
            + '<h3>列表功能</h3>'
            + toggles.map(item => ''
                + '<div class="legacy-row legacy-toggle' + (item.disabled ? ' disabled' : '') + '">'
                + '  <span>' + escapeHtml(item.label) + '</span>'
                + '  <input type="checkbox" data-jlc-wb-toggle="' + escapeHtml(item.key) + '"' + (Status.get(item.key) ? ' checked' : '') + (item.disabled ? ' disabled' : '') + '>'
                + '</div>').join('')
            + '<h3 style="margin-top:16px">布局</h3>'
            + layoutRanges.map(renderRangeRow).join('')
            + '<h3 style="margin-top:16px">工作台</h3>'
            + uiRanges.map(renderRangeRow).join('')
            + '<div class="legacy-row" style="margin-top:4px;">'
            + '  <div style="margin-bottom:6px;">默认打开方式</div>'
            + '  <select id="jlc-wb-view-open-mode" class="jlc-wb-select" style="width:100%;">'
            + '    <option value="tab"' + (openMode === 'tab' ? ' selected' : '') + '>新标签打开</option>'
            + '    <option value="same"' + (openMode === 'same' ? ' selected' : '') + '>本页打开</option>'
            + '  </select>'
            + '</div>'
            + '<button type="button" class="jlc-wb-btn ghost" data-jlc-wb-action="downloadPanel" style="width:100%;margin-top:8px;">批量下载封面</button>';

        container.querySelectorAll('[data-jlc-wb-toggle]').forEach(input => {
            input.addEventListener('change', () => {
                const key = input.getAttribute('data-jlc-wb-toggle');
                Status.set(key, !!input.checked);
                legacySettingHandlers[key]?.(!!input.checked);
            });
        });
        container.querySelectorAll('[data-jlc-wb-range]').forEach(input => {
            input.addEventListener('input', () => {
                const key = input.getAttribute('data-jlc-wb-range');
                let value = Number(input.value);
                if (key === 'uiBtnScale') value = clampUiBtnScale(value);
                const valueEl = container.querySelector('[data-jlc-wb-range-value="' + CSS.escape(key) + '"]');
                if (valueEl) valueEl.textContent = String(value);
                if (key === 'columnNum') Status.set('columnNum', value);
                else Status.set(key, value);
                legacySettingHandlers[key]?.(value);
            });
        });
        container.querySelectorAll('[data-jlc-wb-action]').forEach(button => {
            button.addEventListener('click', () => {
                const key = button.getAttribute('data-jlc-wb-action');
                legacySettingHandlers[key]?.();
            });
        });
        container.querySelector('#jlc-wb-view-open-mode')?.addEventListener('change', (e) => {
            const next = e.currentTarget.value === 'same' ? 'same' : 'tab';
            config.open_mode = next;
            GM_setValue('jlc_config_stable', config);
            persistWorkbenchSession({ openMode: next });
            updateWorkbenchOpenModeChip();
        });
    }

    function syncWorkbenchSettingsForm() {
        const shell = getWorkbenchEl();
        if (!shell) return;
        // 每次打开都从内存 config 回填，避免密码框/隐藏分区导致“看起来没加载”
        config = loadConfig();
        const url = shell.querySelector('#jlc-wb-i-url');
        const key = shell.querySelector('#jlc-wb-i-key');
        const mt = shell.querySelector('#jlc-wb-i-mt');
        const fav = shell.querySelector('#jlc-wb-i-fav');
        if (url) url.value = config.emby_url || '';
        if (mt) mt.value = config.metatube_url || '';
        if (fav) fav.value = (config.fav_tags || []).join(', ');
        const hiddenSummary = shell.querySelector('#jlc-wb-hidden-summary');
        if (hiddenSummary) {
            try {
                const hiddenWords = Status.get('hiddenWord') || [];
                const hiddenAvids = Status.get('hiddenAvid') || [];
                hiddenSummary.textContent = '屏蔽标题词 ' + hiddenWords.length + ' 个 / 屏蔽番号 ' + hiddenAvids.length + ' 个';
            } catch (_) {
                hiddenSummary.textContent = '屏蔽词状态读取失败';
            }
        }
        if (key) {
            // 已保存密钥时不回填到 password（部分浏览器会丢隐藏 password 值），用占位提示
            if (compactText(config.emby_key || '')) {
                key.value = '';
                key.placeholder = '已保存密钥（留空=不修改，输入新值则覆盖）';
                key.dataset.hasSaved = '1';
            } else {
                key.value = '';
                key.placeholder = '粘贴 Emby API Key';
                key.dataset.hasSaved = '0';
            }
            key.dataset.userEdited = '0';
        }
        const openMode = shell.querySelector('#jlc-wb-open-mode');
        if (openMode) openMode.value = (getWorkbenchSession().openMode || config.open_mode || 'tab');
        const wdUrl = shell.querySelector('#jlc-wb-wd-url');
        const wdUser = shell.querySelector('#jlc-wb-wd-user');
        const wdPass = shell.querySelector('#jlc-wb-wd-pass');
        const wdPath = shell.querySelector('#jlc-wb-wd-path');
        const wdEn = shell.querySelector('#jlc-wb-wd-en');
        const wdAuto = shell.querySelector('#jlc-wb-wd-auto');
        const wdConf = shell.querySelector('#jlc-wb-wd-conflict');
        const wdStatus = shell.querySelector('#jlc-wb-wd-status');
        if (wdUrl) wdUrl.value = config.webdav_url || '';
        if (wdUser) wdUser.value = config.webdav_user || '';
        if (wdPath) wdPath.value = config.webdav_path || '/Creamu';
        if (wdPass) {
            wdPass.value = '';
            wdPass.placeholder = compactText(config.webdav_password || '')
                ? '已保存（留空不修改）'
                : '应用密码，非登录密码';
        }
        if (wdEn) wdEn.checked = !!config.webdav_enabled;
        if (wdAuto) wdAuto.checked = config.webdav_auto !== false;
        if (wdConf) wdConf.value = config.webdav_conflict || 'ask';
        if (wdStatus) {
            const sync = ensureCreamuSync();
            wdStatus.textContent = sync ? sync.statusText() : '同步模块未加载';
        }
        const resourceKeys = ['resource_center', 'resource_trailer', 'resource_screenshot', 'resource_screenshot_auto', 'resource_magnet', 'resource_links'];
        resourceKeys.forEach(k => {
            const input = shell.querySelector('[data-jlc-wb-resource="' + k + '"]');
            if (input) input.checked = config[k] !== false;
        });
        const hint = shell.querySelector('#jlc-wb-config-hint');
        if (hint) {
            if (isLikelyFreshDefaultConfig(config)) {
                hint.hidden = false;
                hint.textContent = '当前像是空配置（默认心动标签、无 Emby）。若以前用过旧版脚本，这通常是因为新脚本有独立存储：请到旧脚本导出备份，再在 设置 → 备份 里导入。';
            } else {
                hint.hidden = true;
                hint.textContent = '';
            }
        }
        updateWorkbenchConfigDiag();
    }

    function activateWorkbenchSettingsTab(tabId = 'resource') {
        const shell = getWorkbenchEl();
        if (!shell) return;
        const next = normalizeWorkbenchSettingsTab(tabId);
        shell.querySelectorAll('[data-jlc-settings-tab]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-jlc-settings-tab') === next);
        });
        shell.querySelectorAll('[data-jlc-settings-panel]').forEach(panel => {
            panel.classList.toggle('is-active', panel.getAttribute('data-jlc-settings-panel') === next);
        });
        persistWorkbenchSession({ settingsSection: next });
        // 含密码字段的页再回填一次，避免 password 空显示
        if (next === 'services' || next === 'backup') syncWorkbenchSettingsForm();
        if (next === 'display') renderWorkbenchViewSettings();
        const body = shell.querySelector('.jlc-wb-settings-body');
        if (body) body.scrollTop = 0;
    }

    function bindWorkbenchSettingsEvents(shell) {
        shell.querySelectorAll('[data-jlc-settings-tab]').forEach(btn => {
            btn.addEventListener('click', () => activateWorkbenchSettingsTab(btn.getAttribute('data-jlc-settings-tab') || 'resource'));
        });
        shell.querySelector('#jlc-wb-settings-close')?.addEventListener('click', () => setWorkbenchSettingsOpen(false));
        shell.querySelector('.jlc-wb-settings')?.addEventListener('click', (e) => {
            if (e.target?.classList?.contains('jlc-wb-settings')) setWorkbenchSettingsOpen(false);
        });
        shell.querySelector('#jlc-wb-i-key')?.addEventListener('input', (e) => {
            e.currentTarget.dataset.userEdited = '1';
        });
        shell.querySelector('#jlc-wb-btn-save')?.addEventListener('click', async () => {
            // 先读回最新 config，防止空 password 覆盖密钥
            const previous = loadConfig();
            const urlVal = shell.querySelector('#jlc-wb-i-url')?.value.trim().replace(/\/$/, '') || '';
            const keyEl = shell.querySelector('#jlc-wb-i-key');
            const keyTyped = keyEl?.value.trim() || '';
            const mtVal = shell.querySelector('#jlc-wb-i-mt')?.value.trim().replace(/\/$/, '') || '';
            const favRaw = shell.querySelector('#jlc-wb-i-fav')?.value;
            const favList = String(favRaw ?? '').split(',').map(s => s.trim()).filter(Boolean);

            config.emby_url = urlVal;
            // 密钥：留空且已有保存值 => 不改；用户输入了才覆盖
            if (keyTyped) {
                config.emby_key = keyTyped;
            } else if (previous.emby_key) {
                config.emby_key = previous.emby_key;
            } else {
                config.emby_key = '';
            }
            config.metatube_url = mtVal;
            // 心动标签：只要 textarea 存在就采用其内容（允许用户清空）
            if (shell.querySelector('#jlc-wb-i-fav')) {
                config.fav_tags = favList;
            }
            // 打开方式：优先设置/显示页下拉，否则沿用 session / 已有 config
            const openModeEl = shell.querySelector('#jlc-wb-open-mode') || shell.querySelector('#jlc-wb-view-open-mode');
            const openMode = openModeEl
                ? (openModeEl.value === 'same' ? 'same' : 'tab')
                : ((getWorkbenchSession().openMode || config.open_mode || previous.open_mode || 'tab') === 'same' ? 'same' : 'tab');
            config.open_mode = openMode;
            ['resource_center', 'resource_trailer', 'resource_screenshot', 'resource_screenshot_auto', 'resource_magnet', 'resource_links'].forEach(k => {
                const input = shell.querySelector('[data-jlc-wb-resource="' + k + '"]');
                if (input) config[k] = !!input.checked;
            });
            config.webdav_url = (shell.querySelector('#jlc-wb-wd-url')?.value || '').trim();
            config.webdav_user = (shell.querySelector('#jlc-wb-wd-user')?.value || '').trim();
            config.webdav_path = (shell.querySelector('#jlc-wb-wd-path')?.value || '').trim() || '/Creamu';
            const wdPassTyped = shell.querySelector('#jlc-wb-wd-pass')?.value || '';
            if (wdPassTyped) config.webdav_password = wdPassTyped;
            config.webdav_enabled = !!shell.querySelector('#jlc-wb-wd-en')?.checked;
            config.webdav_auto = !!shell.querySelector('#jlc-wb-wd-auto')?.checked;
            config.webdav_conflict = shell.querySelector('#jlc-wb-wd-conflict')?.value || 'ask';
            GM_setValue('jlc_config_stable', config);
            if (previous.metatube_url !== config.metatube_url) clearMetaMissCache();
            persistWorkbenchSession({ openMode });
            try { ensureCreamuSync()?.markLocalDirty(); } catch (_) {}
            await loadRadarData();
            await refreshLibraryUI();
            refreshCommanderDecorations();
            renderDetailResourceCenter(true);
            syncWorkbenchSettingsForm();
            showAlert('设置已保存并应用！');
        });
        shell.querySelector('#jlc-wb-btn-sync')?.addEventListener('click', () => { void syncEmby(); });
        shell.querySelector('#jlc-wb-btn-rescan')?.addEventListener('click', () => {
            refreshCommanderDecorations(document, { clearMetaMisses: true });
            renderDetailResourceCenter(true);
            showAlert('已重新扫描当前页！');
        });
        shell.querySelector('#jlc-wb-btn-export')?.addEventListener('click', exportBackup);
        shell.querySelector('#jlc-wb-btn-export-config')?.addEventListener('click', () => { void exportConfigOnly(); });
        shell.querySelector('#jlc-wb-btn-import')?.addEventListener('click', () => { void importBackup({ mode: 'full' }); });
        shell.querySelector('#jlc-wb-btn-import-config')?.addEventListener('click', () => { void importBackup({ mode: 'config' }); });
        shell.querySelector('#jlc-wb-btn-integrity')?.addEventListener('click', () => {
            if (typeof showDataIntegrityReport === 'function') void showDataIntegrityReport();
            else showAlert('检查功能未就绪', true);
        });
        // 屏蔽词已内联在「过滤」主 Tab，不再跳转 TabPanel

        const applyWdFormToConfig = () => {
            config.webdav_url = (shell.querySelector('#jlc-wb-wd-url')?.value || '').trim();
            config.webdav_user = (shell.querySelector('#jlc-wb-wd-user')?.value || '').trim();
            config.webdav_path = (shell.querySelector('#jlc-wb-wd-path')?.value || '').trim() || '/Creamu';
            const typed = shell.querySelector('#jlc-wb-wd-pass')?.value || '';
            if (typed) config.webdav_password = typed;
            config.webdav_enabled = !!shell.querySelector('#jlc-wb-wd-en')?.checked;
            config.webdav_auto = !!shell.querySelector('#jlc-wb-wd-auto')?.checked;
            config.webdav_conflict = shell.querySelector('#jlc-wb-wd-conflict')?.value || 'ask';
            GM_setValue('jlc_config_stable', config);
        };
        const refreshWdStatus = () => {
            const el = shell.querySelector('#jlc-wb-wd-status');
            const sync = ensureCreamuSync();
            if (el) el.textContent = sync ? sync.statusText() : '同步模块未加载';
        };
        shell.querySelector('#jlc-wb-wd-test')?.addEventListener('click', async () => {
            applyWdFormToConfig();
            const sync = ensureCreamuSync();
            if (!sync) return showAlert('同步模块未加载', true);
            try {
                await sync.testConnection();
                refreshWdStatus();
            } catch (e) {
                showAlert('测试失败：' + (e?.message || e), true);
                refreshWdStatus();
            }
        });
        shell.querySelector('#jlc-wb-wd-sync')?.addEventListener('click', async () => {
            applyWdFormToConfig();
            try {
                await ensureCreamuSync().syncNow({});
                refreshWdStatus();
            } catch (e) {
                showAlert('同步失败：' + (e?.message || e), true);
                refreshWdStatus();
            }
        });
        shell.querySelector('#jlc-wb-wd-push')?.addEventListener('click', async () => {
            applyWdFormToConfig();
            try {
                await ensureCreamuSync().syncNow({ force: 'push' });
                refreshWdStatus();
            } catch (e) {
                showAlert('推送失败：' + (e?.message || e), true);
            }
        });
        shell.querySelector('#jlc-wb-wd-pull')?.addEventListener('click', async () => {
            applyWdFormToConfig();
            try {
                await ensureCreamuSync().syncNow({ force: 'pull' });
                refreshWdStatus();
            } catch (e) {
                showAlert('拉取失败：' + (e?.message || e), true);
            }
        });
        shell.querySelector('#jlc-wb-btn-diag')?.addEventListener('click', () => {
            config = loadConfig();
            syncWorkbenchSettingsForm();
            updateWorkbenchConfigDiag();
            const d = describeLiveConfig();
            showAlert(
                '配置回读：\nEmby ' + (d.emby_url || '空')
                + '\n密钥 ' + (d.emby_key_len ? (d.emby_key_len + ' 位 ' + d.emby_key_preview) : '空')
                + '\n心动 ' + (d.fav_tags.join(' / ') || '空'),
                true
            );
        });
        shell.querySelector('#jlc-wb-btn-add-p')?.addEventListener('click', async () => {
            const input = shell.querySelector('#jlc-wb-i-new-p');
            const name = compactText(input?.value || '');
            if (!name || config.custom_persons.includes(name)) return;
            config.custom_persons.push(name);
            GM_setValue('jlc_config_stable', config);
            if (input) input.value = '';
            await loadRadarData();
            await refreshLibraryUI();
            refreshCommanderDecorations();
        });
    }

    function createWorkbenchV3() {
        initWorkbenchV3Styles();

        if (!document.getElementById('jlc-wb-fab')) {
            const fab = document.createElement('button');
            fab.id = 'jlc-wb-fab';
            fab.type = 'button';
            fab.title = 'Creamu · JavLibrary（可拖动）';
            fab.innerHTML = '<span>⌘</span><span class="jlc-wb-fab-badge">0</span>';
            document.body.appendChild(fab);
            bindWorkbenchFabDrag(fab);
        } else {
            bindWorkbenchFabDrag(document.getElementById('jlc-wb-fab'));
        }

        if (document.getElementById('jlc-wb')) return;

        const shell = document.createElement('div');
        shell.id = 'jlc-wb';
        shell.innerHTML = ''
            + '<div class="jlc-wb-resize-w" title="拖拽调整宽度"></div>'
            + '<div class="jlc-wb-resize-h" title="拖拽调整高度"></div>'
            + '<div class="jlc-wb-resize-corner" title="拖拽调整大小"></div>'
            + '<div class="jlc-wb-header" title="按住标题栏拖动窗口">'
            + '  <div><div class="jlc-wb-title">Creamu · JavLibrary</div><div class="jlc-wb-subtitle" id="jlc-wb-header-sub">加载中… · 可拖动</div></div>'
            + '  <div class="jlc-wb-header-actions">'
            + '    <button type="button" class="jlc-wb-chip" id="jlc-wb-open-mode-toggle" title="切换默认打开方式">新标签</button>'
            + '    <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-settings-btn" title="设置">⚙</button>'
            + '    <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-min-btn" title="收起">—</button>'
            + '    <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-close-btn" title="关闭">×</button>'
            + '  </div>'
            + '</div>'
            + '<div class="jlc-wb-nav">'
            + '  <button type="button" data-nav="tracking" class="active">追更</button>'
            + '  <button type="button" data-nav="library">库</button>'
            + '  <button type="button" data-nav="filter">过滤</button>'
            + '</div>'
            + '<div class="jlc-wb-body">'
            + '  <div data-jlc-wb-page="tracking"><div id="jlc-wb-tracking-root"></div></div>'
            + '  <div data-jlc-wb-page="library" hidden><div id="jlc-wb-library-root" style="padding:14px;overflow:auto;flex:1;min-height:0;">'
            + '    <div class="jlc-wb-view-block"><div class="jlc-wb-view-title">熟人与统计</div>'
            + '      <div class="stat-box"><div class="stat-item"><b id="jlc-wb-st-m">0</b><span>影片</span></div><div class="stat-item"><b id="jlc-wb-st-p">0</b><span>追踪</span></div><div class="stat-item"><b id="jlc-wb-st-v">0</b><span>已阅</span></div></div>'
            + '      <div class="legacy-note" style="margin:0 0 10px;">Emby 影片/熟人缓存统计；下方可手动加熟人。</div>'
            + '      <div style="display:flex;gap:6px;"><input id="jlc-wb-i-new-p" type="text" placeholder="手动添加演员/导演" style="flex:1"><button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-add-p">+</button></div>'
            + '      <div id="jlc-wb-person-list" style="margin-top:10px;"></div>'
            + '    </div></div></div>'
            + '  <div data-jlc-wb-page="filter" hidden><div id="jlc-wb-filter-root" style="padding:14px;overflow:auto;flex:1;min-height:0;">'
            + '    <div class="jlc-wb-view-block"><div class="jlc-wb-view-title">心动标签</div>'
            + '      <div class="legacy-note" style="margin:0 0 8px;">列表高亮你关心的标签。回车或失焦即保存。</div>'
            + '      <textarea id="jlc-wb-i-fav" rows="3" placeholder="女优, 巨乳, … 逗号分隔"></textarea>'
            + '    </div>'
            + '    <div class="jlc-wb-view-block"><div class="jlc-wb-view-title">屏蔽标题词</div>'
            + '      <div class="legacy-note" style="margin:0 0 8px;">标题含这些词会淡化/隐藏。回车添加，点 × 删除。</div>'
            + '      <div id="jlc-wb-tags-hidden-word" class="jlc-wb-tag-editor" data-key="hiddenWord" data-placeholder="输入词后回车，支持逗号批量"></div>'
            + '    </div>'
            + '    <div class="jlc-wb-view-block"><div class="jlc-wb-view-title">屏蔽番号</div>'
            + '      <div class="legacy-note" style="margin:0 0 8px;">单个或系列前缀，如 SSIS、OPX-123。</div>'
            + '      <div id="jlc-wb-tags-hidden-avid" class="jlc-wb-tag-editor" data-key="hiddenAvid" data-placeholder="输入番号后回车，支持逗号批量"></div>'
            + '    </div>'
            + '    <div class="legacy-note" id="jlc-wb-hidden-summary" style="margin:4px 0 0;">—</div>'
            + '  </div></div>'
            + '</div>'
            + '<div class="jlc-wb-footer">'
            + '  <div class="jlc-wb-footer-summary" id="jlc-wb-footer-summary">—</div>'
            + '  <div style="display:flex;gap:8px;flex-wrap:wrap;">'
            + '    <button type="button" class="jlc-wb-btn primary" id="jlc-wb-save-current">⭐ 收藏当前</button>'
            + '    <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-refresh-all">刷新全部</button>'
            + '    <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-sync-now" title="先同步 Emby，再推送 WebDAV（含点击/心动/追更/屏蔽词）">☁ 立即同步</button>'
            + '  </div>'
            + '</div>'
            + '<div class="jlc-wb-settings" id="jlc-wb-settings">'
            + '  <div class="jlc-wb-settings-panel">'
            + '    <div class="jlc-wb-settings-head">'
            + '      <strong>设置</strong>'
            + '      <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-settings-close">×</button>'
            + '    </div>'
            + '    <div class="jlc-wb-settings-nav" id="jlc-wb-settings-nav">'
            + '      <button type="button" data-jlc-settings-tab="resource" class="active">资源</button>'
            + '      <button type="button" data-jlc-settings-tab="display">显示</button>'
            + '      <button type="button" data-jlc-settings-tab="services">服务</button>'
            + '      <button type="button" data-jlc-settings-tab="backup">备份</button>'
            + '    </div>'
            + '    <div id="jlc-wb-config-hint" class="legacy-note" hidden style="margin:0;padding:10px 12px;background:#2a1f10;border-bottom:1px solid #5a4020;color:#fde68a;line-height:1.5;"></div>'
            + '    <div class="jlc-wb-settings-body">'
            // —— 资源：详情页增强 ——
            + '      <section class="jlc-wb-settings-section is-active" data-jlc-settings-panel="resource">'
            + '        <h3>详情页资源</h3>'
            + '        <div class="legacy-note" style="margin:0 0 10px;">控制详情页资源中心各模块，点底部「保存并应用」后生效。</div>'
            + '        <div class="legacy-row legacy-toggle"><span>详情页资源中心</span><input type="checkbox" data-jlc-wb-resource="resource_center"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>预告片模块</span><input type="checkbox" data-jlc-wb-resource="resource_trailer"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>截图模块</span><input type="checkbox" data-jlc-wb-resource="resource_screenshot"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>截图自动展开</span><input type="checkbox" data-jlc-wb-resource="resource_screenshot_auto"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>磁力模块</span><input type="checkbox" data-jlc-wb-resource="resource_magnet"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>站外链接</span><input type="checkbox" data-jlc-wb-resource="resource_links"></div>'
            + '      </section>'
            // —— 服务：Emby / MetaTube / WebDAV ——
            + '      <section class="jlc-wb-settings-section" data-jlc-settings-panel="services">'
            + '        <h3>Emby / MetaTube</h3>'
            + '        <div id="jlc-wb-config-diag" class="legacy-note" style="margin:0 0 12px;padding:10px 12px;background:#1a222c;border:1px solid #334;border-radius:10px;color:#cde;line-height:1.6;"></div>'
            + '        <label>Emby 地址</label><input id="jlc-wb-i-url" type="text" placeholder="http://emby.example:8096">'
            + '        <label>Emby API Key</label><input id="jlc-wb-i-key" type="password">'
            + '        <div class="legacy-note">密钥框留空=不修改已保存值；只有输入新内容才会覆盖。</div>'
            + '        <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-sync" style="width:100%;margin-top:8px;">🔄 立即同步 Emby</button>'
            + '        <label>MetaTube Server</label><input id="jlc-wb-i-mt" type="text" placeholder="http://127.0.0.1:1234">'
            + '        <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-diag" style="width:100%;margin-top:8px;">🔍 重新读取并显示配置</button>'
            + '        <h3 style="margin-top:16px">WebDAV 同步</h3>'
            + '        <div class="legacy-note">通用 WebDAV（坚果云 / Nextcloud / 群晖等）。读写 {路径}/jlc.vault.json。坚果云请用应用密码。</div>'
            + '        <label>地址</label><input id="jlc-wb-wd-url" type="text" placeholder="https://dav.jianguoyun.com/dav/">'
            + '        <label>用户名</label><input id="jlc-wb-wd-user" type="text" placeholder="邮箱 / 用户名" autocomplete="username">'
            + '        <label>应用密码</label><input id="jlc-wb-wd-pass" type="password" placeholder="应用密码，非登录密码" autocomplete="new-password">'
            + '        <label>远端路径</label><input id="jlc-wb-wd-path" type="text" placeholder="/Creamu">'
            + '        <div class="legacy-row legacy-toggle"><span>启用同步</span><input type="checkbox" id="jlc-wb-wd-en"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>打开时自动同步</span><input type="checkbox" id="jlc-wb-wd-auto"></div>'
            + '        <label>冲突策略</label><select id="jlc-wb-wd-conflict" class="jlc-wb-select" style="width:100%;margin-top:6px;"><option value="ask">询问</option><option value="remote">云端优先</option><option value="local">本机优先</option></select>'
            + '        <div class="legacy-note" id="jlc-wb-wd-status" style="margin-top:8px;">—</div>'
            + '        <div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;">'
            + '          <button type="button" class="jlc-wb-btn primary" id="jlc-wb-wd-test" style="flex:1;min-width:100px;">测试连接</button>'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-wd-sync" style="flex:1;min-width:100px;">立即同步</button>'
            + '        </div>'
            + '        <div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;">'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-wd-push" style="flex:1;">强制推送</button>'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-wd-pull" style="flex:1;">强制拉取</button>'
            + '        </div>'
            + '      </section>'
            // —— 显示：列表/布局/按钮缩放（renderWorkbenchViewSettings 填充）——
            + '      <section class="jlc-wb-settings-section" data-jlc-settings-panel="display">'
            + '        <div id="jlc-wb-view-root"></div>'
            + '      </section>'
            // —— 备份：导入导出 ——
            + '      <section class="jlc-wb-settings-section" data-jlc-settings-panel="backup">'
            + '        <h3>导入 / 导出</h3>'
            + '        <div class="legacy-note" style="margin-bottom:10px;">配置/追更/Emby 按脚本安装隔离。从旧脚本迁移：先导出 → 再在这里导入。</div>'
            + '        <div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;">'
            + '          <button type="button" class="jlc-wb-btn primary" id="jlc-wb-btn-import-config" style="flex:1;min-width:120px;">仅导入配置</button>'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-import" style="flex:1;min-width:120px;">完整导入</button>'
            + '        </div>'
            + '        <div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;">'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-export-config" style="flex:1;min-width:120px;">导出配置</button>'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-export" style="flex:1;min-width:120px;">完整导出</button>'
            + '        </div>'
            + '        <div class="legacy-note">完整备份不含 meta_cache。</div>'
            + '        <h3 style="margin-top:14px">数据检查</h3>'
            + '        <div class="legacy-note" style="margin-bottom:8px;">查看本机断点、浏览时间与点击记录数量。</div>'
            + '        <button type="button" class="jlc-wb-btn primary" id="jlc-wb-btn-integrity" style="width:100%;">🩺 检查断点·浏览·点击</button>'
            + '        <pre id="jlc-wb-data-integrity" class="legacy-note" hidden style="margin-top:10px;white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto;font-size:12px;line-height:1.45;"></pre>'
            + '      </section>'
            + '    </div>'
            + '    <div class="jlc-wb-settings-footer">'
            + '      <button type="button" class="jlc-wb-btn primary" id="jlc-wb-btn-save" style="width:100%;">💾 保存并应用</button>'
            + '      <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-rescan" style="width:100%;">🔁 重扫当前页</button>'
            + '    </div>'
            + '  </div>'
            + '</div>';
        document.body.appendChild(shell);
        applyWorkbenchShellGeometry();
        bindWorkbenchResize(shell);
        bindWorkbenchDrag(shell);
        // 列表滚动绑在 #jlc-wb-list-scroll（渲染后挂），body 本身不再滚动，避免抢事件
        shell.querySelector('.jlc-wb-settings-body')?.addEventListener('scroll', scheduleWorkbenchScrollSave, { passive: true });
        shell.querySelector('#jlc-wb-library-root')?.addEventListener('scroll', scheduleWorkbenchScrollSave, { passive: true });
        shell.querySelector('#jlc-wb-filter-root')?.addEventListener('scroll', scheduleWorkbenchScrollSave, { passive: true });
        shell.querySelectorAll('.jlc-wb-nav button').forEach(btn => {
            btn.addEventListener('click', () => { void activateWorkbenchNav(btn.dataset.nav || 'tracking'); });
        });
        shell.querySelector('#jlc-wb-close-btn')?.addEventListener('click', closeWorkbenchV3);
        shell.querySelector('#jlc-wb-min-btn')?.addEventListener('click', closeWorkbenchV3);
        shell.querySelector('#jlc-wb-settings-btn')?.addEventListener('click', () => {
            const session = getWorkbenchSession();
            const next = !session.settingsOpen;
            setWorkbenchSettingsOpen(next);
            if (next) {
                syncWorkbenchSettingsForm();
                void refreshLibraryUI();
            }
        });
        shell.querySelector('#jlc-wb-open-mode-toggle')?.addEventListener('click', () => {
            const session = getWorkbenchSession();
            const next = session.openMode === 'tab' ? 'same' : 'tab';
            config.open_mode = next;
            GM_setValue('jlc_config_stable', config);
            persistWorkbenchSession({ openMode: next });
            updateWorkbenchOpenModeChip();
            showAlert(next === 'tab' ? '默认改为新标签打开。' : '默认改为本页打开。');
        });
        shell.querySelector('#jlc-wb-save-current')?.addEventListener('click', async () => {
            const currentContext = getCurrentTrackingPageContext();
            if (!currentContext) {
                showAlert('当前页面还不是可收藏的列表页。');
                return;
            }
            const customLabel = await showWorkbenchPrompt({
                title: '收藏当前搜索',
                note: '可填写备注名，留空则使用自动标题。',
                value: '',
                placeholder: '备注名（可选）'
            });
            if (customLabel === null) return;
            const record = await createOrUpdateTrackingFromContext(currentContext, {
                createIfMissing: true,
                touchBrowse: true,
                checkTop: true,
                updateCheck: true,
                seedSeen: true,
                customLabel
            });
            trackingPageState.record = record;
            trackingPageState.context = currentContext;
            trackingPageState.signature = currentContext.query_signature;
            trackingPageTouchSignature = currentContext.query_signature;
            applyTrackingPageDecorations(record);
            ensureTrackingPageBar({ context: currentContext, record });
            await renderWorkbenchTrackingList();
            showAlert('当前搜索已加入追更！');
        });
        shell.querySelector('#jlc-wb-refresh-all')?.addEventListener('click', (event) => {
            if (getTrackingRefreshRuntimeState()) return;
            void refreshAllTrackingSearches(event.currentTarget);
        });
        shell.querySelector('#jlc-wb-sync-now')?.addEventListener('click', (event) => {
            const btn = event.currentTarget;
            if (btn?.disabled) return;
            if (typeof syncEmbyAndWebDav === 'function') {
                void syncEmbyAndWebDav({ button: btn });
            } else {
                showAlert('同步功能未就绪', true);
            }
        });

        bindWorkbenchSettingsEvents(shell);
        updateWorkbenchOpenModeChip();
        syncWorkbenchSettingsForm();
        if (!workbenchUiBound) {
            workbenchUiBound = true;
            window.addEventListener('pagehide', () => {
                captureWorkbenchScroll();
            });
        }
    }

    function updateWorkbenchOpenModeChip() {
        const chip = document.getElementById('jlc-wb-open-mode-toggle');
        if (!chip) return;
        const mode = getWorkbenchSession().openMode || config.open_mode || 'tab';
        chip.textContent = mode === 'same' ? '本页' : '新标签';
        chip.classList.toggle('is-on', mode === 'tab');
    }

    async function restoreWorkbenchSession() {
        createWorkbenchV3();
        const session = getWorkbenchSession();
        updateWorkbenchOpenModeChip();
        if (session.panelOpen) {
            openWorkbenchV3(normalizeWorkbenchMainNav(session.nav));
            if (session.settingsOpen) {
                setWorkbenchSettingsOpen(true, session.settingsSection || '');
                syncWorkbenchSettingsForm();
                await refreshLibraryUI();
            }
        } else {
            await refreshWorkbenchFabBadge();
        }
    }

    function collectCommanderMutationItems(mutations) {
        const items = new Set();
        const isPendingItem = (item) => item
            && item.dataset?.jlcBaseDone !== '1'
            && !item.classList?.contains?.('jlc-final-done');
        Array.from(mutations || []).forEach(mutation => {
            Array.from(mutation?.addedNodes || []).forEach(node => {
                if (!node || node.nodeType !== 1) return;
                if (node.matches?.('.item-b')) {
                    items.add(node);
                    return;
                }
                const owner = node.closest?.('.item-b');
                if (owner) {
                    if (isPendingItem(owner)) items.add(owner);
                    return;
                }
                node.querySelectorAll?.('.item-b').forEach(item => items.add(item));
            });
        });
        return items;
    }

    function ensureCommanderObserver() {
        if (commanderObserver) return;
        commanderObserver = new MutationObserver((mutations) => {
            const items = collectCommanderMutationItems(mutations);
            const queuedCount = queueCommanderItems(items);
            if (queuedCount) {
                const hasIncompleteItem = Array.from(items).some(item => (
                    typeof getCommanderItemAvid !== 'function' || !getCommanderItemAvid(item)
                ));
                if (hasIncompleteItem) scheduleCommanderRescan(2);
                scheduleTrackingPageRefresh(false);
            }
        });
        if (document.body) {
            commanderObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    /** 启动：先可点 UI，再异步拉 DB / 追更 / WebDAV */
    async function startIntegratedApp() {
        try {
            initCommanderStyles();
            initWorkbenchV3Styles();
        } catch (e) {
            console.warn('[Creamu] styles', e);
        }

        let dbReady;
        try {
            dbReady = initDB();
        } catch (e) {
            console.warn('[Creamu] initDB', e);
        }

        try {
            createWorkbenchV3();
        } catch (e) {
            console.warn('[Creamu] workbench', e);
        }

        try {
            bindMetaSweepEvents();
            new Page();
        } catch (e) {
            console.error('[Creamu] Page', e);
        }

        ensureCommanderObserver();
        try {
            await dbReady;
        } catch (e) {
            console.warn('[Creamu] initDB', e);
        }

        try {
            await loadRadarData();
        } catch (e) {
            console.warn('[Creamu] radar', e);
        }

        try {
            await restoreWorkbenchSession();
            await refreshLibraryUI();
            ensureStandaloneCommanderEntry();
            renderDetailResourceCenter();
            refreshCommanderDecorations?.(document, {
                scheduleRescan: false,
                syncTracking: false
            });
        } catch (e) {
            console.warn('[Creamu] library', e);
        }

        try {
            const queuedCount = runCommanderScanner(document.getElementById('grid-b') || document, true);
            if (queuedCount) scheduleCommanderRescan(10);
        } catch (_) { /* ignore */ }

        void Promise.resolve()
            .then(() => syncTrackingPageState(true))
            .catch((e) => console.warn('[Creamu] tracking', e));

        primeJavLibraryComboOptionSnapshotFromCurrentPage();

        void Promise.resolve()
            .then(async () => {
                const sync = ensureCreamuSync();
                if (sync) await sync.bootSync();
            })
            .catch((e) => console.warn('[Creamu] WebDAV', e));

        if (!configMigrationHintShown && isLikelyFreshDefaultConfig()) {
            configMigrationHintShown = true;
            window.setTimeout(() => {
                showAlert('未读到 Emby/自定义心动标签。若以前用过旧版：请用旧脚本导出备份，再在设置 → 备份 → 导入。', true);
            }, 1200);
        }

        window.setTimeout(() => {
            const queuedCount = runCommanderScanner(document.getElementById('grid-b') || document, true);
            if (queuedCount) scheduleCommanderRescan(8);
            renderDetailResourceCenter();
        }, 900);
        window.setTimeout(() => {
            const queuedCount = runCommanderScanner(document.getElementById('grid-b') || document, true);
            if (queuedCount) scheduleCommanderRescan(10);
            renderDetailResourceCenter();
        }, 2200);

        const detailContext = getCurrentDetailContext();
        if (detailContext?.avid) {
            getVal('videos', detailContext.avid).then(data => {
                const current = data || { avid: detailContext.avid, clicked: true, status: 'none' };
                current.clicked = true;
                setVal('videos', current);
            }).catch(() => {});
        }
    }
