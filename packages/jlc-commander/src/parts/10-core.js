
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

    function uniqueLinkObjects(list) {
        const seen = new Set();
        const baseHref = typeof location !== 'undefined' && location?.href ? location.href : 'https://www.javlibrary.com/';
        return (Array.isArray(list) ? list : [])
            .map(item => {
                if (!item) return null;
                const hrefRaw = String(item.href || item.url || '').trim();
                if (!hrefRaw) return null;
                let href = hrefRaw;
                try {
                    href = new URL(hrefRaw, baseHref).href;
                } catch (e) {}
                return {
                    label: String(item.label || item.text || '').trim() || href,
                    href,
                    note: String(item.note || '').trim(),
                    kind: String(item.kind || '').trim()
                };
            })
            .filter(Boolean)
            .filter(item => {
                const key = `${item.label}|${item.href}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }

    function normalizeResourceAvid(value) {
        const raw = String(value || '').trim().toUpperCase();
        if (!raw) return '';
        const compact = raw.replace(/[^A-Z0-9]+/g, '');
        const fc2 = raw.match(/FC2[\s_-]*PPV[\s_-]*(\d{3,7})/i);
        if (fc2) return `FC2-PPV-${fc2[1]}`;
        const mgsPrefix = (typeof MGS_AVID_PREFIXES !== 'undefined' ? MGS_AVID_PREFIXES : [])
            .map(prefix => String(prefix || '').toUpperCase().replace(/[^A-Z0-9]+/g, ''))
            .sort((a, b) => b.length - a.length)
            .find(prefix => prefix && compact.startsWith(prefix) && /^\d{2,6}$/.test(compact.slice(prefix.length)));
        if (mgsPrefix) return `${mgsPrefix}-${compact.slice(mgsPrefix.length)}`;
        const bare = raw.match(/^([A-Z]{2,10})(\d{2,6})$/);
        if (bare) return `${bare[1]}-${bare[2]}`;
        const common = raw.match(/([A-Z0-9]{2,12})[\s_]*-?[\s_]*(\d{2,6})/);
        if (common) return `${common[1]}-${common[2]}`;
        return raw.replace(/\s+/g, '');
    }

    function decodeHtmlEntities(value) {
        const text = String(value ?? '');
        if (!text) return '';
        if (typeof document !== 'undefined' && document?.createElement) {
            const textarea = document.createElement('textarea');
            textarea.innerHTML = text;
            return textarea.value;
        }
        return text
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
    }

    function stripHtmlTags(value) {
        return decodeHtmlEntities(String(value ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    }

    function normalizeMediaUrl(url, base = 'https://missav.ws/') {
        let value = String(url || '').replace(/\\\//g, '/').trim();
        if (!value) return '';
        if (value.startsWith('//')) value = 'https:' + value;
        try {
            value = new URL(value, base).href;
        } catch (e) {}
        return value.replace(/^http:\/\//i, 'https://');
    }

    function normalizeMissAVPathname(value) {
        try {
            return decodeURIComponent(String(value || ''));
        } catch (error) {
            return String(value || '');
        }
    }

    function isExpectedMissAVPageUrl(url, avid, base = 'https://missav.ws/') {
        const code = normalizeResourceAvid(avid);
        if (!url || !code) return false;
        let parsed;
        try {
            parsed = new URL(url, base);
        } catch (error) {
            return false;
        }
        if (!/missav\./i.test(parsed.hostname || '')) return false;
        const target = normalizeCode(code);
        const pathnameCode = normalizeCode(normalizeMissAVPathname(parsed.pathname));
        if (/\/search\//i.test(parsed.pathname || '')) {
            const searchCode = normalizeCode(normalizeMissAVPathname(`${parsed.pathname}${parsed.search}${parsed.hash}`));
            return !!searchCode && searchCode.includes(target);
        }
        return !!pathnameCode && pathnameCode.includes(target);
    }

    function sanitizeMissAVPageUrl(url, avid, base = 'https://missav.ws/') {
        if (!isExpectedMissAVPageUrl(url, avid, base)) return '';
        return normalizeMediaUrl(url, base);
    }

    function normalizePreviewImageUrl(url, base = 'https://blogjav.net/') {
        let value = normalizeMediaUrl(url, base);
        if (!value) return '';
        value = value.replace(/pixhost\.org/ig, 'pixhost.to');
        value = value.replace(/\.th(?=\.[a-z]{3,4}(?:$|[?#]))/i, '');
        value = value.replace(/\/thumbs\//ig, '/images/');
        value = value.replace(/\/th\//ig, '/i/');
        value = value.replace(/\/\/t(?=[^/])/i, '//img');
        value = value.replace(/["']/g, '');
        if (/imagetwist/i.test(value)) {
            value = value.replace(/\.jpg(?=$|[?#])/i, '.jpeg');
        }
        return value;
    }

    function normalizeResourceStatusState(value) {
        const state = normalizeText(value);
        if (['ok', 'partial', 'blocked', 'error', 'empty', 'pending'].includes(state)) return state;
        return 'empty';
    }

    function makeResourceStatusMarkup(statuses) {
        const list = (Array.isArray(statuses) ? statuses : []).filter(Boolean);
        if (!list.length) return '';
        return '<div class="jlc-resource-status-list">' + list.map(item => {
            const state = normalizeResourceStatusState(item.state || item.status);
            const label = String(item.label || item.provider || '状态').trim();
            const note = String(item.note || '').trim();
            const href = normalizeMediaUrl(item.href || item.url || '', location?.href || 'https://www.javlibrary.com/');
            const inner = '<strong>' + escapeHtml(label) + '</strong>' + (note ? '<small>' + escapeHtml(note) + '</small>' : '');
            return href
                ? '<a class="jlc-resource-status is-' + escapeHtml(state) + '" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer nofollow">' + inner + '</a>'
                : '<span class="jlc-resource-status is-' + escapeHtml(state) + '">' + inner + '</span>';
        }).join('') + '</div>';
    }

    function getTrailerProviderKey(item) {
        const label = normalizeText(item?.label || item?.provider || '');
        const kind = normalizeText(item?.kind || '');
        if (kind === 'censored' || /missav.*有码/.test(label)) return 'missav-censored';
        if (kind === 'uncensored' || /missav.*无码/.test(label)) return 'missav-uncensored';
        if (/^dmm/.test(label)) return 'dmm';
        if (/^faleno/.test(label) || kind === 'faleno') return 'faleno';
        if (/^mgs/.test(label) || /^mgs/.test(kind)) return 'mgs';
        if (/^7mmtv/.test(label)) return '7mmtv';
        if (/^supjav/.test(label)) return 'supjav';
        if (/^(?:njav|123av)/.test(label) || /^(?:njav|123av)/.test(kind)) return 'njav';
        return label || kind || '';
    }

    function getTrailerProviderLabel(item) {
        switch (getTrailerProviderKey(item)) {
            case 'dmm':
                return 'DMM';
            case 'faleno':
                return 'FALENO';
            case 'mgs':
                return 'MGS';
            case 'missav-censored':
                return 'MissAV 有码';
            case 'missav-uncensored':
                return 'MissAV 无码流出';
            case '7mmtv':
                return '7MMTV';
            case 'supjav':
                return 'SupJav';
            case 'njav':
                return '123AV';
            default:
                return String(item?.label || item?.provider || '资源').trim() || '资源';
        }
    }

    function makeTrailerProviderMarkup(statuses, links) {
        const order = [];
        const map = new Map();
        const ensureEntry = (item, fallbackState = 'partial') => {
            const key = getTrailerProviderKey(item);
            if (!key) return null;
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    label: getTrailerProviderLabel(item),
                    state: fallbackState,
                    note: '',
                    href: '',
                    kind: String(item?.kind || '').trim()
                });
                order.push(key);
            }
            return map.get(key);
        };

        (Array.isArray(statuses) ? statuses : []).filter(Boolean).forEach(item => {
            const entry = ensureEntry(item, 'pending');
            if (!entry) return;
            entry.label = getTrailerProviderLabel(item) || entry.label;
            entry.state = normalizeResourceStatusState(item.state || item.status);
            const note = String(item.note || '').trim();
            if (note) entry.note = note;
            const href = normalizeMediaUrl(item.href || item.url || '', location?.href || 'https://www.javlibrary.com/');
            if (href) entry.href = href;
            if (!entry.kind && item.kind) entry.kind = String(item.kind).trim();
        });

        uniqueLinkObjects(links).forEach(item => {
            const entry = ensureEntry(item, 'partial');
            if (!entry) return;
            entry.label = getTrailerProviderLabel(item) || entry.label;
            if (!entry.href && item.href) entry.href = item.href;
            if (!entry.note && item.note) entry.note = String(item.note).trim();
            if (!entry.kind && item.kind) entry.kind = String(item.kind).trim();
        });

        if (!order.length) return '';
        return '<div class="jlc-resource-status-list">' + order.map(key => {
            const item = map.get(key);
            if (!item) return '';
            const state = normalizeResourceStatusState(item.state || 'partial');
            const label = String(item.label || '资源').trim() || '资源';
            const note = String(item.note || '').trim();
            const inner = '<strong>' + escapeHtml(label) + '</strong>' + (note ? '<small>' + escapeHtml(note) + '</small>' : '');
            if (item.href) {
                return '<a class="jlc-resource-status is-' + escapeHtml(state) + '" href="' + escapeHtml(item.href) + '" target="_blank" rel="noopener noreferrer nofollow">' + inner + '</a>';
            }
            return '<span class="jlc-resource-status is-' + escapeHtml(state) + '">' + inner + '</span>';
        }).join('') + '</div>';
    }

    function describeRequestStatus(result, fallback = '') {
        if (!result) return fallback || '请求失败';
        if (result.blockedByChallenge || result.error === 'challenge') return 'Cloudflare 验证';
        if (result.status) return 'HTTP ' + result.status;
        if (result.error === 'timeout') return '请求超时';
        if (result.error === 'network') return '网络失败';
        return fallback || '请求失败';
    }

    function buildAvidLoosePattern(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return null;
        const escaped = code.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
        return new RegExp(escaped.replace(/-/g, '.*'), 'i');
    }

    function isLikelyAvidMatch(title, avid) {
        const text = stripHtmlTags(title);
        const code = normalizeResourceAvid(avid);
        if (!text || !code) return false;
        const normalized = normalizeCode(text);
        if (normalized.includes(normalizeCode(code))) return true;
        const loose = buildAvidLoosePattern(code);
        return !!loose && loose.test(text);
    }

    function uniqueResourceEntries(list) {
        const seen = new Set();
        const baseHref = typeof location !== 'undefined' && location?.href ? location.href : 'https://www.javlibrary.com/';
        return (Array.isArray(list) ? list : [])
            .map(item => {
                if (!item) return null;
                const hrefRaw = String(item.href || item.url || '').trim();
                if (!hrefRaw) return null;
                let href = hrefRaw;
                try {
                    href = new URL(hrefRaw, item.base || baseHref).href;
                } catch (e) {}
                return {
                    title: stripHtmlTags(item.title || item.label || item.text || href) || href,
                    href,
                    provider: String(item.provider || '').trim(),
                    note: String(item.note || '').trim(),
                    src: item.src === undefined ? undefined : (item.src || null)
                };
            })
            .filter(Boolean)
            .filter(item => {
                const key = item.provider + '|' + item.title + '|' + item.href;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }

    function buildBlogJavSearchKeyword(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        let keyword = code.replace(/-/g, '+');
        if (!/\s+/.test(keyword) && /^(?!\d+$)(?![A-Z]+$)[0-9A-Z+]+$/i.test(keyword)) {
            const number = keyword.match(/\d+$/)?.[0] || '';
            if (number) {
                const prefix = keyword.slice(0, -number.length).replace(/\++$/g, '');
                keyword = prefix ? (prefix + '+' + number) : number;
            }
        }
        return keyword.replace(/\+{2,}/g, '+').trim();
    }

    function buildJavStoreSearchUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        return 'https://javstore.net/search?q=' + encodeURIComponent(code);
    }

    function buildSiteBingSearchUrl(site, keyword, extra = '') {
        const query = ('site:' + String(site || '').trim() + ' ' + String(keyword || '').trim()).trim();
        if (!query || !site) return '';
        return 'https://www.bing.com/search?q=' + encodeURIComponent(query) + (extra || '');
    }

    function buildJavStoreLookupUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        return buildJavStoreSearchUrl(code);
    }

    function extractJavStoreSearchEntries(responseText, avid) {
        const text = String(responseText || '');
        if (!text) return [];
        const entries = [];
        const regex = /<a\b[^>]*href=["']([^"']+)["'][^>]*?(?:title=["']([^"']*)["'])?[^>]*>([\s\S]*?)<\/a>/ig;
        let match;
        while ((match = regex.exec(text))) {
            const href = normalizeMediaUrl(match[1], 'https://javstore.net/');
            const title = stripHtmlTags(match[2] || match[3]);
            if (!href || !/javstore\.net/i.test(href) || !title || (avid && !isLikelyAvidMatch(title, avid))) continue;
            entries.push({ title: 'JavStore · ' + title, href, provider: 'javstore', note: '站内搜索' });
        }
        const scoreEntry = (item) => {
            const title = String(item?.title || '');
            const hdScore = /\b(?:FHD|4K|UHD)\b/i.test(title) ? 40 : 0;
            const variantScore = /\b(?:Uncensored|Mosaic)\b/i.test(title) ? 8 : 0;
            const idScore = Number((String(item?.href || '').match(/(\d{4,})/) || [])[1] || 0) / 100000000;
            return hdScore + variantScore + idScore;
        };
        return uniqueResourceEntries(entries).sort((a, b) => scoreEntry(b) - scoreEntry(a));
    }

    function buildMissAVPageCandidates(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return [];
        const encoded = encodeURIComponent(code);
        return uniqueLinkObjects([
            { label: 'MissAV 有码', href: 'https://missav.ws/cn/' + encoded, note: '直达候选', kind: 'censored' },
            { label: 'MissAV 有码', href: 'https://missav.ws/' + encoded, note: '直达候选', kind: 'censored' },
            { label: 'MissAV 无码流出', href: 'https://missav.ws/cn/' + encoded + '-uncensored-leak', note: '直达候选', kind: 'uncensored' },
            { label: 'MissAV 无码流出', href: 'https://missav.ws/' + encoded + '-uncensored-leak', note: '直达候选', kind: 'uncensored' }
        ]);
    }

    function buildMissAVVariantGroups(avid) {
        const candidates = buildMissAVPageCandidates(avid);
        return [
            { key: 'censored', label: 'MissAV 有码', candidates: candidates.filter(item => item.kind === 'censored') },
            { key: 'uncensored', label: 'MissAV 无码流出', candidates: candidates.filter(item => item.kind === 'uncensored') }
        ];
    }

    function buildMissAVManualLinks(avid) {
        return uniqueLinkObjects(buildMissAVVariantGroups(avid).map(group => {
            const preferred = group.candidates.find(item => /\/cn\//i.test(item.href)) || group.candidates[0];
            return preferred ? { label: group.label, href: preferred.href, note: '直达候选', kind: group.key } : null;
        }).filter(Boolean));
    }

    const MGS_AVID_PREFIXES = [
        'SIRO', 'ARA', 'MIUM', '300MIUM', 'GANA', '200GANA', 'SCUTE', 'LUXU', '259LUXU', 'MAAN',
        'NNPJ', 'NACR', 'INST', 'ONEMORE', 'ABF', 'ABP', 'ABW', '107START', '390JAC', '857OMG',
        '223WPVR', '107SODS', '348NTR', '336KNB', '476MLA', '230ORECZ', '420HOI', '107SDMM',
        '116NHKB', '277DCV', '748SPAY'
    ];

    function isLikelyMgsAvid(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return false;
        const prefix = String(code.split('-')[0] || '').toUpperCase();
        return !!prefix && MGS_AVID_PREFIXES.includes(prefix);
    }

    function buildMgsDetailCandidates(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return [];
        return uniqueLinkObjects([
            { label: 'MGS', href: 'https://www.mgstage.com/product/product_detail/' + encodeURIComponent(code) + '/', note: '官方详情候选', kind: 'mgs-detail' }
        ]);
    }

    function buildMgsManualLinks(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return [];
        if (isLikelyMgsAvid(code)) {
            const detailLinks = buildMgsDetailCandidates(code);
            if (detailLinks.length) return detailLinks;
        }
        return uniqueLinkObjects([
            { label: 'MGS', href: 'https://www.mgstage.com/search/cSearch.php?search_word=' + encodeURIComponent(code) + '&type=top', note: '官方预告补充', kind: 'mgs-search' }
        ]);
    }

    function extractMgsProductCode(responseText) {
        const text = stripHtmlTags(responseText);
        if (!text) return '';
        const matched = text.match(/品番[:：]\s*([A-Z0-9-]{3,20})/i);
        return normalizeResourceAvid(matched?.[1] || '');
    }

    function extractMgsSamplePlayerLinks(responseText, avid) {
        const text = String(responseText || '');
        if (!text) return [];
        const pageCode = extractMgsProductCode(text);
        if (!pageCode) return [];
        const target = normalizeCode(avid);
        if (target && normalizeCode(pageCode) !== target) return [];
        const found = [];
        const seen = new Set();
        const anchorRegex = /<a\b[^>]*href=["']([^"']*sampleplayer\/sampleplayer\.html\/([0-9a-f-]{36})\/?[^"']*)["'][^>]*>/ig;
        let match;
        while ((match = anchorRegex.exec(text))) {
            const pid = String(match[2] || '').trim();
            if (!pid || seen.has(pid)) continue;
            seen.add(pid);
            found.push({
                label: 'MGS',
                href: normalizeMediaUrl(match[1], 'https://www.mgstage.com/'),
                note: /button_sample/i.test(match[0]) ? '主样片' : '样片候选',
                pid,
                preferred: /button_sample/i.test(match[0])
            });
        }
        return found.sort((a, b) => Number(b.preferred) - Number(a.preferred)).map(item => ({
            label: item.label,
            href: item.href,
            note: item.note,
            pid: item.pid
        }));
    }

    function buildMgsSampleVideoUrl(url) {
        let value = normalizeMediaUrl(decodeHtmlEntities(url), 'https://www.mgstage.com/');
        if (!value) return '';
        value = value.replace(/^https?:\/\/dl/i, 'https://chdl');
        if (/\.mp4(?:$|[?#])/i.test(value)) return value;
        if (/\.ism\/request/i.test(value)) {
            return value.replace(/\.ism\/request(?:\?.*)?$/i, '.mp4');
        }
        return '';
    }

    function buildFalenoSearchUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        return 'https://faleno.jp/top/?s=' + encodeURIComponent(code) + '&post_type=' + encodeURIComponent('作品');
    }

    function build123AvSearchUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        return 'https://missav123.to/ja/search?keyword=' + encodeURIComponent(code);
    }

    function buildTrailerFallbackLinks(avid) {
        const code = normalizeResourceAvid(avid);
        const falenoUrl = buildFalenoSearchUrl(code);
        if (!code) return [];
        return uniqueLinkObjects([
            ...buildMgsManualLinks(code),
            ...(falenoUrl ? [{ label: 'FALENO', href: falenoUrl, note: '官方预告补充', kind: 'faleno' }] : []),
            { label: '7MMTV', href: 'https://7mmtv.sx/zh/censored_search/all/' + encodeURIComponent(code) + '/1.html', note: '聚合补充' },
            { label: 'SupJav', href: 'https://supjav.com/zh/?s=' + encodeURIComponent(code), note: '聚合补充' },
            { label: '123AV', href: build123AvSearchUrl(code), note: '聚合补充', kind: 'njav' },
        ]);
    }

    function buildTrailerSupplementalProviders(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return [];
        return [
            { label: '7MMTV', url: 'https://7mmtv.sx/zh/censored_search/all/' + encodeURIComponent(code) + '/1.html', base: 'https://7mmtv.sx/', host: '7mmtv.sx', aliases: [], kind: '7mmtv' },
            { label: 'SupJav', url: 'https://supjav.com/zh/?s=' + encodeURIComponent(code), base: 'https://supjav.com/', host: 'supjav.com', aliases: [], kind: 'supjav' },
            { label: '123AV', url: build123AvSearchUrl(code), base: 'https://missav123.to/', host: 'missav123.to', aliases: ['123av.com', 'njav.tv'], kind: 'njav' }
        ];
    }

    function isLikelyListingUrl(url) {
        const value = String(url || '');
        return /(?:[?&]s=|[?&]keyword=|\/censored_search\/|\/search\/)/i.test(value);
    }

    function getSupplementalProviderHosts(provider) {
        return Array.from(new Set([
            String(provider?.host || '').trim().toLowerCase(),
            ...((Array.isArray(provider?.aliases) ? provider.aliases : []).map(item => String(item || '').trim().toLowerCase()))
        ].filter(Boolean)));
    }

    function isSupplementalProviderUrl(url, provider) {
        const value = normalizeText(url);
        return !!value && getSupplementalProviderHosts(provider).some(host => value.includes(host));
    }

    function isChallengePage(responseText) {
        const value = normalizeText(stripHtmlTags(responseText || ''));
        return /just a moment|attention required|cloudflare|checking your browser|captcha|ddos-guard/.test(value);
    }

    function extractSupplementalSearchEntries(responseText, avid, provider) {
        const text = String(responseText || '');
        if (!text || !provider?.host) return [];
        const target = normalizeCode(avid);
        const entries = [];
        const regex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/ig;
        let match;
        while ((match = regex.exec(text))) {
            const href = normalizeMediaUrl(match[1], provider.base || ('https://' + provider.host + '/'));
            const title = stripHtmlTags(match[2]);
            const haystack = title + ' ' + href + ' ' + stripHtmlTags(match[0]);
            if (!href || !isSupplementalProviderUrl(href, provider)) continue;
            if (isLikelyListingUrl(href)) continue;
            const titleHit = title && isLikelyAvidMatch(title, avid);
            const hrefHit = target && normalizeCode(href).includes(target);
            const bodyHit = target && normalizeCode(haystack).includes(target);
            if (!titleHit && !hrefHit && !bodyHit) continue;
            entries.push({ label: provider.label, href, note: '存在页', kind: provider.kind });
        }
        return uniqueLinkObjects(entries).slice(0, 3);
    }

    async function fetchTrailerSupplementalStatus(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return { statuses: [], links: [] };
        const providers = buildTrailerSupplementalProviders(code);
        const results = await Promise.all(providers.map(async provider => {
            const response = await requestPage(provider.url, { timeout: 12000 });
            const blockedByChallenge = isChallengePage(response.responseText);
            if (!response.ok || blockedByChallenge) {
                const state = (blockedByChallenge || [403, 429, 503].includes(response.status)) ? 'blocked'
                    : (response.status === 404 ? 'empty' : 'error');
                const note = blockedByChallenge ? 'Cloudflare' : describeRequestStatus(response, '搜索失败');
                return {
                    label: provider.label,
                    state,
                    note,
                    href: provider.url,
                    kind: provider.kind,
                    link: { label: provider.label, href: provider.url, note, kind: provider.kind }
                };
            }
            const hits = extractSupplementalSearchEntries(response.responseText, code, provider);
            const finalUrl = normalizeMediaUrl(response.finalUrl || provider.url, provider.base || provider.url);
            const finalIsHit = finalUrl && !isLikelyListingUrl(finalUrl) && isSupplementalProviderUrl(finalUrl, provider) && tokenMatchesAvidCode(finalUrl, code);
            if (hits.length || finalIsHit) {
                const href = (hits[0] || {}).href || finalUrl || provider.url;
                return {
                    label: provider.label,
                    state: 'ok',
                    note: '存在页',
                    href,
                    kind: provider.kind,
                    link: { label: provider.label, href, note: '存在页', kind: provider.kind }
                };
            }
            return {
                label: provider.label,
                state: 'empty',
                note: '未找到',
                href: provider.url,
                kind: provider.kind,
                link: { label: provider.label, href: provider.url, note: '搜索页', kind: provider.kind }
            };
        }));
        return {
            statuses: results.map(item => ({
                label: item.label,
                state: item.state,
                note: item.note,
                href: item.href,
                kind: item.kind
            })),
            links: uniqueLinkObjects(results.map(item => item.link).filter(Boolean))
        };
    }

    function extractFalenoDetailLinks(responseText, avid, base = 'https://faleno.jp/') {
        const text = String(responseText || '');
        const code = normalizeResourceAvid(avid);
        if (!text || !code) return [];
        const target = normalizeCode(code);
        const links = [];
        const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/ig;
        let match;
        while ((match = anchorRegex.exec(text))) {
            const href = normalizeMediaUrl(decodeHtmlEntities(match[1]), base);
            if (!href || !/faleno\.jp/i.test(href)) continue;
            const anchorText = stripHtmlTags(match[0]);
            const haystack = normalizeCode(href + ' ' + anchorText);
            if (!haystack.includes(target) && !tokenMatchesAvidCode(anchorText, code) && !tokenMatchesAvidCode(href, code)) continue;
            const note = /top\/\?s=/i.test(href) ? '官方搜索' : '官方详情';
            links.push({ label: 'FALENO', href, note, kind: 'faleno' });
        }
        return uniqueLinkObjects(links);
    }

    function extractFalenoPreviewCandidates(responseText, pageUrl = '') {
        const text = String(responseText || '');
        if (!text) return [];
        const base = pageUrl || 'https://faleno.jp/';
        const found = [];
        const seen = new Set();
        const push = (value, forcedType = '') => {
            const href = normalizeMediaUrl(decodeHtmlEntities(value), base);
            if (!href) return;
            let type = forcedType || '';
            if (!type) {
                type = isIframeLikeTrailerHref(href) ? 'iframe' : 'video';
            }
            if (type === 'video' && !/\.(?:mp4|m4v|mov|webm|ogv|m3u8)(?:$|[?#])/i.test(href)) return;
            if (type === 'iframe' && !isIframeLikeTrailerHref(href)) return;
            const key = type + '|' + href;
            if (seen.has(key)) return;
            seen.add(key);
            found.push({
                label: 'FALENO 官方预告',
                href,
                type,
                kind: 'faleno',
                pageUrl: pageUrl || href
            });
        };

        const mediaPatterns = [
            /<video[^>]+(?:data-src|src)=["']([^"']+)["']/ig,
            /<source[^>]+src=["']([^"']+)["']/ig,
            /(?:movie_url|movieUrl|video_url|videoUrl|sample_url|sampleUrl|trailer_url|trailerUrl|data-video|data-movie)\s*[:=]\s*["']([^"']+)["']/ig,
            /["'](https?:\/\/[^"']+\.(?:mp4|m4v|mov|webm|ogv|m3u8)[^"']*)["']/ig,
            /["'](\/\/[^"']+\.(?:mp4|m4v|mov|webm|ogv|m3u8)[^"']*)["']/ig,
            /["'](\/[^"']+\.(?:mp4|m4v|mov|webm|ogv|m3u8)[^"']*)["']/ig,
        ];
        mediaPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text))) push(match[1], 'video');
        });

        const iframePatterns = [
            /<iframe[^>]+src=["']([^"']+)["']/ig,
            /(?:player_url|playerUrl|embed_url|embedUrl)\s*[:=]\s*["']([^"']+)["']/ig,
            /["'](https?:\/\/(?:www\.)?(?:youtube\.com\/embed\/[^"'?#\s]+|youtube\.com\/watch\?[^"']+|youtu\.be\/[^"'?#\s]+|player\.vimeo\.com\/video\/[^"'?#\s]+|vimeo\.com\/\d+)[^"']*)["']/ig
        ];
        iframePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text))) push(match[1], 'iframe');
        });

        return uniqueTrailerSources(found);
    }

    function buildDmmSearchUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        return 'https://www.dmm.co.jp/search/=/searchstr=' + encodeURIComponent(code) + '/';
    }

    function tokenMatchesAvidCode(value, avid) {
        const code = normalizeResourceAvid(avid);
        const matched = code.match(/^([A-Z0-9]{2,10})-(\d{2,6})$/);
        const raw = String(value || '');
        const tokens = Array.from(new Set([
            normalizeCode(raw),
            ...raw.split(/[^a-z0-9]+/ig).map(part => normalizeCode(part))
        ].filter(Boolean))).map(token => token.toLowerCase());
        if (!tokens.length || !matched) return !!code && tokens.some(token => token.includes(normalizeCode(code)));
        const prefix = matched[1].toLowerCase();
        const targetNumber = String(parseInt(matched[2], 10) || 0);
        return tokens.some(token => {
            let index = token.indexOf(prefix);
            while (index !== -1) {
                const prev = token.charAt(index - 1);
                if (!prev || !/[a-z]/i.test(prev)) {
                    const rest = token.slice(index + prefix.length);
                    const digits = (rest.match(/^0*(\d{1,6})/) || [])[1] || '';
                    if (digits) {
                        const parsed = String(parseInt(digits, 10) || 0);
                        if (parsed === targetNumber) return true;
                    }
                }
                index = token.indexOf(prefix, index + prefix.length);
            }
            return false;
        });
    }

    function extractDmmSearchPreviewInfo(responseText, avid) {
        const text = String(responseText || '');
        const searchUrl = buildDmmSearchUrl(avid);
        const baseLinks = searchUrl ? [{ label: 'DMM 搜索', href: searchUrl, note: '官方搜索' }] : [];
        if (!text) return { videoSources: [], links: uniqueLinkObjects(baseLinks), status: 'empty', note: '空响应' };
        if (/年齢認証/.test(text) || /age_check/i.test(text)) {
            return { videoSources: [], links: uniqueLinkObjects(baseLinks), status: 'blocked', note: '年龄确认' };
        }
        const detailLinks = [];
        const videoHrefs = [];
        const hrefRegex = /href=["']([^"']+)["']/ig;
        let match;
        while ((match = hrefRegex.exec(text))) {
            const href = normalizeMediaUrl(decodeHtmlEntities(match[1]), 'https://www.dmm.co.jp/');
            if (!href) continue;
            if (/cc3001\.dmm\.co\.jp/i.test(href) && /\.mp4(?:$|[?#])/i.test(href)) {
                if (!tokenMatchesAvidCode(href, avid)) continue;
                videoHrefs.push(href);
                continue;
            }
            if (/dmm\.co\.jp/i.test(href) && /\/detail\/=\/cid=/i.test(href)) {
                if (!tokenMatchesAvidCode(href, avid)) continue;
                detailLinks.push({ label: 'DMM 详情', href, note: '搜索命中' });
            }
        }
        const uniqueDetails = uniqueLinkObjects(detailLinks);
        const pageUrl = (uniqueDetails[0] || {}).href || searchUrl || '';
        const seenVideos = new Set();
        const videoSources = videoHrefs.filter(href => {
            if (seenVideos.has(href)) return false;
            seenVideos.add(href);
            return true;
        }).slice(0, 2).map(href => ({
            label: 'DMM 官方预告',
            href,
            kind: 'official',
            pageUrl
        }));
        if (videoSources.length) {
            return {
                videoSources,
                links: uniqueLinkObjects([...baseLinks, ...uniqueDetails]),
                status: 'ok',
                note: '搜索页样片直连'
            };
        }
        if (uniqueDetails.length) {
            return {
                videoSources: [],
                links: uniqueLinkObjects([...baseLinks, ...uniqueDetails]),
                status: 'partial',
                note: '搜索命中，未抽到样片'
            };
        }
        return {
            videoSources: [],
            links: uniqueLinkObjects(baseLinks),
            status: 'empty',
            note: '搜索未命中'
        };
    }

    function buildOfficialPreviewCandidates(avid) {
        const code = normalizeResourceAvid(avid);
        const matched = code.match(/^([A-Z0-9]{2,10})-(\d{2,6})$/);
        if (!matched) return [];
        const prefix = matched[1].toLowerCase();
        const number = matched[2].padStart(5, '0');
        const folder = `${prefix}${number}`;
        const root = `https://cc3001.dmm.co.jp/litevideo/freepv/${prefix.charAt(0)}/${prefix.slice(0, 3)}/${folder}`;
        return uniqueLinkObjects([
            { label: 'DMM 官方预告', href: `${root}/${folder}hhb.mp4`, kind: 'official' },
            { label: 'DMM 官方预告', href: `${root}/${folder}_dmb_w.mp4`, kind: 'official' },
            { label: 'DMM 官方预告', href: `${root}/${folder}mhb.mp4`, kind: 'official' },
        ]);
    }

    function buildExternalResourceLinks(avid, currentSite = '') {
        const code = normalizeResourceAvid(avid);
        if (!code) return [];
        const site = String(currentSite || '').toLowerCase();
        const skipBySite = {
            javlibrary: 'javlibrary',
            javbus: 'javbus',
            javdb: 'javdb'
        };
        const skipLabel = skipBySite[site] || '';
        const postType = encodeURIComponent('作品');
        return uniqueLinkObjects([
            { label: 'JavBus', href: `https://www.javbus.com/search/${encodeURIComponent(code)}`, note: '站外详情/磁力' },
            { label: 'JavDB', href: `https://javdb.com/search?q=${encodeURIComponent(code)}&f=all`, note: '站外详情/磁力' },
            { label: 'JavLibrary', href: `https://www.javlibrary.com/cn/vl_searchbyid.php?keyword=${encodeURIComponent(code)}`, note: '站外详情' },
            { label: 'MissAV 有码', href: `https://missav.ws/cn/${encodeURIComponent(code)}`, note: '直达候选' },
            { label: 'MissAV 无码流出', href: `https://missav.ws/cn/${encodeURIComponent(code)}-uncensored-leak`, note: '直达候选' },
            ...buildMgsManualLinks(code),
            { label: 'FALENO', href: `https://faleno.jp/top/?s=${encodeURIComponent(code)}&post_type=${postType}`, note: '官方预告补充' },
            { label: '7MMTV', href: `https://7mmtv.sx/zh/censored_search/all/${encodeURIComponent(code)}/1.html`, note: '站外页' },
            { label: 'SupJav', href: `https://supjav.com/zh/?s=${encodeURIComponent(code)}`, note: '站外页' },
            { label: '123AV', href: build123AvSearchUrl(code), note: '站外页', kind: 'njav' },
            { label: 'BlogJav', href: `https://blogjav.net/?s=${encodeURIComponent(code)}`, note: '截图检索' },
        ].filter(item => normalizeText(item.label) !== skipLabel));
    }

    function buildScreenshotSearchLinks(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return [];
        const blogKeyword = buildBlogJavSearchKeyword(code) || code;
        return uniqueLinkObjects([
            { label: 'BlogJav', href: 'https://blogjav.net/?s=' + encodeURIComponent(blogKeyword), note: '截图搜索' },
            { label: 'JavStore', href: buildJavStoreLookupUrl(code), note: '加载后直达' }
        ]);
    }

    function normalizeMagnetHref(href) {
        const decoded = decodeHtmlEntities(String(href || '').trim()).replace(/\s+/g, '');
        if (!/^magnet:\?/i.test(decoded)) return '';
        return decoded.replace(/&amp;/ig, '&');
    }

    function extractMagnetHash(href) {
        const magnet = normalizeMagnetHref(href);
        if (!magnet) return '';
        const matched = magnet.match(/[?&]xt=urn:btih:([a-z0-9]{32,40})/i);
        return matched ? matched[1].toUpperCase() : '';
    }

    function uniqueMagnetEntries(list) {
        const seen = new Set();
        return (Array.isArray(list) ? list : [])
            .map(item => {
                if (!item) return null;
                const href = normalizeMagnetHref(item.href || item.url || '');
                if (!href) return null;
                let src = '';
                const srcRaw = String(item.src || '').trim();
                if (srcRaw) {
                    try {
                        src = new URL(srcRaw, item.base || 'https://www.javlibrary.com/').href;
                    } catch (e) {
                        src = srcRaw;
                    }
                }
                const title = stripHtmlTags(item.title || item.label || item.text || '').trim() || href;
                return {
                    title,
                    label: title,
                    href,
                    note: stripHtmlTags(item.note || '').trim(),
                    provider: String(item.provider || '').trim(),
                    src
                };
            })
            .filter(Boolean)
            .filter(item => {
                const hash = extractMagnetHash(item.href);
                const key = hash || `${normalizeCode(item.title)}|${item.href}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }

    function buildSukebeiSearchUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        return 'https://sukebei.nyaa.si/?f=0&c=0_0&q=' + encodeURIComponent(code);
    }

    function buildTorrentKittySearchUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        return 'https://www.torkitty.net/search/' + encodeURIComponent(code);
    }

    function buildBtsowSearchUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        return 'https://so2.btsow.top/search?key=' + encodeURIComponent(code);
    }

    function buildSehuatangSearchUrl(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return '';
        const encoded = encodeURIComponent(code);
        return 'https://www.sehuatang.net/search.php?mod=forum&searchsubmit=yes&orderby=lastpost&ascdesc=desc&kw=' + encoded + '&srchtxt=' + encoded;
    }

    function buildMagnetSearchLinks(avid) {
        const code = normalizeResourceAvid(avid);
        if (!code) return [];
        return uniqueLinkObjects([
            { label: 'Sukebei', href: buildSukebeiSearchUrl(code), note: '磁力搜索' },
            { label: 'Torkitty', href: buildTorrentKittySearchUrl(code), note: '磁力搜索' },
            { label: 'BTSOW', href: buildBtsowSearchUrl(code), note: '磁力搜索' },
            { label: '色花堂', href: buildSehuatangSearchUrl(code), note: '番号搜索' },
            { label: 'JavDB', href: `https://javdb.com/search?q=${encodeURIComponent(code)}&f=download`, note: '下载页' },
            { label: 'JavBus', href: `https://www.javbus.com/search/${encodeURIComponent(code)}`, note: '详情/磁力' }
        ]);
    }

    function scoreMagnetTitle(title) {
        const text = String(title || '');
        let score = 0;
        if (/\b(?:4K|UHD)\b/i.test(text)) score += 60;
        if (/\b(?:FHD|1080P)\b/i.test(text)) score += 40;
        if (/\b(?:HD|720P)\b/i.test(text)) score += 20;
        if (/\b(?:H265|HEVC)\b/i.test(text)) score += 12;
        if (/\b(?:Reducing Mosaic|Uncensored)\b/i.test(text)) score += 8;
        return score;
    }

    function extractSukebeiMagnetEntries(responseText, avid) {
        const text = String(responseText || '');
        if (!text) return [];
        const rows = text.match(/<tr\b[\s\S]*?<\/tr>/ig) || [];
        const rawEntries = [];
        for (const row of rows) {
            const magnetMatch = row.match(/<a[^>]*href=["'](magnet:[^"']+)["'][^>]*>[\s\S]*?fa-magnet/i);
            const viewMatch = row.match(/<a[^>]*href=["']([^"']*\/view\/\d+[^"']*)["'][^>]*(?:title=["']([^"']*)["'])?[^>]*>([\s\S]*?)<\/a>/i);
            if (!magnetMatch || !viewMatch) continue;
            const title = stripHtmlTags(viewMatch[2] || viewMatch[3]);
            if (!title || (avid && !isLikelyAvidMatch(title, avid))) continue;
            const sizeMatch = row.match(/<td[^>]*class=["'][^"']*\btext-center\b[^"']*["'][^>]*>\s*([^<]*?(?:GiB|MiB|TiB|GB|MB|TB))\s*<\/td>/i);
            const dateMatch = row.match(/<td[^>]*class=["'][^"']*\btext-center\b[^"']*["'][^>]*data-timestamp=["']([^"']+)["'][^>]*>\s*([^<]+)\s*<\/td>/i)
                || row.match(/<td[^>]*class=["'][^"']*\btext-center\b[^"']*["'][^>]*>\s*(\d{4}-\d{2}-\d{2}[^<]*)\s*<\/td>/i);
            const counters = Array.from(row.matchAll(/<td[^>]*class=["'][^"']*\btext-center\b[^"']*["'][^>]*>\s*(\d+)\s*<\/td>/ig), matched => Number(matched[1]));
            const [seeders, leechers, downloads] = counters.slice(-3);
            const sizeText = sizeMatch?.[1]?.trim() || '';
            const dateText = String(dateMatch?.[2] || dateMatch?.[1] || '').trim();
            const noteParts = ['Sukebei'];
            if (sizeText) noteParts.push(sizeText);
            if (dateText) noteParts.push(dateText);
            if (seeders || leechers) noteParts.push(`↑${seeders || 0} / ↓${leechers || 0}`);
            if (downloads) noteParts.push('完成 ' + downloads);
            rawEntries.push({
                title,
                href: magnetMatch[1],
                provider: 'sukebei',
                note: noteParts.join(' · '),
                src: viewMatch[1],
                base: 'https://sukebei.nyaa.si/',
                _score: 120 + scoreMagnetTitle(title) + Math.min((seeders || 0) * 4, 40) + Math.min((downloads || 0) / 100, 30) + Math.min((Date.parse(dateText) || 0) / 100000000000, 20)
            });
        }
        const scoreMap = new Map(rawEntries.map(item => [extractMagnetHash(item.href) || item.href, item._score || 0]));
        return uniqueMagnetEntries(rawEntries).sort((a, b) => {
            const scoreA = scoreMap.get(extractMagnetHash(a.href) || a.href) || 0;
            const scoreB = scoreMap.get(extractMagnetHash(b.href) || b.href) || 0;
            return scoreB - scoreA;
        });
    }

    function extractTorrentKittyMagnetEntries(responseText, avid) {
        const text = String(responseText || '');
        if (!text) return [];
        const rawEntries = [];
        const rowRegex = /<tr>\s*<td class=["']name["']>([\s\S]*?)<\/td>\s*<td class=["']size["']>([\s\S]*?)<\/td>\s*<td class=["']date["']>([\s\S]*?)<\/td>\s*<td class=["']action["']>([\s\S]*?)<\/td>\s*<\/tr>/ig;
        let match;
        while ((match = rowRegex.exec(text))) {
            const title = stripHtmlTags(match[1]);
            if (!title || (avid && !isLikelyAvidMatch(title, avid))) continue;
            const sizeText = stripHtmlTags(match[2]).trim();
            const dateText = stripHtmlTags(match[3]).trim();
            const actionHtml = match[4];
            const magnetMatch = actionHtml.match(/<a[^>]*href=["'](magnet:[^"']+)["'][^>]*rel=["']magnet["'][^>]*>/i)
                || actionHtml.match(/<a[^>]*href=["'](magnet:[^"']+)["'][^>]*>Open<\/a>/i);
            if (!magnetMatch) continue;
            const infoMatch = actionHtml.match(/<a[^>]*href=["']([^"']*\/information\/[^"']+)["'][^>]*>/i);
            const noteParts = ['Torkitty'];
            if (sizeText) noteParts.push(sizeText);
            if (dateText) noteParts.push(dateText);
            rawEntries.push({
                title,
                href: magnetMatch[1],
                provider: 'torrentkitty',
                note: noteParts.join(' · '),
                src: infoMatch?.[1] || '',
                base: 'https://www.torkitty.net/',
                _score: 90 + scoreMagnetTitle(title) + Math.min((Date.parse(dateText) || 0) / 100000000000, 20)
            });
        }
        const scoreMap = new Map(rawEntries.map(item => [extractMagnetHash(item.href) || item.href, item._score || 0]));
        return uniqueMagnetEntries(rawEntries).sort((a, b) => {
            const scoreA = scoreMap.get(extractMagnetHash(a.href) || a.href) || 0;
            const scoreB = scoreMap.get(extractMagnetHash(b.href) || b.href) || 0;
            return scoreB - scoreA;
        });
    }

    function extractBtsowRedirectUrl(responseText) {
        const text = String(responseText || '');
        if (!text) return '';
        const matched = text.match(/window\.location\.replace\((["'])(https?:\/\/[^"'<>]+)\1\)/i)
            || text.match(/location\.(?:href|replace)\((["'])(https?:\/\/[^"'<>]+)\1\)/i)
            || text.match(/location\.href\s*=\s*(["'])(https?:\/\/[^"'<>]+)\1/i);
        return decodeHtmlEntities(matched?.[2] || '');
    }

    async function requestBtsowSearchPage(url) {
        const first = await requestPage(url, { timeout: 12000 });
        const redirectedUrl = extractBtsowRedirectUrl(first.responseText);
        if (redirectedUrl && redirectedUrl !== url) {
            const redirected = await requestPage(redirectedUrl, { timeout: 12000 });
            if (/searchresultsworld\.com|cdn-fileserver\.com|_ol_one_/i.test(redirected.responseText || '') && !/magnet:\?/i.test(redirected.responseText || '')) {
                return Object.assign({}, redirected, { blockedByChallenge: true, challengeUrl: redirectedUrl, finalUrl: redirected.finalUrl || redirectedUrl });
            }
            return redirected;
        }
        if (/searchresultsworld\.com|cdn-fileserver\.com|_ol_one_/i.test(first.responseText || '') && !/magnet:\?/i.test(first.responseText || '')) {
            return Object.assign({}, first, { blockedByChallenge: true });
        }
        return first;
    }

    function extractBtsowMagnetEntries(responseText, avid) {
        const text = String(responseText || '');
        if (!text) return [];
        const rawEntries = [];
        const magnetRegex = /<a\b[^>]*href=["'](magnet:[^"']+)["'][^>]*>([\s\S]*?)<\/a>/ig;
        let match;
        while ((match = magnetRegex.exec(text))) {
            const magnetHref = match[1];
            const chunk = text.slice(Math.max(0, match.index - 1200), Math.min(text.length, match.index + 1600));
            const anchors = Array.from(chunk.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/ig)).map(item => ({
                href: item[1],
                text: stripHtmlTags(item[2]).trim()
            }));
            const titleEntry = anchors
                .filter(item => item.text && !/^magnet:?/i.test(item.href) && (!avid || isLikelyAvidMatch(item.text, avid)))
                .sort((a, b) => b.text.length - a.text.length)[0];
            const title = titleEntry?.text || stripHtmlTags(match[2]).trim();
            if (!title || (avid && !isLikelyAvidMatch(title, avid))) continue;
            const detailHref = anchors.find(item => item.href && !/^magnet:/i.test(item.href) && !/\/search\//i.test(item.href) && (item === titleEntry || /\/(?:hash|detail|torrent|info)\//i.test(item.href)))?.href || '';
            const sizeText = (chunk.match(/\b(\d+(?:\.\d+)?\s*(?:GiB|MiB|TiB|GB|MB|TB))\b/i) || [])[1] || '';
            const dateText = (chunk.match(/\b(20\d{2}[-\/.]\d{1,2}[-\/.]\d{1,2}(?:\s+\d{1,2}:\d{2})?)\b/) || [])[1] || '';
            const noteParts = ['BTSOW'];
            if (sizeText) noteParts.push(sizeText);
            if (dateText) noteParts.push(dateText);
            rawEntries.push({
                title,
                href: magnetHref,
                provider: 'btsow',
                note: noteParts.join(' · '),
                src: detailHref,
                base: 'https://so2.btsow.top/',
                _score: 80 + scoreMagnetTitle(title) + Math.min((Date.parse(dateText) || 0) / 100000000000, 20)
            });
        }
        const scoreMap = new Map(rawEntries.map(item => [extractMagnetHash(item.href) || item.href, item._score || 0]));
        return uniqueMagnetEntries(rawEntries).sort((a, b) => {
            const scoreA = scoreMap.get(extractMagnetHash(a.href) || a.href) || 0;
            const scoreB = scoreMap.get(extractMagnetHash(b.href) || b.href) || 0;
            return scoreB - scoreA;
        });
    }

    function extractMissAVSearchLinks(responseText, avid) {
        const text = String(responseText || '');
        const code = normalizeResourceAvid(avid);
        if (!text || !code) return [];
        const escaped = code.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
        const found = [];
        const pushByRegex = (label, kind, regex, rejectPatterns = []) => {
            let match;
            while ((match = regex.exec(text))) {
                const href = match[1];
                if (!href || rejectPatterns.some(pattern => pattern.test(href)) || /\/search\//i.test(href)) continue;
                found.push({ label, href, kind });
            }
        };
        pushByRegex('MissAV 无码流出', 'uncensored', new RegExp("href=[\"']([^\"']*" + escaped + "[^\"']*uncensored-leak[^\"']*)[\"']", 'ig'));
        pushByRegex(
            'MissAV 有码',
            'censored',
            new RegExp("href=[\"']([^\"']*(?:\\/cn\\/)?[^\"']*" + escaped + "[^\"']*)[\"']", 'ig'),
            [/uncensored-leak/i, /chinese-subtitle/i]
        );
        const uniqueByHref = new Set();
        return uniqueLinkObjects(found.map(item => ({
            label: item.label,
            href: item.href.startsWith('http') ? item.href : new URL(item.href, 'https://missav.ws').href,
            note: '',
            kind: item.kind
        }))).filter(item => {
            const safeHref = sanitizeMissAVPageUrl(item.href, code, 'https://missav.ws/');
            if (!safeHref) return false;
            item.href = safeHref;
            if (uniqueByHref.has(item.href)) return false;
            uniqueByHref.add(item.href);
            return true;
        });
    }

    function extractMissAVEvalM3U8(responseText) {
        const text = String(responseText || '');
        if (!text) return '';
        const snippets = text.match(/eval\(function\(p,a,c,k,e,[\s\S]*?\)\)/ig) || [];
        const lineHits = text.split('\n').map(line => line.trim()).filter(line => line.startsWith('eval(function('));
        for (const snippet of [...snippets, ...lineHits].slice(0, 5)) {
            try {
                const decoded = new Function('return ' + snippet.trim())();
                const url = normalizeMediaUrl(decoded);
                if (url && /\.(?:m3u8|mp4)(?:$|[?#])/i.test(url)) return url;
            } catch (error) {}
        }
        return '';
    }

    function extractMissAVMediaCandidates(responseText) {
        const text = String(responseText || '');
        if (!text) return [];
        const found = [];
        const push = (href, note = '') => {
            const normalized = normalizeMediaUrl(href);
            if (!normalized) return;
            const isM3U8 = /\.m3u8(?:$|[?#])/i.test(normalized);
            found.push({
                label: isM3U8 ? 'MissAV M3U8' : 'MissAV MP4',
                href: normalized,
                note,
                kind: 'missav-media'
            });
        };
        const evalUrl = extractMissAVEvalM3U8(text);
        if (evalUrl) push(evalUrl, 'eval 解码');
        const patterns = [
            /<video[^>]+(?:data-src|src)=["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/ig,
            /<source[^>]+src=["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/ig,
            /["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/ig,
            /["'](\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/ig,
            /["'](\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/ig,
        ];
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text))) {
                push(match[1], '页面提取');
            }
        }
        const list = uniqueLinkObjects(found);
        return list.sort((a, b) => {
            const score = (item) => (/\.mp4(?:$|[?#])/i.test(item.href) ? 20 : 10) + (/eval/i.test(item.note) ? 3 : 0);
            return score(b) - score(a);
        });
    }

    function extractMissAVVideoUrl(responseText) {
        return extractMissAVMediaCandidates(responseText)[0]?.href || '';
    }

    function extractBingSearchLinks(responseText, site) {
        const text = String(responseText || '');
        const host = normalizeText(site).replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (!text || !host) return [];
        const links = [];
        const regex = /<li\b[^>]*class=["'][^"']*\bb_algo\b[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/ig;
        let match;
        while ((match = regex.exec(text))) {
            const href = normalizeMediaUrl(match[1], 'https://' + host + '/');
            if (!href || !normalizeText(href).includes(host)) continue;
            links.push({ label: stripHtmlTags(match[2]) || host, href, note: 'Bing' });
        }
        return uniqueLinkObjects(links);
    }

    function extractBlogJavSearchEntries(responseText, avid) {
        const text = String(responseText || '');
        if (!text) return [];
        const entries = [];
        const regex = /<[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>\s*<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/ig;
        let match;
        while ((match = regex.exec(text))) {
            const title = stripHtmlTags(match[2]);
            if (!title || (avid && !isLikelyAvidMatch(title, avid))) continue;
            entries.push({ title: 'BlogJav · ' + title, href: match[1], provider: 'blogjav' });
        }
        return uniqueResourceEntries(entries).sort((a, b) => {
            const score = (item) => (/\b(?:FHD|4K|UHD)\b/i.test(item.title) ? 20 : 0) + item.title.length;
            return score(b) - score(a);
        });
    }

    function extractBlogJavScreenshotCandidates(responseText) {
        const text = String(responseText || '');
        if (!text) return [];
        const found = [];
        const push = (href) => {
            const normalized = normalizePreviewImageUrl(href, 'https://blogjav.net/');
            if (!normalized || !/\.(?:jpe?g|png|webp)(?:$|[?#])/i.test(normalized)) return;
            found.push(normalized);
        };
        const imgRegex = /<img\b[^>]*>/ig;
        let match;
        while ((match = imgRegex.exec(text))) {
            const tag = match[0];
            if (!/(pixhost|imagetwist|thumbs|images|\.th\.)/i.test(tag)) continue;
            for (const attr of ['data-lazy-src', 'data-src', 'src']) {
                const attrMatch = tag.match(new RegExp(attr + '=["\\\']([^"\\\']+)["\\\']', 'i'));
                if (attrMatch?.[1]) push(attrMatch[1]);
            }
        }
        const linkRegex = /<a\b[^>]*href=["']([^"']+\.(?:jpe?g|jpeg|png|webp)[^"']*)["'][^>]*>/ig;
        while ((match = linkRegex.exec(text))) {
            push(match[1]);
        }
        return Array.from(new Set(found));
    }

    function extractJavStoreScreenshotCandidates(responseText, avid = '') {
        const text = String(responseText || '');
        if (!text) return [];
        const found = [];
        const dmmIds = new Set();
        const push = (href) => {
            const normalized = normalizePreviewImageUrl(href, 'https://javstore.net/');
            if (!normalized || !/\.(?:jpe?g|png|webp)(?:$|[?#])/i.test(normalized)) return;
            found.push(normalized);
            const dmmMatch = normalized.match(/https?:\/\/pics\.dmm\.co\.jp\/digital\/video\/([a-z0-9_]+)\/\1jp-(\d+)\.jpg/i);
            if (dmmMatch?.[1]) dmmIds.add(dmmMatch[1].toLowerCase());
        };
        const pushDmmSequence = (id) => {
            const token = String(id || '').trim().toLowerCase();
            if (!token) return;
            for (let i = 1; i <= 10; i += 1) {
                push('https://pics.dmm.co.jp/digital/video/' + token + '/' + token + 'jp-' + i + '.jpg');
            }
        };
        const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/ig;
        let match;
        while ((match = anchorRegex.exec(text))) {
            const href = match[1];
            const body = match[2];
            if (/pixhost|imagetwist|pics\.dmm\.co\.jp|\.(?:jpe?g|png|webp)/i.test(href) || /<img[^>]+(?:src|data-src)=["'][^"']*(pixhost|imagetwist|pics\.dmm\.co\.jp|\.th\.)/i.test(body)) {
                push(href);
            }
            const imgMatch = body.match(/<img[^>]+(?:data-src|src)=["']([^"']+)["']/i);
            if (imgMatch?.[1]) push(imgMatch[1]);
        }
        const dmmDirectRegex = /https?:\/\/pics\.dmm\.co\.jp\/digital\/video\/([a-z0-9_]+)\/\1jp-(\d+)\.jpg/ig;
        while ((match = dmmDirectRegex.exec(text))) {
            push(match[0]);
        }
        const code = normalizeResourceAvid(avid);
        const matchedCode = code.match(/^([A-Z0-9]{2,10})-(\d{2,6})$/);
        if (matchedCode) {
            const prefix = matchedCode[1].toLowerCase();
            const number = String(parseInt(matchedCode[2], 10) || 0);
            const tokenRegex = new RegExp('\\b(' + prefix + '0*' + number + ')(?![a-z])\\b', 'ig');
            while ((match = tokenRegex.exec(text))) {
                dmmIds.add(String(match[1] || '').toLowerCase());
            }
        }
        Array.from(dmmIds).forEach(pushDmmSequence);
        return Array.from(new Set(found));
    }

    async function searchSiteViaBing(site, keyword, extra = '') {
        const query = ('site:' + site + ' ' + String(keyword || '').trim()).trim();
        const searchUrl = 'https://www.bing.com/search?q=' + encodeURIComponent(query) + (extra || '');
        const response = await requestPage(searchUrl);
        return {
            searchUrl,
            response,
            links: extractBingSearchLinks(response.responseText, site)
        };
    }

    async function requestPage(url, extra = {}) {
        return new Promise(resolve => {
            GM_xmlhttpRequest(Object.assign({
                method: 'GET',
                url,
                timeout: 15000,
                onload: (res) => resolve({
                    ok: res.status >= 200 && res.status < 400,
                    status: res.status || 0,
                    responseText: res.responseText || '',
                    finalUrl: res.finalUrl || url,
                    error: ''
                }),
                onerror: () => resolve({ ok: false, status: 0, responseText: '', finalUrl: url, error: 'network' }),
                ontimeout: () => resolve({ ok: false, status: 0, responseText: '', finalUrl: url, error: 'timeout' })
            }, extra));
        });
    }

    async function requestText(url, extra = {}) {
        const result = await requestPage(url, extra);
        return result.ok ? (result.responseText || '') : '';
    }

    function sanitizeBrowserFetchHeaders(headers = {}) {
        const sanitized = Object.assign({}, headers || {});
        const referrer = sanitized.Referer || sanitized.referer || '';
        delete sanitized.Referer;
        delete sanitized.referer;
        return {
            headers: Object.keys(sanitized).length ? sanitized : undefined,
            referrer: compactText(referrer || '')
        };
    }

    function isLikelyBotGuardResponse(text = '') {
        const normalized = compactText(String(text || '')).toLowerCase();
        if (!normalized) return false;
        return /(performing security verification|enable javascript and cookies to continue|attention required|cf-browser-verification|just a moment|why have i been blocked|checking if the site connection is secure|\b403 forbidden\b)/i.test(normalized);
    }

    async function requestPageWithHiddenFrame(url, extra = {}) {
        const target = parseTrackingUrl(url, location.href);
        const current = parseTrackingUrl(location.href, location.href);
        if (!target || !current || target.origin !== current.origin || String(extra.method || 'GET').toUpperCase() !== 'GET') {
            return requestPage(url, extra);
        }
        const mountHost = document.body || document.documentElement;
        if (!mountHost) return requestPage(url, extra);
        const timeout = Number(extra.timeout || 0) || 15000;
        return new Promise(resolve => {
            let settled = false;
            const iframe = document.createElement('iframe');
            iframe.setAttribute('aria-hidden', 'true');
            iframe.tabIndex = -1;
            iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;border:0;';
            const finalize = (result) => {
                if (settled) return;
                settled = true;
                if (timer) window.clearTimeout(timer);
                iframe.removeEventListener('load', onLoad);
                iframe.removeEventListener('error', onError);
                iframe.remove();
                resolve(result);
            };
            const onLoad = () => {
                try {
                    const frameWindow = iframe.contentWindow;
                    const frameDoc = iframe.contentDocument || frameWindow?.document;
                    const finalUrl = compactText(frameWindow?.location?.href || iframe.src || target.href) || target.href;
                    const responseText = frameDoc?.documentElement?.outerHTML || '';
                    const blocked = isLikelyBotGuardResponse(responseText);
                    finalize({
                        ok: !!responseText && !blocked,
                        status: blocked ? 403 : 200,
                        responseText,
                        finalUrl,
                        error: blocked ? 'forbidden' : ''
                    });
                } catch (error) {
                    finalize({ ok: false, status: 0, responseText: '', finalUrl: target.href, error: 'network' });
                }
            };
            const onError = () => finalize({ ok: false, status: 0, responseText: '', finalUrl: target.href, error: 'network' });
            const timer = window.setTimeout(() => {
                finalize({ ok: false, status: 0, responseText: '', finalUrl: target.href, error: 'timeout' });
            }, timeout);
            iframe.addEventListener('load', onLoad);
            iframe.addEventListener('error', onError);
            mountHost.appendChild(iframe);
            iframe.src = target.href;
        });
    }

    async function requestPageWithBrowserFetch(url, extra = {}) {
        const target = parseTrackingUrl(url, location.href);
        const current = parseTrackingUrl(location.href, location.href);
        if (!target || !current || target.origin !== current.origin || String(extra.method || 'GET').toUpperCase() !== 'GET') {
            return requestPage(url, extra);
        }
        const timeout = Number(extra.timeout || 0) || 15000;
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? window.setTimeout(() => controller.abort(), timeout) : null;
        const prepared = sanitizeBrowserFetchHeaders(extra.headers || {});
        let fetchResult = null;
        try {
            const response = await fetch(target.href, {
                method: 'GET',
                credentials: 'include',
                redirect: 'follow',
                cache: 'no-store',
                headers: prepared.headers,
                referrer: prepared.referrer || undefined,
                signal: controller?.signal
            });
            const responseText = await response.text();
            fetchResult = {
                ok: response.ok && !isLikelyBotGuardResponse(responseText),
                status: response.status || 0,
                responseText: responseText || '',
                finalUrl: response.url || target.href,
                error: ''
            };
        } catch (error) {
            const message = String(error?.name || error?.message || '').toLowerCase();
            fetchResult = {
                ok: false,
                status: 0,
                responseText: '',
                finalUrl: target.href,
                error: message.includes('abort') ? 'timeout' : 'network'
            };
        } finally {
            if (timer) window.clearTimeout(timer);
        }
        const shouldTryHiddenFrame = !fetchResult.ok
            || !fetchResult.responseText
            || fetchResult.status === 401
            || fetchResult.status === 403
            || isLikelyBotGuardResponse(fetchResult.responseText);
        if (!shouldTryHiddenFrame) return fetchResult;
        const frameResult = await requestPageWithHiddenFrame(target.href, extra);
        if (frameResult.ok && frameResult.responseText) return frameResult;
        const gmResult = await requestPage(url, extra);
        if (gmResult.ok && gmResult.responseText && !isLikelyBotGuardResponse(gmResult.responseText)) return gmResult;
        if (fetchResult.ok && fetchResult.responseText && !isLikelyBotGuardResponse(fetchResult.responseText)) return fetchResult;
        return frameResult.status ? frameResult : (gmResult.status ? gmResult : fetchResult);
    }

    async function probeMediaUrl(url) {
        const head = await requestPage(url, { method: 'HEAD', timeout: 7000 });
        if (head.ok) {
            return { ok: true, status: head.status || 200, state: 'ok', note: describeRequestStatus(head, 'HTTP 200') };
        }
        const range = await requestPage(url, { method: 'GET', timeout: 7000, headers: { Range: 'bytes=0-0' } });
        if (range.ok || range.status === 206) {
            return { ok: true, status: range.status || 206, state: 'ok', note: describeRequestStatus(range, 'HTTP 206') };
        }
        const failed = range.status ? range : head;
        const state = failed.status === 403 ? 'blocked' : (failed.status === 404 ? 'empty' : 'error');
        return { ok: false, status: failed.status || 0, state, note: describeRequestStatus(failed) };
    }

    async function headRequestOK(url) {
        return (await probeMediaUrl(url)).ok;
    }

    function pickMetaSearchHit(results, avid) {
        const list = (Array.isArray(results) ? results : []).map(normalizeMetaRecord);
        const target = normalizeCode(avid);
        return list.find(x => normalizeCode(x?.number) === target)
            || list.find(x => normalizeCode(x?.id) === target)
            || list.find(x => normalizeCode(x?.code) === target)
            || list[0]
            || null;
    }

    const META_REQUEST_TIMEOUT = 8000;
    const META_FETCH_BUDGET_MS = 8000;
    const META_MISS_TTL_MS = 60000;
    const metaMissCache = new Map();

    function getMetaRequestTimeout(deadline) {
        const remaining = Math.max(0, Number(deadline) - Date.now());
        return Math.min(META_REQUEST_TIMEOUT, remaining);
    }

    function getMetaSearchProviderCandidates(avid) {
        const code = String(avid || '').trim().toUpperCase();
        const providers = [];
        const push = (provider) => {
            if (provider && !providers.includes(provider)) providers.push(provider);
        };

        if (/^FC2(?:-|_)?PPV/.test(code) || /^FC2(?:-|_)?\d+/.test(code) || /^FC2PPV/.test(code)) {
            push('FC2PPVDB');
            push('fc2hub');
            push('FC2');
            push('JAV321');
            return providers;
        }
        if (/^HEYZO/.test(code)) {
            push('HEYZO');
            push('JAV321');
            return providers;
        }
        if (/^(CARIB|CARIBBEAN)/.test(code)) {
            push('Caribbeancom');
            push('CaribbeancomPR');
            return providers;
        }
        if (/^(10MU|10MUSUME)/.test(code)) {
            push('10musume');
            return providers;
        }
        if (/^(PACO|PACOPACOMAMA)/.test(code)) {
            push('PACOPACOMAMA');
            return providers;
        }
        if (/^(MURA|MURAMURA)/.test(code)) {
            push('MURAMURA');
            return providers;
        }
        if (/^C0930/.test(code)) push('C0930');
        if (/^H0930/.test(code)) push('H0930');
        if (/^H4610/.test(code)) push('H4610');
        if (/^KIN8/.test(code)) push('KIN8');
        if (/^SOD/.test(code)) push('SOD');
        if (isLikelyMgsAvid(code)) push('MGS');

        push('JavBus');
        push('JAV321');
        push('FANZA');
        push('DUGA');
        return providers;
    }

    function mergeMetaRecords(primary, secondary) {
        const base = normalizeMetaRecord(primary);
        const extra = normalizeMetaRecord(secondary);
        if (!base && !extra) return null;
        if (!base) return extra;
        if (!extra) return base;
        return {
            ...base,
            ...extra,
            genres: extra.genres?.length ? extra.genres : (base.genres || []),
            actors: extra.actors?.length ? extra.actors : (base.actors || []),
            releaseDate: extra.releaseDate || base.releaseDate || ''
        };
    }

    async function fetchMetaDetail(base, rawMeta, deadline) {
        const meta = normalizeMetaRecord(rawMeta);
        if (!meta?.provider || !meta?.id) return meta;
        const needDetail = !(meta.genres?.length);
        if (!needDetail) return meta;
        const timeout = getMetaRequestTimeout(deadline);
        if (timeout <= 0) return meta;
        const infoPayload = await requestJSON(
            `${base}/v1/movies/${encodeURIComponent(meta.provider)}/${encodeURIComponent(meta.id)}`,
            timeout
        );
        const info = normalizeMetaRecord(extractMetaTubeData(infoPayload));
        return mergeMetaRecords(meta, info) || meta;
    }

    async function fetchMetaWithProvider(base, avid, provider, deadline) {
        if (!provider) return null;
        const timeout = getMetaRequestTimeout(deadline);
        if (timeout <= 0) return null;
        const searchPayload = await requestJSON(
            `${base}/v1/movies/search?q=${encodeURIComponent(avid)}&provider=${encodeURIComponent(provider)}`,
            timeout
        );
        const searchResults = extractMetaTubeData(searchPayload);
        const hit = pickMetaSearchHit(searchResults, avid);
        if (!hit) return null;
        return fetchMetaDetail(base, hit, deadline);
    }

    function normalizeMetaBase(value) {
        return String(value || '').trim().replace(/\/+$/, '');
    }

    function getMetaFetchKey(avid, base = config.metatube_url) {
        const normalizedBase = normalizeMetaBase(base);
        const normalizedAvid = normalizeCode(avid);
        return normalizedBase && normalizedAvid ? `${normalizedBase}\n${normalizedAvid}` : '';
    }

    function hasRecentMetaMiss(key, now = Date.now()) {
        if (!key) return false;
        const expiresAt = Number(metaMissCache.get(key) || 0);
        if (expiresAt > now) return true;
        metaMissCache.delete(key);
        return false;
    }

    function rememberMetaMiss(key, now = Date.now()) {
        if (key) metaMissCache.set(key, now + META_MISS_TTL_MS);
    }

    function clearMetaMiss(key) {
        if (key) metaMissCache.delete(key);
    }

    function clearMetaMissCache() {
        metaMissCache.clear();
    }

    async function fetchMeta(avid, seedMeta = null, baseUrl = config.metatube_url) {
        const base = normalizeMetaBase(baseUrl);
        if (!base) return null;
        const deadline = Date.now() + META_FETCH_BUDGET_MS;
        const seed = normalizeMetaRecord(seedMeta);
        let fallback = null;

        if (seed?.provider && seed?.id) {
            const seeded = await fetchMetaDetail(base, seed, deadline);
            if (seeded?.genres?.length) return seeded;
            fallback = mergeMetaRecords(fallback, seeded) || seeded;
        } else if (seed) {
            fallback = mergeMetaRecords(fallback, seed) || seed;
        }

        const providers = getMetaSearchProviderCandidates(avid);
        for (const provider of providers) {
            if (getMetaRequestTimeout(deadline) <= 0) break;
            const hit = await fetchMetaWithProvider(base, avid, provider, deadline);
            if (!hit) continue;
            if (hit?.genres?.length) return mergeMetaRecords(fallback, hit) || hit;
            fallback = mergeMetaRecords(fallback, hit) || hit;
        }

        const timeout = getMetaRequestTimeout(deadline);
        if (timeout <= 0) return fallback;
        const searchPayload = await requestJSON(`${base}/v1/movies/search?q=${encodeURIComponent(avid)}`, timeout);
        const searchResults = extractMetaTubeData(searchPayload);
        const hit = pickMetaSearchHit(searchResults, avid);
        if (!hit) return fallback;
        const detailed = await fetchMetaDetail(base, hit, deadline);
        return mergeMetaRecords(fallback, detailed) || detailed || fallback;
    }

    const META_FETCH_CONCURRENCY = 8;
    const META_FETCH_RETRY_LIMIT = 1;
    const META_FETCH_RETRY_DELAY = 900;
    const META_IMMEDIATE_MARGIN_PX = 1200;
    const META_PREFETCH_MARGIN_PX = 1200;
    const META_IMMEDIATE_SWEEP_DELAY = 32;
    const META_DEFERRED_SWEEP_DELAY = 120;
    const META_DEFERRED_BATCH_SIZE = 16;
    const DECORATE_CONCURRENCY = 8;
    const DECORATE_VISIBLE_LIMIT = 12;
    const DECORATE_BATCH_MIN_SIZE = 8;
    const decorateQueue = [];
    const metaFetchQueue = [];
    const metaInflight = new Map();
    const metaQueuedTasks = new Map();
    const metaDeferredItems = new Set();
    const metaNearViewportItems = new Set();
    let decorateActiveCount = 0;
    let metaFetchActiveCount = 0;
    let metaViewportObserver = null;
    let metaDeferredSweepTimer = null;
    let metaDeferredSweepDueAt = 0;
    let metaSweepEventsBound = false;
    let rescanTimer = null;
    let rescanBudget = 0;
    const COMMANDER_RESCAN_INTERVAL = 700;
    const resourceTrailerCache = new Map();
    const resourceScreenshotCache = new Map();
    const resourceScreenshotInfoCache = new Map();
    const resourceMagnetCache = new Map();
    const resourceMissAVCache = new Map();
    const resourceFalenoCache = new Map();
    const resourceMgsCache = new Map();

    function clearTrailerResourceCaches(avid) {
        const key = normalizeResourceAvid(avid);
        if (!key) return;
        resourceTrailerCache.delete(`${key}::missav-status`);
        resourceTrailerCache.delete(`${key}::dmm-only`);
        resourceMissAVCache.delete(key);
        resourceFalenoCache.delete(key);
        resourceMgsCache.delete(key);
    }

    function clearDetailResourceCaches(avid) {
        const key = normalizeResourceAvid(avid);
        if (!key) return;
        clearTrailerResourceCaches(key);
        resourceScreenshotCache.delete(key);
        resourceScreenshotInfoCache.delete(key);
        resourceMagnetCache.delete(key);
    }

    function getResourceToggleStates(currentConfig = config) {
        return {
            resource_center: currentConfig.resource_center !== false,
            resource_trailer: currentConfig.resource_trailer !== false,
            resource_screenshot: currentConfig.resource_screenshot !== false,
            resource_screenshot_auto: !!currentConfig.resource_screenshot_auto,
            resource_magnet: currentConfig.resource_magnet !== false,
        };
    }

    function syncResourceSettingInputs(container = document.getElementById('jlc-resource-settings')) {
        if (!container) return;
        const toggles = getResourceToggleStates(config);
        Object.entries(toggles).forEach(([key, value]) => {
            const input = container.querySelector('[data-jlc-resource-key="' + key + '"]');
            if (input) input.checked = !!value;
        });
    }

    function syncCommanderConfigInputs() {
        const map = {
            'jlc-i-url': config.emby_url || '',
            'jlc-i-key': config.emby_key || '',
            'jlc-i-mt': config.metatube_url || '',
            'jlc-i-fav': (config.fav_tags || []).join(','),
        };
        Object.entries(map).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        });
        const toggles = {
            'jlc-c-resource-center': config.resource_center !== false,
            'jlc-c-resource-trailer': config.resource_trailer !== false,
            'jlc-c-resource-screenshot': config.resource_screenshot !== false,
            'jlc-c-resource-screenshot-auto': !!config.resource_screenshot_auto,
            'jlc-c-resource-magnet': config.resource_magnet !== false,
        };
        Object.entries(toggles).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.checked = !!value;
        });
        syncResourceSettingInputs();
    }







    function openCommanderPanel(tabId = '') {
        openWorkbenchV3(tabId);
    }

    function closeCommanderPanel() {
        closeWorkbenchV3();
    }

    function toggleCommanderPanel(tabId = '') {
        toggleWorkbenchV3(tabId);
    }

    function getLegacySettingsSchema() {
        const items = [
            { type: 'toggle', key: 'autoPage', label: lang.menu_autoPage },
            { type: 'toggle', key: 'copyBtn', label: lang.menu_copyBtn },
            { type: 'toggle', key: 'toolBar', label: lang.menu_toolBar },
            { type: 'toggle', key: 'halfImg', label: lang.menu_halfImg, disabled: Status.halfImg_block },
            { type: 'toggle', key: 'fullTitle', label: lang.menu_fullTitle },
        ];
        if (['javbus', 'javdb'].includes(currentWeb)) {
            items.push({ type: 'toggle', key: 'avInfo', label: lang.menu_avInfo });
        }
        if (currentWeb === 'javlibrary') {
            items.push({ type: 'toggle', key: 'menutoTop', label: lang.menu_menutoTop });
        }
        items.push({ type: 'range', key: 'columnNum', label: lang.menu_columnNum, value: Status.getColumnNum(), min: 1, max: 8 });
        items.push({ type: 'range', key: 'waterfallWidth', label: '%', value: Status.get('waterfallWidth'), min: 1, max: currentObj?.maxWidth ? currentObj.maxWidth : 100 });
        items.push({ type: 'range', key: 'uiBtnScale', label: lang.menu_uiBtnScale, value: Status.get('uiBtnScale'), min: 70, max: 110, step: 5 });
        items.push({ type: 'button', key: 'downloadPanel', label: '批量下载封面' });
        items.push({ type: 'button', key: 'addHiddenWords', label: '添加屏蔽词' });
        return items;
    }

    const legacySettingHandlers = {
        autoPage() {
            if (scroller) {
                scroller.destroy();
                scroller = null;
                return;
            }
            if ($(currentObj.pageSelector).length) {
                scroller = new ScrollerPlugin($('#grid-b'), lazyLoad);
            }
        },
        copyBtn(enabled = Status.get('copyBtn')) {
            const visible = !!enabled;
            $('#grid-b .copy-span').toggle(visible);
            if (visible) ensureDetailPageCopyButtons();
            else removeDetailPageCopyButtons();
        },
        toolBar() {
            $('#grid-b .toolbar-b').toggle();
        },
        halfImg() {
            $('#grid-b .box-b img.loaded').each(function (_, el) {
                imgCallback(el);
            });
            const columnNum = Status.getColumnNum();
            GM_addStyle(`#grid-b .item-b{ width: ${100 / columnNum}%;}`);
        },
        fullTitle() {
            $('#grid-b a[name="av-title"]').toggleClass('titleNowrap');
        },
        avInfo() {},
        menutoTop() {
            location.reload();
        },
        columnNum(columnNum) {
            GM_addStyle(`#grid-b .item-b{ width: ${100 / columnNum}%;}`);
        },
        waterfallWidth(width) {
            $(currentObj.widthSelector).css({ width: `${width}%`, margin: `${width > 100 ? (100 - width) / 2 + '%' : 'auto'}` });
        },
        uiBtnScale(value) {
            if (typeof applyUiBtnScale === 'function') applyUiBtnScale(value);
        },
        downloadPanel() {
            closeCommanderPanel();
            TabPanel.getInstance().show(0);
        },
        addHiddenWords() {
            closeCommanderPanel();
            TabPanel.getInstance().show(1);
        }
    };





    async function refreshLibraryUI() {
        const [embyItems, videoItems] = await Promise.all([
            getAllFromStore('emby_data'),
            getAllFromStore('videos')
        ]);
        const mCount = embyItems.filter(i => i.type === 'movie').length;
        const pList = embyItems.filter(i => i.type === 'person');
        const vCount = videoItems.length;
        const personCount = knownPersons.size;

        const mEl = document.getElementById('st-m');
        const mElV3 = document.getElementById('jlc-wb-st-m');
        if (mEl) {
            mEl.innerText = mCount;
            const pEl = document.getElementById('st-p');
            const vEl = document.getElementById('st-v');
            if (pEl) pEl.innerText = personCount;
            if (vEl) vEl.innerText = vCount;
        }
        if (mElV3) {
            mElV3.innerText = mCount;
            const pEl = document.getElementById('jlc-wb-st-p');
            const vEl = document.getElementById('jlc-wb-st-v');
            if (pEl) pEl.innerText = personCount;
            if (vEl) vEl.innerText = vCount;
        }
        if (!mEl && !mElV3) return;

        const fillPersonList = (wrap) => {
            if (!wrap) return;
            wrap.innerHTML = '';
            const all = [...new Set([...config.custom_persons, ...pList.map(x => x.name).filter(Boolean)])].sort((a, b) => String(a).localeCompare(String(b), 'zh-Hans-CN'));
            all.slice(0, 300).forEach(name => {
                const div = document.createElement('div');
                div.className = 'person-item';
                div.innerHTML = `<span>👤 ${escapeHtml(name)}</span><span class="remove" data-name="${escapeHtml(name)}">✕</span>`;
                div.querySelector('.remove').onclick = async (e) => {
                    const n = e.target.dataset.name;
                    config.custom_persons = config.custom_persons.filter(x => x !== n);
                    GM_setValue('jlc_config_stable', config);
                    await loadRadarData();
                    await refreshLibraryUI();
                    refreshCommanderDecorations();
                };
                wrap.appendChild(div);
            });
        };
        fillPersonList(document.getElementById('jlc-person-list'));
        fillPersonList(document.getElementById('jlc-wb-person-list'));
    }

    function applyImportedConfig(rawConfig) {
        if (!rawConfig || typeof rawConfig !== 'object') {
            return { ok: false, summary: '备份里没有 config 字段' };
        }
        const next = Object.assign({}, DEFAULT_CONFIG, rawConfig);
        if (Array.isArray(rawConfig.fav_tags)) next.fav_tags = rawConfig.fav_tags.slice();
        if (Array.isArray(rawConfig.custom_persons)) next.custom_persons = rawConfig.custom_persons.slice();
        if (Array.isArray(rawConfig.hate_tags)) next.hate_tags = rawConfig.hate_tags.slice();
        // 原样保留其余未知字段，避免以后扩展丢失
        Object.keys(rawConfig).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(next, key)) next[key] = rawConfig[key];
        });
        config = next;
        GM_setValue('jlc_config_stable', config);
        // 立刻回读校验是否真的写入油猴存储
        const verify = GM_getValue('jlc_config_stable');
        const keyLen = String(verify?.emby_key || '').length;
        const tags = Array.isArray(verify?.fav_tags) ? verify.fav_tags : [];
        return {
            ok: true,
            summary: [
                'Emby: ' + (verify?.emby_url || '（空）'),
                '密钥: ' + (keyLen ? ('已写入 ' + keyLen + ' 位') : '（空）'),
                '心动标签: ' + (tags.length ? tags.join(' / ') : '（空）'),
                'MetaTube: ' + (verify?.metatube_url || '（空）')
            ].join('\n')
        };
    }

    function describeLiveConfig() {
        const live = loadConfig();
        const keyLen = String(live.emby_key || '').length;
        const tags = Array.isArray(live.fav_tags) ? live.fav_tags : [];
        return {
            emby_url: live.emby_url || '',
            emby_key_len: keyLen,
            emby_key_preview: keyLen ? (String(live.emby_key).slice(0, 4) + '…' + String(live.emby_key).slice(-4)) : '',
            fav_tags: tags,
            metatube_url: live.metatube_url || '',
            hate_tags: Array.isArray(live.hate_tags) ? live.hate_tags : []
        };
    }

    /** 本机断点 / 浏览 / 点击数量摘要 */
    async function collectDataIntegrityReport() {
        if (!db) {
            try { await initDB(); } catch (_) { /* ignore */ }
        }
        const tracking = await getAllFromStore(TRACKING_STORE);
        const videos = await getAllFromStore('videos');
        const emby = await getAllFromStore('emby_data');
        const hw = GM_getValue('hiddenWord', statusDefault.hiddenWord) || [];
        const ha = GM_getValue('hiddenAvid', statusDefault.hiddenAvid) || [];
        const compact = (v) => String(v == null ? '' : v).trim();

        const tr = {
            total: tracking.length,
            withTop: 0,
            withSeen: 0,
            withBrowsed: 0,
            withCheck: 0,
            updated: 0,
            latest: 0,
            archived: 0
        };
        let latestBrowsedAt = '';
        let latestBrowsedTitle = '';
        let sampleWithSeen = null;
        tracking.forEach((r) => {
            if (!r || typeof r !== 'object') return;
            if (r.archived) tr.archived += 1;
            const top = compact(r.top_avid);
            const seen = compact(r.last_seen_avid);
            const browsed = compact(r.last_browsed_at);
            if (top) tr.withTop += 1;
            if (seen) tr.withSeen += 1;
            if (browsed) {
                tr.withBrowsed += 1;
                if (!latestBrowsedAt || browsed > latestBrowsedAt) {
                    latestBrowsedAt = browsed;
                    latestBrowsedTitle = compact(r.custom_label || r.group_name || r.title || r.id);
                }
            }
            if (compact(r.check_status)) tr.withCheck += 1;
            if (r.check_status === 'updated') tr.updated += 1;
            if (r.check_status === 'latest') tr.latest += 1;
            if (!sampleWithSeen && seen) {
                sampleWithSeen = {
                    title: compact(r.custom_label || r.group_name || r.title || r.id).slice(0, 40),
                    top_avid: top,
                    last_seen_avid: seen,
                    check_status: compact(r.check_status)
                };
            }
        });

        const vid = {
            total: videos.length,
            clicked: videos.filter((v) => v && v.clicked).length,
            liked: videos.filter((v) => v && v.status === 'like').length,
            hated: videos.filter((v) => v && v.status === 'hate').length
        };
        const em = {
            total: emby.length,
            movies: emby.filter((x) => x && x.type === 'movie').length,
            persons: emby.filter((x) => x && x.type === 'person').length
        };

        const lines = [
            '【本机数据】' + new Date().toLocaleString(),
            '',
            '追更 ' + tr.total + ' · 断点 ' + tr.withSeen + ' · 浏览 ' + tr.withBrowsed
                + ' · updated ' + tr.updated + ' / latest ' + tr.latest,
            latestBrowsedAt ? ('最近浏览：' + latestBrowsedTitle + ' @ ' + latestBrowsedAt) : '最近浏览：（无）',
            sampleWithSeen
                ? ('样例：' + sampleWithSeen.title + ' | 最新 ' + (sampleWithSeen.top_avid || '—')
                    + ' | 断点 ' + (sampleWithSeen.last_seen_avid || '—'))
                : '',
            '',
            '点击 ' + vid.clicked + '/' + vid.total + ' · 心动 ' + vid.liked + ' · 屏蔽片 ' + vid.hated,
            'Emby ' + em.total + '（影片 ' + em.movies + ' / 熟人 ' + em.persons + '）',
            '屏蔽词 ' + (Array.isArray(hw) ? hw.length : 0) + ' · 屏蔽番号 ' + (Array.isArray(ha) ? ha.length : 0)
        ].filter(Boolean);

        return {
            ok: tr.withSeen > 0 && vid.clicked > 0,
            text: lines.join('\n'),
            tracking: tr,
            videos: vid,
            emby: em,
            hiddenWords: Array.isArray(hw) ? hw.length : 0,
            hiddenAvids: Array.isArray(ha) ? ha.length : 0
        };
    }

    async function showDataIntegrityReport() {
        try {
            const report = await collectDataIntegrityReport();
            if (typeof showAlert === 'function') showAlert(report.text, true);
            else alert(report.text);
            try {
                const box = document.getElementById('jlc-wb-data-integrity');
                if (box) {
                    box.hidden = false;
                    box.textContent = report.text;
                }
            } catch (_) { /* ignore */ }
            return report;
        } catch (e) {
            const msg = '检查失败：' + (e?.message || e);
            if (typeof showAlert === 'function') showAlert(msg, true);
            else alert(msg);
            return null;
        }
    }

    function updateWorkbenchConfigDiag() {
        const el = document.getElementById('jlc-wb-config-diag');
        if (!el) return;
        const d = describeLiveConfig();
        el.innerHTML = ''
            + '<div><b>当前脚本实际配置</b></div>'
            + '<div>Emby URL：' + escapeHtml(d.emby_url || '（空）') + '</div>'
            + '<div>Emby 密钥：' + (d.emby_key_len
                ? ('已保存 ' + d.emby_key_len + ' 位（' + escapeHtml(d.emby_key_preview) + '）')
                : '（空）') + '</div>'
            + '<div>心动标签：' + (d.fav_tags.length ? escapeHtml(d.fav_tags.join(' / ')) : '（空）') + '</div>'
            + '<div>MetaTube：' + escapeHtml(d.metatube_url || '（空）') + '</div>'
            + (d.hate_tags.length ? ('<div>屏蔽标签：' + escapeHtml(d.hate_tags.join(' / ')) + '</div>') : '');
    }

    async function putAllInStore(storeName, rows) {
        if (!db) throw new Error('数据库未就绪');
        if (!Array.isArray(rows) || !rows.length) return 0;
        if (!db.objectStoreNames.contains(storeName)) {
            throw new Error('缺少对象仓库 ' + storeName);
        }
        const chunkSize = 150;
        let written = 0;
        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            await new Promise((resolve, reject) => {
                let settled = false;
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                chunk.forEach(row => {
                    try { store.put(row); } catch (e) { /* skip bad row */ }
                });
                tx.oncomplete = () => { if (!settled) { settled = true; resolve(); } };
                tx.onerror = () => { if (!settled) { settled = true; reject(tx.error || new Error(storeName + ' 写入失败')); } };
                tx.onabort = () => { if (!settled) { settled = true; reject(tx.error || new Error(storeName + ' 写入中止')); } };
            });
            written += chunk.length;
            // 让出主线程，避免 50MB 备份卡死页面
            await new Promise(r => setTimeout(r, 0));
        }
        return written;
    }

    /** 列表/界面偏好（含屏蔽词），与 jlc_config_stable 分存，需单独进备份与 WebDAV */
    const STATUS_PREF_SIMPLE_KEYS = [
        'autoPage', 'copyBtn', 'toolBar', 'avInfo', 'halfImg', 'fullTitle',
        'menutoTop', 'hiddenWord', 'hiddenAvid',
        'columnNumFull', 'columnNumHalf'
    ];
    /** 本机专用，不进备份 / WebDAV（按显示器/DPI 各自调） */
    const STATUS_PREF_LOCAL_ONLY_KEYS = ['uiBtnScale'];
    const WATERFALL_SITE_KEYS = ['javlibrary', 'javbus', 'javdb', 'avmoo'];

    function isStatusPrefLocalOnly(key) {
        return STATUS_PREF_LOCAL_ONLY_KEYS.includes(String(key || ''));
    }

    function collectStatusPrefs() {
        const prefs = {};
        STATUS_PREF_SIMPLE_KEYS.forEach((key) => {
            prefs[key] = GM_getValue(key, statusDefault[key]);
        });
        prefs.waterfallWidth_by_site = {};
        const sites = WATERFALL_SITE_KEYS.slice();
        if (typeof currentWeb === 'string' && currentWeb && !sites.includes(currentWeb)) {
            sites.push(currentWeb);
        }
        sites.forEach((site) => {
            const raw = GM_getValue('waterfallWidth_' + site, null);
            if (raw !== null && raw !== undefined) prefs.waterfallWidth_by_site[site] = raw;
        });
        return prefs;
    }

    function applyStatusPrefs(prefs) {
        if (!prefs || typeof prefs !== 'object') {
            return { ok: false, summary: '未包含 status 偏好' };
        }
        STATUS_PREF_SIMPLE_KEYS.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(prefs, key)) {
                GM_setValue(key, prefs[key]);
            }
        });
        // 显式忽略旧 vault 里可能带的本机字段（如 uiBtnScale）
        STATUS_PREF_LOCAL_ONLY_KEYS.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(prefs, key)) {
                /* skip */
            }
        });
        if (prefs.waterfallWidth_by_site && typeof prefs.waterfallWidth_by_site === 'object') {
            Object.keys(prefs.waterfallWidth_by_site).forEach((site) => {
                GM_setValue('waterfallWidth_' + site, prefs.waterfallWidth_by_site[site]);
            });
        }
        // 兼容旧字段：仅当前站 waterfallWidth
        if (prefs.waterfallWidth !== undefined && typeof currentWeb === 'string' && currentWeb) {
            GM_setValue('waterfallWidth_' + currentWeb, prefs.waterfallWidth);
        }
        // 应用列表相关开关（若页面已初始化）；不含 uiBtnScale
        try {
            if (typeof legacySettingHandlers !== 'undefined' && legacySettingHandlers) {
                ['autoPage', 'copyBtn', 'toolBar', 'halfImg', 'fullTitle', 'columnNum', 'waterfallWidth'].forEach((k) => {
                    if (k === 'columnNum') legacySettingHandlers.columnNum?.(Status?.getColumnNum?.() ?? prefs.columnNumFull);
                    else if (k === 'waterfallWidth') {
                        const w = Status?.get?.('waterfallWidth');
                        if (w != null) legacySettingHandlers.waterfallWidth?.(w);
                    } else if (prefs[k] !== undefined) legacySettingHandlers[k]?.(prefs[k]);
                });
            }
        } catch (_) { /* ignore */ }
        try {
            if (typeof refreshCommanderDecorations === 'function') refreshCommanderDecorations();
        } catch (_) { /* ignore */ }
        try {
            if (typeof syncWorkbenchSettingsForm === 'function') syncWorkbenchSettingsForm();
        } catch (_) { /* ignore */ }
        const hw = GM_getValue('hiddenWord', []);
        const ha = GM_getValue('hiddenAvid', []);
        return {
            ok: true,
            summary: '屏蔽词 ' + (Array.isArray(hw) ? hw.length : 0)
                + ' · 屏蔽番号 ' + (Array.isArray(ha) ? ha.length : 0)
                + ' · 列表偏好已恢复（不含本机 UI 缩放）'
        };
    }

    function markStatusPrefsDirty() {
        try {
            if (typeof ensureCreamuSync === 'function') ensureCreamuSync()?.markLocalDirty();
        } catch (_) { /* ignore */ }
    }

    async function buildBackupPayload() {
        return {
            config: loadConfig(),
            status: collectStatusPrefs(),
            videos: await getAllFromStore('videos'),
            emby_data: await getAllFromStore('emby_data'),
            tracking_searches: await getAllFromStore(TRACKING_STORE),
            exported_at: new Date().toISOString(),
            kind: 'full_without_meta_cache'
        };
    }

    async function applyBackupPayload(data, mode) {
        mode = mode === 'config' ? 'config' : 'full';
        if (!data || typeof data !== 'object') throw new Error('invalid backup');
        const rawConfig = data.config && typeof data.config === 'object'
            ? data.config
            : (data.emby_url !== undefined || data.fav_tags !== undefined ? data : null);
        let configResult = { ok: false, summary: '未包含 config' };
        if (rawConfig) configResult = applyImportedConfig(rawConfig);
        else if (mode === 'config' && !(data.status && typeof data.status === 'object')) {
            throw new Error('备份无 config / status');
        }
        // 屏蔽词与列表偏好：config 与 full 都恢复（体积小，且本就应跨机一致）
        let statusResult = { ok: false, summary: '未包含 status' };
        if (data.status && typeof data.status === 'object') {
            statusResult = applyStatusPrefs(data.status);
        }
        syncCommanderConfigInputs();
        if (mode === 'full') {
            if (!db) await initDB();
            if (Array.isArray(data.videos) && data.videos.length) await putAllInStore('videos', data.videos);
            if (Array.isArray(data.emby_data) && data.emby_data.length) await putAllInStore('emby_data', data.emby_data);
            if (Array.isArray(data.tracking_searches) && data.tracking_searches.length) {
                await putAllInStore(TRACKING_STORE, data.tracking_searches);
            }
            await loadRadarData();
            await refreshLibraryUI();
            refreshCommanderDecorations();
            await renderTrackingUI();
            void refreshWorkbenchFabBadge();
        }
        if (statusResult.ok) {
            configResult = {
                ok: configResult.ok || statusResult.ok,
                summary: [configResult.summary, statusResult.summary].filter(Boolean).join('\n')
            };
        }
        return configResult;
    }

    async function exportBackup() {
        const data = await buildBackupPayload();
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `jlc_commander_backup_${new Date().toLocaleDateString()}.json`;
        a.click();
        showAlert('完整备份已导出（含屏蔽词/显示偏好，不含 meta_cache）。');
    }

    async function exportConfigOnly() {
        const data = {
            config: loadConfig(),
            status: collectStatusPrefs(),
            exported_at: new Date().toISOString(),
            kind: 'config_only'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `jlc_config_only_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        showAlert('已导出「仅配置」小文件（含 Emby/心动标签/屏蔽词/显示偏好）。');
    }

    function revealImportedConfigInUi() {
        openCommanderPanel('filter');
        try { setWorkbenchSettingsOpen(false); } catch (_) { /* ignore */ }
        try { syncWorkbenchSettingsForm(); } catch (_) { /* ignore */ }
        try { updateWorkbenchConfigDiag(); } catch (_) { /* ignore */ }
    }

    async function importBackup(options = {}) {
        const mode = options.mode === 'full' ? 'full' : 'config'; // 默认只导配置，最稳
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.json,application/json';
        inp.onchange = (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const mb = Math.round(file.size / 1024 / 1024 * 10) / 10;
            showAlert('正在读取备份（' + mb + ' MB，模式：' + (mode === 'full' ? '完整' : '仅配置') + '）…');
            const reader = new FileReader();
            reader.onerror = () => showAlert('读取备份文件失败。', true);
            reader.onload = async (re) => {
                let data;
                try {
                    data = JSON.parse(re.target.result);
                } catch (err) {
                    showAlert('JSON 解析失败：' + (err?.message || err) + '\n若文件约 50MB，请改用「仅导入配置」或先用旧脚本导出一份 config。', true);
                    return;
                }
                if (!data || typeof data !== 'object') {
                    showAlert('备份格式不对：根节点不是对象。', true);
                    return;
                }

                // 兼容：有人只保存了扁平 config 对象
                const rawConfig = data.config && typeof data.config === 'object'
                    ? data.config
                    : (data.emby_url !== undefined || data.fav_tags !== undefined ? data : null);

                let configResult = { ok: false, summary: '未包含 config' };
                if (rawConfig) {
                    configResult = applyImportedConfig(rawConfig);
                } else if (mode === 'config' && !(data.status && typeof data.status === 'object')) {
                    showAlert('这个文件里没有 config（也没有 emby_url/fav_tags 字段），也无法恢复 status 偏好。', true);
                    return;
                }

                let statusResult = { ok: false, summary: '未包含 status' };
                if (data.status && typeof data.status === 'object') {
                    statusResult = applyStatusPrefs(data.status);
                    if (statusResult.ok) {
                        configResult = {
                            ok: configResult.ok || true,
                            summary: [configResult.summary, statusResult.summary].filter(Boolean).join('\n')
                        };
                    }
                }

                // 配置成功后立刻展示诊断；有屏蔽词时优先打开「过滤」
                syncCommanderConfigInputs();
                revealImportedConfigInUi();

                const storeStats = [];
                if (mode === 'full') {
                    try {
                        if (!db) await initDB();
                        if (!db) throw new Error('IndexedDB 不可用');
                        if (Array.isArray(data.videos) && data.videos.length) {
                            storeStats.push('videos ' + (await putAllInStore('videos', data.videos)));
                        }
                        if (Array.isArray(data.emby_data) && data.emby_data.length) {
                            storeStats.push('emby ' + (await putAllInStore('emby_data', data.emby_data)));
                        }
                        if (Array.isArray(data.tracking_searches) && data.tracking_searches.length) {
                            storeStats.push('tracking ' + (await putAllInStore(TRACKING_STORE, data.tracking_searches)));
                        }
                        // meta_cache：可再生缓存，导出已不再包含；旧备份里若仍有则一律忽略
                        if (Array.isArray(data.meta_cache) && data.meta_cache.length) {
                            storeStats.push('meta 已忽略(' + data.meta_cache.length + '，缓存可运行时重建)');
                        }
                    } catch (err) {
                        const live = describeLiveConfig();
                        showAlert(
                            '配置已尝试写入：\n' + (configResult.summary || '')
                            + '\n\n回读心动：' + (live.fav_tags.join(' / ') || '空')
                            + '\n回读密钥：' + (live.emby_key_len ? (live.emby_key_len + ' 位') : '空')
                            + '\n\n数据库导入中断：' + (err?.message || err),
                            true
                        );
                        return;
                    }
                    await loadRadarData();
                    await refreshLibraryUI();
                    refreshCommanderDecorations();
                    await renderTrackingUI();
                    void refreshWorkbenchFabBadge();
                }

                revealImportedConfigInUi();
                const live = describeLiveConfig();
                const looksDefault = isLikelyFreshDefaultConfig(loadConfig());
                showAlert(
                    (mode === 'config' ? '【仅配置】导入完成\n\n' : '【完整】导入完成\n\n')
                    + configResult.summary + '\n\n'
                    + (storeStats.length ? ('库写入：' + storeStats.join('，') + '\n\n') : '')
                    + '—— 回读校验（以这里为准）——\n'
                    + '心动标签：' + (live.fav_tags.join(' / ') || '（空）') + '\n'
                    + '密钥：' + (live.emby_key_len ? (live.emby_key_len + ' 位 ' + live.emby_key_preview) : '（空）') + '\n'
                    + 'Emby：' + (live.emby_url || '（空）') + '\n\n'
                    + (looksDefault
                        ? '⚠ 回读仍像默认空配置：请确认导入的是旧脚本导出的备份，且文件里 config.fav_tags 不是默认那串。'
                        : '✓ 回读已不是默认空配置。密钥框为空是正常的（已保存则占位提示），请看上方诊断区。'),
                    true
                );
            };
            reader.readAsText(file, 'utf-8');
        };
        inp.click();
    }

    function isPlaceholderCover(src, title = '') {
        const sample = `${String(src || '')} ${String(title || '')}`.toLowerCase();
        return /(now[\s_-]*printing|nowprint|no[\s_-]*image|nopic|placeholder|sample[\s_-]*soon|coming[\s_-]*soon)/i.test(sample);
    }

    function applyLoadedCoverStyle(img) {
        $(img).removeClass('minHeight-200 minHeight-96');
        if (img.classList.contains('jlc-placeholder-cover')) {
            img.style = 'width:auto;max-width:72%;max-height:120px;height:auto;margin:12px auto;object-fit:contain;';
            return;
        }
        imgCallback(img);
    }

    function scheduleCommanderRescan(rounds = 10) {
        rescanBudget = Math.max(rescanBudget, rounds);
        if (rescanTimer) return;
        rescanTimer = window.setInterval(() => {
            runCommanderScanner();
            rescanBudget -= 1;
            if (rescanBudget <= 0) {
                window.clearInterval(rescanTimer);
                rescanTimer = null;
            }
        }, COMMANDER_RESCAN_INTERVAL);
    }

    function collectCommanderItems(source) {
        if (!source) return [];
        if (Array.isArray(source)) return source.flatMap(collectCommanderItems);
        if (typeof source.jquery === 'string' && typeof source.toArray === 'function') {
            return source.toArray().flatMap(collectCommanderItems);
        }
        if (typeof source.length === 'number'
            && typeof source !== 'string'
            && !source.nodeType
            && typeof source.matches !== 'function'
            && typeof source.querySelectorAll !== 'function') {
            return Array.from(source).flatMap(collectCommanderItems);
        }
        const grid = typeof document !== 'undefined' && source === document
            ? document.getElementById('grid-b')
            : (source.id === 'grid-b' ? source : null);
        if (grid?.children) {
            return Array.from(grid.children).filter(item => item.matches?.('.item-b'));
        }
        if (typeof source.matches === 'function' && source.matches('.item-b')) return [source];
        if (typeof source.querySelectorAll === 'function') return Array.from(source.querySelectorAll('.item-b'));
        return [];
    }
    function isRectNearViewport(rect, viewportHeight, margin = META_PREFETCH_MARGIN_PX) {
        if (!rect) return true;
        return Number(rect.bottom) >= -margin && Number(rect.top) <= Number(viewportHeight || 0) + margin;
    }

    function isItemNearViewport(item, margin = META_PREFETCH_MARGIN_PX) {
        if (!item || typeof item.getBoundingClientRect !== 'function') return true;
        const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 900;
        return isRectNearViewport(item.getBoundingClientRect(), viewportHeight, margin);
    }

    function isItemImmediateViewport(item) {
        return isItemNearViewport(item, META_IMMEDIATE_MARGIN_PX);
    }

    function getRectViewportPriority(rect, viewportHeight) {
        if (!rect) return 0;
        const height = Number(viewportHeight) || 900;
        const top = Number(rect.top);
        const bottom = Number(rect.bottom);
        if (Number.isFinite(bottom) && bottom < 0) return height + Math.abs(bottom);
        if (Number.isFinite(top) && top > height) return top;
        return Number.isFinite(top) ? Math.max(0, top) : 0;
    }

    function getItemViewportPriority(item) {
        if (!item || typeof item.getBoundingClientRect !== 'function') return 0;
        const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 900;
        return getRectViewportPriority(item.getBoundingClientRect(), viewportHeight);
    }

    function sortMetaItemsByViewport(items) {
        return Array.from(items || [])
            .map((item, index) => ({ item, index, priority: getItemViewportPriority(item) }))
            .sort((left, right) => left.priority - right.priority || left.index - right.index)
            .map(entry => entry.item);
    }

    function clearDeferredMetaItem(item) {
        if (!item) return;
        metaDeferredItems.delete(item);
        metaNearViewportItems.delete(item);
        if (metaViewportObserver) metaViewportObserver.unobserve(item);
        delete item._jlcMetaPending;
    }

    function flushDeferredMetaItems(force = false) {
        metaDeferredSweepTimer = null;
        metaDeferredSweepDueAt = 0;
        const candidatePool = force || !metaViewportObserver
            ? metaDeferredItems
            : metaNearViewportItems;
        const candidates = sortMetaItemsByViewport(candidatePool);
        let processed = 0;
        for (const item of candidates) {
            if (!item?.isConnected) {
                clearDeferredMetaItem(item);
                continue;
            }
            const pending = item._jlcMetaPending;
            if (!pending) {
                clearDeferredMetaItem(item);
                continue;
            }
            if (!force && !isItemNearViewport(item)) {
                metaNearViewportItems.delete(item);
                continue;
            }
            if (!force && processed >= META_DEFERRED_BATCH_SIZE) break;
            clearDeferredMetaItem(item);
            requestMetaEnrichment(item, pending.avid, pending.title, isItemImmediateViewport(item));
            processed += 1;
        }
        if (!force && processed >= META_DEFERRED_BATCH_SIZE && metaDeferredItems.size) {
            scheduleDeferredMetaSweep(META_IMMEDIATE_SWEEP_DELAY);
        }
    }

    function scheduleDeferredMetaSweep(delay = META_DEFERRED_SWEEP_DELAY) {
        const wait = Math.max(0, Number(delay) || 0);
        const dueAt = Date.now() + wait;
        if (metaDeferredSweepTimer) {
            if (dueAt >= metaDeferredSweepDueAt) return;
            window.clearTimeout(metaDeferredSweepTimer);
        }
        metaDeferredSweepDueAt = dueAt;
        metaDeferredSweepTimer = window.setTimeout(() => flushDeferredMetaItems(false), wait);
    }

    function ensureMetaViewportObserver() {
        if (metaViewportObserver || !('IntersectionObserver' in window)) return;
        metaViewportObserver = new IntersectionObserver(entries => {
            let touched = false;
            entries.forEach(entry => {
                if (!entry?.target) return;
                const near = entry.isIntersecting || entry.intersectionRatio > 0;
                if (near) {
                    metaNearViewportItems.add(entry.target);
                    touched = true;
                } else {
                    metaNearViewportItems.delete(entry.target);
                }
            });
            if (touched) scheduleDeferredMetaSweep(META_IMMEDIATE_SWEEP_DELAY);
        }, {
            root: null,
            rootMargin: `${META_PREFETCH_MARGIN_PX}px 0px ${META_PREFETCH_MARGIN_PX}px 0px`,
            threshold: 0.01
        });
    }

    function bindMetaSweepEvents() {
        if (metaSweepEventsBound) return;
        metaSweepEventsBound = true;
        const trigger = () => scheduleDeferredMetaSweep();
        window.addEventListener('scroll', trigger, { passive: true });
        window.addEventListener('resize', trigger, { passive: true });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) scheduleDeferredMetaSweep(60);
        });
    }

    function scheduleMetaEnrichment(item, avid, title) {
        if (!item || !item.isConnected || !config.metatube_url) return;
        item.dataset.jlcMetaState = 'deferred';
        item._jlcMetaPending = { avid, title };
        metaDeferredItems.add(item);
        ensureMetaViewportObserver();
        bindMetaSweepEvents();
        if (metaViewportObserver) metaViewportObserver.observe(item);
        const delay = metaViewportObserver
            ? META_DEFERRED_SWEEP_DELAY
            : (isItemImmediateViewport(item) ? META_IMMEDIATE_SWEEP_DELAY : META_DEFERRED_SWEEP_DELAY);
        scheduleDeferredMetaSweep(delay);
    }

    function refreshCommanderDecorations(scope = document, options = {}) {
        if (options.clearMetaMisses) clearMetaMissCache();
        const items = collectCommanderItems(scope);
        items.forEach(item => {
            item.classList.remove('jlc-final-done');
            clearDeferredMetaItem(item);
            delete item.dataset.jlcQueued;
            delete item.dataset.jlcBaseDone;
            delete item.dataset.jlcMetaState;
            delete item.dataset.jlcMetaRetry;
            delete item._jlcDecorModel;
        });
        queueCommanderItems(items, true);
        if (items.length && options.scheduleRescan !== false) scheduleCommanderRescan(8);
        if (options.syncTracking !== false) scheduleTrackingPageRefresh(false);
    }
    function enqueueStablePriority(queue, item, prioritized, isPrioritized) {
        if (!prioritized) {
            queue.push(item);
            return;
        }
        const index = queue.findIndex(entry => !isPrioritized(entry));
        if (index < 0) queue.push(item);
        else queue.splice(index, 0, item);
    }

    function prioritizeMetaTask(key) {
        const task = metaQueuedTasks.get(key);
        if (!task) return;
        const index = metaFetchQueue.indexOf(task);
        if (index >= 0) {
            metaFetchQueue.splice(index, 1);
            task.prioritized = true;
            enqueueStablePriority(metaFetchQueue, task, true, entry => entry.prioritized);
        }
    }

    function pumpMetaFetchQueue() {
        while (metaFetchActiveCount < META_FETCH_CONCURRENCY && metaFetchQueue.length) {
            const task = metaFetchQueue.shift();
            if (!task) continue;
            metaQueuedTasks.delete(task.key);
            metaFetchActiveCount += 1;
            Promise.resolve().then(async () => {
                const cached = normalizeMetaRecord(await getVal('meta_cache', task.avid));
                if (cached?.genres?.length) return cached;
                const fresh = normalizeMetaRecord(await fetchMeta(task.avid, cached, task.base));
                if (fresh) {
                    await setVal('meta_cache', { avid: task.avid, ...fresh });
                    return fresh;
                }
                return cached;
            }).catch(err => {
                console.warn('[Commander] MetaTube 获取失败', task.avid, err);
                return null;
            }).then(task.resolve).finally(() => {
                metaFetchActiveCount -= 1;
                pumpMetaFetchQueue();
            });
        }
    }

    function hasMetaEnrichmentData(value) {
        const meta = normalizeMetaRecord(value);
        return !!(meta && (meta.genres?.length || meta.actors?.length || meta.releaseDate));
    }

    function queueMetaFetch(avid, prioritize = false) {
        const base = normalizeMetaBase(config.metatube_url);
        const key = getMetaFetchKey(avid, base);
        if (!key) return Promise.resolve(null);
        if (metaInflight.has(key)) {
            if (prioritize) prioritizeMetaTask(key);
            return metaInflight.get(key);
        }
        if (hasRecentMetaMiss(key)) return Promise.resolve(null);
        const promise = new Promise(resolve => {
            const task = { key, base, avid, resolve, prioritized: !!prioritize };
            enqueueStablePriority(metaFetchQueue, task, prioritize, entry => entry.prioritized);
            metaQueuedTasks.set(key, task);
            pumpMetaFetchQueue();
        }).then(result => {
            if (hasMetaEnrichmentData(result)) clearMetaMiss(key);
            else rememberMetaMiss(key);
            return result;
        }).finally(() => {
            metaInflight.delete(key);
            metaQueuedTasks.delete(key);
        });
        metaInflight.set(key, promise);
        return promise;
    }
    function setItemReleaseDate(item, dateText) {
        const anchor = item.querySelector('.avid-link-b') || item.querySelector('.info-bottom-one a');
        if (!anchor) return;
        let badge = anchor.querySelector('.avid-date-badge');
        const value = normalizeReleaseDate(dateText);
        if (!value) {
            if (badge && !badge.textContent?.trim()) badge.remove();
            return;
        }
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'avid-date-badge';
            anchor.appendChild(badge);
        }
        badge.textContent = value;
        badge.title = value;
    }

    function getOrCreateBadgeContainer(item) {
        let badgeBox = item.querySelector('.jlc-badge-container');
        if (!badgeBox) {
            badgeBox = document.createElement('div');
            badgeBox.className = 'jlc-badge-container';
            item.appendChild(badgeBox);
        }
        return badgeBox;
    }

    function updateItemStateClasses(item, current, inEmby) {
        item.classList.toggle('visited-item', !!current.clicked);
        item.classList.toggle('liked-item', current.status === 'like');
        item.classList.toggle('hated-item', current.status === 'hate');
        item.classList.toggle('emby-item', !!inEmby);
    }

    function ensureCommanderToolbar(item, current) {
        const toolbar = item.querySelector('.toolbar-b');
        if (!toolbar) return;

        let likeBtn = toolbar.querySelector('.jlc-tool-btn.j-l');
        let hateBtn = toolbar.querySelector('.jlc-tool-btn.j-h');
        let bookmarkBtn = toolbar.querySelector('.jlc-tool-btn.j-bm');
        if (!likeBtn) {
            likeBtn = document.createElement('span');
            likeBtn.className = 'jlc-tool-btn j-l';
            likeBtn.title = '心动 / 取消心动';
            likeBtn.textContent = '👍';
            likeBtn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                current.status = current.status === 'like' ? 'none' : 'like';
                await setVal('videos', current);
                updateItemStateClasses(item, current, item.classList.contains('emby-item'));
                ensureCommanderToolbar(item, current);
                renderCommanderBadges(item, item._jlcDecorModel || { matchedRadar: '', orderedTags: [] });
            };
            toolbar.appendChild(likeBtn);
        }
        if (!hateBtn) {
            hateBtn = document.createElement('span');
            hateBtn.className = 'jlc-tool-btn j-h';
            hateBtn.title = '屏蔽 / 取消屏蔽';
            hateBtn.textContent = '👎';
            hateBtn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                current.status = current.status === 'hate' ? 'none' : 'hate';
                await setVal('videos', current);
                updateItemStateClasses(item, current, item.classList.contains('emby-item'));
                ensureCommanderToolbar(item, current);
            };
            toolbar.appendChild(hateBtn);
        }
        if (!bookmarkBtn) {
            bookmarkBtn = document.createElement('span');
            bookmarkBtn.className = 'jlc-tool-btn j-bm';
            bookmarkBtn.title = '把这部设为追更断点';
            bookmarkBtn.textContent = '🔖';
            bookmarkBtn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await setTrackingBreakpointByItem(item);
            };
            toolbar.appendChild(bookmarkBtn);
        }
        const activeBookmark = normalizeCode(trackingPageState.record?.last_seen_avid || '') === normalizeCode(item.dataset.jlcAvid || '');
        likeBtn.classList.toggle('active-like', current.status === 'like');
        hateBtn.classList.toggle('active-hate', current.status === 'hate');
        bookmarkBtn.classList.toggle('active-bookmark', !!activeBookmark);
    }

    function markItemVisited(item, current) {
        if (current.clicked) {
            item.classList.add('visited-item');
            return;
        }
        current.clicked = true;
        item.classList.add('visited-item');
        item._jlcCurrentVideo = current;
        setVal('videos', current);
    }

    function markItemVisitedByItem(item) {
        if (!item) return;
        const avid = item.dataset.jlcAvid || item.querySelector('date[name="avid"]')?.innerText.trim().toUpperCase();
        if (!avid) return;
        const current = item._jlcCurrentVideo || { avid, clicked: false, status: 'none' };
        item._jlcCurrentVideo = current;
        item.dataset.jlcAvid = avid;
        markItemVisited(item, current);
    }

    function ensureVisitedBinding(item, current) {
        if (current.clicked) item.classList.add('visited-item');
        if (item.dataset.jlcVisitedBound === '1') return;
        item.dataset.jlcVisitedBound = '1';
        const mark = () => markItemVisited(item, current);
        item.querySelectorAll('a[href]').forEach(a => {
            a.addEventListener('pointerdown', mark, { passive: true });
            a.addEventListener('auxclick', mark, { passive: true });
            a.addEventListener('click', mark);
            a.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') mark();
            });
        });
    }

    function pushDecorTag(target, seen, text, hot) {
        const cleaned = String(text || '').trim();
        const key = normalizeTagText(cleaned);
        if (!cleaned || !key || seen.has(key)) return;
        seen.add(key);
        target.push({ text: cleaned, hot: !!hot });
    }

    function buildCommanderDecorationModel(title, meta) {
        const safeTitle = String(title || '');
        const seen = new Set();
        const hotTags = [];
        const coldTags = [];
        const titleHotKeywords = (config.fav_tags || []).filter(tag => tagMatches(safeTitle, tag));
        let matchedRadar = Array.from(knownPersons).find(name => name && safeTitle.includes(name)) || '';

        if (meta) {
            asTextList(meta.actors).forEach(actor => {
                const name = String(actor || '').trim();
                if (!matchedRadar && knownPersons.has(name)) matchedRadar = name;
            });

            let hotMetaCount = 0;
            asTextList(meta.genres).forEach(genre => {
                const isHot = (config.fav_tags || []).some(tag => tagMatches(genre, tag));
                if (isHot) {
                    hotMetaCount += 1;
                    pushDecorTag(hotTags, seen, genre, true);
                } else {
                    pushDecorTag(coldTags, seen, genre, false);
                }
            });

            if (hotMetaCount === 0) {
                titleHotKeywords.forEach(tag => pushDecorTag(hotTags, seen, tag, true));
            }
        } else {
            titleHotKeywords.forEach(tag => pushDecorTag(hotTags, seen, tag, true));
        }

        return {
            matchedRadar,
            orderedTags: hotTags.concat(coldTags)
        };
    }

    function fillCommanderBadgeContainer(badgeBox, model) {
        if (!badgeBox) return;
        const safeModel = model || { matchedRadar: '', orderedTags: [] };
        const orderedTags = Array.isArray(safeModel.orderedTags) ? safeModel.orderedTags : [];
        badgeBox.innerHTML = '';

        if (safeModel.matchedRadar) {
            const badge = document.createElement('span');
            badge.className = 'jlc-badge b-person';
            badge.innerText = `👤 熟人: ${safeModel.matchedRadar}`;
            badgeBox.appendChild(badge);
        }

        if (orderedTags.length) {
            const overlay = document.createElement('div');
            overlay.className = 'meta-overlay-box';
            const visibleTags = orderedTags.slice(0, DECORATE_VISIBLE_LIMIT);
            visibleTags.forEach(tag => {
                const span = document.createElement('span');
                span.className = `meta-tag ${tag.hot ? 'hot' : ''}`.trim();
                span.innerText = tag.text;
                span.title = tag.text;
                overlay.appendChild(span);
            });
            if (orderedTags.length > visibleTags.length) {
                const more = document.createElement('span');
                more.className = 'meta-tag more';
                more.innerText = `+${orderedTags.length - visibleTags.length}`;
                more.title = orderedTags.slice(visibleTags.length).map(x => x.text).join(' / ');
                overlay.appendChild(more);
            }
            badgeBox.appendChild(overlay);
        }
    }

    function renderCommanderBadges(item, model) {
        item._jlcDecorModel = model;
        const badgeBox = getOrCreateBadgeContainer(item);
        fillCommanderBadgeContainer(badgeBox, model);
    }

    function getDetailCoverDecorationMount(context = getCurrentDetailContext()) {
        if (!context) return null;
        const site = String(context.site || '').toLowerCase();
        if (site === 'javlibrary') {
            return document.querySelector('#video_jacket')
                || document.querySelector('#video_jacket_img')?.closest('a')
                || document.querySelector('#video_jacket_img')?.parentElement
                || null;
        }
        if (site === 'javbus') {
            return document.querySelector('.bigImage')
                || document.querySelector('.screencap')
                || document.querySelector('.sample-box')
                || null;
        }
        if (site === 'javdb') {
            return document.querySelector('.column-video-cover')
                || document.querySelector('.video-cover')
                || document.querySelector('.tile-images.preview-images')
                || null;
        }
        return null;
    }

    function ensureDetailBadgeContainer(context = getCurrentDetailContext()) {
        const mount = getDetailCoverDecorationMount(context);
        if (!mount) return null;
        mount.classList.add('jlc-detail-cover-host');
        let badgeBox = mount.querySelector(':scope > .jlc-badge-container.jlc-detail-badge-container');
        if (!badgeBox) {
            badgeBox = document.createElement('div');
            badgeBox.className = 'jlc-badge-container jlc-detail-badge-container';
            mount.appendChild(badgeBox);
        }
        return badgeBox;
    }

    function renderDetailCommanderBadges(context, model) {
        const badgeBox = ensureDetailBadgeContainer(context);
        if (!badgeBox) return;
        fillCommanderBadgeContainer(badgeBox, model);
    }

    async function decorateCurrentDetailPage(prioritize = true) {
        const context = getCurrentDetailContext();
        if (!context?.avid) return null;
        const cachedMeta = normalizeMetaRecord(await getVal('meta_cache', context.avid));
        syncDetailReleaseBadge(context, cachedMeta?.releaseDate || '');
        renderDetailCommanderBadges(context, buildCommanderDecorationModel(context.title, cachedMeta));
        if (!config.metatube_url) return cachedMeta;
        if (cachedMeta?.genres?.length) return cachedMeta;
        const freshMeta = normalizeMetaRecord(await queueMetaFetch(context.avid, prioritize));
        const latestContext = getCurrentDetailContext();
        if (!freshMeta || normalizeResourceAvid(latestContext?.avid || '') !== normalizeResourceAvid(context.avid)) {
            return freshMeta || cachedMeta;
        }
        syncDetailReleaseBadge(latestContext, freshMeta.releaseDate || '');
        renderDetailCommanderBadges(latestContext, buildCommanderDecorationModel(latestContext.title || context.title, freshMeta));
        return freshMeta;
    }

    function requestMetaEnrichment(item, avid, title, prioritize = false) {
        if (!item || !item.isConnected || !config.metatube_url || item.dataset.jlcMetaState === 'pending') return;
        clearDeferredMetaItem(item);
        const currentRetry = Number(item.dataset.jlcMetaRetry || '0');
        item.dataset.jlcMetaState = 'pending';
        queueMetaFetch(avid, prioritize).then(freshMeta => {
            if (!item.isConnected) return;
            if (freshMeta) {
                setItemReleaseDate(item, freshMeta.releaseDate);
                renderCommanderBadges(item, buildCommanderDecorationModel(title, freshMeta));
                item.dataset.jlcMetaState = 'done';
                delete item.dataset.jlcMetaRetry;
                item.classList.add('jlc-final-done');
                return;
            }

            const nextRetry = currentRetry + 1;
            item.dataset.jlcMetaRetry = String(nextRetry);
            if (nextRetry >= META_FETCH_RETRY_LIMIT) {
                item.dataset.jlcMetaState = 'miss';
                item.classList.add('jlc-final-done');
                return;
            }

            item.dataset.jlcMetaState = 'retry';
            window.setTimeout(() => {
                if (!item.isConnected) return;
                item.classList.remove('jlc-final-done');
                delete item.dataset.jlcQueued;
                scheduleCommanderRescan(2);
            }, META_FETCH_RETRY_DELAY * nextRetry);
        });
    }

    function getCommanderItemAvid(item) {
        return String(
            item?.dataset?.jlcAvid
            || item?.querySelector?.('date[name="avid"]')?.textContent
            || ''
        ).trim().toUpperCase();
    }

    async function loadCommanderDecorationBatch(avids) {
        const normalizedAvids = Array.from(new Set(
            Array.from(avids || []).map(avid => String(avid || '').trim().toUpperCase()).filter(Boolean)
        ));
        const [videos, embyData, metaCache] = await Promise.all([
            getManyFromStore('videos', normalizedAvids),
            getManyFromStore('emby_data', normalizedAvids.map(avid => `vid_${avid}`)),
            getManyFromStore('meta_cache', normalizedAvids)
        ]);
        return { videos, embyData, metaCache };
    }

    async function decorate(item) {
        if (!item || !item.isConnected || item.classList.contains('jlc-final-done')) return;
        const preparedAvid = item._jlcDecorAvid;
        const batchPromise = item._jlcDecorBatchPromise;
        delete item._jlcDecorAvid;
        delete item._jlcDecorBatchPromise;
        const avid = preparedAvid || getCommanderItemAvid(item);
        if (!avid) return;

        let vidData;
        let inEmby;
        let cachedMeta;
        if (batchPromise) {
            const batch = await batchPromise;
            vidData = batch.videos.get(avid) || null;
            inEmby = batch.embyData.get(`vid_${avid}`) || null;
            cachedMeta = batch.metaCache.get(avid) || null;
        } else {
            [vidData, inEmby, cachedMeta] = await Promise.all([
                getVal('videos', avid),
                getVal('emby_data', `vid_${avid}`),
                getVal('meta_cache', avid)
            ]);
        }

        const current = vidData || { avid, clicked: false, status: 'none' };
        const title = item.querySelector("a[name='av-title']")?.getAttribute('title') || item.querySelector('.detail-b a')?.getAttribute('title') || '';
        const normalizedMeta = normalizeMetaRecord(cachedMeta);

        item._jlcCurrentVideo = current;
        item.dataset.jlcAvid = avid;
        item.dataset.jlcTitle = title;
        updateItemStateClasses(item, current, inEmby);
        ensureCommanderToolbar(item, current);
        ensureVisitedBinding(item, current);
        setItemReleaseDate(item, normalizedMeta?.releaseDate);
        renderCommanderBadges(item, buildCommanderDecorationModel(title, normalizedMeta));
        item.dataset.jlcBaseDone = '1';
        item.classList.add('jlc-final-done');

        if (!config.metatube_url) {
            item.dataset.jlcMetaState = 'disabled';
            return;
        }

        if (normalizedMeta?.genres?.length) {
            item.dataset.jlcMetaState = 'done';
            delete item.dataset.jlcMetaRetry;
            return;
        }
        scheduleMetaEnrichment(item, avid, title);
    }

    function queueDecorateItem(item, prioritize = false) {
        if (!item || !item.isConnected || item.dataset.jlcQueued === '1' || item.classList.contains('jlc-final-done')) return;
        item.dataset.jlcQueued = '1';
        item._jlcDecorPrioritized = prioritize === true;
        enqueueStablePriority(decorateQueue, item, prioritize, entry => entry._jlcDecorPrioritized === true);
        pumpDecorateQueue();
    }

    function queueCommanderItems(items, prioritize = false) {
        const entries = Array.from(items || [])
            .filter(item => item?.isConnected
                && item.dataset?.jlcQueued !== '1'
                && !item.classList?.contains('jlc-final-done'))
            .map(item => ({ item, avid: getCommanderItemAvid(item) }));
        const avids = entries.map(entry => entry.avid).filter(Boolean);
        const batchPromise = avids.length >= DECORATE_BATCH_MIN_SIZE
            ? loadCommanderDecorationBatch(avids)
            : null;
        entries.forEach(entry => {
            if (entry.avid) entry.item._jlcDecorAvid = entry.avid;
            if (entry.avid && batchPromise) entry.item._jlcDecorBatchPromise = batchPromise;
            queueDecorateItem(entry.item, prioritize);
        });
        return entries.length;
    }

    function pumpDecorateQueue() {
        while (decorateActiveCount < DECORATE_CONCURRENCY && decorateQueue.length) {
            const item = decorateQueue.shift();
            if (!item) continue;
            delete item._jlcDecorPrioritized;
            if (!item.isConnected) continue;
            decorateActiveCount += 1;
            Promise.resolve().then(() => decorate(item)).catch(err => {
                console.warn('[Commander] decorate failed', err);
            }).finally(() => {
                decorateActiveCount -= 1;
                delete item.dataset.jlcQueued;
                pumpDecorateQueue();
            });
        }
    }

    function runCommanderScanner(root = document, prioritize = false) {
        const items = collectCommanderItems(root);
        const queuedCount = queueCommanderItems(items, prioritize);
        if (queuedCount) scheduleTrackingPageRefresh(false);
        return queuedCount;
    }
