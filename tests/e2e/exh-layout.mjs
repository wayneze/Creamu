import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { PATHS, openScriptPage, assertNoRuntimeErrors, waitFab } from './helpers.mjs';

const screenshotDir = process.env.CREAMU_SCREENSHOT_DIR;
if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });
const cover = (index) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="280"><rect width="220" height="280" fill="${['#aebcb0', '#c1b7a7', '#aab7c1'][index % 3]}"/><circle cx="150" cy="95" r="65" fill="#ffffff44"/><path d="M0 230L140 100L220 200V280H0" fill="#364a4533"/><text x="20" y="250" fill="#fff" font-family="serif" font-size="25">COLLECTION ${index + 1}</text></svg>`
);
function fixture(mode) {
  const cards = Array.from({ length: 8 }, (_, i) => {
    const title = `[Studio ${i + 1}] ${['Garden notes', 'Slow afternoon', 'Paper & ink', 'A quiet place'][i % 4]} [Full Color]`;
    const link = `<a href="/g/${810000 + i}/aabbccddee/"><div class="glink">${title}</div></a>`;
    const image = `<a href="/g/${810000 + i}/aabbccddee/"><img alt="测试封面" src="${cover(i)}"></a>`;
    const tags = '<div class="gt" title="other:full color">full color</div>';
    if (mode === 'grid') return `<div class="gl1t"><a href="/g/${810000 + i}/aabbccddee/"><div class="gl4t glname glink">${title}</div></a><div class="gl3t" style="height:${i % 2 ? 170 : 350}px;width:250px">${image.replace('<img ', `<img style="width:250px;height:${i % 2 ? 170 : 350}px" `)}</div><div class="gl5t"><div><div class="cs">Collection</div><div id="posted_${810000 + i}" onclick="window.__favoriteClicked=true">2026-11-04 12:30</div></div><div><div class="ir">★★★★☆</div><div>24 pages</div></div></div><div class="gl6t">${tags}<div class="gt" title="language:english">english</div><div class="gt" title="group:studio ${i + 1}">studio ${i + 1}</div></div></div>`;
    return `<tr>${mode === 'extended' ? `<td class="gl1e"><div class="glthumb">${image}</div></td>` : `<td class="gl2c"><div class="glthumb" style="display:none">${image}</div><div>2026-11-04</div></td>`}<td class="glname">${link}${tags}<p>2026-11-04 · 24 pages</p></td></tr>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;padding:0 24px 40px;background:#34353b;color:#eee;font:14px Arial,sans-serif}
    #nb{margin:auto;padding:4px 10px 0;display:flex;justify-content:space-around;flex-wrap:wrap;line-height:19px;min-height:19px;max-height:19px;overflow:hidden}
    .ido{min-width:740px;max-width:1200px;margin:10px auto 5px;padding:5px;border:1px solid #5C0D12}
    .idi{width:720px;margin:0 auto 8px;padding:5px;border:2px ridge #5C0D12;text-align:center}
    #searchbox>form>div{padding:2px 0}#searchbox>form>div:nth-child(3){padding:5px 0}
    #f_search{width:560px}input[type=text]{margin:3px 1px 0;padding:1px 3px 3px;line-height:19px}
    input[type=submit],input[type=button]{min-height:26px;line-height:20px;padding:1px 5px 2px;margin:0 2px}
    table.itc{margin:auto}.itc td{padding:3px 5px}.cs{padding:3px 8px;font-size:11px;background:#d9d8ce}
    .searchtext{text-align:center;font-size:10pt;padding:3px 0 1px}.searchtext p{margin:0;padding:1px}
    .searchnav{display:flex;align-items:center;justify-content:center;padding:2px 0 8px;font-size:16px;white-space:nowrap}
    .searchnav>div{padding:0 15px;width:55px;text-align:center}.searchnav>div:first-child,.searchnav>div:last-child{flex-grow:1;width:150px}
    .searchnav div>span{color:#ccc}.searchnav select{width:125px}.jumpbox{width:110px !important;padding:0 5px !important;position:relative}
    .jumppop{position:absolute;left:50%;transform:translateX(-50%);top:30px;z-index:999}
    #rangebar{display:flex;justify-content:space-evenly;align-items:center;margin:5px auto;padding:2px;width:720px;height:15px;background:#55565b;border-radius:8px}
    #rangebar div{height:10px;width:10px;background:#838589;border-radius:50%}#rangebar div[data-inrange]{background:radial-gradient(#fff,#bbb)}
    div.itg{width:99%;margin:0 auto;padding:3px;border-block:2px ridge #5C0D12}
    .gld{display:flex;flex-wrap:wrap;align-items:stretch;padding:0 !important;border-left:1px solid #D9D7CC}table.itg{width:99%}
    .gl1t{min-height:200px;min-width:267px;max-width:267px;padding-bottom:2px;display:flex;flex-direction:column;border-right:1px solid #D9D7CC;border-bottom:1px solid #D9D7CC;background:#444;text-align:left}
    .gl4t{overflow:hidden;min-height:32px;max-height:32px;line-height:16px;margin:6px 4px 0;font-size:10pt;text-align:center}.glink{font-weight:bold}
    .gl3t{width:220px;height:280px;position:relative;margin:3px auto 0;border:1px solid #5C0D12;border-radius:5px;overflow:hidden}.gl3t img{width:220px;height:280px;display:block}
    .gl5t{height:46px;margin:auto auto 0;display:flex;justify-content:center}.gl5t>div{position:relative;min-width:110px;max-width:110px}
    .gl5t>div>div:first-child{position:absolute;top:4px;left:0;width:110px;height:18px}.gl5t>div>div:nth-child(2){position:absolute;top:27px;left:0;width:102px;text-align:center;white-space:nowrap}
    .gl6t{display:flex;justify-content:center;flex-wrap:wrap;padding:5px 2px 0}.gt{display:inline-block;padding:2px 6px;margin:4px;font-size:10px}
    .glthumb{width:120px;height:153px}.glthumb img{width:120px;height:153px;display:block}.gl1e{width:132px}.glname{padding:12px}
    a{text-decoration:none}button{cursor:pointer}
  </style></head><body><div id="nb"><a href="/">Front Page</a><a href="/watched">Watched</a><a href="/favorites.php">Favorites</a><a href="/mytags">My Tags</a><a href="/account">Account</a></div><div class="ido"><div id="toppane"><div id="searchbox" class="idi"><form>
    <input type="hidden" id="f_cats" name="f_cats" value="0" disabled="disabled">
    <table class="itc"><tbody>${[['Manga', 'Artbook', 'Illustration', 'Collection', 'Other'], ['Digital', 'Archive', 'Sketch', 'Comic', 'Misc']].map((row, rowIndex) => '<tr>' + row.map((name, index) => '<td><div class="cs" id="cat_' + (1 << (rowIndex * 5 + index)) + '" onclick="toggle_category(' + (1 << (rowIndex * 5 + index)) + ')">' + name + '</div></td>').join('') + '</tr>').join('')}</tbody></table>
    <div><input type="text" id="f_search" name="f_search" aria-label="搜索" value="collection"><input type="submit" value="Search"><input type="button" value="Clear"></div><div>[<a href="#" onclick="toggle_advsearch_pane(this); return false">Show Advanced Options</a>] &nbsp; [<a href="#" onclick="toggle_filesearch_pane(this); return false">Show File Search</a>]</div><div id="advdiv" style="display:none"></div>
    </form></div><div id="fsdiv" style="display:none"></div></div><div style="position:relative;z-index:2"><div id="rangebar">${Array.from({ length: 50 }, (_, i) => `<a href="/?range=${i * 2}"><div${i < 40 ? ' data-inrange="1"' : ''}></div></a>`).join('')}</div><div class="searchtext"><p>找到约 30 个结果。</p></div><div class="searchnav"><div></div><div><span id="ufirst">&lt;&lt; 首页</span></div><div><span id="uprev">&lt; 上一页</span></div><div id="ujumpbox" class="jumpbox"><a id="ujump" href="javascript:enable_jump_mode('u')">跳页/搜寻</a></div><div><a id="unext" href="/?next=810000">下一页 &gt;</a></div><div><a id="ulast" href="/?prev=1">末页 &gt;&gt;</a></div><div><select aria-label="列表模式"><option>${mode}</option></select></div></div>${mode === 'grid' ? `<div class="itg gld">${cards}</div>` : `<table class="itg"><tbody>${cards}</tbody></table>`}</div></div></body></html>`;
}
function installNativeSearchFixture() {
  // Native handlers own field values and option panels, independently of Creamu.
  window.toggle_category = (value) => {
    const field = document.getElementById('f_cats');
    const category = document.getElementById('cat_' + value);
    field.disabled = false;
    const excluded = category.hasAttribute('data-disabled');
    category.toggleAttribute('data-disabled', !excluded);
    field.value = excluded ? Number(field.value) & (1023 ^ value) : Number(field.value) | value;
  };
  window.toggle_advsearch_pane = (link) => {
    const open = link.innerHTML !== 'Hide Advanced Options';
    link.innerHTML = open ? 'Hide Advanced Options' : 'Show Advanced Options';
    const pane = document.getElementById('advdiv');
    pane.style.display = open ? '' : 'none';
    pane.innerHTML = open ? '<div class="searchadv"><label><input type="checkbox" name="f_sh"> Include archived</label></div>' : '';
  };
  window.toggle_filesearch_pane = (link) => {
    const open = link.innerHTML !== 'Hide File Search';
    link.innerHTML = open ? 'Hide File Search' : 'Show File Search';
    const pane = document.getElementById('fsdiv');
    pane.style.display = open ? '' : 'none';
    pane.innerHTML = open ? '<form><input type="file" name="sfile"><input type="submit" value="File Search"></form>' : '';
  };
  window.__nativeSearchField = document.getElementById('f_search');
  window.__nativeRangeLinks = [...document.querySelectorAll('#rangebar a')];
  window.enable_jump_mode = (prefix) => {
    const box = document.getElementById(prefix + 'jumpbox');
    box.innerHTML = '<input id="' + prefix + 'jump" placeholder="date or offset"><div class="jumppop"><button class="jumpcancel" type="button">Cancel</button></div>';
    box.querySelector('.jumpcancel').onclick = () => {
      box.innerHTML = `<a id="${prefix}jump" href="javascript:enable_jump_mode('${prefix}')">跳页/搜寻</a>`;
    };
    box.querySelector('input').focus();
  };
  document.querySelector('#searchbox form').addEventListener('submit', (event) => {
    event.preventDefault();
    window.__submittedSearch = Object.fromEntries(new FormData(event.target));
  });
}
function detailFixture() {
  // Native gallery topology and fixed sizing, with safe sample content.
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{background:#34353b;color:#eee;font:12px Arial;margin:8px}a{text-decoration:none}
    .gm{min-width:720px;max-width:1200px;margin:10px auto;padding:3px 5px;position:relative;border:1px solid #5c0d12;background:#444}
    #gleft{position:absolute;top:0;left:0;width:220px;height:385px;z-index:1}
    #gd1{float:left;width:255px;height:375px;padding:5px 0 0 10px;display:flex;align-items:center;justify-content:center}
    #gd1 div{border:1px solid #5c0d12;margin:1px auto 0}
    #gd2{float:right;width:925px;min-height:50px;text-align:center;position:relative;z-index:2;background:#444}
    #gmid{float:right;width:930px;height:330px;position:relative;z-index:2;background:#444}
    #gd3{float:left;width:170px;padding:3px 0 0}#gd4{float:left;width:580px;padding:0 0 0 5px;margin-left:10px;border-inline:1px solid #5c0d12}
    #gd5{float:left;width:150px;padding:3px 0 0 6px}#taglist{height:255px;overflow:hidden}#taglist td{vertical-align:top}
    #taglist .gt{display:inline-block;margin:0 4px 4px 0;padding:2px 6px}.c{clear:both}
    #gdt{display:flex;flex-wrap:wrap;gap:10px;min-width:700px;max-width:1200px;margin:auto}.dp{min-width:740px}.gdtl img{width:100px;height:140px}
    @media(max-width:1230px){.gm{max-width:960px}#gd1{display:none!important}}
    @media(max-width:990px){.gm{max-width:720px}#gd2,#gmid{width:710px}#gd4{width:340px}}
  </style></head><body><div class="gm"><div id="gleft"><div id="gd1"><div style="width:250px;height:365px;background:transparent url('${cover(0)}') 0 0 no-repeat"></div></div></div>
    <div id="gd2"><h1 id="gn">[Studio 1] Garden notes — An illustrated collection [English]</h1><h1 id="gj">庭园手记 · 插画作品集</h1></div>
    <div id="gmid"><div id="gd3"><div id="gdc"><div class="cs">Collection</div></div><div id="gdn"><a href="/uploader/studio">Studio archive</a></div>
    <div id="gdd"><table><tr><td>Posted:</td><td>2026-11-04 12:30</td></tr><tr><td>Language:</td><td>English</td></tr><tr><td>File Size:</td><td>128 MB</td></tr><tr><td>Length:</td><td>48 pages</td></tr></table></div><div id="gdr">★★★★☆ · 4.6</div><div id="gdf"><a href="#" onclick="window.__favoriteClicked=true;return false">Add to favorites</a></div></div>
    <div id="gd4"><div id="taglist"><table>${[['language', 'english'], ['group', 'studio 1'], ['artist', 'garden artist'], ['other', 'full color']].map(([ns, tag]) => `<tr><td class="tc">${ns}:</td><td><div class="gt"><a href="/tag/${ns}:${tag}">${tag}</a></div></td></tr>`).join('')}</table></div><div id="tagmenu_new"><form><input type="text" aria-label="添加标签"><button type="button">Add tag</button></form></div></div>
    <div id="gd5"><p><a href="/g/810000/aabbccddee/?act=torrent">Torrent Download</a></p><p><a href="/g/810000/aabbccddee/?act=archive">Archive Download</a></p><p><a href="/g/810000/aabbccddee/?act=report">Report Gallery</a></p></div><div class="c"></div></div><div class="c"></div></div>
    <div id="gdt">${Array.from({ length: 9 }, (_, i) => `<div class="gdtl"><a href="/s/preview${i}/810000-${i + 1}"><img src="${cover(i)}" alt="示例内页 ${i + 1}"></a></div>`).join('')}</div><div class="dp">1 · 2 · 3</div><div class="gm" id="cdiv"><div class="c1"><div class="c3">Archive notes</div><div class="c6">Sample collection for layout review.</div></div></div></body></html>`;
}
async function screenshot(page, name) {
  if (screenshotDir) await page.screenshot({ path: path.join(screenshotDir, `exh-${name}.png`), fullPage: false });
}
async function assertGridUsesAvailableWidth(page) {
  const layout = await page.evaluate(() => {
    const container = document.querySelector('.ido');
    const list = container.querySelector('.itg');
    const bounds = container.getBoundingClientRect(), grid = list.getBoundingClientRect();
    const body = document.body.getBoundingClientRect(), bodyStyle = getComputedStyle(document.body);
    const listStyle = getComputedStyle(list);
    const cards = [...list.querySelectorAll('.gl1t')].filter(el => el.getBoundingClientRect().width > 0);
    const first = cards[0].getBoundingClientRect();
    const row = cards.filter(el => Math.abs(el.getBoundingClientRect().top - first.top) < 2);
    const last = row.at(-1).getBoundingClientRect();
    return {
      viewport: innerWidth,
      containerGaps: [
        bounds.left - body.left - parseFloat(bodyStyle.paddingLeft),
        body.right - parseFloat(bodyStyle.paddingRight) - bounds.right,
      ],
      rowGaps: [
        first.left - grid.left - parseFloat(listStyle.paddingLeft),
        grid.right - parseFloat(listStyle.paddingRight) - last.right,
      ],
      cardWidth: first.width,
      coverWidth: cards[0].querySelector('.gl3t').getBoundingClientRect().width,
      imageWidth: cards[0].querySelector('.gl3t img').getBoundingClientRect().width,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  assert.ok(layout.containerGaps.every(gap => Math.abs(gap) <= 2), `list uses available page width: ${JSON.stringify(layout)}`);
  assert.ok(layout.rowGaps.every(gap => Math.abs(gap) <= 2), `cards fill their row: ${JSON.stringify(layout)}`);
  assert.ok(layout.cardWidth >= 272 && layout.coverWidth >= 250, `cards retain cover size: ${JSON.stringify(layout)}`);
  assert.ok(Math.abs(layout.imageWidth - layout.coverWidth) <= 2, 'cover images scale with their cards');
  assert.equal(layout.overflow, false);
}
const browser = await chromium.launch();
try {
  for (const mode of ['grid', 'extended', 'compact']) {
    const { page, context, runtimeErrors } = await openScriptPage(browser, {
      host: 'e-hentai.org', fixtureHtml: fixture(mode), scriptPath: PATHS.exhDist,
      viewport: { width: 1480, height: 960 },
      gmValues: { exh_commander_config_v1: { list_hover_preview: false, list_fold_works: false, hide_blocked: false, fav_tags: ['full color'], custom_groups: ['Studio 1'] } },
      beforeInject: (page) => page.evaluate(() => history.replaceState({}, '', '/?f_search=collection')),
      beforeScript: (page) => page.evaluate(installNativeSearchFixture),
    });
    try {
      await page.waitForFunction(() => document.querySelectorAll('.exc-tool-bar').length === 8);
      const card = page.locator('.exc-gl-item').first();
      assert.equal(await page.locator('#exc-goto-bp').isVisible(), false, 'untracked list hides continue action');
      assert.equal(await page.locator('#exc-untrack').isVisible(), false, 'untracked list hides remove action');
      assert.equal(await page.locator('#searchbox .itc').isVisible(), false);
      if (mode === 'grid') {
        const results = await page.locator('.exc-result-navigation').evaluate((el) => {
          const count = el.querySelector('.searchtext').getBoundingClientRect();
          const pager = el.querySelector('.searchnav').getBoundingClientRect();
          const range = el.querySelector('#rangebar');
          return {
            sameRow: Math.abs(count.top + count.height / 2 - pager.top - pager.height / 2) < 2,
            height: el.getBoundingClientRect().height,
            backdrop: getComputedStyle(range).backgroundColor,
            retained: [...range.querySelectorAll('a')].every((link, index) => link === window.__nativeRangeLinks[index]),
          };
        });
        assert.ok(results.sameRow && results.height <= 56, 'result count and pager share one compact row');
        assert.equal(results.backdrop, 'rgba(0, 0, 0, 0)');
        assert.equal(results.retained, true, 'range links retain native listeners and destinations');
        assert.equal(await page.locator('#unext').getAttribute('href'), '/?next=810000');
        assert.equal(await page.locator('#ufirst').evaluate((el) => el.tagName), 'SPAN');
        await page.locator('#ujump').click();
        await page.locator('#ujumpbox input').fill('2026-01');
        assert.equal(await page.locator('#ujumpbox .jumppop').isVisible(), true);
        await screenshot(page, 'result-jump');
        await page.locator('.jumpcancel').click();
        const toolbar = await page.locator('#searchbox').boundingBox();
        assert.ok(toolbar.height < 60, 'desktop native search fits one compact row');
        await page.locator('#exc-search-filter-toggle').click();
        await page.locator('#cat_2').click();
        await page.waitForFunction(() => document.getElementById('exc-search-filter-toggle').textContent.includes('排除 1 类'));
        await page.locator('#exc-search-filter-toggle').click();
        await page.locator('#f_search').fill('native query');
        await page.locator('#f_search').press('Enter');
        assert.deepEqual(await page.evaluate(() => window.__submittedSearch), { f_cats: '2', f_search: 'native query' });
        await page.locator('a[onclick*="toggle_advsearch_pane"]').click();
        await page.locator('input[name="f_sh"]').check();
        await page.locator('#f_search').press('Enter');
        assert.equal((await page.evaluate(() => window.__submittedSearch)).f_sh, 'on');
        await page.locator('a[onclick*="toggle_filesearch_pane"]').click();
        assert.equal(await page.locator('#fsdiv input[type="file"]').isVisible(), true);
        await screenshot(page, 'native-search-expanded');
        await page.locator('a[onclick*="toggle_filesearch_pane"]').click();
        await page.locator('a[onclick*="toggle_advsearch_pane"]').click();
        assert.equal(await page.locator('#advdiv').isVisible(), false);
        await page.locator('#exc-search-filter-toggle').click();
        await page.locator('#cat_2').click();
        await page.locator('#exc-search-filter-toggle').press('Escape');
        assert.equal(await page.locator('#searchbox .itc').isVisible(), false);
        await page.locator('#f_search').fill('collection');
        await page.setViewportSize({ width: 390, height: 844 });
        const smallSearch = await page.locator('#searchbox').evaluate((el) => {
          const nodes = el.querySelectorAll('input:not([type="hidden"]), .exc-search-options, .exc-search-options a');
          return Array.from(nodes).every(node => {
            const rect = node.getBoundingClientRect();
            return rect.left >= 0 && rect.right <= innerWidth;
          });
        });
        assert.equal(smallSearch, true, 'native search and option links stay inside a narrow viewport');
        assert.equal(await page.locator('.exc-result-navigation').evaluate((el) =>
          [...el.querySelectorAll('#rangebar, .searchnav > div')].every(node => {
            const rect = node.getBoundingClientRect();
            return rect.left >= 0 && rect.right <= innerWidth;
          })), true, 'range and pager fit the narrow viewport');
        await screenshot(page, 'native-search-mobile');
        for (const width of [390, 820, 1480, 1920, 2560]) {
          await page.setViewportSize({ width, height: 960 });
          await assertGridUsesAvailableWidth(page);
          if (width >= 1920) await screenshot(page, `grid-${width}`);
        }
        await page.setViewportSize({ width: 1480, height: 960 });
        const spacing = await page.locator('.itg').evaluate((el) => {
          const cards = [...el.querySelectorAll('.gl1t')].map(card => card.getBoundingClientRect());
          const nextRow = cards.find(card => card.top > cards[0].top);
          return { across: cards[1].left - cards[0].right, down: nextRow.top - cards[0].bottom };
        });
        assert.ok(spacing.across >= 18 && spacing.down >= 22, 'native grid has room around status frames');
        const rhythm = await page.locator('.gl1t').evaluateAll(cards => cards.slice(0, 4).map(el => ({
          cover: el.querySelector('.gl3t').getBoundingClientRect().bottom,
          title: el.querySelector('.gl4t').getBoundingClientRect().top,
          meta: el.querySelector('.gl5t').getBoundingClientRect().top,
          tools: el.querySelector('.exc-tool-bar').getBoundingClientRect().top,
        })));
        assert.ok(rhythm.every(r => r.title > r.cover && r.meta > r.title), 'cover precedes title and metadata');
        assert.ok(rhythm.every(r => Math.abs(r.tools - rhythm[0].tools) < 2), 'mixed cover ratios keep actions aligned');
        await card.locator('.exc-native-tags summary').click();
        assert.equal(await card.locator('.gl6t').isVisible(), true);
        await card.locator('.exc-native-tags summary').click();
        await card.locator('[id^="posted_"]').click();
        assert.equal(await page.evaluate(() => window.__favoriteClicked), true, 'native favorite action survives layout');
      }
      assert.equal(await card.locator('.exc-badge-container').count(), 1);
      assert.equal(await card.locator('.exc-more-btn').count(), 1);
      assert.equal(await card.locator('[data-exc-act="bind"]').isVisible(), false);
      assert.equal(await page.locator('#nb a').count(), 5);
      assert.equal(await page.locator('tr > .exc-badge-container, tr > .exc-tag-stream, a > .exc-tool-bar').count(), 0);
      const bounds = await card.evaluate((el) => {
        const host = el.querySelector('.exc-cover-host') || el.querySelector('.glname');
        const badge = el.querySelector('.exc-badge-container').getBoundingClientRect();
        const area = host.getBoundingClientRect();
        return { fits: badge.left >= area.left - 1 && badge.right <= area.right + 1 && badge.top >= area.top - 1, frame: getComputedStyle(el).outlineWidth };
      });
      assert.equal(bounds.fits, true, `${mode}: badges stay in their own host`);
      assert.equal(bounds.frame, '3px');
      await page.locator('.searchtext').click();
      await screenshot(page, `${mode}-list`);
      if (mode === 'grid' && screenshotDir) {
        await page.locator('.exc-result-navigation').screenshot({ path: path.join(screenshotDir, 'exh-result-navigation.png') });
      }
      await card.locator('.exc-more-btn').click();
      await page.waitForFunction(() => !!document.querySelector('.exc-card-menu:popover-open'));
      assert.equal(await card.locator('[data-exc-act="bind"]').isVisible(), true);
      const menu = await card.locator('.exc-card-menu').boundingBox();
      assert.ok(menu.x >= 0 && menu.x + menu.width <= 1480 && menu.y + menu.height <= 960);
      await page.keyboard.press('Escape');
      assert.equal(await card.locator('[data-exc-act="bind"]').isVisible(), false);
      const originalTags = await card.locator('.exc-tag-stream .meta-tag').allTextContents();
      await card.locator('[data-exc-act="breakpoint"]').click();
      await page.waitForFunction(() => document.querySelector('.exc-gl-item.is-exc-breakpoint .exc-last-seen-mark'));
      assert.equal(await card.locator('.exc-last-seen-mark').textContent(), '上次看到');
      assert.deepEqual(await card.locator('.exc-tag-stream .meta-tag').allTextContents(), originalTags, 'refresh must not reparse script badges as site tags');
      const second = page.locator('.exc-gl-item').nth(1);
      const beforeBreakpoint = await second.boundingBox();
      await second.locator('[data-exc-act="breakpoint"]').click();
      await page.waitForFunction(() => document.querySelectorAll('.exc-gl-item')[1].classList.contains('is-exc-breakpoint'));
      assert.equal(await card.locator('[data-exc-act="breakpoint"]').textContent(), '设为断点');
      if (mode === 'grid') {
        const afterBreakpoint = await second.boundingBox();
        assert.equal(Math.round(afterBreakpoint.y), Math.round(beforeBreakpoint.y), 'grid breakpoint must not insert an empty row');
        await card.locator('.exc-more-btn').click();
        await card.locator('[data-exc-act="bind"]').click();
        await page.locator('#exc-wb-dialog.is-open').waitFor();
        await page.locator('#exc-wb-dialog').click({ position: { x: 2, y: 2 } });
        await card.locator('.exc-more-btn').click();
        await card.locator('[data-exc-act="drop"]').click();
        await page.waitForFunction(() => document.querySelector('.exc-gl-item.is-exc-blocked'));
        await card.locator('.exc-more-btn').click();
        assert.equal(await card.locator('[data-exc-act="drop"]').textContent(), '取消屏蔽');
        await card.locator('[data-exc-act="drop"]').click();
        await page.waitForFunction(() => !document.querySelector('.exc-gl-item.is-exc-blocked'));
        const fab = await waitFab(page);
        const fabStart = await fab.boundingBox();
        await page.mouse.move(fabStart.x + fabStart.width / 2, fabStart.y + fabStart.height / 2);
        await page.mouse.down();
        await page.mouse.move(1479, 959, { steps: 5 });
        await page.mouse.up();
        const fabEnd = await fab.boundingBox();
        assert.ok(1480 - fabEnd.x - fabEnd.width <= 16 && 960 - fabEnd.y - fabEnd.height <= 16, 'FAB reaches the bottom right');
        await page.waitForFunction(() => !document.getElementById('jlc-wb-fab').dataset.suppressClick);
        await fab.focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelector('#jlc-wb.is-open.is-docked'));
        const dock = await page.locator('#jlc-wb').boundingBox();
        const content = await page.locator('.ido').boundingBox();
        assert.ok(content.x + content.width <= dock.x, 'docked panel leaves the list visible');
        await assertGridUsesAvailableWidth(page);
        await screenshot(page, 'docked');
        await page.locator('#jlc-wb-settings-btn').click();
        assert.equal(await page.locator('.jlc-wb-body').evaluate((el) => el.inert), true);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.jlc-wb-body').evaluate((el) => el.inert), false);
        await page.locator('#exc-wb-layout-toggle').click();
        const header = await page.locator('.jlc-wb-header').boundingBox();
        await page.mouse.move(header.x + 30, header.y + 20);
        await page.mouse.down();
        await page.mouse.move(header.x - 100, header.y + 100, { steps: 5 });
        await page.mouse.up();
        const moved = await page.locator('#jlc-wb').boundingBox();
        await page.locator('#jlc-wb-close-btn').click();
        await (await waitFab(page)).click();
        const restored = await page.locator('#jlc-wb').boundingBox();
        assert.ok(Math.abs(moved.x - restored.x) < 2 && Math.abs(moved.y - restored.y) < 2, 'float remembers its position');
        await page.locator('#jlc-wb-settings-btn').click();
        await page.locator('[data-jlc-settings-tab="ui"]').click();
        await page.locator('#exc-cfg-cream-site').uncheck();
        await page.locator('#exc-cfg-save').click();
        assert.equal(await page.locator('html').evaluate((el) => el.classList.contains('exc-cream-site')), false);
        assert.equal(await page.locator('#exc-search-filter-toggle').count(), 0);
        assert.equal(await page.locator('.exc-result-navigation').count(), 0);
        assert.equal(await page.locator('#rangebar').evaluate((el) => el.nextElementSibling.className), 'searchtext');
        assert.equal(await page.locator('#searchbox .itc').isVisible(), true);
        assert.equal(await page.evaluate(() => document.getElementById('f_search') === window.__nativeSearchField), true);
        await page.locator('#exc-cfg-cream-site').check();
        assert.equal(await page.locator('#exc-search-filter-toggle').count(), 1);
        assert.equal(await page.locator('#searchbox .itc').isVisible(), false);
        await page.locator('#exc-cfg-cream-site').uncheck();
        await page.locator('#jlc-wb-settings-close').click();
        await page.locator('#jlc-wb-close-btn').click();
        await card.locator('.exc-more-btn').click();
        assert.equal(await card.locator('[data-exc-act="best"]').isVisible(), true);
        await page.keyboard.press('Escape');
        await page.setViewportSize({ width: 390, height: 844 });
        await (await waitFab(page)).click();
        const mobile = await page.locator('#jlc-wb').boundingBox();
        assert.ok(mobile.x >= 0 && mobile.x + mobile.width <= 391 && mobile.y + mobile.height <= 845);
        assert.equal(await page.locator('#exc-wb-layout-toggle').isVisible(), false);
        await screenshot(page, 'mobile');
        await page.locator('#jlc-wb-settings-btn').click();
        await screenshot(page, 'mobile-settings');
      }
      assertNoRuntimeErrors(runtimeErrors);
      console.log(`PASS ExH ${mode}: cover badges, menu, breakpoint${mode === 'grid' ? ', dock/float, settings, mobile' : ''}`);
    } finally { await context.close(); }
  }
  {
    const { page, context, runtimeErrors } = await openScriptPage(browser, {
      host: 'e-hentai.org', fixtureHtml: fixture('grid'), scriptPath: PATHS.exhDist,
      viewport: { width: 1480, height: 960 },
      gmValues: { exh_commander_config_v1: { list_hover_preview: true, list_hover_preview_delay_ms: 120, list_hover_preview_count: 6 } },
      beforeScript: async (page) => {
        await page.evaluate(installNativeSearchFixture);
        await page.evaluate(html => {
          window.GM_xmlhttpRequest = options => setTimeout(() => options.onload?.({ status: 200, responseText: html }), 40);
        }, detailFixture().replace('<div class="gdtl">', `<div class="gdtm"><div style="width:240px;height:320px;background:transparent url('${cover(0)}') -10px 0 no-repeat"><a href="/s/cover/810000-1"></a></div></div><div class="gdtm"><div style="width:240px;height:320px;background:transparent url('${cover(2)}') -20px 0 no-repeat"><a href="/s/sprite/810000-2"></a></div></div><div class="gdtl">`));
      },
    });
    try {
      await page.locator('.exc-tool-bar').first().waitFor();
      await page.locator('.gl4t').first().hover();
      assert.equal(await page.locator('#exc-hover-preview.is-open').count(), 0);
      await page.locator('.exc-cover-host').first().hover();
      await page.locator('#exc-hover-preview .exc-hp-cell').first().waitFor();
      assert.equal(await page.locator('.exc-hp-cell').count(), 6);
      assert.match(await page.locator('.exc-hp-title').textContent(), /Garden notes/);
      assert.match(await page.locator('.exc-hp-cell').first().getAttribute('href'), /810000-2$/);
      assert.equal(await page.locator('.exc-hp-bg').evaluate(el => {
        const sprite = el.getBoundingClientRect(), cell = el.parentElement.getBoundingClientRect();
        return sprite.width <= cell.width && sprite.height <= cell.height;
      }), true, 'sprite thumbnails scale without cropping');
      await page.locator('.exc-hp-head').hover();
      assert.equal(await page.locator('#exc-hover-preview').isVisible(), true);
      await screenshot(page, 'hover-preview');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#exc-hover-preview').isVisible(), false);
      await page.setViewportSize({ width: 390, height: 450 });
      await page.locator('.exc-cover-host').first().hover();
      await page.locator('#exc-hover-preview .exc-hp-cell').first().waitFor();
      const preview = await page.locator('#exc-hover-preview').boundingBox();
      assert.ok(preview.x >= 8 && preview.x + preview.width <= 382 && preview.y + preview.height <= 442);
      assertNoRuntimeErrors(runtimeErrors);
      console.log('PASS ExH preview: cover trigger, title, pages, pointer transfer, Escape, viewport');
    } finally { await context.close(); }
  }
  {
    const { page, context, runtimeErrors } = await openScriptPage(browser, {
      host: 'e-hentai.org', fixtureHtml: detailFixture(), scriptPath: PATHS.exhDist,
      viewport: { width: 1480, height: 1100 },
      gmValues: { exh_commander_config_v1: { lrr_base_url: 'https://library.example', gallery_thumb_scale: 1 } },
      beforeInject: page => page.evaluate(() => history.replaceState({}, '', '/g/810000/aabbccddee/')),
      beforeScript: page => page.evaluate(() => {
        window.GM_xmlhttpRequest = options => setTimeout(() => options.onload?.({ status: 200, responseText: '' }), 0);
      }),
    });
    try {
      await page.locator('#exc-gallery-panel').waitFor();
      // Seed the current work's library source and another edition through its existing database.
      await page.evaluate(async () => {
        const db = await new Promise(resolve => { const req = indexedDB.open('exh_commander_db'); req.onsuccess = () => resolve(req.result); });
        const tx = db.transaction(['editions', 'local_archives'], 'readwrite');
        const done = new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = reject; });
        const editions = tx.objectStore('editions');
        const rows = await new Promise(resolve => { const req = editions.getAll(); req.onsuccess = () => resolve(req.result); });
        const current = rows[0];
        editions.put({ ...current, id: 'e_810001_bbbbbbbbbb', gid: '810001', token: 'bbbbbbbbbb', language: 'ja', pages: 64, size_bytes: 96 * 1024 * 1024, url: 'https://e-hentai.org/g/810001/bbbbbbbbbb/' });
        tx.objectStore('local_archives').put({ arcid: 'sample-library', eh_gid: current.gid, title: current.title_raw, title_core: current.title_core, language: current.language, tags: current.tags, pages: 44, size_bytes: 100 * 1024 * 1024 });
        await done; db.close(); window.__excRefreshPage();
      });
      await page.locator('.exc-compare-card.is-lrr').waitFor();
      await page.locator('.exc-compare-card.is-editions').waitFor();
      await page.locator('#gdf a').click();
      assert.equal(await page.evaluate(() => window.__favoriteClicked), true);
      assert.match(await page.locator('#gd5 a').first().getAttribute('href'), /act=torrent/);
      assert.equal(await page.locator('#exc-gallery-panel [data-exc-g="source"]').isVisible(), false);
      await page.locator('.exc-g-manage summary').click();
      await page.locator('[data-exc-g="bind"]').first().click();
      await page.locator('#exc-wb-dialog.is-open').waitFor();
      await page.locator('#exc-wb-dialog').click({ position: { x: 2, y: 2 } });
      await page.locator('[data-exc-g="track"]').first().click();
      await page.waitForFunction(() => document.querySelector('.exc-g-manage[open]'));
      assert.equal(await page.locator('[data-exc-g="source"]').isVisible(), true, 'refresh preserves management disclosure');
      await page.locator('.exc-g-manage summary').click();
      await page.evaluate(() => scrollTo(0, 0));
      for (const width of [1480, 960, 390]) {
        await page.setViewportSize({ width, height: 1100 });
        const layout = await page.evaluate(() => {
          const panel = document.getElementById('exc-gallery-panel').getBoundingClientRect();
          const mid = document.getElementById('gmid').getBoundingClientRect();
          const cover = document.getElementById('gd1').getBoundingClientRect();
          return { fits: document.documentElement.scrollWidth <= innerWidth, below: panel.top >= mid.bottom, cover: cover.width > 0 && cover.height > 0 };
        });
        assert.deepEqual(layout, { fits: true, below: true, cover: true }, `gallery at ${width}px`);
        await screenshot(page, `gallery-${width}`);
      }
      assertNoRuntimeErrors(runtimeErrors);
      console.log('PASS ExH gallery: native layout, library/edition comparison, favorite, bind, track, responsive cover');
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
