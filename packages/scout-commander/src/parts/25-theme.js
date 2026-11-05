// 25-theme.js

function getScoutThemeCss() {
  return getScoutWorkbenchThemeCss()
    + getScoutPageEnhancementThemeCss()
    + getScoutSiteLayoutThemeCss();
}

function getScoutWorkbenchThemeCss() {
  return `
        /* 站点配色皮肤体系 (CSS 变量) */
        :root {
          --scout-theme-color: #d4883a;
          --scout-theme-dark: #b56e28;
          --scout-theme-light: #f0f1eb;
          --scout-theme-shadow: rgba(212, 136, 58, 0.22);
          --scout-bg-clean: #fafafa;
          --scout-card-bg: #ffffff;
          --scout-text-color: #343b36;
        }
        /* 三站分色：工作台 + 列表卡片（卡片禁止纯白，避免三站长一样） */
        body.creamu-site-xvideos {
          --scout-theme-color: #e54840;
          --scout-theme-dark: #9e2a24;
          --scout-theme-light: #fde8e6;
          --scout-theme-shadow: rgba(229, 72, 64, 0.28);
          --scout-bg-clean: #f2d4d0;
          --scout-card-bg: #f8e0dc;
          --scout-text-color: #3a1512;
        }
        body.creamu-site-xnxx {
          --scout-theme-color: #2e70e5;
          --scout-theme-dark: #1a3f96;
          --scout-theme-light: #e3ecfc;
          --scout-theme-shadow: rgba(46, 112, 229, 0.28);
          --scout-bg-clean: #d2def2;
          --scout-card-bg: #e0eaf8;
          --scout-text-color: #122038;
        }
        body.creamu-site-eporner {
          --scout-theme-color: #2ea854;
          --scout-theme-dark: #186b34;
          --scout-theme-light: #e3f6e9;
          --scout-theme-shadow: rgba(46, 168, 84, 0.28);
          --scout-bg-clean: #d0e8d6;
          --scout-card-bg: #def0e4;
          --scout-text-color: #12301c;
        }

        :where(#jlc-wb, #jlc-wb-fab, #scout-collect-dialog) {
          --scout-ui-bg: var(--scout-page-bg, #e6e8e2);
          --scout-ui-surface: var(--scout-page-panel, #f0f1eb);
          --scout-ui-muted: var(--scout-card, #e1e4da);
          --scout-ui-text: var(--scout-text-color, #343b36);
          --scout-ui-subtle: var(--scout-text-muted, #727b70);
          --scout-ui-line: var(--scout-page-border, #cbd0c5);
          --creamu-wb-bg: var(--scout-ui-bg);
          --creamu-wb-surface: var(--scout-ui-surface);
          --creamu-wb-surface-soft: var(--scout-ui-bg);
          --creamu-wb-surface-muted: var(--scout-ui-muted);
          --creamu-wb-surface-raised: var(--scout-ui-surface);
          --creamu-wb-inset-surface: var(--scout-ui-muted);
          --creamu-wb-text: var(--scout-ui-text);
          --creamu-wb-text-strong: var(--scout-ui-text);
          --creamu-wb-title: var(--scout-ui-text);
          --creamu-wb-text-muted: var(--scout-ui-subtle);
          --creamu-wb-text-subtle: var(--scout-ui-subtle);
          --creamu-wb-secondary-ink: var(--scout-ui-subtle);
          --creamu-wb-border: var(--scout-ui-line);
          --creamu-wb-border-strong: var(--scout-ui-line);
          --creamu-wb-divider: var(--scout-ui-line);
          --creamu-wb-card-border: var(--scout-ui-line);
          --creamu-wb-card-hover-border: var(--scout-link, #7c8e72);
          --creamu-wb-accent: var(--scout-theme-color);
          --creamu-wb-accent-hover: var(--scout-theme-dark);
          --creamu-wb-accent-light: var(--scout-theme-color);
          --creamu-wb-accent-dark: var(--scout-theme-dark);
          --creamu-wb-accent-ring: var(--scout-theme-shadow);
          --creamu-wb-accent-overlay: color-mix(in srgb, var(--scout-theme-color) 25%, transparent);
          --creamu-wb-accent-overlay-soft: color-mix(in srgb, var(--scout-theme-color) 10%, transparent);
          --creamu-wb-control-radius: 7px;
          --creamu-wb-panel-radius: 14px;
          --creamu-wb-card-radius: 8px;
          --creamu-wb-control-elevation: none;
          --creamu-wb-card-elevation: none;
          --creamu-wb-card-hover-elevation: none;
          color-scheme: var(--scout-color-scheme, light);
        }

        /*
         * 清爽：只藏明确广告位，禁止 class/id 子串 *ad-*（会误伤 gamepad 等，
         * 运行时广告壳也常套在列表附近，过宽选择器会把整列视频 height:0 挡没）。
         * 绝不匹配 .thumb-block / .mozaique / 列表卡。
         */
        html.scout-cream-site body.creamu-site-xvideos .ad-provider,
        html.scout-cream-site body.creamu-site-xvideos .sponsor,
        html.scout-cream-site body.creamu-site-xvideos .video-ad-panel,
        html.scout-cream-site body.creamu-site-xvideos .ads-container,
        html.scout-cream-site body.creamu-site-xvideos .premium-tab,
        html.scout-cream-site body.creamu-site-xvideos #ad-footer,
        html.scout-cream-site body.creamu-site-xvideos [id^="ad_"]:not(.thumb-block):not([id^="video_"]),
        html.scout-cream-site body.creamu-site-xvideos iframe[src*="doubleclick"],
        html.scout-cream-site body.creamu-site-xvideos iframe[src*="/ads"],
        html.scout-cream-site body.creamu-site-xvideos iframe[src*="exoclick"],
        html.scout-cream-site body.creamu-site-xnxx .ad-provider,
        html.scout-cream-site body.creamu-site-xnxx .sponsor,
        html.scout-cream-site body.creamu-site-xnxx .video-ad-panel,
        html.scout-cream-site body.creamu-site-xnxx .ads-container,
        html.scout-cream-site body.creamu-site-xnxx .premium-tab,
        html.scout-cream-site body.creamu-site-xnxx #ad-footer,
        html.scout-cream-site body.creamu-site-xnxx [id^="ad_"]:not(.thumb-block):not([id^="video_"]),
        html.scout-cream-site body.creamu-site-xnxx iframe[src*="doubleclick"],
        html.scout-cream-site body.creamu-site-xnxx iframe[src*="/ads"],
        html.scout-cream-site body.creamu-site-xnxx iframe[src*="exoclick"],
        html.scout-cream-site body.creamu-site-eporner .adv_box,
        html.scout-cream-site body.creamu-site-eporner .ad_direct,
        html.scout-cream-site body.creamu-site-eporner .ads-container,
        html.scout-cream-site body.creamu-site-eporner #ad-footer,
        html.scout-cream-site body.creamu-site-eporner [id^="ad_"]:not(.post):not([id^="video_"]),
        html.scout-cream-site body.creamu-site-eporner iframe[src*="doubleclick"],
        html.scout-cream-site body.creamu-site-eporner iframe[src*="/ads"] {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          max-height: 0 !important;
          overflow: hidden !important;
          pointer-events: none !important;
        }

        html.scout-console-docked body { padding-right: calc(var(--scout-dock-width) + 16px) !important; box-sizing: border-box; min-width: 0 !important; }
        html.scout-player-fullscreen :is(#jlc-wb-fab, #jlc-wb, #scout-search-track-bar) { display: none !important; }
        #jlc-wb-fab { width: auto; min-width: 92px; height: 40px; padding: 0 10px 0 7px; gap: 7px; border-radius: 10px; border: 1px solid var(--scout-ui-line) !important; background: var(--scout-ui-surface) !important; color: var(--scout-ui-text) !important; box-shadow: 0 4px 20px #0002 !important; z-index: 1000002; font: 600 13px/1 'Segoe UI', sans-serif; }
        #jlc-wb-fab.is-panel-open { display: none; }
        .scout-brand-mark { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 6px 6px 6px 2px; background: var(--scout-theme-color); color: white; font: bold 18px/1 Georgia, serif; }
        /* Eporner 的原生导航位于 1000000；控制台及入口必须在其上方。 */
        #jlc-wb { min-width: 0; min-height: 0; text-align: left; outline: none; box-shadow: 0 12px 40px #0003; z-index: 1000001; }
        #jlc-wb [hidden] { display: none !important; }
        #jlc-wb :is(button, input, select, textarea) { font-family: inherit; line-height: 1.4; }
        #jlc-wb :is(input, select, textarea) { scroll-margin-block: 8px; }
        /* 按用途区分尺寸；窄屏不再把图标、标签和次级操作统一放大。 */
        #jlc-wb .jlc-wb-btn { min-height: 32px; padding: 6px 10px; border-radius: 7px; }
        #jlc-wb .jlc-wb-icon-btn { width: 32px; height: 32px; flex-shrink: 0; }
        #jlc-wb .jlc-wb-chip { min-height: 30px; padding: 4px 9px; font-size: 12px; }
        #jlc-wb .jlc-wb-search, #jlc-wb select.jlc-wb-select { min-height: 38px; padding: 6px 9px; border-radius: 7px; }
        #jlc-wb :focus-visible, #jlc-wb-fab:focus-visible { outline: 2px solid var(--scout-theme-color); outline-offset: 2px; }
        #jlc-wb .jlc-wb-header { padding: 12px 14px 8px; background: var(--scout-ui-surface); }
        #jlc-wb .jlc-wb-title { font-size: 18px; font-weight: 650; }
        #jlc-wb .jlc-wb-subtitle { font-size: 10px; }
        #jlc-wb .jlc-wb-header-actions { gap: 6px; flex-wrap: nowrap; }
        #jlc-wb .jlc-wb-header-actions .jlc-wb-btn { padding: 5px 8px; font-size: 11px; }
        #jlc-wb .jlc-wb-nav { flex-wrap: wrap; gap: 0; padding: 0 12px; background: var(--scout-ui-surface); border-bottom: 1px solid var(--scout-ui-line); overflow: visible; }
        #jlc-wb .jlc-wb-nav > button { flex: 1; min-height: 38px; padding: 6px 8px; background: transparent; border-radius: 0; border-bottom: 2px solid transparent; font-size: 13px; }
        #jlc-wb .jlc-wb-nav button.active { color: var(--scout-link, var(--scout-theme-color)); border-bottom-color: var(--scout-theme-color); box-shadow: none; background: transparent; }
        #jlc-wb .scout-secondary-nav { display: flex; width: 100%; gap: 6px; padding: 6px 0; border-top: 1px solid var(--scout-ui-line); }
        #jlc-wb .scout-secondary-nav button { flex: 1; min-height: 32px; padding: 5px 8px; border-radius: 6px; }
        #jlc-wb.is-docked { border-radius: 0; border-width: 0 0 0 1px; }
        #jlc-wb.is-mobile { border-radius: 16px 16px 0 0; padding-bottom: env(safe-area-inset-bottom); }
        #jlc-wb:is(.is-mobile, .is-docked) :is(.jlc-wb-resize-w, .jlc-wb-resize-h, .jlc-wb-resize-corner) { display: none; }
        #jlc-wb:is(.is-mobile, .is-docked) .jlc-wb-header { cursor: default; }
        #jlc-wb .jlc-wb-settings-panel { width: 100%; background: var(--scout-ui-bg); }
        @media (max-width: 820px) {
          #jlc-wb input, #jlc-wb select, #scout-collect-dialog input, #scout-collect-dialog select { font-size: 16px !important; }
        }
        @media (prefers-reduced-motion: reduce) { #jlc-wb *, #jlc-wb-fab { transition: none !important; animation: none !important; } }

        /*
         * Scout 页面布局：shared 的 [data-jlc-wb-page] > * 会把所有子节点
         * 设成 flex:1 + overflow:hidden，PC 上列表/表单看起来像“打开了但空白”。
         * 这里用更高优先级纠正 toolbar/footer 与可滚动区。
         */
        #jlc-wb [data-jlc-wb-page] {
          min-height: 0 !important;
          overflow: hidden !important;
        }
        #jlc-wb [data-jlc-wb-page] > .jlc-wb-toolbar,
        #jlc-wb [data-jlc-wb-page] > .jlc-wb-footer {
          flex: 0 0 auto !important;
          min-height: auto !important;
          overflow: visible !important;
          display: flex !important;
          flex-direction: column !important;
        }
        #jlc-wb [data-jlc-wb-page] > .jlc-wb-list-scroll {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          display: block !important;
        }
        /* 仅有 list-scroll 单子节点时同样可滚 */
        #jlc-wb [data-jlc-wb-page] > .jlc-wb-list-scroll:only-child {
          height: 100%;
        }

        #jlc-wb [data-jlc-wb-page="combo"] { min-width: 0; width: 100%; box-sizing: border-box; }
        #jlc-wb .scout-combo-scroll { padding: 12px 14px 20px; }
        #jlc-wb details { border-top: 1px solid var(--scout-ui-line); margin-top: 14px; padding-top: 7px; }
        #jlc-wb summary { cursor: pointer; padding: 9px 0; color: var(--scout-ui-subtle); font-size: 12px; }
        .scout-search-context { padding: 10px 12px; margin-bottom: 14px; border-radius: 8px; background: var(--scout-ui-muted); }
        .scout-search-context > small { display: block; color: var(--scout-ui-subtle); font-size: 10px; }
        .scout-search-context > strong { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 3px 0 9px; font-size: 13px; }
        .scout-context-actions { display: flex; flex-wrap: wrap; gap: 6px; }
        #jlc-wb .scout-context-actions button { padding: 6px 8px; font-size: 11px; }
        #scout-workbench-context { flex: 0 0 auto; padding: 12px 14px; border-bottom: 1px solid var(--scout-ui-line); background: var(--scout-ui-surface); }
        .scout-current-work-heading { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .scout-current-work-cover { width: 64px; height: 44px; flex: none; object-fit: cover; border-radius: 5px; }
        .scout-current-work-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .scout-current-work-copy :is(small, span) { color: var(--scout-ui-subtle); font-size: 10px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        .scout-current-work-copy strong { font-size: 13px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        #jlc-wb #scout-workbench-context button { padding: 5px 9px; font-size: 11px; flex-shrink: 0; }
        .scout-current-work-actions { display: flex; gap: 6px; margin-top: 9px; }
        #jlc-wb #scout-workbench-context [aria-pressed="true"] { border-color: var(--scout-theme-color); }
        @media (max-width: 820px) {
          #scout-workbench-context { padding: 9px 14px; }
          .scout-current-work-cover { width: 48px; height: 36px; }
          .scout-current-work-copy strong { -webkit-line-clamp: 1; }
          #jlc-wb.is-keyboard-open :is(.scout-current-work-actions, .scout-current-work-cover, .scout-current-work-copy > span) { display: none; }
        }
        #jlc-wb .scout-search-builder-head { display: flex; flex-direction: column; gap: 10px; margin: 0 0 10px; padding: 0; border: 0; background: transparent; }
        .scout-search-builder-head strong { font-size: 16px; font-weight: 600; }
        .scout-search-builder-head > div:first-child > span { display: none; }
        .scout-search-role-switch { display: flex; gap: 6px; }
        .scout-search-role-switch button, .scout-search-priority-switch button { padding: 5px 9px; min-height: 32px; border: 1px solid var(--scout-ui-line); border-radius: 6px; background: transparent; color: var(--scout-ui-subtle); font-size: 12px; cursor: pointer; }
        .scout-search-role-switch button.is-active, .scout-search-priority-switch button.is-active { border-color: var(--scout-theme-color); color: var(--scout-ui-text); background: var(--creamu-wb-accent-overlay-soft); }
        .scout-search-add-row { display: flex; gap: 7px; align-items: center; }
        .scout-search-add-row > input { flex: 1; min-width: 0; }
        .scout-search-priority-switch, .scout-search-condition-priority { display: none; }
        .scout-show-priority .scout-search-priority-switch:not([hidden]) { display: flex; gap: 4px; }
        .scout-show-priority .scout-search-condition-priority:not([hidden]) { display: block; }
        .scout-search-builder-grid { display: block; margin-top: 12px; }
        .scout-search-condition-column { display: flex; flex-direction: column; gap: 6px; }
        .scout-search-condition { display: flex; align-items: center; gap: 6px; min-width: 0; padding: 4px 6px 4px 10px; border: 1px solid var(--scout-ui-line); border-left: 3px solid var(--scout-theme-color); border-radius: 6px; background: var(--scout-ui-surface); }
        .scout-search-condition.is-excluded { border-left-color: #bb6e66; }
        .scout-search-condition.is-preference { border-left-color: #b29b60; }
        .scout-search-condition-text { flex: 1; overflow-wrap: anywhere; min-width: 0; font-size: 13px; }
        #jlc-wb .scout-search-condition select { width: auto; max-width: 100px; padding: 5px; font-size: 11px; }
        #jlc-wb .scout-search-condition-remove { flex: none; width: 32px; }
        .scout-search-pool-toolbar { display: flex; gap: 6px; margin: 8px 0; }
        .scout-search-pool-toolbar input { flex: 1; min-width: 0; }
        .scout-search-pool-toolbar select { max-width: 100px; }
        .scout-search-pool, .scout-search-current-tag-list, .scout-search-related-list { display: flex; flex-wrap: wrap; gap: 6px; }
        .scout-search-pool { max-height: 240px; overflow: auto; }
        .scout-search-section-head { display: flex; gap: 8px; align-items: center; margin: 12px 0 8px; font-size: 11px; color: var(--scout-ui-subtle); }
        .scout-search-related-item { display: inline-flex; align-items: center; }
        .scout-search-related-dismiss { border: 0; background: transparent; color: var(--scout-ui-subtle); cursor: pointer; padding: 10px; }
        .scout-search-site-row { display: flex; flex-wrap: wrap; gap: 10px; padding: 10px 0; }
        .scout-combo-site { display: flex; gap: 5px; align-items: center; min-height: 36px; font-size: 12px; }
        .scout-search-plan-probes { display: flex; flex-wrap: wrap; gap: 6px; font-size: 11px; padding: 8px 0; }
        .scout-priority-toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; }
        .scout-search-results-head > div { display: flex; flex-direction: column; gap: 4px; margin: 8px 0 14px; }
        .scout-search-results-head span, .scout-search-assessment-pending { color: var(--scout-ui-subtle); font-size: 11px; }
        .scout-search-assessments { display: flex; flex-direction: column; gap: 12px; }
        .scout-search-assessment-site { padding: 12px; border: 1px solid var(--scout-ui-line); border-radius: 8px; background: var(--scout-ui-surface); min-width: 0; }
        .scout-search-assessment-site-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
        .scout-search-assessment-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 10px 0; }
        .scout-search-assessment-metrics > div { display: flex; flex-direction: column; gap: 4px; padding: 8px; border-radius: 6px; background: var(--scout-ui-muted); }
        .scout-search-assessment-metrics b { font-size: 20px; }
        .scout-search-assessment-metrics :is(span,small) { color: var(--scout-ui-subtle); font-size: 10px; overflow-wrap: anywhere; }
        .scout-search-condition-stats { display: flex; flex-wrap: wrap; gap: 5px; font-size: 11px; }
        .scout-search-condition-stat { padding: 3px 6px; background: var(--scout-ui-muted); border-radius: 4px; }
        .scout-search-assessment-variant { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; border-top: 1px solid var(--scout-ui-line); margin-top: 10px; padding-top: 10px; }
        .scout-search-assessment-variant-copy { flex: 1 1 100%; display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
        .scout-search-assessment-variant-copy span, .scout-search-assessment-variant-count span { color: var(--scout-ui-subtle); font-size: 11px; }
        .scout-search-assessment-variant-count { flex: 1; display: flex; flex-direction: column; }
        .scout-search-assessment-variant-actions { display: flex; gap: 6px; }
        #jlc-wb .scout-combo-dock { padding: 10px 12px; background: var(--scout-ui-surface); border-top: 1px solid var(--scout-ui-line); }
        .scout-combo-dock-actions, .scout-search-savebar { display: flex; gap: 7px; width: 100%; }
        .scout-search-savebar { margin-bottom: 8px; }
        .scout-search-savebar input { flex: 1; min-width: 0; }
        #jlc-wb .scout-combo-dock-actions .jlc-wb-btn { flex: 1; padding: 8px 5px; min-width: 0; min-height: 40px; font-size: 12px; }
        #jlc-wb #scout-combo-search-btn { flex: 1.25; }

        /* 表单与控制台共用站点配色，避免原站通用 input 样式覆盖。 */
        #jlc-wb {
          color-scheme: var(--scout-color-scheme, light);
        }
        #jlc-wb input[type="text"],
        #jlc-wb input[type="search"],
        #jlc-wb input[type="password"],
        #jlc-wb input[type="email"],
        #jlc-wb input[type="number"],
        #jlc-wb input[type="url"],
        #jlc-wb input:not([type]),
        #jlc-wb textarea,
        #jlc-wb select,
        #jlc-wb .jlc-wb-search,
        #jlc-wb select.jlc-wb-select {
          background: var(--scout-ui-surface) !important;
          color: var(--scout-ui-text) !important;
          border: 1px solid var(--scout-ui-line) !important;
          box-shadow: 0 1px 0 var(--scout-ui-line) !important;
          color-scheme: var(--scout-color-scheme, light) !important;
          caret-color: var(--scout-theme-dark, #b56e28) !important;
        }
        #jlc-wb input[type="text"]::placeholder,
        #jlc-wb input[type="search"]::placeholder,
        #jlc-wb input[type="password"]::placeholder,
        #jlc-wb input:not([type])::placeholder,
        #jlc-wb textarea::placeholder,
        #jlc-wb .jlc-wb-search::placeholder {
          color: var(--scout-ui-subtle) !important;
          opacity: 1 !important;
        }
        #jlc-wb input[type="text"]:focus,
        #jlc-wb input[type="search"]:focus,
        #jlc-wb input[type="password"]:focus,
        #jlc-wb input[type="email"]:focus,
        #jlc-wb input:not([type]):focus,
        #jlc-wb textarea:focus,
        #jlc-wb select:focus,
        #jlc-wb .jlc-wb-search:focus {
          border-color: var(--scout-theme-color) !important;
          outline: none !important;
          background: var(--scout-ui-surface) !important;
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--scout-theme-color) 25%, transparent) !important;
        }

        /* 工作台页面组件 */
        #jlc-wb .scout-wb-chip {
          margin: 2px;
          cursor: pointer;
        }
        #jlc-wb .scout-wb-chip.is-retired {
          background: #ffe5e5;
          color: var(--scout-ui-text);
        }
        #jlc-wb .jlc-wb-list-scroll.scout-wb-list {
          padding-top: 14px;
        }
        #jlc-wb .jlc-wb-list-scroll.scout-wb-list.is-compact {
          padding-top: 12px;
        }
        #jlc-wb .legacy-note.scout-wb-page-note {
          margin: 0 14px 10px;
          line-height: 1.45;
        }
        #jlc-wb .scout-wb-add-form {
          display: flex;
          gap: 6px;
          width: 100%;
        }
        #jlc-wb .scout-wb-add-form.is-wrap {
          flex-wrap: wrap;
        }
        #jlc-wb .scout-wb-add-form .scout-wb-add-primary {
          flex: 1.5;
          padding: 8px;
          font-size: 13px;
        }
        #jlc-wb .scout-wb-add-form .scout-wb-add-secondary {
          flex: 1;
        }
        #jlc-wb .scout-wb-add-form input.scout-wb-add-secondary {
          padding: 8px;
          font-size: 13px;
        }
        #jlc-wb .scout-wb-add-form select.scout-wb-add-secondary {
          padding: 4px 6px;
        }
        #jlc-wb .scout-wb-add-form .scout-wb-add-detail {
          flex: 100%;
          padding: 8px;
          margin-top: 4px;
          font-size: 13px;
        }
        #jlc-wb .scout-wb-add-form .scout-wb-add-submit {
          padding: 8px 12px;
        }
        #jlc-wb .scout-wb-add-form .scout-wb-add-submit.is-grow {
          flex: 1;
          padding: 8px;
          justify-content: center;
        }

        /* 词库 */
        #jlc-wb .scout-lexicon-missing {
          color: var(--scout-ui-subtle);
          font-style: italic;
        }
        #jlc-wb .jlc-status-pill.scout-lexicon-confirmed {
          padding: 1px 4px;
          margin-left: 4px;
          font-size: 10px;
        }
        #jlc-wb .scout-lexicon-loved {
          color: #e54840;
          margin-right: 4px;
        }
        #jlc-wb .jlc-wb-item-meta-line.scout-lexicon-meta {
          color: var(--scout-ui-subtle);
          font-size: 11.5px;
        }
        #jlc-wb .scout-lexicon-edit {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed var(--scout-ui-line);
        }
        #jlc-wb .scout-lexicon-edit-row {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        #jlc-wb .scout-lexicon-edit-label {
          width: 54px;
          color: var(--scout-ui-subtle);
          font-size: 12px;
        }
        #jlc-wb .jlc-wb-item-edit input.scout-lexicon-edit-input {
          flex: 1;
          padding: 6px;
          font-size: 13px;
        }
        #jlc-wb .scout-lexicon-edit-select {
          flex: 1;
          padding: 4px 6px;
        }
        #jlc-wb .scout-lexicon-loved-toggle {
          display: inline-flex;
          align-items: center;
          margin-top: 0;
          color: inherit;
          font-size: 13px;
          letter-spacing: 0;
          text-transform: none;
          cursor: pointer;
        }
        #jlc-wb .jlc-wb-item-edit input.scout-lexicon-loved-checkbox {
          width: 16px;
          height: 16px;
          margin-right: 6px;
          accent-color: var(--scout-theme-color);
        }
        #jlc-wb .scout-lexicon-edit-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 4px;
        }
        #jlc-wb .scout-wb-button-group {
          display: flex;
          gap: 4px;
        }
        #jlc-wb .jlc-wb-btn.scout-wb-btn-compact {
          padding: 4px 8px;
          font-size: 12px;
        }
        #jlc-wb .jlc-wb-btn.scout-lexicon-good,
        #jlc-wb .jlc-wb-btn.scout-lexicon-good:hover {
          border: 0;
          background: #2f6b3a;
        }
        #jlc-wb .jlc-wb-btn.scout-lexicon-bad,
        #jlc-wb .jlc-wb-btn.scout-lexicon-bad:hover {
          border-color: #e8b8b0;
          color: #8a3a32;
        }
        #jlc-wb .jlc-wb-toolbar.scout-lexicon-toolbar {
          padding-top: 12px;
        }
        #jlc-wb .jlc-wb-search.scout-lexicon-search {
          padding: 8px 12px;
          font-size: 13.5px;
        }
        #jlc-wb .scout-lexicon-types {
          display: flex;
          flex-wrap: wrap;
          margin-top: 2px;
        }
        #jlc-wb .jlc-wb-footer.scout-lexicon-footer {
          padding: 10px 14px;
        }

        /* 熟人与作品 */
        #jlc-wb .scout-publisher-name.is-loved {
          color: var(--scout-ui-text);
        }
        #jlc-wb .scout-publisher-name.is-blocked {
          color: var(--scout-ui-text);
        }
        #jlc-wb .jlc-status-pill.scout-publisher-status {
          padding: 1px 6px;
          margin-left: 4px;
          font-size: 10.5px;
        }
        #jlc-wb .scout-publisher-site {
          margin-left: 4px;
          color: var(--scout-ui-subtle);
          font-size: 11px;
        }
        #jlc-wb .scout-publisher-note {
          margin-top: 2px;
          color: var(--scout-ui-subtle);
          font-size: 11px;
        }
        #jlc-wb .scout-publisher-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        #jlc-wb .person-item span.remove.scout-publisher-remove {
          font-weight: bold;
        }
        #jlc-wb .jlc-wb-cover.scout-work-cover {
          flex: 0 0 72px;
          width: 72px;
          height: 54px;
          border-radius: 10px;
          overflow: hidden;
          background: var(--scout-ui-muted);
        }
        #jlc-wb .jlc-wb-item-meta-line.scout-work-meta {
          color: var(--scout-ui-subtle);
          font-size: 11.5px;
        }
        #jlc-wb .jlc-wb-item-meta-line.scout-work-tags {
          margin-top: 2px;
          color: var(--scout-ui-subtle);
          font-size: 11px;
        }
        #jlc-wb .scout-lex-flow-work {
          margin-top: 6px;
        }
        #jlc-wb .jlc-wb-open-btn.scout-work-open {
          min-width: 52px;
          padding: 6px 10px;
          font-size: 12px;
        }
        #jlc-wb .scout-work-origin,
        #jlc-wb .scout-work-del {
          padding: 4px 8px;
          margin-top: 4px;
          font-size: 11px;
        }
        #jlc-wb .scout-work-origin {
          min-width: 52px;
        }

        /* 追更 */
        #jlc-wb .scout-track-site-row .jlc-wb-btn {
          padding: 3px 8px;
          font-size: 11px;
        }
        #jlc-wb .jlc-wb-item-title.scout-track-title {
          color: var(--scout-theme-color);
        }
        #jlc-wb .scout-track-site-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 4px;
        }
        #jlc-wb .jlc-wb-item-meta-line.scout-track-query {
          margin-top: 4px;
          font-size: 12px;
        }
        #jlc-wb .jlc-wb-item-meta-line.scout-track-updated {
          color: var(--scout-ui-subtle);
          font-size: 11px;
        }
        #jlc-wb .jlc-wb-open-btn.scout-track-open-btn {
          min-width: 54px;
          padding: 6px 12px;
          font-size: 12px;
        }
        #jlc-wb .scout-track-expand-btn {
          min-width: 54px;
          padding: 4px 8px;
          margin-top: 4px;
          font-size: 11px;
        }
        #jlc-wb .scout-track-edit-actions {
          display: flex;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 8px;
          width: 100%;
          margin-top: 6px;
          padding-top: 8px;
          border-top: 1px dashed var(--scout-ui-line);
        }
        #jlc-wb .scout-track-edit-actions .jlc-wb-btn {
          padding: 4px 10px;
          font-size: 12px;
        }

        /* 屏蔽 */
        #jlc-wb .scout-toggle-mode-btn,
        #jlc-wb .scout-toggle-match-btn,
        #jlc-wb .scout-toggle-scope-btn {
          padding: 1px 6px;
          font-size: 10px;
          cursor: pointer;
        }
        #jlc-wb .scout-toggle-mode-btn.tone-yellow {
          border-color: #f5c77a;
          background: #ffe8c2;
          color: #b54708;
        }
        #jlc-wb .scout-toggle-match-btn {
          background: var(--scout-ui-muted);
          color: var(--scout-ui-text);
        }
        #jlc-wb .scout-toggle-scope-btn {
          background: #e7f1ff;
          color: #175cd3;
        }
        #jlc-wb .person-item.scout-block-item {
          align-items: flex-start;
          gap: 8px;
        }
        #jlc-wb .scout-block-body {
          flex: 1;
          min-width: 0;
        }
        #jlc-wb .scout-block-heading {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px;
        }
        #jlc-wb .scout-block-name {
          color: var(--scout-ui-text);
        }
        #jlc-wb .scout-block-reason {
          margin-top: 4px;
          color: var(--scout-ui-subtle);
          font-size: 11px;
        }
        #jlc-wb .person-item span.remove.scout-block-remove {
          flex: 0 0 auto;
          color: var(--scout-ui-text);
          font-size: 16px;
          font-weight: bold;
        }
        #jlc-wb .scout-block-options {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          width: 100%;
          padding: 0 4px;
        }
        #jlc-wb .scout-block-options.is-first {
          margin-top: 4px;
        }
        #jlc-wb .scout-block-option-title {
          color: var(--scout-ui-subtle);
          font-size: 12px;
          font-weight: bold;
        }
        #jlc-wb .scout-block-option-title.is-scope {
          margin-left: 6px;
        }
        #jlc-wb .scout-block-option {
          display: inline-flex;
          align-items: center;
          margin-top: 0;
          font-size: 12.5px;
          letter-spacing: 0;
          text-transform: none;
          cursor: pointer;
        }
        #jlc-wb .scout-block-option input {
          width: 15px;
          height: 15px;
          margin-right: 4px;
          accent-color: var(--scout-theme-color);
        }
        #jlc-wb #scout-add-block-btn {
          flex: 1;
          justify-content: center;
          margin-top: 6px;
          padding: 8px;
        }

        /* 设置抽屉 */
        #jlc-wb .legacy-note.scout-settings-note.is-compact {
          line-height: 1.5;
        }
        #jlc-wb .jlc-wb-settings h3.scout-settings-subheading {
          margin-top: 16px;
        }
        #jlc-wb .legacy-row.scout-settings-spaced-row {
          margin-top: 12px;
        }
        #jlc-wb .stat-box.scout-settings-secondary-stats {
          margin-top: 10px;
        }
        #jlc-wb .stat-item.scout-settings-stat-summary {
          flex: 2;
          padding: 0 8px;
          text-align: left;
        }
        #jlc-wb .stat-item span.scout-settings-stat-copy {
          display: block;
          color: var(--scout-ui-subtle);
          font-size: 12px;
          line-height: 1.45;
          letter-spacing: 0;
          text-transform: none;
        }
        #jlc-wb .jlc-wb-btn.scout-settings-wide-action {
          width: 100%;
        }
        #jlc-wb .scout-settings-wide-action.is-first {
          margin-top: 12px;
        }
        #jlc-wb .scout-settings-wide-action.is-next {
          margin-top: 8px;
        }
        #jlc-wb .legacy-note.scout-settings-cleanup-note {
          margin-top: 6px;
        }
        #jlc-wb .legacy-note.scout-settings-intro {
          margin: 0 0 8px;
          line-height: 1.45;
        }
        #jlc-wb .legacy-note.scout-settings-backup-note {
          margin: 0 0 8px;
        }
        #jlc-wb .jlc-wb-settings textarea.scout-settings-textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--scout-ui-line);
          border-radius: 12px;
          font-family: monospace;
          font-size: 11.5px;
        }
        #jlc-wb .scout-settings-textarea.is-ai {
          height: 120px;
        }
        #jlc-wb .scout-settings-textarea.is-backup {
          height: 72px;
        }
        #jlc-wb .scout-settings-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }
        #jlc-wb .scout-settings-action {
          flex: 1;
          min-width: 70px;
        }
        #jlc-wb .scout-settings-action.is-copy-all {
          flex: 1.4;
          min-width: 100px;
        }
        #jlc-wb .scout-settings-action.is-prompt {
          min-width: 80px;
        }
        #jlc-wb .scout-settings-action.is-replace {
          flex: 1.2;
          min-width: 80px;
        }
        #jlc-wb .jlc-wb-btn.scout-settings-danger-action,
        #jlc-wb .jlc-wb-btn.scout-settings-danger-action:hover {
          color: #b54708;
        }
        #jlc-wb #scout-wd-form[hidden] {
          display: none !important;
        }
        #jlc-wb .legacy-note.scout-settings-sync-status {
          margin-top: 10px;
          word-break: break-all;
        }
        #jlc-wb .scout-settings-sync-actions {
          display: flex;
          gap: 6px;
          margin-top: 12px;
        }
        #jlc-wb .scout-settings-sync-actions .jlc-wb-btn {
          flex: 1;
        }

        #scout-collect-dialog { width: min(440px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); padding: 0; border: 1px solid var(--scout-ui-line); border-radius: 14px; background: var(--scout-ui-surface); color: var(--scout-ui-text); box-shadow: 0 16px 50px #0004; font: 14px/1.5 'Segoe UI', 'Microsoft YaHei', sans-serif; text-align: left; }
        #scout-collect-dialog::backdrop { background: #0006; }
        .scout-collect-card { padding: 18px; }
        .scout-dialog-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px; }
        #scout-collect-dialog button { min-height: 34px; padding: 6px 10px; border: 1px solid var(--scout-ui-line); border-radius: 7px; background: var(--scout-ui-muted); color: var(--scout-ui-text); cursor: pointer; font: 13px/1.4 'Segoe UI', 'Microsoft YaHei', sans-serif; box-sizing: border-box; }
        #scout-collect-dialog .scout-dialog-head button { width: 32px; height: 32px; min-height: 0; flex: none; padding: 0; }
        #scout-collect-dialog button.primary { background: var(--scout-theme-color); color: white; border-color: transparent; }
        #scout-collect-dialog :is(input,select) { width: 100%; min-height: 38px; padding: 6px 8px; margin: 5px 0 12px; border: 1px solid var(--scout-ui-line); border-radius: 6px; background: var(--scout-ui-muted); color: var(--scout-ui-text); box-sizing: border-box; font: inherit; }
        #scout-collect-dialog label { display: block; font-size: 11px; color: var(--scout-ui-subtle); }
        .scout-tag-search-actions, .scout-collect-actions { display: flex; gap: 7px; }
        .scout-tag-search-actions button, .scout-collect-actions button { flex: 1; }
        .scout-dialog-note { color: var(--scout-ui-subtle); font-size: 11px; margin: 8px 0 14px; }
        #scout-collect-dialog details { border-top: 1px solid var(--scout-ui-line); padding-top: 8px; margin-top: 14px; }
        #scout-collect-dialog summary { cursor: pointer; padding: 7px 0; font-size: 12px; }
        @media (max-width: 820px) { #scout-collect-dialog { width: 100%; max-width: 100%; margin: auto 0 0; max-height: 90dvh; border-radius: 16px 16px 0 0; padding-bottom: env(safe-area-inset-bottom); } }

        /* 追更：同 query 折叠组 + 三站展开行 */
        .scout-track-group-sites {
          display: none;
          flex-direction: column;
          gap: 6px;
          margin: 0 10px 10px;
          padding: 8px 10px;
          border-top: 1px dashed var(--scout-ui-line);
          background: var(--scout-ui-muted);
          border-radius: 0 0 12px 12px;
        }
        .scout-track-group-sites.is-open { display: flex; }
        .scout-track-site-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          font-size: 12px;
        }
        .scout-track-site-row.is-current { font-weight: 650; }
        .scout-track-site-meta { color: var(--scout-ui-subtle); font-size: 11px; flex: 1 1 auto; min-width: 0; }
        .scout-track-site-pill.is-subscribed { opacity: 1; }
        .scout-track-site-pill.is-empty { opacity: 0.45; }
        .jlc-site-pill.is-empty { opacity: 0.5; }

        /* 作品：三站芯片（★ 原站 / 其余去搜）— 跟站点主题色，勿被 cream 全局 button 暗色盖掉 */
        #jlc-wb .scout-work-site-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 6px;
        }
        #jlc-wb .scout-work-site-chip {
          appearance: none;
          border: 1px solid color-mix(in srgb, var(--scout-theme-color) 45%, #e6d3b8) !important;
          background: var(--scout-theme-light, var(--scout-ui-surface)) !important;
          color: var(--scout-theme-dark, var(--scout-ui-text)) !important;
          border-radius: 999px !important;
          padding: 2px 8px !important;
          font-size: 11px !important;
          font-weight: 650 !important;
          cursor: pointer;
          line-height: 1.4;
          box-shadow: none !important;
        }
        #jlc-wb .scout-work-site-chip:hover {
          border-color: var(--scout-theme-color) !important;
          color: var(--scout-theme-color) !important;
          background: #fff !important;
          filter: none !important;
        }
        #jlc-wb .scout-work-site-chip.is-current,
        #jlc-wb .scout-work-site-chip.is-origin {
          border-color: transparent !important;
          background: linear-gradient(var(--scout-theme-color), var(--scout-theme-dark)) !important;
          background-color: var(--scout-theme-color) !important;
          color: #fff !important;
          font-weight: 750 !important;
          box-shadow: 0 2px 0 var(--scout-theme-dark) !important;
        }
`;
}
