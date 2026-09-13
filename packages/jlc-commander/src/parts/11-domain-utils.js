// @@creamu-part:11-domain-utils
    const TAG_CHAR_FOLD = {
        '親': '亲', '姦': '奸', '義': '义', '継': '继', '繼': '继', '續': '续', '處': '处', '処': '处',
        '戀': '恋', '慾': '欲', '婦': '妇', '專': '专', '屬': '属', '雙': '双', '單': '单', '體': '体',
        '學': '学', '園': '园', '變': '变', '態': '态', '盜': '盗', '攝': '摄', '錄': '录', '寫': '写',
        '癡': '痴', '實': '实', '戰': '战', '觸': '触', '發': '发', '調': '调', '產': '产', '業': '业',
        '畫': '画', '龍': '龙', '豐': '丰'
    };

    function normalizeText(v) {
        return String(v || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
    }

    function normalizeTagText(v) {
        return normalizeText(v).replace(/./gu, ch => TAG_CHAR_FOLD[ch] || ch);
    }

    function normalizeCode(v) {
        return normalizeText(v).replace(/[^a-z0-9]+/g, '');
    }

    function openUrlInNewTab(url) {
        const href = String(url || '').trim();
        if (!href) return false;
        try {
            if (typeof GM_openInTab === 'function') {
                GM_openInTab(href, { active: true, insert: true, setParent: true });
                return true;
            }
        } catch (_) { /* fall through */ }
        try {
            const anchor = document.createElement('a');
            anchor.href = href;
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
            anchor.style.display = 'none';
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            return true;
        } catch (_) { /* fall through */ }
        try {
            return !!window.open(href, '_blank', 'noopener,noreferrer');
        } catch (_) {
            return false;
        }
    }

    function uniqueTextList(list) {
        const seen = new Set();
        return (Array.isArray(list) ? list : [])
            .map(x => String(x || '').trim())
            .filter(Boolean)
            .filter(x => {
                const key = normalizeTagText(x);
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }

    function asTextList(v) {
        if (Array.isArray(v)) return uniqueTextList(v.flatMap(x => asTextList(x)));
        if (typeof v === 'string' || typeof v === 'number') {
            return String(v).split(/[\n,，]/).map(x => x.trim()).filter(Boolean);
        }
        if (v && typeof v === 'object') {
            const candidateKeys = ['name', 'title', 'label', 'text', 'value', 'genre', 'tag', 'category', 'type', 'display_name', 'displayName'];
            for (const key of candidateKeys) {
                if (key in v) {
                    const list = asTextList(v[key]);
                    if (list.length) return list;
                }
            }
        }
        return [];
    }

    function extractMetaTubeData(payload) {
        const root = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
        if (!root || typeof root !== 'object') return root;
        if (Array.isArray(root)) return root;
        const listCandidate = ['items', 'results', 'rows', 'list', 'movies', 'hits', 'records']
            .map(key => root[key])
            .find(Array.isArray);
        return listCandidate || root;
    }

    function normalizeReleaseDate(value) {
        if (value == null) return '';
        const text = String(value).trim();
        if (!text) return '';
        const iso = text.match(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/);
        if (iso) return iso[0].replace(/[/.]/g, '-');
        const compact = text.match(/\d{8}/);
        if (compact) return `${compact[0].slice(0, 4)}-${compact[0].slice(4, 6)}-${compact[0].slice(6, 8)}`;
        return text;
    }

    function pickReleaseDate(source) {
        if (!source || typeof source !== 'object') return '';
        const candidates = [
            source.release_date,
            source.releaseDate,
            source.premiered,
            source.publish_date,
            source.publishDate,
            source.pub_date,
            source.pubDate,
            source.date,
            source.air_date,
            source.airDate,
            source.issued_at,
            source.issuedAt
        ];
        for (const value of candidates) {
            const normalized = normalizeReleaseDate(value);
            if (normalized) return normalized;
        }
        return '';
    }

    function normalizeMetaRecord(raw) {
        if (!raw || typeof raw !== 'object') return raw;
        const nested = [raw.movie, raw.item, raw.result, raw.video].find(v => v && typeof v === 'object') || null;
        const merged = nested ? { ...raw, ...nested } : { ...raw };
        const actors = uniqueTextList([
            ...asTextList(merged.actors),
            ...asTextList(merged.actor),
            ...asTextList(merged.actresses),
            ...asTextList(merged.cast),
            ...asTextList(merged.performers),
            ...asTextList(merged.performer),
            ...asTextList(merged.stars),
            ...asTextList(merged.persons)
        ]);
        const genres = uniqueTextList([
            ...asTextList(merged.genres),
            ...asTextList(merged.genre),
            ...asTextList(merged.tags),
            ...asTextList(merged.tag),
            ...asTextList(merged.categories),
            ...asTextList(merged.category),
            ...asTextList(merged.labels),
            ...asTextList(merged.label),
            ...asTextList(merged.types),
            ...asTextList(merged.type)
        ]);
        const number = merged.number || merged.code || merged.no || merged.movie_number || merged.movieNo || merged.movie_id || merged.id || '';
        const releaseDate = pickReleaseDate(merged) || pickReleaseDate(raw);
        return { ...merged, actors, genres, number, releaseDate };
    }

    function tagMatches(source, keyword) {
        const src = normalizeText(source);
        const key = normalizeText(keyword);
        if (!src || !key) return false;
        if (src.includes(key)) return true;
        const foldedSrc = normalizeTagText(source);
        const foldedKey = normalizeTagText(keyword);
        return !!foldedSrc && !!foldedKey && foldedSrc.includes(foldedKey);
    }

    async function requestJSON(url, timeout = 15000) {
        const requestTimeout = Math.max(250, Number(timeout) || 15000);
        return new Promise(r => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                timeout: requestTimeout,
                onload: (res) => {
                    try {
                        r(JSON.parse(res.responseText));
                    } catch (e) {
                        r(null);
                    }
                },
                onerror: () => r(null),
                ontimeout: () => r(null)
            });
        });
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>\"']/g, ch => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[ch]));
    }
