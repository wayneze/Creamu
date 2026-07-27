// @@creamu-part:42-javlibrary-search-runtime
    function resolveJavLibraryComboStaticValue(fieldAlias, rawValue) {
        const normalized = normalizeJavLibraryComboOptionLabel(rawValue);
        if (!normalized) return '';
        const bucket = getJavLibraryComboStaticValueMap()[fieldAlias] || null;
        return compactText(bucket?.[normalized] || '');
    }

    function shouldTryLoadJavLibraryComboOptions(entries) {
        return (Array.isArray(entries) ? entries : []).some((entry) => {
            if (!entry?.fieldAlias || entry.fieldAlias === 'title') return false;
            if (entry.fieldAlias === 'genre') return !resolveJavLibraryComboStaticValue('genre', entry.value);
            return true;
        });
    }

    function resolveJavLibraryComboOptionValue(fieldOptions, rawValue, fieldAlias = '') {
        const normalized = normalizeJavLibraryComboOptionLabel(rawValue);
        if (!normalized) return '';
        const options = Array.isArray(fieldOptions) ? fieldOptions : [];
        let matched = options.find((option) => option.normalized === normalized);
        if (!matched) matched = options.find((option) => option.normalized.includes(normalized) || normalized.includes(option.normalized));
        return compactText(matched?.value || '') || resolveJavLibraryComboStaticValue(fieldAlias, rawValue);
    }

    async function buildJavLibraryComboSearchBody(keyword, seedUrl = location.href) {
        const form = createDefaultJavLibraryComboForm(keyword);
        const entries = parseJavLibraryComboKeyword(keyword);
        if (!entries.length) return form.toString();

        let optionState = null;
        let optionLoadError = null;
        if (shouldTryLoadJavLibraryComboOptions(entries)) {
            try {
                optionState = await loadJavLibraryComboSearchOptions(seedUrl);
            } catch (error) {
                optionLoadError = error;
            }
        }

        const fields = optionState?.fields || {};
        const unresolved = [];
        let genreIndex = 0;
        let castIndex = 0;
        for (const entry of entries) {
            if (entry.fieldAlias === 'title') {
                form.set('title', entry.value);
                continue;
            }
            if (entry.fieldAlias === 'director' || entry.fieldAlias === 'maker' || entry.fieldAlias === 'label') {
                const resolvedValue = resolveJavLibraryComboOptionValue(fields[entry.fieldAlias], entry.value, entry.fieldAlias);
                if (resolvedValue) form.set(entry.fieldAlias, resolvedValue);
                else unresolved.push(entry);
                continue;
            }
            if (entry.fieldAlias === 'genre') {
                const targetField = genreIndex === 0 ? 'genre1' : (genreIndex === 1 ? 'genre2' : '');
                if (!targetField) continue;
                const resolvedValue = resolveJavLibraryComboOptionValue(fields[targetField], entry.value, 'genre')
                    || resolveJavLibraryComboOptionValue(fields.genre1, entry.value, 'genre')
                    || resolveJavLibraryComboOptionValue(fields.genre2, entry.value, 'genre');
                if (resolvedValue) {
                    form.set(targetField, resolvedValue);
                    genreIndex += 1;
                } else {
                    unresolved.push(entry);
                }
                continue;
            }
            if (entry.fieldAlias === 'cast') {
                const targetField = castIndex === 0 ? 'cast1' : (castIndex === 1 ? 'cast2' : '');
                if (!targetField) continue;
                const resolvedValue = resolveJavLibraryComboOptionValue(fields[targetField], entry.value, 'cast')
                    || resolveJavLibraryComboOptionValue(fields.cast1, entry.value, 'cast')
                    || resolveJavLibraryComboOptionValue(fields.cast2, entry.value, 'cast');
                if (resolvedValue) {
                    form.set(targetField, resolvedValue);
                    castIndex += 1;
                } else {
                    unresolved.push(entry);
                }
            }
        }
        if (unresolved.length) {
            console.warn('[Commander] JavLibrary combo 仍有未解析选项', {
                keyword,
                unresolved: unresolved.map((entry) => ({ fieldAlias: entry.fieldAlias, key: entry.key, value: entry.value })),
                optionSource: optionState?.source || 'static',
                optionError: optionLoadError?.message || ''
            });
        }
        return form.toString();
    }

    function buildResolvedJavLibrarySearchUrl(seedParsed, targetPhp, searchId, keyword, pageHint) {
        const localeMatch = String(seedParsed?.pathname || '').match(/^\/([a-z]{2})(?:\/|$)/i);
        const locale = localeMatch?.[1] || 'cn';
        const resultUrl = new URL('/' + locale + '/' + String(targetPhp || '').replace(/^\/+/, ''), seedParsed?.origin || 'https://www.javlibrary.com');
        resultUrl.searchParams.set('searchid', searchId);
        resultUrl.searchParams.set('keyword', keyword);
        if ((Number(pageHint || 0) || 1) > 1) resultUrl.searchParams.set('page', String(Number(pageHint || 0) || 1));
        else resultUrl.searchParams.delete('page');
        return resultUrl.toString();
    }

    async function requestJavLibrarySearchId(seedUrl, ajaxUrl, body, options = {}) {
        let responseText = '';
        let status = 0;
        let blockedByChallenge = false;
        const fetchImpl = options?.fetchWindow && typeof options.fetchWindow.fetch === 'function'
            ? options.fetchWindow.fetch.bind(options.fetchWindow)
            : (typeof fetch === 'function'
                ? fetch.bind(typeof globalThis !== 'undefined' ? globalThis : window)
                : window.fetch.bind(window));
        try {
            const requestInit = {
                method: 'POST',
                credentials: 'include',
                redirect: 'follow',
                cache: 'no-store',
                headers: {
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body
            };
            if (options?.referrerUrl) requestInit.referrer = options.referrerUrl;
            if (options?.referrerPolicy) requestInit.referrerPolicy = options.referrerPolicy;
            const response = await fetchImpl(ajaxUrl, requestInit);
            status = response.status || 0;
            responseText = await response.text();
            blockedByChallenge = isChallengePage(responseText) || isLikelyBotGuardResponse(responseText);
            if (blockedByChallenge || [403, 429, 503].includes(status)) {
                return {
                    ok: false,
                    error: blockedByChallenge ? 'challenge' : ('HTTP ' + status),
                    url: seedUrl,
                    cfRequired: true,
                    blockedByChallenge: blockedByChallenge || [403, 429, 503].includes(status),
                    response: { status, text: responseText }
                };
            }
            if (!response.ok) {
                return { ok: false, error: 'HTTP ' + status, url: seedUrl, response: { status, text: responseText } };
            }
        } catch (error) {
            return { ok: false, error: error?.message || 'network', url: seedUrl, response: null };
        }

        let payload = null;
        try {
            payload = JSON.parse(responseText || '{}');
        } catch (error) {
            if (blockedByChallenge || isChallengePage(responseText) || isLikelyBotGuardResponse(responseText)) {
                return {
                    ok: false,
                    error: 'challenge',
                    url: seedUrl,
                    cfRequired: true,
                    blockedByChallenge: true,
                    response: { status, text: responseText }
                };
            }
            return { ok: false, error: 'JavLibrary 返回的不是 JSON', url: seedUrl, response: { status, text: responseText } };
        }

        const searchId = compactText(payload?.ID || payload?.id || '');
        const targetPhp = compactText(payload?.URL || '');
        if (!searchId || !targetPhp) {
            const delay = Number(payload?.DELAY || payload?.delay || 0) || 0;
            const apiError = Number(payload?.ERROR || payload?.error || 0) || 0;
            if (apiError < 0 && delay > 0) {
                return {
                    ok: false,
                    error: 'rate-limited',
                    url: seedUrl,
                    rateLimited: true,
                    retryAfterMs: delay >= 1000 ? delay : (delay * 1000),
                    response: { status, payload, text: responseText }
                };
            }
            console.warn('[Commander] JavLibrary searchid 响应异常', { seedUrl, ajaxUrl, payload, text: responseText, body });
            return { ok: false, error: '未拿到新的 searchid', url: seedUrl, response: { status, payload, text: responseText } };
        }
        return { ok: true, status, payload, text: responseText, searchId, targetPhp };
    }

    async function resolveJavLibraryTitleSearchUrl(record, options = {}) {
        const keyword = compactText(options.keyword || getTrackingSearchQuery(record, options.context) || '');
        const seedUrl = options.seedUrl || record?.page_url || record?.open_url || location.href;
        const pageHint = Number(options.pageHint || 0) || 1;
        if (!keyword) {
            return { ok: false, error: 'missing-query', url: seedUrl, response: null };
        }

        const seedParsed = parseTrackingUrl(seedUrl || location.href);
        const currentParsed = parseTrackingUrl(location.href);
        if (!seedParsed) {
            return { ok: false, error: '无效的 JavLibrary 链接', url: seedUrl, response: null };
        }
        if (currentParsed && currentParsed.origin !== seedParsed.origin) {
            return { ok: false, error: '请在 JavLibrary 页面中打开这条追更后再重建 searchid', url: seedUrl, response: null };
        }

        const requestResult = await requestJavLibrarySearchId(seedUrl, buildJavLibrarySimpleSearchAjaxUrl(seedUrl), 'type=1&data=' + encodeURIComponent(keyword));
        if (!requestResult.ok) return requestResult;
        return {
            ok: true,
            url: buildResolvedJavLibrarySearchUrl(seedParsed, requestResult.targetPhp || 'vl_searchbytitle.php', requestResult.searchId, keyword, pageHint),
            response: { status: requestResult.status, payload: requestResult.payload, text: requestResult.text },
            keyword
        };
    }

    async function resolveJavLibraryComboSearchUrl(record, options = {}) {
        const keyword = compactText(options.keyword || getTrackingSearchQuery(record, options.context) || '');
        const seedUrl = options.seedUrl || record?.page_url || record?.open_url || location.href;
        const pageHint = Number(options.pageHint || 0) || 1;
        if (!keyword) {
            return { ok: false, error: 'missing-query', url: seedUrl, response: null };
        }

        const seedParsed = parseTrackingUrl(seedUrl || location.href);
        const currentParsed = parseTrackingUrl(location.href);
        if (!seedParsed) {
            return { ok: false, error: '无效的 JavLibrary 链接', url: seedUrl, response: null };
        }
        if (currentParsed && currentParsed.origin !== seedParsed.origin) {
            return { ok: false, error: '请在 JavLibrary 页面中打开这条追更后再重建 searchid', url: seedUrl, response: null };
        }

        const ajaxUrl = buildJavLibraryComboSearchAjaxUrl(seedUrl);
        const searchUrl = buildJavLibraryAdvancedSearchUrl(seedUrl);
        const requestBody = await buildJavLibraryComboSearchBody(keyword, seedUrl);
        const requestOptions = { referrerUrl: searchUrl, referrerPolicy: 'strict-origin-when-cross-origin' };
        const requestResult = await requestJavLibrarySearchId(seedUrl, ajaxUrl, requestBody, requestOptions);
        if (!requestResult.ok) return requestResult;
        return {
            ok: true,
            url: buildResolvedJavLibrarySearchUrl(seedParsed, requestResult.targetPhp || 'vl_searchbycombo.php', requestResult.searchId, keyword, pageHint),
            response: { status: requestResult.status, payload: requestResult.payload, text: requestResult.text },
            keyword
        };
    }

    async function resolveJavLibrarySearchUrl(record, options = {}) {
        const seedUrl = options.seedUrl || record?.page_url || record?.open_url || location.href;
        return isJavLibraryComboSearchUrl(seedUrl)
            ? resolveJavLibraryComboSearchUrl(record, options)
            : resolveJavLibraryTitleSearchUrl(record, options);
    }

    const JAVLIBRARY_PENDING_COMBO_REBUILD_KEY = 'jlc_pending_javlibrary_combo_rebuild_v1';

    function loadPendingJavLibraryComboRebuild() {
        const raw = GM_getValue(JAVLIBRARY_PENDING_COMBO_REBUILD_KEY, '');
        if (!raw) return null;
        try {
            return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (error) {
            return null;
        }
    }

    function savePendingJavLibraryComboRebuild(payload) {
        GM_setValue(JAVLIBRARY_PENDING_COMBO_REBUILD_KEY, payload ? JSON.stringify(payload) : '');
    }

    function clearPendingJavLibraryComboRebuild() {
        GM_setValue(JAVLIBRARY_PENDING_COMBO_REBUILD_KEY, '');
    }

    function isJavLibraryAdvancedSearchPageUrl(url = location.href) {
        const parsed = parseTrackingUrl(url || '');
        if (!parsed) return false;
        return /javlibrary\./i.test(String(parsed.hostname || ''))
            && /\/search\.php$/i.test(String(parsed.pathname || '').toLowerCase());
    }

    async function waitForJavLibraryAdvancedSearchDocument(timeoutMs = 20000) {
        if (isJavLibraryAdvancedSearchDocumentReady(document)) return document;
        return new Promise((resolve, reject) => {
            const deadline = Date.now() + timeoutMs;
            let timer = 0;
            const inspect = () => {
                if (isJavLibraryAdvancedSearchDocumentReady(document)) {
                    if (timer) window.clearTimeout(timer);
                    resolve(document);
                    return;
                }
                if (Date.now() >= deadline) {
                    if (timer) window.clearTimeout(timer);
                    reject(new Error('search-page-form-not-ready' + (summarizeJavLibrarySearchDocument(document) ? ' · ' + summarizeJavLibrarySearchDocument(document) : '')));
                    return;
                }
                timer = window.setTimeout(inspect, 300);
            };
            inspect();
        });
    }

    async function redirectToJavLibraryComboSearchPage(record, options = {}) {
        const seedUrl = options.seedUrl || record?.page_url || record?.open_url || location.href;
        const keyword = compactText(options.keyword || getTrackingSearchQuery(record, options.context) || '');
        const pageHint = Number(options.pageHint || 0) || 1;
        if (!keyword) {
            return { ok: false, error: 'missing-query', url: seedUrl, response: null };
        }
        savePendingJavLibraryComboRebuild({
            recordId: compactText(record?.id || ''),
            keyword,
            seedUrl,
            pageHint,
            createdAt: Date.now()
        });
        if (record?.id) await saveTrackingRecord(record);
        const searchUrl = buildJavLibraryAdvancedSearchUrl(seedUrl);
        location.href = searchUrl;
        return { ok: false, pending: true, url: searchUrl, response: null };
    }

    async function processPendingJavLibraryComboRebuild() {
        if (currentWeb !== 'javlibrary' || !isJavLibraryAdvancedSearchPageUrl(location.href)) return false;
        const pending = loadPendingJavLibraryComboRebuild();
        if (!pending) return false;
        const createdAt = Number(pending.createdAt || 0) || 0;
        if (createdAt > 0 && Date.now() - createdAt > 10 * 60 * 1000) {
            clearPendingJavLibraryComboRebuild();
            return false;
        }

        const seedUrl = pending.seedUrl || location.href;
        const searchUrl = buildJavLibraryAdvancedSearchUrl(seedUrl);
        if (buildTrackingCanonicalUrl(location.href) !== buildTrackingCanonicalUrl(searchUrl)) {
            location.replace(searchUrl);
            return true;
        }

        let record = null;
        if (pending.recordId) {
            try {
                record = await getVal(TRACKING_STORE, pending.recordId);
            } catch (error) {
                record = null;
            }
        }
        const keyword = compactText(pending.keyword || getTrackingSearchQuery(record) || '');
        if (!keyword) {
            clearPendingJavLibraryComboRebuild();
            showAlert('组合搜索重建失败：缺少原搜索词');
            return true;
        }

        try {
            await waitForJavLibraryAdvancedSearchDocument(20000);
        } catch (error) {
            clearPendingJavLibraryComboRebuild();
            showAlert('组合搜索页还没准备好：' + (error?.message || '未知错误'));
            return true;
        }

        if (record) applyTrackingSearchQuery(record, keyword);
        const pageHint = Number(pending.pageHint || 0) || 1;
        const ajaxUrl = buildJavLibraryComboSearchAjaxUrl(seedUrl);
        const requestBody = await buildJavLibraryComboSearchBody(keyword, seedUrl);
        const requestOptions = { fetchWindow: window, referrerUrl: searchUrl, referrerPolicy: 'strict-origin-when-cross-origin' };
        const requestResult = await requestJavLibrarySearchId(seedUrl, ajaxUrl, requestBody, requestOptions);
        clearPendingJavLibraryComboRebuild();
        if (!requestResult.ok) {
            if (record?.id) {
                record.last_check_at = new Date().toISOString();
                record.check_status = 'error';
                record.check_note = '组合搜索重建失败 · ' + (requestResult.error || '未知错误');
                await saveTrackingRecord(record);
            }
            showAlert('重新生成 JavLibrary 组合搜索失败：' + (requestResult.error || '未知错误'));
            return true;
        }

        const seedParsed = parseTrackingUrl(seedUrl || location.href);
        const resultUrl = buildResolvedJavLibrarySearchUrl(seedParsed, requestResult.targetPhp || 'vl_searchbycombo.php', requestResult.searchId, keyword, pageHint);
        if (record?.id) {
            record.open_url = resultUrl;
            await saveTrackingRecord(record);
        }
        location.replace(resultUrl);
        return true;
    }

    function isTrackingResolvableOpenUrl(url) {
        const parsed = parseTrackingUrl(url || '');
        if (!parsed) return false;
        if (isJavLibraryResolvableSearchUrl(parsed.href)) {
            const keyword = compactText(parsed.searchParams.get('keyword') || '');
            return !!keyword || !!parsed.searchParams.get('searchid');
        }
        return true;
    }
