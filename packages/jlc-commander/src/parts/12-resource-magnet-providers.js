// @@creamu-part:12-resource-magnet-providers
    function normalizeMagnetHref(href) {
        const decoded = decodeHtmlEntities(String(href || '').trim()).replace(/\s+/g, '');
        if (!/^magnet:\?/i.test(decoded)) return '';
        return decoded.replace(/&amp;/ig, '&');
    }

    function extractMagnetHash(href) {
        const magnet = normalizeMagnetHref(href);
        if (!magnet) return '';
        const matched = magnet.match(/[?&]xt=urn:btih:([a-z0-9]{32,40})/i);
        return matched ? matched[1].toUpperCase() : '';
    }

    function uniqueMagnetEntries(list) {
        const seen = new Set();
        return (Array.isArray(list) ? list : [])
            .map(item => {
                if (!item) return null;
                const href = normalizeMagnetHref(item.href || item.url || '');
                if (!href) return null;
                let src = '';
                const srcRaw = String(item.src || '').trim();
                if (srcRaw) {
                    try {
                        src = new URL(srcRaw, item.base || 'https://www.javlibrary.com/').href;
                    } catch (e) {
                        src = srcRaw;
                    }
                }
                const title = stripHtmlTags(item.title || item.label || item.text || '').trim() || href;
                return {
                    title,
                    label: title,
                    href,
                    note: stripHtmlTags(item.note || '').trim(),
                    provider: String(item.provider || '').trim(),
                    src
                };
            })
            .filter(Boolean)
            .filter(item => {
                const hash = extractMagnetHash(item.href);
                const key = hash || `${normalizeCode(item.title)}|${item.href}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }

    function buildSukebeiSearchUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        return 'https://sukebei.nyaa.si/?f=0&c=0_0&q=' + encodeURIComponent(code);
    }

    function buildTorrentKittySearchUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        return 'https://www.torkitty.net/search/' + encodeURIComponent(code);
    }

    function buildBtsowSearchUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        return 'https://so2.btsow.top/search?key=' + encodeURIComponent(code);
    }

    function buildSehuatangSearchUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        const encoded = encodeURIComponent(code);
        return 'https://www.sehuatang.net/search.php?mod=forum&searchsubmit=yes&orderby=lastpost&ascdesc=desc&kw=' + encoded + '&srchtxt=' + encoded;
    }

    function buildMagnetSearchLinks(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return [];
        return uniqueLinkObjects([
            { label: 'Sukebei', href: buildSukebeiSearchUrl(code), note: '磁力搜索' },
            { label: 'Torkitty', href: buildTorrentKittySearchUrl(code), note: '磁力搜索' },
            { label: 'BTSOW', href: buildBtsowSearchUrl(code), note: '磁力搜索' },
            { label: '色花堂', href: buildSehuatangSearchUrl(code), note: '番号搜索' },
            { label: 'JavDB', href: `https://javdb.com/search?q=${encodeURIComponent(code)}&f=download`, note: '下载页' },
            { label: 'JavBus', href: `https://www.javbus.com/search/${encodeURIComponent(code)}`, note: '详情/磁力' }
        ]);
    }

    function scoreMagnetTitle(title) {
        const text = String(title || '');
        let score = 0;
        if (/\b(?:4K|UHD)\b/i.test(text)) score += 60;
        if (/\b(?:FHD|1080P)\b/i.test(text)) score += 40;
        if (/\b(?:HD|720P)\b/i.test(text)) score += 20;
        if (/\b(?:H265|HEVC)\b/i.test(text)) score += 12;
        if (/\b(?:Reducing Mosaic|Uncensored)\b/i.test(text)) score += 8;
        return score;
    }

    function extractSukebeiMagnetEntries(responseText, avid) {
        const text = String(responseText || '');
        if (!text) return [];
        const rows = text.match(/<tr\b[\s\S]*?<\/tr>/ig) || [];
        const rawEntries = [];
        for (const row of rows) {
            const magnetMatch = row.match(/<a[^>]*href=["'](magnet:[^"']+)["'][^>]*>[\s\S]*?fa-magnet/i);
            const viewMatch = row.match(/<a[^>]*href=["']([^"']*\/view\/\d+[^"']*)["'][^>]*(?:title=["']([^"']*)["'])?[^>]*>([\s\S]*?)<\/a>/i);
            if (!magnetMatch || !viewMatch) continue;
            const title = stripHtmlTags(viewMatch[2] || viewMatch[3]);
            if (!title || (avid && !isLikelyAvidMatch(title, avid))) continue;
            const sizeMatch = row.match(/<td[^>]*class=["'][^"']*\btext-center\b[^"']*["'][^>]*>\s*([^<]*?(?:GiB|MiB|TiB|GB|MB|TB))\s*<\/td>/i);
            const dateMatch = row.match(/<td[^>]*class=["'][^"']*\btext-center\b[^"']*["'][^>]*data-timestamp=["']([^"']+)["'][^>]*>\s*([^<]+)\s*<\/td>/i)
                || row.match(/<td[^>]*class=["'][^"']*\btext-center\b[^"']*["'][^>]*>\s*(\d{4}-\d{2}-\d{2}[^<]*)\s*<\/td>/i);
            const counters = Array.from(row.matchAll(/<td[^>]*class=["'][^"']*\btext-center\b[^"']*["'][^>]*>\s*(\d+)\s*<\/td>/ig), matched => Number(matched[1]));
            const [seeders, leechers, downloads] = counters.slice(-3);
            const sizeText = sizeMatch?.[1]?.trim() || '';
            const dateText = String(dateMatch?.[2] || dateMatch?.[1] || '').trim();
            const noteParts = ['Sukebei'];
            if (sizeText) noteParts.push(sizeText);
            if (dateText) noteParts.push(dateText);
            if (seeders || leechers) noteParts.push(`↑${seeders || 0} / ↓${leechers || 0}`);
            if (downloads) noteParts.push('完成 ' + downloads);
            rawEntries.push({
                title,
                href: magnetMatch[1],
                provider: 'sukebei',
                note: noteParts.join(' · '),
                src: viewMatch[1],
                base: 'https://sukebei.nyaa.si/',
                _score: 120 + scoreMagnetTitle(title) + Math.min((seeders || 0) * 4, 40) + Math.min((downloads || 0) / 100, 30) + Math.min((Date.parse(dateText) || 0) / 100000000000, 20)
            });
        }
        const scoreMap = new Map(rawEntries.map(item => [extractMagnetHash(item.href) || item.href, item._score || 0]));
        return uniqueMagnetEntries(rawEntries).sort((a, b) => {
            const scoreA = scoreMap.get(extractMagnetHash(a.href) || a.href) || 0;
            const scoreB = scoreMap.get(extractMagnetHash(b.href) || b.href) || 0;
            return scoreB - scoreA;
        });
    }
    function extractTorrentKittyMagnetEntries(responseText, avid) {
        const text = String(responseText || '');
        if (!text) return [];
        const rawEntries = [];
        const rowRegex = /<tr>\s*<td class=["']name["']>([\s\S]*?)<\/td>\s*<td class=["']size["']>([\s\S]*?)<\/td>\s*<td class=["']date["']>([\s\S]*?)<\/td>\s*<td class=["']action["']>([\s\S]*?)<\/td>\s*<\/tr>/ig;
        let match;
        while ((match = rowRegex.exec(text))) {
            const title = stripHtmlTags(match[1]);
            if (!title || (avid && !isLikelyAvidMatch(title, avid))) continue;
            const sizeText = stripHtmlTags(match[2]).trim();
            const dateText = stripHtmlTags(match[3]).trim();
            const actionHtml = match[4];
            const magnetMatch = actionHtml.match(/<a[^>]*href=["'](magnet:[^"']+)["'][^>]*rel=["']magnet["'][^>]*>/i)
                || actionHtml.match(/<a[^>]*href=["'](magnet:[^"']+)["'][^>]*>Open<\/a>/i);
            if (!magnetMatch) continue;
            const infoMatch = actionHtml.match(/<a[^>]*href=["']([^"']*\/information\/[^"']+)["'][^>]*>/i);
            const noteParts = ['Torkitty'];
            if (sizeText) noteParts.push(sizeText);
            if (dateText) noteParts.push(dateText);
            rawEntries.push({
                title,
                href: magnetMatch[1],
                provider: 'torrentkitty',
                note: noteParts.join(' · '),
                src: infoMatch?.[1] || '',
                base: 'https://www.torkitty.net/',
                _score: 90 + scoreMagnetTitle(title) + Math.min((Date.parse(dateText) || 0) / 100000000000, 20)
            });
        }
        const scoreMap = new Map(rawEntries.map(item => [extractMagnetHash(item.href) || item.href, item._score || 0]));
        return uniqueMagnetEntries(rawEntries).sort((a, b) => {
            const scoreA = scoreMap.get(extractMagnetHash(a.href) || a.href) || 0;
            const scoreB = scoreMap.get(extractMagnetHash(b.href) || b.href) || 0;
            return scoreB - scoreA;
        });
    }

    function extractBtsowRedirectUrl(responseText) {
        const text = String(responseText || '');
        if (!text) return '';
        const matched = text.match(/window\.location\.replace\((["'])(https?:\/\/[^"'<>]+)\1\)/i)
            || text.match(/location\.(?:href|replace)\((["'])(https?:\/\/[^"'<>]+)\1\)/i)
            || text.match(/location\.href\s*=\s*(["'])(https?:\/\/[^"'<>]+)\1/i);
        return decodeHtmlEntities(matched?.[2] || '');
    }

    async function requestBtsowSearchPage(url) {
        const first = await requestPage(url, { timeout: 12000 });
        const redirectedUrl = extractBtsowRedirectUrl(first.responseText);
        if (redirectedUrl && redirectedUrl !== url) {
            const redirected = await requestPage(redirectedUrl, { timeout: 12000 });
            if (/searchresultsworld\.com|cdn-fileserver\.com|_ol_one_/i.test(redirected.responseText || '') && !/magnet:\?/i.test(redirected.responseText || '')) {
                return Object.assign({}, redirected, { blockedByChallenge: true, challengeUrl: redirectedUrl, finalUrl: redirected.finalUrl || redirectedUrl });
            }
            return redirected;
        }
        if (/searchresultsworld\.com|cdn-fileserver\.com|_ol_one_/i.test(first.responseText || '') && !/magnet:\?/i.test(first.responseText || '')) {
            return Object.assign({}, first, { blockedByChallenge: true });
        }
        return first;
    }

    function extractBtsowMagnetEntries(responseText, avid) {
        const text = String(responseText || '');
        if (!text) return [];
        const rawEntries = [];
        const magnetRegex = /<a\b[^>]*href=["'](magnet:[^"']+)["'][^>]*>([\s\S]*?)<\/a>/ig;
        let match;
        while ((match = magnetRegex.exec(text))) {
            const magnetHref = match[1];
            const chunk = text.slice(Math.max(0, match.index - 1200), Math.min(text.length, match.index + 1600));
            const anchors = Array.from(chunk.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/ig)).map(item => ({
                href: item[1],
                text: stripHtmlTags(item[2]).trim()
            }));
            const titleEntry = anchors
                .filter(item => item.text && !/^magnet:?/i.test(item.href) && (!avid || isLikelyAvidMatch(item.text, avid)))
                .sort((a, b) => b.text.length - a.text.length)[0];
            const title = titleEntry?.text || stripHtmlTags(match[2]).trim();
            if (!title || (avid && !isLikelyAvidMatch(title, avid))) continue;
            const detailHref = anchors.find(item => item.href && !/^magnet:/i.test(item.href) && !/\/search\//i.test(item.href) && (item === titleEntry || /\/(?:hash|detail|torrent|info)\//i.test(item.href)))?.href || '';
            const sizeText = (chunk.match(/\b(\d+(?:\.\d+)?\s*(?:GiB|MiB|TiB|GB|MB|TB))\b/i) || [])[1] || '';
            const dateText = (chunk.match(/\b(20\d{2}[-\/.]\d{1,2}[-\/.]\d{1,2}(?:\s+\d{1,2}:\d{2})?)\b/) || [])[1] || '';
            const noteParts = ['BTSOW'];
            if (sizeText) noteParts.push(sizeText);
            if (dateText) noteParts.push(dateText);
            rawEntries.push({
                title,
                href: magnetHref,
                provider: 'btsow',
                note: noteParts.join(' · '),
                src: detailHref,
                base: 'https://so2.btsow.top/',
                _score: 80 + scoreMagnetTitle(title) + Math.min((Date.parse(dateText) || 0) / 100000000000, 20)
            });
        }
        const scoreMap = new Map(rawEntries.map(item => [extractMagnetHash(item.href) || item.href, item._score || 0]));
        return uniqueMagnetEntries(rawEntries).sort((a, b) => {
            const scoreA = scoreMap.get(extractMagnetHash(a.href) || a.href) || 0;
            const scoreB = scoreMap.get(extractMagnetHash(b.href) || b.href) || 0;
            return scoreB - scoreA;
        });
    }
