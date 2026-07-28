import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const partsRoot = path.resolve('packages/exh-commander/src/parts');
const readPart = (name) => fs.readFileSync(path.join(partsRoot, name), 'utf8');

const defaults = {
  auto_cluster: true,
  cluster_threshold: 0.82,
  lang_order: ['zh', 'ja', 'en', 'other'],
  censor_order: ['uncensored', 'light', 'heavy', 'unknown'],
  group_whitelist: [],
  group_blacklist: [],
};
const savedBatches = [];
const context = vm.createContext({
  console,
  Date,
  URL,
  config: { ...defaults },
  DEFAULT_CONFIG: defaults,
  STORE_EDITIONS: 'editions',
  location: { origin: 'https://e-hentai.org', hostname: 'e-hentai.org' },
  compactText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  },
  nowMs: () => 1_800_000_000_000,
  uid: (prefix) => `${prefix || 'id'}_test`,
  async idbPutBatches(rowsByStore) {
    savedBatches.push(rowsByStore);
  },
  async gmRequest() {
    throw new Error('gmRequest response is not configured');
  },
});

for (const file of ['20-domain.js', '31-edition-storage.js', '51-gallery-metadata.js']) {
  vm.runInContext(readPart(file), context, { filename: file });
}

console.log('ExH availability contracts');

const detailedResponse = {
  gmetadata: [
    {
      gid: 100,
      token: 'aaaaaaaaaa',
      title: '[Group] Expunged work',
      posted: '1700000000',
      filecount: '42',
      filesize: '2048',
      tags: ['language:chinese'],
      expunged: true,
    },
    { gid: 101, error: 'Key missing, or incorrect key provided.' },
    {
      gid: 102,
      token: 'cccccccccc',
      title: 'Active work',
      posted: '1700000100',
      filecount: '24',
      filesize: '4096',
      tags: ['language:english'],
      expunged: false,
    },
  ],
};
context.gmRequest = async () => ({ responseText: JSON.stringify(detailedResponse) });
const detailed = await context.fetchGalleryGdataBatchDetailed([
  { gid: '100', token: 'aaaaaaaaaa' },
  { gid: '101', token: 'bbbbbbbbbb' },
  { gid: '102', token: 'cccccccccc' },
]);
assert.equal(detailed.successfulBatches, 1);
assert.equal(detailed.failedBatches, 0);
assert.equal(detailed.records['100'].availability_status, 'expunged');
assert.equal(detailed.records['100'].expunged, 1);
assert.equal(detailed.records['101'].availability_status, 'unavailable');
assert.equal(detailed.records['101'].token, 'bbbbbbbbbb');
assert.match(detailed.records['101'].availability_reason, /Key missing/);
assert.equal(detailed.records['102'].availability_status, 'active');
assert.equal(detailed.records['102'].expunged, 0);

const previous = {
  id: '200:dddddddddd',
  gid: '200',
  token: 'dddddddddd',
  work_id: 'work-200',
  title_raw: 'Stored work',
  title_core: 'stored work',
  tags: ['language:chinese'],
  language: 'zh',
  censor_tier: 'unknown',
  availability_status: 'expunged',
  availability_checked_at: 100,
  availability_reason: 'old state',
  availability_error: '',
  expunged: 1,
};
const mergedWithoutCheck = context.mergeEditionRecord(
  { gid: '200', token: 'dddddddddd', title_raw: 'List result' },
  previous
).merged;
assert.equal(mergedWithoutCheck.availability_status, 'expunged');
assert.equal(mergedWithoutCheck.availability_checked_at, 100);
assert.equal(mergedWithoutCheck.expunged, 1);

const mergedOlderCheck = context.mergeEditionRecord(
  {
    gid: '200',
    token: 'dddddddddd',
    title_raw: 'Older active response',
    availability_status: 'active',
    availability_checked_at: 99,
    expunged: 0,
  },
  previous
).merged;
assert.equal(mergedOlderCheck.availability_status, 'expunged');
assert.equal(mergedOlderCheck.availability_checked_at, 100);
assert.equal(mergedOlderCheck.expunged, 1);

context.gmRequest = async () => ({
  responseText: JSON.stringify({
    gmetadata: [
      {
        gid: 200,
        token: 'dddddddddd',
        title: 'Stored work restored',
        posted: '1700000200',
        filecount: '48',
        filesize: '8192',
        tags: ['language:chinese'],
        expunged: false,
      },
    ],
  }),
});
const recovered = await context.checkEditionAvailabilityBatch([previous]);
assert.equal(recovered.updatedCount, 1);
assert.equal(previous.availability_status, 'active');
assert.equal(previous.expunged, 0);
assert.equal(previous.availability_reason, '');
assert.equal(savedBatches.at(-1).editions[0].availability_status, 'active');

const checkedAtBeforeFailure = previous.availability_checked_at;
const writesBeforeFailure = savedBatches.length;
context.gmRequest = async () => {
  throw new Error('temporary network failure');
};
const failed = await context.checkEditionAvailabilityBatch([previous]);
assert.equal(failed.updatedCount, 0);
assert.equal(failed.failedBatches, 1);
assert.equal(failed.errors[0].type, 'network');
assert.equal(failed.errorUpdatedCount, 1);
assert.equal(savedBatches.length, writesBeforeFailure + 1);
assert.match(savedBatches.at(-1).editions[0].availability_error, /temporary network failure/);
assert.equal(previous.availability_status, 'active');
assert.equal(previous.availability_checked_at, checkedAtBeforeFailure);

const repeatedFailure = await context.checkEditionAvailabilityBatch([previous]);
assert.equal(repeatedFailure.updatedCount, 0);
assert.equal(repeatedFailure.errorUpdatedCount, 0);
assert.equal(savedBatches.length, writesBeforeFailure + 1);

const writesBeforeMalformed = savedBatches.length;
context.gmRequest = async () => ({ responseText: '<html>temporary error</html>' });
const malformed = await context.checkEditionAvailabilityBatch([previous]);
assert.equal(malformed.updatedCount, 0);
assert.equal(malformed.failedBatches, 1);
assert.equal(malformed.errors[0].type, 'response');
assert.equal(malformed.errorUpdatedCount, 1);
assert.equal(savedBatches.length, writesBeforeMalformed + 1);
assert.match(savedBatches.at(-1).editions[0].availability_error, /Unexpected token/);
assert.equal(previous.availability_status, 'active');

const best = context.pickBestEdition(
  [
    {
      gid: '300',
      language: 'zh',
      censor_tier: 'uncensored',
      size_bytes: 1e9,
      group: '',
      availability_status: 'unavailable',
    },
    {
      gid: '301',
      language: 'en',
      censor_tier: 'heavy',
      size_bytes: 1e6,
      group: '',
      availability_status: 'active',
    },
  ],
  defaults
);
assert.equal(best.gid, '301');

console.log('ExH availability contract tests passed');
