import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const partsDir = path.join(root, 'packages/scout-commander/src/parts');
const comboSource = fs.readFileSync(path.join(partsDir, '32-combo-page.js'), 'utf8');
const searchRuntimeSource = fs.readFileSync(path.join(partsDir, '21-search-runtime.js'), 'utf8');
const librarySource = fs.readFileSync(path.join(partsDir, '34-library-pages.js'), 'utf8');
const trackingSource = fs.readFileSync(path.join(partsDir, '36-tracking-page.js'), 'utf8');
const settingsSource = fs.readFileSync(path.join(partsDir, '38-settings.js'), 'utf8');
const themeSource = fs.readFileSync(path.join(partsDir, '25-theme.js'), 'utf8');
const sharedSource = fs.readFileSync(
  path.join(root, 'packages/shared/creamu-workbench-css.js'),
  'utf8'
);

console.log('Scout workbench pages');

for (const [name, source] of [
  ['combo page', comboSource],
  ['library pages', librarySource],
  ['tracking pages', trackingSource],
  ['settings page', settingsSource],
]) {
  assert.doesNotMatch(
    source,
    /\bstyle\s*=/,
    name + ' should keep static presentation in the Scout theme'
  );
}
console.log('  OK  page templates contain no static inline styles');
assert.doesNotMatch(comboSource, /\.style\./);
assert.doesNotMatch(settingsSource, /\.style\./);
console.log('  OK  combo and settings state changes avoid presentation writes');

assert.doesNotMatch(
  settingsSource,
  /\brender(?:Combo|Lexicon|Works|Publishers|Tracks|Blocks)Page\(/
);
assert.match(settingsSource, /refreshScoutWorkbenchPagesIfActive\(/);
console.log('  OK  settings refresh only the active workbench page');

[
  '.scout-search-builder-grid {',
  '.scout-search-condition {',
  '.scout-search-assessment-site {',
  '.scout-search-assessment-metrics {',
  '.scout-search-savebar,',
  '.scout-wb-add-form {',
  '.scout-lexicon-edit {',
  '.scout-publisher-name.is-loved {',
  '.jlc-wb-cover.scout-work-cover {',
  '.scout-track-edit-actions {',
  '.scout-block-options {',
  '.scout-settings-actions {',
  '#scout-wd-form[hidden] {',
].forEach((selector) => {
  assert.ok(themeSource.includes(selector), 'missing Scout page selector: ' + selector);
});

[
  'class="scout-search-condition is-',
  'id="scout-combo-pool"',
  'id="scout-search-assessments"',
  'id="scout-search-savebar"',
  'class="scout-wb-add-form',
  'class="scout-lexicon-edit"',
  'class="person-item scout-publisher-item"',
  'class="jlc-wb-cover is-poster scout-work-cover"',
  'class="scout-track-edit-actions"',
  'class="scout-block-options',
  'class="scout-settings-actions"',
  'class="scout-settings-sync-form"',
].forEach((marker) => {
  assert.ok(
    [comboSource, librarySource, trackingSource, settingsSource]
      .some((source) => source.includes(marker)),
    'missing page component marker: ' + marker
  );
});
assert.ok(!sharedSource.includes('.scout-wb-add-form'));
assert.ok(!sharedSource.includes('.scout-block-options'));
assert.ok(!sharedSource.includes('.scout-settings-actions'));
console.log('  OK  page components stay in the Scout theme boundary');

assert.match(comboSource, /runScoutSearchPlan\(/);
assert.match(comboSource, /sampleSize:\s*8/);
assert.match(searchRuntimeSource, /verifyScoutSearchResult\(/);
assert.match(searchRuntimeSource, /sample_exact/);
assert.doesNotMatch(comboSource, /IntersectionObserver/);
assert.doesNotMatch(comboSource, /scout-search-result-score/);
assert.doesNotMatch(comboSource, /\bprompt\s*\(/);
console.log('  OK  search uses bounded assessment samples and an in-panel save flow');

assert.ok(!themeSource.includes('[data-jlc-wb-page="settings"]'));
assert.match(settingsSource, /id="scout-wd-form"[^>]*\? '' : 'hidden'/);
assert.ok(settingsSource.includes('wdForm.hidden = !curCfg.webdav_enabled'));
console.log('  OK  settings target the real drawer and use semantic visibility');

console.log('Scout workbench page tests passed (6)');
