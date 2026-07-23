import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('packages/jlc-commander/src/parts/10-core.js', 'utf8');
const match = source.match(
  /async function getManyFromStore[\s\S]*?(?=\n\s*\/\*\* 会进 WebDAV vault)/
);
assert.ok(match, 'getManyFromStore implementation not found');

let transactionCalls = 0;
let lastTransaction = null;
const records = new Map([
  ['A-001', { avid: 'A-001', status: 'like' }],
  ['B-002', { avid: 'B-002', status: 'none' }],
]);
const context = {
  db: {
    transaction(store, mode) {
      transactionCalls += 1;
      assert.equal(store, 'videos');
      assert.equal(mode, 'readonly');
      lastTransaction = {
        objectStore() {
          return {
            get(key) {
              const request = { result: records.get(key) };
              requests.push(request);
              return request;
            },
          };
        },
        oncomplete: null,
        onerror: null,
        onabort: null,
      };
      return lastTransaction;
    },
  },
};
const requests = [];
vm.createContext(context);
vm.runInContext(match[0], context);

const pending = context.getManyFromStore('videos', ['A-001', 'A-001', 'B-002', 'missing']);
assert.equal(transactionCalls, 1, 'one store batch should use one transaction');
assert.equal(requests.length, 3, 'duplicate keys should be de-duplicated');
requests.forEach(request => request.onsuccess());
lastTransaction.oncomplete();

const values = await pending;
assert.deepEqual(values.get('A-001'), { avid: 'A-001', status: 'like' });
assert.deepEqual(values.get('B-002'), { avid: 'B-002', status: 'none' });
assert.equal(values.has('missing'), false);

console.log('JLC IndexedDB batching tests OK');
