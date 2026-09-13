import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const packageRoot = path.join(root, 'packages/jlc-commander');
const partsRoot = path.join(packageRoot, 'src/parts');
const manifest = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'src/parts.manifest.json'), 'utf8')
);
const expectedParts = [
  '50-resource-center.js',
  '51-resource-trailer.js',
  '52-resource-magnets.js',
  '52-resource-subtitles.js',
  '53-resource-sections.js',
  '54-resource-runtime.js',
  '55-site-registry.js',
];

console.log('JLC resource center modules');

assert.deepEqual(
  manifest.parts.filter((filename) => /^5[0-5]-/.test(filename)),
  expectedParts,
  'resource center parts should remain in runtime dependency order'
);

const sources = Object.fromEntries(
  expectedParts.map((filename) => [
    filename,
    fs.readFileSync(path.join(partsRoot, filename), 'utf8'),
  ])
);
assert.match(sources[expectedParts[0]], /function getCurrentDetailContext/);
assert.match(sources[expectedParts[0]], /function scheduleResourceSectionLoad/);
assert.doesNotMatch(sources[expectedParts[0]], /async function resolveTrailerSources/);
assert.match(sources[expectedParts[1]], /async function resolveTrailerSources/);
assert.match(sources[expectedParts[2]], /async function fetchSupplementalMagnetInfo/);
assert.match(sources[expectedParts[2]], /function renderMagnetSection/);
assert.match(sources[expectedParts[3]], /async function fetchSupplementalSubtitleInfo/);
assert.match(sources[expectedParts[3]], /function renderSubtitleSection/);
assert.match(sources[expectedParts[4]], /function renderTrailerSection/);
assert.match(sources[expectedParts[4]], /function renderScreenshotSection/);
assert.match(sources[expectedParts[5]], /function renderDetailResourceCenter/);
assert.match(sources[expectedParts[6]], /let ConstCode =/);
assert.doesNotMatch(sources[expectedParts[0]], /\.style\.marginLeft/);
assert.doesNotMatch(sources[expectedParts[4]], /\.style\.display/);

function extract(source, pattern, label) {
  const match = source.match(pattern);
  assert.ok(match, label + ' not found');
  return match[0];
}

const schedulerSource = extract(
  sources[expectedParts[0]],
  /const resourceSectionLoadObservers[\s\S]*?(?=\n\s*function buildDetailResourceRenderSignature)/,
  'resource section scheduler'
);
const observers = [];
const schedulerContext = {
  alive: true,
  taskCalls: 0,
  isResourceCenterTokenAlive() {
    return schedulerContext.alive;
  },
  IntersectionObserver: class {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.disconnected = false;
      observers.push(this);
    }
    observe(card) {
      this.card = card;
    }
    disconnect() {
      this.disconnected = true;
    }
  },
  window: {
    setTimeout(callback) {
      callback();
    },
  },
  console,
};
vm.createContext(schedulerContext);
vm.runInContext(schedulerSource, schedulerContext);

const card = {};
const start = schedulerContext.scheduleResourceSectionLoad(card, 'token', () => {
  schedulerContext.taskCalls += 1;
});
assert.equal(schedulerContext.taskCalls, 0, 'offscreen resource work should stay deferred');
assert.equal(observers[0].options.rootMargin, '240px 0px');
observers[0].callback([{ target: card, isIntersecting: false, intersectionRatio: 0 }]);
await Promise.resolve();
assert.equal(schedulerContext.taskCalls, 0);
observers[0].callback([{ target: card, isIntersecting: true, intersectionRatio: 1 }]);
await Promise.resolve();
assert.equal(schedulerContext.taskCalls, 1);
assert.equal(observers[0].disconnected, true);
assert.equal(start(), false, 'a resource section should activate only once');

schedulerContext.alive = false;
const staleCard = {};
schedulerContext.scheduleResourceSectionLoad(staleCard, 'stale', () => {
  schedulerContext.taskCalls += 1;
});
observers[1].callback([{ target: staleCard, isIntersecting: true, intersectionRatio: 1 }]);
await Promise.resolve();
assert.equal(schedulerContext.taskCalls, 1, 'a stale render token must cancel deferred work');
assert.equal(observers[1].disconnected, true);

const signatureSource = extract(
  sources[expectedParts[0]],
  /function buildDetailResourceRenderSignature[\s\S]*$/,
  'resource render signature'
);
const signatureContext = {
  config: {
    resource_trailer: true,
    resource_screenshot: true,
    resource_screenshot_auto: false,
    resource_magnet: true,
    resource_subtitle: true,
    resource_links: true,
  },
  compactText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  },
  normalizeResourceAvid(value) {
    return String(value || '').toUpperCase();
  },
  normalizeReleaseDate(value) {
    return String(value || '');
  },
};
vm.createContext(signatureContext);
vm.runInContext(signatureSource, signatureContext);
const detailContext = { site: 'javlibrary', avid: 'abp-001', title: 'Sample' };
const firstSignature = signatureContext.buildDetailResourceRenderSignature(detailContext, '2026-07-28');
assert.equal(
  signatureContext.buildDetailResourceRenderSignature({ ...detailContext }, '2026-07-28'),
  firstSignature,
  'equivalent detail state should reuse the resource center DOM'
);
signatureContext.config.resource_links = false;
assert.notEqual(
  signatureContext.buildDetailResourceRenderSignature(detailContext, '2026-07-28'),
  firstSignature,
  'resource settings must invalidate the render signature'
);
signatureContext.config.resource_links = true;
signatureContext.config.resource_subtitle = false;
assert.notEqual(
  signatureContext.buildDetailResourceRenderSignature(detailContext, '2026-07-28'),
  firstSignature,
  'subtitle toggle must invalidate the render signature'
);

assert.match(
  sources[expectedParts[5]],
  /container\.dataset\.renderSignature === renderSignature\) return;/,
  'stable resource renders should return before replacing section DOM'
);
assert.match(sources[expectedParts[5]], /class="jlc-resource-links" data-jlc-resource="links"/);
assert.doesNotMatch(
  sources[expectedParts[5]],
  /class="jlc-resource-card" data-jlc-resource="links"/,
  'external links should not consume a resource grid card'
);
assert.match(sources[expectedParts[5]], /data-jlc-resource="subtitle"/);
assert.match(sources[expectedParts[5]], /renderSubtitleSection\(subtitleCard/);
assert.match(sources[expectedParts[2]], /scheduleResourceSectionLoad\(card, token, loadMagnets\)/);
assert.match(sources[expectedParts[3]], /scheduleResourceSectionLoad\(card, token, loadSubtitles\)/);
assert.match(sources[expectedParts[4]], /scheduleResourceSectionLoad\(card, token, loadTrailer\)/);
assert.doesNotMatch(
  sources[expectedParts[2]],
  /Subtitlecat|renderSubtitleSection|loadSubtitles/,
  'subtitle search must stay on its own card'
);

console.log('JLC resource center module tests passed');
