// @@creamu-part:21-search-runtime
const __scoutSearchPageCache = new Map();
const __scoutSearchDetailCache = new Map();
const SCOUT_SEARCH_PAGE_CACHE_MS = 10 * 60 * 1000;
const SCOUT_SEARCH_DETAIL_CACHE_MS = 30 * 60 * 1000;

function requestScoutSearchDocument(url, options) {
  const href = compactText(url);
  if (!href) return Promise.reject(new Error('搜索地址为空'));
  const timeout = Math.max(5000, Number(options && options.timeout) || 20000);
  return new Promise((resolve, reject) => {
    if (typeof GM_xmlhttpRequest !== 'function') {
      reject(new Error('GM_xmlhttpRequest unavailable'));
      return;
    }
    GM_xmlhttpRequest({
      method: 'GET',
      url: href,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
      },
      timeout,
      anonymous: false,
      onload(response) {
        const status = Number(response && response.status) || 0;
        const text = String(response && (response.responseText || response.response) || '');
        if (status < 200 || status >= 400) {
          reject(new Error('HTTP ' + (status || '?')));
          return;
        }
        if (/cf-chl-|challenge-platform|<title>\s*just a moment/i.test(text)) {
          reject(new Error('站点要求浏览器验证'));
          return;
        }
        const finalUrl = compactText(response && response.finalUrl) || href;
        let doc = null;
        try {
          doc = new DOMParser().parseFromString(text, 'text/html');
        } catch (_) { /* handled below */ }
        if (!doc || !doc.documentElement) {
          reject(new Error('搜索响应无法解析'));
          return;
        }
        resolve({ doc, finalUrl, status, text });
      },
      onerror() {
        reject(new Error('搜索请求失败'));
      },
      ontimeout() {
        reject(new Error('搜索请求超时'));
      },
    });
  });
}

function getScoutCachedValue(cache, key, maxAge) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.saved_at > maxAge) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function putScoutCachedValue(cache, key, value) {
  cache.set(key, { saved_at: Date.now(), value });
  if (cache.size > 240) {
    const first = cache.keys().next();
    if (!first.done) cache.delete(first.value);
  }
  return value;
}

function scoutSearchResultKey(site, url) {
  const id = videoIdFromUrl(url);
  return String(site || '') + ':' + String(id || url || '');
}

function normalizeScoutFetchedResult(probe, meta, rank) {
  if (!meta || !meta.url || !compactText(meta.title)) return null;
  return {
    key: scoutSearchResultKey(probe.site, meta.url),
    site: probe.site,
    video_id: videoIdFromUrl(meta.url),
    title: compactText(meta.title),
    url: meta.url,
    thumb: resolveScoutUrl(meta.thumb, probe.url),
    uploader: compactText(meta.uploader),
    tags: Array.isArray(meta.tags) ? meta.tags.slice() : [],
    verified: false,
    remote_rank: Math.max(1, Number(rank) || 1),
    probe_ids: [probe.id],
    probe_labels: [probe.label],
    query: probe.query,
  };
}

async function fetchScoutSearchProbe(probe, options) {
  const cached = getScoutCachedValue(
    __scoutSearchPageCache,
    probe.url,
    SCOUT_SEARCH_PAGE_CACHE_MS
  );
  if (cached) {
    return {
      summary: Object.assign({}, cached.summary),
      results: cached.results.map((item) => Object.assign({}, item)),
    };
  }
  const response = await requestScoutSearchDocument(probe.url, options);
  const elements = Array.from(getVideoElementsForSite(probe.site, response.doc));
  const results = [];
  elements.forEach((element, index) => {
    const meta = parseVideoElementForSite(probe.site, element, response.finalUrl || probe.url);
    const result = normalizeScoutFetchedResult(probe, meta, index + 1);
    if (result) results.push(result);
  });
  const value = putScoutCachedValue(__scoutSearchPageCache, probe.url, {
    summary: getScoutSearchSummaryForSite(
      probe.site,
      response.doc,
      response.finalUrl || probe.url
    ),
    results,
  });
  return {
    summary: Object.assign({}, value.summary),
    results: value.results.map((item) => Object.assign({}, item)),
  };
}

async function runScoutSearchPlan(plan, options) {
  const opts = options || {};
  const shouldContinue = typeof opts.shouldContinue === 'function'
    ? opts.shouldContinue
    : () => true;
  const probes = Array.isArray(plan && plan.probes) ? plan.probes.slice() : [];
  const terms = Array.isArray(opts.terms) ? opts.terms : getLexiconTerms();
  const normalizedRecipe = normalizeScoutSearchRecipe(plan && plan.recipe);
  const conditions = normalizedRecipe.conditions;
  const sampleSize = Math.min(12, Math.max(3, Number(opts.sampleSize) || 8));
  const reports = new Array(probes.length);
  const errors = [];
  let cursor = 0;
  let completed = 0;

  const worker = async () => {
    while (cursor < probes.length && shouldContinue()) {
      const probeIndex = cursor++;
      const probe = probes[probeIndex];
      if (typeof opts.onProbeStart === 'function') opts.onProbeStart(probe, probeIndex);
      try {
        const payload = await fetchScoutSearchProbe(probe, opts);
        const report = {
          id: probe.id,
          site: probe.site,
          level: probe.level,
          label: probe.label,
          query: probe.query,
          url: probe.url,
          removed_condition_ids: Array.isArray(probe.removed_condition_ids)
            ? probe.removed_condition_ids.slice()
            : [],
          replacement_condition_id: probe.replacement_condition_id || '',
          replacement_text: probe.replacement_text || '',
          ok: true,
          total: payload.summary.total,
          total_kind: payload.summary.total_kind,
          page_count: payload.summary.page_count,
          page_size: payload.summary.page_size,
          list_count: payload.results.length,
          sample_target: 0,
          sample_verified: 0,
          sample_exact: 0,
          sample_failed: 0,
          condition_stats: conditions.map((condition) => ({
            id: condition.id,
            text: condition.text,
            role: condition.role,
            priority: condition.priority || 0,
            hits: 0,
          })),
          sample_results: probe.level === 'strict'
            ? payload.results.slice(0, sampleSize)
            : [],
        };
        report.sample_target = report.sample_results.length;
        reports[probeIndex] = report;
        if (typeof opts.onReport === 'function') opts.onReport(report, probeIndex);
        if (typeof opts.onProbeComplete === 'function') {
          opts.onProbeComplete(probe, report);
        }
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        errors.push({ site: probe.site, query: probe.query, message });
        const report = {
          id: probe.id,
          site: probe.site,
          level: probe.level,
          label: probe.label,
          query: probe.query,
          url: probe.url,
          removed_condition_ids: Array.isArray(probe.removed_condition_ids)
            ? probe.removed_condition_ids.slice()
            : [],
          replacement_condition_id: probe.replacement_condition_id || '',
          replacement_text: probe.replacement_text || '',
          ok: false,
          error: message,
          total: null,
          total_kind: 'unknown',
          page_count: 0,
          page_size: 0,
          list_count: 0,
          sample_target: 0,
          sample_verified: 0,
          sample_exact: 0,
          sample_failed: 0,
          condition_stats: [],
          sample_results: [],
        };
        reports[probeIndex] = report;
        if (typeof opts.onReport === 'function') opts.onReport(report, probeIndex);
        if (typeof opts.onProbeComplete === 'function') {
          opts.onProbeComplete(probe, report);
        }
      } finally {
        completed += 1;
        if (typeof opts.onProgress === 'function') {
          opts.onProgress({ phase: 'search', completed, total: probes.length });
        }
      }
    }
  };

  const concurrency = Math.min(3, Math.max(1, Number(opts.concurrency) || 2));
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const verificationTasks = [];
  reports.forEach((report) => {
    if (!report || !report.ok || report.level !== 'strict') return;
    report.sample_results.forEach((result) => verificationTasks.push({ report, result }));
  });
  let verificationCursor = 0;
  let verificationCompleted = 0;
  const verificationWorker = async () => {
    while (verificationCursor < verificationTasks.length && shouldContinue()) {
      const task = verificationTasks[verificationCursor++];
      try {
        const verified = await verifyScoutSearchResult(normalizedRecipe, task.result, {
          timeout: opts.detailTimeout || 16000,
          terms,
        });
        if (!shouldContinue()) return;
        task.report.sample_verified += 1;
        if (verified.evaluation && verified.evaluation.exact_match) {
          task.report.sample_exact += 1;
        }
        task.report.condition_stats.forEach((stat) => {
          const condition = conditions.find((item) => item.id === stat.id);
          if (condition && scoutSearchConditionMatchesMeta(condition, task.report.site, verified, terms)) {
            stat.hits += 1;
          }
        });
      } catch (_) {
        if (!shouldContinue()) return;
        task.report.sample_failed += 1;
      } finally {
        verificationCompleted += 1;
        if (typeof opts.onReport === 'function') opts.onReport(task.report);
        if (typeof opts.onProgress === 'function') {
          opts.onProgress({
            phase: 'verify',
            completed: verificationCompleted,
            total: verificationTasks.length,
          });
        }
      }
    }
  };
  const detailConcurrency = Math.min(4, Math.max(1, Number(opts.detailConcurrency) || 3));
  await Promise.all(Array.from({ length: detailConcurrency }, () => verificationWorker()));

  return {
    reports: reports.filter(Boolean).map((report) => {
      const output = Object.assign({}, report);
      delete output.sample_results;
      return output;
    }),
    errors,
    completed,
    total: probes.length,
    verification_completed: verificationCompleted,
    verification_total: verificationTasks.length,
  };
}

async function verifyScoutSearchResult(recipe, result, options) {
  if (!result || !result.url || !result.site) return result;
  const cached = getScoutCachedValue(
    __scoutSearchDetailCache,
    result.key || result.url,
    SCOUT_SEARCH_DETAIL_CACHE_MS
  );
  const terms = options && Array.isArray(options.terms)
    ? options.terms
    : getLexiconTerms();
  if (cached) return evaluateScoutSearchResult(recipe, Object.assign({}, result, cached), terms);
  const response = await requestScoutSearchDocument(result.url, options);
  const detail = scrapeVideoMetaForSite(result.site, response.doc, response.finalUrl || result.url);
  const verified = {
    title: compactText(detail.title) || result.title,
    url: detail.url || result.url,
    thumb: detail.thumb || result.thumb,
    uploader: compactText(detail.uploader) || result.uploader,
    tags: Array.isArray(detail.tags) ? detail.tags : [],
    verified: true,
    verified_at: new Date().toISOString(),
  };
  putScoutCachedValue(__scoutSearchDetailCache, result.key || result.url, verified);
  const evaluated = evaluateScoutSearchResult(recipe, Object.assign({}, result, verified), terms);
  if (
    options?.recordRelations !== false &&
    evaluated.evaluation &&
    evaluated.evaluation.state !== 'rejected'
  ) {
    recordScoutSearchRelations(recipe, evaluated);
  }
  return evaluated;
}
