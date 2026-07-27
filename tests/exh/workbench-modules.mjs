import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageRoot = path.join(root, 'packages/exh-commander');
const partsRoot = path.join(packageRoot, 'src/parts');
const manifest = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'src/parts.manifest.json'), 'utf8')
);
const expectedParts = [
  '70-workbench.js',
  '71-workbench-tracking.js',
  '72-workbench-works.js',
  '73-workbench-settings.js',
  '74-workbench-runtime.js',
];

console.log('ExH workbench modules');

assert.deepEqual(
  manifest.parts.filter((filename) => /^7\d-workbench(?:-|\.)/.test(filename)),
  expectedParts,
  'workbench parts should remain in runtime dependency order'
);

const sources = Object.fromEntries(
  expectedParts.map((filename) => [
    filename,
    fs.readFileSync(path.join(partsRoot, filename), 'utf8'),
  ])
);
const trackingBarSource = fs.readFileSync(path.join(partsRoot, '63-tracking-bar.js'), 'utf8');
const listRuntimeSource = fs.readFileSync(path.join(partsRoot, '65-list-runtime.js'), 'utf8');
const responsibilities = [
  ['70-workbench.js', 'function ensureWorkbenchShell', 'async function renderTrackingPage'],
  ['71-workbench-tracking.js', 'async function renderTrackingPage', 'async function renderWorksPage'],
  ['72-workbench-works.js', 'async function renderWorksPage', 'function renderSettingsSections'],
  ['73-workbench-settings.js', 'function renderSettingsSections', 'function createWorkbench'],
  ['74-workbench-runtime.js', 'function createWorkbench', 'function renderSettingsSections'],
];

for (const [filename, ownedEntry, foreignEntry] of responsibilities) {
  assert.ok(sources[filename].includes(ownedEntry), filename + ' is missing ' + ownedEntry);
  assert.ok(!sources[filename].includes(foreignEntry), filename + ' owns ' + foreignEntry);
}

assert.match(
  trackingBarSource,
  /bar\.dataset\.sig === ctx\.query_signature[\s\S]*?refreshTrackingBarFrom\(preloaded\);[\s\S]*?return;/,
  'an existing tracking bar should consume the shared tracking state'
);
assert.match(
  listRuntimeSource,
  /if \(!entries\.length\) \{\s*injectTrackingBar\(trackingStatePromise\);/,
  'an empty list refresh should still update the tracking bar'
);

console.log('ExH workbench module tests passed (4)');
