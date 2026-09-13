// @@creamu-part:46-tracking-refresh
    function isTrackingVerificationRequired(record, response) {
        if (!response) return false;
        if (String(record?.site || '').toLowerCase() !== 'javlibrary') return false;
        if (response.blockedByChallenge) return true;
        const responseText = String(response.responseText || '');
        return isChallengePage(responseText)
            || isLikelyBotGuardResponse(responseText)
            || [403, 429, 503].includes(Number(response.status || 0));
    }

    function buildTrackingVerifyUrl(record) {
        return compactText(record?.pending_verify_url || '')
            || buildTrackingNavigationUrl(record)
            || record?.open_url
            || record?.page_url
            || '';
    }

    function clearTrackingVerificationRequired(record, options = {}) {
        if (!record || typeof record !== 'object') return record;
        record.pending_verify_url = '';
        record.verify_required_at = '';
        if (record.check_status === 'cf_required' && options.restoreStatus !== false) {
            record.check_status = deriveTrackingStatusFromSnapshot(record);
            if (!compactText(record.check_note || '') || /cloudflare|验证/i.test(String(record.check_note || ''))) {
                if (record.check_status === 'latest') record.check_note = '已追到最新';
                else if (record.check_status === 'updated') record.check_note = record.top_avid ? ('发现新番号 ' + record.top_avid) : '发现新更新';
                else if (record.check_status === 'checked') record.check_note = '已检查';
                else record.check_note = '';
            }
        }
        return record;
    }

    function preserveTrackingStatusOnRefreshFailure(record, note, now, options = {}) {
        const preserve = !!options.preserveStatus
            && (!!compactText(record?.top_avid || '')
                || !!compactText(record?.last_seen_avid || '')
                || ['latest', 'updated', 'checked'].includes(String(record?.check_status || '')));
        record.last_check_at = now;
        record.last_refresh_error_at = now;
        record.last_refresh_error_note = note || '';
        if (preserve) {
            clearTrackingVerificationRequired(record, { restoreStatus: true });
            return record;
        }
        record.check_status = 'error';
        record.check_note = note || '请求失败';
        return record;
    }

    async function probeTrackingVerificationReady(record, verifyUrl) {
        const targetUrl = compactText(verifyUrl || buildTrackingVerifyUrl(record) || '');
        if (!targetUrl) return { ok: true, skipped: true };
        const target = parseTrackingUrl(targetUrl, location.href);
        const current = parseTrackingUrl(location.href, location.href);
        if (!target || !current || target.origin !== current.origin) {
            return { ok: true, skipped: true, url: targetUrl };
        }
        const probeRecord = record || { site: 'javlibrary' };
        const response = await requestPageWithBrowserFetch(targetUrl, { timeout: 12000 });
        if (isTrackingVerificationRequired(probeRecord, response)) {
            return { ok: false, url: targetUrl, response, note: '验证尚未生效' };
        }
        if (!response.ok || !response.responseText) {
            return { ok: false, url: targetUrl, response, note: describeRequestStatus(response, '验证页请求失败') };
        }
        return { ok: true, url: targetUrl, response };
    }

    function hasPendingTrackingVerification(record) {
        return record?.check_status === 'cf_required'
            || !!compactText(record?.pending_verify_url || '');
    }

    function openTrackingVerificationUrl(verifyUrl, options = {}) {
        const normalizedUrl = compactText(verifyUrl || '');
        if (!normalizedUrl) return false;
        if (openUrlInNewTab(normalizedUrl)) return true;
        if (options.fallbackToNavigate) {
            location.href = normalizedUrl;
            return true;
        }
        return false;
    }

    function markTrackingVerificationRequired(record, verifyUrl, note = '') {
        record.check_status = 'cf_required';
        record.check_note = note || '遇到 Cloudflare 验证，先手动验证后再继续刷新';
        record.pending_verify_url = compactText(verifyUrl || buildTrackingVerifyUrl(record) || '');
        record.verify_required_at = new Date().toISOString();
        return record;
    }

    async function scanTrackingUnreadAcrossPages(record, options = {}) {
        const mode = options.mode === 'backfill' ? 'backfill' : 'forward';
        const seedUrl = options.seedUrl || record?.open_url || '';
        const startUrl = options.startUrl || seedUrl;
        const startDoc = options.startDoc;
        const startInfos = Array.isArray(options.startInfos)
            ? options.startInfos
            : getTrackingItemInfosFromDocument(startDoc, record.site, startUrl);
        const startPage = Number(getCurrentListPageHint(startUrl, startDoc) || 0) || 1;
        const seenPage = Number(record?.last_seen_page_hint || 0) || 0;
        const lastPage = Number(options.lastPage || 0) || 0;
        const pageSize = Math.max(Number(record?.page_size_hint || 0) || 0, startInfos.length);
        const localUnread = estimateTrackingUnreadFromInfos(record, startInfos, mode);
        if (localUnread >= 0) {
            const total = estimateTrackingUnreadTotal(record, {
                localUnread,
                localFound: true,
                localPage: startPage,
                topPage: record.top_page_hint || startPage,
                pageSize
            });
            return { unread: total >= 0 ? total : localUnread };
        }

        const plan = planTrackingUnreadPageWalk({
            mode,
            startPage,
            seenPage,
            lastPage,
            maxExtraPages: 8
        });
        let unread = startInfos.length;
        let found = false;
        for (const page of plan.extraPages) {
            const pageUrl = buildTrackingPagedUrl(seedUrl, page);
            const pageResponse = await requestPageWithBrowserFetch(pageUrl, { timeout: 18000 });
            if (isTrackingVerificationRequired(record, pageResponse)) {
                record.last_check_at = new Date().toISOString();
                markTrackingVerificationRequired(record, pageUrl, '跨页检查遇到 Cloudflare 验证');
                await saveTrackingRecord(record);
                return { blocked: true, record };
            }
            if (!pageResponse.ok || !pageResponse.responseText) break;
            const pageDoc = new DOMParser().parseFromString(pageResponse.responseText, 'text/html');
            const pageInfos = getTrackingItemInfosFromDocument(pageDoc, record.site, pageUrl);
            if (pageInfos.length) {
                record.page_size_hint = Math.max(Number(record.page_size_hint || 0) || 0, pageInfos.length);
            }
            const pageUnread = estimateTrackingUnreadFromInfos(record, pageInfos, mode);
            if (pageUnread >= 0) {
                unread += pageUnread;
                found = true;
                break;
            }
            unread += pageInfos.length;
        }
        if (!found && plan.remainingPages > 0) {
            unread += plan.remainingPages * Math.max(Number(record.page_size_hint || 0) || 0, pageSize);
        }
        if (!(unread > 0) && record.last_seen_avid) return { unread: -1 };
        return { unread };
    }

    function persistTrackingRefreshQueue(pending, total, completed, extra = {}) {
        const pendingIds = (Array.isArray(pending) ? pending : [])
            .map(item => compactText(item?.id || item || ''))
            .filter(Boolean);
        if (!pendingIds.length) {
            clearTrackingRefreshResumeState();
            return null;
        }
        return setTrackingRefreshResumeState(Object.assign({
            pending_ids: pendingIds,
            total: Number(total || 0) || pendingIds.length,
            completed: Number(completed || 0) || 0,
            reason: extra.reason || 'running',
            paused_at: extra.paused_at || new Date().toISOString()
        }, extra));
    }

    function markTrackingRefreshInterrupted() {
        const resume = getTrackingRefreshResumeState();
        if (!resume?.pending_ids?.length) return resume;
        if (resume.reason === 'cf_required') return resume;
        return persistTrackingRefreshQueue(resume.pending_ids, resume.total, resume.completed, {
            reason: 'interrupted',
            record_id: resume.record_id,
            verify_url: resume.verify_url,
            note: resume.note || '刷新被中断'
        });
    }

    async function resumeSavedTrackingRefresh(trigger, records = null) {
        if (getTrackingRefreshRuntimeState()) {
            showAlert('刷新还在进行中。');
            return true;
        }
        const refreshResume = getTrackingRefreshResumeState();
        const pendingIds = Array.isArray(refreshResume?.pending_ids)
            ? refreshResume.pending_ids.filter(Boolean)
            : [];
        if (!pendingIds.length) {
            clearTrackingRefreshResumeState();
            return false;
        }
        const list = Array.isArray(records)
            ? records
            : (await getTrackingSearches()).filter(record => !record.archived);
        const verifyRecord = list.find(record => record.id === refreshResume.record_id)
            || list.find(record => pendingIds.includes(record.id));
        if (refreshResume.reason === 'cf_required') {
            const verifyUrl = compactText(refreshResume.verify_url || '') || buildTrackingVerifyUrl(verifyRecord);
            const probe = await probeTrackingVerificationReady(verifyRecord, verifyUrl);
            if (!probe.ok) {
                if (verifyUrl) openTrackingVerificationUrl(verifyUrl);
                showAlert((probe.note || '验证尚未生效') + '，请在打开的 JavLibrary 页面完成验证后再点继续。');
                return true;
            }
            if (verifyRecord) {
                clearTrackingVerificationRequired(verifyRecord, { restoreStatus: true });
                await saveTrackingRecord(verifyRecord);
            }
        }
        void refreshAllTrackingSearches(trigger, {
            recordIds: pendingIds,
            total: Number(refreshResume.total || 0) || pendingIds.length,
            completedBase: Number(refreshResume.completed || 0) || 0,
            resumeVerified: true
        });
        return true;
    }

    async function refreshSingleTrackingRecord(recordOrId, options = {}) {
        const list = await getTrackingSearches();
        const record = typeof recordOrId === 'string'
            ? list.find(item => item.id === recordOrId)
            : list.find(item => item.id === recordOrId?.id) || recordOrId;
        if (!record?.open_url || !record.site) return null;
        const now = new Date().toISOString();
        const preserveStatusOnFailure = !!options.silent || !!options.preserveStatusOnFailure;
        let requestSeedUrl = '';

        if (hasPendingTrackingVerification(record)) {
            clearTrackingVerificationRequired(record, { restoreStatus: true });
        }

        if (isJavLibraryResolvableSearchUrl(record.page_url || record.open_url || '')) {
            const searchQuery = getTrackingSearchQuery(record);
            if (!searchQuery) {
                record.last_check_at = now;
                record.check_status = 'error';
                record.check_note = '缺少原搜索词，无法刷新已过期搜索';
                await saveTrackingRecord(record);
                return record;
            }
            applyTrackingSearchQuery(record, searchQuery);
            const resolved = await resolveJavLibrarySearchUrl(record, { keyword: searchQuery, pageHint: 1 });
            if (!resolved.ok || !resolved.url) {
                const resolvedError = String(resolved.error || '');
                const rebuildNote = resolved.rateLimited
                    ? 'JavLibrary 暂时限制刷新，请稍后再试'
                    : '重建搜索失败 · ' + (resolvedError || '未知错误');
                if (resolved.cfRequired || /403|cloudflare|challenge|forbidden|验证/i.test(resolvedError)) {
                    record.last_check_at = now;
                    markTrackingVerificationRequired(record, buildTrackingNavigationUrl(record), '重建搜索时遇到 Cloudflare 验证');
                } else {
                    preserveTrackingStatusOnRefreshFailure(record, rebuildNote, now, {
                        preserveStatus: preserveStatusOnFailure || !!resolved.rateLimited
                    });
                }
                await saveTrackingRecord(record);
                return record;
            }
            requestSeedUrl = resolved.url;
            record.open_url = resolved.url;
        } else {
            const normalizedOpenUrl = buildTrackingOpenUrl(record.site, record.open_url || record.page_url || '', record || {}) || record.open_url || record.page_url;
            requestSeedUrl = isTrackingResolvableOpenUrl(normalizedOpenUrl)
                ? normalizedOpenUrl
                : (record.page_url || record.open_url || normalizedOpenUrl);
            if (normalizedOpenUrl && normalizedOpenUrl !== record.open_url && isTrackingResolvableOpenUrl(normalizedOpenUrl)) {
                record.open_url = normalizedOpenUrl;
            } else if ((!record.open_url || !isTrackingResolvableOpenUrl(record.open_url)) && requestSeedUrl) {
                record.open_url = requestSeedUrl;
            }
        }
        const openParsed = parseTrackingUrl(requestSeedUrl || record.open_url || '');
        const searchMode = resolveTrackingSearchMode(record, openParsed);
        const response = await requestPageWithBrowserFetch(requestSeedUrl || record.open_url, { timeout: 18000 });
        if (isTrackingVerificationRequired(record, response)) {
            record.last_check_at = now;
            markTrackingVerificationRequired(record, requestSeedUrl || record.open_url, '列表检查遇到 Cloudflare 验证');
            await saveTrackingRecord(record);
            return record;
        }
        if (!response.ok || !response.responseText) {
            preserveTrackingStatusOnRefreshFailure(record, '列表检查失败 · ' + describeRequestStatus(response, '请求失败'), now, {
                preserveStatus: preserveStatusOnFailure
            });
            await saveTrackingRecord(record);
            return record;
        }
        const baseDoc = new DOMParser().parseFromString(response.responseText, 'text/html');
        const baseItemCount = getTrackingDocumentItemCount(baseDoc, record.site);
        const seedUrl = requestSeedUrl || record.open_url;

        let targetDoc = baseDoc;
        let targetUrl = seedUrl;
        let topPageHint = Number(getCurrentListPageHint(seedUrl, baseDoc) || 0) || 1;
        const lastPageInfo = getTrackingLastPageInfo(baseDoc, seedUrl);
        const lastPage = Number(lastPageInfo.page || 0) || topPageHint || 1;

        if (String(record.site || '').toLowerCase() === 'javlibrary' && searchMode === 'backfill') {
            if (lastPage > 0) topPageHint = lastPage;
            const basePageHint = Number(getCurrentListPageHint(seedUrl, baseDoc) || 0) || 1;
            targetUrl = lastPageInfo.url || buildTrackingPagedUrl(seedUrl, topPageHint);
            if (topPageHint > 1 && topPageHint != basePageHint) {
                const tailResponse = await requestPageWithBrowserFetch(targetUrl, { timeout: 18000 });
                if (isTrackingVerificationRequired(record, tailResponse)) {
                    record.last_check_at = now;
                    markTrackingVerificationRequired(record, targetUrl, '尾页检查遇到 Cloudflare 验证');
                    await saveTrackingRecord(record);
                    return record;
                }
                if (!tailResponse.ok || !tailResponse.responseText) {
                    preserveTrackingStatusOnRefreshFailure(record, '尾页检查失败 · ' + describeRequestStatus(tailResponse, '请求失败'), now, {
                        preserveStatus: preserveStatusOnFailure
                    });
                    await saveTrackingRecord(record);
                    return record;
                }
                targetDoc = new DOMParser().parseFromString(tailResponse.responseText, 'text/html');
            }
        }

        const targetItemCount = getTrackingDocumentItemCount(targetDoc, record.site);
        const targetInfos = getTrackingItemInfosFromDocument(targetDoc, record.site, targetUrl || seedUrl || '');
        const firstItem = (searchMode === 'backfill' ? targetInfos[targetInfos.length - 1] : targetInfos[0])
            || getTrackingAnchorItemFromDocument(targetDoc, record.site, searchMode)
            || getTrackingFirstItemFromDocument(targetDoc, record.site);
        record.last_check_at = now;
        record.top_checked_at = now;
        record.search_mode = searchMode;
        record.pending_verify_url = '';
        record.verify_required_at = '';
        record.last_refresh_error_at = '';
        record.last_refresh_error_note = '';
        if (topPageHint > 0) record.top_page_hint = topPageHint;
        if (Math.max(baseItemCount, targetItemCount) > 0) {
            record.page_size_hint = Math.max(Number(record.page_size_hint || 0) || 0, baseItemCount, targetItemCount);
        }
        if (!firstItem?.avid) {
            record.check_status = 'error';
            record.check_note = '未解析到首个番号';
            await saveTrackingRecord(record);
            return record;
        }
        const previousTop = record.top_avid || '';
        const previousUnreadEstimate = Number(record.unread_estimate || 0) || 0;
        record.top_avid = firstItem.avid;
        record.top_title = firstItem.title || '';
        applyTrackingCoverFields(record, firstItem, {
            baseUrl: targetUrl || seedUrl || location.href,
            avatar: extractTrackingAvatarFromDocument(targetDoc, record.group_type, targetUrl || seedUrl || location.href)
                || extractTrackingAvatarFromDocument(baseDoc, record.group_type, seedUrl || location.href)
        });
        if (record.last_seen_avid && normalizeCode(record.last_seen_avid) === normalizeCode(record.top_avid)) {
            record.check_status = 'latest';
            record.check_note = '已追到最新';
            applyTrackingUnreadEstimate(record, 0);
        } else {
            const unreadScan = await scanTrackingUnreadAcrossPages(record, {
                seedUrl,
                startUrl: targetUrl || seedUrl,
                startDoc: targetDoc,
                startInfos: targetInfos,
                mode: searchMode,
                lastPage,
                preserveStatusOnFailure
            });
            if (unreadScan?.blocked) return record;
            const scannedUnread = Number(unreadScan?.unread);
            if (Number.isFinite(scannedUnread) && scannedUnread >= 0) {
                applyTrackingUnreadEstimate(record, scannedUnread);
            } else if (record.last_seen_avid) {
                const fallbackUnread = estimateTrackingUnreadTotal(record, {
                    localUnread: previousUnreadEstimate,
                    localFound: previousUnreadEstimate > 0,
                    localPage: record.last_seen_page_hint,
                    topPage: record.top_page_hint,
                    pageSize: record.page_size_hint
                });
                applyTrackingUnreadEstimate(
                    record,
                    fallbackUnread >= 0
                        ? Math.max(1, fallbackUnread)
                        : Math.max(1, previousUnreadEstimate || 0)
                );
            }
            if (!previousTop || normalizeCode(previousTop) !== normalizeCode(record.top_avid)) {
                record.check_status = 'updated';
                record.check_note = '发现新番号 ' + record.top_avid;
            } else {
                record.check_status = 'checked';
                record.check_note = '已检查';
            }
        }
        await saveTrackingRecord(record);
        if (!options.silent && trackingPageState.record?.id === record.id) {
            trackingPageState.record = record;
            ensureTrackingPageBar({ context: trackingPageState.context, record });
        }
        return record;
    }

    function isTrackingRefreshRateLimited(record) {

        return String(record?.site || '').toLowerCase() === 'javlibrary'
            && isJavLibraryResolvableSearchUrl(record?.page_url || record?.open_url || '');
    }

    function getTrackingRefreshBucket(record) {
        return isTrackingRefreshRateLimited(record)
            ? 'javlibrary-search-rebuild'
            : ('record:' + String(record?.id || 'unknown'));
    }

    function getTrackingRefreshCooldownMs(record) {
        return isTrackingRefreshRateLimited(record) ? (5 * 60 * 1000) : 0;
    }

    function pickNextTrackingRefreshRecord(pending, bucketLastRunAt, nowMs = Date.now()) {
        let minWaitMs = Infinity;
        for (let index = 0; index < pending.length; index += 1) {
            const record = pending[index];
            const cooldownMs = getTrackingRefreshCooldownMs(record);
            if (!(cooldownMs > 0)) {
                return { index, record, waitMs: 0 };
            }
            const bucket = getTrackingRefreshBucket(record);
            const lastRunAt = Number(bucketLastRunAt.get(bucket) || 0) || 0;
            const readyAt = lastRunAt + cooldownMs;
            if (readyAt <= nowMs) {
                return { index, record, waitMs: 0 };
            }
            minWaitMs = Math.min(minWaitMs, readyAt - nowMs);
        }
        return {
            index: -1,
            record: null,
            waitMs: Number.isFinite(minWaitMs) ? Math.max(0, minWaitMs) : 0
        };
    }

    async function refreshAllTrackingSearches(button, options = {}) {
        const requestedIds = Array.isArray(options.recordIds) ? options.recordIds.filter(Boolean) : null;
        let list = (await getTrackingSearches()).filter(record => !record.archived);
        if (requestedIds?.length) {
            const byId = new Map(list.map(record => [record.id, record]));
            list = requestedIds.map(id => byId.get(id)).filter(Boolean);
            if (options.resumeVerified) clearTrackingRefreshResumeState();
        } else {
            clearTrackingRefreshResumeState();
        }
        if (!list.length) {
            showAlert('当前没有可刷新的追更项。');
            return;
        }
        const pending = list.slice();
        const bucketLastRunAt = new Map();
        let completed = Number(options.completedBase || 0) || 0;
        const total = Number(options.total || 0) || (requestedIds?.length ? (completed + list.length) : list.length);
        let pausedForVerification = false;
        persistTrackingRefreshQueue(pending, total, completed, { reason: 'running' });
        setTrackingRefreshRuntimeState({
            phase: 'refreshing',
            completed,
            total,
            note: requestedIds?.length ? '继续剩余队列' : '开始扫描'
        });
        await renderTrackingUI();
        try {
            while (pending.length) {
                const nextTask = pickNextTrackingRefreshRecord(pending, bucketLastRunAt, Date.now());
                if (!nextTask.record) {
                    persistTrackingRefreshQueue(pending, total, completed, { reason: 'running' });
                    const waitMs = Math.min(Math.max(1500, nextTask.waitMs || 1500), 5 * 60 * 1000);
                    await waitTrackingRefreshCountdown(waitMs, remainingMs => {
                        setTrackingRefreshRuntimeState({
                            phase: 'cooldown',
                            completed,
                            total,
                            remainingMs,
                            note: 'JavLibrary 冷却桶'
                        });
                        void renderTrackingUI();
                    });
                    continue;
                }
                const [record] = pending.splice(nextTask.index, 1);
                persistTrackingRefreshQueue([record, ...pending], total, completed, { reason: 'running' });
                const cooldownNote = getTrackingRefreshCooldownMs(record) > 0 ? 'JavLibrary 冷却桶' : '请求中';
                setTrackingRefreshRuntimeState({
                    phase: 'refreshing',
                    completed,
                    total,
                    remainingMs: 0,
                    note: cooldownNote
                });
                await renderTrackingUI();
                const refreshed = await refreshSingleTrackingRecord(record, { silent: true });
                if (refreshed?.check_status === 'cf_required') {
                    pausedForVerification = true;
                    const verifyUrl = buildTrackingVerifyUrl(refreshed);
                    persistTrackingRefreshQueue([refreshed, ...pending], total, completed, {
                        reason: 'cf_required',
                        record_id: refreshed.id,
                        verify_url: verifyUrl,
                        note: refreshed.check_note || ''
                    });
                    setTrackingRefreshRuntimeState(null);
                    await renderTrackingUI();
                    const opened = openTrackingVerificationUrl(verifyUrl);
                    showAlert(opened
                        ? '刷新遇到 Cloudflare 验证，已尝试打开验证页；验证完回到这里点“继续上次”。'
                        : '刷新遇到 Cloudflare 验证，先点“去验证”，验证完再点“继续上次”。');
                    return;
                }
                completed += 1;
                persistTrackingRefreshQueue(pending, total, completed, { reason: 'running' });
                setTrackingRefreshRuntimeState({
                    phase: 'refreshing',
                    completed,
                    total,
                    remainingMs: 0,
                    note: refreshed?.top_avid ? ('刚检查到 ' + refreshed.top_avid) : '已更新列表'
                });
                await renderTrackingUI();
                const cooldownMs = getTrackingRefreshCooldownMs(refreshed || record);
                if (cooldownMs > 0) {
                    bucketLastRunAt.set(getTrackingRefreshBucket(refreshed || record), Date.now());
                }
                if (pending.length) {
                    const pauseMs = cooldownMs > 0
                        ? (3500 + Math.random() * 2500)
                        : (2200 + Math.random() * 2200);
                    await waitTrackingRefreshCountdown(pauseMs, remainingMs => {
                        setTrackingRefreshRuntimeState({
                            phase: 'cooldown',
                            completed,
                            total,
                            remainingMs,
                            note: cooldownMs > 0 ? 'JavLibrary 冷却桶' : '请求间隔'
                        });
                        void renderTrackingUI();
                    });
                }
            }
            clearTrackingRefreshResumeState();
            setTrackingRefreshRuntimeState(null);
            await renderTrackingUI();
            showAlert(requestedIds?.length ? '剩余追更项已继续刷新完成！' : '追更列表刷新完成！');
        } finally {
            if (!pausedForVerification) setTrackingRefreshRuntimeState(null);
            const leftover = getTrackingRefreshResumeState();
            if (!pausedForVerification && leftover?.pending_ids?.length) {
                persistTrackingRefreshQueue(leftover.pending_ids, leftover.total || total, leftover.completed || completed, {
                    reason: leftover.reason === 'cf_required' ? 'cf_required' : 'interrupted',
                    record_id: leftover.record_id,
                    verify_url: leftover.verify_url,
                    note: leftover.note
                });
            }
            renderTrackingUI();
        }
    }
