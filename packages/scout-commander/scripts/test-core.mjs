import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const partsDir = path.join(dirname, '..', 'src', 'parts');
const store = new Map();

function loadCore() {
  store.clear();
  const source = fs.readFileSync(path.join(partsDir, '10-core.js'), 'utf8');
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
    GM_getValue(key, fallback) {
      return store.has(key) ? store.get(key) : fallback;
    },
    GM_setValue(key, value) {
      store.set(key, value);
    },
    createCreamuWebDavSync: undefined,
    scoutSync: null,
  });
  runInContext(source, context, { filename: '10-core.js' });
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

  const payload = JSON.parse(ctx.exportLexiconPackage());
  assert.equal(payload.format, 'creamu-scout-lexicon');
  assert.equal(payload.tracks[0].last_seen_page, 4);
  assert.equal(payload.tracks[0].last_seen_item, 'video_1');
  assert.equal(payload.clicks[0].id, '/video.sample/title');
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

console.log('\nScout site helpers');

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

test('theme visibility rules preserve blocked states', () => {
  const source = fs.readFileSync(path.join(partsDir, '25-theme.js'), 'utf8');
  assert.ok(
    source.includes('.mb:not(.scout-blocked-hide)') ||
      source.includes('.mb[data-id]:not(.scout-blocked-hide)')
  );
  assert.ok(
    source.includes('.mb:not(.scout-blocked-dim)') ||
      source.includes('not(.scout-blocked-dim)')
  );
  assert.ok(source.includes('.scout-blocked-hide') && source.includes('.scout-blocked-dim'));
});

if (process.exitCode) {
  console.error('\nScout tests failed.');
  process.exit(1);
}

console.log('\nAll Scout public tests passed (' + passed + ')');
