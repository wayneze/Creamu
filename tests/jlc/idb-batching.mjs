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

const multiStoreMatch = source.match(
  /async function getAllFromStores[\s\S]*?(?=\n\s*async function getAllFromStore)/
);
assert.ok(multiStoreMatch, 'getAllFromStores implementation not found');

let multiStoreTransaction = null;
let multiStoreTransactionCalls = 0;
const multiStoreRequests = new Map();
const multiStoreContext = {
  db: {
    objectStoreNames: {
      contains(name) {
        return name !== 'missing';
      },
    },
    transaction(stores, mode) {
      multiStoreTransactionCalls += 1;
      assert.deepEqual(Array.from(stores), ['emby_data', 'tracking_searches']);
      assert.equal(mode, 'readonly');
      multiStoreTransaction = {
        objectStore(name) {
          return {
            getAll() {
              const request = { result: [] };
              multiStoreRequests.set(name, request);
              return request;
            },
          };
        },
        oncomplete: null,
        onerror: null,
        onabort: null,
      };
      return multiStoreTransaction;
    },
  },
};
vm.createContext(multiStoreContext);
vm.runInContext(multiStoreMatch[0], multiStoreContext);

const multiStorePending = multiStoreContext.getAllFromStores([
  'emby_data',
  'tracking_searches',
  'missing',
  'emby_data',
]);
assert.equal(multiStoreTransactionCalls, 1, 'multiple startup stores should share one transaction');
multiStoreRequests.get('emby_data').result = [{ id: 'vid_A-001', type: 'movie' }];
multiStoreRequests.get('tracking_searches').result = [{ id: 'track-a' }];
multiStoreRequests.forEach(request => request.onsuccess());
multiStoreTransaction.oncomplete();
const multiStoreRows = await multiStorePending;
assert.equal(multiStoreRows.get('emby_data').length, 1);
assert.equal(multiStoreRows.get('tracking_searches').length, 1);
assert.deepEqual(Array.from(multiStoreRows.get('missing')), []);

const radarMatch = source.match(
  /function getEmbyDataSnapshot[\s\S]*?(?=\r?\n\s*function syncEmby)/
);
assert.ok(radarMatch, 'Emby snapshot implementation not found');
let radarReads = 0;
const radarContext = {
  embyDataSnapshot: null,
  knownPersons: new Set(),
  libraryDataRevision: 0,
  config: { custom_persons: ['Manual Person'] },
  async getAllFromStore() {
    radarReads += 1;
    return [];
  },
};
vm.createContext(radarContext);
vm.runInContext(radarMatch[0], radarContext);
const radarSnapshot = await radarContext.loadRadarData([
  { id: 'vid_A-001', type: 'movie' },
  { id: 'person-a', type: 'person', name: 'Person A' },
]);
assert.equal(radarReads, 0, 'preloaded Emby rows should avoid another store read');
assert.equal(radarSnapshot.movieCount, 1);
assert.deepEqual(Array.from(radarSnapshot.personNames), ['Person A']);
assert.deepEqual(Array.from(radarContext.knownPersons).sort(), ['Manual Person', 'Person A']);
assert.equal(
  radarContext.getEmbyMovieRecordsFromSnapshot(['a-001', 'missing']).has('vid_A-001'),
  true,
  'list decoration should resolve Emby membership from the startup snapshot'
);

const writeMatch = source.match(
  /async function setManyVals[\s\S]*?(?=\n\s*async function setVal)/
);
assert.ok(writeMatch, 'setManyVals implementation not found');

let writeTransaction = null;
let dirtyMarks = 0;
const writes = [];
const writeContext = {
  db: {
    transaction(store, mode) {
      assert.equal(store, 'meta_cache');
      assert.equal(mode, 'readwrite');
      writeTransaction = {
        objectStore() {
          return {
            put(value) {
              writes.push(value);
            },
          };
        },
        oncomplete: null,
        onerror: null,
        onabort: null,
      };
      return writeTransaction;
    },
  },
  markIdbStoreDirty(store) {
    assert.equal(store, 'meta_cache');
    dirtyMarks += 1;
  },
};
vm.createContext(writeContext);
vm.runInContext(writeMatch[0], writeContext);

const writePending = writeContext.setManyVals('meta_cache', [
  { avid: 'A-001', genres: ['A'] },
  { avid: 'B-002', genres: ['B'] },
]);
assert.equal(writes.length, 2, 'one batch should enqueue every cache row');
writeTransaction.oncomplete();
assert.equal(await writePending, true, 'a committed batch should report success');
assert.equal(dirtyMarks, 1, 'one batch should invalidate its store once');

const failedWrite = writeContext.setManyVals('meta_cache', [
  { avid: 'C-003', genres: ['C'] },
]);
writeTransaction.onabort();
assert.equal(await failedWrite, false, 'an aborted batch should report failure');
assert.equal(dirtyMarks, 1, 'an aborted batch must not invalidate committed data');

console.log('JLC IndexedDB batching tests OK');
