// @@creamu-part:12-resource-services
    function uniqueLinkObjects(list) {
        const seen = new Set();
        const baseHref = typeof location !== 'undefined' && location?.href ? location.href : 'https://www.javlibrary.com/';
        return (Array.isArray(list) ? list : [])
            .map(item => {
                if (!item) return null;
                const hrefRaw = String(item.href || item.url || '').trim();
                if (!hrefRaw) return null;
                let href = hrefRaw;
                try {
                    href = new URL(hrefRaw, baseHref).href;
                } catch (e) {}
                return {
                    label: String(item.label || item.text || '').trim() || href,
                    href,
                    note: String(item.note || '').trim(),
                    kind: String(item.kind || '').trim()
                };
            })
            .filter(Boolean)
            .filter(item => {
                const key = `${item.label}|${item.href}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }

    function normalizeResourceAvid(value) {
        const raw = String(value || '').trim().toUpperCase();
        if (!raw) return '';
        const compact = raw.replace(/[^A-Z0-9]+/g, '');
        const fc2 = raw.match(/FC2[\s_-]*PPV[\s_-]*(\d{3,7})/i);
        if (fc2) return `FC2-PPV-${fc2[1]}`;
        const mgsPrefix = (typeof MGS_AVID_PREFIXES !== 'undefined' ? MGS_AVID_PREFIXES : [])
            .map(prefix => String(prefix || '').toUpperCase().replace(/[^A-Z0-9]+/g, ''))
            .sort((a, b) => b.length - a.length)
            .find(prefix => prefix && compact.startsWith(prefix) && /^\d{2,6}$/.test(compact.slice(prefix.length)));
        if (mgsPrefix) return `${mgsPrefix}-${compact.slice(mgsPrefix.length)}`;
        const bare = raw.match(/^([A-Z]{2,10})(\d{2,6})$/);
        if (bare) return `${bare[1]}-${bare[2]}`;
        const common = raw.match(/([A-Z0-9]{2,12})[\s_]*-?[\s_]*(\d{2,6})/);
        if (common) return `${common[1]}-${common[2]}`;
        return raw.replace(/\s+/g, '');
    }

    function decodeHtmlEntities(value) {
        const text = String(value ?? '');
        if (!text) return '';
        if (typeof document !== 'undefined' && document?.createElement) {
            const textarea = document.createElement('textarea');
            textarea.innerHTML = text;
            return textarea.value;
        }
        return text
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
    }

    function stripHtmlTags(value) {
        return decodeHtmlEntities(String(value ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    }

    function normalizeMediaUrl(url, base = 'https://missav.ws/') {
        let value = String(url || '').replace(/\\\//g, '/').trim();
        if (!value) return '';
        if (value.startsWith('//')) value = 'https:' + value;
        try {
            value = new URL(value, base).href;
        } catch (e) {}
        return value.replace(/^http:\/\//i, 'https://');
    }

    function normalizeMissAVPathname(value) {
        try {
            return decodeURIComponent(String(value || ''));
        } catch (error) {
            return String(value || '');
        }
    }

    function isExpectedMissAVPageUrl(url, avid, base = 'https://missav.ws/') {
        const code = normalizeResourceAvid(avid);
        if (!url || !code) return false;
        let parsed;
        try {
            parsed = new URL(url, base);
        } catch (error) {
            return false;
        }
        if (!/missav\./i.test(parsed.hostname || '')) return false;
        const target = normalizeCode(code);
        const pathnameCode = normalizeCode(normalizeMissAVPathname(parsed.pathname));
        if (/\/search\//i.test(parsed.pathname || '')) {
            const searchCode = normalizeCode(normalizeMissAVPathname(`${parsed.pathname}${parsed.search}${parsed.hash}`));
            return !!searchCode && searchCode.includes(target);
        }
        return !!pathnameCode && pathnameCode.includes(target);
    }

    function sanitizeMissAVPageUrl(url, avid, base = 'https://missav.ws/') {
        if (!isExpectedMissAVPageUrl(url, avid, base)) return '';
        return normalizeMediaUrl(url, base);
    }

    function normalizePreviewImageUrl(url, base = 'https://blogjav.net/') {
        let value = normalizeMediaUrl(url, base);
        if (!value) return '';
        value = value.replace(/pixhost\.org/ig, 'pixhost.to');
        value = value.replace(/\.th(?=\.[a-z]{3,4}(?:$|[?#]))/i, '');
        value = value.replace(/\/thumbs\//ig, '/images/');
        value = value.replace(/\/th\//ig, '/i/');
        value = value.replace(/\/\/t(?=[^/])/i, '//img');
        value = value.replace(/["']/g, '');
        if (/imagetwist/i.test(value)) {
            value = value.replace(/\.jpg(?=$|[?#])/i, '.jpeg');
        }
        return value;
    }

    function normalizeResourceStatusState(value) {
        const state = normalizeText(value);
        if (['ok', 'partial', 'blocked', 'error', 'empty', 'pending'].includes(state)) return state;
        return 'empty';
    }

    function makeResourceStatusMarkup(statuses) {
        const list = (Array.isArray(statuses) ? statuses : []).filter(Boolean);
        if (!list.length) return '';
        return '<div class="jlc-resource-status-list">' + list.map(item => {
            const state = normalizeResourceStatusState(item.state || item.status);
            const label = String(item.label || item.provider || '状态').trim();
            const note = String(item.note || '').trim();
            const href = normalizeMediaUrl(item.href || item.url || '', location?.href || 'https://www.javlibrary.com/');
            const inner = '<strong>' + escapeHtml(label) + '</strong>' + (note ? '<small>' + escapeHtml(note) + '</small>' : '');
            return href
                ? '<a class="jlc-resource-status is-' + escapeHtml(state) + '" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer nofollow">' + inner + '</a>'
                : '<span class="jlc-resource-status is-' + escapeHtml(state) + '">' + inner + '</span>';
        }).join('') + '</div>';
    }

    function getTrailerProviderKey(item) {
        const label = normalizeText(item?.label || item?.provider || '');
        const kind = normalizeText(item?.kind || '');
        if (kind === 'censored' || /missav.*有码/.test(label)) return 'missav-censored';
        if (kind === 'uncensored' || /missav.*无码/.test(label)) return 'missav-uncensored';
        if (/^dmm/.test(label)) return 'dmm';
        if (/^faleno/.test(label) || kind === 'faleno') return 'faleno';
        if (/^mgs/.test(label) || /^mgs/.test(kind)) return 'mgs';
        if (/^7mmtv/.test(label)) return '7mmtv';
        if (/^supjav/.test(label)) return 'supjav';
        if (/^(?:njav|123av)/.test(label) || /^(?:njav|123av)/.test(kind)) return 'njav';
        return label || kind || '';
    }

    function getTrailerProviderLabel(item) {
        switch (getTrailerProviderKey(item)) {
            case 'dmm':
                return 'DMM';
            case 'faleno':
                return 'FALENO';
            case 'mgs':
                return 'MGS';
            case 'missav-censored':
                return 'MissAV 有码';
            case 'missav-uncensored':
                return 'MissAV 无码流出';
            case '7mmtv':
                return '7MMTV';
            case 'supjav':
                return 'SupJav';
            case 'njav':
                return '123AV';
            default:
                return String(item?.label || item?.provider || '资源').trim() || '资源';
        }
    }

    function makeTrailerProviderMarkup(statuses, links) {
        const order = [];
        const map = new Map();
        const ensureEntry = (item, fallbackState = 'partial') => {
            const key = getTrailerProviderKey(item);
            if (!key) return null;
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    label: getTrailerProviderLabel(item),
                    state: fallbackState,
                    note: '',
                    href: '',
                    kind: String(item?.kind || '').trim()
                });
                order.push(key);
            }
            return map.get(key);
        };

        (Array.isArray(statuses) ? statuses : []).filter(Boolean).forEach(item => {
            const entry = ensureEntry(item, 'pending');
            if (!entry) return;
            entry.label = getTrailerProviderLabel(item) || entry.label;
            entry.state = normalizeResourceStatusState(item.state || item.status);
            const note = String(item.note || '').trim();
            if (note) entry.note = note;
            const href = normalizeMediaUrl(item.href || item.url || '', location?.href || 'https://www.javlibrary.com/');
            if (href) entry.href = href;
            if (!entry.kind && item.kind) entry.kind = String(item.kind).trim();
        });

        uniqueLinkObjects(links).forEach(item => {
            const entry = ensureEntry(item, 'partial');
            if (!entry) return;
            entry.label = getTrailerProviderLabel(item) || entry.label;
            if (!entry.href && item.href) entry.href = item.href;
            if (!entry.note && item.note) entry.note = String(item.note).trim();
            if (!entry.kind && item.kind) entry.kind = String(item.kind).trim();
        });

        if (!order.length) return '';
        return '<div class="jlc-resource-status-list">' + order.map(key => {
            const item = map.get(key);
            if (!item) return '';
            const state = normalizeResourceStatusState(item.state || 'partial');
            const label = String(item.label || '资源').trim() || '资源';
            const note = String(item.note || '').trim();
            const inner = '<strong>' + escapeHtml(label) + '</strong>' + (note ? '<small>' + escapeHtml(note) + '</small>' : '');
            if (item.href) {
                return '<a class="jlc-resource-status is-' + escapeHtml(state) + '" href="' + escapeHtml(item.href) + '" target="_blank" rel="noopener noreferrer nofollow">' + inner + '</a>';
            }
            return '<span class="jlc-resource-status is-' + escapeHtml(state) + '">' + inner + '</span>';
        }).join('') + '</div>';
    }

    function describeRequestStatus(result, fallback = '') {
        if (!result) return fallback || '请求失败';
        if (result.blockedByChallenge || result.error === 'challenge') return 'Cloudflare 验证';
        if (result.status) return 'HTTP ' + result.status;
        if (result.error === 'timeout') return '请求超时';
        if (result.error === 'network') return '网络失败';
        return fallback || '请求失败';
    }

    function buildAvidLoosePattern(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return null;
        const escaped = code.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
        return new RegExp(escaped.replace(/-/g, '.*'), 'i');
    }

    function isLikelyAvidMatch(title, avid) {
        const text = stripHtmlTags(title);
        const code = normalizeResourceAvid(avid);
        if (!text || !code) return false;
        const normalized = normalizeCode(text);
        if (normalized.includes(normalizeCode(code))) return true;
        const loose = buildAvidLoosePattern(code);
        return !!loose && loose.test(text);
    }

    function uniqueResourceEntries(list) {
        const seen = new Set();
        const baseHref = typeof location !== 'undefined' && location?.href ? location.href : 'https://www.javlibrary.com/';
        return (Array.isArray(list) ? list : [])
            .map(item => {
                if (!item) return null;
                const hrefRaw = String(item.href || item.url || '').trim();
                if (!hrefRaw) return null;
                let href = hrefRaw;
                try {
                    href = new URL(hrefRaw, item.base || baseHref).href;
                } catch (e) {}
                return {
                    title: stripHtmlTags(item.title || item.label || item.text || href) || href,
                    href,
                    provider: String(item.provider || '').trim(),
                    note: String(item.note || '').trim(),
                    src: item.src === undefined ? undefined : (item.src || null)
                };
            })
            .filter(Boolean)
            .filter(item => {
                const key = item.provider + '|' + item.title + '|' + item.href;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }

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

    async function requestPage(url, extra = {}) {
        return new Promise(resolve => {
            GM_xmlhttpRequest(Object.assign({
                method: 'GET',
                url,
                timeout: 15000,
                onload: (res) => resolve({
                    ok: res.status >= 200 && res.status < 400,
                    status: res.status || 0,
                    responseText: res.responseText || '',
                    finalUrl: res.finalUrl || url,
                    error: ''
                }),
                onerror: () => resolve({ ok: false, status: 0, responseText: '', finalUrl: url, error: 'network' }),
                ontimeout: () => resolve({ ok: false, status: 0, responseText: '', finalUrl: url, error: 'timeout' })
            }, extra));
        });
    }

    async function requestText(url, extra = {}) {
        const result = await requestPage(url, extra);
        return result.ok ? (result.responseText || '') : '';
    }

    function sanitizeBrowserFetchHeaders(headers = {}) {
        const sanitized = Object.assign({}, headers || {});
        const referrer = sanitized.Referer || sanitized.referer || '';
        delete sanitized.Referer;
        delete sanitized.referer;
        return {
            headers: Object.keys(sanitized).length ? sanitized : undefined,
            referrer: compactText(referrer || '')
        };
    }

    function isLikelyBotGuardResponse(text = '') {
        const normalized = compactText(String(text || '')).toLowerCase();
        if (!normalized) return false;
        return /(performing security verification|enable javascript and cookies to continue|attention required|cf-browser-verification|just a moment|why have i been blocked|checking if the site connection is secure|\b403 forbidden\b)/i.test(normalized);
    }

    async function requestPageWithHiddenFrame(url, extra = {}) {
        const target = parseTrackingUrl(url, location.href);
        const current = parseTrackingUrl(location.href, location.href);
        if (!target || !current || target.origin !== current.origin || String(extra.method || 'GET').toUpperCase() !== 'GET') {
            return requestPage(url, extra);
        }
        const mountHost = document.body || document.documentElement;
        if (!mountHost) return requestPage(url, extra);
        const timeout = Number(extra.timeout || 0) || 15000;
        return new Promise(resolve => {
            let settled = false;
            const iframe = document.createElement('iframe');
            iframe.setAttribute('aria-hidden', 'true');
            iframe.tabIndex = -1;
            iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;border:0;';
            const finalize = (result) => {
                if (settled) return;
                settled = true;
                if (timer) window.clearTimeout(timer);
                iframe.removeEventListener('load', onLoad);
                iframe.removeEventListener('error', onError);
                iframe.remove();
                resolve(result);
            };
            const onLoad = () => {
                try {
                    const frameWindow = iframe.contentWindow;
                    const frameDoc = iframe.contentDocument || frameWindow?.document;
                    const finalUrl = compactText(frameWindow?.location?.href || iframe.src || target.href) || target.href;
                    const responseText = frameDoc?.documentElement?.outerHTML || '';
                    const blocked = isLikelyBotGuardResponse(responseText);
                    finalize({
                        ok: !!responseText && !blocked,
                        status: blocked ? 403 : 200,
                        responseText,
                        finalUrl,
                        error: blocked ? 'forbidden' : ''
                    });
                } catch (error) {
                    finalize({ ok: false, status: 0, responseText: '', finalUrl: target.href, error: 'network' });
                }
            };
            const onError = () => finalize({ ok: false, status: 0, responseText: '', finalUrl: target.href, error: 'network' });
            const timer = window.setTimeout(() => {
                finalize({ ok: false, status: 0, responseText: '', finalUrl: target.href, error: 'timeout' });
            }, timeout);
            iframe.addEventListener('load', onLoad);
            iframe.addEventListener('error', onError);
            mountHost.appendChild(iframe);
            iframe.src = target.href;
        });
    }

    async function requestPageWithBrowserFetch(url, extra = {}) {
        const target = parseTrackingUrl(url, location.href);
        const current = parseTrackingUrl(location.href, location.href);
        if (!target || !current || target.origin !== current.origin || String(extra.method || 'GET').toUpperCase() !== 'GET') {
            return requestPage(url, extra);
        }
        const timeout = Number(extra.timeout || 0) || 15000;
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? window.setTimeout(() => controller.abort(), timeout) : null;
        const prepared = sanitizeBrowserFetchHeaders(extra.headers || {});
        let fetchResult = null;
        try {
            const response = await fetch(target.href, {
                method: 'GET',
                credentials: 'include',
                redirect: 'follow',
                cache: 'no-store',
                headers: prepared.headers,
                referrer: prepared.referrer || undefined,
                signal: controller?.signal
            });
            const responseText = await response.text();
            fetchResult = {
                ok: response.ok && !isLikelyBotGuardResponse(responseText),
                status: response.status || 0,
                responseText: responseText || '',
                finalUrl: response.url || target.href,
                error: ''
            };
        } catch (error) {
            const message = String(error?.name || error?.message || '').toLowerCase();
            fetchResult = {
                ok: false,
                status: 0,
                responseText: '',
                finalUrl: target.href,
                error: message.includes('abort') ? 'timeout' : 'network'
            };
        } finally {
            if (timer) window.clearTimeout(timer);
        }
        const shouldTryHiddenFrame = !fetchResult.ok
            || !fetchResult.responseText
            || fetchResult.status === 401
            || fetchResult.status === 403
            || isLikelyBotGuardResponse(fetchResult.responseText);
        if (!shouldTryHiddenFrame) return fetchResult;
        const frameResult = await requestPageWithHiddenFrame(target.href, extra);
        if (frameResult.ok && frameResult.responseText) return frameResult;
        const gmResult = await requestPage(url, extra);
        if (gmResult.ok && gmResult.responseText && !isLikelyBotGuardResponse(gmResult.responseText)) return gmResult;
        if (fetchResult.ok && fetchResult.responseText && !isLikelyBotGuardResponse(fetchResult.responseText)) return fetchResult;
        return frameResult.status ? frameResult : (gmResult.status ? gmResult : fetchResult);
    }

    async function probeMediaUrl(url) {
        const head = await requestPage(url, { method: 'HEAD', timeout: 7000 });
        if (head.ok) {
            return { ok: true, status: head.status || 200, state: 'ok', note: describeRequestStatus(head, 'HTTP 200') };
        }
        const range = await requestPage(url, { method: 'GET', timeout: 7000, headers: { Range: 'bytes=0-0' } });
        if (range.ok || range.status === 206) {
            return { ok: true, status: range.status || 206, state: 'ok', note: describeRequestStatus(range, 'HTTP 206') };
        }
        const failed = range.status ? range : head;
        const state = failed.status === 403 ? 'blocked' : (failed.status === 404 ? 'empty' : 'error');
        return { ok: false, status: failed.status || 0, state, note: describeRequestStatus(failed) };
    }

    async function headRequestOK(url) {
        return (await probeMediaUrl(url)).ok;
    }

    const resourceTrailerCache = new Map();
    const resourceScreenshotCache = new Map();
    const resourceScreenshotInfoCache = new Map();
    const resourceMagnetCache = new Map();
    const resourceMissAVCache = new Map();
    const resourceFalenoCache = new Map();
    const resourceMgsCache = new Map();

    function clearTrailerResourceCaches(avid) {
        const key = normalizeResourceAvid(avid);
        if (!key) return;
        resourceTrailerCache.delete(`${key}::missav-status`);
        resourceTrailerCache.delete(`${key}::dmm-only`);
        resourceMissAVCache.delete(key);
        resourceFalenoCache.delete(key);
        resourceMgsCache.delete(key);
    }

    function clearDetailResourceCaches(avid) {
        const key = normalizeResourceAvid(avid);
        if (!key) return;
        clearTrailerResourceCaches(key);
        resourceScreenshotCache.delete(key);
        resourceScreenshotInfoCache.delete(key);
        resourceMagnetCache.delete(key);
    }

    function getResourceToggleStates(currentConfig = config) {
        return {
            resource_center: currentConfig.resource_center !== false,
            resource_trailer: currentConfig.resource_trailer !== false,
            resource_screenshot: currentConfig.resource_screenshot !== false,
            resource_screenshot_auto: !!currentConfig.resource_screenshot_auto,
            resource_magnet: currentConfig.resource_magnet !== false,
        };
    }

    function syncResourceSettingInputs(container = document.getElementById('jlc-resource-settings')) {
        if (!container) return;
        const toggles = getResourceToggleStates(config);
        Object.entries(toggles).forEach(([key, value]) => {
            const input = container.querySelector('[data-jlc-resource-key="' + key + '"]');
            if (input) input.checked = !!value;
        });
    }
