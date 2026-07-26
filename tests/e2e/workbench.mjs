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
