
(function () {
    'use strict';
    // @require      https://cdn.jsdelivr.net/npm/vanilla-lazyload@17.8.2/dist/lazyload.min.js
    !function(n,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(n="undefined"!=typeof globalThis?globalThis:n||self).LazyLoad=t()}(this,(function(){"use strict";function n(){return n=Object.assign||function(n){for(var t=1;t<arguments.length;t++){var e=arguments[t];for(var i in e)Object.prototype.hasOwnProperty.call(e,i)&&(n[i]=e[i])}return n},n.apply(this,arguments)}var t="undefined"!=typeof window,e=t&&!("onscroll"in window)||"undefined"!=typeof navigator&&/(gle|ing|ro)bot|crawl|spider/i.test(navigator.userAgent),i=t&&"IntersectionObserver"in window,o=t&&"classList"in document.createElement("p"),a=t&&window.devicePixelRatio>1,r={elements_selector:".lazy",container:e||t?document:null,threshold:300,thresholds:null,data_src:"src",data_srcset:"srcset",data_sizes:"sizes",data_bg:"bg",data_bg_hidpi:"bg-hidpi",data_bg_multi:"bg-multi",data_bg_multi_hidpi:"bg-multi-hidpi",data_bg_set:"bg-set",data_poster:"poster",class_applied:"applied",class_loading:"loading",class_loaded:"loaded",class_error:"error",class_entered:"entered",class_exited:"exited",unobserve_completed:!0,unobserve_entered:!1,cancel_on_exit:!0,callback_enter:null,callback_exit:null,callback_applied:null,callback_loading:null,callback_loaded:null,callback_error:null,callback_finish:null,callback_cancel:null,use_native:!1,restore_on_error:!1},c=function(t){return n({},r,t)},l=function(n,t){var e,i="LazyLoad::Initialized",o=new n(t);try{e=new CustomEvent(i,{detail:{instance:o}})}catch(n){(e=document.createEvent("CustomEvent")).initCustomEvent(i,!1,!1,{instance:o})}window.dispatchEvent(e)},u="src",s="srcset",d="sizes",f="poster",_="llOriginalAttrs",g="data",v="loading",b="loaded",m="applied",p="error",h="native",E="data-",I="ll-status",y=function(n,t){return n.getAttribute(E+t)},k=function(n){return y(n,I)},w=function(n,t){return function(n,t,e){var i="data-ll-status";null!==e?n.setAttribute(i,e):n.removeAttribute(i)}(n,0,t)},A=function(n){return w(n,null)},L=function(n){return null===k(n)},O=function(n){return k(n)===h},x=[v,b,m,p],C=function(n,t,e,i){n&&(void 0===i?void 0===e?n(t):n(t,e):n(t,e,i))},N=function(n,t){o?n.classList.add(t):n.className+=(n.className?" ":"")+t},M=function(n,t){o?n.classList.remove(t):n.className=n.className.replace(new RegExp("(^|\\s+)"+t+"(\\s+|$)")," ").replace(/^\s+/,"").replace(/\s+$/,"")},z=function(n){return n.llTempImage},T=function(n,t){if(t){var e=t._observer;e&&e.unobserve(n)}},R=function(n,t){n&&(n.loadingCount+=t)},G=function(n,t){n&&(n.toLoadCount=t)},j=function(n){for(var t,e=[],i=0;t=n.children[i];i+=1)"SOURCE"===t.tagName&&e.push(t);return e},D=function(n,t){var e=n.parentNode;e&&"PICTURE"===e.tagName&&j(e).forEach(t)},H=function(n,t){j(n).forEach(t)},V=[u],F=[u,f],B=[u,s,d],J=[g],P=function(n){return!!n[_]},S=function(n){return n[_]},U=function(n){return delete n[_]},$=function(n,t){if(!P(n)){var e={};t.forEach((function(t){e[t]=n.getAttribute(t)})),n[_]=e}},q=function(n,t){if(P(n)){var e=S(n);t.forEach((function(t){!function(n,t,e){e?n.setAttribute(t,e):n.removeAttribute(t)}(n,t,e[t])}))}},K=function(n,t,e){N(n,t.class_applied),w(n,m),e&&(t.unobserve_completed&&T(n,t),C(t.callback_applied,n,e))},Q=function(n,t,e){N(n,t.class_loading),w(n,v),e&&(R(e,1),C(t.callback_loading,n,e))},W=function(n,t,e){e&&n.setAttribute(t,e)},X=function(n,t){W(n,d,y(n,t.data_sizes)),W(n,s,y(n,t.data_srcset)),W(n,u,y(n,t.data_src))},Y={IMG:function(n,t){D(n,(function(n){$(n,B),X(n,t)})),$(n,B),X(n,t)},IFRAME:function(n,t){$(n,V),W(n,u,y(n,t.data_src))},VIDEO:function(n,t){H(n,(function(n){$(n,V),W(n,u,y(n,t.data_src))})),$(n,F),W(n,f,y(n,t.data_poster)),W(n,u,y(n,t.data_src)),n.load()},OBJECT:function(n,t){$(n,J),W(n,g,y(n,t.data_src))}},Z=["IMG","IFRAME","VIDEO","OBJECT"],nn=function(n,t){!t||function(n){return n.loadingCount>0}(t)||function(n){return n.toLoadCount>0}(t)||C(n.callback_finish,t)},tn=function(n,t,e){n.addEventListener(t,e),n.llEvLisnrs[t]=e},en=function(n,t,e){n.removeEventListener(t,e)},on=function(n){return!!n.llEvLisnrs},an=function(n){if(on(n)){var t=n.llEvLisnrs;for(var e in t){var i=t[e];en(n,e,i)}delete n.llEvLisnrs}},rn=function(n,t,e){!function(n){delete n.llTempImage}(n),R(e,-1),function(n){n&&(n.toLoadCount-=1)}(e),M(n,t.class_loading),t.unobserve_completed&&T(n,e)},cn=function(n,t,e){var i=z(n)||n;on(i)||function(n,t,e){on(n)||(n.llEvLisnrs={});var i="VIDEO"===n.tagName?"loadeddata":"load";tn(n,i,t),tn(n,"error",e)}(i,(function(o){!function(n,t,e,i){var o=O(t);rn(t,e,i),N(t,e.class_loaded),w(t,b),C(e.callback_loaded,t,i),o||nn(e,i)}(0,n,t,e),an(i)}),(function(o){!function(n,t,e,i){var o=O(t);rn(t,e,i),N(t,e.class_error),w(t,p),C(e.callback_error,t,i),e.restore_on_error&&q(t,B),o||nn(e,i)}(0,n,t,e),an(i)}))},ln=function(n,t,e){!function(n){return Z.indexOf(n.tagName)>-1}(n)?function(n,t,e){!function(n){n.llTempImage=document.createElement("IMG")}(n),cn(n,t,e),function(n){P(n)||(n[_]={backgroundImage:n.style.backgroundImage})}(n),function(n,t,e){var i=y(n,t.data_bg),o=y(n,t.data_bg_hidpi),r=a&&o?o:i;r&&(n.style.backgroundImage='url("'.concat(r,'")'),z(n).setAttribute(u,r),Q(n,t,e))}(n,t,e),function(n,t,e){var i=y(n,t.data_bg_multi),o=y(n,t.data_bg_multi_hidpi),r=a&&o?o:i;r&&(n.style.backgroundImage=r,K(n,t,e))}(n,t,e),function(n,t,e){var i=y(n,t.data_bg_set);if(i){var o=i.split("|"),a=o.map((function(n){return"image-set(".concat(n,")")}));n.style.backgroundImage=a.join(),""===n.style.backgroundImage&&(a=o.map((function(n){return"-webkit-image-set(".concat(n,")")})),n.style.backgroundImage=a.join()),K(n,t,e)}}(n,t,e)}(n,t,e):function(n,t,e){cn(n,t,e),function(n,t,e){var i=Y[n.tagName];i&&(i(n,t),Q(n,t,e))}(n,t,e)}(n,t,e)},un=function(n){n.removeAttribute(u),n.removeAttribute(s),n.removeAttribute(d)},sn=function(n){D(n,(function(n){q(n,B)})),q(n,B)},dn={IMG:sn,IFRAME:function(n){q(n,V)},VIDEO:function(n){H(n,(function(n){q(n,V)})),q(n,F),n.load()},OBJECT:function(n){q(n,J)}},fn=function(n,t){(function(n){var t=dn[n.tagName];t?t(n):function(n){if(P(n)){var t=S(n);n.style.backgroundImage=t.backgroundImage}}(n)})(n),function(n,t){L(n)||O(n)||(M(n,t.class_entered),M(n,t.class_exited),M(n,t.class_applied),M(n,t.class_loading),M(n,t.class_loaded),M(n,t.class_error))}(n,t),A(n),U(n)},_n=["IMG","IFRAME","VIDEO"],gn=function(n){return n.use_native&&"loading"in HTMLImageElement.prototype},vn=function(n,t,e){n.forEach((function(n){return function(n){return n.isIntersecting||n.intersectionRatio>0}(n)?function(n,t,e,i){var o=function(n){return x.indexOf(k(n))>=0}(n);w(n,"entered"),N(n,e.class_entered),M(n,e.class_exited),function(n,t,e){t.unobserve_entered&&T(n,e)}(n,e,i),C(e.callback_enter,n,t,i),o||ln(n,e,i)}(n.target,n,t,e):function(n,t,e,i){L(n)||(N(n,e.class_exited),function(n,t,e,i){e.cancel_on_exit&&function(n){return k(n)===v}(n)&&"IMG"===n.tagName&&(an(n),function(n){D(n,(function(n){un(n)})),un(n)}(n),sn(n),M(n,e.class_loading),R(i,-1),A(n),C(e.callback_cancel,n,t,i))}(n,t,e,i),C(e.callback_exit,n,t,i))}(n.target,n,t,e)}))},bn=function(n){return Array.prototype.slice.call(n)},mn=function(n){return n.container.querySelectorAll(n.elements_selector)},pn=function(n){return function(n){return k(n)===p}(n)},hn=function(n,t){return function(n){return bn(n).filter(L)}(n||mn(t))},En=function(n,e){var o=c(n);this._settings=o,this.loadingCount=0,function(n,t){i&&!gn(n)&&(t._observer=new IntersectionObserver((function(e){vn(e,n,t)}),function(n){return{root:n.container===document?null:n.container,rootMargin:n.thresholds||n.threshold+"px"}}(n)))}(o,this),function(n,e){t&&(e._onlineHandler=function(){!function(n,t){var e;(e=mn(n),bn(e).filter(pn)).forEach((function(t){M(t,n.class_error),A(t)})),t.update()}(n,e)},window.addEventListener("online",e._onlineHandler))}(o,this),this.update(e)};return En.prototype={update:function(n){var t,o,a=this._settings,r=hn(n,a);G(this,r.length),!e&&i?gn(a)?function(n,t,e){n.forEach((function(n){-1!==_n.indexOf(n.tagName)&&function(n,t,e){n.setAttribute("loading","lazy"),cn(n,t,e),function(n,t){var e=Y[n.tagName];e&&e(n,t)}(n,t),w(n,h)}(n,t,e)})),G(e,0)}(r,a,this):(o=r,function(n){n.disconnect()}(t=this._observer),function(n,t){t.forEach((function(t){n.observe(t)}))}(t,o)):this.loadAll(r)},destroy:function(){this._observer&&this._observer.disconnect(),t&&window.removeEventListener("online",this._onlineHandler),mn(this._settings).forEach((function(n){U(n)})),delete this._observer,delete this._settings,delete this._onlineHandler,delete this.loadingCount,delete this.toLoadCount},loadAll:function(n){var t=this,e=this._settings;hn(n,e).forEach((function(n){T(n,t),ln(n,e,t)}))},restoreAll:function(){var n=this._settings;mn(n).forEach((function(t){fn(t,n)}))}},En.load=function(n,t){var e=c(t);ln(n,e)},En.resetStatus=function(n){A(n)},t&&function(n,t){if(t)if(t.length)for(var e,i=0;e=t[i];i+=1)l(n,e);else l(n,t)}(En,window.lazyLoadOptions),En}));

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
            scrollerPlugin_end:'完'
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
            scrollerPlugin_end:'End'
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
    let db = null;
    let knownPersons = new Set();
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

    function getWorkbenchSession() {
        if (workbenchSessionCache) return workbenchSessionCache;
        workbenchSessionCache = normalizeWorkbenchSession(GM_getValue(WORKBENCH_SESSION_KEY));
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
        GM_setValue(WORKBENCH_SESSION_KEY, workbenchSessionCache);
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

    function initCommanderStyles() {
        GM_addStyle(`
        .jlc-resource-center {
            margin: 18px 0; padding: 16px; border-radius: 14px;
            background: linear-gradient(180deg, rgba(18,18,18,.96), rgba(30,30,30,.94));
            color: #f1f1f1; border: 1px solid rgba(255,255,255,.08);
            box-shadow: 0 8px 24px rgba(0,0,0,.2);
        }
        .jlc-resource-header {
            display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
            margin-bottom: 14px; flex-wrap: wrap;
        }
        .scrollBarHide { overflow: hidden; }
        .jlc-resource-title { font-size: 18px; font-weight: 700; color: #fff; }
        .jlc-resource-subtitle { font-size: 12px; color: #aaa; margin-top: 4px; }
        .jlc-resource-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .jlc-resource-header-actions button,
        .jlc-resource-inline-actions button,
        .jlc-magnet-actions button,
        .jlc-magnet-actions a {
            appearance: none; border: 1px solid rgba(255,255,255,.12); background: #2f2f2f;
            color: #f5f5f5; border-radius: 8px; padding: 8px 12px; cursor: pointer;
            text-decoration: none; font-size: 12px; line-height: 1.2;
        }
        .jlc-resource-header-actions button:hover,
        .jlc-resource-inline-actions button:hover,
        .jlc-magnet-actions button:hover,
        .jlc-magnet-actions a:hover {
            background: #3a3a3a; border-color: rgba(255,255,255,.22);
        }
        .jlc-resource-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 12px;
        }
        .jlc-resource-card {
            background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06);
            border-radius: 12px; padding: 14px; min-height: 120px;
        }
        .jlc-resource-card h3 { margin: 0 0 10px; font-size: 14px; color: #fff; }
        .jlc-resource-card-titlebar {
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
            margin-bottom: 10px;
        }
        .jlc-resource-card-titlebar h3 { margin: 0; }
        .jlc-resource-card-tools {
            display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }
        .jlc-title-inline-button {
            appearance: none; border: 1px solid rgba(255,255,255,.12); background: #2f2f2f;
            color: #f5f5f5; border-radius: 999px; padding: 5px 11px; cursor: pointer;
            font-size: 12px; line-height: 1.2;
        }
        .jlc-title-inline-button:hover { background: #3a3a3a; border-color: rgba(255,255,255,.22); }
        .jlc-title-inline-button[disabled] { opacity: .65; cursor: wait; }
        .jlc-resource-body { display: flex; flex-direction: column; gap: 10px; }
        .jlc-resource-chip-list,
        .jlc-resource-status-list,
        .jlc-resource-inline-actions {
            display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
        }
        .jlc-resource-chip {
            display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px;
            border-radius: 999px; background: rgba(255,255,255,.08); color: #f3f3f3 !important;
            text-decoration: none; font-size: 12px; border: 1px solid rgba(255,255,255,.1);
        }
        .jlc-resource-chip:hover { background: rgba(255,255,255,.14); }
        .jlc-resource-status {
            display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px;
            border-radius: 999px; font-size: 12px; line-height: 1.2; text-decoration: none;
            background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1); color: #d8d8d8;
        }
        .jlc-resource-status:hover { background: rgba(255,255,255,.12); }
        button.jlc-resource-status {
            appearance: none; cursor: pointer; font: inherit;
        }
        .jlc-resource-status strong { color: inherit; font-size: 12px; }
        .jlc-resource-status small { color: rgba(255,255,255,.72); }
        .jlc-resource-status.is-active-filter {
            box-shadow: inset 0 0 0 1px rgba(255,255,255,.18), 0 0 0 2px rgba(255,146,84,.16);
            transform: translateY(-1px);
        }
        .jlc-resource-status.is-pending { color: #bcbcbc; border-color: rgba(255,255,255,.12); }

        .jlc-resource-status.is-ok { color: #7dffaf; border-color: rgba(125,255,175,.32); background: rgba(60,180,110,.14); }
        .jlc-resource-status.is-partial { color: #ffd36f; border-color: rgba(255,211,111,.34); background: rgba(196,134,42,.14); }
        .jlc-resource-status.is-blocked,
        .jlc-resource-status.is-error { color: #ff8c8c; border-color: rgba(255,140,140,.34); background: rgba(168,56,56,.14); }
        .jlc-resource-status.is-empty { color: #b8b8b8; border-color: rgba(255,255,255,.08); background: rgba(255,255,255,.04); }
        .jlc-resource-note,
        .jlc-resource-empty,
        .jlc-resource-loading {
            font-size: 12px; line-height: 1.6; color: #bdbdbd;
        }
        .jlc-resource-inline-actions a,
        .jlc-resource-inline-actions button {
            display: inline-flex; align-items: center; justify-content: center;
        }
        .jlc-resource-video {
            width: 100%; max-width: 100%; border-radius: 10px; background: #000;
        }
        .jlc-trailer-inline-player,
        .jlc-trailer-dialog-player {
            width: 100%; max-width: 100%;
        }
        .jlc-trailer-player-shell {
            width: 100%; max-width: 100%; border-radius: 10px; overflow: hidden;
            background: #000; border: 1px solid rgba(255,255,255,.08);
        }
        .jlc-trailer-player-shell.is-inline video,
        .jlc-trailer-player-shell.is-inline iframe {
            display: block; width: 100%; max-width: 100%; aspect-ratio: 16 / 9;
            max-height: 220px; border: 0; background: #000;
        }
        .jlc-trailer-player-shell.is-overlay video,
        .jlc-trailer-player-shell.is-overlay iframe {
            display: block; width: 100%; max-width: 100%; aspect-ratio: 16 / 9;
            max-height: min(76vh, 720px); border: 0; background: #000;
        }
        .jlc-trailer-main-actions { gap: 10px; }
        .jlc-trailer-source-list { gap: 6px; }
        .jlc-trailer-source-button.is-active {
            background: #ff4400; border-color: rgba(255,130,80,.55); color: #fff;
        }
        .jlc-trailer-overlay {
            position: fixed; inset: 0; z-index: 100000; display: none; align-items: center; justify-content: center;
            padding: 24px; background: rgba(0,0,0,.78);
        }
        .jlc-trailer-overlay.is-open { display: flex; }
        .jlc-trailer-dialog {
            width: min(1040px, 94vw); background: #111; border-radius: 16px; padding: 18px;
            border: 1px solid rgba(255,255,255,.08); box-shadow: 0 20px 60px rgba(0,0,0,.5); position: relative;
        }
        .jlc-trailer-dialog-head {
            display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 12px;
            color: #fff; flex-wrap: wrap;
        }
        .jlc-trailer-dialog-head small { color: #b8b8b8; font-size: 12px; }
        .jlc-trailer-close {
            position: absolute; top: 10px; right: 10px; width: 36px; height: 36px; border-radius: 999px;
            background: rgba(255,255,255,.08); color: #fff; font-size: 22px; line-height: 1; border: 1px solid rgba(255,255,255,.1);
        }
        .jlc-trailer-close:hover { background: rgba(255,255,255,.16); }
        .jlc-trailer-dialog-actions {
            display: flex; justify-content: flex-end; margin-top: 12px;
        }
        .jlc-trailer-dialog-actions a {
            color: #f5f5f5; text-decoration: none; font-size: 12px; padding: 8px 12px;
            border-radius: 8px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1);
        }
        .jlc-trailer-dialog-actions a:hover { background: rgba(255,255,255,.14); }
        .jlc-resource-panel-slot {
            min-height: 48px; border-radius: 10px; background: rgba(0,0,0,.16); padding: 10px;
        }
        .jlc-inline-screenshot-panel {
            position: relative; min-height: 0 !important; background: #111; border-radius: 10px;
            padding: 12px; overflow: hidden;
        }
        .jlc-inline-screenshot-panel ul {
            list-style: none; margin: 0 0 12px; padding: 0; display: flex; flex-wrap: wrap; gap: 8px;
        }
        .jlc-inline-screenshot-panel .imgResult-li {
            font-size: 13px; line-height: 1.4; padding: 6px 10px; border-radius: 999px;
            background: rgba(255,255,255,.08);
        }
        .jlc-inline-screenshot-panel img[name="screenshot"] {
            display: block; width: 100%; max-height: 70vh; object-fit: contain; background: #000;
            border-radius: 8px;
        }
        .jlc-magnet-list {
            display: flex; flex-direction: column; gap: 10px;
            max-height: min(58vh, 560px); overflow: auto; padding-right: 4px;
        }
        .jlc-magnet-list::-webkit-scrollbar { width: 8px; }
        .jlc-magnet-list::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,.18); border-radius: 999px;
        }
        .jlc-magnet-row {
            display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: start;
            padding: 10px 12px; border-radius: 10px; background: rgba(0,0,0,.16);
        }
        .jlc-magnet-meta { min-width: 0; }
        .jlc-magnet-title {
            color: #fff; font-size: 13px; line-height: 1.5; word-break: break-word;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .jlc-magnet-side {
            min-width: min(42%, 280px); display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
        }
        .jlc-magnet-sub {
            color: #9f9f9f; font-size: 11px; line-height: 1.5; text-align: right;
            max-width: min(42vw, 280px);
        }
        .jlc-magnet-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        @media (max-width: 720px) {
            .jlc-magnet-row { grid-template-columns: 1fr; }
            .jlc-magnet-side { min-width: 0; align-items: flex-start; }
            .jlc-magnet-sub { max-width: none; text-align: left; }
            .jlc-magnet-actions { justify-content: flex-start; }
        }

        /* 卡片增强 */        /* 卡片增强 */
        .item-b { position: relative !important; }
        .item-b .box-b { transition: all 0.3s !important; }
        .item-b.visited-item .box-b { outline: 3px solid #666 !important; outline-offset: -2px; }
        .item-b.liked-item .box-b { outline: 4px solid #ffcc00 !important; outline-offset: -2px; box-shadow: 0 0 25px #ffcc0055 !important; }
        .item-b.emby-item .box-b { outline: 4px solid #52b54b !important; outline-offset: -2px; box-shadow: 0 0 20px #52b54b55 !important; }
        .item-b.hated-item { opacity: 0.1 !important; filter: grayscale(1); pointer-events: none; }

        /* 勋章 / 标签 */
        .jlc-badge-container {
            position: absolute; top: 8px; left: 8px; display: flex;
            flex-direction: column; gap: 5px; z-index: 5000; pointer-events: none;
        }
        .jlc-badge {
            padding: 4px 10px; font-size: 11px; font-weight: bold; border-radius: 4px;
            color: white !important; box-shadow: 2px 2px 6px rgba(0,0,0,0.7);
            white-space: nowrap; width: fit-content; text-transform: uppercase;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        }
        .b-fav { background: linear-gradient(135deg, #ff4400, #cc3300) !important; animation: jlc-pulse 2s infinite; }
        .b-person { background: linear-gradient(135deg, #007bff, #0056b3) !important; border-left: 4px solid #fff; }
        @keyframes jlc-pulse {
            0% { box-shadow: 0 0 0 0 rgba(255,68,0,0.8); }
            70% { box-shadow: 0 0 0 10px rgba(255,68,0,0); }
            100% { box-shadow: 0 0 0 0 rgba(255,68,0,0); }
        }
        .meta-overlay-box {
            display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
            max-width: 140px; margin-top: 2px; pointer-events: none;
        }
        .meta-tag {
            display: inline-block; padding: 3px 7px; border-radius: 4px;
            background: rgba(0,0,0,0.82); color: #ddd; border: 1px solid rgba(255,255,255,0.16);
            font-size: 10px; line-height: 1.15; box-shadow: 0 2px 6px rgba(0,0,0,0.45);
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8); white-space: nowrap;
            max-width: 100%; overflow: hidden; text-overflow: ellipsis;
        }
        .meta-tag.hot {
            background: linear-gradient(135deg, rgba(255,68,0,0.95), rgba(204,51,0,0.92)) !important;
            color: #fff !important; font-weight: bold; border-color: #ffaa00;
            animation: jlc-pulse 2s infinite; box-shadow: 0 0 0 0 rgba(255,68,0,0.8), 0 2px 6px rgba(0,0,0,0.45);
        }
        .meta-tag.more {
            background: rgba(20,20,20,0.74) !important; color: #bbb !important;
        }
        .jlc-detail-cover-host { position: relative !important; }
        .jlc-detail-badge-container {
            position: absolute; top: 10px; left: 10px; z-index: 6000; pointer-events: none;
            max-width: min(52%, 220px);
        }
        .jlc-detail-badge-container .meta-overlay-box { max-width: min(100%, 200px); }
        .jlc-detail-copy-btn {
            appearance: none; border: 1px solid rgba(255,255,255,.16); background: rgba(20,20,20,.78);
            color: #f5f5f5; border-radius: 999px; width: 24px; height: 24px; padding: 0;
            margin-left: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
            vertical-align: middle; line-height: 1; box-shadow: 0 2px 8px rgba(0,0,0,.18);
        }
        .jlc-detail-copy-btn:hover { background: #3a3a3a; border-color: rgba(255,255,255,.28); color: #fff; }
        .jlc-detail-copy-btn svg { width: 14px; height: 14px; pointer-events: none; }
        #video_title .jlc-detail-copy-btn,
        h2 .jlc-detail-copy-btn,
        h3 .jlc-detail-copy-btn { margin-left: 10px; }

        /* Commander 工具按钮：整合进旧工具栏 */
        #grid-b .toolbar-b .jlc-tool-btn {
            display: inline-flex; align-items: center; justify-content: center;
            width: 22px; height: 22px; margin-right: 2px; cursor: pointer;
            opacity: .38; font-size: 14px; line-height: 1; vertical-align: middle;
            transition: transform .15s ease, opacity .15s ease, color .15s ease;
        }
        #grid-b .toolbar-b .jlc-tool-btn:hover { opacity: 1; transform: scale(1.08); color: #ff4400; }
        #grid-b .toolbar-b .jlc-tool-btn.active-like { opacity: 1; color: #ffcc00; text-shadow: 0 0 8px rgba(255,204,0,.45); }
        #grid-b .toolbar-b .jlc-tool-btn.active-hate { opacity: 1; color: #ff6666; text-shadow: 0 0 8px rgba(255,102,102,.4); }
        #grid-b .avid-link-b { display: inline-flex !important; align-items: center; gap: 8px; flex-wrap: wrap; }
        #grid-b .avid-line-b { display: inline-flex; align-items: center; gap: 2px; }
        #grid-b .avid-date-badge {
            display: inline-block; padding: 1px 6px; border-radius: 999px;
            background: rgba(0,0,0,.08); border: 1px solid rgba(0,0,0,.12);
            color: #666; font-size: 11px; line-height: 1.4; white-space: nowrap;
        }
        #grid-b .jlc-placeholder-cover {
            width: auto !important; max-width: 72% !important; max-height: 120px !important;
            height: auto !important; object-fit: contain; margin: 12px auto !important; opacity: .92;
        }
        #grid-b .minHeight-96 { min-height: 96px; }
        #grid-b .toolbar-b .jlc-tool-btn.active-bookmark { opacity: 1; color: #7dd3fc; text-shadow: 0 0 8px rgba(125,211,252,.42); }
        #grid-b .item-b.jlc-tracking-old-item .box-b { opacity: 1; filter: none; }
        #grid-b .item-b.jlc-tracking-breakpoint-item .box-b { outline: 3px solid #ff5f56 !important; outline-offset: -2px; box-shadow: 0 0 0 1px rgba(255,95,86,.18), 0 0 22px rgba(255,95,86,.22) !important; }
        #grid-b .item-b.jlc-tracking-breakpoint-item.jlc-bp-locating .box-b {
            animation: jlc-bp-pulse 0.9s ease-in-out 2;
        }
        @keyframes jlc-bp-pulse {
            0%, 100% { box-shadow: 0 0 0 1px rgba(255,95,86,.18), 0 0 22px rgba(255,95,86,.22); }
            50% { box-shadow: 0 0 0 3px rgba(255,95,86,.45), 0 0 28px rgba(255,95,86,.4); }
        }
        .jlc-tracking-divider {
            margin: 8px 5px 10px; display: flex; align-items: center; gap: 8px;
            color: #ff9b95; font-size: 11px; font-weight: 700; letter-spacing: .2px;
        }
        .jlc-tracking-divider::before {
            content: '断点'; display: inline-flex; align-items: center; justify-content: center;
            padding: 2px 8px; border-radius: 999px; background: rgba(255,95,86,.18);
            border: 1px solid rgba(255,95,86,.45); color: #ffb4af; flex: 0 0 auto;
        }
        .jlc-tracking-divider::after {
            content: ''; flex: 1 1 auto; min-width: 24px; height: 1px;
            background: linear-gradient(90deg, rgba(255,95,86,.55), rgba(255,95,86,.08));
        }
        .jlc-tracking-toolbar {
            display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px;
            flex-wrap: wrap;
        }
        .jlc-tracking-toolbar-summary { color: #aaa; font-size: 12px; line-height: 1.4; }
        .jlc-tracking-toolbar-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .jlc-tracking-group { border: 1px solid #333; border-radius: 10px; overflow: hidden; margin-bottom: 12px; background: #1f1f1f; }
        .jlc-tracking-group-toggle {
            width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px;
            background: rgba(255,255,255,.04); color: #fff; border: 0; padding: 12px 14px; cursor: pointer;
        }
        .jlc-tracking-group-toggle small { color: #aaa; }
        .jlc-tracking-group-body { padding: 10px; display: flex; flex-direction: column; gap: 10px; }
        .jlc-tracking-group.collapsed .jlc-tracking-group-body { display: none; }
        .jlc-tracking-item {
            display: grid; grid-template-columns: minmax(0, 1fr) 84px; gap: 12px; padding: 12px;
            border-radius: 10px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.05);
        }
        .jlc-tracking-main { min-width: 0; }
        .jlc-tracking-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .jlc-tracking-title-text { font-size: 14px; font-weight: 600; color: #fff; }
        .jlc-tracking-pagehint { font-size: 11px; color: #f6c36b; font-weight: 600; opacity: .92; }
        .jlc-tracking-meta {
            margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px; color: #9f9f9f; font-size: 12px; line-height: 1.5;
        }
        .jlc-tracking-meta span { display: inline-flex; align-items: center; gap: 4px; }
        .jlc-tracking-actions { display: flex; flex-direction: column; gap: 6px; align-items: stretch; justify-content: center; width: 84px; }
        .jlc-status-pill, .jlc-site-pill {
            display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; padding: 2px 8px; font-size: 11px;
            border: 1px solid transparent;
        }
        .jlc-site-pill { background: rgba(255,255,255,.06); color: #d0d0d0; border-color: rgba(255,255,255,.08); }
        .jlc-status-pill.tone-gray { background: rgba(255,255,255,.06); color: #bbb; border-color: rgba(255,255,255,.08); }
        .jlc-status-pill.tone-green { background: rgba(34,197,94,.14); color: #86efac; border-color: rgba(34,197,94,.28); }
        .jlc-status-pill.tone-red { background: rgba(239,68,68,.16); color: #fca5a5; border-color: rgba(239,68,68,.3); }
        .jlc-status-pill.tone-yellow { background: rgba(250,204,21,.14); color: #fde68a; border-color: rgba(250,204,21,.28); }
        .jlc-tracking-empty {
            padding: 16px; border: 1px dashed #444; border-radius: 10px; color: #aaa; background: rgba(255,255,255,.02);
        }
        #jlc-tracking-pagebar {
            display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
            margin: 10px 5px 14px; padding: 12px 14px; border-radius: 12px;
            background: rgba(17,17,17,.92); border: 1px solid rgba(255,255,255,.08); color: #f5f5f5;
            box-shadow: 0 10px 24px rgba(0,0,0,.16);
        }
        #jlc-tracking-pagebar .jlc-tracking-pagebar-main { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
        #jlc-tracking-pagebar .jlc-tracking-pagebar-title { font-size: 14px; font-weight: 700; }
        #jlc-tracking-pagebar .jlc-tracking-pagehint { color: #c4a574; font-size: 11px; font-weight: 550; }
        #jlc-tracking-pagebar .jlc-tracking-pagebar-meta { color: #b0b0b0; font-size: 12px; line-height: 1.5; display: flex; flex-wrap: wrap; gap: 8px; }
        #jlc-tracking-pagebar .jlc-tracking-pagebar-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        /* 继续断点：与断点红框同色系，常用操作要一眼能扫到 */
        #jlc-tracking-pagebar .jlc-bp-continue,
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button.jlc-bp-continue {
            appearance: none; border: 0; cursor: pointer;
            background: linear-gradient(135deg, #ff5f56, #e54840); color: #fff !important;
            border-radius: 999px; padding: 7px 14px; font-size: 13px; font-weight: 800;
            box-shadow: 0 3px 0 #b8322b, 0 8px 18px rgba(255,95,86,.28);
            letter-spacing: .2px;
        }
        #jlc-tracking-pagebar .jlc-bp-continue:hover,
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button.jlc-bp-continue:hover {
            filter: brightness(1.06);
        }
        #jlc-tracking-pagebar .jlc-bp-continue:active,
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button.jlc-bp-continue:active {
            transform: translateY(1px); box-shadow: 0 1px 0 #b8322b, 0 4px 10px rgba(255,95,86,.22);
        }
        #jlc-tracking-pagebar .jlc-bp-continue.is-loading,
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button.jlc-bp-continue.is-loading {
            background: linear-gradient(135deg, #d4883a, #c4732e);
            box-shadow: 0 3px 0 #9a5a20, 0 8px 16px rgba(212,136,58,.25);
            cursor: wait; opacity: .92;
        }
        #jlc-tracking-pagebar .jlc-bp-miss-hint {
            color: #ff9b95; font-weight: 700;
        }
        /* 旧版右下角浮钮：彻底移除，避免残留节点挡操作 */
        #jlc-tracking-breakpoint-finder { display: none !important; }
        @media (max-width: 820px) {
            .jlc-tracking-item { grid-template-columns: 1fr; }
            .jlc-tracking-actions { width: 100%; flex-direction: row; flex-wrap: wrap; justify-content: flex-start; }
            #jlc-tracking-pagebar { align-items: flex-start; }
        }
        `);
    }

    async function initDB() {
        return new Promise((resolve) => {
            if (!window.indexedDB) {
                console.warn('[Commander] 当前环境不支持 IndexedDB');
                resolve();
                return;
            }

            let settled = false;
            let upgradeBlocked = false;
            let fallbackStarted = false;
            let timer = null;

            const attachDb = (nextDb = null) => {
                db = nextDb || null;
                if (db) {
                    db.onversionchange = () => {
                        try { db.close(); } catch (e) {}
                    };
                }
            };

            const refreshAfterLateDb = () => {
                window.setTimeout(() => {
                    if (!db) return;
                    Promise.resolve()
                        .then(() => loadRadarData?.())
                        .then(() => refreshLibraryUI?.())
                        .then(() => refreshCommanderDecorations?.())
                        .then(() => {
                            renderTrackingUI?.();
                            scheduleTrackingPageRefresh?.(true);
                        })
                        .catch(() => {});
                }, 50);
            };

            const finish = (nextDb = null) => {
                if (settled) return;
                settled = true;
                if (timer) clearTimeout(timer);
                attachDb(nextDb);
                resolve();
            };

            const adoptLateDb = (nextDb, reason) => {
                if (!nextDb || db === nextDb) return;
                attachDb(nextDb);
                console.info('[Commander] ' + reason + '已在后台就绪');
                refreshAfterLateDb();
            };

            const openFallback = () => {
                if (fallbackStarted) return;
                fallbackStarted = true;
                try {
                    const fallbackReq = indexedDB.open(DB_NAME);
                    fallbackReq.onsuccess = (e) => {
                        const fallbackDb = e.target.result;
                        if (upgradeBlocked && !fallbackDb.objectStoreNames.contains(TRACKING_STORE)) {
                            console.warn('[Commander] Tracking 存储升级被阻塞，本次先以兼容模式启动');
                        }
                        if (settled) {
                            adoptLateDb(fallbackDb, '兼容数据库连接');
                            return;
                        }
                        finish(fallbackDb);
                    };
                    fallbackReq.onerror = () => {
                        console.error('[Commander] 数据库回退打开失败');
                        if (!settled) finish(null);
                    };
                    fallbackReq.onblocked = () => {
                        console.error('[Commander] 数据库回退打开仍被阻塞');
                        if (!settled) finish(null);
                    };
                } catch (e) {
                    console.error('[Commander] 数据库回退异常', e);
                    if (!settled) finish(null);
                }
            };

            try {
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                const unblockStartup = (message) => {
                    if (settled) return;
                    upgradeBlocked = true;
                    console.warn(message);
                    finish(null);
                    window.setTimeout(openFallback, 60);
                };

                timer = window.setTimeout(() => {
                    unblockStartup('[Commander] 数据库升级等待超时，先跳过数据库启动');
                }, 2500);

                req.onupgradeneeded = (e) => {
                    const d = e.target.result;
                    if (!d.objectStoreNames.contains('videos')) d.createObjectStore('videos', { keyPath: 'avid' });
                    if (!d.objectStoreNames.contains('emby_data')) d.createObjectStore('emby_data', { keyPath: 'id' });
                    if (!d.objectStoreNames.contains('meta_cache')) d.createObjectStore('meta_cache', { keyPath: 'avid' });
                    if (!d.objectStoreNames.contains(TRACKING_STORE)) d.createObjectStore(TRACKING_STORE, { keyPath: 'id' });
                };
                req.onsuccess = (e) => {
                    const openedDb = e.target.result;
                    if (settled) {
                        adoptLateDb(openedDb, '数据库升级连接');
                        return;
                    }
                    finish(openedDb);
                };
                req.onblocked = () => {
                    unblockStartup('[Commander] 数据库升级被旧连接阻塞，先跳过数据库启动');
                };
                req.onerror = () => {
                    console.error('[Commander] 数据库连接失败');
                    if (!settled) {
                        finish(null);
                        window.setTimeout(openFallback, 60);
                    }
                };
            } catch (e) {
                console.error('[Commander] 数据库初始化异常', e);
                finish(null);
            }
        });
    }

    async function getVal(store, key) {
        if (!db) return null;
        return new Promise(r => {
            try {
                const tx = db.transaction(store, 'readonly');
                const req = tx.objectStore(store).get(key);
                req.onsuccess = () => r(req.result);
                req.onerror = () => r(null);
            } catch (e) { r(null); }
        });
    }

    async function getManyFromStore(store, keys) {
        const uniqueKeys = Array.from(new Set(Array.from(keys || []).filter(key => key != null)));
        if (!db || !uniqueKeys.length) return new Map();
        return new Promise(resolve => {
            const values = new Map();
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                resolve(values);
            };
            try {
                const tx = db.transaction(store, 'readonly');
                const objectStore = tx.objectStore(store);
                uniqueKeys.forEach(key => {
                    const request = objectStore.get(key);
                    request.onsuccess = () => {
                        if (request.result !== undefined) values.set(key, request.result);
                    };
                });
                tx.oncomplete = finish;
                tx.onerror = finish;
                tx.onabort = finish;
            } catch (_) {
                finish();
            }
        });
    }

    /** 会进 WebDAV vault 的 IDB 仓库（meta_cache 可再生，不同步） */
    const SYNCABLE_IDB_STORES = new Set(['videos', 'emby_data', 'tracking_searches']);

    function markIdbStoreDirty(store) {
        if (!SYNCABLE_IDB_STORES.has(store)) return;
        try {
            if (typeof markStatusPrefsDirty === 'function') markStatusPrefsDirty();
            else if (typeof ensureCreamuSync === 'function') ensureCreamuSync()?.markLocalDirty();
        } catch (_) { /* ignore */ }
    }

    async function setVal(store, val) {
        if (!db) return;
        return new Promise(r => {
            try {
                const tx = db.transaction(store, 'readwrite');
                tx.objectStore(store).put(val);
                tx.oncomplete = () => {
                    markIdbStoreDirty(store);
                    r();
                };
                tx.onerror = () => r();
            } catch (e) { r(); }
        });
    }

    async function deleteVal(store, key) {
        if (!db) return;
        return new Promise(r => {
            try {
                const tx = db.transaction(store, 'readwrite');
                tx.objectStore(store).delete(key);
                tx.oncomplete = () => {
                    markIdbStoreDirty(store);
                    r();
                };
                tx.onerror = () => r();
            } catch (e) { r(); }
        });
    }

    async function getAllFromStore(store) {
        if (!db) return [];
        return new Promise(r => {
            try {
                const tx = db.transaction(store, 'readonly');
                const req = tx.objectStore(store).getAll();
                req.onsuccess = () => r(req.result || []);
                req.onerror = () => r([]);
            } catch (e) { r([]); }
        });
    }

    async function loadRadarData() {
        const items = await getAllFromStore('emby_data');
        const embyPersons = items.filter(i => i.type === 'person');
        knownPersons = new Set([...config.custom_persons, ...embyPersons.map(p => String(p.name || '').trim()).filter(Boolean)]);
    }

    /**
     * 从 Emby 拉取影片番号 + 熟人到 emby_data。
     * @param {{ silent?: boolean, buttons?: HTMLElement[] }} [options]
     * @returns {Promise<{ ok: boolean, movieCount?: number, personCount?: number, skipped?: boolean, message?: string }>}
     */
    function syncEmby(options = {}) {
        const silent = !!options.silent;
        const extraButtons = Array.isArray(options.buttons) ? options.buttons.filter(Boolean) : [];
        const btns = [
            document.getElementById('jlc-btn-sync'),
            document.getElementById('jlc-wb-btn-sync'),
            ...extraButtons
        ].filter(Boolean);
        const setSyncButtons = (text, disabled) => {
            btns.forEach(btn => {
                if (text != null) btn.innerText = text;
                btn.disabled = !!disabled;
            });
        };
        const notify = (msg, force) => {
            if (silent && !force) return;
            if (typeof showAlert === 'function') showAlert(msg, !!force);
            else alert(msg);
        };

        if (!config.emby_url || !config.emby_key) {
            notify('请先配置 Emby 信息！', true);
            return Promise.resolve({ ok: false, skipped: true, message: '未配置 Emby' });
        }
        if (!db) {
            notify('数据库未就绪，请稍后重试。', true);
            return Promise.resolve({ ok: false, message: '数据库未就绪' });
        }

        setSyncButtons('⏳ 正在拼命拉取数据...', true);

        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${config.emby_url}/Items?api_key=${config.emby_key}&IncludeItemTypes=Movie&Recursive=true&Fields=Path`,
                timeout: 20000,
                onload: async (res) => {
                    if (res.status !== 200) {
                        notify('同步失败：无法连接 Emby，请检查地址或 Key。', true);
                        setSyncButtons('🔄 立即同步 Emby', false);
                        resolve({ ok: false, message: 'Emby HTTP ' + res.status });
                        return;
                    }
                    let movies = [];
                    try {
                        movies = JSON.parse(res.responseText).Items.map(i => {
                            const m = (String(i.Name || '') + String(i.Path || '')).match(/[a-zA-Z0-9]{2,}-[0-9]{2,}/);
                            return m ? { id: `vid_${m[0].toUpperCase()}`, type: 'movie' } : null;
                        }).filter(Boolean);
                    } catch (e) {
                        notify('Emby 影片列表解析失败。', true);
                        setSyncButtons('🔄 立即同步 Emby', false);
                        resolve({ ok: false, message: '影片列表解析失败' });
                        return;
                    }

                    try {
                        const tx = db.transaction('emby_data', 'readwrite');
                        movies.forEach(m => tx.objectStore('emby_data').put(m));
                        await new Promise((resOk, resErr) => {
                            tx.oncomplete = () => resOk();
                            tx.onerror = () => resErr(tx.error || new Error('emby_data 写入失败'));
                        });
                        markIdbStoreDirty('emby_data');
                    } catch (e) {
                        notify('写入 Emby 影片失败：' + (e?.message || e), true);
                        setSyncButtons('🔄 立即同步 Emby', false);
                        resolve({ ok: false, message: String(e?.message || e) });
                        return;
                    }

                    setSyncButtons('⏳ 正在加载熟人名单...', true);
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: `${config.emby_url}/Persons?api_key=${config.emby_key}&Recursive=true`,
                        timeout: 20000,
                        onload: async (pres) => {
                            try {
                                const items = JSON.parse(pres.responseText).Items || [];
                                const persons = items.map(p => ({ id: `p_${p.Name}`, name: p.Name, type: 'person' }));
                                const ptx = db.transaction('emby_data', 'readwrite');
                                persons.forEach(p => ptx.objectStore('emby_data').put(p));
                                await new Promise((resOk, resErr) => {
                                    ptx.oncomplete = () => resOk();
                                    ptx.onerror = () => resErr(ptx.error || new Error('熟人写入失败'));
                                });
                                markIdbStoreDirty('emby_data');
                                if (!silent) notify('Emby 同步完成！');
                                setSyncButtons('🔄 立即同步 Emby', false);
                                await loadRadarData();
                                try { refreshLibraryUI(); } catch (_) { /* ignore */ }
                                try { refreshCommanderDecorations(); } catch (_) { /* ignore */ }
                                resolve({ ok: true, movieCount: movies.length, personCount: persons.length });
                            } catch (e) {
                                notify('同步熟人名单失败：' + (e?.message || e), true);
                                setSyncButtons('🔄 立即同步 Emby', false);
                                resolve({ ok: false, message: String(e?.message || e) });
                            }
                        },
                        onerror: () => {
                            notify('同步熟人名单失败！', true);
                            setSyncButtons('🔄 立即同步 Emby', false);
                            resolve({ ok: false, message: '熟人网络错误' });
                        }
                    });
                },
                onerror: () => {
                    notify('网络错误！', true);
                    setSyncButtons('🔄 立即同步 Emby', false);
                    resolve({ ok: false, message: 'Emby 网络错误' });
                }
            });
        });
    }

    /**
     * 页脚「立即同步」：先 Emby 拉库，再 WebDAV 推送 vault（含点击过的 videos）。
     * @param {{ button?: HTMLElement }} [options]
     */
    async function syncEmbyAndWebDav(options = {}) {
        const btn = options.button || null;
        const original = btn ? btn.textContent : '';
        const setBtn = (text, disabled) => {
            if (!btn) return;
            if (text != null) btn.textContent = text;
            btn.disabled = !!disabled;
        };
        const parts = [];
        let embyOk = true;
        let wdOk = true;
        try {
            setBtn('⏳ Emby…', true);
            const embyConfigured = !!(config.emby_url && config.emby_key);
            if (embyConfigured) {
                const er = await syncEmby({ silent: true, buttons: btn ? [btn] : [] });
                if (er.ok) {
                    parts.push('Emby 影片 ' + (er.movieCount || 0) + ' · 熟人 ' + (er.personCount || 0));
                } else {
                    embyOk = false;
                    parts.push('Emby 失败：' + (er.message || '未知'));
                }
            } else {
                parts.push('Emby 未配置（跳过）');
            }

            setBtn('⏳ WebDAV…', true);
            const sync = typeof ensureCreamuSync === 'function' ? ensureCreamuSync() : null;
            if (!sync) {
                wdOk = false;
                parts.push('WebDAV 模块未加载');
            } else if (typeof sync.isConfigured === 'function' && !sync.isConfigured()) {
                wdOk = false;
                parts.push('WebDAV 未配置（请到 设置 → 服务 填写）');
            } else {
                // 确保最新本地数据进 vault（含刚拉的 emby_data / 点击/心动）
                try { sync.markLocalDirty(); } catch (_) { /* ignore */ }
                try {
                    await sync.syncNow({ force: 'push' });
                    parts.push('WebDAV 已推送（含点击/心动/追更/屏蔽词）');
                } catch (e) {
                    wdOk = false;
                    parts.push('WebDAV 失败：' + (e?.message || e));
                }
            }

            const msg = parts.join('\n');
            if (typeof showAlert === 'function') showAlert(msg, !(embyOk && wdOk));
            else alert(msg);
            return { ok: embyOk && wdOk, parts };
        } finally {
            setBtn(original || '☁ 立即同步', false);
        }
    }

    const TAG_CHAR_FOLD = {
        '親': '亲', '姦': '奸', '義': '义', '継': '继', '繼': '继', '續': '续', '處': '处', '処': '处',
        '戀': '恋', '慾': '欲', '婦': '妇', '專': '专', '屬': '属', '雙': '双', '單': '单', '體': '体',
        '學': '学', '園': '园', '變': '变', '態': '态', '盜': '盗', '攝': '摄', '錄': '录', '寫': '写',
        '癡': '痴', '實': '实', '戰': '战', '觸': '触', '發': '发', '調': '调', '產': '产', '業': '业',
        '畫': '画', '龍': '龙', '豐': '丰'
    };

    function normalizeText(v) {
        return String(v || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
    }

    function normalizeTagText(v) {
        return normalizeText(v).replace(/./gu, ch => TAG_CHAR_FOLD[ch] || ch);
    }

    function normalizeCode(v) {
        return normalizeText(v).replace(/[^a-z0-9]+/g, '');
    }

    function uniqueTextList(list) {
        const seen = new Set();
        return (Array.isArray(list) ? list : [])
            .map(x => String(x || '').trim())
            .filter(Boolean)
            .filter(x => {
                const key = normalizeTagText(x);
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }

    function asTextList(v) {
        if (Array.isArray(v)) return uniqueTextList(v.flatMap(x => asTextList(x)));
        if (typeof v === 'string' || typeof v === 'number') {
            return String(v).split(/[\n,，]/).map(x => x.trim()).filter(Boolean);
        }
        if (v && typeof v === 'object') {
            const candidateKeys = ['name', 'title', 'label', 'text', 'value', 'genre', 'tag', 'category', 'type', 'display_name', 'displayName'];
            for (const key of candidateKeys) {
                if (key in v) {
                    const list = asTextList(v[key]);
                    if (list.length) return list;
                }
            }
        }
        return [];
    }

    function extractMetaTubeData(payload) {
        const root = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
        if (!root || typeof root !== 'object') return root;
        if (Array.isArray(root)) return root;
        const listCandidate = ['items', 'results', 'rows', 'list', 'movies', 'hits', 'records']
            .map(key => root[key])
            .find(Array.isArray);
        return listCandidate || root;
    }

    function normalizeReleaseDate(value) {
        if (value == null) return '';
        const text = String(value).trim();
        if (!text) return '';
        const iso = text.match(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/);
        if (iso) return iso[0].replace(/[/.]/g, '-');
        const compact = text.match(/\d{8}/);
        if (compact) return `${compact[0].slice(0, 4)}-${compact[0].slice(4, 6)}-${compact[0].slice(6, 8)}`;
        return text;
    }

    function pickReleaseDate(source) {
        if (!source || typeof source !== 'object') return '';
        const candidates = [
            source.release_date,
            source.releaseDate,
            source.premiered,
            source.publish_date,
            source.publishDate,
            source.pub_date,
            source.pubDate,
            source.date,
            source.air_date,
            source.airDate,
            source.issued_at,
            source.issuedAt
        ];
        for (const value of candidates) {
            const normalized = normalizeReleaseDate(value);
            if (normalized) return normalized;
        }
        return '';
    }

    function normalizeMetaRecord(raw) {
        if (!raw || typeof raw !== 'object') return raw;
        const nested = [raw.movie, raw.item, raw.result, raw.video].find(v => v && typeof v === 'object') || null;
        const merged = nested ? { ...raw, ...nested } : { ...raw };
        const actors = uniqueTextList([
            ...asTextList(merged.actors),
            ...asTextList(merged.actor),
            ...asTextList(merged.actresses),
            ...asTextList(merged.cast),
            ...asTextList(merged.performers),
            ...asTextList(merged.performer),
            ...asTextList(merged.stars),
            ...asTextList(merged.persons)
        ]);
        const genres = uniqueTextList([
            ...asTextList(merged.genres),
            ...asTextList(merged.genre),
            ...asTextList(merged.tags),
            ...asTextList(merged.tag),
            ...asTextList(merged.categories),
            ...asTextList(merged.category),
            ...asTextList(merged.labels),
            ...asTextList(merged.label),
            ...asTextList(merged.types),
            ...asTextList(merged.type)
        ]);
        const number = merged.number || merged.code || merged.no || merged.movie_number || merged.movieNo || merged.movie_id || merged.id || '';
        const releaseDate = pickReleaseDate(merged) || pickReleaseDate(raw);
        return { ...merged, actors, genres, number, releaseDate };
    }

    function tagMatches(source, keyword) {
        const src = normalizeText(source);
        const key = normalizeText(keyword);
        if (!src || !key) return false;
        if (src.includes(key)) return true;
        const foldedSrc = normalizeTagText(source);
        const foldedKey = normalizeTagText(keyword);
        return !!foldedSrc && !!foldedKey && foldedSrc.includes(foldedKey);
    }

    async function requestJSON(url, timeout = 15000) {
        const requestTimeout = Math.max(250, Number(timeout) || 15000);
        return new Promise(r => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                timeout: requestTimeout,
                onload: (res) => {
                    try {
                        r(JSON.parse(res.responseText));
                    } catch (e) {
                        r(null);
                    }
                },
                onerror: () => r(null),
                ontimeout: () => r(null)
            });
        });
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>\"']/g, ch => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[ch]));
    }
