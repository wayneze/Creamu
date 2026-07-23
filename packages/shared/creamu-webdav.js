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

  /** Basic Auth：兼容非 ASCII 用户名/密码 */
  function creamuWdBasicAuth(user, pass) {
    const raw = String(user == null ? '' : user) + ':' + String(pass == null ? '' : pass);
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
      if (!m.device_id) m.device_id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      m.local_revision = Number(m.local_revision) || 0;
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
      return {
        enabled: !!s.enabled,
        url: creamuWdCompact(s.url || ''),
        user: creamuWdCompact(s.user || ''),
        password: String(s.password == null ? '' : s.password),
        path: creamuWdNormDir(s.path),
        auto: s.auto !== false,
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
          Authorization: creamuWdBasicAuth(st.user, st.password),
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
      return st.user + ' · ' + vaultRelPath() + ' · rev ' + m.local_revision + ' · 上次 ' + when + en + err;
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
      if (res.status === 401 || res.status === 403) {
        throw new Error('认证失败，请检查用户名与应用密码（坚果云需用应用密码）');
      }
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
      if (res.status === 401 || res.status === 403) {
        throw new Error('认证失败，请检查用户名与应用密码（坚果云需用应用密码）');
      }
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
      if (res.status === 401 || res.status === 403) {
        throw new Error('认证失败，请检查用户名与应用密码（坚果云需用应用密码）');
      }
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
            retryCount++;
            if (retryCount <= 5) schedulePush(Math.min(60000, 2000 * 2 ** (retryCount - 1)));
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
      m.dirty = false;
      m.last_sync = Date.now();
      m.last_action = 'pull';
      m.last_error = '';
      saveMeta(m);
    }

    async function pushVault() {
      const m = loadMeta();
      const rev = Math.max(1, Number(m.local_revision) || 1);
      const vault = await buildVault(rev);
      await uploadVault(vault);
      const latest = loadMeta();
      const changedDuringPush = Number(latest.local_revision) > rev;
      latest.dirty = changedDuringPush;
      latest.local_revision = Math.max(rev, Number(latest.local_revision) || 0);
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
          const m0 = loadMeta();
          m0.local_revision = Math.max(1, Number(m0.local_revision) || 0) + (m0.dirty ? 0 : 1);
          m0.dirty = true;
          saveMeta(m0);
          await pushVault();
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

        if (remoteRev > localRev) {
          if (m.dirty && stConflictAsk()) {
            const ok =
              typeof confirm === 'function'
                ? confirm(
                    '云端 revision ' +
                      remoteRev +
                      ' 新于本地 ' +
                      localRev +
                      '，且本地有未同步修改。\n确定用云端覆盖本机？\n（取消则改为推送本机）'
                  )
                : true;
            if (!ok) {
              m.local_revision = remoteRev + 1;
              saveMeta(m);
              await pushVault();
              notify('已用本机覆盖云端');
              return { action: 'push' };
            }
          } else if (m.dirty && settings().conflict === 'local') {
            m.local_revision = remoteRev + 1;
            saveMeta(m);
            await pushVault();
            notify('冲突策略：已推送本机');
            return { action: 'push' };
          }
          await applyRemote(remote);
          notify('已从云端更新到 rev ' + remoteRev);
          return { action: 'pull' };
        }

        if (remoteRev < localRev || m.dirty) {
          if (remoteRev === localRev && m.dirty) {
            m.local_revision = localRev + 1;
            saveMeta(m);
          }
          await pushVault();
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

    function stConflictAsk() {
      return settings().conflict === 'ask';
    }

    async function bootSync() {
      const st = settings();
      if (!st.enabled || !st.auto || !isConfigured()) return null;
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
