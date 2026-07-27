import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('packages/jlc-commander/src/parts/15-meta-fetch.js', 'utf8');
const decorationSource = fs.readFileSync('packages/jlc-commander/src/parts/18-commander-decoration.js', 'utf8');

const providerSource = source.match(
  /function getMetaSearchProviderCandidates[\s\S]*?(?=\n\s*function mergeMetaRecords)/
);
assert.ok(providerSource, 'metadata provider selection not found');

const providerContext = {
  isLikelyMgsAvid() {
    return false;
  },
};
vm.createContext(providerContext);
vm.runInContext(providerSource[0], providerContext);

assert.deepEqual(
  Array.from(providerContext.getMetaSearchProviderCandidates('TEST-001')).slice(0, 2),
  ['JavBus', 'JAV321'],
  'ordinary titles should query a tag-bearing provider before fallback providers'
);
assert.deepEqual(
  Array.from(providerContext.getMetaSearchProviderCandidates('FC2-PPV-2812904')),
  ['FC2', 'fc2hub', 'FC2PPVDB', 'JAV321'],
  'FC2 metadata should follow the server provider priority'
);

const budgetMatch = source.match(/const META_FETCH_BUDGET_MS = (\d+);/);
assert.ok(budgetMatch, 'metadata fetch budget not found');
assert.ok(Number(budgetMatch[1]) <= 10_000, 'metadata fetch budget must keep list enrichment bounded');

const retryMatch = decorationSource.match(/const META_FETCH_RETRY_LIMIT = (\d+);/);
assert.ok(retryMatch, 'metadata retry limit not found');
assert.equal(Number(retryMatch[1]), 1, 'a failed list enrichment must not replay the complete provider chain');

const pumpSource = decorationSource.match(
  /function pumpMetaFetchQueue[\s\S]*?(?=\n\s*function hasMetaEnrichmentData)/
);
assert.ok(pumpSource, 'metadata queue pump not found');

async function runPump(cachedMeta) {
  let cacheReads = 0;
  const writes = [];
  let resolveTask;
  const resultPromise = new Promise(resolve => {
    resolveTask = resolve;
  });
  const state = {
    META_FETCH_CONCURRENCY: 1,
    metaFetchActiveCount: 0,
    metaCacheWriteBuffer: new Map(),
    metaFetchQueue: [{
      key: 'http://meta.test\nABP-001',
      base: 'http://meta.test',
      avid: 'ABP-001',
      cachedMeta,
      resolve: resolveTask,
    }],
    metaQueuedTasks: new Map(),
    normalizeMetaRecord(value) { return value || null; },
    normalizeCode(value) {
      return String(value || '').trim().toUpperCase();
    },
    async getVal() {
      cacheReads += 1;
      return null;
    },
    async fetchMeta() {
      return { number: 'ABP-001', genres: ['Drama'] };
    },
    queueMetaCacheWrite(value) {
      writes.push(['meta_cache', value]);
    },
    console,
  };
  vm.createContext(state);
  vm.runInContext(pumpSource[0], state);
  state.pumpMetaFetchQueue();
  const result = await resultPromise;
  return { cacheReads, result, writes };
}

const uncheckedCache = await runPump(undefined);
assert.equal(uncheckedCache.cacheReads, 1, 'an unchecked queue task should load its cache entry');
const knownMiss = await runPump(null);
assert.equal(knownMiss.cacheReads, 0, 'a known cache miss should not be loaded a second time');
assert.equal(knownMiss.writes.length, 1, 'fresh metadata should still be cached');

const cacheWriterSource = decorationSource.match(
  /function scheduleMetaCacheWriteFlush[\s\S]*?(?=\n\s*function isPlaceholderCover)/
);
assert.ok(cacheWriterSource, 'metadata cache writer not found');
const cacheWriteCalls = [];
let timerId = 0;
const cacheWriterContext = {
  META_CACHE_WRITE_DELAY: 200,
  META_CACHE_WRITE_BATCH_SIZE: 3,
  META_CACHE_WRITE_RETRY_DELAY: 1000,
  META_CACHE_WRITE_RETRY_LIMIT: 3,
  metaCacheWriteBuffer: new Map(),
  metaCacheWriteTimer: null,
  metaCacheWriteActive: null,
  metaCacheWriteRetryCount: 0,
  db: {},
  window: {
    setTimeout() {
      timerId += 1;
      return timerId;
    },
    clearTimeout() {},
  },
  normalizeCode(value) {
    return String(value || '').trim().toUpperCase();
  },
  async setManyVals(store, rows) {
    cacheWriteCalls.push([store, rows]);
    return cacheWriterContext.writeSucceeds;
  },
  writeSucceeds: true,
  console,
};
vm.createContext(cacheWriterContext);
vm.runInContext(cacheWriterSource[0], cacheWriterContext);

cacheWriterContext.queueMetaCacheWrite({ avid: 'a-001', genres: ['old'] });
cacheWriterContext.queueMetaCacheWrite({ avid: 'A-001', genres: ['new'] });
cacheWriterContext.queueMetaCacheWrite({ avid: 'B-002', genres: ['B'] });
cacheWriterContext.queueMetaCacheWrite({ avid: 'C-003', genres: ['C'] });
await cacheWriterContext.flushMetaCacheWrites();
assert.equal(cacheWriteCalls.length, 1, 'a full metadata buffer should use one transaction');
assert.deepEqual(
  Array.from(cacheWriteCalls[0][1], row => row.avid),
  ['A-001', 'B-002', 'C-003'],
  'the metadata buffer should keep the latest normalized row per avid'
);
assert.deepEqual(
  Array.from(cacheWriteCalls[0][1][0].genres),
  ['new'],
  'a newer metadata result should replace its buffered predecessor'
);
assert.equal(cacheWriterContext.metaCacheWriteBuffer.size, 0);

cacheWriterContext.writeSucceeds = false;
cacheWriterContext.queueMetaCacheWrite({ avid: 'D-004', genres: ['D'] });
await cacheWriterContext.flushMetaCacheWrites();
assert.equal(
  cacheWriterContext.metaCacheWriteBuffer.has('D-004'),
  true,
  'a failed metadata transaction must keep buffered rows for retry'
);
cacheWriterContext.writeSucceeds = true;
await cacheWriterContext.flushMetaCacheWrites();
assert.equal(cacheWriterContext.metaCacheWriteBuffer.size, 0, 'a later retry should drain the buffer');

const missCacheSource = source.match(
  /function normalizeMetaBase[\s\S]*?(?=\n\s*async function fetchMeta\()/
);
assert.ok(missCacheSource, 'metadata miss cache helpers not found');
const missCacheContext = {
  config: { metatube_url: 'http://meta.test///' },
  normalizeCode(value) {
    return String(value || '').trim().toUpperCase();
  },
  META_MISS_TTL_MS: 60_000,
  metaMissCache: new Map(),
  Date,
};
vm.createContext(missCacheContext);
vm.runInContext(missCacheSource[0], missCacheContext);
const missKey = missCacheContext.getMetaFetchKey(' abp-001 ', 'http://meta.test///');
assert.equal(missKey, 'http://meta.test\nABP-001');
missCacheContext.rememberMetaMiss(missKey, 1000);
assert.equal(missCacheContext.hasRecentMetaMiss(missKey, 1000 + 59_999), true);
assert.equal(missCacheContext.hasRecentMetaMiss(missKey, 1000 + 60_000), false);
assert.equal(missCacheContext.metaMissCache.size, 0, 'expired miss entries should be removed');

const queueSource = decorationSource.match(
  /function queueMetaFetch[\s\S]*?(?=\n\s*function setItemReleaseDate)/
);
assert.ok(queueSource, 'metadata queue implementation not found');
const queueState = {
  config: { metatube_url: 'http://meta.test' },
  normalizeMetaBase: value => String(value || '').replace(/\/+$/, ''),
  getMetaFetchKey: (avid, base) => `${base}\n${String(avid).toUpperCase()}`,
  hasRecentMetaMiss: () => true,
  hasMetaEnrichmentData: () => false,
  rememberMetaMiss() {},
  clearMetaMiss() {},
  metaInflight: new Map(),
  metaQueuedTasks: new Map(),
  metaFetchQueue: [],
  enqueueStablePriority(queue, item) { queue.push(item); },
  prioritizeMetaTask() {},
  pumpMetaFetchQueue() {},
};
vm.createContext(queueState);
vm.runInContext(queueSource[0], queueState);
const skipped = await queueState.queueMetaFetch('ABP-001');
assert.equal(skipped, null, 'a recent miss should not enqueue another provider chain');
assert.equal(queueState.metaFetchQueue.length, 0);

async function runQueueResult(result) {
  const events = [];
  const state = {
    config: { metatube_url: 'http://meta.test' },
    normalizeMetaBase: value => String(value || '').replace(/\/+$/, ''),
    getMetaFetchKey: (avid, base) => `${base}\n${String(avid).toUpperCase()}`,
    hasRecentMetaMiss: () => false,
    hasMetaEnrichmentData: value => !!(
      value && (value.genres?.length || value.actors?.length || value.releaseDate)
    ),
    rememberMetaMiss(key) { events.push(['miss', key]); },
    clearMetaMiss(key) { events.push(['clear', key]); },
    metaInflight: new Map(),
    metaQueuedTasks: new Map(),
    metaFetchQueue: [],
    enqueueStablePriority(queue, item) { queue.push(item); },
    prioritizeMetaTask() {},
    pumpMetaFetchQueue() {
      const task = state.metaFetchQueue.shift();
      state.metaQueuedTasks.delete(task.key);
      task.resolve(result);
    },
  };
  vm.createContext(state);
  vm.runInContext(queueSource[0], state);
  const value = await state.queueMetaFetch('ABP-001');
  return { value, events, state };
}

const missed = await runQueueResult(null);
assert.equal(missed.value, null);
assert.deepEqual(missed.events, [['miss', 'http://meta.test\nABP-001']]);
assert.equal(missed.state.metaInflight.size, 0, 'completed misses should leave no inflight entry');

const partial = await runQueueResult({ number: 'ABP-001' });
assert.equal(partial.value.number, 'ABP-001');
assert.deepEqual(partial.events, [['miss', 'http://meta.test\nABP-001']]);

const fetched = await runQueueResult({ number: 'ABP-001', genres: ['Drama'] });
assert.equal(fetched.value.number, 'ABP-001');
assert.deepEqual(fetched.events, [['clear', 'http://meta.test\nABP-001']]);
assert.equal(fetched.state.metaInflight.size, 0, 'completed hits should leave no inflight entry');

let providerClock = 1_000;
const providerAttempts = [];
const providerFallbackContext = {
  config: { metatube_url: 'http://meta.test' },
  Date: { now: () => providerClock },
  isLikelyMgsAvid: () => false,
  normalizeCode(value) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '');
  },
  normalizeMetaRecord(value) {
    return value && typeof value === 'object' ? value : null;
  },
  extractMetaTubeData(payload) {
    return payload?.data ?? payload;
  },
  async requestJSON(rawUrl, timeout) {
    const url = new URL(rawUrl);
    const provider = url.searchParams.get('provider') || 'all';
    providerAttempts.push({ provider, timeout });
    if (provider === 'JavBus') {
      providerClock += timeout;
      return null;
    }
    if (provider === 'JAV321') {
      return { data: [{ number: 'ABP-001', genres: ['Drama'] }] };
    }
    return null;
  },
};
vm.createContext(providerFallbackContext);
vm.runInContext(source, providerFallbackContext);
assert.equal(
  providerFallbackContext.pickMetaSearchHit(
    [{ number: 'AS-091', genres: ['Unrelated'] }],
    'SSIS-001'
  ),
  null,
  'an unrelated first search result must not be accepted as metadata for another code'
);
for (const [input, canonical, provider] of [
  ['CARIB-050422-001', '050422-001', 'Caribbeancom'],
  ['10MU-042922_01', '042922_01', '10musume'],
  ['PACO-032622_623', '032622_623', 'PACOPACOMAMA'],
  ['MURA-091522_959', '091522_959', 'MURAMURA'],
]) {
  assert.equal(
    providerFallbackContext.pickMetaSearchHit([{ number: canonical, provider }], input)?.provider,
    provider,
    'known maker prefixes should match MetaTube canonical numbers'
  );
}
assert.equal(
  providerFallbackContext.pickMetaSearchHit(
    [{ number: 'FC2-1234567', provider: 'FC2PPVDB' }],
    'FC2-PPV-1234567'
  )?.provider,
  'FC2PPVDB',
  'FC2-PPV aliases should match MetaTube canonical numbers'
);
const fallbackResult = await providerFallbackContext.fetchMeta('ABP-001');
assert.deepEqual(
  fallbackResult?.genres,
  ['Drama'],
  'one stalled provider should leave time for the next targeted provider'
);
assert.ok(
  providerAttempts[0].timeout <= 3_000,
  'one provider attempt should not consume the complete metadata budget'
);
assert.deepEqual(
  providerAttempts.map(attempt => attempt.provider),
  ['JavBus', 'JAV321'],
  'targeted provider fallback order should remain stable'
);

const fetchSource = source.match(/async function fetchMeta\([\s\S]*$/);
assert.ok(fetchSource, 'metadata fetch implementation not found');
assert.match(fetchSource[0], /getMetaRequestTimeout\(deadline\)/);

console.log('JLC metadata fetching tests OK');
