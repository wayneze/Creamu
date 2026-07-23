/**
 * Creamu WebDAV contract tests: mocked GM + HTTP, no external access.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createContext, runInContext } from 'vm';
import assert from 'assert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(__dirname, '../packages/shared/creamu-webdav.js');

function btoaPolyfill(str) {
  return Buffer.from(String(str), 'binary').toString('base64');
}

function loadWebDav(httpHandler, timers = {}) {
  const store = new Map();
  const notifies = [];
  const httpLog = [];

  const gm = {
    GM_getValue(key, def) {
      return store.has(key) ? store.get(key) : def;
    },
    GM_setValue(key, val) {
      store.set(key, val);
    },
    GM_xmlhttpRequest(opts) {
      const entry = {
        method: opts.method || 'GET',
        url: opts.url,
        headers: opts.headers || {},
        data: opts.data,
      };
      httpLog.push(entry);
      Promise.resolve()
        .then(() => httpHandler(entry, opts))
        .then((res) => {
          if (typeof opts.onload === 'function') {
            opts.onload(
              res || {
                status: 200,
                responseText: '',
              }
            );
          }
        })
        .catch((err) => {
          if (typeof opts.onerror === 'function') opts.onerror(err);
          else if (typeof opts.onload === 'function') {
            opts.onload({ status: 0, responseText: String(err && err.message) });
          }
        });
    },
  };

  const src = fs.readFileSync(srcPath, 'utf8');
  const sandbox = {
    console,
    Date,
    Math,
    JSON,
    String,
    Number,
    Object,
    Array,
    Error,
    setTimeout: timers.setTimeout || setTimeout,
    clearTimeout: timers.clearTimeout || clearTimeout,
    btoa: typeof btoa !== 'undefined' ? btoa : btoaPolyfill,
    unescape: (s) => s,
    encodeURIComponent,
    ...gm,
    showToast() {},
    confirm: () => true,
  };
  const ctx = createContext(sandbox);
  runInContext(src, ctx, { filename: 'creamu-webdav.js' });

  return {
    ctx,
    store,
    httpLog,
    notifies,
    create(hostOverrides = {}) {
      let settings = {
        enabled: true,
        url: 'https://dav.example.com/dav/',
        user: 'user@example.com',
        password: 'app-pass',
        path: '/Creamu',
        auto: false,
        conflict: 'ask',
        ...hostOverrides.settings,
      };
      let payload = hostOverrides.payload || { hello: 1 };
      const imported = [];

      const sync = ctx.createCreamuWebDavSync({
        product: hostOverrides.product || 'scout',
        notify(msg, isErr) {
          notifies.push({ msg, isErr: !!isErr });
        },
        getSettings: () => settings,
        exportPayload: async () => payload,
        importPayload: async (p) => {
          imported.push(p);
          if (hostOverrides.onImport) hostOverrides.onImport(p);
          payload = p;
        },
      });

      return {
        sync,
        get settings() {
          return settings;
        },
        setSettings(patch) {
          settings = Object.assign({}, settings, patch);
        },
        get payload() {
          return payload;
        },
        setPayload(p) {
          payload = p;
        },
        imported,
      };
    },
  };
}

let passed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passed++;
      console.log('  OK  ' + name);
    })
    .catch((e) => {
      console.error('  FAIL  ' + name);
      console.error('       ', e && e.stack ? e.stack : e);
      process.exitCode = 1;
    });
}

console.log('Creamu WebDAV tests');

await test('路径与 Basic Auth 工具', () => {
  const { ctx } = loadWebDav(() => ({ status: 200, responseText: '' }));
  assert.strictEqual(ctx.creamuWdNormDir('/Creamu/'), 'Creamu');
  assert.strictEqual(ctx.creamuWdNormDir(''), 'Creamu');
  assert.strictEqual(ctx.creamuWdNormDir('  /a/b/  '), 'a/b');
  assert.strictEqual(
    ctx.creamuWdJoinUrl('https://dav.example.com/dav/', 'Creamu/scout.vault.json'),
    'https://dav.example.com/dav/Creamu/scout.vault.json'
  );
  const auth = ctx.creamuWdBasicAuth('user', 'pass');
  assert.ok(auth.startsWith('Basic '));
  assert.ok(auth.length > 10);
});

await test('isConfigured / vault 路径', () => {
  const env = loadWebDav(() => ({ status: 404, responseText: '' }));
  const h = env.create();
  assert.strictEqual(h.sync.isConfigured(), true);
  assert.strictEqual(h.sync.vaultRelPath(), 'Creamu/scout.vault.json');
  assert.ok(h.sync.vaultUrl().includes('scout.vault.json'));
  h.setSettings({ user: '', password: '' });
  assert.strictEqual(h.sync.isConfigured(), false);
});

await test('testConnection 200 / 404 均成功', async () => {
  let status = 404;
  const env = loadWebDav(() => ({ status, responseText: '' }));
  const h = env.create();
  assert.strictEqual(await h.sync.testConnection(), true);
  status = 200;
  assert.strictEqual(await h.sync.testConnection(), true);
  const meta = h.sync.loadMeta();
  assert.strictEqual(meta.tested_ok, true);
});

await test('testConnection 401 失败', async () => {
  const env = loadWebDav(() => ({ status: 401, responseText: 'nope' }));
  const h = env.create();
  let err;
  try {
    await h.sync.testConnection();
  } catch (e) {
    err = e;
  }
  assert.ok(err);
  assert.ok(/认证|应用密码/.test(err.message));
});

await test('云端空 → syncNow 推送并包装 vault', async () => {
  const remote = { text: null };
  const env = loadWebDav((req) => {
    if (req.method === 'GET') {
      if (!remote.text) return { status: 404, responseText: '' };
      return { status: 200, responseText: remote.text };
    }
    if (req.method === 'PUT') {
      remote.text = req.data;
      return { status: 201, responseText: '' };
    }
    if (req.method === 'MKCOL') return { status: 201, responseText: '' };
    return { status: 405, responseText: '' };
  });
  const h = env.create({ payload: { terms: [1] } });
  h.sync.markLocalDirty();
  const r = await h.sync.syncNow({ reason: 'manual' });
  assert.strictEqual(r.action, 'push');
  assert.ok(remote.text);
  const vault = JSON.parse(remote.text);
  assert.strictEqual(vault.creamu_vault, 1);
  assert.strictEqual(vault.product, 'scout');
  assert.ok(vault.revision >= 1);
  assert.deepStrictEqual(vault.payload, { terms: [1] });
  assert.ok(vault.device_id);
  assert.ok(vault.updated_at);
});

await test('远端 revision 更高 → pull 并 import', async () => {
  const vault = {
    creamu_vault: 1,
    product: 'scout',
    revision: 5,
    updated_at: '2026-01-01T00:00:00.000Z',
    device_id: 'remote_dev',
    payload: { from: 'cloud' },
  };
  const env = loadWebDav((req) => {
    if (req.method === 'GET') {
      return { status: 200, responseText: JSON.stringify(vault) };
    }
    return { status: 405, responseText: '' };
  });
  const h = env.create({ payload: { from: 'local' } });
  // local rev 0, not dirty → pull
  const r = await h.sync.syncNow();
  assert.strictEqual(r.action, 'pull');
  assert.strictEqual(h.imported.length, 1);
  assert.deepStrictEqual(h.imported[0], { from: 'cloud' });
  assert.strictEqual(h.sync.loadMeta().local_revision, 5);
  assert.strictEqual(h.sync.loadMeta().dirty, false);
});

await test('conflict=local 且 dirty：远端更新时推本机', async () => {
  let stored = JSON.stringify({
    creamu_vault: 1,
    product: 'exh',
    revision: 3,
    payload: { remote: true },
  });
  const env = loadWebDav((req) => {
    if (req.method === 'GET') return { status: 200, responseText: stored };
    if (req.method === 'PUT') {
      stored = req.data;
      return { status: 200, responseText: '' };
    }
    if (req.method === 'MKCOL') return { status: 201, responseText: '' };
    return { status: 405, responseText: '' };
  });
  const h = env.create({
    product: 'exh',
    payload: { local: true },
    settings: { conflict: 'local' },
  });
  // seed local meta: rev 1 dirty
  const metaKey = 'creamu_wd_meta_exh';
  env.store.set(
    metaKey,
    JSON.stringify({ device_id: 'd1', local_revision: 1, dirty: true })
  );
  const r = await h.sync.syncNow();
  assert.strictEqual(r.action, 'push');
  const up = JSON.parse(stored);
  assert.strictEqual(up.product, 'exh');
  assert.ok(up.revision > 3);
  assert.deepStrictEqual(up.payload, { local: true });
});

await test('force pull 云端无文件则 push', async () => {
  let putCount = 0;
  const env = loadWebDav((req) => {
    if (req.method === 'GET') return { status: 404, responseText: '' };
    if (req.method === 'PUT') {
      putCount++;
      return { status: 201, responseText: '' };
    }
    if (req.method === 'MKCOL') return { status: 201, responseText: '' };
    return { status: 405, responseText: '' };
  });
  const h = env.create();
  const r = await h.sync.syncNow({ force: 'pull' });
  assert.strictEqual(r.action, 'push');
  assert.ok(putCount >= 1);
});

await test('非法 vault 拒绝', async () => {
  const env = loadWebDav(() => ({
    status: 200,
    responseText: JSON.stringify({ not: 'vault' }),
  }));
  const h = env.create();
  let err;
  try {
    await h.sync.syncNow();
  } catch (e) {
    err = e;
  }
  assert.ok(err);
  assert.ok(/vault|Creamu/i.test(err.message));
});

await test('产品不匹配拒绝 apply', async () => {
  const env = loadWebDav(() => ({
    status: 200,
    responseText: JSON.stringify({
      creamu_vault: 1,
      product: 'jlc',
      revision: 2,
      payload: {},
    }),
  }));
  const h = env.create({ product: 'scout' });
  let err;
  try {
    await h.sync.syncNow({ force: 'pull' });
  } catch (e) {
    err = e;
  }
  assert.ok(err);
  assert.ok(/产品|不匹配/.test(err.message));
});

await test('同 rev 且 dirty → 推送并升 revision', async () => {
  let stored = JSON.stringify({
    creamu_vault: 1,
    product: 'scout',
    revision: 2,
    payload: { a: 1 },
  });
  const env = loadWebDav((req) => {
    if (req.method === 'GET') return { status: 200, responseText: stored };
    if (req.method === 'PUT') {
      stored = req.data;
      return { status: 200, responseText: '' };
    }
    if (req.method === 'MKCOL') return { status: 201, responseText: '' };
    return { status: 405, responseText: '' };
  });
  const h = env.create({ payload: { a: 2 } });
  env.store.set(
    'creamu_wd_meta_scout',
    JSON.stringify({ device_id: 'd', local_revision: 2, dirty: true })
  );
  const r = await h.sync.syncNow();
  assert.strictEqual(r.action, 'push');
  const up = JSON.parse(stored);
  assert.strictEqual(up.revision, 3);
  assert.deepStrictEqual(up.payload, { a: 2 });
});

await test('自动同步遇到 busy 后重试', async () => {
  let getCount = 0;
  const env = loadWebDav(async (req) => {
    if (req.method === 'GET') {
      getCount++;
      if (getCount === 1) await new Promise((resolve) => setTimeout(resolve, 80));
      return { status: 404, responseText: '' };
    }
    if (req.method === 'PUT') return { status: 201, responseText: '' };
    if (req.method === 'MKCOL') return { status: 201, responseText: '' };
    return { status: 405, responseText: '' };
  });
  const h = env.create();
  const first = h.sync.syncNow({ reason: 'manual' });
  h.sync.schedulePush(1);
  await first;
  await new Promise((resolve) => setTimeout(resolve, 2200));
  assert.ok(getCount >= 2, 'getCount=' + getCount);
});

await test('上传期间的新修改保持 dirty 并继续同步', async () => {
  let stored = '';
  let releasePut;
  let signalPut;
  const putStarted = new Promise((resolve) => {
    signalPut = resolve;
  });
  const putReleased = new Promise((resolve) => {
    releasePut = resolve;
  });
  let putCount = 0;
  const env = loadWebDav(async (req) => {
    if (req.method === 'GET') {
      return stored
        ? { status: 200, responseText: stored }
        : { status: 404, responseText: '' };
    }
    if (req.method === 'PUT') {
      putCount++;
      stored = req.data;
      if (putCount === 1) {
        signalPut();
        await putReleased;
      }
      return { status: 201, responseText: '' };
    }
    if (req.method === 'MKCOL') return { status: 201, responseText: '' };
    return { status: 405, responseText: '' };
  });
  const h = env.create({ payload: { value: 1 }, settings: { auto: true } });
  h.sync.markLocalDirty();
  const first = h.sync.syncNow({ reason: 'manual' });
  await putStarted;
  h.setPayload({ value: 2 });
  h.sync.markLocalDirty();
  releasePut();
  await first;
  assert.strictEqual(h.sync.loadMeta().dirty, true);
  assert.strictEqual(h.sync.loadMeta().last_action, 'push-pending');
  await new Promise((resolve) => setTimeout(resolve, 1200));
  assert.ok(putCount >= 2, 'putCount=' + putCount);
  assert.deepStrictEqual(JSON.parse(stored).payload, { value: 2 });
  assert.strictEqual(h.sync.loadMeta().dirty, false);
});

await test('自动同步失败按上限退避重试', async () => {
  const timers = [];
  const env = loadWebDav(
    () => ({ status: 500, responseText: '' }),
    {
      setTimeout(fn, ms) {
        const timer = { fn, ms };
        timers.push(timer);
        return timer;
      },
      clearTimeout(timer) {
        const index = timers.indexOf(timer);
        if (index >= 0) timers.splice(index, 1);
      },
    }
  );
  const h = env.create({ settings: { auto: true } });
  h.sync.markLocalDirty();
  timers.splice(0).forEach((timer) => timer.fn());
  for (const expectedDelay of [2000, 4000, 8000, 16000, 32000]) {
    await new Promise((resolve) => setImmediate(resolve));
    assert.strictEqual(timers.length, 1);
    assert.strictEqual(timers[0].ms, expectedDelay);
    const timer = timers.shift();
    timer.fn();
  }
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(timers.length, 0);
});

if (!process.exitCode) {
  console.log('All tests passed (' + passed + ')');
} else {
  console.error('Some tests failed');
}
