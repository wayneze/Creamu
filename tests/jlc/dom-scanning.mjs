import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function extract(source, pattern, label) {
  const match = source.match(pattern);
  assert.ok(match, label + ' not found');
  return match[0];
}

const coreSource = fs.readFileSync('packages/jlc-commander/src/parts/10-core.js', 'utf8');
assert.doesNotMatch(coreSource, /#jlc-(?:trigger|panel)/, 'legacy panel styles must stay out of the active core');
assert.doesNotMatch(coreSource, /\.jlc-setting-entry/, 'removed settings entry styles must not return');
const collectSource = extract(
  coreSource,
  /function collectCommanderItems[\s\S]*?(?=\n\s*function isRectNearViewport)/,
  'commander item collection'
);

let documentQueryCount = 0;
const first = { id: 'first', matches: selector => selector === '.item-b' };
const second = { id: 'second', matches: selector => selector === '.item-b' };
const unrelated = { id: 'other', matches: () => false };
const grid = { id: 'grid-b', children: [first, unrelated, second] };
const document = {
  getElementById(id) {
    return id === 'grid-b' ? grid : null;
  },
  querySelectorAll() {
    documentQueryCount += 1;
    return [first, second];
  },
};
const collectContext = { document };
vm.createContext(collectContext);
vm.runInContext(collectSource, collectContext);

assert.deepEqual(
  Array.from(collectContext.collectCommanderItems(document), item => item.id),
  ['first', 'second']
);
assert.equal(documentQueryCount, 0, 'document collection should use direct #grid-b children');
assert.deepEqual(
  Array.from(collectContext.collectCommanderItems(grid), item => item.id),
  ['first', 'second']
);

const workbenchSource = fs.readFileSync('packages/jlc-commander/src/parts/20-workbench.js', 'utf8');
const mutationSource = extract(
  workbenchSource,
  /function collectCommanderMutationItems[\s\S]*?(?=\n\s*function ensureCommanderObserver)/,
  'commander mutation collection'
);
const collectCommanderMutationItems = vm.runInNewContext(`(${mutationSource})`);

let subtreeQueries = 0;
const addedItem = {
  id: 'added',
  nodeType: 1,
  matches: selector => selector === '.item-b',
};
const nestedDecoration = {
  nodeType: 1,
  matches: () => false,
  closest: selector => selector === '.item-b' ? addedItem : null,
  querySelectorAll() {
    throw new Error('decorations inside an item must not rescan their subtree');
  },
};
const completedItem = {
  id: 'completed',
  nodeType: 1,
  dataset: { jlcBaseDone: '1' },
  classList: { contains: selector => selector === 'jlc-final-done' },
};
const completedDecoration = {
  nodeType: 1,
  matches: () => false,
  closest: selector => selector === '.item-b' ? completedItem : null,
};
const outerContainer = {
  nodeType: 1,
  matches: () => false,
  closest: () => null,
  querySelectorAll(selector) {
    assert.equal(selector, '.item-b');
    subtreeQueries += 1;
    return [addedItem, second];
  },
};
const ignoredText = { nodeType: 3 };
const mutationItems = collectCommanderMutationItems([
  { addedNodes: [outerContainer, addedItem, nestedDecoration, completedDecoration, ignoredText] },
]);

assert.deepEqual(Array.from(mutationItems, item => item.id), ['added', 'second']);
assert.equal(subtreeQueries, 1, 'only the outer added container should scan for item descendants');
assert.equal(mutationItems.has(completedItem), false, 'completed item decorations must not requeue the item');
assert.match(workbenchSource, /hasIncompleteItem/, 'observer should reserve polling for incomplete items');

console.log('JLC DOM scanning tests OK');
