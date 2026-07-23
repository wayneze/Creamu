// ==UserScript==
// @name         Creamu · ExH
// @name:zh-CN   Creamu · ExH
// @namespace    https://github.com/wayneze/Creamu
// @version      0.9.53
// @description  Creamu：e/exhentai 奶油工作台；WebDAV 同步；LRR 只读对照
// @author       wayneze
// @match        *://e-hentai.org/*
// @match        *://exhentai.org/*
// @match        *://*.e-hentai.org/*
// @match        *://*.exhentai.org/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
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
      console.warn('[Creamu·ExH] workbench styles unavailable');
      return;
    }
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

function getCreamuWorkbenchCss() {
  return `
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
            --creamu-wb-accent: #d4883a;
            --creamu-wb-accent-hover: #e09848;
            --creamu-wb-accent-light: #e8a24e;
            --creamu-wb-accent-dark: #b56e28;
            --creamu-wb-on-accent: #fff;
            --creamu-wb-danger: #b42318;
        }

        #jlc-wb-fab {
            position: fixed; bottom: 20px; right: 18px; width: 34px; height: 34px;
            border-radius: 11px; border: 0 !important; color: #fff !important;
            background: linear-gradient(var(--creamu-wb-accent-light), var(--creamu-wb-accent)) !important;
            background-color: var(--creamu-wb-accent) !important;
            box-shadow: 0 3px 0 #b56e28, 0 8px 16px rgba(140,90,40,.26) !important;
            z-index: 999999; cursor: grab; touch-action: none; user-select: none;
            display: flex; align-items: center; justify-content: center; font-size: 14px;
            opacity: 1 !important;
            transition: filter .14s ease, box-shadow .14s ease, transform .12s ease;
        }
        #jlc-wb-fab:hover { filter: brightness(1.05); }
        #jlc-wb-fab:active, #jlc-wb-fab.is-dragging {
            cursor: grabbing; transform: translateY(2px);
            box-shadow: 0 2px 0 #b56e28, 0 4px 10px rgba(140,90,40,.22);
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
            background: var(--creamu-wb-bg); color: var(--creamu-wb-text); border-radius: 22px; border: 1px solid var(--creamu-wb-border);
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
        #jlc-wb .jlc-wb-subtitle { font-size: 12px; color: #a08468; margin-top: 3px; }
        #jlc-wb .jlc-wb-header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }

        #jlc-wb .jlc-wb-icon-btn, #jlc-wb .jlc-wb-chip, #jlc-wb .jlc-wb-btn {
            appearance: none; border: 1px solid var(--creamu-wb-border-strong); background: var(--creamu-wb-surface-soft); color: var(--creamu-wb-text-strong);
            border-radius: 999px; cursor: pointer; font-size: 13px; line-height: 1.25; font-weight: 650;
        }
        #jlc-wb .jlc-wb-icon-btn {
            width: 34px; height: 34px; padding: 0; display: inline-flex; align-items: center; justify-content: center;
            background: var(--creamu-wb-surface-raised); font-size: 15px; box-shadow: 0 2px 0 #e6d3b5;
        }
        #jlc-wb .jlc-wb-chip { padding: 7px 12px; background: var(--creamu-wb-surface-raised); box-shadow: 0 2px 0 #e6d3b5; }
        #jlc-wb .jlc-wb-chip.is-on { background: var(--creamu-wb-accent); border-color: transparent; color: var(--creamu-wb-on-accent); box-shadow: 0 2px 0 #b56e28; }
        #jlc-wb .jlc-wb-btn { padding: 9px 13px; border-radius: 12px; box-shadow: 0 2px 0 #e0cdae; }
        #jlc-wb .jlc-wb-btn.primary { background: var(--creamu-wb-accent); border-color: transparent; color: var(--creamu-wb-on-accent); box-shadow: 0 2px 0 #b56e28; }
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
            color: var(--creamu-wb-on-accent); background: var(--creamu-wb-accent); box-shadow: 0 2px 0 #b56e28;
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

        #jlc-wb .jlc-wb-toolbar {
            flex: 0 0 auto; display: flex; flex-direction: column; gap: 9px;
            padding: 4px 14px 10px; background: transparent; border-bottom: 0;
            position: static;
        }
        #jlc-wb .jlc-wb-toolbar-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
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
            background: var(--creamu-wb-surface-raised); color: var(--creamu-wb-text); font-size: 14.5px; box-shadow: 0 2px 0 #eadcc6;
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
            box-shadow: 0 2px 0 #eadcc6;
        }

        #jlc-wb .jlc-wb-group {
            border: 0; border-radius: 16px; overflow: visible; margin-bottom: 18px; background: transparent;
        }
        #jlc-wb .jlc-wb-group-toggle {
            width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px;
            background: transparent; color: #7a5a3c; border: 0; padding: 10px 6px 10px;
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
            position: relative; border-radius: 18px; padding: 12px 12px 12px 12px;
            background: var(--creamu-wb-surface); border: 1px solid #efe0cc; overflow: visible;
            cursor: pointer; transition: border-color .12s ease, background .12s ease, box-shadow .12s ease, transform .12s ease;
            box-shadow: 0 3px 0 #ead7bb;
        }
        #jlc-wb .jlc-wb-item:hover {
            border-color: #e0c9a8; background: var(--creamu-wb-surface-raised);
            box-shadow: 0 6px 16px rgba(120,80,30,.12); z-index: 3;
        }
        #jlc-wb .jlc-wb-item::before { display: none; }
        #jlc-wb .jlc-wb-item.is-focus {
            border-color: var(--creamu-wb-accent); box-shadow: 0 0 0 2px rgba(212,136,58,.22), 0 4px 0 #e0c9a8;
            background: #fff8ee;
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
            color: #7a6048; font-weight: 650;
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
            box-shadow: 0 3px 0 #b56e28; transition: transform .12s ease, filter .12s ease;
        }
        #jlc-wb .jlc-wb-open-btn:hover { filter: brightness(1.05); transform: translateY(-1px); }
        #jlc-wb .jlc-wb-open-btn:active { transform: translateY(1px); box-shadow: 0 1px 0 #b56e28; }
        #jlc-wb .jlc-wb-more-btn {
            appearance: none; border: 0; background: transparent; color: #b09070;
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
        #jlc-wb .jlc-wb-item-menu button:hover { background: #f3e9d8; }
        #jlc-wb .jlc-wb-item-menu button.is-danger { color: var(--creamu-wb-danger); }

        #jlc-wb .jlc-status-pill, #jlc-wb .jlc-site-pill {
            display: inline-flex; align-items: center; border-radius: 999px; padding: 2px 8px;
            font-size: 11.5px; font-weight: 700; border: 1px solid transparent;
        }
        #jlc-wb .jlc-site-pill { background: #f3e9d8; color: var(--creamu-wb-text-subtle); border-color: #eadcc6; }
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
            color: #a89078; font-weight: 550;
        }
        #jlc-wb .jlc-wb-item-meta-line.is-sub {
            color: #a89078; font-weight: 550;
        }
        #jlc-wb .jlc-status-pill.tone-gray { background: var(--creamu-wb-surface-muted); color: var(--creamu-wb-text-subtle); }
        #jlc-wb .jlc-status-pill.tone-green { background: #e2f5e4; color: #2f6b3a; }
        #jlc-wb .jlc-status-pill.tone-red { background: #fde2df; color: var(--creamu-wb-danger); }
        #jlc-wb .jlc-status-pill.tone-yellow { background: #fff1d6; color: #9a6700; }

        #jlc-wb .jlc-wb-empty {
            padding: 20px; border: 1px dashed #e0cdae; border-radius: 16px; color: var(--creamu-wb-text-muted);
            background: rgba(255,255,255,.55); font-size: 14.5px; line-height: 1.65;
        }

        #jlc-wb #jlc-wb-view-root .jlc-wb-view-block,
        #jlc-wb #jlc-wb-library-root .jlc-wb-view-block,
        #jlc-wb #jlc-wb-filter-root .jlc-wb-view-block {
            background: var(--creamu-wb-surface); border: 1px solid #efe0cc; border-radius: 16px; padding: 14px; margin-bottom: 14px;
            box-shadow: 0 3px 0 #ead7bb;
        }
        #jlc-wb #jlc-wb-view-root .jlc-wb-view-title,
        #jlc-wb #jlc-wb-library-root .jlc-wb-view-title,
        #jlc-wb #jlc-wb-filter-root .jlc-wb-view-title {
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
        #jlc-wb .jlc-wb-view-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px; }
        #jlc-wb .jlc-wb-view-actions .jlc-wb-btn { width: 100%; justify-content: center; }

        #jlc-wb .jlc-wb-settings {
            display: none; position: absolute; inset: 0; z-index: 5; background: rgba(90,60,30,.28);
        }
        #jlc-wb .jlc-wb-settings.is-open { display: block; }
        #jlc-wb .jlc-wb-settings-panel {
            position: absolute; top: 0; right: 0; width: min(100%, 430px); height: 100%;
            display: flex; flex-direction: column; background: var(--creamu-wb-bg); border-left: 1px solid #e4d4bc;
        }
        #jlc-wb .jlc-wb-settings-head {
            flex: 0 0 auto; display: flex; justify-content: space-between; align-items: center;
            gap: 8px; padding: 14px 16px; border-bottom: 1px solid var(--creamu-wb-divider); background: var(--creamu-wb-surface-soft); font-size: 15px; color: var(--creamu-wb-text);
        }
        #jlc-wb .jlc-wb-settings-nav {
            flex: 0 0 auto; display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 14px;
            border-bottom: 1px solid var(--creamu-wb-divider); background: #f3e9d8;
        }
        #jlc-wb .jlc-wb-settings-nav button {
            appearance: none; border: 1px solid var(--creamu-wb-border-strong); background: var(--creamu-wb-surface-raised); color: var(--creamu-wb-text-subtle);
            border-radius: 999px; padding: 8px 12px; cursor: pointer; font-size: 13.5px; font-weight: 700;
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
        #jlc-wb .jlc-wb-settings .stat-box,
        #jlc-wb #jlc-wb-library-root .stat-box {
            display: flex; justify-content: space-around; background: var(--creamu-wb-surface); border: 1px solid #efe0cc;
            border-radius: 14px; padding: 14px; margin-bottom: 14px;
        }
        #jlc-wb .jlc-wb-settings .stat-item,
        #jlc-wb #jlc-wb-library-root .stat-item { text-align: center; }
        #jlc-wb .jlc-wb-settings .stat-item b,
        #jlc-wb #jlc-wb-library-root .stat-item b { display: block; color: var(--creamu-wb-accent); font-size: 22px; margin-bottom: 4px; }
        #jlc-wb .jlc-wb-settings .stat-item span,
        #jlc-wb #jlc-wb-library-root .stat-item span { font-size: 11px; color: var(--creamu-wb-text-muted); }
        #jlc-wb .person-item {
            background: var(--creamu-wb-surface); padding: 12px 14px; border-radius: 12px; margin-bottom: 8px;
            display: flex; justify-content: space-between; align-items: center; border: 1px solid #efe0cc; font-size: 14px;
            color: var(--creamu-wb-text);
        }
        #jlc-wb .person-item:hover { border-color: #e0c9a8; background: var(--creamu-wb-surface-raised); }
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
            background: rgba(212,136,58,.28);
        }
        #jlc-wb .jlc-wb-resize-corner:hover, #jlc-wb .jlc-wb-resize-corner.is-dragging {
            background: rgba(212,136,58,.18);
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
    const extra = opts.extraCss || '';
    styleEl.textContent = getCreamuWorkbenchCss() + (extra ? '\n' + extra : '');
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
  const CENSOR_ALIASES = {
    uncensored: [
      '無修正',
      '无修正',
      '无码',
      '無碼',
      '无码',
      'uncensored',
      'decensored',
      '無修正版',
    ],
    light: ['条纹', '條紋', '薄码', '薄碼', 'mosaic lite', 'light mosaic', 'ハケ消し'],
    heavy: ['厚码', '厚碼', 'heavy mosaic', 'モザイク', '有码', '有碼'],
  };

  const LANG_PATTERNS = [
    { id: 'zh', re: /chinese|中国語|漢化|汉化|中文|中国翻訳|中國翻譯|zh[-_]?cn|zh[-_]?tw|ce\b/i },
    { id: 'ja', re: /japanese|日本語|日語|日语|\bja\b/i },
    { id: 'en', re: /english|英語|英语|\ben\b/i },
    { id: 'ko', re: /korean|한국어|韓語|韩语|\bko\b/i },
    { id: 'ru', re: /russian|русский|\bru\b/i },
    { id: 'es', re: /spanish|español|\bes\b/i },
    { id: 'fr', re: /french|français|\bfr\b/i },
    { id: 'pt', re: /portuguese|português|\bpt\b/i },
  ];

  function normalizeNamespaceTag(tag) {
    const t = compactText(tag).toLowerCase();
    if (!t) return '';
    return t.replace(/^"+|"+$/g, '');
  }

  function stripTitleDecorations(title) {
    let s = String(title || '');
    // remove nested-ish bracket groups iteratively
    for (let i = 0; i < 8; i++) {
      const next = s
        .replace(/\[[^\[\]]*\]/g, ' ')
        .replace(/\([^\(\)]*\)/g, ' ')
        .replace(/\{[^\{\}]*\}/g, ' ')
        .replace(/【[^】]*】/g, ' ')
        .replace(/（[^）]*）/g, ' ');
      if (next === s) break;
      s = next;
    }
    s = s
      .replace(/[～〜~]/g, ' ')
      .replace(/[|｜]/g, ' ')
      .replace(/[^\S\n]+/g, ' ')
      .trim();
    return s;
  }

  function buildTitleCore(title) {
    let core = stripTitleDecorations(title);
    core = core
      .replace(/\b(chinese|english|japanese|korean|digital|fakku|dl版|コミック)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return core;
  }

  function detectLanguageFromText(text, tags) {
    const bag = [String(text || ''), ...(tags || []).map(String)].join(' | ');
    for (const item of LANG_PATTERNS) {
      if (item.re.test(bag)) return item.id;
    }
    // language:chinese style tags
    const langTag = (tags || []).map(normalizeNamespaceTag).find((t) => t.startsWith('language:'));
    if (langTag) {
      const v = langTag.slice('language:'.length);
      for (const item of LANG_PATTERNS) {
        if (item.re.test(v)) return item.id;
      }
      if (v) return v.slice(0, 12);
    }
    return 'other';
  }

  function detectCensorTier(title, tags) {
    const tagList = (tags || []).map(String);
    // 优先 namespace 标签（LRR/EH 常见 other:uncensored）
    for (const raw of tagList) {
      const t = normalizeNamespaceTag(raw);
      if (!t) continue;
      const val = t.includes(':') ? t.slice(t.indexOf(':') + 1) : t;
      if (
        t === 'other:uncensored' ||
        t === 'other:decensored' ||
        val === 'uncensored' ||
        val === 'decensored' ||
        /無修正|无修正|无码|無碼/.test(val)
      ) {
        return 'uncensored';
      }
      if (/条纹|薄码|thin.?mosaic|light.?mosaic|mosaic.?lite/.test(val) || t.includes('light mosaic')) {
        return 'light';
      }
      if (/厚码|heavy.?mosaic|有码|有碼/.test(val) && !/无码|無碼|uncensored/.test(val)) {
        return 'heavy';
      }
    }
    const bag = [String(title || ''), ...tagList].join(' ').toLowerCase();
    for (const [tier, aliases] of Object.entries(CENSOR_ALIASES)) {
      for (const a of aliases) {
        if (bag.includes(String(a).toLowerCase())) return tier;
      }
    }
    if (/uncensored|decensored|無修正|无码|無碼/.test(bag)) return 'uncensored';
    if (/条纹|薄码|thin.?mosaic|light.?mosaic/.test(bag)) return 'light';
    if (/厚码|heavy.?mosaic|有码/.test(bag)) return 'heavy';
    return 'unknown';
  }

  /** LRR 档案质量维：码级以档案自检优先，unknown 才参考绑定源 */
  function applyBoundEditionQualityToArchive(archive, boundEdition) {
    if (!archive) return archive;
    if (!boundEdition) return archive;
    const out = Object.assign({}, archive);
    const arcCensor = compactText(out.censor_tier || '') || 'unknown';
    const srcCensor = compactText(boundEdition.censor_tier || '') || 'unknown';
    // 语言：档案 other/空 → 可用源
    if (
      boundEdition.language &&
      (!out.language || out.language === 'other' || out.language === 'unknown')
    ) {
      out.language = boundEdition.language;
    }
    // 码级：绝不在档案已有明确码级时用源覆盖；unknown 才参考源（并标记来自源）
    if (arcCensor === 'unknown' && srcCensor && srcCensor !== 'unknown') {
      out.censor_tier = srcCensor;
      out.censor_from_eh_source = 1;
    } else {
      out.censor_from_eh_source = 0;
    }
    if (!out.group && boundEdition.group) out.group = boundEdition.group;
    out.eh_source_gid = boundEdition.gid ? String(boundEdition.gid) : out.eh_gid || '';
    out.quality_from_eh_source = 1;
    // 源画廊码级仅作备注，不强制等于包内
    out.source_censor_tier = srcCensor;
    return out;
  }

  function extractGroupFromTitle(title) {
    const m = String(title || '').match(/\[([^\]]+)\]/);
    if (!m) return '';
    const g = compactText(m[1]);
    // skip pure language / tech markers
    if (/^(chinese|english|japanese|digital|dl版|中国翻訳|中國翻譯)$/i.test(g)) return '';
    return g;
  }

  function extractGroupsFromTags(tags) {
    const out = [];
    const seen = new Set();
    for (const raw of tags || []) {
      let t = normalizeNamespaceTag(raw);
      // LRR 常见 artist_xxx / group_xxx 下划线写法
      t = t.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
      // 兼容 "group: name" / "circle:xxx" / "parody:xxx" 不当团体熟人
      let name = '';
      if (t.startsWith('group:')) name = t.slice(6);
      else if (t.startsWith('translator:')) name = t.slice(11);
      else if (t.startsWith('circle:')) name = t.slice(7);
      else if (/^groups?:/i.test(String(raw || ''))) {
        name = String(raw).replace(/^groups?:\s*/i, '');
      }
      name = compactText(name).replace(/_/g, ' ');
      if (!name || name.length < 2) continue;
      const k = name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(name);
    }
    return out;
  }

  function extractArtistsFromTags(tags) {
    const out = [];
    const seen = new Set();
    for (const raw of tags || []) {
      const rawS = String(raw || '').trim();
      let t = normalizeNamespaceTag(rawS);
      t = t.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
      let name = '';
      if (t.startsWith('artist:')) name = t.slice(7);
      else if (/^artists?:\s*/i.test(rawS)) name = rawS.replace(/^artists?:\s*/i, '');
      // LRR 有时用 "by: name"
      else if (/^by:\s*/i.test(rawS)) name = rawS.replace(/^by:\s*/i, '');
      name = compactText(name).replace(/_/g, ' ');
      if (!name || name.length < 2) continue;
      const k = name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(name);
    }
    return out;
  }

  /** 心动标签中英别名 */
  const FAV_TAG_ALIASES = {
    巨乳: ['big breasts', 'huge breasts', 'gigantic breasts', '巨乳'],
    贫乳: ['small breasts', 'flat chest', '贫乳'],
    丝袜: ['pantyhose', 'stockings', 'thighhighs', '丝袜', '黑丝'],
    人妻: ['milf', 'married', 'netorare', '人妻'],
    母: ['mother', 'milf', 'mama', 'mom', 'incest', '母', '母親', '母亲', '妈妈', '母女'],
    母女: ['mother', 'daughter', 'incest', '母女', '母'],
    mother: ['mother', 'milf', 'mama', '母', '母親', '母亲', '母女', 'incest'],
    潮吹: ['squirting', 'female ejaculation', '潮吹'],
    无码: ['uncensored', 'decensored', '无码', '無碼'],
    有码: ['mosaic censorship', 'full censorship', '有码', '有碼'],
    百合: ['yuri', 'gl', '百合'],
    扶她: ['futanari', 'futa', '扶她'],
    乱伦: ['incest', '乱伦', '亂倫', '母', 'mother'],
    催眠: ['mind control', 'hypnosis', '催眠'],
    凌辱: ['rape', 'forced', '凌辱'],
    全彩: ['full color', 'full colour', '全彩'],
    单行本: ['tankoubon', '单行本', '單行本'],
    同人: ['doujin', '同人'],
    cg: ['cg set', '3d', 'cg'],
  };

  function isCjkText(s) {
    return /[\u3040-\u30ff\u3400-\u9fff]/.test(String(s || ''));
  }

  /** 汉字 ≥1 字可匹配；英文 ≥2 */
  function favNeedleUsable(n) {
    const s = String(n || '');
    if (!s) return false;
    if (isCjkText(s)) return s.length >= 1;
    return s.length >= 2;
  }

  /** @returns {string[]} 命中的用户原文 */
  function matchFavTags(favList, tags, title) {
    const hits = [];
    const tagset = (tags || []).map((t) => normalizeNamespaceTag(t));
    const tagBag = tagset.join(' | ');
    const titleBag = compactText(title || '').toLowerCase();
    // 无空格标题，方便 mother / 母 等
    const titleCompact = titleBag.replace(/[\s_\-]+/g, '');
    const tagCompact = tagBag.replace(/[\s_\-]+/g, '');

    (favList || []).forEach((ft) => {
      const raw = compactText(ft);
      if (!raw) return;
      const h = normalizeNamespaceTag(raw);
      const bare = h.includes(':') ? h.split(':').slice(1).join(':') : h;
      const bareLow = bare.toLowerCase();
      const needles = [];
      const addNeedle = (x) => {
        const n = String(x || '').toLowerCase().trim();
        if (!favNeedleUsable(n)) return;
        if (needles.indexOf(n) < 0) needles.push(n);
      };
      addNeedle(bareLow);
      addNeedle(h);
      // 别名：键命中或别名值命中都整组扩开
      Object.keys(FAV_TAG_ALIASES).forEach((k) => {
        const kl = k.toLowerCase();
        const arr = FAV_TAG_ALIASES[k] || [];
        const keyHit = kl === bareLow || k === bare || kl === bare;
        const valHit = arr.some((a) => String(a).toLowerCase() === bareLow);
        if (keyHit || valHit) {
          addNeedle(k);
          arr.forEach(addNeedle);
        }
      });

      let hit = false;
      for (let i = 0; i < needles.length && !hit; i++) {
        const n = needles[i];
        const nCompact = n.replace(/[\s_\-]+/g, '');
        // 标签精确 / 后缀 / 包含
        if (
          tagset.some((t) => {
            if (!t) return false;
            if (t === h || t === n || t === bareLow) return true;
            if (t.endsWith(':' + n) || t.endsWith(':' + bareLow)) return true;
            // 单词边界：避免 "a" 乱配；汉字/≥3 英文可用 includes
            if (isCjkText(n) || n.length >= 3) {
              if (t.includes(n) || t.includes(bareLow)) return true;
            }
            return false;
          })
        ) {
          hit = true;
          break;
        }
        // 标题 / 标签串
        if (isCjkText(n) || n.length >= 3) {
          if (titleBag.includes(n) || tagBag.includes(n)) hit = true;
          else if (nCompact && (titleCompact.includes(nCompact) || tagCompact.includes(nCompact))) {
            hit = true;
          }
        } else if (n.length >= 2) {
          // 短英文：要求标签 namespace 形式或整词
          if (tagset.some((t) => t === n || t.endsWith(':' + n) || t === 'female:' + n || t === 'male:' + n)) {
            hit = true;
          } else if (new RegExp('(?:^|[^a-z0-9])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:[^a-z0-9]|$)', 'i').test(titleBag + ' ' + tagBag)) {
            hit = true;
          }
        }
      }
      if (hit) hits.push(raw);
    });
    return hits;
  }

  /** 人名归一：小写、下划线/点→空格、多空格合并；另给无空格键 */
  function normalizePersonKey(s) {
    return compactText(s)
      .toLowerCase()
      .replace(/[_\-・·．.／/]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function compactPersonKey(s) {
    return normalizePersonKey(s).replace(/\s+/g, '');
  }

  /**
   * 人名是否匹配（emori uki / emoriuki / Emori_Uki / 标题子串）
   */
  function personNameMatches(candidate, haystack) {
    const c = normalizePersonKey(candidate);
    const cc = compactPersonKey(candidate);
    if (!c || c.length < 2) return false;
    const h = normalizePersonKey(haystack);
    const hc = compactPersonKey(haystack);
    if (!h) return false;
    if (h === c || hc === cc) return true;
    if (h.includes(c) || hc.includes(cc)) return true;
    // 标题里是 "emoriuki"，熟人是 "emori uki"
    if (cc.length >= 4 && (hc.includes(cc) || h.replace(/\s+/g, '').includes(cc))) return true;
    // 熟人名拆开：姓/名都出现（至少 3 字母一段）
    const parts = c.split(' ').filter((p) => p.length >= 3);
    if (parts.length >= 2 && parts.every((p) => h.includes(p) || hc.includes(p))) return true;
    return false;
  }

  /**
   * 列表标签流：码级/形态/内容优先，否则角色；不含画师组与在库状态。
   * @returns {{ ns: string, name: string, full: string, priority: number }[]}
   */
  function pickHighlightTags(tags, opts) {
    opts = opts || {};
    const max = Math.max(1, Math.min(8, Math.floor(Number(opts.max) || 4)));
    const titleBag = compactText(opts.title || '').toLowerCase();
    const favBare = new Set(
      (opts.favTags || []).map((t) => {
        const h = normalizeNamespaceTag(t);
        return (h.includes(':') ? h.split(':').slice(1).join(':') : h).toLowerCase();
      })
    );
    const primary = []; // 码级/形态/内容/心动
    const characters = []; // 角色兜底
    const seen = new Set();

    (tags || []).forEach((raw) => {
      const full = normalizeNamespaceTag(raw);
      if (!full || seen.has(full)) return;
      seen.add(full);
      let ns = '';
      let name = full;
      const colon = full.indexOf(':');
      if (colon > 0) {
        ns = full.slice(0, colon);
        name = full.slice(colon + 1);
      }
      if (!name || name.length > 40) return;
      // 画师/组/翻译：熟人徽章负责，标签流不显示
      if (ns === 'artist' || ns === 'group' || ns === 'translator' || ns === 'circle') return;
      // 噪声
      if (ns === 'misc' && /upload|rewrite|sampled|digital/i.test(name)) return;
      if (ns === 'language' && /speechless|text cleaned/i.test(name)) return;

      const nameLow = name.toLowerCase();
      const isFav = favBare.has(nameLow) || favBare.has(full.toLowerCase());
      // 标题里已经出现的英文词，少重复（母/mother 这类短内容词仍显示）
      const inTitle = nameLow.length >= 4 && titleBag.includes(nameLow);

      let pri = 80;
      let bucket = 'primary';

      if (ns === 'other' && /uncensored|decensored/i.test(name)) pri = 5;
      else if (ns === 'other' && /mosaic|full.?censorship|censored/i.test(name)) pri = 8;
      else if (ns === 'other' && /full.?colou?r/i.test(name)) pri = 12;
      else if (ns === 'other' && /tankoubon|anthology|webtoon|cg set|3d/i.test(name)) pri = 14;
      else if (ns === 'female' || ns === 'male' || ns === 'mixed' || ns === 'cosplayer') {
        // 内容向：mother / milf / incest… 列表最有信息量
        pri = isFav ? 10 : 18;
        if (inTitle && !isFav) pri += 8;
      } else if (ns === 'character') {
        bucket = 'character';
        pri = isFav ? 20 : 40;
      } else if (ns === 'parody') {
        // 原作标题常已有，仅标题完全看不出时略显示
        if (inTitle) return;
        pri = 45;
      } else if (ns === 'language') {
        if (/chinese|translated/i.test(name) && /chinese|中国|中文|漢化|汉化/i.test(titleBag)) return;
        pri = 50;
      } else if (isFav) {
        pri = 11;
      } else {
        return; // 其它杂项默认不进流，减遮挡
      }

      const item = { ns: ns, name: name, full: full, priority: pri };
      if (bucket === 'character') characters.push(item);
      else primary.push(item);
    });

    primary.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
    characters.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));

    // 有码级/内容等则优先它们；否则用角色 tag 填
    const out = primary.slice(0, max);
    if (out.length < max) {
      for (let i = 0; i < characters.length && out.length < max; i++) {
        out.push(characters[i]);
      }
    }
    return out;
  }

  /** 列表展示用短标签名（偏内容/形态，不强调画师组） */
  function formatHighlightTagLabel(item) {
    if (!item) return '';
    const ns = item.ns || '';
    const name = item.name || '';
    if (ns === 'other' && /uncensored|decensored/i.test(name)) return '无码';
    if (ns === 'other' && /mosaic|full.?censorship/i.test(name)) return '有码';
    if (ns === 'other' && /full.?colou?r/i.test(name)) return '全彩';
    if (ns === 'other' && /tankoubon/i.test(name)) return '单行本';
    if (ns === 'character') return '角:' + name.slice(0, 12);
    if (ns === 'parody') return '原:' + name.slice(0, 12);
    if (ns === 'language') return name.slice(0, 10);
    if (ns === 'female' || ns === 'male' || ns === 'mixed') return name.slice(0, 16);
    return name.slice(0, 14);
  }

  function parseSizeToBytes(text) {
    const s = compactText(text);
    if (!s) return 0;
    const m = s.match(/([\d.]+)\s*(tib|gib|mib|kib|tb|gb|mb|kb|b)\b/i);
    if (!m) {
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    }
    const n = parseFloat(m[1]);
    if (!Number.isFinite(n)) return 0;
    const u = m[2].toLowerCase();
    const map = {
      b: 1,
      kb: 1024,
      kib: 1024,
      mb: 1024 ** 2,
      mib: 1024 ** 2,
      gb: 1024 ** 3,
      gib: 1024 ** 3,
      tb: 1024 ** 4,
      tib: 1024 ** 4,
    };
    return Math.round(n * (map[u] || 1));
  }

  function formatBytes(n) {
    const v = Number(n) || 0;
    if (v <= 0) return '—';
    if (v < 1024) return v + ' B';
    if (v < 1024 ** 2) return (v / 1024).toFixed(1) + ' KB';
    if (v < 1024 ** 3) return (v / 1024 ** 2).toFixed(1) + ' MB';
    return (v / 1024 ** 3).toFixed(2) + ' GB';
  }

  function sizeTier(bytes) {
    const b = Number(bytes) || 0;
    if (b <= 0) return 'U';
    if (b < 5 * 1024 * 1024) return 'S';
    if (b < 20 * 1024 * 1024) return 'M';
    if (b < 60 * 1024 * 1024) return 'L';
    return 'XL';
  }

  function langRank(lang, order) {
    const list = order && order.length ? order : DEFAULT_CONFIG.lang_order;
    const id = lang || 'other';
    // zh covers zh-cn etc
    let idx = list.indexOf(id);
    if (idx < 0 && id.startsWith('zh')) idx = list.indexOf('zh');
    if (idx < 0) idx = list.indexOf('other');
    if (idx < 0) idx = list.length;
    return idx;
  }

  function censorRank(tier, order) {
    const list = order && order.length ? order : DEFAULT_CONFIG.censor_order;
    const idx = list.indexOf(tier || 'unknown');
    return idx < 0 ? list.length : idx;
  }

  function groupBonus(group, cfg) {
    const g = compactText(group).toLowerCase();
    if (!g) return 0;
    if ((cfg.group_blacklist || []).some((x) => compactText(x).toLowerCase() === g)) return -1000;
    if ((cfg.group_whitelist || []).some((x) => compactText(x).toLowerCase() === g)) return 100;
    return 0;
  }

  /**
   * 偏好排序：语言 → 码级 → 体积 → 汉化组 → 页数
   * （黑名单组仍通过 groupBonus 强惩罚 / pickBest 过滤）
   */
  function scoreEdition(edition, cfg) {
    const c = cfg || config;
    let score = 0;
    // 1e12 级：语言
    score += (10 - Math.min(9, langRank(edition.language, c.lang_order))) * 1e12;
    // 1e10 级：码级
    score += (10 - Math.min(9, censorRank(edition.censor_tier, c.censor_order))) * 1e10;
    // 1e6 级：体积（越大越好，对数压缩）
    const size = Number(edition.size_bytes) || 0;
    score += Math.min(9999, Math.floor(Math.log10(size + 1) * 1000)) * 1e6;
    // 1e4 级：汉化组（白名单加分、黑名单大惩罚）
    const gb = groupBonus(edition.group || '', c);
    score += (gb + 1000) * 1e4;
    // 1e2 级：页数
    const pages = Number(edition.pages) || 0;
    score += Math.min(9999, pages) * 1e2;
    // 末位：上传时间
    if (edition.posted_at) {
      score += Math.min(99, (Number(edition.posted_at) || 0) / 1e13);
    }
    return score;
  }

  function pickBestEdition(editions, cfg) {
    const list = (editions || []).filter(Boolean);
    if (!list.length) return null;
    // drop blacklisted groups when alternatives exist
    const c = cfg || config;
    let pool = list.slice();
    const nonBlack = pool.filter((ed) => groupBonus(ed.group || '', c) > -500);
    if (nonBlack.length) pool = nonBlack;
    let best = pool[0];
    let bestScore = scoreEdition(best, c);
    for (let i = 1; i < pool.length; i++) {
      const s = scoreEdition(pool[i], c);
      if (s > bestScore) {
        best = pool[i];
        bestScore = s;
      }
    }
    return best;
  }

  function structuralMatchScore(edition, archive) {
    if (!edition || !archive) return 0;
    let score = titleSimilarity(edition.title_raw || edition.title_core, archive.title || archive.title_core);
    if (!score) return 0;
    if (edition.group && archive.group) {
      if (compactText(edition.group).toLowerCase() === compactText(archive.group).toLowerCase()) score += 0.08;
    }
    if (edition.language && archive.language && edition.language === archive.language) score += 0.05;
    const ep = Number(edition.pages) || 0;
    const ap = Number(archive.pages) || 0;
    if (ep > 0 && ap > 0) {
      const diff = Math.abs(ep - ap);
      if (diff <= 2) score += 0.06;
      else if (diff <= 5) score += 0.03;
      else if (diff > Math.max(ep, ap) * 0.5) score -= 0.15;
    }
    if (edition.censor_tier && archive.censor_tier && edition.censor_tier === archive.censor_tier && edition.censor_tier !== 'unknown') {
      score += 0.03;
    }
    return Math.max(0, Math.min(1.2, score));
  }

  /** 页数容差：默认约 10%（10 页容 1 页），夹在 min~max */
  function pageDiffTolerance(pagesA, pagesB, cfg) {
    const c = cfg || config;
    const a = Number(pagesA) || 0;
    const b = Number(pagesB) || 0;
    const base = Math.min(a, b) > 0 ? Math.min(a, b) : Math.max(a, b);
    if (base <= 0) return Math.max(1, Number(c.pages_tolerance_min) || 1);
    const ratio = Number(c.pages_tolerance_ratio);
    const r = Number.isFinite(ratio) && ratio >= 0 ? ratio : 0.1;
    const min = Math.max(1, Number(c.pages_tolerance_min) || 1);
    const max = Math.max(min, Number(c.pages_tolerance_max) || 25);
    return Math.min(max, Math.max(min, Math.round(base * r)));
  }

  /** 体积容差：默认 max 侧的 12%，且不少于 minBytes */
  function sizeDiffTolerance(bytesA, bytesB, cfg) {
    const c = cfg || config;
    const a = Number(bytesA) || 0;
    const b = Number(bytesB) || 0;
    const hi = Math.max(a, b);
    if (hi <= 0) return Math.max(0, Number(c.size_tolerance_min_bytes) || 1024 * 1024);
    const ratio = Number(c.size_tolerance_ratio);
    const r = Number.isFinite(ratio) && ratio >= 0 ? ratio : 0.12;
    const minB = Math.max(0, Number(c.size_tolerance_min_bytes) || 1024 * 1024);
    return Math.max(minB, Math.round(hi * r));
  }

  /** 页均体积是否接近（删页后总积变了，但 bpp 仍像同一套图） */
  function isBytesPerPageClose(bytesA, pagesA, bytesB, pagesB, cfg) {
    const c = cfg || config;
    const pa = Number(pagesA) || 0;
    const pb = Number(pagesB) || 0;
    const ba = Number(bytesA) || 0;
    const bb = Number(bytesB) || 0;
    if (pa <= 0 || pb <= 0 || ba <= 0 || bb <= 0) return false;
    const bppA = ba / pa;
    const bppB = bb / pb;
    const hi = Math.max(bppA, bppB);
    if (hi <= 0) return false;
    const ratio = Number(c.bpp_tolerance_ratio);
    const r = Number.isFinite(ratio) && ratio >= 0 ? ratio : 0.2;
    return Math.abs(bppA - bppB) / hi <= r;
  }

  function isCensorBetter(candidateTier, baseTier, cfg) {
    const a = candidateTier || 'unknown';
    const b = baseTier || 'unknown';
    if (a === b) return false;
    // 已知码级优于「码未知」：无码 vs 码未知 → 无码更好
    if (a !== 'unknown' && b === 'unknown') return true;
    if (a === 'unknown' && b !== 'unknown') return false;
    return censorRank(a, (cfg || config).censor_order) < censorRank(b, (cfg || config).censor_order);
  }

  function isLangBetter(candidateLang, baseLang, cfg) {
    const a = candidateLang || 'other';
    const b = baseLang || 'other';
    if (a === b) return false;
    // 明确语言优于 other/unknown
    if (a && a !== 'other' && a !== 'unknown' && (!b || b === 'other' || b === 'unknown')) return true;
    if (b && b !== 'other' && b !== 'unknown' && (!a || a === 'other' || a === 'unknown')) return false;
    if (!a || a === 'other' || a === 'unknown') return false;
    if (!b || b === 'other' || b === 'unknown') return false;
    return langRank(a, (cfg || config).lang_order) < langRank(b, (cfg || config).lang_order);
  }

  /** 线上相对库内是否更优：只认语言/码级（页数体积不算） */
  function isEditionBetter(remote, base, cfg) {
    if (!remote || !base) return false;
    if (isLangBetter(remote.language, base.language, cfg)) return true;
    const rl = remote.language || 'other';
    const bl = base.language || 'other';
    // 同语言，或任一侧语言不明：仍可比码级
    const sameOrUnkLang =
      rl === bl ||
      !rl ||
      !bl ||
      rl === 'other' ||
      bl === 'other' ||
      rl === 'unknown' ||
      bl === 'unknown';
    if (sameOrUnkLang && isCensorBetter(remote.censor_tier, base.censor_tier, cfg)) return true;
    return false;
  }

  function shortLang(lang) {
    const l = compactText(lang || '').toLowerCase();
    if (!l || l === 'other' || l === 'unknown') return '?';
    if (l.startsWith('zh')) return '中';
    if (l === 'ja' || l.startsWith('jp')) return '日';
    if (l === 'en') return '英';
    if (l === 'ko') return '韩';
    return l.slice(0, 4);
  }

  function shortCensor(tier) {
    if (tier === 'uncensored') return '无码';
    if (tier === 'light') return '条纹';
    if (tier === 'heavy') return '厚码';
    if (tier === 'unknown' || !tier) return '码未知';
    return '';
  }

  function formatEditionBrief(ed) {
    if (!ed) return '—';
    const bits = [];
    const lg = shortLang(ed.language);
    if (lg !== '?') bits.push(lg);
    // 码级始终写出，避免「没写 = 无码」的误解
    const cs = shortCensor(ed.censor_tier || 'unknown');
    if (cs) {
      bits.push(ed.censor_from_eh_source ? cs + '(源)' : cs);
    }
    if (ed.group) bits.push(String(ed.group).slice(0, 10));
    if (ed.pages) bits.push(ed.pages + 'p');
    if (ed.size_bytes) bits.push(formatBytes(ed.size_bytes));
    return bits.join('/') || '未知';
  }

  function diffEditionVsArchive(edition, archive, cfg) {
    const c = cfg || config;
    const diffs = [];
    const same = [];
    const eLang = edition.language || 'other';
    const aLang = archive.language || 'other';
    if (eLang && aLang && eLang !== 'other' && aLang !== 'other') {
      if (eLang === aLang) same.push('语言');
      else diffs.push({ key: 'language', label: '语言', online: shortLang(eLang), library: shortLang(aLang), better: isLangBetter(eLang, aLang, c) ? 'online' : isLangBetter(aLang, eLang, c) ? 'library' : '' });
    }
    const eC = edition.censor_tier || 'unknown';
    const aC = archive.censor_tier || 'unknown';
    // 两侧都写；码未知 vs 无码 等要判 better
    if (eC === aC && eC !== 'unknown') {
      same.push('码级');
    } else if (eC !== aC) {
      diffs.push({
        key: 'censor',
        label: '码级',
        online: shortCensor(eC) || eC,
        library: shortCensor(aC) || aC,
        better: isCensorBetter(eC, aC, c) ? 'online' : isCensorBetter(aC, eC, c) ? 'library' : '',
        uncertain: eC === 'unknown' || aC === 'unknown' ? 1 : 0,
      });
    }
    const eg = compactText(edition.group || '').toLowerCase();
    const ag = compactText(archive.group || '').toLowerCase();
    if (eg && ag) {
      if (eg === ag) same.push('组');
      else diffs.push({ key: 'group', label: '汉化组', online: edition.group, library: archive.group, better: '' });
    }
    const ep = Number(edition.pages) || 0;
    const ap = Number(archive.pages) || 0;
    const es = Number(edition.size_bytes) || 0;
    const as = Number(archive.size_bytes) || 0;
    const pageTol = pageDiffTolerance(ep, ap, c);
    const sizeTol = sizeDiffTolerance(es, as, c);
    const bppClose = isBytesPerPageClose(es, ep, as, ap, c);
    let pageOut = false;
    let sizeOut = false;

    if (ep > 0 && ap > 0) {
      const pageDelta = Math.abs(ep - ap);
      if (pageDelta <= pageTol) {
        same.push('页数');
      } else {
        pageOut = true;
        // 超容差只标打包差异；页均体积接近时说明更像去广告而非换源
        diffs.push({
          key: 'pages',
          label: '页数',
          online: ep + 'p',
          library: ap + 'p',
          better: '',
          packaging: true,
          tolerance: pageTol,
          delta: pageDelta,
        });
      }
    }
    if (es > 0 && as > 0) {
      const sizeDelta = Math.abs(es - as);
      if (sizeDelta <= sizeTol) {
        same.push('体积');
      } else {
        sizeOut = true;
        diffs.push({
          key: 'size',
          label: '体积',
          online: formatBytes(es),
          library: formatBytes(as),
          better: '',
          packaging: true,
          tolerance: sizeTol,
          delta: sizeDelta,
        });
      }
    }

    // 总判定只看语言/码级；页数/体积只参与容差与打包说明
    const qualityKeys = { language: 1, censor: 1 };
    const onlineBetter = diffs.some((d) => d.better === 'online' && qualityKeys[d.key]);
    const libraryBetter = diffs.some((d) => d.better === 'library' && qualityKeys[d.key]) && !onlineBetter;
    const packagingDiffs = diffs.filter((d) => d.packaging || d.key === 'pages' || d.key === 'size');
    const packagingOnly = diffs.length > 0 && diffs.every((d) => d.packaging || d.key === 'pages' || d.key === 'size');

    let packaging_note = '';
    if (packagingDiffs.length) {
      const bits = [];
      if (pageOut) bits.push('页数容差±' + pageTol);
      if (sizeOut) bits.push('体积容差' + formatBytes(sizeTol));
      if (bppClose && (pageOut || sizeOut)) bits.push('页均体积接近');
      packaging_note =
        (bits.length ? bits.join(' · ') + '。' : '') +
        '页数/体积差只算打包差异（体积更大≠画质更好，常见广告页/重压/不同源包），不判「有更好版」';
    }

    let short = '';
    if (onlineBetter) {
      short = '线上质量更优';
    } else if (libraryBetter) {
      short = '库内质量更优';
    } else if (packagingOnly) {
      short = bppClose ? '打包差异(页均接近)' : '打包差异';
    } else if (diffs.length) {
      short = '库:' + diffs.slice(0, 2).map((d) => d.library).join('/');
    } else if (same.length) {
      short = '近似';
    } else {
      short = '标题像';
    }

    return {
      diffs,
      same,
      short_label: short,
      online_brief: formatEditionBrief(edition),
      library_brief: formatEditionBrief(archive),
      online_better: onlineBetter,
      library_better: libraryBetter,
      packaging_only: packagingOnly,
      packaging_note,
      page_tolerance: pageTol,
      size_tolerance: sizeTol,
      bpp_close: bppClose,
      title_sim: titleSimilarity(edition.title_raw || edition.title_core, archive.title || archive.title_core),
    };
  }

  /**
   * 线上两个 edition 之间对照（当前页 vs 同 Work 另一版本）。
   * 字段语义：left=当前，right=对照目标；复用与库对照相同的容差与质量判定。
   */
  function diffEditionVsEdition(left, right, cfg) {
    if (!left || !right) return null;
    const asArchive = {
      language: right.language,
      censor_tier: right.censor_tier,
      group: right.group,
      pages: right.pages,
      size_bytes: right.size_bytes,
      title: right.title_raw || right.title_core || right.title || '',
      title_core: right.title_core || '',
    };
    const base = diffEditionVsArchive(left, asArchive, cfg);
    if (!base) return null;
    // 把 online/library 语义改成 当前/对方，避免 UI 误读成 LRR
    const diffs = (base.diffs || []).map((d) =>
      Object.assign({}, d, {
        current: d.online,
        other: d.library,
        better:
          d.better === 'online' ? 'current' : d.better === 'library' ? 'other' : d.better || '',
      })
    );
    let short = base.short_label || '';
    if (base.online_better) short = '当前更优';
    else if (base.library_better) short = '对方更优';
    else if (base.packaging_only) short = base.bpp_close ? '打包差异(页均接近)' : '打包差异';
    else if (diffs.length) short = '有差异';
    else if (base.same && base.same.length) short = '接近';
    else short = '可对照';
    return {
      diffs,
      same: base.same || [],
      short_label: short,
      current_brief: base.online_brief,
      other_brief: base.library_brief,
      current_better: !!base.online_better,
      other_better: !!base.library_better,
      packaging_only: !!base.packaging_only,
      packaging_note: base.packaging_note || '',
      page_tolerance: base.page_tolerance,
      size_tolerance: base.size_tolerance,
      bpp_close: !!base.bpp_close,
    };
  }

  function tokenize(s) {
    return compactText(s)
      .toLowerCase()
      .split(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]+/i)
      .filter((t) => t.length >= 2);
  }

  function jaccard(aTokens, bTokens) {
    const a = new Set(aTokens);
    const b = new Set(bTokens);
    if (!a.size || !b.size) return 0;
    let inter = 0;
    for (const t of a) if (b.has(t)) inter++;
    return inter / (a.size + b.size - inter);
  }

  function titleSimilarity(a, b) {
    const ca = buildTitleCore(a);
    const cb = buildTitleCore(b);
    if (!ca || !cb) return 0;
    if (ca === cb) return 1;
    if (ca.includes(cb) || cb.includes(ca)) return 0.92;
    return jaccard(tokenize(ca), tokenize(cb));
  }

  function parseGalleryUrl(url) {
    const s = String(url || '');
    const m = s.match(/\/g\/(\d+)\/([0-9a-f]+)\/?/i);
    if (!m) return null;
    return { gid: m[1], token: m[2].toLowerCase() };
  }

  function buildGalleryUrl(host, gid, token) {
    const h = host || location.origin;
    return h.replace(/\/$/, '') + '/g/' + gid + '/' + token + '/';
  }

  function buildSearchUrl(host, query) {
    const h = (host || location.origin).replace(/\/$/, '');
    return h + '/?f_search=' + encodeURIComponent(query || '');
  }

  function editionKey(gid, token) {
    return String(gid) + ':' + String(token || '').toLowerCase();
  }

  function normalizeEditionRecord(partial) {
    const title = compactText(partial.title_raw || partial.title || '');
    const tags = Array.isArray(partial.tags) ? partial.tags.slice() : [];
    const group =
      compactText(partial.group) ||
      extractGroupFromTitle(title) ||
      extractGroupsFromTags(tags)[0] ||
      '';
    const language = partial.language || detectLanguageFromText(title, tags);
    const censor_tier = partial.censor_tier || detectCensorTier(title, tags);
    const size_bytes = Number(partial.size_bytes) || parseSizeToBytes(partial.size_text || '') || 0;
    return {
      gid: String(partial.gid || ''),
      token: String(partial.token || '').toLowerCase(),
      work_id: partial.work_id || '',
      title_raw: title,
      title_core: partial.title_core || buildTitleCore(title),
      language,
      group,
      pages: Number(partial.pages) || 0,
      category: compactText(partial.category || ''),
      size_bytes,
      size_tier: partial.size_tier || sizeTier(size_bytes),
      censor_tier,
      tags,
      uploader: compactText(partial.uploader || ''),
      posted_at: Number(partial.posted_at) || 0,
      url: partial.url || '',
      thumb: partial.thumb || '',
      updated_at: nowMs(),
    };
  }
  const STORE_WORKS = 'works';
  const STORE_EDITIONS = 'editions';
  const STORE_ARCHIVES = 'local_archives';
  const STORE_LINKS = 'links';
  const STORE_PROGRESS = 'progress';
  const STORE_TRACKING = 'tracking_searches';

  const TRACKING_GROUP_ORDER = ['artist', 'group', 'parody', 'character', 'female', 'male', 'tag', 'category', 'uploader', 'search', 'favorites', 'other'];
  const TRACKING_GROUP_LABELS = {
    artist: '画师',
    group: '社团/汉化组',
    parody: '原作',
    character: '角色',
    female: '女性标签',
    male: '男性标签',
    tag: '标签',
    category: '分类',
    uploader: '上传者',
    search: '搜索',
    favorites: '站内收藏夹',
    other: '其它',
  };

  function openDb() {
    return new Promise((resolve, reject) => {
      if (db) {
        resolve(db);
        return;
      }
      if (typeof indexedDB === 'undefined') {
        reject(new Error('indexedDB unavailable'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE_WORKS)) {
          const s = d.createObjectStore(STORE_WORKS, { keyPath: 'work_id' });
          s.createIndex('title_core', 'title_core', { unique: false });
          s.createIndex('status', 'status', { unique: false });
          s.createIndex('favorite', 'favorite', { unique: false });
        }
        if (!d.objectStoreNames.contains(STORE_EDITIONS)) {
          const s = d.createObjectStore(STORE_EDITIONS, { keyPath: 'id' });
          s.createIndex('work_id', 'work_id', { unique: false });
          s.createIndex('gid', 'gid', { unique: false });
          s.createIndex('title_core', 'title_core', { unique: false });
        }
        if (!d.objectStoreNames.contains(STORE_ARCHIVES)) {
          const s = d.createObjectStore(STORE_ARCHIVES, { keyPath: 'arcid' });
          s.createIndex('title_core', 'title_core', { unique: false });
          s.createIndex('eh_gid', 'eh_gid', { unique: false });
        }
        if (!d.objectStoreNames.contains(STORE_LINKS)) {
          const s = d.createObjectStore(STORE_LINKS, { keyPath: 'id' });
          s.createIndex('work_id', 'work_id', { unique: false });
          s.createIndex('edition_id', 'edition_id', { unique: false });
          s.createIndex('arcid', 'arcid', { unique: false });
        }
        if (!d.objectStoreNames.contains(STORE_PROGRESS)) {
          d.createObjectStore(STORE_PROGRESS, { keyPath: 'work_id' });
        }
        if (!d.objectStoreNames.contains(STORE_TRACKING)) {
          const s = d.createObjectStore(STORE_TRACKING, { keyPath: 'id' });
          s.createIndex('query_signature', 'query_signature', { unique: false });
          s.createIndex('group_type', 'group_type', { unique: false });
          s.createIndex('archived', 'archived', { unique: false });
        }
      };
      req.onsuccess = () => {
        db = req.result;
        resolve(db);
      };
      req.onerror = () => reject(req.error || new Error('idb open failed'));
    });
  }

  function idbReq(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** 与 exportBackup 一致的仓库；写后标 WebDAV 脏（import 批量时可 suppress） */
  const SYNCABLE_IDB_STORES = new Set([
    STORE_WORKS,
    STORE_EDITIONS,
    STORE_ARCHIVES,
    STORE_LINKS,
    STORE_PROGRESS,
    STORE_TRACKING,
  ]);
  let idbSyncSuppress = false;

  function markIdbStoreDirty(store) {
    if (idbSyncSuppress) return;
    if (!SYNCABLE_IDB_STORES.has(store)) return;
    if (typeof markCreamuLocalDirty === 'function') markCreamuLocalDirty();
  }

  async function idbPut(store, value) {
    const d = await openDb();
    const tx = d.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        markIdbStoreDirty(store);
        resolve(value);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGet(store, key) {
    const d = await openDb();
    return idbReq(d.transaction(store, 'readonly').objectStore(store).get(key));
  }

  async function idbDelete(store, key) {
    const d = await openDb();
    const tx = d.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        markIdbStoreDirty(store);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGetAll(store) {
    const d = await openDb();
    return idbReq(d.transaction(store, 'readonly').objectStore(store).getAll());
  }

  async function idbIndexGetAll(store, indexName, query) {
    const d = await openDb();
    const idx = d.transaction(store, 'readonly').objectStore(store).index(indexName);
    return idbReq(query === undefined ? idx.getAll() : idx.getAll(query));
  }

  function makeEditionId(gid, token) {
    return editionKey(gid, token);
  }

  async function upsertEdition(partial) {
    const rec = normalizeEditionRecord(partial);
    if (!rec.gid || !rec.token) throw new Error('edition requires gid/token');
    const id = makeEditionId(rec.gid, rec.token);
    const prev = await idbGet(STORE_EDITIONS, id);
    const merged = Object.assign({}, prev || {}, rec, { id });
    // 列表页常无标签：空 tags 不要冲掉画廊页已写入的完整标签
    if (
      prev &&
      Array.isArray(prev.tags) &&
      prev.tags.length &&
      (!Array.isArray(merged.tags) || !merged.tags.length)
    ) {
      merged.tags = prev.tags.slice();
    } else if (prev && Array.isArray(prev.tags) && prev.tags.length && Array.isArray(merged.tags)) {
      // 合并去重
      const set = new Set(prev.tags.map(String));
      merged.tags.forEach((t) => set.add(String(t)));
      merged.tags = Array.from(set);
    }
    // 列表缺语言/码级时保留旧值
    if (prev) {
      if ((!merged.language || merged.language === 'other') && prev.language && prev.language !== 'other') {
        merged.language = prev.language;
      }
      if (
        (!merged.censor_tier || merged.censor_tier === 'unknown') &&
        prev.censor_tier &&
        prev.censor_tier !== 'unknown'
      ) {
        merged.censor_tier = prev.censor_tier;
      }
      if (!merged.group && prev.group) merged.group = prev.group;
      if (!(Number(merged.pages) > 0) && Number(prev.pages) > 0) merged.pages = prev.pages;
      if (!(Number(merged.size_bytes) > 0) && Number(prev.size_bytes) > 0) {
        merged.size_bytes = prev.size_bytes;
      }
    }
    if (!merged.work_id) {
      merged.work_id = (prev && prev.work_id) || (await ensureWorkForEdition(merged)).work_id;
    }
    await idbPut(STORE_EDITIONS, merged);
    await touchWorkFromEdition(merged);
    // 点开画廊后回写 LRR 里 source=该 gid 的档案码级/语言
    try {
      await refreshArchivesBoundToEdition(merged);
    } catch (_) { /* ignore */ }
    return merged;
  }

  /** 本地见到 EH 画廊后，刷新所有 eh_gid 指向它的 LRR 档案质量维 */
  async function refreshArchivesBoundToEdition(edition) {
    if (!edition || !edition.gid) return 0;
    let rows = [];
    try {
      rows = (await idbIndexGetAll(STORE_ARCHIVES, 'eh_gid', String(edition.gid))) || [];
    } catch (_) {
      rows = [];
    }
    // 兜底：tags 含 gid 但 eh_gid 未写
    if (!rows.length) {
      const all = (await listArchives()) || [];
      rows = all.filter((a) => {
        if (a.eh_gid && String(a.eh_gid) === String(edition.gid)) return true;
        const g = extractEhGidFromTags(a.tags || []);
        return g && String(g) === String(edition.gid);
      });
    }
    let n = 0;
    for (const a of rows) {
      const en = applyBoundEditionQualityToArchive(
        Object.assign({}, a, { eh_gid: String(edition.gid) }),
        edition
      );
      const changed =
        en.language !== a.language ||
        en.censor_tier !== a.censor_tier ||
        (en.group && en.group !== a.group) ||
        !a.eh_gid;
      if (!changed) continue;
      a.eh_gid = String(edition.gid);
      a.language = en.language;
      a.censor_tier = en.censor_tier;
      if (en.group) a.group = en.group;
      a.quality_from_eh_source = 1;
      a.updated_at = nowMs();
      await idbPut(STORE_ARCHIVES, a);
      n++;
    }
    return n;
  }

  async function listEditionsByWork(workId) {
    if (!workId) return [];
    return idbIndexGetAll(STORE_EDITIONS, 'work_id', workId);
  }

  async function ensureWorkForEdition(edition) {
    if (edition.work_id) {
      const existing = await idbGet(STORE_WORKS, edition.work_id);
      if (existing) return existing;
    }

    if (config.auto_cluster) {
      const candidates = await idbIndexGetAll(STORE_EDITIONS, 'title_core', edition.title_core);
      let best = null;
      let bestScore = 0;
      for (const ed of candidates || []) {
        if (!ed.work_id) continue;
        if (ed.gid === edition.gid && ed.token === edition.token) continue;
        let score = titleSimilarity(edition.title_raw, ed.title_raw);
        if (edition.group && ed.group && edition.group.toLowerCase() === String(ed.group).toLowerCase()) {
          score += 0.05;
        }
        if (score >= (config.cluster_threshold || 0.82) && score > bestScore) {
          bestScore = score;
          best = ed;
        }
      }
      if (best && best.work_id) {
        const work = await idbGet(STORE_WORKS, best.work_id);
        if (work) return work;
      }
    }

    const work = {
      work_id: uid('work'),
      title_raw: edition.title_raw,
      title_core: edition.title_core,
      favorite: 0,
      status: 'none', // none | want | reading | read | dropped
      blocked: 0,
      note: '',
      created_at: nowMs(),
      updated_at: nowMs(),
    };
    await idbPut(STORE_WORKS, work);
    return work;
  }

  async function touchWorkFromEdition(edition) {
    if (!edition.work_id) return null;
    const work = (await idbGet(STORE_WORKS, edition.work_id)) || {
      work_id: edition.work_id,
      favorite: 0,
      status: 'none',
      blocked: 0,
      note: '',
      created_at: nowMs(),
    };
    if (!work.title_core) work.title_core = edition.title_core;
    if (!work.title_raw) work.title_raw = edition.title_raw;
    work.updated_at = nowMs();
    await idbPut(STORE_WORKS, work);
    return work;
  }

  async function setWorkStatus(workId, status) {
    const work = await idbGet(STORE_WORKS, workId);
    if (!work) return null;
    work.status = status || 'none';
    work.updated_at = nowMs();
    await idbPut(STORE_WORKS, work);
    return work;
  }

  async function setWorkBlocked(workId, blocked) {
    const work = await idbGet(STORE_WORKS, workId);
    if (!work) return null;
    work.blocked = blocked ? 1 : 0;
    work.updated_at = nowMs();
    await idbPut(STORE_WORKS, work);
    return work;
  }

  async function mergeWorks(targetWorkId, sourceWorkId) {
    if (!targetWorkId || !sourceWorkId || targetWorkId === sourceWorkId) return null;
    const editions = await listEditionsByWork(sourceWorkId);
    for (const ed of editions) {
      ed.work_id = targetWorkId;
      ed.updated_at = nowMs();
      await idbPut(STORE_EDITIONS, ed);
    }
    const links = await idbIndexGetAll(STORE_LINKS, 'work_id', sourceWorkId);
    for (const link of links || []) {
      link.work_id = targetWorkId;
      await idbPut(STORE_LINKS, link);
    }
    const prog = await idbGet(STORE_PROGRESS, sourceWorkId);
    if (prog) {
      prog.work_id = targetWorkId;
      await idbPut(STORE_PROGRESS, prog);
      await idbDelete(STORE_PROGRESS, sourceWorkId);
    }
    await idbDelete(STORE_WORKS, sourceWorkId);
    return idbGet(STORE_WORKS, targetWorkId);
  }

  /** 按 gid 取本地已见 edition（LRR source 绑定用） */
  async function getEditionByGid(gid) {
    const g = String(gid || '');
    if (!g) return null;
    try {
      const rows = await idbIndexGetAll(STORE_EDITIONS, 'gid', g);
      if (rows && rows.length) {
        // 同 gid 多 token 时取较新
        return rows.slice().sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0))[0];
      }
    } catch (_) { /* ignore */ }
    return null;
  }

  async function putArchive(rec) {
    const title = compactText(rec.title || '');
    const tags = Array.isArray(rec.tags) ? rec.tags : String(rec.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
    const eh = extractEhGidFromTags(tags) || rec.eh_gid || '';
    let language = detectLanguageFromText(title, tags);
    let censor_tier = detectCensorTier(title, tags);
    let group = extractGroupFromTitle(title) || extractGroupsFromTags(tags)[0] || '';
    let quality_from_eh_source = 0;
    // 有 source/eh_gid 时，用本地已点过的 EH 画廊元数据覆盖码级/语言（否则 LRR 标签常缺 uncensored）
    if (eh) {
      const bound = await getEditionByGid(eh);
      if (bound) {
        const enriched = applyBoundEditionQualityToArchive(
          { language, censor_tier, group, eh_gid: eh },
          bound
        );
        language = enriched.language || language;
        censor_tier = enriched.censor_tier || censor_tier;
        group = enriched.group || group;
        quality_from_eh_source = 1;
      }
    }
    const row = {
      arcid: String(rec.arcid),
      title,
      title_core: buildTitleCore(title),
      tags,
      size_bytes: Number(rec.size_bytes) || parseSizeToBytes(rec.size || rec.filesize || '') || 0,
      size_tier: sizeTier(Number(rec.size_bytes) || 0),
      language,
      censor_tier,
      group,
      pages: Number(rec.pages) || 0,
      eh_gid: eh ? String(eh) : '',
      quality_from_eh_source,
      updated_at: nowMs(),
    };
    row.size_tier = sizeTier(row.size_bytes);
    await idbPut(STORE_ARCHIVES, row);
    return row;
  }

  /**
   * 对比前把 LRR 档案质量维 enrich 成「绑定 EH 源」视角。
   * @param {object} archive
   * @param {Map<string, object>} [edByGid] 可选预载 map
   */
  async function enrichArchiveForCompare(archive, edByGid) {
    if (!archive) return archive;
    const gid = archive.eh_gid || extractEhGidFromTags(archive.tags || '') || '';
    if (!gid) {
      // 无绑定源：仍用标题/标签检测（已含 other:uncensored）
      return Object.assign({}, archive, {
        language: archive.language || detectLanguageFromText(archive.title, archive.tags),
        censor_tier: archive.censor_tier || detectCensorTier(archive.title, archive.tags),
      });
    }
    let bound = null;
    if (edByGid && edByGid.has(String(gid))) bound = edByGid.get(String(gid));
    else bound = await getEditionByGid(gid);
    if (!bound) {
      // 尚未点过源画廊：至少重跑标签检测
      return Object.assign({}, archive, {
        eh_gid: String(gid),
        language: detectLanguageFromText(archive.title, archive.tags) || archive.language,
        censor_tier: detectCensorTier(archive.title, archive.tags) || archive.censor_tier,
      });
    }
    return applyBoundEditionQualityToArchive(
      Object.assign({}, archive, { eh_gid: String(gid) }),
      bound
    );
  }

  function extractEhGidFromTags(tags) {
    const src = extractEhSourceFromTags(tags);
    if (src && src.gid) return src.gid;
    for (const raw of tags || []) {
      const t = String(raw);
      let m = t.match(/(?:^|:)(?:ehgid|gid)[=:](\d+)/i);
      if (m) return m[1];
      m = t.match(/(?:exhentai|e-hentai)\.org\/g\/(\d+)/i);
      if (m) return m[1];
      m = t.match(/source:.*?\/g\/(\d+)/i);
      if (m) return m[1];
    }
    return '';
  }

  /** 从 LRR 标签解析 EH 源（gid + token，若有） */
  function extractEhSourceFromTags(tags) {
    for (const raw of tags || []) {
      const t = String(raw);
      let m = t.match(/(?:exhentai|e-hentai)\.org\/g\/(\d+)\/([0-9a-f]{8,})/i);
      if (m) return { gid: m[1], token: m[2] };
      m = t.match(/source:.*?\/g\/(\d+)\/([0-9a-f]{8,})/i);
      if (m) return { gid: m[1], token: m[2] };
    }
    return null;
  }

  async function clearArchives() {
    const all = await idbGetAll(STORE_ARCHIVES);
    for (const row of all || []) {
      await idbDelete(STORE_ARCHIVES, row.arcid);
    }
  }

  async function listArchives() {
    return idbGetAll(STORE_ARCHIVES);
  }

  async function putLink(link) {
    const row = Object.assign(
      {
        id: link.id || uid('link'),
        work_id: link.work_id || '',
        edition_id: link.edition_id || '',
        arcid: link.arcid || '',
        confidence: link.confidence || 'manual',
        source: link.source || 'manual',
        negative: link.negative ? 1 : 0,
        /** 用户确认与库内为同一打包/版本（忽略页数体积容差外的打包差异） */
        same_version: link.same_version ? 1 : 0,
        updated_at: nowMs(),
      },
      link
    );
    row.id = row.id || uid('link');
    row.same_version = row.same_version ? 1 : 0;
    await idbPut(STORE_LINKS, row);
    return row;
  }

  async function listLinks() {
    return idbGetAll(STORE_LINKS);
  }

  async function findLinksForEdition(editionId) {
    return (await idbIndexGetAll(STORE_LINKS, 'edition_id', editionId)) || [];
  }

  async function unlinkArchive(editionId, workId, arcid) {
    const links = await listLinks();
    for (const l of links || []) {
      if (l.arcid !== arcid) continue;
      if ((editionId && l.edition_id === editionId) || (workId && l.work_id === workId)) {
        await idbDelete(STORE_LINKS, l.id);
      }
    }
  }

  async function bindArchiveToEdition(edition, arcid, source) {
    if (!edition || !arcid) throw new Error('bind requires edition/arcid');
    const editionId = edition.id || makeEditionId(edition.gid, edition.token);
    const asSame = source === 'same_version';
    const existing = (await findLinksForEdition(editionId)).filter((l) => l.arcid === String(arcid));
    for (const l of existing) {
      if (l.negative) {
        await idbDelete(STORE_LINKS, l.id);
        continue;
      }
      if (asSame && !l.same_version) {
        return putLink(
          Object.assign({}, l, {
            same_version: 1,
            confidence: 'same_version',
            source: 'same_version',
            negative: 0,
          })
        );
      }
      return l;
    }
    return putLink({
      work_id: edition.work_id || '',
      edition_id: editionId,
      arcid: String(arcid),
      confidence: asSame ? 'same_version' : source === 'manual' ? 'manual' : source || 'manual',
      source: asSame ? 'same_version' : source || 'manual',
      same_version: asSame ? 1 : 0,
      negative: 0,
    });
  }

  /**
   * 手动确认「就是这个库内版本」（同源）。
   * 会建立/升级绑定，并尽量回写 archive.eh_gid 方便以后精确命中。
   */
  async function markEditionArchiveSameVersion(edition, arcid) {
    if (!edition || !arcid) throw new Error('same_version requires edition/arcid');
    const link = await bindArchiveToEdition(edition, arcid, 'same_version');
    try {
      const arc = await idbGet(STORE_ARCHIVES, String(arcid));
      if (arc && edition.gid && !arc.eh_gid) {
        arc.eh_gid = String(edition.gid);
        arc.updated_at = nowMs();
        await putArchive(arc);
      }
    } catch (_) { /* ignore */ }
    return link;
  }

  async function negateArchiveForEdition(edition, arcid) {
    const editionId = edition.id || makeEditionId(edition.gid, edition.token);
    // remove positive links first
    await unlinkArchive(editionId, edition.work_id, arcid);
    return putLink({
      work_id: edition.work_id || '',
      edition_id: editionId,
      arcid: String(arcid),
      confidence: 'manual',
      source: 'negative',
      same_version: 0,
      negative: 1,
    });
  }

  async function getProgress(workId) {
    if (!workId) return null;
    return idbGet(STORE_PROGRESS, workId);
  }

  async function setProgress(workId, page, total) {
    if (!workId) return null;
    const row = {
      work_id: workId,
      page: Number(page) || 0,
      total: Number(total) || 0,
      updated_at: nowMs(),
    };
    await idbPut(STORE_PROGRESS, row);
    return row;
  }

  async function findMergeCandidates(edition) {
    if (!edition || !edition.title_core) return [];
    const all = await idbIndexGetAll(STORE_EDITIONS, 'title_core', edition.title_core);
    const map = new Map();
    for (const ed of all || []) {
      if (!ed.work_id || ed.work_id === edition.work_id) continue;
      if (ed.gid === edition.gid) continue;
      const sim = titleSimilarity(edition.title_raw, ed.title_raw);
      if (sim < 0.75) continue;
      const prev = map.get(ed.work_id);
      if (!prev || sim > prev.sim) {
        map.set(ed.work_id, { work_id: ed.work_id, title_raw: ed.title_raw, sim, sample_gid: ed.gid });
      }
    }
    // also scan works with similar title_core via all editions loosely
    if (map.size < 8) {
      const eds = await idbGetAll(STORE_EDITIONS);
      for (const ed of eds || []) {
        if (!ed.work_id || ed.work_id === edition.work_id) continue;
        const sim = titleSimilarity(edition.title_raw, ed.title_raw);
        if (sim < 0.8) continue;
        const prev = map.get(ed.work_id);
        if (!prev || sim > prev.sim) {
          map.set(ed.work_id, { work_id: ed.work_id, title_raw: ed.title_raw, sim, sample_gid: ed.gid });
        }
      }
    }
    return [...map.values()].sort((a, b) => b.sim - a.sim).slice(0, 12);
  }

  async function splitEditionToNewWork(edition) {
    if (!edition) return null;
    const id = edition.id || makeEditionId(edition.gid, edition.token);
    const ed = (await idbGet(STORE_EDITIONS, id)) || edition;
    const work = {
      work_id: uid('work'),
      title_raw: ed.title_raw,
      title_core: ed.title_core,
      favorite: 0,
      status: 'none',
      blocked: 0,
      note: '',
      created_at: nowMs(),
      updated_at: nowMs(),
    };
    await idbPut(STORE_WORKS, work);
    ed.work_id = work.work_id;
    ed.updated_at = nowMs();
    await idbPut(STORE_EDITIONS, ed);
    return { work, edition: ed };
  }

  async function findArchiveCandidates(edition, limit) {
    const archives = await listArchives();
    const links = await listLinks();
    const editionId = edition.id || makeEditionId(edition.gid, edition.token);
    const workId = edition.work_id;
    const negative = new Set(
      (links || [])
        .filter((l) => l.negative && (l.edition_id === editionId || (workId && l.work_id === workId)))
        .map((l) => l.arcid)
    );
    const positive = new Set(
      (links || []).filter((l) => !l.negative && l.edition_id === editionId).map((l) => l.arcid)
    );
    const sameVersion = new Set(
      (links || [])
        .filter((l) => !l.negative && l.same_version && l.edition_id === editionId)
        .map((l) => l.arcid)
    );

    const scored = [];
    for (const a of archives || []) {
      if (negative.has(a.arcid)) continue;
      let score = 0;
      let reason = '';
      if (a.eh_gid && String(a.eh_gid) === String(edition.gid)) {
        score = 1.5;
        reason = 'ehgid';
      } else {
        score = structuralMatchScore(edition, a);
        reason = score >= 0.88 ? 'structural' : score >= 0.75 ? 'fuzzy' : '';
      }
      if (positive.has(a.arcid)) {
        score = Math.max(score, 1.2);
        reason = 'linked';
      }
      if (sameVersion.has(a.arcid)) {
        score = Math.max(score, 1.4);
        reason = 'same_version';
      }
      if (score < 0.72 && reason !== 'linked' && reason !== 'same_version') continue;
      scored.push({
        archive: a,
        score,
        reason,
        linked: positive.has(a.arcid),
        same_version: sameVersion.has(a.arcid),
      });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit || 15);
  }

  async function resolveLibraryState(edition) {
    const archives = await listArchives();
    const links = await listLinks();
    const editionId = edition.id || makeEditionId(edition.gid, edition.token);
    const workId = edition.work_id;

    const negativeArc = new Set(
      links.filter((l) => l.negative && (l.edition_id === editionId || l.work_id === workId)).map((l) => l.arcid)
    );

    const linked = links.filter(
      (l) =>
        !l.negative &&
        ((l.edition_id && l.edition_id === editionId) || (l.work_id && workId && l.work_id === workId))
    );

    const byGid = archives.filter((a) => a.eh_gid && String(a.eh_gid) === String(edition.gid));
    const exactArcIds = new Set([
      ...linked.filter((l) => l.edition_id === editionId).map((l) => l.arcid),
      ...byGid.map((a) => a.arcid),
    ]);

    const workArcIds = new Set([...exactArcIds, ...linked.map((l) => l.arcid)]);

    if (workId) {
      const siblings = await listEditionsByWork(workId);
      for (const ed of siblings) {
        for (const a of archives) {
          if (a.eh_gid && String(a.eh_gid) === String(ed.gid)) workArcIds.add(a.arcid);
        }
      }
    }

    const exactArchives = archives.filter((a) => exactArcIds.has(a.arcid) && !negativeArc.has(a.arcid));
    const workArchives = archives.filter((a) => workArcIds.has(a.arcid) && !negativeArc.has(a.arcid));

    // 同 work edition map：LRR source/eh_gid → 码级语言
    const siblingEds = workId ? await listEditionsByWork(workId) : [edition];
    const edByGid = new Map();
    (siblingEds || []).forEach((ed) => {
      if (ed && ed.gid) edByGid.set(String(ed.gid), ed);
    });
    if (edition && edition.gid) edByGid.set(String(edition.gid), edition);

    // 在库的 EH gid（绑源 / 当前页 eh_gid 命中）
    const libraryGids = new Set();
    for (const a of workArchives.concat(exactArchives)) {
      const g = a.eh_gid || extractEhGidFromTags(a.tags || '');
      if (g) libraryGids.add(String(g));
    }
    // 已绑定到本 work 的 edition_id → gid
    for (const l of linked) {
      if (!l.edition_id) continue;
      const m = String(l.edition_id).match(/^e_(\d+)_/);
      if (m) libraryGids.add(m[1]);
      // 也从 sibling 反查
      for (const ed of siblingEds || []) {
        if (ed && (ed.id === l.edition_id || makeEditionId(ed.gid, ed.token) === l.edition_id)) {
          libraryGids.add(String(ed.gid));
        }
      }
    }

    const fuzzy = [];
    if (edition.title_core) {
      for (const a of archives) {
        if (negativeArc.has(a.arcid)) continue;
        if (exactArcIds.has(a.arcid) || workArcIds.has(a.arcid)) continue;
        const aEn = await enrichArchiveForCompare(a, edByGid);
        const score = structuralMatchScore(edition, aEn);
        if (score < 0.85) continue;
        const compare = diffEditionVsArchive(edition, aEn, config);
        fuzzy.push({ archive: aEn, sim: score, score, compare });
      }
      fuzzy.sort((x, y) => y.score - x.score);
    }
    const fuzzyTop = fuzzy.slice(0, 8);

    const preferredEdition = pickBestEdition(siblingEds && siblingEds.length ? siblingEds : [edition], config);
    let preferred_in_library = false;
    if (preferredEdition) {
      preferred_in_library = await resolveEditionExactInLibrary(preferredEdition, archives, links);
    }

    const sameVersionArcIds = new Set(
      links
        .filter(
          (l) =>
            !l.negative &&
            l.same_version &&
            ((l.edition_id && l.edition_id === editionId) || (workId && l.work_id === workId && l.work_id))
        )
        .map((l) => l.arcid)
    );

    let has_better_remote = false;
    let library_compare = null;
    let compareArc = null;

    if (workArchives.length || exactArchives.length) {
      const pool = exactArchives.length ? exactArchives : workArchives;
      // 先按绑定 EH 源 enrich，再比质量（否则 LRR 全是 unknown 无法比码）
      const enriched = [];
      for (const a of pool) {
        enriched.push(await enrichArchiveForCompare(a, edByGid));
      }
      // 优先：eh_gid 就是当前画廊；否则按偏好分
      const exactGidArc = enriched.find((a) => a.eh_gid && String(a.eh_gid) === String(edition.gid));
      compareArc =
        exactGidArc ||
        enriched.slice().sort((a, b) => scoreEdition(b, config) - scoreEdition(a, config))[0];
      library_compare = diffEditionVsArchive(edition, compareArc, config);
      const remotes = siblingEds && siblingEds.length ? siblingEds : [edition];
      for (const r of remotes) {
        if (isEditionBetter(r, compareArc, config)) {
          has_better_remote = true;
          break;
        }
      }
    } else if (fuzzyTop.length) {
      compareArc = await enrichArchiveForCompare(fuzzyTop[0].archive, edByGid);
      library_compare = diffEditionVsArchive(edition, compareArc, config);
    }

    const same_version_confirmed =
      !!(compareArc && sameVersionArcIds.has(compareArc.arcid)) ||
      exactArchives.some((a) => sameVersionArcIds.has(a.arcid));

    if (library_compare && same_version_confirmed) {
      // 用户已确认同源：去掉打包维噪音，仅保留语言/码级等质量差异
      const kept = (library_compare.diffs || []).filter(
        (d) => d.key === 'language' || d.key === 'censor' || d.key === 'group'
      );
      library_compare = Object.assign({}, library_compare, {
        diffs: kept,
        packaging_only: false,
        packaging_note: '',
        same_version: true,
        online_better: kept.some((d) => d.better === 'online'),
        library_better: kept.some((d) => d.better === 'library') && !kept.some((d) => d.better === 'online'),
        short_label: kept.length ? library_compare.short_label : '已确认同源',
      });
      // 仅打包导致的「更好线上版」不再提示
      if (!kept.some((d) => d.key === 'language' || d.key === 'censor')) {
        has_better_remote = false;
      }
    }

    const maybe_in_library = !exactArchives.length && !workArchives.length && fuzzyTop.length > 0;
    let maybe_label = '';
    if (maybe_in_library && library_compare) {
      maybe_label = library_compare.short_label || '可能在库';
      if (library_compare.diffs && library_compare.diffs.length === 0) {
        maybe_label = '库内近似';
      }
    }

    const same_target_arcid =
      (compareArc && compareArc.arcid) ||
      (exactArchives[0] && exactArchives[0].arcid) ||
      (workArchives[0] && workArchives[0].arcid) ||
      (fuzzyTop[0] && fuzzyTop[0].archive && fuzzyTop[0].archive.arcid) ||
      '';

    return {
      edition_in_library: exactArchives.length > 0,
      work_in_library: workArchives.length > 0 || exactArchives.length > 0,
      preferred_in_library,
      has_better_remote,
      maybe_in_library,
      maybe_label,
      library_compare,
      exact_archives: exactArchives,
      work_archives: workArchives,
      fuzzy_candidates: fuzzyTop,
      same_version_confirmed,
      same_target_arcid: String(same_target_arcid || ''),
      /** 在库档案对应的 EH gid，详情页多版本列表置顶高亮 */
      library_gids: Array.from(libraryGids),
      compare_archive: compareArc || null,
    };
  }

  async function resolveEditionExactInLibrary(edition, archives, links) {
    const editionId = edition.id || makeEditionId(edition.gid, edition.token);
    if ((links || []).some((l) => !l.negative && l.edition_id === editionId && l.arcid)) return true;
    return (archives || []).some((a) => a.eh_gid && String(a.eh_gid) === String(edition.gid));
  }

  async function listBlockedWorks() {
    const all = await idbGetAll(STORE_WORKS);
    return (all || []).filter((w) => w.blocked).sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  }

  /** LRR 在库：以 local_archives 为准，再挂 work/edition/link（若有） */
  async function listLibraryArchiveEntries() {
    const archives = (await listArchives()) || [];
    if (!archives.length) return [];

    const links = (await listLinks()) || [];
    const editions = (await idbGetAll(STORE_EDITIONS)) || [];
    const works = (await idbGetAll(STORE_WORKS)) || [];
    const workMap = new Map(works.map((w) => [w.work_id, w]));
    const edById = new Map();
    const edByGid = new Map();
    for (const ed of editions) {
      const id = ed.id || makeEditionId(ed.gid, ed.token);
      if (id) edById.set(String(id), ed);
      if (ed.gid != null && ed.gid !== '') {
        const g = String(ed.gid);
        if (!edByGid.has(g)) edByGid.set(g, ed);
      }
    }
    const linkByArc = new Map();
    for (const l of links) {
      if (!l || l.negative || !l.arcid) continue;
      const key = String(l.arcid);
      const prev = linkByArc.get(key);
      // 优先 same_version / 有 work_id 的链接
      if (!prev || (l.same_version && !prev.same_version) || (l.work_id && !prev.work_id)) {
        linkByArc.set(key, l);
      }
    }

    const out = [];
    for (const a of archives) {
      if (!a || !a.arcid) continue;
      const link = linkByArc.get(String(a.arcid)) || null;
      let edition = null;
      let work = null;
      if (link) {
        if (link.edition_id) edition = edById.get(String(link.edition_id)) || null;
        if (link.work_id) work = workMap.get(link.work_id) || null;
      }
      if (!edition && a.eh_gid) {
        edition = edByGid.get(String(a.eh_gid)) || null;
      }
      if (!work && edition && edition.work_id) {
        work = workMap.get(edition.work_id) || null;
      }
      const source = extractEhSourceFromTags(a.tags) || (a.eh_gid ? { gid: String(a.eh_gid), token: '' } : null);
      out.push({ archive: a, work, edition, link, source });
    }

    out.sort((x, y) => {
      const tx = compactText((x.work && x.work.title_raw) || (x.edition && x.edition.title_raw) || x.archive.title || '');
      const ty = compactText((y.work && y.work.title_raw) || (y.edition && y.edition.title_raw) || y.archive.title || '');
      return tx.localeCompare(ty, 'zh');
    });
    return out;
  }

  async function listAllWorks() {
    const all = await idbGetAll(STORE_WORKS);
    return (all || []).sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  }

  async function listTrackingSearches() {
    const all = await idbGetAll(STORE_TRACKING);
    const live = (all || []).filter((r) => !r.archived);
    // 同 site + 同搜索词的历史重复项：列表时合并（保留有断点/较新的）
    const byKey = new Map();
    const orphans = [];
    for (const r of live) {
      const site = r.site || '';
      const fs = trackingFSearchKey(r.f_search || r.label || '');
      if (!fs) {
        orphans.push(r);
        continue;
      }
      const key = site + '\0' + fs;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, r);
        continue;
      }
      // 选保留者
      const prevBp = prev.breakpoint_gid ? 1 : 0;
      const curBp = r.breakpoint_gid ? 1 : 0;
      let keep = prev;
      let drop = r;
      if (curBp > prevBp || (curBp === prevBp && (r.updated_at || 0) > (prev.updated_at || 0))) {
        keep = r;
        drop = prev;
      }
      if (typeof mergeTrackingRecord === 'function') {
        const merged = mergeTrackingRecord(keep, drop);
        Object.assign(keep, merged);
        keep.id = keep.id || merged.id;
      }
      byKey.set(key, keep);
      if (drop && drop.id && drop.id !== keep.id) {
        try {
          await idbDelete(STORE_TRACKING, drop.id);
        } catch (_) { /* ignore */ }
      }
      try {
        await idbPut(STORE_TRACKING, keep);
      } catch (_) { /* ignore */ }
    }
    const out = orphans.concat([...byKey.values()]);
    return out.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  }

  async function getTrackingBySignature(sig) {
    if (!sig) return null;
    const rows = await idbIndexGetAll(STORE_TRACKING, 'query_signature', sig);
    return (rows || []).find((r) => !r.archived) || null;
  }

  function trackingFSearchKey(s) {
    if (typeof normalizeTrackingFSearch === 'function') return normalizeTrackingFSearch(s);
    return compactText(s)
      .toLowerCase()
      .replace(/[＋+]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * 按上下文找追更：先精确签名，再按 site+f_search 软匹配（吞掉旧版噪声签名重复）。
   * 若命中多条重复，合并进一条并删其余。
   */
  async function findTrackingForContext(context) {
    if (!context) return null;
    const sig = context.query_signature || '';
    if (sig) {
      const exact = await getTrackingBySignature(sig);
      if (exact) return exact;
    }
    const all = await listTrackingSearches();
    if (!all.length) return null;
    const site = context.site || '';
    const fs = trackingFSearchKey(context.f_search || '');
    const labelKey = trackingFSearchKey(context.label || '');
    const hits = all.filter((r) => {
      if (r.archived) return false;
      if (site && r.site && r.site !== site) return false;
      if (sig && r.query_signature === sig) return true;
      const rfs = trackingFSearchKey(r.f_search || '');
      if (fs && rfs && fs === rfs) return true;
      // 旧签名把 f_search 嵌在中间段
      if (fs && r.query_signature && String(r.query_signature).toLowerCase().indexOf(fs) >= 0) return true;
      const rl = trackingFSearchKey(r.label || r.custom_label || '');
      if (labelKey && rl && labelKey === rl && fs) return true;
      return false;
    });
    if (!hits.length) return null;
    if (hits.length === 1) {
      const one = hits[0];
      // 迁移到新签名 / 首页 open_url
      let dirty = false;
      if (sig && one.query_signature !== sig) {
        one.query_signature = sig;
        dirty = true;
      }
      if (context.open_url) {
        const canon =
          typeof canonicalizeTrackingOpenUrl === 'function'
            ? canonicalizeTrackingOpenUrl(context.open_url)
            : context.open_url;
        if (one.open_url !== canon) {
          one.open_url = canon;
          one.page_url = canon;
          dirty = true;
        }
      }
      if (dirty) await saveTrackingRecord(one);
      return one;
    }
    // 多条重复：保留「有断点 / 最近浏览」优先者，合并字段后删其余
    hits.sort((a, b) => {
      const bpA = a.breakpoint_gid ? 1 : 0;
      const bpB = b.breakpoint_gid ? 1 : 0;
      if (bpA !== bpB) return bpB - bpA;
      return (b.last_browsed_at || b.updated_at || 0) - (a.last_browsed_at || a.updated_at || 0);
    });
    const keep = hits[0];
    for (let i = 1; i < hits.length; i++) {
      const other = hits[i];
      if (typeof mergeTrackingRecord === 'function') {
        const merged = mergeTrackingRecord(keep, other);
        Object.assign(keep, merged);
      } else {
        if (!keep.breakpoint_gid && other.breakpoint_gid) {
          keep.breakpoint_gid = other.breakpoint_gid;
          keep.breakpoint_token = other.breakpoint_token;
          keep.breakpoint_title = other.breakpoint_title;
          keep.breakpoint_page = other.breakpoint_page;
          keep.breakpoint_url = other.breakpoint_url;
          keep.breakpoint_posted_at = other.breakpoint_posted_at;
        }
        if (!keep.top_gid && other.top_gid) {
          keep.top_gid = other.top_gid;
          keep.top_token = other.top_token;
          keep.top_title = other.top_title;
          keep.top_posted_at = other.top_posted_at;
        }
        // 未读跟较新断点，禁止 max 粘住旧大数
        const ka = Number(keep.breakpoint_at) || 0;
        const oa = Number(other.breakpoint_at) || 0;
        if (oa > ka && other.unread_estimate != null) {
          keep.unread_estimate = Number(other.unread_estimate) || 0;
          keep.unread_estimate_capped = other.unread_estimate_capped ? 1 : 0;
        }
        if (other.has_update) keep.has_update = 1;
      }
      try {
        await deleteTrackingRecord(other.id);
      } catch (_) { /* ignore */ }
    }
    if (sig) keep.query_signature = sig;
    if (context.open_url) {
      const canon =
        typeof canonicalizeTrackingOpenUrl === 'function'
          ? canonicalizeTrackingOpenUrl(context.open_url)
          : context.open_url;
      keep.open_url = canon;
      keep.page_url = canon;
    }
    if (context.f_search) keep.f_search = context.f_search;
    if (context.label) keep.label = context.label;
    await saveTrackingRecord(keep);
    return keep;
  }

  async function saveTrackingRecord(record) {
    const row = Object.assign({}, record, { updated_at: nowMs() });
    if (!row.id) row.id = uid('trk');
    if (!row.created_at) row.created_at = nowMs();
    await idbPut(STORE_TRACKING, row);
    return row;
  }

  async function deleteTrackingRecord(id) {
    if (!id) return;
    await idbDelete(STORE_TRACKING, id);
  }

  async function upsertTrackingFromContext(context, options = {}) {
    if (!context || !context.query_signature) throw new Error('无法识别当前页为可收藏搜索');
    const openCanon =
      typeof canonicalizeTrackingOpenUrl === 'function'
        ? canonicalizeTrackingOpenUrl(context.open_url || context.page_url || location.href)
        : context.open_url || context.page_url || location.href;
    context.open_url = openCanon;
    context.page_url = openCanon;

    let existing = null;
    if (!options.forceNew) {
      existing =
        typeof findTrackingForContext === 'function'
          ? await findTrackingForContext(context)
          : await getTrackingBySignature(context.query_signature);
    }
    if (existing && !options.forceNew) {
      existing.query_signature = context.query_signature || existing.query_signature;
      existing.open_url = openCanon;
      existing.page_url = openCanon;
      existing.label = context.label || existing.label;
      existing.group_type = context.group_type || existing.group_type;
      existing.f_search = context.f_search || existing.f_search;
      existing.namespace = context.namespace || existing.namespace;
      existing.tag_name = context.tag_name || existing.tag_name;
      if (context.site) existing.site = context.site;
      if (context.favcat != null && context.favcat !== '') existing.favcat = context.favcat;
      if (context.favcat_label) existing.favcat_label = context.favcat_label;
      existing.last_browsed_at = nowMs();
      // 仅首页上下文才更新 top（深页 top_gid 为空）
      if (context.top_gid) {
        if (existing.top_gid && existing.top_gid !== context.top_gid) {
          existing.has_update = 1;
          existing.prev_top_gid = existing.top_gid;
        }
        existing.top_gid = context.top_gid;
        if (context.top_token) existing.top_token = compactText(context.top_token);
        if (context.top_title) existing.top_title = compactText(context.top_title).slice(0, 160);
        if (context.top_posted_at) existing.top_posted_at = Number(context.top_posted_at) || 0;
      }
      if (context.top_cover) applyTrackingCoverFields(existing, context.top_cover);
      return saveTrackingRecord(existing);
    }
    const created = {
      id: uid('trk'),
      query_signature: context.query_signature,
      group_type: context.group_type || 'other',
      label: context.label || context.f_search || '未命名搜索',
      custom_label: '',
      custom_folder: '',
      note: '',
      open_url: openCanon,
      page_url: openCanon,
      f_search: context.f_search || '',
      namespace: context.namespace || '',
      tag_name: context.tag_name || '',
      favcat: context.favcat || '',
      favcat_label: context.favcat_label || '',
      site: context.site || '',
      top_gid: context.top_gid || '',
      top_token: context.top_token || '',
      top_title: context.top_title || '',
      top_posted_at: Number(context.top_posted_at) || 0,
      top_cover: '',
      cover_url: '',
      has_update: 0,
      unread_estimate: 0,
      unread_estimate_capped: 0,
      unread_estimate_source: '',
      archived: 0,
      last_check_at: nowMs(),
      last_browsed_at: nowMs(),
      created_at: nowMs(),
    };
    if (context.top_cover) applyTrackingCoverFields(created, context.top_cover);
    return saveTrackingRecord(created);
  }

  /**
   * ExH 列表分组：以手动「设分类」为主。
   * 自由词搜索很难自动分得准，故不再按 artist/search/favorites 等自动拆组；
   * 无 custom_folder 的一律进「未分类」。
   */
  function getTrackingListGroupKey(r) {
    if (!r) return 'none';
    const folder = compactText(r.custom_folder || '');
    if (folder) return 'uf:' + folder.toLowerCase();
    return 'none';
  }

  function getTrackingListGroupLabel(key, sample) {
    if (!key || key === 'none') return '未分类';
    if (key.indexOf('uf:') === 0) {
      return compactText((sample && sample.custom_folder) || key.slice(3)) || '自定义';
    }
    // 兼容旧 session 筛选键
    if (key.indexOf('fav:') === 0) {
      const cat = key.slice(4);
      const name =
        compactText((sample && sample.favcat_label) || '') ||
        (cat === 'all' ? '全部' : '夹 ' + cat);
      return '收藏 · ' + name;
    }
    if (key.indexOf('g:') === 0) {
      return getTrackingGroupLabel(key.slice(2) || 'other');
    }
    return getTrackingGroupLabel((sample && sample.group_type) || key);
  }

  /** 卡片左侧 monogram（对齐 JLC 封面位） */
  function getTrackingGroupMonogram(groupType) {
    const map = {
      artist: '画',
      group: '社',
      parody: '原',
      character: '角',
      female: '女',
      male: '男',
      tag: '标',
      category: '类',
      uploader: '传',
      search: '搜',
      favorites: '藏',
      folder: '夹',
      other: '追',
    };
    return map[String(groupType || '').toLowerCase()] || '追';
  }

  function getTrackingCardGroupType(record) {
    if (!record) return 'other';
    if (compactText(record.custom_folder || '')) return 'folder';
    return record.group_type || 'other';
  }

  /** 封面 URL 优先级：列表顶封面 > 通用封面（对齐 JLC） */
  function getTrackingDisplayCoverUrl(record) {
    return compactText((record && (record.top_cover || record.cover_url)) || '');
  }

  function applyTrackingCoverFields(record, coverUrl) {
    if (!record) return record;
    const c = compactText(coverUrl || '');
    if (!c || /^data:/i.test(c)) return record;
    if (/placeholder|blank\.|spacer|1x1|loading\.gif|transparent/i.test(c)) return record;
    record.top_cover = c;
    record.cover_url = c;
    return record;
  }

  function buildTrackingCoverHtml(record) {
    const gt = getTrackingCardGroupType(record);
    const mono = getTrackingGroupMonogram(gt === 'folder' ? 'folder' : gt);
    const coverUrl = getTrackingDisplayCoverUrl(record);
    if (coverUrl) {
      return (
        '<div class="jlc-wb-cover is-poster" data-group="' +
        escapeHtml(gt) +
        '">' +
        '<img src="' +
        escapeHtml(coverUrl) +
        '" alt="" loading="lazy" referrerpolicy="no-referrer" draggable="false"' +
        ' onerror="this.style.display=\'none\';var f=this.nextElementSibling;if(f)f.hidden=false;">' +
        '<span class="jlc-wb-cover-fallback" hidden>' +
        escapeHtml(mono) +
        '</span></div>'
      );
    }
    return (
      '<div class="jlc-wb-cover is-mono" data-group="' +
      escapeHtml(gt) +
      '"><span class="jlc-wb-cover-fallback">' +
      escapeHtml(mono) +
      '</span></div>'
    );
  }

  function getTrackingDisplayTitle(record) {
    if (!record) return '';
    let t = compactText(
      record.custom_label || record.label || record.f_search || record.query_signature || record.id
    );
    // 清掉历史脏后缀
    t = t.replace(/\s*·\s*分类过滤\s*$/i, '').trim();
    return t;
  }

  function shortTrackingWorkLabel(title, gid, maxLen) {
    maxLen = maxLen || 40;
    const tt = compactText(title || '');
    if (tt) return tt.length > maxLen ? tt.slice(0, maxLen) + '…' : tt;
    const g = compactText(gid || '');
    return g ? 'g' + g : '';
  }

  /** 作品发布时间短标签：YY-MM-DD HH:mm（对齐 EH 列表观感，远短于标题） */
  function formatTrackingPostedShort(ms) {
    const t = Number(ms) || 0;
    if (!t) return '';
    const d = new Date(t);
    if (!Number.isFinite(d.getTime()) || d.getTime() <= 0) return '';
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return yy + '-' + mm + '-' + dd + ' ' + hh + ':' + mi;
  }

  /**
   * 卡片「最新」展示：只显示发布时间（标题太长会挤爆）。
   * 无时间返回空串，由 UI 显示「—」，绝不回退长标题 / g####。
   */
  function getTrackingTopMetaLabel(record) {
    return formatTrackingPostedShort(record && record.top_posted_at);
  }

  /** 卡片「断点」展示：只显示发布时间 */
  function getTrackingBpMetaLabel(record) {
    return formatTrackingPostedShort(record && record.breakpoint_posted_at);
  }

  function getTrackingGroupLabel(type) {
    return TRACKING_GROUP_LABELS[type] || TRACKING_GROUP_LABELS.other;
  }

  async function exportBackup() {
    return {
      version: VERSION,
      exported_at: new Date().toISOString(),
      kind: 'exh_full',
      // 配置去掉本机显示相关字段（缩略倍率、工作台宽度等）
      config: typeof cloneConfigForSync === 'function' ? cloneConfigForSync() : deepClone(config),
      // 列表「已点」描边
      seen_gids: typeof loadSeenGids === 'function' ? loadSeenGids() : {},
      // LRR 同步元数据 / 熟人汇总（可被 LRR 再刷新，但仍应跨机）
      lrr_meta: typeof loadLrrMeta === 'function' ? loadLrrMeta() : {},
      tracking_searches: await idbGetAll(STORE_TRACKING),
      works: await idbGetAll(STORE_WORKS),
      editions: await idbGetAll(STORE_EDITIONS),
      local_archives: await idbGetAll(STORE_ARCHIVES),
      links: await idbGetAll(STORE_LINKS),
      progress: await idbGetAll(STORE_PROGRESS),
    };
  }

  /**
   * 合并单条追更：同 id 或同 query_signature 视为同一项。
   * 按 updated_at 取较新侧为主，并保留断点 / 未读估数等「更完整」字段。
   */
  function mergeTrackingRecord(local, remote) {
    if (!local) return remote;
    if (!remote) return local;
    const lu = Number(local.updated_at) || 0;
    const ru = Number(remote.updated_at) || 0;
    const newer = ru >= lu ? remote : local;
    const older = ru >= lu ? local : remote;
    const out = Object.assign({}, older, newer);
    // 固定用本机已有 id，避免同 signature 双份
    out.id = local.id || remote.id;
    out.query_signature = local.query_signature || remote.query_signature;
    // 断点：谁更新更晚且有断点用谁；否则拼较完整的一侧
    const localBpAt = Number(local.breakpoint_at) || 0;
    const remoteBpAt = Number(remote.breakpoint_at) || 0;
    if (remoteBpAt > localBpAt && remote.breakpoint_gid) {
      out.breakpoint_gid = remote.breakpoint_gid;
      out.breakpoint_token = remote.breakpoint_token || '';
      out.breakpoint_title = remote.breakpoint_title || '';
      out.breakpoint_page = remote.breakpoint_page;
      out.breakpoint_url = remote.breakpoint_url || '';
      out.breakpoint_at = remote.breakpoint_at;
      out.breakpoint_posted_at = remote.breakpoint_posted_at || 0;
    } else if (local.breakpoint_gid) {
      out.breakpoint_gid = local.breakpoint_gid;
      out.breakpoint_token = local.breakpoint_token || out.breakpoint_token || '';
      out.breakpoint_title = local.breakpoint_title || out.breakpoint_title || '';
      out.breakpoint_page = local.breakpoint_page != null ? local.breakpoint_page : out.breakpoint_page;
      out.breakpoint_url = local.breakpoint_url || out.breakpoint_url || '';
      out.breakpoint_at = local.breakpoint_at || out.breakpoint_at;
      out.breakpoint_posted_at = local.breakpoint_posted_at || out.breakpoint_posted_at || 0;
    }
    // 未读：跟断点会变小，不能 Math.max 把旧大数粘回来；跟较新断点一侧
    const top = compactText(out.top_gid || '');
    const bp = compactText(out.breakpoint_gid || '');
    const caughtUp = !!(top && bp && top === bp);
    if (caughtUp) {
      out.has_update = 0;
      out.unread_estimate = 0;
      out.unread_estimate_capped = 0;
      out.unread_estimate_source = 'home_caught_up';
    } else {
      out.has_update = local.has_update || remote.has_update ? 1 : out.has_update || 0;
      const bpSide = remoteBpAt > localBpAt ? remote : localBpAt > remoteBpAt ? local : newer;
      if (bpSide && bpSide.unread_estimate != null) {
        out.unread_estimate = Math.max(0, Math.floor(Number(bpSide.unread_estimate) || 0));
        out.unread_estimate_capped = bpSide.unread_estimate_capped ? 1 : 0;
        out.unread_estimate_source = bpSide.unread_estimate_source || out.unread_estimate_source || '';
      }
    }
    // 分类 / 自定义名：非空优先较新，空则回退旧
    if (!compactText(out.custom_folder || '')) {
      out.custom_folder = compactText(older.custom_folder || '') || '';
    }
    if (!compactText(out.custom_label || '')) {
      out.custom_label = compactText(older.custom_label || '') || '';
    }
    out.updated_at = Math.max(lu, ru, Number(out.updated_at) || 0);
    return out;
  }

  /** @param {{ fromSync?: boolean }} [options] fromSync 时不标脏 */
  async function importBackup(payload, options) {
    if (!payload || typeof payload !== 'object') throw new Error('invalid backup');
    options = options || {};
    idbSyncSuppress = true;
    try {
      if (payload.config && typeof payload.config === 'object') {
        // 保留本机显示类配置，不被云端/备份覆盖
        const localKeep = typeof pickConfigLocalOnly === 'function' ? pickConfigLocalOnly(config) : {};
        saveConfig(Object.assign({}, payload.config, localKeep));
      }
      if (payload.seen_gids && typeof payload.seen_gids === 'object' && typeof saveSeenGids === 'function') {
        // 合并：云端 + 本机（本机更新时间较新的保留）
        const local = typeof loadSeenGids === 'function' ? loadSeenGids() : {};
        const merged = Object.assign({}, payload.seen_gids);
        Object.keys(local).forEach((gid) => {
          const a = Number(local[gid]) || 0;
          const b = Number(merged[gid]) || 0;
          if (a >= b) merged[gid] = local[gid];
        });
        saveSeenGids(merged);
      }
      if (payload.lrr_meta && typeof payload.lrr_meta === 'object' && typeof saveLrrMeta === 'function') {
        saveLrrMeta(payload.lrr_meta);
      }
      // 追更：按 id / signature 合并，避免「空本机推上去」或「双端各写几条」丢收藏
      if (Array.isArray(payload.tracking_searches) && payload.tracking_searches.length) {
        const localRows = (await idbGetAll(STORE_TRACKING)) || [];
        const byId = new Map();
        const bySig = new Map();
        localRows.forEach((r) => {
          if (!r) return;
          if (r.id) byId.set(String(r.id), r);
          if (r.query_signature) bySig.set(String(r.query_signature), r);
        });
        const consumedLocal = new Set();
        for (const remote of payload.tracking_searches) {
          if (!remote || typeof remote !== 'object') continue;
          let local = remote.id ? byId.get(String(remote.id)) : null;
          if (!local && remote.query_signature) {
            local = bySig.get(String(remote.query_signature)) || null;
          }
          if (local && local.id) consumedLocal.add(String(local.id));
          const merged = mergeTrackingRecord(local, remote);
          if (!merged.id) merged.id = uid('trk');
          await idbPut(STORE_TRACKING, merged);
        }
      }
      for (const w of payload.works || []) await idbPut(STORE_WORKS, w);
      for (const e of payload.editions || []) await idbPut(STORE_EDITIONS, e);
      for (const a of payload.local_archives || []) await idbPut(STORE_ARCHIVES, a);
      for (const l of payload.links || []) await idbPut(STORE_LINKS, l);
      for (const p of payload.progress || []) await idbPut(STORE_PROGRESS, p);
    } finally {
      idbSyncSuppress = false;
      if (!options.fromSync && typeof markCreamuLocalDirty === 'function') {
        markCreamuLocalDirty();
      }
    }
  }
  let lrrSyncing = false;
  let lrrLastSync = 0;
  let lrrLastCount = 0;
  let lrrLastError = '';

  // 启动时恢复 LRR 同步状态
  {
    const m = loadLrrMeta();
    lrrLastSync = Number(m.last_sync) || 0;
    lrrLastCount = Number(m.last_count) || 0;
    lrrLastError = m.last_error || '';
  }

  function normalizeLrrBase(url) {
    return compactText(url).replace(/\/+$/, '');
  }

  function lrrConfigured() {
    return !!(normalizeLrrBase(config.lrr_base_url) && compactText(config.lrr_api_key));
  }

  function lrrHeaders() {
    const key = compactText(config.lrr_api_key);
    return {
      Authorization: key,
      Accept: 'application/json',
    };
  }

  async function lrrFetchJson(path) {
    const base = normalizeLrrBase(config.lrr_base_url);
    if (!base) throw new Error('LRR URL 未配置');
    const url = base + (path.startsWith('/') ? path : '/' + path);
    const res = await gmRequest({
      method: 'GET',
      url,
      headers: lrrHeaders(),
      timeout: 45000,
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error('LRR HTTP ' + res.status + (res.responseText ? ': ' + String(res.responseText).slice(0, 120) : ''));
    }
    const text = res.responseText || '';
    const data = safeJsonParse(text, null);
    if (data == null) throw new Error('LRR 返回非 JSON');
    return data;
  }

  function normalizeLrrArchiveList(data) {
    let list = [];
    if (Array.isArray(data)) list = data;
    else if (Array.isArray(data.data)) list = data.data;
    else if (Array.isArray(data.result)) list = data.result;
    else if (Array.isArray(data.archives)) list = data.archives;
    else if (data.data && Array.isArray(data.data.archives)) list = data.data.archives;
    else if (typeof data === 'object' && data !== null) {
      const values = Object.values(data);
      if (values.length && values.every((v) => v && typeof v === 'object' && (v.arcid || v.id || v.filename || v.title || v.tags != null))) {
        list = values.map((v, i) => {
          const key = Object.keys(data).find((k) => data[k] === v);
          return Object.assign({ arcid: v.arcid || v.id || key || String(i) }, v);
        });
      }
    }

    return list
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const arcid = item.arcid || item.id || item.archive_id || item.hash;
        if (!arcid) return null;
        let tags = item.tags;
        if (typeof tags === 'string') tags = tags.split(/,\s*/).map((t) => t.trim()).filter(Boolean);
        if (!Array.isArray(tags)) tags = [];
        return {
          arcid: String(arcid),
          title: item.title || item.filename || item.name || String(arcid),
          tags,
          size_bytes: Number(item.size) || Number(item.filesize) || Number(item.bytes) || 0,
          pages: Number(item.pagecount) || Number(item.pages) || 0,
        };
      })
      .filter(Boolean);
  }

  async function autoLinkAfterSync() {
    const editions = await idbGetAll(STORE_EDITIONS);
    const archives = await listArchives();
    let linked = 0;

    // P0 ehgid
    for (const a of archives) {
      if (!a.eh_gid) continue;
      const eds = (editions || []).filter((e) => String(e.gid) === String(a.eh_gid));
      for (const ed of eds) {
        const editionId = ed.id || makeEditionId(ed.gid, ed.token);
        const existing = (await findLinksForEdition(editionId)).filter((l) => l.arcid === a.arcid);
        if (existing.some((l) => l.negative)) continue;
        if (existing.some((l) => !l.negative)) continue;
        await putLink({
          work_id: ed.work_id || '',
          edition_id: editionId,
          arcid: a.arcid,
          confidence: 'high',
          source: 'ehgid',
          negative: 0,
        });
        linked++;
      }
    }

    // P1 structural (optional)
    if (config.auto_link_structural) {
      const thr = Number(config.structural_link_threshold) || 0.9;
      for (const ed of editions || []) {
        const editionId = ed.id || makeEditionId(ed.gid, ed.token);
        const hasExact = (await findLinksForEdition(editionId)).some((l) => !l.negative);
        if (hasExact) continue;
        let best = null;
        for (const a of archives) {
          const score = structuralMatchScore(ed, a);
          if (score >= thr && (!best || score > best.score)) best = { a, score };
        }
        if (!best) continue;
        const neg = (await listLinks()).some(
          (l) => l.negative && l.arcid === best.a.arcid && (l.edition_id === editionId || l.work_id === ed.work_id)
        );
        if (neg) continue;
        await putLink({
          work_id: ed.work_id || '',
          edition_id: editionId,
          arcid: best.a.arcid,
          confidence: 'structural',
          source: 'structural',
          negative: 0,
        });
        linked++;
      }
    }
    return linked;
  }

  async function syncLanraragi(options) {
    if (lrrSyncing) return { ok: false, error: '同步进行中' };
    if (!lrrConfigured()) {
      lrrLastError = '未配置 LRR';
      saveLrrMeta({ last_sync: lrrLastSync, last_count: lrrLastCount, last_error: lrrLastError });
      return { ok: false, error: lrrLastError };
    }
    lrrSyncing = true;
    lrrLastError = '';
    try {
      let data = null;
      const endpoints = ['/api/archives', '/api/archives/', '/api/search?filter='];
      let lastErr = null;
      for (const ep of endpoints) {
        try {
          data = await lrrFetchJson(ep);
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (data == null) throw lastErr || new Error('无法拉取 LRR 列表');

      const rows = normalizeLrrArchiveList(data);
      if (!options || options.replace !== false) {
        await clearArchives();
      }
      for (const row of rows) {
        await putArchive(row);
      }
      const autoLinked = await autoLinkAfterSync();
      const familiar = await rebuildFamiliarFromLrrArchives();

      lrrLastSync = nowMs();
      lrrLastCount = rows.length;
      lrrLastError = '';
      saveLrrMeta({
        last_sync: lrrLastSync,
        last_count: lrrLastCount,
        last_error: '',
        familiar_artists: familiar.artists,
        familiar_groups: familiar.groups,
      });
      return {
        ok: true,
        count: rows.length,
        linked: autoLinked,
        familiar_artists: familiar.artists.length,
        familiar_groups: familiar.groups.length,
      };
    } catch (err) {
      lrrLastError = (err && err.message) || String(err);
      saveLrrMeta({ last_sync: lrrLastSync, last_count: lrrLastCount, last_error: lrrLastError });
      return { ok: false, error: lrrLastError };
    } finally {
      lrrSyncing = false;
    }
  }

  /** 从 LRR 标签汇总熟人（仅 artist:/group: 等 namespace） */
  async function rebuildFamiliarFromLrrArchives() {
    const archives = await listArchives();
    const artists = new Map();
    const groups = new Map();
    const add = (map, name) => {
      let n = compactText(name);
      if (!n || n.length < 2) return;
      n = n.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
      if (!n || n.length < 2) return;
      // 过滤明显不是人名/社团的噪声
      if (/^(chinese|english|japanese|digital|translated|rewrite|sampled)$/i.test(n)) return;
      const key =
        typeof normalizePersonKey === 'function' ? normalizePersonKey(n) : n.toLowerCase();
      if (!key) return;
      if (!map.has(key)) map.set(key, n);
    };
    (archives || []).forEach((a) => {
      const rawTags = a.tags || [];
      extractArtistsFromTags(rawTags).forEach((n) => add(artists, n));
      extractGroupsFromTags(rawTags).forEach((n) => add(groups, n));
      // 不再把 a.group（常来自标题 [xxx]）整表塞进团队——会把画师名洗成「团队」
    });
    // 若某人既在 artist 又在 group，保留 artist，从 group 去掉（减少双列表污染）
    for (const k of artists.keys()) {
      if (groups.has(k)) groups.delete(k);
      const ck = typeof compactPersonKey === 'function' ? compactPersonKey(k) : k.replace(/\s+/g, '');
      if (ck && groups.has(ck)) groups.delete(ck);
    }
    const out = {
      artists: Array.from(artists.values()).sort((a, b) => a.localeCompare(b, 'en')),
      groups: Array.from(groups.values()).sort((a, b) => a.localeCompare(b, 'en')),
    };
    return out;
  }

  /**
   * 熟人雷达：手动 custom_* + LRR 同步汇总
   * @returns {{ artists: Set<string>, groups: Set<string>, artistList: string[], groupList: string[] }}
   */
  function getFamiliarRadar() {
    const m = loadLrrMeta();
    const artistDisp = new Map();
    const groupDisp = new Map();
    const ingest = (map, list) => {
      (list || []).forEach((raw) => {
        const n = compactText(raw);
        if (!n || n.length < 2) return;
        // 主键：归一空格
        const k =
          typeof normalizePersonKey === 'function' ? normalizePersonKey(n) : n.toLowerCase();
        if (!k) return;
        if (!map.has(k)) map.set(k, n);
        // 副键：无空格（emoriuki），匹配时用 personNameMatches 也能对上
        const ck = typeof compactPersonKey === 'function' ? compactPersonKey(n) : k.replace(/\s+/g, '');
        if (ck && ck !== k && !map.has(ck)) map.set(ck, n);
      });
    };
    ingest(artistDisp, m.familiar_artists);
    ingest(artistDisp, config.custom_artists);
    ingest(groupDisp, m.familiar_groups);
    ingest(groupDisp, config.custom_groups);
    return {
      artists: new Set(artistDisp.keys()),
      groups: new Set(groupDisp.keys()),
      artistList: Array.from(new Set(artistDisp.values())).sort((a, b) => a.localeCompare(b, 'zh')),
      groupList: Array.from(new Set(groupDisp.values())).sort((a, b) => a.localeCompare(b, 'zh')),
    };
  }

  /** @returns {{ kind: 'artist'|'group', name: string } | null} */
  function matchFamiliarRadar(title, tags) {
    const radar = getFamiliarRadar();
    if (!radar.artists.size && !radar.groups.size) return null;
    const titleBag = compactText(title || '');
    const tagList = Array.isArray(tags) ? tags : [];
    const matchFn =
      typeof personNameMatches === 'function'
        ? personNameMatches
        : (a, b) =>
            String(b || '')
              .toLowerCase()
              .includes(String(a || '').toLowerCase());

    const resolveDisp = (kind, key) => {
      const list =
        kind === 'artist'
          ? [].concat(config.custom_artists || [], loadLrrMeta().familiar_artists || [])
          : [].concat(config.custom_groups || [], loadLrrMeta().familiar_groups || []);
      const hit = list.find((x) => {
        const n = compactText(x);
        if (!n) return false;
        if (n.toLowerCase() === key) return true;
        if (typeof compactPersonKey === 'function' && compactPersonKey(n) === compactPersonKey(key)) {
          return true;
        }
        return matchFn(key, n) || matchFn(n, key);
      });
      return compactText(hit || key);
    };

    // 1) namespace 标签 artist:/group:
    for (const raw of tagList) {
      const t = normalizeNamespaceTag(raw);
      if (t.startsWith('artist:')) {
        const name = t.slice(7);
        for (const key of radar.artists) {
          if (matchFn(key, name) || matchFn(name, key)) {
            return { kind: 'artist', name: resolveDisp('artist', name) };
          }
        }
      }
      if (t.startsWith('group:') || t.startsWith('translator:')) {
        const name = t.startsWith('group:') ? t.slice(6) : t.slice(11);
        for (const key of radar.groups) {
          if (matchFn(key, name) || matchFn(name, key)) {
            return { kind: 'group', name: resolveDisp('group', name) };
          }
        }
      }
    }

    // 2) 整段标题
    for (const key of radar.artists) {
      if (key.length >= 2 && matchFn(key, titleBag)) {
        return { kind: 'artist', name: resolveDisp('artist', key) };
      }
    }
    for (const key of radar.groups) {
      if (key.length >= 2 && matchFn(key, titleBag)) {
        return { kind: 'group', name: resolveDisp('group', key) };
      }
    }

    // 3) 标题括号/方括号抽名再比（列表无 tag 时）
    const bracketBits = [];
    String(titleBag).replace(/\[([^\]]+)\]|\(([^)]+)\)|【([^】]+)】/g, (_, a, b, c) => {
      const n = compactText(a || b || c || '');
      if (n && n.length >= 2 && n.length < 48) bracketBits.push(n);
      return '';
    });
    for (const bit of bracketBits) {
      for (const key of radar.artists) {
        if (matchFn(key, bit) || matchFn(bit, key)) {
          return { kind: 'artist', name: resolveDisp('artist', bit) };
        }
      }
      for (const key of radar.groups) {
        if (matchFn(key, bit) || matchFn(bit, key)) {
          return { kind: 'group', name: resolveDisp('group', bit) };
        }
      }
    }

    // 4) 所有标签文本兜底（无 namespace 的 LRR 纯名）
    const tagBlob = tagList.map((t) => String(t || '')).join(' | ');
    for (const key of radar.artists) {
      if (key.length >= 2 && matchFn(key, tagBlob)) {
        return { kind: 'artist', name: resolveDisp('artist', key) };
      }
    }
    for (const key of radar.groups) {
      if (key.length >= 2 && matchFn(key, tagBlob)) {
        return { kind: 'group', name: resolveDisp('group', key) };
      }
    }
    return null;
  }

  function getLrrStatus() {
    const radar = getFamiliarRadar();
    return {
      configured: lrrConfigured(),
      syncing: lrrSyncing,
      last_sync: lrrLastSync,
      last_error: lrrLastError,
      last_count: lrrLastCount,
      familiar_artists: radar.artistList.length,
      familiar_groups: radar.groupList.length,
    };
  }

  function buildLrrReaderUrl(arcid) {
    const base = normalizeLrrBase(config.lrr_base_url);
    if (!base || !arcid) return '';
    return base + '/reader?id=' + encodeURIComponent(arcid);
  }

  /** LRR 封面直链（nofun 关闭时浏览器可直接 img；跨源/鉴权场景见 fetchLrrThumbnailObjectUrl） */
  function buildLrrThumbnailUrl(arcid) {
    const base = normalizeLrrBase(config.lrr_base_url);
    if (!base || !arcid) return '';
    return base + '/api/archives/' + encodeURIComponent(String(arcid)) + '/thumbnail';
  }

  function buildLrrSearchUrl(query) {
    const base = normalizeLrrBase(config.lrr_base_url);
    if (!base) return '';
    return base + '/?q=' + encodeURIComponent(query || '');
  }

  /** arcid → blob: URL（含失败空串缓存，避免重复打 LRR） */
  const lrrThumbCache = new Map();
  const lrrThumbInflight = new Map();

  /**
   * 经 GM 拉取缩略图为 object URL（带 API Key，绕过混合内容 / nofun 鉴权）。
   * @returns {Promise<string>} blob: URL 或 ''
   */
  async function fetchLrrThumbnailObjectUrl(arcid) {
    const id = String(arcid || '');
    if (!id) return '';
    if (lrrThumbCache.has(id)) return lrrThumbCache.get(id) || '';
    if (lrrThumbInflight.has(id)) return lrrThumbInflight.get(id);

    const job = (async () => {
      try {
        const url = buildLrrThumbnailUrl(id);
        if (!url) {
          lrrThumbCache.set(id, '');
          return '';
        }
        const key = compactText(config.lrr_api_key);
        const headers = { Accept: 'image/*,*/*' };
        if (key) headers.Authorization = key;
        const res = await gmRequest({
          method: 'GET',
          url,
          headers,
          responseType: 'blob',
          timeout: 25000,
        });
        if (res.status < 200 || res.status >= 300 || !res.response) {
          lrrThumbCache.set(id, '');
          return '';
        }
        // 202 排队时可能返回 JSON
        const blob = res.response;
        if (!blob || typeof blob !== 'object') {
          lrrThumbCache.set(id, '');
          return '';
        }
        const type = String(blob.type || '');
        if (type.includes('json') || type.includes('text')) {
          lrrThumbCache.set(id, '');
          return '';
        }
        const objUrl = URL.createObjectURL(blob);
        lrrThumbCache.set(id, objUrl);
        return objUrl;
      } catch (_) {
        lrrThumbCache.set(id, '');
        return '';
      } finally {
        lrrThumbInflight.delete(id);
      }
    })();
    lrrThumbInflight.set(id, job);
    return job;
  }

  /**
   * 列表内懒加载 LRR 封面：IntersectionObserver + 限流 GM 拉取。
   * @param {ParentNode} root
   */
  function hydrateLrrThumbnailsIn(root) {
    if (!root || typeof fetchLrrThumbnailObjectUrl !== 'function') return;
    const nodes = root.querySelectorAll('[data-lrr-cover]');
    if (!nodes.length) return;

    let active = 0;
    const maxConcurrent = 4;
    const queue = [];

    const runNext = () => {
      while (active < maxConcurrent && queue.length) {
        const job = queue.shift();
        active++;
        Promise.resolve()
          .then(job)
          .finally(() => {
            active--;
            runNext();
          });
      }
    };

    const loadOne = (el) => {
      if (!el || el.dataset.lrrCoverLoaded === '1') return;
      el.dataset.lrrCoverLoaded = '1';
      const arcid = el.getAttribute('data-lrr-cover') || '';
      if (!arcid) return;
      queue.push(async () => {
        const objUrl = await fetchLrrThumbnailObjectUrl(arcid);
        if (!objUrl || !el.isConnected) return;
        let img = el.querySelector('img.jlc-wb-lrr-thumb');
        if (!img) {
          img = document.createElement('img');
          img.className = 'jlc-wb-lrr-thumb';
          img.alt = '';
          img.draggable = false;
          img.loading = 'lazy';
          el.insertBefore(img, el.firstChild);
        }
        img.src = objUrl;
        img.onload = () => {
          el.classList.add('has-thumb');
          const fb = el.querySelector('.jlc-wb-cover-fallback');
          if (fb) fb.hidden = true;
        };
        img.onerror = () => {
          el.classList.remove('has-thumb');
          const fb = el.querySelector('.jlc-wb-cover-fallback');
          if (fb) fb.hidden = false;
          if (img) img.remove();
        };
      });
      runNext();
    };

    if (typeof IntersectionObserver === 'function') {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (!en.isIntersecting) return;
            io.unobserve(en.target);
            loadOne(en.target);
          });
        },
        { root: root.closest('.jlc-wb-list-scroll') || null, rootMargin: '120px 0px', threshold: 0.01 }
      );
      nodes.forEach((n) => io.observe(n));
    } else {
      nodes.forEach(loadOne);
    }
  }
  function detectSite() {
    const host = location.hostname || '';
    if (/exhentai\.org$/i.test(host)) return 'exhentai';
    if (/e-hentai\.org$/i.test(host)) return 'ehentai';
    return '';
  }

  function detectPageKind() {
    const path = location.pathname || '';
    if (/\/g\/\d+\/[0-9a-f]+\//i.test(path)) return 'gallery';
    if (/\/s\//i.test(path)) return 'image';
    if (/\/tag\//i.test(path)) return 'tag';
    if (/favorites\.php/i.test(path) || path.includes('favorites')) return 'favorites';
    if (/toplist\.php/i.test(path)) return 'toplist';
    if (/watched/i.test(path)) return 'watched';
    return 'list';
  }

  /** 搜索词规范化：空白/大小写，避免 +/%20 编码差拆成两条追更 */
  function normalizeTrackingFSearch(s) {
    return compactText(s)
      .toLowerCase()
      .replace(/[＋+]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * 稳定追更签名：不含 page / f_apply 等噪声参数。
   * 旧版把整段 search 拼进签名，同搜索不同参数会重复建收藏。
   */
  function buildTrackingQuerySignature(parts) {
    parts = parts || {};
    const site = parts.site || '';
    const group = parts.group_type || 'other';
    const ns = compactText(parts.namespace || '').toLowerCase();
    const tag = compactText(parts.tag_name || '').toLowerCase();
    const fav = parts.favcat != null && parts.favcat !== '' ? String(parts.favcat) : '';
    const fs = normalizeTrackingFSearch(parts.f_search || '');
    const cats = compactText(parts.f_cats || '');
    const catsKey = cats && cats !== '0' ? cats : '';
    const browse = compactText(parts.browse_key || '').toLowerCase();
    return [site, group, ns, tag, fav, fs, catsKey, browse].join('|');
  }

  /** EH 游标翻页参数：点「>」常用 next=gid，而不是 page=N */
  function listUrlHasCursorNav(href) {
    try {
      const u = new URL(href || location.href, location.origin);
      const keys = ['next', 'prev', 'seek', 'jump'];
      for (let i = 0; i < keys.length; i++) {
        const v = u.searchParams.get(keys[i]);
        if (v != null && String(v).trim() !== '') return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /** 列表首页 URL：去掉 page/游标/噪声，供 open_url / 检查更新 */
  function canonicalizeTrackingOpenUrl(url) {
    try {
      const u = new URL(url || location.href, location.origin);
      u.hash = '';
      u.searchParams.delete('page');
      // 游标深页参数，绝不能当 open_url 首页
      u.searchParams.delete('next');
      u.searchParams.delete('prev');
      u.searchParams.delete('seek');
      u.searchParams.delete('jump');
      // 表单提交残留，不影响结果集
      u.searchParams.delete('f_apply');
      u.searchParams.delete('apply');
      return u.href;
    } catch (_) {
      return url || location.href;
    }
  }

  function parseExhPageContext(url) {
    let parsed;
    try {
      parsed = new URL(url || location.href, location.origin);
    } catch (_) {
      return null;
    }
    const site = /exhentai/i.test(parsed.hostname) ? 'exhentai' : /e-hentai/i.test(parsed.hostname) ? 'ehentai' : detectSite();
    if (!site) return null;

    const path = parsed.pathname || '';
    const params = parsed.searchParams;
    const kind = (() => {
      if (/\/g\/\d+\/[0-9a-f]+/i.test(path)) return 'gallery';
      if (/\/s\//i.test(path)) return 'image';
      if (/\/tag\//i.test(path)) return 'tag';
      if (/favorites\.php/i.test(path)) return 'favorites';
      if (/toplist\.php/i.test(path)) return 'toplist';
      if (/watched/i.test(path)) return 'watched';
      return 'list';
    })();

    if (kind === 'gallery' || kind === 'image') {
      return {
        trackable: false,
        kind,
        site,
        reason: '画廊/阅读页：请收藏标签、社团、画师或搜索，而不是单本',
      };
    }

    let group_type = 'search';
    let label = '';
    let namespace = '';
    let tag_name = '';
    let f_search = compactText(params.get('f_search') || '');
    let favcat = '';
    let favcat_label = '';
    let f_cats = compactText(params.get('f_cats') || '');
    let browse_key = '';

    // /tag/artist:name  or /tag/group:foo/
    const tagMatch = path.match(/\/tag\/([^/?#]+)/i);
    if (tagMatch) {
      let raw = tagMatch[1];
      try {
        raw = decodeURIComponent(raw.replace(/\+/g, ' '));
      } catch (_) {}
      raw = raw.replace(/\$+$/g, '');
      const colon = raw.indexOf(':');
      if (colon > 0) {
        namespace = compactText(raw.slice(0, colon)).toLowerCase();
        tag_name = compactText(raw.slice(colon + 1));
      } else {
        tag_name = compactText(raw);
      }
      f_search = f_search || (namespace ? namespace + ':"' + tag_name + '$"' : tag_name);
      label = namespace ? namespace + ':' + tag_name : tag_name;
      if (namespace === 'artist') group_type = 'artist';
      else if (namespace === 'group' || namespace === 'translator') group_type = 'group';
      else if (namespace === 'parody') group_type = 'parody';
      else if (namespace === 'character') group_type = 'character';
      else if (namespace === 'female') group_type = 'female';
      else if (namespace === 'male') group_type = 'male';
      else if (namespace === 'uploader') group_type = 'uploader';
      else group_type = 'tag';
    } else if (kind === 'favorites') {
      group_type = 'favorites';
      const cat = params.get('favcat');
      favcat = cat != null && cat !== '' ? String(cat) : 'all';
      try {
        const sel =
          document.querySelector('#favcat option[selected]') ||
          document.querySelector('select[name="favcat"] option[selected]') ||
          document.querySelector('#favcat option:checked');
        if (sel) favcat_label = compactText(sel.textContent);
        if (!favcat_label && favcat !== 'all') {
          const byVal = document.querySelector(
            '#favcat option[value="' + favcat + '"], select[name="favcat"] option[value="' + favcat + '"]'
          );
          if (byVal) favcat_label = compactText(byVal.textContent);
        }
      } catch (_) { /* ignore */ }
      label = favcat_label
        ? '收藏 · ' + favcat_label
        : favcat === 'all'
          ? '站内收藏夹 · 全部'
          : '站内收藏夹 · ' + favcat;
      f_search = 'favorites:' + favcat;
    } else if (kind === 'toplist') {
      group_type = 'other';
      label = '排行榜';
      f_search = 'toplist';
      browse_key = 'toplist';
    } else if (f_search) {
      label = f_search;
      group_type = 'search';
      if (/^artist:"/i.test(f_search) || /^artist:/i.test(f_search)) group_type = 'artist';
      else if (/^group:"/i.test(f_search) || /^group:/i.test(f_search)) group_type = 'group';
      else if (/^parody:"/i.test(f_search) || /^parody:/i.test(f_search)) group_type = 'parody';
      else if (/^character:"/i.test(f_search)) group_type = 'character';
      else if (/^female:"/i.test(f_search)) group_type = 'female';
      else if (/^male:"/i.test(f_search)) group_type = 'male';
    } else {
      if (f_cats && f_cats !== '0') {
        group_type = 'category';
        label = '分类 f_cats=' + f_cats;
        f_search = 'f_cats:' + f_cats;
        browse_key = 'cats:' + f_cats;
      } else {
        group_type = 'other';
        label = '首页/浏览';
        f_search = 'browse:home';
        browse_key = 'home:' + (path || '/').toLowerCase();
      }
    }

    // 页码：URL page= + DOM + next/prev 游标；仅真·首页才写 top
    const pageState =
      typeof getListPageState === 'function'
        ? getListPageState(parsed.href, typeof document !== 'undefined' ? document : null)
        : { index: getListPageIndexFromUrl(parsed.href), known: true, isFirst: getListPageIndexFromUrl(parsed.href) <= 0, mode: 'page', display: '' };
    const pageIndex = pageState.known ? pageState.index : -1;
    const isFirst = pageState.isFirst === true;

    // 「最新」只认真·首页第一条；next=/深页第一条不能当 top
    let top_gid = '';
    let top_token = '';
    let top_title = '';
    let top_cover = '';
    let top_posted_at = 0;
    let page_head_gid = '';
    let page_head_token = '';
    let page_head_title = '';
    let page_head_cover = '';
    let page_head_posted_at = 0;

    const firstLink = document.querySelector(
      '#ido a[href*="/g/"], table.itg a[href*="/g/"], .itg a[href*="/g/"], a[href*="/g/"]'
    );
    if (firstLink) {
      const gt = parseGalleryUrl(firstLink.href || firstLink.getAttribute('href'));
      // 注意：不要 closest('[class*="gl"]')，会误命中 .glink 自身，吃不到 posted
      const cardRoot =
        firstLink.closest('tr, .gl1t, .gl1e, .gl2t, .gl3t') ||
        firstLink.parentElement ||
        firstLink;
      const titleEl =
        (cardRoot &&
          cardRoot.querySelector('.glink, .glname a, .gl3e a, .gl4e a')) ||
        firstLink;
      const title = compactText(titleEl && titleEl.textContent ? titleEl.textContent : '');
      const cover = extractListItemCoverUrl(cardRoot || firstLink);
      const posted = extractListItemPostedAt(cardRoot || firstLink, gt && gt.gid);
      if (gt) {
        page_head_gid = gt.gid;
        page_head_token = gt.token || '';
      }
      page_head_title = title;
      page_head_cover = cover;
      page_head_posted_at = posted;
      if (isFirst) {
        top_gid = page_head_gid;
        top_token = page_head_token;
        top_title = page_head_title;
        top_cover = page_head_cover;
        top_posted_at = page_head_posted_at;
      }
    }

    const open_url = canonicalizeTrackingOpenUrl(parsed.href);
    const query_signature = buildTrackingQuerySignature({
      site,
      group_type,
      namespace,
      tag_name,
      f_search,
      favcat,
      f_cats,
      browse_key,
    });

    return {
      trackable: true,
      kind,
      site,
      group_type,
      label: compactText(label) || '未命名搜索',
      namespace,
      tag_name,
      f_search,
      f_cats,
      browse_key,
      favcat: favcat || '',
      favcat_label: favcat_label || '',
      open_url,
      page_url: open_url,
      page_index: pageIndex,
      page_known: pageState.known !== false,
      page_is_first: isFirst,
      page_mode: pageState.mode || '',
      page_display: pageState.display || formatListPageDisplay(pageState),
      // 仅首页有效；深页为空，避免污染 top
      top_gid,
      top_token,
      top_title,
      top_cover,
      top_posted_at,
      // 当前页第一条（定位/显示用，不当「最新」）
      page_head_gid,
      page_head_token,
      page_head_title,
      page_head_cover,
      page_head_posted_at,
      query_signature,
    };
  }

  /** 规范化日期文本：全角数字、各种横线、nbsp */
  function normalizePostedText(raw) {
    let s = String(raw == null ? '' : raw);
    s = s.replace(/[\u2010-\u2015\u2212\uff0d]/g, '-');
    s = s.replace(/[\u00a0\u2000-\u200b\u202f\u205f\u3000]/g, ' ');
    // 全角数字 → 半角
    s = s.replace(/[\uff10-\uff19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30));
    return compactText(s);
  }

  /**
   * 从列表卡片取发布时间（ms）。
   * 优先 #posted_{gid}（全页），再卡片内文本。极简模式可能无日期 → 上层用 gdata 补。
   */
  function extractListItemPostedAt(root, gid) {
    const g = compactText(gid || '');
    const tryNode = (node) => {
      if (!node) return 0;
      const bits = [
        node.textContent,
        node.innerText,
        node.getAttribute && node.getAttribute('title'),
        node.getAttribute && node.getAttribute('data-title'),
        node.outerHTML,
      ];
      for (let i = 0; i < bits.length; i++) {
        const t = parsePostedToMs(bits[i]);
        if (t) return t;
      }
      return 0;
    };
    // 全页 id 最准（扩展/缩略图列表）
    if (g && typeof document !== 'undefined') {
      try {
        const byId = document.getElementById('posted_' + g);
        const t = tryNode(byId);
        if (t) return t;
        // 有的皮肤 id 大小写或嵌套
        const alt =
          document.querySelector('[id="posted_' + g + '"]') ||
          document.querySelector('[id="Posted_' + g + '"]');
        const t2 = tryNode(alt);
        if (t2) return t2;
      } catch (_) { /* ignore */ }
    }
    if (root && root.querySelector) {
      if (g) {
        const t = tryNode(root.querySelector('#posted_' + g));
        if (t) return t;
      }
      const postedEls = root.querySelectorAll('[id^="posted_"], [id^="Posted_"]');
      for (let i = 0; i < postedEls.length; i++) {
        const t = tryNode(postedEls[i]);
        if (t) return t;
      }
      const dateEl = root.querySelector('.glnew, .gltime, .gl4t, .gl2c, td.gl2c');
      if (dateEl) {
        const t = tryNode(dateEl);
        if (t) return t;
      }
      const blob = normalizePostedText(root.textContent || '').slice(0, 1200);
      const m = blob.match(/(20\d{2}-\d{1,2}-\d{1,2})(?:\s+(\d{1,2}:\d{2}))?/);
      if (m) return parsePostedToMs(m[1] + (m[2] ? ' ' + m[2] : ''));
    }
    // 无 root 时仍可用 gid 扫全页邻近
    if (g && typeof document !== 'undefined') {
      try {
        const link = document.querySelector('a[href*="/g/' + g + '/"]');
        if (link) {
          const card =
            link.closest('tr, .gl1t, .gl1e, .gl2t, .gl3t, .exc-gl-item') ||
            link.parentElement;
          if (card && card !== root) {
            const blob = normalizePostedText(card.textContent || '').slice(0, 1200);
            const m = blob.match(/(20\d{2}-\d{1,2}-\d{1,2})(?:\s+(\d{1,2}:\d{2}))?/);
            if (m) return parsePostedToMs(m[1] + (m[2] ? ' ' + m[2] : ''));
          }
        }
      } catch (_) { /* ignore */ }
    }
    return 0;
  }

  function extractTokenForGidFromDom(gid) {
    const g = compactText(gid || '');
    if (!g) return '';
    try {
      const a = document.querySelector('a[href*="/g/' + g + '/"]');
      if (!a) return '';
      const gt = parseGalleryUrl(a.href || a.getAttribute('href') || '');
      return gt && gt.token ? gt.token : '';
    } catch (_) {
      return '';
    }
  }

  function getEhGdataApiUrl() {
    const h = (location.hostname || '').toLowerCase();
    if (h.indexOf('exhentai') >= 0) {
      return (location.origin || 'https://exhentai.org').replace(/\/$/, '') + '/api.php';
    }
    return 'https://api.e-hentai.org/api.php';
  }

  /**
   * EH 官方 gdata 批量：posted / 页数 / 体积 / 标签（码级语言）。
   * @param {{gid:string|number,token:string}[]} pairs
   * @returns {Promise<Object<string, object>>} gid → meta
   */
  async function fetchGalleryGdataBatch(pairs) {
    const out = Object.create(null);
    const uniq = [];
    const seen = Object.create(null);
    for (let i = 0; i < (pairs || []).length; i++) {
      const p = pairs[i] || {};
      const g = compactText(p.gid || '');
      const t = compactText(p.token || '');
      if (!g || !t || seen[g]) continue;
      seen[g] = 1;
      uniq.push({ gid: g, token: t });
    }
    if (!uniq.length) return out;
    const api = getEhGdataApiUrl();
    for (let off = 0; off < uniq.length; off += 25) {
      const chunk = uniq.slice(off, off + 25);
      const gidlist = chunk.map((x) => [Number(x.gid), x.token]);
      try {
        const res = await gmRequest({
          method: 'POST',
          url: api,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          data: JSON.stringify({
            method: 'gdata',
            gidlist: gidlist,
            namespace: 1,
          }),
          timeout: 25000,
        });
        let body = res && (res.responseText || res.response);
        if (typeof body === 'string') {
          try {
            body = JSON.parse(body);
          } catch (_) {
            body = null;
          }
        }
        const arr = body && body.gmetadata;
        if (!Array.isArray(arr)) continue;
        for (let j = 0; j < arr.length; j++) {
          const meta = arr[j];
          if (!meta || meta.error) continue;
          const g = compactText(meta.gid);
          if (!g) continue;
          const sec = Number(meta.posted);
          const pages = Number(meta.filecount) || 0;
          const size_bytes = Number(meta.filesize) || 0;
          const tags = Array.isArray(meta.tags) ? meta.tags.map(String) : [];
          const title = compactText(meta.title || meta.title_jpn || '');
          const language = detectLanguageFromText(title, tags);
          const censor_tier = detectCensorTier(title, tags);
          const group =
            extractGroupFromTitle(title) || extractGroupsFromTags(tags)[0] || '';
          out[g] = {
            gid: g,
            token: compactText(meta.token || ''),
            posted_at: Number.isFinite(sec) && sec > 0 ? Math.round(sec * 1000) : 0,
            pages: pages,
            size_bytes: size_bytes,
            tags: tags,
            title_raw: title,
            language: language,
            censor_tier: censor_tier,
            group: group,
            uploader: compactText(meta.uploader || ''),
          };
        }
      } catch (_) {
        /* ignore chunk errors */
      }
    }
    return out;
  }

  /** gdata 仅取 posted（兼容旧调用） */
  async function fetchGalleryMetaPostedMs(gid, token) {
    const map = await fetchGalleryGdataBatch([{ gid: gid, token: token }]);
    const g = compactText(gid || '');
    return (map && map[g] && map[g].posted_at) || 0;
  }

  /** @param {{gid:string|number,token:string}[]} pairs */
  async function fetchGalleryMetaPostedBatch(pairs) {
    const full = await fetchGalleryGdataBatch(pairs);
    const out = Object.create(null);
    Object.keys(full).forEach((g) => {
      if (full[g] && full[g].posted_at) out[g] = full[g].posted_at;
    });
    return out;
  }

  /** 列表卡片抽页数/体积（缩略图/扩展模式常见） */
  function extractListItemPagesSize(root) {
    const result = { pages: 0, size_bytes: 0, size_text: '' };
    if (!root) return result;
    const blob = compactText(root.textContent || '').slice(0, 2000);
    // 页数：123 pages / 123頁 / 123p
    let m = blob.match(/(\d{1,5})\s*(?:pages?|頁|页|p)\b/i);
    if (m) result.pages = parseInt(m[1], 10) || 0;
    // 体积：220.8 MB / 389.5 MiB
    m = blob.match(/([\d.]+)\s*(TiB|GiB|MiB|KiB|TB|GB|MB|KB|B)\b/i);
    if (m) {
      result.size_text = m[1] + ' ' + m[2];
      result.size_bytes = parseSizeToBytes(result.size_text) || 0;
    }
    // 缩略图模式 .ir 等
    try {
      const ir = root.querySelector && root.querySelector('.ir, .glthumb div div, .gl4c, .gl3c');
      if (ir) {
        const t = compactText(ir.textContent || '');
        if (!result.pages) {
          const pm = t.match(/(\d{1,5})\s*(?:pages?|頁|页)/i);
          if (pm) result.pages = parseInt(pm[1], 10) || 0;
        }
        if (!result.size_bytes) {
          const sm = t.match(/([\d.]+)\s*(TiB|GiB|MiB|KiB|TB|GB|MB|KB)\b/i);
          if (sm) {
            result.size_text = sm[1] + ' ' + sm[2];
            result.size_bytes = parseSizeToBytes(result.size_text) || 0;
          }
        }
      }
    } catch (_) { /* ignore */ }
    return result;
  }

  /** 从离线 doc 取 posted（不用全局 document） */
  function extractListItemPostedAtInDoc(root, gid, doc) {
    const g = compactText(gid || '');
    const tryNode = (node) => {
      if (!node) return 0;
      const bits = [
        node.textContent,
        node.getAttribute && node.getAttribute('title'),
        node.outerHTML,
      ];
      for (let i = 0; i < bits.length; i++) {
        const t = parsePostedToMs(bits[i]);
        if (t) return t;
      }
      return 0;
    };
    if (g && doc && doc.getElementById) {
      const t = tryNode(doc.getElementById('posted_' + g));
      if (t) return t;
    }
    if (root && root.querySelector) {
      if (g) {
        const t = tryNode(root.querySelector('#posted_' + g));
        if (t) return t;
      }
      const postedEls = root.querySelectorAll('[id^="posted_"], [id^="Posted_"]');
      for (let i = 0; i < postedEls.length; i++) {
        const t = tryNode(postedEls[i]);
        if (t) return t;
      }
      const dateEl = root.querySelector('.glnew, .gltime, .gl4t, .gl2c, td.gl2c, .gl3e, .gl4e');
      if (dateEl) {
        const t = tryNode(dateEl);
        if (t) return t;
      }
      const blob = normalizePostedText(root.textContent || '').slice(0, 1200);
      const m = blob.match(/(20\d{2}-\d{1,2}-\d{1,2})(?:\s+(\d{1,2}:\d{2}))?/);
      if (m) return parsePostedToMs(m[1] + (m[2] ? ' ' + m[2] : ''));
    }
    return 0;
  }

  /** 解析作品发布时间：DOM →（可选）gdata */
  async function resolveGalleryPostedMs(gid, token, root) {
    const g = compactText(gid || '');
    if (!g) return 0;
    let p = extractListItemPostedAt(root || null, g);
    if (p) return p;
    p = lookupDomPostedByGid(g);
    if (p) return p;
    let tok = compactText(token || '');
    if (!tok) tok = extractTokenForGidFromDom(g);
    if (tok) {
      p = await fetchGalleryMetaPostedMs(g, tok);
      if (p) return p;
    }
    return 0;
  }

  /** 当前页 DOM 按 gid 找发布时间（回填旧追更记录用） */
  function lookupDomPostedByGid(gid) {
    const g = compactText(gid || '');
    if (!g) return 0;
    try {
      const byId = document.getElementById('posted_' + g);
      if (byId) {
        const t = parsePostedToMs(byId.textContent || '');
        if (t) return t;
      }
      const links = document.querySelectorAll('a[href*="/g/' + g + '/"]');
      for (let i = 0; i < links.length; i++) {
        const card =
          links[i].closest('tr, .gl1t, .gl1e, .gl2t, .gl3t, .exc-gl-item') ||
          links[i].parentElement;
        const t = extractListItemPostedAt(card, g);
        if (t) return t;
      }
    } catch (_) { /* ignore */ }
    return 0;
  }

  /** 从 editions 库按 gid 取 posted_at（gid 可能是 string/number） */
  async function lookupEditionPostedByGid(gid) {
    const g = compactText(gid || '');
    if (!g) return 0;
    try {
      let rows = await idbIndexGetAll(STORE_EDITIONS, 'gid', g);
      if ((!rows || !rows.length) && /^\d+$/.test(g)) {
        rows = await idbIndexGetAll(STORE_EDITIONS, 'gid', Number(g));
      }
      if (!rows || !rows.length) return 0;
      let best = 0;
      for (let i = 0; i < rows.length; i++) {
        const p = Number(rows[i] && rows[i].posted_at) || 0;
        if (p > best) best = p;
      }
      return best;
    } catch (_) {
      return 0;
    }
  }

  /**
   * 补全追更记录的 top/断点发布时间。
   * 顺序：DOM → editions → gdata（需 token）。
   * @param {object} [opts]
   * @param {boolean} [opts.skipGdata]
   */
  async function enrichTrackingPostedFields(rec, opts) {
    if (!rec) return rec;
    opts = opts || {};
    let dirty = false;
    if (rec.top_gid && !(Number(rec.top_posted_at) > 0)) {
      let p = lookupDomPostedByGid(rec.top_gid);
      if (!p) p = await lookupEditionPostedByGid(rec.top_gid);
      if (!p && !opts.skipGdata) {
        const tok = compactText(rec.top_token || '') || extractTokenForGidFromDom(rec.top_gid);
        if (tok) {
          if (!rec.top_token) rec.top_token = tok;
          p = await fetchGalleryMetaPostedMs(rec.top_gid, tok);
        }
      }
      if (p) {
        rec.top_posted_at = p;
        dirty = true;
      }
    }
    if (rec.breakpoint_gid && !(Number(rec.breakpoint_posted_at) > 0)) {
      let p = lookupDomPostedByGid(rec.breakpoint_gid);
      if (!p) p = await lookupEditionPostedByGid(rec.breakpoint_gid);
      if (!p && !opts.skipGdata) {
        const tok =
          compactText(rec.breakpoint_token || '') ||
          extractTokenForGidFromDom(rec.breakpoint_gid);
        if (tok) {
          if (!rec.breakpoint_token) rec.breakpoint_token = tok;
          p = await fetchGalleryMetaPostedMs(rec.breakpoint_gid, tok);
        }
      }
      if (p) {
        rec.breakpoint_posted_at = p;
        dirty = true;
      }
    }
    if (dirty) {
      try {
        await saveTrackingRecord(rec);
      } catch (_) { /* ignore */ }
    }
    return rec;
  }

  /** 批量补全列表里缺失的发布时间（gdata 每批最多 25） */
  async function enrichTrackingListPosted(list) {
    const rows = list || [];
    const need = [];
    for (let i = 0; i < rows.length; i++) {
      const rec = rows[i];
      if (!rec) continue;
      await enrichTrackingPostedFields(rec, { skipGdata: true });
      if (rec.top_gid && !(Number(rec.top_posted_at) > 0)) {
        const tok = compactText(rec.top_token || '') || extractTokenForGidFromDom(rec.top_gid);
        if (tok) {
          rec.top_token = rec.top_token || tok;
          need.push({ gid: rec.top_gid, token: tok, rec: rec, field: 'top' });
        }
      }
      if (rec.breakpoint_gid && !(Number(rec.breakpoint_posted_at) > 0)) {
        const tok =
          compactText(rec.breakpoint_token || '') ||
          extractTokenForGidFromDom(rec.breakpoint_gid);
        if (tok) {
          rec.breakpoint_token = rec.breakpoint_token || tok;
          need.push({ gid: rec.breakpoint_gid, token: tok, rec: rec, field: 'bp' });
        }
      }
    }
    if (!need.length) return rows;
    const pairs = need.map((x) => ({ gid: x.gid, token: x.token }));
    const map = await fetchGalleryMetaPostedBatch(pairs);
    const dirtyIds = Object.create(null);
    for (let j = 0; j < need.length; j++) {
      const item = need[j];
      const ms = map[compactText(item.gid)] || 0;
      if (!ms) continue;
      if (item.field === 'top' && !(Number(item.rec.top_posted_at) > 0)) {
        item.rec.top_posted_at = ms;
        dirtyIds[item.rec.id] = item.rec;
      }
      if (item.field === 'bp' && !(Number(item.rec.breakpoint_posted_at) > 0)) {
        item.rec.breakpoint_posted_at = ms;
        dirtyIds[item.rec.id] = item.rec;
      }
    }
    const saves = Object.keys(dirtyIds);
    for (let k = 0; k < saves.length; k++) {
      try {
        await saveTrackingRecord(dirtyIds[saves[k]]);
      } catch (_) { /* ignore */ }
    }
    return rows;
  }

  /** 从列表卡片节点取封面图 URL（img / data-src / 背景图） */
  function extractListItemCoverUrl(root, baseUrl) {
    if (!root) return '';
    baseUrl = baseUrl || location.href;
    const pick = (raw) => {
      let s = compactText(raw || '');
      if (!s || /^data:/i.test(s)) return '';
      if (/placeholder|blank\.|spacer|1x1|loading\.gif|transparent|data:image\/gif/i.test(s)) {
        return '';
      }
      if (s.indexOf(',') >= 0) s = compactText(s.split(',')[0] || '');
      if (/\s/.test(s)) s = compactText(s.split(/\s+/)[0] || '');
      try {
        return new URL(s, baseUrl).href;
      } catch (_) {
        return s;
      }
    };
    const imgs = root.querySelectorAll ? root.querySelectorAll('img') : [];
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      const src =
        img.getAttribute('data-src') ||
        img.getAttribute('data-original') ||
        img.getAttribute('data-lazy-src') ||
        img.getAttribute('data-srcset') ||
        img.getAttribute('srcset') ||
        img.currentSrc ||
        img.getAttribute('src') ||
        '';
      const u = pick(src);
      if (u) return u;
    }
    // 部分模式用 div 背景当缩略图
    const styled = root.querySelectorAll
      ? root.querySelectorAll('.glthumb div, .glthumb, [style*="background"]')
      : [];
    for (let j = 0; j < styled.length; j++) {
      const st = (styled[j].getAttribute('style') || '') + '';
      const m = st.match(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/i);
      if (m) {
        const u = pick(m[1]);
        if (u) return u;
      }
    }
    return '';
  }

  /** 从 URL 读 page（EH 从 0 起）。无 page 参数时返回 null（不是 0） */
  function getListPageIndexFromUrl(href) {
    try {
      const raw = new URL(href || location.href, location.origin).searchParams.get('page');
      if (raw == null || raw === '') return null;
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n >= 0 ? n : null;
    } catch (_) {
      return null;
    }
  }

  /**
   * 从分页表读当前页（0 起）。
   * EH 有 .ptt（上）/ .ptb（下）；游标 next= 时 .ptds 常仍亮「1」，不可单独信任。
   */
  function getListPageIndexFromDom(doc) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    if (!doc || !doc.querySelector) return null;
    try {
      const roots = [];
      const ptt = doc.querySelector('#ido table.ptt, table.ptt, .ptt');
      const ptb = doc.querySelector('#ido table.ptb, table.ptb, .ptb');
      if (ptt) roots.push(ptt);
      if (ptb && ptb !== ptt) roots.push(ptb);
      if (!roots.length) roots.push(doc);

      for (let r = 0; r < roots.length; r++) {
        const root = roots[r];
        const cur =
          root.querySelector('td.ptds') ||
          root.querySelector('.ptds');
        if (cur) {
          const t = compactText(cur.textContent || '');
          // 忽略 < > » 等非数字
          const n = parseInt(t, 10);
          if (Number.isFinite(n) && n >= 1 && n < 5000 && String(n) === t.replace(/[^\d]/g, '')) {
            return n - 1;
          }
          // 文本里夹杂时再试
          const m = t.match(/(\d{1,4})/);
          if (m) {
            const nn = parseInt(m[1], 10);
            if (Number.isFinite(nn) && nn >= 1 && nn < 5000) return nn - 1;
          }
        }
        // 当前页：无链接的数字格
        const cells = root.querySelectorAll('td');
        for (let i = 0; i < cells.length; i++) {
          const td = cells[i];
          if (!td || td.querySelector('a')) continue;
          const t = compactText(td.textContent || '');
          const n = parseInt(t, 10);
          if (Number.isFinite(n) && n >= 1 && n < 5000 && String(n) === t) return n - 1;
        }
      }
    } catch (_) { /* ignore */ }
    return null;
  }

  function formatListPageDisplay(state) {
    if (!state) return '?';
    if (state.isFirst) return '1';
    if (state.known && state.index >= 0) return String(state.index + 1);
    if (state.mode === 'cursor') return '深页';
    return '?';
  }

  /**
   * 列表页位置状态。
   * ExH 点「>」常用 ?next=gid（游标），URL 无 page=，.ptds 还可能停在 1 —— 不能当首页。
   * @returns {{ index: number, known: boolean, isFirst: boolean, mode: string, display: string }}
   */
  function getListPageState(href, doc) {
    href = href || (typeof location !== 'undefined' ? location.href : '');
    doc = doc !== undefined ? doc : typeof document !== 'undefined' ? document : null;
    const cursor = listUrlHasCursorNav(href);
    const fromUrl = getListPageIndexFromUrl(href);
    // 仅当前文档 URL 才信 DOM（解析别的 href 时 DOM 对不上）
    let fromDom = null;
    try {
      const sameDoc =
        doc &&
        typeof location !== 'undefined' &&
        (() => {
          try {
            const a = new URL(href, location.origin);
            const b = new URL(location.href, location.origin);
            return a.pathname === b.pathname && a.search === b.search;
          } catch (_) {
            return false;
          }
        })();
      if (sameDoc || (doc && href === (typeof location !== 'undefined' ? location.href : href))) {
        fromDom = getListPageIndexFromDom(doc);
      }
    } catch (_) { /* ignore */ }

    // 1) 明确 page=N
    if (fromUrl != null && fromUrl > 0) {
      return {
        index: fromUrl,
        known: true,
        isFirst: false,
        mode: 'page',
        display: String(fromUrl + 1),
      };
    }
    if (fromUrl === 0 && !cursor) {
      return { index: 0, known: true, isFirst: true, mode: 'page', display: '1' };
    }

    // 2) 游标 next/prev/seek/jump：绝不是结果集首页
    if (cursor) {
      // DOM 若给出 >1 的页码可参考；=0/1 在游标下不可信
      if (fromDom != null && fromDom > 0) {
        return {
          index: fromDom,
          known: true,
          isFirst: false,
          mode: 'cursor',
          display: String(fromDom + 1),
        };
      }
      return {
        index: -1,
        known: false,
        isFirst: false,
        mode: 'cursor',
        display: '深页',
      };
    }

    // 3) 无 page、无游标：看 DOM
    if (fromDom != null && fromDom > 0) {
      return {
        index: fromDom,
        known: true,
        isFirst: false,
        mode: 'dom',
        display: String(fromDom + 1),
      };
    }
    if (fromDom === 0) {
      return { index: 0, known: true, isFirst: true, mode: 'dom', display: '1' };
    }

    // 4) 默认当首页（无任何深页信号）
    return { index: 0, known: true, isFirst: true, mode: 'home', display: '1' };
  }

  /** 当前列表页码（0 起）；游标深页未知时 -1 */
  function getCurrentListPageIndex() {
    const st = getListPageState(location.href, document);
    if (st.known && st.index >= 0) return st.index;
    if (!st.isFirst) return -1;
    return 0;
  }

  function buildListUrlWithPage(baseUrl, pageIndex) {
    try {
      const u = new URL(baseUrl || location.href, location.origin);
      // 按页码跳转时清掉游标，否则 page= 与 next= 混用结果难料
      u.searchParams.delete('next');
      u.searchParams.delete('prev');
      u.searchParams.delete('seek');
      u.searchParams.delete('jump');
      const p = Math.max(0, Math.floor(Number(pageIndex) || 0));
      if (p <= 0) u.searchParams.delete('page');
      else u.searchParams.set('page', String(p));
      u.searchParams.delete('f_apply');
      u.searchParams.delete('apply');
      return u.href;
    } catch (_) {
      return baseUrl || location.href;
    }
  }

  async function saveCurrentPageAsTracking() {
    const ctx = parseExhPageContext(location.href);
    if (!ctx || !ctx.trackable) {
      showToast((ctx && ctx.reason) || '当前页不能收藏。请打开标签/搜索/社团页再点收藏。');
      return null;
    }
    // 列表 DOM 经常拿不到 posted（极简模式等）→ gdata 补最新发布时间
    if (ctx.top_gid && !(Number(ctx.top_posted_at) > 0)) {
      ctx.top_posted_at = await resolveGalleryPostedMs(
        ctx.top_gid,
        ctx.top_token || '',
        null
      );
    }
    const rec = await upsertTrackingFromContext(ctx);
    // 顺手记下当前页为浏览位置
    try {
      rec.last_page = getCurrentListPageIndex();
      rec.last_browsed_at = nowMs();
      if (ctx.top_token) rec.top_token = ctx.top_token;
      if (ctx.top_posted_at && !(Number(rec.top_posted_at) > 0)) {
        rec.top_posted_at = Number(ctx.top_posted_at) || 0;
      }
      await saveTrackingRecord(rec);
    } catch (_) { /* ignore */ }
    showToast('已收藏：' + getTrackingDisplayTitle(rec));
    if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
    return rec;
  }

  /**
   * 设追更断点。
   * @param {object} rec tracking record
   * @param {object} [opts]
   * @param {string} [opts.gid] 断点作品 gid（作品级，主断点）
   * @param {string} [opts.token]
   * @param {string} [opts.title]
   * @param {number} [opts.posted_at]
   * @param {Element} [opts.root] 列表卡片根节点（辅助抽 posted）
   * @param {boolean} [opts.pageOnly] 仅记当前列表页（顶栏「本页」）
   */
  async function markTrackingBreakpoint(rec, opts) {
    if (!rec) return null;
    opts = opts || {};
    // fromGallery：当前在画廊页，页码/URL 用 opts 传入的列表上下文，勿读 location
    const fromGallery = opts.fromGallery === true;
    const pageState = fromGallery
      ? { known: opts.pageIndex != null && Number(opts.pageIndex) >= 0, index: Number(opts.pageIndex), isFirst: Number(opts.pageIndex) === 0, mode: opts.pageMode || '' }
      : getListPageState(location.href, document);
    const page = pageState.known && pageState.index >= 0 ? pageState.index : -1;
    rec.breakpoint_page = page;
    rec.breakpoint_page_known = pageState.known && page >= 0 ? 1 : 0;
    rec.breakpoint_page_mode = pageState.mode || '';
    rec.breakpoint_url = fromGallery && opts.listUrl
      ? String(opts.listUrl).split('#')[0]
      : location.href.split('#')[0];
    rec.breakpoint_at = nowMs();
    rec.last_page = page;
    rec.last_browsed_at = nowMs();
    if (rec.open_url) {
      rec.open_url = canonicalizeTrackingOpenUrl(rec.open_url);
      rec.page_url = rec.open_url;
    }
    if (opts.pageOnly) {
      // 仅页码，不改作品断点
    } else if (opts.gid) {
      rec.breakpoint_gid = String(opts.gid);
      rec.breakpoint_token = compactText(opts.token || '');
      rec.breakpoint_title = compactText(opts.title || '').slice(0, 120);
      let posted = Number(opts.posted_at) || 0;
      if (!posted) {
        posted = await resolveGalleryPostedMs(
          opts.gid,
          opts.token || rec.breakpoint_token,
          opts.root || null
        );
      }
      if (posted) rec.breakpoint_posted_at = posted;
    }
    // 设断点后回写未读（画廊页无列表 DOM，跳过估数）
    try {
      if (fromGallery) {
        if (rec.top_gid && rec.breakpoint_gid && String(rec.top_gid) === String(rec.breakpoint_gid)) {
          rec.has_update = 0;
          rec.unread_estimate = 0;
          rec.unread_estimate_capped = 0;
          rec.unread_estimate_source = 'home_caught_up';
        } else if (rec.breakpoint_gid) {
          rec.has_update = 1;
          // 断点已前移：未读必须下降或重算，禁止继续挂着旧的 +226
          const prevEst = Math.max(0, Math.floor(Number(rec.unread_estimate) || 0));
          const pIdx = Number(opts.pageIndex);
          const lIdx = Number(opts.listIndex);
          const pLen = Number(opts.pageLen) || 25;
          let provisional = -1;
          if (Number.isFinite(pIdx) && pIdx >= 0 && Number.isFinite(lIdx) && lIdx >= 0) {
            writeUnreadFromPagePos(rec, pIdx, lIdx, pLen);
            provisional = Math.max(0, Math.floor(Number(rec.unread_estimate) || 0));
            // 跟断点只往更新走：公式若异常偏高，先压到不超过旧值
            if (prevEst > 0 && provisional > prevEst) {
              rec.unread_estimate = prevEst;
              provisional = prevEst;
            }
          } else if (prevEst > 0) {
            // 无页码时先不清成 0（避免闪「更新」），标记待扫；扫描后覆盖
            rec.unread_estimate_capped = 1;
            rec.unread_estimate_source = 'bp_advanced';
          }
          await saveTrackingRecord(rec);
          if (opts.skipUnreadScan !== true) {
            try {
              if (typeof showToast === 'function') showToast('断点已跟到，正在重算未读…');
              rec = (await recountTrackingUnreadDeep(rec, { prevEstimate: prevEst })) || rec;
            } catch (e) {
              console.warn('[ExC] unread scan after gallery bp', e);
              // 扫描失败：至少用临时公式，且不得超过旧值
              if (provisional >= 0 && provisional < prevEst) {
                rec.unread_estimate = provisional;
                rec.unread_estimate_capped = 1;
                rec.unread_estimate_source = 'page_formula';
                await saveTrackingRecord(rec);
              }
            }
          }
          return rec;
        }
        await saveTrackingRecord(rec);
        return rec;
      }
      const gids =
        typeof extractOrderedGidsFromDocument === 'function'
          ? extractOrderedGidsFromDocument(document)
          : [];
      const top = compactText(rec.top_gid || '');
      const homeLook = listPageLooksLikeHome(gids, top);
      let isFirst = pageState.isFirst === true;
      let known = pageState.known === true && page >= 0;
      let pageIdx = known ? page : -1;
      if (homeLook === false) {
        isFirst = false;
        // 无可信页码时，用 last_page / 浏览页兜底，保证还能算出数量
        if (pageIdx <= 0) {
          const lp = Number(rec.last_page);
          if (Number.isFinite(lp) && lp > 0) {
            pageIdx = lp;
            known = true;
            rec.breakpoint_page = lp;
            rec.breakpoint_page_known = 1;
          } else {
            known = false;
            pageIdx = -1;
            rec.breakpoint_page = -1;
            rec.breakpoint_page_known = 0;
            if (!rec.breakpoint_page_mode || rec.breakpoint_page_mode === 'home') {
              rec.breakpoint_page_mode = pageState.mode || 'cursor';
            }
          }
        }
      }
      const bpGid = compactText(rec.breakpoint_gid || '');
      const listIdx = bpGid && gids.length ? gids.indexOf(String(bpGid)) : -1;
      const pageLen = gids.length || 25;
      if (isFirst && homeLook !== false) {
        // 真·首页：当页位置 = 精确未读
        if (listIdx >= 0) writeUnreadFromPagePos(rec, 0, listIdx, pageLen);
        else if (typeof applyTrackingUnreadFromGids === 'function') {
          applyTrackingUnreadFromGids(rec, gids, top, {
            pageIndex: 0,
            isFirst: true,
            deepUnknown: false,
            mode: 'absolute',
          });
        }
        if (rec.unread_estimate_source !== 'home_caught_up') {
          rec.unread_estimate_source = rec.unread_estimate_source || 'set_bp_home';
        }
      } else if (known && pageIdx > 0 && listIdx >= 0) {
        // 临时页码公式；下面会跨页精确扫覆盖
        writeUnreadFromPagePos(rec, pageIdx, listIdx, pageLen);
      } else if (top && bpGid && top !== bpGid) {
        rec.has_update = 1;
        // 禁止再写假的 +25（一页条数）；保留旧值等跨页扫描
      }
      // 非首页：从首页扫到断点，写真实数量（否则永远是 +25+）
      const needScan =
        opts.skipUnreadScan !== true &&
        bpGid &&
        !(isFirst && homeLook !== false && listIdx >= 0);
      if (needScan && !(isFirst && homeLook !== false)) {
        await saveTrackingRecord(rec);
        try {
          if (typeof showToast === 'function') showToast('断点已记，正在计算未读…');
          rec = (await recountTrackingUnreadDeep(rec)) || rec;
        } catch (scanErr) {
          console.warn('[ExC] unread scan', scanErr);
        }
        return rec;
      }
    } catch (_) { /* ignore */ }
    await saveTrackingRecord(rec);
    return rec;
  }

  /** 从首页扫到断点写 unread_estimate；opts.prevEstimate 防止扫失败保留过大旧值 */
  async function recountTrackingUnreadDeep(rec, opts) {
    if (!rec) return null;
    opts = opts || {};
    const bp = compactText(rec.breakpoint_gid || '');
    const raw = rec.open_url || rec.page_url || '';
    if (!bp || !raw) return rec;
    const prevEst = Math.max(
      0,
      Math.floor(Number(opts.prevEstimate != null ? opts.prevEstimate : rec.unread_estimate) || 0)
    );
    const home = buildListUrlWithPage(canonicalizeTrackingOpenUrl(raw), 0);
    const maxPages = Math.min(
      40,
      Math.max(8, Math.floor(Number(config.tracking_unread_scan_max_pages) || 20))
    );
    const scan = await scanTrackingUnreadAcrossPages(home, bp, { maxPages: maxPages });
    if (scan.topGal && scan.topGal.gid) {
      rec.top_gid = String(scan.topGal.gid);
      if (scan.topGal.token) rec.top_token = compactText(scan.topGal.token);
      if (scan.topGal.title) rec.top_title = String(scan.topGal.title).slice(0, 160);
      if (scan.topGal.cover) applyTrackingCoverFields(rec, scan.topGal.cover);
    }
    if (scan.found) {
      // 精确值：跟断点后应比旧未读小（或相等）；异常偏高时取较小者
      let n = Math.max(0, Number(scan.count) || 0);
      if (prevEst > 0 && n > prevEst) n = prevEst;
      rec.unread_estimate = n;
      rec.unread_estimate_capped = 0;
      rec.unread_estimate_source = 'deep_scan';
      rec.has_update = n > 0 ? 1 : 0;
      if (scan.pagesScanned > 0) {
        rec.breakpoint_page = Math.max(0, scan.pagesScanned - 1);
        rec.breakpoint_page_known = 1;
        rec.breakpoint_page_mode = 'scan';
      }
    } else {
      rec.has_update = 1;
      const floor = Math.max(0, Number(scan.count) || 0);
      // 未扫到断点：用已扫条数作下限；若有旧值则取 min（跟断后不应更大）
      if (floor > 0) {
        rec.unread_estimate = prevEst > 0 ? Math.min(prevEst, floor) : floor;
        rec.unread_estimate_capped = 1;
        rec.unread_estimate_source = 'deep_scan';
      } else if (prevEst > 0 && compactText(rec.unread_estimate_source || '') === 'bp_advanced') {
        // 完全没扫到：保持旧值并标约数，避免假装精确
        rec.unread_estimate = prevEst;
        rec.unread_estimate_capped = 1;
      }
      if (scan.lastError) {
        rec.last_check_error = String(scan.lastError).slice(0, 160);
      }
    }
    rec.unread_scan_pages = scan.pagesScanned || 0;
    await saveTrackingRecord(rec);
    if (typeof showToast === 'function' && (scan.found || Number(rec.unread_estimate) >= 0)) {
      const n = Math.max(0, Math.floor(Number(rec.unread_estimate) || 0));
      if (scan.found) {
        showToast(n > 0 ? '未读 +' + n : '已追上最新');
      }
    }
    if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
    return rec;
  }

  function trackingHasWorkBreakpoint(rec) {
    return !!(rec && compactText(rec.breakpoint_gid || ''));
  }

  function trackingHasAnyBreakpoint(rec) {
    if (!rec) return false;
    return !!(
      trackingHasWorkBreakpoint(rec) ||
      rec.breakpoint_url ||
      (rec.breakpoint_page != null && rec.breakpoint_page !== '')
    );
  }

  /** 打开断点：优先原 breakpoint_url（含 next= 游标），否则 page= 跳转 */
  async function openTrackingBreakpoint(rec) {
    if (!rec) return;
    const gid = compactText(rec.breakpoint_gid || '');
    if (gid) {
      try {
        sessionStorage.setItem('exc_bp_scroll_gid', gid);
      } catch (_) { /* ignore */ }
    }
    const bpUrl = compactText(rec.breakpoint_url || '');
    let url = '';
    // 游标断点：原 URL 最可靠（page= 重建对不上 next= 位置）
    if (bpUrl && listUrlHasCursorNav(bpUrl)) {
      url = bpUrl.split('#')[0];
    } else if (bpUrl && (Number(rec.breakpoint_page) || 0) < 0) {
      // 未知深页但存了 URL
      url = bpUrl.split('#')[0];
    } else {
      const targetPage =
        Number(rec.breakpoint_page) >= 0 ? Number(rec.breakpoint_page) : 0;
      const base =
        bpUrl || rec.open_url || rec.page_url || location.href;
      // 从首页规范 URL 建 page=，避免 base 仍带 next=
      const home = canonicalizeTrackingOpenUrl(base);
      url = buildListUrlWithPage(home, targetPage);
    }
    const here = location.href.split('#')[0];
    if (url.split('#')[0] === here) {
      void scrollToBreakpointGid(gid);
      return;
    }
    location.href = url;
  }

  function scrollToBreakpointGid(gid) {
    if (!gid) return false;
    const items = document.querySelectorAll('.exc-gl-item, a[href*="/g/"]');
    let target = null;
    items.forEach((el) => {
      if (target) return;
      const g = el.dataset && el.dataset.excGid;
      if (g && String(g) === String(gid)) {
        target = el.classList && el.classList.contains('exc-gl-item') ? el : el.closest('.exc-gl-item') || el;
        return;
      }
      const href = el.getAttribute && (el.getAttribute('href') || '');
      const m = String(href).match(/\/g\/(\d+)\//);
      if (m && m[1] === String(gid)) {
        target = el.closest('.gl1t, tr, .exc-gl-item') || el;
      }
    });
    if (!target) {
      showToast('本页未找到断点作品 g' + gid + '，可能已翻页或不在当前列表');
      return false;
    }
    document.querySelectorAll('.is-exc-breakpoint').forEach((n) => n.classList.remove('is-exc-breakpoint'));
    target.classList.add('is-exc-breakpoint');
    try {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_) {
      target.scrollIntoView(true);
    }
    showToast('已定位到断点作品');
    return true;
  }

  function tryConsumeBreakpointScroll() {
    let gid = '';
    try {
      gid = sessionStorage.getItem('exc_bp_scroll_gid') || '';
      if (gid) sessionStorage.removeItem('exc_bp_scroll_gid');
    } catch (_) {
      return;
    }
    if (!gid) return;
    // 等列表增强完再滚
    setTimeout(() => {
      if (!scrollToBreakpointGid(gid)) {
        setTimeout(() => scrollToBreakpointGid(gid), 800);
      }
    }, 400);
  }

  /** 列表点开作品时暂存追更上下文（画廊页/乐观跟断点） */
  const EXC_TRACK_OPEN_KEY = 'exc_track_open_ctx';

  function setPendingTrackingOpen(payload) {
    if (!payload || !payload.trackingId || !payload.gid) return;
    try {
      sessionStorage.setItem(
        EXC_TRACK_OPEN_KEY,
        JSON.stringify({
          trackingId: String(payload.trackingId),
          gid: String(payload.gid),
          token: compactText(payload.token || ''),
          title: compactText(payload.title || '').slice(0, 120),
          posted_at: Number(payload.posted_at) || 0,
          listUrl: compactText(payload.listUrl || location.href).split('#')[0],
          pageIndex: payload.pageIndex != null ? Number(payload.pageIndex) : -1,
          pageMode: compactText(payload.pageMode || ''),
          // 当页序号（0 起），配合 pageIndex 算未读
          listIndex: payload.listIndex != null ? Number(payload.listIndex) : -1,
          pageLen: payload.pageLen != null ? Number(payload.pageLen) : 0,
          at: nowMs(),
        })
      );
    } catch (_) { /* ignore */ }
  }

  /** 用页码 + 当页位置写未读数量（深页约数，带 +N+） */
  function writeUnreadFromPagePos(rec, pageIndex, listIndex, pageLen) {
    if (!rec) return;
    const idx = Math.max(0, Math.floor(Number(listIndex) || 0));
    const len = Math.max(1, Math.floor(Number(pageLen) || 25));
    const pageSize = len >= 20 ? len : 25;
    const p = Number(pageIndex);
    if (!Number.isFinite(p) || p < 0) return false;
    if (p === 0) {
      rec.unread_estimate = idx;
      rec.unread_estimate_capped = 0;
      rec.unread_estimate_source = 'home_exact';
    } else {
      rec.unread_estimate = p * pageSize + idx;
      rec.unread_estimate_capped = 1;
      rec.unread_estimate_source = 'page_formula';
    }
    if (rec.unread_estimate > 0) rec.has_update = 1;
    else if (rec.top_gid && rec.breakpoint_gid && String(rec.top_gid) === String(rec.breakpoint_gid)) {
      rec.has_update = 0;
    }
    return true;
  }

  function takePendingTrackingOpen() {
    try {
      const raw = sessionStorage.getItem(EXC_TRACK_OPEN_KEY);
      if (!raw) return null;
      sessionStorage.removeItem(EXC_TRACK_OPEN_KEY);
      const o = JSON.parse(raw);
      if (!o || !o.trackingId || !o.gid) return null;
      // 超过 30 分钟丢弃，避免脏上下文
      if (o.at && nowMs() - Number(o.at) > 30 * 60 * 1000) return null;
      return o;
    } catch (_) {
      return null;
    }
  }

  function extractTopGalleryFromListHtml(html, baseUrl) {
    const s = String(html || '');
    baseUrl = baseUrl || location.href;
    // 优先 DOM 解析：同时拿 gid / 标题 / 封面
    try {
      if (typeof DOMParser !== 'undefined') {
        const doc = new DOMParser().parseFromString(s, 'text/html');
        const firstLink = doc.querySelector(
          '#ido a[href*="/g/"], table.itg a[href*="/g/"], .itg a[href*="/g/"], a[href*="/g/"]'
        );
        if (firstLink) {
          const href = firstLink.getAttribute('href') || '';
          const gt = parseGalleryUrl(href, baseUrl);
          if (gt && gt.gid) {
            const cardRoot =
              firstLink.closest('tr, .gl1t, .gl1e, .gl2t, .gl3t') ||
              firstLink.parentElement ||
              firstLink;
            const titleEl =
              (cardRoot &&
                cardRoot.querySelector('.glink, .glname a, .gl3e a, .gl4e a')) ||
              firstLink;
            const title = compactText(
              (titleEl && (titleEl.getAttribute('title') || titleEl.textContent)) || ''
            );
            const cover = extractListItemCoverUrl(cardRoot || firstLink, baseUrl);
            const posted_at = extractListItemPostedAt(cardRoot || firstLink, gt.gid);
            return {
              gid: String(gt.gid),
              token: gt.token || '',
              title: title,
              cover: cover,
              posted_at: posted_at,
            };
          }
        }
      }
    } catch (_) { /* fall through regex */ }
    // glink 标题 + 邻近 /g/gid/
    let m = s.match(
      /class=["']glink["'][^>]*>([^<]{1,200})<\/[\s\S]{0,600}?\/g\/(\d+)\/[0-9a-f]+/i
    );
    if (m) {
      const cover = extractCoverUrlNearGidFromHtml(s, m[2], baseUrl);
      const posted_at = extractPostedNearGidFromHtml(s, m[2]);
      return { gid: m[2], title: compactText(m[1]), cover: cover, posted_at: posted_at };
    }
    m = s.match(
      /\/g\/(\d+)\/[0-9a-f]+\/[^"'<]{0,80}["'][^>]*>[\s\S]{0,400}?class=["']glink["'][^>]*>([^<]{1,200})</i
    );
    if (m) {
      const cover = extractCoverUrlNearGidFromHtml(s, m[1], baseUrl);
      const posted_at = extractPostedNearGidFromHtml(s, m[1]);
      return { gid: m[1], title: compactText(m[2]), cover: cover, posted_at: posted_at };
    }
    m = s.match(/id=["']?itg[\s\S]{0,8000}?\/g\/(\d+)\/[0-9a-f]+/i);
    if (m) {
      return {
        gid: m[1],
        title: '',
        cover: extractCoverUrlNearGidFromHtml(s, m[1], baseUrl),
        posted_at: extractPostedNearGidFromHtml(s, m[1]),
      };
    }
    m = s.match(/\/g\/(\d+)\/[0-9a-f]{8,}/i);
    return m
      ? {
          gid: m[1],
          title: '',
          cover: extractCoverUrlNearGidFromHtml(s, m[1], baseUrl),
          posted_at: extractPostedNearGidFromHtml(s, m[1]),
        }
      : null;
  }

  /** 正则兜底：id="posted_GID" 或邻近日期文本 */
  function extractPostedNearGidFromHtml(html, gid) {
    const s = String(html || '');
    const g = String(gid || '');
    if (!g) return 0;
    let m = s.match(new RegExp('id=["\']?posted_' + g + '["\']?[^>]*>([^<]{6,40})<', 'i'));
    if (m) {
      const t = parsePostedToMs(m[1]);
      if (t) return t;
    }
    const idx = s.search(new RegExp('\\/g\\/' + g + '\\/', 'i'));
    if (idx < 0) return 0;
    const slice = s.slice(Math.max(0, idx - 1200), Math.min(s.length, idx + 1600));
    m = slice.match(/(20\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
    if (m) return parsePostedToMs(m[1]);
    m = slice.match(/(20\d{2}-\d{2}-\d{2})/);
    return m ? parsePostedToMs(m[1]) : 0;
  }

  /** 正则兜底：在 gid 邻近片段里找 ehgt / hath 缩略图 */
  function extractCoverUrlNearGidFromHtml(html, gid, baseUrl) {
    const s = String(html || '');
    const g = String(gid || '');
    if (!g) return '';
    const idx = s.search(new RegExp('\\/g\\/' + g + '\\/', 'i'));
    if (idx < 0) return '';
    const slice = s.slice(Math.max(0, idx - 2500), Math.min(s.length, idx + 800));
    const m = slice.match(
      /(?:src|data-src|data-original)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/i
    );
    if (!m) {
      const m2 = slice.match(
        /url\(\s*['"]?(https?:\/\/[^'")\s]+\.(?:jpg|jpeg|png|webp|gif)[^'")\s]*)['"]?\s*\)/i
      );
      if (!m2) return '';
      try {
        return new URL(m2[1], baseUrl || location.href).href;
      } catch (_) {
        return m2[1];
      }
    }
    try {
      return new URL(m[1], baseUrl || location.href).href;
    } catch (_) {
      return m[1];
    }
  }

  /** 列表 HTML 中按出现顺序去重的 gid（用于估算未读条数） */
  function extractOrderedGidsFromListHtml(html) {
    const s = String(html || '');
    const re = /\/g\/(\d+)\/[0-9a-f]+/gi;
    const out = [];
    const seen = new Set();
    let m;
    while ((m = re.exec(s))) {
      const g = String(m[1]);
      if (seen.has(g)) continue;
      seen.add(g);
      out.push(g);
      if (out.length >= 100) break;
    }
    return out;
  }

  /** 从列表 HTML 解析画廊条目（相关版本搜索用） */
  function parseGalleryListFromHtml(html, baseUrl) {
    const out = [];
    const seen = new Set();
    baseUrl = baseUrl || (typeof location !== 'undefined' ? location.href : '');
    try {
      if (typeof DOMParser === 'undefined') return out;
      const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
      const roots = [];
      const selectors = [
        'table.itg > tbody > tr',
        'table.itg tr',
        'div.gl1t',
        'div.gl2t',
        'div.gl3t',
        '.gl1e',
        '.gl2e',
      ];
      for (let s = 0; s < selectors.length; s++) {
        const nodes = doc.querySelectorAll(selectors[s]);
        if (nodes && nodes.length) {
          nodes.forEach((el) => roots.push(el));
          break;
        }
      }
      if (!roots.length) {
        doc.querySelectorAll('a[href*="/g/"]').forEach((a) => {
          const row = a.closest('tr, .gl1t, .gl2t, .gl3t, .gl1e, .gl2e') || a;
          if (row && roots.indexOf(row) < 0) roots.push(row);
        });
      }
      for (let i = 0; i < roots.length; i++) {
        const root = roots[i];
        if (root.querySelector && root.querySelector('th')) continue;
        const link = root.querySelector && root.querySelector('a[href*="/g/"]');
        if (!link) continue;
        const href = link.getAttribute('href') || link.href || '';
        const gt = typeof parseGalleryUrl === 'function' ? parseGalleryUrl(href, baseUrl) : null;
        if (!gt || !gt.gid || seen.has(String(gt.gid))) continue;
        seen.add(String(gt.gid));
        const titleEl =
          root.querySelector('.glink') ||
          root.querySelector('.glname a') ||
          root.querySelector('.glname') ||
          link;
        const title = compactText(
          (titleEl && (titleEl.getAttribute('title') || titleEl.textContent)) || ''
        );
        let cover = '';
        try {
          cover =
            typeof extractListItemCoverUrl === 'function'
              ? extractListItemCoverUrl(root, baseUrl)
              : '';
        } catch (_) { /* ignore */ }
        let posted_at = 0;
        try {
          posted_at = extractListItemPostedAtInDoc(root, gt.gid, doc);
          if (!posted_at && typeof extractListItemPostedAt === 'function') {
            posted_at = extractListItemPostedAt(root, gt.gid);
          }
        } catch (_) { /* ignore */ }
        const ps = extractListItemPagesSize(root);
        // 列表上语言/码级先从标题猜；gdata 会再补
        const language = detectLanguageFromText(title, []);
        const censor_tier = detectCensorTier(title, []);
        const group = extractGroupFromTitle(title) || '';
        out.push({
          gid: String(gt.gid),
          token: gt.token || '',
          title_raw: title,
          title: title,
          thumb: cover,
          cover: cover,
          posted_at: posted_at || 0,
          pages: ps.pages || 0,
          size_bytes: ps.size_bytes || 0,
          size_text: ps.size_text || '',
          language: language,
          censor_tier: censor_tier,
          group: group,
          url:
            typeof buildGalleryUrl === 'function'
              ? buildGalleryUrl(new URL(baseUrl).origin, gt.gid, gt.token)
              : href,
        });
        if (out.length >= 40) break;
      }
    } catch (e) {
      console.warn('[ExC] parseGalleryListFromHtml', e);
    }
    return out;
  }

  /** @returns {{ imported:number, total:number, error?:string }} */
  async function importRelatedOnlineEditions(edition, opts) {
    opts = opts || {};
    if (!edition || !edition.gid) return { imported: 0, total: 0, error: 'no edition' };
    const workId = opts.workId || edition.work_id;
    if (!workId) return { imported: 0, total: 0, error: 'no work' };
    const core = compactText(edition.title_core || buildTitleCore(edition.title_raw || edition.title || ''));
    if (!core || core.length < 3) return { imported: 0, total: 0, error: 'title too short' };
    const q = '"' + core.slice(0, 90) + '"';
    const home =
      typeof buildSearchUrl === 'function'
        ? buildSearchUrl(location.origin, q)
        : location.origin + '/?f_search=' + encodeURIComponent(q);
    let html = '';
    try {
      html = await fetchTrackingPageHtml(home);
    } catch (e) {
      return { imported: 0, total: 0, error: (e && e.message) || String(e) };
    }
    const items = parseGalleryListFromHtml(html, home);
    const minSim = Number(opts.minSim);
    const thr = Number.isFinite(minSim) ? minSim : 0.7;
    const limit = Math.min(20, Math.max(4, Math.floor(Number(opts.limit) || 12)));
    // 先筛相似，再 gdata 补全体积/时间/码级
    const picked = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.gid || String(it.gid) === String(edition.gid)) continue;
      const sim = titleSimilarity(
        edition.title_raw || edition.title_core || '',
        it.title_raw || it.title || ''
      );
      if (sim < thr) continue;
      picked.push(Object.assign({}, it, { _sim: sim }));
      if (picked.length >= limit) break;
    }
    let gmap = Object.create(null);
    try {
      gmap = await fetchGalleryGdataBatch(
        picked.map((x) => ({ gid: x.gid, token: x.token }))
      );
    } catch (e) {
      console.warn('[ExC] related gdata', e);
    }
    let imported = 0;
    for (let i = 0; i < picked.length; i++) {
      const it = picked[i];
      try {
        const gm = gmap[String(it.gid)] || null;
        const title = (gm && gm.title_raw) || it.title_raw || it.title || '';
        const partial = {
          gid: it.gid,
          token: it.token || (gm && gm.token) || '',
          title_raw: title,
          thumb: it.thumb || it.cover || '',
          posted_at: (gm && gm.posted_at) || it.posted_at || 0,
          pages: (gm && gm.pages) || it.pages || 0,
          size_bytes: (gm && gm.size_bytes) || it.size_bytes || 0,
          size_text: it.size_text || '',
          language:
            (gm && gm.language) ||
            it.language ||
            detectLanguageFromText(title, (gm && gm.tags) || []),
          censor_tier:
            (gm && gm.censor_tier) ||
            it.censor_tier ||
            detectCensorTier(title, (gm && gm.tags) || []),
          group: (gm && gm.group) || it.group || extractGroupFromTitle(title) || '',
          tags: (gm && gm.tags) || [],
          uploader: (gm && gm.uploader) || '',
          url: it.url || '',
        };
        const id = makeEditionId(String(it.gid), String(partial.token || ''));
        const prev = await idbGet(STORE_EDITIONS, id);
        const rec = normalizeEditionRecord(partial);
        // 合并时：新 gdata 有值优先；避免用空覆盖已有
        const merged = Object.assign({}, prev || {}, rec, {
          id: id,
          work_id: workId,
          updated_at: nowMs(),
        });
        if (prev) {
          if (!(Number(merged.posted_at) > 0) && Number(prev.posted_at) > 0) {
            merged.posted_at = prev.posted_at;
          }
          if (!(Number(merged.size_bytes) > 0) && Number(prev.size_bytes) > 0) {
            merged.size_bytes = prev.size_bytes;
          }
          if (!(Number(merged.pages) > 0) && Number(prev.pages) > 0) {
            merged.pages = prev.pages;
          }
          if (
            (!merged.censor_tier || merged.censor_tier === 'unknown') &&
            prev.censor_tier &&
            prev.censor_tier !== 'unknown'
          ) {
            merged.censor_tier = prev.censor_tier;
          }
        }
        if (!merged.created_at) merged.created_at = nowMs();
        await idbPut(STORE_EDITIONS, merged);
        imported++;
      } catch (err) {
        console.warn('[ExC] import related', it && it.gid, err);
      }
    }
    try {
      await touchWorkFromEdition(Object.assign({}, edition, { work_id: workId }));
    } catch (_) { /* ignore */ }
    return { imported: imported, total: picked.length };
  }

  /** 当前文档列表 gid 顺序（与角标增强同源选择器） */
  function extractOrderedGidsFromDocument(doc) {
    doc = doc || document;
    const out = [];
    const seen = new Set();
    try {
      if (typeof queryListItems === 'function') {
        (queryListItems() || []).forEach((el) => {
          const card = typeof parseListCard === 'function' ? parseListCard(el) : null;
          const g = card && card.gid ? String(card.gid) : '';
          if (!g || seen.has(g)) return;
          seen.add(g);
          out.push(g);
        });
      }
    } catch (_) { /* ignore */ }
    if (out.length) return out;
    try {
      const links = doc.querySelectorAll(
        '#ido a[href*="/g/"], table.itg a[href*="/g/"], .itg a[href*="/g/"], a[href*="/g/"]'
      );
      links.forEach((a) => {
        const href = a.getAttribute('href') || a.href || '';
        const gt = typeof parseGalleryUrl === 'function' ? parseGalleryUrl(href) : null;
        const g = gt && gt.gid ? String(gt.gid) : '';
        if (!g || seen.has(g)) return;
        seen.add(g);
        out.push(g);
      });
    } catch (_) { /* ignore */ }
    return out;
  }

  /** 相对锚点估算未读条数：found=锚点在本页，count=其前条数 */
  function estimateUnreadFromGids(gids, anchorGid) {
    const list = Array.isArray(gids) ? gids.map(String) : [];
    const anchor = compactText(anchorGid || '');
    if (!list.length || !anchor) return { found: false, count: 0, pageLen: list.length };
    const idx = list.indexOf(anchor);
    if (idx < 0) return { found: false, count: 0, pageLen: list.length };
    return { found: true, count: idx, pageLen: list.length };
  }

  /**
   * 从列表 HTML 取「下一页」URL。
   * 优先分页表 > / » 链（常带 next=gid）；其次任意 next=；再否则 null（由调用方用 page=/next= 拼）。
   */
  function extractListNextPageUrl(html, baseUrl) {
    baseUrl = baseUrl || (typeof location !== 'undefined' ? location.href : '');
    const s = String(html || '');
    try {
      if (typeof DOMParser !== 'undefined') {
        const doc = new DOMParser().parseFromString(s, 'text/html');
        const roots = doc.querySelectorAll('table.ptt, table.ptb, .ptt, .ptb');
        const prefer = [];
        const collect = (root) => {
          if (!root) return;
          root.querySelectorAll('a[href]').forEach((a) => {
            const t = compactText(a.textContent || '');
            const href = a.getAttribute('href') || '';
            if (!href || href === '#' || /^javascript:/i.test(href)) return;
            let abs = '';
            try {
              abs = new URL(href, baseUrl).href;
            } catch (_) {
              return;
            }
            // 只认明确「下一页」：> » ›，或 href 带 next=
            // （不要取最大 page=，会直接跳到末页）
            const isFwd = /^[>›»]+$/.test(t) || /[?&]next=\d+/i.test(href);
            if (isFwd) prefer.push(abs);
          });
        };
        for (let i = 0; i < roots.length; i++) collect(roots[i]);
        if (!prefer.length) collect(doc);
        for (let i = 0; i < prefer.length; i++) {
          if (/[?&]next=\d+/i.test(prefer[i])) return prefer[i];
        }
        if (prefer.length) return prefer[0];
      }
    } catch (_) { /* regex */ }
    let m = s.match(/href=["']([^"']*[?&]next=\d+[^"']*)["']/i);
    if (m) {
      try {
        return new URL(m[1].replace(/&amp;/g, '&'), baseUrl).href;
      } catch (_) { /* ignore */ }
    }
    m = s.match(/href=["']([^"']*)["'][^>]*>\s*(?:&gt;|>|›|»)\s*</i);
    if (m) {
      try {
        return new URL(m[1].replace(/&amp;/g, '&'), baseUrl).href;
      } catch (_) { /* ignore */ }
    }
    return '';
  }

  /** 用本页最后一条 gid 拼 next= 游标 URL（EH 翻页主路径） */
  function buildListUrlWithNextGid(homeUrl, lastGid) {
    const g = compactText(lastGid || '');
    if (!g) return '';
    try {
      const u = new URL(canonicalizeTrackingOpenUrl(homeUrl), location.origin);
      u.searchParams.delete('page');
      u.searchParams.delete('prev');
      u.searchParams.delete('seek');
      u.searchParams.delete('jump');
      u.searchParams.set('next', g);
      return u.href;
    } catch (_) {
      return '';
    }
  }

  function pickTrackingPageScanDelayMs() {
    // 同条内跨页：尽量短，主要靠条目之间的 5～10s 防限流
    const lo = 280;
    const hi = 550;
    return Math.round(lo + Math.random() * (hi - lo));
  }

  /**
   * 断点不在首页时的快速未读估算（不额外请求）。
   * - 断点在首页 → 精确 count
   * - 有可信 breakpoint_page(>0) → page×页长（下限，capped）
   * - 否则保留已有估数（绝不因为「未知」就压成一页）
   */
  function estimateUnreadWithoutDeepScan(rec, homeGids, top) {
    const bp = compactText((rec && rec.breakpoint_gid) || '');
    const topS = compactText(top || '');
    const pageLen = Array.isArray(homeGids) ? homeGids.length : 0;
    const pageSize = pageLen >= 20 ? pageLen : pageLen > 0 ? pageLen : 25;
    if (!bp) return { count: 0, capped: 0, has_update: 0, source: 'none' };

    if (topS && bp === topS) {
      return { count: 0, capped: 0, has_update: 0, source: 'home_caught_up' };
    }

    const onHome = estimateUnreadFromGids(homeGids, bp);
    if (onHome.found) {
      return {
        count: onHome.count,
        capped: 0,
        has_update: onHome.count > 0 ? 1 : 0,
        source: 'home_exact',
      };
    }

    // 不在首页：不得用「当页序号」；只用断点页码或保留旧值
    const bpPage = Number(rec.breakpoint_page);
    const prev = Math.max(0, Math.floor(Number(rec.unread_estimate) || 0));
    const prevSource = compactText(rec.unread_estimate_source || '');
    // 曾被深页局部回写污染的小值不可信（无 source 或 source=partial）
    const prevTrusted =
      prev > 0 &&
      prevSource !== 'partial' &&
      prevSource !== 'deep_page_local' &&
      (prevSource === 'home_exact' ||
        prevSource === 'page_formula' ||
        prevSource === 'deep_scan' ||
        prevSource === 'set_bp' ||
        prev >= pageSize);

    if (Number.isFinite(bpPage) && bpPage > 0) {
      const floor = bpPage * pageSize;
      // 取「页码公式」与可信旧值的较大者，避免检查更新把更好的估数打小
      const count = Math.max(floor, prevTrusted ? prev : 0, 1);
      return { count: count, capped: 1, has_update: 1, source: 'page_formula' };
    }

    if (prevTrusted) {
      return { count: prev, capped: 1, has_update: 1, source: prevSource || 'keep' };
    }
    // 完全未知：只标「有更新」，不写假的 +23
    return { count: 0, capped: 1, has_update: 1, source: 'unknown_deep' };
  }

  /**
   * 从首页向后扫，统计断点前未读条数（支持 page= 与 next= 游标）。
   * @returns {{ found:boolean, count:number, capped:boolean, pagesScanned:number, topGal:object|null, firstGids:string[], lastError:string }}
   */
  async function scanTrackingUnreadAcrossPages(homeUrl, anchorGid, opts) {
    opts = opts || {};
    const anchor = compactText(anchorGid || '');
    const maxPages = Math.min(
      40,
      Math.max(1, Math.floor(Number(opts.maxPages) || Number(config.tracking_unread_scan_max_pages) || 12))
    );
    const home = buildListUrlWithPage(canonicalizeTrackingOpenUrl(homeUrl), 0);
    const result = {
      found: false,
      count: 0,
      capped: 0,
      pagesScanned: 0,
      topGal: null,
      firstGids: [],
      lastError: '',
    };
    if (!anchor) return result;

    let url = home;
    let totalBefore = 0;
    const seen = new Set();
    let pages = 0;
    // 调用方已拉过首页时可注入，避免重复请求
    let seedHtml = opts.seedHtml ? String(opts.seedHtml) : '';
    let seedUrl = opts.seedUrl || home;

    while (pages < maxPages) {
      if (!url || seen.has(url)) break;
      seen.add(url);
      let html = '';
      if (seedHtml && pages === 0) {
        html = seedHtml;
        url = seedUrl || home;
        seedHtml = '';
      } else {
        if (pages > 0) {
          await sleepMs(
            typeof opts.delayMs === 'number' ? opts.delayMs : pickTrackingPageScanDelayMs()
          );
        }
        try {
          html = await fetchTrackingPageHtml(url);
        } catch (err) {
          result.lastError = (err && err.message) || String(err || 'fetch fail');
          break;
        }
      }
      const gids = extractOrderedGidsFromListHtml(html);
      if (pages === 0) {
        result.topGal = extractTopGalleryFromListHtml(html, url);
        result.firstGids = gids.slice();
      }
      pages += 1;
      result.pagesScanned = pages;

      if (!gids.length) break;

      const est = estimateUnreadFromGids(gids, anchor);
      if (est.found) {
        result.found = true;
        result.count = totalBefore + est.count;
        result.capped = 0;
        break;
      }
      totalBefore += gids.length;

      // 下一页：HTML 链 → next=末 gid → page=N
      let nextUrl = extractListNextPageUrl(html, url);
      if (!nextUrl) {
        nextUrl = buildListUrlWithNextGid(home, gids[gids.length - 1]);
      }
      if (!nextUrl) {
        nextUrl = buildListUrlWithPage(home, pages); // pages 已是下一页的 0 起下标
      }
      if (!nextUrl || nextUrl === url || seen.has(nextUrl)) break;
      // 避免 next 指回首页死循环
      try {
        const a = new URL(nextUrl);
        const b = new URL(home);
        if (a.pathname === b.pathname && a.search === b.search) break;
      } catch (_) { /* ignore */ }
      url = nextUrl;
    }

    if (!result.found) {
      result.count = totalBefore;
      result.capped = 1;
    }
    return result;
  }

  /** 是否仍有待追更新（has_update 或 顶≠断点） */
  function trackingHasPendingUpdate(r) {
    if (!r) return false;
    if (r.has_update) return true;
    const top = compactText(r.top_gid || '');
    const bp = compactText(r.breakpoint_gid || '');
    return !!(top && bp && top !== bp);
  }

  /**
   * 当前列表是否像「真·首页」：有 top 时，首页第一条必须是 top。
   * URL/DOM 会误报第 1 页；这条能挡住 next= 深页被当成首页。
   * @returns {boolean|null} true/false；无法判断时 null
   */
  function listPageLooksLikeHome(gids, topGid) {
    const top = compactText(topGid || '');
    if (!top || !Array.isArray(gids) || !gids.length) return null;
    return String(gids[0]) === top;
  }

  /** 未读数字是否可信（过滤当页序号污染、假 +25） */
  function isTrackingUnreadTrusted(r) {
    if (!r) return false;
    const n = Math.max(0, Math.floor(Number(r.unread_estimate) || 0));
    if (!(n > 0)) return false;
    const src = compactText(r.unread_estimate_source || '');
    if (src === 'partial' || src === 'deep_page_local') return false;
    const bpPage = Number(r.breakpoint_page);
    if (
      Number.isFinite(bpPage) &&
      bpPage > 0 &&
      n < 20 &&
      (src === 'home_exact' || src === 'set_bp_home' || !src)
    ) {
      return false;
    }
    // 典型假数：刚好 25 且不是跨页扫描结果
    if (n === 25 && src !== 'deep_scan' && src !== 'home_exact' && !(bpPage > 1)) {
      return false;
    }
    if (src === 'deep_scan' || src === 'home_exact' || src === 'set_bp_home') return true;
    if (src === 'page_formula' && (bpPage > 0 || n > 25)) return true;
    if (src === 'home_not_found' || src === 'home_new_top') return n > 25;
    return !!src && n > 25;
  }

  function getTrackingUnreadEstimate(r) {
    if (!isTrackingUnreadTrusted(r)) return 0;
    return Math.max(0, Math.floor(Number(r && r.unread_estimate) || 0));
  }

  /** 卡片 leaf：优先 +N / +N+，没有可信数字才「更新」 */
  function getTrackingUpdatePillText(r) {
    if (!trackingHasPendingUpdate(r)) return '';
    const n = getTrackingUnreadEstimate(r);
    if (n > 0) {
      return r && r.unread_estimate_capped ? '+' + n + '+' : '+' + n;
    }
    return '更新';
  }

  function sleepMs(ms) {
    return new Promise((r) => setTimeout(r, Math.max(0, ms || 0)));
  }

  function pickTrackingCheckDelayMs() {
    const lo = Math.max(2000, Number(config.tracking_check_interval_min_ms) || 5000);
    const hi = Math.max(lo, Number(config.tracking_check_interval_max_ms) || 10000);
    return Math.round(lo + Math.random() * (hi - lo));
  }

  async function fetchTrackingPageHtml(url) {
    const res = await gmRequest({
      method: 'GET',
      url: url,
      timeout: 25000,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Cache-Control': 'no-cache',
      },
    });
    const status = res && res.status;
    if (status === 429) throw new Error('HTTP 429 限流');
    if (status < 200 || status >= 400) throw new Error('HTTP ' + status);
    const text = (res && res.responseText) || '';
    if (/Sad Panda/i.test(text) && !/\/g\/\d+\//i.test(text)) throw new Error('Sad Panda / 无法访问');
    if (/Your IP address has been temporarily banned/i.test(text)) throw new Error('IP 暂时封禁');
    if (/too many requests|rate.?limit/i.test(text) && !/\/g\/\d+\//i.test(text)) throw new Error('站点限流');
    return text;
  }

  /**
   * 根据列表 gid 序写回 unread_estimate / has_update。
   *
   * 只有「绝对上下文」才能写总量：真·首页 / 已知 page=N。
   * 游标深页（next=）禁止把「当页第 23 条」写成未读 +23。
   *
   * @param {{ previousTop?: string, pageIndex?: number, isFirst?: boolean, deepUnknown?: boolean, mode?: string }} [opts]
   *   mode: 'absolute' | 'browse'
   */
  function applyTrackingUnreadFromGids(rec, gids, top, opts) {
    if (!rec) return rec;
    opts = opts || {};
    const bp = compactText(rec.breakpoint_gid || '');
    const prevTop = compactText(opts.previousTop || rec.prev_top_gid || '');
    const topS = compactText(top || '');
    const pageLen = Array.isArray(gids) ? gids.length : 0;
    const rawIdx = Number(opts.pageIndex);
    // 首条 ≠ top：绝不是结果集首页（挡住 URL/DOM 误报第 1 页）
    const homeLook = listPageLooksLikeHome(gids, topS);
    let deepUnknown =
      opts.deepUnknown === true ||
      (Number.isFinite(rawIdx) && rawIdx < 0) ||
      (opts.isFirst === false && !(Number.isFinite(rawIdx) && rawIdx >= 0));
    if (homeLook === false) {
      deepUnknown = deepUnknown || !(Number.isFinite(rawIdx) && rawIdx > 0);
    }
    const pageIndex = deepUnknown
      ? -1
      : Math.max(0, Math.floor(Number.isFinite(rawIdx) ? rawIdx : 0));
    let isFirst =
      opts.isFirst === true ||
      (opts.isFirst !== false && pageIndex === 0 && !deepUnknown);
    if (homeLook === false) isFirst = false;
    // 仅真·首页才允许 absolute 写「当页序号=总量」
    const mode =
      opts.mode === 'browse'
        ? 'browse'
        : isFirst && homeLook !== false
          ? 'absolute'
          : deepUnknown || !isFirst
            ? 'browse'
            : opts.mode || 'absolute';
    const pageSize =
      pageIndex > 0
        ? Math.max(pageLen >= 20 ? pageLen : 25, 1)
        : pageLen > 0
          ? pageLen
          : 25;
    const pageOffset = pageIndex > 0 ? pageIndex * pageSize : 0;
    const prevEst = Math.max(0, Math.floor(Number(rec.unread_estimate) || 0));

    if (isFirst && topS && bp && topS === bp) {
      rec.has_update = 0;
      rec.unread_estimate = 0;
      rec.unread_estimate_capped = 0;
      rec.unread_estimate_source = 'home_caught_up';
      return rec;
    }

    const anchor = bp || (prevTop && prevTop !== topS ? prevTop : '');
    if (!anchor) {
      if (prevTop && topS && prevTop !== topS) {
        rec.has_update = 1;
        if (!(prevEst > 0) && pageLen > 0 && isFirst) {
          rec.unread_estimate = pageLen;
          rec.unread_estimate_capped = 1;
          rec.unread_estimate_source = 'home_new_top';
        }
      }
      return rec;
    }

    const est = estimateUnreadFromGids(gids, anchor);

    // 浏览/游标深页：禁止当页局部覆盖总量
    if (mode === 'browse' || (deepUnknown && !isFirst)) {
      if (bp && topS && bp !== topS) rec.has_update = 1;
      if (est.found && pageIndex > 0) {
        const total = pageOffset + est.count;
        if (total > prevEst) {
          rec.unread_estimate = total;
          rec.unread_estimate_capped = 1;
          rec.unread_estimate_source = 'page_formula';
        }
        if (total > 0) rec.has_update = 1;
      } else if (!est.found && pageIndex > 0) {
        const floor = pageOffset + (pageLen > 0 ? pageLen : 1);
        if (floor > prevEst) {
          rec.unread_estimate = floor;
          rec.unread_estimate_capped = 1;
          rec.unread_estimate_source = 'page_formula';
        }
        rec.has_update = 1;
      }
      // deepUnknown + found：故意不写 unread（避免 +23）
      return rec;
    }

    // 绝对上下文：首页或已知 page=N
    if (est.found) {
      const total = pageOffset + est.count;
      rec.unread_estimate = total;
      rec.unread_estimate_capped = pageIndex > 0 ? 1 : 0;
      rec.unread_estimate_source = pageIndex > 0 ? 'page_formula' : 'home_exact';
      if (total > 0) rec.has_update = 1;
      else if (isFirst && topS && bp && topS === bp) rec.has_update = 0;
      else if (!isFirst && total === 0 && bp) {
        rec.has_update = 1;
        const floor = pageOffset > 0 ? pageOffset : 1;
        rec.unread_estimate = Math.max(prevEst, floor);
        rec.unread_estimate_capped = 1;
        rec.unread_estimate_source = 'page_formula';
      }
    } else if (bp || (prevTop && topS && prevTop !== topS)) {
      rec.has_update = 1;
      if (isFirst) {
        const floor = pageLen > 0 ? pageLen : 1;
        rec.unread_estimate = Math.max(prevEst, floor);
        rec.unread_estimate_capped = 1;
        rec.unread_estimate_source = 'home_not_found';
      } else if (pageIndex > 0) {
        const floor = pageOffset + (pageLen > 0 ? pageLen : 1);
        rec.unread_estimate = Math.max(prevEst, floor);
        rec.unread_estimate_capped = 1;
        rec.unread_estimate_source = 'page_formula';
      }
    }
    return rec;
  }

  /**
   * 主动检查单条追更。
   * @param {object} rec
   * @param {{ deepScan?: boolean }} [opts]
   *   deepScan：true 时跨页精确数未读（慢）；默认跟 config.tracking_unread_deep_scan
   */
  async function refreshSingleTrackingRecord(rec, opts) {
    if (!rec) throw new Error('无记录');
    opts = opts || {};
    const raw = rec.open_url || rec.page_url;
    if (!raw) throw new Error('无 URL');
    const home = buildListUrlWithPage(canonicalizeTrackingOpenUrl(raw), 0);
    // 顺手纠正历史脏 open_url（带深页 page/next）
    if (rec.open_url && rec.open_url !== home) {
      rec.open_url = home;
      rec.page_url = home;
    }
    const previousTop = compactText(rec.top_gid || '');
    const bp = compactText(rec.breakpoint_gid || '');
    // 断点不在首页时默认跨页扫；否则只会得到假 +25。opts.deepScan===false 才强制快路径
    const allowDeep = opts.deepScan !== false;
    rec.last_check_at = nowMs();
    rec.last_check_error = '';

    let topGal = null;
    let gids = [];
    let top = '';
    let scan = null;
    let usedDeep = false;

    // 始终先拉首页
    const homeHtml = await fetchTrackingPageHtml(home);
    topGal = extractTopGalleryFromListHtml(homeHtml, home);
    gids = extractOrderedGidsFromListHtml(homeHtml);
    top = topGal && topGal.gid ? String(topGal.gid) : gids[0] || '';

    if (bp && top) {
      const onHome = estimateUnreadFromGids(gids, bp);
      if (onHome.found) {
        scan = {
          found: true,
          count: onHome.count,
          capped: 0,
          pagesScanned: 1,
          topGal: topGal,
          firstGids: gids,
          lastError: '',
        };
      } else if (allowDeep) {
        // 不在首页 → 跨页精确数（这才是真 +N，不是一页 25）
        usedDeep = true;
        scan = await scanTrackingUnreadAcrossPages(home, bp, {
          maxPages: Math.min(
            40,
            Math.max(8, Math.floor(Number(config.tracking_unread_scan_max_pages) || 20))
          ),
          seedHtml: homeHtml,
          seedUrl: home,
        });
        if (scan.topGal) topGal = scan.topGal;
        if (scan.firstGids && scan.firstGids.length) gids = scan.firstGids;
        top = topGal && topGal.gid ? String(topGal.gid) : gids[0] || top;
        if (scan.lastError && !top) rec.last_check_error = scan.lastError;
        if (scan.found && scan.pagesScanned > 0) {
          rec.breakpoint_page = Math.max(0, scan.pagesScanned - 1);
          rec.breakpoint_page_known = 1;
          rec.breakpoint_page_mode = 'scan';
        }
      } else {
        const fast = estimateUnreadWithoutDeepScan(rec, gids, top);
        // 丢弃假一页 25：page_formula 且仅一页且无可信 bp 页码
        let count = fast.count;
        if (
          fast.source === 'page_formula' &&
          count > 0 &&
          count <= (gids.length || 25) &&
          !(Number(rec.breakpoint_page) > 0)
        ) {
          count = 0;
        }
        scan = {
          found: fast.source === 'home_exact',
          count: count,
          capped: fast.capped,
          pagesScanned: 1,
          topGal: topGal,
          firstGids: gids,
          lastError: '',
          fastEstimate: fast.source !== 'home_exact',
          source: fast.source || '',
        };
      }
    }

    if (top) {
      if (previousTop && previousTop !== top) {
        rec.has_update = 1;
        rec.prev_top_gid = previousTop;
      }
      if (bp && bp !== top) {
        rec.has_update = 1;
      }
      rec.top_gid = top;
      if (topGal && topGal.token) rec.top_token = compactText(topGal.token);
      if (topGal && topGal.title) rec.top_title = String(topGal.title).slice(0, 160);
      if (topGal && topGal.cover) applyTrackingCoverFields(rec, topGal.cover);
      // 列表已有 posted 则不再打 gdata，省一次请求
      let posted = (topGal && Number(topGal.posted_at)) || 0;
      if (!posted && !(Number(rec.top_posted_at) > 0)) {
        posted = await resolveGalleryPostedMs(top, (topGal && topGal.token) || rec.top_token || '', null);
      } else if (!posted) {
        posted = Number(rec.top_posted_at) || 0;
      }
      if (posted) rec.top_posted_at = posted;

      if (bp && scan) {
        if (scan.found) {
          rec.unread_estimate = Math.max(0, Number(scan.count) || 0);
          rec.unread_estimate_capped = 0;
          rec.unread_estimate_source = usedDeep ? 'deep_scan' : 'home_exact';
          if (rec.unread_estimate > 0) rec.has_update = 1;
          else if (top === bp) {
            rec.has_update = 0;
            rec.unread_estimate = 0;
            rec.unread_estimate_source = 'home_caught_up';
          }
        } else if (scan.fastEstimate) {
          const n = Math.max(0, Number(scan.count) || 0);
          // unknown_deep 且 count=0：只标有更新，显示「更新」而非假 +N
          if (n > 0) {
            rec.unread_estimate = n;
            rec.unread_estimate_capped = scan.capped ? 1 : 0;
            rec.has_update = 1;
          } else {
            rec.has_update = 1;
            // 保留可信旧值；清掉 partial 污染
            const src = compactText(rec.unread_estimate_source || '');
            if (src === 'partial' || src === 'deep_page_local') {
              rec.unread_estimate = 0;
              rec.unread_estimate_capped = 1;
            }
            rec.unread_estimate_capped = 1;
          }
          rec.unread_estimate_source = scan.source || 'page_formula';
        } else {
          // 深度扫满仍未见断点
          rec.has_update = 1;
          rec.unread_estimate = Math.max(
            Number(rec.unread_estimate) || 0,
            Number(scan.count) || 0,
            gids.length || 0
          );
          rec.unread_estimate_capped = 1;
          rec.unread_estimate_source = 'deep_scan';
          if (scan.lastError) {
            rec.last_check_error =
              (rec.last_check_error ? rec.last_check_error + '；' : '') + scan.lastError;
          } else if (scan.pagesScanned > 0) {
            rec.last_check_error =
              '断点未在前 ' + scan.pagesScanned + ' 页内找到（未读≥' + rec.unread_estimate + '）';
          }
        }
        rec.unread_scan_pages = scan.pagesScanned || 0;
        rec.unread_deep_scan = usedDeep ? 1 : 0;
      } else {
        applyTrackingUnreadFromGids(rec, gids, top, {
          previousTop: previousTop,
          pageIndex: 0,
          isFirst: true,
          mode: 'absolute',
        });
      }
    } else if (!rec.last_check_error) {
      rec.last_check_error = '未解析到列表顶画廊';
    }
    await saveTrackingRecord(rec);
    return rec;
  }

  function detectAccessIssue() {
    const title = compactText(document.title).toLowerCase();
    const bodyText = compactText((document.body && document.body.innerText) || '').slice(0, 2000).toLowerCase();
    if (/sad panda|1007/i.test(title) || /sad panda/i.test(bodyText)) {
      return { type: 'sad_panda', message: 'Sad Panda：当前账号/Cookie 无法访问 ExHentai。请在浏览器登录后刷新。' };
    }
    if (/cloudflare|just a moment|attention required|checking your browser/i.test(title + bodyText)) {
      return { type: 'challenge', message: '站点正在做人机验证，通过后刷新页面即可。' };
    }
    if (/429|too many requests/i.test(bodyText) || /rate.?limit/i.test(bodyText)) {
      return { type: 'rate_limit', message: '请求过于频繁（限流）。请稍后再试，并降低自动同步频率。' };
    }
    if (!document.querySelector('a[href*="/g/"]') && /error|禁止|denied|login/i.test(bodyText) && bodyText.length < 800) {
      return { type: 'empty_or_error', message: '页面无画廊列表，可能是登录态失效或页面异常。' };
    }
    return null;
  }

  function parsePostedToMs(text) {
    const s = normalizePostedText(text);
    if (!s) return 0;
    // unix 秒（gdata / 偶发属性）
    if (/^\d{10}$/.test(s)) {
      const sec = Number(s);
      return sec > 1e9 ? sec * 1000 : 0;
    }
    if (/^\d{13}$/.test(s)) {
      const ms = Number(s);
      return ms > 1e12 ? ms : 0;
    }
    // EH 标准：2025-03-18 14:20
    let m = s.match(/(20\d{2})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) {
      const d = new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4] || 0),
        Number(m[5] || 0),
        Number(m[6] || 0)
      );
      const t = d.getTime();
      return Number.isFinite(t) && t > 0 ? t : 0;
    }
    m = s.match(/(20\d{2})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (m) {
      const d = new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4] || 0),
        Number(m[5] || 0)
      );
      const t = d.getTime();
      return Number.isFinite(t) && t > 0 ? t : 0;
    }
    // 从混杂 HTML 里抠日期
    m = s.match(/(20\d{2}-\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{2})?)/);
    if (m) return parsePostedToMs(m[1]);
    const t = Date.parse(s.replace(/-/g, '/'));
    return Number.isFinite(t) && t > 0 ? t : 0;
  }

  function parseListCard(root) {
    if (!root || root.nodeType !== 1) return null;
    const link =
      root.querySelector('a[href*="/g/"]') ||
      (root.matches && root.matches('a[href*="/g/"]') ? root : null);
    if (!link) return null;
    const href = link.href || link.getAttribute('href') || '';
    const gt = parseGalleryUrl(href);
    if (!gt) return null;

    let title = '';
    const nameEl =
      root.querySelector('.glink') ||
      root.querySelector('.glname a') ||
      root.querySelector('.glname') ||
      link.querySelector('.glink') ||
      link;
    title = compactText(nameEl && (nameEl.getAttribute('title') || nameEl.textContent));

    let category = '';
    const catEl = root.querySelector('.cn, .cs, .glcat');
    if (catEl) category = compactText(catEl.textContent);

    const thumb = extractListItemCoverUrl(root);

    const posted_at = extractListItemPostedAt(root, gt.gid);

    const tags = [];
    const pushTag = (t) => {
      const s = compactText(t);
      if (!s || s.length > 80) return;
      const low = s.toLowerCase();
      if (tags.some((x) => String(x).toLowerCase() === low)) return;
      tags.push(s);
    };
    // 扩展模式：.gt 的 title 常是 namespace:name
    root.querySelectorAll('.gt, .gtl, .gtw, .gtw, [title*=":"]').forEach((el) => {
      pushTag(el.getAttribute('title') || el.textContent);
    });
    // 标题里 [group] (artist) 补成伪标签（取所有括号，跳过语言标记）
    const group = extractGroupFromTitle(title);
    if (group) pushTag('group:' + group);
    const skipParen =
      /^(chinese|english|japanese|korean|digital|dl版|中国翻訳|中國翻譯|complete|ongoing|decensored|uncensored|\d{2,4})$/i;
    String(title || '').replace(/\[([^\]]+)\]|\(([^)]+)\)|【([^】]+)】/g, (_, a, b, c) => {
      const raw = compactText(a || b || c || '');
      if (!raw || raw.length < 2 || raw.length > 48 || skipParen.test(raw)) return '';
      // 方括号更常是组；圆括号更常是画师；都挂上以便熟人匹配
      if (a || c) pushTag('group:' + raw);
      if (b) pushTag('artist:' + raw);
      // 嵌套 [Group (Artist)] 
      const nested = raw.match(/\(([^)]+)\)/);
      if (nested) {
        const an = compactText(nested[1]);
        if (an && an.length >= 2 && !skipParen.test(an)) pushTag('artist:' + an);
      }
      return '';
    });

    // thumbnail mode sometimes has size in popup / title
    let size_text = '';
    const ir = root.querySelector('.ir, .glthumb div div');
    if (ir && /[0-9.]+\s*[KMG]i?B/i.test(ir.textContent || '')) {
      size_text = compactText(ir.textContent);
    }

    return normalizeEditionRecord({
      gid: gt.gid,
      token: gt.token,
      title_raw: title,
      category,
      thumb,
      posted_at,
      tags,
      size_text,
      group: group || '',
      url: href.split('?')[0],
    });
  }

  function queryListItems() {
    const selectors = [
      'table.itg > tbody > tr',
      'table.itg tr',
      'div.gl1t',
      'div.gl2t',
      'div.gl3t',
      '.gl1e',
      '.gl2e',
      '#gdt .gdtm',
      '#gdt .gdtl',
    ];
    const seen = new Set();
    const items = [];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        if (seen.has(el)) return;
        // skip header row
        if (el.querySelector && el.querySelector('th')) return;
        if (!el.querySelector('a[href*="/g/"]')) return;
        seen.add(el);
        items.push(el);
      });
      if (items.length) break;
    }
    if (!items.length) {
      document.querySelectorAll('a[href*="/g/"]').forEach((a) => {
        const row = a.closest('tr, .gl1t, .gl2t, .gl3t, .gl1e, .gl2e, li, div') || a.parentElement;
        if (row && !seen.has(row) && row.querySelectorAll) {
          // avoid grabbing entire body
          if (row === document.body || row.id === 'gdt') return;
          seen.add(row);
          items.push(row);
        }
      });
    }
    return items;
  }

  function parseGalleryTags() {
    const tags = [];
    const seen = new Set();
    const push = (raw) => {
      let tag = compactText(raw || '');
      if (!tag || /^show all/i.test(tag)) return;
      // 统一 namespace 小写
      const colon = tag.indexOf(':');
      if (colon > 0) {
        tag = tag.slice(0, colon).toLowerCase() + ':' + tag.slice(colon + 1).trim();
      }
      const key = tag.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      tags.push(tag);
    };
    // 1) 标准 #taglist 链接 / ta_ id
    document.querySelectorAll('#taglist a, #taglist span[id^="ta_"], #taglist div[id^="td_"]').forEach((el) => {
      let tag = '';
      const href = el.getAttribute('href') || '';
      const m = href.match(/\/tag\/([^/?#]+)/i);
      if (m) {
        try {
          tag = decodeURIComponent(m[1].replace(/\+/g, ' '));
        } catch (_) {
          tag = m[1];
        }
      }
      if (!tag) {
        const id = el.getAttribute('id') || '';
        // ta_artist:emori_uki / td_artist:emori_uki
        if (/^t[ad]_/i.test(id)) {
          try {
            tag = decodeURIComponent(id.slice(3).replace(/_/g, ' '));
          } catch (_) {
            tag = id.slice(3).replace(/_/g, ' ');
          }
        }
      }
      // 显示名兜底 + 从父行猜 namespace
      if (!tag) tag = compactText(el.getAttribute('title') || el.textContent);
      if (tag && tag.indexOf(':') < 0) {
        const row = el.closest('tr');
        const th = row && row.querySelector('td.tc, .tc');
        if (th) {
          let ns = compactText(th.textContent).toLowerCase().replace(/:$/, '');
          if (ns) tag = ns + ':' + tag;
        }
      }
      push(tag);
    });
    // 2) 无 #taglist 时的松散结构
    if (!tags.length) {
      document.querySelectorAll('#gd4 a[href*="/tag/"], .gt a[href*="/tag/"]').forEach((el) => {
        const href = el.getAttribute('href') || '';
        const m = href.match(/\/tag\/([^/?#]+)/i);
        if (m) {
          try {
            push(decodeURIComponent(m[1].replace(/\+/g, ' ')));
          } catch (_) {
            push(m[1]);
          }
        }
      });
    }
    return tags;
  }

  function parseGalleryPage() {
    const gt = parseGalleryUrl(location.href);
    if (!gt) return null;

    let title = '';
    const h1 = document.getElementById('gn');
    const h2 = document.getElementById('gj');
    title = compactText((h1 && h1.textContent) || '') || compactText((h2 && h2.textContent) || '');
    if (!title) title = compactText(document.title).replace(/\s*-\s*E-?Hentai.*$/i, '');

    const tags = parseGalleryTags();

    let category = '';
    const cat = document.querySelector('#gdc .cs, #gdc .cn, .cs');
    if (cat) category = compactText(cat.textContent);

    let uploader = '';
    const up = document.querySelector('#gdn a');
    if (up) uploader = compactText(up.textContent);

    let pages = 0;
    let size_text = '';
    let posted_at = 0;
    document.querySelectorAll('#gdd tr').forEach((tr) => {
      const cells = tr.querySelectorAll('td');
      if (cells.length < 2) return;
      const k = compactText(cells[0].textContent).toLowerCase();
      const v = compactText(cells[1].textContent);
      if (/length|页|頁|language/.test(k) && /(\d+)\s*page/i.test(v)) {
        const m = v.match(/(\d+)\s*page/i);
        if (m) pages = parseInt(m[1], 10);
      } else if (/length|页|頁/.test(k)) {
        const m = v.match(/(\d+)/);
        if (m) pages = parseInt(m[1], 10);
      }
      if (/file size|大小|size/.test(k)) size_text = v;
      if (/posted|发布|發表|上傳|上传/.test(k)) posted_at = parsePostedToMs(v);
    });

    let thumb = '';
    const cover = document.querySelector('#gd1 img, #gd1 > div');
    if (cover) {
      if (cover.tagName === 'IMG') thumb = cover.src || '';
      else {
        const bg = (cover.getAttribute('style') || '') + (cover.style && cover.style.backgroundImage) || '';
        const m = String(bg).match(/url\(["']?([^"')]+)["']?\)/i);
        if (m) thumb = m[1];
      }
    }

    return normalizeEditionRecord({
      gid: gt.gid,
      token: gt.token,
      title_raw: title,
      tags,
      category,
      uploader,
      pages,
      size_text,
      posted_at,
      thumb,
      url: buildGalleryUrl(location.origin, gt.gid, gt.token),
    });
  }

  function normalizeThumbUrlKey(u) {
    let s = compactText(u || '');
    if (!s) return '';
    s = s.replace(/^url\((['"]?)(.+)\1\)$/i, '$2');
    s = s.replace(/^["']|["']$/g, '');
    // 去协议与查询，便于封面大图 vs 缩略路径近似匹配
    s = s.replace(/^https?:/i, '').split('?')[0].split('#')[0].toLowerCase();
    // ehgt 路径末段文件名
    const m = s.match(/\/([a-f0-9]{2}\/[a-f0-9]{2}\/[^/]+)$/i) || s.match(/\/([^/]+\.(?:jpg|jpeg|png|webp|gif))$/i);
    return m ? m[1] : s;
  }

  function thumbEntryKey(t) {
    if (!t) return '';
    if (t.type === 'img') return normalizeThumbUrlKey(t.src);
    const st = t.style || '';
    const m = st.match(/url\((['"]?)([^)'"]+)\1\)/i);
    return m ? normalizeThumbUrlKey(m[2]) : normalizeThumbUrlKey(st);
  }

  /**
   * 从画廊 HTML 抽出缩略（img 或雪碧 background）。
   * limit = 需要的张数；skipCoverDupes 时多取几张，去掉与封面重复的开头页。
   */
  function parseGalleryThumbsFromHtml(html, limit, opts) {
    opts = opts || {};
    const max = Math.max(1, Math.min(12, Number(limit) || 4));
    // 多取：常跳过首页（=封面），有时前两页都像封面
    const collect = Math.min(24, max + (opts.skipCoverDupes ? 4 : 0));
    const out = [];
    if (!html) return out;
    let doc;
    try {
      doc = new DOMParser().parseFromString(String(html), 'text/html');
    } catch (_) {
      return out;
    }
    const gdt = doc.querySelector('#gdt');
    if (!gdt) return out;

    const cells = gdt.querySelectorAll('.gdtm, .gdtl');
    const pickFrom = cells.length ? cells : gdt.querySelectorAll('a[href*="/s/"]');

    const isBlank = (u) => !u || /blank\.gif|transparent\.gif|loading\.gif|\/g\/blank/i.test(u);

    for (let i = 0; i < pickFrom.length && out.length < collect; i++) {
      const cell = pickFrom[i];
      const a =
        cell.tagName === 'A'
          ? cell
          : cell.querySelector('a[href*="/s/"]') || cell.querySelector('a[href*="/g/"]');
      const href = a ? a.getAttribute('href') || '' : '';

      let imgSrc = '';
      const img = cell.querySelector ? cell.querySelector('img') : cell.tagName === 'IMG' ? cell : null;
      if (img) {
        imgSrc = img.getAttribute('data-src') || img.getAttribute('src') || '';
        if (isBlank(imgSrc)) imgSrc = '';
      }

      if (imgSrc) {
        out.push({ type: 'img', src: imgSrc, href: href });
        continue;
      }

      // 雪碧图：取带 url(...) 的 style
      const candidates = [];
      if (cell.getAttribute) candidates.push(cell);
      if (cell.querySelectorAll) {
        cell.querySelectorAll('div[style*="background"], div[style*="url("]').forEach((d) => candidates.push(d));
      }
      let bgStyle = '';
      let w = 0;
      let h = 0;
      for (const el of candidates) {
        const st = el.getAttribute('style') || '';
        if (!/url\s*\(/i.test(st)) continue;
        const parts = [];
        st.split(';').forEach((p) => {
          const t = compactText(p);
          if (!t) return;
          const k = t.split(':')[0].toLowerCase();
          if (
            k === 'background' ||
            k === 'background-image' ||
            k === 'background-position' ||
            k === 'background-size' ||
            k === 'background-repeat' ||
            k === 'width' ||
            k === 'height'
          ) {
            parts.push(t);
            if (k === 'width') {
              const m = t.match(/(\d+)/);
              if (m) w = parseInt(m[1], 10) || 0;
            }
            if (k === 'height') {
              const m = t.match(/(\d+)/);
              if (m) h = parseInt(m[1], 10) || 0;
            }
          }
        });
        if (parts.length) {
          bgStyle = parts.join(';');
          break;
        }
      }
      if (bgStyle) {
        out.push({ type: 'bg', style: bgStyle, href: href, w: w || 100, h: h || 140 });
      }
    }

    if (!opts.skipCoverDupes) return out.slice(0, max);
    return selectHoverPreviewThumbs(out, opts.coverUrl || '', max);
  }

  /**
   * 悬停预览：去掉与封面重复的开头页。
   * - 永远跳过第 1 张（几乎总是封面）
   * - 第 2 张若与封面或第 1 张相同也跳过
   * - 之后仍命中封面 key 的再跳过（最多再 1 次）
   */
  function selectHoverPreviewThumbs(rawThumbs, coverUrl, wantCount) {
    const want = Math.max(1, Math.min(12, Number(wantCount) || 4));
    const list = rawThumbs || [];
    if (!list.length) return [];
    const coverKey = normalizeThumbUrlKey(coverUrl);
    const firstKey = thumbEntryKey(list[0]);
    const out = [];
    let skippedLead = 0;
    for (let i = 0; i < list.length && out.length < want; i++) {
      const t = list[i];
      const k = thumbEntryKey(t);
      if (i === 0) {
        // 首页 ≈ 封面
        skippedLead++;
        continue;
      }
      if (i === 1) {
        const sameAsFirst = k && firstKey && k === firstKey;
        const sameAsCover = k && coverKey && (k === coverKey || k.endsWith(coverKey) || coverKey.endsWith(k));
        if (sameAsFirst || sameAsCover) {
          skippedLead++;
          continue;
        }
      }
      // 开头连续封面重复（最多再跳 1 张）
      if (out.length === 0 && skippedLead < 3 && k && coverKey && k === coverKey) {
        skippedLead++;
        continue;
      }
      out.push(t);
    }
    // 若跳完不够，从原列表后面补（仍不回填第 0 张）
    if (out.length < want) {
      for (let i = 1; i < list.length && out.length < want; i++) {
        if (out.indexOf(list[i]) >= 0) continue;
        out.push(list[i]);
      }
    }
    return out;
  }

  function isBlockedEdition(edition, work) {
    if (work && work.blocked) return { blocked: true, reason: 'work' };
    const title = (edition.title_raw || '').toLowerCase();
    for (const kw of config.block_title_keywords || []) {
      const k = compactText(kw).toLowerCase();
      if (k && title.includes(k)) return { blocked: true, reason: 'title:' + k };
    }
    const up = (edition.uploader || '').toLowerCase();
    for (const u of config.block_uploaders || []) {
      if (compactText(u).toLowerCase() === up && up) return { blocked: true, reason: 'uploader' };
    }
    if ((config.block_languages || []).includes(edition.language)) {
      return { blocked: true, reason: 'language' };
    }
    if ((config.block_censor || []).includes(edition.censor_tier)) {
      return { blocked: true, reason: 'censor' };
    }
    const cat = (edition.category || '').toLowerCase();
    for (const c of config.block_categories || []) {
      if (compactText(c).toLowerCase() === cat && cat) return { blocked: true, reason: 'category' };
    }
    const tagset = (edition.tags || []).map((t) => normalizeNamespaceTag(t));
    for (const ht of config.hate_tags || []) {
      const h = normalizeNamespaceTag(ht);
      if (h && tagset.some((t) => t === h || t.endsWith(':' + h) || t.includes(h))) {
        return { blocked: true, reason: 'tag:' + h };
      }
    }
    const g = (edition.group || '').toLowerCase();
    for (const b of config.group_blacklist || []) {
      if (compactText(b).toLowerCase() === g && g) return { blocked: true, reason: 'group' };
    }
    return { blocked: false, reason: '' };
  }

  function parseImagePageProgress() {
    // /s/{token}/{gid}-{page}
    const m = (location.pathname || '').match(/\/s\/[^/]+\/(\d+)-(\d+)/i);
    if (!m) return null;
    return { gid: m[1], page: parseInt(m[2], 10) || 0 };
  }
  function libraryCompareTip(lib) {
    const c = lib && lib.library_compare;
    if (!c) {
      if (lib && lib.maybe_in_library) return '标题近似库内档案，可点「绑定 LRR」确认（不是正式对照卡）';
      return '';
    }
    const lines = [];
    if (c.online_brief) lines.push('线上: ' + c.online_brief);
    if (c.library_brief) lines.push('库内: ' + c.library_brief);
    (c.diffs || []).forEach((d) => {
      let s = d.label + ': ' + d.library + ' → ' + d.online;
      if (d.better === 'online') s += '（线上更优）';
      else if (d.better === 'library') s += '（库内更优）';
      else if (d.packaging || d.key === 'pages' || d.key === 'size') s += '（打包差异）';
      lines.push(s);
    });
    if (c.packaging_note) lines.push(c.packaging_note);
    if (!(c.diffs && c.diffs.length)) {
      if (c.same && c.same.length) lines.push('一致: ' + c.same.join('、'));
      else lines.push('主要靠标题相似，请人工确认');
    }
    if (typeof c.title_sim === 'number' && c.title_sim > 0) {
      lines.push('标题相似 ' + Math.round(c.title_sim * 100) + '%');
    }
    return lines.join(' · ');
  }

  function maybeLibLabel(lib) {
    if (!lib || !lib.maybe_in_library) return '';
    return compactText(lib.maybe_label || '') || '可能在库';
  }

  /** 差异列表 HTML：sideA→sideB；better 取值 online/library 或 current/other */
  function compareDiffsListHtml(diffs, sideMap) {
    const map = sideMap || {
      leftBetter: 'online',
      rightBetter: 'library',
      leftTag: '线上',
      rightTag: '库内',
    };
    const quality = (diffs || []).filter((d) => d.key === 'language' || d.key === 'censor' || d.key === 'group');
    const packing = (diffs || []).filter((d) => d.packaging || d.key === 'pages' || d.key === 'size');
    const shown = quality.concat(packing.slice(0, 2));
    if (!shown.length) return '';
    let html =
      '<ul class="exc-compare-diffs">' +
      shown
        .map((d) => {
          const leftVal = d.current != null ? d.current : d.online;
          const rightVal = d.other != null ? d.other : d.library;
          // 展示方向：库内/对方 → 当前/线上（与旧 LRR 卡一致）
          const from = rightVal;
          const to = leftVal;
          const better = d.better || '';
          const tone =
            better === map.leftBetter || better === 'current' || better === 'online'
              ? ' is-online-better'
              : better === map.rightBetter || better === 'other' || better === 'library'
                ? ' is-lib-better'
                : '';
          const tag =
            better === map.leftBetter || better === 'current' || better === 'online'
              ? ' <em>' + escapeHtml(map.leftTag) + '</em>'
              : better === map.rightBetter || better === 'other' || better === 'library'
                ? ' <em>' + escapeHtml(map.rightTag) + '</em>'
                : d.packaging || d.key === 'pages' || d.key === 'size'
                  ? ' <em>打包</em>'
                  : '';
          return (
            '<li class="' +
            tone +
            '"><b>' +
            escapeHtml(d.label) +
            '</b> ' +
            escapeHtml(String(from)) +
            ' <span class="exc-compare-arrow">→</span> ' +
            escapeHtml(String(to)) +
            tag +
            '</li>'
          );
        })
        .join('') +
      '</ul>';
    if (packing.length > 2) {
      html += '<div class="exc-compare-note">另有 ' + (packing.length - 2) + ' 项打包差异</div>';
    }
    return html;
  }

  /** LRR 库内对照卡（可能在库不算正式卡） */
  function libraryCompareCardHtml(lib, opts) {
    opts = opts || {};
    if (!lib) return '';
    const inLib = !!(lib.work_in_library || lib.edition_in_library);
    if (!inLib) return '';

    const c = lib.library_compare || null;
    const confirmed = !!(lib.same_version_confirmed || (c && c.same_version));
    const diffs = (c && c.diffs) || [];
    const qualityDiffs = diffs.filter((d) => d.key === 'language' || d.key === 'censor' || d.key === 'group');
    const packingDiffs = diffs.filter((d) => d.packaging || d.key === 'pages' || d.key === 'size');
    const onlineBetter = !!(c && c.online_better) || qualityDiffs.some((d) => d.better === 'online');
    const libraryBetter =
      !onlineBetter &&
      (!!(c && c.library_better) || qualityDiffs.some((d) => d.better === 'library'));

    // 一眼结论（码未知→无码 等质量差优先于「差不多」）
    let verdict = 'same';
    let verdictText = '差不多';
    if (confirmed) {
      verdict = 'samever';
      verdictText = '已同源';
    } else if (onlineBetter || (c && c.online_better)) {
      verdict = 'online';
      verdictText = '线上更好';
    } else if (libraryBetter || (c && c.library_better)) {
      verdict = 'library';
      verdictText = '库内更好';
    } else if (packingDiffs.length && !qualityDiffs.length) {
      verdict = 'pack';
      verdictText = '打包差异';
    }

    const whereText = lib.edition_in_library ? '本版在库' : '库内有';
    const libBrief = (c && c.library_brief) || '—';
    const onBrief = (c && c.online_brief) || '—';

    // 质量差最多 2 条，紧凑
    let qualityHtml = '';
    if (qualityDiffs.length && !confirmed) {
      qualityHtml =
        '<ul class="exc-compare-diffs exc-compare-qdiffs">' +
        qualityDiffs
          .slice(0, 2)
          .map((d) => {
            const tone =
              d.better === 'online' ? ' is-online-better' : d.better === 'library' ? ' is-lib-better' : '';
            const tag =
              d.better === 'online' ? ' <em>线上</em>' : d.better === 'library' ? ' <em>库内</em>' : '';
            return (
              '<li class="' +
              tone +
              '"><b>' +
              escapeHtml(d.label) +
              '</b> ' +
              '<span class="exc-cmp-v is-lib">' +
              escapeHtml(String(d.library)) +
              '</span>' +
              ' <span class="exc-compare-arrow">→</span> ' +
              '<span class="exc-cmp-v is-on">' +
              escapeHtml(String(d.online)) +
              '</span>' +
              tag +
              '</li>'
            );
          })
          .join('') +
        '</ul>';
    }

    // 打包默认一行灰字，不占列表
    let packHtml = '';
    if (packingDiffs.length && !confirmed) {
      const bits = packingDiffs.slice(0, 3).map((d) => {
        return d.label + ' ' + d.library + '→' + d.online;
      });
      packHtml =
        '<div class="exc-compare-pack" title="' +
        escapeHtml((c && c.packaging_note) || '页数/体积多半是删广告或重打包') +
        '">打包 · ' +
        escapeHtml(bits.join(' · ')) +
        (packingDiffs.length > 3 ? ' · …' : '') +
        '</div>';
    } else if (confirmed) {
      packHtml = '<div class="exc-compare-pack is-quiet">已确认同源，打包差不再提示</div>';
    }

    const canSame = opts.withActions && !!lib.same_target_arcid && !confirmed;
    const actions = opts.withActions
      ? '<div class="exc-compare-actions">' +
        (opts.lrrOpenHtml || '') +
        (canSame
          ? '<button type="button" class="jlc-wb-btn primary" data-exc-g="samever" title="确认库内就是这个版本">视为同源</button>'
          : '') +
        '</div>'
      : '';

    const toneClass =
      verdict === 'samever' || (verdict === 'same' && !packingDiffs.length)
        ? ' is-same'
        : verdict === 'online'
          ? ' is-online-win'
          : verdict === 'library'
            ? ' is-lib-win'
            : verdict === 'pack'
              ? ' is-pack'
              : ' is-lib';

    return (
      '<div class="exc-compare-card is-lrr' +
      toneClass +
      '">' +
      '<div class="exc-compare-head">' +
      '<span class="exc-compare-title">LRR · ' +
      escapeHtml(whereText) +
      '</span>' +
      '<span class="exc-compare-chip is-verdict is-' +
      verdict +
      '">' +
      escapeHtml(verdictText) +
      '</span>' +
      '</div>' +
      '<div class="exc-compare-vs" aria-label="库内与线上对照">' +
      '<div class="exc-compare-col is-lib">' +
      '<div class="exc-compare-col-lab">库内</div>' +
      '<div class="exc-compare-col-val">' +
      escapeHtml(libBrief) +
      '</div>' +
      '</div>' +
      '<div class="exc-compare-vs-mid" aria-hidden="true">vs</div>' +
      '<div class="exc-compare-col is-on">' +
      '<div class="exc-compare-col-lab">线上</div>' +
      '<div class="exc-compare-col-val">' +
      escapeHtml(onBrief) +
      '</div>' +
      '</div>' +
      '</div>' +
      qualityHtml +
      packHtml +
      actions +
      '</div>'
    );
  }

  /** 线上多版本对照卡（otherEds 不含当前页；库源置顶高亮） */
  function editionCompareCardHtml(current, otherEds, opts) {
    opts = opts || {};
    if (!current) return '';
    const cfg = opts.cfg || config;
    const libGids = new Set((opts.libraryGids || []).map(String));
    const isLrrGid = (gid) => libGids.has(String(gid || ''));
    const currentIsLrr = isLrrGid(current.gid);

    // 无其它版本时：若当前是库源画廊，仍显示一条说明（不是「线上只有 LRR 文件」）
    if (!otherEds || !otherEds.length) {
      if (!currentIsLrr) return '';
      const url = current.url || buildGalleryUrl(location.origin, current.gid, current.token);
      return (
        '<div class="exc-compare-card is-editions is-same">' +
        '<div class="exc-compare-head"><span class="exc-compare-title">作品状态 · 线上版本</span>' +
        '<span class="exc-compare-chip">当前即库源</span></div>' +
        '<div class="exc-compare-note">打开画廊时会自动按标题搜索相关上传并并入列表。</div>' +
        '<div class="exc-edition-list">' +
        '<div class="exc-ed is-lrr-bound is-current">' +
        '<a href="' +
        escapeHtml(url) +
        '">' +
        '<span class="exc-ed-lrr-tag" title="LRR 档案绑定的 EH 源画廊，不是「文件在 LRR」">库源</span> ' +
        escapeHtml(formatEditionBrief(current)) +
        ' · 当前页' +
        '</a></div></div></div>'
      );
    }

    const sorted = otherEds.slice().sort((a, b) => {
      const aL = isLrrGid(a.gid) ? 1 : 0;
      const bL = isLrrGid(b.gid) ? 1 : 0;
      if (bL !== aL) return bL - aL;
      const ds = scoreEdition(b, cfg) - scoreEdition(a, cfg);
      if (Math.abs(ds) > 1) return ds;
      // 码未知时靠体积/时间区分
      const sz = (Number(b.size_bytes) || 0) - (Number(a.size_bytes) || 0);
      if (sz) return sz;
      return (Number(b.posted_at) || 0) - (Number(a.posted_at) || 0);
    });
    const all = [current].concat(otherEds);
    const bestAll = pickBestEdition(all, cfg);
    const currentIsBest = !!(bestAll && String(bestAll.gid) === String(current.gid));
    // 对照对象：优先 LRR 绑定版；否则偏好逻辑
    const lrrPeer = sorted.find((ed) => isLrrGid(ed.gid));
    const peer = lrrPeer
      ? lrrPeer
      : currentIsBest
        ? sorted[0]
        : bestAll && String(bestAll.gid) !== String(current.gid)
          ? bestAll
          : sorted[0];
    const cmp = peer ? diffEditionVsEdition(current, peer, cfg) : null;
    const total = otherEds.length + 1;
    const head = '作品状态 · 线上多版本 · 共 ' + total + ' 本';
    const label = currentIsLrr
      ? '当前即库源'
      : lrrPeer
        ? '含库源画廊'
        : currentIsBest
          ? '当前已是偏好'
          : cmp && cmp.other_better
            ? '有更优版本'
            : cmp && cmp.short_label
              ? cmp.short_label
              : '可切换版本';

    let body =
      '<div class="exc-compare-note">含自动标题搜索并入的相关上传。</div>';
    if (cmp && (cmp.current_brief || cmp.other_brief)) {
      body +=
        '<div class="exc-compare-pair">' +
        '<div class="exc-compare-side"><span class="exc-compare-k">当前</span> ' +
        escapeHtml(cmp.current_brief || '—') +
        (currentIsLrr ? ' · 库源' : '') +
        '</div>' +
        '<div class="exc-compare-side"><span class="exc-compare-k">对方</span> ' +
        escapeHtml(cmp.other_brief || '—') +
        (peer && peer.gid ? ' · g' + escapeHtml(String(peer.gid)) : '') +
        (peer && isLrrGid(peer.gid) ? ' · 库源' : '') +
        '</div>' +
        '</div>';
    }
    if (cmp && cmp.diffs && cmp.diffs.length) {
      body += compareDiffsListHtml(cmp.diffs, {
        leftBetter: 'current',
        rightBetter: 'other',
        leftTag: '当前',
        rightTag: '对方',
      });
    } else {
      body +=
        '<div class="exc-compare-note">' +
        (currentIsLrr
          ? '当前页是 LRR 绑定的 EH 源；下方为其它已见线上版本。'
          : currentIsBest
            ? '其它版本主要维度接近；下方可切换查看。'
            : '与偏好版接近；可用「最佳版」跳转。') +
        '</div>';
    }

    function edRowHtml(ed, flags) {
      flags = flags || {};
      const url = ed.url || buildGalleryUrl(location.origin, ed.gid, ed.token);
      const isPeer = peer && String(ed.gid) === String(peer.gid);
      const isLrr = isLrrGid(ed.gid);
      const sc = scoreEdition(ed, cfg);
      const curSc = scoreEdition(current, cfg);
      const marks = [];
      if (flags.isCurrent) marks.push('当前页');
      if (isLrr) marks.push('库源');
      if (isPeer && !flags.isCurrent) marks.push('对照中');
      else if (!flags.isCurrent && sc > curSc) marks.push('更优');
      const bits = [];
      bits.push(shortLang(ed.language) !== '?' ? shortLang(ed.language) : ed.language || '?');
      if (ed.group) bits.push(String(ed.group).slice(0, 12));
      bits.push(shortCensor(ed.censor_tier || 'unknown'));
      // 码未知时体积/时间更重要，始终展示
      if (Number(ed.pages) > 0) bits.push(ed.pages + 'p');
      else bits.push('?p');
      if (Number(ed.size_bytes) > 0) bits.push(formatBytes(ed.size_bytes));
      else bits.push('?MB');
      const when =
        typeof formatTrackingPostedShort === 'function'
          ? formatTrackingPostedShort(ed.posted_at)
          : '';
      if (when) bits.push(when);
      else bits.push('?时');
      if (marks.length) bits.push(marks.join(' · '));
      const cls =
        'exc-ed' +
        (isPeer ? ' is-peer' : '') +
        (isLrr ? ' is-lrr-bound' : '') +
        (flags.isCurrent ? ' is-current' : '');
      return (
        '<div class="' +
        cls +
        '"><a href="' +
        escapeHtml(url) +
        '" title="' +
        escapeHtml(ed.title_raw || ed.title_core || '') +
        '">' +
        (flags.isCurrent
          ? '<span class="exc-ed-cur-tag" title="当前正在看的画廊">当前</span> '
          : '') +
        (isLrr
          ? '<span class="exc-ed-lrr-tag" title="LRR 档案绑定的 EH 源画廊">库源</span> '
          : '') +
        escapeHtml(bits.join(' · ')) +
        '</a></div>'
      );
    }

    // 列表顺序：①当前页（始终置顶+高亮）②其它库源 ③其余按偏好/体积/时间
    const listParts = [];
    listParts.push(edRowHtml(current, { isCurrent: true }));
    sorted.forEach((ed) => {
      if (String(ed.gid) === String(current.gid)) return;
      listParts.push(edRowHtml(ed, {}));
    });
    const listHtml = listParts.join('');

    const actions = opts.withActions
      ? '<div class="exc-compare-actions">' +
        (currentIsBest
          ? ''
          : '<button type="button" class="jlc-wb-btn primary" data-exc-g="best">打开最佳版</button>') +
        '</div>'
      : '';

    return (
      '<div class="exc-compare-card is-editions' +
      (currentIsBest ? ' is-same' : ' is-diff') +
      (currentIsLrr || lrrPeer ? ' has-lrr-bound' : '') +
      '">' +
      '<div class="exc-compare-head"><span class="exc-compare-title">' +
      escapeHtml(head) +
      '</span><span class="exc-compare-chip">' +
      escapeHtml(label) +
      '</span></div>' +
      body +
      (listHtml ? '<div class="exc-edition-list">' + listHtml + '</div>' : '') +
      actions +
      '</div>'
    );
  }

  function badgeHtml(lib, work, edition) {
    const bits = [];
    if (lib) {
      // 库内主状态由对照卡承担，badge 只补额外态
      const cardCoversInLib = !!(lib.work_in_library || lib.edition_in_library);
      if (lib.same_version_confirmed) {
        bits.push('<span class="jlc-status-pill tone-green" title="已手动确认与库内为同一版本">同源✓</span>');
      }
      if (!cardCoversInLib) {
        if (lib.preferred_in_library) bits.push('<span class="jlc-status-pill tone-blue">偏好版在库</span>');
      } else if (lib.preferred_in_library && !lib.edition_in_library) {
        bits.push('<span class="jlc-status-pill tone-blue">偏好版在库</span>');
      }
      if (!cardCoversInLib && lib.maybe_in_library) {
        const label = maybeLibLabel(lib);
        const tip = libraryCompareTip(lib);
        const tone =
          lib.library_compare && lib.library_compare.online_better ? 'tone-orange' : 'tone-gray';
        bits.push(
          '<span class="jlc-status-pill ' +
            tone +
            '" title="' +
            escapeHtml(tip) +
            '">' +
            escapeHtml(label) +
            '</span>'
        );
      }
      if (lib.has_better_remote && !lib.same_version_confirmed) {
        bits.push('<span class="jlc-status-pill tone-orange">⬆有更好版</span>');
      }
    }
    if (edition) {
      try {
        if (typeof matchFamiliarRadar === 'function') {
          const fam = matchFamiliarRadar(edition.title_raw || edition.title || '', edition.tags || []);
          if (fam && fam.name) {
            bits.push(
              '<span class="jlc-status-pill tone-blue" title="熟人 · ' +
                escapeHtml(fam.kind + ':' + fam.name) +
                '">' +
                escapeHtml((fam.kind === 'group' ? '团队: ' : '画师: ') + String(fam.name).slice(0, 16)) +
                '</span>'
            );
          }
        }
        if (typeof matchFavTags === 'function') {
          const favs = matchFavTags(
            config.fav_tags || [],
            edition.tags || [],
            edition.title_raw || edition.title || ''
          );
          favs.slice(0, 3).forEach((ft) => {
            bits.push(
              '<span class="jlc-status-pill tone-orange" title="心动标签">' +
                escapeHtml('♥ ' + String(ft).slice(0, 14)) +
                '</span>'
            );
          });
        }
      } catch (_) { /* ignore */ }
    }
    if (work && work.blocked) bits.push('<span class="jlc-status-pill tone-red">已抛弃</span>');
    return bits.length ? '<div class="exc-badge-row">' + bits.join('') + '</div>' : '';
  }

  function ensureModal() {
    let mask = document.getElementById('exc-wb-dialog');
    if (mask) return mask;
    mask = document.createElement('div');
    mask.id = 'exc-wb-dialog';
    mask.innerHTML = '<div class="jlc-wb-dialog-card" id="exc-wb-dialog-card"></div>';
    mask.addEventListener('click', (e) => {
      if (e.target === mask) closeModal();
    });
    document.body.appendChild(mask);
    return mask;
  }

  function openModal(title, bodyHtml, actionsHtml) {
    const mask = ensureModal();
    const box = document.getElementById('exc-wb-dialog-card');
    box.innerHTML =
      '<h4>' +
      escapeHtml(title || 'Creamu · ExH') +
      '</h4>' +
      (bodyHtml || '') +
      (actionsHtml ? '<div class="jlc-wb-dialog-actions">' + actionsHtml + '</div>' : '');
    mask.classList.add('is-open');
    return box;
  }

  function closeModal() {
    const mask = document.getElementById('exc-wb-dialog');
    if (mask) mask.classList.remove('is-open');
  }

  async function openBindModal(edition) {
    const candidates = await findArchiveCandidates(edition, 20);
    const lib = await resolveLibraryState(edition);
    // 绑定弹窗仅挂 LRR 正式对照卡（库内命中），模糊候选靠列表行内 diff
    const compareBanner = libraryCompareCardHtml(lib, { withActions: false });
    let rows = '';
    if (!candidates.length) {
      rows = '<div class="exc-empty">无候选。请先同步 LRR，或用下方搜索打开 LRR。</div>';
    } else {
      const rowParts = [];
      for (const c of candidates) {
        let a = c.archive;
        if (typeof enrichArchiveForCompare === 'function') {
          try {
            a = await enrichArchiveForCompare(a);
          } catch (_) { /* ignore */ }
        }
        const cmp = diffEditionVsArchive(edition, a, config);
        const diffBits = (cmp.diffs || [])
          .slice(0, 3)
          .map((d) => d.label + ' ' + d.library + '→' + d.online)
          .join(' · ');
        const sameBits = !(cmp.diffs && cmp.diffs.length) && cmp.same && cmp.same.length
          ? '接近: ' + cmp.same.join('/')
          : '';
        rowParts.push(
          '<div class="exc-modal-row' +
            (c.linked ? ' is-linked' : '') +
            '" data-arcid="' +
            escapeHtml(a.arcid) +
            '">' +
            '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:600">' +
            escapeHtml(a.title) +
            (c.linked ? ' · 已绑定' : '') +
            '</div>' +
            '<div class="exc-modal-meta">' +
            escapeHtml(c.reason || 'match') +
            ' · ' +
            c.score.toFixed(2) +
            ' · ' +
            escapeHtml(formatEditionBrief(a)) +
            ' · ' +
            escapeHtml(a.arcid.slice(0, 10)) +
            '</div>' +
            (diffBits || sameBits
              ? '<div class="exc-modal-compare' +
                (cmp.online_better ? ' is-online-better' : cmp.library_better ? ' is-lib-better' : '') +
                '">' +
                escapeHtml(diffBits || sameBits) +
                '</div>'
              : '') +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:4px">' +
            (c.linked
              ? '<button type="button" class="jlc-wb-btn ghost" data-bact="unlink">解绑</button>'
              : '<button type="button" class="jlc-wb-btn primary" data-bact="bind">绑定</button>') +
            (c.same_version
              ? '<span class="jlc-status-pill tone-green" style="justify-content:center">同源✓</span>'
              : '<button type="button" class="jlc-wb-btn ghost" data-bact="samever" title="确认就是这个库内版本">视为同源</button>') +
            '<button type="button" class="jlc-wb-btn danger" data-bact="neg">不是</button>' +
            (buildLrrReaderUrl(a.arcid)
              ? '<a class="jlc-wb-btn ghost" target="_blank" rel="noreferrer" href="' +
                escapeHtml(buildLrrReaderUrl(a.arcid)) +
                '">打开</a>'
              : '') +
            '</div></div>'
        );
      }
      rows = rowParts.join('');
    }

    const box = openModal(
      '对照绑定 · LANraragi',
      '<div class="exc-g-kv" style="margin-bottom:10px">' +
        escapeHtml(edition.title_raw) +
        '</div>' +
        compareBanner +
        '<div class="exc-modal-list">' +
        rows +
        '</div>',
      '<button type="button" class="jlc-wb-btn ghost" data-bact="search">LRR 搜索标题</button>' +
        '<button type="button" class="jlc-wb-btn ghost" data-bact="manual">手动输入 arcid</button>' +
        '<button type="button" class="jlc-wb-btn primary" data-bact="close">关闭</button>'
    );

    box.onclick = async (ev) => {
      const t = ev.target;
      if (!t || !t.getAttribute) return;
      const act = t.getAttribute('data-bact');
      if (!act) return;
      if (act === 'close') {
        closeModal();
        return;
      }
      if (act === 'search') {
        const u = buildLrrSearchUrl(edition.title_core || edition.title_raw);
        if (!u) showToast('请先配置 LRR');
        else window.open(u, '_blank');
        return;
      }
      if (act === 'manual') {
        const arcid = compactText(prompt('输入 LRR arcid：'));
        if (!arcid) return;
        await bindArchiveToEdition(edition, arcid, 'manual');
        showToast('已绑定 ' + arcid);
        closeModal();
        await refreshCurrentPageUi();
        return;
      }
      const row = t.closest('[data-arcid]');
      const arcid = row && row.getAttribute('data-arcid');
      if (!arcid) return;
      if (act === 'bind') {
        await bindArchiveToEdition(edition, arcid, 'manual');
        showToast('已绑定');
      } else if (act === 'samever') {
        await markEditionArchiveSameVersion(edition, arcid);
        showToast('已视为同源');
      } else if (act === 'unlink') {
        await unlinkArchive(edition.id || makeEditionId(edition.gid, edition.token), edition.work_id, arcid);
        showToast('已解绑');
      } else if (act === 'neg') {
        await negateArchiveForEdition(edition, arcid);
        showToast('已标记不是同一本');
      }
      await openBindModal(edition);
      if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
    };
  }

  async function openMergeModal(edition) {
    const cands = await findMergeCandidates(edition);
    let rows = '';
    if (!cands.length) {
      rows = '<div class="exc-empty">暂无相似 Work 候选</div>';
    } else {
      rows = cands
        .map(
          (c) =>
            '<div class="exc-modal-row" data-wid="' +
            escapeHtml(c.work_id) +
            '">' +
            '<div style="flex:1">' +
            '<div style="font-weight:600">' +
            escapeHtml(c.title_raw || c.work_id) +
            '</div>' +
            '<div style="color:#999;font-size:11px">sim ' +
            c.sim.toFixed(2) +
            ' · ' +
            escapeHtml(c.work_id) +
            '</div></div>' +
            '<button type="button" class="jlc-wb-btn primary" data-mact="merge">合并到此</button></div>'
        )
        .join('');
    }
    const box = openModal(
      '合并 Work',
      '<p>当前: ' +
        escapeHtml(edition.work_id) +
        ' · ' +
        escapeHtml(edition.title_raw) +
        '</p>' +
        '<p>将当前 Work 的版本并入所选 Work，并删除当前 Work 记录。</p>' +
        rows,
      '<button type="button" class="jlc-wb-btn ghost" data-mact="split">拆出当前 Edition</button>' +
        '<button type="button" class="jlc-wb-btn primary" data-mact="close">关闭</button>'
    );
    box.onclick = async (ev) => {
      const t = ev.target;
      const act = t && t.getAttribute && t.getAttribute('data-mact');
      if (!act) return;
      if (act === 'close') return closeModal();
      if (act === 'split') {
        await splitEditionToNewWork(edition);
        showToast('已拆为新 Work');
        closeModal();
        await refreshCurrentPageUi();
        return;
      }
      if (act === 'merge') {
        const row = t.closest('[data-wid]');
        const target = row && row.getAttribute('data-wid');
        if (!target) return;
        if (!confirm('确认合并到 ' + target + '？')) return;
        await mergeWorks(target, edition.work_id);
        showToast('合并完成');
        closeModal();
        await refreshCurrentPageUi();
        if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
      }
    };
  }

  // —— 列表悬停预览 ——
  const hoverPreviewCache = new Map();
  const hoverPreviewInflight = new Map();
  let hoverPreviewActive = 0;
  let hoverPreviewHideTimer = null;
  let hoverPreviewGen = 0;
  let hoverPreviewScrollBound = false;

  function ensureHoverPreviewPanel() {
    let panel = document.getElementById('exc-hover-preview');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'exc-hover-preview';
    panel.innerHTML =
      '<div class="exc-hp-head"><span class="exc-hp-title">预览</span><a class="exc-hp-open" href="#" target="_blank" rel="noreferrer">打开画廊</a></div>' +
      '<div class="exc-hp-status"></div>' +
      '<div class="exc-hp-grid"></div>';
    panel.addEventListener('mouseenter', () => {
      if (hoverPreviewHideTimer) {
        clearTimeout(hoverPreviewHideTimer);
        hoverPreviewHideTimer = null;
      }
    });
    panel.addEventListener('mouseleave', () => {
      scheduleHideHoverPreview(80);
    });
    document.body.appendChild(panel);
    if (!hoverPreviewScrollBound) {
      hoverPreviewScrollBound = true;
      window.addEventListener(
        'scroll',
        () => {
          hideHoverPreview();
        },
        { passive: true, capture: true }
      );
    }
    return panel;
  }

  function hideHoverPreview() {
    if (hoverPreviewHideTimer) {
      clearTimeout(hoverPreviewHideTimer);
      hoverPreviewHideTimer = null;
    }
    const panel = document.getElementById('exc-hover-preview');
    if (panel) {
      panel.classList.remove('is-open', 'is-loading', 'is-empty', 'is-error');
      panel.style.display = 'none';
    }
  }

  function scheduleHideHoverPreview(ms) {
    if (hoverPreviewHideTimer) clearTimeout(hoverPreviewHideTimer);
    hoverPreviewHideTimer = setTimeout(() => {
      hoverPreviewHideTimer = null;
      hideHoverPreview();
    }, ms == null ? 120 : ms);
  }

  function positionHoverPreview(panel, anchor) {
    if (!panel || !anchor) return;
    panel.style.display = 'block';
    const r = anchor.getBoundingClientRect();
    const pw = panel.offsetWidth || 360;
    const ph = panel.offsetHeight || 180;
    let left = r.right + 10;
    let top = r.top;
    if (left + pw > window.innerWidth - 8) left = Math.max(8, r.left - pw - 10);
    if (left < 8) left = 8;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, window.innerHeight - ph - 8);
    if (top < 8) top = 8;
    panel.style.left = Math.round(left) + 'px';
    panel.style.top = Math.round(top) + 'px';
  }

  function renderHoverPreviewThumbs(panel, thumbs, galleryUrl) {
    const grid = panel.querySelector('.exc-hp-grid');
    const status = panel.querySelector('.exc-hp-status');
    const open = panel.querySelector('.exc-hp-open');
    if (open && galleryUrl) {
      open.href = galleryUrl;
      open.style.display = '';
    } else if (open) {
      open.style.display = 'none';
    }
    if (!grid) return;
    if (!thumbs || !thumbs.length) {
      panel.classList.add('is-empty');
      panel.classList.remove('is-loading', 'is-error');
      if (status) status.textContent = '没有可预览的缩略图';
      grid.innerHTML = '';
      return;
    }
    panel.classList.remove('is-empty', 'is-loading', 'is-error');
    if (status) status.textContent = '内容预览 · ' + thumbs.length + ' 张（已跳过封面页）';
    grid.innerHTML = thumbs
      .map((t) => {
        const href = t.href || galleryUrl || '#';
        if (t.type === 'bg' && t.style) {
          const wh =
            (t.w ? 'width:' + t.w + 'px;' : '') + (t.h ? 'height:' + t.h + 'px;' : 'min-height:100px;');
          return (
            '<a class="exc-hp-cell" href="' +
            escapeHtml(href) +
            '" target="_blank" rel="noreferrer">' +
            '<span class="exc-hp-bg" style="' +
            escapeHtml(t.style) +
            ';' +
            wh +
            '"></span></a>'
          );
        }
        return (
          '<a class="exc-hp-cell" href="' +
          escapeHtml(href) +
          '" target="_blank" rel="noreferrer">' +
          '<img src="' +
          escapeHtml(t.src || '') +
          '" alt="" loading="lazy"></a>'
        );
      })
      .join('');
  }

  async function fetchGalleryPreviewThumbs(gid, token, count, coverUrl) {
    const key = String(gid) + '|v2|' + String(count);
    const cached = hoverPreviewCache.get(key);
    if (cached && Array.isArray(cached.thumbs)) {
      if (cached.thumbs.length >= count || cached.partial === false) return cached;
    }
    if (hoverPreviewInflight.has(key)) return hoverPreviewInflight.get(key);

    const run = (async () => {
      while (hoverPreviewActive >= 2) {
        await new Promise((r) => setTimeout(r, 40));
      }
      hoverPreviewActive++;
      try {
        const url = buildGalleryUrl(location.origin, gid, token);
        const res = await gmRequest({
          method: 'GET',
          url: url,
          timeout: 15000,
          headers: {
            Accept: 'text/html,application/xhtml+xml',
            'Cache-Control': 'no-cache',
          },
        });
        const status = res && res.status;
        if (status < 200 || status >= 400) {
          throw new Error('HTTP ' + status);
        }
        const text = (res && res.responseText) || '';
        if (/Sad Panda|Your IP address has been temporarily banned|Please wait/i.test(text) && !/id="gdt"/i.test(text)) {
          throw new Error('页面不可用或限流');
        }
        // 跳过与封面重复的前 1～2 张，多取再筛
        const thumbs = parseGalleryThumbsFromHtml(text, count, {
          skipCoverDupes: true,
          coverUrl: coverUrl || '',
        });
        const entry = { thumbs: thumbs, partial: thumbs.length < count, ts: nowMs() };
        hoverPreviewCache.set(key, entry);
        if (hoverPreviewCache.size > 100) {
          const oldest = hoverPreviewCache.keys().next().value;
          if (oldest != null) hoverPreviewCache.delete(oldest);
        }
        return entry;
      } finally {
        hoverPreviewActive = Math.max(0, hoverPreviewActive - 1);
        hoverPreviewInflight.delete(key);
      }
    })();

    hoverPreviewInflight.set(key, run);
    return run;
  }

  async function showHoverPreview(anchorEl, partial) {
    if (!config.list_hover_preview) return;
    if (!partial || !partial.gid || !partial.token) return;
    const panel = ensureHoverPreviewPanel();
    const gen = ++hoverPreviewGen;
    const count = clampHoverPreviewCount(config.list_hover_preview_count);
    const galleryUrl = buildGalleryUrl(location.origin, partial.gid, partial.token);
    // 列表封面：用于去掉预览里重复的首页
    let coverUrl = partial.thumb || '';
    if (!coverUrl && anchorEl) {
      const img = anchorEl.querySelector('img');
      if (img) coverUrl = img.getAttribute('data-src') || img.src || '';
    }

    panel.classList.add('is-open', 'is-loading');
    panel.classList.remove('is-empty', 'is-error');
    panel.style.display = 'block';
    const status = panel.querySelector('.exc-hp-status');
    const title = panel.querySelector('.exc-hp-title');
    if (title) title.textContent = '预览';
    if (status) status.textContent = '加载中…';
    const grid = panel.querySelector('.exc-hp-grid');
    if (grid) grid.innerHTML = '';
    const open = panel.querySelector('.exc-hp-open');
    if (open) {
      open.href = galleryUrl;
      open.style.display = '';
    }
    positionHoverPreview(panel, anchorEl);

    try {
      const entry = await fetchGalleryPreviewThumbs(partial.gid, partial.token, count, coverUrl);
      if (gen !== hoverPreviewGen) return;
      renderHoverPreviewThumbs(panel, entry.thumbs, galleryUrl);
      positionHoverPreview(panel, anchorEl);
    } catch (err) {
      if (gen !== hoverPreviewGen) return;
      panel.classList.remove('is-loading');
      panel.classList.add('is-error', 'is-empty');
      if (status) status.textContent = '预览失败: ' + ((err && err.message) || err);
      if (grid) grid.innerHTML = '';
      positionHoverPreview(panel, anchorEl);
    }
  }

  function bindListHoverPreview(el, partial) {
    if (!el || !partial || !partial.gid) return;
    if (el.dataset.excHoverBound === '1') return;
    el.dataset.excHoverBound = '1';

    let enterTimer = null;
    let localGen = 0;

    const clearEnter = () => {
      if (enterTimer) {
        clearTimeout(enterTimer);
        enterTimer = null;
      }
    };

    el.addEventListener('mouseenter', () => {
      if (config.list_hover_preview === false) return;
      clearEnter();
      const my = ++localGen;
      const delay = clampHoverPreviewDelay(config.list_hover_preview_delay_ms);
      enterTimer = setTimeout(() => {
        enterTimer = null;
        if (my !== localGen) return;
        if (hoverPreviewHideTimer) {
          clearTimeout(hoverPreviewHideTimer);
          hoverPreviewHideTimer = null;
        }
        showHoverPreview(el, partial).catch(() => {});
      }, delay);
    });

    el.addEventListener('mouseleave', (ev) => {
      clearEnter();
      localGen++;
      const to = ev.relatedTarget;
      if (to && to.closest && to.closest('#exc-hover-preview')) return;
      scheduleHideHoverPreview(140);
    });
  }

  async function enhanceListItem(el, ctx) {
    if (!el || el.dataset.excEnhanced === '1') return null;
    const partial = parseListCard(el);
    if (!partial || !partial.gid) return null;
    el.dataset.excEnhanced = '1';
    el.classList.add('exc-gl-item');
    el.dataset.excGid = partial.gid;
    el.dataset.excToken = partial.token;
    // 悬停预览尽早绑定（不等 DB）
    bindListHoverPreview(el, partial);

    // 列表打开方式：设置里「新标签页打开」
    try {
      if (config.list_open_in_new_tab) {
        el.querySelectorAll('a[href*="/g/"]').forEach((a) => {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        });
      } else {
        el.querySelectorAll('a[href*="/g/"]').forEach((a) => {
          if (a.getAttribute('target') === '_blank' && a.dataset.excTabForced === '1') {
            a.removeAttribute('target');
            a.removeAttribute('rel');
            delete a.dataset.excTabForced;
          }
        });
      }
      if (config.list_open_in_new_tab) {
        el.querySelectorAll('a[href*="/g/"]').forEach((a) => {
          a.dataset.excTabForced = '1';
        });
      }
    } catch (_) { /* ignore */ }

    let edition;
    try {
      edition = await upsertEdition(partial);
    } catch (e) {
      console.warn('[ExC] upsert list edition', e);
      return null;
    }
    el.dataset.excWork = edition.work_id || '';

    const work = edition.work_id ? await idbGet(STORE_WORKS, edition.work_id) : null;
    const lib = await resolveLibraryState(edition);
    const block = isBlockedEdition(edition, work);

    if (block.blocked) {
      el.classList.add('is-exc-blocked');
      if (config.hide_blocked) el.classList.add('exc-hide');
    }
    // 三类框体分开打标（互不顶替，可叠加）
    // 1) 点过 2) 库内 3) 心动
    el.classList.remove('is-exc-seen', 'is-exc-lib', 'is-exc-fav', 'is-exc-familiar');
    const seenOnly = isGallerySeen(edition.gid);
    if (seenOnly) el.classList.add('is-exc-seen');
    const inLib = !!(
      lib &&
      (lib.same_version_confirmed || lib.edition_in_library || lib.work_in_library)
    );
    if (inLib) el.classList.add('is-exc-lib');

    // 封面 host：点过/库内描边仍打在图上
    let coverHost =
      el.querySelector('.glthumb') ||
      el.querySelector('.gl1e') ||
      el.querySelector('.gl3t') ||
      el.querySelector('a[href*="/g/"]') ||
      el;
    if (!(coverHost && coverHost.querySelector && coverHost.querySelector('img'))) {
      const img = el.querySelector('img');
      if (img && img.parentElement) coverHost = img.parentElement;
    }
    if (coverHost && coverHost.nodeType === 1) {
      coverHost.classList.add('exc-cover-host');
      const cs = window.getComputedStyle(coverHost);
      if (cs.position === 'static') coverHost.style.position = 'relative';
    }

    // 徽章左上 + 标签流左下，都挂卡片框
    const badgeHost = el;
    if (badgeHost && badgeHost.nodeType === 1) {
      badgeHost.classList.add('exc-card-badge-host');
      const cs = window.getComputedStyle(badgeHost);
      if (cs.position === 'static') badgeHost.style.position = 'relative';
    }
    try {
      if (coverHost) {
        coverHost
          .querySelectorAll(':scope > .exc-badge-container, :scope > .exc-tag-stream')
          .forEach((n) => n.remove());
      }
    } catch (_) { /* ignore */ }

    const ensureBox = (cls) => {
      let box = badgeHost && badgeHost.querySelector(':scope > .' + cls);
      if (badgeHost && !box) {
        box = document.createElement('div');
        box.className = cls;
        badgeHost.appendChild(box);
      }
      return box;
    };
    const badgeBox = ensureBox('exc-badge-container');
    const streamBox = ensureBox('exc-tag-stream');

    const renderMetaHtml = (items) =>
      items
        .map((x) => {
          const tip = x.title ? ' title="' + escapeHtml(x.title) + '"' : '';
          if (x.act) {
            return (
              '<button type="button" class="meta-tag ' +
              (x.cls || '') +
              ' exc-meta-act"' +
              tip +
              ' data-exc-meta="' +
              escapeHtml(x.act) +
              '">' +
              escapeHtml(x.t) +
              '</button>'
            );
          }
          return (
            '<span class="meta-tag ' +
            (x.cls || '') +
            '"' +
            tip +
            '>' +
            escapeHtml(x.t) +
            '</span>'
          );
        })
        .join('');

    if (badgeBox || streamBox) {
      const topTags = [];
      const streamTags = [];
      const edTitle = edition.title_raw || edition.title || partial.title_raw || partial.title || '';
      const edTags = (() => {
        const set = new Set();
        const add = (arr) =>
          (arr || []).forEach((t) => {
            const s = compactText(t);
            if (s) set.add(s);
          });
        add(edition.tags);
        add(partial.tags);
        return Array.from(set);
      })();

      // —— 左上：状态徽章 ——
      if (lib && lib.same_version_confirmed) {
        topTags.push({ t: '同源✓', cls: 'ok', title: '已手动确认与库内为同一版本' });
      } else if (lib && lib.edition_in_library) topTags.push({ t: '本版在库', cls: 'ok' });
      else if (lib && lib.work_in_library) {
        const tip = libraryCompareTip(lib);
        const short =
          lib.library_compare && lib.library_compare.diffs && lib.library_compare.diffs.length
            ? (lib.library_compare.short_label || '库内有').slice(0, 16)
            : '库内有';
        topTags.push({ t: short, cls: 'ok', title: tip || '本 Work 库内已有版本' });
      } else if (lib && lib.maybe_in_library) {
        const label = maybeLibLabel(lib);
        topTags.push({
          t: label.slice(0, 16),
          cls:
            lib.library_compare && lib.library_compare.online_better
              ? 'maybe hot'
              : 'maybe',
          title: libraryCompareTip(lib) || '可能在库，点绑定 LRR 确认',
          act: 'bind',
        });
      }
      if (lib && lib.has_better_remote && !lib.same_version_confirmed) {
        topTags.push({ t: '有更好版', cls: 'hot' });
      }
      if (work && work.blocked) topTags.push({ t: '抛弃', cls: 'warn' });

      try {
        if (typeof matchFamiliarRadar === 'function') {
          const fam = matchFamiliarRadar(edTitle, edTags);
          if (fam && fam.name) {
            el.classList.add('is-exc-familiar');
            topTags.unshift({
              t: (fam.kind === 'group' ? '团队: ' : '画师: ') + String(fam.name).slice(0, 14),
              cls: fam.kind === 'group' ? 'familiar-group' : 'familiar-artist',
              title: '熟人 · ' + (fam.kind === 'group' ? '团队' : '画师') + ' · ' + fam.name,
            });
          }
        }
      } catch (_) { /* ignore */ }

      const favHits =
        typeof matchFavTags === 'function'
          ? matchFavTags(config.fav_tags || [], edTags, edTitle)
          : [];
      if (favHits.length) el.classList.add('is-exc-fav');
      favHits.slice(0, 2).forEach((ft) => {
        topTags.unshift({ t: '♥ ' + String(ft).slice(0, 12), cls: 'hot', title: '心动标签: ' + ft });
      });
      if (favHits.length > 2) {
        topTags.unshift({
          t: '♥+' + (favHits.length - 2),
          cls: 'hot',
          title: '更多心动: ' + favHits.slice(2).join(', '),
        });
      }

      // —— 左下：标签流（码级/内容/角色）——
      if (config.list_show_tag_stream !== false && typeof pickHighlightTags === 'function') {
        const hi = pickHighlightTags(edTags, {
          max: Number(config.list_tag_stream_max) || 3,
          favTags: config.fav_tags || [],
          title: edTitle,
        });
        hi.forEach((item) => {
          const label =
            typeof formatHighlightTagLabel === 'function'
              ? formatHighlightTagLabel(item)
              : item.name;
          streamTags.push({
            t: label,
            cls: 'stream',
            title: item.full || item.name,
          });
        });
      }
      // 码级简写可跟标签流一起放左下（标题常没有）
      if (edition.censor_tier && edition.censor_tier !== 'unknown') {
        const cs = shortCensor(edition.censor_tier) || edition.censor_tier;
        if (cs && !streamTags.some((x) => x.t === cs)) {
          streamTags.unshift({ t: cs, cls: 'stream', title: '码级' });
        }
      }

      if (badgeBox) {
        const showTop = topTags.slice(0, 6);
        const moreTop = topTags.length - showTop.length;
        badgeBox.innerHTML =
          '<div class="exc-meta-overlay">' +
          renderMetaHtml(showTop) +
          (moreTop > 0 ? '<span class="meta-tag more">+' + moreTop + '</span>' : '') +
          '</div>';
        badgeBox.onclick = async (ev) => {
          const btn = ev.target && ev.target.closest && ev.target.closest('[data-exc-meta]');
          if (!btn) return;
          ev.preventDefault();
          ev.stopPropagation();
          const act = btn.getAttribute('data-exc-meta');
          try {
            if (act === 'bind') await openBindModal(edition);
          } catch (err) {
            showToast('操作失败: ' + ((err && err.message) || err));
          }
        };
      }
      if (streamBox) {
        if (streamTags.length) {
          streamBox.innerHTML =
            '<div class="exc-meta-overlay">' + renderMetaHtml(streamTags.slice(0, 4)) + '</div>';
          streamBox.hidden = false;
        } else {
          streamBox.innerHTML = '';
          streamBox.hidden = true;
        }
      }
    }

    let tools = coverHost && coverHost.querySelector(':scope > .exc-tool-bar');
    if (coverHost && !tools) {
      tools = document.createElement('div');
      tools.className = 'exc-tool-bar';
      coverHost.appendChild(tools);
    }
    if (tools) {
      const blockOn = work && work.blocked;
      // 当前列表是否可追更 + 是否已是断点作品
      const pageCtx = parseExhPageContext(location.href);
      let isBpWork = false;
      let trkRec = null;
      if (pageCtx && pageCtx.trackable) {
        try {
          trkRec =
            typeof findTrackingForContext === 'function'
              ? await findTrackingForContext(pageCtx)
              : await getTrackingBySignature(pageCtx.query_signature);
          if (trkRec && trkRec.id) {
            el.dataset.excTrackId = String(trkRec.id);
            if (trkRec.last_page != null) el.dataset.excTrackLastPage = String(trkRec.last_page);
          }
          if (trkRec && String(trkRec.breakpoint_gid || '') === String(edition.gid)) {
            isBpWork = true;
            el.classList.add('is-exc-breakpoint');
          }
          // 浏览列表时回填最新/断点的发布时间
          if (trkRec) {
            const isTop = String(trkRec.top_gid || '') === String(edition.gid);
            const isBp = String(trkRec.breakpoint_gid || '') === String(edition.gid);
            let posted =
              Number(edition.posted_at) ||
              Number(partial.posted_at) ||
              extractListItemPostedAt(el, edition.gid) ||
              0;
            // 仅对最新/断点作品走 gdata，避免列表刷爆 API
            if (!posted && (isTop || isBp)) {
              posted = await resolveGalleryPostedMs(
                edition.gid,
                edition.token || partial.token || '',
                el
              );
            }
            let trkDirty = false;
            if (isTop) {
              if (edition.token || partial.token) {
                trkRec.top_token = compactText(edition.token || partial.token);
              }
              if (posted && (!(Number(trkRec.top_posted_at) > 0) || Number(trkRec.top_posted_at) !== posted)) {
                trkRec.top_posted_at = posted;
                trkDirty = true;
              }
              const tt = compactText(partial.title_raw || edition.title_raw || '');
              if (tt && tt !== trkRec.top_title) {
                trkRec.top_title = tt.slice(0, 160);
                trkDirty = true;
              }
              if (partial.thumb || edition.thumb) {
                applyTrackingCoverFields(trkRec, partial.thumb || edition.thumb);
                trkDirty = true;
              }
            }
            if (isBp) {
              if (edition.token || partial.token) {
                trkRec.breakpoint_token = compactText(edition.token || partial.token);
              }
              if (
                posted &&
                (!(Number(trkRec.breakpoint_posted_at) > 0) ||
                  Number(trkRec.breakpoint_posted_at) !== posted)
              ) {
                trkRec.breakpoint_posted_at = posted;
                trkDirty = true;
              }
              const bt = compactText(partial.title_raw || edition.title_raw || '');
              if (bt && bt !== trkRec.breakpoint_title) {
                trkRec.breakpoint_title = bt.slice(0, 120);
                trkDirty = true;
              }
            }
            if (trkDirty) {
              await saveTrackingRecord(trkRec);
            }
          }
        } catch (_) { /* ignore */ }
      }
      // 作品级断点按钮：封面右下角「断」——不是顶栏整页断点
      const bpBtn =
        pageCtx && pageCtx.trackable
          ? '<button type="button" class="exc-tool-btn' +
            (isBpWork ? ' is-on is-bp' : '') +
            '" data-exc-act="breakpoint" title="设为追更断点（本作品）">断</button>'
          : '';
      tools.innerHTML =
        bpBtn +
        '<button type="button" class="exc-tool-btn" data-exc-act="best" title="最佳版">↗</button>' +
        '<button type="button" class="exc-tool-btn" data-exc-act="bind" title="绑定 LRR">📦</button>' +
        '<button type="button" class="exc-tool-btn' +
        (blockOn ? ' is-block is-on' : '') +
        '" data-exc-act="drop" title="抛弃/屏蔽此单本">✕</button>';

      tools.onclick = async (ev) => {
        const btn = ev.target && ev.target.closest && ev.target.closest('[data-exc-act]');
        if (!btn) return;
        ev.preventDefault();
        ev.stopPropagation();
        const act = btn.getAttribute('data-exc-act');
        try {
          if (act === 'breakpoint') {
            const ctx = parseExhPageContext(location.href);
            if (!ctx || !ctx.trackable) {
              showToast('当前页不能设断点');
              return;
            }
            let rec =
              typeof findTrackingForContext === 'function'
                ? await findTrackingForContext(ctx)
                : await getTrackingBySignature(ctx.query_signature);
            if (!rec) {
              rec = await saveCurrentPageAsTracking();
              if (!rec) return;
            }
            const postedLocal =
              Number(edition.posted_at) ||
              Number(partial.posted_at) ||
              extractListItemPostedAt(el, edition.gid) ||
              0;
            await markTrackingBreakpoint(rec, {
              gid: edition.gid,
              token: edition.token || partial.token || '',
              title: compactText(
                edition.title_raw || partial.title_raw || edition.title || partial.title || ''
              ),
              posted_at: postedLocal,
              root: el,
            });
            let bpPosted = '';
            try {
              const latest =
                typeof findTrackingForContext === 'function'
                  ? await findTrackingForContext(ctx)
                  : await getTrackingBySignature(ctx.query_signature);
              bpPosted = formatTrackingPostedShort(latest && latest.breakpoint_posted_at);
            } catch (_) { /* ignore */ }
            const pgSt =
              typeof getListPageState === 'function'
                ? getListPageState(location.href, document)
                : null;
            const pgBit = pgSt
              ? pgSt.known && pgSt.index >= 0
                ? '列表第 ' + (pgSt.index + 1) + ' 页'
                : pgSt.isFirst
                  ? '列表第 1 页'
                  : '列表深页（游标）'
              : '列表第 ' + (Math.max(0, getCurrentListPageIndex()) + 1) + ' 页';
            showToast(
              '已设断点' + (bpPosted ? ' · ' + bpPosted : '') + ' · ' + pgBit
            );
            // 刷新本页作品工具条状态
            document.querySelectorAll('.exc-gl-item.is-exc-breakpoint').forEach((n) => {
              n.classList.remove('is-exc-breakpoint');
            });
            el.classList.add('is-exc-breakpoint');
            await enhanceListItemForce(el);
            if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
            void refreshTrackingBarState();
            return;
          }
          if (act === 'drop' || act === 'block') {
            const next = !(work && work.blocked);
            await setWorkBlocked(edition.work_id, next);
            try {
              await setWorkStatus(edition.work_id, next ? 'dropped' : 'none');
            } catch (_) { /* ignore */ }
          } else if (act === 'best') {
            await openBestEdition(edition.work_id);
            return;
          } else if (act === 'bind') {
            await openBindModal(edition);
            return;
          }
          await enhanceListItemForce(el);
          if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
        } catch (err) {
          showToast('操作失败: ' + ((err && err.message) || err));
        }
      };
    }

    const legacy = el.querySelector('.exc-enhance-host');
    if (legacy) legacy.remove();

    // 点开：记追更上下文、乐观跟断点、立即已点
    if (el.dataset.excTrackOpenBound !== '1') {
      el.dataset.excTrackOpenBound = '1';
      el.addEventListener(
        'click',
        (ev) => {
          const a = ev.target && ev.target.closest && ev.target.closest('a[href*="/g/"]');
          if (!a) return;
          if (
            ev.target.closest &&
            ev.target.closest('.exc-tool-bar, .exc-meta-overlay, [data-exc-act], [data-exc-meta]')
          ) {
            return;
          }
          try {
            const gid = el.dataset.excGid || '';
            // 立即「已点」渲染（新标签打开时列表页还在）
            if (gid && typeof markGallerySeen === 'function') {
              markGallerySeen(gid);
              el.classList.add('is-exc-seen');
            }

            const tid = el.dataset.excTrackId || '';
            if (!tid) return;
            const st =
              typeof getListPageState === 'function'
                ? getListPageState(location.href, document)
                : null;
            let listIndex = -1;
            let pageLen = 0;
            try {
              const gids =
                typeof extractOrderedGidsFromDocument === 'function'
                  ? extractOrderedGidsFromDocument(document)
                  : [];
              pageLen = gids.length || 0;
              listIndex = gid && gids.length ? gids.indexOf(String(gid)) : -1;
            } catch (_) { /* ignore */ }
            let pageIndex = st && st.known ? st.index : -1;
            if (!(pageIndex >= 0) || (st && st.isFirst === false && !(pageIndex > 0))) {
              const lp = parseInt(el.dataset.excTrackLastPage || '', 10);
              if (Number.isFinite(lp) && lp > 0) pageIndex = lp;
            }
            try {
              const depthKey = 'exc_trk_depth_' + tid;
              const urlKey = 'exc_trk_url_' + tid;
              if (st && st.isFirst) {
                sessionStorage.setItem(depthKey, '0');
                sessionStorage.setItem(urlKey, location.href.split('#')[0]);
                pageIndex = 0;
              } else if (pageIndex > 0) {
                sessionStorage.setItem(depthKey, String(pageIndex));
                sessionStorage.setItem(urlKey, location.href.split('#')[0]);
              } else {
                const prevUrl = sessionStorage.getItem(urlKey) || '';
                const curUrl = location.href.split('#')[0];
                let depth = parseInt(sessionStorage.getItem(depthKey) || '-1', 10);
                if (prevUrl && curUrl !== prevUrl && /[?&](next|prev)=/i.test(curUrl)) {
                  depth = (Number.isFinite(depth) && depth >= 0 ? depth : 0) + 1;
                  sessionStorage.setItem(depthKey, String(depth));
                }
                sessionStorage.setItem(urlKey, curUrl);
                if (!(pageIndex > 0) && Number.isFinite(depth) && depth > 0) pageIndex = depth;
              }
            } catch (_) { /* ignore */ }

            const postedAt =
              Number(edition.posted_at) ||
              Number(partial.posted_at) ||
              (typeof extractListItemPostedAt === 'function'
                ? extractListItemPostedAt(el, gid)
                : 0) ||
              0;
            const pending = {
              trackingId: tid,
              gid: gid,
              token: el.dataset.excToken || edition.token || '',
              title: compactText(
                edition.title_raw || partial.title_raw || edition.title || partial.title || ''
              ),
              posted_at: postedAt,
              listUrl: location.href,
              pageIndex: pageIndex,
              pageMode: (st && st.mode) || '',
              listIndex: listIndex,
              pageLen: pageLen,
            };
            if (typeof setPendingTrackingOpen === 'function') {
              setPendingTrackingOpen(pending);
            }
            // 列表侧乐观跟断点（新标签时画廊页也会再跑一遍，幂等）
            void maybeAutoAdvanceTrackingBreakpoint(
              {
                gid: gid,
                token: pending.token,
                posted_at: postedAt,
                title_raw: pending.title,
              },
              partial,
              { pending: pending, skipUnreadScan: true }
            ).then((advanced) => {
              if (!advanced) return;
              // 更新本页断点高亮
              document.querySelectorAll('.exc-gl-item.is-exc-breakpoint').forEach((n) => {
                n.classList.remove('is-exc-breakpoint');
                const btn = n.querySelector('[data-exc-act="breakpoint"]');
                if (btn) btn.classList.remove('is-on', 'is-bp');
              });
              el.classList.add('is-exc-breakpoint');
              const bpBtn = el.querySelector('[data-exc-act="breakpoint"]');
              if (bpBtn) bpBtn.classList.add('is-on', 'is-bp');
              if (typeof refreshTrackingBarState === 'function') void refreshTrackingBarState();
            });
          } catch (_) { /* ignore */ }
        },
        true
      );
    }

    return { el, edition, work, lib, coverHost };
  }

  async function enhanceListItemForce(el) {
    el.dataset.excEnhanced = '';
    el.classList.remove(
      'is-exc-blocked',
      'exc-hide',
      'is-exc-fav',
      'is-exc-lib',
      'is-exc-seen',
      'is-exc-breakpoint',
      'is-exc-folded-child'
    );
    return enhanceListItem(el);
  }

  async function openBestEdition(workId) {
    const editions = await listEditionsByWork(workId);
    const best = pickBestEdition(editions, config);
    if (!best) {
      const works = await idbGet(STORE_WORKS, workId);
      if (works) {
        const sample = editions[0];
        if (sample) {
          const lib = await resolveLibraryState(sample);
          const arc = (lib.work_archives || lib.exact_archives || [])[0];
          if (arc) {
            const u = buildLrrReaderUrl(arc.arcid);
            if (u) {
              window.open(u, '_blank');
              return;
            }
          }
        }
      }
      showToast('暂无可用版本');
      return;
    }
    const url = best.url || buildGalleryUrl(location.origin, best.gid, best.token);
    if (config.open_best_in_new_tab) window.open(url, '_blank');
    else location.href = url;
  }

  function describePrimaryEdition(ed) {
    if (!ed) return '';
    const bits = [];
    if (ed.language) bits.push(ed.language);
    if (ed.censor_tier && ed.censor_tier !== 'unknown') bits.push(ed.censor_tier);
    if (ed.group) bits.push(ed.group);
    if (ed.pages) bits.push(ed.pages + 'p');
    if (ed.size_bytes) bits.push(formatBytes(ed.size_bytes));
    return bits.join(' · ') || '偏好最佳';
  }

  function getFoldPrimaryMode() {
    const m = config.fold_primary_mode || 'preference';
    return FOLD_PRIMARY_MODES[m] ? m : 'preference';
  }

  function getFoldPrimaryModeLabel(mode) {
    return FOLD_PRIMARY_MODES[mode] || FOLD_PRIMARY_MODES.preference;
  }

  function rankFoldGroup(list) {
    const mode = getFoldPrimaryMode();
    const arr = list.slice();
    arr.forEach((item, idx) => {
      item._listIndex = idx;
    });
    if (mode === 'newest') {
      arr.sort((a, b) => {
        const ta = Number(a.edition && a.edition.posted_at) || 0;
        const tb = Number(b.edition && b.edition.posted_at) || 0;
        if (tb !== ta) return tb - ta;
        return (a._listIndex || 0) - (b._listIndex || 0);
      });
    } else if (mode === 'list_order') {
      arr.sort((a, b) => (a._listIndex || 0) - (b._listIndex || 0));
    } else {
      arr.sort((a, b) => scoreEdition(b.edition, config) - scoreEdition(a.edition, config));
    }
    return arr;
  }

  function applyWorkFold(enhanced) {
    if (!config.list_fold_works) return;
    const groups = new Map();
    for (const item of enhanced) {
      if (!item || !item.edition || !item.edition.work_id) continue;
      const wid = item.edition.work_id;
      if (!groups.has(wid)) groups.set(wid, []);
      groups.get(wid).push(item);
    }
    const mode = getFoldPrimaryMode();
    const modeLabel = getFoldPrimaryModeLabel(mode);

    for (const [, list] of groups) {
      if (list.length < 2) continue;
      const ranked = rankFoldGroup(list);
      const primary = ranked[0];
      list.forEach((x) => {
        x.el.classList.remove('is-exc-folded-child');
        const old = x.el.querySelector('.exc-fold-tag');
        if (old) old.remove();
      });
      ranked.slice(1).forEach((x) => x.el.classList.add('is-exc-folded-child'));

      const hidden = ranked.length - 1;
      let badgeBox =
        (primary.coverHost && primary.coverHost.querySelector('.exc-badge-container')) ||
        primary.el.querySelector('.exc-badge-container');
      if (!badgeBox && primary.coverHost) {
        badgeBox = document.createElement('div');
        badgeBox.className = 'exc-badge-container';
        primary.coverHost.appendChild(badgeBox);
      }
      if (!badgeBox) continue;

      let overlay = badgeBox.querySelector('.exc-meta-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'exc-meta-overlay';
        badgeBox.appendChild(overlay);
      }

      let tag = overlay.querySelector('.exc-fold-tag');
      if (!tag) {
        tag = document.createElement('button');
        tag.type = 'button';
        tag.className = 'meta-tag more exc-fold-tag';
        overlay.appendChild(tag);
      }
      const tip =
        '同作 ' +
        ranked.length +
        ' 个版本\n主显示：' +
        describePrimaryEdition(primary.edition) +
        '\n规则：' +
        modeLabel +
        '\n（工作台 ⚙ 偏好可改）\n点击展开/收起其余 ' +
        hidden +
        ' 个';
      tag.title = tip;
      tag.setAttribute('aria-label', tip);
      tag.textContent = '×' + ranked.length;
      tag.dataset.open = '0';
      tag.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const open = tag.dataset.open === '1';
        tag.dataset.open = open ? '0' : '1';
        ranked.slice(1).forEach((x) => {
          x.el.classList.toggle('is-exc-folded-child', open);
        });
        tag.textContent = open ? '×' + ranked.length : '收起';
        tag.classList.toggle('hot', !open);
      };
    }
  }

  let trackingBarBrowseTimer = null;

  function mountTrackingBar(bar) {
    // 挂在「工具条/顶部分页」之后、「画廊列表」之前，避免贴 #nb 或搜索框上方
    const list =
      document.querySelector('#ido table.itg') ||
      document.querySelector('#ido .itg') ||
      document.querySelector('table.itg') ||
      document.querySelector('.itg') ||
      document.querySelector('#ido .gl1t') ||
      document.querySelector('.gl1t');
    const dms = document.getElementById('dms');
    const topPager =
      document.querySelector('#ido table.ptt') ||
      document.querySelector('table.ptt') ||
      document.querySelector('.ptt');
    const favForm =
      document.querySelector('#favform') ||
      document.querySelector('form[action*="favorites"]') ||
      document.querySelector('#ido form');

    if (list && list.parentNode) {
      // 若顶部分页与列表同父，插在分页后；否则直接在列表前
      let insertBeforeNode = list;
      if (
        topPager &&
        topPager.parentNode === list.parentNode &&
        topPager.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING
      ) {
        // 分页 → [bar] → 列表
        insertBeforeNode = list;
        if (bar.parentNode !== list.parentNode || bar.nextElementSibling !== list) {
          list.parentNode.insertBefore(bar, list);
        }
        return;
      }
      if (dms && dms.parentNode === list.parentNode) {
        // dms → [bar] → 列表（中间可能还有节点，仍贴列表前更稳）
        if (bar.parentNode !== list.parentNode || bar.nextElementSibling !== list) {
          list.parentNode.insertBefore(bar, list);
        }
        return;
      }
      if (bar.parentNode !== list.parentNode || bar.nextElementSibling !== insertBeforeNode) {
        list.parentNode.insertBefore(bar, insertBeforeNode);
      }
      return;
    }

    if (dms && dms.parentNode) {
      // 无列表时：放在 dms 后
      if (bar.previousElementSibling !== dms || bar.parentNode !== dms.parentNode) {
        dms.parentNode.insertBefore(bar, dms.nextSibling);
      }
      return;
    }

    if (favForm && favForm.parentNode) {
      if (bar.previousElementSibling !== favForm || bar.parentNode !== favForm.parentNode) {
        favForm.parentNode.insertBefore(bar, favForm.nextSibling);
      }
      return;
    }

    const ido = document.getElementById('ido') || document.querySelector('.ido');
    if (ido) {
      // 不要 prepend 到 ido 顶：尽量找内容块
      const firstBig = ido.querySelector('.itg, table.ptt, #dms, .gl1t, table');
      if (firstBig && firstBig.parentNode === ido) {
        if (firstBig.id === 'dms' || (firstBig.classList && firstBig.classList.contains('ptt'))) {
          if (bar.previousElementSibling !== firstBig) {
            ido.insertBefore(bar, firstBig.nextSibling);
          }
        } else if (bar.nextElementSibling !== firstBig) {
          ido.insertBefore(bar, firstBig);
        }
      } else if (!bar.parentNode || bar.parentNode !== ido) {
        // 最后手段：插在 ido 末尾附近，而不是最顶
        ido.appendChild(bar);
      }
      return;
    }
    if (!bar.parentNode) document.body.appendChild(bar);
  }

  function injectTrackingBar() {
    const ctx = parseExhPageContext(location.href);
    let bar = document.getElementById('exc-tracking-bar');
    if (!ctx || !ctx.trackable) {
      if (bar) bar.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'exc-tracking-bar';
    }

    // 同一 signature 不重建 DOM（只校正挂载位 + 刷状态），避免收藏页 mutation 闪烁
    if (bar.dataset.sig === ctx.query_signature && bar.dataset.ready === '1') {
      mountTrackingBar(bar);
      void refreshTrackingBarState();
      return;
    }

    mountTrackingBar(bar);

    bar.dataset.sig = ctx.query_signature;
    bar.dataset.ready = '1';
    bar.removeAttribute('style');
    const groupLabel = getTrackingGroupLabel(ctx.group_type);
    bar.innerHTML =
      '<span class="exc-track-label" title="' +
      escapeHtml(ctx.label) +
      '"><b>追更</b> · ' +
      escapeHtml(groupLabel) +
      ' · ' +
      escapeHtml(ctx.label) +
      '</span>' +
      '<span class="exc-track-status" id="exc-track-status">未收藏</span>' +
      '<div class="exc-track-actions">' +
      // 继续断点放最前：有断点时最显眼，不再排在「已追更」后面
      '<button type="button" class="jlc-wb-btn primary exc-track-btn exc-bp-continue" id="exc-goto-bp" hidden title="跳到断点作品并定位">继续断点</button>' +
      '<button type="button" class="jlc-wb-btn ghost exc-track-btn" id="exc-save-tracking">⭐ 收藏追更</button>' +
      '<button type="button" class="jlc-wb-btn ghost exc-track-btn" id="exc-untrack" hidden title="从追更列表移除">取消追更</button>' +
      '</div>' +
      '<div class="exc-track-meta" id="exc-track-meta" hidden></div>';

    const btn = document.getElementById('exc-save-tracking');
    if (btn) {
      btn.onclick = async () => {
        await saveCurrentPageAsTracking();
        void refreshTrackingBarState();
      };
    }
    const gotoBp = document.getElementById('exc-goto-bp');
    if (gotoBp) {
      gotoBp.onclick = async () => {
        const rec =
          typeof findTrackingForContext === 'function'
            ? await findTrackingForContext(ctx)
            : await getTrackingBySignature(ctx.query_signature);
        if (!rec) return;
        await openTrackingBreakpoint(rec);
      };
    }
    const untrack = document.getElementById('exc-untrack');
    if (untrack) {
      untrack.onclick = async () => {
        const rec =
          typeof findTrackingForContext === 'function'
            ? await findTrackingForContext(ctx)
            : await getTrackingBySignature(ctx.query_signature);
        if (!rec) return;
        if (!confirm('取消追更「' + getTrackingDisplayTitle(rec) + '」？')) return;
        await deleteTrackingRecord(rec.id);
        showToast('已取消追更');
        void refreshTrackingBarState();
        if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
      };
    }
    void refreshTrackingBarState();
  }

  async function refreshTrackingBarState() {
    const ctx = parseExhPageContext(location.href);
    const bar = document.getElementById('exc-tracking-bar');
    const btn = document.getElementById('exc-save-tracking');
    const status = document.getElementById('exc-track-status');
    const gotoBp = document.getElementById('exc-goto-bp');
    const untrack = document.getElementById('exc-untrack');
    const meta = document.getElementById('exc-track-meta');
    if (!ctx || !ctx.trackable || !bar || !btn) return;

    const rec =
      typeof findTrackingForContext === 'function'
        ? await findTrackingForContext(ctx)
        : await getTrackingBySignature(ctx.query_signature);
    const pageState =
      typeof getListPageState === 'function'
        ? getListPageState(location.href, document)
        : {
            index: getCurrentListPageIndex(),
            known: true,
            isFirst: getCurrentListPageIndex() === 0,
            mode: 'page',
            display: String((getCurrentListPageIndex() || 0) + 1),
          };
    const pageIdx = pageState.known && pageState.index >= 0 ? pageState.index : -1;
    const pageDisp =
      pageState.display ||
      (typeof formatListPageDisplay === 'function'
        ? formatListPageDisplay(pageState)
        : pageIdx >= 0
          ? String(pageIdx + 1)
          : '深页');
    const isFirstPage = pageState.isFirst === true;

    if (rec) {
      // 翻页时维护 session 深度，点开作品才能正确下调未读
      try {
        if (rec.id) {
          const depthKey = 'exc_trk_depth_' + rec.id;
          const urlKey = 'exc_trk_url_' + rec.id;
          const curUrl = location.href.split('#')[0];
          if (isFirstPage) {
            sessionStorage.setItem(depthKey, '0');
          } else if (pageIdx > 0) {
            sessionStorage.setItem(depthKey, String(pageIdx));
          } else {
            const prevUrl = sessionStorage.getItem(urlKey) || '';
            let depth = parseInt(sessionStorage.getItem(depthKey) || '-1', 10);
            if (prevUrl && curUrl !== prevUrl && /[?&](next|prev)=/i.test(curUrl)) {
              depth = (Number.isFinite(depth) && depth >= 0 ? depth : 0) + 1;
              sessionStorage.setItem(depthKey, String(depth));
            }
          }
          sessionStorage.setItem(urlKey, curUrl);
          const d = parseInt(sessionStorage.getItem(depthKey) || '', 10);
          if (Number.isFinite(d) && d >= 0) {
            document.querySelectorAll('.exc-gl-item[data-exc-track-id="' + rec.id + '"]').forEach((el) => {
              el.dataset.excTrackLastPage = String(d);
            });
          }
        }
      } catch (_) { /* ignore */ }
      bar.classList.add('is-tracked');
      if (status) status.textContent = '已追更';
      btn.textContent = '✓ 已追更';
      btn.classList.remove('primary');
      btn.classList.add('ghost');
      btn.title = '已在追更列表';
      if (untrack) untrack.hidden = false;
      const hasBp = trackingHasAnyBreakpoint(rec);
      if (gotoBp) {
        gotoBp.hidden = !hasBp;
        if (hasBp) {
          const bpPage = Number(rec.breakpoint_page);
          const bpPageLabel =
            Number.isFinite(bpPage) && bpPage >= 0
              ? String(bpPage + 1)
              : rec.breakpoint_page_mode === 'cursor' || bpPage < 0
                ? '深页'
                : '1';
          const bpPosted = getTrackingBpMetaLabel(rec);
          const bpTitle = shortTrackingWorkLabel(
            rec.breakpoint_title,
            rec.breakpoint_gid,
            40
          );
          gotoBp.textContent = bpPosted
            ? '继续断点 · ' + bpPosted
            : '继续断点 · 第' + bpPageLabel + '页';
          gotoBp.title =
            '定位断点作品' +
            (bpTitle ? '「' + bpTitle + '」' : '') +
            (bpPosted ? ' · ' + bpPosted : '') +
            '（列表第 ' +
            bpPageLabel +
            ' 页）· 在封面点「断」可改断点';
        }
      }
      if (meta) {
        meta.hidden = false;
        const bits = [
          pageState.mode === 'cursor' && !pageState.known
            ? '当前深页（游标 next/prev）'
            : '当前第 ' + pageDisp + ' 页',
        ];
        if (rec.breakpoint_gid || rec.breakpoint_posted_at || rec.breakpoint_title) {
          bits.push('断点 ' + (getTrackingBpMetaLabel(rec) || '已设'));
        }
        if (hasBp) {
          const bpPage = Number(rec.breakpoint_page);
          const bpPageLabel =
            Number.isFinite(bpPage) && bpPage >= 0
              ? String(bpPage + 1)
              : '深页';
          bits.push('断点第' + bpPageLabel + '页');
        }
        if (
          typeof trackingHasPendingUpdate === 'function'
            ? trackingHasPendingUpdate(rec)
            : rec.has_update ||
              (rec.top_gid && rec.breakpoint_gid && rec.top_gid !== rec.breakpoint_gid)
        ) {
          const n =
            typeof getTrackingUnreadEstimate === 'function' ? getTrackingUnreadEstimate(rec) : 0;
          bits.push(n > 0 ? (rec.unread_estimate_capped ? '+' + n + '+ 未读' : '+' + n + ' 未读') : '有更新');
        }
        bits.push('封面右下角「断」= 设作品断点');
        meta.textContent = bits.join(' · ');
      }
      // 轻量记浏览页（防抖）；深页/游标页绝不改写 top_gid
      if (trackingBarBrowseTimer) clearTimeout(trackingBarBrowseTimer);
      trackingBarBrowseTimer = setTimeout(async () => {
        try {
          const latest =
            typeof findTrackingForContext === 'function'
              ? await findTrackingForContext(ctx)
              : await getTrackingBySignature(ctx.query_signature);
          if (!latest) return;
          latest.last_page = pageIdx;
          latest.last_browsed_at = nowMs();
          if (latest.open_url && typeof canonicalizeTrackingOpenUrl === 'function') {
            const canon = canonicalizeTrackingOpenUrl(latest.open_url);
            if (latest.open_url !== canon) {
              latest.open_url = canon;
              latest.page_url = canon;
            }
          }
          // 仅真·首页才更新「最新」；深页/游标只估未读
          if (isFirstPage && ctx.top_gid) {
            const previousTop = compactText(latest.top_gid || '');
            if (latest.top_gid && latest.top_gid !== ctx.top_gid) {
              latest.has_update = 1;
              latest.prev_top_gid = latest.top_gid;
            }
            if (
              latest.breakpoint_gid &&
              String(latest.breakpoint_gid) !== String(ctx.top_gid)
            ) {
              latest.has_update = 1;
            }
            latest.top_gid = ctx.top_gid;
            if (ctx.top_title) latest.top_title = compactText(ctx.top_title).slice(0, 160);
            if (ctx.top_posted_at) latest.top_posted_at = Number(ctx.top_posted_at) || 0;
            if (ctx.top_cover) applyTrackingCoverFields(latest, ctx.top_cover);
            try {
              const gids =
                typeof extractOrderedGidsFromDocument === 'function'
                  ? extractOrderedGidsFromDocument(document)
                  : [];
              if (typeof applyTrackingUnreadFromGids === 'function') {
                applyTrackingUnreadFromGids(latest, gids, ctx.top_gid || latest.top_gid || '', {
                  previousTop: previousTop,
                  pageIndex: 0,
                  isFirst: true,
                  mode: 'absolute',
                });
              }
            } catch (_) { /* ignore */ }
          } else if (!isFirstPage && latest.breakpoint_gid) {
            // 深页浏览：只记位置；未读禁止用当页局部覆盖（next= 会把 +200 打成 +23）
            // 已知 page=N 时才允许用页偏移抬高下限
            try {
              if (pageState.known && pageIdx >= 0) {
                const gids =
                  typeof extractOrderedGidsFromDocument === 'function'
                    ? extractOrderedGidsFromDocument(document)
                    : [];
                if (typeof applyTrackingUnreadFromGids === 'function') {
                  applyTrackingUnreadFromGids(latest, gids, latest.top_gid || '', {
                    pageIndex: pageIdx,
                    isFirst: false,
                    deepUnknown: false,
                    mode: 'browse',
                  });
                }
              } else {
                // 游标深页：最多维持 has_update，不改 unread_estimate
                if (
                  latest.top_gid &&
                  latest.breakpoint_gid &&
                  String(latest.top_gid) !== String(latest.breakpoint_gid)
                ) {
                  latest.has_update = 1;
                }
              }
            } catch (_) { /* ignore */ }
          }
          await saveTrackingRecord(latest);
        } catch (_) { /* ignore */ }
      }, 800);
    } else {
      bar.classList.remove('is-tracked');
      if (status) status.textContent = '未收藏';
      btn.textContent = '⭐ 收藏追更';
      btn.title = '收藏当前搜索到追更';
      if (gotoBp) gotoBp.hidden = true;
      if (untrack) untrack.hidden = true;
      if (meta) {
        meta.hidden = false;
        meta.textContent =
          (pageState.mode === 'cursor' && !pageState.known
            ? '当前深页（游标）'
            : '当前列表第 ' + pageDisp + ' 页') +
          ' · 在任意作品封面右下角点「断」设为断点作品';
      }
    }
  }

  async function enhanceListPage() {
    bindListLiveRefresh();
    injectTrackingBar();
    const items = queryListItems();
    const enhanced = [];
    let n = 0;
    for (const el of items) {
      const r = await enhanceListItem(el);
      if (r) enhanced.push(r);
      n++;
      if (n % 10 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    applyWorkFold(enhanced);
    tryConsumeBreakpointScroll();
    return enhanced.length;
  }

  /**
   * 把画廊增强面板放到封面/信息浮动块之后（与 #gleft #gmid #gright 同级）。
   */
  function placeGalleryPanel(panel) {
    if (!panel) return;
    const gleft = document.getElementById('gleft');
    const gmid = document.getElementById('gmid');
    const gright = document.getElementById('gright');
    const gd2 = document.getElementById('gd2');
    // 取同级浮动块中 DOM 顺序最后的一个，插在其后
    const floats = [gleft, gd2, gmid, gright].filter(Boolean);
    let last = null;
    for (const el of floats) {
      if (!last) {
        last = el;
        continue;
      }
      // 若 el 在 last 之后
      if (last.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) {
        last = el;
      }
    }
    const parent = (last && last.parentNode) || document.body;
    if (panel.parentNode === parent && last && last.nextSibling === panel) return;
    if (last) parent.insertBefore(panel, last.nextSibling);
    else parent.appendChild(panel);
  }

  /** 点击是否比断点更新（EH：更小页码 / 同页更前 / 时间 / gid） */
  function isClickNewerThanBreakpoint(pending, rec, edition, partial) {
    if (!rec) return false;
    const curGid = String((edition && edition.gid) || pending.gid || '');
    const bpGid = compactText(rec.breakpoint_gid || '');
    if (!curGid) return false;
    if (!bpGid) return true;
    if (bpGid === curGid) return false;

    // 1) 列表位置：EH 第 1 页最新；页码 0-based 越小越新
    const pPage = Number(pending && pending.pageIndex);
    const bpPage = Number(rec.breakpoint_page);
    const pIdx = Number(pending && pending.listIndex);
    if (Number.isFinite(pPage) && pPage >= 0 && Number.isFinite(bpPage) && bpPage >= 0) {
      if (pPage < bpPage) return true;
      if (pPage > bpPage) return false;
      // 同页：列表序号越小越新
      if (Number.isFinite(pIdx) && pIdx >= 0) {
        // 若断点也在本页 DOM 里，用位置比
        try {
          if (typeof extractOrderedGidsFromDocument === 'function' && detectPageKind() !== 'gallery') {
            const gids = extractOrderedGidsFromDocument(document) || [];
            const bpAt = gids.indexOf(String(bpGid));
            if (bpAt >= 0) return pIdx < bpAt;
          }
        } catch (_) { /* ignore */ }
        // 无断点位置：同页仍倾向跟进（用户从断点往新翻）
        return true;
      }
    }

    // 2) 发布时间
    const curPosted =
      Number(edition && edition.posted_at) ||
      Number(partial && partial.posted_at) ||
      Number(pending && pending.posted_at) ||
      0;
    const bpPosted = Number(rec.breakpoint_posted_at) || 0;
    if (curPosted > 0 && bpPosted > 0) return curPosted > bpPosted;

    // 3) gid 近似（通常新作更大）
    const a = Number(curGid) || 0;
    const b = Number(bpGid) || 0;
    if (a > 0 && b > 0 && a !== b) return a > b;

    // 4) 有追更列表上下文但比不出新旧：默认跟进（用户主动点开）
    return true;
  }

  /**
   * 若比断点更新则跟进。opts.pending 有则用列表上下文（不消费 session）。
   */
  async function maybeAutoAdvanceTrackingBreakpoint(edition, partial, opts) {
    opts = opts || {};
    let pending = opts.pending || null;
    if (!pending) {
      if (typeof takePendingTrackingOpen !== 'function') return null;
      pending = takePendingTrackingOpen();
    }
    if (!pending || !pending.trackingId) return null;
    if (edition && pending.gid && String(pending.gid) !== String(edition.gid)) return null;

    const rec = await idbGet(STORE_TRACKING, pending.trackingId);
    if (!rec) return null;

    const ed = edition || {
      gid: pending.gid,
      token: pending.token,
      posted_at: pending.posted_at,
      title_raw: pending.title,
    };
    if (!isClickNewerThanBreakpoint(pending, rec, ed, partial)) return null;

    const curPosted =
      Number(ed.posted_at) ||
      Number(partial && partial.posted_at) ||
      Number(pending.posted_at) ||
      0;

    await markTrackingBreakpoint(rec, {
      fromGallery: true,
      gid: ed.gid,
      token: ed.token || pending.token || '',
      title: compactText(
        ed.title_raw || (partial && partial.title_raw) || ed.title || pending.title || ''
      ),
      posted_at: curPosted,
      listUrl: pending.listUrl || rec.breakpoint_url || rec.open_url || '',
      pageIndex: pending.pageIndex,
      pageMode: pending.pageMode || '',
      listIndex: pending.listIndex,
      pageLen: pending.pageLen,
      skipUnreadScan: opts.skipUnreadScan === true,
    });
    showToast('断点已跟到当前作品');
    if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
    return rec;
  }

  /** 列表页回前台时重绘已点/断点/徽章 */
  let listLiveRefreshTimer = null;
  function scheduleListLiveRefresh(reason) {
    if (listLiveRefreshTimer) clearTimeout(listLiveRefreshTimer);
    listLiveRefreshTimer = setTimeout(() => {
      listLiveRefreshTimer = null;
      try {
        const kind = detectPageKind();
        if (kind === 'gallery' || kind === 'image') return;
        document.querySelectorAll('.exc-gl-item').forEach((el) => {
          el.dataset.excEnhanced = '';
        });
        enhanceListPage().catch(() => {});
        if (typeof refreshTrackingBarState === 'function') {
          void refreshTrackingBarState();
        }
        if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
      } catch (e) {
        console.warn('[ExC] list live refresh', reason, e);
      }
    }, 200);
  }

  function bindListLiveRefresh() {
    if (window.__excListLiveBound) return;
    window.__excListLiveBound = true;
    window.addEventListener('pageshow', () => scheduleListLiveRefresh('pageshow'));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') scheduleListLiveRefresh('visible');
    });
    window.addEventListener('focus', () => scheduleListLiveRefresh('focus'));
  }

  /** 兄弟版本缺体积/时间/码级时 gdata 补全 */
  async function enrichSiblingEditionsMeta(siblings) {
    const list = (siblings || []).filter(Boolean);
    if (!list.length || typeof fetchGalleryGdataBatch !== 'function') return 0;
    const need = list.filter((ed) => {
      if (!ed.token) return false;
      return (
        !(Number(ed.size_bytes) > 0) ||
        !(Number(ed.posted_at) > 0) ||
        !(Number(ed.pages) > 0) ||
        !ed.censor_tier ||
        ed.censor_tier === 'unknown' ||
        !ed.language ||
        ed.language === 'other'
      );
    });
    if (!need.length) return 0;
    const pairs = need.slice(0, 25).map((ed) => ({ gid: ed.gid, token: ed.token }));
    let gmap = {};
    try {
      gmap = await fetchGalleryGdataBatch(pairs);
    } catch (_) {
      return 0;
    }
    let n = 0;
    for (let i = 0; i < need.length; i++) {
      const ed = need[i];
      const gm = gmap[String(ed.gid)];
      if (!gm) continue;
      let dirty = false;
      if (gm.posted_at && !(Number(ed.posted_at) > 0)) {
        ed.posted_at = gm.posted_at;
        dirty = true;
      }
      if (gm.pages && !(Number(ed.pages) > 0)) {
        ed.pages = gm.pages;
        dirty = true;
      }
      if (gm.size_bytes && !(Number(ed.size_bytes) > 0)) {
        ed.size_bytes = gm.size_bytes;
        dirty = true;
      }
      if (gm.censor_tier && gm.censor_tier !== 'unknown' && (!ed.censor_tier || ed.censor_tier === 'unknown')) {
        ed.censor_tier = gm.censor_tier;
        dirty = true;
      }
      if (gm.language && gm.language !== 'other' && (!ed.language || ed.language === 'other')) {
        ed.language = gm.language;
        dirty = true;
      }
      if (gm.group && !ed.group) {
        ed.group = gm.group;
        dirty = true;
      }
      if (gm.tags && gm.tags.length && !(ed.tags && ed.tags.length)) {
        ed.tags = gm.tags;
        dirty = true;
      }
      if (gm.title_raw && (!ed.title_raw || ed.title_raw.length < gm.title_raw.length)) {
        ed.title_raw = gm.title_raw;
        dirty = true;
      }
      if (dirty) {
        ed.updated_at = nowMs();
        await idbPut(STORE_EDITIONS, ed);
        n++;
      }
    }
    return n;
  }

  /** 按标题搜相关上传并入 Work；同 work 5 分钟内最多一次 */
  async function autoImportRelatedOnlineEditions(edition) {
    if (!edition || !edition.work_id) return;
    const key = 'exc_rel_imp_' + edition.work_id;
    let skipSearch = false;
    try {
      const last = Number(sessionStorage.getItem(key) || 0);
      if (last && nowMs() - last < 5 * 60 * 1000) skipSearch = true;
      else sessionStorage.setItem(key, String(nowMs()));
    } catch (_) { /* ignore */ }
    try {
      let r = { imported: 0 };
      // 5 分钟内不再重复标题搜索；但缺体积/时间的兄弟仍用 gdata 补
      if (!skipSearch && typeof importRelatedOnlineEditions === 'function') {
        r = await importRelatedOnlineEditions(edition, {
          workId: edition.work_id,
          limit: 12,
          minSim: 0.68,
        });
      }
      const sibs = await listEditionsByWork(edition.work_id);
      const filled = await enrichSiblingEditionsMeta(sibs);
      if ((r && r.imported > 0) || filled > 0) {
        await enhanceGalleryPage({ skipRelatedImport: true });
        if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
      }
    } catch (e) {
      console.warn('[ExC] auto related import', e);
    }
  }

  async function enhanceGalleryPage(opts) {
    opts = opts || {};
    const partial = parseGalleryPage();
    if (!partial) return null;
    const edition = await upsertEdition(partial);
    try {
      markGallerySeen(edition.gid);
    } catch (_) { /* ignore */ }
    try {
      // 列表已乐观跟进时 pending 可能已消费；画廊再试一次（幂等）
      await maybeAutoAdvanceTrackingBreakpoint(edition, partial);
    } catch (e) {
      console.warn('[ExC] auto bp', e);
    }
    const work = await idbGet(STORE_WORKS, edition.work_id);
    const lib = await resolveLibraryState(edition);
    let siblings = await listEditionsByWork(edition.work_id);
    // 已有兄弟但缺体积/时间：进页就补一轮（不依赖搜索）
    if (opts.skipRelatedImport && siblings && siblings.length) {
      try {
        await enrichSiblingEditionsMeta(siblings);
        siblings = await listEditionsByWork(edition.work_id);
      } catch (_) { /* ignore */ }
    }
    const prog = await getProgress(edition.work_id);

    let panel = document.getElementById('exc-gallery-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'exc-gallery-panel';
      // 必须插在 gleft/gmid/gright 整组浮动之后，不能插在 #gd4（gmid 内部）
      // 否则 gmid 被撑高、封面下方左侧会露出站点原色竖条
      placeGalleryPanel(panel);
    } else {
      // 旧版若误插在 gmid 内，纠正位置
      placeGalleryPanel(panel);
    }

    // 其它线上版本（本机 + 自动搜索并入）
    let otherEds = (siblings || []).filter((ed) => String(ed.gid) !== String(edition.gid));

    const lrrLinks = (lib.exact_archives || lib.work_archives || [])
      .slice(0, 4)
      .map((a) => {
        const u = buildLrrReaderUrl(a.arcid);
        return u
          ? '<a class="jlc-wb-btn ghost" href="' +
              escapeHtml(u) +
              '" target="_blank" rel="noreferrer">LRR读 ' +
              escapeHtml(a.arcid.slice(0, 8)) +
              '</a>'
          : '';
      })
      .join(' ');

    let lrrOpenHtml = '';
    // 正式库内打开只认已命中档案，不把模糊候选当库
    const topArc =
      (lib.exact_archives && lib.exact_archives[0]) || (lib.work_archives && lib.work_archives[0]);
    if (topArc && buildLrrReaderUrl(topArc.arcid)) {
      lrrOpenHtml =
        '<a class="jlc-wb-btn ghost" href="' +
        escapeHtml(buildLrrReaderUrl(topArc.arcid)) +
        '" target="_blank" rel="noreferrer">打开库内</a>';
    }
    // 对照卡① LRR 库内 · 对照卡② EXH 多版本（互不混用）
    const lrrCompareCard = libraryCompareCardHtml(lib, { withActions: true, lrrOpenHtml: lrrOpenHtml });
    const edCompareCard = editionCompareCardHtml(edition, otherEds, {
      withActions: true,
      cfg: config,
      libraryGids: (lib && lib.library_gids) || [],
    });

    // 仅 artist / group / parody 快捷追更（不堆 character/female 等标签）
    const trackHints = [];
    (edition.tags || []).forEach((t) => {
      const low = normalizeNamespaceTag(t);
      if (low.startsWith('artist:')) trackHints.push({ ns: 'artist', name: t.split(':').slice(1).join(':').trim() || low.slice(7) });
      if (low.startsWith('group:')) trackHints.push({ ns: 'group', name: t.split(':').slice(1).join(':').trim() || low.slice(6) });
      if (low.startsWith('parody:')) trackHints.push({ ns: 'parody', name: t.split(':').slice(1).join(':').trim() || low.slice(7) });
    });
    if (edition.group) trackHints.push({ ns: 'group', name: edition.group });
    const seenHint = new Set();
    const trackBtns = trackHints
      .filter((h) => {
        const k = h.ns + ':' + h.name.toLowerCase();
        if (seenHint.has(k)) return false;
        seenHint.add(k);
        return !!h.name;
      })
      .slice(0, 6)
      .map(
        (h) =>
          '<button type="button" class="jlc-wb-btn ghost" data-exc-g="track" data-ns="' +
          escapeHtml(h.ns) +
          '" data-name="' +
          escapeHtml(h.name) +
          '" title="加入追更">⭐ ' +
          escapeHtml(h.ns + ':' + h.name) +
          '</button>'
      )
      .join('');

    // 精简面板：badge + 对照卡（有才显示）+ 操作 + 可选追更
    panel.innerHTML =
      '<div class="exc-g-head">Creamu · ExH · 画廊</div>' +
      '<div class="exc-g-body">' +
      badgeHtml(lib, work, edition) +
      lrrCompareCard +
      edCompareCard +
      '<div class="jlc-wb-view-title" style="margin-top:10px">操作</div>' +
      '<div class="exc-card-actions">' +
      '<button type="button" class="jlc-wb-btn danger" data-exc-g="drop" title="屏蔽此单本（列表淡化/可隐藏）">' +
      (work && work.blocked ? '取消抛弃' : '抛弃') +
      '</button>' +
      '<button type="button" class="jlc-wb-btn primary" data-exc-g="best">最佳版</button>' +
      '<button type="button" class="jlc-wb-btn ghost" data-exc-g="bind">绑定 LRR</button>' +
      '<button type="button" class="jlc-wb-btn ghost" data-exc-g="merge">合并 Work</button>' +
      '<button type="button" class="jlc-wb-btn ghost" data-exc-g="lrrq">LRR 搜索</button>' +
      '<button type="button" class="jlc-wb-btn ghost" data-exc-g="sim">相似搜索</button>' +
      lrrLinks +
      '</div>' +
      (trackBtns
        ? '<div class="jlc-wb-view-title" style="margin-top:10px">快捷追更</div><div class="exc-card-actions">' +
          trackBtns +
          '</div>'
        : '') +
      '</div>';

    panel.onclick = async (ev) => {
      const btn = ev.target && ev.target.closest && ev.target.closest('[data-exc-g]');
      if (!btn) return;
      const act = btn.getAttribute('data-exc-g');
      try {
        if (act === 'track') {
          const ns = btn.getAttribute('data-ns') || '';
          const name = btn.getAttribute('data-name') || '';
          const f_search = ns ? ns + ':"' + name + '$"' : name;
          const open_url = buildSearchUrl(location.origin, f_search);
          const group_type =
            ns === 'artist' ? 'artist' : ns === 'group' ? 'group' : ns === 'parody' ? 'parody' : 'tag';
          const site = detectSite();
          await upsertTrackingFromContext({
            trackable: true,
            site,
            group_type,
            label: ns ? ns + ':' + name : name,
            namespace: ns,
            tag_name: name,
            f_search,
            open_url,
            page_url: open_url,
            query_signature: buildTrackingQuerySignature({
              site,
              group_type,
              namespace: ns,
              tag_name: name,
              f_search,
            }),
          });
          showToast('已加入追更：' + (ns ? ns + ':' + name : name));
          if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
          return;
        } else if (act === 'drop' || act === 'block' || act === 'dropped') {
          // 抛弃 = 屏蔽单本（与列表淡化/隐藏一致）
          const next = !(work && work.blocked);
          await setWorkBlocked(edition.work_id, next);
          try {
            await setWorkStatus(edition.work_id, next ? 'dropped' : 'none');
          } catch (_) { /* ignore */ }
        } else if (act === 'best') {
          await openBestEdition(edition.work_id);
          return;
        } else if (act === 'bind') {
          await openBindModal(edition);
          return;
        } else if (act === 'samever') {
          const arcid = compactText(lib && lib.same_target_arcid);
          if (!arcid) {
            showToast('没有可确认的库内档案，请先对照绑定');
            await openBindModal(edition);
            return;
          }
          await markEditionArchiveSameVersion(edition, arcid);
          showToast('已视为同源');
          await enhanceGalleryPage();
          if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
          return;
        } else if (act === 'merge') {
          await openMergeModal(edition);
          return;
        } else if (act === 'lrrq') {
          const u = buildLrrSearchUrl(edition.title_core || edition.title_raw);
          if (!u) showToast('请先配置 LRR URL');
          else window.open(u, '_blank');
          return;
        } else if (act === 'sim') {
          location.href = buildSearchUrl(location.origin, '"' + (edition.title_core || edition.title_raw).slice(0, 80) + '"');
          return;
        }
        showToast('已更新');
        await enhanceGalleryPage();
        if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
      } catch (err) {
        showToast('失败: ' + ((err && err.message) || err));
      }
    };

    // 移除旧版标签堆叠条（character/female 等不应塞进画廊面板）
    document.getElementById('exc-tag-bar')?.remove();

    // 后台自动搜相关线上版本（同 work 5 分钟内最多一次）
    if (!opts.skipRelatedImport) {
      void autoImportRelatedOnlineEditions(edition);
    }
    return edition;
  }

  function showDiagnosticBanner(issue) {
    if (document.getElementById('exc-diag')) return;
    const el = document.createElement('div');
    el.id = 'exc-diag';
    el.innerHTML =
      '<div class="exc-g-head">Creamu · ExH</div><div class="exc-g-body"><div style="color:#ccc">' +
      escapeHtml(issue.message) +
      '</div>' +
      '<div style="margin-top:12px"><button type="button" class="jlc-wb-btn primary" id="exc-diag-dismiss">知道了</button></div></div>';
    document.body.insertBefore(el, document.body.firstChild);
    document.getElementById('exc-diag-dismiss').onclick = () => el.remove();
  }

  async function enhanceImagePage() {
    const info = parseImagePageProgress();
    if (!info) return;
    try {
      markGallerySeen(info.gid);
    } catch (_) { /* ignore */ }
    // 只记阅读进度与已点，不再自动改「在读」状态
    const eds = await idbIndexGetAll(STORE_EDITIONS, 'gid', String(info.gid));
    const ed = (eds && eds[0]) || null;
    if (!ed || !ed.work_id) return;
    await setProgress(ed.work_id, info.page, ed.pages || 0);
  }

  async function refreshCurrentPageUi() {
    const kind = detectPageKind();
    if (kind === 'gallery') await enhanceGalleryPage();
    else if (kind === 'image') await enhanceImagePage();
    else {
      document.querySelectorAll('.exc-gl-item').forEach((el) => {
        el.dataset.excEnhanced = '';
      });
      await enhanceListPage();
    }
  }

  function observeListMutations() {
    // 只观察列表本体，避开 #nb / 追更条自身，减少闪烁
    const root =
      document.querySelector('table.itg') ||
      document.querySelector('.itg') ||
      document.getElementById('gdt') ||
      document.getElementById('ido') ||
      document.body;
    let timer = null;
    const mo = new MutationObserver((mutations) => {
      // 忽略追更条内部变更
      let relevant = false;
      for (const m of mutations) {
        const t = m.target;
        if (t && t.closest && t.closest('#exc-tracking-bar, #jlc-wb, #jlc-wb-fab, #exc-hover-preview')) {
          continue;
        }
        relevant = true;
        break;
      }
      if (!relevant) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        enhanceListPage().catch((e) => console.warn('[ExC] list enhance', e));
      }, 400);
    });
    mo.observe(root, { childList: true, subtree: true });
  }
  let wbSession = null;
  let wbDragging = null;
  let wbResizing = null;
  /** 主动检查更新运行态 */
  let trackingCheckRuntime = null;

  function ensureCreamuSync() {
    if (window.__creamuWdExh) return window.__creamuWdExh;
    if (typeof createCreamuWebDavSync !== 'function') return null;
    window.__creamuWdExh = createCreamuWebDavSync({
      product: 'exh',
      notify: (msg) => showToast(msg),
      exportPayload: () => exportBackup(),
      importPayload: async (payload) => {
        // pull 后不标脏；revision 由 WebDAV applyRemote 收尾
        await importBackup(payload, { fromSync: true });
        try {
          if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
          if (window.__excRefreshPage) window.__excRefreshPage();
          const settingsOpen = document.getElementById('jlc-wb-settings')?.classList.contains('is-open');
          if (settingsOpen && typeof renderSettingsSections === 'function') {
            const active =
              document.querySelector('#jlc-wb-settings-nav button.active')?.getAttribute('data-jlc-settings-tab') ||
              'sync';
            renderSettingsSections(active);
          }
        } catch (_) { /* ignore */ }
      },
      getSettings: () => ({
        enabled: !!config.webdav_enabled,
        url: config.webdav_url || '',
        user: config.webdav_user || '',
        password: config.webdav_password || '',
        path: config.webdav_path || '/Creamu',
        auto: config.webdav_auto !== false,
        conflict: config.webdav_conflict || 'ask',
      }),
    });
    return window.__creamuWdExh;
  }

  function applyFabPosition(fab, session) {
    if (!fab) return;
    const left = Number(session && session.fabLeft);
    const top = Number(session && session.fabTop);
    if (!Number.isFinite(left) || !Number.isFinite(top)) return;
    const w = fab.offsetWidth || 34;
    const h = fab.offsetHeight || 34;
    const point = clampCreamuWorkbenchPoint({ left, top }, { width: w, height: h }, window);
    fab.style.left = point.left + 'px';
    fab.style.top = point.top + 'px';
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
  }

  function bindFabDrag(fab) {
    if (!fab || fab.dataset.dragBound === '1') return;
    fab.dataset.dragBound = '1';
    applyFabPosition(fab, wbSession || loadSession());
    let active = false;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;
    const MOVE_PX = 10;

    const onMove = (event) => {
      if (!active) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!dragging && Math.abs(dx) + Math.abs(dy) > MOVE_PX) {
        dragging = true;
        fab.classList.add('is-dragging');
      }
      if (!dragging) return;
      event.preventDefault();
      const w = fab.offsetWidth || 34;
      const h = fab.offsetHeight || 34;
      const point = clampCreamuWorkbenchPoint(
        { left: originLeft + dx, top: originTop + dy },
        { width: w, height: h },
        window
      );
      fab.style.left = point.left + 'px';
      fab.style.top = point.top + 'px';
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
    };

    const onUp = () => {
      if (!active) return;
      active = false;
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', onUp, true);
      fab.classList.remove('is-dragging');
      if (dragging) {
        dragging = false;
        const rect = fab.getBoundingClientRect();
        wbSession = wbSession || loadSession();
        wbSession.fabLeft = Math.round(rect.left);
        wbSession.fabTop = Math.round(rect.top);
        saveSession(wbSession);
        fab.dataset.skipClick = '1';
        window.setTimeout(() => {
          delete fab.dataset.skipClick;
        }, 50);
      }
    };

    // 用 mousedown 启动拖动（Firefox 站点页更稳）；点击仍走 click
    fab.addEventListener('mousedown', (event) => {
      if (event.button !== 0) return;
      active = true;
      dragging = false;
      startX = event.clientX;
      startY = event.clientY;
      const rect = fab.getBoundingClientRect();
      originLeft = rect.left;
      originTop = rect.top;
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('mouseup', onUp, true);
    });
    fab.addEventListener('click', (event) => {
      if (fab.dataset.skipClick === '1' || dragging) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      try {
        toggleWorkbench();
      } catch (e) {
        console.warn('[ExC] toggleWorkbench', e);
        showToast('打开工作台失败: ' + ((e && e.message) || e));
      }
    });
  }

  function ensureFab() {
    let fab = document.getElementById('jlc-wb-fab');
    if (!fab) {
      fab = document.createElement('button');
      fab.id = 'jlc-wb-fab';
      fab.type = 'button';
      fab.title = 'Creamu · ExH（可拖动 · 点击打开）';
      fab.innerHTML = '<span>⌘</span><span class="jlc-wb-fab-badge">0</span>';
      document.body.appendChild(fab);
    }
    bindFabDrag(fab);
    return fab;
  }

  async function updateFabBadge() {
    const fab = document.getElementById('jlc-wb-fab');
    if (!fab) return;
    const badge = fab.querySelector('.jlc-wb-fab-badge');
    try {
      const list = await listTrackingSearches();
      // 含 top≠断点：打开列表会清 has_update，但不能因此丢掉角标
      const n = list.filter((r) =>
        typeof trackingHasPendingUpdate === 'function' ? trackingHasPendingUpdate(r) : !!r.has_update
      ).length;
      if (n > 0) {
        fab.classList.add('has-updates');
        if (badge) badge.textContent = n > 99 ? '99+' : String(n);
      } else fab.classList.remove('has-updates');
    } catch (_) {
      fab.classList.remove('has-updates');
    }
  }

  function ensureWorkbenchShell() {
    let shell = document.getElementById('jlc-wb');
    if (shell) return shell;
    shell = document.createElement('div');
    shell.id = 'jlc-wb';
    shell.innerHTML =
      '<div class="jlc-wb-resize-w" title="拖拽调整宽度"></div>' +
      '<div class="jlc-wb-resize-h" title="拖拽调整高度"></div>' +
      '<div class="jlc-wb-resize-corner" title="拖拽调整大小"></div>' +
      '<div class="jlc-wb-header" title="按住标题栏拖动窗口">' +
      '  <div><div class="jlc-wb-title">Creamu · ExH</div>' +
      '  <div class="jlc-wb-subtitle" id="jlc-wb-header-sub">加载中… · 可拖动</div></div>' +
      '  <div class="jlc-wb-header-actions">' +
      '    <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-settings-btn" title="设置">⚙</button>' +
      '    <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-min-btn" title="收起">—</button>' +
      '    <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-close-btn" title="关闭">×</button>' +
      '  </div>' +
      '</div>' +
      '<div class="jlc-wb-nav">' +
      '  <button type="button" data-nav="tracking" class="active">追更</button>' +
      '  <button type="button" data-nav="works">作品状态</button>' +
      '</div>' +
      '<div class="jlc-wb-body">' +
      '  <div data-jlc-wb-page="tracking"><div id="exc-wb-tracking-root"></div></div>' +
      '  <div data-jlc-wb-page="works" hidden><div id="exc-wb-works-root"></div></div>' +
      '</div>' +
      '<div class="jlc-wb-footer">' +
      '  <div class="jlc-wb-footer-summary" id="jlc-wb-footer-summary">—</div>' +
      '  <div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '    <button type="button" class="jlc-wb-btn primary" id="jlc-wb-save-current">⭐ 收藏当前</button>' +
      '    <button type="button" class="jlc-wb-btn ghost" id="exc-check-updates" title="默认只查首页（快）；可在设置开启跨页精确未读。条目间隔 5～10 秒">检查更新</button>' +
      '    <button type="button" class="jlc-wb-btn ghost" id="exc-sync-all" title="同时同步 WebDAV 与 LRR（已配置的项）">同步</button>' +
      '  </div>' +
      '</div>' +
      '<div class="jlc-wb-settings" id="jlc-wb-settings">' +
      '  <div class="jlc-wb-settings-panel">' +
      '    <div class="jlc-wb-settings-head">' +
      '      <strong>设置</strong>' +
      '      <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-settings-close">×</button>' +
      '    </div>' +
      '    <div class="jlc-wb-settings-nav" id="jlc-wb-settings-nav">' +
      '      <button type="button" data-jlc-settings-tab="sync" class="active">同步</button>' +
      '      <button type="button" data-jlc-settings-tab="tags">标签</button>' +
      '      <button type="button" data-jlc-settings-tab="pref">偏好</button>' +
      '      <button type="button" data-jlc-settings-tab="ui">界面</button>' +
      '      <button type="button" data-jlc-settings-tab="data">数据</button>' +
      '    </div>' +
      '    <div class="jlc-wb-settings-body" id="exc-settings-body"></div>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(shell);

    document.getElementById('jlc-wb-close-btn').onclick = () => toggleWorkbench(false);
    document.getElementById('jlc-wb-min-btn').onclick = () => toggleWorkbench(false);
    document.getElementById('jlc-wb-settings-btn').onclick = () => openSettings(true);
    document.getElementById('jlc-wb-settings-close').onclick = () => openSettings(false);
    document.getElementById('jlc-wb-save-current').onclick = async () => {
      await saveCurrentPageAsTracking();
      renderWorkbench();
    };
    document.getElementById('exc-check-updates').onclick = () => {
      void refreshAllTrackingSearches();
    };

    shell.querySelectorAll('.jlc-wb-nav button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nav = btn.getAttribute('data-nav') || 'tracking';
        wbSession = wbSession || loadSession();
        wbSession.nav = nav;
        saveSession(wbSession);
        activateNav(nav);
        renderWorkbench();
      });
    });

    shell.querySelectorAll('[data-jlc-settings-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        shell.querySelectorAll('[data-jlc-settings-tab]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderSettingsSections(btn.getAttribute('data-jlc-settings-tab'));
      });
    });

    bindFooterActions();
    initWbDrag(shell.querySelector('.jlc-wb-header'), shell);
    initWbResizeHandles(shell);
    return shell;
  }

  function activateNav(nav) {
    const shell = document.getElementById('jlc-wb');
    if (!shell) return;
    shell.querySelectorAll('.jlc-wb-nav button').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-nav') === nav);
    });
    shell.querySelectorAll('[data-jlc-wb-page]').forEach((p) => {
      const id = p.getAttribute('data-jlc-wb-page');
      if (id === nav) p.removeAttribute('hidden');
      else p.setAttribute('hidden', '');
    });
  }

  function openSettings(open) {
    const el = document.getElementById('jlc-wb-settings');
    if (!el) return;
    el.classList.toggle('is-open', !!open);
    if (open) {
      renderSettingsSections('sync');
      const nav = document.getElementById('jlc-wb-settings-nav');
      if (nav) {
        nav.querySelectorAll('button').forEach((b) =>
          b.classList.toggle('active', b.getAttribute('data-jlc-settings-tab') === 'sync')
        );
      }
    }
  }

  function splitCsvField(s) {
    return String(s == null ? '' : s)
      .split(/[,，\n]/)
      .map((x) => compactText(x))
      .filter(Boolean);
  }

  function settingsSaveFooter() {
    return (
      '<button type="button" class="jlc-wb-btn primary" id="exc-cfg-save" style="width:100%;margin-top:14px;">💾 保存本页</button>'
    );
  }

  /** 同步页：WebDAV / LRR 按钮（与保存分离） */
  function bindSyncSettingsHandlers(body) {
    if (!body) return;
    const readWdForm = () => {
      const typed = body.querySelector('#exc-cfg-wd-pass')?.value || '';
      const patch = {
        webdav_url: body.querySelector('#exc-cfg-wd-url')?.value?.trim() || '',
        webdav_user: body.querySelector('#exc-cfg-wd-user')?.value?.trim() || '',
        webdav_path: body.querySelector('#exc-cfg-wd-path')?.value?.trim() || '/Creamu',
        webdav_enabled: !!body.querySelector('#exc-cfg-wd-en')?.checked,
        webdav_auto: !!body.querySelector('#exc-cfg-wd-auto')?.checked,
        webdav_conflict: body.querySelector('#exc-cfg-wd-conflict')?.value || 'ask',
      };
      if (typed) patch.webdav_password = typed;
      return patch;
    };
    const refreshWdStatus = () => {
      const el = document.getElementById('exc-wd-status');
      const o = ensureCreamuSync();
      if (el && o) el.textContent = o.statusText();
    };
    const both = body.querySelector('#exc-cfg-sync-both');
    if (both) {
      both.onclick = () => {
        saveConfig(readWdForm());
        void runCombinedSync({ reason: 'manual' });
      };
    }
    const wdTest = body.querySelector('#exc-wd-test');
    if (wdTest) {
      wdTest.onclick = async () => {
        saveConfig(readWdForm());
        const o = ensureCreamuSync();
        if (!o) return showToast('同步模块未加载');
        try {
          await o.testConnection();
          refreshWdStatus();
        } catch (e) {
          showToast('测试失败: ' + ((e && e.message) || e));
          refreshWdStatus();
        }
      };
    }
    const wdSync = body.querySelector('#exc-wd-sync');
    if (wdSync) {
      wdSync.onclick = async () => {
        saveConfig(readWdForm());
        try {
          await ensureCreamuSync().syncNow({});
          refreshWdStatus();
          renderWorkbench();
        } catch (e) {
          showToast('同步失败: ' + ((e && e.message) || e));
          refreshWdStatus();
        }
      };
    }
    const wdPush = body.querySelector('#exc-wd-push');
    if (wdPush) {
      wdPush.onclick = async () => {
        saveConfig(readWdForm());
        try {
          await ensureCreamuSync().syncNow({ force: 'push' });
          refreshWdStatus();
        } catch (e) {
          showToast('推送失败: ' + ((e && e.message) || e));
        }
      };
    }
    const wdPull = body.querySelector('#exc-wd-pull');
    if (wdPull) {
      wdPull.onclick = async () => {
        saveConfig(readWdForm());
        try {
          await ensureCreamuSync().syncNow({ force: 'pull' });
          refreshWdStatus();
          renderWorkbench();
        } catch (e) {
          showToast('拉取失败: ' + ((e && e.message) || e));
        }
      };
    }
    const lrrNow = body.querySelector('#exc-cfg-lrr-sync-now');
    if (lrrNow) {
      lrrNow.onclick = async () => {
        if (!lrrConfigured()) return showToast('请先配置 LRR');
        showToast('正在同步 LRR…');
        const r = await syncLanraragi({ replace: true });
        if (r && r.ok) {
          showToast(
            'LRR ' +
              r.count +
              ' 条' +
              (r.familiar_artists != null
                ? ' · 熟人' + r.familiar_artists + '/' + r.familiar_groups
                : '')
          );
        } else showToast('LRR 失败: ' + ((r && r.error) || ''));
        renderWorkbench();
        if (window.__excRefreshPage) window.__excRefreshPage();
      };
    }
  }

  function bindFooterActions() {
    const syncBtn = document.getElementById('exc-sync-all');
    if (syncBtn && !syncBtn.dataset.bound) {
      syncBtn.dataset.bound = '1';
      syncBtn.onclick = () => {
        void runCombinedSync({ reason: 'manual' });
      };
    }
  }

  /**
   * 工作台「同步」：WebDAV + LRR 一起跑（各自已配置才执行）
   */
  async function runCombinedSync(options) {
    options = options || {};
    const bits = [];
    let didAny = false;

    // WebDAV
    try {
      const sync = typeof ensureCreamuSync === 'function' ? ensureCreamuSync() : null;
      const st = sync && sync.settings ? sync.settings() : {};
      const wdReady =
        sync &&
        st.enabled &&
        typeof sync.isConfigured === 'function' &&
        sync.isConfigured();
      if (wdReady) {
        didAny = true;
        showToast('正在同步 WebDAV…');
        const r = await sync.syncNow({ reason: options.reason || 'manual' });
        if (r && r.action === 'error') {
          bits.push('WebDAV 失败');
        } else if (r && r.action === 'pull') {
          bits.push('WebDAV 已拉取');
        } else if (r && r.action === 'push') {
          bits.push('WebDAV 已推送');
        } else if (r && (r.action === 'noop' || r.action === 'same' || r.action === 'busy')) {
          bits.push(r.action === 'busy' ? 'WebDAV 忙碌' : 'WebDAV 已一致');
        } else {
          bits.push('WebDAV 完成');
        }
      } else if (sync && st.enabled && !sync.isConfigured()) {
        bits.push('WebDAV 未配齐');
      }
    } catch (e) {
      bits.push('WebDAV 失败: ' + ((e && e.message) || e));
    }

    // LRR
    try {
      if (typeof lrrConfigured === 'function' && lrrConfigured()) {
        didAny = true;
        showToast('正在同步 LRR…');
        const r = await syncLanraragi({ replace: true });
        if (r && r.ok) {
          const famA = r.familiar_artists != null ? r.familiar_artists : 0;
          const famG = r.familiar_groups != null ? r.familiar_groups : 0;
          bits.push(
            'LRR ' + r.count + ' 条' + (famA || famG ? ' · 熟人' + famA + '/' + famG : '')
          );
        } else {
          bits.push('LRR 失败: ' + ((r && r.error) || ''));
        }
      }
    } catch (e) {
      bits.push('LRR 失败: ' + ((e && e.message) || e));
    }

    if (!didAny) {
      showToast('请先配置 WebDAV 或 LRR');
      return;
    }
    showToast(bits.join(' · ') || '同步完成');
    try {
      renderWorkbench();
    } catch (_) { /* ignore */ }
    updateFabBadge();
    if (window.__excRefreshPage) window.__excRefreshPage();
  }

  function initWbDrag(handle, panel) {
    handle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.jlc-wb-header-actions')) return;
      const rect = panel.getBoundingClientRect();
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.width = rect.width + 'px';
      panel.style.height = rect.height + 'px';
      wbDragging = {
        startRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        startPoint: { x: e.clientX, y: e.clientY },
      };
      panel.classList.add('is-dragging');
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (wbResizing) {
        const mode = wbResizing.mode || 'w';
        const rect = resizeCreamuWorkbenchRect(
          wbResizing.startRect,
          wbResizing.startPoint,
          { x: e.clientX, y: e.clientY },
          mode,
          window,
          { minWidth: 360, minHeight: 280, maxWidth: 720, margin: 12 }
        );
        panel.style.left = rect.left + 'px';
        panel.style.top = rect.top + 'px';
        panel.style.width = rect.width + 'px';
        panel.style.height = rect.height + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        return;
      }
      if (!wbDragging) return;
      const rect = moveCreamuWorkbenchRect(
        wbDragging.startRect,
        wbDragging.startPoint,
        { x: e.clientX, y: e.clientY },
        window,
        { minWidth: 360, minHeight: 280, maxWidth: 720, margin: 12 }
      );
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
      panel.style.width = rect.width + 'px';
      panel.style.height = rect.height + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    });
    window.addEventListener('mouseup', () => {
      if (wbResizing) {
        const handleEl = wbResizing.handle;
        if (handleEl) handleEl.classList.remove('is-dragging');
        wbResizing = null;
        wbSession = wbSession || loadSession();
        const rect = panel.getBoundingClientRect();
        wbSession.width = Math.round(rect.width) || 500;
        wbSession.height = Math.round(rect.height) || 560;
        wbSession.left = Math.round(rect.left);
        wbSession.top = Math.round(rect.top);
        saveSession(wbSession);
        saveConfig({ workbench_width: wbSession.width });
        return;
      }
      if (!wbDragging) return;
      wbDragging = null;
      panel.classList.remove('is-dragging');
      const rect = panel.getBoundingClientRect();
      wbSession = wbSession || loadSession();
      wbSession.left = rect.left;
      wbSession.top = rect.top;
      wbSession.width = Math.round(rect.width) || wbSession.width;
      wbSession.height = Math.round(rect.height) || wbSession.height;
      clampWorkbenchShellPos(panel, wbSession);
      saveSession(wbSession);
    });
  }

  function initWbResizeHandles(panel) {
    if (!panel || panel.dataset.resizeBound === '1') return;
    panel.dataset.resizeBound = '1';
    const bind = (sel, mode) => {
      const handle = panel.querySelector(sel);
      if (!handle) return;
      handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        const rect = panel.getBoundingClientRect();
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.left = rect.left + 'px';
        panel.style.top = rect.top + 'px';
        panel.style.width = rect.width + 'px';
        panel.style.height = rect.height + 'px';
        wbResizing = {
          mode: mode,
          startRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          startPoint: { x: e.clientX, y: e.clientY },
          handle: handle,
        };
        handle.classList.add('is-dragging');
        panel.classList.add('is-resizing');
        e.preventDefault();
        e.stopPropagation();
      });
    };
    bind('.jlc-wb-resize-w', 'w');
    bind('.jlc-wb-resize-h', 'h');
    bind('.jlc-wb-resize-corner', 'corner');
    window.addEventListener('mouseup', () => {
      panel.classList.remove('is-resizing');
    });
  }

  function clampWorkbenchShellPos(wb, session) {
    if (!wb) return;
    const margin = 12;
    const maxH = Math.max(280, window.innerHeight - margin * 2);
    const defaultWidth = Math.min(720, Math.max(360, Number(config.workbench_width) || 500));
    const defaultHeight = Math.min(maxH, Math.max(280, Math.round(window.innerHeight * 0.78)));
    const defaultRect = {
      left: Math.max(margin, window.innerWidth - defaultWidth - 24),
      top: Math.max(24, Math.round(window.innerHeight * 0.08)),
      width: defaultWidth,
      height: defaultHeight,
    };
    const rect = clampCreamuWorkbenchRect({
      left: session.left,
      top: session.top,
      width: session.width || config.workbench_width,
      height: session.height,
    }, window, {
      margin,
      minWidth: 360,
      minHeight: 280,
      maxWidth: 720,
      defaultRect,
      fallbackWidth: defaultWidth,
      fallbackHeight: defaultHeight,
    });
    wb.style.width = rect.width + 'px';
    wb.style.height = rect.height + 'px';
    wb.style.right = 'auto';
    wb.style.bottom = 'auto';
    wb.style.left = rect.left + 'px';
    wb.style.top = rect.top + 'px';
    session.left = rect.left;
    session.top = rect.top;
    session.width = rect.width;
    session.height = rect.height;
  }

  function forceWorkbenchVisible(wb) {
    if (!wb) return;
    wbSession = wbSession || loadSession();
    const w = Math.min(
      720,
      Math.max(360, Number(wbSession.width || config.workbench_width) || Math.min(520, window.innerWidth - 48))
    );
    const maxH = Math.max(280, window.innerHeight - 24);
    let h = Math.round(Number(wbSession.height) || 0);
    if (!Number.isFinite(h) || h < 280) h = Math.min(maxH, Math.round(window.innerHeight * 0.78));
    h = Math.min(maxH, Math.max(280, h));
    const top = Math.max(24, Math.round(window.innerHeight * 0.08));
    const left = Math.max(12, window.innerWidth - w - 24);
    wb.classList.add('is-open');
    document.getElementById('jlc-wb-fab')?.classList.add('is-panel-open');
    wb.style.setProperty('display', 'flex', 'important');
    wb.style.setProperty('visibility', 'visible', 'important');
    wb.style.setProperty('opacity', '1', 'important');
    wb.style.setProperty('pointer-events', 'auto', 'important');
    wb.style.setProperty('position', 'fixed', 'important');
    wb.style.setProperty('z-index', '2147483000', 'important');
    wb.style.setProperty('transform', 'none', 'important');
    wb.style.setProperty('max-height', 'none', 'important');
    wb.style.left = left + 'px';
    wb.style.top = top + 'px';
    wb.style.right = 'auto';
    wb.style.bottom = 'auto';
    wb.style.width = w + 'px';
    wb.style.height = h + 'px';
    wbSession.width = w;
    wbSession.height = h;
    wbSession.left = left;
    wbSession.top = top;
  }

  function forceWorkbenchHidden(wb) {
    if (!wb) return;
    wb.classList.remove('is-open');
    document.getElementById('jlc-wb-fab')?.classList.remove('is-panel-open');
    wb.style.setProperty('display', 'none', 'important');
  }

  function toggleWorkbench(force) {
    const wb = ensureWorkbenchShell();
    if (!wb) {
      showToast('工作台创建失败');
      console.warn('[ExC] ensureWorkbenchShell returned null');
      return;
    }
    // 保证挂在 body 上（防止被夹进隐藏容器）
    if (wb.parentElement !== document.body) {
      document.body.appendChild(wb);
    }
    wbSession = wbSession || loadSession();
    const currentlyOpen =
      wb.classList.contains('is-open') &&
      window.getComputedStyle(wb).display !== 'none';
    const open = force === undefined ? !currentlyOpen : !!force;
    wbSession.open = open;
    if (open) {
      // 每次打开重置到安全可见位置，避免旧 session 屏外坐标
      wbSession.left = null;
      wbSession.top = null;
      forceWorkbenchVisible(wb);
      activateNav(wbSession.nav === 'works' ? 'works' : 'tracking');
      saveSession(wbSession);
      console.info('[ExC] workbench open', wb.getBoundingClientRect());
      Promise.resolve()
        .then(() => renderWorkbench())
        .catch((e) => {
          console.warn('[ExC] renderWorkbench', e);
          showToast('工作台内容渲染失败（面板应已打开）: ' + ((e && e.message) || e));
        });
    } else {
      forceWorkbenchHidden(wb);
      saveSession(wbSession);
      console.info('[ExC] workbench close');
    }
  }

  /**
   * 从工作台打开追更项：先收起面板（新标签不带弹层；本页跳转也不挡内容）
   * @param {object} rec
   * @param {'default'|'tab'|'same'} mode
   */
  async function openTrackingRecordFromWorkbench(rec, mode) {
    if (!rec) return;
    const url = rec.open_url || rec.page_url;
    if (!url) {
      showToast('没有可打开的地址');
      return;
    }
    wbSession = wbSession || loadSession();
    wbSession.open = false;
    wbSession.nav = 'tracking';
    wbSession.lastOpenedId = rec.id;
    wbSession.lastOpenedAt = nowMs();
    saveSession(wbSession);
    try {
      toggleWorkbench(false);
    } catch (_) { /* ignore */ }

    rec.last_browsed_at = nowMs();
    // 仅清「新检查到」旗标；若顶仍≠断点，角标/leaf 仍算有更新
    rec.has_update = 0;
    try {
      await saveTrackingRecord(rec);
    } catch (_) { /* ignore */ }

    const wantTab =
      mode === 'tab' || (mode !== 'same' && (mode === 'default' ? !!config.open_best_in_new_tab : false));
    if (wantTab) {
      const opened = window.open(url, '_blank', 'noopener');
      if (!opened) {
        showToast('浏览器拦截了新标签，已改为本页打开');
        location.href = url;
        return;
      }
      updateFabBadge();
      if (document.getElementById('jlc-wb-list-scroll')) {
        try {
          await paintTrackingList();
        } catch (_) { /* ignore */ }
      }
      return;
    }
    location.href = url;
  }

  function setHeaderSub(text) {
    const el = document.getElementById('jlc-wb-header-sub');
    if (el) el.textContent = text;
  }
  function setFooterSummary(text) {
    const el = document.getElementById('jlc-wb-footer-summary');
    if (el) el.textContent = text;
  }

  async function renderWorkbench() {
    ensureWorkbenchShell();
    bindFooterActions();
    wbSession = wbSession || loadSession();
    const st = getLrrStatus();
    const ctx = parseExhPageContext(location.href);
    let lrrBit = '未配LRR';
    if (st.configured) {
      if (st.syncing) lrrBit = 'LRR同步中';
      else if (st.last_error) lrrBit = 'LRR失败';
      else if (st.last_sync) {
        const rel = formatCompactRelativeTime(st.last_sync);
        lrrBit = rel ? 'LRR/' + rel : 'LRR已同步';
      } else lrrBit = 'LRR待同步';
    }
    setHeaderSub(
      'v' +
        VERSION +
        ' · ' +
        (ctx && ctx.trackable ? '可收藏当前搜索' : '单本页：收藏请用标签/搜索') +
        ' · ' +
        lrrBit
    );

    const nav = wbSession.nav === 'works' ? 'works' : 'tracking';
    activateNav(nav);
    if (nav === 'works') await renderWorksPage();
    else await renderTrackingPage();
    updateFabBadge();
  }

  async function collectManualFolderOptions() {
    const all = await listTrackingSearches();
    const map = new Map();
    (all || []).forEach((r) => {
      const name = compactText(r.custom_folder || '');
      if (!name) return;
      const key = 'uf:' + name.toLowerCase();
      if (!map.has(key)) map.set(key, name);
    });
    return Array.from(map.entries())
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  }

  async function renderTrackingPage() {
    const root = document.getElementById('exc-wb-tracking-root');
    if (!root) return;
    const query = compactText(wbSession.trackingQuery || '');
    let groupFilter = wbSession.trackingGroup || 'all';
    // 旧版按 group_type 的筛选项作废，回到全部
    if (
      groupFilter !== 'all' &&
      groupFilter !== 'none' &&
      groupFilter.indexOf('uf:') !== 0
    ) {
      groupFilter = 'all';
      wbSession.trackingGroup = 'all';
      saveSession(wbSession);
    }
    const folders = await collectManualFolderOptions();

    root.innerHTML =
      '<div class="jlc-wb-toolbar">' +
      '  <div class="jlc-wb-toolbar-row">' +
      '    <input class="jlc-wb-search" id="exc-trk-q" type="search" placeholder="筛选追更标题…" value="' +
      escapeHtml(query) +
      '">' +
      '    <select class="jlc-wb-select" id="exc-trk-group">' +
      '      <option value="all"' +
      (groupFilter === 'all' ? ' selected' : '') +
      '>全部分组</option>' +
      '      <option value="none"' +
      (groupFilter === 'none' ? ' selected' : '') +
      '>未分类</option>' +
      folders
        .map(
          (f) =>
            '<option value="' +
            escapeHtml(f.key) +
            '"' +
            (groupFilter === f.key ? ' selected' : '') +
            '>' +
            escapeHtml(f.name) +
            '</option>'
        )
        .join('') +
      '    </select>' +
      '  </div>' +
      '  <div class="jlc-wb-toolbar-row" style="color:#9a7d60;font-size:12.5px;line-height:1.45">' +
      '分组靠手动：菜单「设分类」。未设的在「未分类」。自由词搜索不再自动拆组。检查更新间隔 5～10 秒。' +
      '  </div>' +
      '</div>' +
      '<div class="jlc-wb-list-scroll" id="jlc-wb-list-scroll"></div>';

    document.getElementById('exc-trk-q').oninput = (e) => {
      wbSession.trackingQuery = e.target.value;
      saveSession(wbSession);
      paintTrackingList();
    };
    document.getElementById('exc-trk-group').onchange = (e) => {
      wbSession.trackingGroup = e.target.value;
      saveSession(wbSession);
      paintTrackingList();
    };
    await paintTrackingList();
  }

  function formatCompactRelativeTime(value) {
    if (!value) return '';
    const time = typeof value === 'number' ? value : new Date(value).getTime();
    if (!Number.isFinite(time)) return '';
    const diff = Date.now() - time;
    if (diff < 60 * 1000) return '刚刚';
    if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + '分钟前';
    if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + '小时前';
    if (diff < 30 * 24 * 60 * 60 * 1000) return Math.floor(diff / (24 * 60 * 60 * 1000)) + '天前';
    const d = new Date(time);
    return d.getMonth() + 1 + '/' + d.getDate();
  }

  function updateTrackingCheckButton() {
    const btn = document.getElementById('exc-check-updates');
    if (!btn) return;
    if (trackingCheckRuntime && trackingCheckRuntime.active) {
      btn.disabled = true;
      btn.textContent =
        '检查中 ' +
        trackingCheckRuntime.completed +
        '/' +
        trackingCheckRuntime.total +
        (trackingCheckRuntime.note ? ' · ' + trackingCheckRuntime.note : '');
    } else {
      btn.disabled = false;
      btn.textContent = '检查更新';
    }
  }

  async function refreshAllTrackingSearches(options) {
    options = options || {};
    if (trackingCheckRuntime && trackingCheckRuntime.active) {
      showToast('正在检查更新…');
      return;
    }
    let list = await listTrackingSearches();
    if (options.recordIds && options.recordIds.length) {
      const set = new Set(options.recordIds.map(String));
      list = list.filter((r) => set.has(String(r.id)));
    }
    if (!list.length) {
      showToast('没有可检查的追更项');
      return;
    }

    trackingCheckRuntime = {
      active: true,
      completed: 0,
      total: list.length,
      note: '开始',
      cancelled: false,
      updates: 0,
      errors: 0,
    };
    updateTrackingCheckButton();
    setFooterSummary('检查更新 0/' + list.length);

    try {
      for (let i = 0; i < list.length; i++) {
        if (trackingCheckRuntime.cancelled) break;
        const rec = list[i];
        const title = getTrackingDisplayTitle(rec);
        trackingCheckRuntime.note = title.slice(0, 18);
        updateTrackingCheckButton();
        setFooterSummary(
          '检查 ' +
            (i + 1) +
            '/' +
            list.length +
            ' · ' +
            title.slice(0, 24)
        );
        try {
          await refreshSingleTrackingRecord(rec);
          if (
            typeof trackingHasPendingUpdate === 'function'
              ? trackingHasPendingUpdate(rec)
              : rec.has_update
          ) {
            trackingCheckRuntime.updates += 1;
          }
        } catch (err) {
          trackingCheckRuntime.errors += 1;
          try {
            rec.last_check_at = nowMs();
            rec.last_check_error = (err && err.message) || String(err);
            await saveTrackingRecord(rec);
          } catch (_) { /* ignore */ }
          const msg = (err && err.message) || String(err);
          if (/限流|429|封禁|Sad Panda|banned/i.test(msg)) {
            showToast('已暂停：' + msg);
            break;
          }
        }
        trackingCheckRuntime.completed = i + 1;
        updateTrackingCheckButton();
        updateFabBadge();
        // 轻量刷新列表状态（不整页重绑过多）
        if (document.getElementById('jlc-wb-list-scroll')) {
          await paintTrackingList();
        }
        if (i < list.length - 1 && !trackingCheckRuntime.cancelled) {
          const wait = pickTrackingCheckDelayMs();
          trackingCheckRuntime.note = '间隔 ' + Math.round(wait / 1000) + 's';
          updateTrackingCheckButton();
          setFooterSummary(
            '冷却 ' +
              Math.round(wait / 1000) +
              's · 已检 ' +
              trackingCheckRuntime.completed +
              '/' +
              list.length
          );
          await sleepMs(wait);
        }
      }
      const done = trackingCheckRuntime.completed;
      const total = trackingCheckRuntime.total;
      const errN = trackingCheckRuntime.errors;
      showToast(
        '检查完成 ' +
          done +
          '/' +
          total +
          (errN ? ' · 失败 ' + errN : '')
      );
    } finally {
      trackingCheckRuntime = null;
      updateTrackingCheckButton();
      await paintTrackingList();
      updateFabBadge();
    }
  }

  /** 对齐 JLC buildTrackingStatus：有估数时 leaf 显示 +N */
  function buildExhTrackingStatus(r) {
    if (!r) return { tone: 'gray', text: '未检查', note: '' };
    if (r.last_check_error) {
      return { tone: 'red', text: '检查失败', note: String(r.last_check_error).slice(0, 80) };
    }
    const top = compactText(r.top_gid || '');
    const bp = compactText(r.breakpoint_gid || '');
    const pill =
      typeof getTrackingUpdatePillText === 'function' ? getTrackingUpdatePillText(r) : '';
    const unreadN =
      typeof getTrackingUnreadEstimate === 'function' ? getTrackingUnreadEstimate(r) : 0;
    const unreadNote = unreadN
      ? r.unread_estimate_capped
        ? '约 ' + unreadN + '+ 条未读'
        : '约 ' + unreadN + ' 条未读'
      : '';
    // 最新 ≠ 断点作品 → 必有更新（用户贴的就是这种：不该显示「已检查」）
    if (top && bp && top !== bp) {
      const noteBits = [
        '最新 ' + (getTrackingTopMetaLabel(r) || '—'),
        '断点 ' + (getTrackingBpMetaLabel(r) || '—'),
      ];
      if (unreadNote) noteBits.push(unreadNote);
      return {
        tone: 'red',
        text: pill || '更新',
        note: noteBits.join(' · '),
      };
    }
    if (r.has_update) {
      return {
        tone: 'yellow',
        text: pill || '更新',
        note:
          (unreadNote ? unreadNote + ' · ' : '') +
          (getTrackingTopMetaLabel(r) || '列表顶部有变化'),
      };
    }
    if (top && bp && top === bp) {
      return { tone: 'green', text: '已追到', note: '断点已在最新' };
    }
    if (r.last_check_at) {
      const rel = formatCompactRelativeTime(r.last_check_at);
      return { tone: 'gray', text: '已检查', note: rel ? '检查于 ' + rel : '已检查' };
    }
    return {
      tone: 'gray',
      text: '未检查',
      note: r.last_browsed_at
        ? '上次浏览 ' + (formatCompactRelativeTime(r.last_browsed_at) || '')
        : '尚未浏览',
    };
  }

  /**
   * ExH 卡片：
   * 标题 + leaf(更新/…)
   * 胶囊行：[最新 YY-MM-DD HH:mm] [断点 YY-MM-DD HH:mm]
   * （发布时间改放胶囊，不再占 meta 长行；「当前/上次」去掉，当前页用卡片 is-current 描边）
   */
  function buildExhTrackingItemHtml(r, curSig) {
    const isCurrent = !!(curSig && r.query_signature === curSig);
    const title = getTrackingDisplayTitle(r);
    const status = buildExhTrackingStatus(r);
    const hasBp = trackingHasAnyBreakpoint(r);
    const hasWorkBp = trackingHasWorkBreakpoint(r);
    const bpPage = Number(r.breakpoint_page);
    const hasBpPage = Number.isFinite(bpPage) && bpPage >= 0 && (hasBp || hasWorkBp);
    const topGid = compactText(r.top_gid || '');
    const bpGid = compactText(r.breakpoint_gid || '');

    const topPosted = getTrackingTopMetaLabel(r);
    const bpPosted = getTrackingBpMetaLabel(r);

    const topHover =
      '最新 ' +
      (topPosted || '未知时间') +
      (r.top_title ? ' · ' + compactText(r.top_title) : topGid ? ' · g' + topGid : '');
    const bpHoverBits = [
      '断点 ' + (bpPosted || '未知时间'),
      r.breakpoint_title
        ? compactText(r.breakpoint_title)
        : bpGid
          ? 'g' + bpGid
          : '',
      hasBpPage ? '列表第' + (bpPage + 1) + '页' : '',
    ].filter(Boolean);
    const bpHover = bpHoverBits.join(' · ');

    // 胶囊：最新 / 断点（替代原「当前 · 上次」行）
    const subPills = [];
    if (topGid || topPosted) {
      subPills.push(
        '<span class="jlc-site-pill is-top" title="' +
          escapeHtml(topHover) +
          '">' +
          escapeHtml('最新 ' + (topPosted || '—')) +
          '</span>'
      );
    }
    if (bpGid || bpPosted || hasWorkBp) {
      subPills.push(
        '<span class="jlc-site-pill is-bp' +
          (hasWorkBp ? ' is-last' : '') +
          '" title="' +
          escapeHtml(bpHover) +
          '">' +
          escapeHtml('断点 ' + (bpPosted || '—')) +
          '</span>'
      );
    }

    const leafTitle = status.note || status.text || '';
    const isFocus = !!(
      status.tone === 'red' ||
      status.tone === 'yellow' ||
      (typeof trackingHasPendingUpdate === 'function'
        ? trackingHasPendingUpdate(r)
        : r.has_update) ||
      isCurrent
    );

    return (
      '<div class="jlc-wb-item tone-' +
      escapeHtml(status.tone || 'gray') +
      (isFocus ? ' is-focus' : '') +
      (isCurrent ? ' is-current' : '') +
      '" data-trk="' +
      escapeHtml(r.id) +
      '" title="点击打开">' +
      '<div class="jlc-wb-item-row">' +
      buildTrackingCoverHtml(r) +
      '<div class="jlc-wb-item-body">' +
      '<div class="jlc-wb-item-title-row">' +
      '<div class="jlc-wb-item-title">' +
      escapeHtml(title) +
      '</div>' +
      '<span class="jlc-wb-leaf tone-' +
      escapeHtml(status.tone || 'gray') +
      '" title="' +
      escapeHtml(leafTitle) +
      '">' +
      escapeHtml(status.text) +
      '</span>' +
      '</div>' +
      (subPills.length
        ? '<div class="jlc-wb-item-pills">' + subPills.join('') + '</div>'
        : '<div class="jlc-wb-item-pills"></div>') +
      '</div>' +
      '<div class="jlc-wb-item-side">' +
      '<button type="button" class="jlc-wb-open-btn" data-tact="open" title="打开">Open</button>' +
      '<button type="button" class="jlc-wb-more-btn" data-tact="menu" title="更多">···</button>' +
      '<div class="jlc-wb-item-menu" data-menu="' +
      escapeHtml(r.id) +
      '" hidden>' +
      '<button type="button" data-tact="open-same">本页打开</button>' +
      '<button type="button" data-tact="check">检查更新</button>' +
      '<button type="button" data-tact="rename">改名</button>' +
      '<button type="button" data-tact="folder">设分类</button>' +
      (hasBp ? '<button type="button" data-tact="bp">继续断点</button>' : '') +
      '<button type="button" data-tact="clear-bp">清除断点</button>' +
      '<button type="button" class="is-danger" data-tact="del">删除</button>' +
      '</div>' +
      '</div></div></div>'
    );
  }

  async function paintTrackingList() {
    const host = document.getElementById('jlc-wb-list-scroll');
    if (!host) return;
    let list = await listTrackingSearches();
    const q = compactText(wbSession.trackingQuery || '').toLowerCase();
    const gf = wbSession.trackingGroup || 'all';
    if (gf === 'none') {
      list = list.filter((r) => !compactText(r.custom_folder || ''));
    } else if (gf.indexOf('uf:') === 0) {
      const want = gf.slice(3);
      list = list.filter((r) => compactText(r.custom_folder || '').toLowerCase() === want);
    } else if (gf !== 'all') {
      // 兼容旧筛选：不再按自动类型拆，忽略
    }
    if (q) {
      list = list.filter(
        (r) =>
          getTrackingDisplayTitle(r).toLowerCase().includes(q) ||
          (r.f_search || '').toLowerCase().includes(q) ||
          compactText(r.custom_folder || '')
            .toLowerCase()
            .includes(q)
      );
    }

    const ctx = parseExhPageContext(location.href);
    const curSig = ctx && ctx.trackable ? ctx.query_signature : '';

    // 旧记录可能没有发布时间：DOM / editions / gdata 批量回填
    try {
      await enrichTrackingListPosted(list);
    } catch (_) { /* ignore */ }

    if (!(trackingCheckRuntime && trackingCheckRuntime.active)) {
      const pending = list.filter((r) =>
        typeof trackingHasPendingUpdate === 'function' ? trackingHasPendingUpdate(r) : !!r.has_update
      );
      const unreadSum = pending.reduce((s, r) => {
        const n =
          typeof getTrackingUnreadEstimate === 'function' ? getTrackingUnreadEstimate(r) : 0;
        return s + n;
      }, 0);
      setFooterSummary(
        (list.length ? list.length + ' 个追更' : '还没有追更') +
          (pending.length ? ' · ' + pending.length + ' 更新' : '') +
          (unreadSum ? ' · 约 +' + unreadSum : '') +
          (ctx && ctx.trackable ? ' · 可收藏当前' : '')
      );
    }
    updateTrackingCheckButton();

    if (!list.length) {
      host.innerHTML =
        '<div class="jlc-wb-empty">' +
        (ctx && ctx.trackable
          ? '没有匹配的追更项。可点顶部条「⭐ 收藏」或底部「⭐ 收藏当前」。'
          : '还没有追更项。请先打开标签/搜索/社团页，再点「⭐ 收藏」。') +
        '</div>';
      return;
    }

    // 分组：仅手动分类；无分类 →「未分类」
    const groups = {};
    list.forEach((r) => {
      const g = getTrackingListGroupKey(r);
      if (!groups[g]) groups[g] = [];
      groups[g].push(r);
    });
    const groupKeys = Object.keys(groups).sort((a, b) => {
      // 未分类置顶，便于先处理再「设分类」
      if (a === 'none' && b !== 'none') return -1;
      if (b === 'none' && a !== 'none') return 1;
      const la = getTrackingListGroupLabel(a, groups[a][0]);
      const lb = getTrackingListGroupLabel(b, groups[b][0]);
      return la.localeCompare(lb, 'zh');
    });

    if (!wbSession.collapsedGroups || typeof wbSession.collapsedGroups !== 'object') {
      wbSession.collapsedGroups = {};
    }
    const collapsedMap = wbSession.collapsedGroups;

    const chunks = [];
    groupKeys.forEach((g) => {
      const rows = groups[g];
      if (!rows || !rows.length) return;
      const updates = rows.filter((r) =>
        typeof trackingHasPendingUpdate === 'function' ? trackingHasPendingUpdate(r) : !!r.has_update
      );
      const unreadSum = updates.reduce((s, r) => {
        const n =
          typeof getTrackingUnreadEstimate === 'function' ? getTrackingUnreadEstimate(r) : 0;
        return s + n;
      }, 0);
      const gLabel = getTrackingListGroupLabel(g, rows[0]);
      const collapsed = !!collapsedMap[g];
      const updateLabel = updates.length
        ? '（' +
          updates.length +
          ' 更新' +
          (unreadSum ? ' · +' + unreadSum + (updates.some((r) => r.unread_estimate_capped) ? '+' : '') : '') +
          '）'
        : '';
      chunks.push(
        '<section class="jlc-wb-group' +
          (collapsed ? ' collapsed' : '') +
          '" data-jlc-group="' +
          escapeHtml(g) +
          '">' +
          '<button type="button" class="jlc-wb-group-toggle" data-jlc-toggle-group="' +
          escapeHtml(g) +
          '"><span>' +
          escapeHtml(gLabel) +
          escapeHtml(updateLabel) +
          '</span><small>' +
          rows.length +
          ' 项</small></button>' +
          '<div class="jlc-wb-group-body">'
      );
      rows.forEach((r) => {
        chunks.push(buildExhTrackingItemHtml(r, curSig));
      });
      chunks.push('</div></section>');
    });

    host.innerHTML = chunks.join('');
    // 点列表外关掉 fixed 菜单
    if (!host.dataset.excMenuDocBound) {
      host.dataset.excMenuDocBound = '1';
      document.addEventListener(
        'click',
        (ev) => {
          if (ev.target.closest && ev.target.closest('#jlc-wb .jlc-wb-item-menu, #jlc-wb .jlc-wb-more-btn')) {
            return;
          }
          const sc = document.getElementById('jlc-wb-list-scroll');
          if (!sc) return;
          sc.querySelectorAll('.jlc-wb-item-menu').forEach((m) => {
            m.hidden = true;
            m.classList.remove('is-fixed-menu', 'is-up');
            m.style.cssText = '';
          });
          sc.querySelectorAll('.jlc-wb-more-btn.is-open').forEach((b) => b.classList.remove('is-open'));
          sc.querySelectorAll('.jlc-wb-item.is-menu-open').forEach((c) => c.classList.remove('is-menu-open'));
        },
        true
      );
    }
    host.onclick = async (e) => {
      // 分组折叠/展开
      const toggle = e.target.closest('[data-jlc-toggle-group]');
      if (toggle) {
        e.preventDefault();
        e.stopPropagation();
        const gk = toggle.getAttribute('data-jlc-toggle-group') || '';
        const section = toggle.closest('.jlc-wb-group');
        if (!gk || !section) return;
        wbSession = wbSession || loadSession();
        if (!wbSession.collapsedGroups || typeof wbSession.collapsedGroups !== 'object') {
          wbSession.collapsedGroups = {};
        }
        const next = !section.classList.contains('collapsed');
        section.classList.toggle('collapsed', next);
        if (next) wbSession.collapsedGroups[gk] = true;
        else delete wbSession.collapsedGroups[gk];
        saveSession(wbSession);
        return;
      }

      const menuBtn = e.target.closest('[data-tact="menu"]');
      const tactBtn = e.target.closest('[data-tact]');
      const item = e.target.closest('[data-trk]');
      if (!item) return;
      const id = item.getAttribute('data-trk');
      const list2 = await listTrackingSearches();
      const rec = list2.find((r) => r.id === id);
      if (!rec) return;

      if (menuBtn) {
        e.preventDefault();
        e.stopPropagation();
        const menu = item.querySelector('.jlc-wb-item-menu');
        const moreBtn = item.querySelector('.jlc-wb-more-btn');
        const willOpen = !!(menu && menu.hidden);
        // 关掉其它菜单并清掉 fixed 定位
        host.querySelectorAll('.jlc-wb-item-menu').forEach((m) => {
          m.hidden = true;
          m.classList.remove('is-up', 'is-fixed-menu');
          m.style.cssText = '';
        });
        host.querySelectorAll('.jlc-wb-more-btn.is-open').forEach((b) => b.classList.remove('is-open'));
        host.querySelectorAll('.jlc-wb-item.is-menu-open').forEach((c) => c.classList.remove('is-menu-open'));
        if (menu && willOpen) {
          menu.hidden = false;
          if (moreBtn) moreBtn.classList.add('is-open');
          item.classList.add('is-menu-open');
          // fixed 挂到视口：避免列表 overflow 裁切 / 上翻被组头挡住
          const anchor = moreBtn || menuBtn;
          const r = anchor.getBoundingClientRect();
          menu.classList.add('is-fixed-menu');
          menu.style.position = 'fixed';
          menu.style.zIndex = '1000200';
          menu.style.left = 'auto';
          menu.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
          menu.style.top = r.bottom + 4 + 'px';
          menu.style.bottom = 'auto';
          requestAnimationFrame(() => {
            const mr = menu.getBoundingClientRect();
            if (mr.bottom > window.innerHeight - 8) {
              // 下方不够：贴按钮上方，仍用 fixed，不会被列表裁
              menu.style.top = 'auto';
              menu.style.bottom = Math.max(8, window.innerHeight - r.top + 4) + 'px';
            }
            if (mr.right > window.innerWidth - 4) {
              menu.style.right = '8px';
            }
          });
        }
        return;
      }

      if (!tactBtn) {
        // 点卡片空白：按默认方式打开，并收起工作台
        await openTrackingRecordFromWorkbench(rec, 'default');
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const act = tactBtn.getAttribute('data-tact');
      if (act === 'open') {
        await openTrackingRecordFromWorkbench(rec, 'default');
      } else if (act === 'open-same') {
        await openTrackingRecordFromWorkbench(rec, 'same');
      } else if (act === 'check') {
        if (trackingCheckRuntime && trackingCheckRuntime.active) {
          showToast('正在批量检查中…');
          return;
        }
        showToast('检查中…');
        try {
          await refreshSingleTrackingRecord(rec);
          {
            const pending =
              typeof trackingHasPendingUpdate === 'function'
                ? trackingHasPendingUpdate(rec)
                : !!rec.has_update;
            const pill =
              typeof getTrackingUpdatePillText === 'function' ? getTrackingUpdatePillText(rec) : '';
            showToast(
              pending
                ? '有更新' + (pill && pill !== '更新' ? ' ' + pill : '') + '：' + getTrackingDisplayTitle(rec)
                : '无新顶栏'
            );
          }
        } catch (err) {
          showToast('检查失败: ' + ((err && err.message) || err));
        }
        paintTrackingList();
        updateFabBadge();
      } else if (act === 'bp') {
        wbSession = wbSession || loadSession();
        wbSession.open = false;
        saveSession(wbSession);
        try {
          toggleWorkbench(false);
        } catch (_) { /* ignore */ }
        await openTrackingBreakpoint(rec);
      } else if (act === 'clear-bp') {
        rec.breakpoint_page = '';
        rec.breakpoint_url = '';
        rec.breakpoint_at = 0;
        rec.breakpoint_gid = '';
        rec.breakpoint_token = '';
        rec.breakpoint_title = '';
        rec.breakpoint_posted_at = 0;
        await saveTrackingRecord(rec);
        showToast('已清除断点');
        paintTrackingList();
      } else if (act === 'rename') {
        const next = prompt('追更显示名', getTrackingDisplayTitle(rec));
        if (next == null) return;
        rec.custom_label = compactText(next);
        await saveTrackingRecord(rec);
        paintTrackingList();
      } else if (act === 'folder') {
        const next = prompt(
          '手动分类名（用于列表分组；留空=放回「未分类」）',
          rec.custom_folder || ''
        );
        if (next == null) return;
        rec.custom_folder = compactText(next);
        await saveTrackingRecord(rec);
        // 分类变更后重刷整页，更新筛选下拉里的分类名
        await renderTrackingPage();
      } else if (act === 'del') {
        if (!confirm('删除追更「' + getTrackingDisplayTitle(rec) + '」？')) return;
        await deleteTrackingRecord(id);
        paintTrackingList();
        updateFabBadge();
      }
    };
  }

  async function renderWorksPage() {
    const root = document.getElementById('exc-wb-works-root');
    if (!root) return;
    const tab = ['blocked', 'better', 'lrr'].includes(wbSession.workTab) ? wbSession.workTab : 'lrr';
    root.innerHTML =
      '<div class="jlc-wb-toolbar">' +
      '  <div class="jlc-wb-toolbar-row" id="exc-work-chips"></div>' +
      '  <div class="jlc-wb-toolbar-row" style="color:#9a7d60;font-size:12.5px">在库=同步后的 LRR 档案；有更好版/抛弃依赖已浏览作品。搜索收藏请用「追更」。</div>' +
      '</div>' +
      '<div class="jlc-wb-list-scroll" id="jlc-wb-works-scroll"></div>';

    const chips = [
      { id: 'lrr', label: 'LRR 在库' },
      { id: 'better', label: '有更好版' },
      { id: 'blocked', label: '已抛弃' },
    ];
    const chipHost = document.getElementById('exc-work-chips');
    chipHost.innerHTML = chips
      .map(
        (c) =>
          '<button type="button" class="jlc-wb-chip' +
          (c.id === tab ? ' is-on' : '') +
          '" data-wtab="' +
          c.id +
          '">' +
          c.label +
          '</button>'
      )
      .join('');
    chipHost.onclick = (e) => {
      const b = e.target.closest('[data-wtab]');
      if (!b) return;
      wbSession.workTab = b.getAttribute('data-wtab');
      saveSession(wbSession);
      renderWorksPage();
    };
    await paintWorksList(tab);
  }

  async function paintWorksList(tab) {
    const host = document.getElementById('jlc-wb-works-scroll');
    if (!host) return;

    // LRR 在库：直接列档案（同步后即有），不依赖是否点过画廊
    if (tab === 'lrr') {
      await paintLrrLibraryList(host);
      return;
    }

    let works = [];
    if (tab === 'blocked') works = await listBlockedWorks();
    else if (tab === 'better') {
      const all = await listAllWorks();
      for (const w of all) {
        const eds = await listEditionsByWork(w.work_id);
        if (!eds.length) continue;
        const lib = await resolveLibraryState(Object.assign({}, eds[0], { work_id: w.work_id }));
        if (lib.has_better_remote) works.push(Object.assign({}, w, { _lib: lib }));
      }
    }

    setFooterSummary((works.length ? works.length + ' 本' : '无') + ' · 作品');
    if (!works.length) {
      host.innerHTML =
        '<div class="jlc-wb-empty">暂无条目。有更好版需先浏览过相关画廊；画廊页可「抛弃」屏蔽单本。</div>';
      return;
    }
    const chunks = [];
    for (const w of works.slice(0, 80)) {
      const eds = await listEditionsByWork(w.work_id);
      const best = pickBestEdition(eds, config);
      const title = w.title_raw || (best && best.title_raw) || w.work_id;
      const url = best ? best.url || buildGalleryUrl(location.origin, best.gid, best.token) : '';
      chunks.push(
        '<div class="jlc-wb-item" data-work="' +
          escapeHtml(w.work_id) +
          '">' +
          '<div class="jlc-wb-item-title">' +
          (url ? '<a href="' + escapeHtml(url) + '" style="color:inherit;text-decoration:none">' + escapeHtml(title) + '</a>' : escapeHtml(title)) +
          '</div>' +
          '<div class="jlc-wb-item-actions">' +
          '<button type="button" class="jlc-wb-btn primary" data-wact="best">最佳版</button>' +
          '<button type="button" class="jlc-wb-btn ghost" data-wact="bind">LRR</button>' +
          '</div></div>'
      );
    }
    host.innerHTML = chunks.join('');
    host.onclick = async (e) => {
      const btn = e.target.closest('[data-wact]');
      if (!btn) return;
      const workId = btn.closest('[data-work]')?.getAttribute('data-work');
      if (!workId) return;
      const eds = await listEditionsByWork(workId);
      const best = pickBestEdition(eds, config) || eds[0];
      if (btn.getAttribute('data-wact') === 'best') await openBestEdition(workId);
      if (btn.getAttribute('data-wact') === 'bind' && best) {
        best.work_id = workId;
        await openBindModal(best);
      }
    };
  }

  async function paintLrrLibraryList(host) {
    const entries = typeof listLibraryArchiveEntries === 'function' ? await listLibraryArchiveEntries() : [];
    const total = entries.length;
    setFooterSummary((total ? total + ' 本' : '无') + ' · LRR 档案');
    if (!total) {
      const st = typeof getLrrStatus === 'function' ? getLrrStatus() : {};
      host.innerHTML =
        '<div class="jlc-wb-empty">' +
        (st.configured
          ? st.last_error
            ? 'LRR 上次同步失败：' + escapeHtml(st.last_error) + '。请到「设置 → 同步」重试。'
            : st.last_sync
              ? '本地无档案。可到「设置 → 同步」重新同步 LRR。'
              : '尚未同步 LRR。请到「设置 → 同步」拉取在库列表。'
          : '未配置 LRR。请到「设置 → 同步」填写 Base URL / API Key 后同步。') +
        '</div>';
      return;
    }

    const limit = 200;
    // 当前画廊页：对应档案置顶 + 高亮
    let pageGid = '';
    try {
      if (typeof parseGalleryUrl === 'function') {
        const gt = parseGalleryUrl(location.href);
        if (gt && gt.gid) pageGid = String(gt.gid);
      }
    } catch (_) { /* ignore */ }
    const isEntCurrent = (ent) => {
      if (!pageGid || !ent) return false;
      const a = ent.archive || {};
      if (a.eh_gid && String(a.eh_gid) === pageGid) return true;
      if (ent.edition && String(ent.edition.gid) === pageGid) return true;
      if (ent.source && String(ent.source.gid) === pageGid) return true;
      if (ent.link && ent.link.edition_id && String(ent.link.edition_id).indexOf('e_' + pageGid + '_') === 0) {
        return true;
      }
      return false;
    };
    const ranked = entries.slice().sort((x, y) => {
      const cx = isEntCurrent(x) ? 1 : 0;
      const cy = isEntCurrent(y) ? 1 : 0;
      if (cy !== cx) return cy - cx;
      const tx = String((x.archive && x.archive.title) || '').toLowerCase();
      const ty = String((y.archive && y.archive.title) || '').toLowerCase();
      return tx < ty ? -1 : tx > ty ? 1 : 0;
    });
    const shown = ranked.slice(0, limit);
    const chunks = [];
    if (total > limit) {
      chunks.push(
        '<div class="legacy-note" style="margin:0 0 8px">共 ' +
          total +
          ' 本，先显示前 ' +
          limit +
          ' 本（当前页相关置顶，其余按标题）。</div>'
      );
    }
    for (const ent of shown) {
      const a = ent.archive;
      const title =
        (ent.work && ent.work.title_raw) ||
        (ent.edition && ent.edition.title_raw) ||
        a.title ||
        a.arcid;
      const lrrUrl = typeof buildLrrReaderUrl === 'function' ? buildLrrReaderUrl(a.arcid) : '';
      let galleryUrl = '';
      if (ent.edition && ent.edition.gid && ent.edition.token) {
        galleryUrl = ent.edition.url || buildGalleryUrl(location.origin, ent.edition.gid, ent.edition.token);
      } else if (ent.source && ent.source.gid && ent.source.token) {
        galleryUrl = buildGalleryUrl(location.origin, ent.source.gid, ent.source.token);
      }
      const onPage = isEntCurrent(ent);
      const metaBits = [];
      if (onPage) metaBits.push('当前页');
      if (a.pages) metaBits.push(a.pages + 'p');
      if (a.eh_gid) metaBits.push('gid ' + a.eh_gid);
      if (ent.link) metaBits.push(ent.link.same_version ? '已确认同源' : '已绑定');
      else if (ent.edition) metaBits.push('ehgid 命中');
      else metaBits.push('仅档案');

      const mono = compactText(title).charAt(0) || '本';
      const actions =
        (lrrUrl
          ? '<a class="jlc-wb-btn primary" href="' +
            escapeHtml(lrrUrl) +
            '" target="_blank" rel="noopener">开 LRR</a>'
          : '') +
        (galleryUrl
          ? '<a class="jlc-wb-btn ghost" href="' +
            escapeHtml(galleryUrl) +
            '" target="_blank" rel="noopener">画廊</a>'
          : '') +
        (ent.work && ent.work.work_id
          ? '<button type="button" class="jlc-wb-btn ghost" data-wact="best">最佳版</button>'
          : '');

      chunks.push(
        '<div class="jlc-wb-item' +
          (onPage ? ' is-current is-lrr-page' : '') +
          '" data-arcid="' +
          escapeHtml(a.arcid) +
          '"' +
          (ent.work && ent.work.work_id ? ' data-work="' + escapeHtml(ent.work.work_id) + '"' : '') +
          '>' +
          '<div class="jlc-wb-item-row">' +
          '<div class="jlc-wb-cover is-poster" data-lrr-cover="' +
          escapeHtml(a.arcid) +
          '" data-group="tag">' +
          '<span class="jlc-wb-cover-fallback">' +
          escapeHtml(mono) +
          '</span></div>' +
          '<div class="jlc-wb-item-body">' +
          '<div class="jlc-wb-item-title">' +
          (onPage ? '<span class="exc-ed-cur-tag">当前</span> ' : '') +
          escapeHtml(title) +
          '</div>' +
          (metaBits.length
            ? '<div class="jlc-wb-item-meta"><div class="jlc-wb-item-meta-line">' +
              escapeHtml(metaBits.join(' · ')) +
              '</div></div>'
            : '') +
          (actions ? '<div class="jlc-wb-item-actions">' + actions + '</div>' : '') +
          '</div></div></div>'
      );
    }
    host.innerHTML = chunks.join('');
    if (typeof hydrateLrrThumbnailsIn === 'function') {
      try {
        hydrateLrrThumbnailsIn(host);
      } catch (_) { /* ignore */ }
    }
    host.onclick = async (e) => {
      const btn = e.target.closest('[data-wact]');
      if (!btn) return;
      const workId = btn.closest('[data-work]')?.getAttribute('data-work');
      if (!workId) return;
      if (btn.getAttribute('data-wact') === 'best') await openBestEdition(workId);
    };
  }

  function renderSettingsSections(tab) {
    const body = document.getElementById('exc-settings-body');
    if (!body) return;
    const st = getLrrStatus();

    // 兼容旧 tab id
    if (tab === 'lrr') tab = 'sync';
    if (tab === 'block') tab = 'tags';

    if (tab === 'sync') {
      const intervalMin = Math.max(5, Number(config.lrr_sync_interval_min) || 60);
      const sync = ensureCreamuSync();
      const syncStatus = sync ? sync.statusText() : '同步模块未加载';
      const conf = config.webdav_conflict || 'ask';
      const pwdSaved = !!(config.webdav_password || '');
      body.innerHTML =
        '<section class="jlc-wb-settings-section is-active">' +
        '<h3>一键同步</h3>' +
        '<div class="legacy-note">工作台底部「同步」= WebDAV + LRR（已配置的项）。本页可单独配置与触发。</div>' +
        '<button type="button" class="jlc-wb-btn primary" id="exc-cfg-sync-both" style="width:100%;margin-top:8px;">同步 WebDAV + LRR</button>' +
        '<h3 style="margin-top:18px">WebDAV</h3>' +
        '<div class="legacy-note">坚果云 / Nextcloud 等。读写 {路径}/exh.vault.json。请用应用密码。</div>' +
        '<label>地址</label><input id="exc-cfg-wd-url" type="text" value="' +
        escapeHtml(config.webdav_url || '') +
        '" placeholder="https://dav.jianguoyun.com/dav/">' +
        '<label>用户名</label><input id="exc-cfg-wd-user" type="text" value="' +
        escapeHtml(config.webdav_user || '') +
        '" autocomplete="username">' +
        '<label>应用密码</label><input id="exc-cfg-wd-pass" type="password" value="" placeholder="' +
        (pwdSaved ? '已保存（留空不修改）' : '应用密码') +
        '" autocomplete="new-password">' +
        '<label>远端路径</label><input id="exc-cfg-wd-path" type="text" value="' +
        escapeHtml(config.webdav_path || '/Creamu') +
        '">' +
        '<div class="legacy-row legacy-toggle"><span>启用 WebDAV</span><input type="checkbox" id="exc-cfg-wd-en" ' +
        (config.webdav_enabled ? 'checked' : '') +
        '></div>' +
        '<div class="legacy-row legacy-toggle"><span>打开页面时自动同步 WebDAV</span><input type="checkbox" id="exc-cfg-wd-auto" ' +
        (config.webdav_auto !== false ? 'checked' : '') +
        '></div>' +
        '<label>冲突策略</label><select id="exc-cfg-wd-conflict" class="jlc-wb-select" style="width:100%;margin-top:6px;">' +
        '<option value="ask"' +
        (conf === 'ask' ? ' selected' : '') +
        '>询问</option>' +
        '<option value="remote"' +
        (conf === 'remote' ? ' selected' : '') +
        '>云端优先</option>' +
        '<option value="local"' +
        (conf === 'local' ? ' selected' : '') +
        '>本机优先</option>' +
        '</select>' +
        '<div class="legacy-note" id="exc-wd-status" style="margin-top:8px;">' +
        escapeHtml(syncStatus) +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-wd-test" style="flex:1">测试连接</button>' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-wd-sync" style="flex:1">仅同步 WebDAV</button>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-wd-push" style="flex:1">强制推送</button>' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-wd-pull" style="flex:1">强制拉取</button>' +
        '</div>' +
        '<h3 style="margin-top:18px">LANraragi</h3>' +
        '<div class="legacy-note">' +
        (st.configured
          ? st.last_error
            ? '错误: ' + escapeHtml(st.last_error)
            : '已配置' +
              (st.last_sync
                ? ' · 上次 ' +
                  new Date(st.last_sync).toLocaleString() +
                  (st.last_count ? ' · ' + st.last_count + ' 条' : '')
                : ' · 尚未同步')
          : '未配置 Base URL / API Key') +
        ' · 自动间隔 ' +
        intervalMin +
        ' 分钟</div>' +
        '<label>Base URL</label><input id="exc-cfg-lrr-url" type="text" value="' +
        escapeHtml(config.lrr_base_url || '') +
        '">' +
        '<label>API Key</label><input id="exc-cfg-lrr-key" type="password" value="' +
        escapeHtml(config.lrr_api_key || '') +
        '">' +
        '<label>自动同步间隔（分钟，≥5）</label><input id="exc-cfg-lrr-interval" type="number" min="5" step="5" value="' +
        escapeHtml(String(intervalMin)) +
        '">' +
        '<div class="legacy-row legacy-toggle"><span>结构指纹自动链接</span><input type="checkbox" id="exc-cfg-struct" ' +
        (config.auto_link_structural ? 'checked' : '') +
        '></div>' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-cfg-lrr-sync-now" style="width:100%;margin-top:10px;">仅同步 LRR</button>' +
        settingsSaveFooter() +
        '</section>';
      bindSyncSettingsHandlers(body);
    } else if (tab === 'pref') {
      const foldMode = ['preference', 'newest', 'list_order'].includes(config.fold_primary_mode)
        ? config.fold_primary_mode
        : 'preference';
      body.innerHTML =
        '<section class="jlc-wb-settings-section is-active">' +
        '<h3>版本偏好</h3>' +
        '<label>语言序</label><input id="exc-cfg-lang" type="text" value="' +
        escapeHtml((config.lang_order || []).join(', ')) +
        '">' +
        '<label>码级序</label><input id="exc-cfg-censor" type="text" value="' +
        escapeHtml((config.censor_order || []).join(', ')) +
        '">' +
        '<label>汉化组白名单</label><input id="exc-cfg-gwhite" type="text" value="' +
        escapeHtml((config.group_whitelist || []).join(', ')) +
        '">' +
        '<label>汉化组黑名单</label><input id="exc-cfg-gblack" type="text" value="' +
        escapeHtml((config.group_blacklist || []).join(', ')) +
        '">' +
        '<div class="legacy-row legacy-toggle"><span>列表折叠同 Work</span><input type="checkbox" id="exc-cfg-fold" ' +
        (config.list_fold_works ? 'checked' : '') +
        '></div>' +
        '<div class="legacy-row legacy-toggle"><span>列表打开画廊用新标签页</span><input type="checkbox" id="exc-cfg-list-newtab" ' +
        (config.list_open_in_new_tab ? 'checked' : '') +
        '></div>' +
        '<div class="legacy-note" style="margin:0 0 8px">开启后，列表点作品默认 target=_blank（站点本身是本页打开）。</div>' +
        '<div class="legacy-row legacy-toggle"><span>列表显示重点标签流</span><input type="checkbox" id="exc-cfg-tag-stream" ' +
        (config.list_show_tag_stream !== false ? 'checked' : '') +
        '></div>' +
        '<label>标签流最多条数</label><input id="exc-cfg-tag-stream-max" type="number" min="1" max="8" step="1" value="' +
        escapeHtml(String(Math.max(1, Math.min(8, Number(config.list_tag_stream_max) || 4)))) +
        '">' +
        '<div class="legacy-note" style="margin:0 0 8px">标签流只补标题/熟人看不出的信息：无码·全彩·内容(mother…)·角色。画师/组仅熟人徽章；在库用绿框+徽章，不进标签流。</div>' +
        '<label>折叠时主显示版本</label>' +
        '<select id="exc-cfg-fold-mode" class="jlc-wb-select" style="width:100%;margin-top:6px;">' +
        '<option value="preference"' +
        (foldMode === 'preference' ? ' selected' : '') +
        '>偏好最佳（语言→码级→体积→汉化组→页数）</option>' +
        '<option value="newest"' +
        (foldMode === 'newest' ? ' selected' : '') +
        '>最新上传</option>' +
        '<option value="list_order"' +
        (foldMode === 'list_order' ? ' selected' : '') +
        '>列表原序（页面里更靠前）</option>' +
        '</select>' +
        '<div class="legacy-note" style="margin-top:8px">「偏好最佳」与打开最佳版一致；「最新」看 posted；「列表原序」保留站点排序。</div>' +
        '<div class="legacy-row legacy-toggle"><span>自动聚类</span><input type="checkbox" id="exc-cfg-auto-cluster" ' +
        (config.auto_cluster ? 'checked' : '') +
        '></div>' +
        '<h3 style="margin-top:16px">库内对照容差</h3>' +
        '<div class="legacy-note">页数/体积容差：超容差只标打包差异，不判更优。</div>' +
        '<label>页数容差比例（%）</label><input id="exc-cfg-page-tol-pct" type="number" min="0" max="100" step="1" value="' +
        escapeHtml(String(Math.round((Number(config.pages_tolerance_ratio) || 0.1) * 100))) +
        '">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">' +
        '<div style="flex:1;min-width:100px"><label>页数容差最小</label><input id="exc-cfg-page-tol-min" type="number" min="0" step="1" value="' +
        escapeHtml(String(Number(config.pages_tolerance_min) || 1)) +
        '"></div>' +
        '<div style="flex:1;min-width:100px"><label>页数容差最大</label><input id="exc-cfg-page-tol-max" type="number" min="1" step="1" value="' +
        escapeHtml(String(Number(config.pages_tolerance_max) || 25)) +
        '"></div></div>' +
        '<label style="margin-top:8px">体积容差比例（%）</label><input id="exc-cfg-size-tol-pct" type="number" min="0" max="100" step="1" value="' +
        escapeHtml(String(Math.round((Number(config.size_tolerance_ratio) || 0.12) * 100))) +
        '">' +
        '<label>体积容差最小（MB）</label><input id="exc-cfg-size-tol-mb" type="number" min="0" step="0.5" value="' +
        escapeHtml(String(Math.round(((Number(config.size_tolerance_min_bytes) || 1048576) / (1024 * 1024)) * 10) / 10)) +
        '">' +
        '<label>页均体积容差（%）</label><input id="exc-cfg-bpp-tol-pct" type="number" min="0" max="100" step="1" value="' +
        escapeHtml(String(Math.round((Number(config.bpp_tolerance_ratio) || 0.2) * 100))) +
        '">' +
        settingsSaveFooter() +
        '</section>';
    } else if (tab === 'tags') {
      const radar = typeof getFamiliarRadar === 'function' ? getFamiliarRadar() : { artistList: [], groupList: [] };
      const lrrArtists = (loadLrrMeta().familiar_artists || []).length;
      const lrrGroups = (loadLrrMeta().familiar_groups || []).length;
      body.innerHTML =
        '<section class="jlc-wb-settings-section is-active">' +
        '<h3>心动标签</h3>' +
        '<div class="legacy-note">逗号分隔。中英文都可：「母」「mother」「巨乳」等会扩别名。极简列表若无标签，需标题里出现关键词，或先点开过该本（会缓存标签）。命中后橙框 + ♥。</div>' +
        '<textarea id="exc-cfg-fav-tags" rows="3" style="width:100%;margin-top:6px;border-radius:12px;border:1px solid #e4d4bc;padding:10px;background:#fff;color:#4a3728" placeholder="母, mother, 巨乳, pantyhose">' +
        escapeHtml((config.fav_tags || []).join(', ')) +
        '</textarea>' +
        '<h3 style="margin-top:16px">过滤 / 屏蔽</h3>' +
        '<label>屏蔽标签</label><textarea id="exc-cfg-hate-tags" rows="2" style="width:100%;margin-top:6px;border-radius:12px;border:1px solid #e4d4bc;padding:10px;background:#fff;color:#4a3728">' +
        escapeHtml((config.hate_tags || []).join(', ')) +
        '</textarea>' +
        '<label>标题屏蔽词</label><input id="exc-cfg-title-kw" type="text" value="' +
        escapeHtml((config.block_title_keywords || []).join(', ')) +
        '">' +
        '<div class="legacy-row legacy-toggle"><span>隐藏已屏蔽条目</span><input type="checkbox" id="exc-cfg-hide-block" ' +
        (config.hide_blocked ? 'checked' : '') +
        '></div>' +
        '<h3 style="margin-top:16px">熟人（画师 / 团队）</h3>' +
        '<div class="stat-box" style="margin-bottom:10px">' +
        '<div class="stat-item"><b>' +
        (radar.artistList || []).length +
        '</b><span>画师</span></div>' +
        '<div class="stat-item"><b>' +
        (radar.groupList || []).length +
        '</b><span>团队</span></div>' +
        '<div class="stat-item"><b>' +
        lrrArtists +
        '/' +
        lrrGroups +
        '</b><span>LRR汇总</span></div>' +
        '</div>' +
        '<div class="legacy-note">同步 LRR / 点「刷新熟人」只汇总档案里带 <b>artist:</b> / <b>group:</b> 的标签。名单里没有的名字（如 emori uki）不会点亮——请确认 LRR 该本有 artist 标签，或手动加到手动画师。画师与团队已去重（同名优先算画师）。</div>' +
        '<label>手动画师（补 LRR 没打上的）</label><textarea id="exc-cfg-custom-artists" rows="2" style="width:100%;margin-top:6px;border-radius:12px;border:1px solid #e4d4bc;padding:10px;background:#fff;color:#4a3728" placeholder="emori uki, other artist">' +
        escapeHtml((config.custom_artists || []).join(', ')) +
        '</textarea>' +
        '<label>手动团队/汉化组</label><textarea id="exc-cfg-custom-groups" rows="2" style="width:100%;margin-top:6px;border-radius:12px;border:1px solid #e4d4bc;padding:10px;background:#fff;color:#4a3728" placeholder="group name">' +
        escapeHtml((config.custom_groups || []).join(', ')) +
        '</textarea>' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-cfg-rebuild-familiar" style="width:100%;margin-top:10px;">从本地 LRR 库刷新熟人</button>' +
        '<div id="exc-fam-preview" class="legacy-note" style="margin-top:8px;max-height:140px;overflow:auto">' +
        '<div style="margin-bottom:4px"><b>画师 ' +
        (radar.artistList || []).length +
        '</b> · <b>团队 ' +
        (radar.groupList || []).length +
        '</b> · LRR汇总 ' +
        lrrArtists +
        '/' +
        lrrGroups +
        '</div>' +
        (radar.artistList && radar.artistList.length
          ? '<b>画师</b> ' + escapeHtml(radar.artistList.slice(0, 40).join(' · ')) +
            (radar.artistList.length > 40 ? ' …' : '')
          : '暂无画师') +
        '<br>' +
        (radar.groupList && radar.groupList.length
          ? '<b>团队</b> ' + escapeHtml(radar.groupList.slice(0, 40).join(' · ')) +
            (radar.groupList.length > 40 ? ' …' : '')
          : '暂无团队') +
        '</div>' +
        settingsSaveFooter() +
        '</section>';
      const rebuildBtn = body.querySelector('#exc-cfg-rebuild-familiar');
      if (rebuildBtn) {
        rebuildBtn.onclick = async () => {
          if (typeof rebuildFamiliarFromLrrArchives !== 'function') {
            showToast('熟人模块未加载');
            return;
          }
          showToast('正在汇总…');
          try {
            const fam = await rebuildFamiliarFromLrrArchives();
            saveLrrMeta(
              Object.assign({}, loadLrrMeta(), {
                familiar_artists: fam.artists,
                familiar_groups: fam.groups,
              })
            );
            showToast('熟人 · 画师 ' + fam.artists.length + ' · 团队 ' + fam.groups.length);
            renderSettingsSections('tags');
            if (window.__excRefreshPage) window.__excRefreshPage();
          } catch (e) {
            showToast('刷新失败: ' + ((e && e.message) || e));
          }
        };
      }
    } else if (tab === 'data') {
      body.innerHTML =
        '<section class="jlc-wb-settings-section is-active">' +
        '<h3>备份</h3>' +
        '<div class="legacy-note" style="margin-bottom:10px;">导出/导入本机追更、配置、作品状态等。WebDAV 请到「同步」页。</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-export" style="flex:1">导出到剪贴板</button>' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-import" style="flex:1">从 JSON 导入</button>' +
        '</div>' +
        '</section>';
      const exp = body.querySelector('#exc-export');
      if (exp) {
        exp.onclick = async () => {
          const data = await exportBackup();
          if (typeof GM_setClipboard === 'function') {
            GM_setClipboard(JSON.stringify(data, null, 2));
            showToast('已复制备份 JSON');
          } else showToast('当前环境无法写剪贴板');
        };
      }
      const imp = body.querySelector('#exc-import');
      if (imp) {
        imp.onclick = async () => {
          const textIn = prompt('粘贴备份 JSON');
          if (!textIn) return;
          try {
            await importBackup(JSON.parse(textIn));
            showToast('导入完成');
            renderWorkbench();
          } catch (e) {
            showToast('导入失败');
          }
        };
      }
    } else if (tab === 'ui') {
      body.innerHTML =
        '<section class="jlc-wb-settings-section is-active">' +
        '<h3>外观</h3>' +
        '<div class="legacy-row legacy-toggle"><span>站点奶油主题</span><input type="checkbox" id="exc-cfg-cream-site" ' +
        (config.cream_site_theme ? 'checked' : '') +
        '></div>' +
        '<div class="legacy-note">e/exhentai 页面奶油底色。可随时关。</div>' +
        '<label style="margin-top:12px">详情页缩略图倍率</label>' +
        '<select id="exc-cfg-gdt-scale" class="jlc-wb-select" style="width:100%;margin-top:6px;">' +
        [1, 1.25, 1.5, 1.75, 2]
          .map((s) => {
            const cur = clampGalleryThumbScale(config.gallery_thumb_scale);
            const sel = Math.abs(cur - s) < 0.01 ? ' selected' : '';
            const lab =
              s === 1 ? '1.0× 原样' : s === 1.5 ? '1.5× 默认' : s + '×';
            return '<option value="' + s + '"' + sel + '>' + lab + '</option>';
          })
          .join('') +
        '</select>' +
        '<h3 style="margin-top:16px">列表悬停预览</h3>' +
        '<div class="legacy-row legacy-toggle"><span>悬停显示前几张</span><input type="checkbox" id="exc-cfg-hover-preview" ' +
        (config.list_hover_preview !== false ? 'checked' : '') +
        '></div>' +
        '<label>预览张数</label><select id="exc-cfg-hover-count" class="jlc-wb-select" style="width:100%;margin-top:6px;">' +
        [3, 4, 5, 6, 8]
          .map((n) => {
            const cur = clampHoverPreviewCount(config.list_hover_preview_count);
            return (
              '<option value="' +
              n +
              '"' +
              (cur === n ? ' selected' : '') +
              '>' +
              n +
              ' 张</option>'
            );
          })
          .join('') +
        '</select>' +
        '<label>悬停延迟</label><select id="exc-cfg-hover-delay" class="jlc-wb-select" style="width:100%;margin-top:6px;">' +
        [500, 1000, 2000, 3000, 4000, 5000]
          .map((n) => {
            const cur = clampHoverPreviewDelay(config.list_hover_preview_delay_ms);
            const closest = [500, 1000, 2000, 3000, 4000, 5000].reduce((a, b) =>
              Math.abs(b - cur) < Math.abs(a - cur) ? b : a
            );
            const sec = n >= 1000 ? n / 1000 + ' 秒' : n + ' ms';
            return (
              '<option value="' +
              n +
              '"' +
              (closest === n ? ' selected' : '') +
              '>' +
              sec +
              '</option>'
            );
          })
          .join('') +
        '</select>' +
        '<h3 style="margin-top:16px">追更检查更新</h3>' +
        '<div class="legacy-note">默认只请求每条追更的<strong>首页</strong>（与改跨页扫描前一样快）。断点不在首页时用断点页码估算未读（显示 +N+）。开启「跨页精确未读」才会向后翻页计数，会明显变慢。</div>' +
        '<div class="legacy-row legacy-toggle" style="margin-top:8px"><span>跨页精确未读（较慢）</span><input type="checkbox" id="exc-cfg-deep-scan" ' +
        (config.tracking_unread_deep_scan === true ? 'checked' : '') +
        '></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">' +
        '<div style="flex:1;min-width:100px"><label>条目间隔最小（秒）</label><input id="exc-cfg-chk-lo" type="number" min="2" max="60" step="1" value="' +
        escapeHtml(String(Math.round((Number(config.tracking_check_interval_min_ms) || 5000) / 1000))) +
        '"></div>' +
        '<div style="flex:1;min-width:100px"><label>条目间隔最大（秒）</label><input id="exc-cfg-chk-hi" type="number" min="2" max="120" step="1" value="' +
        escapeHtml(String(Math.round((Number(config.tracking_check_interval_max_ms) || 10000) / 1000))) +
        '"></div>' +
        '<div style="flex:1;min-width:100px"><label>精确扫描最多页数</label><input id="exc-cfg-scan-pages" type="number" min="1" max="40" step="1" value="' +
        escapeHtml(String(Math.max(1, Math.min(40, Number(config.tracking_unread_scan_max_pages) || 12)))) +
        '"></div></div>' +
        settingsSaveFooter() +
        '</section>';
      const creamToggle = body.querySelector('#exc-cfg-cream-site');
      if (creamToggle) {
        creamToggle.addEventListener('change', () => {
          config.cream_site_theme = !!creamToggle.checked;
          applyCreamSiteTheme();
        });
      }
      const gdtScaleSel = body.querySelector('#exc-cfg-gdt-scale');
      if (gdtScaleSel) {
        gdtScaleSel.addEventListener('change', () => {
          config.gallery_thumb_scale = clampGalleryThumbScale(gdtScaleSel.value);
          applyGalleryThumbScale();
        });
      }
      const hoverPrev = body.querySelector('#exc-cfg-hover-preview');
      if (hoverPrev) {
        hoverPrev.addEventListener('change', () => {
          config.list_hover_preview = !!hoverPrev.checked;
          if (!config.list_hover_preview && typeof hideHoverPreview === 'function') {
            hideHoverPreview();
          }
        });
      }
    } else {
      body.innerHTML =
        '<section class="jlc-wb-settings-section is-active"><div class="legacy-note">未知设置页</div></section>';
    }

    const saveBtn = body.querySelector('#exc-cfg-save');
    if (saveBtn) {
      saveBtn.onclick = () => {
        const patch = {};
        const v = (id) => body.querySelector('#' + id)?.value || '';
        const c = (id) => !!body.querySelector('#' + id)?.checked;
        if (tab === 'sync') {
          patch.lrr_base_url = v('exc-cfg-lrr-url');
          patch.lrr_api_key = v('exc-cfg-lrr-key');
          patch.auto_link_structural = c('exc-cfg-struct');
          {
            const iv = parseInt(v('exc-cfg-lrr-interval'), 10);
            if (Number.isFinite(iv)) patch.lrr_sync_interval_min = Math.max(5, iv);
          }
          patch.webdav_url = v('exc-cfg-wd-url').trim();
          patch.webdav_user = v('exc-cfg-wd-user').trim();
          patch.webdav_path = v('exc-cfg-wd-path').trim() || '/Creamu';
          patch.webdav_enabled = c('exc-cfg-wd-en');
          patch.webdav_auto = c('exc-cfg-wd-auto');
          patch.webdav_conflict = body.querySelector('#exc-cfg-wd-conflict')?.value || 'ask';
          const typedPass = v('exc-cfg-wd-pass');
          if (typedPass) patch.webdav_password = typedPass;
        } else if (tab === 'tags') {
          if (body.querySelector('#exc-cfg-fav-tags')) {
            patch.fav_tags = splitCsvField(v('exc-cfg-fav-tags'));
          }
          patch.hate_tags = splitCsvField(v('exc-cfg-hate-tags'));
          patch.block_title_keywords = splitCsvField(v('exc-cfg-title-kw'));
          patch.hide_blocked = c('exc-cfg-hide-block');
          patch.custom_artists = splitCsvField(v('exc-cfg-custom-artists'));
          patch.custom_groups = splitCsvField(v('exc-cfg-custom-groups'));
        } else if (tab === 'pref') {
          const lang = splitCsvField(v('exc-cfg-lang'));
          const censor = splitCsvField(v('exc-cfg-censor'));
          if (lang.length) patch.lang_order = lang;
          if (censor.length) patch.censor_order = censor;
          patch.group_whitelist = splitCsvField(v('exc-cfg-gwhite'));
          patch.group_blacklist = splitCsvField(v('exc-cfg-gblack'));
          patch.list_fold_works = c('exc-cfg-fold');
          patch.list_open_in_new_tab = c('exc-cfg-list-newtab');
          patch.list_show_tag_stream = c('exc-cfg-tag-stream');
          {
            const tm = Number(body.querySelector('#exc-cfg-tag-stream-max')?.value);
            if (Number.isFinite(tm) && tm >= 1) {
              patch.list_tag_stream_max = Math.min(8, Math.max(1, Math.floor(tm)));
            }
          }
          {
            const fm = body.querySelector('#exc-cfg-fold-mode')?.value || 'preference';
            patch.fold_primary_mode = ['preference', 'newest', 'list_order'].includes(fm)
              ? fm
              : 'preference';
          }
          patch.auto_cluster = c('exc-cfg-auto-cluster');
          {
            const pagePct = Number(body.querySelector('#exc-cfg-page-tol-pct')?.value);
            if (Number.isFinite(pagePct) && pagePct >= 0) {
              patch.pages_tolerance_ratio = Math.min(1, pagePct / 100);
            }
            const pageMin = Number(body.querySelector('#exc-cfg-page-tol-min')?.value);
            if (Number.isFinite(pageMin) && pageMin >= 0) patch.pages_tolerance_min = Math.floor(pageMin);
            const pageMax = Number(body.querySelector('#exc-cfg-page-tol-max')?.value);
            if (Number.isFinite(pageMax) && pageMax >= 1) {
              patch.pages_tolerance_max = Math.max(patch.pages_tolerance_min || 1, Math.floor(pageMax));
            }
            const sizePct = Number(body.querySelector('#exc-cfg-size-tol-pct')?.value);
            if (Number.isFinite(sizePct) && sizePct >= 0) {
              patch.size_tolerance_ratio = Math.min(1, sizePct / 100);
            }
            const sizeMb = Number(body.querySelector('#exc-cfg-size-tol-mb')?.value);
            if (Number.isFinite(sizeMb) && sizeMb >= 0) {
              patch.size_tolerance_min_bytes = Math.round(sizeMb * 1024 * 1024);
            }
            const bppPct = Number(body.querySelector('#exc-cfg-bpp-tol-pct')?.value);
            if (Number.isFinite(bppPct) && bppPct >= 0) {
              patch.bpp_tolerance_ratio = Math.min(1, bppPct / 100);
            }
          }
        } else if (tab === 'ui') {
          patch.cream_site_theme = c('exc-cfg-cream-site');
          {
            const sc = Number(body.querySelector('#exc-cfg-gdt-scale')?.value);
            if (Number.isFinite(sc)) patch.gallery_thumb_scale = clampGalleryThumbScale(sc);
          }
          if (body.querySelector('#exc-cfg-hover-preview')) {
            patch.list_hover_preview = c('exc-cfg-hover-preview');
            const hc = Number(body.querySelector('#exc-cfg-hover-count')?.value);
            if (Number.isFinite(hc)) patch.list_hover_preview_count = clampHoverPreviewCount(hc);
            const hd = Number(body.querySelector('#exc-cfg-hover-delay')?.value);
            if (Number.isFinite(hd)) patch.list_hover_preview_delay_ms = clampHoverPreviewDelay(hd);
          }
          {
            const loSec = Number(body.querySelector('#exc-cfg-chk-lo')?.value);
            const hiSec = Number(body.querySelector('#exc-cfg-chk-hi')?.value);
            if (Number.isFinite(loSec) && loSec >= 2) {
              patch.tracking_check_interval_min_ms = Math.min(60000, Math.round(loSec * 1000));
            }
            if (Number.isFinite(hiSec) && hiSec >= 2) {
              patch.tracking_check_interval_max_ms = Math.min(120000, Math.round(hiSec * 1000));
            }
            if (
              patch.tracking_check_interval_min_ms &&
              patch.tracking_check_interval_max_ms &&
              patch.tracking_check_interval_max_ms < patch.tracking_check_interval_min_ms
            ) {
              patch.tracking_check_interval_max_ms = patch.tracking_check_interval_min_ms;
            }
            const scanP = Number(body.querySelector('#exc-cfg-scan-pages')?.value);
            if (Number.isFinite(scanP) && scanP >= 1) {
              patch.tracking_unread_scan_max_pages = Math.min(40, Math.max(1, Math.floor(scanP)));
            }
            if (body.querySelector('#exc-cfg-deep-scan')) {
              patch.tracking_unread_deep_scan = !!body.querySelector('#exc-cfg-deep-scan').checked;
            }
          }
        }
        // data 页无表单保存
        if (tab !== 'data') {
          saveConfig(patch);
          showToast('已保存');
          injectBaseStyles();
          applyCreamSiteTheme();
          applyGalleryThumbScale();
        }
      };
    }
  }

  function createWorkbench() {
    wbSession = loadSession();
    if (!wbSession.nav) wbSession.nav = 'tracking';
    ensureFab();
    ensureWorkbenchShell();
    // 仅当会话显式 open 时恢复；默认不弹
    if (wbSession.open === true) toggleWorkbench(true);
    window.__excRefreshWorkbench = () => {
      const wb = document.getElementById('jlc-wb');
      if (wb && wb.classList.contains('is-open')) renderWorkbench();
      updateFabBadge();
    };
    window.__excRefreshPage = () => {
      refreshCurrentPageUi().catch(() => {});
    };
    // 仅在列表真·首页回写 top；next=/深页不污染「最新」
    const ctx = parseExhPageContext(location.href);
    if (ctx && ctx.trackable) {
      const pageState =
        typeof getListPageState === 'function'
          ? getListPageState(location.href, document)
          : { index: 0, known: true, isFirst: true };
      const pageIdx = pageState.known && pageState.index >= 0 ? pageState.index : -1;
      const isFirst =
        pageState.isFirst === true ||
        ctx.page_is_first === true;
      const finder =
        typeof findTrackingForContext === 'function'
          ? findTrackingForContext(ctx)
          : getTrackingBySignature(ctx.query_signature);
      finder.then((rec) => {
        if (!rec) return;
        rec.last_browsed_at = nowMs();
        rec.last_page = pageIdx;
        if (rec.open_url && typeof canonicalizeTrackingOpenUrl === 'function') {
          const canon = canonicalizeTrackingOpenUrl(rec.open_url);
          if (rec.open_url !== canon) {
            rec.open_url = canon;
            rec.page_url = canon;
          }
        }
        // ctx.top_gid 仅首页有值；再加 isFirst 双保险
        if (isFirst && ctx.top_gid) {
          if (rec.top_gid && rec.top_gid !== ctx.top_gid) {
            rec.has_update = 1;
            rec.prev_top_gid = rec.top_gid;
          }
          rec.top_gid = ctx.top_gid;
          if (ctx.top_title) rec.top_title = compactText(ctx.top_title).slice(0, 160);
          if (ctx.top_posted_at) rec.top_posted_at = Number(ctx.top_posted_at) || 0;
          if (ctx.top_cover) applyTrackingCoverFields(rec, ctx.top_cover);
        }
        saveTrackingRecord(rec).then(() => updateFabBadge());
      });
    }
    updateFabBadge();
  }
  /** 启动：壳先可点 → DB+页面增强 → WebDAV/LRR 后台 */
  async function boot() {
    if (bootReady) return;
    const site = detectSite();
    if (!site) return;

    const t0 = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const logPhase = (name) => {
      try {
        const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
        console.info('[Creamu·ExH boot]', name, Math.round(now - t0) + 'ms');
      } catch (_) { /* ignore */ }
    };

    loadConfig();
    injectBaseStyles();
    applyCreamSiteTheme();
    applyGalleryThumbScale();

    const issue = detectAccessIssue();
    if (issue && (issue.type === 'sad_panda' || issue.type === 'challenge')) {
      showDiagnosticBanner(issue);
    } else if (issue && issue.type === 'rate_limit') {
      showDiagnosticBanner(issue);
    }

    try {
      createWorkbench();
      logPhase('workbench-shell');
    } catch (e) {
      console.warn('[ExC] workbench shell', e);
    }

    try {
      await openDb();
      logPhase('openDb');
    } catch (e) {
      console.warn('[ExC] IndexedDB unavailable', e);
      showToast('本地数据库不可用，收藏等功能可能失效');
    }

    const kind = detectPageKind();
    try {
      if (kind === 'gallery') {
        await enhanceGalleryPage();
      } else if (kind === 'image') {
        await enhanceImagePage();
      } else {
        await enhanceListPage();
        observeListMutations();
      }
      logPhase('page-enhance');
    } catch (e) {
      console.error('[ExC] page enhance failed', e);
    }

    bootReady = true;
    console.info('[Creamu·ExH] ready', VERSION, site, kind);
    logPhase('ready');

    // WebDAV / LRR 后台跑，不 await 挡点击
    void Promise.resolve()
      .then(async () => {
        const sync = typeof ensureCreamuSync === 'function' ? ensureCreamuSync() : null;
        if (!sync) return;
        const st = sync.settings ? sync.settings() : {};
        if (!st.enabled) {
          console.info('[ExC] WebDAV auto-sync skipped (disabled)');
          return;
        }
        if (st.auto === false) {
          console.info('[ExC] WebDAV auto-sync skipped (auto off)');
          return;
        }
        if (typeof sync.isConfigured === 'function' && !sync.isConfigured()) {
          console.info('[ExC] WebDAV auto-sync skipped (not configured)');
          return;
        }
        try {
          const r = await sync.bootSync();
          if (r && r.action === 'pull') {
            if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
            if (window.__excRefreshPage) window.__excRefreshPage();
          } else if (r && r.action === 'error') {
            const err = r.error;
            showToast('WebDAV 同步失败: ' + (err && err.message ? err.message : err || ''));
          }
          console.info('[ExC] WebDAV boot', r && r.action);
        } catch (e) {
          console.warn('[Creamu WD]', e);
          showToast('WebDAV 同步失败: ' + ((e && e.message) || e));
        }
        logPhase('webdav');
      })
      .catch((e) => console.warn('[Creamu WD]', e));

    // LRR：已配置则按间隔自动同步；本地档案库为空则强制拉一次
    if (lrrConfigured()) {
      void Promise.resolve()
        .then(async () => {
          const st = getLrrStatus();
          const intervalMin = Math.max(5, Number(config.lrr_sync_interval_min) || 60);
          const interval = intervalMin * 60 * 1000;
          let forceEmpty = false;
          try {
            const arcs = typeof listArchives === 'function' ? await listArchives() : null;
            forceEmpty = Array.isArray(arcs) && arcs.length === 0;
          } catch (_) {
            forceEmpty = !st.last_sync;
          }
          const due = forceEmpty || !st.last_sync || nowMs() - st.last_sync > interval;
          if (!due) {
            console.info(
              '[ExC] LRR auto-sync skipped (last',
              st.last_sync ? Math.round((nowMs() - st.last_sync) / 60000) + 'm ago' : 'n/a',
              ', interval',
              intervalMin + 'm)'
            );
            return;
          }
          const r = await syncLanraragi({ replace: true });
          if (r.ok) {
            console.info(
              '[ExC] LRR synced',
              r.count,
              'linked',
              r.linked,
              'familiar',
              r.familiar_artists,
              r.familiar_groups,
              forceEmpty ? '(force empty)' : ''
            );
            showToast(
              'LRR 已同步 ' +
                r.count +
                ' 条' +
                (r.familiar_artists != null
                  ? ' · 熟人 画师' + r.familiar_artists + '/团队' + r.familiar_groups
                  : '')
            );
            if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
            if (window.__excRefreshPage) window.__excRefreshPage();
          } else {
            console.warn('[ExC] LRR sync', r.error);
            showToast('LRR 同步失败: ' + (r.error || ''));
          }
          logPhase('lrr');
        })
        .catch((e) => {
          console.warn('[ExC] LRR sync', e);
          showToast('LRR 同步失败: ' + ((e && e.message) || e));
        });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      boot().catch((e) => console.error('[ExC] boot', e));
    });
  } else {
    boot().catch((e) => console.error('[ExC] boot', e));
  }
})();
