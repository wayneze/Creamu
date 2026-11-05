import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { PATHS, openScriptPage, waitFab, waitWorkbenchOpen, assertNoRuntimeErrors } from './helpers.mjs';

const screenshotDir = process.env.CREAMU_E2E_SCREENSHOTS;
const cover = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect width="640" height="420" fill="#d8cfbf"/><text x="36" y="370" fill="#645744" font-size="32">ABP-001 · COVER</text></svg>');
const cases = [
  {
    host: 'www.javlibrary.com',
    html: `<style>
      .icn_favstar, .icn_favdirector, .icn_favmaker, .icn_favlabel {
        display: inline-block; width: 24px; height: 24px; background-image: url('../img/icn-black.png');
        background-position: -24px 0; background-repeat: no-repeat; cursor: pointer; margin: 0; vertical-align: middle;
      }
      #rightcolumn, #video_title { border: 1px solid #ccc; }
      #video_info .item { margin: 10px 0; padding: 4px 0; }
      #video_info .header { width: 100px; text-align: right; }
      #video_info .cast, #video_info .genre { background: #eee; padding: 4px; }
      #video_favorite_edit .favoritetype { display: block; margin: 10px; }
      .smallbutton { background: #eee; color: black; }
      .smalldarkbutton { background: #333; color: white; }
      .hidden { display: none; }
      </style><div id="toplogo">Original logo</div><div id="topsearch"><form><input name="keyword" aria-label="原站搜索"><input type="submit" value="搜索"></form></div>
      <aside id="leftmenu"><a href="/cn/vl_newrelease.php">新发行</a><button id="native-action">原站操作</button></aside>
      <main id="rightcolumn"><div id="video_title"><h3><a href="?v=abp001">ABP-001 示例影片</a></h3></div>
      <table id="video_jacket_info"><tbody><tr><td id="video_jacket"><img id="video_jacket_img" src="${cover}" alt="示例封面"></td>
      <td><div id="video_info">
      <div id="video_id"><table><tbody><tr><td class="header">番号</td><td class="text">ABP-001</td></tr></tbody></table></div>
      <div id="video_date"><table><tbody><tr><td class="header">发行日期</td><td class="text">2026-07-28</td></tr></tbody></table></div>
      <div id="video_director"><table><tbody><tr><td class="header">导演</td><td class="text"><span class="director"><a href="vl_director.php?d=sample">示例导演</a> &nbsp;<span id="director_sample" class="icn_favdirector" title="将这导演加入我最爱的导演名单。"></span></span></td></tr></tbody></table></div>
      <div id="video_maker"><table><tbody><tr><td class="header">制作商</td><td class="text"><span class="maker"><a href="vl_maker.php?m=sample">示例制作商</a> &nbsp;<span id="maker_sample" class="icn_favmaker" title="将这制作商加入我最爱的制作商名单。"></span></span></td></tr></tbody></table></div>
      <div id="video_label"><table><tbody><tr><td class="header">发行商</td><td class="text"><span class="label"><a href="vl_label.php?l=sample">示例发行商</a> &nbsp;<span id="label_sample" class="icn_favlabel" title="将这发行商加入我最爱的发行商名单。"></span></span></td></tr></tbody></table></div>
      <div id="video_genres"><table><tbody><tr><td class="header">类别</td><td class="text"><span class="genre"><a href="vl_genre.php?g=sample">剧情</a></span><span class="genre"><a href="vl_genre.php?g=second">高清作品</a></span></td><td class="icon"></td></tr></tbody></table></div>
      <div id="video_cast"><table><tbody><tr><td class="header">演员</td><td class="text">
      <span class="cast"><span class="star"><a href="vl_star.php?s=sample">示例演员</a></span><span>(演员别名)</span><span id="star_sample" class="icn_favstar" title="将这演员加入我最爱的演员名单。"></span></span>
      <span class="cast"><span class="star"><a href="vl_star.php?s=second">第二位演员</a></span><span id="star_second" class="icn_favstar" title="将这演员加入我最爱的演员名单。"></span></span>
      </td></tr></tbody></table></div></div></td></tr></tbody></table>
      <div id="video_favorite_edit">
      <span id="subscribed" class="favoritetype"><button type="button" class="smalldarkbutton hidden">我已经许愿了</button><button type="button" class="smallbutton">我想要</button> (<a href="userswanted.php?v=sample">329</a> 个使用者想要这影片)</span>
      <span id="watched" class="favoritetype"><button type="button" class="smalldarkbutton hidden">我看过这片了</button><button type="button" class="smallbutton">看过了</button> (<a href="userswatched.php?v=sample">275</a> 个使用者看过这影片)</span>
      <span id="owned" class="favoritetype"><button type="button" class="smalldarkbutton hidden">我拥有这片了</button><button type="button" class="smallbutton">已拥有</button> (<a href="usersowned.php?v=sample">283</a> 个使用者拥有这影片)</span>
      </div><section id="native-comments">原站评论</section></main>`,
    info: '#video_info', title: '#video_title', cover: '#video_jacket'
  },
  {
    host: 'www.javbus.com',
    html: `<nav class="navbar"><button id="native-action">原站操作</button></nav><main class="container">
      <h3>ABP-001 示例影片</h3><div class="row movie"><div class="col-md-9 screencap"><a class="bigImage" href="#native-cover"><img src="${cover}" alt="示例封面"></a></div>
      <div class="col-md-3 info"><p><span class="header">識別碼:</span> <span data-clipboard-text="ABP-001">ABP-001</span></p>
      <p><span class="header">發行日期:</span> 2026-07-28</p><p><a href="/star/sample">示例演员</a> <a href="/star/second">第二位演员</a></p>
      <button id="native-favorite">原站收藏</button></div></div><section id="native-comments">原站评论</section></main>`,
    info: '.col-md-3.info', title: '.container > h3', cover: '.screencap'
  },
  {
    host: 'javdb.com',
    html: `<nav class="navbar"><button id="native-action">原站操作</button></nav><main class="section"><div class="container">
      <h2 class="title is-4">ABP-001 示例影片</h2><div class="columns"><div class="column-video-cover"><img src="${cover}" alt="示例封面"></div>
      <div class="video-meta-panel"><div class="panel-block first-block"><strong>番號:</strong><span class="value" data-clipboard-text="ABP-001">ABP-001</span></div>
      <div class="panel-block"><strong>日期:</strong><span class="value">2026-07-28</span></div>
      <div class="panel-block"><strong>演員:</strong><span class="value"><a href="/actors/sample">示例演员</a><strong>♀</strong> <a href="/actors/second">第二位演员</a><strong>♀</strong></span></div><button id="native-favorite">原站收藏</button></div></div>
      <section id="native-comments">原站评论</section></div></main>`,
    info: '.video-meta-panel', title: 'h2.title', cover: '.column-video-cover'
  }
];

const browser = await chromium.launch({ headless: true });
try {
  const listSession = await openScriptPage(browser, {
    host: 'www.javlibrary.com', fixtureFile: 'javlibrary-list.html',
    scriptPath: PATHS.jlcDist, needJquery: true, gmValues: { version: '20250311', columnNumFull: 5 },
    viewport: { width: 1600, height: 960 },
    beforeScript: page => page.evaluate(() => {
      window.__nativeMenu = document.getElementById('leftmenu');
      window.__menuClicks = 0;
      window.__nativeSearch = document.querySelector('#topmenu form');
      window.__nativeAccount = document.querySelector('#topmenu .menu a');
      window.__accountClicks = 0;
      window.__nativeDisplayMode = document.querySelector('.displaymode select');
      window.__nativeDisplayMode.addEventListener('change', event => { window.__displayMode = event.target.value; });
      window.__nativeSearch.addEventListener('submit', event => {
        event.preventDefault();
        window.__submittedKeyword = new FormData(event.target).get('keyword');
      });
      window.__nativeAccount.addEventListener('click', event => {
        event.preventDefault();
        window.__accountClicks++;
      });
      document.querySelector('#leftmenu a').addEventListener('click', event => {
        event.preventDefault();
        window.__menuClicks++;
      });
    })
  });
  try {
    const { page, runtimeErrors } = listSession;
    await page.locator('#jlc-tracking-pagebar').waitFor();
    assert.equal(await page.locator('.jlc-page-search').evaluate(el => el.contains(window.__nativeSearch)), true, 'nested native search must leave topmenu before it is moved');
    await page.getByRole('textbox', { name: '原站搜索' }).fill('ABP-001');
    await page.getByRole('button', { name: '识别码搜寻' }).click();
    assert.equal(await page.evaluate(() => window.__submittedKeyword), 'ABP-001', 'native form listener and input survive');
    const title = await page.locator('.boxtitle').boundingBox();
    const bar = await page.locator('#jlc-tracking-pagebar').boundingBox();
    assert.ok(title.y + title.height <= bar.y, 'native title must occupy its own row above tracking');
    await page.getByRole('combobox', { name: '影片显示方式' }).selectOption('1');
    assert.equal(await page.evaluate(() => window.__displayMode), '1', 'native display mode listener survives');
    assert.equal(await page.locator('.displaymode select').evaluate(el => el === window.__nativeDisplayMode), true);
    assert.equal(await page.locator('.boxtitle').evaluate(el => getComputedStyle(el).fontSize), '22px', 'heading overrides legacy ID-scoped font');
    assert.equal(await page.locator('#rightcolumn').evaluate(el => getComputedStyle(el).borderTopWidth), '0px');
    if (screenshotDir) await page.screenshot({ path: screenshotDir + '/jlc-list-heading.png' });
    await page.evaluate(() => {
      const grid = document.getElementById('grid-b');
      // Fill the row to exercise the navigation overlapping the rightmost card.
      const card = grid.firstElementChild;
      for (let i = 0; i < 7; i++) grid.append(card.cloneNode(true));
      grid.querySelectorAll('.item-b').forEach(item => {
        const badge = document.createElement('div');
        badge.className = 'jlc-badge-container';
        // Enable hit testing only in this probe so elementsFromPoint can measure paint order.
        badge.innerHTML = '<span class="jlc-badge b-person" style="pointer-events:auto">熟人</span>';
        item.append(badge);
      });
    });
    const menu = page.locator('.jlc-native-navigation');
    const account = page.locator('.jlc-native-account');
    await account.locator('summary').click();
    assert.equal(await account.evaluate(el => el.contains(window.__nativeAccount)), true, 'account link retains node identity');
    assert.equal(await account.getByRole('link', { name: '收件夹 2' }).count(), 1, 'unread count survives');
    assert.equal(await account.locator('form').count(), 0, 'search is not part of account menu');
    assert.equal(await menu.locator('#topmenu').count(), 0, 'account is not part of site navigation');
    await account.getByRole('link', { name: '我的账号' }).click();
    assert.equal(await page.evaluate(() => window.__accountClicks), 1);
    const accountSize = await account.locator(':scope > div').boundingBox();
    assert.ok(accountSize.height < 200 && accountSize.width < 240, 'account menu stays compact without inherited sidebar whitespace');
    if (screenshotDir) await page.screenshot({ path: screenshotDir + '/jlc-account-menu.png' });
    await menu.locator('summary').click();
    assert.equal(await account.getAttribute('open'), null, 'opening navigation closes account menu');
    const navigationSize = await menu.locator(':scope > div').boundingBox();
    assert.ok(navigationSize.height < 350, 'site navigation excludes the old sidebar spacer');
    assert.equal(await page.evaluate(() => document.querySelector('.jlc-native-navigation').contains(window.__nativeMenu)), true);
    const navState = await menu.evaluate(el => {
      const popup = el.querySelector(':scope > div');
      const rect = popup.getBoundingClientRect();
      const overlappedBadges = [...document.querySelectorAll('#grid-b .jlc-badge')].filter(badge => {
        const b = badge.getBoundingClientRect();
        return b.left < rect.right && b.right > rect.left && b.top < rect.bottom && b.bottom > rect.top;
      });
      return {
        darkBlocks: [...el.querySelectorAll('#leftmenu *')].filter(node => {
          const bg = getComputedStyle(node).backgroundColor;
          return bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgb(255, 253, 249)';
        }).length,
        overlappedBadges: overlappedBadges.length,
        paintedAboveBadges: overlappedBadges.every(badge => {
          const b = badge.getBoundingClientRect();
          const x = (Math.max(b.left, rect.left) + Math.min(b.right, rect.right)) / 2;
          const y = (Math.max(b.top, rect.top) + Math.min(b.bottom, rect.bottom)) / 2;
          return document.elementsFromPoint(x, y).indexOf(popup) < document.elementsFromPoint(x, y).indexOf(badge);
        })
      };
    });
    assert.equal(navState.darkBlocks, 0, 'native nested menu backgrounds must be reset');
    assert.ok(navState.overlappedBadges > 0, 'fixture must overlap navigation and card badges');
    assert.equal(navState.paintedAboveBadges, true, 'navigation must paint above card badges');
    await page.locator('#leftmenu a').first().click();
    assert.equal(await page.evaluate(() => window.__menuClicks), 1, 'native menu listeners survive');
    if (screenshotDir) await page.screenshot({ path: screenshotDir + '/jlc-list-navigation.png' });
    await menu.locator('summary').click();
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 640 }]) {
      await page.setViewportSize(viewport);
      await menu.locator('summary').click();
      const popup = await menu.locator(':scope > div').boundingBox();
      assert.ok(popup.x >= 0 && popup.x + popup.width <= viewport.width, 'navigation fits narrow viewport');
      await account.locator('summary').click();
      assert.equal(await menu.getAttribute('open'), null);
      const accountPopup = await account.locator(':scope > div').boundingBox();
      assert.ok(accountPopup.x >= 0 && accountPopup.x + accountPopup.width <= viewport.width, 'account fits narrow viewport');
      await page.keyboard.press('Escape');
      assert.equal(await account.getAttribute('open'), null);
      assert.equal(await account.locator('summary').evaluate(el => el === document.activeElement), true, 'Escape restores account trigger focus');
      assert.equal(await page.locator('.jlc-page-search').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'search fits narrow viewport');
      assert.equal(await page.locator('.displaymode').evaluate(el => el.scrollWidth <= el.clientWidth + 1 && el.getBoundingClientRect().right <= innerWidth), true, 'list filters fit narrow viewport');
    }
    assertNoRuntimeErrors(runtimeErrors);
    console.log('OK native search, account separation, list title, navigation and responsive menus');
  } finally {
    await listSession.context.close();
  }

  const signedOutSession = await openScriptPage(browser, {
    host: 'www.javlibrary.com', fixtureFile: 'javlibrary-list.html',
    scriptPath: PATHS.jlcDist, needJquery: true, gmValues: { version: '20250311' },
    beforeScript: page => page.evaluate(() => {
      document.querySelector('[data-fixture-account]').innerHTML = '[<a href="/cn/login.php">登录</a>] | <a href="/cn/register.php">注册</a>';
      const search = document.getElementById('topsearch');
      search.replaceWith(...search.childNodes);
    })
  });
  try {
    const { page } = signedOutSession;
    await page.locator('.jlc-native-account summary').click();
    assert.equal(await page.locator('.jlc-native-account').getByRole('link', { name: '登录', exact: true }).count(), 1);
    assert.equal(await page.locator('.jlc-native-account').getByRole('link', { name: '注册', exact: true }).count(), 1);
    assert.equal(await page.locator('.jlc-page-search form[action="/cn/vl_searchbyid.php"]').count(), 1);
    assert.equal(await page.locator('.jlc-page-search').getByRole('link', { name: '进阶搜寻' }).count(), 1);
    await page.locator('.boxtitle').click();
    assert.equal(await page.locator('.jlc-native-account').getAttribute('open'), null, 'outside click dismisses account menu');
    assertNoRuntimeErrors(signedOutSession.runtimeErrors);
    console.log('OK signed-out native account and search');
  } finally {
    await signedOutSession.context.close();
  }

  const cardSession = await openScriptPage(browser, {
    host: 'www.javlibrary.com', fixtureFile: 'javlibrary-list.html',
    scriptPath: PATHS.jlcDist, needJquery: true,
    gmValues: { version: '20250311', columnNumFull: 4 },
    viewport: { width: 1440, height: 1000 },
    beforeScript: page => page.evaluate(() => {
      window.GM_setClipboard = value => { window.__copied = value; };
      window.GM_download = options => {
        window.__download = { url: options.url, name: options.name };
        options.onload({});
      };
      const request = window.GM_xmlhttpRequest;
      window.GM_xmlhttpRequest = options => {
        window.__resourceUrls ||= [];
        window.__resourceUrls.push(options.url);
        request(options);
      };
      const transaction = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function (stores, mode, ...args) {
        const tx = transaction.call(this, stores, mode, ...args);
        if (window.__failCardSave && mode === 'readwrite' && stores === 'videos') tx.abort();
        return tx;
      };
      window.__readCardStore = store => new Promise((resolve, reject) => {
        const open = indexedDB.open('JavLibCommander_Permanent');
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(store, 'readonly');
          const get = tx.objectStore(store).getAll();
          tx.oncomplete = () => { db.close(); resolve(get.result); };
          tx.onerror = () => { db.close(); reject(tx.error); };
        };
        open.onerror = () => reject(open.error);
      });
    })
  });
  try {
    const { page, runtimeErrors } = cardSession;
    const card = page.locator('#grid-b .item-b').first();
    const toolbar = card.locator('.toolbar-b');
    const readVisitedMask = () => card.locator('.cover-b').evaluate(el => {
      const style = getComputedStyle(el, '::after');
      return { content: style.content, background: style.backgroundColor, pointerEvents: style.pointerEvents, layer: Number(style.zIndex) };
    });
    await toolbar.getByRole('button', { name: '设为断点', exact: true }).waitFor();
    assert.equal((await readVisitedMask()).content, 'none', 'unvisited covers stay clear');
    assert.equal(await toolbar.locator('button:visible').count(), 1, 'only the breakpoint button stays visible');
    if (screenshotDir) await card.locator('.detail-b').screenshot({ path: screenshotDir + '/jlc-card-actions.png' });
    await card.locator('.avid-line-b [name=copy]').click();
    assert.equal(await page.evaluate(() => window.__copied), 'SSIS-001');
    assert.deepEqual(await readVisitedMask(), {
      content: '""', background: 'rgba(0, 0, 0, 0.16)', pointerEvents: 'none', layer: 1
    }, 'visited cover gets a light mask beneath the tag layer without blocking clicks');
    await toolbar.locator('summary').click();
    assert.equal(await toolbar.locator('[name=magnet]').count(), 0, 'JavLibrary has no list magnet action');
    await toolbar.getByRole('button', { name: '心动', exact: true }).click();
    await toolbar.getByRole('button', { name: '取消心动', exact: true }).waitFor();
    assert.equal((await page.evaluate(() => window.__readCardStore('videos')))[0].status, 'like');
    const readFrame = () => card.locator('.box-b').evaluate(el => {
      const style = getComputedStyle(el);
      return { color: style.outlineColor, width: style.outlineWidth, style: style.outlineStyle, shadow: style.boxShadow };
    });
    let frame = await readFrame();
    assert.equal(frame.color, 'rgb(255, 204, 0)', 'liked frame remains distinct after visiting');
    assert.equal(frame.width, '4px', 'liked frame keeps its strong visual weight');
    assert.notEqual(frame.shadow, 'none', 'liked frame retains its glow');
    if (screenshotDir) await card.screenshot({ path: screenshotDir + '/jlc-liked-frame.png' });
    // Check overlapping visual states against the same rendered card.
    await card.evaluate(el => el.classList.add('emby-item'));
    frame = await readFrame();
    assert.equal(frame.color, 'rgb(82, 181, 75)', 'Emby frame takes precedence over liked');
    assert.equal(frame.width, '4px');
    assert.notEqual(frame.shadow, 'none');
    if (screenshotDir) await card.screenshot({ path: screenshotDir + '/jlc-emby-frame.png' });
    await card.evaluate(el => el.classList.remove('emby-item'));
    await toolbar.getByRole('button', { name: '屏蔽', exact: true }).click();
    await toolbar.getByRole('button', { name: '取消屏蔽', exact: true }).waitFor();
    assert.equal((await page.evaluate(() => window.__readCardStore('videos')))[0].status, 'hate');
    await toolbar.getByRole('button', { name: '取消屏蔽', exact: true }).click();
    await toolbar.getByRole('button', { name: '屏蔽', exact: true }).waitFor();
    assert.equal(await card.evaluate(el => el.classList.contains('hated-item')), false, 'blocked cards remain undoable by pointer');
    assert.equal((await page.evaluate(() => window.__readCardStore('videos')))[0].status, 'none');
    frame = await readFrame();
    assert.equal(frame.color, 'rgb(102, 102, 102)', 'clearing marks restores the visited gray frame');
    assert.equal(frame.width, '3px');
    assert.equal(frame.style, 'solid');
    assert.equal((await readVisitedMask()).background, 'rgba(0, 0, 0, 0.16)', 'clearing marks preserves the visited mask');
    await page.evaluate(() => { window.__failCardSave = true; });
    await toolbar.getByRole('button', { name: '心动', exact: true }).click();
    await page.getByText('保存标记失败，请重试。', { exact: true }).waitFor();
    assert.equal(await toolbar.getByRole('button', { name: '心动', exact: true }).getAttribute('aria-pressed'), 'false', 'failed save must not claim success');
    await page.evaluate(() => { window.__failCardSave = false; });
    await toolbar.locator('button[name=download]').click();
    assert.match(await page.evaluate(() => window.__download.name), /^SSIS-001 .*\.jpg$/);
    await toolbar.locator('button[name=picture]').click();
    await page.waitForFunction(() => window.__resourceUrls.some(url => url.includes('blogjav.net')));
    if (screenshotDir) await card.locator('.detail-b').screenshot({ path: screenshotDir + '/jlc-card-more.png' });
    await toolbar.locator('summary').focus();
    await page.keyboard.press('Escape');
    assert.equal(await toolbar.locator('details').getAttribute('open'), null);
    await toolbar.getByRole('button', { name: '设为断点', exact: true }).click();
    await toolbar.getByRole('button', { name: '当前断点', exact: true }).waitFor();
    assert.equal((await readFrame()).color, 'rgb(255, 95, 86)', 'breakpoint retains its red frame');
    const tracking = await page.evaluate(() => window.__readCardStore('tracking_searches'));
    assert.equal(tracking[0].last_seen_avid, 'SSIS-001', 'primary action still stores the tracking breakpoint');
    await page.setViewportSize({ width: 390, height: 844 });
    await toolbar.locator('summary').click();
    assert.equal(await toolbar.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'expanded tools fit narrow cards');
    assertNoRuntimeErrors(runtimeErrors);
    console.log('OK card primary action, local marks and undo, copy, download and screenshot wiring');
  } finally {
    await cardSession.context.close();
  }

  for (const scale of [70, 85, 100, 110]) {
    const session = await openScriptPage(browser, {
      host: 'www.javlibrary.com', fixtureFile: 'javlibrary-list.html', scriptPath: PATHS.jlcDist,
      needJquery: true, gmValues: { version: '20250311', uiBtnScale: scale },
      viewport: { width: 1600, height: 960 }
    });
    try {
      const { page, runtimeErrors } = session;
      const fab = await waitFab(page);
      for (const corner of [{ x: 0, y: 0 }, { x: 1599, y: 0 }, { x: 0, y: 959 }, { x: 1599, y: 959 }]) {
        const start = await fab.boundingBox();
        await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
        await page.mouse.down();
        await page.mouse.move(corner.x, corner.y, { steps: 8 });
        await page.mouse.up();
        await fab.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
        const end = await fab.boundingBox();
        assert.ok(Math.abs((corner.x ? 1600 - end.x - end.width : end.x) - 8) < 1, scale + '%: horizontal edge');
        assert.ok(Math.abs((corner.y ? 960 - end.y - end.height : end.y) - 8) < 1, scale + '%: vertical edge');
        assert.equal(await page.locator('#jlc-wb').evaluate(el => el.classList.contains('is-open')), false, 'drag must not open console');
      }
      const saved = await page.evaluate(() => GM_getValue('jlc_workbench_session_v1'));
      const end = await fab.boundingBox();
      assert.ok(Math.abs(saved.fabLeft - end.x) < 1 && Math.abs(saved.fabTop - end.y) < 1, 'persist viewport coordinates');
      if (screenshotDir && scale === 85) await page.screenshot({ path: screenshotDir + '/jlc-fab-bottom-right.png' });
      const restored = await openScriptPage(browser, {
        host: 'www.javlibrary.com', fixtureFile: 'javlibrary-list.html', scriptPath: PATHS.jlcDist,
        needJquery: true, gmValues: { version: '20250311', uiBtnScale: scale, jlc_workbench_session_v1: saved },
        viewport: { width: 1600, height: 960 }
      });
      try {
        const restoredFab = await waitFab(restored.page);
        const position = await restoredFab.boundingBox();
        assert.ok(Math.abs(position.x - end.x) < 1 && Math.abs(position.y - end.y) < 1, 'restore without cumulative drift');
        await restored.page.setViewportSize({ width: 1000, height: 700 });
        await restored.page.waitForFunction(() => {
          const rect = document.getElementById('jlc-wb-fab').getBoundingClientRect();
          return rect.right <= innerWidth && rect.bottom <= innerHeight;
        });
        const clamped = await restoredFab.boundingBox();
        assert.ok(Math.abs(1000 - clamped.x - clamped.width - 8) < 1 && Math.abs(700 - clamped.y - clamped.height - 8) < 1, 'resize keeps scaled button in view');
        await restoredFab.click();
        await waitWorkbenchOpen(restored.page);
        assertNoRuntimeErrors(restored.runtimeErrors);
      } finally {
        await restored.context.close();
      }
      assertNoRuntimeErrors(runtimeErrors);
      console.log('OK FAB drag, persistence and resize at ' + scale + '%');
    } finally {
      await session.context.close();
    }
  }

  for (const testCase of cases) {
    const session = await openScriptPage(browser, {
      host: testCase.host,
      fixtureHtml: '<!doctype html><html><head><meta charset="utf-8"><title>ABP-001</title></head><body>' + testCase.html + '</body></html>',
      scriptPath: PATHS.jlcDist, needJquery: true,
      gmValues: { version: '20250311', jlc_config_stable: { fav_tags: ['示例影片'], hidden_meta_tags: ['示例影片'] } },
      viewport: { width: 1440, height: 1000 },
      beforeScript: async page => {
        await page.evaluate(({ info, title, cover }) => {
          window.__nativeNodes = [info, title, cover].map(selector => document.querySelector(selector));
          window.__nativeClicks = [];
          window.__copiedNames = [];
          window.GM_setClipboard = text => window.__copiedNames.push(text);
          window.__actorLinkClicks = 0;
          window.__coverClicks = 0;
          document.querySelector('.bigImage')?.addEventListener('click', event => {
            event.preventDefault();
            window.__coverClicks++;
          });
          window.__entityFavoriteClicks = [];
          window.__nativeEntityFavorites = Array.from(document.querySelectorAll('.icn_favstar, .icn_favdirector, .icn_favmaker, .icn_favlabel'));
          window.__nativeEntityFavorites.forEach(span => {
            // The real site reads event.target.id before opening its confirmation dialog.
            span.addEventListener('click', event => window.__entityFavoriteClicks.push(event.target.id));
          });
          document.querySelectorAll('a[href*="vl_star.php"], a[href*="/star/"], a[href*="/actors/"]').forEach(anchor => {
            anchor.addEventListener('click', event => {
              event.preventDefault();
              window.__actorLinkClicks++;
            });
          });
          ['native-action', 'native-favorite'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', () => window.__nativeClicks.push(id));
          });
          document.querySelectorAll('#video_info > div').forEach(el => el.classList.add('item'));
          window.__nativeFavoriteButtons = [...document.querySelectorAll('#video_favorite_edit button')];
          window.__nativeFavoriteButtons.forEach(button => button.addEventListener('click', event => {
            window.__nativeClicks.push('native-favorite');
            // Native state changes hide one button and reveal the sibling.
            event.target.parentElement.querySelectorAll('button').forEach(node => node.classList.toggle('hidden'));
          }));
        }, testCase);
      }
    });
    try {
      const { page, runtimeErrors } = session;
      const nativeFavorite = page.locator(testCase.host === 'www.javlibrary.com'
        ? '#subscribed button:visible' : '#native-favorite');
      await page.locator('#jlc-detail .jlc-resource-card').first().waitFor();
      assert.equal(await page.evaluate(() => window.__nativeNodes.every(node => document.getElementById('jlc-detail').contains(node))), true);
      const actorCopies = page.locator('.jlc-detail-copy-btn[data-jlc-copy-key="cast"]');
      assert.equal(await actorCopies.count(), 2, testCase.host + ': each actor has a copy button');
      await actorCopies.nth(0).click();
      await actorCopies.nth(1).press('Enter');
      assert.deepEqual(await page.evaluate(() => window.__copiedNames), ['示例演员', '第二位演员'], 'copy only the selected name, without gender markers or other actors');
      assert.equal(await page.evaluate(() => window.__actorLinkClicks), 0, 'copy must not activate the actor link');
      await page.getByRole('link', { name: '示例演员', exact: true }).click();
      assert.equal(await page.evaluate(() => window.__actorLinkClicks), 1, 'original actor link listener survives');
      await page.locator('[data-jlc-resource-refresh]').click();
      assert.equal(await actorCopies.count(), 2, 'resource refresh must not duplicate actor copy buttons');
      if (testCase.host === 'www.javlibrary.com') {
        const favoriteIds = ['director_sample', 'maker_sample', 'label_sample', 'star_sample', 'star_second'];
        assert.equal(await page.evaluate(() => window.__nativeEntityFavorites.every(node => document.getElementById(node.id) === node)), true, 'native favorite nodes survive layout and decoration');
        for (const id of favoriteIds) {
          const favorite = page.locator('#' + id);
          const style = await favorite.evaluate(el => ({
            background: getComputedStyle(el).backgroundImage,
            icon: getComputedStyle(el, '::before').maskImage,
            title: el.title
          }));
          assert.equal(style.background, 'none', 'native black sprite is replaced');
          assert.match(style.icon, /data:image\/svg\+xml/, 'favorite uses the themed heart');
          assert.ok(style.title.includes('加入我最爱的'), 'native tooltip remains intact');
          await favorite.click();
          assert.equal(await favorite.evaluate(el => getComputedStyle(el).color), 'rgb(145, 87, 51)', 'hover uses the theme accent');
        }
        assert.deepEqual(await page.evaluate(() => window.__entityFavoriteClicks), favoriteIds, 'clicking the heart still reaches the original span ID');
        assert.equal(await page.locator('#video_favorite_edit button:visible').count(), 3, 'exactly one native button per state');
        assert.equal(await page.evaluate(() => window.__nativeFavoriteButtons.every(node => document.getElementById('video_favorite_edit').contains(node))), true);
        const rows = await page.locator('#video_info .item').evaluateAll(items => items.slice(0, 5).map(el => el.getBoundingClientRect().height));
        assert.ok(Math.max(...rows) <= 44, 'native outer spacing is removed from fact rows');
        assert.equal(await page.locator('#video_cast .header').evaluate(el => el.getBoundingClientRect().width), 86);
        assert.equal(await page.locator('#video_id td.text .avid-date-badge').count(), 1, 'date badge stays inside the value cell, not an extra table column');
        await page.locator('[data-jlc-copy-key="avid"]').click();
        assert.equal(await page.evaluate(() => window.__copiedNames.at(-1)), 'ABP-001', 'date decoration does not enter copied code');
        assert.match(await page.locator('.jlc-resource-subtitle').textContent(), /^ABP-001 ·/, 'resource lookup keeps the original code after refresh');
      }
      if (screenshotDir) await page.screenshot({ path: screenshotDir + '/jlc-detail-' + testCase.host + '.png' });
      await nativeFavorite.click();
      if (testCase.host === 'www.javlibrary.com') {
        assert.equal(await nativeFavorite.textContent(), '我已经许愿了');
        assert.equal(await nativeFavorite.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(145, 87, 51)');
        assert.equal(await page.locator('#subscribed .jlc-favorite-count').textContent(), ' (329 个使用者想要这影片)');
      }
      await page.locator('#jlc-page-header summary').click();
      await page.locator('#native-action').click();
      assert.deepEqual(await page.evaluate(() => window.__nativeClicks), ['native-favorite', 'native-action']);
      await page.locator('#jlc-page-header summary').click();
      await (await waitFab(page)).click();
      await waitWorkbenchOpen(page);
      if (testCase.host === 'www.javbus.com') {
        assert.equal(await page.getByRole('button', { name: '复制标签：示例影片', exact: true }).count(), 0, 'saved hidden tags apply on a fresh detail page');
        await page.locator('#jlc-wb-settings-btn').click();
        await page.locator('[data-jlc-settings-tab="display"]').click();
        await page.getByRole('button', { name: '恢复显示标签：示例影片', exact: true }).click();
        await page.locator('#jlc-wb-settings-close').click();
        await page.getByRole('button', { name: '复制标签：示例影片', exact: true }).press('Enter');
        assert.equal(await page.evaluate(() => window.__copiedNames.at(-1)), '示例影片');
        assert.equal(await page.evaluate(() => window.__coverClicks), 0, 'detail tag copying does not activate its enclosing cover link');
      }
      assert.equal(await page.locator('#native-comments').count(), 1);
      assert.equal(await page.locator('#jlc-detail').count(), 1);
      const comparison = await page.evaluate(() => {
        const detail = document.getElementById('jlc-detail').getBoundingClientRect();
        const panel = document.getElementById('jlc-wb').getBoundingClientRect();
        return detail.right <= panel.left && detail.width > 600;
      });
      assert.ok(comparison, testCase.host + ': film and console must remain visible together');
      // The page stays interactive while its non-modal companion is open.
      await nativeFavorite.click();
      assert.equal(await page.evaluate(() => window.__nativeClicks.length), 3);
      for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 640 }]) {
        await page.setViewportSize(viewport);
        await page.locator('#jlc-wb-close-btn').click();
        assert.equal(await page.locator('html').evaluate(el => el.classList.contains('jlc-console-docked')), false);
        const fit = await page.locator('#jlc-detail').evaluate(el => {
          const rect = el.getBoundingClientRect();
          return rect.right <= innerWidth && rect.left >= 0 && el.scrollWidth <= el.clientWidth + 1;
        });
        assert.ok(fit, testCase.host + ': detail fits ' + viewport.width);
        await actorCopies.nth(1).click();
        assert.equal(await page.evaluate(() => window.__copiedNames.at(-1)), '第二位演员', 'individual actor copy remains usable on narrow screens');
        if (testCase.host === 'www.javlibrary.com') {
          await page.locator('#star_second').click();
          assert.equal(await page.evaluate(() => window.__entityFavoriteClicks.at(-1)), 'star_second', 'actor heart remains independently clickable on narrow screens');
        }
        if (testCase.host === 'www.javbus.com' && viewport.width === 320) {
          await page.getByRole('button', { name: '复制标签：示例影片', exact: true }).click({ button: 'right' });
          assert.equal(await page.locator('#jlc-meta-tag-menu').evaluate(el => {
            const rect = el.getBoundingClientRect();
            return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
          }), true, 'tag menu fits the narrow viewport');
          if (screenshotDir) await page.screenshot({ path: screenshotDir + '/jlc-tag-menu-detail-320.png' });
          await page.getByRole('button', { name: '在所有影片中隐藏此标签', exact: true }).click();
          await page.locator('[data-jlc-resource-refresh]').click();
          assert.equal(await page.getByRole('button', { name: '复制标签：示例影片', exact: true }).count(), 0, 'detail refresh keeps tags hidden');
          assert.equal(await page.evaluate(() => window.__coverClicks), 0, 'detail tag menu does not activate the cover link');
        }
        if (screenshotDir) await page.screenshot({ path: screenshotDir + '/jlc-detail-' + testCase.host + '-' + viewport.width + '.png' });
        await (await waitFab(page)).click();
        await waitWorkbenchOpen(page);
      }
      assertNoRuntimeErrors(runtimeErrors);
      console.log('OK native layout and comparison: ' + testCase.host);
    } finally {
      await session.context.close();
    }
  }
} finally {
  await browser.close();
}
