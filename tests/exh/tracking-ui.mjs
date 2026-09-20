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

const pageContext = {
  console,
  URL,
  location: {
    origin: 'https://e-hentai.org',
    href: 'https://e-hentai.org/?next=900',
    hostname: 'e-hentai.org',
  },
  document: {
    querySelector(selector) {
      const sel = String(selector || '');
      if (sel.includes('input[name="f_search"]') || sel === '#f_search') {
        return { value: 'sample artist' };
      }
      return null;
    },
    querySelectorAll() {
      return [];
    },
  },
  compactText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  },
};
vm.createContext(pageContext);
vm.runInContext(readPart('52-tracking-navigation.js'), pageContext, {
  filename: '52-tracking-navigation.js',
});
vm.runInContext(readPart('50-page.js'), pageContext, { filename: '50-page.js' });

assert.equal(
  pageContext.inheritTrackingListIdentity(
    'https://e-hentai.org/?next=900',
    'https://e-hentai.org/?f_search=sample+artist'
  ).includes('f_search='),
  true,
  'cursor next= must keep the original search'
);
assert.equal(
  pageContext.trackingOpenUrlLosesIdentity(
    'https://exhentai.org/favorites.php?favcat=3',
    'https://exhentai.org/'
  ),
  true,
  'a stripped homepage must not replace a favorites identity'
);
const searchCursor = pageContext.parseExhPageContext('https://e-hentai.org/?next=900');
assert.equal(searchCursor.kind, 'list');
assert.equal(searchCursor.f_search, 'sample artist');
assert.equal(searchCursor.group_type, 'search');
assert.match(searchCursor.query_signature, /sample artist/);
assert.match(
  searchCursor.open_url,
  /f_search=sample/,
  'a search cursor page must keep the recovered search as its home URL'
);

pageContext.location = {
  origin: 'https://exhentai.org',
  href: 'https://exhentai.org/favorites.php?next=900',
  hostname: 'exhentai.org',
};
pageContext.document = {
  querySelector(selector) {
    const sel = String(selector || '');
    if (sel === '#favcat' || sel.includes('select[name="favcat"]')) return { value: '3' };
    if (sel.includes('option[value="3"]')) return { textContent: 'Misc' };
    return null;
  },
  querySelectorAll() {
    return [];
  },
};
const favCursor = pageContext.parseExhPageContext(
  'https://exhentai.org/favorites.php?next=900'
);
assert.equal(favCursor.kind, 'favorites');
assert.equal(favCursor.favcat, '3');
assert.equal(favCursor.f_search, 'favorites:3');
assert.match(favCursor.query_signature, /\|3\|/);
assert.match(favCursor.open_url, /favorites\.php/);
assert.match(favCursor.open_url, /favcat=3/);
assert.equal(
  pageContext
    .inheritTrackingListIdentity(
      'https://exhentai.org/?next=900',
      'https://exhentai.org/favorites.php?favcat=3'
    )
    .includes('/favorites.php'),
  true,
  'favorites next= must stay on favorites.php'
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
assert.equal(created.breakpoint_newer_gid, '');
assert.equal(created.breakpoint_older_gid, '');
assert.equal(created.breakpoint_page, 2);
assert.equal(created.breakpoint_url, 'https://e-hentai.org/?f_search=sample&next=900');
assert.equal(created.breakpoint_title, 'Current page head');
assert.equal(savedRows.at(-1)?.breakpoint_gid, '900');

const trackingUiSource = readPart('71-workbench-tracking.js');
const trackingUiContext = {
  console,
  Date,
  compactText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  },
  getTrackingUpdatePillText() {
    return '';
  },
  getTrackingUnreadEstimate(record) {
    return Math.max(0, Math.floor(Number(record && record.unread_estimate) || 0));
  },
  getTrackingBpMetaLabel() {
    return '';
  },
  getTrackingTopMetaLabel() {
    return '';
  },
};
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
  /function applyTrackingBreakpointDecorations/,
  'the list should own one breakpoint divider/frame renderer'
);
assert.match(listUiSource, /exc-tracking-divider/, 'the breakpoint should sit outside the card like JAV');
assert.match(
  readPart('11-base-styles.js'),
  /tr\.exc-gl-item\.is-exc-breakpoint > td/,
  'compact/extended table rows must paint the frame on cells, not only the tr'
);
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
assert.match(
  hoverSource,
  /function getListHoverPreviewAnchor/,
  'hover preview must bind to the cover, not the whole card'
);
assert.match(hoverSource, /只认封面/);
assert.match(hoverSource, /anchor\.addEventListener\('mouseenter'/);
assert.doesNotMatch(
  hoverSource.slice(hoverSource.indexOf('function bindListHoverPreview')),
  /el\.addEventListener\('mouseenter'/,
  'the list card itself must not open the preview'
);
assert.match(
  trackingUiSource,
  /断点已下架/,
  'a missing breakpoint after a successful list check is not a check failure'
);
assert.doesNotMatch(
  readPart('54-tracking-refresh.js'),
  /断点未在前/,
  'unread scan missing the gallery must not write last_check_error'
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

const workbenchSource = readPart('70-workbench.js');
assert.match(
  workbenchSource,
  /const wantTab = mode !== 'same';/,
  'opening a tracked search from the workbench should default to a new tab'
);
assert.match(
  workbenchSource,
  /if \(isWorkbenchDomOpen\(\)\) wbSession.open = true;/,
  'new-tab open must pin the origin panel open before writing session'
);
assert.match(
  workbenchSource,
  /if \(wantTab\) \{[\s\S]*saveSession\(wbSession\);[\s\S]*\} else \{[\s\S]*wbSession.open = false;[\s\S]*toggleWorkbench\(false\);/,
  'only same-page open may collapse the current page panel'
);
assert.doesNotMatch(
  workbenchSource,
  /if \(!wantTab\) wbSession.open = false;/,
  'new-tab open must not write the origin panel closed'
);
assert.match(workbenchSource, /if \(!openUrlInNewTab\(url\)\)/);
const navigationSource = readPart('52-tracking-navigation.js');
assert.match(navigationSource, /async function continueTrackingBreakpointSearch/);
assert.match(navigationSource, /while \(url\) \{/);
assert.doesNotMatch(
  navigationSource,
  /pages < maxPages/,
  'continue-breakpoint must not stop at the unread-scan page cap'
);
assert.doesNotMatch(
  navigationSource,
  /前几页没找到断点/,
  'continue-breakpoint must not ask the user to click again after a short scan'
);
assert.match(navigationSource, /已经翻到前后边界，仍未找到断点/);
assert.match(navigationSource, /function captureBreakpointNeighbors/);
assert.match(navigationSource, /function locateTrackingBreakpointOnPage/);
assert.match(navigationSource, /if \(onThisList\) \{/);
assert.match(readPart('63-tracking-bar.js'), /await continueTrackingBreakpointSearch\(rec\)/);
assert.doesNotMatch(readPart('65-list-runtime.js'), /tryConsumeBreakpointScroll/);
assert.doesNotMatch(
  readPart('73-workbench-settings.js'),
  /exc-cfg-deep-scan/,
  'unread checks should always walk pages instead of hiding behind a setting'
);

const sessionStore = [];
const pageUi = new Map();
const sessionContext = vm.createContext({
  console,
  Date,
  Math,
  JSON,
  Object,
  Array,
  String,
  Number,
  window: { name: 'exc-wb:page-a' },
  sessionStorage: {
    getItem(key) {
      return pageUi.has(key) ? pageUi.get(key) : null;
    },
    setItem(key, value) {
      pageUi.set(key, String(value));
    },
  },
  GM_getValue() {
    return JSON.stringify({ open: true, session_version: 2, width: 420 });
  },
  GM_setValue(_key, value) {
    sessionStore.push(JSON.parse(value));
  },
});
vm.runInContext(readPart('10-core.js'), sessionContext, { filename: '10-core.js' });
const loaded = sessionContext.loadSession();
assert.equal(loaded.open, false, 'a new tab must not inherit another tab\'s open panel');
sessionContext.saveSession(Object.assign({}, loaded, { open: true, lastOpenedId: 'trk-1' }));
assert.equal(JSON.parse(pageUi.get('exc_wb_page_ui_v1')).open, true);
assert.equal(sessionStore.at(-1).open, false, 'shared session must stay closed');
assert.equal(sessionStore.at(-1).lastOpenedId, 'trk-1');
assert.equal(sessionContext.loadSession().open, true, 'the same tab should restore its own panel');

const originWindow = { name: '' };
const originPageUi = new Map([
  [
    'exc_wb_page_ui_v1',
    JSON.stringify({ pageId: 'origin-tab', open: true }),
  ],
]);
const originContext = vm.createContext({
  console,
  Date,
  Math,
  JSON,
  Object,
  Array,
  String,
  Number,
  window: originWindow,
  sessionStorage: {
    getItem(key) {
      return originPageUi.has(key) ? originPageUi.get(key) : null;
    },
    setItem(key, value) {
      originPageUi.set(key, String(value));
    },
  },
  GM_getValue() {
    return JSON.stringify({ open: false, session_version: 2, lastOpenedId: 'trk-1' });
  },
  GM_setValue() {},
});
vm.runInContext(readPart('10-core.js'), originContext, { filename: '10-core.js' });
assert.equal(
  originContext.loadSession().open,
  true,
  'clearing window.name must not collapse a tab that still has its own open panel record'
);
assert.equal(originWindow.name, 'exc-wb:origin-tab');

const copiedNameWindow = { name: 'exc-wb:origin-tab' };
const newTabPageUi = new Map();
const newTabContext = vm.createContext({
  console,
  Date,
  Math,
  JSON,
  Object,
  Array,
  String,
  Number,
  window: copiedNameWindow,
  sessionStorage: {
    getItem(key) {
      return newTabPageUi.has(key) ? newTabPageUi.get(key) : null;
    },
    setItem(key, value) {
      newTabPageUi.set(key, String(value));
    },
  },
  GM_getValue() {
    return JSON.stringify({ open: true, session_version: 2 });
  },
  GM_setValue() {},
});
vm.runInContext(readPart('10-core.js'), newTabContext, { filename: '10-core.js' });
assert.equal(
  newTabContext.loadSession().open,
  false,
  'a new tab must not inherit the origin panel just because window.name was copied'
);

const livePanel = {
  classList: {
    contains(name) {
      return name === 'is-open';
    },
  },
};
const livePageUi = new Map([
  ['exc_wb_page_ui_v1', JSON.stringify({ pageId: 'origin-tab', open: true })],
]);
const liveShared = [];
const liveContext = vm.createContext({
  console,
  Date,
  Math,
  JSON,
  Object,
  Array,
  String,
  Number,
  window: { name: 'exc-wb:origin-tab' },
  document: {
    getElementById(id) {
      return id === 'jlc-wb' ? livePanel : null;
    },
  },
  sessionStorage: {
    getItem(key) {
      return livePageUi.has(key) ? livePageUi.get(key) : null;
    },
    setItem(key, value) {
      livePageUi.set(key, String(value));
    },
  },
  GM_getValue() {
    return JSON.stringify({ open: false, session_version: 2 });
  },
  GM_setValue(_key, value) {
    liveShared.push(JSON.parse(value));
  },
});
vm.runInContext(readPart('10-core.js'), liveContext, { filename: '10-core.js' });
liveContext.saveSession({
  open: false,
  session_version: 2,
  lastOpenedId: 'trk-1',
});
assert.equal(
  JSON.parse(livePageUi.get('exc_wb_page_ui_v1')).open,
  true,
  'writing lastOpenedId must not close a panel that is still on screen'
);
assert.equal(liveShared.at(-1).open, false);
assert.equal(liveShared.at(-1).lastOpenedId, 'trk-1');

const fetchedUrls = [];
const scanContext = {
  console,
  URL,
  setTimeout,
  location: {
    origin: 'https://e-hentai.org',
    href: 'https://e-hentai.org/?f_search=sample',
  },
  compactText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  },
  config: { tracking_unread_scan_max_pages: 12 },
  extractOrderedGidsFromListHtml(html) {
    const out = [];
    const seen = new Set();
    const re = /\/g\/(\d+)\//gi;
    let match;
    while ((match = re.exec(String(html || '')))) {
      const gid = String(match[1]);
      if (seen.has(gid)) continue;
      seen.add(gid);
      out.push(gid);
    }
    return out;
  },
  extractTopGalleryFromListHtml(html) {
    const match = String(html || '').match(/\/g\/(\d+)\//);
    return match ? { gid: match[1] } : null;
  },
};
vm.createContext(scanContext);
vm.runInContext(readPart('50-page.js'), scanContext, { filename: '50-page.js' });
vm.runInContext(readPart('52-tracking-navigation.js'), scanContext, {
  filename: '52-tracking-navigation.js',
});
vm.runInContext(readPart('54-tracking-refresh.js'), scanContext, {
  filename: '54-tracking-refresh.js',
});
scanContext.fetchTrackingPageHtml = async (url) => {
  fetchedUrls.push(url);
  if (/next=25/.test(url) && /f_search=sample/.test(url)) {
    return '<a href="/g/99/ffffffffffffffff/">breakpoint</a>';
  }
  throw new Error('scan requested an identity-less page: ' + url);
};
const scan = await scanContext.scanTrackingUnreadAcrossPages(
  'https://e-hentai.org/?f_search=sample',
  '99',
  {
    maxPages: 4,
    delayMs: 0,
    seedHtml:
      '<a href="/g/1/aaaaaaaaaa/">one</a><a href="/g/25/bbbbbbbbbb/">two</a><a href="?next=25">&gt;</a>',
    seedUrl: 'https://e-hentai.org/?f_search=sample',
  }
);
assert.equal(scan.found, true);
assert.equal(scan.count, 2);
assert.equal(scan.pagesScanned, 2);
assert.equal(fetchedUrls.length, 1, 'the second page must actually be requested');
assert.match(fetchedUrls[0], /next=25/);
assert.match(fetchedUrls[0], /f_search=sample/);

const liveItems = [
  {
    dataset: { excGid: '1' },
    classList: { add() {}, remove() {} },
    scrollIntoView() {},
    querySelector() {
      return { getAttribute: () => '/g/1/aaaaaaaaaa/', href: 'https://e-hentai.org/g/1/aaaaaaaaaa/' };
    },
  },
];
const inserted = [];
const continueToasts = [];
const continueFetched = [];
const liveRoot = {
  firstElementChild: { querySelector: () => ({}) },
  insertBefore(frag) {
    (frag.nodes || []).forEach((node) => liveItems.unshift(node));
    return frag;
  },
  appendChild(frag) {
    (frag.nodes || []).forEach((node) => {
      inserted.push(node);
      liveItems.push(node);
    });
    return frag;
  },
};
const continueBtn = {
  hidden: false,
  disabled: false,
  textContent: '',
  classList: { add() {}, remove() {} },
};
const continueContext = vm.createContext({
  console,
  URL,
  setTimeout,
  DOMParser: class {
    parseFromString() {
      return { querySelectorAll() { return []; } };
    }
  },
  location: {
    origin: 'https://e-hentai.org',
    href: 'https://e-hentai.org/?f_search=sample',
  },
  document: {
    body: {},
    querySelector(selector) {
      if (String(selector).includes('itg') || selector === '#ido') return liveRoot;
      return null;
    },
    querySelectorAll() {
      return [];
    },
    importNode(node) {
      return node;
    },
    createDocumentFragment() {
      const frag = { nodes: [], appendChild(node) { this.nodes.push(node); return node; } };
      return frag;
    },
    getElementById(id) {
      return id === 'exc-goto-bp' ? continueBtn : null;
    },
  },
  compactText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  },
  config: { tracking_unread_scan_max_pages: 8 },
  queryListItems(root) {
    if (root && root !== continueContext.document) {
      return [
        {
          dataset: {},
          classList: { add() {}, remove() {} },
          scrollIntoView() {},
          querySelector() {
            return {
              getAttribute: () => '/g/99/ffffffffffffffff/',
              href: 'https://e-hentai.org/g/99/ffffffffffffffff/',
            };
          },
        },
      ];
    }
    return liveItems;
  },
  parseListCard(el) {
    const href =
      (el.querySelector && el.querySelector('a[href*="/g/"]')?.getAttribute('href')) || '';
    const match = String(href).match(/\/g\/(\d+)\//);
    if (match) return { gid: match[1] };
    return el.dataset && el.dataset.excGid ? { gid: el.dataset.excGid } : null;
  },
  extractOrderedGidsFromDocument() {
    return liveItems.map((item) => item.dataset.excGid).filter(Boolean);
  },
  extractListNextPageUrl(source) {
    if (source === continueContext.document) {
      return 'https://e-hentai.org/?f_search=sample&next=1';
    }
    return '';
  },
  extractListPrevPageUrl() {
    return '';
  },
  inheritTrackingListIdentity(url) {
    return url;
  },
  canonicalizeTrackingOpenUrl(url) {
    return String(url || '').split('&next=')[0];
  },
  buildListUrlWithNextGid() {
    return '';
  },
  getListPageState() {
    return { known: true, index: 0, isFirst: true, mode: 'home' };
  },
  parseExhPageContext() {
    return { trackable: true, query_signature: 'ehentai|search||||sample||' };
  },
  async fetchTrackingPageHtml(url) {
    continueFetched.push(url);
    return '<a href="/g/99/ffffffffffffffff/">breakpoint</a>';
  },
  async enhanceListPage() {},
  async sleepMs() {},
  pickTrackingPageScanDelayMs() {
    return 0;
  },
  showToast(message) {
    continueToasts.push(String(message));
  },
});
vm.runInContext(readPart('50-page.js'), continueContext, { filename: '50-page.js' });
vm.runInContext(readPart('52-tracking-navigation.js'), continueContext, {
  filename: '52-tracking-navigation.js',
});
const continued = await continueContext.continueTrackingBreakpointSearch({
  id: 'trk-bp',
  query_signature: 'ehentai|search||||sample||',
  breakpoint_gid: '99',
  breakpoint_page: 1,
  open_url: 'https://e-hentai.org/?f_search=sample',
});
assert.equal(continued, true);
assert.equal(continueFetched.length, 1, 'continue-breakpoint must fetch the next page in place');
assert.match(continueFetched[0], /next=1/);
assert.equal(inserted.length, 1);
assert.match(continueToasts.join(' '), /已定位到断点作品/);

const longLiveItems = [
  {
    dataset: { excGid: '1' },
    classList: { add() {}, remove() {} },
    scrollIntoView() {},
    querySelector() {
      return { getAttribute: () => '/g/1/aaaaaaaaaa/', href: 'https://e-hentai.org/g/1/aaaaaaaaaa/' };
    },
  },
];
const longInserted = [];
const longToasts = [];
const longFetched = [];
const longLiveRoot = {
  firstElementChild: { querySelector: () => ({}) },
  insertBefore(frag) {
    (frag.nodes || []).forEach((node) => longLiveItems.unshift(node));
    return frag;
  },
  appendChild(frag) {
    (frag.nodes || []).forEach((node) => {
      longInserted.push(node);
      longLiveItems.push(node);
    });
    return frag;
  },
};
const longBtn = {
  hidden: false,
  disabled: false,
  textContent: '',
  classList: { add() {}, remove() {} },
};
function makeLongCard(gid) {
  return {
    dataset: { excGid: String(gid) },
    classList: { add() {}, remove() {} },
    scrollIntoView() {},
    querySelector() {
      return {
        getAttribute: () => '/g/' + gid + '/ffffffffffffffff/',
        href: 'https://e-hentai.org/g/' + gid + '/ffffffffffffffff/',
      };
    },
  };
}
const longContext = vm.createContext({
  console,
  URL,
  setTimeout,
  DOMParser: class {
    parseFromString() {
      return { querySelectorAll() { return []; } };
    }
  },
  location: {
    origin: 'https://e-hentai.org',
    href: 'https://e-hentai.org/?f_search=sample',
  },
  document: {
    body: {},
    querySelector(selector) {
      if (String(selector).includes('itg') || selector === '#ido') return longLiveRoot;
      return null;
    },
    querySelectorAll() {
      return [];
    },
    importNode(node) {
      return node;
    },
    createDocumentFragment() {
      const frag = { nodes: [], appendChild(node) { this.nodes.push(node); return node; } };
      return frag;
    },
    getElementById(id) {
      return id === 'exc-goto-bp' ? longBtn : null;
    },
  },
  compactText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  },
  config: { tracking_unread_scan_max_pages: 4 },
  queryListItems(root) {
    if (root && root !== longContext.document) {
      const href = String(root.href || '');
      const match = href.match(/next=(\d+)/);
      const gid = match ? match[1] : '0';
      return [makeLongCard(gid)];
    }
    return longLiveItems;
  },
  parseListCard(el) {
    const href =
      (el.querySelector && el.querySelector('a[href*="/g/"]')?.getAttribute('href')) || '';
    const match = String(href).match(/\/g\/(\d+)\//);
    if (match) return { gid: match[1] };
    return el.dataset && el.dataset.excGid ? { gid: el.dataset.excGid } : null;
  },
  extractOrderedGidsFromDocument() {
    return longLiveItems.map((item) => item.dataset.excGid).filter(Boolean);
  },
  extractListNextPageUrl() {
    return '';
  },
  extractListPrevPageUrl() {
    return '';
  },
  inheritTrackingListIdentity(url) {
    return url;
  },
  canonicalizeTrackingOpenUrl(url) {
    return String(url || '').split('&next=')[0];
  },
  buildListUrlWithNextGid() {
    return '';
  },
  getListPageState() {
    return { known: true, index: 0, isFirst: true, mode: 'home' };
  },
  parseExhPageContext() {
    return { trackable: true, query_signature: 'ehentai|search||||sample||' };
  },
  async fetchTrackingPageHtml(url) {
    longFetched.push(url);
    return '<html data-url="' + url + '"></html>';
  },
  async enhanceListPage() {},
  async sleepMs() {},
  pickTrackingPageScanDelayMs() {
    return 0;
  },
  showToast(message) {
    longToasts.push(String(message));
  },
});
longContext.queryListItems = (root) => {
  if (root && root !== longContext.document) {
    const href = String(longFetched[longFetched.length - 1] || '');
    const match = href.match(/next=(\d+)/);
    return [makeLongCard(match ? match[1] : '0')];
  }
  return longLiveItems;
};
longContext.extractListNextPageUrl = (source, baseUrl) => {
  if (source === longContext.document) {
    return 'https://e-hentai.org/?f_search=sample&next=1';
  }
  const href = String(baseUrl || longFetched[longFetched.length - 1] || '');
  const match = href.match(/next=(\d+)/);
  const current = match ? Number(match[1]) : 0;
  if (current > 0 && current < 12) {
    return 'https://e-hentai.org/?f_search=sample&next=' + (current + 1);
  }
  return '';
};
vm.runInContext(readPart('50-page.js'), longContext, { filename: '50-page.js' });
vm.runInContext(readPart('52-tracking-navigation.js'), longContext, {
  filename: '52-tracking-navigation.js',
});
const longWalk = await longContext.continueTrackingBreakpointSearch({
  id: 'trk-bp-long',
  query_signature: 'ehentai|search||||sample||',
  breakpoint_gid: '12',
  breakpoint_page: 12,
  open_url: 'https://e-hentai.org/?f_search=sample',
});
assert.equal(longWalk, true);
assert.equal(
  longFetched.length,
  12,
  'continue-breakpoint must keep walking past the unread-scan page cap'
);
assert.equal(longToasts.some((msg) => msg.includes('前几页没找到')), false);
assert.match(longToasts.join(' '), /已定位到断点作品/);

const neighborItems = [
  {
    dataset: { excGid: '10' },
    classList: { tokens: new Set(), add(name) { this.tokens.add(name); }, remove(name) { this.tokens.delete(name); }, contains(name) { return this.tokens.has(name); } },
    scrollIntoView() {},
    querySelector() { return null; },
  },
  {
    dataset: { excGid: '12' },
    classList: { tokens: new Set(), add(name) { this.tokens.add(name); }, remove(name) { this.tokens.delete(name); }, contains(name) { return this.tokens.has(name); } },
    scrollIntoView() {},
    querySelector() { return null; },
  },
];
const neighborToasts = [];
const neighborContext = vm.createContext({
  console,
  URL,
  setTimeout,
  location: {
    origin: 'https://e-hentai.org',
    href: 'https://e-hentai.org/?f_search=sample',
  },
  document: {
    querySelectorAll(selector) {
      if (String(selector).includes('is-exc-breakpoint') || String(selector).includes('exc-tracking-divider')) {
        return [];
      }
      return [];
    },
    querySelector() {
      return neighborItems[1];
    },
  },
  compactText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  },
  queryListItems() {
    return neighborItems;
  },
  parseListCard(el) {
    return el.dataset && el.dataset.excGid ? { gid: el.dataset.excGid } : null;
  },
  showToast(message) {
    neighborToasts.push(String(message));
  },
});
vm.runInContext(readPart('52-tracking-navigation.js'), neighborContext, {
  filename: '52-tracking-navigation.js',
});
const neighbors = neighborContext.captureBreakpointNeighbors('11', ['10', '11', '12']);
assert.equal(neighbors.newer, '10');
assert.equal(neighbors.older, '12');
const neighborHit = neighborContext.locateTrackingBreakpointOnPage({
  breakpoint_gid: '11',
  breakpoint_newer_gid: '10',
  breakpoint_older_gid: '12',
});
assert.equal(neighborHit.found, true);
assert.equal(neighborHit.kind, 'older');
assert.equal(neighborHit.el.dataset.excGid, '12');
const neighborLocated = neighborContext.scrollToTrackingBreakpoint({
  breakpoint_gid: '11',
  breakpoint_newer_gid: '10',
  breakpoint_older_gid: '12',
});
assert.equal(neighborLocated, true);
assert.match(neighborToasts.join(' '), /已下架/);

const unreadScanContext = {
  console,
  URL,
  setTimeout,
  location: {
    origin: 'https://e-hentai.org',
    href: 'https://e-hentai.org/?f_search=sample',
  },
  compactText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  },
  config: { tracking_unread_scan_max_pages: 12 },
  extractOrderedGidsFromListHtml(html) {
    const out = [];
    const seen = new Set();
    const re = /\/g\/(\d+)\//gi;
    let match;
    while ((match = re.exec(String(html || '')))) {
      const gid = String(match[1]);
      if (seen.has(gid)) continue;
      seen.add(gid);
      out.push(gid);
    }
    return out;
  },
  extractTopGalleryFromListHtml(html) {
    const match = String(html || '').match(/\/g\/(\d+)\//);
    return match ? { gid: match[1] } : null;
  },
};
vm.createContext(unreadScanContext);
vm.runInContext(readPart('50-page.js'), unreadScanContext, { filename: '50-page.js' });
vm.runInContext(readPart('52-tracking-navigation.js'), unreadScanContext, {
  filename: '52-tracking-navigation.js',
});
vm.runInContext(readPart('54-tracking-refresh.js'), unreadScanContext, {
  filename: '54-tracking-refresh.js',
});
const missingExact = unreadScanContext.estimateUnreadFromGids(['1', '2', '4'], '3', {
  newerGid: '2',
  olderGid: '4',
});
assert.equal(missingExact.found, true);
assert.equal(missingExact.kind, 'older');
assert.equal(missingExact.count, 2);

const hoverCard = {
  querySelector(selector) {
    if (selector === '.exc-cover-host' || selector === '.glthumb' || selector === 'td.gl1e') {
      return hoverCover;
    }
    if (selector === 'img') return hoverImg;
    return null;
  },
};
const hoverCover = {
  dataset: {},
  addEventListener() {},
};
const hoverImg = { closest() { return hoverCover; } };
const hoverBindContext = vm.createContext({
  console,
  document: {
    getElementById() { return null; },
    createElement() { return { innerHTML: '', addEventListener() {}, style: {}, classList: { add() {}, remove() {} }, querySelector() { return null; } }; },
    body: { appendChild() {} },
  },
  window: { addEventListener() {}, innerWidth: 1200, innerHeight: 800 },
  config: { list_hover_preview: true, list_hover_preview_count: 4, list_hover_preview_delay_ms: 1000 },
  compactText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  },
  clampHoverPreviewCount(n) { return n; },
  clampHoverPreviewDelay(n) { return n; },
  buildGalleryUrl() { return ''; },
  parseGalleryThumbsFromHtml() { return []; },
  gmRequest() { return Promise.resolve({ status: 200, responseText: '' }); },
  nowMs() { return 1; },
  escapeHtml(value) { return String(value); },
});
vm.runInContext(readPart('61-hover-preview.js'), hoverBindContext, { filename: '61-hover-preview.js' });
assert.equal(
  hoverBindContext.getListHoverPreviewAnchor(hoverCard),
  hoverCover,
  'preview must use the cover cell, not the surrounding card'
);
hoverBindContext.bindListHoverPreview(hoverCard, { gid: '1', token: 'aaaaaaaaaa' });
assert.equal(hoverCover.dataset.excHoverBound, '1');
assert.equal(hoverCard.dataset, undefined);

const missingStatus = trackingUiContext.buildExhTrackingStatus({
  breakpoint_gid: '3',
  top_gid: '1',
  breakpoint_missing: 1,
  last_check_error: '',
  unread_estimate: 12,
  unread_estimate_capped: 1,
});
assert.equal(missingStatus.text, '断点已下架');
assert.notEqual(missingStatus.text, '检查失败');

const sortInput = [
  { id: 'caught', top_gid: '1', breakpoint_gid: '1', has_update: 0, updated_at: 400 },
  { id: 'fresh', top_gid: '9', breakpoint_gid: '1', has_update: 0, updated_at: 100 },
  { id: 'gray', top_gid: '', breakpoint_gid: '', has_update: 0, updated_at: 300 },
  { id: 'miss', top_gid: '9', breakpoint_gid: '3', breakpoint_missing: 1, has_update: 0, updated_at: 200 },
];
const sortedIds = trackingUiContext.sortTrackingRecordsForWorkbench(sortInput).map((row) => row.id);
assert.deepEqual(sortedIds, ['fresh', 'miss', 'gray', 'caught']);
assert.deepEqual(sortInput.map((row) => row.id), ['caught', 'fresh', 'gray', 'miss']);

assert.match(readPart('71-workbench-tracking.js'), /list = sortTrackingRecordsForWorkbench\(list\)/);
assert.match(readPart('30-storage.js'), /function notifyTrackingStoreChanged/);
assert.match(
  readPart('74-workbench-runtime.js'),
  /GM_addValueChangeListener\(GM_TRACKING_REV_KEY/
);

const gmListeners = [];
const storeRefreshCalls = [];
const storeLiveContext = vm.createContext({
  console,
  setTimeout(fn) {
    fn();
    return 1;
  },
  clearTimeout() {},
  GM_TRACKING_REV_KEY: 'exh_commander_tracking_rev_v1',
  GM_addValueChangeListener(key, fn) {
    gmListeners.push({ key, fn });
  },
  window: {
    addEventListener() {},
    __excRefreshWorkbench() {
      storeRefreshCalls.push('wb');
    },
  },
  document: {
    addEventListener() {},
    visibilityState: 'visible',
  },
  refreshListVolatileState() {
    storeRefreshCalls.push('list');
    return Promise.resolve();
  },
});
vm.runInContext(readPart('74-workbench-runtime.js'), storeLiveContext, {
  filename: '74-workbench-runtime.js',
});
storeLiveContext.bindTrackingStoreLiveRefresh();
assert.equal(gmListeners[0].key, 'exh_commander_tracking_rev_v1');
gmListeners[0].fn('exh_commander_tracking_rev_v1', 'old', 'new', false);
assert.deepEqual(storeRefreshCalls, []);
gmListeners[0].fn('exh_commander_tracking_rev_v1', 'old', 'new', true);
assert.deepEqual(storeRefreshCalls, ['wb', 'list']);

console.log('ExH tracking and UI behavior tests passed');
