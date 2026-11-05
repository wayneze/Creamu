// ==UserScript==
// @name         Creamu · FC2 Live
// @name:zh-CN    Creamu · FC2 Live
// @namespace    https://github.com/wayneze/Creamu
// @version      0.5.1
// @description  FC2 Live 整页改版：直播卡片与筛选、关注/访问/黑名单控制台、多路同屏、增强播放器、JSON / WebDAV
// @author       wayneze
// @match        https://live.fc2.com/*
// @require      https://cdn.jsdelivr.net/npm/artplayer@5.4.0/dist/artplayer.js
// @require      https://cdn.jsdelivr.net/npm/hls.js@1.7.4/dist/hls.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
const FC2_LIBRARY_KEY = 'creamu_fc2_library';
const FC2_PREFS_KEY = 'creamu_fc2_preferences';
const FC2_DAV_KEY = 'creamu_fc2_webdav';
const FC2_CATEGORIES = { 1: '杂谈', 2: '游戏 / 制作', 3: '视频', 4: '其他', 5: '声音' };
let fc2Sync;

function fc2Text(value, max = 200) {
  return String(value ?? '').trim().slice(0, max);
}

function fc2Id(value) {
  const id = String(value ?? '');
  return /^(?:2_)?[1-9]\d{0,14}$/.test(id) ? id : '';
}

function fc2Image(value) {
  try {
    const url = new URL(String(value || ''), 'https://live.fc2.com');
    return url.protocol === 'https:' ? url.href : '';
  } catch (_) {
    return '';
  }
}

function fc2Record(value) {
  if (!value || !fc2Id(value.id)) return null;
  return {
    id: fc2Id(value.id),
    name: fc2Text(value.name),
    title: fc2Text(value.title, 500),
    image: fc2Image(value.image),
    adult: value.adult === true,
    followed: value.followed === true,
    blocked: value.blocked === true,
    note: fc2Text(value.note, 1000),
    tags: Array.isArray(value.tags)
      ? [...new Set(value.tags.map(v => fc2Text(v, 30)).filter(Boolean))].slice(0, 12) : [],
    visitedAt: Math.max(0, Number(value.visitedAt) || 0),
    updatedAt: Math.max(0, Number(value.updatedAt) || 0)
  };
}

function readFc2Library() {
  const stored = GM_getValue(FC2_LIBRARY_KEY, {});
  const result = {};
  for (const value of Object.values(stored && typeof stored === 'object' ? stored : {})) {
    const record = fc2Record(value);
    if (record) result[record.id] = record;
  }
  return result;
}

function updateFc2Record(channel, changes) {
  const records = readFc2Library();
  const id = fc2Id(channel.id);
  if (!id) return;
  records[id] = fc2Record({
    ...channel, ...records[id], name: channel.name, title: channel.title,
    image: channel.image, ...changes, id, updatedAt: Date.now()
  });
  GM_setValue(FC2_LIBRARY_KEY, records);
  fc2Sync?.markLocalDirty();
  document.dispatchEvent(new Event('creamu-fc2-library'));
}

function readFc2Preferences() {
  const raw = GM_getValue(FC2_PREFS_KEY, {}) || {};
  return {
    enabled: raw.enabled !== false,
    density: raw.density === 'compact' ? 'compact' : 'comfortable',
    chatWidth: Math.min(460, Math.max(280, Number(raw.chatWidth) || 340)),
    chatHidden: raw.chatHidden === true,
    nativePlayer: raw.nativePlayer === true,
    playerVolume: typeof raw.playerVolume === 'number' ? Math.min(1, Math.max(0, raw.playerVolume)) : null,
    playerMuted: typeof raw.playerMuted === 'boolean' ? raw.playerMuted : null,
    cinema: raw.cinema === true
  };
}

function setFc2Preferences(changes) {
  GM_setValue(FC2_PREFS_KEY, { ...readFc2Preferences(), ...changes });
}

function exportFc2Data() {
  return { format: 'creamu-fc2', version: 1, channels: Object.values(readFc2Library()) };
}

function validateFc2Data(data) {
  if (!data || data.format !== 'creamu-fc2' || data.version !== 1 ||
      !Array.isArray(data.channels) || data.channels.length > 20000) {
    throw new Error('请选择 Creamu · FC2 Live v1 数据文件。');
  }
  const records = {};
  for (const value of data.channels) {
    const record = fc2Record(value);
    if (!record) throw new Error('数据中包含无效的房间标识，未导入。');
    if (!records[record.id] || record.updatedAt >= records[record.id].updatedAt) {
      records[record.id] = record;
    }
  }
  return records;
}

function importFc2Data(data, replace = false) {
  const incoming = validateFc2Data(data);
  const result = replace ? {} : readFc2Library();
  for (const [id, record] of Object.entries(incoming)) {
    if (!result[id] || record.updatedAt >= result[id].updatedAt) result[id] = record;
  }
  GM_setValue(FC2_LIBRARY_KEY, result);
  if (!replace) fc2Sync?.markLocalDirty();
  document.dispatchEvent(new Event('creamu-fc2-library'));
}

function initFc2Sync() {
  fc2Sync = createCreamuWebDavSync({
    product: 'fc2',
    notify: fc2Toast,
    exportPayload: async () => exportFc2Data(),
    importPayload: async data => importFc2Data(data, true),
    getSettings: () => GM_getValue(FC2_DAV_KEY, {})
  });
  if (typeof GM_addValueChangeListener === 'function') {
    GM_addValueChangeListener(FC2_LIBRARY_KEY, (_key, _old, _value, remote) => {
      if (remote) document.dispatchEvent(new Event('creamu-fc2-library'));
    });
  }
  void fc2Sync.bootSync();
}
  /* Creamu WebDAV sync (generic vault file over WebDAV / 坚果云等) */
  const CREAMU_WD_DEFAULT_PATH = '/Creamu';

  function creamuWdCompact(v) {
    return String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  }

  function creamuWdSafeJson(text, fallback) {
    try {
      return JSON.parse(text);
    } catch (_) {
      return fallback;
    }
  }

  function creamuWdHttp(opts) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== 'function') {
        reject(new Error('GM_xmlhttpRequest unavailable'));
        return;
      }
      GM_xmlhttpRequest({
        method: opts.method || 'GET',
        url: opts.url,
        headers: opts.headers || {},
        data: opts.data,
        timeout: opts.timeout || 60000,
        responseType: opts.responseType || 'text',
        onload(res) {
          resolve(res);
        },
        onerror(err) {
          reject(err || new Error('network error'));
        },
        ontimeout() {
          reject(new Error('timeout'));
        },
      });
    });
  }

  function creamuWdCleanPassword(url, pass) {
    const raw = String(pass == null ? '' : pass).trim();
    if (!raw) return '';
    // 坚果云应用密码为 16 位连续字母，去内部空格/换行
    if (/jianguoyun\.com/i.test(String(url || ''))) {
      return raw.replace(/\s+/g, '');
    }
    return raw;
  }

  /** Basic Auth：兼容非 ASCII 用户名/密码 */
  function creamuWdBasicAuth(user, pass, url) {
    const cleanPass = creamuWdCleanPassword(url, pass);
    const raw = String(user == null ? '' : user) + ':' + cleanPass;
    let b64;
    try {
      b64 = btoa(unescape(encodeURIComponent(raw)));
    } catch (_) {
      b64 = btoa(raw);
    }
    return 'Basic ' + b64;
  }

  function creamuWdJoinUrl(base, relPath) {
    const b = creamuWdCompact(base).replace(/\/+$/, '');
    const p = String(relPath == null ? '' : relPath)
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');
    if (!b) return '/' + p;
    if (!p) return b;
    return b + '/' + p;
  }

  /** 规范化相对目录：无首尾斜杠，空则默认 Creamu */
  function creamuWdNormDir(dir) {
    let d = creamuWdCompact(dir || CREAMU_WD_DEFAULT_PATH)
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');
    if (!d) d = 'Creamu';
    return d;
  }

  /**
   * @param {{
   *   product: string,
   *   notify?: (msg: string, isErr?: boolean) => void,
   *   exportPayload: () => Promise<object>,
   *   importPayload: (payload: object) => Promise<void>,
   *   getSettings: () => {
   *     enabled?: boolean,
   *     url?: string,
   *     user?: string,
   *     password?: string,
   *     path?: string,
   *     auto?: boolean,
   *     conflict?: string
   *   },
   * }} host
   */
  function createCreamuWebDavSync(host) {
    const product = creamuWdCompact(host.product || 'app').toLowerCase() || 'app';
    const metaKey = 'creamu_wd_meta_' + product;
    const vaultName = product + '.vault.json';
    let pushTimer = null;
    let busy = false;
    let retryCount = 0;

    function notify(msg, isErr) {
      if (typeof host.notify === 'function') host.notify(msg, !!isErr);
      else if (typeof showToast === 'function') showToast(msg);
      else console.info('[Creamu WD]', msg);
    }

    function gmGet(key, def) {
      if (typeof GM_getValue !== 'function') return def;
      const v = GM_getValue(key, def);
      return v === undefined ? def : v;
    }

    function gmSet(key, val) {
      if (typeof GM_setValue === 'function') GM_setValue(key, val);
    }

    function loadMeta() {
      const raw = gmGet(metaKey, null);
      let m = typeof raw === 'string' ? creamuWdSafeJson(raw, null) : raw;
      if (!m || typeof m !== 'object') m = {};
      if (!m.device_id) {
        m.device_id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
        // 立即落盘：冲突判断要靠 vault.device_id 认出「上次是本机推的」
        gmSet(metaKey, JSON.stringify(m));
      }
      m.local_revision = Number(m.local_revision) || 0;
      // 上次成功同步时云端的 revision；-1 = 旧版 meta 未记录
      const remoteRev = m.remote_revision == null || m.remote_revision === '' ? NaN : Number(m.remote_revision);
      m.remote_revision = Number.isFinite(remoteRev) ? remoteRev : -1;
      m.dirty = !!m.dirty;
      m.last_sync = Number(m.last_sync) || 0;
      m.last_error = m.last_error || '';
      m.last_action = m.last_action || '';
      m.tested_ok = !!m.tested_ok;
      return m;
    }

    function saveMeta(m) {
      gmSet(metaKey, JSON.stringify(m || {}));
    }

    function settings() {
      const s = (typeof host.getSettings === 'function' && host.getSettings()) || {};
      const url = creamuWdCompact(s.url || '');
      const rawPass = String(s.password == null ? '' : s.password);
      const cleanPass = creamuWdCleanPassword(url, rawPass);
      return {
        enabled: !!s.enabled,
        url,
        user: creamuWdCompact(s.user || ''),
        password: cleanPass,
        path: creamuWdNormDir(s.path),
        auto: !!s.auto,
        conflict: s.conflict === 'remote' || s.conflict === 'local' ? s.conflict : 'ask',
      };
    }

    function vaultRelPath() {
      return settings().path + '/' + vaultName;
    }

    function vaultUrl() {
      const st = settings();
      return creamuWdJoinUrl(st.url, vaultRelPath());
    }

    function authHeaders(extra) {
      const st = settings();
      return Object.assign(
        {
          Authorization: creamuWdBasicAuth(st.user, st.password, st.url),
        },
        extra || {}
      );
    }

    function isConfigured() {
      const st = settings();
      return !!(st.url && st.user && st.password);
    }

    function isConnected() {
      return isConfigured();
    }

    function statusText() {
      const st = settings();
      const m = loadMeta();
      if (!st.url) return '未配置 WebDAV 地址';
      if (!st.user || !st.password) return '未配置账号/应用密码';
      const when = m.last_sync ? new Date(m.last_sync).toLocaleString() : '从未';
      const err = m.last_error ? ' · 错: ' + m.last_error : '';
      const en = st.enabled ? '' : ' · 未启用';
      const relPath = st.path + '/' + vaultName;
      return st.user + ' · ' + relPath + ' · rev ' + m.local_revision + ' · 上次 ' + when + en + err;
    }

    function checkDavAuthStatus(res) {
      if (res.status === 401) {
        throw new Error('认证失败，请检查用户名与应用密码（坚果云需用应用密码，用户名需为注册邮箱）');
      }
      if (res.status === 403) {
        throw new Error(
          '访问被拒绝 (403 Forbidden)：请检查坚果云中是否已创建该同步文件夹（如 /Creamu），或使用「/我的坚果云/Creamu」，或检查当月流量是否超限'
        );
      }
    }

    async function davRequest(method, url, body, headers, timeout) {
      const res = await creamuWdHttp({
        method,
        url,
        headers: authHeaders(headers),
        data: body,
        timeout: timeout || (method === 'PUT' ? 180000 : 60000),
      });
      return res;
    }

    function httpError(res, fallback) {
      const text = res.responseText != null ? String(res.responseText) : '';
      // 坚果云等常返回 HTML/Exception 堆栈，不当作用户可读主文案
      let snippet = text.replace(/\s+/g, ' ').trim();
      if (/IllegalArgument|Exception|stackTrace|<!DOCTYPE|<html/i.test(snippet)) {
        snippet = '';
      } else {
        snippet = snippet.slice(0, 120);
      }
      const msg = snippet || fallback || 'HTTP ' + res.status;
      const err = new Error(msg);
      err.status = res.status;
      err.body = text;
      return err;
    }

    /**
     * 尽力 MKCOL 创建目录。坚果云等对 MKCOL/PROPFIND 不友好，失败不抛错：
     * 真正依赖 PUT（多数服务会自动建中间路径）。
     */
    async function ensureFolder() {
      const st = settings();
      const segments = st.path.split('/').filter(Boolean);
      let acc = '';
      for (const seg of segments) {
        acc = acc ? acc + '/' + seg : seg;
        const url = creamuWdJoinUrl(st.url, acc);
        try {
          const res = await davRequest('MKCOL', url, null, {}, 30000);
          if (res.status >= 200 && res.status < 300) continue;
          // 已存在 / 不允许 / 不支持 都继续，交给后续 PUT
          if (
            res.status === 401 ||
            res.status === 403
          ) {
            // 鉴权问题后面 GET/PUT 再报；此处不提前中断
            continue;
          }
        } catch (_) {
          /* ignore */
        }
      }
    }

    async function downloadVault() {
      const res = await davRequest('GET', vaultUrl(), null, { Accept: 'application/json,text/plain,*/*' }, 120000);
      if (res.status === 404) return null;
      checkDavAuthStatus(res);
      if (res.status < 200 || res.status >= 300) throw httpError(res, '下载失败 HTTP ' + res.status);
      const text = res.responseText != null ? String(res.responseText) : '';
      if (!text.trim()) return null;
      const data = creamuWdSafeJson(text, null);
      if (!data || data.creamu_vault !== 1) {
        if (data && data.payload) return data;
        throw new Error('远端文件不是有效的 Creamu vault');
      }
      return data;
    }

    async function uploadVault(vault) {
      await ensureFolder();
      const body = JSON.stringify(vault);
      const res = await davRequest(
        'PUT',
        vaultUrl(),
        body,
        {
          'Content-Type': 'application/json; charset=utf-8',
        },
        180000
      );
      checkDavAuthStatus(res);
      if (res.status < 200 || res.status >= 300) throw httpError(res, '上传失败 HTTP ' + res.status);
      return true;
    }

    /**
     * 测试连接：与真实同步同一路径（GET vault）。
     * 不用 PROPFIND/HEAD —— 坚果云等常对它们返回 IllegalArgumentException。
     * 200 / 404 均视为连通；再可选做一次小 PUT 写探针不合适，避免污染 vault。
     */
    async function testConnection() {
      if (!isConfigured()) throw new Error('请先填写 WebDAV 地址、用户名和应用密码');
      const res = await davRequest(
        'GET',
        vaultUrl(),
        null,
        { Accept: 'application/json,text/plain,*/*' },
        30000
      );
      checkDavAuthStatus(res);
      // 文件尚未存在也算鉴权与路径可达
      if (res.status === 404 || (res.status >= 200 && res.status < 300)) {
        const m = loadMeta();
        m.tested_ok = true;
        m.last_error = '';
        m.last_action = 'test';
        saveMeta(m);
        notify(res.status === 404 ? 'WebDAV 连接正常（云端尚无 vault，同步时会上传）' : 'WebDAV 连接正常');
        return true;
      }
      // 部分网关对不存在资源返回 409/405 等，再试 PUT 空路径探测成本高；直接报告状态
      throw httpError(res, '测试失败 HTTP ' + res.status + '（同步若正常可忽略测试，或检查路径）');
    }

    function markLocalDirty() {
      const m = loadMeta();
      m.dirty = true;
      m.local_revision = (Number(m.local_revision) || 0) + 1;
      saveMeta(m);
      const st = settings();
      if (st.enabled && st.auto && isConfigured()) {
        retryCount = 0;
        schedulePush(8000);
      }
    }

    function schedulePush(ms) {
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {
        pushTimer = null;
        void syncNow({ reason: 'auto' })
          .then((result) => {
            if (result && result.action === 'busy') schedulePush(2000);
            else retryCount = 0;
          })
          .catch((e) => {
            const m = loadMeta();
            m.last_error = (e && e.message) || String(e);
            saveMeta(m);
            const isAuthOrForbidden =
              (e && (e.status === 401 || e.status === 403)) ||
              /401|403|认证|拒绝|Forbidden/i.test((e && e.message) || '');
            if (!isAuthOrForbidden) {
              retryCount++;
              if (retryCount <= 5) schedulePush(Math.min(60000, 2000 * 2 ** (retryCount - 1)));
            } else {
              retryCount = 0;
            }
          });
      }, ms || 8000);
    }

    async function buildVault(revision) {
      const payload = await host.exportPayload();
      const m = loadMeta();
      return {
        creamu_vault: 1,
        product,
        revision: Number(revision) || 1,
        updated_at: new Date().toISOString(),
        device_id: m.device_id,
        payload,
      };
    }

    async function applyRemote(vault) {
      if (!vault || !vault.payload) throw new Error('远端 vault 无效');
      if (vault.product && vault.product !== product) {
        throw new Error('远端产品不匹配：' + vault.product);
      }
      await host.importPayload(vault.payload);
      const m = loadMeta();
      m.local_revision = Number(vault.revision) || m.local_revision;
      m.remote_revision = Number(vault.revision) || 0;
      m.dirty = false;
      m.last_sync = Date.now();
      m.last_action = 'pull';
      m.last_error = '';
      saveMeta(m);
    }

    /** @param {number} [aboveRevision] 云端当前 revision；上传的 revision 必须比它大 */
    async function pushVault(aboveRevision) {
      const m = loadMeta();
      const floor = Math.max(0, Number(aboveRevision) || 0, Number(m.remote_revision) || 0);
      if ((Number(m.local_revision) || 0) <= floor) {
        m.local_revision = floor + 1;
        saveMeta(m);
      }
      const rev = Math.max(1, Number(m.local_revision) || 1);
      const vault = await buildVault(rev);
      await uploadVault(vault);
      const latest = loadMeta();
      const changedDuringPush = Number(latest.local_revision) > rev;
      latest.dirty = changedDuringPush;
      latest.local_revision = Math.max(rev, Number(latest.local_revision) || 0);
      latest.remote_revision = rev;
      latest.last_sync = Date.now();
      latest.last_action = changedDuringPush ? 'push-pending' : 'push';
      latest.last_error = '';
      saveMeta(latest);
      if (changedDuringPush) schedulePush(1000);
      return vault;
    }

    /**
     * @param {{ reason?: string, force?: 'pull'|'push' }} [opts]
     */
    async function syncNow(opts) {
      opts = opts || {};
      if (busy) return { action: 'busy' };
      if (!isConfigured()) throw new Error('请先填写 WebDAV 地址、用户名和应用密码');
      busy = true;
      try {
        if (opts.force === 'push') {
          let current = null;
          try {
            current = await downloadVault();
          } catch (_) {
            /* 强推不在乎云端内容；鉴权问题由 PUT 报 */
          }
          const m0 = loadMeta();
          m0.dirty = true;
          saveMeta(m0);
          await pushVault(current ? Number(current.revision) || 0 : 0);
          notify('已推送到 WebDAV');
          return { action: 'push' };
        }
        if (opts.force === 'pull') {
          const remote = await downloadVault();
          if (!remote) {
            notify('云端尚无备份，将推送本地');
            await pushVault();
            return { action: 'push' };
          }
          await applyRemote(remote);
          notify('已从 WebDAV 拉取');
          return { action: 'pull' };
        }

        const remote = await downloadVault();
        const m = loadMeta();
        const localRev = Number(m.local_revision) || 0;

        if (!remote) {
          await pushVault();
          notify('云端为空，已上传本地');
          return { action: 'push' };
        }

        const remoteRev = Number(remote.revision) || 0;

        if (m.dirty) {
          // 只看 revision 大小分不清「云端被别的设备推过」：两端都从 rev N 改，都会到 N+1
          const remoteChanged =
            m.remote_revision >= 0
              ? remoteRev !== m.remote_revision
              : remoteRev > localRev || (!!remote.device_id && remote.device_id !== m.device_id);
          if (!remoteChanged) {
            await pushVault(remoteRev);
            notify('已推送到云端 rev ' + loadMeta().local_revision);
            return { action: 'push' };
          }
          const conflict = settings().conflict;
          const keepLocal =
            conflict === 'local' ||
            (conflict === 'ask' &&
              typeof confirm === 'function' &&
              !confirm(
                '云端 rev ' +
                  remoteRev +
                  ' 已被其他设备更新，本机也有未同步修改。\n确定用云端覆盖本机？\n（取消则改为推送本机）'
              ));
          if (keepLocal) {
            await pushVault(remoteRev);
            notify(conflict === 'local' ? '冲突策略：已推送本机' : '已用本机覆盖云端');
            return { action: 'push' };
          }
          await applyRemote(remote);
          notify('已从云端更新到 rev ' + remoteRev);
          return { action: 'pull' };
        }

        if (remoteRev > localRev) {
          await applyRemote(remote);
          notify('已从云端更新到 rev ' + remoteRev);
          return { action: 'pull' };
        }

        if (remoteRev < localRev) {
          await pushVault(remoteRev);
          notify('已推送到云端 rev ' + loadMeta().local_revision);
          return { action: 'push' };
        }

        m.last_sync = Date.now();
        m.last_action = 'noop';
        m.last_error = '';
        saveMeta(m);
        if (opts.reason !== 'auto') notify('已与云端一致');
        return { action: 'noop' };
      } catch (e) {
        const m = loadMeta();
        m.last_error = (e && e.message) || String(e);
        saveMeta(m);
        throw e;
      } finally {
        busy = false;
      }
    }


    async function bootSync() {
      const st = settings();
      if (!st.enabled || !st.auto || !isConfigured()) return null;
      const m = loadMeta();
      const lastSync = Number(m.last_sync) || 0;
      // 开页冷却保护：10分钟内开过同步且本地不脏，则跳过开页拉取，防连续开标签页浪费流量
      if (!m.dirty && lastSync && Date.now() - lastSync < 10 * 60 * 1000) {
        return { action: 'noop', reason: 'cooldown' };
      }
      try {
        return await syncNow({ reason: 'boot' });
      } catch (e) {
        console.warn('[Creamu WD] boot sync', e);
        return { action: 'error', error: e };
      }
    }

    return {
      product,
      vaultRelPath,
      vaultUrl,
      statusText,
      isConfigured,
      isConnected,
      testConnection,
      markLocalDirty,
      schedulePush,
      syncNow,
      bootSync,
      loadMeta,
      settings,
    };
  }
function replaceCreamuWorkbenchSelectors(css, options = {}) {
    const replacements = [
        ['#jlc-wb-dialog', options.dialogSelector || '#jlc-wb-dialog'],
        ['#jlc-tracking-pagebar', options.pagebarSelector || '#jlc-tracking-pagebar'],
        ['#jlc-wb-fab', options.fabSelector || '#jlc-wb-fab'],
        ['#jlc-wb', options.panelSelector || '#jlc-wb'],
    ];
    return replacements.reduce((result, [from, to]) => result.split(from).join(to), String(css || ''));
}

function getCreamuWorkbenchCss(options = {}) {
  const css = `
        :where(#jlc-wb, #jlc-wb-fab, #jlc-wb-dialog, #jlc-tracking-pagebar) {
            --creamu-wb-bg: #f6efe3;
            --creamu-wb-surface: #fffdf8;
            --creamu-wb-surface-soft: #fffaf2;
            --creamu-wb-surface-muted: #efe4d2;
            --creamu-wb-surface-raised: #fff;
            --creamu-wb-text: #4a3728;
            --creamu-wb-text-strong: #5a4030;
            --creamu-wb-title: #6b4a2e;
            --creamu-wb-text-muted: #9a7d60;
            --creamu-wb-text-subtle: #8a6f55;
            --creamu-wb-border: #e4d4bc;
            --creamu-wb-border-strong: #e0cdae;
            --creamu-wb-divider: #eadcc6;
            --creamu-wb-control-shadow: #e6d3b5;
            --creamu-wb-accent: #d4883a;
            --creamu-wb-accent-hover: #e09848;
            --creamu-wb-accent-light: #e8a24e;
            --creamu-wb-accent-dark: #b56e28;
            --creamu-wb-accent-shadow: rgba(140,90,40,.26);
            --creamu-wb-accent-shadow-soft: rgba(140,90,40,.22);
            --creamu-wb-accent-ring: rgba(212,136,58,.22);
            --creamu-wb-accent-overlay: rgba(212,136,58,.28);
            --creamu-wb-accent-overlay-soft: rgba(212,136,58,.18);
            --creamu-wb-on-accent: #fff;
            --creamu-wb-danger: #b42318;
        }

        #jlc-wb-fab {
            position: fixed; bottom: 20px; right: 18px; width: 34px; height: 34px;
            border-radius: 11px; border: 0 !important; color: #fff !important;
            background: linear-gradient(var(--creamu-wb-accent-light), var(--creamu-wb-accent)) !important;
            background-color: var(--creamu-wb-accent) !important;
            box-shadow: 0 3px 0 var(--creamu-wb-accent-dark), 0 8px 16px var(--creamu-wb-accent-shadow) !important;
            z-index: 999999; cursor: grab; touch-action: none; user-select: none;
            display: flex; align-items: center; justify-content: center; font-size: 14px;
            opacity: 1 !important;
            transition: filter .14s ease, box-shadow .14s ease, transform .12s ease;
        }
        #jlc-wb-fab:hover { filter: brightness(1.05); }
        #jlc-wb-fab:active, #jlc-wb-fab.is-dragging {
            cursor: grabbing; transform: translateY(2px);
            box-shadow: 0 2px 0 var(--creamu-wb-accent-dark), 0 4px 10px var(--creamu-wb-accent-shadow-soft);
            filter: brightness(.98);
        }
        #jlc-wb-fab .jlc-wb-fab-badge {
            position: absolute; top: -4px; right: -4px; min-width: 15px; height: 15px; padding: 0 3px;
            border-radius: 999px; background: #5c3a1a; border: 1.5px solid #f6efe3; color: var(--creamu-wb-on-accent);
            font-size: 9px; font-weight: 700; display: none; align-items: center; justify-content: center;
            box-shadow: 0 1px 0 rgba(0,0,0,.12);
        }
        #jlc-wb-fab.has-updates .jlc-wb-fab-badge { display: inline-flex; }

        #jlc-wb {
            position: fixed; left: auto; top: auto; right: 48px; bottom: auto;
            width: min(520px, calc(100vw - 64px));
            height: min(78vh, 800px); max-height: none; min-width: 360px; min-height: 280px;
            display: none; flex-direction: column; z-index: 999998; overflow: hidden;
            box-sizing: border-box;
            background: var(--creamu-wb-bg); color: var(--creamu-wb-text); border-radius: var(--creamu-wb-panel-radius, 22px); border: 1px solid var(--creamu-wb-border);
            box-shadow: 0 18px 50px rgba(90,60,30,.22); font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            font-size: 14.5px;
        }
        #jlc-wb.is-open { display: flex; }
        #jlc-wb.is-dragging, #jlc-wb.is-resizing { opacity: .98; user-select: none; }
        #jlc-wb * { box-sizing: border-box; }

        #jlc-wb .jlc-wb-header {
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
            padding: 16px 18px 12px; background: transparent; border-bottom: 0; flex: 0 0 auto;
            cursor: move; touch-action: none;
        }
        #jlc-wb .jlc-wb-header .jlc-wb-header-actions,
        #jlc-wb .jlc-wb-header .jlc-wb-header-actions * { cursor: pointer; }
        #jlc-wb .jlc-wb-title { font-weight: 800; font-size: 18px; color: var(--creamu-wb-title); letter-spacing: .2px; }
        #jlc-wb .jlc-wb-subtitle { font-size: 12px; color: var(--creamu-wb-secondary-ink, #a08468); margin-top: 3px; }
        #jlc-wb .jlc-wb-header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }

        #jlc-wb .jlc-wb-icon-btn, #jlc-wb .jlc-wb-chip, #jlc-wb .jlc-wb-btn {
            appearance: none; border: 1px solid var(--creamu-wb-border-strong); background: var(--creamu-wb-surface-soft); color: var(--creamu-wb-text-strong);
            border-radius: var(--creamu-wb-control-radius, 999px); cursor: pointer; font-size: 13px; line-height: 1.25; font-weight: 650;
        }
        #jlc-wb .jlc-wb-icon-btn {
            width: 34px; height: 34px; padding: 0; display: inline-flex; align-items: center; justify-content: center;
            background: var(--creamu-wb-surface-raised); font-size: 15px; box-shadow: var(--creamu-wb-control-elevation, 0 2px 0 var(--creamu-wb-control-shadow));
        }
        #jlc-wb .jlc-wb-chip { padding: 7px 12px; background: var(--creamu-wb-surface-raised); box-shadow: var(--creamu-wb-control-elevation, 0 2px 0 var(--creamu-wb-control-shadow)); }
        #jlc-wb .jlc-wb-chip.is-on { background: var(--creamu-wb-accent); border-color: transparent; color: var(--creamu-wb-on-accent); box-shadow: var(--creamu-wb-control-elevation, 0 2px 0 var(--creamu-wb-accent-dark)); }
        #jlc-wb .jlc-wb-btn { padding: 9px 13px; border-radius: 12px; box-shadow: var(--creamu-wb-control-elevation, 0 2px 0 #e0cdae); }
        #jlc-wb .jlc-wb-btn.primary { background: var(--creamu-wb-accent); border-color: transparent; color: var(--creamu-wb-on-accent); box-shadow: var(--creamu-wb-control-elevation, 0 2px 0 var(--creamu-wb-accent-dark)); }
        #jlc-wb .jlc-wb-btn.ghost { background: var(--creamu-wb-surface-soft); }
        #jlc-wb .jlc-wb-btn.danger { background: #f3d5d0; border-color: #e8b8b0; color: #8a3a32; box-shadow: none; }
        #jlc-wb .jlc-wb-btn:hover, #jlc-wb .jlc-wb-icon-btn:hover, #jlc-wb .jlc-wb-chip:hover {
            background: var(--creamu-wb-surface-raised); border-color: #d4bc96; filter: brightness(1.02);
        }
        #jlc-wb .jlc-wb-btn.primary:hover { background: var(--creamu-wb-accent-hover); border-color: transparent; filter: none; }
        #jlc-wb .jlc-wb-btn[disabled] { opacity: .5; cursor: not-allowed; }

        #jlc-wb .jlc-wb-nav {
            display: flex; gap: 8px; background: transparent; border-bottom: 0; flex: 0 0 auto;
            padding: 0 16px 10px;
        }
        #jlc-wb .jlc-wb-nav button {
            flex: 1; border: 0; background: var(--creamu-wb-surface-muted); color: var(--creamu-wb-text-subtle); padding: 10px 10px; cursor: pointer;
            font-size: 14px; font-weight: 700; transition: .18s; border-radius: 12px;
        }
        #jlc-wb .jlc-wb-nav button.active {
            color: var(--creamu-wb-on-accent); background: var(--creamu-wb-accent); box-shadow: var(--creamu-wb-control-elevation, 0 2px 0 var(--creamu-wb-accent-dark));
        }

        #jlc-wb .jlc-wb-body {
            flex: 1 1 auto; min-height: 0; overflow: hidden; display: flex; flex-direction: column;
            padding: 0; background: transparent;
        }
        #jlc-wb [data-jlc-wb-page] {
            flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; overflow: hidden;
        }
        #jlc-wb [data-jlc-wb-page][hidden] { display: none !important; }
        #jlc-wb #jlc-wb-tracking-root,
        #jlc-wb #exc-wb-tracking-root,
        #jlc-wb #exc-wb-works-root,
        #jlc-wb [data-jlc-wb-page] > * {
            flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; overflow: hidden;
        }
        #jlc-wb #jlc-wb-view-root {
            flex: 1 1 auto; min-height: 0; overflow: auto; padding: 14px;
        }
        #jlc-wb #jlc-wb-library-root,
        #jlc-wb #jlc-wb-filter-root {
            flex: 1 1 auto; min-height: 0; overflow: auto; padding: 14px;
        }

        #jlc-wb .jlc-wb-footer {
            flex: 0 0 auto; border-top: 1px solid var(--creamu-wb-divider); padding: 12px 14px; background: rgba(255,255,255,.45);
            display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between;
        }
        #jlc-wb .jlc-wb-footer-summary { font-size: 12.5px; color: var(--creamu-wb-text-muted); line-height: 1.45; max-width: 52%; }
        #jlc-wb .jlc-wb-footer-actions {
            display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
        }

        #jlc-wb .jlc-wb-toolbar {
            flex: 0 0 auto; display: flex; flex-direction: column; gap: 9px;
            padding: 4px 14px 10px; background: transparent; border-bottom: 0;
            position: static;
        }
        #jlc-wb .jlc-wb-toolbar-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        #jlc-wb .jlc-wb-toolbar-note {
            color: var(--creamu-wb-text-muted); font-size: 12.5px; line-height: 1.45;
        }
        #jlc-wb .jlc-wb-list-scroll {
            flex: 1 1 auto; min-height: 0; overflow-x: hidden; overflow-y: auto;
            /* 底边留白：少条目时「更多」菜单向下仍有空间；仍不够时 JS 会 is-up 上翻 */
            padding: 4px 14px 96px; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
        }
        #jlc-wb .jlc-wb-list-scroll::-webkit-scrollbar { width: 8px; }
        #jlc-wb .jlc-wb-list-scroll::-webkit-scrollbar-thumb {
            background: rgba(140,100,50,.22); border-radius: 999px;
        }

        #jlc-wb .jlc-wb-search {
            flex: 1 1 180px; min-width: 0; padding: 10px 14px; border-radius: 14px; border: 1px solid var(--creamu-wb-border);
            background: var(--creamu-wb-surface-raised); color: var(--creamu-wb-text); font-size: 14.5px; box-shadow: var(--creamu-wb-control-elevation, 0 2px 0 #eadcc6);
        }
        #jlc-wb .jlc-wb-search:focus { outline: none; border-color: var(--creamu-wb-accent); background: var(--creamu-wb-surface-raised); }
        #jlc-wb select.jlc-wb-select,
        #jlc-wb select {
            color-scheme: light;
            background: var(--creamu-wb-surface) !important;
            color: var(--creamu-wb-text) !important;
        }
        #jlc-wb select option,
        #jlc-wb select.jlc-wb-select option {
            background: var(--creamu-wb-surface) !important;
            color: var(--creamu-wb-text) !important;
        }
        #jlc-wb select.jlc-wb-select {
            padding: 9px 11px; border-radius: 12px; border: 1px solid var(--creamu-wb-border); background: var(--creamu-wb-surface-raised); color: var(--creamu-wb-text); font-size: 13.5px;
            box-shadow: var(--creamu-wb-control-elevation, 0 2px 0 #eadcc6);
        }

        #jlc-wb .jlc-wb-group {
            border: 0; border-radius: 16px; overflow: visible; margin-bottom: 18px; background: transparent;
        }
        #jlc-wb .jlc-wb-group-toggle {
            width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px;
            background: transparent; color: var(--creamu-wb-secondary-ink, #7a5a3c); border: 0; padding: 10px 6px 10px;
            cursor: pointer; font-size: 13.5px; font-weight: 750;
            border-radius: 0; margin: 0 0 2px; line-height: 1.35;
            min-height: 36px;
        }
        #jlc-wb .jlc-wb-group.collapsed .jlc-wb-group-toggle { border-radius: 0; }
        #jlc-wb .jlc-wb-group-toggle small {
            color: var(--creamu-wb-text-muted); font-weight: 650; background: var(--creamu-wb-surface-muted); padding: 3px 9px; border-radius: 999px; font-size: 12px;
            flex: 0 0 auto;
        }
        #jlc-wb .jlc-wb-group-body {
            padding: 2px 0 4px; display: flex; flex-direction: column; gap: 12px; overflow: visible;
        }
        #jlc-wb .jlc-wb-group.collapsed .jlc-wb-group-body { display: none; }

        #jlc-wb .jlc-wb-item {
            position: relative; border-radius: var(--creamu-wb-card-radius, 18px); padding: 12px;
            background: var(--creamu-wb-surface); border: 1px solid var(--creamu-wb-card-border, #efe0cc); overflow: visible;
            cursor: pointer; transition: border-color .12s ease, background .12s ease, box-shadow .12s ease, transform .12s ease;
            box-shadow: var(--creamu-wb-card-elevation, 0 3px 0 #ead7bb);
        }
        #jlc-wb .jlc-wb-item:hover {
            border-color: var(--creamu-wb-card-hover-border, #e0c9a8); background: var(--creamu-wb-surface-raised);
            box-shadow: var(--creamu-wb-card-hover-elevation, 0 6px 16px rgba(120,80,30,.12)); z-index: 3;
        }
        #jlc-wb .jlc-wb-item::before { display: none; }
        #jlc-wb .jlc-wb-item.is-focus {
            border-color: var(--creamu-wb-accent); box-shadow: var(--creamu-wb-focus-elevation, 0 0 0 2px var(--creamu-wb-accent-ring), 0 4px 0 #e0c9a8);
            background: var(--creamu-wb-focus-surface, #fff8ee);
        }
        #jlc-wb .jlc-wb-item.is-current { border-color: #8eb6e8; }
        /* 菜单打开时抬高整卡，避免被下方 Open 按钮盖住 */
        #jlc-wb .jlc-wb-item.is-menu-open {
            z-index: 50;
            position: relative;
        }

        #jlc-wb .jlc-wb-item-row {
            display: flex; align-items: center; gap: 12px; min-width: 0;
        }
        #jlc-wb .jlc-wb-cover {
            flex: 0 0 auto; width: 54px; height: 54px; border-radius: 14px;
            background: var(--creamu-wb-surface-muted); border: 1px solid var(--creamu-wb-border); overflow: hidden;
            display: flex; align-items: center; justify-content: center; position: relative;
        }
        #jlc-wb .jlc-wb-cover.is-avatar { border-radius: 50%; }
        #jlc-wb .jlc-wb-cover.is-poster { border-radius: 12px; }
        #jlc-wb .jlc-wb-cover img {
            width: 100%; height: 100%; object-fit: cover; display: block; background: #f0e6d6;
        }
        #jlc-wb .jlc-wb-cover img.jlc-wb-lrr-thumb {
            position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
        }
        #jlc-wb .jlc-wb-cover { position: relative; }
        #jlc-wb .jlc-wb-item-actions {
            display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; align-items: center;
        }
        #jlc-wb .jlc-wb-item-actions .jlc-wb-btn {
            display: inline-flex; align-items: center; justify-content: center; text-decoration: none;
            padding: 7px 11px; font-size: 12.5px;
        }
        #jlc-wb .jlc-wb-cover-fallback {
            font-size: 18px; font-weight: 800; color: #a07850; line-height: 1;
        }
        #jlc-wb .jlc-wb-cover[data-group="actor"] { background: #f3e2ef; }
        #jlc-wb .jlc-wb-cover[data-group="director"] { background: #e4eef8; }
        #jlc-wb .jlc-wb-cover[data-group="maker"],
        #jlc-wb .jlc-wb-cover[data-group="studio"] { background: #e8f0e4; }
        #jlc-wb .jlc-wb-cover[data-group="series"] { background: #f7ebe0; }
        #jlc-wb .jlc-wb-cover[data-group="tag"] { background: #f0ebe0; }
        #jlc-wb .jlc-wb-cover[data-group="keyword"] { background: #efe8f5; }

        #jlc-wb .jlc-wb-item-body { flex: 1 1 auto; min-width: 0; }
        #jlc-wb .jlc-wb-item-title-row {
            display: flex; align-items: flex-start; gap: 8px; margin-bottom: 4px;
        }
        #jlc-wb .jlc-wb-item-title {
            flex: 1 1 auto; min-width: 0; font-size: 14.5px; font-weight: 750; color: var(--creamu-wb-text);
            line-height: 1.35; margin: 0; word-break: break-word;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        #jlc-wb .jlc-wb-leaf {
            flex: 0 0 auto; max-width: 72px; padding: 2px 8px; border-radius: 999px;
            font-size: 11px; font-weight: 750; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            background: var(--creamu-wb-surface-muted); color: var(--creamu-wb-text-subtle);
        }
        #jlc-wb .jlc-wb-leaf.tone-red { background: #fde2df; color: var(--creamu-wb-danger); }
        #jlc-wb .jlc-wb-leaf.tone-green { background: #e2f5e4; color: #2f6b3a; }
        #jlc-wb .jlc-wb-leaf.tone-yellow { background: #fff1d6; color: #9a6700; }
        #jlc-wb .jlc-wb-leaf.tone-gray { background: var(--creamu-wb-surface-muted); color: var(--creamu-wb-text-subtle); }
        #jlc-wb .jlc-wb-item-meta {
            display: flex; flex-direction: column; gap: 2px;
            margin-bottom: 5px; min-width: 0;
        }
        #jlc-wb .jlc-wb-item-meta-line {
            font-size: 12.5px; color: var(--creamu-wb-text-muted); line-height: 1.4;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            min-width: 0;
        }
        #jlc-wb .jlc-wb-item-meta-line.is-avid {
            color: var(--creamu-wb-secondary-ink, #7a6048); font-weight: 650;
        }
        #jlc-wb .jlc-wb-item-pills {
            display: flex; flex-wrap: wrap; gap: 5px; align-items: center;
        }
        #jlc-wb .jlc-wb-item-side {
            flex: 0 0 auto; display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
            position: relative; z-index: 2;
        }
        #jlc-wb .jlc-wb-open-btn {
            appearance: none; border: 0; cursor: pointer;
            min-width: 64px; padding: 8px 14px; border-radius: 999px;
            background: linear-gradient(var(--creamu-wb-accent-light), var(--creamu-wb-accent)); color: var(--creamu-wb-on-accent); font-weight: 800; font-size: 13px;
            box-shadow: var(--creamu-wb-control-elevation, 0 3px 0 var(--creamu-wb-accent-dark)); transition: transform .12s ease, filter .12s ease;
        }
        #jlc-wb .jlc-wb-open-btn:hover { filter: brightness(1.05); transform: translateY(-1px); }
        #jlc-wb .jlc-wb-open-btn:active { transform: translateY(1px); box-shadow: var(--creamu-wb-control-elevation, 0 1px 0 var(--creamu-wb-accent-dark)); }
        #jlc-wb .jlc-wb-more-btn {
            appearance: none; border: 0; background: transparent; color: var(--creamu-wb-secondary-ink, #b09070);
            width: 28px; height: 22px; border-radius: 8px; cursor: pointer; font-size: 16px; line-height: 1;
            font-weight: 800; letter-spacing: 1px;
        }
        #jlc-wb .jlc-wb-more-btn:hover, #jlc-wb .jlc-wb-more-btn.is-open {
            background: var(--creamu-wb-surface-muted); color: var(--creamu-wb-title);
        }
        #jlc-wb .jlc-wb-item-menu {
            position: absolute; top: calc(100% + 4px); right: 0; min-width: 132px;
            background: var(--creamu-wb-surface); border: 1px solid var(--creamu-wb-border); border-radius: 12px;
            box-shadow: 0 12px 28px rgba(90,60,30,.2); padding: 6px; z-index: 80;
            display: flex; flex-direction: column; gap: 2px;
        }
        #jlc-wb .jlc-wb-item-menu.is-up {
            top: auto; bottom: calc(100% + 4px);
        }
        #jlc-wb .jlc-wb-item-menu[hidden] { display: none !important; }
        #jlc-wb .jlc-wb-item-menu button {
            appearance: none; border: 0; background: transparent; text-align: left;
            padding: 8px 10px; border-radius: 8px; cursor: pointer; color: var(--creamu-wb-text-strong);
            font-size: 13px; font-weight: 650;
        }
        #jlc-wb .jlc-wb-item-menu button:hover { background: var(--creamu-wb-inset-surface, #f3e9d8); }
        #jlc-wb .jlc-wb-item-menu button.is-danger { color: var(--creamu-wb-danger); }

        #jlc-wb .jlc-status-pill, #jlc-wb .jlc-site-pill {
            display: inline-flex; align-items: center; border-radius: 999px; padding: 2px 8px;
            font-size: 11.5px; font-weight: 700; border: 1px solid transparent;
        }
        #jlc-wb .jlc-site-pill { background: var(--creamu-wb-inset-surface, #f3e9d8); color: var(--creamu-wb-text-subtle); border-color: var(--creamu-wb-divider); }
        #jlc-wb .jlc-site-pill.is-current { background: #e7f1ff; color: #175cd3; border-color: #c2dbff; }
        /* 上次：默认琥珀；按打开时效加深/减弱 */
        #jlc-wb .jlc-site-pill.is-last { background: #fff4db; color: #9a6700; border-color: #f0d7a0; }
        #jlc-wb .jlc-site-pill.is-last.recency-fresh {
            background: #ffe8c2; color: #b54708; border-color: #f5c77a; font-weight: 800;
        }
        #jlc-wb .jlc-site-pill.is-last.recency-warm {
            background: #fff0d0; color: #9a6700; border-color: #ebc98a;
        }
        #jlc-wb .jlc-site-pill.is-last.recency-mid {
            background: #f6efe2; color: #8a7048; border-color: #e4d4bc;
        }
        #jlc-wb .jlc-site-pill.is-last.recency-cool {
            background: #f0ebe4; color: #9a8a78; border-color: #e0d6c8;
        }
        #jlc-wb .jlc-wb-item-meta-line .jlc-wb-pagehint,
        #jlc-wb .jlc-wb-pagehint {
            color: var(--creamu-wb-secondary-ink, #a89078); font-weight: 550;
        }
        #jlc-wb .jlc-wb-item-meta-line.is-sub {
            color: var(--creamu-wb-secondary-ink, #a89078); font-weight: 550;
        }
        #jlc-wb .jlc-status-pill.tone-gray { background: var(--creamu-wb-surface-muted); color: var(--creamu-wb-text-subtle); }
        #jlc-wb .jlc-status-pill.tone-green { background: #e2f5e4; color: #2f6b3a; }
        #jlc-wb .jlc-status-pill.tone-red { background: #fde2df; color: var(--creamu-wb-danger); }
        #jlc-wb .jlc-status-pill.tone-yellow { background: #fff1d6; color: #9a6700; }

        #jlc-wb .jlc-wb-empty {
            padding: 20px; border: 1px dashed #e0cdae; border-radius: 16px; color: var(--creamu-wb-text-muted);
            background: rgba(255,255,255,.55); font-size: 14.5px; line-height: 1.65;
        }

        #jlc-wb .jlc-wb-view-block {
            background: var(--creamu-wb-surface); border: 1px solid var(--creamu-wb-card-border, #efe0cc); border-radius: var(--creamu-wb-card-radius, 16px); padding: 14px; margin-bottom: 14px;
            box-shadow: var(--creamu-wb-card-elevation, 0 3px 0 #ead7bb);
        }
        #jlc-wb .jlc-wb-view-title {
            font-size: 12px; color: var(--creamu-wb-accent); font-weight: 750; letter-spacing: .5px; margin: 0 0 12px;
            text-transform: uppercase;
        }
        #jlc-wb .legacy-row,
        #jlc-wb .jlc-wb-settings .legacy-row {
            background: var(--creamu-wb-surface-soft); border: 1px solid var(--creamu-wb-border); border-radius: 12px; padding: 12px 14px; margin-bottom: 10px;
        }
        #jlc-wb .legacy-toggle,
        #jlc-wb .jlc-wb-settings .legacy-toggle {
            display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }
        #jlc-wb .legacy-toggle > span,
        #jlc-wb .jlc-wb-settings .legacy-toggle > span { color: var(--creamu-wb-text); font-size: 14.5px; }
        #jlc-wb .legacy-toggle input[type="checkbox"],
        #jlc-wb .jlc-wb-settings .legacy-toggle input[type="checkbox"] {
            width: 20px; height: 20px; margin: 0; accent-color: var(--creamu-wb-accent); cursor: pointer;
        }
        #jlc-wb .legacy-row.disabled { opacity: .45; }
        #jlc-wb .legacy-range,
        #jlc-wb .jlc-wb-settings .legacy-range { display: flex; align-items: center; gap: 10px; }
        #jlc-wb .legacy-range input[type="range"],
        #jlc-wb .jlc-wb-settings .legacy-range input[type="range"] {
            flex: 1; margin: 0; background: transparent; border: 0; accent-color: var(--creamu-wb-accent);
        }
        #jlc-wb .legacy-note,
        #jlc-wb .jlc-wb-settings .legacy-note { font-size: 13px; color: var(--creamu-wb-text-muted); line-height: 1.55; margin-top: 8px; }
        #jlc-wb .legacy-note.jlc-wb-intro-note,
        #jlc-wb .jlc-wb-settings .legacy-note.jlc-wb-intro-note { margin: 0 0 10px; }
        #jlc-wb .jlc-wb-status-note { margin: 4px 0 0; }
        #jlc-wb .jlc-wb-scroll-note { max-height: 140px; overflow: auto; }
        #jlc-wb .jlc-wb-note-summary { margin-bottom: 4px; }
        #jlc-wb .jlc-wb-title-link { color: inherit; text-decoration: none; }
        #jlc-wb .jlc-wb-inline-form { display: flex; gap: 6px; align-items: stretch; }
        #jlc-wb .jlc-wb-inline-form input {
            flex: 1 1 auto; min-width: 0; width: auto; margin-top: 0;
        }
        #jlc-wb #jlc-wb-library-root .jlc-wb-inline-form input[type="text"] {
            flex: 1 1 auto; min-width: 0; width: auto; margin-top: 0;
        }
        #jlc-wb .jlc-wb-list-stack { margin-top: 10px; }
        #jlc-wb .jlc-wb-range-head {
            display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px;
        }
        #jlc-wb .jlc-wb-range-value { color: var(--creamu-wb-accent); }
        #jlc-wb .jlc-wb-view-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px; }
        #jlc-wb .jlc-wb-view-actions .jlc-wb-btn { width: 100%; justify-content: center; }

        #jlc-wb .jlc-wb-settings {
            display: none; position: absolute; inset: 0; z-index: 5; background: rgba(90,60,30,.28);
        }
        #jlc-wb .jlc-wb-settings.is-open { display: block; }
        #jlc-wb .jlc-wb-settings-panel {
            position: absolute; top: 0; right: 0; width: min(100%, 430px); height: 100%;
            display: flex; flex-direction: column; background: var(--creamu-wb-bg); border-left: 1px solid var(--creamu-wb-border);
        }
        #jlc-wb .jlc-wb-settings-head {
            flex: 0 0 auto; display: flex; justify-content: space-between; align-items: center;
            gap: 8px; padding: 14px 16px; border-bottom: 1px solid var(--creamu-wb-divider); background: var(--creamu-wb-surface-soft); font-size: 15px; color: var(--creamu-wb-text);
        }
        #jlc-wb .jlc-wb-settings-nav {
            flex: 0 0 auto; display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 14px;
            border-bottom: 1px solid var(--creamu-wb-divider); background: var(--creamu-wb-inset-surface, #f3e9d8);
        }
        #jlc-wb .jlc-wb-settings-nav button {
            appearance: none; border: 1px solid var(--creamu-wb-border-strong); background: var(--creamu-wb-surface-raised); color: var(--creamu-wb-text-subtle);
            border-radius: var(--creamu-wb-control-radius, 999px); padding: 8px 12px; cursor: pointer; font-size: 13.5px; font-weight: 700;
        }
        #jlc-wb .jlc-wb-settings-nav button.active {
            background: var(--creamu-wb-accent); border-color: transparent; color: var(--creamu-wb-on-accent);
        }
        #jlc-wb .jlc-wb-settings-body {
            flex: 1 1 auto; min-height: 0; overflow: auto; padding: 14px 16px 20px; background: var(--creamu-wb-bg);
        }
        #jlc-wb .jlc-wb-settings-section { display: none; }
        #jlc-wb .jlc-wb-settings-section.is-active { display: block; }
        #jlc-wb .jlc-wb-settings h3 {
            margin: 0 0 12px; font-size: 13px; color: var(--creamu-wb-accent); letter-spacing: 1px; text-transform: uppercase;
        }
        #jlc-wb .jlc-wb-settings h3.jlc-wb-section-title { margin-top: 16px; }
        #jlc-wb .jlc-wb-form-actions {
            display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;
        }
        #jlc-wb .jlc-wb-form-actions > .jlc-wb-btn {
            flex: 1 1 120px; min-width: 0; justify-content: center;
        }
        #jlc-wb .jlc-wb-field-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; margin-top: 6px;
        }
        #jlc-wb .jlc-wb-field-grid > * { min-width: 0; }
        #jlc-wb .jlc-wb-block-action,
        #jlc-wb .jlc-wb-save-action {
            width: 100%; justify-content: center;
        }
        #jlc-wb .jlc-wb-block-action { margin-top: 8px; }
        #jlc-wb .jlc-wb-save-action { margin-top: 14px; }
        #jlc-wb .jlc-wb-settings .legacy-note.jlc-wb-data-report {
            margin-top: 10px; white-space: pre-wrap; word-break: break-word;
            max-height: 220px; overflow: auto; font-size: 12px; line-height: 1.45;
        }
        #jlc-wb .jlc-wb-settings label,
        #jlc-wb #jlc-wb-library-root label,
        #jlc-wb #jlc-wb-filter-root label {
            display: block; font-size: 12px; color: var(--creamu-wb-text-muted); margin-top: 12px; text-transform: uppercase; letter-spacing: 1px;
        }
        #jlc-wb .jlc-wb-settings input[type="text"],
        #jlc-wb .jlc-wb-settings input[type="password"],
        #jlc-wb .jlc-wb-settings input[type="number"],
        #jlc-wb .jlc-wb-settings textarea,
        #jlc-wb .jlc-wb-settings select,
        #jlc-wb #jlc-wb-library-root input[type="text"],
        #jlc-wb #jlc-wb-library-root input[type="password"],
        #jlc-wb #jlc-wb-library-root input[type="number"],
        #jlc-wb #jlc-wb-library-root textarea,
        #jlc-wb #jlc-wb-library-root select,
        #jlc-wb #jlc-wb-filter-root input[type="text"],
        #jlc-wb #jlc-wb-filter-root textarea {
            width: 100%; padding: 12px; margin-top: 8px; border-radius: 12px; border: 1px solid var(--creamu-wb-border);
            background: var(--creamu-wb-surface-raised); color: var(--creamu-wb-text); font-size: 14px;
        }
        #jlc-wb .jlc-wb-settings input:focus,
        #jlc-wb .jlc-wb-settings textarea:focus,
        #jlc-wb .jlc-wb-settings select:focus,
        #jlc-wb #jlc-wb-library-root input:focus,
        #jlc-wb #jlc-wb-library-root textarea:focus,
        #jlc-wb #jlc-wb-library-root select:focus {
            border-color: var(--creamu-wb-accent); outline: none; background: var(--creamu-wb-surface-raised);
        }
        #jlc-wb .stat-box {
            display: flex; justify-content: space-around; background: var(--creamu-wb-surface); border: 1px solid var(--creamu-wb-card-border, #efe0cc);
            border-radius: 14px; padding: 14px; margin-bottom: 14px;
        }
        #jlc-wb .stat-item { text-align: center; }
        #jlc-wb .stat-item b { display: block; color: var(--creamu-wb-accent); font-size: 22px; margin-bottom: 4px; }
        #jlc-wb .stat-item span { font-size: 11px; color: var(--creamu-wb-text-muted); }
        #jlc-wb .person-item {
            background: var(--creamu-wb-surface); padding: 12px 14px; border-radius: 12px; margin-bottom: 8px;
            display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--creamu-wb-card-border, #efe0cc); font-size: 14px;
            color: var(--creamu-wb-text);
        }
        #jlc-wb .person-item:hover { border-color: var(--creamu-wb-card-hover-border, #e0c9a8); background: var(--creamu-wb-surface-raised); }
        #jlc-wb .person-item span.remove { color: var(--creamu-wb-accent); cursor: pointer; font-size: 18px; padding: 0 8px; }

        #jlc-wb .jlc-wb-resize-w {
            position: absolute; left: 0; top: 0; bottom: 0; width: 8px; cursor: ew-resize; z-index: 8;
        }
        #jlc-wb .jlc-wb-resize-h {
            position: absolute; left: 0; right: 0; bottom: 0; height: 8px; cursor: ns-resize; z-index: 8;
        }
        #jlc-wb .jlc-wb-resize-corner {
            position: absolute; right: 0; bottom: 0; width: 18px; height: 18px; cursor: nwse-resize; z-index: 9;
        }
        #jlc-wb .jlc-wb-resize-corner::after {
            content: ''; position: absolute; right: 5px; bottom: 5px; width: 9px; height: 9px;
            border-right: 2px solid rgba(180,130,70,.55); border-bottom: 2px solid rgba(180,130,70,.55);
            border-radius: 0 0 3px 0;
        }
        #jlc-wb .jlc-wb-resize-w:hover, #jlc-wb .jlc-wb-resize-w.is-dragging,
        #jlc-wb .jlc-wb-resize-h:hover, #jlc-wb .jlc-wb-resize-h.is-dragging {
            background: var(--creamu-wb-accent-overlay);
        }
        #jlc-wb .jlc-wb-resize-corner:hover, #jlc-wb .jlc-wb-resize-corner.is-dragging {
            background: var(--creamu-wb-accent-overlay-soft);
        }

        #jlc-wb .jlc-wb-item-edit {
            display: none; position: relative; z-index: 6;
            margin-top: 10px; gap: 8px; align-items: center; flex-wrap: wrap;
        }
        #jlc-wb .jlc-wb-item-edit.is-open { display: flex; }
        #jlc-wb .jlc-wb-item-edit input {
            flex: 1 1 160px; min-width: 0; padding: 9px 11px; border-radius: 12px;
            border: 1px solid var(--creamu-wb-border); background: var(--creamu-wb-surface-raised); color: var(--creamu-wb-text); font-size: 14px;
        }
        #jlc-wb-dialog {
            position: fixed; inset: 0; z-index: 1000001; display: none; align-items: center; justify-content: center;
            background: rgba(90,60,30,.35); padding: 20px;
        }
        #jlc-wb-dialog.is-open { display: flex; }
        #jlc-wb-dialog .jlc-wb-dialog-card {
            width: min(440px, 92vw); background: var(--creamu-wb-surface); border: 1px solid var(--creamu-wb-border); border-radius: 18px;
            padding: 18px; box-shadow: 0 18px 50px rgba(90,60,30,.22); color: var(--creamu-wb-text);
        }
        #jlc-wb-dialog h4 { margin: 0 0 8px; font-size: 16px; color: var(--creamu-wb-text); }
        #jlc-wb-dialog p { margin: 0 0 12px; font-size: 13.5px; color: var(--creamu-wb-text-muted); line-height: 1.55; }
        #jlc-wb-dialog input {
            width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--creamu-wb-border);
            background: var(--creamu-wb-surface-raised); color: var(--creamu-wb-text); font-size: 14.5px; margin-bottom: 14px;
        }
        #jlc-wb-dialog .jlc-wb-dialog-actions { display: flex; gap: 8px; justify-content: flex-end; }

        #jlc-wb .jlc-wb-settings-footer {
            flex: 0 0 auto; border-top: 1px solid var(--creamu-wb-divider); padding: 12px 14px; background: var(--creamu-wb-surface-soft);
            display: flex; flex-direction: column; gap: 8px;
        }
        #jlc-wb .jlc-wb-settings-footer .jlc-wb-btn { width: 100%; justify-content: center; }

        #jlc-wb .jlc-wb-settings input[type="number"] {
            -moz-appearance: textfield;
            appearance: textfield;
            color-scheme: light;
        }
        #jlc-wb .jlc-wb-settings input[type="number"]::-webkit-outer-spin-button,
        #jlc-wb .jlc-wb-settings input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none; margin: 0;
        }
        /* 按钮缩放：由脚本设置 --jlc-btn-scale（如 0.85）；默认 1 不影响布局 */
        #jlc-wb-fab,
        #jlc-wb .jlc-wb-btn,
        #jlc-wb .jlc-wb-icon-btn,
        #jlc-wb .jlc-wb-chip,
        #jlc-wb .jlc-wb-nav button,
        #jlc-wb .jlc-wb-open-btn,
        #jlc-wb .jlc-wb-more-btn,
        #jlc-wb .jlc-wb-settings-nav button,
        #jlc-wb .jlc-wb-item-menu button,
        #jlc-wb-dialog .jlc-wb-dialog-actions button {
            zoom: var(--jlc-btn-scale, 1);
        }

        @media (max-width: 820px) {
            #jlc-wb-fab.is-panel-open {
                opacity: 0 !important; visibility: hidden !important; pointer-events: none !important;
            }
            #jlc-wb {
                left: 0 !important; right: 0 !important; top: auto !important; bottom: 0 !important;
                width: 100% !important; height: min(86vh, 840px); border-radius: 16px 16px 0 0;
            }
            #jlc-wb .jlc-wb-header { cursor: default; }
            #jlc-wb-fab { width: 42px; height: 42px; font-size: 17px; }
        }`;
  return replaceCreamuWorkbenchSelectors(css, options);
}

function injectCreamuWorkbenchStyles(opts) {
    opts = opts || {};
    const id = opts.styleId || 'jlc-wb-style';
    let styleEl = document.getElementById(id);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = id;
      (document.head || document.documentElement).appendChild(styleEl);
    }
    const extra = replaceCreamuWorkbenchSelectors(opts.extraCss || '', opts);
    const css = getCreamuWorkbenchCss(opts) + (extra ? '\n' + extra : '');
    if (styleEl.textContent !== css) styleEl.textContent = css;
    return styleEl;
  }
function parseCreamuPixel(value) {
  if (value == null || value === '') return NaN;
  if (typeof value === 'number') return value;
  return parseFloat(String(value).replace(/px$/i, ''));
}

function getCreamuViewportSize(viewport) {
  const width = Number(viewport?.innerWidth ?? viewport?.width);
  const height = Number(viewport?.innerHeight ?? viewport?.height);
  return {
    width: Number.isFinite(width) && width > 0 ? width : 1280,
    height: Number.isFinite(height) && height > 0 ? height : 720,
  };
}

function getCreamuDefaultWorkbenchRect(viewport, options = {}) {
  const size = getCreamuViewportSize(viewport);
  const minWidth = Number(options.minWidth) || 360;
  const minHeight = Number(options.minHeight) || 280;
  const preferredMaxWidth = Number(options.preferredMaxWidth) || 520;
  const preferredMaxHeight = Number(options.preferredMaxHeight) || 780;
  const widthPadding = Number(options.widthPadding) || 96;
  const heightPadding = Number(options.heightPadding) || 80;
  const heightRatio = Number(options.heightRatio) || 0.76;
  const rightOffset = Number(options.rightOffset) || 48;
  const minLeft = Number(options.minLeft) || 24;
  const minTop = Number(options.minTop) || 32;
  const topRatio = Number(options.topRatio) || 0.12;
  const width = Math.min(preferredMaxWidth, Math.max(minWidth, size.width - widthPadding));
  const height = Math.max(
    minHeight,
    Math.min(size.height * heightRatio, preferredMaxHeight, size.height - heightPadding)
  );

  return {
    left: Math.max(minLeft, Math.round(size.width - width - rightOffset)),
    top: Math.max(minTop, Math.round((size.height - height) * topRatio)),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function clampCreamuWorkbenchRect(rect, viewport, options = {}) {
  const size = getCreamuViewportSize(viewport);
  const margin = Number.isFinite(Number(options.margin)) ? Number(options.margin) : 12;
  const minWidth = Number(options.minWidth) || 360;
  const minHeight = Number(options.minHeight) || 280;
  const availableWidth = Math.max(minWidth, size.width - margin * 2);
  const availableHeight = Math.max(minHeight, size.height - margin * 2);
  const configuredMaxWidth = Number(options.maxWidth);
  const configuredMaxHeight = Number(options.maxHeight);
  const maxWidth = Number.isFinite(configuredMaxWidth)
    ? Math.min(availableWidth, Math.max(minWidth, configuredMaxWidth))
    : availableWidth;
  const maxHeight = Number.isFinite(configuredMaxHeight)
    ? Math.min(availableHeight, Math.max(minHeight, configuredMaxHeight))
    : availableHeight;
  const defaultRect = options.defaultRect || getCreamuDefaultWorkbenchRect(size, options);

  let width = Math.round(parseCreamuPixel(rect?.width));
  let height = Math.round(parseCreamuPixel(rect?.height));
  if (!Number.isFinite(width) || width <= 0) width = Number(options.fallbackWidth) || defaultRect.width;
  if (!Number.isFinite(height) || height <= 0) height = Number(options.fallbackHeight) || defaultRect.height;
  width = Math.min(maxWidth, Math.max(minWidth, width));
  height = Math.min(maxHeight, Math.max(minHeight, height));

  let left = parseCreamuPixel(rect?.left);
  let top = parseCreamuPixel(rect?.top);
  if (!Number.isFinite(left)) left = defaultRect.left;
  if (!Number.isFinite(top)) top = defaultRect.top;
  const maxLeft = Math.max(margin, size.width - width - margin);
  const maxTop = Math.max(margin, size.height - height - margin);

  return {
    left: Math.round(Math.min(maxLeft, Math.max(margin, left))),
    top: Math.round(Math.min(maxTop, Math.max(margin, top))),
    width,
    height,
  };
}

function clampCreamuWorkbenchPoint(point, elementSize, viewport, options = {}) {
  const left = parseCreamuPixel(point?.left);
  const top = parseCreamuPixel(point?.top);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
  const size = getCreamuViewportSize(viewport);
  const margin = Number.isFinite(Number(options.margin)) ? Number(options.margin) : 8;
  const width = Math.max(0, parseCreamuPixel(elementSize?.width) || 0);
  const height = Math.max(0, parseCreamuPixel(elementSize?.height) || 0);
  return {
    left: Math.min(Math.max(margin, left), Math.max(margin, size.width - width - margin)),
    top: Math.min(Math.max(margin, top), Math.max(margin, size.height - height - margin)),
  };
}

function moveCreamuWorkbenchRect(rect, startPoint, currentPoint, viewport, options = {}) {
  const startX = Number(startPoint?.x);
  const startY = Number(startPoint?.y);
  const currentX = Number(currentPoint?.x);
  const currentY = Number(currentPoint?.y);
  const dx = Number.isFinite(startX) && Number.isFinite(currentX) ? currentX - startX : 0;
  const dy = Number.isFinite(startY) && Number.isFinite(currentY) ? currentY - startY : 0;
  return clampCreamuWorkbenchRect({
    left: parseCreamuPixel(rect?.left) + dx,
    top: parseCreamuPixel(rect?.top) + dy,
    width: rect?.width,
    height: rect?.height,
  }, viewport, options);
}

function resizeCreamuWorkbenchRect(rect, startPoint, currentPoint, mode, viewport, options = {}) {
  const base = clampCreamuWorkbenchRect(rect, viewport, options);
  const startX = Number(startPoint?.x);
  const startY = Number(startPoint?.y);
  const currentX = Number(currentPoint?.x);
  const currentY = Number(currentPoint?.y);
  const dx = Number.isFinite(startX) && Number.isFinite(currentX) ? currentX - startX : 0;
  const dy = Number.isFinite(startY) && Number.isFinite(currentY) ? currentY - startY : 0;
  const next = { ...base };

  if (mode === 'w') {
    next.left = base.left + dx;
    next.width = base.width - dx;
  } else if (mode === 'corner') {
    next.width = base.width + dx;
    next.height = base.height + dy;
  } else if (mode === 'h') {
    next.height = base.height + dy;
  }

  const resized = clampCreamuWorkbenchRect(next, viewport, options);
  if (mode !== 'w') return resized;
  const right = base.left + base.width;
  return clampCreamuWorkbenchRect({
    ...resized,
    left: right - resized.width,
  }, viewport, options);
}
function getCreamuInteractionTarget(options = {}) {
  return options.eventTarget || (typeof window !== 'undefined' ? window : null);
}

function getCreamuInteractionDocument(element, options = {}) {
  return options.document || element?.ownerDocument || (typeof document !== 'undefined' ? document : null);
}

function getCreamuInteractionRect(element) {
  const rect = element?.getBoundingClientRect?.() || {};
  return {
    left: Number(rect.left) || 0,
    top: Number(rect.top) || 0,
    width: Number(rect.width) || 0,
    height: Number(rect.height) || 0,
  };
}

function applyCreamuInteractionRect(element, rect) {
  if (!element?.style || !rect) return;
  element.style.left = Math.round(Number(rect.left) || 0) + 'px';
  element.style.top = Math.round(Number(rect.top) || 0) + 'px';
  element.style.right = 'auto';
  element.style.bottom = 'auto';
  if (rect.width != null) element.style.width = Math.round(Number(rect.width) || 0) + 'px';
  if (rect.height != null) element.style.height = Math.round(Number(rect.height) || 0) + 'px';
}

function isCreamuPrimaryPointer(event) {
  return event && (event.button == null || event.button === 0);
}

function getCreamuClientPoint(event) {
  return { x: Number(event?.clientX) || 0, y: Number(event?.clientY) || 0 };
}

function getCreamuDataset(element) {
  if (!element) return null;
  if (!element.dataset) element.dataset = {};
  return element.dataset;
}

function callCreamuPreventDefault(event) {
  if (typeof event?.preventDefault === 'function') event.preventDefault();
}

function callCreamuStopPropagation(event) {
  if (typeof event?.stopPropagation === 'function') event.stopPropagation();
}

function bindCreamuFabDrag(fab, options = {}) {
  if (!fab) return () => {};
  const dataset = getCreamuDataset(fab);
  const boundKey = options.boundKey || 'creamuFabDragBound';
  if (dataset?.[boundKey] === '1') return () => {};
  if (dataset) dataset[boundKey] = '1';

  const target = getCreamuInteractionTarget(options);
  const doc = getCreamuInteractionDocument(fab, options);
  if (!target || typeof fab.addEventListener !== 'function') return () => {};

  const eventType = options.eventType === 'mouse' ? 'mouse' : 'pointer';
  const downEvent = eventType === 'mouse' ? 'mousedown' : 'pointerdown';
  const moveEvent = eventType === 'mouse' ? 'mousemove' : 'pointermove';
  const upEvent = eventType === 'mouse' ? 'mouseup' : 'pointerup';
  const cancelEvent = eventType === 'mouse' ? null : 'pointercancel';
  const applyPosition = options.applyPosition || ((point) => {
    if (!fab.style || !point) return;
    fab.style.left = Math.round(Number(point.left) || 0) + 'px';
    fab.style.top = Math.round(Number(point.top) || 0) + 'px';
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
  });
  const getPosition = options.getPosition || (() => {
    const rect = getCreamuInteractionRect(fab);
    return { left: rect.left, top: rect.top };
  });
  const savePosition = options.savePosition || (() => {});
  const onActivate = options.onActivate || (() => {});
  const shouldIgnoreDrag = options.shouldIgnoreDrag || (() => false);
  const isDragDisabled = options.isDragDisabled || (() => false);
  const threshold = Number.isFinite(Number(options.threshold)) ? Number(options.threshold) : 5;
  const thresholdMode = options.thresholdMode === 'axis' ? 'axis' : 'sum';
  const preventClick = options.preventClick !== false;
  const bindClick = options.bindClick !== false;
  const suppressDuration = Number.isFinite(Number(options.suppressDuration))
    ? Math.max(0, Number(options.suppressDuration))
    : 0;
  let active = false;
  let moved = false;
  let startPoint = { x: 0, y: 0 };
  let origin = { left: 0, top: 0 };
  let lastPoint = null;

  if (typeof options.getInitialPosition === 'function') {
    const initial = options.getInitialPosition();
    if (initial) applyPosition(initial, { phase: 'initial' });
  }

  const onMove = (event) => {
    if (!active) return;
    const point = getCreamuClientPoint(event);
    const dx = point.x - startPoint.x;
    const dy = point.y - startPoint.y;
    const crossedThreshold = thresholdMode === 'axis'
      ? Math.abs(dx) >= threshold || Math.abs(dy) >= threshold
      : Math.abs(dx) + Math.abs(dy) >= threshold;
    if (!moved && crossedThreshold) {
      moved = true;
      fab.classList?.add('is-dragging');
    }
    if (!moved) return;
    callCreamuPreventDefault(event);
    const { width, height } = getCreamuInteractionRect(fab);
    const next = clampCreamuWorkbenchPoint(
      { left: origin.left + dx, top: origin.top + dy },
      { width, height },
      options.viewport || (typeof window !== 'undefined' ? window : null),
      options.geometryOptions || {}
    );
    if (!next) return;
    lastPoint = next;
    applyPosition(next, { phase: 'move', event });
  };

  const onUp = (event) => {
    if (!active) return;
    active = false;
    target.removeEventListener(moveEvent, onMove, true);
    target.removeEventListener(upEvent, onUp, true);
    if (cancelEvent) target.removeEventListener(cancelEvent, onUp, true);
    fab.classList?.remove('is-dragging');
    if (moved) {
      savePosition(lastPoint || getPosition(), { phase: 'end', event });
      dataset.suppressClick = '1';
      const clear = () => { delete dataset.suppressClick; };
      if (suppressDuration > 0 && typeof setTimeout === 'function') setTimeout(clear, suppressDuration);
      else if (typeof setTimeout === 'function') setTimeout(clear, 0);
      else clear();
    }
    moved = false;
    lastPoint = null;
  };

  const onDown = (event) => {
    if (!isCreamuPrimaryPointer(event) || isDragDisabled(event) || shouldIgnoreDrag(event)) return;
    // Own the gesture before the browser can start a native link/image drag underneath the FAB.
    callCreamuPreventDefault(event);
    fab.focus?.({ preventScroll: true });
    active = true;
    moved = false;
    startPoint = getCreamuClientPoint(event);
    const rect = getCreamuInteractionRect(fab);
    origin = { left: rect.left, top: rect.top };
    if (eventType === 'pointer' && typeof fab.setPointerCapture === 'function' && event.pointerId != null) {
      try { fab.setPointerCapture(event.pointerId); } catch (_) { /* ignore */ }
    }
    target.addEventListener(moveEvent, onMove, true);
    target.addEventListener(upEvent, onUp, true);
    if (cancelEvent) target.addEventListener(cancelEvent, onUp, true);
  };

  const onClick = (event) => {
    if (dataset.suppressClick === '1' || moved) {
      if (preventClick) callCreamuPreventDefault(event);
      callCreamuStopPropagation(event);
      return;
    }
    if (preventClick) callCreamuPreventDefault(event);
    onActivate(event);
  };

  const onViewportChange = () => {
    if (typeof options.onViewportChange === 'function') options.onViewportChange(fab);
  };

  fab.addEventListener(downEvent, onDown);
  if (bindClick) fab.addEventListener('click', onClick);
  if (typeof options.onViewportChange === 'function') {
    target.addEventListener('resize', onViewportChange, { passive: true });
  }

  return () => {
    fab.removeEventListener(downEvent, onDown);
    if (bindClick) fab.removeEventListener('click', onClick);
    target.removeEventListener(moveEvent, onMove, true);
    target.removeEventListener(upEvent, onUp, true);
    if (cancelEvent) target.removeEventListener(cancelEvent, onUp, true);
    if (typeof options.onViewportChange === 'function') target.removeEventListener('resize', onViewportChange);
    if (dataset) delete dataset[boundKey];
    if (doc?.body) doc.body.style.userSelect = '';
  };
}

function bindCreamuWorkbenchDrag(panel, options = {}) {
  if (!panel) return () => {};
  const header = options.header || panel.querySelector?.(options.headerSelector || '.jlc-wb-header');
  if (!header) return () => {};
  const dataset = getCreamuDataset(header);
  const boundKey = options.boundKey || 'creamuWorkbenchDragBound';
  if (dataset?.[boundKey] === '1') return () => {};
  if (dataset) dataset[boundKey] = '1';

  const target = getCreamuInteractionTarget(options);
  const doc = getCreamuInteractionDocument(panel, options);
  if (!target || typeof header.addEventListener !== 'function') return () => {};
  const eventType = options.eventType === 'mouse' ? 'mouse' : 'pointer';
  const downEvent = eventType === 'mouse' ? 'mousedown' : 'pointerdown';
  const moveEvent = eventType === 'mouse' ? 'mousemove' : 'pointermove';
  const upEvent = eventType === 'mouse' ? 'mouseup' : 'pointerup';
  const cancelEvent = eventType === 'mouse' ? null : 'pointercancel';
  const getStartRect = options.getStartRect || (() => getCreamuInteractionRect(panel));
  const applyRect = options.applyRect || ((rect) => applyCreamuInteractionRect(panel, rect));
  const shouldIgnoreDrag = options.shouldIgnoreDrag || (() => false);
  const isDragDisabled = options.isDragDisabled || (() => false);
  const lockBodySelection = options.lockBodySelection === true;
  const body = options.body || doc?.body;
  let active = false;
  let startPoint = { x: 0, y: 0 };
  let startRect = null;
  let lastRect = null;

  const finish = (event) => {
    if (!active) return;
    active = false;
    panel.classList?.remove('is-dragging');
    if (lockBodySelection && body) body.style.userSelect = '';
    target.removeEventListener(moveEvent, onMove, true);
    target.removeEventListener(upEvent, finish, true);
    if (cancelEvent) target.removeEventListener(cancelEvent, finish, true);
    const rect = lastRect || getCreamuInteractionRect(panel);
    if (typeof options.onEnd === 'function') options.onEnd(rect, { event, phase: 'end' });
    else applyRect(rect, { event, phase: 'end', persist: true });
    lastRect = null;
  };

  const onMove = (event) => {
    if (!active) return;
    const current = getCreamuClientPoint(event);
    lastRect = moveCreamuWorkbenchRect(
      startRect,
      startPoint,
      current,
      options.viewport || (typeof window !== 'undefined' ? window : null),
      options.geometryOptions || {}
    );
    applyRect(lastRect, { event, phase: 'move', persist: false });
  };

  const onDown = (event) => {
    if (!isCreamuPrimaryPointer(event) || isDragDisabled(event) || shouldIgnoreDrag(event)) return;
    callCreamuPreventDefault(event);
    startRect = getStartRect(panel, event);
    startPoint = getCreamuClientPoint(event);
    lastRect = startRect;
    active = true;
    panel.classList?.add('is-dragging');
    if (lockBodySelection && body) body.style.userSelect = 'none';
    if (eventType === 'pointer' && typeof header.setPointerCapture === 'function' && event.pointerId != null) {
      try { header.setPointerCapture(event.pointerId); } catch (_) { /* ignore */ }
    }
    if (typeof options.onStart === 'function') options.onStart(startRect, { event, phase: 'start' });
    target.addEventListener(moveEvent, onMove, true);
    target.addEventListener(upEvent, finish, true);
    if (cancelEvent) target.addEventListener(cancelEvent, finish, true);
  };

  header.addEventListener(downEvent, onDown);
  return () => {
    header.removeEventListener(downEvent, onDown);
    target.removeEventListener(moveEvent, onMove, true);
    target.removeEventListener(upEvent, finish, true);
    if (cancelEvent) target.removeEventListener(cancelEvent, finish, true);
    if (lockBodySelection && body) body.style.userSelect = '';
    if (dataset) delete dataset[boundKey];
  };
}

function bindCreamuWorkbenchResize(panel, options = {}) {
  if (!panel) return () => {};
  const dataset = getCreamuDataset(panel);
  const boundKey = options.boundKey || 'creamuWorkbenchResizeBound';
  if (dataset?.[boundKey] === '1') return () => {};
  if (dataset) dataset[boundKey] = '1';

  const target = getCreamuInteractionTarget(options);
  const doc = getCreamuInteractionDocument(panel, options);
  if (!target || typeof panel.querySelector !== 'function') return () => {};
  const eventType = options.eventType === 'mouse' ? 'mouse' : 'pointer';
  const downEvent = eventType === 'mouse' ? 'mousedown' : 'pointerdown';
  const moveEvent = eventType === 'mouse' ? 'mousemove' : 'pointermove';
  const upEvent = eventType === 'mouse' ? 'mouseup' : 'pointerup';
  const cancelEvent = eventType === 'mouse' ? null : 'pointercancel';
  const getStartRect = options.getStartRect || (() => getCreamuInteractionRect(panel));
  const applyRect = options.applyRect || ((rect) => applyCreamuInteractionRect(panel, rect));
  const isDragDisabled = options.isDragDisabled || (() => false);
  const lockBodySelection = options.lockBodySelection === true;
  const body = options.body || doc?.body;
  const handles = [
    [options.westSelector || '.jlc-wb-resize-w', 'w'],
    [options.heightSelector || '.jlc-wb-resize-h', 'h'],
    [options.cornerSelector || '.jlc-wb-resize-corner', 'corner'],
  ];
  const cleanups = [];

  handles.forEach(([selector, mode]) => {
    const handle = panel.querySelector(selector);
    if (!handle || typeof handle.addEventListener !== 'function') return;
    const handleDataset = getCreamuDataset(handle);
    const handleKey = (options.handleBoundPrefix || 'creamuResizeHandle') + mode;
    if (handleDataset?.[handleKey] === '1') return;
    if (handleDataset) handleDataset[handleKey] = '1';
    let active = false;
    let startPoint = { x: 0, y: 0 };
    let startRect = null;
    let lastRect = null;

    const finish = (event) => {
      if (!active) return;
      active = false;
      handle.classList?.remove('is-dragging');
      panel.classList?.remove('is-resizing');
      if (lockBodySelection && body) body.style.userSelect = '';
      target.removeEventListener(moveEvent, onMove, true);
      target.removeEventListener(upEvent, finish, true);
      if (cancelEvent) target.removeEventListener(cancelEvent, finish, true);
      const rect = lastRect || getCreamuInteractionRect(panel);
      if (typeof options.onEnd === 'function') options.onEnd(rect, mode, { event, phase: 'end' });
      else applyRect(rect, { event, phase: 'end', persist: true, mode });
      lastRect = null;
    };

    const onMove = (event) => {
      if (!active) return;
      lastRect = resizeCreamuWorkbenchRect(
        startRect,
        startPoint,
        getCreamuClientPoint(event),
        mode,
        options.viewport || (typeof window !== 'undefined' ? window : null),
        options.geometryOptions || {}
      );
      applyRect(lastRect, { event, phase: 'move', persist: false, mode });
    };

    const onDown = (event) => {
      if (!isCreamuPrimaryPointer(event) || isDragDisabled(event)) return;
      callCreamuPreventDefault(event);
      callCreamuStopPropagation(event);
      startRect = getStartRect(panel, event);
      startPoint = getCreamuClientPoint(event);
      lastRect = startRect;
      active = true;
      handle.classList?.add('is-dragging');
      panel.classList?.add('is-resizing');
      if (lockBodySelection && body) body.style.userSelect = 'none';
      if (eventType === 'pointer' && typeof handle.setPointerCapture === 'function' && event.pointerId != null) {
        try { handle.setPointerCapture(event.pointerId); } catch (_) { /* ignore */ }
      }
      if (typeof options.onStart === 'function') options.onStart(startRect, mode, { event, phase: 'start' });
      target.addEventListener(moveEvent, onMove, true);
      target.addEventListener(upEvent, finish, true);
      if (cancelEvent) target.addEventListener(cancelEvent, finish, true);
    };

    handle.addEventListener(downEvent, onDown);
    cleanups.push(() => {
      handle.removeEventListener(downEvent, onDown);
      target.removeEventListener(moveEvent, onMove, true);
      target.removeEventListener(upEvent, finish, true);
      if (cancelEvent) target.removeEventListener(cancelEvent, finish, true);
      if (handleDataset) delete handleDataset[handleKey];
    });
  });

  return () => {
    cleanups.forEach((cleanup) => cleanup());
    if (lockBodySelection && body) body.style.userSelect = '';
    if (dataset) delete dataset[boundKey];
  };
}
function normalizeFc2Channel(raw, adult) {
  const id = fc2Id(raw?.id);
  if (!id) return null;
  // id is the room URL identity; cid is not interchangeable with it.
  return {
    id, adult, name: fc2Text(raw.name) || '匿名主播',
    title: fc2Text(raw.title, 500) || '未填写直播标题',
    image: fc2Image(raw.image), category: String(raw.category ?? ''),
    type: Number(raw.type),
    pay: Number(raw.tid) > 0 ? 1 : raw.pay === 0 || raw.pay === 1 ? raw.pay : null,
    access: Number(raw.tid) > 0 ? '需门票'
      : Number(raw.login) === 2 ? '需持有点数'
      : Number(raw.login) === 1 ? '需登录' : '',
    viewers: Math.max(0, Number(raw.count) || 0),
    startedAt: Math.max(0, Number(raw.start_time) || 0),
    lang: fc2Text(raw.lang, 20),
    observed: true
  };
}

async function fetchFc2Channels(adult) {
  const response = await fetch(`${adult ? '/adult' : ''}/contents/allchannellist.php`, {
    method: 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`列表读取失败（HTTP ${response.status}）`);
  const payload = await response.json();
  if (!Array.isArray(payload?.channel)) throw new Error('站点未返回有效的频道列表');
  return [...new Map(payload.channel.map(row => normalizeFc2Channel(row, adult))
    .filter(Boolean).map(row => [row.id, row])).values()];
}

// Directory and workbench share one snapshot/request per area.
const fc2ChannelSnapshots = new Map();
function fc2ChannelSnapshot(adult) {
  if (!fc2ChannelSnapshots.has(adult)) {
    fc2ChannelSnapshots.set(adult, { channels: [], checkedAt: 0, error: '', pending: null });
  }
  return fc2ChannelSnapshots.get(adult);
}

function refreshFc2Channels(adult) {
  const state = fc2ChannelSnapshot(adult);
  if (state.pending) return state.pending;
  state.pending = fetchFc2Channels(adult).then(channels => {
    state.channels = channels;
    state.checkedAt = Date.now();
    state.error = '';
  }).catch(error => {
    state.error = error.message;
  }).finally(() => {
    state.pending = null;
    document.dispatchEvent(new Event('creamu-fc2-channels'));
  });
  document.dispatchEvent(new Event('creamu-fc2-channels'));
  return state.pending;
}

function fc2RoomUrl(channel) {
  return `https://live.fc2.com/${channel.id}/`;
}

function selectFc2Channels(channels, records, filters) {
  const live = new Map(channels.map(channel => [channel.id, channel]));
  const source = filters.view === 'discover'
    ? channels
    : Object.values(records)
      .filter(row => filters.view === 'following' ? row.followed
        : filters.view === 'blocked' ? row.blocked : row.visitedAt > 0)
      .map(row => live.get(row.id) || { ...row, observed: false });
  const query = filters.query.trim().toLocaleLowerCase();
  return source.filter(channel => {
    const record = records[channel.id] || {};
    if (filters.view !== 'blocked' && record.blocked) return false;
    if (query && ![channel.id, channel.title, channel.name, record.note, ...(record.tags || [])]
      .join(' ').toLocaleLowerCase().includes(query)) return false;
    if (filters.category && channel.category !== filters.category) return false;
    if (filters.fee && channel.pay !== Number(filters.fee)) return false;
    if (filters.type && channel.type !== Number(filters.type)) return false;
    if (filters.liveOnly && !channel.observed) return false;
    return true;
  }).sort((a, b) => {
    if (filters.view === 'recent') return (records[b.id]?.visitedAt || 0) - (records[a.id]?.visitedAt || 0);
    if (a.observed !== b.observed) return a.observed ? -1 : 1;
    if (filters.sort === 'new') return (b.startedAt || 0) - (a.startedAt || 0);
    return (b.viewers || 0) - (a.viewers || 0);
  });
}

function readFc2Room() {
  const id = fc2Id(location.pathname.split('/').filter(Boolean)[0]);
  if (!id) return null;
  return {
    id,
    name: fc2Text(document.querySelector('.c-ctbName')?.textContent) || `主播 ${id}`,
    title: fc2Text(document.querySelector('.c-pgTit')?.textContent, 500),
    image: fc2Image(document.querySelector('.m-pgInf img')?.getAttribute('src'))
  };
}
function installFc2Theme() {
  const style = document.createElement('style');
  style.id = 'creamu-fc2-theme';
  style.textContent = `
html.creamu-fc2 {
  --fc-bg:#121313; --fc-panel:#1b1d1d; --fc-raised:#242727;
  --fc-text:#f1eee8; --fc-muted:#b0b5b3; --fc-line:#373c3a;
  --fc-accent:#f3a18c; --fc-ink:#29130e; --fc-green:#a6d3b4;
  background:var(--fc-bg); color-scheme:dark;
}
html.creamu-fc2 body { box-sizing:border-box; margin:0; min-width:0!important; width:100%!important; background:var(--fc-bg)!important; color:var(--fc-text); }
html.creamu-fc2 .l-wp { min-width:0!important; width:100%!important; }
.fc-app, .fc-dialog, .fc-toast, .fc-restore {
  font:14px/1.55 "Segoe UI","Microsoft YaHei",sans-serif;
  color:var(--fc-text,#f1eee8); text-align:left; letter-spacing:normal;
}
.fc-app *, .fc-dialog *, .fc-restore * { box-sizing:border-box; }
.fc-app button, .fc-app input, .fc-app select, .fc-dialog button,
.fc-dialog input, .fc-dialog textarea, .fc-dialog select, .fc-restore button {
  font:inherit; color:inherit; box-sizing:border-box;
}
.fc-app button, .fc-dialog button, .fc-restore button, .fc-link-button {
  display:inline-flex; align-items:center; justify-content:center; gap:6px;
  min-height:40px; padding:8px 13px; border:1px solid var(--fc-line,#373c3a);
  border-radius:8px; background:var(--fc-panel,#1b1d1d); cursor:pointer;
  text-decoration:none; color:var(--fc-text,#f1eee8); line-height:1.3;
  transition:background .15s,border-color .15s;
}
.fc-app button:hover, .fc-dialog button:hover { background:var(--fc-raised); border-color:#6d7772; }
.fc-app button[aria-pressed=true], .fc-app button[aria-current=page], .fc-primary {
  background:var(--fc-accent)!important; color:var(--fc-ink)!important; border-color:transparent!important;
}
.fc-app :focus-visible, .fc-dialog :focus-visible, .fc-restore :focus-visible {
  outline:2px solid var(--fc-accent,#f3a18c); outline-offset:3px;
}
.fc-app button:disabled, .fc-dialog button:disabled { opacity:.55; cursor:wait; }
.fc-app input:not([type=checkbox]):not([type=range]), .fc-app select,
.fc-dialog input:not([type=checkbox]), .fc-dialog textarea, .fc-dialog select {
  width:100%; min-height:42px; border:1px solid var(--fc-line); border-radius:8px;
  padding:9px 12px; background:var(--fc-bg); color:var(--fc-text); box-shadow:none;
}
.fc-app input::placeholder, .fc-dialog input::placeholder { color:var(--fc-muted); opacity:1; }
.fc-app a { color:inherit; text-decoration:none; }
.fc-app h1, .fc-app h2, .fc-app p, .fc-dialog h2, .fc-dialog p { margin:0; }
.fc-header {
  display:flex; align-items:center; gap:24px; padding:16px 32px;
  border-bottom:1px solid var(--fc-line); background:var(--fc-bg); flex-wrap:wrap;
}
.fc-brand { display:flex; align-items:center; gap:12px; flex-shrink:0; }
.fc-brand-mark {
  display:grid; place-items:center; width:36px; height:36px; border-radius:11px 11px 11px 3px;
  background:var(--fc-accent); color:var(--fc-ink); font:bold 24px/1 Georgia,serif;
}
.fc-brand strong { font:600 23px/1.1 Georgia,"Microsoft YaHei",serif; letter-spacing:-.6px; }
.fc-brand small { display:block; color:var(--fc-muted); font-size:10px; letter-spacing:2px; margin-top:4px; }
.fc-header nav { display:flex; gap:8px; flex:1; flex-wrap:wrap; }
.fc-header nav button { background:transparent; border-color:transparent; }
.fc-header-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.fc-site-menu { position:relative; }
.fc-site-menu summary { cursor:pointer; padding:8px; min-height:40px; display:list-item; list-style-position:inside; }
.fc-site-menu > div { position:absolute; top:100%; right:0; z-index:30; min-width:170px; padding:8px; background:var(--fc-panel); border:1px solid var(--fc-line); border-radius:8px; box-shadow:0 8px 24px #0005; }
.fc-site-menu a { display:block; padding:10px; border-radius:5px; }
.fc-site-menu a:hover { background:var(--fc-raised); }
.fc-main { max-width:1920px; margin:auto; padding:30px 32px 64px; }
.fc-heading { display:flex; align-items:end; gap:20px; justify-content:space-between; margin-bottom:22px; }
.fc-eyebrow { color:var(--fc-accent); font-size:11px; letter-spacing:2px; margin-bottom:7px!important; }
.fc-heading h1 { font-size:28px; line-height:1.3; font-weight:650; letter-spacing:-.6px; }
.fc-subtitle { color:var(--fc-muted); margin-top:8px!important; font-size:13px; }
.fc-scope { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.fc-scope a { padding:7px 12px; border:1px solid var(--fc-line); border-radius:30px; color:var(--fc-muted); }
.fc-scope a[aria-current=page] { border-color:var(--fc-accent); color:var(--fc-accent); }
.fc-toolbar { padding:16px; border:1px solid var(--fc-line); border-radius:12px; background:var(--fc-panel); }
.fc-filters { display:grid; grid-template-columns:minmax(200px,1fr) minmax(540px,1.15fr); gap:12px; align-items:end; }
.fc-filter-options > div { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }
.fc-filter-options > summary { display:none; }
.fc-app label, .fc-dialog label { display:block; font-size:12px; color:var(--fc-muted); }
.fc-app label > input, .fc-app label > select, .fc-dialog label > input, .fc-dialog label > textarea { margin-top:5px; }
.fc-more { margin-top:12px; }
.fc-more summary { cursor:pointer; color:var(--fc-muted); }
.fc-more > div { display:flex; gap:18px; align-items:end; padding-top:12px; flex-wrap:wrap; }
.fc-more label { min-width:130px; }
.fc-check { display:flex!important; gap:8px; align-items:center; min-height:42px; }
.fc-check input { margin:0!important; accent-color:var(--fc-accent); }
.fc-results-bar { display:flex; justify-content:space-between; gap:12px; margin:22px 0 14px; color:var(--fc-muted); font-size:12px; }
.fc-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(245px,1fr)); gap:20px; }
.fc-app[data-density=compact] .fc-grid { grid-template-columns:repeat(auto-fill,minmax(195px,1fr)); gap:14px; }
.fc-card { display:flex; flex-direction:column; min-width:0; overflow:hidden; border:1px solid var(--fc-line); border-radius:12px; background:var(--fc-panel); }
.fc-card:hover { border-color:#69756d; }
.fc-card[data-followed=true] { border-color:var(--fc-accent); box-shadow:0 0 0 1px var(--fc-accent); }
.fc-cover { display:block; position:relative; aspect-ratio:16/10; background:#292d2b; overflow:hidden; }
.fc-cover::before { content:"FC2 LIVE"; position:absolute; inset:0; display:grid; place-items:center; color:#a6b0aa; font-size:13px; letter-spacing:3px; }
.fc-cover img { position:relative; display:block; width:100%; height:100%; object-fit:contain; background:#101211; }
.fc-cover-badges { position:absolute; left:10px; right:10px; bottom:10px; display:flex; gap:5px; justify-content:space-between; pointer-events:none; }
.fc-badge { padding:3px 7px; border-radius:4px; background:#171c19; color:#edf2ed; font-size:11px; border:1px solid #4e5e52; }
.fc-badge-live { color:#b7e5c5; }
.fc-visited { position:absolute; top:10px; left:10px; padding:4px 8px; border:1px solid #d7b5a8; border-radius:5px; background:#2b211d; color:#f5c7b6; font-size:11px; line-height:1.5; }
.fc-card-body { flex:1; padding:14px 14px 10px; }
.fc-card-title { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; min-height:44px; font-size:15px; line-height:22px; font-weight:600; overflow-wrap:anywhere; }
.fc-card-name { display:block; color:var(--fc-muted)!important; font-size:12px; margin-top:7px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.fc-card-note { color:var(--fc-accent); font-size:12px; margin-top:8px!important; white-space:pre-wrap; overflow-wrap:anywhere; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.fc-card-tags { display:flex; flex-wrap:wrap; gap:4px; margin-top:9px; }
.fc-card-tags span { color:var(--fc-muted); font-size:11px; padding:2px 6px; background:var(--fc-raised); border-radius:4px; }
.fc-card-actions { padding:0 10px 10px; display:flex; gap:6px; }
.fc-card-actions button { flex:1; min-width:0; min-height:36px; padding:7px 5px; font-size:12px; }
.fc-card-info { display:flex; justify-content:space-between; gap:8px; color:var(--fc-muted); font-size:11px; margin:10px 0 0; }
.fc-empty { grid-column:1/-1; border:1px dashed var(--fc-line); padding:54px 20px; text-align:center; color:var(--fc-muted); border-radius:12px; }
.fc-message { margin:16px 0!important; padding:12px 16px; background:#362920; color:#f4cfad; border:1px solid #7e5c3a; border-radius:8px; }
.fc-message[hidden] { display:none; }
html.creamu-fc2-list .js-head, html.creamu-fc2-list #js-container { display:none!important; }
html.creamu-fc2 .js-foot { background:var(--fc-bg); color:var(--fc-muted); border-top:1px solid var(--fc-line); margin:0; padding:24px; }
html.creamu-fc2 .js-foot a { color:var(--fc-muted); }
.fc-dialog {
  box-sizing:border-box;
  width:min(560px,calc(100vw - 32px)); max-height:85dvh; padding:24px;
  background:var(--fc-panel); border:1px solid var(--fc-line); border-radius:14px; overflow:auto;
}
.fc-dialog::backdrop { background:rgba(0,0,0,.72); }
.fc-dialog h2 { font-size:21px; margin-bottom:8px; }
.fc-dialog p { color:var(--fc-muted); margin-bottom:16px; }
.fc-dialog label { margin:14px 0; }
.fc-dialog textarea { resize:vertical; min-height:100px; }
.fc-dialog-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:20px; justify-content:flex-end; }
.fc-dialog hr { border:0; border-top:1px solid var(--fc-line); margin:22px 0; }
.fc-dialog details summary { cursor:pointer; font-size:16px; }
.fc-dialog-status { white-space:pre-wrap; overflow-wrap:anywhere; font-size:12px; margin-top:12px!important; }
.fc-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); z-index:2147483646; max-width:calc(100vw - 32px); background:#f1eee8; color:#191e1a; padding:12px 20px; border-radius:9px; box-shadow:0 6px 24px #0006; }
.fc-restore { display:flex; gap:16px; align-items:center; justify-content:center; flex-wrap:wrap; padding:12px; background:#1b1d1d; color:#f1eee8; }
html.fc-multiview-open { overflow:hidden; }
#fc-multiview { position:fixed; inset:0; display:flex; flex-direction:column; background:var(--fc-bg); z-index:1000; container:fc-multi / inline-size; }
html.fc-console-docked #fc-multiview { right:var(--fc-dock-width); }
.fc-multi-count { color:var(--fc-muted); font-size:12px; font-weight:400; white-space:nowrap; }
.fc-multi-toolbar { display:grid; grid-template-columns:auto minmax(180px,1fr) auto auto; align-items:center; gap:16px; flex-shrink:0; padding:9px 16px; border-bottom:1px solid var(--fc-line); }
.fc-multi-brand, .fc-multi-options, .fc-multi-actions { display:flex; align-items:center; gap:8px; }
.fc-multi-brand strong { font-size:14px; font-weight:600; white-space:nowrap; }
.fc-multi-brand .fc-brand-mark { width:28px; height:28px; border-radius:8px 8px 8px 3px; font-size:21px; }
.fc-multi-add { display:flex; gap:6px; min-width:0; max-width:380px; margin:0; }
#fc-multiview .fc-multi-toolbar :is(button,input,select,summary) { min-height:34px; padding:6px 9px; font-size:12px; line-height:20px; }
#fc-multiview .fc-multi-add input { flex:1; min-width:0; width:0; }
.fc-multi-add button { flex-shrink:0; white-space:nowrap; }
.fc-multi-toolbar label { display:flex; align-items:center; gap:6px; white-space:nowrap; }
#fc-multiview .fc-multi-toolbar label select { width:auto; margin:0; }
.fc-multi-more > div button { display:block; width:100%; text-align:left; background:transparent; border:0; }
.fc-multi-more > div button:hover { background:var(--fc-raised); }
.fc-multi-quality-actions { display:flex; flex-wrap:wrap; gap:8px; }
.fc-dialog .fc-multi-quality-row { display:grid; grid-template-columns:minmax(0,1fr) minmax(150px,1fr); align-items:center; gap:12px; }
.fc-multi-quality-row span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.fc-dialog .fc-multi-quality-row select { margin:0; }
.fc-multi-scroll { overflow:auto; flex:1; min-height:0; padding:12px 16px 24px; }
@container fc-multi (max-width:850px) {
  .fc-multi-toolbar { grid-template-columns:minmax(0,1fr) auto; gap:8px 12px; }
  .fc-multi-actions { grid-column:2; grid-row:1; justify-content:flex-end; }
  .fc-multi-add { max-width:none; }
  .fc-multi-options { justify-content:flex-end; }
}
@container fc-multi (max-width:480px) {
  .fc-multi-toolbar { padding:8px 12px; gap:8px; }
  .fc-multi-add { grid-column:1/-1; }
  .fc-multi-options { grid-column:1/-1; justify-content:flex-start; }
  #fc-multiview .fc-multi-add input { font-size:16px; }
}
.fc-multi-grid { --fc-multi-header-height:54px; display:grid; grid-template-columns:repeat(var(--fc-multi-columns,1),minmax(0,1fr)); gap:12px; align-items:start; reading-flow:grid-order; }
.fc-multi-grid.is-fit { grid-auto-rows:var(--fc-multi-row-height); align-items:stretch; }
.fc-multi-grid.is-fit .fc-multi-tile { display:flex; flex-direction:column; min-height:0; }
.fc-multi-grid.is-fit .fc-multi-video { flex:1; min-height:0; aspect-ratio:auto; }
.fc-multi-empty { max-width:560px; margin:12vh auto; padding:40px 24px; border:1px dashed var(--fc-line); border-radius:12px; text-align:center; }
.fc-multi-empty strong { font-size:23px; font-weight:500; }
.fc-multi-empty p { margin:12px 0 24px; color:var(--fc-muted); }
.fc-multi-empty[hidden] { display:none; }
.fc-multi-tile { min-width:0; border:1px solid var(--fc-line); border-radius:10px; overflow:hidden; background:#080a09; }
.fc-multi-tile.is-audible { border-color:var(--fc-accent); }
.fc-multi-tile-header { display:flex; align-items:center; gap:8px; height:var(--fc-multi-header-height); flex-shrink:0; padding:8px 10px; background:var(--fc-panel); }
.fc-app .fc-multi-reorder { flex-shrink:0; width:22px; min-height:32px; padding:0; border:0; color:var(--fc-muted); background:transparent; font-size:20px; cursor:grab; touch-action:none; }
.fc-multi-grid.is-reordering { cursor:grabbing; user-select:none; }
.fc-multi-grid.is-reordering video { pointer-events:none; }
.fc-multi-tile.is-reordering { opacity:.65; }
.fc-multi-tile.is-drop-target { outline:2px solid var(--fc-accent); outline-offset:-2px; }
.fc-multi-tile-title { min-width:0; flex:1; }
.fc-multi-tile-title strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; font-weight:600; }
.fc-multi-status { display:block; color:var(--fc-muted); font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.fc-multi-tile-actions { display:flex; align-items:center; gap:4px; flex-shrink:0; }
.fc-multi-tile-actions :is(button,a) { display:inline-flex; align-items:center; justify-content:center; min-height:30px; padding:4px 7px; font-size:12px; line-height:20px; border-radius:6px; }
.fc-multi-tile-actions a:hover { background:var(--fc-raised); }
.fc-multi-video { position:relative; aspect-ratio:16/9; }
.fc-multi-host { position:absolute; inset:0; }
.fc-multi-host .art-control-volume { display:none!important; }
.fc-multi-host .art-video-player { font:12px/1.5 "Segoe UI","Microsoft YaHei",sans-serif; color:var(--fc-text); }
.fc-multi-host .fc-player-button { padding:4px 6px; }
.fc-multi-host .art-control-sound { width:auto; }
@media(max-width:700px) {
  .fc-multi-scroll { padding:12px; }
}
/* The native player and chat nodes keep their owners and event listeners. */
html.creamu-fc2-room .js-head { display:none!important; }
html.creamu-fc2-room .l-wp, html.creamu-fc2-room .l-cont, html.creamu-fc2-room .m-cont-ni { width:100%!important; min-width:0!important; padding-top:0!important; background:var(--fc-bg); }
html.creamu-fc2-room .js-cont > .m-cont-ni { display:flex; flex-direction:column; }
html.creamu-fc2-room .m-info01 { order:0; margin:0; padding:6px 24px; background:#242a29; color:var(--fc-muted); font-size:12px; }
html.creamu-fc2-room .m-info01 a { color:var(--fc-accent); }
html.creamu-fc2-room .fc-room-tools { order:1; }
html.creamu-fc2-room .m-viewPlayer { order:2; margin:0!important; padding:0 24px!important; width:100%!important; box-sizing:border-box; background:var(--fc-bg)!important; }
html.creamu-fc2-room .m-viewTop { order:3; padding:20px 24px!important; margin:0!important; color:var(--fc-text); background:var(--fc-panel)!important; }
html.creamu-fc2-room .m-viewBtm { order:4; padding:20px 24px; color:var(--fc-text); background:var(--fc-panel); }
html.creamu-fc2-room .m-viewPlayer_in { position:relative!important; inset:auto!important; box-sizing:border-box; max-width:none!important; width:100%!important; margin:0!important; padding-bottom:0!important; }
html.creamu-fc2-room #js-player { height:clamp(423px,calc(100dvh - 196px),920px)!important; }
html.creamu-fc2-room #js-livePlayerContainer { display:flex; flex-direction:column; height:100%!important; }
html.creamu-fc2-room #js-livePlayerContainer > .livePlayer { flex:1; min-height:0; height:auto; background:var(--fc-panel); }
html.creamu-fc2-room .livePlayer-operation { flex-shrink:0; color:var(--fc-text); background:var(--fc-panel); padding:0 12px; }
html.creamu-fc2-room .operation_row { border-color:var(--fc-line)!important; }
html.creamu-fc2-room #js-right_area { width:var(--fc-chat-width,340px)!important; color:var(--fc-text); background:var(--fc-panel); }
html.creamu-fc2-room #js-left_area { margin-right:var(--fc-chat-width,340px)!important; }
html.creamu-fc2-room #js-video_area:not(:fullscreen):not(.is-fullScreen) { right:12px; background:#080a09; }
html.creamu-fc2-room #js-video_area:fullscreen { inset:0!important; }
html.creamu-fc2-room .chat_content, html.creamu-fc2-room .chat_display,
html.creamu-fc2-room .chat_tab-control { background:var(--fc-panel)!important; color:var(--fc-text)!important; border-color:var(--fc-line)!important; }
/* The row owns every message surface; native wrappers and interaction states cannot paint white blocks. */
html.creamu-fc2-room .c-chatLines > li {
  --fc-chat-row-bg:var(--fc-panel);
  background:var(--fc-chat-row-bg)!important; color:var(--fc-text);
  border-bottom:1px solid var(--fc-line); padding:8px!important; font-size:14px; line-height:1.5;
}
html.creamu-fc2-room .c-chatLines > li[class*="is-system_"] { --fc-chat-row-bg:#30271f; }
html.creamu-fc2-room .c-chatLines > li:is(.is-system_gift,.is-system_tip) { --fc-chat-row-bg:#38301d; }
html.creamu-fc2-room .c-chatLines > li.is-clicked { --fc-chat-row-bg:#323c37; }
html.creamu-fc2-room .c-chatLines > li.is-sameUser { --fc-chat-row-bg:#23374a; }
html.creamu-fc2-room .c-chatLines > li:hover { box-shadow:inset 0 0 0 1px #68776f; }
html.creamu-fc2-room .c-chatLines > li > :is(.chat-left,.chat-body) {
  background:transparent!important; border-color:transparent!important;
}
html.creamu-fc2-room .c-chatLines .com { color:var(--fc-text); }
html.creamu-fc2-room .c-chatLines .com.black { color:var(--fc-text)!important; }
html.creamu-fc2-room .c-chatLines .nam, html.creamu-fc2-room .c-chatLines .tim,
html.creamu-fc2-room .c-chatLines .uid { color:var(--fc-muted)!important; }
html.creamu-fc2-room .c-chatAdjuster { display:none; }
html.creamu-fc2-room .commentSend { background:var(--fc-panel); color:var(--fc-text); }
html.creamu-fc2-room .commentSend input { background:var(--fc-bg); color:var(--fc-text); border-color:var(--fc-line); }
html.creamu-fc2-room .m-viewBtm .c-bx01, html.creamu-fc2-room .m-viewBtm .c-bx03 { background:var(--fc-panel); border-color:var(--fc-line); color:var(--fc-text); }
html.creamu-fc2-room .m-pgInf_rt, html.creamu-fc2-room .m-viewTop a,
html.creamu-fc2-room .m-viewBtm a { color:var(--fc-text); }
html.creamu-fc2-room .m-viewTop :is(h2,p), html.creamu-fc2-room .m-viewBtm :is(h2,h3,p,dt,dd) { color:var(--fc-text); }
html.creamu-fc2-room .m-viewTop .c-bx03 { background:var(--fc-raised); border-color:var(--fc-line); color:var(--fc-text); }
/* FC2's detail panels and player dialogs have their own light surfaces and gradients. */
html.creamu-fc2-room :is(
  .c-bx05, .chat_tab-content, .recommend, .cover-chat, .panel-login,
  .setting_content, .setting_title, .c-popup_in, .c-modal_content,
  .c-chatTool_content, .c-rightClickMenu, .c-dropUp, .c-dropDown_choise,
  .c-tab-normal_content, .m-tab02, .m-tab03, .m-fter01, .m-fter02, .m-fterGe, .m-fterMdl
) {
  background:var(--fc-panel)!important; background-image:none!important;
  color:var(--fc-text)!important; border-color:var(--fc-line)!important;
}
html.creamu-fc2-room :is(
  #js-amount > div > div, .c-pointView, .m-pfl_tmb, .c-info02.info,
  .c-tab-normal_tab li, .chat_tab-control li, .c-modal_button,
  .setting_item .title
) {
  background:var(--fc-raised)!important; color:var(--fc-text)!important;
  border-color:var(--fc-line)!important;
}
html.creamu-fc2-room :is(
  .c-btn, .c-button, .c-button-op, .setting_buttonGroup button,
  .c-input-text, .c-input_dropDown-101, .c-pgr01_btn, .c-pgr02 a
) {
  background:var(--fc-raised)!important; background-image:none!important;
  color:var(--fc-text)!important; border-color:var(--fc-line)!important;
  text-shadow:none!important;
}
html.creamu-fc2-room :is(.c-btn,.c-button,.c-button-op,.setting_buttonGroup button):hover {
  background:#353d38!important; border-color:#718078!important;
}
html.creamu-fc2-room :is(
  .setting_buttonGroup button.is-active, .c-tab-normal_tab li.is-active,
  .chat_tab-control li.is-active, .c-btnCr, .m-tab02_cr a, .m-tab03_cr a,
  .c-pgr01_crt .c-pgr01_btn
) {
  background:var(--fc-accent)!important; color:var(--fc-ink)!important; border-color:var(--fc-accent)!important;
}
html.creamu-fc2-room :is(
  .recommend_title, .setting_title, .setting_item .title, .c-popup-gift li,
  .c-modal_text, .m-pfl_name, .c-ctbName, .c-pgTit, .c-bx05 h3,
  .c-bx05 dt, .c-bx05 dd, .c-bx05 label, .c-bx05 .fwbd
) { color:var(--fc-text)!important; }
html.creamu-fc2-room :is(.fcl02,.fcl03,.c-detailInfo,.js-foot) { color:var(--fc-muted)!important; }
html.creamu-fc2-room :is(.c-bx05,.c-info02,.recommend,.m-fter01,.m-fter02,.m-fterGe,.m-fterMdl) a { color:var(--fc-accent); }
html.creamu-fc2-room .c-tab01 { border-color:var(--fc-line)!important; }
html.creamu-fc2-room .c-tab01_itm { color:var(--fc-muted)!important; border-color:transparent!important; }
html.creamu-fc2-room :is(.c-tab01_cr,.c-tab01_itm:hover) { color:var(--fc-accent)!important; border-color:var(--fc-accent)!important; }
html.creamu-fc2-room :is(.c-tab-normal_tab,.chat_tab-control) li.is-active a { color:var(--fc-ink)!important; }
html.creamu-fc2-room .m-fterMdl a:hover { background:var(--fc-raised)!important; }
html.creamu-fc2-room :is(.c-bx05,.m-viewTop,.m-viewBtm,.js-foot) :is(input,textarea,select) {
  background:var(--fc-bg)!important; color:var(--fc-text)!important; border-color:var(--fc-line)!important;
}
html.creamu-fc2-room .commentSend input::placeholder { color:var(--fc-muted)!important; opacity:1; }
html.creamu-fc2-room .c-popup-font li.black { color:var(--fc-text)!important; }
html.creamu-fc2-room :is(.c-btn,.c-button,.c-button-op,input,select,textarea):focus-visible { outline:2px solid var(--fc-accent); outline-offset:2px; }
.fc-art-host { position:absolute; inset:0; width:100%; height:100%; container:fc-video / inline-size; }
html.creamu-fc2-room .fc-art-host .art-video { position:absolute!important; inset:0!important; width:100%!important; height:100%!important; z-index:0!important; margin:0!important; object-fit:var(--fc-video-fit,contain); }
html.creamu-fc2-room .fc-art-host .art-video-player { font:14px/1.5 "Segoe UI","Microsoft YaHei",sans-serif; color:#f1eee8; background:transparent; }
.fc-art-host .fc-player-spinner { display:block; width:32px; height:32px; border:3px solid #ffffff30; border-top-color:var(--fc-accent); border-radius:50%; }
.fc-art-host .art-loading-show .fc-player-spinner { animation:fc-player-spin .8s linear infinite; }
@keyframes fc-player-spin { to { transform:rotate(1turn); } }
@media(prefers-reduced-motion:reduce) { .fc-art-host .art-loading-show .fc-player-spinner { animation:none; } }
/* Video stays below FC2's comments (2); controls stay below native permission covers (4–6). */
html.creamu-fc2-room .fc-art-host :is(.art-bottom,.art-mask,.art-loading,.art-settings,.art-notice,.art-contextmenus,.art-info) { z-index:3; }
html.creamu-fc2-room .fc-art-host .art-bottom { background-image:linear-gradient(transparent,#101312eb); background-size:100% 110px; background-repeat:no-repeat; background-position:bottom; padding:20px 12px 6px; box-sizing:border-box; }
html.creamu-fc2-room .fc-art-host .art-video-player:has(:focus-visible) .art-bottom { opacity:1; }
html.creamu-fc2-room .fc-art-host .art-video-player:has(:focus-visible) .art-controls { transform:translateY(0); }
html.creamu-fc2-room .fc-art-host :is(.art-control-live,.art-control-reconnect,.art-control-settings,.art-control-screenshot,.art-control-web,.art-control-fullscreen) { width:auto; flex-shrink:0; }
html.creamu-fc2-room .fc-art-host .art-controls { gap:8px; }
html.creamu-fc2-room .fc-art-host :is(.art-controls-left,.art-controls-right) { gap:8px; }
.fc-art-host .art-control-live { padding:0 6px; }
.fc-player-status { color:#a6d3b4; font-size:12px; white-space:nowrap; }
.fc-player-button { border:0; border-radius:6px; background:transparent; color:#f1eee8; font:inherit; padding:7px 9px; cursor:pointer; white-space:nowrap; }
.fc-player-button:hover { background:#ffffff20; }
.fc-player-button:focus-visible { outline:2px solid #f3a18c; outline-offset:1px; }
html.creamu-fc2-room .fc-art-host .fc-player-menu { right:12px; bottom:62px; width:min(300px,calc(100% - 24px)); max-height:calc(100% - 84px); overflow:auto; padding:16px; border:1px solid var(--fc-line); border-radius:12px; background:#1b1d1df5; box-shadow:0 8px 30px #0007; }
.fc-player-menu [hidden] { display:none!important; }
.fc-player-menu label + label { margin-top:12px; }
.fc-player-menu-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
html.creamu-fc2-room .fc-player-menu button { border:1px solid var(--fc-line); border-radius:8px; padding:8px 12px; min-height:40px; font:inherit; }
.fc-player-menu-mobile { display:none; }
.fc-player-menu p { margin:14px 0 0; font-size:12px; color:var(--fc-muted); }
/* Native controls still receive delegated quality/reload events, but no longer appear or take focus. */
html.creamu-fc2-room .fc-art-active #js-player_controls { display:block!important; visibility:hidden!important; pointer-events:none!important; }
html.creamu-fc2-room .fc-art-active #js-player_controls .c-toolpanel { display:block!important; }
html.creamu-fc2-room .fc-art-active #js-player_controls * { visibility:hidden!important; }
html.creamu-fc2-room .fc-art-active .js-play_cover { display:none!important; }
/* Empty native interaction/loading surfaces must not intercept ArtPlayer's pointer events. */
html.creamu-fc2-room .fc-art-active :is(.js-playerOn,.js-loading-gif,.c-soundOnly) { pointer-events:none; }
html.creamu-fc2-room .fc-art-active :is(#js-comment_canvas,#js-gift_canvas,.c-ply01_cmtBln) { z-index:2; pointer-events:none; }
html.creamu-fc2-room .fc-player-web, html.creamu-fc2-room .fc-art-active:fullscreen { position:fixed!important; inset:0!important; width:100vw!important; height:100dvh!important; z-index:2147483640!important; background:#080a09!important; }
html.fc-player-web-open { overflow:hidden!important; }
html.creamu-fc2-room :is(.fc-player-web,.fc-art-active:fullscreen) #js-liveVideo { width:100%!important; height:100%!important; }
@container fc-video (max-width:700px) {
  html.creamu-fc2-room .fc-art-host :is(.art-controls,.art-controls-left,.art-controls-right) { gap:0; }
  html.creamu-fc2-room .fc-art-host .art-control { min-width:32px; }
  .fc-player-button { padding:8px 5px; font-size:12px; }
  .fc-art-host .art-control-screenshot, .fc-art-host .art-control-reconnect, .fc-art-host .art-control-live { display:none!important; }
  html.creamu-fc2-room .fc-art-host .fc-player-menu { bottom:48px; padding:12px; max-height:calc(100% - 58px); }
  .fc-player-menu-mobile { display:flex; gap:8px; margin-top:12px; }
}
.fc-room-tools { display:flex; gap:14px; align-items:center; flex-wrap:wrap; padding:14px 24px; }
.fc-room-heading { flex:1; min-width:160px; }
.fc-room-heading strong { display:block; font-size:17px; line-height:1.4; overflow-wrap:anywhere; }
.fc-room-heading span { display:block; color:var(--fc-muted); font-size:12px; }
.fc-room-buttons { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.fc-width-control { display:flex!important; align-items:center; gap:8px; }
.fc-width-control input { width:90px; accent-color:var(--fc-accent); }
html.creamu-fc2-room.fc-chat-hidden #js-right_area { display:none!important; }
html.creamu-fc2-room.fc-chat-hidden #js-left_area { margin-right:0!important; }
html.creamu-fc2-room.fc-chat-hidden #js-video_area { right:0; }
html.creamu-fc2-room.fc-cinema .m-viewPlayer { padding:0!important; }
html.creamu-fc2-room.fc-cinema #js-player { height:calc(100dvh - 150px)!important; }
html.creamu-fc2-room:has(:fullscreen) #js-livePlayerContainer,
html.creamu-fc2-room #js-player:fullscreen { height:100dvh!important; }
html.creamu-fc2-room :fullscreen #js-right_area { width:var(--fc-chat-width,340px)!important; }
@media(min-width:1600px) { .fc-grid { grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); } }
@media(max-width:1000px) {
  .fc-header { gap:12px; padding:14px 20px; }
  .fc-header nav { order:3; flex-basis:100%; }
  .fc-header-actions { margin-left:auto; }
  .fc-main { padding:24px 20px 48px; }
  .fc-filters { grid-template-columns:1fr; }
}
@media(max-width:700px) {
  .fc-header { padding:12px 16px; }
  .fc-brand strong { font-size:21px; }
  .fc-header-actions button { padding:8px 10px; }
  .fc-site-menu summary { font-size:12px; padding:10px 4px; }
  .fc-header nav { flex-wrap:nowrap; gap:4px; }
  .fc-header nav button { flex:1; padding:8px 6px; min-height:44px; }
  .fc-main { padding:20px 16px 40px; }
  .fc-heading { align-items:start; flex-direction:column; gap:14px; }
  .fc-heading h1 { font-size:25px; }
  .fc-filters { grid-template-columns:1fr 1fr; }
  .fc-search-label { grid-column:1/-1; }
  .fc-filter-options { display:block; grid-column:1/-1; }
  .fc-filter-options > summary { display:list-item; cursor:pointer; color:var(--fc-muted); padding:6px 0; }
  .fc-filter-options > div { display:grid; grid-template-columns:1fr 1fr; gap:12px; padding-top:12px; }
  .fc-filter-options:not([open]) > div { display:none; }
  .fc-grid, .fc-app[data-density=compact] .fc-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
  .fc-cover { aspect-ratio:4/3; }
  .fc-card-body { padding:10px; }
  .fc-card-title { font-size:14px; }
  .fc-card-actions { flex-wrap:wrap; padding:0 8px 8px; }
  .fc-card-actions button { min-height:44px; }
  .fc-card-actions button:first-child { flex-basis:100%; }
  .fc-cover-badges { left:6px; right:6px; bottom:6px; }
  .fc-badge { font-size:10px; padding:2px 4px; }
  .fc-results-bar { flex-wrap:wrap; }
  .fc-app input:not([type=range]), .fc-app select, .fc-dialog input, .fc-dialog textarea { font-size:16px!important; }
  .fc-room-tools { padding:12px 16px; }
  .fc-room-buttons { gap:6px; }
  .fc-width-control { display:none!important; }
  html.creamu-fc2-room .m-viewPlayer { padding:0!important; }
  html.creamu-fc2-room #js-player, html.creamu-fc2-room.fc-cinema #js-player { height:auto!important; }
  html.creamu-fc2-room #js-livePlayerContainer { height:auto!important; }
  html.creamu-fc2-room #js-livePlayerContainer > .livePlayer { display:flex; flex:initial; flex-direction:column; height:auto!important; min-height:0!important; }
  html.creamu-fc2-room #js-left_area { order:0; width:100%; margin:0!important; height:auto!important; aspect-ratio:16/10; flex-shrink:0; }
  html.creamu-fc2-room #js-video_area { right:0; }
  html.creamu-fc2-room #js-right_area { order:1; float:none; width:100%!important; height:400px!important; margin-top:12px; }
  html.creamu-fc2-room .m-viewTop, html.creamu-fc2-room .m-viewBtm { padding:16px!important; }
  html.creamu-fc2-room .m-viewTop_head { display:flex; flex-direction:column; }
  html.creamu-fc2-room .m-viewTop_lt, html.creamu-fc2-room .m-viewTop_rt { float:none!important; width:100%!important; margin:0!important; }
  html.creamu-fc2-room .m-pgInf { min-width:0; }
  html.creamu-fc2-room .m-pgInf_rt { min-width:0; overflow-wrap:anywhere; }
  html.creamu-fc2-room .operation_row { display:flex; flex-direction:column; height:auto!important; gap:10px; padding:10px 0!important; }
  html.creamu-fc2-room .operation_topLeft { order:0; margin:0!important; width:100%; }
  html.creamu-fc2-room .operation_topRight { order:1; }
  html.creamu-fc2-room .operation_bottomLeft, html.creamu-fc2-room .operation_bottomRight,
  html.creamu-fc2-room .operation_topRight { float:none!important; display:flex; flex-wrap:wrap; gap:8px; }
  html.creamu-fc2-room .commentSend { display:flex; flex-direction:column; gap:8px; }
  html.creamu-fc2-room .commentSend_text { margin:0!important; }
  html.creamu-fc2-room .commentSend input { font-size:16px!important; }
  html.creamu-fc2-room :fullscreen #js-left_area { height:100dvh!important; aspect-ratio:auto; }
  html.creamu-fc2-room :fullscreen #js-right_area { display:none!important; }
}
@media(max-width:359px) { .fc-grid, .fc-app[data-density=compact] .fc-grid { grid-template-columns:1fr; } }
@media(prefers-reduced-motion:reduce) { .fc-app *, .fc-dialog * { transition:none!important; scroll-behavior:auto!important; } }
`;
  document.head.append(style);
}
function fc2El(tag, attributes = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (value == null) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else el.setAttribute(key, String(value));
  }
  el.append(...children.flat().filter(value => value != null));
  return el;
}

function fc2Button(text, onClick, attributes = {}) {
  const button = fc2El('button', { type: 'button', ...attributes, text });
  button.addEventListener('click', onClick);
  return button;
}

let fc2ToastTimer;
function fc2Toast(message) {
  document.getElementById('fc-toast')?.remove();
  const toast = fc2El('div', { id: 'fc-toast', class: 'fc-toast', role: 'status', text: message });
  document.body.append(toast);
  clearTimeout(fc2ToastTimer);
  fc2ToastTimer = setTimeout(() => toast.remove(), 4500);
}

function openFc2Dialog(title, content, actions = []) {
  document.querySelector('.fc-dialog')?.close();
  const previousFocus = document.activeElement;
  const dialog = fc2El('dialog', { class: 'fc-dialog', 'aria-labelledby': 'fc-dialog-title' },
    fc2El('h2', { id: 'fc-dialog-title', text: title }), content,
    fc2El('div', { class: 'fc-dialog-actions' }, actions,
      fc2Button('关闭', () => dialog.close())));
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (previousFocus?.isConnected) previousFocus.focus();
  }, { once: true });
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}

function editFc2Channel(channel) {
  const record = readFc2Library()[channel.id] || {};
  const note = fc2El('textarea', { rows: 4, maxlength: 1000 });
  note.value = record.note || '';
  const tags = fc2El('input', { type: 'text', maxlength: 360, placeholder: '用逗号分隔，例如：游戏, 日语' });
  tags.value = (record.tags || []).join(', ');
  const content = fc2El('div', {},
    fc2El('p', { text: channel.name || `主播 ${channel.id}` }),
    fc2El('label', { text: '私人备注' }, note),
    fc2El('label', { text: '标签（最多 12 个）' }, tags));
  const dialog = openFc2Dialog('记住这位主播', content, [
    fc2Button('保存备注', () => {
      updateFc2Record(channel, { note: note.value, tags: tags.value.split(/[,，]/) });
      dialog.close();
      fc2Toast('备注已保存');
    }, { class: 'fc-primary' })
  ]);
}

function fc2ChannelActions(channel, record = readFc2Library()[channel.id] || {}) {
  return [
    fc2Button(record.followed ? '已关注' : '关注', () => {
      updateFc2Record(channel, { followed: !readFc2Library()[channel.id]?.followed });
    }, { 'aria-pressed': !!record.followed, 'data-action': 'follow', 'data-id': channel.id }),
    fc2Button('备注', () => editFc2Channel(channel), { 'data-action': 'note', 'data-id': channel.id }),
    fc2Button(record.blocked ? '取消屏蔽' : '屏蔽', () => {
      const blocked = !readFc2Library()[channel.id]?.blocked;
      updateFc2Record(channel, { blocked });
      fc2Toast(blocked ? '已屏蔽，可在控制台的黑名单中恢复' : '已取消屏蔽');
    }, { 'data-action': 'block', 'data-id': channel.id })
  ];
}

function fc2NativeMode() {
  setFc2Preferences({ enabled: false });
  location.reload();
}

function fc2Header(navigation) {
  const links = new Map();
  document.querySelectorAll('.js-head a[href], .m-tab01_lst a[href]').forEach(anchor => {
    const url = new URL(anchor.href, location.href);
    const label = fc2Text(anchor.textContent) || fc2Text(anchor.getAttribute('aria-label'));
    if (url.hostname !== 'live.fc2.com' || !label || url.pathname === '/') return;
    links.set(url.href, label);
  });
  const siteMenu = links.size ? fc2El('details', { class: 'fc-site-menu' },
    fc2El('summary', { text: '站点导航' }),
    fc2El('div', {}, [...links].map(([href, text]) => fc2El('a', { href, text })))) : null;
  return fc2El('header', { class: 'fc-header' },
    fc2El('a', { class: 'fc-brand', href: '/', 'aria-label': 'Creamu FC2 Live 首页' },
      fc2El('span', { class: 'fc-brand-mark', 'aria-hidden': 'true', text: 'c' }),
      fc2El('span', {}, fc2El('strong', { text: 'Creamu' }), fc2El('small', { text: 'FC2 LIVE' }))),
    navigation || fc2El('nav', { 'aria-label': '页面导航' },
      fc2El('a', { href: '/', class: 'fc-link-button', text: '返回直播列表' })),
    fc2El('div', { class: 'fc-header-actions' },
      siteMenu,
      !fc2Multiview ? fc2El('a', { class: 'fc-link-button', href: '/?creamu=multi', target: '_blank',
        rel: 'noopener noreferrer', text: '同屏', title: '打开多路观看台' }) : null,
      fc2Button('控制台', () => fc2Workbench.open(), { 'aria-controls': 'fc-wb' }),
      fc2Button('设置', openFc2Settings),
      fc2Button('原站', fc2NativeMode, { title: '切换回原站布局，可随时恢复 Creamu' })));
}

function openFc2Settings() {
  const content = fc2El('div', {},
    fc2El('p', { text: '收藏、备注和屏蔽保存在油猴本地。导出与同步不包含 WebDAV 密码。' }));
  const file = fc2El('input', { type: 'file', accept: '.json,application/json', 'aria-label': '选择 FC2 数据文件' });
  const status = fc2El('p', { class: 'fc-dialog-status', role: 'status' });
  const exportButton = fc2Button('导出 JSON', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportFc2Data(), null, 2)], { type: 'application/json' }));
    const link = fc2El('a', { href: url, download: 'creamu-fc2.json' });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  file.addEventListener('change', async () => {
    const selected = file.files[0];
    if (!selected) return;
    try {
      if (selected.size > 10 * 1024 * 1024) throw new Error('文件超过 10 MB，未导入。');
      importFc2Data(JSON.parse(await selected.text()));
      status.textContent = '导入成功，已按更新时间合并。';
    } catch (error) {
      status.textContent = error.message;
    }
    file.value = '';
  });
  content.append(exportButton, fc2El('label', { text: '导入并合并数据' }, file), status, fc2El('hr'));
  const dav = GM_getValue(FC2_DAV_KEY, {}) || {};
  const fields = {};
  const details = fc2El('details', {}, fc2El('summary', { text: 'WebDAV 同步' }),
    fc2El('p', { text: '复用 Creamu 同步机制，文件为 fc2.vault.json。连接信息仅保存在本机。' }));
  for (const [key, label, type, defaultValue] of [
    ['url', '服务地址（HTTPS）', 'url', ''],
    ['user', '用户名', 'text', ''],
    ['password', '应用密码', 'password', ''],
    ['path', '远端目录', 'text', '/Creamu']
  ]) {
    fields[key] = fc2El('input', { type, autocomplete: 'off' });
    fields[key].value = dav[key] || defaultValue;
    details.append(fc2El('label', { text: label }, fields[key]));
  }
  for (const [key, label] of [['enabled', '启用同步'], ['auto', '自动同步数据变化']]) {
    fields[key] = fc2El('input', { type: 'checkbox' });
    fields[key].checked = dav[key] === true;
    details.append(fc2El('label', { class: 'fc-check' }, fields[key], label));
  }
  const davStatus = fc2El('p', { class: 'fc-dialog-status', role: 'status', text: fc2Sync.statusText() });
  function saveDav() {
    const url = fields.url.value.trim();
    if (url && new URL(url).protocol !== 'https:') throw new Error('请使用 HTTPS WebDAV 地址。');
    GM_setValue(FC2_DAV_KEY, {
      url, user: fields.user.value.trim(), password: fields.password.value,
      path: fields.path.value, enabled: fields.enabled.checked,
      auto: fields.auto.checked, conflict: 'ask'
    });
  }
  for (const [label, operation] of [
    ['保存设置', async () => {}],
    ['测试连接', () => fc2Sync.testConnection()],
    ['立即同步', () => fc2Sync.syncNow({ reason: 'manual' })]
  ]) {
    const button = fc2Button(label, async () => {
      button.disabled = true;
      try {
        saveDav();
        await operation();
        davStatus.textContent = label === '保存设置' ? '设置已保存' : fc2Sync.statusText();
      } catch (error) {
        davStatus.textContent = error.message || '同步失败，请检查连接设置。';
      } finally {
        button.disabled = false;
      }
    });
    details.append(button, ' ');
  }
  details.append(davStatus);
  content.append(details);
  openFc2Dialog('数据与设置', content);
}

function fc2Select(label, options, value, onChange, attributes = {}) {
  const select = fc2El('select', { 'aria-label': label, ...attributes },
    options.map(([key, text]) => fc2El('option', { value: key, text })));
  select.value = value;
  select.addEventListener('change', () => onChange(select.value));
  return fc2El('label', { text: label }, select);
}

function bindFc2VisitLinks(element, channel) {
  function rememberVisit(event) {
    if (!event.target.closest('a') || (event.type === 'auxclick' && event.button !== 1)) return;
    // Let the browser activate the original anchor before a storage update re-renders it.
    setTimeout(() => updateFc2Record(channel, { visitedAt: Date.now() }), 0);
  }
  element.addEventListener('click', rememberVisit);
  element.addEventListener('auxclick', rememberVisit);
}

function createFc2Card(channel, record) {
  const url = fc2RoomUrl(channel);
  const linkAttributes = { href: url, target: '_blank', rel: 'noopener noreferrer' };
  const cover = fc2El('a', { ...linkAttributes, class: 'fc-cover', 'aria-label': `进入 ${channel.name}（新标签页）` });
  if (channel.image) {
    const image = fc2El('img', { src: channel.image, alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
    image.addEventListener('error', () => image.remove(), { once: true });
    cover.append(image);
  }
  const state = channel.observed ? (channel.type === 2 ? '一对一' : '直播中') : '状态未确认';
  const payment = channel.observed
    ? channel.access || (channel.pay === 1 ? '付费' : channel.pay === 0 ? '免费' : '费用未知') : '';
  cover.append(fc2El('div', { class: 'fc-cover-badges' },
    fc2El('span', { class: `fc-badge${channel.observed ? ' fc-badge-live' : ''}`, text: state }),
    payment ? fc2El('span', { class: 'fc-badge', text: payment }) : null));
  if (record.visitedAt) {
    const currentBroadcast = channel.observed && channel.startedAt > 0 && record.visitedAt >= channel.startedAt;
    cover.append(fc2El('span', {
      class: 'fc-visited', text: currentBroadcast ? '本场已看' : '曾访问',
      title: `最近访问：${new Date(record.visitedAt).toLocaleString()}`
    }));
  }
  const card = fc2El('article', { class: 'fc-card', 'data-channel-id': channel.id, 'data-followed': !!record.followed },
    cover,
    fc2El('div', { class: 'fc-card-body' },
      fc2El('a', { ...linkAttributes, class: 'fc-card-title', text: channel.title || '未填写直播标题', title: `${channel.title || '直播间'}（新标签页）` }),
      fc2El('a', { ...linkAttributes, class: 'fc-card-name', text: channel.name, title: `${channel.name} · ${channel.id}（新标签页）` }),
      record.note ? fc2El('p', { class: 'fc-card-note', text: record.note, title: record.note }) : null,
      record.tags?.length ? fc2El('div', { class: 'fc-card-tags' }, record.tags.map(text => fc2El('span', { text }))) : null,
      fc2El('div', { class: 'fc-card-info' },
        fc2El('span', { text: channel.observed ? `${channel.viewers.toLocaleString()} 人在看` : '未出现在本次频道列表' }),
        fc2El('span', { text: FC2_CATEGORIES[channel.category] || (record.visitedAt ? '曾经访问' : '') }))),
    fc2El('div', { class: 'fc-card-actions' }, fc2ChannelActions(channel, record)));
  bindFc2VisitLinks(card, channel);
  return card;
}

function mountFc2Directory() {
  const adult = location.pathname.startsWith('/adult');
  const filters = { view: 'discover', query: '', category: '', fee: '', type: '', sort: 'popular', liveOnly: false };
  const state = fc2ChannelSnapshot(adult);
  const grid = fc2El('div', { class: 'fc-grid', 'aria-label': '频道列表' });
  const title = fc2El('h1', { text: '发现直播' });
  const count = fc2El('span', { role: 'status' });
  const time = fc2El('span');
  const message = fc2El('p', { class: 'fc-message', role: 'status', hidden: '' });
  const nav = fc2El('nav', { 'aria-label': '页面导航' }, fc2El('span', { text: '发现直播' }));
  const app = fc2El('div', { id: 'creamu-fc2', class: 'fc-app', 'data-density': readFc2Preferences().density });
  function render() {
    const focused = document.activeElement;
    const focusId = focused?.dataset.id;
    const focusAction = focused?.dataset.action;
    const records = readFc2Library();
    const selected = selectFc2Channels(state.channels, records, filters);
    count.textContent = `${selected.length} 个频道 / 本次读取 ${state.channels.length} 个`;
    time.textContent = state.checkedAt ? `${adult ? '成人区' : '普通区'} · ${new Date(state.checkedAt).toLocaleTimeString()} 更新` : '尚未读取频道';
    refresh.disabled = !!state.pending;
    refresh.textContent = state.pending ? '读取中…' : '刷新直播';
    grid.setAttribute('aria-busy', String(!!state.pending));
    message.hidden = !state.error;
    message.textContent = state.error
      ? `${state.error}。${state.checkedAt ? '保留上次读取结果；可点击刷新重试。' : '原站列表仍保留在下方；可点击刷新重试。'}` : '';
    if (state.checkedAt) document.documentElement.classList.add('creamu-fc2-list');
    grid.replaceChildren(...selected.map(channel => createFc2Card(channel, records[channel.id] || {})));
    if (!selected.length) grid.append(fc2El('div', { class: 'fc-empty', text:
      state.pending ? '正在读取直播列表…' : '没有符合条件的频道，试试清除筛选。' }));
    if (focusId && focusAction) {
      grid.querySelector(`[data-id="${focusId}"][data-action="${focusAction}"]`)?.focus({ preventScroll: true });
    }
  }
  const search = fc2El('input', { type: 'search', placeholder: '搜索标题、主播、备注或标签', 'aria-label': '搜索直播' });
  search.addEventListener('input', () => { filters.query = search.value; render(); });
  const selects = [
    fc2Select('分类', [['', '全部分类'], ...Object.entries(FC2_CATEGORIES)], '', value => { filters.category = value; render(); }),
    fc2Select('费用', [['', '全部费用'], ['0', '免费'], ['1', '付费']], '', value => { filters.fee = value; render(); }),
    fc2Select('排序', [['popular', '观看人数'], ['new', '最近开播']], 'popular', value => { filters.sort = value; render(); }),
    fc2Select('卡片密度', [['comfortable', '舒适'], ['compact', '紧凑']], readFc2Preferences().density, value => {
      setFc2Preferences({ density: value }); app.dataset.density = value;
    })
  ];
  const filterOptions = fc2El('details', { class: 'fc-filter-options' },
    fc2El('summary', { text: '分类、费用与排序' }), fc2El('div', {}, selects));
  const narrowScreen = matchMedia('(max-width:700px)');
  const sizeFilters = () => { filterOptions.open = !narrowScreen.matches; };
  narrowScreen.addEventListener('change', sizeFilters);
  sizeFilters();
  const liveOnly = fc2El('input', { type: 'checkbox' });
  liveOnly.addEventListener('change', () => { filters.liveOnly = liveOnly.checked; render(); });
  const program = fc2Select('节目类型', [['', '全部类型'], ['1', '直播'], ['2', '一对一']], '', value => { filters.type = value; render(); });
  const clear = fc2Button('清除筛选', () => {
    Object.assign(filters, { query: '', category: '', fee: '', type: '', liveOnly: false });
    search.value = '';
    liveOnly.checked = false;
    [selects[0], selects[1], program].forEach(label => { label.querySelector('select').value = ''; });
    render();
  });
  const refresh = fc2Button('刷新直播', () => refreshFc2Channels(adult));
  const scope = fc2El('div', { class: 'fc-scope' },
    fc2El('a', { href: '/', text: '普通区', 'aria-current': adult ? null : 'page' }),
    fc2El('a', { href: '/adult/', text: '成人区', 'aria-current': adult ? 'page' : null }), refresh);
  app.append(fc2Header(nav),
    fc2El('main', { class: 'fc-main' },
      fc2El('div', { class: 'fc-heading' },
        fc2El('div', {}, fc2El('p', { class: 'fc-eyebrow', text: 'YOUR LIVE DIRECTORY' }), title,
          fc2El('p', { class: 'fc-subtitle', text: '找到想看的直播，记住值得再见的主播。' })), scope),
      fc2El('section', { class: 'fc-toolbar', 'aria-label': '筛选直播' },
        fc2El('div', { class: 'fc-filters' }, fc2El('label', { class: 'fc-search-label', text: '搜索' }, search), filterOptions),
        fc2El('details', { class: 'fc-more' }, fc2El('summary', { text: '更多筛选' }),
          fc2El('div', {}, program, fc2El('label', { class: 'fc-check' }, liveOnly, '仅本次确认在线'), clear))),
      message, fc2El('div', { class: 'fc-results-bar' }, count, time), grid));
  document.querySelector('.js-wrap')?.before(app);
  if (!app.isConnected) document.body.prepend(app);
  document.documentElement.classList.add('creamu-fc2');
  document.addEventListener('creamu-fc2-library', render);
  document.addEventListener('creamu-fc2-channels', render);
  render();
  void refreshFc2Channels(adult);
}
let fc2Workbench;

function createFc2LibraryRow(channel, record) {
  const link = { href: fc2RoomUrl(channel), target: '_blank', rel: 'noopener noreferrer' };
  const cover = fc2El('a', { ...link, class: 'jlc-wb-cover', 'aria-label': `进入 ${channel.name}（新标签页）` },
    fc2El('span', { class: 'fc-library-placeholder', text: 'LIVE', 'aria-hidden': 'true' }));
  if (channel.image) {
    const image = fc2El('img', { src: channel.image, alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
    image.addEventListener('error', () => image.remove(), { once: true });
    cover.append(image);
  }
  const current = fc2Id(location.pathname.split('/')[1]) === channel.id;
  const info = [
    channel.observed ? `${channel.viewers.toLocaleString()} 人在看` : '',
    channel.observed ? channel.access || (channel.pay === 1 ? '付费' : channel.pay === 0 ? '免费' : '费用未知') : '',
    current ? '当前房间' : '',
    record.visitedAt ? `${new Date(record.visitedAt).toLocaleString()} 访问` : ''
  ].filter(Boolean).join(' · ');
  const actions = fc2ChannelActions(channel, record);
  if (fc2Multiview) actions.unshift(fc2Button(fc2Multiview.has(channel.id) ? '已在同屏' : '加入同屏', () => fc2Multiview.add(channel),
    { disabled: fc2Multiview.has(channel.id) ? '' : null }));
  actions.forEach(button => { button.className = 'jlc-wb-btn ghost'; });
  const row = fc2El('article', { class: 'jlc-wb-item fc-library-item', 'data-channel-id': channel.id,
    'aria-current': current ? 'page' : null, 'data-followed': !!record.followed },
    fc2El('div', { class: 'jlc-wb-item-row' }, cover,
      fc2El('div', { class: 'jlc-wb-item-body' },
        fc2El('div', { class: 'jlc-wb-item-title-row' },
          fc2El('a', { ...link, class: 'jlc-wb-item-title fc-library-title',
            text: channel.title || channel.name, title: `${channel.title || channel.name}（新标签页）` }),
          fc2El('span', { class: 'jlc-wb-leaf fc-library-status', 'data-live': !!channel.observed,
            text: channel.observed ? channel.type === 2 ? '一对一' : '直播中' : '状态未确认' })),
        fc2El('a', { ...link, class: 'fc-library-name', text: `${channel.name} · ${channel.id}` }),
        info ? fc2El('p', { class: 'fc-library-meta', text: info, title: info }) : null)),
    record.note ? fc2El('p', { class: 'fc-library-note', text: record.note, title: record.note }) : null,
    record.tags?.length ? fc2El('div', { class: 'fc-library-tags' }, record.tags.map(text => fc2El('span', { text }))) : null,
    fc2El('div', { class: 'jlc-wb-item-actions' }, actions));
  bindFc2VisitLinks(row, channel);
  return row;
}

function mountFc2Workbench() {
  const storageKey = 'creamu_fc2_workbench';
  const saved = GM_getValue(storageKey, {}) || {};
  const views = { following: '我的关注', recent: '最近访问', blocked: '黑名单' };
  const filters = { view: Object.hasOwn(views, saved.view) ? saved.view : 'following',
    query: '', category: '', fee: '', type: '', sort: 'popular', liveOnly: false };
  let adult = location.pathname.startsWith('/adult')
    || readFc2Library()[fc2Id(location.pathname.split('/')[1])]?.adult === true;
  let previousFocus;
  let rect = saved.rect;
  let panelMode = saved.panelMode === 'dock' ? 'dock' : 'float';
  let dockWidth = 0;
  const root = document.documentElement;
  const batchSize = 40;
  let visibleCount = batchSize;
  let selectedChannels = [];
  let currentRecords = {};
  let renderedSignature = '';
  const narrow = matchMedia('(max-width:820px)');
  const geometryOptions = { minWidth: 360, minHeight: 320 };
  const save = changes => GM_setValue(storageKey, { ...GM_getValue(storageKey, {}), ...changes });
  injectCreamuWorkbenchStyles({
    styleId: 'fc-workbench-theme', panelSelector: '#fc-wb', fabSelector: '#fc-wb-fab',
    extraCss: `
      #fc-wb, #fc-wb-fab {
        --creamu-wb-bg:var(--fc-bg); --creamu-wb-surface:var(--fc-panel); --creamu-wb-surface-soft:var(--fc-panel);
        --creamu-wb-surface-muted:var(--fc-raised); --creamu-wb-surface-raised:var(--fc-panel);
        --creamu-wb-text:var(--fc-text); --creamu-wb-text-strong:var(--fc-text); --creamu-wb-title:var(--fc-text);
        --creamu-wb-text-muted:var(--fc-muted); --creamu-wb-text-subtle:var(--fc-muted); --creamu-wb-secondary-ink:var(--fc-muted);
        --creamu-wb-border:var(--fc-line); --creamu-wb-border-strong:#69756d; --creamu-wb-divider:var(--fc-line);
        --creamu-wb-accent:var(--fc-accent); --creamu-wb-accent-hover:#f6b5a4; --creamu-wb-on-accent:var(--fc-ink);
        --creamu-wb-control-radius:8px; --creamu-wb-panel-radius:16px; --creamu-wb-card-radius:10px;
        --creamu-wb-control-elevation:none; --creamu-wb-card-elevation:none;
        --creamu-wb-card-border:var(--fc-line); --creamu-wb-card-hover-border:#69756d;
        --creamu-wb-card-hover-elevation:none;
        color-scheme:dark; font:14px/1.5 "Segoe UI","Microsoft YaHei",sans-serif;
      }
      #fc-wb { min-width:0; box-shadow:0 18px 60px #0006,0 2px 8px #0003; z-index:2147483642; text-align:left; }
      html.fc-console-docked body { padding-right:var(--fc-dock-width)!important; }
      html.fc-console-docked .fc-filters { grid-template-columns:1fr; }
      #fc-wb.is-docked {
        left:auto!important; right:0!important; top:0!important; bottom:0!important;
        width:var(--fc-dock-width)!important; height:100dvh!important; border-radius:0;
        border-width:0 0 0 1px; box-shadow:none;
      }
      #fc-wb.is-docked .jlc-wb-header { cursor:default; }
      #fc-wb.is-docked :is(.jlc-wb-resize-w,.jlc-wb-resize-h,.jlc-wb-resize-corner) { display:none; }
      #fc-wb :is(h2,p) { margin:0; }
      #fc-wb :is(button,input,select) { font-family:inherit; box-sizing:border-box; margin:0; }
      #fc-wb button { min-width:0; min-height:0; width:auto; height:auto; text-transform:none; letter-spacing:normal; }
      #fc-wb a { color:inherit; text-decoration:none; }
      #fc-wb a:hover { color:var(--creamu-wb-accent); }
      #fc-wb :focus-visible, #fc-wb-fab:focus-visible { outline:2px solid var(--creamu-wb-accent); outline-offset:2px; }
      #fc-wb-fab {
        width:auto; min-width:112px; height:44px; padding:0 14px 0 9px; gap:9px;
        border:1px solid var(--creamu-wb-border)!important; border-radius:12px;
        background:var(--creamu-wb-surface)!important; color:var(--creamu-wb-text)!important;
        box-shadow:0 4px 20px #0005!important; z-index:2147483641; font-size:13px; font-weight:600;
      }
      #fc-wb-fab .fc-brand-mark { width:30px; height:30px; border-radius:9px 9px 9px 3px; background:var(--creamu-wb-accent); color:var(--fc-ink); font-size:23px; }
      #fc-wb-fab.is-panel-open { visibility:hidden; pointer-events:none; }
      #fc-wb .jlc-wb-header { padding:20px 20px 16px; gap:12px; background:var(--creamu-wb-surface); }
      #fc-wb .jlc-wb-title { font-size:18px; line-height:1.3; font-weight:600; letter-spacing:0; }
      #fc-wb .jlc-wb-subtitle { font-size:11px; letter-spacing:.6px; margin-top:5px; }
      #fc-wb .jlc-wb-header-actions { flex-wrap:nowrap; gap:6px; }
      #fc-wb .jlc-wb-header-actions .jlc-wb-btn { font-size:12px; line-height:18px; padding:7px 9px; }
      #fc-wb .jlc-wb-header-actions button:disabled { opacity:.45; cursor:default; }
      #fc-wb .jlc-wb-btn { display:inline-flex; align-items:center; justify-content:center; padding:8px 10px; border-radius:8px; }
      #fc-wb :is(.jlc-wb-btn,.jlc-wb-icon-btn):hover { background:var(--fc-raised); border-color:#69756d; }
      #fc-wb .jlc-wb-icon-btn { width:36px; height:36px; border-radius:8px; }
      #fc-wb .jlc-wb-nav { padding:0 20px; gap:24px; background:var(--creamu-wb-surface); border-bottom:1px solid var(--creamu-wb-divider); }
      #fc-wb .jlc-wb-nav button { flex:0 1 auto; padding:12px 2px; border-radius:0; background:transparent; border-bottom:2px solid transparent; font-size:14px; font-weight:600; }
      #fc-wb .jlc-wb-nav button.active { background:transparent; color:var(--creamu-wb-accent); border-bottom-color:var(--creamu-wb-accent); box-shadow:none; }
      #fc-wb .fc-library-count { font-size:11px; margin-left:5px; font-weight:400; }
      #fc-wb .fc-library-toolbar { display:grid; grid-template-columns:minmax(0,1fr); gap:10px; padding:14px 16px 12px; flex-shrink:0; }
      #fc-wb .jlc-wb-search { width:100%; padding:9px 12px; border-radius:8px; font-size:13px; line-height:20px; }
      #fc-wb .jlc-wb-search::placeholder { color:var(--creamu-wb-text-muted); opacity:1; }
      #fc-wb .fc-library-filters { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
      #fc-wb .fc-library-filters select { color-scheme:dark; width:auto; min-width:0; padding:7px 8px; border:1px solid var(--creamu-wb-border); border-radius:8px; font-size:12px; line-height:18px; }
      #fc-wb .fc-library-filters .jlc-wb-btn { margin-left:auto; font-size:12px; line-height:18px; padding:7px 9px; }
      #fc-wb .fc-library-check { display:flex; align-items:center; gap:5px; font-size:12px; color:var(--creamu-wb-text-muted); white-space:nowrap; cursor:pointer; }
      #fc-wb .fc-library-check input { width:14px; height:14px; accent-color:var(--creamu-wb-accent); }
      #fc-wb .fc-library-summary { padding:0 16px 10px; color:var(--creamu-wb-text-muted); font-size:11px; }
      #fc-wb .fc-library-list { overflow:auto; flex:1; min-height:0; padding:0 16px 20px; overscroll-behavior:contain; }
      #fc-wb .fc-library-more { display:block; margin:10px auto 0; }
      #fc-wb .fc-library-item { padding:12px; margin-bottom:8px; cursor:default; }
      #fc-wb .fc-library-item[aria-current=page] { border-color:#8f6a5f; }
      #fc-wb .fc-library-item[data-followed=true] { border-color:var(--fc-accent); box-shadow:inset 0 0 0 1px var(--fc-accent); }
      #fc-wb .jlc-wb-item-row { align-items:flex-start; gap:10px; }
      #fc-wb .jlc-wb-cover { width:64px; height:48px; border-radius:7px; }
      #fc-wb .jlc-wb-cover img { position:absolute; inset:0; object-fit:contain; background:var(--creamu-wb-surface-muted); }
      #fc-wb .fc-library-placeholder { font-size:10px; letter-spacing:1px; color:var(--creamu-wb-text-muted); }
      #fc-wb .jlc-wb-item-title-row { gap:6px; }
      #fc-wb .jlc-wb-item-title { font-size:14px; font-weight:600; line-height:1.45; }
      #fc-wb .fc-library-status { max-width:none; padding:2px 5px; border-radius:4px; font-size:10px; font-weight:400; }
      #fc-wb .fc-library-status[data-live=true] { background:#24382b; color:var(--fc-green); }
      #fc-wb .fc-library-name { display:block; font-size:12px; color:var(--creamu-wb-text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      #fc-wb .fc-library-meta { margin-top:3px; font-size:11px; color:var(--creamu-wb-text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      #fc-wb .fc-library-note { font-size:12px; margin-top:7px; color:var(--creamu-wb-accent); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; overflow-wrap:anywhere; }
      #fc-wb .fc-library-tags { display:flex; flex-wrap:wrap; gap:5px; margin-top:6px; }
      #fc-wb .fc-library-tags span { padding:1px 5px; border-radius:4px; font-size:10px; background:var(--creamu-wb-surface-muted); }
      #fc-wb .jlc-wb-item-actions { margin-top:8px; gap:6px; }
      #fc-wb .jlc-wb-item-actions .jlc-wb-btn { flex:none; min-width:0; padding:5px 9px; font-size:12px; line-height:18px; border-color:var(--creamu-wb-border); }
      #fc-wb .jlc-wb-item-actions [aria-pressed=true] { color:var(--creamu-wb-accent); background:#30231f; border-color:#875c4f; }
      #fc-wb .fc-library-error { color:#f4cfad; padding:0 16px 10px; font-size:12px; }
      #fc-wb .jlc-wb-empty { background:var(--fc-panel); border-color:var(--fc-line); border-radius:10px; }
      #fc-wb [hidden] { display:none!important; }
      @media(max-width:820px) {
        #fc-wb { height:86dvh!important; max-height:calc(100dvh - 16px); padding-bottom:env(safe-area-inset-bottom); }
        #fc-wb .jlc-wb-resize-w, #fc-wb .jlc-wb-resize-h, #fc-wb .jlc-wb-resize-corner { display:none; }
        #fc-wb .jlc-wb-header { padding:16px; }
        #fc-wb .jlc-wb-nav { padding:0 16px; gap:20px; }
        #fc-wb .jlc-wb-search { font-size:16px; }
        #fc-wb .jlc-wb-item-actions .jlc-wb-btn { min-height:34px; }
      }
    `
  });
  const fab = fc2El('button', { id: 'fc-wb-fab', type: 'button', title: '打开控制台 · 拖动可调整位置',
    'aria-label': '打开 FC2 控制台', 'aria-controls': 'fc-wb', 'aria-expanded': 'false' },
    fc2El('span', { class: 'fc-brand-mark', text: 'c', 'aria-hidden': 'true' }),
    fc2El('span', { text: '控制台' }));
  const list = fc2El('div', { class: 'fc-library-list', 'aria-label': '控制台频道' });
  const items = fc2El('div', { class: 'fc-library-items' });
  const more = fc2Button('显示更多', () => {
    visibleCount += batchSize;
    renderItems();
  }, { class: 'jlc-wb-btn ghost fc-library-more' });
  list.append(items, more);
  const summary = fc2El('p', { class: 'fc-library-summary', role: 'status' });
  const error = fc2El('p', { class: 'fc-library-error', role: 'status', hidden: '' });
  const nav = fc2El('nav', { class: 'jlc-wb-nav', 'aria-label': '控制台分类' });
  const closeButton = fc2Button('×', close, { class: 'jlc-wb-icon-btn', 'aria-label': '最小化控制台' });
  const modeButton = fc2Button('并排', () => {
    panelMode = panelMode === 'dock' ? 'float' : 'dock';
    save({ panelMode });
    applyGeometry();
  }, { class: 'jlc-wb-btn ghost', 'aria-label': '切换为并排停靠' });
  const header = fc2El('div', { class: 'jlc-wb-header', title: '拖动标题栏移动控制台，拖动边缘调整大小' },
    fc2El('div', {}, fc2El('h2', { class: 'jlc-wb-title', id: 'fc-wb-title', text: '控制台' }),
      fc2El('p', { class: 'jlc-wb-subtitle', text: 'FC2 LIVE · 关注与记录' })),
    fc2El('div', { class: 'jlc-wb-header-actions' },
      modeButton,
      fc2Button('设置', openFc2Settings, { class: 'jlc-wb-btn ghost', 'aria-label': '控制台数据与设置' }), closeButton));
  const search = fc2El('input', { type: 'search', class: 'jlc-wb-search',
    placeholder: '搜索主播、ID、标题、备注或标签', 'aria-label': '搜索控制台' });
  search.addEventListener('input', () => { filters.query = search.value; resetList(); render(); });
  const scope = fc2Select('查询直播区域', [['normal', '普通区'], ['adult', '成人区']], adult ? 'adult' : 'normal', value => {
    adult = value === 'adult';
    resetList();
    render();
    void refreshFc2Channels(adult);
  }).querySelector('select');
  const refresh = fc2Button('刷新状态', () => refreshFc2Channels(adult), { class: 'jlc-wb-btn ghost' });
  const liveOnly = fc2El('input', { type: 'checkbox' });
  liveOnly.addEventListener('change', () => { filters.liveOnly = liveOnly.checked; resetList(); render(); });
  const panel = fc2El('section', { id: 'fc-wb', role: 'dialog', 'aria-modal': 'false',
    'aria-labelledby': 'fc-wb-title', tabindex: '-1' },
    ['w', 'h', 'corner'].map(direction => fc2El('div', { class: `jlc-wb-resize-${direction}`, 'aria-hidden': 'true' })),
    header, nav, fc2El('div', { class: 'fc-library-toolbar' }, search,
      fc2El('div', { class: 'fc-library-filters' }, scope,
        fc2El('label', { class: 'fc-library-check', title: '仅显示本次查询确认在线的直播' },
          liveOnly, fc2El('span', { text: '仅在线' })), refresh)),
    summary, error, list);
  liveOnly.setAttribute('aria-label', '仅显示本次确认在线');
  document.body.append(panel, fab);
  for (const [view, label] of Object.entries(views)) {
    nav.append(fc2Button(label, () => {
      filters.view = view;
      save({ view });
      resetList();
      render();
    }, { 'data-view': view, 'aria-label': label }));
    nav.lastElementChild.append(fc2El('span', { class: 'fc-library-count', 'aria-hidden': 'true' }));
  }
  function applyGeometry() {
    const fullscreen = !!document.fullscreenElement || root.classList.contains('fc-player-web-open');
    const canDock = innerWidth >= 1180 && !fullscreen;
    const docked = panel.classList.contains('is-open') && panelMode === 'dock' && canDock;
    const nextWidth = docked ? Math.round(Math.min(440, Math.max(360, innerWidth * .3))) : 0;
    panel.classList.toggle('is-docked', docked);
    root.classList.toggle('fc-console-docked', docked);
    modeButton.disabled = !canDock;
    modeButton.textContent = panelMode === 'dock' ? '浮窗' : '并排';
    modeButton.setAttribute('aria-label', panelMode === 'dock' ? '切换为自由浮窗' : '切换为并排停靠');
    modeButton.title = !canDock ? fullscreen ? '全屏时暂用浮窗，退出后恢复' : '窗口宽度不足 1180px，暂用浮窗'
      : panelMode === 'dock' ? '切换为可拖动、缩放的自由浮窗' : '停靠右侧，与当前页面并排浏览';
    header.title = docked ? '控制台已停靠右侧' : narrow.matches ? '控制台'
      : '拖动标题栏移动控制台，拖动边缘调整大小';
    // Keep the saved floating rectangle independent of dock/fullscreen/viewport geometry.
    if (!docked && !narrow.matches) applyCreamuInteractionRect(panel, clampCreamuWorkbenchRect(rect, window, geometryOptions));
    if (nextWidth !== dockWidth) {
      dockWidth = nextWidth;
      root.style.setProperty('--fc-dock-width', `${dockWidth}px`);
      // FC2 owns its video/canvas dimensions. Notify only an actual content-width change.
      window.dispatchEvent(new Event('resize'));
    }
  }
  function open() {
    previousFocus = document.activeElement;
    panel.classList.add('is-open');
    applyGeometry();
    fab.classList.add('is-panel-open');
    fab.setAttribute('aria-expanded', 'true');
    render();
    closeButton.focus({ preventScroll: true });
    if (!fc2ChannelSnapshot(adult).checkedAt) void refreshFc2Channels(adult);
  }
  function close() {
    panel.classList.remove('is-open');
    applyGeometry();
    fab.classList.remove('is-panel-open');
    fab.setAttribute('aria-expanded', 'false');
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  function resetList() {
    visibleCount = batchSize;
    list.scrollTop = 0;
  }
  function renderItems() {
    const visible = selectedChannels.slice(0, visibleCount);
    const signature = JSON.stringify([filters.view, !!filters.query, filters.liveOnly,
      visible.map(channel => fc2Multiview?.has(channel.id)),
      visible.map(channel => [channel, currentRecords[channel.id]])]);
    if (signature !== renderedSignature) {
      const focused = document.activeElement;
      const focusId = focused?.dataset.id;
      const action = focused?.dataset.action;
      const scroll = list.scrollTop;
      // Retain rows already on screen when only more results are appended or one record changes.
      const existing = new Map([...items.children].map(row => [row.dataset.channelId, row]));
      let cursor = items.firstChild;
      for (const channel of visible) {
        const record = currentRecords[channel.id] || {};
        const rowSignature = JSON.stringify([channel, record, fc2Multiview?.has(channel.id)]);
        let row = existing.get(channel.id);
        existing.delete(channel.id);
        if (!row || row.fc2Signature !== rowSignature) {
          row = createFc2LibraryRow(channel, record);
          row.fc2Signature = rowSignature;
        }
        if (row !== cursor) items.insertBefore(row, cursor);
        else cursor = cursor.nextSibling;
      }
      while (cursor) {
        const next = cursor.nextSibling;
        cursor.remove();
        cursor = next;
      }
      for (const row of existing.values()) row.remove();
      if (!visible.length) items.replaceChildren(fc2El('p', { class: 'jlc-wb-empty', text: filters.query || filters.liveOnly
        ? '没有符合筛选的记录。' : filters.view === 'following' ? '在直播卡片或房间中关注主播，会收在这里。'
          : filters.view === 'recent' ? '访问直播间后，记录会出现在这里。' : '黑名单为空。屏蔽的主播可在这里恢复。' }));
      renderedSignature = signature;
      list.scrollTop = scroll;
      if (focusId && action) items.querySelector(`[data-id="${focusId}"][data-action="${action}"]`)?.focus({ preventScroll: true });
    }
    more.hidden = visible.length >= selectedChannels.length;
    more.textContent = `显示更多 · 还有 ${Math.max(0, selectedChannels.length - visible.length)} 个`;
  }
  function render() {
    if (!panel.classList.contains('is-open')) return;
    const state = fc2ChannelSnapshot(adult);
    const records = readFc2Library();
    selectedChannels = selectFc2Channels(state.channels, records, filters);
    currentRecords = records;
    for (const button of nav.querySelectorAll('button')) {
      const view = button.dataset.view;
      const count = Object.values(records).filter(row => view === 'blocked' ? row.blocked
        : !row.blocked && (view === 'following' ? row.followed : row.visitedAt > 0)).length;
      button.querySelector('.fc-library-count').textContent = count;
      button.classList.toggle('active', view === filters.view);
      button.setAttribute('aria-pressed', String(view === filters.view));
    }
    refresh.disabled = !!state.pending;
    refresh.textContent = state.pending ? '读取中…' : '刷新状态';
    const region = adult ? '成人区' : '普通区';
    summary.textContent = `${selectedChannels.length} 个频道 · ${region}${state.checkedAt
      ? ` ${new Date(state.checkedAt).toLocaleTimeString()} 更新` : '状态尚未读取'}`;
    error.hidden = !state.error;
    error.textContent = state.error ? `${state.error}。本地记录仍可使用，点击刷新状态重试。` : '';
    list.setAttribute('aria-busy', String(!!state.pending));
    renderItems();
  }
  const moreObserver = new IntersectionObserver(entries => {
    if (panel.classList.contains('is-open') && !more.hidden && entries.some(entry => entry.isIntersecting)) more.click();
  }, { root: list, rootMargin: '0px 0px 200px 0px' });
  moreObserver.observe(more);
  window.addEventListener('pagehide', event => { if (!event.persisted) moreObserver.disconnect(); }, { once: true });
  const interaction = {
    geometryOptions, isDragDisabled: () => narrow.matches || panel.classList.contains('is-docked'), lockBodySelection: true,
    applyRect(next, context) {
      rect = next;
      applyCreamuInteractionRect(panel, rect);
      if (context.persist) save({ rect });
    }
  };
  bindCreamuWorkbenchDrag(panel, { ...interaction, header, shouldIgnoreDrag: event => !!event.target.closest('button') });
  bindCreamuWorkbenchResize(panel, interaction);
  bindCreamuFabDrag(fab, {
    getInitialPosition: () => clampCreamuWorkbenchPoint(saved.fab, { width: fab.offsetWidth, height: fab.offsetHeight }, window),
    savePosition: point => save({ fab: point }), isDragDisabled: () => narrow.matches,
    onActivate: () => panel.classList.contains('is-open') ? close() : open(),
    onViewportChange: () => {
      const point = clampCreamuWorkbenchPoint(getCreamuInteractionRect(fab), { width: fab.offsetWidth, height: fab.offsetHeight }, window);
      applyCreamuInteractionRect(fab, point);
      applyGeometry();
    }
  });
  panel.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    close();
  });
  // Keep controls reachable in the browser's native fullscreen top layer.
  document.addEventListener('fullscreenchange', () => {
    const parent = document.fullscreenElement || document.body;
    parent.append(panel, fab);
    applyGeometry();
  });
  document.addEventListener('creamu-fc2-library', render);
  document.addEventListener('creamu-fc2-channels', render);
  document.addEventListener('creamu-fc2-multiview', render);
  fc2Workbench = { open };
}
let fc2Multiview = null;

function mountFc2Multiview() {
  const storageKey = 'creamu_fc2_multiview';
  const saved = GM_getValue(storageKey, {}) || {};
  const rooms = new Map();
  const tiles = new Map();
  let columns = ['1', '2', '3', '4'].includes(saved.columns) ? saved.columns : 'auto';
  let audible = '';
  let layoutColumns = 1;
  let drag = null;
  let dragFrame = 0;
  let qualityView = null;
  const root = document.documentElement;
  root.classList.add('creamu-fc2', 'fc-multiview-open');
  const save = () => GM_setValue(storageKey, { rooms: [...rooms.values()], columns });
  const count = fc2El('span', { class: 'fc-multi-count', role: 'status' });
  const grid = fc2El('div', { class: 'fc-multi-grid', role: 'list', 'aria-label': '多路直播' });
  const empty = fc2El('div', { class: 'fc-multi-empty' },
    fc2El('strong', { text: '把想看的直播放在一起' }),
    fc2El('p', { text: '输入房间链接或 ID，或从控制台的关注与最近访问中加入。' }),
    fc2Button('从关注与记录中添加', () => fc2Workbench.open()));
  const input = fc2El('input', { type: 'text', placeholder: '房间链接或 ID', 'aria-label': '添加直播房间', autocomplete: 'off' });
  const form = fc2El('form', { class: 'fc-multi-add' }, input,
    fc2El('button', { type: 'submit', text: '加入同屏' }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    let id = fc2Id(input.value.trim());
    if (!id) {
      try {
        const url = new URL(input.value.trim());
        if (url.origin === location.origin && /^\/(?:2_)?[1-9]\d*\/?$/.test(url.pathname)) id = fc2Id(url.pathname.split('/')[1]);
      } catch (_) {}
    }
    if (!id) { fc2Toast('请输入有效的 FC2 房间链接或 ID'); return; }
    add(readFc2Library()[id] || { id, name: `房间 ${id}` });
    input.value = '';
  });
  const layout = fc2Select('排列', [['auto', '铺满一屏'], ['1', '1 列'], ['2', '2 列'], ['3', '3 列'], ['4', '4 列']], columns, value => {
    columns = value;
    save();
    arrange();
  });
  const muteAll = fc2Button('全部静音', () => setAudio(''));
  const more = fc2El('details', { class: 'fc-site-menu fc-multi-more' },
    fc2El('summary', { text: '更多', 'aria-label': '同屏更多操作' }),
    fc2El('div', {},
      fc2El('a', { href: '/', text: '返回直播列表' }),
      fc2Button('多路画质', () => { more.open = false; openQuality(); }),
      fc2Button('设置', () => { more.open = false; openFc2Settings(); }),
      fc2Button('原站', () => {
        setFc2Preferences({ enabled: false });
        location.href = '/';
      })));
  fc2Multiview = { add, has: id => rooms.has(id) };
  const viewport = fc2El('div', { class: 'fc-multi-scroll' }, empty, grid);
  const app = fc2El('main', { id: 'fc-multiview', class: 'fc-app' },
    fc2El('header', { class: 'fc-multi-toolbar', 'aria-label': '同屏控制栏' },
      fc2El('div', { class: 'fc-multi-brand' },
        fc2El('a', { class: 'fc-brand-mark', href: '/', text: 'c', 'aria-label': 'Creamu FC2 Live 首页' }),
        fc2El('strong', { text: '同屏' }), count),
      form,
      fc2El('div', { class: 'fc-multi-options' }, layout, muteAll),
      fc2El('div', { class: 'fc-multi-actions' },
        fc2Button('控制台', () => fc2Workbench.open(), { 'aria-controls': 'fc-wb' }), more)),
    viewport);
  document.body.append(app);
  const resize = new ResizeObserver(arrange);
  resize.observe(viewport);
  function arrange() {
    const style = getComputedStyle(viewport);
    const width = viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height = viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const gridStyle = getComputedStyle(grid);
    const gap = parseFloat(gridStyle.gap);
    const headerHeight = parseFloat(gridStyle.getPropertyValue('--fc-multi-header-height')) + 2;
    const minHeight = headerHeight + 120;
    const size = Math.max(1, rooms.size);
    const maxColumns = Math.min(size, Math.max(1, Math.floor((width + gap) / (320 + gap))));
    let rowHeight = minHeight;
    layoutColumns = Math.min(maxColumns, columns === 'auto' ? maxColumns : Number(columns));
    if (columns === 'auto') {
      let bestArea = -1;
      for (let candidate = 1; candidate <= maxColumns; candidate++) {
        const rows = Math.ceil(size / candidate);
        const cellHeight = Math.floor((height - gap * (rows - 1)) / rows);
        if (cellHeight < minHeight) continue;
        const cellWidth = (width - gap * (candidate - 1)) / candidate - 2;
        const pictureWidth = Math.min(cellWidth, (cellHeight - headerHeight) * 16 / 9);
        if (pictureWidth * pictureWidth > bestArea) {
          bestArea = pictureWidth * pictureWidth;
          layoutColumns = candidate;
          rowHeight = cellHeight;
        }
      }
    }
    grid.classList.toggle('is-fit', columns === 'auto');
    grid.style.setProperty('--fc-multi-columns', layoutColumns);
    grid.style.setProperty('--fc-multi-row-height', `${rowHeight}px`);
  }
  function applyOrder() {
    let index = 0;
    for (const id of rooms.keys()) {
      const tile = tiles.get(id);
    // Sorting preserves each media session and its live connection.
      tile.element.style.order = index;
      tile.element.setAttribute('aria-posinset', String(++index));
      tile.element.setAttribute('aria-setsize', String(rooms.size));
      tile.reorder.setAttribute('aria-label', `调整房间 ${id} 的位置，当前第 ${index} 位`);
    }
  }
  function moveRoom(id, target) {
    const entries = [...rooms];
    const from = entries.findIndex(([roomId]) => roomId === id);
    const to = Math.max(0, Math.min(entries.length - 1, target));
    if (from < 0 || from === to) return;
    entries.splice(to, 0, ...entries.splice(from, 1));
    rooms.clear();
    for (const [roomId, channel] of entries) rooms.set(roomId, channel);
    applyOrder();
    save();
    fc2Toast(`已将 ${rooms.get(id).name} 移到第 ${to + 1} 位`);
  }
  function dropTarget() {
    const element = document.elementFromPoint(drag.x, drag.y)?.closest('.fc-multi-tile');
    return element?.parentElement === grid ? element.dataset.roomId : '';
  }
  function trackDrag() {
    dragFrame = 0;
    if (!drag?.active) return;
    const bounds = viewport.getBoundingClientRect();
    const inside = drag.x >= bounds.left && drag.x <= bounds.right && drag.y >= bounds.top && drag.y <= bounds.bottom;
    const delta = !inside ? 0 : drag.y < bounds.top + 36 ? -10 : drag.y > bounds.bottom - 36 ? 10 : 0;
    const oldScroll = viewport.scrollTop;
    if (delta) viewport.scrollTop += delta;
    const target = dropTarget();
    if (target !== drag.target) {
      tiles.get(drag.target)?.element.classList.remove('is-drop-target');
      drag.target = target;
      if (target !== drag.id) tiles.get(target)?.element.classList.add('is-drop-target');
    }
    if (viewport.scrollTop !== oldScroll) dragFrame = requestAnimationFrame(trackDrag);
  }
  function finishDrag(commit) {
    if (!drag) return;
    const { id, handle, pointerId, active } = drag;
    const target = active && commit ? dropTarget() : '';
    drag = null;
    cancelAnimationFrame(dragFrame);
    dragFrame = 0;
    grid.classList.remove('is-reordering');
    for (const tile of tiles.values()) tile.element.classList.remove('is-reordering', 'is-drop-target');
    if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
    if (target && target !== id) moveRoom(id, [...rooms.keys()].indexOf(target));
  }
  grid.addEventListener('pointerdown', event => {
    const handle = event.target.closest('[data-reorder-id]');
    if (!handle || event.button !== 0 || !event.isPrimary || drag || rooms.size < 2) return;
    event.preventDefault();
    handle.focus({ preventScroll: true });
    handle.setPointerCapture(event.pointerId);
    drag = { id: handle.dataset.reorderId, handle, pointerId: event.pointerId, active: false,
      startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, target: '' };
  });
  grid.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (!drag.active && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) >= 5) {
      drag.active = true;
      grid.classList.add('is-reordering');
      tiles.get(drag.id).element.classList.add('is-reordering');
    }
    if (drag.active && !dragFrame) dragFrame = requestAnimationFrame(trackDrag);
  });
  grid.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    finishDrag(true);
  });
  for (const event of ['pointercancel', 'lostpointercapture']) grid.addEventListener(event, () => finishDrag(false));
  grid.addEventListener('keydown', event => {
    if (event.key === 'Escape' && drag) {
      event.preventDefault();
      finishDrag(false);
      return;
    }
    const handle = event.target.closest('[data-reorder-id]');
    if (!handle || drag) return;
    const index = [...rooms.keys()].indexOf(handle.dataset.reorderId);
    const target = {
      ArrowLeft: index - 1, ArrowRight: index + 1, ArrowUp: index - layoutColumns,
      ArrowDown: index + layoutColumns, Home: 0, End: rooms.size - 1
    }[event.key];
    if (target == null) return;
    event.preventDefault();
    moveRoom(handle.dataset.reorderId, target);
  });
  viewport.addEventListener('scroll', () => {
    if (drag?.active && !dragFrame) dragFrame = requestAnimationFrame(trackDrag);
  }, { passive: true });
  async function requestQuality(id, value) {
    const tile = tiles.get(id);
    if (!tile?.player) throw new Error('房间已移除');
    tile.player.setQuality(value);
  }
  function openQuality() {
    const rows = fc2El('div', { class: 'fc-multi-quality-list' });
    const message = fc2El('p', { class: 'fc-dialog-status', role: 'status' });
    let busy = false;
    async function apply(changes, skipped = 0) {
      if (busy) return;
      busy = true;
      message.textContent = '正在切换画质…';
      qualityView?.render();
      const results = await Promise.allSettled(changes.map(([id, value]) => requestQuality(id, value)));
      const failed = results.filter(result => result.status === 'rejected');
      message.textContent = changes.length
        ? `已向 ${changes.length - failed.length} 路提交切换${skipped ? `，${skipped} 路没有对应选项` : ''}${failed.length ? `；${failed.length} 路失败：${failed[0].reason.message}` : ''}。`
        : '当前没有可切换的画质。';
      busy = false;
      qualityView?.render();
    }
    function batch(mode) {
      const changes = [];
      for (const [id, tile] of tiles) {
        const options = tile.qualities || [];
        const selected = mode === 'low' ? options.filter(item => item.bitrate > 0).sort((a, b) => a.bitrate - b.bitrate)[0]
          : options.find(item => item.value === 'auto');
        if (selected) changes.push([id, selected.value]);
      }
      void apply(changes, rooms.size - changes.length);
    }
    const low = fc2Button('全部最低码率', () => batch('low'));
    const automatic = fc2Button('全部自动', () => batch('auto'));
    const dialog = openFc2Dialog('多路画质',
      fc2El('div', {}, fc2El('p', { text: '画质来自各路实际播放列表。自动模式根据带宽调整；降低码率可减少多路观看的带宽占用。' }),
        fc2El('div', { class: 'fc-multi-quality-actions' }, low, automatic), rows, message));
    function render() {
      low.disabled = busy || ![...tiles.values()].some(tile => tile.qualities?.some(item => item.bitrate > 0));
      automatic.disabled = busy || ![...tiles.values()].some(tile => tile.qualities?.some(item => item.value === 'auto'));
      const existing = new Map([...rows.children].map(row => [row.dataset.roomId, row]));
      for (const [id, channel] of rooms) {
        const options = tiles.get(id).qualities || [];
        const signature = JSON.stringify([channel.name, options, busy]);
        let row = existing.get(id);
        existing.delete(id);
        if (row?.dataset.signature === signature) continue;
        const select = fc2El('select', { 'aria-label': `房间 ${id} 的画质`, disabled: busy || !options.length ? '' : null },
          options.length ? options.map(item => fc2El('option', { value: item.value, text: item.label }))
            : fc2El('option', { text: '原站暂未提供可选画质' }));
        select.value = options.find(item => item.selected)?.value || options[0]?.value || select.value;
        select.addEventListener('change', () => { void apply([[id, select.value]]); });
        const next = fc2El('label', { class: 'fc-multi-quality-row', 'data-room-id': id, 'data-signature': signature },
          fc2El('span', { text: `${channel.name} · ${id}` }), select);
        if (row) row.replaceWith(next);
        else rows.append(next);
      }
      for (const row of existing.values()) row.remove();
    }
    qualityView = { render };
    dialog.addEventListener('close', () => { qualityView = null; }, { once: true });
    render();
  }
  function setAudio(id) {
    audible = rooms.has(id) ? id : '';
    for (const [roomId, tile] of tiles) {
      tile.sound.setAttribute('aria-pressed', String(audible === roomId));
      tile.sound.textContent = audible === roomId ? '静音' : '听这路';
      tile.element.classList.toggle('is-audible', audible === roomId);
      tile.player?.setAudible(audible === roomId);
    }
    muteAll.disabled = !audible;
  }
  function update() {
    count.textContent = `${rooms.size} 路`;
    empty.hidden = rooms.size > 0;
    applyOrder();
    arrange();
    qualityView?.render();
    document.dispatchEvent(new Event('creamu-fc2-multiview'));
  }
  function remove(id) {
    finishDrag(false);
    const tile = tiles.get(id);
    tile?.player.destroy();
    tile?.element.remove();
    tiles.delete(id);
    rooms.delete(id);
    if (audible === id) setAudio('');
    save();
    update();
  }
  function add(channel, persist = true) {
    const id = fc2Id(channel?.id);
    if (!id) return;
    if (rooms.has(id)) {
      fc2Toast(`房间 ${id} 已在同屏中`);
      tiles.get(id)?.element.scrollIntoView({ block: 'nearest' });
      return;
    }
    const name = fc2Text(channel.name) || `房间 ${id}`;
    finishDrag(false);
    rooms.set(id, { id, name });
    const url = fc2RoomUrl({ id });
    const status = fc2El('span', { class: 'fc-multi-status', text: '正在连接', role: 'status' });
    const host = fc2El('div', { class: 'fc-multi-host fc-art-host' });
    const sound = fc2Button('听这路', () => setAudio(audible === id ? '' : id),
      { 'aria-label': `切换房间 ${id} 的声音`, 'aria-pressed': 'false' });
    const reload = fc2Button('↻', () => {
      tile.player.reload();
    }, { 'aria-label': `重新载入房间 ${id}`, title: '仅重新载入这一路' });
    const reorder = fc2El('button', { type: 'button', class: 'fc-multi-reorder', text: '⠿',
      'data-reorder-id': id, title: '拖动排序；聚焦后按方向键调整位置，Home / End 移到首尾',
      'aria-keyshortcuts': 'ArrowLeft ArrowRight ArrowUp ArrowDown Home End' });
    const element = fc2El('section', { class: 'fc-multi-tile', role: 'listitem', 'data-room-id': id, 'aria-label': `${name} · ${id}` },
      fc2El('header', { class: 'fc-multi-tile-header' },
        reorder,
        fc2El('div', { class: 'fc-multi-tile-title' }, fc2El('strong', { text: name, title: `${name} · ${id}` }), status),
        fc2El('div', { class: 'fc-multi-tile-actions' }, sound, reload,
          fc2El('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: '↗', title: '打开原房间',
            'aria-label': `在新标签页打开房间 ${id}` }),
          fc2Button('×', () => remove(id), { 'aria-label': `移除房间 ${id}`, title: '移除并停止这一路' }))),
      fc2El('div', { class: 'fc-multi-video' }, host));
    const tile = { element, sound, status, reorder, qualities: [], player: null };
    tiles.set(id, tile);
    grid.append(element);
    tile.player = createFc2MultiPlayer({
      id, container: host,
      onStatus(text) { status.textContent = text; status.title = text; },
      onSound() { setAudio(audible === id ? '' : id); },
      onQualities(options) { tile.qualities = options; qualityView?.render(); },
      onChannel(current) {
        rooms.set(id, { id, name: current.name });
        const title = element.querySelector('.fc-multi-tile-title strong');
        title.textContent = current.name;
        title.title = `${current.name} · ${id}`;
        save();
        updateFc2Record(current, { visitedAt: Date.now() });
      }
    });
    if (persist) fc2Toast(`已加入 ${name}`);
    if (persist) save();
    update();
  }
  for (const channel of Array.isArray(saved.rooms) ? saved.rooms : []) add(channel, false);
  setAudio('');
  update();
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    finishDrag(false);
    for (const tile of tiles.values()) tile.player.destroy();
    resize.disconnect();
  }, { once: true });
}
// Each tile owns one FC2 control connection and one HLS engine. No native room is loaded.
function createFc2MultiPlayer({ id, container, onStatus, onQualities, onChannel, onSound }) {
  let run = null;
  let generation = 0;
  let disposed = false;
  let blocked = false;
  let retries = 0;
  let retryTimer = 0;
  let paused = false;
  let awaitingGesture = false;
  let audible = false;
  let selectedQuality = 'auto';
  let healthySince = 0;
  let lastProgressAt = performance.now();
  let lastFrames = 0;
  let lastStatus = '';
  const publishStatus = text => {
    if (text !== lastStatus) { lastStatus = text; onStatus(text); }
  };
  if (typeof Artplayer !== 'function' || typeof Hls !== 'function' || !Hls.isSupported()) {
    publishStatus('HLS 播放不可用 · 请打开原房间');
    return { destroy() {}, reload() {}, setAudible() {}, setQuality() { throw new Error('HLS 播放不可用'); } };
  }
  Artplayer.REMOVE_SRC_WHEN_DESTROY = false;
  Artplayer.LOG_VERSION = false;
  Artplayer.DBCLICK_FULLSCREEN = false;
  function perform(action) {
    Promise.resolve().then(action).catch(() => publishStatus('操作未完成 · 请点击播放器重试'));
  }
  function fullscreen() {
    if (document.fullscreenElement) return document.exitFullscreen();
    if (container.requestFullscreen) return container.requestFullscreen();
    throw new Error('浏览器不支持全屏');
  }
  const art = new Artplayer({
    container, url: '', isLive: true, lang: 'zh-cn', theme: '#f3a18c',
    autoplay: false, muted: true, volume: 1, mutex: false, hotkey: false,
    fullscreen: false, pip: !!document.pictureInPictureEnabled,
    icons: { loading: '<span class="fc-player-spinner" aria-hidden="true"></span>' },
    controls: [
      {
        name: 'sound', position: 'left', index: 20,
        html: fc2Button('声音', onSound, { class: 'fc-player-button', 'aria-label': '切换这路声音' })
      },
      {
        name: 'fullscreen', position: 'right', index: 50,
        html: fc2Button('全屏', () => perform(fullscreen), { class: 'fc-player-button', 'aria-label': '全屏' })
      }
    ]
  });
  art.off('video:error');
  // ArtPlayer 5.4.0's metadata hook leaves document fullscreen listeners after destroy.
  // Like the single-room player, this tile owns fullscreen through disposable listeners.
  art.off('video:loadedmetadata');
  art.on('video:loadedmetadata', () => art.emit('resize'));
  art.proxy(document, 'fullscreenchange', () => art.emit('resize'));
  const video = art.video;
  art.proxy(video, 'dblclick', () => perform(fullscreen));
  container.tabIndex = 0;
  container.setAttribute('aria-label', `房间 ${id} 的播放器`);
  function keyboard(event) {
    if (event.target.closest('button,input,select,textarea,[contenteditable]')) return;
    const actions = {
      Space: () => video.paused ? art.play() : art.pause(), KeyM: onSound,
      KeyF: fullscreen,
      ArrowUp: () => { art.volume = Math.min(1, art.volume + .1); },
      ArrowDown: () => { art.volume = Math.max(0, art.volume - .1); }
    };
    if (!actions[event.code]) return;
    event.preventDefault();
    perform(actions[event.code]);
  }
  container.addEventListener('keydown', keyboard);
  // Volume selection belongs to the board; media events must never change another room.
  art.on('video:volumechange', () => { if (video.muted === audible) video.muted = !audible; });
  art.on('pause', () => { paused = true; publishStatus('已暂停'); });
  art.on('play', () => { paused = false; awaitingGesture = false; lastProgressAt = performance.now(); });
  const active = attempt => !disposed && run === attempt && attempt.generation === generation;
  function release() {
    generation++;
    const previous = run;
    run = null;
    clearTimeout(retryTimer);
    retryTimer = 0;
    if (previous) {
      previous.controller.abort();
      clearTimeout(previous.timeout);
      clearInterval(previous.heartbeat);
      previous.socket?.close();
      previous.hls?.destroy();
    }
    video.pause();
    video.removeAttribute('src');
    video.load();
    onQualities([]);
    healthySince = 0;
    awaitingGesture = false;
  }
  function stop(message) {
    blocked = true;
    release();
    art.loading.show = false;
    publishStatus(message);
  }
  function recover(reason) {
    if (disposed) return;
    release();
    if (!navigator.onLine) { publishStatus('网络已断开'); return; }
    if (retries >= 3) { publishStatus(`${reason} · 请重载或打开原房间`); return; }
    const delay = [1000, 3000, 8000][retries++];
    publishStatus(`连接中断 · ${delay / 1000} 秒后重试（${retries}/3）`);
    retryTimer = setTimeout(start, delay);
  }
  function denied(code) {
    const messages = {
      4107: '需要登录', 4507: '需要登录', 4108: '需要点数或观看权限', 4508: '需要点数或观看权限',
      4103: '需要观看票', 4116: '需要观看票', 4525: '需要观看票',
      4509: '需要年龄确认', 4512: '重复连接已被原站断开',
      4511: '直播未开播', 4502: '直播未开播', 4526: '需要身份确认'
    };
    stop(`${messages[code] || `原站已断开（${code}）`} · 请打开原房间`);
  }
  function qualities(attempt) {
    if (!active(attempt) || !attempt.hls?.levels.length) return;
    const hls = attempt.hls;
    onQualities([
      { value: 'auto', label: '自动', selected: selectedQuality === 'auto', bitrate: null },
      ...hls.levels.map((level, index) => ({
        value: String(index), label: `${level.height ? `${level.height}p · ` : ''}${Math.round(level.bitrate / 1000)} Kbps`,
        bitrate: level.bitrate, selected: selectedQuality === String(index)
      }))
    ]);
  }
  function attachMedia(attempt, payload) {
    if (!active(attempt) || attempt.hls) return;
    // Match FC2's default balanced transport, which can differ from its lowest-latency stream.
    const offered = payload.playlists_middle_latency || payload.playlists;
    const playlists = Array.isArray(offered) ? offered : [];
    const playlist = playlists.find(item => item.status === 0 && typeof item.url === 'string' && item.url.includes('master_playlist'))
      || playlists.find(item => item.status === 0 && typeof item.url === 'string');
    if (!playlist) { stop('原站未提供 HLS 流 · 请打开原房间'); return; }
    let url;
    try { url = new URL(playlist.url); } catch (_) { stop('原站播放地址无效'); return; }
    if (url.protocol !== 'https:') { stop('原站播放地址不支持'); return; }
    clearTimeout(attempt.timeout);
    const hls = attempt.hls = new Hls({
      backBufferLength: 30, maxBufferLength: 10, maxMaxBufferLength: 20,
      maxBufferSize: 12 * 1000 * 1000, liveSyncDuration: 6, liveMaxLatencyDuration: 15,
      xhrSetup(xhr) { xhr.withCredentials = true; }
    });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (active(attempt) && data.fatal) recover('媒体加载失败');
    });
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (!active(attempt)) return;
      if (selectedQuality !== 'auto' && !hls.levels[Number(selectedQuality)]) selectedQuality = 'auto';
      hls.currentLevel = selectedQuality === 'auto' ? -1 : Number(selectedQuality);
      qualities(attempt);
      if (!paused) video.play().catch(error => {
        if (!active(attempt) || (paused && error.name === 'AbortError')) return;
        if (error.name === 'NotAllowedError') {
          awaitingGesture = true;
          publishStatus('点击播放以开始观看');
        } else recover('媒体启动失败');
      });
    });
    hls.on(Hls.Events.MEDIA_ATTACHED, () => { if (active(attempt)) hls.loadSource(url.href); });
    lastFrames = 0;
    lastProgressAt = performance.now();
    hls.attachMedia(video);
  }
  async function start() {
    if (disposed) return;
    release();
    if (!navigator.onLine) { publishStatus('网络已断开'); return; }
    publishStatus('正在连接');
    art.loading.show = true;
    const attempt = run = { generation, controller: new AbortController(), socket: null, hls: null, sequence: 0, heartbeatId: null };
    const post = async (endpoint, data) => {
      const response = await fetch(endpoint, {
        method: 'POST', credentials: 'include', signal: attempt.controller.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
        body: new URLSearchParams(data)
      });
      if (!response.ok) throw new Error('FC2 接口连接失败');
      return response.json();
    };
    attempt.timeout = setTimeout(() => { if (active(attempt)) recover('原站连接超时'); }, 20000);
    try {
      const member = await post('/api/memberApi.php', { channel: '1', profile: '1', user: '1', streamid: id });
      if (!active(attempt)) return;
      const channel = member.data?.channel_data;
      if (!member.status || !channel) { stop('房间信息不可用 · 请打开原房间'); return; }
      if (String(id).startsWith('2_')) { stop('双向直播请打开原房间'); return; }
      onChannel({ id, name: fc2Text(member.data.profile_data?.name) || `房间 ${id}`, title: fc2Text(channel.title) });
      const control = await post('/api/getControlServer.php', {
        channel_id: id, mode: 'play', orz: '', channel_version: channel.version,
        client_version: '2.1.0\n [1]', client_type: 'pc', client_app: 'browser_hls', ipv6: '', comment: '0'
      });
      if (!active(attempt)) return;
      if (!control.url || !control.control_token) { stop('原站未允许连接 · 请打开原房间'); return; }
      if (typeof control.orz_raw === 'string') document.cookie = `l_ortkn=${encodeURIComponent(control.orz_raw)}; path=/; secure; SameSite=Lax`;
      const endpoint = new URL(control.url);
      if (endpoint.protocol !== 'wss:') { stop('控制连接地址不支持'); return; }
      endpoint.searchParams.set('control_token', control.control_token);
      const socket = attempt.socket = new WebSocket(endpoint.href);
      const send = name => {
        const requestId = ++attempt.sequence;
        socket.send(JSON.stringify({ name, arguments: {}, id: requestId }));
        return requestId;
      };
      socket.onmessage = event => {
        if (!active(attempt)) return;
        let message;
        try { message = JSON.parse(event.data); } catch (_) { return; }
        const data = message.arguments || {};
        if (message.name === 'control_disconnection' || message.name === 'media_disconnection') {
          denied(data.code ?? '未知');
          return;
        }
        if (message.name === 'publish_stop') { stop('直播已结束 · 可稍后重载'); return; }
        if (message.name === 'connect_complete' && !attempt.playlistId) {
          attempt.playlistId = send('get_hls_information');
          attempt.heartbeat = setInterval(() => {
            if (!active(attempt)) return;
            if (attempt.heartbeatId !== null) { recover('控制连接无响应'); return; }
            if (socket.readyState !== WebSocket.OPEN) { recover('控制连接已关闭'); return; }
            attempt.heartbeatId = send('heartbeat');
          }, 30000);
        }
        if (message.name === '_response_') {
          if (message.id === attempt.heartbeatId) attempt.heartbeatId = null;
          if (message.id === attempt.playlistId) {
            const result = Number(data.status ?? data.code ?? 0);
            if (result !== 0) denied(result);
            else attachMedia(attempt, data);
          }
        }
      };
      socket.onclose = () => { if (active(attempt)) recover('控制连接已关闭'); };
      socket.onerror = () => { if (active(attempt)) recover('控制连接失败'); };
    } catch (_) {
      if (active(attempt)) recover('连接失败');
    }
  }
  const monitor = setInterval(() => {
    if (!run?.hls || disposed) return;
    const now = performance.now();
    if (paused || awaitingGesture) {
      healthySince = 0;
      lastProgressAt = now;
      publishStatus(paused ? '已暂停' : '点击播放以开始观看');
      return;
    }
    const frames = video.getVideoPlaybackQuality().totalVideoFrames;
    if (!video.paused && video.readyState >= 3 && frames !== lastFrames) {
      lastFrames = frames;
      lastProgressAt = now;
      if (!healthySince) healthySince = now;
      if (now - healthySince >= 30000) retries = 0;
      publishStatus('播放中');
    } else if (now - lastProgressAt >= 15000) {
      recover('直播长时间未更新');
    } else {
      if (now - lastProgressAt >= 3000) healthySince = 0;
      if (video.readyState < 3) publishStatus('正在缓冲');
    }
  }, 1000);
  function offline() { if (!blocked) { release(); publishStatus('网络已断开'); } }
  function online() { if (!blocked) { retries = 0; void start(); } }
  window.addEventListener('offline', offline);
  window.addEventListener('online', online);
  void start();
  return {
    reload() { retries = 0; blocked = false; void start(); },
    setAudible(value) { audible = value; video.muted = !audible; },
    setQuality(value) {
      const hls = run?.hls;
      if (!hls || (value !== 'auto' && (!/^\d+$/.test(value) || !hls.levels[Number(value)]))) throw new Error('这一路暂无对应画质');
      selectedQuality = value;
      hls.currentLevel = value === 'auto' ? -1 : Number(value);
      qualities(run);
    },
    destroy() {
      disposed = true;
      release();
      clearInterval(monitor);
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
      container.removeEventListener('keydown', keyboard);
      art.destroy();
    }
  };
}
// FC2 remains the only owner of media sources, authentication, quality and reconnects.
function createFc2NativeControls(area) {
  const find = selector => area.querySelector(`#js-player_controls ${selector}`);
  function click(selector) {
    const target = find(selector);
    if (!target || target.disabled) throw new Error('当前播放模式不支持这项操作');
    target.click();
  }
  function read() {
    const qualityArea = find('.js-hlsQualityBtnArea');
    const qualities = qualityArea && getComputedStyle(qualityArea).display !== 'none'
      ? [...qualityArea.querySelectorAll('#js-hlsQualityList li[data-index]')]
        .filter(element => !element.classList.contains('is-disabled'))
        .map(element => {
          const label = fc2Text(element.textContent);
          const rate = label.match(/([\d.]+)\s*([km])bps/i);
          return {
            value: element.dataset.index, label, selected: element.classList.contains('is-current'),
            bitrate: rate ? Number(rate[1]) * (rate[2].toLowerCase() === 'm' ? 1000000 : 1000) : null
          };
        }) : [];
    const latencyArea = find('.js-hlsLatencyArea');
    const latency = latencyArea && getComputedStyle(latencyArea).display !== 'none'
      ? find('[data-name="changeHlsLatency"] .js-slider_value') : null;
    return {
      qualities,
      latency: latency ? {
        value: Number(latency.textContent), min: Number(latency.dataset.min),
        max: Number(latency.dataset.max), step: Number(latency.dataset.step)
      } : null,
      comment: find('.js-commentMoveBtn_on')?.style.display !== 'none',
      gift: find('.js-giftMoveBtn_on')?.style.display !== 'none',
      hasComment: !!find('.js-commentMoveBtn'),
      hasGift: !!find('.js-giftMoveBtn'),
      canReload: !!find('.js-reloadBtn')
    };
  }
  return {
    read,
    reload: () => click('.js-reloadBtn'),
    comment: () => click('.js-commentMoveBtn'),
    gift: () => click('.js-giftMoveBtn'),
    quality(value) {
      if (!read().qualities.some(item => item.value === value)) throw new Error('当前播放模式未提供这项画质');
      const target = [...area.querySelectorAll('#js-hlsQualityList li[data-index]')]
        .find(element => element.dataset.index === value);
      if (!target) throw new Error('画质列表已更新，请重新选择');
      target.click();
    },
    latency(value) {
      // FC2 exposes this setting only through its delegated slider gesture.
      // Keep that widget laid out (but invisible) so its own handler owns the change.
      const slider = find('[data-name="changeHlsLatency"]');
      const track = slider?.querySelector('.js-slider_range')?.parentElement;
      const state = read().latency;
      if (!track || !state || !Number.isFinite(value) || state.max <= state.min) {
        throw new Error('当前播放模式不支持延迟调整');
      }
      const bounds = track.getBoundingClientRect();
      if (bounds.width <= 0) throw new Error('延迟控件尚未就绪');
      const fraction = (Math.min(state.max, Math.max(state.min, value)) - state.min) / (state.max - state.min);
      const mouse = (type, clientX) => new MouseEvent(type, { bubbles: true, clientX, clientY: bounds.top + 1, button: 0 });
      slider.dispatchEvent(mouse('mousedown', bounds.left + 1));
      document.dispatchEvent(mouse('mousemove', bounds.left + bounds.width * fraction));
      document.dispatchEvent(mouse('mouseup', bounds.left + bounds.width * fraction));
    }
  };
}

function mountFc2Player(onModeChange) {
  const scope = document.querySelector('.m-viewPlayer');
  let enabled = !readFc2Preferences().nativePlayer;
  let session = null;
  let frame = 0;
  const preferences = readFc2Preferences();
  let sound = preferences.playerVolume == null ? null
    : { volume: preferences.playerVolume, muted: preferences.playerMuted === true };
  let userPaused = false;
  let disposed = false;
  const mediaSelector = '#js-video_area, #js-player_controls, video:not(.subVideo)';
  const bridgeSelector = '.js-hlsQualityBtnArea, .js-hlsLatencyArea, .js-commentMoveBtn, .js-giftMoveBtn, .js-reloadBtn';

  function nativeVisible(element, boundary) {
    for (let node = element; node && node !== boundary; node = node.parentElement) {
      if (node.hidden || getComputedStyle(node).display === 'none') return false;
    }
    return true;
  }
  function activeVideo(area) {
    return [...area.querySelectorAll('#js-videoComponentBox video:not(.subVideo)')]
      .filter(video => nativeVisible(video, area))
      .sort((a, b) => (Number(b.style.zIndex) || 0) - (Number(a.style.zIndex) || 0))[0] || null;
  }
  function restoreAttribute(element, name, value) {
    if (value == null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }
  function detach() {
    if (!session) return;
    const { art, video, anchor, host, area, nativeControls, nativeAttributes, videoAttributes } = session;
    clearInterval(session.statusTimer);
    if (area.classList.contains('fc-player-web')) setWebFullscreen(false);
    session = null;
    sound = { volume: video.volume, muted: video.muted };
    area.classList.remove('fc-art-active');
    // Return the same node before destroying the ArtPlayer DOM; never call load(), clear src or stop tracks.
    if (anchor.parentNode && host.isConnected && host.contains(video)) anchor.replaceWith(video);
    else anchor.remove();
    video.classList.remove('art-video');
    for (const [name, value] of Object.entries(videoAttributes)) restoreAttribute(video, name, value);
    for (const [name, value] of Object.entries(nativeAttributes)) restoreAttribute(nativeControls, name, value);
    art.destroy();
    host.remove();
  }
  function attempt(action) {
    Promise.resolve().then(action).catch(error => fc2Toast(error.message || '操作失败，请重试'));
  }
  function setWebFullscreen(value) {
    if (!session) return;
    session.area.classList.toggle('fc-player-web', value);
    document.documentElement.classList.toggle('fc-player-web-open', value);
    window.dispatchEvent(new Event('resize'));
  }
  function rememberSound(video) {
    const next = { volume: video.volume, muted: video.muted };
    if (sound?.volume === next.volume && sound?.muted === next.muted) return;
    sound = next;
    setFc2Preferences({ playerVolume: next.volume, playerMuted: next.muted });
  }
  function fullscreen() {
    if (!session) return;
    if (document.fullscreenElement) return document.exitFullscreen();
    if (session.area.requestFullscreen) return session.area.requestFullscreen();
    throw new Error('此浏览器不支持页面全屏，请使用网页全屏');
  }
  function controlButton(name, label, action, position = 'right', index = 10) {
    return {
      name, position, index,
      html: fc2Button(label, () => attempt(action), { class: 'fc-player-button', 'aria-label': label, title: label })
    };
  }
  function refreshMenu() {
    if (!session) return;
    const { bridge, quality, latency, comment, gift, reload } = session;
    const state = bridge.read();
    const signature = JSON.stringify(state);
    if (signature === session.menuSignature) return;
    session.menuSignature = signature;
    quality.replaceChildren(...state.qualities.map(item => fc2El('option', { value: item.value, text: item.label })));
    quality.value = state.qualities.find(item => item.selected)?.value || '';
    quality.parentElement.hidden = !state.qualities.length;
    latency.parentElement.hidden = !state.latency;
    if (state.latency) {
      const { min, max, step, value } = state.latency;
      latency.replaceChildren(...Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, index) => {
        const level = min + index * step;
        return fc2El('option', { value: level, text: level === min ? '低延迟' : level === max ? '更流畅' : '均衡' });
      }));
      latency.value = String(value);
    }
    for (const [button, available, active, label] of [
      [comment, state.hasComment, state.comment, '弹幕'], [gift, state.hasGift, state.gift, '礼物动画']
    ]) {
      button.hidden = !available;
      button.setAttribute('aria-pressed', String(active));
      button.textContent = `${label}：${active ? '开' : '关'}`;
    }
    reload.disabled = !state.canReload;
  }
  function status() {
    if (!session) return;
    const { art, video, status: label } = session;
    const now = performance.now();
    const progress = video.videoWidth && video.getVideoPlaybackQuality
      ? video.getVideoPlaybackQuality().totalVideoFrames : video.currentTime;
    if (progress !== session.progress || video.paused) session.lastProgressAt = now;
    session.progress = progress;
    const tracks = video.srcObject instanceof MediaStream ? video.srcObject.getTracks() : [];
    const ended = video.ended || (tracks.length > 0 && tracks.every(track => track.readyState === 'ended'));
    // WebRTC can keep readyState=4 after packets stop; allow short jitter, then report missing frames.
    const stalled = !video.paused && now - session.lastProgressAt >= 8000;
    if (video.readyState >= 3 && !art.isReady) art.emit('video:canplay');
    if (video.readyState >= 3) {
      if (art.loading.show) art.loading.show = false;
      if (art.mask.show !== video.paused) art.mask.show = video.paused;
    }
    const state = !navigator.onLine ? 'offline' : video.error ? 'error' : ended ? 'ended'
      : video.readyState < 3 ? 'waiting' : video.paused ? 'paused' : stalled ? 'stalled' : 'playing';
    const text = {
      offline: '网络已断开', error: '播放异常 · 可重连', ended: '媒体已结束',
      stalled: '画面中断 · 等待恢复', waiting: '等待直播', paused: '已暂停', playing: '直播'
    }[state];
    const title = video.videoWidth ? `${video.videoWidth} × ${video.videoHeight}` : '等待原站连接';
    if (label.textContent !== text) label.textContent = text;
    if (label.title !== title) label.title = title;
  }
  function attach(video, area) {
    const nativeControls = area.querySelector('#js-player_controls');
    if (!nativeControls) return;
    const bridge = createFc2NativeControls(area);
    const anchor = document.createComment('Creamu video position');
    const host = fc2El('div', { class: 'fc-art-host' });
    const videoAttributes = Object.fromEntries(['controls', 'preload', 'playsinline', 'webkit-playsinline', 'disablepictureinpicture']
      .map(name => [name, video.getAttribute(name)]));
    const nativeAttributes = Object.fromEntries(['aria-hidden', 'inert'].map(name => [name, nativeControls.getAttribute(name)]));
    const originalClass = video.className;
    video.before(anchor);
    video.parentElement.append(host);
    const label = fc2El('span', { class: 'fc-player-status', text: '等待直播', role: 'status' });
    const quality = fc2El('select', { 'aria-label': '直播画质' });
    const latency = fc2El('select', { 'aria-label': '直播延迟' });
    const fit = fc2El('select', { 'aria-label': '画面适配' },
      fc2El('option', { value: 'contain', text: '完整画面' }),
      fc2El('option', { value: 'cover', text: '铺满（裁切）' }),
      fc2El('option', { value: 'fill', text: '拉伸铺满' }));
    fit.addEventListener('change', () => host.style.setProperty('--fc-video-fit', fit.value));
    quality.addEventListener('change', () => attempt(() => bridge.quality(quality.value)));
    latency.addEventListener('change', () => attempt(() => bridge.latency(Number(latency.value))));
    const comment = fc2Button('弹幕', () => attempt(bridge.comment));
    const gift = fc2Button('礼物动画', () => attempt(bridge.gift));
    const reload = fc2Button('重新连接', () => attempt(bridge.reload), { class: 'fc-player-button' });
    const menuContent = fc2El('div', {},
      fc2El('label', { text: '画质' }, quality), fc2El('label', { text: '延迟 / 稳定性' }, latency),
      fc2El('label', { text: '画面适配' }, fit),
      fc2El('div', { class: 'fc-player-menu-actions' }, comment, gift),
      fc2El('div', { class: 'fc-player-menu-mobile' },
        fc2Button('重新连接', () => attempt(bridge.reload)),
        fc2Button('截图', () => attempt(() => art.screenshot()))),
      fc2El('p', { text: `快捷键：空格 播放/暂停 · ↑↓ 音量 · M 静音 · F 全屏 · W 网页全屏` }));
    let art;
    try {
      Artplayer.REMOVE_SRC_WHEN_DESTROY = false;
      Artplayer.LOG_VERSION = false;
      Artplayer.DBCLICK_FULLSCREEN = false;
      Artplayer.MOBILE_DBCLICK_PLAY = false;
      const currentSound = sound || { volume: video.volume, muted: video.muted };
      art = new Artplayer({
        container: host, url: '', proxy: () => video, isLive: true,
        lang: 'zh-cn', theme: '#f3a18c', mutex: false, hotkey: false,
        // The default SVG keeps its SMIL animations ticking even while the loading layer is hidden.
        icons: { loading: '<span class="fc-player-spinner" aria-hidden="true"></span>' },
        volume: currentSound.volume, muted: currentSound.muted,
        pip: !!document.pictureInPictureEnabled, setting: false,
        fullscreen: false, fullscreenWeb: false, screenshot: false,
        moreVideoAttr: { controls: false, preload: video.preload },
        controls: [
          { name: 'live', position: 'left', index: 30, html: label },
          { name: 'reconnect', position: 'left', index: 40, html: reload },
          controlButton('settings', '播放设置', () => { art.setting.toggle(); refreshMenu(); }),
          controlButton('screenshot', '截图', () => art.screenshot().catch(() => { throw new Error('当前直播无法截图（可能受视频跨域限制）'); }), 'right', 15),
          controlButton('web', '网页全屏', () => setWebFullscreen(!area.classList.contains('fc-player-web')), 'right', 40),
          controlButton('fullscreen', '全屏', fullscreen, 'right', 50)
        ]
      });
      video.className = `${originalClass} art-video`.trim();
      video.volume = currentSound.volume;
      video.muted = currentSound.muted;
      // The site already owns source errors and reconnects. ArtPlayer owns controls only.
      art.off('video:error');
      // ArtPlayer defers its empty-URL spinner; an already decoding proxy has no new source to load.
      art.on('loading', visible => {
        if (visible && video.readyState >= 3 && !video.seeking) art.loading.show = false;
      });
      // Use the native video-area fullscreen so payment/permission covers and comment canvases stay visible.
      art.off('video:loadedmetadata');
      art.hotkey.keys = {};
      for (const [key, action] of Object.entries({
        Space: () => art.toggle(), ArrowUp: () => { art.volume = Math.min(1, art.volume + .1); },
        ArrowDown: () => { art.volume = Math.max(0, art.volume - .1); },
        KeyM: () => { art.muted = !art.muted; }, KeyF: fullscreen,
        KeyW: () => setWebFullscreen(!area.classList.contains('fc-player-web')),
        Escape: () => { art.setting.show = false; setWebFullscreen(false); }
      })) art.hotkey.add(key, () => {
        if (key !== 'Escape' && document.activeElement?.closest('input,textarea,select,button,[contenteditable]')) return;
        attempt(action);
      });
      art.proxy(art.template.$player, 'dblclick', event => {
        if (event.target === video) attempt(fullscreen);
      });
      // Share ArtPlayer's setting state so its idle timer knows the menu is in use.
      const menu = art.template.$setting;
      menu.classList.add('fc-player-menu', 'fc-app');
      menu.setAttribute('aria-label', '播放设置');
      menu.append(...menuContent.childNodes);
      const settingsButton = art.controls.settings.querySelector('button');
      settingsButton.setAttribute('aria-expanded', 'false');
      art.on('setting', visible => {
        settingsButton.setAttribute('aria-expanded', String(visible));
        if (visible) art.controls.show = true;
      });
      art.on('document:click', event => {
        // Delegated native actions synthesize clicks outside ArtPlayer; only user clicks dismiss the menu.
        if (event.isTrusted && !menu.contains(event.target) && !settingsButton.contains(event.target)) art.setting.show = false;
      });
      session = { art, video, anchor, host, area, bridge, nativeControls, nativeAttributes, videoAttributes,
        status: label, quality, latency, comment, gift, reload, menu, menuSignature: '',
        progress: null, lastProgressAt: performance.now(), statusTimer: setInterval(status, 1000) };
      nativeControls.setAttribute('aria-hidden', 'true');
      nativeControls.setAttribute('inert', '');
      area.classList.add('fc-art-active');
      art.on('play', () => { userPaused = false; });
      art.on('pause', () => { userPaused = true; });
      art.on('video:volumechange', () => rememberSound(video));
      for (const event of ['canplay', 'playing', 'pause', 'waiting', 'loadedmetadata', 'error', 'emptied', 'ended']) art.on(`video:${event}`, status);
      art.on('video:loadedmetadata', () => art.emit('resize'));
      for (const [selector, name] of [['.art-control-playAndPause', '播放 / 暂停'], ['.art-control-pip', '画中画']]) {
        const element = host.querySelector(selector);
        if (!element) continue;
        element.setAttribute('role', 'button');
        element.setAttribute('aria-label', name);
        element.tabIndex = 0;
        art.proxy(element, 'keydown', event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          if (selector === '.art-control-playAndPause') attempt(() => art.toggle());
          else element.click();
        });
      }
      if (userPaused) video.pause();
      refreshMenu();
      status();
      if (!video.paused && video.readyState >= 3) art.emit('video:playing');
    } catch (error) {
      if (session) detach();
      else {
        if (anchor.parentNode) anchor.replaceWith(video);
        video.className = originalClass;
        for (const [name, value] of Object.entries(videoAttributes)) restoreAttribute(video, name, value);
        art?.destroy();
        host.remove();
      }
      enabled = false;
      onModeChange(false);
      fc2Toast(`增强播放器未能启动，已保留原生播放器：${error.message}`);
    }
  }
  function reconcile() {
    frame = 0;
    if (!enabled || disposed) return;
    const area = scope.querySelector('#js-video_area');
    const video = area && activeVideo(area);
    if (session && (video !== session.video || area !== session.area)) detach();
    if (video && !session) attach(video, area);
    refreshMenu();
  }
  function schedule() {
    if (!frame && enabled && !disposed) frame = requestAnimationFrame(reconcile);
  }
  const observer = new MutationObserver(records => {
    if (records.some(record => {
      const target = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
      if (!target || (target.closest('.fc-art-host') && target.tagName !== 'VIDEO')) return false;
      // Only source visibility/membership and the controls we bridge can change our session.
      // FC2 also animates comments and updates playback statistics in this subtree.
      if (target.closest('#js-player_controls')) return !!target.closest(bridgeSelector)
        || [...record.addedNodes, ...record.removedNodes].some(node =>
          node.nodeType === 1 && (node.matches(bridgeSelector) || node.querySelector(bridgeSelector)));
      if (record.type === 'attributes') return target.matches('video:not(.subVideo)')
        || !!target.querySelector('video:not(.subVideo)');
      return record.type === 'childList' && [...record.addedNodes, ...record.removedNodes].some(node =>
        node.nodeType === 1 && (node.matches(mediaSelector) || node.querySelector(mediaSelector)));
    })) schedule();
  });
  observer.observe(scope, { childList: true, subtree: true, attributes: true,
    attributeFilter: ['class', 'style', 'src', 'hidden', 'data-index', 'disabled'], characterData: true });
  for (const event of ['loadedmetadata', 'loadstart', 'emptied', 'play']) scope.addEventListener(event, schedule, true);
  function onPageHide(event) {
    if (event.persisted) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    for (const event of ['loadedmetadata', 'loadstart', 'emptied', 'play']) scope.removeEventListener(event, schedule, true);
    window.removeEventListener('pagehide', onPageHide);
    detach();
  }
  window.addEventListener('pagehide', onPageHide);
  function setEnabled(value) {
    enabled = value;
    if (enabled && typeof Artplayer !== 'function') {
      enabled = false;
      fc2Toast('ArtPlayer 依赖未加载，请更新脚本后刷新页面');
    }
    if (enabled) schedule();
    else detach();
    onModeChange(enabled);
  }
  setEnabled(enabled);
  return {
    toggle() {
      setEnabled(!enabled);
      setFc2Preferences({ nativePlayer: !enabled });
    }
  };
}
function mountFc2Room() {
  const root = document.documentElement;
  root.classList.add('creamu-fc2', 'creamu-fc2-room');
  const header = fc2El('div', { class: 'fc-app' }, fc2Header());
  document.querySelector('.js-wrap').before(header);
  const tools = fc2El('section', { class: 'fc-app fc-room-tools', 'aria-label': '观看布局与主播管理' });
  const heading = fc2El('div', { class: 'fc-room-heading' });
  const actions = fc2El('div', { class: 'fc-room-buttons' });
  const playerMode = fc2Button('原生播放器', () => player.toggle(), { title: '切换播放器界面，保留当前直播连接' });
  const player = mountFc2Player(enhanced => {
    playerMode.textContent = enhanced ? '原生播放器' : '增强播放器';
    playerMode.setAttribute('aria-label', enhanced ? '切换到原生播放器' : '切换到增强播放器');
  });
  const cinema = fc2Button('影院模式', () => {
    setFc2Preferences({ cinema: !readFc2Preferences().cinema });
    applyLayout();
  });
  const chat = fc2Button('收起聊天', () => {
    setFc2Preferences({ chatHidden: !readFc2Preferences().chatHidden });
    applyLayout();
  });
  const width = fc2El('input', { type: 'range', min: 280, max: 460, step: 20, 'aria-label': '聊天宽度' });
  width.value = readFc2Preferences().chatWidth;
  width.addEventListener('input', () => {
    setFc2Preferences({ chatWidth: Number(width.value) });
    applyLayout();
  });
  tools.append(heading, actions, fc2El('div', { class: 'fc-room-buttons' }, playerMode, cinema, chat,
    fc2El('label', { class: 'fc-width-control', text: '聊天宽度' }, width)));
  document.querySelector('.m-viewPlayer').before(tools);

  function applyLayout() {
    const prefs = readFc2Preferences();
    root.style.setProperty('--fc-chat-width', `${prefs.chatWidth}px`);
    root.classList.toggle('fc-chat-hidden', prefs.chatHidden);
    root.classList.toggle('fc-cinema', prefs.cinema);
    cinema.setAttribute('aria-pressed', String(prefs.cinema));
    chat.setAttribute('aria-pressed', String(prefs.chatHidden));
    chat.textContent = prefs.chatHidden ? '展开聊天' : '收起聊天';
    // FC2 recalculates canvas/overlay geometry on resize; never replace the video node.
    window.dispatchEvent(new Event('resize'));
  }
  let lastSignature = '';
  let recorded = false;
  function updateInfo() {
    const channel = readFc2Room();
    if (!channel) return;
    const signature = JSON.stringify([channel.name, channel.title, channel.image]);
    if (signature === lastSignature) return;
    lastSignature = signature;
    heading.replaceChildren(fc2El('strong', { text: channel.title || '直播间' }),
      fc2El('span', { text: `${channel.name} · ${channel.id}` }));
    renderActions();
    if (!recorded && channel.title) {
      recorded = true;
      updateFc2Record(channel, { visitedAt: Date.now() });
    }
  }
  function renderActions() {
    const channel = readFc2Room();
    if (channel) actions.replaceChildren(...fc2ChannelActions(channel));
  }
  document.addEventListener('creamu-fc2-library', renderActions);
  const info = document.getElementById('js-live_info');
  const observer = new MutationObserver(updateInfo);
  if (info) observer.observe(info, { subtree: true, childList: true, characterData: true });
  updateInfo();
  applyLayout();
}
function bootCreamuFc2() {
  if (window.self === window.top && location.pathname === '/' && new URLSearchParams(location.search).get('creamu') === 'multi') {
    installFc2Theme();
    initFc2Sync();
    mountFc2Workbench();
    mountFc2Multiview();
    return true;
  }
  const directory = /^\/(?:adult\/?)?$/.test(location.pathname) && document.getElementById('live-list');
  const room = /^\/(?:2_)?[1-9]\d*\/?$/.test(location.pathname)
    && document.querySelector('.m-viewPlayer #js-video_area') && document.querySelector('.js-wrap');
  // Leave account/payment pages and the site's age/consent entry screens with their native UI.
  if (!directory && !room) return false;
  installFc2Theme();
  if (!readFc2Preferences().enabled) {
    document.body.prepend(fc2El('div', { class: 'fc-restore' },
      '当前使用 FC2 原站布局',
      fc2Button('恢复 Creamu 布局', () => {
        setFc2Preferences({ enabled: true });
        location.reload();
      })));
    return true;
  }
  if (!document.querySelector('meta[name="viewport"]')) {
    document.head.append(fc2El('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1' }));
  }
  initFc2Sync();
  mountFc2Workbench();
  if (directory) mountFc2Directory();
  else mountFc2Room();
  return true;
}

function startCreamuFc2() {
  if (!/^\/(?:(?:adult\/?)|(?:(?:2_)?[1-9]\d*\/?))?$/.test(location.pathname)) return;
  if (bootCreamuFc2()) return;
  // FC2 creates its player asynchronously. Observe readiness instead of abandoning a cold entry.
  const observer = new MutationObserver(() => {
    if (bootCreamuFc2()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('pagehide', event => { if (!event.persisted) observer.disconnect(); }, { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startCreamuFc2, { once: true });
} else {
  startCreamuFc2();
}
})();
