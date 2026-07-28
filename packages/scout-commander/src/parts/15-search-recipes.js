// @@creamu-part:15-search-recipes
const SCOUT_SEARCH_DRAFT_KEY = 'creamu_scout_search_draft';
const SCOUT_SEARCH_RELATIONS_KEY = 'creamu_scout_search_relations';
const SCOUT_SEARCH_SCHEMA_VERSION = 1;
const SCOUT_SEARCH_ROLE_ORDER = ['required', 'preference', 'excluded'];
const SCOUT_EXACT_FILTER_HASH_PREFIX = '#creamu-exact=';
const SCOUT_EXACT_FILTER_MAX_HASH_LENGTH = 8192;
const SCOUT_EXACT_FILTER_MAX_CONDITIONS = 16;

/**
 * 页面级精确过滤只放在 URL hash 中：它不会进入站点请求，也不会污染全局配置。
 * payload 只保留核验所需字段，避免把收藏名称、时间戳等状态带进地址栏。
 */
function getScoutExactFilterSearchScope(url) {
  let target;
  try {
    target = new URL(
      String(url || ''),
      typeof location !== 'undefined' && location.href
        ? location.href
        : 'https://example.invalid/'
    );
  } catch (_) {
    return '';
  }

  const host = String(target.hostname || '').toLowerCase();
  let site = '';
  let query = '';
  if (/xvideos\.com$/i.test(host)) {
    site = 'xvideos';
    query = target.searchParams.get('k') || target.searchParams.get('q') || '';
  } else if (/xnxx\.com$/i.test(host)) {
    site = 'xnxx';
    query = target.searchParams.get('k') || target.searchParams.get('q') || '';
    if (!query && typeof parseXnxxSearchPath === 'function') {
      query = parseXnxxSearchPath(target.pathname).query || '';
    }
  } else if (/eporner\.com$/i.test(host)) {
    site = 'eporner';
    query = target.searchParams.get('search') || target.searchParams.get('key') || target.searchParams.get('q') || '';
    if (!query && typeof parseEpornerListPath === 'function') {
      query = parseEpornerListPath(target.pathname).query || '';
    }
  }

  const key = typeof normalizeSearchQueryKey === 'function'
    ? normalizeSearchQueryKey(query)
    : compactText(query).toLowerCase().replace(/\s+/g, ' ');
  if (site && key) return site + ':' + key;
  // 未识别站点仍绑定完整路径，避免 hash 被带到其它页面后误触发。
  return host + ':' + target.pathname.replace(/\/+$/, '/') + (target.search || '');
}

function normalizeScoutExactFilterRecipe(input) {
  if (!input || typeof input !== 'object') return null;
  const rawConditions = Array.isArray(input.conditions) ? input.conditions : [];
  if (!rawConditions.length || rawConditions.length > SCOUT_EXACT_FILTER_MAX_CONDITIONS) {
    return null;
  }
  if (rawConditions.some((condition) => {
    const text = condition && typeof condition === 'object'
      ? condition.text || condition.value || condition.label
      : condition;
    return String(text || '').length > 96;
  })) {
    return null;
  }
  const normalized = normalizeScoutSearchRecipe({
    schema_version: SCOUT_SEARCH_SCHEMA_VERSION,
    sites: input.sites,
    conditions: rawConditions,
  });
  if (!normalized.conditions.length) return null;
  if (!normalized.conditions.some((condition) => condition.role !== 'excluded')) return null;
  return normalized;
}

function buildScoutExactFilterUrl(url, recipe) {
  const normalized = normalizeScoutExactFilterRecipe(recipe);
  if (!normalized) return String(url || '');
  const payload = {
    version: 1,
    scope: getScoutExactFilterSearchScope(url),
    sites: normalized.sites,
    conditions: normalized.conditions.map((condition) => ({
      text: condition.text,
      term_id: condition.term_id || '',
      role: condition.role,
      priority: condition.priority || 0,
    })),
  };
  let encoded;
  try {
    encoded = encodeURIComponent(JSON.stringify(payload));
  } catch (_) {
    return String(url || '');
  }
  if (!encoded || encoded.length > SCOUT_EXACT_FILTER_MAX_HASH_LENGTH) {
    return String(url || '');
  }
  try {
    const target = new URL(
      String(url || ''),
      typeof location !== 'undefined' && location.href
        ? location.href
        : 'https://example.invalid/'
    );
    target.hash = SCOUT_EXACT_FILTER_HASH_PREFIX + encoded;
    return target.href;
  } catch (_) {
    return String(url || '');
  }
}

function stripScoutExactFilterHash(url) {
  const href = String(url || '');
  try {
    const target = new URL(
      href,
      typeof location !== 'undefined' && location.href
        ? location.href
        : 'https://example.invalid/'
    );
    if (target.hash.startsWith(SCOUT_EXACT_FILTER_HASH_PREFIX)) target.hash = '';
    return target.href;
  } catch (_) {
    return href;
  }
}

function parseScoutExactFilterLocation(locationLike) {
  const hash = String(
    locationLike && typeof locationLike === 'object'
      ? locationLike.hash || ''
      : locationLike || ''
  );
  if (!hash.startsWith(SCOUT_EXACT_FILTER_HASH_PREFIX)) return null;
  const encoded = hash.slice(SCOUT_EXACT_FILTER_HASH_PREFIX.length);
  if (!encoded || encoded.length > SCOUT_EXACT_FILTER_MAX_HASH_LENGTH) return null;
  let payload;
  try {
    payload = JSON.parse(decodeURIComponent(encoded));
  } catch (_) {
    return null;
  }
  if (!payload || payload.version !== 1 || typeof payload.scope !== 'string') return null;
  const recipe = normalizeScoutExactFilterRecipe(payload);
  if (!recipe) return null;
  return {
    recipe,
    scope: compactText(payload.scope),
  };
}

function normalizeScoutSearchRole(value) {
  const role = String(value || '').toLowerCase();
  if (SCOUT_SEARCH_ROLE_ORDER.includes(role)) return role;
  if (role === 'optional' || role === 'preferred') return 'preference';
  if (role === 'exclude' || role === 'blocked') return 'excluded';
  return 'required';
}

function normalizeScoutSearchPriority(value) {
  const priority = Math.round(Number(value) || 1);
  return Math.min(3, Math.max(1, priority));
}

function normalizeScoutSearchSites(sites) {
  const available = typeof SCOUT_SITE_IDS !== 'undefined'
    ? SCOUT_SITE_IDS
    : ['xvideos', 'xnxx', 'eporner'];
  const source = Array.isArray(sites) && sites.length ? sites : available;
  const selected = new Set(source.map((site) => String(site || '').toLowerCase()));
  return available.filter((site) => selected.has(site));
}

function normalizeScoutRecipeCondition(value, fallbackRole) {
  const source = typeof value === 'string' ? { text: value } : value || {};
  const text = sanitizeLexiconText(source.text || source.value || source.label || '');
  if (!text) return null;
  const role = normalizeScoutSearchRole(source.role || fallbackRole);
  return {
    id: source.id || 'condition_' + uid(),
    term_id: compactText(source.term_id || source.termId || ''),
    text,
    role,
    priority: role === 'preference' ? normalizeScoutSearchPriority(source.priority) : 0,
  };
}

function normalizeScoutSearchRecipe(input) {
  const source = input && typeof input === 'object' ? input : {};
  const rawConditions = [];
  if (Array.isArray(source.conditions)) {
    source.conditions.forEach((condition) => rawConditions.push([condition, condition && condition.role]));
  } else {
    (source.required || []).forEach((condition) => rawConditions.push([condition, 'required']));
    (source.optional || source.preferences || []).forEach((condition) =>
      rawConditions.push([condition, 'preference'])
    );
    (source.excluded || []).forEach((condition) => rawConditions.push([condition, 'excluded']));
  }

  const conditions = [];
  const indexes = new Map();
  rawConditions.forEach(([raw, fallbackRole]) => {
    const condition = normalizeScoutRecipeCondition(raw, fallbackRole);
    if (!condition) return;
    const key = lexiconIdentityKey(condition.text);
    if (!key) return;
    if (indexes.has(key)) {
      conditions[indexes.get(key)] = condition;
      return;
    }
    indexes.set(key, conditions.length);
    conditions.push(condition);
  });

  const now = new Date().toISOString();
  return {
    schema_version: SCOUT_SEARCH_SCHEMA_VERSION,
    id: source.id || 'recipe_' + uid(),
    label: compactText(source.label || ''),
    sites: normalizeScoutSearchSites(source.sites),
    conditions,
    created_at: source.created_at || now,
    updated_at: source.updated_at || now,
  };
}

function getScoutSearchDraft() {
  const stored = GM_getValue(SCOUT_SEARCH_DRAFT_KEY, null);
  if (stored && typeof stored === 'object') return normalizeScoutSearchRecipe(stored);
  if (typeof stored === 'string') {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') return normalizeScoutSearchRecipe(parsed);
    } catch (_) { /* use legacy tokens */ }
  }
  const legacy = GM_getValue('scout_combo_tokens', null);
  return normalizeScoutSearchRecipe({
    conditions: Array.isArray(legacy)
      ? legacy.map((text) => ({ text, role: 'required' }))
      : [],
  });
}

function saveScoutSearchDraft(recipe) {
  const normalized = normalizeScoutSearchRecipe(recipe);
  normalized.updated_at = new Date().toISOString();
  GM_setValue(SCOUT_SEARCH_DRAFT_KEY, normalized);
  GM_setValue(
    'scout_combo_tokens',
    normalized.conditions
      .filter((condition) => condition.role === 'required')
      .map((condition) => condition.text)
  );
  markScoutStorageChanged(SCOUT_SEARCH_DRAFT_KEY);
  if (typeof triggerWebDavDirty === 'function') triggerWebDavDirty();
  return normalized;
}

function getScoutRecipeConditions(recipe, role) {
  const normalizedRole = role ? normalizeScoutSearchRole(role) : '';
  const conditions = normalizeScoutSearchRecipe(recipe).conditions;
  return normalizedRole
    ? conditions.filter((condition) => condition.role === normalizedRole)
    : conditions;
}

function putScoutRecipeCondition(recipe, value, role, priority) {
  const normalized = normalizeScoutSearchRecipe(recipe);
  const condition = normalizeScoutRecipeCondition(
    Object.assign({}, typeof value === 'string' ? { text: value } : value, {
      role: role || (value && value.role),
      priority: priority || (value && value.priority),
    })
  );
  if (!condition) return normalized;
  const key = lexiconIdentityKey(condition.text);
  const existing = normalized.conditions.findIndex(
    (item) => lexiconIdentityKey(item.text) === key
  );
  if (existing >= 0) {
    condition.id = normalized.conditions[existing].id || condition.id;
    condition.term_id = condition.term_id || normalized.conditions[existing].term_id || '';
    normalized.conditions[existing] = condition;
  } else {
    normalized.conditions.push(condition);
  }
  normalized.updated_at = new Date().toISOString();
  return normalized;
}

function updateScoutRecipeCondition(recipe, conditionId, fields) {
  const normalized = normalizeScoutSearchRecipe(recipe);
  const index = normalized.conditions.findIndex((condition) => condition.id === conditionId);
  if (index < 0) return normalized;
  const next = normalizeScoutRecipeCondition(
    Object.assign({}, normalized.conditions[index], fields || {})
  );
  if (!next) normalized.conditions.splice(index, 1);
  else normalized.conditions[index] = next;
  normalized.updated_at = new Date().toISOString();
  return normalized;
}

function removeScoutRecipeCondition(recipe, conditionId) {
  const normalized = normalizeScoutSearchRecipe(recipe);
  normalized.conditions = normalized.conditions.filter(
    (condition) => condition.id !== conditionId
  );
  normalized.updated_at = new Date().toISOString();
  return normalized;
}

function scoutSearchRecipeFingerprint(recipe) {
  const normalized = normalizeScoutSearchRecipe(recipe);
  const sites = normalized.sites.slice().sort().join(',');
  const conditions = normalized.conditions
    .map((condition) => [
      condition.role,
      condition.priority || 0,
      lexiconIdentityKey(condition.text),
    ].join(':'))
    .sort()
    .join('|');
  return sites + '::' + conditions;
}

function describeScoutSearchRecipe(recipe) {
  const normalized = normalizeScoutSearchRecipe(recipe);
  const required = normalized.conditions.filter((condition) => condition.role === 'required');
  const preferences = normalized.conditions.filter((condition) => condition.role === 'preference');
  const excluded = normalized.conditions.filter((condition) => condition.role === 'excluded');
  const bits = [];
  if (required.length) bits.push('必须 ' + required.map((item) => item.text).join(' + '));
  [1, 2, 3].forEach((priority) => {
    const layer = preferences.filter((condition) => condition.priority === priority);
    if (layer.length) bits.push('偏好' + priority + ' ' + layer.map((item) => item.text).join(' + '));
  });
  if (excluded.length) bits.push('排除 ' + excluded.map((item) => item.text).join(' + '));
  return bits.join(' · ') || '尚未添加搜索条件';
}

function normalizeScoutSearchAlias(value) {
  const source = typeof value === 'string' ? { text: value } : value || {};
  const text = sanitizeLexiconText(source.text || '');
  if (!text) return null;
  return {
    text,
    kind: source.kind || 'manual',
    status: source.status || 'confirmed',
    sites: normalizeScoutSearchSites(source.sites || []),
    evidence_count: Math.max(0, Number(source.evidence_count) || 0),
    updated_at: source.updated_at || new Date().toISOString(),
  };
}

function getScoutConditionTerm(condition, terms) {
  const list = Array.isArray(terms) ? terms : getLexiconTerms();
  if (condition && condition.term_id) {
    const byId = list.find((term) => term && term.id === condition.term_id);
    if (byId) return byId;
  }
  const key = lexiconIdentityKey(condition && condition.text);
  return list.find((term) => lexiconIdentityKey(term && term.text) === key) || null;
}

function getScoutConditionVariants(condition, site, terms) {
  const values = [];
  const seen = new Set();
  const add = (value) => {
    const text = sanitizeLexiconText(value);
    const key = lexiconIdentityKey(text);
    if (!text || !key || seen.has(key)) return;
    seen.add(key);
    values.push(text);
  };
  add(condition && condition.text);
  const canonical = sanitizeLexiconText(condition && condition.text);
  if (/[-_]/.test(canonical)) add(canonical.replace(/[-_]+/g, ' '));
  const term = getScoutConditionTerm(condition, terms);
  (term && Array.isArray(term.aliases) ? term.aliases : []).forEach((rawAlias) => {
    const alias = normalizeScoutSearchAlias(rawAlias);
    if (!alias || alias.status !== 'confirmed') return;
    if (alias.sites.length && site && !alias.sites.includes(site)) return;
    add(alias.text);
  });
  return values;
}

function addScoutLexiconAlias(termId, aliasData) {
  const terms = getLexiconTerms();
  const term = terms.find((item) => item && item.id === termId);
  const alias = normalizeScoutSearchAlias(aliasData);
  if (!term || !alias) return null;
  const aliases = Array.isArray(term.aliases) ? term.aliases.slice() : [];
  const key = lexiconIdentityKey(alias.text);
  const index = aliases.findIndex((item) => {
    const normalized = normalizeScoutSearchAlias(item);
    return normalized && lexiconIdentityKey(normalized.text) === key;
  });
  if (index >= 0) aliases[index] = Object.assign({}, aliases[index], alias);
  else aliases.push(alias);
  term.aliases = aliases.slice(-40);
  term.updated_at = new Date().toISOString();
  saveLexiconTerms(terms);
  triggerWebDavDirty();
  return term;
}

function compileScoutSiteQuery(site, terms) {
  const list = [];
  const seen = new Set();
  (terms || []).forEach((value) => {
    const text = compactText(value && value.text != null ? value.text : value);
    const key = normalizeSearchQueryKey(text);
    if (!text || !key || seen.has(key)) return;
    seen.add(key);
    list.push(text);
  });
  if (site === 'eporner') return list.join(' ');
  return list.join(' and ');
}

function buildScoutSearchProbeSets(recipe, site, maxProbes, availableTerms) {
  const normalized = normalizeScoutSearchRecipe(recipe);
  const terms = Array.isArray(availableTerms) ? availableTerms : getLexiconTerms();
  const searchable = normalized.conditions.filter((condition) => condition.role !== 'excluded');
  const primary = (condition) => ({
    condition_id: condition.id,
    role: condition.role,
    priority: condition.priority || 0,
    text: getScoutConditionVariants(condition, site, terms)[0] || condition.text,
  });
  const strictTerms = searchable.map(primary);
  const candidates = [{
    level: 'strict',
    label: '完整组合',
    terms: strictTerms,
    removed_condition_ids: [],
  }];

  if (searchable.length > 1) {
    searchable
      .slice()
      .sort((left, right) => {
        if (left.role !== right.role) return left.role === 'preference' ? -1 : 1;
        return (Number(right.priority) || 0) - (Number(left.priority) || 0);
      })
      .forEach((condition) => {
        candidates.push({
          level: 'reduced',
          label: `去掉「${condition.text}」`,
          terms: strictTerms.filter((term) => term.condition_id !== condition.id),
          removed_condition_ids: [condition.id],
        });
      });
  }

  searchable.forEach((condition, conditionIndex) => {
    const variants = getScoutConditionVariants(condition, site, terms);
    if (variants.length < 2) return;
    const aliasTerms = strictTerms.map((term, index) =>
      index === conditionIndex ? Object.assign({}, term, { text: variants[1] }) : term
    );
    candidates.push({
      level: 'alias',
      label: `将「${condition.text}」换为「${variants[1]}」`,
      terms: aliasTerms,
      removed_condition_ids: [],
      replacement_condition_id: condition.id,
      replacement_text: variants[1],
    });
  });

  const probes = [];
  const seen = new Set();
  candidates.forEach((candidate) => {
    const query = compileScoutSiteQuery(site, candidate.terms);
    const key = normalizeSearchQueryKey(query);
    if (!query || !key || seen.has(key) || probes.length >= maxProbes) return;
    seen.add(key);
    probes.push(Object.assign({}, candidate, {
      query,
      query_terms: candidate.terms.map((term) => term.text),
    }));
  });
  return probes;
}

function buildScoutSearchPlan(recipe, options) {
  const normalized = normalizeScoutSearchRecipe(recipe);
  const maxProbes = Math.min(10, Math.max(1, Number(options && options.maxProbesPerSite) || 8));
  const terms = options && Array.isArray(options.terms)
    ? options.terms
    : getLexiconTerms();
  const probes = [];
  normalized.sites.forEach((site) => {
    buildScoutSearchProbeSets(normalized, site, maxProbes, terms).forEach((probe, index) => {
      probes.push(Object.assign({}, probe, {
        id: site + ':' + index + ':' + normalizeSearchQueryKey(probe.query),
        site,
        url: buildSearchUrl(site, probe.query),
        index,
      }));
    });
  });
  return {
    schema_version: SCOUT_SEARCH_SCHEMA_VERSION,
    recipe: normalized,
    fingerprint: scoutSearchRecipeFingerprint(normalized),
    probes,
  };
}

function scoutSearchConditionMatchesMeta(condition, site, meta, terms) {
  const variants = getScoutConditionVariants(condition, site, terms);
  return variants.some((variant) => {
    if (lexiconTermHitsText(variant, meta && meta.title)) return true;
    if (lexiconTermHitsText(variant, meta && meta.uploader)) return true;
    return (meta && Array.isArray(meta.tags) ? meta.tags : []).some((tag) =>
      lexiconTermHitsText(variant, tag)
    );
  });
}

function evaluateScoutSearchResult(recipe, result, availableTerms) {
  const normalized = normalizeScoutSearchRecipe(recipe);
  const terms = Array.isArray(availableTerms) ? availableTerms : getLexiconTerms();
  const site = String(result && result.site || '');
  const required = normalized.conditions.filter((condition) => condition.role === 'required');
  const preferences = normalized.conditions.filter((condition) => condition.role === 'preference');
  const excluded = normalized.conditions.filter((condition) => condition.role === 'excluded');
  const hitRequired = required.filter((condition) =>
    scoutSearchConditionMatchesMeta(condition, site, result, terms)
  );
  const hitPreferences = preferences.filter((condition) =>
    scoutSearchConditionMatchesMeta(condition, site, result, terms)
  );
  const hitExcluded = excluded.filter((condition) =>
    scoutSearchConditionMatchesMeta(condition, site, result, terms)
  );
  const missingRequired = required.filter(
    (condition) => !hitRequired.some((hit) => hit.id === condition.id)
  );
  const verified = !!(result && result.verified);
  const searchableTotal = required.length + preferences.length;
  const searchableHit = hitRequired.length + hitPreferences.length;
  const exactMatch = !!(
    verified &&
    searchableHit === searchableTotal &&
    !hitExcluded.length
  );
  let state = 'candidate';
  if (hitExcluded.length || (verified && missingRequired.length)) state = 'rejected';
  else if (verified) state = 'verified';
  const preferenceScore = hitPreferences.reduce((score, condition) => {
    return score + ({ 1: 24, 2: 12, 3: 6 }[condition.priority] || 4);
  }, 0);
  const remoteRank = Math.max(0, 24 - (Number(result && result.remote_rank) || 0));
  const score = hitRequired.length * 50 + preferenceScore + remoteRank - hitExcluded.length * 120;
  return Object.assign({}, result, {
    evaluation: {
      state,
      score,
      exact_match: exactMatch,
      searchable_total: searchableTotal,
      searchable_hit: searchableHit,
      required_total: required.length,
      required_hit: hitRequired.map((condition) => condition.text),
      required_missing: missingRequired.map((condition) => condition.text),
      preference_hit: hitPreferences.map((condition) => condition.text),
      excluded_hit: hitExcluded.map((condition) => condition.text),
    },
  });
}

function incrementScoutRecipeTermUsage(recipe, availableTerms) {
  const terms = Array.isArray(availableTerms) ? availableTerms : getLexiconTerms();
  const selected = new Set(
    normalizeScoutSearchRecipe(recipe).conditions
      .filter((condition) => condition.role !== 'excluded')
      .map((condition) => condition.term_id || lexiconIdentityKey(condition.text))
  );
  if (!selected.size) return 0;
  const now = new Date().toISOString();
  let changed = 0;
  terms.forEach((term) => {
    if (!term) return;
    if (!selected.has(term.id) && !selected.has(lexiconIdentityKey(term.text))) return;
    term.use = (Number(term.use) || 0) + 1;
    term.heat = (Number(term.heat) || 0) + 2;
    term.last_used_at = now;
    term.updated_at = now;
    changed += 1;
  });
  if (changed) {
    saveLexiconTerms(terms);
    if (typeof triggerWebDavDirty === 'function') triggerWebDavDirty();
  }
  return changed;
}

function getScoutSearchRelations() {
  const value = GM_getValue(SCOUT_SEARCH_RELATIONS_KEY, null);
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch (_) { return []; }
  }
  return [];
}

function saveScoutSearchRelations(relations) {
  GM_setValue(SCOUT_SEARCH_RELATIONS_KEY, (relations || []).slice(-2000));
  markScoutStorageChanged(SCOUT_SEARCH_RELATIONS_KEY);
  if (typeof triggerWebDavDirty === 'function') triggerWebDavDirty();
}

function mergeScoutSearchRelations(incomingRelations) {
  const relations = getScoutSearchRelations().slice();
  const index = new Map();
  relations.forEach((relation, position) => {
    if (!relation) return;
    const key = compactText(relation.seed_key) + '::' + compactText(relation.candidate_key);
    if (key !== '::' && !index.has(key)) index.set(key, position);
  });
  (Array.isArray(incomingRelations) ? incomingRelations : []).forEach((incoming) => {
    if (!incoming) return;
    const seedKey = lexiconIdentityKey(incoming.seed_key || incoming.seed_text);
    const candidateKey = lexiconIdentityKey(incoming.candidate_key || incoming.candidate);
    if (!seedKey || !candidateKey || seedKey === candidateKey) return;
    const key = seedKey + '::' + candidateKey;
    const normalized = {
      id: incoming.id || 'relation_' + uid(),
      seed_key: seedKey,
      seed_text: sanitizeLexiconText(incoming.seed_text || incoming.seed_key),
      candidate_key: candidateKey,
      candidate: sanitizeLexiconText(incoming.candidate || incoming.candidate_key),
      count: Math.max(1, Number(incoming.count) || 1),
      status: incoming.status === 'rejected' ? 'rejected' : 'related',
      sites: normalizeScoutSearchSites(incoming.sites),
      updated_at: incoming.updated_at || new Date().toISOString(),
    };
    if (!normalized.seed_text || !normalized.candidate) return;
    const position = index.get(key);
    if (position == null) {
      index.set(key, relations.length);
      relations.push(normalized);
      return;
    }
    const current = relations[position];
    const incomingAt = new Date(normalized.updated_at || 0).getTime() || 0;
    const currentAt = new Date(current.updated_at || 0).getTime() || 0;
    current.count = Math.max(Number(current.count) || 0, normalized.count);
    current.sites = Array.from(new Set([...(current.sites || []), ...normalized.sites]));
    if (incomingAt >= currentAt) {
      current.status = normalized.status;
      current.updated_at = normalized.updated_at;
      current.candidate = normalized.candidate;
      current.seed_text = normalized.seed_text;
    }
  });
  saveScoutSearchRelations(relations);
  return relations;
}

function recordScoutSearchRelations(recipe, result) {
  if (!result || !Array.isArray(result.tags) || !result.tags.length) return 0;
  const normalized = normalizeScoutSearchRecipe(recipe);
  const seeds = normalized.conditions.filter((condition) => condition.role !== 'excluded');
  if (!seeds.length) return 0;
  const selected = new Set(normalized.conditions.map((condition) => lexiconIdentityKey(condition.text)));
  const candidates = result.tags
    .map((tag) => sanitizeLexiconText(tag))
    .filter((tag) => tag && tag.length <= 48 && !isBroadOrNoiseLexiconTag(tag))
    .filter((tag) => !selected.has(lexiconIdentityKey(tag)))
    .slice(0, 24);
  if (!candidates.length) return 0;
  const relations = getScoutSearchRelations();
  const index = new Map(relations.map((relation, i) => [relation.seed_key + '::' + relation.candidate_key, i]));
  let changed = 0;
  seeds.forEach((seed) => {
    const seedKey = lexiconIdentityKey(seed.text);
    candidates.forEach((candidate) => {
      const candidateKey = lexiconIdentityKey(candidate);
      const relationKey = seedKey + '::' + candidateKey;
      const position = index.get(relationKey);
      if (position != null) {
        const relation = relations[position];
        if (relation.status === 'rejected') return;
        relation.count = (Number(relation.count) || 0) + 1;
        relation.sites = Array.from(new Set([...(relation.sites || []), result.site].filter(Boolean)));
        relation.updated_at = new Date().toISOString();
      } else {
        index.set(relationKey, relations.length);
        relations.push({
          id: 'relation_' + uid(),
          seed_key: seedKey,
          seed_text: seed.text,
          candidate_key: candidateKey,
          candidate,
          count: 1,
          status: 'related',
          sites: result.site ? [result.site] : [],
          updated_at: new Date().toISOString(),
        });
      }
      changed += 1;
    });
  });
  if (changed) saveScoutSearchRelations(relations);
  return changed;
}

function getScoutRelatedSearchSuggestions(recipe, limit) {
  const normalized = normalizeScoutSearchRecipe(recipe);
  const selected = new Set(normalized.conditions.map((condition) => lexiconIdentityKey(condition.text)));
  const seeds = new Set(
    normalized.conditions
      .filter((condition) => condition.role !== 'excluded')
      .map((condition) => lexiconIdentityKey(condition.text))
  );
  const grouped = new Map();
  getScoutSearchRelations().forEach((relation) => {
    if (!relation || relation.status === 'rejected' || !seeds.has(relation.seed_key)) return;
    if (!relation.candidate_key || selected.has(relation.candidate_key)) return;
    const current = grouped.get(relation.candidate_key) || {
      text: relation.candidate,
      count: 0,
      sites: new Set(),
    };
    current.count += Number(relation.count) || 0;
    (relation.sites || []).forEach((site) => current.sites.add(site));
    grouped.set(relation.candidate_key, current);
  });
  return Array.from(grouped.values())
    .sort((left, right) => right.count - left.count || left.text.localeCompare(right.text))
    .slice(0, Math.max(1, Number(limit) || 20))
    .map((item) => ({ text: item.text, count: item.count, sites: Array.from(item.sites) }));
}

function rejectScoutSearchRelation(recipe, candidateText) {
  const normalized = normalizeScoutSearchRecipe(recipe);
  const seeds = new Set(normalized.conditions.map((condition) => lexiconIdentityKey(condition.text)));
  const candidateKey = lexiconIdentityKey(candidateText);
  const relations = getScoutSearchRelations();
  let changed = false;
  relations.forEach((relation) => {
    if (seeds.has(relation.seed_key) && relation.candidate_key === candidateKey) {
      relation.status = 'rejected';
      relation.updated_at = new Date().toISOString();
      changed = true;
    }
  });
  if (changed) saveScoutSearchRelations(relations);
  return changed;
}
