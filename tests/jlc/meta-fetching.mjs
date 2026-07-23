import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('packages/jlc-commander/src/parts/10-core.js', 'utf8');

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

const budgetMatch = source.match(/const META_FETCH_BUDGET_MS = (\d+);/);
assert.ok(budgetMatch, 'metadata fetch budget not found');
assert.ok(Number(budgetMatch[1]) <= 10_000, 'metadata fetch budget must keep list enrichment bounded');

const retryMatch = source.match(/const META_FETCH_RETRY_LIMIT = (\d+);/);
assert.ok(retryMatch, 'metadata retry limit not found');
assert.equal(Number(retryMatch[1]), 1, 'a failed list enrichment must not replay the complete provider chain');

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

const queueSource = source.match(
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

const fetchSource = source.match(/async function fetchMeta\([\s\S]*?(?=\n\s*const META_FETCH_CONCURRENCY)/);
assert.ok(fetchSource, 'metadata fetch implementation not found');
assert.match(fetchSource[0], /getMetaRequestTimeout\(deadline\)/);

console.log('JLC metadata fetching tests OK');
