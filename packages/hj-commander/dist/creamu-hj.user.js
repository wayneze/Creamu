// ==UserScript==
// @name         Creamu · HJ
// @name:zh-CN   Creamu · HJ
// @namespace    https://github.com/wayneze/Creamu
// @version      0.2.3
// @description  Creamu：海角桌面与手机阅读界面、帖子媒体解析、搜索记忆与排序增强
// @author       wayneze
// @match        *://*.haijiao.com/*
// @match        *://haijiao.com/*
// @match        *://*.haijiao2.com/*
// @match        *://haijiao2.com/*
// @noframes
// @require      https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js
// @require      https://cdn.jsdelivr.net/npm/artplayer@5/dist/artplayer.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @connect      *

// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';
// 10-core.js

function initCreamuHjCore() {
  return {
    version: '0.1.46',
    log(...args) {
      console.log('[Creamu · HJ]', ...args);
    }
  };
}
// 20-sites.js

function isHjSite() {
  const host = String(location.hostname || '').toLowerCase();
  return /(^|\.)haijiao[^.]*\.com$/.test(host);
}

function currentHjPostId(href = location.href) {
  const match = String(href || '').match(/(?:[?&#](?:pid|topicId)=|\/(?:post|topic)\/)(\d+)/i);
  return match ? match[1] : '';
}

function isHjPostDetail() { return !!currentHjPostId(); }
// 25-theme.js

function applyCreamuHjTheme() {
  document.documentElement.classList.add('creamu-hj');
  const css = `
    html.creamu-hj {
      --hj-bg: #eaece8; --hj-surface: #f7f7f2; --hj-inset: #e8ece6;
      --hj-ink: #303b35; --hj-muted: #68776e; --hj-line: #d6ddd4;
      --hj-accent: #356452; --hj-soft: #dfe9e0; --hj-danger: #925b51;
      color-scheme: light; -webkit-text-size-adjust: 100%; text-size-adjust: 100%;
      background: var(--hj-bg);
    }
    html.creamu-hj body, html.creamu-hj #app { background: var(--hj-bg) !important; color: var(--hj-ink); }
    html.creamu-hj body { margin: 0; font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; }
    html.creamu-hj :is(#hj-page-view, #details-page, .userinfo, .creamu-hj-media) { box-sizing: border-box; }
    html.creamu-hj :is(.hjbox-linkcolor, .hjbox-linkline) { color: var(--hj-accent) !important; }
    html.creamu-hj :is(a,button,input,select,summary):focus-visible { outline: 2px solid var(--hj-accent); outline-offset: 3px; }

    /* 桌面论坛与手机页面共用颜色，布局只作用于已识别的站点容器。 */
    html.creamu-hj #hj-toolbar { background: var(--hj-surface); border-bottom: 1px solid var(--hj-line); }
    html.creamu-hj #toolbar-container { width: min(1360px, calc(100% - 48px)) !important; height: 56px; min-height: 56px; gap: 24px; }
    html.creamu-hj #hj-page-view { width: min(1360px, calc(100% - 48px)) !important; margin: 0 auto; display: grid; grid-template-columns: 160px minmax(0, 1fr); gap: 24px; padding-top: 28px; align-items: start; }
    html.creamu-hj #hj-nav-second { float: none !important; width: auto !important; min-width: 0; position: sticky !important; top: 76px; align-self: start; }
    html.creamu-hj .hj-nav-second { width: auto !important; background: transparent !important; color: var(--hj-muted); border: 0 !important; }
    html.creamu-hj .nav.ssr_left_nav { background: transparent; color: var(--hj-muted); }
    html.creamu-hj #hj-nav-second .menu-link.visible > span { color: var(--hj-accent); font-weight: 600; }
    html.creamu-hj #hj-nav-second .nav_bottom-title span { color: var(--hj-accent); }
    html.creamu-hj #hj-nav-second :is(.child_link,.nav_child_box) { color: var(--hj-ink); }
    html.creamu-hj #hj-nav-second .nav_child_box { border-color: var(--hj-line); }
    html.creamu-hj #hj-nav-second .line { background: var(--hj-line); }
    html.creamu-hj #hj-nav-second a { display: block; padding: 8px 10px; color: var(--hj-ink) !important; border-radius: 5px; }
    html.creamu-hj .hj-nav-second a:hover { background: var(--hj-soft); }
    html.creamu-hj [id^="hj-main-content"] { float: none !important; width: auto !important; min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) 224px; gap: 24px; align-items: start; }
    html.creamu-hj [id^="hj-main-content"] > main { float: none !important; width: auto !important; min-width: 0; margin: 0 !important; }
    html.creamu-hj #hj-right-aside { width: auto !important; min-width: 0; float: none !important; color: var(--hj-muted); position: sticky; top: 76px; max-height: calc(100dvh - 96px); overflow-y: auto; scrollbar-width: thin; }
    html.creamu-hj #hj-right-aside .rightHome { width: 100%; }
    html.creamu-hj #hj-right-aside h2 { font-size: 15px; color: var(--hj-ink); }
    html.creamu-hj :is(.home-news-content, .userinfo) { min-width: 0; }
    html.creamu-hj .home-news-content { padding-top: 12px; }
    html.creamu-hj .infoFlowNav { width: 100%; overflow-x: auto; border-top: 0; border-bottom: 1px solid var(--hj-line); border-radius: 0; }
    html.creamu-hj .infoFlowNav .title { height: 36px; line-height: 36px; font-size: 13px; white-space: nowrap; padding: 0 12px; background: transparent; transition: none; }
    html.creamu-hj .infoFlowNav .title.active { background: var(--hj-soft); color: var(--hj-accent) !important; }
    html.creamu-hj .loginChange :is(.login,.register) { width: auto; min-width: 38px; min-height: 28px; padding: 3px 8px; white-space: nowrap; line-height: 20px; background: var(--hj-soft); color: var(--hj-accent); border: 1px solid var(--hj-line); }
    html.creamu-hj .loginChange .register a { color: inherit; }
    html.creamu-hj :is(.listContainer, .home-news-content > .list) {
      box-sizing: border-box; width: auto !important; min-width: 0; margin: 0 0 12px !important;
      padding: 16px !important; background: var(--hj-surface) !important; color: var(--hj-ink);
      border: 1px solid var(--hj-line) !important; border-radius: 9px !important; box-shadow: none !important;
    }
    html.creamu-hj .home-news-content .list h4 { margin: 0 0 12px; font-size: 17px; line-height: 1.5; font-weight: 600; color: var(--hj-ink) !important; }
    html.creamu-hj .home-news-content .list p { color: var(--hj-muted); min-width: 0; }
    html.creamu-hj .home-news-content :is(.morePic,.twoPic) { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; }
    html.creamu-hj .home-news-content :is(.morePic,.twoPic) img { width: 100% !important; height: auto !important; aspect-ratio: 16/10; max-height: 168px; object-fit: cover; margin: 0 !important; border-radius: 5px; }
    html.creamu-hj .home-news-content .onePic { display: flex; align-items: flex-start; gap: 16px; }
    html.creamu-hj .home-news-content .onePic img { width: 38% !important; max-width: 220px; height: 144px !important; border-radius: 6px; margin: 0 !important; object-fit: cover; }
    html.creamu-hj .home-news-content .list > .d-flex { flex-wrap: wrap; gap: 6px 12px; font-size: 11px; }
    html.creamu-hj .home-news-content .list > .d-flex > div { min-width: 0; }
    html.creamu-hj .home-news-content .onePic > p { flex: 1; margin: 0; line-height: 1.7; }
    html.creamu-hj .home-news-content .onePic h4 { font-size: 14px; font-weight: 400; color: var(--hj-muted); }
    html.creamu-hj .home-news-content .list > .d-flex { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--hj-line); color: var(--hj-muted); }
    html.creamu-hj .home-news-content .list h4 :is(a,span) { color: var(--hj-ink) !important; }
    html.creamu-hj .infoFlowNav { display: flex; background: transparent; }
    html.creamu-hj .infoFlowNav .title { flex: 1 0 auto; text-align: center; border: 0; border-bottom: 2px solid transparent; }
    html.creamu-hj .infoFlowNav .title.active { background: transparent; border-color: var(--hj-accent); font-weight: 600; }
    html.creamu-hj #hj-toolbar .hj-logo { width: 106px; flex: 0 0 106px; }
    html.creamu-hj #hj-toolbar .hj-search { flex: 1; justify-content: center; }
    html.creamu-hj #hj-toolbar .hj-input { width: min(420px, 40vw) !important; }
    html.creamu-hj #hj-toolbar .navigation_text { color: var(--hj-muted) !important; font-size: 13px; }
    html.creamu-hj #hj-toolbar .navigation_text.current { color: var(--hj-accent) !important; }
    html.creamu-hj #hj-toolbar .navigation_text.current::after { background: var(--hj-accent); }
    html.creamu-hj #hj-nav-second .nav.ssr_left_nav { width: 100%; height: auto; max-height: calc(100dvh - 96px); overflow-y: auto; scrollbar-width: thin; }
    html.creamu-hj #hj-nav-second .menu-ul { padding: 0; }
    html.creamu-hj #hj-nav-second .menu-link { display: flex; align-items: center; min-height: 36px; margin: 2px 0; padding: 6px 12px; font-size: 13px; }
    html.creamu-hj #hj-nav-second .menu-link > span:first-child:has(i) { display: none; }
    html.creamu-hj #hj-nav-second .menu-link.visible { background: var(--hj-soft); }
    html.creamu-hj #hj-nav-second .child_link { min-height: 30px; line-height: 30px; font-size: 12px; padding-left: 12px; }
    html.creamu-hj #hj-nav-second .line { height: 1px; margin: 14px 0; }
    html.creamu-hj #hj-nav-second .nav_bottom-title { text-align: left; padding: 4px 12px; font-size: 11px; }
    html.creamu-hj #hj-right-aside .rightHome > div:not(.__hj_gap) { padding: 16px !important; border: 1px solid var(--hj-line); border-radius: 8px; background: var(--hj-surface); }
    html.creamu-hj #hj-right-aside .__hj-tabs { display: flex; margin: 14px 0 10px; gap: 3px; }
    html.creamu-hj #hj-right-aside .__hj-tabs .tab { flex: 1; padding: 5px 0; border: 0 !important; border-radius: 4px; font-size: 11px; white-space: nowrap; background: var(--hj-inset) !important; color: var(--hj-muted) !important; }
    html.creamu-hj #hj-right-aside .__hj-tabs .tab.active { background: var(--hj-soft) !important; color: var(--hj-accent) !important; }
    html.creamu-hj #hj-right-aside .navigation2 { display: flex; gap: 8px; padding: 0; }
    html.creamu-hj #hj-right-aside .navigation2 .item { flex: 1; white-space: nowrap; font-size: 11px; }
    html.creamu-hj #hj-right-aside .navigation2 .activation { color: var(--hj-accent) !important; border-color: var(--hj-accent) !important; }
    html.creamu-hj #hj-right-aside .hall_fame_list { gap: 8px; padding: 12px 0; border-bottom: 1px solid var(--hj-line); }
    html.creamu-hj #hj-right-aside .hall_info { min-width: 0; }
    html.creamu-hj #hj-right-aside .fame_nickName { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
    #creamu-hj-startup { box-sizing: border-box; width: min(400px, calc(100% - 40px)); margin: 18vh auto; padding: 24px; border: 1px solid var(--hj-line); border-radius: 10px; background: var(--hj-surface); color: var(--hj-ink); font: 14px/1.7 sans-serif; }
    #creamu-hj-startup strong { font-size: 18px; }
    #creamu-hj-startup p { color: var(--hj-muted); }
    #creamu-hj-startup [hidden] { display: none; }

    /* 手机版是独立的 Vant 应用，保留它的分页、滑动和滚动容器。 */
    html.creamu-hj .mobile { color: var(--hj-ink); background: var(--hj-bg); }
    html.creamu-hj .mobile .mheader { height: auto; min-height: 52px; background: var(--hj-surface); border-bottom: 1px solid var(--hj-line); }
    html.creamu-hj .mobile .mheader > div:first-child { display: flex; align-items: center; position: relative; height: auto; background: var(--hj-surface); gap: 8px; padding: 8px 12px; }
    html.creamu-hj .mobile .mheader-logo { flex: 0 0 66px; width: 66px; margin: 0; position: static; }
    html.creamu-hj .mobile .mheader-logo img { width: 66px; height: auto; max-height: 32px; object-fit: contain; }
    html.creamu-hj .mobile .mheader-seach { flex: 1; min-width: 0; width: auto; margin: 0; position: static; transform: none; }
    html.creamu-hj .mobile .mheader .van-search { padding: 0; background: transparent; }
    html.creamu-hj .mobile .mheader .van-search__content { background: var(--hj-inset); border: 1px solid var(--hj-line); border-radius: 7px; }
    html.creamu-hj .mobile .mheader :is(.send-topic-btn,.download-btn) { display: none; }
    html.creamu-hj .mobile .mheader-user { flex: 0 0 28px; margin: 0; position: static; }
    html.creamu-hj .mobile .index-tab .van-tabs__nav { background: var(--hj-surface); }
    html.creamu-hj .mobile .index-tab .van-tab { font-size: 13px; color: var(--hj-muted); }
    html.creamu-hj .mobile .index-tab .van-tab--active { color: var(--hj-accent) !important; font-weight: 600; }
    html.creamu-hj .mobile .van-tabs__line { background: var(--hj-accent) !important; }
    html.creamu-hj .mobile .index-scroll-box { background: var(--hj-bg); }
    html.creamu-hj .mobile .list-item { box-sizing: border-box; margin: 10px 12px; padding: 14px 12px; background: var(--hj-surface); border: 1px solid var(--hj-line); border-radius: 8px; }
    html.creamu-hj .mobile .list-item .text-box { width: 100%; padding: 0; }
    html.creamu-hj .mobile .list-item .t-title { margin: 0 0 8px; color: var(--hj-ink); font-size: 15px; line-height: 1.55; font-weight: 600; }
    html.creamu-hj .mobile .list-item .t-content { color: var(--hj-muted); font-size: 12px; line-height: 1.65; }
    html.creamu-hj .mobile .list-item .t-img { display: flex; gap: 5px; margin-top: 8px; }
    html.creamu-hj .mobile .list-item .t-img img { flex: 1; width: 0; min-width: 0; max-width: 100%; height: 88px; object-fit: cover; border-radius: 4px; margin: 0; }
    html.creamu-hj .mobile .list-item .t-userinfo { margin-top: 10px; color: var(--hj-muted); font-size: 10px; gap: 6px; flex-wrap: wrap; }
    html.creamu-hj .mobile .list-item .nodename { color: var(--hj-accent); }
    html.creamu-hj .mobile .btnbox { display: none !important; }
    html.creamu-hj :is(.topbanmer,.custom_carousel):has(img[data-id^="banner_"]) { display: none !important; }


    html.creamu-hj #details-page { width: min(1040px, calc(100% - 32px)) !important; margin: 0 auto !important; padding: 20px 0; }
    html.creamu-hj #details-page > .header { padding: 18px 0; background: transparent; }
    html.creamu-hj #details-page :is(h1,h2) { font-size: clamp(20px, 2.5vw, 28px); line-height: 1.45; color: var(--hj-ink); }
    html.creamu-hj :is(.post-details,.post-content,.topic-content,.detail-content,#details-page .floor-show) {
      box-sizing: border-box; min-width: 0; max-width: 100%; background: var(--hj-surface) !important;
      color: var(--hj-ink); border: 1px solid var(--hj-line); border-radius: 9px; padding: 18px; margin: 12px 0;
    }
    html.creamu-hj :is(.post-content,.topic-content,.detail-content,#details-page .article,#details-page .article-content) { font-size: 15px; line-height: 1.85; overflow-wrap: anywhere; }
    html.creamu-hj :is(.post-content,.topic-content,.detail-content,#details-page .article,#details-page .article-content) :is(img,video,iframe) { max-width: 100%; }
    html.creamu-hj :is(.post-content,.topic-content,.detail-content,#details-page .article) img { height: auto; }
    html.creamu-hj #details-page :is(.article-handle,.menu) { display: flex; flex-wrap: wrap; gap: 6px; }
    html.creamu-hj #details-page .floor_box { min-width: 0; }
    html.creamu-hj #details-page .article { width: auto !important; }
    html.creamu-hj :is(.post-content,.topic-content,#details-page .article) table { display: block; max-width: 100%; overflow-x: auto; }
    html.creamu-hj :is(.post-content,.topic-content,#details-page .article) pre { white-space: pre-wrap; }
    html.creamu-hj :is(.el-dialog,.van-dialog,.el-message-box) { box-sizing: border-box; max-width: calc(100vw - 24px); background: var(--hj-surface); color: var(--hj-ink); border-radius: 12px; }
    html.creamu-hj :is(.el-dialog__body,.van-dialog__content) { max-height: 70dvh; overflow-y: auto; }
    html.creamu-hj :is(.hj-input input,.userinfo input) { background: var(--hj-inset); color: var(--hj-ink); border-color: var(--hj-line); border-radius: 6px; }

    /* 媒体画面保持深色，辅助操作与正文使用同一套轻量控件。 */
    #creamu-hj-inline-slot { display: block; width: 100%; min-width: 0; margin: 16px 0; }
    #creamu-hj-inline-player-box { width: 100%; overflow: hidden; border: 1px solid var(--hj-line); border-radius: 9px; background: var(--hj-surface); color: var(--hj-ink); }
    .creamu-hj-media-head, .creamu-hj-player-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 10px 12px; }
    .creamu-hj-media-head { justify-content: space-between; border-bottom: 1px solid var(--hj-line); font-size: 12px; }
    .creamu-hj-media-head strong { font-weight: 600; }
    .creamu-hj-media-head small { color: var(--hj-muted); }
    .creamu-hj-switcher { display: flex; gap: 6px; max-width: 100%; overflow-x: auto; }
    .creamu-hj-btn { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; min-height: 32px; padding: 5px 9px; border: 1px solid var(--hj-line); border-radius: 6px; background: transparent; color: var(--hj-ink); font: 12px/1.4 'Segoe UI','Microsoft YaHei',sans-serif; white-space: nowrap; cursor: pointer; touch-action: manipulation; }
    .creamu-hj-btn:hover, .creamu-hj-btn[aria-pressed="true"] { background: var(--hj-soft); border-color: var(--hj-accent); color: var(--hj-accent); }
    .creamu-hj-btn:disabled { opacity: .55; cursor: wait; }
    #creamu-hj-art-mount { width: 100%; aspect-ratio: 16/9; background: #151a17; }
    #creamu-hj-art-mount:empty { display: none; }
    #creamu-hj-art-mount > video { width: 100%; height: 100%; display: block; }
    #creamu-hj-play-status { padding: 12px; font-size: 12px; line-height: 1.6; color: var(--hj-muted); }
    #creamu-hj-play-status:empty { display: none; }
    #creamu-hj-debug-details { border-top: 1px solid var(--hj-line); font-size: 11px; color: var(--hj-muted); }
    #creamu-hj-debug-details summary { padding: 9px 12px; cursor: pointer; }
    #creamu-hj-debug { padding: 0 12px; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 180px; overflow-y: auto; }
    #creamu-hj-debug-details button { margin: 0 12px 10px; }
    #creamu-hj-image-box { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; margin-top: 12px; }
    #creamu-hj-image-box img { width: 100%; height: auto; border-radius: 6px; }


    /* 所有页面共用一个随手可用的搜索入口。 */
    #creamu-hj-search-trigger { position: fixed; right: 14px; bottom: calc(78px + env(safe-area-inset-bottom)); z-index: 1200; height: 36px; padding: 6px 12px; background: var(--hj-accent); color: #fff; border-color: var(--hj-accent); box-shadow: 0 3px 14px #243e2830; }
    #creamu-hj-search-dialog { box-sizing: border-box; width: min(480px, calc(100vw - 24px)); max-height: calc(100dvh - 40px); margin: 14vh auto auto; padding: 20px; border: 1px solid var(--hj-line); border-radius: 12px; background: var(--hj-surface); color: var(--hj-ink); box-shadow: 0 14px 60px #20372c30; }
    #creamu-hj-search-dialog::backdrop { background: #1f332c55; }
    .creamu-hj-search-head, .creamu-hj-search-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    #creamu-hj-search-dialog strong { font-size: 18px; }
    #creamu-hj-search-dialog label { display: block; font-size: 12px; color: var(--hj-muted); margin: 18px 0 6px; }
    #creamu-hj-search-query { box-sizing: border-box; width: 100%; min-height: 40px; padding: 8px 10px; background: var(--hj-inset); color: var(--hj-ink); border: 1px solid var(--hj-line); border-radius: 6px; font: 16px/1.5 sans-serif; }
    .creamu-hj-search-actions { margin-top: 12px; }
    .creamu-hj-search-actions select { min-height: 34px; border: 1px solid var(--hj-line); border-radius: 5px; background: var(--hj-surface); color: var(--hj-ink); font-size: 13px; }
    #creamu-hj-post-order { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px 16px; margin: 12px 0; padding: 10px 12px; background: var(--hj-surface); border: 1px solid var(--hj-line); border-radius: 8px; }
    .creamu-hj-order-options, .creamu-hj-order-pages { display: flex; align-items: center; gap: 6px; }
    .creamu-hj-order-pages span { font-size: 11px; color: var(--hj-muted); }
    #creamu-hj-post-order [hidden] { display: none; }
    .main_body.creamu-hj-paged .el-pagination { display: none; }
    .userinfo #creamu-hj-post-order { margin: 10px 12px; }
    html.creamu-hj[data-hj-page="profile"] .hsp_width { box-sizing: border-box; width: min(1120px, calc(100% - 40px)) !important; }
    html.creamu-hj .layout_header { display: flex; align-items: center; flex-wrap: wrap; gap: 18px; height: auto !important; min-height: 160px; margin: 24px auto 0; padding: 24px !important; border: 1px solid var(--hj-line); border-radius: 10px 10px 0 0; background: var(--hj-surface) !important; }
    html.creamu-hj .layout_header .header_avatar { position: static; float: none; margin: 0; }
    html.creamu-hj .layout_header .userInfo { position: static; float: none; min-width: 0; flex: 1; margin: 0; }
    html.creamu-hj .layout_header .nickname { font-size: 22px; color: var(--hj-ink); }
    html.creamu-hj .layout_header .description { line-height: 1.7; color: var(--hj-muted); overflow-wrap: anywhere; }
    html.creamu-hj .layout_header .upperright { position: static; order: 3; width: auto; margin-left: auto; }
    html.creamu-hj .layout_navigation { display: flex; justify-content: space-between; flex-wrap: wrap; height: auto; min-height: 48px; padding: 8px 20px; margin: 0 auto; background: var(--hj-inset); border: 1px solid var(--hj-line); border-top: 0; border-radius: 0 0 10px 10px; }
    html.creamu-hj .layout_navigation :is(.navigation,.show-nums) { float: none; height: auto; display: flex; flex-wrap: wrap; gap: 14px; margin: 0; }
    html.creamu-hj .layout_navigation .navigation-item { margin: 0; color: var(--hj-ink); }
    html.creamu-hj .layout_body { display: grid; grid-template-columns: 156px minmax(0,1fr); gap: 20px; margin: 20px auto; background: transparent !important; border: 0; }
    html.creamu-hj .layout_body .body_navigation { width: auto !important; min-width: 0; float: none; background: transparent; }
    html.creamu-hj .layout_body .main_body { width: auto !important; min-width: 0; float: none; background: transparent; }
    html.creamu-hj .layout_body ._searchBar { width: auto !important; background: var(--hj-surface); border: 1px solid var(--hj-line); border-radius: 8px; }
    html.creamu-hj .layout_body ._searchBar .navigationList { color: var(--hj-ink); }
    html.creamu-hj .layout_body ._searchBar .navigationList.current { background: var(--hj-soft) !important; color: var(--hj-accent) !important; }
    html.creamu-hj .layout_header .upperright :is(button,.el-button,.upperright_btn) { min-height: 30px; padding: 6px 10px; font-size: 12px; background: var(--hj-soft) !important; color: var(--hj-accent) !important; border: 1px solid var(--hj-line); border-radius: 5px; }
    html.creamu-hj .layout_body .listrow { background: var(--hj-surface); border: 1px solid var(--hj-line); border-radius: 8px; margin-bottom: 10px; padding: 16px; }
    html.creamu-hj .layout_body .listrow-contain { display: block; padding: 0; }
    html.creamu-hj .layout_body .listrow-contain > .position-relative { width: 100% !important; display: flex; gap: 16px; }
    html.creamu-hj .layout_body .listrow .attachments { width: 160px; flex: 0 0 160px; height: 106px; margin: 0; }
    html.creamu-hj .layout_body .listrow .attachments img { width: 100%; height: 100%; object-fit: cover; border-radius: 5px; }
    html.creamu-hj .layout_body .listrow .content { min-width: 0; flex: 1; width: auto; padding: 0; background: transparent; }
    html.creamu-hj .layout_body .listrow .titleContent { font-size: 16px; line-height: 1.5; color: var(--hj-ink); }
    html.creamu-hj .layout_body .listrow .liteContent { font-size: 13px; line-height: 1.75; color: var(--hj-muted); }
    html.creamu-hj .layout_body .listrow .introduction { font-size: 11px; flex-wrap: wrap; color: var(--hj-muted); }
    html.creamu-hj[data-hj-page="search"] .infoFlowNav { position: static !important; width: 100% !important; padding: 12px; background: var(--hj-surface); border: 1px solid var(--hj-line); border-radius: 8px; }
    html.creamu-hj[data-hj-page="search"] .infoFlowNav > div { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; }
    html.creamu-hj[data-hj-page="search"] .infoFlowNav :is(input,select,.el-input__inner) { background: var(--hj-inset); color: var(--hj-ink); border-color: var(--hj-line); }
    html.creamu-hj[data-hj-page="search"] .show_list_info { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px; margin-top: 12px; font-size: 11px; color: var(--hj-muted); }
    html.creamu-hj[data-hj-page="search"] :is(.info_left,.info_right) { display: flex; flex-wrap: wrap; gap: 8px; }
    html.creamu-hj[data-hj-page="search"] .tagsShow { display: flex; flex-wrap: wrap; gap: 5px; margin: 8px 0; }
    html.creamu-hj[data-hj-page="search"] .tagsShow span { background: var(--hj-soft); color: var(--hj-accent); border: 0; }
    html.creamu-hj[data-hj-page="search"] .video-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 14px; }
    html.creamu-hj[data-hj-page="search"] .video-card { min-width: 0; border: 1px solid var(--hj-line); border-radius: 8px; background: var(--hj-surface); overflow: hidden; }
    html.creamu-hj[data-hj-page="search"] .thumb-img { width: 100%; aspect-ratio: 16/10; object-fit: cover; }
    html.creamu-hj[data-hj-page="search"] :is(.video-card .title,.video-card .meta) { padding: 8px 10px; color: var(--hj-ink); }
    html.creamu-hj #details-page { max-width: 1040px; background: transparent !important; }
    html.creamu-hj .details-box { background: var(--hj-bg) !important; }
    html.creamu-hj #details-page .header { text-align: left; border-bottom: 1px solid var(--hj-line); }
    html.creamu-hj #details-page .header h2 { margin: 8px 0 16px; text-align: left; }
    html.creamu-hj #details-page .header > .d-flex { justify-content: flex-start !important; flex-wrap: wrap; gap: 8px; }
    html.creamu-hj #details-page :is(.header a,.details-breadcrumb) { color: var(--hj-accent); }
    html.creamu-hj #details-page .el-pagination { display: flex; flex-wrap: wrap; gap: 4px; }
    html.creamu-hj #details-page .el-pagination :is(button,.number) { background: var(--hj-inset); color: var(--hj-ink); border-radius: 4px; }
    html.creamu-hj #details-page .el-pagination .active { background: var(--hj-accent) !important; color: #fff !important; }
    html.creamu-hj #bbs_float_menu { right: 14px !important; left: auto !important; width: 34px; }
    html.creamu-hj #bbs_float_menu .scroll-btn { width: 34px; background: var(--hj-inset); color: var(--hj-accent); border-radius: 6px; }
    html.creamu-hj #details-page .statistics { display: grid; gap: 12px; }
    html.creamu-hj #details-page .atl-info { text-align: left !important; color: var(--hj-muted); font-size: 12px; }
    html.creamu-hj #details-page .floor-show { width: 100%; display: block; background: var(--hj-surface) !important; }
    html.creamu-hj #details-page .floor_box { width: 100% !important; padding: 0; margin: 0; }
    html.creamu-hj #details-page .article { padding: 0; line-height: 1.85; color: var(--hj-ink); }
    html.creamu-hj #details-page .article-handle :is(a,span,button) { font-size: 12px; }
    html.creamu-hj #details-page :is(.atl-reply,.url-box) { background: var(--hj-inset); color: var(--hj-muted); border-color: var(--hj-line); border-radius: 6px; padding: 12px; overflow-wrap: anywhere; }
    html.creamu-hj :is(.mobile .search,.mobile .userinfo,.mobile .details) { background: var(--hj-bg); color: var(--hj-ink); }
    html.creamu-hj .mobile :is(.search .all-header,.userinfo .van-nav-bar) { background: var(--hj-surface); border-bottom: 1px solid var(--hj-line); }
    html.creamu-hj .mobile .search .all-header-center { background: var(--hj-inset); border: 1px solid var(--hj-line); border-radius: 6px; }
    html.creamu-hj .mobile .search .search-content :is(.van-collapse-item__content,.van-collapse-item__content > div,.nav2-list) { box-sizing: border-box; max-width: 100%; }
    html.creamu-hj .mobile .search :is(.van-cell,.van-collapse-item__content,.van-tabs__nav,.van-sticky) { background: var(--hj-surface); color: var(--hj-ink); }
    html.creamu-hj .mobile .search :is(.nav2_box,.nav2-list) { display: flex; flex-wrap: wrap; gap: 7px; padding: 10px 12px; }
    html.creamu-hj .mobile .search :is(.nav2_box,.nav2-list) > * { max-width: 100%; color: var(--hj-ink); background: var(--hj-inset); border-radius: 5px; }
    html.creamu-hj .mobile .search .userlist { margin: 10px 12px; padding: 14px; border: 1px solid var(--hj-line); border-radius: 8px; background: var(--hj-surface); }
    html.creamu-hj .mobile .search .related-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; padding: 12px; }
    html.creamu-hj .mobile .search .related-item { min-width: 0; background: var(--hj-surface); border-radius: 6px; overflow: hidden; }
    html.creamu-hj .mobile .userinfo .top-box { background: var(--hj-surface); padding-bottom: 12px; border-bottom: 1px solid var(--hj-line); }
    html.creamu-hj .mobile .userinfo .top-bg { background: var(--hj-soft) !important; height: 24px; }
    html.creamu-hj .mobile .userinfo .headerUserBox { position: relative; top: auto; display: flex; align-items: flex-start; height: auto; padding: 14px 16px; }
    html.creamu-hj .mobile .userinfo .headerUserBox > div:last-child { flex: 1; min-width: 0; }
    html.creamu-hj .mobile .userinfo .top-btn-box { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    html.creamu-hj .mobile .userinfo .top-btn-box li { box-sizing: border-box; width: auto; min-height: 28px; margin: 0; padding: 4px 7px; border: 1px solid var(--hj-line); border-radius: 5px; background: var(--hj-soft); color: var(--hj-accent); font-size: 11px; line-height: 18px; }
    html.creamu-hj .mobile .userinfo .headerUserBox :is(button,.van-button) { min-height: 28px; height: auto; padding: 4px 7px; font-size: 11px; line-height: 1.5; background: var(--hj-soft); color: var(--hj-accent); border-color: var(--hj-line); }
    html.creamu-hj .mobile .userinfo :is(.headerUserBox,.usertopic) { color: var(--hj-ink); }
    html.creamu-hj .mobile .userinfo .usertopic { padding: 0 16px; background: transparent; }
    html.creamu-hj .mobile .userinfo .des { color: var(--hj-muted); line-height: 1.75; overflow-wrap: anywhere; }
    html.creamu-hj .mobile .userinfo .van-tabs__nav { background: var(--hj-surface); }
    html.creamu-hj .mobile :is(.userinfo,.search) .van-tab { color: var(--hj-muted); font-size: 13px; }
    html.creamu-hj .mobile :is(.userinfo,.search) .van-tab--active { color: var(--hj-accent) !important; }
    html.creamu-hj .mobile .details .pagescroll-box { padding: 0 0 calc(64px + env(safe-area-inset-bottom)); background: var(--hj-bg); }
    html.creamu-hj .mobile .details :is(.title-box,.details-body,.floor-list > li) { box-sizing: border-box; margin: 12px; padding: 14px; background: var(--hj-surface); border: 1px solid var(--hj-line); border-radius: 8px; }
    html.creamu-hj .mobile .details .title-text { font-size: 20px; line-height: 1.5; font-weight: 600; color: var(--hj-ink); }
    html.creamu-hj .mobile .details :is(.html-box,.reset-html-box) { padding: 0; background: transparent; font-size: 15px; line-height: 1.85; overflow-wrap: anywhere; }
    html.creamu-hj .mobile .details .reset-html-box :is(img,video,iframe) { max-width: 100%; }
    html.creamu-hj .mobile .details .html-bottom-box { border-color: var(--hj-line); color: var(--hj-muted); }
    html.creamu-hj .mobile .details .floor-list { padding: 0; background: transparent; }
    html.creamu-hj .mobile .details .commentbox { background: var(--hj-surface); border-top: 1px solid var(--hj-line); color: var(--hj-ink); }
    html.creamu-hj .mobile .details .commentbox > span { background: var(--hj-inset); color: var(--hj-muted); border-radius: 6px; }
    html.creamu-hj .mobile .details .testinput { position: fixed; left: 0; top: 0; width: 1px; height: 1px; padding: 0; border: 0; opacity: 0; pointer-events: none; }
    @media (max-width: 820px) {
      html.creamu-hj[data-hj-page="profile"] .hsp_width { width: calc(100% - 24px) !important; }
      html.creamu-hj .layout_body { display: block; }
      html.creamu-hj .layout_header { padding: 16px !important; min-height: 0; }
      html.creamu-hj .layout_header .upperright { margin: 0; width: 100%; }
      html.creamu-hj .layout_body ._searchBar { margin-bottom: 12px; }
      html.creamu-hj .layout_body .listrow .attachments { flex-basis: 100px; width: 100px; height: 80px; }
      html.creamu-hj .layout_body .listrow { padding: 12px; }
      html.creamu-hj .layout_body .listrow .titleContent { font-size: 14px; }
      html.creamu-hj[data-hj-page="search"] .video-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
      #creamu-hj-search-dialog { margin-top: 10vh; padding: 16px; }
      #creamu-hj-post-order { justify-content: center; }
    }

    #creamu-hj-navigation-toggle { display: none; }
    html.creamu-hj :is(.ad-banner,.pop-vip-notice,[class*="download-app"],img[data-id^="banner_"],.custom_carousel:has(img[data-id^="banner_"]),[class*="advertising"],[class*="Advertis"]) { display: none !important; }
    @media (min-width: 821px) {
      html.creamu-hj .home-news-content { padding-top: 14px; }
      html.creamu-hj .home-news-content .list { padding: 18px 20px !important; margin-bottom: 10px !important; }
      html.creamu-hj .home-news-content :is(.morePic,.twoPic) { max-width: 570px; }
      html.creamu-hj .home-news-content :is(.morePic,.twoPic) img { height: 112px !important; }
      html.creamu-hj .home-news-content .onePic img { max-width: 176px; height: 112px !important; }
      html.creamu-hj .home-news-content .list > .d-flex { font-size: 12px; }
    }
    @media (max-width: 1100px) {
      html.creamu-hj [id^="hj-main-content"] { grid-template-columns: minmax(0,1fr); }
      html.creamu-hj #hj-right-aside { display: none; }
    }
    @media (max-width: 820px) {
      html.creamu-hj #hj-toolbar { position: sticky; top: 0; }
      html.creamu-hj #toolbar-container { width: auto !important; height: auto !important; min-height: 48px; padding: 8px 12px; gap: 8px; flex-wrap: wrap; }
      html.creamu-hj #toolbar-container .hj-search { flex: auto; order: 3; width: 100%; min-width: 0; gap: 8px; }
      html.creamu-hj #hj-toolbar .hj-search :is(.suffix,.navigation_text) { display: none; }
      html.creamu-hj #hj-toolbar .hj-input { width: 100% !important; min-width: 0; }
      html.creamu-hj #app > div:has(#hj-page-view), html.creamu-hj .details-box { margin-top: 0 !important; }
      html.creamu-hj #hj-page-view { width: 100% !important; display: block; padding: 0 12px; }
      #creamu-hj-navigation-toggle { display: inline-flex; margin: 8px 0; background: var(--hj-surface); }
      html.creamu-hj #hj-nav-second { display: none; position: static !important; padding: 8px; margin-bottom: 8px; border: 1px solid var(--hj-line); border-radius: 7px; background: var(--hj-surface); }
      html.creamu-hj #hj-nav-second.creamu-hj-navigation-open { display: block; }
      html.creamu-hj .nav.ssr_left_nav { width: 100%; height: auto; max-height: 45dvh; display: block; overflow: auto; }
      html.creamu-hj :is(.hj-nav-second,.ssr_left_nav) > ul { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 4px; margin: 0; padding: 0; }
      html.creamu-hj .ssr_left_nav .menu-link > span:first-child:has(i) { display: none; }
      html.creamu-hj .hj-nav-second li { flex: none; list-style: none; }
      html.creamu-hj #hj-nav-second a { padding: 6px 9px; font-size: 12px; }
      html.creamu-hj .infoFlowNav .title { flex: none; }
      html.creamu-hj .home-news-content .list { padding: 12px !important; }
      html.creamu-hj .home-news-content .list h4 { font-size: 15px; }
      html.creamu-hj #details-page { width: 100% !important; padding: 12px; }
      html.creamu-hj :is(.post-details,.post-content,.topic-content,.detail-content,#details-page .floor-show) { padding: 12px; }
      html.creamu-hj #details-page .floor-show { display: block; }
      html.creamu-hj #details-page :is(.author,.floor_box) { float: none; width: auto; margin: 0; }
      html.creamu-hj :is(input:not([type="checkbox"]):not([type="radio"]),select,textarea) { font-size: 16px; }
      #creamu-hj-image-box { gap: 6px; }
    }
  `;
  if (typeof GM_addStyle === 'function') GM_addStyle(css);
}

function refreshHjNavigation() {
  const nav = document.getElementById('hj-nav-second');
  if (!nav || document.getElementById('creamu-hj-navigation-toggle')) return;
  const button = document.createElement('button');
  button.id = 'creamu-hj-navigation-toggle';
  button.className = 'creamu-hj-btn';
  button.type = 'button';
  button.textContent = '板块导航 ▾';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', nav.id);
  button.onclick = () => {
    const open = nav.classList.toggle('creamu-hj-navigation-open');
    button.setAttribute('aria-expanded', String(open));
    button.textContent = open ? '收起导航 ▴' : '板块导航 ▾';
  };
  nav.before(button);
}
// 30-media-parser.js

/**
 * 缓存被拦截和提取到的媒体直链信息
 */
if (typeof window !== 'undefined') {
  window.__creamu_hj_media_cache = window.__creamu_hj_media_cache || {
    videos: [],
    images: [],
    rawUrls: new Set()
  };
}

let currentHjSelectedVideoIndex = 0;

function resetHjMediaForPost(identity) {
  const cache = window.__creamu_hj_media_cache;
  if (!cache) return;
  destroyHjPlayer();
  cache.generation = (cache.generation || 0) + 1;
  cache.videos = [];
  if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    cache.images.forEach((url) => {
      if (String(url).startsWith('blob:')) URL.revokeObjectURL(url);
    });
  }
  cache.images = [];
  cache.rawUrls = new Set();
  cache.postIdentity = identity;
  currentHjSelectedVideoIndex = 0;
  const box = typeof document !== 'undefined' ? document.getElementById('creamu-hj-inline-player-box') : null;
  if (box) box.remove();
  document.getElementById('creamu-hj-inline-slot')?.remove();
  const images = typeof document !== 'undefined' ? document.getElementById('creamu-hj-image-box') : null;
  if (images) {
    images.innerHTML = '';
    if (images.dataset) delete images.dataset.images;
  }
  cache.status = '';
  cache.topicRequested = false;
  cache.topicLoading = false;
  cache.imageRequests = new Map();
  window.__creamu_hj_debug = [];
  hjDebug('当前帖子 ' + (identity || '列表'));
}

function hjDebug(line) {
  const log = window.__creamu_hj_debug || (window.__creamu_hj_debug = []);
  log.push(new Date().toLocaleTimeString() + ' ' + line);
  if (log.length > 40) log.shift();
  const box = typeof document !== 'undefined' ? document.getElementById('creamu-hj-debug') : null;
  if (box) box.textContent = log.join('\n');
}

function copyHjDebug() {
  const log = (window.__creamu_hj_debug || []).join('\n');
  const cache = window.__creamu_hj_media_cache || { videos: [] };
  const text = '地址:\n' + (cache.videos.join('\n') || '无') + '\n\n过程:\n' + (log || '无');
  if (typeof GM_setClipboard === 'function') GM_setClipboard(text);
  else if (navigator.clipboard) navigator.clipboard.writeText(text);
}

/** 油猴对二进制的返回不一致：可能是 ArrayBuffer，也可能是 blob，还可能是按 Latin-1 转过的字符串。统一还原成字节。 */
function gmHjBytes(response) {
  return new Promise((resolve) => {
    const data = response && (response.response != null ? response.response : response.responseText);
    if (data == null) {
      resolve(null);
      return;
    }
    if (Object.prototype.toString.call(data) === '[object ArrayBuffer]') {
      resolve(data);
      return;
    }
    if (typeof data.byteLength === 'number' && typeof data.buffer !== 'undefined' && data.buffer !== data) {
      resolve(data.buffer.slice(data.byteOffset || 0, (data.byteOffset || 0) + data.byteLength));
      return;
    }
    if (typeof data.arrayBuffer === 'function') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsArrayBuffer(data);
      return;
    }
    if (typeof data === 'string') {
      const bytes = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i += 1) bytes[i] = data.charCodeAt(i) & 0xff;
      resolve(bytes.buffer);
      return;
    }
    resolve(null);
  });
}

function gmHjRequest(url, responseType, headers, signal) {
  return new Promise((resolve) => {
    if (typeof GM_xmlhttpRequest !== 'function') {
      resolve(null);
      return;
    }
    if (signal?.aborted) { resolve(null); return; }
    const request = GM_xmlhttpRequest({
      method: 'GET',
      url,
      headers: headers || {},
      responseType: responseType || 'text',
      timeout: 20000,
      onload: (response) => {
        hjDebug('请求 ' + (response.status || '?') + ' ' + url.slice(0, 90));
        resolve(response.status && (response.status < 200 || response.status >= 300) ? null : response);
      },
      onabort: () => resolve(null),
      onerror: () => {
        hjDebug('请求失败 ' + url.slice(0, 90));
        resolve(null);
      },
      ontimeout: () => {
        hjDebug('请求超时 ' + url.slice(0, 90));
        resolve(null);
      },
    });
    signal?.addEventListener('abort', () => { request?.abort(); resolve(null); }, { once: true });
  });
}

/**
 * 分片是 MPEG-TS，拼成一个文件后手机浏览器报 code=4。
 * 交给 Hls.js 转封装，分片请求仍然走油猴，避开 CDN 跨域。
 */
/** 海角的 enc.key 不是解密密钥。页面 /js/jquery.js 里的 jquery_key 用同名 .jpg 把它变掉。 */
function loadHjSiteKeyModule() {
  if (window.__creamu_hj_key_module) return window.__creamu_hj_key_module;
  window.__creamu_hj_key_module = new Promise((resolve) => {
    const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
    const ready = () => typeof pageWindow.createModule === 'function';
    const finish = () => {
      if (!ready()) {
        resolve(null);
        return;
      }
      Promise.resolve(pageWindow.createModule()).then(resolve).catch(() => resolve(null));
    };
    if (ready() || typeof document.createElement !== 'function') {
      finish();
      return;
    }
    const script = document.createElement('script');
    script.src = location.origin + '/js/jquery.js';
    script.onload = finish;
    script.onerror = () => resolve(null);
    (document.head || document.documentElement).appendChild(script);
    setTimeout(() => {
      if (!ready()) resolve(null);
    }, 4000);
  });
  const pending = window.__creamu_hj_key_module;
  pending.then(mod => {
    if (!mod && window.__creamu_hj_key_module === pending) window.__creamu_hj_key_module = null;
  });
  return window.__creamu_hj_key_module;
}

function transformHjAesKey(mod, rawKey, jpgKey) {
  const key = rawKey instanceof Uint8Array ? rawKey : new Uint8Array(rawKey);
  const keyPtr = mod._malloc(key.length);
  const jpgPtr = mod._malloc(jpgKey.length);
  try {
    mod.HEAPU8.set(key, keyPtr);
    mod.HEAPU8.set(jpgKey, jpgPtr);
    mod.ccall('jquery_key', null, ['number', 'number', 'number', 'number'], [keyPtr, key.length, jpgPtr, jpgKey.length]);
    return new Uint8Array(mod.HEAPU8.buffer, keyPtr, key.length).slice();
  } finally {
    try { mod._free(keyPtr); } catch (_) {}
    try { mod._free(jpgPtr); } catch (_) {}
  }
}

function loadHjM3u8WithGm(video, playlistUrl, onStatus) {
  // Hls 解析完列表后会读 performance.now()。油猴沙箱里没有它，解析完就抛 internalException。
  if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
    window.performance = { now: () => Date.now() };
  }
  const start = () => {
    if (video._hjDisposed) return;
    if (typeof window.Hls !== 'function' || !window.Hls.isSupported()) {
      if (video.canPlayType?.('application/vnd.apple.mpegurl')) video.src = playlistUrl;
      else if (onStatus) onStatus('当前浏览器无法加载 HLS 播放组件，请刷新后重试。');
      return;
    }
    if (video._hjHls) {
      try { video._hjHls.destroy(); } catch (_) {}
    }
    let keyMaterial;
    const getKeyMaterial = () => keyMaterial || (keyMaterial = Promise.all([
      loadHjSiteKeyModule(), gmHjRequest(String(playlistUrl).replace(/\.m3u8($|\?)/i, '.jpg$1'), 'text'),
    ]));
    const loader = function () {};
    loader.prototype.load = function (context, config, callbacks) {
      this.controller = new AbortController();
      this.aborted = false;
      let url = context.url;
      const encryptedKey = /\.key(?:[^/]*)($|\?)/i.test(url);
      if (/\.key($|\?)/i.test(url)) {
        let kversion = '';
        try {
          const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
          const cfg = JSON.parse(pageWindow.sessionStorage.getItem('config') || '{}');
          kversion = cfg && cfg.kversion != null ? String(cfg.kversion) : '';
        } catch (_) {}
        if (kversion) url = url.replace('.key', '.key' + kversion);
      }
      const wantsText = !context.responseType || context.responseType === 'text';
      const started = Date.now();
      const headers = {};
      if (Number.isFinite(context.rangeStart) && Number.isFinite(context.rangeEnd)) {
        headers.Range = 'bytes=' + context.rangeStart + '-' + (context.rangeEnd - 1);
      }
      const fail = (text) => {
        const now = Date.now();
        if (this.aborted) return;
        this.stats.loading.end = now;
        callbacks.onError({ code: 0, text }, context, null, this.stats);
      };
      gmHjRequest(url, wantsText ? 'text' : 'arraybuffer', headers, this.controller.signal).then(async response => {
        if (this.aborted) return;
        if (!response) {
          fail('请求失败');
          return;
        }
        const finish = (data) => {
        if (this.aborted) return;
        if (data == null || data === '') {
          fail('空响应');
          return;
        }
        const len = typeof data === 'string' ? data.length : data.byteLength || 0;
        const now = Date.now();
        this.stats.loaded = len;
        this.stats.total = len;
        this.stats.chunkCount = 1;
        this.stats.loading.end = now;
        let head = '';
        if (!wantsText && data instanceof ArrayBuffer) {
          head = ' ' + [...new Uint8Array(data).slice(0, 4)].map((b) => b.toString(16).padStart(2, '0')).join('');
        }
        hjDebug((wantsText ? '列表 ' : '分片 ') + len + head + ' ' + url.slice(0, 70));
        callbacks.onSuccess({ url, data }, this.stats, context, response);
        };
        if (wantsText) finish(String(response.responseText || response.response || ''));
        else {
          let bytes = await gmHjBytes(response);
          if (encryptedKey) {
            const [mod, jpg] = await getKeyMaterial();
            if (this.aborted) return;
            if (!mod || !jpg) throw new Error('站点解码材料不可用');
            const binary = atob(String(jpg.responseText || jpg.response || '').trim());
            const material = Uint8Array.from(binary, char => char.charCodeAt(0));
            bytes = transformHjAesKey(mod, bytes, material).buffer;
          }
          finish(bytes);
        }
      }).catch((error) => fail(String(error && error.message || error)));
    };
    loader.prototype.abort = function () { this.aborted = true; this.stats.aborted = true; this.controller?.abort(); };
    loader.prototype.destroy = loader.prototype.abort;
    // Hls 拉分片前把 loader.stats 记到分片上。没有这份对象就会读到 undefined.retry。
    Object.defineProperty(loader.prototype, 'stats', {
      get() {
        if (!this._stats) {
          const now = Date.now();
          this._stats = {
            aborted: false, loaded: 0, total: 0, retry: 0, chunkCount: 0, bwEstimate: 0,
            loading: { start: now, first: now, end: 0 },
            parsing: { start: 0, end: 0 },
            buffering: { start: 0, first: 0, end: 0 },
          };
        }
        return this._stats;
      },
    });
    const hls = new window.Hls({
      enableWorker: false,
      loader,
    });
    video._hjHls = hls;
    hls.on(window.Hls.Events.ERROR, (_, info) => {
      const reason = info.error && (info.error.message || info.error.name || String(info.error));
      hjDebug('Hls ' + info.type + ' ' + info.details + (reason ? ' ' + reason : ''));
      if (info.fatal && onStatus) onStatus('Hls 失败 ' + info.details);
    });
    hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
      hjDebug('播放列表已解析');
      if (onStatus) onStatus('');

    });
    hls.loadSource(playlistUrl);
    hls.attachMedia(video);
    hjDebug('交给 Hls');
  };
  start();
}

/**
 * 校验 URL 是否为真正的视频直链 (严格防误判)
 */
function isRealVideoUrl(url) {
  if (typeof url !== 'string' || !url || url.length < 10) return false;

  // 1. 过滤静态资源、代码文件及通用接口
  if (/\.(js|css|json|html|ts|map|png|jpg|jpeg|gif|webp|svg|ico)($|\?|#)/i.test(url) && !/\.(m3u8|mp4|mov|flv)($|\?|#)/i.test(url)) {
    return false;
  }

  if (/\/api\/(banner|login|captcha|favorite|comment|like|folderList|conf|isNeed)/i.test(url)) {
    return false;
  }

  // 带后缀的是片源。/hls/、/vod/、/m3u8/ 这种没后缀的也是播放地址，海角经常只给这种。
  // /video/ 太宽，接口、封面都会撞上，不收。
  const hasVideoExt = /\.(m3u8|mp4|mov|flv|webm)($|\?|#)/i.test(url);
  const hasStreamPath = /\/(hls|vod|m3u8|playlist)\//i.test(url);
  return hasVideoExt || hasStreamPath;
}

/** 带播放列表后缀的优先。没后缀的流地址放后面，分片列表放最后。 */
function hjVideoPlayRank(url) {
  const value = String(url || '').toLowerCase();
  if (/\/seg[-_]|\d+\.ts($|\?)/.test(value)) return 4;
  if (value.includes('.m3u8') && /\/(index|playlist|master)[^/]*\.m3u8($|\?|#)/.test(value)) return 0;
  if (/\.m3u8($|\?|#)/.test(value)) return 3;
  if (/\.(mp4|mov|flv|webm)($|\?|#)/.test(value)) return 1;
  return 2;
}

/**
 * 校验 URL 是否为真正的图片直链
 */
const HJ_IMG_ALPHABET = 'ABCD*EFGHIJKLMNOPQRSTUVWX#YZabcdefghijklmnopqrstuvwxyz1234567890';

/** 与站点 app.js function w 一致：+/ 换成 *#，再按 UTF-8 还原。 */
function decodeHjImageCipher(value) {
  const alphabet = HJ_IMG_ALPHABET;
  const text = String(value || '').replace(/[^A-Za-z0-9*#]/g, '');
  if (text.length < 8) return '';
  let binary = '';
  for (let index = 0; index < text.length;) {
    let a = alphabet.indexOf(text.charAt(index++));
    let b = alphabet.indexOf(text.charAt(index++));
    let c = alphabet.indexOf(text.charAt(index++));
    let d = alphabet.indexOf(text.charAt(index++));
    if (a < 0) a = 0;
    if (b < 0) b = 0;
    if (c < 0) c = 64;
    if (d < 0) d = 64;
    binary += String.fromCharCode((a << 2) | (b >> 4));
    if (c !== 64) binary += String.fromCharCode(((15 & b) << 4) | (c >> 2));
    if (d !== 64) binary += String.fromCharCode(((3 & c) << 6) | d);
  }
  let out = '';
  for (let index = 0; index < binary.length;) {
    const lead = binary.charCodeAt(index);
    if (lead < 128) {
      out += String.fromCharCode(lead);
      index += 1;
    } else if (lead > 191 && lead < 224) {
      out += String.fromCharCode(((31 & lead) << 6) | (63 & binary.charCodeAt(index + 1)));
      index += 2;
    } else {
      out += String.fromCharCode(((15 & lead) << 12) | ((63 & binary.charCodeAt(index + 1)) << 6) | (63 & binary.charCodeAt(index + 2)));
      index += 3;
    }
  }
  return out;
}

function hjImageBytesFromBase64(value) {
  let text = String(value || '').replace(/[\s\u0000-\u001f]+/g, '').replace(/\*/g, '+').replace(/#/g, '/');
  text = text.replace(/[^A-Za-z0-9+/=]/g, '');
  if (!text || typeof atob !== 'function') return null;
  const mod = text.length % 4;
  if (mod) text += '===='.slice(mod);
  try {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i) & 0xff;
    return bytes;
  } catch (_) {
    return null;
  }
}

function hjImageMime(bytes) {
  if (!bytes || bytes.length < 3) return '';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return 'image/bmp';
  return '';
}

function hjBytesToImageUrl(bytes, mime) {
  if (typeof Blob === 'function' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  }
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return 'data:' + mime + ';base64,' + btoa(binary);
}

/** 附件文件解开后是 data:image/...;base64。魔数不对就丢掉，避免把密文当图片贴上。 */
function hjImageDataUrl(text) {
  const decoded = decodeHjImageCipher(text);
  const source = /base64,/i.test(decoded) ? decoded : (/^data:/i.test(String(text || '').trim()) ? String(text).trim() : '');
  const matched = source.match(/^data:([^;:,]+)?(?:;charset=[^;,]+)?;base64,([\s\S]+)$/i);
  if (!matched) return '';
  const bytes = hjImageBytesFromBase64(matched[2]);
  const mime = hjImageMime(bytes);
  if (!mime || bytes.length < 24) return '';
  return hjBytesToImageUrl(bytes, mime);
}

function hjTopicImageAttachments(topic) {
  const attachments = topic && Array.isArray(topic.attachments) ? topic.attachments : [];
  return attachments.filter((item) => {
    if (!item) return false;
    const category = String(item.category || item.type || '').toLowerCase();
    const remote = String(item.remoteUrl || item.url || '');
    if (/video|m3u8|audio|mp3|sound/.test(category)) return false;
    return /image|img|photo|pic|cover/.test(category) || /\.(jpe?g|png|gif|webp|bmp)(\.txt)?([?#]|$)/i.test(remote);
  });
}

function renderHjUnlockedImages() {
  const cache = window.__creamu_hj_media_cache;
  if (!cache || !cache.images.length || typeof document === 'undefined') return;
  const slot = ensureHjInlineSlot();
  if (!slot) return;
  let box = document.getElementById('creamu-hj-image-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'creamu-hj-image-box';

    slot.appendChild(box);
  }
  const current = cache.images.join('\n');
  if (box.dataset.images === current) return;
  box.dataset.images = current;
  box.innerHTML = '';
  cache.images.forEach((url) => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '帖子图片';
    img.loading = 'lazy';
    box.appendChild(img);
  });
}

async function unlockHjHiddenImages(topic) {
  const cache = window.__creamu_hj_media_cache;
  const attachments = hjTopicImageAttachments(topic);
  if (!cache || !attachments.length) return 0;
  const generation = cache.generation;
  const requests = cache.imageRequests || (cache.imageRequests = new Map());
  const before = cache.images.length;
  for (const item of attachments) {
    const remote = tryNormalizeHjMediaUrl(String(item.remoteUrl || item.url || ''));
    if (!remote || cache.rawUrls.has('image:' + remote)) continue;
    if (!requests.has(remote)) requests.set(remote, gmHjRequest(remote, 'arraybuffer'));
    const response = await requests.get(remote);
    requests.delete(remote);
    const buffer = response ? await gmHjBytes(response) : null;
    if (generation !== cache.generation) return 0;
    if (cache.rawUrls.has('image:' + remote)) continue;
    if (!buffer) continue;
    const bytes = new Uint8Array(buffer);
    const mime = hjImageMime(bytes);
    const url = mime && bytes.length > 100 ? hjBytesToImageUrl(bytes, mime) : hjImageDataUrl(new TextDecoder('utf-8').decode(bytes));
    if (!url) continue;
    cache.rawUrls.add('image:' + remote);
    cache.images.push(url);
  }
  renderHjUnlockedImages();
  return cache.images.length - before;
}

function isRealImageUrl(url) {
  if (typeof url !== 'string' || !url || url.length < 10) return false;
  if (isRealVideoUrl(url)) return false;
  return /\.(jpg|jpeg|png|webp|gif)($|\?|#)/i.test(url);
}

/**
 * 深度智能规范化媒体 URL：支持绝对路径、各类无斜杠相对路径、Base64 解码与转义字符
 */
function tryNormalizeHjMediaUrl(rawStr) {
  if (typeof rawStr !== 'string') return '';
  let str = rawStr.trim();
  if (!str || str.length < 3) return '';

  // 1. 去除首尾引号及 JSON 转义
  str = str.replace(/^["']|["']$/g, '').replace(/\\\/|\\u002[fF]/g, '/');

  // 2. URL 解编码与反转义
  try {
    if (str.includes('%2F') || str.includes('%3A')) {
      str = decodeURIComponent(str);
    }
  } catch (_) {}

  // 3. 解码 Base64 编码字符串
  if (str.startsWith('aHR0cHM6Ly9') || str.startsWith('aHR0cDovLw') || str.startsWith('aHR0c')) {
    try {
      if (typeof atob === 'function') {
        const decoded = atob(str);
        if (decoded.startsWith('http') || decoded.startsWith('/') || decoded.includes('.m3u8')) str = decoded;
      }
    } catch (_) {}
  }

  // 4. 补全协议相对路径 (//cdn.com/...)
  if (str.startsWith('//')) {
    const proto = (typeof location !== 'undefined' && location.protocol) ? location.protocol : 'https:';
    return proto + str;
  }

  // 5. 绝对路径直接返回
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }

  // 6. 补全相对路径
  const isMediaLike = /\.(m3u8|mp4|mov|flv|jpg|jpeg|png|webp|gif)/i.test(str) ||
                     /(?:upload|video|attachment|play|hls|media|vod)\//i.test(str);
                     
  if (isMediaLike) {
    const origin = (typeof location !== 'undefined' && location.origin) ? location.origin : '';
    if (str.startsWith('/')) {
      return origin + str;
    }
    return origin + '/' + str;
  }

  return '';
}

/**
 * 拦截与解析接口 API 响应中的媒体数据 (XHR & Fetch Hook)
 */
function initHjNetworkInterceptor() {
  if (window.__creamu_hj_interceptor_injected) return;
  window.__creamu_hj_interceptor_injected = true;
  const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
  const requestScope = (raw) => {
    const identity = currentHjPostId();
    const cache = window.__creamu_hj_media_cache;
    if (cache.postIdentity !== identity) resetHjMediaForPost(identity);
    if (!identity) return null;
    let url;
    try { url = new URL(raw, location.href); } catch (_) { return null; }
    const topic = url.pathname.match(/\/api\/topic\/(\d+)$/);
    if (topic && topic[1] !== identity) return null;
    // 只接收当前帖子的详情，推荐列表与广告响应不进入媒体缓存。
    if (!topic) return null;
    return { generation: cache.generation, topic: true };
  };
  const accept = (scope, text) => {
    if (!scope || scope.generation !== window.__creamu_hj_media_cache.generation) return;
    if (scope.topic) {
      const payload = decodeHjTopicPayload(text);
      if (payload) acceptHjTopicData(payload, scope.generation).catch(() => {});
    }
  };
  const originalFetch = pageWindow.fetch;
  if (typeof originalFetch === 'function') window.__creamu_hj_fetch = originalFetch.bind(pageWindow);
  if (typeof originalFetch === 'function') pageWindow.fetch = async function (...args) {
    const scope = requestScope(typeof args[0] === 'string' ? args[0] : args[0]?.url);
    const response = await originalFetch.apply(this, args);
    if (scope?.topic && response.ok) response.clone().text().then(text => accept(scope, text)).catch(() => {});
    return response;
  };
  const PageXHR = pageWindow.XMLHttpRequest;
  if (!PageXHR) return;
  const originalOpen = PageXHR.prototype.open;
  const originalSend = PageXHR.prototype.send;
  PageXHR.prototype.open = function (method, url, ...rest) {
    this._hjScope = requestScope(url);
    return originalOpen.apply(this, [method, url, ...rest]);
  };
  PageXHR.prototype.send = function (...args) {
    this.addEventListener('load', () => {
      if (this.status < 200 || this.status >= 300) return;
      try { accept(this._hjScope, this.responseType === 'json' ? JSON.stringify(this.response) : this.responseText); } catch (_) {}
    }, { once: true });
    return originalSend.apply(this, args);
  };
}

async function acceptHjTopicData(payload, generation) {
  const cache = window.__creamu_hj_media_cache;
  if (generation !== cache.generation) return;
  const topic = payload.results?.[0] || payload;
  if (!topic || (!topic.topicId && !Array.isArray(topic.attachments) && typeof topic.content !== 'string')) {
    throw new Error('帖子响应不含正文或附件，请确认当前登录状态');
  }
  if (topic.topicId && String(topic.topicId) !== cache.postIdentity) return;
  cache.status = '';
  const attachments = Array.isArray(topic.attachments) ? topic.attachments : [];
  parseHjMediaFromData({ attachments: attachments.filter(item => item.category !== 'images' && item.category !== 'image'), content: topic.content, videoUrl: topic.videoUrl });
  await unlockHjHiddenImages(topic);
  if (generation !== cache.generation) return;
  const missing = hjTopicImageAttachments(topic).filter(item => !cache.rawUrls.has('image:' + tryNormalizeHjMediaUrl(String(item.remoteUrl || item.url || '')))).length;
  cache.status = missing ? missing + ' 张图片读取失败，可重新解析。' : cache.videos.length || cache.images.length ? '' : '当前帖子没有可播放的媒体。';
  scheduleHjMediaUpdate();
}

/**
 * 精准字符串提取 (严格限制为真实 m3u8 / mp4 视频及图片)
 */
function parseHjMediaFromString(text) {
  if (typeof text !== 'string' || !text) return;
  const cache = window.__creamu_hj_media_cache;

  // 1. 解压缩 JSON 转义斜杠
  let cleanText = text
    .replace(/\\\/|\\u002[fF]/g, '/')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#x2F;/gi, '/');

  // 2. 正则查找 Base64 编码并尝试解码
  cleanText = cleanText.replace(/aHR0c[A-Za-z0-9+/=]{20,}/g, (b64) => {
    try {
      if (typeof atob === 'function') {
        const decoded = atob(b64);
        if (decoded.includes('http') || decoded.includes('/') || decoded.includes('.m3u8')) {
          return decoded;
        }
      }
    } catch (_) {}
    return b64;
  });

  // 3. 精确搜索视频与图片 URL
  const mediaRegexes = [
    // 显式 http(s) URL
    /https?:\/\/[^\s"'<>\\]+?\.(?:m3u8|mp4|mov|flv|jpg|jpeg|png|webp|gif)(?![\w.])(?:\?[^\s"'<>\\]*)?/gi,
    // 包含 hls / video / upload / vod 关键词的媒体路径
    /(?:https?:\/\/[^\s"'<>\\]+|\/?(?:upload|video|hls|vod)\/)[^\s"'<>\\]+?\.(?:m3u8|mp4|mov|flv)(?:\?[^\s"'<>\\]*)?/gi,
    // 海角的播放地址经常没有后缀，只挂在 /hls/、/vod/、/playlist/ 下面
    /https?:\/\/[^\s"'<>\\]+?\/(?:hls|vod|m3u8|playlist)\/[^\s"'<>\\]+/gi
  ];

  let added = false;
  for (const regex of mediaRegexes) {
    let match;
    while ((match = regex.exec(cleanText)) !== null) {
      const raw = match[0];
      const url = tryNormalizeHjMediaUrl(raw);
      if (url && url.length > 8 && !cache.rawUrls.has(url)) {
        if (isRealVideoUrl(url)) {
          cache.rawUrls.add(url);
          if (!cache.videos.includes(url)) cache.videos.push(url);
          cache.videos.sort((a, b) => hjVideoPlayRank(a) - hjVideoPlayRank(b));
          added = true;
        } else if (isRealImageUrl(url)) {
          cache.rawUrls.add(url);
          if (!cache.images.includes(url)) cache.images.push(url);
          added = true;
        }
      }
    }
  }

  if (added) {
    scheduleHjMediaUpdate();
  }
}

/**
 * 从 JSON 对象中递归查找视频与图片 (全泛型结构递归扫描)
 */
function parseHjMediaFromData(obj) {
  if (!obj || typeof obj !== 'object') return;
  const cache = window.__creamu_hj_media_cache;
  let added = false;

  const checkString = (rawStr, keyHint = '') => {
    if (typeof rawStr !== 'string') return;
    
    // 如果长字符串包含 HTML 或多个字符，先跑全字符串正则提取
    if (rawStr.length > 30 || rawStr.includes('<') || rawStr.includes('http') || rawStr.includes('/')) {
      parseHjMediaFromString(rawStr);
    }

    const url = tryNormalizeHjMediaUrl(rawStr);
    if (!url || url.length < 8) return;
    if (cache.rawUrls.has(url)) return;

    if (isRealVideoUrl(url)) {
      cache.rawUrls.add(url);
      if (!cache.videos.includes(url)) cache.videos.push(url);
      cache.videos.sort((a, b) => hjVideoPlayRank(a) - hjVideoPlayRank(b));
      added = true;
    } else if (isRealImageUrl(url)) {
      cache.rawUrls.add(url);
      if (!cache.images.includes(url)) cache.images.push(url);
      added = true;
    }
  };

  const traverse = (item, parentKey = '') => {
    if (!item) return;
    if (typeof item === 'string') {
      checkString(item, parentKey);
    } else if (Array.isArray(item)) {
      item.forEach((el) => traverse(el, parentKey));
    } else if (typeof item === 'object') {
      for (const key in item) {
        if (Object.prototype.hasOwnProperty.call(item, key)) {
          traverse(item[key], key);
        }
      }
    }
  };

  traverse(obj);
  if (added) {
    scheduleHjMediaUpdate();
  }
}

/**
 * 从全局状态变量及 DOM 节点深度扫描
 */
const hjScannedGlobals = new WeakSet();
function parseHjHiddenMediaFromGlobals() {
  const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
  const cache = window.__creamu_hj_media_cache || { videos: [], images: [], rawUrls: new Set() };
  
  const globals = [pageWindow.__INITIAL_STATE__, pageWindow.__NUXT__, pageWindow.detailData, pageWindow.postData, pageWindow.$video, pageWindow.videoInfo, pageWindow.playData, pageWindow.topicData];
  globals.forEach((g) => {
    if (!g || typeof g !== 'object' || hjScannedGlobals.has(g)) return;
    const id = g.topicId || g.post?.topicId;
    if (id && String(id) !== cache.postIdentity) return;
    hjScannedGlobals.add(g);
    parseHjMediaFromData(g);
  });

  if (typeof document !== 'undefined') {
    // 2. 扫描 video / source 节点
    const videoElements = document.querySelectorAll('video, video source, audio source');
    videoElements.forEach((v) => {
      if (v.closest('#creamu-hj-inline-slot, .ad-banner, .custom_carousel')) return;
      const src = v.getAttribute('src') || v.src;
      if (src) {
        const normalized = tryNormalizeHjMediaUrl(src);
        if (normalized && isRealVideoUrl(normalized)) parseHjMediaFromData({ url: normalized });
      }
    });

    // 3. 扫描 dataset 节点
    const nodes = document.querySelectorAll('[data-src], [data-video], [data-url], [data-original], [data-hls], [data-play-url], [data-m3u8]');
    nodes.forEach((el) => {
      if (el.closest('#creamu-hj-inline-slot, .ad-banner, .custom_carousel')) return;
      ['data-src', 'data-video', 'data-url', 'data-original', 'data-hls', 'data-play-url', 'data-m3u8'].forEach((attr) => {
        const val = el.getAttribute(attr);
        if (val) {
          const normalized = tryNormalizeHjMediaUrl(val);
          if (normalized && isRealVideoUrl(normalized)) parseHjMediaFromData({ url: normalized });
        }
      });
    });
  }

  return {
    videos: cache.videos,
    images: cache.images
  };
}

/** 仅挂载到已确认的两版帖子正文；SPA 正文尚未出现时等待页面刷新。 */
function findHjPostMediaContainer() {
  return document.querySelector('#details-page .article.ql-editor, .mobile .details .reset-html-box');
}

/**
 * 播放器贴在帖子正文前面，跟着帖子滚动。
 * 帖子被页面重绘清掉时，由页面观察器把同一块播放器挪回去，不拆掉重做。
 */
function ensureHjInlineSlot() {
  const anchor = findHjPostMediaContainer();
  if (!anchor || !anchor.parentElement) return null;
  let slot = document.getElementById('creamu-hj-inline-slot');
  if (!slot) {
    slot = document.createElement('div');
    slot.id = 'creamu-hj-inline-slot';
  }

  if (slot.parentElement !== anchor.parentElement || slot.nextElementSibling !== anchor) {
    anchor.parentElement.insertBefore(slot, anchor);
  }
  return slot;
}

/**
 * 安全的更新触发调度器（防死循环 + 防卡死防抖）
 */
let hjUpdateTimer = null;
function scheduleHjMediaUpdate() {
  if (hjUpdateTimer) return;
  if (typeof setTimeout === 'function') {
    hjUpdateTimer = setTimeout(() => {
      hjUpdateTimer = null;
      embedHjUnlockedMediaInline();
    }, 80);
  } else {
    embedHjUnlockedMediaInline();
  }
}

/**
 * 主入口：解析隐藏媒体
 */
function parseHjHiddenMedia() {
  const res = parseHjHiddenMediaFromGlobals();
  scheduleHjMediaUpdate();

  return res;
}

let hjPlayer = null;
function destroyHjPlayer() {
  if (!hjPlayer) return;
  const { art, video } = hjPlayer;
  if (video) video._hjDisposed = true;
  if (video?._hjHls) { video._hjHls.destroy(); video._hjHls = null; }
  if (art) art.destroy(false);
  else if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
  hjPlayer = null;
}

function mountHjArtPlayer(videoUrl) {
  const mount = document.getElementById('creamu-hj-art-mount');
  if (!mount) return null;
  const hls = /\.m3u8($|\?)/i.test(videoUrl) || /\/(hls|vod|m3u8|playlist)\//i.test(videoUrl);
  const onStatus = text => {
    if (hjPlayer?.url !== videoUrl) return;
    const el = document.getElementById('creamu-hj-play-status');
    if (el) el.textContent = text;
  };
  let art = null, video;
  hjPlayer = { art: null, video: null, url: videoUrl };
  if (typeof Artplayer === 'function') {
    art = new Artplayer({
      container: mount, url: videoUrl, type: hls ? 'm3u8' : 'mp4', autoplay: false,
      playsInline: true, fullscreen: true, fullscreenWeb: true, pip: true,
      playbackRate: true, setting: true, gesture: true, theme: '#78947c', lang: 'zh-cn',
      moreVideoAttr: { playsInline: true, 'webkit-playsinline': 'true' },
      customType: { m3u8: (el, url) => loadHjM3u8WithGm(el, url, onStatus) },
    });
    video = art.video || art.template?.$video;
  } else {
    video = document.createElement('video');
    video.controls = true; video.playsInline = true; video.preload = 'metadata';
    mount.appendChild(video);
    if (hls) loadHjM3u8WithGm(video, videoUrl, onStatus);
    else video.src = videoUrl;
  }
  hjPlayer = { art, video, url: videoUrl };
  video?.addEventListener('error', () => onStatus('播放失败，可重试解析或复制地址检查。'));
  video?.addEventListener('playing', () => onStatus(''));
  return video;
}

function embedHjUnlockedMediaInline() {
  const cache = window.__creamu_hj_media_cache;
  if (!cache || (!cache.videos.length && !cache.postIdentity)) return;
  const container = ensureHjInlineSlot();
  if (!container) return;
  let box = document.getElementById('creamu-hj-inline-player-box');
  if (!box) {
    box = document.createElement('section');
    box.id = 'creamu-hj-inline-player-box';
    box.className = 'creamu-hj-media';
    box.innerHTML = `<div class="creamu-hj-media-head"><strong>帖子媒体</strong><small id="creamu-hj-media-count"></small><div class="creamu-hj-switcher"></div></div>
      <div id="creamu-hj-art-mount"></div><div id="creamu-hj-play-status" role="status"></div>
      <div class="creamu-hj-player-toolbar"><button class="creamu-hj-btn" id="creamu-hj-retry" type="button">重新解析</button><button class="creamu-hj-btn" id="creamu-hj-copy" type="button">复制地址</button></div>
      <details id="creamu-hj-debug-details"><summary>播放诊断</summary><pre id="creamu-hj-debug"></pre><button class="creamu-hj-btn" id="creamu-hj-debug-copy" type="button">复制诊断</button></details>`;
    container.insertBefore(box, container.firstChild);
    box.querySelector('#creamu-hj-retry').onclick = () => loadHjCurrentTopic(true);
    box.querySelector('#creamu-hj-copy').onclick = event => {
      const url = hjPlayer?.url;
      if (!url) return;
      if (typeof GM_setClipboard === 'function') GM_setClipboard(url);
      event.currentTarget.textContent = '已复制';
    };
    box.querySelector('#creamu-hj-debug-copy').onclick = copyHjDebug;
  }
  const index = Math.min(currentHjSelectedVideoIndex, Math.max(0, cache.videos.length - 1));
  const url = cache.videos[index] || '';
  const signature = cache.videos.join('\n') + ':' + index;
  const switcher = box.querySelector('.creamu-hj-switcher');
  if (switcher.dataset.signature !== signature) {
    switcher.dataset.signature = signature;
    switcher.replaceChildren();
    if (cache.videos.length > 1) cache.videos.forEach((_, i) => {
      const button = document.createElement('button');
      button.className = 'creamu-hj-btn creamu-hj-vswitch-btn'; button.type = 'button';
      button.textContent = '视频 ' + (i + 1); button.setAttribute('aria-pressed', String(i === index));
      button.onclick = () => { currentHjSelectedVideoIndex = i; embedHjUnlockedMediaInline(); };
      switcher.appendChild(button);
    });
  }
  box.querySelector('#creamu-hj-media-count').textContent = cache.videos.length ? cache.videos.length + ' 段视频' : '当前帖子';
  box.querySelector('#creamu-hj-copy').disabled = !url;
  box.querySelector('#creamu-hj-retry').disabled = !!cache.topicLoading;
  box.querySelector('#creamu-hj-play-status').textContent = cache.status || '';
  if (url && (hjPlayer?.url !== url || !hjPlayer.video?.isConnected)) {
    destroyHjPlayer();
    box.querySelector('#creamu-hj-art-mount').replaceChildren();
    try {
      mountHjArtPlayer(url);
    } catch (error) {
      box.querySelector('#creamu-hj-play-status').textContent = '播放器初始化失败，请重新解析。';
      hjDebug(String(error.message || error));
    }
    box.setAttribute('data-video-url', url);
    hjDebug('选用视频 ' + (index + 1));
  }
  renderHjUnlockedImages();
}
// 31-search-memory.js

function initHjFloatingSearch() {
  if (document.getElementById('creamu-hj-search-trigger')) return;
  const trigger = document.createElement('button');
  trigger.id = 'creamu-hj-search-trigger';
  trigger.className = 'creamu-hj-btn';
  trigger.type = 'button';
  trigger.textContent = '搜索';
  trigger.setAttribute('aria-haspopup', 'dialog');
  const dialog = document.createElement('dialog');
  dialog.id = 'creamu-hj-search-dialog';
  dialog.setAttribute('aria-labelledby', 'creamu-hj-search-title');
  dialog.innerHTML = '<form><div class="creamu-hj-search-head"><strong id="creamu-hj-search-title">搜索海角</strong><button class="creamu-hj-btn" type="button" data-close aria-label="关闭搜索">关闭</button></div><label for="creamu-hj-search-query">关键词</label><input id="creamu-hj-search-query" name="keyword" type="search" placeholder="搜索帖子、用户或标签" autocomplete="off" required><div class="creamu-hj-search-actions"><select name="type" aria-label="搜索类型"><option value="1">帖子</option><option value="2">用户</option><option value="3">帖子标签</option><option value="4">用户标签</option></select><button class="creamu-hj-btn" type="submit">搜索</button></div></form>';
  const input = dialog.querySelector('input');
  trigger.onclick = () => {
    const url = new URL(location.href);
    input.value = url.searchParams.get('key') || url.searchParams.get('search') || '';
    dialog.showModal();
    input.focus({ preventScroll: true });
  };
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.querySelector('form').onsubmit = event => {
    event.preventDefault();
    const keyword = input.value.trim();
    if (!keyword) return;
    const mobile = !!document.querySelector('#app > .mobile');
    const query = mobile ? { search: keyword, type: dialog.querySelector('select').value } : { key: keyword, type: dialog.querySelector('select').value, node_id: '0' };
    const path = mobile ? '/search' : '/es';
    const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
    const router = pageWindow.document.getElementById('app')?.__vue__?.$router;
    dialog.close();
    if (router) router.push({ path, query }).catch(error => { if (error.name !== 'NavigationDuplicated') console.error(error); });
    else location.assign(path + '?' + new URLSearchParams(query));
  };
  document.body.append(trigger, dialog);
}

function initHjSearchMemory() {
  let key = '';
  const save = () => {
    if (!key) return;
    try { sessionStorage.setItem(key, String(window.scrollY)); } catch (_) {}
  };
  window.__creamu_hj_save_search = save;
  window.__creamu_hj_restore_search = () => {
    const url = new URL(location.href);
    key = /\/(?:es|search)\/?$/.test(url.pathname) || url.searchParams.has('q')
      ? 'creamu_hj_search_scroll:' + url.pathname + url.search : '';
    if (!key) return;
    try {
      const y = Number(sessionStorage.getItem(key));
      if (Number.isFinite(y) && y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
    } catch (_) {}
  };
  window.addEventListener('pagehide', save);
  window.__creamu_hj_restore_search();
}
// 32-user-post-sorter.js

/** 「最新」由接口分页；最早优先从末页开始，每次只读取一页。 */
function initHjPostSorter() {
  if (window.__creamu_hj_sorter_ready) return;
  window.__creamu_hj_sorter_ready = true;
  let owner = null;

  const findDesktopVm = element => {
    const walk = vm => {
      if (!vm) return null;
      if (Array.isArray(vm.listData) && vm.pagination && typeof vm.oninit === 'function') return vm;
      for (const child of vm.$children || []) { const found = walk(child); if (found) return found; }
      return null;
    };
    return walk(element?.__vue__);
  };
  const release = () => {
    if (!owner) return;
    owner.abort?.abort();
    owner.vm[owner.method] = owner.original;
    if (owner.mobile) owner.vm.getForumList = owner.acceptPage;
    owner.root.classList.remove('creamu-hj-paged');
    owner.bar.remove();
    owner = null;
  };
  const refresh = () => {
    if (!/^\/(?:homepage\/last\/|user\/userinfo)/.test(location.pathname)) { release(); return; }
    const mobileRoot = document.querySelector('.userinfo');
    const mobileVm = mobileRoot?.__vue__;
    const desktopRoot = document.querySelector('.main_body');
    const desktopVm = findDesktopVm(desktopRoot) || [...(desktopRoot?.children || [])].map(findDesktopVm).find(Boolean);
    const mobile = !!mobileVm;
    const vm = mobile ? mobileVm : desktopVm;
    const latest = mobile ? Number(vm?.active) === 4 : vm?.meta?.type === 1;
    const uid = mobile ? new URL(location.href).searchParams.get('uid') : location.pathname.split('/').pop();
    const componentUid = mobile ? vm?.$route?.query?.uid : vm?.params?.uid;
    if (!latest || !uid || !vm || String(componentUid) !== String(uid)) { release(); return; }
    if (!mobile && !vm.isinit) return;
    const identity = String(uid) + ':' + location.pathname;
    if (owner?.vm === vm && owner.identity === identity) return;
    release();
    const root = mobile ? mobileRoot : desktopRoot;
    const bar = document.createElement('div');
    bar.id = 'creamu-hj-post-order';
    bar.innerHTML = '<div class="creamu-hj-order-options"><button type="button" class="creamu-hj-btn" data-order="newest">最新优先</button><button type="button" class="creamu-hj-btn" data-order="oldest">最早优先</button></div><div class="creamu-hj-order-pages"><button type="button" class="creamu-hj-btn" data-step="-1">上一页</button><span role="status"></span><button type="button" class="creamu-hj-btn" data-step="1">下一页</button><button type="button" class="creamu-hj-btn" data-retry hidden>重试</button></div>';
    const anchor = mobile ? root.querySelector('.van-tabs__content') : root.firstElementChild;
    if (anchor) anchor.before(bar); else root.append(bar);
    root.classList.add('creamu-hj-paged');
    const state = owner = { vm, root, bar, identity, mobile, order: 'newest', page: 1, pages: 1, total: 0, busy: false, error: '', known: false, abort: null, method: mobile ? 'onLoad' : 'oninit' };
    state.original = vm[state.method];
    if (mobile) {
      state.acceptPage = vm.getForumList;
      // 接管前已经发出的站点请求，不再向新分页结果追加数据。
      vm.getForumList = function (data) {
        if (owner !== state || Number(vm.active) !== 4) return state.acceptPage.call(this, data);
      };
    }
    const render = () => {
      bar.querySelector('[role="status"]').textContent = state.error || (state.busy ? '正在读取…' : '第 ' + (state.order === 'oldest' ? state.pages - state.page + 1 : state.page) + ' / ' + state.pages + ' 页 · ' + state.total + ' 帖');
      bar.querySelectorAll('[data-order]').forEach(button => { button.disabled = state.busy; button.setAttribute('aria-pressed', String(button.dataset.order === state.order)); });
      const direction = state.order === 'oldest' ? -1 : 1;
      bar.querySelectorAll('[data-step]').forEach(button => { const next = state.page + Number(button.dataset.step) * direction; button.disabled = state.busy || !state.known || next < 1 || next > state.pages; });
      bar.querySelector('[data-retry]').hidden = !state.error;
    };
    const load = async (page, order = state.order) => {
      if (state.busy || owner !== state) return;
      const controller = state.abort = new AbortController();
      state.busy = true; state.error = ''; render();
      if (mobile) { vm.finished = true; vm.loading = true; }
      const requested = page || (order === 'oldest' ? state.pages : 1);
      state.retry = { page: requested, order };
      try {
        const url = new URL('/api/topic/node/topics', location.origin);
        url.search = new URLSearchParams({ page: String(requested), userId: String(uid), type: '1' });
        const data = await fetchHjPayload(url.href, controller.signal);
        if (owner !== state || controller.signal.aborted) return;
        const pagination = data?.page;
        if (!Array.isArray(data?.results) || !Number.isFinite(Number(pagination?.total)) || Number(pagination?.limit) <= 0 || Number(pagination?.page) !== requested) throw new Error('分页响应异常');
        state.pages = Math.max(1, Math.ceil(Number(pagination.total) / Number(pagination.limit)));
        state.total = Number(pagination.total); state.known = true;
        state.page = requested; state.order = order;
        const seen = new Set();
        const results = data.results.filter(item => { const id = String(item.topicId || item.id); if (seen.has(id)) return false; seen.add(id); return true; });
        if (order === 'oldest') results.reverse();
        if (mobile) {
          vm.forumList = []; vm.refreshing = false;
          state.acceptPage.call(vm, { ...data, results });
          vm.pageNum = requested; vm.finished = true;
        } else {
          vm.listData = results.map(item => ({ ...item, attachments: item.attachments?.filter(attachment => attachment.category !== 'audio'), isAudio: item.isAudio || item.attachments?.some(attachment => attachment.category === 'audio') }));
          vm.pagination = { ...pagination }; vm.isinit = true;
        }
      } catch (error) {
        if (owner === state && !controller.signal.aborted) state.error = '读取失败，可重试';
      } finally {
        if (owner === state) {
          state.busy = false;
          if (mobile) { vm.loading = false; vm.finished = true; vm.skeletonLoading = false; }
          render();
        }
      }
    };
    // 仅接管当前「最新」分页，其他栏目继续使用站点的加载方法。
    vm[state.method] = function (...args) {
      if (owner !== state || (mobile && Number(vm.active) !== 4)) return state.original.apply(this, args);
      if (mobile && vm.refreshing) return load(state.order === 'oldest' ? state.pages : 1);
      if (mobile) { vm.loading = false; vm.finished = true; return; }
      return load(vm.pagination.page);
    };
    bar.onclick = event => {
      const button = event.target.closest('button');
      if (!button || button.disabled) return;
      if (button.dataset.order) load(button.dataset.order === 'oldest' ? state.pages : 1, button.dataset.order);
      else if (button.dataset.step) load(state.page + Number(button.dataset.step) * (state.order === 'oldest' ? -1 : 1));
      else if (button.hasAttribute('data-retry')) load(state.retry.page, state.retry.order);
    };
    load(1);
  };
  window.__creamu_hj_refresh_sorter = refresh;
  refresh();
}

/** 详情接口的 data 是三重 base64。解出来才是帖子正文。 */
function decodeHjTopicPayload(text) {
  let raw = String(text || '');
  try {
    const wrapped = JSON.parse(raw);
    if (wrapped && typeof wrapped.data === 'string') raw = wrapped.data;
    else if (wrapped && wrapped.data) return wrapped.data;
    else if (wrapped && typeof wrapped === 'object') return wrapped;
  } catch (_) {}
  try {
    for (let i = 0; i < 3; i += 1) raw = atob(raw);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i) & 0xff;
    const json = typeof TextDecoder === 'function' ? new TextDecoder('utf-8').decode(bytes) : raw;
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}

async function fetchHjPayload(url, signal) {
  const cookies = new Map(document.cookie.split(';').map(pair => {
    const separator = pair.indexOf('=');
    return [pair.slice(0, separator).trim(), pair.slice(separator + 1)];
  }));
  const headers = { pcVer: '2' };
  for (const [cookie, header] of [['token', 'X-User-Token'], ['uid', 'X-User-Id']]) {
    if (cookies.get(cookie)) headers[header] = decodeURIComponent(cookies.get(cookie));
  }
  const response = await window.__creamu_hj_fetch(url, { credentials: 'include', cache: 'no-store', headers, signal });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const payload = decodeHjTopicPayload(await response.text());
  if (!payload) throw new Error('无法识别站点数据');
  return payload;
}

/** 请求与结果都绑定当前帖子；失败由用户重试，不按计时器反复请求。 */
async function loadHjCurrentTopic(force = false) {
  const cache = window.__creamu_hj_media_cache;
  const pid = currentHjPostId();
  if (!pid || cache.postIdentity !== pid || cache.topicLoading || (cache.topicRequested && !force)) return;
  const generation = cache.generation;
  if (force) destroyHjPlayer();
  cache.topicRequested = true; cache.topicLoading = true; cache.status = '正在读取帖子媒体…';
  scheduleHjMediaUpdate();
  try {
    const payload = await fetchHjPayload(location.origin + '/api/topic/' + pid);
    if (generation !== cache.generation) return;
    await acceptHjTopicData(payload, generation);
  } catch (error) {
    if (generation !== cache.generation) return;
    cache.status = '帖子媒体读取失败，请重试。';
    hjDebug(String(error.message || error));
  } finally {
    if (generation === cache.generation) { cache.topicLoading = false; scheduleHjMediaUpdate(); }
  }
}

function initHjPostReading() {
  if (window.__creamu_hj_reading_ready) return;
  window.__creamu_hj_reading_ready = true;
  document.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
    const anchor = event.target.closest('a[href]');
    if (!anchor || anchor.target === '_blank' || !currentHjPostId(anchor.href)) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin) return;
    event.preventDefault();
    event.stopPropagation();
    window.open(url.href, '_blank', 'noopener');
  }, true);
}

function refreshHjPostReading() {
  if (!isHjPostDetail()) return;
  loadHjCurrentTopic();
  document.querySelectorAll('button').forEach(button => {
    if (button.textContent.replace(/\s+/g, '') !== '点击展开完整贴文' || button.dataset.hjExpanded) return;
    button.dataset.hjExpanded = '1'; button.click();
  });
}
// 35-ad-sanitizer.js

// 只关闭站点已识别的落地提示；弹窗、遮罩和滚动锁由站点组件一起回收。
const hjDismissedDialogs = new WeakMap();
const hjLandingDialogSelector = '.luodiye_dialog, .luodiconfirm, .luodisconfirm, .addbox';
function closeHjLandingDialogs() {
  document.querySelectorAll(hjLandingDialogSelector).forEach(dialog => {
    if (!dialog.getClientRects().length || getComputedStyle(dialog).visibility === 'hidden') {
      hjDismissedDialogs.delete(dialog);
      return;
    }
    const button = dialog.matches('.addbox')
      ? dialog.querySelector('.van-icon-cross')
      : [...dialog.querySelectorAll('button, .el-dialog__footer .dialog-footer > span')]
        .find(el => /^(我知道了|好|确认|我确认)$/.test(el.textContent.trim()));
    if (!button || button.disabled) return;
    // Vant 会复用同一个节点展示下一步，内容变化后需要重新执行关闭。
    const content = dialog.textContent;
    if (hjDismissedDialogs.get(dialog) === content) return;
    hjDismissedDialogs.set(dialog, content);
    button.click();
  });
}

function applyHjAdSanitizer() { closeHjLandingDialogs(); }
// 40-page-runtime.js

function initHjStartupRecovery() {
  const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
  const fetchResource = pageWindow.fetch.bind(pageWindow);
  const recover = async () => {
    const app = document.getElementById('app');
    const entry = [...document.scripts].find(script => {
      const url = new URL(script.src || location.href);
      return url.origin === location.origin && /^\/static\/js[^/]*\/app[-.][^/]+\.js$/.test(url.pathname);
    });
    if (!app || app.childElementCount || !entry) return;
    let notice;
    try {
      // 手机入口曾把主脚本缓存成 HTML。只在此错误已证实且应用未启动时重取一次。
      const response = await fetchResource(entry.src, { signal: AbortSignal.timeout(10000) });
      if (!response.ok || !/^\s*(?:<!doctype html|<html)/i.test(await response.text()) || app.childElementCount) return;
      notice = document.createElement('section');
      notice.id = 'creamu-hj-startup';
      notice.setAttribute('role', 'status');
      notice.innerHTML = '<strong>正在恢复页面</strong><p>站点加载文件异常，正在重新获取…</p><button class="creamu-hj-btn" type="button" hidden>重新加载页面</button>';
      notice.querySelector('button').onclick = () => location.reload();
      document.body.appendChild(notice);
      const retryUrl = new URL(entry.src);
      retryUrl.searchParams.set('creamu_reload', String(Date.now()));
      const retried = await fetchResource(retryUrl.href, { signal: AbortSignal.timeout(10000) });
      if (!retried.ok || !/javascript/.test(retried.headers.get('content-type') || '')) throw new Error('invalid entry');
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const observer = new MutationObserver(() => { if (document.getElementById('app')?.childElementCount) finish(); });
        const timer = setTimeout(() => finish(new Error('startup timeout')), 12000);
        const finish = error => {
          clearTimeout(timer);
          observer.disconnect();
          script.remove();
          error ? reject(error) : resolve();
        };
        // Vue 挂载时会替换 #app 本身，不能只观察旧的空根节点。
        observer.observe(document.body, { childList: true, subtree: true });
        script.src = retryUrl.href;
        script.onerror = () => finish(new Error('entry load failed'));
        document.head.appendChild(script);
      });
      notice.remove();
    } catch (_) {
      if (!notice) return;
      notice.querySelector('strong').textContent = '站点暂时未能加载';
      notice.querySelector('p').textContent = '自动恢复未成功。请重新加载页面，或稍后再试。';
      notice.querySelector('button').hidden = false;
    }
  };
  if (document.readyState === 'complete') recover();
  else window.addEventListener('load', recover, { once: true });
}

function initHjPageRuntime() {
  if (window.__creamu_hj_runtime_ready) return;
  window.__creamu_hj_runtime_ready = true;
  const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
  let href = location.href;
  let timer;
  const refresh = () => {
    timer = null;
    const pageType = /^\/(?:es|search)\/?$/.test(location.pathname) ? 'search'
      : /^\/(?:homepage(?:\/|$)|user\/userinfo)/.test(location.pathname) ? 'profile'
      : isHjPostDetail() ? 'detail' : 'home';
    if (document.documentElement.dataset.hjPage !== pageType) document.documentElement.dataset.hjPage = pageType;
    if (href !== location.href) {
      href = location.href;
      if (window.__creamu_hj_media_cache.postIdentity !== currentHjPostId()) resetHjMediaForPost(currentHjPostId());
      window.__creamu_hj_restore_search?.();
    }
    window.__creamu_hj_refresh_sorter?.();
    refreshHjNavigation();
    closeHjLandingDialogs();
    refreshHjPostReading();
    if (isHjPostDetail()) embedHjUnlockedMediaInline();
  };
  const schedule = () => {
    if (!timer) timer = setTimeout(refresh, 80);
  };
  for (const method of ['pushState', 'replaceState']) {
    const original = pageWindow.history[method];
    pageWindow.history[method] = function (...args) {
      window.__creamu_hj_save_search?.();
      const result = original.apply(this, args);
      // Stop old media synchronously, before the next post can issue requests.
      const identity = currentHjPostId();
      if (window.__creamu_hj_media_cache.postIdentity !== identity) resetHjMediaForPost(identity);
      schedule();
      return result;
    };
  }
  window.addEventListener('popstate', () => {
    resetHjMediaForPost(currentHjPostId());
    schedule();
  });
  const owned = node => {
    const el = node.nodeType === 1 ? node : node.parentElement;
    return !!el?.closest('[id^="creamu-hj-"]');
  };
  const observer = new MutationObserver(records => {
    if (records.some(record => {
      if (owned(record.target)) return false;
      if (record.type === 'childList') return record.removedNodes.length || [...record.addedNodes].some(node => !owned(node));
      const element = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      return !!element?.closest(hjLandingDialogSelector + ', .el-dialog__wrapper');
    })) schedule();
  });
  observer.observe(document.body, { childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'], subtree: true });
  refresh();
}
// 50-boot.js

function bootCreamuHj() {
  if (!isHjSite() || window.top !== window.self || window.__creamu_hj_booted) return;
  window.__creamu_hj_booted = true;
  const core = initCreamuHjCore();
  if (typeof Hls === 'function') window.Hls = Hls;
  applyCreamuHjTheme();
  applyHjAdSanitizer();
  initHjSearchMemory();
  initHjFloatingSearch();
  initHjPostSorter();
  initHjPostReading();
  if (isHjPostDetail()) parseHjHiddenMedia();
  initHjPageRuntime();
  core.log('Boot completed.');
}

if (isHjSite() && window.top === window.self) {
  initHjStartupRecovery();
  resetHjMediaForPost(currentHjPostId());
  initHjNetworkInterceptor();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootCreamuHj);
} else {
  bootCreamuHj();
}
})();
