import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(
  'packages/scout-commander/src/parts/33-detail-enhancements.js',
  'utf8'
);
const themeSource = fs.readFileSync(
  'packages/scout-commander/src/parts/27-page-enhancement-theme.js',
  'utf8'
);

const helperMatch = source.match(
  /function findPreparedTagBlock[\s\S]*?(?=\nfunction applyTagVisualState)/
);
const visualMatch = source.match(
  /function applyTagVisualState[\s\S]*?(?=\nfunction enhancePageTags)/
);
const pageMatch = source.match(
  /let __scoutPageTagSignature[\s\S]*?(?=\nfunction enhancePageWorkFavorite)/
);
assert.ok(helperMatch && visualMatch && pageMatch, 'detail enhancement source not found');

console.log('Scout detail enhancement tests');

assert.doesNotMatch(source, /\bstyle\s*=|\.style\./);
[
  '.scout-tag-add-action {',
  '.scout-tag-block-action {',
  '.scout-pub-addon {',
  '.scout-pub-addon .scout-pub-action {',
  '.scout-pub-addon .scout-pub-love-action.is-loved {',
].forEach((selector) => {
  assert.ok(themeSource.includes(selector), 'missing detail component selector: ' + selector);
});
assert.ok(source.includes("addBtn.className = 'scout-tag-action scout-tag-add-action'"));
assert.ok(source.includes("loveBtn.className = 'scout-pub-action scout-pub-love-action'"));
console.log('  OK  detail components keep presentation in the page theme');

const preparedTerms = [{ term: { text: 'sample' } }];
const observed = [];
const classes = new Set();
const anchor = {
  classList: {
    remove(...names) {
      names.forEach((name) => classes.delete(name));
    },
    add(...names) {
      names.forEach((name) => classes.add(name));
    },
  },
  querySelector() {
    return null;
  },
  setAttribute() {},
};
const visualContext = vm.createContext({
  console,
  String,
  Map,
  compactText: (value) => String(value || '').trim(),
  normalizeBlockText: (value) => String(value || '').trim().toLowerCase(),
  lexiconIdentityKey: (value) => String(value || '').toLowerCase(),
  preparedBlockTextMatches: () => false,
  matchLexiconHits(meta, options) {
    observed.push(options);
    return { hits: [], total: 0, lovedCount: 0 };
  },
});
vm.runInContext(helperMatch[0] + '\n' + visualMatch[0], visualContext);
visualContext.applyTagVisualState(anchor, 'unknown', new Map(), [], preparedTerms);

assert.equal(observed.length, 1);
assert.equal(observed[0].preparedTerms, preparedTerms);
console.log('  OK  detail tag fallback reuses prepared terms');

function makeAnchor() {
  const attrs = new Map([
    ['data-scout-tag', 'sample'],
    ['href', '/tag/sample'],
  ]);
  const addon = {};
  const localClasses = new Set();
  return {
    classList: {
      remove(...names) {
        names.forEach((name) => localClasses.delete(name));
      },
      add(...names) {
        names.forEach((name) => localClasses.add(name));
      },
    },
    querySelector(selector) {
      if (selector === '.scout-tag-addon') return addon;
      return null;
    },
    getAttribute(name) {
      return attrs.get(name) || '';
    },
    setAttribute(name, value) {
      attrs.set(name, String(value));
    },
    textContent: 'sample',
  };
}

let currentAnchor = makeAnchor();
let currentTerms = [{
  id: 'sample',
  text: 'sample',
  zh: '',
  type: '主题',
  status: 'confirmed',
  loved: false,
  heat: 1,
  use: 0,
  good: 0,
  bad: 0,
  updated_at: '1',
}];
const pageCounts = {
  matcherBuilds: 0,
  blockMatcherBuilds: 0,
  flowCalls: 0,
  metaScrapes: 0,
};
const pageContext = vm.createContext({
  console,
  String,
  Map,
  WeakMap,
  JSON,
  location: { href: 'https://www.xvideos.com/video.sample/title' },
  window: {
    innerWidth: 1280,
    matchMedia: () => ({ matches: false }),
  },
  document: {
    querySelectorAll: () => [currentAnchor],
  },
  setTimeout(callback) {
    callback();
    return 1;
  },
  detectSite: () => 'xvideos',
  detectPageKind: () => 'video',
  enhancePageLexiconHitFlow() {
    pageCounts.flowCalls += 1;
  },
  scrapeVideoMeta() {
    pageCounts.metaScrapes += 1;
    return { title: 'Sample', uploader: '', tags: [] };
  },
  getLexiconTerms: () => currentTerms,
  getBlockList: () => [],
  prepareLexiconMatcher(terms) {
    pageCounts.matcherBuilds += 1;
    return terms.map((term) => ({ term, key: 'sample', compactKey: 'sample' }));
  },
  buildLexiconTermIndex(prepared) {
    return new Map(prepared.map((entry) => [String(entry.term.text).toLowerCase(), entry.term]));
  },
  prepareBlockMatchers() {
    pageCounts.blockMatcherBuilds += 1;
    return [];
  },
  normalizeBlockText: (value) => String(value || '').trim().toLowerCase(),
  preparedBlockTextMatches: () => false,
  tagTextFromAnchor: (a) => a.getAttribute('data-scout-tag'),
  sanitizeLexiconText: (value) => String(value || '').trim(),
  compactText: (value) => String(value || '').trim(),
  lexiconIdentityKey: (value) => String(value || '').toLowerCase(),
  matchLexiconHits: () => ({ hits: [], total: 0 }),
});
vm.runInContext(pageMatch[0], pageContext);

pageContext.enhancePageTags();
pageContext.enhancePageTags();
assert.deepEqual(pageCounts, {
  matcherBuilds: 1,
  blockMatcherBuilds: 1,
  flowCalls: 2,
  metaScrapes: 1,
});

currentTerms = [{ ...currentTerms[0], type: '更新' }];
pageContext.enhancePageTags();
assert.equal(pageCounts.matcherBuilds, 2, 'term metadata changes should refresh detail tags');
assert.equal(pageCounts.metaScrapes, 2);

currentAnchor = makeAnchor();
pageContext.enhancePageTags();
assert.equal(pageCounts.matcherBuilds, 3, 'replaced tag nodes should refresh detail tags');
assert.equal(pageCounts.metaScrapes, 3);
console.log('  OK  stable detail tags skip duplicate matcher and DOM work');

const detailSignatureMatch = source.match(/let __scoutNextDetailNodeId[\s\S]*$/);
assert.ok(detailSignatureMatch, 'detail lifecycle signature not found');

function makeDetailNode(text, href = '') {
  return {
    textContent: text,
    dataset: {},
    getAttribute(name) {
      return name === 'href' ? href : '';
    },
    querySelector() {
      return null;
    },
  };
}

const detailState = {
  revision: 0,
  anchor: makeDetailNode('sample', '/tag/sample'),
  description: makeDetailNode('A stable description'),
  favoriteHost: makeDetailNode('Sample title'),
  favoriteButton: { dataset: { scoutSite: 'xvideos', scoutVideoId: 'sample' } },
  publisherAddon: { dataset: { scoutLibraryRevision: '0' } },
  publisherAnchor: makeDetailNode('Studio', '/profile/studio'),
};
detailState.publisherAnchor.parentNode = {
  querySelector(selector) {
    return selector === '.scout-pub-addon' ? detailState.publisherAddon : null;
  },
};
const detailContext = vm.createContext({
  console,
  JSON,
  Math,
  String,
  WeakMap,
  location: { href: 'https://www.xvideos.com/video.sample/title' },
  window: { innerWidth: 1280, matchMedia: () => ({ matches: false }) },
  document: {
    getElementById(id) {
      if (id === 'scout-work-fav-btn') return detailState.favoriteButton;
      return null;
    },
  },
  detectSite: () => 'xvideos',
  detectPageKind: () => 'video',
  getScoutPageTagAnchors: () => [detailState.anchor],
  getScoutEnhanceTagText: (node) => node.textContent,
  getScoutDetailTagBoxes: () => [],
  getScoutDetailDescriptionBoxes: () => [detailState.description],
  findScoutWorkFavoriteHost: () => detailState.favoriteHost,
  findScoutPublisherAnchor: () => detailState.publisherAnchor,
  getScoutLibraryRevision: () => detailState.revision,
});
vm.runInContext(detailSignatureMatch[0], detailContext);

const firstDetailSignature = detailContext.getScoutDetailContentSignature();
assert.equal(detailContext.getScoutDetailContentSignature(), firstDetailSignature);
detailState.revision += 1;
assert.notEqual(detailContext.getScoutDetailContentSignature(), firstDetailSignature);
const revisedDetailSignature = detailContext.getScoutDetailContentSignature();
detailState.description.textContent = 'A changed description';
assert.notEqual(detailContext.getScoutDetailContentSignature(), revisedDetailSignature);
detailState.description.textContent = 'A stable description';
detailState.anchor = makeDetailNode('sample', '/tag/sample');
assert.notEqual(detailContext.getScoutDetailContentSignature(), revisedDetailSignature);
console.log('  OK  detail lifecycle signature tracks structure, content, and data revisions');

console.log('Scout detail enhancement tests OK (4 cases)');
