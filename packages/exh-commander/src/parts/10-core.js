  const VERSION = '0.9.61';
  const NS = 'exh-commander';
  const DB_NAME = 'exh_commander_db';
  const DB_VERSION = 2;
  const GM_CFG_KEY = 'exh_commander_config_v1';
  const GM_SESSION_KEY = 'exh_commander_session_v1';
  const WORKBENCH_PAGE_UI_KEY = 'exc_wb_page_ui_v1';
  const GM_LRR_META_KEY = 'exh_commander_lrr_meta_v1';
  const GM_SEEN_GIDS_KEY = 'exh_commander_seen_gids_v1';
  const GM_TRACKING_REV_KEY = 'exh_commander_tracking_rev_v1';

  /** 本机专用配置，不进 WebDAV / 备份的 config 段 */
  const CONFIG_LOCAL_ONLY_KEYS = [
    'gallery_thumb_scale',
    'workbench_width',
    'workbench_default_open',
    'list_hover_preview',
    'list_hover_preview_count',
    'list_hover_preview_delay_ms',
  ];

  /** 本机密钥：vault/备份可带，但空值不得覆盖本机已存值 */
  const CONFIG_SECRET_KEYS = ['webdav_password', 'lrr_api_key'];

  const FOLD_PRIMARY_MODES = {
    preference: '偏好最佳（语言→码级→体积→汉化组→页数）',
    newest: '最新上传',
    list_order: '列表原序（页面里更靠前）',
  };

  const DEFAULT_CONFIG = {
    version: VERSION,
    lrr_base_url: '',
    lrr_api_key: '',
    lrr_sync_interval_min: 60,
    /** 熟人：手动维护的画师 / 团队（汉化组）；另加 LRR 同步自动汇总 */
    custom_artists: [],
    custom_groups: [],
    lang_order: ['zh', 'ja', 'en', 'other'],
    group_whitelist: [],
    group_blacklist: [],
    censor_order: ['uncensored', 'light', 'heavy', 'unknown'],
    /** 库内对照：页数容差 ≈ max(min, min(页数)*ratio)，默认约 10 页容 1 页 */
    pages_tolerance_ratio: 0.1,
    pages_tolerance_min: 1,
    pages_tolerance_max: 25,
    /** 体积容差 ≈ max(minBytes, max(体积)*ratio) */
    size_tolerance_ratio: 0.12,
    size_tolerance_min_bytes: 1 * 1024 * 1024,
    /** 页均体积容差：删广告后总页/总积变了，但 bpp 接近仍算打包一致 */
    bpp_tolerance_ratio: 0.2,
    auto_cluster: true,
    cluster_threshold: 0.82,
    auto_link_structural: true,
    structural_link_threshold: 0.9,
    badge_default: 'work',
    workbench_default_open: false,
    workbench_width: 420,
    list_fold_works: true,
    /** preference | newest | list_order */
    fold_primary_mode: 'preference',
    fav_tags: [],
    hate_tags: [],
    block_uploaders: [],
    block_languages: [],
    block_categories: [],
    block_title_keywords: [],
    block_censor: [],
    hide_blocked: true,
    /** 列表点画廊：新标签打开（站点默认本页） */
    list_open_in_new_tab: false,
    /** 列表封面左上角展示重点标签（artist/group/parody/female…） */
    list_show_tag_stream: true,
    list_tag_stream_max: 3,
    open_best_in_new_tab: true,
    theme_accent: '#ff4400',
    cream_site_theme: false,
    /** 画廊 #gdt 缩略倍率（相对原尺寸；不增删张数） */
    gallery_thumb_scale: 1.5,
    /** 列表悬停：拉画廊页前几张缩略，快速扫内容 */
    list_hover_preview: true,
    list_hover_preview_count: 4,
    list_hover_preview_delay_ms: 1000,
    /** 追更检查更新：每条请求间隔（ms），默认 5～10 秒防限流 */
    tracking_check_interval_min_ms: 5000,
    tracking_check_interval_max_ms: 10000,
    /** 检查更新从首页向后翻到断点的最大页数 */
    tracking_unread_scan_max_pages: 12,
    webdav_enabled: false,
    webdav_url: 'https://dav.jianguoyun.com/dav/',
    webdav_user: '',
    webdav_password: '',
    webdav_path: '/Creamu',
    webdav_auto: false,
    webdav_conflict: 'ask',
  };

  let config = Object.assign({}, DEFAULT_CONFIG);
  let db = null;
  let bootReady = false;

  function compactText(v) {
    return String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  function nowMs() {
    return Date.now();
  }

  function safeJsonParse(text, fallback) {
    try {
      return JSON.parse(text);
    } catch (_) {
      return fallback;
    }
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function loadConfig() {
    const raw = typeof GM_getValue === 'function' ? GM_getValue(GM_CFG_KEY, null) : null;
    const saved = typeof raw === 'string' ? safeJsonParse(raw, null) : raw;
    config = Object.assign({}, DEFAULT_CONFIG, saved && typeof saved === 'object' ? saved : {});
    if (!Array.isArray(config.lang_order) || !config.lang_order.length) {
      config.lang_order = DEFAULT_CONFIG.lang_order.slice();
    }
    if (!Array.isArray(config.censor_order) || !config.censor_order.length) {
      config.censor_order = DEFAULT_CONFIG.censor_order.slice();
    }
    if (!['preference', 'newest', 'list_order'].includes(config.fold_primary_mode)) {
      config.fold_primary_mode = DEFAULT_CONFIG.fold_primary_mode;
    }
    config.gallery_thumb_scale = clampGalleryThumbScale(config.gallery_thumb_scale);
    config.list_hover_preview = config.list_hover_preview !== false;
    config.list_hover_preview_count = clampHoverPreviewCount(config.list_hover_preview_count);
    config.list_hover_preview_delay_ms = clampHoverPreviewDelay(config.list_hover_preview_delay_ms);
    {
      let lo = Math.floor(Number(config.tracking_check_interval_min_ms));
      let hi = Math.floor(Number(config.tracking_check_interval_max_ms));
      if (!Number.isFinite(lo) || lo < 2000) lo = DEFAULT_CONFIG.tracking_check_interval_min_ms;
      if (!Number.isFinite(hi) || hi < lo) hi = Math.max(lo, DEFAULT_CONFIG.tracking_check_interval_max_ms);
      config.tracking_check_interval_min_ms = Math.min(60000, lo);
      config.tracking_check_interval_max_ms = Math.min(120000, Math.max(config.tracking_check_interval_min_ms, hi));
      let maxP = Math.floor(Number(config.tracking_unread_scan_max_pages));
      if (!Number.isFinite(maxP) || maxP < 1) maxP = DEFAULT_CONFIG.tracking_unread_scan_max_pages;
      config.tracking_unread_scan_max_pages = Math.min(40, Math.max(1, maxP));
    }
    [
      'group_whitelist',
      'group_blacklist',
      'custom_artists',
      'custom_groups',
      'fav_tags',
      'hate_tags',
      'list_open_in_new_tab',
      'list_show_tag_stream',
      'list_tag_stream_max',
      'block_uploaders',
      'block_languages',
      'block_categories',
      'block_title_keywords',
      'block_censor',
    ].forEach((k) => {
      if (!Array.isArray(config[k])) config[k] = [];
    });
    return config;
  }

  /** 详情缩略倍率：1.0～2.0，步进 0.05 */
  function clampGalleryThumbScale(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return DEFAULT_CONFIG.gallery_thumb_scale;
    const clamped = Math.min(2, Math.max(1, n));
    return Math.round(clamped * 20) / 20;
  }

  function clampHoverPreviewCount(v) {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n)) return DEFAULT_CONFIG.list_hover_preview_count;
    return Math.min(8, Math.max(3, n));
  }

  /** 悬停延迟：500～5000ms，对齐设置分档 */
  function clampHoverPreviewDelay(v) {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n)) return DEFAULT_CONFIG.list_hover_preview_delay_ms;
    return Math.min(5000, Math.max(500, n));
  }

  function markCreamuLocalDirty() {
    try {
      if (typeof ensureCreamuSync === 'function') {
        const sync = ensureCreamuSync();
        if (sync && typeof sync.markLocalDirty === 'function') sync.markLocalDirty();
      }
    } catch (_) { /* ignore */ }
  }

  function pickConfigLocalOnly(src) {
    const out = {};
    const base = src && typeof src === 'object' ? src : config;
    CONFIG_LOCAL_ONLY_KEYS.forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    });
    return out;
  }

  /** 导出用 config：去掉本机专用字段 */
  function cloneConfigForSync() {
    const cfg = deepClone(config);
    CONFIG_LOCAL_ONLY_KEYS.forEach((k) => {
      delete cfg[k];
    });
    return cfg;
  }

  /** 导入/拉取：本机显示类配置不被覆盖；密钥空值保留本机 */
  function mergeConfigFromImport(incoming, current) {
    const src = incoming && typeof incoming === 'object' ? incoming : {};
    const live = current && typeof current === 'object' ? current : config;
    const next = Object.assign({}, src, pickConfigLocalOnly(live));
    CONFIG_SECRET_KEYS.forEach((k) => {
      const incomingVal = src[k] == null ? '' : String(src[k]);
      const liveVal = live[k] == null ? '' : String(live[k]);
      next[k] = incomingVal || liveVal;
    });
    return next;
  }

  function saveConfig(patch) {
    if (patch && typeof patch === 'object') {
      Object.assign(config, patch);
    }
    config.version = VERSION;
    if (typeof GM_setValue === 'function') {
      GM_setValue(GM_CFG_KEY, JSON.stringify(config));
    }
    markCreamuLocalDirty();
    return config;
  }

  let workbenchSessionCache = null;

  function isWorkbenchDomOpen() {
    try {
      const wb = typeof document !== 'undefined' ? document.getElementById('jlc-wb') : null;
      return !!(wb && wb.classList && wb.classList.contains('is-open'));
    } catch (_) {
      return false;
    }
  }

  function getWorkbenchPageInstanceId() {
    try {
      const name = String(window.name || '');
      if (name.startsWith('exc-wb:')) return name.slice(7);
    } catch (_) { /* ignore */ }
    return '';
  }

  function readStoredWorkbenchPageUi() {
    try {
      const raw = sessionStorage.getItem(WORKBENCH_PAGE_UI_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function assignWorkbenchPageInstanceId(id) {
    const nextId = compactText(id || '');
    if (!nextId) return '';
    try {
      const current = String(window.name || '');
      if (!current || current.startsWith('exc-wb:')) window.name = 'exc-wb:' + nextId;
    } catch (_) { /* ignore */ }
    return getWorkbenchPageInstanceId() || nextId;
  }

  function ensureWorkbenchPageInstanceId() {
    const stored = readStoredWorkbenchPageUi();
    const storedId = compactText(stored && stored.pageId);
    // 本标签已有开合记录：window.name 被 GM_openInTab / 后台回收清掉时，写回去，不要当成新标签
    if (storedId) return assignWorkbenchPageInstanceId(storedId);
    // 新标签常会抄到 opener 的 window.name；没有本页记录就另起身份，避免和原页撞名
    const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    return assignWorkbenchPageInstanceId(id);
  }

  function readWorkbenchPageUi() {
    try {
      const parsed = readStoredWorkbenchPageUi();
      if (!parsed) return { open: false };
      const storedId = compactText(parsed.pageId);
      let pageId = getWorkbenchPageInstanceId();
      if (!pageId && storedId) pageId = assignWorkbenchPageInstanceId(storedId);
      if (pageId && storedId && storedId !== pageId) return { open: false };
      return { open: parsed.open === true };
    } catch (_) {
      return { open: false };
    }
  }

  function writeWorkbenchPageUi(open) {
    try {
      sessionStorage.setItem(
        WORKBENCH_PAGE_UI_KEY,
        JSON.stringify({
          pageId: ensureWorkbenchPageInstanceId(),
          open: !!open,
        })
      );
    } catch (_) { /* private mode / blocked storage */ }
  }

  function loadSession() {
    if (workbenchSessionCache) {
      if (isWorkbenchDomOpen()) workbenchSessionCache.open = true;
      return workbenchSessionCache;
    }
    const raw = typeof GM_getValue === 'function' ? GM_getValue(GM_SESSION_KEY, null) : null;
    const saved = typeof raw === 'string' ? safeJsonParse(raw, null) : raw;
    const base = {
      // 默认收起；与 JLC 一致，避免一进站就弹工作台
      open: false,
      width: DEFAULT_CONFIG.workbench_width,
      tab: 'library',
      query: '',
      scrollTop: 0,
      session_version: 2,
    };
    const next = Object.assign({}, base, saved && typeof saved === 'object' ? saved : {});
    // 旧会话默认 open=true：升级时先收起一次
    const prevVer = Number(saved && saved.session_version);
    if (!Number.isFinite(prevVer) || prevVer < 2) {
      next.session_version = 2;
    } else {
      next.session_version = Math.max(2, prevVer);
    }
    // 开合只属于当前标签：活着的面板优先，否则读本页 sessionStorage
    next.open = isWorkbenchDomOpen() || readWorkbenchPageUi().open === true;
    workbenchSessionCache = next;
    return next;
  }

  function saveSession(session) {
    const current = session || workbenchSessionCache || {};
    if (isWorkbenchDomOpen()) current.open = true;
    workbenchSessionCache = current;
    writeWorkbenchPageUi(current.open === true);
    if (typeof GM_setValue === 'function') {
      // 共享存储始终写成收起，避免追更开出的新页把面板带过去/带回来
      GM_setValue(GM_SESSION_KEY, JSON.stringify(Object.assign({}, current, { open: false })));
    }
  }

  function loadLrrMeta() {
    const raw = typeof GM_getValue === 'function' ? GM_getValue(GM_LRR_META_KEY, null) : null;
    const saved = typeof raw === 'string' ? safeJsonParse(raw, null) : raw;
    return Object.assign(
      {
        last_sync: 0,
        last_count: 0,
        last_error: '',
        familiar_artists: [],
        familiar_groups: [],
      },
      saved && typeof saved === 'object' ? saved : {}
    );
  }

  function saveLrrMeta(meta) {
    if (typeof GM_setValue === 'function') {
      // 合并写入，避免只更新 last_sync 时冲掉 familiar_*
      const next = Object.assign({}, loadLrrMeta(), meta && typeof meta === 'object' ? meta : {});
      GM_setValue(GM_LRR_META_KEY, JSON.stringify(next));
      markCreamuLocalDirty();
    }
  }

  /** 浏览过的 gid（列表「已点」描边/轻压暗用）— 进备份/WebDAV */
  function loadSeenGids() {
    const raw = typeof GM_getValue === 'function' ? GM_getValue(GM_SEEN_GIDS_KEY, null) : null;
    const saved = typeof raw === 'string' ? safeJsonParse(raw, null) : raw;
    return saved && typeof saved === 'object' ? saved : {};
  }

  function saveSeenGids(map) {
    if (typeof GM_setValue !== 'function') return;
    GM_setValue(GM_SEEN_GIDS_KEY, JSON.stringify(map && typeof map === 'object' ? map : {}));
    markCreamuLocalDirty();
  }

  function markGallerySeen(gid) {
    const id = String(gid || '');
    if (!id || typeof GM_setValue !== 'function') return;
    const map = loadSeenGids();
    map[id] = nowMs();
    // 全量保留「已点」记录，不裁剪
    saveSeenGids(map);
  }

  function isGallerySeen(gid) {
    const id = String(gid || '');
    if (!id) return false;
    return !!loadSeenGids()[id];
  }

  const STATUS_LABELS = {
    none: '无',
    want: '想看',
    reading: '在读',
    read: '已读',
    dropped: '抛弃',
  };

  function openUrlInNewTab(url) {
    const href = compactText(url);
    if (!href) return false;
    try {
      if (typeof GM_openInTab === 'function') {
        GM_openInTab(href, { active: true, insert: true, setParent: true });
        return true;
      }
    } catch (_) { /* fall through */ }
    try {
      if (typeof document !== 'undefined' && document.body) {
        const anchor = document.createElement('a');
        anchor.href = href;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        return true;
      }
    } catch (_) { /* fall through */ }
    try {
      return !!(typeof window !== 'undefined' && window.open(href, '_blank', 'noopener,noreferrer'));
    } catch (_) {
      return false;
    }
  }

  function gmRequest(options) {
    return new Promise((resolve, reject) => {
      function fallbackFetch(origErr) {
        if (typeof fetch === 'function' && options && options.url) {
          fetch(options.url, {
            method: options.method || 'GET',
            headers: options.headers || {},
            body: options.data,
            credentials: 'include',
          })
            .then(async (res) => {
              const text = await res.text();
              resolve({
                status: res.status,
                statusText: res.statusText,
                responseText: text,
                response: text,
              });
            })
            .catch(() => reject(origErr || new Error('network error')));
        } else {
          reject(origErr || new Error('network error'));
        }
      }

      if (typeof GM_xmlhttpRequest === 'function') {
        try {
          GM_xmlhttpRequest({
            method: options.method || 'GET',
            url: options.url,
            headers: options.headers || {},
            data: options.data,
            timeout: options.timeout || 20000,
            responseType: options.responseType || 'text',
            onload(res) {
              resolve(res);
            },
            onerror(err) {
              fallbackFetch(err);
            },
            ontimeout() {
              fallbackFetch(new Error('timeout'));
            },
          });
        } catch (e) {
          fallbackFetch(e);
        }
      } else {
        fallbackFetch(new Error('GM_xmlhttpRequest unavailable'));
      }
    });
  }

  function showToast(msg, ms) {
    let host = document.getElementById('exc-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'exc-toast-host';
      document.body.appendChild(host);
    }
    const el = document.createElement('div');
    el.className = 'exc-toast';
    el.textContent = String(msg || '');
    host.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 280);
    }, ms || 2600);
  }
