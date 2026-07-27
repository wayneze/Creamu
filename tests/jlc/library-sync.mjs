import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const packageRoot = 'packages/jlc-commander';
const manifest = JSON.parse(fs.readFileSync(`${packageRoot}/src/parts.manifest.json`, 'utf8'));
const coreSource = fs.readFileSync(`${packageRoot}/src/parts/10-core.js`, 'utf8');
const source = fs.readFileSync(`${packageRoot}/src/parts/17-library-sync.js`, 'utf8');

const coreIndex = manifest.parts.indexOf('10-core.js');
const idbIndex = manifest.parts.indexOf('16-indexeddb.js');
const libraryIndex = manifest.parts.indexOf('17-library-sync.js');
const decorationIndex = manifest.parts.indexOf('18-commander-decoration.js');
assert.ok(coreIndex >= 0 && coreIndex < idbIndex, 'IndexedDB runtime should load after core state');
assert.ok(idbIndex < libraryIndex, 'library sync should load after IndexedDB helpers');
assert.ok(libraryIndex < decorationIndex, 'library snapshot should load before page decoration');
assert.doesNotMatch(coreSource, /\b(?:async\s+)?function\s+(?:initDB|getVal|syncEmby)\b/);

const parsingContext = {};
vm.createContext(parsingContext);
vm.runInContext(source, parsingContext);

const movies = parsingContext.parseEmbyMovieRecords({
  Items: [
    { Name: 'abc-123 sample' },
    { Path: '/media/ABC-123/duplicate.mkv' },
    { Path: '/media/ipx-456/movie.mkv' },
    { Name: 'A-123 is not a supported code' },
    { Name: 'missing code' },
  ],
});
assert.deepEqual(
  Array.from(movies, record => ({ ...record })),
  [
    { id: 'vid_ABC-123', type: 'movie' },
    { id: 'vid_IPX-456', type: 'movie' },
  ],
  'movie records should normalize codes and remove duplicates'
);
assert.deepEqual(Array.from(parsingContext.parseEmbyMovieRecords(null)), []);

const persons = parsingContext.parseEmbyPersonRecords({
  Items: [
    { Name: ' Alice ' },
    { Name: 'Alice' },
    { Name: 'Bob' },
    { Name: '   ' },
    {},
  ],
});
assert.deepEqual(
  Array.from(persons, record => ({ ...record })),
  [
    { id: 'p_Alice', name: 'Alice', type: 'person' },
    { id: 'p_Bob', name: 'Bob', type: 'person' },
  ],
  'person records should trim names, ignore blanks, and remove duplicates'
);

let replaceTransaction = null;
let replaceTransactionCalls = 0;
let replaceDirtyMarks = 0;
let replaceOperations = [];
let replaceAbortCalls = 0;
let rejectedReplaceId = '';
const replaceContext = {
  db: {
    transaction(store, mode) {
      replaceTransactionCalls += 1;
      assert.equal(store, 'emby_data');
      assert.equal(mode, 'readwrite');
      replaceOperations = [];
      replaceTransaction = {
        objectStore() {
          return {
            clear() {
              replaceOperations.push('clear');
            },
            put(record) {
              if (record.id === rejectedReplaceId) throw new Error('invalid Emby row');
              replaceOperations.push(`put:${record.id}`);
            },
          };
        },
        abort() {
          replaceAbortCalls += 1;
        },
        oncomplete: null,
        onerror: null,
        onabort: null,
        error: null,
      };
      return replaceTransaction;
    },
  },
  markIdbStoreDirty(store) {
    assert.equal(store, 'emby_data');
    replaceDirtyMarks += 1;
  },
};
vm.createContext(replaceContext);
vm.runInContext(source, replaceContext);

const committedReplace = replaceContext.replaceEmbyData([
  { id: 'vid_ABC-123', type: 'movie' },
  { id: 'p_Alice', name: 'Alice', type: 'person' },
]);
assert.deepEqual(replaceOperations, ['clear', 'put:vid_ABC-123', 'put:p_Alice']);
replaceTransaction.oncomplete();
assert.equal(await committedReplace, true);
assert.equal(replaceTransactionCalls, 1, 'one replacement should use one write transaction');
assert.equal(replaceDirtyMarks, 1, 'a committed replacement should invalidate once');

const abortedReplace = replaceContext.replaceEmbyData([
  { id: 'vid_IPX-456', type: 'movie' },
]);
replaceTransaction.onabort();
await assert.rejects(abortedReplace, /Emby 数据写入已中止/);
assert.equal(replaceDirtyMarks, 1, 'an aborted replacement must not invalidate committed data');

rejectedReplaceId = 'p_Broken';
await assert.rejects(
  replaceContext.replaceEmbyData([
    { id: 'vid_IPX-456', type: 'movie' },
    { id: 'p_Broken', name: 'Broken', type: 'person' },
  ]),
  /invalid Emby row/
);
assert.equal(replaceAbortCalls, 1, 'an invalid replacement row must abort the clear-and-replace transaction');
assert.equal(replaceDirtyMarks, 1, 'an enqueue failure must not publish a partial Emby snapshot');

const requests = [];
const syncOperations = [];
const buttons = [
  { textContent: '同步 A', disabled: false },
  { textContent: '同步 B', disabled: false },
];
let syncTransaction = null;
let syncTransactionCalls = 0;
let syncDirtyMarks = 0;
let unexpectedStoreReads = 0;
let refreshCalls = 0;
const notifications = [];
const syncContext = {
  config: {
    emby_url: 'http://media.test/',
    emby_key: 'key value',
    custom_persons: [],
  },
  db: {
    transaction(store, mode) {
      syncTransactionCalls += 1;
      assert.equal(store, 'emby_data');
      assert.equal(mode, 'readwrite');
      syncTransaction = {
        objectStore() {
          return {
            clear() {
              syncOperations.push('clear');
            },
            put(record) {
              syncOperations.push(`put:${record.id}`);
            },
          };
        },
        oncomplete: null,
        onerror: null,
        onabort: null,
        error: null,
      };
      return syncTransaction;
    },
  },
  document: {
    getElementById(id) {
      if (id === 'jlc-btn-sync') return buttons[0];
      if (id === 'jlc-wb-btn-sync') return buttons[1];
      return null;
    },
  },
  GM_xmlhttpRequest(options) {
    requests.push(options);
  },
  getAllFromStore() {
    unexpectedStoreReads += 1;
    return Promise.resolve([]);
  },
  markIdbStoreDirty(store) {
    assert.equal(store, 'emby_data');
    syncDirtyMarks += 1;
  },
  async refreshLibraryUI() {
    refreshCalls += 1;
  },
  async refreshCommanderDecorations() {
    refreshCalls += 1;
  },
  showAlert(message, isError) {
    notifications.push({ message, isError: !!isError });
  },
  alert(message) {
    notifications.push({ message, isError: false });
  },
  knownPersons: new Set(),
  embyDataSnapshot: null,
  libraryDataRevision: 0,
};
vm.createContext(syncContext);
vm.runInContext(source, syncContext);

const syncPending = syncContext.syncEmby();
assert.equal(requests.length, 2, 'movie and person requests should start before either response completes');
assert.equal(requests[0].url, 'http://media.test/Items?IncludeItemTypes=Movie&Recursive=true&Fields=Path&api_key=key%20value');
assert.equal(requests[1].url, 'http://media.test/Persons?Recursive=true&api_key=key%20value');
assert.ok(buttons.every(button => button.disabled), 'all sync entry points should be disabled while syncing');

requests[0].onload({
  status: 200,
  responseText: JSON.stringify({ Items: [{ Name: 'ABC-123' }] }),
});
requests[1].onload({
  status: 200,
  responseText: JSON.stringify({ Items: [{ Name: 'Alice' }] }),
});
await new Promise(resolve => setImmediate(resolve));
assert.equal(syncTransactionCalls, 1, 'one sync should replace the snapshot in one transaction');
assert.deepEqual(syncOperations, ['clear', 'put:vid_ABC-123', 'put:p_Alice']);
syncTransaction.oncomplete();

const syncResult = await syncPending;
assert.deepEqual({ ...syncResult }, { ok: true, movieCount: 1, personCount: 1 });
assert.equal(syncDirtyMarks, 1);
assert.equal(unexpectedStoreReads, 0, 'fresh Emby rows should be reused without a full store read');
assert.equal(refreshCalls, 2);
assert.deepEqual(buttons, [
  { textContent: '同步 A', disabled: false },
  { textContent: '同步 B', disabled: false },
]);
assert.deepEqual(notifications, [{ message: 'Emby 同步完成！', isError: false }]);

console.log('JLC library sync tests OK');
