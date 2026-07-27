// @@creamu-part:40-tracking-search
    const TRACKING_GROUP_LABELS = {
        actor: '演员',
        director: '导演',
        maker: '制作',
        studio: '片商',
        series: '系列',
        tag: '标签',
        keyword: '关键词',
        custom: '自定义'
    };
    const TRACKING_GROUP_ORDER = ['actor', 'director', 'maker', 'studio', 'series', 'tag', 'keyword', 'custom'];

    function getTrackingUiState() {
        const saved = GM_getValue(TRACKING_UI_STATE_KEY);
        if (saved && typeof saved === 'object') {
            if (!saved.collapsed || typeof saved.collapsed !== 'object') saved.collapsed = {};
            if (saved.refresh_resume && typeof saved.refresh_resume !== 'object') saved.refresh_resume = null;
            if (!Object.prototype.hasOwnProperty.call(saved, 'refresh_resume')) saved.refresh_resume = null;
            return saved;
        }
        return { collapsed: {}, refresh_resume: null };
    }

    function getTrackingRefreshResumeState() {
        const state = getTrackingUiState();
        return state.refresh_resume && typeof state.refresh_resume === 'object' ? state.refresh_resume : null;
    }

    function setTrackingRefreshResumeState(resumeState) {
        const state = getTrackingUiState();
        state.refresh_resume = resumeState && typeof resumeState === 'object' ? resumeState : null;
        GM_setValue(TRACKING_UI_STATE_KEY, state);
    }

    function clearTrackingRefreshResumeState() {
        setTrackingRefreshResumeState(null);
    }

    function getTrackingRefreshRuntimeState() {
        return trackingRefreshRuntimeState && trackingRefreshRuntimeState.active ? trackingRefreshRuntimeState : null;
    }

    function setTrackingRefreshRuntimeState(nextState = null) {
        if (!nextState || nextState.active === false) {
            trackingRefreshRuntimeState = null;
            return null;
        }
        trackingRefreshRuntimeState = Object.assign({}, trackingRefreshRuntimeState || {}, nextState, {
            active: true,
            updated_at: new Date().toISOString()
        });
        return trackingRefreshRuntimeState;
    }

    function buildTrackingRefreshRuntimeSummary(state) {
        if (!state?.active) return '';
        const completed = Number(state.completed || 0) || 0;
        const total = Number(state.total || 0) || 0;
        if (state.phase === 'cooldown') {
            const remainSeconds = Math.max(0, Math.ceil((Number(state.remainingMs || 0) || 0) / 1000));
            const note = compactText(state.note || '') ? (' · ' + compactText(state.note || '')) : '';
            return '批量刷新冷却中 ' + remainSeconds + 's · ' + completed + '/' + total + note;
        }
        const currentIndex = total > 0 ? Math.min(total, completed + (state.phase === 'refreshing' ? 1 : 0)) : completed;
        const note = compactText(state.note || '') ? (' · ' + compactText(state.note || '')) : '';
        return '批量刷新中 ' + currentIndex + '/' + total + note;
    }

    function buildTrackingRefreshRuntimeButtonText(state) {
        if (!state?.active) return '刷新全部';
        if (state.phase === 'cooldown') {
            return '冷却中 ' + Math.max(0, Math.ceil((Number(state.remainingMs || 0) || 0) / 1000)) + 's';
        }
        const completed = Number(state.completed || 0) || 0;
        const total = Number(state.total || 0) || 0;
        return '刷新中 ' + Math.min(total || completed, completed + 1) + '/' + total;
    }

    async function waitTrackingRefreshCountdown(waitMs, onTick = null) {
        let remainingMs = Math.max(0, Number(waitMs || 0) || 0);
        if (!(remainingMs > 0)) {
            if (typeof onTick === 'function') onTick(0);
            return;
        }
        while (remainingMs > 0) {
            if (typeof onTick === 'function') onTick(remainingMs);
            const stepMs = Math.min(1000, remainingMs);
            await delayMs(stepMs);
            remainingMs = Math.max(0, remainingMs - stepMs);
        }
        if (typeof onTick === 'function') onTick(0);
    }

    function setTrackingGroupCollapsed(groupKey, collapsed) {
        const state = getTrackingUiState();
        state.collapsed = state.collapsed || {};
        state.collapsed[groupKey] = !!collapsed;
        GM_setValue(TRACKING_UI_STATE_KEY, state);
    }

    function getTrackingGroupLabel(groupType) {
        return TRACKING_GROUP_LABELS[String(groupType || '').toLowerCase()] || '其他';
    }

    function normalizeTrackingGroupType(groupType) {
        const key = String(groupType || '').toLowerCase();
        return Object.prototype.hasOwnProperty.call(TRACKING_GROUP_LABELS, key) ? key : '';
    }

    function inferTrackingGroupType(site, url, fallbackType = 'custom') {
        const fallback = normalizeTrackingGroupType(fallbackType) || 'custom';
        const parsed = parseTrackingUrl(url || '');
        if (!parsed) return fallback;
        const lowerSite = String(site || '').toLowerCase();
        const lowerPath = String(parsed.pathname || '').toLowerCase();
        const combined = lowerPath + String(parsed.search || '');
        if (lowerSite === 'javlibrary') {
            if (/director/i.test(combined)) return 'director';
            if (/maker/i.test(combined)) return 'maker';
            if (/label|studio/i.test(combined)) return 'studio';
            if (/series/i.test(combined)) return 'series';
            if (/tag|genre/i.test(combined)) return 'tag';
            if (/star|actress|actor/i.test(combined)) return 'actor';
            return fallback;
        }
        if (lowerSite === 'javbus' || lowerSite === 'avmoo') {
            if (/\/director\//i.test(lowerPath)) return 'director';
            if (/\/maker\//i.test(lowerPath)) return 'maker';
            if (/\/studio\//i.test(lowerPath)) return 'studio';
            if (/\/series\//i.test(lowerPath)) return 'series';
            if (/\/(?:genre|genres)\//i.test(lowerPath)) return 'tag';
            if (/\/star\//i.test(lowerPath)) return 'actor';
            return fallback;
        }
        if (lowerSite === 'javdb') {
            if (/\/directors?\//i.test(lowerPath)) return 'director';
            if (/\/makers?\//i.test(lowerPath)) return 'maker';
            if (/\/(?:studios?|publishers?|labels?)\//i.test(lowerPath)) return 'studio';
            if (/\/series\//i.test(lowerPath)) return 'series';
            if (/\/(?:tags?|categories)\//i.test(lowerPath)) return 'tag';
            if (/\/actors?\//i.test(lowerPath)) return 'actor';
            return fallback;
        }
        return fallback;
    }

    function getTrackingEffectiveGroupType(record = null) {
        const explicit = normalizeTrackingGroupType(record?.group_type || '');
        if (explicit && explicit !== 'series' && explicit !== 'custom') return explicit;
        const inferred = inferTrackingGroupType(record?.site, record?.page_url || record?.open_url || '', explicit || record?.page_type || 'custom');
        return normalizeTrackingGroupType(inferred || explicit || 'custom') || 'custom';
    }

    function delayMs(ms) {
        return new Promise(resolve => window.setTimeout(resolve, ms));
    }

    function parseTrackingUrl(url, fallback) {
        try {
            return new URL(url, fallback || location.href);
        } catch (error) {
            try {
                return new URL(String(url || ''), 'https://www.javlibrary.com/');
            } catch (innerError) {
                return null;
            }
        }
    }

    function buildTrackingCanonicalUrl(url = location.href) {
        const parsed = parseTrackingUrl(url);
        if (!parsed) return String(url || '');
        parsed.hash = '';
        ['page', 'p', 'offset'].forEach(key => parsed.searchParams.delete(key));
        if (/javlibrary\./i.test(String(parsed.hostname || '')) && /\/vl_searchby(?:title|combo)\.php$/i.test(String(parsed.pathname || '').toLowerCase())) {
            const keyword = compactText(parsed.searchParams.get('keyword') || parsed.searchParams.get('q') || parsed.searchParams.get('search') || '');
            const lowerPath = String(parsed.pathname || '').toLowerCase();
            if (/\/vl_searchbycombo\.php$/i.test(lowerPath) || keyword) {
                parsed.searchParams.delete('searchid');
            }
        }
        if (/\/(?:search|star|actor|actors|actress|series|genre|genres|tag|tags|studio|studios|maker|makers|director|directors|label|labels|publisher|publishers)\/[^/?]+\/\d+\/?$/i.test(parsed.pathname)) {
            parsed.pathname = parsed.pathname.replace(/\/\d+\/?$/, '');
        }
        parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/');
        return parsed.toString().replace(/\/$/, '');
    }

    function decodeTrackingSegment(value) {
        if (value == null) return '';
        try {
            return decodeURIComponent(String(value)).trim();
        } catch (error) {
            return String(value || '').trim();
        }
    }

    function normalizeTrackingQueryLabel(value) {
        let text = compactText(decodeTrackingSegment(value || ''));
        if (!text) return '';
        text = text
            .replace(/^(?:search\s*result(?:s)?(?:\s*of)?|search|results?\s*for|搜索结果|搜尋結果|标题搜索|標題搜索|title\s*search|组合搜索|組合搜索|combo\s*search)[:：\s-]*/i, '')
            .replace(/^["'“”‘’【】\[\]『』]+|["'“”‘’【】\[\]『』]+$/g, '')
            .trim();
        return text;
    }

    function isTrackingSiteGenericLabel(value) {
        const text = normalizeTrackingQueryLabel(value || '').toLowerCase();
        if (!text) return false;
        return /^(?:javlibrary|jav\s*library|javbus|javdb|avmoo|missav|emby|metatube)$/.test(text);
    }

    function isTrackingGenericSearchLabel(value) {
        const text = normalizeTrackingQueryLabel(value || '').toLowerCase();
        if (!text) return false;
        return isTrackingSiteGenericLabel(text)
            || /^(?:search\s*result(?:s)?|results?\s*for|标题搜(?:索|尋|寻)结果|標題搜(?:索|尋|寻)結果|标题搜(?:索|尋|寻)|標題搜(?:索|尋|寻)|title\s*search(?:\s*result(?:s)?)?|组合搜(?:索|尋|寻)结果|組合搜(?:索|尋|寻)結果|组合搜(?:索|尋|寻)|組合搜(?:索|尋|寻)|combo\s*search(?:\s*result(?:s)?)?)$/i.test(text);
    }

    /** 工作台/设置等脚本 UI 文案，禁止当追更标题或关键词 */
    function isTrackingUiChromeLabel(value) {
        const text = compactText(value || '');
        if (!text) return true;
        const bare = text
            .replace(/^(?:javlibrary|jav\s*library|javbus|javdb|jlc)\s*[·•|\-—–]\s*/i, '')
            .trim();
        if (!bare) return true;
        return /^(?:资源增强|详情页资源增强|系统连接|熟人与资料库|数据与界面|指挥官|工作台|Creamu|Creamu\s*·\s*JavLibrary|设置|追更|视图|资源|连接|熟人|数据|加载中|保存并应用|立即同步|重新读取|仅导入配置|完整导入|导出配置|完整导出)$/i.test(bare)
            || /资源增强|详情页资源增强|系统连接|熟人与资料库|数据与界面/.test(text);
    }

    function isScriptUiNode(node) {
        if (!node || typeof node.closest !== 'function') return false;
        return !!node.closest([
            '#jlc-wb',
            '#jlc-wb-fab',
            '#jlc-wb-dialog',
            '#jlc-panel',
            '#jlc-tracking-pagebar',
            '#jlc-toast',
            '#jlc-alert',
            '.jlc-resource-center',
            '.jlc-resource-root',
            '[id^="jlc-"]'
        ].join(','));
    }

    /** 仅当新标签非 UI 污染、且旧值空/污染/明显更弱时才采纳 */
    function shouldAdoptTrackingLabel(nextValue, prevValue) {
        const next = compactText(nextValue || '');
        const prev = compactText(prevValue || '');
        if (!next || isTrackingUiChromeLabel(next)) return false;
        if (!prev || isTrackingUiChromeLabel(prev)) return true;
        if (isTrackingGenericSearchLabel(next) && !isTrackingGenericSearchLabel(prev)) return false;
        if (next === prev) return false;
        return true;
    }

    function buildTrackingSearchFallbackLabel(label, parsed) {
        const searchId = compactText(parsed?.searchParams?.get('searchid') || '');
        const page = Number(parsed?.searchParams?.get('page') || parsed?.searchParams?.get('p') || 0) || 0;
        let text = String(label || '搜索');
        if (searchId) text += ' #' + searchId;
        if (page > 1) text += ' · 第' + page + '页';
        return text;
    }

    function extractTrackingSearchKeyword(doc = document, parsed, heading = '') {
        const candidates = [];
        const pushCandidate = (value) => {
            const text = normalizeTrackingQueryLabel(value || '');
            if (!text || isTrackingGenericSearchLabel(text) || isTrackingSiteGenericLabel(text) || isTrackingUiChromeLabel(text)) return;
            if (!candidates.includes(text)) candidates.push(text);
        };
        pushCandidate(parsed?.searchParams?.get('keyword'));
        pushCandidate(parsed?.searchParams?.get('q'));
        pushCandidate(parsed?.searchParams?.get('search'));
        [
            'input[name="keyword"]',
            'input[name="q"]',
            'input[name="search"]',
            'input[type="search"]',
            'form[action*="search"] input[type="text"]',
            'form[action*="search"] input[type="search"]',
            'form[action*="vl_searchbytitle"] input[type="text"]',
            'form[action*="vl_searchbytitle"] input[type="search"]',
            '#search input[type="text"]',
            '#search input[type="search"]',
            '.search input[type="text"]',
            '.search input[type="search"]'
        ].forEach(selector => {
            doc.querySelectorAll(selector).forEach(node => {
                pushCandidate(node?.value || node?.getAttribute?.('value') || node?.textContent || '');
            });
        });
        const titleText = compactText(doc?.title || '');
        const titleMatches = [
            titleText.match(/[“"「『](.+?)[”"」』]/),
            titleText.match(/(?:search\s*(?:result(?:s)?\s*(?:of|for)?|for)|标题搜(?:索|尋|寻)结果|標題搜(?:索|尋|寻)結果|title\s*search)[:：\s-]*(.+?)\s*(?:[-|｜]\s*JAVLibrary.*)?$/i),
            titleText.match(/^(.+?)\s*(?:[-|｜]\s*JAVLibrary.*)$/i)
        ];
        titleMatches.forEach(match => pushCandidate(match?.[1] || ''));
        pushCandidate(heading);
        return candidates[0] || '';
    }

    function detectTrackingSearchMode(site, parsed) {
        if (String(site || '').toLowerCase() !== 'javlibrary') return 'forward';
        const lowerPath = String(parsed?.pathname || '').toLowerCase();
        if (/\/vl_searchbytitle\.php$/i.test(lowerPath)) return 'backfill';
        if (/\/vl_searchbycombo\.php$/i.test(lowerPath)) return 'forward';
        return 'forward';
    }

    function resolveTrackingSearchMode(recordOrSite, parsed) {
        const site = typeof recordOrSite === 'string' ? recordOrSite : recordOrSite?.site;
        const explicit = typeof recordOrSite === 'string' ? '' : String(recordOrSite?.search_mode || '').toLowerCase();
        if (explicit === 'backfill' || explicit === 'forward') return explicit;
        return detectTrackingSearchMode(site, parsed);
    }

    function buildTrackingOpenUrl(site, parsed, descriptor = {}) {
        const target = parseTrackingUrl(parsed?.href || parsed || location.href);
        if (!target) return buildTrackingCanonicalUrl(parsed?.href || parsed || location.href);
        target.hash = '';
        const lowerSite = String(site || '').toLowerCase();
        const lowerPath = String(target.pathname || '').toLowerCase();
        ['page', 'p', 'offset'].forEach(key => target.searchParams.delete(key));
        if (lowerSite === 'javlibrary') {
            if (/\/vl_searchbycombo\.php$/i.test(lowerPath)) {
                const pageCandidate = descriptor?.page_url || descriptor?.pageUrl || descriptor?.href || '';
                if (!compactText(target.searchParams.get('searchid') || '') && pageCandidate) {
                    const pageParsed = parseTrackingUrl(pageCandidate, target.href);
                    const pageLowerPath = String(pageParsed?.pathname || '').toLowerCase();
                    if (pageParsed && /\/vl_searchbycombo\.php$/i.test(pageLowerPath)) {
                        const pageSearchId = compactText(pageParsed.searchParams.get('searchid') || '');
                        const pageKeyword = pageParsed.searchParams.get('keyword') || '';
                        if (pageSearchId) target.searchParams.set('searchid', pageSearchId);
                        if (!target.searchParams.get('keyword') && pageKeyword) target.searchParams.set('keyword', pageKeyword);
                    }
                }
                return target.toString().replace(/\/$/, '');
            }
            if (/\/vl_searchbytitle\.php$/i.test(lowerPath)) {
                const currentKeyword = compactText(target.searchParams.get('keyword') || '');
                if (currentKeyword && isTrackingGenericSearchLabel(currentKeyword)) {
                    target.searchParams.delete('keyword');
                }
                return target.toString().replace(/\/$/, '');
            }
        }
        return buildTrackingCanonicalUrl(target.href);
    }

    function isJavLibraryTitleSearchUrl(url) {
        const parsed = parseTrackingUrl(url || '');
        if (!parsed) return false;
        return /javlibrary\./i.test(String(parsed.hostname || ''))
            && /\/vl_searchbytitle\.php$/i.test(String(parsed.pathname || '').toLowerCase());
    }

    function pickTrackingSearchQueryCandidate(candidates = []) {
        for (const candidate of candidates) {
            const text = normalizeTrackingQueryLabel(candidate || '');
            if (!text || isTrackingGenericSearchLabel(text) || isTrackingSiteGenericLabel(text)) continue;
            return text;
        }
        return '';
    }

    function extractTrackingSearchQueryFromUrl(url = '') {
        const parsed = parseTrackingUrl(url || '');
        if (!parsed) return '';
        return pickTrackingSearchQueryCandidate([
            parsed.searchParams.get('keyword'),
            parsed.searchParams.get('q'),
            parsed.searchParams.get('search')
        ]);
    }

    function replaceTrackingSearchKeywordInUrl(url = '', keyword = '') {
        const parsed = parseTrackingUrl(url || '');
        const searchQuery = compactText(keyword || '');
        if (!parsed || !searchQuery) return compactText(url || '');
        if (isJavLibraryResolvableSearchUrl(parsed.href)) {
            parsed.searchParams.set('keyword', searchQuery);
        }
        return parsed.toString().replace(/\/$/, '');
    }

    function getTrackingSearchQuery(record = null, fallbackContext = null) {
        const primaryCandidates = [
            record?.raw_query,
            record?.query_text,
            extractTrackingSearchQueryFromUrl(record?.page_url || ''),
            extractTrackingSearchQueryFromUrl(record?.open_url || ''),
            getTrackingEffectiveGroupType(record) === 'keyword' ? record?.group_name : '',
            record?.manual_query
        ];
        const primaryQuery = pickTrackingSearchQueryCandidate(primaryCandidates);
        if (primaryQuery) return primaryQuery;
        if (record?.id) return '';
        const fallbackCandidates = [
            fallbackContext?.raw_query,
            fallbackContext?.query_text,
            extractTrackingSearchQueryFromUrl(fallbackContext?.pageUrl || fallbackContext?.page_url || ''),
            extractTrackingSearchQueryFromUrl(fallbackContext?.open_url || ''),
            normalizeTrackingGroupType(fallbackContext?.group_type || '') === 'keyword' ? fallbackContext?.group_name : '',
            fallbackContext?.manual_query
        ];
        return pickTrackingSearchQueryCandidate(fallbackCandidates);
    }

    function promptTrackingSearchQuery(record = null, context = null) {
        const recordDefault = getTrackingSearchQuery(record)
            || pickTrackingSearchQueryCandidate([
                getTrackingEffectiveGroupType(record) === 'keyword' ? record?.group_name : '',
                record?.custom_label
            ]);
        const contextDefault = getTrackingSearchQuery(null, context)
            || pickTrackingSearchQueryCandidate([
                normalizeTrackingGroupType(context?.group_type || '') === 'keyword' ? context?.group_name : '',
                context?.custom_label
            ]);
        const defaultValue = record?.id ? recordDefault : (recordDefault || contextDefault);
        const result = window.prompt('请输入这个 JavLibrary 搜索的原始关键词 / 组合条件（用于重新生成已过期搜索）', defaultValue);
        if (result == null) return null;
        return compactText(result);
    }

    function applyTrackingSearchQuery(record, rawQuery) {
        if (!record) return '';
        const searchQuery = compactText(rawQuery || '');
        record.manual_query = searchQuery;
        if (!searchQuery) return '';
        record.raw_query = searchQuery;
        record.query_text = searchQuery;
        if (isJavLibraryResolvableSearchUrl(record?.page_url || record?.open_url || '')) {
            if (record.page_url) record.page_url = replaceTrackingSearchKeywordInUrl(record.page_url, searchQuery);
            if (record.open_url) record.open_url = replaceTrackingSearchKeywordInUrl(record.open_url, searchQuery);
        }
        if (getTrackingEffectiveGroupType(record) === 'keyword' || isJavLibraryResolvableSearchUrl(record?.page_url || record?.open_url || '')) {
            if (searchQuery && !isTrackingUiChromeLabel(searchQuery)) {
                record.group_name = searchQuery;
                record.title = getSiteLabel(record.site) + ' · ' + searchQuery;
            }
        }
        record.query_signature = buildTrackingSignature({
            site: record.site,
            page_type: record.page_type,
            open_url: record.open_url || record.page_url || '',
            pageUrl: record.page_url || record.open_url || '',
            raw_query: record.raw_query,
            query_text: record.query_text
        });
        return searchQuery;
    }

    function buildJavLibraryTitleSearchSubmitUrl(seedUrl = location.href) {
        const parsed = parseTrackingUrl(seedUrl || location.href);
        if (!parsed) return 'https://www.javlibrary.com/cn/vl_searchbytitle.php';
        const localeMatch = String(parsed.pathname || '').match(/^\/([a-z]{2})(?:\/|$)/i);
        const locale = localeMatch?.[1] || 'cn';
        return new URL('/' + locale + '/vl_searchbytitle.php', parsed.origin).toString();
    }

    function buildJavLibrarySimpleSearchAjaxUrl(seedUrl = location.href) {
        const parsed = parseTrackingUrl(seedUrl || location.href);
        if (!parsed) return 'https://www.javlibrary.com/ajax/ajax_simplesearch.php';
        return new URL('/ajax/ajax_simplesearch.php', parsed.origin).toString();
    }

    function isJavLibraryComboSearchUrl(url) {
        const parsed = parseTrackingUrl(url || '');
        if (!parsed) return false;
        return /javlibrary\./i.test(String(parsed.hostname || ''))
            && /\/vl_searchbycombo\.php$/i.test(String(parsed.pathname || '').toLowerCase());
    }

    function isJavLibraryResolvableSearchUrl(url) {
        return isJavLibraryTitleSearchUrl(url) || isJavLibraryComboSearchUrl(url);
    }

    function buildJavLibraryComboSearchAjaxUrl(seedUrl = location.href) {
        const parsed = parseTrackingUrl(seedUrl || location.href);
        if (!parsed) return 'https://www.javlibrary.com/ajax/ajax_combosearch.php';
        return new URL('/ajax/ajax_combosearch.php', parsed.origin).toString();
    }

    function buildJavLibraryAdvancedSearchUrl(seedUrl = location.href) {
        const parsed = parseTrackingUrl(seedUrl || location.href);
        if (!parsed) return 'https://www.javlibrary.com/cn/search.php';
        const localeMatch = String(parsed.pathname || '').match(/^\/([a-z]{2})(?:\/|$)/i);
        const locale = localeMatch?.[1] || 'cn';
        return new URL('/' + locale + '/search.php', parsed.origin).toString();
    }

    const JAVLIBRARY_COMBO_OPTION_CACHE = new Map();
    const JAVLIBRARY_SEARCH_PAGE_CONTEXT_CACHE = new Map();
    const JAVLIBRARY_COMBO_OPTION_STORAGE_KEY = 'jlc_javlibrary_combo_option_snapshot_v1';
    const JAVLIBRARY_COMBO_FIELD_TABLE_MAP = Object.freeze({
        director: 'director_filter',
        maker: 'maker_filter',
        label: 'label_filter',
        genre: 'genre_filter',
        cast: 'cast_filter'
    });

    function normalizeJavLibraryComboOptionLabel(value) {
        return compactText(value || '')
            .replace(/[：:=]/g, '')
            .replace(/[()（）\[\]【】]/g, '')
            .replace(/[\/／]/g, '')
            .replace(/[|｜]/g, '')
            .replace(/\s+/g, '')
            .toLowerCase();
    }

    function resolveJavLibraryComboFieldAlias(rawKey) {
        const key = normalizeJavLibraryComboOptionLabel(rawKey);
        if (!key) return '';
        if (key.includes('title') || key.includes('標題') || key.includes('标题') || key.includes('片名')) return 'title';
        if (key.includes('genre') || key.includes('ジャンル') || key.includes('類別') || key.includes('类别') || key.includes('分類') || key.includes('分类')) return 'genre';
        if (key.includes('director') || key.includes('監督') || key.includes('导演') || key.includes('導演')) return 'director';
        if (key.includes('maker') || key.includes('メーカー') || key.includes('製作') || key.includes('制作') || key.includes('片商') || key.includes('studio')) return 'maker';
        if (key.includes('label') || key.includes('レーベル') || key.includes('系列') || key.includes('厂牌') || key.includes('廠牌')) return 'label';
        if (key.includes('cast') || key.includes('actor') || key.includes('出演') || key.includes('女优') || key.includes('女優') || key.includes('演员') || key.includes('演員')) return 'cast';
        return '';
    }

    function parseJavLibraryComboKeyword(keyword) {
        const raw = compactText(keyword || '');
        if (!raw || !raw.includes('=')) return [];
        const entries = [];
        const segments = raw.split('||');
        for (const segment of segments) {
            const cleaned = compactText(String(segment || '').replace(/^\|+|\|+$/g, ''));
            if (!cleaned) continue;
            const normalized = cleaned.replace(/＝/g, '=');
            const dividerIndex = normalized.indexOf('=');
            if (dividerIndex <= 0) continue;
            const key = compactText(normalized.slice(0, dividerIndex));
            const value = compactText(normalized.slice(dividerIndex + 1));
            const fieldAlias = resolveJavLibraryComboFieldAlias(key);
            if (!fieldAlias || !value) continue;
            entries.push({ key, value, fieldAlias });
        }
        return entries;
    }

    function isJavLibraryAdvancedSearchDocumentReady(doc) {
        return !!doc?.querySelector([
            'select[name="genre1"]',
            'select[name="genre2"]',
            'select[name="director"]',
            'select[name="maker"]',
            'select[name="label"]',
            '#genre_filter .multiselectblock .block[value]',
            '#director_filter .multiselectblock .block[value]',
            '#maker_filter .multiselectblock .block[value]',
            '#label_filter .multiselectblock .block[value]',
            '#cast_filter .multiselectblock .block[value]'
        ].join(', '));
    }

    function summarizeJavLibrarySearchDocument(doc) {
        return compactText(doc?.body?.textContent || doc?.title || '').slice(0, 120);
    }

    function parseJavLibrarySearchHtml(htmlText) {
        const html = String(htmlText || '');
        if (!html) return null;
        try {
            return new DOMParser().parseFromString(html, 'text/html');
        } catch (error) {
            return null;
        }
    }

    function createJavLibraryComboOptionEntry(value, label) {
        const normalized = normalizeJavLibraryComboOptionLabel(label);
        const compactValue = compactText(value || '');
        const compactLabel = compactText(label || '');
        if (!normalized || !compactValue) return null;
        return { value: compactValue, label: compactLabel, normalized };
    }

    function mergeJavLibraryComboOptionArrays(...lists) {
        const merged = [];
        const seen = new Set();
        lists.flat().forEach((option) => {
            const normalized = compactText(option?.normalized || normalizeJavLibraryComboOptionLabel(option?.label || ''));
            const value = compactText(option?.value || '');
            const label = compactText(option?.label || '');
            if (!normalized || !value) return;
            const key = normalized + '|' + value;
            if (seen.has(key)) return;
            seen.add(key);
            merged.push({ value, label, normalized });
        });
        return merged;
    }

    function extractJavLibraryComboSelectOptions(doc, name) {
        const select = doc?.querySelector('select[name="' + name + '"]');
        if (!select) return [];
        return mergeJavLibraryComboOptionArrays(Array.from(select.querySelectorAll('option')).map((option) => createJavLibraryComboOptionEntry(option.getAttribute('value') || '', option.textContent || '')));
    }

    function extractJavLibraryComboBlockOptions(doc, fieldAlias) {
        const tableId = JAVLIBRARY_COMBO_FIELD_TABLE_MAP[fieldAlias] || '';
        if (!tableId) return [];
        const nodes = doc?.querySelectorAll('#' + tableId + ' .multiselectblock .block[value]') || [];
        return mergeJavLibraryComboOptionArrays(Array.from(nodes).map((node) => createJavLibraryComboOptionEntry(node.getAttribute('value') || '', node.textContent || '')));
    }

    function normalizeJavLibraryComboOptionFields(fields) {
        const next = Object.create(null);
        for (const name of ['director', 'maker', 'label', 'genre1', 'genre2', 'cast1', 'cast2']) {
            next[name] = mergeJavLibraryComboOptionArrays(fields?.[name] || []);
        }
        return next;
    }

    function mergeJavLibraryComboOptionFields(...sources) {
        const merged = Object.create(null);
        for (const name of ['director', 'maker', 'label', 'genre1', 'genre2', 'cast1', 'cast2']) {
            merged[name] = mergeJavLibraryComboOptionArrays(...sources.map((source) => source?.[name] || []));
        }
        return merged;
    }

    function hasJavLibraryComboOptionFields(fields) {
        return ['director', 'maker', 'label', 'genre1', 'genre2', 'cast1', 'cast2'].some((name) => Array.isArray(fields?.[name]) && fields[name].length > 0);
    }

    function loadStoredJavLibraryComboOptionFields() {
        const raw = GM_getValue(JAVLIBRARY_COMBO_OPTION_STORAGE_KEY, '');
        if (!raw) return normalizeJavLibraryComboOptionFields({});
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return normalizeJavLibraryComboOptionFields(parsed?.fields || parsed || {});
        } catch (error) {
            return normalizeJavLibraryComboOptionFields({});
        }
    }

    function saveStoredJavLibraryComboOptionFields(fields, meta = {}) {
        const incoming = normalizeJavLibraryComboOptionFields(fields || {});
        if (!hasJavLibraryComboOptionFields(incoming)) return loadStoredJavLibraryComboOptionFields();
        const current = loadStoredJavLibraryComboOptionFields();
        const merged = mergeJavLibraryComboOptionFields(current, incoming);
        const currentJson = JSON.stringify(current);
        const mergedJson = JSON.stringify(merged);
        if (currentJson !== mergedJson) {
            GM_setValue(JAVLIBRARY_COMBO_OPTION_STORAGE_KEY, JSON.stringify({
                updatedAt: Date.now(),
                source: compactText(meta?.source || ''),
                fields: merged
            }));
        }
        return merged;
    }

    async function ensureJavLibrarySearchPageContext(seedUrl = location.href) {
        const searchUrl = buildJavLibraryAdvancedSearchUrl(seedUrl);
        if (JAVLIBRARY_SEARCH_PAGE_CONTEXT_CACHE.has(searchUrl)) return JAVLIBRARY_SEARCH_PAGE_CONTEXT_CACHE.get(searchUrl);
        const pending = new Promise((resolve, reject) => {
            const frame = document.createElement('iframe');
            frame.style.cssText = 'position:fixed;left:-99999px;top:-99999px;width:1px;height:1px;opacity:0;pointer-events:none;border:0;';
            frame.setAttribute('aria-hidden', 'true');
            let settled = false;
            let timer = 0;
            let deadline = 0;
            const cleanup = () => {
                frame.onload = null;
                frame.onerror = null;
                if (timer) {
                    window.clearTimeout(timer);
                    timer = 0;
                }
            };
            const fail = (error) => {
                if (settled) return;
                settled = true;
                cleanup();
                try { frame.remove(); } catch (_) {}
                JAVLIBRARY_SEARCH_PAGE_CONTEXT_CACHE.delete(searchUrl);
                reject(error instanceof Error ? error : new Error(String(error || 'load-search-page-failed')));
            };
            const inspect = () => {
                if (settled) return;
                try {
                    const win = frame.contentWindow;
                    const doc = frame.contentDocument || win?.document;
                    if (!win || !doc) throw new Error('search-page-context-empty');
                    if (isJavLibraryAdvancedSearchDocumentReady(doc)) {
                        settled = true;
                        cleanup();
                        resolve({ searchUrl, frame, window: win, document: doc });
                        return;
                    }
                    if (Date.now() >= deadline) {
                        const snippet = compactText(doc.body?.textContent || doc.title || '').slice(0, 120);
                        throw new Error('search-page-form-not-ready' + (snippet ? ' · ' + snippet : ''));
                    }
                    timer = window.setTimeout(inspect, 300);
                } catch (error) {
                    fail(error);
                }
            };
            frame.onload = () => inspect();
            frame.onerror = () => fail(new Error('search-page-load-error'));
            document.body.appendChild(frame);
            deadline = Date.now() + 20000;
            frame.src = searchUrl;
        });
        JAVLIBRARY_SEARCH_PAGE_CONTEXT_CACHE.set(searchUrl, pending);
        return pending;
    }

    function extractJavLibraryComboSearchOptionsFromDoc(doc) {
        const fields = Object.create(null);
        fields.director = mergeJavLibraryComboOptionArrays(extractJavLibraryComboSelectOptions(doc, 'director'), extractJavLibraryComboBlockOptions(doc, 'director'));
        fields.maker = mergeJavLibraryComboOptionArrays(extractJavLibraryComboSelectOptions(doc, 'maker'), extractJavLibraryComboBlockOptions(doc, 'maker'));
        fields.label = mergeJavLibraryComboOptionArrays(extractJavLibraryComboSelectOptions(doc, 'label'), extractJavLibraryComboBlockOptions(doc, 'label'));
        const genreOptions = mergeJavLibraryComboOptionArrays(extractJavLibraryComboSelectOptions(doc, 'genre1'), extractJavLibraryComboSelectOptions(doc, 'genre2'), extractJavLibraryComboBlockOptions(doc, 'genre'));
        const castOptions = mergeJavLibraryComboOptionArrays(extractJavLibraryComboSelectOptions(doc, 'cast1'), extractJavLibraryComboSelectOptions(doc, 'cast2'), extractJavLibraryComboBlockOptions(doc, 'cast'));
        fields.genre1 = genreOptions;
        fields.genre2 = genreOptions;
        fields.cast1 = castOptions;
        fields.cast2 = castOptions;
        return normalizeJavLibraryComboOptionFields(fields);
    }

    async function fetchJavLibraryAdvancedSearchDocument(searchUrl, seedUrl = searchUrl) {
        if (isJavLibraryAdvancedSearchDocumentReady(document) && buildJavLibraryAdvancedSearchUrl(location.href) === searchUrl) {
            return { searchUrl, document, source: 'current-document' };
        }

        const acceptHeader = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
        let lastSnippet = '';

        try {
            const response = await fetch(searchUrl, {
                method: 'GET',
                credentials: 'include',
                redirect: 'follow',
                headers: { 'Accept': acceptHeader }
            });
            const text = await response.text();
            const doc = parseJavLibrarySearchHtml(text);
            lastSnippet = summarizeJavLibrarySearchDocument(doc);
            if (response.ok && isJavLibraryAdvancedSearchDocumentReady(doc)) {
                return { searchUrl, document: doc, source: 'fetch' };
            }
        } catch (error) {
            lastSnippet = compactText(error?.message || lastSnippet || '');
        }

        const pageResponse = await requestPage(searchUrl, {
            headers: {
                'Accept': acceptHeader,
                'Referer': seedUrl || searchUrl
            }
        });
        const pageDoc = parseJavLibrarySearchHtml(pageResponse.responseText || '');
        lastSnippet = summarizeJavLibrarySearchDocument(pageDoc) || lastSnippet;
        if (pageResponse.ok && isJavLibraryAdvancedSearchDocumentReady(pageDoc)) {
            return { searchUrl, document: pageDoc, source: 'gm-request' };
        }

        const context = await ensureJavLibrarySearchPageContext(seedUrl);
        if (isJavLibraryAdvancedSearchDocumentReady(context?.document)) {
            return { searchUrl, document: context.document, source: 'iframe' };
        }

        throw new Error('search-page-form-not-ready' + (lastSnippet ? ' · ' + lastSnippet : ''));
    }

    async function loadJavLibraryComboSearchOptions(seedUrl = location.href) {
        const searchUrl = buildJavLibraryAdvancedSearchUrl(seedUrl);
        if (JAVLIBRARY_COMBO_OPTION_CACHE.has(searchUrl)) return JAVLIBRARY_COMBO_OPTION_CACHE.get(searchUrl);
        const pending = (async () => {
            const storedFields = loadStoredJavLibraryComboOptionFields();
            try {
                const state = await fetchJavLibraryAdvancedSearchDocument(searchUrl, seedUrl);
                const liveFields = extractJavLibraryComboSearchOptionsFromDoc(state?.document);
                const mergedFields = hasJavLibraryComboOptionFields(liveFields)
                    ? saveStoredJavLibraryComboOptionFields(liveFields, { source: state?.source || '' })
                    : storedFields;
                return {
                    searchUrl,
                    source: hasJavLibraryComboOptionFields(liveFields) && hasJavLibraryComboOptionFields(storedFields)
                        ? (state?.source || 'live') + '+stored-cache'
                        : (state?.source || (hasJavLibraryComboOptionFields(mergedFields) ? 'stored-cache' : '')),
                    fields: mergeJavLibraryComboOptionFields(storedFields, liveFields)
                };
            } catch (error) {
                if (hasJavLibraryComboOptionFields(storedFields)) {
                    return { searchUrl, source: 'stored-cache', fields: storedFields, stale: true };
                }
                JAVLIBRARY_COMBO_OPTION_CACHE.delete(searchUrl);
                throw error;
            }
        })().catch((error) => {
            JAVLIBRARY_COMBO_OPTION_CACHE.delete(searchUrl);
            throw error;
        });
        JAVLIBRARY_COMBO_OPTION_CACHE.set(searchUrl, pending);
        return pending;
    }

    function primeJavLibraryComboOptionSnapshotFromCurrentPage() {
        if (currentWeb !== 'javlibrary' || !isJavLibraryAdvancedSearchPageUrl(location.href)) return;
        let attempts = 0;
        const inspect = () => {
            attempts += 1;
            const fields = extractJavLibraryComboSearchOptionsFromDoc(document);
            if (hasJavLibraryComboOptionFields(fields)) {
                saveStoredJavLibraryComboOptionFields(fields, { source: 'current-page-prime' });
                return;
            }
            if (attempts < 20) window.setTimeout(inspect, 800);
        };
        window.setTimeout(inspect, 600);
    }

    function createDefaultJavLibraryComboForm(keyword) {
        const form = new URLSearchParams();
        form.set('title', '');
        form.set('start_year', '');
        form.set('start_month', '');
        form.set('end_year', '');
        form.set('end_month', '');
        form.set('min_rating', '0');
        form.set('max_rating', '10');
        form.set('director', '');
        form.set('maker', '');
        form.set('label', '');
        form.set('genre1', '');
        form.set('genre2', '');
        form.set('cast1', '');
        form.set('cast2', '');
        form.set('data', keyword);
        return form;
    }
