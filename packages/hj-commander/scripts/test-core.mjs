import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm, { createContext, runInContext } from 'node:vm';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const partsDir = path.join(dirname, '..', 'src', 'parts');

let passed = 0;

const tests = [];

function test(name, fn) {
  tests.push(async () => {
    try {
      await fn();
      passed += 1;
      console.log('  OK  ' + name);
    } catch (error) {
      console.error('  FAIL  ' + name);
      console.error('       ', error && error.stack ? error.stack : error);
      process.exitCode = 1;
    }
  });
}

console.log('HJ core tests');

test('test harness initialization', () => {
  assert.ok(fs.existsSync(path.join(partsDir, '00-header.meta.js')));
});

function makeMountElement(id, className, rect, parent) {
  const el = {
    nodeType: 1,
    id: id || '',
    className: className || '',
    parentElement: parent || null,
    textContent: '',
    children: [],
    getBoundingClientRect: () => rect,
    querySelectorAll: () => [],
    appendChild(node) {
      node.parentElement = this;
      this.children.push(node);
      return node;
    },
  };
  if (parent) parent.children.push(el);
  return el;
}

test('mobile post without known classes still receives the inline player', () => {
  const code = fs.readFileSync(path.join(partsDir, '30-media-parser.js'), 'utf8');
  const html = makeMountElement('', '', { width: 390, height: 1600, top: 0, left: 0 });
  const head = makeMountElement('head', '', { width: 0, height: 0, top: 0, left: 0 }, html);
  const body = makeMountElement('page', '', { width: 390, height: 1600, top: 0, left: 0 }, html);
  const nav = makeMountElement('top-nav', 'nav header', { width: 390, height: 48, top: 0, left: 0 }, body);
  const post = makeMountElement('', 'card', { width: 360, height: 640, top: 60, left: 15 }, body);
  const paywall = makeMountElement('', 'lock', { width: 200, height: 40, top: 420, left: 90 }, post);
  paywall.textContent = '支付金币解锁';
  body.insertBefore = (node, before) => {
    node.parentElement = body;
    node.nextElementSibling = before;
    if (!body.children.includes(node)) body.children.push(node);
    return node;
  };
  body.firstChild = nav;
  post.firstChild = paywall;

  const elements = [nav, post, paywall];
  const videoUrl = 'https://cdn.example.com/hls/post/index.m3u8';
  const created = [];
  const documentMock = {
    body,
    head,
    documentElement: html,
    readyState: 'complete',
    getElementById: (id) => created.find((node) => node.id === id) || null,
    createElement: (tag) => {
      const node = {
        tagName: tag,
        id: '',
        className: '',
        parentElement: null,
        style: {},
        innerHTML: '',
        attributes: {},
        dataset: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        getAttribute(name) { return this.attributes[name] || null; },
        removeAttribute(name) { delete this.attributes[name]; },
        querySelectorAll: () => [],
        addEventListener() {},
        appendChild(node) {
          node.parentElement = this;
          this.firstChild = this.firstChild || node;
          return node;
        },
        insertBefore(node) {
          return this.appendChild(node);
        },
      };
      created.push(node);
      return node;
    },
    querySelector: () => null,
    contains: () => false,
    querySelectorAll: (selector) => {
      if (selector === 'button, a, div, span, p') return elements;
      if (selector === 'video, img, [class*="cover"], [class*="poster"], [class*="blur"]') return [];
      return [];
    },
  };
  const windowMock = {
    __creamu_hj_media_cache: { videos: [videoUrl], images: [], rawUrls: new Set([videoUrl]) },
    __creamu_hj_network_log: [],
    Hls: function () {},
    location: { origin: 'https://haijiao.example', protocol: 'https:' },
  };
  windowMock.Hls.isSupported = () => false;
  windowMock.innerWidth = 390;
  windowMock.innerHeight = 844;
  windowMock.addEventListener = () => {};
  const context = createContext({
    console,
    window: windowMock,
    document: documentMock,
    XMLHttpRequest: function () {},
    setTimeout,
    clearTimeout,
    location: windowMock.location,
  });
  try {
    runInContext(code, context);
  } catch (error) {
    throw new Error('parser load failed: ' + (error && error.stack || error));
  }

  const anchor = context.findHjPostMediaContainer();
  assert.equal(anchor, post, 'anchor should be the post, got ' + (anchor && (anchor.id || anchor.className)));
  context.embedHjUnlockedMediaInline();

  const slot = body.children.find((node) => node.id === 'creamu-hj-inline-slot');
  assert.ok(slot, 'player slot should stay outside the post');
  assert.equal(slot.parentElement, body);
  assert.equal(slot.nextElementSibling, post);
  assert.doesNotMatch(slot.style.cssText, /position:\s*fixed/i);
  const player = created.find((node) => node.id === 'creamu-hj-inline-player-box');
  assert.ok(player, 'inline player should be created');
  assert.equal(player.parentElement, slot);
  assert.match(player.innerHTML, /creamu-hj-art-mount/);

  slot.parentElement = null;
  body.children = body.children.filter((node) => node !== slot);
  context.embedHjUnlockedMediaInline();
  assert.equal(player.parentElement, slot, 'a redraw should put the same player back');
  assert.equal(player.getAttribute('data-video-url'), videoUrl);
});

test('playable video urls stay ahead of segment playlists', () => {
  const code = fs.readFileSync(path.join(partsDir, '30-media-parser.js'), 'utf8');
  const windowMock = {
    __creamu_hj_media_cache: { videos: [], images: [], rawUrls: new Set() },
    __creamu_hj_network_log: [],
  };
  const context = createContext({
    console,
    window: windowMock,
    document: { querySelectorAll: () => [], getElementById: () => null },
    XMLHttpRequest: function () {},
    setTimeout,
    clearTimeout,
    location: { origin: 'https://haijiao.example', protocol: 'https:' },
  });
  runInContext(code, context);
  context.parseHjMediaFromString([
    'https://cdn.example.com/api/video/detail',
    'https://cdn.example.com/hls/seg-1.m3u8',
    'https://cdn.example.com/hls/index.m3u8',
    'https://cdn.example.com/post/cover.jpg',
  ].join('\n'));
  assert.deepEqual(windowMock.__creamu_hj_media_cache.videos, [
    'https://cdn.example.com/hls/index.m3u8',
    'https://cdn.example.com/hls/seg-1.m3u8',
  ]);
  context.parseHjMediaFromString('https://cdn.example.com/hls/play?token=abc123');
  assert.deepEqual(windowMock.__creamu_hj_media_cache.videos, [
    'https://cdn.example.com/hls/index.m3u8',
    'https://cdn.example.com/hls/play?token=abc123',
    'https://cdn.example.com/hls/seg-1.m3u8',
  ]);
});

test('mpeg-ts playlists go through hls with userscript requests', () => {
  const code = fs.readFileSync(path.join(partsDir, '30-media-parser.js'), 'utf8');
  const requested = [];
  const loaded = [];
  const video = { src: '', play() {} };
  class FakeHls {
    static isSupported() { return true; }
    static Events = { ERROR: 'error', MANIFEST_PARSED: 'parsed' };
    constructor(config) {
      this.config = config;
      this.listeners = {};
    }
    on(name, fn) { this.listeners[name] = fn; }
    loadSource(url) { loaded.push(url); }
    attachMedia(node) { this.media = node; }
  }
  const context = {
    console,
    window: {
      __creamu_hj_media_cache: { videos: [], images: [], rawUrls: new Set() },
      Hls: FakeHls,
    },
    performance: undefined,
    document: { querySelectorAll: () => [], getElementById: () => null },
    XMLHttpRequest: function () {},
    setTimeout,
    clearTimeout,
    GM_xmlhttpRequest(options) {
      requested.push(options.url);
      options.onload({ response: new Uint8Array([1, 2, 3]).buffer });
    },
  };
  vm.createContext(context);
  runInContext(code, context);
  const statuses = [];
  context.loadHjM3u8WithGm(video, 'https://cdn.example.com/v/preview.m3u8', (text) => statuses.push(text));
  assert.deepEqual(loaded, ['https://cdn.example.com/v/preview.m3u8']);
  assert.equal(video._hjHls.media, video);
  const instance = new video._hjHls.config.loader();
  assert.equal(typeof instance.stats.retry, 'number');
  const keyEvents = [];
  class KeyHls extends FakeHls {
    on(name, fn) {
      super.on(name, fn);
      if (name === 'hlsKeyLoaded') keyEvents.push(fn);
    }
  }
  KeyHls.Events = { ERROR: 'error', MANIFEST_PARSED: 'parsed', KEY_LOADED: 'hlsKeyLoaded' };
  const keyContext = {
    console,
    window: { __creamu_hj_media_cache: { videos: [], images: [], rawUrls: new Set() }, Hls: KeyHls },
    document: {
      querySelectorAll: () => [],
      getElementById: () => null,
      createElement: () => ({ setAttribute() {}, onload: null, onerror: null }),
      head: { appendChild(node) { if (node.onload) node.onload(); } },
      documentElement: { appendChild() {} },
    },
    location: { origin: 'https://haijiao.example' },
    unsafeWindow: {
      createModule: async () => ({
        heap: new Uint8Array(64),
        _malloc(size) { return size; },
        _free() {},
        HEAPU8: null,
        ccall() {},
      }),
    },
    atob: (value) => Buffer.from(value, 'base64').toString('latin1'),
    XMLHttpRequest: function () {},
    setTimeout,
    clearTimeout,
    GM_xmlhttpRequest(options) {
      options.onload({ responseText: Buffer.from('abcd').toString('base64') });
    },
  };
  keyContext.unsafeWindow.createModule = async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const mod = {
      _malloc: () => 0,
      _free() {},
      ccall() { bytes.set([9, 8, 7, 6]); },
      HEAPU8: bytes,
    };
    return mod;
  };
  vm.createContext(keyContext);
  runInContext(code, keyContext);
  const keyVideo = { src: '', play() {} };
  keyContext.loadHjM3u8WithGm(keyVideo, 'https://cdn.example.com/v/preview.m3u8', () => {});
  return new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
  const frag = { decryptdata: { key: new Uint8Array([1, 2, 3, 4]) } };
  keyEvents[0](null, { frag });
  assert.deepEqual([...frag.decryptdata.key], [9, 8, 7, 6]);
  });
  const callbacks = { payload: null, onSuccess(payload) { this.payload = payload; }, onError() {} };
  video._hjHls.config.loader.prototype.load(
    { url: 'https://cdn.example.com/v/seg-1.ts', responseType: 'arraybuffer' },
    {},
    callbacks
  );
  return Promise.resolve().then(() => Promise.resolve()).then(() => {
    if (!callbacks.payload) throw new Error('no payload, requested=' + requested.join(','));
    assert.deepEqual(requested, ['https://cdn.example.com/v/seg-1.ts']);
    assert.equal(callbacks.payload.data.byteLength, 3);
  }).then(() => new Promise((resolve) => {
    context.GM_xmlhttpRequest = (options) => {
      options.onload({ response: String.fromCharCode(0x00, 0xff, 0x10) });
    };
    instance.load(
      { url: 'https://cdn.example.com/v/enc.key', responseType: 'arraybuffer' },
      {},
      { onSuccess(payload) { resolve(payload); }, onError() { resolve(null); } }
    );
  })).then((payload) => {
    assert.deepEqual([...new Uint8Array(payload.data)], [0x00, 0xff, 0x10]);
  });
});

test('capture hooks the page window and keeps scanning until a video exists', () => {
  const code = fs.readFileSync(path.join(partsDir, '30-media-parser.js'), 'utf8');
  const pageFetch = function () {};
  const pageWindow = {
    fetch: pageFetch,
    XMLHttpRequest: function () {},
    __NUXT__: { data: { playUrl: 'https://cdn.example.com/hls/index.m3u8' } },
  };
  pageWindow.XMLHttpRequest.prototype = { open() {}, send() {} };
  const timers = [];
  const context = createContext({
    console,
    window: { __creamu_hj_media_cache: { videos: [], images: [], rawUrls: new Set() } },
    unsafeWindow: pageWindow,
    document: {
      querySelectorAll: () => [],
      getElementById: () => null,
      createElement: () => ({ id: '', style: {}, dataset: {}, getAttribute: () => null, appendChild() {} }),
      body: { appendChild() {} },
    },
    XMLHttpRequest: function () {},
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    clearTimeout,
    setInterval: (fn) => { timers.push(fn); return timers.length; },
    location: { origin: 'https://haijiao.example', protocol: 'https:' },
  });
  runInContext(code, context);
  context.parseHjHiddenMedia();
  assert.notEqual(pageWindow.fetch, pageFetch);
  assert.equal(context.window.__creamu_hj_media_cache.videos[0], 'https://cdn.example.com/hls/index.m3u8');
  assert.ok(timers.length >= 1);
});

test('video cache clears when the post changes', () => {
  const code = fs.readFileSync(path.join(partsDir, '30-media-parser.js'), 'utf8');
  const cache = { videos: ['https://cdn.example.com/old/index.m3u8'], images: [], rawUrls: new Set(), postIdentity: '' };
  const box = { id: 'creamu-hj-inline-player-box', removed: false, removeAttribute() { this.removed = true; } };
  const context = createContext({
    console,
    window: { __creamu_hj_media_cache: cache },
    document: { getElementById: (id) => (id === box.id ? box : null), querySelectorAll: () => [] },
    location: { href: 'https://haijiao.example/post/1001' },
    XMLHttpRequest: function () {},
    setTimeout,
    clearTimeout,
  });
  runInContext(code, context);
  context.resetHjMediaForPost(context.hjPostIdentity());
  assert.equal(cache.postIdentity, '1001');
  assert.equal(cache.videos.length, 0);
  assert.equal(box.removed, true);
  context.parseHjMediaFromString('https://cdn.example.com/new/index.m3u8');
  context.location.href = 'https://haijiao.example/post/1002';
  context.resetHjMediaForPost(context.hjPostIdentity());
  assert.equal(cache.postIdentity, '1002');
  assert.equal(cache.videos.length, 0);
});

function loadUserPostSorter(vm) {
  const code = fs.readFileSync(path.join(partsDir, '32-user-post-sorter.js'), 'utf8');
  const root = { __vue__: vm, parentElement: null };
  const created = [];
  const documentMock = {
    body: { appendChild() {} },
    getElementById: (id) => created.find((node) => node.id === id) || null,
    createElement: () => {
      const node = { id: '', textContent: '', className: '', style: {}, onclick: null };
      created.push(node);
      return node;
    },
    querySelector: (selector) => (selector === '.userinfo' ? root : null),
    querySelectorAll: (selector) => (selector === '.userinfo' ? [root] : []),
  };
  const context = createContext({
    console,
    window: {},
    document: documentMock,
    location: { pathname: '/user/userinfo', href: 'https://haijiao.com/user/userinfo?uid=1' },
    setInterval: () => 0,
  });
  runInContext(code, context);
  return { context, button: () => created[0] };
}

test('latest tab toggles the user post order', async () => {
  const newer = { title: '新帖' };
  const older = { title: '旧帖' };
  const vm = { forumList: [newer, older] };
  const { context, button } = loadUserPostSorter(vm);
  context.initHjPostSorter({ wait: async () => {}, settleRounds: 2 });
  const list = vm.forumList;
  assert.equal(button().textContent, '倒序 2');
  await button().onclick();
  assert.equal(button().textContent, '正序 2');
  assert.equal(vm.forumList, list, 'must reorder the reactive array in place');
  assert.deepEqual(vm.forumList, [older, newer]);
  await button().onclick();
  assert.deepEqual(vm.forumList, [newer, older]);
});

test('oldest-first loads every remaining page before sorting', async () => {
  const pages = [
    [{ title: 'p1-a' }, { title: 'p1-b' }],
    [{ title: 'p2-a' }, { title: 'p2-b' }],
    [{ title: 'p3-a' }],
  ];
  const vm = { forumList: pages[0].slice() };
  let nextPage = 1;
  const { context, button } = loadUserPostSorter(vm);
  // 每次滑到底后，站点把下一页追加到 forumList 末尾
  context.initHjPostSorter({
    wait: async () => {
      if (nextPage < pages.length) vm.forumList.push(...pages[nextPage++]);
    },
    settleRounds: 2,
  });
  await button().onclick();
  assert.equal(nextPage, pages.length, 'all pages must be requested');
  assert.deepEqual(
    Array.from(vm.forumList, (item) => item.title),
    ['p3-a', 'p2-b', 'p2-a', 'p1-b', 'p1-a']
  );
  assert.equal(button().textContent, '正序 5');
  await button().onclick();
  assert.deepEqual(
    Array.from(vm.forumList, (item) => item.title),
    ['p1-a', 'p1-b', 'p2-a', 'p2-b', 'p3-a']
  );
});

test('topic payload decodes from triple base64 and renders the full post', async () => {
  const code = fs.readFileSync(path.join(partsDir, '32-user-post-sorter.js'), 'utf8');
  const json = JSON.stringify({ content: '<p>完整正文</p>', topicId: '42' });
  let encoded = Buffer.from(json, 'utf8').toString('latin1');
  for (let i = 0; i < 3; i += 1) encoded = Buffer.from(encoded, 'latin1').toString('base64');
  const wrapped = JSON.stringify({ data: encoded });
  const inserted = [];
  const anchor = { parentElement: { insertBefore(node) { inserted.push(node); } } };
  const documentMock = {
    querySelector: (selector) => (selector.includes('.post-details') ? anchor : null),
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener() {},
    createElement: () => ({ id: '', style: {}, innerHTML: '' }),
  };
  const context = createContext({
    console,
    window: {},
    document: documentMock,
    location: { href: 'https://haijiao.example/post/details?pid=42', pathname: '/post/details', origin: 'https://haijiao.example' },
    URL,
    atob: (value) => Buffer.from(value, 'base64').toString('latin1'),
    TextDecoder: class {
      decode(bytes) { return Buffer.from(bytes).toString('utf8'); }
    },
    fetch: async () => ({ text: async () => wrapped }),
    setInterval: () => 0,
  });
  vm.createContext(context);
  runInContext(code, context);
  const decoded = context.decodeHjTopicPayload(wrapped);
  assert.equal(decoded.content, '<p>完整正文</p>');
  assert.equal(context.currentHjPostId(), '42');
  let clicks = 0;
  const button = { textContent: '点击展开完整贴文', dataset: {}, click() { clicks += 1; } };
  context.document.querySelectorAll = (selector) => (selector === 'button' ? [button] : []);
  const reading = context.initHjPostReading;
  context.window.__creamu_hj_reading_ready = false;
  reading();
  assert.equal(clicks, 1);
});

test('entering a post from a list opens it in a new tab and returns', () => {
  const code = fs.readFileSync(path.join(partsDir, '32-user-post-sorter.js'), 'utf8');
  let opened = '';
  let backed = false;
  const locationState = { href: 'https://haijiao.example/user/userinfo', pathname: '/user/userinfo', origin: 'https://haijiao.example' };
  const context = createContext({
    console,
    window: { open: (url) => { opened = url; } },
    document: { querySelectorAll: () => [] },
    location: locationState,
    history: { back() { backed = true; } },
    setInterval: () => 0,
  });
  runInContext(code, context);
  context.initHjPostReading();
  assert.equal(opened, '');
  locationState.href = 'https://haijiao.example/post/details?pid=4321001';
  locationState.pathname = '/post/details';
  context.initHjPostReading();
  assert.equal(opened, 'https://haijiao.example/post/details?pid=4321001');
  assert.equal(backed, true);
});

test('home landing dialogs are confirmed and removed', () => {
  const code = fs.readFileSync(path.join(partsDir, '35-ad-sanitizer.js'), 'utf8');
  let clicks = 0;
  const stored = {};
  const dialog = {
    className: 'el-dialog__wrapper',
    textContent: '重要提示 亲爱的海友 年满18岁 我知道了',
    parentElement: { children: [], removeChild(node) { this.children = this.children.filter((child) => child !== node); } },
    querySelectorAll: () => [{ textContent: '我知道了', click() { clicks += 1; } }],
    closest: () => dialog,
  };
  dialog.parentElement.children = [dialog];
  const mask = { className: 'v-modal', parentElement: { children: [], removeChild(node) { this.children = this.children.filter((child) => child !== node); } } };
  mask.parentElement.children = [mask];
  const login = {
    className: 'el-message-box__wrapper',
    textContent: '登录令牌已过期 重新登录',
    parentElement: { children: [], removeChild() { throw new Error('login dialog removed'); } },
  };
  login.parentElement.children = [login];
  let keepLogin = false;
  const documentMock = {
    body: { classList: { remove() {} }, style: {} },
    documentElement: { style: {} },
    querySelectorAll: (selector) => {
      if (selector === '.addbox') return [];
      if (selector.startsWith('.v-modal')) return keepLogin ? [] : [mask];
      return keepLogin ? [login] : [dialog];
    },
  };
  const context = createContext({
    console,
    window: {},
    document: documentMock,
    sessionStorage: {
      setItem(key, value) { stored[key] = value; },
    },
    setInterval: () => 0,
  });
  runInContext(code, context);
  assert.equal(stored.pageOpen, '1');
  context.applyHjAdSanitizer();
  assert.equal(clicks, 1);
  assert.equal(dialog.parentElement.children.length, 0);
  assert.equal(mask.parentElement.children.length, 0);
  keepLogin = true;
  context.closeHjLandingDialogs();
  assert.equal(login.parentElement.children.length, 1);
  let closed = false;
  const addbox = {
    className: 'addbox',
    innerText: '添加海角社区到主屏幕 添加',
    parentElement: { children: [], removeChild(node) { this.children = this.children.filter((child) => child !== node); } },
    querySelector: () => ({ click() { closed = true; } }),
  };
  addbox.parentElement.children = [addbox];
  documentMock.querySelectorAll = (selector) => (selector === '.addbox' ? [addbox] : []);
  context.closeHjLandingDialogs();
  assert.equal(closed, true);
  assert.equal(addbox.parentElement.children.length, 0);
});

test('script metadata stays on haijiao and hides the capture bar', () => {
  const header = fs.readFileSync(path.join(partsDir, '00-header.meta.js'), 'utf8');
  const parser = fs.readFileSync(path.join(partsDir, '30-media-parser.js'), 'utf8');
  assert.doesNotMatch(header, /@match\s+\*:\/\/\*\/\*\s*$/m);
  assert.match(header, /haijiao/);
  assert.match(header, /@connect\s+\*/);
  assert.match(header, /@grant\s+unsafeWindow/);
  assert.doesNotMatch(parser, /new MutationObserver/);
  assert.match(parser, /function renderHjUnlockedMediaBar\(\) \{\s*return;/);
  const theme = fs.readFileSync(path.join(partsDir, '25-theme.js'), 'utf8');
  assert.match(theme, /background-color: #f6f0ea/);
  assert.match(theme, /\.listContainer \{/);
  assert.match(theme, /\.sell-btn/);
  assert.doesNotMatch(theme, /div\[style\*="fixed"\]/);
});

test('hidden image attachments decode with the site alphabet and mount in the post', async () => {
  const code = fs.readFileSync(path.join(partsDir, '30-media-parser.js'), 'utf8');
  const jpeg = Buffer.alloc(32, 0x11);
  jpeg[0] = 0xff;
  jpeg[1] = 0xd8;
  jpeg[2] = 0xff;
  const dataUrl = 'data:image/jpeg;base64,' + jpeg.toString('base64');
  const alphabet = 'ABCD*EFGHIJKLMNOPQRSTUVWX#YZabcdefghijklmnopqrstuvwxyz1234567890';
  const standard = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const encoded = Buffer.from(dataUrl, 'utf8').toString('base64').split('').map((char) => {
    const index = standard.indexOf(char);
    return index < 0 ? char : alphabet[index];
  }).join('');
  const created = [];
  const expand = {
    textContent: '点击展开完整贴文',
    parentElement: {
      parentElement: {
        children: [],
        insertBefore(node) {
          node.parentElement = this;
          this.children.push(node);
          return node;
        },
      },
    },
  };
  const documentMock = {
    getElementById: (id) => created.find((node) => node.id === id) || null,
    querySelector: () => null,
    querySelectorAll: (selector) => (selector === 'button' ? [expand] : []),
    createElement: () => {
      const node = {
        id: '',
        style: {},
        dataset: {},
        innerHTML: '',
        children: [],
        appendChild(child) {
          child.parentElement = this;
          this.children.push(child);
          return child;
        },
      };
      created.push(node);
      return node;
    },
  };
  const windowMock = {
    __creamu_hj_media_cache: { videos: [], images: [], rawUrls: new Set() },
  };
  const context = createContext({
    console,
    window: windowMock,
    document: documentMock,
    TextDecoder: class {
      decode(bytes) { return Buffer.from(bytes).toString('utf8'); }
    },
    atob: (value) => Buffer.from(value, 'base64').toString('latin1'),
    btoa: (value) => Buffer.from(value, 'latin1').toString('base64'),
    Blob: class {
      constructor(parts, options) {
        this.parts = parts;
        this.type = options && options.type;
      }
    },
    URL: { createObjectURL: () => 'blob:hidden-image' },
    XMLHttpRequest: function () {},
    GM_xmlhttpRequest: ({ onload }) => onload({
      response: Uint8Array.from(Buffer.from(encoded, 'utf8')).buffer,
    }),
  });
  vm.createContext(context);
  runInContext(code, context);
  const added = await context.unlockHjHiddenImages({
    attachments: [
      { category: 'images', remoteUrl: 'https://cdn.example.com/hjstore/a.jpg.txt' },
      { category: 'video', remoteUrl: 'https://cdn.example.com/hls/index.m3u8' },
    ],
  });
  assert.equal(added, 1);
  assert.equal(windowMock.__creamu_hj_media_cache.images[0], 'blob:hidden-image');
  const box = created.find((node) => node.id === 'creamu-hj-image-box');
  assert.ok(box, 'decoded image should mount beside the post');
  assert.equal(box.children.length, 1);
  assert.equal(box.children[0].src, 'blob:hidden-image');
});

test('media parser extracts video m3u8/mp4 and image urls from data structures', () => {
  const code = fs.readFileSync(path.join(partsDir, '30-media-parser.js'), 'utf8');
  const windowMock = {
    __creamu_hj_media_cache: { videos: [], images: [], rawUrls: new Set() },
    __INITIAL_STATE__: {
      post: {
        videoUrl: 'https://example.com/video/stream.m3u8',
        coverImage: 'https://example.com/images/cover.jpg'
      }
    }
  };
  const context = createContext({
    console,
    window: windowMock,
    document: {
      querySelectorAll: () => [],
      getElementById: () => null,
    },
    XMLHttpRequest: function () {},
    setTimeout,
    clearTimeout,
  });

  runInContext(code, context);
  const result = context.parseHjHiddenMediaFromGlobals();
  assert.equal(result.videos.length, 1);
  assert.equal(result.videos[0], 'https://example.com/video/stream.m3u8');
  assert.equal(result.images.length, 1);
  assert.equal(result.images[0], 'https://example.com/images/cover.jpg');
});

for (const run of tests) await run();

if (process.exitCode) {
  console.error('\nHJ tests failed.');
  process.exit(1);
}

console.log('\nAll HJ public tests passed (' + passed + ')');
