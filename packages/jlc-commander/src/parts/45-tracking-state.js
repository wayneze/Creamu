// @@creamu-part:45-tracking-state
    function formatRelativeTime(value) {
        if (!value) return '未记录';
        const time = new Date(value).getTime();
        if (!Number.isFinite(time)) return '未记录';
        const diff = Date.now() - time;
        if (diff < 60 * 1000) return '刚刚';
        if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + ' 分钟前';
        if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + ' 小时前';
        if (diff < 30 * 24 * 60 * 60 * 1000) return Math.floor(diff / (24 * 60 * 60 * 1000)) + ' 天前';
        return formatDateTime(value);
    }

    function formatDateTime(value) {
        if (!value) return '未记录';
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) return '未记录';
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
            + ' ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
    }

    /** 展示标题里去掉「JavLibrary · 」等站点前缀（站点已有胶囊） */
    function stripTrackingSiteTitlePrefix(value, site = '') {
        let text = compactText(value || '');
        if (!text) return '';
        const labels = [
            getSiteLabel(site),
            'JavLibrary', 'JAVLibrary', 'javlibrary', 'JavLib', 'Jav Library',
            'JavBus', 'javbus', 'JavDB', 'javdb', 'Avmoo', 'avmoo', 'JLC'
        ].filter(Boolean);
        const seen = new Set();
        for (const label of labels) {
            const key = String(label).toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            const escaped = String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            text = text.replace(new RegExp('^' + escaped + '\\s*[·•|\\-—–:]\\s*', 'i'), '');
        }
        text = text.replace(/^(?:jav\s*library|javlibrary|javbus|javdb|avmoo|jlc)\s*[·•|\-—–:]\s*/i, '');
        return compactText(text);
    }

    function getTrackingDisplayTitle(record, fallbackContext = null) {
        const site = record?.site || fallbackContext?.site || '';
        const custom = stripTrackingSiteTitlePrefix(record?.custom_label || '', site);
        if (custom && !isTrackingUiChromeLabel(custom)) return custom;
        const fallback = fallbackContext || {};
        const candidates = [
            record?.group_name, // 优先纯名称，避免「站点 · 名」冗余
            record?.query_text,
            record?.raw_query,
            record?.title,
            fallback.group_name,
            fallback.query_text,
            fallback.raw_query,
            fallback.title,
            record?.id,
            '当前搜索'
        ];
        for (const item of candidates) {
            const text = stripTrackingSiteTitlePrefix(item, site);
            if (text && !isTrackingUiChromeLabel(text) && !/^https?:\/\//i.test(text)) return text;
        }
        return '当前搜索';
    }

    function promptTrackingCustomLabel(record = null, context = null) {
        const defaultValue = getTrackingDisplayTitle(record, context);
        const result = window.prompt('请输入追更备注名（可留空使用自动标题）', defaultValue);
        if (result == null) return null;
        const value = compactText(result);
        if (!value || value === defaultValue) return '';
        return value;
    }

    function estimateTrackingUnreadTotal(record, options = {}) {
        const pageSize = Math.max(0, Math.floor(Number(options.pageSize || record?.page_size_hint || 0) || 0));
        const topPage = Math.max(0, Math.floor(Number(options.topPage || record?.top_page_hint || 0) || 0));
        const localPage = Math.max(0, Math.floor(Number(options.localPage || 0) || 0));
        const seenPage = Math.max(0, Math.floor(Number(options.seenPage || record?.last_seen_page_hint || localPage || 0) || 0));
        const localUnreadRaw = Number(options.localUnread);
        const localFound = options.localFound === true && Number.isFinite(localUnreadRaw) && localUnreadRaw >= 0;
        const localUnread = localFound ? Math.max(0, Math.floor(localUnreadRaw)) : 0;

        if (localFound && options.spanCovered === true) return localUnread;
        if (localFound && (!topPage || !localPage || topPage === localPage)) return localUnread;
        if (localFound && pageSize > 0 && topPage > 0 && localPage > 0) {
            return Math.abs(topPage - localPage) * pageSize + localUnread;
        }
        if (topPage > 0 && seenPage > 0 && pageSize > 0 && topPage !== seenPage) {
            return Math.abs(topPage - seenPage) * pageSize + (localFound ? localUnread : 0);
        }
        if (localFound) return localUnread;
        return -1;
    }

    function planTrackingUnreadPageWalk(options = {}) {
        const mode = options.mode === 'backfill' ? 'backfill' : 'forward';
        const startPage = Math.max(1, Math.floor(Number(options.startPage || 0) || 1));
        const seenPage = Math.max(0, Math.floor(Number(options.seenPage || 0) || 0));
        const lastPage = Math.max(0, Math.floor(Number(options.lastPage || 0) || 0));
        const maxExtraPages = Math.min(20, Math.max(0, Math.floor(Number(options.maxExtraPages || 8) || 8)));
        const step = mode === 'backfill' ? -1 : 1;
        const extraPages = [];
        let page = startPage + step;
        while (extraPages.length < maxExtraPages) {
            if (page < 1) break;
            if (lastPage > 0 && page > lastPage) break;
            if (seenPage > 0) {
                if (step > 0 && page > seenPage) break;
                if (step < 0 && page < seenPage) break;
            } else if (!(lastPage > 0)) {
                break;
            }
            extraPages.push(page);
            if (seenPage > 0 && page === seenPage) break;
            page += step;
        }
        let remainingPages = 0;
        if (seenPage > 0) {
            const cursor = extraPages.length ? extraPages[extraPages.length - 1] + step : startPage + step;
            if (step > 0) remainingPages = cursor <= seenPage ? (seenPage - cursor + 1) : 0;
            else remainingPages = cursor >= seenPage && cursor >= 1 ? (cursor - seenPage + 1) : 0;
        }
        return { mode, startPage, seenPage, lastPage, step, extraPages, remainingPages };
    }

    function applyTrackingUnreadEstimate(record, unread, options = {}) {
        if (!record || typeof record !== 'object') return record;
        const value = Math.max(0, Math.floor(Number(unread) || 0));
        record.unread_estimate = value;
        record.unread_span = options.span !== false;
        return record;
    }

    function getTrackingUnreadMetrics(record) {
        const topCode = normalizeCode(record?.top_avid || '');
        const seenCode = normalizeCode(record?.last_seen_avid || '');
        const hasUpdate = !!topCode && !!seenCode && topCode !== seenCode;
        const topPage = Number(record?.top_page_hint || 0) || 0;
        const seenPage = Number(record?.last_seen_page_hint || 0) || 0;
        const unreadEstimate = Number(record?.unread_estimate || 0) || 0;
        const pageSizeHint = Number(record?.page_size_hint || 0) || 0;
        const pageDelta = topPage > 0 && seenPage > 0 ? Math.abs(topPage - seenPage) : 0;
        const spanComplete = record?.unread_span === true || record?.unread_span === 1;
        let estimatedCount = 0;
        if (hasUpdate) {
            if (spanComplete && unreadEstimate > 0) estimatedCount = unreadEstimate;
            else if (pageDelta > 0 && pageSizeHint > 0) {
                estimatedCount = pageDelta * pageSizeHint + (spanComplete ? 0 : unreadEstimate);
            } else {
                estimatedCount = unreadEstimate;
            }
        }
        return {
            hasUpdate,
            topPage,
            seenPage,
            unreadEstimate,
            pageSizeHint,
            pageDelta,
            estimatedCount: estimatedCount > 0 ? estimatedCount : 0
        };
    }

    function getTrackingUnreadSummary(record) {
        const metrics = getTrackingUnreadMetrics(record);
        if (!metrics.hasUpdate) return '';
        if (metrics.estimatedCount > 0) {
            const parts = ['约 ' + metrics.estimatedCount + ' 条更新'];
            if (metrics.pageDelta > 0) parts.push('跨 ' + metrics.pageDelta + ' 页');
            return parts.join(' · ');
        }
        if (metrics.pageDelta > 0) return '跨 ' + metrics.pageDelta + ' 页以上';
        const mode = resolveTrackingSearchMode(record, parseTrackingUrl(record?.open_url || record?.page_url || ''));
        return mode === 'backfill' ? '尾页内有更新' : '本页内有更新';
    }

    function getTrackingUnreadPillText(record) {
        const metrics = getTrackingUnreadMetrics(record);
        if (!metrics.hasUpdate) return '';
        if (metrics.estimatedCount > 0) return '+' + metrics.estimatedCount;
        if (metrics.pageDelta > 0) return '+' + metrics.pageDelta + '页';
        if (metrics.unreadEstimate > 0) return '+' + metrics.unreadEstimate;
        return '+?';
    }

    function buildTrackingStatus(record) {
        const topCode = normalizeCode(record?.top_avid || '');
        const seenCode = normalizeCode(record?.last_seen_avid || '');
        const unreadSummary = getTrackingUnreadSummary(record);
        if (record?.check_status === 'cf_required') {
            return { tone: 'yellow', text: '待验证', note: record.check_note || '需要先通过 Cloudflare 验证' };
        }
        if (record?.check_status === 'error') {
            return { tone: 'red', text: '检查失败', note: record.check_note || '请求失败' };
        }
        if (topCode && seenCode && topCode !== seenCode) {
            const noteParts = ['最新 ' + (record.top_avid || '')];
            if (unreadSummary) noteParts.push(unreadSummary);
            return { tone: 'red', text: getTrackingUnreadPillText(record) || '+?', note: noteParts.join(' · ') };
        }
        if (seenCode && topCode && seenCode === topCode) {
            return { tone: 'green', text: '已读', note: '已追到 ' + (record.last_seen_avid || '') };
        }
        if (record?.last_check_at) {
            return { tone: 'yellow', text: '已检查', note: formatRelativeTime(record.last_check_at) };
        }
        return { tone: 'gray', text: '未检查', note: record?.last_browsed_at ? ('最后浏览 ' + formatRelativeTime(record.last_browsed_at)) : '尚未浏览' };
    }

    function buildTrackingPageHintSummary(record, options = {}) {

        const parts = [];
        const topPage = Number(record?.top_page_hint || 0) || 0;
        const seenPage = Number(record?.last_seen_page_hint || 0) || 0;
        const browsedPage = Number(record?.last_browsed_page_hint || 0) || 0;
        const includeBrowsed = !!options.includeBrowsed;
        if (topPage > 0) parts.push('最新第' + topPage + '页');
        if (seenPage > 0) parts.push('断点第' + seenPage + '页');
        if (includeBrowsed && browsedPage > 0 && browsedPage !== seenPage && browsedPage !== topPage) {
            parts.push('浏览第' + browsedPage + '页');
        }
        return parts;
    }

    function isTransientTrackingErrorNote(note = '') {
        const value = String(note || '');
        if (!value) return false;
        return /(请求超时|网络失败|HTTP 403|HTTP 429|HTTP 503|Cloudflare|暂时限制刷新|返回的不是 JSON|未拿到新的 searchid|列表检查失败|尾页检查失败|重建搜索失败)/i.test(value);
    }

    function deriveTrackingStatusFromSnapshot(record) {
        const topCode = normalizeCode(record?.top_avid || '');
        const seenCode = normalizeCode(record?.last_seen_avid || '');
        if (topCode && seenCode) return topCode === seenCode ? 'latest' : 'updated';
        if (topCode) return 'checked';
        return 'unchecked';
    }

    function normalizeTrackingRuntimeRecord(record) {
        if (!record || typeof record !== 'object') return record;
        if (record.check_status === 'error'
            && isTransientTrackingErrorNote(record.check_note)
            && (compactText(record.top_avid || '') || compactText(record.last_seen_avid || ''))) {
            record.last_refresh_error_at = record.last_refresh_error_at || record.last_check_at || '';
            record.last_refresh_error_note = record.last_refresh_error_note || record.check_note || '';
            record.check_status = deriveTrackingStatusFromSnapshot(record);
            if (record.check_status === 'latest') record.check_note = '已追到最新';
            else if (record.check_status === 'updated') record.check_note = record.top_avid ? ('发现新番号 ' + record.top_avid) : '发现新更新';
            else if (record.check_status === 'checked') record.check_note = '已检查';
            else record.check_note = '';
        }
        return record;
    }

    async function getTrackingSearches(preloadedRows) {
        const list = Array.isArray(preloadedRows)
            ? preloadedRows
            : await getAllFromStore(TRACKING_STORE);
        return (Array.isArray(list) ? list : [])
            .filter(Boolean)
            .map(record => normalizeTrackingRuntimeRecord(record))
            .sort((a, b) => {
                const aTime = Date.parse(a.created_at || a.updated_at || a.last_check_at || a.last_browsed_at || 0) || 0;
                const bTime = Date.parse(b.created_at || b.updated_at || b.last_check_at || b.last_browsed_at || 0) || 0;
                return Number(!!b.pinned) - Number(!!a.pinned) || aTime - bTime;
            });
    }

    async function getTrackingRecordBySignature(signature, openUrl = '', preloadedRows) {
        const list = await getTrackingSearches(preloadedRows);
        const canonical = buildTrackingCanonicalUrl(openUrl || '');
        const record = list.find(item => item.query_signature === signature)
            || list.find(record => buildTrackingCanonicalUrl(record.open_url || '') === canonical)
            || null;
        return record ? { ...record } : null;
    }

    async function saveTrackingRecord(record) {
        if (!record?.id) return null;
        record.updated_at = new Date().toISOString();
        await setVal(TRACKING_STORE, record);
        return record;
    }

    async function createOrUpdateTrackingFromContext(context = getCurrentTrackingPageContext(), options = {}) {
        if (!context) return null;
        const existing = await getTrackingRecordBySignature(
            context.query_signature,
            context.open_url,
            options.trackingRecords
        );
        if (!existing && options.createIfMissing === false) return null;
        const now = new Date().toISOString();
        const firstItem = context.firstItem || getFirstTrackingPageItemInfo(document);
        const pageHint = Number(context.page_hint || 0) || 1;
        const pageSizeHint = Number(context.page_size_hint || 0) || 0;
        const contextParsed = parseTrackingUrl(context.pageUrl || context.open_url || location.href);
        const searchMode = resolveTrackingSearchMode({ site: context.site, search_mode: context.search_mode }, contextParsed);
        const record = existing || {
            id: 'trk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            created_at: now,
            archived: false,
            pinned: false,
            unread_estimate: 0,
            check_status: 'unchecked',
            check_note: ''
        };
        const previousTop = record.top_avid || '';
        record.site = context.site;
        record.page_type = context.page_type;
        record.group_type = context.group_type;
        // 禁止把工作台 UI 文案（如「资源增强」）写进追更标题；已有好标题时不被污染覆盖
        const nextGroupName = compactText(context.group_name || '');
        const nextTitle = compactText(context.title || '');
        const nextQueryText = compactText(context.query_text || '');
        const nextRawQuery = compactText(context.raw_query || '');
        if (!existing) {
            record.group_name = isTrackingUiChromeLabel(nextGroupName) ? '' : nextGroupName;
            record.title = isTrackingUiChromeLabel(nextTitle) ? '' : nextTitle;
            record.query_text = isTrackingUiChromeLabel(nextQueryText) ? '' : nextQueryText;
            record.raw_query = isTrackingUiChromeLabel(nextRawQuery) ? '' : nextRawQuery;
        } else {
            if (shouldAdoptTrackingLabel(nextGroupName, record.group_name)) {
                record.group_name = nextGroupName;
            } else if (isTrackingUiChromeLabel(record.group_name)) {
                record.group_name = '';
            }
            if (shouldAdoptTrackingLabel(nextTitle, record.title)) {
                record.title = nextTitle;
            } else if (isTrackingUiChromeLabel(record.title)) {
                record.title = '';
            }
            if (shouldAdoptTrackingLabel(nextQueryText, record.query_text)) {
                record.query_text = nextQueryText;
            } else if (isTrackingUiChromeLabel(record.query_text)) {
                record.query_text = '';
            }
            if (shouldAdoptTrackingLabel(nextRawQuery, record.raw_query)) {
                record.raw_query = nextRawQuery;
            } else if (isTrackingUiChromeLabel(record.raw_query)) {
                record.raw_query = '';
            }
            // 标题被清空时，尽量用仍干净的字段拼回展示标题
            if (!compactText(record.title || '')) {
                const recoverName = compactText(record.group_name || record.query_text || record.raw_query || '');
                if (recoverName && !isTrackingUiChromeLabel(recoverName)) {
                    record.title = getSiteLabel(record.site) + ' · ' + recoverName;
                }
            }
        }
        record.page_url = context.pageUrl || record.page_url || '';
        record.open_url = context.open_url;
        record.query_signature = context.query_signature;
        record.search_mode = searchMode;
        if (pageSizeHint > 0) {
            record.page_size_hint = Math.max(Number(record.page_size_hint || 0) || 0, pageSizeHint);
        }
        if (Object.prototype.hasOwnProperty.call(options, 'customLabel')) {
            record.custom_label = compactText(options.customLabel || '');
        }

        const shouldAdoptContextTop = (() => {
            if (!firstItem?.avid || options.checkTop === false) return false;
            if (!existing || !record.top_avid) return true;
            if (searchMode === 'forward') return pageHint <= 1;
            if (searchMode === 'backfill') {
                const knownTopPage = Number(record.top_page_hint || 0) || 0;
                return knownTopPage > 0
                    && knownTopPage === pageHint
                    && normalizeCode(record.top_avid || '') === normalizeCode(firstItem.avid || '');
            }
            return pageHint <= 1;
        })();

        const pageBaseUrl = context.pageUrl || context.open_url || location.href;
        const pageAvatar = extractTrackingAvatarFromDocument(document, context.group_type || record.group_type, pageBaseUrl);
        if (pageAvatar) record.avatar_url = pageAvatar;
        if (shouldAdoptContextTop) {
            record.top_avid = firstItem.avid;
            record.top_title = firstItem.title || record.top_title || '';
            record.top_page_hint = pageHint;
            applyTrackingCoverFields(record, firstItem, { baseUrl: pageBaseUrl, avatar: pageAvatar });
            if (options.updateCheck !== false) {
                record.top_checked_at = now;
                record.last_check_at = now;
                if (record.last_seen_avid && normalizeCode(record.last_seen_avid) === normalizeCode(firstItem.avid)) {
                    record.check_status = 'latest';
                    record.check_note = '已追到最新';
                } else if (!previousTop || normalizeCode(previousTop) !== normalizeCode(firstItem.avid)) {
                    record.check_status = record.last_seen_avid ? 'updated' : 'checked';
                    record.check_note = (record.last_seen_avid ? '发现新番号 ' : '最新 ') + firstItem.avid;
                } else if (!record.check_status || record.check_status === 'unchecked') {
                    record.check_status = 'checked';
                    record.check_note = '已检查';
                }
            } else if (!record.top_checked_at) {
                record.top_checked_at = now;
            }
        } else if (firstItem?.cover && !getTrackingDisplayCoverUrl(record)) {
            // 未采纳 top 时，若仍无封面，用当前页可见首图顶一下空槽
            applyTrackingCoverFields(record, firstItem, { baseUrl: pageBaseUrl, avatar: pageAvatar });
        }

        if (options.touchBrowse) {
            record.last_browsed_at = now;
            record.last_browsed_page_hint = pageHint;
            record.last_browsed_avid = firstItem?.avid || record.last_browsed_avid || '';
            record.last_browsed_title = firstItem?.title || record.last_browsed_title || '';
        }

        if (options.seedSeen && !record.last_seen_avid && firstItem?.avid) {
            record.last_seen_avid = firstItem.avid;
            record.last_seen_title = firstItem.title || '';
            record.last_seen_at = now;
            record.last_seen_page_hint = pageHint;
            record.last_found_at = now;
            applyTrackingUnreadEstimate(record, 0);
            record.check_status = 'latest';
            record.check_note = '初始断点已设为当前首项';
        }

        if (options.explicitLastSeen?.avid) {
            record.last_seen_avid = options.explicitLastSeen.avid;
            record.last_seen_title = options.explicitLastSeen.title || '';
            record.last_seen_at = now;
            record.last_seen_page_hint = options.explicitLastSeen.page_hint || pageHint;
            record.last_found_at = now;
            const explicitUnreadEstimate = Number(options.explicitLastSeen.unread_estimate);
            if (Number.isFinite(explicitUnreadEstimate) && explicitUnreadEstimate >= 0) {
                const totalUnread = estimateTrackingUnreadTotal(record, {
                    localUnread: explicitUnreadEstimate,
                    localFound: true,
                    localPage: record.last_seen_page_hint,
                    topPage: record.top_page_hint,
                    pageSize: record.page_size_hint
                });
                applyTrackingUnreadEstimate(record, totalUnread >= 0 ? totalUnread : explicitUnreadEstimate);
            }
            record.check_status = record.top_avid && normalizeCode(record.top_avid) === normalizeCode(record.last_seen_avid) ? 'latest' : 'checked';
            record.check_note = '断点已更新';
        }

        await saveTrackingRecord(record);
        return record;
    }

    async function markTrackingRecordRead(recordId, source = 'top') {
        const list = await getTrackingSearches();
        const record = list.find(item => item.id === recordId);
        if (!record) return null;
        const now = new Date().toISOString();
        const target = source === 'browse'
            ? { avid: record.last_browsed_avid, title: record.last_browsed_title }
            : { avid: record.top_avid, title: record.top_title };
        if (!target.avid) return null;
        const searchMode = resolveTrackingSearchMode(record, parseTrackingUrl(record.open_url || ''));
        const pageHint = source === 'browse'
            ? (Number(record.last_browsed_page_hint || record.top_page_hint || record.last_seen_page_hint || 0) || 1)
            : (searchMode === 'backfill'
                ? (Number(record.top_page_hint || record.last_browsed_page_hint || record.last_seen_page_hint || 0) || 1)
                : 1);
        record.last_seen_avid = target.avid;
        record.last_seen_title = target.title || '';
        record.last_seen_at = now;
        record.last_seen_page_hint = pageHint;
        record.last_found_at = now;
        applyTrackingUnreadEstimate(record, 0);
        record.check_status = 'latest';
        record.check_note = '已设为已读';
        await saveTrackingRecord(record);
        if (trackingPageState.record?.id === record.id) {
            trackingPageState.record = record;
            applyTrackingPageDecorations(record);
            ensureTrackingPageBar({ context: trackingPageState.context, record });
            refreshTrackingToolbarButtons();
        }
        return record;
    }
