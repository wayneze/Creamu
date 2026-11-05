import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { openScriptPage, PATHS, assertNoRuntimeErrors, gmMockSource, stripUserscriptMeta } from './helpers.mjs';

const browser = await chromium.launch({ headless: true });
let passed = 0;
const screenshots = process.env.CREAMU_SCREENSHOT_DIR;
async function screenshot(page, name) {
  if (screenshots) {
    fs.mkdirSync(screenshots, { recursive: true });
    await page.screenshot({ path: path.join(screenshots, name + '.png') });
  }
}
async function open(options = {}) {
  return openScriptPage(browser, {
    host: 'haijiao.com', fixtureFile: 'haijiao.html',
    scriptPath: path.join(PATHS.repositoryRoot, 'packages/hj-commander/dist/creamu-hj.user.js'),
    viewport: options.viewport || { width: 1440, height: 900 },
    beforeScript: page => page.evaluate(({ detail, native }) => {
      history.replaceState({}, '', detail ? '/post/details?pid=101' : '/home');
      document.querySelector('.details-box').hidden = !detail;
      document.getElementById('hj-page-view').parentElement.hidden = !!detail;
      window.__topicRequests = [];
      window.__pendingTopics = {};
      window.__players = [];
      window.__copied = '';
      window.GM_setClipboard = text => { window.__copied = text; };
      window.__topicData = pid => ({ topicId: pid, attachments: [{ category: 'video', remoteUrl: 'https://media.example.test/' + pid + '-a.mp4' }, { category: 'video', remoteUrl: 'https://media.example.test/' + pid + '-b.mp4' }] });
      window.fetch = async url => {
        const pid = String(url).match(/\/api\/topic\/(\d+)/)?.[1];
        window.__topicRequests.push(pid);
        if (pid === '103') return new Response('{}', { status: 503 });
        if (pid === '102') return new Promise(resolve => { window.__pendingTopics[pid] = () => resolve(new Response(JSON.stringify({ data: window.__topicData(pid) }))); });
        return new Response(JSON.stringify({ data: window.__topicData(pid) }));
      };
      if (!native) window.Artplayer = class {
        constructor(options) {
          this.options = options;
          this.video = document.createElement('video');
          this.video.dataset.url = options.url;
          options.container.append(this.video);
          const controls = document.createElement('div');
          controls.className = 'art-controls';
          controls.textContent = '播放　00:00 ━━━━━━━━━　全屏';
          options.container.append(controls);
          window.__players.push(this);
        }
        destroy() { this.destroyed = true; this.video.remove(); }
      };
      const cover = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#829582"/><path d="M0 200 120 50 220 180 320 90V200" fill="#465d4c"/></svg>');
      document.querySelectorAll('.morePic img').forEach(img => { img.src = cover; });
    }, options),
  });
}
async function check(name, options, fn) {
  const session = await open(options);
  try {
    await fn(session.page);
    assertNoRuntimeErrors(session.runtimeErrors);
    console.log('  OK  ' + name); passed++;
  } finally { await session.context.close(); }
}
try {
  // 手机服务器返回独立应用；错误的 HTML 缓存和 Vant 复用弹窗都走真实启动入口。
  for (const brokenEntry of [true, false]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    try {
      const page = await context.newPage();
      const requests = [];
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const fixture = fs.readFileSync(path.join(PATHS.fixtures, 'haijiao-mobile.html'), 'utf8');
      const siteApp = `
        const app = document.createElement('div'); app.id = 'app';
        app.innerHTML = document.getElementById('mobile-template').innerHTML;
        document.getElementById('app').replaceWith(app);
        const mask = document.createElement('div'); mask.className = 'van-overlay';
        const dialog = document.createElement('div'); dialog.className = 'van-dialog luodiconfirm';
        const message = document.createElement('p'); message.textContent = '重要提示：请收藏官方域名';
        const confirm = document.createElement('button'); confirm.textContent = '我知道了';
        dialog.append(message, confirm); document.body.append(mask, dialog); document.body.style.overflow = 'hidden';
        window.__dialogSteps = 0;
        confirm.onclick = () => {
          window.__dialogSteps++;
          if (__dialogSteps === 1) {
            // 同一个 Vant 节点，仅更新 class 和文本，站点负责遮罩与滚动锁。
            dialog.className = 'van-dialog luodisconfirm';
            message.firstChild.data = '已经复制本站域名，请妥善保存';
            confirm.firstChild.data = '好';
          } else {
            dialog.hidden = true; mask.hidden = true; document.body.style.overflow = '';
          }
        };
      `;
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/home') return route.fulfill({ contentType: 'text/html', body: fixture });
        if (url.pathname.endsWith('app-fixture.js')) {
          requests.push(url.href);
          const broken = brokenEntry && !url.search;
          return route.fulfill({ contentType: broken ? 'text/html' : 'application/javascript', body: broken ? '<!doctype html><html></html>' : siteApp });
        }
        return route.fulfill({ status: 204, body: '' });
      });
      await page.addInitScript({ content: gmMockSource() + stripUserscriptMeta(fs.readFileSync(path.join(PATHS.repositoryRoot, 'packages/hj-commander/dist/creamu-hj.user.js'), 'utf8')) });
      await page.goto('https://haijiao.com/home');
      await page.locator('.mobile .list-item').first().waitFor();
      await page.waitForFunction(() => __dialogSteps === 2);
      await page.locator('#creamu-hj-startup').waitFor({ state: 'detached' });
      assert.equal(await page.locator('.van-dialog').count(), 1, 'site still owns its reusable dialog');
      assert.equal(await page.locator('.van-overlay').isVisible(), false, 'native close releases the overlay');
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
      assert.equal(await page.locator('.mheader-seach').evaluate(el => getComputedStyle(el).position), 'static');
      assert.equal(await page.locator('.van-tab--active').evaluate(el => getComputedStyle(el).color), 'rgb(53, 100, 82)');
      assert.equal(new Set(requests.filter(url => new URL(url).search)).size, brokenEntry ? 1 : 0, 'one recovery URL only, healthy startup is untouched');
      assert.deepEqual(errors, brokenEntry ? ["Unexpected token '<'"] : []);
      console.log('  OK  HJ native mobile startup ' + (brokenEntry ? 'recovers HTML script cache' : 'leaves healthy entry alone')); passed++;
    } finally { await context.close(); }
  }
  for (const width of [320, 390, 1440]) await check('HJ layout and reading at ' + width, { viewport: { width, height: 900 }, detail: false }, async page => {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'list fits viewport');
    if (width < 820) {
      await page.locator('#creamu-hj-navigation-toggle').click();
      assert.equal(await page.locator('#hj-nav-second').isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'expanded navigation fits');
      await page.locator('#creamu-hj-navigation-toggle').click();
    }
    await screenshot(page, 'hj-list-' + width);
    await page.evaluate(() => {
      history.pushState({}, '', '/post/details?pid=101');
      document.querySelector('.details-box').hidden = false;
      document.getElementById('hj-page-view').parentElement.hidden = true;
    });
    await page.locator('#creamu-hj-art-mount video').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'detail fits viewport');
    const controls = await page.locator('.creamu-hj-btn:visible').evaluateAll(nodes => nodes.map(el => el.getBoundingClientRect().height));
    assert.ok(controls.every(h => h >= 30 && h <= 36), 'controls remain compact');
    await screenshot(page, 'hj-detail-' + width);
  });
  await check('HJ media switches, refreshes playlist, and rejects stale responses', { detail: true }, async page => {
    await page.locator('#creamu-hj-art-mount video').waitFor();
    await page.locator('.creamu-hj-vswitch-btn').nth(1).click();
    assert.equal(await page.locator('#creamu-hj-art-mount video').getAttribute('data-url'), 'https://media.example.test/101-b.mp4');
    assert.equal(await page.evaluate(() => __players[0].destroyed), true);
    assert.equal(await page.evaluate(() => __players.at(-1).options.type), 'mp4');
    await page.locator('#creamu-hj-copy').click();
    assert.match(await page.evaluate(() => __copied), /101-b\.mp4$/);
    await page.evaluate(() => document.getElementById('creamu-hj-inline-slot').remove());
    await page.locator('#creamu-hj-art-mount video').waitFor();
    assert.match(await page.locator('#creamu-hj-art-mount video').getAttribute('data-url'), /101-b\.mp4$/);
    await page.evaluate(() => history.pushState({}, '', '/post/details?pid=102'));
    await page.waitForFunction(() => !!__pendingTopics['102']);
    assert.equal(await page.locator('#creamu-hj-art-mount video').count(), 0, 'old player stops while next post loads');
    await page.evaluate(() => history.pushState({}, '', '/post/details?pid=104'));
    await page.waitForFunction(() => document.querySelector('#creamu-hj-art-mount video')?.dataset.url.includes('104'));
    await page.evaluate(() => __pendingTopics['102']());
    await page.waitForTimeout(150);
    assert.ok((await page.locator('#creamu-hj-art-mount video').getAttribute('data-url')).includes('104'));
    assert.deepEqual(await page.evaluate(() => __creamu_hj_media_cache.videos.map(url => url.includes('104'))), [true, true]);
    await page.evaluate(() => history.pushState({}, '', '/post/details?pid=103'));
    await page.locator('#creamu-hj-play-status').filter({ hasText: '读取失败' }).waitFor();
    assert.equal(await page.locator('#creamu-hj-retry').isEnabled(), true);
    await page.locator('#creamu-hj-retry').click();
    await page.waitForFunction(() => __topicRequests.filter(id => id === '103').length === 2);
    await page.evaluate(() => history.pushState({}, '', '/home'));
    assert.equal(await page.locator('#creamu-hj-inline-slot').count(), 0);
    await page.evaluate(() => {
      document.querySelector('.details-box').remove();
      document.querySelector('#toolbar-container strong').innerHTML = '<img alt="logo" width="160" height="60">';
      history.pushState({}, '', '/post/details?pid=101');
    });
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#creamu-hj-inline-slot').count(), 0, 'waits for actual post content instead of mounting at the logo');
    await page.evaluate(() => {
      const mobile = document.createElement('div'); mobile.className = 'mobile';
      mobile.innerHTML = '<div class="details"><div class="details-body"><div class="html-box"><div class="ql-editor reset-html-box"><p>手机正文</p></div></div></div></div>';
      document.getElementById('app').append(mobile);
    });
    await page.locator('.details-body #creamu-hj-art-mount video').waitFor();
  });
  for (const mobile of [true, false]) {
    const session = await openScriptPage(browser, {
      host: 'haijiao.com', fixtureFile: 'haijiao.html',
      scriptPath: path.join(PATHS.repositoryRoot, 'packages/hj-commander/dist/creamu-hj.user.js'),
      viewport: { width: mobile ? 390 : 1440, height: 900 },
      beforeScript: page => page.evaluate(mobile => {
        history.replaceState({}, '', mobile ? '/user/userinfo?uid=7' : '/homepage/last/7');
        window.__pageRequests = []; window.__scrollCalls = 0; window.__nativeCalls = 0; window.__failPage = 0;
        window.scrollTo = () => { __scrollCalls++; };
        const root = document.createElement('div'); root.className = mobile ? 'userinfo' : 'main_body';
        root.innerHTML = mobile ? '<div class="van-tabs__content"><div class="fixture-posts"></div></div>' : '<div><div class="fixture-posts"></div></div>';
        document.body.append(root);
        const vm = window.__profile = { active: 4, meta: { type: 1 }, params: { uid: '7' }, $route: { query: { uid: '7' } }, pagination: { page: 1, limit: 2, total: 6 }, isinit: true, forumList: [], listData: [], finished: false, loading: false,
          onLoad() { __nativeCalls++; }, oninit() { __nativeCalls++; },
          getForumList(data) { this.forumList.push(...data.results); root.querySelector('.fixture-posts').textContent = this.forumList.map(p => p.topicId).join(','); }
        };
        window.__originalLoad = mobile ? vm.onLoad : vm.oninit;
        window.__originalAccept = vm.getForumList;
        if (mobile) root.__vue__ = vm; else root.firstElementChild.__vue__ = vm;
        window.fetch = async (url, options) => {
          const page = Number(new URL(url).searchParams.get('page'));
          __pageRequests.push(page);
          if (page === __failPage) return new Response('{}', { status: 503 });
          if (window.__holdPage === page) return new Promise((resolve, reject) => {
            window.__resolvePage = () => resolve(new Response(JSON.stringify({ data: { page: { page, limit: 2, total: 6 }, results: [{ topicId: 99 }] } })));
            options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          });
          return new Response(JSON.stringify({ data: { page: { page, limit: 2, total: 6 }, results: [{ topicId: 8 - page * 2 }, { topicId: 7 - page * 2 }, { topicId: 7 - page * 2 }] } }));
        };
      }, mobile),
    });
    try {
      const page = session.page;
      const bar = page.locator('#creamu-hj-post-order');
      await bar.getByRole('status').filter({ hasText: '第 1 / 3' }).waitFor();
      await bar.getByRole('button', { name: '最早优先' }).click();
      await page.waitForFunction(() => __pageRequests.length === 2 && !document.querySelector('[data-order="oldest"]').disabled);
      assert.deepEqual(await page.evaluate(mobile => __profile[mobile ? 'forumList' : 'listData'].map(p => p.topicId), mobile), [1, 2]);
      assert.deepEqual(await page.evaluate(() => __pageRequests), [1, 3], 'oldest jumps to last page without fetching middle pages');
      if (mobile) await page.evaluate(() => { __profile.onLoad(); __profile.getForumList({ results: [{ topicId: 999 }] }); });
      await page.evaluate(() => document.querySelector('.fixture-posts').append(document.createElement('span')));
      await page.waitForTimeout(200);
      assert.deepEqual(await page.evaluate(() => __pageRequests), [1, 3], 'DOM refresh and native infinite loading do not request more pages');
      assert.equal(await page.evaluate(() => __scrollCalls), 0);
      await page.evaluate(() => { __failPage = 2; });
      await bar.getByRole('button', { name: '下一页' }).click();
      await bar.getByRole('status').filter({ hasText: '读取失败' }).waitFor();
      await page.evaluate(() => { __failPage = 0; });
      await bar.getByRole('button', { name: '重试' }).click();
      await bar.getByRole('status').filter({ hasText: '第 2 / 3' }).waitFor();
      assert.deepEqual(await page.evaluate(mobile => __profile[mobile ? 'forumList' : 'listData'].map(p => p.topicId), mobile), [3, 4]);
      await page.evaluate(() => { __holdPage = 1; });
      await bar.getByRole('button', { name: '下一页' }).click();
      await page.evaluate(() => history.pushState({}, '', '/home'));
      await bar.waitFor({ state: 'detached' });
      assert.equal(await page.evaluate(mobile => __profile[mobile ? 'onLoad' : 'oninit'] === __originalLoad && __profile.getForumList === __originalAccept, mobile), true);
      assertNoRuntimeErrors(session.runtimeErrors);
      console.log('  OK  HJ ' + (mobile ? 'mobile' : 'desktop') + ' oldest-first pagination, retry, and cancellation'); passed++;
    } finally { await session.context.close(); }
  }
  await check('HJ floating search works without changing the reading position', {}, async page => {
    await page.evaluate(() => {
      document.body.style.minHeight = '2500px'; window.scrollTo(0, 600);
      document.getElementById('app').__vue__ = { $router: { push(target) { window.__searchTarget = target; return Promise.resolve(); } } };
    });
    const y = await page.evaluate(() => scrollY);
    await page.locator('#creamu-hj-search-trigger').click();
    await page.locator('#creamu-hj-search-query').fill('河岸 旅行');
    await page.locator('#creamu-hj-search-dialog select').selectOption('2');
    await page.locator('#creamu-hj-search-dialog button[type="submit"]').click();
    assert.deepEqual(await page.evaluate(() => __searchTarget), { path: '/es', query: { key: '河岸 旅行', type: '2', node_id: '0' } });
    assert.equal(await page.evaluate(() => scrollY), y);
    await page.evaluate(() => { const mobile = document.createElement('div'); mobile.className = 'mobile'; document.getElementById('app').append(mobile); });
    await page.locator('#creamu-hj-search-trigger').click();
    await page.locator('#creamu-hj-search-query').fill('城市');
    await page.locator('#creamu-hj-search-dialog button[type="submit"]').click();
    assert.equal(await page.evaluate(() => __searchTarget.path), '/search');
    await page.locator('#creamu-hj-search-trigger').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#creamu-hj-search-dialog').isVisible(), false);
  });
  for (const width of [390, 1440]) await check('HJ search, profile and native detail surfaces at ' + width, { viewport: { width, height: 900 } }, async page => {
    await page.evaluate(() => {
      document.getElementById('app').innerHTML = `
        <style>.layout_body{background:white}.headerUserBox{position:absolute;top:70px}.userinfo .usertopic{padding-top:80px}.testinput{position:absolute;left:50%;width:200px}</style>
        <section id="search-fixture"><div id="hj-page-view"><main><div class="infoFlowNav"><div><input placeholder="搜索"></div></div><div class="home-news-content"><div class="list"><h4>搜索结果</h4><div class="show_list_info"><span>作者</span><span>今天</span></div></div></div></main></div></section>
        <section id="profile-fixture" hidden><div class="hsp_width layout_header"><div class="header_avatar">头像</div><div class="userInfo"><div class="nickname">社区作者</div></div><div class="upperright"><div class="upperright_btn">关注</div></div></div><div class="hsp_width layout_body"><div class="body_navigation"><div class="_searchBar"><div class="navigationList current">最新</div></div></div><div class="main_body"><div class="listrow"><div class="listrow-contain"><div class="position-relative" style="width:816px"><div class="content"><div class="titleContent">城市漫步</div><div class="liteContent">日常记录</div></div></div></div></div></div></div></section>
        <div class="mobile"><section class="userinfo" hidden><div class="top-box"><div class="top-bg"></div><div class="headerUserBox"><div>头像</div><div><div class="nickname">社区作者</div><ul class="top-btn-box"><li>关注</li><li>私信</li></ul></div></div><div class="usertopic"><div class="des">简介</div></div></div></section><section class="details" hidden><div class="pagescroll-box"><div class="title-box"><div class="title-text">手机详情</div></div><div class="details-body"><div class="html-box"><div class="ql-editor reset-html-box">正文</div></div></div></div><input class="testinput"></section></div>`;
      history.pushState({}, '', '/es?key=城市');
    });
    await page.waitForFunction(() => document.documentElement.dataset.hjPage === 'search');
    assert.equal(await page.locator('.infoFlowNav').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(247, 247, 242)');
    await page.evaluate(() => {
      document.getElementById('search-fixture').hidden = true; document.getElementById('profile-fixture').hidden = false;
      history.pushState({}, '', '/homepage/1');
    });
    await page.waitForFunction(() => document.documentElement.dataset.hjPage === 'profile');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.locator('.upperright_btn').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(223, 233, 224)');
    assert.equal(await page.locator('.navigationList.current').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(223, 233, 224)');
    await page.evaluate(() => {
      document.getElementById('profile-fixture').hidden = true; document.querySelector('.userinfo').hidden = false;
      history.pushState({}, '', '/user/userinfo?uid=1');
    });
    const separation = await page.evaluate(() => document.querySelector('.usertopic').getBoundingClientRect().top - document.querySelector('.headerUserBox').getBoundingClientRect().bottom);
    assert.ok(separation >= 0, 'mobile profile actions never overlap biography');
    await page.evaluate(() => {
      document.querySelector('.userinfo').hidden = true; document.querySelector('.details').hidden = false;
      history.pushState({}, '', '/post/details?pid=101');
    });
    await page.locator('.details-body #creamu-hj-inline-slot').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'invisible native copy input does not widen the detail');
    assert.equal(await page.locator('.details-body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(247, 247, 242)');
  });
  await check('HJ closes native entry dialogs and keeps ordinary dialogs', {}, async page => {
    await page.evaluate(() => {
      const dialog = document.createElement('div'); dialog.className = 'el-dialog luodiye_dialog';
      dialog.innerHTML = '<p>请保留本站域名</p><div class="el-dialog__footer"><span class="dialog-footer"><span>好</span></span></div>';
      dialog.querySelector('.dialog-footer > span').onclick = () => { dialog.hidden = true; };
      document.body.append(dialog);
    });
    await page.locator('.luodiye_dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('.luodiye_dialog').count(), 1, 'desktop native dialog stays mounted');
    await page.evaluate(() => {
      const mask = document.createElement('div'); mask.className = 'van-overlay'; document.body.append(mask);
      const dialog = document.createElement('div'); dialog.className = 'van-dialog'; dialog.textContent = '收藏到哪个文件夹'; document.body.append(dialog);
      document.body.style.overflow = 'hidden';
    });
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.van-overlay').count(), 1);
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
  });
  await check('HJ native video remains available without Artplayer', { detail: true, native: true }, async page => {
    await page.locator('#creamu-hj-art-mount video').waitFor();
    assert.equal(await page.locator('#creamu-hj-art-mount video').evaluate(el => el.controls), true);
    assert.match(await page.locator('#creamu-hj-art-mount video').getAttribute('src'), /101-a\.mp4$/);
  });
  console.log('All HJ browser checks passed (' + passed + ')');
} finally { await browser.close(); }
