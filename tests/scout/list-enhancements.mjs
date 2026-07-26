import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function extract(source, pattern, label) {
  const match = source.match(pattern);
  assert.ok(match, label + ' not found');
  return match[0];
}

const coreSource = [
  '10-core.js',
  '12-library-state.js',
  '14-tracking-state.js',
  '16-data-portability.js',
  '18-webdav.js',
]
  .map((file) => fs.readFileSync('packages/scout-commander/src/parts/' + file, 'utf8'))
  .join('\n');
const enhancementSource = fs.readFileSync(
  'packages/scout-commander/src/parts/31-list-enhancements.js',
  'utf8'
);
const themeSource = fs.readFileSync(
  'packages/scout-commander/src/parts/27-page-enhancement-theme.js',
  'utf8'
);

console.log('Scout list enhancement tests');

assert.doesNotMatch(
  enhancementSource,
  /\.style\.(?:cssText|display|opacity|pointerEvents|position|maxHeight|overflow)\s*=/
);
[
  '.scout-lex-flow-overlay {',
  '.scout-lex-overlay-positioned {',
  '.scout-lex-overlay-clipped {',
  '.scout-lex-flow-overlay .scout-lex-chip {',
].forEach((selector) => {
  assert.ok(themeSource.includes(selector), 'missing list component selector: ' + selector);
});
assert.ok(enhancementSource.includes("fab.classList.toggle('has-updates', blockedCount > 0)"));
console.log('  OK  list components keep presentation in the page theme');

const collectorSource = extract(
  enhancementSource,
  /function collectListVideoEntries[\s\S]*?(?=\nfunction applyListBlocks)/,
  'list video entry collector'
);
const collectorCounts = { elementReads: 0, parses: 0 };
const collectorItems = Array.from({ length: 12 }, (_, index) => ({
  nodeType: 1,
  id: index,
}));
const collectorContext = vm.createContext({
  Array,
  getVideoElements() {
    collectorCounts.elementReads += 1;
    return collectorItems;
  },
  parseVideoElement(item) {
    collectorCounts.parses += 1;
    return { title: 'Item ' + item.id };
  },
});
vm.runInContext(collectorSource, collectorContext);
const collectedEntries = collectorContext.collectListVideoEntries();
assert.equal(collectedEntries.length, collectorItems.length);
assert.deepEqual(collectorCounts, { elementReads: 1, parses: collectorItems.length });
console.log('  OK  list snapshot parses each card once');

const indexSource = extract(
  coreSource,
  /function addClickedVideoIdAliases[\s\S]*?(?=\nfunction isVideoClicked\()/,
  'clicked video index helpers'
);
let clickMapReads = 0;
const indexContext = vm.createContext({
  Set,
  Object,
  String,
  getClickMap() {
    clickMapReads += 1;
    return {
      'xnxx|legacy': {
        site: 'xnxx',
        id: '/video-1h4gc1b7/sample_slug',
      },
      'xvideos|other': {
        site: 'xvideos',
        id: '/video.other123/other_slug',
      },
    };
  },
  videoIdFromUrl(value) {
    const match = String(value || '').match(/\/video[-.]([a-z0-9]+)/i);
    return match ? match[1] : String(value || '');
  },
});
vm.runInContext(indexSource, indexContext);

const clickedIndex = indexContext.buildClickedVideoIdIndex('xnxx');
assert.equal(clickMapReads, 1, 'the click store should be read once per index');
assert.equal(indexContext.isVideoClickedInIndex(clickedIndex, '1h4gc1b7'), true);
assert.equal(
  indexContext.isVideoClickedInIndex(
    clickedIndex,
    'https://www.xnxx.com/video-1h4gc1b7/sample_slug'
  ),
  true
);
assert.equal(indexContext.isVideoClickedInIndex(clickedIndex, 'other123'), false);
console.log('  OK  clicked index normalizes legacy video paths');

const applySource = extract(
  enhancementSource,
  /function applyClickedEnhancements[\s\S]*?(?=\nfunction markCurrentVideoPageClicked)/,
  'clicked list enhancement'
);
const itemCount = 40;
const items = Array.from({ length: itemCount }, (_, index) => ({
  nodeType: 1,
  dataset: {},
  classList: { add() {} },
  querySelectorAll: () => [],
  addEventListener() {},
  meta: {
    title: 'Item ' + index,
    url: 'https://example.test/video-' + index,
    thumb: '',
    uploader: '',
  },
}));
const counts = {
  indexBuilds: 0,
  indexLookups: 0,
  legacyLookups: 0,
  openMode: 0,
  parses: 0,
};
const applyContext = vm.createContext({
  detectSite: () => 'xnxx',
  detectPageKind: () => 'search',
  getVideoElements: () => items,
  parseVideoElement() {
    counts.parses += 1;
    return null;
  },
  videoIdFromUrl: (url) => String(url).split('-').pop(),
  buildClickedVideoIdIndex() {
    counts.indexBuilds += 1;
    return new Set();
  },
  isVideoClickedInIndex() {
    counts.indexLookups += 1;
    return false;
  },
  isVideoClicked() {
    counts.legacyLookups += 1;
    return false;
  },
  markVideoClicked() {},
  applyVideoOpenMode() {
    counts.openMode += 1;
  },
});
vm.runInContext(applySource, applyContext);
const itemEntries = items.map((element) => ({ element, meta: element.meta }));
applyContext.applyClickedEnhancements(itemEntries);

assert.deepEqual(counts, {
  indexBuilds: 1,
  indexLookups: itemCount,
  legacyLookups: 0,
  openMode: 1,
  parses: 0,
});
console.log('  OK  list cards share one clicked-video index');

const blockSource = extract(
  enhancementSource,
  /function applyListBlocks[\s\S]*?(?=\n\/\*\*\n \* 列表影片链接)/,
  'list block enhancement'
);
const blockItemCount = 40;
const blockEntryCount = 25;
const blockItems = Array.from({ length: blockItemCount }, (_, index) => ({
  classList: { add() {}, remove() {} },
  querySelector: () => null,
  meta: {
    title: 'Ordinary title ' + index,
    uploader: 'Channel ' + index,
  },
}));
const blockEntries = Array.from({ length: blockEntryCount }, (_, index) => ({
  text: 'blocked phrase ' + index,
  mode: index % 5 === 0 ? 'hide' : 'dim',
  match: index % 3 === 0 ? 'sub' : 'word',
  scope: index % 2 === 0 ? 'title' : 'both',
}));
const blockCounts = {
  matcherBuilds: 0,
  publisherIndexes: 0,
  preparedMatches: 0,
  legacyMatches: 0,
  clears: 0,
  clicked: 0,
  flows: 0,
  sharedSnapshots: 0,
};
const blockSnapshot = blockItems.map((element) => ({ element, meta: element.meta }));
const blockContext = vm.createContext({
  getBlockList: () => blockEntries,
  getPublishers: () => [],
  prepareBlockMatchers(entries) {
    blockCounts.matcherBuilds += 1;
    return entries.map((block) => ({ block }));
  },
  buildPublisherIndex() {
    blockCounts.publisherIndexes += 1;
    return new Map();
  },
  getVideoElements: () => blockItems,
  parseVideoElement: (item) => item.meta,
  normalizeBlockText: (value) => String(value || '').trim().toLowerCase(),
  publisherIdentityKey: (value) => String(value || '').trim().toLowerCase(),
  preparedBlockMatchesVideo() {
    blockCounts.preparedMatches += 1;
    return false;
  },
  blockMatchesVideo() {
    blockCounts.legacyMatches += 1;
    return false;
  },
  clearListBlockPresentation() {
    blockCounts.clears += 1;
  },
  applyListBlockHide() {},
  applyListBlockDim() {},
  normalizeBlockMatch: () => 'word',
  normalizeBlockScope: () => 'title',
  document: { querySelector: () => null, createElement: () => ({}) },
  applyClickedEnhancements(entries) {
    assert.equal(entries, blockSnapshot);
    blockCounts.clicked += 1;
    blockCounts.sharedSnapshots += 1;
  },
  enhanceListLexiconHitFlows(entries) {
    assert.equal(entries, blockSnapshot);
    blockCounts.flows += 1;
    blockCounts.sharedSnapshots += 1;
  },
});
vm.runInContext(blockSource, blockContext);
blockContext.applyListBlocks(blockSnapshot);
assert.deepEqual(blockCounts, {
  matcherBuilds: 1,
  publisherIndexes: 1,
  preparedMatches: blockItemCount * blockEntryCount,
  legacyMatches: 0,
  clears: blockItemCount,
  clicked: 1,
  flows: 1,
  sharedSnapshots: 2,
});
console.log('  OK  list blocks share one matcher and publisher index');

const flowSource = extract(
  enhancementSource,
  /function clearListLexiconOverlays[\s\S]*$/,
  'list lexicon flow enhancement'
);
const matcherToken = [{ key: 'sample' }];
const flowCounts = {
  matcherBuilds: 0,
  matches: 0,
};
const flowItem = {
  nodeType: 1,
  closest: () => null,
  querySelectorAll: () => [],
  querySelector: () => null,
};
const flowContext = vm.createContext({
  console,
  URL,
  location: { origin: 'https://example.test' },
  window: {
    matchMedia: () => ({ matches: false }),
  },
  document: {
    createElement() {
      throw new Error('zero-hit cards should not create overlays');
    },
  },
  detectPageKind: () => 'search',
  getLexiconTerms: () => [{ text: 'sample', status: 'confirmed' }],
  prepareLexiconMatcher() {
    flowCounts.matcherBuilds += 1;
    return matcherToken;
  },
  getVideoElements: () => [flowItem],
  parseVideoElement: () => ({
    title: 'Sample title',
    url: 'https://example.test/video/sample-title',
    uploader: '',
  }),
  compactText: (value) => String(value || '').trim(),
  matchLexiconHits(meta, options) {
    flowCounts.matches += 1;
    assert.equal(options.preparedTerms, matcherToken);
    return { total: 0, hits: [] };
  },
});
vm.runInContext(flowSource, flowContext);
flowContext.enhanceListLexiconHitFlows([{
  element: flowItem,
  meta: {
    title: 'Sample title',
    url: 'https://example.test/video/sample-title',
    uploader: '',
  },
}]);
assert.deepEqual(flowCounts, { matcherBuilds: 1, matches: 1 });
console.log('  OK  list flow reuses one prepared lexicon matcher');

const renderCounts = {
  computedStyles: 0,
  htmlWrites: 0,
  removals: 0,
};
const renderFlow = {
  dataset: {},
  parentNode: null,
  classList: { contains: () => false },
  querySelectorAll: () => [],
  remove() {
    renderCounts.removals += 1;
  },
};
Object.defineProperty(renderFlow, 'innerHTML', {
  set() {
    renderCounts.htmlWrites += 1;
  },
});
const renderHostClasses = new Set();
const renderHost = {
  dataset: {},
  classList: {
    add(...names) {
      names.forEach((name) => renderHostClasses.add(name));
    },
    remove(...names) {
      names.forEach((name) => renderHostClasses.delete(name));
    },
    contains(name) {
      return renderHostClasses.has(name);
    },
  },
};
renderFlow.parentNode = renderHost;
const renderCard = {
  nodeType: 1,
  closest: () => null,
  querySelectorAll: () => [],
  querySelector(selector) {
    if (selector === '.scout-lex-flow-overlay') return renderFlow;
    if (selector === '.thumb-inside') return renderHost;
    return null;
  },
};
const renderState = {
  label: 'Sample',
  narrow: false,
  terms: [{ text: 'sample', status: 'confirmed' }],
  total: 1,
};
const renderContext = vm.createContext({
  console,
  window: {
    matchMedia: () => ({ matches: renderState.narrow }),
    getComputedStyle() {
      renderCounts.computedStyles += 1;
      return { position: 'static', overflow: 'visible' };
    },
  },
  document: {
    createElement() {
      throw new Error('the existing flow should be reused');
    },
    querySelectorAll(selector) {
      if (selector === '.scout-lex-flow-overlay') return [renderFlow];
      return [];
    },
  },
  detectPageKind: () => 'search',
  getLexiconTerms: () => renderState.terms,
  prepareLexiconMatcher: () => matcherToken,
  getVideoElements: () => [renderCard],
  parseVideoElement: () => ({
    title: 'Sample title',
    url: 'https://example.test/video/sample-title',
    uploader: '',
  }),
  compactText: (value) => String(value || '').trim(),
  matchLexiconHits: () => ({
    total: renderState.total,
    lovedCount: 0,
    hits: renderState.total
      ? [{ text: renderState.label, label: renderState.label, type: 'topic', via: 'title' }]
      : [],
  }),
  buildLexiconHitFlowHtml: () => '<span class="scout-lex-flow-chips"></span>',
});
vm.runInContext(flowSource, renderContext);
const renderEntries = [{
  element: renderCard,
  meta: {
    title: 'Sample title',
    url: 'https://example.test/video/sample-title',
    uploader: '',
  },
}];
renderContext.enhanceListLexiconHitFlows(renderEntries);
renderContext.enhanceListLexiconHitFlows(renderEntries);
assert.deepEqual(renderCounts, { computedStyles: 1, htmlWrites: 1, removals: 0 });
assert.deepEqual(
  [...renderHostClasses].sort(),
  ['scout-lex-overlay-clipped', 'scout-lex-overlay-host', 'scout-lex-overlay-positioned']
);
renderState.label = 'Updated';
renderContext.enhanceListLexiconHitFlows(renderEntries);
assert.deepEqual(renderCounts, { computedStyles: 1, htmlWrites: 2, removals: 0 });
renderState.narrow = true;
renderContext.enhanceListLexiconHitFlows(renderEntries);
assert.deepEqual(renderCounts, { computedStyles: 2, htmlWrites: 3, removals: 0 });
renderState.terms = [];
renderContext.enhanceListLexiconHitFlows(renderEntries);
assert.deepEqual(renderCounts, { computedStyles: 2, htmlWrites: 3, removals: 1 });
assert.deepEqual([...renderHostClasses], []);
assert.equal(renderHost.dataset.scoutLexOverlayMode, undefined);
console.log('  OK  unchanged list flows reuse layout state and clear stale overlays');
console.log('Scout list enhancement tests OK (7 cases)');
