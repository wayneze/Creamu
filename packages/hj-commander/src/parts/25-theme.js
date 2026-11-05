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
