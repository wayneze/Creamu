
  const listItemRuntimeState = new WeakMap();
  let listEnhancementQueue = Promise.resolve();

  async function loadListTrackingRecord(pageContext) {
    if (!pageContext || !pageContext.trackable) return null;
    try {
      return typeof findTrackingForContext === 'function'
        ? await findTrackingForContext(pageContext)
        : await getTrackingBySignature(pageContext.query_signature);
    } catch (_) {
      return null;
    }
  }

  async function resolveListTrackingState(pageContext, preloaded) {
    if (preloaded) {
      try {
        const state = await preloaded;
        if (
          state &&
          state.resolved === true &&
          state.context &&
          state.context.query_signature === (pageContext && pageContext.query_signature)
        ) {
          return state;
        }
      } catch (_) { /* retry below */ }
    }
    return {
      context: pageContext,
      record: await loadListTrackingRecord(pageContext),
      records: null,
      resolved: true,
    };
  }

  function getCurrentListRuntimeItems() {
    return queryListItems()
      .map((el) => listItemRuntimeState.get(el))
      .filter(Boolean);
  }

  async function enhanceListPageNow(options) {
    const opts = options || {};
    bindListLiveRefresh();
    const pageContext = parseExhPageContext(location.href);
    const trackingStatePromise = resolveListTrackingState(pageContext, opts.trackingState);
    const allItems = Array.from(opts.items || queryListItems()).filter(
      (el) => el && el.isConnected !== false
    );
    const entries = [];
    for (const el of allItems) {
      if (el.dataset.excEnhanced === '1') continue;
      const partial = parseListCard(el);
      if (partial && partial.gid) entries.push({ el, partial });
    }

    if (!entries.length) {
      injectTrackingBar(trackingStatePromise);
      if (opts.reapplyFold) applyWorkFold(getCurrentListRuntimeItems());
      const existing = await trackingStatePromise;
      if (existing && existing.record && typeof applyTrackingBreakpointDecorations === 'function') {
        applyTrackingBreakpointDecorations(existing.record);
      }
      return 0;
    }

    injectTrackingBar(trackingStatePromise);
    let prepared = null;
    try {
      prepared = await upsertEditionsWithSnapshot(entries.map((entry) => entry.partial));
    } catch (error) {
      console.warn('[ExC] batch list storage', error);
    }

    const trackingState = await trackingStatePromise;
    const trackingRecord = trackingState.record || null;
    const seenGids = loadSeenGids();
    const enhanced = [];

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      let edition = prepared && prepared.editions[index];
      let storageSnapshot = prepared && prepared.snapshot;
      let work;
      if (!edition) {
        try {
          edition = await upsertEdition(entry.partial);
          work = edition.work_id ? await idbGet(STORE_WORKS, edition.work_id) : null;
          storageSnapshot = null;
        } catch (error) {
          console.warn('[ExC] upsert list edition', error);
          continue;
        }
      } else {
        work = storageSnapshot.worksById.get(edition.work_id) || null;
      }
      let result = null;
      try {
        result = await enhanceListItem(entry.el, {
          partial: entry.partial,
          edition,
          work,
          storageSnapshot,
          seenGids,
          pageContext,
          trackingRecord,
          trackingResolved: true,
        });
      } catch (error) {
        delete entry.el.dataset.excEnhanced;
        console.warn('[ExC] render list edition', error);
      }
      if (result) {
        enhanced.push(result);
        listItemRuntimeState.set(entry.el, result);
      }
      if ((index + 1) % 10 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }

    applyWorkFold(getCurrentListRuntimeItems());
    if (trackingRecord && typeof applyTrackingBreakpointDecorations === 'function') {
      applyTrackingBreakpointDecorations(trackingRecord);
    }
    return enhanced.length;
  }

  function enhanceListPage(options) {
    const run = () => enhanceListPageNow(options);
    const pending = listEnhancementQueue.then(run, run);
    listEnhancementQueue = pending.catch(() => {});
    return pending;
  }

  function applyListVolatileState(seenGids, trackingRecord) {
    document.querySelectorAll('.exc-gl-item').forEach((el) => {
      const gid = String(el.dataset.excGid || '');
      el.classList.toggle('is-exc-seen', !!(gid && seenGids && seenGids[gid]));
      if (trackingRecord && trackingRecord.id) {
        el.dataset.excTrackId = String(trackingRecord.id);
        if (trackingRecord.last_page != null) {
          el.dataset.excTrackLastPage = String(trackingRecord.last_page);
        }
      } else {
        delete el.dataset.excTrackId;
        delete el.dataset.excTrackLastPage;
      }
    });
    if (typeof applyTrackingBreakpointDecorations === 'function') {
      applyTrackingBreakpointDecorations(trackingRecord);
    }
  }

  async function refreshListVolatileState() {
    const kind = detectPageKind();
    if (kind === 'gallery' || kind === 'image') return;
    const pageContext = parseExhPageContext(location.href);
    const trackingRecord = await loadListTrackingRecord(pageContext);
    applyListVolatileState(loadSeenGids(), trackingRecord);
    if (typeof refreshTrackingBarState === 'function') {
      await refreshTrackingBarState({
        context: pageContext,
        record: trackingRecord,
        resolved: true,
      });
    }
  }

  let listLiveRefreshTimer = null;
  function scheduleListLiveRefresh(reason) {
    if (listLiveRefreshTimer) clearTimeout(listLiveRefreshTimer);
    listLiveRefreshTimer = setTimeout(() => {
      listLiveRefreshTimer = null;
      refreshListVolatileState().catch((error) => {
        console.warn('[ExC] list live refresh', reason, error);
      });
    }, 200);
  }

  function bindListLiveRefresh() {
    if (window.__excListLiveBound) return;
    window.__excListLiveBound = true;
    window.addEventListener('pageshow', () => scheduleListLiveRefresh('pageshow'));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') scheduleListLiveRefresh('visible');
    });
    window.addEventListener('focus', () => scheduleListLiveRefresh('focus'));
  }

  function observeListMutations() {
    const listRoot =
      document.querySelector('table.itg') ||
      document.querySelector('.itg') ||
      document.getElementById('gdt') ||
      document.getElementById('ido') ||
      document.body;
    const observerRoot =
      listRoot === document.body ? listRoot : listRoot.parentElement || listRoot;
    const changedRoots = new Set();
    let reapplyFold = false;
    let timer = null;
    const runtimeUiSelector =
      '#exc-tracking-bar, #jlc-wb, #jlc-wb-fab, #exc-hover-preview, ' +
      '.exc-badge-container, .exc-tag-stream, .exc-tool-bar, .exc-enhance-host, .exc-tracking-divider';
    const isRuntimeUiNode = (node) =>
      !!(
        node &&
        node.nodeType === 1 &&
        ((node.matches && node.matches(runtimeUiSelector)) ||
          (node.closest && node.closest(runtimeUiSelector)))
      );
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const target = mutation.target;
        if (
          target &&
          target.closest &&
          target.closest(runtimeUiSelector)
        ) {
          continue;
        }
        if (
          mutation.removedNodes &&
          Array.from(mutation.removedNodes).some((node) => !isRuntimeUiNode(node))
        ) {
          reapplyFold = true;
        }
        mutation.addedNodes.forEach((node) => {
          if (node && node.nodeType === 1 && !isRuntimeUiNode(node)) changedRoots.add(node);
        });
      }
      if (!changedRoots.size && !reapplyFold) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const roots = Array.from(changedRoots);
        changedRoots.clear();
        const shouldReapplyFold = reapplyFold;
        reapplyFold = false;
        const candidates = queryListItems().filter((item) =>
          roots.some((changed) =>
            changed === item || changed.contains(item) || item.contains(changed)
          )
        );
        enhanceListPage({ items: candidates, reapplyFold: shouldReapplyFold }).catch((error) => {
          console.warn('[ExC] list enhance', error);
        });
      }, 400);
    });
    observer.observe(observerRoot, { childList: true, subtree: true });
  }
