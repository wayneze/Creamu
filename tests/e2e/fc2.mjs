import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { gmMockSource, stripUserscriptMeta } from './helpers.mjs';

const root = process.cwd();
const requireFc2 = createRequire(path.join(root, 'packages/fc2-commander/package.json'));
const artplayer = fs.readFileSync(requireFc2.resolve('artplayer'), 'utf8');
const script = stripUserscriptMeta(fs.readFileSync(path.join(root, 'packages/fc2-commander/dist/creamu-fc2.user.js'), 'utf8'));
const libraryKey = 'creamu_fc2_library';
const channels = [
  { id: '1001', cid: 9999, name: '像素电台', title: '今晚一起玩复古游戏', type: 1, category: 2, count: 120, pay: 0, start_time: 1000 },
  { id: '1002', name: '夜间书房', title: '聊聊最近读过的书', type: 1, category: 1, count: 28, pay: 1, start_time: 2000 },
  { id: '2_1003', name: '同名主播', title: '一对一交流', type: 2, category: 4, count: 1, pay: 0, start_time: 3000 },
  { id: '1004', name: '同名主播', title: '<img src=x onerror=alert(1)>', type: 1, category: 3, count: 12, pay: 0, tid: 3, start_time: 4000 }
];
const browser = await chromium.launch({ headless: true });
const errors = [];
async function open({ room = false, failed = false, seed = {}, adult = false, gate = false,
  transport = null, dependency = true, coldStart = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  let requestPath;
  let requests = 0;
  let failure = failed;
  const liveChannels = channels.map(channel => ({ ...channel }));
  await context.route('**/*', route => {
    const request = route.request();
    if (request.resourceType() === 'document') {
      const body = gate ? '<html><body><h1>年龄确认</h1></body></html>'
        : fs.readFileSync(path.join(root, `tests/e2e/fixtures/fc2-${room ? 'room' : 'list'}.html`), 'utf8');
      return route.fulfill({ contentType: 'text/html', body });
    }
    if (request.url().endsWith('/contents/allchannellist.php')) {
      assert.equal(request.method(), 'POST');
      requests++;
      requestPath = new URL(request.url()).pathname;
      return route.fulfill({ status: failure ? 503 : 200, contentType: 'application/json', body: JSON.stringify({ channel: liveChannels }) });
    }
    return route.fulfill({ status: 204, body: '' });
  });
  await page.goto(`https://live.fc2.com/${room ? '1001/' : adult ? 'adult/' : ''}`);
  await page.addScriptTag({ content: gmMockSource(seed) });
  if (room) await page.evaluate(() => {
    window.originalVideo = document.querySelector('video');
    window.originalChat = document.getElementById('js-right_area');
    window.nativeClicks = 0;
    document.getElementById('native-send').addEventListener('click', () => window.nativeClicks++);
    // The site's resize handlers predate the userscript and must see the final reserved space.
    window.addEventListener('resize', () => {
      window.nativeVideoWidth = document.getElementById('js-video_area')?.getBoundingClientRect().width;
    });
  });
  if (coldStart) await page.evaluate(mode => {
    window.lateNative = document.querySelector(mode === 'shell' ? '.m-viewPlayer' : '#js-livePlayerContainer');
    window.lateAnchor = document.createComment('deferred native initialization');
    lateNative.replaceWith(lateAnchor);
  }, coldStart);
  if (transport && !coldStart) await startMedia(page, transport);
  if (dependency) await page.addScriptTag({ content: artplayer });
  await page.addScriptTag({ content: script });
  if (coldStart) {
    assert.equal(await page.locator('.fc-art-host').count(), 0);
    await page.evaluate(() => lateAnchor.replaceWith(lateNative));
    await page.locator('.art-video').waitFor();
    if (transport) await startMedia(page, transport);
  }
  return {
    page, context, requestPath: () => requestPath, requests: () => requests, recover: () => { failure = false; },
    restartBroadcast: () => { liveChannels[0].start_time = Date.now(); }
  };
}

async function startMedia(page, transport) {
  await page.evaluate(async transport => {
    const video = document.getElementById('native-live');
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const context = canvas.getContext('2d');
    let frame = 0;
    window.mediaTimer = setInterval(() => {
      context.fillStyle = frame++ % 2 ? '#3d6651' : '#755249';
      context.fillRect(0, 0, 320, 180);
    }, 40);
    window.mediaStream = canvas.captureStream(25);
    if (transport === 'mse') {
      const chunks = [];
      const recorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm;codecs=vp8' });
      recorder.ondataavailable = event => chunks.push(event.data);
      const stopped = new Promise(resolve => { recorder.onstop = resolve; });
      recorder.start();
      await new Promise(resolve => setTimeout(resolve, 1500));
      recorder.stop();
      await stopped;
      const buffer = await new Blob(chunks).arrayBuffer();
      const mediaSource = new MediaSource();
      video.src = URL.createObjectURL(mediaSource);
      await new Promise(resolve => mediaSource.addEventListener('sourceopen', resolve, { once: true }));
      const sourceBuffer = mediaSource.addSourceBuffer('video/webm;codecs="vp8"');
      const appended = new Promise(resolve => sourceBuffer.addEventListener('updateend', resolve, { once: true }));
      sourceBuffer.appendBuffer(buffer);
      await appended;
      mediaSource.endOfStream();
      video.loop = true;
    } else {
      window.sender = new RTCPeerConnection();
      window.receiver = new RTCPeerConnection();
      sender.onicecandidate = event => event.candidate && receiver.addIceCandidate(event.candidate);
      receiver.onicecandidate = event => event.candidate && sender.addIceCandidate(event.candidate);
      const received = new Promise(resolve => {
        receiver.ontrack = event => { video.srcObject = event.streams[0]; resolve(); };
      });
      mediaStream.getTracks().forEach(track => sender.addTrack(track, mediaStream));
      const offer = await sender.createOffer();
      await sender.setLocalDescription(offer);
      await receiver.setRemoteDescription(offer);
      const answer = await receiver.createAnswer();
      await receiver.setLocalDescription(answer);
      await sender.setRemoteDescription(answer);
      await received;
    }
    await video.play();
    window.originalSource = video.src;
    window.originalStream = video.srcObject;
    window.initialFrames = video.getVideoPlaybackQuality().totalVideoFrames;
    window.nativePlayEvents = 0;
    video.addEventListener('play', () => nativePlayEvents++);
  }, transport);
}

async function assertDarkSurfaces(page) {
  const surfaces = await page.locator('[data-dark-surface]').evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element);
    const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
    const luminance = values => values.map(v => {
      v /= 255;
      return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    let surface = element;
    while (surface.parentElement && getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)') surface = surface.parentElement;
    const background = luminance(rgb(getComputedStyle(surface).backgroundColor));
    const foreground = luminance(rgb(style.color));
    return {
      element: element.id || element.className,
      background, contrast: (Math.max(background, foreground) + .05) / (Math.min(background, foreground) + .05),
      image: style.backgroundImage
    };
  }));
  assert.ok(surfaces.length > 10, 'fixture must include native room panels');
  for (const surface of surfaces) {
    assert.ok(surface.background < .1, `native light surface remains: ${JSON.stringify(surface)}`);
    assert.ok(surface.contrast >= 4.5, `unreadable native text: ${JSON.stringify(surface)}`);
    assert.equal(surface.image, 'none', `native gradient remains on ${surface.element}`);
  }
}

async function testFc2Multiview() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await context.addInitScript({ content: gmMockSource() });
  await context.addInitScript(() => {
    window.blockPlayback = false;
    window.holdFrames = false;
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      return window.blockPlayback
        ? Promise.reject(new DOMException('User gesture required', 'NotAllowedError'))
        : nativePlay.call(this);
    };
    window.fakeSockets = [];
    window.fakeEngines = [];
    class FakeSocket extends EventTarget {
      static OPEN = 1;
      constructor(url) {
        super(); this.url = url; this.readyState = 1; fakeSockets.push(this);
        setTimeout(() => this.receive('connect_complete', {}), 0);
      }
      receive(name, args, id) { this.onmessage?.({ data: JSON.stringify({ name, arguments: args, id }) }); }
      send(raw) {
        const message = JSON.parse(raw);
        if (message.name === 'get_hls_information') queueMicrotask(() => this.receive('_response_', {
          playlists: [{ status: 0, url: 'https://media.example/master_playlist' }]
        }, message.id));
        if (message.name === 'heartbeat') queueMicrotask(() => this.receive('_response_', {}, message.id));
      }
      close() { this.readyState = 3; }
    }
    class FakeHls {
      static Events = { ERROR: 'error', MANIFEST_PARSED: 'manifest', MEDIA_ATTACHED: 'attached' };
      static isSupported() { return true; }
      constructor(config) {
        this.config = config; this.listeners = {}; this.levels = [
          { height: 360, bitrate: 400000 }, { height: 720, bitrate: 1200000 }
        ]; fakeEngines.push(this);
      }
      on(event, fn) { (this.listeners[event] ||= []).push(fn); }
      emit(event, data) { for (const fn of this.listeners[event] || []) fn(event, data); }
      attachMedia(video) { this.media = video; queueMicrotask(() => this.emit('attached')); }
      loadSource() {
        this.canvas = document.createElement('canvas'); this.canvas.width = 320; this.canvas.height = 180;
        const ctx = this.canvas.getContext('2d'); let n = 0;
        this.timer = setInterval(() => {
          if (window.holdFrames) return;
          ctx.fillStyle = n++ % 2 ? '#37664d' : '#775144'; ctx.fillRect(0, 0, 320, 180);
        }, 40);
        this.stream = this.canvas.captureStream(25); this.media.srcObject = this.stream;
        this.emit('manifest');
      }
      destroy() { this.destroyed = true; clearInterval(this.timer); this.stream?.getTracks().forEach(track => track.stop()); this.media.srcObject = null; }
    }
    window.WebSocket = FakeSocket;
    window.Hls = FakeHls;
  });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (request.resourceType() === 'document') return route.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(root, 'tests/e2e/fixtures/fc2-list.html'), 'utf8') });
    if (url.pathname.endsWith('/api/memberApi.php')) {
      const id = new URLSearchParams(request.postData()).get('streamid');
      return route.fulfill({ json: { status: 1, data: { channel_data: { version: 1, title: 'Live' }, profile_data: { name: 'Room ' + id } } } });
    }
    if (url.pathname.endsWith('/api/getControlServer.php')) {
      const data = new URLSearchParams(request.postData());
      assert.equal(data.get('comment'), '0');
      return route.fulfill({ json: { status: 0, url: 'wss://control.example/', control_token: 'fixture-only' } });
    }
    return route.fulfill({ json: { channel: channels } });
  });
  await page.goto('https://live.fc2.com/?creamu=multi');
  await page.addScriptTag({ content: artplayer });
  await page.addScriptTag({ content: script });
  const cdp = await context.newCDPSession(page);
  async function fullscreenListeners() {
    const { result } = await cdp.send('Runtime.evaluate', { expression: 'document' });
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
    await cdp.send('Runtime.releaseObject', { objectId: result.objectId });
    return listeners.filter(listener => /fullscreen(?:change|error)$/.test(listener.type)).length;
  }
  const initialFullscreenListeners = await fullscreenListeners();
  for (let id = 1001; id <= 1006; id++) {
    await page.getByLabel('添加直播房间', { exact: true }).fill(String(id));
    await page.locator('.fc-multi-add button').click();
  }
  await page.waitForFunction(() => document.querySelectorAll('.fc-multi-tile video').length === 6
    && [...document.querySelectorAll('.fc-multi-tile video')].every(video => video.readyState >= 3 && !video.paused));
  assert.equal(await page.locator('.fc-multi-tile iframe').count(), 0, 'multiview must not load native rooms or hidden chats');
  await page.evaluate(() => { window.keptVideo = document.querySelector('[data-room-id="1001"] video'); window.keptFrames = keptVideo.getVideoPlaybackQuality().totalVideoFrames; });
  assert.equal(await page.evaluate(() => fakeEngines.every(engine => engine.config.backBufferLength === 30 && engine.config.maxMaxBufferLength === 20)), true);
  await page.getByLabel('同屏更多操作', { exact: true }).click();
  await page.getByRole('button', { name: '多路画质', exact: true }).click();
  await page.getByLabel('房间 1001 的画质', { exact: true }).selectOption('1');
  assert.equal(await page.evaluate(() => fakeEngines[0].currentLevel), 1);
  await page.getByRole('button', { name: '全部最低码率', exact: true }).click();
  await page.waitForFunction(() => fakeEngines.every(engine => engine.currentLevel === 0));
  await page.getByRole('button', { name: '全部自动', exact: true }).click();
  await page.waitForFunction(() => fakeEngines.every(engine => engine.currentLevel === -1));
  await page.locator('.fc-dialog').getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '切换房间 1002 的声音', exact: true }).click();
  assert.equal(await page.locator('.fc-multi-tile video').evaluateAll(videos => videos.filter(video => !video.muted).length), 1);
  await page.locator('[data-room-id="1002"]').getByRole('button', { name: '全屏', exact: true }).click();
  await page.waitForFunction(() => document.fullscreenElement?.closest('[data-room-id]')?.dataset.roomId === '1002');
  const fullscreenBox = await page.locator('[data-room-id="1002"] .fc-multi-host').boundingBox();
  assert.ok(fullscreenBox.width >= 1439 && fullscreenBox.height >= 999, 'fullscreen must fill the viewport');
  await page.locator('[data-room-id="1002"] .fc-multi-host').press('f');
  await page.waitForFunction(() => !document.fullscreenElement);
  await page.locator('[data-reorder-id="1001"]').press('End');
  assert.equal(await page.evaluate(() => GM_getValue('creamu_fc2_multiview').rooms.at(-1).id), '1001');
  const visualOrder = () => page.locator('.fc-multi-tile').evaluateAll(tiles => tiles
    .map(tile => ({ id: tile.dataset.roomId, order: Number(tile.style.order) }))
    .sort((a, b) => a.order - b.order).map(tile => tile.id));
  const source = await page.locator('[data-reorder-id="1001"]').boundingBox();
  const target = await page.locator('[data-room-id="1002"] .fc-multi-video').boundingBox();
  await page.mouse.move(source.x + 8, source.y + 8);
  await page.mouse.down();
  await page.mouse.move(target.x + 30, target.y + 30, { steps: 5 });
  await page.mouse.up();
  assert.equal((await visualOrder())[0], '1001');
  assert.equal(await page.evaluate(() => keptVideo === document.querySelector('[data-room-id="1001"] video')
    && keptVideo.getVideoPlaybackQuality().totalVideoFrames > keptFrames), true);
  await page.getByRole('button', { name: '移除房间 1006', exact: true }).click();
  assert.equal(await page.evaluate(() => fakeEngines[5].destroyed && fakeSockets[5].readyState === 3), true);
  await page.getByRole('button', { name: '重新载入房间 1005', exact: true }).click();
  await page.waitForFunction(() => fakeEngines.length === 7 && fakeEngines[6].media.readyState >= 3);
  assert.equal(await page.evaluate(() => fakeEngines[4].destroyed && fakeSockets[4].readyState === 3), true);
  await page.evaluate(() => fakeEngines[0].emit('error', { fatal: true, type: 'networkError', details: 'levelLoadError' }));
  await page.waitForFunction(() => fakeEngines.length === 8 && fakeEngines[7].media.readyState >= 3);
  assert.equal(await page.evaluate(() => keptVideo === document.querySelector('[data-room-id="1001"] video')), true);
  await page.evaluate(() => fakeSockets[7].receive('control_disconnection', { code: 4512 }));
  await page.locator('[data-room-id="1001"] .fc-multi-status').getByText('重复连接已被原站断开 · 请打开原房间', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => fakeEngines[7].destroyed && fakeSockets[7].readyState === 3), true);
  await page.getByRole('button', { name: '重新载入房间 1001', exact: true }).click();
  await page.waitForFunction(() => fakeEngines.length === 9);
  await context.setOffline(true);
  await page.locator('[data-room-id="1002"] .fc-multi-status').getByText('网络已断开', { exact: true }).waitFor();
  await context.setOffline(false);
  await page.waitForFunction(() => [...document.querySelectorAll('.fc-multi-tile video')].every(video => video.readyState >= 3 && !video.paused));
  await page.locator('[data-room-id="1002"] .fc-multi-host').press('Space');
  await page.waitForFunction(() => document.querySelector('[data-room-id="1002"] video').paused);
  await page.waitForTimeout(1100);
  assert.equal(await page.locator('[data-room-id="1002"] .fc-multi-status').innerText(), '已暂停');
  await page.locator('[data-room-id="1002"] .fc-multi-host').press('Space');
  await page.waitForFunction(() => !document.querySelector('[data-room-id="1002"] video').paused);
  await page.evaluate(() => fakeSockets.find(socket => socket.readyState === 1).receive('control_disconnection', { code: 4507 }));
  const denied = await page.locator('.fc-multi-tile').filter({ hasText: '需要登录 · 请打开原房间' }).getAttribute('data-room-id');
  await context.setOffline(true);
  await context.setOffline(false);
  await page.locator(`[data-room-id="${denied}"] .fc-multi-status`).getByText('需要登录 · 请打开原房间', { exact: true }).waitFor();
  for (const width of [1180, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  await page.getByRole('button', { name: '控制台', exact: true }).click();
  await page.getByRole('button', { name: '切换为并排停靠', exact: true }).click();
  const board = await page.locator('#fc-multiview').boundingBox(), panel = await page.locator('#fc-wb').boundingBox();
  assert.ok(board.x + board.width <= panel.x + 1);
  await page.getByRole('button', { name: '最小化控制台', exact: true }).click();
  // One persistent failure consumes the finite retry budget; no background reconnect storm.
  for (let attempt = 0; attempt < 4; attempt++) {
    const before = await page.evaluate(() => fakeEngines.length);
    await page.evaluate(() => fakeEngines.find(engine => !engine.destroyed && engine.media.closest('[data-room-id]')?.dataset.roomId === '1005')
      .emit('error', { fatal: true, type: 'networkError' }));
    if (attempt < 3) await page.waitForFunction(count => fakeEngines.length > count, before);
  }
  await page.locator('[data-room-id="1005"] .fc-multi-status')
    .getByText('媒体加载失败 · 请重载或打开原房间', { exact: true }).waitFor();
  for (let id = 1001; id <= 1005; id++) await page.getByRole('button', { name: '移除房间 ' + id, exact: true }).click();
  assert.equal(await page.evaluate(() => fakeEngines.every(engine => engine.destroyed) && fakeSockets.every(socket => socket.readyState === 3) && Artplayer.instances.length === 0), true);
  await page.evaluate(() => { window.blockPlayback = true; });
  await page.getByLabel('添加直播房间', { exact: true }).fill('1008');
  await page.locator('.fc-multi-add button').click();
  await page.getByText('点击播放以开始观看', { exact: true }).waitFor();
  const awaitingCounts = await page.evaluate(() => [fakeEngines.length, fakeSockets.length]);
  await page.waitForTimeout(17000);
  assert.equal(await page.locator('[data-room-id="1008"] .fc-multi-status').innerText(), '点击播放以开始观看',
    'decoded frames while paused must not overwrite an autoplay permission prompt');
  assert.deepEqual(await page.evaluate(() => [fakeEngines.length, fakeSockets.length]), awaitingCounts,
    'waiting for a user gesture must not consume network retries');
  await page.evaluate(() => { window.blockPlayback = false; });
  await page.locator('[data-room-id="1008"] .fc-multi-host').press('Space');
  await page.getByText('播放中', { exact: true }).waitFor();
  await page.getByRole('button', { name: '移除房间 1008', exact: true }).click();
  await page.evaluate(() => { window.holdFrames = true; });
  await page.getByLabel('添加直播房间', { exact: true }).fill('1009');
  await page.locator('.fc-multi-add button').click();
  await page.waitForFunction(() => {
    const video = document.querySelector('[data-room-id="1009"] video');
    return video && !video.paused && video.readyState < 3;
  });
  const pendingCounts = await page.evaluate(() => [fakeEngines.length, fakeSockets.length]);
  await page.locator('[data-room-id="1009"] .fc-multi-host').press('Space');
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('[data-room-id="1009"] .fc-multi-status').innerText(), '已暂停');
  assert.deepEqual(await page.evaluate(() => [fakeEngines.length, fakeSockets.length]), pendingCounts,
    'pausing before the first frame cancels play() without rebuilding the connection');
  await page.evaluate(() => { window.holdFrames = false; });
  await page.locator('[data-room-id="1009"] .fc-multi-host').press('Space');
  await page.getByText('播放中', { exact: true }).waitFor();
  await page.getByRole('button', { name: '移除房间 1009', exact: true }).click();
  assert.equal(await page.locator('.fc-multi-empty').isVisible(), true);
  assert.equal(await fullscreenListeners(), initialFullscreenListeners,
    'removing all players must release document fullscreen listeners and their detached controls');
  await context.close();
  console.log('FC2 multiview: six media tiles, qualities, order, audio, bounded buffers, fatal recovery, denial, offline, docking and disposal OK');
}

try {
  const session = await open();
  const { page } = session;
  await page.locator('.fc-card').first().waitFor();
  assert.equal(await page.locator('.fc-card').count(), 4);
  assert.equal(await page.locator('#js-container').isVisible(), false);
  assert.equal(await page.locator('.fc-card-title img').count(), 0, 'untrusted titles must be text');
  assert.match(await page.locator('[data-channel-id="1004"]').innerText(), /需门票/);
  // Cover, title and author activate native new-tab navigation, including keyboard and middle-click.
  for (const [id, selector, method] of [
    ['1001', '.fc-cover', 'click'], ['1002', '.fc-card-title', 'keyboard'], ['1004', '.fc-card-name', 'middle']
  ]) {
    const anchor = page.locator(`[data-channel-id="${id}"] ${selector}`);
    const popupPromise = session.context.waitForEvent('page');
    if (method === 'keyboard') await anchor.press('Enter');
    else await anchor.click({ button: method === 'middle' ? 'middle' : 'left' });
    const popup = await popupPromise;
    await popup.waitForURL(`https://live.fc2.com/${id}/`);
    assert.equal(popup.url(), `https://live.fc2.com/${id}/`);
    assert.equal(await popup.evaluate(() => window.opener), null);
    assert.equal(page.url(), 'https://live.fc2.com/', 'directory must stay open');
    await page.locator(`[data-channel-id="${id}"] .fc-visited`).waitFor();
    assert.equal(await page.locator(`[data-channel-id="${id}"] .fc-visited`).textContent(), '本场已看');
    await popup.close();
  }
  session.restartBroadcast();
  await page.getByRole('button', { name: '刷新直播', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-channel-id="1001"] .fc-visited')?.textContent === '曾访问');
  const persisted = await open({ seed: { [libraryKey]: await page.evaluate(key => GM_getValue(key), libraryKey) } });
  await persisted.page.locator('[data-channel-id="1001"] .fc-visited').waitFor();
  await persisted.page.getByRole('button', { name: '控制台', exact: true }).click();
  await persisted.page.getByRole('button', { name: '最近访问', exact: true }).click();
  assert.equal(await persisted.page.locator('#fc-wb .fc-library-item').count(), 3, 'visits must survive a fresh page');
  assert.equal(await persisted.page.locator('#creamu-fc2 h1').textContent(), '发现直播', 'library must not replace the discovery page');
  assert.equal(persisted.requests(), 1, 'opening the console must reuse the directory snapshot');
  await persisted.context.close();
  await page.locator('[data-channel-id="1001"] [data-action=follow]').click();
  let stored = await page.evaluate(key => GM_getValue(key), libraryKey);
  assert.equal(stored['1001'].followed, true);
  assert.equal(stored['9999'], undefined, 'cid must not become room identity');
  await page.locator('[data-channel-id="1001"] [data-action=note]').click();
  await page.getByLabel('私人备注').fill('下次继续看');
  await page.getByLabel('标签（最多 12 个）').fill('游戏, 常看');
  await page.getByRole('button', { name: '保存备注', exact: true }).click();
  await page.getByRole('searchbox').fill('常看');
  assert.equal(await page.locator('.fc-card').count(), 1);
  await page.getByRole('searchbox').fill('');
  await page.getByLabel('费用', { exact: true }).selectOption('1');
  assert.equal(await page.locator('.fc-card').count(), 2);
  await page.getByLabel('费用', { exact: true }).selectOption('');
  await page.locator('[data-channel-id="1002"] [data-action=block]').click();
  assert.equal(await page.locator('.fc-card').count(), 3);
  await page.getByRole('button', { name: '控制台', exact: true }).click();
  const workbench = page.locator('#fc-wb');
  await workbench.getByRole('button', { name: '黑名单', exact: true }).click();
  assert.equal(await workbench.locator('.fc-library-item').count(), 1);
  await workbench.getByRole('button', { name: '取消屏蔽', exact: true }).click();
  assert.equal(await workbench.locator('.fc-library-item').count(), 0);
  assert.equal(await page.locator('#creamu-fc2 .fc-card').count(), 4);
  await page.getByRole('button', { name: '我的关注', exact: true }).click();
  assert.equal(await workbench.locator('.fc-library-item').count(), 1);
  assert.equal(page.url(), 'https://live.fc2.com/');
  // Saved channels absent from this sample are unknown, never falsely "offline".
  await page.evaluate(key => {
    const rows = GM_getValue(key);
    rows['1005'] = { id: '1005', name: '另一位主播', followed: true, updatedAt: 100 };
    GM_setValue(key, rows);
    document.dispatchEvent(new Event('creamu-fc2-library'));
  }, libraryKey);
  assert.match(await workbench.locator('[data-channel-id="1005"]').innerText(), /状态未确认/);
  await workbench.getByRole('searchbox').fill('1005');
  assert.equal(await workbench.locator('.fc-library-item').count(), 1);
  assert.equal(await page.locator('#creamu-fc2 .fc-card').count(), 4, 'console search must not filter the directory');
  await workbench.getByRole('searchbox').fill('');
  await workbench.getByLabel('仅显示本次确认在线', { exact: true }).check();
  assert.equal(await workbench.locator('.fc-library-item').count(), 1);
  await workbench.getByLabel('仅显示本次确认在线', { exact: true }).uncheck();
  const consolePopup = session.context.waitForEvent('page');
  await workbench.locator('[data-channel-id="1005"] .fc-library-title').click();
  const openedRoom = await consolePopup;
  await openedRoom.waitForURL('https://live.fc2.com/1005/');
  await openedRoom.close();
  await workbench.getByRole('button', { name: '最近访问', exact: true }).click();
  await workbench.locator('[data-channel-id="1005"]').waitFor();
  const originalRect = await workbench.boundingBox();
  const heading = await workbench.locator('.jlc-wb-title').boundingBox();
  await page.mouse.move(heading.x + 20, heading.y + 10);
  await page.mouse.down();
  await page.mouse.move(heading.x - 90, heading.y + 50, { steps: 5 });
  await page.mouse.up();
  assert.ok((await workbench.boundingBox()).x < originalRect.x - 50, 'console title must drag the window');
  const resize = await workbench.locator('.jlc-wb-resize-corner').boundingBox();
  const beforeResize = await workbench.boundingBox();
  await page.mouse.move(resize.x + resize.width / 2, resize.y + resize.height / 2);
  await page.mouse.down();
  await page.mouse.move(resize.x - 80, resize.y - 40, { steps: 5 });
  await page.mouse.up();
  assert.notEqual((await workbench.boundingBox()).width, beforeResize.width);
  assert.ok(await page.evaluate(() => GM_getValue('creamu_fc2_workbench').rect.width > 0));
  await workbench.getByRole('button', { name: '最小化控制台', exact: true }).click();
  assert.equal(await workbench.isVisible(), false);
  await page.getByRole('button', { name: '设置', exact: true }).click();
  const importInput = page.getByLabel('选择 FC2 数据文件');
  await importInput.setInputFiles({
    name: 'invalid.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'creamu-fc2', version: 1, channels: [{ id: '../wrong' }] }))
  });
  await page.getByText('数据中包含无效的房间标识，未导入。').waitFor();
  stored = await page.evaluate(key => GM_getValue(key), libraryKey);
  assert.equal(stored['1001'].note, '下次继续看', 'failed import must not mutate existing state');
  await importInput.setInputFiles({
    name: 'valid.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'creamu-fc2', version: 1, channels: [
      { id: '1001', name: '旧名', followed: false, updatedAt: 1 },
      { id: '1006', name: '导入主播', followed: true, updatedAt: 100 }
    ] }))
  });
  await page.getByText('导入成功，已按更新时间合并。').waitFor();
  assert.equal((await page.evaluate(key => GM_getValue(key), libraryKey))['1001'].followed, true);
  await page.keyboard.press('Escape');
  await page.locator('dialog').waitFor({ state: 'detached' });
  assert.equal(await page.locator('dialog').count(), 0);
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('button', { name: '打开 FC2 控制台', exact: true }).click();
    const box = await workbench.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= width + 1 && box.y >= 0 && box.y + box.height <= 901);
    await workbench.getByRole('button', { name: '最小化控制台', exact: true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `directory overflow at ${width}`);
  }
  assert.equal(await page.getByLabel('分类', { exact: true }).isVisible(), false);
  await page.locator('.fc-filter-options summary').click();
  await page.getByLabel('分类', { exact: true }).selectOption('2');
  assert.equal(await page.locator('#creamu-fc2 .fc-card').count(), 1);
  await session.context.close();
  console.log('FC2 directory: new tabs, visit badges and restart/persistence, filters, identity, import and responsive layout OK');

  const largeLibrary = Object.fromEntries(Array.from({ length: 1000 }, (_, index) => {
    const id = String(10000 + index);
    return [id, { id, name: `主播 ${index}`, title: `节目 ${index}`, followed: true, visitedAt: 1000 + index }];
  }));
  const largeRoom = await open({ room: true, seed: { [libraryKey]: largeLibrary } });
  await largeRoom.page.locator('.fc-room-tools').waitFor();
  await largeRoom.page.evaluate(() => {
    const get = GM_getValue;
    window.libraryReads = 0;
    window.GM_getValue = (key, fallback) => {
      if (key === 'creamu_fc2_library') libraryReads++;
      return get(key, fallback);
    };
  });
  await largeRoom.page.getByRole('button', { name: '打开 FC2 控制台', exact: true }).click();
  const largeConsole = largeRoom.page.locator('#fc-wb');
  await largeRoom.page.waitForFunction(() => document.querySelector('.fc-library-list')?.getAttribute('aria-busy') === 'false');
  assert.ok(await largeRoom.page.evaluate(() => libraryReads <= 4), 'render must read the library once per update, never once per row');
  const initialRows = await largeConsole.locator('.fc-library-item').count();
  assert.ok(initialRows > 0 && initialRows <= 80, 'large libraries must start with a bounded set of rows');
  await largeRoom.page.evaluate(() => { window.retainedRow = document.querySelector('.fc-library-item'); });
  await largeConsole.locator('.fc-library-list').evaluate(element => { element.scrollTop = element.scrollHeight; });
  await largeRoom.page.waitForFunction(initial => document.querySelectorAll('.fc-library-item').length > initial, initialRows);
  assert.equal(await largeRoom.page.evaluate(() => retainedRow === document.querySelector('.fc-library-item')), true, 'appending rows must preserve existing rows');
  await largeConsole.getByRole('button', { name: '刷新状态', exact: true }).click();
  await largeRoom.page.waitForFunction(() => document.querySelector('.fc-library-list')?.getAttribute('aria-busy') === 'false');
  assert.equal(await largeRoom.page.evaluate(() => retainedRow === document.querySelector('.fc-library-item')), true, 'unchanged status refresh must not rebuild rows');
  await largeConsole.getByRole('searchbox').fill('10999');
  assert.equal(await largeConsole.locator('.fc-library-item').count(), 1, 'search must include records not yet rendered');
  await largeConsole.locator('[data-channel-id="10999"] [data-action=block]').click();
  assert.equal(await largeConsole.locator('.fc-library-item').count(), 0);
  await largeConsole.getByRole('button', { name: '黑名单', exact: true }).click();
  await largeConsole.getByRole('button', { name: '取消屏蔽', exact: true }).click();
  await largeConsole.getByRole('button', { name: '我的关注', exact: true }).click();
  assert.equal(await largeConsole.locator('.fc-library-item').count(), 1);
  await largeRoom.context.close();
  console.log('FC2 large library: bounded reads/rows, incremental scroll, full-library search and live updates OK');

  const room = await open({ room: true, coldStart: 'player' });
  await room.page.locator('.fc-room-tools').waitFor();
  assert.equal(await room.page.locator('meta[name=viewport]').getAttribute('content'), 'width=device-width, initial-scale=1');
  const bounds = await room.page.evaluate(() => ({
    player: document.getElementById('js-player').getBoundingClientRect().top,
    info: document.querySelector('.m-viewTop').getBoundingClientRect().top,
    chat: document.getElementById('js-right_area').getBoundingClientRect().width
  }));
  assert.ok(bounds.player < bounds.info);
  assert.ok(bounds.player < 240, `player must stay near first screen: ${bounds.player}`);
  assert.equal(bounds.chat, 340);
  assert.ok((await room.page.evaluate(key => GM_getValue(key), libraryKey))['1001'].visitedAt > 0);
  await assertDarkSurfaces(room.page);
  // Exercise a newly arriving native message, then the native row state transitions.
  await room.page.evaluate(() => {
    const message = document.querySelector('.c-chatLines li').cloneNode(true);
    message.id = 'incoming-comment';
    message.querySelector('.com').textContent = '刚刚收到的评论';
    document.querySelector('.c-chatLines').append(message);
  });
  const message = room.page.locator('#incoming-comment');
  const rowColors = new Set();
  for (const state of ['', 'is-system_login', 'is-system_gift', 'is-system_tip', 'is-system_survey-start', 'is-clicked', 'is-sameUser']) {
    await room.page.locator('.fc-room-heading').hover();
    await message.evaluate((element, className) => { element.className = className; }, state);
    await assertDarkSurfaces(room.page);
    rowColors.add(await message.evaluate(element => getComputedStyle(element).backgroundColor));
    await message.hover();
    await assertDarkSurfaces(room.page);
  }
  assert.ok(rowColors.size >= 4, 'system, gift and selection states must stay distinguishable');
  assert.equal(await room.page.locator('.com:not(.black):not(.red)').evaluate(element => getComputedStyle(element).color), 'rgb(241, 238, 232)', 'default comments must remain legible on a dark row');
  assert.equal(await room.page.locator('.com.red').evaluate(element => getComputedStyle(element).color), 'rgb(230, 61, 55)', 'native comment colors must be preserved');
  await room.page.locator('#native-setting').click();
  await room.page.locator('#native-settings').waitFor();
  await assertDarkSurfaces(room.page);
  await room.page.locator('#native-close').click();
  await room.page.locator('#native-settings').waitFor({ state: 'detached' });
  await room.page.getByRole('button', { name: '收起聊天', exact: true }).click();
  assert.equal(await room.page.locator('#js-right_area').isVisible(), false);
  await room.page.getByRole('button', { name: '影院模式', exact: true }).click();
  await room.page.getByRole('button', { name: '展开聊天', exact: true }).click();
  await room.page.getByLabel('聊天内容').fill('测试输入保留');
  await room.page.locator('#native-send').click();
  assert.deepEqual(await room.page.evaluate(() => ({
    video: originalVideo === document.querySelector('.art-video'),
    chat: originalChat === document.getElementById('js-right_area'),
    clicks: nativeClicks,
    input: document.querySelector('.commentSend input').value
  })), { video: true, chat: true, clicks: 1, input: '测试输入保留' });
  await room.page.evaluate(() => { document.querySelector('.c-pgTit').textContent = '新直播标题'; });
  await room.page.getByText('新直播标题', { exact: true }).first().waitFor();
  assert.equal(await room.page.locator('.fc-room-heading strong').textContent(), '新直播标题');
  await room.page.setViewportSize({ width: 390, height: 844 });
  const mobile = await room.page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    videoBottom: document.getElementById('js-left_area').getBoundingClientRect().bottom,
    chatTop: document.getElementById('js-right_area').getBoundingClientRect().top
  }));
  assert.equal(mobile.overflow, false);
  assert.ok(mobile.chatTop >= mobile.videoBottom, 'chat must move below the player');
  await room.context.close();
  console.log('FC2 room: dark native panels/dynamic dialogs and contrast, video-first layout, cinema, native nodes/listeners and mobile stacking OK');

  for (const transport of ['mse', 'webrtc']) {
    const playback = await open({ room: true, transport, coldStart: transport === 'webrtc' ? 'shell' : false,
      seed: {
        [libraryKey]: { '1001': { id: '1001', name: '像素电台', followed: true } },
        creamu_fc2_workbench: { rect: { left: 720, top: 40, width: 520, height: 700 } }
      } });
    const p = playback.page;
    await p.locator('.fc-art-host .art-video').waitFor();
    await p.waitForFunction(() => originalVideo.getVideoPlaybackQuality().totalVideoFrames > initialFrames + 3
      && originalVideo.readyState >= 3 && !originalVideo.seeking);
    assert.deepEqual(await p.evaluate(() => ({
      source: originalVideo.src === originalSource && originalVideo.srcObject === originalStream,
      ready: Artplayer.instances[0].isReady,
      loading: Artplayer.instances[0].loading.show,
      nativeControls: document.getElementById('js-player_controls').inert
    })), { source: true, ready: true, loading: false, nativeControls: true });
    if (transport === 'webrtc') {
      const spinner = p.locator('.fc-player-spinner');
      assert.equal(await spinner.evaluate(element => element.getAnimations().length), 0, 'hidden loading indicator must not run animations');
      assert.equal(await p.locator('.art-loading animate').count(), 0, 'the hidden SVG animation must not remain alongside the replacement');
      await p.evaluate(() => {
        Object.defineProperty(originalVideo, 'readyState', { configurable: true, value: 2 });
        originalVideo.dispatchEvent(new Event('waiting'));
      });
      assert.equal(await spinner.isVisible(), true);
      assert.equal(await spinner.evaluate(element => element.getAnimations().length), 1, 'buffering must still have a visible loading indicator');
      await p.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await spinner.evaluate(element => element.getAnimations().length), 0);
      await p.emulateMedia({ reducedMotion: 'no-preference' });
      await p.evaluate(() => {
        delete originalVideo.readyState;
        originalVideo.dispatchEvent(new Event('playing'));
      });
      assert.equal(await spinner.evaluate(element => element.getAnimations().length), 0);
      const identity = await p.evaluate(() => Artplayer.instances[0].id);
      await p.getByRole('button', { name: '打开 FC2 控制台', exact: true }).click();
      const consolePanel = p.locator('#fc-wb');
      const floatRect = await consolePanel.boundingBox();
      await p.locator('#fc-wb [data-channel-id="1001"]').waitFor();
      assert.match(await p.locator('#fc-wb [data-channel-id="1001"]').innerText(), /当前房间/);
      await p.evaluate(() => {
        window.dockResizeEvents = 0;
        window.addEventListener('resize', () => dockResizeEvents++);
        window.dockStartFrames = originalVideo.getVideoPlaybackQuality().totalVideoFrames;
      });
      await consolePanel.getByRole('button', { name: '切换为并排停靠', exact: true }).click();
      assert.equal(await p.evaluate(() => dockResizeEvents), 1, 'dock must notify FC2 once, without a resize loop');
      async function assertDocked() {
        // Read one layout after resize handlers; separate protocol calls can straddle frames.
        const state = await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => {
          const bounds = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
          const controls = document.querySelector('.art-controls');
          resolve({
            docked: document.documentElement.classList.contains('fc-console-docked'),
            dock: bounds('#fc-wb'), video: bounds('#js-video_area'), chat: bounds('#js-right_area'),
            nativeWidth: nativeVideoWidth,
            pageFits: document.documentElement.scrollWidth <= innerWidth,
            controlsFit: controls.scrollWidth <= controls.clientWidth + 1,
          });
        })));
        const { dock, video, chat } = state;
        assert.equal(state.docked, true);
        assert.equal(dock.y, 0);
        assert.ok(video.x + video.width <= dock.x && chat.x + chat.width <= dock.x + 1,
          'dock must reserve space for video and chat: ' + JSON.stringify({ viewport: p.viewportSize(), dock, video, chat }));
        assert.equal(state.nativeWidth, video.width, 'FC2 resize handlers must see the final video dimensions');
        assert.equal(state.pageFits, true, 'dock must not overflow the page');
        assert.equal(state.controlsFit, true, 'player controls must adapt to the actual video width');
      }
      await assertDocked();
      assert.equal(await consolePanel.locator('.jlc-wb-resize-corner').isVisible(), false);
      const dockRect = await consolePanel.boundingBox();
      const titleRect = await consolePanel.locator('.jlc-wb-title').boundingBox();
      await p.mouse.move(titleRect.x + 10, titleRect.y + 10);
      await p.mouse.down();
      await p.mouse.move(titleRect.x - 100, titleRect.y + 70, { steps: 3 });
      await p.mouse.up();
      assert.deepEqual(await consolePanel.boundingBox(), dockRect, 'docked title must not move the panel');
      await consolePanel.getByRole('button', { name: '切换为自由浮窗', exact: true }).click();
      assert.deepEqual(await consolePanel.boundingBox(), floatRect, 'float mode must restore its own rectangle');
      await consolePanel.getByRole('button', { name: '切换为并排停靠', exact: true }).click();
      for (const width of [1180, 1100, 390, 1440]) {
        await p.setViewportSize({ width, height: 1000 });
        await p.waitForFunction(width => document.documentElement.classList.contains('fc-console-docked') === (width >= 1180), width);
        if (width >= 1180) await assertDocked();
        else {
          assert.equal(await consolePanel.getByRole('button', { name: '切换为自由浮窗', exact: true }).isDisabled(), true);
          const bounds = await consolePanel.boundingBox();
          assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
          assert.equal(await p.evaluate(() => getComputedStyle(document.body).paddingRight), '0px');
        }
      }
      const savedGeometry = await p.evaluate(() => GM_getValue('creamu_fc2_workbench'));
      assert.equal(savedGeometry.panelMode, 'dock');
      assert.deepEqual(savedGeometry.rect, { left: 720, top: 40, width: 520, height: 700 });
      // Both fullscreen modes temporarily float the console and restore docking on exit.
      for (const fullscreenMode of ['网页全屏', '全屏']) {
        await p.locator('.art-video').hover();
        await p.getByRole('button', { name: fullscreenMode, exact: true }).click();
        await p.waitForFunction(() => !document.documentElement.classList.contains('fc-console-docked'));
        assert.equal(await consolePanel.isVisible(), true);
        assert.equal(await p.evaluate(() => getComputedStyle(document.body).paddingRight), '0px');
        if (fullscreenMode === '全屏') {
          assert.equal(await consolePanel.evaluate(element => document.fullscreenElement.contains(element)), true);
          await p.evaluate(() => document.exitFullscreen());
        } else {
          await p.locator('.art-video').press('Escape');
        }
        await p.waitForFunction(() => document.documentElement.classList.contains('fc-console-docked'));
        await assertDocked();
      }
      await consolePanel.getByRole('button', { name: '最近访问', exact: true }).click();
      assert.equal(await p.locator('#fc-wb .fc-library-item').count(), 1);
      await consolePanel.getByRole('searchbox').fill('不匹配');
      assert.equal(await p.evaluate(() => Artplayer.instances[0].id), identity);
      assert.equal(await p.evaluate(() => originalVideo.paused), false, 'browsing the console must not pause playback');
      assert.equal(await p.evaluate(() => originalVideo.srcObject === originalStream && originalVideo.src === originalSource
        && originalVideo === document.querySelector('.art-video') && originalChat === document.getElementById('js-right_area')
        && originalVideo.getVideoPlaybackQuality().totalVideoFrames > dockStartFrames + 5), true,
      'layout transitions must retain the native media, chat and continuous decoding');
      await consolePanel.getByRole('searchbox').press('Escape');
      assert.equal(await consolePanel.isVisible(), false);
      assert.equal(await p.locator('html.fc-console-docked').count(), 0, 'closing the console must release the reserved page space');
      assert.equal(await p.evaluate(() => getComputedStyle(document.body).paddingRight), '0px');
      assert.equal(await p.locator('.fc-art-host').count(), 1, 'cold initialization must attach once');
      const restoredDock = await open({ seed: { creamu_fc2_workbench: savedGeometry } });
      await restoredDock.page.getByRole('button', { name: '打开 FC2 控制台', exact: true }).click();
      assert.equal(await restoredDock.page.locator('#fc-wb.is-docked').count(), 1, 'dock preference must survive a fresh page');
      const directoryBounds = await restoredDock.page.locator('#creamu-fc2').boundingBox();
      const restoredBounds = await restoredDock.page.locator('#fc-wb').boundingBox();
      assert.ok(directoryBounds.x + directoryBounds.width <= restoredBounds.x + 1, 'directory must also sit beside the console');
      assert.equal(await restoredDock.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await restoredDock.context.close();
      console.log('FC2 console dock: reserved layout, float geometry, responsive controls, fullscreen, persistence and live playback OK');
    }
    if (transport === 'webrtc') {
      // FC2's always-present transparent layers must not swallow hover or clicks.
      await p.locator('.art-video').hover();
      await p.locator('.fc-room-heading').hover();
      await p.waitForFunction(() => !Artplayer.instances[0].controls.show);
      await p.locator('.art-video').hover();
      await p.waitForFunction(() => Artplayer.instances[0].controls.show);
      await p.evaluate(() => {
        document.querySelector('.js-loading-gif').style.display = '';
        document.querySelector('.c-soundOnly').style.display = '';
      });
    }
    await p.getByRole('button', { name: '播放 / 暂停', exact: true }).click();
    await p.waitForFunction(() => originalVideo.paused);
    await p.getByRole('button', { name: '播放 / 暂停', exact: true }).click();
    await p.waitForFunction(() => !originalVideo.paused && nativePlayEvents > 0);
    await p.getByLabel('聊天内容').fill('测试');
    await p.getByLabel('聊天内容').press('Space');
    assert.equal(await p.evaluate(() => originalVideo.paused), false);
    await p.getByRole('button', { name: '播放设置', exact: true }).click();
    if (transport === 'webrtc') {
      await p.locator('.fc-player-menu p').hover();
      await p.waitForTimeout(await p.evaluate(() => Artplayer.CONTROL_HIDE_TIME + 400));
      assert.equal(await p.locator('.fc-player-menu').isVisible(), true, 'settings must stay open during idle reading');
      assert.equal(await p.getByRole('button', { name: '播放设置', exact: true }).getAttribute('aria-expanded'), 'true');
      const workload = await p.evaluate(async () => {
        let mediaStyleReads = 0;
        const readStyle = window.getComputedStyle;
        window.getComputedStyle = function (element, ...args) {
          if (element.matches('video, .js-hlsQualityBtnArea, .js-hlsLatencyArea')) mediaStyleReads++;
          return readStyle.call(this, element, ...args);
        };
        const identity = Artplayer.instances[0];
        const frames = originalVideo.getVideoPlaybackQuality().totalVideoFrames;
        const comment = document.createElement('li');
        const statistics = document.createElement('span');
        document.getElementById('js-commentLine').append(comment);
        document.getElementById('js-videoControlsBox').append(statistics);
        try {
          for (let i = 0; i < 90; i++) {
            await new Promise(requestAnimationFrame);
            comment.style.transform = `translateX(${i}px)`;
            statistics.textContent = `${i} kbps`;
          }
          await new Promise(requestAnimationFrame);
          return {
            mediaStyleReads, stable: Artplayer.instances.length === 1 && Artplayer.instances[0] === identity,
            decodedFrames: originalVideo.getVideoPlaybackQuality().totalVideoFrames - frames
          };
        } finally {
          window.getComputedStyle = readStyle;
          comment.remove();
          statistics.remove();
        }
      });
      assert.equal(workload.mediaStyleReads, 0, 'comment animation/statistics must not rescan media or native settings');
      assert.equal(workload.stable, true);
      assert.ok(workload.decodedFrames > 10, 'live decode must continue during native DOM activity');
      console.log('FC2 idle menu and 90 native animation frames:', workload);
      await p.evaluate(() => {
        document.querySelector('.js-loading-gif').style.display = 'none';
        document.querySelector('.c-soundOnly').style.display = 'none';
      });
    }
    await p.getByLabel('直播画质', { exact: true }).selectOption('5');
    await p.waitForFunction(() => nativePlayerActions.quality === '5');
    await p.getByLabel('直播延迟', { exact: true }).selectOption('2');
    await p.waitForFunction(() => nativePlayerActions.latency === 2);
    await p.getByLabel('画面适配', { exact: true }).selectOption('cover');
    assert.equal(await p.locator('.art-video').evaluate(video => getComputedStyle(video).objectFit), 'cover');
    await p.getByLabel('画面适配', { exact: true }).selectOption('contain');
    await p.evaluate(() => { Artplayer.instances[0].volume = .34; Artplayer.instances[0].muted = false; });
    await p.waitForFunction(() => GM_getValue('creamu_fc2_preferences').playerVolume === .34);
    await p.getByRole('button', { name: '弹幕：开', exact: true }).click();
    await p.waitForFunction(() => document.getElementById('js-comment_canvas').style.display === 'none');
    await p.getByRole('button', { name: '礼物动画：开', exact: true }).click();
    await p.waitForFunction(() => document.getElementById('js-gift_canvas').style.display === 'none');
    await p.getByRole('button', { name: '重新连接', exact: true }).click();
    assert.equal(await p.evaluate(() => nativePlayerActions.reload), 1);
    if (transport === 'webrtc') {
      assert.equal(await p.locator('.fc-player-menu').isVisible(), false, 'clicking another control closes settings');
      await p.evaluate(() => {
        const prompt = document.createElement('div');
        prompt.className = 'c-playerOn_in';
        const button = document.createElement('button');
        button.textContent = '原生交互提示';
        button.onclick = () => { prompt.dataset.clicked = 'true'; };
        prompt.append(button);
        document.querySelector('.js-playerOn').append(prompt);
        const cover = document.createElement('div');
        cover.id = 'native-permission-cover';
        cover.className = 'cover-player';
        cover.style.zIndex = '4';
        cover.hidden = true;
        document.getElementById('js-video_area').append(cover);
      });
      await p.getByRole('button', { name: '原生交互提示', exact: true }).click();
      assert.equal(await p.locator('.c-playerOn_in').getAttribute('data-clicked'), 'true');
      await p.locator('#native-permission-cover').evaluate(cover => { cover.hidden = false; });
      assert.equal(await p.getByRole('button', { name: '播放设置', exact: true }).evaluate(button => {
        const bounds = button.getBoundingClientRect();
        return document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)?.id;
      }), 'native-permission-cover', 'native access/permission covers must remain above enhanced controls');
      await p.evaluate(() => {
        document.getElementById('native-permission-cover').remove();
        document.querySelector('.c-playerOn_in').remove();
      });
    }
    await p.getByRole('button', { name: '网页全屏', exact: true }).click();
    assert.equal(await p.locator('#js-video_area.fc-player-web').count(), 1);
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => !document.documentElement.classList.contains('fc-player-web-open'));
    await p.getByRole('button', { name: '全屏', exact: true }).click();
    await p.waitForFunction(() => document.fullscreenElement?.id === 'js-video_area');
    await p.evaluate(() => document.exitFullscreen());
    await p.setViewportSize({ width: 390, height: 844 });
    await p.getByRole('button', { name: '播放设置', exact: true }).click();
    assert.equal(await p.getByRole('button', { name: '重新连接', exact: true }).isVisible(), true);
    assert.equal(await p.evaluate(() => {
      const controls = document.querySelector('.art-controls');
      return controls.scrollWidth <= controls.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth;
    }), true, 'mobile player controls must fit the video');
    await p.setViewportSize({ width: 1440, height: 1000 });
    await p.getByRole('button', { name: '切换到原生播放器', exact: true }).click();
    assert.deepEqual(await p.evaluate(() => ({
      connected: originalVideo.isConnected, parent: originalVideo.parentElement.id,
      source: originalVideo.src === originalSource && originalVideo.srcObject === originalStream,
      instances: Artplayer.instances.length, nativeControls: document.getElementById('js-player_controls').inert
    })), { connected: true, parent: 'webrtcContent', source: true, instances: 0, nativeControls: false });
    await p.getByRole('button', { name: '切换到增强播放器', exact: true }).click();
    await p.locator('.art-video').waitFor();
    await p.evaluate(async () => {
      const next = document.getElementById('native-hls');
      originalVideo.style.display = 'none';
      next.style.display = '';
      next.srcObject = mediaStream;
      await next.play();
    });
    await p.waitForFunction(() => Artplayer.instances.length === 1 && Artplayer.instances[0].video.id === 'native-hls');
    assert.equal(await p.evaluate(() => originalVideo.parentElement.id), 'webrtcContent');
    assert.equal(await p.evaluate(() => document.getElementById('native-hls').volume), .34);
    await p.evaluate(() => {
      const native = document.getElementById('native-hls');
      native.dispatchEvent(new Event('error'));
    });
    assert.equal(await p.evaluate(() => nativePlayerActions.reload), 1, 'only FC2 owns reconnects; ArtPlayer must not start another');
    await p.evaluate(() => {
      const old = document.getElementById('native-hls');
      const next = document.createElement('video');
      next.id = 'replacement-video'; next.muted = true; next.srcObject = mediaStream;
      old.closest('.fc-art-host').remove();
      document.getElementById('webrtcContent').append(next);
      void next.play();
    });
    await p.waitForFunction(() => Artplayer.instances.length === 1 && Artplayer.instances[0].video.id === 'replacement-video');
    await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await p.locator('.fc-art-host').count(), 1);
    assert.equal(await p.locator('#native-hls').count(), 0, 'a video removed by the site must not be resurrected');
    assert.equal(await p.locator('.art-video').getAttribute('id'), 'replacement-video');
    await playback.context.close();
    console.log(`FC2 ArtPlayer ${transport}: live decode, controls, native quality/latency, chat, reconnect, teardown and video replacement OK`);
  }
  const savedPlayer = await open({ room: true, failed: true, seed: {
    creamu_fc2_preferences: { playerVolume: .34, playerMuted: true },
    [libraryKey]: { '1001': { id: '1001', name: '像素电台', followed: true } }
  } });
  await savedPlayer.page.locator('.art-video').waitFor();
  assert.deepEqual(await savedPlayer.page.locator('.art-video').evaluate(video => ({ volume: video.volume, muted: video.muted })), { volume: .34, muted: true });
  await savedPlayer.page.getByRole('button', { name: '控制台', exact: true }).click();
  await savedPlayer.page.locator('#fc-wb .fc-library-error:not([hidden])').waitFor();
  assert.equal(await savedPlayer.page.locator('#fc-wb .fc-library-item').count(), 1, 'connection errors must not hide local records');
  assert.match(await savedPlayer.page.locator('#fc-wb .fc-library-item').innerText(), /状态未确认/);
  savedPlayer.recover();
  await savedPlayer.page.getByRole('button', { name: '刷新状态', exact: true }).click();
  await savedPlayer.page.locator('#fc-wb .fc-library-status[data-live=true]').waitFor();
  await savedPlayer.page.locator('#fc-wb').getByLabel('查询直播区域', { exact: true }).selectOption('adult');
  await savedPlayer.page.waitForFunction(() => !document.querySelector('#fc-wb .fc-library-list[aria-busy="true"]'));
  assert.equal(savedPlayer.requestPath(), '/adult/contents/allchannellist.php');
  await savedPlayer.context.close();

  const missingPlayer = await open({ room: true, dependency: false });
  await missingPlayer.page.getByText('ArtPlayer 依赖未加载，请更新脚本后刷新页面').waitFor();
  assert.equal(await missingPlayer.page.locator('#js-player_controls').isVisible(), true);
  await missingPlayer.context.close();

  const failed = await open({ failed: true, adult: true });
  await failed.page.locator('.fc-message:not([hidden])').waitFor();
  assert.equal(await failed.page.locator('#js-container .liveBox').isVisible(), true);
  assert.equal(failed.requestPath(), '/adult/contents/allchannellist.php');
  failed.recover();
  await failed.page.getByRole('button', { name: '刷新直播', exact: true }).click();
  await failed.page.locator('html.creamu-fc2-list').waitFor();
  assert.equal(await failed.page.locator('.fc-card').count(), 4);
  await failed.context.close();
  const gate = await open({ gate: true, adult: true });
  assert.equal(await gate.page.locator('#creamu-fc2').count(), 0);
  await gate.context.close();
  const disabled = await open({ seed: { creamu_fc2_preferences: { enabled: false } } });
  assert.equal(await disabled.page.locator('#js-container .liveBox').isVisible(), true);
  assert.equal(await disabled.page.getByRole('button', { name: '恢复 Creamu 布局' }).isVisible(), true);
  await disabled.context.close();
  assert.deepEqual(errors, []);
  console.log('FC2 failure recovery, adult endpoint, entry gate and native-layout opt-out OK');
  await testFc2Multiview();
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
