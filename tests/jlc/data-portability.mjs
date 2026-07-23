import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('packages/jlc-commander/src/parts/14-data-portability.js', 'utf8');
const coreSource = fs.readFileSync('packages/jlc-commander/src/parts/10-core.js', 'utf8');
const settingsSource = fs.readFileSync('packages/jlc-commander/src/parts/13-settings-bridge.js', 'utf8');

function extract(pattern, label) {
  const match = source.match(pattern);
  assert.ok(match, label + ' not found');
  return match[0];
}

assert.doesNotMatch(coreSource, /function buildBackupPayload/, 'data portability must stay out of core');
assert.match(settingsSource, /function getLegacySettingsSchema/, 'settings bridge must expose the legacy schema');

const preferenceSource = extract(
  /const STATUS_PREF_SIMPLE_KEYS[\s\S]*?(?=\n\s*function markStatusPrefsDirty)/,
  'status preference portability'
);
const storedValues = new Map([
  ['autoPage', true],
  ['hiddenWord', ['blocked']],
  ['hiddenAvid', ['ABP']],
  ['uiBtnScale', 95],
  ['waterfallWidth_javlibrary', 82],
]);
const writtenValues = [];
const preferenceContext = {
  currentWeb: 'javlibrary',
  legacySettingHandlers: null,
  statusDefault: {
    autoPage: false,
    copyBtn: true,
    toolBar: true,
    avInfo: true,
    halfImg: false,
    fullTitle: false,
    menutoTop: false,
    hiddenWord: [],
    hiddenAvid: [],
    columnNumFull: 4,
    columnNumHalf: 3,
  },
  GM_getValue(key, fallback) {
    return storedValues.has(key) ? storedValues.get(key) : fallback;
  },
  GM_setValue(key, value) {
    writtenValues.push([key, value]);
    storedValues.set(key, value);
  },
  refreshCommanderDecorations() {},
  syncWorkbenchSettingsForm() {},
};
vm.createContext(preferenceContext);
vm.runInContext(preferenceSource, preferenceContext);

const collected = preferenceContext.collectStatusPrefs();
assert.equal(collected.autoPage, true);
assert.deepEqual(Array.from(collected.hiddenWord), ['blocked']);
assert.equal(collected.waterfallWidth_by_site.javlibrary, 82);
assert.equal('uiBtnScale' in collected, false, 'local UI scale must not enter backup data');

const applyResult = preferenceContext.applyStatusPrefs({
  copyBtn: false,
  uiBtnScale: 70,
  waterfallWidth_by_site: { javlibrary: 75, javdb: 88 },
});
assert.equal(applyResult.ok, true);
assert.equal(storedValues.get('copyBtn'), false);
assert.equal(storedValues.get('waterfallWidth_javlibrary'), 75);
assert.equal(storedValues.get('waterfallWidth_javdb'), 88);
assert.equal(writtenValues.some(([key]) => key === 'uiBtnScale'), false, 'restore must ignore local UI scale');

const buildSource = extract(
  /async function buildBackupPayload[\s\S]*?(?=\n\s*async function applyBackupPayload)/,
  'backup payload builder'
);
const requestedStores = [];
const buildContext = {
  TRACKING_STORE: 'tracking_searches',
  loadConfig() {
    return { metatube_url: 'https://meta.test' };
  },
  collectStatusPrefs() {
    return { copyBtn: true };
  },
  async getAllFromStore(store) {
    requestedStores.push(store);
    return [{ store }];
  },
};
vm.createContext(buildContext);
vm.runInContext(buildSource, buildContext);
const payload = await buildContext.buildBackupPayload();
assert.equal(payload.kind, 'full_without_meta_cache');
assert.deepEqual(requestedStores, ['videos', 'emby_data', 'tracking_searches']);
assert.equal('meta_cache' in payload, false, 'regenerable metadata must stay out of backups');

const applySource = extract(
  /async function applyBackupPayload[\s\S]*?(?=\n\s*async function exportBackup)/,
  'backup payload restore'
);
const restoreEvents = [];
const restoreContext = {
  TRACKING_STORE: 'tracking_searches',
  db: {},
  applyImportedConfig() {
    restoreEvents.push('config');
    return { ok: true, summary: 'config' };
  },
  applyStatusPrefs() {
    restoreEvents.push('status');
    return { ok: true, summary: 'status' };
  },
  syncCommanderConfigInputs() {
    restoreEvents.push('sync-inputs');
  },
  async initDB() {
    restoreEvents.push('init-db');
  },
  async putAllInStore(store, rows) {
    restoreEvents.push(['put', store, rows.length]);
  },
  async loadRadarData() {
    restoreEvents.push('radar');
  },
  async refreshLibraryUI() {
    restoreEvents.push('library');
  },
  refreshCommanderDecorations() {
    restoreEvents.push('decorations');
  },
  async renderTrackingUI() {
    restoreEvents.push('tracking');
  },
  refreshWorkbenchFabBadge() {
    restoreEvents.push('badge');
  },
};
vm.createContext(restoreContext);
vm.runInContext(applySource, restoreContext);

await assert.rejects(() => restoreContext.applyBackupPayload(null, 'config'), /invalid backup/);
await restoreContext.applyBackupPayload({
  config: { fav_tags: ['tag'] },
  status: { copyBtn: true },
}, 'config');
assert.equal(restoreEvents.some(event => Array.isArray(event) && event[0] === 'put'), false);

restoreEvents.length = 0;
await restoreContext.applyBackupPayload({
  config: { fav_tags: ['tag'] },
  status: { copyBtn: true },
  videos: [{ avid: 'ABP-001' }],
  emby_data: [{ id: 'vid_ABP-001' }],
  tracking_searches: [{ id: 'tracking-1' }],
  meta_cache: [{ avid: 'ABP-001' }],
}, 'full');
assert.deepEqual(
  restoreEvents.filter(event => Array.isArray(event)).map(([, store]) => store),
  ['videos', 'emby_data', 'tracking_searches']
);
assert.equal(restoreEvents.includes('library'), true);
assert.equal(restoreEvents.includes('tracking'), true);
assert.equal(restoreEvents.some(event => Array.isArray(event) && event[1] === 'meta_cache'), false);

console.log('JLC data portability tests OK');
