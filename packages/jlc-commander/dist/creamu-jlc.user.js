// ==UserScript==
// @name         Creamu · JavLibrary
// @name:zh-CN   Creamu · JavLibrary
// @namespace    https://github.com/wayneze/Creamu
// @version      3.8.1
// @description  Creamu：JavLibrary 奶油工作台；WebDAV 同步；追更 / Emby / 备份
// @author       wayneze
// @include      *javbus.com/*
// @include      *javdb.com/*
// @include      *avmoo.cyou/*
// @include      *javlibrary.com/*
// @include      /^.*(javbus|busjav|busfan|fanbus|buscdn|cdnbus|dmmsee|seedmm|busdmm|dmmbus|javsee|seejav)\..*$/
// @include      /^.*(javdb)[0-9]*\..*$/
// @include      /^.*(avmoo)\..*$/
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_download
// @grant        GM_setClipboard
// @connect      *
// @run-at       document-end
// ==/UserScript==

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
// @@creamu-part:12-resource-services
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
// @@creamu-part:13-settings-bridge
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
// @@creamu-part:14-data-portability
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
// @@creamu-part:15-meta-fetch
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
// @@creamu-part:18-commander-decoration
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
    const width = fab.offsetWidth || 34;
    const height = fab.offsetHeight || 34;
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
// @@creamu-part:workbench

    function ensureCreamuSync() {
        if (window.__creamuWdJlc) return window.__creamuWdJlc;
        if (typeof createCreamuWebDavSync !== 'function') return null;
        window.__creamuWdJlc = createCreamuWebDavSync({
            product: 'jlc',
            notify: (msg) => {
                if (typeof showAlert === 'function') showAlert(msg);
                else if (typeof showToast === 'function') showToast(msg);
            },
            exportPayload: () => buildBackupPayload(),
            importPayload: async (payload) => {
                await applyBackupPayload(payload, 'full');
                syncWorkbenchSettingsForm();
                await renderWorkbenchTrackingList().catch(() => {});
            },
            getSettings: () => ({
                enabled: !!config.webdav_enabled,
                url: config.webdav_url || '',
                user: config.webdav_user || '',
                password: config.webdav_password || '',
                path: config.webdav_path || '/Creamu',
                auto: config.webdav_auto !== false,
                conflict: config.webdav_conflict || 'ask'
            })
        });
        return window.__creamuWdJlc;
    }

    function clampUiBtnScale(value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return 100;
        return Math.min(110, Math.max(70, Math.round(n / 5) * 5));
    }

    /** 仅缩放工作台/FAB/页栏等按钮尺寸，列表内容不受影响 */
    function applyUiBtnScale(value) {
        const pct = clampUiBtnScale(value != null ? value : (typeof Status !== 'undefined' ? Status.get('uiBtnScale') : 100));
        const scale = String(pct / 100);
        try {
            document.documentElement.style.setProperty('--jlc-btn-scale', scale);
        } catch (_) { /* ignore */ }
        const shell = document.getElementById('jlc-wb');
        if (shell) shell.style.setProperty('--jlc-btn-scale', scale);
        const fab = document.getElementById('jlc-wb-fab');
        if (fab) fab.style.setProperty('--jlc-btn-scale', scale);
        return pct;
    }

    function getJlcWorkbenchCss() {
        return `
        #jlc-wb .jlc-wb-tag-editor {
            display: flex; flex-direction: column; gap: 8px;
        }
        #jlc-wb .jlc-wb-tag-list {
            display: flex; flex-wrap: wrap; gap: 6px; min-height: 8px;
        }
        #jlc-wb .jlc-wb-tag {
            display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 999px;
            background: var(--creamu-wb-surface-raised); border: 1px solid var(--creamu-wb-border-strong);
            color: var(--creamu-wb-text-strong); font-size: 12.5px; font-weight: 650;
            box-shadow: 0 2px 0 var(--creamu-wb-divider);
        }
        #jlc-wb .jlc-wb-tag button {
            appearance: none; border: 0; background: transparent; color: #b09070;
            cursor: pointer; font-size: 14px; line-height: 1; padding: 0 0 0 2px; font-weight: 800;
        }
        #jlc-wb .jlc-wb-tag button:hover { color: var(--creamu-wb-danger); }
        #jlc-wb .jlc-wb-tag-input {
            width: 100%; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--creamu-wb-border);
            background: var(--creamu-wb-surface-raised); color: var(--creamu-wb-text); font-size: 14px;
            box-shadow: 0 2px 0 var(--creamu-wb-divider);
        }
        #jlc-wb .jlc-wb-tag-input:focus { outline: none; border-color: var(--creamu-wb-accent); }
        #jlc-wb .jlc-wb-settings-section #jlc-wb-view-root {
            padding: 0; overflow: visible; flex: none; min-height: 0;
        }
        #jlc-wb #jlc-wb-config-diag {
            background: var(--creamu-wb-surface) !important; border: 1px solid #efe0cc !important;
            color: var(--creamu-wb-text-strong) !important;
        }
        #jlc-wb #jlc-wb-config-hint {
            background: #fff7ea !important; border-color: #f0d7a0 !important; color: #9a6700 !important;
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar {
            background: rgba(255,253,248,.97); border: 1px solid var(--creamu-wb-border);
            color: var(--creamu-wb-text); box-shadow: 0 10px 24px rgba(90,60,30,.12);
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-title {
            color: var(--creamu-wb-text);
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagehint {
            color: #a89078 !important; font-weight: 550; font-size: 12px;
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-meta {
            color: var(--creamu-wb-text-muted);
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button {
            appearance: none; border: 1px solid var(--creamu-wb-border-strong);
            background: var(--creamu-wb-surface-soft); color: var(--creamu-wb-text-strong);
            border-radius: 999px; padding: 7px 12px; cursor: pointer; font-size: 13px; font-weight: 650;
            zoom: var(--jlc-btn-scale, 1);
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button.primary {
            background: var(--creamu-wb-accent); border-color: transparent; color: var(--creamu-wb-on-accent);
        }
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button.jlc-bp-continue {
            background: linear-gradient(135deg, #ff5f56, #e54840); border: 0; color: var(--creamu-wb-on-accent);
            font-weight: 800; box-shadow: 0 3px 0 #b8322b, 0 8px 18px rgba(255,95,86,.22);
        }`;
    }

    function initWorkbenchV3Styles() {
        if (typeof injectCreamuWorkbenchStyles !== 'function') {
            console.warn('[Creamu·JLC] workbench styles unavailable');
            return;
        }
        injectCreamuWorkbenchStyles({
            styleId: 'jlc-wb-style',
            extraCss: getJlcWorkbenchCss()
        });
        applyUiBtnScale();
    }

    function focusTrackingInWorkbench(recordId, options = {}) {
        const id = compactText(recordId || '');
        persistWorkbenchSession({
            panelOpen: true,
            nav: 'tracking',
            settingsOpen: false,
            tracking: id ? { focusRecordId: id } : {}
        });
        openWorkbenchV3('tracking');
        if (id) {
            window.requestAnimationFrame(() => {
                const row = document.querySelector('#jlc-wb [data-jlc-wb-id="' + CSS.escape(id) + '"]');
                if (row) {
                    row.classList.add('is-focus');
                    row.scrollIntoView({ block: 'center', behavior: 'auto' });
                } else if (options.alertIfMissing !== false) {
                    // list may still be rendering
                    window.setTimeout(() => {
                        const retry = document.querySelector('#jlc-wb [data-jlc-wb-id="' + CSS.escape(id) + '"]');
                        retry?.classList.add('is-focus');
                        retry?.scrollIntoView({ block: 'center', behavior: 'auto' });
                    }, 120);
                }
            });
        }
    }

    function getWorkbenchEl() {
        return document.getElementById('jlc-wb');
    }

    function isWorkbenchOpen() {
        return !!getWorkbenchEl()?.classList.contains('is-open');
    }

    /** 设置抽屉 Tab；兼容旧 session id（system→services, data→backup） */
    const WORKBENCH_MAIN_NAVS = ['tracking', 'library', 'filter'];
    const WORKBENCH_SETTINGS_TABS = ['resource', 'services', 'display', 'backup'];

    function normalizeWorkbenchSettingsTab(tabId = '') {
        const id = compactText(tabId || '');
        if (id === 'system' || id === 'settings' || id === 'connect') return 'services';
        if (id === 'data') return 'backup';
        if (id === 'view' || id === 'legacy') return 'display';
        // 旧「库/过滤」在设置里：现已为主 Tab，落到显示以免打不开
        if (id === 'library' || id === 'filter' || id === 'hidden' || id === 'block') return 'display';
        if (WORKBENCH_SETTINGS_TABS.includes(id)) return id;
        return 'resource';
    }

    function normalizeWorkbenchMainNav(nav = 'tracking') {
        const id = compactText(nav || '');
        if (WORKBENCH_MAIN_NAVS.includes(id)) return id;
        return 'tracking';
    }

    function mapCommanderTabToWorkbench(tabId = '') {
        const id = compactText(tabId || '');
        if (!id || id === 'tracking') return { nav: 'tracking', settings: false, section: '' };
        if (id === 'library') return { nav: 'library', settings: false, section: '' };
        if (id === 'filter' || id === 'hidden' || id === 'block') return { nav: 'filter', settings: false, section: '' };
        if (id === 'legacy' || id === 'view' || id === 'display') return { nav: 'tracking', settings: true, section: 'display' };
        if (id === 'resource') return { nav: 'tracking', settings: true, section: 'resource' };
        if (id === 'backup' || id === 'data') return { nav: 'tracking', settings: true, section: 'backup' };
        if (id === 'settings' || id === 'services' || id === 'system') return { nav: 'tracking', settings: true, section: 'services' };
        return { nav: 'tracking', settings: false, section: '' };
    }

    function getWorkbenchListScroller(shell = getWorkbenchEl()) {
        if (!shell) return null;
        const session = getWorkbenchSession();
        const body = shell.querySelector('.jlc-wb-body');
        if (session.nav === 'library') return shell.querySelector('#jlc-wb-library-root') || body;
        if (session.nav === 'filter') return shell.querySelector('#jlc-wb-filter-root') || body;
        return shell.querySelector('#jlc-wb-list-scroll') || body;
    }

    function captureWorkbenchScroll() {
        const shell = getWorkbenchEl();
        if (!shell) return;
        const session = getWorkbenchSession();
        const key = normalizeWorkbenchMainNav(session.nav);
        const scroller = getWorkbenchListScroller(shell);
        if (!scroller) return;
        const nextTop = scroller.scrollTop || 0;
        // 滚动中频繁 GM_setValue 会卡顿，值没变就别写
        const prevTop = Number(session.scrollTops?.[key] || 0) || 0;
        let settingsTop = Number(session.scrollTops?.settings || 0) || 0;
        const settingsBody = shell.querySelector('.jlc-wb-settings-body');
        if (settingsBody && session.settingsOpen) {
            settingsTop = settingsBody.scrollTop || 0;
        }
        if (prevTop === nextTop && Number(session.scrollTops?.settings || 0) === settingsTop) return;
        persistWorkbenchSession({
            scrollTops: Object.assign({}, session.scrollTops, {
                [key]: nextTop,
                settings: settingsTop
            })
        });
    }

    function scheduleWorkbenchScrollSave() {
        if (workbenchScrollSaveTimer) window.clearTimeout(workbenchScrollSaveTimer);
        workbenchScrollSaveTimer = window.setTimeout(() => {
            workbenchScrollSaveTimer = null;
            captureWorkbenchScroll();
        }, 320);
    }

    function restoreWorkbenchScroll(options = {}) {
        const shell = getWorkbenchEl();
        if (!shell) return;
        const session = getWorkbenchSession();
        const key = normalizeWorkbenchMainNav(session.nav);
        const scroller = getWorkbenchListScroller(shell);
        const top = Number(options.scrollTop != null ? options.scrollTop : session.scrollTops?.[key] || 0) || 0;
        // 默认不要 scrollIntoView：会和用户手势抢位置，造成“滚一下又弹回”
        const focusId = options.forceFocus
            ? (options.focusId || session.tracking?.focusRecordId || '')
            : '';
        window.requestAnimationFrame(() => {
            if (scroller) scroller.scrollTop = top;
            if (focusId && session.nav === 'tracking') {
                const row = shell.querySelector('[data-jlc-wb-id="' + CSS.escape(focusId) + '"]');
                if (row) {
                    row.classList.add('is-focus');
                    if (options.scrollIntoFocus) {
                        row.scrollIntoView({ block: 'nearest', behavior: 'auto' });
                    }
                }
            }
            const settingsBody = shell.querySelector('.jlc-wb-settings-body');
            if (settingsBody && session.settingsOpen) {
                settingsBody.scrollTop = Number(session.scrollTops?.settings || 0) || 0;
            }
        });
    }

    
    function markWorkbenchListScrolling() {
        workbenchListScrolling = true;
        if (workbenchScrollIdleTimer) window.clearTimeout(workbenchScrollIdleTimer);
        workbenchScrollIdleTimer = window.setTimeout(() => {
            workbenchListScrolling = false;
            workbenchScrollIdleTimer = null;
            if (workbenchListRenderPending) {
                const opts = workbenchListRenderPending;
                workbenchListRenderPending = null;
                void renderWorkbenchTrackingList(opts);
            }
        }, 320);
    }

    function scheduleRenderWorkbenchTrackingList(options = {}, delayMs = 0) {
        if (workbenchListScrolling) {
            workbenchListRenderPending = Object.assign({}, workbenchListRenderPending || {}, options);
            return;
        }
        if (delayMs > 0) {
            if (workbenchListRenderTimer) window.clearTimeout(workbenchListRenderTimer);
            workbenchListRenderTimer = window.setTimeout(() => {
                workbenchListRenderTimer = null;
                if (workbenchListScrolling) {
                    workbenchListRenderPending = Object.assign({}, workbenchListRenderPending || {}, options);
                    return;
                }
                void renderWorkbenchTrackingList(options);
            }, delayMs);
            return;
        }
        if (workbenchListRenderTimer) {
            window.clearTimeout(workbenchListRenderTimer);
            workbenchListRenderTimer = null;
        }
        void renderWorkbenchTrackingList(options);
    }

    function updateWorkbenchFabBadge(updateCount = 0) {
        const fab = document.getElementById('jlc-wb-fab');
        if (!fab) return;
        const badge = fab.querySelector('.jlc-wb-fab-badge');
        const count = Number(updateCount || 0) || 0;
        fab.classList.toggle('has-updates', count > 0);
        if (badge) badge.textContent = count > 99 ? '99+' : String(count);
    }

    async function refreshWorkbenchFabBadge() {
        try {
            const list = (await getTrackingSearches()).filter(record => !record.archived);
            const updateCount = list.filter(record => {
                const top = normalizeCode(record.top_avid || '');
                const seen = normalizeCode(record.last_seen_avid || '');
                return top && top !== seen;
            }).length;
            updateWorkbenchFabBadge(updateCount);
            const sub = document.getElementById('jlc-wb-header-sub');
            if (sub) sub.textContent = '更新 ' + updateCount + ' · 共 ' + list.length;
        } catch (e) {
            /* ignore */
        }
    }

    function setWorkbenchSettingsOpen(open, section = '') {
        const shell = getWorkbenchEl();
        if (!shell) return;
        const drawer = shell.querySelector('.jlc-wb-settings');
        if (!drawer) return;
        drawer.classList.toggle('is-open', !!open);
        const nextSection = normalizeWorkbenchSettingsTab(
            section || getWorkbenchSession().settingsSection || 'resource'
        );
        persistWorkbenchSession({
            settingsOpen: !!open,
            settingsSection: nextSection
        });
        if (open && typeof activateWorkbenchSettingsTab === 'function') {
            activateWorkbenchSettingsTab(nextSection);
        }
    }

    async function activateWorkbenchNav(nav = 'tracking', options = {}) {
        const shell = getWorkbenchEl();
        if (!shell) return;
        const next = normalizeWorkbenchMainNav(nav);
        captureWorkbenchScroll();
        shell.querySelectorAll('.jlc-wb-nav button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.nav === next);
        });
        shell.querySelectorAll('[data-jlc-wb-page]').forEach(page => {
            page.hidden = page.dataset.jlcWbPage !== next;
        });
        persistWorkbenchSession({ nav: next });
        if (next === 'tracking') {
            // 列表渲染内部会保留/恢复滚动，这里不要再 restore + scrollIntoView 抢位置
            if (options.forceRender !== false) await renderWorkbenchTrackingList(options);
            else restoreWorkbenchScroll({ scrollTop: Number(getWorkbenchSession().scrollTops?.tracking || 0) || 0 });
        } else if (next === 'library') {
            try { syncWorkbenchSettingsForm(); } catch (_) { /* ignore */ }
            try { await refreshLibraryUI(); } catch (_) { /* ignore */ }
            restoreWorkbenchScroll();
        } else if (next === 'filter') {
            try { syncWorkbenchSettingsForm(); } catch (_) { /* ignore */ }
            try { mountWorkbenchFilterEditors(); } catch (_) { /* ignore */ }
            restoreWorkbenchScroll();
        }
    }

    /** 过滤页：本页内联编辑屏蔽词/番号（不跳 TabPanel） */
    function mountWorkbenchFilterEditors() {
        const hosts = [
            document.getElementById('jlc-wb-tags-hidden-word'),
            document.getElementById('jlc-wb-tags-hidden-avid')
        ].filter(Boolean);
        hosts.forEach((host) => {
            if (host.dataset.bound === '1') return;
            const key = host.getAttribute('data-key') || '';
            if (!key || typeof Status === 'undefined') return;
            host.dataset.bound = '1';
            let data = Array.isArray(Status.get(key)) ? Status.get(key).slice() : [];
            host.innerHTML = ''
                + '<div class="jlc-wb-tag-list"></div>'
                + '<input type="text" class="jlc-wb-tag-input" autocomplete="off" placeholder="'
                + escapeHtml(host.getAttribute('data-placeholder') || '回车添加') + '">';
            const listEl = host.querySelector('.jlc-wb-tag-list');
            const input = host.querySelector('.jlc-wb-tag-input');
            const paint = () => {
                listEl.innerHTML = data.map((t, i) => ''
                    + '<span class="jlc-wb-tag">' + escapeHtml(String(t))
                    + '<button type="button" data-i="' + i + '" title="删除">×</button></span>').join('');
            };
            const persist = () => {
                Status.set(key, data.slice());
                try { syncWorkbenchSettingsForm(); } catch (_) { /* ignore */ }
                try { if (typeof refreshCommanderDecorations === 'function') refreshCommanderDecorations(); } catch (_) { /* ignore */ }
            };
            const addTokens = (raw) => {
                const parts = String(raw || '').replace(/，/g, ',').split(',').map((s) => s.trim()).filter(Boolean);
                if (!parts.length) return;
                parts.forEach((p) => {
                    if (!data.some((x) => String(x).toLowerCase() === p.toLowerCase())) data.push(p);
                });
                paint();
                persist();
            };
            listEl.addEventListener('click', (e) => {
                const btn = e.target?.closest?.('button[data-i]');
                if (!btn) return;
                const i = Number(btn.getAttribute('data-i'));
                if (!Number.isFinite(i) || i < 0) return;
                data.splice(i, 1);
                paint();
                persist();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                addTokens(input.value);
                input.value = '';
            });
            paint();
        });

        const fav = document.getElementById('jlc-wb-i-fav');
        if (fav && fav.dataset.bound !== '1') {
            fav.dataset.bound = '1';
            const saveFav = () => {
                const list = String(fav.value || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean);
                config.fav_tags = list;
                try { GM_setValue('jlc_config_stable', config); } catch (_) { /* ignore */ }
                try { if (typeof ensureCreamuSync === 'function') ensureCreamuSync()?.markLocalDirty(); } catch (_) { /* ignore */ }
                try { if (typeof refreshCommanderDecorations === 'function') refreshCommanderDecorations(); } catch (_) { /* ignore */ }
            };
            fav.addEventListener('change', saveFav);
            fav.addEventListener('blur', saveFav);
        }
    }

    function closeWorkbenchV3() {
        const shell = getWorkbenchEl();
        if (!shell) return;
        captureWorkbenchScroll();
        shell.classList.remove('is-open');
        document.getElementById('jlc-wb-fab')?.classList.remove('is-panel-open');
        persistWorkbenchSession({ panelOpen: false, settingsOpen: false });
        setWorkbenchSettingsOpen(false);
    }

    function applyWorkbenchShellGeometry(patch = {}, options = {}) {
        const shell = getWorkbenchEl();
        if (!shell) return null;
        const session = getWorkbenchSession();
        const def = getCreamuDefaultWorkbenchRect(window);
        // 宽高只信任 session / 显式 patch，禁止用 live getBoundingClientRect 反写（会越拖越胀）
        const nextWidth = patch.width != null
            ? patch.width
            : (Number(session.shellWidth) > 0 ? session.shellWidth : def.width);
        const nextHeight = patch.height != null
            ? patch.height
            : (Number(session.shellHeight) > 0 ? session.shellHeight : def.height);
        const nextLeft = patch.left != null
            ? patch.left
            : (session.shellLeft != null && Number.isFinite(Number(session.shellLeft)) ? session.shellLeft : def.left);
        const nextTop = patch.top != null
            ? patch.top
            : (session.shellTop != null && Number.isFinite(Number(session.shellTop)) ? session.shellTop : def.top);
        const rect = clampCreamuWorkbenchRect({
            left: nextLeft,
            top: nextTop,
            width: nextWidth,
            height: nextHeight
        }, window);
        shell.style.left = rect.left + 'px';
        shell.style.top = rect.top + 'px';
        shell.style.right = 'auto';
        shell.style.bottom = 'auto';
        shell.style.width = rect.width + 'px';
        shell.style.height = rect.height + 'px';
        shell.style.maxHeight = 'none';
        if (!options.skipPersist) {
            persistWorkbenchSession({
                shellLeft: rect.left,
                shellTop: rect.top,
                shellWidth: rect.width,
                shellHeight: rect.height
            });
        }
        return rect;
    }

    function applyWorkbenchShellSize(width, height) {
        const patch = {};
        if (width != null) patch.width = width;
        if (height != null) patch.height = height;
        applyWorkbenchShellGeometry(patch);
    }

    function applyWorkbenchFabPosition(fab, session = getWorkbenchSession()) {
        if (!fab) return;
        const left = Number(session.fabLeft);
        const top = Number(session.fabTop);
        if (!Number.isFinite(left) || !Number.isFinite(top)) return;
        const w = fab.offsetWidth || 34;
        const h = fab.offsetHeight || 34;
        const point = clampCreamuWorkbenchPoint({ left, top }, { width: w, height: h }, window);
        fab.style.left = point.left + 'px';
        fab.style.top = point.top + 'px';
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
    }

    function bindWorkbenchFabDrag(fab) {
        if (!fab) return;
        applyWorkbenchFabPosition(fab);
        bindCreamuFabDrag(fab, {
            boundKey: 'jlcFabDragBound',
            threshold: 5,
            thresholdMode: 'axis',
            applyPosition: (point) => {
                fab.style.left = point.left + 'px';
                fab.style.top = point.top + 'px';
                fab.style.right = 'auto';
                fab.style.bottom = 'auto';
            },
            savePosition: (point) => {
                persistWorkbenchSession({
                    fabLeft: Math.round(point.left),
                    fabTop: Math.round(point.top)
                });
            },
            onActivate: () => toggleWorkbenchV3(),
            onViewportChange: () => applyWorkbenchFabPosition(fab),
            preventClick: false
        });
    }

    function getWorkbenchInteractionRect(shell) {
            const session = getWorkbenchSession();
            const rect = shell.getBoundingClientRect();
            return {
                left: rect.left,
                top: rect.top,
                width: Math.round(Number(session.shellWidth) > 0 ? session.shellWidth : rect.width),
                height: Math.round(Number(session.shellHeight) > 0 ? session.shellHeight : rect.height)
            };
    }

    function bindWorkbenchDrag(shell) {
        bindCreamuWorkbenchDrag(shell, {
            boundKey: 'jlcPanelDragBound',
            isDragDisabled: () => window.innerWidth <= 820,
            shouldIgnoreDrag: (event) => !!event.target?.closest?.('.jlc-wb-header-actions'),
            getStartRect: () => getWorkbenchInteractionRect(shell),
            applyRect: (rect) => applyWorkbenchShellGeometry(rect, { skipPersist: true }),
            onEnd: (rect) => applyWorkbenchShellGeometry(rect),
            lockBodySelection: true
        });
    }

    function bindWorkbenchResize(shell) {
        bindCreamuWorkbenchResize(shell, {
            boundKey: 'jlcPanelResizeBound',
            handleBoundPrefix: 'jlcResizeHandle',
            isDragDisabled: () => window.innerWidth <= 820,
            getStartRect: () => getWorkbenchInteractionRect(shell),
            applyRect: (rect) => applyWorkbenchShellGeometry(rect, { skipPersist: true }),
            onEnd: (rect) => applyWorkbenchShellGeometry(rect),
            lockBodySelection: true
        });
    }

    function ensureWorkbenchDialog() {
        let dialog = document.getElementById('jlc-wb-dialog');
        if (dialog) return dialog;
        dialog = document.createElement('div');
        dialog.id = 'jlc-wb-dialog';
        dialog.innerHTML = ''
            + '<div class="jlc-wb-dialog-card" role="dialog" aria-modal="true">'
            + '  <h4 id="jlc-wb-dialog-title">输入</h4>'
            + '  <p id="jlc-wb-dialog-note"></p>'
            + '  <input id="jlc-wb-dialog-input" type="text" autocomplete="off">'
            + '  <div class="jlc-wb-dialog-actions">'
            + '    <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-dialog-cancel">取消</button>'
            + '    <button type="button" class="jlc-wb-btn primary" id="jlc-wb-dialog-ok">确定</button>'
            + '  </div>'
            + '</div>';
        document.body.appendChild(dialog);
        return dialog;
    }

    function showWorkbenchPrompt(options = {}) {
        const dialog = ensureWorkbenchDialog();
        const title = dialog.querySelector('#jlc-wb-dialog-title');
        const note = dialog.querySelector('#jlc-wb-dialog-note');
        const input = dialog.querySelector('#jlc-wb-dialog-input');
        const ok = dialog.querySelector('#jlc-wb-dialog-ok');
        const cancel = dialog.querySelector('#jlc-wb-dialog-cancel');
        title.textContent = options.title || '输入';
        note.textContent = options.note || '';
        note.style.display = options.note ? 'block' : 'none';
        input.value = options.value || '';
        input.placeholder = options.placeholder || '';
        dialog.classList.add('is-open');
        window.setTimeout(() => {
            input.focus();
            input.select();
        }, 0);
        return new Promise((resolve) => {
            const close = (value) => {
                dialog.classList.remove('is-open');
                ok.onclick = null;
                cancel.onclick = null;
                dialog.onclick = null;
                input.onkeydown = null;
                resolve(value);
            };
            ok.onclick = () => close(input.value);
            cancel.onclick = () => close(null);
            dialog.onclick = (event) => {
                if (event.target === dialog) close(null);
            };
            input.onkeydown = (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    close(input.value);
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    close(null);
                }
            };
        });
    }
// @@creamu-part:21-workbench-tracking
    const WB_VIRT_THRESHOLD = 99999; // 关闭虚高虚拟列表，避免底部空滚
    let WB_VIRT_ITEM_H = 112;
    let WB_VIRT_GROUP_H = 44;
    let workbenchVirtState = null;

    /** 胶囊用短相对时间：刚刚 / 5分钟前 / 3小时前 / 1天前 */
    function formatCompactRelativeTime(value) {
        if (!value) return '';
        const time = new Date(value).getTime();
        if (!Number.isFinite(time)) return '';
        const diff = Date.now() - time;
        if (diff < 60 * 1000) return '刚刚';
        if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + '分钟前';
        if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + '小时前';
        if (diff < 30 * 24 * 60 * 60 * 1000) return Math.floor(diff / (24 * 60 * 60 * 1000)) + '天前';
        // 更久：用月-日，避免胶囊过长
        const d = new Date(time);
        return (d.getMonth() + 1) + '/' + d.getDate();
    }

    /** 上次打开时效色阶：越近越暖 */
    function getLastOpenedRecencyClass(value) {
        if (!value) return 'recency-mid';
        const time = new Date(value).getTime();
        if (!Number.isFinite(time)) return 'recency-mid';
        const diff = Date.now() - time;
        if (diff < 60 * 60 * 1000) return 'recency-fresh'; // <1h
        if (diff < 24 * 60 * 60 * 1000) return 'recency-warm'; // <1d
        if (diff < 7 * 24 * 60 * 60 * 1000) return 'recency-mid'; // <7d
        return 'recency-cool';
    }

    function buildWorkbenchTrackingItemHtml(record, session, context, currentSignature, focusId) {
        const status = buildTrackingStatus(record);
        const displayTitle = getTrackingDisplayTitle(record);
        const pageHints = buildTrackingPageHintSummary(record);
        const pageSummary = pageHints.length ? pageHints.join(' · ') : '';
        // 最新/断点单独一行；页码单独一行；浏览时间改挂在「上次」胶囊
        const avidBits = [];
        if (record.top_avid) avidBits.push('最新 ' + record.top_avid);
        if (record.last_seen_avid) avidBits.push('断点 ' + record.last_seen_avid);
        const avidLine = avidBits.join(' · ');
        const metaHtml = ''
            + (avidLine
                ? '<div class="jlc-wb-item-meta-line is-avid" title="' + escapeHtml(avidLine) + '">' + escapeHtml(avidLine) + '</div>'
                : '')
            + (pageSummary
                ? '<div class="jlc-wb-item-meta-line is-sub" title="' + escapeHtml(pageSummary) + '">' + escapeHtml(pageSummary) + '</div>'
                : '');
        const isFocus = focusId && record.id === focusId;
        const isCurrent = currentSignature && record.query_signature === currentSignature;
        const canQuery = isJavLibraryResolvableSearchUrl(record.page_url || record.open_url || '');
        const leafTitle = status.note || status.text || '';
        const subPills = [];
        subPills.push('<span class="jlc-site-pill">' + escapeHtml(getSiteLabel(record.site)) + '</span>');
        if (isCurrent) subPills.push('<span class="jlc-site-pill is-current">当前</span>');
        // 「上次」必须来自可同步字段 last_browsed_at（追更记录），不能只靠本机 session.lastOpened*
        // session 仅用于本机「刚打开」高亮：取二者较新者展示
        {
            const sessionIsLast = record.id === session.tracking.lastOpenedId;
            const sessionOpenedAt = sessionIsLast ? compactText(session.tracking.lastOpenedAt || '') : '';
            const browsedAt = compactText(record.last_browsed_at || '');
            let lastAt = '';
            if (sessionOpenedAt && browsedAt) {
                const st = Date.parse(sessionOpenedAt) || 0;
                const bt = Date.parse(browsedAt) || 0;
                lastAt = st >= bt ? sessionOpenedAt : browsedAt;
            } else {
                lastAt = sessionOpenedAt || browsedAt;
            }
            if (lastAt) {
                const rel = formatCompactRelativeTime(lastAt);
                const lastLabel = rel ? ('上次/' + rel) : '上次';
                const fromSessionOnly = sessionIsLast && lastAt === sessionOpenedAt && lastAt !== browsedAt;
                const lastTitle = fromSessionOnly
                    ? ('本机刚打开 · ' + formatDateTime(lastAt))
                    : ('上次浏览（已同步） · ' + formatDateTime(lastAt));
                const recency = getLastOpenedRecencyClass(lastAt);
                subPills.push(
                    '<span class="jlc-site-pill is-last ' + recency + '" title="' + escapeHtml(lastTitle) + '">'
                    + escapeHtml(lastLabel)
                    + '</span>'
                );
            }
        }
        return ''
            + '<div class="jlc-wb-item tone-' + escapeHtml(status.tone || 'gray') + (isFocus ? ' is-focus' : '') + (isCurrent ? ' is-current' : '') + '" data-jlc-wb-id="' + escapeHtml(record.id) + '" data-jlc-wb-card-open="' + escapeHtml(record.id) + '" title="点击打开">'
            + '  <div class="jlc-wb-item-row">'
            + buildWorkbenchCoverHtml(record)
            + '    <div class="jlc-wb-item-body">'
            + '      <div class="jlc-wb-item-title-row">'
            + '        <div class="jlc-wb-item-title">' + escapeHtml(displayTitle) + '</div>'
            + '        <span class="jlc-wb-leaf tone-' + escapeHtml(status.tone || 'gray') + '" title="' + escapeHtml(leafTitle) + '">' + escapeHtml(status.text) + '</span>'
            + '      </div>'
            + '      <div class="jlc-wb-item-meta">' + metaHtml + '</div>'
            + '      <div class="jlc-wb-item-pills">' + subPills.join('') + '</div>'
            + '    </div>'
            + '    <div class="jlc-wb-item-side">'
            + '      <button type="button" class="jlc-wb-open-btn" data-jlc-wb-open="' + escapeHtml(record.id) + '" title="按默认方式打开">Open</button>'
            + '      <button type="button" class="jlc-wb-more-btn" data-jlc-wb-more="' + escapeHtml(record.id) + '" title="更多操作" aria-label="更多">···</button>'
            + '      <div class="jlc-wb-item-menu" data-jlc-wb-menu="' + escapeHtml(record.id) + '" hidden>'
            + '        <button type="button" data-jlc-wb-open-same="' + escapeHtml(record.id) + '">本页打开</button>'
            + '        <button type="button" data-jlc-wb-refresh="' + escapeHtml(record.id) + '">刷新</button>'
            + (canQuery ? '        <button type="button" data-jlc-wb-query="' + escapeHtml(record.id) + '">改词</button>' : '')
            + '        <button type="button" data-jlc-wb-label="' + escapeHtml(record.id) + '">改名</button>'
            + (hasPendingTrackingVerification(record)
                ? '        <button type="button" data-jlc-wb-verify="' + escapeHtml(record.id) + '">验证</button>'
                : '')
            + '        <button type="button" class="is-danger" data-jlc-wb-delete="' + escapeHtml(record.id) + '">删除</button>'
            + '      </div>'
            + '    </div>'
            + '  </div>'
            + '  <div class="jlc-wb-item-edit" data-jlc-wb-edit="' + escapeHtml(record.id) + '">'
            + '    <input type="text" data-jlc-wb-edit-input>'
            + '    <button type="button" class="jlc-wb-btn primary" data-jlc-wb-edit-save>保存</button>'
            + '    <button type="button" class="jlc-wb-btn ghost" data-jlc-wb-edit-cancel>取消</button>'
            + '  </div>'
            + '</div>';
    }

    function buildWorkbenchGroupHeaderHtml(groupType, records, collapsedState) {
        const groupKey = 'group_' + groupType;
        const collapsed = !!collapsedState[groupKey];
        const hasUpdate = records.filter(trackingRecordHasUpdate).length;
        return ''
            + '<section class="jlc-wb-group' + (collapsed ? ' collapsed' : '') + '" data-jlc-group="' + escapeHtml(groupKey) + '">'
            + '  <button type="button" class="jlc-wb-group-toggle" data-jlc-toggle-group="' + escapeHtml(groupKey) + '">'
            + '    <span>' + escapeHtml(getTrackingGroupLabel(groupType)) + (hasUpdate ? '（' + hasUpdate + ' 更新）' : '') + '</span>'
            + '    <small>' + records.length + ' 项</small>'
            + '  </button>'
            + '</section>';
    }

    function openWorkbenchInlineEdit(root, recordId, mode, initialValue) {
        root.querySelectorAll('.jlc-wb-item-edit.is-open').forEach(el => {
            el.classList.remove('is-open');
            delete el.dataset.mode;
        });
        const box = root.querySelector('[data-jlc-wb-edit="' + CSS.escape(recordId) + '"]');
        if (!box) return;
        const input = box.querySelector('[data-jlc-wb-edit-input]');
        box.dataset.mode = mode;
        box.classList.add('is-open');
        if (input) {
            input.value = initialValue || '';
            input.placeholder = mode === 'query' ? '原搜索词' : '备注名（可空恢复自动标题）';
            input.focus();
            input.select();
        }
    }

    function bindWorkbenchTrackingActions(root, list, context, resumePendingIds, refreshResume) {
        const findRecord = (id) => list.find(item => item.id === id);
        const stopBubble = (event) => {
            event.stopPropagation();
        };
        const closeAllMenus = () => {
            root.querySelectorAll('.jlc-wb-item-menu').forEach(menu => {
                menu.hidden = true;
                menu.classList.remove('is-up');
            });
            root.querySelectorAll('.jlc-wb-more-btn.is-open').forEach(btn => btn.classList.remove('is-open'));
            root.querySelectorAll('.jlc-wb-item.is-menu-open').forEach(item => item.classList.remove('is-menu-open'));
        };
        const placeMenu = (menu, card) => {
            if (!menu || !card) return;
            menu.classList.remove('is-up');
            // 先按默认向下打开，再根据列表可视区决定是否上翻
            window.requestAnimationFrame(() => {
                const menuRect = menu.getBoundingClientRect();
                const scroller = menu.closest('.jlc-wb-list-scroll') || root;
                const scrollerRect = scroller?.getBoundingClientRect?.() || null;
                const overflowBottom = scrollerRect
                    ? menuRect.bottom > (scrollerRect.bottom - 6)
                    : menuRect.bottom > (window.innerHeight - 8);
                if (overflowBottom) menu.classList.add('is-up');
            });
        };
        // 点整张卡片 = 默认打开；点按钮/菜单不冒泡
        root.querySelectorAll('[data-jlc-wb-card-open]').forEach(card => {
            card.addEventListener('click', (event) => {
                if (event.target.closest('button, input, a, .jlc-wb-item-side, .jlc-wb-item-menu, .jlc-wb-item-edit, [data-jlc-wb-edit]')) {
                    return;
                }
                closeAllMenus();
                const record = findRecord(card.getAttribute('data-jlc-wb-card-open'));
                if (!record) return;
                void openTrackingRecordFromWorkbench(record);
            });
        });
        root.querySelectorAll('.jlc-wb-item-side, .jlc-wb-item-edit, .jlc-wb-item-menu').forEach(el => {
            el.addEventListener('click', stopBubble);
        });
        root.querySelectorAll('[data-jlc-wb-more]').forEach(button => {
            button.addEventListener('click', (event) => {
                stopBubble(event);
                const id = button.getAttribute('data-jlc-wb-more') || '';
                const menu = root.querySelector('[data-jlc-wb-menu="' + CSS.escape(id) + '"]');
                const card = button.closest('.jlc-wb-item');
                const willOpen = !!(menu && menu.hidden);
                closeAllMenus();
                if (menu && willOpen) {
                    menu.hidden = false;
                    button.classList.add('is-open');
                    card?.classList.add('is-menu-open');
                    placeMenu(menu, card);
                }
            });
        });
        root.querySelectorAll('[data-jlc-wb-open]').forEach(button => {
            button.addEventListener('click', (event) => {
                stopBubble(event);
                closeAllMenus();
                void openTrackingRecordFromWorkbench(findRecord(button.getAttribute('data-jlc-wb-open')));
            });
        });
        root.querySelectorAll('[data-jlc-wb-open-same]').forEach(button => {
            button.addEventListener('click', (event) => {
                stopBubble(event);
                closeAllMenus();
                void openTrackingRecordFromWorkbench(findRecord(button.getAttribute('data-jlc-wb-open-same')), { mode: 'same' });
            });
        });
        root.querySelectorAll('[data-jlc-wb-refresh]').forEach(button => {
            button.addEventListener('click', async (event) => {
                stopBubble(event);
                closeAllMenus();
                const recordId = button.getAttribute('data-jlc-wb-refresh');
                const prev = button.textContent;
                button.disabled = true;
                button.textContent = '…';
                try {
                    await refreshSingleTrackingRecord(recordId);
                } finally {
                    button.disabled = false;
                    button.textContent = prev;
                    await renderWorkbenchTrackingList();
                }
            });
        });
        root.querySelectorAll('[data-jlc-wb-label]').forEach(button => {
            button.addEventListener('click', (event) => {
                stopBubble(event);
                closeAllMenus();
                const record = findRecord(button.getAttribute('data-jlc-wb-label'));
                if (!record) return;
                openWorkbenchInlineEdit(root, record.id, 'label', record.custom_label || getTrackingDisplayTitle(record, context));
            });
        });
        root.querySelectorAll('[data-jlc-wb-query]').forEach(button => {
            button.addEventListener('click', (event) => {
                stopBubble(event);
                closeAllMenus();
                const record = findRecord(button.getAttribute('data-jlc-wb-query'));
                if (!record) return;
                openWorkbenchInlineEdit(root, record.id, 'query', getTrackingSearchQuery(record, context) || '');
            });
        });
        root.querySelectorAll('[data-jlc-wb-edit-cancel]').forEach(button => {
            button.addEventListener('click', (event) => {
                stopBubble(event);
                const box = button.closest('.jlc-wb-item-edit');
                box?.classList.remove('is-open');
            });
        });
        root.querySelectorAll('[data-jlc-wb-edit-save]').forEach(button => {
            button.addEventListener('click', async (event) => {
                stopBubble(event);
                const box = button.closest('.jlc-wb-item-edit');
                const recordId = box?.getAttribute('data-jlc-wb-edit') || '';
                const record = findRecord(recordId);
                if (!record || !box) return;
                const input = box.querySelector('[data-jlc-wb-edit-input]');
                const mode = box.dataset.mode || 'label';
                const value = input?.value ?? '';
                if (mode === 'query') {
                    if (!compactText(value)) {
                        showAlert('原搜索词不能为空。');
                        return;
                    }
                    applyTrackingSearchQuery(record, value);
                    await saveTrackingRecord(record);
                } else {
                    record.custom_label = compactText(value || '');
                    await saveTrackingRecord(record);
                }
                await renderWorkbenchTrackingList();
            });
        });
        root.querySelectorAll('[data-jlc-wb-edit-input]').forEach(input => {
            input.addEventListener('click', stopBubble);
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    input.closest('.jlc-wb-item-edit')?.querySelector('[data-jlc-wb-edit-save]')?.click();
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    input.closest('.jlc-wb-item-edit')?.querySelector('[data-jlc-wb-edit-cancel]')?.click();
                }
            });
        });
        root.querySelectorAll('[data-jlc-wb-verify]').forEach(button => {
            button.addEventListener('click', (event) => {
                stopBubble(event);
                closeAllMenus();
                const record = findRecord(button.getAttribute('data-jlc-wb-verify'));
                if (!record) return;
                const verifyUrl = buildTrackingVerifyUrl(record);
                if (!verifyUrl) {
                    showAlert('当前没有可打开的验证页面。');
                    return;
                }
                openTrackingVerificationUrl(verifyUrl, { fallbackToNavigate: true });
            });
        });
        root.querySelectorAll('[data-jlc-wb-delete]').forEach(button => {
            button.addEventListener('click', async (event) => {
                stopBubble(event);
                closeAllMenus();
                const record = findRecord(button.getAttribute('data-jlc-wb-delete'));
                if (!record) return;
                if (!window.confirm('确定删除追更项“' + getTrackingDisplayTitle(record) + '”吗？')) return;
                await deleteVal(TRACKING_STORE, record.id);
                await renderWorkbenchTrackingList();
                void refreshWorkbenchFabBadge();
            });
        });
        root.querySelectorAll('[data-jlc-toggle-group]').forEach(button => {
            button.addEventListener('click', () => {
                const groupKey = button.getAttribute('data-jlc-toggle-group') || '';
                const collapsedState = getTrackingUiState().collapsed || {};
                const nextCollapsed = !collapsedState[groupKey];
                setTrackingGroupCollapsed(groupKey, nextCollapsed);
                void renderWorkbenchTrackingList();
            });
        });
        root.querySelector('[data-jlc-wb-open-verify]')?.addEventListener('click', () => {
            const verifyRecord = list.find(record => record.id === refreshResume?.record_id)
                || list.find(record => resumePendingIds.includes(record.id));
            const verifyUrl = compactText(refreshResume?.verify_url || '') || buildTrackingVerifyUrl(verifyRecord);
            if (!verifyUrl) {
                showAlert('当前没有可打开的验证页面。');
                return;
            }
            openTrackingVerificationUrl(verifyUrl, { fallbackToNavigate: true });
        });
        root.querySelector('[data-jlc-wb-resume]')?.addEventListener('click', async (event) => {
            if (!resumePendingIds.length) {
                clearTrackingRefreshResumeState();
                await renderWorkbenchTrackingList();
                return;
            }
            const verifyRecord = list.find(record => record.id === refreshResume?.record_id)
                || list.find(record => resumePendingIds.includes(record.id));
            const verifyUrl = compactText(refreshResume?.verify_url || '') || buildTrackingVerifyUrl(verifyRecord);
            const probe = await probeTrackingVerificationReady(verifyRecord, verifyUrl);
            if (!probe.ok) {
                if (verifyUrl) openTrackingVerificationUrl(verifyUrl);
                showAlert((probe.note || '验证尚未生效') + '，请在打开的 JavLibrary 页面完成验证后再点继续。');
                return;
            }
            clearTrackingRefreshResumeState();
            if (verifyRecord) {
                clearTrackingVerificationRequired(verifyRecord, { restoreStatus: true });
                await saveTrackingRecord(verifyRecord);
            }
            void refreshAllTrackingSearches(event.currentTarget, {
                recordIds: resumePendingIds,
                total: Number(refreshResume?.total || 0) || resumePendingIds.length,
                completedBase: Number(refreshResume?.completed || 0) || 0,
                resumeVerified: true
            });
        });
    }


    function openWorkbenchV3(tabId = '') {
        createWorkbenchV3();
        const shell = getWorkbenchEl();
        if (!shell) return;
        const mapped = mapCommanderTabToWorkbench(tabId);
        const session = getWorkbenchSession();
        const nav = compactText(tabId || '') ? mapped.nav : (session.nav || 'tracking');
        shell.classList.add('is-open');
        document.getElementById('jlc-wb-fab')?.classList.add('is-panel-open');
        applyWorkbenchShellGeometry();
        persistWorkbenchSession({ panelOpen: true, nav });
        activateWorkbenchNav(nav, { forceRender: true });
        const wantSettings = !!(mapped.settings || (compactText(tabId || '') ? false : session.settingsOpen));
        if (wantSettings || mapped.settings) {
            setWorkbenchSettingsOpen(true, mapped.section || session.settingsSection || '');
            syncWorkbenchSettingsForm();
            void refreshLibraryUI();
        } else {
            setWorkbenchSettingsOpen(false);
        }
        if (nav !== 'tracking') void refreshWorkbenchFabBadge();
    }

    function toggleWorkbenchV3(tabId = '') {
        if (isWorkbenchOpen() && !compactText(tabId || '')) {
            closeWorkbenchV3();
            return;
        }
        openWorkbenchV3(tabId);
    }

    function trackingRecordHasUpdate(record) {
        const top = normalizeCode(record?.top_avid || '');
        const seen = normalizeCode(record?.last_seen_avid || '');
        return !!(top && top !== seen);
    }

    function sortTrackingRecordsForWorkbench(list, sortKey, session, options = {}) {
        const lastOpenedId = session?.tracking?.lastOpenedId || '';
        const currentSignature = compactText(options.currentSignature || '');
        const pinCurrent = options.pinCurrent !== false && !!session?.tracking?.pinCurrent;
        const arr = list.slice();
        const byName = (a, b) => String(getTrackingDisplayTitle(a) || '').localeCompare(String(getTrackingDisplayTitle(b) || ''), 'zh-Hans-CN');
        const byTime = (key) => (a, b) => String(b?.[key] || '').localeCompare(String(a?.[key] || ''));
        const isCurrent = (record) => !!(currentSignature && record?.query_signature === currentSignature);
        let sorted;
        if (sortKey === 'name') sorted = arr.sort(byName);
        else if (sortKey === 'last_browsed') sorted = arr.sort(byTime('last_browsed_at'));
        else if (sortKey === 'last_opened') {
            sorted = arr.sort((a, b) => {
                if (a.id === lastOpenedId) return -1;
                if (b.id === lastOpenedId) return 1;
                return byTime('last_browsed_at')(a, b);
            });
        } else {
            // updates_first
            sorted = arr.sort((a, b) => {
                const au = trackingRecordHasUpdate(a) ? 1 : 0;
                const bu = trackingRecordHasUpdate(b) ? 1 : 0;
                if (au !== bu) return bu - au;
                return byTime('last_check_at')(a, b) || byName(a, b);
            });
        }
        if (pinCurrent && currentSignature) {
            sorted.sort((a, b) => Number(isCurrent(b)) - Number(isCurrent(a)));
        }
        return sorted;
    }

    async function prepareTrackingRecordNavigation(record, targetUrl) {
        const targetMode = resolveTrackingSearchMode(record, parseTrackingUrl(targetUrl || record.open_url || ''));
        const targetPageHint = targetMode === 'backfill'
            ? (Number(record.last_seen_page_hint || record.top_page_hint || record.last_browsed_page_hint || 0) || 1)
            : (Number(getCurrentListPageHint(targetUrl) || 0) || 1);
        record.last_browsed_at = new Date().toISOString();
        record.last_browsed_page_hint = targetPageHint;

        if (isJavLibraryResolvableSearchUrl(record.page_url || record.open_url || targetUrl || '')) {
            let searchQuery = getTrackingSearchQuery(record);
            if (!searchQuery) {
                searchQuery = promptTrackingSearchQuery(record);
                if (searchQuery == null) return { ok: false, cancelled: true };
            }
            searchQuery = compactText(searchQuery || '');
            if (!searchQuery) {
                showAlert('原搜索词不能为空。');
                return { ok: false };
            }
            applyTrackingSearchQuery(record, searchQuery);
            const resolved = await resolveJavLibrarySearchUrl(record, {
                keyword: searchQuery,
                pageHint: targetPageHint
            });
            if (!resolved.ok || !resolved.url) {
                await saveTrackingRecord(record);
                showAlert('重新生成 JavLibrary 搜索失败：' + (resolved.error || '未知错误'));
                return { ok: false };
            }
            record.open_url = resolved.url;
            await saveTrackingRecord(record);
            return { ok: true, url: resolved.url };
        }

        await saveTrackingRecord(record);
        return { ok: true, url: targetUrl };
    }

    async function openTrackingRecordFromWorkbench(record, options = {}) {
        if (!record) return;
        const session = getWorkbenchSession();
        const openMode = options.mode || session.openMode || config.open_mode || 'tab';
        const targetUrl = buildTrackingNavigationUrl(record) || record.open_url;
        if (!targetUrl) {
            showAlert('没有可打开的地址。');
            return;
        }

        const openedAt = new Date().toISOString();
        // 本机 UI 高亮（不同步）+ 可同步浏览时间（进 tracking 记录 / WebDAV）
        persistWorkbenchSession({
            panelOpen: false,
            settingsOpen: false,
            nav: 'tracking',
            tracking: {
                focusRecordId: record.id,
                lastOpenedId: record.id,
                lastOpenedAt: openedAt
            }
        });
        // 先落盘 last_browsed_at，避免只改了 session 导致其它设备永远看不到「上次」
        try {
            record.last_browsed_at = openedAt;
            await saveTrackingRecord(record);
        } catch (_) { /* prepare 里还会再写一次 */ }
        try { closeWorkbenchV3(); } catch (_) {}

        const prepared = await prepareTrackingRecordNavigation(record, targetUrl);
        if (!prepared.ok) return;
        const url = prepared.url;
        if (openMode === 'tab') {
            const opened = window.open(url, '_blank', 'noopener');
            if (!opened) {
                showAlert('浏览器拦截了新标签，已改为本页打开。');
                location.href = url;
                return;
            }
            showAlert('已在新标签打开，列表位置已保留。');
            void renderWorkbenchTrackingList();
            return;
        }
        location.href = url;
    }

    async function renderWorkbenchTrackingList(options = {}) {
        const root = document.getElementById('jlc-wb-tracking-root');
        if (!root) return;
        // 整表 innerHTML 会把 scrollTop 清零；先记下当前滚动，渲染后再写回
        const prevScroller = root.querySelector('#jlc-wb-list-scroll');
        const preservedScrollTop = prevScroller
            ? (prevScroller.scrollTop || 0)
            : (Number(getWorkbenchSession().scrollTops?.tracking || 0) || 0);
        const session = getWorkbenchSession();
        const context = getCurrentTrackingPageContext();
        const currentSignature = context?.query_signature || '';
        const allRecords = (await getTrackingSearches()).filter(record => !record.archived);
        let list = allRecords.slice();

        const query = compactText(session.tracking.query || '').toLowerCase();
        const groupFilter = session.tracking.groupFilter || 'all';
        if (session.tracking.filterUpdatesOnly) {
            list = list.filter(trackingRecordHasUpdate);
        }
        if (groupFilter && groupFilter !== 'all') {
            list = list.filter(record => getTrackingEffectiveGroupType(record) === groupFilter);
        }
        if (query) {
            list = list.filter(record => {
                const hay = [
                    getTrackingDisplayTitle(record),
                    record.top_avid,
                    record.last_seen_avid,
                    record.custom_label,
                    record.site,
                    getSiteLabel(record.site)
                ].map(x => String(x || '').toLowerCase()).join(' ');
                return hay.includes(query);
            });
        }

        list = sortTrackingRecordsForWorkbench(list, session.tracking.sort || 'updates_first', session, {
            currentSignature,
            pinCurrent: session.tracking.pinCurrent !== false
        });
        const updateCount = list.filter(trackingRecordHasUpdate).length;
        const allUpdateCount = allRecords.filter(trackingRecordHasUpdate).length;
        updateWorkbenchFabBadge(allUpdateCount);
        const headerSub = document.getElementById('jlc-wb-header-sub');
        if (headerSub) {
            headerSub.textContent = '更新 ' + allUpdateCount + ' · 共 ' + allRecords.length;
        }

        const refreshRuntime = getTrackingRefreshRuntimeState();
        const runtimeSummary = buildTrackingRefreshRuntimeSummary(refreshRuntime);
        const runtimeButtonText = buildTrackingRefreshRuntimeButtonText(refreshRuntime);
        const refreshResume = getTrackingRefreshResumeState();
        const resumePendingIds = Array.isArray(refreshResume?.pending_ids)
            ? refreshResume.pending_ids.filter(id => list.some(record => record.id === id))
            : [];
        const collapsedState = getTrackingUiState().collapsed || {};
        const focusId = session.tracking.focusRecordId || session.tracking.lastOpenedId || '';

        const groups = new Map();
        list.forEach(record => {
            const key = getTrackingEffectiveGroupType(record);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(record);
        });
        const orderedGroups = Array.from(groups.entries()).sort((a, b) => {
            const aIndex = TRACKING_GROUP_ORDER.indexOf(a[0]);
            const bIndex = TRACKING_GROUP_ORDER.indexOf(b[0]);
            const normalizedA = aIndex === -1 ? TRACKING_GROUP_ORDER.length : aIndex;
            const normalizedB = bIndex === -1 ? TRACKING_GROUP_ORDER.length : bIndex;
            return normalizedA - normalizedB || String(a[0]).localeCompare(String(b[0]));
        });

        const flatRows = [];
        orderedGroups.forEach(([groupType, records]) => {
            const groupKey = 'group_' + groupType;
            const collapsed = !!collapsedState[groupKey];
            flatRows.push({ type: 'group', groupType, groupKey, records, collapsed, height: WB_VIRT_GROUP_H });
            if (!collapsed) {
                records.forEach(record => {
                    flatRows.push({ type: 'item', record, groupKey, height: WB_VIRT_ITEM_H });
                });
            }
        });

        const footerSummary = document.getElementById('jlc-wb-footer-summary');
        if (footerSummary) {
            footerSummary.textContent = runtimeSummary
                || ('筛选 ' + list.length + ' 项' + (updateCount ? ' · ' + updateCount + ' 有更新' : ''));
        }
        const refreshAllBtn = document.getElementById('jlc-wb-refresh-all');
        if (refreshAllBtn) {
            refreshAllBtn.disabled = !!refreshRuntime;
            refreshAllBtn.textContent = runtimeButtonText;
        }

        const useVirtual = list.length >= WB_VIRT_THRESHOLD;
        const toolbarHtml = ''
            + '<div class="jlc-wb-toolbar">'
            + '  <div class="jlc-wb-toolbar-row">'
            + '    <input class="jlc-wb-search" id="jlc-wb-tracking-query" type="search" placeholder="搜索标题 / 番号 / 备注…" value="' + escapeHtml(session.tracking.query || '') + '">'
            + '  </div>'
            + '  <div class="jlc-wb-toolbar-row">'
            + '    <button type="button" class="jlc-wb-chip' + (session.tracking.filterUpdatesOnly ? ' is-on' : '') + '" data-jlc-wb-filter-updates>仅有更新</button>'
            + '    <button type="button" class="jlc-wb-chip' + (session.tracking.pinCurrent !== false ? ' is-on' : '') + '" data-jlc-wb-pin-current>当前页置顶</button>'
            + '    <select class="jlc-wb-select" id="jlc-wb-group-filter">'
            + '      <option value="all"' + (groupFilter === 'all' ? ' selected' : '') + '>全部分组</option>'
            + TRACKING_GROUP_ORDER.map(key => '<option value="' + key + '"' + (groupFilter === key ? ' selected' : '') + '>' + escapeHtml(getTrackingGroupLabel(key)) + '</option>').join('')
            + '    </select>'
            + '    <select class="jlc-wb-select" id="jlc-wb-sort">'
            + '      <option value="updates_first"' + (session.tracking.sort === 'updates_first' ? ' selected' : '') + '>有更新优先</option>'
            + '      <option value="last_opened"' + (session.tracking.sort === 'last_opened' ? ' selected' : '') + '>最近打开</option>'
            + '      <option value="last_browsed"' + (session.tracking.sort === 'last_browsed' ? ' selected' : '') + '>最近浏览</option>'
            + '      <option value="name"' + (session.tracking.sort === 'name' ? ' selected' : '') + '>名称</option>'
            + '    </select>'
            + '    <button type="button" class="jlc-wb-chip" data-jlc-wb-continue>继续上次</button>'
            + '  </div>'
            + (resumePendingIds.length
                ? '  <div class="jlc-wb-toolbar-row" style="color:#fde68a;font-size:12px;">刷新已暂停 · 待验证后继续 ' + resumePendingIds.length + ' 项'
                + '    <button type="button" class="jlc-wb-btn ghost" data-jlc-wb-open-verify>去验证</button>'
                + '    <button type="button" class="jlc-wb-btn ghost" data-jlc-wb-resume>验证后继续</button></div>'
                : '')
            + (useVirtual ? '  <div class="jlc-wb-toolbar-row" style="color:#93c5fd;font-size:11px;">虚拟列表已启用（' + list.length + ' 项）</div>' : '')
            + '</div>';

        const emptyHtml = '<div class="jlc-wb-empty">' + (context ? '没有匹配的追更项。可点底部「收藏当前搜索」。' : '还没有追更项，先在列表页收藏一个搜索吧。') + '</div>';

        if (!flatRows.length) {
            root.innerHTML = toolbarHtml + '<div class="jlc-wb-list-scroll" id="jlc-wb-list-scroll">' + emptyHtml + '</div>';
        } else if (!useVirtual) {
            const groupMarkup = orderedGroups.map(([groupType, records]) => {
                const groupKey = 'group_' + groupType;
                const collapsed = !!collapsedState[groupKey];
                const hasUpdate = records.filter(trackingRecordHasUpdate).length;
                const rows = collapsed ? '' : records.map(record => buildWorkbenchTrackingItemHtml(record, session, context, currentSignature, focusId)).join('');
                return ''
                    + '<section class="jlc-wb-group' + (collapsed ? ' collapsed' : '') + '" data-jlc-group="' + escapeHtml(groupKey) + '">'
                    + '  <button type="button" class="jlc-wb-group-toggle" data-jlc-toggle-group="' + escapeHtml(groupKey) + '">'
                    + '    <span>' + escapeHtml(getTrackingGroupLabel(groupType)) + (hasUpdate ? '（' + hasUpdate + ' 更新）' : '') + '</span>'
                    + '    <small>' + records.length + ' 项</small>'
                    + '  </button>'
                    + '  <div class="jlc-wb-group-body">' + rows + '</div>'
                    + '</section>';
            }).join('');
            root.innerHTML = toolbarHtml + '<div class="jlc-wb-list-scroll" id="jlc-wb-list-scroll">' + groupMarkup + '</div>';
        } else {
            root.innerHTML = toolbarHtml + '<div class="jlc-wb-list-scroll" id="jlc-wb-list-scroll"><div class="jlc-wb-virt" id="jlc-wb-virt"><div class="jlc-wb-virt-window" id="jlc-wb-virt-window"></div></div></div>';
            const body = document.querySelector('#jlc-wb .jlc-wb-body');
            const virt = root.querySelector('#jlc-wb-virt');
            const windowEl = root.querySelector('#jlc-wb-virt-window');
            const offsets = [];
            let totalH = 0;
            flatRows.forEach(row => {
                offsets.push(totalH);
                totalH += row.height;
            });
            virt.style.height = totalH + 'px';
            workbenchVirtState = { flatRows, offsets, totalH, session, context, currentSignature, focusId };

            const paint = () => {
                if (!workbenchVirtState || !body || !windowEl) return;
                const scrollTop = body.scrollTop || 0;
                const viewH = body.clientHeight || 600;
                const pad = 400;
                const startY = Math.max(0, scrollTop - pad);
                const endY = scrollTop + viewH + pad;
                let start = 0;
                while (start < offsets.length - 1 && offsets[start + 1] < startY) start += 1;
                let end = start;
                while (end < offsets.length && offsets[end] < endY) end += 1;
                end = Math.min(flatRows.length, end + 1);
                const slice = flatRows.slice(start, end);
                const top = offsets[start] || 0;
                windowEl.style.transform = 'translateY(' + top + 'px)';
                windowEl.innerHTML = slice.map(row => {
                    if (row.type === 'group') {
                        return '<div class="jlc-wb-virt-row is-group" style="height:' + row.height + 'px">' + buildWorkbenchGroupHeaderHtml(row.groupType, row.records, collapsedState) + '</div>';
                    }
                    return '<div class="jlc-wb-virt-row" style="min-height:' + row.height + 'px">' + buildWorkbenchTrackingItemHtml(row.record, session, context, currentSignature, focusId) + '</div>';
                }).join('');
                // 只绑可视窗口内节点，避免滚动重绘时在 toolbar 上叠监听
                bindWorkbenchTrackingActions(windowEl, list, context, resumePendingIds, refreshResume);
                const sampleItem = windowEl.querySelector('.jlc-wb-item');
                const sampleGroup = windowEl.querySelector('.jlc-wb-group-toggle');
                let changed = false;
                if (sampleItem) {
                    const h = Math.ceil(sampleItem.getBoundingClientRect().height) + 10;
                    if (h > 60 && Math.abs(h - WB_VIRT_ITEM_H) > 2) { WB_VIRT_ITEM_H = h; changed = true; }
                }
                if (sampleGroup) {
                    const gh = Math.ceil(sampleGroup.getBoundingClientRect().height) + 10;
                    if (gh > 30 && Math.abs(gh - WB_VIRT_GROUP_H) > 2) { WB_VIRT_GROUP_H = gh; changed = true; }
                }
                if (changed && !virt.dataset.calibrated) {
                    virt.dataset.calibrated = '1';
                    let nh = 0;
                    const noff = [];
                    flatRows.forEach(row => {
                        row.height = row.type === 'group' ? WB_VIRT_GROUP_H : WB_VIRT_ITEM_H;
                        noff.push(nh);
                        nh += row.height;
                    });
                    workbenchVirtState.offsets = noff;
                    workbenchVirtState.totalH = nh;
                    virt.style.height = nh + 'px';
                    paint();
                }
            };

            if (body && body.dataset.jlcVirtBound !== '1') {
                body.dataset.jlcVirtBound = '1';
                body.addEventListener('scroll', () => {
                    if (workbenchVirtState) paint();
                    scheduleWorkbenchScrollSave();
                }, { passive: true });
            }
            paint();
        }

        const queryInput = root.querySelector('#jlc-wb-tracking-query');
        queryInput?.addEventListener('input', () => {
            persistWorkbenchSession({ tracking: { query: queryInput.value || '' } });
            window.clearTimeout(queryInput._jlcTimer);
            queryInput._jlcTimer = window.setTimeout(() => { void renderWorkbenchTrackingList(); }, 180);
        });
        root.querySelector('[data-jlc-wb-filter-updates]')?.addEventListener('click', () => {
            persistWorkbenchSession({ tracking: { filterUpdatesOnly: !session.tracking.filterUpdatesOnly } });
            void renderWorkbenchTrackingList();
        });
        root.querySelector('[data-jlc-wb-pin-current]')?.addEventListener('click', () => {
            persistWorkbenchSession({ tracking: { pinCurrent: session.tracking.pinCurrent === false } });
            void renderWorkbenchTrackingList();
        });
        root.querySelector('#jlc-wb-group-filter')?.addEventListener('change', (e) => {
            persistWorkbenchSession({ tracking: { groupFilter: e.target.value || 'all' } });
            void renderWorkbenchTrackingList();
        });
        root.querySelector('#jlc-wb-sort')?.addEventListener('change', (e) => {
            persistWorkbenchSession({ tracking: { sort: e.target.value || 'updates_first' } });
            void renderWorkbenchTrackingList();
        });
        root.querySelector('[data-jlc-wb-continue]')?.addEventListener('click', () => {
            const id = session.tracking.focusRecordId || session.tracking.lastOpenedId || '';
            if (!id) {
                showAlert('还没有上次打开记录。');
                return;
            }
            persistWorkbenchSession({ tracking: { focusRecordId: id } });
            const row = root.querySelector('[data-jlc-wb-id="' + CSS.escape(id) + '"]');
            if (row) {
                row.classList.add('is-focus');
                row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                return;
            }
            showAlert('上次打开的项不在当前筛选结果里。');
        });

        if (!useVirtual) {
            bindWorkbenchTrackingActions(root, list, context, resumePendingIds, refreshResume);
        } else {
            // 虚拟模式下条目动作在 paint 内绑定；工具条验证/续刷绑在 root
            root.querySelector('[data-jlc-wb-open-verify]')?.addEventListener('click', () => {
                const verifyRecord = list.find(record => record.id === refreshResume?.record_id)
                    || list.find(record => resumePendingIds.includes(record.id));
                const verifyUrl = compactText(refreshResume?.verify_url || '') || buildTrackingVerifyUrl(verifyRecord);
                if (!verifyUrl) {
                    showAlert('当前没有可打开的验证页面。');
                    return;
                }
                openTrackingVerificationUrl(verifyUrl, { fallbackToNavigate: true });
            });
            root.querySelector('[data-jlc-wb-resume]')?.addEventListener('click', async (event) => {
                if (!resumePendingIds.length) {
                    clearTrackingRefreshResumeState();
                    await renderWorkbenchTrackingList();
                    return;
                }
                const verifyRecord = list.find(record => record.id === refreshResume?.record_id)
                    || list.find(record => resumePendingIds.includes(record.id));
                const verifyUrl = compactText(refreshResume?.verify_url || '') || buildTrackingVerifyUrl(verifyRecord);
                const probe = await probeTrackingVerificationReady(verifyRecord, verifyUrl);
                if (!probe.ok) {
                    if (verifyUrl) openTrackingVerificationUrl(verifyUrl);
                    showAlert((probe.note || '验证尚未生效') + '，请在打开的 JavLibrary 页面完成验证后再点继续。');
                    return;
                }
                clearTrackingRefreshResumeState();
                if (verifyRecord) {
                    clearTrackingVerificationRequired(verifyRecord, { restoreStatus: true });
                    await saveTrackingRecord(verifyRecord);
                }
                void refreshAllTrackingSearches(event.currentTarget, {
                    recordIds: resumePendingIds,
                    total: Number(refreshResume?.total || 0) || resumePendingIds.length,
                    completedBase: Number(refreshResume?.completed || 0) || 0,
                    resumeVerified: true
                });
            });
        }
        const listScroll = root.querySelector('#jlc-wb-list-scroll');
        if (listScroll) {
            // 整表重绘后立刻写回滚动，避免先闪回顶部再被 restore 抢位置
            listScroll.scrollTop = preservedScrollTop;
            if (listScroll.dataset.boundScroll !== '1') {
                listScroll.dataset.boundScroll = '1';
                listScroll.addEventListener('scroll', () => {
                    markWorkbenchListScrolling();
                    scheduleWorkbenchScrollSave();
                }, { passive: true });
            }
        }
        const highlightId = session.tracking.focusRecordId || session.tracking.lastOpenedId || '';
        if (highlightId) {
            root.querySelector('[data-jlc-wb-id="' + CSS.escape(highlightId) + '"]')?.classList.add('is-focus');
        }
        if (options.forceFocus && options.focusId) {
            restoreWorkbenchScroll({
                scrollTop: preservedScrollTop,
                forceFocus: true,
                focusId: options.focusId,
                scrollIntoFocus: true
            });
        }
    }
// @@creamu-part:22-workbench-settings
    function renderWorkbenchViewSettings() {
        const container = document.getElementById('jlc-wb-view-root');
        if (!container) return;
        const items = getLegacySettingsSchema().filter(item => item.type !== 'button');
        const toggles = items.filter(item => item.type === 'toggle');
        const layoutRanges = items.filter(item => item.type === 'range' && (item.key === 'columnNum' || item.key === 'waterfallWidth'));
        const uiRanges = items.filter(item => item.type === 'range' && item.key === 'uiBtnScale');
        const openMode = getWorkbenchSession().openMode || config.open_mode || 'tab';

        const renderRangeRow = (item) => {
            const value = item.key === 'columnNum' ? Status.getColumnNum()
                : item.key === 'uiBtnScale' ? clampUiBtnScale(Status.get(item.key))
                : Status.get(item.key);
            const step = item.step != null ? item.step : 1;
            return ''
                + '<div class="legacy-row">'
                + '  <div style="display:flex;justify-content:space-between;margin-bottom:6px;align-items:center;"><span>' + escapeHtml(item.label) + '</span><b style="color:#d4883a" data-jlc-wb-range-value="' + escapeHtml(item.key) + '">' + value + '</b></div>'
                + '  <div class="legacy-range"><input type="range" data-jlc-wb-range="' + escapeHtml(item.key) + '" min="' + item.min + '" max="' + item.max + '" step="' + step + '" value="' + value + '"></div>'
                + (item.key === 'uiBtnScale' ? '<div class="legacy-note" style="margin-top:6px;">只缩放工作台按钮与悬浮球，列表封面/文字不变。笔记本可试 80–90。</div>' : '')
                + '</div>';
        };

        // 与设置其它页一致：直接 h3 + legacy-row，不再套 view-block 卡片
        container.innerHTML = ''
            + '<h3>列表功能</h3>'
            + toggles.map(item => ''
                + '<div class="legacy-row legacy-toggle' + (item.disabled ? ' disabled' : '') + '">'
                + '  <span>' + escapeHtml(item.label) + '</span>'
                + '  <input type="checkbox" data-jlc-wb-toggle="' + escapeHtml(item.key) + '"' + (Status.get(item.key) ? ' checked' : '') + (item.disabled ? ' disabled' : '') + '>'
                + '</div>').join('')
            + '<h3 style="margin-top:16px">布局</h3>'
            + layoutRanges.map(renderRangeRow).join('')
            + '<h3 style="margin-top:16px">工作台</h3>'
            + uiRanges.map(renderRangeRow).join('')
            + '<div class="legacy-row" style="margin-top:4px;">'
            + '  <div style="margin-bottom:6px;">默认打开方式</div>'
            + '  <select id="jlc-wb-view-open-mode" class="jlc-wb-select" style="width:100%;">'
            + '    <option value="tab"' + (openMode === 'tab' ? ' selected' : '') + '>新标签打开</option>'
            + '    <option value="same"' + (openMode === 'same' ? ' selected' : '') + '>本页打开</option>'
            + '  </select>'
            + '</div>'
            + '<button type="button" class="jlc-wb-btn ghost" data-jlc-wb-action="downloadPanel" style="width:100%;margin-top:8px;">批量下载封面</button>';

        container.querySelectorAll('[data-jlc-wb-toggle]').forEach(input => {
            input.addEventListener('change', () => {
                const key = input.getAttribute('data-jlc-wb-toggle');
                Status.set(key, !!input.checked);
                legacySettingHandlers[key]?.(!!input.checked);
            });
        });
        container.querySelectorAll('[data-jlc-wb-range]').forEach(input => {
            input.addEventListener('input', () => {
                const key = input.getAttribute('data-jlc-wb-range');
                let value = Number(input.value);
                if (key === 'uiBtnScale') value = clampUiBtnScale(value);
                const valueEl = container.querySelector('[data-jlc-wb-range-value="' + CSS.escape(key) + '"]');
                if (valueEl) valueEl.textContent = String(value);
                if (key === 'columnNum') Status.set('columnNum', value);
                else Status.set(key, value);
                legacySettingHandlers[key]?.(value);
            });
        });
        container.querySelectorAll('[data-jlc-wb-action]').forEach(button => {
            button.addEventListener('click', () => {
                const key = button.getAttribute('data-jlc-wb-action');
                legacySettingHandlers[key]?.();
            });
        });
        container.querySelector('#jlc-wb-view-open-mode')?.addEventListener('change', (e) => {
            const next = e.currentTarget.value === 'same' ? 'same' : 'tab';
            config.open_mode = next;
            GM_setValue('jlc_config_stable', config);
            persistWorkbenchSession({ openMode: next });
            updateWorkbenchOpenModeChip();
        });
    }

    function syncWorkbenchSettingsForm() {
        const shell = getWorkbenchEl();
        if (!shell) return;
        // 每次打开都从内存 config 回填，避免密码框/隐藏分区导致“看起来没加载”
        config = loadConfig();
        const url = shell.querySelector('#jlc-wb-i-url');
        const key = shell.querySelector('#jlc-wb-i-key');
        const mt = shell.querySelector('#jlc-wb-i-mt');
        const fav = shell.querySelector('#jlc-wb-i-fav');
        if (url) url.value = config.emby_url || '';
        if (mt) mt.value = config.metatube_url || '';
        if (fav) fav.value = (config.fav_tags || []).join(', ');
        const hiddenSummary = shell.querySelector('#jlc-wb-hidden-summary');
        if (hiddenSummary) {
            try {
                const hiddenWords = Status.get('hiddenWord') || [];
                const hiddenAvids = Status.get('hiddenAvid') || [];
                hiddenSummary.textContent = '屏蔽标题词 ' + hiddenWords.length + ' 个 / 屏蔽番号 ' + hiddenAvids.length + ' 个';
            } catch (_) {
                hiddenSummary.textContent = '屏蔽词状态读取失败';
            }
        }
        if (key) {
            // 已保存密钥时不回填到 password（部分浏览器会丢隐藏 password 值），用占位提示
            if (compactText(config.emby_key || '')) {
                key.value = '';
                key.placeholder = '已保存密钥（留空=不修改，输入新值则覆盖）';
                key.dataset.hasSaved = '1';
            } else {
                key.value = '';
                key.placeholder = '粘贴 Emby API Key';
                key.dataset.hasSaved = '0';
            }
            key.dataset.userEdited = '0';
        }
        const openMode = shell.querySelector('#jlc-wb-open-mode');
        if (openMode) openMode.value = (getWorkbenchSession().openMode || config.open_mode || 'tab');
        const wdUrl = shell.querySelector('#jlc-wb-wd-url');
        const wdUser = shell.querySelector('#jlc-wb-wd-user');
        const wdPass = shell.querySelector('#jlc-wb-wd-pass');
        const wdPath = shell.querySelector('#jlc-wb-wd-path');
        const wdEn = shell.querySelector('#jlc-wb-wd-en');
        const wdAuto = shell.querySelector('#jlc-wb-wd-auto');
        const wdConf = shell.querySelector('#jlc-wb-wd-conflict');
        const wdStatus = shell.querySelector('#jlc-wb-wd-status');
        if (wdUrl) wdUrl.value = config.webdav_url || '';
        if (wdUser) wdUser.value = config.webdav_user || '';
        if (wdPath) wdPath.value = config.webdav_path || '/Creamu';
        if (wdPass) {
            wdPass.value = '';
            wdPass.placeholder = compactText(config.webdav_password || '')
                ? '已保存（留空不修改）'
                : '应用密码，非登录密码';
        }
        if (wdEn) wdEn.checked = !!config.webdav_enabled;
        if (wdAuto) wdAuto.checked = config.webdav_auto !== false;
        if (wdConf) wdConf.value = config.webdav_conflict || 'ask';
        if (wdStatus) {
            const sync = ensureCreamuSync();
            wdStatus.textContent = sync ? sync.statusText() : '同步模块未加载';
        }
        const resourceKeys = ['resource_center', 'resource_trailer', 'resource_screenshot', 'resource_screenshot_auto', 'resource_magnet', 'resource_links'];
        resourceKeys.forEach(k => {
            const input = shell.querySelector('[data-jlc-wb-resource="' + k + '"]');
            if (input) input.checked = config[k] !== false;
        });
        const hint = shell.querySelector('#jlc-wb-config-hint');
        if (hint) {
            if (isLikelyFreshDefaultConfig(config)) {
                hint.hidden = false;
                hint.textContent = '当前像是空配置（默认心动标签、无 Emby）。若以前用过旧版脚本，这通常是因为新脚本有独立存储：请到旧脚本导出备份，再在 设置 → 备份 里导入。';
            } else {
                hint.hidden = true;
                hint.textContent = '';
            }
        }
        updateWorkbenchConfigDiag();
    }

    function activateWorkbenchSettingsTab(tabId = 'resource') {
        const shell = getWorkbenchEl();
        if (!shell) return;
        const next = normalizeWorkbenchSettingsTab(tabId);
        shell.querySelectorAll('[data-jlc-settings-tab]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-jlc-settings-tab') === next);
        });
        shell.querySelectorAll('[data-jlc-settings-panel]').forEach(panel => {
            panel.classList.toggle('is-active', panel.getAttribute('data-jlc-settings-panel') === next);
        });
        persistWorkbenchSession({ settingsSection: next });
        // 含密码字段的页再回填一次，避免 password 空显示
        if (next === 'services' || next === 'backup') syncWorkbenchSettingsForm();
        if (next === 'display') renderWorkbenchViewSettings();
        const body = shell.querySelector('.jlc-wb-settings-body');
        if (body) body.scrollTop = 0;
    }

    function bindWorkbenchSettingsEvents(shell) {
        shell.querySelectorAll('[data-jlc-settings-tab]').forEach(btn => {
            btn.addEventListener('click', () => activateWorkbenchSettingsTab(btn.getAttribute('data-jlc-settings-tab') || 'resource'));
        });
        shell.querySelector('#jlc-wb-settings-close')?.addEventListener('click', () => setWorkbenchSettingsOpen(false));
        shell.querySelector('.jlc-wb-settings')?.addEventListener('click', (e) => {
            if (e.target?.classList?.contains('jlc-wb-settings')) setWorkbenchSettingsOpen(false);
        });
        shell.querySelector('#jlc-wb-i-key')?.addEventListener('input', (e) => {
            e.currentTarget.dataset.userEdited = '1';
        });
        shell.querySelector('#jlc-wb-btn-save')?.addEventListener('click', async () => {
            // 先读回最新 config，防止空 password 覆盖密钥
            const previous = loadConfig();
            const urlVal = shell.querySelector('#jlc-wb-i-url')?.value.trim().replace(/\/$/, '') || '';
            const keyEl = shell.querySelector('#jlc-wb-i-key');
            const keyTyped = keyEl?.value.trim() || '';
            const mtVal = shell.querySelector('#jlc-wb-i-mt')?.value.trim().replace(/\/$/, '') || '';
            const favRaw = shell.querySelector('#jlc-wb-i-fav')?.value;
            const favList = String(favRaw ?? '').split(',').map(s => s.trim()).filter(Boolean);

            config.emby_url = urlVal;
            // 密钥：留空且已有保存值 => 不改；用户输入了才覆盖
            if (keyTyped) {
                config.emby_key = keyTyped;
            } else if (previous.emby_key) {
                config.emby_key = previous.emby_key;
            } else {
                config.emby_key = '';
            }
            config.metatube_url = mtVal;
            // 心动标签：只要 textarea 存在就采用其内容（允许用户清空）
            if (shell.querySelector('#jlc-wb-i-fav')) {
                config.fav_tags = favList;
            }
            // 打开方式：优先设置/显示页下拉，否则沿用 session / 已有 config
            const openModeEl = shell.querySelector('#jlc-wb-open-mode') || shell.querySelector('#jlc-wb-view-open-mode');
            const openMode = openModeEl
                ? (openModeEl.value === 'same' ? 'same' : 'tab')
                : ((getWorkbenchSession().openMode || config.open_mode || previous.open_mode || 'tab') === 'same' ? 'same' : 'tab');
            config.open_mode = openMode;
            ['resource_center', 'resource_trailer', 'resource_screenshot', 'resource_screenshot_auto', 'resource_magnet', 'resource_links'].forEach(k => {
                const input = shell.querySelector('[data-jlc-wb-resource="' + k + '"]');
                if (input) config[k] = !!input.checked;
            });
            config.webdav_url = (shell.querySelector('#jlc-wb-wd-url')?.value || '').trim();
            config.webdav_user = (shell.querySelector('#jlc-wb-wd-user')?.value || '').trim();
            config.webdav_path = (shell.querySelector('#jlc-wb-wd-path')?.value || '').trim() || '/Creamu';
            const wdPassTyped = shell.querySelector('#jlc-wb-wd-pass')?.value || '';
            if (wdPassTyped) config.webdav_password = wdPassTyped;
            config.webdav_enabled = !!shell.querySelector('#jlc-wb-wd-en')?.checked;
            config.webdav_auto = !!shell.querySelector('#jlc-wb-wd-auto')?.checked;
            config.webdav_conflict = shell.querySelector('#jlc-wb-wd-conflict')?.value || 'ask';
            GM_setValue('jlc_config_stable', config);
            if (previous.metatube_url !== config.metatube_url) clearMetaMissCache();
            persistWorkbenchSession({ openMode });
            try { ensureCreamuSync()?.markLocalDirty(); } catch (_) {}
            await loadRadarData();
            await refreshLibraryUI();
            refreshCommanderDecorations();
            renderDetailResourceCenter(true);
            syncWorkbenchSettingsForm();
            showAlert('设置已保存并应用！');
        });
        shell.querySelector('#jlc-wb-btn-sync')?.addEventListener('click', () => { void syncEmby(); });
        shell.querySelector('#jlc-wb-btn-rescan')?.addEventListener('click', () => {
            refreshCommanderDecorations(document, { clearMetaMisses: true });
            renderDetailResourceCenter(true);
            showAlert('已重新扫描当前页！');
        });
        shell.querySelector('#jlc-wb-btn-export')?.addEventListener('click', exportBackup);
        shell.querySelector('#jlc-wb-btn-export-config')?.addEventListener('click', () => { void exportConfigOnly(); });
        shell.querySelector('#jlc-wb-btn-import')?.addEventListener('click', () => { void importBackup({ mode: 'full' }); });
        shell.querySelector('#jlc-wb-btn-import-config')?.addEventListener('click', () => { void importBackup({ mode: 'config' }); });
        shell.querySelector('#jlc-wb-btn-integrity')?.addEventListener('click', () => {
            if (typeof showDataIntegrityReport === 'function') void showDataIntegrityReport();
            else showAlert('检查功能未就绪', true);
        });
        // 屏蔽词已内联在「过滤」主 Tab，不再跳转 TabPanel

        const applyWdFormToConfig = () => {
            config.webdav_url = (shell.querySelector('#jlc-wb-wd-url')?.value || '').trim();
            config.webdav_user = (shell.querySelector('#jlc-wb-wd-user')?.value || '').trim();
            config.webdav_path = (shell.querySelector('#jlc-wb-wd-path')?.value || '').trim() || '/Creamu';
            const typed = shell.querySelector('#jlc-wb-wd-pass')?.value || '';
            if (typed) config.webdav_password = typed;
            config.webdav_enabled = !!shell.querySelector('#jlc-wb-wd-en')?.checked;
            config.webdav_auto = !!shell.querySelector('#jlc-wb-wd-auto')?.checked;
            config.webdav_conflict = shell.querySelector('#jlc-wb-wd-conflict')?.value || 'ask';
            GM_setValue('jlc_config_stable', config);
        };
        const refreshWdStatus = () => {
            const el = shell.querySelector('#jlc-wb-wd-status');
            const sync = ensureCreamuSync();
            if (el) el.textContent = sync ? sync.statusText() : '同步模块未加载';
        };
        shell.querySelector('#jlc-wb-wd-test')?.addEventListener('click', async () => {
            applyWdFormToConfig();
            const sync = ensureCreamuSync();
            if (!sync) return showAlert('同步模块未加载', true);
            try {
                await sync.testConnection();
                refreshWdStatus();
            } catch (e) {
                showAlert('测试失败：' + (e?.message || e), true);
                refreshWdStatus();
            }
        });
        shell.querySelector('#jlc-wb-wd-sync')?.addEventListener('click', async () => {
            applyWdFormToConfig();
            try {
                await ensureCreamuSync().syncNow({});
                refreshWdStatus();
            } catch (e) {
                showAlert('同步失败：' + (e?.message || e), true);
                refreshWdStatus();
            }
        });
        shell.querySelector('#jlc-wb-wd-push')?.addEventListener('click', async () => {
            applyWdFormToConfig();
            try {
                await ensureCreamuSync().syncNow({ force: 'push' });
                refreshWdStatus();
            } catch (e) {
                showAlert('推送失败：' + (e?.message || e), true);
            }
        });
        shell.querySelector('#jlc-wb-wd-pull')?.addEventListener('click', async () => {
            applyWdFormToConfig();
            try {
                await ensureCreamuSync().syncNow({ force: 'pull' });
                refreshWdStatus();
            } catch (e) {
                showAlert('拉取失败：' + (e?.message || e), true);
            }
        });
        shell.querySelector('#jlc-wb-btn-diag')?.addEventListener('click', () => {
            config = loadConfig();
            syncWorkbenchSettingsForm();
            updateWorkbenchConfigDiag();
            const d = describeLiveConfig();
            showAlert(
                '配置回读：\nEmby ' + (d.emby_url || '空')
                + '\n密钥 ' + (d.emby_key_len ? (d.emby_key_len + ' 位 ' + d.emby_key_preview) : '空')
                + '\n心动 ' + (d.fav_tags.join(' / ') || '空'),
                true
            );
        });
        shell.querySelector('#jlc-wb-btn-add-p')?.addEventListener('click', async () => {
            const input = shell.querySelector('#jlc-wb-i-new-p');
            const name = compactText(input?.value || '');
            if (!name || config.custom_persons.includes(name)) return;
            config.custom_persons.push(name);
            GM_setValue('jlc_config_stable', config);
            if (input) input.value = '';
            await loadRadarData();
            await refreshLibraryUI();
            refreshCommanderDecorations();
        });
    }
// @@creamu-part:23-workbench-shell
    function createWorkbenchV3() {
        initWorkbenchV3Styles();

        if (!document.getElementById('jlc-wb-fab')) {
            const fab = document.createElement('button');
            fab.id = 'jlc-wb-fab';
            fab.type = 'button';
            fab.title = 'Creamu · JavLibrary（可拖动）';
            fab.innerHTML = '<span>⌘</span><span class="jlc-wb-fab-badge">0</span>';
            document.body.appendChild(fab);
            bindWorkbenchFabDrag(fab);
        } else {
            bindWorkbenchFabDrag(document.getElementById('jlc-wb-fab'));
        }

        if (document.getElementById('jlc-wb')) return;

        const shell = document.createElement('div');
        shell.id = 'jlc-wb';
        shell.innerHTML = ''
            + '<div class="jlc-wb-resize-w" title="拖拽调整宽度"></div>'
            + '<div class="jlc-wb-resize-h" title="拖拽调整高度"></div>'
            + '<div class="jlc-wb-resize-corner" title="拖拽调整大小"></div>'
            + '<div class="jlc-wb-header" title="按住标题栏拖动窗口">'
            + '  <div><div class="jlc-wb-title">Creamu · JavLibrary</div><div class="jlc-wb-subtitle" id="jlc-wb-header-sub">加载中… · 可拖动</div></div>'
            + '  <div class="jlc-wb-header-actions">'
            + '    <button type="button" class="jlc-wb-chip" id="jlc-wb-open-mode-toggle" title="切换默认打开方式">新标签</button>'
            + '    <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-settings-btn" title="设置">⚙</button>'
            + '    <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-min-btn" title="收起">—</button>'
            + '    <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-close-btn" title="关闭">×</button>'
            + '  </div>'
            + '</div>'
            + '<div class="jlc-wb-nav">'
            + '  <button type="button" data-nav="tracking" class="active">追更</button>'
            + '  <button type="button" data-nav="library">库</button>'
            + '  <button type="button" data-nav="filter">过滤</button>'
            + '</div>'
            + '<div class="jlc-wb-body">'
            + '  <div data-jlc-wb-page="tracking"><div id="jlc-wb-tracking-root"></div></div>'
            + '  <div data-jlc-wb-page="library" hidden><div id="jlc-wb-library-root" style="padding:14px;overflow:auto;flex:1;min-height:0;">'
            + '    <div class="jlc-wb-view-block"><div class="jlc-wb-view-title">熟人与统计</div>'
            + '      <div class="stat-box"><div class="stat-item"><b id="jlc-wb-st-m">0</b><span>影片</span></div><div class="stat-item"><b id="jlc-wb-st-p">0</b><span>追踪</span></div><div class="stat-item"><b id="jlc-wb-st-v">0</b><span>已阅</span></div></div>'
            + '      <div class="legacy-note" style="margin:0 0 10px;">Emby 影片/熟人缓存统计；下方可手动加熟人。</div>'
            + '      <div style="display:flex;gap:6px;"><input id="jlc-wb-i-new-p" type="text" placeholder="手动添加演员/导演" style="flex:1"><button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-add-p">+</button></div>'
            + '      <div id="jlc-wb-person-list" style="margin-top:10px;"></div>'
            + '    </div></div></div>'
            + '  <div data-jlc-wb-page="filter" hidden><div id="jlc-wb-filter-root" style="padding:14px;overflow:auto;flex:1;min-height:0;">'
            + '    <div class="jlc-wb-view-block"><div class="jlc-wb-view-title">心动标签</div>'
            + '      <div class="legacy-note" style="margin:0 0 8px;">列表高亮你关心的标签。回车或失焦即保存。</div>'
            + '      <textarea id="jlc-wb-i-fav" rows="3" placeholder="女优, 巨乳, … 逗号分隔"></textarea>'
            + '    </div>'
            + '    <div class="jlc-wb-view-block"><div class="jlc-wb-view-title">屏蔽标题词</div>'
            + '      <div class="legacy-note" style="margin:0 0 8px;">标题含这些词会淡化/隐藏。回车添加，点 × 删除。</div>'
            + '      <div id="jlc-wb-tags-hidden-word" class="jlc-wb-tag-editor" data-key="hiddenWord" data-placeholder="输入词后回车，支持逗号批量"></div>'
            + '    </div>'
            + '    <div class="jlc-wb-view-block"><div class="jlc-wb-view-title">屏蔽番号</div>'
            + '      <div class="legacy-note" style="margin:0 0 8px;">单个或系列前缀，如 SSIS、OPX-123。</div>'
            + '      <div id="jlc-wb-tags-hidden-avid" class="jlc-wb-tag-editor" data-key="hiddenAvid" data-placeholder="输入番号后回车，支持逗号批量"></div>'
            + '    </div>'
            + '    <div class="legacy-note" id="jlc-wb-hidden-summary" style="margin:4px 0 0;">—</div>'
            + '  </div></div>'
            + '</div>'
            + '<div class="jlc-wb-footer">'
            + '  <div class="jlc-wb-footer-summary" id="jlc-wb-footer-summary">—</div>'
            + '  <div style="display:flex;gap:8px;flex-wrap:wrap;">'
            + '    <button type="button" class="jlc-wb-btn primary" id="jlc-wb-save-current">⭐ 收藏当前</button>'
            + '    <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-refresh-all">刷新全部</button>'
            + '    <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-sync-now" title="先同步 Emby，再推送 WebDAV（含点击/心动/追更/屏蔽词）">☁ 立即同步</button>'
            + '  </div>'
            + '</div>'
            + '<div class="jlc-wb-settings" id="jlc-wb-settings">'
            + '  <div class="jlc-wb-settings-panel">'
            + '    <div class="jlc-wb-settings-head">'
            + '      <strong>设置</strong>'
            + '      <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-settings-close">×</button>'
            + '    </div>'
            + '    <div class="jlc-wb-settings-nav" id="jlc-wb-settings-nav">'
            + '      <button type="button" data-jlc-settings-tab="resource" class="active">资源</button>'
            + '      <button type="button" data-jlc-settings-tab="display">显示</button>'
            + '      <button type="button" data-jlc-settings-tab="services">服务</button>'
            + '      <button type="button" data-jlc-settings-tab="backup">备份</button>'
            + '    </div>'
            + '    <div id="jlc-wb-config-hint" class="legacy-note" hidden style="margin:0;padding:10px 12px;background:#2a1f10;border-bottom:1px solid #5a4020;color:#fde68a;line-height:1.5;"></div>'
            + '    <div class="jlc-wb-settings-body">'
            // —— 资源：详情页增强 ——
            + '      <section class="jlc-wb-settings-section is-active" data-jlc-settings-panel="resource">'
            + '        <h3>详情页资源</h3>'
            + '        <div class="legacy-note" style="margin:0 0 10px;">控制详情页资源中心各模块，点底部「保存并应用」后生效。</div>'
            + '        <div class="legacy-row legacy-toggle"><span>详情页资源中心</span><input type="checkbox" data-jlc-wb-resource="resource_center"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>预告片模块</span><input type="checkbox" data-jlc-wb-resource="resource_trailer"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>截图模块</span><input type="checkbox" data-jlc-wb-resource="resource_screenshot"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>截图自动展开</span><input type="checkbox" data-jlc-wb-resource="resource_screenshot_auto"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>磁力模块</span><input type="checkbox" data-jlc-wb-resource="resource_magnet"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>站外链接</span><input type="checkbox" data-jlc-wb-resource="resource_links"></div>'
            + '      </section>'
            // —— 服务：Emby / MetaTube / WebDAV ——
            + '      <section class="jlc-wb-settings-section" data-jlc-settings-panel="services">'
            + '        <h3>Emby / MetaTube</h3>'
            + '        <div id="jlc-wb-config-diag" class="legacy-note" style="margin:0 0 12px;padding:10px 12px;background:#1a222c;border:1px solid #334;border-radius:10px;color:#cde;line-height:1.6;"></div>'
            + '        <label>Emby 地址</label><input id="jlc-wb-i-url" type="text" placeholder="http://emby.example:8096">'
            + '        <label>Emby API Key</label><input id="jlc-wb-i-key" type="password">'
            + '        <div class="legacy-note">密钥框留空=不修改已保存值；只有输入新内容才会覆盖。</div>'
            + '        <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-sync" style="width:100%;margin-top:8px;">🔄 立即同步 Emby</button>'
            + '        <label>MetaTube Server</label><input id="jlc-wb-i-mt" type="text" placeholder="http://127.0.0.1:1234">'
            + '        <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-diag" style="width:100%;margin-top:8px;">🔍 重新读取并显示配置</button>'
            + '        <h3 style="margin-top:16px">WebDAV 同步</h3>'
            + '        <div class="legacy-note">通用 WebDAV（坚果云 / Nextcloud / 群晖等）。读写 {路径}/jlc.vault.json。坚果云请用应用密码。</div>'
            + '        <label>地址</label><input id="jlc-wb-wd-url" type="text" placeholder="https://dav.jianguoyun.com/dav/">'
            + '        <label>用户名</label><input id="jlc-wb-wd-user" type="text" placeholder="邮箱 / 用户名" autocomplete="username">'
            + '        <label>应用密码</label><input id="jlc-wb-wd-pass" type="password" placeholder="应用密码，非登录密码" autocomplete="new-password">'
            + '        <label>远端路径</label><input id="jlc-wb-wd-path" type="text" placeholder="/Creamu">'
            + '        <div class="legacy-row legacy-toggle"><span>启用同步</span><input type="checkbox" id="jlc-wb-wd-en"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>打开时自动同步</span><input type="checkbox" id="jlc-wb-wd-auto"></div>'
            + '        <label>冲突策略</label><select id="jlc-wb-wd-conflict" class="jlc-wb-select" style="width:100%;margin-top:6px;"><option value="ask">询问</option><option value="remote">云端优先</option><option value="local">本机优先</option></select>'
            + '        <div class="legacy-note" id="jlc-wb-wd-status" style="margin-top:8px;">—</div>'
            + '        <div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;">'
            + '          <button type="button" class="jlc-wb-btn primary" id="jlc-wb-wd-test" style="flex:1;min-width:100px;">测试连接</button>'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-wd-sync" style="flex:1;min-width:100px;">立即同步</button>'
            + '        </div>'
            + '        <div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;">'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-wd-push" style="flex:1;">强制推送</button>'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-wd-pull" style="flex:1;">强制拉取</button>'
            + '        </div>'
            + '      </section>'
            // —— 显示：列表/布局/按钮缩放（renderWorkbenchViewSettings 填充）——
            + '      <section class="jlc-wb-settings-section" data-jlc-settings-panel="display">'
            + '        <div id="jlc-wb-view-root"></div>'
            + '      </section>'
            // —— 备份：导入导出 ——
            + '      <section class="jlc-wb-settings-section" data-jlc-settings-panel="backup">'
            + '        <h3>导入 / 导出</h3>'
            + '        <div class="legacy-note" style="margin-bottom:10px;">配置/追更/Emby 按脚本安装隔离。从旧脚本迁移：先导出 → 再在这里导入。</div>'
            + '        <div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;">'
            + '          <button type="button" class="jlc-wb-btn primary" id="jlc-wb-btn-import-config" style="flex:1;min-width:120px;">仅导入配置</button>'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-import" style="flex:1;min-width:120px;">完整导入</button>'
            + '        </div>'
            + '        <div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;">'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-export-config" style="flex:1;min-width:120px;">导出配置</button>'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-export" style="flex:1;min-width:120px;">完整导出</button>'
            + '        </div>'
            + '        <div class="legacy-note">完整备份不含 meta_cache。</div>'
            + '        <h3 style="margin-top:14px">数据检查</h3>'
            + '        <div class="legacy-note" style="margin-bottom:8px;">查看本机断点、浏览时间与点击记录数量。</div>'
            + '        <button type="button" class="jlc-wb-btn primary" id="jlc-wb-btn-integrity" style="width:100%;">🩺 检查断点·浏览·点击</button>'
            + '        <pre id="jlc-wb-data-integrity" class="legacy-note" hidden style="margin-top:10px;white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto;font-size:12px;line-height:1.45;"></pre>'
            + '      </section>'
            + '    </div>'
            + '    <div class="jlc-wb-settings-footer">'
            + '      <button type="button" class="jlc-wb-btn primary" id="jlc-wb-btn-save" style="width:100%;">💾 保存并应用</button>'
            + '      <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-rescan" style="width:100%;">🔁 重扫当前页</button>'
            + '    </div>'
            + '  </div>'
            + '</div>';
        document.body.appendChild(shell);
        applyWorkbenchShellGeometry();
        bindWorkbenchResize(shell);
        bindWorkbenchDrag(shell);
        // 列表滚动绑在 #jlc-wb-list-scroll（渲染后挂），body 本身不再滚动，避免抢事件
        shell.querySelector('.jlc-wb-settings-body')?.addEventListener('scroll', scheduleWorkbenchScrollSave, { passive: true });
        shell.querySelector('#jlc-wb-library-root')?.addEventListener('scroll', scheduleWorkbenchScrollSave, { passive: true });
        shell.querySelector('#jlc-wb-filter-root')?.addEventListener('scroll', scheduleWorkbenchScrollSave, { passive: true });
        shell.querySelectorAll('.jlc-wb-nav button').forEach(btn => {
            btn.addEventListener('click', () => { void activateWorkbenchNav(btn.dataset.nav || 'tracking'); });
        });
        shell.querySelector('#jlc-wb-close-btn')?.addEventListener('click', closeWorkbenchV3);
        shell.querySelector('#jlc-wb-min-btn')?.addEventListener('click', closeWorkbenchV3);
        shell.querySelector('#jlc-wb-settings-btn')?.addEventListener('click', () => {
            const session = getWorkbenchSession();
            const next = !session.settingsOpen;
            setWorkbenchSettingsOpen(next);
            if (next) {
                syncWorkbenchSettingsForm();
                void refreshLibraryUI();
            }
        });
        shell.querySelector('#jlc-wb-open-mode-toggle')?.addEventListener('click', () => {
            const session = getWorkbenchSession();
            const next = session.openMode === 'tab' ? 'same' : 'tab';
            config.open_mode = next;
            GM_setValue('jlc_config_stable', config);
            persistWorkbenchSession({ openMode: next });
            updateWorkbenchOpenModeChip();
            showAlert(next === 'tab' ? '默认改为新标签打开。' : '默认改为本页打开。');
        });
        shell.querySelector('#jlc-wb-save-current')?.addEventListener('click', async () => {
            const currentContext = getCurrentTrackingPageContext();
            if (!currentContext) {
                showAlert('当前页面还不是可收藏的列表页。');
                return;
            }
            const customLabel = await showWorkbenchPrompt({
                title: '收藏当前搜索',
                note: '可填写备注名，留空则使用自动标题。',
                value: '',
                placeholder: '备注名（可选）'
            });
            if (customLabel === null) return;
            const record = await createOrUpdateTrackingFromContext(currentContext, {
                createIfMissing: true,
                touchBrowse: true,
                checkTop: true,
                updateCheck: true,
                seedSeen: true,
                customLabel
            });
            trackingPageState.record = record;
            trackingPageState.context = currentContext;
            trackingPageState.signature = currentContext.query_signature;
            trackingPageTouchSignature = currentContext.query_signature;
            applyTrackingPageDecorations(record);
            ensureTrackingPageBar({ context: currentContext, record });
            await renderWorkbenchTrackingList();
            showAlert('当前搜索已加入追更！');
        });
        shell.querySelector('#jlc-wb-refresh-all')?.addEventListener('click', (event) => {
            if (getTrackingRefreshRuntimeState()) return;
            void refreshAllTrackingSearches(event.currentTarget);
        });
        shell.querySelector('#jlc-wb-sync-now')?.addEventListener('click', (event) => {
            const btn = event.currentTarget;
            if (btn?.disabled) return;
            if (typeof syncEmbyAndWebDav === 'function') {
                void syncEmbyAndWebDav({ button: btn });
            } else {
                showAlert('同步功能未就绪', true);
            }
        });

        bindWorkbenchSettingsEvents(shell);
        updateWorkbenchOpenModeChip();
        syncWorkbenchSettingsForm();
        if (!workbenchUiBound) {
            workbenchUiBound = true;
            window.addEventListener('pagehide', () => {
                captureWorkbenchScroll();
            });
        }
    }

    function updateWorkbenchOpenModeChip() {
        const chip = document.getElementById('jlc-wb-open-mode-toggle');
        if (!chip) return;
        const mode = getWorkbenchSession().openMode || config.open_mode || 'tab';
        chip.textContent = mode === 'same' ? '本页' : '新标签';
        chip.classList.toggle('is-on', mode === 'tab');
    }

    async function restoreWorkbenchSession() {
        createWorkbenchV3();
        const session = getWorkbenchSession();
        updateWorkbenchOpenModeChip();
        if (session.panelOpen) {
            openWorkbenchV3(normalizeWorkbenchMainNav(session.nav));
            if (session.settingsOpen) {
                setWorkbenchSettingsOpen(true, session.settingsSection || '');
                syncWorkbenchSettingsForm();
                await refreshLibraryUI();
            }
        } else {
            await refreshWorkbenchFabBadge();
        }
    }
// @@creamu-part:24-app-runtime
    function collectCommanderMutationItems(mutations) {
        const items = new Set();
        const isPendingItem = (item) => item
            && item.dataset?.jlcBaseDone !== '1'
            && !item.classList?.contains?.('jlc-final-done');
        Array.from(mutations || []).forEach(mutation => {
            Array.from(mutation?.addedNodes || []).forEach(node => {
                if (!node || node.nodeType !== 1) return;
                if (node.matches?.('.item-b')) {
                    items.add(node);
                    return;
                }
                const owner = node.closest?.('.item-b');
                if (owner) {
                    if (isPendingItem(owner)) items.add(owner);
                    return;
                }
                node.querySelectorAll?.('.item-b').forEach(item => items.add(item));
            });
        });
        return items;
    }

    function ensureCommanderObserver() {
        if (commanderObserver) return;
        commanderObserver = new MutationObserver((mutations) => {
            const items = collectCommanderMutationItems(mutations);
            const queuedCount = queueCommanderItems(items);
            if (queuedCount) {
                const hasIncompleteItem = Array.from(items).some(item => (
                    typeof getCommanderItemAvid !== 'function' || !getCommanderItemAvid(item)
                ));
                if (hasIncompleteItem) scheduleCommanderRescan(2);
                scheduleTrackingPageRefresh(false);
            }
        });
        if (document.body) {
            commanderObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    /** 启动：先可点 UI，再异步拉 DB / 追更 / WebDAV */
    async function startIntegratedApp() {
        try {
            initCommanderStyles();
            initWorkbenchV3Styles();
        } catch (e) {
            console.warn('[Creamu] styles', e);
        }

        let dbReady;
        try {
            dbReady = initDB();
        } catch (e) {
            console.warn('[Creamu] initDB', e);
        }

        try {
            createWorkbenchV3();
        } catch (e) {
            console.warn('[Creamu] workbench', e);
        }

        try {
            bindMetaSweepEvents();
            new Page();
        } catch (e) {
            console.error('[Creamu] Page', e);
        }

        ensureCommanderObserver();
        try {
            await dbReady;
        } catch (e) {
            console.warn('[Creamu] initDB', e);
        }

        try {
            await loadRadarData();
        } catch (e) {
            console.warn('[Creamu] radar', e);
        }

        try {
            await restoreWorkbenchSession();
            await refreshLibraryUI();
            ensureStandaloneCommanderEntry();
            renderDetailResourceCenter();
            refreshCommanderDecorations?.(document, {
                scheduleRescan: false,
                syncTracking: false
            });
        } catch (e) {
            console.warn('[Creamu] library', e);
        }

        try {
            const queuedCount = runCommanderScanner(document.getElementById('grid-b') || document, true);
            if (queuedCount) scheduleCommanderRescan(10);
        } catch (_) { /* ignore */ }

        void Promise.resolve()
            .then(() => syncTrackingPageState(true))
            .catch((e) => console.warn('[Creamu] tracking', e));

        primeJavLibraryComboOptionSnapshotFromCurrentPage();

        void Promise.resolve()
            .then(async () => {
                const sync = ensureCreamuSync();
                if (sync) await sync.bootSync();
            })
            .catch((e) => console.warn('[Creamu] WebDAV', e));

        if (!configMigrationHintShown && isLikelyFreshDefaultConfig()) {
            configMigrationHintShown = true;
            window.setTimeout(() => {
                showAlert('未读到 Emby/自定义心动标签。若以前用过旧版：请用旧脚本导出备份，再在设置 → 备份 → 导入。', true);
            }, 1200);
        }

        window.setTimeout(() => {
            const queuedCount = runCommanderScanner(document.getElementById('grid-b') || document, true);
            if (queuedCount) scheduleCommanderRescan(8);
            renderDetailResourceCenter();
        }, 900);
        window.setTimeout(() => {
            const queuedCount = runCommanderScanner(document.getElementById('grid-b') || document, true);
            if (queuedCount) scheduleCommanderRescan(10);
            renderDetailResourceCenter();
        }, 2200);

        const detailContext = getCurrentDetailContext();
        if (detailContext?.avid) {
            getVal('videos', detailContext.avid).then(data => {
                const current = data || { avid: detailContext.avid, clicked: true, status: 'none' };
                current.clicked = true;
                setVal('videos', current);
            }).catch(() => {});
        }
    }
// @@creamu-part:details
    let showAlert = (msg,close) => {
        let $alert=$(`<div  class="alert-zdy" >${msg}</div>`);
        if(close){
            let $close = $(`<div style="display: inline-block;padding: 0 0 0 10px;color:gray;cursor: pointer;">X</div>`);
            $alert.append($close);
            $close.on("click",()=>$alert.hide());
        }
        $('body').append($alert);
        $alert.show({start:function(){
            $(this).css({'margin-top': -$(this).height() / 2  ,'margin-left': -$(this).width() / 2 });
        }});
        if(!close){$alert.delay(3000).fadeOut()};
    }

    //图片加载时的回调函数
    let imgCallback =  (img)=> {
        if (Status.isHalfImg()) {
            if(img.height < img.width){
                img.style= halfImgCSS ;
            }else{
                img.style= fullImgCSS ;
            }
        }else{
            //大图模式下，对大于标准比例(以ipx的封面为准)的图片进行缩小
            if(img.height/img.width>=0.7){
                img.style= `width:${img.width*67.25/img.height}%;` ;
            }else{
                img.style= fullImgCSS ;
            }
        }
    }

    let Status = {
        halfImg_block:false,//是否屏蔽竖图模式，默认为否
        set : function(key,value){
            const origKey = key;
            if(key=="columnNum") {
                key=key+(this.isHalfImg()?"Half":"Full");
            }else if(key=="waterfallWidth"){
                key=key+"_"+currentWeb;//宽度为各网站独立属性
            }
            const ret = GM_setValue(key, value);
            // 本机专用偏好（如按钮缩放）不标脏、不进 WebDAV
            const localOnly = typeof isStatusPrefLocalOnly === 'function' && isStatusPrefLocalOnly(origKey);
            if (!localOnly) {
                try {
                    if (typeof markStatusPrefsDirty === 'function') markStatusPrefsDirty();
                } catch (_) { /* ignore */ }
            }
            // 过滤摘要即时刷新
            if (origKey === 'hiddenWord' || origKey === 'hiddenAvid') {
                try {
                    if (typeof syncWorkbenchSettingsForm === 'function') syncWorkbenchSettingsForm();
                } catch (_) { /* ignore */ }
            }
            return ret;
        },
        get : function(key){
            return GM_getValue(key=="waterfallWidth"?(key+"_"+currentWeb):key, statusDefault[key]);
        },
        //是否为竖图模式
        isHalfImg: function () {
            return this.get("halfImg") && (!this.halfImg_block);
        },
        //获取列数
        getColumnNum: function () {
            var key= 'columnNum'+(this.isHalfImg()?"Half":"Full");
            return this.get(key);
        }
    };
    //弹窗类，用于展示演员,样品图和磁力
    class Popover{
        show(){
            document.documentElement.classList.add("scrollBarHide");
            this.element.show({duration:0,start:function(){
                var t=$(this).find('#modal-div');
                t.css({'margin-top': Math.max(0, ($(window).height() - t.height()) / 2) });
            }});
        }
        hide(){
            document.documentElement.classList.remove("scrollBarHide");
            this.element.hide();
            this.element.find('.pop-up-tag').hide();
        }
        init(){
            var me=this;
            me.element = $('<div  id="myModal"><div  id="modal-div" > </div></div>');
            me.element.on('click',function(e){
                if($(e.target).closest("#modal-div").length==0){
                    me.hide();
                }
            });
            me.scrollBarWidth = me.getScrollBarWidth();
            GM_addStyle('.scrollBarHide{ padding-right: ' + me.scrollBarWidth + 'px;overflow:hidden;}');
            $('body').append(me.element);
            //加载javbus的图片浏览插件
            if(currentWeb=="javbus"){
                me.element.magnificPopup({
                    delegate: 'a.sample-box-zdy:visible',
                    type: 'image',
                    closeOnContentClick: false,
                    closeBtnInside: false,
                    mainClass: 'mfp-with-zoom mfp-img-mobile',
                    image: {verticalFit: true},
                    gallery: { enabled: true},
                    zoom: {enabled: true,duration: 300,opener: function (element) {return element.find('img');}}
                });
            }
        }
        append(elem){
            if(!this.element){ this.init();}
            this.element.find("#modal-div").append(elem);
            return this;
        }
        //获取滚动条的宽度
        getScrollBarWidth() {
            var el = document.createElement("p");
            var styles = {width: "100px",height: "100px",overflowY: "scroll" };
            for (var i in styles) {
                el.style[i] = styles[i];
            }
            document.body.appendChild(el);
            var scrollBarWidth = el.offsetWidth - el.clientWidth;
            el.remove();
            return scrollBarWidth;
        }
    }

    class SettingMenu {
        constructor() {
            createWorkbenchV3();

            let version = Status.get('version');
            if (version != VERSION) {
                if (!version) {
                    setTimeout(() => openCommanderPanel('tracking'), 120);
                }
                showAlert(NOTICE, true);
                Status.set('version', VERSION);
            }
        }
    }


    const notice = ($menu)=>{
        let version = Status.get("version");
        if(version != VERSION){
            if(!version){
                $menu.slideDown();
            }
            showAlert(NOTICE,true);
            Status.set("version",VERSION);
        }
    }
    function showMagnetTable(itemID,avid,href,elem) {
        if ($(elem).hasClass("span-loading")) {return;}
        let tagName = `${itemID}${AVINFO_SUFFIX}`;
        let $el=$(`.pop-up-tag[name='${tagName}']`);
        if ($el.length > 0) {
            $el.show();myModal.show();
        } else {
            $(elem).addClass("span-loading");
            Promise.resolve().then(()=>{
                switch(currentWeb) {
                    case "javbus": {
                        return getMagnet4JavBus(href,tagName)
                    }
                    case "javdb": {
                        return getMagnet4JavDB(href,tagName,itemID)
                    }
                }
            }).then((dom)=>{
                myModal.append(dom).show();
            }).catch(err=>alert(err)).then(()=>$(elem).removeClass("span-loading"));
        }
    }
    //获取javdb的演员磁力信息
    async function getMagnet4JavDB(href,tagName,itemID) {
        let doc = await fetch(href).then(response => response.text());
        let $doc=$($.parseHTML(doc));
        let info = $(`<div class="pop-up-tag" name="${tagName}"></div>`);
        if(Status.get("avInfo")){
            let actors= $doc.find("div.video-meta-panel .panel-block").toArray().find(el=> $(el).find("a[href^='/actors/']").length>0);
            $(actors).find("a").attr("target","_blank");
            let preview_images= $doc.find(".columns").toArray().find(el=> $(el).find("div.tile-images.preview-images").length>0);
            let $preview_images = $(preview_images);
            $preview_images.find(".preview-video-container").attr("href",`#preview-video-${itemID}`);
            $preview_images.find("#preview-video").attr("id",`preview-video-${itemID}`);
            $preview_images.find("img[data-src]").each((i,el)=> $(el).attr("src",$(el).attr("data-src")));
            info.append(actors);info.append(preview_images);
        }
        let magnetTable = $doc.find(`div.columns[data-controller="movie-tab"]`);
        magnetTable.find("div.top-meta").remove();// 移除广告
        info.append(magnetTable);
        return info;
    };
    // javbus：获取演员磁力信息
    async function getMagnet4JavBus(href, tagName) {
        let {gid,dom} = await avInfofetch(href,tagName);
        //有码和欧美 0  无码 1
        let uc_code = location.pathname.search(/(uncensored|mod=uc)/) < 1 ? 0 : 1;
        let url = `${location.protocol}//${location.hostname}/ajax/uncledatoolsbyajax.php?gid=${gid}&lang=zh&img=&uc=${uc_code}&floor=` + Math.floor(Math.random() * 1e3 + 1);
        let doc = await fetch(url).then(response => response.text());
        let table_html = doc.substring(0, doc.indexOf('<script')).trim();
        let table_tag = $(`<table class="table pop-up-tag" name="${tagName}" style="background-color:#FFFFFF;" ></table>`);
        table_tag.append($(table_html));
        table_tag.find("tr").each(function (i) { // 遍历 tr
            let $a = $(this).find('a');
            if ($a.length) {
               let magent_url = $a[0].href;
               $(this).prepend(creatCopybutton(magent_url));
            }
        });
        dom.push(table_tag);
        return dom;
    };
    //javbus：磁力链接添加复制按钮
    function creatCopybutton(text) {
        let $copyButton = $(`<td><button class="center-block">${lang.copyButton}</button></td>`);
        $copyButton.find("button").click(function () {
            GM_setClipboard(text);
            showAlert(lang.copySuccess);
        });
        return $copyButton;
    }
    //javbus：获取详情页面的 演员表和样品图元素
    async function avInfofetch(href,tagName) {
        let doc = await fetch(href).then(response => response.text())
        let str = /var\s+gid\s+=\s+(\d{1,})/.exec(doc);
        let avInfo = {gid:str[1],dom:[]};
        if(Status.get("avInfo")){
            let sample_waterfall = $($.parseHTML(doc)).find("#sample-waterfall");
            let avatar_waterfall = $($.parseHTML(doc)).find("#avatar-waterfall");
            if(avatar_waterfall.length>0){
                avatar_waterfall[0].id = "";
                avatar_waterfall.addClass("pop-up-tag");
                avatar_waterfall.attr("name",tagName);
                avatar_waterfall.find("a.avatar-box span").each((i,el)=> {
                    let $copySvg = $(`<div style="width:24px;height:24px;display: flex;align-items: center;justify-content: center;">${copy_Svg}</div>`);
                    $copySvg.click(function () {
                        GM_setClipboard($(el).text());
                        showAlert(lang.copySuccess);
                        return false;
                    });
                    $(el).prepend($copySvg);
                });
                avatar_waterfall.find("a.avatar-box").attr("target","_blank").removeClass("avatar-box").addClass("avatar-box-zdy");
                avInfo.dom.push(avatar_waterfall);
            }
            if(sample_waterfall.length>0){
                sample_waterfall[0].id = "";
                sample_waterfall.addClass("pop-up-tag");
                sample_waterfall.attr("name",tagName);
                sample_waterfall.find(".sample-box").removeClass("sample-box").addClass("sample-box-zdy");
                avInfo.dom.push(sample_waterfall);
            }
        }
        return avInfo;
    };

    //弹出视频截图
    function showBigImg(itemID,avid,elem) {
        if ($(elem).hasClass("span-loading")) {return;}
        let tagName = `${itemID}${SCREENSHOT_SUFFIX}`;
        let $selector = $(`.pop-up-tag[name='${tagName}']`);
        if ($selector.length > 0) {
            $selector.show();
            myModal.show();
        } else {
            $(elem).addClass("span-loading");
            getAvImg(avid,tagName).then(($img)=>{
                myModal.append($img).show();
            }).catch(err=>err && showAlert(err)).then(()=>{
                $(elem).removeClass("span-loading");
            });
        }
    }
    const getRequest = (url,params) => {
        return new Promise((resolve, reject)=>{
            GM_xmlhttpRequest(Object.assign({
                method: "GET",
                url: url,
                timeout: 20000,
                onload: (r)=>resolve(r),
                onerror : (r)=> reject(`error`),
                ontimeout : (r)=> reject(`timeout`)
            },params));
        })
    }
    const  downloadImg =  (url,name,elem) => {
        if ($(elem).hasClass("span-loading")) return;
        $(elem).addClass("span-loading");
        new Promise((resolve, reject)=>{
            GM_download({
                url: url,
                name :name,
                headers : {Referer : url},
                onload: (r)=>resolve(r),
                onerror : (error,detail)=> reject(`error 错误`),
                ontimeout : (r)=> reject(`timeout 超时`)
            })})
        .catch(err=>showAlert(err))
        .then(()=>$(elem).removeClass("span-loading"));
    }
    async function fetchScreenshotResourceInfo(avid) {
        const key = normalizeResourceAvid(avid);
        const emptyMessage = lang.getAvImg_none || '未搜索到';
        if (!key) return { entries: [], statuses: [], message: emptyMessage };
        if (resourceScreenshotInfoCache.has(key)) return resourceScreenshotInfoCache.get(key);
        const promise = (async () => {
            const statuses = [];
            const entries = [];
            const pushUniqueNote = (list, value) => {
                const note = String(value || '').trim();
                if (!note || list.includes(note)) return;
                list.push(note);
            };

            const blogKeyword = buildBlogJavSearchKeyword(key) || key;
            const blogSearchUrl = 'https://blogjav.net/?s=' + encodeURIComponent(blogKeyword);
            const blogSearch = await requestPage(blogSearchUrl);
            let blogEntries = blogSearch.ok ? extractBlogJavSearchEntries(blogSearch.responseText, key) : [];
            let blogSourceNote = blogEntries.length ? '站内搜索' : '';
            if (!blogEntries.length) {
                const blogBing = await searchSiteViaBing('blogjav.net', blogKeyword.replace(/\+/g, ' '), '&mkt=zh-TW');
                if (blogBing.links.length) {
                    blogEntries = uniqueResourceEntries(blogBing.links.map(link => ({
                        title: 'BlogJav · ' + stripHtmlTags(link.label || key),
                        href: link.href,
                        provider: 'blogjav',
                        note: 'Bing'
                    })));
                    blogSourceNote = 'Bing';
                } else if (!blogSearch.ok) {
                    blogSourceNote = describeRequestStatus(blogSearch, '站内搜索失败');
                } else if (!blogBing.response.ok) {
                    blogSourceNote = describeRequestStatus(blogBing.response, 'Bing 失败');
                } else {
                    blogSourceNote = '站内搜索未命中';
                }
            }
            const blogResolved = await Promise.all(blogEntries.slice(0, 4).map(async entry => {
                const page = await requestPage(entry.href);
                const src = page.ok ? (extractBlogJavScreenshotCandidates(page.responseText)[0] || '') : '';
                return Object.assign({}, entry, { src: src || undefined, note: entry.note || blogSourceNote });
            }));
            const blogHitCount = blogResolved.filter(entry => entry.src).length;
            const blogState = blogHitCount ? 'ok'
                : blogResolved.length ? 'partial'
                : (blogSearch.status === 403 || blogSearch.status === 503 ? 'blocked' : (blogSearch.status === 404 ? 'empty' : (blogSearch.ok ? 'empty' : 'error')));
            const blogNotes = [];
            pushUniqueNote(blogNotes, blogSourceNote);
            if (blogResolved.length) pushUniqueNote(blogNotes, blogResolved.length + ' 条');
            if (blogHitCount) pushUniqueNote(blogNotes, blogHitCount + ' 图');
            else if (!blogResolved.length && !blogSearch.ok) pushUniqueNote(blogNotes, describeRequestStatus(blogSearch));
            statuses.push({
                label: 'BlogJav',
                state: blogState,
                note: blogNotes.join(' · ') || '未命中',
                href: (blogResolved.find(entry => entry.src) || blogResolved[0] || blogEntries[0] || {}).href || blogSearchUrl
            });
            entries.push(...blogResolved);

            const javStoreSearchUrl = buildJavStoreLookupUrl(key);
            const javStoreSearch = await requestPage(javStoreSearchUrl, { timeout: 12000 });
            let javStoreEntries = javStoreSearch.ok ? extractJavStoreSearchEntries(javStoreSearch.responseText, key).slice(0, 4) : [];
            let javStoreSourceNote = javStoreEntries.length ? '站内搜索' : '';
            let javStoreStatusResponse = javStoreSearch;
            if (!javStoreEntries.length) {
                const javStoreBing = await searchSiteViaBing('javstore.net', key, '&mkt=ja-JP');
                if (javStoreBing.links.length) {
                    javStoreEntries = uniqueResourceEntries(javStoreBing.links.slice(0, 4).map(link => ({
                        title: 'JavStore · ' + stripHtmlTags(link.label || key),
                        href: link.href,
                        provider: 'javstore',
                        note: 'Bing'
                    })));
                    javStoreSourceNote = 'Bing';
                    javStoreStatusResponse = javStoreBing.response;
                } else if (!javStoreSearch.ok) {
                    javStoreSourceNote = describeRequestStatus(javStoreSearch, '站内搜索失败');
                } else if (!javStoreBing.response.ok) {
                    javStoreSourceNote = describeRequestStatus(javStoreBing.response, 'Bing 失败');
                    javStoreStatusResponse = javStoreBing.response;
                } else {
                    javStoreSourceNote = '站内搜索未命中';
                }
            }
            const javStoreResolved = uniqueResourceEntries((await Promise.all(javStoreEntries.slice(0, 4).map(async entry => {
                const page = await requestPage(entry.href, { timeout: 12000 });
                const screenshots = page.ok ? extractJavStoreScreenshotCandidates(page.responseText, key).slice(0, 10) : [];
                if (!screenshots.length) {
                    return [Object.assign({}, entry, { src: undefined, note: entry.note || javStoreSourceNote })];
                }
                return screenshots.map((src, index) => Object.assign({}, entry, {
                    title: screenshots.length > 1 ? (entry.title + ' · 图' + (index + 1)) : entry.title,
                    href: src,
                    src,
                    note: entry.note || javStoreSourceNote
                }));
            }))).flat());
            const javStoreHitCount = javStoreResolved.filter(entry => entry.src).length;
            const javStoreState = javStoreHitCount ? 'ok'
                : javStoreResolved.length ? 'partial'
                : (javStoreStatusResponse.status === 403 || javStoreStatusResponse.status === 503 ? 'blocked' : (javStoreStatusResponse.status === 404 ? 'empty' : (javStoreStatusResponse.ok ? 'empty' : 'error')));
            const javStoreNotes = [];
            pushUniqueNote(javStoreNotes, javStoreSourceNote);
            if (javStoreEntries.length) pushUniqueNote(javStoreNotes, javStoreEntries.length + ' 页');
            if (javStoreHitCount) pushUniqueNote(javStoreNotes, javStoreHitCount + ' 图');
            else if (!javStoreEntries.length && !javStoreStatusResponse.ok) pushUniqueNote(javStoreNotes, describeRequestStatus(javStoreStatusResponse));
            statuses.push({
                label: 'JavStore',
                state: javStoreState,
                note: javStoreNotes.join(' · ') || '未命中',
                href: (javStoreEntries[0] || {}).href || javStoreSearchUrl
            });
            entries.push(...javStoreResolved);

            const uniqueEntries = uniqueResourceEntries(entries).slice(0, 12);
            return {
                entries: uniqueEntries,
                statuses,
                message: uniqueEntries.length ? '' : emptyMessage
            };
        })().catch(error => {
            console.warn('[JLC] 截图 provider 解析失败', error);
            resourceScreenshotInfoCache.delete(key);
            return {
                entries: [],
                statuses: [
                    { label: 'BlogJav', state: 'error', note: '解析异常', href: 'https://blogjav.net/' },
                    { label: 'JavStore', state: 'error', note: '解析异常', href: buildJavStoreLookupUrl(key) || 'https://javstore.net/' }
                ],
                message: emptyMessage
            };
        });
        resourceScreenshotInfoCache.set(key, promise);
        return promise;
    }

        async function seedScreenshotEntries(entries, limit = 4) {
        const list = (Array.isArray(entries) ? entries : []).map(item => Object.assign({}, item));
        const max = Math.min(limit, list.length);
        for (let i = 0; i < max; i += 1) {
            if (list[i].src) continue;
            list[i].src = await ScreenshotPanel.getScreenshotUrl(list[i].href, list[i].provider);
            if (!list[i].src) list[i].src = null;
        }
        return list;
    }

    /**根据番号获取截图资源，优先 BlogJav，失败再回退 JavStore*/
    async function getAvImg(avid,tagName) {
        const info = await fetchScreenshotResourceInfo(avid);
        if (!info?.entries?.length) {
            return Promise.reject(info?.message || lang.getAvImg_none);
        }
        let resultList = await seedScreenshotEntries(info.entries, 4);
        const indexTo = resultList.findIndex(item => !!item.src);
        if (indexTo === -1) {
            return Promise.reject(info?.message || lang.getAvImg_none);
        }
        if (indexTo > 0) {
            resultList = [resultList[indexTo], ...resultList.slice(0, indexTo), ...resultList.slice(indexTo + 1)];
        }
        const $img = new ScreenshotPanel(tagName, resultList, avid);
        $img.data('jlcScreenshotInfo', info);
        return $img;
    };
    class ScreenshotPanel{
        constructor(tagName,resultList,avid){
            let me = this;
            let liHtml = resultList.map((v,i) => {
                if(i===0){
                    return '<li class="imgResult-li imgResult-Current" index="' + i + '">' + escapeHtml(v.title || ('截图 ' + (i + 1))) + '</li>';
                }
                return '<li class="imgResult-li" index="' + i + '">' + escapeHtml(v.title || ('截图 ' + (i + 1))) + '</li>';
            }).join('');
            let imgsHtml = resultList.map((v,i)=> {
                if(i===0){
                    return '<img index="' + i + '" src="' + escapeHtml(v.src || '') + '" name="screenshot" style="width:100%" />';
                }
                return '<img index="' + i + '" name="screenshot" style="display:none;width:100%" />';
            }).join('');
            let $panel = $('<div name="' + tagName + '" class="pop-up-tag" style="min-height:' + $(window).height() + 'px;"><ul>' + liHtml + '</ul><span class="download-icon" >' + download_Svg + '</span>' + imgsHtml + '</div>');
            $panel.find('li.imgResult-li').click(async function(){
                if ($(this).hasClass('imgResult-loading')) {return;}
                let index_to = Number($(this).attr('index'));
                let index_from = Number($panel.find('img:visible').attr('index'));
                if( index_to !== index_from){
                    $panel.find('li.imgResult-li.imgResult-Current').removeClass('imgResult-Current');
                    $(this).addClass('imgResult-loading').addClass('imgResult-Current');
                    $panel.find('img').hide();
                    let $img_to = $panel.find('img[index=' + index_to + ']');
                    $img_to.show();
                    try {
                        let data = resultList[index_to];
                        if(!data.src){
                            if(data.src === undefined){
                                let src = await me.constructor.getScreenshotUrl(data.href, data.provider);
                                data.src = src || null;
                                if(src === null){
                                    throw lang.getAvImg_none;
                                }
                                $img_to.attr('src',src);
                            }else if(data.src === null){
                                throw lang.getAvImg_none;
                            }
                        }
                    } catch (error) {
                        showAlert(error);
                    }finally{
                        $(this).removeClass('imgResult-loading');
                    }
                }
            });
            $panel.find('span.download-icon').click(function(){
                let url = $panel.find('img:visible').attr('src');
                let name = (avid || 'screenshot') + '.jpg';
                downloadImg(url,name,this);
            });
            return $panel;
        }
        static normalizeScreenshotUrl(url){
            return normalizePreviewImageUrl(url);
        }
        static isDirectImageUrl(url) {
            const value = String(url || '').trim();
            return !!value && (/\.(?:jpe?g|png|webp)(?:$|[?#])/i.test(value) || /(pixhost|imagetwist)/i.test(value));
        }
        static extractBlogJavScreenshotUrlFromHtml(responseText){
            return extractBlogJavScreenshotCandidates(responseText)[0] || null;
        }
        static extractJavStoreScreenshotUrlFromHtml(responseText){
            return extractJavStoreScreenshotCandidates(responseText)[0] || null;
        }
        static extractScreenshotUrlFromHtml(responseText, provider){
            if (provider === 'javstore') return this.extractJavStoreScreenshotUrlFromHtml(responseText);
            if (provider === 'blogjav') return this.extractBlogJavScreenshotUrlFromHtml(responseText);
            return this.extractBlogJavScreenshotUrlFromHtml(responseText) || this.extractJavStoreScreenshotUrlFromHtml(responseText);
        }
        static async getScreenshotUrl(imgUrl, provider = 'blogjav'){
            if (!imgUrl) return null;
            if (this.isDirectImageUrl(imgUrl)) {
                return this.normalizeScreenshotUrl(imgUrl);
            }
            const result = await getRequest(imgUrl);
            if (!result || result.status < 200 || result.status >= 400) {
                return null;
            }
            let src = this.extractScreenshotUrlFromHtml(result.responseText, provider);
            if (!src) {
                return null;
            }
            return this.normalizeScreenshotUrl(src);
        }
    }
    function extractTextContent(value) {
        if (!value) return '';
        if (typeof value === 'string') return value;
        if (value.jquery && typeof value.text === 'function') return value.text();
        if (typeof value.textContent === 'string') return value.textContent;
        return String(value || '');
    }

    function compactText(value) {
        return extractTextContent(value).replace(/\s+/g, ' ').trim();
    }

    function getSiteLabel(site = currentWeb) {
        const map = {
            javlibrary: 'JavLibrary',
            javbus: 'JavBus',
            javdb: 'JavDB'
        };
        return map[String(site || '').toLowerCase()] || 'JLC';
    }

    function copyPlainText(text) {
        const value = compactText(text);
        if (!value) return false;
        GM_setClipboard(value);
        showAlert(lang.copySuccess);
        return true;
    }

    const DETAIL_COPY_FIELD_LABELS = Object.freeze({
        avid: ['识别码', '識別碼', '番号', '番號', 'id'],
        director: ['导演', '導演', '監督', 'director'],
        maker: ['制作商', '製作商', '制作', '製作', 'メーカー', 'maker', 'studio', '片商'],
        label: ['发行商', '發行商', 'レーベル', 'label', '厂牌', '廠牌'],
        cast: ['演员', '演員', '出演', '女优', '女優', 'actor', 'cast']
    });
    const DETAIL_COPY_FIELD_ORDER = ['avid', 'director', 'maker', 'label', 'cast'];
    const DETAIL_COPY_FIELD_IDS = Object.freeze({
        javlibrary: {
            avid: 'video_id',
            director: 'video_director',
            maker: 'video_maker',
            label: 'video_label',
            cast: 'video_cast'
        }
    });

    function escapeRegExpText(value) {
        return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function normalizeDetailLabelText(value) {
        return compactText(value).replace(/[：:]/g, '').replace(/\s+/g, '').toLowerCase();
    }

    function matchesDetailFieldLabel(value, aliases = []) {
        const normalized = normalizeDetailLabelText(value);
        if (!normalized) return false;
        return aliases.some(alias => normalized.includes(normalizeDetailLabelText(alias)));
    }

    function collectDetailFieldBlocks(context) {
        if (!context) return [];
        if (context.site === 'javlibrary') {
            return Array.from(document.querySelectorAll('#video_info tr, #video_details tr'));
        }
        if (context.site === 'javbus') {
            return Array.from(document.querySelectorAll('.col-md-3.info p, .col-md-3.info li, .info p'));
        }
        if (context.site === 'javdb') {
            return Array.from(document.querySelectorAll('.video-meta-panel .panel-block, .movie-panel-info .panel-block'));
        }
        return [];
    }

    function getDetailFieldLabelNode(block) {
        if (!block) return null;
        if (block.matches?.('tr')) return block.querySelector('td, th');
        return block.querySelector('.header, strong, b, .title, .name, .label') || block.firstElementChild || block;
    }

    function getDetailFieldValueNode(block) {
        if (!block) return null;
        if (block.matches?.('tr')) {
            const cells = Array.from(block.querySelectorAll('td, th'));
            return cells.find(cell => cell.classList?.contains('text'))
                || cells.find(cell => !cell.classList?.contains('header') && !cell.classList?.contains('icon'))
                || cells[cells.length - 1]
                || block;
        }
        const explicit = block.querySelector('.value, td.text, .text');
        if (explicit) return explicit;
        const children = Array.from(block.children || []).filter(node => !/^(STRONG|B)$/i.test(node.tagName || ''));
        return children.find(node => !node.classList?.contains('header') && !node.classList?.contains('icon'))
            || children[children.length - 1]
            || block;
    }

    function stripDetailFieldLabel(text, aliases = []) {
        const raw = compactText(text);
        if (!raw) return '';
        for (const alias of aliases) {
            const pattern = new RegExp('^' + escapeRegExpText(alias) + '\\s*[:：]?\\s*', 'i');
            if (pattern.test(raw)) {
                return compactText(raw.replace(pattern, ''));
            }
        }
        const dividerIndex = raw.search(/[：:]/);
        return dividerIndex >= 0 ? compactText(raw.slice(dividerIndex + 1)) : raw;
    }

    function extractDetailFieldText(block, aliases = [], preferredValueNode = null) {
        const root = preferredValueNode || getDetailFieldValueNode(block) || block;
        const clipboardText = root?.getAttribute?.('data-clipboard-text') || block?.getAttribute?.('data-clipboard-text');
        if (clipboardText) return compactText(clipboardText);
        const anchorTexts = Array.from(root?.querySelectorAll?.('a') || [])
            .map(node => compactText(node))
            .filter(Boolean);
        if (anchorTexts.length) return anchorTexts.join(' / ');
        return stripDetailFieldLabel(root?.textContent || block?.textContent || '', aliases);
    }

    function resolveDetailFieldTarget(context, fieldKey) {
        if (!context) return null;
        const aliases = DETAIL_COPY_FIELD_LABELS[fieldKey] || [];
        const directFieldId = DETAIL_COPY_FIELD_IDS[context.site]?.[fieldKey];
        if (directFieldId) {
            const fieldRoot = document.getElementById(directFieldId);
            if (fieldRoot) {
                const row = fieldRoot.querySelector('tr') || fieldRoot.closest('tr');
                const valueNode = getDetailFieldValueNode(row || fieldRoot);
                let text = extractDetailFieldText(row || fieldRoot, aliases, valueNode || undefined);
                if (fieldKey === 'avid') text = normalizeResourceAvid(text);
                if (text) return { host: valueNode || row || fieldRoot, text };
            }
        }

        const blocks = collectDetailFieldBlocks(context);
        for (const block of blocks) {
            const labelNode = getDetailFieldLabelNode(block);
            const labelText = compactText(labelNode || block);
            if (!matchesDetailFieldLabel(labelText, aliases)) continue;
            const valueNode = getDetailFieldValueNode(block);
            let text = extractDetailFieldText(block, aliases, valueNode || undefined);
            if (fieldKey === 'avid') text = normalizeResourceAvid(text);
            if (text) return { host: valueNode || block, text };
        }
        return null;
    }

    function resolveDetailTitleTarget(context) {
        if (!context?.title) return null;
        let host = null;
        if (context.site === 'javlibrary') {
            host = document.querySelector('#video_title h3') || document.querySelector('#video_title');
        } else if (context.site === 'javbus') {
            host = document.querySelector('.container h3') || document.querySelector('h3');
        } else if (context.site === 'javdb') {
            host = document.querySelector('.title.is-4') || document.querySelector('h2.title') || document.querySelector('h2');
        }
        return host ? { host, text: context.title } : null;
    }

    function ensureInlineDetailCopyButton(host, fieldKey, text) {
        if (host instanceof HTMLAnchorElement && host.parentElement) host = host.parentElement;
        if (!(host instanceof HTMLElement) || !fieldKey || !text) return;
        let button = Array.from(host.children || []).find(node => node.classList?.contains('jlc-detail-copy-btn') && node.dataset.jlcCopyKey === fieldKey) || null;
        if (!button) {
            button = document.createElement('button');
            button.type = 'button';
            button.className = 'jlc-detail-copy-btn';
            button.dataset.jlcCopyKey = fieldKey;
            button.innerHTML = copy_Svg;
            button.title = lang.copyButton;
            button.setAttribute('aria-label', lang.copyButton);
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                copyPlainText(button.dataset.jlcCopyText || '');
                return false;
            });
            host.appendChild(button);
        }
        button.dataset.jlcCopyText = text;
    }

    function removeDetailPageCopyButtons() {
        document.querySelectorAll('.jlc-detail-copy-btn').forEach(button => button.remove());
    }

    function ensureDetailPageCopyButtons(context = getCurrentDetailContext()) {
        if (!context || !Status.get('copyBtn')) {
            removeDetailPageCopyButtons();
            return;
        }
        const titleTarget = resolveDetailTitleTarget(context);
        if (titleTarget?.host && titleTarget.text) {
            ensureInlineDetailCopyButton(titleTarget.host, 'title', titleTarget.text);
        }
        DETAIL_COPY_FIELD_ORDER.forEach(fieldKey => {
            const target = resolveDetailFieldTarget(context, fieldKey);
            if (target?.host && target.text) {
                ensureInlineDetailCopyButton(target.host, fieldKey, target.text);
            }
        });
    }


// @@creamu-part:40-tracking-search
    const TRACKING_GROUP_LABELS = {
        actor: '演员',
        director: '导演',
        maker: '制作',
        studio: '片商',
        series: '系列',
        tag: '标签',
        keyword: '关键词',
        custom: '自定义'
    };
    const TRACKING_GROUP_ORDER = ['actor', 'director', 'maker', 'studio', 'series', 'tag', 'keyword', 'custom'];

    function getTrackingUiState() {
        const saved = GM_getValue(TRACKING_UI_STATE_KEY);
        if (saved && typeof saved === 'object') {
            if (!saved.collapsed || typeof saved.collapsed !== 'object') saved.collapsed = {};
            if (saved.refresh_resume && typeof saved.refresh_resume !== 'object') saved.refresh_resume = null;
            if (!Object.prototype.hasOwnProperty.call(saved, 'refresh_resume')) saved.refresh_resume = null;
            return saved;
        }
        return { collapsed: {}, refresh_resume: null };
    }

    function getTrackingRefreshResumeState() {
        const state = getTrackingUiState();
        return state.refresh_resume && typeof state.refresh_resume === 'object' ? state.refresh_resume : null;
    }

    function setTrackingRefreshResumeState(resumeState) {
        const state = getTrackingUiState();
        state.refresh_resume = resumeState && typeof resumeState === 'object' ? resumeState : null;
        GM_setValue(TRACKING_UI_STATE_KEY, state);
    }

    function clearTrackingRefreshResumeState() {
        setTrackingRefreshResumeState(null);
    }

    function getTrackingRefreshRuntimeState() {
        return trackingRefreshRuntimeState && trackingRefreshRuntimeState.active ? trackingRefreshRuntimeState : null;
    }

    function setTrackingRefreshRuntimeState(nextState = null) {
        if (!nextState || nextState.active === false) {
            trackingRefreshRuntimeState = null;
            return null;
        }
        trackingRefreshRuntimeState = Object.assign({}, trackingRefreshRuntimeState || {}, nextState, {
            active: true,
            updated_at: new Date().toISOString()
        });
        return trackingRefreshRuntimeState;
    }

    function buildTrackingRefreshRuntimeSummary(state) {
        if (!state?.active) return '';
        const completed = Number(state.completed || 0) || 0;
        const total = Number(state.total || 0) || 0;
        if (state.phase === 'cooldown') {
            const remainSeconds = Math.max(0, Math.ceil((Number(state.remainingMs || 0) || 0) / 1000));
            const note = compactText(state.note || '') ? (' · ' + compactText(state.note || '')) : '';
            return '批量刷新冷却中 ' + remainSeconds + 's · ' + completed + '/' + total + note;
        }
        const currentIndex = total > 0 ? Math.min(total, completed + (state.phase === 'refreshing' ? 1 : 0)) : completed;
        const note = compactText(state.note || '') ? (' · ' + compactText(state.note || '')) : '';
        return '批量刷新中 ' + currentIndex + '/' + total + note;
    }

    function buildTrackingRefreshRuntimeButtonText(state) {
        if (!state?.active) return '刷新全部';
        if (state.phase === 'cooldown') {
            return '冷却中 ' + Math.max(0, Math.ceil((Number(state.remainingMs || 0) || 0) / 1000)) + 's';
        }
        const completed = Number(state.completed || 0) || 0;
        const total = Number(state.total || 0) || 0;
        return '刷新中 ' + Math.min(total || completed, completed + 1) + '/' + total;
    }

    async function waitTrackingRefreshCountdown(waitMs, onTick = null) {
        let remainingMs = Math.max(0, Number(waitMs || 0) || 0);
        if (!(remainingMs > 0)) {
            if (typeof onTick === 'function') onTick(0);
            return;
        }
        while (remainingMs > 0) {
            if (typeof onTick === 'function') onTick(remainingMs);
            const stepMs = Math.min(1000, remainingMs);
            await delayMs(stepMs);
            remainingMs = Math.max(0, remainingMs - stepMs);
        }
        if (typeof onTick === 'function') onTick(0);
    }

    function setTrackingGroupCollapsed(groupKey, collapsed) {
        const state = getTrackingUiState();
        state.collapsed = state.collapsed || {};
        state.collapsed[groupKey] = !!collapsed;
        GM_setValue(TRACKING_UI_STATE_KEY, state);
    }

    function getTrackingGroupLabel(groupType) {
        return TRACKING_GROUP_LABELS[String(groupType || '').toLowerCase()] || '其他';
    }

    function normalizeTrackingGroupType(groupType) {
        const key = String(groupType || '').toLowerCase();
        return Object.prototype.hasOwnProperty.call(TRACKING_GROUP_LABELS, key) ? key : '';
    }

    function inferTrackingGroupType(site, url, fallbackType = 'custom') {
        const fallback = normalizeTrackingGroupType(fallbackType) || 'custom';
        const parsed = parseTrackingUrl(url || '');
        if (!parsed) return fallback;
        const lowerSite = String(site || '').toLowerCase();
        const lowerPath = String(parsed.pathname || '').toLowerCase();
        const combined = lowerPath + String(parsed.search || '');
        if (lowerSite === 'javlibrary') {
            if (/director/i.test(combined)) return 'director';
            if (/maker/i.test(combined)) return 'maker';
            if (/label|studio/i.test(combined)) return 'studio';
            if (/series/i.test(combined)) return 'series';
            if (/tag|genre/i.test(combined)) return 'tag';
            if (/star|actress|actor/i.test(combined)) return 'actor';
            return fallback;
        }
        if (lowerSite === 'javbus' || lowerSite === 'avmoo') {
            if (/\/director\//i.test(lowerPath)) return 'director';
            if (/\/maker\//i.test(lowerPath)) return 'maker';
            if (/\/studio\//i.test(lowerPath)) return 'studio';
            if (/\/series\//i.test(lowerPath)) return 'series';
            if (/\/(?:genre|genres)\//i.test(lowerPath)) return 'tag';
            if (/\/star\//i.test(lowerPath)) return 'actor';
            return fallback;
        }
        if (lowerSite === 'javdb') {
            if (/\/directors?\//i.test(lowerPath)) return 'director';
            if (/\/makers?\//i.test(lowerPath)) return 'maker';
            if (/\/(?:studios?|publishers?|labels?)\//i.test(lowerPath)) return 'studio';
            if (/\/series\//i.test(lowerPath)) return 'series';
            if (/\/(?:tags?|categories)\//i.test(lowerPath)) return 'tag';
            if (/\/actors?\//i.test(lowerPath)) return 'actor';
            return fallback;
        }
        return fallback;
    }

    function getTrackingEffectiveGroupType(record = null) {
        const explicit = normalizeTrackingGroupType(record?.group_type || '');
        if (explicit && explicit !== 'series' && explicit !== 'custom') return explicit;
        const inferred = inferTrackingGroupType(record?.site, record?.page_url || record?.open_url || '', explicit || record?.page_type || 'custom');
        return normalizeTrackingGroupType(inferred || explicit || 'custom') || 'custom';
    }

    function delayMs(ms) {
        return new Promise(resolve => window.setTimeout(resolve, ms));
    }

    function parseTrackingUrl(url, fallback) {
        try {
            return new URL(url, fallback || location.href);
        } catch (error) {
            try {
                return new URL(String(url || ''), 'https://www.javlibrary.com/');
            } catch (innerError) {
                return null;
            }
        }
    }

    function buildTrackingCanonicalUrl(url = location.href) {
        const parsed = parseTrackingUrl(url);
        if (!parsed) return String(url || '');
        parsed.hash = '';
        ['page', 'p', 'offset'].forEach(key => parsed.searchParams.delete(key));
        if (/javlibrary\./i.test(String(parsed.hostname || '')) && /\/vl_searchby(?:title|combo)\.php$/i.test(String(parsed.pathname || '').toLowerCase())) {
            const keyword = compactText(parsed.searchParams.get('keyword') || parsed.searchParams.get('q') || parsed.searchParams.get('search') || '');
            const lowerPath = String(parsed.pathname || '').toLowerCase();
            if (/\/vl_searchbycombo\.php$/i.test(lowerPath) || keyword) {
                parsed.searchParams.delete('searchid');
            }
        }
        if (/\/(?:search|star|actor|actors|actress|series|genre|genres|tag|tags|studio|studios|maker|makers|director|directors|label|labels|publisher|publishers)\/[^/?]+\/\d+\/?$/i.test(parsed.pathname)) {
            parsed.pathname = parsed.pathname.replace(/\/\d+\/?$/, '');
        }
        parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/');
        return parsed.toString().replace(/\/$/, '');
    }

    function decodeTrackingSegment(value) {
        if (value == null) return '';
        try {
            return decodeURIComponent(String(value)).trim();
        } catch (error) {
            return String(value || '').trim();
        }
    }

    function normalizeTrackingQueryLabel(value) {
        let text = compactText(decodeTrackingSegment(value || ''));
        if (!text) return '';
        text = text
            .replace(/^(?:search\s*result(?:s)?(?:\s*of)?|search|results?\s*for|搜索结果|搜尋結果|标题搜索|標題搜索|title\s*search|组合搜索|組合搜索|combo\s*search)[:：\s-]*/i, '')
            .replace(/^["'“”‘’【】\[\]『』]+|["'“”‘’【】\[\]『』]+$/g, '')
            .trim();
        return text;
    }

    function isTrackingSiteGenericLabel(value) {
        const text = normalizeTrackingQueryLabel(value || '').toLowerCase();
        if (!text) return false;
        return /^(?:javlibrary|jav\s*library|javbus|javdb|avmoo|missav|emby|metatube)$/.test(text);
    }

    function isTrackingGenericSearchLabel(value) {
        const text = normalizeTrackingQueryLabel(value || '').toLowerCase();
        if (!text) return false;
        return isTrackingSiteGenericLabel(text)
            || /^(?:search\s*result(?:s)?|results?\s*for|标题搜(?:索|尋|寻)结果|標題搜(?:索|尋|寻)結果|标题搜(?:索|尋|寻)|標題搜(?:索|尋|寻)|title\s*search(?:\s*result(?:s)?)?|组合搜(?:索|尋|寻)结果|組合搜(?:索|尋|寻)結果|组合搜(?:索|尋|寻)|組合搜(?:索|尋|寻)|combo\s*search(?:\s*result(?:s)?)?)$/i.test(text);
    }

    /** 工作台/设置等脚本 UI 文案，禁止当追更标题或关键词 */
    function isTrackingUiChromeLabel(value) {
        const text = compactText(value || '');
        if (!text) return true;
        const bare = text
            .replace(/^(?:javlibrary|jav\s*library|javbus|javdb|jlc)\s*[·•|\-—–]\s*/i, '')
            .trim();
        if (!bare) return true;
        return /^(?:资源增强|详情页资源增强|系统连接|熟人与资料库|数据与界面|指挥官|工作台|Creamu|Creamu\s*·\s*JavLibrary|设置|追更|视图|资源|连接|熟人|数据|加载中|保存并应用|立即同步|重新读取|仅导入配置|完整导入|导出配置|完整导出)$/i.test(bare)
            || /资源增强|详情页资源增强|系统连接|熟人与资料库|数据与界面/.test(text);
    }

    function isScriptUiNode(node) {
        if (!node || typeof node.closest !== 'function') return false;
        return !!node.closest([
            '#jlc-wb',
            '#jlc-wb-fab',
            '#jlc-wb-dialog',
            '#jlc-panel',
            '#jlc-tracking-pagebar',
            '#jlc-toast',
            '#jlc-alert',
            '.jlc-resource-center',
            '.jlc-resource-root',
            '[id^="jlc-"]'
        ].join(','));
    }

    /** 仅当新标签非 UI 污染、且旧值空/污染/明显更弱时才采纳 */
    function shouldAdoptTrackingLabel(nextValue, prevValue) {
        const next = compactText(nextValue || '');
        const prev = compactText(prevValue || '');
        if (!next || isTrackingUiChromeLabel(next)) return false;
        if (!prev || isTrackingUiChromeLabel(prev)) return true;
        if (isTrackingGenericSearchLabel(next) && !isTrackingGenericSearchLabel(prev)) return false;
        if (next === prev) return false;
        return true;
    }

    function buildTrackingSearchFallbackLabel(label, parsed) {
        const searchId = compactText(parsed?.searchParams?.get('searchid') || '');
        const page = Number(parsed?.searchParams?.get('page') || parsed?.searchParams?.get('p') || 0) || 0;
        let text = String(label || '搜索');
        if (searchId) text += ' #' + searchId;
        if (page > 1) text += ' · 第' + page + '页';
        return text;
    }

    function extractTrackingSearchKeyword(doc = document, parsed, heading = '') {
        const candidates = [];
        const pushCandidate = (value) => {
            const text = normalizeTrackingQueryLabel(value || '');
            if (!text || isTrackingGenericSearchLabel(text) || isTrackingSiteGenericLabel(text) || isTrackingUiChromeLabel(text)) return;
            if (!candidates.includes(text)) candidates.push(text);
        };
        pushCandidate(parsed?.searchParams?.get('keyword'));
        pushCandidate(parsed?.searchParams?.get('q'));
        pushCandidate(parsed?.searchParams?.get('search'));
        [
            'input[name="keyword"]',
            'input[name="q"]',
            'input[name="search"]',
            'input[type="search"]',
            'form[action*="search"] input[type="text"]',
            'form[action*="search"] input[type="search"]',
            'form[action*="vl_searchbytitle"] input[type="text"]',
            'form[action*="vl_searchbytitle"] input[type="search"]',
            '#search input[type="text"]',
            '#search input[type="search"]',
            '.search input[type="text"]',
            '.search input[type="search"]'
        ].forEach(selector => {
            doc.querySelectorAll(selector).forEach(node => {
                pushCandidate(node?.value || node?.getAttribute?.('value') || node?.textContent || '');
            });
        });
        const titleText = compactText(doc?.title || '');
        const titleMatches = [
            titleText.match(/[“"「『](.+?)[”"」』]/),
            titleText.match(/(?:search\s*(?:result(?:s)?\s*(?:of|for)?|for)|标题搜(?:索|尋|寻)结果|標題搜(?:索|尋|寻)結果|title\s*search)[:：\s-]*(.+?)\s*(?:[-|｜]\s*JAVLibrary.*)?$/i),
            titleText.match(/^(.+?)\s*(?:[-|｜]\s*JAVLibrary.*)$/i)
        ];
        titleMatches.forEach(match => pushCandidate(match?.[1] || ''));
        pushCandidate(heading);
        return candidates[0] || '';
    }

    function detectTrackingSearchMode(site, parsed) {
        if (String(site || '').toLowerCase() !== 'javlibrary') return 'forward';
        const lowerPath = String(parsed?.pathname || '').toLowerCase();
        if (/\/vl_searchbytitle\.php$/i.test(lowerPath)) return 'backfill';
        if (/\/vl_searchbycombo\.php$/i.test(lowerPath)) return 'forward';
        return 'forward';
    }

    function resolveTrackingSearchMode(recordOrSite, parsed) {
        const site = typeof recordOrSite === 'string' ? recordOrSite : recordOrSite?.site;
        const explicit = typeof recordOrSite === 'string' ? '' : String(recordOrSite?.search_mode || '').toLowerCase();
        if (explicit === 'backfill' || explicit === 'forward') return explicit;
        return detectTrackingSearchMode(site, parsed);
    }

    function buildTrackingOpenUrl(site, parsed, descriptor = {}) {
        const target = parseTrackingUrl(parsed?.href || parsed || location.href);
        if (!target) return buildTrackingCanonicalUrl(parsed?.href || parsed || location.href);
        target.hash = '';
        const lowerSite = String(site || '').toLowerCase();
        const lowerPath = String(target.pathname || '').toLowerCase();
        ['page', 'p', 'offset'].forEach(key => target.searchParams.delete(key));
        if (lowerSite === 'javlibrary') {
            if (/\/vl_searchbycombo\.php$/i.test(lowerPath)) {
                const pageCandidate = descriptor?.page_url || descriptor?.pageUrl || descriptor?.href || '';
                if (!compactText(target.searchParams.get('searchid') || '') && pageCandidate) {
                    const pageParsed = parseTrackingUrl(pageCandidate, target.href);
                    const pageLowerPath = String(pageParsed?.pathname || '').toLowerCase();
                    if (pageParsed && /\/vl_searchbycombo\.php$/i.test(pageLowerPath)) {
                        const pageSearchId = compactText(pageParsed.searchParams.get('searchid') || '');
                        const pageKeyword = pageParsed.searchParams.get('keyword') || '';
                        if (pageSearchId) target.searchParams.set('searchid', pageSearchId);
                        if (!target.searchParams.get('keyword') && pageKeyword) target.searchParams.set('keyword', pageKeyword);
                    }
                }
                return target.toString().replace(/\/$/, '');
            }
            if (/\/vl_searchbytitle\.php$/i.test(lowerPath)) {
                const currentKeyword = compactText(target.searchParams.get('keyword') || '');
                if (currentKeyword && isTrackingGenericSearchLabel(currentKeyword)) {
                    target.searchParams.delete('keyword');
                }
                return target.toString().replace(/\/$/, '');
            }
        }
        return buildTrackingCanonicalUrl(target.href);
    }

    function isJavLibraryTitleSearchUrl(url) {
        const parsed = parseTrackingUrl(url || '');
        if (!parsed) return false;
        return /javlibrary\./i.test(String(parsed.hostname || ''))
            && /\/vl_searchbytitle\.php$/i.test(String(parsed.pathname || '').toLowerCase());
    }

    function pickTrackingSearchQueryCandidate(candidates = []) {
        for (const candidate of candidates) {
            const text = normalizeTrackingQueryLabel(candidate || '');
            if (!text || isTrackingGenericSearchLabel(text) || isTrackingSiteGenericLabel(text)) continue;
            return text;
        }
        return '';
    }

    function extractTrackingSearchQueryFromUrl(url = '') {
        const parsed = parseTrackingUrl(url || '');
        if (!parsed) return '';
        return pickTrackingSearchQueryCandidate([
            parsed.searchParams.get('keyword'),
            parsed.searchParams.get('q'),
            parsed.searchParams.get('search')
        ]);
    }

    function replaceTrackingSearchKeywordInUrl(url = '', keyword = '') {
        const parsed = parseTrackingUrl(url || '');
        const searchQuery = compactText(keyword || '');
        if (!parsed || !searchQuery) return compactText(url || '');
        if (isJavLibraryResolvableSearchUrl(parsed.href)) {
            parsed.searchParams.set('keyword', searchQuery);
        }
        return parsed.toString().replace(/\/$/, '');
    }

    function getTrackingSearchQuery(record = null, fallbackContext = null) {
        const primaryCandidates = [
            record?.raw_query,
            record?.query_text,
            extractTrackingSearchQueryFromUrl(record?.page_url || ''),
            extractTrackingSearchQueryFromUrl(record?.open_url || ''),
            getTrackingEffectiveGroupType(record) === 'keyword' ? record?.group_name : '',
            record?.manual_query
        ];
        const primaryQuery = pickTrackingSearchQueryCandidate(primaryCandidates);
        if (primaryQuery) return primaryQuery;
        if (record?.id) return '';
        const fallbackCandidates = [
            fallbackContext?.raw_query,
            fallbackContext?.query_text,
            extractTrackingSearchQueryFromUrl(fallbackContext?.pageUrl || fallbackContext?.page_url || ''),
            extractTrackingSearchQueryFromUrl(fallbackContext?.open_url || ''),
            normalizeTrackingGroupType(fallbackContext?.group_type || '') === 'keyword' ? fallbackContext?.group_name : '',
            fallbackContext?.manual_query
        ];
        return pickTrackingSearchQueryCandidate(fallbackCandidates);
    }

    function promptTrackingSearchQuery(record = null, context = null) {
        const recordDefault = getTrackingSearchQuery(record)
            || pickTrackingSearchQueryCandidate([
                getTrackingEffectiveGroupType(record) === 'keyword' ? record?.group_name : '',
                record?.custom_label
            ]);
        const contextDefault = getTrackingSearchQuery(null, context)
            || pickTrackingSearchQueryCandidate([
                normalizeTrackingGroupType(context?.group_type || '') === 'keyword' ? context?.group_name : '',
                context?.custom_label
            ]);
        const defaultValue = record?.id ? recordDefault : (recordDefault || contextDefault);
        const result = window.prompt('请输入这个 JavLibrary 搜索的原始关键词 / 组合条件（用于重新生成已过期搜索）', defaultValue);
        if (result == null) return null;
        return compactText(result);
    }

    function applyTrackingSearchQuery(record, rawQuery) {
        if (!record) return '';
        const searchQuery = compactText(rawQuery || '');
        record.manual_query = searchQuery;
        if (!searchQuery) return '';
        record.raw_query = searchQuery;
        record.query_text = searchQuery;
        if (isJavLibraryResolvableSearchUrl(record?.page_url || record?.open_url || '')) {
            if (record.page_url) record.page_url = replaceTrackingSearchKeywordInUrl(record.page_url, searchQuery);
            if (record.open_url) record.open_url = replaceTrackingSearchKeywordInUrl(record.open_url, searchQuery);
        }
        if (getTrackingEffectiveGroupType(record) === 'keyword' || isJavLibraryResolvableSearchUrl(record?.page_url || record?.open_url || '')) {
            if (searchQuery && !isTrackingUiChromeLabel(searchQuery)) {
                record.group_name = searchQuery;
                record.title = getSiteLabel(record.site) + ' · ' + searchQuery;
            }
        }
        record.query_signature = buildTrackingSignature({
            site: record.site,
            page_type: record.page_type,
            open_url: record.open_url || record.page_url || '',
            pageUrl: record.page_url || record.open_url || '',
            raw_query: record.raw_query,
            query_text: record.query_text
        });
        return searchQuery;
    }

    function buildJavLibraryTitleSearchSubmitUrl(seedUrl = location.href) {
        const parsed = parseTrackingUrl(seedUrl || location.href);
        if (!parsed) return 'https://www.javlibrary.com/cn/vl_searchbytitle.php';
        const localeMatch = String(parsed.pathname || '').match(/^\/([a-z]{2})(?:\/|$)/i);
        const locale = localeMatch?.[1] || 'cn';
        return new URL('/' + locale + '/vl_searchbytitle.php', parsed.origin).toString();
    }

    function buildJavLibrarySimpleSearchAjaxUrl(seedUrl = location.href) {
        const parsed = parseTrackingUrl(seedUrl || location.href);
        if (!parsed) return 'https://www.javlibrary.com/ajax/ajax_simplesearch.php';
        return new URL('/ajax/ajax_simplesearch.php', parsed.origin).toString();
    }

    function isJavLibraryComboSearchUrl(url) {
        const parsed = parseTrackingUrl(url || '');
        if (!parsed) return false;
        return /javlibrary\./i.test(String(parsed.hostname || ''))
            && /\/vl_searchbycombo\.php$/i.test(String(parsed.pathname || '').toLowerCase());
    }

    function isJavLibraryResolvableSearchUrl(url) {
        return isJavLibraryTitleSearchUrl(url) || isJavLibraryComboSearchUrl(url);
    }

    function buildJavLibraryComboSearchAjaxUrl(seedUrl = location.href) {
        const parsed = parseTrackingUrl(seedUrl || location.href);
        if (!parsed) return 'https://www.javlibrary.com/ajax/ajax_combosearch.php';
        return new URL('/ajax/ajax_combosearch.php', parsed.origin).toString();
    }

    function buildJavLibraryAdvancedSearchUrl(seedUrl = location.href) {
        const parsed = parseTrackingUrl(seedUrl || location.href);
        if (!parsed) return 'https://www.javlibrary.com/cn/search.php';
        const localeMatch = String(parsed.pathname || '').match(/^\/([a-z]{2})(?:\/|$)/i);
        const locale = localeMatch?.[1] || 'cn';
        return new URL('/' + locale + '/search.php', parsed.origin).toString();
    }

    const JAVLIBRARY_COMBO_OPTION_CACHE = new Map();
    const JAVLIBRARY_SEARCH_PAGE_CONTEXT_CACHE = new Map();
    const JAVLIBRARY_COMBO_OPTION_STORAGE_KEY = 'jlc_javlibrary_combo_option_snapshot_v1';
    const JAVLIBRARY_COMBO_FIELD_TABLE_MAP = Object.freeze({
        director: 'director_filter',
        maker: 'maker_filter',
        label: 'label_filter',
        genre: 'genre_filter',
        cast: 'cast_filter'
    });

    function normalizeJavLibraryComboOptionLabel(value) {
        return compactText(value || '')
            .replace(/[：:=]/g, '')
            .replace(/[()（）[]【】]/g, '')
            .replace(/[/／]/g, '')
            .replace(/[|｜]/g, '')
            .replace(/s+/g, '')
            .toLowerCase();
    }

    function resolveJavLibraryComboFieldAlias(rawKey) {
        const key = normalizeJavLibraryComboOptionLabel(rawKey);
        if (!key) return '';
        if (key.includes('title') || key.includes('標題') || key.includes('标题') || key.includes('片名')) return 'title';
        if (key.includes('genre') || key.includes('ジャンル') || key.includes('類別') || key.includes('类别') || key.includes('分類') || key.includes('分类')) return 'genre';
        if (key.includes('director') || key.includes('監督') || key.includes('导演') || key.includes('導演')) return 'director';
        if (key.includes('maker') || key.includes('メーカー') || key.includes('製作') || key.includes('制作') || key.includes('片商') || key.includes('studio')) return 'maker';
        if (key.includes('label') || key.includes('レーベル') || key.includes('系列') || key.includes('厂牌') || key.includes('廠牌')) return 'label';
        if (key.includes('cast') || key.includes('actor') || key.includes('出演') || key.includes('女优') || key.includes('女優') || key.includes('演员') || key.includes('演員')) return 'cast';
        return '';
    }

    function parseJavLibraryComboKeyword(keyword) {
        const raw = compactText(keyword || '');
        if (!raw || !raw.includes('=')) return [];
        const entries = [];
        const segments = raw.split('||');
        for (const segment of segments) {
            const cleaned = compactText(String(segment || '').replace(/^\|+|\|+$/g, ''));
            if (!cleaned) continue;
            const normalized = cleaned.replace(/＝/g, '=');
            const dividerIndex = normalized.indexOf('=');
            if (dividerIndex <= 0) continue;
            const key = compactText(normalized.slice(0, dividerIndex));
            const value = compactText(normalized.slice(dividerIndex + 1));
            const fieldAlias = resolveJavLibraryComboFieldAlias(key);
            if (!fieldAlias || !value) continue;
            entries.push({ key, value, fieldAlias });
        }
        return entries;
    }

    function isJavLibraryAdvancedSearchDocumentReady(doc) {
        return !!doc?.querySelector([
            'select[name="genre1"]',
            'select[name="genre2"]',
            'select[name="director"]',
            'select[name="maker"]',
            'select[name="label"]',
            '#genre_filter .multiselectblock .block[value]',
            '#director_filter .multiselectblock .block[value]',
            '#maker_filter .multiselectblock .block[value]',
            '#label_filter .multiselectblock .block[value]',
            '#cast_filter .multiselectblock .block[value]'
        ].join(', '));
    }

    function summarizeJavLibrarySearchDocument(doc) {
        return compactText(doc?.body?.textContent || doc?.title || '').slice(0, 120);
    }

    function parseJavLibrarySearchHtml(htmlText) {
        const html = String(htmlText || '');
        if (!html) return null;
        try {
            return new DOMParser().parseFromString(html, 'text/html');
        } catch (error) {
            return null;
        }
    }

    function createJavLibraryComboOptionEntry(value, label) {
        const normalized = normalizeJavLibraryComboOptionLabel(label);
        const compactValue = compactText(value || '');
        const compactLabel = compactText(label || '');
        if (!normalized || !compactValue) return null;
        return { value: compactValue, label: compactLabel, normalized };
    }

    function mergeJavLibraryComboOptionArrays(...lists) {
        const merged = [];
        const seen = new Set();
        lists.flat().forEach((option) => {
            const normalized = compactText(option?.normalized || normalizeJavLibraryComboOptionLabel(option?.label || ''));
            const value = compactText(option?.value || '');
            const label = compactText(option?.label || '');
            if (!normalized || !value) return;
            const key = normalized + '|' + value;
            if (seen.has(key)) return;
            seen.add(key);
            merged.push({ value, label, normalized });
        });
        return merged;
    }

    function extractJavLibraryComboSelectOptions(doc, name) {
        const select = doc?.querySelector('select[name="' + name + '"]');
        if (!select) return [];
        return mergeJavLibraryComboOptionArrays(Array.from(select.querySelectorAll('option')).map((option) => createJavLibraryComboOptionEntry(option.getAttribute('value') || '', option.textContent || '')));
    }

    function extractJavLibraryComboBlockOptions(doc, fieldAlias) {
        const tableId = JAVLIBRARY_COMBO_FIELD_TABLE_MAP[fieldAlias] || '';
        if (!tableId) return [];
        const nodes = doc?.querySelectorAll('#' + tableId + ' .multiselectblock .block[value]') || [];
        return mergeJavLibraryComboOptionArrays(Array.from(nodes).map((node) => createJavLibraryComboOptionEntry(node.getAttribute('value') || '', node.textContent || '')));
    }

    function normalizeJavLibraryComboOptionFields(fields) {
        const next = Object.create(null);
        for (const name of ['director', 'maker', 'label', 'genre1', 'genre2', 'cast1', 'cast2']) {
            next[name] = mergeJavLibraryComboOptionArrays(fields?.[name] || []);
        }
        return next;
    }

    function mergeJavLibraryComboOptionFields(...sources) {
        const merged = Object.create(null);
        for (const name of ['director', 'maker', 'label', 'genre1', 'genre2', 'cast1', 'cast2']) {
            merged[name] = mergeJavLibraryComboOptionArrays(...sources.map((source) => source?.[name] || []));
        }
        return merged;
    }

    function hasJavLibraryComboOptionFields(fields) {
        return ['director', 'maker', 'label', 'genre1', 'genre2', 'cast1', 'cast2'].some((name) => Array.isArray(fields?.[name]) && fields[name].length > 0);
    }

    function loadStoredJavLibraryComboOptionFields() {
        const raw = GM_getValue(JAVLIBRARY_COMBO_OPTION_STORAGE_KEY, '');
        if (!raw) return normalizeJavLibraryComboOptionFields({});
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return normalizeJavLibraryComboOptionFields(parsed?.fields || parsed || {});
        } catch (error) {
            return normalizeJavLibraryComboOptionFields({});
        }
    }

    function saveStoredJavLibraryComboOptionFields(fields, meta = {}) {
        const incoming = normalizeJavLibraryComboOptionFields(fields || {});
        if (!hasJavLibraryComboOptionFields(incoming)) return loadStoredJavLibraryComboOptionFields();
        const current = loadStoredJavLibraryComboOptionFields();
        const merged = mergeJavLibraryComboOptionFields(current, incoming);
        const currentJson = JSON.stringify(current);
        const mergedJson = JSON.stringify(merged);
        if (currentJson !== mergedJson) {
            GM_setValue(JAVLIBRARY_COMBO_OPTION_STORAGE_KEY, JSON.stringify({
                updatedAt: Date.now(),
                source: compactText(meta?.source || ''),
                fields: merged
            }));
        }
        return merged;
    }

    async function ensureJavLibrarySearchPageContext(seedUrl = location.href) {
        const searchUrl = buildJavLibraryAdvancedSearchUrl(seedUrl);
        if (JAVLIBRARY_SEARCH_PAGE_CONTEXT_CACHE.has(searchUrl)) return JAVLIBRARY_SEARCH_PAGE_CONTEXT_CACHE.get(searchUrl);
        const pending = new Promise((resolve, reject) => {
            const frame = document.createElement('iframe');
            frame.style.cssText = 'position:fixed;left:-99999px;top:-99999px;width:1px;height:1px;opacity:0;pointer-events:none;border:0;';
            frame.setAttribute('aria-hidden', 'true');
            let settled = false;
            let timer = 0;
            let deadline = 0;
            const cleanup = () => {
                frame.onload = null;
                frame.onerror = null;
                if (timer) {
                    window.clearTimeout(timer);
                    timer = 0;
                }
            };
            const fail = (error) => {
                if (settled) return;
                settled = true;
                cleanup();
                try { frame.remove(); } catch (_) {}
                JAVLIBRARY_SEARCH_PAGE_CONTEXT_CACHE.delete(searchUrl);
                reject(error instanceof Error ? error : new Error(String(error || 'load-search-page-failed')));
            };
            const inspect = () => {
                if (settled) return;
                try {
                    const win = frame.contentWindow;
                    const doc = frame.contentDocument || win?.document;
                    if (!win || !doc) throw new Error('search-page-context-empty');
                    if (isJavLibraryAdvancedSearchDocumentReady(doc)) {
                        settled = true;
                        cleanup();
                        resolve({ searchUrl, frame, window: win, document: doc });
                        return;
                    }
                    if (Date.now() >= deadline) {
                        const snippet = compactText(doc.body?.textContent || doc.title || '').slice(0, 120);
                        throw new Error('search-page-form-not-ready' + (snippet ? ' · ' + snippet : ''));
                    }
                    timer = window.setTimeout(inspect, 300);
                } catch (error) {
                    fail(error);
                }
            };
            frame.onload = () => inspect();
            frame.onerror = () => fail(new Error('search-page-load-error'));
            document.body.appendChild(frame);
            deadline = Date.now() + 20000;
            frame.src = searchUrl;
        });
        JAVLIBRARY_SEARCH_PAGE_CONTEXT_CACHE.set(searchUrl, pending);
        return pending;
    }

    function extractJavLibraryComboSearchOptionsFromDoc(doc) {
        const fields = Object.create(null);
        fields.director = mergeJavLibraryComboOptionArrays(extractJavLibraryComboSelectOptions(doc, 'director'), extractJavLibraryComboBlockOptions(doc, 'director'));
        fields.maker = mergeJavLibraryComboOptionArrays(extractJavLibraryComboSelectOptions(doc, 'maker'), extractJavLibraryComboBlockOptions(doc, 'maker'));
        fields.label = mergeJavLibraryComboOptionArrays(extractJavLibraryComboSelectOptions(doc, 'label'), extractJavLibraryComboBlockOptions(doc, 'label'));
        const genreOptions = mergeJavLibraryComboOptionArrays(extractJavLibraryComboSelectOptions(doc, 'genre1'), extractJavLibraryComboSelectOptions(doc, 'genre2'), extractJavLibraryComboBlockOptions(doc, 'genre'));
        const castOptions = mergeJavLibraryComboOptionArrays(extractJavLibraryComboSelectOptions(doc, 'cast1'), extractJavLibraryComboSelectOptions(doc, 'cast2'), extractJavLibraryComboBlockOptions(doc, 'cast'));
        fields.genre1 = genreOptions;
        fields.genre2 = genreOptions;
        fields.cast1 = castOptions;
        fields.cast2 = castOptions;
        return normalizeJavLibraryComboOptionFields(fields);
    }

    async function fetchJavLibraryAdvancedSearchDocument(searchUrl, seedUrl = searchUrl) {
        if (isJavLibraryAdvancedSearchDocumentReady(document) && buildJavLibraryAdvancedSearchUrl(location.href) === searchUrl) {
            return { searchUrl, document, source: 'current-document' };
        }

        const acceptHeader = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
        let lastSnippet = '';

        try {
            const response = await fetch(searchUrl, {
                method: 'GET',
                credentials: 'include',
                redirect: 'follow',
                headers: { 'Accept': acceptHeader }
            });
            const text = await response.text();
            const doc = parseJavLibrarySearchHtml(text);
            lastSnippet = summarizeJavLibrarySearchDocument(doc);
            if (response.ok && isJavLibraryAdvancedSearchDocumentReady(doc)) {
                return { searchUrl, document: doc, source: 'fetch' };
            }
        } catch (error) {
            lastSnippet = compactText(error?.message || lastSnippet || '');
        }

        const pageResponse = await requestPage(searchUrl, {
            headers: {
                'Accept': acceptHeader,
                'Referer': seedUrl || searchUrl
            }
        });
        const pageDoc = parseJavLibrarySearchHtml(pageResponse.responseText || '');
        lastSnippet = summarizeJavLibrarySearchDocument(pageDoc) || lastSnippet;
        if (pageResponse.ok && isJavLibraryAdvancedSearchDocumentReady(pageDoc)) {
            return { searchUrl, document: pageDoc, source: 'gm-request' };
        }

        const context = await ensureJavLibrarySearchPageContext(seedUrl);
        if (isJavLibraryAdvancedSearchDocumentReady(context?.document)) {
            return { searchUrl, document: context.document, source: 'iframe' };
        }

        throw new Error('search-page-form-not-ready' + (lastSnippet ? ' · ' + lastSnippet : ''));
    }

    async function loadJavLibraryComboSearchOptions(seedUrl = location.href) {
        const searchUrl = buildJavLibraryAdvancedSearchUrl(seedUrl);
        if (JAVLIBRARY_COMBO_OPTION_CACHE.has(searchUrl)) return JAVLIBRARY_COMBO_OPTION_CACHE.get(searchUrl);
        const pending = (async () => {
            const storedFields = loadStoredJavLibraryComboOptionFields();
            try {
                const state = await fetchJavLibraryAdvancedSearchDocument(searchUrl, seedUrl);
                const liveFields = extractJavLibraryComboSearchOptionsFromDoc(state?.document);
                const mergedFields = hasJavLibraryComboOptionFields(liveFields)
                    ? saveStoredJavLibraryComboOptionFields(liveFields, { source: state?.source || '' })
                    : storedFields;
                return {
                    searchUrl,
                    source: hasJavLibraryComboOptionFields(liveFields) && hasJavLibraryComboOptionFields(storedFields)
                        ? (state?.source || 'live') + '+stored-cache'
                        : (state?.source || (hasJavLibraryComboOptionFields(mergedFields) ? 'stored-cache' : '')),
                    fields: mergeJavLibraryComboOptionFields(storedFields, liveFields)
                };
            } catch (error) {
                if (hasJavLibraryComboOptionFields(storedFields)) {
                    return { searchUrl, source: 'stored-cache', fields: storedFields, stale: true };
                }
                JAVLIBRARY_COMBO_OPTION_CACHE.delete(searchUrl);
                throw error;
            }
        })().catch((error) => {
            JAVLIBRARY_COMBO_OPTION_CACHE.delete(searchUrl);
            throw error;
        });
        JAVLIBRARY_COMBO_OPTION_CACHE.set(searchUrl, pending);
        return pending;
    }

    function primeJavLibraryComboOptionSnapshotFromCurrentPage() {
        if (currentWeb !== 'javlibrary' || !isJavLibraryAdvancedSearchPageUrl(location.href)) return;
        let attempts = 0;
        const inspect = () => {
            attempts += 1;
            const fields = extractJavLibraryComboSearchOptionsFromDoc(document);
            if (hasJavLibraryComboOptionFields(fields)) {
                saveStoredJavLibraryComboOptionFields(fields, { source: 'current-page-prime' });
                return;
            }
            if (attempts < 20) window.setTimeout(inspect, 800);
        };
        window.setTimeout(inspect, 600);
    }

    function createDefaultJavLibraryComboForm(keyword) {
        const form = new URLSearchParams();
        form.set('title', '');
        form.set('start_year', '');
        form.set('start_month', '');
        form.set('end_year', '');
        form.set('end_month', '');
        form.set('min_rating', '0');
        form.set('max_rating', '10');
        form.set('director', '');
        form.set('maker', '');
        form.set('label', '');
        form.set('genre1', '');
        form.set('genre2', '');
        form.set('cast1', '');
        form.set('cast2', '');
        form.set('data', keyword);
        return form;
    }

    // 基于 2026-04-08 search.php HAR 提取的类别映射，用于过期 combo searchid 重建。
    const JAVLIBRARY_COMBO_GENRE_STATIC_ENTRIES = [
            [
                    "72",
                    "69"
            ],
            [
                    "190",
                    "3D"
            ],
            [
                    "88",
                    "4小时以上作品"
            ],
            [
                    "676",
                    "AI生成作品"
            ],
            [
                    "250",
                    "COSPLAY服饰"
            ],
            [
                    "279",
                    "HD DVD"
            ],
            [
                    "232",
                    "MicroSD"
            ],
            [
                    "590",
                    "M女"
            ],
            [
                    "513",
                    "M男"
            ],
            [
                    "2",
                    "OL"
            ],
            [
                    "298",
                    "R-15"
            ],
            [
                    "304",
                    "R-18"
            ],
            [
                    "4",
                    "SM"
            ],
            [
                    "220",
                    "UMD"
            ],
            [
                    "302",
                    "VFT"
            ],
            [
                    "311",
                    "VHS"
            ],
            [
                    "558",
                    "VR"
            ],
            [
                    "610",
                    "下属・同事"
            ],
            [
                    "36",
                    "业余"
            ],
            [
                    "12",
                    "中出"
            ],
            [
                    "631",
                    "主妇之友"
            ],
            [
                    "78",
                    "主观视角"
            ],
            [
                    "273",
                    "主题工作"
            ],
            [
                    "93",
                    "乱伦"
            ],
            [
                    "48",
                    "乳交"
            ],
            [
                    "70",
                    "乳房"
            ],
            [
                    "596",
                    "乳房偷窺"
            ],
            [
                    "123",
                    "乳液"
            ],
            [
                    "291",
                    "亚洲"
            ],
            [
                    "163",
                    "亚洲女演员"
            ],
            [
                    "199",
                    "介绍影片"
            ],
            [
                    "50",
                    "企画"
            ],
            [
                    "37",
                    "伴侣"
            ],
            [
                    "194",
                    "修女"
            ],
            [
                    "47",
                    "倒追"
            ],
            [
                    "626",
                    "假阳具"
            ],
            [
                    "52",
                    "偶像"
            ],
            [
                    "214",
                    "偷窥"
            ],
            [
                    "33",
                    "偷窥"
            ],
            [
                    "119",
                    "催眠"
            ],
            [
                    "111",
                    "兔女郎"
            ],
            [
                    "75",
                    "全裸"
            ],
            [
                    "283",
                    "公主"
            ],
            [
                    "120",
                    "其他学生"
            ],
            [
                    "31",
                    "其他恋物癖"
            ],
            [
                    "594",
                    "养女"
            ],
            [
                    "87",
                    "内衣"
            ],
            [
                    "32",
                    "内衣"
            ],
            [
                    "181",
                    "冒险"
            ],
            [
                    "284",
                    "写真偶像"
            ],
            [
                    "84",
                    "凌辱"
            ],
            [
                    "76",
                    "出轨"
            ],
            [
                    "26",
                    "制服"
            ],
            [
                    "154",
                    "制服外套"
            ],
            [
                    "209",
                    "动画人物"
            ],
            [
                    "18",
                    "单体作品"
            ],
            [
                    "173",
                    "即兴性交"
            ],
            [
                    "207",
                    "历史剧"
            ],
            [
                    "517",
                    "原作改编"
            ],
            [
                    "195",
                    "去背影片"
            ],
            [
                    "215",
                    "及膝袜"
            ],
            [
                    "293",
                    "友谊"
            ],
            [
                    "14",
                    "双性人"
            ],
            [
                    "616",
                    "叔母"
            ],
            [
                    "536",
                    "受孕"
            ],
            [
                    "5",
                    "变性者"
            ],
            [
                    "8",
                    "口交"
            ],
            [
                    "74",
                    "各种职业"
            ],
            [
                    "184",
                    "后母"
            ],
            [
                    "66",
                    "吞精"
            ],
            [
                    "313",
                    "呕吐"
            ],
            [
                    "128",
                    "和服、丧服"
            ],
            [
                    "289",
                    "喜剧"
            ],
            [
                    "170",
                    "国外进口"
            ],
            [
                    "188",
                    "处女"
            ],
            [
                    "183",
                    "处男"
            ],
            [
                    "13",
                    "多P"
            ],
            [
                    "51",
                    "大小姐"
            ],
            [
                    "244",
                    "天赋"
            ],
            [
                    "597",
                    "夫妻交换"
            ],
            [
                    "234",
                    "奇异的"
            ],
            [
                    "57",
                    "女上位"
            ],
            [
                    "592",
                    "女上司"
            ],
            [
                    "174",
                    "女主播"
            ],
            [
                    "62",
                    "女优按摩棒"
            ],
            [
                    "10",
                    "女佣"
            ],
            [
                    "175",
                    "女儿"
            ],
            [
                    "67",
                    "女医生"
            ],
            [
                    "15",
                    "女同性恋"
            ],
            [
                    "145",
                    "女同接吻"
            ],
            [
                    "91",
                    "女大学生"
            ],
            [
                    "208",
                    "女忍者"
            ],
            [
                    "200",
                    "女战士"
            ],
            [
                    "27",
                    "女教师"
            ],
            [
                    "249",
                    "女检察官"
            ],
            [
                    "219",
                    "女祭司"
            ],
            [
                    "151",
                    "女装人妖"
            ],
            [
                    "3",
                    "奴隶"
            ],
            [
                    "105",
                    "妄想"
            ],
            [
                    "71",
                    "妓女"
            ],
            [
                    "165",
                    "妹妹"
            ],
            [
                    "34",
                    "姐姐"
            ],
            [
                    "204",
                    "娃娃"
            ],
            [
                    "216",
                    "子宫颈"
            ],
            [
                    "133",
                    "孕妇"
            ],
            [
                    "65",
                    "学校作品"
            ],
            [
                    "82",
                    "学校泳装"
            ],
            [
                    "92",
                    "家教"
            ],
            [
                    "168",
                    "寡妇"
            ],
            [
                    "312",
                    "导尿"
            ],
            [
                    "157",
                    "局部特写"
            ],
            [
                    "103",
                    "屁股"
            ],
            [
                    "117",
                    "展场女孩"
            ],
            [
                    "44",
                    "巨乳"
            ],
            [
                    "515",
                    "巨大屁股"
            ],
            [
                    "516",
                    "巨大阴茎"
            ],
            [
                    "45",
                    "已婚妇女"
            ],
            [
                    "243",
                    "帽型"
            ],
            [
                    "149",
                    "平胸"
            ],
            [
                    "146",
                    "年轻女孩"
            ],
            [
                    "83",
                    "强奸"
            ],
            [
                    "90",
                    "强奸"
            ],
            [
                    "299",
                    "形象俱乐部"
            ],
            [
                    "263",
                    "心理、惊悚片"
            ],
            [
                    "206",
                    "性感的"
            ],
            [
                    "236",
                    "性爱"
            ],
            [
                    "554",
                    "性转换・女体化"
            ],
            [
                    "158",
                    "性骚扰"
            ],
            [
                    "99",
                    "恋乳癖"
            ],
            [
                    "197",
                    "恋爱"
            ],
            [
                    "35",
                    "恋物癖"
            ],
            [
                    "122",
                    "恋腿癖"
            ],
            [
                    "281",
                    "恐怖"
            ],
            [
                    "182",
                    "恶作剧"
            ],
            [
                    "248",
                    "悬疑"
            ],
            [
                    "115",
                    "情侣"
            ],
            [
                    "308",
                    "感官作品"
            ],
            [
                    "166",
                    "戏剧"
            ],
            [
                    "269",
                    "成人动漫"
            ],
            [
                    "189",
                    "成人电影"
            ],
            [
                    "104",
                    "成熟的女人"
            ],
            [
                    "196",
                    "战斗行动"
            ],
            [
                    "22",
                    "户外"
            ],
            [
                    "59",
                    "手指插入"
            ],
            [
                    "9",
                    "打手枪"
            ],
            [
                    "86",
                    "投稿"
            ],
            [
                    "95",
                    "护士"
            ],
            [
                    "16",
                    "拘束"
            ],
            [
                    "186",
                    "拳交"
            ],
            [
                    "77",
                    "拷问"
            ],
            [
                    "85",
                    "按摩"
            ],
            [
                    "17",
                    "按摩棒"
            ],
            [
                    "136",
                    "排便"
            ],
            [
                    "520",
                    "接吻"
            ],
            [
                    "602",
                    "接待员"
            ],
            [
                    "100",
                    "插入异物"
            ],
            [
                    "319",
                    "搔痒"
            ],
            [
                    "102",
                    "放尿"
            ],
            [
                    "218",
                    "故事集"
            ],
            [
                    "303",
                    "教学"
            ],
            [
                    "167",
                    "数位马赛克"
            ],
            [
                    "296",
                    "文化"
            ],
            [
                    "611",
                    "新娘"
            ],
            [
                    "73",
                    "新娘、年轻妻子"
            ],
            [
                    "595",
                    "旅行"
            ],
            [
                    "159",
                    "旗袍"
            ],
            [
                    "601",
                    "无内裤"
            ],
            [
                    "112",
                    "无毛"
            ],
            [
                    "608",
                    "无胸罩"
            ],
            [
                    "549",
                    "时间停止"
            ],
            [
                    "96",
                    "明星脸"
            ],
            [
                    "521",
                    "晒黑"
            ],
            [
                    "247",
                    "暗黑系"
            ],
            [
                    "288",
                    "暴力"
            ],
            [
                    "148",
                    "服务生"
            ],
            [
                    "586",
                    "极致·性高潮"
            ],
            [
                    "131",
                    "校服"
            ],
            [
                    "139",
                    "格斗家"
            ],
            [
                    "179",
                    "模拟"
            ],
            [
                    "107",
                    "模特儿"
            ],
            [
                    "185",
                    "正太控"
            ],
            [
                    "255",
                    "正常"
            ],
            [
                    "233",
                    "残忍画面"
            ],
            [
                    "46",
                    "母乳"
            ],
            [
                    "125",
                    "母亲"
            ],
            [
                    "11",
                    "水手服"
            ],
            [
                    "24",
                    "汽车性爱"
            ],
            [
                    "266",
                    "法国"
            ],
            [
                    "588",
                    "泡沫浴"
            ],
            [
                    "110",
                    "泡泡袜"
            ],
            [
                    "109",
                    "泳装"
            ],
            [
                    "618",
                    "洗浴"
            ],
            [
                    "609",
                    "洽公服装"
            ],
            [
                    "523",
                    "流汗"
            ],
            [
                    "60",
                    "浴衣"
            ],
            [
                    "280",
                    "海外"
            ],
            [
                    "251",
                    "淋浴"
            ],
            [
                    "56",
                    "淫乱、真实"
            ],
            [
                    "40",
                    "淫语"
            ],
            [
                    "113",
                    "深喉"
            ],
            [
                    "512",
                    "温泉"
            ],
            [
                    "210",
                    "滑稽模仿"
            ],
            [
                    "116",
                    "滥交"
            ],
            [
                    "64",
                    "潮吹"
            ],
            [
                    "25",
                    "灌肠"
            ],
            [
                    "106",
                    "烂醉如泥的"
            ],
            [
                    "294",
                    "爱好、文化"
            ],
            [
                    "264",
                    "爱情故事"
            ],
            [
                    "265",
                    "爱情浪漫"
            ],
            [
                    "212",
                    "特效"
            ],
            [
                    "224",
                    "独立制作"
            ],
            [
                    "79",
                    "猎艳"
            ],
            [
                    "217",
                    "猥亵穿着"
            ],
            [
                    "130",
                    "猫耳女"
            ],
            [
                    "126",
                    "玩具"
            ],
            [
                    "619",
                    "瑜伽"
            ],
            [
                    "134",
                    "男同性恋"
            ],
            [
                    "242",
                    "男性"
            ],
            [
                    "591",
                    "男潮吹"
            ],
            [
                    "147",
                    "瘦小身型"
            ],
            [
                    "152",
                    "白人"
            ],
            [
                    "187",
                    "白天出轨"
            ],
            [
                    "169",
                    "监禁"
            ],
            [
                    "81",
                    "眼镜"
            ],
            [
                    "114",
                    "礼仪小姐"
            ],
            [
                    "604",
                    "社团・经理"
            ],
            [
                    "211",
                    "科幻"
            ],
            [
                    "171",
                    "秘书"
            ],
            [
                    "101",
                    "空中小姐"
            ],
            [
                    "285",
                    "童年朋友"
            ],
            [
                    "53",
                    "第一人称摄影"
            ],
            [
                    "522",
                    "粉丝感谢"
            ],
            [
                    "132",
                    "粪便"
            ],
            [
                    "39",
                    "精选、综合"
            ],
            [
                    "140",
                    "紧缚"
            ],
            [
                    "63",
                    "紧身衣"
            ],
            [
                    "605",
                    "约会"
            ],
            [
                    "97",
                    "纪录片"
            ],
            [
                    "137",
                    "经典"
            ],
            [
                    "80",
                    "绳缚"
            ],
            [
                    "310",
                    "给女性观众"
            ],
            [
                    "292",
                    "综合短篇"
            ],
            [
                    "30",
                    "美容院"
            ],
            [
                    "55",
                    "美少女"
            ],
            [
                    "301",
                    "美少女电影"
            ],
            [
                    "23",
                    "羞耻"
            ],
            [
                    "632",
                    "翻白眼・失神"
            ],
            [
                    "124",
                    "老板娘、女主人"
            ],
            [
                    "198",
                    "肌肉"
            ],
            [
                    "6",
                    "肛交"
            ],
            [
                    "614",
                    "背后"
            ],
            [
                    "135",
                    "胖女人"
            ],
            [
                    "203",
                    "脱衣"
            ],
            [
                    "19",
                    "自慰"
            ],
            [
                    "603",
                    "自慰辅助"
            ],
            [
                    "42",
                    "舔阴"
            ],
            [
                    "202",
                    "艺人"
            ],
            [
                    "89",
                    "苗条"
            ],
            [
                    "68",
                    "荡妇"
            ],
            [
                    "155",
                    "药物"
            ],
            [
                    "20",
                    "萝莉塔"
            ],
            [
                    "231",
                    "歌德萝莉"
            ],
            [
                    "635",
                    "蒙面・面具"
            ],
            [
                    "129",
                    "蓝光"
            ],
            [
                    "222",
                    "薄马赛克"
            ],
            [
                    "600",
                    "虐打"
            ],
            [
                    "223",
                    "蛮横娇羞"
            ],
            [
                    "589",
                    "蜡烛"
            ],
            [
                    "201",
                    "行动"
            ],
            [
                    "49",
                    "裸体围裙"
            ],
            [
                    "177",
                    "西洋片"
            ],
            [
                    "7",
                    "角色扮演"
            ],
            [
                    "164",
                    "角色扮演者"
            ],
            [
                    "225",
                    "触手"
            ],
            [
                    "246",
                    "触摸打字"
            ],
            [
                    "191",
                    "讲师"
            ],
            [
                    "205",
                    "访问"
            ],
            [
                    "61",
                    "调教"
            ],
            [
                    "118",
                    "赛车女郎"
            ],
            [
                    "229",
                    "超乳"
            ],
            [
                    "282",
                    "超短裙"
            ],
            [
                    "98",
                    "足交"
            ],
            [
                    "153",
                    "跳舞"
            ],
            [
                    "156",
                    "跳蛋"
            ],
            [
                    "121",
                    "身体意识"
            ],
            [
                    "172",
                    "车掌小姐"
            ],
            [
                    "94",
                    "轮奸"
            ],
            [
                    "620",
                    "软体"
            ],
            [
                    "43",
                    "辣妹"
            ],
            [
                    "587",
                    "辱骂"
            ],
            [
                    "245",
                    "运动"
            ],
            [
                    "617",
                    "运动员"
            ],
            [
                    "127",
                    "运动短裤"
            ],
            [
                    "29",
                    "连裤袜"
            ],
            [
                    "38",
                    "迷你裙"
            ],
            [
                    "150",
                    "迷你裙警察"
            ],
            [
                    "622",
                    "酒店"
            ],
            [
                    "192",
                    "重印版"
            ],
            [
                    "666",
                    "长靴"
            ],
            [
                    "21",
                    "露出"
            ],
            [
                    "286",
                    "青年"
            ],
            [
                    "615",
                    "面试"
            ],
            [
                    "268",
                    "韩国"
            ],
            [
                    "69",
                    "颜射"
            ],
            [
                    "58",
                    "颜射"
            ],
            [
                    "144",
                    "颜面骑乘"
            ],
            [
                    "193",
                    "飞特族"
            ],
            [
                    "138",
                    "食粪"
            ],
            [
                    "141",
                    "饮尿"
            ],
            [
                    "606",
                    "饮酒派对"
            ],
            [
                    "54",
                    "首次亮相"
            ],
            [
                    "108",
                    "高"
            ],
            [
                    "28",
                    "高中女生"
            ],
            [
                    "607",
                    "高龄男"
            ],
            [
                    "178",
                    "魔鬼系"
            ],
            [
                    "162",
                    "鸭嘴"
            ],
            [
                    "160",
                    "黑人演员"
            ],
            [
                    "627",
                    "鼻勾"
            ]
    ];

    const JAVLIBRARY_COMBO_STATIC_VALUE_MAP = (() => {
        const map = Object.create(null);
        const define = (fieldAlias, value, labels) => {
            if (!fieldAlias || !value || !Array.isArray(labels)) return;
            const bucket = map[fieldAlias] || (map[fieldAlias] = Object.create(null));
            labels.forEach((label) => {
                const normalized = normalizeJavLibraryComboOptionLabel(label);
                if (normalized && !bucket[normalized]) bucket[normalized] = compactText(value);
            });
        };
        JAVLIBRARY_COMBO_GENRE_STATIC_ENTRIES.forEach(([value, label]) => define('genre', value, [label]));
        define('genre', '15', ['女同性恋', '女同性戀', '女同', 'レズ', 'レズビアン', 'lesbian']);
        define('genre', '12', ['中出', '中出し', '内射', '內射']);
        define('genre', '93', ['乱伦', '亂倫', '近親相姦', '近亲相奸', 'incest']);
        define('genre', '34', ['姐姐', '姉', 'お姉さん', '姉系']);
        return map;
    })();

    function resolveJavLibraryComboStaticValue(fieldAlias, rawValue) {
        const normalized = normalizeJavLibraryComboOptionLabel(rawValue);
        if (!normalized) return '';
        const bucket = JAVLIBRARY_COMBO_STATIC_VALUE_MAP[fieldAlias] || null;
        return compactText(bucket?.[normalized] || '');
    }

    function shouldTryLoadJavLibraryComboOptions(entries) {
        return (Array.isArray(entries) ? entries : []).some((entry) => {
            if (!entry?.fieldAlias || entry.fieldAlias === 'title') return false;
            if (entry.fieldAlias === 'genre') return !resolveJavLibraryComboStaticValue('genre', entry.value);
            return true;
        });
    }

    function resolveJavLibraryComboOptionValue(fieldOptions, rawValue, fieldAlias = '') {
        const normalized = normalizeJavLibraryComboOptionLabel(rawValue);
        if (!normalized) return '';
        const options = Array.isArray(fieldOptions) ? fieldOptions : [];
        let matched = options.find((option) => option.normalized === normalized);
        if (!matched) matched = options.find((option) => option.normalized.includes(normalized) || normalized.includes(option.normalized));
        return compactText(matched?.value || '') || resolveJavLibraryComboStaticValue(fieldAlias, rawValue);
    }

    async function buildJavLibraryComboSearchBody(keyword, seedUrl = location.href) {
        const form = createDefaultJavLibraryComboForm(keyword);
        const entries = parseJavLibraryComboKeyword(keyword);
        if (!entries.length) return form.toString();

        let optionState = null;
        let optionLoadError = null;
        if (shouldTryLoadJavLibraryComboOptions(entries)) {
            try {
                optionState = await loadJavLibraryComboSearchOptions(seedUrl);
            } catch (error) {
                optionLoadError = error;
            }
        }

        const fields = optionState?.fields || {};
        const unresolved = [];
        let genreIndex = 0;
        let castIndex = 0;
        for (const entry of entries) {
            if (entry.fieldAlias === 'title') {
                form.set('title', entry.value);
                continue;
            }
            if (entry.fieldAlias === 'director' || entry.fieldAlias === 'maker' || entry.fieldAlias === 'label') {
                const resolvedValue = resolveJavLibraryComboOptionValue(fields[entry.fieldAlias], entry.value, entry.fieldAlias);
                if (resolvedValue) form.set(entry.fieldAlias, resolvedValue);
                else unresolved.push(entry);
                continue;
            }
            if (entry.fieldAlias === 'genre') {
                const targetField = genreIndex === 0 ? 'genre1' : (genreIndex === 1 ? 'genre2' : '');
                if (!targetField) continue;
                const resolvedValue = resolveJavLibraryComboOptionValue(fields[targetField], entry.value, 'genre')
                    || resolveJavLibraryComboOptionValue(fields.genre1, entry.value, 'genre')
                    || resolveJavLibraryComboOptionValue(fields.genre2, entry.value, 'genre');
                if (resolvedValue) {
                    form.set(targetField, resolvedValue);
                    genreIndex += 1;
                } else {
                    unresolved.push(entry);
                }
                continue;
            }
            if (entry.fieldAlias === 'cast') {
                const targetField = castIndex === 0 ? 'cast1' : (castIndex === 1 ? 'cast2' : '');
                if (!targetField) continue;
                const resolvedValue = resolveJavLibraryComboOptionValue(fields[targetField], entry.value, 'cast')
                    || resolveJavLibraryComboOptionValue(fields.cast1, entry.value, 'cast')
                    || resolveJavLibraryComboOptionValue(fields.cast2, entry.value, 'cast');
                if (resolvedValue) {
                    form.set(targetField, resolvedValue);
                    castIndex += 1;
                } else {
                    unresolved.push(entry);
                }
            }
        }
        if (unresolved.length) {
            console.warn('[Commander] JavLibrary combo 仍有未解析选项', {
                keyword,
                unresolved: unresolved.map((entry) => ({ fieldAlias: entry.fieldAlias, key: entry.key, value: entry.value })),
                optionSource: optionState?.source || 'static',
                optionError: optionLoadError?.message || ''
            });
        }
        return form.toString();
    }

    function buildResolvedJavLibrarySearchUrl(seedParsed, targetPhp, searchId, keyword, pageHint) {
        const localeMatch = String(seedParsed?.pathname || '').match(/^\/([a-z]{2})(?:\/|$)/i);
        const locale = localeMatch?.[1] || 'cn';
        const resultUrl = new URL('/' + locale + '/' + String(targetPhp || '').replace(/^\/+/, ''), seedParsed?.origin || 'https://www.javlibrary.com');
        resultUrl.searchParams.set('searchid', searchId);
        resultUrl.searchParams.set('keyword', keyword);
        if ((Number(pageHint || 0) || 1) > 1) resultUrl.searchParams.set('page', String(Number(pageHint || 0) || 1));
        else resultUrl.searchParams.delete('page');
        return resultUrl.toString();
    }

    async function requestJavLibrarySearchId(seedUrl, ajaxUrl, body, options = {}) {
        let responseText = '';
        let status = 0;
        let blockedByChallenge = false;
        const fetchImpl = options?.fetchWindow && typeof options.fetchWindow.fetch === 'function'
            ? options.fetchWindow.fetch.bind(options.fetchWindow)
            : (typeof fetch === 'function'
                ? fetch.bind(typeof globalThis !== 'undefined' ? globalThis : window)
                : window.fetch.bind(window));
        try {
            const requestInit = {
                method: 'POST',
                credentials: 'include',
                redirect: 'follow',
                cache: 'no-store',
                headers: {
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body
            };
            if (options?.referrerUrl) requestInit.referrer = options.referrerUrl;
            if (options?.referrerPolicy) requestInit.referrerPolicy = options.referrerPolicy;
            const response = await fetchImpl(ajaxUrl, requestInit);
            status = response.status || 0;
            responseText = await response.text();
            blockedByChallenge = isChallengePage(responseText) || isLikelyBotGuardResponse(responseText);
            if (blockedByChallenge || [403, 429, 503].includes(status)) {
                return {
                    ok: false,
                    error: blockedByChallenge ? 'challenge' : ('HTTP ' + status),
                    url: seedUrl,
                    cfRequired: true,
                    blockedByChallenge: blockedByChallenge || [403, 429, 503].includes(status),
                    response: { status, text: responseText }
                };
            }
            if (!response.ok) {
                return { ok: false, error: 'HTTP ' + status, url: seedUrl, response: { status, text: responseText } };
            }
        } catch (error) {
            return { ok: false, error: error?.message || 'network', url: seedUrl, response: null };
        }

        let payload = null;
        try {
            payload = JSON.parse(responseText || '{}');
        } catch (error) {
            if (blockedByChallenge || isChallengePage(responseText) || isLikelyBotGuardResponse(responseText)) {
                return {
                    ok: false,
                    error: 'challenge',
                    url: seedUrl,
                    cfRequired: true,
                    blockedByChallenge: true,
                    response: { status, text: responseText }
                };
            }
            return { ok: false, error: 'JavLibrary 返回的不是 JSON', url: seedUrl, response: { status, text: responseText } };
        }

        const searchId = compactText(payload?.ID || payload?.id || '');
        const targetPhp = compactText(payload?.URL || '');
        if (!searchId || !targetPhp) {
            const delay = Number(payload?.DELAY || payload?.delay || 0) || 0;
            const apiError = Number(payload?.ERROR || payload?.error || 0) || 0;
            if (apiError < 0 && delay > 0) {
                return {
                    ok: false,
                    error: 'rate-limited',
                    url: seedUrl,
                    rateLimited: true,
                    retryAfterMs: delay >= 1000 ? delay : (delay * 1000),
                    response: { status, payload, text: responseText }
                };
            }
            console.warn('[Commander] JavLibrary searchid 响应异常', { seedUrl, ajaxUrl, payload, text: responseText, body });
            return { ok: false, error: '未拿到新的 searchid', url: seedUrl, response: { status, payload, text: responseText } };
        }
        return { ok: true, status, payload, text: responseText, searchId, targetPhp };
    }

    async function resolveJavLibraryTitleSearchUrl(record, options = {}) {
        const keyword = compactText(options.keyword || getTrackingSearchQuery(record, options.context) || '');
        const seedUrl = options.seedUrl || record?.page_url || record?.open_url || location.href;
        const pageHint = Number(options.pageHint || 0) || 1;
        if (!keyword) {
            return { ok: false, error: 'missing-query', url: seedUrl, response: null };
        }

        const seedParsed = parseTrackingUrl(seedUrl || location.href);
        const currentParsed = parseTrackingUrl(location.href);
        if (!seedParsed) {
            return { ok: false, error: '无效的 JavLibrary 链接', url: seedUrl, response: null };
        }
        if (currentParsed && currentParsed.origin !== seedParsed.origin) {
            return { ok: false, error: '请在 JavLibrary 页面中打开这条追更后再重建 searchid', url: seedUrl, response: null };
        }

        const requestResult = await requestJavLibrarySearchId(seedUrl, buildJavLibrarySimpleSearchAjaxUrl(seedUrl), 'type=1&data=' + encodeURIComponent(keyword));
        if (!requestResult.ok) return requestResult;
        return {
            ok: true,
            url: buildResolvedJavLibrarySearchUrl(seedParsed, requestResult.targetPhp || 'vl_searchbytitle.php', requestResult.searchId, keyword, pageHint),
            response: { status: requestResult.status, payload: requestResult.payload, text: requestResult.text },
            keyword
        };
    }

    async function resolveJavLibraryComboSearchUrl(record, options = {}) {
        const keyword = compactText(options.keyword || getTrackingSearchQuery(record, options.context) || '');
        const seedUrl = options.seedUrl || record?.page_url || record?.open_url || location.href;
        const pageHint = Number(options.pageHint || 0) || 1;
        if (!keyword) {
            return { ok: false, error: 'missing-query', url: seedUrl, response: null };
        }

        const seedParsed = parseTrackingUrl(seedUrl || location.href);
        const currentParsed = parseTrackingUrl(location.href);
        if (!seedParsed) {
            return { ok: false, error: '无效的 JavLibrary 链接', url: seedUrl, response: null };
        }
        if (currentParsed && currentParsed.origin !== seedParsed.origin) {
            return { ok: false, error: '请在 JavLibrary 页面中打开这条追更后再重建 searchid', url: seedUrl, response: null };
        }

        const ajaxUrl = buildJavLibraryComboSearchAjaxUrl(seedUrl);
        const searchUrl = buildJavLibraryAdvancedSearchUrl(seedUrl);
        const requestBody = await buildJavLibraryComboSearchBody(keyword, seedUrl);
        const requestOptions = { referrerUrl: searchUrl, referrerPolicy: 'strict-origin-when-cross-origin' };
        const requestResult = await requestJavLibrarySearchId(seedUrl, ajaxUrl, requestBody, requestOptions);
        if (!requestResult.ok) return requestResult;
        return {
            ok: true,
            url: buildResolvedJavLibrarySearchUrl(seedParsed, requestResult.targetPhp || 'vl_searchbycombo.php', requestResult.searchId, keyword, pageHint),
            response: { status: requestResult.status, payload: requestResult.payload, text: requestResult.text },
            keyword
        };
    }

    async function resolveJavLibrarySearchUrl(record, options = {}) {
        const seedUrl = options.seedUrl || record?.page_url || record?.open_url || location.href;
        return isJavLibraryComboSearchUrl(seedUrl)
            ? resolveJavLibraryComboSearchUrl(record, options)
            : resolveJavLibraryTitleSearchUrl(record, options);
    }

    const JAVLIBRARY_PENDING_COMBO_REBUILD_KEY = 'jlc_pending_javlibrary_combo_rebuild_v1';

    function loadPendingJavLibraryComboRebuild() {
        const raw = GM_getValue(JAVLIBRARY_PENDING_COMBO_REBUILD_KEY, '');
        if (!raw) return null;
        try {
            return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (error) {
            return null;
        }
    }

    function savePendingJavLibraryComboRebuild(payload) {
        GM_setValue(JAVLIBRARY_PENDING_COMBO_REBUILD_KEY, payload ? JSON.stringify(payload) : '');
    }

    function clearPendingJavLibraryComboRebuild() {
        GM_setValue(JAVLIBRARY_PENDING_COMBO_REBUILD_KEY, '');
    }

    function isJavLibraryAdvancedSearchPageUrl(url = location.href) {
        const parsed = parseTrackingUrl(url || '');
        if (!parsed) return false;
        return /javlibrary\./i.test(String(parsed.hostname || ''))
            && /\/search\.php$/i.test(String(parsed.pathname || '').toLowerCase());
    }

    async function waitForJavLibraryAdvancedSearchDocument(timeoutMs = 20000) {
        if (isJavLibraryAdvancedSearchDocumentReady(document)) return document;
        return new Promise((resolve, reject) => {
            const deadline = Date.now() + timeoutMs;
            let timer = 0;
            const inspect = () => {
                if (isJavLibraryAdvancedSearchDocumentReady(document)) {
                    if (timer) window.clearTimeout(timer);
                    resolve(document);
                    return;
                }
                if (Date.now() >= deadline) {
                    if (timer) window.clearTimeout(timer);
                    reject(new Error('search-page-form-not-ready' + (summarizeJavLibrarySearchDocument(document) ? ' · ' + summarizeJavLibrarySearchDocument(document) : '')));
                    return;
                }
                timer = window.setTimeout(inspect, 300);
            };
            inspect();
        });
    }

    async function redirectToJavLibraryComboSearchPage(record, options = {}) {
        const seedUrl = options.seedUrl || record?.page_url || record?.open_url || location.href;
        const keyword = compactText(options.keyword || getTrackingSearchQuery(record, options.context) || '');
        const pageHint = Number(options.pageHint || 0) || 1;
        if (!keyword) {
            return { ok: false, error: 'missing-query', url: seedUrl, response: null };
        }
        savePendingJavLibraryComboRebuild({
            recordId: compactText(record?.id || ''),
            keyword,
            seedUrl,
            pageHint,
            createdAt: Date.now()
        });
        if (record?.id) await saveTrackingRecord(record);
        const searchUrl = buildJavLibraryAdvancedSearchUrl(seedUrl);
        location.href = searchUrl;
        return { ok: false, pending: true, url: searchUrl, response: null };
    }

    async function processPendingJavLibraryComboRebuild() {
        if (currentWeb !== 'javlibrary' || !isJavLibraryAdvancedSearchPageUrl(location.href)) return false;
        const pending = loadPendingJavLibraryComboRebuild();
        if (!pending) return false;
        const createdAt = Number(pending.createdAt || 0) || 0;
        if (createdAt > 0 && Date.now() - createdAt > 10 * 60 * 1000) {
            clearPendingJavLibraryComboRebuild();
            return false;
        }

        const seedUrl = pending.seedUrl || location.href;
        const searchUrl = buildJavLibraryAdvancedSearchUrl(seedUrl);
        if (buildTrackingCanonicalUrl(location.href) !== buildTrackingCanonicalUrl(searchUrl)) {
            location.replace(searchUrl);
            return true;
        }

        let record = null;
        if (pending.recordId) {
            try {
                record = await getVal(TRACKING_STORE, pending.recordId);
            } catch (error) {
                record = null;
            }
        }
        const keyword = compactText(pending.keyword || getTrackingSearchQuery(record) || '');
        if (!keyword) {
            clearPendingJavLibraryComboRebuild();
            showAlert('组合搜索重建失败：缺少原搜索词');
            return true;
        }

        try {
            await waitForJavLibraryAdvancedSearchDocument(20000);
        } catch (error) {
            clearPendingJavLibraryComboRebuild();
            showAlert('组合搜索页还没准备好：' + (error?.message || '未知错误'));
            return true;
        }

        if (record) applyTrackingSearchQuery(record, keyword);
        const pageHint = Number(pending.pageHint || 0) || 1;
        const ajaxUrl = buildJavLibraryComboSearchAjaxUrl(seedUrl);
        const requestBody = await buildJavLibraryComboSearchBody(keyword, seedUrl);
        const requestOptions = { fetchWindow: window, referrerUrl: searchUrl, referrerPolicy: 'strict-origin-when-cross-origin' };
        const requestResult = await requestJavLibrarySearchId(seedUrl, ajaxUrl, requestBody, requestOptions);
        clearPendingJavLibraryComboRebuild();
        if (!requestResult.ok) {
            if (record?.id) {
                record.last_check_at = new Date().toISOString();
                record.check_status = 'error';
                record.check_note = '组合搜索重建失败 · ' + (requestResult.error || '未知错误');
                await saveTrackingRecord(record);
            }
            showAlert('重新生成 JavLibrary 组合搜索失败：' + (requestResult.error || '未知错误'));
            return true;
        }

        const seedParsed = parseTrackingUrl(seedUrl || location.href);
        const resultUrl = buildResolvedJavLibrarySearchUrl(seedParsed, requestResult.targetPhp || 'vl_searchbycombo.php', requestResult.searchId, keyword, pageHint);
        if (record?.id) {
            record.open_url = resultUrl;
            await saveTrackingRecord(record);
        }
        location.replace(resultUrl);
        return true;
    }

function isTrackingResolvableOpenUrl(url) {
        const parsed = parseTrackingUrl(url || '');
        if (!parsed) return false;
        if (isJavLibraryResolvableSearchUrl(parsed.href)) {
            const keyword = compactText(parsed.searchParams.get('keyword') || '');
            return !!keyword || !!parsed.searchParams.get('searchid');
        }
        return true;
    }

// @@creamu-part:45-tracking-state
    function buildTrackingNavigationUrl(record) {
        const normalizedUrl = buildTrackingOpenUrl(record?.site, record?.open_url || record?.page_url || '', record || {}) || '';
        const fallbackUrl = record?.page_url || record?.open_url || normalizedUrl || '';
        const baseUrl = isTrackingResolvableOpenUrl(normalizedUrl) ? normalizedUrl : fallbackUrl;
        const parsed = parseTrackingUrl(baseUrl);
        if (!parsed) return baseUrl;
        const mode = resolveTrackingSearchMode(record, parsed);
        if (String(record?.site || '').toLowerCase() === 'javlibrary' && mode === 'backfill') {
            const topPage = Number(record.top_page_hint || 0) || 0;
            const seenPage = Number(record.last_seen_page_hint || 0) || 0;
            const browsedPage = Number(record.last_browsed_page_hint || 0) || 0;
            const page = topPage > seenPage
                ? topPage
                : Number(seenPage || topPage || browsedPage || 0);
            if (page > 1) parsed.searchParams.set('page', String(page));
            else parsed.searchParams.delete('page');
        }
        return parsed.toString();
    }

    function getTrackingHeadingText(doc = document) {
        // 绝不能扫到工作台设置里的 <h3>资源增强</h3> 等脚本 UI
        const selectors = [
            '#rightcolumn h3',
            '#rightcolumn h2',
            '#rightcolumn h1',
            '#content h1',
            '#content h2',
            '#content h3',
            '.boxtitle',
            'h1.title',
            'h1',
            'h2.title',
            'h2',
            'h3',
            '.page-title',
            '.section-name',
            '.title.is-4',
            '.title.is-3',
            '.main h3',
            '.container h3'
        ];
        for (const selector of selectors) {
            const nodes = doc.querySelectorAll(selector);
            for (const node of nodes) {
                if (isScriptUiNode(node)) continue;
                const text = compactText(node);
                if (!text || text.length > 120 || isTrackingUiChromeLabel(text)) continue;
                return text;
            }
        }
        const title = compactText(doc.title || '');
        const cleaned = title.replace(/\s*[-|｜·].*$/, '').trim();
        return isTrackingUiChromeLabel(cleaned) ? '' : cleaned;
    }

    function getCurrentListPageHint(url = location.href, doc = document) {
        const parsed = parseTrackingUrl(url);
        if (!parsed) return 1;
        const fromParam = Number(parsed.searchParams.get('page') || parsed.searchParams.get('p') || 0);
        if (fromParam > 0) return fromParam;
        const pathMatch = parsed.pathname.match(/\/(\d+)\/?$/);
        if (pathMatch?.[1] && /(search|star|actor|series|genre|tag|studio|maker|director|label|publisher)/i.test(parsed.pathname)) {
            return Number(pathMatch[1]) || 1;
        }
        const active = doc.querySelector('.pagination .active, .pagination .current, .page_selector .page.active, .page_selector .current, .pagination-list .is-current');
        const activeText = parseInt(compactText(active), 10);
        return Number.isFinite(activeText) && activeText > 0 ? activeText : 1;
    }

    function normalizeTrackingCoverUrl(url, baseUrl = location.href) {
        let raw = compactText(url || '');
        if (!raw || /^data:/i.test(raw)) return '';
        if (/placeholder|blank\.|spacer|1x1|loading\.gif|transparent|data:image\/gif/i.test(raw)) return '';
        // srcset 取第一段
        if (raw.includes(',')) raw = compactText(raw.split(',')[0] || '');
        if (/\s/.test(raw)) raw = compactText(raw.split(/\s+/)[0] || '');
        try {
            const abs = new URL(raw, baseUrl || location.href).href;
            return abs.replace(/\/thumbs\//ig, '/images/');
        } catch (error) {
            return raw;
        }
    }

    function extractCoverUrlFromNode(node, baseUrl = location.href) {
        if (!node || typeof node.querySelectorAll !== 'function') return '';
        const imgs = node.querySelectorAll('img');
        for (const img of imgs) {
            const src = img.getAttribute('data-src')
                || img.getAttribute('data-original')
                || img.getAttribute('data-lazy-src')
                || img.getAttribute('data-srcset')
                || img.getAttribute('srcset')
                || img.currentSrc
                || img.getAttribute('src')
                || '';
            const normalized = normalizeTrackingCoverUrl(src, baseUrl);
            if (normalized) return normalized;
        }
        return '';
    }

    function extractTrackingAvatarFromDocument(doc = document, groupType = '', baseUrl = location.href) {
        if (String(groupType || '').toLowerCase() !== 'actor' || !doc?.querySelector) return '';
        const selectors = [
            '.avatar-box img',
            '.photo-frame img',
            '#avatar img',
            'img.avatar',
            '.star-photo img',
            '.actor-avatar img',
            '.avatar img',
            '#side-menu img[src*="actress"]',
            '#side-menu img[src*="actor"]'
        ];
        for (const selector of selectors) {
            const img = doc.querySelector(selector);
            if (!img || (typeof img.closest === 'function' && isScriptUiNode(img))) continue;
            const url = normalizeTrackingCoverUrl(
                img.getAttribute('data-src') || img.getAttribute('src') || img.currentSrc || '',
                baseUrl
            );
            if (url) return url;
        }
        return '';
    }

    function applyTrackingCoverFields(record, itemInfo = null, options = {}) {
        if (!record) return record;
        const cover = normalizeTrackingCoverUrl(
            itemInfo?.cover || options.cover || '',
            options.baseUrl || location.href
        );
        if (cover) {
            record.top_cover = cover;
            record.cover_url = cover;
        }
        const avatar = normalizeTrackingCoverUrl(options.avatar || '', options.baseUrl || location.href);
        if (avatar) record.avatar_url = avatar;
        return record;
    }

    function getTrackingGroupMonogram(groupType) {
        const map = {
            actor: '演',
            director: '导',
            maker: '商',
            studio: '牌',
            series: '系',
            tag: '标',
            keyword: '搜',
            custom: '追'
        };
        return map[String(groupType || '').toLowerCase()] || '追';
    }

    function getTrackingDisplayCoverUrl(record) {
        return compactText(record?.avatar_url || record?.top_cover || record?.cover_url || '');
    }

    function buildWorkbenchCoverHtml(record) {
        const coverUrl = getTrackingDisplayCoverUrl(record);
        const groupType = getTrackingEffectiveGroupType(record);
        const mono = getTrackingGroupMonogram(groupType);
        const shapeClass = groupType === 'actor' && record?.avatar_url ? ' is-avatar' : ' is-poster';
        if (coverUrl) {
            return ''
                + '<div class="jlc-wb-cover' + shapeClass + '" data-group="' + escapeHtml(groupType) + '">'
                + '  <img src="' + escapeHtml(coverUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer" draggable="false"'
                + '    onerror="this.style.display=\'none\';var f=this.nextElementSibling;if(f)f.hidden=false;">'
                + '  <span class="jlc-wb-cover-fallback" hidden>' + escapeHtml(mono) + '</span>'
                + '</div>';
        }
        return ''
            + '<div class="jlc-wb-cover is-mono" data-group="' + escapeHtml(groupType) + '">'
            + '  <span class="jlc-wb-cover-fallback">' + escapeHtml(mono) + '</span>'
            + '</div>';
    }

    function getTrackingItemInfoFromNode(node) {
        if (!node) return null;
        const avid = normalizeResourceAvid(
            node.dataset.jlcAvid
            || node.querySelector('date[name="avid"]')?.textContent
            || node.querySelector('.id')?.textContent
            || ''
        );
        if (!avid) return null;
        const title = compactText(
            node.dataset.jlcTitle
            || node.querySelector('a[name="av-title"]')?.getAttribute('title')
            || node.querySelector('a[name="av-title"] span:last-child')?.textContent
            || node.querySelector('.detail-b a')?.getAttribute('title')
            || node.querySelector('.detail-b a')?.textContent
            || node.querySelector('.title')?.textContent
            || ''
        );
        const cover = extractCoverUrlFromNode(node, location.href);
        return { avid, title, cover, node };
    }

    function getTrackingItemNodesFromRoot(root = document) {
        return collectCommanderItems(root).filter(item => item instanceof HTMLElement && item.matches('.item-b'));
    }

    function getFirstTrackingPageItemInfo(root = document) {
        const items = getTrackingItemNodesFromRoot(root);
        for (const item of items) {
            const info = getTrackingItemInfoFromNode(item);
            if (info?.avid) return info;
        }
        return null;
    }

    function getTrackingDocumentItemCount(doc, site) {
        const selector = ConstCode[site]?.itemSelector;
        if (!selector || !doc?.querySelectorAll) return 0;
        return Array.from(doc.querySelectorAll(selector)).reduce((count, node) => {
            return getTrackingRawItemInfo(node, site)?.avid ? (count + 1) : count;
        }, 0);
    }

    function getTrackingAnchorItemInfo(root = document, mode = 'forward') {
        const items = getTrackingItemNodesFromRoot(root);
        const infos = [];
        for (const item of items) {
            const info = getTrackingItemInfoFromNode(item);
            if (info?.avid) infos.push(info);
        }
        if (!infos.length) return null;
        return mode === 'backfill' ? infos[infos.length - 1] : infos[0];
    }

    function getTrackingVisibleRangeInfo(root = document) {
        const infos = [];
        getTrackingItemNodesFromRoot(root).forEach(item => {
            const info = getTrackingItemInfoFromNode(item);
            if (info?.avid) infos.push(info);
        });
        if (!infos.length) {
            return { first: '', last: '', label: '' };
        }
        const first = infos[0].avid || '';
        const last = infos[infos.length - 1].avid || '';
        return {
            first,
            last,
            label: first && last ? (first === last ? first : (first + ' ~ ' + last)) : (first || last || '')
        };
    }

    function getTrackingRawItemInfo(node, site, baseUrl = '') {
        if (!node) return null;
        let avid = '';
        let title = '';
        if (site === 'javlibrary') {
            avid = normalizeResourceAvid(node.querySelector('div.id')?.textContent || '');
            title = compactText(node.querySelector('div.title')?.textContent || node.querySelector('a')?.getAttribute('title') || '');
        } else if (site === 'javdb') {
            avid = normalizeResourceAvid(node.querySelector('div.video-title strong')?.textContent || node.querySelector('strong')?.textContent || '');
            title = compactText(node.querySelector('a')?.getAttribute('title') || node.querySelector('div.video-title')?.textContent || '');
        } else {
            avid = normalizeResourceAvid(node.querySelector('date')?.textContent || '');
            title = compactText(node.querySelector('img')?.getAttribute('title') || node.querySelector('.photo-info')?.textContent || node.querySelector('a')?.getAttribute('title') || '');
        }
        const href = node.querySelector('a')?.getAttribute('href') || '';
        const cover = extractCoverUrlFromNode(node, baseUrl || location.href);
        return avid ? { avid, title, href, cover } : null;
    }

    function getTrackingFirstItemFromDocument(doc, site) {
        const selector = ConstCode[site]?.itemSelector;
        if (!selector) return null;
        const nodes = Array.from(doc.querySelectorAll(selector));
        for (const node of nodes) {
            const info = getTrackingRawItemInfo(node, site);
            if (info?.avid) return info;
        }
        return null;
    }

    function getTrackingAnchorItemFromDocument(doc, site, mode = 'forward') {
        const selector = ConstCode[site]?.itemSelector;
        if (!selector) return null;
        const infos = [];
        Array.from(doc.querySelectorAll(selector)).forEach(node => {
            const info = getTrackingRawItemInfo(node, site);
            if (info?.avid) infos.push(info);
        });
        if (!infos.length) return null;
        return mode === 'backfill' ? infos[infos.length - 1] : infos[0];
    }

    function getTrackingItemInfosFromDocument(doc, site, baseUrl = '') {
        const selector = ConstCode[site]?.itemSelector;
        if (!selector) return [];
        const infos = [];
        Array.from(doc.querySelectorAll(selector)).forEach(node => {
            const info = getTrackingRawItemInfo(node, site, baseUrl);
            if (info?.avid) infos.push(info);
        });
        return infos;
    }

    function estimateTrackingUnreadFromInfos(record, infos, mode = 'forward') {
        const seenCode = normalizeCode(record?.last_seen_avid || '');
        if (!seenCode || !Array.isArray(infos) || !infos.length) return -1;
        const foundIndex = infos.findIndex(info => normalizeCode(info?.avid || '') === seenCode);
        if (foundIndex < 0) return -1;
        return mode === 'backfill'
            ? Math.max(0, infos.length - foundIndex - 1)
            : Math.max(0, foundIndex);
    }

    function normalizeTrackingPageLinkUrl(href, baseUrl) {
        if (!href) return '';
        const parsed = parseTrackingUrl(href, baseUrl || location.href);
        return parsed ? parsed.href : href;
    }

    function getTrackingNextPageUrl(doc, site, baseUrl) {
        const selector = ConstCode[site]?.pageNext;
        if (!selector) return '';
        const anchor = doc.querySelector(selector);
        const href = anchor?.getAttribute?.('href') || anchor?.href || '';
        return normalizeTrackingPageLinkUrl(href, baseUrl);
    }

    function getTrackingPrevPageUrl(doc, site, baseUrl) {
        const selectors = [
            ConstCode[site]?.pagePrev,
            'a.page.prev',
            'a.pagination-previous',
            'a[rel="prev"]',
            'a.prev',
            'a.previous',
            'a#prev'
        ].filter(Boolean);
        for (const selector of selectors) {
            const anchor = doc.querySelector(selector);
            const href = anchor?.getAttribute?.('href') || anchor?.href || '';
            const normalized = normalizeTrackingPageLinkUrl(href, baseUrl);
            if (normalized) return normalized;
        }
        const parsed = parseTrackingUrl(baseUrl || location.href);
        if (!parsed) return '';
        const currentPage = Number(parsed.searchParams.get('page') || parsed.searchParams.get('p') || getCurrentListPageHint(parsed.href, doc) || 0) || 0;
        if (!(currentPage > 1)) return '';
        const paramName = parsed.searchParams.has('page') ? 'page' : (parsed.searchParams.has('p') ? 'p' : 'page');
        const targetPage = currentPage - 1;
        if (targetPage > 1) parsed.searchParams.set(paramName, String(targetPage));
        else parsed.searchParams.delete(paramName);
        return parsed.toString();
    }

    function getTrackingDirectionalPageUrl(doc, site, baseUrl, direction) {
        return direction === 'prev'
            ? getTrackingPrevPageUrl(doc, site, baseUrl)
            : getTrackingNextPageUrl(doc, site, baseUrl);
    }

    function buildTrackingPageRequestOptions(url, referer = '', extra = {}) {
        const headers = Object.assign({
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache'
        }, extra.headers || {});
        const normalizedReferer = compactText(referer || '');
        if (normalizedReferer && !headers.Referer) headers.Referer = normalizedReferer;
        return Object.assign({}, extra, { headers });
    }

    function getTrackingBreakpointSearchDirections(record, currentPageHint = 0) {
        const seenPageHint = Number(record?.last_seen_page_hint || 0) || 0;
        if (seenPageHint > 0 && currentPageHint > seenPageHint) return ['prev', 'next'];
        if (seenPageHint > 0 && currentPageHint < seenPageHint) return ['next', 'prev'];
        const mode = resolveTrackingSearchMode(record, parseTrackingUrl(record?.open_url || record?.page_url || location.href));
        if (mode === 'backfill') return currentPageHint > 1 ? ['next', 'prev'] : ['next', 'prev'];
        return currentPageHint > 1 ? ['prev', 'next'] : ['next', 'prev'];
    }

    function getTrackingBreakpointDirectionLabel(direction) {
        return direction === 'prev' ? '向前' : '向后';
    }

    function getTrackingLastPageInfo(doc, baseUrl) {
        let maxPage = getCurrentListPageHint(baseUrl, doc);
        let maxUrl = '';
        const anchors = Array.from(doc.querySelectorAll('.page_selector a, .pagination a, .pagination-list a, a.page'));
        anchors.forEach(anchor => {
            const href = anchor?.getAttribute?.('href') || anchor?.href || '';
            if (!href) return;
            const parsed = parseTrackingUrl(href, baseUrl || location.href);
            if (!parsed) return;
            let page = Number(parsed.searchParams.get('page') || parsed.searchParams.get('p') || 0);
            if (!(page > 0)) page = parseInt(compactText(anchor), 10) || 0;
            if (page > maxPage) {
                maxPage = page;
                maxUrl = parsed.href;
            }
        });
        return { page: maxPage, url: maxUrl };
    }

    function getTrackingPageDescriptor(site, parsed, doc = document) {
        const pathname = String(parsed?.pathname || '');
        const lowerPath = pathname.toLowerCase();
        const heading = getTrackingHeadingText(doc);
        const visibleRange = getTrackingVisibleRangeInfo(doc);
        let pageType = 'list';
        let groupType = 'custom';
        let queryText = '';
        let groupName = '';

        const setGroup = (nextType, nextName, nextPageType = pageType) => {
            groupType = nextType;
            pageType = nextPageType;
            groupName = compactText(nextName || heading || queryText || '');
        };

        if (site === 'javlibrary') {
            const keyword = parsed?.searchParams?.get('keyword') || parsed?.searchParams?.get('q') || parsed?.searchParams?.get('search') || '';
            const extractedKeyword = extractTrackingSearchKeyword(doc, parsed, heading);
            if (/\/vl_searchbytitle\.php$/i.test(lowerPath)) {
                queryText = extractedKeyword || '';
                const friendlyFallback = visibleRange.label
                    ? ('标题搜索 · ' + visibleRange.label)
                    : buildTrackingSearchFallbackLabel('标题搜索', parsed);
                setGroup('keyword', queryText || friendlyFallback, 'search');
            } else if (/\/vl_searchbycombo\.php$/i.test(lowerPath)) {
                queryText = decodeTrackingSegment(keyword || extractedKeyword || '');
                const friendlyFallback = visibleRange.label
                    ? ('组合搜索 · ' + visibleRange.label)
                    : buildTrackingSearchFallbackLabel('组合搜索', parsed);
                setGroup('keyword', normalizeTrackingQueryLabel(queryText || heading || extractedKeyword) || queryText || friendlyFallback, 'search');
            } else if (keyword) {
                queryText = decodeTrackingSegment(keyword);
                setGroup('keyword', queryText, 'search');
            } else if (/star|actress|actor/i.test(lowerPath + String(parsed?.search || ''))) {
                setGroup('actor', heading || parsed?.searchParams?.get('star') || '', 'actor');
            } else if (/tag|genre/i.test(lowerPath + String(parsed?.search || ''))) {
                setGroup('tag', heading || parsed?.searchParams?.get('tag') || '', 'tag');
            } else if (/director/i.test(lowerPath + String(parsed?.search || ''))) {
                setGroup('director', heading || '', 'director');
            } else if (/maker/i.test(lowerPath + String(parsed?.search || ''))) {
                setGroup('maker', heading || '', 'maker');
            } else if (/label|studio/i.test(lowerPath + String(parsed?.search || ''))) {
                setGroup('studio', heading || '', 'studio');
            } else if (/series/i.test(lowerPath + String(parsed?.search || ''))) {
                setGroup('series', heading || '', 'series');
            } else {
                setGroup('custom', heading || '列表', 'list');
            }
        } else if (site === 'javbus' || site === 'avmoo') {
            if (/\/search\//i.test(lowerPath)) {
                const match = pathname.match(/\/search\/([^/]+)/i);
                queryText = decodeTrackingSegment(match?.[1] || parsed?.searchParams?.get('keyword') || '');
                setGroup('keyword', queryText, 'search');
            } else if (/\/star\//i.test(lowerPath)) {
                setGroup('actor', heading || decodeTrackingSegment(pathname.split('/star/')[1]?.split('/')[0] || ''), 'actor');
            } else if (/\/(?:genre|genres)\//i.test(lowerPath)) {
                setGroup('tag', heading || decodeTrackingSegment(pathname.split('/genre/')[1]?.split('/')[0] || ''), 'tag');
            } else if (/\/director\//i.test(lowerPath)) {
                const segment = pathname.split('/').filter(Boolean).slice(-1)[0] || '';
                setGroup('director', heading || decodeTrackingSegment(segment), 'director');
            } else if (/\/maker\//i.test(lowerPath)) {
                const segment = pathname.split('/').filter(Boolean).slice(-1)[0] || '';
                setGroup('maker', heading || decodeTrackingSegment(segment), 'maker');
            } else if (/\/studio\//i.test(lowerPath)) {
                const segment = pathname.split('/').filter(Boolean).slice(-1)[0] || '';
                setGroup('studio', heading || decodeTrackingSegment(segment), 'studio');
            } else if (/\/series\//i.test(lowerPath)) {
                const segment = pathname.split('/').filter(Boolean).slice(-1)[0] || '';
                setGroup('series', heading || decodeTrackingSegment(segment), 'series');
            } else {
                setGroup('custom', heading || '列表', 'list');
            }
        } else if (site === 'javdb') {
            const keyword = parsed?.searchParams?.get('q') || parsed?.searchParams?.get('keyword') || '';
            if (/\/search/i.test(lowerPath) || keyword) {
                queryText = decodeTrackingSegment(keyword || pathname.split('/search/')[1] || '');
                setGroup('keyword', queryText, 'search');
            } else if (/\/actors?\//i.test(lowerPath)) {
                setGroup('actor', heading || decodeTrackingSegment(pathname.split('/').filter(Boolean).slice(-1)[0] || ''), 'actor');
            } else if (/\/directors?\//i.test(lowerPath)) {
                setGroup('director', heading || decodeTrackingSegment(pathname.split('/').filter(Boolean).slice(-1)[0] || ''), 'director');
            } else if (/\/makers?\//i.test(lowerPath)) {
                setGroup('maker', heading || decodeTrackingSegment(pathname.split('/').filter(Boolean).slice(-1)[0] || ''), 'maker');
            } else if (/\/(?:studios?|publishers?|labels?)\//i.test(lowerPath)) {
                setGroup('studio', heading || decodeTrackingSegment(pathname.split('/').filter(Boolean).slice(-1)[0] || ''), 'studio');
            } else if (/\/series\//i.test(lowerPath)) {
                setGroup('series', heading || decodeTrackingSegment(pathname.split('/').filter(Boolean).slice(-1)[0] || ''), 'series');
            } else if (/\/(?:tags?|categories)\//i.test(lowerPath)) {
                setGroup('tag', heading || decodeTrackingSegment(pathname.split('/').filter(Boolean).slice(-1)[0] || ''), 'tag');
            } else {
                setGroup('custom', heading || '列表', 'list');
            }
        } else {
            setGroup('custom', heading || '列表', 'list');
        }

        const fallbackKeywordLabel = groupType === 'keyword'
            ? buildTrackingSearchFallbackLabel(pageType === 'search' && /combo/i.test(lowerPath) ? '组合搜索' : '标题搜索', parsed)
            : '';
        const pickClean = (...values) => {
            for (const value of values) {
                const text = compactText(value || '');
                if (text && !isTrackingUiChromeLabel(text)) return text;
            }
            return '';
        };
        const pageTitleBare = compactText(doc.title || '').replace(/\s*[-|｜·].*$/, '').trim();
        const resolvedName = pickClean(
            groupName,
            queryText,
            groupType === 'keyword' ? fallbackKeywordLabel : '',
            heading,
            pageTitleBare
        ) || getSiteLabel(site);
        const resolvedQueryText = pickClean(queryText);
        const resolvedRawQuery = groupType === 'keyword'
            ? pickClean(extractTrackingSearchKeyword(doc, parsed, heading), resolvedQueryText)
            : '';
        return {
            page_type: pageType,
            group_type: groupType,
            group_name: resolvedName,
            query_text: resolvedQueryText,
            raw_query: resolvedRawQuery,
            title: getSiteLabel(site) + ' · ' + resolvedName
        };
    }

    function buildTrackingSignature(context) {
        const seedUrl = context?.open_url || context?.pageUrl || location.href;
        const parsed = parseTrackingUrl(seedUrl);
        let identity = compactText(context?.raw_query || context?.query_text || '');
        if (!identity && /javlibrary\./i.test(String(parsed?.hostname || '')) && /\/vl_searchby(?:title|combo)\.php$/i.test(String(parsed?.pathname || '').toLowerCase())) {
            const searchId = compactText(parsed?.searchParams?.get('searchid') || '');
            if (searchId) identity = 'searchid:' + searchId;
        }
        const parts = [
            String(context?.site || '').toLowerCase(),
            String(context?.page_type || '').toLowerCase(),
            buildTrackingCanonicalUrl(seedUrl),
            identity
        ];
        return normalizeCode(parts.join('|'));
    }

    function getCurrentTrackingPageContext(doc = document, url = location.href) {
        const site = String(currentWeb || '').toLowerCase();
        if (!site || !ConstCode[site]) return null;
        const itemNodes = getTrackingItemNodesFromRoot(doc);
        if (!itemNodes.length) return null;
        const parsed = parseTrackingUrl(url);
        if (!parsed) return null;
        const descriptor = getTrackingPageDescriptor(site, parsed, doc);
        const searchMode = detectTrackingSearchMode(site, parsed);
        const openUrl = buildTrackingOpenUrl(site, parsed, descriptor);
        const firstItem = getTrackingAnchorItemInfo(doc, searchMode) || getFirstTrackingPageItemInfo(doc);
        const pageHint = getCurrentListPageHint(parsed.href, doc);
        const context = {
            site,
            siteLabel: getSiteLabel(site),
            open_url: openUrl,
            pageUrl: parsed.href,
            page_type: descriptor.page_type,
            group_type: descriptor.group_type,
            group_name: descriptor.group_name,
            query_text: descriptor.query_text,
            raw_query: descriptor.raw_query,
            title: descriptor.title,
            firstItem,
            itemNodes,
            page_hint: pageHint,
            page_size_hint: itemNodes.length || 0,
            search_mode: searchMode
        };
        context.query_signature = buildTrackingSignature(context);
        return context;
    }

    function formatRelativeTime(value) {
        if (!value) return '未记录';
        const time = new Date(value).getTime();
        if (!Number.isFinite(time)) return '未记录';
        const diff = Date.now() - time;
        if (diff < 60 * 1000) return '刚刚';
        if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + ' 分钟前';
        if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + ' 小时前';
        if (diff < 30 * 24 * 60 * 60 * 1000) return Math.floor(diff / (24 * 60 * 60 * 1000)) + ' 天前';
        return formatDateTime(value);
    }

    function formatDateTime(value) {
        if (!value) return '未记录';
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) return '未记录';
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
            + ' ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
    }

    /** 展示标题里去掉「JavLibrary · 」等站点前缀（站点已有胶囊） */
    function stripTrackingSiteTitlePrefix(value, site = '') {
        let text = compactText(value || '');
        if (!text) return '';
        const labels = [
            getSiteLabel(site),
            'JavLibrary', 'JAVLibrary', 'javlibrary', 'JavLib', 'Jav Library',
            'JavBus', 'javbus', 'JavDB', 'javdb', 'Avmoo', 'avmoo', 'JLC'
        ].filter(Boolean);
        const seen = new Set();
        for (const label of labels) {
            const key = String(label).toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            const escaped = String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            text = text.replace(new RegExp('^' + escaped + '\\s*[·•|\\-—–:]\\s*', 'i'), '');
        }
        text = text.replace(/^(?:jav\s*library|javlibrary|javbus|javdb|avmoo|jlc)\s*[·•|\-—–:]\s*/i, '');
        return compactText(text);
    }

    function getTrackingDisplayTitle(record, fallbackContext = null) {
        const site = record?.site || fallbackContext?.site || '';
        const custom = stripTrackingSiteTitlePrefix(record?.custom_label || '', site);
        if (custom && !isTrackingUiChromeLabel(custom)) return custom;
        const fallback = fallbackContext || {};
        const candidates = [
            record?.group_name, // 优先纯名称，避免「站点 · 名」冗余
            record?.query_text,
            record?.raw_query,
            record?.title,
            fallback.group_name,
            fallback.query_text,
            fallback.raw_query,
            fallback.title,
            record?.id,
            '当前搜索'
        ];
        for (const item of candidates) {
            const text = stripTrackingSiteTitlePrefix(item, site);
            if (text && !isTrackingUiChromeLabel(text) && !/^https?:\/\//i.test(text)) return text;
        }
        return '当前搜索';
    }

    function promptTrackingCustomLabel(record = null, context = null) {
        const defaultValue = getTrackingDisplayTitle(record, context);
        const result = window.prompt('请输入追更备注名（可留空使用自动标题）', defaultValue);
        if (result == null) return null;
        const value = compactText(result);
        if (!value || value === defaultValue) return '';
        return value;
    }

    function getTrackingUnreadMetrics(record) {
        const topCode = normalizeCode(record?.top_avid || '');
        const seenCode = normalizeCode(record?.last_seen_avid || '');
        const hasUpdate = !!topCode && !!seenCode && topCode !== seenCode;
        const topPage = Number(record?.top_page_hint || 0) || 0;
        const seenPage = Number(record?.last_seen_page_hint || 0) || 0;
        const unreadEstimate = Number(record?.unread_estimate || 0) || 0;
        const pageSizeHint = Number(record?.page_size_hint || 0) || 0;
        const pageDelta = topPage > 0 && seenPage > 0 ? Math.abs(topPage - seenPage) : 0;
        const estimatedCount = hasUpdate
            ? ((pageDelta > 0 && pageSizeHint > 0)
                ? (pageDelta * pageSizeHint + unreadEstimate)
                : unreadEstimate)
            : 0;
        return {
            hasUpdate,
            topPage,
            seenPage,
            unreadEstimate,
            pageSizeHint,
            pageDelta,
            estimatedCount: estimatedCount > 0 ? estimatedCount : 0
        };
    }

    function getTrackingUnreadSummary(record) {
        const metrics = getTrackingUnreadMetrics(record);
        if (!metrics.hasUpdate) return '';
        if (metrics.estimatedCount > 0) {
            const parts = ['约 ' + metrics.estimatedCount + ' 条更新'];
            if (metrics.pageDelta > 0) parts.push('跨 ' + metrics.pageDelta + ' 页');
            return parts.join(' · ');
        }
        if (metrics.pageDelta > 0) return '跨 ' + metrics.pageDelta + ' 页以上';
        const mode = resolveTrackingSearchMode(record, parseTrackingUrl(record?.open_url || record?.page_url || ''));
        return mode === 'backfill' ? '尾页内有更新' : '本页内有更新';
    }

    function getTrackingUnreadPillText(record) {
        const metrics = getTrackingUnreadMetrics(record);
        if (!metrics.hasUpdate) return '';
        if (metrics.estimatedCount > 0) return '+' + metrics.estimatedCount;
        if (metrics.pageDelta > 0) return '+' + metrics.pageDelta + '页';
        if (metrics.unreadEstimate > 0) return '+' + metrics.unreadEstimate;
        return '+?';
    }

    function buildTrackingStatus(record) {
        const topCode = normalizeCode(record?.top_avid || '');
        const seenCode = normalizeCode(record?.last_seen_avid || '');
        const unreadSummary = getTrackingUnreadSummary(record);
        if (record?.check_status === 'cf_required') {
            return { tone: 'yellow', text: '待验证', note: record.check_note || '需要先通过 Cloudflare 验证' };
        }
        if (record?.check_status === 'error') {
            return { tone: 'red', text: '检查失败', note: record.check_note || '请求失败' };
        }
        if (topCode && seenCode && topCode !== seenCode) {
            const noteParts = ['最新 ' + (record.top_avid || '')];
            if (unreadSummary) noteParts.push(unreadSummary);
            return { tone: 'red', text: getTrackingUnreadPillText(record) || '+?', note: noteParts.join(' · ') };
        }
        if (seenCode && topCode && seenCode === topCode) {
            return { tone: 'green', text: '已读', note: '已追到 ' + (record.last_seen_avid || '') };
        }
        if (record?.last_check_at) {
            return { tone: 'yellow', text: '已检查', note: formatRelativeTime(record.last_check_at) };
        }
        return { tone: 'gray', text: '未检查', note: record?.last_browsed_at ? ('最后浏览 ' + formatRelativeTime(record.last_browsed_at)) : '尚未浏览' };
    }

    function buildTrackingPageHintSummary(record, options = {}) {

        const parts = [];
        const topPage = Number(record?.top_page_hint || 0) || 0;
        const seenPage = Number(record?.last_seen_page_hint || 0) || 0;
        const browsedPage = Number(record?.last_browsed_page_hint || 0) || 0;
        const includeBrowsed = !!options.includeBrowsed;
        if (topPage > 0) parts.push('最新第' + topPage + '页');
        if (seenPage > 0) parts.push('断点第' + seenPage + '页');
        if (includeBrowsed && browsedPage > 0 && browsedPage !== seenPage && browsedPage !== topPage) {
            parts.push('浏览第' + browsedPage + '页');
        }
        return parts;
    }

    function isTransientTrackingErrorNote(note = '') {
        const value = String(note || '');
        if (!value) return false;
        return /(请求超时|网络失败|HTTP 403|HTTP 429|HTTP 503|Cloudflare|暂时限制刷新|返回的不是 JSON|未拿到新的 searchid|列表检查失败|尾页检查失败|重建搜索失败)/i.test(value);
    }

    function normalizeTrackingRuntimeRecord(record) {
        if (!record || typeof record !== 'object') return record;
        if (record.check_status === 'error'
            && isTransientTrackingErrorNote(record.check_note)
            && (compactText(record.top_avid || '') || compactText(record.last_seen_avid || ''))) {
            record.last_refresh_error_at = record.last_refresh_error_at || record.last_check_at || '';
            record.last_refresh_error_note = record.last_refresh_error_note || record.check_note || '';
            record.check_status = deriveTrackingStatusFromSnapshot(record);
            if (record.check_status === 'latest') record.check_note = '已追到最新';
            else if (record.check_status === 'updated') record.check_note = record.top_avid ? ('发现新番号 ' + record.top_avid) : '发现新更新';
            else if (record.check_status === 'checked') record.check_note = '已检查';
            else record.check_note = '';
        }
        return record;
    }

    async function getTrackingSearches() {
        const list = await getAllFromStore(TRACKING_STORE);
        return (Array.isArray(list) ? list : [])
            .filter(Boolean)
            .map(record => normalizeTrackingRuntimeRecord(record))
            .sort((a, b) => {
                const aTime = Date.parse(a.created_at || a.updated_at || a.last_check_at || a.last_browsed_at || 0) || 0;
                const bTime = Date.parse(b.created_at || b.updated_at || b.last_check_at || b.last_browsed_at || 0) || 0;
                return Number(!!b.pinned) - Number(!!a.pinned) || aTime - bTime;
            });
    }

    async function getTrackingRecordBySignature(signature, openUrl = '') {
        const list = await getTrackingSearches();
        const canonical = buildTrackingCanonicalUrl(openUrl || '');
        return list.find(record => record.query_signature === signature)
            || list.find(record => buildTrackingCanonicalUrl(record.open_url || '') === canonical)
            || null;
    }

    async function saveTrackingRecord(record) {
        if (!record?.id) return null;
        record.updated_at = new Date().toISOString();
        await setVal(TRACKING_STORE, record);
        return record;
    }

    async function createOrUpdateTrackingFromContext(context = getCurrentTrackingPageContext(), options = {}) {
        if (!context) return null;
        const existing = await getTrackingRecordBySignature(context.query_signature, context.open_url);
        if (!existing && options.createIfMissing === false) return null;
        const now = new Date().toISOString();
        const firstItem = context.firstItem || getFirstTrackingPageItemInfo(document);
        const pageHint = Number(context.page_hint || 0) || 1;
        const pageSizeHint = Number(context.page_size_hint || 0) || 0;
        const contextParsed = parseTrackingUrl(context.pageUrl || context.open_url || location.href);
        const searchMode = resolveTrackingSearchMode({ site: context.site, search_mode: context.search_mode }, contextParsed);
        const record = existing || {
            id: 'trk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            created_at: now,
            archived: false,
            pinned: false,
            unread_estimate: 0,
            check_status: 'unchecked',
            check_note: ''
        };
        const previousTop = record.top_avid || '';
        record.site = context.site;
        record.page_type = context.page_type;
        record.group_type = context.group_type;
        // 禁止把工作台 UI 文案（如「资源增强」）写进追更标题；已有好标题时不被污染覆盖
        const nextGroupName = compactText(context.group_name || '');
        const nextTitle = compactText(context.title || '');
        const nextQueryText = compactText(context.query_text || '');
        const nextRawQuery = compactText(context.raw_query || '');
        if (!existing) {
            record.group_name = isTrackingUiChromeLabel(nextGroupName) ? '' : nextGroupName;
            record.title = isTrackingUiChromeLabel(nextTitle) ? '' : nextTitle;
            record.query_text = isTrackingUiChromeLabel(nextQueryText) ? '' : nextQueryText;
            record.raw_query = isTrackingUiChromeLabel(nextRawQuery) ? '' : nextRawQuery;
        } else {
            if (shouldAdoptTrackingLabel(nextGroupName, record.group_name)) {
                record.group_name = nextGroupName;
            } else if (isTrackingUiChromeLabel(record.group_name)) {
                record.group_name = '';
            }
            if (shouldAdoptTrackingLabel(nextTitle, record.title)) {
                record.title = nextTitle;
            } else if (isTrackingUiChromeLabel(record.title)) {
                record.title = '';
            }
            if (shouldAdoptTrackingLabel(nextQueryText, record.query_text)) {
                record.query_text = nextQueryText;
            } else if (isTrackingUiChromeLabel(record.query_text)) {
                record.query_text = '';
            }
            if (shouldAdoptTrackingLabel(nextRawQuery, record.raw_query)) {
                record.raw_query = nextRawQuery;
            } else if (isTrackingUiChromeLabel(record.raw_query)) {
                record.raw_query = '';
            }
            // 标题被清空时，尽量用仍干净的字段拼回展示标题
            if (!compactText(record.title || '')) {
                const recoverName = compactText(record.group_name || record.query_text || record.raw_query || '');
                if (recoverName && !isTrackingUiChromeLabel(recoverName)) {
                    record.title = getSiteLabel(record.site) + ' · ' + recoverName;
                }
            }
        }
        record.page_url = context.pageUrl || record.page_url || '';
        record.open_url = context.open_url;
        record.query_signature = context.query_signature;
        record.search_mode = searchMode;
        if (pageSizeHint > 0) {
            record.page_size_hint = Math.max(Number(record.page_size_hint || 0) || 0, pageSizeHint);
        }
        if (Object.prototype.hasOwnProperty.call(options, 'customLabel')) {
            record.custom_label = compactText(options.customLabel || '');
        }

        const shouldAdoptContextTop = (() => {
            if (!firstItem?.avid || options.checkTop === false) return false;
            if (!existing || !record.top_avid) return true;
            if (searchMode === 'forward') return pageHint <= 1;
            if (searchMode === 'backfill') {
                const knownTopPage = Number(record.top_page_hint || 0) || 0;
                return knownTopPage > 0
                    && knownTopPage === pageHint
                    && normalizeCode(record.top_avid || '') === normalizeCode(firstItem.avid || '');
            }
            return pageHint <= 1;
        })();

        const pageBaseUrl = context.pageUrl || context.open_url || location.href;
        const pageAvatar = extractTrackingAvatarFromDocument(document, context.group_type || record.group_type, pageBaseUrl);
        if (pageAvatar) record.avatar_url = pageAvatar;
        if (shouldAdoptContextTop) {
            record.top_avid = firstItem.avid;
            record.top_title = firstItem.title || record.top_title || '';
            record.top_page_hint = pageHint;
            applyTrackingCoverFields(record, firstItem, { baseUrl: pageBaseUrl, avatar: pageAvatar });
            if (options.updateCheck !== false) {
                record.top_checked_at = now;
                record.last_check_at = now;
                if (record.last_seen_avid && normalizeCode(record.last_seen_avid) === normalizeCode(firstItem.avid)) {
                    record.check_status = 'latest';
                    record.check_note = '已追到最新';
                } else if (!previousTop || normalizeCode(previousTop) !== normalizeCode(firstItem.avid)) {
                    record.check_status = record.last_seen_avid ? 'updated' : 'checked';
                    record.check_note = (record.last_seen_avid ? '发现新番号 ' : '最新 ') + firstItem.avid;
                } else if (!record.check_status || record.check_status === 'unchecked') {
                    record.check_status = 'checked';
                    record.check_note = '已检查';
                }
            } else if (!record.top_checked_at) {
                record.top_checked_at = now;
            }
        } else if (firstItem?.cover && !getTrackingDisplayCoverUrl(record)) {
            // 未采纳 top 时，若仍无封面，用当前页可见首图顶一下空槽
            applyTrackingCoverFields(record, firstItem, { baseUrl: pageBaseUrl, avatar: pageAvatar });
        }

        if (options.touchBrowse) {
            record.last_browsed_at = now;
            record.last_browsed_page_hint = pageHint;
            record.last_browsed_avid = firstItem?.avid || record.last_browsed_avid || '';
            record.last_browsed_title = firstItem?.title || record.last_browsed_title || '';
        }

        if (options.seedSeen && !record.last_seen_avid && firstItem?.avid) {
            record.last_seen_avid = firstItem.avid;
            record.last_seen_title = firstItem.title || '';
            record.last_seen_at = now;
            record.last_seen_page_hint = pageHint;
            record.last_found_at = now;
            record.unread_estimate = 0;
            record.check_status = 'latest';
            record.check_note = '初始断点已设为当前首项';
        }

        if (options.explicitLastSeen?.avid) {
            record.last_seen_avid = options.explicitLastSeen.avid;
            record.last_seen_title = options.explicitLastSeen.title || '';
            record.last_seen_at = now;
            record.last_seen_page_hint = options.explicitLastSeen.page_hint || pageHint;
            record.last_found_at = now;
            const explicitUnreadEstimate = Number(options.explicitLastSeen.unread_estimate);
            if (Number.isFinite(explicitUnreadEstimate) && explicitUnreadEstimate >= 0) {
                record.unread_estimate = Math.max(0, Math.floor(explicitUnreadEstimate));
            }
            record.check_status = record.top_avid && normalizeCode(record.top_avid) === normalizeCode(record.last_seen_avid) ? 'latest' : 'checked';
            record.check_note = '断点已更新';
        }

        await saveTrackingRecord(record);
        return record;
    }

    async function markTrackingRecordRead(recordId, source = 'top') {
        const list = await getTrackingSearches();
        const record = list.find(item => item.id === recordId);
        if (!record) return null;
        const now = new Date().toISOString();
        const target = source === 'browse'
            ? { avid: record.last_browsed_avid, title: record.last_browsed_title }
            : { avid: record.top_avid, title: record.top_title };
        if (!target.avid) return null;
        const searchMode = resolveTrackingSearchMode(record, parseTrackingUrl(record.open_url || ''));
        const pageHint = source === 'browse'
            ? (Number(record.last_browsed_page_hint || record.top_page_hint || record.last_seen_page_hint || 0) || 1)
            : (searchMode === 'backfill'
                ? (Number(record.top_page_hint || record.last_browsed_page_hint || record.last_seen_page_hint || 0) || 1)
                : 1);
        record.last_seen_avid = target.avid;
        record.last_seen_title = target.title || '';
        record.last_seen_at = now;
        record.last_seen_page_hint = pageHint;
        record.last_found_at = now;
        record.unread_estimate = 0;
        record.check_status = 'latest';
        record.check_note = '已设为已读';
        await saveTrackingRecord(record);
        if (trackingPageState.record?.id === record.id) {
            trackingPageState.record = record;
            applyTrackingPageDecorations(record);
            ensureTrackingPageBar({ context: trackingPageState.context, record });
            refreshTrackingToolbarButtons();
        }
        return record;
    }

    function isTrackingVerificationRequired(record, response) {
        if (!response) return false;
        if (String(record?.site || '').toLowerCase() !== 'javlibrary') return false;
        if (response.blockedByChallenge) return true;
        const responseText = String(response.responseText || '');
        return isChallengePage(responseText)
            || isLikelyBotGuardResponse(responseText)
            || [403, 429, 503].includes(Number(response.status || 0));
    }

    function buildTrackingVerifyUrl(record) {
        return compactText(record?.pending_verify_url || '')
            || buildTrackingNavigationUrl(record)
            || record?.open_url
            || record?.page_url
            || '';
    }

    function deriveTrackingStatusFromSnapshot(record) {
        const topCode = normalizeCode(record?.top_avid || '');
        const seenCode = normalizeCode(record?.last_seen_avid || '');
        if (topCode && seenCode) return topCode === seenCode ? 'latest' : 'updated';
        if (topCode) return 'checked';
        return 'unchecked';
    }

    function clearTrackingVerificationRequired(record, options = {}) {
        if (!record || typeof record !== 'object') return record;
        record.pending_verify_url = '';
        record.verify_required_at = '';
        if (record.check_status === 'cf_required' && options.restoreStatus !== false) {
            record.check_status = deriveTrackingStatusFromSnapshot(record);
            if (!compactText(record.check_note || '') || /cloudflare|验证/i.test(String(record.check_note || ''))) {
                if (record.check_status === 'latest') record.check_note = '已追到最新';
                else if (record.check_status === 'updated') record.check_note = record.top_avid ? ('发现新番号 ' + record.top_avid) : '发现新更新';
                else if (record.check_status === 'checked') record.check_note = '已检查';
                else record.check_note = '';
            }
        }
        return record;
    }

    function preserveTrackingStatusOnRefreshFailure(record, note, now, options = {}) {
        const preserve = !!options.preserveStatus
            && (!!compactText(record?.top_avid || '')
                || !!compactText(record?.last_seen_avid || '')
                || ['latest', 'updated', 'checked'].includes(String(record?.check_status || '')));
        record.last_check_at = now;
        record.last_refresh_error_at = now;
        record.last_refresh_error_note = note || '';
        if (preserve) {
            clearTrackingVerificationRequired(record, { restoreStatus: true });
            return record;
        }
        record.check_status = 'error';
        record.check_note = note || '请求失败';
        return record;
    }

    async function probeTrackingVerificationReady(record, verifyUrl) {
        const targetUrl = compactText(verifyUrl || buildTrackingVerifyUrl(record) || '');
        if (!targetUrl) return { ok: true, skipped: true };
        const target = parseTrackingUrl(targetUrl, location.href);
        const current = parseTrackingUrl(location.href, location.href);
        if (!target || !current || target.origin !== current.origin) {
            return { ok: true, skipped: true, url: targetUrl };
        }
        const probeRecord = record || { site: 'javlibrary' };
        const response = await requestPageWithBrowserFetch(targetUrl, { timeout: 12000 });
        if (isTrackingVerificationRequired(probeRecord, response)) {
            return { ok: false, url: targetUrl, response, note: '验证尚未生效' };
        }
        if (!response.ok || !response.responseText) {
            return { ok: false, url: targetUrl, response, note: describeRequestStatus(response, '验证页请求失败') };
        }
        return { ok: true, url: targetUrl, response };
    }

    function hasPendingTrackingVerification(record) {
        return record?.check_status === 'cf_required'
            || !!compactText(record?.pending_verify_url || '');
    }

    function openTrackingVerificationUrl(verifyUrl, options = {}) {
        const normalizedUrl = compactText(verifyUrl || '');
        if (!normalizedUrl) return false;
        const opened = window.open(normalizedUrl, '_blank', 'noopener');
        if (!opened && options.fallbackToNavigate) {
            location.href = normalizedUrl;
            return true;
        }
        return !!opened;
    }

    function markTrackingVerificationRequired(record, verifyUrl, note = '') {
        record.check_status = 'cf_required';
        record.check_note = note || '遇到 Cloudflare 验证，先手动验证后再继续刷新';
        record.pending_verify_url = compactText(verifyUrl || buildTrackingVerifyUrl(record) || '');
        record.verify_required_at = new Date().toISOString();
        return record;
    }

    async function refreshSingleTrackingRecord(recordOrId, options = {}) {
        const list = await getTrackingSearches();
        const record = typeof recordOrId === 'string'
            ? list.find(item => item.id === recordOrId)
            : list.find(item => item.id === recordOrId?.id) || recordOrId;
        if (!record?.open_url || !record.site) return null;
        const now = new Date().toISOString();
        const preserveStatusOnFailure = !!options.silent || !!options.preserveStatusOnFailure;
        let requestSeedUrl = '';

        if (hasPendingTrackingVerification(record)) {
            clearTrackingVerificationRequired(record, { restoreStatus: true });
        }

        if (isJavLibraryResolvableSearchUrl(record.page_url || record.open_url || '')) {
            const searchQuery = getTrackingSearchQuery(record);
            if (!searchQuery) {
                record.last_check_at = now;
                record.check_status = 'error';
                record.check_note = '缺少原搜索词，无法刷新已过期搜索';
                await saveTrackingRecord(record);
                return record;
            }
            applyTrackingSearchQuery(record, searchQuery);
            const resolved = await resolveJavLibrarySearchUrl(record, { keyword: searchQuery, pageHint: 1 });
            if (!resolved.ok || !resolved.url) {
                const resolvedError = String(resolved.error || '');
                const rebuildNote = resolved.rateLimited
                    ? 'JavLibrary 暂时限制刷新，请稍后再试'
                    : '重建搜索失败 · ' + (resolvedError || '未知错误');
                if (resolved.cfRequired || /403|cloudflare|challenge|forbidden|验证/i.test(resolvedError)) {
                    record.last_check_at = now;
                    markTrackingVerificationRequired(record, buildTrackingNavigationUrl(record), '重建搜索时遇到 Cloudflare 验证');
                } else {
                    preserveTrackingStatusOnRefreshFailure(record, rebuildNote, now, {
                        preserveStatus: preserveStatusOnFailure || !!resolved.rateLimited
                    });
                }
                await saveTrackingRecord(record);
                return record;
            }
            requestSeedUrl = resolved.url;
            record.open_url = resolved.url;
        } else {
            const normalizedOpenUrl = buildTrackingOpenUrl(record.site, record.open_url || record.page_url || '', record || {}) || record.open_url || record.page_url;
            requestSeedUrl = isTrackingResolvableOpenUrl(normalizedOpenUrl)
                ? normalizedOpenUrl
                : (record.page_url || record.open_url || normalizedOpenUrl);
            if (normalizedOpenUrl && normalizedOpenUrl !== record.open_url && isTrackingResolvableOpenUrl(normalizedOpenUrl)) {
                record.open_url = normalizedOpenUrl;
            } else if ((!record.open_url || !isTrackingResolvableOpenUrl(record.open_url)) && requestSeedUrl) {
                record.open_url = requestSeedUrl;
            }
        }
        const openParsed = parseTrackingUrl(requestSeedUrl || record.open_url || '');
        const searchMode = resolveTrackingSearchMode(record, openParsed);
        const response = await requestPageWithBrowserFetch(requestSeedUrl || record.open_url, { timeout: 18000 });
        if (isTrackingVerificationRequired(record, response)) {
            record.last_check_at = now;
            markTrackingVerificationRequired(record, requestSeedUrl || record.open_url, '列表检查遇到 Cloudflare 验证');
            await saveTrackingRecord(record);
            return record;
        }
        if (!response.ok || !response.responseText) {
            preserveTrackingStatusOnRefreshFailure(record, '列表检查失败 · ' + describeRequestStatus(response, '请求失败'), now, {
                preserveStatus: preserveStatusOnFailure
            });
            await saveTrackingRecord(record);
            return record;
        }
        const baseDoc = new DOMParser().parseFromString(response.responseText, 'text/html');
        const baseItemCount = getTrackingDocumentItemCount(baseDoc, record.site);
        const buildPagedUrl = (seedUrl, page) => {
            const parsed = parseTrackingUrl(seedUrl || record.open_url || '');
            if (!parsed) return seedUrl || record.open_url || '';
            if (page > 1) parsed.searchParams.set('page', String(page));
            else parsed.searchParams.delete('page');
            return parsed.toString();
        };

        let targetDoc = baseDoc;
        let targetUrl = requestSeedUrl || record.open_url;
        let topPageHint = Number(getCurrentListPageHint(requestSeedUrl || record.open_url, baseDoc) || 0) || 1;

        if (String(record.site || '').toLowerCase() === 'javlibrary' && searchMode === 'backfill') {
            const lastPageInfo = getTrackingLastPageInfo(baseDoc, requestSeedUrl || record.open_url);
            const lastPage = Number(lastPageInfo.page || 0) || topPageHint || 1;
            if (lastPage > 0) topPageHint = lastPage;
            const basePageHint = Number(getCurrentListPageHint(requestSeedUrl || record.open_url, baseDoc) || 0) || 1;
            targetUrl = lastPageInfo.url || buildPagedUrl(requestSeedUrl || record.open_url, topPageHint);
            if (topPageHint > 1 && topPageHint != basePageHint) {
                const tailResponse = await requestPageWithBrowserFetch(targetUrl, { timeout: 18000 });
                if (isTrackingVerificationRequired(record, tailResponse)) {
                    record.last_check_at = now;
                    markTrackingVerificationRequired(record, targetUrl, '尾页检查遇到 Cloudflare 验证');
                    await saveTrackingRecord(record);
                    return record;
                }
                if (!tailResponse.ok || !tailResponse.responseText) {
                    preserveTrackingStatusOnRefreshFailure(record, '尾页检查失败 · ' + describeRequestStatus(tailResponse, '请求失败'), now, {
                        preserveStatus: preserveStatusOnFailure
                    });
                    await saveTrackingRecord(record);
                    return record;
                }
                targetDoc = new DOMParser().parseFromString(tailResponse.responseText, 'text/html');
            }
        }

        const targetItemCount = getTrackingDocumentItemCount(targetDoc, record.site);
        const targetInfos = getTrackingItemInfosFromDocument(targetDoc, record.site, targetUrl || requestSeedUrl || record.open_url || '');
        const pageUnreadEstimate = estimateTrackingUnreadFromInfos(record, targetInfos, searchMode);
        const firstItem = (searchMode === 'backfill' ? targetInfos[targetInfos.length - 1] : targetInfos[0])
            || getTrackingAnchorItemFromDocument(targetDoc, record.site, searchMode)
            || getTrackingFirstItemFromDocument(targetDoc, record.site);
        record.last_check_at = now;
        record.top_checked_at = now;
        record.search_mode = searchMode;
        record.pending_verify_url = '';
        record.verify_required_at = '';
        record.last_refresh_error_at = '';
        record.last_refresh_error_note = '';
        if (topPageHint > 0) record.top_page_hint = topPageHint;
        if (Math.max(baseItemCount, targetItemCount) > 0) {
            record.page_size_hint = Math.max(Number(record.page_size_hint || 0) || 0, baseItemCount, targetItemCount);
        }
        if (!firstItem?.avid) {
            record.check_status = 'error';
            record.check_note = '未解析到首个番号';
            await saveTrackingRecord(record);
            return record;
        }
        const previousTop = record.top_avid || '';
        const previousUnreadEstimate = Number(record.unread_estimate || 0) || 0;
        record.top_avid = firstItem.avid;
        record.top_title = firstItem.title || '';
        applyTrackingCoverFields(record, firstItem, {
            baseUrl: targetUrl || requestSeedUrl || record.open_url || location.href,
            avatar: extractTrackingAvatarFromDocument(targetDoc, record.group_type, targetUrl || requestSeedUrl || record.open_url || location.href)
                || extractTrackingAvatarFromDocument(baseDoc, record.group_type, requestSeedUrl || record.open_url || location.href)
        });
        if (record.last_seen_avid && normalizeCode(record.last_seen_avid) === normalizeCode(record.top_avid)) {
            record.check_status = 'latest';
            record.check_note = '已追到最新';
            record.unread_estimate = 0;
        } else {
            if (pageUnreadEstimate >= 0) {
                record.unread_estimate = pageUnreadEstimate;
            } else if (record.last_seen_avid) {
                const fallbackUnreadEstimate = (!previousTop || normalizeCode(previousTop) !== normalizeCode(record.top_avid))
                    ? Math.max(1, previousUnreadEstimate)
                    : Math.max(1, previousUnreadEstimate || 0);
                record.unread_estimate = fallbackUnreadEstimate;
            }
            if (!previousTop || normalizeCode(previousTop) !== normalizeCode(record.top_avid)) {
                record.check_status = 'updated';
                record.check_note = '发现新番号 ' + record.top_avid;
            } else {
                record.check_status = 'checked';
                record.check_note = '已检查';
            }
        }
        await saveTrackingRecord(record);
        if (!options.silent && trackingPageState.record?.id === record.id) {
            trackingPageState.record = record;
            ensureTrackingPageBar({ context: trackingPageState.context, record });
        }
        return record;
    }

    function isTrackingRefreshRateLimited(record) {

        return String(record?.site || '').toLowerCase() === 'javlibrary'
            && isJavLibraryResolvableSearchUrl(record?.page_url || record?.open_url || '');
    }

    function getTrackingRefreshBucket(record) {
        return isTrackingRefreshRateLimited(record)
            ? 'javlibrary-search-rebuild'
            : ('record:' + String(record?.id || 'unknown'));
    }

    function getTrackingRefreshCooldownMs(record) {
        return isTrackingRefreshRateLimited(record) ? (5 * 60 * 1000) : 0;
    }

    function pickNextTrackingRefreshRecord(pending, bucketLastRunAt, nowMs = Date.now()) {
        let minWaitMs = Infinity;
        for (let index = 0; index < pending.length; index += 1) {
            const record = pending[index];
            const cooldownMs = getTrackingRefreshCooldownMs(record);
            if (!(cooldownMs > 0)) {
                return { index, record, waitMs: 0 };
            }
            const bucket = getTrackingRefreshBucket(record);
            const lastRunAt = Number(bucketLastRunAt.get(bucket) || 0) || 0;
            const readyAt = lastRunAt + cooldownMs;
            if (readyAt <= nowMs) {
                return { index, record, waitMs: 0 };
            }
            minWaitMs = Math.min(minWaitMs, readyAt - nowMs);
        }
        return {
            index: -1,
            record: null,
            waitMs: Number.isFinite(minWaitMs) ? Math.max(0, minWaitMs) : 0
        };
    }

    async function refreshAllTrackingSearches(button, options = {}) {
        const requestedIds = Array.isArray(options.recordIds) ? options.recordIds.filter(Boolean) : null;
        let list = (await getTrackingSearches()).filter(record => !record.archived);
        if (requestedIds?.length) {
            const byId = new Map(list.map(record => [record.id, record]));
            list = requestedIds.map(id => byId.get(id)).filter(Boolean);
            if (options.resumeVerified) clearTrackingRefreshResumeState();
        } else {
            clearTrackingRefreshResumeState();
        }
        if (!list.length) {
            showAlert('当前没有可刷新的追更项。');
            return;
        }
        const pending = list.slice();
        const bucketLastRunAt = new Map();
        let completed = Number(options.completedBase || 0) || 0;
        const total = Number(options.total || 0) || (requestedIds?.length ? (completed + list.length) : list.length);
        let pausedForVerification = false;
        setTrackingRefreshRuntimeState({
            phase: 'refreshing',
            completed,
            total,
            note: requestedIds?.length ? '继续剩余队列' : '开始扫描'
        });
        await renderTrackingUI();
        try {
            while (pending.length) {
                const nextTask = pickNextTrackingRefreshRecord(pending, bucketLastRunAt, Date.now());
                if (!nextTask.record) {
                    const waitMs = Math.min(Math.max(1500, nextTask.waitMs || 1500), 5 * 60 * 1000);
                    await waitTrackingRefreshCountdown(waitMs, remainingMs => {
                        setTrackingRefreshRuntimeState({
                            phase: 'cooldown',
                            completed,
                            total,
                            remainingMs,
                            note: 'JavLibrary 冷却桶'
                        });
                        void renderTrackingUI();
                    });
                    continue;
                }
                const [record] = pending.splice(nextTask.index, 1);
                const cooldownNote = getTrackingRefreshCooldownMs(record) > 0 ? 'JavLibrary 冷却桶' : '请求中';
                setTrackingRefreshRuntimeState({
                    phase: 'refreshing',
                    completed,
                    total,
                    remainingMs: 0,
                    note: cooldownNote
                });
                await renderTrackingUI();
                const refreshed = await refreshSingleTrackingRecord(record, { silent: true });
                if (refreshed?.check_status === 'cf_required') {
                    pausedForVerification = true;
                    const pendingIds = [refreshed.id, ...pending.map(item => item.id)];
                    const verifyUrl = buildTrackingVerifyUrl(refreshed);
                    setTrackingRefreshResumeState({
                        pending_ids: pendingIds,
                        total,
                        completed,
                        record_id: refreshed.id,
                        verify_url: verifyUrl,
                        note: refreshed.check_note || '',
                        paused_at: new Date().toISOString()
                    });
                    setTrackingRefreshRuntimeState(null);
                    await renderTrackingUI();
                    const opened = openTrackingVerificationUrl(verifyUrl);
                    showAlert(opened
                        ? '刷新遇到 Cloudflare 验证，已尝试打开验证页；验证完回到这里点“验证后继续刷新”。'
                        : '刷新遇到 Cloudflare 验证，先点“去验证”，验证完再点“验证后继续刷新”。');
                    return;
                }
                completed += 1;
                setTrackingRefreshRuntimeState({
                    phase: 'refreshing',
                    completed,
                    total,
                    remainingMs: 0,
                    note: refreshed?.top_avid ? ('刚检查到 ' + refreshed.top_avid) : '已更新列表'
                });
                await renderTrackingUI();
                const cooldownMs = getTrackingRefreshCooldownMs(refreshed || record);
                if (cooldownMs > 0) {
                    bucketLastRunAt.set(getTrackingRefreshBucket(refreshed || record), Date.now());
                }
                if (pending.length) {
                    const pauseMs = cooldownMs > 0
                        ? (3500 + Math.random() * 2500)
                        : (2200 + Math.random() * 2200);
                    await waitTrackingRefreshCountdown(pauseMs, remainingMs => {
                        setTrackingRefreshRuntimeState({
                            phase: 'cooldown',
                            completed,
                            total,
                            remainingMs,
                            note: cooldownMs > 0 ? 'JavLibrary 冷却桶' : '请求间隔'
                        });
                        void renderTrackingUI();
                    });
                }
            }
            clearTrackingRefreshResumeState();
            setTrackingRefreshRuntimeState(null);
            await renderTrackingUI();
            showAlert(requestedIds?.length ? '剩余追更项已继续刷新完成！' : '追更列表刷新完成！');
        } finally {
            if (!pausedForVerification) setTrackingRefreshRuntimeState(null);
            renderTrackingUI();
        }
    }

// @@creamu-part:47-tracking-ui
    async function renderTrackingUI() {
        if (typeof scheduleRenderWorkbenchTrackingList === 'function') {
            // 后台刷新/滚动中勿立刻整表重绘，避免滚动被打断
            scheduleRenderWorkbenchTrackingList({}, workbenchListScrolling ? 0 : 220);
            return;
        }
        if (typeof renderWorkbenchTrackingList === 'function') {
            await renderWorkbenchTrackingList();
            return;
        }
        const root = document.getElementById('jlc-tracking-root');
        if (!root) return;
        const context = getCurrentTrackingPageContext();
        const list = (await getTrackingSearches()).filter(record => !record.archived);
        const updateCount = list.filter(record => normalizeCode(record.top_avid || '') && normalizeCode(record.top_avid || '') !== normalizeCode(record.last_seen_avid || '')).length;
        const refreshResume = getTrackingRefreshResumeState();
        const refreshRuntime = getTrackingRefreshRuntimeState();
        const runtimeSummary = buildTrackingRefreshRuntimeSummary(refreshRuntime);
        const runtimeButtonText = buildTrackingRefreshRuntimeButtonText(refreshRuntime);
        const resumePendingIds = Array.isArray(refreshResume?.pending_ids)
            ? refreshResume.pending_ids.filter(id => list.some(record => record.id === id))
            : [];
        const resumePendingCount = resumePendingIds.length;
        const collapsedState = getTrackingUiState().collapsed || {};
        const groups = new Map();
        list.forEach(record => {
            const key = getTrackingEffectiveGroupType(record);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(record);
        });

        const groupMarkup = Array.from(groups.entries())
            .sort((a, b) => {
                const aIndex = TRACKING_GROUP_ORDER.indexOf(a[0]);
                const bIndex = TRACKING_GROUP_ORDER.indexOf(b[0]);
                const normalizedA = aIndex === -1 ? TRACKING_GROUP_ORDER.length : aIndex;
                const normalizedB = bIndex === -1 ? TRACKING_GROUP_ORDER.length : bIndex;
                return normalizedA - normalizedB || String(a[0]).localeCompare(String(b[0]));
            })
            .map(([groupType, records]) => {
            const groupKey = 'group_' + groupType;
            const collapsed = !!collapsedState[groupKey];
            const hasUpdate = records.filter(record => normalizeCode(record.top_avid || '') && normalizeCode(record.top_avid || '') !== normalizeCode(record.last_seen_avid || '')).length;
            const rows = records.map(record => {
                const status = buildTrackingStatus(record);
                const displayTitle = getTrackingDisplayTitle(record);
                const pageHints = buildTrackingPageHintSummary(record);
                const pageSummary = pageHints.length ? (' · ' + pageHints.join(' · ')) : '';
                const metaParts = [];
                if (record.top_avid) metaParts.push('<span>最新：' + escapeHtml(record.top_avid) + '</span>');
                if (record.last_seen_avid) metaParts.push('<span>断点：' + escapeHtml(record.last_seen_avid) + '</span>');
                const browseOnly = buildTrackingPageHintSummary(record, { includeBrowsed: true }).find(item => item.startsWith('浏览第'));
                if (browseOnly) metaParts.push('<span>' + escapeHtml(browseOnly) + '</span>');
                metaParts.push('<span title="' + escapeHtml(formatDateTime(record.last_browsed_at)) + '">最后浏览：' + escapeHtml(formatRelativeTime(record.last_browsed_at)) + '</span>');
                metaParts.push('<span title="' + escapeHtml(formatDateTime(record.last_check_at)) + '">最后检查：' + escapeHtml(formatRelativeTime(record.last_check_at)) + '</span>');
                return ''
                    + '<div class="jlc-tracking-item" data-jlc-tracking-id="' + escapeHtml(record.id) + '">'
                    + '  <div class="jlc-tracking-main">'
                    + '    <div class="jlc-tracking-title-row">'
                    + '      <span class="jlc-status-pill tone-' + escapeHtml(status.tone) + '" title="' + escapeHtml(status.note || '') + '">' + escapeHtml(status.text) + '</span>'
                    + '      <span class="jlc-site-pill">' + escapeHtml(getSiteLabel(record.site)) + '</span>'
                    + '      <span class="jlc-tracking-title-text">' + escapeHtml(displayTitle) + '</span>'
                    + (pageSummary ? '      <span class="jlc-tracking-pagehint">' + escapeHtml(pageSummary) + '</span>' : '')
                    + '    </div>'
                    + '    <div class="jlc-tracking-meta">' + metaParts.join('') + '</div>'
                    + '  </div>'
                    + '  <div class="jlc-tracking-actions">'
                    + '    <button type="button" data-jlc-tracking-open="' + escapeHtml(record.id) + '">打开</button>'
                    + (isJavLibraryResolvableSearchUrl(record.page_url || record.open_url || '')
                        ? '    <button type="button" data-jlc-tracking-query="' + escapeHtml(record.id) + '" style="background:#3f5368;">改词</button>'
                        : '')
                    + '    <button type="button" data-jlc-tracking-label="' + escapeHtml(record.id) + '" style="background:#555;">改名</button>'
                    + (hasPendingTrackingVerification(record)
                        ? '    <button type="button" data-jlc-tracking-verify="' + escapeHtml(record.id) + '" style="background:#6b4f1d;">验证</button>'
                        : '')
                    + '    <button type="button" data-jlc-tracking-refresh="' + escapeHtml(record.id) + '" style="background:#444;">刷新</button>'
                    + '    <button type="button" data-jlc-tracking-delete="' + escapeHtml(record.id) + '" style="background:#5b2d2d;">删除</button>'
                    + '  </div>'
                    + '</div>';
            }).join('');
            return ''
                + '<section class="jlc-tracking-group' + (collapsed ? ' collapsed' : '') + '" data-jlc-group="' + escapeHtml(groupKey) + '">'
                + '  <button type="button" class="jlc-tracking-group-toggle" data-jlc-toggle-group="' + escapeHtml(groupKey) + '">'
                + '    <span>' + escapeHtml(getTrackingGroupLabel(groupType)) + (hasUpdate ? '（' + hasUpdate + ' 项有更新）' : '') + '</span>'
                + '    <small>' + records.length + ' 项</small>'
                + '  </button>'
                + '  <div class="jlc-tracking-group-body">' + rows + '</div>'
                + '</section>';
        }).join('');

        root.innerHTML = ''
            + '<div class="jlc-tracking-toolbar">'
            + '  <div class="jlc-tracking-toolbar-summary">共 ' + list.length + ' 项 · ' + updateCount + ' 项有更新</div>'
            + (runtimeSummary
                ? '  <div class="jlc-tracking-toolbar-summary" style="color:#93c5fd;">' + escapeHtml(runtimeSummary) + '</div>'
                : '')
            + (resumePendingCount
                ? '  <div class="jlc-tracking-toolbar-summary" style="color:#fde68a;">刷新已暂停 · 待验证后继续 ' + resumePendingCount + ' 项</div>'
                : '')
            + '  <div class="jlc-tracking-toolbar-actions">'
            + '    ' + (context ? '<button type="button" data-jlc-tracking-save-current' + (refreshRuntime ? ' disabled' : '') + '>⭐ 收藏当前搜索</button>' : '')
            + '    <button type="button" data-jlc-tracking-refresh-all style="background:#444;"' + (refreshRuntime ? ' disabled' : '') + '>' + escapeHtml(runtimeButtonText) + '</button>'
            + (resumePendingCount
                ? '    <button type="button" data-jlc-tracking-open-verify style="background:#6b4f1d;">去验证</button>'
                    + '    <button type="button" data-jlc-tracking-resume style="background:#3f5368;">验证后继续</button>'
                : '')
            + '  </div>'
            + '</div>'
            + (groupMarkup || '<div class="jlc-tracking-empty">' + (context ? '当前页可收藏为追更项，点击上方“收藏当前搜索”即可开始记录。' : '当前还没有追更项，先在列表页点击“收藏当前搜索”吧。') + '</div>');

        root.querySelector('[data-jlc-tracking-save-current]')?.addEventListener('click', async () => {
            const currentContext = getCurrentTrackingPageContext();
            if (!currentContext) {
                showAlert('当前页面还不是可收藏的列表页。');
                return;
            }
            const customLabel = promptTrackingCustomLabel(null, currentContext);
            if (customLabel === null) return;
            const record = await createOrUpdateTrackingFromContext(currentContext, {
                createIfMissing: true,
                touchBrowse: true,
                checkTop: true,
                updateCheck: true,
                seedSeen: true,
                customLabel
            });
            trackingPageState.record = record;
            trackingPageState.context = currentContext;
            trackingPageState.signature = currentContext.query_signature;
            trackingPageTouchSignature = currentContext.query_signature;
            applyTrackingPageDecorations(record);
            ensureTrackingPageBar({ context: currentContext, record });
            refreshTrackingToolbarButtons();
            renderTrackingUI();
            showAlert('当前搜索已加入追更！');
        });

        root.querySelector('[data-jlc-tracking-refresh-all]')?.addEventListener('click', (event) => {
            if (getTrackingRefreshRuntimeState()) return;
            void refreshAllTrackingSearches(event.currentTarget);
        });

        root.querySelector('[data-jlc-tracking-open-verify]')?.addEventListener('click', () => {
            const verifyRecord = list.find(record => record.id === refreshResume?.record_id)
                || list.find(record => resumePendingIds.includes(record.id));
            const verifyUrl = compactText(refreshResume?.verify_url || '') || buildTrackingVerifyUrl(verifyRecord);
            if (!verifyUrl) {
                showAlert('当前没有可打开的验证页面。');
                return;
            }
            openTrackingVerificationUrl(verifyUrl, { fallbackToNavigate: true });
        });

        root.querySelector('[data-jlc-tracking-resume]')?.addEventListener('click', async (event) => {
            if (!resumePendingIds.length) {
                clearTrackingRefreshResumeState();
                renderTrackingUI();
                return;
            }
            const verifyRecord = list.find(record => record.id === refreshResume?.record_id)
                || list.find(record => resumePendingIds.includes(record.id));
            const verifyUrl = compactText(refreshResume?.verify_url || '') || buildTrackingVerifyUrl(verifyRecord);
            const probe = await probeTrackingVerificationReady(verifyRecord, verifyUrl);
            if (!probe.ok) {
                if (verifyUrl) openTrackingVerificationUrl(verifyUrl);
                showAlert((probe.note || '验证尚未生效') + '，请在打开的 JavLibrary 页面完成验证后再点继续。');
                return;
            }
            clearTrackingRefreshResumeState();
            if (verifyRecord) {
                clearTrackingVerificationRequired(verifyRecord, { restoreStatus: true });
                await saveTrackingRecord(verifyRecord);
            }
            void refreshAllTrackingSearches(event.currentTarget, {
                recordIds: resumePendingIds,
                total: Number(refreshResume?.total || 0) || resumePendingIds.length,
                completedBase: Number(refreshResume?.completed || 0) || 0,
                resumeVerified: true
            });
        });

        root.querySelectorAll('[data-jlc-toggle-group]').forEach(button => {
            button.addEventListener('click', () => {
                const groupKey = button.getAttribute('data-jlc-toggle-group') || '';
                const section = root.querySelector('[data-jlc-group="' + CSS.escape(groupKey) + '"]');
                const collapsed = !section?.classList.contains('collapsed');
                setTrackingGroupCollapsed(groupKey, collapsed);
                section?.classList.toggle('collapsed', collapsed);
            });
        });

        root.querySelectorAll('[data-jlc-tracking-open]').forEach(button => {
            button.addEventListener('click', async () => {
                const record = list.find(item => item.id === button.getAttribute('data-jlc-tracking-open'));
                if (!record) return;
                const targetUrl = buildTrackingNavigationUrl(record) || record.open_url;
                const targetMode = resolveTrackingSearchMode(record, parseTrackingUrl(targetUrl || record.open_url || ''));
                const targetPageHint = targetMode === 'backfill'
                    ? (Number(record.last_seen_page_hint || record.top_page_hint || record.last_browsed_page_hint || 0) || 1)
                    : (Number(getCurrentListPageHint(targetUrl) || 0) || 1);
                record.last_browsed_at = new Date().toISOString();
                record.last_browsed_page_hint = targetPageHint;

                if (isJavLibraryResolvableSearchUrl(record.page_url || record.open_url || targetUrl || '')) {
                    let searchQuery = getTrackingSearchQuery(record);
                    if (!searchQuery) {
                        searchQuery = promptTrackingSearchQuery(record);
                        if (searchQuery == null) return;
                    }
                    searchQuery = compactText(searchQuery || '');
                    if (!searchQuery) {
                        showAlert('原搜索词不能为空。');
                        return;
                    }
                    applyTrackingSearchQuery(record, searchQuery);
                    const resolved = await resolveJavLibrarySearchUrl(record, {
                        keyword: searchQuery,
                        pageHint: targetPageHint
                    });
                    if (!resolved.ok || !resolved.url) {
                        await saveTrackingRecord(record);
                        showAlert('重新生成 JavLibrary 搜索失败：' + (resolved.error || '未知错误'));
                        return;
                    }
                    record.open_url = resolved.url;
                    await saveTrackingRecord(record);
                    location.href = resolved.url;
                    return;
                }

                await saveTrackingRecord(record);
                location.href = targetUrl;
            });
        });

        root.querySelectorAll('[data-jlc-tracking-verify]').forEach(button => {
            button.addEventListener('click', () => {
                const record = list.find(item => item.id === button.getAttribute('data-jlc-tracking-verify'));
                if (!record) return;
                const verifyUrl = buildTrackingVerifyUrl(record);
                if (!verifyUrl) {
                    showAlert('当前没有可打开的验证页面。');
                    return;
                }
                openTrackingVerificationUrl(verifyUrl, { fallbackToNavigate: true });
            });
        });

        root.querySelectorAll('[data-jlc-tracking-refresh]').forEach(button => {
            button.addEventListener('click', async () => {
                const recordId = button.getAttribute('data-jlc-tracking-refresh');
                button.disabled = true;
                button.textContent = '刷新中...';
                try {
                    await refreshSingleTrackingRecord(recordId);
                } finally {
                    renderTrackingUI();
                }
            });
        });

        root.querySelectorAll('[data-jlc-tracking-query]').forEach(button => {
            button.addEventListener('click', async () => {
                const recordId = button.getAttribute('data-jlc-tracking-query');
                const record = list.find(item => item.id === recordId);
                if (!record) return;
                const searchQuery = promptTrackingSearchQuery(record, context);
                if (searchQuery == null) return;
                if (!compactText(searchQuery || '')) {
                    showAlert('原搜索词不能为空。');
                    return;
                }
                applyTrackingSearchQuery(record, searchQuery);
                await saveTrackingRecord(record);
                if (trackingPageState.record?.id === record.id) {
                    trackingPageState.record = record;
                    ensureTrackingPageBar({ context: trackingPageState.context, record });
                }
                renderTrackingUI();
            });
        });

        root.querySelectorAll('[data-jlc-tracking-label]').forEach(button => {
            button.addEventListener('click', async () => {
                const recordId = button.getAttribute('data-jlc-tracking-label');
                const record = list.find(item => item.id === recordId);
                if (!record) return;
                const customLabel = promptTrackingCustomLabel(record, context);
                if (customLabel === null) return;
                record.custom_label = compactText(customLabel || '');
                await saveTrackingRecord(record);
                if (trackingPageState.record?.id === record.id) {
                    trackingPageState.record = record;
                    ensureTrackingPageBar({ context: trackingPageState.context, record });
                }
                renderTrackingUI();
            });
        });

        root.querySelectorAll('[data-jlc-tracking-delete]').forEach(button => {
            button.addEventListener('click', async () => {
                const recordId = button.getAttribute('data-jlc-tracking-delete');
                const record = list.find(item => item.id === recordId);
                if (!record) return;
                if (!window.confirm('确定删除追更项“' + getTrackingDisplayTitle(record) + '”吗？')) return;
                await deleteVal(TRACKING_STORE, recordId);
                if (trackingPageState.record?.id === recordId) {
                    trackingPageState.record = null;
                    trackingPageState.signature = '';
                    trackingPageState.lastSeenFound = false;
                    clearTrackingPageDecorations();
                    ensureTrackingPageBar({ context: trackingPageState.context, record: null });
                    refreshTrackingToolbarButtons();
                }
                renderTrackingUI();
            });
        });
    }

    function clearTrackingPageDecorations() {
        document.querySelectorAll('.jlc-tracking-divider').forEach(node => node.remove());
        getTrackingItemNodesFromRoot(document).forEach(item => {
            item.classList.remove('jlc-tracking-old-item', 'jlc-tracking-breakpoint-item');
        });
        document.getElementById('jlc-tracking-breakpoint-finder')?.remove();
    }

    /**
     * 断点查找进度：写入 state + 刷新顶栏按钮。
     * loading 会贯穿「连翻 → 命中 → 滚到位置」整段，避免按钮先复原再突然跳。
     * @param {{ loading?: boolean, text?: string }} [options]
     */
    function setContinueBreakpointProgress(options = {}) {
        document.getElementById('jlc-tracking-breakpoint-finder')?.remove();
        if (options.loading) {
            trackingPageState.breakpointSearching = true;
            trackingPageState.breakpointSearchLabel = compactText(options.text) || '查找断点中…';
        } else {
            trackingPageState.breakpointSearching = false;
            trackingPageState.breakpointSearchLabel = '';
        }
        return applyContinueBreakpointButtonState();
    }

    /** 根据 trackingPageState 把顶栏「继续断点」绘成 loading / 可点 */
    function applyContinueBreakpointButtonState() {
        document.getElementById('jlc-tracking-breakpoint-finder')?.remove();
        const searching = !!trackingPageState.breakpointSearching;
        let btn = document.querySelector('[data-jlc-page-continue-bp]');
        // 命中后 bar 可能不再渲染该按钮：查找中时补一颗临时进度钮
        if (!btn && searching) {
            const actions = document.querySelector('#jlc-tracking-pagebar .jlc-tracking-pagebar-actions');
            if (actions) {
                btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'jlc-bp-continue is-loading';
                btn.setAttribute('data-jlc-page-continue-bp', '1');
                btn.disabled = true;
                actions.insertBefore(btn, actions.firstChild);
            }
        }
        if (!btn) return null;
        if (searching) {
            btn.disabled = true;
            btn.classList.add('is-loading');
            btn.textContent = trackingPageState.breakpointSearchLabel || '查找断点中…';
        } else {
            btn.disabled = false;
            btn.classList.remove('is-loading');
            btn.textContent = '继续断点';
        }
        return btn;
    }

    /** 把断点条目滚到视口中间（继续断点 / 命中后调用） */
    function scrollToTrackingBreakpoint(el, options = {}) {
        const target = el || document.querySelector('.jlc-tracking-breakpoint-item');
        if (!target || typeof target.scrollIntoView !== 'function') return false;
        try {
            target.scrollIntoView({
                block: options.block || 'center',
                behavior: options.behavior || 'smooth',
                inline: 'nearest'
            });
        } catch (_) {
            try { target.scrollIntoView(true); } catch (__) { /* ignore */ }
        }
        return true;
    }

    /** 连翻时轻量跟滚，让用户看到列表在长，而不是最后突然一跳 */
    function softFollowBreakpointSearch(appendedItems, direction) {
        if (!appendedItems || !appendedItems.length) return;
        const el = direction === 'prev' ? appendedItems[0] : appendedItems[appendedItems.length - 1];
        if (!el || typeof el.scrollIntoView !== 'function') return;
        try {
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth', inline: 'nearest' });
        } catch (_) {
            try { el.scrollIntoView(false); } catch (__) { /* ignore */ }
        }
    }

    /**
     * 命中断点后的过渡：装饰 → 进度「定位中」→ 平滑滚动 → 脉冲 → 再结束 loading
     */
    async function settleBreakpointHit(found, record) {
        setContinueBreakpointProgress({ loading: true, text: '已命中，定位中…' });
        applyTrackingPageDecorations(record);
        ensureTrackingPageBar({
            context: trackingPageState.context || getCurrentTrackingPageContext(),
            record
        });
        applyContinueBreakpointButtonState();
        await delayMs(80);
        const marked = document.querySelector('.jlc-tracking-breakpoint-item') || found;
        if (marked) {
            marked.classList.add('jlc-bp-locating');
            scrollToTrackingBreakpoint(marked, { block: 'center', behavior: 'smooth' });
        }
        // 等平滑滚动大致走完再松手
        await delayMs(620);
        setContinueBreakpointProgress({ loading: false });
        ensureTrackingPageBar({
            context: trackingPageState.context || getCurrentTrackingPageContext(),
            record: trackingPageState.record || record
        });
        window.setTimeout(() => {
            document.querySelectorAll('.jlc-bp-locating').forEach((node) => node.classList.remove('jlc-bp-locating'));
        }, 1200);
    }

    function applyTrackingPageDecorations(record) {
        clearTrackingPageDecorations();
        trackingPageState.lastSeenFound = false;
        trackingPageState.breakpointMissHint = '';
        if (!record?.last_seen_avid) {
            trackingPageState.breakpointCursor = { prev: '', next: '' };
            return;
        }
        const items = getTrackingItemNodesFromRoot(document);
        if (!items.length) return;
        const targetCode = normalizeCode(record.last_seen_avid);
        if (!targetCode) return;
        const searchMode = resolveTrackingSearchMode(record, parseTrackingUrl(record.open_url || location.href));
        const isBackfill = searchMode === 'backfill';
        const currentContext = trackingPageState.context || getCurrentTrackingPageContext();
        const currentPageHint = Number(currentContext?.page_hint || getCurrentListPageHint(location.href, document) || 0) || 1;
        const seenPageHint = Number(record.last_seen_page_hint || 0) || 0;
        let foundIndex = -1;
        items.forEach((item, index) => {
            const info = getTrackingItemInfoFromNode(item);
            if (foundIndex === -1 && normalizeCode(info?.avid || '') === targetCode) {
                foundIndex = index;
                item.classList.add('jlc-tracking-breakpoint-item');
            }
        });
        if (foundIndex >= 0) {
            trackingPageState.lastSeenFound = true;
            trackingPageState.breakpointMissHint = '';
            trackingPageState.breakpointCursor = { prev: '', next: '' };
            // 唯一列表内标识：命中断点时的分割线
            const divider = document.createElement('div');
            divider.className = 'jlc-tracking-divider';
            divider.textContent = isBackfill ? '上次看到这里（下面是更新）' : '上次看到这里';
            if (isBackfill) {
                items[foundIndex].after(divider);
                record.unread_estimate = Math.max(0, items.length - foundIndex - 1);
            } else {
                items[foundIndex].before(divider);
                record.unread_estimate = foundIndex;
            }
            void saveTrackingRecord(record);
            refreshTrackingToolbarButtons();
            return;
        }

        // 未命中：不在列表再插「整页更新」横幅（与顶栏重复）；只记方向提示给 pagebar
        if (seenPageHint > 0) {
            if (isBackfill && currentPageHint > seenPageHint) {
                trackingPageState.breakpointMissHint = 'earlier';
            } else if (!isBackfill && currentPageHint < seenPageHint) {
                trackingPageState.breakpointMissHint = 'later';
            }
        }
        refreshTrackingToolbarButtons();
    }

    function ensureTrackingPageBar(state = {}) {
        const grid = document.getElementById('grid-b');
        const context = state.context || trackingPageState.context;
        const record = state.record !== undefined ? state.record : trackingPageState.record;
        let bar = document.getElementById('jlc-tracking-pagebar');
        if (!grid || !context) {
            bar?.remove();
            document.getElementById('jlc-tracking-breakpoint-finder')?.remove();
            return null;
        }
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'jlc-tracking-pagebar';
            grid.before(bar);
        }
        bar.classList.add('jlc-wb-pagebar');
        if (!record) {
            bar.innerHTML = ''
                + '<div class="jlc-tracking-pagebar-main">'
                + '  <div class="jlc-tracking-pagebar-title">当前搜索还未加入追更</div>'
                + '  <div class="jlc-tracking-pagebar-meta"><span>' + escapeHtml(context.title || context.group_name || context.query_text || '当前列表') + '</span></div>'
                + '</div>'
                + '<div class="jlc-tracking-pagebar-actions">'
                + '  <button type="button" class="primary" data-jlc-page-save>⭐ 收藏此搜索</button>'
                + '  <button type="button" data-jlc-page-open-panel>打开工作台</button>'
                + '</div>';
            bar.querySelector('[data-jlc-page-save]')?.addEventListener('click', async () => {
                const customLabel = await showWorkbenchPrompt({
                    title: '收藏此搜索',
                    note: '可填写备注名，留空则使用自动标题。',
                    value: '',
                    placeholder: '备注名（可选）'
                });
                if (customLabel === null) return;
                const saved = await createOrUpdateTrackingFromContext(context, {
                    createIfMissing: true,
                    touchBrowse: true,
                    checkTop: true,
                    updateCheck: true,
                    seedSeen: true,
                    customLabel
                });
                trackingPageState.record = saved;
                trackingPageState.signature = context.query_signature;
                trackingPageTouchSignature = context.query_signature;
                applyTrackingPageDecorations(saved);
                ensureTrackingPageBar({ context, record: saved });
                renderTrackingUI();
                showAlert('当前搜索已收藏到追更！');
            });
            bar.querySelector('[data-jlc-page-open-panel]')?.addEventListener('click', () => openCommanderPanel('tracking'));
            return bar;
        }
        const status = buildTrackingStatus(record);
        const metaParts = [];
        if (record.top_avid) metaParts.push('<span>最新：' + escapeHtml(record.top_avid) + '</span>');
        if (!record.last_seen_avid) {
            metaParts.push('<span>尚未设置断点</span>');
        } else if (trackingPageState.lastSeenFound) {
            metaParts.push('<span>断点：' + escapeHtml(record.last_seen_avid) + '</span>');
        } else {
            // 未命中：状态集中在顶栏，不再在列表插第三份文案
            metaParts.push('<span>断点：' + escapeHtml(record.last_seen_avid) + '（本页未找到）</span>');
            if (trackingPageState.breakpointMissHint === 'later') {
                metaParts.push('<span class="jlc-bp-miss-hint">在后面页</span>');
            } else if (trackingPageState.breakpointMissHint === 'earlier') {
                metaParts.push('<span class="jlc-bp-miss-hint">在更早页</span>');
            }
        }
        const browseOnly = buildTrackingPageHintSummary(record, { includeBrowsed: true }).find(item => item.startsWith('浏览第'));
        if (browseOnly) metaParts.push('<span>' + escapeHtml(browseOnly) + '</span>');
        metaParts.push('<span title="' + escapeHtml(formatDateTime(record.last_browsed_at)) + '">最后浏览：' + escapeHtml(formatRelativeTime(record.last_browsed_at)) + '</span>');
        const displayTitle = getTrackingDisplayTitle(record, context);
        const pageSummary = buildTrackingPageHintSummary(record).join(' · ');
        const searching = !!trackingPageState.breakpointSearching;
        const canContinueBreakpoint = !!record.last_seen_avid && !trackingPageState.lastSeenFound;
        // 查找/定位过程中始终保留进度钮（即使已命中、本可隐藏「继续断点」）
        const showContinueBtn = canContinueBreakpoint || searching;
        const continueLabel = searching
            ? (trackingPageState.breakpointSearchLabel || '查找断点中…')
            : '继续断点';
        const continueTitle = searching
            ? continueLabel
            : (trackingPageState.breakpointMissHint === 'later'
                ? '本页均为更新，点击向后加载直到命中断点'
                : (trackingPageState.breakpointMissHint === 'earlier'
                    ? '本页均为更新，点击向前加载直到命中断点'
                    : '向后/向前加载列表直到命中断点番号'));
        bar.innerHTML = ''
            + '<div class="jlc-tracking-pagebar-main">'
            + '  <div class="jlc-tracking-pagebar-title"><span class="jlc-status-pill tone-' + escapeHtml(status.tone) + '">' + escapeHtml(status.text) + '</span> ' + escapeHtml(displayTitle) + (pageSummary ? ' <span class="jlc-tracking-pagehint">' + escapeHtml('· ' + pageSummary) + '</span>' : '') + '</div>'
            + '  <div class="jlc-tracking-pagebar-meta">' + metaParts.join('') + '</div>'
            + '</div>'
            + '<div class="jlc-tracking-pagebar-actions">'
            + (showContinueBtn
                ? '  <button type="button" class="jlc-bp-continue' + (searching ? ' is-loading' : '') + '" data-jlc-page-continue-bp'
                    + (searching ? ' disabled' : '')
                    + ' title="' + escapeHtml(continueTitle) + '">' + escapeHtml(continueLabel) + '</button>'
                : '')
            + '  <button type="button" class="primary" data-jlc-page-mark-read>设首页为断点</button>'
            + '  <button type="button" data-jlc-page-refresh>刷新本项</button>'
            + '  <button type="button" data-jlc-page-focus>在工作台中定位</button>'
            + '  <button type="button" data-jlc-page-edit-label>备注</button>'
            + '  <button type="button" data-jlc-page-open-panel>打开工作台</button>'
            + '</div>';
        bar.querySelector('[data-jlc-page-mark-read]')?.addEventListener('click', async () => {
            await markTrackingRecordRead(record.id, 'top');
            renderTrackingUI();
            showAlert('已把当前首项设为新断点！');
        });
        bar.querySelector('[data-jlc-page-continue-bp]')?.addEventListener('click', () => {
            if (trackingPageState.breakpointSearching) return;
            void continueTrackingBreakpointSearch();
        });
        bar.querySelector('[data-jlc-page-refresh]')?.addEventListener('click', async (event) => {
            const button = event.currentTarget;
            const prev = button.textContent;
            button.disabled = true;
            button.textContent = '刷新中…';
            try {
                await refreshSingleTrackingRecord(record.id);
                ensureTrackingPageBar({ context, record: trackingPageState.record || record });
                await renderTrackingUI();
                showAlert('本项已刷新！');
            } finally {
                button.disabled = false;
                button.textContent = prev;
            }
        });
        bar.querySelector('[data-jlc-page-focus]')?.addEventListener('click', () => {
            focusTrackingInWorkbench(record.id);
            showAlert('已在工作台定位该项。');
        });
        bar.querySelector('[data-jlc-page-edit-label]')?.addEventListener('click', async () => {
            const customLabel = await showWorkbenchPrompt({
                title: '修改追更备注',
                note: '留空可恢复自动标题。',
                value: record.custom_label || getTrackingDisplayTitle(record, context) || '',
                placeholder: '备注名'
            });
            if (customLabel === null) return;
            record.custom_label = compactText(customLabel || '');
            await saveTrackingRecord(record);
            trackingPageState.record = record;
            ensureTrackingPageBar({ context, record });
            renderTrackingUI();
            showAlert(record.custom_label ? '追更备注已更新！' : '已恢复自动标题！');
        });
        bar.querySelector('[data-jlc-page-open-panel]')?.addEventListener('click', () => {
            focusTrackingInWorkbench(record.id);
        });
        return bar;
    }

    async function setTrackingBreakpointByItem(item, options = {}) {
        const info = getTrackingItemInfoFromNode(item);
        if (!info?.avid) return null;
        const context = getCurrentTrackingPageContext();
        if (!context) {
            showAlert('当前页面还不是可追更的列表页。');
            return null;
        }
        const items = getTrackingItemNodesFromRoot(document);
        const itemIndex = items.findIndex(node => node === item);
        const searchMode = resolveTrackingSearchMode({ site: context.site, search_mode: context.search_mode }, parseTrackingUrl(context.pageUrl || context.open_url || location.href));
        const unreadEstimate = itemIndex >= 0
            ? (searchMode === 'backfill'
                ? Math.max(0, items.length - itemIndex - 1)
                : Math.max(0, itemIndex))
            : 0;
        const record = await createOrUpdateTrackingFromContext(context, {
            createIfMissing: true,
            touchBrowse: trackingPageTouchSignature !== context.query_signature,
            checkTop: true,
            updateCheck: trackingPageTouchSignature !== context.query_signature,
            explicitLastSeen: {
                avid: info.avid,
                title: info.title,
                page_hint: context.page_hint,
                unread_estimate: unreadEstimate
            }
        });
        trackingPageState.context = context;
        trackingPageState.record = record;
        trackingPageState.signature = context.query_signature;
        trackingPageTouchSignature = context.query_signature;
        applyTrackingPageDecorations(record);
        ensureTrackingPageBar({ context, record });
        renderTrackingUI();
        showAlert((options.silent ? '' : '断点已更新到 ') + info.avid + '！');
        return record;
    }

    function refreshTrackingToolbarButtons() {
        const activeCode = normalizeCode(trackingPageState.record?.last_seen_avid || '');
        getTrackingItemNodesFromRoot(document).forEach(item => {
            const button = item.querySelector('.jlc-tool-btn.j-bm');
            if (button) {
                button.classList.toggle('active-bookmark', !!activeCode && normalizeCode(item.dataset.jlcAvid || '') === activeCode);
            }
        });
    }

    function scheduleTrackingPageRefresh(force = false) {
        if (trackingPageRefreshTimer) window.clearTimeout(trackingPageRefreshTimer);
        trackingPageRefreshTimer = window.setTimeout(() => {
            trackingPageRefreshTimer = null;
            void syncTrackingPageState(force);
        }, force ? 40 : 180);
    }

    async function syncTrackingPageState(force = false) {
        const context = getCurrentTrackingPageContext();
        const previousSignature = trackingPageState.signature;
        const previousPageUrl = trackingPageState.context?.pageUrl || '';
        trackingPageState.context = context;
        if (!context) {
            trackingPageState.record = null;
            trackingPageState.signature = '';
            trackingPageState.lastSeenFound = false;
            trackingPageState.breakpointCursor = { prev: '', next: '' };
            clearTrackingPageDecorations();
            ensureTrackingPageBar({ context: null, record: null });
            return null;
        }
        if (context.query_signature !== previousSignature || context.pageUrl !== previousPageUrl) {
            trackingPageState.breakpointCursor = { prev: '', next: '' };
        }
        const shouldTouchBrowse = trackingPageTouchSignature !== context.query_signature;
        const shouldCheck = shouldTouchBrowse || force;
        const record = await createOrUpdateTrackingFromContext(context, {
            createIfMissing: false,
            touchBrowse: shouldTouchBrowse,
            checkTop: true,
            updateCheck: shouldCheck
        });
        if (shouldTouchBrowse) trackingPageTouchSignature = context.query_signature;
        trackingPageState.record = record;
        trackingPageState.signature = context.query_signature;
        applyTrackingPageDecorations(record);
        ensureTrackingPageBar({ context, record });
        refreshTrackingToolbarButtons();
        if (isWorkbenchOpen() && getWorkbenchSession().nav === 'tracking') {
            void renderTrackingUI();
        } else {
            void refreshWorkbenchFabBadge();
        }
        return record;
    }

    async function continueTrackingBreakpointSearch() {
        if (trackingPageSearchPromise) return trackingPageSearchPromise;
        const context = trackingPageState.context || getCurrentTrackingPageContext();
        const record = trackingPageState.record;
        if (!context || !record?.last_seen_avid) {
            showAlert('当前没有可继续搜索的断点。');
            return null;
        }
        const cursorState = trackingPageState.breakpointCursor || (trackingPageState.breakpointCursor = { prev: '', next: '' });
        const currentPageHint = Number(context.page_hint || getCurrentListPageHint(location.href, document) || 0) || 1;
        const directions = getTrackingBreakpointSearchDirections(record, currentPageHint);
        const directionSeeds = {
            prev: cursorState.prev || getTrackingPrevPageUrl(document, currentWeb, location.href),
            next: cursorState.next || scroller?.nextURL || getTrackingNextPageUrl(document, currentWeb, location.href)
        };
        const availableDirections = directions.filter(direction => !!directionSeeds[direction]);
        if (!availableDirections.length) {
            setContinueBreakpointProgress({ loading: false });
            showAlert('前后都没有更多页面了。');
            return null;
        }
        const targetCode = normalizeCode(record.last_seen_avid);
        const grid = document.getElementById('grid-b');
        if (!grid) return null;

        trackingPageSearchPromise = (async () => {
            const maxStepsPerDirection = 12;
            const maxTotalSteps = 18;
            let totalStep = 0;
            let lastFailure = '';
            for (const direction of availableDirections) {
                let nextUrl = directionSeeds[direction];
                if (!nextUrl) continue;
                let refererUrl = location.href;
                let directionStep = 0;
                const directionLabel = getTrackingBreakpointDirectionLabel(direction);
                setContinueBreakpointProgress({ loading: true, text: '正在' + directionLabel + '查找…' });
                while (nextUrl && directionStep < maxStepsPerDirection && totalStep < maxTotalSteps) {
                    directionStep += 1;
                    totalStep += 1;
                    cursorState[direction] = nextUrl || '';
                    const response = await requestPageWithBrowserFetch(nextUrl, buildTrackingPageRequestOptions(nextUrl, refererUrl, { timeout: 18000 }));
                    if (!response.ok || !response.responseText) {
                        lastFailure = directionLabel + '搜索失败：' + describeRequestStatus(response, '请求失败');
                        break;
                    }
                    const doc = new DOMParser().parseFromString(response.responseText, 'text/html');
                    let elems = GridPanel.parseItems($(doc).find(currentObj.itemSelector));
                    if (currentWeb !== 'javdb' && location.pathname.includes('/star/') && elems) {
                        elems = elems.slice(1);
                    }
                    const appendedItems = collectCommanderItems(elems);
                    if (appendedItems.length) {
                        if (direction === 'prev') grid.prepend(...appendedItems);
                        else grid.append(...appendedItems);
                        lazyLoad?.update?.();
                        runCommanderScanner(appendedItems, true);
                        window.setTimeout(() => runCommanderScanner(appendedItems, true), 120);
                        window.setTimeout(() => runCommanderScanner(appendedItems, true), 620);
                        // 边加载边轻跟滚，避免最后才「闪」到下面
                        softFollowBreakpointSearch(appendedItems, direction);
                    }
                    const found = appendedItems.find(item => normalizeCode(getTrackingItemInfoFromNode(item)?.avid || '') === targetCode);
                    if (found) {
                        record.last_found_at = new Date().toISOString();
                        record.last_seen_page_hint = getCurrentListPageHint(response.finalUrl || nextUrl, doc);
                        trackingPageState.breakpointCursor = { prev: '', next: '' };
                        await saveTrackingRecord(record);
                        trackingPageState.record = record;
                        await settleBreakpointHit(found, record);
                        showAlert('已找到断点 ' + record.last_seen_avid + '！');
                        return found;
                    }
                    refererUrl = response.finalUrl || nextUrl;
                    nextUrl = getTrackingDirectionalPageUrl(doc, currentWeb, refererUrl, direction);
                    cursorState[direction] = nextUrl || '';
                    if (direction === 'next' && scroller) scroller.nextURL = nextUrl || '';
                    if (nextUrl) {
                        const pageHint = Number(getCurrentListPageHint(refererUrl, doc) || 0) || 1;
                        setContinueBreakpointProgress({
                            loading: true,
                            text: directionLabel + '第' + pageHint + '页…'
                        });
                        // 间隔略缩短：跟滚已经给了反馈，不必干等太久
                        await delayMs(480 + Math.random() * 320);
                    }
                }
                if (directionStep >= maxStepsPerDirection || totalStep >= maxTotalSteps) {
                    lastFailure = '已连续翻到限制页数，断点还没出现';
                    break;
                }
            }
            const remainingDirections = directions.filter(direction => !!(trackingPageState.breakpointCursor || {})[direction]);
            setContinueBreakpointProgress({ loading: false });
            if (remainingDirections.length) {
                showAlert(lastFailure ? ('断点定位未完成：' + lastFailure) : '这次先翻到这里，再点一次「继续断点」即可。');
                return null;
            }
            showAlert(lastFailure ? ('断点定位失败：' + lastFailure) : '已经翻到前后边界，仍未找到断点。');
            return null;
        })().finally(() => {
            trackingPageSearchPromise = null;
            // settle 成功时已结束 loading；失败路径也兜底复位
            if (trackingPageState.breakpointSearching) {
                setContinueBreakpointProgress({ loading: false });
            }
            scheduleTrackingPageRefresh(false);
        });

        return trackingPageSearchPromise;
    }

// @@creamu-part:50-resource-center
    function extractReleaseDateFromText(text) {
        const normalizedText = String(text || '').replace(/年/g, '-').replace(/月/g, '-').replace(/日/g, ' ');
        const labeled = normalizedText.match(/(?:发行(?:日期)?|發行(?:日期)?|発売日|配信開始日|release(?:\s*date)?|date)\s*[:：]?\s*([0-9]{4}[-/.][0-9]{1,2}[-/.][0-9]{1,2}|[0-9]{8})/i);
        if (labeled?.[1]) return normalizeReleaseDate(labeled[1]);
        const direct = normalizedText.match(/([0-9]{4}[-/.][0-9]{1,2}[-/.][0-9]{1,2}|[0-9]{8})/);
        return direct?.[1] ? normalizeReleaseDate(direct[1]) : '';
    }

    function extractDetailReleaseDate(context) {
        if (!context) return '';
        const directSelectors = {
            javlibrary: ['#video_date .text', '#video_date', 'td#video_date + td', '#video_info .text'],
            javbus: ['.col-md-3.info p', '#mag-submit-show'],
            javdb: ['.video-meta-panel .panel-block', '.movie-panel-info .panel-block']
        };
        const selectors = directSelectors[context.site] || [];
        for (const selector of selectors) {
            const nodes = Array.from(document.querySelectorAll(selector));
            for (const node of nodes) {
                const date = extractReleaseDateFromText(node.textContent || '');
                if (date) return date;
            }
        }

        let blocks = [];
        if (context.site === 'javlibrary') {
            blocks = Array.from(document.querySelectorAll('#video_info tr, #video_details tr, table tr'));
        } else if (context.site === 'javbus') {
            blocks = Array.from(document.querySelectorAll('.col-md-3.info p, .col-md-3.info li, .info p'));
        } else if (context.site === 'javdb') {
            blocks = Array.from(document.querySelectorAll('.video-meta-panel .panel-block, .movie-panel-info .panel-block, .panel-block'));
        }
        const labels = ['发行', '發行', '発売', 'release', 'date', '配信'];
        for (const block of blocks) {
            const text = compactText(block);
            if (!text) continue;
            if (labels.some(label => text.toLowerCase().includes(label.toLowerCase()))) {
                const date = extractReleaseDateFromText(text);
                if (date) return date;
            }
        }
        return '';
    }

    function getCurrentDetailContext() {
        const site = String(currentWeb || '').toLowerCase();
        let anchor = null;
        let avidNode = null;
        let title = '';
        let avid = '';

        if (site === 'javlibrary') {
            anchor = document.querySelector('#video_favorite_edit')
                || document.querySelector('#video_genres')
                || document.querySelector('#video_cast')
                || document.querySelector('#video_info');
            if (!anchor) return null;
            avidNode = document.querySelector('#video_id .text')
                || document.querySelector('td#video_id + td .text')
                || document.querySelector('#video_id');
            avid = normalizeResourceAvid(avidNode?.textContent || document.title);
            title = compactText(document.querySelector('#video_title h3 a') || document.querySelector('#video_title a') || document.title);
        } else if (site === 'javbus') {
            anchor = document.querySelector('.col-md-3.info')
                || document.querySelector('#mag-submit-show')
                || document.querySelector('.screencap');
            if (!anchor) return null;
            avidNode = document.querySelector('[data-clipboard-text]')
                || Array.from(document.querySelectorAll('.col-md-3.info p, .info p, span')).find(node => /識別碼|识别码|ID/i.test(compactText(node)));
            const pathCode = normalizeResourceAvid(location.pathname.split('/').filter(Boolean).pop() || '');
            avid = normalizeResourceAvid(avidNode?.getAttribute?.('data-clipboard-text') || avidNode?.textContent || pathCode || document.title);
            title = compactText(document.querySelector('.bigImage img')?.getAttribute('title') || document.querySelector('h3') || document.title);
        } else if (site === 'javdb') {
            anchor = document.querySelector('.video-meta-panel')
                || document.querySelector('.movie-panel-info')
                || document.querySelector('.panel.movie-panel-info');
            if (!anchor) return null;
            avidNode = document.querySelector('[data-clipboard-text]')
                || document.querySelector('.first-block .value')
                || document.querySelector('.movie-panel-info .panel-block');
            avid = normalizeResourceAvid(avidNode?.getAttribute?.('data-clipboard-text') || avidNode?.textContent || document.title);
            title = compactText(document.querySelector('.title.is-4') || document.querySelector('h2.title') || document.title);
        } else {
            return null;
        }

        if (!avid) return null;
        return {
            site,
            siteLabel: getSiteLabel(site),
            avid,
            title,
            anchor,
            avidNode,
            pageUrl: location.href
        };
    }

    function ensureStandaloneCommanderEntry() {
        createWorkbenchV3();
    }

    function removeDetailResourceCenter() {
        document.getElementById('jlc-resource-center')?.remove();
    }

    function ensureDetailResourceCenter(context) {
        if (!context?.anchor) return null;
        let container = document.getElementById('jlc-resource-center');
        if (!container) {
            container = document.createElement('section');
            container.id = 'jlc-resource-center';
            container.className = 'jlc-resource-center';
        }
        if (context.anchor.nextElementSibling !== container) {
            context.anchor.insertAdjacentElement('afterend', container);
        }
        return container;
    }

    function makeResourceLinksMarkup(links) {
        const list = uniqueLinkObjects(links);
        if (!list.length) return '';
        return `<div class="jlc-resource-chip-list">${list.map(link => `
            <a class="jlc-resource-chip" href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer nofollow">
                <span>${escapeHtml(link.label)}</span>
                ${link.note ? `<small>${escapeHtml(link.note)}</small>` : ''}
            </a>`).join('')}</div>`;
    }

    function applyJavlibraryMenuTopStyle() {
        if (typeof document === 'undefined') return;
        const styleId = 'jlc-javlibrary-menutop-style';
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            (document.head || document.documentElement || document.body)?.appendChild(styleEl);
        }
        if (currentWeb !== 'javlibrary' || !Status.get('menutoTop')) {
            styleEl.textContent = '';
            return;
        }
        styleEl.textContent = `
            #leftmenu { width: 100%; float: none; }
            #leftmenu > table { display: none; }
            #leftmenu .menul1,
            #leftmenu .menul1 > ul { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; }
            #leftmenu .menul1 { padding: 5px; }
            #rightcolumn { margin: 0 5px; padding: 10px 5px; }
        `;
    }

    function syncDetailReleaseBadge(context, dateText) {
        const node = context?.avidNode;
        if (!node || !(node instanceof Element)) return;
        const value = normalizeReleaseDate(dateText);
        let badge = node.parentElement?.querySelector('.avid-date-badge[data-jlc-detail-date="1"]') || null;
        if (!value) {
            badge?.remove();
            return;
        }
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'avid-date-badge';
            badge.dataset.jlcDetailDate = '1';
            badge.style.marginLeft = '8px';
            node.insertAdjacentElement('afterend', badge);
        }
        badge.textContent = value;
        badge.title = value;
    }

    function uniqueTrailerLinks(list) {
        const normalized = uniqueLinkObjects(list);
        const seen = new Set();
        return normalized.filter(item => {
            let key = '';
            if (/^MissAV\b/i.test(item.label)) {
                key = 'missav:' + (item.kind || normalizeText(item.label));
            } else if (/^FALENO\b/i.test(item.label) || item.kind === 'faleno') {
                key = 'faleno';
            } else if (/^MGS\b/i.test(item.label) || /^mgs/i.test(item.kind || '')) {
                key = 'mgs';
            }
            if (!key) return true;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function isIframeLikeTrailerHref(href) {
        const value = normalizeMediaUrl(href, location?.href || 'https://www.javlibrary.com/');
        if (!value) return false;
        if (/\.(?:mp4|m4v|mov|webm|ogv|m3u8)(?:$|[?#])/i.test(value)) return false;
        return /(?:youtube\.com|youtu\.be|vimeo\.com|player\.|embed|iframe|sampleplayer|sample_movie|\/player\/|\/embed\/)/i.test(value);
    }

    function buildTrailerEmbedUrl(url, options = {}) {
        const value = normalizeMediaUrl(url, location?.href || 'https://www.javlibrary.com/');
        if (!value) return '';
        const autoplay = options.autoplay !== false;
        const muted = options.muted !== false;
        let parsed;
        try {
            parsed = new URL(value);
        } catch (error) {
            return value;
        }
        const hostname = String(parsed.hostname || '').toLowerCase();
        const applyVideoParams = (urlObj, useMutedAlias = false) => {
            if (autoplay) {
                urlObj.searchParams.set('autoplay', '1');
            } else {
                urlObj.searchParams.delete('autoplay');
            }
            if (muted) {
                urlObj.searchParams.set(useMutedAlias ? 'muted' : 'mute', '1');
            } else {
                urlObj.searchParams.delete('mute');
                urlObj.searchParams.delete('muted');
            }
        };
        if (hostname === 'youtu.be') {
            const id = parsed.pathname.replace(/^\/+/, '').split(/[/?#]/)[0];
            if (!id) return value;
            const params = [];
            if (autoplay) params.push('autoplay=1');
            if (muted) params.push('mute=1');
            params.push('playsinline=1', 'rel=0');
            return 'https://www.youtube.com/embed/' + id + '?' + params.join('&');
        }
        if (hostname.endsWith('youtube.com')) {
            if (/\/watch/i.test(parsed.pathname || '')) {
                const id = parsed.searchParams.get('v');
                if (!id) return value;
                const params = [];
                if (autoplay) params.push('autoplay=1');
                if (muted) params.push('mute=1');
                params.push('playsinline=1', 'rel=0');
                return 'https://www.youtube.com/embed/' + id + '?' + params.join('&');
            }
            if (/\/embed\//i.test(parsed.pathname || '')) {
                applyVideoParams(parsed, false);
                parsed.searchParams.set('playsinline', '1');
                parsed.searchParams.set('rel', '0');
                return parsed.toString();
            }
        }
        if (hostname === 'vimeo.com') {
            const matched = parsed.pathname.match(/\/(\d+)(?:$|[/?#])/);
            if (!matched) return value;
            const params = [];
            if (autoplay) params.push('autoplay=1');
            if (muted) params.push('muted=1');
            return 'https://player.vimeo.com/video/' + matched[1] + (params.length ? ('?' + params.join('&')) : '');
        }
        if (hostname === 'player.vimeo.com') {
            applyVideoParams(parsed, true);
            return parsed.toString();
        }
        applyVideoParams(parsed, false);
        return parsed.toString();
    }

    function uniqueTrailerSources(list) {
        const seen = new Set();
        return (Array.isArray(list) ? list : []).map(item => {
            if (!item) return null;
            const href = normalizeMediaUrl(item.href || item.url || '', item.pageUrl || location?.href || 'https://www.javlibrary.com/');
            if (!href) return null;
            let type = String(item.type || '').trim().toLowerCase();
            if (!type) type = isIframeLikeTrailerHref(href) ? 'iframe' : 'video';
            if (!['iframe', 'video'].includes(type)) type = 'video';
            const pageUrl = normalizeMediaUrl(item.pageUrl || href, location?.href || 'https://www.javlibrary.com/');
            return {
                label: String(item.label || item.text || '').trim() || href,
                href,
                kind: String(item.kind || '').trim(),
                note: String(item.note || '').trim(),
                pageUrl,
                type
            };
        }).filter(Boolean).filter(item => {
            const key = item.type + '|' + item.href;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function isIframeTrailerSource(source) {
        if (!source) return false;
        if (String(source.type || '').trim().toLowerCase() === 'iframe') return true;
        return isIframeLikeTrailerHref(source.embedUrl || source.href || '');
    }

    function getTrailerPlayableUrl(source, options = {}) {
        if (!source) return '';
        return isIframeTrailerSource(source)
            ? buildTrailerEmbedUrl(source.embedUrl || source.href || '', options)
            : normalizeMediaUrl(source.href || source.embedUrl || '', source.pageUrl || location?.href || 'https://www.javlibrary.com/');
    }

    function mountTrailerPlayer(container, source, options = {}) {
        if (!container) return null;
        container.innerHTML = '';
        if (!source) return null;
        const mode = options.mode === 'overlay' ? 'overlay' : 'inline';
        const autoplay = options.autoplay !== false;
        const muted = options.muted !== false;
        const playableUrl = getTrailerPlayableUrl(source, { autoplay, muted });
        if (!playableUrl) return null;
        const shell = document.createElement('div');
        shell.className = 'jlc-trailer-player-shell is-' + mode;
        if (isIframeTrailerSource(source)) {
            const iframe = document.createElement('iframe');
            iframe.src = playableUrl;
            iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
            iframe.allowFullscreen = true;
            iframe.loading = 'lazy';
            iframe.referrerPolicy = 'strict-origin-when-cross-origin';
            shell.appendChild(iframe);
            container.appendChild(shell);
            return iframe;
        }
        const video = document.createElement('video');
        video.className = mode === 'overlay' ? 'jlc-trailer-overlay-video' : 'jlc-resource-video';
        video.controls = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.muted = muted;
        video.autoplay = autoplay;
        video.src = playableUrl;
        shell.appendChild(video);
        container.appendChild(shell);
        if (autoplay) {
            const playPromise = video.play();
            if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
        }
        return video;
    }

    function ensureTrailerOverlay() {
        let overlay = document.getElementById('jlc-trailer-overlay');
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'jlc-trailer-overlay';
        overlay.className = 'jlc-trailer-overlay';
        overlay.hidden = true;
        overlay.innerHTML = ''
            + '<div class="jlc-trailer-dialog" role="dialog" aria-modal="true" aria-label="预告播放">'
            + '<button type="button" class="jlc-trailer-close" data-jlc-close-trailer aria-label="关闭预告">×</button>'
            + '<div class="jlc-trailer-dialog-head"><strong data-jlc-trailer-title>预告片</strong><small>默认静音 · 弹层播放</small></div>'
            + '<div class="jlc-trailer-dialog-player" data-jlc-trailer-player></div>'
            + '<div class="jlc-trailer-dialog-actions"><a href="#" target="_blank" rel="noopener noreferrer nofollow" data-jlc-trailer-openblank>新标签打开</a></div>'
            + '</div>';
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay || event.target?.dataset?.jlcCloseTrailer !== undefined) {
                closeTrailerOverlay();
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeTrailerOverlay();
        });
        document.body.appendChild(overlay);
        return overlay;
    }

    function closeTrailerOverlay() {
        const overlay = document.getElementById('jlc-trailer-overlay');
        if (!overlay) return;
        const video = overlay.querySelector('video');
        if (video) {
            video.pause();
            video.removeAttribute('src');
            video.load();
        }
        const player = overlay.querySelector('[data-jlc-trailer-player]');
        if (player) player.innerHTML = '';
        overlay.classList.remove('is-open');
        overlay.hidden = true;
        document.documentElement.classList.remove('scrollBarHide');
    }

    function openTrailerOverlay(source) {
        if (!source?.href) return;
        const overlay = ensureTrailerOverlay();
        const title = overlay.querySelector('[data-jlc-trailer-title]');
        const openBlank = overlay.querySelector('[data-jlc-trailer-openblank]');
        const player = overlay.querySelector('[data-jlc-trailer-player]');
        if (title) title.textContent = source.label || '预告片';
        if (openBlank) openBlank.href = source.pageUrl || source.href;
        mountTrailerPlayer(player, source, { mode: 'overlay', autoplay: true, muted: true });
        overlay.hidden = false;
        overlay.classList.add('is-open');
        document.documentElement.classList.add('scrollBarHide');
    }

    function isResourceCenterTokenAlive(token) {
        return document.getElementById('jlc-resource-center')?.dataset.renderToken === token;
    }

    async function fetchDmmSearchTrailerInfo(context) {
        const key = context?.avid;
        const searchUrl = buildDmmSearchUrl(key);
        if (!key || !searchUrl) return null;
        const response = await requestPage(searchUrl, {
            timeout: 12000,
            headers: {
                Cookie: 'age_check_done=1',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
            }
        });
        if (!response.ok) {
            const state = [403, 429, 503].includes(response.status) ? 'blocked'
                : (response.status === 404 ? 'empty' : 'error');
            return {
                videoSources: [],
                links: uniqueLinkObjects([{ label: 'DMM 搜索', href: searchUrl, note: '官方搜索' }]),
                status: state,
                note: describeRequestStatus(response, '搜索失败')
            };
        }
        return extractDmmSearchPreviewInfo(response.responseText, key);
    }

    async function fetchMissAVTrailerInfo(context) {
        const key = context?.avid;
        if (!key) return null;
        if (resourceMissAVCache.has(key)) return resourceMissAVCache.get(key);
        const promise = (async () => {
            const variants = await Promise.all(buildMissAVVariantGroups(key).map(async group => {
                let abnormalRedirect = false;
                let blockedStatus = 0;
                let hardErrorNote = '';
                for (const candidate of group.candidates) {
                    const result = await requestPage(candidate.href, { timeout: 12000 });
                    const safeHref = sanitizeMissAVPageUrl(result.finalUrl || candidate.href, key, candidate.href);
                    if (result.ok && safeHref) {
                        return {
                            key: group.key,
                            label: group.label,
                            state: 'ok',
                            note: '存在页',
                            href: safeHref,
                            link: { label: group.label, href: safeHref, note: '存在页', kind: group.key }
                        };
                    }
                    if (result.ok && !safeHref) {
                        abnormalRedirect = true;
                        continue;
                    }
                    if (result.status === 403 && !blockedStatus) blockedStatus = 403;
                    if (!hardErrorNote && result.status && result.status !== 404) {
                        hardErrorNote = describeRequestStatus(result, '请求失败');
                    }
                }
                const fallback = group.candidates.find(item => /\/cn\//i.test(item.href)) || group.candidates[0] || null;
                let state = 'empty';
                let note = '未找到';
                if (blockedStatus) {
                    state = 'blocked';
                    note = 'HTTP ' + blockedStatus;
                } else if (abnormalRedirect) {
                    state = 'partial';
                    note = '异常跳转已忽略';
                } else if (hardErrorNote) {
                    state = 'error';
                    note = hardErrorNote;
                }
                return {
                    key: group.key,
                    label: group.label,
                    state,
                    note,
                    href: fallback?.href || '',
                    link: (state === 'blocked' || state === 'partial') && fallback
                        ? { label: group.label, href: fallback.href, note, kind: group.key }
                        : null
                };
            }));
            return {
                variants,
                links: uniqueLinkObjects(variants.map(item => item.link).filter(Boolean)),
                status: variants.some(item => item.state === 'ok')
                    ? 'ok'
                    : (variants.some(item => item.state === 'blocked')
                        ? 'blocked'
                        : (variants.some(item => item.state === 'partial')
                            ? 'partial'
                            : (variants.some(item => item.state === 'error') ? 'error' : 'empty'))),
                note: variants.map(item => item.label.replace(/^MissAV\s*/, '') + '：' + item.note).join(' · ')
            };
        })().catch(err => {
            console.warn('[JLC] MissAV 页面检测失败', err);
            resourceMissAVCache.delete(key);
            return {
                variants: buildMissAVVariantGroups(key).map(group => ({
                    key: group.key,
                    label: group.label,
                    state: 'error',
                    note: '解析异常',
                    href: (group.candidates[0] || {}).href || '',
                    link: null
                })),
                links: [],
                status: 'error',
                note: '解析异常'
            };
        });
        resourceMissAVCache.set(key, promise);
        return promise;
    }

    async function fetchFalenoTrailerInfo(context) {
        const key = context?.avid;
        if (!key) return null;
        if (resourceFalenoCache.has(key)) return resourceFalenoCache.get(key);
        const promise = (async () => {
            const searchUrl = buildFalenoSearchUrl(key);
            if (!searchUrl) return { videoSources: [], links: [], status: 'empty', note: '无候选', detailUrl: '' };
            const response = await requestPage(searchUrl, {
                timeout: 9000,
                headers: { 'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8' }
            });
            const searchLink = { label: 'FALENO', href: searchUrl, note: '官方搜索', kind: 'faleno' };
            if (!response.ok) {
                const state = [403, 429, 503].includes(response.status) ? 'blocked'
                    : (response.status === 404 ? 'empty' : 'error');
                return {
                    videoSources: [],
                    links: uniqueTrailerLinks([searchLink]),
                    status: state,
                    note: describeRequestStatus(response, '搜索失败'),
                    detailUrl: ''
                };
            }
            const searchVideos = extractFalenoPreviewCandidates(response.responseText, response.finalUrl || searchUrl);
            const detailLinks = extractFalenoDetailLinks(response.responseText, key, response.finalUrl || searchUrl);
            if (searchVideos.length) {
                return {
                    videoSources: searchVideos,
                    links: uniqueTrailerLinks([searchLink, ...detailLinks]),
                    status: 'ok',
                    note: '官方搜索页命中样片',
                    detailUrl: (detailLinks[0] || {}).href || response.finalUrl || searchUrl
                };
            }
            let blockedStatus = 0;
            let hardErrorNote = '';
            for (const detailLink of detailLinks.slice(0, 2)) {
                const detail = await requestPage(detailLink.href, {
                    timeout: 9000,
                    headers: { 'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8' }
                });
                if (!detail.ok) {
                    if ([403, 429, 503].includes(detail.status) && !blockedStatus) blockedStatus = detail.status;
                    if (!hardErrorNote && detail.status && detail.status !== 404) {
                        hardErrorNote = describeRequestStatus(detail, '详情请求失败');
                    }
                    continue;
                }
                const videos = extractFalenoPreviewCandidates(detail.responseText, detail.finalUrl || detailLink.href);
                if (videos.length) {
                    return {
                        videoSources: videos,
                        links: uniqueTrailerLinks([searchLink, detailLink]),
                        status: 'ok',
                        note: '官方详情命中样片',
                        detailUrl: detail.finalUrl || detailLink.href
                    };
                }
            }
            let state = detailLinks.length ? 'partial' : 'empty';
            let note = detailLinks.length ? '详情命中，未抽到样片' : '搜索未命中';
            if (blockedStatus) {
                state = 'blocked';
                note = 'HTTP ' + blockedStatus;
            } else if (hardErrorNote) {
                state = 'error';
                note = hardErrorNote;
            }
            return {
                videoSources: [],
                links: uniqueTrailerLinks([searchLink, ...detailLinks]),
                status: state,
                note,
                detailUrl: (detailLinks[0] || {}).href || response.finalUrl || searchUrl
            };
        })().catch(error => {
            console.warn('[JLC] FALENO 预告解析失败', error);
            resourceFalenoCache.delete(key);
            return {
                videoSources: [],
                links: uniqueTrailerLinks([{ label: 'FALENO', href: buildFalenoSearchUrl(key), note: '官方搜索', kind: 'faleno' }]),
                status: 'error',
                note: '解析异常',
                detailUrl: ''
            };
        });
        resourceFalenoCache.set(key, promise);
        return promise;
    }

    async function fetchMgsTrailerInfo(context) {
        const key = context?.avid;
        if (!key) return null;
        if (resourceMgsCache.has(key)) return resourceMgsCache.get(key);
        const promise = (async () => {
            if (!isLikelyMgsAvid(key)) {
                return { videoSources: [], links: buildMgsManualLinks(key), status: 'empty', note: '非 MGS 番号', detailUrl: '' };
            }
            const detailCandidates = buildMgsDetailCandidates(key);
            if (!detailCandidates.length) {
                return { videoSources: [], links: buildMgsManualLinks(key), status: 'empty', note: '无候选', detailUrl: '' };
            }
            let blockedStatus = 0;
            let hardErrorNote = '';
            for (const candidate of detailCandidates) {
                const detail = await requestPage(candidate.href, { timeout: 12000 });
                if (!detail.ok) {
                    if (detail.status === 403 && !blockedStatus) blockedStatus = 403;
                    if (!hardErrorNote && detail.status && detail.status !== 404) {
                        hardErrorNote = describeRequestStatus(detail, '详情请求失败');
                    }
                    continue;
                }
                const samplePlayers = extractMgsSamplePlayerLinks(detail.responseText, key);
                if (!samplePlayers.length) {
                    continue;
                }
                for (const sample of samplePlayers.slice(0, 2)) {
                    if (!sample.pid) continue;
                    const info = await requestPage('https://www.mgstage.com/sampleplayer/sampleRespons.php?pid=' + encodeURIComponent(sample.pid), { timeout: 12000 });
                    if (!info.ok) {
                        if (info.status === 403 && !blockedStatus) blockedStatus = 403;
                        if (!hardErrorNote && info.status && info.status !== 404) {
                            hardErrorNote = describeRequestStatus(info, '样片请求失败');
                        }
                        continue;
                    }
                    let payload = null;
                    try {
                        payload = JSON.parse(info.responseText || '{}');
                    } catch (error) {
                        payload = null;
                    }
                    const movieUrl = buildMgsSampleVideoUrl(payload?.url || '');
                    if (!movieUrl) continue;
                    return {
                        videoSources: [{ label: 'MGS 官方预告', href: movieUrl, kind: 'official', pageUrl: candidate.href }],
                        links: uniqueLinkObjects([{ label: 'MGS', href: candidate.href, note: '官方详情' }]),
                        status: 'ok',
                        note: '官方样片直连',
                        detailUrl: candidate.href
                    };
                }
                return {
                    videoSources: [],
                    links: uniqueLinkObjects([{ label: 'MGS', href: candidate.href, note: '官方详情' }]),
                    status: 'partial',
                    note: '详情命中，样片解析失败',
                    detailUrl: candidate.href
                };
            }
            let state = 'empty';
            let note = '未命中';
            if (blockedStatus) {
                state = 'blocked';
                note = 'HTTP ' + blockedStatus;
            } else if (hardErrorNote) {
                state = 'error';
                note = hardErrorNote;
            }
            return {
                videoSources: [],
                links: buildMgsManualLinks(key),
                status: state,
                note,
                detailUrl: (detailCandidates[0] || {}).href || ''
            };
        })().catch(err => {
            console.warn('[JLC] MGS 预告解析失败', err);
            resourceMgsCache.delete(key);
            return {
                videoSources: [],
                links: buildMgsManualLinks(key),
                status: 'error',
                note: '解析异常',
                detailUrl: (buildMgsDetailCandidates(key)[0] || {}).href || ''
            };
        });
        resourceMgsCache.set(key, promise);
        return promise;
    }

    async function fetchSupplementalMagnetInfo(avid) {
        const key = normalizeResourceAvid(avid);
        const emptyMessage = '未搜索到补充磁力';
        if (!key) return { magnets: [], statuses: [], sources: [], message: emptyMessage };
        if (resourceMagnetCache.has(key)) return resourceMagnetCache.get(key);
        const providers = [
            { key: 'sukebei', label: 'Sukebei', url: buildSukebeiSearchUrl(key), extract: extractSukebeiMagnetEntries, fetch: (url) => requestPage(url, { timeout: 12000 }) },
            { key: 'torrentkitty', label: 'Torkitty', url: buildTorrentKittySearchUrl(key), extract: extractTorrentKittyMagnetEntries, fetch: (url) => requestPage(url, { timeout: 12000 }) },
            { key: 'btsow', label: 'BTSOW', url: buildBtsowSearchUrl(key), extract: extractBtsowMagnetEntries, fetch: (url) => requestBtsowSearchPage(url) }
        ];
        const promise = (async () => {
            const results = await Promise.all(providers.map(async provider => {
                try {
                    if (!provider.url) {
                        return { key: provider.key, label: provider.label, href: provider.url, state: 'empty', note: '缺少番号', entries: [] };
                    }
                    const response = await provider.fetch(provider.url);
                    if (!response.ok || response.blockedByChallenge) {
                        const state = response.blockedByChallenge
                            ? 'blocked'
                            : ([403, 429, 503].includes(response.status) ? 'blocked' : (response.status === 404 ? 'empty' : 'error'));
                        return {
                            key: provider.key,
                            label: provider.label,
                            href: provider.url,
                            state,
                            note: response.blockedByChallenge ? 'JS challenge' : describeRequestStatus(response, '检索失败'),
                            entries: []
                        };
                    }
                    const entries = provider.extract(response.responseText, key);
                    return {
                        key: provider.key,
                        label: provider.label,
                        href: provider.url,
                        state: entries.length ? 'ok' : 'empty',
                        note: entries.length ? (entries.length + ' 条') : '未命中',
                        entries
                    };
                } catch (error) {
                    console.warn('[JLC] 磁力 provider 解析失败', provider.label, error);
                    return { key: provider.key, label: provider.label, href: provider.url, state: 'error', note: '解析异常', entries: [] };
                }
            }));
            const statuses = results.map(result => ({
                key: result.key,
                label: result.label,
                state: result.state,
                note: result.note,
                href: result.href
            }));
            const magnets = uniqueMagnetEntries(results.flatMap(result => result.entries));
            const sources = results.map(result => ({
                key: result.key,
                label: result.label,
                href: result.href,
                state: result.state,
                note: result.note,
                magnets: uniqueMagnetEntries(result.entries)
            }));
            return {
                magnets,
                statuses,
                sources,
                message: magnets.length ? '' : emptyMessage
            };
        })().catch(error => {
            console.warn('[JLC] 磁力补充搜索失败', error);
            resourceMagnetCache.delete(key);
            return {
                magnets: [],
                statuses: [
                    { key: 'sukebei', label: 'Sukebei', state: 'error', note: '解析异常', href: buildSukebeiSearchUrl(key) },
                    { key: 'torrentkitty', label: 'Torkitty', state: 'error', note: '解析异常', href: buildTorrentKittySearchUrl(key) },
                    { key: 'btsow', label: 'BTSOW', state: 'error', note: '解析异常', href: buildBtsowSearchUrl(key) }
                ],
                sources: [],
                message: emptyMessage
            };
        });
        resourceMagnetCache.set(key, promise);
        return promise;
    }

    async function resolveTrailerSources(context, options = {}) {
        const key = context?.avid;
        if (!key) return { videoSources: [], linkSources: [], statuses: [], trailerNote: '' };
        const includeMissAV = options?.includeMissAV !== false;
        const cacheKey = includeMissAV ? key + '::missav-status' : key + '::dmm-only';
        if (resourceTrailerCache.has(cacheKey)) return resourceTrailerCache.get(cacheKey);
        const promise = (async () => {
            const officialCandidates = buildOfficialPreviewCandidates(key);
            const missPromise = includeMissAV
                ? fetchMissAVTrailerInfo(context)
                : Promise.resolve({
                    variants: buildMissAVVariantGroups(key).map(group => ({
                        key: group.key,
                        label: group.label,
                        state: 'empty',
                        note: '仅保留直达候选',
                        href: (group.candidates[0] || {}).href || ''
                    })),
                    links: buildMissAVManualLinks(key),
                    status: 'empty',
                    note: '仅保留直达候选'
                });
            const shouldTryMgs = isLikelyMgsAvid(key);
            const earlyMgsPromise = shouldTryMgs ? fetchMgsTrailerInfo(context) : null;
            const supplementalPromise = fetchTrailerSupplementalStatus(key);
            const officialChecks = await Promise.all(officialCandidates.map(async candidate => ({
                candidate,
                probe: await probeMediaUrl(candidate.href)
            })));
            const officialHit = officialChecks.find(item => item.probe?.ok);
            const bestOfficialFailure = officialChecks.find(item => item.probe && item.probe.state !== 'ok')?.probe || null;
            const dmmSearchInfo = officialHit ? null : await fetchDmmSearchTrailerInfo(context);
            const hasDmmSearchVideo = !!(dmmSearchInfo?.videoSources?.length);
            const falenoInfo = (!officialHit && !hasDmmSearchVideo) ? await fetchFalenoTrailerInfo(context) : null;
            const hasFalenoVideo = !!(falenoInfo?.videoSources?.length);
            const missInfo = await missPromise;
            const mgsInfo = (!officialHit && !hasDmmSearchVideo && !hasFalenoVideo && shouldTryMgs)
                ? await earlyMgsPromise
                : null;
            const supplementalInfo = await supplementalPromise;

            const statuses = [
                officialHit
                    ? { label: 'DMM', state: 'ok', note: officialHit.probe.note || '直连可用', href: officialHit.candidate.href }
                    : {
                        label: 'DMM',
                        state: normalizeResourceStatusState((dmmSearchInfo?.status && dmmSearchInfo.status !== 'empty')
                            ? dmmSearchInfo.status
                            : (bestOfficialFailure?.state || dmmSearchInfo?.status || 'empty')),
                        note: dmmSearchInfo?.note || bestOfficialFailure?.note || (officialCandidates.length ? '未命中' : '无候选'),
                        href: (dmmSearchInfo?.links?.[0] || officialCandidates[0] || {}).href || ''
                    },
                ...(falenoInfo ? [{
                    label: 'FALENO',
                    state: normalizeResourceStatusState(falenoInfo.status || 'empty'),
                    note: falenoInfo.note || '未命中',
                    href: (falenoInfo.links?.[0] || {}).href || ''
                }] : []),
                ...(mgsInfo ? [{
                    label: 'MGS',
                    state: normalizeResourceStatusState(mgsInfo.status || 'empty'),
                    note: mgsInfo.note || '未命中',
                    href: (mgsInfo.links?.[0] || {}).href || ''
                }] : []),
                ...((missInfo?.variants || []).map(item => ({
                    label: item.label,
                    state: normalizeResourceStatusState(item.state || 'empty'),
                    note: item.note || '未命中',
                    href: item.href || ''
                }))),
                ...((supplementalInfo?.statuses || []).map(item => ({
                    label: item.label,
                    state: normalizeResourceStatusState(item.state || 'empty'),
                    note: item.note || '未命中',
                    href: item.href || '',
                    kind: item.kind || ''
                })))
            ];

            const videoSources = uniqueTrailerSources([
                ...(officialHit ? [{
                    label: 'DMM 官方预告',
                    href: officialHit.candidate.href,
                    kind: 'official',
                    pageUrl: officialHit.candidate.href,
                    type: 'video'
                }] : []),
                ...(!officialHit && hasDmmSearchVideo ? (dmmSearchInfo.videoSources || []) : []),
                ...(!officialHit && !hasDmmSearchVideo ? (falenoInfo?.videoSources || []) : []),
                ...(!officialHit && !hasDmmSearchVideo && !hasFalenoVideo ? (mgsInfo?.videoSources || []) : [])
            ]);

            const missLinks = includeMissAV ? (missInfo?.links || []) : buildMissAVManualLinks(key);
            const linkSources = uniqueTrailerLinks([
                ...((officialHit || dmmSearchInfo?.links?.length) ? [] : officialCandidates.slice(0, 1).map(item => ({
                    label: 'DMM 直链候选',
                    href: item.href,
                    note: bestOfficialFailure?.note || '待手动验证'
                }))),
                ...(dmmSearchInfo?.links || []),
                ...(falenoInfo?.links || []),
                ...(mgsInfo?.links || []),
                ...missLinks,
                ...(supplementalInfo?.links || [])
            ]);

            return {
                videoSources,
                linkSources,
                statuses,
                trailerNote: ''
            };
        })().catch(err => {
            console.warn('[JLC] 预告解析失败', err);
            resourceTrailerCache.delete(cacheKey);
            return {
                videoSources: [],
                linkSources: uniqueTrailerLinks([...buildMissAVManualLinks(key), ...buildTrailerFallbackLinks(key)]),
                statuses: [
                    { label: 'DMM', state: 'error', note: '解析异常' },
                    { label: 'FALENO', state: 'error', note: '解析异常' },
                    { label: 'MGS', state: 'error', note: '解析异常' },
                    { label: 'MissAV 有码', state: 'error', note: '解析异常' },
                    { label: 'MissAV 无码流出', state: 'error', note: '解析异常' }
                ],
                trailerNote: ''
            };
        });
        resourceTrailerCache.set(cacheKey, promise);
        return promise;
    }

    async function buildInlineScreenshotPanel(context) {
        const key = context?.avid;
        if (!key) throw new Error('missing avid');
        let promise = resourceScreenshotCache.get(key);
        if (!promise) {
            promise = getAvImg(key, `jlc-resource-${key}`).catch(err => {
                resourceScreenshotCache.delete(key);
                throw err;
            });
            resourceScreenshotCache.set(key, promise);
        }
        const originalPanel = await promise;
        const $panel = originalPanel.clone(true, true);
        $panel.removeAttr('name').removeClass('pop-up-tag').addClass('jlc-inline-screenshot-panel').show();
        $panel.css({ minHeight: '0', width: '100%' });
        $panel.find('ul').remove();
        $panel.find('img[name="screenshot"]').each((index, img) => {
            if (index === 0) {
                img.style.display = 'block';
            } else {
                $(img).remove();
            }
        });
        $panel.find('li.imgResult-li').removeClass('imgResult-loading');
        $panel.find('li.imgResult-li').eq(0).addClass('imgResult-Current').siblings().removeClass('imgResult-Current');
        return $panel.get(0);
    }

    function extractCurrentPageMagnets() {
        const anchors = Array.from(document.querySelectorAll('a[href^="magnet:"]'));
        return uniqueMagnetEntries(anchors.map((anchor, index) => {
            const row = anchor.closest('tr, .item, .magnet-item, .columns, .panel-block, .message, .card-content') || anchor.parentElement;
            const rowText = compactText(row);
            const text = compactText(anchor.textContent);
            const sizeMatch = rowText.match(/(?:\d+(?:\.\d+)?\s*(?:GB|MB|TB))/i);
            const dateMatch = rowText.match(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/);
            const noteParts = ['当前页'];
            if (sizeMatch?.[0]) noteParts.push(sizeMatch[0]);
            if (dateMatch?.[0]) noteParts.push(dateMatch[0]);
            return {
                title: text || `磁链 ${index + 1}`,
                href: anchor.href,
                provider: 'page',
                note: noteParts.join(' · ')
            };
        }));
    }

    function normalizeMagnetProviderKey(value) {
        const key = normalizeText(value || '').replace(/[^a-z0-9]+/g, '');
        if (!key || key === 'all') return 'all';
        if (key === 'page' || key === 'currentpage') return 'page';
        if (key === 'torrentkitty' || key === 'torkitty') return 'torrentkitty';
        if (key === 'sukebei') return 'sukebei';
        if (key === 'btsow') return 'btsow';
        if (key === 'sehuatang' || key === 'sehua' || key === 'sehuatangsearch') return 'sehuatang';
        return key;
    }

    function filterMagnetsByProvider(list, providerKey) {
        const key = normalizeMagnetProviderKey(providerKey);
        if (!key || key === 'all') return uniqueMagnetEntries(list);
        return uniqueMagnetEntries((Array.isArray(list) ? list : []).filter(item => normalizeMagnetProviderKey(item?.provider) === key));
    }

    function makeMagnetProviderStatusMarkup(statuses, activeProvider = 'all') {
        const list = Array.isArray(statuses) ? statuses : [];
        if (!list.length) return '';
        return '<div class="jlc-resource-status-list">' + list.map(item => {
            const state = normalizeResourceStatusState(item.state || item.status);
            const label = String(item.label || item.provider || '来源').trim();
            const note = String(item.note || '').trim();
            const key = normalizeMagnetProviderKey(item.key || item.provider || item.label || 'all');
            const href = normalizeMediaUrl(item.href || item.url || '', location?.href || 'https://www.javlibrary.com/');
            const title = href ? '点击切换；再次点击或空结果时打开源站' : '点击切换磁力来源';
            return '<button type="button" class="jlc-resource-status is-' + escapeHtml(state) + (normalizeMagnetProviderKey(activeProvider) === key ? ' is-active-filter' : '') + '" data-jlc-magnet-provider="' + escapeHtml(key) + '"' + (href ? ' data-jlc-provider-href="' + escapeHtml(href) + '"' : '') + ' title="' + escapeHtml(title) + '">' + '<strong>' + escapeHtml(label) + '</strong>' + (note ? '<small>' + escapeHtml(note) + '</small>' : '') + '</button>';
        }).join('') + '</div>';
    }

    function bindMagnetProviderButtons(body, handlers = {}) {
        body.querySelectorAll('[data-jlc-magnet-provider]').forEach(button => {
            const handleActivate = (event) => {
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
                }
                const key = normalizeMagnetProviderKey(button.dataset.jlcMagnetProvider || 'all');
                const href = button.dataset.jlcProviderHref || '';
                const count = Number(button.dataset.jlcProviderCount || 0);
                const isActive = button.dataset.jlcProviderActive === '1';
                if (href && (isActive || count < 1)) {
                    window.open(href, '_blank', 'noopener,noreferrer');
                    return;
                }
                handlers.onSwitch?.(key);
            };
            button.addEventListener('click', handleActivate);
            button.addEventListener('auxclick', (event) => {
                if (event.button !== 1) return;
                handleActivate(event);
            });
        });
    }

    function makeMagnetListMarkup(magnets) {
        if (!magnets.length) return '';
        return `<div class="jlc-magnet-list">${magnets.map((magnet, index) => {
            const title = magnet.label || magnet.title || ('磁链 ' + (index + 1));
            const note = magnet.note || '磁力链接';
            return `
            <div class="jlc-magnet-row" data-jlc-magnet-index="${index}">
                <div class="jlc-magnet-meta">
                    <div class="jlc-magnet-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
                </div>
                <div class="jlc-magnet-side">
                    <div class="jlc-magnet-sub" title="${escapeHtml(note)}">${escapeHtml(note)}</div>
                    <div class="jlc-magnet-actions">
                        <button type="button" data-jlc-copy-magnet="${index}">复制磁链</button>
                        <a href="${escapeHtml(magnet.href)}" target="_blank" rel="noopener noreferrer nofollow">打开</a>
                        ${magnet.src ? `<a href="${escapeHtml(magnet.src)}" target="_blank" rel="noopener noreferrer nofollow">来源</a>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('')}</div>`;
    }

    function bindMagnetActionButtons(body, magnets) {
        body.querySelectorAll('[data-jlc-copy-magnet]').forEach(button => {
            button.addEventListener('click', () => {
                const magnet = magnets[Number(button.dataset.jlcCopyMagnet)];
                if (!magnet) return;
                GM_setClipboard(magnet.href);
                showAlert('磁链已复制！');
            });
        });
    }

    function renderResourceLinksSection(card, context) {
        const body = card.querySelector('.jlc-resource-body');
        const markup = makeResourceLinksMarkup(buildExternalResourceLinks(context.avid, context.site));
        body.innerHTML = markup || '<div class="jlc-resource-empty">暂无站外入口。</div>';
    }

    async function renderTrailerSection(card, context, token) {
        const body = card.querySelector('.jlc-resource-body');
        const key = normalizeResourceAvid(context?.avid);
        const idleStatuses = [
            { label: 'DMM', state: 'pending', note: '自动检测中' },
            { label: 'MissAV 有码', state: 'pending', note: '自动检测中' },
            { label: 'MissAV 无码流出', state: 'pending', note: '自动检测中' },
            { label: 'FALENO', state: 'pending', note: '自动检测中' },
            { label: '7MMTV', state: 'pending', note: '自动检测中' },
            { label: 'SupJav', state: 'pending', note: '自动检测中' },
            { label: '123AV', state: 'pending', note: '自动检测中' }
        ];
        if (isLikelyMgsAvid(key)) {
            idleStatuses.splice(3, 0, { label: 'MGS', state: 'pending', note: '等待回退' });
        }
        const idleLinks = uniqueTrailerLinks([
            ...buildMissAVManualLinks(key),
            ...buildTrailerFallbackLinks(key)
        ]);
        let loadingTrailer = false;

        const swallowEvent = (event, preventDefault = false) => {
            if (!event) return;
            if (preventDefault) event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        };

        const bindReloadButton = () => {
            const button = body.querySelector('[data-jlc-load-trailer]');
            if (!button) return;
            button.addEventListener('click', (event) => {
                swallowEvent(event, true);
                clearTrailerResourceCaches(key);
                void loadTrailer();
            }, { capture: true });
        };

        const renderLoading = () => {
            body.innerHTML = makeTrailerProviderMarkup(idleStatuses, idleLinks)
                + '<div class="jlc-resource-loading">自动检测预告中...</div>';
        };

        const renderResolved = (result) => {
            const videoSources = uniqueTrailerSources(result.videoSources || []);
            const linkSources = uniqueTrailerLinks(result.linkSources || idleLinks);
            const displayLinks = linkSources.length ? linkSources : idleLinks;
            const statuses = result.statuses || idleStatuses;
            const providerMarkup = makeTrailerProviderMarkup(statuses, displayLinks);
            const actionsBase = ''
                + '<div class="jlc-resource-inline-actions jlc-trailer-main-actions">'
                + '    <button type="button" data-jlc-open-trailer>弹层播放</button>'
                + '    <a href="#" target="_blank" rel="noopener noreferrer nofollow" data-jlc-open-trailer-blank>新标签打开</a>'
                + '    <button type="button" data-jlc-load-trailer>重新检测</button>'
                + '</div>';

            if (!videoSources.length) {
                body.innerHTML = providerMarkup
                    + '<div class="jlc-resource-empty">暂时没找到可直连预告。</div>'
                    + actionsBase;
                const openBlank = body.querySelector('[data-jlc-open-trailer-blank]');
                if (openBlank) openBlank.href = (linkSources[0] || {}).href || '#';
                body.querySelector('[data-jlc-open-trailer]')?.addEventListener('click', (event) => {
                    swallowEvent(event, true);
                    const target = linkSources[0];
                    if (target?.href) window.open(target.href, '_blank', 'noopener,noreferrer');
                });
                bindReloadButton();
                return;
            }

            body.innerHTML = providerMarkup
                + '<div class="jlc-trailer-inline-player" data-jlc-trailer-inline-player></div>'
                + (videoSources.length > 1
                    ? '<div class="jlc-resource-inline-actions jlc-trailer-source-list">'
                        + videoSources.map((source, index) => '<button type="button" class="jlc-trailer-source-button" data-jlc-trailer-index="' + index + '">' + escapeHtml(source.label) + '</button>').join('')
                        + '</div>'
                    : '')
                + actionsBase;

            const playerHost = body.querySelector('[data-jlc-trailer-inline-player]');
            const openButton = body.querySelector('[data-jlc-open-trailer]');
            const openBlank = body.querySelector('[data-jlc-open-trailer-blank]');
            let activeIndex = 0;

            const activateSource = (index) => {
                activeIndex = index;
                const activeSource = videoSources[index] || videoSources[0];
                mountTrailerPlayer(playerHost, activeSource, { mode: 'inline', autoplay: false, muted: true });
                body.querySelectorAll('[data-jlc-trailer-index]').forEach((button, buttonIndex) => {
                    button.classList.toggle('is-active', buttonIndex === index);
                });
                if (openBlank && activeSource) openBlank.href = activeSource.pageUrl || activeSource.href;
            };

            activateSource(0);

            openButton?.addEventListener('click', (event) => {
                swallowEvent(event, true);
                openTrailerOverlay(videoSources[activeIndex] || videoSources[0]);
            });

            body.querySelectorAll('[data-jlc-trailer-index]').forEach(button => {
                button.addEventListener('click', (event) => {
                    swallowEvent(event, true);
                    activateSource(Number(button.dataset.jlcTrailerIndex));
                });
            });

            bindReloadButton();
        };

        const loadTrailer = async () => {
            if (loadingTrailer) return;
            loadingTrailer = true;
            renderLoading();
            try {
                const result = await resolveTrailerSources(context, { includeMissAV: true });
                if (!isResourceCenterTokenAlive(token)) return;
                renderResolved(result);
            } finally {
                loadingTrailer = false;
            }
        };

        renderLoading();
        window.setTimeout(() => {
            if (!isResourceCenterTokenAlive(token)) return;
            void loadTrailer();
        }, 0);
    }

    function renderScreenshotSection(card, context, token) {
        const body = card.querySelector('.jlc-resource-body');
        const screenshotLinks = buildScreenshotSearchLinks(context.avid);
        const linkMap = new Map(screenshotLinks.map(item => [item.label, item.href]));
        const pendingStatuses = [
            { label: 'BlogJav', state: 'pending', note: '主源待查', href: linkMap.get('BlogJav') || '' },
            { label: 'JavStore', state: 'pending', note: '兜底待查', href: linkMap.get('JavStore') || '' }
        ];
        const loadScreenshots = async () => {
            body.innerHTML = makeResourceStatusMarkup(pendingStatuses) + '<div class="jlc-resource-loading">正在加载截图...</div>';
            let info = null;
            try {
                info = await fetchScreenshotResourceInfo(context.avid);
                if (!isResourceCenterTokenAlive(token)) return;
                const panel = await buildInlineScreenshotPanel(context);
                if (!isResourceCenterTokenAlive(token)) return;
                body.innerHTML = makeResourceStatusMarkup(info?.statuses || pendingStatuses);
                body.appendChild(panel);
            } catch (error) {
                if (!isResourceCenterTokenAlive(token)) return;
                body.innerHTML = makeResourceStatusMarkup(info?.statuses || pendingStatuses)
                    + '<div class="jlc-resource-empty">' + escapeHtml(error || info?.message || lang.getAvImg_none || '暂无截图') + '</div>';
            }
        };

        if (config.resource_screenshot_auto) {
            loadScreenshots();
            return;
        }
        body.innerHTML = makeResourceStatusMarkup(pendingStatuses)
            + '<div class="jlc-resource-note">沿用主脚本截图面板，优先 BlogJav，失败再回退 JavStore；默认手动加载避免拖慢首屏。</div>'
            + '<div class="jlc-resource-inline-actions"><button type="button" data-jlc-load-screenshot>加载截图</button></div>';
        body.querySelector('[data-jlc-load-screenshot]')?.addEventListener('click', loadScreenshots, { once: true });
    }

    function renderMagnetSection(card, context, token) {
        const body = card.querySelector('.jlc-resource-body');
        const titleNode = card.querySelector('h3');
        let titleBar = card.querySelector('.jlc-resource-card-titlebar');
        if (titleNode && !titleBar) {
            titleBar = document.createElement('div');
            titleBar.className = 'jlc-resource-card-titlebar';
            titleNode.parentNode.insertBefore(titleBar, titleNode);
            titleBar.appendChild(titleNode);
        }
        let titleTools = card.querySelector('.jlc-resource-card-tools');
        if (titleBar && !titleTools) {
            titleTools = document.createElement('div');
            titleTools.className = 'jlc-resource-card-tools';
            titleBar.appendChild(titleTools);
        }

        const pageMagnets = extractCurrentPageMagnets();
        const pendingStatuses = [
            { key: 'all', label: '全部', state: pageMagnets.length ? 'ok' : 'pending', note: pageMagnets.length ? `去重 ${pageMagnets.length} 条` : '准备搜索' },
            { key: 'page', label: '当前页', state: pageMagnets.length ? 'ok' : 'empty', note: pageMagnets.length ? `${pageMagnets.length} 条` : '无直出' },
            { key: 'sukebei', label: 'Sukebei', state: 'pending', note: '自动检测中', href: buildSukebeiSearchUrl(context.avid) },
            { key: 'torrentkitty', label: 'Torkitty', state: 'pending', note: '自动检测中', href: buildTorrentKittySearchUrl(context.avid) },
            { key: 'btsow', label: 'BTSOW', state: 'pending', note: '自动检测中', href: buildBtsowSearchUrl(context.avid) },
            { key: 'sehuatang', label: '色花堂', state: 'ok', note: '番号搜索', href: buildSehuatangSearchUrl(context.avid) }
        ];
        let supplementalInfo = { magnets: [], statuses: pendingStatuses.slice(2, 5), sources: [], message: '' };
        let loading = false;
        let searched = false;
        let activeProvider = 'all';
        let lastMessage = pageMagnets.length ? '' : '当前页暂无可直接抽取的磁力。';

        const getSourceMagnets = () => {
            const key = normalizeMagnetProviderKey(activeProvider);
            const sourceMap = new Map((supplementalInfo.sources || []).map(item => [normalizeMagnetProviderKey(item.key), item]));
            if (key === 'page') return pageMagnets;
            if (key === 'all') return uniqueMagnetEntries([...pageMagnets, ...((supplementalInfo.sources || []).flatMap(item => item.magnets || []))]);
            return sourceMap.get(key)?.magnets || [];
        };

        const buildStatuses = () => {
            const sourceMap = new Map((supplementalInfo.sources || []).map(item => [normalizeMagnetProviderKey(item.key), item]));
            const totalMagnets = uniqueMagnetEntries([...pageMagnets, ...((supplementalInfo.sources || []).flatMap(item => item.magnets || []))]);
            const list = [
                {
                    key: 'all',
                    label: '全部',
                    state: loading ? (totalMagnets.length ? 'ok' : 'pending') : (totalMagnets.length ? 'ok' : (searched ? 'empty' : (pageMagnets.length ? 'ok' : 'pending'))),
                    note: loading ? `去重 ${totalMagnets.length} 条 · 搜索中` : `去重 ${totalMagnets.length} 条`
                },
                { key: 'page', label: '当前页', state: pageMagnets.length ? 'ok' : 'empty', note: pageMagnets.length ? `${pageMagnets.length} 条` : '无直出' }
            ];
            ['sukebei', 'torrentkitty', 'btsow', 'sehuatang'].forEach(providerKey => {
                const source = sourceMap.get(providerKey);
                const fallback = pendingStatuses.find(item => item.key === providerKey) || { key: providerKey, label: providerKey.toUpperCase(), state: 'pending', note: '自动检测中' };
                const sourceMagnets = source?.magnets || [];
                const sourceNoteParts = [];
                if (sourceMagnets.length) sourceNoteParts.push(sourceMagnets.length + ' 条');
                if (source?.note && source.note !== '未命中' && source.note !== (sourceMagnets.length + ' 条')) sourceNoteParts.push(source.note);
                list.push({
                    key: providerKey,
                    label: source?.label || fallback.label,
                    state: source?.state || fallback.state,
                    note: sourceNoteParts.join(' · ') || source?.note || fallback.note,
                    href: source?.href || fallback.href
                });
            });
            return list.map(item => Object.assign({}, item, {
                count: normalizeMagnetProviderKey(item.key) === 'all' ? totalMagnets.length
                    : (normalizeMagnetProviderKey(item.key) === 'page' ? pageMagnets.length : (sourceMap.get(normalizeMagnetProviderKey(item.key))?.magnets || []).length),
                active: normalizeMagnetProviderKey(activeProvider) === normalizeMagnetProviderKey(item.key)
            }));
        };

        const renderTitleTools = () => {
            if (!titleTools) return;
            titleTools.innerHTML = '<button type="button" class="jlc-title-inline-button" data-jlc-load-magnet' + (loading ? ' disabled' : '') + '>' + (loading ? '刷新中...' : '刷新磁力') + '</button>';
            titleTools.querySelector('[data-jlc-load-magnet]')?.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
                void loadMagnets();
            }, { capture: true });
        };

        const render = () => {
            const magnets = getSourceMagnets();
            const statuses = buildStatuses();
            const totalCount = statuses.find(item => normalizeMagnetProviderKey(item.key) === 'all')?.count || 0;
            const summaryParts = [`去重聚合 ${totalCount} 条`, `当前页 ${pageMagnets.length} 条`];
            if (activeProvider !== 'all') {
                const activeStatus = statuses.find(item => normalizeMagnetProviderKey(item.key) === normalizeMagnetProviderKey(activeProvider));
                if (activeStatus?.label) summaryParts.push('筛选 ' + activeStatus.label);
            }
            let emptyText = lastMessage || '当前还没有可用磁力。';
            if (searched && activeProvider !== 'all' && !magnets.length) {
                const activeStatus = statuses.find(item => normalizeMagnetProviderKey(item.key) === normalizeMagnetProviderKey(activeProvider));
                emptyText = (activeStatus?.label || '当前来源') + ' 暂无磁力';
            }
            const contentMarkup = magnets.length ? makeMagnetListMarkup(magnets) : `<div class="jlc-resource-empty">${escapeHtml(emptyText)}</div>`;
            renderTitleTools();
            body.innerHTML = makeMagnetProviderStatusMarkup(statuses, activeProvider)
                + `<div class="jlc-resource-note">${escapeHtml(summaryParts.join(' · '))}</div>`
                + (loading ? '<div class="jlc-resource-loading">正在搜索 Sukebei / Torkitty / BTSOW...</div>' : '')
                + contentMarkup;
            body.querySelectorAll('[data-jlc-magnet-provider]').forEach(button => {
                const key = normalizeMagnetProviderKey(button.dataset.jlcMagnetProvider || 'all');
                const status = statuses.find(item => normalizeMagnetProviderKey(item.key) === key);
                button.dataset.jlcProviderCount = String(status?.count || 0);
                button.dataset.jlcProviderActive = status?.active ? '1' : '0';
            });
            bindMagnetProviderButtons(body, {
                onSwitch: (providerKey) => {
                    activeProvider = normalizeMagnetProviderKey(providerKey);
                    render();
                }
            });
            bindMagnetActionButtons(body, magnets);
        };

        const loadMagnets = async () => {
            if (loading) return;
            loading = true;
            render();
            const info = await fetchSupplementalMagnetInfo(context.avid);
            if (!isResourceCenterTokenAlive(token)) return;
            supplementalInfo = info || { magnets: [], statuses: [], sources: [], message: '' };
            lastMessage = info?.message || (pageMagnets.length ? '' : '未搜索到补充磁力');
            searched = true;
            loading = false;
            render();
        };

        render();
        window.setTimeout(() => {
            if (!isResourceCenterTokenAlive(token)) return;
            void loadMagnets();
        }, 0);
    }

        function renderDetailResourceCenter(force = false) {
        applyJavlibraryMenuTopStyle();
        const context = getCurrentDetailContext();
        if (context) {
            void decorateCurrentDetailPage(force);
            ensureDetailPageCopyButtons(context);
        } else {
            removeDetailPageCopyButtons();
        }
        if (!context || config.resource_center === false) {
            removeDetailResourceCenter();
            return;
        }
        if (force) {
            clearDetailResourceCaches(context.avid);
        }
        const releaseDate = extractDetailReleaseDate(context);
        syncDetailReleaseBadge(context, releaseDate);
        const container = ensureDetailResourceCenter(context);
        if (!container) return;
        const token = Date.now() + '-' + Math.random().toString(36).slice(2);
        container.dataset.renderToken = token;
        const subtitle = [context.siteLabel, context.avid, releaseDate ? ('发行 ' + releaseDate) : ''].filter(Boolean).join(' · ');
        const cards = [];
        if (config.resource_trailer !== false) {
            cards.push('<section class="jlc-resource-card" data-jlc-resource="trailer"><h3>预告片</h3><div class="jlc-resource-body"></div></section>');
        }
        if (config.resource_screenshot !== false) {
            cards.push('<section class="jlc-resource-card" data-jlc-resource="screenshot"><h3>截图</h3><div class="jlc-resource-body"></div></section>');
        }
        if (config.resource_magnet !== false) {
            cards.push('<section class="jlc-resource-card" data-jlc-resource="magnet"><h3>磁力</h3><div class="jlc-resource-body"></div></section>');
        }
        container.innerHTML = ''
            + '<div class="jlc-resource-header">'
            + '    <div>'
            + '        <div class="jlc-resource-title">JLC 资源中心</div>'
            + '        <div class="jlc-resource-subtitle">' + escapeHtml(subtitle) + (context.title ? (' · ' + escapeHtml(context.title)) : '') + '</div>'
            + '    </div>'
            + '    <div class="jlc-resource-header-actions">'
            + '        <button type="button" data-jlc-resource-refresh>刷新资源</button>'
            + '        <button type="button" data-jlc-resource-settings>资源设置</button>'
            + '    </div>'
            + '</div>'
            + '<div class="jlc-resource-grid">' + (cards.length ? cards.join('') : '<div class="jlc-resource-empty">当前没有启用任何资源模块。</div>') + '</div>';
        container.querySelector('[data-jlc-resource-refresh]')?.addEventListener('click', () => renderDetailResourceCenter(true));
        container.querySelector('[data-jlc-resource-settings]')?.addEventListener('click', () => openCommanderPanel('resource'));

        const trailerCard = container.querySelector('[data-jlc-resource="trailer"]');
        if (trailerCard) renderTrailerSection(trailerCard, context, token);
        const screenshotCard = container.querySelector('[data-jlc-resource="screenshot"]');
        if (screenshotCard) renderScreenshotSection(screenshotCard, context, token);
        const magnetCard = container.querySelector('[data-jlc-resource="magnet"]');
        if (magnetCard) renderMagnetSection(magnetCard, context, token);
    }



    let lazyLoad;
    let scroller;
    let myModal;//弹窗插件实例
    let currentWeb = "javbus";//网站域名标识，用于判断当前在什么网站
    let currentObj ;//当前网站对应的属性对象
    /**
     * 通用属性对象
     * domainReg：         域名正则式 用于判断当前在什么网站
     * excludePages：      排除的页面
     * halfImg_block_Pages 屏蔽竖图的页面
     * gridSelector        源网页的网格选择器
     * itemSelector        源网页的子元素选择器
     * widthSelector       源网页的宽度设置元素选择器
     * pageNext            源网页的下一页元素选择器
     * pageSelector        源网页的翻页元素选择器
     * getAvItem           解析源网页item的数据
     * init_Style          加载各网页的特殊css
     */
    let ConstCode = {
        javbus: {
            domainReg: /(javbus|busjav|busfan|fanbus|buscdn|cdnbus|dmmsee|seedmm|busdmm|dmmbus|javsee|seejav)\./i,
            excludePages: ['/actresses', 'mdl=favor&sort=1', 'mdl=favor&sort=2', 'mdl=favor&sort=3', 'mdl=favor&sort=4', 'searchstar'],
            halfImg_block_Pages:['/uncensored','javbus.one','mod=uc','javbus.red'],
            gridSelector: 'div#waterfall',
            itemSelector: 'div#waterfall div.item',
            widthSelector : '#grid-b',
            pageNext:'a#next',
            pageSelector:'.pagination',
            getAvItem: function (elem) {
                var photoDiv = elem.find("div.photo-frame")[0];
                var href = elem.find("a")[0].href;
                var img = $(photoDiv).children("img")[0];
                var src = img.src;
                if (src.match(/pics.dmm.co.jp/)) {
                    src = src.replace(/ps.jpg/, "pl.jpg");
                }else if(src.match(/image.mgstage.com/)){
                    src = src.replace(/pf_o1_|pb_p_/, "pb_e_");
                } else {
                    src = src.replace(/thumbs/, "cover").replace(/thumb/, "cover").replace(/.jpg/, "_b.jpg");
                }
                var title = img.title;
                var AVID = elem.find("date").eq(0).text();
                var date = elem.find("date").eq(1).text();
                var itemTag = "";elem.find("div.photo-info .btn").toArray().forEach( x=> itemTag+=x.outerHTML);
                return {AVID,href,src,title,date,itemTag};
            }
        },
        javdb: {
            domainReg: /(javdb)[0-9]*\./i,
            excludePages: ['/users/'],
            halfImg_block_Pages:['/uncensored','/western','/video_uncensored','/video_western'],
            gridSelector: 'div.movie-list.h',
            itemSelector: 'div.movie-list.h>div.item',
            widthSelector : '#grid-b',
            pageNext: 'a.pagination-next',
            pageSelector:'.pagination-list',
            init_Style: function(){
                GM_addStyle(`#grid-b .info-bottom-two{flex-grow:1}
                [data-theme=light] .pop-up-tag[name$='${AVINFO_SUFFIX}'] {background-color: rgb(255 255 255 / 90%);}
                [data-theme=dark] .scroll-request span{background:white;}
                [data-theme=dark] #grid-b .box-b a:link {color : inherit;}
                [data-theme=dark] #grid-b  .box-b{background-color:#222;}
                [data-theme=dark] .alert-zdy {color: black;background-color: rgb(255 255 255 / 90%);}
                #myModal #modal-div article.message {margin-bottom: 0}`);
            },
            maxWidth: 150,//javdb允许的最大宽度为150%，其他网站默认最大宽度为100%
            getAvItem: function (elem) {
                var href = elem.find("a")[0].href;
                var src = elem.find("div.cover>img").eq(0).attr("src");
                var title = elem.find("a")[0].title;
                var AVID = elem.find("div.video-title>strong").eq(0).text();
                var date = elem.find("div.meta").eq(0).text();
                var score = elem.find("div.score").html();
                var itemTag = elem.find(".tags.has-addons").html();
                return {AVID,href,src,title,date,itemTag,score};
            }
            //init: function(){ if(location.href.includes("/users/")){ this.widthSelector="div.section";} }
        },
        avmoo: {
            domainReg: /avmoo\./i,
            excludePages: ['/actresses'],
            gridSelector: 'div#waterfall',
            itemSelector: 'div#waterfall div.item',
            widthSelector : '#grid-b',
            pageNext: 'a[name="nextpage"]',
            pageSelector:'.pagination',
            getAvItem: function (elem) {
                var photoDiv = elem.find("div.photo-frame")[0];
                var href = elem.find("a")[0].href;
                var img = $(photoDiv).children("img")[0];
                var src = img.src.replace(/ps.jpg/, "pl.jpg");
                var title = img.title;
                var AVID = elem.find("date").eq(0).text();
                var date = elem.find("date").eq(1).text();
                var itemTag = "";elem.find("div.photo-info .btn").toArray().forEach( x=> itemTag+=x.outerHTML);
                return {AVID,href,src,title,date,itemTag};
            }
        },
        javlibrary: {
            domainReg: /javlibrary\./i,
            gridSelector: 'div.videothumblist',
            itemSelector: 'div.videos div.video',
            widthSelector : '#grid-b',
            pageNext: 'a.page.next',
            pageSelector:'.page_selector',
            getAvItem: function (elem) {
                var href = elem.find("a")[0].href;
                var src = elem.find("img")[0].src;
                if(src.indexOf("pixhost")<0){//排除含有pixhost的src，暂时未发现规律
                    src= src.replace(/ps.jpg/, "pl.jpg");
                }
                var title = elem.find("div.title").eq(0).text();
                var AVID = elem.find("div.id").eq(0).text();
                return {AVID,href,src,title,date: '',itemTag:''};
            },
            init_Style: function(){
                applyJavlibraryMenuTopStyle();
                GM_addStyle(`#grid-b div{box-sizing: border-box;}`);
            },
        }
    };

// @@creamu-part:60-legacy-ui
    /** 用于屏蔽老司机脚本的代码*/
    function oldDriverBlock(){
        if(['javbus','avmoo'].includes(currentWeb)){ //屏蔽老司机脚本,改写id
            if ($('.masonry').length > 0) {
                $('.masonry').removeClass("masonry");
            }
            let $waterfall = $('#waterfall');
            if($waterfall.length){
                $waterfall.get(0).id = "waterfall-destroy";
            }
            if($waterfall.find("#waterfall").length){ //javbus首页有2个'waterfall' ID
                $waterfall.find("#waterfall").get(0).id = "";
            }
            //解决 JAV老司机 $pages[0].parentElement.parentElement.id = "waterfall_h";
            //女优作品界面此代码会把id设置到class=row层
            if ($('#waterfall_h.row').length > 0) {
                $('#waterfall_h.row').removeAttr("id");
            }
            let $waterfall_h= $('#waterfall_h');
            if ($waterfall_h.length) {
                $waterfall_h.get(0).id = "waterfall-destroy";
            }
            if(location.pathname.search(/search/) > 0){//解决"改写id后，搜索页面自动跳转到无码页面"的bug
                $('body').append('<div id="waterfall"></div>');
            }
            currentObj.gridSelector = "#waterfall-destroy";
        }
        if(['javlibrary'].includes(currentWeb)){ //屏蔽老司机脚本,改写id
            let $waterfall = $('div.videothumblist');
            if($waterfall.length){
                $waterfall.removeClass("videothumblist");
                $waterfall.find(".videos").removeClass("videos");
                $waterfall.get(0).id = "waterfall-destroy";
            }
            currentObj.gridSelector = "#waterfall-destroy";
        }
    }
    class Page{
         constructor(){
            for (let key in ConstCode) {
                let domainReg = ConstCode[key].domainReg;
                if (domainReg && domainReg.test(location.href)) {
                    currentWeb = key;//首先判断当前是什么网站
                    break;
                }
            }
            currentObj = ConstCode[currentWeb];
            //排除页面的判断
            if (currentObj.excludePages) {
                for (let page of currentObj.excludePages) {
                    if (location.pathname.includes(page)) return;
                }
            }
            //调用初始化方法 未使用  if (currentObj.init) { currentObj.init();}
            //屏蔽竖图模式的页面判断
            if (currentObj.halfImg_block_Pages) {
                for (let blockPage of currentObj.halfImg_block_Pages) {
                    if (location.href.includes(blockPage)) {
                        Status.halfImg_block = true;
                        break;
                    };
                }
            }
            this.render();
         }
         render(){
            let $items = $(currentObj.itemSelector);
            if ($items.length<1) return;
            oldDriverBlock();
            addStyle();
            currentObj.init_Style?.();
            let menu = new SettingMenu();
            //加载图片懒加载插件
            lazyLoad = new LazyLoad({
                callback_loaded: function (img) {
                    applyLoadedCoverStyle(img);
                }
            });
            let gridPanel = new GridPanel($items,lazyLoad);
            myModal = new Popover();//弹出插件
            //加载滚动翻页插件
            if(Status.get("autoPage") && $(currentObj.pageSelector).length ){
                scroller=new ScrollerPlugin(gridPanel.$dom,lazyLoad);
            }
         }
    }
    class GridPanel{
        constructor($items,lazyLoad){
            this.$dom=$(`<div id= 'grid-b'></div>`);
            $(currentObj.gridSelector).hide().eq(0).before(this.$dom);
            let $elems = this.constructor.parseItems($items);
            this.$dom.append($elems);
            lazyLoad.update();
        }
        static parseItems(elems){
            let elemsHtml = "";
            let {imgStyle,getAvItem,toolBar,copyBtn,fullTitle,magnet,magnetTip,downloadTip,pictureTip} = {
                imgStyle: Status.isHalfImg() ? halfImgCSS : fullImgCSS,
                getAvItem: currentObj.getAvItem,
                toolBar: Status.get("toolBar")?'':'hidden-b',
                copyBtn: Status.get("copyBtn")?'':'hidden-b',
                fullTitle: Status.get("fullTitle")?'':'titleNowrap',
                magnet: ['javbus','javdb'].includes(currentWeb)?'':'hidden-b',
                magnetTip : lang.tool_magnetTip,
                downloadTip: lang.tool_downloadTip,
                pictureTip: lang.tool_pictureTip,
            };
            let [hiddenWords,hiddenAvids] = [Status.get("hiddenWord"),Status.get("hiddenAvid")];
            for (let i = 0; i < elems.length; i++) {
                let tag = elems.eq(i);
                let html = "";
                //判断是否为 女优个人资料item
                if (currentWeb!="javdb" && tag.find(".avatar-box").length) {
                    tag.find(".avatar-box").addClass("avatar-box-b").removeClass("avatar-box");
                    html = `<div class='item-b'>${tag.html()}</div>`;
                }else{
                    let AvItem = getAvItem(tag);
                    if (!(hiddenWords.find((v, i) => AvItem.title.includes(v)) || 
                        hiddenAvids.find((v, i) => AvItem.AVID.toUpperCase().startsWith(v.toUpperCase()+"-")|| AvItem.AVID.toUpperCase()==v.toUpperCase() ))) {
                        const releaseDate = String(AvItem.date || '').trim();
                        const releaseDateHtml = releaseDate ? `<span class="avid-date-badge">${releaseDate}</span>` : '';
                        const coverStateClass = isPlaceholderCover(AvItem.src, AvItem.title) ? 'minHeight-96 jlc-placeholder-cover' : 'minHeight-200';
                        html = `<div class="item-b">
                                <div class="box-b">
                                <div class="cover-b">
                                    <a  href="${AvItem.href}" target="_blank"><img style="${imgStyle}" class="lazy ${coverStateClass}"  data-src="${AvItem.src}" ></a>
                                </div>
                                <div class="detail-b">
                                    <a name="av-title" href="${AvItem.href}" target="_blank" title="${AvItem.title}" class="${fullTitle}"><span class="tool-span copy-span ${copyBtn}" name="copy">${copy_Svg}</span> <span>${AvItem.title}</span></a>
                                    <div class="info-bottom">
                                      <div class="info-bottom-one">
                                          <a class="avid-link-b" href="${AvItem.href}" target="_blank"><span class="avid-line-b"><span class="tool-span copy-span ${copyBtn}"  name="copy">${copy_Svg}</span><date name="avid">${AvItem.AVID}</date></span>${releaseDateHtml}</a>
                                      </div>
                                      ${AvItem.score?`<a  href="${AvItem.href}" target="_blank"><div class="score">${AvItem.score}</div></a>`:``}
                                      <div class="info-bottom-two">
                                        <div class="item-tag">${AvItem.itemTag}</div>
                                        <div class="toolbar-b ${toolBar}" item-id="${AvItem.AVID}${Math.random().toString(16).slice(2)}"  >
                                        <span name="magnet" class="tool-span  ${magnet}" title="${magnetTip}" AVID="${AvItem.AVID}" data-href="${AvItem.href}">${magnet_Svg}</span>
                                        <span name="download" class="tool-span" title="${downloadTip}" src="${AvItem.src}" src-title="${AvItem.AVID} ${AvItem.title}">${download_Svg}</span>
                                        <span name="picture" class="tool-span" title="${pictureTip}" AVID="${AvItem.AVID}" >${picture_Svg}</span>
                                       </div>
                                     </div>
                                   </div>
                                </div>
                                </div>
                            </div>`;
                    }
                }
                elemsHtml = elemsHtml + html;
            }
            let $elems = $(elemsHtml);
            $elems.find("span[name]").click(function () {
                let name = $(this).attr("name");
                switch (name) {
                    case "copy":
                        markItemVisitedByItem($(this).closest('.item-b').get(0));
                        GM_setClipboard($(this).next().text());
                        showAlert(lang.copySuccess);
                        return false;
                    case "download":
                        let [url,name] = [$(this).attr("src"),$(this).attr("src-title")+".jpg"];
                        downloadImg(url,name,this);break;
                    case "magnet":showMagnetTable($(this).parent("div").attr("item-id"),$(this).attr("AVID").replace(/\./g, '-'),$(this).attr("data-href"),this);break;
                    case "picture":showBigImg($(this).parent("div").attr("item-id"),$(this).attr("AVID"),this);break;
                    default:break;
                }
            });
            return $elems;
        }
    }
    class ScrollerPlugin{
        constructor(waterfall,lazyLoad){
            let me=this;
            me.waterfall=waterfall;
            me.lazyLoad=lazyLoad;
            let $pageNext=$(currentObj.pageNext);
            me.nextURL = $pageNext.attr('href');
            me.scroller_status=$(`<div class = "scroller-status"  style="text-align:center;display:none"><div class="scroll-request"><span></span><span></span><span></span><span></span></div><h2 class="scroll-last">${lang.scrollerPlugin_end}</h2></div>`);
            me.waterfall.after(me.scroller_status);
            me.locked=false;
            me.canLoad=true;
            me.$page=$(currentObj.pageSelector);
            me.domWatch_func=me.domWatch.bind(me);
            document.addEventListener('scroll',me.domWatch_func);
            if (history.scrollRestoration) {
               history.scrollRestoration = 'manual';//防止自动恢复页面位置
            }
        }
        domWatch (){
            let me = this;
            if (me.$page.get(0).getBoundingClientRect().top - $(window).height() < 300 && (!me.locked) && (me.canLoad)) {
                me.locked=true;
                me.loadNextPage(me.nextURL).then(()=>{me.locked=false});
            }
        }
        async loadNextPage(url){
            this.showStatus('request');
            let responseText = await fetch(url, { credentials: 'same-origin' }).then(respond=>respond.text());
            let $body = $(new DOMParser().parseFromString(responseText, 'text/html'));
            let elems = GridPanel.parseItems($body.find(currentObj.itemSelector));
            if (currentWeb != "javdb" && location.pathname.includes('/star/') && elems) {
                elems=elems.slice(1);
            }
            const appendedItems = collectCommanderItems(elems);
            this.scroller_status.hide();
            this.waterfall.append(elems);
            this.lazyLoad.update();
            if (typeof runCommanderScanner === 'function') {
                if (appendedItems.length) {
                    runCommanderScanner(appendedItems, true);
                    window.setTimeout(() => runCommanderScanner(appendedItems, true), 120);
                    window.setTimeout(() => runCommanderScanner(appendedItems, true), 700);
                } else {
                    runCommanderScanner(this.waterfall?.get?.(0) || this.waterfall?.[0] || document, true);
                }
            }
            //history.pushState({}, "", url);
            this.nextURL = $body.find(currentObj.pageNext).attr('href');
            if(!this.nextURL){
                this.canLoad=false;
                this.showStatus("last");
            }
        }
        showStatus(status){
            this.scroller_status.children().each( (i,e)=>{$(e).hide()});
            this.scroller_status.find(`.scroll-${status}`).show();
            this.scroller_status.show();
        }
        destroy (){
            this.scroller_status.remove();
            document.removeEventListener('scroll',this.domWatch_func);
        }
    }

    const addStyle = () => {
        let columnNum = Status.getColumnNum();
        let waterfallWidth=Status.get("waterfallWidth");
        let css_waterfall = `
${currentObj.widthSelector}{width:${waterfallWidth}%;margin:0 ${waterfallWidth>100?(100-waterfallWidth)/2+'%':'auto'};transition:.5s ;}
#grid-b{display:flex;flex-direction:row;flex-wrap:wrap;}
#grid-b .item-b{padding:5px;width:${100 / columnNum}%;transition:.5s ;animation: fadeInUp .5s ease-out;}
#grid-b .box-b{border-radius:5px;background-color:white;border:1px solid rgba(0,0,0,0.2);box-shadow:0 2px 3px 0 rgba(0,0,0,0.1);overflow:hidden}
#grid-b .box-b a:link{color:black}
#grid-b .box-b a:visited{color:gray}
#grid-b .box-b .cover-b{text-align:center}
#grid-b .box-b .detail-b{padding:7px}
#grid-b .box-b .detail-b a{display:block}
#grid-b .info-bottom,.info-bottom-two{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap}
#grid-b .avatar-box-b{display:flex;flex-direction:column;background-color:white;border-radius:5px;align-items:center;border:1px solid rgba(0,0,0,0.2)}
#grid-b .avatar-box-b p{margin:0 !important}
#grid-b date:first-of-type{font-size:18px !important}
#grid-b .toolbar-b{float:right;padding:2px;white-space:nowrap}
#grid-b .toolbar-b span{margin-right:2px}
#grid-b .copy-span{vertical-align:middle;display:inline-block}
#grid-b span.tool-span{cursor:pointer;opacity:.3}
#grid-b span.tool-span:hover{opacity:1}
#grid-b .item-tag{display:inline-block;white-space:nowrap}
#grid-b .hidden-b{display:none}
#grid-b .minHeight-200{min-height:200px}
#grid-b .cover-b img:not([src]) {visibility: hidden;}
svg.tool-svg{fill:currentColor;width:22px;height:22px;vertical-align:middle}
span.span-loading{display:inline-block;animation:span-loading 2s infinite}

#myModal{overflow-x:hidden;overflow-y:auto;display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:1050;background-color:rgba(0,0,0,0.5)}
#myModal #modal-div{position:relative;width:80%;margin:0 auto;background-color:rgb(6 6 6 / 50%);border-radius:8px;animation:fadeInDown .5s}
#modal-div .pop-up-tag{border-radius:8px;overflow:hidden}
#modal-div .sample-box-zdy,.avatar-box-zdy{display:inline-block;border-radius:8px;background-color:#fff;overflow:hidden;margin:5px;width:140px}
#modal-div .sample-box-zdy .photo-frame{overflow:hidden;margin:10px}
#modal-div .sample-box-zdy img{height:90px}
#modal-div .avatar-box-zdy .photo-frame{overflow:hidden;height:120px;margin:10px}
#modal-div .avatar-box-zdy img{height:120px}
#modal-div .avatar-box-zdy span{font-weight:bold;text-align:center;word-wrap:break-word;display:flex;justify-content:center;align-items:center;padding:5px;line-height:22px;color:#333;background-color:#fafafa;border-top:1px solid #f2f2f2}

#menu-div{white-space:nowrap;background-color:white;color:black;display:none;min-width:200px;border-radius:5px;padding:10px;box-shadow:0 10px 20px 0 rgb(0 0 0 / 50%)}
#menu-div>div:hover{background-color:gainsboro}
#menu-div .switch-div{display:flex;align-items:center;font-size:large;font-weight:bold}
#menu-div .switch-div *{margin:0;padding:4px}
#menu-div .switch-div label{flex-grow:1}
#menu-div .range-div{display:flex;flex-direction:row;flex-wrap:nowrap}
#menu-div .range-div input{cursor:pointer;width:80%;max-width:200px}
.alert-zdy{position:fixed;top:50%;left:50%;padding:12px 20px;font-size:20px;color:white;background-color:rgb(0,0,0,.75);border-radius:4px;animation:itemShow .3s;z-index:1051}
.titleNowrap{white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
.download-icon{position:absolute;right:0;z-index:2;cursor:pointer}
.download-icon>svg{width:30px;height:30px;fill:aliceblue}
@keyframes fadeInUp{0%{transform:translate3d(0,10%,0);opacity:.5}100%{transform:none;opacity:1}}
@keyframes fadeInDown{0%{transform:translate3d(0,-100%,0);opacity:0}100%{transform:none;opacity:1}}
@keyframes itemShow{0%{transform:scale(0)}100%{transform:scale(1)}}
@keyframes span-loading{0%{transform:scale(1);opacity:1}50%{transform:scale(1.2);opacity:1}100%{transform:scale(1);opacity:1}}
.scroll-request{text-align:center;height:15px;margin:15px auto}
.scroll-request span{display:inline-block;width:15px;height:100%;margin-right:8px;border-radius:50%;background:rgb(16,19,16);animation:scroll-load 1s ease infinite}
@keyframes scroll-load{0%,100%{transform:scale(1)} 50%{transform:scale(0)}}
.scroll-request span:nth-child(2){animation-delay:0.125s}
.scroll-request span:nth-child(3){animation-delay:0.25s}
.scroll-request span:nth-child(4){animation-delay:0.375s}
.imgResult-li{color:rgb(255,255,255,50%);font-size:20px}
.imgResult-li.imgResult-Current{color:white}
.imgResult-loading{animation:changeTextColor 1s  ease-in  infinite}
.imgResult-li:hover{cursor:pointer;color:white}
@keyframes changeTextColor{0%{color:rgba(255,255,255,1)}50%{color:rgba(255,255,255,.5)}100%{color:rgba(255,255,255,1)}}`;
        GM_addStyle(css_waterfall);
    }

    class DownloadPanel{
        constructor(){
            this.addPanel();
        }
        async loadJS(){
            let me =this;
            const urlList = [['https://unpkg.com/jszip@3.6.0/dist/jszip.min.js','https://unpkg.com/file-saver@2.0.5/dist/FileSaver.min.js'],
                            ['https://cdn.jsdelivr.net/npm/jszip@3.6.0/dist/jszip.min.js','https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js'],
                            ['https://cdnjs.cloudflare.com/ajax/libs/jszip/3.6.0/jszip.min.js','https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js']];
            const getJSFile = url => {
                console.log(url);
                return getRequest(url,{timeout: 10000,responseType: 'text'})
            }
            let index = GM_getValue('downloadPanel_url',0);
            for (let k = 0; k < urlList.length; k++) {
                const values = await Promise.all([getJSFile(urlList[index][0]), getJSFile(urlList[index][1])])
                                     .catch(reason => {console.log(reason); return false});
                if(values) {
                    values.forEach(v=> eval(v.responseText));
                    me.element.find("button[name=download]").attr("disabled",false);
                    GM_setValue('downloadPanel_url',index);
                    break;
                }else{
                    index++;
                    if(index>=urlList.length){ index = urlList.length-index; }
                    continue;
                }
            }
        }
        addPanel(){
            let me=this;
            GM_addStyle(`#downloadPanel{margin:5px;}#downloadPanel button[name="download"]{height:38px;border:1px solid #ce9c9c;padding:0 9px;border-radius:4px;font-size:20px;}#downloadPanel input{height:30px;padding:4px;border-radius:4px;border:1px solid #ce9c9c;font-size:20px;}#downloadPanel input:focus{outline:0px;}#downloadPanel button[disabled]{color:#0006;cursor:not-allowed !important}.downloadform{font-size:20px;display:flex;height:40px;align-items:center;}#file-Info div[name=filename]{width:70%;display:inline-block;text-align:right}#file-Info div[name=state]{width:30%;display:inline}`)
            me.element = $(`<div  id="downloadPanel">
                          <div class="downloadform">
                            <button name="download"  disabled="true">下载</button>
                            <span style="margin-left:10px;">番号: </span><input  placeholder="ssni,abp" autocomplete="off" name="key"></input>
                            <span style="display:none">线程数</span><input style="display:none" name="poolLimit" value="3"></input>
                            <span class="progress-Info" style="margin-left:10px;">
                                <span name="sum"></span><span name="total"></span><span name="msg"></span>
                            </span>
                          </div>
                          <div id="file-Info"></div>
                       </div>`);
            me.loadJS();
            me.element.find("button[name=download]").on("click", function () {
                let button = this;
                button.disabled= true;
                me.resetInfo();
                let arrayList = me.getResultList();
                if(arrayList.length){
                    me.element.find("span[name=total]").text(arrayList.length);
                    let poolLimit = me.element.find("input[name=poolLimit]").val();
                    me.downloadZip(poolLimit?poolLimit:5,arrayList).then(()=>(button.disabled=false));
                }else{
                    me.element.find("span[name=msg]").text("无过滤结果");button.disabled=false;
                }
            });
        }
        getResultList(){
            let list =[];
            let key = this.element.find("input[name=key]").val().toUpperCase();
            let keyArray = key.replace("，",",").split(",").filter(k=> k && k.trim());
            $("div.box-b").each(function () {
                let avid = $(this).find("date[name=avid]").text();
                if(keyArray.length && (! keyArray.find(k=> avid.toUpperCase().indexOf(k)>-1)) ){
                    return ;
                }
                let url = $(this).find("img.lazy").attr("data-src");
                let title = $(this).find("a[name='av-title']").attr("title");
                let filename = `${avid} ${title.replace(/\//g,'_')}.jpg`;//标题中含有斜杠时，压缩包创建文件夹
                list.push({avid:avid,url:url,filename:filename});
            });
            return list;
        }
        downloadZip(poolLimit,arrayList){
            let me=this;
            let sum = 0;
            let zip = new JSZip();
            return me.asyncPool(poolLimit,arrayList,function(item,array){
                let $state=me.addFileInfo(item.avid);
                return me.getImgResource(item.url).then(r =>{
                    if (r.status == '200') {
                        zip.file(item.filename, r.response);
                        $state.text(`✔`);
                        me.element.find(`span[name="sum"]`).text(`${++sum}/`);
                    } else {
                        $state.text(`❎`);
                    }
                }).catch(err =>$state.text(`❎`));
            }).then(() => zip.generateAsync({type:"blob"}).then(blob => saveAs(blob, "download.zip") ))
        }
        getImgResource(url){
            return getRequest(url,{responseType: 'blob',headers : {Referer : url}})
        }
        //https://blog.csdn.net/ghostlpx/article/details/106431837
        async asyncPool(poolLimit, array, iteratorFn) {
            const ret = []
            const executing = []
            for (const item of array) {
                const p = Promise.resolve().then(() => iteratorFn(item, array));
                ret.push(p)
                const e = p.then(() => executing.splice(executing.indexOf(e), 1))
                executing.push(e)
                if (executing.length >= poolLimit) {
                    await Promise.race(executing)
                }
            }
            return Promise.all(ret)
        }
        addFileInfo(avid){
            let $fileInfo=$(`<div style="width:50%;display:inline-block;float:left;"><div name="filename">${avid}:</div><div name="state">--></div></div>`);
            this.element.find("#file-Info").append($fileInfo);
            return $fileInfo.find("div[name=state]");
        }
        resetInfo(){
            this.element.find("span.progress-Info span").text("");
            this.element.find("#file-Info").empty();
        }
    }

    class InputTagPanel{
        constructor(key, placeholder) {
            let me = this;
            me.key = key;
            me.data = Status.get(key) || [];
            me.$panel = $(`<div class="input-tag-panel" name="${key}"></div>`);
            me.$input = $(`<input type="text" autocomplete="off" value="" placeholder="${placeholder}">`);
            me.$panel.append(me.$input);
            me.data.forEach(function(value, index, array) {
                me.$panel.append(`<div class="tag-div"><span>${value}</span><a href="#">X</a></div>`);
            });
            me.$panel.on('click', 'a', function(){
                me.delete($(this));
            });
            me.$input.keyup(function(event) {
                let key = me.$input.val().trim();
                if (key && ((event.keyCode ? event.keyCode : event.which) === 13)) {
                    let keyArray = key.replace("，",",").split(",").filter(k=> k && k.trim());
                    me.add(keyArray);
                }
            });
            GM_addStyle(`.input-tag-panel{display:flex;flex-direction:row;flex-wrap:wrap;margin:5px;align-content:flex-start;align-items:stretch;}.input-tag-panel>div{font-size:25px;height:25px;box-shadow:5px 5px 4px 0 rgb(0 0 0 / 10%);display:flex;line-height:25px;background-color:burlywood;float:left;padding:5px;margin-right:5px;margin-top:5px;border-radius:4px;align-items:center;}.input-tag-panel>div>a{color:white !important;font-size:20px;text-decoration:none;padding:0 5px 0 5px;}.input-tag-panel>div>a:hover{cursor:pointer;color:red;}.input-tag-panel input{width:100%;height:30px;border:solid 1px burlywood;border-radius:5px;padding:5px;font-size:20px;}.input-tag-panel input:focus{outline:none;}`);
        }
        add(keyArray) {
            let me = this;
            let $tag = [];
            keyArray.forEach(key=>{
                $tag.push(`<div class="tag-div"><span>${key}</span><a>X</a></div>`);
                me.data.push(key);
            })
            me.$panel.append($tag).fadeIn();
            Status.set(me.key, me.data);
        }
        delete($a) {
            let me = this;
            let key = $a.prev('span').text();
            $a.parent('div').fadeOut();
            let index = me.data.findIndex(v => key == v);
            index > -1 && me.data.splice(index, 1);
            Status.set(me.key, me.data);
        }
    }
    
    class TabPanel{
        constructor(){
            let me=this;
            GM_addStyle(`#tabPanel{display:none;width:600px;height:400px;background-color:white;border-radius:5px;position:fixed;right:15px;bottom:5px;color:black;text-align:center;border:1px solid #ccc;box-shadow:5px 5px 4px 0 rgb(0 0 0 / 10%);z-index:1000}#tabPanel *{box-sizing:content-box;}#tabPanel ul{padding:0;margin:0;}.tab_list{height:40px;background-color:#facbcb;}.tab_list ul li{list-style:none;float:left;height:40px;padding:0 20px;font-size:20px;border-radius:5px 5px 0 0;text-align:center;line-height:40px;cursor:pointer;}.tab_list .tab_current{background-color:white;}.tab_content{height:355px;}.tab_content_item{overflow-y:auto;display:none;width:100%;height:100%;background-color:white;}.tab_content_item::-webkit-scrollbar{width:7px}.tab_content_item::-webkit-scrollbar-track{border-radius:8px;background-color:#f5f5f5}.tab_content_item::-webkit-scrollbar-thumb{border-radius:8px;background-color:#c8c8c8}.close-div{position:absolute;right:0px;width:40px;height:40px;font-size:40px;line-height:30px;cursor:pointer;color:gray;transform:rotate(45deg);}.close-div:hover{color:black;}`)
            me.element = $(`<div id="tabPanel">
                                <div class="tab_list">
                                    <ul><li>批量下载</li><li>屏蔽词</li></ul>
                                    <div class="close-div">+</div>
                                </div>
                                <div class="tab_content">
                                    <div class="tab_content_item"></div>
                                    <div class="tab_content_item"></div>
                                </div>   
                            </div>`);
            me.$li = me.element.find(".tab_list ul>li");
            me.$item = me.element.find(".tab_content_item");
            me.$li.on("click", function () {
                me.show(me.$li.index(this));
            });
            me.element.find(".close-div").on("click", function () {
                me.element.toggle();
            });
            $('body').append(me.element);
        }
        show(index=0){
            let me =this;
            me.$li.each((i,el)=>{$(el).removeClass("tab_current")});
            me.$li.eq(index).addClass("tab_current");
            me.$item.each((i,el)=>{$(el).hide()});
            if(me.$item.eq(index).children().length==0){
                me.addItem(index);
            }
            me.$item.eq(index).show();
            me.element.show();
        }
        addItem(index){
            let me= this;
            switch (index) {
                case 0:
                    let downloadPanel =new DownloadPanel();
                    me.$item.eq(index).append(downloadPanel.element);
                    break;
                case 1:
                    let tag1 =new InputTagPanel("hiddenWord","标题：支持逗号隔开");
                    let tag2 =new InputTagPanel("hiddenAvid",`番号：支持逗号隔开,单个或系列如SSIS,OPX-123`);
                    me.$item.eq(index).append(tag1.$panel).append(tag2.$panel);
                    break;
            }
        }
        static getInstance(){
            if(!this.instance){
                this.instance = new TabPanel();
            }
            return this.instance;
        }
    }    
    startIntegratedApp();
})();


