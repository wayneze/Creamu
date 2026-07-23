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
const MAX_BATCH_TRANSACTIONS = 16;
const MAX_STARTUP_TRACKING_TRANSACTIONS = 4;
const MAX_INITIAL_META_REQUESTS = 24;

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
      const works = page.locator('#jlc-wb .jlc-wb-nav button[data-nav="works"]');
      await works.waitFor();
      await works.click();
      await page.locator('#jlc-wb .jlc-wb-nav button.active[data-nav="works"]').waitFor();

      await page.locator('#jlc-wb-close-btn').click();
      await waitWorkbenchClosed(page);
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
    },
    async (page) => {
      await waitJlcListDecorated(page);
      await openAndCheckTitle(page, /JavLibrary|Creamu/i, 25000);
      await exerciseWorkbenchGeometry(page, {
        fab: 'jlcFabDragBound',
        panel: 'jlcPanelResizeBound',
        header: 'jlcPanelDragBound',
      });
      await page.locator('#jlc-wb .jlc-wb-nav button[data-nav="library"]').click();
      await page.locator('#jlc-wb .jlc-wb-nav button.active[data-nav="library"]').waitFor();
      await page.locator('#jlc-wb .jlc-wb-nav button[data-nav="filter"]').click();
      await page.locator('#jlc-wb .jlc-wb-nav button.active[data-nav="filter"]').waitFor();

      await page.locator('#jlc-wb-close-btn').click();
      await waitWorkbenchClosed(page, 25000);
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
        await page.evaluate(() => {
          window.__creamuIdbTransactions = { total: 0, byStore: {} };
          window.__creamuCommanderRescanIntervals = 0;
          const original = IDBDatabase.prototype.transaction;
          if (original.__creamuCounted) return;
          function countedTransaction(storeNames, ...args) {
            const stats = window.__creamuIdbTransactions;
            const stores = typeof storeNames === 'string'
              ? [storeNames]
              : Array.from(storeNames || []);
            stats.total += 1;
            stores.forEach((store) => {
              stats.byStore[store] = (stats.byStore[store] || 0) + 1;
            });
            return original.call(this, storeNames, ...args);
          }
          countedTransaction.__creamuCounted = true;
          IDBDatabase.prototype.transaction = countedTransaction;
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
      const transactionStats = await page.evaluate(() => window.__creamuIdbTransactions);
      console.log('      IndexedDB transactions: ' + JSON.stringify(transactionStats));
      assert.ok(
        transactionStats.total <= MAX_BATCH_TRANSACTIONS,
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
      beforeScript: async (page) => {
        await page.evaluate(() => {
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
      const stats = await page.evaluate(() => window.__creamuMetaStats);
      console.log('      MetaTube requests: ' + stats.requests.length + ', max concurrency: ' + stats.maxActive);
      assert.ok(stats.maxActive <= 8, 'metadata concurrency exceeded the configured limit');
      assert.equal(stats.requests.length, 48, 'each card should issue one metadata request');
      assert.equal(new Set(stats.requests).size, 48, 'metadata requests should not repeat an avid');
      assert.equal(
        await page.locator('#grid-b .item-b .meta-tag.hot').count(),
        48,
        'every card should render its matching hot tag'
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
