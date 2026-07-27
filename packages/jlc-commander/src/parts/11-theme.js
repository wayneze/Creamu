// @@creamu-part:11-theme
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
            display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
        }
        .jlc-resource-card {
            background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06);
            border-radius: 12px; padding: 14px; min-width: 0; min-height: 120px;
        }
        .jlc-resource-card[data-jlc-resource="magnet"] { grid-column: 1 / -1; }
        .jlc-resource-links {
            display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; align-items: start;
            margin: -2px 0 12px; padding: 8px 10px; border-radius: 8px;
            background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.06);
        }
        .jlc-resource-links-label {
            padding-top: 5px; color: #aaa; font-size: 11px; line-height: 1.2; white-space: nowrap;
        }
        .jlc-resource-links .jlc-resource-body { min-width: 0; gap: 0; }
        .jlc-resource-links .jlc-resource-chip-list { gap: 6px; }
        .jlc-resource-links .jlc-resource-chip {
            gap: 4px; padding: 4px 7px; border-radius: 6px; font-size: 11px; line-height: 1.2;
        }
        .jlc-resource-links .jlc-resource-chip small { display: none; }
        @media (max-width: 760px) {
            .jlc-resource-grid { grid-template-columns: minmax(0, 1fr); }
            .jlc-resource-card[data-jlc-resource="magnet"] { grid-column: auto; }
            .jlc-resource-links { grid-template-columns: minmax(0, 1fr); gap: 6px; }
            .jlc-resource-links-label { padding-top: 0; }
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
            display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: start;
            padding: 8px 10px; border-radius: 10px; background: rgba(0,0,0,.16);
        }
        .jlc-magnet-meta { min-width: 0; flex: 1 1 280px; }
        .jlc-magnet-title {
            color: #fff; font-size: 13px; line-height: 1.5; word-break: break-word;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .jlc-magnet-side {
            min-width: 0; flex: 0 1 320px; margin-left: auto;
            display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
        }
        .jlc-magnet-sub {
            color: #9f9f9f; font-size: 11px; line-height: 1.5; text-align: right;
            max-width: 320px;
        }
        .jlc-magnet-actions { display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end; }
        .jlc-magnet-actions button,
        .jlc-magnet-actions a {
            padding: 4px 7px; border-radius: 6px; font-size: 11px; line-height: 1.2; white-space: nowrap;
        }
        .jlc-resource-card[data-jlc-resource="magnet"] .jlc-resource-status {
            gap: 4px; padding: 4px 7px; font-size: 11px;
        }
        .jlc-resource-card[data-jlc-resource="magnet"] .jlc-resource-status strong { font-size: 11px; }
        .jlc-resource-card[data-jlc-resource="magnet"] .jlc-resource-status small { font-size: 10px; }
        .jlc-resource-card[data-jlc-resource="magnet"] .jlc-title-inline-button {
            padding: 4px 8px; border-radius: 6px; font-size: 11px;
        }
        @media (max-width: 720px) {
            .jlc-magnet-side { flex: 1 1 100%; margin-left: 0; align-items: flex-start; }
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
        .jlc-tracking-pagehint { font-size: 11px; color: #f6c36b; font-weight: 600; opacity: .92; }
        .jlc-status-pill, .jlc-site-pill {
            display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; padding: 2px 8px; font-size: 11px;
            border: 1px solid transparent;
        }
        .jlc-site-pill { background: rgba(255,255,255,.06); color: #d0d0d0; border-color: rgba(255,255,255,.08); }
        .jlc-status-pill.tone-gray { background: rgba(255,255,255,.06); color: #bbb; border-color: rgba(255,255,255,.08); }
        .jlc-status-pill.tone-green { background: rgba(34,197,94,.14); color: #86efac; border-color: rgba(34,197,94,.28); }
        .jlc-status-pill.tone-red { background: rgba(239,68,68,.16); color: #fca5a5; border-color: rgba(239,68,68,.3); }
        .jlc-status-pill.tone-yellow { background: rgba(250,204,21,.14); color: #fde68a; border-color: rgba(250,204,21,.28); }
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
        /* 防止断点浮钮残留节点挡住页面操作 */
        #jlc-tracking-breakpoint-finder { display: none !important; }
        @media (max-width: 820px) {
            #jlc-tracking-pagebar { align-items: flex-start; }
        }
        `);
    }
