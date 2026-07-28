import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const partsDir = path.join(dirname, '..', 'src', 'parts');
const corePartFiles = [
  '10-core.js',
  '12-library-state.js',
  '14-tracking-state.js',
  '15-search-recipes.js',
  '16-data-portability.js',
  '18-webdav.js',
];
const store = new Map();

function loadCore() {
  store.clear();
  const valueChangeListeners = new Map();
  const dirtyPageCalls = [];
  const source = corePartFiles
    .map((file) => fs.readFileSync(path.join(partsDir, file), 'utf8'))
    .join('\n');
  const context = createContext({
    console,
    Date,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Set,
    Map,
    Error,
    URL,
    location: { origin: 'https://www.xvideos.com' },
    GM_getValue(key, fallback) {
      return store.has(key) ? store.get(key) : fallback;
    },
    GM_setValue(key, value) {
      store.set(key, value);
    },
    GM_addValueChangeListener(key, callback) {
      valueChangeListeners.set(key, callback);
      return valueChangeListeners.size;
    },
    __testValueChangeListeners: valueChangeListeners,
    __testDirtyPageCalls: dirtyPageCalls,
    markScoutWorkbenchPagesDirty(...pages) {
      dirtyPageCalls.push(pages);
    },
    createCreamuWebDavSync: undefined,
    scoutSync: null,
  });
  runInContext(source, context, { filename: 'scout-core-parts.js' });
  return context;
}

function loadSites(locationOverrides = {}) {
  const location = {
    hostname: 'www.xvideos.com',
    href: 'https://www.xvideos.com/?k=sample-query&p=2',
    pathname: '/',
    search: '?k=sample-query&p=2',
    origin: 'https://www.xvideos.com',
    ...locationOverrides,
  };
  const context = createContext({
    console,
    location,
    URL,
    URLSearchParams,
    document: {
      querySelectorAll: () => [],
      querySelector: () => null,
    },
  });
  const source = fs.readFileSync(path.join(partsDir, '20-sites.js'), 'utf8');
  runInContext(source, context, { filename: '20-sites.js' });
  return context;
}

let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('  OK  ' + name);
  } catch (error) {
    console.error('  FAIL  ' + name);
    console.error('       ', error.message);
    process.exitCode = 1;
  }
}

console.log('Scout core tests');

test('library revision tracks detail-facing stores', () => {
  const ctx = loadCore();
  assert.equal(ctx.getScoutLibraryRevision(), 0);
  ctx.setupScoutStorageChangeListeners();
  ctx.setupScoutStorageChangeListeners();
  assert.equal(ctx.__testValueChangeListeners.size, 12);
  const remoteListener = ctx.__testValueChangeListeners.get('creamu_scout_lexicon_terms');
  remoteListener('creamu_scout_lexicon_terms', [], [], false);
  assert.equal(ctx.getScoutLibraryRevision(), 0);
  assert.equal(ctx.__testDirtyPageCalls.length, 0);
  remoteListener('creamu_scout_lexicon_terms', [], [], true);
  assert.equal(ctx.getScoutLibraryRevision(), 1);
  assert.deepEqual(
    [...ctx.__testDirtyPageCalls[0]],
    ['combo', 'lexicon', 'settings']
  );
  ctx.saveLexiconTerms([]);
  ctx.saveBlockList([]);
  ctx.savePublishers([]);
  ctx.saveWorks([]);
  assert.equal(ctx.getScoutLibraryRevision(), 5);
  ctx.saveLexiconTypes(['主题']);
  assert.equal(ctx.getScoutLibraryRevision(), 5);
});

test('lexicon terms merge by normalized identity', () => {
  const ctx = loadCore();
  const first = ctx.addLexiconTerm({ text: '  Portrait  ', zh: '肖像', type: '内容类' });
  const second = ctx.addLexiconTerm({ text: 'portrait', zh: '', type: '未分类' });

  assert.ok(first.id);
  assert.equal(second.id, first.id);
  assert.equal(second.zh, '肖像');
  assert.ok(second.heat >= 2);
  assert.equal(ctx.getLexiconTerms().length, 1);
});

test('lexicon import tolerates optional notes', () => {
  const ctx = loadCore();
  ctx.addLexiconTerm({ text: 'landscape', zh: '' });
  const payload = JSON.stringify({
    format: 'creamu-scout-lexicon',
    version: 1,
    terms: [{ text: 'landscape', zh: '风景', note: 'imported' }],
    blocks: [{ text: 'spoiler', reason: 'test' }],
    publishers: [],
    types: ['内容类'],
  });

  assert.equal(ctx.importLexiconPackage(payload), true);
  assert.equal(ctx.getLexiconTerms()[0].zh, '风景');
  assert.equal(ctx.importLexiconPackage(JSON.stringify({
    format: 'creamu-scout-lexicon',
    terms: [{ text: 'landscape' }],
    blocks: [{ text: 'spoiler' }],
  })), true);
});

test('tracking deduplicates and groups normalized queries', () => {
  const ctx = loadCore();
  const first = ctx.addTrack({
    site: 'xvideos',
    query: 'summer travel',
    label: 'A',
    url: 'https://www.xvideos.com/?k=summer+travel',
  });
  const duplicate = ctx.addTrack({
    site: 'xvideos',
    query: 'SUMMER TRAVEL',
    label: 'B',
    url: 'https://www.xvideos.com/?k=summer+travel&p=1',
  });
  ctx.addTrack({
    site: 'xnxx',
    query: 'Summer AND Travel',
    label: 'C',
    url: 'https://www.xnxx.com/search/summer+travel',
  });
  ctx.addTrack({ site: 'eporner', query: 'documentary', label: 'D', url: 'https://www.eporner.com/search/documentary/' });

  assert.equal(duplicate.id, first.id);
  assert.equal(duplicate.label, 'B');
  const groups = ctx.groupTracksByQuery();
  assert.equal(groups.length, 2);
  const group = groups.find((entry) => entry.key === ctx.normalizeSearchQueryKey('summer travel'));
  assert.equal(group.siteCount, 2);
  assert.ok(ctx.findTrackInGroup(group, 'xvideos'));
  assert.ok(ctx.findTrackInGroup(group, 'xnxx'));
  assert.equal(ctx.deleteTracksByQueryKey('summer travel'), 2);
  assert.equal(ctx.getTracks()[0].query, 'documentary');
});

test('structured recipes migrate legacy tokens and keep role semantics', () => {
  const ctx = loadCore();
  store.set('scout_combo_tokens', ['documentary', 'city walk']);
  const migrated = ctx.getScoutSearchDraft();
  assert.deepEqual(
    Array.from(migrated.conditions, (condition) => [condition.text, condition.role]),
    [['documentary', 'required'], ['city walk', 'required']]
  );

  let recipe = ctx.putScoutRecipeCondition(migrated, 'night', 'preference', 2);
  recipe = ctx.putScoutRecipeCondition(recipe, 'spoiler', 'excluded');
  const saved = ctx.saveScoutSearchDraft(recipe);
  assert.equal(saved.conditions.find((condition) => condition.text === 'night').priority, 2);
  assert.equal(saved.conditions.find((condition) => condition.text === 'spoiler').role, 'excluded');
  assert.deepEqual(Array.from(store.get('scout_combo_tokens')), ['documentary', 'city walk']);
});

test('exact-filter URLs keep one validated recipe in the current search hash', () => {
  const ctx = loadCore();
  const recipe = ctx.normalizeScoutSearchRecipe({
    sites: ['xvideos'],
    conditions: [
      { text: 'documentary', role: 'required' },
      { text: 'city walk', role: 'preference', priority: 2 },
      { text: 'spoiler', role: 'excluded' },
    ],
  });
  const filteredUrl = ctx.buildScoutExactFilterUrl(
    'https://www.xvideos.com/?k=documentary+and+city+walk',
    recipe
  );
  const target = new URL(filteredUrl);
  assert.ok(target.hash.startsWith('#creamu-exact='));
  assert.equal(
    ctx.stripScoutExactFilterHash(filteredUrl),
    'https://www.xvideos.com/?k=documentary+and+city+walk'
  );
  assert.equal(
    ctx.stripScoutExactFilterHash('https://www.xvideos.com/?k=documentary#section'),
    'https://www.xvideos.com/?k=documentary#section'
  );
  const parsed = ctx.parseScoutExactFilterLocation(target);
  assert.ok(parsed);
  assert.equal(parsed.scope, 'xvideos:documentary city walk');
  assert.deepEqual(
    Array.from(parsed.recipe.conditions, (condition) => [
      condition.text,
      condition.role,
      condition.priority,
    ]),
    [
      ['documentary', 'required', 0],
      ['city walk', 'preference', 2],
      ['spoiler', 'excluded', 0],
    ]
  );
  assert.equal(ctx.parseScoutExactFilterLocation({ hash: '' }), null);
  assert.notEqual(
    ctx.getScoutExactFilterSearchScope('https://www.xvideos.com/?k=another+query'),
    parsed.scope
  );
});

test('exact-filter hashes reject malformed and oversized recipes', () => {
  const ctx = loadCore();
  assert.equal(ctx.parseScoutExactFilterLocation({ hash: '#creamu-exact=not-json' }), null);
  const conditions = Array.from({ length: 17 }, (_, index) => ({
    text: 'term ' + index,
    role: 'required',
  }));
  const payload = encodeURIComponent(JSON.stringify({
    version: 1,
    scope: 'xvideos:sample',
    sites: ['xvideos'],
    conditions,
  }));
  assert.equal(
    ctx.parseScoutExactFilterLocation({ hash: '#creamu-exact=' + payload }),
    null
  );
  assert.equal(
    ctx.buildScoutExactFilterUrl('https://www.xvideos.com/?k=sample', {
      sites: ['xvideos'],
      conditions: [{ text: 'blocked', role: 'excluded' }],
    }),
    'https://www.xvideos.com/?k=sample'
  );
});

test('exact-filter search scopes remain stable across three-site pagination', () => {
  const ctx = loadCore();
  runInContext(
    fs.readFileSync(path.join(partsDir, '20-sites.js'), 'utf8'),
    ctx,
    { filename: '20-sites.js' }
  );
  const recipe = {
    sites: ['xvideos', 'xnxx', 'eporner'],
    conditions: [
      { text: 'documentary', role: 'required' },
      { text: 'night', role: 'preference', priority: 1 },
    ],
  };
  const cases = [
    {
      url: 'https://www.xvideos.com/?k=documentary+and+night',
      page: 'https://www.xvideos.com/?k=documentary+and+night&p=3',
      scope: 'xvideos:documentary night',
    },
    {
      url: 'https://www.xnxx.com/search/documentary+and+night',
      page: 'https://www.xnxx.com/search/documentary+and+night/3',
      scope: 'xnxx:documentary night',
    },
    {
      url: 'https://www.eporner.com/tag/documentary-night/',
      page: 'https://www.eporner.com/tag/documentary-night/3/',
      scope: 'eporner:documentary night',
    },
  ];
  cases.forEach((entry) => {
    const filtered = new URL(ctx.buildScoutExactFilterUrl(entry.url, recipe));
    const parsed = ctx.parseScoutExactFilterLocation(filtered);
    assert.equal(parsed.scope, entry.scope);
    assert.equal(ctx.getScoutExactFilterSearchScope(entry.page), entry.scope);
  });
});

test('search plans prioritize full and single-term reduction probes', () => {
  const ctx = loadCore();
  ctx.buildSearchUrl = (site, query) => `https://${site}.example/search/${encodeURIComponent(query)}`;
  const documentary = ctx.addLexiconTerm({
    text: 'documentary',
    status: 'confirmed',
    aliases: [{ text: 'docu', sites: ['xnxx'], status: 'confirmed' }],
  });
  const recipe = ctx.normalizeScoutSearchRecipe({
    sites: ['xvideos', 'xnxx'],
    conditions: [
      { text: 'documentary', term_id: documentary.id, role: 'required' },
      { text: 'city walk', role: 'preference', priority: 1 },
      { text: 'night', role: 'preference', priority: 3 },
      { text: 'spoiler', role: 'excluded' },
    ],
  });
  const plan = ctx.buildScoutSearchPlan(recipe, { maxProbesPerSite: 5 });
  assert.equal(plan.probes.filter((probe) => probe.site === 'xvideos').length, 4);
  assert.equal(plan.probes.filter((probe) => probe.site === 'xnxx').length, 5);
  assert.equal(
    plan.probes.filter((probe) => probe.site === 'xvideos' && probe.level === 'reduced').length,
    3
  );
  assert.ok(plan.probes.some((probe) => probe.site === 'xnxx' && /docu/.test(probe.query)));
  assert.ok(plan.probes.some((probe) => (
    probe.level === 'reduced' && probe.removed_condition_ids.length === 1
  )));
  assert.ok(plan.probes.every((probe) => !/spoiler/i.test(probe.query)));
  assert.ok(plan.probes.every((probe) => probe.url.startsWith('https://')));
});

test('detail verification enforces required and excluded conditions', () => {
  const ctx = loadCore();
  const recipe = ctx.normalizeScoutSearchRecipe({
    sites: ['xvideos'],
    conditions: [
      { text: 'documentary', role: 'required' },
      { text: 'night', role: 'preference', priority: 1 },
      { text: 'spoiler', role: 'excluded' },
    ],
  });
  const candidate = ctx.evaluateScoutSearchResult(recipe, {
    site: 'xvideos',
    title: 'Documentary preview',
    tags: [],
    verified: false,
    remote_rank: 1,
  });
  assert.equal(candidate.evaluation.state, 'candidate');

  const verified = ctx.evaluateScoutSearchResult(recipe, {
    site: 'xvideos',
    title: 'Documentary at night',
    tags: ['city walk'],
    verified: true,
    remote_rank: 1,
  });
  assert.equal(verified.evaluation.state, 'verified');
  assert.equal(verified.evaluation.exact_match, true);
  assert.deepEqual(Array.from(verified.evaluation.preference_hit), ['night']);

  const partial = ctx.evaluateScoutSearchResult(recipe, {
    site: 'xvideos',
    title: 'Documentary preview',
    tags: [],
    verified: true,
    remote_rank: 2,
  });
  assert.equal(partial.evaluation.state, 'verified');
  assert.equal(partial.evaluation.exact_match, false);

  const rejected = ctx.evaluateScoutSearchResult(recipe, {
    site: 'xvideos',
    title: 'Documentary spoiler',
    tags: [],
    verified: true,
    remote_rank: 2,
  });
  assert.equal(rejected.evaluation.state, 'rejected');
  assert.equal(rejected.evaluation.exact_match, false);
  assert.deepEqual(Array.from(rejected.evaluation.excluded_hit), ['spoiler']);
});

test('exports preserve tracking and click state', () => {
  const ctx = loadCore();
  ctx.addLexiconTerm({ text: 'portrait', zh: '肖像' });
  const track = ctx.addTrack({
    site: 'xvideos',
    query: 'sample-query',
    label: 'Sample',
    url: 'https://www.xvideos.com/?k=sample-query',
  });
  ctx.updateTrack(track.id, { last_seen_item: 'video_1', last_seen_page: 4 });
  ctx.markVideoClicked({
    site: 'xvideos',
    videoId: '/video.sample/title',
    title: 'Sample title',
    url: 'https://www.xvideos.com/video.sample/title',
  });
  const recipe = ctx.saveScoutSearchDraft({
    label: 'Documentary night',
    sites: ['xvideos', 'xnxx'],
    conditions: [{ text: 'documentary', role: 'required' }],
  });
  ctx.saveScoutSearchRelations([{
    seed_key: 'documentary',
    seed_text: 'documentary',
    candidate_key: 'night',
    candidate: 'night',
    count: 3,
    sites: ['xvideos'],
  }]);

  const payload = JSON.parse(ctx.exportLexiconPackage());
  assert.equal(payload.format, 'creamu-scout-lexicon');
  assert.equal(payload.tracks[0].last_seen_page, 4);
  assert.equal(payload.tracks[0].last_seen_item, 'video_1');
  assert.equal(payload.clicks[0].id, '/video.sample/title');
  assert.equal(payload.search_draft.id, recipe.id);
  assert.equal(payload.search_relations[0].candidate, 'night');
});

test('structured import normalizes block entries', () => {
  const ctx = loadCore();
  const payload = {
    format: 'creamu-scout-ai',
    terms: [
      { text: 'portrait', zh: '肖像', type: '内容类' },
      { text: 'blocked-topic', zh: '屏蔽主题', note: '用于屏蔽' },
    ],
    blocks: [{
      reason: '内容过滤',
      mode: 'block',
      match: 'spoiler|clickbait',
      scope: 'all',
    }],
  };

  const result = ctx.importAiLexiconPackage(JSON.stringify(payload));
  assert.ok(result);
  assert.ok(ctx.getLexiconTerms().some((term) => term.text === 'portrait'));
  assert.ok(!ctx.getLexiconTerms().some((term) => term.text === 'blocked-topic'));
  const blocks = ctx.getBlockList();
  assert.ok(blocks.some((block) => block.text === 'blocked-topic'));
  assert.ok(blocks.some((block) => block.text === 'spoiler' && block.mode === 'hide' && block.scope === 'both'));
  assert.ok(blocks.some((block) => block.text === 'clickbait'));
});

test('work collection sanitizes imported tags', () => {
  const ctx = loadCore();
  const result = ctx.addWork({
    site: 'xvideos',
    videoId: '/video.sample/work',
    title: 'Sample work',
    url: 'https://www.xvideos.com/video.sample/work',
    tags: ['portrait', 'landscape＋✕', 'documentary'],
  }, { autoCollectTags: true });

  assert.ok(result.work && result.added);
  assert.equal(ctx.getWorks().length, 1);
  assert.ok(ctx.isWorkSaved('xvideos', '/video.sample/work'));
  const terms = ctx.getLexiconTerms().map((term) => term.text.toLowerCase());
  assert.ok(terms.includes('portrait'));
  assert.ok(terms.includes('landscape'));
  assert.ok(!terms.some((term) => /[＋✕]/.test(term)));
  assert.ok(ctx.removeWork(result.work.id));
});

test('replace import preserves local usage metrics', () => {
  const ctx = loadCore();
  const local = ctx.addLexiconTerm({ text: 'portrait', zh: '旧值', type: '内容类' });
  local.heat = 20;
  local.use = 7;
  ctx.saveLexiconTerms(ctx.getLexiconTerms());
  ctx.addLexiconTerm({ text: 'obsolete-term', zh: '旧词' });
  ctx.addBlockWord({ text: 'obsolete-block', mode: 'dim' });

  const result = ctx.importAiLexiconPackage(JSON.stringify({
    format: 'creamu-scout-ai',
    terms: [
      { text: 'portrait', zh: '肖像', type: '内容类', status: 'confirmed', heat: 1 },
      { text: 'landscape', zh: '风景', type: '内容类' },
    ],
    blocks: [{ text: 'spoiler', reason: '过滤', mode: 'hide', match: 'word', scope: 'both' }],
  }));

  assert.equal(result.mode, 'replace');
  const terms = ctx.getLexiconTerms();
  assert.equal(terms.length, 2);
  assert.ok(!terms.some((term) => term.text === 'obsolete-term'));
  const portrait = terms.find((term) => term.text === 'portrait');
  assert.equal(portrait.zh, '肖像');
  assert.equal(portrait.heat, 20);
  assert.equal(portrait.use, 7);
  assert.ok(!ctx.getBlockList().some((block) => block.text === 'obsolete-block'));
});

test('local term deduplication and blocked-term purge', () => {
  const ctx = loadCore();
  ctx.saveLexiconTerms([
    { id: 'a', text: 'portrait', zh: '肖像', type: '内容类', heat: 1, use: 0, status: 'confirmed' },
    { id: 'b', text: 'Portrait', zh: '', type: '未分类', heat: 4, use: 2, status: 'confirmed' },
    { id: 'c', text: 'portrait＋✕', zh: '', type: '未分类', heat: 1, use: 0, status: 'unreviewed' },
  ]);

  assert.ok(ctx.dedupeLexiconTermsStore() >= 2);
  assert.equal(ctx.getLexiconTerms().length, 1);
  ctx.addLexiconTerm({ text: 'landscape', zh: '风景' });
  ctx.addBlockWord({ text: 'portrait', mode: 'hide', match: 'word', scope: 'both' });
  assert.ok(ctx.purgeBlockedTermsFromLexicon() >= 1);
  assert.ok(!ctx.getLexiconTerms().some((term) => term.text === 'portrait'));
  assert.ok(ctx.getLexiconTerms().some((term) => term.text === 'landscape'));
});

test('click records stay independent from tracking breakpoints', () => {
  const ctx = loadCore();
  ctx.markVideoClicked({ site: 'xnxx', videoId: '/video-1', title: 'A' });
  ctx.markVideoClicked({ site: 'xnxx', videoId: '/video-1', title: 'A2' });

  assert.equal(ctx.getClickedCount(), 1);
  assert.ok(ctx.isVideoClicked('xnxx', '/video-1'));
  assert.equal(ctx.getTracks().length, 0);
  ctx.mergeClickRecords([{ site: 'xnxx', id: '/video-2', title: 'B', clicked_at: new Date().toISOString() }]);
  assert.equal(ctx.getClickedCount(), 2);
});

test('effective heat decays over time', () => {
  const ctx = loadCore();
  const heat = ctx.getEffectiveHeat({
    heat: 100,
    last_used_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  });
  assert.ok(heat < 100 && heat > 50);
});

test('prepared lexicon matching preserves hit sources and boundaries', () => {
  const ctx = loadCore();
  const terms = [
    { text: 'summer travel', zh: 'Summer Travel', status: 'confirmed', heat: 4 },
    { text: 'step mother', zh: 'Step Mother', status: 'confirmed', heat: 5 },
    { text: 'portrait', zh: 'Portrait', status: 'confirmed', heat: 2, loved: true },
    { text: 'channel one', zh: 'Channel One', status: 'confirmed', heat: 3 },
    { text: 'landscape demo', zh: 'Landscape Demo', status: 'confirmed', heat: 1 },
    { text: 'ass', zh: 'Boundary Guard', status: 'confirmed', heat: 10 },
  ];
  const meta = {
    title: 'A stepmother summer-travel portrait class',
    tags: [],
    uploader: 'Channel One',
    url: 'https://www.xvideos.com/video.demo/landscape.demo~extra',
  };

  const preparedTerms = ctx.prepareLexiconMatcher(terms);
  const direct = JSON.parse(JSON.stringify(ctx.matchLexiconHits(meta, { terms })));
  const prepared = JSON.parse(JSON.stringify(ctx.matchLexiconHits(meta, { preparedTerms })));
  assert.deepEqual(prepared, direct);
  assert.deepEqual(
    Object.fromEntries(prepared.hits.map((hit) => [hit.text, hit.via])),
    {
      portrait: 'title',
      'step mother': 'title',
      'summer travel': 'title',
      'channel one': 'uploader',
      'landscape demo': 'tag',
    }
  );
  assert.ok(!prepared.hits.some((hit) => hit.text === 'ass'));
});

console.log('\nScout site helpers');

function makeSearchSummaryDocument({ description = '', rows = 4, pageCount = 1, eporner = false }) {
  const cards = Array.from({ length: rows }, () => ({}));
  const lastPage = {
    className: 'last-page',
    textContent: String(pageCount),
    getAttribute(name) {
      if (name === 'href') return '/search/sample/' + pageCount;
      if (name === 'title') return 'Page ' + pageCount;
      return '';
    },
  };
  return {
    title: '',
    querySelector(selector) {
      if (selector === 'meta[name="description"]' && description) {
        return { getAttribute: () => description };
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector.includes('.pagination')) return pageCount > 1 ? [lastPage] : [];
      if (eporner && selector.includes('#vidresults .mb')) return cards;
      if (!eporner && selector.includes('.mozaique')) return cards;
      return [];
    },
  };
}

test('search summaries distinguish reported totals from pagination estimates', () => {
  const ctx = loadSites();
  const xvideos = ctx.getScoutSearchSummaryForSite(
    'xvideos',
    makeSearchSummaryDocument({ description: '12,345 sample FREE videos found for this search.' }),
    'https://www.xvideos.com/?k=sample'
  );
  assert.equal(xvideos.total, 12345);
  assert.equal(xvideos.total_kind, 'exact');

  const xnxx = ctx.getScoutSearchSummaryForSite(
    'xnxx',
    makeSearchSummaryDocument({ description: 'XNXX.COM sample videos', pageCount: 5 }),
    'https://www.xnxx.com/search/sample'
  );
  assert.equal(xnxx.total, 20);
  assert.equal(xnxx.total_kind, 'estimate');

  const eporner = ctx.getScoutSearchSummaryForSite(
    'eporner',
    makeSearchSummaryDocument({ description: 'We have 8,765 videos with Sample.', eporner: true }),
    'https://www.eporner.com/tag/sample/'
  );
  assert.equal(eporner.total, 8765);
  assert.equal(eporner.total_kind, 'exact');
});

test('site pagination uses each provider contract', () => {
  const ctx = loadSites();
  const xvideos = ctx.applyListPageToUrl('https://www.xvideos.com/?k=sample-query', 'xvideos', 3);
  assert.ok(xvideos.includes('p=2'));

  const eporner = ctx.applyListPageToUrl('https://www.eporner.com/tag/sample-query/', 'eporner', 4);
  assert.match(new URL(eporner).pathname, /\/tag\/sample-query\/4\/?$/);
  assert.ok(!/[?&]page=/.test(eporner));

  const xnxx = ctx.applyListPageToUrl('https://www.xnxx.com/search/sample-query', 'xnxx', 3);
  assert.match(xnxx, /\/search\/sample\+query\/3/);
  assert.ok(!/[?&]p=/.test(xnxx));
});

test('site paths round-trip search queries and pages', () => {
  const ctx = loadSites();
  const eporner = ctx.parseEpornerListPath('/tag/summer-travel/2/');
  assert.equal(eporner.query, 'summer travel');
  assert.equal(eporner.page, 2);
  assert.equal(ctx.epornerQueryToSlug('Summer Travel'), 'summer-travel');

  const xnxx = ctx.parseXnxxSearchPath('/search/summer+travel/3');
  assert.equal(xnxx.query, 'summer travel');
  assert.equal(xnxx.page, 3);
  const filtered = ctx.parseXnxxSearchPath('/search/0-10min/sample-query');
  assert.equal(filtered.query, 'sample query');
  assert.ok(filtered.filters.includes('0-10min'));
});

test('video ids remain compatible with legacy path values', () => {
  const ctx = loadSites();
  assert.equal(ctx.videoIdFromUrl('https://www.xnxx.com/video-1h4gc1b7/sample_slug'), '1h4gc1b7');
  assert.equal(ctx.videoIdFromUrl('https://www.xvideos.com/video.sample123/title'), 'sample123');
  assert.ok(ctx.videoIdsMatch('1h4gc1b7', '/video-1h4gc1b7/sample_slug'));
});

test('list page parsing converts provider offsets', () => {
  const xvideos = loadSites();
  assert.equal(xvideos.parseListPage('xvideos'), 3);

  const eporner = loadSites({
    hostname: 'www.eporner.com',
    href: 'https://www.eporner.com/tag/sample-query/2/',
    pathname: '/tag/sample-query/2/',
    search: '',
    origin: 'https://www.eporner.com',
  });
  assert.equal(eporner.parseListPage('eporner'), 2);
});

console.log('\nScout block matching');

test('word and substring matching remain distinct', () => {
  const ctx = loadCore();
  assert.equal(ctx.textMatchesBlock('unspoiled result', { text: 'spoil', match: 'word' }), false);
  assert.equal(ctx.textMatchesBlock('spoil the result', { text: 'spoil', match: 'word' }), true);
  assert.equal(ctx.textMatchesBlock('unspoiled result', { text: 'spoil', match: 'sub' }), true);
  assert.equal(ctx.textMatchesBlock('summer travel guide', { text: 'summer travel', match: 'word' }), true);
});

test('block scopes select title and uploader independently', () => {
  const ctx = loadCore();
  const metadata = { title: 'summer travel', uploader: 'BlockedChannel' };
  assert.equal(ctx.blockMatchesVideo(metadata, { text: 'BlockedChannel', match: 'word', scope: 'title' }), false);
  assert.equal(ctx.blockMatchesVideo(metadata, { text: 'BlockedChannel', match: 'word', scope: 'uploader' }), true);
  assert.equal(ctx.blockMatchesVideo(metadata, { text: 'travel', match: 'word', scope: 'both' }), true);
});

test('prepared block matching preserves word, substring, and scope rules', () => {
  const ctx = loadCore();
  const metadata = {
    title: 'A classy summer travel guide',
    uploader: 'Blocked Channel',
  };
  const blocks = [
    { text: 'ass', match: 'word', scope: 'title' },
    { text: 'class', match: 'sub', scope: 'title' },
    { text: 'summer travel', match: 'word', scope: 'title' },
    { text: 'Blocked Channel', match: 'word', scope: 'uploader' },
    { text: 'missing', match: 'sub', scope: 'both' },
  ];
  const preparedMeta = {
    title: ctx.normalizeBlockText(metadata.title),
    uploader: ctx.normalizeBlockText(metadata.uploader),
  };
  const prepared = ctx.prepareBlockMatchers(blocks);

  assert.equal(prepared.length, blocks.length);
  assert.deepEqual(
    prepared.map((matcher) => ctx.preparedBlockMatchesVideo(preparedMeta, matcher)),
    blocks.map((block) => ctx.blockMatchesVideo(metadata, block))
  );
  assert.deepEqual(
    prepared.map((matcher) => ctx.preparedBlockMatchesVideo(preparedMeta, matcher)),
    [false, true, true, true, false]
  );
});

test('publisher index keeps the first normalized name match', () => {
  const ctx = loadCore();
  const first = { id: 'first', name: 'Sample   Channel', status: 'loved' };
  const index = ctx.buildPublisherIndex([
    first,
    { id: 'second', name: 'sample channel', status: 'blocked' },
  ]);
  assert.equal(index.get(ctx.publisherIdentityKey(' SAMPLE CHANNEL ')), first);
});

test('theme visibility rules preserve blocked states', () => {
  const source = [
    '25-theme.js',
    '27-page-enhancement-theme.js',
    '29-site-layout-theme.js',
  ].map((filename) => fs.readFileSync(path.join(partsDir, filename), 'utf8')).join('\n');
  const siteTheme = fs.readFileSync(path.join(partsDir, '26-site-theme.js'), 'utf8');
  assert.ok(
    source.includes('.mb:not(.scout-blocked-hide)') ||
      source.includes('.mb[data-id]:not(.scout-blocked-hide)')
  );
  assert.ok(
    source.includes('.mb:not(.scout-blocked-dim)') ||
      source.includes('not(.scout-blocked-dim)')
  );
  assert.ok(source.includes('.scout-blocked-hide') && source.includes('.scout-blocked-dim'));
  assert.ok(siteTheme.includes('function applyScoutSiteTheme'));
  assert.ok(siteTheme.includes('function getScoutSitePageThemeCss'));
});

if (process.exitCode) {
  console.error('\nScout tests failed.');
  process.exit(1);
}

console.log('\nAll Scout public tests passed (' + passed + ')');
