  const VERSION = '0.9.53';
  const NS = 'exh-commander';
  const DB_NAME = 'exh_commander_db';
  const DB_VERSION = 2;
  const GM_CFG_KEY = 'exh_commander_config_v1';
  const GM_SESSION_KEY = 'exh_commander_session_v1';
  const GM_LRR_META_KEY = 'exh_commander_lrr_meta_v1';
  const GM_SEEN_GIDS_KEY = 'exh_commander_seen_gids_v1';

  /** 本机专用配置，不进 WebDAV / 备份的 config 段 */
  const CONFIG_LOCAL_ONLY_KEYS = [
    'gallery_thumb_scale',
    'workbench_width',
    'workbench_default_open',
    'list_hover_preview',
    'list_hover_preview_count',
    'list_hover_preview_delay_ms',
  ];

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
    /**
     * 检查更新时是否跨页精确数未读（慢）。
     * false（默认）：只拉首页；断点不在首页则用断点页码估算。
     * true：从首页向后扫到断点（page=/next=）。
     */
    tracking_unread_deep_scan: false,
    /** 深度扫描最大页数（仅 deep_scan 开启时） */
    tracking_unread_scan_max_pages: 12,
    webdav_enabled: false,
    webdav_url: 'https://dav.jianguoyun.com/dav/',
    webdav_user: '',
    webdav_password: '',
    webdav_path: '/Creamu',
    webdav_auto: true,
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
      config.tracking_unread_deep_scan = config.tracking_unread_deep_scan === true;
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

  function loadSession() {
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
      next.open = false;
      next.session_version = 2;
    } else {
      next.open = next.open === true;
      next.session_version = Math.max(2, prevVer);
    }
    return next;
  }

  function saveSession(session) {
    if (typeof GM_setValue === 'function') {
      GM_setValue(GM_SESSION_KEY, JSON.stringify(session || {}));
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

  function gmRequest(options) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== 'function') {
        reject(new Error('GM_xmlhttpRequest unavailable'));
        return;
      }
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
          reject(err || new Error('network error'));
        },
        ontimeout() {
          reject(new Error('timeout'));
        },
      });
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

  function injectBaseStyles() {
    if (typeof injectCreamuWorkbenchStyles !== 'function') {
      console.warn('[Creamu·ExH] shared workbench CSS missing — rebuild with packages/shared/creamu-workbench-css.js');
      return;
    }
    // 工作台样式唯一来源：JLC 同款 shared；下面只挂 ExH 页内扩展
    injectCreamuWorkbenchStyles({
      styleId: 'jlc-wb-style-exc',
      extraCss: `
/* list cover / card badge */
        .exc-cover-host { position: relative !important; }
        .exc-gl-item.exc-card-badge-host,
        .exc-gl-item { position: relative !important; }
        .exc-gl-item .exc-cover-host,
        .exc-gl-item .glthumb,
        .exc-gl-item td.gl1e,
        .exc-gl-item .gl3t { position: relative; }
        /* 状态徽章：卡片框左上（在库/熟人/心动…） */
        .exc-badge-container {
            position: absolute; top: 4px; left: 4px; display: flex;
            flex-direction: column; gap: 3px; z-index: 30; pointer-events: none;
            max-width: min(94%, 168px);
        }
        /* 标签流：卡片框左下，与上徽章分开 */
        .exc-tag-stream {
            position: absolute; bottom: 4px; left: 4px; display: flex;
            flex-direction: column; gap: 3px; z-index: 30; pointer-events: none;
            max-width: min(94%, 168px);
            align-items: flex-start;
        }
        .gl1t.exc-gl-item > .exc-badge-container {
            top: 6px; left: 6px;
        }
        .gl1t.exc-gl-item > .exc-tag-stream {
            bottom: 6px; left: 6px;
        }
        tr.exc-gl-item > .exc-badge-container {
            top: 4px; left: 4px;
        }
        tr.exc-gl-item > .exc-tag-stream {
            bottom: 4px; left: 4px;
        }
        .exc-meta-overlay {
            display: flex; flex-direction: column; align-items: flex-start; gap: 3px;
            max-width: 160px; pointer-events: none;
        }
        /* 奶油系胶囊（对齐工作台 jlc-status-pill，避免黑底块） */
        .meta-tag {
            display: inline-block; padding: 2px 8px; border-radius: 999px;
            background: rgba(255,253,248,.94); color: #5a4030;
            border: 1px solid #e0cdae;
            font-size: 11px; font-weight: 700; line-height: 1.25;
            box-shadow: 0 2px 6px rgba(90,60,30,.12);
            text-shadow: none; white-space: nowrap;
            max-width: 100%; overflow: hidden; text-overflow: ellipsis;
        }
        .meta-tag.hot {
            background: linear-gradient(135deg, #e8a24e, #d4883a) !important;
            color: #fff !important; border-color: transparent !important;
            box-shadow: 0 2px 0 #b56e28, 0 4px 10px rgba(212,136,58,.28);
        }
        .meta-tag.more {
            background: rgba(255,250,242,.9) !important; color: #8a6f55 !important;
            border-color: #e4d4bc !important;
        }
        .meta-tag.ok {
            background: #e2f5e4 !important; color: #2f6b3a !important;
            border-color: #b7dfbf !important;
        }
        /* LRR 熟人：画师 / 团队（对齐 JLC 熟人蓝徽章） */
        .meta-tag.familiar,
        .meta-tag.familiar-artist {
            background: linear-gradient(135deg, #5b8fd9, #3a6fbf) !important;
            color: #fff !important; border-color: transparent !important;
            box-shadow: 0 2px 0 #2a528f, 0 4px 10px rgba(58,111,191,.28);
        }
        .meta-tag.familiar-group {
            background: linear-gradient(135deg, #5aaf7a, #3d8f52) !important;
            color: #fff !important; border-color: transparent !important;
            box-shadow: 0 2px 0 #2a6b3a, 0 4px 10px rgba(61,143,82,.26);
        }
        .meta-tag.warn {
            background: #fde2df !important; color: #b42318 !important;
            border-color: #f0b8b2 !important;
        }
        .meta-tag.maybe {
            background: #fff4db !important; color: #9a6700 !important;
            border-color: #f0d7a0 !important; border-style: dashed !important;
        }
        /* 标签流：近乎无底，靠描边+轻阴影辨认，避免白底糊住封面 */
        .meta-tag.stream {
            background: rgba(40,28,18,.28) !important;
            color: #fffdf8 !important;
            border: 1px solid rgba(255,253,248,.35) !important;
            font-weight: 650 !important;
            font-size: 10.5px !important;
            max-width: 140px;
            text-shadow: 0 1px 2px rgba(0,0,0,.55);
            box-shadow: none !important;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
        }
        /* 普通状态胶囊也别用实心白 */
        .exc-badge-container .meta-tag:not(.hot):not(.familiar):not(.familiar-artist):not(.familiar-group):not(.ok):not(.warn):not(.stream) {
            background: rgba(40,28,18,.32) !important;
            color: #fffdf8 !important;
            border-color: rgba(255,253,248,.3) !important;
            text-shadow: 0 1px 2px rgba(0,0,0,.5);
            box-shadow: none !important;
        }
        .exc-badge-container .meta-tag.hot {
            background: rgba(212,136,58,.55) !important;
            border-color: rgba(255,220,160,.4) !important;
            box-shadow: none !important;
        }
        .exc-badge-container .meta-tag.familiar,
        .exc-badge-container .meta-tag.familiar-artist {
            background: rgba(58,111,191,.55) !important;
            border-color: rgba(180,210,255,.4) !important;
            box-shadow: none !important;
        }
        .exc-badge-container .meta-tag.familiar-group {
            background: rgba(61,143,82,.55) !important;
            border-color: rgba(180,230,190,.4) !important;
            box-shadow: none !important;
        }
        .exc-badge-container .meta-tag.ok {
            background: rgba(47,107,58,.5) !important;
            color: #e8ffe8 !important;
            border-color: rgba(180,230,190,.4) !important;
            box-shadow: none !important;
        }
        .exc-badge-container .meta-tag.more {
            background: rgba(40,28,18,.22) !important;
            color: rgba(255,253,248,.85) !important;
            border-color: rgba(255,253,248,.25) !important;
            box-shadow: none !important;
        }
        .exc-gl-item.is-exc-familiar .exc-cover-host {
            outline: 2px solid rgba(58,111,191,.45);
            outline-offset: -2px;
        }
        .meta-tag.exc-meta-act {
            pointer-events: auto !important;
            cursor: pointer;
            appearance: none;
            font: inherit;
            margin: 0;
            text-align: left;
            max-width: 100%;
        }
        .meta-tag.exc-meta-act:hover {
            border-color: #e8a24e !important;
            color: #fff !important;
        }
        .exc-meta-overlay .exc-meta-act { pointer-events: auto; }
        .exc-tool-bar {
            position: absolute; right: 4px; bottom: 4px; z-index: 21;
            display: flex; gap: 2px; align-items: center;
            padding: 3px 4px; border-radius: 8px;
            background: rgba(20,16,12,.55); backdrop-filter: blur(2px);
        }
        .exc-tool-btn {
            display: inline-flex; align-items: center; justify-content: center;
            width: 22px; height: 22px; margin: 0; padding: 0; border: 0;
            background: transparent; color: #f5efe6; cursor: pointer;
            opacity: .45; font-size: 13px; line-height: 1;
            transition: transform .15s ease, opacity .15s ease, color .15s ease;
        }
        .exc-tool-btn:hover { opacity: 1; transform: scale(1.1); color: #e8a24e; }
        .exc-tool-btn.is-on { opacity: 1; color: #e8a24e; text-shadow: 0 0 8px rgba(232,162,78,.45); }
        .exc-tool-btn.is-bp { opacity: 1; color: #ff8a7a; font-weight: 800; text-shadow: 0 0 8px rgba(255,95,86,.4); }
        .exc-tool-btn.is-want { opacity: 1; color: #7dd3fc; text-shadow: 0 0 8px rgba(125,211,252,.4); }
        /* 断点作品：洋红描边，别跟点过/库内/心动混 */
        .exc-gl-item.is-exc-breakpoint {
            outline: 2px solid rgba(232, 72, 90, 0.95) !important;
            outline-offset: -2px;
            box-shadow: 0 0 0 1px rgba(232, 72, 90, 0.25), 0 6px 16px rgba(180, 40, 50, 0.15) !important;
        }
        tr.exc-gl-item.is-exc-breakpoint > td.gl1e {
            box-shadow: inset 3px 0 0 #e8485a !important;
        }
        #jlc-wb .jlc-wb-item-menu.is-fixed-menu {
            position: fixed !important;
            z-index: 1000200 !important;
            top: auto;
            bottom: auto;
            right: auto;
            min-width: 140px;
        }
        #jlc-wb .jlc-wb-item-pills {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
            align-items: center !important;
        }
        #jlc-wb .jlc-wb-item-pills > span {
            flex: 0 0 auto !important;
            margin: 0 !important;
        }
        #jlc-wb .jlc-wb-item-title-row {
            display: flex !important;
            align-items: flex-start !important;
            gap: 8px !important;
        }
        #jlc-wb .jlc-wb-item-title {
            flex: 1 1 auto !important;
            min-width: 0 !important;
        }
        #jlc-wb .jlc-wb-leaf {
            flex: 0 0 auto !important;
            margin-left: auto !important;
        }
        /* 追更条：继续断点永远视觉最重、最靠前 */
        #exc-tracking-bar .exc-track-actions {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
            align-items: center !important;
        }
        #exc-tracking-bar .exc-bp-continue {
            order: -1 !important;
        }
        
        .exc-fold-tag {
            pointer-events: auto !important;
            cursor: pointer;
            appearance: none;
            font: inherit;
            margin: 0;
            max-width: 100%;
            border: 1px solid #e0cdae !important;
            background: rgba(255,253,248,.94) !important;
            color: #5a4030 !important;
        }
        .exc-fold-tag:hover {
            border-color: #d4bc96 !important;
            background: #fff !important;
            color: #4a3728 !important;
        }
        .exc-fold-tag.hot {
            background: linear-gradient(135deg, #e8a24e, #d4883a) !important;
            color: #fff !important;
            border-color: transparent !important;
        }
        .exc-meta-overlay { pointer-events: none; }
        .exc-meta-overlay .exc-fold-tag { pointer-events: auto; }

        .exc-tool-btn.is-block { opacity: 1; color: #ff6666; }
        .exc-gl-item .exc-enhance-host { display: none !important; }
        .exc-gl-item.is-exc-blocked { outline: 2px solid rgba(180,35,24,.4); outline-offset: -2px; opacity: .45; }
        .exc-gl-item.is-exc-blocked.exc-hide { display: none !important; }
        .exc-gl-item.is-exc-folded-child { display: none !important; }
        /* page chrome */
        #exc-toast-host {
            position: fixed; z-index: 1000001; right: 24px; bottom: 90px;
            display: flex; flex-direction: column; gap: 8px; pointer-events: none;
        }
        .exc-toast {
            background: #fffdf8; color: #4a3728; border: 1px solid #e4d4bc; border-left: 4px solid #d4883a;
            border-radius: 14px; padding: 12px 14px; font: 13.5px/1.45 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            box-shadow: 0 10px 28px rgba(90,60,30,.18); max-width: 360px;
            transition: opacity .25s, transform .25s;
        }
        .exc-toast.is-out { opacity: 0; transform: translateY(8px); }

        /* 列表悬停预览 */
        #exc-hover-preview {
            position: fixed; z-index: 1000000; display: none;
            max-width: min(520px, calc(100vw - 16px));
            padding: 10px 12px 12px; border-radius: 16px;
            background: #fffdf8; color: #4a3728;
            border: 1px solid #e4d4bc;
            box-shadow: 0 14px 36px rgba(90,60,30,.22), 0 3px 0 #ead7bb;
            font: 12.5px/1.35 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            pointer-events: auto;
        }
        #exc-hover-preview.is-open { display: block; }
        #exc-hover-preview .exc-hp-head {
            display: flex; align-items: center; justify-content: space-between; gap: 8px;
            margin-bottom: 8px; font-weight: 750; color: #6b4a2e;
        }
        #exc-hover-preview .exc-hp-head a {
            color: #8a5a20; text-decoration: none; font-weight: 700; font-size: 11.5px;
        }
        #exc-hover-preview .exc-hp-head a:hover { color: #d4883a; }
        #exc-hover-preview .exc-hp-status { font-size: 11.5px; color: #9a7d60; font-weight: 600; }
        #exc-hover-preview .exc-hp-grid {
            display: flex; flex-wrap: wrap; gap: 6px; align-items: flex-start;
        }
        #exc-hover-preview .exc-hp-cell {
            flex: 0 0 auto; border-radius: 6px; overflow: hidden;
            border: 1px solid #e8d8c0; background: #f6efe3;
            line-height: 0;
        }
        #exc-hover-preview .exc-hp-cell img {
            display: block; max-height: 160px; width: auto; max-width: 120px;
            object-fit: contain; background: #f0e6d8;
        }
        #exc-hover-preview .exc-hp-cell .exc-hp-bg {
            display: block; max-width: 120px; max-height: 160px;
            background-color: #f0e6d8; background-repeat: no-repeat;
        }
        #exc-hover-preview.is-loading .exc-hp-grid,
        #exc-hover-preview.is-empty .exc-hp-grid { display: none; }
        #exc-hover-preview.is-error .exc-hp-status { color: #b42318; }

        .exc-badge-row { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; margin-bottom: 2px; align-items: center; }
        .exc-card-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; align-items: center; }
        /* 画廊面板：小胶囊按钮，尽量一排塞得下 */
        #exc-gallery-panel .jlc-wb-btn,
        #exc-gallery-panel .exc-compare-actions .jlc-wb-btn,
        #exc-gallery-panel .exc-card-actions .jlc-wb-btn,
        #exc-gallery-panel a.jlc-wb-btn {
            padding: 4px 10px !important;
            font-size: 12px !important;
            line-height: 1.2 !important;
            border-radius: 999px !important;
            font-weight: 650 !important;
            box-shadow: none !important;
            min-height: 0 !important;
            height: auto !important;
            white-space: nowrap;
        }
        #exc-gallery-panel .jlc-wb-btn.primary {
            box-shadow: 0 1px 0 #b56e28 !important;
        }
        #exc-gallery-panel .exc-badge-row .jlc-status-pill {
            padding: 1px 7px;
            font-size: 10.5px;
            font-weight: 700;
        }
        #exc-gallery-panel .jlc-wb-view-title {
            margin: 8px 0 6px;
            font-size: 11px;
        }
        #exc-gallery-panel .exc-edition-list {
            margin-top: 6px; gap: 6px;
            display: flex !important; flex-direction: column !important;
        }
        #exc-gallery-panel .exc-edition-list .exc-ed {
            padding: 8px 10px;
            border-radius: 12px;
            font-size: 12.5px;
            box-shadow: 0 2px 0 #ead7bb;
        }
        #exc-gallery-panel .exc-edition-list .exc-ed.is-current {
            border: 2px solid #d4883a !important;
            background: linear-gradient(135deg, #fff8ef 0%, #ffeed6 100%) !important;
            box-shadow: 0 0 0 2px rgba(212,136,58,.28), 0 3px 0 #e8c48a !important;
            order: -2 !important;
        }
        #exc-gallery-panel .exc-edition-list .exc-ed.is-lrr-bound:not(.is-current) {
            border: 2px solid #5a9a60 !important;
            background: linear-gradient(135deg, #f3faf4 0%, #e8f5ea 100%) !important;
            order: -1 !important;
        }
        .exc-gl-item.is-exc-blocked { outline: 2px solid rgba(180,35,24,.35); outline-offset: -2px; opacity: .5; }
        .exc-gl-item.is-exc-blocked.exc-hide { display: none !important; }
        .exc-gl-item.is-exc-folded-child { display: none !important; }
        #exc-gallery-panel {
            margin: 14px 0 18px; padding: 0; border: 1px solid #e4d4bc; border-radius: 22px;
            background: #f6efe3; color: #4a3728; font: 14.5px/1.45 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            box-shadow: 0 12px 32px rgba(90,60,30,.16); overflow: hidden;
            clear: both; width: 100%; box-sizing: border-box;
            position: relative; z-index: 2;
        }
        #exc-gallery-panel .exc-g-head {
            padding: 14px 16px 8px; background: transparent; border-bottom: 0;
            font-weight: 800; font-size: 17px; color: #6b4a2e;
        }
        #exc-gallery-panel .exc-g-body { padding: 2px 16px 14px; }

        /*
         * 列表作品框体（可叠加）
         * 点过 is-exc-seen：金褐描边 + 封面压暗
         * 库内 is-exc-lib：绿色描边
         * 心动 is-exc-fav：橙色描边 + 标题染色
         */
        .exc-gl-item.is-exc-seen,
        .exc-gl-item.is-exc-lib,
        .exc-gl-item.is-exc-fav {
            border-radius: 6px;
            position: relative;
        }
        /* 点过：金边 + 压暗 */
        .exc-gl-item.is-exc-seen {
            outline: 2px solid rgba(180, 145, 90, 0.95);
            outline-offset: -2px;
        }
        .exc-gl-item.is-exc-seen img,
        .exc-gl-item.is-exc-seen .glthumb img,
        .exc-gl-item.is-exc-seen .glthumb,
        .exc-gl-item.is-exc-seen .exc-cover-host,
        .exc-gl-item.is-exc-seen .exc-cover-host img {
            opacity: 0.62 !important;
            filter: saturate(0.72) brightness(0.9) !important;
        }
        .exc-gl-item.is-exc-seen .exc-cover-host {
            position: relative;
        }
        .exc-gl-item.is-exc-seen .exc-cover-host::after {
            content: '';
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 1;
            background: rgba(90, 70, 40, 0.18);
            border-radius: inherit;
        }
        /* 库内：绿框（盖住部分金边感，库优先用绿） */
        .exc-gl-item.is-exc-lib {
            outline: 2px solid rgba(45, 140, 75, 0.95);
            outline-offset: -2px;
            box-shadow: 0 0 0 1px rgba(45, 140, 75, 0.2), 0 4px 12px rgba(45, 100, 60, 0.12);
        }
        .exc-gl-item.is-exc-lib.is-exc-seen {
            outline: 2px solid rgba(45, 140, 75, 0.95);
            box-shadow:
              0 0 0 1px rgba(45, 140, 75, 0.25),
              inset 0 0 0 2px rgba(180, 145, 90, 0.55);
        }
        /* 心动：橙框；与库叠加时内圈橙 */
        .exc-gl-item.is-exc-fav {
            outline: 2px solid rgba(212, 136, 58, 0.95);
            outline-offset: -2px;
            box-shadow: 0 0 0 1px rgba(212, 136, 58, 0.22), 0 4px 12px rgba(180, 100, 30, 0.12);
        }
        .exc-gl-item.is-exc-fav .glname a,
        .exc-gl-item.is-exc-fav .glink {
            color: #9a6700 !important;
        }
        .exc-gl-item.is-exc-lib.is-exc-fav {
            outline: 2px solid rgba(45, 140, 75, 0.95);
            box-shadow:
              0 0 0 1px rgba(45, 140, 75, 0.25),
              inset 0 0 0 2px rgba(212, 136, 58, 0.75);
        }
        .exc-gl-item.is-exc-seen.is-exc-fav:not(.is-exc-lib) {
            outline: 2px solid rgba(212, 136, 58, 0.95);
            box-shadow:
              0 0 0 1px rgba(212, 136, 58, 0.25),
              inset 0 0 0 2px rgba(180, 145, 90, 0.55);
        }
        /* 表格行：描边作用在首格封面更明显，整行加左侧色条 */
        tr.exc-gl-item.is-exc-seen > td.gl1e {
            box-shadow: inset 3px 0 0 #c4a574;
        }
        tr.exc-gl-item.is-exc-lib > td.gl1e {
            box-shadow: inset 3px 0 0 #2d8c4b;
        }
        tr.exc-gl-item.is-exc-fav > td.gl1e {
            box-shadow: inset 3px 0 0 #d4883a;
        }
        tr.exc-gl-item.is-exc-lib.is-exc-fav > td.gl1e {
            box-shadow: inset 3px 0 0 #2d8c4b, inset 6px 0 0 #d4883a;
        }
        tr.exc-gl-item.is-exc-seen.is-exc-lib > td.gl1e {
            box-shadow: inset 3px 0 0 #2d8c4b, inset 6px 0 0 #c4a574;
        }
        #exc-gallery-panel .exc-g-kv { font-size: 13px; color: #9a7d60; margin-bottom: 8px; }
        #exc-gallery-panel .exc-g-kv b { color: #4a3728; }
        /* tracking bar：挂在列表正上方（#dms / 顶部分页之后），不贴 #nb */
        #exc-tracking-bar {
            margin: 16px 0 12px;
            padding: 11px 14px 11px 16px;
            border-radius: 14px;
            background: rgba(255, 253, 248, 0.97);
            border: 1px solid #e4d4bc;
            border-left: 4px solid #d4883a;
            box-shadow: 0 10px 24px rgba(90, 60, 30, 0.12);
            font: 12.5px/1.35 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            color: #4a3728;
            display: flex;
            flex-wrap: wrap;
            gap: 8px 10px;
            align-items: center;
            min-height: 0;
            max-width: 100%;
            box-sizing: border-box;
            clear: both;
            position: relative;
            z-index: 2;
        }
        #exc-tracking-bar .exc-track-label {
            flex: 1 1 auto;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: #6b4a2e;
            font-weight: 650;
        }
        #exc-tracking-bar .exc-track-label b {
            color: #d4883a; font-weight: 800; margin-right: 2px;
        }
        #exc-tracking-bar.is-tracked {
            background: linear-gradient(90deg, #f2faf3 0%, #fffdf8 40%);
            border-color: #c5d9c8;
            border-left-color: #3d8f52;
            box-shadow: 0 10px 24px rgba(60, 100, 70, 0.1);
        }
        #exc-tracking-bar .exc-track-status {
            flex: 0 0 auto;
            font-size: 11.5px; font-weight: 750;
            padding: 3px 10px; border-radius: 999px;
            background: #fff1d6; color: #9a6700; border: 1px solid #e8c48a;
        }
        #exc-tracking-bar.is-tracked .exc-track-status {
            background: #2f6b3a; color: #fff; border-color: #2f6b3a;
        }
        #exc-tracking-bar .exc-track-actions {
            display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-left: auto;
        }
        #exc-tracking-bar .exc-track-meta {
            width: 100%; font-size: 11.5px; color: #9a7d60; line-height: 1.35;
            padding-top: 2px; border-top: 1px dashed #eadcc6; margin-top: 2px;
        }
        #exc-tracking-bar .exc-bp-continue {
            background: linear-gradient(135deg, #ff5f56, #e54840) !important;
            border-color: transparent !important; color: #fff !important;
            box-shadow: 0 3px 0 #b8322b, 0 6px 14px rgba(255,95,86,.22) !important;
            font-weight: 800 !important;
        }
        #exc-tracking-bar .exc-track-btn {
            flex: 0 0 auto;
            padding: 3px 10px !important;
            font-size: 11.5px !important;
            line-height: 1.2 !important;
            border-radius: 999px !important;
            box-shadow: none !important;
            min-height: 0;
        }
        /* library / edition compare card */
        .exc-compare-card {
            margin: 8px 0 4px; padding: 10px 12px; border-radius: 14px;
            background: #fffdf8; border: 1px solid #efe0cc;
            box-shadow: 0 2px 0 #ead7bb; color: #4a3728;
        }
        .exc-compare-card.is-maybe {
            border-color: #e8c48a; background: linear-gradient(180deg, #fff8ec 0%, #fffdf8 100%);
            box-shadow: 0 3px 0 #f0d9a8;
        }
        .exc-compare-card.is-diff {
            border-color: #e0c8a0;
        }
        .exc-compare-card.is-same {
            border-color: #9dcea8;
            background: linear-gradient(180deg, #f4fbf5 0%, #fffdf8 100%);
            box-shadow: 0 3px 0 #c5e0cb;
        }
        .exc-compare-card.is-same .exc-compare-chip {
            background: #e2f5e4; color: #2f6b3a; border-color: #b7dfbf;
        }
        /* 对照卡① 方案 A 结论色 */
        .exc-compare-card.is-lrr.is-lib {
            border-color: #b8cfe0;
            background: linear-gradient(180deg, #f4f8fc 0%, #fffdf8 100%);
            box-shadow: 0 2px 0 #c9dbe8;
        }
        .exc-compare-card.is-lrr.is-online-win {
            border-color: #e0b070;
            background: linear-gradient(180deg, #fff6e8 0%, #fffdf8 100%);
            box-shadow: 0 2px 0 #efd2a8;
        }
        .exc-compare-card.is-lrr.is-lib-win {
            border-color: #7fbf8a;
            background: linear-gradient(180deg, #eef8f0 0%, #fffdf8 100%);
            box-shadow: 0 2px 0 #c5e4cb;
        }
        .exc-compare-card.is-lrr.is-pack {
            border-color: #cfc4b0;
            background: linear-gradient(180deg, #f7f3ea 0%, #fffdf8 100%);
            box-shadow: 0 2px 0 #e2d8c4;
        }
        /* 对照卡② 线上多版本 */
        .exc-compare-card.is-editions {
            border-color: #d4c4e8;
            background: linear-gradient(180deg, #faf6ff 0%, #fffdf8 100%);
            box-shadow: 0 2px 0 #e2d6f0;
        }
        .exc-compare-card.is-editions .exc-edition-list { margin-top: 8px; }
        .exc-compare-card.is-editions .exc-ed.is-peer a { color: #6b3fa0; }
        /* 当前页：橙色描边，始终最显眼 */
        .exc-edition-list .exc-ed.is-current {
            order: -2 !important;
            border: 2px solid #d4883a !important;
            background: linear-gradient(135deg, #fff8ef 0%, #ffeed6 100%) !important;
            box-shadow: 0 0 0 2px rgba(212,136,58,.28), 0 3px 0 #e8c48a !important;
        }
        .exc-edition-list .exc-ed.is-current a { color: #8a4a12 !important; font-weight: 800; }
        /* 库源（非当前）：绿色框 */
        .exc-edition-list .exc-ed.is-lrr-bound:not(.is-current) {
            order: -1 !important;
            border: 2px solid #5a9a60 !important;
            background: linear-gradient(135deg, #f3faf4 0%, #e8f5ea 100%) !important;
            box-shadow: 0 0 0 1px rgba(90,154,96,.2), 0 3px 0 #c5dfc8 !important;
        }
        /* 当前页且是库源：橙框 + 绿底提示同源 */
        .exc-edition-list .exc-ed.is-lrr-bound.is-current {
            order: -2 !important;
            border: 2px solid #d4883a !important;
            background: linear-gradient(135deg, #f6faf4 0%, #fff0dc 55%, #ffeed6 100%) !important;
            box-shadow: 0 0 0 2px rgba(212,136,58,.3), 0 0 0 4px rgba(90,154,96,.18), 0 3px 0 #e0c090 !important;
        }
        .exc-edition-list .exc-ed.is-lrr-bound:not(.is-current) a { color: #2f5a36; }
        .exc-ed-lrr-tag {
            display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: .04em;
            color: #fff; background: #5a9a60; border-radius: 4px; padding: 1px 5px;
            vertical-align: middle; margin-right: 2px;
        }
        .exc-ed-cur-tag {
            display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: .04em;
            color: #fff; background: #d4883a; border-radius: 4px; padding: 1px 5px;
            vertical-align: middle; margin-right: 2px;
        }
        .exc-edition-list {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px;
        }
        .exc-compare-head {
            display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
            margin-bottom: 8px;
        }
        .exc-compare-title { font-weight: 800; font-size: 14px; color: #6b4a2e; }
        .exc-compare-chip {
            display: inline-block; padding: 2px 8px; border-radius: 999px;
            font-size: 11px; font-weight: 700; color: #8a5a20;
            background: #f3e2c4; border: 1px solid #e8c48a;
            max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .exc-compare-card.is-maybe .exc-compare-chip {
            background: #f7e0b0; border-style: dashed;
        }
        /* 结论 chip：高对比分色 */
        .exc-compare-chip.is-verdict { font-size: 12px; padding: 3px 10px; letter-spacing: .02em; }
        .exc-compare-chip.is-verdict.is-same {
            background: #e8e4dc; color: #5a5040; border-color: #cfc6b6;
        }
        .exc-compare-chip.is-verdict.is-samever {
            background: #2f6b3a; color: #fff; border-color: #2f6b3a;
        }
        .exc-compare-chip.is-verdict.is-online {
            background: #d4883a; color: #fff; border-color: #b56e28;
        }
        .exc-compare-chip.is-verdict.is-library {
            background: #3d8f52; color: #fff; border-color: #2f6b3a;
        }
        .exc-compare-chip.is-verdict.is-pack {
            background: #8a7a60; color: #fff; border-color: #6f614c;
        }
        /* 库内(冷绿) vs 线上(暖橙) 双列 */
        .exc-compare-vs {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 6px;
            align-items: stretch;
            margin-bottom: 8px;
        }
        .exc-compare-col {
            border-radius: 10px;
            padding: 7px 9px;
            min-width: 0;
            border: 1px solid transparent;
        }
        .exc-compare-col.is-lib {
            background: #e8f4ec;
            border-color: #a8d0b4;
            color: #1f4d2c;
        }
        .exc-compare-col.is-on {
            background: #fff0e0;
            border-color: #e8b878;
            color: #7a3e10;
        }
        .exc-compare-col-lab {
            font-size: 11px; font-weight: 800; letter-spacing: .04em;
            margin-bottom: 3px; opacity: .92;
        }
        .exc-compare-col.is-lib .exc-compare-col-lab { color: #2f6b3a; }
        .exc-compare-col.is-on .exc-compare-col-lab { color: #b56e28; }
        .exc-compare-col-val {
            font-size: 12.5px; font-weight: 700; line-height: 1.35;
            word-break: break-word;
        }
        .exc-compare-vs-mid {
            align-self: center;
            font-size: 11px; font-weight: 800; color: #a08868;
            padding: 0 2px;
        }
        .exc-compare-pair {
            display: flex; flex-direction: column; gap: 4px;
            font-size: 12.5px; color: #7a5a3c; margin-bottom: 6px;
        }
        .exc-compare-side { line-height: 1.35; }
        .exc-compare-k {
            display: inline-block; min-width: 2.5em; font-weight: 750; color: #9a7d60;
        }
        .exc-compare-diffs {
            list-style: none; margin: 0 0 6px; padding: 0;
            display: flex; flex-direction: column; gap: 4px;
        }
        .exc-compare-diffs li {
            font-size: 12.5px; color: #6b4a2e; padding: 4px 8px;
            border-radius: 8px; background: #f6efe3;
        }
        .exc-compare-diffs li b { margin-right: 4px; }
        .exc-compare-arrow { color: #c49a5c; margin: 0 2px; }
        .exc-compare-diffs li em {
            font-style: normal; font-size: 11px; font-weight: 700;
            margin-left: 6px; color: #b86a20;
        }
        .exc-compare-diffs li.is-online-better {
            background: #fff0e0; border-left: 3px solid #d4883a;
        }
        .exc-compare-diffs li.is-lib-better {
            background: #e8f4ec; border-left: 3px solid #3d8f52;
        }
        .exc-cmp-v.is-lib { color: #2f6b3a; font-weight: 750; }
        .exc-cmp-v.is-on { color: #b56e28; font-weight: 750; }
        .exc-compare-pack {
            font-size: 11.5px; color: #8a7a60; line-height: 1.35;
            margin: 2px 0 4px; padding: 4px 8px; border-radius: 8px;
            background: #f3efe6; border: 1px dashed #d8ccb8;
        }
        .exc-compare-pack.is-quiet { border-style: solid; background: #f0f4f0; color: #6a7a68; }
        .exc-compare-note { font-size: 11.5px; color: #9a7d60; line-height: 1.35; margin-top: 2px; }
        .exc-compare-actions {
            display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; align-items: center;
        }
        .exc-compare-actions .jlc-wb-btn,
        .exc-compare-actions a.jlc-wb-btn {
            padding: 4px 10px !important;
            font-size: 12px !important;
            line-height: 1.2 !important;
            border-radius: 999px !important;
            box-shadow: none !important;
            min-height: 0 !important;
            white-space: nowrap;
        }
        .exc-compare-actions .jlc-wb-btn.primary {
            box-shadow: 0 1px 0 #b56e28 !important;
        }
        /* 绑定弹窗行内按钮也压一档 */
        #exc-wb-dialog .exc-modal-row .jlc-wb-btn {
            padding: 4px 9px !important;
            font-size: 11.5px !important;
            line-height: 1.2 !important;
            border-radius: 999px !important;
            box-shadow: none !important;
            white-space: nowrap;
        }
        #exc-wb-dialog .jlc-wb-dialog-actions .jlc-wb-btn {
            padding: 6px 12px !important;
            font-size: 12.5px !important;
            border-radius: 999px !important;
        }
        #exc-wb-dialog .exc-compare-card { margin-top: 0; margin-bottom: 12px; }
        #exc-wb-dialog .exc-modal-list { display: flex; flex-direction: column; gap: 8px; }
        #exc-wb-dialog .exc-modal-meta { color: #9a7d60; font-size: 11px; margin-top: 2px; }
        #exc-wb-dialog .exc-modal-compare {
            margin-top: 4px; font-size: 11.5px; color: #8a5a20;
            padding: 3px 8px; border-radius: 6px; background: #f6efe3;
            display: inline-block; max-width: 100%;
        }
        #exc-wb-dialog .exc-modal-compare.is-online-better {
            background: #f8edd8; border-left: 3px solid #d4883a;
        }
        #exc-wb-dialog .exc-modal-compare.is-lib-better {
            background: #eef3ea; border-left: 3px solid #5a9a60;
        }
        .exc-edition-list { margin-top: 10px; display: flex; flex-direction: column; gap: 10px; }
        .exc-edition-list .exc-ed {
            border-radius: 16px; padding: 12px 14px; background: #fffdf8; border: 1px solid #efe0cc;
            font-size: 13px; color: #8a6f55; box-shadow: 0 3px 0 #ead7bb;
        }
        /* 后段通用卡片样式不得盖掉当前页/库源高亮 */
        .exc-edition-list .exc-ed.is-current {
            border: 2px solid #d4883a !important;
            background: linear-gradient(135deg, #fff8ef 0%, #ffeed6 100%) !important;
            box-shadow: 0 0 0 2px rgba(212,136,58,.28), 0 3px 0 #e8c48a !important;
        }
        .exc-edition-list .exc-ed.is-lrr-bound:not(.is-current) {
            border: 2px solid #5a9a60 !important;
            background: linear-gradient(135deg, #f3faf4 0%, #e8f5ea 100%) !important;
            box-shadow: 0 0 0 1px rgba(90,154,96,.2), 0 3px 0 #c5dfc8 !important;
        }
        .exc-edition-list .exc-ed a { color: #4a3728; text-decoration: none; font-weight: 750; }
        .exc-edition-list .exc-ed a:hover { color: #d4883a; }
        /* 工作台 · 作品状态：当前页对应 LRR 档案 */
        #jlc-wb-works-scroll .jlc-wb-item.is-current,
        #jlc-wb-works-scroll .jlc-wb-item.is-lrr-page {
            border: 2px solid #d4883a !important;
            background: linear-gradient(135deg, #fff8ef 0%, #ffeed6 100%) !important;
            box-shadow: 0 0 0 2px rgba(212,136,58,.22), 0 3px 0 #e8c48a !important;
            order: -1;
        }
        #jlc-wb-works-scroll {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        #exc-tag-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        #exc-diag {
            margin: 16px auto; max-width: 640px; border: 1px solid #e4d4bc; border-radius: 22px;
            background: #f6efe3; color: #4a3728; box-shadow: 0 12px 32px rgba(90,60,30,.16); overflow: hidden;
            font: 14.5px 'Segoe UI', 'PingFang SC', sans-serif;
        }
        #exc-diag .exc-g-head { padding: 16px 18px 8px; font-weight: 800; font-size: 18px; color: #6b4a2e; }
        #exc-diag .exc-g-body { padding: 4px 18px 16px; color: #7a5a3c; }
        #exc-wb-dialog {
            position: fixed; inset: 0; z-index: 1000001; display: none; align-items: center; justify-content: center;
            background: rgba(90,60,30,.35); padding: 20px;
        }
        #exc-wb-dialog.is-open { display: flex; }
        #exc-wb-dialog .jlc-wb-dialog-card {
            width: min(520px, 92vw); max-height: min(80vh, 640px); overflow: auto;
            background: #f6efe3; border: 1px solid #e4d4bc; border-radius: 22px;
            padding: 18px; box-shadow: 0 18px 50px rgba(90,60,30,.22); color: #4a3728;
            font: 14.5px/1.45 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
        }
        #exc-wb-dialog h4 { margin: 0 0 8px; font-size: 18px; color: #6b4a2e; font-weight: 800; }
        #exc-wb-dialog p { margin: 0 0 12px; font-size: 13.5px; color: #9a7d60; line-height: 1.55; }
        #exc-wb-dialog .jlc-wb-dialog-actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; margin-top: 12px; }
        #exc-wb-dialog .exc-modal-row {
            display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px;
            border: 1px solid #efe0cc; border-radius: 16px; margin-bottom: 10px; background: #fffdf8;
            box-shadow: 0 3px 0 #ead7bb;
        }
        /* shared controls (unscoped) */
        .jlc-wb-icon-btn, .jlc-wb-chip, .jlc-wb-btn {
            appearance: none; border: 1px solid #e0cdae; background: #fffaf2; color: #5a4030;
            border-radius: 999px; cursor: pointer; font-size: 13px; line-height: 1.25; font-weight: 650;
            text-decoration: none; display: inline-flex; align-items: center; justify-content: center;
            box-sizing: border-box;
        }
        .jlc-wb-icon-btn {
            width: 34px; height: 34px; padding: 0; background: #fff; font-size: 15px; box-shadow: 0 2px 0 #e6d3b5;
        }
        .jlc-wb-chip { padding: 7px 12px; background: #fff; box-shadow: 0 2px 0 #e6d3b5; }
        .jlc-wb-chip.is-on { background: #d4883a; border-color: transparent; color: #fff; box-shadow: 0 2px 0 #b56e28; }
        .jlc-wb-btn { padding: 9px 13px; border-radius: 12px; box-shadow: 0 2px 0 #e0cdae; }
        .jlc-wb-btn.primary { background: #d4883a; border-color: transparent; color: #fff; box-shadow: 0 2px 0 #b56e28; }
        .jlc-wb-btn.ghost { background: #fffaf2; }
        .jlc-wb-btn.danger { background: #f3d5d0; border-color: #e8b8b0; color: #8a3a32; box-shadow: none; }
        .jlc-wb-btn:hover, .jlc-wb-icon-btn:hover, .jlc-wb-chip:hover {
            background: #fff; border-color: #d4bc96; filter: brightness(1.02);
        }
        .jlc-wb-btn.primary:hover { background: #e09848; border-color: transparent; filter: none; }
        .jlc-wb-view-title {
            font-size: 12px; color: #a08468; font-weight: 750; letter-spacing: .4px; margin: 0 0 10px;
            text-transform: uppercase;
        }
        .jlc-status-pill, .jlc-wb-leaf {
            display: inline-flex; align-items: center; border-radius: 999px; padding: 2px 8px;
            font-size: 11px; font-weight: 750; border: 0; background: #efe4d2; color: #8a6f55;
        }
        .jlc-status-pill.tone-gray, .jlc-wb-leaf.tone-gray { background: #efe4d2; color: #8a6f55; }
        .jlc-status-pill.tone-green, .jlc-wb-leaf.tone-green { background: #e2f5e4; color: #2f6b3a; }
        .jlc-status-pill.tone-red, .jlc-wb-leaf.tone-red { background: #fde2df; color: #b42318; }
        .jlc-status-pill.tone-yellow, .jlc-wb-leaf.tone-yellow { background: #fff1d6; color: #9a6700; }
        .jlc-status-pill.tone-orange { background: #f7ebe0; color: #9a6700; }
        .jlc-status-pill.tone-blue { background: #e4eef8; color: #3a5f8a; }

    `,
    });
  }

  function applyCreamSiteTheme() {
    const on = !!config.cream_site_theme;
    try {
      document.documentElement.classList.toggle('exc-cream-site', on);
      if (document.body) document.body.classList.toggle('exc-cream-site', on);
    } catch (_) {}

    let el = document.getElementById('exc-site-theme-cream');
    if (!on) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('style');
      el.id = 'exc-site-theme-cream';
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = getCreamSiteThemeCss();
  }

  /**
   * 画廊详情：把 #gdt 整块按倍率放大（zoom）。
   * 站点第一页有几张还是几张，只是每格更大；高度可多占排。
   */
  function applyGalleryThumbScale() {
    const scale = clampGalleryThumbScale(config.gallery_thumb_scale);
    config.gallery_thumb_scale = scale;
    const on = scale > 1.001;
    try {
      document.documentElement.classList.toggle('exc-gdt-scale', on);
      document.documentElement.style.setProperty('--exc-gdt-scale', String(scale));
    } catch (_) {}

    let el = document.getElementById('exc-gdt-scale-style');
    if (!on) {
      if (el) el.remove();
      try {
        document.documentElement.style.removeProperty('--exc-gdt-scale');
      } catch (_) {}
      return;
    }
    if (!el) {
      el = document.createElement('style');
      el.id = 'exc-gdt-scale-style';
      (document.head || document.documentElement).appendChild(el);
    }
    // zoom：保持同一批缩略与排版语义，整块放大（含雪碧图 background）
    el.textContent =
      '/* Creamu：画廊缩略图倍率（张数不变） */\n' +
      'html.exc-gdt-scale #gdt {\n' +
      '  zoom: var(--exc-gdt-scale, 1.5);\n' +
      '}\n' +
      '/* 不支持 zoom 时用 transform，并补高度避免叠到下方 */\n' +
      '@supports not (zoom: 1) {\n' +
      '  html.exc-gdt-scale #gdt {\n' +
      '    zoom: unset;\n' +
      '    transform: scale(var(--exc-gdt-scale, 1.5));\n' +
      '    transform-origin: top left;\n' +
      '    width: calc(100% / var(--exc-gdt-scale, 1.5));\n' +
      '  }\n' +
      '}\n';
  }

  function getCreamSiteThemeCss() {
    return `
/*
 * 奶油站点主题层次：
 * 页底（深奶油）→ 浮起卡片（中奶油+阴影）→ 封面槽（更深）
 * 列表作品框禁止纯白 #fff / #fffdf8，用色阶+投影做立体感
 */
html.exc-cream-site,
html.exc-cream-site body {
  background: #e5d9c8 !important;
  color: #4a3728 !important;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif !important;
  color-scheme: light;
}
html.exc-cream-site body a { color: #8a5a20 !important; }
html.exc-cream-site body a:visited { color: #7a4a28 !important; }
html.exc-cream-site body a:hover { color: #d4883a !important; }

/* 顶栏：略深于页底，压住内容 */
html.exc-cream-site #nb {
  background: #dccfb8 !important;
  border-bottom: 1px solid #cbb89a !important;
  box-shadow: 0 2px 8px rgba(90, 60, 30, 0.1);
}
html.exc-cream-site #nb div,
html.exc-cream-site #nb a {
  background: transparent !important;
  color: #6b4a2e !important;
  border-color: #e0cdae !important;
}
html.exc-cream-site #nb a:hover { color: #d4883a !important; }

/* 主容器 */
html.exc-cream-site .ido,
html.exc-cream-site #ido,
html.exc-cream-site div.ido {
  background: transparent !important;
  color: #4a3728 !important;
}
html.exc-cream-site .stuffbox,
html.exc-cream-site .homebox,
html.exc-cream-site .d,
html.exc-cream-site #gw,
html.exc-cream-site #gm,
html.exc-cream-site .gm,
html.exc-cream-site #gmid,
html.exc-cream-site #gd2,
html.exc-cream-site #gd3,
html.exc-cream-site #gd4,
html.exc-cream-site #gd5,
html.exc-cream-site #gleft,
html.exc-cream-site #gright {
  background: #faf6f0 !important;
  color: #4a3728 !important;
  border-color: #e4d4bc !important;
}
/* 封面列与信息列：近白奶油，避免露站点深色 */
html.exc-cream-site body #gleft,
html.exc-cream-site body #gmid,
html.exc-cream-site body #gright,
html.exc-cream-site body #gd2 {
  background: #faf6f0 !important;
  background-image: none !important;
}
html.exc-cream-site body #gleft {
  min-height: 100%;
  box-sizing: border-box;
}
html.exc-cream-site body #exc-gallery-panel {
  clear: both !important;
  display: block !important;
  width: auto !important;
  max-width: none !important;
  background: #f6efe3 !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

/* 搜索 / 筛选项：白输入 + 奶油底区分 */
html.exc-cream-site input[type="text"],
html.exc-cream-site input[type="password"],
html.exc-cream-site input[type="search"],
html.exc-cream-site input[type="number"],
html.exc-cream-site textarea,
html.exc-cream-site select {
  background: #fffdf8 !important;
  color: #4a3728 !important;
  border: 1px solid #e0cdae !important;
  border-radius: 8px !important;
  box-shadow: 0 1px 0 #eadcc6 !important;
  color-scheme: light;
}
html.exc-cream-site select option {
  background: #fffdf8 !important;
  color: #4a3728 !important;
}
html.exc-cream-site #jlc-wb-fab,
html.exc-cream-site button#jlc-wb-fab {
  background: linear-gradient(#e8a24e, #d4883a) !important;
  background-color: #d4883a !important;
  color: #fff !important;
  border: 0 !important;
  box-shadow: 0 3px 0 #b56e28, 0 8px 16px rgba(140,90,40,.26) !important;
  opacity: 1 !important;
}
html.exc-cream-site #jlc-wb-fab > span { color: #fff !important; }
html.exc-cream-site input[type="button"],
html.exc-cream-site input[type="submit"],
html.exc-cream-site input[type="reset"],
html.exc-cream-site button:not(#jlc-wb-fab):not(.jlc-wb-btn):not(.jlc-wb-icon-btn):not(.jlc-wb-chip):not(.exc-tool-btn):not(.exc-meta-act):not(.exc-fold-tag):not(.exc-track-btn) {
  background: #fffaf2 !important;
  color: #5a4030 !important;
  border: 1px solid #e0cdae !important;
  border-radius: 10px !important;
  box-shadow: 0 2px 0 #e6d3b5 !important;
  cursor: pointer;
}
html.exc-cream-site input[type="button"]:hover,
html.exc-cream-site input[type="submit"]:hover,
html.exc-cream-site button:not(#jlc-wb-fab):not(.jlc-wb-btn):not(.jlc-wb-icon-btn):not(.jlc-wb-chip):not(.exc-tool-btn):not(.exc-meta-act):not(.exc-fold-tag):not(.exc-track-btn):hover {
  background: #fff !important;
  border-color: #d4bc96 !important;
}

html.exc-cream-site .cs {
  border-radius: 6px !important;
  border-color: rgba(90, 60, 30, 0.2) !important;
  box-shadow: 0 1px 0 rgba(90, 60, 30, 0.08);
}

/* 列表表：透明底，行作为浮卡 */
html.exc-cream-site table.itg {
  background: transparent !important;
  border-collapse: separate !important;
  border-spacing: 0 10px !important;
  color: #4a3728 !important;
}
html.exc-cream-site table.itg > tbody > tr,
html.exc-cream-site table.itg th {
  background: transparent !important;
  color: #4a3728 !important;
  border: 0 !important;
}
html.exc-cream-site table.itg > tbody > tr > td {
  background: #efe4d4 !important;
  color: #4a3728 !important;
  border-top: 1px solid #d8c8b0 !important;
  border-bottom: 1px solid #d8c8b0 !important;
  border-left: 0 !important;
  border-right: 0 !important;
  box-shadow: 0 4px 14px rgba(90, 60, 30, 0.1), inset 0 1px 0 rgba(255, 248, 236, 0.45);
  vertical-align: middle;
}
html.exc-cream-site table.itg > tbody > tr > td:first-child {
  border-left: 1px solid #d8c8b0 !important;
  border-radius: 12px 0 0 12px !important;
}
html.exc-cream-site table.itg > tbody > tr > td:last-child {
  border-right: 1px solid #d8c8b0 !important;
  border-radius: 0 12px 12px 0 !important;
}
html.exc-cream-site table.itg > tbody > tr:hover > td {
  background: #f4ebe0 !important;
  box-shadow: 0 8px 20px rgba(90, 60, 30, 0.14), inset 0 1px 0 rgba(255, 250, 242, 0.55);
}
html.exc-cream-site .gl1e,
html.exc-cream-site .gl2e,
html.exc-cream-site .gl3e,
html.exc-cream-site .gl4e,
html.exc-cream-site .gl1c,
html.exc-cream-site .gl2c,
html.exc-cream-site .gl3c,
html.exc-cream-site .gl4c,
html.exc-cream-site .gltc,
html.exc-cream-site .gltm,
html.exc-cream-site .glname,
html.exc-cream-site .glink,
html.exc-cream-site .glhide {
  background: transparent !important;
  color: #4a3728 !important;
  border-color: #d8c8b0 !important;
}
html.exc-cream-site .glink,
html.exc-cream-site .glname a {
  color: #4a3728 !important;
}
html.exc-cream-site .glink:hover,
html.exc-cream-site .glname a:hover {
  color: #d4883a !important;
}

/* 缩略网格卡：中奶油浮在深页底上，标题区再深一档 */
html.exc-cream-site .gl1t {
  background: #efe4d4 !important;
  border: 1px solid #d4c2a8 !important;
  border-radius: 14px !important;
  box-shadow:
    0 6px 16px rgba(90, 60, 30, 0.12),
    0 1px 0 rgba(255, 248, 236, 0.5) inset;
  overflow: hidden;
  transition: box-shadow 0.14s ease, transform 0.14s ease, border-color 0.14s ease;
}
html.exc-cream-site .gl1t:hover {
  border-color: #c9b090 !important;
  box-shadow:
    0 10px 24px rgba(90, 60, 30, 0.16),
    0 1px 0 rgba(255, 250, 242, 0.55) inset;
  transform: translateY(-1px);
}
html.exc-cream-site .gl1t .gl4t,
html.exc-cream-site .gl1t .gl3t,
html.exc-cream-site .gl1t .gl5t,
html.exc-cream-site .gl1t .gl6t {
  background: #e6d8c4 !important;
  color: #5a4030 !important;
  border-top: 1px solid rgba(180, 150, 110, 0.25) !important;
}
html.exc-cream-site .glthumb,
html.exc-cream-site .gl3t a,
html.exc-cream-site .gl1e,
html.exc-cream-site td.gl1e,
html.exc-cream-site .glthumb div {
  background-color: #dccfb8 !important;
  border-color: #cbb89a !important;
}
html.exc-cream-site .glthumb img,
html.exc-cream-site .gl1t img,
html.exc-cream-site table.itg td img {
  background-color: #dccfb8 !important;
  /* 列表图略压亮，避免在奶油底上刺眼 */
  filter: brightness(0.94) saturate(0.96);
}
/* 追更条：浮在列表上的独立卡 */
html.exc-cream-site #exc-tracking-bar {
  background: #efe4d4 !important;
  border-color: #d4c2a8 !important;
  border-left: 4px solid #d4883a !important;
  box-shadow: 0 8px 22px rgba(90, 60, 30, 0.14) !important;
}
html.exc-cream-site #exc-tracking-bar.is-tracked {
  background: linear-gradient(90deg, #e2efe4 0%, #efe4d4 48%) !important;
  border-color: #b8d0bc !important;
  border-left-color: #3d8f52 !important;
}

/* 分页：小浮钮，不是白块 */
html.exc-cream-site .ptt td,
html.exc-cream-site .ptb td,
html.exc-cream-site table.ptt td,
html.exc-cream-site table.ptb td {
  background: #efe4d4 !important;
  border: 1px solid #d4c2a8 !important;
  color: #6b4a2e !important;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(90, 60, 30, 0.08);
}
html.exc-cream-site .ptt td a,
html.exc-cream-site .ptb td a { color: #6b4a2e !important; }
html.exc-cream-site .ptt td.ptds,
html.exc-cream-site .ptb td.ptds,
html.exc-cream-site .ptt .ptds,
html.exc-cream-site .ptb .ptds {
  background: #d4883a !important;
  border-color: #b56e28 !important;
}
html.exc-cream-site .ptt td.ptds a,
html.exc-cream-site .ptb td.ptds a { color: #fff !important; }

/* 标签 */
html.exc-cream-site #taglist a,
html.exc-cream-site #taglist div,
html.exc-cream-site .gt,
html.exc-cream-site .gtl,
html.exc-cream-site .gtw {
  background: #fffaf2 !important;
  border: 1px solid #e0cdae !important;
  color: #5a4030 !important;
  border-radius: 8px !important;
  box-shadow: 0 1px 0 #ead7bb;
}
html.exc-cream-site #taglist a:hover,
html.exc-cream-site .gt:hover,
html.exc-cream-site .gtl:hover {
  background: #fff1d6 !important;
  border-color: #e8c48a !important;
  color: #8a5a20 !important;
}

/* 画廊信息区 */
html.exc-cream-site #gdn,
html.exc-cream-site #gdd,
html.exc-cream-site #gdr,
html.exc-cream-site #gdf,
html.exc-cream-site #gds {
  background: transparent !important;
  color: #4a3728 !important;
  border-color: #e4d4bc !important;
}
/*
 * #gd1 内层 div 才是 background:url(封面)。
 * 外层 #gd1 铺奶油底，避免图未铺满时露站点原色；禁止 background 简写冲掉内层图。
 */
html.exc-cream-site body #gd1 {
  color: #4a3728 !important;
  border-color: #e4d4bc !important;
  background-color: #f6efe3 !important;
  background-image: none !important;
  margin: 0 !important;
  padding: 0 !important;
}
html.exc-cream-site body #gd1 > div {
  /* 保留 inline 的 background-image / size，只补底色 */
  background-color: #f6efe3 !important;
  margin: 0 auto 0 0 !important;
}
html.exc-cream-site #gd2 h1,
html.exc-cream-site #gd2 #gn,
html.exc-cream-site #gd2 #gj {
  color: #4a3728 !important;
}
/* 缩略条容器可奶油底；单格 gdtm/gdtl 用 background-image，禁止整块填色 */
html.exc-cream-site #gdt {
  background: #f6efe3 !important;
  border-color: #e4d4bc !important;
}
html.exc-cream-site #gdt .gdtm,
html.exc-cream-site #gdt .gdtl {
  background-color: transparent !important;
  border-color: #e4d4bc !important;
}
html.exc-cream-site #gdt a img {
  border-color: #e4d4bc !important;
  border-radius: 4px;
  opacity: 1 !important;
  filter: none !important;
}

/*
 * 已点过：轻描边 + 轻微压暗（覆盖站点厚遮罩，也别完全不标）
 * 同时用 :visited 与 .is-exc-seen（脚本根据本地状态打标，规避隐私限制）
 */
html.exc-cream-site .glname a:visited,
html.exc-cream-site .glink:visited {
  color: #8a7058 !important;
}
/* 已点/已访问：压暗（勿被下方「未访问清图」规则盖掉） */
html.exc-cream-site a:visited img,
html.exc-cream-site a:visited .glthumb img,
html.exc-cream-site .gl1t:has(a:visited) img,
html.exc-cream-site tr:has(a:visited) img,
html.exc-cream-site .exc-gl-item.is-exc-seen img,
html.exc-cream-site .exc-gl-item.is-exc-seen .glthumb img,
html.exc-cream-site .exc-gl-item.is-exc-seen .glthumb,
html.exc-cream-site .exc-gl-item.is-exc-seen .exc-cover-host,
html.exc-cream-site .exc-gl-item.is-exc-seen .exc-cover-host img {
  opacity: 0.62 !important;
  filter: saturate(0.72) brightness(0.9) !important;
}
/* 奶油页：三类框体色与浮卡阴影共存 */
html.exc-cream-site .gl1t:has(a:visited),
html.exc-cream-site .exc-gl-item.is-exc-seen.gl1t,
html.exc-cream-site .gl1t.exc-gl-item.is-exc-seen {
  outline: 2px solid rgba(180, 145, 90, 0.95) !important;
  outline-offset: -2px;
}
html.exc-cream-site .exc-gl-item.is-exc-lib.gl1t,
html.exc-cream-site .gl1t.exc-gl-item.is-exc-lib {
  outline: 2px solid rgba(45, 140, 75, 0.95) !important;
  outline-offset: -2px;
  box-shadow: 0 6px 16px rgba(45, 100, 60, 0.14) !important;
}
html.exc-cream-site .exc-gl-item.is-exc-fav.gl1t,
html.exc-cream-site .gl1t.exc-gl-item.is-exc-fav:not(.is-exc-lib) {
  outline: 2px solid rgba(212, 136, 58, 0.95) !important;
  outline-offset: -2px;
  box-shadow: 0 6px 16px rgba(180, 100, 30, 0.14) !important;
}
html.exc-cream-site .exc-gl-item.is-exc-lib.is-exc-fav.gl1t,
html.exc-cream-site .gl1t.exc-gl-item.is-exc-lib.is-exc-fav {
  outline: 2px solid rgba(45, 140, 75, 0.95) !important;
  box-shadow:
    0 6px 16px rgba(45, 100, 60, 0.12),
    inset 0 0 0 2px rgba(212, 136, 58, 0.8) !important;
}
html.exc-cream-site tr:has(a:visited) > td.gl1e,
html.exc-cream-site tr.exc-gl-item.is-exc-seen > td.gl1e {
  box-shadow: inset 3px 0 0 #c4a574 !important;
}
html.exc-cream-site tr.exc-gl-item.is-exc-lib > td.gl1e {
  box-shadow: inset 3px 0 0 #2d8c4b !important;
}
html.exc-cream-site tr.exc-gl-item.is-exc-fav > td.gl1e {
  box-shadow: inset 3px 0 0 #d4883a !important;
}
html.exc-cream-site tr.exc-gl-item.is-exc-lib.is-exc-fav > td.gl1e {
  box-shadow: inset 3px 0 0 #2d8c4b, inset 6px 0 0 #d4883a !important;
}
/* 未访问：保留轻微压亮，不要 filter:none 冲掉层次 */
html.exc-cream-site .gl1t:not(:has(a:visited)):not(.is-exc-seen) img,
html.exc-cream-site tr.exc-gl-item:not(.is-exc-seen):not(:has(a:visited)) img,
html.exc-cream-site tr:not(.is-exc-seen):not(:has(a:visited)):not(:has(.is-exc-seen)) > td img {
  opacity: 1 !important;
  filter: brightness(0.94) saturate(0.96) !important;
}

/* 评论：同列表浮卡色阶 */
html.exc-cream-site #cdiv .c1,
html.exc-cream-site div.c1 {
  background: #efe4d4 !important;
  border: 1px solid #d4c2a8 !important;
  border-radius: 12px !important;
  color: #4a3728 !important;
  box-shadow: 0 4px 12px rgba(90, 60, 30, 0.08);
}
html.exc-cream-site #cdiv .c3,
html.exc-cream-site #cdiv .c5,
html.exc-cream-site #cdiv .c6 { color: #9a7d60 !important; }

/* 图片阅读页 chrome */
html.exc-cream-site #i1,
html.exc-cream-site #i2,
html.exc-cream-site #i3,
html.exc-cream-site #i4,
html.exc-cream-site #i5,
html.exc-cream-site #i6,
html.exc-cream-site #i7 {
  background: #f3ebe0 !important;
  color: #4a3728 !important;
  border-color: #e4d4bc !important;
}
html.exc-cream-site #i2 a,
html.exc-cream-site #i4 a,
html.exc-cream-site #i5 a,
html.exc-cream-site #i6 a,
html.exc-cream-site #i7 a { color: #8a5a20 !important; }

/* 页脚 / 杂项 */
html.exc-cream-site #footer,
html.exc-cream-site .dp,
html.exc-cream-site p.ip,
html.exc-cream-site .searchnav,
html.exc-cream-site .searchhead {
  color: #9a7d60 !important;
  background: transparent !important;
  border-color: #e4d4bc !important;
}
html.exc-cream-site hr {
  border-color: #e4d4bc !important;
  background: #e4d4bc !important;
}

/* 弹出层 / 提示（站点自带） */
html.exc-cream-site #csp,
html.exc-cream-site #eventpane,
html.exc-cream-site .ths,
html.exc-cream-site .tdn {
  background: #f6efe3 !important;
  color: #4a3728 !important;
  border-color: #e4d4bc !important;
}

/* 收藏夹色块页略提亮底 */
html.exc-cream-site #favform,
html.exc-cream-site .fp {
  background: #f6efe3 !important;
  color: #4a3728 !important;
}

html.exc-cream-site #jlc-wb,
html.exc-cream-site #jlc-wb-fab,
html.exc-cream-site #exc-wb-dialog,
html.exc-cream-site #exc-toast-host {
  color: inherit;
}
`;
  }

