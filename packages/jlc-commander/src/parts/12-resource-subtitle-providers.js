// @@creamu-part:12-resource-subtitle-providers
    const SUBTITLECAT_ORIGIN = 'https://www.subtitlecat.com';
    const SUBTITLE_CHINESE_LANGS = Object.freeze(['zh-CN', 'zh-TW']);
    const SUBTITLE_LANG_LABELS = Object.freeze({
        'zh-CN': '简中',
        'zh-TW': '繁中',
        en: '英语',
        ja: '日语',
        ko: '韩语'
    });

    function buildSubtitlecatSearchUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        return SUBTITLECAT_ORIGIN + '/index.php?search=' + encodeURIComponent(code);
    }

    function normalizeSubtitleLang(value) {
        const raw = String(value || '').trim();
        if (!raw) return '';
        const compact = raw.replace(/_/g, '-');
        const lower = compact.toLowerCase();
        if (lower === 'zh-cn' || lower === 'zh-hans' || lower === 'chs' || lower === 'cn') return 'zh-CN';
        if (lower === 'zh-tw' || lower === 'zh-hant' || lower === 'cht' || lower === 'tw') return 'zh-TW';
        if (lower === 'zh' || lower === 'chinese') return 'zh-CN';
        return compact;
    }

    function getSubtitleLangLabel(lang) {
        const key = normalizeSubtitleLang(lang);
        return SUBTITLE_LANG_LABELS[key] || key || '字幕';
    }

    function isChineseSubtitleLang(lang) {
        return SUBTITLE_CHINESE_LANGS.includes(normalizeSubtitleLang(lang));
    }

    function scoreSubtitleLang(lang) {
        const key = normalizeSubtitleLang(lang);
        if (key === 'zh-CN') return 80;
        if (key === 'zh-TW') return 70;
        if (key === 'en') return 20;
        if (key === 'ja' || key === 'ko') return 10;
        return 0;
    }

    function uniqueSubtitleEntries(list) {
        const seen = new Set();
        const baseHref = SUBTITLECAT_ORIGIN + '/';
        return (Array.isArray(list) ? list : [])
            .map(item => {
                if (!item) return null;
                const hrefRaw = String(item.href || item.url || '').trim();
                if (!hrefRaw) return null;
                let href = hrefRaw;
                try {
                    href = new URL(hrefRaw, item.base || baseHref).href;
                } catch (error) {
                    href = hrefRaw;
                }
                const lang = normalizeSubtitleLang(item.lang || item.language || '');
                const title = stripHtmlTags(item.title || item.label || item.text || '').trim();
                const src = String(item.src || item.source || '').trim();
                let srcHref = src;
                if (srcHref) {
                    try { srcHref = new URL(srcHref, item.base || baseHref).href; } catch (error) { /* keep */ }
                }
                return {
                    title: title || (lang ? (getSubtitleLangLabel(lang) + '字幕') : href),
                    href,
                    lang,
                    label: getSubtitleLangLabel(lang),
                    note: stripHtmlTags(item.note || '').trim(),
                    provider: String(item.provider || 'subtitlecat').trim() || 'subtitlecat',
                    src: srcHref,
                    size: stripHtmlTags(item.size || '').trim(),
                    downloads: Number(item.downloads || 0) || 0
                };
            })
            .filter(item => item && item.href)
            .filter(item => {
                const key = normalizeSubtitleLang(item.lang) + '|' + item.href;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }

    function extractSubtitlecatSearchEntries(responseText, avid) {
        const text = String(responseText || '');
        if (!text) return [];
        const table = (text.match(/<table\b[^>]*class=["'][^"']*\bsub-table\b[^"']*["'][^>]*>[\s\S]*?<\/table>/i) || [])[0] || text;
        const rows = table.match(/<tr\b[\s\S]*?<\/tr>/ig) || [];
        const entries = [];
        for (const row of rows) {
            if (/<th\b/i.test(row)) continue;
            const link = row.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
            if (!link) continue;
            const href = link[1];
            if (!/(?:^|\/)subs\/\d+\//i.test(href) || /\.srt(?:$|[?#])/i.test(href)) continue;
            const title = stripHtmlTags(link[2]);
            if (!title || (avid && !isLikelyAvidMatch(title, avid) && !isLikelyAvidMatch(decodeURIComponent(href.replace(/\+/g, ' ')), avid))) continue;
            const extra = stripHtmlTags(row.replace(link[0], ' '));
            const translated = (extra.match(/translated from\s+([a-z]+)/i) || [])[1] || '';
            const sizeText = (row.match(/sub-table__metric-value">\s*([^<]*?(?:KB|MB|GB))\s*</i) || [])[1] || '';
            const downloadText = (row.match(/sub-table__metric-value">\s*(\d+)\s*<span class=["']sub-table__metric-unit["']>\s*downloads/i) || [])[1] || '';
            const langCount = (row.match(/sub-table__metric-value">\s*(\d+)\s*<span class=["']sub-table__metric-unit["']>\s*languages/i) || [])[1] || '';
            const noteParts = ['Subtitlecat'];
            if (translated) noteParts.push('机翻自 ' + translated);
            if (sizeText) noteParts.push(sizeText.trim());
            if (downloadText) noteParts.push(downloadText + ' 次下载');
            if (langCount) noteParts.push(langCount + ' 种语言');
            entries.push({
                title,
                href,
                provider: 'subtitlecat',
                note: noteParts.join(' · '),
                src: href,
                base: SUBTITLECAT_ORIGIN + '/',
                size: sizeText.trim(),
                downloads: Number(downloadText || 0) || 0,
                langCount: Number(langCount || 0) || 0
            });
        }
        const seen = new Set();
        return entries.filter(item => {
            let abs = item.href;
            try { abs = new URL(item.href, SUBTITLECAT_ORIGIN + '/').href; } catch (error) { /* keep */ }
            if (seen.has(abs)) return false;
            seen.add(abs);
            item.href = abs;
            item.src = abs;
            return true;
        });
    }

    function extractSubtitlecatLanguageEntries(responseText, pack = {}) {
        const text = String(responseText || '');
        if (!text) return [];
        const blocks = text.match(/<div\b[^>]*class=["'][^"']*\bsub-single\b[^"']*["'][^>]*>[\s\S]*?<\/div>/ig) || [];
        const rawEntries = [];
        for (const block of blocks) {
            const download = block.match(/<a\b[^>]*id=["']download_([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/i)
                || block.match(/<a\b[^>]*href=["']([^"']+\.srt[^"']*)["'][^>]*id=["']download_([^"']+)["']/i);
            if (!download) continue;
            const lang = normalizeSubtitleLang(download[1].includes('/') ? download[2] : download[1]);
            const href = download[1].includes('/') ? download[1] : download[2];
            if (!lang || !href || !/\.srt(?:$|[?#])/i.test(href)) continue;
            const langLabel = stripHtmlTags((block.match(/<span>([^<]+)<\/span>\s*<span>\s*<a\b[^>]*id=["']download_/i) || [])[1] || '')
                || getSubtitleLangLabel(lang);
            const noteParts = [getSubtitleLangLabel(lang) || langLabel];
            if (pack.title) noteParts.push(pack.title);
            if (pack.size) noteParts.push(pack.size);
            if (pack.note && /机翻自/.test(pack.note)) {
                const origin = (pack.note.match(/机翻自\s+([^\s·]+)/) || [])[1];
                if (origin) noteParts.push('机翻自 ' + origin);
            }
            rawEntries.push({
                title: pack.title ? (pack.title + ' · ' + (getSubtitleLangLabel(lang) || langLabel)) : (getSubtitleLangLabel(lang) || langLabel),
                href,
                lang,
                provider: 'subtitlecat',
                note: noteParts.join(' · '),
                src: pack.src || pack.href || '',
                base: SUBTITLECAT_ORIGIN + '/',
                size: pack.size || '',
                downloads: Number(pack.downloads || 0) || 0
            });
        }
        return sortSubtitleEntries(rawEntries);
    }

    function sortSubtitleEntries(list) {
        return uniqueSubtitleEntries(list).sort((a, b) => {
            const langDelta = scoreSubtitleLang(b.lang) - scoreSubtitleLang(a.lang);
            if (langDelta) return langDelta;
            return (Number(b.downloads || 0) || 0) - (Number(a.downloads || 0) || 0);
        });
    }

    function filterSubtitlesByScope(list, scope = 'zh') {
        const entries = uniqueSubtitleEntries(list);
        return sortSubtitleEntries(scope === 'all' ? entries : entries.filter(item => isChineseSubtitleLang(item.lang)));
    }

    function buildSubtitleDownloadName(avid, item) {
        const code = normalizeResourceAvid(avid) || 'subtitle';
        const lang = normalizeSubtitleLang(item?.lang || '');
        let hrefName = '';
        try {
            hrefName = decodeURIComponent(new URL(item?.href || '', SUBTITLECAT_ORIGIN + '/').pathname.split('/').pop() || '');
        } catch (error) {
            hrefName = String(item?.href || '').split(/[?#]/)[0].split('/').pop() || '';
        }
        hrefName = hrefName.split(/[?#]/)[0].trim();
        const extMatch = hrefName.match(/\.(srt|ass|ssa|vtt)$/i);
        const ext = extMatch ? extMatch[1].toLowerCase() : 'srt';
        if (hrefName && extMatch && !/[\\/:*?"<>|]/.test(hrefName)) return hrefName;
        const safeLang = lang.replace(/[^A-Za-z0-9-]+/g, '') || 'und';
        return code + '.' + safeLang + '.' + ext;
    }
