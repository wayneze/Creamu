// @@creamu-part:43-tracking-page-context
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

    function buildTrackingPagedUrl(seedUrl, page) {
        const parsed = parseTrackingUrl(seedUrl || '');
        if (!parsed) return seedUrl || '';
        const pageNumber = Number(page || 0) || 1;
        if (pageNumber > 1) parsed.searchParams.set('page', String(pageNumber));
        else parsed.searchParams.delete('page');
        return parsed.toString();
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
