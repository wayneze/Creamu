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
  '43-tracking-page-context.js',
  '45-tracking-state.js',
  '46-tracking-refresh.js',
  '47-tracking-ui.js',
];

console.log('JLC tracking state modules');

assert.deepEqual(
  manifest.parts.filter((filename) => /^(?:43|45|46|47)-/.test(filename)),
  expectedParts,
  'tracking state parts should remain in runtime dependency order'
);

const pageContextSource = fs.readFileSync(path.join(partsRoot, expectedParts[0]), 'utf8');
const stateSource = fs.readFileSync(path.join(partsRoot, expectedParts[1]), 'utf8');
const refreshSource = fs.readFileSync(path.join(partsRoot, expectedParts[2]), 'utf8');

assert.match(pageContextSource, /function getCurrentTrackingPageContext/);
assert.doesNotMatch(pageContextSource, /async function getTrackingSearches/);
assert.match(stateSource, /async function getTrackingSearches/);
assert.match(stateSource, /function deriveTrackingStatusFromSnapshot/);
assert.doesNotMatch(stateSource, /async function refreshSingleTrackingRecord/);
assert.match(refreshSource, /async function refreshSingleTrackingRecord/);
assert.match(refreshSource, /async function refreshAllTrackingSearches/);
assert.doesNotMatch(refreshSource, /function getCurrentTrackingPageContext/);
const uiSource = fs.readFileSync(path.join(partsRoot, expectedParts[3]), 'utf8');
assert.match(uiSource, /async function continueTrackingBreakpointSearch/);
assert.doesNotMatch(
  uiSource,
  /maxStepsPerDirection|maxTotalSteps|已连续翻到限制页数/,
  'one continue-breakpoint click must keep walking until hit, boundary, or request failure'
);

function extract(source, pattern, label) {
  const match = source.match(pattern);
  assert.ok(match, label + ' not found');
  return match[0];
}

const normalizationSource = extract(
  stateSource,
  /function isTransientTrackingErrorNote[\s\S]*?(?=\n\s*async function getTrackingSearches)/,
  'tracking runtime normalization'
);
const normalizationContext = {
  compactText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  },
  normalizeCode(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
  },
};
vm.createContext(normalizationContext);
vm.runInContext(normalizationSource, normalizationContext);

const currentRecord = {
  check_status: 'error',
  check_note: '网络失败',
  last_check_at: '2026-07-28T10:00:00.000Z',
  top_avid: 'ABP-001',
  last_seen_avid: 'abp001',
};
normalizationContext.normalizeTrackingRuntimeRecord(currentRecord);
assert.equal(currentRecord.check_status, 'latest');
assert.equal(currentRecord.check_note, '已追到最新');
assert.equal(currentRecord.last_refresh_error_note, '网络失败');

const updatedRecord = {
  check_status: 'error',
  check_note: 'HTTP 503',
  top_avid: 'ABP-002',
  last_seen_avid: 'ABP-001',
};
normalizationContext.normalizeTrackingRuntimeRecord(updatedRecord);
assert.equal(updatedRecord.check_status, 'updated');
assert.equal(updatedRecord.check_note, '发现新番号 ABP-002');

const permanentError = {
  check_status: 'error',
  check_note: '未解析到首个番号',
  top_avid: 'ABP-003',
};
normalizationContext.normalizeTrackingRuntimeRecord(permanentError);
assert.equal(permanentError.check_status, 'error');

const schedulerSource = extract(
  refreshSource,
  /function isTrackingRefreshRateLimited[\s\S]*?(?=\n\s*async function refreshAllTrackingSearches)/,
  'tracking refresh scheduler'
);
const schedulerContext = {
  isJavLibraryResolvableSearchUrl(url) {
    return /\/vl_searchby(?:title|combo)\.php/i.test(String(url || ''));
  },
};
vm.createContext(schedulerContext);
vm.runInContext(schedulerSource, schedulerContext);

const limitedRecord = {
  id: 'limited',
  site: 'javlibrary',
  page_url: 'https://www.javlibrary.com/cn/vl_searchbycombo.php?searchid=1',
};
const regularRecord = {
  id: 'regular',
  site: 'javbus',
  page_url: 'https://www.javbus.com/genre/test',
};
const now = 1_000_000;
const bucketLastRunAt = new Map([
  ['javlibrary-search-rebuild', now - 1_000],
]);
const readyTask = schedulerContext.pickNextTrackingRefreshRecord(
  [limitedRecord, regularRecord],
  bucketLastRunAt,
  now
);
assert.equal(readyTask.index, 1, 'a ready record should bypass a cooling JavLibrary search');
assert.equal(readyTask.record.id, 'regular');
assert.equal(readyTask.waitMs, 0);

const coolingTask = schedulerContext.pickNextTrackingRefreshRecord(
  [limitedRecord],
  bucketLastRunAt,
  now
);
assert.equal(coolingTask.index, -1);
assert.equal(coolingTask.record, null);
assert.equal(coolingTask.waitMs, 299_000);

bucketLastRunAt.set('javlibrary-search-rebuild', now - 300_000);
const resumedTask = schedulerContext.pickNextTrackingRefreshRecord(
  [limitedRecord],
  bucketLastRunAt,
  now
);
assert.equal(resumedTask.index, 0);
assert.equal(resumedTask.record.id, 'limited');

// Existing saved searches must resolve by their full conditions, even if their
// old signature dropped Chinese characters or their searchid has expired.
const identityContext = {
  URL,
  location: { href: 'https://www.javlibrary.com/cn/' },
  compactText: normalizationContext.compactText,
  normalizeCode: normalizationContext.normalizeCode,
  TRACKING_STORE: 'tracking_searches',
};
vm.createContext(identityContext);
vm.runInContext(
  fs.readFileSync(path.join(partsRoot, '40-tracking-search.js'), 'utf8')
    + fs.readFileSync(path.join(partsRoot, '42-javlibrary-search-runtime.js'), 'utf8')
    + pageContextSource + stateSource,
  identityContext
);
const searchRecord = (kind, query, id = '1') => ({
  id,
  site: 'javlibrary',
  page_type: 'search',
  group_type: 'keyword',
  open_url: `https://www.javlibrary.com/cn/vl_searchby${kind}.php?searchid=${id}`,
  raw_query: query,
  query_signature: 'old-colliding-signature',
});
const titleRecord = searchRecord('title', '标题搜寻结果: "親子');
const titleContext = searchRecord('title', '親子', '2');
assert.equal(
  identityContext.buildTrackingSignature(titleRecord),
  identityContext.buildTrackingSignature(titleContext)
);
const comboRecord = searchRecord('combo', '|类别=母亲||类别=妹妹|', '3');
const otherCombo = searchRecord('combo', '|类别=强奸||类别=乱伦|', '4');
const comboContext = searchRecord('combo', '|类别=妹妹||类别=母亲|', '5');
assert.notEqual(identityContext.buildTrackingSignature(comboRecord), identityContext.buildTrackingSignature(otherCombo));
assert.equal(identityContext.buildTrackingSignature(comboRecord), identityContext.buildTrackingSignature(comboContext));
for (const [context, expected] of [[titleContext, titleRecord], [comboContext, comboRecord]]) {
  const found = await identityContext.getTrackingRecordBySignature(
    identityContext.buildTrackingSignature(context), context.open_url,
    [otherCombo, titleRecord, comboRecord]
  );
  assert.equal(found.id, expected.id);
}
assert.notEqual(
  identityContext.buildTrackingSignature(searchRecord('combo', '', '6')),
  identityContext.buildTrackingSignature(searchRecord('combo', '', '7')),
  'unidentified searches must not collapse to the same URL'
);
const recentDuplicate = { ...titleContext, id: 'recent', last_seen_at: '2026-11-06T08:00:00Z' };
assert.equal((await identityContext.getTrackingRecordBySignature(
  identityContext.buildTrackingSignature(titleContext), titleContext.open_url,
  [titleRecord, recentDuplicate]
)).id, 'recent', 'existing duplicates should continue the most recently saved breakpoint');
console.log('JLC tracking state and saved search identity tests passed');
