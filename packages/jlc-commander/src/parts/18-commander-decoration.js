// @@creamu-part:18-commander-decoration
    const META_FETCH_CONCURRENCY = 8;
    const META_FETCH_RETRY_LIMIT = 1;
    const META_FETCH_RETRY_DELAY = 900;
    const META_IMMEDIATE_MARGIN_PX = 1200;
    const META_PREFETCH_MARGIN_PX = 1200;
    const META_IMMEDIATE_SWEEP_DELAY = 32;
    const META_DEFERRED_SWEEP_DELAY = 120;
    const META_DEFERRED_BATCH_SIZE = 16;
    const DECORATE_CONCURRENCY = 8;
    const DECORATE_VISIBLE_LIMIT = 12;
    const DECORATE_BATCH_MIN_SIZE = 8;
    const decorateQueue = [];
    const metaFetchQueue = [];
    const metaInflight = new Map();
    const metaQueuedTasks = new Map();
    const metaDeferredItems = new Set();
    const metaNearViewportItems = new Set();
    let decorateActiveCount = 0;
    let metaFetchActiveCount = 0;
    let metaViewportObserver = null;
    let metaDeferredSweepTimer = null;
    let metaDeferredSweepDueAt = 0;
    let metaSweepEventsBound = false;
    let rescanTimer = null;
    let rescanBudget = 0;
    const COMMANDER_RESCAN_INTERVAL = 700;

    function isPlaceholderCover(src, title = '') {
        const sample = `${String(src || '')} ${String(title || '')}`.toLowerCase();
        return /(now[\s_-]*printing|nowprint|no[\s_-]*image|nopic|placeholder|sample[\s_-]*soon|coming[\s_-]*soon)/i.test(sample);
    }

    function applyLoadedCoverStyle(img) {
        $(img).removeClass('minHeight-200 minHeight-96');
        if (img.classList.contains('jlc-placeholder-cover')) {
            img.style = 'width:auto;max-width:72%;max-height:120px;height:auto;margin:12px auto;object-fit:contain;';
            return;
        }
        imgCallback(img);
    }

    function scheduleCommanderRescan(rounds = 10) {
        rescanBudget = Math.max(rescanBudget, rounds);
        if (rescanTimer) return;
        rescanTimer = window.setInterval(() => {
            runCommanderScanner();
            rescanBudget -= 1;
            if (rescanBudget <= 0) {
                window.clearInterval(rescanTimer);
                rescanTimer = null;
            }
        }, COMMANDER_RESCAN_INTERVAL);
    }

    function collectCommanderItems(source) {
        if (!source) return [];
        if (Array.isArray(source)) return source.flatMap(collectCommanderItems);
        if (typeof source.jquery === 'string' && typeof source.toArray === 'function') {
            return source.toArray().flatMap(collectCommanderItems);
        }
        if (typeof source.length === 'number'
            && typeof source !== 'string'
            && !source.nodeType
            && typeof source.matches !== 'function'
            && typeof source.querySelectorAll !== 'function') {
            return Array.from(source).flatMap(collectCommanderItems);
        }
        const grid = typeof document !== 'undefined' && source === document
            ? document.getElementById('grid-b')
            : (source.id === 'grid-b' ? source : null);
        if (grid?.children) {
            return Array.from(grid.children).filter(item => item.matches?.('.item-b'));
        }
        if (typeof source.matches === 'function' && source.matches('.item-b')) return [source];
        if (typeof source.querySelectorAll === 'function') return Array.from(source.querySelectorAll('.item-b'));
        return [];
    }
    function isRectNearViewport(rect, viewportHeight, margin = META_PREFETCH_MARGIN_PX) {
        if (!rect) return true;
        return Number(rect.bottom) >= -margin && Number(rect.top) <= Number(viewportHeight || 0) + margin;
    }

    function isItemNearViewport(item, margin = META_PREFETCH_MARGIN_PX) {
        if (!item || typeof item.getBoundingClientRect !== 'function') return true;
        const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 900;
        return isRectNearViewport(item.getBoundingClientRect(), viewportHeight, margin);
    }

    function isItemImmediateViewport(item) {
        return isItemNearViewport(item, META_IMMEDIATE_MARGIN_PX);
    }

    function getRectViewportPriority(rect, viewportHeight) {
        if (!rect) return 0;
        const height = Number(viewportHeight) || 900;
        const top = Number(rect.top);
        const bottom = Number(rect.bottom);
        if (Number.isFinite(bottom) && bottom < 0) return height + Math.abs(bottom);
        if (Number.isFinite(top) && top > height) return top;
        return Number.isFinite(top) ? Math.max(0, top) : 0;
    }

    function getItemViewportPriority(item) {
        if (!item || typeof item.getBoundingClientRect !== 'function') return 0;
        const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 900;
        return getRectViewportPriority(item.getBoundingClientRect(), viewportHeight);
    }

    function sortMetaItemsByViewport(items) {
        return Array.from(items || [])
            .map((item, index) => ({ item, index, priority: getItemViewportPriority(item) }))
            .sort((left, right) => left.priority - right.priority || left.index - right.index)
            .map(entry => entry.item);
    }

    function clearDeferredMetaItem(item) {
        if (!item) return;
        metaDeferredItems.delete(item);
        metaNearViewportItems.delete(item);
        if (metaViewportObserver) metaViewportObserver.unobserve(item);
        delete item._jlcMetaPending;
    }

    function flushDeferredMetaItems(force = false) {
        metaDeferredSweepTimer = null;
        metaDeferredSweepDueAt = 0;
        const candidatePool = force || !metaViewportObserver
            ? metaDeferredItems
            : metaNearViewportItems;
        const candidates = sortMetaItemsByViewport(candidatePool);
        let processed = 0;
        for (const item of candidates) {
            if (!item?.isConnected) {
                clearDeferredMetaItem(item);
                continue;
            }
            const pending = item._jlcMetaPending;
            if (!pending) {
                clearDeferredMetaItem(item);
                continue;
            }
            if (!force && !isItemNearViewport(item)) {
                metaNearViewportItems.delete(item);
                continue;
            }
            if (!force && processed >= META_DEFERRED_BATCH_SIZE) break;
            clearDeferredMetaItem(item);
            requestMetaEnrichment(item, pending.avid, pending.title, isItemImmediateViewport(item));
            processed += 1;
        }
        if (!force && processed >= META_DEFERRED_BATCH_SIZE && metaDeferredItems.size) {
            scheduleDeferredMetaSweep(META_IMMEDIATE_SWEEP_DELAY);
        }
    }

    function scheduleDeferredMetaSweep(delay = META_DEFERRED_SWEEP_DELAY) {
        const wait = Math.max(0, Number(delay) || 0);
        const dueAt = Date.now() + wait;
        if (metaDeferredSweepTimer) {
            if (dueAt >= metaDeferredSweepDueAt) return;
            window.clearTimeout(metaDeferredSweepTimer);
        }
        metaDeferredSweepDueAt = dueAt;
        metaDeferredSweepTimer = window.setTimeout(() => flushDeferredMetaItems(false), wait);
    }

    function ensureMetaViewportObserver() {
        if (metaViewportObserver || !('IntersectionObserver' in window)) return;
        metaViewportObserver = new IntersectionObserver(entries => {
            let touched = false;
            entries.forEach(entry => {
                if (!entry?.target) return;
                const near = entry.isIntersecting || entry.intersectionRatio > 0;
                if (near) {
                    metaNearViewportItems.add(entry.target);
                    touched = true;
                } else {
                    metaNearViewportItems.delete(entry.target);
                }
            });
            if (touched) scheduleDeferredMetaSweep(META_IMMEDIATE_SWEEP_DELAY);
        }, {
            root: null,
            rootMargin: `${META_PREFETCH_MARGIN_PX}px 0px ${META_PREFETCH_MARGIN_PX}px 0px`,
            threshold: 0.01
        });
    }

    function bindMetaSweepEvents() {
        if (metaSweepEventsBound) return;
        metaSweepEventsBound = true;
        const trigger = () => scheduleDeferredMetaSweep();
        window.addEventListener('scroll', trigger, { passive: true });
        window.addEventListener('resize', trigger, { passive: true });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) scheduleDeferredMetaSweep(60);
        });
    }

    function scheduleMetaEnrichment(item, avid, title) {
        if (!item || !item.isConnected || !config.metatube_url) return;
        item.dataset.jlcMetaState = 'deferred';
        item._jlcMetaPending = { avid, title };
        metaDeferredItems.add(item);
        ensureMetaViewportObserver();
        bindMetaSweepEvents();
        if (metaViewportObserver) metaViewportObserver.observe(item);
        const delay = metaViewportObserver
            ? META_DEFERRED_SWEEP_DELAY
            : (isItemImmediateViewport(item) ? META_IMMEDIATE_SWEEP_DELAY : META_DEFERRED_SWEEP_DELAY);
        scheduleDeferredMetaSweep(delay);
    }

    function refreshCommanderDecorations(scope = document, options = {}) {
        if (options.clearMetaMisses) clearMetaMissCache();
        const items = collectCommanderItems(scope);
        items.forEach(item => {
            item.classList.remove('jlc-final-done');
            clearDeferredMetaItem(item);
            delete item.dataset.jlcQueued;
            delete item.dataset.jlcBaseDone;
            delete item.dataset.jlcMetaState;
            delete item.dataset.jlcMetaRetry;
            delete item._jlcDecorModel;
        });
        queueCommanderItems(items, true);
        if (items.length && options.scheduleRescan !== false) scheduleCommanderRescan(8);
        if (options.syncTracking !== false) scheduleTrackingPageRefresh(false);
    }
    function enqueueStablePriority(queue, item, prioritized, isPrioritized) {
        if (!prioritized) {
            queue.push(item);
            return;
        }
        const index = queue.findIndex(entry => !isPrioritized(entry));
        if (index < 0) queue.push(item);
        else queue.splice(index, 0, item);
    }

    function prioritizeMetaTask(key) {
        const task = metaQueuedTasks.get(key);
        if (!task) return;
        const index = metaFetchQueue.indexOf(task);
        if (index >= 0) {
            metaFetchQueue.splice(index, 1);
            task.prioritized = true;
            enqueueStablePriority(metaFetchQueue, task, true, entry => entry.prioritized);
        }
    }

    function pumpMetaFetchQueue() {
        while (metaFetchActiveCount < META_FETCH_CONCURRENCY && metaFetchQueue.length) {
            const task = metaFetchQueue.shift();
            if (!task) continue;
            metaQueuedTasks.delete(task.key);
            metaFetchActiveCount += 1;
            Promise.resolve().then(async () => {
                const cached = normalizeMetaRecord(await getVal('meta_cache', task.avid));
                if (cached?.genres?.length) return cached;
                const fresh = normalizeMetaRecord(await fetchMeta(task.avid, cached, task.base));
                if (fresh) {
                    await setVal('meta_cache', { avid: task.avid, ...fresh });
                    return fresh;
                }
                return cached;
            }).catch(err => {
                console.warn('[Commander] MetaTube 获取失败', task.avid, err);
                return null;
            }).then(task.resolve).finally(() => {
                metaFetchActiveCount -= 1;
                pumpMetaFetchQueue();
            });
        }
    }

    function hasMetaEnrichmentData(value) {
        const meta = normalizeMetaRecord(value);
        return !!(meta && (meta.genres?.length || meta.actors?.length || meta.releaseDate));
    }

    function queueMetaFetch(avid, prioritize = false) {
        const base = normalizeMetaBase(config.metatube_url);
        const key = getMetaFetchKey(avid, base);
        if (!key) return Promise.resolve(null);
        if (metaInflight.has(key)) {
            if (prioritize) prioritizeMetaTask(key);
            return metaInflight.get(key);
        }
        if (hasRecentMetaMiss(key)) return Promise.resolve(null);
        const promise = new Promise(resolve => {
            const task = { key, base, avid, resolve, prioritized: !!prioritize };
            enqueueStablePriority(metaFetchQueue, task, prioritize, entry => entry.prioritized);
            metaQueuedTasks.set(key, task);
            pumpMetaFetchQueue();
        }).then(result => {
            if (hasMetaEnrichmentData(result)) clearMetaMiss(key);
            else rememberMetaMiss(key);
            return result;
        }).finally(() => {
            metaInflight.delete(key);
            metaQueuedTasks.delete(key);
        });
        metaInflight.set(key, promise);
        return promise;
    }
    function setItemReleaseDate(item, dateText) {
        const anchor = item.querySelector('.avid-link-b') || item.querySelector('.info-bottom-one a');
        if (!anchor) return;
        let badge = anchor.querySelector('.avid-date-badge');
        const value = normalizeReleaseDate(dateText);
        if (!value) {
            if (badge && !badge.textContent?.trim()) badge.remove();
            return;
        }
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'avid-date-badge';
            anchor.appendChild(badge);
        }
        badge.textContent = value;
        badge.title = value;
    }

    function getOrCreateBadgeContainer(item) {
        let badgeBox = item.querySelector('.jlc-badge-container');
        if (!badgeBox) {
            badgeBox = document.createElement('div');
            badgeBox.className = 'jlc-badge-container';
            item.appendChild(badgeBox);
        }
        return badgeBox;
    }

    function updateItemStateClasses(item, current, inEmby) {
        item.classList.toggle('visited-item', !!current.clicked);
        item.classList.toggle('liked-item', current.status === 'like');
        item.classList.toggle('hated-item', current.status === 'hate');
        item.classList.toggle('emby-item', !!inEmby);
    }

    function ensureCommanderToolbar(item, current) {
        const toolbar = item.querySelector('.toolbar-b');
        if (!toolbar) return;

        let likeBtn = toolbar.querySelector('.jlc-tool-btn.j-l');
        let hateBtn = toolbar.querySelector('.jlc-tool-btn.j-h');
        let bookmarkBtn = toolbar.querySelector('.jlc-tool-btn.j-bm');
        if (!likeBtn) {
            likeBtn = document.createElement('span');
            likeBtn.className = 'jlc-tool-btn j-l';
            likeBtn.title = '心动 / 取消心动';
            likeBtn.textContent = '👍';
            likeBtn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                current.status = current.status === 'like' ? 'none' : 'like';
                await setVal('videos', current);
                updateItemStateClasses(item, current, item.classList.contains('emby-item'));
                ensureCommanderToolbar(item, current);
                renderCommanderBadges(item, item._jlcDecorModel || { matchedRadar: '', orderedTags: [] });
            };
            toolbar.appendChild(likeBtn);
        }
        if (!hateBtn) {
            hateBtn = document.createElement('span');
            hateBtn.className = 'jlc-tool-btn j-h';
            hateBtn.title = '屏蔽 / 取消屏蔽';
            hateBtn.textContent = '👎';
            hateBtn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                current.status = current.status === 'hate' ? 'none' : 'hate';
                await setVal('videos', current);
                updateItemStateClasses(item, current, item.classList.contains('emby-item'));
                ensureCommanderToolbar(item, current);
            };
            toolbar.appendChild(hateBtn);
        }
        if (!bookmarkBtn) {
            bookmarkBtn = document.createElement('span');
            bookmarkBtn.className = 'jlc-tool-btn j-bm';
            bookmarkBtn.title = '把这部设为追更断点';
            bookmarkBtn.textContent = '🔖';
            bookmarkBtn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await setTrackingBreakpointByItem(item);
            };
            toolbar.appendChild(bookmarkBtn);
        }
        const activeBookmark = normalizeCode(trackingPageState.record?.last_seen_avid || '') === normalizeCode(item.dataset.jlcAvid || '');
        likeBtn.classList.toggle('active-like', current.status === 'like');
        hateBtn.classList.toggle('active-hate', current.status === 'hate');
        bookmarkBtn.classList.toggle('active-bookmark', !!activeBookmark);
    }

    function markItemVisited(item, current) {
        if (current.clicked) {
            item.classList.add('visited-item');
            return;
        }
        current.clicked = true;
        item.classList.add('visited-item');
        item._jlcCurrentVideo = current;
        setVal('videos', current);
    }

    function markItemVisitedByItem(item) {
        if (!item) return;
        const avid = item.dataset.jlcAvid || item.querySelector('date[name="avid"]')?.innerText.trim().toUpperCase();
        if (!avid) return;
        const current = item._jlcCurrentVideo || { avid, clicked: false, status: 'none' };
        item._jlcCurrentVideo = current;
        item.dataset.jlcAvid = avid;
        markItemVisited(item, current);
    }

    function ensureVisitedBinding(item, current) {
        if (current.clicked) item.classList.add('visited-item');
        if (item.dataset.jlcVisitedBound === '1') return;
        item.dataset.jlcVisitedBound = '1';
        const mark = () => markItemVisited(item, current);
        item.querySelectorAll('a[href]').forEach(a => {
            a.addEventListener('pointerdown', mark, { passive: true });
            a.addEventListener('auxclick', mark, { passive: true });
            a.addEventListener('click', mark);
            a.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') mark();
            });
        });
    }

    function pushDecorTag(target, seen, text, hot) {
        const cleaned = String(text || '').trim();
        const key = normalizeTagText(cleaned);
        if (!cleaned || !key || seen.has(key)) return;
        seen.add(key);
        target.push({ text: cleaned, hot: !!hot });
    }

    function buildCommanderDecorationModel(title, meta) {
        const safeTitle = String(title || '');
        const seen = new Set();
        const hotTags = [];
        const coldTags = [];
        const titleHotKeywords = (config.fav_tags || []).filter(tag => tagMatches(safeTitle, tag));
        let matchedRadar = Array.from(knownPersons).find(name => name && safeTitle.includes(name)) || '';

        if (meta) {
            asTextList(meta.actors).forEach(actor => {
                const name = String(actor || '').trim();
                if (!matchedRadar && knownPersons.has(name)) matchedRadar = name;
            });

            let hotMetaCount = 0;
            asTextList(meta.genres).forEach(genre => {
                const isHot = (config.fav_tags || []).some(tag => tagMatches(genre, tag));
                if (isHot) {
                    hotMetaCount += 1;
                    pushDecorTag(hotTags, seen, genre, true);
                } else {
                    pushDecorTag(coldTags, seen, genre, false);
                }
            });

            if (hotMetaCount === 0) {
                titleHotKeywords.forEach(tag => pushDecorTag(hotTags, seen, tag, true));
            }
        } else {
            titleHotKeywords.forEach(tag => pushDecorTag(hotTags, seen, tag, true));
        }

        return {
            matchedRadar,
            orderedTags: hotTags.concat(coldTags)
        };
    }

    function fillCommanderBadgeContainer(badgeBox, model) {
        if (!badgeBox) return;
        const safeModel = model || { matchedRadar: '', orderedTags: [] };
        const orderedTags = Array.isArray(safeModel.orderedTags) ? safeModel.orderedTags : [];
        badgeBox.innerHTML = '';

        if (safeModel.matchedRadar) {
            const badge = document.createElement('span');
            badge.className = 'jlc-badge b-person';
            badge.innerText = `👤 熟人: ${safeModel.matchedRadar}`;
            badgeBox.appendChild(badge);
        }

        if (orderedTags.length) {
            const overlay = document.createElement('div');
            overlay.className = 'meta-overlay-box';
            const visibleTags = orderedTags.slice(0, DECORATE_VISIBLE_LIMIT);
            visibleTags.forEach(tag => {
                const span = document.createElement('span');
                span.className = `meta-tag ${tag.hot ? 'hot' : ''}`.trim();
                span.innerText = tag.text;
                span.title = tag.text;
                overlay.appendChild(span);
            });
            if (orderedTags.length > visibleTags.length) {
                const more = document.createElement('span');
                more.className = 'meta-tag more';
                more.innerText = `+${orderedTags.length - visibleTags.length}`;
                more.title = orderedTags.slice(visibleTags.length).map(x => x.text).join(' / ');
                overlay.appendChild(more);
            }
            badgeBox.appendChild(overlay);
        }
    }

    function renderCommanderBadges(item, model) {
        item._jlcDecorModel = model;
        const badgeBox = getOrCreateBadgeContainer(item);
        fillCommanderBadgeContainer(badgeBox, model);
    }

    function getDetailCoverDecorationMount(context = getCurrentDetailContext()) {
        if (!context) return null;
        const site = String(context.site || '').toLowerCase();
        if (site === 'javlibrary') {
            return document.querySelector('#video_jacket')
                || document.querySelector('#video_jacket_img')?.closest('a')
                || document.querySelector('#video_jacket_img')?.parentElement
                || null;
        }
        if (site === 'javbus') {
            return document.querySelector('.bigImage')
                || document.querySelector('.screencap')
                || document.querySelector('.sample-box')
                || null;
        }
        if (site === 'javdb') {
            return document.querySelector('.column-video-cover')
                || document.querySelector('.video-cover')
                || document.querySelector('.tile-images.preview-images')
                || null;
        }
        return null;
    }

    function ensureDetailBadgeContainer(context = getCurrentDetailContext()) {
        const mount = getDetailCoverDecorationMount(context);
        if (!mount) return null;
        mount.classList.add('jlc-detail-cover-host');
        let badgeBox = mount.querySelector(':scope > .jlc-badge-container.jlc-detail-badge-container');
        if (!badgeBox) {
            badgeBox = document.createElement('div');
            badgeBox.className = 'jlc-badge-container jlc-detail-badge-container';
            mount.appendChild(badgeBox);
        }
        return badgeBox;
    }

    function renderDetailCommanderBadges(context, model) {
        const badgeBox = ensureDetailBadgeContainer(context);
        if (!badgeBox) return;
        fillCommanderBadgeContainer(badgeBox, model);
    }

    async function decorateCurrentDetailPage(prioritize = true) {
        const context = getCurrentDetailContext();
        if (!context?.avid) return null;
        const cachedMeta = normalizeMetaRecord(await getVal('meta_cache', context.avid));
        syncDetailReleaseBadge(context, cachedMeta?.releaseDate || '');
        renderDetailCommanderBadges(context, buildCommanderDecorationModel(context.title, cachedMeta));
        if (!config.metatube_url) return cachedMeta;
        if (cachedMeta?.genres?.length) return cachedMeta;
        const freshMeta = normalizeMetaRecord(await queueMetaFetch(context.avid, prioritize));
        const latestContext = getCurrentDetailContext();
        if (!freshMeta || normalizeResourceAvid(latestContext?.avid || '') !== normalizeResourceAvid(context.avid)) {
            return freshMeta || cachedMeta;
        }
        syncDetailReleaseBadge(latestContext, freshMeta.releaseDate || '');
        renderDetailCommanderBadges(latestContext, buildCommanderDecorationModel(latestContext.title || context.title, freshMeta));
        return freshMeta;
    }

    function requestMetaEnrichment(item, avid, title, prioritize = false) {
        if (!item || !item.isConnected || !config.metatube_url || item.dataset.jlcMetaState === 'pending') return;
        clearDeferredMetaItem(item);
        const currentRetry = Number(item.dataset.jlcMetaRetry || '0');
        item.dataset.jlcMetaState = 'pending';
        queueMetaFetch(avid, prioritize).then(freshMeta => {
            if (!item.isConnected) return;
            if (freshMeta) {
                setItemReleaseDate(item, freshMeta.releaseDate);
                renderCommanderBadges(item, buildCommanderDecorationModel(title, freshMeta));
                item.dataset.jlcMetaState = 'done';
                delete item.dataset.jlcMetaRetry;
                item.classList.add('jlc-final-done');
                return;
            }

            const nextRetry = currentRetry + 1;
            item.dataset.jlcMetaRetry = String(nextRetry);
            if (nextRetry >= META_FETCH_RETRY_LIMIT) {
                item.dataset.jlcMetaState = 'miss';
                item.classList.add('jlc-final-done');
                return;
            }

            item.dataset.jlcMetaState = 'retry';
            window.setTimeout(() => {
                if (!item.isConnected) return;
                item.classList.remove('jlc-final-done');
                delete item.dataset.jlcQueued;
                scheduleCommanderRescan(2);
            }, META_FETCH_RETRY_DELAY * nextRetry);
        });
    }

    function getCommanderItemAvid(item) {
        return String(
            item?.dataset?.jlcAvid
            || item?.querySelector?.('date[name="avid"]')?.textContent
            || ''
        ).trim().toUpperCase();
    }

    async function loadCommanderDecorationBatch(avids) {
        const normalizedAvids = Array.from(new Set(
            Array.from(avids || []).map(avid => String(avid || '').trim().toUpperCase()).filter(Boolean)
        ));
        const [videos, embyData, metaCache] = await Promise.all([
            getManyFromStore('videos', normalizedAvids),
            getManyFromStore('emby_data', normalizedAvids.map(avid => `vid_${avid}`)),
            getManyFromStore('meta_cache', normalizedAvids)
        ]);
        return { videos, embyData, metaCache };
    }

    async function decorate(item) {
        if (!item || !item.isConnected || item.classList.contains('jlc-final-done')) return;
        const preparedAvid = item._jlcDecorAvid;
        const batchPromise = item._jlcDecorBatchPromise;
        delete item._jlcDecorAvid;
        delete item._jlcDecorBatchPromise;
        const avid = preparedAvid || getCommanderItemAvid(item);
        if (!avid) return;

        let vidData;
        let inEmby;
        let cachedMeta;
        if (batchPromise) {
            const batch = await batchPromise;
            vidData = batch.videos.get(avid) || null;
            inEmby = batch.embyData.get(`vid_${avid}`) || null;
            cachedMeta = batch.metaCache.get(avid) || null;
        } else {
            [vidData, inEmby, cachedMeta] = await Promise.all([
                getVal('videos', avid),
                getVal('emby_data', `vid_${avid}`),
                getVal('meta_cache', avid)
            ]);
        }

        const current = vidData || { avid, clicked: false, status: 'none' };
        const title = item.querySelector("a[name='av-title']")?.getAttribute('title') || item.querySelector('.detail-b a')?.getAttribute('title') || '';
        const normalizedMeta = normalizeMetaRecord(cachedMeta);

        item._jlcCurrentVideo = current;
        item.dataset.jlcAvid = avid;
        item.dataset.jlcTitle = title;
        updateItemStateClasses(item, current, inEmby);
        ensureCommanderToolbar(item, current);
        ensureVisitedBinding(item, current);
        setItemReleaseDate(item, normalizedMeta?.releaseDate);
        renderCommanderBadges(item, buildCommanderDecorationModel(title, normalizedMeta));
        item.dataset.jlcBaseDone = '1';
        item.classList.add('jlc-final-done');

        if (!config.metatube_url) {
            item.dataset.jlcMetaState = 'disabled';
            return;
        }

        if (normalizedMeta?.genres?.length) {
            item.dataset.jlcMetaState = 'done';
            delete item.dataset.jlcMetaRetry;
            return;
        }
        scheduleMetaEnrichment(item, avid, title);
    }

    function queueDecorateItem(item, prioritize = false) {
        if (!item || !item.isConnected || item.dataset.jlcQueued === '1' || item.classList.contains('jlc-final-done')) return;
        item.dataset.jlcQueued = '1';
        item._jlcDecorPrioritized = prioritize === true;
        enqueueStablePriority(decorateQueue, item, prioritize, entry => entry._jlcDecorPrioritized === true);
        pumpDecorateQueue();
    }

    function queueCommanderItems(items, prioritize = false) {
        const entries = Array.from(items || [])
            .filter(item => item?.isConnected
                && item.dataset?.jlcQueued !== '1'
                && !item.classList?.contains('jlc-final-done'))
            .map(item => ({ item, avid: getCommanderItemAvid(item) }));
        const avids = entries.map(entry => entry.avid).filter(Boolean);
        const batchPromise = avids.length >= DECORATE_BATCH_MIN_SIZE
            ? loadCommanderDecorationBatch(avids)
            : null;
        entries.forEach(entry => {
            if (entry.avid) entry.item._jlcDecorAvid = entry.avid;
            if (entry.avid && batchPromise) entry.item._jlcDecorBatchPromise = batchPromise;
            queueDecorateItem(entry.item, prioritize);
        });
        return entries.length;
    }

    function pumpDecorateQueue() {
        while (decorateActiveCount < DECORATE_CONCURRENCY && decorateQueue.length) {
            const item = decorateQueue.shift();
            if (!item) continue;
            delete item._jlcDecorPrioritized;
            if (!item.isConnected) continue;
            decorateActiveCount += 1;
            Promise.resolve().then(() => decorate(item)).catch(err => {
                console.warn('[Commander] decorate failed', err);
            }).finally(() => {
                decorateActiveCount -= 1;
                delete item.dataset.jlcQueued;
                pumpDecorateQueue();
            });
        }
    }

    function runCommanderScanner(root = document, prioritize = false) {
        const items = collectCommanderItems(root);
        const queuedCount = queueCommanderItems(items, prioritize);
        if (queuedCount) scheduleTrackingPageRefresh(false);
        return queuedCount;
    }
