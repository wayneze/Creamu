// @@creamu-part:50-resource-center
    function extractReleaseDateFromText(text) {
        const normalizedText = String(text || '').replace(/年/g, '-').replace(/月/g, '-').replace(/日/g, ' ');
        const labeled = normalizedText.match(/(?:发行(?:日期)?|發行(?:日期)?|発売日|配信開始日|release(?:\s*date)?|date)\s*[:：]?\s*([0-9]{4}[-/.][0-9]{1,2}[-/.][0-9]{1,2}|[0-9]{8})/i);
        if (labeled?.[1]) return normalizeReleaseDate(labeled[1]);
        const direct = normalizedText.match(/([0-9]{4}[-/.][0-9]{1,2}[-/.][0-9]{1,2}|[0-9]{8})/);
        return direct?.[1] ? normalizeReleaseDate(direct[1]) : '';
    }

    function extractDetailReleaseDate(context) {
        if (!context) return '';
        const directSelectors = {
            javlibrary: ['#video_date .text', '#video_date', 'td#video_date + td', '#video_info .text'],
            javbus: ['.col-md-3.info p', '#mag-submit-show'],
            javdb: ['.video-meta-panel .panel-block', '.movie-panel-info .panel-block']
        };
        const selectors = directSelectors[context.site] || [];
        for (const selector of selectors) {
            const nodes = Array.from(document.querySelectorAll(selector));
            for (const node of nodes) {
                const date = extractReleaseDateFromText(node.textContent || '');
                if (date) return date;
            }
        }

        let blocks = [];
        if (context.site === 'javlibrary') {
            blocks = Array.from(document.querySelectorAll('#video_info tr, #video_details tr, table tr'));
        } else if (context.site === 'javbus') {
            blocks = Array.from(document.querySelectorAll('.col-md-3.info p, .col-md-3.info li, .info p'));
        } else if (context.site === 'javdb') {
            blocks = Array.from(document.querySelectorAll('.video-meta-panel .panel-block, .movie-panel-info .panel-block, .panel-block'));
        }
        const labels = ['发行', '發行', '発売', 'release', 'date', '配信'];
        for (const block of blocks) {
            const text = compactText(block);
            if (!text) continue;
            if (labels.some(label => text.toLowerCase().includes(label.toLowerCase()))) {
                const date = extractReleaseDateFromText(text);
                if (date) return date;
            }
        }
        return '';
    }

    function getCurrentDetailContext() {
        const site = String(currentWeb || '').toLowerCase();
        let anchor = null;
        let avidNode = null;
        let title = '';
        let avid = '';

        if (site === 'javlibrary') {
            anchor = document.querySelector('#video_favorite_edit')
                || document.querySelector('#video_genres')
                || document.querySelector('#video_cast')
                || document.querySelector('#video_info');
            if (!anchor) return null;
            avidNode = document.querySelector('#video_id .text')
                || document.querySelector('td#video_id + td .text')
                || document.querySelector('#video_id');
            avid = normalizeResourceAvid(avidNode?.textContent || document.title);
            title = compactText(document.querySelector('#video_title h3 a') || document.querySelector('#video_title a') || document.title);
        } else if (site === 'javbus') {
            anchor = document.querySelector('.col-md-3.info')
                || document.querySelector('#mag-submit-show')
                || document.querySelector('.screencap');
            if (!anchor) return null;
            avidNode = document.querySelector('[data-clipboard-text]')
                || Array.from(document.querySelectorAll('.col-md-3.info p, .info p, span')).find(node => /識別碼|识别码|ID/i.test(compactText(node)));
            const pathCode = normalizeResourceAvid(location.pathname.split('/').filter(Boolean).pop() || '');
            avid = normalizeResourceAvid(avidNode?.getAttribute?.('data-clipboard-text') || avidNode?.textContent || pathCode || document.title);
            title = compactText(document.querySelector('.bigImage img')?.getAttribute('title') || document.querySelector('h3') || document.title);
        } else if (site === 'javdb') {
            anchor = document.querySelector('.video-meta-panel')
                || document.querySelector('.movie-panel-info')
                || document.querySelector('.panel.movie-panel-info');
            if (!anchor) return null;
            avidNode = document.querySelector('[data-clipboard-text]')
                || document.querySelector('.first-block .value')
                || document.querySelector('.movie-panel-info .panel-block');
            avid = normalizeResourceAvid(avidNode?.getAttribute?.('data-clipboard-text') || avidNode?.textContent || document.title);
            title = compactText(document.querySelector('.title.is-4') || document.querySelector('h2.title') || document.title);
        } else {
            return null;
        }

        if (!avid) return null;
        return {
            site,
            siteLabel: getSiteLabel(site),
            avid,
            title,
            anchor,
            avidNode,
            pageUrl: location.href
        };
    }

    function ensureStandaloneCommanderEntry() {
        createWorkbenchV3();
    }

    function removeDetailResourceCenter() {
        document.getElementById('jlc-resource-center')?.remove();
    }

    function ensureDetailResourceCenter(context) {
        if (!context?.anchor) return null;
        let container = document.getElementById('jlc-resource-center');
        if (!container) {
            container = document.createElement('section');
            container.id = 'jlc-resource-center';
            container.className = 'jlc-resource-center';
        }
        if (context.anchor.nextElementSibling !== container) {
            context.anchor.insertAdjacentElement('afterend', container);
        }
        return container;
    }

    function makeResourceLinksMarkup(links) {
        const list = uniqueLinkObjects(links);
        if (!list.length) return '';
        return `<div class="jlc-resource-chip-list">${list.map(link => `
            <a class="jlc-resource-chip" href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer nofollow">
                <span>${escapeHtml(link.label)}</span>
                ${link.note ? `<small>${escapeHtml(link.note)}</small>` : ''}
            </a>`).join('')}</div>`;
    }

    function applyJavlibraryMenuTopStyle() {
        if (typeof document === 'undefined') return;
        const styleId = 'jlc-javlibrary-menutop-style';
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            (document.head || document.documentElement || document.body)?.appendChild(styleEl);
        }
        if (currentWeb !== 'javlibrary' || !Status.get('menutoTop')) {
            styleEl.textContent = '';
            return;
        }
        styleEl.textContent = `
            #leftmenu { width: 100%; float: none; }
            #leftmenu > table { display: none; }
            #leftmenu .menul1,
            #leftmenu .menul1 > ul { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; }
            #leftmenu .menul1 { padding: 5px; }
            #rightcolumn { margin: 0 5px; padding: 10px 5px; }
        `;
    }

    function syncDetailReleaseBadge(context, dateText) {
        const node = context?.avidNode;
        if (!node || !(node instanceof Element)) return;
        const value = normalizeReleaseDate(dateText);
        let badge = node.parentElement?.querySelector('.avid-date-badge[data-jlc-detail-date="1"]') || null;
        if (!value) {
            badge?.remove();
            return;
        }
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'avid-date-badge';
            badge.dataset.jlcDetailDate = '1';
            badge.style.marginLeft = '8px';
            node.insertAdjacentElement('afterend', badge);
        }
        badge.textContent = value;
        badge.title = value;
    }

    function uniqueTrailerLinks(list) {
        const normalized = uniqueLinkObjects(list);
        const seen = new Set();
        return normalized.filter(item => {
            let key = '';
            if (/^MissAV\b/i.test(item.label)) {
                key = 'missav:' + (item.kind || normalizeText(item.label));
            } else if (/^FALENO\b/i.test(item.label) || item.kind === 'faleno') {
                key = 'faleno';
            } else if (/^MGS\b/i.test(item.label) || /^mgs/i.test(item.kind || '')) {
                key = 'mgs';
            }
            if (!key) return true;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function isIframeLikeTrailerHref(href) {
        const value = normalizeMediaUrl(href, location?.href || 'https://www.javlibrary.com/');
        if (!value) return false;
        if (/\.(?:mp4|m4v|mov|webm|ogv|m3u8)(?:$|[?#])/i.test(value)) return false;
        return /(?:youtube\.com|youtu\.be|vimeo\.com|player\.|embed|iframe|sampleplayer|sample_movie|\/player\/|\/embed\/)/i.test(value);
    }

    function buildTrailerEmbedUrl(url, options = {}) {
        const value = normalizeMediaUrl(url, location?.href || 'https://www.javlibrary.com/');
        if (!value) return '';
        const autoplay = options.autoplay !== false;
        const muted = options.muted !== false;
        let parsed;
        try {
            parsed = new URL(value);
        } catch (error) {
            return value;
        }
        const hostname = String(parsed.hostname || '').toLowerCase();
        const applyVideoParams = (urlObj, useMutedAlias = false) => {
            if (autoplay) {
                urlObj.searchParams.set('autoplay', '1');
            } else {
                urlObj.searchParams.delete('autoplay');
            }
            if (muted) {
                urlObj.searchParams.set(useMutedAlias ? 'muted' : 'mute', '1');
            } else {
                urlObj.searchParams.delete('mute');
                urlObj.searchParams.delete('muted');
            }
        };
        if (hostname === 'youtu.be') {
            const id = parsed.pathname.replace(/^\/+/, '').split(/[/?#]/)[0];
            if (!id) return value;
            const params = [];
            if (autoplay) params.push('autoplay=1');
            if (muted) params.push('mute=1');
            params.push('playsinline=1', 'rel=0');
            return 'https://www.youtube.com/embed/' + id + '?' + params.join('&');
        }
        if (hostname.endsWith('youtube.com')) {
            if (/\/watch/i.test(parsed.pathname || '')) {
                const id = parsed.searchParams.get('v');
                if (!id) return value;
                const params = [];
                if (autoplay) params.push('autoplay=1');
                if (muted) params.push('mute=1');
                params.push('playsinline=1', 'rel=0');
                return 'https://www.youtube.com/embed/' + id + '?' + params.join('&');
            }
            if (/\/embed\//i.test(parsed.pathname || '')) {
                applyVideoParams(parsed, false);
                parsed.searchParams.set('playsinline', '1');
                parsed.searchParams.set('rel', '0');
                return parsed.toString();
            }
        }
        if (hostname === 'vimeo.com') {
            const matched = parsed.pathname.match(/\/(\d+)(?:$|[/?#])/);
            if (!matched) return value;
            const params = [];
            if (autoplay) params.push('autoplay=1');
            if (muted) params.push('muted=1');
            return 'https://player.vimeo.com/video/' + matched[1] + (params.length ? ('?' + params.join('&')) : '');
        }
        if (hostname === 'player.vimeo.com') {
            applyVideoParams(parsed, true);
            return parsed.toString();
        }
        applyVideoParams(parsed, false);
        return parsed.toString();
    }

    function uniqueTrailerSources(list) {
        const seen = new Set();
        return (Array.isArray(list) ? list : []).map(item => {
            if (!item) return null;
            const href = normalizeMediaUrl(item.href || item.url || '', item.pageUrl || location?.href || 'https://www.javlibrary.com/');
            if (!href) return null;
            let type = String(item.type || '').trim().toLowerCase();
            if (!type) type = isIframeLikeTrailerHref(href) ? 'iframe' : 'video';
            if (!['iframe', 'video'].includes(type)) type = 'video';
            const pageUrl = normalizeMediaUrl(item.pageUrl || href, location?.href || 'https://www.javlibrary.com/');
            return {
                label: String(item.label || item.text || '').trim() || href,
                href,
                kind: String(item.kind || '').trim(),
                note: String(item.note || '').trim(),
                pageUrl,
                type
            };
        }).filter(Boolean).filter(item => {
            const key = item.type + '|' + item.href;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function isIframeTrailerSource(source) {
        if (!source) return false;
        if (String(source.type || '').trim().toLowerCase() === 'iframe') return true;
        return isIframeLikeTrailerHref(source.embedUrl || source.href || '');
    }

    function getTrailerPlayableUrl(source, options = {}) {
        if (!source) return '';
        return isIframeTrailerSource(source)
            ? buildTrailerEmbedUrl(source.embedUrl || source.href || '', options)
            : normalizeMediaUrl(source.href || source.embedUrl || '', source.pageUrl || location?.href || 'https://www.javlibrary.com/');
    }

    function mountTrailerPlayer(container, source, options = {}) {
        if (!container) return null;
        container.innerHTML = '';
        if (!source) return null;
        const mode = options.mode === 'overlay' ? 'overlay' : 'inline';
        const autoplay = options.autoplay !== false;
        const muted = options.muted !== false;
        const playableUrl = getTrailerPlayableUrl(source, { autoplay, muted });
        if (!playableUrl) return null;
        const shell = document.createElement('div');
        shell.className = 'jlc-trailer-player-shell is-' + mode;
        if (isIframeTrailerSource(source)) {
            const iframe = document.createElement('iframe');
            iframe.src = playableUrl;
            iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
            iframe.allowFullscreen = true;
            iframe.loading = 'lazy';
            iframe.referrerPolicy = 'strict-origin-when-cross-origin';
            shell.appendChild(iframe);
            container.appendChild(shell);
            return iframe;
        }
        const video = document.createElement('video');
        video.className = mode === 'overlay' ? 'jlc-trailer-overlay-video' : 'jlc-resource-video';
        video.controls = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.muted = muted;
        video.autoplay = autoplay;
        video.src = playableUrl;
        shell.appendChild(video);
        container.appendChild(shell);
        if (autoplay) {
            const playPromise = video.play();
            if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
        }
        return video;
    }

    function ensureTrailerOverlay() {
        let overlay = document.getElementById('jlc-trailer-overlay');
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'jlc-trailer-overlay';
        overlay.className = 'jlc-trailer-overlay';
        overlay.hidden = true;
        overlay.innerHTML = ''
            + '<div class="jlc-trailer-dialog" role="dialog" aria-modal="true" aria-label="预告播放">'
            + '<button type="button" class="jlc-trailer-close" data-jlc-close-trailer aria-label="关闭预告">×</button>'
            + '<div class="jlc-trailer-dialog-head"><strong data-jlc-trailer-title>预告片</strong><small>默认静音 · 弹层播放</small></div>'
            + '<div class="jlc-trailer-dialog-player" data-jlc-trailer-player></div>'
            + '<div class="jlc-trailer-dialog-actions"><a href="#" target="_blank" rel="noopener noreferrer nofollow" data-jlc-trailer-openblank>新标签打开</a></div>'
            + '</div>';
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay || event.target?.dataset?.jlcCloseTrailer !== undefined) {
                closeTrailerOverlay();
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeTrailerOverlay();
        });
        document.body.appendChild(overlay);
        return overlay;
    }

    function closeTrailerOverlay() {
        const overlay = document.getElementById('jlc-trailer-overlay');
        if (!overlay) return;
        const video = overlay.querySelector('video');
        if (video) {
            video.pause();
            video.removeAttribute('src');
            video.load();
        }
        const player = overlay.querySelector('[data-jlc-trailer-player]');
        if (player) player.innerHTML = '';
        overlay.classList.remove('is-open');
        overlay.hidden = true;
        document.documentElement.classList.remove('scrollBarHide');
    }

    function openTrailerOverlay(source) {
        if (!source?.href) return;
        const overlay = ensureTrailerOverlay();
        const title = overlay.querySelector('[data-jlc-trailer-title]');
        const openBlank = overlay.querySelector('[data-jlc-trailer-openblank]');
        const player = overlay.querySelector('[data-jlc-trailer-player]');
        if (title) title.textContent = source.label || '预告片';
        if (openBlank) openBlank.href = source.pageUrl || source.href;
        mountTrailerPlayer(player, source, { mode: 'overlay', autoplay: true, muted: true });
        overlay.hidden = false;
        overlay.classList.add('is-open');
        document.documentElement.classList.add('scrollBarHide');
    }

    function isResourceCenterTokenAlive(token) {
        return document.getElementById('jlc-resource-center')?.dataset.renderToken === token;
    }

    async function fetchDmmSearchTrailerInfo(context) {
        const key = context?.avid;
        const searchUrl = buildDmmSearchUrl(key);
        if (!key || !searchUrl) return null;
        const response = await requestPage(searchUrl, {
            timeout: 12000,
            headers: {
                Cookie: 'age_check_done=1',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
            }
        });
        if (!response.ok) {
            const state = [403, 429, 503].includes(response.status) ? 'blocked'
                : (response.status === 404 ? 'empty' : 'error');
            return {
                videoSources: [],
                links: uniqueLinkObjects([{ label: 'DMM 搜索', href: searchUrl, note: '官方搜索' }]),
                status: state,
                note: describeRequestStatus(response, '搜索失败')
            };
        }
        return extractDmmSearchPreviewInfo(response.responseText, key);
    }

    async function fetchMissAVTrailerInfo(context) {
        const key = context?.avid;
        if (!key) return null;
        if (resourceMissAVCache.has(key)) return resourceMissAVCache.get(key);
        const promise = (async () => {
            const variants = await Promise.all(buildMissAVVariantGroups(key).map(async group => {
                let abnormalRedirect = false;
                let blockedStatus = 0;
                let hardErrorNote = '';
                for (const candidate of group.candidates) {
                    const result = await requestPage(candidate.href, { timeout: 12000 });
                    const safeHref = sanitizeMissAVPageUrl(result.finalUrl || candidate.href, key, candidate.href);
                    if (result.ok && safeHref) {
                        return {
                            key: group.key,
                            label: group.label,
                            state: 'ok',
                            note: '存在页',
                            href: safeHref,
                            link: { label: group.label, href: safeHref, note: '存在页', kind: group.key }
                        };
                    }
                    if (result.ok && !safeHref) {
                        abnormalRedirect = true;
                        continue;
                    }
                    if (result.status === 403 && !blockedStatus) blockedStatus = 403;
                    if (!hardErrorNote && result.status && result.status !== 404) {
                        hardErrorNote = describeRequestStatus(result, '请求失败');
                    }
                }
                const fallback = group.candidates.find(item => /\/cn\//i.test(item.href)) || group.candidates[0] || null;
                let state = 'empty';
                let note = '未找到';
                if (blockedStatus) {
                    state = 'blocked';
                    note = 'HTTP ' + blockedStatus;
                } else if (abnormalRedirect) {
                    state = 'partial';
                    note = '异常跳转已忽略';
                } else if (hardErrorNote) {
                    state = 'error';
                    note = hardErrorNote;
                }
                return {
                    key: group.key,
                    label: group.label,
                    state,
                    note,
                    href: fallback?.href || '',
                    link: (state === 'blocked' || state === 'partial') && fallback
                        ? { label: group.label, href: fallback.href, note, kind: group.key }
                        : null
                };
            }));
            return {
                variants,
                links: uniqueLinkObjects(variants.map(item => item.link).filter(Boolean)),
                status: variants.some(item => item.state === 'ok')
                    ? 'ok'
                    : (variants.some(item => item.state === 'blocked')
                        ? 'blocked'
                        : (variants.some(item => item.state === 'partial')
                            ? 'partial'
                            : (variants.some(item => item.state === 'error') ? 'error' : 'empty'))),
                note: variants.map(item => item.label.replace(/^MissAV\s*/, '') + '：' + item.note).join(' · ')
            };
        })().catch(err => {
            console.warn('[JLC] MissAV 页面检测失败', err);
            resourceMissAVCache.delete(key);
            return {
                variants: buildMissAVVariantGroups(key).map(group => ({
                    key: group.key,
                    label: group.label,
                    state: 'error',
                    note: '解析异常',
                    href: (group.candidates[0] || {}).href || '',
                    link: null
                })),
                links: [],
                status: 'error',
                note: '解析异常'
            };
        });
        resourceMissAVCache.set(key, promise);
        return promise;
    }

    async function fetchFalenoTrailerInfo(context) {
        const key = context?.avid;
        if (!key) return null;
        if (resourceFalenoCache.has(key)) return resourceFalenoCache.get(key);
        const promise = (async () => {
            const searchUrl = buildFalenoSearchUrl(key);
            if (!searchUrl) return { videoSources: [], links: [], status: 'empty', note: '无候选', detailUrl: '' };
            const response = await requestPage(searchUrl, {
                timeout: 9000,
                headers: { 'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8' }
            });
            const searchLink = { label: 'FALENO', href: searchUrl, note: '官方搜索', kind: 'faleno' };
            if (!response.ok) {
                const state = [403, 429, 503].includes(response.status) ? 'blocked'
                    : (response.status === 404 ? 'empty' : 'error');
                return {
                    videoSources: [],
                    links: uniqueTrailerLinks([searchLink]),
                    status: state,
                    note: describeRequestStatus(response, '搜索失败'),
                    detailUrl: ''
                };
            }
            const searchVideos = extractFalenoPreviewCandidates(response.responseText, response.finalUrl || searchUrl);
            const detailLinks = extractFalenoDetailLinks(response.responseText, key, response.finalUrl || searchUrl);
            if (searchVideos.length) {
                return {
                    videoSources: searchVideos,
                    links: uniqueTrailerLinks([searchLink, ...detailLinks]),
                    status: 'ok',
                    note: '官方搜索页命中样片',
                    detailUrl: (detailLinks[0] || {}).href || response.finalUrl || searchUrl
                };
            }
            let blockedStatus = 0;
            let hardErrorNote = '';
            for (const detailLink of detailLinks.slice(0, 2)) {
                const detail = await requestPage(detailLink.href, {
                    timeout: 9000,
                    headers: { 'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8' }
                });
                if (!detail.ok) {
                    if ([403, 429, 503].includes(detail.status) && !blockedStatus) blockedStatus = detail.status;
                    if (!hardErrorNote && detail.status && detail.status !== 404) {
                        hardErrorNote = describeRequestStatus(detail, '详情请求失败');
                    }
                    continue;
                }
                const videos = extractFalenoPreviewCandidates(detail.responseText, detail.finalUrl || detailLink.href);
                if (videos.length) {
                    return {
                        videoSources: videos,
                        links: uniqueTrailerLinks([searchLink, detailLink]),
                        status: 'ok',
                        note: '官方详情命中样片',
                        detailUrl: detail.finalUrl || detailLink.href
                    };
                }
            }
            let state = detailLinks.length ? 'partial' : 'empty';
            let note = detailLinks.length ? '详情命中，未抽到样片' : '搜索未命中';
            if (blockedStatus) {
                state = 'blocked';
                note = 'HTTP ' + blockedStatus;
            } else if (hardErrorNote) {
                state = 'error';
                note = hardErrorNote;
            }
            return {
                videoSources: [],
                links: uniqueTrailerLinks([searchLink, ...detailLinks]),
                status: state,
                note,
                detailUrl: (detailLinks[0] || {}).href || response.finalUrl || searchUrl
            };
        })().catch(error => {
            console.warn('[JLC] FALENO 预告解析失败', error);
            resourceFalenoCache.delete(key);
            return {
                videoSources: [],
                links: uniqueTrailerLinks([{ label: 'FALENO', href: buildFalenoSearchUrl(key), note: '官方搜索', kind: 'faleno' }]),
                status: 'error',
                note: '解析异常',
                detailUrl: ''
            };
        });
        resourceFalenoCache.set(key, promise);
        return promise;
    }

    async function fetchMgsTrailerInfo(context) {
        const key = context?.avid;
        if (!key) return null;
        if (resourceMgsCache.has(key)) return resourceMgsCache.get(key);
        const promise = (async () => {
            if (!isLikelyMgsAvid(key)) {
                return { videoSources: [], links: buildMgsManualLinks(key), status: 'empty', note: '非 MGS 番号', detailUrl: '' };
            }
            const detailCandidates = buildMgsDetailCandidates(key);
            if (!detailCandidates.length) {
                return { videoSources: [], links: buildMgsManualLinks(key), status: 'empty', note: '无候选', detailUrl: '' };
            }
            let blockedStatus = 0;
            let hardErrorNote = '';
            for (const candidate of detailCandidates) {
                const detail = await requestPage(candidate.href, { timeout: 12000 });
                if (!detail.ok) {
                    if (detail.status === 403 && !blockedStatus) blockedStatus = 403;
                    if (!hardErrorNote && detail.status && detail.status !== 404) {
                        hardErrorNote = describeRequestStatus(detail, '详情请求失败');
                    }
                    continue;
                }
                const samplePlayers = extractMgsSamplePlayerLinks(detail.responseText, key);
                if (!samplePlayers.length) {
                    continue;
                }
                for (const sample of samplePlayers.slice(0, 2)) {
                    if (!sample.pid) continue;
                    const info = await requestPage('https://www.mgstage.com/sampleplayer/sampleRespons.php?pid=' + encodeURIComponent(sample.pid), { timeout: 12000 });
                    if (!info.ok) {
                        if (info.status === 403 && !blockedStatus) blockedStatus = 403;
                        if (!hardErrorNote && info.status && info.status !== 404) {
                            hardErrorNote = describeRequestStatus(info, '样片请求失败');
                        }
                        continue;
                    }
                    let payload = null;
                    try {
                        payload = JSON.parse(info.responseText || '{}');
                    } catch (error) {
                        payload = null;
                    }
                    const movieUrl = buildMgsSampleVideoUrl(payload?.url || '');
                    if (!movieUrl) continue;
                    return {
                        videoSources: [{ label: 'MGS 官方预告', href: movieUrl, kind: 'official', pageUrl: candidate.href }],
                        links: uniqueLinkObjects([{ label: 'MGS', href: candidate.href, note: '官方详情' }]),
                        status: 'ok',
                        note: '官方样片直连',
                        detailUrl: candidate.href
                    };
                }
                return {
                    videoSources: [],
                    links: uniqueLinkObjects([{ label: 'MGS', href: candidate.href, note: '官方详情' }]),
                    status: 'partial',
                    note: '详情命中，样片解析失败',
                    detailUrl: candidate.href
                };
            }
            let state = 'empty';
            let note = '未命中';
            if (blockedStatus) {
                state = 'blocked';
                note = 'HTTP ' + blockedStatus;
            } else if (hardErrorNote) {
                state = 'error';
                note = hardErrorNote;
            }
            return {
                videoSources: [],
                links: buildMgsManualLinks(key),
                status: state,
                note,
                detailUrl: (detailCandidates[0] || {}).href || ''
            };
        })().catch(err => {
            console.warn('[JLC] MGS 预告解析失败', err);
            resourceMgsCache.delete(key);
            return {
                videoSources: [],
                links: buildMgsManualLinks(key),
                status: 'error',
                note: '解析异常',
                detailUrl: (buildMgsDetailCandidates(key)[0] || {}).href || ''
            };
        });
        resourceMgsCache.set(key, promise);
        return promise;
    }

    async function fetchSupplementalMagnetInfo(avid) {
        const key = normalizeResourceAvid(avid);
        const emptyMessage = '未搜索到补充磁力';
        if (!key) return { magnets: [], statuses: [], sources: [], message: emptyMessage };
        if (resourceMagnetCache.has(key)) return resourceMagnetCache.get(key);
        const providers = [
            { key: 'sukebei', label: 'Sukebei', url: buildSukebeiSearchUrl(key), extract: extractSukebeiMagnetEntries, fetch: (url) => requestPage(url, { timeout: 12000 }) },
            { key: 'torrentkitty', label: 'Torkitty', url: buildTorrentKittySearchUrl(key), extract: extractTorrentKittyMagnetEntries, fetch: (url) => requestPage(url, { timeout: 12000 }) },
            { key: 'btsow', label: 'BTSOW', url: buildBtsowSearchUrl(key), extract: extractBtsowMagnetEntries, fetch: (url) => requestBtsowSearchPage(url) }
        ];
        const promise = (async () => {
            const results = await Promise.all(providers.map(async provider => {
                try {
                    if (!provider.url) {
                        return { key: provider.key, label: provider.label, href: provider.url, state: 'empty', note: '缺少番号', entries: [] };
                    }
                    const response = await provider.fetch(provider.url);
                    if (!response.ok || response.blockedByChallenge) {
                        const state = response.blockedByChallenge
                            ? 'blocked'
                            : ([403, 429, 503].includes(response.status) ? 'blocked' : (response.status === 404 ? 'empty' : 'error'));
                        return {
                            key: provider.key,
                            label: provider.label,
                            href: provider.url,
                            state,
                            note: response.blockedByChallenge ? 'JS challenge' : describeRequestStatus(response, '检索失败'),
                            entries: []
                        };
                    }
                    const entries = provider.extract(response.responseText, key);
                    return {
                        key: provider.key,
                        label: provider.label,
                        href: provider.url,
                        state: entries.length ? 'ok' : 'empty',
                        note: entries.length ? (entries.length + ' 条') : '未命中',
                        entries
                    };
                } catch (error) {
                    console.warn('[JLC] 磁力 provider 解析失败', provider.label, error);
                    return { key: provider.key, label: provider.label, href: provider.url, state: 'error', note: '解析异常', entries: [] };
                }
            }));
            const statuses = results.map(result => ({
                key: result.key,
                label: result.label,
                state: result.state,
                note: result.note,
                href: result.href
            }));
            const magnets = uniqueMagnetEntries(results.flatMap(result => result.entries));
            const sources = results.map(result => ({
                key: result.key,
                label: result.label,
                href: result.href,
                state: result.state,
                note: result.note,
                magnets: uniqueMagnetEntries(result.entries)
            }));
            return {
                magnets,
                statuses,
                sources,
                message: magnets.length ? '' : emptyMessage
            };
        })().catch(error => {
            console.warn('[JLC] 磁力补充搜索失败', error);
            resourceMagnetCache.delete(key);
            return {
                magnets: [],
                statuses: [
                    { key: 'sukebei', label: 'Sukebei', state: 'error', note: '解析异常', href: buildSukebeiSearchUrl(key) },
                    { key: 'torrentkitty', label: 'Torkitty', state: 'error', note: '解析异常', href: buildTorrentKittySearchUrl(key) },
                    { key: 'btsow', label: 'BTSOW', state: 'error', note: '解析异常', href: buildBtsowSearchUrl(key) }
                ],
                sources: [],
                message: emptyMessage
            };
        });
        resourceMagnetCache.set(key, promise);
        return promise;
    }

    async function resolveTrailerSources(context, options = {}) {
        const key = context?.avid;
        if (!key) return { videoSources: [], linkSources: [], statuses: [], trailerNote: '' };
        const includeMissAV = options?.includeMissAV !== false;
        const cacheKey = includeMissAV ? key + '::missav-status' : key + '::dmm-only';
        if (resourceTrailerCache.has(cacheKey)) return resourceTrailerCache.get(cacheKey);
        const promise = (async () => {
            const officialCandidates = buildOfficialPreviewCandidates(key);
            const missPromise = includeMissAV
                ? fetchMissAVTrailerInfo(context)
                : Promise.resolve({
                    variants: buildMissAVVariantGroups(key).map(group => ({
                        key: group.key,
                        label: group.label,
                        state: 'empty',
                        note: '仅保留直达候选',
                        href: (group.candidates[0] || {}).href || ''
                    })),
                    links: buildMissAVManualLinks(key),
                    status: 'empty',
                    note: '仅保留直达候选'
                });
            const shouldTryMgs = isLikelyMgsAvid(key);
            const earlyMgsPromise = shouldTryMgs ? fetchMgsTrailerInfo(context) : null;
            const supplementalPromise = fetchTrailerSupplementalStatus(key);
            const officialChecks = await Promise.all(officialCandidates.map(async candidate => ({
                candidate,
                probe: await probeMediaUrl(candidate.href)
            })));
            const officialHit = officialChecks.find(item => item.probe?.ok);
            const bestOfficialFailure = officialChecks.find(item => item.probe && item.probe.state !== 'ok')?.probe || null;
            const dmmSearchInfo = officialHit ? null : await fetchDmmSearchTrailerInfo(context);
            const hasDmmSearchVideo = !!(dmmSearchInfo?.videoSources?.length);
            const falenoInfo = (!officialHit && !hasDmmSearchVideo) ? await fetchFalenoTrailerInfo(context) : null;
            const hasFalenoVideo = !!(falenoInfo?.videoSources?.length);
            const missInfo = await missPromise;
            const mgsInfo = (!officialHit && !hasDmmSearchVideo && !hasFalenoVideo && shouldTryMgs)
                ? await earlyMgsPromise
                : null;
            const supplementalInfo = await supplementalPromise;

            const statuses = [
                officialHit
                    ? { label: 'DMM', state: 'ok', note: officialHit.probe.note || '直连可用', href: officialHit.candidate.href }
                    : {
                        label: 'DMM',
                        state: normalizeResourceStatusState((dmmSearchInfo?.status && dmmSearchInfo.status !== 'empty')
                            ? dmmSearchInfo.status
                            : (bestOfficialFailure?.state || dmmSearchInfo?.status || 'empty')),
                        note: dmmSearchInfo?.note || bestOfficialFailure?.note || (officialCandidates.length ? '未命中' : '无候选'),
                        href: (dmmSearchInfo?.links?.[0] || officialCandidates[0] || {}).href || ''
                    },
                ...(falenoInfo ? [{
                    label: 'FALENO',
                    state: normalizeResourceStatusState(falenoInfo.status || 'empty'),
                    note: falenoInfo.note || '未命中',
                    href: (falenoInfo.links?.[0] || {}).href || ''
                }] : []),
                ...(mgsInfo ? [{
                    label: 'MGS',
                    state: normalizeResourceStatusState(mgsInfo.status || 'empty'),
                    note: mgsInfo.note || '未命中',
                    href: (mgsInfo.links?.[0] || {}).href || ''
                }] : []),
                ...((missInfo?.variants || []).map(item => ({
                    label: item.label,
                    state: normalizeResourceStatusState(item.state || 'empty'),
                    note: item.note || '未命中',
                    href: item.href || ''
                }))),
                ...((supplementalInfo?.statuses || []).map(item => ({
                    label: item.label,
                    state: normalizeResourceStatusState(item.state || 'empty'),
                    note: item.note || '未命中',
                    href: item.href || '',
                    kind: item.kind || ''
                })))
            ];

            const videoSources = uniqueTrailerSources([
                ...(officialHit ? [{
                    label: 'DMM 官方预告',
                    href: officialHit.candidate.href,
                    kind: 'official',
                    pageUrl: officialHit.candidate.href,
                    type: 'video'
                }] : []),
                ...(!officialHit && hasDmmSearchVideo ? (dmmSearchInfo.videoSources || []) : []),
                ...(!officialHit && !hasDmmSearchVideo ? (falenoInfo?.videoSources || []) : []),
                ...(!officialHit && !hasDmmSearchVideo && !hasFalenoVideo ? (mgsInfo?.videoSources || []) : [])
            ]);

            const missLinks = includeMissAV ? (missInfo?.links || []) : buildMissAVManualLinks(key);
            const linkSources = uniqueTrailerLinks([
                ...((officialHit || dmmSearchInfo?.links?.length) ? [] : officialCandidates.slice(0, 1).map(item => ({
                    label: 'DMM 直链候选',
                    href: item.href,
                    note: bestOfficialFailure?.note || '待手动验证'
                }))),
                ...(dmmSearchInfo?.links || []),
                ...(falenoInfo?.links || []),
                ...(mgsInfo?.links || []),
                ...missLinks,
                ...(supplementalInfo?.links || [])
            ]);

            return {
                videoSources,
                linkSources,
                statuses,
                trailerNote: ''
            };
        })().catch(err => {
            console.warn('[JLC] 预告解析失败', err);
            resourceTrailerCache.delete(cacheKey);
            return {
                videoSources: [],
                linkSources: uniqueTrailerLinks([...buildMissAVManualLinks(key), ...buildTrailerFallbackLinks(key)]),
                statuses: [
                    { label: 'DMM', state: 'error', note: '解析异常' },
                    { label: 'FALENO', state: 'error', note: '解析异常' },
                    { label: 'MGS', state: 'error', note: '解析异常' },
                    { label: 'MissAV 有码', state: 'error', note: '解析异常' },
                    { label: 'MissAV 无码流出', state: 'error', note: '解析异常' }
                ],
                trailerNote: ''
            };
        });
        resourceTrailerCache.set(cacheKey, promise);
        return promise;
    }

    async function buildInlineScreenshotPanel(context) {
        const key = context?.avid;
        if (!key) throw new Error('missing avid');
        let promise = resourceScreenshotCache.get(key);
        if (!promise) {
            promise = getAvImg(key, `jlc-resource-${key}`).catch(err => {
                resourceScreenshotCache.delete(key);
                throw err;
            });
            resourceScreenshotCache.set(key, promise);
        }
        const originalPanel = await promise;
        const $panel = originalPanel.clone(true, true);
        $panel.removeAttr('name').removeClass('pop-up-tag').addClass('jlc-inline-screenshot-panel').show();
        $panel.css({ minHeight: '0', width: '100%' });
        $panel.find('ul').remove();
        $panel.find('img[name="screenshot"]').each((index, img) => {
            if (index === 0) {
                img.style.display = 'block';
            } else {
                $(img).remove();
            }
        });
        $panel.find('li.imgResult-li').removeClass('imgResult-loading');
        $panel.find('li.imgResult-li').eq(0).addClass('imgResult-Current').siblings().removeClass('imgResult-Current');
        return $panel.get(0);
    }

    function extractCurrentPageMagnets() {
        const anchors = Array.from(document.querySelectorAll('a[href^="magnet:"]'));
        return uniqueMagnetEntries(anchors.map((anchor, index) => {
            const row = anchor.closest('tr, .item, .magnet-item, .columns, .panel-block, .message, .card-content') || anchor.parentElement;
            const rowText = compactText(row);
            const text = compactText(anchor.textContent);
            const sizeMatch = rowText.match(/(?:\d+(?:\.\d+)?\s*(?:GB|MB|TB))/i);
            const dateMatch = rowText.match(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/);
            const noteParts = ['当前页'];
            if (sizeMatch?.[0]) noteParts.push(sizeMatch[0]);
            if (dateMatch?.[0]) noteParts.push(dateMatch[0]);
            return {
                title: text || `磁链 ${index + 1}`,
                href: anchor.href,
                provider: 'page',
                note: noteParts.join(' · ')
            };
        }));
    }

    function normalizeMagnetProviderKey(value) {
        const key = normalizeText(value || '').replace(/[^a-z0-9]+/g, '');
        if (!key || key === 'all') return 'all';
        if (key === 'page' || key === 'currentpage') return 'page';
        if (key === 'torrentkitty' || key === 'torkitty') return 'torrentkitty';
        if (key === 'sukebei') return 'sukebei';
        if (key === 'btsow') return 'btsow';
        if (key === 'sehuatang' || key === 'sehua' || key === 'sehuatangsearch') return 'sehuatang';
        return key;
    }

    function filterMagnetsByProvider(list, providerKey) {
        const key = normalizeMagnetProviderKey(providerKey);
        if (!key || key === 'all') return uniqueMagnetEntries(list);
        return uniqueMagnetEntries((Array.isArray(list) ? list : []).filter(item => normalizeMagnetProviderKey(item?.provider) === key));
    }

    function makeMagnetProviderStatusMarkup(statuses, activeProvider = 'all') {
        const list = Array.isArray(statuses) ? statuses : [];
        if (!list.length) return '';
        return '<div class="jlc-resource-status-list">' + list.map(item => {
            const state = normalizeResourceStatusState(item.state || item.status);
            const label = String(item.label || item.provider || '来源').trim();
            const note = String(item.note || '').trim();
            const key = normalizeMagnetProviderKey(item.key || item.provider || item.label || 'all');
            const href = normalizeMediaUrl(item.href || item.url || '', location?.href || 'https://www.javlibrary.com/');
            const title = href ? '点击切换；再次点击或空结果时打开源站' : '点击切换磁力来源';
            return '<button type="button" class="jlc-resource-status is-' + escapeHtml(state) + (normalizeMagnetProviderKey(activeProvider) === key ? ' is-active-filter' : '') + '" data-jlc-magnet-provider="' + escapeHtml(key) + '"' + (href ? ' data-jlc-provider-href="' + escapeHtml(href) + '"' : '') + ' title="' + escapeHtml(title) + '">' + '<strong>' + escapeHtml(label) + '</strong>' + (note ? '<small>' + escapeHtml(note) + '</small>' : '') + '</button>';
        }).join('') + '</div>';
    }

    function bindMagnetProviderButtons(body, handlers = {}) {
        body.querySelectorAll('[data-jlc-magnet-provider]').forEach(button => {
            const handleActivate = (event) => {
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
                }
                const key = normalizeMagnetProviderKey(button.dataset.jlcMagnetProvider || 'all');
                const href = button.dataset.jlcProviderHref || '';
                const count = Number(button.dataset.jlcProviderCount || 0);
                const isActive = button.dataset.jlcProviderActive === '1';
                if (href && (isActive || count < 1)) {
                    window.open(href, '_blank', 'noopener,noreferrer');
                    return;
                }
                handlers.onSwitch?.(key);
            };
            button.addEventListener('click', handleActivate);
            button.addEventListener('auxclick', (event) => {
                if (event.button !== 1) return;
                handleActivate(event);
            });
        });
    }

    function makeMagnetListMarkup(magnets) {
        if (!magnets.length) return '';
        return `<div class="jlc-magnet-list">${magnets.map((magnet, index) => {
            const title = magnet.label || magnet.title || ('磁链 ' + (index + 1));
            const note = magnet.note || '磁力链接';
            return `
            <div class="jlc-magnet-row" data-jlc-magnet-index="${index}">
                <div class="jlc-magnet-meta">
                    <div class="jlc-magnet-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
                </div>
                <div class="jlc-magnet-side">
                    <div class="jlc-magnet-sub" title="${escapeHtml(note)}">${escapeHtml(note)}</div>
                    <div class="jlc-magnet-actions">
                        <button type="button" data-jlc-copy-magnet="${index}">复制磁链</button>
                        <a href="${escapeHtml(magnet.href)}" target="_blank" rel="noopener noreferrer nofollow">打开</a>
                        ${magnet.src ? `<a href="${escapeHtml(magnet.src)}" target="_blank" rel="noopener noreferrer nofollow">来源</a>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('')}</div>`;
    }

    function bindMagnetActionButtons(body, magnets) {
        body.querySelectorAll('[data-jlc-copy-magnet]').forEach(button => {
            button.addEventListener('click', () => {
                const magnet = magnets[Number(button.dataset.jlcCopyMagnet)];
                if (!magnet) return;
                GM_setClipboard(magnet.href);
                showAlert('磁链已复制！');
            });
        });
    }

    function renderResourceLinksSection(card, context) {
        const body = card.querySelector('.jlc-resource-body');
        const markup = makeResourceLinksMarkup(buildExternalResourceLinks(context.avid, context.site));
        body.innerHTML = markup || '<div class="jlc-resource-empty">暂无站外入口。</div>';
    }

    async function renderTrailerSection(card, context, token) {
        const body = card.querySelector('.jlc-resource-body');
        const key = normalizeResourceAvid(context?.avid);
        const idleStatuses = [
            { label: 'DMM', state: 'pending', note: '自动检测中' },
            { label: 'MissAV 有码', state: 'pending', note: '自动检测中' },
            { label: 'MissAV 无码流出', state: 'pending', note: '自动检测中' },
            { label: 'FALENO', state: 'pending', note: '自动检测中' },
            { label: '7MMTV', state: 'pending', note: '自动检测中' },
            { label: 'SupJav', state: 'pending', note: '自动检测中' },
            { label: '123AV', state: 'pending', note: '自动检测中' }
        ];
        if (isLikelyMgsAvid(key)) {
            idleStatuses.splice(3, 0, { label: 'MGS', state: 'pending', note: '等待回退' });
        }
        const idleLinks = uniqueTrailerLinks([
            ...buildMissAVManualLinks(key),
            ...buildTrailerFallbackLinks(key)
        ]);
        let loadingTrailer = false;

        const swallowEvent = (event, preventDefault = false) => {
            if (!event) return;
            if (preventDefault) event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        };

        const bindReloadButton = () => {
            const button = body.querySelector('[data-jlc-load-trailer]');
            if (!button) return;
            button.addEventListener('click', (event) => {
                swallowEvent(event, true);
                clearTrailerResourceCaches(key);
                void loadTrailer();
            }, { capture: true });
        };

        const renderLoading = () => {
            body.innerHTML = makeTrailerProviderMarkup(idleStatuses, idleLinks)
                + '<div class="jlc-resource-loading">自动检测预告中...</div>';
        };

        const renderResolved = (result) => {
            const videoSources = uniqueTrailerSources(result.videoSources || []);
            const linkSources = uniqueTrailerLinks(result.linkSources || idleLinks);
            const displayLinks = linkSources.length ? linkSources : idleLinks;
            const statuses = result.statuses || idleStatuses;
            const providerMarkup = makeTrailerProviderMarkup(statuses, displayLinks);
            const actionsBase = ''
                + '<div class="jlc-resource-inline-actions jlc-trailer-main-actions">'
                + '    <button type="button" data-jlc-open-trailer>弹层播放</button>'
                + '    <a href="#" target="_blank" rel="noopener noreferrer nofollow" data-jlc-open-trailer-blank>新标签打开</a>'
                + '    <button type="button" data-jlc-load-trailer>重新检测</button>'
                + '</div>';

            if (!videoSources.length) {
                body.innerHTML = providerMarkup
                    + '<div class="jlc-resource-empty">暂时没找到可直连预告。</div>'
                    + actionsBase;
                const openBlank = body.querySelector('[data-jlc-open-trailer-blank]');
                if (openBlank) openBlank.href = (linkSources[0] || {}).href || '#';
                body.querySelector('[data-jlc-open-trailer]')?.addEventListener('click', (event) => {
                    swallowEvent(event, true);
                    const target = linkSources[0];
                    if (target?.href) window.open(target.href, '_blank', 'noopener,noreferrer');
                });
                bindReloadButton();
                return;
            }

            body.innerHTML = providerMarkup
                + '<div class="jlc-trailer-inline-player" data-jlc-trailer-inline-player></div>'
                + (videoSources.length > 1
                    ? '<div class="jlc-resource-inline-actions jlc-trailer-source-list">'
                        + videoSources.map((source, index) => '<button type="button" class="jlc-trailer-source-button" data-jlc-trailer-index="' + index + '">' + escapeHtml(source.label) + '</button>').join('')
                        + '</div>'
                    : '')
                + actionsBase;

            const playerHost = body.querySelector('[data-jlc-trailer-inline-player]');
            const openButton = body.querySelector('[data-jlc-open-trailer]');
            const openBlank = body.querySelector('[data-jlc-open-trailer-blank]');
            let activeIndex = 0;

            const activateSource = (index) => {
                activeIndex = index;
                const activeSource = videoSources[index] || videoSources[0];
                mountTrailerPlayer(playerHost, activeSource, { mode: 'inline', autoplay: false, muted: true });
                body.querySelectorAll('[data-jlc-trailer-index]').forEach((button, buttonIndex) => {
                    button.classList.toggle('is-active', buttonIndex === index);
                });
                if (openBlank && activeSource) openBlank.href = activeSource.pageUrl || activeSource.href;
            };

            activateSource(0);

            openButton?.addEventListener('click', (event) => {
                swallowEvent(event, true);
                openTrailerOverlay(videoSources[activeIndex] || videoSources[0]);
            });

            body.querySelectorAll('[data-jlc-trailer-index]').forEach(button => {
                button.addEventListener('click', (event) => {
                    swallowEvent(event, true);
                    activateSource(Number(button.dataset.jlcTrailerIndex));
                });
            });

            bindReloadButton();
        };

        const loadTrailer = async () => {
            if (loadingTrailer) return;
            loadingTrailer = true;
            renderLoading();
            try {
                const result = await resolveTrailerSources(context, { includeMissAV: true });
                if (!isResourceCenterTokenAlive(token)) return;
                renderResolved(result);
            } finally {
                loadingTrailer = false;
            }
        };

        renderLoading();
        window.setTimeout(() => {
            if (!isResourceCenterTokenAlive(token)) return;
            void loadTrailer();
        }, 0);
    }

    function renderScreenshotSection(card, context, token) {
        const body = card.querySelector('.jlc-resource-body');
        const screenshotLinks = buildScreenshotSearchLinks(context.avid);
        const linkMap = new Map(screenshotLinks.map(item => [item.label, item.href]));
        const pendingStatuses = [
            { label: 'BlogJav', state: 'pending', note: '主源待查', href: linkMap.get('BlogJav') || '' },
            { label: 'JavStore', state: 'pending', note: '兜底待查', href: linkMap.get('JavStore') || '' }
        ];
        const loadScreenshots = async () => {
            body.innerHTML = makeResourceStatusMarkup(pendingStatuses) + '<div class="jlc-resource-loading">正在加载截图...</div>';
            let info = null;
            try {
                info = await fetchScreenshotResourceInfo(context.avid);
                if (!isResourceCenterTokenAlive(token)) return;
                const panel = await buildInlineScreenshotPanel(context);
                if (!isResourceCenterTokenAlive(token)) return;
                body.innerHTML = makeResourceStatusMarkup(info?.statuses || pendingStatuses);
                body.appendChild(panel);
            } catch (error) {
                if (!isResourceCenterTokenAlive(token)) return;
                body.innerHTML = makeResourceStatusMarkup(info?.statuses || pendingStatuses)
                    + '<div class="jlc-resource-empty">' + escapeHtml(error || info?.message || lang.getAvImg_none || '暂无截图') + '</div>';
            }
        };

        if (config.resource_screenshot_auto) {
            loadScreenshots();
            return;
        }
        body.innerHTML = makeResourceStatusMarkup(pendingStatuses)
            + '<div class="jlc-resource-note">沿用主脚本截图面板，优先 BlogJav，失败再回退 JavStore；默认手动加载避免拖慢首屏。</div>'
            + '<div class="jlc-resource-inline-actions"><button type="button" data-jlc-load-screenshot>加载截图</button></div>';
        body.querySelector('[data-jlc-load-screenshot]')?.addEventListener('click', loadScreenshots, { once: true });
    }

    function renderMagnetSection(card, context, token) {
        const body = card.querySelector('.jlc-resource-body');
        const titleNode = card.querySelector('h3');
        let titleBar = card.querySelector('.jlc-resource-card-titlebar');
        if (titleNode && !titleBar) {
            titleBar = document.createElement('div');
            titleBar.className = 'jlc-resource-card-titlebar';
            titleNode.parentNode.insertBefore(titleBar, titleNode);
            titleBar.appendChild(titleNode);
        }
        let titleTools = card.querySelector('.jlc-resource-card-tools');
        if (titleBar && !titleTools) {
            titleTools = document.createElement('div');
            titleTools.className = 'jlc-resource-card-tools';
            titleBar.appendChild(titleTools);
        }

        const pageMagnets = extractCurrentPageMagnets();
        const pendingStatuses = [
            { key: 'all', label: '全部', state: pageMagnets.length ? 'ok' : 'pending', note: pageMagnets.length ? `去重 ${pageMagnets.length} 条` : '准备搜索' },
            { key: 'page', label: '当前页', state: pageMagnets.length ? 'ok' : 'empty', note: pageMagnets.length ? `${pageMagnets.length} 条` : '无直出' },
            { key: 'sukebei', label: 'Sukebei', state: 'pending', note: '自动检测中', href: buildSukebeiSearchUrl(context.avid) },
            { key: 'torrentkitty', label: 'Torkitty', state: 'pending', note: '自动检测中', href: buildTorrentKittySearchUrl(context.avid) },
            { key: 'btsow', label: 'BTSOW', state: 'pending', note: '自动检测中', href: buildBtsowSearchUrl(context.avid) },
            { key: 'sehuatang', label: '色花堂', state: 'ok', note: '番号搜索', href: buildSehuatangSearchUrl(context.avid) }
        ];
        let supplementalInfo = { magnets: [], statuses: pendingStatuses.slice(2, 5), sources: [], message: '' };
        let loading = false;
        let searched = false;
        let activeProvider = 'all';
        let lastMessage = pageMagnets.length ? '' : '当前页暂无可直接抽取的磁力。';

        const getSourceMagnets = () => {
            const key = normalizeMagnetProviderKey(activeProvider);
            const sourceMap = new Map((supplementalInfo.sources || []).map(item => [normalizeMagnetProviderKey(item.key), item]));
            if (key === 'page') return pageMagnets;
            if (key === 'all') return uniqueMagnetEntries([...pageMagnets, ...((supplementalInfo.sources || []).flatMap(item => item.magnets || []))]);
            return sourceMap.get(key)?.magnets || [];
        };

        const buildStatuses = () => {
            const sourceMap = new Map((supplementalInfo.sources || []).map(item => [normalizeMagnetProviderKey(item.key), item]));
            const totalMagnets = uniqueMagnetEntries([...pageMagnets, ...((supplementalInfo.sources || []).flatMap(item => item.magnets || []))]);
            const list = [
                {
                    key: 'all',
                    label: '全部',
                    state: loading ? (totalMagnets.length ? 'ok' : 'pending') : (totalMagnets.length ? 'ok' : (searched ? 'empty' : (pageMagnets.length ? 'ok' : 'pending'))),
                    note: loading ? `去重 ${totalMagnets.length} 条 · 搜索中` : `去重 ${totalMagnets.length} 条`
                },
                { key: 'page', label: '当前页', state: pageMagnets.length ? 'ok' : 'empty', note: pageMagnets.length ? `${pageMagnets.length} 条` : '无直出' }
            ];
            ['sukebei', 'torrentkitty', 'btsow', 'sehuatang'].forEach(providerKey => {
                const source = sourceMap.get(providerKey);
                const fallback = pendingStatuses.find(item => item.key === providerKey) || { key: providerKey, label: providerKey.toUpperCase(), state: 'pending', note: '自动检测中' };
                const sourceMagnets = source?.magnets || [];
                const sourceNoteParts = [];
                if (sourceMagnets.length) sourceNoteParts.push(sourceMagnets.length + ' 条');
                if (source?.note && source.note !== '未命中' && source.note !== (sourceMagnets.length + ' 条')) sourceNoteParts.push(source.note);
                list.push({
                    key: providerKey,
                    label: source?.label || fallback.label,
                    state: source?.state || fallback.state,
                    note: sourceNoteParts.join(' · ') || source?.note || fallback.note,
                    href: source?.href || fallback.href
                });
            });
            return list.map(item => Object.assign({}, item, {
                count: normalizeMagnetProviderKey(item.key) === 'all' ? totalMagnets.length
                    : (normalizeMagnetProviderKey(item.key) === 'page' ? pageMagnets.length : (sourceMap.get(normalizeMagnetProviderKey(item.key))?.magnets || []).length),
                active: normalizeMagnetProviderKey(activeProvider) === normalizeMagnetProviderKey(item.key)
            }));
        };

        const renderTitleTools = () => {
            if (!titleTools) return;
            titleTools.innerHTML = '<button type="button" class="jlc-title-inline-button" data-jlc-load-magnet' + (loading ? ' disabled' : '') + '>' + (loading ? '刷新中...' : '刷新磁力') + '</button>';
            titleTools.querySelector('[data-jlc-load-magnet]')?.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
                void loadMagnets();
            }, { capture: true });
        };

        const render = () => {
            const magnets = getSourceMagnets();
            const statuses = buildStatuses();
            const totalCount = statuses.find(item => normalizeMagnetProviderKey(item.key) === 'all')?.count || 0;
            const summaryParts = [`去重聚合 ${totalCount} 条`, `当前页 ${pageMagnets.length} 条`];
            if (activeProvider !== 'all') {
                const activeStatus = statuses.find(item => normalizeMagnetProviderKey(item.key) === normalizeMagnetProviderKey(activeProvider));
                if (activeStatus?.label) summaryParts.push('筛选 ' + activeStatus.label);
            }
            let emptyText = lastMessage || '当前还没有可用磁力。';
            if (searched && activeProvider !== 'all' && !magnets.length) {
                const activeStatus = statuses.find(item => normalizeMagnetProviderKey(item.key) === normalizeMagnetProviderKey(activeProvider));
                emptyText = (activeStatus?.label || '当前来源') + ' 暂无磁力';
            }
            const contentMarkup = magnets.length ? makeMagnetListMarkup(magnets) : `<div class="jlc-resource-empty">${escapeHtml(emptyText)}</div>`;
            renderTitleTools();
            body.innerHTML = makeMagnetProviderStatusMarkup(statuses, activeProvider)
                + `<div class="jlc-resource-note">${escapeHtml(summaryParts.join(' · '))}</div>`
                + (loading ? '<div class="jlc-resource-loading">正在搜索 Sukebei / Torkitty / BTSOW...</div>' : '')
                + contentMarkup;
            body.querySelectorAll('[data-jlc-magnet-provider]').forEach(button => {
                const key = normalizeMagnetProviderKey(button.dataset.jlcMagnetProvider || 'all');
                const status = statuses.find(item => normalizeMagnetProviderKey(item.key) === key);
                button.dataset.jlcProviderCount = String(status?.count || 0);
                button.dataset.jlcProviderActive = status?.active ? '1' : '0';
            });
            bindMagnetProviderButtons(body, {
                onSwitch: (providerKey) => {
                    activeProvider = normalizeMagnetProviderKey(providerKey);
                    render();
                }
            });
            bindMagnetActionButtons(body, magnets);
        };

        const loadMagnets = async () => {
            if (loading) return;
            loading = true;
            render();
            const info = await fetchSupplementalMagnetInfo(context.avid);
            if (!isResourceCenterTokenAlive(token)) return;
            supplementalInfo = info || { magnets: [], statuses: [], sources: [], message: '' };
            lastMessage = info?.message || (pageMagnets.length ? '' : '未搜索到补充磁力');
            searched = true;
            loading = false;
            render();
        };

        render();
        window.setTimeout(() => {
            if (!isResourceCenterTokenAlive(token)) return;
            void loadMagnets();
        }, 0);
    }

        function renderDetailResourceCenter(force = false) {
        applyJavlibraryMenuTopStyle();
        const context = getCurrentDetailContext();
        if (context) {
            void decorateCurrentDetailPage(force);
            ensureDetailPageCopyButtons(context);
        } else {
            removeDetailPageCopyButtons();
        }
        if (!context || config.resource_center === false) {
            removeDetailResourceCenter();
            return;
        }
        if (force) {
            clearDetailResourceCaches(context.avid);
        }
        const releaseDate = extractDetailReleaseDate(context);
        syncDetailReleaseBadge(context, releaseDate);
        const container = ensureDetailResourceCenter(context);
        if (!container) return;
        const token = Date.now() + '-' + Math.random().toString(36).slice(2);
        container.dataset.renderToken = token;
        const subtitle = [context.siteLabel, context.avid, releaseDate ? ('发行 ' + releaseDate) : ''].filter(Boolean).join(' · ');
        const cards = [];
        if (config.resource_trailer !== false) {
            cards.push('<section class="jlc-resource-card" data-jlc-resource="trailer"><h3>预告片</h3><div class="jlc-resource-body"></div></section>');
        }
        if (config.resource_screenshot !== false) {
            cards.push('<section class="jlc-resource-card" data-jlc-resource="screenshot"><h3>截图</h3><div class="jlc-resource-body"></div></section>');
        }
        if (config.resource_magnet !== false) {
            cards.push('<section class="jlc-resource-card" data-jlc-resource="magnet"><h3>磁力</h3><div class="jlc-resource-body"></div></section>');
        }
        container.innerHTML = ''
            + '<div class="jlc-resource-header">'
            + '    <div>'
            + '        <div class="jlc-resource-title">JLC 资源中心</div>'
            + '        <div class="jlc-resource-subtitle">' + escapeHtml(subtitle) + (context.title ? (' · ' + escapeHtml(context.title)) : '') + '</div>'
            + '    </div>'
            + '    <div class="jlc-resource-header-actions">'
            + '        <button type="button" data-jlc-resource-refresh>刷新资源</button>'
            + '        <button type="button" data-jlc-resource-settings>资源设置</button>'
            + '    </div>'
            + '</div>'
            + '<div class="jlc-resource-grid">' + (cards.length ? cards.join('') : '<div class="jlc-resource-empty">当前没有启用任何资源模块。</div>') + '</div>';
        container.querySelector('[data-jlc-resource-refresh]')?.addEventListener('click', () => renderDetailResourceCenter(true));
        container.querySelector('[data-jlc-resource-settings]')?.addEventListener('click', () => openCommanderPanel('resource'));

        const trailerCard = container.querySelector('[data-jlc-resource="trailer"]');
        if (trailerCard) renderTrailerSection(trailerCard, context, token);
        const screenshotCard = container.querySelector('[data-jlc-resource="screenshot"]');
        if (screenshotCard) renderScreenshotSection(screenshotCard, context, token);
        const magnetCard = container.querySelector('[data-jlc-resource="magnet"]');
        if (magnetCard) renderMagnetSection(magnetCard, context, token);
    }



    let lazyLoad;
    let scroller;
    let myModal;//弹窗插件实例
    let currentWeb = "javbus";//网站域名标识，用于判断当前在什么网站
    let currentObj ;//当前网站对应的属性对象
    /**
     * 通用属性对象
     * domainReg：         域名正则式 用于判断当前在什么网站
     * excludePages：      排除的页面
     * halfImg_block_Pages 屏蔽竖图的页面
     * gridSelector        源网页的网格选择器
     * itemSelector        源网页的子元素选择器
     * widthSelector       源网页的宽度设置元素选择器
     * pageNext            源网页的下一页元素选择器
     * pageSelector        源网页的翻页元素选择器
     * getAvItem           解析源网页item的数据
     * init_Style          加载各网页的特殊css
     */
    let ConstCode = {
        javbus: {
            domainReg: /(javbus|busjav|busfan|fanbus|buscdn|cdnbus|dmmsee|seedmm|busdmm|dmmbus|javsee|seejav)\./i,
            excludePages: ['/actresses', 'mdl=favor&sort=1', 'mdl=favor&sort=2', 'mdl=favor&sort=3', 'mdl=favor&sort=4', 'searchstar'],
            halfImg_block_Pages:['/uncensored','javbus.one','mod=uc','javbus.red'],
            gridSelector: 'div#waterfall',
            itemSelector: 'div#waterfall div.item',
            widthSelector : '#grid-b',
            pageNext:'a#next',
            pageSelector:'.pagination',
            getAvItem: function (elem) {
                var photoDiv = elem.find("div.photo-frame")[0];
                var href = elem.find("a")[0].href;
                var img = $(photoDiv).children("img")[0];
                var src = img.src;
                if (src.match(/pics.dmm.co.jp/)) {
                    src = src.replace(/ps.jpg/, "pl.jpg");
                }else if(src.match(/image.mgstage.com/)){
                    src = src.replace(/pf_o1_|pb_p_/, "pb_e_");
                } else {
                    src = src.replace(/thumbs/, "cover").replace(/thumb/, "cover").replace(/.jpg/, "_b.jpg");
                }
                var title = img.title;
                var AVID = elem.find("date").eq(0).text();
                var date = elem.find("date").eq(1).text();
                var itemTag = "";elem.find("div.photo-info .btn").toArray().forEach( x=> itemTag+=x.outerHTML);
                return {AVID,href,src,title,date,itemTag};
            }
        },
        javdb: {
            domainReg: /(javdb)[0-9]*\./i,
            excludePages: ['/users/'],
            halfImg_block_Pages:['/uncensored','/western','/video_uncensored','/video_western'],
            gridSelector: 'div.movie-list.h',
            itemSelector: 'div.movie-list.h>div.item',
            widthSelector : '#grid-b',
            pageNext: 'a.pagination-next',
            pageSelector:'.pagination-list',
            init_Style: function(){
                GM_addStyle(`#grid-b .info-bottom-two{flex-grow:1}
                [data-theme=light] .pop-up-tag[name$='${AVINFO_SUFFIX}'] {background-color: rgb(255 255 255 / 90%);}
                [data-theme=dark] .scroll-request span{background:white;}
                [data-theme=dark] #grid-b .box-b a:link {color : inherit;}
                [data-theme=dark] #grid-b  .box-b{background-color:#222;}
                [data-theme=dark] .alert-zdy {color: black;background-color: rgb(255 255 255 / 90%);}
                #myModal #modal-div article.message {margin-bottom: 0}`);
            },
            maxWidth: 150,//javdb允许的最大宽度为150%，其他网站默认最大宽度为100%
            getAvItem: function (elem) {
                var href = elem.find("a")[0].href;
                var src = elem.find("div.cover>img").eq(0).attr("src");
                var title = elem.find("a")[0].title;
                var AVID = elem.find("div.video-title>strong").eq(0).text();
                var date = elem.find("div.meta").eq(0).text();
                var score = elem.find("div.score").html();
                var itemTag = elem.find(".tags.has-addons").html();
                return {AVID,href,src,title,date,itemTag,score};
            }
            //init: function(){ if(location.href.includes("/users/")){ this.widthSelector="div.section";} }
        },
        avmoo: {
            domainReg: /avmoo\./i,
            excludePages: ['/actresses'],
            gridSelector: 'div#waterfall',
            itemSelector: 'div#waterfall div.item',
            widthSelector : '#grid-b',
            pageNext: 'a[name="nextpage"]',
            pageSelector:'.pagination',
            getAvItem: function (elem) {
                var photoDiv = elem.find("div.photo-frame")[0];
                var href = elem.find("a")[0].href;
                var img = $(photoDiv).children("img")[0];
                var src = img.src.replace(/ps.jpg/, "pl.jpg");
                var title = img.title;
                var AVID = elem.find("date").eq(0).text();
                var date = elem.find("date").eq(1).text();
                var itemTag = "";elem.find("div.photo-info .btn").toArray().forEach( x=> itemTag+=x.outerHTML);
                return {AVID,href,src,title,date,itemTag};
            }
        },
        javlibrary: {
            domainReg: /javlibrary\./i,
            gridSelector: 'div.videothumblist',
            itemSelector: 'div.videos div.video',
            widthSelector : '#grid-b',
            pageNext: 'a.page.next',
            pageSelector:'.page_selector',
            getAvItem: function (elem) {
                var href = elem.find("a")[0].href;
                var src = elem.find("img")[0].src;
                if(src.indexOf("pixhost")<0){//排除含有pixhost的src，暂时未发现规律
                    src= src.replace(/ps.jpg/, "pl.jpg");
                }
                var title = elem.find("div.title").eq(0).text();
                var AVID = elem.find("div.id").eq(0).text();
                return {AVID,href,src,title,date: '',itemTag:''};
            },
            init_Style: function(){
                applyJavlibraryMenuTopStyle();
                GM_addStyle(`#grid-b div{box-sizing: border-box;}`);
            },
        }
    };

