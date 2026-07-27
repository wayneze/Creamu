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
  '40-tracking-search.js',
  '41-javlibrary-combo-catalog.js',
  '42-javlibrary-search-runtime.js',
];

console.log('JLC tracking search modules');

assert.deepEqual(
  manifest.parts.filter((filename) => /^4[012]-/.test(filename)),
  expectedParts,
  'tracking search parts should remain in runtime dependency order'
);

const trackingSource = fs.readFileSync(path.join(partsRoot, expectedParts[0]), 'utf8');
const catalogSource = fs.readFileSync(path.join(partsRoot, expectedParts[1]), 'utf8');
const runtimeSource = fs.readFileSync(path.join(partsRoot, expectedParts[2]), 'utf8');

assert.match(trackingSource, /function normalizeJavLibraryComboOptionLabel/);
assert.match(trackingSource, /async function loadJavLibraryComboSearchOptions/);
assert.doesNotMatch(trackingSource, /function getJavLibraryComboStaticValueMap/);
assert.doesNotMatch(trackingSource, /async function resolveJavLibrarySearchUrl/);
assert.match(catalogSource, /function getJavLibraryComboStaticValueMap/);
assert.doesNotMatch(catalogSource, /async function requestJavLibrarySearchId/);
assert.match(runtimeSource, /async function resolveJavLibrarySearchUrl/);
assert.doesNotMatch(runtimeSource, /const genreEntries = \[/);

function extract(source, pattern, label) {
  const match = source.match(pattern);
  assert.ok(match, label + ' not found');
  return match[0];
}

const normalizerSource = extract(
  trackingSource,
  /function normalizeJavLibraryComboOptionLabel[\s\S]*?(?=\n\s*function resolveJavLibraryComboFieldAlias)/,
  'combo option normalizer'
);
const resolverSource = extract(
  runtimeSource,
  /function resolveJavLibraryComboStaticValue[\s\S]*?(?=\n\s*function shouldTryLoadJavLibraryComboOptions)/,
  'static combo resolver'
);
const context = { compactCalls: 0 };
context.compactText = (value) => {
  context.compactCalls += 1;
  return String(value || '').replace(/\s+/g, ' ').trim();
};
vm.createContext(context);
vm.runInContext(normalizerSource + '\n' + catalogSource + '\n' + resolverSource, context);

assert.equal(context.compactCalls, 0, 'loading the userscript should not build the combo catalog');
assert.equal(vm.runInContext('javLibraryComboStaticValueMap', context), null);
assert.equal(context.normalizeJavLibraryComboOptionLabel('AI 生成作品'), 'ai生成作品');
assert.equal(context.normalizeJavLibraryComboOptionLabel('【女同性恋】'), '女同性恋');
assert.equal(context.resolveJavLibraryComboStaticValue('genre', 'AI 生成作品'), '676');
assert.equal(context.resolveJavLibraryComboStaticValue('genre', '（女同性恋）'), '15');
assert.ok(vm.runInContext('javLibraryComboStaticValueMap', context));

const callsAfterBuild = context.compactCalls;
assert.equal(
  vm.runInContext('getJavLibraryComboStaticValueMap() === javLibraryComboStaticValueMap', context),
  true
);
assert.equal(context.compactCalls, callsAfterBuild, 'the combo catalog should be reused after its first build');

console.log('JLC tracking search module tests passed');
