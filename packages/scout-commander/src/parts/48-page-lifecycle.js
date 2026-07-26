// @@creamu-part:page-lifecycle

// ----------------------------------------
// Page lifecycle: MutationObserver + history
// ----------------------------------------
let __scoutEnhancing = false;
let __scoutRefreshTimer = null;
let __scoutPendingRefreshReason = '';
let __scoutLastHref = '';
let __scoutLastKind = '';
let __scoutLastListSignature = null;
let __scoutLastDetailSignature = null;
let __scoutNextListNodeId = 1;
const __scoutListNodeIds = new WeakMap();

function getScoutListContentSignature(listEntries) {
  let entries;
  try {
    entries = listEntries || collectListVideoEntries();
  } catch (_) {
    return null;
  }

  const isNarrow =
    typeof isScoutMobileListViewport === 'function' && isScoutMobileListViewport();
  const parts = [isNarrow ? 'narrow' : 'wide', String(entries.length)];
  entries.forEach((entry) => {
    const item = entry && entry.element;
    if (!item || (typeof item !== 'object' && typeof item !== 'function')) {
      parts.push('');
      return;
    }
    let nodeId = __scoutListNodeIds.get(item);
    if (!nodeId) {
      nodeId = __scoutNextListNodeId++;
      __scoutListNodeIds.set(item, nodeId);
    }
    const meta = entry && entry.meta;
    parts.push([
      nodeId,
      meta && meta.url,
      meta && meta.title,
      meta && meta.uploader
    ].map((value) => String(value || '')).join('\u001f'));
  });
  return parts.join('\u001e');
}

function rememberScoutListContent(listEntries, knownSignature) {
  const signature = knownSignature === undefined
    ? getScoutListContentSignature(listEntries)
    : knownSignature;
  if (signature !== null) __scoutLastListSignature = signature;
}

function hasScoutListContentChanged(knownSignature) {
  const signature = knownSignature === undefined
    ? getScoutListContentSignature()
    : knownSignature;
  return (
    signature === null ||
    __scoutLastListSignature === null ||
    signature !== __scoutLastListSignature
  );
}

function readScoutDetailContentSignature() {
  if (typeof getScoutDetailContentSignature !== 'function') return null;
  try {
    return getScoutDetailContentSignature();
  } catch (_) {
    return null;
  }
}

function rememberScoutDetailContent() {
  const signature = readScoutDetailContentSignature();
  if (signature !== null) __scoutLastDetailSignature = signature;
}

function hasScoutDetailContentChanged(knownSignature) {
  return (
    knownSignature === null ||
    __scoutLastDetailSignature === null ||
    knownSignature !== __scoutLastDetailSignature
  );
}

function refreshPageEnhancements(reason, options) {
  if (__scoutEnhancing) return;
  __scoutEnhancing = true;
  try {
    const site = detectSite();
    if (site) {
      // 站点 class 只加不乱删其它 creamu-site-*
      if (!document.body.classList.contains('creamu-site-' + site)) {
        ['xvideos', 'xnxx', 'eporner'].forEach(s => document.body.classList.remove('creamu-site-' + s));
        document.body.classList.add('creamu-site-' + site);
      }
    }

    const href = location.href;
    const kind = detectPageKind();
    const navigated = href !== __scoutLastHref || kind !== __scoutLastKind;
    __scoutLastHref = href;
    __scoutLastKind = kind;
    let listEntries = options && options.listEntries;

    if (typeof applyBlockSiteAutoPreviewMode === 'function') {
      try { applyBlockSiteAutoPreviewMode(); } catch (e) { console.warn(e); }
    }
    if (typeof applyListPreviewPlaybackMode === 'function') {
      try { applyListPreviewPlaybackMode(); } catch (e) { console.warn(e); }
    }
    if (typeof applySearchClickTrackingMode === 'function') {
      try { applySearchClickTrackingMode(); } catch (e) { console.warn(e); }
    }
    if (typeof applyVideoSeekGestureMode === 'function') {
      try { applyVideoSeekGestureMode(); } catch (e) { console.warn(e); }
    }

    if (kind === 'video') {
      markCurrentVideoPageClicked();
      enhancePageTags();
      enhancePagePublisher();
      rememberScoutDetailContent();
    } else if (kind === 'search') {
      if (!listEntries) listEntries = collectListVideoEntries();
      applyListBlocks(listEntries); // 内含已点 + 词库列表流
      // 搜索页顶栏：订阅/取消追更（不依赖打开工作台）
      if (typeof enhanceSearchTrackSubscribe === 'function') {
        try { enhanceSearchTrackSubscribe(); } catch (e) { console.warn(e); }
      }
      if (navigated || reason === 'boot') {
        checkSearchTrackingBreakpoints();
      }
      rememberScoutListContent(listEntries, options && options.listSignature);
    } else {
      // 首页/分类等列表页
      if (!listEntries) listEntries = collectListVideoEntries();
      applyClickedEnhancements(listEntries);
      if (typeof enhanceListLexiconHitFlows === 'function') {
        try { enhanceListLexiconHitFlows(listEntries); } catch (e) { console.warn(e); }
      }
      document.getElementById('scout-search-track-bar')?.remove();
    }

    if (kind === 'video') {
      document.getElementById('scout-search-track-bar')?.remove();
      if (typeof stopListPreview === 'function') stopListPreview();
    }
  } catch (err) {
    console.warn('[Creamu Scout] refresh failed:', reason, err);
  } finally {
    __scoutEnhancing = false;
  }
}

function schedulePageRefresh(reason) {
  if (__scoutEnhancing) return;
  if (window.__scoutUiMutating) return;
  __scoutPendingRefreshReason = reason || __scoutPendingRefreshReason || 'debounced';
  if (__scoutRefreshTimer !== null) return;
  __scoutRefreshTimer = setTimeout(() => {
    const pendingReason = __scoutPendingRefreshReason || 'debounced';
    __scoutRefreshTimer = null;
    __scoutPendingRefreshReason = '';
    refreshPageEnhancements(pendingReason);
  }, 280);
}

/** 是否我们自己的 UI 节点（改这些不应再触发全页增强） */
function isScoutUiNode(node) {
  if (!node || node.nodeType !== 1) return false;
  if (
    node.id === 'scout-lex-hit-bar' ||
    node.id === 'scout-work-fav-bar' ||
    node.id === 'scout-search-track-bar' ||
    node.id === 'scout-tags-toggle' ||
    node.id === 'scout-desc-toggle' ||
    node.id === 'scout-collect-dialog' ||
    node.id === 'creamu-scout-toast-container' ||
    node.id === 'jlc-tracking-pagebar' ||
    node.id === 'jlc-wb' ||
    node.id === 'jlc-wb-fab'
  ) {
    return true;
  }
  if (node.classList && (
    node.classList.contains('scout-lex-flow-card') ||
    node.classList.contains('scout-lex-flow-overlay') ||
    node.classList.contains('scout-lex-hit-bar') ||
    node.classList.contains('scout-tag-addon') ||
    node.classList.contains('scout-tag-heart') ||
    node.classList.contains('scout-pub-addon') ||
    node.classList.contains('scout-pub-badge') ||
    node.classList.contains('scout-visited-item') ||
    node.classList.contains('scout-list-preview-video') ||
    node.classList.contains('scout-preview-playing')
  )) {
    return true;
  }
  if (node.id === 'scout-seek-hud') return true;
  return !!(node.closest && node.closest(
    '#scout-lex-hit-bar, #scout-work-fav-bar, #scout-collect-dialog, #creamu-scout-toast-container, #jlc-wb, #jlc-wb-fab, #scout-seek-hud, .scout-lex-flow-overlay, .scout-tag-addon, .scout-pub-addon, .scout-list-preview-video'
  ));
}

function shouldRefreshForScoutMutation(mutation) {
  if (mutation.target && isScoutUiNode(mutation.target)) return false;
  const changedNodes = [];
  if (mutation.addedNodes && mutation.addedNodes.length) {
    mutation.addedNodes.forEach((node) => changedNodes.push(node));
  }
  if (mutation.removedNodes && mutation.removedNodes.length) {
    mutation.removedNodes.forEach((node) => changedNodes.push(node));
  }
  if (!changedNodes.length) {
    return !!(mutation.target && !isScoutUiNode(mutation.target));
  }
  return changedNodes.some((node) => {
    if (!node) return false;
    if (isScoutUiNode(node)) return false;
    if (node.nodeType !== 1 && isScoutUiNode(node.parentElement || mutation.target)) return false;
    return true;
  });
}

function setupScoutPageLifecycle() {
  if (window.__creamuScoutLifecycleBound) return;
  window.__creamuScoutLifecycleBound = true;

  // DOM 变更：列表懒加载 / 局部刷新（忽略我们自己的 UI，防详情页词库条死循环跳动）
  try {
    const obs = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (shouldRefreshForScoutMutation(m)) {
          schedulePageRefresh('mutation');
          return;
        }
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {
    console.warn('[Creamu Scout] MutationObserver unavailable', e);
  }

  // SPA / 站内 pushState 翻页
  if (!window.__creamuScoutHistoryHooked) {
    window.__creamuScoutHistoryHooked = true;
    const wrap = (type) => {
      const orig = history[type];
      if (typeof orig !== 'function') return;
      history[type] = function () {
        const ret = orig.apply(this, arguments);
        schedulePageRefresh('history:' + type);
        return ret;
      };
    };
    wrap('pushState');
    wrap('replaceState');
    window.addEventListener('popstate', () => schedulePageRefresh('popstate'));
    window.addEventListener('hashchange', () => schedulePageRefresh('hashchange'));
  }

  // 兜底：只补偿未触发 mutation 的真实内容变化
  setInterval(() => {
    if (location.href !== __scoutLastHref) {
      refreshPageEnhancements('href-poll');
    } else {
      const kind = detectPageKind();
      if (kind === 'search') {
        const listEntries = collectListVideoEntries();
        const listSignature = getScoutListContentSignature(listEntries);
        if (hasScoutListContentChanged(listSignature)) {
          refreshPageEnhancements('content-poll', { listEntries, listSignature });
        }
      } else if (kind === 'video') {
        const detailSignature = readScoutDetailContentSignature();
        if (hasScoutDetailContentChanged(detailSignature)) {
          refreshPageEnhancements('detail-poll');
        }
      }
    }
  }, 8000);
}
