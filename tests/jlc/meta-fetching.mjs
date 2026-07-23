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

const fetchSource = source.match(/async function fetchMeta\([\s\S]*?(?=\n\s*const META_FETCH_CONCURRENCY)/);
assert.ok(fetchSource, 'metadata fetch implementation not found');
assert.match(fetchSource[0], /getMetaRequestTimeout\(deadline\)/);

console.log('JLC metadata fetching tests OK');
