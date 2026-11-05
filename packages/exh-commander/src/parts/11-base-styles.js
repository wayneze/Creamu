
  function injectBaseStyles() {
    if (typeof injectCreamuWorkbenchStyles !== 'function') {
      console.warn('[Creamu·ExH] workbench styles unavailable');
      return;
    }
    injectCreamuWorkbenchStyles({
      styleId: 'jlc-wb-style-exc',
      extraCss: `
        html {
            --exc-page-bg: #e5e2d9;
            --exc-surface: #efede5;
            --exc-muted-surface: #e1ded4;
            --exc-line: #ced0c4;
        }


        :where(#jlc-wb, #jlc-wb-fab, #exc-wb-dialog, #jlc-wb-dialog, #exc-tracking-bar, #exc-gallery-panel, #exc-hover-preview) {
            --creamu-wb-bg: var(--exc-page-bg);
            --creamu-wb-surface: var(--exc-surface);
            --creamu-wb-surface-soft: var(--exc-page-bg);
            --creamu-wb-surface-muted: var(--exc-muted-surface);
            --creamu-wb-surface-raised: var(--exc-surface);
            --creamu-wb-text: #353832;
            --creamu-wb-text-strong: #353832;
            --creamu-wb-title: #292e29;
            --creamu-wb-text-muted: #697065;
            --creamu-wb-text-subtle: #697065;
            --creamu-wb-secondary-ink: #697065;
            --creamu-wb-border: var(--exc-line);
            --creamu-wb-border-strong: #c9cdc1;
            --creamu-wb-divider: var(--exc-line);
            --creamu-wb-card-border: var(--exc-line);
            --creamu-wb-card-hover-border: #b4bca7;
            --creamu-wb-inset-surface: var(--exc-muted-surface);
            --creamu-wb-accent: #526347;
            --creamu-wb-accent-light: #526347;
            --creamu-wb-accent-dark: #3f5035;
            --creamu-wb-accent-hover: #3f5035;
            --creamu-wb-accent-ring: #b8c5ac;
            --creamu-wb-accent-overlay: #52634724;
            --creamu-wb-accent-overlay-soft: #52634714;
            --creamu-wb-control-radius: 8px;
            --creamu-wb-panel-radius: 16px;
            --creamu-wb-card-radius: 10px;
            --creamu-wb-control-elevation: none;
            --creamu-wb-card-elevation: none;
            --creamu-wb-card-hover-elevation: 0 3px 12px #292e290a;
            --creamu-wb-focus-elevation: 0 0 0 2px #b8c5ac;
            --creamu-wb-focus-surface: #f3f6ef;
            color-scheme: light;
        }
        html.exc-console-docked body { padding-right: calc(var(--exc-dock-width) + 16px) !important; box-sizing: border-box; min-width: 0 !important; }
        html.exc-console-docked .ido { min-width: 0 !important; max-width: 100%; }
        #jlc-wb-fab {
            width: auto; min-width: 110px; height: 44px; padding: 0 13px 0 8px; gap: 8px;
            border: 1px solid var(--exc-line) !important; border-radius: 12px;
            background: var(--exc-surface) !important; color: #353832 !important;
            box-shadow: 0 4px 20px #292e2920 !important; font: 600 13px/1.2 'Segoe UI', 'Microsoft YaHei', sans-serif;
            bottom: max(20px, env(safe-area-inset-bottom)); right: 20px;
        }
        #jlc-wb-fab:active, #jlc-wb-fab.is-dragging { transform: none; }
        #jlc-wb-fab.is-panel-open { visibility: hidden; pointer-events: none; }
        #jlc-wb-fab .exc-brand-mark { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px 8px 8px 3px; background: #526347; color: white; font: bold 22px/1 Georgia, serif; }
        #jlc-wb-fab .jlc-wb-fab-badge { background: #526347; border-color: var(--exc-surface); }
        #jlc-wb { min-width: 0; min-height: 0; text-align: left; outline: none; box-shadow: 0 16px 50px #292e2926; }
        #jlc-wb :is(button, input, select, textarea) { font-family: inherit; }
        #jlc-wb [hidden] { display: none !important; }
        #jlc-wb :focus-visible, #jlc-wb-fab:focus-visible, .exc-tool-btn:focus-visible, .exc-meta-act:focus-visible, .exc-fold-tag:focus-visible { outline: 2px solid #758f61; outline-offset: 2px; }
        #jlc-wb .jlc-wb-header { padding: 12px 16px 8px; background: var(--exc-surface); align-items: flex-start; }
        #jlc-wb .exc-wb-brand { min-width: 0; }
        #jlc-wb .jlc-wb-title { font-size: 18px; font-weight: 650; letter-spacing: 0; white-space: nowrap; }
        #jlc-wb .jlc-wb-subtitle { font-size: 11px; line-height: 1.5; }
        #jlc-wb .jlc-wb-header-actions { flex-wrap: nowrap; gap: 6px; }
        #jlc-wb .jlc-wb-header-actions .jlc-wb-btn { padding: 8px 10px; }
        #jlc-wb .jlc-wb-icon-btn { border-radius: 8px; }
        #jlc-wb .jlc-wb-nav { padding: 0 16px; gap: 24px; background: var(--exc-surface); border-bottom: 1px solid var(--exc-line); }
        #jlc-wb .jlc-wb-nav button { flex: 0 1 auto; padding: 8px 2px; border-radius: 0; background: transparent; border-bottom: 2px solid transparent; }
        #jlc-wb .jlc-wb-nav button.active { background: transparent; color: #526347; border-bottom-color: #526347; box-shadow: none; }
        #jlc-wb .jlc-wb-toolbar { padding-top: 10px; }
        #jlc-wb .jlc-wb-footer { background: var(--exc-surface); padding: 12px 14px; gap: 8px; }
        #jlc-wb .jlc-wb-footer-summary { max-width: none; width: 100%; font-size: 11.5px; }
        #jlc-wb .jlc-wb-footer-actions { width: 100%; gap: 6px; }
        #jlc-wb .jlc-wb-footer-actions .jlc-wb-btn { padding: 8px 10px; }
        #jlc-wb #exc-sync-all { margin-left: auto; }
        #jlc-wb .jlc-wb-settings { background: var(--exc-page-bg); }
        #jlc-wb .jlc-wb-settings-panel { background: var(--exc-page-bg); width: 100%; border: 0; }
        #jlc-wb .jlc-wb-settings-head { background: var(--exc-surface); }
        #jlc-wb .jlc-wb-settings-nav { gap: 4px; }
        #jlc-wb .jlc-wb-settings-nav button { border-radius: 8px; }
        #jlc-wb.is-docked { border-radius: 0; border-width: 0 0 0 1px; box-shadow: -6px 0 24px #292e2908; }
        #jlc-wb.is-mobile { border-radius: 16px 16px 0 0; padding-bottom: env(safe-area-inset-bottom); }
        #jlc-wb:is(.is-docked, .is-mobile) .jlc-wb-header { cursor: default; }
        #jlc-wb:is(.is-docked, .is-mobile) :is(.jlc-wb-resize-w, .jlc-wb-resize-h, .jlc-wb-resize-corner) { display: none; }

        /* 封面承载半透明标记；紧凑列表在标题下正常排版。 */
        .exc-cover-host, .exc-gl-item { position: relative !important; }
        .gl1t.exc-gl-item { height: auto !important; }
        .exc-badge-container, .exc-tag-stream { position: absolute; left: 5px; display: flex; z-index: 3; pointer-events: none; max-width: calc(100% - 10px); }
        .exc-badge-container { top: 5px; }
        .exc-tag-stream { bottom: 5px; }
        .exc-meta-overlay { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; max-width: 160px; pointer-events: none; }
        .exc-tag-stream .exc-meta-overlay { flex-direction: row; flex-wrap: wrap; max-width: 100%; }
        .exc-inline-meta > :is(.exc-badge-container, .exc-tag-stream) { position: static; margin-top: 5px; max-width: 100%; }
        .exc-inline-meta .exc-meta-overlay { flex-direction: row; flex-wrap: wrap; max-width: 100%; }
        .exc-gl-item .meta-tag {
            display: inline-block; padding: 2px 6px; border-radius: 5px;
            background: rgba(27,31,26,.48); color: white; border: 1px solid #ffffff40;
            font: 600 10.5px/1.3 'Segoe UI', 'Microsoft YaHei', sans-serif;
            white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis;
            text-shadow: 0 1px 2px #0008; box-shadow: none;
        }
        .exc-gl-item .meta-tag.hot { background: rgba(170,111,24,.68); }
        .exc-gl-item .meta-tag:is(.familiar, .familiar-artist) { background: rgba(46,100,163,.64); }
        .exc-gl-item .meta-tag:is(.familiar-group, .ok) { background: rgba(41,115,70,.64); }
        .exc-gl-item .meta-tag.warn { background: rgba(170,53,43,.68); }
        .exc-gl-item .meta-tag.maybe { border-style: dashed; }
        .exc-gl-item .meta-tag.more { background: rgba(27,31,26,.4); }
        .exc-gl-item .meta-tag.stream { font-weight: 500; }
        .exc-gl-item .meta-tag.exc-meta-act { pointer-events: auto; cursor: pointer; margin: 0; }
        .exc-gl-item .exc-inline-meta .meta-tag { background: var(--exc-muted-surface); color: #424b3e; text-shadow: none; border-color: var(--exc-line); }
        .exc-gl-item .exc-inline-meta .meta-tag.hot { background: #fbefcf; color: #865c0a; }
        .exc-gl-item .exc-inline-meta .meta-tag:is(.ok, .familiar-group) { background: #e5f0e7; color: #2d6d42; }
        .exc-gl-item .exc-inline-meta .meta-tag:is(.familiar, .familiar-artist) { background: #e6edf5; color: #355f91; }
        .exc-gl-item .exc-inline-meta .meta-tag.warn { background: #f8e7e4; color: #983f34; }
        .exc-gl-item.is-exc-familiar .exc-cover-host { outline: 2px solid #3a6fbf73; outline-offset: -2px; }
        .exc-tool-bar { display: flex; justify-content: flex-end; align-items: center; gap: 4px; padding: 5px 6px; position: relative; background: transparent; color: #353832; border-top: 1px solid var(--exc-line); margin-top: auto; }
        .exc-tool-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 28px; padding: 4px 7px; border: 0; border-radius: 5px; margin: 0; background: transparent; color: #59614f; cursor: pointer; font: 500 11px/1.3 'Segoe UI', 'Microsoft YaHei', sans-serif; white-space: nowrap; }
        .exc-tool-btn:hover { background: #e8ebe2; color: #34452b; }
        .exc-tool-btn.is-bp { color: #ad4037; background: #f9e9e5; }
        .exc-tool-btn.is-block { color: #ad4037; }
        .exc-card-menu { position: fixed; inset: auto; margin: 0; min-width: 150px; max-width: calc(100vw - 16px); padding: 5px; background: var(--exc-surface); border: 1px solid var(--exc-line); border-radius: 9px; box-shadow: 0 8px 28px #292e2926; }
        .exc-card-menu:popover-open { display: flex; flex-direction: column; }
        .exc-card-menu .exc-tool-btn { justify-content: flex-start; width: 100%; min-height: 34px; font-size: 12px; }
        .exc-card-menu [data-exc-act="drop"] { color: #a34136; border-top: 1px solid #e8e5df; border-radius: 0 0 4px 4px; }
        @media (pointer: coarse) { .exc-tool-btn { min-height: 36px; } }
        @media (prefers-reduced-motion: reduce) { .exc-gl-item, #jlc-wb, #jlc-wb-fab { animation: none !important; transition: none !important; } }
        /* 断点作品：整卡外框；表格行打在格子上，tr 自己的 outline 几乎看不见 */
        .exc-gl-item.is-exc-breakpoint,
        .gl1t.exc-gl-item.is-exc-breakpoint,
        .gl2t.exc-gl-item.is-exc-breakpoint {
            outline: 3px solid #ff5f56 !important;
            outline-offset: 3px;
            box-shadow: 0 0 0 1px rgba(255,95,86,.18), 0 0 22px rgba(255,95,86,.22) !important;
            position: relative !important;
            z-index: 3;
        }
        tr.exc-gl-item.is-exc-breakpoint > td {
            box-shadow: inset 0 0 0 2px #ff5f56 !important;
        }
        tr.exc-gl-item.is-exc-breakpoint > td.gl1e {
            box-shadow: inset 3px 0 0 #ff5f56, inset 0 0 0 2px #ff5f56 !important;
        }
        .exc-gl-item.is-exc-breakpoint.is-exc-bp-locating,
        tr.exc-gl-item.is-exc-breakpoint.is-exc-bp-locating > td {
            animation: exc-bp-pulse 0.9s ease-in-out 2;
        }
        @keyframes exc-bp-pulse {
            0%, 100% { box-shadow: 0 0 0 1px rgba(255,95,86,.18), 0 0 22px rgba(255,95,86,.22); }
            50% { box-shadow: 0 0 0 3px rgba(255,95,86,.45), 0 0 28px rgba(255,95,86,.4); }
        }
        tr.exc-tracking-divider td { padding: 8px 6px !important; background: transparent !important; border: 0 !important; }
        .exc-tracking-divider-label { display: flex; align-items: center; gap: 8px; color: #b44840; font-size: 11px; font-weight: 600; }
        .exc-tracking-divider-label::before { content: '断点'; display: inline-flex; padding: 2px 8px; border-radius: 5px; background: #ff5f5618; border: 1px solid #ff5f5640; }
        .exc-tracking-divider-label::after { content: ''; flex: 1; height: 1px; background: #ff5f5640; }
        .exc-last-seen-mark { display: inline-flex; padding: 2px 6px; border-radius: 5px; border: 1px solid #ffffff66; background: rgba(164,47,40,.72); color: white; font: 600 10.5px/1.3 'Segoe UI', 'Microsoft YaHei', sans-serif; white-space: nowrap; pointer-events: none; text-shadow: 0 1px 2px #0006; }
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
        #jlc-wb .jlc-site-pill.is-top.is-stale {
            background: #fff0d8; color: #9a5b12; border-color: #e8c58f;
            font-weight: 800;
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

        .exc-fold-tag { pointer-events: auto; cursor: pointer; margin: 0; }
        .exc-fold-tag:hover { filter: brightness(1.12); }
        .exc-tool-btn.is-block { opacity: 1; color: #ff6666; }
        .exc-gl-item .exc-enhance-host { display: none !important; }
        /* page chrome */
        #exc-toast-host {
            position: fixed; z-index: 1000001; right: 24px; bottom: 90px;
            display: flex; flex-direction: column; gap: 8px; pointer-events: none;
        }
        .exc-toast {
            background: var(--exc-surface); color: #353832; border: 1px solid var(--exc-line); border-left: 3px solid #526347;
            border-radius: 10px; padding: 10px 12px; font: 12px/1.45 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            box-shadow: 0 6px 20px #292e2918; max-width: min(360px, calc(100vw - 48px));
            transition: opacity .25s, transform .25s;
        }
        .exc-toast.is-out { opacity: 0; transform: translateY(8px); }

        /* Preview shares the page palette; fixed cells prevent load-time reflow. */
        #exc-hover-preview {
            position: fixed; z-index: 1000000; display: none; box-sizing: border-box;
            width: 440px; max-width: calc(100vw - 16px); max-height: calc(100vh - 16px);
            overflow: auto; overscroll-behavior: contain; padding: 14px; border-radius: 12px;
            background: var(--exc-surface); color: #353832; border: 1px solid var(--exc-line);
            box-shadow: 0 12px 36px #292e292b;
            font: 12px/1.5 'Segoe UI', 'Microsoft YaHei', sans-serif; text-align: left;
        }
        #exc-hover-preview.is-open { display: block; }
        .exc-hp-head { display: flex; align-items: flex-start; gap: 14px; }
        .exc-hp-title { flex: 1; min-width: 0; font-size: 13px; font-weight: 650; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .exc-hp-open { flex: none; color: #526347; font-size: 11px; text-decoration: none; padding: 2px 0; }
        .exc-hp-status { color: #697065; font-size: 11px; margin: 6px 0 10px; }
        .exc-hp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; }
        .exc-hp-cell { display: flex; align-items: center; justify-content: center; height: 164px; min-width: 0; overflow: hidden; border-radius: 6px; background: var(--exc-muted-surface); }
        .exc-hp-cell img { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
        .exc-hp-bg { display: block; flex: none; background-repeat: no-repeat; }
        .exc-hp-cell:focus-visible, .exc-hp-open:focus-visible { outline: 2px solid #758f61; outline-offset: 2px; }
        #exc-hover-preview:is(.is-loading, .is-empty) .exc-hp-grid { display: none; }
        #exc-hover-preview.is-loading .exc-hp-status { padding: 28px 0; text-align: center; }
        #exc-hover-preview.is-error .exc-hp-status { color: #a34136; }
        .exc-badge-row { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
        .exc-source-pill { flex: 0 0 auto; }
        .exc-card-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .exc-gl-item.is-exc-blocked { outline: 2px solid rgba(180,35,24,.35); outline-offset: -2px; opacity: .5; }
        .exc-gl-item.is-exc-blocked.exc-hide { display: none !important; }
        .exc-gl-item.is-exc-folded-child { display: none !important; }
        #exc-gallery-panel {
            margin: 18px 0 4px; padding: 0; border-top: 1px solid var(--exc-line);
            background: var(--exc-surface); color: #353832;
            font: 13px/1.5 'Segoe UI', 'Microsoft YaHei', sans-serif;
            clear: both; width: 100%; box-sizing: border-box; text-align: left;
            position: relative; z-index: 2; grid-column: 1 / -1; min-width: 0;
        }
        #exc-gallery-panel .exc-g-head { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 20px; padding: 16px 0 12px; }
        .exc-g-heading { margin-right: auto; }
        .exc-g-heading strong { display: block; font-size: 17px; color: #353832; font-weight: 650; }
        .exc-g-heading small { color: #697065; font-size: 11px; }
        .exc-g-body { display: grid; gap: 14px; }
        .exc-g-comparisons { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr)); gap: 14px; align-items: start; }
        .exc-g-comparisons:empty { display: none; }
        .exc-g-track { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; }
        .exc-g-label { color: #697065; font-size: 11px; font-weight: 600; }
        .exc-g-manage { border-top: 1px solid var(--exc-line); padding-top: 10px; }
        .exc-g-manage summary { cursor: pointer; color: #697065; font-size: 12px; width: fit-content; padding: 4px 0; }
        .exc-g-manage[open] summary { margin-bottom: 8px; }
        #exc-gallery-panel .jlc-wb-btn { min-height: 32px; padding: 6px 11px; font-size: 12px; border-radius: 7px; box-shadow: none; white-space: normal; }
        #exc-gallery-panel .jlc-wb-btn.danger { color: #a34136; background: transparent; border-color: #d9b8af; }
        #exc-gallery-panel :is(button, a, summary):focus-visible { outline: 2px solid #758f61; outline-offset: 2px; }

        /*
         * 列表作品框体（可叠加）
         * 点过 is-exc-seen：灰框 + 封面淡化
         * 库内 is-exc-lib：绿色描边
         * 心动 is-exc-fav：金框
         */
        .exc-gl-item.is-exc-seen,
        .exc-gl-item.is-exc-lib,
        .exc-gl-item.is-exc-fav {
            border-radius: 6px;
            position: relative;
        }
        /* 本地状态是描边的唯一来源；已读只淡化图片，不叠加透明容器。 */
        .exc-gl-item.is-exc-seen { --exc-state-color: #94998f; }
        .exc-gl-item.is-exc-fav { --exc-state-color: #d6a234; }
        .exc-gl-item.is-exc-lib { --exc-state-color: #3d9660; }
        .exc-gl-item:is(.is-exc-seen, .is-exc-fav, .is-exc-lib) { outline: 3px solid var(--exc-state-color); outline-offset: -3px; }
        .exc-gl-item:is(.is-exc-fav, .is-exc-lib) { box-shadow: 0 0 0 1px var(--exc-state-color), 0 3px 12px #38452e18; }
        .exc-gl-item.is-exc-lib.is-exc-fav { box-shadow: 0 0 0 1px #3d9660, inset 0 0 0 5px #d6a234; }
        .exc-gl-item.is-exc-seen img { opacity: .72 !important; filter: saturate(.75) !important; }
        tr.exc-gl-item:is(.is-exc-seen, .is-exc-fav, .is-exc-lib) > td:first-child { box-shadow: inset 4px 0 0 var(--exc-state-color); }
        tr.exc-gl-item.is-exc-lib.is-exc-fav > td:first-child { box-shadow: inset 4px 0 0 #3d9660, inset 7px 0 0 #d6a234; }
        .exc-g-kv { font-size: 13px; color: #697065; margin-bottom: 8px; }
        .exc-g-kv b { color: #353832; }
        /* tracking bar：挂在列表正上方（#dms / 顶部分页之后），不贴 #nb */
        #exc-tracking-bar {
            margin: 8px 0 10px;
            padding: 7px 12px;
            border-radius: 9px;
            background: var(--exc-surface);
            border: 1px solid var(--exc-line);
            border-left: 3px solid #526347;
            box-shadow: none;
            font: 12.5px/1.35 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            color: #4a3728;
            display: flex;
            flex-wrap: wrap;
            gap: 4px 10px;
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
            color: #48583d;
            font-weight: 650;
        }
        #exc-tracking-bar .exc-track-label b {
            color: #526347; font-weight: 700; margin-right: 2px;
        }
        #exc-tracking-bar.is-tracked {
            background: #e6ecdf;
            border-color: #c5d9c8;
            border-left-color: #3d8f52;
            box-shadow: none;
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
        #exc-tracking-bar [hidden] { display: none !important; }
        #exc-tracking-bar .exc-track-meta {
            width: 100%; font-size: 11.5px; color: #697065; line-height: 1.35;
            padding-top: 3px; border-top: 1px solid var(--exc-line); margin-top: 0;
        }
        #exc-tracking-bar .exc-bp-continue {
            background: #ba453c !important;
            border-color: transparent !important; color: #fff !important;
            font-weight: 700 !important;
        }
        #exc-tracking-bar .exc-bp-continue.is-loading {
            opacity: .78;
            pointer-events: none;
        }
        #exc-tracking-bar .exc-track-btn {
            flex: 0 0 auto;
            padding: 6px 10px !important;
            font-size: 11.5px !important;
            line-height: 1.2 !important;
            border-radius: 6px !important;
            box-shadow: none !important;
            min-height: 28px;
            background: var(--exc-surface);
            border: 1px solid #c9cdc1;
            color: #48583d;
        }
        /* One comparison style for the gallery and binding dialog. */
        .exc-compare-card { margin: 0; padding: 14px; min-width: 0; border: 1px solid var(--exc-line); border-radius: 10px; background: var(--exc-page-bg); color: #353832; }
        .exc-compare-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px; }
        .exc-compare-title { font-weight: 650; font-size: 13px; }
        .exc-compare-chip { display: inline-block; padding: 2px 7px; border-radius: 5px; font-size: 11px; color: #59614f; background: var(--exc-surface); border: 1px solid var(--exc-line); max-width: 100%; overflow-wrap: anywhere; }
        .exc-compare-card.is-maybe .exc-compare-chip { border-style: dashed; }
        .exc-compare-chip.is-verdict:is(.is-samever, .is-library) { color: #2f6b3a; background: #dce9dc; border-color: #aabfa6; }
        .exc-compare-chip.is-verdict.is-online { color: #856022; background: #f1e6cc; border-color: #cfbc8c; }
        .exc-compare-vs { display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; margin-bottom: 10px; }
        .exc-compare-col { border-radius: 6px; padding: 9px; min-width: 0; background: var(--exc-surface); border-top: 2px solid #b9c1ae; }
        .exc-compare-col.is-lib { border-color: #8fa98c; }
        .exc-compare-col.is-on { border-color: #c3ac7c; }
        .exc-compare-col-lab { font-size: 10px; color: #697065; margin-bottom: 4px; }
        .exc-compare-col-val { font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
        .exc-compare-vs-mid { align-self: center; font-size: 10px; color: #697065; }
        .exc-compare-diffs { list-style: none; margin: 8px 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
        .exc-compare-diffs li { font-size: 12px; padding: 5px 8px; border-left: 2px solid var(--exc-line); line-height: 1.5; overflow-wrap: anywhere; }
        .exc-compare-diffs li b { margin-right: 4px; }
        .exc-compare-arrow { color: #697065; margin: 0 3px; }
        .exc-compare-diffs li em { font-style: normal; font-size: 10px; margin-left: 6px; color: #856022; }
        .exc-compare-diffs li.is-online-better { background: #ece4d1; border-color: #c3ac7c; }
        .exc-compare-diffs li.is-lib-better { background: #dfe8da; border-color: #8fa98c; }
        .exc-cmp-v.is-lib { color: #2f6b3a; }
        .exc-cmp-v.is-on { color: #856022; }
        .exc-compare-pack { font-size: 11px; color: #697065; margin: 8px 0; padding: 7px 9px; border: 1px dashed var(--exc-line); border-radius: 6px; }
        .exc-compare-note { font-size: 11px; color: #697065; line-height: 1.5; margin-top: 6px; }
        .exc-compare-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; align-items: center; }
        .exc-compare-actions .jlc-wb-btn { min-height: 30px; padding: 5px 10px; font-size: 12px; border-radius: 7px; box-shadow: none; }
        .exc-edition-list { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
        .exc-ed { border-radius: 6px; padding: 9px 10px; background: var(--exc-surface); border: 1px solid var(--exc-line); font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
        .exc-ed.is-current { order: -2; border-color: #b29a68; border-left: 3px solid #b29a68; }
        .exc-ed.is-lrr-bound:not(.is-current) { order: -1; border-left: 3px solid #7d9b77; }
        .exc-ed.is-source-issue { border-right: 3px solid #a34136; }
        .exc-ed a { color: #48583d; text-decoration: none; }
        .exc-ed a:hover { text-decoration: underline; }
        .exc-ed-lrr-tag, .exc-ed-cur-tag { display: inline-block; font-size: 10px; border-radius: 3px; padding: 0 5px; margin-right: 4px; background: #dce9dc; color: #2f6b3a; }
        .exc-ed-cur-tag { background: #eee3c8; color: #856022; }
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
        /* 工作台 · 作品状态：当前页对应 LRR 档案 */
        #jlc-wb-works-scroll .jlc-wb-item.is-current,
        #jlc-wb-works-scroll .jlc-wb-item.is-lrr-page {
            border: 2px solid #d4883a !important;
            background: linear-gradient(135deg, #fff8ef 0%, #ffeed6 100%) !important;
            box-shadow: 0 0 0 2px rgba(212,136,58,.22), 0 3px 0 #e8c48a !important;
            order: -1;
        }
        #exc-current-work {
            flex: 0 0 auto; padding: 8px 14px 10px; border-bottom: 1px solid #eadcc6;
            background: #fff9ef;
        }
        #exc-current-work[hidden] { display: none !important; }
        #exc-current-work .exc-current-work-label {
            margin: 0 0 6px; color: #9a6a32; font-size: 11px; font-weight: 800;
        }
        #exc-current-work .jlc-wb-item.is-current {
            margin: 0; border: 2px solid #d4883a !important;
            background: #fff2df !important;
            box-shadow: 0 0 0 2px rgba(212,136,58,.16), 0 3px 0 #e8c48a !important;
        }
        #jlc-wb-works-scroll {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        #jlc-wb .exc-source-check-row { align-items: center; justify-content: space-between; }
        #jlc-wb .exc-source-editions {
            display: flex; flex-direction: column; gap: 5px; margin-top: 8px; padding-left: 9px;
            border-left: 3px solid #d96b5f;
        }
        #jlc-wb .exc-source-edition {
            display: grid; grid-template-columns: max-content max-content minmax(0, 1fr);
            gap: 6px; align-items: center; min-width: 0; color: #8a6f55; font-size: 12px;
        }
        #jlc-wb .exc-source-edition > a { color: #4a3728; font-weight: 750; text-decoration: none; }
        #jlc-wb .exc-source-edition > span:last-child {
            min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        @media (max-width: 520px) {
            #jlc-wb .exc-source-check-row { align-items: stretch; }
            #jlc-wb .exc-source-check-row .jlc-wb-btn { width: 100%; }
            #jlc-wb .exc-source-edition { grid-template-columns: max-content minmax(0, 1fr); }
            #jlc-wb .exc-source-edition > span:last-child { grid-column: 1 / -1; }
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
            position: fixed; inset: 0; z-index: 2147483100 !important; display: none; align-items: center; justify-content: center;
            background: #242a244d; padding: 20px;
        }
        #exc-wb-dialog.is-open { display: flex; }
        #exc-wb-dialog .jlc-wb-dialog-card {
            width: min(520px, 92vw); max-height: min(80vh, 640px); overflow: auto;
            background: var(--exc-page-bg); border: 1px solid var(--exc-line); border-radius: 14px;
            padding: 18px; box-shadow: 0 18px 50px #242a2433; color: #353832;
            font: 14.5px/1.45 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
        }
        #exc-wb-dialog h4 { margin: 0 0 8px; font-size: 18px; color: #353832; font-weight: 800; }
        #exc-wb-dialog p { margin: 0 0 12px; font-size: 13.5px; color: #697065; line-height: 1.55; }
        #exc-wb-dialog .jlc-wb-dialog-actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; margin-top: 12px; }
        #exc-folder-dialog .exc-folder-intro {
            margin-bottom: 10px; color: #353832; font-weight: 700;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        #exc-folder-dialog .exc-folder-options {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 8px; max-height: 240px; overflow: auto; padding: 2px;
        }
        #exc-folder-dialog .exc-folder-choice {
            appearance: none; display: flex; align-items: center; justify-content: space-between;
            gap: 8px; min-height: 38px; padding: 8px 10px; border: 1px solid #c9cdc1;
            border-radius: 6px; background: var(--exc-surface); color: #353832; cursor: pointer;
            font: 650 13px/1.25 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            text-align: left;
        }
        #exc-folder-dialog .exc-folder-choice:hover { border-color: #526347; background: #f3f6ef; }
        #exc-folder-dialog .exc-folder-choice.is-selected {
            border-color: #526347; background: #edf2e7; box-shadow: 0 0 0 2px #52634720;
        }
        #exc-folder-dialog .exc-folder-choice small { color: #697065; font-size: 10.5px; font-weight: 600; }
        #exc-folder-dialog .exc-folder-create { margin-top: 14px; }
        #exc-folder-dialog .exc-folder-create > label {
            display: block; margin-bottom: 6px; color: #697065; font-size: 12px; font-weight: 700;
        }
        #exc-folder-dialog .exc-folder-create > div { display: flex; gap: 8px; align-items: stretch; }
        #exc-folder-dialog .jlc-wb-input {
            min-width: 0; flex: 1 1 auto; padding: 8px 10px; border: 1px solid #c9cdc1;
            border-radius: 6px; background: var(--exc-surface); color: #353832; box-sizing: border-box;
            font: 13px/1.3 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
        }
        #exc-folder-dialog .jlc-wb-input:focus { outline: 2px solid #52634740; border-color: #526347; }
        @media (max-width: 520px) {
            #exc-folder-dialog .exc-folder-options { grid-template-columns: 1fr 1fr; }
            #exc-folder-dialog .exc-folder-create > div { flex-direction: column; }
        }
        #exc-wb-dialog .exc-modal-row {
            display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px;
            border: 1px solid var(--exc-line); border-radius: 16px; margin-bottom: 10px; background: var(--exc-surface);
            box-shadow: none;
        }
        /* shared controls (unscoped) */
        .jlc-wb-icon-btn, .jlc-wb-chip, .jlc-wb-btn {
            appearance: none; border: 1px solid var(--creamu-wb-border-strong, #e0cdae); background: var(--creamu-wb-surface-soft, #fffaf2); color: var(--creamu-wb-text-strong, #5a4030);
            border-radius: 999px; cursor: pointer; font-size: 13px; line-height: 1.25; font-weight: 650;
            text-decoration: none; display: inline-flex; align-items: center; justify-content: center;
            box-sizing: border-box;
        }
        .jlc-wb-icon-btn {
            width: 34px; height: 34px; padding: 0; background: #fff; font-size: 15px; box-shadow: 0 2px 0 #e6d3b5;
        }
        .jlc-wb-chip { padding: 7px 12px; background: #fff; box-shadow: 0 2px 0 #e6d3b5; }
        .jlc-wb-chip.is-on { background: var(--creamu-wb-accent, #d4883a); border-color: transparent; color: #fff; box-shadow: var(--creamu-wb-control-elevation, 0 2px 0 #b56e28); }
        .jlc-wb-btn { padding: 9px 13px; border-radius: 12px; box-shadow: var(--creamu-wb-control-elevation, 0 2px 0 #e0cdae); }
        .jlc-wb-btn.primary { background: var(--creamu-wb-accent, #d4883a); border-color: transparent; color: #fff; box-shadow: var(--creamu-wb-control-elevation, 0 2px 0 #b56e28); }
        .jlc-wb-btn.ghost { background: var(--creamu-wb-surface-soft, #fffaf2); }
        .jlc-wb-btn.danger { background: #f3d5d0; border-color: #e8b8b0; color: #8a3a32; box-shadow: none; }
        .jlc-wb-btn:hover, .jlc-wb-icon-btn:hover, .jlc-wb-chip:hover {
            background: #fff; border-color: #d4bc96; filter: brightness(1.02);
        }
        .jlc-wb-btn.primary:hover { background: var(--creamu-wb-accent-hover, #e09848); border-color: transparent; filter: none; }
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
