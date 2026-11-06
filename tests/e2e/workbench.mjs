import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  PATHS,
  assertNoRuntimeErrors,
  gmMockSource,
  openScriptPage,
  stripUserscriptMeta,
  waitFab,
  waitWorkbenchClosed,
  waitWorkbenchOpen,
} from './helpers.mjs';

let passed = 0;
let failed = 0;
const CASE_FILTER = String(process.env.CREAMU_E2E_FILTER || '').trim().toLowerCase();
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
    nativeInput: 'rgb(231, 230, 223)',
    text: 'rgb(53, 60, 54)', scheme: 'light', panel: 'rgb(239, 238, 233)',
  },
  {
    host: 'www.xnxx.com',
    className: 'creamu-site-xnxx',
    accent: 'rgb(46, 112, 229)',
    dark: 'rgb(26, 63, 150)',
    nativeInput: 'rgb(24, 30, 42)',
    text: 'rgb(232, 234, 239)', scheme: 'dark', panel: 'rgb(22, 28, 40)',
  },
  {
    host: 'www.eporner.com',
    className: 'creamu-site-eporner',
    accent: 'rgb(46, 168, 84)',
    dark: 'rgb(24, 107, 52)',
    nativeInput: 'rgb(22, 30, 24)',
    text: 'rgb(232, 234, 239)', scheme: 'dark', panel: 'rgb(20, 28, 22)',
  },
];

function scoutBrowseFixture(site) {
  const ep = site === 'eporner';
  const cover = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#596b61"/><circle cx="460" cy="110" r="50" fill="#c1b189"/><path d="M0 330 230 110 410 330 520 220 640 360H0" fill="#243e34"/><text x="28" y="322" fill="#eee9db" font-family="sans-serif" font-size="24">DOCUMENTARY / SAMPLE</text></svg>');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Scout browse fixture</title><style>
    *{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}
    header{position:sticky;top:0;z-index:1000000;padding:22px 20px;border-bottom:1px solid #8884}header strong{font-size:24px}
    #content{padding:12px}.mozaique,#vidresults{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px}
    .thumb-block,.mb{min-width:0}.thumb,.mbimg{position:relative}.thumb img,.mbimg img{width:100%;display:block}
    .thumb-under{padding:10px}.title,.mbtit{margin:0 0 8px}.title a,.mbtit a{font-size:15px;text-decoration:none}
    .uploader{font-size:12px}a{color:inherit}.pagination{margin:20px}.pagination a{padding:12px}
    @media(max-width:820px){header{padding:12px}.mozaique,#vidresults{grid-template-columns:1fr}}
    </style></head><body><header><strong>${site.toUpperCase()}</strong>　Documentary</header><main id="content"><div ${ep ? 'id="vidresults"' : 'class="mozaique"'}>${Array.from({length:12},(_,i)=>{
      const id = 'alpha'+String(i+1).padStart(3,'0');
      const href = site === 'xvideos' ? '/video.'+id+'/documentary' : site === 'xnxx' ? '/video-'+id+'/documentary' : '/video-'+id+'/documentary/';
      return `<article id="video_${id}" data-id="${id}" class="${ep ? 'mb' : 'thumb-block'}"><div class="${ep ? 'mbimg' : 'thumb'}"><a class="cover-link" href="${href}"><img src="${cover}" alt="Documentary sample"></a></div><div class="thumb-under"><p class="${ep ? 'mbtit' : 'title'}"><a href="${href}" title="Documentary ${i+1}">Documentary ${i+1} · City walk</a></p><div class="uploader"><a href="/profiles/studio"><span class="name">Studio North</span></a></div></div></article>`;
    }).join('')}</div><div class="pagination"><a href="?k=documentary&p=1">2</a></div></main></body></html>`;
}
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

function createJlcDetailFixture() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>ABP-001 - JavLibrary</title>'
    + '<style>#jlc-detail-spacer{height:1800px}</style></head><body>'
    + '<div id="jlc-detail-spacer"></div>'
    + '<div id="video_title"><h3><a href="/cn/?v=abp001">Resource detail fixture</a></h3></div>'
    + '<table id="video_info"><tbody>'
    + '<tr id="video_id"><td>ID</td><td class="text">ABP-001</td></tr>'
    + '<tr id="video_date"><td>发行日期</td><td class="text">2026-07-28</td></tr>'
    + '</tbody></table>'
    + '<div id="video_favorite_edit"><a href="magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567">Fixture magnet</a></div>'
    + '</body></html>';
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
  if (CASE_FILTER && !String(name).toLowerCase().includes(CASE_FILTER)) return;
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
    console.error('       ', error?.stack || error?.message || error);
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
        accent: activeNav.borderBottomColor,
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

  assert.ok(style.bodyClasses.includes(expected.className), 'expected Scout site class');
  assert.equal(style.accent, expected.accent, 'active tab has a visible site-colored underline');
  assert.notEqual(style.activeNav[1], style.idleNav[1], 'active tab is distinguishable');
  assert.deepEqual(style.primary, [expected.accent, 'rgb(255, 255, 255)']);
  assert.deepEqual(style.input, [expected.panel, expected.text, expected.scheme]);
  assert.deepEqual(style.nativeInput, [expected.nativeInput, expected.text, expected.scheme]);
  assert.equal(style.ghost[1], expected.text, 'secondary actions use readable site text');
  assert.equal(style.stat[0], expected.panel, 'statistics share the panel surface');
}

async function openScoutTab(page, tab) {
  if (['lexicon', 'publishers', 'blocks'].includes(tab) && !await page.locator('.scout-secondary-nav').isVisible()) {
    await page.locator('#scout-wb-more-btn').click();
  }
  await page.locator(`#jlc-wb .jlc-wb-nav button[data-tab="${tab}"]`).click();
  await page.locator(`[data-jlc-wb-page="${tab}"]:not([hidden])`).waitFor();
}

async function captureScoutUi(page, name) {
  if (!process.env.CREAMU_SCREENSHOT_DIR) return;
  fs.mkdirSync(process.env.CREAMU_SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(process.env.CREAMU_SCREENSHOT_DIR, name + '.png') });
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
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
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
      // Playwright screenshots temporarily hide input carets and may leave style="".
      inlineStyles: Array.from(target.querySelectorAll('[style]')).filter(el => el.style.length).length,
      inlineDetails: Array.from(target.querySelectorAll('[style]')).filter(el => el.style.length).map(el => [el.tagName, el.className, el.getAttribute('style')]),
      horizontalOverflow: target.scrollWidth - target.clientWidth,
      insidePanel:
        targetRect.left >= panelRect.left - 1 &&
        targetRect.right <= panelRect.right + 1,
      controlsInsidePanel: controls.every(
        (rect) => rect.left >= panelRect.left - 1 && rect.right <= panelRect.right + 1
      ),
    };
  }, tab);
  assert.equal(metrics.inlineStyles, 0, tab + ' should not render static inline styles: ' + JSON.stringify(metrics.inlineDetails));
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

async function exerciseJlcCoverDownloadDialog(page, label) {
  await page.locator('[data-jlc-wb-action="downloadPanel"]').click();
  await page.locator('#jlc-cover-download-dialog:not([hidden])').waitFor();
  assert.deepEqual(
    await page.evaluate(() => ({
      parent: document.getElementById('jlc-cover-download-dialog')?.parentElement?.id || '',
      libraryLoaded: typeof globalThis.JSZip === 'function',
    })),
    { parent: 'jlc-wb', libraryLoaded: false },
    'opening the cover dialog should stay inside the workbench and defer JSZip'
  );
  await assertWorkbenchRegionLayout(page, '#jlc-cover-download-dialog', label);
  await page.locator('#jlc-cover-download-dialog button[name="close"]').click();
  await page.waitForFunction(
    () => document.getElementById('jlc-cover-download-dialog')?.hidden === true
  );
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
      assert.equal(await page.locator('#jlc-wb').evaluate(el => el.classList.contains('is-docked')), true);
      await page.locator('#scout-wb-layout-btn').click();
      await exerciseWorkbenchGeometry(page, {
        fab: 'scoutDragBound',
        panel: 'scoutPanelResizeBound',
        header: 'scoutHeaderDragBound',
      });
      await openScoutTab(page, 'lexicon');
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
        comboChildren: document.querySelector('[data-jlc-wb-page="combo"]')?.childElementCount || 0,
        draftReads: window.__testWorkbenchGmReads.creamu_scout_search_draft || 0,
        comboTokenReads: window.__testWorkbenchGmReads.scout_combo_tokens || 0,
        lexiconTypeReads: window.__testWorkbenchGmReads.creamu_scout_lexicon_types || 0,
      }));
      assert.deepEqual(startup, {
        comboChildren: 0,
        draftReads: 0,
        comboTokenReads: 0,
        lexiconTypeReads: 0,
      });

      await page.evaluate(() => window.__testResetWorkbenchGmReads());
      await page.locator('#scout-search-track-toggle').click();
      await page.locator('#scout-search-track-toggle', { hasText: '已追更' }).waitFor();
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
      assert.equal(firstOpen.scout_combo_tokens, 2, 'context initialization and initial render each read the legacy draft');
      assert.ok(firstOpen.creamu_scout_search_draft <= 3, 'first open seeds the current context and renders once');
      assert.equal(firstOpen.creamu_scout_lexicon_terms, 1);
      assert.equal(firstOpen.creamu_scout_lexicon_types, 1);

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
          'creamu_scout_search_draft',
          'creamu_scout_search_relations',
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
      assert.deepEqual(stableCombo, { preserved: true, reads: 1 }, 'stable navigation only reads the layout preference');

      await page.evaluate(() => window.__testResetWorkbenchGmReads());
      await openScoutTab(page, 'lexicon');
      const stableLexicon = await page.evaluate(() => ({
        preserved: document.querySelector('[data-jlc-wb-page="lexicon"]')?.firstElementChild
          === window.__testLexiconPageRoot,
        reads: Object.values(window.__testWorkbenchGmReads).reduce((total, count) => total + count, 0),
      }));
      assert.deepEqual(stableLexicon, { preserved: true, reads: 1 }, 'stable navigation only reads the layout preference');

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
      await page.locator('.scout-search-condition', { hasText: 'portrait' }).waitFor();
      const batchIo = await page.evaluate(() => ({
        legacyReads: window.__testWorkbenchGmReads.scout_combo_tokens || 0,
        legacyWrites: window.__testWorkbenchGmWrites.scout_combo_tokens || 0,
        draftReads: window.__testWorkbenchGmReads.creamu_scout_search_draft || 0,
        draftWrites: window.__testWorkbenchGmWrites.creamu_scout_search_draft || 0,
      }));
      assert.deepEqual(batchIo, {
        legacyReads: 0,
        legacyWrites: 1,
        draftReads: 1,
        draftWrites: 1,
      });

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
        await page.locator('.scout-search-condition-text').allTextContents(),
        ['documentary', 'city walk']
      );
      assert.deepEqual(
        await page.locator('.scout-search-condition-role').evaluateAll(
          (elements) => elements.map((element) => element.value)
        ),
        ['required', 'required']
      );
      assert.equal(await page.locator('.scout-search-plan-site').count(), 3);

      await page.locator('#scout-combo-free-input').fill('night');
      await page.locator('#scout-combo-add-btn').click();
      await page.locator('.scout-search-condition', { hasText: 'night' }).waitFor();
      const cityCondition = page.locator('.scout-search-condition', { hasText: 'city walk' });
      await cityCondition.locator('.scout-search-condition-remove').click();
      assert.equal(await page.locator('.scout-search-condition', { hasText: 'city walk' }).count(), 0);

      await page.locator('[data-search-target="preference"]').click();
      await page.locator('#scout-search-advanced > summary').click();
      await page.locator('#scout-search-show-priority').check();
      await page.locator('[data-search-priority="2"]').click();
      await page.locator('#scout-combo-free-input').fill('portrait');
      await page.locator('#scout-combo-add-btn').click();
      const portraitCondition = page.locator('.scout-search-condition', { hasText: 'portrait' });
      await portraitCondition.waitFor();
      assert.equal(await portraitCondition.locator('.scout-search-condition-role').inputValue(), 'preference');
      assert.equal(await portraitCondition.locator('.scout-search-condition-priority').inputValue(), '2');
      assert.equal(await page.locator('.scout-search-site-row input:checked').count(), 3);
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
    'Scout search: compares site totals and bounded exact-match samples',
    {
      host: 'www.xvideos.com',
      fixtureFile: 'xvideos-list.html',
      scriptPath: PATHS.scoutDist,
      viewport: { width: 390, height: 844 },
      gmValues: {
        creamu_scout_config: SCOUT_WORKBENCH_FIXTURE_DATA.creamu_scout_config,
        creamu_scout_lexicon_types: SCOUT_WORKBENCH_FIXTURE_DATA.creamu_scout_lexicon_types,
        creamu_scout_lexicon_terms: SCOUT_WORKBENCH_FIXTURE_DATA.creamu_scout_lexicon_terms,
        creamu_scout_tracks: [],
        creamu_scout_search_draft: {
          id: 'recipe-documentary-night',
          label: 'Documentary night',
          sites: ['xvideos', 'xnxx', 'eporner'],
          conditions: [
            { id: 'condition-documentary', term_id: 'term-documentary', text: 'documentary', role: 'required' },
            { id: 'condition-night', term_id: 'term-night', text: 'night', role: 'preference', priority: 1 },
            { id: 'condition-spoiler', text: 'spoiler', role: 'excluded' },
          ],
        },
      },
      beforeScript: (page) => page.evaluate(() => {
        const pixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
        window.__scoutSearchStats = { search: 0, detail: 0, urls: [] };
        const siteFromHost = (hostname) => {
          if (hostname.includes('xnxx')) return 'xnxx';
          if (hostname.includes('eporner')) return 'eporner';
          return 'xvideos';
        };
        const videoPath = (site, index) => {
          const id = (site === 'xvideos' ? 'xv' : site === 'xnxx' ? 'xn' : 'ep')
            + String(index).padStart(3, '0');
          return site === 'xvideos'
            ? `/video.${id}/documentary-${index}`
            : `/video-${id}/documentary-${index}`;
        };
        const listTitle = (index) => index === 4
          ? `Documentary Mystery ${index}`
          : `Documentary Night ${index}`;
        const listHtml = (site, url) => {
          const query = decodeURIComponent(url.href).replace(/[+-]/g, ' ').toLowerCase();
          const hasDocumentary = query.includes('documentary');
          const hasNight = query.includes('night');
          const profile = hasDocumentary && hasNight
            ? 'strict'
            : hasDocumentary ? 'documentary' : 'night';
          const totals = {
            strict: { xvideos: 120, xnxxPages: 5, eporner: 80 },
            documentary: { xvideos: 360, xnxxPages: 10, eporner: 240 },
            night: { xvideos: 900, xnxxPages: 15, eporner: 640 },
          }[profile];
          const cards = Array.from({ length: 4 }, (_, offset) => {
            const index = offset + 1;
            const path = videoPath(site, index);
            const title = listTitle(index);
            if (site === 'eporner') {
              return `<div class="mb" data-id="${index}">`
                + `<a href="${path}"><img src="${pixel}" alt="${title}"></a>`
                + `<p class="mbtit"><a href="${path}" title="${title}">${title}</a></p>`
                + `<span class="mb-uploader"><a href="/profile/studio-${index}">Studio ${index}</a></span>`
                + '</div>';
            }
            return `<div class="thumb-block" id="video_${site}_${index}">`
              + `<a href="${path}"><img src="${pixel}" alt="${title}"></a>`
              + `<div class="thumb-under"><p class="title"><a href="${path}" title="${title}">${title}</a></p>`
              + `<div class="uploader"><a href="/profiles/studio-${index}"><span class="name">Studio ${index}</span></a></div></div>`
              + '</div>';
          }).join('');
          if (site === 'eporner') {
            return '<!doctype html><html><head>'
              + `<meta name="description" content="We have ${totals.eporner} videos with this query.">`
              + `</head><body><div id="vidresults">${cards}</div></body></html>`;
          }
          if (site === 'xnxx') {
            return '<!doctype html><html><head>'
              + '<meta name="description" content="XNXX.COM query videos">'
              + '</head><body><div class="mozaique">' + cards + '</div>'
              + `<div class="pagination"><a class="last-page" href="/search/query/${totals.xnxxPages}" title="Page ${totals.xnxxPages}">${totals.xnxxPages}</a></div>`
              + '</body></html>';
          }
          return '<!doctype html><html><head>'
            + `<meta name="description" content="${totals.xvideos} query FREE videos found for this search.">`
            + `</head><body><div class="mozaique">${cards}</div></body></html>`;
        };
        const detailHtml = (site, url) => {
          const index = Number(url.pathname.match(/(\d+)/)?.[1] || 1);
          const title = listTitle(index);
          const tags = index === 4
            ? ['documentary', 'spoiler']
            : ['documentary', 'night', 'city walk'];
          if (site === 'eporner') {
            return '<!doctype html><html><head>'
              + `<meta property="og:image" content="${pixel}"></head><body>`
              + `<h1>${title}</h1><div id="video-tags">`
              + tags.map((tag) => `<a href="/tag/${tag}/">${tag}</a>`).join('')
              + `</div><a href="/profile/studio-${index}">Studio ${index}</a></body></html>`;
          }
          return '<!doctype html><html><head>'
            + `<meta property="og:image" content="${pixel}"></head><body>`
            + `<h2 class="page-title">${title}</h2><div class="video-tags">`
            + tags.map((tag) => `<a class="is-keyword" href="/tags/${tag}">${tag}</a>`).join('')
            + `</div><a class="uploader-tag" href="/profiles/studio-${index}">Studio ${index}</a></body></html>`;
        };
        window.GM_xmlhttpRequest = (options) => {
          const request = options || {};
          const url = new URL(request.url);
          const site = siteFromHost(url.hostname);
          const detail = /^\/video[.-]/i.test(url.pathname);
          window.__scoutSearchStats[detail ? 'detail' : 'search'] += 1;
          window.__scoutSearchStats.urls.push(request.url);
          const body = detail ? detailHtml(site, url) : listHtml(site, url);
          const delay = detail ? 20 : ({ xvideos: 35, xnxx: 20, eporner: 10 }[site] || 10);
          setTimeout(() => request.onload?.({
            status: 200,
            responseText: body,
            finalUrl: request.url,
            responseHeaders: 'content-type: text/html',
          }), delay);
        };
      }),
    },
    async (page) => {
      await openAndCheckTitle(page, /Scout/i);
      await openScoutTab(page, 'combo');
      await page.locator('#scout-combo-compare-btn').click();
      await page.waitForFunction(() => (
        document.querySelectorAll('.scout-search-assessment-site').length === 3 &&
        document.getElementById('scout-search-result-status')?.textContent.startsWith('完成')
      ), null, { timeout: 10000 });

      const requestStats = await page.evaluate(() => window.__scoutSearchStats);
      assert.equal(requestStats.search, 9);
      assert.equal(requestStats.detail, 12);
      assert.equal(await page.locator('.scout-search-result').count(), 0);
      assert.equal(await page.locator('.scout-search-assessment-variant').count(), 6);

      const xvideosAssessment = page.locator('[data-assessment-site="xvideos"]');
      const xnxxAssessment = page.locator('[data-assessment-site="xnxx"]');
      const epornerAssessment = page.locator('[data-assessment-site="eporner"]');
      assert.match(await xvideosAssessment.textContent() || '', /120/);
      assert.match(await xvideosAssessment.textContent() || '', /3\/4/);
      assert.match(await xvideosAssessment.textContent() || '', /75%/);
      assert.match(await xnxxAssessment.textContent() || '', /约\s*20/);
      assert.match(await epornerAssessment.textContent() || '', /80/);
      const conditionStats = await xvideosAssessment.locator('.scout-search-condition-stat').allTextContents();
      assert.ok(conditionStats.some((text) => /documentary\s*4\/4/i.test(text)));
      assert.ok(conditionStats.some((text) => /night\s*3\/4/i.test(text)));
      assert.ok(conditionStats.some((text) => /spoiler\s*1\/4/i.test(text)));
      assert.equal(await page.locator('.scout-search-related-add').count() > 0, true);
      assert.equal(await page.locator('.scout-search-exact-open').count(), 3);
      const exactHref = await xvideosAssessment
        .locator('.scout-search-exact-open')
        .getAttribute('href');
      assert.ok(exactHref && new URL(exactHref).hash.startsWith('#creamu-exact='));

      await page.evaluate((href) => {
        const pixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
        const cards = Array.from({ length: 4 }, (_, offset) => {
          const index = offset + 1;
          const id = 'xv' + String(index).padStart(3, '0');
          const path = `/video.${id}/documentary-${index}`;
          const title = index === 4
            ? `Documentary Mystery ${index}`
            : `Documentary Night ${index}`;
          return `<div class="thumb-block" id="video_exact_${index}">`
            + `<a href="${path}"><img src="${pixel}" alt="${title}"></a>`
            + `<div class="thumb-under"><p class="title"><a href="${path}" title="${title}">${title}</a></p>`
            + `<div class="uploader"><a href="/profiles/studio-${index}"><span class="name">Studio ${index}</span></a></div></div>`
            + '</div>';
        }).join('');
        document.querySelector('.mozaique').innerHTML = cards;
        document.querySelector('.mozaique').insertAdjacentHTML(
          'afterend',
          '<div class="pagination"><a href="/?k=documentary+and+night&p=1">2</a></div>'
        );
        history.replaceState(null, '', href);
      }, exactHref);
      await page.waitForFunction(() => {
        const bar = document.getElementById('scout-exact-filter-bar');
        return bar && !bar.textContent.includes('核验中');
      }, null, { timeout: 10000 });
      assert.equal(await page.locator('.thumb-block.scout-exact-filter-match').count(), 3);
      assert.equal(await page.locator('.thumb-block.scout-exact-filter-hidden').count(), 1);
      assert.match(await page.locator('#scout-exact-filter-bar').textContent() || '', /保留 3\/4/);
      const exactFilterLayout = await page.evaluate(() => {
        const bar = document.getElementById('scout-exact-filter-bar').getBoundingClientRect();
        const first = Array.from(document.querySelectorAll('.thumb-block'))
          .find((card) => getComputedStyle(card).display !== 'none')
          .getBoundingClientRect();
        return {
          withinViewport: bar.left >= 0 && bar.right <= innerWidth,
          overlapsFirstCard: bar.bottom > first.top,
          hasHorizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.deepEqual(exactFilterLayout, {
        withinViewport: true,
        overlapsFirstCard: false,
        hasHorizontalOverflow: false,
      });
      assert.match(
        await page.locator('.pagination a').getAttribute('href') || '',
        /#creamu-exact=/
      );
      assert.equal((await page.evaluate(() => window.__scoutSearchStats)).detail, 12);

      await page.locator('#scout-wb-close-btn').click();
      await page.locator('#scout-search-track-toggle').click();
      const temporaryModeTrack = await page.evaluate(() => (
        GM_getValue('creamu_scout_tracks', [])[0]
      ));
      assert.ok(temporaryModeTrack);
      assert.doesNotMatch(temporaryModeTrack.url, /#creamu-exact=/);
      await page.evaluate(() => GM_setValue('creamu_scout_tracks', []));

      await page.locator('[data-scout-exact-action="show-all"]').click();
      await page.waitForFunction(() => !document.getElementById('scout-exact-filter-bar'));
      assert.equal(await page.locator('.thumb-block.scout-exact-filter-hidden').count(), 0);
      assert.equal(await page.locator('.thumb-block').count(), 4);
      assert.doesNotMatch(
        await page.locator('.pagination a').getAttribute('href') || '',
        /#creamu-exact=/
      );
      await page.locator('#jlc-wb-fab').click();
      await assertScoutPageLayout(page, 'combo');

      await page.locator('#scout-save-current-search-btn').click();
      await page.locator('#scout-search-label').fill('Documentary night sources');
      await page.locator('#scout-search-save-confirm').click();
      const savedTracks = await page.evaluate(() => GM_getValue('creamu_scout_tracks', []));
      assert.equal(savedTracks.length, 3);
      assert.ok(savedTracks.every((track) => track.recipe_id === 'recipe-documentary-night'));
      assert.ok(savedTracks.every((track) => track.probe_queries.length === 1));

      await xvideosAssessment
        .locator('[data-search-remove-condition="condition-night"]')
        .click();
      assert.equal(
        await page.locator('[data-condition-id="condition-night"]').count(),
        0
      );
      await assertScoutPageLayout(page, 'combo');
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
      const mobileControls = await page.locator('#jlc-wb .jlc-wb-header-actions button:visible, .scout-search-role-switch button:visible, .scout-combo-dock-actions button:visible').evaluateAll(nodes =>
        nodes.map(el => ({ id: el.id, icon: el.classList.contains('jlc-wb-icon-btn'), width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }))
      );
      assert.ok(mobileControls.length >= 8);
      for (const control of mobileControls) {
        assert.ok(control.height >= 30 && control.height <= 40, 'mobile controls stay compact: ' + JSON.stringify(control));
        if (control.icon) assert.equal(control.width, control.height, 'header icons stay square');
      }
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
        const nativeRequest = window.GM_xmlhttpRequest;
        window.__scoutOpenedUrls = [];
        window.__scoutRequests = [];
        window.GM_openInTab = url => window.__scoutOpenedUrls.push(url);
        window.GM_xmlhttpRequest = options => { window.__scoutRequests.push(options.url); return nativeRequest(options); };
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
      assert.equal(await page.locator('.video-tags-list a button, .scout-tag-addon').count(), 0);
      await page.locator('#scout-tags-manage').waitFor();
      await assertNoInlinePresentation(
        page,
        '#scout-work-fav-bar, #scout-tags-manage, .scout-pub-addon',
        'detail enhancements'
      );

      assert.equal(await page.locator('.video-tags-list a.is-keyword').first().getAttribute('href'), '/tags/documentary');
      assert.ok(await page.locator('#scout-tags-manage').evaluate(el => {
        const height = el.getBoundingClientRect().height;
        return height >= 32 && height <= 36;
      }), 'detail actions stay compact');

      const lifecycleResult = await page.evaluate(() => {
        const callback = window.__testEightSecondIntervals?.[0];
        const favoriteButton = document.getElementById('scout-work-fav-btn');
        const publisherAddon = document.querySelector('.scout-pub-addon');
        const tagAddon = document.querySelector('#scout-tags-manage');
        window.__testDetailGmReads = 0;
        callback?.();
        const stableReads = window.__testDetailGmReads;
        const stableNodesPreserved =
          document.getElementById('scout-work-fav-btn') === favoriteButton &&
          document.querySelector('.scout-pub-addon') === publisherAddon &&
          document.querySelector('#scout-tags-manage') === tagAddon;

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
      await page.locator('#scout-tags-manage').click();
      await page.locator('#scout-collect-dialog').waitFor();
      await page.locator('#scout-collect-cancel').click();
      await page.locator('.scout-pub-love-action').click();
      await page.locator('.scout-pub-love-action.is-loved').waitFor();
      assert.match(await page.locator('.scout-pub-love-action').textContent() || '', /已关注/);

      await page.locator('#scout-tags-manage').click();
      await page.locator('#scout-tag-choice').selectOption({ label: 'night' });
      await page.locator('#scout-tag-love').click();
      assert.equal(await page.evaluate(() => GM_getValue('creamu_scout_lexicon_terms', []).find(t => t.text === 'night')?.loved), true);
      await page.locator('#scout-tags-manage').click();
      await page.locator('#scout-tag-choice').selectOption({ label: 'night' });
      await page.locator('[data-tag-search="preference"]').click();
      await waitWorkbenchOpen(page);
      assert.equal(await page.locator('.scout-search-condition', { hasText: 'night' }).locator('select').first().inputValue(), 'preference');
      await page.locator('[data-context-action="tags"]').click();
      assert.equal(await page.locator('#scout-search-word-picker').evaluate(el => el.open), true);
      await page.locator('#scout-combo-free-input').fill('portrait');
      const requestsBefore = await page.evaluate(() => window.__scoutRequests.length);
      await page.locator('#scout-combo-search-btn').click();
      assert.equal(await page.locator('#scout-combo-free-input').inputValue(), '', 'submitted text is not restored during render');
      assert.equal(await page.evaluate(() => window.__scoutRequests.length), requestsBefore, 'direct search does not start three-site assessment');
      const destination = new URL(await page.evaluate(() => window.__scoutOpenedUrls.at(-1)));
      const filter = JSON.parse(decodeURIComponent(destination.hash.slice('#creamu-exact='.length)));
      assert.equal(destination.hostname, 'www.xvideos.com');
      assert.match(destination.searchParams.get('k'), /portrait/);
      assert.doesNotMatch(destination.searchParams.get('k'), /night/);
      assert.equal(filter.mode, 'browse');
      assert.equal(filter.conditions.find(c => c.text === 'night').role, 'preference');
      await page.locator('#scout-save-current-search-btn').click();
      await page.locator('#scout-search-label').fill('Continue documentary');
      await page.locator('#scout-search-save-confirm').click();
      await page.evaluate(() => {
        const tracks = GM_getValue('creamu_scout_tracks', []);
        tracks.find(t => t.site === 'xvideos').last_seen_page = 5;
        GM_setValue('creamu_scout_tracks', tracks);
      });
      await openScoutTab(page, 'tracks');
      await page.locator('.scout-track-open-btn').click();
      const resume = new URL(await page.evaluate(() => window.__scoutOpenedUrls.at(-1)));
      assert.equal(resume.searchParams.get('p'), '4');
      assert.equal(JSON.parse(decodeURIComponent(resume.hash.slice('#creamu-exact='.length))).mode, 'browse');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('#scout-wb-close-btn').click();
      await page.locator('#scout-tags-manage').click();
      await assertVisibleElementsInsideViewport(page, '#scout-collect-dialog', 'mobile tag actions');
      assert.ok(await page.locator('#scout-collect-dialog button').evaluateAll(nodes =>
        nodes.every(el => { const height = el.getBoundingClientRect().height; return height >= 30 && height <= 36; })
      ), 'mobile tag actions do not inflate every button');
      await captureScoutUi(page, 'scout-mobile-tag-actions');
      await page.locator('#scout-collect-cancel').click();
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
      assert.equal(await page.locator('.main-uploader').isVisible(), true, 'collapsing tags preserves the uploader');
      assert.equal(await page.locator('[data-scout-tag="landscape"]').isVisible(), false);
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
      assert.ok(await page.locator('#scout-work-fav-bar button, .scout-pub-action, #scout-tags-toggle, #scout-desc-toggle').evaluateAll(nodes =>
        nodes.every(el => { const rect = el.getBoundingClientRect(); return rect.height >= 30 && rect.height <= 36 && rect.width < innerWidth * .75; })
      ), 'secondary detail actions remain compact on mobile');

      await page.locator('#scout-tags-toggle').click();
      await page.locator('.video-tags-list.scout-tags-expanded').waitFor();
      assert.equal(await page.locator('[data-scout-tag="landscape"]').isVisible(), true);
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

  for (const site of ['xvideos', 'xnxx', 'eporner']) {
    await runCase(
      'Scout detail context: preserves the current work and draft across tabs on ' + site,
      {
        host: 'www.' + site + '.com',
        fixtureFile: 'xvideos-detail.html',
        scriptPath: PATHS.scoutDist,
        gmValues: SCOUT_DETAIL_FIXTURE_DATA,
        beforeScript: page => page.evaluate(site => {
          history.replaceState({}, '', site === 'xvideos' ? '/video.alpha001/sample' : '/video-alpha001/sample');
          if (site === 'xnxx') {
            document.querySelector('#content').id = 'video-content-metadata';
            const title = document.querySelector('.page-title');
            const replacement = document.createElement('div');
            replacement.className = 'video-title';
            replacement.innerHTML = '<strong>Sample Documentary</strong>';
            title.replaceWith(replacement);
          }
          if (site === 'eporner') {
            const title = document.querySelector('.page-title');
            const heading = document.createElement('h1');
            heading.className = 'page-title';
            heading.style.cssFloat = 'left';
            heading.textContent = title.textContent;
            title.replaceWith(heading);
            const tags = document.querySelector('.video-tags-list');
            tags.id = 'video-info-tags';
            tags.querySelectorAll('a.is-keyword').forEach(a => {
              a.href = a.getAttribute('href').replace('/tags/', '/tag/');
              a.parentElement.className = 'vit-category';
            });
            tags.querySelector('.main-uploader').classList.add('vit-uploader');
            document.body.insertAdjacentHTML('afterbegin', '<nav><a href="/cat/unrelated">Unrelated navigation category</a></nav>');
          }
        }, site),
      },
      async page => {
        await page.locator('#scout-detail-console').click();
        const current = page.locator('#scout-workbench-context');
        await current.waitFor();
        await page.locator('#scout-combo-free-input').fill('unfinished draft');
        const initialTitle = await current.locator('strong').textContent();
        await page.evaluate(() => { window.__currentWorkNode = document.getElementById('scout-workbench-context').firstElementChild; });
        for (const tab of ['tracks', 'works', 'combo']) {
          await openScoutTab(page, tab);
          assert.equal(await current.locator('strong').textContent(), initialTitle);
          assert.equal(await page.evaluate(() => document.getElementById('scout-workbench-context').firstElementChild === window.__currentWorkNode), true);
        }
        assert.equal(await page.locator('#scout-combo-free-input').inputValue(), 'unfinished draft');
        await current.locator('[data-context-action="favorite"]').click();
        await current.locator('[data-context-action="favorite"][aria-pressed="true"]').waitFor();
        assert.equal(await page.locator('#scout-work-fav-btn').getAttribute('aria-pressed'), 'true');
        const work = await page.evaluate(() => GM_getValue('creamu_scout_works', [])[0]);
        assert.ok(work.tags.includes('landscape'));
        assert.ok(!work.tags.some(tag => /Unrelated navigation/.test(tag)));
        assert.equal(await page.locator('#scout-combo-free-input').inputValue(), 'unfinished draft');
        await openScoutTab(page, 'works');
        await current.locator('[data-context-action="tags"]').click();
        await page.locator('[data-jlc-wb-page="combo"]:not([hidden])').waitFor();
        assert.equal(await page.locator('#scout-search-word-picker').evaluate(el => el.open), true);
        assert.equal(await page.locator('#scout-combo-free-input').inputValue(), 'unfinished draft');
        await page.evaluate(() => {
          document.querySelector('.scout-detail-title').textContent = 'Next documentary';
          history.pushState({}, '', location.hostname.includes('xvideos') ? '/video.beta002/next' : '/video-beta002/next');
        });
        await current.locator('strong', { hasText: 'Next documentary' }).waitFor();
        await current.locator('[data-context-action="favorite"][aria-pressed="false"]').waitFor();
        await page.setViewportSize({ width: 390, height: 844 });
        await current.locator('[data-context-action="return"]').click();
        await waitWorkbenchClosed(page);
        assert.notEqual(await page.locator('body').evaluate(el => el.style.overflow), 'hidden');
        assert.equal(await page.evaluate(() => document.activeElement.classList.contains('scout-detail-title')), true);
        await page.locator('#scout-detail-console').click();
        await assertScoutPageLayout(page, 'combo');
        const toolbar = await page.locator('#scout-work-fav-bar').boundingBox();
        assert.ok(toolbar.x >= 0 && toolbar.x + toolbar.width <= 391, 'toolbar clears native floated headings');
        await page.locator('#scout-combo-free-input').fill('keyboard draft');
        await page.evaluate(() => {
          Object.defineProperty(visualViewport, 'height', { configurable: true, value: 400 });
          visualViewport.dispatchEvent(new Event('resize'));
        });
        const input = await page.locator('#scout-combo-free-input').boundingBox();
        const footer = await page.locator('.scout-combo-dock').boundingBox();
        assert.ok(input.y >= 0 && input.y + input.height <= footer.y, 'detail context leaves room for keyboard input');
        await page.evaluate(() => { delete visualViewport.height; visualViewport.dispatchEvent(new Event('resize')); });
        await captureScoutUi(page, 'scout-detail-context-' + site);
        await page.evaluate(() => history.pushState({}, '', '/?k=sample'));
        await current.waitFor({ state: 'hidden' });
        assert.equal(await page.locator('#scout-work-fav-bar').count(), 0, 'detail controls leave with the detail page');
      }
    );
  }

  await runCase(
    'Scout tracking mobile: inline bar locates the saved item and opens management',
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
      const pagebar = page.locator('#scout-search-track-bar');
      await pagebar.waitFor({ timeout: 5000 });
      await assertNoInlinePresentation(page, '#scout-search-track-bar', 'tracking bar');
      await assertVisibleElementsInsideViewport(page, '#scout-search-track-bar, #scout-search-track-bar button', 'tracking controls');
      assert.equal(await pagebar.evaluate(el => getComputedStyle(el).position), 'static');
      await page.locator('#scout-bp-jump-btn').click();
      await page.locator('#video_alpha001.scout-breakpoint-highlight').waitFor();
      await page.locator('#scout-search-track-toggle').click();
      await page.locator('[data-jlc-wb-page="tracks"]:not([hidden])').waitFor();
      await waitWorkbenchOpen(page);
      await page.locator('#scout-wb-close-btn').click();
      await page.evaluate(() => history.pushState({}, '', '/?k=other'));
      await page.locator('#scout-search-track-toggle', { hasText: '收藏搜索' }).waitFor();
      await page.evaluate(() => history.pushState({}, '', '/?k=documentary+city'));
      await page.locator('#scout-search-track-toggle', { hasText: '已追更' }).waitFor();
    }
  );

  for (const site of ['xvideos', 'xnxx', 'eporner']) {
    const searchPath = site === 'xvideos' ? '/?k=documentary' : '/search/documentary/';
    await runCase(
      'Scout browsing: explicit preview, navigation, and mobile drawer on ' + site,
      {
        host: 'www.' + site + '.com',
        fixtureHtml: scoutBrowseFixture(site),
        scriptPath: PATHS.scoutDist,
        viewport: { width: 1440, height: 900 },
        gmValues: {
          ...SCOUT_WORKBENCH_FIXTURE_DATA,
          scout_combo_tokens: [],
          creamu_scout_tracks: [{ id: 'browse-track', site, query: 'documentary', label: 'Documentary', url: 'https://www.' + site + '.com' + searchPath, last_seen_page: 1, last_seen_item: '' }],
          creamu_scout_publishers: [],
        },
        beforeScript: (page) => page.evaluate(async ({ site, searchPath }) => {
          history.replaceState({}, '', searchPath);
          window.__scoutOpenedUrls = [];
          window.GM_openInTab = url => window.__scoutOpenedUrls.push(url);
          // A real, locally generated video exercises playback without external media.
          if (site !== 'eporner') {
            const canvas = document.createElement('canvas');
            canvas.width = 320; canvas.height = 180;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#586c61'; ctx.fillRect(0, 0, 320, 180);
            ctx.fillStyle = '#e8e5d6'; ctx.font = '24px sans-serif'; ctx.fillText('Preview sample', 35, 95);
            const stream = canvas.captureStream(10);
            const recorder = new MediaRecorder(stream);
            const chunks = [];
            recorder.ondataavailable = e => chunks.push(e.data);
            const stopped = new Promise(resolve => recorder.onstop = resolve);
            recorder.start();
            await new Promise(resolve => setTimeout(resolve, 200));
            recorder.stop(); await stopped;
            stream.getTracks().forEach(track => track.stop());
            const url = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
            document.querySelectorAll('img').forEach(img => img.setAttribute('data-pvv', url));
          }
        }, { site, searchPath }),
      },
      async page => {
        await waitFab(page);
        const card = page.locator('#video_alpha001');
        const state = () => page.evaluate(() => ({
          clicks: Object.keys(GM_getValue('creamu_scout_clicks', {})).length,
          last: GM_getValue('creamu_scout_tracks', [])[0].last_seen_item,
          opened: window.__scoutOpenedUrls.length,
        }));
        await card.dispatchEvent('pointerdown', { button: 0 });
        await card.locator('.uploader a').evaluate(el => el.addEventListener('click', e => e.preventDefault()));
        await card.locator('.uploader a').click();
        assert.deepEqual(await state(), { clicks: 0, last: '', opened: 0 });
        if (site !== 'eporner') {
          await card.locator('.scout-preview-button').click();
          await page.waitForFunction(() => document.querySelector('.scout-list-preview-video')?.readyState >= 2);
          assert.deepEqual(await state(), { clicks: 0, last: '', opened: 0 }, 'preview is not a visit or breakpoint');
          await card.locator('.scout-preview-button').click();
          assert.equal(await page.locator('.scout-list-preview-video').count(), 0);
        } else {
          assert.equal(await page.locator('.scout-preview-button').count(), 0, 'no unsupported preview action');
        }
        await card.locator('.cover-link').click();
        assert.deepEqual(await state(), { clicks: 1, last: 'alpha001', opened: 1 });
        const second = page.locator('#video_alpha002 .cover-link');
        await second.dispatchEvent('auxclick', { button: 1 });
        assert.equal((await state()).last, 'alpha002', 'middle click records the actual destination');
        await openAndCheckTitle(page, /Scout/);
        await assertScoutPageLayout(page, 'combo');
        const space = await page.evaluate(() => ({
          pageRight: document.getElementById('content').getBoundingClientRect().right,
          panelLeft: document.getElementById('jlc-wb').getBoundingClientRect().left,
        }));
        assert.ok(space.pageRight <= space.panelLeft, 'docked console leaves the page visible for comparison');
        await captureScoutUi(page, 'scout-' + site + '-desktop');
        await page.locator('#scout-wb-close-btn').click();
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('#jlc-wb-fab').click();
        assert.ok((await page.locator('#jlc-wb').boundingBox()).height < 600, 'mobile opens as a partial-height drawer');
        assert.notEqual(await page.locator('body').evaluate(el => el.style.overflow), 'hidden');
        await captureScoutUi(page, 'scout-' + site + '-mobile');
        await page.locator('#scout-combo-free-input').fill('draft not submitted');
        assert.ok((await page.locator('#jlc-wb').boundingBox()).height > 780, 'editing expands the drawer');
        assert.equal(await page.locator('body').evaluate(el => el.style.overflow), 'hidden');
        await page.evaluate(() => {
          window.__scoutViewportHeightDescriptor = Object.getOwnPropertyDescriptor(visualViewport, 'height');
          Object.defineProperty(visualViewport, 'height', { configurable: true, value: 400 });
          visualViewport.dispatchEvent(new Event('resize'));
        });
        const keyboardPanel = await page.locator('#jlc-wb').boundingBox();
        assert.ok(keyboardPanel.y + keyboardPanel.height <= 401, 'drawer stays above a shortened visual viewport');
        const keyboardInput = await page.locator('#scout-combo-free-input').boundingBox();
        const keyboardFooter = await page.locator('.scout-combo-dock').boundingBox();
        assert.ok(keyboardInput.y + keyboardInput.height <= keyboardFooter.y, 'focused input remains above the footer');
        await page.evaluate(() => {
          if (window.__scoutViewportHeightDescriptor) Object.defineProperty(visualViewport, 'height', window.__scoutViewportHeightDescriptor);
          else delete visualViewport.height;
          visualViewport.dispatchEvent(new Event('resize'));
        });
        const focusStyle = await page.locator('#scout-combo-free-input').evaluate(el => {
          const cs = getComputedStyle(el); return [cs.backgroundColor, cs.color];
        });
        assert.notEqual(focusStyle[0], focusStyle[1], 'focused input remains readable');
        await page.locator('#scout-search-word-picker > summary').click();
        await page.locator('#scout-search-advanced > summary').click();
        const scroll = await page.locator('.scout-combo-scroll').evaluate(el => { el.scrollTop = 120; return el.scrollTop; });
        await page.locator('#scout-wb-close-btn').click();
        assert.notEqual(await page.locator('body').evaluate(el => el.style.overflow), 'hidden');
        await page.locator('#jlc-wb-fab').click();
        assert.equal(await page.locator('#scout-combo-free-input').inputValue(), 'draft not submitted');
        assert.equal(await page.locator('.scout-combo-scroll').evaluate(el => el.scrollTop), scroll);
        await page.setViewportSize({ width: 320, height: 568 });
        await assertScoutPageLayout(page, 'combo');
        await page.setViewportSize({ width: 844, height: 390 });
        await assertScoutPageLayout(page, 'combo');
        await page.setViewportSize({ width: 390, height: 844 });
        await openScoutSettingsTab(page, 'ui');
        await page.locator('#scout-cfg-cream-site').uncheck();
        await page.locator('#jlc-wb-settings-close').click();
        await assertScoutPageLayout(page, 'combo');
        assert.ok(await page.locator('#jlc-wb').evaluate(el => getComputedStyle(el).color !== 'rgba(0, 0, 0, 0)'));
        await page.evaluate(() => {
          window.__scoutFullScreenDescriptor = Object.getOwnPropertyDescriptor(document, 'fullscreenElement');
          Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.getElementById('content') });
          document.dispatchEvent(new Event('fullscreenchange'));
        });
        assert.equal(await page.locator('#jlc-wb').isVisible(), false);
        assert.equal(await page.locator('#jlc-wb-fab').isVisible(), false);
        assert.notEqual(await page.locator('body').evaluate(el => el.style.overflow), 'hidden');
        await page.evaluate(() => {
          if (window.__scoutFullScreenDescriptor) Object.defineProperty(document, 'fullscreenElement', window.__scoutFullScreenDescriptor);
          else delete document.fullscreenElement;
          document.dispatchEvent(new Event('fullscreenchange'));
        });
        await waitFab(page);
      }
    );
  }

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
      await page.locator('#exc-wb-layout-toggle').click();
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
    'ExH folding: newest survives late metadata, refresh and preference changes',
    {
      host: 'e-hentai.org',
      fixtureHtml: '<!doctype html><html><head><title>Fold fixture</title></head><body><table class="itg"><tbody>'
        + '<tr><td class="glname"><a href="/g/710000/aaaaaaaaaa/"><div class="glink">[Group] Fold Example [Chinese] [Uncensored]</div></a>'
        + '<div id="posted_710000">2025-01-01 12:00</div></td></tr>'
        + '<tr><td class="glname"><a href="/g/710001/bbbbbbbbbb/"><div class="glink">[Group] Fold Example [Japanese]</div></a></td></tr>'
        + '</tbody></table></body></html>',
      scriptPath: PATHS.exhDist,
      gmValues: { exh_commander_config_v1: { fold_primary_mode: 'newest', list_hover_preview: false } },
      beforeInject: async page => page.evaluate(installExhStorageMetrics),
      beforeScript: async page => {
        await page.evaluate(() => {
          window.__foldRequests = [];
          window.__releaseFoldMetadata = [];
          window.GM_xmlhttpRequest = options => {
            if (!/\/api\.php(?:$|\?)/.test(options.url || '')) {
              setTimeout(() => options.onload?.({ status: 200, responseText: '' }), 0);
              return;
            }
            window.__foldRequests.push(options.url);
            const payload = JSON.parse(options.data);
            const gmetadata = payload.gidlist.map(([gid, token]) => ({
              gid, token,
              title: Number(gid) === 710000
                ? '[Group] Fold Example [Chinese] [Uncensored]' : '[Group] Fold Example [Japanese]',
              posted: String(Date.UTC(Number(gid) === 710000 ? 2025 : 2026, 0, 1, 12) / 1000),
              tags: [Number(gid) === 710000 ? 'language:chinese' : 'language:japanese', 'female:sample'],
              filecount: '100', filesize: '1000000', expunged: false,
            }));
            window.__releaseFoldMetadata.push(() => options.onload?.({
              status: 200, responseText: JSON.stringify({ gmetadata }),
            }));
          };
        });
      },
    },
    async page => {
      const oldCard = page.locator('.exc-gl-item[data-exc-gid="710000"]');
      const newCard = page.locator('.exc-gl-item[data-exc-gid="710001"]');
      await oldCard.locator('.exc-fold-tag').waitFor();
      await page.waitForFunction(() => window.__releaseFoldMetadata.length > 0);
      await page.evaluate(() => window.__releaseFoldMetadata.splice(0).forEach(release => release()));
      await newCard.locator('.exc-fold-tag').waitFor();
      assert.equal(await oldCard.isVisible(), false, 'newest must replace the old primary when its date arrives');
      assert.equal(await newCard.isVisible(), true);
      await newCard.locator('.exc-fold-tag').click();
      assert.equal(await oldCard.isVisible(), true, 'older editions remain available through expansion');
      await newCard.locator('.exc-fold-tag').click();

      await page.evaluate(() => {
        // Translation scripts abbreviate this year's dates just like the user's cards.
        document.getElementById('posted_710000').textContent = '2025/6/4 12:32';
        const newer = document.createElement('div');
        newer.id = 'posted_710001';
        newer.textContent = '8/28 17:52';
        document.querySelector('.exc-gl-item[data-exc-gid="710001"] .glname').append(newer);
        window.__resetExhListMetrics();
        window.__excRefreshPage();
      });
      await page.waitForFunction(() => window.__exhListMetrics.transactions.total > 0
        && performance.now() - window.__exhListMetrics.lastTransactionAt > 250);
      await newCard.locator('.exc-fold-tag').waitFor();
      const records = await page.evaluate(() => window.__readExhStores(['editions']));
      const parsedShortDate = await page.evaluate(() => new Date(new Date().getFullYear(), 7, 28, 17, 52).getTime());
      assert.equal(records.editions.find(row => String(row.gid) === '710001').posted_at, parsedShortDate,
        'a yearless current-year date must never become 2001');
      await page.evaluate(() => {
        document.getElementById('posted_710001').remove();
        window.__resetExhListMetrics();
        window.__excRefreshPage();
      });
      await page.waitForFunction(() => window.__exhListMetrics.transactions.total > 0
        && performance.now() - window.__exhListMetrics.lastTransactionAt > 250);
      const cachedRecords = await page.evaluate(() => window.__readExhStores(['editions']));
      assert.equal(cachedRecords.editions.find(row => String(row.gid) === '710001').posted_at, parsedShortDate,
        'a later list without dates must preserve the corrected publication time');
      assert.equal(await page.evaluate(() => window.__foldRequests.length), 1, 'cached dates must not need another request');

      await openAndCheckTitle(page, /ExH/i);
      await openWorkbenchSettingsTab(page, 'pref');
      await page.locator('#exc-cfg-fold-mode').selectOption('preference');
      await page.locator('#exc-cfg-save').click();
      await oldCard.locator('.exc-fold-tag').waitFor();
      await page.locator('#exc-cfg-fold-mode').selectOption('newest');
      await page.locator('#exc-cfg-save').click();
      await newCard.locator('.exc-fold-tag').waitFor();
      await page.locator('#jlc-wb-settings-close').click();
      await page.locator('#jlc-wb-close-btn').click();
      assert.equal(await oldCard.isVisible(), false, 'saving newest must change the primary without a page reload');

      await newCard.locator('.exc-fold-tag').click();
      await oldCard.locator('[data-exc-act="breakpoint"]').click();
      await oldCard.locator('.exc-last-seen-mark').waitFor();
      assert.equal(await oldCard.isVisible(), true, 'the saved breakpoint stays visible even when it is an older edition');
      assert.equal(await newCard.locator('.exc-fold-tag').count(), 1, 'revealing a breakpoint must not move the fold primary');
    }
  );

  await runCase(
    'ExH tracking: collection chooses a folder and immediately establishes the breakpoint',
    {
      host: 'e-hentai.org',
      fixtureFile: 'ehentai-list.html',
      scriptPath: PATHS.exhDist,
      gmValues: {
        exh_commander_config_v1: {
          list_hover_preview: false,
        },
      },
      beforeInject: async (page) => {
        await page.evaluate(installExhStorageMetrics);
      },
    },
    async (page) => {
      await page.locator('#exc-save-tracking').waitFor({ timeout: 15000 });
      await page.locator('#exc-save-tracking').click();
      await page.locator('#exc-folder-dialog').waitFor({ timeout: 5000 });
      await page.locator('#exc-folder-new').fill('常看');
      await page.locator('[data-folder-action="create"]').click();
      await page.locator('.exc-gl-item .exc-last-seen-mark').waitFor({ timeout: 5000 });

      const firstState = await page.evaluate(async () => {
        const data = await window.__readExhStores(['tracking_searches']);
        const card = document.querySelector('.exc-gl-item');
        return {
          records: data.tracking_searches.map((record) => ({
            f_search: record.f_search,
            folder: record.custom_folder,
            breakpoint_gid: record.breakpoint_gid,
          })),
          trackingId: card?.dataset.excTrackId || '',
          marker: card?.querySelector('.exc-last-seen-mark')?.textContent || '',
        };
      });
      assert.deepEqual(firstState.records, [
        { f_search: 'browse:home', folder: '常看', breakpoint_gid: '111' },
      ]);
      assert.ok(firstState.trackingId, 'newly tracked cards should receive their tracking id immediately');
      assert.match(firstState.marker, /上次看到/);

      // Reproduce a stale "missing" flag while the actual breakpoint is on screen.
      await page.evaluate(async () => {
        const request = indexedDB.open('exh_commander_db');
        const db = await new Promise((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const transaction = db.transaction('tracking_searches', 'readwrite');
        const store = transaction.objectStore('tracking_searches');
        const rows = store.getAll();
        rows.onsuccess = () => store.put({
          ...rows.result[0], breakpoint_missing: 1, has_update: 1,
          unread_estimate: 40, unread_estimate_source: 'deep_scan',
        });
        await new Promise((resolve, reject) => {
          transaction.oncomplete = resolve;
          transaction.onerror = () => reject(transaction.error);
        });
        db.close();
        window.__excRefreshPage();
      });
      await page.locator('#jlc-wb-fab').click();
      await waitWorkbenchOpen(page);
      await page.locator('#jlc-wb-list-scroll .jlc-wb-item .jlc-wb-leaf').filter({ hasText: '已追到' }).waitFor();
      const recovered = await page.evaluate(async () => (await window.__readExhStores(['tracking_searches'])).tracking_searches[0]);
      assert.equal(recovered.breakpoint_missing, 0, 'visible exact matches must repair the stored miss');
      assert.equal(recovered.unread_estimate, 0);
      assert.equal(recovered.has_update, 0);
      await page.locator('#jlc-wb-close-btn').click();

      await page.evaluate(async () => {
        history.replaceState(null, '', '/?f_search=second');
        await window.__excRefreshPage();
      });
      await page.waitForFunction(
        () => document.getElementById('exc-save-tracking')?.textContent?.includes('收藏追更'),
        null,
        { timeout: 5000 }
      );
      await page.locator('#exc-save-tracking').click();
      const existingFolder = page.locator('[data-folder-choice="常看"]');
      await existingFolder.waitFor({ timeout: 5000 });
      await existingFolder.click();

      const records = await page.evaluate(async () => {
        const data = await window.__readExhStores(['tracking_searches']);
        return data.tracking_searches
          .map((record) => ({
            f_search: record.f_search,
            folder: record.custom_folder,
            breakpoint_gid: record.breakpoint_gid,
          }))
          .sort((left, right) => left.f_search.localeCompare(right.f_search));
      });
      assert.deepEqual(records, [
        { f_search: 'browse:home', folder: '常看', breakpoint_gid: '111' },
        { f_search: 'second', folder: '常看', breakpoint_gid: '111' },
      ]);

      await page.locator('#exc-wb-dialog').waitFor({ state: 'hidden' });
      await page.setViewportSize({ width: 390, height: 844 });
      await waitFab(page);
      await page.locator('#jlc-wb-fab').click();
      await waitWorkbenchOpen(page);
      await page.locator('#jlc-wb .jlc-wb-nav button[data-nav="tracking"]').click();
      const trackingItem = page.locator('#jlc-wb-list-scroll .jlc-wb-item').first();
      await trackingItem.waitFor({ timeout: 5000 });
      await trackingItem.locator('[data-tact="menu"]').click();
      await trackingItem.locator('[data-tact="folder"]').click();
      const folderDialog = page.locator('#exc-wb-dialog');
      await folderDialog.waitFor({ state: 'visible', timeout: 5000 });
      const modalLayer = await page.evaluate(() => {
        const dialog = document.getElementById('exc-wb-dialog');
        const card = dialog?.querySelector('.jlc-wb-dialog-card');
        const workbench = document.getElementById('jlc-wb');
        const rect = card?.getBoundingClientRect();
        const hit = rect
          ? document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
          : null;
        return {
          dialogZ: Number(getComputedStyle(dialog).zIndex) || 0,
          workbenchZ: Number(getComputedStyle(workbench).zIndex) || 0,
          dialogOwnsHit: !!(dialog && hit && dialog.contains(hit)),
        };
      });
      assert.ok(
        modalLayer.dialogZ > modalLayer.workbenchZ,
        `folder dialog must layer above the open workbench (${modalLayer.dialogZ}/${modalLayer.workbenchZ})`
      );
      assert.equal(modalLayer.dialogOwnsHit, true, 'folder dialog controls must remain clickable');
    }
  );

  await runCase(
    'ExH hover preview: leaving the work cancels a late response',
    {
      host: 'e-hentai.org',
      fixtureFile: 'ehentai-list.html',
      scriptPath: PATHS.exhDist,
      gmValues: {
        exh_commander_config_v1: {
          list_hover_preview: true,
          list_hover_preview_delay_ms: 500,
        },
      },
      beforeScript: async (page) => {
        await page.evaluate(() => {
          const cover = document.createElement('td');
          cover.className = 'gl1e';
          cover.innerHTML = '<img alt="cover" width="100" height="140" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==">';
          document.querySelector('.itg tr').prepend(cover);
          window.GM_xmlhttpRequest = (options) => {
            setTimeout(() => {
              options.onload?.({
                status: 404,
                responseText: '',
                finalUrl: options.url || '',
                responseHeaders: '',
              });
            }, 900);
          };
        });
      },
    },
    async (page) => {
      const card = page.locator('.exc-gl-item');
      await card.waitFor({ timeout: 15000 });
      await card.locator('.exc-cover-host').hover();
      await page.locator('#exc-hover-preview').waitFor({ state: 'visible', timeout: 2000 });
      await page.mouse.move(2, 2);
      await page.waitForTimeout(1200);
      assert.equal(
        await page.locator('#exc-hover-preview').isVisible(),
        false,
        'a completed request must not reopen the preview after mouseleave'
      );
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
        availability_status: 'expunged',
        availability_checked_at: 1_790_000_000_000,
        availability_reason: 'Seeded expunged state',
        expunged: 1,
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
            row.size_bytes === 987654321 &&
            row.availability_status === 'expunged' &&
            row.availability_checked_at === 1_790_000_000_000 &&
            row.expunged === 1
          );
        },
        firstEdition.id,
        { timeout: 10000 }
      );
      await page.waitForFunction(
        () => document.querySelector(
          '[data-e2e-exh-card="710000"] .meta-tag.source-expunged'
        )?.textContent?.includes('已清退'),
        null,
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

      await page.locator('#jlc-wb-fab').click();
      await waitWorkbenchOpen(page);
      await page.locator('#jlc-wb .jlc-wb-nav button[data-nav="works"]').click();
      const currentWork = page.locator('#exc-current-work .jlc-wb-item.is-current');
      await currentWork.waitFor({ timeout: 10000 });
      assert.match(await currentWork.textContent() || '', /Detail Gallery/);
      assert.equal(
        await currentWork.evaluate((element) => !!element.closest('#jlc-wb-works-scroll')),
        false,
        'the current detail work should remain pinned above the scrollable status list'
      );
    }
  );

  await runCase(
    'ExH availability: expunged sources can be reviewed and recover',
    {
      host: 'e-hentai.org',
      fixtureHtml: createExhDetailFixture(),
      scriptPath: PATHS.exhDist,
      viewport: { width: 390, height: 844 },
      beforeInject: async (page) => {
        await page.evaluate(installExhStorageMetrics);
        await page.evaluate(() => {
          history.replaceState(null, '', '/g/720000/abcdef1234/');
        });
      },
      beforeScript: async (page) => {
        await page.evaluate(() => {
          window.__exhAvailabilityMode = 'expunged';
          window.GM_xmlhttpRequest = function mockAvailabilityRequest(options) {
            const request = options || {};
            const isGdata =
              String(request.method || 'GET').toUpperCase() === 'POST' &&
              /\/api\.php(?:$|\?)/.test(String(request.url || ''));
            if (!isGdata) {
              setTimeout(() => request.onload?.({ status: 200, responseText: '' }), 0);
              return;
            }
            let payload = {};
            try {
              payload = JSON.parse(request.data || '{}');
            } catch (_) { /* ignore */ }
            const mode = window.__exhAvailabilityMode;
            const gmetadata = (payload.gidlist || []).map(([gid, token]) => {
              if (mode === 'unavailable') {
                return { gid, error: 'Fixture source is unavailable' };
              }
              return {
                gid,
                token,
                title: '[Detail Group] Detail Gallery',
                posted: '1784548800',
                filecount: '100',
                filesize: String(128 * 1024 * 1024),
                tags: ['language:chinese', 'group:detail group'],
                uploader: 'detail-uploader',
                expunged: mode === 'expunged',
              };
            });
            setTimeout(
              () => request.onload?.({
                status: 200,
                responseText: JSON.stringify({ gmetadata }),
              }),
              0
            );
          };
        });
      },
    },
    async (page) => {
      await page.locator('#exc-gallery-panel').waitFor({ timeout: 15000 });
      await page.locator(
        '#exc-gallery-panel [data-source-status="expunged"]'
      ).waitFor({ timeout: 15000 });
      assert.match(await page.locator('#exc-gallery-panel').textContent() || '', /已清退/);

      await openAndCheckTitle(page, /ExH/i);
      await openWorkbenchNav(page, 'works');
      await page.locator('#exc-work-chips [data-wtab="availability"]').click();
      const sourceItem = page.locator('#jlc-wb-works-scroll .jlc-wb-item').first();
      await sourceItem.waitFor({ timeout: 10000 });
      assert.match(await sourceItem.textContent() || '', /已清退/);
      await assertWorkbenchRegionLayout(page, '#exc-wb-works-root', 'ExH availability mobile');

      await page.evaluate(() => {
        window.__exhAvailabilityMode = 'active';
      });
      await sourceItem.locator('[data-wact="source"]').click();
      await page.waitForFunction(
        async () => {
          const data = await window.__readExhStores(['editions']);
          const edition = data.editions.find((row) => String(row.gid) === '720000');
          return edition?.availability_status === 'active' && edition?.expunged === 0;
        },
        null,
        { timeout: 15000 }
      );
      await page.waitForFunction(
        () =>
          !!document.querySelector('#exc-work-chips [data-wtab="availability"].is-on') &&
          document.querySelectorAll('#jlc-wb-works-scroll .jlc-wb-item').length === 0 &&
          /暂无已知异常来源/.test(
            document.querySelector('#jlc-wb-works-scroll')?.textContent || ''
          ),
        null,
        { timeout: 15000 }
      );
      await page.waitForFunction(
        () => !document.querySelector('#exc-gallery-panel [data-source-status]'),
        null,
        { timeout: 15000 }
      );
    }
  );

  await runCase(
    'JLC detail: resource work waits for visibility and stable renders reuse DOM',
    {
      host: 'www.javlibrary.com',
      fixtureHtml: createJlcDetailFixture(),
      scriptPath: PATHS.jlcDist,
      needJquery: true,
      gmValues: { version: '20250311' },
      beforeScript: async (page) => {
        await page.evaluate(() => {
          window.__jlcDetailResourceRequests = [];
          const recordRequest = (kind, value) => {
            const url = typeof value === 'string' ? value : (value?.url || String(value || ''));
            window.__jlcDetailResourceRequests.push(kind + ':' + url);
          };
          window.GM_xmlhttpRequest = function (options) {
            const request = options || {};
            recordRequest('gm', request.url || '');
            window.setTimeout(() => request.onload?.({
              status: 404,
              responseText: '',
              finalUrl: request.url || '',
              responseHeaders: '',
            }), 0);
          };
          window.fetch = async function (input) {
            recordRequest('fetch', input);
            return new Response('', { status: 404 });
          };
        });
      },
    },
    async (page) => {
      const center = page.locator('#jlc-resource-center');
      await center.waitFor({ state: 'attached', timeout: 15000 });
      await page.evaluate(() => {
        window.__jlcInitialResourceCard = document.querySelector('#jlc-resource-center .jlc-resource-card');
      });
      await page.waitForTimeout(2400);

      const deferred = await page.evaluate(() => {
        const centerNode = document.getElementById('jlc-resource-center');
        const badge = document.querySelector('.avid-date-badge[data-jlc-detail-date="1"]');
        const grid = centerNode?.querySelector('.jlc-resource-grid');
        const links = centerNode?.querySelector('[data-jlc-resource="links"]');
        const magnet = centerNode?.querySelector('[data-jlc-resource="magnet"]');
        const copyButton = magnet?.querySelector('[data-jlc-copy-magnet]');
        const providerButton = magnet?.querySelector('[data-jlc-magnet-provider]');
        return {
          requests: window.__jlcDetailResourceRequests.slice(),
          reusedDom: centerNode?.querySelector('.jlc-resource-card') === window.__jlcInitialResourceCard,
          cards: Array.from(centerNode?.querySelectorAll('.jlc-resource-card') || [])
            .map(card => card.dataset.jlcResource).sort(),
          links: centerNode?.querySelectorAll('[data-jlc-resource="links"] a').length || 0,
          linksIsCard: links?.classList.contains('jlc-resource-card') || false,
          linksInsideGrid: !!(links && grid?.contains(links)),
          gridWidth: grid?.getBoundingClientRect().width || 0,
          magnetWidth: magnet?.getBoundingClientRect().width || 0,
          copyText: (copyButton?.textContent || '').trim(),
          copyHeight: copyButton?.getBoundingClientRect().height || 0,
          providerHeight: providerButton?.getBoundingClientRect().height || 0,
          renderSignature: centerNode?.dataset.renderSignature || '',
          badgeExists: !!badge,
          badgeInlineStyle: badge?.getAttribute('style') || '',
          badgeMargin: badge ? getComputedStyle(badge).marginLeft : '',
        };
      });
      assert.equal(deferred.reusedDom, true, 'delayed startup passes should preserve resource card DOM');
      assert.equal(deferred.requests.length, 0, 'offscreen resource cards should not issue network requests');
      assert.deepEqual(deferred.cards, ['magnet', 'screenshot', 'subtitle', 'trailer'],
        'resource cards should include subtitles and keep external links outside the grid');
      assert.ok(deferred.links > 0, 'the enabled external-links module should be wired into the resource center');
      assert.equal(deferred.linksIsCard, false, 'external links should render as a compact strip');
      assert.equal(deferred.linksInsideGrid, false, 'external links should stay outside the resource grid');
      assert.ok(
        deferred.magnetWidth >= deferred.gridWidth - 2,
        `the magnet card should span the grid (${deferred.magnetWidth}/${deferred.gridWidth})`
      );
      assert.equal(deferred.copyText, '复制', 'magnet copy actions should use compact labels');
      assert.ok(deferred.copyHeight > 0 && deferred.copyHeight <= 28, `magnet copy action is too tall: ${deferred.copyHeight}`);
      assert.ok(deferred.providerHeight > 0 && deferred.providerHeight <= 28, `magnet provider action is too tall: ${deferred.providerHeight}`);
      assert.ok(deferred.renderSignature, 'the resource center should persist its render signature');
      assert.equal(deferred.badgeExists, true, 'the page release date should survive metadata decoration');
      assert.equal(deferred.badgeInlineStyle, '', 'detail badges should keep presentation in the stylesheet');
      assert.equal(deferred.badgeMargin, '8px');

      await page.setViewportSize({ width: 480, height: 900 });
      const mobileLayout = await page.evaluate(() => {
        const centerNode = document.getElementById('jlc-resource-center');
        const grid = centerNode?.querySelector('.jlc-resource-grid');
        const magnet = centerNode?.querySelector('[data-jlc-resource="magnet"]');
        const gridRect = grid?.getBoundingClientRect();
        const magnetRect = magnet?.getBoundingClientRect();
        const actionRects = Array.from(magnet?.querySelectorAll('button, .jlc-magnet-actions a') || [])
          .map((element) => element.getBoundingClientRect());
        return {
          columns: getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          magnetMatchesGrid: !!(gridRect && magnetRect && Math.abs(gridRect.width - magnetRect.width) <= 2),
          actionsInside: actionRects.every((rect) => !magnetRect || (rect.left >= magnetRect.left - 1 && rect.right <= magnetRect.right + 1)),
          pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        };
      });
      assert.equal(mobileLayout.columns, 1, 'the resource grid should collapse to one column on mobile');
      assert.equal(mobileLayout.magnetMatchesGrid, true, 'the mobile magnet card should use the full grid width');
      assert.equal(mobileLayout.actionsInside, true, 'magnet actions should stay inside the mobile card');
      assert.equal(mobileLayout.pageOverflow, false, 'the resource center should not cause mobile overflow');

      await center.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () => window.__jlcDetailResourceRequests.length > 0,
        null,
        { timeout: 10000 }
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
      await openAndCheckTitle(page, /控制台/i, 25000);
      const comparison = await page.evaluate(() => {
        const panel = document.getElementById('jlc-wb').getBoundingClientRect();
        const grid = document.getElementById('grid-b').getBoundingClientRect();
        return { docked: document.documentElement.classList.contains('jlc-console-docked'), gridRight: grid.right, panelLeft: panel.left };
      });
      assert.equal(comparison.docked, true, 'desktop console should leave space for the current page');
      assert.ok(comparison.gridRight <= comparison.panelLeft, 'page and console must remain simultaneously visible');
      await page.getByRole('button', { name: '切换为自由浮窗' }).click();
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
      await page.locator('.jlc-tool-btn.j-l.active-like').waitFor({ state: 'attached' });
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
        if (tab === 'display') {
          await exerciseJlcCoverDownloadDialog(page, 'JLC cover download dialog');
        }
      }
      await page.locator('#jlc-wb-settings-close').focus();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#jlc-wb-settings-btn').getAttribute('aria-expanded'), 'false');
      assert.equal(await page.locator('#jlc-wb-settings-btn').evaluate(el => el === document.activeElement), true);
      await page.keyboard.press('Escape');
      await waitWorkbenchClosed(page, 25000);
      assert.equal(await page.locator('#jlc-wb-fab').getAttribute('aria-expanded'), 'false');
      assert.equal(await page.locator('#jlc-wb-fab').evaluate(el => el === document.activeElement), true);
    }
  );

  for (const kind of ['title', 'combo']) {
    const query = kind === 'title' ? '親子' : '|类别=母亲||类别=妹妹|';
    const startPage = kind === 'title' ? 47 : 1;
    const latestPage = kind === 'title' ? 48 : 1;
    const searchUrl = (pageNumber, searchId, keyword = '') => 'https://www.javlibrary.com/cn/vl_searchby'
      + kind + '.php?searchid=' + searchId + '&page=' + pageNumber
      + (keyword ? '&keyword=' + encodeURIComponent(keyword) : '');
    const searchFixture = (pageNumber, lastPage, codes, keyword = query) => `<!doctype html>
      <html><head><meta charset="utf-8"><title>${kind === 'title' ? '标题' : '组合'}搜寻结果 - JAVLibrary</title></head>
      <body><form action="vl_searchbyid.php"><input name="keyword" value="unrelated search"></form>
      <main id="rightcolumn"><h3>${kind === 'title' ? '标题' : '组合'}搜寻结果: "${keyword}"</h3>
      <div class="videothumblist"><div class="videos">${codes.map(code => `
        <div class="video"><a href="./?v=${code}"><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==">
        <div class="id">${code}</div><div class="title">Sample ${code}</div></a></div>`).join('')}</div></div>
      <div class="page_selector">${pageNumber > 1 ? `<a class="page prev" href="?searchid=100&page=${pageNumber - 1}">上一页</a>` : ''}
      ${pageNumber < lastPage ? `<a class="page next" href="?searchid=100&page=${pageNumber + 1}">下一页</a>
      <a class="page last" href="?searchid=100&page=${lastPage}">末页</a>` : ''}</div></main></body></html>`;
    const orderedCodes = latest => kind === 'title' ? ['SAMPLE-001', latest] : [latest, 'SAMPLE-001'];
    await runCase(
      'JLC search tracking: ' + kind + ' pagination, identity and latest breakpoint',
      {
        host: 'www.javlibrary.com',
        fixtureHtml: searchFixture(startPage, kind === 'title' ? 47 : 2, orderedCodes('OLD-001')),
        scriptPath: PATHS.jlcDist,
        needJquery: true,
        gmValues: { version: '20250311' },
        beforeInject: async page => {
          await page.evaluate(url => history.replaceState(null, '', url), searchUrl(startPage, '100', query));
          await page.evaluate(installJlcStorageMetrics);
        },
      },
      async page => {
        const readRecords = () => page.evaluate(() => window.__readJlcStore('tracking_searches'));
        const waitRecords = async predicate => {
          const deadline = Date.now() + 10000;
          let rows;
          do {
            rows = await readRecords();
            if (predicate(rows)) return rows;
            await page.waitForTimeout(50);
          } while (Date.now() < deadline);
          assert.fail('tracking state did not settle: ' + JSON.stringify(rows));
        };
        const setBreakpoint = async (code, count, pageHint) => {
          const card = page.locator(`[data-jlc-avid="${code}"]`);
          await card.locator('.jlc-card-more summary').click();
          await card.locator('.j-bm').click();
          await waitRecords(rows => rows.length === count
            && rows.some(row => row.last_seen_avid === code && row.last_seen_page_hint === pageHint));
        };
        const navigate = async (url, html, autoPage = false) => {
          await page.route(url, route => route.fulfill({ contentType: 'text/html', body: html }));
          await page.goto(url);
          await page.addScriptTag({ content: gmMockSource({ version: '20250311', autoPage }) });
          await page.addScriptTag({ content: fs.readFileSync(PATHS.jquery, 'utf8') });
          await page.evaluate(installJlcStorageMetrics);
          await page.addScriptTag({ content: stripUserscriptMeta(fs.readFileSync(PATHS.jlcDist, 'utf8')) });
          if (autoPage) await page.locator('.page_selector').scrollIntoViewIfNeeded();
          await waitJlcListDecorated(page, autoPage ? 4 : 2);
        };
        await waitJlcListDecorated(page, 2);
        await setBreakpoint('OLD-001', 1, startPage);
        const originalId = (await readRecords())[0].id;
        if (kind === 'combo') {
          await navigate(searchUrl(2, '100'), searchFixture(2, 2, orderedCodes('HISTORY-001')));
          await setBreakpoint('HISTORY-001', 1, 2);
          assert.equal((await readRecords())[0].top_avid, 'OLD-001', 'an older page must not replace the latest item');
          assert.notEqual(await page.locator('#jlc-tracking-pagebar .jlc-status-pill').textContent(), '已读');
        }
        await navigate(searchUrl(latestPage, '100'), searchFixture(latestPage, kind === 'title' ? 48 : 2, orderedCodes('NEW-001')));
        await setBreakpoint('NEW-001', 1, latestPage);
        let record = (await readRecords())[0];
        assert.equal(record.id, originalId, 'native pagination without keyword must reuse the saved record');
        assert.equal(record.top_avid, 'NEW-001');
        assert.equal(record.raw_query, query, 'site headings and unrelated inputs must not pollute the query');
        assert.equal(record.unread_estimate, 0);
        assert.equal(await page.locator('#jlc-tracking-pagebar .jlc-status-pill').textContent(), '已读');

        const requests = [];
        let newestCode = 'NEW-001';
        await page.route('**/*.php*', async route => {
          const request = route.request();
          const url = new URL(request.url());
          requests.push({ url: url.href, method: request.method(), body: request.postData() || '' });
          if (request.method() === 'POST') {
            return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ID: '200', URL: 'vl_searchby' + kind + '.php' }) });
          }
          const pageNumber = Number(url.searchParams.get('page') || 1);
          return route.fulfill({ contentType: 'text/html', body: searchFixture(pageNumber, kind === 'title' ? 48 : 2,
            orderedCodes(pageNumber === latestPage ? newestCode : 'OLD-002')) });
        });
        const previousCheck = record.last_check_at;
        await page.locator('[data-jlc-page-refresh]').click();
        await waitRecords(rows => {
          const row = rows[0];
          return row?.check_note === '已追到最新' && row.last_check_at > previousCheck && !!row.manual_query;
        });
        record = (await readRecords())[0];
        assert.equal(record.top_avid, 'NEW-001', 'refresh must use the correct end of the result set');
        assert.equal(record.top_page_hint, latestPage);
        assert.equal(record.check_status, 'latest');
        assert.equal(record.unread_estimate, 0);
        assert.equal(await page.locator('#jlc-tracking-pagebar .jlc-status-pill').textContent(), '已读');
        assert.ok(requests.some(request => request.method === 'POST'));
        assert.ok(requests.some(request => Number(new URL(request.url).searchParams.get('page') || 1) === latestPage), JSON.stringify({ requests, record }));

        if (kind === 'combo') {
          await navigate(searchUrl(1, '300'), searchFixture(1, 2, orderedCodes('OTHER-001'), '|类别=强奸||类别=乱伦|'));
          await setBreakpoint('OTHER-001', 2, 1);
          assert.equal((await readRecords()).find(row => row.id === originalId).last_seen_avid, 'NEW-001',
            'different Chinese conditions must keep independent breakpoints');
        }
        await navigate(searchUrl(latestPage, '400'), searchFixture(latestPage, kind === 'title' ? 48 : 2, orderedCodes('NEW-002')));
        await setBreakpoint('NEW-002', kind === 'combo' ? 2 : 1, latestPage);
        record = (await readRecords()).find(row => row.id === originalId);
        assert.equal(record.top_avid, 'NEW-002', 'a new latest item on the same page must replace a stale top');
        assert.equal(record.last_seen_avid, 'NEW-002', 'a new searchid must still update the original record');
        assert.equal(record.unread_estimate, 0);
        newestCode = 'NEW-002';
        await navigate(searchUrl(kind === 'title' ? 47 : 1, '400', query),
          searchFixture(kind === 'title' ? 47 : 1, kind === 'title' ? 48 : 2,
            orderedCodes(kind === 'title' ? 'OLD-002' : 'NEW-002')), true);
        await setBreakpoint(kind === 'title' ? 'NEW-002' : 'OLD-002', kind === 'combo' ? 2 : 1, kind === 'title' ? 48 : 2);
        record = (await readRecords()).find(row => row.id === originalId);
        assert.equal(record.top_page_hint, latestPage);
        assert.equal(record.page_size_hint, 2, 'concatenated pages must not inflate the per-page size');
        assert.equal(record.unread_estimate, kind === 'title' ? 0 : 2,
          'loaded pages must use the actual breakpoint position without counting the page gap twice');
      }
    );
  }

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
      await openAndCheckTitle(page, /控制台/i, 25000);
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
          fav_tags: ['Priority', ' priority ', 'Scene'],
          custom_persons: ['Known', 'Another'],
          webdav_enabled: false,
        },
      },
      beforeInject: async (page) => {
        await page.evaluate(installJlcStorageMetrics);
      },
      beforeScript: async (page) => {
        await page.evaluate(async () => {
          await window.__seedJlcLibrary({ movieIds: ['TEST-001'] });
          window.GM_setClipboard = text => { window.__copiedMetaTag = text; };
          const setValue = window.GM_setValue;
          window.GM_setValue = (key, value) => {
            if (key === 'jlc_config_stable' && window.__failTagSave) throw new Error('Storage unavailable');
            return setValue(key, value);
          };
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
                    genres: ['Priority', 'Genre ' + index, ...(index === 2
                      ? ['Scene', 'Priority Extended', ...Array.from({ length: 14 }, (_, tagIndex) => '分类标签 ' + (tagIndex + 1))]
                      : [])],
                    actors: index === 1 ? ['Known', 'Another'] : index === 4 ? ['Known'] : [],
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
        50,
        'every card should render its matching hot tag'
      );
      assert.equal(
        await page.locator('[data-jlc-avid="TEST-001"]').evaluate(item => item.classList.contains('emby-item')),
        true,
        'the startup Emby snapshot should decorate matching cards'
      );
      const card = index => page.locator('[data-jlc-avid="TEST-' + String(index).padStart(3, '0') + '"]');
      const frameColor = index => card(index).locator('.box-b').evaluate(el => getComputedStyle(el).outlineColor);
      assert.equal(await page.locator('#grid-b .preference-match-item').count(), 3, 'metadata arrival updates automatic highlights');
      for (const index of [1, 2, 4]) {
        assert.equal(await card(index).locator('.b-preference').textContent(), '偏好命中 2 项');
      }
      assert.equal(await frameColor(1), 'rgb(82, 181, 75)', 'Emby keeps green while exposing preference count');
      assert.equal(await frameColor(2), 'rgb(255, 204, 0)', 'two different tags produce gold');
      assert.equal(await frameColor(4), 'rgb(255, 204, 0)', 'one tag and a familiar actor produce gold');
      assert.equal(await card(3).locator('.b-preference').count(), 0, 'duplicate configured tags do not pass the threshold');
      assert.deepEqual(await page.evaluate(() => window.__readJlcStore('videos')), [], 'automatic matches never write manual marks');
      const assertCompactTags = async () => {
        const layout = await card(2).evaluate(item => {
          const cover = item.querySelector('.cover-b').getBoundingClientRect();
          const badges = item.querySelector('.jlc-badge-container').getBoundingClientRect();
          const overlay = item.querySelector('.meta-overlay-box');
          const tags = [...overlay.querySelectorAll('.meta-tag:not(.more)')].map(tag => tag.getBoundingClientRect());
          return {
            maxTagHeight: Math.max(...tags.map(rect => rect.height)),
            contained: badges.bottom <= cover.bottom && badges.right <= cover.right,
            scrollable: overlay.scrollHeight > overlay.clientHeight && getComputedStyle(overlay).overflowY === 'auto'
          };
        });
        assert.ok(layout.maxTagHeight <= 20, 'interactive tags retain their compact height');
        assert.equal(layout.contained, true, 'dense tags stay within the cover');
        assert.equal(layout.scrollable, true, 'excess tags remain reachable by scrolling');
      };
      await assertCompactTags();
      const fullWidthTag = card(2).getByRole('button', { name: '复制标签：Priority Extended', exact: true });
      assert.equal(await fullWidthTag.evaluate(el => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return el.childElementCount === 0 && el.scrollWidth <= el.clientWidth
          && el.getBoundingClientRect().width <= range.getBoundingClientRect().width + 16;
      }), true, 'plain text tags reserve no width for a secondary control');
      assert.match(await fullWidthTag.getAttribute('title'), /Priority Extended\n单击复制；右键或长按/);
      const touch = await page.context().newCDPSession(page);
      await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
      await page.setViewportSize({ width: 390, height: 844 });
      await assertCompactTags();
      const lastVisibleTag = card(2).getByRole('button', { name: '复制标签：分类标签 8', exact: true });
      await lastVisibleTag.scrollIntoViewIfNeeded();
      const rect = await lastVisibleTag.boundingBox();
      const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      const touchStart = () => touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      const touchEnd = () => touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await touchStart();
      await touchEnd();
      assert.equal(await page.evaluate(() => window.__copiedMetaTag), '分类标签 8', 'scrolling exposes compact tags for copying');
      await page.evaluate(() => { window.__copiedMetaTag = 'unchanged'; });
      await touchStart();
      await page.locator('#jlc-meta-tag-menu:popover-open').waitFor({ timeout: 1500 });
      await touchEnd();
      assert.equal(await page.evaluate(() => window.__copiedMetaTag), 'unchanged', 'releasing a long press does not copy');
      await page.keyboard.press('Escape');
      await touchStart();
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x, y: point.y - 35 }] });
      await touchEnd();
      await page.waitForTimeout(550);
      assert.equal(await page.locator('#jlc-meta-tag-menu:popover-open').count(), 0, 'scroll gestures cancel long press');
      assert.equal(await page.evaluate(() => window.__copiedMetaTag), 'unchanged', 'scroll gestures do not copy');
      if (process.env.CREAMU_E2E_SCREENSHOTS) {
        await card(2).screenshot({ path: process.env.CREAMU_E2E_SCREENSHOTS + '/jlc-compact-tags-touch.png' });
      }
      await touch.send('Emulation.setTouchEmulationEnabled', { enabled: false });
      await touch.detach();
      await page.setViewportSize({ width: 1280, height: 800 });
      const originalUrl = page.url();
      await card(2).getByRole('button', { name: '复制标签：Priority Extended', exact: true }).press('Enter');
      assert.equal(await page.evaluate(() => window.__copiedMetaTag), 'Priority Extended', 'copy uses the full name even when visually truncated');
      await card(2).getByRole('button', { name: '复制标签：Priority', exact: true }).press('Shift+F10');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#jlc-meta-tag-menu:popover-open').count(), 0, 'Escape dismisses the tag menu');
      await card(2).getByRole('button', { name: '复制标签：Priority', exact: true }).click({ button: 'right' });
      assert.equal(await page.evaluate(() => window.__copiedMetaTag), 'Priority Extended', 'opening the context menu does not copy');
      if (process.env.CREAMU_E2E_SCREENSHOTS) {
        await page.screenshot({ path: process.env.CREAMU_E2E_SCREENSHOTS + '/jlc-tag-menu.png' });
      }
      await page.evaluate(() => { window.__failTagSave = true; });
      await page.getByRole('button', { name: '在所有影片中隐藏此标签', exact: true }).click();
      await page.getByText('标签显示设置保存失败，请重试。', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: '复制标签：Priority', exact: true }).count(), 48, 'failed persistence does not hide tags');
      await page.evaluate(() => { window.__failTagSave = false; });
      await page.getByRole('button', { name: '在所有影片中隐藏此标签', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: '复制标签：Priority', exact: true }).count(), 0, 'hiding affects every rendered film');
      assert.equal(await card(2).getByRole('button', { name: '复制标签：Priority Extended', exact: true }).count(), 1, 'hiding matches the complete tag, not a substring');
      assert.deepEqual(await page.evaluate(() => GM_getValue('jlc_config_stable').hidden_meta_tags), ['Priority']);
      assert.equal(await card(2).locator('.b-preference').textContent(), '偏好命中 2 项');
      assert.equal(await frameColor(2), 'rgb(255, 204, 0)', 'display preferences do not change matching');
      assert.equal(page.url(), originalUrl, 'tag controls do not navigate');
      assert.deepEqual(await page.evaluate(() => window.__readJlcStore('videos')), [], 'tag controls do not mark films as visited');
      assert.equal(await page.evaluate(() => window.__creamuMetaStats.requests.length), 48, 'display changes do not refetch metadata');
      await (await waitFab(page)).click();
      await waitWorkbenchOpen(page);
      await page.locator('#jlc-wb-settings-btn').click();
      await page.locator('[data-jlc-settings-tab="display"]').click();
      if (process.env.CREAMU_E2E_SCREENSHOTS) {
        await page.getByRole('button', { name: '恢复显示标签：Priority', exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: process.env.CREAMU_E2E_SCREENSHOTS + '/jlc-hidden-tags-settings.png' });
      }
      await page.getByRole('button', { name: '恢复显示标签：Priority', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: '复制标签：Priority', exact: true }).count(), 48, 'restoring refreshes every rendered film');
      assert.deepEqual(await page.evaluate(() => GM_getValue('jlc_config_stable').hidden_meta_tags), []);
      await page.locator('#jlc-wb-settings-close').click();
      await page.locator('#jlc-wb-close-btn').click();
      if (process.env.CREAMU_E2E_SCREENSHOTS) {
        for (const index of [1, 2, 4]) {
          await card(index).screenshot({ path: process.env.CREAMU_E2E_SCREENSHOTS + '/jlc-preference-' + index + '.png' });
        }
      }

      await card(2).locator('.jlc-card-more summary').click();
      await card(2).getByRole('button', { name: '屏蔽', exact: true }).click();
      await card(2).getByRole('button', { name: '取消屏蔽', exact: true }).waitFor();
      assert.notEqual(await frameColor(2), 'rgb(255, 204, 0)', 'manual blocking suppresses automatic gold');
      await card(2).getByRole('button', { name: '取消屏蔽', exact: true }).click();
      await card(2).getByRole('button', { name: '屏蔽', exact: true }).waitFor();
      assert.equal(await frameColor(2), 'rgb(255, 204, 0)', 'undoing a block restores the qualifying frame');
      await card(3).locator('.jlc-card-more summary').click();
      await card(3).getByRole('button', { name: '心动', exact: true }).click();
      await card(3).getByRole('button', { name: '取消心动', exact: true }).waitFor();
      assert.equal(await frameColor(3), 'rgb(255, 204, 0)', 'manual like needs no automatic threshold');
      const manualMarks = await page.evaluate(() => window.__readJlcStore('videos'));
      await (await waitFab(page)).click();
      await waitWorkbenchOpen(page);
      await openWorkbenchNav(page, 'filter');
      const favorites = page.getByRole('textbox', { name: '心动标签', exact: true });
      await favorites.fill('');
      await favorites.dispatchEvent('change');
      await page.waitForFunction(() => !document.querySelector('#grid-b .preference-match-item'));
      assert.equal(await page.locator('#grid-b .b-preference').count(), 0, 'editing preferences removes stale counts');
      assert.equal(await frameColor(1), 'rgb(82, 181, 75)');
      assert.notEqual(await frameColor(2), 'rgb(255, 204, 0)');
      assert.equal(await frameColor(3), 'rgb(255, 204, 0)', 'editing preferences preserves manual gold');
      await favorites.fill('Priority, priority, Scene');
      await favorites.dispatchEvent('change');
      await page.waitForFunction(() => document.querySelectorAll('#grid-b .preference-match-item').length === 3);
      assert.equal(await frameColor(2), 'rgb(255, 204, 0)', 'cached metadata restores qualifying frames');
      assert.deepEqual(await page.evaluate(() => window.__readJlcStore('videos')), manualMarks, 'preference edits never alter manual marks');
      await page.locator('#jlc-wb-close-btn').click();
      const genre3 = card(3).getByRole('button', { name: '复制标签：Genre 3', exact: true });
      await genre3.click({ button: 'right' });
      await page.evaluate(() => { window.__failTagSave = true; });
      await page.getByRole('button', { name: '添加到心动标签', exact: true }).click();
      await page.getByText('心动标签保存失败，请重试。', { exact: true }).waitFor();
      assert.deepEqual(await page.evaluate(() => GM_getValue('jlc_config_stable').fav_tags), ['Priority', 'Scene']);
      assert.equal(await genre3.evaluate(el => el.classList.contains('hot')), false);
      await page.evaluate(() => { window.__failTagSave = false; });
      await page.getByRole('button', { name: '添加到心动标签', exact: true }).click();
      // Keyword matching also includes Genre 30–39; each configured keyword still counts once.
      await page.waitForFunction(() => document.querySelectorAll('#grid-b .preference-match-item').length === 14);
      assert.equal(await genre3.evaluate(el => el.classList.contains('hot')), true, 'new favorite updates tag color');
      assert.equal(await card(3).locator('.b-preference').textContent(), '偏好命中 2 项');
      assert.equal(await card(30).locator('.b-preference').textContent(), '偏好命中 2 项', 'offscreen films update through the same matching rules');
      assert.deepEqual(await page.evaluate(() => GM_getValue('jlc_config_stable').fav_tags), ['Priority', 'Scene', 'Genre 3']);
      assert.equal(await page.locator('#jlc-wb-i-fav').inputValue(), 'Priority, Scene, Genre 3', 'menu updates the existing settings field');
      await genre3.click({ button: 'right' });
      assert.equal(await page.getByRole('button', { name: '已添加到心动标签', exact: true }).isDisabled(), true, 'reopening cannot add duplicates');
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => window.__creamuMetaStats.requests.length), 48, 'favorite changes reuse metadata');
      assert.deepEqual(await page.evaluate(() => window.__readJlcStore('videos')), manualMarks, 'favorite tags do not change manual marks');
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
      await openAndCheckTitle(page, /控制台/i, 25000);
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
        if (tab === 'display') {
          await exerciseJlcCoverDownloadDialog(page, 'JLC mobile cover download dialog');
        }
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
