
(function () {
    'use strict';

    let statusDefault = {
        autoPage: false,
        copyBtn :true,
        toolBar: true,
        avInfo:true,
        halfImg:false,
        fullTitle:false,
        waterfallWidth:100,
        columnNumFull:3,
        columnNumHalf:4,
        /** 工作台按钮缩放百分比（70–110），只影响按钮，不影响列表内容 */
        uiBtnScale: 100,
        menutoTop : false,
		hiddenWord :[],
		hiddenAvid :[]
    };
    const VERSION = "20250311";
    const NOTICE = "2025-03-11 修复视频截图的报错";
    const SCREENSHOT_SUFFIX = "-screenshot-tag";
    const AVINFO_SUFFIX = "-avInfo-tag";
    const blogjavSelector= ".entry-title>a";
    const fullImgCSS=`width: 100%!important;height:100%!important;`;
    const halfImgCSS=`position: relative;left: -112%;width: 212% !important;height: 100% !important;max-width: 212%;`;

    const copy_Svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor"  width="16" height="16" viewBox="0 0 16 16"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/></svg>`;
    const download_Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" class="tool-svg" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v5.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V4.5z"/></svg>`;
    const picture_Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"  class="tool-svg" viewBox="0 0 16 16"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/></svg>`;
    const magnet_Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"  class="tool-svg" x="0px" y="0px" viewBox="0 0 1000 1000" ><g><g transform="translate(0.000000,460.000000) scale(0.100000,-0.100000)"><path d="M4171.6,3994c-183.9-13.4-515.3-67.1-706.9-113c-770.2-187.7-1448.4-563.3-2021.2-1118.8c-707-685.9-1130.3-1494.4-1299-2481c-59.4-358.3-59.4-1002,0-1360.2c157.1-923.4,546-1705.1,1172.5-2354.6c695.4-722.3,1534.6-1159.1,2548.1-1325.7c174.4-28.7,388.9-34.5,1643.8-40.2l1440.7-7.7v1302.8v1302.8l-1354.5,7.6c-1207,5.7-1369.8,9.6-1480.9,40.2c-448.3,116.9-785.5,335.3-1036.5,666.7c-252.9,339.1-364,666.7-364,1088.2s111.1,749.1,364,1088.2c241.4,318,595.8,551.8,1000.1,659.1c157.1,40.2,191.6,42.1,1517.3,47.9l1354.5,7.7v1302.8v1300.9l-1344.9-3.8C4863.3,4001.6,4219.5,3997.8,4171.6,3994z"/><path d="M7620.1,2704.6V1401.8h1139.9H9900v1302.8v1302.8H8760.1H7620.1V2704.6z"/><path d="M7620.1-3502.7v-1302.8h1139.9H9900v1302.8v1302.8H8760.1H7620.1V-3502.7z"/></g></g></svg>`;

    const LOCALE = {
        zh: {
            menuText :'设置',
            menu_autoPage: '自动下一页',
            menu_copyBtn :'复制图标',
            menu_toolBar: '功能图标',
            menu_avInfo:'弹窗中的演员和样品图',
            menu_halfImg:'竖图模式',
            menu_fullTitle:'标题全显',
            menu_columnNum:'列',
            menu_uiBtnScale:'按钮缩放 %',
            menu_menutoTop:'左侧菜单移至上方',
            copyButton:'复制',
            copySuccess:'复制成功',
            getAvImg_norespond:'blogjav.net网站暂时无法响应',
            getAvImg_none:'未搜索到',
            tool_magnetTip:'磁力',
            tool_downloadTip:'下载封面',
            tool_pictureTip:'视频截图(blogjav.net)需代理',
            scrollerPlugin_end:'完',
            scrollerPlugin_error:'加载失败',
            scrollerPlugin_retry:'重试'
        },
        en: {
            menuText :'Settings',
            menu_autoPage:'auto Next Page',
            menu_copyBtn:'copy icon',
            menu_toolBar:'tools icon',
            menu_avInfo:'actors and sample images in pop-ups',
            menu_halfImg:'Vertical image mode',
            menu_fullTitle:'Full Title',
            menu_columnNum:'columns',
            menu_uiBtnScale:'Button scale %',
            menu_menutoTop:'Move the left menu to the top',
            copyButton:'Copy',
            copySuccess:'Copy successful',
            getAvImg_norespond:'blogjav.net is temporarily unable to respond',
            getAvImg_none:'Not found',
            tool_magnetTip:'Magnet',
            tool_downloadTip:'Download cover',
            tool_pictureTip:'Video screenshot from blogjav.net',
            scrollerPlugin_end:'End',
            scrollerPlugin_error:'Load failed',
            scrollerPlugin_retry:'Retry'
        }
    }
    let getlanguage = () => {
        let local= navigator.language;
        local = local.toLowerCase().replace('_', '-');
        if (local in LOCALE){
            return LOCALE[local];
        }else if (local.split('-')[0] in LOCALE){
            return LOCALE[local.split('-')[0]];
        }else {
            return LOCALE.en;
        }
    }
    let lang = getlanguage();


    // ==========================================
    // Commander 扩展：多站数据库 / MetaTube / Emby / 熟人雷达
    // ==========================================
    const DB_NAME = 'JavLibCommander_Permanent';
    const DB_VERSION = 2;
    const TRACKING_STORE = 'tracking_searches';
    const TRACKING_UI_STATE_KEY = 'jlc_tracking_ui_state_v1';
    const WORKBENCH_SESSION_KEY = 'jlc_workbench_session_v1';
    const WORKBENCH_PAGE_UI_KEY = 'jlc_workbench_page_ui_v1';
    let db = null;
    let knownPersons = new Set();
    let embyDataSnapshot = null;
    let libraryDataRevision = 0;
    let trackingDataRevision = 0;
    let commanderObserver = null;
    let trackingPageRefreshTimer = null;
    let trackingPageSearchPromise = null;
    let trackingPageTouchSignature = '';
    let trackingPageState = {
        signature: '',
        record: null,
        context: null,
        lastSeenFound: false,
        /** 本页未命中时：later | earlier | '' */
        breakpointMissHint: '',
        /** 断点连翻进行中（含命中后的定位过渡） */
        breakpointSearching: false,
        breakpointSearchLabel: '',
        breakpointCursor: { prev: '', next: '' }
    };
    let trackingRefreshRuntimeState = null;
    let commanderPanelState = {
        lastTab: 'tracking',
        scrollTops: {}
    };
    let workbenchSessionCache = null;
    let workbenchScrollSaveTimer = null;
    let workbenchListScrolling = false;
    let workbenchScrollIdleTimer = null;
    let workbenchListRenderTimer = null;
    let workbenchListRenderPending = null;
    let workbenchUiBound = false;

    const DEFAULT_CONFIG = {
        emby_url: '',
        emby_key: '',
        metatube_url: '',
        fav_tags: [],
        hate_tags: [],
        custom_persons: [],
        resource_center: true,
        resource_trailer: true,
        resource_screenshot: true,
        resource_screenshot_auto: false,
        resource_magnet: true,
        resource_subtitle: true,
        resource_links: true,
        open_mode: 'tab',
        webdav_enabled: false,
        webdav_url: 'https://dav.jianguoyun.com/dav/',
        webdav_user: '',
        webdav_password: '',
        webdav_path: '/Creamu',
        webdav_auto: true,
        webdav_conflict: 'ask'
    };

    function getDefaultWorkbenchSession() {
        return {
            version: 3,
            skin: 'v3',
            panelOpen: false,
            nav: 'tracking',
            settingsOpen: false,
            settingsSection: '',
            shellWidth: 540,
            shellHeight: 0,
            shellLeft: null,
            shellTop: null,
            scrollTops: { tracking: 0, library: 0, filter: 0, view: 0, settings: 0 },
            tracking: {
                query: '',
                filterUpdatesOnly: false,
                pinCurrent: true,
                groupFilter: 'all',
                sort: 'updates_first',
                focusRecordId: '',
                lastOpenedId: '',
                lastOpenedAt: ''
            },
            openMode: config?.open_mode === 'same' ? 'same' : 'tab',
            updatedAt: ''
        };
    }

    function normalizeWorkbenchSession(raw) {
        const base = getDefaultWorkbenchSession();
        if (!raw || typeof raw !== 'object') return base;
        const next = Object.assign({}, base, raw);
        next.scrollTops = Object.assign({}, base.scrollTops, raw.scrollTops || {});
        next.tracking = Object.assign({}, base.tracking, raw.tracking || {});
        next.tracking.pinCurrent = next.tracking.pinCurrent !== false;
        next.tracking.filterUpdatesOnly = !!next.tracking.filterUpdatesOnly;
        // 主导航：追更 / 库 / 过滤（旧 view 显示页迁到设置 → 显示，session 回退追更）
        if (next.nav === 'library' || next.nav === 'filter' || next.nav === 'tracking') {
            /* keep */
        } else {
            next.nav = 'tracking';
        }
        next.openMode = next.openMode === 'same' ? 'same' : 'tab';
        // 默认收起；仅显式 true 才在启动时打开
        next.panelOpen = next.panelOpen === true;
        // v2 及更早默认 panelOpen=true，升级时改为收起（避免一进站就弹窗）
        const prevVer = Number(raw && raw.version);
        if (!Number.isFinite(prevVer) || prevVer < 3) {
            next.panelOpen = false;
            next.version = 3;
        } else {
            next.version = Math.max(3, prevVer);
        }
        next.settingsOpen = !!next.settingsOpen;
        const width = Number(next.shellWidth);
        next.shellWidth = Number.isFinite(width) ? Math.min(900, Math.max(360, width)) : 540;
        const height = Number(next.shellHeight);
        // 0/NaN = 尚未记忆，打开时用默认高度
        next.shellHeight = Number.isFinite(height) && height > 0
            ? Math.min(1200, Math.max(280, height))
            : 0;
        const left = Number(next.shellLeft);
        next.shellLeft = Number.isFinite(left) ? left : null;
        const top = Number(next.shellTop);
        next.shellTop = Number.isFinite(top) ? top : null;
        return next;
    }

    function getWorkbenchPageInstanceId() {
        try {
            const name = String(window.name || '');
            if (name.startsWith('jlc-wb:')) return name.slice(7);
        } catch (_) { /* ignore */ }
        return '';
    }

    function ensureWorkbenchPageInstanceId() {
        let id = getWorkbenchPageInstanceId();
        if (id) return id;
        id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        try {
            const current = String(window.name || '');
            if (!current || current.startsWith('jlc-wb:')) window.name = 'jlc-wb:' + id;
        } catch (_) { /* ignore */ }
        return getWorkbenchPageInstanceId() || id;
    }

    function readWorkbenchPageUi() {
        try {
            const raw = sessionStorage.getItem(WORKBENCH_PAGE_UI_KEY);
            if (!raw) return { panelOpen: false, settingsOpen: false };
            const parsed = JSON.parse(raw);
            const pageId = getWorkbenchPageInstanceId();
            const windowName = String(window.name || '');
            if (pageId) {
                if (parsed?.pageId !== pageId) return { panelOpen: false, settingsOpen: false };
            } else if (!windowName) {
                return { panelOpen: false, settingsOpen: false };
            }
            return {
                panelOpen: parsed?.panelOpen === true,
                settingsOpen: parsed?.settingsOpen === true
            };
        } catch (_) {
            return { panelOpen: false, settingsOpen: false };
        }
    }

    function writeWorkbenchPageUi(panelOpen, settingsOpen) {
        try {
            sessionStorage.setItem(WORKBENCH_PAGE_UI_KEY, JSON.stringify({
                pageId: ensureWorkbenchPageInstanceId(),
                panelOpen: !!panelOpen,
                settingsOpen: !!settingsOpen
            }));
        } catch (_) { /* private mode / blocked storage */ }
    }

    function applyWorkbenchPageUi(session) {
        const pageUi = readWorkbenchPageUi();
        session.panelOpen = pageUi.panelOpen;
        session.settingsOpen = pageUi.settingsOpen;
        return session;
    }

    function getWorkbenchSession() {
        if (workbenchSessionCache) return workbenchSessionCache;
        workbenchSessionCache = applyWorkbenchPageUi(normalizeWorkbenchSession(GM_getValue(WORKBENCH_SESSION_KEY)));
        if (config?.open_mode === 'same' || config?.open_mode === 'tab') {
            workbenchSessionCache.openMode = config.open_mode;
        }
        return workbenchSessionCache;
    }

    function persistWorkbenchSession(patch = null) {
        const current = getWorkbenchSession();
        if (patch && typeof patch === 'object') {
            if (patch.scrollTops) current.scrollTops = Object.assign({}, current.scrollTops, patch.scrollTops);
            if (patch.tracking) current.tracking = Object.assign({}, current.tracking, patch.tracking);
            Object.keys(patch).forEach(key => {
                if (key === 'scrollTops' || key === 'tracking') return;
                current[key] = patch[key];
            });
        }
        current.updatedAt = new Date().toISOString();
        current.skin = 'v3';
        workbenchSessionCache = normalizeWorkbenchSession(current);
        writeWorkbenchPageUi(workbenchSessionCache.panelOpen, workbenchSessionCache.settingsOpen);
        // 开合只属于当前标签：共享存储始终写成收起，避免追更开出的新页把控制台带过去
        GM_setValue(WORKBENCH_SESSION_KEY, Object.assign({}, workbenchSessionCache, {
            panelOpen: false,
            settingsOpen: false
        }));
        return workbenchSessionCache;
    }

    function loadConfig() {
        let saved = GM_getValue('jlc_config_stable') || GM_getValue('jlc_config_v3') || GM_getValue('jlc_config_v2');
        if (saved && typeof saved === 'object') {
            // 数组字段若被存成空数组，仍应用用户值；仅在缺省字段时回落到 DEFAULT
            const merged = Object.assign({}, DEFAULT_CONFIG, saved);
            if (Array.isArray(saved.fav_tags)) merged.fav_tags = saved.fav_tags.slice();
            if (Array.isArray(saved.custom_persons)) merged.custom_persons = saved.custom_persons.slice();
            return merged;
        }
        return Object.assign({}, DEFAULT_CONFIG);
    }

    function isLikelyFreshDefaultConfig(cfg = config) {
        const tags = (cfg.fav_tags || []).join(',');
        const defaults = DEFAULT_CONFIG.fav_tags.join(',');
        return !compactText(cfg.emby_url || '')
            && !compactText(cfg.emby_key || '')
            && !compactText(cfg.metatube_url || '')
            && tags === defaults;
    }

    let config = loadConfig();
    let configMigrationHintShown = false;
