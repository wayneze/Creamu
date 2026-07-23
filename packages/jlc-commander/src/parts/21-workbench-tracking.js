// @@creamu-part:21-workbench-tracking
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
