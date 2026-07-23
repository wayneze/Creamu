// 25-theme.js

function getScoutThemeCss() {
  return `
        /* 站点配色皮肤体系 (CSS 变量) */
        :root {
          --scout-theme-color: #d4883a;
          --scout-theme-dark: #b56e28;
          --scout-theme-light: #fffdf8;
          --scout-theme-shadow: rgba(212, 136, 58, 0.22);
          --scout-bg-clean: #fafafa;
          --scout-card-bg: #ffffff;
          --scout-text-color: #4a3728;
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

        :where(#jlc-wb, #jlc-wb-fab, #jlc-wb-dialog, #jlc-tracking-pagebar) {
          --creamu-wb-accent: var(--scout-theme-color);
          --creamu-wb-accent-hover: var(--scout-theme-color);
          --creamu-wb-accent-light: var(--scout-theme-color);
          --creamu-wb-accent-dark: var(--scout-theme-dark);
          --creamu-wb-accent-shadow: var(--scout-theme-shadow);
          --creamu-wb-accent-shadow-soft: var(--scout-theme-shadow);
          --creamu-wb-accent-ring: var(--scout-theme-shadow);
          --creamu-wb-accent-overlay: color-mix(in srgb, var(--scout-theme-color) 28%, transparent);
          --creamu-wb-accent-overlay-soft: color-mix(in srgb, var(--scout-theme-color) 18%, transparent);
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

        /* 奶油工作台及 FAB 响应色（覆盖 shared 的固定橙） */
        #jlc-wb-fab {
          position: fixed !important;
          z-index: 2147483000 !important;
          background: linear-gradient(var(--creamu-wb-accent), var(--creamu-wb-accent-dark)) !important;
          background-color: var(--creamu-wb-accent) !important;
          box-shadow: 0 4px 0 var(--creamu-wb-accent-dark), 0 10px 20px var(--creamu-wb-accent-shadow) !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
          display: flex !important;
        }
        #jlc-wb-fab:active, #jlc-wb-fab.is-dragging {
          box-shadow: 0 2px 0 var(--creamu-wb-accent-dark), 0 4px 10px var(--creamu-wb-accent-shadow-soft) !important;
        }
        #scout-search-track-bar.scout-track-fab {
          z-index: 2147483001 !important;
        }
        /*
         * 工作台按钮/导航：必须 !important。
         * cream 页主题用 html.scout-cream-site button:not(.jlc-wb-btn)… 暗色，
         * 而「组合/词库/…」导航是裸 button（无 jlc-wb-btn），会被整排刷黑。
         */
        #jlc-wb .jlc-wb-nav button,
        #jlc-wb .jlc-wb-settings-nav button {
          appearance: none !important;
          flex: 1 1 auto !important;
          border: 0 !important;
          background: var(--creamu-wb-surface-muted) !important;
          background-color: var(--creamu-wb-surface-muted) !important;
          color: var(--creamu-wb-text-subtle) !important;
          padding: 10px 8px !important;
          cursor: pointer !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          border-radius: 12px !important;
          box-shadow: none !important;
        }
        #jlc-wb .jlc-wb-nav button.active,
        #jlc-wb .jlc-wb-settings-nav button.active {
          color: var(--creamu-wb-on-accent) !important;
          background: var(--creamu-wb-accent) !important;
          background-color: var(--creamu-wb-accent) !important;
          box-shadow: 0 2px 0 var(--creamu-wb-accent-dark) !important;
        }
        #jlc-wb .jlc-wb-btn {
          appearance: none !important;
          background: var(--creamu-wb-surface-soft) !important;
          background-color: var(--creamu-wb-surface-soft) !important;
          color: var(--creamu-wb-text-strong) !important;
          border: 1px solid var(--creamu-wb-border-strong) !important;
          box-shadow: 0 2px 0 var(--creamu-wb-border-strong) !important;
        }
        #jlc-wb .jlc-wb-btn.primary {
          background: linear-gradient(var(--creamu-wb-accent), var(--creamu-wb-accent-dark)) !important;
          background-color: var(--creamu-wb-accent) !important;
          border-color: transparent !important;
          color: var(--creamu-wb-on-accent) !important;
          box-shadow: 0 2px 0 var(--creamu-wb-accent-dark) !important;
        }
        #jlc-wb .jlc-wb-btn.primary:hover {
          filter: brightness(1.05);
        }
        #jlc-wb .jlc-wb-btn.ghost {
          background: var(--creamu-wb-surface-soft) !important;
          background-color: var(--creamu-wb-surface-soft) !important;
          color: var(--creamu-wb-text-strong) !important;
          border: 1px solid var(--creamu-wb-border-strong) !important;
        }
        #jlc-wb .jlc-wb-btn.ghost:hover {
          color: var(--creamu-wb-accent) !important;
          border-color: var(--creamu-wb-accent) !important;
          background: var(--creamu-wb-surface-raised) !important;
        }
        #jlc-wb .jlc-wb-btn.danger {
          background: #f3d5d0 !important;
          background-color: #f3d5d0 !important;
          border-color: #e8b8b0 !important;
          color: #8a3a32 !important;
          box-shadow: none !important;
        }
        #jlc-wb .jlc-wb-chip {
          background: var(--creamu-wb-surface-raised) !important;
          background-color: var(--creamu-wb-surface-raised) !important;
          color: var(--creamu-wb-text-strong) !important;
          border: 1px solid var(--creamu-wb-border-strong) !important;
          box-shadow: 0 2px 0 var(--creamu-wb-control-shadow) !important;
        }
        #jlc-wb .jlc-wb-chip.is-on {
          background: var(--creamu-wb-accent) !important;
          background-color: var(--creamu-wb-accent) !important;
          border-color: transparent !important;
          color: var(--creamu-wb-on-accent) !important;
          box-shadow: 0 2px 0 var(--creamu-wb-accent-dark) !important;
        }
        #jlc-wb .jlc-wb-open-btn {
          background: linear-gradient(var(--creamu-wb-accent), var(--creamu-wb-accent-dark)) !important;
          background-color: var(--creamu-wb-accent) !important;
          color: var(--creamu-wb-on-accent) !important;
          box-shadow: 0 3px 0 var(--creamu-wb-accent-dark) !important;
          border: 0 !important;
        }
        #jlc-wb .jlc-wb-more-btn {
          background: var(--creamu-wb-surface-soft) !important;
          color: var(--creamu-wb-text-strong) !important;
          border: 1px solid var(--creamu-wb-border-strong) !important;
        }
        #jlc-wb .jlc-wb-icon-btn {
          background: var(--creamu-wb-surface-raised) !important;
          color: var(--creamu-wb-text-strong) !important;
          border: 1px solid var(--creamu-wb-border-strong) !important;
          box-shadow: 0 2px 0 var(--creamu-wb-control-shadow) !important;
        }
        /* 组合底栏：搜索主色、收藏/清空 ghost */
        #jlc-wb .scout-combo-dock-actions .jlc-wb-btn.primary,
        #jlc-wb .scout-combo-dock-actions #scout-combo-search-btn {
          background: linear-gradient(var(--creamu-wb-accent), var(--creamu-wb-accent-dark)) !important;
          background-color: var(--creamu-wb-accent) !important;
          color: var(--creamu-wb-on-accent) !important;
          border-color: transparent !important;
        }
        #jlc-wb .legacy-toggle input[type="checkbox"] {
          accent-color: var(--creamu-wb-accent) !important;
        }
        #jlc-wb .jlc-wb-search:focus {
          border-color: var(--creamu-wb-accent) !important;
        }

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

        /* 组合页底栏：宽度跟工作台走，一行流式自适应 */
        #jlc-wb [data-jlc-wb-page="combo"] {
          display: flex !important;
          flex-direction: column !important;
          min-width: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        #jlc-wb [data-jlc-wb-page="combo"] > .jlc-wb-footer.scout-combo-dock,
        #jlc-wb .scout-combo-dock {
          flex: 0 0 auto !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px)) !important;
          box-sizing: border-box !important;
          border-top: 1px solid #ead7bb !important;
          background: #fffaf3 !important;
          box-shadow: 0 -4px 12px rgba(80, 50, 20, 0.06) !important;
        }
        #jlc-wb .scout-combo-dock-inner {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 8px !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }
        #jlc-wb .scout-combo-dock-sites {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 4px !important;
          flex: 0 1 auto !important;
          min-width: 0 !important;
        }
        #jlc-wb .scout-combo-dock-sites .scout-combo-site {
          flex: 0 0 auto !important;
          box-sizing: border-box !important;
        }
        #jlc-wb .scout-combo-dock-sites .scout-combo-site:has(input:checked) {
          border-color: var(--scout-theme-color) !important;
          background: var(--scout-theme-light, #fff3e0) !important;
          color: var(--scout-theme-dark, #b56e28) !important;
          font-weight: 650;
        }
        #jlc-wb .scout-combo-dock-track {
          display: inline-flex !important;
          align-items: center !important;
          gap: 3px !important;
          flex: 0 0 auto !important;
          margin: 0 !important;
          font-size: 11.5px !important;
          color: #6a5040 !important;
          cursor: pointer;
          white-space: nowrap;
          text-transform: none !important;
          letter-spacing: 0 !important;
        }
        #jlc-wb .scout-combo-dock-track input {
          width: 14px !important;
          height: 14px !important;
          margin: 0 !important;
          accent-color: var(--scout-theme-color);
        }
        /* 按钮区吃掉剩余宽度；窄到放不下则整行 100% */
        #jlc-wb .scout-combo-dock-actions {
          display: flex !important;
          flex: 1 1 200px !important;
          gap: 6px !important;
          min-width: min(100%, 200px) !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        #jlc-wb .scout-combo-dock-actions .jlc-wb-btn {
          flex: 1 1 0 !important;
          width: auto !important;
          min-width: 0 !important;
          max-width: none !important;
          justify-content: center !important;
          min-height: 34px !important;
          padding: 6px 8px !important;
          font-size: 12.5px !important;
          box-sizing: border-box !important;
        }
        #jlc-wb .scout-combo-dock-actions #scout-combo-search-btn {
          flex: 1.35 1 0 !important;
        }
        #jlc-wb .scout-combo-dock-actions #scout-combo-clear-btn {
          flex: 0.75 1 0 !important;
        }
        /* 极窄：引擎+追更一行，按钮整行三等分 */
        @media (max-width: 380px) {
          #jlc-wb .scout-combo-dock-actions {
            flex: 1 1 100% !important;
            width: 100% !important;
            min-width: 100% !important;
          }
        }

        /* Scout 页面块：不依赖 #jlc-wb-view-root */
        #jlc-wb .jlc-wb-view-block {
          background: #fffdf8;
          border: 1px solid #efe0cc;
          border-radius: 16px;
          padding: 14px;
          margin-bottom: 14px;
          box-shadow: 0 3px 0 #ead7bb;
        }
        #jlc-wb .jlc-wb-view-title {
          font-size: 12px;
          color: var(--scout-theme-color);
          font-weight: 750;
          letter-spacing: .5px;
          margin: 0 0 12px;
          text-transform: uppercase;
        }
        #jlc-wb .stat-box {
          display: flex;
          justify-content: space-around;
          background: #fffdf8;
          border: 1px solid #efe0cc;
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 4px;
        }
        #jlc-wb .stat-item { text-align: center; }
        #jlc-wb .stat-item b {
          display: block;
          color: var(--scout-theme-color);
          font-size: 22px;
          margin-bottom: 4px;
        }
        #jlc-wb .stat-item span { font-size: 11px; color: #9a7d60; }

        /*
         * 工作台表单：强制奶油浅色，避免 cream 页主题全局 input 暗色
         * （html.scout-cream-site input { background: var(--scout-card) !important }）
         */
        #jlc-wb {
          color-scheme: light;
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
          background: #fffaf3 !important;
          color: #4a3728 !important;
          border: 1px solid #e4d4bc !important;
          box-shadow: 0 1px 0 #efe0cc !important;
          color-scheme: light !important;
          caret-color: var(--scout-theme-dark, #b56e28) !important;
        }
        #jlc-wb input[type="text"]::placeholder,
        #jlc-wb input[type="search"]::placeholder,
        #jlc-wb input[type="password"]::placeholder,
        #jlc-wb input:not([type])::placeholder,
        #jlc-wb textarea::placeholder,
        #jlc-wb .jlc-wb-search::placeholder {
          color: #a89078 !important;
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
          background: #fff !important;
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--scout-theme-color) 25%, transparent) !important;
        }

        /* 设置页表单（settings 不在 .jlc-wb-settings 抽屉内） */
        #jlc-wb [data-jlc-wb-page="settings"] label {
          display: block;
          font-size: 12px;
          color: #9a7d60;
          margin-top: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        #jlc-wb [data-jlc-wb-page="settings"] input[type="text"],
        #jlc-wb [data-jlc-wb-page="settings"] input[type="password"],
        #jlc-wb [data-jlc-wb-page="settings"] textarea,
        #jlc-wb [data-jlc-wb-page="settings"] select {
          width: 100%;
          padding: 12px;
          margin-top: 8px;
          border-radius: 12px;
          border: 1px solid #e4d4bc !important;
          background: #fff !important;
          color: #4a3728 !important;
          font-size: 14px;
          box-sizing: border-box;
        }
        #jlc-wb [data-jlc-wb-page="settings"] input:focus,
        #jlc-wb [data-jlc-wb-page="settings"] textarea:focus,
        #jlc-wb [data-jlc-wb-page="settings"] select:focus {
          border-color: var(--scout-theme-color) !important;
          outline: none;
          background: #fff !important;
        }

        /* 采集弹层 */
        #scout-collect-dialog {
          position: fixed;
          inset: 0;
          z-index: 1000002;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(90, 60, 30, 0.35);
          padding: 20px;
        }
        #scout-collect-dialog .scout-collect-card {
          width: min(400px, 92vw);
          background: #fffdf8;
          border: 1px solid #e4d4bc;
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 18px 50px rgba(90, 60, 30, 0.22);
          color: #4a3728;
        }
        #scout-collect-dialog h4 {
          margin: 0 0 6px;
          font-size: 16px;
          color: #4a3728;
        }
        #scout-collect-dialog .scout-collect-term {
          margin: 0 0 12px;
          font-size: 15px;
          font-weight: 750;
          color: var(--scout-theme-color);
          word-break: break-word;
        }
        #scout-collect-dialog label {
          display: block;
          font-size: 12px;
          color: #9a7d60;
          margin-top: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        #scout-collect-dialog label.scout-collect-loved {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 14px;
          text-transform: none;
          letter-spacing: 0;
          font-size: 13.5px;
          color: #4a3728;
          cursor: pointer;
        }
        #scout-collect-dialog input[type="text"],
        #scout-collect-dialog select {
          width: 100%;
          padding: 10px 12px;
          margin-top: 6px;
          border-radius: 12px;
          border: 1px solid #e4d4bc !important;
          background: #fffaf3 !important;
          color: #4a3728 !important;
          font-size: 14px;
          box-sizing: border-box;
          color-scheme: light !important;
        }
        #scout-collect-dialog input[type="text"]:focus,
        #scout-collect-dialog select:focus {
          border-color: var(--scout-theme-color) !important;
          outline: none;
          background: #fff !important;
        }
        #scout-collect-dialog input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: var(--scout-theme-color);
        }
        #scout-collect-dialog .scout-collect-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 16px;
        }

        /* 追更：同 query 折叠组 + 三站展开行 */
        .scout-track-group-sites {
          display: none;
          flex-direction: column;
          gap: 6px;
          margin: 0 10px 10px;
          padding: 8px 10px;
          border-top: 1px dashed #efe0cc;
          background: rgba(255, 250, 240, 0.55);
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
        .scout-track-site-meta { color: #9a7d60; font-size: 11px; flex: 1 1 auto; min-width: 0; }
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
          background: var(--scout-theme-light, #fffaf3) !important;
          color: var(--scout-theme-dark, #6b4a2e) !important;
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

        .scout-breakpoint-highlight {
          outline: 3px dashed var(--scout-theme-color) !important;
          outline-offset: 4px !important;
          position: relative !important;
          box-shadow: 0 0 20px var(--scout-theme-shadow) !important;
          animation: scoutPulse 1.5s infinite alternate !important;
          transition: outline-color 0.3s;
        }
        @keyframes scoutPulse {
          from { outline-color: var(--scout-theme-color); }
          to { outline-color: #ff5f56; }
        }

        .scout-tag-explored {
          opacity: 0.65 !important;
          border: 1px dashed var(--scout-theme-color) !important;
          border-radius: 4px !important;
          padding: 1px 4px !important;
        }
        .scout-tag-loved {
          box-shadow: 0 0 8px var(--scout-theme-shadow) !important;
          border: 1px solid var(--scout-theme-color) !important;
          font-weight: 750 !important;
          background: var(--scout-theme-light) !important;
        }

        /* PC：站点 cropped 展开 */
        @media (min-width: 821px) {
          .video-metadata.cropped,
          .ordered-label-list.cropped,
          .video-tags-list.cropped,
          .scout-tags-expanded {
            max-height: none !important;
            overflow: visible !important;
            height: auto !important;
          }
        }
        /* 手机详情：标签默认一行；描述默认两行；点展开 */
        @media (max-width: 820px) {
          .video-metadata.scout-tags-collapsed,
          .ordered-label-list.scout-tags-collapsed,
          .video-tags-list.scout-tags-collapsed,
          .metadata-row.video-tags.scout-tags-collapsed,
          .video-tags.scout-tags-collapsed,
          .video-metadata.cropped:not(.scout-tags-expanded) {
            max-height: 2.15em !important;
            overflow: hidden !important;
            height: auto !important;
          }
          .video-metadata.scout-tags-expanded,
          .ordered-label-list.scout-tags-expanded,
          .video-tags-list.scout-tags-expanded,
          .metadata-row.video-tags.scout-tags-expanded,
          .video-tags.scout-tags-expanded {
            max-height: none !important;
            overflow: visible !important;
            height: auto !important;
          }
          .scout-desc-collapsed,
          .video-description.scout-desc-collapsed,
          #video-description.scout-desc-collapsed,
          [itemprop="description"].scout-desc-collapsed {
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            -webkit-line-clamp: 2 !important;
            max-height: 3em !important;
            overflow: hidden !important;
            line-height: 1.45 !important;
            word-break: break-word !important;
          }
          .scout-desc-expanded,
          .video-description.scout-desc-expanded,
          #video-description.scout-desc-expanded {
            display: block !important;
            -webkit-line-clamp: unset !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .scout-tags-toggle,
          .scout-desc-toggle {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 4px 0 8px !important;
            padding: 8px 12px !important;
            border: 1px solid rgba(255,255,255,0.16) !important;
            border-radius: 12px !important;
            background: rgba(0,0,0,0.35) !important;
            color: #e8eaef !important;
            font-size: 13px !important;
            font-weight: 650 !important;
            cursor: pointer !important;
            box-sizing: border-box !important;
            -webkit-tap-highlight-color: transparent;
          }
          html.scout-cream-site .scout-tags-toggle,
          html.scout-cream-site .scout-desc-toggle {
            background: var(--scout-page-panel, rgba(30,36,48,.92)) !important;
            border-color: var(--scout-page-border, rgba(255,255,255,.14)) !important;
            color: var(--scout-text-color, #e8eaef) !important;
          }
        }
        @media (min-width: 821px) {
          .scout-tags-toggle,
          .scout-desc-toggle { display: none !important; }
        }
        /* 详情词库行：嵌在 metadata 内，不另起大卡片 */
        #scout-lex-hit-bar.scout-lex-hit-inline,
        li.scout-lex-hit-inline,
        .scout-lex-hit-bar.scout-lex-hit-inline {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 4px !important;
          list-style: none !important;
          width: 100% !important;
          margin: 6px 0 0 !important;
          padding: 6px 0 0 !important;
          border: 0 !important;
          border-top: 1px solid rgba(0, 0, 0, 0.08) !important;
          background: transparent !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          clear: both !important;
        }
        .scout-lex-inline-prefix {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-width: 18px !important;
          height: 18px !important;
          padding: 0 5px !important;
          border-radius: 3px !important;
          font-size: 10px !important;
          font-weight: 800 !important;
          color: #fff !important;
          background: var(--scout-theme-color, #d4883a) !important;
          line-height: 1 !important;
          flex: 0 0 auto !important;
        }
        .scout-lex-hit-inline .scout-lex-flow-chips {
          display: contents !important;
        }
        .scout-lex-hit-inline .scout-lex-chip {
          display: inline-flex !important;
          align-items: center !important;
          padding: 2px 8px !important;
          border-radius: 3px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          line-height: 1.35 !important;
          background: rgba(212, 136, 58, 0.12) !important;
          color: var(--scout-text-color, #4a3728) !important;
          border: 1px solid rgba(212, 136, 58, 0.35) !important;
        }
        .scout-lex-hit-inline .scout-lex-chip.is-loved {
          background: rgba(229, 72, 64, 0.12) !important;
          color: #b8322b !important;
          border-color: rgba(229, 72, 64, 0.4) !important;
        }
        .scout-lex-hit-inline .scout-lex-chip.is-more {
          background: transparent !important;
          border-style: dashed !important;
          color: #888 !important;
        }
        .scout-lex-flow {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          align-items: center;
        }
        .scout-lex-flow-empty {
          font-size: 11px;
          color: #9a7d60;
        }
        .scout-lex-chip {
          display: inline-flex;
          align-items: center;
          max-width: 100%;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11.5px;
          font-weight: 650;
          line-height: 1.35;
          background: #efe4d2;
          color: #5a4030;
          border: 1px solid #e0cdae;
        }
        .scout-lex-chip.is-loved {
          background: #fde8e6;
          color: #b8322b;
          border-color: #f0b8b0;
        }
        .scout-lex-chip.is-more {
          background: transparent;
          border-style: dashed;
          color: #9a7d60;
        }
        /* 列表：缩略图底部轻渐变 + 胶囊标签（无「命中」文案） */
        .scout-lex-flow-overlay {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 4px !important;
          position: absolute !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          z-index: 30 !important;
          margin: 0 !important;
          padding: 18px 6px 6px !important;
          max-height: 54% !important;
          overflow: hidden !important;
          pointer-events: none !important;
          background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,.15) 35%, rgba(0,0,0,.72) 100%) !important;
          border-radius: 0 0 10px 10px !important;
          box-sizing: border-box !important;
        }
        /*
         * 仅在有词库叠层时改 position，避免全局 .thumb{relative}
         * 打坏 xnxx/xvideos 手机站比例盒 → 列表「被挡没」
         */
        .thumb-inside:has(.scout-lex-flow-overlay),
        .thumb:has(.scout-lex-flow-overlay),
        .mbimg:has(.scout-lex-flow-overlay),
        .mbcontent:has(.scout-lex-flow-overlay) {
          position: relative !important;
        }
        /* ===== 详情页：收藏作品按钮（PC / 手机） ===== */
        .scout-work-fav-bar {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          margin: 8px 0 10px !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          clear: both !important;
        }
        .scout-work-fav-btn {
          display: inline-flex !important;
          align-items: center !important;
          gap: 10px !important;
          min-height: 44px !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 8px 14px 8px 12px !important;
          border: 0 !important;
          border-radius: 14px !important;
          cursor: pointer !important;
          box-sizing: border-box !important;
          text-align: left !important;
          color: #fff !important;
          background: linear-gradient(135deg, var(--scout-accent, #e8a24e), var(--scout-theme-dark, #b56e28)) !important;
          box-shadow: 0 3px 0 rgba(0,0,0,.22), 0 8px 18px rgba(0,0,0,.28) !important;
          transition: transform .12s ease, filter .12s ease, box-shadow .12s ease !important;
          -webkit-tap-highlight-color: transparent;
        }
        .scout-work-fav-btn:hover {
          filter: brightness(1.06);
        }
        .scout-work-fav-btn:active {
          transform: translateY(1px);
          box-shadow: 0 1px 0 rgba(0,0,0,.22), 0 4px 10px rgba(0,0,0,.22) !important;
        }
        .scout-work-fav-btn.is-saved {
          background: linear-gradient(135deg, #3d4a3a, #2a3828) !important;
          box-shadow: 0 0 0 1px rgba(120, 200, 140, 0.45), 0 6px 14px rgba(0,0,0,.25) !important;
          color: #e8f8ec !important;
        }
        .scout-work-fav-ico {
          flex: 0 0 auto !important;
          width: 28px !important;
          height: 28px !important;
          border-radius: 50% !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 16px !important;
          line-height: 1 !important;
          background: rgba(0,0,0,.22) !important;
        }
        .scout-work-fav-btn.is-saved .scout-work-fav-ico {
          color: #ffd76a !important;
          background: rgba(255, 215, 100, 0.16) !important;
        }
        .scout-work-fav-text {
          display: flex !important;
          flex-direction: column !important;
          gap: 1px !important;
          min-width: 0 !important;
        }
        .scout-work-fav-label {
          font-size: 14px !important;
          font-weight: 750 !important;
          line-height: 1.2 !important;
          letter-spacing: 0.2px !important;
        }
        .scout-work-fav-sub {
          font-size: 11px !important;
          font-weight: 500 !important;
          line-height: 1.2 !important;
          opacity: 0.88 !important;
        }
        @media (max-width: 820px) {
          .scout-work-fav-bar {
            width: 100% !important;
            margin: 10px 0 12px !important;
          }
          .scout-work-fav-btn {
            width: 100% !important;
            min-height: 48px !important;
            padding: 10px 14px !important;
            border-radius: 16px !important;
            justify-content: flex-start !important;
          }
          .scout-work-fav-ico {
            width: 32px !important;
            height: 32px !important;
            font-size: 18px !important;
          }
          .scout-work-fav-label {
            font-size: 15px !important;
          }
          .scout-work-fav-sub {
            font-size: 12px !important;
          }
        }
        @media (min-width: 821px) {
          .scout-work-fav-btn {
            min-width: 200px !important;
          }
        }
        /* 奶油主题下跟站强调色 */
        html.scout-cream-site .scout-work-fav-btn:not(.is-saved) {
          background: linear-gradient(135deg, var(--scout-accent, #5b8def), color-mix(in srgb, var(--scout-accent, #5b8def) 70%, #000)) !important;
        }
        html.scout-cream-site body.creamu-site-xvideos .scout-work-fav-btn:not(.is-saved) {
          background: linear-gradient(135deg, #e54840, #9e2a24) !important;
        }
        html.scout-cream-site body.creamu-site-xnxx .scout-work-fav-btn:not(.is-saved) {
          background: linear-gradient(135deg, #4d8ef0, #1a4fa0) !important;
        }
        html.scout-cream-site body.creamu-site-eporner .scout-work-fav-btn:not(.is-saved) {
          background: linear-gradient(135deg, #3cb86a, #1e7a42) !important;
        }

        /* 手机列表预览层：绝对铺满，不参与文档流、不撑大卡片 */
        .scout-list-preview-layer {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100% !important;
          height: 100% !important;
          z-index: 20 !important;
          overflow: hidden !important;
          pointer-events: none !important;
          border-radius: inherit !important;
        }
        .scout-list-preview-video {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border: 0 !important;
          background: transparent !important;
          pointer-events: none !important;
        }
        /* 不强制改 position，避免 eporner 卡被撑大；有 relative 的宿主才叠角标 */
        .scout-preview-playing {
          outline: 2px solid rgba(255, 200, 80, 0.75);
          outline-offset: -2px;
        }
        .thumb.scout-preview-playing,
        .thumb-inside.scout-preview-playing,
        .mbcontent.scout-preview-playing,
        .mbimg.scout-preview-playing {
          position: relative !important;
        }
        .scout-preview-playing::after {
          content: '预览中 · 再点进入';
          position: absolute;
          left: 6px;
          bottom: 6px;
          z-index: 25;
          padding: 2px 7px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 650;
          color: #fff;
          background: rgba(0,0,0,.62);
          pointer-events: none;
          max-width: calc(100% - 12px);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* 无 :has 的老内核兜底：JS 会写 inline position:relative */
        .scout-lex-flow-overlay .scout-lex-flow-chips {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 4px !important;
          align-items: center !important;
        }
        .scout-lex-flow-overlay .scout-lex-chip {
          font-size: 10px !important;
          font-weight: 650 !important;
          padding: 2px 7px !important;
          border-radius: 999px !important;
          color: #fff !important;
          background: rgba(18, 20, 26, 0.72) !important;
          border: 1px solid rgba(255,255,255,0.2) !important;
          box-shadow: 0 1px 3px rgba(0,0,0,.25) !important;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        .scout-lex-flow-overlay .scout-lex-chip.is-loved {
          color: #fff !important;
          background: rgba(229, 72, 64, 0.92) !important;
          border-color: rgba(255, 180, 160, 0.5) !important;
        }
        .scout-lex-flow-overlay .scout-lex-chip.is-more {
          background: rgba(255,255,255,0.16) !important;
          border-style: dashed !important;
          color: rgba(255,255,255,0.9) !important;
        }
        /* 详情页词库条 */
        .scout-lex-hit-bar .scout-lex-chip {
          background: #f3ebe0 !important;
          color: #4a3728 !important;
          border: 1px solid #e4d4bc !important;
          padding: 3px 9px !important;
          font-size: 12px !important;
        }
        .scout-lex-hit-bar .scout-lex-chip.is-loved {
          background: #fde8e6 !important;
          color: #b8322b !important;
          border-color: #f0b8b0 !important;
        }
        .scout-lex-flow-work .scout-lex-chip {
          background: #efe4d2 !important;
          color: #5a4030 !important;
          border: 1px solid #e0cdae !important;
        }
        .scout-lex-flow-work .scout-lex-chip.is-loved {
          background: #fde8e6 !important;
          color: #b8322b !important;
          border-color: #f0b8b0 !important;
        }
        .scout-tag-blocked {
          opacity: 0.28 !important;
          text-decoration: line-through !important;
          pointer-events: none !important;
          cursor: not-allowed !important;
          filter: grayscale(0.6);
        }
        /*
         * 详情页原生标签融合：统一胶囊，词库内/外两套样式
         * xvideos/xnxx a.is-keyword · eporner .vit-tag a / .vit-category a
         */
        html.scout-cream-site a.scout-site-tag,
        html.scout-cream-site .scout-site-tag {
          display: inline-flex !important;
          align-items: center !important;
          gap: 4px !important;
          flex-wrap: nowrap !important;
          max-width: 100% !important;
          margin: 2px 3px !important;
          padding: 3px 9px !important;
          border-radius: 999px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          line-height: 1.35 !important;
          text-decoration: none !important;
          box-sizing: border-box !important;
          vertical-align: middle !important;
          transition: background .12s ease, border-color .12s ease, color .12s ease;
        }
        /* 未入库：暗底描边 */
        html.scout-cream-site a.scout-site-tag.scout-tag-out,
        html.scout-cream-site .scout-site-tag.scout-tag-out {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.14) !important;
          color: #c8cdd8 !important;
        }
        html.scout-cream-site a.scout-site-tag.scout-tag-out:hover {
          border-color: var(--scout-accent, #5b8def) !important;
          color: #fff !important;
        }
        /* 已入库：强调色填充 */
        html.scout-cream-site a.scout-site-tag.scout-tag-in,
        html.scout-cream-site .scout-site-tag.scout-tag-in,
        html.scout-cream-site a.scout-site-tag.scout-tag-explored {
          background: var(--scout-accent-soft, rgba(91,141,239,.22)) !important;
          border: 1px solid var(--scout-accent, #5b8def) !important;
          color: #f0f4ff !important;
        }
        html.scout-cream-site a.scout-site-tag.scout-tag-loved {
          background: rgba(229, 72, 64, 0.28) !important;
          border-color: #e54840 !important;
          color: #ffe8e6 !important;
          box-shadow: 0 0 0 1px rgba(229, 72, 64, 0.25);
        }
        html.scout-cream-site .scout-tag-zh {
          font-size: 11px !important;
          font-weight: 650 !important;
          opacity: 0.92;
          color: inherit !important;
          border-left: 1px solid rgba(255,255,255,0.22);
          padding-left: 5px;
          margin-left: 1px;
          max-width: 7em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        html.scout-cream-site .scout-tag-heart {
          color: #ff6b62 !important;
          font-size: 11px !important;
          line-height: 1 !important;
        }
        html.scout-cream-site .scout-tag-addon {
          display: inline-flex !important;
          gap: 2px !important;
          margin-left: 2px !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          line-height: 1 !important;
          vertical-align: middle !important;
        }
        html.scout-cream-site .scout-tag-addon span {
          cursor: pointer;
          border-radius: 4px !important;
          padding: 1px 3px !important;
          background: rgba(0,0,0,0.28) !important;
        }
        /* 标签容器：可换行，暗色面板 */
        html.scout-cream-site .video-metadata,
        html.scout-cream-site .video-tags-list,
        html.scout-cream-site .ordered-label-list,
        html.scout-cream-site .metadata-row.video-metadata {
          background: transparent !important;
        }
        html.scout-cream-site .video-metadata ul,
        html.scout-cream-site .video-tags-list ul,
        html.scout-cream-site .ordered-label-list ul {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 2px 0 !important;
          height: auto !important;
        }
        @media (min-width: 821px) {
          html.scout-cream-site .video-metadata ul,
          html.scout-cream-site .video-tags-list ul,
          html.scout-cream-site .ordered-label-list ul {
            max-height: none !important;
            overflow: visible !important;
          }
        }

        /* 列表屏蔽：!important + 类名，避免主题强制 display/opacity 盖掉内联样式 */
        .thumb-block.scout-blocked-hide,
        .video-block.scout-blocked-hide,
        .mb.scout-blocked-hide,
        .post.scout-blocked-hide,
        [id^="video_"].scout-blocked-hide {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
        .thumb-block.scout-blocked-dim,
        .video-block.scout-blocked-dim,
        .mb.scout-blocked-dim,
        .post.scout-blocked-dim,
        [id^="video_"].scout-blocked-dim {
          opacity: 0.08 !important;
          pointer-events: none !important;
        }

        /* 已点：PC 整卡略淡；手机缩略图遮罩 + 角标（与弱屏蔽 opacity~0.08 区分） */
        .scout-visited-item {
          opacity: 0.78 !important;
          filter: none !important;
        }
        .scout-visited-item::after {
          content: none !important;
          display: none !important;
        }
        .scout-visited-item .thumb-inside::before,
        .scout-visited-item .thumb::before {
          content: none !important;
          display: none !important;
        }
        body.creamu-site-xvideos .mozaique .thumb-block.scout-visited-item,
        body.creamu-site-xnxx .mozaique .thumb-block.scout-visited-item,
        body.creamu-site-eporner #videos-list .post.scout-visited-item,
        body.creamu-site-eporner .post.scout-visited-item,
        body.creamu-site-eporner #vidresults .mb.scout-visited-item,
        body.creamu-site-eporner .mb.scout-visited-item {
          outline: none !important;
        }
        @media (max-width: 820px) {
          .scout-visited-item {
            opacity: 1 !important;
            position: relative !important;
            outline: 2px solid rgba(200, 200, 210, 0.55) !important;
            outline-offset: 0 !important;
          }
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb.scout-visited-item,
          html.scout-cream-site body.creamu-site-eporner .mb.scout-visited-item {
            opacity: 1 !important;
          }
          .scout-visited-item .thumb,
          .scout-visited-item .thumb-inside,
          .scout-visited-item .mbimg,
          .scout-visited-item .mbcontent {
            position: relative !important;
          }
          .scout-visited-item .thumb::after,
          .scout-visited-item .thumb-inside::after,
          .scout-visited-item .mbimg::after,
          .scout-visited-item .mbcontent::after {
            content: '' !important;
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background: rgba(0, 0, 0, 0.42) !important;
            pointer-events: none !important;
            z-index: 25 !important;
            border-radius: inherit;
          }
          .scout-visited-item > a:first-child,
          .scout-visited-item a.thumb,
          .scout-visited-item .frame-block > a {
            position: relative !important;
          }
          .scout-visited-item::before {
            content: '过' !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: absolute !important;
            top: 6px !important;
            right: 6px !important;
            z-index: 40 !important;
            min-width: 22px !important;
            height: 20px !important;
            padding: 0 6px !important;
            border-radius: 6px !important;
            font-size: 11px !important;
            font-weight: 750 !important;
            line-height: 1 !important;
            color: #f2f2f4 !important;
            background: rgba(0, 0, 0, 0.62) !important;
            border: 1px solid rgba(255, 255, 255, 0.22) !important;
            pointer-events: none !important;
            box-sizing: border-box !important;
          }
        }

        .scout-pub-loved-card {
          outline: 3px solid var(--scout-theme-color) !important;
          outline-offset: 2px !important;
          box-shadow: 0 10px 30px var(--scout-theme-shadow) !important;
          position: relative !important;
        }
        .scout-pub-badge {
          position: absolute;
          top: 4px;
          left: 4px;
          background: var(--scout-theme-color);
          color: #fff;
          font-size: 10px;
          font-weight: bold;
          padding: 1px 5px;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
          z-index: 5;
          pointer-events: none;
        }

        /*
         * 列表「一卡一框」：统一暗卡 + 浅字，三站只差强调色（PC/手机同结构）
         */
        /* xvideos / xnxx 列表卡框 */
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block {
          box-sizing: border-box !important;
          background: var(--scout-card-bg, #1e2430) !important;
          border: 1px solid var(--scout-page-border, rgba(255,255,255,.10)) !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 14px rgba(0,0,0,.28) !important;
          overflow: hidden !important;
          padding: 6px !important;
          color: #e8eaef !important;
        }
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block {
          box-shadow: 0 4px 14px rgba(229, 72, 64, 0.12) !important;
        }
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block {
          box-shadow: 0 4px 14px rgba(77, 142, 240, 0.12) !important;
        }
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb-inside,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb-inside,
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb {
          border-radius: 8px !important;
          overflow: hidden !important;
          max-width: 100% !important;
        }
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb-under,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb-under {
          padding: 4px 2px 0 !important;
          box-sizing: border-box !important;
          max-width: 100% !important;
          color: #e8eaef !important;
        }
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block p,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block p,
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block p a,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block p a,
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb-under,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb-under,
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb-under a,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb-under a,
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .metadata,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .metadata,
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .metadata a,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .metadata a,
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .uploader,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .uploader,
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .uploader a,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .uploader a {
          color: #e8eaef !important;
          max-width: 100% !important;
          overflow: hidden !important;
          word-break: break-word !important;
          opacity: 1 !important;
        }
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block p a,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block p a,
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb-under a,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb-under a {
          color: var(--scout-link, #8eb4f0) !important;
          font-weight: 650 !important;
        }
        /*
         * eporner 列表：只做轻染色，绝不改 display/float/width/img position
         * （grid + absolute 图会把卡压没 / 挡死）
         */
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb,
        html.scout-cream-site body.creamu-site-eporner .mb[data-id] {
          background: var(--scout-card-bg, #161e18) !important;
          border: 1px solid var(--scout-page-border, rgba(255,255,255,.10)) !important;
          border-radius: 10px !important;
          box-shadow: 0 2px 10px rgba(0,0,0,.22) !important;
          color: #e8eaef !important;
          box-sizing: border-box !important;
        }
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbtit,
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbtit a,
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbunder,
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbunder a,
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbstats,
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mb-uploader a {
          color: #e8eaef !important;
          opacity: 1 !important;
        }
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbtit a {
          color: var(--scout-link, #7fd4a0) !important;
          font-weight: 650 !important;
        }
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb img {
          visibility: visible !important;
          opacity: 1 !important;
        }

        /* PC：顶部超矮订阅条 */
        #scout-search-track-bar.scout-track-banner {
          position: fixed !important;
          top: 8px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 999990 !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          max-width: min(380px, 72vw) !important;
          min-height: 0 !important;
          height: auto !important;
          padding: 3px 4px 3px 10px !important;
          border-radius: 999px !important;
          background: rgba(18, 20, 28, 0.92) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          box-shadow: 0 4px 12px rgba(0,0,0,.28) !important;
          color: #e8eaef !important;
          font-size: 11.5px !important;
          line-height: 1.2 !important;
          box-sizing: border-box !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        #scout-search-track-bar .scout-track-banner-text {
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 600;
        }
        #scout-search-track-bar .scout-track-banner-btn {
          flex: 0 0 auto;
          border: 0;
          border-radius: 999px;
          padding: 2px 9px;
          min-height: 22px;
          font-size: 11px;
          font-weight: 650;
          line-height: 1.2;
          cursor: pointer;
          background: var(--scout-accent, #5b8def);
          color: #fff;
        }
        #scout-search-track-bar.scout-track-banner.is-on .scout-track-banner-btn {
          background: rgba(255,255,255,0.12);
          color: #e8eaef;
        }
        /* 断点条：全局压成单行矮胶囊 */
        #jlc-tracking-pagebar {
          min-height: 0 !important;
          max-height: 36px !important;
          padding: 4px 8px !important;
          border-radius: 999px !important;
          gap: 6px !important;
        }
        #jlc-tracking-pagebar .jlc-tracking-pagebar-text {
          font-size: 11.5px !important;
          line-height: 1.2 !important;
        }
        #jlc-tracking-pagebar button {
          min-height: 22px !important;
          padding: 2px 8px !important;
          font-size: 11px !important;
        }
        /* 手机：订阅小圆钮 —— 固定视口右下，在工作台钮上方 */
        #scout-search-track-bar.scout-track-fab {
          position: fixed !important;
          right: 16px !important;
          bottom: 64px !important;
          left: auto !important;
          top: auto !important;
          transform: none !important;
          z-index: 999991 !important;
          width: 40px !important;
          height: 40px !important;
          min-width: 40px !important;
          max-width: 40px !important;
          padding: 0 !important;
          margin: 0 !important;
          border-radius: 50% !important;
          border: 1px solid rgba(255,255,255,0.14) !important;
          background: rgba(18, 20, 28, 0.92) !important;
          box-shadow: 0 4px 14px rgba(0,0,0,.35) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          color: #f0f0f0 !important;
          font-size: 18px !important;
          line-height: 1 !important;
          box-sizing: border-box !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          -webkit-tap-highlight-color: transparent;
        }
        #scout-search-track-bar.scout-track-fab.is-on {
          border-color: rgba(255, 200, 80, 0.55) !important;
          box-shadow: 0 4px 16px rgba(255, 180, 40, 0.28) !important;
        }
        #scout-search-track-bar.scout-track-fab .scout-track-fab-ico {
          pointer-events: none;
        }
        @media (max-width: 820px) {
          #jlc-tracking-pagebar {
            top: 6px !important;
            bottom: auto !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: min(340px, 94vw) !important;
            max-height: 34px !important;
            padding: 3px 6px 3px 8px !important;
            font-size: 11px !important;
          }
          /* 手机订阅仍是 40 圆钮，略缩小一点少挡屏 */
          #scout-search-track-bar.scout-track-fab {
            width: 36px !important;
            height: 36px !important;
            min-width: 36px !important;
            max-width: 36px !important;
            font-size: 16px !important;
            bottom: 60px !important;
          }
        }

        @media (min-width: 821px) {
          /* PC：内容区 + 列表底色 + 卡面 */
          html.scout-cream-site body.creamu-site-xvideos #content,
          html.scout-cream-site body.creamu-site-xnxx #content {
            background-color: var(--scout-bg-clean) !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            min-height: 0 !important;
          }
          html.scout-cream-site body.creamu-site-xvideos .mozaique,
          html.scout-cream-site body.creamu-site-xnxx .mozaique,
          html.scout-cream-site body.creamu-site-eporner #vidresults {
            background: var(--scout-bg-clean) !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block,
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block,
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb,
          html.scout-cream-site body.creamu-site-eporner #videos-list .post {
            background: var(--scout-card-bg) !important;
            border-radius: 12px !important;
            border: 1px solid rgba(0,0,0,0.06) !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.06) !important;
            visibility: visible !important;
            max-height: none !important;
          }
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block img,
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block img,
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb img {
            visibility: visible !important;
            opacity: 1 !important;
          }
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block p,
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block p,
          html.scout-cream-site body.creamu-site-eporner #videos-list .post .title,
          html.scout-cream-site body.creamu-site-eporner #videos-list .post .title a,
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbtit,
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbtit a {
            color: var(--scout-text-color) !important;
          }
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .metadata a,
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .metadata a {
            color: var(--scout-theme-color) !important;
          }
          html.scout-cream-site body.creamu-site-xvideos .mozaique,
          html.scout-cream-site body.creamu-site-xnxx .mozaique {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important;
            gap: 20px !important;
            padding: 16px !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            /* 清掉站点 float 布局残留 */
            font-size: inherit !important;
          }
          /*
           * 仅对「可见」卡片做 flex 卡面：:not([style*="display: none"])
           * 避免 !important 把屏蔽 hide 的片又顶回来。
           */
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block:not([style*="display: none"]),
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block:not([style*="display: none"]) {
            display: flex !important;
            flex-direction: column !important;
            float: none !important;
            clear: none !important;
            width: auto !important;
            min-width: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 10px !important;
            border-radius: 16px !important;
            overflow: visible !important;
            transition: transform 0.25s ease, box-shadow 0.25s ease !important;
          }
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block:hover,
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block:hover {
            transform: translateY(-5px) !important;
            box-shadow: 0 12px 30px var(--scout-theme-shadow) !important;
          }
          /* 打破站点 padding-bottom 比例盒 + absolute 图导致高度塌成 0 */
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb-inside,
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb-inside,
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb,
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb {
            position: relative !important;
            width: 100% !important;
            height: auto !important;
            min-height: 148px !important;
            margin: 0 !important;
            padding: 0 !important;
            padding-bottom: 0 !important;
            overflow: hidden !important;
            border-radius: 12px !important;
            flex: 0 0 auto !important;
          }
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block img,
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block img {
            position: relative !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            bottom: auto !important;
            display: block !important;
            visibility: visible !important;
            border-radius: 12px !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 165px !important;
            min-height: 148px !important;
            object-fit: cover !important;
          }
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block p,
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block p {
            font-size: 13.5px !important;
            font-weight: 600 !important;
            line-height: 1.45 !important;
            margin-top: 10px !important;
            max-height: 40px !important;
            overflow: hidden !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
          }
          /* eporner PC：不再强行 grid/absolute（会挡没列表），只保证可见 */
          html.scout-cream-site body.creamu-site-eporner #vidresults,
          html.scout-cream-site body.creamu-site-eporner #videos-list {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            visibility: visible !important;
          }
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb,
          html.scout-cream-site body.creamu-site-eporner .mb[data-id] {
            visibility: visible !important;
            opacity: 1 !important;
          }
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb img {
            visibility: visible !important;
            opacity: 1 !important;
          }
        }

        html.scout-cream-site body.creamu-site-xvideos #video-player-bg,
        html.scout-cream-site body.creamu-site-xnxx #video-player-bg {
          background-color: #0b0909 !important;
          padding: 24px 0 !important;
        }
        html.scout-cream-site body.creamu-site-xvideos .player-container,
        html.scout-cream-site body.creamu-site-xnxx .player-container {
          max-width: 1200px !important;
          margin: 0 auto !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5) !important;
        }
        html.scout-cream-site body.creamu-site-eporner .video-wrapper {
          background-color: #0b0909 !important;
          padding: 20px !important;
          border-radius: 16px !important;
          max-width: 1200px !important;
          margin: 0 auto !important;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5) !important;
        }

        @media (max-width: 820px) {
          #jlc-wb .jlc-wb-nav {
            display: flex !important;
            gap: 8px !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            padding: 0 16px 12px !important;
            white-space: nowrap !important;
            scrollbar-width: none !important;
          }
          #jlc-wb .jlc-wb-nav::-webkit-scrollbar { display: none !important; }
          #jlc-wb .jlc-wb-nav button {
            flex: 0 0 auto !important;
            padding: 8px 16px !important;
            font-size: 13.5px !important;
          }
          /* 手机工作台钮：与订阅同款小圆，贴视口右下（不跟页滚） */
          #jlc-wb-fab {
            position: fixed !important;
            right: 16px !important;
            bottom: 16px !important;
            left: auto !important;
            top: auto !important;
            opacity: 1 !important;
            width: 40px !important;
            height: 40px !important;
            min-width: 40px !important;
            border-radius: 50% !important;
            font-size: 17px !important;
            z-index: 2147483000 !important;
            box-shadow: 0 4px 14px rgba(0,0,0,.45) !important;
            visibility: visible !important;
            display: flex !important;
            pointer-events: auto !important;
          }
          #jlc-wb-fab:active, #jlc-wb-fab.is-dragging {
            opacity: 1 !important;
          }
          #jlc-wb-fab .jlc-wb-fab-badge {
            top: -2px !important;
            right: -2px !important;
            font-size: 10px !important;
            min-width: 16px !important;
            height: 16px !important;
          }
          #jlc-wb .jlc-wb-search,
          #jlc-wb select.jlc-wb-select,
          #jlc-wb select,
          #jlc-wb .jlc-wb-btn {
            min-height: 40px !important;
            font-size: 14px !important;
          }
          .scout-tag-addon {
            margin-left: 6px !important;
            gap: 4px !important;
          }
          .scout-tag-addon span {
            padding: 3px 5px !important;
            font-size: 11px !important;
            border-radius: 4px !important;
          }
          #jlc-wb { height: 70vh !important; }

          /*
           * 窄屏：完全不碰 .mozaique / .thumb-block / 标题 p。
           * 任何 height/overflow/padding 都会让 xnxx 标题从 float 卡里散出来。
           * 仅收缩词库叠层，少挡画面。
           */
          .scout-lex-flow-overlay {
            max-height: 36% !important;
            padding: 8px 4px 4px !important;
          }
          .scout-lex-flow-overlay .scout-lex-chip {
            font-size: 9px !important;
            padding: 1px 5px !important;
          }

          /*
           * eporner 手机：尽量单列，但不用 absolute 图（易高度塌成 0 挡没）
           * 只清 float + 宽度 100%，图片保持站点自然高度
           */
          html.scout-cream-site body.creamu-site-eporner #vidresults {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            padding: 6px 8px !important;
            box-sizing: border-box !important;
            font-size: 0 !important; /* 清 inline-block 空隙；子项再设字号 */
          }
          /* 排除 .scout-blocked-*，否则 !important 会盖掉屏蔽 hide/dim */
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb:not(.scout-blocked-hide),
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb[data-id]:not(.scout-blocked-hide) {
            display: inline-block !important;
            float: none !important;
            vertical-align: top !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 0 12px 0 !important;
            padding: 6px !important;
            height: auto !important;
            box-sizing: border-box !important;
            font-size: 14px !important;
            visibility: visible !important;
          }
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb:not(.scout-blocked-dim):not(.scout-visited-item),
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb[data-id]:not(.scout-blocked-dim):not(.scout-visited-item) {
            opacity: 1 !important;
          }
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbimg,
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbcontent,
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb img {
            max-width: 100% !important;
            visibility: visible !important;
          }
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb:not(.scout-blocked-dim):not(.scout-visited-item) img {
            opacity: 1 !important;
          }
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb img {
            width: 100% !important;
            height: auto !important;
            position: static !important;
            display: block !important;
            object-fit: cover !important;
          }
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbtit,
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbtit a {
            font-size: 14px !important;
            line-height: 1.35 !important;
            white-space: normal !important;
          }
        }
  `;
}

/**
 * 三站页面奶油主题（参考 EXH cream_site_theme）
 * 需 html/body 带 .scout-cream-site；三站用 creamu-site-* 区分配色
 */
function applyScoutSiteTheme() {
  const cfg = typeof getConfig === 'function' ? getConfig() : {};
  const on = cfg.cream_site_theme !== false;
  try {
    document.documentElement.classList.toggle('scout-cream-site', on);
    if (document.body) document.body.classList.toggle('scout-cream-site', on);
  } catch (_) { /* ignore */ }

  let el = document.getElementById('scout-site-theme-cream');
  if (!on) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('style');
    el.id = 'scout-site-theme-cream';
    (document.head || document.documentElement).appendChild(el);
  }
  el.textContent = getScoutSitePageThemeCss();
}

function getScoutSitePageThemeCss() {
  return `
/* ===== 三站统一暗色页主题：同结构，只换强调色（PC/手机同一套） ===== */
html.scout-cream-site,
html.scout-cream-site body {
  /* 默认暗底 */
  --scout-page-bg: #12141a;
  --scout-page-panel: #1a1e28;
  --scout-page-header: #161a24;
  --scout-page-border: rgba(255,255,255,0.10);
  --scout-card: #1e2430;
  --scout-card-bg: #1e2430;
  --scout-bg-clean: #12141a;
  --scout-text-color: #e8eaef;
  --scout-text-muted: #9aa3b5;
  --scout-link: #8eb4f0;
  --scout-link-hover: #b8d0ff;
  --scout-accent: #5b8def;
  --scout-accent-soft: rgba(91, 141, 239, 0.18);
  background: var(--scout-page-bg) !important;
  color: var(--scout-text-color) !important;
  color-scheme: dark;
}

/* xvideos：暗红强调 */
html.scout-cream-site body.creamu-site-xvideos {
  --scout-accent: #e54840;
  --scout-accent-soft: rgba(229, 72, 64, 0.20);
  --scout-link: #f09088;
  --scout-link-hover: #ffb8b0;
  --scout-page-header: #1a1214;
  --scout-card: #22181a;
  --scout-card-bg: #22181a;
  --scout-page-panel: #1e1618;
}
/* xnxx：冷蓝强调（仍暗底，不走白天粉蓝） */
html.scout-cream-site body.creamu-site-xnxx {
  --scout-accent: #4d8ef0;
  --scout-accent-soft: rgba(77, 142, 240, 0.20);
  --scout-link: #8eb4f0;
  --scout-link-hover: #c0d8ff;
  --scout-page-header: #121820;
  --scout-card: #181e2a;
  --scout-card-bg: #181e2a;
  --scout-page-panel: #161c28;
}
/* eporner：叶绿强调 */
html.scout-cream-site body.creamu-site-eporner {
  --scout-accent: #3cb86a;
  --scout-accent-soft: rgba(60, 184, 106, 0.20);
  --scout-link: #7fd4a0;
  --scout-link-hover: #b0ecc8;
  --scout-page-header: #121a14;
  --scout-card: #161e18;
  --scout-card-bg: #161e18;
  --scout-page-panel: #141c16;
}

/* 正文链接：轻量，列表卡内另有强制色 */
html.scout-cream-site body a { color: var(--scout-link); }
html.scout-cream-site body a:visited { color: var(--scout-link); opacity: 0.9; }
html.scout-cream-site body a:hover { color: var(--scout-link-hover); }

/* 订阅钮底色已在 getScoutThemeCss 中；此处仅保证 cream 下对比 */
html.scout-cream-site #scout-search-track-bar.scout-track-fab,
html.scout-cream-site #scout-search-track-bar.scout-track-banner {
  background: rgba(18, 20, 28, 0.94) !important;
  border-color: var(--scout-page-border, rgba(255,255,255,0.12)) !important;
  color: var(--scout-text-color, #e8eaef) !important;
}

/* 顶栏/表单/分页/侧栏：仅 PC。手机保持站点原生控件，避免列表周边被改乱 */
@media (min-width: 821px) {
  html.scout-cream-site #header,
  html.scout-cream-site .header,
  html.scout-cream-site #main-nav,
  html.scout-cream-site .main-nav,
  html.scout-cream-site #nav,
  html.scout-cream-site .top-menu,
  html.scout-cream-site #top-menu,
  html.scout-cream-site .head-container,
  html.scout-cream-site #head {
    background: var(--scout-page-header) !important;
    border-color: var(--scout-page-border) !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06) !important;
    color: var(--scout-text-color) !important;
  }
  html.scout-cream-site #header a,
  html.scout-cream-site .header a,
  html.scout-cream-site #main-nav a,
  html.scout-cream-site .main-nav a,
  html.scout-cream-site #nav a {
    color: var(--scout-text-color) !important;
  }
  html.scout-cream-site #header a:hover,
  html.scout-cream-site .main-nav a:hover {
    color: var(--scout-link-hover) !important;
  }

  html.scout-cream-site #content,
  html.scout-cream-site #main,
  html.scout-cream-site .main-content,
  html.scout-cream-site #page,
  html.scout-cream-site .page,
  html.scout-cream-site #wrapper,
  html.scout-cream-site .wrapper {
    background: transparent !important;
    color: var(--scout-text-color) !important;
  }

  /* 仅站点原生表单暗色；工作台 / 采集弹层保持奶油浅色（下方再强制覆盖） */
  html.scout-cream-site input[type="text"],
  html.scout-cream-site input[type="search"],
  html.scout-cream-site input[type="password"],
  html.scout-cream-site input[type="email"],
  html.scout-cream-site textarea,
  html.scout-cream-site select {
    background: var(--scout-card) !important;
    color: var(--scout-text-color) !important;
    border: 1px solid var(--scout-page-border) !important;
    border-radius: 10px !important;
    box-shadow: 0 1px 0 rgba(0,0,0,0.04) !important;
    color-scheme: dark;
  }
  html.scout-cream-site #jlc-wb input[type="text"],
  html.scout-cream-site #jlc-wb input[type="search"],
  html.scout-cream-site #jlc-wb input[type="password"],
  html.scout-cream-site #jlc-wb input[type="email"],
  html.scout-cream-site #jlc-wb input[type="number"],
  html.scout-cream-site #jlc-wb input[type="url"],
  html.scout-cream-site #jlc-wb input:not([type]),
  html.scout-cream-site #jlc-wb textarea,
  html.scout-cream-site #jlc-wb select,
  html.scout-cream-site #jlc-wb .jlc-wb-search,
  html.scout-cream-site #scout-collect-dialog input[type="text"],
  html.scout-cream-site #scout-collect-dialog select,
  html.scout-cream-site #scout-collect-dialog textarea {
    background: #fffaf3 !important;
    color: #4a3728 !important;
    border: 1px solid #e4d4bc !important;
    box-shadow: 0 1px 0 #efe0cc !important;
    color-scheme: light !important;
    caret-color: var(--scout-theme-dark, #b56e28) !important;
  }
  html.scout-cream-site #jlc-wb input::placeholder,
  html.scout-cream-site #jlc-wb textarea::placeholder,
  html.scout-cream-site #jlc-wb .jlc-wb-search::placeholder {
    color: #a89078 !important;
    opacity: 1 !important;
  }
  html.scout-cream-site #jlc-wb input:focus,
  html.scout-cream-site #jlc-wb textarea:focus,
  html.scout-cream-site #jlc-wb select:focus,
  html.scout-cream-site #scout-collect-dialog input:focus,
  html.scout-cream-site #scout-collect-dialog select:focus {
    border-color: var(--scout-theme-color) !important;
    background: #fff !important;
    outline: none !important;
  }
  /*
   * 页级暗色按钮：只用 :where() 排除工作台，避免 :not(#id) 把特异性抬到
   * 压过 #jlc-wb .jlc-wb-nav button（组合/词库那排裸 button 会被刷黑）。
   */
  html.scout-cream-site input[type="button"],
  html.scout-cream-site input[type="submit"],
  html.scout-cream-site button:where(:not(#jlc-wb *)):where(:not(#scout-collect-dialog *)):where(:not(#jlc-wb-fab)):where(:not(#scout-search-track-bar *)):where(:not(.scout-work-fav-bar *)):where(:not(.scout-pub-addon *)) {
    background: var(--scout-page-panel) !important;
    color: var(--scout-text-color) !important;
    border: 1px solid var(--scout-page-border) !important;
    border-radius: 10px !important;
    box-shadow: 0 2px 0 var(--scout-page-border) !important;
    cursor: pointer;
  }
  html.scout-cream-site input[type="button"]:hover,
  html.scout-cream-site input[type="submit"]:hover,
  html.scout-cream-site button:where(:not(#jlc-wb *)):where(:not(#scout-collect-dialog *)):where(:not(#jlc-wb-fab)):where(:not(#scout-search-track-bar *)):where(:not(.scout-work-fav-bar *)):where(:not(.scout-pub-addon *)):hover {
    border-color: var(--scout-theme-color) !important;
    color: var(--scout-theme-color) !important;
  }

  /* 工作台导航/主按钮：覆盖站内全局 button 样式 */
  html.scout-cream-site #jlc-wb .jlc-wb-nav button,
  html.scout-cream-site #jlc-wb .jlc-wb-settings-nav button {
    background: #efe4d2 !important;
    background-color: #efe4d2 !important;
    color: #8a6f55 !important;
    border: 0 !important;
    box-shadow: none !important;
  }
  html.scout-cream-site #jlc-wb .jlc-wb-nav button.active,
  html.scout-cream-site #jlc-wb .jlc-wb-settings-nav button.active {
    background: var(--scout-theme-color) !important;
    background-color: var(--scout-theme-color) !important;
    color: #fff !important;
    box-shadow: 0 2px 0 var(--scout-theme-dark) !important;
  }
  html.scout-cream-site #jlc-wb .jlc-wb-btn {
    background: #fffaf2 !important;
    color: #5a4030 !important;
    border: 1px solid #e0cdae !important;
  }
  html.scout-cream-site #jlc-wb .jlc-wb-btn.primary {
    background: linear-gradient(var(--scout-theme-color), var(--scout-theme-dark)) !important;
    background-color: var(--scout-theme-color) !important;
    color: #fff !important;
    border-color: transparent !important;
    box-shadow: 0 2px 0 var(--scout-theme-dark) !important;
  }
  html.scout-cream-site #jlc-wb .jlc-wb-btn.ghost {
    background: #fffaf2 !important;
    color: #5a4030 !important;
  }
  html.scout-cream-site #jlc-wb .jlc-wb-btn.danger {
    background: #f3d5d0 !important;
    color: #8a3a32 !important;
    border-color: #e8b8b0 !important;
  }
  html.scout-cream-site #jlc-wb .jlc-wb-chip {
    background: #fff !important;
    color: #5a4030 !important;
    border: 1px solid #e0cdae !important;
  }
  html.scout-cream-site #jlc-wb .jlc-wb-chip.is-on {
    background: var(--scout-theme-color) !important;
    color: #fff !important;
    border-color: transparent !important;
  }
  html.scout-cream-site #jlc-wb .jlc-wb-open-btn {
    background: linear-gradient(var(--scout-theme-color), var(--scout-theme-dark)) !important;
    color: #fff !important;
    border: 0 !important;
  }

  html.scout-cream-site #footer,
  html.scout-cream-site .footer,
  html.scout-cream-site .pagination,
  html.scout-cream-site .page-list,
  html.scout-cream-site .pages {
    background: var(--scout-page-panel) !important;
    color: var(--scout-text-color) !important;
    border-color: var(--scout-page-border) !important;
  }
  html.scout-cream-site .pagination a,
  html.scout-cream-site .page-list a {
    background: var(--scout-card) !important;
    border: 1px solid var(--scout-page-border) !important;
    border-radius: 8px !important;
    color: var(--scout-link) !important;
  }
  html.scout-cream-site .pagination a:hover,
  html.scout-cream-site .pagination .active,
  html.scout-cream-site .page-list .active {
    background: var(--scout-theme-color) !important;
    color: #fff !important;
    border-color: transparent !important;
  }

  /* 侧栏（勿碰 .mobile-hide；xvideos 列表卡是 .frame-block.thumb-block） */
  html.scout-cream-site .sidebar,
  html.scout-cream-site #sidebar,
  html.scout-cream-site .side-block,
  html.scout-cream-site .frame-block:not(.thumb-block) {
    background: var(--scout-page-panel) !important;
    color: var(--scout-text-color) !important;
    border-color: var(--scout-page-border) !important;
    border-radius: 12px !important;
  }
}

/* 视频标题色 */
html.scout-cream-site .page-title,
html.scout-cream-site h2.page-title,
html.scout-cream-site .video-title {
  color: var(--scout-text-color) !important;
  white-space: normal !important;
  height: auto !important;
  max-height: none !important;
  overflow: visible !important;
}

/*
 * 详情元信息 / 标签：PC 全展开；手机折叠由 .scout-tags-collapsed 控制。
 */
@media (min-width: 821px) {
  html.scout-cream-site body.creamu-site-xvideos .video-metadata,
  html.scout-cream-site body.creamu-site-xnxx .video-metadata,
  html.scout-cream-site body.creamu-site-xvideos .video-metadata-list,
  html.scout-cream-site body.creamu-site-xnxx .video-metadata-list,
  html.scout-cream-site body.creamu-site-xvideos .metadata-row,
  html.scout-cream-site body.creamu-site-xnxx .metadata-row {
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    white-space: normal !important;
    line-height: 1.45 !important;
  }
  html.scout-cream-site body.creamu-site-xvideos .video-tags,
  html.scout-cream-site body.creamu-site-xnxx .video-tags,
  html.scout-cream-site body.creamu-site-eporner #video-tags,
  html.scout-cream-site body.creamu-site-eporner .tag-container {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    gap: 6px !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    white-space: normal !important;
    background: var(--scout-page-panel) !important;
    border: 1px solid var(--scout-page-border) !important;
    border-radius: 12px !important;
    padding: 8px 10px !important;
    margin-top: 8px !important;
  }
}
@media (max-width: 820px) {
  html.scout-cream-site body.creamu-site-xvideos .video-metadata.scout-tags-collapsed,
  html.scout-cream-site body.creamu-site-xnxx .video-metadata.scout-tags-collapsed,
  html.scout-cream-site body.creamu-site-xnxx .metadata-row.video-tags.scout-tags-collapsed,
  html.scout-cream-site body.creamu-site-xnxx .video-tags.scout-tags-collapsed {
    max-height: 2.15em !important;
    overflow: hidden !important;
  }
  html.scout-cream-site body.creamu-site-xvideos .video-metadata.scout-tags-expanded,
  html.scout-cream-site body.creamu-site-xnxx .video-metadata.scout-tags-expanded,
  html.scout-cream-site body.creamu-site-xnxx .metadata-row.video-tags.scout-tags-expanded,
  html.scout-cream-site body.creamu-site-xnxx .video-tags.scout-tags-expanded {
    max-height: none !important;
    overflow: visible !important;
  }
  html.scout-cream-site .scout-desc-collapsed {
    -webkit-line-clamp: 2 !important;
    max-height: 3em !important;
    overflow: hidden !important;
  }
}
html.scout-cream-site body.creamu-site-xvideos .video-tags a,
html.scout-cream-site body.creamu-site-xnxx .video-tags a,
html.scout-cream-site body.creamu-site-xvideos .video-metadata .video-tags a,
html.scout-cream-site body.creamu-site-xnxx .video-metadata .video-tags a,
html.scout-cream-site body.creamu-site-eporner #video-tags a,
html.scout-cream-site body.creamu-site-eporner .tag-container a {
  display: inline-flex !important;
  flex: 0 1 auto !important;
  align-items: center !important;
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
  background: var(--scout-card) !important;
  border: 1px solid var(--scout-page-border) !important;
  border-radius: 999px !important;
  color: var(--scout-text-color) !important;
  padding: 3px 8px !important;
  margin: 0 !important;
  max-width: 100% !important;
}

/*
 * 列表/mozaique/标题：仅 PC。手机零改动，否则 xnxx 标题会从 float 卡散出。
 */
@media (min-width: 821px) {
  html.scout-cream-site body.creamu-site-xvideos #content,
  html.scout-cream-site body.creamu-site-xnxx #content,
  html.scout-cream-site body.creamu-site-eporner body,
  html.scout-cream-site body.creamu-site-eporner #content {
    background: var(--scout-page-bg) !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }
  html.scout-cream-site body.creamu-site-xvideos .mozaique,
  html.scout-cream-site body.creamu-site-xnxx .mozaique {
    background: transparent !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }
  html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block,
  html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block {
    visibility: visible !important;
    background: var(--scout-card, var(--scout-card-bg)) !important;
    border: 1px solid var(--scout-page-border) !important;
    box-shadow: 0 4px 14px rgba(0,0,0,0.08) !important;
  }
  html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb-inside,
  html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb-inside,
  html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb,
  html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb {
    background: transparent !important;
  }
  html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block p,
  html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block p {
    color: var(--scout-text-color) !important;
  }
  /* eporner 仅可见性，不改布局 */
  html.scout-cream-site body.creamu-site-eporner #vidresults {
    height: auto !important;
    overflow: visible !important;
    visibility: visible !important;
  }
}

/* 开主题时播放器区保持深色 */
html.scout-cream-site body.creamu-site-xvideos #video-player-bg,
html.scout-cream-site body.creamu-site-xnxx #video-player-bg {
  background: #121010 !important;
}

#scout-seek-hud {
  position: fixed !important;
  left: 50% !important;
  top: 18% !important;
  transform: translateX(-50%) !important;
  z-index: 2147483646 !important;
  padding: 10px 16px !important;
  border-radius: 12px !important;
  background: rgba(0, 0, 0, 0.72) !important;
  color: #fff !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  letter-spacing: 0.02em !important;
  pointer-events: none !important;
  white-space: nowrap !important;
  display: none !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35) !important;
}
#scout-seek-hud.is-on {
  display: block !important;
}
`;
}
