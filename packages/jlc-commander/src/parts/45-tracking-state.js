// @@creamu-part:45-tracking-state
    function buildTrackingNavigationUrl(record) {
        const normalizedUrl = buildTrackingOpenUrl(record?.site, record?.open_url || record?.page_url || '', record || {}) || '';
        const fallbackUrl = record?.page_url || record?.open_url || normalizedUrl || '';
        const baseUrl = isTrackingResolvableOpenUrl(normalizedUrl) ? normalizedUrl : fallbackUrl;
        const parsed = parseTrackingUrl(baseUrl);
        if (!parsed) return baseUrl;
        const mode = resolveTrackingSearchMode(record, parsed);
        if (String(record?.site || '').toLowerCase() === 'javlibrary' && mode === 'backfill') {
            const topPage = Number(record.top_page_hint || 0) || 0;
            const seenPage = Number(record.last_seen_page_hint || 0) || 0;
            const browsedPage = Number(record.last_browsed_page_hint || 0) || 0;
            const page = topPage > seenPage
                ? topPage
                : Number(seenPage || topPage || browsedPage || 0);
            if (page > 1) parsed.searchParams.set('page', String(page));
            else parsed.searchParams.delete('page');
        }
        return parsed.toString();
    }

    function getTrackingHeadingText(doc = document) {
        // 绝不能扫到工作台设置里的 <h3>资源增强</h3> 等脚本 UI
        const selectors = [
            '#rightcolumn h3',
            '#rightcolumn h2',
            '#rightcolumn h1',
            '#content h1',
            '#content h2',
            '#content h3',
            '.boxtitle',
            'h1.title',
            'h1',
            'h2.title',
            'h2',
            'h3',
            '.page-title',
            '.section-name',
            '.title.is-4',
            '.title.is-3',
            '.main h3',
            '.container h3'
        ];
        for (const selector of selectors) {
            const nodes = doc.querySelectorAll(selector);
            for (const node of nodes) {
                if (isScriptUiNode(node)) continue;
                const text = compactText(node);
                if (!text || text.length > 120 || isTrackingUiChromeLabel(text)) continue;
                return text;
            }
        }
        const title = compactText(doc.title || '');
        const cleaned = title.replace(/\s*[-|｜·].*$/, '').trim();
        return isTrackingUiChromeLabel(cleaned) ? '' : cleaned;
    }

    function getCurrentListPageHint(url = location.href, doc = document) {
        const parsed = parseTrackingUrl(url);
        if (!parsed) return 1;
        const fromParam = Number(parsed.searchParams.get('page') || parsed.searchParams.get('p') || 0);
        if (fromParam > 0) return fromParam;
        const pathMatch = parsed.pathname.match(/\/(\d+)\/?$/);
        if (pathMatch?.[1] && /(search|star|actor|series|genre|tag|studio|maker|director|label|publisher)/i.test(parsed.pathname)) {
            return Number(pathMatch[1]) || 1;
        }
        const active = doc.querySelector('.pagination .active, .pagination .current, .page_selector .page.active, .page_selector .current, .pagination-list .is-current');
        const activeText = parseInt(compactText(active), 10);
        return Number.isFinite(activeText) && activeText > 0 ? activeText : 1;
    }

    function normalizeTrackingCoverUrl(url, baseUrl = location.href) {
        let raw = compactText(url || '');
        if (!raw || /^data:/i.test(raw)) return '';
        if (/placeholder|blank\.|spacer|1x1|loading\.gif|transparent|data:image\/gif/i.test(raw)) return '';
        // srcset 取第一段
        if (raw.includes(',')) raw = compactText(raw.split(',')[0] || '');
        if (/\s/.test(raw)) raw = compactText(raw.split(/\s+/)[0] || '');
        try {
            const abs = new URL(raw, baseUrl || location.href).href;
            return abs.replace(/\/thumbs\//ig, '/images/');
        } catch (error) {
            return raw;
        }
    }

    function extractCoverUrlFromNode(node, baseUrl = location.href) {
        if (!node || typeof node.querySelectorAll !== 'function') return '';
        const imgs = node.querySelectorAll('img');
        for (const img of imgs) {
            const src = img.getAttribute('data-src')
                || img.getAttribute('data-original')
                || img.getAttribute('data-lazy-src')
                || img.getAttribute('data-srcset')
                || img.getAttribute('srcset')
                || img.currentSrc
                || img.getAttribute('src')
                || '';
            const normalized = normalizeTrackingCoverUrl(src, baseUrl);
            if (normalized) return normalized;
        }
        return '';
    }

    function extractTrackingAvatarFromDocument(doc = document, groupType = '', baseUrl = location.href) {
        if (String(groupType || '').toLowerCase() !== 'actor' || !doc?.querySelector) return '';
        const selectors = [
            '.avatar-box img',
            '.photo-frame img',
            '#avatar img',
            'img.avatar',
            '.star-photo img',
            '.actor-avatar img',
            '.avatar img',
            '#side-menu img[src*="actress"]',
            '#side-menu img[src*="actor"]'
        ];
        for (const selector of selectors) {
            const img = doc.querySelector(selector);
            if (!img || (typeof img.closest === 'function' && isScriptUiNode(img))) continue;
            const url = normalizeTrackingCoverUrl(
                img.getAttribute('data-src') || img.getAttribute('src') || img.currentSrc || '',
                baseUrl
            );
            if (url) return url;
        }
        return '';
    }

    function applyTrackingCoverFields(record, itemInfo = null, options = {}) {
        if (!record) return record;
        const cover = normalizeTrackingCoverUrl(
            itemInfo?.cover || options.cover || '',
            options.baseUrl || location.href
        );
        if (cover) {
            record.top_cover = cover;
            record.cover_url = cover;
        }
        const avatar = normalizeTrackingCoverUrl(options.avatar || '', options.baseUrl || location.href);
        if (avatar) record.avatar_url = avatar;
        return record;
    }

    function getTrackingGroupMonogram(groupType) {
        const map = {
            actor: '演',
            director: '导',
            maker: '商',
            studio: '牌',
            series: '系',
            tag: '标',
            keyword: '搜',
            custom: '追'
        };
        return map[String(groupType || '').toLowerCase()] || '追';
    }

    function getTrackingDisplayCoverUrl(record) {
        return compactText(record?.avatar_url || record?.top_cover || record?.cover_url || '');
    }

    function buildWorkbenchCoverHtml(record) {
        const coverUrl = getTrackingDisplayCoverUrl(record);
        const groupType = getTrackingEffectiveGroupType(record);
        const mono = getTrackingGroupMonogram(groupType);
        const shapeClass = groupType === 'actor' && record?.avatar_url ? ' is-avatar' : ' is-poster';
        if (coverUrl) {
            return ''
                + '<div class="jlc-wb-cover' + shapeClass + '" data-group="' + escapeHtml(groupType) + '">'
                + '  <img src="' + escapeHtml(coverUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer" draggable="false"'
                + '    onerror="this.style.display=\'none\';var f=this.nextElementSibling;if(f)f.hidden=false;">'
                + '  <span class="jlc-wb-cover-fallback" hidden>' + escapeHtml(mono) + '</span>'
                + '</div>';
        }
        return ''
            + '<div class="jlc-wb-cover is-mono" data-group="' + escapeHtml(groupType) + '">'
            + '  <span class="jlc-wb-cover-fallback">' + escapeHtml(mono) + '</span>'
            + '</div>';
    }

    function getTrackingItemInfoFromNode(node) {
        if (!node) return null;
        const avid = normalizeResourceAvid(
            node.dataset.jlcAvid
            || node.querySelector('date[name="avid"]')?.textContent
            || node.querySelector('.id')?.textContent
            || ''
        );
        if (!avid) return null;
        const title = compactText(
            node.dataset.jlcTitle
            || node.querySelector('a[name="av-title"]')?.getAttribute('title')
            || node.querySelector('a[name="av-title"] span:last-child')?.textContent
            || node.querySelector('.detail-b a')?.getAttribute('title')
            || node.querySelector('.detail-b a')?.textContent
            || node.querySelector('.title')?.textContent
            || ''
        );
        const cover = extractCoverUrlFromNode(node, location.href);
        return { avid, title, cover, node };
    }

    function getTrackingItemNodesFromRoot(root = document) {
        return collectCommanderItems(root).filter(item => item instanceof HTMLElement && item.matches('.item-b'));
    }

    function getFirstTrackingPageItemInfo(root = document) {
        const items = getTrackingItemNodesFromRoot(root);
        for (const item of items) {
            const info = getTrackingItemInfoFromNode(item);
            if (info?.avid) return info;
        }
        return null;
    }

    function getTrackingDocumentItemCount(doc, site) {
        const selector = ConstCode[site]?.itemSelector;
        if (!selector || !doc?.querySelectorAll) return 0;
        return Array.from(doc.querySelectorAll(selector)).reduce((count, node) => {
            return getTrackingRawItemInfo(node, site)?.avid ? (count + 1) : count;
        }, 0);
    }

    function getTrackingAnchorItemInfo(root = document, mode = 'forward') {
        const items = getTrackingItemNodesFromRoot(root);
        const infos = [];
        for (const item of items) {
            const info = getTrackingItemInfoFromNode(item);
            if (info?.avid) infos.push(info);
        }
        if (!infos.length) return null;
        return mode === 'backfill' ? infos[infos.length - 1] : infos[0];
    }

    function getTrackingVisibleRangeInfo(root = document) {
        const infos = [];
        getTrackingItemNodesFromRoot(root).forEach(item => {
            const info = getTrackingItemInfoFromNode(item);
            if (info?.avid) infos.push(info);
        });
        if (!infos.length) {
            return { first: '', last: '', label: '' };
        }
        const first = infos[0].avid || '';
        const last = infos[infos.length - 1].avid || '';
        return {
            first,
            last,
            label: first && last ? (first === last ? first : (first + ' ~ ' + last)) : (first || last || '')
        };
    }

    function getTrackingRawItemInfo(node, site, baseUrl = '') {
        if (!node) return null;
        let avid = '';
        let title = '';
        if (site === 'javlibrary') {
            avid = normalizeResourceAvid(node.querySelector('div.id')?.textContent || '');
            title = compactText(node.querySelector('div.title')?.textContent || node.querySelector('a')?.getAttribute('title') || '');
        } else if (site === 'javdb') {
            avid = normalizeResourceAvid(node.querySelector('div.video-title strong')?.textContent || node.querySelector('strong')?.textContent || '');
            title = compactText(node.querySelector('a')?.getAttribute('title') || node.querySelector('div.video-title')?.textContent || '');
        } else {
            avid = normalizeResourceAvid(node.querySelector('date')?.textContent || '');
            title = compactText(node.querySelector('img')?.getAttribute('title') || node.querySelector('.photo-info')?.textContent || node.querySelector('a')?.getAttribute('title') || '');
        }
        const href = node.querySelector('a')?.getAttribute('href') || '';
        const cover = extractCoverUrlFromNode(node, baseUrl || location.href);
        return avid ? { avid, title, href, cover } : null;
    }

    function getTrackingFirstItemFromDocument(doc, site) {
        const selector = ConstCode[site]?.itemSelector;
        if (!selector) return null;
        const nodes = Array.from(doc.querySelectorAll(selector));
        for (const node of nodes) {
            const info = getTrackingRawItemInfo(node, site);
            if (info?.avid) return info;
        }
        return null;
    }

    function getTrackingAnchorItemFromDocument(doc, site, mode = 'forward') {
        const selector = ConstCode[site]?.itemSelector;
        if (!selector) return null;
        const infos = [];
        Array.from(doc.querySelectorAll(selector)).forEach(node => {
            const info = getTrackingRawItemInfo(node, site);
            if (info?.avid) infos.push(info);
        });
        if (!infos.length) return null;
        return mode === 'backfill' ? infos[infos.length - 1] : infos[0];
    }

    function getTrackingItemInfosFromDocument(doc, site, baseUrl = '') {
        const selector = ConstCode[site]?.itemSelector;
        if (!selector) return [];
        const infos = [];
        Array.from(doc.querySelectorAll(selector)).forEach(node => {
            const info = getTrackingRawItemInfo(node, site, baseUrl);
            if (info?.avid) infos.push(info);
        });
        return infos;
    }

    function estimateTrackingUnreadFromInfos(record, infos, mode = 'forward') {
        const seenCode = normalizeCode(record?.last_seen_avid || '');
        if (!seenCode || !Array.isArray(infos) || !infos.length) return -1;
        const foundIndex = infos.findIndex(info => normalizeCode(info?.avid || '') === seenCode);
        if (foundIndex < 0) return -1;
        return mode === 'backfill'
            ? Math.max(0, infos.length - foundIndex - 1)
            : Math.max(0, foundIndex);
    }

    function normalizeTrackingPageLinkUrl(href, baseUrl) {
        if (!href) return '';
        const parsed = parseTrackingUrl(href, baseUrl || location.href);
        return parsed ? parsed.href : href;
    }

    function getTrackingNextPageUrl(doc, site, baseUrl) {
        const selector = ConstCode[site]?.pageNext;
        if (!selector) return '';
        const anchor = doc.querySelector(selector);
        const href = anchor?.getAttribute?.('href') || anchor?.href || '';
        return normalizeTrackingPageLinkUrl(href, baseUrl);
    }

    function getTrackingPrevPageUrl(doc, site, baseUrl) {
        const selectors = [
            ConstCode[site]?.pagePrev,
            'a.page.prev',
            'a.pagination-previous',
            'a[rel="prev"]',
            'a.prev',
            'a.previous',
            'a#prev'
        ].filter(Boolean);
        for (const selector of selectors) {
            const anchor = doc.querySelector(selector);
            const href = anchor?.getAttribute?.('href') || anchor?.href || '';
            const normalized = normalizeTrackingPageLinkUrl(href, baseUrl);
            if (normalized) return normalized;
        }
        const parsed = parseTrackingUrl(baseUrl || location.href);
        if (!parsed) return '';
        const currentPage = Number(parsed.searchParams.get('page') || parsed.searchParams.get('p') || getCurrentListPageHint(parsed.href, doc) || 0) || 0;
        if (!(currentPage > 1)) return '';
        const paramName = parsed.searchParams.has('page') ? 'page' : (parsed.searchParams.has('p') ? 'p' : 'page');
        const targetPage = currentPage - 1;
        if (targetPage > 1) parsed.searchParams.set(paramName, String(targetPage));
        else parsed.searchParams.delete(paramName);
        return parsed.toString();
    }

    function getTrackingDirectionalPageUrl(doc, site, baseUrl, direction) {
        return direction === 'prev'
            ? getTrackingPrevPageUrl(doc, site, baseUrl)
            : getTrackingNextPageUrl(doc, site, baseUrl);
    }

    function buildTrackingPageRequestOptions(url, referer = '', extra = {}) {
        const headers = Object.assign({
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache'
        }, extra.headers || {});
        const normalizedReferer = compactText(referer || '');
        if (normalizedReferer && !headers.Referer) headers.Referer = normalizedReferer;
        return Object.assign({}, extra, { headers });
    }

    function getTrackingBreakpointSearchDirections(record, currentPageHint = 0) {
        const seenPageHint = Number(record?.last_seen_page_hint || 0) || 0;
        if (seenPageHint > 0 && currentPageHint > seenPageHint) return ['prev', 'next'];
        if (seenPageHint > 0 && currentPageHint < seenPageHint) return ['next', 'prev'];
        const mode = resolveTrackingSearchMode(record, parseTrackingUrl(record?.open_url || record?.page_url || location.href));
        if (mode === 'backfill') return currentPageHint > 1 ? ['next', 'prev'] : ['next', 'prev'];
        return currentPageHint > 1 ? ['prev', 'next'] : ['next', 'prev'];
    }

    function getTrackingBreakpointDirectionLabel(direction) {
        return direction === 'prev' ? '向前' : '向后';
    }

    function getTrackingLastPageInfo(doc, baseUrl) {
        let maxPage = getCurrentListPageHint(baseUrl, doc);
        let maxUrl = '';
        const anchors = Array.from(doc.querySelectorAll('.page_selector a, .pagination a, .pagination-list a, a.page'));
        anchors.forEach(anchor => {
            const href = anchor?.getAttribute?.('href') || anchor?.href || '';
            if (!href) return;
            const parsed = parseTrackingUrl(href, baseUrl || location.href);
            if (!parsed) return;
            let page = Number(parsed.searchParams.get('page') || parsed.searchParams.get('p') || 0);
            if (!(page > 0)) page = parseInt(compactText(anchor), 10) || 0;
            if (page > maxPage) {
                maxPage = page;
                maxUrl = parsed.href;
            }
        });
        return { page: maxPage, url: maxUrl };
    }

    function getTrackingPageDescriptor(site, parsed, doc = document) {
        const pathname = String(parsed?.pathname || '');
        const lowerPath = pathname.toLowerCase();
        const heading = getTrackingHeadingText(doc);
        const visibleRange = getTrackingVisibleRangeInfo(doc);
        let pageType = 'list';
        let groupType = 'custom';
        let queryText = '';
        let groupName = '';

        const setGroup = (nextType, nextName, nextPageType = pageType) => {
            groupType = nextType;
            pageType = nextPageType;
            groupName = compactText(nextName || heading || queryText || '');
        };

        if (site === 'javlibrary') {
            const keyword = parsed?.searchParams?.get('keyword') || parsed?.searchParams?.get('q') || parsed?.searchParams?.get('search') || '';
            const extractedKeyword = extractTrackingSearchKeyword(doc, parsed, heading);
            if (/\/vl_searchbytitle\.php$/i.test(lowerPath)) {
                queryText = extractedKeyword || '';
                const friendlyFallback = visibleRange.label
                    ? ('标题搜索 · ' + visibleRange.label)
                    : buildTrackingSearchFallbackLabel('标题搜索', parsed);
                setGroup('keyword', queryText || friendlyFallback, 'search');
            } else if (/\/vl_searchbycombo\.php$/i.test(lowerPath)) {
                queryText = decodeTrackingSegment(keyword || extractedKeyword || '');
                const friendlyFallback = visibleRange.label
                    ? ('组合搜索 · ' + visibleRange.label)
                    : buildTrackingSearchFallbackLabel('组合搜索', parsed);
                setGroup('keyword', normalizeTrackingQueryLabel(queryText || heading || extractedKeyword) || queryText || friendlyFallback, 'search');
            } else if (keyword) {
                queryText = decodeTrackingSegment(keyword);
                setGroup('keyword', queryText, 'search');
            } else if (/star|actress|actor/i.test(lowerPath + String(parsed?.search || ''))) {
                setGroup('actor', heading || parsed?.searchParams?.get('star') || '', 'actor');
            } else if (/tag|genre/i.test(lowerPath + String(parsed?.search || ''))) {
                setGroup('tag', heading || parsed?.searchParams?.get('tag') || '', 'tag');
            } else if (/director/i.test(lowerPath + String(parsed?.search || ''))) {
                setGroup('director', heading || '', 'director');
            } else if (/maker/i.test(lowerPath + String(parsed?.search || ''))) {
                setGroup('maker', heading || '', 'maker');
            } else if (/label|studio/i.test(lowerPath + String(parsed?.search || ''))) {
                setGroup('studio', heading || '', 'studio');
            } else if (/series/i.test(lowerPath + String(parsed?.search || ''))) {
                setGroup('series', heading || '', 'series');
            } else {
                setGroup('custom', heading || '列表', 'list');
            }
        } else if (site === 'javbus' || site === 'avmoo') {
            if (/\/search\//i.test(lowerPath)) {
                const match = pathname.match(/\/search\/([^/]+)/i);
                queryText = decodeTrackingSegment(match?.[1] || parsed?.searchParams?.get('keyword') || '');
                setGroup('keyword', queryText, 'search');
            } else if (/\/star\//i.test(lowerPath)) {
                setGroup('actor', heading || decodeTrackingSegment(pathname.split('/star/')[1]?.split('/')[0] || ''), 'actor');
            } else if (/\/(?:genre|genres)\//i.test(lowerPath)) {
                setGroup('tag', heading || decodeTrackingSegment(pathname.split('/genre/')[1]?.split('/')[0] || ''), 'tag');
            } else if (/\/director\//i.test(lowerPath)) {
                const segment = pathname.split('/').filter(Boolean).slice(-1)[0] || '';
                setGroup('director', heading || decodeTrackingSegment(segment), 'director');
            } else if (/\/maker\//i.test(lowerPath)) {
                const segment = pathname.split('/').filter(Boolean).slice(-1)[0] || '';
                setGroup('maker', heading || decodeTrackingSegment(segment), 'maker');
            } else if (/\/studio\//i.test(lowerPath)) {
                const segment = pathname.split('/').filter(Boolean).slice(-1)[0] || '';
                setGroup('studio', heading || decodeTrackingSegment(segment), 'studio');
            } else if (/\/series\//i.test(lowerPath)) {
                const segment = pathname.split('/').filter(Boolean).slice(-1)[0] || '';
                setGroup('series', heading || decodeTrackingSegment(segment), 'series');
            } else {
                setGroup('custom', heading || '列表', 'list');
            }
        } else if (site === 'javdb') {
            const keyword = parsed?.searchParams?.get('q') || parsed?.searchParams?.get('keyword') || '';
            if (/\/search/i.test(lowerPath) || keyword) {
                queryText = decodeTrackingSegment(keyword || pathname.split('/search/')[1] || '');
                setGroup('keyword', queryText, 'search');
            } else if (/\/actors?\//i.test(lowerPath)) {
                setGroup('actor', heading || decodeTrackingSegment(pathname.split('/').filter(Boolean).slice(-1)[0] || ''), 'actor');
            } else if (/\/directors?\//i.test(lowerPath)) {
                setGroup('director', heading || decodeTrackingSegment(pathname.split('/').filter(Boolean).slice(-1)[0] || ''), 'director');
            } else if (/\/makers?\//i.test(lowerPath)) {
                setGroup('maker', heading || decodeTrackingSegment(pathname.split('/').filter(Boolean).slice(-1)[0] || ''), 'maker');
            } else if (/\/(?:studios?|publishers?|labels?)\//i.test(lowerPath)) {
                setGroup('studio', heading || decodeTrackingSegment(pathname.split('/').filter(Boolean).slice(-1)[0] || ''), 'studio');
            } else if (/\/series\//i.test(lowerPath)) {
                setGroup('series', heading || decodeTrackingSegment(pathname.split('/').filter(Boolean).slice(-1)[0] || ''), 'series');
            } else if (/\/(?:tags?|categories)\//i.test(lowerPath)) {
                setGroup('tag', heading || decodeTrackingSegment(pathname.split('/').filter(Boolean).slice(-1)[0] || ''), 'tag');
            } else {
                setGroup('custom', heading || '列表', 'list');
            }
        } else {
            setGroup('custom', heading || '列表', 'list');
        }

        const fallbackKeywordLabel = groupType === 'keyword'
            ? buildTrackingSearchFallbackLabel(pageType === 'search' && /combo/i.test(lowerPath) ? '组合搜索' : '标题搜索', parsed)
            : '';
        const pickClean = (...values) => {
            for (const value of values) {
                const text = compactText(value || '');
                if (text && !isTrackingUiChromeLabel(text)) return text;
            }
            return '';
        };
        const pageTitleBare = compactText(doc.title || '').replace(/\s*[-|｜·].*$/, '').trim();
        const resolvedName = pickClean(
            groupName,
            queryText,
            groupType === 'keyword' ? fallbackKeywordLabel : '',
            heading,
            pageTitleBare
        ) || getSiteLabel(site);
        const resolvedQueryText = pickClean(queryText);
        const resolvedRawQuery = groupType === 'keyword'
            ? pickClean(extractTrackingSearchKeyword(doc, parsed, heading), resolvedQueryText)
            : '';
        return {
            page_type: pageType,
            group_type: groupType,
            group_name: resolvedName,
            query_text: resolvedQueryText,
            raw_query: resolvedRawQuery,
            title: getSiteLabel(site) + ' · ' + resolvedName
        };
    }

    function buildTrackingSignature(context) {
        const seedUrl = context?.open_url || context?.pageUrl || location.href;
        const parsed = parseTrackingUrl(seedUrl);
        let identity = compactText(context?.raw_query || context?.query_text || '');
        if (!identity && /javlibrary\./i.test(String(parsed?.hostname || '')) && /\/vl_searchby(?:title|combo)\.php$/i.test(String(parsed?.pathname || '').toLowerCase())) {
            const searchId = compactText(parsed?.searchParams?.get('searchid') || '');
            if (searchId) identity = 'searchid:' + searchId;
        }
        const parts = [
            String(context?.site || '').toLowerCase(),
            String(context?.page_type || '').toLowerCase(),
            buildTrackingCanonicalUrl(seedUrl),
            identity
        ];
        return normalizeCode(parts.join('|'));
    }

    function getCurrentTrackingPageContext(doc = document, url = location.href) {
        const site = String(currentWeb || '').toLowerCase();
        if (!site || !ConstCode[site]) return null;
        const itemNodes = getTrackingItemNodesFromRoot(doc);
        if (!itemNodes.length) return null;
        const parsed = parseTrackingUrl(url);
        if (!parsed) return null;
        const descriptor = getTrackingPageDescriptor(site, parsed, doc);
        const searchMode = detectTrackingSearchMode(site, parsed);
        const openUrl = buildTrackingOpenUrl(site, parsed, descriptor);
        const firstItem = getTrackingAnchorItemInfo(doc, searchMode) || getFirstTrackingPageItemInfo(doc);
        const pageHint = getCurrentListPageHint(parsed.href, doc);
        const context = {
            site,
            siteLabel: getSiteLabel(site),
            open_url: openUrl,
            pageUrl: parsed.href,
            page_type: descriptor.page_type,
            group_type: descriptor.group_type,
            group_name: descriptor.group_name,
            query_text: descriptor.query_text,
            raw_query: descriptor.raw_query,
            title: descriptor.title,
            firstItem,
            itemNodes,
            page_hint: pageHint,
            page_size_hint: itemNodes.length || 0,
            search_mode: searchMode
        };
        context.query_signature = buildTrackingSignature(context);
        return context;
    }

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

    function getTrackingUnreadMetrics(record) {
        const topCode = normalizeCode(record?.top_avid || '');
        const seenCode = normalizeCode(record?.last_seen_avid || '');
        const hasUpdate = !!topCode && !!seenCode && topCode !== seenCode;
        const topPage = Number(record?.top_page_hint || 0) || 0;
        const seenPage = Number(record?.last_seen_page_hint || 0) || 0;
        const unreadEstimate = Number(record?.unread_estimate || 0) || 0;
        const pageSizeHint = Number(record?.page_size_hint || 0) || 0;
        const pageDelta = topPage > 0 && seenPage > 0 ? Math.abs(topPage - seenPage) : 0;
        const estimatedCount = hasUpdate
            ? ((pageDelta > 0 && pageSizeHint > 0)
                ? (pageDelta * pageSizeHint + unreadEstimate)
                : unreadEstimate)
            : 0;
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

    async function getTrackingSearches() {
        const list = await getAllFromStore(TRACKING_STORE);
        return (Array.isArray(list) ? list : [])
            .filter(Boolean)
            .map(record => normalizeTrackingRuntimeRecord(record))
            .sort((a, b) => {
                const aTime = Date.parse(a.created_at || a.updated_at || a.last_check_at || a.last_browsed_at || 0) || 0;
                const bTime = Date.parse(b.created_at || b.updated_at || b.last_check_at || b.last_browsed_at || 0) || 0;
                return Number(!!b.pinned) - Number(!!a.pinned) || aTime - bTime;
            });
    }

    async function getTrackingRecordBySignature(signature, openUrl = '') {
        const list = await getTrackingSearches();
        const canonical = buildTrackingCanonicalUrl(openUrl || '');
        return list.find(record => record.query_signature === signature)
            || list.find(record => buildTrackingCanonicalUrl(record.open_url || '') === canonical)
            || null;
    }

    async function saveTrackingRecord(record) {
        if (!record?.id) return null;
        record.updated_at = new Date().toISOString();
        await setVal(TRACKING_STORE, record);
        return record;
    }

    async function createOrUpdateTrackingFromContext(context = getCurrentTrackingPageContext(), options = {}) {
        if (!context) return null;
        const existing = await getTrackingRecordBySignature(context.query_signature, context.open_url);
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
            record.unread_estimate = 0;
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
                record.unread_estimate = Math.max(0, Math.floor(explicitUnreadEstimate));
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
        record.unread_estimate = 0;
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

    function deriveTrackingStatusFromSnapshot(record) {
        const topCode = normalizeCode(record?.top_avid || '');
        const seenCode = normalizeCode(record?.last_seen_avid || '');
        if (topCode && seenCode) return topCode === seenCode ? 'latest' : 'updated';
        if (topCode) return 'checked';
        return 'unchecked';
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

