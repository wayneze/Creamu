// @@creamu-part:11-theme
    function initCommanderStyles() {
        GM_addStyle(`
        :root {
            --jlc-bg: #f6f4ef; --jlc-surface: #fffdf9; --jlc-soft: #eee9e0;
            --jlc-text: #302c27; --jlc-muted: #70675d; --jlc-line: #e4ded3;
            --jlc-accent: #915733;
        }
        html.jlc-page { background: var(--jlc-bg); color-scheme: light; }
        html.jlc-page body {
            margin: 0 !important; padding: 0 28px 64px !important; min-width: 0 !important;
            width: auto !important; max-width: none !important; box-sizing: border-box;
            background: var(--jlc-bg) !important; color: var(--jlc-text);
            font: 14px/1.6 "Segoe UI", "Microsoft YaHei", sans-serif;
        }
        html.jlc-console-docked body { padding-right: calc(var(--jlc-dock-width) + 28px) !important; }
        #jlc-page-header {
            display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
            position: sticky; top: 0; z-index: 100; min-height: 76px; box-sizing: border-box;
            padding: 14px 0; margin-bottom: 24px; background: var(--jlc-bg);
            border-bottom: 1px solid var(--jlc-line); text-align: left;
        }
        #jlc-page-header .jlc-page-brand {
            display: flex; align-items: center; gap: 11px; flex-shrink: 0;
            color: var(--jlc-text); text-decoration: none; font: 600 26px/1 Georgia, serif;
        }
        #jlc-page-header .jlc-page-brand small {
            display: block; margin-top: 6px; color: var(--jlc-muted);
            font: 10px/1.2 "Segoe UI", sans-serif; letter-spacing: 1.8px; text-transform: uppercase;
        }
        #jlc-page-header .jlc-page-search {
            flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        }
        #jlc-page-header #topsearch, #jlc-page-header .jlc-page-search form {
            position: static; float: none; width: auto; height: auto; min-width: 0; max-width: 100%;
            margin: 0; padding: 0; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
            color: var(--jlc-text); background: transparent; font: inherit;
        }
        #jlc-page-header .jlc-page-search a { color: var(--jlc-accent); font: inherit; font-size: 12px; white-space: nowrap; }
        #jlc-page-header input:not([type=submit]):not([type=hidden]), #jlc-page-header select {
            min-width: 0; max-width: 100%; padding: 9px 12px; border-radius: 8px;
            border: 1px solid var(--jlc-line); background: var(--jlc-surface); color: var(--jlc-text); font: inherit;
        }
        #jlc-page-header input[type=submit] {
            padding: 9px 16px; background: var(--jlc-accent); color: white;
            border: 0; border-radius: 8px; font: inherit; cursor: pointer;
        }
        #jlc-page-header .jlc-page-tools { display: flex; align-items: center; gap: 8px; margin-left: auto; }
        #jlc-page-header .jlc-page-tools details { position: relative; font-size: 13px; }
        #jlc-page-header .jlc-page-tools summary { cursor: pointer; padding: 9px 10px; color: var(--jlc-muted); white-space: nowrap; }
        #jlc-page-header .jlc-native-account summary {
            background: var(--jlc-surface); border: 1px solid var(--jlc-line); border-radius: 8px; color: var(--jlc-text);
        }
        #jlc-page-header .jlc-page-tools summary:focus-visible,
        #jlc-page-header .jlc-page-tools a:focus-visible { outline: 2px solid var(--jlc-accent); outline-offset: 2px; }
        #jlc-page-header .jlc-page-tools details > div {
            position: absolute; right: 0; top: 100%; width: min(360px, calc(100vw - 32px));
            max-height: 70dvh; overflow: auto; padding: 18px; box-sizing: border-box;
            background: var(--jlc-surface); border: 1px solid var(--jlc-line); border-radius: 12px;
            box-shadow: 0 12px 32px #34261a18;
        }
        #jlc-page-header .jlc-page-tools .jlc-native-account > div { width: min(230px, calc(100vw - 32px)); padding: 10px; }
        #jlc-page-header :is(#leftmenu, #topmenu, .navbar, #navbar) {
            position: static !important; float: none !important; width: auto !important; min-width: 0 !important;
            height: auto !important; min-height: 0 !important;
            margin: 0 !important; padding: 0 !important; color: var(--jlc-text);
            background: transparent !important; border: 0 !important; box-shadow: none !important;
        }
        #jlc-page-header :is(#leftmenu, #topmenu) :is(ul, li, .menul1, .menul2),
        #jlc-page-header #topmenu :is(div, span) {
            display: block; position: static; float: none; width: auto; height: auto;
            margin: 0; padding: 0; border: 0; list-style: none; box-shadow: none;
            background: transparent; color: var(--jlc-text); font: inherit; text-align: left;
        }
        #jlc-page-header #leftmenu .menul1 {
            padding: 10px 10px 4px; color: var(--jlc-muted); font-size: 12px; font-weight: 600;
        }
        #jlc-page-header :is(#leftmenu, #topmenu) a {
            display: block; float: none; position: static; width: auto; height: auto;
            margin: 0; padding: 8px 10px; border: 0; border-radius: 6px;
            background: transparent; color: var(--jlc-text); font: inherit; text-decoration: none;
        }
        #jlc-page-header :is(#leftmenu, #topmenu) a:hover,
        #jlc-page-header :is(#leftmenu, #topmenu) a:focus-visible {
            background: var(--jlc-soft); color: var(--jlc-accent);
        }
        #jlc-page-header #topmenu { font: 13px/1.6 "Segoe UI", "Microsoft YaHei", sans-serif; text-align: left; }
        #jlc-page-header #topmenu a { font: inherit; }
        #jlc-page-header #topmenu a :is(span, strong) { display: inline; font: inherit; color: inherit; }
        #jlc-page-header #leftmenu > table { display: none; }
        html.jlc-page #toplogo { display: none; }
        html.jlc-page :is(#content, #rightcolumn, #maincontent) {
            width: auto !important; min-width: 0 !important; max-width: none !important;
            margin: 0 !important; padding: 0 !important; float: none !important;
            background: transparent !important; color: var(--jlc-text); border: 0 !important;
        }
        html.jlc-page body > .container, html.jlc-page main > .container,
        html.jlc-page .section > .container { width: 100% !important; max-width: 1500px; padding: 0; }
        html.jlc-page :is(.page_selector, .pagination, .pagination-list) {
            display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px;
            margin: 24px auto; padding: 0; list-style: none;
        }
        html.jlc-page :is(.page_selector, .pagination, .pagination-list) a {
            display: inline-block; border: 1px solid var(--jlc-line); border-radius: 7px;
            background: var(--jlc-surface); color: var(--jlc-text); padding: 7px 12px; text-decoration: none;
        }
        html.jlc-page #grid-b { container-type: inline-size; }
        html.jlc-page #grid-b .item-b { min-width: 0; box-sizing: border-box; }
        html.jlc-page #grid-b .box-b { font-size: 13px; }
        html.jlc-page #grid-b .box-b a { text-decoration: none; }
        html.jlc-page #grid-b .cover-b { position: relative; overflow: hidden; }
        html.jlc-page #grid-b .box-b .detail-b { display: flex; flex-direction: column; gap: 10px; }
        html.jlc-page #grid-b .info-bottom { display: contents; }
        html.jlc-page #grid-b .info-bottom-one { order: 0; }
        html.jlc-page #grid-b .info-bottom-two { order: 2; gap: 8px; }
        html.jlc-page #grid-b .box-b date:first-of-type { font-size: 15px !important; font-weight: 650; letter-spacing: .3px; }
        html.jlc-page #grid-b a[name=av-title] { order: 1; font-size: 13px; line-height: 1.6; color: var(--jlc-muted); }
        html.jlc-page :is(#rightcolumn > h3, #rightcolumn > h2, #rightcolumn .boxtitle) {
            display: block; position: static; float: none; clear: both; width: auto; height: auto; padding: 0;
            font: 600 22px/1.5 "Segoe UI", "Microsoft YaHei", sans-serif;
            color: var(--jlc-text); margin: 0 0 16px; text-align: left;
            background: transparent; border: 0; box-shadow: none;
        }
        html.jlc-page #rightcolumn .displaymode {
            width: 100%; margin: 0 0 18px; padding: 0; border: 0; border-spacing: 0;
            background: transparent; color: var(--jlc-muted); font: 13px/1.5 "Segoe UI", "Microsoft YaHei", sans-serif;
        }
        html.jlc-page #rightcolumn .displaymode tr {
            display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
        }
        html.jlc-page #rightcolumn .displaymode td { padding: 0; border: 0; background: transparent; }
        html.jlc-page #rightcolumn .displaymode .left {
            display: flex; align-items: center; gap: 8px; min-width: 0; max-width: 100%;
        }
        html.jlc-page #rightcolumn .displaymode select {
            min-width: 0; max-width: 100%; padding: 7px 10px; border: 1px solid var(--jlc-line);
            border-radius: 7px; background: var(--jlc-surface); color: var(--jlc-text); font: inherit;
        }
        html.jlc-page #rightcolumn .displaymode a {
            display: inline-block; padding: 7px 10px; border: 1px solid var(--jlc-line); border-radius: 7px;
            background: var(--jlc-surface); color: var(--jlc-accent); text-decoration: none;
        }
        html.jlc-page #rightcolumn .displaymode a:hover { background: var(--jlc-soft); }
        html.jlc-page #rightcolumn .displaymode :is(a, select):focus-visible {
            outline: 2px solid var(--jlc-accent); outline-offset: 2px;
        }
        @container (max-width: 680px) {
            html.jlc-page #grid-b .item-b { width: 50%; }
        }
        @container (max-width: 360px) {
            html.jlc-page #grid-b .item-b { width: 100%; }
        }
        #jlc-detail { max-width: 1500px; margin: 0 auto; container-type: inline-size; text-align: left; }
        #jlc-detail *, #jlc-page-header * { box-sizing: border-box; }
        #jlc-detail .jlc-detail-heading { margin: 0 0 24px; }
        #jlc-detail #video_title {
            margin: 0; padding: 0; border: 0; width: auto; background: transparent; text-align: left;
        }
        #jlc-detail .jlc-detail-eyebrow { color: var(--jlc-accent); font-size: 12px; letter-spacing: 2px; margin-bottom: 8px; }
        #jlc-detail .jlc-detail-heading :is(h1, h2, h3) {
            font: 600 25px/1.5 "Segoe UI", "Microsoft YaHei", sans-serif;
            color: var(--jlc-text); margin: 0; padding: 0; background: transparent;
        }
        #jlc-detail .jlc-detail-heading a { color: inherit; text-decoration: none; }
        #jlc-detail .jlc-detail-overview {
            display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
            gap: 22px; align-items: start; margin-bottom: 24px;
        }
        #jlc-detail .jlc-detail-overview:not(:has(.jlc-detail-artwork)) { grid-template-columns: 1fr; }
        #jlc-detail .jlc-detail-artwork {
            background: var(--jlc-soft); border: 1px solid var(--jlc-line); border-radius: 12px; overflow: hidden;
        }
        #jlc-detail .jlc-detail-artwork > * {
            display: block; width: 100% !important; max-width: none !important; padding: 0 !important; margin: 0 !important;
        }
        #jlc-detail .jlc-detail-artwork img {
            display: block; width: 100% !important; max-width: 100%; height: auto !important; object-fit: contain;
        }
        #jlc-detail .jlc-detail-facts {
            min-width: 0; background: var(--jlc-surface); border: 1px solid var(--jlc-line);
            border-radius: 12px; padding: 16px 18px; color: var(--jlc-text); overflow-wrap: anywhere;
        }
        #jlc-detail .jlc-detail-facts > * {
            width: 100% !important; float: none !important; margin: 0 !important; padding: 0 !important;
            background: transparent !important; color: inherit; border: 0;
        }
        #jlc-detail .jlc-detail-facts :is(table, tbody) { width: 100%; border: 0; border-spacing: 0; border-collapse: collapse; background: transparent; }
        #jlc-detail .jlc-detail-facts :is(td, th, .panel-block) {
            padding: 7px 0; background: transparent !important; color: var(--jlc-text); border: 0;
            border-bottom: 1px solid var(--jlc-line); font-size: 13px; line-height: 1.6;
        }
        #jlc-detail .jlc-detail-facts :is(td.header, .header, strong) { color: var(--jlc-muted); font-weight: 500; }
        #jlc-detail .jlc-detail-facts td.header {
            width: 86px; white-space: nowrap; padding-right: 12px; text-align: left; vertical-align: middle;
        }
        #jlc-detail #video_info .item { margin: 0; padding: 0; }
        #jlc-detail #video_info table { margin: 0; table-layout: fixed; }
        #jlc-detail #video_info td.text { font: inherit; font-size: 13px; text-align: left; }
        #jlc-detail #video_info td.icon { width: 18px; }
        #jlc-detail #video_info :is(.cast, .genre) { background: transparent; border: 0; padding: 0; }
        #jlc-detail #video_genres .genre {
            display: inline-block; margin: 2px 6px 2px 0; padding: 2px 7px;
            border-radius: 5px; background: var(--jlc-soft); font-size: 12px;
        }
        #jlc-detail .jlc-detail-facts a { color: var(--jlc-accent); text-decoration: none; }
        #jlc-detail .jlc-detail-facts a:hover { text-decoration: underline; }
        #jlc-detail .jlc-detail-facts p { margin: 0; padding: 8px 0; border-bottom: 1px solid var(--jlc-line); }
        #jlc-detail #video_cast .cast {
            display: inline-flex; align-items: center; flex-wrap: wrap; max-width: 100%;
            margin: 2px 8px 2px 0; vertical-align: top;
        }
        #jlc-detail #video_cast .star { display: inline-flex; align-items: center; max-width: 100%; vertical-align: middle; }
        #jlc-detail #video_cast .star a { min-width: 0; }
        #jlc-detail #video_cast .star .jlc-detail-copy-btn { flex-shrink: 0; }
        #jlc-detail :is(.icn_favstar, .icn_favdirector, .icn_favmaker, .icn_favlabel) {
            display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box;
            width: 26px; height: 26px; margin: 0 4px; vertical-align: middle;
            border: 1px solid var(--jlc-line); border-radius: 7px; cursor: pointer;
            background: var(--jlc-surface); color: var(--jlc-muted);
        }
        /* Keep the native span as the event target: JavLibrary reads its ID on click. */
        #jlc-detail :is(.icn_favstar, .icn_favdirector, .icn_favmaker, .icn_favlabel)::before {
            content: ""; width: 14px; height: 14px; pointer-events: none;
            background: currentColor;
            mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / contain no-repeat;
        }
        #jlc-detail :is(.icn_favstar, .icn_favdirector, .icn_favmaker, .icn_favlabel):hover {
            background: var(--jlc-soft); border-color: #c6b7a8; color: var(--jlc-accent);
        }
        #jlc-detail .jlc-detail-sections {
            display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
            border-bottom: 1px solid var(--jlc-line); padding: 12px 0; margin-bottom: 24px;
        }
        #jlc-detail .jlc-detail-sections a { font-size: 13px; color: var(--jlc-muted); text-decoration: none; }
        #jlc-detail .jlc-detail-sections a:hover { color: var(--jlc-accent); }
        #jlc-detail .jlc-detail-sections button {
            margin-left: auto; padding: 8px 12px; font: inherit; font-size: 12px;
            color: var(--jlc-accent); background: var(--jlc-surface); border: 1px solid var(--jlc-line);
            border-radius: 8px; cursor: pointer;
        }
        #jlc-detail .jlc-resource-center { padding: 0; border: 0; background: transparent; }
        #jlc-detail .jlc-resource-header { margin-bottom: 20px; }
        #jlc-detail .jlc-resource-links { margin-bottom: 20px; }
        #jlc-detail .jlc-resource-card { padding: 18px; scroll-margin-top: 100px; }
        #jlc-detail .jlc-resource-title { font-size: 21px; font-weight: 600; }
        .jlc-resource-sources { order: 10; border-top: 1px solid var(--jlc-line); padding-top: 10px; }
        .jlc-resource-sources summary { color: var(--jlc-muted); cursor: pointer; font-size: 12px; padding: 4px 0; }
        .jlc-resource-sources[open] .jlc-resource-status-list { padding-top: 10px; }
        #jlc-detail .jlc-detail-facts button:not(.jlc-detail-copy-btn),
        #jlc-detail .jlc-detail-facts :is(input[type=button], input[type=submit]) {
            background: var(--jlc-soft); color: var(--jlc-text); border: 1px solid var(--jlc-line);
            border-radius: 7px; padding: 7px 12px; font: inherit; cursor: pointer; margin-top: 8px;
        }
        #jlc-detail .jlc-detail-facts #video_favorite_edit {
            display: grid; gap: 8px; padding-top: 14px !important; text-align: left;
        }
        #jlc-detail #video_favorite_edit .favoritetype {
            display: grid; grid-template-columns: 108px minmax(0, 1fr); align-items: center; gap: 10px;
            margin: 0; padding: 0; color: var(--jlc-muted); font-size: 11px; line-height: 1.6;
        }
        #jlc-detail #video_favorite_edit button {
            width: 100%; min-height: 32px; padding: 6px 8px; margin: 0;
            background: var(--jlc-surface); color: var(--jlc-accent); font-size: 12px; line-height: 1.5;
        }
        #jlc-detail #video_favorite_edit button.smalldarkbutton {
            background: var(--jlc-accent); border-color: var(--jlc-accent); color: #fff;
        }
        #jlc-detail #video_favorite_edit button.hidden { display: none; }
        #jlc-detail #video_favorite_edit button:hover { border-color: var(--jlc-accent); }
        #jlc-detail #video_favorite_edit button:focus-visible { outline: 2px solid var(--jlc-accent); outline-offset: 2px; }
        @container (max-width: 760px) {
            #jlc-detail .jlc-detail-overview { grid-template-columns: 1fr; gap: 16px; }
            #jlc-detail .jlc-resource-grid { grid-template-columns: 1fr; }
            #jlc-detail .jlc-detail-heading :is(h1,h2,h3) { font-size: 21px; }
        }
        @media (max-width: 820px) {
            html.jlc-page body { padding: 0 16px 60px !important; }
            #jlc-page-header { gap: 14px; margin-bottom: 20px; }
            #jlc-page-header .jlc-page-tools details { position: static; }
            #jlc-page-header .jlc-page-tools details > div { top: 100%; }
            #jlc-page-header .jlc-page-search:not(:empty) { order: 3; flex-basis: 100%; }
            #jlc-detail .jlc-detail-sections { gap: 16px; }
        }
        @media (prefers-reduced-motion: reduce) {
            html.jlc-page #grid-b .item-b, html.jlc-page #grid-b .box-b { animation: none !important; transition: none !important; }
        }
        :is(.jlc-resource-center, #jlc-tracking-pagebar) { font-family: "Segoe UI", "Microsoft YaHei", sans-serif; color-scheme: light; }
        .jlc-resource-center :focus-visible { outline: 2px solid var(--jlc-accent); outline-offset: 3px; }

        .jlc-resource-center {
            margin: 18px 0; padding: 16px; border-radius: 14px;
            background: var(--jlc-bg);
            color: var(--jlc-text); border: 1px solid var(--jlc-line);
            box-shadow: none;
        }
        .jlc-resource-header {
            display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
            margin-bottom: 14px; flex-wrap: wrap;
        }
        .scrollBarHide { overflow: hidden; }
        .jlc-resource-title { font-size: 18px; font-weight: 700; color: var(--jlc-text); }
        .jlc-resource-subtitle { font-size: 12px; color: var(--jlc-muted); margin-top: 4px; }
        .jlc-resource-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .jlc-resource-header-actions button,
        .jlc-resource-inline-actions a,
        .jlc-resource-inline-actions button,
        .jlc-magnet-actions button,
        .jlc-magnet-actions a {
            appearance: none; border: 1px solid var(--jlc-line); background: var(--jlc-surface);
            color: var(--jlc-text); border-radius: 8px; padding: 8px 12px; cursor: pointer;
            text-decoration: none; font-size: 12px; line-height: 1.2;
        }
        .jlc-resource-header-actions button:hover,
        .jlc-resource-inline-actions a:hover,
        .jlc-resource-inline-actions button:hover,
        .jlc-magnet-actions button:hover,
        .jlc-magnet-actions a:hover {
            background: var(--jlc-soft); border-color: #c6b7a8;
        }
        .jlc-resource-grid {
            display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
        }
        .jlc-resource-card {
            background: var(--jlc-surface); border: 1px solid var(--jlc-line);
            border-radius: 12px; padding: 14px; min-width: 0; min-height: 120px;
        }
        .jlc-resource-card[data-jlc-resource="magnet"],
        .jlc-resource-card[data-jlc-resource="subtitle"] { grid-column: 1 / -1; }
        .jlc-resource-links {
            display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; align-items: start;
            margin: -2px 0 12px; padding: 8px 10px; border-radius: 8px;
            background: var(--jlc-surface); border: 1px solid var(--jlc-line);
        }
        .jlc-resource-links-label {
            padding-top: 5px; color: var(--jlc-muted); font-size: 11px; line-height: 1.2; white-space: nowrap;
        }
        .jlc-resource-links .jlc-resource-body { min-width: 0; gap: 0; }
        .jlc-resource-links .jlc-resource-chip-list { gap: 6px; }
        .jlc-resource-links .jlc-resource-chip {
            gap: 4px; padding: 4px 7px; border-radius: 6px; font-size: 11px; line-height: 1.2;
        }
        .jlc-resource-links .jlc-resource-chip small { display: none; }
        @media (max-width: 760px) {
            .jlc-resource-grid { grid-template-columns: minmax(0, 1fr); }
            .jlc-resource-card[data-jlc-resource="magnet"],
            .jlc-resource-card[data-jlc-resource="subtitle"] { grid-column: auto; }
            .jlc-resource-links { grid-template-columns: minmax(0, 1fr); gap: 6px; }
            .jlc-resource-links-label { padding-top: 0; }
        }
        .jlc-resource-card h3 { margin: 0 0 10px; font-size: 14px; color: var(--jlc-text); }
        .jlc-resource-card-titlebar {
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
            margin-bottom: 10px;
        }
        .jlc-resource-card-titlebar h3 { margin: 0; }
        .jlc-resource-card-tools {
            display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }
        .jlc-title-inline-button {
            appearance: none; border: 1px solid var(--jlc-line); background: var(--jlc-surface);
            color: var(--jlc-text); border-radius: 999px; padding: 5px 11px; cursor: pointer;
            font-size: 12px; line-height: 1.2;
        }
        .jlc-title-inline-button:hover { background: var(--jlc-soft); border-color: #c6b7a8; }
        .jlc-title-inline-button[disabled] { opacity: .65; cursor: wait; }
        .jlc-resource-body { display: flex; flex-direction: column; gap: 10px; }
        .jlc-resource-chip-list,
        .jlc-resource-status-list,
        .jlc-resource-inline-actions {
            display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
        }
        .jlc-resource-chip {
            display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px;
            border-radius: 999px; background: var(--jlc-surface); color: var(--jlc-text) !important;
            text-decoration: none; font-size: 12px; border: 1px solid var(--jlc-line);
        }
        .jlc-resource-chip:hover { background: var(--jlc-soft); }
        .jlc-resource-status {
            display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px;
            border-radius: 999px; font-size: 12px; line-height: 1.2; text-decoration: none;
            background: var(--jlc-surface); border: 1px solid var(--jlc-line); color: var(--jlc-text);
        }
        .jlc-resource-status:hover { background: var(--jlc-soft); }
        button.jlc-resource-status {
            appearance: none; cursor: pointer; font: inherit;
        }
        .jlc-resource-status strong { color: inherit; font-size: 12px; }
        .jlc-resource-status small { color: var(--jlc-muted); }
        .jlc-resource-status.is-active-filter {
            box-shadow: 0 0 0 2px #ddc0a6;
        }
        .jlc-resource-status.is-pending { color: var(--jlc-muted); border-color: var(--jlc-line); }

        .jlc-resource-status.is-ok { color: #286346; border-color: #bed4c3; background: #edf5ef; }
        .jlc-resource-status.is-partial { color: #805a1c; border-color: #ddc89b; background: #faf2df; }
        .jlc-resource-status.is-blocked,
        .jlc-resource-status.is-error { color: #a13f35; border-color: #e4c0b9; background: #fcf0ed; }
        .jlc-resource-status.is-empty { color: var(--jlc-muted); border-color: var(--jlc-line); background: var(--jlc-surface); }
        .jlc-resource-note,
        .jlc-resource-empty,
        .jlc-resource-loading {
            font-size: 12px; line-height: 1.6; color: var(--jlc-muted);
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
            background: #000; border: 1px solid var(--jlc-line);
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
            background: var(--jlc-accent); border-color: transparent; color: #fff;
        }
        .jlc-trailer-overlay {
            position: fixed; inset: 0; z-index: 100000; display: none; align-items: center; justify-content: center;
            padding: 24px; background: rgba(0,0,0,.78);
        }
        .jlc-trailer-overlay.is-open { display: flex; }
        .jlc-trailer-dialog {
            width: min(1040px, 94vw); background: var(--jlc-surface); border-radius: 16px; padding: 18px;
            border: 1px solid var(--jlc-line); box-shadow: 0 20px 60px rgba(0,0,0,.5); position: relative;
        }
        .jlc-trailer-dialog-head {
            display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 12px;
            color: var(--jlc-text); flex-wrap: wrap;
        }
        .jlc-trailer-dialog-head small { color: var(--jlc-muted); font-size: 12px; }
        .jlc-trailer-close {
            position: absolute; top: 10px; right: 10px; width: 36px; height: 36px; border-radius: 999px;
            background: var(--jlc-surface); color: var(--jlc-text); font-size: 22px; line-height: 1; border: 1px solid var(--jlc-line);
        }
        .jlc-trailer-close:hover { background: var(--jlc-soft); }
        .jlc-trailer-dialog-actions {
            display: flex; justify-content: flex-end; margin-top: 12px;
        }
        .jlc-trailer-dialog-actions a {
            color: var(--jlc-text); text-decoration: none; font-size: 12px; padding: 8px 12px;
            border-radius: 8px; background: var(--jlc-surface); border: 1px solid var(--jlc-line);
        }
        .jlc-trailer-dialog-actions a:hover { background: var(--jlc-soft); }
        .jlc-resource-panel-slot {
            min-height: 48px; border-radius: 10px; background: var(--jlc-soft); padding: 10px;
        }
        .jlc-inline-screenshot-panel {
            position: relative; min-height: 0 !important; background: var(--jlc-surface); border-radius: 10px;
            padding: 12px; overflow: hidden;
        }
        .jlc-inline-screenshot-panel ul {
            list-style: none; margin: 0 0 12px; padding: 0; display: flex; flex-wrap: wrap; gap: 8px;
        }
        .jlc-inline-screenshot-panel .imgResult-li {
            font-size: 13px; line-height: 1.4; padding: 6px 10px; border-radius: 999px;
            background: var(--jlc-surface);
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
            background: #c9b9a8; border-radius: 999px;
        }
        .jlc-magnet-row {
            display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: start;
            padding: 8px 10px; border-radius: 10px; background: var(--jlc-soft);
        }
        .jlc-magnet-meta { min-width: 0; flex: 1 1 280px; }
        .jlc-magnet-title {
            color: var(--jlc-text); font-size: 13px; line-height: 1.5; word-break: break-word;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .jlc-magnet-side {
            min-width: 0; flex: 0 1 320px; margin-left: auto;
            display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
        }
        .jlc-magnet-sub {
            color: var(--jlc-muted); font-size: 11px; line-height: 1.5; text-align: right;
            max-width: 320px;
        }
        .jlc-magnet-actions { display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end; }
        .jlc-magnet-actions button,
        .jlc-magnet-actions a {
            padding: 4px 7px; border-radius: 6px; font-size: 11px; line-height: 1.2; white-space: nowrap;
        }
        .jlc-resource-card[data-jlc-resource="magnet"] .jlc-resource-status,
        .jlc-resource-card[data-jlc-resource="subtitle"] .jlc-resource-status {
            gap: 4px; padding: 4px 7px; font-size: 11px;
        }
        .jlc-resource-card[data-jlc-resource="magnet"] .jlc-resource-status strong,
        .jlc-resource-card[data-jlc-resource="subtitle"] .jlc-resource-status strong { font-size: 11px; }
        .jlc-resource-card[data-jlc-resource="magnet"] .jlc-resource-status small,
        .jlc-resource-card[data-jlc-resource="subtitle"] .jlc-resource-status small { font-size: 10px; }
        .jlc-resource-card[data-jlc-resource="magnet"] .jlc-title-inline-button,
        .jlc-resource-card[data-jlc-resource="subtitle"] .jlc-title-inline-button {
            padding: 4px 8px; border-radius: 6px; font-size: 11px;
        }
        @media (max-width: 720px) {
            .jlc-magnet-side { flex: 1 1 100%; margin-left: 0; align-items: flex-start; }
            .jlc-magnet-sub { max-width: none; text-align: left; }
            .jlc-magnet-actions { justify-content: flex-start; }
        }

        /* 卡片增强 */
        .item-b { position: relative !important; isolation: isolate; }
        .item-b .box-b { transition: border-color .15s, box-shadow .15s !important; }
        .item-b.visited-item .box-b { outline: 3px solid #666 !important; outline-offset: -2px; }
        .item-b.visited-item .cover-b::after {
            content: ""; position: absolute; inset: 0; z-index: 1;
            background: rgb(0 0 0 / 16%); pointer-events: none;
        }
        .item-b.liked-item .box-b,
        .item-b.preference-match-item:where(:not(.hated-item)) .box-b {
            outline: 4px solid #ffcc00 !important; outline-offset: -2px; box-shadow: 0 0 25px #ffcc0055 !important;
        }
        .item-b.emby-item .box-b { outline: 4px solid #52b54b !important; outline-offset: -2px; box-shadow: 0 0 20px #52b54b55 !important; }
        .item-b.hated-item .cover-b { opacity: .15; filter: grayscale(1); }
        .item-b.hated-item .cover-b a, .item-b.hated-item a[name=av-title] { pointer-events: none; }

        /* 勋章 / 标签 */
        .jlc-badge-container {
            position: absolute; top: 8px; left: 8px; display: flex;
            flex-direction: column; gap: 5px; z-index: 2; pointer-events: none;
            max-height: calc(100% - 16px); max-width: calc(100% - 16px);
        }
        .jlc-badge {
            padding: 4px 10px; font-size: 11px; font-weight: bold; border-radius: 4px;
            color: white !important; box-shadow: 0 1px 3px #0001;
            white-space: nowrap; width: fit-content; text-transform: uppercase;
            text-shadow: 0 1px 2px #0008; flex-shrink: 0;
        }
        .b-fav { background: rgba(145, 87, 51, .68) !important; }
        .b-preference { background: rgba(138, 101, 0, .68); }
        .b-person { background: rgba(66, 101, 125, .68) !important; }
        .meta-overlay-box {
            display: flex; flex-direction: column; align-items: flex-start; gap: 3px;
            max-width: 140px; min-height: 0; margin-top: 2px; pointer-events: auto;
            overflow: auto; overscroll-behavior: contain; scrollbar-width: thin;
            scrollbar-color: #70675d66 transparent;
        }
        .meta-tag {
            appearance: none; display: block; min-width: 0; min-height: 0; margin: 0;
            padding: 3px 7px; border-radius: 4px;
            background: rgba(0,0,0,.52); color: #fff; border: 1px solid rgba(255,255,255,.12);
            font: 10px/1.15 "Segoe UI", "Microsoft YaHei", sans-serif; box-shadow: none;
            text-shadow: 0 1px 2px #0008; white-space: nowrap;
            max-width: 100%; flex-shrink: 0; pointer-events: auto; cursor: pointer;
            overflow: hidden; text-overflow: ellipsis; text-align: left;
            user-select: none; -webkit-touch-callout: none;
        }
        button.meta-tag:hover { border-color: #ffffff99; }
        button.meta-tag:focus-visible { outline: 2px solid white; outline-offset: -2px; }
        #jlc-meta-tag-menu {
            position: fixed; inset: auto; margin: 0; padding: 4px; max-width: calc(100vw - 16px);
            border: 1px solid var(--jlc-line); border-radius: 8px; background: var(--jlc-surface);
            color: var(--jlc-text); box-shadow: 0 4px 16px #302c2726; font: 13px "Segoe UI", "Microsoft YaHei", sans-serif;
        }
        #jlc-meta-tag-menu button {
            appearance: none; display: block; width: 100%; text-align: left;
            padding: 10px 12px; border: 0; border-radius: 5px; margin: 0;
            color: inherit; background: transparent; font: inherit; cursor: pointer;
        }
        #jlc-meta-tag-menu button:hover:not(:disabled) { background: var(--jlc-soft); }
        #jlc-meta-tag-menu button:disabled { color: var(--jlc-muted); cursor: default; }
        #jlc-meta-tag-menu button:focus-visible { outline: 2px solid var(--jlc-accent); outline-offset: -2px; }
        #jlc-wb .jlc-hidden-meta-tags { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 0; }
        #jlc-wb .jlc-hidden-meta-tags button { max-width: 100%; white-space: normal; overflow-wrap: anywhere; text-align: left; }
        .meta-tag.hot {
            background: rgba(145, 87, 51, .68) !important;
            color: #fff !important; font-weight: 600; border-color: rgba(189, 140, 102, .35);
        }
        .meta-tag.more {
            background: rgba(20,20,20,.46) !important; pointer-events: none; cursor: default;
        }
        .jlc-detail-cover-host { position: relative !important; isolation: isolate; }
        .jlc-detail-badge-container {
            position: absolute; top: 10px; left: 10px; z-index: 2; pointer-events: none;
            max-width: min(52%, 220px); max-height: calc(100% - 20px);
        }
        .jlc-detail-badge-container .meta-overlay-box { max-width: min(100%, 200px); }
        .jlc-detail-copy-btn {
            appearance: none; border: 1px solid var(--jlc-line); background: var(--jlc-surface);
            color: var(--jlc-text); border-radius: 7px; width: 28px; height: 28px; padding: 0;
            margin-left: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
            vertical-align: middle; line-height: 1; box-shadow: none;
        }
        .jlc-detail-copy-btn:hover { background: var(--jlc-soft); border-color: #c6b7a8; }
        .jlc-detail-copy-btn:focus-visible { outline: 2px solid var(--jlc-accent); outline-offset: 2px; }
        .jlc-detail-copy-btn[data-jlc-copy-key="cast"] { margin: 0 8px 0 4px; }
        .jlc-detail-copy-btn svg { width: 14px; height: 14px; pointer-events: none; }
        #video_title .jlc-detail-copy-btn,
        h2 .jlc-detail-copy-btn,
        h3 .jlc-detail-copy-btn { margin-left: 10px; }

        /* One primary action; secondary tools expand within the card. */
        #grid-b .toolbar-b { position: relative; width: 100%; padding: 0; }
        #grid-b .toolbar-b button, #grid-b .jlc-card-more summary {
            appearance: none; display: inline-flex; align-items: center; justify-content: center;
            min-height: 32px; padding: 6px 10px; margin: 0; border: 0; border-radius: 6px;
            background: transparent; color: var(--jlc-muted); cursor: pointer;
            font: 12px/1.5 "Segoe UI", "Microsoft YaHei", sans-serif; text-align: center;
        }
        #grid-b .toolbar-b > .j-bm { position: absolute; left: 0; top: 0; color: var(--jlc-accent); }
        #grid-b .jlc-card-more summary { display: block; width: max-content; margin-left: auto; list-style: none; }
        #grid-b .jlc-card-more summary::-webkit-details-marker { display: none; }
        #grid-b .jlc-card-more summary::after { content: '⌄'; margin-left: 6px; }
        #grid-b .jlc-card-more[open] summary::after { content: '⌃'; }
        #grid-b .jlc-card-menu { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; padding-top: 8px; }
        #grid-b .jlc-card-menu button { background: var(--jlc-bg); }
        #grid-b .toolbar-b button:hover, #grid-b .jlc-card-more summary:hover { color: var(--jlc-accent); background: var(--jlc-soft); }
        #grid-b .toolbar-b :is(button, summary):focus-visible { outline: 2px solid var(--jlc-accent); outline-offset: 1px; }
        #grid-b .toolbar-b button:disabled { opacity: .5; cursor: wait; }
        #grid-b .toolbar-b .active-like { color: var(--jlc-accent); background: var(--jlc-soft); }
        #grid-b .toolbar-b .active-hate { color: #a13f35; background: #f7e6e2; }
        #grid-b .toolbar-b > .active-bookmark { color: var(--jlc-accent); background: var(--jlc-soft); }
        #grid-b .item-tag:empty { display: none; }
        #grid-b .avid-link-b { display: inline-flex !important; align-items: center; gap: 8px; flex-wrap: wrap; }
        #grid-b .avid-line-b { display: inline-flex; align-items: center; gap: 2px; }
        #grid-b .avid-date-badge,
        .avid-date-badge[data-jlc-detail-date="1"] {
            display: inline-block; padding: 1px 6px; border-radius: 999px;
            background: rgba(0,0,0,.08); border: 1px solid rgba(0,0,0,.12);
            color: #666; font-size: 11px; line-height: 1.4; white-space: nowrap;
        }
        .avid-date-badge[data-jlc-detail-date="1"] { margin-left: 8px; }
        #grid-b .jlc-placeholder-cover {
            width: auto !important; max-width: 72% !important; max-height: 120px !important;
            height: auto !important; object-fit: contain; margin: 12px auto !important; opacity: .92;
        }
        #grid-b .minHeight-96 { min-height: 96px; }
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
        .jlc-tracking-pagehint { font-size: 11px; color: var(--jlc-muted); font-weight: 600; }
        .jlc-status-pill, .jlc-site-pill {
            display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; padding: 2px 8px; font-size: 11px;
            border: 1px solid transparent;
        }
        .jlc-site-pill, .jlc-status-pill.tone-gray { background: var(--jlc-soft); color: var(--jlc-muted); border-color: var(--jlc-line); }
        .jlc-status-pill.tone-green { background: #edf5ef; color: #286346; border-color: #bed4c3; }
        .jlc-status-pill.tone-red { background: #fcf0ed; color: #a13f35; border-color: #e4c0b9; }
        .jlc-status-pill.tone-yellow { background: #faf2df; color: #805a1c; border-color: #ddc89b; }
        #jlc-tracking-pagebar {
            display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
            margin: 10px 5px 14px; padding: 12px 14px; border-radius: 12px;
            background: var(--jlc-surface); border: 1px solid var(--jlc-line); color: var(--jlc-text);
            box-shadow: none;
        }
        #jlc-tracking-pagebar .jlc-tracking-pagebar-main { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
        #jlc-tracking-pagebar .jlc-tracking-pagebar-title { font-size: 14px; font-weight: 700; }
        #jlc-tracking-pagebar .jlc-tracking-pagehint { color: var(--jlc-muted); font-size: 11px; font-weight: 550; }
        #jlc-tracking-pagebar .jlc-tracking-pagebar-meta { color: var(--jlc-muted); font-size: 12px; line-height: 1.5; display: flex; flex-wrap: wrap; gap: 8px; }
        #jlc-tracking-pagebar .jlc-tracking-pagebar-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        /* 继续断点：与断点红框同色系，常用操作要一眼能扫到 */
        #jlc-tracking-pagebar .jlc-bp-continue,
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button.jlc-bp-continue {
            appearance: none; border: 0; cursor: pointer;
            background: #a13f35; color: #fff !important;
            border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600;
            box-shadow: none;
            letter-spacing: .2px;
        }
        #jlc-tracking-pagebar .jlc-bp-continue:hover,
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button.jlc-bp-continue:hover {
            filter: brightness(1.06);
        }
        #jlc-tracking-pagebar .jlc-bp-continue:active,
        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button.jlc-bp-continue:active {
            filter: brightness(.95);
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
        /* 防止断点浮钮残留节点挡住页面操作 */
        #jlc-tracking-breakpoint-finder { display: none !important; }
        @media (max-width: 820px) {
            #jlc-tracking-pagebar { align-items: flex-start; }
        }
        `);
    }
