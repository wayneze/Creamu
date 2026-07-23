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
            .replace(/[()（）[]【】]/g, '')
            .replace(/[/／]/g, '')
            .replace(/[|｜]/g, '')
            .replace(/s+/g, '')
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

    // 基于 2026-04-08 search.php HAR 提取的类别映射，用于过期 combo searchid 重建。
    const JAVLIBRARY_COMBO_GENRE_STATIC_ENTRIES = [
            [
                    "72",
                    "69"
            ],
            [
                    "190",
                    "3D"
            ],
            [
                    "88",
                    "4小时以上作品"
            ],
            [
                    "676",
                    "AI生成作品"
            ],
            [
                    "250",
                    "COSPLAY服饰"
            ],
            [
                    "279",
                    "HD DVD"
            ],
            [
                    "232",
                    "MicroSD"
            ],
            [
                    "590",
                    "M女"
            ],
            [
                    "513",
                    "M男"
            ],
            [
                    "2",
                    "OL"
            ],
            [
                    "298",
                    "R-15"
            ],
            [
                    "304",
                    "R-18"
            ],
            [
                    "4",
                    "SM"
            ],
            [
                    "220",
                    "UMD"
            ],
            [
                    "302",
                    "VFT"
            ],
            [
                    "311",
                    "VHS"
            ],
            [
                    "558",
                    "VR"
            ],
            [
                    "610",
                    "下属・同事"
            ],
            [
                    "36",
                    "业余"
            ],
            [
                    "12",
                    "中出"
            ],
            [
                    "631",
                    "主妇之友"
            ],
            [
                    "78",
                    "主观视角"
            ],
            [
                    "273",
                    "主题工作"
            ],
            [
                    "93",
                    "乱伦"
            ],
            [
                    "48",
                    "乳交"
            ],
            [
                    "70",
                    "乳房"
            ],
            [
                    "596",
                    "乳房偷窺"
            ],
            [
                    "123",
                    "乳液"
            ],
            [
                    "291",
                    "亚洲"
            ],
            [
                    "163",
                    "亚洲女演员"
            ],
            [
                    "199",
                    "介绍影片"
            ],
            [
                    "50",
                    "企画"
            ],
            [
                    "37",
                    "伴侣"
            ],
            [
                    "194",
                    "修女"
            ],
            [
                    "47",
                    "倒追"
            ],
            [
                    "626",
                    "假阳具"
            ],
            [
                    "52",
                    "偶像"
            ],
            [
                    "214",
                    "偷窥"
            ],
            [
                    "33",
                    "偷窥"
            ],
            [
                    "119",
                    "催眠"
            ],
            [
                    "111",
                    "兔女郎"
            ],
            [
                    "75",
                    "全裸"
            ],
            [
                    "283",
                    "公主"
            ],
            [
                    "120",
                    "其他学生"
            ],
            [
                    "31",
                    "其他恋物癖"
            ],
            [
                    "594",
                    "养女"
            ],
            [
                    "87",
                    "内衣"
            ],
            [
                    "32",
                    "内衣"
            ],
            [
                    "181",
                    "冒险"
            ],
            [
                    "284",
                    "写真偶像"
            ],
            [
                    "84",
                    "凌辱"
            ],
            [
                    "76",
                    "出轨"
            ],
            [
                    "26",
                    "制服"
            ],
            [
                    "154",
                    "制服外套"
            ],
            [
                    "209",
                    "动画人物"
            ],
            [
                    "18",
                    "单体作品"
            ],
            [
                    "173",
                    "即兴性交"
            ],
            [
                    "207",
                    "历史剧"
            ],
            [
                    "517",
                    "原作改编"
            ],
            [
                    "195",
                    "去背影片"
            ],
            [
                    "215",
                    "及膝袜"
            ],
            [
                    "293",
                    "友谊"
            ],
            [
                    "14",
                    "双性人"
            ],
            [
                    "616",
                    "叔母"
            ],
            [
                    "536",
                    "受孕"
            ],
            [
                    "5",
                    "变性者"
            ],
            [
                    "8",
                    "口交"
            ],
            [
                    "74",
                    "各种职业"
            ],
            [
                    "184",
                    "后母"
            ],
            [
                    "66",
                    "吞精"
            ],
            [
                    "313",
                    "呕吐"
            ],
            [
                    "128",
                    "和服、丧服"
            ],
            [
                    "289",
                    "喜剧"
            ],
            [
                    "170",
                    "国外进口"
            ],
            [
                    "188",
                    "处女"
            ],
            [
                    "183",
                    "处男"
            ],
            [
                    "13",
                    "多P"
            ],
            [
                    "51",
                    "大小姐"
            ],
            [
                    "244",
                    "天赋"
            ],
            [
                    "597",
                    "夫妻交换"
            ],
            [
                    "234",
                    "奇异的"
            ],
            [
                    "57",
                    "女上位"
            ],
            [
                    "592",
                    "女上司"
            ],
            [
                    "174",
                    "女主播"
            ],
            [
                    "62",
                    "女优按摩棒"
            ],
            [
                    "10",
                    "女佣"
            ],
            [
                    "175",
                    "女儿"
            ],
            [
                    "67",
                    "女医生"
            ],
            [
                    "15",
                    "女同性恋"
            ],
            [
                    "145",
                    "女同接吻"
            ],
            [
                    "91",
                    "女大学生"
            ],
            [
                    "208",
                    "女忍者"
            ],
            [
                    "200",
                    "女战士"
            ],
            [
                    "27",
                    "女教师"
            ],
            [
                    "249",
                    "女检察官"
            ],
            [
                    "219",
                    "女祭司"
            ],
            [
                    "151",
                    "女装人妖"
            ],
            [
                    "3",
                    "奴隶"
            ],
            [
                    "105",
                    "妄想"
            ],
            [
                    "71",
                    "妓女"
            ],
            [
                    "165",
                    "妹妹"
            ],
            [
                    "34",
                    "姐姐"
            ],
            [
                    "204",
                    "娃娃"
            ],
            [
                    "216",
                    "子宫颈"
            ],
            [
                    "133",
                    "孕妇"
            ],
            [
                    "65",
                    "学校作品"
            ],
            [
                    "82",
                    "学校泳装"
            ],
            [
                    "92",
                    "家教"
            ],
            [
                    "168",
                    "寡妇"
            ],
            [
                    "312",
                    "导尿"
            ],
            [
                    "157",
                    "局部特写"
            ],
            [
                    "103",
                    "屁股"
            ],
            [
                    "117",
                    "展场女孩"
            ],
            [
                    "44",
                    "巨乳"
            ],
            [
                    "515",
                    "巨大屁股"
            ],
            [
                    "516",
                    "巨大阴茎"
            ],
            [
                    "45",
                    "已婚妇女"
            ],
            [
                    "243",
                    "帽型"
            ],
            [
                    "149",
                    "平胸"
            ],
            [
                    "146",
                    "年轻女孩"
            ],
            [
                    "83",
                    "强奸"
            ],
            [
                    "90",
                    "强奸"
            ],
            [
                    "299",
                    "形象俱乐部"
            ],
            [
                    "263",
                    "心理、惊悚片"
            ],
            [
                    "206",
                    "性感的"
            ],
            [
                    "236",
                    "性爱"
            ],
            [
                    "554",
                    "性转换・女体化"
            ],
            [
                    "158",
                    "性骚扰"
            ],
            [
                    "99",
                    "恋乳癖"
            ],
            [
                    "197",
                    "恋爱"
            ],
            [
                    "35",
                    "恋物癖"
            ],
            [
                    "122",
                    "恋腿癖"
            ],
            [
                    "281",
                    "恐怖"
            ],
            [
                    "182",
                    "恶作剧"
            ],
            [
                    "248",
                    "悬疑"
            ],
            [
                    "115",
                    "情侣"
            ],
            [
                    "308",
                    "感官作品"
            ],
            [
                    "166",
                    "戏剧"
            ],
            [
                    "269",
                    "成人动漫"
            ],
            [
                    "189",
                    "成人电影"
            ],
            [
                    "104",
                    "成熟的女人"
            ],
            [
                    "196",
                    "战斗行动"
            ],
            [
                    "22",
                    "户外"
            ],
            [
                    "59",
                    "手指插入"
            ],
            [
                    "9",
                    "打手枪"
            ],
            [
                    "86",
                    "投稿"
            ],
            [
                    "95",
                    "护士"
            ],
            [
                    "16",
                    "拘束"
            ],
            [
                    "186",
                    "拳交"
            ],
            [
                    "77",
                    "拷问"
            ],
            [
                    "85",
                    "按摩"
            ],
            [
                    "17",
                    "按摩棒"
            ],
            [
                    "136",
                    "排便"
            ],
            [
                    "520",
                    "接吻"
            ],
            [
                    "602",
                    "接待员"
            ],
            [
                    "100",
                    "插入异物"
            ],
            [
                    "319",
                    "搔痒"
            ],
            [
                    "102",
                    "放尿"
            ],
            [
                    "218",
                    "故事集"
            ],
            [
                    "303",
                    "教学"
            ],
            [
                    "167",
                    "数位马赛克"
            ],
            [
                    "296",
                    "文化"
            ],
            [
                    "611",
                    "新娘"
            ],
            [
                    "73",
                    "新娘、年轻妻子"
            ],
            [
                    "595",
                    "旅行"
            ],
            [
                    "159",
                    "旗袍"
            ],
            [
                    "601",
                    "无内裤"
            ],
            [
                    "112",
                    "无毛"
            ],
            [
                    "608",
                    "无胸罩"
            ],
            [
                    "549",
                    "时间停止"
            ],
            [
                    "96",
                    "明星脸"
            ],
            [
                    "521",
                    "晒黑"
            ],
            [
                    "247",
                    "暗黑系"
            ],
            [
                    "288",
                    "暴力"
            ],
            [
                    "148",
                    "服务生"
            ],
            [
                    "586",
                    "极致·性高潮"
            ],
            [
                    "131",
                    "校服"
            ],
            [
                    "139",
                    "格斗家"
            ],
            [
                    "179",
                    "模拟"
            ],
            [
                    "107",
                    "模特儿"
            ],
            [
                    "185",
                    "正太控"
            ],
            [
                    "255",
                    "正常"
            ],
            [
                    "233",
                    "残忍画面"
            ],
            [
                    "46",
                    "母乳"
            ],
            [
                    "125",
                    "母亲"
            ],
            [
                    "11",
                    "水手服"
            ],
            [
                    "24",
                    "汽车性爱"
            ],
            [
                    "266",
                    "法国"
            ],
            [
                    "588",
                    "泡沫浴"
            ],
            [
                    "110",
                    "泡泡袜"
            ],
            [
                    "109",
                    "泳装"
            ],
            [
                    "618",
                    "洗浴"
            ],
            [
                    "609",
                    "洽公服装"
            ],
            [
                    "523",
                    "流汗"
            ],
            [
                    "60",
                    "浴衣"
            ],
            [
                    "280",
                    "海外"
            ],
            [
                    "251",
                    "淋浴"
            ],
            [
                    "56",
                    "淫乱、真实"
            ],
            [
                    "40",
                    "淫语"
            ],
            [
                    "113",
                    "深喉"
            ],
            [
                    "512",
                    "温泉"
            ],
            [
                    "210",
                    "滑稽模仿"
            ],
            [
                    "116",
                    "滥交"
            ],
            [
                    "64",
                    "潮吹"
            ],
            [
                    "25",
                    "灌肠"
            ],
            [
                    "106",
                    "烂醉如泥的"
            ],
            [
                    "294",
                    "爱好、文化"
            ],
            [
                    "264",
                    "爱情故事"
            ],
            [
                    "265",
                    "爱情浪漫"
            ],
            [
                    "212",
                    "特效"
            ],
            [
                    "224",
                    "独立制作"
            ],
            [
                    "79",
                    "猎艳"
            ],
            [
                    "217",
                    "猥亵穿着"
            ],
            [
                    "130",
                    "猫耳女"
            ],
            [
                    "126",
                    "玩具"
            ],
            [
                    "619",
                    "瑜伽"
            ],
            [
                    "134",
                    "男同性恋"
            ],
            [
                    "242",
                    "男性"
            ],
            [
                    "591",
                    "男潮吹"
            ],
            [
                    "147",
                    "瘦小身型"
            ],
            [
                    "152",
                    "白人"
            ],
            [
                    "187",
                    "白天出轨"
            ],
            [
                    "169",
                    "监禁"
            ],
            [
                    "81",
                    "眼镜"
            ],
            [
                    "114",
                    "礼仪小姐"
            ],
            [
                    "604",
                    "社团・经理"
            ],
            [
                    "211",
                    "科幻"
            ],
            [
                    "171",
                    "秘书"
            ],
            [
                    "101",
                    "空中小姐"
            ],
            [
                    "285",
                    "童年朋友"
            ],
            [
                    "53",
                    "第一人称摄影"
            ],
            [
                    "522",
                    "粉丝感谢"
            ],
            [
                    "132",
                    "粪便"
            ],
            [
                    "39",
                    "精选、综合"
            ],
            [
                    "140",
                    "紧缚"
            ],
            [
                    "63",
                    "紧身衣"
            ],
            [
                    "605",
                    "约会"
            ],
            [
                    "97",
                    "纪录片"
            ],
            [
                    "137",
                    "经典"
            ],
            [
                    "80",
                    "绳缚"
            ],
            [
                    "310",
                    "给女性观众"
            ],
            [
                    "292",
                    "综合短篇"
            ],
            [
                    "30",
                    "美容院"
            ],
            [
                    "55",
                    "美少女"
            ],
            [
                    "301",
                    "美少女电影"
            ],
            [
                    "23",
                    "羞耻"
            ],
            [
                    "632",
                    "翻白眼・失神"
            ],
            [
                    "124",
                    "老板娘、女主人"
            ],
            [
                    "198",
                    "肌肉"
            ],
            [
                    "6",
                    "肛交"
            ],
            [
                    "614",
                    "背后"
            ],
            [
                    "135",
                    "胖女人"
            ],
            [
                    "203",
                    "脱衣"
            ],
            [
                    "19",
                    "自慰"
            ],
            [
                    "603",
                    "自慰辅助"
            ],
            [
                    "42",
                    "舔阴"
            ],
            [
                    "202",
                    "艺人"
            ],
            [
                    "89",
                    "苗条"
            ],
            [
                    "68",
                    "荡妇"
            ],
            [
                    "155",
                    "药物"
            ],
            [
                    "20",
                    "萝莉塔"
            ],
            [
                    "231",
                    "歌德萝莉"
            ],
            [
                    "635",
                    "蒙面・面具"
            ],
            [
                    "129",
                    "蓝光"
            ],
            [
                    "222",
                    "薄马赛克"
            ],
            [
                    "600",
                    "虐打"
            ],
            [
                    "223",
                    "蛮横娇羞"
            ],
            [
                    "589",
                    "蜡烛"
            ],
            [
                    "201",
                    "行动"
            ],
            [
                    "49",
                    "裸体围裙"
            ],
            [
                    "177",
                    "西洋片"
            ],
            [
                    "7",
                    "角色扮演"
            ],
            [
                    "164",
                    "角色扮演者"
            ],
            [
                    "225",
                    "触手"
            ],
            [
                    "246",
                    "触摸打字"
            ],
            [
                    "191",
                    "讲师"
            ],
            [
                    "205",
                    "访问"
            ],
            [
                    "61",
                    "调教"
            ],
            [
                    "118",
                    "赛车女郎"
            ],
            [
                    "229",
                    "超乳"
            ],
            [
                    "282",
                    "超短裙"
            ],
            [
                    "98",
                    "足交"
            ],
            [
                    "153",
                    "跳舞"
            ],
            [
                    "156",
                    "跳蛋"
            ],
            [
                    "121",
                    "身体意识"
            ],
            [
                    "172",
                    "车掌小姐"
            ],
            [
                    "94",
                    "轮奸"
            ],
            [
                    "620",
                    "软体"
            ],
            [
                    "43",
                    "辣妹"
            ],
            [
                    "587",
                    "辱骂"
            ],
            [
                    "245",
                    "运动"
            ],
            [
                    "617",
                    "运动员"
            ],
            [
                    "127",
                    "运动短裤"
            ],
            [
                    "29",
                    "连裤袜"
            ],
            [
                    "38",
                    "迷你裙"
            ],
            [
                    "150",
                    "迷你裙警察"
            ],
            [
                    "622",
                    "酒店"
            ],
            [
                    "192",
                    "重印版"
            ],
            [
                    "666",
                    "长靴"
            ],
            [
                    "21",
                    "露出"
            ],
            [
                    "286",
                    "青年"
            ],
            [
                    "615",
                    "面试"
            ],
            [
                    "268",
                    "韩国"
            ],
            [
                    "69",
                    "颜射"
            ],
            [
                    "58",
                    "颜射"
            ],
            [
                    "144",
                    "颜面骑乘"
            ],
            [
                    "193",
                    "飞特族"
            ],
            [
                    "138",
                    "食粪"
            ],
            [
                    "141",
                    "饮尿"
            ],
            [
                    "606",
                    "饮酒派对"
            ],
            [
                    "54",
                    "首次亮相"
            ],
            [
                    "108",
                    "高"
            ],
            [
                    "28",
                    "高中女生"
            ],
            [
                    "607",
                    "高龄男"
            ],
            [
                    "178",
                    "魔鬼系"
            ],
            [
                    "162",
                    "鸭嘴"
            ],
            [
                    "160",
                    "黑人演员"
            ],
            [
                    "627",
                    "鼻勾"
            ]
    ];

    const JAVLIBRARY_COMBO_STATIC_VALUE_MAP = (() => {
        const map = Object.create(null);
        const define = (fieldAlias, value, labels) => {
            if (!fieldAlias || !value || !Array.isArray(labels)) return;
            const bucket = map[fieldAlias] || (map[fieldAlias] = Object.create(null));
            labels.forEach((label) => {
                const normalized = normalizeJavLibraryComboOptionLabel(label);
                if (normalized && !bucket[normalized]) bucket[normalized] = compactText(value);
            });
        };
        JAVLIBRARY_COMBO_GENRE_STATIC_ENTRIES.forEach(([value, label]) => define('genre', value, [label]));
        define('genre', '15', ['女同性恋', '女同性戀', '女同', 'レズ', 'レズビアン', 'lesbian']);
        define('genre', '12', ['中出', '中出し', '内射', '內射']);
        define('genre', '93', ['乱伦', '亂倫', '近親相姦', '近亲相奸', 'incest']);
        define('genre', '34', ['姐姐', '姉', 'お姉さん', '姉系']);
        return map;
    })();

    function resolveJavLibraryComboStaticValue(fieldAlias, rawValue) {
        const normalized = normalizeJavLibraryComboOptionLabel(rawValue);
        if (!normalized) return '';
        const bucket = JAVLIBRARY_COMBO_STATIC_VALUE_MAP[fieldAlias] || null;
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

