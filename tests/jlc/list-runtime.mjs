import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const packageRoot = path.join(root, 'packages/jlc-commander');
const partsRoot = path.join(packageRoot, 'src/parts');
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'src/parts.manifest.json'), 'utf8'));
const lazySource = fs.readFileSync(path.join(partsRoot, '19-cover-lazy-loader.js'), 'utf8');
const downloadSource = fs.readFileSync(path.join(partsRoot, '59-cover-download.js'), 'utf8');
const listSource = fs.readFileSync(path.join(partsRoot, '60-list-runtime.js'), 'utf8');
const coreSource = fs.readFileSync(path.join(partsRoot, '10-core.js'), 'utf8');

assert.deepEqual(
  manifest.parts.filter(filename => /^(19|59|60)-/.test(filename)),
  ['19-cover-lazy-loader.js', '59-cover-download.js', '60-list-runtime.js'],
  'cover and list runtime modules should remain in dependency order'
);
assert.doesNotMatch(coreSource, /vanilla-lazyload|class LazyLoad|function\(n,t\).*LazyLoad/);
assert.doesNotMatch(listSource, /new LazyLoad|class (?:InputTagPanel|TabPanel|DownloadPanel)/);
assert.match(listSource, /new CoverLazyLoader/);
assert.match(downloadSource, /jszip@3\.10\.1/);
assert.doesNotMatch(downloadSource, /FileSaver|saveAs\(/);

function createFakeImage(source) {
  const attributes = new Map([['data-src', source]]);
  const listeners = new Map();
  const classes = new Set(['lazy']);
  return {
    nodeType: 1,
    complete: false,
    naturalWidth: 0,
    matches(selector) {
      return selector === 'img.lazy[data-src]';
    },
    querySelectorAll() {
      return [];
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    addEventListener(name, callback) {
      listeners.set(name, callback);
    },
    removeEventListener(name, callback) {
      if (listeners.get(name) === callback) listeners.delete(name);
    },
    classList: {
      add(name) {
        classes.add(name);
      },
      remove(name) {
        classes.delete(name);
      },
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      },
    },
    attributes,
    listeners,
  };
}

const lazyContext = {
  document: { nodeType: 9, querySelectorAll: () => [] },
  queueMicrotask,
};
vm.createContext(lazyContext);
vm.runInContext(`${lazySource}\nthis.CoverLazyLoader = CoverLazyLoader;`, lazyContext);

let loadedCount = 0;
const loader = new lazyContext.CoverLazyLoader({ callback_loaded: () => { loadedCount += 1; } });
const image = createFakeImage('https://img.example.test/cover.jpg');
const jqueryLikeRoot = { toArray: () => [image] };
assert.equal(loader.update(jqueryLikeRoot), 1);
assert.equal(image.attributes.get('loading'), 'lazy');
assert.equal(image.attributes.get('decoding'), 'async');
assert.equal(image.attributes.get('src'), 'https://img.example.test/cover.jpg');
assert.equal(loader.update(jqueryLikeRoot), 0, 'an already-bound image must not receive duplicate listeners');
image.listeners.get('load')();
assert.equal(loadedCount, 1);
assert.equal(image.classList.contains('loaded'), true);
assert.equal(image.classList.contains('loading'), false);

const scrollerMatch = listSource.match(/class ScrollerPlugin[\s\S]*?(?=\r?\n\s*const addStyle)/);
assert.ok(scrollerMatch, 'ScrollerPlugin not found');
let warned = 0;
let clearedTimeout = null;
let animationCallback = null;
let animationRequests = 0;
const scrollerContext = {
  AbortController,
  fetch: async () => { throw new Error('network down'); },
  console: { warn: () => { warned += 1; } },
  window: {
    innerHeight: 800,
    setTimeout: () => 17,
    clearTimeout: id => { clearedTimeout = id; },
    requestAnimationFrame(callback) {
      animationRequests += 1;
      animationCallback = callback;
      return 23;
    },
  },
};
vm.createContext(scrollerContext);
vm.runInContext(`${scrollerMatch[0]}\nthis.ScrollerPlugin = ScrollerPlugin;`, scrollerContext);

const failedScroller = Object.assign(Object.create(scrollerContext.ScrollerPlugin.prototype), {
  destroyed: false,
  locked: false,
  canLoad: true,
  abortController: null,
  statuses: [],
  showStatus(status) {
    this.statuses.push(status);
  },
});
assert.equal(await failedScroller.loadNextPage('/page/2'), false);
assert.equal(failedScroller.locked, false, 'a failed page request must release the load lock');
assert.deepEqual(failedScroller.statuses, ['request', 'error']);
assert.equal(clearedTimeout, 17);
assert.equal(warned, 1);

let requestedUrl = '';
const scrollProbe = Object.assign(Object.create(scrollerContext.ScrollerPlugin.prototype), {
  destroyed: false,
  scrollFrame: null,
  locked: false,
  canLoad: true,
  nextURL: '/page/3',
  $page: { get: () => ({ getBoundingClientRect: () => ({ top: 950 }) }) },
  loadNextPage(url) {
    requestedUrl = url;
    return Promise.resolve(true);
  },
});
scrollProbe.domWatch();
scrollProbe.domWatch();
assert.equal(animationRequests, 1, 'scroll checks should be coalesced into one animation frame');
animationCallback();
assert.equal(requestedUrl, '/page/3');

const sanitizeMatch = downloadSource.match(/function sanitizeCoverFilename[\s\S]*?(?=\r?\n\s*function saveCoverArchive)/);
assert.ok(sanitizeMatch, 'sanitizeCoverFilename not found');
const sanitizeContext = {};
vm.createContext(sanitizeContext);
vm.runInContext(`${sanitizeMatch[0]}\nthis.sanitizeCoverFilename = sanitizeCoverFilename;`, sanitizeContext);
assert.equal(sanitizeContext.sanitizeCoverFilename(' ABP-001 A/B:*? '), 'ABP-001 A_B___');
assert.equal(sanitizeContext.sanitizeCoverFilename('...'), 'cover');

const poolMatch = downloadSource.match(/class CoverDownloadPanel[\s\S]*?(?=\r?\n\s*class CoverDownloadDialog)/);
assert.ok(poolMatch, 'CoverDownloadPanel not found');
const poolContext = {};
vm.createContext(poolContext);
vm.runInContext(`${poolMatch[0]}\nthis.CoverDownloadPanel = CoverDownloadPanel;`, poolContext);
const pool = Object.create(poolContext.CoverDownloadPanel.prototype);
let active = 0;
let maxActive = 0;
await pool.asyncPool(2, [1, 2, 3, 4, 5], async () => {
  active += 1;
  maxActive = Math.max(maxActive, active);
  await new Promise(resolve => setTimeout(resolve, 1));
  active -= 1;
});
assert.equal(maxActive, 2, 'cover downloads should respect the concurrency limit');

console.log('JLC list runtime tests OK');
