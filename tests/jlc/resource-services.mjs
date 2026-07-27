import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('packages/jlc-commander/src/parts/12-resource-services.js', 'utf8');
const transportSource = fs.readFileSync('packages/jlc-commander/src/parts/12-resource-transport.js', 'utf8');
const trailerSource = fs.readFileSync('packages/jlc-commander/src/parts/12-resource-trailer-providers.js', 'utf8');
const linkSource = fs.readFileSync('packages/jlc-commander/src/parts/12-resource-link-providers.js', 'utf8');
const magnetProviderSource = fs.readFileSync('packages/jlc-commander/src/parts/12-resource-magnet-providers.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('packages/jlc-commander/src/parts.manifest.json', 'utf8'));
const coreSource = fs.readFileSync('packages/jlc-commander/src/parts/10-core.js', 'utf8');

function extract(pattern, label, target = source) {
  const match = target.match(pattern);
  assert.ok(match, label + ' not found');
  return match[0];
}

assert.doesNotMatch(coreSource, /function normalizeResourceAvid/, 'resource services must stay out of core');
assert.deepEqual(
  manifest.parts.filter(filename => /^12-resource/.test(filename)),
  [
    '12-resource-services.js',
    '12-resource-transport.js',
    '12-resource-trailer-providers.js',
    '12-resource-link-providers.js',
    '12-resource-magnet-providers.js',
  ],
  'resource service modules should stay in dependency order'
);
assert.doesNotMatch(source, /async function requestPage|function extractDmmSearchPreviewInfo|function extractSukebeiMagnetEntries/);
assert.match(transportSource, /async function requestPage/);
assert.match(trailerSource, /function extractDmmSearchPreviewInfo/);
assert.match(linkSource, /function extractBlogJavScreenshotCandidates/);
assert.match(magnetProviderSource, /function extractSukebeiMagnetEntries/);

const identitySource = extract(
  /function uniqueLinkObjects[\s\S]*?(?=\n\s*function normalizeResourceStatusState)/,
  'resource identity helpers'
);
const mgsSource = extract(
  /const MGS_AVID_PREFIXES[\s\S]*?(?=\n\s*function buildMgsDetailCandidates)/,
  'MGS identity helpers',
  trailerSource
);
const resourceContext = {
  URL,
  location: { href: 'https://www.javlibrary.com/cn/' },
  normalizeCode(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
  },
};
vm.createContext(resourceContext);
vm.runInContext(identitySource + '\n' + mgsSource, resourceContext);

assert.equal(resourceContext.normalizeResourceAvid(' fc2 ppv 123456 '), 'FC2-PPV-123456');
assert.equal(resourceContext.normalizeResourceAvid('abp001'), 'ABP-001');
assert.equal(resourceContext.normalizeResourceAvid('300mium001'), '300MIUM-001');
assert.equal(resourceContext.isLikelyMgsAvid('300mium001'), true);
assert.equal(resourceContext.isLikelyMgsAvid('ssis001'), false);

const links = Array.from(resourceContext.uniqueLinkObjects([
  { label: 'same', href: '/cn/ABP-001' },
  { label: 'same', href: 'https://www.javlibrary.com/cn/ABP-001' },
  { label: 'other', href: '/cn/ABP-001' },
]));
assert.equal(links.length, 2, 'links should deduplicate by normalized URL and label');
assert.equal(resourceContext.normalizeMediaUrl('http://media.test/sample.mp4'), 'https://media.test/sample.mp4');
assert.equal(
  resourceContext.sanitizeMissAVPageUrl('https://missav.ws/cn/ABP-001', 'abp001'),
  'https://missav.ws/cn/ABP-001'
);
assert.equal(resourceContext.sanitizeMissAVPageUrl('https://missav.ws/cn/ABP-002', 'abp001'), '');

const magnetSource = extract(
  /function normalizeMagnetHref[\s\S]*?(?=\n\s*function buildSukebeiSearchUrl)/,
  'magnet helpers',
  magnetProviderSource
);
vm.runInContext(magnetSource, resourceContext);
const hash = '0123456789abcdef0123456789abcdef01234567';
const magnets = Array.from(resourceContext.uniqueMagnetEntries([
  { title: '<b>First</b> title', href: `magnet:?xt=urn:btih:${hash}&amp;dn=ABP-001` },
  { title: 'Duplicate', href: `magnet:?xt=urn:btih:${hash.toUpperCase()}&dn=duplicate` },
]));
assert.equal(magnets.length, 1, 'magnets should deduplicate by info hash');
assert.equal(resourceContext.extractMagnetHash(magnets[0].href), hash.toUpperCase());
assert.equal(magnets[0].title, 'First title');

const cacheSource = extract(
  /const resourceTrailerCache[\s\S]*?(?=\n\s*function getResourceToggleStates)/,
  'resource caches'
);
vm.runInContext(cacheSource + `
  globalThis.resourceCacheState = {
    resourceTrailerCache,
    resourceScreenshotCache,
    resourceScreenshotInfoCache,
    resourceMagnetCache,
    resourceMissAVCache,
    resourceFalenoCache,
    resourceMgsCache
  };`, resourceContext);
const caches = resourceContext.resourceCacheState;
const cacheKey = 'ABP-001';
caches.resourceTrailerCache.set(`${cacheKey}::missav-status`, true);
caches.resourceTrailerCache.set(`${cacheKey}::dmm-only`, true);
caches.resourceScreenshotCache.set(cacheKey, true);
caches.resourceScreenshotInfoCache.set(cacheKey, true);
caches.resourceMagnetCache.set(cacheKey, true);
caches.resourceMissAVCache.set(cacheKey, true);
caches.resourceFalenoCache.set(cacheKey, true);
caches.resourceMgsCache.set(cacheKey, true);
caches.resourceMagnetCache.set('KEEP-001', true);
resourceContext.clearDetailResourceCaches('abp001');
assert.equal([
  caches.resourceTrailerCache,
  caches.resourceScreenshotCache,
  caches.resourceScreenshotInfoCache,
  caches.resourceMissAVCache,
  caches.resourceFalenoCache,
  caches.resourceMgsCache,
].some(cache => Array.from(cache.keys()).some(key => key.includes(cacheKey))), false);
assert.equal(caches.resourceMagnetCache.has(cacheKey), false);
assert.equal(caches.resourceMagnetCache.has('KEEP-001'), true, 'unrelated cache entries must remain');

const headerSource = extract(
  /function sanitizeBrowserFetchHeaders[\s\S]*?(?=\n\s*function isLikelyBotGuardResponse)/,
  'browser fetch header sanitizer',
  transportSource
);
const headerContext = {
  compactText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  },
};
vm.createContext(headerContext);
vm.runInContext(headerSource, headerContext);
const sanitized = headerContext.sanitizeBrowserFetchHeaders({
  Referer: ' https://source.test/page ',
  Accept: 'text/html',
});
assert.equal(sanitized.referrer, 'https://source.test/page');
assert.equal(sanitized.headers.Accept, 'text/html');
assert.equal('Referer' in sanitized.headers, false);
assert.equal(headerContext.sanitizeBrowserFetchHeaders({ referer: 'https://source.test/' }).headers, undefined);

const requestSource = extract(
  /async function requestPage\(url, extra = \{\}\)[\s\S]*?(?=\n\s*async function requestText)/,
  'resource request transport',
  transportSource
);
let requestOptions = null;
let throwRequest = false;
const requestContext = {
  GM_xmlhttpRequest(options) {
    if (throwRequest) throw new Error('request setup failed');
    requestOptions = options;
  },
};
vm.createContext(requestContext);
vm.runInContext(requestSource, requestContext);

let externalLoadCalls = 0;
const loaded = requestContext.requestPage('https://resource.test/page', {
  method: 'POST',
  timeout: 1234,
  headers: { Accept: 'text/html' },
  url: 'https://wrong.test/',
  onload() {
    externalLoadCalls += 1;
  },
});
assert.equal(requestOptions.method, 'POST');
assert.equal(requestOptions.timeout, 1234);
assert.equal(requestOptions.url, 'https://resource.test/page');
assert.deepEqual(requestOptions.headers, { Accept: 'text/html' });
requestOptions.onload({ status: 204, responseText: 'ok', finalUrl: 'https://resource.test/final' });
assert.deepEqual(
  { ...(await loaded) },
  {
    ok: true,
    status: 204,
    responseText: 'ok',
    finalUrl: 'https://resource.test/final',
    error: '',
  }
);
assert.equal(externalLoadCalls, 0, 'caller callbacks must not replace transport completion');

const networkFailure = requestContext.requestPage('https://resource.test/network');
requestOptions.onerror();
assert.equal((await networkFailure).error, 'network');

const timeoutFailure = requestContext.requestPage('https://resource.test/timeout');
requestOptions.ontimeout();
assert.equal((await timeoutFailure).error, 'timeout');

const aborted = requestContext.requestPage('https://resource.test/abort');
requestOptions.onabort();
requestOptions.onload({ status: 200, responseText: 'late response' });
assert.equal((await aborted).error, 'abort', 'an aborted request should settle once');

throwRequest = true;
assert.equal(
  (await requestContext.requestPage('https://resource.test/throw')).error,
  'network',
  'synchronous request setup failures should use the normal failure result'
);

const toggleSource = extract(
  /function getResourceToggleStates[\s\S]*?(?=\n\s*function syncResourceSettingInputs)/,
  'resource toggle state'
);
vm.runInContext(toggleSource, resourceContext);
const toggles = resourceContext.getResourceToggleStates({
  resource_center: false,
  resource_screenshot_auto: true,
});
assert.equal(toggles.resource_center, false);
assert.equal(toggles.resource_trailer, true);
assert.equal(toggles.resource_screenshot, true);
assert.equal(toggles.resource_screenshot_auto, true);
assert.equal(toggles.resource_magnet, true);

console.log('JLC resource service tests OK');
