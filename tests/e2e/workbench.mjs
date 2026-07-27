import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import {
  PATHS,
  assertNoRuntimeErrors,
  openScriptPage,
  waitFab,
  waitWorkbenchClosed,
  waitWorkbenchOpen,
} from './helpers.mjs';

let passed = 0;
let failed = 0;
const MAX_JLC_STARTUP_TRANSACTIONS = 4;
const MAX_STARTUP_TRACKING_TRANSACTIONS = 4;
const MAX_INITIAL_META_REQUESTS = 24;
const MAX_META_CACHE_TRANSACTIONS = 8;
const JLC_TRACKING_STRESS_COUNT = 180;
const EXH_STRESS_CARD_COUNT = 32;
const MAX_EXH_STARTUP_TRANSACTIONS = 5;
const MAX_EXH_STABLE_REFRESH_TRANSACTIONS = 1;
const MAX_EXH_INCREMENTAL_TRANSACTIONS = 4;
const EXH_LARGE_LIBRARY_ARCHIVE_COUNT = 4000;
const MAX_EXH_LARGE_LIBRARY_REFRESH_MS = 5000;
const MAX_EXH_LIBRARY_TAB_TRANSACTIONS = 6;
const MAX_EXH_BETTER_TAB_TRANSACTIONS = 8;
const MAX_EXH_DETAIL_STARTUP_TRANSACTIONS = 5;
const MAX_EXH_DETAIL_REFRESH_TRANSACTIONS = 4;
const EXH_TRACKING_RACE_COUNT = 30;
const MAX_EXH_TRACKING_BURST_TRANSACTIONS = 2;
const MAX_EXH_TRACKING_RACE_TRANSACTIONS = 4;
const MAX_EXH_TRACKING_BACKFILL_TRANSACTIONS = 3;
const SCOUT_THEME_FIXTURE = '<!DOCTYPE html><html><head><meta charset="utf-8">'
  + '<title>Scout theme fixture</title></head><body><main>Scout</main></body></html>';
const SCOUT_THEME_CASES = [
  {
    host: 'www.xvideos.com',
    className: 'creamu-site-xvideos',
    accent: 'rgb(229, 72, 64)',
    dark: 'rgb(158, 42, 36)',
    nativeInput: 'rgb(34, 24, 26)',
  },
  {
    host: 'www.xnxx.com',
    className: 'creamu-site-xnxx',
    accent: 'rgb(46, 112, 229)',
    dark: 'rgb(26, 63, 150)',
    nativeInput: 'rgb(24, 30, 42)',
  },
  {
    host: 'www.eporner.com',
    className: 'creamu-site-eporner',
    accent: 'rgb(46, 168, 84)',
    dark: 'rgb(24, 107, 52)',
    nativeInput: 'rgb(22, 30, 24)',
  },
];
const SCOUT_WORKBENCH_FIXTURE_DATA = {
  scout_combo_tokens: ['documentary', 'city walk'],
  creamu_scout_config: {
    webdav_enabled: false,
    webdav_url: 'https://dav.example.test/',
    webdav_user: 'tester@example.test',
    webdav_password: 'app-password',
    webdav_path: '/Creamu',
    webdav_auto: false,
    webdav_conflict: 'ask',
    cream_site_theme: true,
    open_videos_new_tab: true,
    block_site_auto_preview: true,
    combo_join: 'and',
  },
  creamu_scout_lexicon_types: ['Topic', 'Scene', 'Unsorted'],
  creamu_scout_lexicon_terms: [
    {
      id: 'term-documentary',
      text: 'documentary',
      zh: 'Documentary',
      type: 'Topic',
      status: 'confirmed',
      heat: 8,
      use: 3,
      good: 2,
      bad: 0,
      loved: true,
      updated_at: '2026-06-15T08:30:00.000Z',
    },
    {
      id: 'term-city-walk',
      text: 'city walk',
      zh: '',
      type: 'Scene',
      status: 'unreviewed',
      heat: 4,
      use: 1,
      good: 0,
      bad: 0,
      loved: false,
      updated_at: '2026-06-15T08:30:00.000Z',
    },
    {
      id: 'term-night',
      text: 'night',
      zh: 'Night',
      type: 'Scene',
      status: 'unreviewed',
      heat: 2,
      use: 0,
      good: 0,
      bad: 0,
      loved: false,
      updated_at: '2026-06-15T08:30:00.000Z',
    },
  ],
  creamu_scout_publishers: [
    { id: 'publisher-north', name: 'Studio North', site: 'xvideos', status: 'loved', note: 'Regular updates' },
    { id: 'publisher-south', name: 'Channel South', site: 'xnxx', status: 'blocked', note: 'Repeated clips' },
  ],
  creamu_scout_works: [
    {
      id: 'xvideos|alpha001',
      site: 'xvideos',
      videoId: 'alpha001',
      title: 'Documentary City Walk',
      url: 'https://www.xvideos.com/video.alpha001/documentary-city-walk',
      thumb: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
      uploader: 'Studio North',
      tags: ['documentary', 'city walk', 'night'],
      updated_at: '2026-06-15T08:30:00.000Z',
    },
  ],
  creamu_scout_tracks: [
    {
      id: 'track-xvideos',
      site: 'xvideos',
      query: 'documentary city',
      label: 'Documentary City',
      url: 'https://www.xvideos.com/?k=documentary+city',
      last_seen_item: 'alpha001',
      last_seen_page: 3,
      updated_at: '2026-06-15T08:30:00.000Z',
    },
    {
      id: 'track-xnxx',
      site: 'xnxx',
      query: 'Documentary AND City',
      label: 'Documentary City',
      url: 'https://www.xnxx.com/search/documentary+city',
      last_seen_item: '',
      last_seen_page: 2,
      updated_at: '2026-06-15T08:30:00.000Z',
    },
  ],
  creamu_scout_block_list: [
    { id: 'block-spoiler', text: 'spoiler', zh: '', reason: 'Preview text', mode: 'hide', match: 'word', scope: 'both' },
    { id: 'block-clickbait', text: 'clickbait', zh: '', reason: 'Noisy title', mode: 'dim', match: 'sub', scope: 'title' },
  ],
};
const SCOUT_DETAIL_FIXTURE_DATA = {
  ...SCOUT_WORKBENCH_FIXTURE_DATA,
  creamu_scout_lexicon_terms: SCOUT_WORKBENCH_FIXTURE_DATA.creamu_scout_lexicon_terms.slice(0, 2),
  creamu_scout_publishers: [],
  creamu_scout_works: [],
  creamu_scout_tracks: [],
  creamu_scout_block_list: SCOUT_WORKBENCH_FIXTURE_DATA.creamu_scout_block_list.slice(0, 1),
};
const SCOUT_TRACKING_FIXTURE_DATA = {
  ...SCOUT_WORKBENCH_FIXTURE_DATA,
  creamu_scout_tracks: [
    {
      ...SCOUT_WORKBENCH_FIXTURE_DATA.creamu_scout_tracks[0],
      last_seen_page: 1,
    },
  ],
};
const SCOUT_LIST_FLOW_TERM = {
  id: 'sample-term',
  text: 'sample',
  zh: 'Sample',
  type: 'topic',
  status: 'confirmed',
  heat: 1,
  use: 0,
};

function createJlcStressFixture(count) {
  const cards = Array.from({ length: count }, (_, index) => {
    const avid = 'TEST-' + String(index + 1).padStart(3, '0');
    return '<div class="video">'
      + '<a class="video" href="./?v=' + avid.toLowerCase() + '">'
      + '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="cover">'
      + '<div class="id">' + avid + '</div>'
      + '<div class="title">Synthetic title ' + avid + '</div>'
      + '</a>'
      + '</div>';
  }).join('');
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>list fixture</title></head>'
    + '<body><div class="videothumblist"><div class="videos">' + cards + '</div></div></body></html>';
}

function createExhStressFixture(count) {
  const rows = Array.from({ length: count }, (_, index) => {
    const gid = String(710000 + index);
    const token = (index + 1).toString(16).padStart(10, 'a').slice(-10);
    return '<tr data-e2e-exh-card="' + gid + '"><td class="glname">'
      + '<a href="/g/' + gid + '/' + token + '/">'
      + '<div class="glink">[Group ' + index + '] Stress Gallery ' + index + '</div>'
      + '</a></td></tr>';
  }).join('');
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>gallery list fixture</title></head>'
    + '<body><table class="itg"><tbody>' + rows + '</tbody></table></body></html>';
}

function createExhDetailFixture() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Detail Gallery - E-Hentai</title></head>'
    + '<body>'
    + '<div id="gleft"><div id="gd1"><img alt="cover" '
    + 'src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="></div></div>'
    + '<div id="gmid"><h1 id="gn">[Detail Group] Detail Gallery</h1><h1 id="gj">Detail Gallery</h1>'
    + '<div id="gdc"><div class="cs">Doujinshi</div></div>'
    + '<div id="gdn"><a href="/uploader/detail-uploader">detail-uploader</a></div>'
    + '<table id="gdd"><tbody>'
    + '<tr><td>Posted:</td><td>2026-07-20 12:00</td></tr>'
    + '<tr><td>File Size:</td><td>128 MiB</td></tr>'
    + '<tr><td>Length:</td><td>100 pages</td></tr>'
    + '</tbody></table>'
    + '<table id="taglist"><tbody>'
    + '<tr><td class="tc">language:</td><td><a href="/tag/language%3Achinese">chinese</a></td></tr>'
    + '<tr><td class="tc">group:</td><td><a href="/tag/group%3Adetail+group">detail group</a></td></tr>'
    + '</tbody></table></div>'
    + '<div id="gright"></div>'
    + '</body></html>';
}

function installExhStorageMetrics() {
  window.__exhListMetrics = {
    transactions: { total: 0, byStore: {} },
    enhancedWrites: 0,
    lastTransactionAt: performance.now(),
  };
  const original = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function countedTransaction(storeNames, ...args) {
    const metrics = window.__exhListMetrics;
    const stores = typeof storeNames === 'string' ? [storeNames] : Array.from(storeNames || []);
    metrics.transactions.total += 1;
    metrics.lastTransactionAt = performance.now();
    stores.forEach((store) => {
      metrics.transactions.byStore[store] = (metrics.transactions.byStore[store] || 0) + 1;
    });
    return original.call(this, storeNames, ...args);
  };

  const observer = new MutationObserver((mutations) => {
    window.__exhListMetrics.enhancedWrites += mutations.length;
  });
  observer.observe(document.documentElement, {
    attributes: true,
    subtree: true,
    attributeFilter: ['data-exc-enhanced'],
  });
  window.__resetExhListMetrics = () => {
    observer.takeRecords();
    window.__exhListMetrics.transactions = { total: 0, byStore: {} };
    window.__exhListMetrics.enhancedWrites = 0;
    window.__exhListMetrics.lastTransactionAt = performance.now();
  };

  const openExhDb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open('exh_commander_db');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const requestResult = (request) => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const transactionDone = (transaction) => new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  window.__readExhStores = async (names) => {
    const db = await openExhDb();
    const transaction = db.transaction(names, 'readonly');
    const done = transactionDone(transaction);
    const result = {};
    await Promise.all(names.map(async (name) => {
      result[name] = await requestResult(transaction.objectStore(name).getAll());
    }));
    await done;
    db.close();
    return result;
  };
  window.__patchExhEdition = async (id, patch) => {
    const db = await openExhDb();
    const transaction = db.transaction('editions', 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore('editions');
    const row = await requestResult(store.get(id));
    store.put(Object.assign({}, row, patch));
    await done;
    db.close();
  };
  window.__seedExhArchives = async (count, relevantTitle = 'Stress Gallery 0') => {
    const db = await openExhDb();
    const transaction = db.transaction('local_archives', 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore('local_archives');
    store.clear();
    for (let index = 0; index < count; index++) {
      store.put({
        arcid: `noise-${index}`,
        title: `Unrelated Archive Number ${index}`,
        title_core: `unrelated archive number ${index}`,
        tags: [],
        language: 'other',
        censor_tier: 'unknown',
        group: '',
        pages: 0,
        size_bytes: 0,
        updated_at: 1,
      });
    }
    store.put({
      arcid: 'relevant-stress-gallery',
      title: relevantTitle,
      title_core: String(relevantTitle).replace(/^\[[^\]]+\]\s*/, '').toLowerCase(),
      tags: [],
      language: 'other',
      censor_tier: 'unknown',
      group: '',
      pages: 0,
      size_bytes: 0,
      updated_at: 1,
    });
    await done;
    db.close();
  };
  window.__seedExhTracking = async (count) => {
    const db = await openExhDb();
    const transaction = db.transaction('tracking_searches', 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore('tracking_searches');
    store.clear();
    for (let index = 0; index < count; index++) {
      const gid = String(820000 + index);
      const label = `Race Gallery ${index}` + (index === count - 1 ? ' Needle' : '');
      store.put({
        id: `race-tracking-${index}`,
        site: 'ehentai',
        query_signature: `race:${index}`,
        f_search: `race-gallery-${index}`,
        label,
        custom_label: label,
        page_url: `https://e-hentai.org/tag/race-gallery-${index}`,
        open_url: `https://e-hentai.org/tag/race-gallery-${index}`,
        top_gid: gid,
        top_token: (index + 1).toString(16).padStart(10, '0'),
        archived: false,
        created_at: index + 1,
        updated_at: index + 1,
      });
    }
    await done;
    db.close();
  };
  window.__seedExhTrackingEditions = async (count) => {
    const db = await openExhDb();
    const transaction = db.transaction('editions', 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore('editions');
    for (let index = 0; index < count; index++) {
      const gid = String(820000 + index);
      store.put({
        id: `race-edition-${index}`,
        gid: index % 2 === 0 ? gid : Number(gid),
        token: (index + 1).toString(16).padStart(10, '0'),
        posted_at: 1700000000000 + index * 1000,
        updated_at: index + 1,
      });
    }
    await done;
    db.close();
  };
}

function installJlcStorageMetrics() {
  window.__jlcStorageMetrics = {
    transactions: { total: 0, byStore: {} },
    lastTransactionAt: performance.now(),
  };
  const original = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function countedTransaction(storeNames, ...args) {
    const metrics = window.__jlcStorageMetrics;
    const stores = typeof storeNames === 'string' ? [storeNames] : Array.from(storeNames || []);
    metrics.transactions.total += 1;
    metrics.lastTransactionAt = performance.now();
    stores.forEach((store) => {
      metrics.transactions.byStore[store] = (metrics.transactions.byStore[store] || 0) + 1;
    });
    return original.call(this, storeNames, ...args);
  };
  window.__resetJlcStorageMetrics = () => {
    window.__jlcStorageMetrics.transactions = { total: 0, byStore: {} };
    window.__jlcStorageMetrics.lastTransactionAt = performance.now();
  };

  const openJlcDb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open('JavLibCommander_Permanent', 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('videos')) {
        db.createObjectStore('videos', { keyPath: 'avid' });
      }
      if (!db.objectStoreNames.contains('emby_data')) {
        db.createObjectStore('emby_data', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta_cache')) {
        db.createObjectStore('meta_cache', { keyPath: 'avid' });
      }
      if (!db.objectStoreNames.contains('tracking_searches')) {
        db.createObjectStore('tracking_searches', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  window.__readJlcStore = async (name) => {
    const db = await openJlcDb();
    const transaction = db.transaction(name, 'readonly');
    const request = transaction.objectStore(name).getAll();
    const rows = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    db.close();
    return rows;
  };
  window.__seedJlcLibrary = async ({ movies = 0, persons = 0, videos = 0, movieIds = [] } = {}) => {
    const db = await openJlcDb();
    const transaction = db.transaction(['emby_data', 'videos'], 'readwrite');
    const embyStore = transaction.objectStore('emby_data');
    const videoStore = transaction.objectStore('videos');
    for (let index = 0; index < movies; index++) {
      embyStore.put({ id: `vid_SEED-${index}`, type: 'movie' });
    }
    for (const avid of movieIds) {
      embyStore.put({ id: `vid_${String(avid || '').trim().toUpperCase()}`, type: 'movie' });
    }
    for (let index = 0; index < persons; index++) {
      embyStore.put({ id: `person-${index}`, name: `Person ${index}`, type: 'person' });
    }
    for (let index = 0; index < videos; index++) {
      videoStore.put({ avid: `SEEN-${index}`, clicked: true, status: 'none' });
    }
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    db.close();
  };
  window.__seedJlcTracking = async (count) => {
    const db = await openJlcDb();
    const transaction = db.transaction('tracking_searches', 'readwrite');
    const store = transaction.objectStore('tracking_searches');
    store.clear();
    for (let index = 0; index < count; index++) {
      const code = `SEED-${String(index).padStart(3, '0')}`;
      const label = `Tracking ${String(index).padStart(3, '0')}`
        + (index === count - 1 ? ' Needle' : '');
      const checkedAt = new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString();
      store.put({
        id: `seed-tracking-${index}`,
        site: 'javlibrary',
        page_type: 'keyword',
        group_type: 'keyword',
        group_name: `seed ${index}`,
        raw_query: `seed ${index}`,
        query_text: `seed ${index}`,
        query_signature: `seed-signature-${index}`,
        custom_label: label,
        title: label,
        open_url: `https://www.javlibrary.com/cn/vl_searchbyid.php?keyword=seed-${index}`,
        page_url: `https://www.javlibrary.com/cn/vl_searchbyid.php?keyword=seed-${index}`,
        top_avid: code,
        last_seen_avid: index % 3 === 0 ? `SEEN-${String(index).padStart(3, '0')}` : code,
        check_status: index % 3 === 0 ? 'updated' : 'latest',
        last_check_at: checkedAt,
        created_at: checkedAt,
        updated_at: checkedAt,
        archived: false,
      });
    }
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    db.close();
  };
}

async function runCase(name, options, flow) {
  let session;
  try {
    session = await openScriptPage(browser, options);
    await flow(session.page);
    assertNoRuntimeErrors(session.runtimeErrors);
    passed += 1;
    console.log('  OK  ' + name);
  } catch (error) {
    failed += 1;
    process.exitCode = 1;
    console.error('  FAIL  ' + name);
    console.error('       ', error?.message || error);
  } finally {
    await session?.context.close();
  }
}

async function openAndCheckTitle(page, matcher, timeout = 15000) {
  const fab = await waitFab(page, timeout);
  await fab.click();
  await waitWorkbenchOpen(page, timeout);
  const title = await page.locator('#jlc-wb .jlc-wb-title').textContent();
  assert.match(title || '', matcher, 'unexpected workbench title');
}

async function exerciseWorkbenchGeometry(page, markers) {
  const bindingState = await page.evaluate((keys) => {
    const fab = document.getElementById('jlc-wb-fab');
    const panel = document.getElementById('jlc-wb');
    const header = panel?.querySelector('.jlc-wb-header');
    return {
      fab: fab?.dataset?.[keys.fab],
      panel: panel?.dataset?.[keys.panel],
      header: header?.dataset?.[keys.header],
    };
  }, markers);
  assert.deepEqual(bindingState, { fab: '1', panel: '1', header: '1' });

  const panel = page.locator('#jlc-wb');
  const header = page.locator('#jlc-wb .jlc-wb-header');
  const beforeDrag = await panel.boundingBox();
  const headerBox = await header.boundingBox();
  assert.ok(beforeDrag && headerBox, 'workbench drag targets should have layout boxes');
  const dragX = headerBox.x + 24;
  const dragY = headerBox.y + Math.min(24, headerBox.height / 2);
  await page.mouse.move(dragX, dragY);
  await page.mouse.down();
  await page.mouse.move(dragX - 36, dragY + 18, { steps: 4 });
  await page.mouse.up();
  const afterDrag = await panel.boundingBox();
  assert.ok(afterDrag, 'workbench should remain visible after dragging');
  assert.ok(afterDrag.x < beforeDrag.x - 10, 'workbench should move with the shared drag binding');

  const corner = page.locator('#jlc-wb .jlc-wb-resize-corner');
  const beforeResize = await panel.boundingBox();
  const cornerBox = await corner.boundingBox();
  assert.ok(beforeResize && cornerBox, 'workbench resize targets should have layout boxes');
  const resizeX = cornerBox.x + cornerBox.width / 2;
  const resizeY = cornerBox.y + cornerBox.height / 2;
  await page.mouse.move(resizeX, resizeY);
  await page.mouse.down();
  await page.mouse.move(resizeX + 24, resizeY + 18, { steps: 4 });
  await page.mouse.up();
  const afterResize = await panel.boundingBox();
  assert.ok(afterResize, 'workbench should remain visible after resizing');
  assert.ok(
    afterResize.width > beforeResize.width + 8 || afterResize.height > beforeResize.height + 8,
    'workbench should resize with the shared resize binding'
  );
}

async function waitJlcListDecorated(page, expected = 1, timeout = 25000) {
  await page.waitForFunction(
    (count) => {
      const items = Array.from(document.querySelectorAll('#grid-b .item-b'));
      return items.length === count && items.every(item => item.dataset.jlcBaseDone === '1');
    },
    expected,
    { timeout }
  );
  await waitWorkbenchClosed(page, timeout);
}

async function assertScoutWorkbenchStyles(page, expected) {
  const style = await page.evaluate(() => {
    const panel = document.getElementById('jlc-wb');
    if (!panel) throw new Error('Scout workbench is missing');

    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;left:-10000px;top:0;';
    probe.innerHTML = `
      <div class="jlc-wb-nav">
        <button type="button">Idle</button>
        <button type="button" class="active">Active</button>
      </div>
      <button type="button" class="jlc-wb-btn primary">Primary</button>
      <button type="button" class="jlc-wb-btn ghost">Ghost</button>
      <button type="button" class="jlc-wb-btn danger">Danger</button>
      <input type="text" class="jlc-wb-search" value="input">
      <div class="stat-box"><div class="stat-item"><b>1</b><span>Total</span></div></div>
      <span data-dark-token style="background-color:var(--creamu-wb-accent-dark)"></span>
    `;
    panel.appendChild(probe);
    const nativeInput = document.createElement('input');
    nativeInput.type = 'text';
    document.body.appendChild(nativeInput);
    const read = (selector) => getComputedStyle(probe.querySelector(selector));
    try {
      const idleNav = read('.jlc-wb-nav button:not(.active)');
      const activeNav = read('.jlc-wb-nav button.active');
      const primary = read('.jlc-wb-btn.primary');
      const ghost = read('.jlc-wb-btn.ghost');
      const danger = read('.jlc-wb-btn.danger');
      const input = read('.jlc-wb-search');
      const nativeInputStyle = getComputedStyle(nativeInput);
      const stat = read('.stat-box');
      const statValue = read('.stat-item b');
      return {
        bodyClasses: [...document.body.classList],
        accent: activeNav.backgroundColor,
        dark: read('[data-dark-token]').backgroundColor,
        idleNav: [idleNav.backgroundColor, idleNav.color],
        activeNav: [activeNav.backgroundColor, activeNav.color],
        primary: [primary.backgroundColor, primary.color],
        ghost: [ghost.backgroundColor, ghost.color],
        danger: [danger.backgroundColor, danger.color],
        input: [input.backgroundColor, input.color, input.colorScheme],
        nativeInput: [
          nativeInputStyle.backgroundColor,
          nativeInputStyle.color,
          nativeInputStyle.colorScheme,
        ],
        stat: [stat.backgroundColor, stat.borderRadius, statValue.color],
      };
    } finally {
      nativeInput.remove();
      probe.remove();
    }
  });

  const { bodyClasses, ...computedStyles } = style;
  assert.ok(bodyClasses.includes(expected.className), 'expected Scout site class');
  assert.deepEqual(computedStyles, {
    accent: expected.accent,
    dark: expected.dark,
    idleNav: ['rgb(239, 228, 210)', 'rgb(138, 111, 85)'],
    activeNav: [expected.accent, 'rgb(255, 255, 255)'],
    primary: [expected.accent, 'rgb(255, 255, 255)'],
    ghost: ['rgb(255, 250, 242)', 'rgb(90, 64, 48)'],
    danger: ['rgb(243, 213, 208)', 'rgb(138, 58, 50)'],
    input: ['rgb(255, 250, 243)', 'rgb(74, 55, 40)', 'light'],
    nativeInput: [expected.nativeInput, 'rgb(232, 234, 239)', 'dark'],
    stat: ['rgb(255, 253, 248)', '14px', expected.accent],
  });
}

async function openScoutTab(page, tab) {
  await page.locator(`#jlc-wb .jlc-wb-nav button[data-tab="${tab}"]`).click();
  await page.locator(`[data-jlc-wb-page="${tab}"]:not([hidden])`).waitFor();
}

async function openScoutSettingsTab(page, tab) {
  const drawer = page.locator('#jlc-wb-settings');
  if (!await drawer.evaluate((element) => element.classList.contains('is-open'))) {
    await page.locator('#scout-wb-settings-btn').click();
    await drawer.locator('.jlc-wb-settings-panel').waitFor();
  }
  await drawer.locator(`[data-scout-settings-tab="${tab}"]`).click();
  await drawer.locator(`[data-scout-settings-tab="${tab}"].active`).waitFor();
}

async function assertScoutPageLayout(page, tab) {
  const metrics = await page.evaluate((tabName) => {
    const panel = document.getElementById('jlc-wb');
    const target = document.querySelector(`[data-jlc-wb-page="${tabName}"]:not([hidden])`);
    if (!panel || !target) throw new Error('Scout page is not visible: ' + tabName);
    const panelRect = panel.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const controls = Array.from(target.querySelectorAll('input, select, button'))
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      });
    return {
      inlineStyles: target.querySelectorAll('[style]').length,
      horizontalOverflow: target.scrollWidth - target.clientWidth,
      insidePanel:
        targetRect.left >= panelRect.left - 1 &&
        targetRect.right <= panelRect.right + 1,
      controlsInsidePanel: controls.every(
        (rect) => rect.left >= panelRect.left - 1 && rect.right <= panelRect.right + 1
      ),
    };
  }, tab);
  assert.equal(metrics.inlineStyles, 0, tab + ' should not render static inline styles');
  assert.ok(metrics.horizontalOverflow <= 1, tab + ' should not overflow horizontally');
  assert.ok(metrics.insidePanel, tab + ' should stay inside the workbench');
  assert.ok(metrics.controlsInsidePanel, tab + ' controls should stay inside the workbench');
}

async function assertScoutSettingsLayout(page, tab) {
  const metrics = await page.evaluate(() => {
    const workbench = document.getElementById('jlc-wb');
    const drawer = document.getElementById('jlc-wb-settings');
    const panel = drawer?.querySelector('.jlc-wb-settings-panel');
    const nav = drawer?.querySelector('.jlc-wb-settings-nav');
    const body = document.getElementById('scout-settings-body');
    if (!workbench || !drawer || !panel || !nav || !body) {
      throw new Error('Scout settings drawer is incomplete');
    }
    const workbenchRect = workbench.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    const controls = Array.from(body.querySelectorAll('input, select, textarea, button'))
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      });
    return {
      inlineStyles: body.querySelectorAll('[style]').length,
      bodyOverflow: body.scrollWidth - body.clientWidth,
      navOverflow: nav.scrollWidth - nav.clientWidth,
      panelInsideWorkbench:
        panelRect.left >= workbenchRect.left - 1 &&
        panelRect.right <= workbenchRect.right + 1,
      bodyInsidePanel:
        bodyRect.left >= panelRect.left - 1 &&
        bodyRect.right <= panelRect.right + 1,
      controlsInsidePanel: controls.every(
        (rect) => rect.left >= panelRect.left - 1 && rect.right <= panelRect.right + 1
      ),
    };
  });
  assert.equal(metrics.inlineStyles, 0, tab + ' settings should not render static inline styles');
  assert.ok(metrics.bodyOverflow <= 1, tab + ' settings should not overflow horizontally');
  assert.ok(metrics.navOverflow <= 1, 'settings navigation should not overflow horizontally');
  assert.ok(metrics.panelInsideWorkbench, 'settings panel should stay inside the workbench');
  assert.ok(metrics.bodyInsidePanel, 'settings body should stay inside the settings panel');
  assert.ok(metrics.controlsInsidePanel, tab + ' settings controls should stay inside the panel');
}

async function assertNoInlinePresentation(page, selector, label) {
  const count = await page.evaluate((rootSelector) => {
    return Array.from(document.querySelectorAll(rootSelector)).reduce((total, root) => {
      return total + (root.hasAttribute('style') ? 1 : 0) + root.querySelectorAll('[style]').length;
    }, 0);
  }, selector);
  assert.equal(count, 0, label + ' should not render static inline styles');
}

async function openWorkbenchNav(page, nav) {
  await page.locator(`#jlc-wb .jlc-wb-nav button[data-nav="${nav}"]`).click();
  await page.locator(`[data-jlc-wb-page="${nav}"]:not([hidden])`).waitFor();
}

async function openWorkbenchSettingsTab(page, tab) {
  const drawer = page.locator('#jlc-wb-settings');
  if (!await drawer.evaluate((element) => element.classList.contains('is-open'))) {
    await page.locator('#jlc-wb-settings-btn').click();
    await page.waitForFunction(
      () => document.getElementById('jlc-wb-settings')?.classList.contains('is-open')
    );
  }
  await drawer.locator(`[data-jlc-settings-tab="${tab}"]`).click();
  await drawer.locator(`[data-jlc-settings-tab="${tab}"].active`).waitFor();
}

async function assertWorkbenchRegionLayout(page, selector, label) {
  const metrics = await page.evaluate((rootSelector) => {
    const panel = document.getElementById('jlc-wb');
    const root = document.querySelector(rootSelector);
    if (!panel || !root) throw new Error('Workbench region is missing: ' + rootSelector);
    const panelRect = panel.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const controls = Array.from(root.querySelectorAll('input, select, textarea, button'))
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      });
    return {
      inlineStyles: (root.hasAttribute('style') ? 1 : 0) + root.querySelectorAll('[style]').length,
      horizontalOverflow: root.scrollWidth - root.clientWidth,
      insidePanel:
        rootRect.left >= panelRect.left - 1 &&
        rootRect.right <= panelRect.right + 1,
      controlsInsidePanel: controls.every(
        (rect) => rect.left >= panelRect.left - 1 && rect.right <= panelRect.right + 1
      ),
    };
  }, selector);
  assert.equal(metrics.inlineStyles, 0, label + ' should not render static inline styles');
  assert.ok(metrics.horizontalOverflow <= 1, label + ' should not overflow horizontally');
  assert.ok(metrics.insidePanel, label + ' should stay inside the workbench');
  assert.ok(metrics.controlsInsidePanel, label + ' controls should stay inside the workbench');
}

async function assertScoutListFlowStyles(page, { mobile = false } = {}) {
  await page.locator('.scout-lex-flow-overlay').waitFor();
  await assertNoInlinePresentation(page, '.scout-lex-overlay-host', 'list lexicon flow');
  const metrics = await page.evaluate(() => {
    const flow = document.querySelector('.scout-lex-flow-overlay');
    const chip = flow?.querySelector('.scout-lex-chip');
    const host = flow?.parentElement;
    const flowStyle = getComputedStyle(flow);
    const chipStyle = getComputedStyle(chip);
    const hostStyle = getComputedStyle(host);
    return {
      flow: [
        flowStyle.display,
        flowStyle.gap,
        flowStyle.left,
        flowStyle.right,
        flowStyle.bottom,
        flowStyle.paddingTop,
        flowStyle.maxHeight,
      ],
      chip: [chipStyle.fontSize, chipStyle.paddingLeft, chipStyle.borderRadius],
      host: [
        host.classList.contains('scout-lex-overlay-host'),
        host.classList.contains('scout-lex-overlay-positioned'),
        hostStyle.position,
        hostStyle.overflow,
      ],
    };
  });
  assert.deepEqual(metrics, {
    flow: ['flex', '3px', '4px', '4px', '4px', mobile ? '3px' : '4px', mobile ? '36%' : '54%'],
    chip: [mobile ? '9px' : '10px', '7px', '999px'],
    host: [true, true, 'relative', 'hidden'],
  });
}

async function assertVisibleElementsInsideViewport(page, selector, label) {
  const result = await page.evaluate((targetSelector) => {
    const visible = Array.from(document.querySelectorAll(targetSelector))
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      });
    return {
      count: visible.length,
      inside: visible.every((rect) => rect.left >= -1 && rect.right <= window.innerWidth + 1),
    };
  }, selector);
  assert.ok(result.count > 0, label + ' should render visible elements');
  assert.ok(result.inside, label + ' should stay inside the viewport');
}

async function assertRenderedFixture(page, expected) {
  const url = new URL(page.url());
  assert.equal(url.pathname, expected.pathname, 'unexpected fixture route');
  assert.match(await page.title(), expected.title, 'unexpected fixture title');
  assert.ok((await page.locator('body').innerText()).trim().length > 20, 'fixture should not be blank');
  assert.equal(
    await page.locator(
      '#vite-error-overlay, [data-nextjs-dialog-overlay], #webpack-dev-server-client-overlay'
    ).count(),
    0,
    'fixture should not render a framework error overlay'
  );
}

let browser;
try {
  browser = await chromium.launch({ headless: true });
  console.log('Workbench E2E (Playwright)');

  await runCase(
    'Scout: open, switch tab, close',
    {
      host: 'www.xvideos.com',
      fixtureFile: 'xvideos-list.html',
      scriptPath: PATHS.scoutDist,
    },
    async (page) => {
      await openAndCheckTitle(page, /Scout/i);
      await assertScoutWorkbenchStyles(page, SCOUT_THEME_CASES[0]);
      await exerciseWorkbenchGeometry(page, {
        fab: 'scoutDragBound',
        panel: 'scoutPanelResizeBound',
        header: 'scoutHeaderDragBound',
      });
      await page.locator('#jlc-wb .jlc-wb-nav button[data-tab="lexicon"]').click();
      await page.locator('#jlc-wb .jlc-wb-nav button.active[data-tab="lexicon"]').waitFor();

      await page.locator('#scout-wb-settings-btn').click();
      await page.locator('#jlc-wb-settings.is-open').waitFor();
      await page.locator('#jlc-wb-settings-close').click();
      await page.waitForFunction(
        () => !document.querySelector('#jlc-wb-settings')?.classList.contains('is-open')
      );

      await page.locator('#scout-wb-close-btn').click();
      await waitWorkbenchClosed(page);

      await page.waitForFunction(() => (
        !!window.__creamuScoutBlockSitePreviewRuntime &&
        !!window.__creamuScoutListPreviewRuntime &&
        window.__creamuScoutClickTrackTarget === document.body &&
        !window.__creamuScoutSeekGestureRuntime
      ));
      await page.evaluate(() => history.pushState({}, '', '/video.alpha001/sample-title-alpha'));
      await page.waitForFunction(() => (
        !window.__creamuScoutBlockSitePreviewRuntime &&
        !window.__creamuScoutListPreviewRuntime &&
        !window.__creamuScoutClickTrackTarget &&
        !!window.__creamuScoutSeekGestureRuntime
      ));
      await page.evaluate(() => history.pushState({}, '', '/?k=sample'));
      await page.waitForFunction(() => (
        !!window.__creamuScoutBlockSitePreviewRuntime &&
        !!window.__creamuScoutListPreviewRuntime &&
        window.__creamuScoutClickTrackTarget === document.body &&
        !window.__creamuScoutSeekGestureRuntime
      ));
    }
  );

  await runCase(
    'Scout: workbench renders pages lazily and reuses stable tabs',
    {
      host: 'www.xvideos.com',
      fixtureFile: 'xvideos-list.html',
      scriptPath: PATHS.scoutDist,
      gmValues: SCOUT_WORKBENCH_FIXTURE_DATA,
      beforeScript: (page) => page.evaluate(() => {
        history.replaceState({}, '', '/?k=lazy+render');
        const nativeGetValue = window.GM_getValue;
        const nativeSetValue = window.GM_setValue;
        window.__testWorkbenchGmReads = {};
        window.__testWorkbenchGmWrites = {};
        window.__testResetWorkbenchGmReads = () => {
          window.__testWorkbenchGmReads = {};
          window.__testWorkbenchGmWrites = {};
        };
        window.GM_getValue = (key, ...args) => {
          const reads = window.__testWorkbenchGmReads;
          reads[key] = (reads[key] || 0) + 1;
          return nativeGetValue(key, ...args);
        };
        window.GM_setValue = (key, value) => {
          const writes = window.__testWorkbenchGmWrites;
          writes[key] = (writes[key] || 0) + 1;
          return nativeSetValue(key, value);
        };
      }),
    },
    async (page) => {
      await waitFab(page);
      const startup = await page.evaluate(() => ({
        autoTrackReads: window.__testWorkbenchGmReads.scout_combo_auto_track || 0,
        comboChildren: document.querySelector('[data-jlc-wb-page="combo"]')?.childElementCount || 0,
        comboTokenReads: window.__testWorkbenchGmReads.scout_combo_tokens || 0,
        lexiconTypeReads: window.__testWorkbenchGmReads.creamu_scout_lexicon_types || 0,
      }));
      assert.deepEqual(startup, {
        autoTrackReads: 0,
        comboChildren: 0,
        comboTokenReads: 0,
        lexiconTypeReads: 0,
      });

      await page.evaluate(() => window.__testResetWorkbenchGmReads());
      await page.locator('#scout-search-track-toggle').click();
      await page.locator('#scout-search-track-toggle', { hasText: '取消' }).waitFor();
      const hiddenAction = await page.evaluate(() => ({
        comboChildren: document.querySelector('[data-jlc-wb-page="combo"]')?.childElementCount || 0,
        comboTokenReads: window.__testWorkbenchGmReads.scout_combo_tokens || 0,
      }));
      assert.deepEqual(hiddenAction, { comboChildren: 0, comboTokenReads: 0 });

      await page.evaluate(() => window.__testResetWorkbenchGmReads());
      await openAndCheckTitle(page, /Scout/i);
      const firstOpen = await page.evaluate(() => {
        window.__testComboPageRoot = document.querySelector('[data-jlc-wb-page="combo"]')?.firstElementChild;
        return { ...window.__testWorkbenchGmReads };
      });
      assert.equal(firstOpen.scout_combo_tokens, 1);

      await page.locator('#scout-wb-close-btn').click();
      await waitWorkbenchClosed(page);
      await page.evaluate(() => window.__testResetWorkbenchGmReads());
      await page.locator('#jlc-wb-fab').click();
      await waitWorkbenchOpen(page);
      const reopened = await page.evaluate(() => ({
        dataReads: [
          'creamu_scout_config',
          'creamu_scout_lexicon_terms',
          'creamu_scout_lexicon_types',
          'scout_combo_auto_track',
          'scout_combo_tokens',
        ].reduce((total, key) => total + (window.__testWorkbenchGmReads[key] || 0), 0),
        preserved: document.querySelector('[data-jlc-wb-page="combo"]')?.firstElementChild
          === window.__testComboPageRoot,
      }));
      assert.deepEqual(reopened, { dataReads: 0, preserved: true });

      await page.evaluate(() => window.__testResetWorkbenchGmReads());
      await openScoutTab(page, 'lexicon');
      const firstLexiconOpen = await page.evaluate(() => {
        window.__testLexiconPageRoot = document.querySelector('[data-jlc-wb-page="lexicon"]')?.firstElementChild;
        return { ...window.__testWorkbenchGmReads };
      });
      assert.equal(firstLexiconOpen.creamu_scout_lexicon_terms, 1);
      assert.equal(firstLexiconOpen.creamu_scout_lexicon_types, 1);

      await page.evaluate(() => window.__testResetWorkbenchGmReads());
      await openScoutTab(page, 'combo');
      const stableCombo = await page.evaluate(() => ({
        preserved: document.querySelector('[data-jlc-wb-page="combo"]')?.firstElementChild
          === window.__testComboPageRoot,
        reads: Object.values(window.__testWorkbenchGmReads).reduce((total, count) => total + count, 0),
      }));
      assert.deepEqual(stableCombo, { preserved: true, reads: 0 });

      await page.evaluate(() => window.__testResetWorkbenchGmReads());
      await openScoutTab(page, 'lexicon');
      const stableLexicon = await page.evaluate(() => ({
        preserved: document.querySelector('[data-jlc-wb-page="lexicon"]')?.firstElementChild
          === window.__testLexiconPageRoot,
        reads: Object.values(window.__testWorkbenchGmReads).reduce((total, count) => total + count, 0),
      }));
      assert.deepEqual(stableLexicon, { preserved: true, reads: 0 });

      await page.locator('[data-id="term-night"] .jlc-wb-more-btn').click();
      await page.locator('[data-id="term-night"] .scout-edit-zh').fill('Updated Night');
      await page.locator('[data-id="term-night"] .scout-save-btn').click();
      await page.locator('[data-id="term-night"] .jlc-wb-item-title', { hasText: 'Updated Night' }).waitFor();
      await page.evaluate(() => window.__testResetWorkbenchGmReads());
      await openScoutTab(page, 'combo');
      const refreshedCombo = await page.evaluate(() => ({
        changed: document.querySelector('[data-jlc-wb-page="combo"]')?.firstElementChild
          !== window.__testComboPageRoot,
        termReads: window.__testWorkbenchGmReads.creamu_scout_lexicon_terms || 0,
      }));
      assert.deepEqual(refreshedCombo, { changed: true, termReads: 1 });
      assert.match(await page.locator('#scout-combo-pool').textContent() || '', /Updated Night/);

      await page.evaluate(() => window.__testResetWorkbenchGmReads());
      await page.locator('#scout-combo-free-input').fill('night, portrait');
      await page.locator('#scout-combo-add-btn').click();
      await page.locator('[data-combo-token="portrait"]').waitFor();
      const batchIo = await page.evaluate(() => ({
        reads: window.__testWorkbenchGmReads.scout_combo_tokens || 0,
        writes: window.__testWorkbenchGmWrites.scout_combo_tokens || 0,
      }));
      assert.deepEqual(batchIo, { reads: 2, writes: 1 });

      await page.locator('#scout-wb-settings-btn').click();
      await page.locator('#jlc-wb-settings.is-open').waitFor();
      await page.evaluate(() => window.__testResetWorkbenchGmReads());
      await openScoutSettingsTab(page, 'ui');
      const uiReads = await page.evaluate(() => ({ ...window.__testWorkbenchGmReads }));
      assert.deepEqual(uiReads, { creamu_scout_config: 1 });

      await page.evaluate(() => window.__testResetWorkbenchGmReads());
      await openScoutSettingsTab(page, 'backup');
      const backupReads = await page.evaluate(() => ({ ...window.__testWorkbenchGmReads }));
      assert.deepEqual(backupReads, {});

      await page.locator('#scout-ai-export').click();
      await page.evaluate(() => {
        window.__testComboBeforeSettingsImport = document.querySelector(
          '[data-jlc-wb-page="combo"]'
        )?.firstElementChild;
        window.__testLexiconBeforeSettingsImport = document.querySelector(
          '[data-jlc-wb-page="lexicon"]'
        )?.firstElementChild;
      });
      page.once('dialog', (dialog) => dialog.accept());
      await page.locator('#scout-ai-import-merge').click();
      const settingsImportRender = await page.evaluate(() => ({
        comboRefreshed: document.querySelector('[data-jlc-wb-page="combo"]')?.firstElementChild
          !== window.__testComboBeforeSettingsImport,
        lexiconPreserved: document.querySelector('[data-jlc-wb-page="lexicon"]')?.firstElementChild
          === window.__testLexiconBeforeSettingsImport,
        blocksChildren: document.querySelector('[data-jlc-wb-page="blocks"]')?.childElementCount || 0,
      }));
      assert.deepEqual(settingsImportRender, {
        comboRefreshed: true,
        lexiconPreserved: true,
        blocksChildren: 0,
      });

      await page.evaluate(() => window.__testResetWorkbenchGmReads());
      await openScoutSettingsTab(page, 'sync');
      const syncReads = await page.evaluate(() => ({ ...window.__testWorkbenchGmReads }));
      assert.deepEqual(syncReads, {
        creamu_scout_config: 2,
        creamu_wd_meta_scout: 1,
      });
    }
  );

  await runCase(
    'Scout: library and tracking pages share stable layout components',
    {
      host: 'www.xvideos.com',
      fixtureFile: 'xvideos-list.html',
      scriptPath: PATHS.scoutDist,
      gmValues: SCOUT_WORKBENCH_FIXTURE_DATA,
    },
    async (page) => {
      await openAndCheckTitle(page, /Scout/i);

      await openScoutTab(page, 'lexicon');
      await assertScoutPageLayout(page, 'lexicon');
      await page.locator('#scout-lexicon-search').fill('city');
      assert.equal(await page.locator('[data-jlc-wb-page="lexicon"] .jlc-wb-item').count(), 1);
      await page.locator('[data-jlc-wb-page="lexicon"] .jlc-wb-more-btn').click();
      await page.locator('[data-jlc-wb-page="lexicon"] .jlc-wb-item-edit.is-open').waitFor();
      await page.locator('[data-jlc-wb-page="lexicon"] .scout-cancel-btn').click();
      assert.equal(
        await page.locator('[data-jlc-wb-page="lexicon"] .jlc-wb-item-edit.is-open').count(),
        0
      );

      await openScoutTab(page, 'works');
      await assertScoutPageLayout(page, 'works');
      assert.equal(await page.locator('.scout-work-site-chip').count(), 3);

      await openScoutTab(page, 'publishers');
      await assertScoutPageLayout(page, 'publishers');
      assert.equal(await page.locator('[data-jlc-wb-page="publishers"] .person-item').count(), 2);

      await openScoutTab(page, 'tracks');
      await assertScoutPageLayout(page, 'tracks');
      assert.equal(await page.locator('.scout-track-group').count(), 1);
      await page.locator('.scout-track-expand-btn').click();
      await page.locator('.scout-track-group-sites.is-open').waitFor();
      assert.equal(await page.locator('.scout-track-site-row').count(), 3);
      await page.locator('.scout-track-more-btn').click();
      await page.locator('.scout-track-edit.is-open').waitFor();
      await page.locator('.scout-track-cancel-btn').click();
      assert.equal(await page.locator('.scout-track-edit.is-open').count(), 0);

      await openScoutTab(page, 'blocks');
      await assertScoutPageLayout(page, 'blocks');
      assert.equal(await page.locator('[data-jlc-wb-page="blocks"] .person-item').count(), 2);
      await page.locator('.scout-toggle-mode-btn[data-id="block-spoiler"]').click();
      await page.locator('.scout-toggle-mode-btn[data-id="block-spoiler"]', { hasText: '弱淡化' }).waitFor();
      await page.locator('#scout-add-block-text').fill('trailer');
      await page.locator('input[name="scout-add-block-mode"][value="hide"]').check();
      await page.locator('input[name="scout-add-block-scope"][value="both"]').check();
      await page.locator('#scout-add-block-btn').click();
      assert.equal(await page.locator('[data-jlc-wb-page="blocks"] .person-item').count(), 3);
    }
  );

  await runCase(
    'Scout: combo and settings preserve state across responsive renders',
    {
      host: 'www.xvideos.com',
      fixtureFile: 'xvideos-list.html',
      scriptPath: PATHS.scoutDist,
      gmValues: SCOUT_WORKBENCH_FIXTURE_DATA,
    },
    async (page) => {
      await openAndCheckTitle(page, /Scout/i);

      await openScoutTab(page, 'combo');
      await assertScoutPageLayout(page, 'combo');
      assert.deepEqual(
        await page.locator('[data-combo-token]').evaluateAll(
          (elements) => elements.map((element) => element.getAttribute('data-combo-token'))
        ),
        ['documentary', 'city walk']
      );
      assert.equal(
        await page.locator('.scout-combo-preview-value').textContent(),
        'documentary and city walk'
      );

      await page.locator('#scout-combo-free-input').fill('night');
      await page.locator('#scout-combo-add-btn').click();
      await page.locator('[data-combo-token="night"]').waitFor();
      assert.equal(
        await page.locator('.scout-combo-preview-value').textContent(),
        'documentary and city walk and night'
      );
      await page.locator('[data-combo-token="city walk"]').click();
      assert.equal(await page.locator('[data-combo-token="city walk"]').count(), 0);
      assert.equal(
        await page.locator('.scout-combo-preview-value').textContent(),
        'documentary and night'
      );
      await page.locator('input[name="scout-combo-join"][value="or"]').check();
      await page.locator('input[name="scout-combo-join"][value="or"]:checked').waitFor();
      assert.equal(
        await page.locator('.scout-combo-preview-value').textContent(),
        'documentary or night'
      );
      await assertScoutPageLayout(page, 'combo');

      await openScoutSettingsTab(page, 'overview');
      await assertScoutSettingsLayout(page, 'overview');
      assert.deepEqual(
        await page.locator('#scout-settings-body .stat-item > b').allTextContents(),
        ['3', '2', '2', '2', '1', '0']
      );

      await openScoutSettingsTab(page, 'ui');
      await assertScoutSettingsLayout(page, 'ui');
      assert.deepEqual(
        await page.locator('#scout-settings-body input[type="checkbox"]').evaluateAll(
          (elements) => elements.map((element) => element.checked)
        ),
        [true, true, true]
      );

      await openScoutSettingsTab(page, 'backup');
      await assertScoutSettingsLayout(page, 'backup');
      await page.locator('#scout-ai-export').click();
      await page.locator('#scout-export-btn').click();
      const exported = await page.evaluate(() => ({
        ai: document.getElementById('scout-ai-textarea')?.value || '',
        backup: document.getElementById('scout-backup-textarea')?.value || '',
      }));
      const aiPackage = JSON.parse(exported.ai);
      const backupPackage = JSON.parse(exported.backup);
      assert.equal(aiPackage.format, 'creamu-scout-ai');
      assert.equal(aiPackage.terms.length, 3);
      assert.equal(aiPackage.blocks.length, 2);
      assert.equal(backupPackage.format, 'creamu-scout-lexicon');
      assert.equal(backupPackage.works.length, 1);
      assert.equal(backupPackage.publishers.length, 2);
      assert.equal(backupPackage.tracks.length, 2);

      await openScoutSettingsTab(page, 'sync');
      await assertScoutSettingsLayout(page, 'sync');
      assert.equal(await page.locator('#scout-wd-form').getAttribute('hidden'), '');
      await page.locator('#scout-wd-enabled').check();
      await page.locator('#scout-wd-form:not([hidden])').waitFor();
      assert.equal(await page.locator('#scout-wd-url').inputValue(), 'https://dav.example.test/');
      assert.equal(await page.locator('#scout-wd-user').inputValue(), 'tester@example.test');
      assert.equal(await page.locator('#scout-wd-path').inputValue(), '/Creamu');
      await assertScoutSettingsLayout(page, 'sync');
      await page.locator('#scout-wd-enabled').uncheck();
      await page.locator('#scout-wd-form[hidden]').waitFor({ state: 'attached' });
      assert.equal(await page.locator('#scout-wd-form').getAttribute('hidden'), '');

      await page.locator('#jlc-wb-settings-close').click();
      await page.waitForFunction(
        () => !document.getElementById('jlc-wb-settings')?.classList.contains('is-open')
      );
    }
  );

  await runCase(
    'Scout mobile: workbench pages and settings fit the viewport',
    {
      host: 'www.xvideos.com',
      fixtureFile: 'xvideos-list.html',
      scriptPath: PATHS.scoutDist,
      gmValues: {
        ...SCOUT_WORKBENCH_FIXTURE_DATA,
        creamu_scout_lexicon_terms: [
          ...SCOUT_WORKBENCH_FIXTURE_DATA.creamu_scout_lexicon_terms,
          SCOUT_LIST_FLOW_TERM,
        ],
      },
      viewport: { width: 390, height: 844 },
    },
    async (page) => {
      await assertScoutListFlowStyles(page, { mobile: true });
      await openAndCheckTitle(page, /Scout/i);
      for (const tab of ['combo', 'lexicon', 'works', 'publishers', 'tracks', 'blocks']) {
        await openScoutTab(page, tab);
        await assertScoutPageLayout(page, tab);
      }
      for (const tab of ['overview', 'ui', 'backup', 'sync']) {
        await openScoutSettingsTab(page, tab);
        await assertScoutSettingsLayout(page, tab);
      }
    }
  );

  await runCase(
    'Scout detail: tag, work, and publisher actions use page components',
    {
      host: 'www.xvideos.com',
      fixtureFile: 'xvideos-detail.html',
      scriptPath: PATHS.scoutDist,
      gmValues: SCOUT_DETAIL_FIXTURE_DATA,
      beforeScript: (page) => page.evaluate(() => {
        history.replaceState({}, '', '/video.alpha001/sample-documentary');
        const nativeGetValue = window.GM_getValue;
        const nativeSetInterval = window.setInterval.bind(window);
        window.__testDetailGmReads = 0;
        window.__testEightSecondIntervals = [];
        window.GM_getValue = (...args) => {
          window.__testDetailGmReads += 1;
          return nativeGetValue(...args);
        };
        window.setInterval = (callback, delay, ...args) => {
          if (delay === 8000) {
            window.__testEightSecondIntervals.push(() => callback(...args));
            return 80000 + window.__testEightSecondIntervals.length;
          }
          return nativeSetInterval(callback, delay, ...args);
        };
      }),
    },
    async (page) => {
      await assertRenderedFixture(page, {
        pathname: '/video.alpha001/sample-documentary',
        title: /Sample Documentary Detail/,
      });
      await page.locator('#scout-work-fav-btn').waitFor();
      await page.locator('.scout-pub-addon').waitFor();
      assert.equal(await page.locator('.scout-tag-addon').count(), 4);
      await assertNoInlinePresentation(
        page,
        '#scout-work-fav-bar, .scout-tag-addon, .scout-pub-addon',
        'detail enhancements'
      );

      const componentStyles = await page.evaluate(() => {
        const add = getComputedStyle(document.querySelector('.scout-tag-add-action'));
        const block = getComputedStyle(document.querySelector('.scout-tag-block-action'));
        const publisher = getComputedStyle(document.querySelector('.scout-pub-addon'));
        const action = getComputedStyle(document.querySelector('.scout-pub-action'));
        return {
          tagColors: [add.color, block.color],
          publisher: [publisher.display, publisher.gap, publisher.marginLeft, publisher.fontSize],
          action: [action.height, action.paddingTop, action.paddingRight, action.borderRadius, action.fontSize],
        };
      });
      assert.deepEqual(componentStyles, {
        tagColors: ['rgb(143, 212, 160)', 'rgb(240, 144, 136)'],
        publisher: ['flex', '4px', '8px', '12px'],
        action: ['24px', '2px', '8px', '6px', '11.5px'],
      });

      const lifecycleResult = await page.evaluate(() => {
        const callback = window.__testEightSecondIntervals?.[0];
        const favoriteButton = document.getElementById('scout-work-fav-btn');
        const publisherAddon = document.querySelector('.scout-pub-addon');
        const tagAddon = document.querySelector('.scout-tag-addon');
        window.__testDetailGmReads = 0;
        callback?.();
        const stableReads = window.__testDetailGmReads;
        const stableNodesPreserved =
          document.getElementById('scout-work-fav-btn') === favoriteButton &&
          document.querySelector('.scout-pub-addon') === publisherAddon &&
          document.querySelector('.scout-tag-addon') === tagAddon;

        const firstTag = document.querySelector('.video-tags-list a.is-keyword');
        firstTag?.setAttribute('href', '/tags/documentary-updated');
        window.__testDetailGmReads = 0;
        callback?.();
        return {
          callbackCount: window.__testEightSecondIntervals?.length || 0,
          changedReads: window.__testDetailGmReads,
          stableNodesPreserved,
          stableReads,
        };
      });
      assert.deepEqual(
        {
          callbackCount: lifecycleResult.callbackCount,
          stableNodesPreserved: lifecycleResult.stableNodesPreserved,
          stableReads: lifecycleResult.stableReads,
        },
        { callbackCount: 1, stableNodesPreserved: true, stableReads: 0 }
      );
      assert.ok(lifecycleResult.changedReads > 0, 'changed detail content should refresh stored data');

      await page.locator('#scout-work-fav-btn').click();
      await page.locator('#scout-work-fav-btn.is-saved').waitFor();
      assert.equal(await page.locator('#scout-work-fav-btn').getAttribute('aria-pressed'), 'true');
      await page.locator('[data-scout-tag="night"] .scout-tag-add-action').click();
      await page.locator('#scout-collect-dialog').waitFor();
      await page.locator('#scout-collect-cancel').click();
      await page.locator('.scout-pub-love-action').click();
      await page.locator('.scout-pub-love-action.is-loved').waitFor();
      assert.match(await page.locator('.scout-pub-love-action').textContent() || '', /已关注/);
    }
  );

  await runCase(
    'Scout detail mobile: tags and description expand inside the viewport',
    {
      host: 'www.xvideos.com',
      fixtureFile: 'xvideos-detail.html',
      scriptPath: PATHS.scoutDist,
      gmValues: SCOUT_DETAIL_FIXTURE_DATA,
      viewport: { width: 390, height: 844 },
      beforeScript: (page) => page.evaluate(() => {
        history.replaceState({}, '', '/video.alpha001/sample-documentary');
      }),
    },
    async (page) => {
      await assertRenderedFixture(page, {
        pathname: '/video.alpha001/sample-documentary',
        title: /Sample Documentary Detail/,
      });
      await page.locator('#scout-tags-toggle').waitFor();
      await page.locator('#scout-desc-toggle').waitFor();
      await page.locator('.video-tags-list.scout-tags-collapsed').waitFor();
      await page.locator('.video-description.scout-desc-collapsed').waitFor();
      await assertNoInlinePresentation(
        page,
        '.video-tags-list, .video-description, #scout-tags-toggle, #scout-desc-toggle, .scout-pub-addon',
        'mobile detail enhancements'
      );
      await assertVisibleElementsInsideViewport(
        page,
        '#scout-work-fav-btn, #scout-tags-toggle, #scout-desc-toggle, .scout-pub-action',
        'mobile detail controls'
      );

      await page.locator('#scout-tags-toggle').click();
      await page.locator('.video-tags-list.scout-tags-expanded').waitFor();
      assert.equal(await page.locator('#scout-tags-toggle').getAttribute('aria-expanded'), 'true');
      await page.locator('#scout-desc-toggle').click();
      await page.locator('.video-description.scout-desc-expanded').waitFor();
      assert.equal(await page.locator('#scout-desc-toggle').getAttribute('aria-expanded'), 'true');
      await assertVisibleElementsInsideViewport(
        page,
        '#scout-work-fav-btn, #scout-tags-toggle, #scout-desc-toggle, .scout-pub-action',
        'expanded mobile detail controls'
      );
    }
  );

  await runCase(
    'Scout tracking mobile: breakpoint bar dismisses and locates the saved item',
    {
      host: 'www.xvideos.com',
      fixtureFile: 'xvideos-list.html',
      scriptPath: PATHS.scoutDist,
      gmValues: SCOUT_TRACKING_FIXTURE_DATA,
      viewport: { width: 390, height: 844 },
      beforeScript: (page) => page.evaluate(() => {
        history.replaceState({}, '', '/?k=documentary+city');
      }),
    },
    async (page) => {
      await assertRenderedFixture(page, {
        pathname: '/',
        title: /site list fixture/,
      });
      const pagebar = page.locator('#jlc-tracking-pagebar');
      await pagebar.waitFor({ timeout: 5000 });
      await assertNoInlinePresentation(page, '#jlc-tracking-pagebar', 'tracking pagebar');
      await assertVisibleElementsInsideViewport(
        page,
        '#jlc-tracking-pagebar, #jlc-tracking-pagebar button',
        'tracking pagebar controls'
      );
      assert.match(await pagebar.textContent() || '', /本页有断点/);
      assert.match(await page.locator('#scout-bp-jump-btn').textContent() || '', /定位/);

      await page.locator('#scout-bp-close-bar-btn').click();
      await pagebar.waitFor({ state: 'detached' });
      await page.evaluate(() => history.pushState({}, '', '/?k=other'));
      await page.waitForTimeout(400);
      await page.evaluate(() => history.pushState({}, '', '/?k=documentary+city'));
      await pagebar.waitFor({ timeout: 5000 });
      await page.locator('#scout-bp-jump-btn').click();
      await pagebar.waitFor({ state: 'detached' });
      await page.locator('#video_alpha001.scout-breakpoint-highlight').waitFor();
    }
  );

  for (const theme of SCOUT_THEME_CASES.slice(1)) {
    await runCase(
      'Scout: shared workbench theme on ' + theme.host,
      {
        host: theme.host,
        fixtureHtml: SCOUT_THEME_FIXTURE,
        scriptPath: PATHS.scoutDist,
      },
      async (page) => {
        await openAndCheckTitle(page, /Scout/i);
        await assertScoutWorkbenchStyles(page, theme);
        await page.locator('#scout-wb-close-btn').click();
        await waitWorkbenchClosed(page);
      }
    );
  }

  await runCase(
    'Scout: list lifecycle refreshes mutations and skips stable polling',
    {
      host: 'www.xvideos.com',
      fixtureFile: 'xvideos-list.html',
      scriptPath: PATHS.scoutDist,
      gmValues: {
        creamu_scout_lexicon_terms: [SCOUT_LIST_FLOW_TERM],
        creamu_scout_clicks: {
          'xvideos|legacy-alpha': {
            site: 'xvideos',
            id: '/video.alpha001/sample-title-alpha',
            clicked: true,
          },
        },
      },
      beforeScript: (page) => page.evaluate(() => {
        const nativeSetInterval = window.setInterval.bind(window);
        window.__testEightSecondIntervals = [];
        window.__testEightSecondCallbackRuns = 0;
        window.setInterval = (callback, delay, ...args) => {
          if (delay === 8000) {
            window.__testEightSecondIntervals.push(() => {
              window.__testEightSecondCallbackRuns += 1;
              return callback(...args);
            });
            return 80000 + window.__testEightSecondIntervals.length;
          }
          return nativeSetInterval(callback, delay, ...args);
        };
      }),
    },
    async (page) => {
      const flow = page.locator('.scout-lex-flow-overlay');
      await flow.waitFor();
      await assertScoutListFlowStyles(page);

      const stableResult = await page.evaluate(() => {
        const callbacks = window.__testEightSecondIntervals || [];
        const currentFlow = document.querySelector('.scout-lex-flow-overlay');
        const firstChip = currentFlow?.firstElementChild || null;
        window.__testOriginalFlowChip = firstChip;
        callbacks[0]?.();
        return {
          callbackCount: callbacks.length,
          callbackRuns: window.__testEightSecondCallbackRuns,
          preserved: currentFlow?.firstElementChild === firstChip,
          legacyClickMarked: document.getElementById('video_alpha001')
            ?.classList.contains('scout-visited-item'),
        };
      });
      assert.deepEqual(stableResult, {
        callbackCount: 1,
        callbackRuns: 1,
        preserved: true,
        legacyClickMarked: true,
      });

      await page.evaluate(() => {
        const card = document.createElement('div');
        card.id = 'video_beta002';
        card.className = 'thumb-block';
        card.innerHTML = '<div class="thumb-under"><p class="title">'
          + '<a href="/video.beta002/sample-title-beta" title="Sample Title Beta">'
          + 'Sample Title Beta</a></p></div>';
        document.querySelector('.mozaique').appendChild(card);
      });
      await page.locator('#video_beta002 .scout-lex-flow-overlay').waitFor({ timeout: 2000 });
      const changedResult = await page.evaluate(() => {
        const card = document.getElementById('video_beta002');
        return {
          cards: document.querySelectorAll('.mozaique .thumb-block').length,
          callbackRuns: window.__testEightSecondCallbackRuns,
          enhanced: !!card.querySelector('.scout-lex-flow-overlay'),
          clickBound: card.dataset.scoutClickBound,
          preservedExisting: document.querySelector('.scout-lex-flow-overlay')
            ?.firstElementChild === window.__testOriginalFlowChip,
        };
      });
      assert.deepEqual(changedResult, {
        cards: 2,
        callbackRuns: 1,
        enhanced: true,
        clickBound: '1',
        preservedExisting: true,
      });
    }
  );

  await runCase(
    'ExH: open, switch tab, close',
    {
      host: 'e-hentai.org',
      fixtureFile: 'ehentai-list.html',
      scriptPath: PATHS.exhDist,
    },
    async (page) => {
      await openAndCheckTitle(page, /ExH/i);
      await exerciseWorkbenchGeometry(page, {
        fab: 'exhFabDragBound',
        panel: 'exhPanelResizeBound',
        header: 'exhPanelDragBound',
      });
      await assertWorkbenchRegionLayout(page, '#exc-wb-tracking-root', 'ExH tracking');
      await openWorkbenchNav(page, 'works');
      await assertWorkbenchRegionLayout(page, '#exc-wb-works-root', 'ExH works');

      for (const tab of ['sync', 'tags', 'pref', 'ui', 'data']) {
        await openWorkbenchSettingsTab(page, tab);
        await assertWorkbenchRegionLayout(page, '#exc-settings-body', 'ExH ' + tab + ' settings');
      }
      await page.locator('#jlc-wb-settings-close').click();

      await page.locator('#jlc-wb-close-btn').click();
      await waitWorkbenchClosed(page);
    }
  );

  await runCase(
    'ExH mobile: workbench content and settings fit the viewport',
    {
      host: 'e-hentai.org',
      fixtureFile: 'ehentai-list.html',
      scriptPath: PATHS.exhDist,
      viewport: { width: 390, height: 844 },
    },
    async (page) => {
      await openAndCheckTitle(page, /ExH/i);
      await assertWorkbenchRegionLayout(page, '#exc-wb-tracking-root', 'ExH mobile tracking');
      await openWorkbenchNav(page, 'works');
      await assertWorkbenchRegionLayout(page, '#exc-wb-works-root', 'ExH mobile works');
      for (const tab of ['sync', 'tags', 'pref', 'ui', 'data']) {
        await openWorkbenchSettingsTab(page, tab);
        await assertWorkbenchRegionLayout(
          page,
          '#exc-settings-body',
          'ExH mobile ' + tab + ' settings'
        );
      }
      await page.locator('#jlc-wb-settings-close').click();
      await page.locator('#jlc-wb-close-btn').click();
      await waitWorkbenchClosed(page);
    }
  );

  await runCase(
    'ExH list: startup, stable focus, and incremental work stay bounded',
    {
      host: 'e-hentai.org',
      fixtureHtml: createExhStressFixture(EXH_STRESS_CARD_COUNT),
      scriptPath: PATHS.exhDist,
      beforeInject: async (page) => {
        await page.evaluate(installExhStorageMetrics);
      },
    },
    async (page) => {
      await page.waitForFunction(
        (expected) => {
          const items = Array.from(document.querySelectorAll('[data-e2e-exh-card]'));
          return items.length === expected && items.every((item) => item.dataset.excEnhanced === '1');
        },
        EXH_STRESS_CARD_COUNT,
        { timeout: 30000 }
      );
      await page.waitForFunction(
        () => performance.now() - window.__exhListMetrics.lastTransactionAt > 250,
        null,
        { timeout: 5000 }
      );
      const startup = await page.evaluate(() => ({
        transactions: structuredClone(window.__exhListMetrics.transactions),
        enhancedWrites: window.__exhListMetrics.enhancedWrites,
      }));

      await page.evaluate(() => {
        window.__exhStableBadgeNodes = Array.from(
          document.querySelectorAll('[data-e2e-exh-card]')
        ).map((item) => item.querySelector('.exc-badge-container > .exc-meta-overlay'));
        window.GM_setValue(
          'exh_commander_seen_gids_v1',
          JSON.stringify({ 710000: Date.now() })
        );
        window.__resetExhListMetrics();
        window.dispatchEvent(new Event('focus'));
      });
      await page.waitForTimeout(260);
      await page.waitForFunction(
        () => {
          const items = Array.from(document.querySelectorAll('[data-e2e-exh-card]'));
          return items.every((item) => item.dataset.excEnhanced === '1')
            && performance.now() - window.__exhListMetrics.lastTransactionAt > 250;
        },
        null,
        { timeout: 30000 }
      );
      const stable = await page.evaluate(() => ({
        transactions: structuredClone(window.__exhListMetrics.transactions),
        enhancedWrites: window.__exhListMetrics.enhancedWrites,
        badgesPreserved: Array.from(document.querySelectorAll('[data-e2e-exh-card]'))
          .every((item, index) => (
            item.querySelector('.exc-badge-container > .exc-meta-overlay')
              === window.__exhStableBadgeNodes[index]
          )),
        seenRefreshed: document.querySelector('[data-e2e-exh-card="710000"]')
          ?.classList.contains('is-exc-seen') === true,
      }));

      await page.evaluate(() => {
        window.__resetExhListMetrics();
        document.querySelector('table.itg > tbody').insertAdjacentHTML(
          'beforeend',
          '<tr data-e2e-exh-card="799999"><td class="glname">'
            + '<a href="/g/799999/bbbbbbbbbb/">'
            + '<div class="glink">[Group 0] Stress Gallery 0</div></a>'
            + '</td></tr>'
        );
      });
      await page.waitForFunction(
        () => document.querySelector('[data-e2e-exh-card="799999"]')?.dataset.excEnhanced === '1',
        null,
        { timeout: 10000 }
      );
      await page.waitForFunction(
        () => performance.now() - window.__exhListMetrics.lastTransactionAt > 250,
        null,
        { timeout: 5000 }
      );
      const incremental = await page.evaluate(() => ({
        transactions: structuredClone(window.__exhListMetrics.transactions),
        enhancedWrites: window.__exhListMetrics.enhancedWrites,
        existingBadgesPreserved: Array.from(document.querySelectorAll('[data-e2e-exh-card]'))
          .slice(0, window.__exhStableBadgeNodes.length)
          .every((item, index) => (
            item.querySelector('.exc-badge-container > .exc-meta-overlay')
              === window.__exhStableBadgeNodes[index]
          )),
      }));

      console.log('      ExH startup: ' + JSON.stringify(startup));
      console.log('      ExH stable focus: ' + JSON.stringify(stable));
      console.log('      ExH incremental: ' + JSON.stringify(incremental));
      assert.ok(
        startup.transactions.total <= MAX_EXH_STARTUP_TRANSACTIONS,
        'ExH startup opened too many IndexedDB transactions: ' + startup.transactions.total
      );
      assert.ok(
        (startup.transactions.byStore.tracking_searches || 0) <= 1,
        'ExH startup should share one tracking_searches snapshot'
      );
      assert.ok(
        stable.transactions.total <= MAX_EXH_STABLE_REFRESH_TRANSACTIONS,
        'stable ExH focus opened too many IndexedDB transactions: ' + stable.transactions.total
      );
      assert.ok(
        (stable.transactions.byStore.tracking_searches || 0) <= 1,
        'stable ExH focus should use one tracking_searches transaction'
      );
      assert.equal(stable.enhancedWrites, 0, 'stable ExH focus should not invalidate enhanced cards');
      assert.equal(stable.badgesPreserved, true, 'stable ExH focus should preserve badge DOM');
      assert.equal(stable.seenRefreshed, true, 'stable ExH focus should refresh volatile seen state');
      assert.ok(
        incremental.transactions.total <= MAX_EXH_INCREMENTAL_TRANSACTIONS,
        'one inserted ExH card opened too many IndexedDB transactions: '
          + incremental.transactions.total
      );
      assert.ok(
        (incremental.transactions.byStore.tracking_searches || 0) <= 1,
        'one inserted ExH card should use one tracking_searches transaction'
      );
      assert.equal(
        incremental.existingBadgesPreserved,
        true,
        'incremental ExH enhancement should preserve existing badge DOM'
      );

      const stored = await page.evaluate(() => window.__readExhStores(['editions', 'works']));
      assert.equal(stored.editions.length, EXH_STRESS_CARD_COUNT + 1);
      assert.equal(stored.works.length, EXH_STRESS_CARD_COUNT);
      const firstEdition = stored.editions.find((row) => String(row.gid) === '710000');
      const insertedEdition = stored.editions.find((row) => String(row.gid) === '799999');
      assert.ok(firstEdition && insertedEdition, 'batch persistence should keep both editions');
      assert.equal(
        insertedEdition.work_id,
        firstEdition.work_id,
        'incremental batch should reuse the matching work'
      );

      const preservedFields = {
        tags: ['female:seeded-tag'],
        language: 'zh',
        censor_tier: 'uncensored',
        pages: 777,
        size_bytes: 987654321,
        updated_at: 1,
      };
      await page.evaluate(
        async ({ id, fields }) => {
          await window.__patchExhEdition(id, fields);
          window.__excRefreshPage();
        },
        { id: firstEdition.id, fields: preservedFields }
      );
      await page.waitForFunction(
        async (id) => {
          const data = await window.__readExhStores(['editions']);
          const row = data.editions.find((edition) => edition.id === id);
          return !!(
            row &&
            row.updated_at > 1 &&
            row.tags.includes('female:seeded-tag') &&
            row.language === 'zh' &&
            row.censor_tier === 'uncensored' &&
            row.pages === 777 &&
            row.size_bytes === 987654321
          );
        },
        firstEdition.id,
        { timeout: 10000 }
      );
      await page.waitForFunction(
        () => {
          const cards = Array.from(document.querySelectorAll('[data-e2e-exh-card]'));
          return cards.every((card) => card.dataset.excEnhanced === '1') &&
            !!document.querySelector('.exc-fold-tag');
        },
        null,
        { timeout: 10000 }
      );
      await page.evaluate(() => {
        window.__exhStableFoldNode = document.querySelector('.exc-fold-tag');
      });
      await page.waitForTimeout(1000);
      assert.equal(
        await page.evaluate(() => document.querySelector('.exc-fold-tag') === window.__exhStableFoldNode),
        true,
        'list observer should ignore stable fold controls'
      );
      await page.evaluate(async (archiveCount) => {
        await window.__seedExhArchives(archiveCount);
        window.__resetExhListMetrics();
        window.__exhLargeLibraryRefreshStarted = performance.now();
        window.__excRefreshPage();
      }, EXH_LARGE_LIBRARY_ARCHIVE_COUNT);
      await page.waitForFunction(
        () => {
          const cards = Array.from(document.querySelectorAll('[data-e2e-exh-card]'));
          return cards.every(
            (card) =>
              card.dataset.excEnhanced === '1' &&
              !!card.querySelector('.exc-badge-container > .exc-meta-overlay')
          );
        },
        null,
        { timeout: MAX_EXH_LARGE_LIBRARY_REFRESH_MS }
      );
      await page.evaluate(() => new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      ));
      const largeLibrary = await page.evaluate(() => ({
        durationMs: performance.now() - window.__exhLargeLibraryRefreshStarted,
        transactions: structuredClone(window.__exhListMetrics.transactions),
        fuzzyBadge: !!document.querySelector(
          '[data-e2e-exh-card="710000"] .meta-tag.maybe'
        ),
      }));
      console.log('      ExH large library: ' + JSON.stringify(largeLibrary));
      assert.ok(
        largeLibrary.durationMs <= MAX_EXH_LARGE_LIBRARY_REFRESH_MS,
        `large ExH library refresh took ${Math.round(largeLibrary.durationMs)}ms`
      );
      assert.ok(
        largeLibrary.transactions.total <= MAX_EXH_STARTUP_TRANSACTIONS,
        `large ExH library refresh opened ${largeLibrary.transactions.total} transactions`
      );
      assert.ok(
        (largeLibrary.transactions.byStore.tracking_searches || 0) <= 1,
        'large ExH library refresh should use one tracking_searches transaction'
      );
      assert.equal(largeLibrary.fuzzyBadge, true, 'large library index should preserve fuzzy matches');

      await page.locator('#jlc-wb-fab').click();
      await waitWorkbenchOpen(page);
      await page.locator('#exc-wb-tracking-root #jlc-wb-list-scroll').waitFor();
      await page.evaluate(() => {
        window.__resetExhListMetrics();
        window.__exhWorkbenchMeasureStarted = performance.now();
      });
      await page.locator('#jlc-wb .jlc-wb-nav button[data-nav="works"]').click();
      await page.waitForFunction(
        () => document.querySelectorAll('#jlc-wb-works-scroll .jlc-wb-item').length === 200,
        null,
        { timeout: 10000 }
      );
      await page.waitForFunction(
        () => performance.now() - window.__exhListMetrics.lastTransactionAt > 250,
        null,
        { timeout: 5000 }
      );
      const libraryTab = await page.evaluate(() => ({
        durationMs: performance.now() - window.__exhWorkbenchMeasureStarted,
        transactions: structuredClone(window.__exhListMetrics.transactions),
      }));

      await page.evaluate(() => {
        window.__resetExhListMetrics();
        window.__exhWorkbenchMeasureStarted = performance.now();
      });
      await page.locator('#exc-work-chips [data-wtab="better"]').click();
      await page.waitForFunction(
        () => {
          const summary = document.getElementById('jlc-wb-footer-summary');
          const active = document.querySelector('#exc-work-chips [data-wtab="better"].is-on');
          return !!active && /作品$/.test(summary?.textContent || '');
        },
        null,
        { timeout: 15000 }
      );
      await page.waitForFunction(
        () => performance.now() - window.__exhListMetrics.lastTransactionAt > 250,
        null,
        { timeout: 5000 }
      );
      const betterTab = await page.evaluate(() => ({
        durationMs: performance.now() - window.__exhWorkbenchMeasureStarted,
        transactions: structuredClone(window.__exhListMetrics.transactions),
      }));
      console.log('      ExH LRR tab: ' + JSON.stringify(libraryTab));
      console.log('      ExH better tab: ' + JSON.stringify(betterTab));
      assert.ok(
        libraryTab.transactions.total <= MAX_EXH_LIBRARY_TAB_TRANSACTIONS,
        `ExH LRR tab opened ${libraryTab.transactions.total} transactions`
      );
      assert.ok(
        betterTab.transactions.total <= MAX_EXH_BETTER_TAB_TRANSACTIONS,
        `ExH better tab opened ${betterTab.transactions.total} transactions`
      );
      await page.locator('#jlc-wb-close-btn').click();
      await waitWorkbenchClosed(page);

      await page.evaluate(() => {
        const table = document.querySelector('table.itg');
        table.insertAdjacentHTML(
          'afterend',
          '<table class="itg"><tbody>'
            + '<tr data-e2e-exh-card="899999"><td class="glname">'
            + '<a href="/g/899999/cccccccccc/">'
            + '<div class="glink">Replacement Gallery</div></a>'
            + '</td></tr></tbody></table>'
        );
        table.remove();
      });
      await page.waitForFunction(
        () => document.querySelector('[data-e2e-exh-card="899999"]')?.dataset.excEnhanced === '1',
        null,
        { timeout: 10000 }
      );
      assert.ok(
        await page.locator('[data-e2e-exh-card="899999"] .exc-meta-overlay').count(),
        'list observer should enhance a replaced list root'
      );
    }
  );

  await runCase(
    'ExH tracking: quick filters coalesce and stale enrichment stops',
    {
      host: 'e-hentai.org',
      fixtureHtml: createExhStressFixture(1),
      scriptPath: PATHS.exhDist,
      beforeInject: async (page) => {
        await page.evaluate(installExhStorageMetrics);
      },
      beforeScript: async (page) => {
        await page.evaluate(() => {
          window.__exhGdataStats = { started: 0, completed: 0, pending: 0, batches: [] };
          window.GM_xmlhttpRequest = (options = {}) => {
            let batchSize = 0;
            try {
              const body = JSON.parse(options.data || '{}');
              if (body.method === 'gdata' && Array.isArray(body.gidlist)) {
                batchSize = body.gidlist.length;
              }
            } catch (_) { /* ignore */ }
            if (batchSize) {
              window.__exhGdataStats.started += 1;
              window.__exhGdataStats.pending += 1;
              window.__exhGdataStats.batches.push(batchSize);
            }
            setTimeout(() => {
              if (batchSize) {
                window.__exhGdataStats.completed += 1;
                window.__exhGdataStats.pending -= 1;
              }
              options.onload?.({
                status: 200,
                responseText: JSON.stringify({ gmetadata: [] }),
                finalUrl: options.url || '',
                responseHeaders: '',
              });
            }, batchSize > 1 ? 250 : 0);
          };
        });
      },
    },
    async (page) => {
      await waitFab(page);
      await page.evaluate(
        (count) => window.__seedExhTracking(count),
        EXH_TRACKING_RACE_COUNT
      );
      await page.locator('#jlc-wb-fab').click();
      await waitWorkbenchOpen(page);
      await page.waitForFunction(
        (count) => document.querySelectorAll('#jlc-wb-list-scroll [data-trk]').length === count
          && window.__exhGdataStats.started >= 2
          && window.__exhGdataStats.pending === 0,
        EXH_TRACKING_RACE_COUNT,
        { timeout: 10000 }
      );

      await page.evaluate(() => {
        window.__resetExhListMetrics();
        window.__exhGdataStats = { started: 0, completed: 0, pending: 0, batches: [] };
        const input = document.getElementById('exc-trk-q');
        ['R', 'Ra', 'Race', 'Needle'].forEach((query) => {
          input.value = query;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
      });
      await page.waitForFunction(
        () => {
          const rows = document.querySelectorAll('#jlc-wb-list-scroll [data-trk]');
          return rows.length === 1
            && /Needle/.test(rows[0].textContent || '')
            && window.__exhGdataStats.started >= 1
            && window.__exhGdataStats.pending === 0;
        },
        null,
        { timeout: 5000 }
      );
      await page.waitForFunction(
        () => performance.now() - window.__exhListMetrics.lastTransactionAt > 250,
        null,
        { timeout: 5000 }
      );
      const burst = await page.evaluate(() => ({
        transactions: structuredClone(window.__exhListMetrics.transactions),
        batches: window.__exhGdataStats.batches.slice(),
      }));
      console.log('      ExH tracking input burst: ' + JSON.stringify(burst));

      await page.evaluate(() => {
        window.__resetExhListMetrics();
        window.__exhGdataStats = { started: 0, completed: 0, pending: 0, batches: [] };
        const input = document.getElementById('exc-trk-q');
        input.value = 'Race Gallery';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForFunction(
        () => window.__exhGdataStats.started >= 1 && window.__exhGdataStats.pending >= 1,
        null,
        { timeout: 5000 }
      );
      await page.evaluate(() => {
        const input = document.getElementById('exc-trk-q');
        input.value = 'Needle';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForFunction(
        () => {
          const rows = document.querySelectorAll('#jlc-wb-list-scroll [data-trk]');
          return rows.length === 1 && /Needle/.test(rows[0].textContent || '');
        },
        null,
        { timeout: 5000 }
      );
      await page.waitForFunction(
        () => window.__exhGdataStats.started >= 2
          && window.__exhGdataStats.completed === window.__exhGdataStats.started
          && window.__exhGdataStats.pending === 0,
        null,
        { timeout: 10000 }
      );
      await page.evaluate(() => new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      ));

      const result = await page.evaluate(() => ({
        query: document.getElementById('exc-trk-q')?.value || '',
        rows: document.querySelectorAll('#jlc-wb-list-scroll [data-trk]').length,
        text: document.getElementById('jlc-wb-list-scroll')?.textContent || '',
        batches: window.__exhGdataStats.batches.slice(),
        transactions: structuredClone(window.__exhListMetrics.transactions),
      }));
      console.log('      ExH tracking stale filter: ' + JSON.stringify(result));
      assert.ok(
        burst.transactions.total <= MAX_EXH_TRACKING_BURST_TRANSACTIONS,
        `tracking input burst opened ${burst.transactions.total} transactions`
      );
      assert.ok(
        (burst.transactions.byStore.tracking_searches || 0) <= 1,
        'tracking input burst should read tracking_searches once'
      );
      assert.ok(
        (burst.transactions.byStore.editions || 0) <= 1,
        'tracking input burst should read editions once'
      );
      assert.deepEqual(burst.batches, [1], 'tracking input burst should enrich only the last query');
      assert.equal(result.query, 'Needle');
      assert.equal(
        result.rows,
        1,
        `stale broad filter replaced the latest result; batches=${result.batches.join(',')}`
      );
      assert.match(result.text, /Needle/);
      assert.deepEqual(result.batches, [25, 1], 'stale broad filter should stop before its next batch');
      assert.ok(
        result.transactions.total <= MAX_EXH_TRACKING_RACE_TRANSACTIONS,
        `tracking filter race opened ${result.transactions.total} transactions`
      );
      assert.ok(
        (result.transactions.byStore.tracking_searches || 0) <= 2,
        'tracking filter race should read tracking_searches at most twice'
      );
      assert.ok(
        (result.transactions.byStore.editions || 0) <= 2,
        'tracking filter race should batch edition reads'
      );

      await page.evaluate(async (count) => {
        await window.__seedExhTrackingEditions(count);
        window.__resetExhListMetrics();
        const input = document.getElementById('exc-trk-q');
        input.value = 'Race Gallery';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }, EXH_TRACKING_RACE_COUNT);
      await page.waitForFunction(
        (count) => document.querySelectorAll('#jlc-wb-list-scroll [data-trk]').length === count,
        EXH_TRACKING_RACE_COUNT,
        { timeout: 5000 }
      );
      await page.waitForFunction(
        () => performance.now() - window.__exhListMetrics.lastTransactionAt > 250,
        null,
        { timeout: 5000 }
      );
      const backfill = await page.evaluate(() => ({
        transactions: structuredClone(window.__exhListMetrics.transactions),
      }));
      const storedTracking = await page.evaluate(
        () => window.__readExhStores(['tracking_searches'])
      );
      console.log('      ExH tracking edition backfill: ' + JSON.stringify(backfill));
      assert.equal(
        storedTracking.tracking_searches.filter((row) => Number(row.top_posted_at) > 0).length,
        EXH_TRACKING_RACE_COUNT,
        'edition backfill should persist posted times for every tracking row'
      );
      assert.ok(
        backfill.transactions.total <= MAX_EXH_TRACKING_BACKFILL_TRANSACTIONS,
        `tracking edition backfill opened ${backfill.transactions.total} transactions`
      );
      assert.ok(
        (backfill.transactions.byStore.tracking_searches || 0) <= 2,
        'tracking edition backfill should batch tracking writes'
      );
      assert.ok(
        (backfill.transactions.byStore.editions || 0) <= 1,
        'tracking edition backfill should read editions once'
      );
    }
  );

  await runCase(
    'ExH detail: stable refresh keeps storage work bounded',
    {
      host: 'e-hentai.org',
      fixtureHtml: createExhDetailFixture(),
      scriptPath: PATHS.exhDist,
      beforeInject: async (page) => {
        await page.evaluate(installExhStorageMetrics);
        await page.evaluate(() => {
          history.replaceState(null, '', '/g/720000/abcdef1234/');
        });
      },
    },
    async (page) => {
      await page.locator('#exc-gallery-panel').waitFor({ timeout: 15000 });
      await page.waitForFunction(
        () => window.__exhListMetrics.transactions.total > 0
          && performance.now() - window.__exhListMetrics.lastTransactionAt > 300,
        null,
        { timeout: 10000 }
      );
      const startup = await page.evaluate(() => ({
        transactions: structuredClone(window.__exhListMetrics.transactions),
      }));

      await page.evaluate(
        ([archiveCount, relevantTitle]) => window.__seedExhArchives(archiveCount, relevantTitle),
        [EXH_LARGE_LIBRARY_ARCHIVE_COUNT, '[Detail Group] Detail Gallery']
      );
      await page.evaluate(() => {
        const panel = document.getElementById('exc-gallery-panel');
        window.__exhDetailPanelNode = panel?.firstElementChild || null;
        window.__resetExhListMetrics();
        window.__exhDetailRefreshStarted = performance.now();
        window.__excRefreshPage();
      });
      await page.waitForFunction(
        () => {
          const panel = document.getElementById('exc-gallery-panel');
          return window.__exhListMetrics.transactions.total > 0
            && panel?.firstElementChild !== window.__exhDetailPanelNode
            && performance.now() - window.__exhListMetrics.lastTransactionAt > 300;
        },
        null,
        { timeout: 15000 }
      );
      const refresh = await page.evaluate(() => ({
        durationMs: performance.now() - window.__exhDetailRefreshStarted,
        transactions: structuredClone(window.__exhListMetrics.transactions),
        panelVisible: document.getElementById('exc-gallery-panel')?.offsetParent !== null,
        fuzzyBadge: Array.from(
          document.querySelectorAll('#exc-gallery-panel .jlc-status-pill')
        ).some((element) => (element.textContent || '').includes('库内近似')),
      }));
      console.log('      ExH detail startup: ' + JSON.stringify(startup));
      console.log('      ExH detail refresh: ' + JSON.stringify(refresh));
      assert.equal(refresh.panelVisible, true, 'ExH detail panel should remain visible after refresh');
      assert.equal(refresh.fuzzyBadge, true, 'ExH detail refresh should preserve fuzzy archive matches');
      assert.ok(
        startup.transactions.total <= MAX_EXH_DETAIL_STARTUP_TRANSACTIONS,
        `ExH detail startup opened ${startup.transactions.total} transactions`
      );
      assert.ok(
        refresh.transactions.total <= MAX_EXH_DETAIL_REFRESH_TRANSACTIONS,
        `ExH detail refresh opened ${refresh.transactions.total} transactions`
      );
    }
  );

  await runCase(
    'JLC: open, switch library and filter, close',
    {
      host: 'www.javlibrary.com',
      fixtureFile: 'javlibrary-list.html',
      scriptPath: PATHS.jlcDist,
      needJquery: true,
      gmValues: { version: '20250311' },
      beforeInject: async (page) => {
        await page.evaluate(installJlcStorageMetrics);
      },
      beforeScript: async (page) => {
        await page.evaluate(() => window.__seedJlcLibrary({
          movies: 80,
          persons: 320,
          videos: 120,
        }));
        await page.evaluate(() => window.__resetJlcStorageMetrics());
      },
    },
    async (page) => {
      await waitJlcListDecorated(page);
      await page.waitForFunction(
        () => performance.now() - window.__jlcStorageMetrics.lastTransactionAt >= 50
      );
      const startupLibrary = await page.evaluate(() => ({
        transactions: structuredClone(window.__jlcStorageMetrics.transactions),
        renderedPersons: document.querySelectorAll('#jlc-wb-person-list .person-item').length,
      }));
      console.log('      JLC lazy library startup: ' + JSON.stringify(startupLibrary));
      assert.ok(
        startupLibrary.transactions.total <= MAX_JLC_STARTUP_TRANSACTIONS,
        'JLC startup opened too many IndexedDB transactions: '
          + startupLibrary.transactions.total
      );
      assert.equal(
        startupLibrary.renderedPersons,
        0,
        'JLC startup should not render the hidden library list'
      );
      assert.ok(
        (startupLibrary.transactions.byStore.emby_data || 0) <= 1,
        'JLC startup should share one Emby snapshot'
      );
      assert.ok(
        (startupLibrary.transactions.byStore.tracking_searches || 0) <= 1,
        'JLC startup should share one tracking snapshot'
      );
      assert.ok(
        (startupLibrary.transactions.byStore.videos || 0) <= 1,
        'JLC startup should not read the full video library for hidden UI'
      );
      await openAndCheckTitle(page, /JavLibrary|Creamu/i, 25000);
      await exerciseWorkbenchGeometry(page, {
        fab: 'jlcFabDragBound',
        panel: 'jlcPanelResizeBound',
        header: 'jlcPanelDragBound',
      });
      await assertWorkbenchRegionLayout(page, '#jlc-wb-tracking-root', 'JLC tracking');
      await openWorkbenchNav(page, 'library');
      await page.waitForFunction(
        () => document.querySelectorAll('#jlc-wb-person-list .person-item').length === 300
      );
      assert.deepEqual(
        await page.evaluate(() => ({
          movies: document.getElementById('jlc-wb-st-m')?.textContent || '',
          persons: document.getElementById('jlc-wb-st-p')?.textContent || '',
          videos: document.getElementById('jlc-wb-st-v')?.textContent || '',
        })),
        { movies: '80', persons: '320', videos: '120' }
      );
      await assertWorkbenchRegionLayout(page, '#jlc-wb-library-root', 'JLC library');
      await page.evaluate(() => {
        window.__jlcLibraryFirstPerson = document.querySelector(
          '#jlc-wb-person-list .person-item'
        );
        window.__resetJlcStorageMetrics();
      });
      await openWorkbenchNav(page, 'filter');
      await assertWorkbenchRegionLayout(page, '#jlc-wb-filter-root', 'JLC filter');
      await openWorkbenchNav(page, 'library');
      await page.waitForFunction(
        () => performance.now() - window.__jlcStorageMetrics.lastTransactionAt >= 50
      );
      const repeatedLibrary = await page.evaluate(() => ({
        transactions: structuredClone(window.__jlcStorageMetrics.transactions),
        reusedDom: document.querySelector('#jlc-wb-person-list .person-item')
          === window.__jlcLibraryFirstPerson,
      }));
      console.log('      JLC repeated library tab: ' + JSON.stringify(repeatedLibrary));
      assert.deepEqual(
        repeatedLibrary.transactions,
        { total: 0, byStore: {} },
        'unchanged JLC library tab should reuse its loaded data'
      );
      assert.equal(repeatedLibrary.reusedDom, true, 'unchanged JLC library tab should reuse its DOM');
      await page.evaluate(() => {
        document.querySelector('.jlc-tool-btn.j-l')?.click();
      });
      await page.locator('.jlc-tool-btn.j-l.active-like').waitFor();
      await page.evaluate(() => window.__resetJlcStorageMetrics());
      await openWorkbenchNav(page, 'filter');
      await openWorkbenchNav(page, 'library');
      await page.waitForFunction(
        () => document.getElementById('jlc-wb-st-v')?.textContent === '121'
      );
      const changedLibrary = await page.evaluate(() => ({
        transactions: structuredClone(window.__jlcStorageMetrics.transactions),
        reusedDom: document.querySelector('#jlc-wb-person-list .person-item')
          === window.__jlcLibraryFirstPerson,
      }));
      assert.deepEqual(
        changedLibrary.transactions,
        { total: 1, byStore: { videos: 1 } },
        'a video-only library change should reuse the Emby snapshot'
      );
      assert.equal(changedLibrary.reusedDom, false, 'changed JLC library data should refresh its DOM');
      await openWorkbenchNav(page, 'filter');

      await page.evaluate(() => window.__resetJlcStorageMetrics());
      await openWorkbenchSettingsTab(page, 'resource');
      await page.waitForFunction(
        () => performance.now() - window.__jlcStorageMetrics.lastTransactionAt >= 50
      );
      const settingsTransactions = await page.evaluate(
        () => structuredClone(window.__jlcStorageMetrics.transactions)
      );
      assert.deepEqual(
        settingsTransactions,
        { total: 0, byStore: {} },
        'opening JLC settings should not read IndexedDB stores'
      );
      await assertWorkbenchRegionLayout(
        page,
        '#jlc-wb .jlc-wb-settings-body',
        'JLC resource settings'
      );

      for (const tab of ['display', 'services', 'backup']) {
        await openWorkbenchSettingsTab(page, tab);
        await assertWorkbenchRegionLayout(
          page,
          '#jlc-wb .jlc-wb-settings-body',
          'JLC ' + tab + ' settings'
        );
      }
      await page.locator('#jlc-wb-settings-close').click();

      await page.locator('#jlc-wb-close-btn').click();
      await waitWorkbenchClosed(page, 25000);
    }
  );

  await runCase(
    'JLC tracking: reopen and local views avoid redundant storage work',
    {
      host: 'www.javlibrary.com',
      fixtureFile: 'javlibrary-list.html',
      scriptPath: PATHS.jlcDist,
      needJquery: true,
      gmValues: { version: '20250311' },
      beforeInject: async (page) => {
        await page.evaluate(installJlcStorageMetrics);
      },
      beforeScript: async (page) => {
        await page.evaluate(
          (count) => window.__seedJlcTracking(count),
          JLC_TRACKING_STRESS_COUNT
        );
        await page.evaluate(() => window.__resetJlcStorageMetrics());
      },
    },
    async (page) => {
      await waitJlcListDecorated(page);
      await openAndCheckTitle(page, /JavLibrary|Creamu/i, 25000);
      await page.waitForFunction(
        (count) => document.querySelectorAll('#jlc-wb-tracking-root .jlc-wb-item').length === count,
        JLC_TRACKING_STRESS_COUNT,
        { timeout: 10000 }
      );

      await page.evaluate(() => {
        window.__jlcTrackingToolbar = document.querySelector(
          '#jlc-wb-tracking-root .jlc-wb-toolbar'
        );
        window.__resetJlcStorageMetrics();
      });
      await page.locator('#jlc-wb-close-btn').click();
      await waitWorkbenchClosed(page);
      await page.locator('#jlc-wb-fab').click();
      await waitWorkbenchOpen(page);
      await page.waitForFunction(
        () => performance.now() - window.__jlcStorageMetrics.lastTransactionAt >= 50
      );
      const reopened = await page.evaluate(() => ({
        transactions: structuredClone(window.__jlcStorageMetrics.transactions),
        reusedDom: document.querySelector('#jlc-wb-tracking-root .jlc-wb-toolbar')
          === window.__jlcTrackingToolbar,
      }));
      console.log('      JLC tracking reopen: ' + JSON.stringify(reopened));
      assert.deepEqual(
        reopened.transactions,
        { total: 0, byStore: {} },
        'reopening unchanged JLC tracking should not reread IndexedDB'
      );
      assert.equal(reopened.reusedDom, true, 'reopening unchanged JLC tracking should reuse its DOM');

      await page.evaluate(() => {
        window.__jlcTrackingScroller = document.getElementById('jlc-wb-list-scroll');
        window.__resetJlcStorageMetrics();
      });
      await page.locator('#jlc-wb-tracking-query').fill('Needle');
      await page.waitForFunction(
        () => document.querySelectorAll('#jlc-wb-tracking-root .jlc-wb-item').length === 1
      );
      const filtered = await page.evaluate(() => ({
        transactions: structuredClone(window.__jlcStorageMetrics.transactions),
        rebuiltDom: document.getElementById('jlc-wb-list-scroll') !== window.__jlcTrackingScroller,
      }));
      assert.deepEqual(
        filtered.transactions,
        { total: 0, byStore: {} },
        'filtering loaded JLC tracking data should not reread IndexedDB'
      );
      assert.equal(filtered.rebuiltDom, true, 'a changed tracking filter should rebuild its view');

      await page.locator('#jlc-wb-tracking-query').fill('');
      await page.waitForFunction(
        (count) => document.querySelectorAll('#jlc-wb-tracking-root .jlc-wb-item').length === count,
        JLC_TRACKING_STRESS_COUNT
      );
      await page.evaluate(() => {
        window.__jlcTrackingScroller = document.getElementById('jlc-wb-list-scroll');
        window.__resetJlcStorageMetrics();
      });
      await page.locator('#jlc-wb-sort').selectOption('name');
      await page.waitForFunction(
        () => document.getElementById('jlc-wb-list-scroll') !== window.__jlcTrackingScroller
      );
      const sorted = await page.evaluate(
        () => structuredClone(window.__jlcStorageMetrics.transactions)
      );
      assert.deepEqual(
        sorted,
        { total: 0, byStore: {} },
        'sorting loaded JLC tracking data should not reread IndexedDB'
      );

      await page.locator('#jlc-wb-tracking-query').fill('Needle');
      await page.waitForFunction(
        () => document.querySelectorAll('#jlc-wb-tracking-root .jlc-wb-item').length === 1
      );
      await page.evaluate(() => window.__resetJlcStorageMetrics());
      await page.locator('[data-jlc-wb-more]').click();
      page.once('dialog', (dialog) => dialog.accept());
      await page.locator('[data-jlc-wb-delete]').click();
      await page.locator('#jlc-wb-list-scroll .jlc-wb-empty').waitFor();
      await page.waitForFunction(
        () => performance.now() - window.__jlcStorageMetrics.lastTransactionAt >= 50
      );
      const deleted = await page.evaluate(
        () => structuredClone(window.__jlcStorageMetrics.transactions)
      );
      assert.deepEqual(
        deleted,
        { total: 2, byStore: { tracking_searches: 2 } },
        'deleting JLC tracking data should write once and reload once'
      );
      await page.locator('#jlc-wb-close-btn').click();
      await waitWorkbenchClosed(page);
    }
  );

  await runCase(
    'JLC list: batch decoration and scan budget stay bounded',
    {
      host: 'www.javlibrary.com',
      fixtureHtml: createJlcStressFixture(120),
      scriptPath: PATHS.jlcDist,
      needJquery: true,
      gmValues: { version: '20250311' },
      beforeInject: async (page) => {
        await page.evaluate(installJlcStorageMetrics);
        await page.evaluate(() => {
          window.__creamuCommanderRescanIntervals = 0;
          const originalSetInterval = window.setInterval;
          window.setInterval = function (callback, delay, ...args) {
            if (delay === 700) window.__creamuCommanderRescanIntervals += 1;
            return originalSetInterval.call(this, callback, delay, ...args);
          };
        });
      },
    },
    async (page) => {
      await page.waitForFunction(
        (expected) => {
          const items = Array.from(document.querySelectorAll('#grid-b .item-b'));
          return items.length === expected && items.every(item => item.dataset.jlcBaseDone === '1');
        },
        120,
        { timeout: 25000 }
      );
      await page.waitForTimeout(2300);
      const transactionStats = await page.evaluate(
        () => structuredClone(window.__jlcStorageMetrics.transactions)
      );
      console.log('      IndexedDB transactions: ' + JSON.stringify(transactionStats));
      assert.ok(
        transactionStats.total <= MAX_JLC_STARTUP_TRANSACTIONS,
        '120-card startup opened too many IndexedDB transactions: ' + transactionStats.total
      );
      assert.ok(
        (transactionStats.byStore.tracking_searches || 0) <= MAX_STARTUP_TRACKING_TRANSACTIONS,
        'startup read tracking_searches too often: ' + (transactionStats.byStore.tracking_searches || 0)
      );
      const startupRescanIntervals = await page.evaluate(() => window.__creamuCommanderRescanIntervals);
      assert.equal(startupRescanIntervals, 0, 'a settled list should not start an empty rescan interval');

      await page.evaluate(() => {
        const source = document.querySelector('#grid-b .item-b');
        const appendClone = (avid, title) => {
          const item = source.cloneNode(true);
          item.className = 'item-b';
          Object.keys(item.dataset).forEach(key => delete item.dataset[key]);
          item.dataset.e2eCard = avid || 'late';
          item.querySelector('date[name="avid"]').textContent = avid;
          item.querySelector('a[name="av-title"]').setAttribute('title', title);
          document.getElementById('grid-b').append(item);
          return item;
        };
        appendClone('DYNAMIC-001', 'Dynamic item');
        const late = appendClone('', 'Late item');
        window.setTimeout(() => {
          late.querySelector('date[name="avid"]').textContent = 'LATE-001';
        }, 80);
      });
      await page.waitForFunction(() => {
        const dynamic = document.querySelector('[data-jlc-avid="DYNAMIC-001"]');
        const late = document.querySelector('[data-jlc-avid="LATE-001"]');
        return dynamic?.dataset.jlcBaseDone === '1' && late?.dataset.jlcBaseDone === '1';
      }, null, { timeout: 5000 });
    }
  );

  await runCase(
    'JLC tags: visible-first metadata stays concurrent and deterministic',
    {
      host: 'www.javlibrary.com',
      fixtureHtml: createJlcStressFixture(48),
      scriptPath: PATHS.jlcDist,
      needJquery: true,
      gmValues: {
        version: '20250311',
        jlc_config_stable: {
          version: 3,
          metatube_url: 'https://meta.test',
          fav_tags: ['Priority'],
          custom_persons: [],
          webdav_enabled: false,
        },
      },
      beforeInject: async (page) => {
        await page.evaluate(installJlcStorageMetrics);
      },
      beforeScript: async (page) => {
        await page.evaluate(async () => {
          await window.__seedJlcLibrary({ movieIds: ['TEST-001'] });
          window.__creamuMetaStats = {
            active: 0,
            maxActive: 0,
            requests: [],
            completed: [],
          };
          window.GM_xmlhttpRequest = function (options) {
            const request = options || {};
            const url = new URL(request.url);
            if (url.origin !== 'https://meta.test') {
              window.setTimeout(() => request.onload?.({
                status: 404,
                responseText: '',
                finalUrl: request.url || '',
                responseHeaders: '',
              }), 0);
              return;
            }
            const avid = String(url.searchParams.get('q') || '').toUpperCase();
            const stats = window.__creamuMetaStats;
            stats.active += 1;
            stats.maxActive = Math.max(stats.maxActive, stats.active);
            stats.requests.push(avid);
            const index = Number(avid.match(/(\d+)$/)?.[1] || 0);
            window.setTimeout(() => {
              stats.active -= 1;
              stats.completed.push(avid);
              request.onload?.({
                status: 200,
                responseText: JSON.stringify({
                  data: [{
                    number: avid,
                    genres: ['Priority', 'Genre ' + index],
                    release_date: '2026-07-' + String((index % 28) + 1).padStart(2, '0'),
                  }],
                }),
                finalUrl: request.url,
                responseHeaders: 'content-type: application/json',
              });
            }, 35 + (index % 4) * 15);
          };
          window.__resetJlcStorageMetrics();
        });
      },
    },
    async (page) => {
      await page.waitForFunction(() => (
        document.querySelectorAll('#grid-b .item-b[data-jlc-meta-state="done"]').length >= 12
      ), null, { timeout: 8000 });
      const firstWave = await page.evaluate(() => ({
        requests: window.__creamuMetaStats.requests.slice(),
        completed: window.__creamuMetaStats.completed.slice(),
      }));
      assert.ok(
        firstWave.requests.length <= MAX_INITIAL_META_REQUESTS,
        'initial metadata sweep should stay bounded: ' + firstWave.requests.join(', ')
      );
      assert.ok(
        firstWave.requests.slice(0, 12).every((avid, index) => avid === 'TEST-' + String(index + 1).padStart(3, '0')),
        'initial metadata requests should follow visible list order'
      );

      for (let step = 0; step <= 6; step += 1) {
        await page.evaluate((fraction) => {
          const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
          window.scrollTo(0, maxScroll * fraction);
        }, step / 6);
        await page.waitForTimeout(180);
      }
      await page.waitForFunction(() => (
        document.querySelectorAll('#grid-b .item-b[data-jlc-meta-state="done"]').length === 48
      ), null, { timeout: 15000 });
      await page.waitForTimeout(300);
      const stats = await page.evaluate(async () => {
        const storage = structuredClone(window.__jlcStorageMetrics.transactions);
        const cachedRows = await window.__readJlcStore('meta_cache');
        return {
          ...window.__creamuMetaStats,
          storage,
          cachedAvids: cachedRows.map(row => row.avid),
        };
      });
      console.log(
        '      MetaTube requests: ' + stats.requests.length
        + ', max concurrency: ' + stats.maxActive
        + ', storage: ' + JSON.stringify(stats.storage)
      );
      assert.ok(stats.maxActive <= 8, 'metadata concurrency exceeded the configured limit');
      assert.equal(stats.requests.length, 48, 'each card should issue one metadata request');
      assert.equal(new Set(stats.requests).size, 48, 'metadata requests should not repeat an avid');
      assert.ok(
        (stats.storage.byStore.meta_cache || 0) <= MAX_META_CACHE_TRANSACTIONS,
        'metadata enrichment should batch cache reads and writes: '
          + JSON.stringify(stats.storage)
      );
      assert.equal(stats.cachedAvids.length, 48, 'every metadata result should reach the cache');
      assert.equal(new Set(stats.cachedAvids).size, 48, 'metadata cache rows should stay unique by avid');
      assert.equal(
        await page.locator('#grid-b .item-b .meta-tag.hot').count(),
        48,
        'every card should render its matching hot tag'
      );
      assert.equal(
        await page.locator('[data-jlc-avid="TEST-001"]').evaluate(item => item.classList.contains('emby-item')),
        true,
        'the startup Emby snapshot should decorate matching cards'
      );
    }
  );

  await runCase(
    'JLC mobile: workbench stays inside the viewport',
    {
      host: 'www.javlibrary.com',
      fixtureFile: 'javlibrary-list.html',
      scriptPath: PATHS.jlcDist,
      needJquery: true,
      gmValues: { version: '20250311' },
      viewport: { width: 390, height: 844 },
    },
    async (page) => {
      await waitJlcListDecorated(page);
      await openAndCheckTitle(page, /JavLibrary|Creamu/i, 25000);
      const box = await page.locator('#jlc-wb').boundingBox();
      assert.ok(box, 'workbench should have a layout box');
      assert.ok(box.x >= -1, 'workbench should not start outside the left edge');
      assert.ok(box.x + box.width <= 391, 'workbench should fit the mobile viewport');
      await assertWorkbenchRegionLayout(page, '#jlc-wb-tracking-root', 'JLC mobile tracking');
      await openWorkbenchNav(page, 'library');
      await assertWorkbenchRegionLayout(page, '#jlc-wb-library-root', 'JLC mobile library');
      await openWorkbenchNav(page, 'filter');
      await assertWorkbenchRegionLayout(page, '#jlc-wb-filter-root', 'JLC mobile filter');
      for (const tab of ['resource', 'display', 'services', 'backup']) {
        await openWorkbenchSettingsTab(page, tab);
        await assertWorkbenchRegionLayout(
          page,
          '#jlc-wb .jlc-wb-settings-body',
          'JLC mobile ' + tab + ' settings'
        );
      }
      await page.locator('#jlc-wb-settings-close').click();
      await page.locator('#jlc-wb-close-btn').click();
      await waitWorkbenchClosed(page, 25000);
    }
  );
} catch (error) {
  failed += 1;
  process.exitCode = 1;
  console.error('  FAIL  browser setup');
  console.error('       ', error?.message || error);
} finally {
  await browser?.close();
}

if (!failed) {
  console.log('All workbench E2E passed (' + passed + ')');
} else {
  console.error('Workbench E2E failed: ' + failed + ' / ' + (passed + failed));
}
