import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('packages/jlc-commander/src/parts/10-core.js', 'utf8');
const decorationSource = fs.readFileSync('packages/jlc-commander/src/parts/18-commander-decoration.js', 'utf8');
const configMatch = source.match(/const DEFAULT_CONFIG\s*=\s*(\{[\s\S]*?\n\s*\});/);
const queueHelperMatch = decorationSource.match(/function enqueueStablePriority[\s\S]*?(?=\n\s*function prioritizeMetaTask)/);

assert.ok(configMatch, 'DEFAULT_CONFIG not found');
const config = vm.runInNewContext('(' + configMatch[1] + ')');
assert.strictEqual(config.metatube_url, '');
assert.deepStrictEqual(Array.from(config.fav_tags), []);
assert.deepStrictEqual(Array.from(config.hate_tags), []);
assert.deepStrictEqual(Array.from(config.custom_persons), []);

assert.ok(queueHelperMatch, 'enqueueStablePriority not found');
const enqueueStablePriority = vm.runInNewContext(`(${queueHelperMatch[0]})`);
const queue = [
  { id: 'priority-1', prioritized: true },
  { id: 'normal-1', prioritized: false },
];
enqueueStablePriority(queue, { id: 'priority-2', prioritized: true }, true, item => item.prioritized);
enqueueStablePriority(queue, { id: 'normal-2', prioritized: false }, false, item => item.prioritized);
assert.deepStrictEqual(Array.from(queue, item => item.id), [
  'priority-1',
  'priority-2',
  'normal-1',
  'normal-2',
]);

console.log('JLC core tests OK');
