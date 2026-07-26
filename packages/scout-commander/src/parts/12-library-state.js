// 12-library-state.js

let __scoutLibraryRevision = 0;
let __scoutStorageListenersInstalled = false;
const SCOUT_DETAIL_LIBRARY_KEYS = new Set([
  'creamu_scout_lexicon_terms',
  'creamu_scout_block_list',
  'creamu_scout_publishers',
  'creamu_scout_works',
]);
const SCOUT_STORAGE_PAGE_DEPENDENCIES = {
  creamu_scout_lexicon_types: ['combo', 'lexicon'],
  creamu_scout_lexicon_terms: ['combo', 'lexicon', 'settings'],
  creamu_scout_block_list: ['blocks', 'settings'],
  creamu_scout_publishers: ['publishers', 'settings'],
  creamu_scout_works: ['works', 'settings'],
  creamu_scout_tracks: ['tracks', 'settings'],
  creamu_scout_config: ['combo', 'settings'],
  creamu_scout_clicks: ['settings'],
  scout_combo_tokens: ['combo'],
  scout_combo_auto_track: ['combo'],
};

function markScoutLibraryChanged() {
  __scoutLibraryRevision += 1;
  return __scoutLibraryRevision;
}

function getScoutLibraryRevision() {
  return __scoutLibraryRevision;
}

function markScoutStorageChanged(key) {
  const storageKey = String(key || '');
  if (SCOUT_DETAIL_LIBRARY_KEYS.has(storageKey)) markScoutLibraryChanged();
  const pages = SCOUT_STORAGE_PAGE_DEPENDENCIES[storageKey];
  if (pages && typeof markScoutWorkbenchPagesDirty === 'function') {
    markScoutWorkbenchPagesDirty(...pages);
  }
}

function setupScoutStorageChangeListeners() {
  if (__scoutStorageListenersInstalled) return;
  if (typeof GM_addValueChangeListener !== 'function') return;
  __scoutStorageListenersInstalled = true;
  Object.keys(SCOUT_STORAGE_PAGE_DEPENDENCIES).forEach((key) => {
    GM_addValueChangeListener(key, (name, _oldValue, _newValue, remote) => {
      if (remote === true) markScoutStorageChanged(name || key);
    });
  });
}

const DEFAULT_TYPES = ['主题', '角色', '场景', '其他', '未分类'];

// Lexicon Types
function getLexiconTypes() {
  const t = GM_getValue('creamu_scout_lexicon_types', null);
  if (Array.isArray(t) && t.length > 0) return t;
  return DEFAULT_TYPES.slice();
}

function saveLexiconTypes(types) {
  GM_setValue('creamu_scout_lexicon_types', types);
  markScoutStorageChanged('creamu_scout_lexicon_types');
}

// Lexicon Terms
function getLexiconTerms() {
  const val = GM_getValue('creamu_scout_lexicon_terms', null);
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch(_) { return []; }
  }
  return [];
}

function saveLexiconTerms(terms) {
  GM_setValue('creamu_scout_lexicon_terms', terms);
  markScoutStorageChanged('creamu_scout_lexicon_terms');
}

/**
 * 入库词条。自动合并同 identity（清洗后大小写不敏感）。
 * opts / termData.fromAutoCollect：自动采集时拒绝过宽词与噪声。
 */
function addLexiconTerm(termData) {
  if (!termData) return null;
  const terms = getLexiconTerms();
  const textNorm = sanitizeLexiconText(termData.text);
  if (!textNorm) return null;

  // 自动采集：过宽/噪声不入库
  if (termData.fromAutoCollect && isBroadOrNoiseLexiconTag(textNorm)) {
    return null;
  }

  const key = textNorm.toLowerCase();
  const existing = terms.find((t) => lexiconIdentityKey(t.text) === key);

  if (existing) {
    // 纠正历史脏 text
    existing.text = sanitizeLexiconText(existing.text) || textNorm;
    mergeLexiconTermFields(existing, {
      zh: termData.zh,
      type: termData.type,
      loved: termData.loved,
      note: termData.note,
      status: termData.status,
      subtypes: termData.subtypes,
      sources: termData.sources,
      heat: termData.heat,
      use: termData.use,
      good: termData.good,
      bad: termData.bad
    }, { bumpHeat: true });
    if (existing.status === 'retired' && termData.status !== 'retired') {
      existing.status = termData.status || 'unreviewed';
    }
    saveLexiconTerms(terms);
    triggerWebDavDirty();
    return existing;
  }

  const newTerm = {
    id: 'term_' + uid(),
    text: textNorm,
    zh: compactText(termData.zh),
    type: termData.type || '未分类',
    subtypes: termData.subtypes || [],
    loved: !!termData.loved,
    status: termData.status || 'unreviewed', // unreviewed | confirmed | retired
    heat: Number(termData.heat) > 0 ? Number(termData.heat) : 1,
    use: Number(termData.use) || 0,
    good: Number(termData.good) || 0,
    bad: Number(termData.bad) || 0,
    sources: termData.sources || [],
    note: compactText(termData.note),
    last_used_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  terms.push(newTerm);
  saveLexiconTerms(terms);
  triggerWebDavDirty();
  return newTerm;
}

function updateLexiconTerm(id, fields) {
  const terms = getLexiconTerms();
  const term = terms.find(t => t.id === id);
  if (term) {
    Object.assign(term, fields);
    term.updated_at = new Date().toISOString();
    saveLexiconTerms(terms);
    triggerWebDavDirty();
    return term;
  }
  return null;
}

function deleteLexiconTerm(id) {
  let terms = getLexiconTerms();
  const len = terms.length;
  terms = terms.filter(t => t.id !== id);
  if (terms.length !== len) {
    saveLexiconTerms(terms);
    triggerWebDavDirty();
    return true;
  }
  return false;
}

function incrementTermHeat(id, action = 'use') {
  const terms = getLexiconTerms();
  const term = terms.find(t => t.id === id);
  if (term) {
    if (action === 'use') {
      term.use = (Number(term.use) || 0) + 1;
      term.heat = (Number(term.heat) || 0) + 2;
    } else if (action === 'good') {
      term.good = (Number(term.good) || 0) + 1;
      term.heat = (Number(term.heat) || 0) + 3;
    } else if (action === 'bad') {
      term.bad = (Number(term.bad) || 0) + 1;
      term.heat = Math.max(0, (Number(term.heat) || 0) - 2);
    }
    term.last_used_at = new Date().toISOString();
    term.updated_at = new Date().toISOString();
    saveLexiconTerms(terms);
    triggerWebDavDirty();
    return term;
  }
  return null;
}

function getEffectiveHeat(term) {
  const heat = Number(term.heat) || 0;
  const lastUsed = term.last_used_at || term.updated_at || term.created_at;
  if (!lastUsed) return heat;
  const diffMs = Date.now() - new Date(lastUsed).getTime();
  const days = diffMs / (1000 * 60 * 60 * 24);
  if (days <= 0) return heat;
  return heat * Math.pow(0.95, days);
}

/** 匹配用归一化：小写、_-→空格、多空格合并 */
function normalizeLexKey(s) {
  return compactText(s)
    .toLowerCase()
    .replace(/[-_+/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 去空格/连字符紧凑形，便于词库与标题写法对齐 */
function compactLexKey(s) {
  return normalizeLexKey(s).replace(/\s+/g, '');
}

function prepareLexiconText(value) {
  const key = normalizeLexKey(value);
  return {
    key,
    compactKey: key.replace(/\s+/g, '')
  };
}

function createLexiconWordPattern(key) {
  const parts = String(key || '').split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (!parts.length) return null;
  try {
    return new RegExp('(^|[^a-z0-9_])' + parts.join('\\s+') + '([^a-z0-9_]|$)', 'i');
  } catch (_) {
    return null;
  }
}

function prepareLexiconTerm(term) {
  if (!term || term.status === 'retired' || !compactText(term.text)) return null;
  const preparedText = prepareLexiconText(term.text);
  if (!preparedText.key) return null;
  return {
    term,
    key: preparedText.key,
    compactKey: preparedText.compactKey,
    wordPattern: createLexiconWordPattern(preparedText.key)
  };
}

function prepareLexiconMatcher(terms) {
  const source = Array.isArray(terms) ? terms : getLexiconTerms();
  return source.map(prepareLexiconTerm).filter(Boolean);
}

function buildLexiconTermIndex(preparedTerms) {
  const index = new Map();
  (Array.isArray(preparedTerms) ? preparedTerms : []).forEach((prepared) => {
    const term = prepared && prepared.term;
    if (!term) return;
    const key = lexiconIdentityKey(term.text);
    if (key && !index.has(key)) index.set(key, term);
  });
  return index;
}

function preparedLexiconTermHitsText(term, haystack) {
  if (!term || !term.key || !haystack || !haystack.key) return false;
  const wordHit = term.wordPattern
    ? term.wordPattern.test(haystack.key)
    : haystack.key.includes(term.key);
  if (wordHit) return true;
  if (!term.compactKey || !haystack.compactKey) return false;
  if (term.compactKey === haystack.compactKey) return true;
  return term.compactKey.length >= 5 && haystack.compactKey.includes(term.compactKey);
}

/**
 * 词库词是否命中一段文本（标题/slug/标签）。
 * 整词匹配 + 紧凑等价（空格/连字符写法对齐）
 */
function lexiconTermHitsText(termText, haystack) {
  const term = prepareLexiconTerm({ text: termText });
  return preparedLexiconTermHitsText(term, prepareLexiconText(haystack));
}

/**
 * 词库命中：对照标题 / 标签 / URL 路径（列表无站标时靠 slug）。
 * 展示优先中文 zh，心动 loved 排前。
 */
function matchLexiconHits(meta, options) {
  const opts = options || {};
  const preparedTerms = Array.isArray(opts.preparedTerms)
    ? opts.preparedTerms
    : prepareLexiconMatcher(opts.terms);
  const title = compactText(meta && meta.title);
  const uploader = compactText(meta && meta.uploader);
  let tags = Array.isArray(meta && meta.tags)
    ? meta.tags.map((t) => compactText(t)).filter(Boolean)
    : [];
  // URL 路径分词补伪标签
  const url = compactText(meta && meta.url);
  if (url) {
    try {
      const path = new URL(url, typeof location !== 'undefined' ? location.origin : 'https://x.com').pathname || '';
      const slug = path.split('/').filter(Boolean).pop() || '';
      const spaced = slug.replace(/[-_~.]+/g, ' ');
      if (spaced) tags = tags.concat(spaced.split(/\s+/).filter((w) => w.length >= 2));
      tags.push(spaced);
    } catch (_) { /* ignore */ }
  }
  // 去重保留顺序
  const seenTag = new Set();
  tags = tags.filter((t) => {
    const k = t.toLowerCase();
    if (seenTag.has(k)) return false;
    seenTag.add(k);
    return true;
  });

  const hits = [];
  const seen = new Set();
  const preparedTags = tags.map(prepareLexiconText).filter((tag) => tag.key);
  const preparedTitle = prepareLexiconText(title);
  const preparedUploader = prepareLexiconText(uploader);

  preparedTerms.forEach((preparedTerm) => {
    const term = preparedTerm.term;
    const key = preparedTerm.key;
    const compactKey = preparedTerm.compactKey;
    if (!term || !key || seen.has(key) || seen.has(compactKey)) return;

    let via = '';
    for (let i = 0; i < preparedTags.length; i++) {
      if (preparedLexiconTermHitsText(preparedTerm, preparedTags[i])) {
        via = 'tag';
        break;
      }
    }
    if (!via && preparedTitle.key && preparedLexiconTermHitsText(preparedTerm, preparedTitle)) {
      via = 'title';
    }
    if (
      !via &&
      preparedUploader.key &&
      preparedLexiconTermHitsText(preparedTerm, preparedUploader)
    ) {
      via = 'uploader';
    }
    if (!via) return;

    seen.add(key);
    seen.add(compactKey);
    hits.push({
      text: term.text,
      zh: compactText(term.zh),
      type: term.type || '未分类',
      loved: !!term.loved,
      via,
      label: compactText(term.zh) || term.text,
      heat: getEffectiveHeat(term)
    });
  });

  hits.sort((a, b) => {
    if (a.loved !== b.loved) return a.loved ? -1 : 1;
    return (b.heat || 0) - (a.heat || 0);
  });

  // 展示去重：继母/妈妈、继女/女儿 等同族只留更具体的一条
  const displayHits = dedupeLexiconHitsForDisplay(hits);

  return {
    hits: displayHits,
    /** 去重前原始命中（调试/统计用） */
    rawHits: hits,
    lovedCount: displayHits.filter((h) => h.loved).length,
    total: displayHits.length,
    rawTotal: hits.length
  };
}

/**
 * 标签流去重：compact 相同只留一条；更长词覆盖其子串短词。
 * 优先：更长/更具体 > 心动 > 热度
 */
function dedupeLexiconHitsForDisplay(hits) {
  if (!Array.isArray(hits) || hits.length <= 1) return hits || [];

  const covers = (longer, shorter) => {
    const a = compactLexKey(longer.text || longer);
    const b = compactLexKey(shorter.text || shorter);
    if (!a || !b) return false;
    if (a === b) return true;
    // 仅当短词是长词的「整段尾缀/前缀」时覆盖，减少误伤
    if (b.length < 3 || a.length <= b.length) return false;
    if (a.endsWith(b) || a.startsWith(b)) return true;
    if (b.length >= 3 && a.includes(b)) {
      // 短词在长词中占比够高才覆盖，减少误伤
      if (b.length / a.length >= 0.35) return true;
    }
    return false;
  };

  const sorted = hits.slice().sort((a, b) => {
    const la = compactLexKey(a.text).length;
    const lb = compactLexKey(b.text).length;
    if (lb !== la) return lb - la; // 更长更具体优先
    if (!!b.loved !== !!a.loved) return a.loved ? -1 : 1;
    return (b.heat || 0) - (a.heat || 0);
  });

  const kept = [];
  for (const h of sorted) {
    // 已有更具体的盖住当前 → 丢弃
    if (kept.some((k) => covers(k, h))) continue;
    // 当前更具体 → 去掉被盖住的旧条
    for (let i = kept.length - 1; i >= 0; i--) {
      if (covers(h, kept[i])) kept.splice(i, 1);
    }
    kept.push(h);
  }

  // 最终仍按 心动 > 热度 排展示顺序
  kept.sort((a, b) => {
    if (a.loved !== b.loved) return a.loved ? -1 : 1;
    return (b.heat || 0) - (a.heat || 0);
  });
  return kept;
}

// Block Words
function getBlockList() {
  const val = GM_getValue('creamu_scout_block_list', null);
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch(_) { return []; }
  }
  return [];
}

function saveBlockList(list) {
  GM_setValue('creamu_scout_block_list', list);
  markScoutStorageChanged('creamu_scout_block_list');
}

/** match: word(整词，默认) | sub(子串) */
function normalizeBlockMatch(m) {
  return m === 'sub' ? 'sub' : 'word';
}

/** scope: title(默认) | uploader | both */
function normalizeBlockScope(s) {
  if (s === 'uploader' || s === 'both') return s;
  return 'title';
}

function escapeRegExp(str) {
  return String(str == null ? '' : str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeBlockText(value) {
  return compactText(value).toLowerCase();
}

function prepareBlockMatcher(block) {
  if (!block) return null;
  const needle = normalizeBlockText(block.text);
  if (!needle) return null;

  const match = normalizeBlockMatch(block.match);
  const scope = normalizeBlockScope(block.scope);
  let wordPattern = null;
  if (match === 'word') {
    const parts = needle.split(/\s+/).filter(Boolean).map(escapeRegExp);
    if (parts.length) {
      try {
        wordPattern = new RegExp(
          '(^|[^a-z0-9_])' + parts.join('\\s+') + '([^a-z0-9_]|$)',
          'i'
        );
      } catch (_) {
        wordPattern = null;
      }
    }
  }

  return { block, needle, match, scope, wordPattern };
}

function prepareBlockMatchers(blocks) {
  return (Array.isArray(blocks) ? blocks : [])
    .map(prepareBlockMatcher)
    .filter(Boolean);
}

function preparedBlockTextMatches(normalizedText, matcher) {
  if (!normalizedText || !matcher || !matcher.needle) return false;
  if (matcher.match === 'sub') return normalizedText.includes(matcher.needle);
  if (matcher.wordPattern) return matcher.wordPattern.test(normalizedText);
  return normalizedText.includes(matcher.needle);
}

function preparedBlockMatchesVideo(meta, matcher) {
  if (!meta || !matcher) return false;
  if (
    (matcher.scope === 'title' || matcher.scope === 'both') &&
    preparedBlockTextMatches(meta.title, matcher)
  ) {
    return true;
  }
  if (
    (matcher.scope === 'uploader' || matcher.scope === 'both') &&
    preparedBlockTextMatches(meta.uploader, matcher)
  ) {
    return true;
  }
  return false;
}

/**
 * 标题/上传者文本是否命中屏蔽词。
 * word：按词边界匹配（避免 ass 误伤 class）；多词短语允许中间空白。
 * sub：纯子串 contains。
 */
function textMatchesBlock(haystack, block) {
  return preparedBlockTextMatches(
    normalizeBlockText(haystack),
    prepareBlockMatcher(block)
  );
}

function blockMatchesVideo(meta, block) {
  if (!meta || !block) return false;
  return preparedBlockMatchesVideo(
    {
      title: normalizeBlockText(meta.title),
      uploader: normalizeBlockText(meta.uploader || '')
    },
    prepareBlockMatcher(block)
  );
}

function addBlockWord({ text, zh, reason, mode = 'dim', match, scope }) {
  const list = getBlockList();
  const textNorm = sanitizeLexiconText(text) || compactText(text);
  if (!textNorm) return null;
  const key = textNorm.toLowerCase();
  const existing = list.find((b) => lexiconIdentityKey(b.text) === key);
  if (existing) {
    existing.text = sanitizeLexiconText(existing.text) || textNorm;
    if (!existing.zh && zh) existing.zh = compactText(zh);
    if (reason) existing.reason = compactText(reason);
    if (mode) existing.mode = mode;
    if (match !== undefined) existing.match = normalizeBlockMatch(match);
    if (scope !== undefined) existing.scope = normalizeBlockScope(scope);
    if (!existing.match) existing.match = 'word';
    if (!existing.scope) existing.scope = 'title';
    existing.heat = (existing.heat || 0) + 1;
    saveBlockList(list);
    triggerWebDavDirty();
    return existing;
  } else {
    const newBlock = {
      id: 'block_' + uid(),
      text: textNorm,
      zh: compactText(zh),
      reason: compactText(reason),
      mode: mode || 'dim', // dim | hide
      match: normalizeBlockMatch(match), // word | sub
      scope: normalizeBlockScope(scope), // title | uploader | both
      heat: 1,
      created_at: new Date().toISOString()
    };
    list.push(newBlock);
    saveBlockList(list);
    triggerWebDavDirty();
    return newBlock;
  }
}

function deleteBlockWord(id) {
  let list = getBlockList();
  const len = list.length;
  list = list.filter(b => b.id !== id);
  if (list.length !== len) {
    saveBlockList(list);
    triggerWebDavDirty();
    return true;
  }
  return false;
}

// Familiar / Publishers
function getPublishers() {
  const val = GM_getValue('creamu_scout_publishers', null);
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch(_) { return []; }
  }
  return [];
}

function savePublishers(list) {
  GM_setValue('creamu_scout_publishers', list);
  markScoutStorageChanged('creamu_scout_publishers');
}

function publisherIdentityKey(name) {
  return compactText(name).toLowerCase();
}

function buildPublisherIndex(publishers) {
  const index = new Map();
  (Array.isArray(publishers) ? publishers : []).forEach((publisher) => {
    if (!publisher) return;
    const key = publisherIdentityKey(publisher.name);
    if (key && !index.has(key)) index.set(key, publisher);
  });
  return index;
}

function addPublisher({ name, site, status = 'loved', note = '' }) {
  const list = getPublishers();
  const nameNorm = compactText(name);
  if (!nameNorm) return null;

  const nameKey = publisherIdentityKey(nameNorm);
  const existing = list.find(p => publisherIdentityKey(p && p.name) === nameKey);
  if (existing) {
    existing.status = status || existing.status;
    if (note) existing.note = compactText(note);
    existing.site = site || existing.site;
    savePublishers(list);
    triggerWebDavDirty();
    return existing;
  } else {
    const newPub = {
      id: 'pub_' + uid(),
      name: nameNorm,
      site: String(site || ''),
      status: status || 'loved', // loved | blocked
      note: compactText(note),
      created_at: new Date().toISOString()
    };
    list.push(newPub);
    savePublishers(list);
    triggerWebDavDirty();
    return newPub;
  }
}

function deletePublisher(id) {
  let list = getPublishers();
  const len = list.length;
  list = list.filter(p => p.id !== id);
  if (list.length !== len) {
    savePublishers(list);
    triggerWebDavDirty();
    return true;
  }
  return false;
}

// Works：作品收藏（主键 site + videoId；可缓存 thumb dataURL）
const WORKS_KEY = 'creamu_scout_works';

function workKey(site, videoId) {
  return String(site || '') + '|' + String(videoId || '');
}

function getWorks() {
  const val = GM_getValue(WORKS_KEY, null);
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val);
      return Array.isArray(p) ? p : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

function saveWorks(list) {
  GM_setValue(WORKS_KEY, list || []);
  markScoutStorageChanged('creamu_scout_works');
}

function findWork(site, videoId) {
  const id = compactText(videoId);
  if (!id) return null;
  const siteNorm = String(site || '');
  return (
    getWorks().find(
      (w) => w && w.site === siteNorm && compactText(w.videoId || w.id) === id
    ) || null
  );
}

function isWorkSaved(site, videoId) {
  return !!findWork(site, videoId);
}

/**
 * 收藏作品。可选 autoCollectTags：把标签合并进词库（unreviewed）。
 * @returns {{ work: object, added: boolean, tagsCollected: number }}
 */
function addWork(data, options) {
  const opts = options || {};
  const site = String((data && data.site) || (typeof detectSite === 'function' ? detectSite() : '') || '');
  const url = compactText(data && data.url) || (typeof location !== 'undefined' ? location.href : '');
  const videoId = compactText(data && (data.videoId || data.id)) || (typeof videoIdFromUrl === 'function' ? videoIdFromUrl(url) : '');
  if (!videoId) return { work: null, added: false, tagsCollected: 0 };

  // 清洗标签：去 ＋✕、过宽词不进作品 tags 列表（保留有意义的）
  const rawTags = Array.isArray(data && data.tags) ? data.tags : [];
  const tags = [];
  const seenTagKey = new Set();
  rawTags.forEach((t) => {
    const s = sanitizeLexiconText(t);
    if (!s) return;
    const k = s.toLowerCase();
    if (seenTagKey.has(k)) return;
    seenTagKey.add(k);
    tags.push(s);
  });
  const list = getWorks();
  const existing = list.find(
    (w) => w && w.site === site && compactText(w.videoId || w.id) === videoId
  );
  const now = new Date().toISOString();
  let work;
  let added = false;
  const thumbIn = compactText(data && data.thumb);
  const thumbUrlIn = compactText(data && data.thumbUrl);
  const isDataThumb = /^data:image\//i.test(thumbIn);

  if (existing) {
    existing.title = compactText(data && data.title) || existing.title;
    existing.url = url || existing.url;
    // 已有 dataURL 缓存时，勿被空的远程 URL 冲掉
    if (isDataThumb) {
      existing.thumb = thumbIn;
      if (thumbUrlIn) existing.thumbUrl = thumbUrlIn;
      else if (existing.thumbUrl == null && existing.thumb && !/^data:/i.test(existing.thumb)) {
        existing.thumbUrl = existing.thumb;
      }
    } else if (thumbIn) {
      if (!existing.thumb || !/^data:image\//i.test(existing.thumb)) {
        existing.thumb = thumbIn;
      }
      existing.thumbUrl = thumbIn;
    }
    existing.uploader = compactText(data && data.uploader) || existing.uploader;
    if (tags.length) {
      const set = new Set([...(existing.tags || []), ...tags].map((t) => sanitizeLexiconText(t).toLowerCase()).filter(Boolean));
      existing.tags = Array.from(set).map((low) => {
        const hit = tags.find((t) => t.toLowerCase() === low) || (existing.tags || []).find((t) => sanitizeLexiconText(t).toLowerCase() === low);
        return hit || low;
      });
    }
    if (data && data.note != null) existing.note = compactText(data.note);
    existing.updated_at = now;
    work = existing;
  } else {
    work = {
      id: 'work_' + uid(),
      site,
      videoId,
      title: compactText(data && data.title),
      url,
      thumb: thumbIn,
      thumbUrl: isDataThumb ? thumbUrlIn : thumbIn || thumbUrlIn,
      uploader: compactText(data && data.uploader),
      tags,
      note: compactText(data && data.note),
      created_at: now,
      updated_at: now
    };
    list.unshift(work);
    added = true;
  }
  saveWorks(list);
  triggerWebDavDirty();

  let tagsCollected = 0;
  if (opts.autoCollectTags !== false && tags.length) {
    tags.forEach((tag) => {
      if (isBroadOrNoiseLexiconTag(tag)) return;
      // 已在屏蔽表的不进词库
      const blocked = getBlockList().some(
        (b) => b && lexiconIdentityKey(b.text) === lexiconIdentityKey(tag)
      );
      if (blocked) return;
      const term = addLexiconTerm({
        text: tag,
        type: '未分类',
        status: 'unreviewed',
        fromAutoCollect: true,
        sources: [
          {
            site,
            url,
            title: work.title,
            at: now,
            from: 'work_favorite'
          }
        ]
      });
      if (term) tagsCollected++;
    });
  }
  return { work, added, tagsCollected };
}

function removeWork(idOrSite, videoIdMaybe) {
  let list = getWorks();
  const len = list.length;
  if (videoIdMaybe != null) {
    const site = String(idOrSite || '');
    const vid = compactText(videoIdMaybe);
    list = list.filter(
      (w) => !(w && w.site === site && compactText(w.videoId || w.id) === vid)
    );
  } else {
    const id = String(idOrSite || '');
    list = list.filter((w) => w && w.id !== id);
  }
  if (list.length === len) return false;
  saveWorks(list);
  triggerWebDavDirty();
  return true;
}

/** 写入作品缩略图缓存（data URL）；保留 thumbUrl 远程地址 */
function updateWorkThumb(workId, dataUrl, remoteUrl) {
  const id = String(workId || '');
  const data = compactText(dataUrl);
  if (!id || !data || !/^data:image\//i.test(data)) return false;
  const list = getWorks();
  const w = list.find((x) => x && x.id === id);
  if (!w) return false;
  if (remoteUrl) w.thumbUrl = compactText(remoteUrl) || w.thumbUrl;
  else if (w.thumb && !/^data:/i.test(w.thumb)) w.thumbUrl = w.thumb;
  w.thumb = data;
  w.updated_at = new Date().toISOString();
  saveWorks(list);
  triggerWebDavDirty();
  return true;
}

/**
 * 远程缩略图 → 本地 data URL（缩小后，控制 GM 存储体积）。
 * 失败则 resolve 空串，由调用方保留原 URL。
 * @param {string} url
 * @returns {Promise<string>}
 */
function cacheThumbToDataUrl(url) {
  const src = compactText(url);
  if (!src) return Promise.resolve('');
  if (/^data:image\//i.test(src)) return Promise.resolve(src);
  if (typeof GM_xmlhttpRequest !== 'function') return Promise.resolve('');

  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => {
      if (settled) return;
      settled = true;
      resolve(v || '');
    };

    GM_xmlhttpRequest({
      method: 'GET',
      url: src,
      responseType: 'blob',
      timeout: 20000,
      headers: {
        // 部分 CDN 对空 Referer 更友好
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
      },
      onload(res) {
        try {
          if (!res || res.status < 200 || res.status >= 300 || !res.response) {
            done('');
            return;
          }
          const blob = res.response;
          if (!blob || !(blob.size > 0) || blob.size > 2.5 * 1024 * 1024) {
            done('');
            return;
          }
          const reader = new FileReader();
          reader.onerror = () => done('');
          reader.onload = () => {
            const raw = String(reader.result || '');
            if (!/^data:image\//i.test(raw)) {
              done('');
              return;
            }
            // 缩到约 160×120，作品列表封面够用
            shrinkImageDataUrl(raw, 160, 120)
              .then((small) => done(small || raw))
              .catch(() => done(raw));
          };
          reader.readAsDataURL(blob);
        } catch (_) {
          done('');
        }
      },
      onerror: () => done(''),
      ontimeout: () => done(''),
      onabort: () => done('')
    });
  });
}

/**
 * data URL 缩小（canvas）。不可用时原样返回。
 * @param {string} dataUrl
 * @param {number} maxW
 * @param {number} maxH
 * @returns {Promise<string>}
 */
function shrinkImageDataUrl(dataUrl, maxW, maxH) {
  return new Promise((resolve) => {
    try {
      if (typeof Image === 'undefined' || typeof document === 'undefined') {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          let w = img.naturalWidth || img.width || 0;
          let h = img.naturalHeight || img.height || 0;
          if (w < 8 || h < 8) {
            resolve(dataUrl);
            return;
          }
          const mw = Math.max(32, maxW || 160);
          const mh = Math.max(32, maxH || 120);
          const scale = Math.min(1, mw / w, mh / h);
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          let out = '';
          try {
            out = canvas.toDataURL('image/jpeg', 0.72);
          } catch (_) {
            out = canvas.toDataURL('image/png');
          }
          // 过大则仍用原图（少见）
          if (out && out.length < dataUrl.length * 1.2) resolve(out);
          else resolve(dataUrl);
        } catch (_) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch (_) {
      resolve(dataUrl);
    }
  });
}
