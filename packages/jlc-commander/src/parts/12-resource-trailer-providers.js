// @@creamu-part:12-resource-trailer-providers
    function buildMissAVPageCandidates(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return [];
        const encoded = encodeURIComponent(code);
        return uniqueLinkObjects([
            { label: 'MissAV 有码', href: 'https://missav.ws/cn/' + encoded, note: '直达候选', kind: 'censored' },
            { label: 'MissAV 有码', href: 'https://missav.ws/' + encoded, note: '直达候选', kind: 'censored' },
            { label: 'MissAV 无码流出', href: 'https://missav.ws/cn/' + encoded + '-uncensored-leak', note: '直达候选', kind: 'uncensored' },
            { label: 'MissAV 无码流出', href: 'https://missav.ws/' + encoded + '-uncensored-leak', note: '直达候选', kind: 'uncensored' }
        ]);
    }

    function buildMissAVVariantGroups(avid) {
        const candidates = buildMissAVPageCandidates(avid);
        return [
            { key: 'censored', label: 'MissAV 有码', candidates: candidates.filter(item => item.kind === 'censored') },
            { key: 'uncensored', label: 'MissAV 无码流出', candidates: candidates.filter(item => item.kind === 'uncensored') }
        ];
    }

    function buildMissAVManualLinks(avid) {
        return uniqueLinkObjects(buildMissAVVariantGroups(avid).map(group => {
            const preferred = group.candidates.find(item => /\/cn\//i.test(item.href)) || group.candidates[0];
            return preferred ? { label: group.label, href: preferred.href, note: '直达候选', kind: group.key } : null;
        }).filter(Boolean));
    }

    const MGS_AVID_PREFIXES = [
        'SIRO', 'ARA', 'MIUM', '300MIUM', 'GANA', '200GANA', 'SCUTE', 'LUXU', '259LUXU', 'MAAN',
        'NNPJ', 'NACR', 'INST', 'ONEMORE', 'ABF', 'ABP', 'ABW', '107START', '390JAC', '857OMG',
        '223WPVR', '107SODS', '348NTR', '336KNB', '476MLA', '230ORECZ', '420HOI', '107SDMM',
        '116NHKB', '277DCV', '748SPAY'
    ];

    function isLikelyMgsAvid(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return false;
        const prefix = String(code.split('-')[0] || '').toUpperCase();
        return !!prefix && MGS_AVID_PREFIXES.includes(prefix);
    }

    function buildMgsDetailCandidates(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return [];
        return uniqueLinkObjects([
            { label: 'MGS', href: 'https://www.mgstage.com/product/product_detail/' + encodeURIComponent(code) + '/', note: '官方详情候选', kind: 'mgs-detail' }
        ]);
    }

    function buildMgsManualLinks(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return [];
        if (isLikelyMgsAvid(code)) {
            const detailLinks = buildMgsDetailCandidates(code);
            if (detailLinks.length) return detailLinks;
        }
        return uniqueLinkObjects([
            { label: 'MGS', href: 'https://www.mgstage.com/search/cSearch.php?search_word=' + encodeURIComponent(code) + '&type=top', note: '官方预告补充', kind: 'mgs-search' }
        ]);
    }

    function extractMgsProductCode(responseText) {
        const text = stripHtmlTags(responseText);
        if (!text) return '';
        const matched = text.match(/品番[:：]\s*([A-Z0-9-]{3,20})/i);
        return normalizeResourceAvid(matched?.[1] || '');
    }

    function extractMgsSamplePlayerLinks(responseText, avid) {
        const text = String(responseText || '');
        if (!text) return [];
        const pageCode = extractMgsProductCode(text);
        if (!pageCode) return [];
        const target = normalizeCode(avid);
        if (target && normalizeCode(pageCode) !== target) return [];
        const found = [];
        const seen = new Set();
        const anchorRegex = /<a\b[^>]*href=["']([^"']*sampleplayer\/sampleplayer\.html\/([0-9a-f-]{36})\/?[^"']*)["'][^>]*>/ig;
        let match;
        while ((match = anchorRegex.exec(text))) {
            const pid = String(match[2] || '').trim();
            if (!pid || seen.has(pid)) continue;
            seen.add(pid);
            found.push({
                label: 'MGS',
                href: normalizeMediaUrl(match[1], 'https://www.mgstage.com/'),
                note: /button_sample/i.test(match[0]) ? '主样片' : '样片候选',
                pid,
                preferred: /button_sample/i.test(match[0])
            });
        }
        return found.sort((a, b) => Number(b.preferred) - Number(a.preferred)).map(item => ({
            label: item.label,
            href: item.href,
            note: item.note,
            pid: item.pid
        }));
    }

    function buildMgsSampleVideoUrl(url) {
        let value = normalizeMediaUrl(decodeHtmlEntities(url), 'https://www.mgstage.com/');
        if (!value) return '';
        value = value.replace(/^https?:\/\/dl/i, 'https://chdl');
        if (/\.mp4(?:$|[?#])/i.test(value)) return value;
        if (/\.ism\/request/i.test(value)) {
            return value.replace(/\.ism\/request(?:\?.*)?$/i, '.mp4');
        }
        return '';
    }

    function buildFalenoSearchUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        return 'https://faleno.jp/top/?s=' + encodeURIComponent(code) + '&post_type=' + encodeURIComponent('作品');
    }

    function build123AvSearchUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        return 'https://missav123.to/ja/search?keyword=' + encodeURIComponent(code);
    }

    function buildTrailerFallbackLinks(avid) {
        const code = normalizeResourceAvid(avid);
        const falenoUrl = buildFalenoSearchUrl(code);
        if (!code) return [];
        return uniqueLinkObjects([
            ...buildMgsManualLinks(code),
            ...(falenoUrl ? [{ label: 'FALENO', href: falenoUrl, note: '官方预告补充', kind: 'faleno' }] : []),
            { label: '7MMTV', href: 'https://7mmtv.sx/zh/censored_search/all/' + encodeURIComponent(code) + '/1.html', note: '聚合补充' },
            { label: 'SupJav', href: 'https://supjav.com/zh/?s=' + encodeURIComponent(code), note: '聚合补充' },
            { label: '123AV', href: build123AvSearchUrl(code), note: '聚合补充', kind: 'njav' },
        ]);
    }

    function buildTrailerSupplementalProviders(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return [];
        return [
            { label: '7MMTV', url: 'https://7mmtv.sx/zh/censored_search/all/' + encodeURIComponent(code) + '/1.html', base: 'https://7mmtv.sx/', host: '7mmtv.sx', aliases: [], kind: '7mmtv' },
            { label: 'SupJav', url: 'https://supjav.com/zh/?s=' + encodeURIComponent(code), base: 'https://supjav.com/', host: 'supjav.com', aliases: [], kind: 'supjav' },
            { label: '123AV', url: build123AvSearchUrl(code), base: 'https://missav123.to/', host: 'missav123.to', aliases: ['123av.com', 'njav.tv'], kind: 'njav' }
        ];
    }

    function isLikelyListingUrl(url) {
        const value = String(url || '');
        return /(?:[?&]s=|[?&]keyword=|\/censored_search\/|\/search\/)/i.test(value);
    }

    function getSupplementalProviderHosts(provider) {
        return Array.from(new Set([
            String(provider?.host || '').trim().toLowerCase(),
            ...((Array.isArray(provider?.aliases) ? provider.aliases : []).map(item => String(item || '').trim().toLowerCase()))
        ].filter(Boolean)));
    }

    function isSupplementalProviderUrl(url, provider) {
        const value = normalizeText(url);
        return !!value && getSupplementalProviderHosts(provider).some(host => value.includes(host));
    }

    function isChallengePage(responseText) {
        const value = normalizeText(stripHtmlTags(responseText || ''));
        return /just a moment|attention required|cloudflare|checking your browser|captcha|ddos-guard/.test(value);
    }

    function extractSupplementalSearchEntries(responseText, avid, provider) {
        const text = String(responseText || '');
        if (!text || !provider?.host) return [];
        const target = normalizeCode(avid);
        const entries = [];
        const regex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/ig;
        let match;
        while ((match = regex.exec(text))) {
            const href = normalizeMediaUrl(match[1], provider.base || ('https://' + provider.host + '/'));
            const title = stripHtmlTags(match[2]);
            const haystack = title + ' ' + href + ' ' + stripHtmlTags(match[0]);
            if (!href || !isSupplementalProviderUrl(href, provider)) continue;
            if (isLikelyListingUrl(href)) continue;
            const titleHit = title && isLikelyAvidMatch(title, avid);
            const hrefHit = target && normalizeCode(href).includes(target);
            const bodyHit = target && normalizeCode(haystack).includes(target);
            if (!titleHit && !hrefHit && !bodyHit) continue;
            entries.push({ label: provider.label, href, note: '存在页', kind: provider.kind });
        }
        return uniqueLinkObjects(entries).slice(0, 3);
    }

    async function fetchTrailerSupplementalStatus(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return { statuses: [], links: [] };
        const providers = buildTrailerSupplementalProviders(code);
        const results = await Promise.all(providers.map(async provider => {
            const response = await requestPage(provider.url, { timeout: 12000 });
            const blockedByChallenge = isChallengePage(response.responseText);
            if (!response.ok || blockedByChallenge) {
                const state = (blockedByChallenge || [403, 429, 503].includes(response.status)) ? 'blocked'
                    : (response.status === 404 ? 'empty' : 'error');
                const note = blockedByChallenge ? 'Cloudflare' : describeRequestStatus(response, '搜索失败');
                return {
                    label: provider.label,
                    state,
                    note,
                    href: provider.url,
                    kind: provider.kind,
                    link: { label: provider.label, href: provider.url, note, kind: provider.kind }
                };
            }
            const hits = extractSupplementalSearchEntries(response.responseText, code, provider);
            const finalUrl = normalizeMediaUrl(response.finalUrl || provider.url, provider.base || provider.url);
            const finalIsHit = finalUrl && !isLikelyListingUrl(finalUrl) && isSupplementalProviderUrl(finalUrl, provider) && tokenMatchesAvidCode(finalUrl, code);
            if (hits.length || finalIsHit) {
                const href = (hits[0] || {}).href || finalUrl || provider.url;
                return {
                    label: provider.label,
                    state: 'ok',
                    note: '存在页',
                    href,
                    kind: provider.kind,
                    link: { label: provider.label, href, note: '存在页', kind: provider.kind }
                };
            }
            return {
                label: provider.label,
                state: 'empty',
                note: '未找到',
                href: provider.url,
                kind: provider.kind,
                link: { label: provider.label, href: provider.url, note: '搜索页', kind: provider.kind }
            };
        }));
        return {
            statuses: results.map(item => ({
                label: item.label,
                state: item.state,
                note: item.note,
                href: item.href,
                kind: item.kind
            })),
            links: uniqueLinkObjects(results.map(item => item.link).filter(Boolean))
        };
    }

    function extractFalenoDetailLinks(responseText, avid, base = 'https://faleno.jp/') {
        const text = String(responseText || '');
        const code = normalizeResourceAvid(avid);
        if (!text || !code) return [];
        const target = normalizeCode(code);
        const links = [];
        const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/ig;
        let match;
        while ((match = anchorRegex.exec(text))) {
            const href = normalizeMediaUrl(decodeHtmlEntities(match[1]), base);
            if (!href || !/faleno\.jp/i.test(href)) continue;
            const anchorText = stripHtmlTags(match[0]);
            const haystack = normalizeCode(href + ' ' + anchorText);
            if (!haystack.includes(target) && !tokenMatchesAvidCode(anchorText, code) && !tokenMatchesAvidCode(href, code)) continue;
            const note = /top\/\?s=/i.test(href) ? '官方搜索' : '官方详情';
            links.push({ label: 'FALENO', href, note, kind: 'faleno' });
        }
        return uniqueLinkObjects(links);
    }

    function extractFalenoPreviewCandidates(responseText, pageUrl = '') {
        const text = String(responseText || '');
        if (!text) return [];
        const base = pageUrl || 'https://faleno.jp/';
        const found = [];
        const seen = new Set();
        const push = (value, forcedType = '') => {
            const href = normalizeMediaUrl(decodeHtmlEntities(value), base);
            if (!href) return;
            let type = forcedType || '';
            if (!type) {
                type = isIframeLikeTrailerHref(href) ? 'iframe' : 'video';
            }
            if (type === 'video' && !/\.(?:mp4|m4v|mov|webm|ogv|m3u8)(?:$|[?#])/i.test(href)) return;
            if (type === 'iframe' && !isIframeLikeTrailerHref(href)) return;
            const key = type + '|' + href;
            if (seen.has(key)) return;
            seen.add(key);
            found.push({
                label: 'FALENO 官方预告',
                href,
                type,
                kind: 'faleno',
                pageUrl: pageUrl || href
            });
        };

        const mediaPatterns = [
            /<video[^>]+(?:data-src|src)=["']([^"']+)["']/ig,
            /<source[^>]+src=["']([^"']+)["']/ig,
            /(?:movie_url|movieUrl|video_url|videoUrl|sample_url|sampleUrl|trailer_url|trailerUrl|data-video|data-movie)\s*[:=]\s*["']([^"']+)["']/ig,
            /["'](https?:\/\/[^"']+\.(?:mp4|m4v|mov|webm|ogv|m3u8)[^"']*)["']/ig,
            /["'](\/\/[^"']+\.(?:mp4|m4v|mov|webm|ogv|m3u8)[^"']*)["']/ig,
            /["'](\/[^"']+\.(?:mp4|m4v|mov|webm|ogv|m3u8)[^"']*)["']/ig,
        ];
        mediaPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text))) push(match[1], 'video');
        });

        const iframePatterns = [
            /<iframe[^>]+src=["']([^"']+)["']/ig,
            /(?:player_url|playerUrl|embed_url|embedUrl)\s*[:=]\s*["']([^"']+)["']/ig,
            /["'](https?:\/\/(?:www\.)?(?:youtube\.com\/embed\/[^"'?#\s]+|youtube\.com\/watch\?[^"']+|youtu\.be\/[^"'?#\s]+|player\.vimeo\.com\/video\/[^"'?#\s]+|vimeo\.com\/\d+)[^"']*)["']/ig
        ];
        iframePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text))) push(match[1], 'iframe');
        });

        return uniqueTrailerSources(found);
    }

    function buildDmmSearchUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        return 'https://www.dmm.co.jp/search/=/searchstr=' + encodeURIComponent(code) + '/';
    }

    function tokenMatchesAvidCode(value, avid) {
        const code = normalizeResourceAvid(avid);
        const matched = code.match(/^([A-Z0-9]{2,10})-(\d{2,6})$/);
        const raw = String(value || '');
        const tokens = Array.from(new Set([
            normalizeCode(raw),
            ...raw.split(/[^a-z0-9]+/ig).map(part => normalizeCode(part))
        ].filter(Boolean))).map(token => token.toLowerCase());
        if (!tokens.length || !matched) return !!code && tokens.some(token => token.includes(normalizeCode(code)));
        const prefix = matched[1].toLowerCase();
        const targetNumber = String(parseInt(matched[2], 10) || 0);
        return tokens.some(token => {
            let index = token.indexOf(prefix);
            while (index !== -1) {
                const prev = token.charAt(index - 1);
                if (!prev || !/[a-z]/i.test(prev)) {
                    const rest = token.slice(index + prefix.length);
                    const digits = (rest.match(/^0*(\d{1,6})/) || [])[1] || '';
                    if (digits) {
                        const parsed = String(parseInt(digits, 10) || 0);
                        if (parsed === targetNumber) return true;
                    }
                }
                index = token.indexOf(prefix, index + prefix.length);
            }
            return false;
        });
    }

    function extractDmmSearchPreviewInfo(responseText, avid) {
        const text = String(responseText || '');
        const searchUrl = buildDmmSearchUrl(avid);
        const baseLinks = searchUrl ? [{ label: 'DMM 搜索', href: searchUrl, note: '官方搜索' }] : [];
        if (!text) return { videoSources: [], links: uniqueLinkObjects(baseLinks), status: 'empty', note: '空响应' };
        if (/年齢認証/.test(text) || /age_check/i.test(text)) {
            return { videoSources: [], links: uniqueLinkObjects(baseLinks), status: 'blocked', note: '年龄确认' };
        }
        const detailLinks = [];
        const videoHrefs = [];
        const hrefRegex = /href=["']([^"']+)["']/ig;
        let match;
        while ((match = hrefRegex.exec(text))) {
            const href = normalizeMediaUrl(decodeHtmlEntities(match[1]), 'https://www.dmm.co.jp/');
            if (!href) continue;
            if (/cc3001\.dmm\.co\.jp/i.test(href) && /\.mp4(?:$|[?#])/i.test(href)) {
                if (!tokenMatchesAvidCode(href, avid)) continue;
                videoHrefs.push(href);
                continue;
            }
            if (/dmm\.co\.jp/i.test(href) && /\/detail\/=\/cid=/i.test(href)) {
                if (!tokenMatchesAvidCode(href, avid)) continue;
                detailLinks.push({ label: 'DMM 详情', href, note: '搜索命中' });
            }
        }
        const uniqueDetails = uniqueLinkObjects(detailLinks);
        const pageUrl = (uniqueDetails[0] || {}).href || searchUrl || '';
        const seenVideos = new Set();
        const videoSources = videoHrefs.filter(href => {
            if (seenVideos.has(href)) return false;
            seenVideos.add(href);
            return true;
        }).slice(0, 2).map(href => ({
            label: 'DMM 官方预告',
            href,
            kind: 'official',
            pageUrl
        }));
        if (videoSources.length) {
            return {
                videoSources,
                links: uniqueLinkObjects([...baseLinks, ...uniqueDetails]),
                status: 'ok',
                note: '搜索页样片直连'
            };
        }
        if (uniqueDetails.length) {
            return {
                videoSources: [],
                links: uniqueLinkObjects([...baseLinks, ...uniqueDetails]),
                status: 'partial',
                note: '搜索命中，未抽到样片'
            };
        }
        return {
            videoSources: [],
            links: uniqueLinkObjects(baseLinks),
            status: 'empty',
            note: '搜索未命中'
        };
    }

    function buildOfficialPreviewCandidates(avid) {
        const code = normalizeResourceAvid(avid);
        const matched = code.match(/^([A-Z0-9]{2,10})-(\d{2,6})$/);
        if (!matched) return [];
        const prefix = matched[1].toLowerCase();
        const number = matched[2].padStart(5, '0');
        const folder = `${prefix}${number}`;
        const root = `https://cc3001.dmm.co.jp/litevideo/freepv/${prefix.charAt(0)}/${prefix.slice(0, 3)}/${folder}`;
        return uniqueLinkObjects([
            { label: 'DMM 官方预告', href: `${root}/${folder}hhb.mp4`, kind: 'official' },
            { label: 'DMM 官方预告', href: `${root}/${folder}_dmb_w.mp4`, kind: 'official' },
            { label: 'DMM 官方预告', href: `${root}/${folder}mhb.mp4`, kind: 'official' },
        ]);
    }

    function extractMissAVSearchLinks(responseText, avid) {
        const text = String(responseText || '');
        const code = normalizeResourceAvid(avid);
        if (!text || !code) return [];
        const escaped = code.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
        const found = [];
        const pushByRegex = (label, kind, regex, rejectPatterns = []) => {
            let match;
            while ((match = regex.exec(text))) {
                const href = match[1];
                if (!href || rejectPatterns.some(pattern => pattern.test(href)) || /\/search\//i.test(href)) continue;
                found.push({ label, href, kind });
            }
        };
        pushByRegex('MissAV 无码流出', 'uncensored', new RegExp("href=[\"']([^\"']*" + escaped + "[^\"']*uncensored-leak[^\"']*)[\"']", 'ig'));
        pushByRegex(
            'MissAV 有码',
            'censored',
            new RegExp("href=[\"']([^\"']*(?:\\/cn\\/)?[^\"']*" + escaped + "[^\"']*)[\"']", 'ig'),
            [/uncensored-leak/i, /chinese-subtitle/i]
        );
        const uniqueByHref = new Set();
        return uniqueLinkObjects(found.map(item => ({
            label: item.label,
            href: item.href.startsWith('http') ? item.href : new URL(item.href, 'https://missav.ws').href,
            note: '',
            kind: item.kind
        }))).filter(item => {
            const safeHref = sanitizeMissAVPageUrl(item.href, code, 'https://missav.ws/');
            if (!safeHref) return false;
            item.href = safeHref;
            if (uniqueByHref.has(item.href)) return false;
            uniqueByHref.add(item.href);
            return true;
        });
    }

    function extractMissAVEvalM3U8(responseText) {
        const text = String(responseText || '');
        if (!text) return '';
        const snippets = text.match(/eval\(function\(p,a,c,k,e,[\s\S]*?\)\)/ig) || [];
        const lineHits = text.split('\n').map(line => line.trim()).filter(line => line.startsWith('eval(function('));
        for (const snippet of [...snippets, ...lineHits].slice(0, 5)) {
            try {
                const decoded = new Function('return ' + snippet.trim())();
                const url = normalizeMediaUrl(decoded);
                if (url && /\.(?:m3u8|mp4)(?:$|[?#])/i.test(url)) return url;
            } catch (error) {}
        }
        return '';
    }

    function extractMissAVMediaCandidates(responseText) {
        const text = String(responseText || '');
        if (!text) return [];
        const found = [];
        const push = (href, note = '') => {
            const normalized = normalizeMediaUrl(href);
            if (!normalized) return;
            const isM3U8 = /\.m3u8(?:$|[?#])/i.test(normalized);
            found.push({
                label: isM3U8 ? 'MissAV M3U8' : 'MissAV MP4',
                href: normalized,
                note,
                kind: 'missav-media'
            });
        };
        const evalUrl = extractMissAVEvalM3U8(text);
        if (evalUrl) push(evalUrl, 'eval 解码');
        const patterns = [
            /<video[^>]+(?:data-src|src)=["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/ig,
            /<source[^>]+src=["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/ig,
            /["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/ig,
            /["'](\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/ig,
            /["'](\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/ig,
        ];
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text))) {
                push(match[1], '页面提取');
            }
        }
        const list = uniqueLinkObjects(found);
        return list.sort((a, b) => {
            const score = (item) => (/\.mp4(?:$|[?#])/i.test(item.href) ? 20 : 10) + (/eval/i.test(item.note) ? 3 : 0);
            return score(b) - score(a);
        });
    }

    function extractMissAVVideoUrl(responseText) {
        return extractMissAVMediaCandidates(responseText)[0]?.href || '';
    }
