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
        const opened = window.open(normalizedUrl, '_blank', 'noopener');
        if (!opened && options.fallbackToNavigate) {
            location.href = normalizedUrl;
            return true;
        }
        return !!opened;
    }

    function markTrackingVerificationRequired(record, verifyUrl, note = '') {
        record.check_status = 'cf_required';
        record.check_note = note || '遇到 Cloudflare 验证，先手动验证后再继续刷新';
        record.pending_verify_url = compactText(verifyUrl || buildTrackingVerifyUrl(record) || '');
        record.verify_required_at = new Date().toISOString();
        return record;
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
        const buildPagedUrl = (seedUrl, page) => {
            const parsed = parseTrackingUrl(seedUrl || record.open_url || '');
            if (!parsed) return seedUrl || record.open_url || '';
            if (page > 1) parsed.searchParams.set('page', String(page));
            else parsed.searchParams.delete('page');
            return parsed.toString();
        };

        let targetDoc = baseDoc;
        let targetUrl = requestSeedUrl || record.open_url;
        let topPageHint = Number(getCurrentListPageHint(requestSeedUrl || record.open_url, baseDoc) || 0) || 1;

        if (String(record.site || '').toLowerCase() === 'javlibrary' && searchMode === 'backfill') {
            const lastPageInfo = getTrackingLastPageInfo(baseDoc, requestSeedUrl || record.open_url);
            const lastPage = Number(lastPageInfo.page || 0) || topPageHint || 1;
            if (lastPage > 0) topPageHint = lastPage;
            const basePageHint = Number(getCurrentListPageHint(requestSeedUrl || record.open_url, baseDoc) || 0) || 1;
            targetUrl = lastPageInfo.url || buildPagedUrl(requestSeedUrl || record.open_url, topPageHint);
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
        const targetInfos = getTrackingItemInfosFromDocument(targetDoc, record.site, targetUrl || requestSeedUrl || record.open_url || '');
        const pageUnreadEstimate = estimateTrackingUnreadFromInfos(record, targetInfos, searchMode);
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
            baseUrl: targetUrl || requestSeedUrl || record.open_url || location.href,
            avatar: extractTrackingAvatarFromDocument(targetDoc, record.group_type, targetUrl || requestSeedUrl || record.open_url || location.href)
                || extractTrackingAvatarFromDocument(baseDoc, record.group_type, requestSeedUrl || record.open_url || location.href)
        });
        if (record.last_seen_avid && normalizeCode(record.last_seen_avid) === normalizeCode(record.top_avid)) {
            record.check_status = 'latest';
            record.check_note = '已追到最新';
            record.unread_estimate = 0;
        } else {
            if (pageUnreadEstimate >= 0) {
                record.unread_estimate = pageUnreadEstimate;
            } else if (record.last_seen_avid) {
                const fallbackUnreadEstimate = (!previousTop || normalizeCode(previousTop) !== normalizeCode(record.top_avid))
                    ? Math.max(1, previousUnreadEstimate)
                    : Math.max(1, previousUnreadEstimate || 0);
                record.unread_estimate = fallbackUnreadEstimate;
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
                    const pendingIds = [refreshed.id, ...pending.map(item => item.id)];
                    const verifyUrl = buildTrackingVerifyUrl(refreshed);
                    setTrackingRefreshResumeState({
                        pending_ids: pendingIds,
                        total,
                        completed,
                        record_id: refreshed.id,
                        verify_url: verifyUrl,
                        note: refreshed.check_note || '',
                        paused_at: new Date().toISOString()
                    });
                    setTrackingRefreshRuntimeState(null);
                    await renderTrackingUI();
                    const opened = openTrackingVerificationUrl(verifyUrl);
                    showAlert(opened
                        ? '刷新遇到 Cloudflare 验证，已尝试打开验证页；验证完回到这里点“验证后继续刷新”。'
                        : '刷新遇到 Cloudflare 验证，先点“去验证”，验证完再点“验证后继续刷新”。');
                    return;
                }
                completed += 1;
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
            renderTrackingUI();
        }
    }
