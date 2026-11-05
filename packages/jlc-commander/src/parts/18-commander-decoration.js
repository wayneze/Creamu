// @@creamu-part:18-commander-decoration
    const META_FETCH_CONCURRENCY = 8;
    const META_FETCH_RETRY_LIMIT = 1;
    const META_FETCH_RETRY_DELAY = 900;
    const META_CACHE_WRITE_DELAY = 200;
    const META_CACHE_WRITE_BATCH_SIZE = 24;
    const META_CACHE_WRITE_RETRY_DELAY = 1000;
    const META_CACHE_WRITE_RETRY_LIMIT = 3;
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
    const metaCacheWriteBuffer = new Map();
    let metaCacheWriteTimer = null;
    let metaCacheWriteActive = null;
    let metaCacheWriteRetryCount = 0;
    let rescanTimer = null;
    let rescanBudget = 0;
    const COMMANDER_RESCAN_INTERVAL = 700;

    function scheduleMetaCacheWriteFlush(delay = META_CACHE_WRITE_DELAY) {
        if (metaCacheWriteActive || metaCacheWriteTimer || !metaCacheWriteBuffer.size) return;
        metaCacheWriteTimer = window.setTimeout(() => {
            metaCacheWriteTimer = null;
            void flushMetaCacheWrites();
        }, Math.max(0, Number(delay) || 0));
    }

    function flushMetaCacheWrites() {
        if (metaCacheWriteTimer) {
            window.clearTimeout(metaCacheWriteTimer);
            metaCacheWriteTimer = null;
        }
        if (metaCacheWriteActive) return metaCacheWriteActive;
        if (!metaCacheWriteBuffer.size) return Promise.resolve();

        const entries = Array.from(metaCacheWriteBuffer.entries());
        let writeSucceeded = false;
        metaCacheWriteActive = Promise.resolve(
            setManyVals('meta_cache', entries.map(([, value]) => value))
        ).then(written => {
            writeSucceeded = written === true;
            if (!writeSucceeded) return false;
            entries.forEach(([avid, value]) => {
                if (metaCacheWriteBuffer.get(avid) === value) metaCacheWriteBuffer.delete(avid);
            });
            metaCacheWriteRetryCount = 0;
            return true;
        }).catch(error => {
            console.warn('[Commander] 元数据缓存写入失败', error);
            return false;
        }).finally(() => {
            if (!writeSucceeded) metaCacheWriteRetryCount += 1;
            metaCacheWriteActive = null;
            if (!metaCacheWriteBuffer.size || !db) return;
            if (writeSucceeded) {
                scheduleMetaCacheWriteFlush();
            } else if (metaCacheWriteRetryCount <= META_CACHE_WRITE_RETRY_LIMIT) {
                scheduleMetaCacheWriteFlush(META_CACHE_WRITE_RETRY_DELAY * metaCacheWriteRetryCount);
            }
        });
        return metaCacheWriteActive;
    }

    function queueMetaCacheWrite(record) {
        const avid = normalizeCode(record?.avid || '');
        if (!avid) return;
        metaCacheWriteBuffer.set(avid, { ...record, avid });
        if (!metaCacheWriteActive) metaCacheWriteRetryCount = 0;
        if (metaCacheWriteBuffer.size >= META_CACHE_WRITE_BATCH_SIZE) {
            void flushMetaCacheWrites();
        } else {
            scheduleMetaCacheWriteFlush();
        }
    }

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
            requestMetaEnrichment(
                item,
                pending.avid,
                pending.title,
                isItemImmediateViewport(item),
                pending.cachedMeta
            );
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
            if (document.hidden) void flushMetaCacheWrites();
            else scheduleDeferredMetaSweep(60);
        });
        window.addEventListener('pagehide', () => void flushMetaCacheWrites());
    }

    function scheduleMetaEnrichment(item, avid, title, cachedMeta) {
        if (!item || !item.isConnected || !config.metatube_url) return;
        item.dataset.jlcMetaState = 'deferred';
        item._jlcMetaPending = { avid, title, cachedMeta };
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
                const queued = normalizeMetaRecord(metaCacheWriteBuffer.get(normalizeCode(task.avid)));
                const cached = queued || (task.cachedMeta === undefined
                    ? normalizeMetaRecord(await getVal('meta_cache', task.avid))
                    : normalizeMetaRecord(task.cachedMeta));
                if (cached?.genres?.length) return cached;
                const fresh = normalizeMetaRecord(await fetchMeta(task.avid, cached, task.base));
                if (fresh) {
                    queueMetaCacheWrite({ avid: task.avid, ...fresh });
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

    function queueMetaFetch(avid, prioritize = false, cachedMeta) {
        const base = normalizeMetaBase(config.metatube_url);
        const key = getMetaFetchKey(avid, base);
        if (!key) return Promise.resolve(null);
        if (metaInflight.has(key)) {
            if (prioritize) prioritizeMetaTask(key);
            return metaInflight.get(key);
        }
        if (hasRecentMetaMiss(key)) return Promise.resolve(null);
        const promise = new Promise(resolve => {
            const task = { key, base, avid, cachedMeta, resolve, prioritized: !!prioritize };
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
            item.querySelector('.cover-b').appendChild(badgeBox);
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
        const menu = toolbar?.querySelector('.jlc-card-menu');
        if (!menu) return;
        toolbar.querySelector('summary').textContent = current.status === 'like'
            ? '已心动 · 更多' : current.status === 'hate' ? '已屏蔽 · 更多' : '更多';

        for (const [status, label, className] of [['hate', '屏蔽', 'j-h'], ['like', '心动', 'j-l']]) {
            let button = menu.querySelector('.' + className);
            if (!button) {
                button = document.createElement('button');
                button.type = 'button';
                button.className = 'jlc-tool-btn ' + className;
                button.onclick = async (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const next = { ...current, status: current.status === status ? 'none' : status };
                    const statusButtons = [...menu.querySelectorAll('.jlc-tool-btn')];
                    statusButtons.forEach(control => { control.disabled = true; });
                    try {
                        if (!await setVal('videos', next)) {
                            showAlert('保存标记失败，请重试。');
                            return;
                        }
                        Object.assign(current, next);
                        updateItemStateClasses(item, current, item.classList.contains('emby-item'));
                        ensureCommanderToolbar(item, current);
                    } finally {
                        statusButtons.forEach(control => { control.disabled = false; });
                    }
                };
                menu.prepend(button);
            }
            const active = current.status === status;
            button.classList.toggle('active-' + status, active);
            button.setAttribute('aria-pressed', String(active));
            button.textContent = active ? '取消' + label : label;
            button.title = button.textContent;
        }
        let bookmarkBtn = toolbar.querySelector('.jlc-tool-btn.j-bm');
        if (!bookmarkBtn) {
            bookmarkBtn = document.createElement('button');
            bookmarkBtn.type = 'button';
            bookmarkBtn.className = 'jlc-tool-btn j-bm';
            bookmarkBtn.title = '把这部设为追更断点';
            bookmarkBtn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await setTrackingBreakpointByItem(item);
            };
            toolbar.prepend(bookmarkBtn);
        }
        refreshTrackingToolbarButtons([item]);
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
        const favoriteTags = uniqueTextList(config.fav_tags || []);
        const genres = asTextList(meta?.genres);
        const matchedPreferenceTags = favoriteTags.filter(tag => (
            tagMatches(safeTitle, tag) || genres.some(genre => tagMatches(genre, tag))
        ));
        const titleHotKeywords = favoriteTags.filter(tag => tagMatches(safeTitle, tag));
        let matchedRadar = Array.from(knownPersons).find(name => name && safeTitle.includes(name)) || '';

        if (meta) {
            asTextList(meta.actors).forEach(actor => {
                const name = String(actor || '').trim();
                if (!matchedRadar && knownPersons.has(name)) matchedRadar = name;
            });

            let hotMetaCount = 0;
            genres.forEach(genre => {
                const isHot = favoriteTags.some(tag => tagMatches(genre, tag));
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
            source: { title: safeTitle, meta },
            matchedRadar,
            matchedPreferenceTags,
            preferenceMatchCount: matchedPreferenceTags.length + (matchedRadar ? 1 : 0),
            orderedTags: hotTags.concat(coldTags)
        };
    }

    function setFavoriteTags(tags) {
        const next = loadConfig();
        const favorites = uniqueTextList(asTextList(tags));
        if (JSON.stringify(next.fav_tags) !== JSON.stringify(favorites)) {
            next.fav_tags = favorites;
            try {
                GM_setValue('jlc_config_stable', next);
            } catch (_) {
                showAlert('心动标签保存失败，请重试。');
                return false;
            }
            config = next;
            try { ensureCreamuSync()?.markLocalDirty(); } catch (_) {}
            document.querySelectorAll('.jlc-badge-container').forEach(box => {
                const source = box._jlcDecorModel?.source;
                if (!source) return;
                const model = buildCommanderDecorationModel(source.title, source.meta);
                const item = box.closest('.item-b');
                if (item) renderCommanderBadges(item, model);
                else fillCommanderBadgeContainer(box, model);
            });
        }
        const input = document.getElementById('jlc-wb-i-fav');
        if (input) input.value = favorites.join(', ');
        return true;
    }

    function setMetaTagHidden(text, hidden) {
        const key = normalizeTagText(text);
        if (!key) return false;
        const next = loadConfig();
        const tags = uniqueTextList(next.hidden_meta_tags);
        next.hidden_meta_tags = hidden
            ? uniqueTextList([...tags, text])
            : tags.filter(tag => normalizeTagText(tag) !== key);
        try {
            GM_setValue('jlc_config_stable', next);
        } catch (_) {
            showAlert('标签显示设置保存失败，请重试。');
            return false;
        }
        config = next;
        try { ensureCreamuSync()?.markLocalDirty(); } catch (_) {}
        document.querySelectorAll('.jlc-badge-container').forEach(box => {
            if (box._jlcDecorModel) fillCommanderBadgeContainer(box, box._jlcDecorModel);
        });
        renderWorkbenchHiddenMetaTags();
        return true;
    }

    function openMetaTagMenu(trigger, text) {
        let menu = document.getElementById('jlc-meta-tag-menu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'jlc-meta-tag-menu';
            menu.setAttribute('popover', 'auto');
            menu.setAttribute('role', 'dialog');
            const favorite = document.createElement('button');
            favorite.type = 'button';
            favorite.dataset.action = 'favorite';
            const hide = document.createElement('button');
            hide.type = 'button';
            hide.dataset.action = 'hide';
            hide.textContent = '在所有影片中隐藏此标签';
            menu.append(favorite, hide);
            document.body.append(menu);
        }
        if (menu.matches(':popover-open')) menu.hidePopover();
        menu.setAttribute('aria-label', '标签操作：' + text);
        const favorite = menu.querySelector('[data-action="favorite"]');
        const alreadyFavorite = uniqueTextList(config.fav_tags).some(tag => normalizeTagText(tag) === normalizeTagText(text));
        favorite.textContent = alreadyFavorite ? '已添加到心动标签' : '添加到心动标签';
        favorite.disabled = alreadyFavorite;
        favorite.onclick = () => {
            if (setFavoriteTags([...loadConfig().fav_tags, text])) {
                menu.hidePopover();
                showAlert('已将「' + text + '」添加到心动标签。');
            }
        };
        const hide = menu.querySelector('[data-action="hide"]');
        hide.onclick = () => {
            if (setMetaTagHidden(text, true)) {
                menu.hidePopover();
                showAlert('已隐藏「' + text + '」，可在设置 → 显示中恢复。');
            }
        };
        menu.showPopover();
        const anchor = trigger.getBoundingClientRect();
        const rect = menu.getBoundingClientRect();
        menu.style.left = Math.max(8, Math.min(anchor.left, innerWidth - rect.width - 8)) + 'px';
        menu.style.top = Math.max(8, anchor.bottom + rect.height + 4 <= innerHeight - 8
            ? anchor.bottom + 4 : anchor.top - rect.height - 4) + 'px';
        (alreadyFavorite ? hide : favorite).focus();
    }

    function createMetaTagControl(tag) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `meta-tag ${tag.hot ? 'hot' : ''}`.trim();
        chip.textContent = tag.text;
        chip.title = tag.text + '\n单击复制；右键或长按可添加心动标签、隐藏标签';
        chip.setAttribute('aria-label', '复制标签：' + tag.text);
        chip.setAttribute('aria-description', '右键、长按或 Shift+F10 打开标签菜单');
        chip.setAttribute('aria-haspopup', 'dialog');

        let holdTimer = 0;
        let touchStart = null;
        let suppressClick = false;
        const cancelHold = () => {
            window.clearTimeout(holdTimer);
            holdTimer = 0;
            touchStart = null;
        };
        chip.addEventListener('pointerdown', event => {
            event.stopPropagation();
            cancelHold();
            suppressClick = false;
            if (event.pointerType !== 'touch' || !event.isPrimary) return;
            touchStart = { x: event.clientX, y: event.clientY };
            holdTimer = window.setTimeout(() => {
                cancelHold();
                if (!chip.isConnected) return;
                suppressClick = true;
                openMetaTagMenu(chip, tag.text);
            }, 500);
        });
        chip.addEventListener('pointermove', event => {
            if (touchStart && Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) > 10) {
                cancelHold();
                suppressClick = true;
            }
        });
        chip.addEventListener('pointerup', event => {
            cancelHold();
            if (suppressClick) event.preventDefault();
        });
        chip.addEventListener('pointercancel', () => {
            cancelHold();
            suppressClick = true;
        });
        chip.addEventListener('lostpointercapture', cancelHold);
        chip.addEventListener('contextmenu', event => {
            event.preventDefault();
            event.stopPropagation();
            cancelHold();
            // A native touch contextmenu may follow the long-press timer.
            if (!suppressClick) openMetaTagMenu(chip, tag.text);
            suppressClick = true;
        });
        chip.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            if (!suppressClick || event.detail === 0) copyPlainText(tag.text);
        });
        chip.addEventListener('auxclick', event => {
            event.preventDefault();
            event.stopPropagation();
        });
        chip.addEventListener('keydown', event => {
            event.stopPropagation();
            if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                event.preventDefault();
                cancelHold();
                openMetaTagMenu(chip, tag.text);
            }
        });
        return chip;
    }

    function fillCommanderBadgeContainer(badgeBox, model) {
        if (!badgeBox) return;
        badgeBox._jlcDecorModel = model;
        const safeModel = model || { matchedRadar: '', orderedTags: [] };
        const hiddenTags = new Set(uniqueTextList(config.hidden_meta_tags).map(normalizeTagText));
        const orderedTags = (Array.isArray(safeModel.orderedTags) ? safeModel.orderedTags : [])
            .filter(tag => !hiddenTags.has(normalizeTagText(tag.text)));
        badgeBox.innerHTML = '';

        if (safeModel.preferenceMatchCount >= 2) {
            const badge = document.createElement('span');
            badge.className = 'jlc-badge b-preference';
            badge.textContent = `偏好命中 ${safeModel.preferenceMatchCount} 项`;
            const reasons = [...safeModel.matchedPreferenceTags];
            if (safeModel.matchedRadar) reasons.push('熟人：' + safeModel.matchedRadar);
            badge.title = reasons.join(' / ');
            badgeBox.appendChild(badge);
        }
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
                overlay.appendChild(createMetaTagControl(tag));
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
        // Automatic preference matches are presentation only; manual marks stay in videos.
        item.classList.toggle('preference-match-item', model.preferenceMatchCount >= 2);
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
        syncDetailReleaseBadge(context, cachedMeta?.releaseDate || extractDetailReleaseDate(context));
        renderDetailCommanderBadges(context, buildCommanderDecorationModel(context.title, cachedMeta));
        if (!config.metatube_url) return cachedMeta;
        if (cachedMeta?.genres?.length) return cachedMeta;
        const freshMeta = normalizeMetaRecord(await queueMetaFetch(context.avid, prioritize, cachedMeta));
        const latestContext = getCurrentDetailContext();
        if (!freshMeta || normalizeResourceAvid(latestContext?.avid || '') !== normalizeResourceAvid(context.avid)) {
            return freshMeta || cachedMeta;
        }
        syncDetailReleaseBadge(latestContext, freshMeta.releaseDate || extractDetailReleaseDate(latestContext));
        renderDetailCommanderBadges(latestContext, buildCommanderDecorationModel(latestContext.title || context.title, freshMeta));
        return freshMeta;
    }

    function requestMetaEnrichment(item, avid, title, prioritize = false, cachedMeta) {
        if (!item || !item.isConnected || !config.metatube_url || item.dataset.jlcMetaState === 'pending') return;
        clearDeferredMetaItem(item);
        const currentRetry = Number(item.dataset.jlcMetaRetry || '0');
        item.dataset.jlcMetaState = 'pending';
        queueMetaFetch(avid, prioritize, cachedMeta).then(freshMeta => {
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
        const embySnapshot = typeof getEmbyMovieRecordsFromSnapshot === 'function'
            ? getEmbyMovieRecordsFromSnapshot(normalizedAvids)
            : null;
        const [videos, embyData, metaCache] = await Promise.all([
            getManyFromStore('videos', normalizedAvids),
            embySnapshot || getManyFromStore('emby_data', normalizedAvids.map(avid => `vid_${avid}`)),
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
            const embySnapshot = typeof getEmbyMovieRecordsFromSnapshot === 'function'
                ? getEmbyMovieRecordsFromSnapshot([avid])
                : null;
            [vidData, inEmby, cachedMeta] = await Promise.all([
                getVal('videos', avid),
                embySnapshot
                    ? Promise.resolve(embySnapshot.get(`vid_${avid}`) || null)
                    : getVal('emby_data', `vid_${avid}`),
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
        scheduleMetaEnrichment(item, avid, title, normalizedMeta);
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
