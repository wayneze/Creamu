// @@creamu-part:47-tracking-ui
    async function renderTrackingUI() {
        scheduleRenderWorkbenchTrackingList({}, workbenchListScrolling ? 0 : 220);
    }
    function clearTrackingPageDecorations() {
        document.querySelectorAll('.jlc-tracking-divider').forEach(node => node.remove());
        getTrackingItemNodesFromRoot(document).forEach(item => {
            item.classList.remove('jlc-tracking-old-item', 'jlc-tracking-breakpoint-item');
        });
        document.getElementById('jlc-tracking-breakpoint-finder')?.remove();
    }

    /**
     * 断点查找进度：写入 state + 刷新顶栏按钮。
     * loading 会贯穿「连翻 → 命中 → 滚到位置」整段，避免按钮先复原再突然跳。
     * @param {{ loading?: boolean, text?: string }} [options]
     */
    function setContinueBreakpointProgress(options = {}) {
        document.getElementById('jlc-tracking-breakpoint-finder')?.remove();
        if (options.loading) {
            trackingPageState.breakpointSearching = true;
            trackingPageState.breakpointSearchLabel = compactText(options.text) || '查找断点中…';
        } else {
            trackingPageState.breakpointSearching = false;
            trackingPageState.breakpointSearchLabel = '';
        }
        return applyContinueBreakpointButtonState();
    }

    /** 根据 trackingPageState 把顶栏「继续断点」绘成 loading / 可点 */
    function applyContinueBreakpointButtonState() {
        document.getElementById('jlc-tracking-breakpoint-finder')?.remove();
        const searching = !!trackingPageState.breakpointSearching;
        let btn = document.querySelector('[data-jlc-page-continue-bp]');
        // 命中后 bar 可能不再渲染该按钮：查找中时补一颗临时进度钮
        if (!btn && searching) {
            const actions = document.querySelector('#jlc-tracking-pagebar .jlc-tracking-pagebar-actions');
            if (actions) {
                btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'jlc-bp-continue is-loading';
                btn.setAttribute('data-jlc-page-continue-bp', '1');
                btn.disabled = true;
                actions.insertBefore(btn, actions.firstChild);
            }
        }
        if (!btn) return null;
        if (searching) {
            btn.disabled = true;
            btn.classList.add('is-loading');
            btn.textContent = trackingPageState.breakpointSearchLabel || '查找断点中…';
        } else {
            btn.disabled = false;
            btn.classList.remove('is-loading');
            btn.textContent = '继续断点';
        }
        return btn;
    }

    /** 把断点条目滚到视口中间（继续断点 / 命中后调用） */
    function scrollToTrackingBreakpoint(el, options = {}) {
        const target = el || document.querySelector('.jlc-tracking-breakpoint-item');
        if (!target || typeof target.scrollIntoView !== 'function') return false;
        try {
            target.scrollIntoView({
                block: options.block || 'center',
                behavior: options.behavior || 'smooth',
                inline: 'nearest'
            });
        } catch (_) {
            try { target.scrollIntoView(true); } catch (__) { /* ignore */ }
        }
        return true;
    }

    /** 连翻时轻量跟滚，让用户看到列表在长，而不是最后突然一跳 */
    function softFollowBreakpointSearch(appendedItems, direction) {
        if (!appendedItems || !appendedItems.length) return;
        const el = direction === 'prev' ? appendedItems[0] : appendedItems[appendedItems.length - 1];
        if (!el || typeof el.scrollIntoView !== 'function') return;
        try {
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth', inline: 'nearest' });
        } catch (_) {
            try { el.scrollIntoView(false); } catch (__) { /* ignore */ }
        }
    }

    /**
     * 命中断点后的过渡：装饰 → 进度「定位中」→ 平滑滚动 → 脉冲 → 再结束 loading
     */
    async function settleBreakpointHit(found, record) {
        setContinueBreakpointProgress({ loading: true, text: '已命中，定位中…' });
        applyTrackingPageDecorations(record);
        ensureTrackingPageBar({
            context: trackingPageState.context || getCurrentTrackingPageContext(),
            record
        });
        applyContinueBreakpointButtonState();
        await delayMs(80);
        const marked = document.querySelector('.jlc-tracking-breakpoint-item') || found;
        if (marked) {
            marked.classList.add('jlc-bp-locating');
            scrollToTrackingBreakpoint(marked, { block: 'center', behavior: 'smooth' });
        }
        // 等平滑滚动大致走完再松手
        await delayMs(620);
        setContinueBreakpointProgress({ loading: false });
        ensureTrackingPageBar({
            context: trackingPageState.context || getCurrentTrackingPageContext(),
            record: trackingPageState.record || record
        });
        window.setTimeout(() => {
            document.querySelectorAll('.jlc-bp-locating').forEach((node) => node.classList.remove('jlc-bp-locating'));
        }, 1200);
    }

    function applyTrackingPageDecorations(record) {
        clearTrackingPageDecorations();
        trackingPageState.lastSeenFound = false;
        trackingPageState.breakpointMissHint = '';
        if (!record?.last_seen_avid) {
            trackingPageState.breakpointCursor = { prev: '', next: '' };
            return;
        }
        const items = getTrackingItemNodesFromRoot(document);
        if (!items.length) return;
        const targetCode = normalizeCode(record.last_seen_avid);
        if (!targetCode) return;
        const searchMode = resolveTrackingSearchMode(record, parseTrackingUrl(record.open_url || location.href));
        const isBackfill = searchMode === 'backfill';
        const currentContext = trackingPageState.context || getCurrentTrackingPageContext();
        const currentPageHint = Number(currentContext?.page_hint || getCurrentListPageHint(location.href, document) || 0) || 1;
        const seenPageHint = Number(record.last_seen_page_hint || 0) || 0;
        let foundIndex = -1;
        items.forEach((item, index) => {
            const info = getTrackingItemInfoFromNode(item);
            if (foundIndex === -1 && normalizeCode(info?.avid || '') === targetCode) {
                foundIndex = index;
                item.classList.add('jlc-tracking-breakpoint-item');
            }
        });
        if (foundIndex >= 0) {
            trackingPageState.lastSeenFound = true;
            trackingPageState.breakpointMissHint = '';
            trackingPageState.breakpointCursor = { prev: '', next: '' };
            // 唯一列表内标识：命中断点时的分割线
            const divider = document.createElement('div');
            divider.className = 'jlc-tracking-divider';
            divider.textContent = isBackfill ? '上次看到这里（下面是更新）' : '上次看到这里';
            if (isBackfill) {
                items[foundIndex].after(divider);
                record.unread_estimate = Math.max(0, items.length - foundIndex - 1);
            } else {
                items[foundIndex].before(divider);
                record.unread_estimate = foundIndex;
            }
            void saveTrackingRecord(record);
            refreshTrackingToolbarButtons();
            return;
        }

        // 未命中：不在列表再插「整页更新」横幅（与顶栏重复）；只记方向提示给 pagebar
        if (seenPageHint > 0) {
            if (isBackfill && currentPageHint > seenPageHint) {
                trackingPageState.breakpointMissHint = 'earlier';
            } else if (!isBackfill && currentPageHint < seenPageHint) {
                trackingPageState.breakpointMissHint = 'later';
            }
        }
        refreshTrackingToolbarButtons();
    }

    function ensureTrackingPageBar(state = {}) {
        const grid = document.getElementById('grid-b');
        const context = state.context || trackingPageState.context;
        const record = state.record !== undefined ? state.record : trackingPageState.record;
        let bar = document.getElementById('jlc-tracking-pagebar');
        if (!grid || !context) {
            bar?.remove();
            document.getElementById('jlc-tracking-breakpoint-finder')?.remove();
            return null;
        }
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'jlc-tracking-pagebar';
            grid.before(bar);
        }
        bar.classList.add('jlc-wb-pagebar');
        if (!record) {
            bar.innerHTML = ''
                + '<div class="jlc-tracking-pagebar-main">'
                + '  <div class="jlc-tracking-pagebar-title">当前搜索还未加入追更</div>'
                + '  <div class="jlc-tracking-pagebar-meta"><span>' + escapeHtml(context.title || context.group_name || context.query_text || '当前列表') + '</span></div>'
                + '</div>'
                + '<div class="jlc-tracking-pagebar-actions">'
                + '  <button type="button" class="primary" data-jlc-page-save>⭐ 收藏此搜索</button>'
                + '  <button type="button" data-jlc-page-open-panel>打开工作台</button>'
                + '</div>';
            bar.querySelector('[data-jlc-page-save]')?.addEventListener('click', async () => {
                const customLabel = await showWorkbenchPrompt({
                    title: '收藏此搜索',
                    note: '可填写备注名，留空则使用自动标题。',
                    value: '',
                    placeholder: '备注名（可选）'
                });
                if (customLabel === null) return;
                const saved = await createOrUpdateTrackingFromContext(context, {
                    createIfMissing: true,
                    touchBrowse: true,
                    checkTop: true,
                    updateCheck: true,
                    seedSeen: true,
                    customLabel
                });
                trackingPageState.record = saved;
                trackingPageState.signature = context.query_signature;
                trackingPageTouchSignature = context.query_signature;
                applyTrackingPageDecorations(saved);
                ensureTrackingPageBar({ context, record: saved });
                renderTrackingUI();
                showAlert('当前搜索已收藏到追更！');
            });
            bar.querySelector('[data-jlc-page-open-panel]')?.addEventListener('click', () => openCommanderPanel('tracking'));
            return bar;
        }
        const status = buildTrackingStatus(record);
        const metaParts = [];
        if (record.top_avid) metaParts.push('<span>最新：' + escapeHtml(record.top_avid) + '</span>');
        if (!record.last_seen_avid) {
            metaParts.push('<span>尚未设置断点</span>');
        } else if (trackingPageState.lastSeenFound) {
            metaParts.push('<span>断点：' + escapeHtml(record.last_seen_avid) + '</span>');
        } else {
            // 未命中：状态集中在顶栏，不再在列表插第三份文案
            metaParts.push('<span>断点：' + escapeHtml(record.last_seen_avid) + '（本页未找到）</span>');
            if (trackingPageState.breakpointMissHint === 'later') {
                metaParts.push('<span class="jlc-bp-miss-hint">在后面页</span>');
            } else if (trackingPageState.breakpointMissHint === 'earlier') {
                metaParts.push('<span class="jlc-bp-miss-hint">在更早页</span>');
            }
        }
        const browseOnly = buildTrackingPageHintSummary(record, { includeBrowsed: true }).find(item => item.startsWith('浏览第'));
        if (browseOnly) metaParts.push('<span>' + escapeHtml(browseOnly) + '</span>');
        metaParts.push('<span title="' + escapeHtml(formatDateTime(record.last_browsed_at)) + '">最后浏览：' + escapeHtml(formatRelativeTime(record.last_browsed_at)) + '</span>');
        const displayTitle = getTrackingDisplayTitle(record, context);
        const pageSummary = buildTrackingPageHintSummary(record).join(' · ');
        const searching = !!trackingPageState.breakpointSearching;
        const canContinueBreakpoint = !!record.last_seen_avid && !trackingPageState.lastSeenFound;
        // 查找/定位过程中始终保留进度钮（即使已命中、本可隐藏「继续断点」）
        const showContinueBtn = canContinueBreakpoint || searching;
        const continueLabel = searching
            ? (trackingPageState.breakpointSearchLabel || '查找断点中…')
            : '继续断点';
        const continueTitle = searching
            ? continueLabel
            : (trackingPageState.breakpointMissHint === 'later'
                ? '本页均为更新，点击向后加载直到命中断点'
                : (trackingPageState.breakpointMissHint === 'earlier'
                    ? '本页均为更新，点击向前加载直到命中断点'
                    : '向后/向前加载列表直到命中断点番号'));
        bar.innerHTML = ''
            + '<div class="jlc-tracking-pagebar-main">'
            + '  <div class="jlc-tracking-pagebar-title"><span class="jlc-status-pill tone-' + escapeHtml(status.tone) + '">' + escapeHtml(status.text) + '</span> ' + escapeHtml(displayTitle) + (pageSummary ? ' <span class="jlc-tracking-pagehint">' + escapeHtml('· ' + pageSummary) + '</span>' : '') + '</div>'
            + '  <div class="jlc-tracking-pagebar-meta">' + metaParts.join('') + '</div>'
            + '</div>'
            + '<div class="jlc-tracking-pagebar-actions">'
            + (showContinueBtn
                ? '  <button type="button" class="jlc-bp-continue' + (searching ? ' is-loading' : '') + '" data-jlc-page-continue-bp'
                    + (searching ? ' disabled' : '')
                    + ' title="' + escapeHtml(continueTitle) + '">' + escapeHtml(continueLabel) + '</button>'
                : '')
            + '  <button type="button" class="primary" data-jlc-page-mark-read>设首页为断点</button>'
            + '  <button type="button" data-jlc-page-refresh>刷新本项</button>'
            + '  <button type="button" data-jlc-page-focus>在工作台中定位</button>'
            + '  <button type="button" data-jlc-page-edit-label>备注</button>'
            + '  <button type="button" data-jlc-page-open-panel>打开工作台</button>'
            + '</div>';
        bar.querySelector('[data-jlc-page-mark-read]')?.addEventListener('click', async () => {
            await markTrackingRecordRead(record.id, 'top');
            renderTrackingUI();
            showAlert('已把当前首项设为新断点！');
        });
        bar.querySelector('[data-jlc-page-continue-bp]')?.addEventListener('click', () => {
            if (trackingPageState.breakpointSearching) return;
            void continueTrackingBreakpointSearch();
        });
        bar.querySelector('[data-jlc-page-refresh]')?.addEventListener('click', async (event) => {
            const button = event.currentTarget;
            const prev = button.textContent;
            button.disabled = true;
            button.textContent = '刷新中…';
            try {
                await refreshSingleTrackingRecord(record.id);
                ensureTrackingPageBar({ context, record: trackingPageState.record || record });
                await renderTrackingUI();
                showAlert('本项已刷新！');
            } finally {
                button.disabled = false;
                button.textContent = prev;
            }
        });
        bar.querySelector('[data-jlc-page-focus]')?.addEventListener('click', () => {
            focusTrackingInWorkbench(record.id);
            showAlert('已在工作台定位该项。');
        });
        bar.querySelector('[data-jlc-page-edit-label]')?.addEventListener('click', async () => {
            const customLabel = await showWorkbenchPrompt({
                title: '修改追更备注',
                note: '留空可恢复自动标题。',
                value: record.custom_label || getTrackingDisplayTitle(record, context) || '',
                placeholder: '备注名'
            });
            if (customLabel === null) return;
            record.custom_label = compactText(customLabel || '');
            await saveTrackingRecord(record);
            trackingPageState.record = record;
            ensureTrackingPageBar({ context, record });
            renderTrackingUI();
            showAlert(record.custom_label ? '追更备注已更新！' : '已恢复自动标题！');
        });
        bar.querySelector('[data-jlc-page-open-panel]')?.addEventListener('click', () => {
            focusTrackingInWorkbench(record.id);
        });
        return bar;
    }

    async function setTrackingBreakpointByItem(item, options = {}) {
        const info = getTrackingItemInfoFromNode(item);
        if (!info?.avid) return null;
        const context = getCurrentTrackingPageContext();
        if (!context) {
            showAlert('当前页面还不是可追更的列表页。');
            return null;
        }
        const items = getTrackingItemNodesFromRoot(document);
        const itemIndex = items.findIndex(node => node === item);
        const searchMode = resolveTrackingSearchMode({ site: context.site, search_mode: context.search_mode }, parseTrackingUrl(context.pageUrl || context.open_url || location.href));
        const unreadEstimate = itemIndex >= 0
            ? (searchMode === 'backfill'
                ? Math.max(0, items.length - itemIndex - 1)
                : Math.max(0, itemIndex))
            : 0;
        const record = await createOrUpdateTrackingFromContext(context, {
            createIfMissing: true,
            touchBrowse: trackingPageTouchSignature !== context.query_signature,
            checkTop: true,
            updateCheck: trackingPageTouchSignature !== context.query_signature,
            explicitLastSeen: {
                avid: info.avid,
                title: info.title,
                page_hint: context.page_hint,
                unread_estimate: unreadEstimate
            }
        });
        trackingPageState.context = context;
        trackingPageState.record = record;
        trackingPageState.signature = context.query_signature;
        trackingPageTouchSignature = context.query_signature;
        applyTrackingPageDecorations(record);
        ensureTrackingPageBar({ context, record });
        renderTrackingUI();
        showAlert((options.silent ? '' : '断点已更新到 ') + info.avid + '！');
        return record;
    }

    function refreshTrackingToolbarButtons() {
        const activeCode = normalizeCode(trackingPageState.record?.last_seen_avid || '');
        getTrackingItemNodesFromRoot(document).forEach(item => {
            const button = item.querySelector('.jlc-tool-btn.j-bm');
            if (button) {
                button.classList.toggle('active-bookmark', !!activeCode && normalizeCode(item.dataset.jlcAvid || '') === activeCode);
            }
        });
    }

    function scheduleTrackingPageRefresh(force = false) {
        if (trackingPageRefreshTimer) window.clearTimeout(trackingPageRefreshTimer);
        trackingPageRefreshTimer = window.setTimeout(() => {
            trackingPageRefreshTimer = null;
            void syncTrackingPageState(force);
        }, force ? 40 : 180);
    }

    async function syncTrackingPageState(force = false, options = {}) {
        const context = getCurrentTrackingPageContext();
        const previousSignature = trackingPageState.signature;
        const previousPageUrl = trackingPageState.context?.pageUrl || '';
        trackingPageState.context = context;
        if (!context) {
            trackingPageState.record = null;
            trackingPageState.signature = '';
            trackingPageState.lastSeenFound = false;
            trackingPageState.breakpointCursor = { prev: '', next: '' };
            clearTrackingPageDecorations();
            ensureTrackingPageBar({ context: null, record: null });
            return null;
        }
        if (context.query_signature !== previousSignature || context.pageUrl !== previousPageUrl) {
            trackingPageState.breakpointCursor = { prev: '', next: '' };
        }
        const shouldTouchBrowse = trackingPageTouchSignature !== context.query_signature;
        const shouldCheck = shouldTouchBrowse || force;
        const record = await createOrUpdateTrackingFromContext(context, {
            createIfMissing: false,
            touchBrowse: shouldTouchBrowse,
            checkTop: true,
            updateCheck: shouldCheck,
            trackingRecords: options.trackingRecords
        });
        if (shouldTouchBrowse) trackingPageTouchSignature = context.query_signature;
        trackingPageState.record = record;
        trackingPageState.signature = context.query_signature;
        applyTrackingPageDecorations(record);
        ensureTrackingPageBar({ context, record });
        refreshTrackingToolbarButtons();
        if (isWorkbenchOpen() && getWorkbenchSession().nav === 'tracking') {
            void renderTrackingUI();
        } else {
            void refreshWorkbenchFabBadge();
        }
        return record;
    }

    async function continueTrackingBreakpointSearch() {
        if (trackingPageSearchPromise) return trackingPageSearchPromise;
        const context = trackingPageState.context || getCurrentTrackingPageContext();
        const record = trackingPageState.record;
        if (!context || !record?.last_seen_avid) {
            showAlert('当前没有可继续搜索的断点。');
            return null;
        }
        const cursorState = trackingPageState.breakpointCursor || (trackingPageState.breakpointCursor = { prev: '', next: '' });
        const currentPageHint = Number(context.page_hint || getCurrentListPageHint(location.href, document) || 0) || 1;
        const directions = getTrackingBreakpointSearchDirections(record, currentPageHint);
        const directionSeeds = {
            prev: cursorState.prev || getTrackingPrevPageUrl(document, currentWeb, location.href),
            next: cursorState.next || scroller?.nextURL || getTrackingNextPageUrl(document, currentWeb, location.href)
        };
        const availableDirections = directions.filter(direction => !!directionSeeds[direction]);
        if (!availableDirections.length) {
            setContinueBreakpointProgress({ loading: false });
            showAlert('前后都没有更多页面了。');
            return null;
        }
        const targetCode = normalizeCode(record.last_seen_avid);
        const grid = document.getElementById('grid-b');
        if (!grid) return null;

        trackingPageSearchPromise = (async () => {
            const maxStepsPerDirection = 12;
            const maxTotalSteps = 18;
            let totalStep = 0;
            let lastFailure = '';
            for (const direction of availableDirections) {
                let nextUrl = directionSeeds[direction];
                if (!nextUrl) continue;
                let refererUrl = location.href;
                let directionStep = 0;
                const directionLabel = getTrackingBreakpointDirectionLabel(direction);
                setContinueBreakpointProgress({ loading: true, text: '正在' + directionLabel + '查找…' });
                while (nextUrl && directionStep < maxStepsPerDirection && totalStep < maxTotalSteps) {
                    directionStep += 1;
                    totalStep += 1;
                    cursorState[direction] = nextUrl || '';
                    const response = await requestPageWithBrowserFetch(nextUrl, buildTrackingPageRequestOptions(nextUrl, refererUrl, { timeout: 18000 }));
                    if (!response.ok || !response.responseText) {
                        lastFailure = directionLabel + '搜索失败：' + describeRequestStatus(response, '请求失败');
                        break;
                    }
                    const doc = new DOMParser().parseFromString(response.responseText, 'text/html');
                    let elems = GridPanel.parseItems($(doc).find(currentObj.itemSelector));
                    if (currentWeb !== 'javdb' && location.pathname.includes('/star/') && elems) {
                        elems = elems.slice(1);
                    }
                    const appendedItems = collectCommanderItems(elems);
                    if (appendedItems.length) {
                        if (direction === 'prev') grid.prepend(...appendedItems);
                        else grid.append(...appendedItems);
                        lazyLoad?.update?.(appendedItems);
                        runCommanderScanner(appendedItems, true);
                        window.setTimeout(() => runCommanderScanner(appendedItems, true), 120);
                        window.setTimeout(() => runCommanderScanner(appendedItems, true), 620);
                        // 边加载边轻跟滚，避免最后才「闪」到下面
                        softFollowBreakpointSearch(appendedItems, direction);
                    }
                    const found = appendedItems.find(item => normalizeCode(getTrackingItemInfoFromNode(item)?.avid || '') === targetCode);
                    if (found) {
                        record.last_found_at = new Date().toISOString();
                        record.last_seen_page_hint = getCurrentListPageHint(response.finalUrl || nextUrl, doc);
                        trackingPageState.breakpointCursor = { prev: '', next: '' };
                        await saveTrackingRecord(record);
                        trackingPageState.record = record;
                        await settleBreakpointHit(found, record);
                        showAlert('已找到断点 ' + record.last_seen_avid + '！');
                        return found;
                    }
                    refererUrl = response.finalUrl || nextUrl;
                    nextUrl = getTrackingDirectionalPageUrl(doc, currentWeb, refererUrl, direction);
                    cursorState[direction] = nextUrl || '';
                    if (direction === 'next' && scroller) scroller.nextURL = nextUrl || '';
                    if (nextUrl) {
                        const pageHint = Number(getCurrentListPageHint(refererUrl, doc) || 0) || 1;
                        setContinueBreakpointProgress({
                            loading: true,
                            text: directionLabel + '第' + pageHint + '页…'
                        });
                        // 间隔略缩短：跟滚已经给了反馈，不必干等太久
                        await delayMs(480 + Math.random() * 320);
                    }
                }
                if (directionStep >= maxStepsPerDirection || totalStep >= maxTotalSteps) {
                    lastFailure = '已连续翻到限制页数，断点还没出现';
                    break;
                }
            }
            const remainingDirections = directions.filter(direction => !!(trackingPageState.breakpointCursor || {})[direction]);
            setContinueBreakpointProgress({ loading: false });
            if (remainingDirections.length) {
                showAlert(lastFailure ? ('断点定位未完成：' + lastFailure) : '这次先翻到这里，再点一次「继续断点」即可。');
                return null;
            }
            showAlert(lastFailure ? ('断点定位失败：' + lastFailure) : '已经翻到前后边界，仍未找到断点。');
            return null;
        })().finally(() => {
            trackingPageSearchPromise = null;
            // settle 成功时已结束 loading；失败路径也兜底复位
            if (trackingPageState.breakpointSearching) {
                setContinueBreakpointProgress({ loading: false });
            }
            scheduleTrackingPageRefresh(false);
        });

        return trackingPageSearchPromise;
    }

