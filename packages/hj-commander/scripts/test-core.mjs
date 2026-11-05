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

test('playable video urls stay ahead of segment playlists', () => {
  const code = fs.readFileSync(path.join(partsDir, '30-media-parser.js'), 'utf8');
  const windowMock = {
    __creamu_hj_media_cache: { videos: [], images: [], rawUrls: new Set() },
    __creamu_hj_network_log: [],
  };
  const context = createContext({
    console,
    window: windowMock,
    document: { querySelector: () => null, querySelectorAll: () => [], getElementById: () => null },
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
    'https://cdn.example.com/post/encrypted.jpg.txt',
  ].join('\n'));
  assert.deepEqual([...windowMock.__creamu_hj_media_cache.images], ['https://cdn.example.com/post/cover.jpg']);
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

test('HLS loader transforms keys before delivery and cancels stale loads', async () => {
  const code = fs.readFileSync(path.join(partsDir, '30-media-parser.js'), 'utf8');
  const calls = [];
  let resolveModule;
  let stopped = false;
  let delayedRequest;
  class FakeHls {
    static isSupported() { return true; }
    static Events = { ERROR: 'error', MANIFEST_PARSED: 'parsed' };
    constructor(config) { this.config = config; }
    on() {}
    loadSource(url) { this.source = url; }
    attachMedia(video) { this.media = video; }
  }
  const context = createContext({
    console, AbortController, Uint8Array, ArrayBuffer, performance,
    window: { Hls: FakeHls },
    unsafeWindow: { createModule: () => new Promise(resolve => { resolveModule = resolve; }) },
    document: { getElementById: () => null }, location: { origin: 'https://haijiao.com' },
    atob: value => Buffer.from(value, 'base64').toString('latin1'),
    GM_xmlhttpRequest(options) {
      calls.push(options.url);
      if (options.url.endsWith('slow.ts')) delayedRequest = options;
      else if (options.url.endsWith('.jpg')) options.onload({ status: 200, responseText: Buffer.from('abcd').toString('base64') });
      else options.onload({ status: 200, response: Uint8Array.from([1, 2, 3, 4]).buffer });
      return { abort() { stopped = true; options.onabort(); } };
    },
  });
  runInContext(code, context);
  const video = {};
  context.loadHjM3u8WithGm(video, 'https://media.example.test/index.m3u8');
  assert.equal(video._hjHls.media, video);
  const Loader = video._hjHls.config.loader;
  const keyLoader = new Loader();
  let result;
  const done = new Promise((resolve, reject) => keyLoader.load({ url: 'https://media.example.test/enc.key', responseType: 'arraybuffer' }, {}, {
    onSuccess: response => { result = response.data; resolve(); }, onError: reject,
  }));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(result, undefined, 'key delivery waits for decoder readiness');
  const heap = new Uint8Array(32); let offset = 0;
  resolveModule({ HEAPU8: heap, _malloc(size) { const at = offset; offset += size; return at; }, _free() {}, ccall() { heap.set([9,8,7,6]); } });
  await done;
  assert.deepEqual([...new Uint8Array(result)], [9,8,7,6]);
  let stale = false;
  const slow = new Loader();
  slow.load({ url: 'https://media.example.test/slow.ts', responseType: 'arraybuffer' }, {}, { onSuccess() { stale = true; }, onError() { stale = true; } });
  slow.destroy(); delayedRequest.onload({ status: 200, response: new Uint8Array([1]).buffer });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(stopped, true); assert.equal(stale, false);
});

test('network capture owns the page XHR and ignores other posts', async () => {
  class PageXHR {
    open() {}
    send() {}
    addEventListener(_, callback) { this.loaded = callback; }
  }
  const LocalXHR = function () {};
  const originalLocalOpen = () => {};
  LocalXHR.prototype.open = originalLocalOpen;
  const context = createContext({
    console, URL,
    location: { href: 'https://haijiao.com/post/details?pid=42' },
    window: { __creamu_hj_media_cache: { postIdentity: '42', generation: 1, videos: [], images: [], rawUrls: new Set() } },
    unsafeWindow: { XMLHttpRequest: PageXHR },
    XMLHttpRequest: LocalXHR,
    decodeHjTopicPayload: JSON.parse,
  });
  runInContext(fs.readFileSync(path.join(partsDir, '20-sites.js'), 'utf8') + '\n' + fs.readFileSync(path.join(partsDir, '30-media-parser.js'), 'utf8'), context);
  const accepted = [];
  context.acceptHjTopicData = async data => { accepted.push(data.topicId); };
  context.initHjNetworkInterceptor();
  const deliver = (id, delay = false) => {
    const xhr = new PageXHR();
    xhr.open('GET', 'https://haijiao.com/api/topic/' + id);
    xhr.send(); xhr.status = 200; xhr.responseText = JSON.stringify({ topicId: id });
    if (!delay) xhr.loaded();
    return xhr;
  };
  deliver('42'); deliver('99');
  const old = deliver('42', true);
  context.window.__creamu_hj_media_cache.generation++;
  old.loaded();
  assert.deepEqual(accepted, ['42']);
  assert.equal(LocalXHR.prototype.open, originalLocalOpen, 'isolated-world XHR is untouched');
});

test('topic payload and post identity normalize at their boundaries', async () => {
  const code = fs.readFileSync(path.join(partsDir, '20-sites.js'), 'utf8') + '\n' + fs.readFileSync(path.join(partsDir, '32-user-post-sorter.js'), 'utf8');
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
  assert.equal(context.currentHjPostId('https://haijiao.com/post/123'), '123');
  assert.equal(context.currentHjPostId('https://haijiao.com/home'), '');
  assert.equal(context.decodeHjTopicPayload(JSON.stringify({ topicId: '42' })).topicId, '42');

});

test('image attachments decode with the site alphabet', async () => {
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
  context.renderHjUnlockedImages = () => {};
  const added = await context.unlockHjHiddenImages({
    attachments: [
      { category: 'images', remoteUrl: 'https://cdn.example.com/hjstore/a.jpg.txt' },
      { category: 'video', remoteUrl: 'https://cdn.example.com/hls/index.m3u8' },
    ],
  });
  assert.equal(added, 1);
  assert.equal(windowMock.__creamu_hj_media_cache.images[0], 'blob:hidden-image');

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
      querySelector: () => null,
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
