import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const partsRoot = path.join(root, 'packages/exh-commander/src/parts');
const readPart = (name) => fs.readFileSync(path.join(partsRoot, name), 'utf8');

console.log('ExH tracking and UI behavior');

const navigationContext = {
  console,
  URL,
  location: {
    origin: 'https://e-hentai.org',
    href: 'https://e-hentai.org/?f_search=sample',
  },
  sessionStorage: (() => {
    const values = new Map();
    return {
      getItem(key) {
        return values.has(key) ? values.get(key) : null;
      },
      setItem(key, value) {
        values.set(key, String(value));
      },
      removeItem(key) {
        values.delete(key);
      },
    };
  })(),
  compactText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  },
};
vm.createContext(navigationContext);
vm.runInContext(readPart('52-tracking-navigation.js'), navigationContext, {
  filename: '52-tracking-navigation.js',
});

assert.equal(
  typeof navigationContext.resolveTrackingListDepth,
  'function',
  'cursor navigation should expose one shared depth resolver'
);
const trackingId = 'tracking-cursor';
assert.equal(
  navigationContext.resolveTrackingListDepth(
    trackingId,
    { known: true, index: 0, isFirst: true, mode: 'home' },
    'https://e-hentai.org/?f_search=sample',
    -1
  ),
  0
);
assert.equal(
  navigationContext.resolveTrackingListDepth(
    trackingId,
    { known: false, index: -1, isFirst: false, mode: 'cursor' },
    'https://e-hentai.org/?f_search=sample&next=900',
    -1
  ),
  1,
  'next= should move toward older results'
);
assert.equal(
  navigationContext.resolveTrackingListDepth(
    trackingId,
    { known: false, index: -1, isFirst: false, mode: 'cursor' },
    'https://e-hentai.org/?f_search=sample&next=800',
    -1
  ),
  2
);
assert.equal(
  navigationContext.resolveTrackingListDepth(
    trackingId,
    { known: false, index: -1, isFirst: false, mode: 'cursor' },
    'https://e-hentai.org/?f_search=sample&prev=850',
    -1
  ),
  1,
  'prev= should move back toward newer results'
);
assert.equal(
  navigationContext.resolveTrackingListDepth(
    trackingId,
    { known: false, index: -1, isFirst: false, mode: 'cursor' },
    'https://e-hentai.org/?f_search=sample&prev=850',
    -1
  ),
  1,
  're-rendering the same cursor URL must not change depth twice'
);

const savedRows = [];
const storageContext = {
  console,
  Date,
  Math,
  URL,
  location: {
    origin: 'https://e-hentai.org',
    href: 'https://e-hentai.org/?f_search=sample',
  },
  compactText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  },
  nowMs: () => 1_800_000_000_000,
  uid: () => 'tracking-created',
  canonicalizeTrackingOpenUrl: (value) => String(value).split('&next=')[0],
  applyTrackingCoverFields(record, cover) {
    record.top_cover = cover;
    record.cover_url = cover;
  },
  async idbPutBatches(rowsByStore) {
    savedRows.push(...(rowsByStore.tracking_searches || []));
  },
  STORE_TRACKING: 'tracking_searches',
};
vm.createContext(storageContext);
vm.runInContext(readPart('34-tracking-storage.js'), storageContext, {
  filename: '34-tracking-storage.js',
});
const created = await storageContext.upsertTrackingFromContext(
  {
    query_signature: 'ehentai|search||||sample||',
    site: 'ehentai',
    group_type: 'search',
    label: 'sample',
    f_search: 'sample',
    open_url: 'https://e-hentai.org/?f_search=sample',
    current_url: 'https://e-hentai.org/?f_search=sample&next=900',
    page_head_gid: '900',
    page_head_token: 'aaaaaaaaaa',
    page_head_title: 'Current page head',
    page_head_posted_at: 1_700_000_000_000,
    page_index: 2,
    page_known: true,
    page_mode: 'cursor',
  },
  { forceNew: true }
);
assert.equal(created.breakpoint_gid, '900', 'a new tracked search should start at the visible work');
assert.equal(created.breakpoint_page, 2);
assert.equal(created.breakpoint_url, 'https://e-hentai.org/?f_search=sample&next=900');
assert.equal(created.breakpoint_title, 'Current page head');
assert.equal(savedRows.at(-1)?.breakpoint_gid, '900');

const trackingUiSource = readPart('71-workbench-tracking.js');
const trackingUiContext = { console, Date };
vm.createContext(trackingUiContext);
vm.runInContext(trackingUiSource, trackingUiContext, { filename: '71-workbench-tracking.js' });
assert.equal(
  typeof trackingUiContext.getTrackingReleaseAge,
  'function',
  'tracking UI should expose release-age state'
);
const staleAge = trackingUiContext.getTrackingReleaseAge(
  { top_posted_at: Date.UTC(2025, 0, 1) },
  Date.UTC(2025, 6, 1)
);
assert.equal(staleAge.stale, true);
assert.match(staleAge.text, /个月前/);
assert.match(trackingUiSource, /releaseAge\.stale/);
assert.match(trackingUiSource, /async function openTrackingFolderDialog/);
assert.doesNotMatch(
  trackingUiSource.slice(
    trackingUiSource.indexOf("} else if (act === 'folder')"),
    trackingUiSource.indexOf("} else if (act === 'del')")
  ),
  /prompt\(/,
  'category editing should use the in-app dialog instead of prompt()'
);

const listUiSource = readPart('62-list-item-ui.js');
assert.match(listUiSource, /exc-last-seen-mark/, 'the saved breakpoint should have a visible marker');
assert.match(
  listUiSource,
  /getEditionAvailabilityLabel/,
  'list cards should expose stored source availability'
);

const hoverSource = readPart('61-hover-preview.js');
assert.match(
  hoverSource,
  /function invalidateHoverPreview/, 
  'leaving a card should invalidate late preview responses'
);

const detailUiSource = readPart('60-ui-page.js');
assert.match(
  detailUiSource,
  /function editionAvailabilityBadgeHtml/,
  'detail and workbench views should share one source-status badge renderer'
);
assert.doesNotMatch(
  detailUiSource.slice(
    detailUiSource.indexOf('function editionCompareCardHtml'),
    detailUiSource.indexOf('function badgeHtml')
  ),
  /class="exc-compare-pair"/,
  'edition rows should not repeat the same current/peer summary block'
);
const worksUiSource = readPart('72-workbench-works.js');
assert.match(worksUiSource, /async function renderCurrentGalleryWork/);
assert.match(worksUiSource, /id: 'availability'/);
assert.match(worksUiSource, /async function runWorkbenchAvailabilityCheck/);

console.log('ExH tracking and UI behavior tests passed');
