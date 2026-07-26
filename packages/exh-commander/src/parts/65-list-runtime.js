
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

  function getCurrentListRuntimeItems() {
    return queryListItems()
      .map((el) => listItemRuntimeState.get(el))
      .filter(Boolean);
  }

  async function enhanceListPageNow(options) {
    const opts = options || {};
    bindListLiveRefresh();
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
      if (!document.getElementById('exc-tracking-bar')) injectTrackingBar();
      if (opts.reapplyFold) applyWorkFold(getCurrentListRuntimeItems());
      return 0;
    }

    injectTrackingBar();
    let prepared = null;
    try {
      prepared = await upsertListEditions(entries.map((entry) => entry.partial));
    } catch (error) {
      console.warn('[ExC] batch list storage', error);
    }

    const pageContext = parseExhPageContext(location.href);
    const trackingRecord = await loadListTrackingRecord(pageContext);
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
    tryConsumeBreakpointScroll();
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
      const isBreakpoint = !!(
        gid &&
        trackingRecord &&
        String(trackingRecord.breakpoint_gid || '') === gid
      );
      el.classList.toggle('is-exc-breakpoint', isBreakpoint);
      const breakpointButton = el.querySelector('[data-exc-act="breakpoint"]');
      if (breakpointButton) {
        breakpointButton.classList.toggle('is-on', isBreakpoint);
        breakpointButton.classList.toggle('is-bp', isBreakpoint);
      }
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
      '.exc-badge-container, .exc-tag-stream, .exc-tool-bar, .exc-enhance-host';
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
