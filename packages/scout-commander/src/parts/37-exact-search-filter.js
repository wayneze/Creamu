// @@creamu-part:37-exact-search-filter
const SCOUT_EXACT_FILTER_BAR_ID = 'scout-exact-filter-bar';
const SCOUT_EXACT_FILTER_MAX_CONCURRENCY = 3;

function createScoutExactFilterState() {
  return {
    runId: 0,
    key: '',
    site: '',
    recipe: null,
    terms: [],
    records: new Map(),
    queue: [],
    workersRunning: false,
  };
}

let __scoutExactFilterState = createScoutExactFilterState();

function getScoutExactFilterEntries(listEntries) {
  if (Array.isArray(listEntries)) return listEntries;
  return typeof collectListVideoEntries === 'function'
    ? collectListVideoEntries()
    : [];
}

function getScoutExactFilterPageHref() {
  try {
    const target = new URL(location.href);
    target.hash = '';
    return target.href;
  } catch (_) {
    return String(location && location.href || '').replace(/#[^#]*$/, '');
  }
}

function getScoutExactFilterRecordKey(meta) {
  const url = compactText(meta && meta.url);
  if (!url) return '';
  const id = typeof videoIdFromUrl === 'function' ? videoIdFromUrl(url) : '';
  return id ? String(id) + '|' + url : url;
}

function createScoutExactFilterRecord(entry, site, index) {
  const element = entry && entry.element;
  const meta = entry && entry.meta;
  const url = compactText(meta && meta.url);
  const key = getScoutExactFilterRecordKey(meta);
  const result = {
    key: typeof scoutSearchResultKey === 'function'
      ? scoutSearchResultKey(site, url)
      : site + ':' + url,
    site,
    video_id: typeof videoIdFromUrl === 'function' ? videoIdFromUrl(url) : '',
    title: compactText(meta && meta.title),
    url,
    thumb: compactText(meta && meta.thumb),
    uploader: compactText(meta && meta.uploader),
    tags: [],
    verified: false,
    remote_rank: index + 1,
  };
  return {
    element,
    key,
    result,
    status: key ? 'pending' : 'failed',
    started: false,
    queued: false,
    error: key ? '' : '作品链接无法识别',
  };
}

function clearScoutExactFilterPresentation(listEntries) {
  getScoutExactFilterEntries(listEntries).forEach((entry) => {
    const element = entry && entry.element;
    if (!element || !element.classList) return;
    element.classList.remove(
      'scout-exact-filter-pending',
      'scout-exact-filter-match',
      'scout-exact-filter-hidden',
      'scout-exact-filter-failed'
    );
  });
}

function applyScoutExactFilterRecordPresentation(record) {
  const element = record && record.element;
  if (!element || !element.classList) return;
  element.classList.remove(
    'scout-exact-filter-pending',
    'scout-exact-filter-match',
    'scout-exact-filter-hidden',
    'scout-exact-filter-failed'
  );
  if (record.status === 'pending') element.classList.add('scout-exact-filter-pending');
  if (record.status === 'match') element.classList.add('scout-exact-filter-match');
  if (record.status === 'hidden') element.classList.add('scout-exact-filter-hidden');
  if (record.status === 'failed') element.classList.add('scout-exact-filter-failed');
}

function getScoutExactFilterCounts(state) {
  const counts = { total: 0, pending: 0, match: 0, hidden: 0, failed: 0, retryable: 0 };
  state.records.forEach((record) => {
    counts.total += 1;
    if (counts[record.status] != null) counts[record.status] += 1;
    if (record.status === 'failed' && record.key) counts.retryable += 1;
  });
  return counts;
}

function removeScoutExactFilterBar() {
  document.getElementById(SCOUT_EXACT_FILTER_BAR_ID)?.remove();
}

function clearScoutExactFilterFromLocation() {
  try {
    const target = new URL(location.href);
    target.hash = '';
    if (typeof history !== 'undefined' && typeof history.replaceState === 'function') {
      history.replaceState(null, '', target.href);
    } else {
      location.hash = '';
    }
  } catch (_) {
    try { location.hash = ''; } catch (__) { /* ignore */ }
  }
  __scoutExactFilterState.runId += 1;
  clearScoutExactFilterPresentation();
  restoreScoutExactFilterPagination();
  __scoutExactFilterState = createScoutExactFilterState();
  removeScoutExactFilterBar();
}

function retryScoutExactFilterFailures() {
  const state = __scoutExactFilterState;
  if (!state.recipe || !state.records.size) return;
  const retry = [];
  state.records.forEach((record) => {
    if (record.status !== 'failed' || !record.key) return;
    record.status = 'pending';
    record.error = '';
    record.started = false;
    record.queued = true;
    retry.push(record);
    applyScoutExactFilterRecordPresentation(record);
  });
  if (retry.length) {
    state.queue.push(...retry);
    startScoutExactFilterWorkers(state);
    renderScoutExactFilterBar(state);
  }
}

function ensureScoutExactFilterBar() {
  let bar = document.getElementById(SCOUT_EXACT_FILTER_BAR_ID);
  if (bar) return bar;
  bar = document.createElement('div');
  bar.id = SCOUT_EXACT_FILTER_BAR_ID;
  bar.setAttribute('data-scout-ui', '1');
  bar.setAttribute('role', 'status');
  bar.setAttribute('aria-live', 'polite');
  const host = document.body || document.documentElement;
  let listRoot = null;
  try {
    const firstCard = typeof getVideoElements === 'function'
      ? Array.from(getVideoElements() || [])[0]
      : null;
    listRoot = firstCard && firstCard.closest
      ? firstCard.closest('.mozaique, #vidresults, #videos-list, .videos-list, .video-list')
      : null;
    if (!listRoot && firstCard) listRoot = firstCard.parentElement;
  } catch (_) { /* use body fallback */ }
  if (listRoot && listRoot.parentNode) {
    listRoot.parentNode.insertBefore(bar, listRoot);
  } else if (host) {
    host.insertBefore(bar, host.firstChild || null);
  }
  return bar;
}

function renderScoutExactFilterBar(state) {
  if (!state || !state.recipe) {
    removeScoutExactFilterBar();
    return;
  }
  const bar = ensureScoutExactFilterBar();
  if (!bar) return;
  const counts = getScoutExactFilterCounts(state);
  const verified = counts.match + counts.hidden;
  const pendingText = counts.pending
    ? ` · 核验中 ${verified}/${counts.total}`
    : '';
  const failedText = counts.failed
    ? ` · ${counts.failed} 条未能核验，已保留`
    : '';
  bar.innerHTML = `
    <span class="scout-exact-filter-text">只看同时命中 · 保留 ${counts.match}/${counts.total}${pendingText}${failedText}</span>
    <span class="scout-exact-filter-actions">
      ${counts.retryable ? '<button type="button" data-scout-exact-action="retry">重试失败</button>' : ''}
      <button type="button" data-scout-exact-action="show-all">显示全部</button>
    </span>`;
  bar.querySelector('[data-scout-exact-action="retry"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    retryScoutExactFilterFailures();
  });
  bar.querySelector('[data-scout-exact-action="show-all"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearScoutExactFilterFromLocation();
  });
}

function getScoutExactFilterPaginationAnchors() {
  if (!document.querySelectorAll) return [];
  const selectors = [
    '.pagination a',
    '.numlist a',
    '#pagination a',
    '.pager a',
    'a.last-page',
    'a[rel="last"]',
    'a[rel="next"]',
    'a[rel="prev"]',
  ];
  const seen = new Set();
  const anchors = [];
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((anchor) => {
      if (!seen.has(anchor)) {
        seen.add(anchor);
        anchors.push(anchor);
      }
    });
  });
  return anchors;
}

function preserveScoutExactFilterPagination(recipe) {
  getScoutExactFilterPaginationAnchors().forEach((anchor) => {
    const href = compactText(anchor.getAttribute && anchor.getAttribute('href'));
    if (!href || href === '#' || /^javascript:/i.test(href)) return;
    const stored = compactText(anchor.getAttribute('data-scout-exact-original-href'));
    const original = stored || href;
    if (!stored) anchor.setAttribute('data-scout-exact-original-href', original);
    const next = buildScoutExactFilterUrl(original, recipe);
    if (next && next !== href) anchor.setAttribute('href', next);
  });
}

function restoreScoutExactFilterPagination() {
  if (!document.querySelectorAll) return;
  document.querySelectorAll('[data-scout-exact-original-href]').forEach((anchor) => {
    const original = anchor.getAttribute('data-scout-exact-original-href');
    if (original) anchor.setAttribute('href', original);
    anchor.removeAttribute('data-scout-exact-original-href');
  });
}

function getScoutExactFilterRecordResult(record) {
  return Object.assign({}, record.result, {
    // 详情核验只需要标题、链接和上传者；列表标签不应影响严格判断。
    tags: [],
    verified: false,
  });
}

async function verifyScoutExactFilterRecord(state, record) {
  if (!record || !record.key) return;
  const result = getScoutExactFilterRecordResult(record);
  const evaluated = await verifyScoutSearchResult(state.recipe, result, {
    timeout: 16000,
    terms: state.terms,
    recordRelations: false,
  });
  if (state !== __scoutExactFilterState || state.runId !== __scoutExactFilterState.runId) return;
  if (evaluated && evaluated.evaluation && evaluated.evaluation.exact_match) {
    record.status = 'match';
    record.error = '';
  } else {
    record.status = 'hidden';
    record.error = '';
  }
  applyScoutExactFilterRecordPresentation(record);
  renderScoutExactFilterBar(state);
}

async function runScoutExactFilterWorker(state) {
  while (state === __scoutExactFilterState && state.queue.length) {
    const record = state.queue.shift();
    if (record) record.queued = false;
    if (!record || record.status !== 'pending' || record.started) continue;
    record.started = true;
    try {
      await verifyScoutExactFilterRecord(state, record);
    } catch (error) {
      if (state !== __scoutExactFilterState || state.runId !== __scoutExactFilterState.runId) return;
      record.status = 'failed';
      record.error = error && error.message ? error.message : String(error);
      applyScoutExactFilterRecordPresentation(record);
      renderScoutExactFilterBar(state);
    }
  }
}

function startScoutExactFilterWorkers(state) {
  if (!state || state.workersRunning) return;
  state.workersRunning = true;
  const workers = Math.min(
    SCOUT_EXACT_FILTER_MAX_CONCURRENCY,
    Math.max(1, state.queue.length)
  );
  Promise.all(Array.from({ length: workers }, () => runScoutExactFilterWorker(state)))
    .finally(() => {
      if (state === __scoutExactFilterState) {
        state.workersRunning = false;
        renderScoutExactFilterBar(state);
        if (state.queue.length) startScoutExactFilterWorkers(state);
      }
    });
}

function syncScoutExactFilterRecords(state, listEntries) {
  const active = new Set();
  const pending = [];
  getScoutExactFilterEntries(listEntries).forEach((entry, index) => {
    const element = entry && entry.element;
    if (!element) return;
    active.add(element);
    const meta = entry && entry.meta;
    const key = getScoutExactFilterRecordKey(meta);
    let record = state.records.get(element);
    if (!record || record.key !== key) {
      record = createScoutExactFilterRecord(entry, state.site, index);
      state.records.set(element, record);
    }
    if (record.status === 'pending' && !record.started && !record.queued) {
      record.queued = true;
      state.queue.push(record);
      pending.push(record);
    }
    applyScoutExactFilterRecordPresentation(record);
  });
  state.records.forEach((record, element) => {
    if (!active.has(element)) state.records.delete(element);
  });
  return pending;
}

function resetScoutExactFilterState(listEntries) {
  __scoutExactFilterState.runId += 1;
  clearScoutExactFilterPresentation(listEntries);
  __scoutExactFilterState = createScoutExactFilterState();
}

function applyScoutExactSearchFilter(listEntries) {
  const site = typeof detectSite === 'function' ? detectSite() : '';
  const kind = typeof detectPageKind === 'function' ? detectPageKind() : '';
  const parsed = typeof parseScoutExactFilterLocation === 'function'
    ? parseScoutExactFilterLocation(location)
    : null;
  if (kind !== 'search' || !site || !parsed || !parsed.recipe.sites.includes(site)) {
    if (__scoutExactFilterState.recipe) resetScoutExactFilterState(listEntries);
    restoreScoutExactFilterPagination();
    removeScoutExactFilterBar();
    return;
  }

  const currentScope = getScoutExactFilterSearchScope(location.href);
  if (!currentScope || currentScope !== parsed.scope) {
    if (__scoutExactFilterState.recipe) resetScoutExactFilterState(listEntries);
    restoreScoutExactFilterPagination();
    removeScoutExactFilterBar();
    return;
  }

  const recipe = parsed.recipe;
  const pageKey = [
    site,
    currentScope,
    scoutSearchRecipeFingerprint(recipe),
    getScoutExactFilterPageHref(),
  ].join('|');
  let state = __scoutExactFilterState;
  if (state.key !== pageKey) {
    if (state.recipe) resetScoutExactFilterState(listEntries);
    state = __scoutExactFilterState;
    state.key = pageKey;
    state.site = site;
    state.recipe = recipe;
    state.terms = typeof getLexiconTerms === 'function' ? getLexiconTerms() : [];
  }

  const pending = syncScoutExactFilterRecords(state, listEntries);
  preserveScoutExactFilterPagination(recipe);
  renderScoutExactFilterBar(state);
  if (pending.length) startScoutExactFilterWorkers(state);
}
