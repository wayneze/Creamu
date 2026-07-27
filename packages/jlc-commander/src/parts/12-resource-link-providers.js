// @@creamu-part:12-resource-link-providers
    function buildBlogJavSearchKeyword(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        let keyword = code.replace(/-/g, '+');
        if (!/\s+/.test(keyword) && /^(?!\d+$)(?![A-Z]+$)[0-9A-Z+]+$/i.test(keyword)) {
            const number = keyword.match(/\d+$/)?.[0] || '';
            if (number) {
                const prefix = keyword.slice(0, -number.length).replace(/\++$/g, '');
                keyword = prefix ? (prefix + '+' + number) : number;
            }
        }
        return keyword.replace(/\+{2,}/g, '+').trim();
    }

    function buildJavStoreSearchUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        return 'https://javstore.net/search?q=' + encodeURIComponent(code);
    }

    function buildSiteBingSearchUrl(site, keyword, extra = '') {
        const query = ('site:' + String(site || '').trim() + ' ' + String(keyword || '').trim()).trim();
        if (!query || !site) return '';
        return 'https://www.bing.com/search?q=' + encodeURIComponent(query) + (extra || '');
    }

    function buildJavStoreLookupUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        return buildJavStoreSearchUrl(code);
    }

    function extractJavStoreSearchEntries(responseText, avid) {
        const text = String(responseText || '');
        if (!text) return [];
        const entries = [];
        const regex = /<a\b[^>]*href=["']([^"']+)["'][^>]*?(?:title=["']([^"']*)["'])?[^>]*>([\s\S]*?)<\/a>/ig;
        let match;
        while ((match = regex.exec(text))) {
            const href = normalizeMediaUrl(match[1], 'https://javstore.net/');
            const title = stripHtmlTags(match[2] || match[3]);
            if (!href || !/javstore\.net/i.test(href) || !title || (avid && !isLikelyAvidMatch(title, avid))) continue;
            entries.push({ title: 'JavStore · ' + title, href, provider: 'javstore', note: '站内搜索' });
        }
        const scoreEntry = (item) => {
            const title = String(item?.title || '');
            const hdScore = /\b(?:FHD|4K|UHD)\b/i.test(title) ? 40 : 0;
            const variantScore = /\b(?:Uncensored|Mosaic)\b/i.test(title) ? 8 : 0;
            const idScore = Number((String(item?.href || '').match(/(\d{4,})/) || [])[1] || 0) / 100000000;
            return hdScore + variantScore + idScore;
        };
        return uniqueResourceEntries(entries).sort((a, b) => scoreEntry(b) - scoreEntry(a));
    }

    function buildExternalResourceLinks(avid, currentSite = '') {
        const code = normalizeResourceAvid(avid);
        if (!code) return [];
        const site = String(currentSite || '').toLowerCase();
        const skipBySite = {
            javlibrary: 'javlibrary',
            javbus: 'javbus',
            javdb: 'javdb'
        };
        const skipLabel = skipBySite[site] || '';
        const postType = encodeURIComponent('作品');
        return uniqueLinkObjects([
            { label: 'JavBus', href: `https://www.javbus.com/search/${encodeURIComponent(code)}`, note: '站外详情/磁力' },
            { label: 'JavDB', href: `https://javdb.com/search?q=${encodeURIComponent(code)}&f=all`, note: '站外详情/磁力' },
            { label: 'JavLibrary', href: `https://www.javlibrary.com/cn/vl_searchbyid.php?keyword=${encodeURIComponent(code)}`, note: '站外详情' },
            { label: 'MissAV 有码', href: `https://missav.ws/cn/${encodeURIComponent(code)}`, note: '直达候选' },
            { label: 'MissAV 无码流出', href: `https://missav.ws/cn/${encodeURIComponent(code)}-uncensored-leak`, note: '直达候选' },
            ...buildMgsManualLinks(code),
            { label: 'FALENO', href: `https://faleno.jp/top/?s=${encodeURIComponent(code)}&post_type=${postType}`, note: '官方预告补充' },
            { label: '7MMTV', href: `https://7mmtv.sx/zh/censored_search/all/${encodeURIComponent(code)}/1.html`, note: '站外页' },
            { label: 'SupJav', href: `https://supjav.com/zh/?s=${encodeURIComponent(code)}`, note: '站外页' },
            { label: '123AV', href: build123AvSearchUrl(code), note: '站外页', kind: 'njav' },
            { label: 'BlogJav', href: `https://blogjav.net/?s=${encodeURIComponent(code)}`, note: '截图检索' },
        ].filter(item => normalizeText(item.label) !== skipLabel));
    }

    function buildScreenshotSearchLinks(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return [];
        const blogKeyword = buildBlogJavSearchKeyword(code) || code;
        return uniqueLinkObjects([
            { label: 'BlogJav', href: 'https://blogjav.net/?s=' + encodeURIComponent(blogKeyword), note: '截图搜索' },
            { label: 'JavStore', href: buildJavStoreLookupUrl(code), note: '加载后直达' }
        ]);
    }

    function extractBingSearchLinks(responseText, site) {
        const text = String(responseText || '');
        const host = normalizeText(site).replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (!text || !host) return [];
        const links = [];
        const regex = /<li\b[^>]*class=["'][^"']*\bb_algo\b[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/ig;
        let match;
        while ((match = regex.exec(text))) {
            const href = normalizeMediaUrl(match[1], 'https://' + host + '/');
            if (!href || !normalizeText(href).includes(host)) continue;
            links.push({ label: stripHtmlTags(match[2]) || host, href, note: 'Bing' });
        }
        return uniqueLinkObjects(links);
    }

    function extractBlogJavSearchEntries(responseText, avid) {
        const text = String(responseText || '');
        if (!text) return [];
        const entries = [];
        const regex = /<[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>\s*<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/ig;
        let match;
        while ((match = regex.exec(text))) {
            const title = stripHtmlTags(match[2]);
            if (!title || (avid && !isLikelyAvidMatch(title, avid))) continue;
            entries.push({ title: 'BlogJav · ' + title, href: match[1], provider: 'blogjav' });
        }
        return uniqueResourceEntries(entries).sort((a, b) => {
            const score = (item) => (/\b(?:FHD|4K|UHD)\b/i.test(item.title) ? 20 : 0) + item.title.length;
            return score(b) - score(a);
        });
    }

    function extractBlogJavScreenshotCandidates(responseText) {
        const text = String(responseText || '');
        if (!text) return [];
        const found = [];
        const push = (href) => {
            const normalized = normalizePreviewImageUrl(href, 'https://blogjav.net/');
            if (!normalized || !/\.(?:jpe?g|png|webp)(?:$|[?#])/i.test(normalized)) return;
            found.push(normalized);
        };
        const imgRegex = /<img\b[^>]*>/ig;
        let match;
        while ((match = imgRegex.exec(text))) {
            const tag = match[0];
            if (!/(pixhost|imagetwist|thumbs|images|\.th\.)/i.test(tag)) continue;
            for (const attr of ['data-lazy-src', 'data-src', 'src']) {
                const attrMatch = tag.match(new RegExp(attr + '=["\\\']([^"\\\']+)["\\\']', 'i'));
                if (attrMatch?.[1]) push(attrMatch[1]);
            }
        }
        const linkRegex = /<a\b[^>]*href=["']([^"']+\.(?:jpe?g|jpeg|png|webp)[^"']*)["'][^>]*>/ig;
        while ((match = linkRegex.exec(text))) {
            push(match[1]);
        }
        return Array.from(new Set(found));
    }

    function extractJavStoreScreenshotCandidates(responseText, avid = '') {
        const text = String(responseText || '');
        if (!text) return [];
        const found = [];
        const dmmIds = new Set();
        const push = (href) => {
            const normalized = normalizePreviewImageUrl(href, 'https://javstore.net/');
            if (!normalized || !/\.(?:jpe?g|png|webp)(?:$|[?#])/i.test(normalized)) return;
            found.push(normalized);
            const dmmMatch = normalized.match(/https?:\/\/pics\.dmm\.co\.jp\/digital\/video\/([a-z0-9_]+)\/\1jp-(\d+)\.jpg/i);
            if (dmmMatch?.[1]) dmmIds.add(dmmMatch[1].toLowerCase());
        };
        const pushDmmSequence = (id) => {
            const token = String(id || '').trim().toLowerCase();
            if (!token) return;
            for (let i = 1; i <= 10; i += 1) {
                push('https://pics.dmm.co.jp/digital/video/' + token + '/' + token + 'jp-' + i + '.jpg');
            }
        };
        const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/ig;
        let match;
        while ((match = anchorRegex.exec(text))) {
            const href = match[1];
            const body = match[2];
            if (/pixhost|imagetwist|pics\.dmm\.co\.jp|\.(?:jpe?g|png|webp)/i.test(href) || /<img[^>]+(?:src|data-src)=["'][^"']*(pixhost|imagetwist|pics\.dmm\.co\.jp|\.th\.)/i.test(body)) {
                push(href);
            }
            const imgMatch = body.match(/<img[^>]+(?:data-src|src)=["']([^"']+)["']/i);
            if (imgMatch?.[1]) push(imgMatch[1]);
        }
        const dmmDirectRegex = /https?:\/\/pics\.dmm\.co\.jp\/digital\/video\/([a-z0-9_]+)\/\1jp-(\d+)\.jpg/ig;
        while ((match = dmmDirectRegex.exec(text))) {
            push(match[0]);
        }
        const code = normalizeResourceAvid(avid);
        const matchedCode = code.match(/^([A-Z0-9]{2,10})-(\d{2,6})$/);
        if (matchedCode) {
            const prefix = matchedCode[1].toLowerCase();
            const number = String(parseInt(matchedCode[2], 10) || 0);
            const tokenRegex = new RegExp('\\b(' + prefix + '0*' + number + ')(?![a-z])\\b', 'ig');
            while ((match = tokenRegex.exec(text))) {
                dmmIds.add(String(match[1] || '').toLowerCase());
            }
        }
        Array.from(dmmIds).forEach(pushDmmSequence);
        return Array.from(new Set(found));
    }

    async function searchSiteViaBing(site, keyword, extra = '') {
        const query = ('site:' + site + ' ' + String(keyword || '').trim()).trim();
        const searchUrl = 'https://www.bing.com/search?q=' + encodeURIComponent(query) + (extra || '');
        const response = await requestPage(searchUrl);
        return {
            searchUrl,
            response,
            links: extractBingSearchLinks(response.responseText, site)
        };
    }
