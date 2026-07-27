import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageRoot = path.join(root, 'packages/exh-commander');
const partsRoot = path.join(packageRoot, 'src/parts');
const manifest = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'src/parts.manifest.json'), 'utf8')
);

const groups = [
  [
    ['10-core.js', 'function compactText'],
    ['11-base-styles.js', 'function injectBaseStyles'],
    ['12-site-theme.js', 'function applyCreamSiteTheme'],
  ],
  [
    ['30-storage.js', 'function openDb'],
    ['31-edition-storage.js', 'function makeEditionId'],
    ['32-library-relations.js', 'async function refreshArchivesBoundToEdition'],
    ['33-library-resolution.js', 'async function findArchiveCandidates'],
    ['34-tracking-storage.js', 'async function listTrackingSearches'],
    ['35-data-portability.js', 'async function exportBackup'],
  ],
  [
    ['50-page.js', 'function parseExhPageContext'],
    ['51-gallery-metadata.js', 'async function fetchGalleryGdataBatch'],
    ['52-tracking-navigation.js', 'async function markTrackingBreakpoint'],
    ['53-gallery-search.js', 'async function importRelatedOnlineEditions'],
    ['54-tracking-refresh.js', 'async function refreshSingleTrackingRecord'],
    ['55-page-parsers.js', 'function parseListCard'],
  ],
  [
    ['60-ui-page.js', 'function libraryCompareCardHtml'],
    ['61-hover-preview.js', 'async function showHoverPreview'],
    ['62-list-item-ui.js', 'async function enhanceListItem'],
    ['63-tracking-bar.js', 'function injectTrackingBar'],
    ['64-gallery-page-ui.js', 'async function enhanceGalleryPage'],
  ],
];

console.log('ExH module boundaries');

const sources = new Map(
  manifest.parts.map((filename) => [
    filename,
    fs.readFileSync(path.join(partsRoot, filename), 'utf8'),
  ])
);

for (const group of groups) {
  const expectedOrder = group.map(([filename]) => filename);
  const indexes = expectedOrder.map((filename) => manifest.parts.indexOf(filename));
  assert.ok(indexes.every((index) => index >= 0), `manifest is missing ${expectedOrder.join(', ')}`);
  assert.deepEqual(
    indexes,
    [...indexes].sort((left, right) => left - right),
    `${expectedOrder[0]} group must remain in dependency order`
  );
  assert.equal(
    indexes.at(-1) - indexes[0],
    expectedOrder.length - 1,
    `${expectedOrder[0]} group must remain contiguous`
  );

  for (const [filename, ownedEntry] of group) {
    const source = sources.get(filename);
    assert.ok(source.includes(ownedEntry), `${filename} is missing ${ownedEntry}`);
    for (const [otherFilename, foreignEntry] of group) {
      if (otherFilename === filename) continue;
      assert.ok(!source.includes(foreignEntry), `${filename} owns ${foreignEntry}`);
    }
  }
}

assert.equal(manifest.injectAfter['10-core.js'], undefined);
assert.deepEqual(manifest.injectAfter['12-site-theme.js'], [
  'packages/shared/creamu-workbench-css.js',
  'packages/shared/creamu-workbench-geometry.js',
  'packages/shared/creamu-workbench-interactions.js',
  'packages/shared/creamu-webdav.js',
]);

const declarations = new Map();
const declarationPattern = /^  (?:(?:async\s+)?function|class)\s+([A-Za-z_$][\w$]*)|^  (?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/gm;
for (const [filename, source] of sources) {
  for (const match of source.matchAll(declarationPattern)) {
    const name = match[1] || match[2];
    const previous = declarations.get(name);
    assert.equal(previous, undefined, `${name} is declared by both ${previous} and ${filename}`);
    declarations.set(name, filename);
  }
}

console.log('ExH module boundary tests passed (4 groups)');
