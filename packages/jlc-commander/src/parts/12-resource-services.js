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
        if (result.error === 'abort') return '请求已取消';
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
