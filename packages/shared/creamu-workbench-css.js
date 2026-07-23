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
    const css = getCreamuWorkbenchCss() + (extra ? '\n' + extra : '');
    if (styleEl.textContent !== css) styleEl.textContent = css;
    return styleEl;
  }
