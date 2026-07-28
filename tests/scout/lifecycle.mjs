import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(
  'packages/scout-commander/src/parts/48-page-lifecycle.js',
  'utf8'
);
const bootSource = fs.readFileSync(
  'packages/scout-commander/src/parts/50-boot.js',
  'utf8'
);
assert.ok(source.includes('function setupScoutPageLifecycle'), 'Scout lifecycle source not found');

function createElement(classNames = []) {
  const classes = new Set(classNames);
  return {
    nodeType: 1,
    id: '',
    classList: {
      contains(name) {
        return classes.has(name);
      },
    },
    closest(selector) {
      for (const name of classes) {
        if (selector.includes('.' + name)) return this;
      }
      return null;
    },
  };
}

function createHarness() {
  const bodyClasses = new Set();
  const counts = {
    blocks: 0,
    detailPublishers: 0,
    detailSignatures: 0,
    detailTags: 0,
    exactFilters: 0,
    flows: 0,
    previews: 0,
    parses: 0,
    scheduled: 0,
    snapshots: 0,
  };
  const state = {
    detailSignature: 'detail:1',
    kind: 'search',
    items: [{ meta: { title: 'Alpha', url: 'https://example.test/video/alpha', uploader: 'One' } }],
    intervalCallback: null,
    observerCallback: null,
    timeoutCallbacks: [],
  };
  const document = {
    body: {
      classList: {
        contains(name) {
          return bodyClasses.has(name);
        },
        add(name) {
          bodyClasses.add(name);
        },
        remove(name) {
          bodyClasses.delete(name);
        },
      },
    },
    documentElement: {},
    getElementById() {
      return null;
    },
  };
  const window = {
    __scoutUiMutating: false,
    innerWidth: 1280,
    addEventListener() {},
  };
  const context = vm.createContext({
    console,
    document,
    window,
    location: { href: 'https://example.test/search?q=alpha' },
    history: {
      pushState() {},
      replaceState() {},
    },
    MutationObserver: class {
      constructor(callback) {
        state.observerCallback = callback;
      }
      observe() {}
    },
    setTimeout(callback) {
      counts.scheduled += 1;
      state.timeoutCallbacks.push(callback);
      return counts.scheduled;
    },
    clearTimeout() {},
    setInterval(callback, delay) {
      assert.equal(delay, 8000);
      state.intervalCallback = callback;
      return 1;
    },
    detectSite: () => 'xvideos',
    detectPageKind: () => state.kind,
    getVideoElements: () => state.items,
    parseVideoElement: (item) => item.meta,
    collectListVideoEntries() {
      counts.snapshots += 1;
      return state.items.map((element) => {
        counts.parses += 1;
        return { element, meta: element.meta };
      });
    },
    isScoutMobileListViewport: () => false,
    getScoutDetailContentSignature() {
      counts.detailSignatures += 1;
      return state.detailSignature;
    },
    applyListBlocks(entries) {
      assert.equal(entries.length, state.items.length);
      counts.blocks += 1;
      counts.flows += 1;
    },
    applyScoutExactSearchFilter(entries) {
      assert.equal(entries.length, state.kind === 'search' ? state.items.length : 0);
      counts.exactFilters += 1;
    },
    enhanceListLexiconHitFlows() {
      counts.flows += 1;
    },
    enhanceSearchTrackSubscribe() {},
    applyListPreviewPlaybackMode() {
      counts.previews += 1;
    },
    checkSearchTrackingBreakpoints() {},
    pauseSiteListPreviewVideos() {},
    applyClickedEnhancements() {},
    markCurrentVideoPageClicked() {},
    enhancePageTags() {
      counts.detailTags += 1;
    },
    enhancePagePublisher() {
      counts.detailPublishers += 1;
    },
    stopListPreview() {},
  });

  vm.runInContext(source, context, { filename: '48-page-lifecycle.js' });
  return { context, counts, state };
}

let passed = 0;

function test(name, run) {
  try {
    run();
    passed += 1;
    console.log('  OK  ' + name);
  } catch (error) {
    console.error('  FAIL  ' + name);
    console.error('       ', error.message);
    process.exitCode = 1;
  }
}

console.log('Scout lifecycle tests');

test('search refresh owns one lexicon flow pass', () => {
  const { context, counts } = createHarness();
  context.refreshPageEnhancements('boot');
  assert.equal(counts.blocks, 1);
  assert.equal(counts.flows, 1);
  assert.equal(counts.exactFilters, 1);
  assert.equal(counts.snapshots, 1);
  assert.equal(counts.parses, 1);
});

test('observer ignores UI children and coalesces site mutations', () => {
  const { context, counts, state } = createHarness();
  context.setupScoutPageLifecycle();
  const card = createElement(['thumb-block']);
  const flow = createElement(['scout-lex-flow-card']);
  state.observerCallback([{ target: card, addedNodes: [flow], removedNodes: [] }]);
  assert.equal(counts.scheduled, 0);

  const exactBar = createElement();
  exactBar.id = 'scout-exact-filter-bar';
  state.observerCallback([{ target: card, addedNodes: [exactBar], removedNodes: [] }]);
  assert.equal(counts.scheduled, 0, 'exact-filter status changes should stay inside the UI boundary');

  const workbench = createElement();
  workbench.id = 'jlc-wb';
  state.observerCallback([{
    target: workbench,
    addedNodes: [],
    removedNodes: [createElement(['jlc-wb-item'])],
  }]);
  assert.equal(counts.scheduled, 0, 'workbench replacements should stay inside the UI boundary');

  const siteItem = createElement(['thumb-block']);
  state.observerCallback([{ target: card, addedNodes: [siteItem], removedNodes: [] }]);
  assert.equal(counts.scheduled, 1);
  state.observerCallback([{ target: card, addedNodes: [createElement(['thumb-block'])], removedNodes: [] }]);
  assert.equal(counts.scheduled, 1, 'pending refresh should not be postponed by later mutations');

  state.timeoutCallbacks.shift()();
  assert.equal(counts.blocks, 1);
  state.observerCallback([{ target: card, addedNodes: [createElement(['thumb-block'])], removedNodes: [] }]);
  assert.equal(counts.scheduled, 2, 'a new burst should schedule after the prior refresh');
});

test('polling skips stable lists and refreshes changed content', () => {
  const { context, counts, state } = createHarness();
  context.setupScoutPageLifecycle();
  context.refreshPageEnhancements('boot');
  counts.blocks = 0;
  counts.flows = 0;
  counts.previews = 0;
  counts.parses = 0;
  counts.snapshots = 0;

  state.intervalCallback();
  assert.equal(counts.blocks, 0, 'stable list should not be rescanned');
  assert.deepEqual(
    { snapshots: counts.snapshots, parses: counts.parses },
    { snapshots: 1, parses: 1 },
    'stable polling should build one signature snapshot'
  );

  state.items[0].meta.title = 'Updated Alpha';
  state.intervalCallback();
  assert.equal(counts.blocks, 1, 'metadata changes should refresh the list');
  assert.equal(counts.previews, 1, 'content refresh should restore preview bindings');
  assert.deepEqual(
    { snapshots: counts.snapshots, parses: counts.parses },
    { snapshots: 2, parses: 2 },
    'changed polling should reuse its signature snapshot during refresh'
  );
});

test('polling recognizes replaced cards with identical metadata', () => {
  const { context, counts, state } = createHarness();
  context.setupScoutPageLifecycle();
  context.refreshPageEnhancements('boot');
  counts.blocks = 0;
  state.items = [{ meta: { ...state.items[0].meta } }];
  state.intervalCallback();
  assert.equal(counts.blocks, 1);
});

test('detail polling skips stable pages and refreshes structural changes', () => {
  const { context, counts, state } = createHarness();
  state.kind = 'video';
  context.location.href = 'https://example.test/video.alpha/title';
  context.setupScoutPageLifecycle();
  context.refreshPageEnhancements('boot');
  assert.deepEqual(
    {
      publishers: counts.detailPublishers,
      signatures: counts.detailSignatures,
      tags: counts.detailTags,
    },
    { publishers: 1, signatures: 1, tags: 1 }
  );

  counts.detailPublishers = 0;
  counts.detailSignatures = 0;
  counts.detailTags = 0;
  state.intervalCallback();
  assert.deepEqual(
    {
      publishers: counts.detailPublishers,
      signatures: counts.detailSignatures,
      tags: counts.detailTags,
    },
    { publishers: 0, signatures: 1, tags: 0 },
    'stable detail polling should only read the structural signature'
  );

  counts.detailSignatures = 0;
  state.detailSignature = 'detail:2';
  state.intervalCallback();
  assert.deepEqual(
    {
      publishers: counts.detailPublishers,
      signatures: counts.detailSignatures,
      tags: counts.detailTags,
    },
    { publishers: 1, signatures: 2, tags: 1 },
    'changed detail polling should refresh once and remember the enhanced structure'
  );
});

test('boot delegates list setup to the lifecycle refresh', () => {
  const match = bootSource.match(/function bootCreamuScout[\s\S]*?(?=\nif \(document\.readyState)/);
  assert.ok(match, 'Scout boot function not found');
  const calls = { libraryListeners: 0, openMode: 0, refresh: 0 };
  const context = vm.createContext({
    console,
    document: { body: { classList: { add() {} } } },
    detectSite: () => 'xvideos',
    initScoutWebDav() {},
    initScoutWorkbench() {},
    setupScoutStorageChangeListeners() {
      calls.libraryListeners += 1;
    },
    applyScoutSiteTheme() {},
    purgeBlockedTermsFromLexicon() {},
    dedupeLexiconTermsStore() {},
    dedupeBlockListStore() {},
    setupScoutPageLifecycle() {},
    refreshPageEnhancements() {
      calls.refresh += 1;
    },
    applyVideoOpenMode() {
      calls.openMode += 1;
    },
    scoutSync: null,
  });
  vm.runInContext(match[0], context, { filename: '50-boot.js' });
  context.bootCreamuScout();
  assert.deepEqual(calls, { libraryListeners: 1, openMode: 0, refresh: 1 });
});

if (!process.exitCode) {
  console.log(`Scout lifecycle tests OK (${passed} cases)`);
}
