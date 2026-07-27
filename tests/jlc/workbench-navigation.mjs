import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const baseSource = fs.readFileSync('packages/jlc-commander/src/parts/20-workbench.js', 'utf8');
const trackingSource = fs.readFileSync('packages/jlc-commander/src/parts/21-workbench-tracking.js', 'utf8');
const themeSource = fs.readFileSync('packages/jlc-commander/src/parts/11-theme.js', 'utf8');
const settingsSource = fs.readFileSync('packages/jlc-commander/src/parts/22-workbench-settings.js', 'utf8');
const shellSource = fs.readFileSync('packages/jlc-commander/src/parts/23-workbench-shell.js', 'utf8');
const runtimeSource = fs.readFileSync('packages/jlc-commander/src/parts/24-app-runtime.js', 'utf8');
const trackingStateSource = fs.readFileSync('packages/jlc-commander/src/parts/45-tracking-state.js', 'utf8');
const trackingUiSource = fs.readFileSync('packages/jlc-commander/src/parts/47-tracking-ui.js', 'utf8');

function extract(source, pattern, label) {
  const match = source.match(pattern);
  assert.ok(match, label + ' not found');
  return match[0];
}

assert.doesNotMatch(baseSource, /function renderWorkbenchTrackingList/, 'tracking rendering must stay out of the base part');
assert.match(settingsSource, /function bindWorkbenchSettingsEvents/, 'settings event binding must be assembled');
assert.match(shellSource, /function createWorkbenchV3/, 'workbench shell must be assembled');
assert.match(runtimeSource, /async function startIntegratedApp/, 'app runtime must be assembled');
assert.match(runtimeSource, /getAllFromStores\(\['emby_data', TRACKING_STORE\]\)/);
assert.match(runtimeSource, /primeWorkbenchTrackingRecordsState\(startupTrackingRecords\)/);
assert.match(runtimeSource, /trackingRecords: startupTrackingRecords/);
assert.match(trackingStateSource, /Array\.isArray\(preloadedRows\)/);
assert.match(trackingUiSource, /trackingRecords: options\.trackingRecords/);
assert.match(baseSource, /function scheduleRenderWorkbenchTrackingList/);
assert.doesNotMatch(trackingUiSource, /jlc-tracking-root|data-jlc-tracking-delete/);
assert.doesNotMatch(themeSource, /\.jlc-tracking-(?:toolbar|group|item|main|title-row|title-text|meta|actions|empty)\b/);

const trackingRenderSource = extract(
  trackingUiSource,
  /async function renderTrackingUI[\s\S]*?(?=\n\s*function clearTrackingPageDecorations)/,
  'tracking render delegation'
);
const renderCalls = [];
const trackingRenderContext = {
  workbenchListScrolling: false,
  scheduleRenderWorkbenchTrackingList(options, delayMs) {
    renderCalls.push({ options, delayMs });
  },
};
vm.createContext(trackingRenderContext);
vm.runInContext(trackingRenderSource, trackingRenderContext);
await trackingRenderContext.renderTrackingUI();
trackingRenderContext.workbenchListScrolling = true;
await trackingRenderContext.renderTrackingUI();
assert.deepEqual(renderCalls.map(call => ({ ...call, options: { ...call.options } })), [
  { options: {}, delayMs: 220 },
  { options: {}, delayMs: 0 },
]);

const primeSource = extract(
  trackingSource,
  /function primeWorkbenchTrackingRecordsState[\s\S]*?(?=\n\s*async function getWorkbenchTrackingRecordsState)/,
  'tracking snapshot priming'
);
const primeContext = {
  trackingDataRevision: 7,
  workbenchTrackingRecordsState: { revision: -1, records: null },
};
vm.createContext(primeContext);
vm.runInContext(primeSource, primeContext);
const primed = primeContext.primeWorkbenchTrackingRecordsState([{ id: 'track-a' }]);
assert.equal(primed.revision, 7);
assert.deepEqual(Array.from(primed.records, record => record.id), ['track-a']);

const recordsStateSource = extract(
  trackingSource,
  /let workbenchTrackingRecordsState[\s\S]*?(?=\n\s*function buildWorkbenchTrackingRenderKey)/,
  'tracking snapshot loader'
);
let resolveStaleRead;
let trackingReads = 0;
const recordsStateContext = {
  trackingDataRevision: 1,
  getTrackingSearches() {
    trackingReads += 1;
    if (trackingReads === 1) {
      return new Promise(resolve => {
        resolveStaleRead = resolve;
      });
    }
    return Promise.resolve([{ id: 'track-new' }]);
  },
};
vm.createContext(recordsStateContext);
vm.runInContext(recordsStateSource, recordsStateContext);
const staleLoad = recordsStateContext.getWorkbenchTrackingRecordsState();
recordsStateContext.trackingDataRevision = 2;
const currentLoad = recordsStateContext.getWorkbenchTrackingRecordsState();
resolveStaleRead([{ id: 'track-old' }]);
const [staleCallerState, currentCallerState] = await Promise.all([staleLoad, currentLoad]);
assert.equal(trackingReads, 2, 'one storage read should be shared per tracking revision');
assert.equal(staleCallerState.revision, 2, 'a stale read should follow the latest revision');
assert.equal(currentCallerState.revision, 2);
assert.deepEqual(
  Array.from(staleCallerState.records, record => record.id),
  ['track-new'],
  'an older async read must not overwrite the current tracking snapshot'
);

const trackingRenderStateSource = extract(
  trackingSource,
  /let workbenchTrackingRenderState[^\n]*\n(?:\s*let workbenchTrackingRenderSequence[^\n]*\n)?/,
  'tracking render state'
);
const trackingListRenderSource = extract(
  trackingSource,
  /async function renderWorkbenchTrackingList[\s\S]*$/,
  'tracking list render'
);
let resolveOlderRender;
let staleRecordAccesses = 0;
const pendingRenderStates = [
  new Promise(resolve => { resolveOlderRender = resolve; }),
  new Promise(() => {}),
];
const trackingRoot = {
  firstElementChild: null,
  querySelector() {
    return null;
  },
};
const concurrentRenderContext = {
  trackingDataRevision: 1,
  document: {
    getElementById(id) {
      return id === 'jlc-wb-tracking-root' ? trackingRoot : null;
    },
  },
  getWorkbenchSession() {
    return { tracking: {}, scrollTops: {} };
  },
  getCurrentTrackingPageContext() {
    return null;
  },
  buildWorkbenchTrackingRenderKey() {
    return 'render-key';
  },
  getTrackingUiState() {
    return { collapsed: {}, refresh_resume: null };
  },
  getTrackingRefreshRuntimeState() {
    return null;
  },
  getWorkbenchTrackingRecordsState() {
    return pendingRenderStates.shift();
  },
  restoreWorkbenchScroll() {},
};
vm.createContext(concurrentRenderContext);
vm.runInContext(trackingRenderStateSource + '\n' + trackingListRenderSource, concurrentRenderContext);
const olderRender = concurrentRenderContext.renderWorkbenchTrackingList();
void concurrentRenderContext.renderWorkbenchTrackingList();
resolveOlderRender({
  get records() {
    staleRecordAccesses += 1;
    return [];
  },
});
await olderRender;
assert.equal(staleRecordAccesses, 0, 'a superseded render must stop before reading stale records');

const navigationSource = extract(
  baseSource,
  /const WORKBENCH_MAIN_NAVS[\s\S]*?(?=\n\s*function getWorkbenchListScroller)/,
  'workbench navigation mapping'
);
const navigationContext = {
  compactText(value) {
    return String(value || '').trim();
  },
};
vm.createContext(navigationContext);
vm.runInContext(navigationSource, navigationContext);

assert.equal(navigationContext.normalizeWorkbenchMainNav('library'), 'library');
assert.equal(navigationContext.normalizeWorkbenchMainNav('unknown'), 'tracking');
assert.equal(navigationContext.normalizeWorkbenchSettingsTab('system'), 'services');
assert.equal(navigationContext.normalizeWorkbenchSettingsTab('data'), 'backup');
assert.equal(navigationContext.normalizeWorkbenchSettingsTab('hidden'), 'display');

const hiddenTarget = navigationContext.mapCommanderTabToWorkbench('hidden');
assert.equal(hiddenTarget.nav, 'filter');
assert.equal(hiddenTarget.settings, false);
const resourceTarget = navigationContext.mapCommanderTabToWorkbench('resource');
assert.equal(resourceTarget.nav, 'tracking');
assert.equal(resourceTarget.settings, true);
assert.equal(resourceTarget.section, 'resource');
const dataTarget = navigationContext.mapCommanderTabToWorkbench('data');
assert.equal(dataTarget.settings, true);
assert.equal(dataTarget.section, 'backup');

const sortingSource = extract(
  trackingSource,
  /function trackingRecordHasUpdate[\s\S]*?(?=\n\s*async function prepareTrackingRecordNavigation)/,
  'tracking record sorting'
);
const sortingContext = {
  compactText(value) {
    return String(value || '').trim();
  },
  normalizeCode(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
  },
  getTrackingDisplayTitle(record) {
    return record?.title || '';
  },
};
vm.createContext(sortingContext);
vm.runInContext(sortingSource, sortingContext);

const records = [
  {
    id: 'older',
    title: 'Bravo',
    top_avid: 'ABP-001',
    last_seen_avid: 'ABP-001',
    last_check_at: '2026-01-01T00:00:00.000Z',
    last_browsed_at: '2026-01-01T00:00:00.000Z',
    query_signature: 'older-signature',
  },
  {
    id: 'updated',
    title: 'Charlie',
    top_avid: 'ABP-003',
    last_seen_avid: 'ABP-002',
    last_check_at: '2026-01-03T00:00:00.000Z',
    last_browsed_at: '2026-01-02T00:00:00.000Z',
    query_signature: 'updated-signature',
  },
  {
    id: 'current',
    title: 'Alpha',
    top_avid: 'ABP-004',
    last_seen_avid: 'ABP-004',
    last_check_at: '2026-01-02T00:00:00.000Z',
    last_browsed_at: '2026-01-03T00:00:00.000Z',
    query_signature: 'current-signature',
  },
];
const originalOrder = records.map(record => record.id);

assert.equal(sortingContext.trackingRecordHasUpdate(records[1]), true);
assert.equal(sortingContext.trackingRecordHasUpdate(records[0]), false);
assert.deepEqual(
  Array.from(sortingContext.sortTrackingRecordsForWorkbench(
    records,
    'updates_first',
    { tracking: { pinCurrent: true } },
    { currentSignature: 'current-signature' }
  ), record => record.id),
  ['current', 'updated', 'older']
);
assert.deepEqual(records.map(record => record.id), originalOrder, 'sorting must not mutate the caller list');
assert.deepEqual(
  Array.from(sortingContext.sortTrackingRecordsForWorkbench(
    records,
    'last_opened',
    { tracking: { lastOpenedId: 'older' } },
    { pinCurrent: false }
  ), record => record.id),
  ['older', 'current', 'updated']
);
assert.deepEqual(
  Array.from(sortingContext.sortTrackingRecordsForWorkbench(
    records,
    'name',
    { tracking: {} },
    { pinCurrent: false }
  ), record => record.id),
  ['current', 'older', 'updated']
);

console.log('JLC workbench navigation tests OK');
