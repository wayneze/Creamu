// @@creamu-part:51-resource-trailer
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
