import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const partsDir = path.resolve(here, '../../packages/exh-commander/src/parts');
const manifest = JSON.parse(
  fs.readFileSync(path.resolve(partsDir, '../parts.manifest.json'), 'utf8')
);
const storageParts = manifest.parts.filter((filename) => /^3\d-.*\.js$/.test(filename));

function loadStorageContext() {
  const defaults = {
    auto_cluster: true,
    cluster_threshold: 0.82,
    lang_order: ['zh', 'ja', 'en', 'other'],
    censor_order: ['uncensored', 'light', 'heavy', 'unknown'],
    group_whitelist: [],
    group_blacklist: [],
    pages_tolerance_ratio: 0.1,
    pages_tolerance_min: 1,
    pages_tolerance_max: 25,
    size_tolerance_ratio: 0.12,
    size_tolerance_min_bytes: 1024 * 1024,
    bpp_tolerance_ratio: 0.2,
  };
  const sandbox = {
    console,
    Date,
    Math,
    Promise,
    URL,
    config: { ...defaults },
    DEFAULT_CONFIG: defaults,
    location: { origin: 'https://e-hentai.org' },
    compactText(value) {
      return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    },
    nowMs: () => Date.now(),
    uid: (prefix) => `${prefix || 'id'}_test`,
  };
  const context = createContext(sandbox);
  for (const file of ['20-domain.js', ...storageParts]) {
    const source = fs.readFileSync(path.join(partsDir, file), 'utf8');
    runInContext(source, context, { filename: file });
  }
  return context;
}

function makeArchive(context, arcid, title, extra = {}) {
  return {
    arcid,
    title,
    title_core: context.buildTitleCore(title),
    tags: [],
    language: 'zh',
    censor_tier: 'uncensored',
    group: 'Example Group',
    pages: 100,
    ...extra,
  };
}

const storage = loadStorageContext();
const preloadedTracking = {
  id: 'tracking-home',
  site: 'ehentai',
  query_signature: 'ehentai|other||||browse:home||home:/',
  f_search: 'browse:home',
};
assert.equal(
  await storage.findTrackingForContext(
    {
      site: 'ehentai',
      query_signature: preloadedTracking.query_signature,
      f_search: preloadedTracking.f_search,
    },
    [preloadedTracking]
  ),
  preloadedTracking
);
const edition = {
  gid: '710000',
  token: 'aaaaaaaaaa',
  title_raw: 'Alpha Beta Gamma Delta Epsilon',
  title_core: storage.buildTitleCore('Alpha Beta Gamma Delta Epsilon'),
  language: 'zh',
  censor_tier: 'uncensored',
  group: 'Example Group',
  pages: 100,
};
const relevant = [
  makeArchive(storage, 'exact', 'Alpha Beta Gamma Delta Epsilon'),
  makeArchive(storage, 'contains', 'Deluxe Alpha Beta Gamma Delta Epsilon Extra'),
  makeArchive(storage, 'contained', 'Alpha Beta Gamma'),
  makeArchive(storage, 'jaccard', 'Alpha Beta Gamma Delta Zeta'),
];
const distractors = Array.from({ length: 4000 }, (_, index) =>
  makeArchive(storage, `noise-${index}`, `Unrelated Archive Number ${index}`)
);
const sourceBound = makeArchive(storage, 'source-bound', 'Source Bound Archive', {
  tags: ['source:https://e-hentai.org/g/710000/aaaaaaaaaa/'],
});
const exactBound = makeArchive(storage, 'gid-bound', 'Gid Bound Archive', {
  eh_gid: '710000',
});
const snapshot = storage.indexListStorageSnapshot({
  works: [],
  editions: [],
  archives: [...relevant, ...distractors, sourceBound, exactBound],
  links: [],
});

const indexedCandidates = storage.getSnapshotArchiveCandidates(snapshot, edition);
const candidateIds = new Set(indexedCandidates.map((entry) => entry.archive.arcid));
const fullMatches = snapshot.archives.filter(
  (archive) => storage.structuralMatchScore(edition, archive) >= 0.85
);

for (const archive of fullMatches) {
  assert.equal(candidateIds.has(archive.arcid), true, `candidate index dropped ${archive.arcid}`);
}
assert.ok(indexedCandidates.length <= 12, `candidate set stayed too broad: ${indexedCandidates.length}`);
assert.deepEqual(
  Array.from(snapshot.archivesBySourceGid.get('710000') || [], (archive) => archive.arcid).sort(),
  ['gid-bound', 'source-bound']
);
assert.deepEqual(
  Array.from(snapshot.archivesByGid.get('710000') || [], (archive) => archive.arcid),
  ['gid-bound']
);

const cjkEdition = {
  ...edition,
  title_raw: '神秘花园编年史',
  title_core: storage.buildTitleCore('神秘花园编年史'),
};
const cjkArchive = makeArchive(storage, 'cjk-substring', '豪华神秘花园编年史特别版');
const shortArchive = makeArchive(storage, 'short-substring', 'AB');
const substringSnapshot = storage.indexListStorageSnapshot({
  works: [],
  editions: [],
  archives: [cjkArchive, shortArchive],
  links: [],
});
assert.equal(
  storage.getSnapshotArchiveCandidates(substringSnapshot, cjkEdition)
    .some((entry) => entry.archive.arcid === cjkArchive.arcid),
  true
);
assert.equal(
  storage.getSnapshotArchiveCandidates(substringSnapshot, {
    ...edition,
    title_raw: 'AB Extended Edition',
    title_core: storage.buildTitleCore('AB Extended Edition'),
  }).some((entry) => entry.archive.arcid === shortArchive.arcid),
  true
);

// 同搜索词、不同分类过滤是两条独立追更
const deleted = [];
storage.idbDelete = async (_store, id) => deleted.push(id);
storage.idbPut = async () => {};
storage.saveTrackingRecord = async (record) => record;
const plainTrack = {
  id: 'trk-plain',
  site: 'ehentai',
  query_signature: 'ehentai|search||||foo||',
  f_search: 'foo',
  open_url: 'https://e-hentai.org/?f_search=foo',
  updated_at: 1,
};
const catsTrack = {
  id: 'trk-cats',
  site: 'ehentai',
  query_signature: 'ehentai|search||||foo|1021|',
  f_search: 'foo',
  open_url: 'https://e-hentai.org/?f_search=foo&f_cats=1021',
  updated_at: 2,
};
const listed = await storage.listTrackingSearches([plainTrack, catsTrack]);
assert.deepEqual(Array.from(listed, (r) => r.id).sort(), ['trk-cats', 'trk-plain']);
assert.deepEqual(deleted, []);

const artistTrack = {
  id: 'trk-artist',
  site: 'ehentai',
  query_signature: 'ehentai|artist||||artist:"foo$"||',
  f_search: 'artist:"foo$"',
  open_url: 'https://e-hentai.org/?f_search=artist%3A%22foo%24%22',
};
const catsHit = await storage.findTrackingForContext(
  { site: 'ehentai', query_signature: 'ehentai|search||||foo|1021|', f_search: 'foo', f_cats: '1021' },
  [plainTrack, artistTrack]
);
assert.equal(catsHit, null, '不同分类过滤不能命中无过滤的追更');
const plainHit = await storage.findTrackingForContext(
  { site: 'ehentai', query_signature: 'ehentai|search||||foo|0|', f_search: 'foo', f_cats: '0' },
  [artistTrack, plainTrack]
);
assert.equal(plainHit && plainHit.id, 'trk-plain', 'f_search 子串不能命中 artist:foo');

console.log('ExH list storage index tests OK');
