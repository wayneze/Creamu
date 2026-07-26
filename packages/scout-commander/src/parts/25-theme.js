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
          display: inline-flex;
          align-items: center;
          gap: 3px;
          margin: 0;
          padding: 2px 6px;
          border: 1px solid #e4d4bc;
          border-radius: 999px;
          font-size: 11.5px;
          letter-spacing: 0;
          text-transform: none;
          cursor: pointer;
        }
        #jlc-wb .scout-combo-dock-sites .scout-combo-site input {
          width: 13px;
          height: 13px;
          margin: 0;
          accent-color: var(--scout-theme-color);
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

        /* 组合页内容 */
        #jlc-wb .jlc-wb-list-scroll.scout-combo-scroll {
          padding-bottom: 12px;
        }
        #jlc-wb .scout-combo-token {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        #jlc-wb .scout-combo-token-remove {
          opacity: 0.8;
        }
        #jlc-wb .scout-combo-empty {
          color: #9a7d60;
          font-size: 12px;
        }
        #jlc-wb .scout-combo-empty.is-selected {
          font-size: 12.5px;
        }
        #jlc-wb .scout-combo-filter,
        #jlc-wb .scout-combo-pick {
          font-size: 12px;
        }
        #jlc-wb .jlc-wb-chip.scout-combo-video-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin: 2px;
          padding: 4px 8px;
          font-size: 12px;
        }
        #jlc-wb .scout-combo-pick-tag,
        #jlc-wb .scout-add-quick {
          color: #2f6b3a;
          cursor: pointer;
        }
        #jlc-wb .scout-block-quick {
          color: #b42318;
          cursor: pointer;
        }
        #jlc-wb .jlc-wb-view-block.scout-combo-video-tags {
          margin-top: 14px;
        }
        #jlc-wb .scout-combo-video-tag-list {
          display: flex;
          flex-wrap: wrap;
          max-height: 120px;
          overflow: auto;
        }
        #jlc-wb .scout-combo-video-tag-hint {
          margin-top: 4px;
          color: #9a7d60;
          font-size: 11px;
        }
        #jlc-wb .scout-combo-join {
          display: inline-flex;
          align-items: center;
          margin-top: 0;
          margin-right: 10px;
          font-size: 12.5px;
          letter-spacing: 0;
          text-transform: none;
          cursor: pointer;
        }
        #jlc-wb .scout-combo-join input {
          width: 15px;
          height: 15px;
          margin-right: 4px;
          accent-color: var(--scout-theme-color);
        }
        #jlc-wb .scout-combo-selected {
          display: flex;
          flex-wrap: wrap;
          min-height: 32px;
          margin-bottom: 8px;
        }
        #jlc-wb .scout-combo-join-row {
          margin-bottom: 8px;
        }
        #jlc-wb .scout-combo-join-title {
          margin-right: 6px;
          color: #9a7d60;
          font-size: 12px;
        }
        #jlc-wb .scout-combo-preview {
          margin-bottom: 10px;
          color: #9a7d60;
          font-size: 12px;
          word-break: break-word;
        }
        #jlc-wb .scout-combo-preview-value {
          color: var(--scout-theme-color);
        }
        #jlc-wb .scout-combo-help {
          margin-bottom: 10px;
          color: #9a7d60;
          font-size: 11.5px;
          line-height: 1.4;
        }
        #jlc-wb .scout-combo-manual {
          display: flex;
          gap: 6px;
        }
        #jlc-wb .jlc-wb-search.scout-combo-manual-input {
          flex: 1;
          padding: 8px 12px;
          font-size: 13.5px;
        }
        #jlc-wb #scout-combo-add-btn {
          padding: 8px 14px;
        }
        #jlc-wb .scout-combo-filters {
          display: flex;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }
        #jlc-wb .scout-combo-pool {
          display: flex;
          flex-wrap: wrap;
          max-height: 160px;
          overflow: auto;
        }

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

        /* 工作台页面组件 */
        #jlc-wb .scout-wb-chip {
          margin: 2px;
          cursor: pointer;
        }
        #jlc-wb .scout-wb-chip.is-retired {
          background: #ffe5e5;
          color: #b42318;
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
          color: #b09070;
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
          color: #9a7d60;
          font-size: 11.5px;
        }
        #jlc-wb .scout-lexicon-edit {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed #efe0cc;
        }
        #jlc-wb .scout-lexicon-edit-row {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        #jlc-wb .scout-lexicon-edit-label {
          width: 54px;
          color: #7a5a3c;
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
          color: #2f6b3a;
        }
        #jlc-wb .scout-publisher-name.is-blocked {
          color: #b42318;
        }
        #jlc-wb .jlc-status-pill.scout-publisher-status {
          padding: 1px 6px;
          margin-left: 4px;
          font-size: 10.5px;
        }
        #jlc-wb .scout-publisher-site {
          margin-left: 4px;
          color: #9a7d60;
          font-size: 11px;
        }
        #jlc-wb .scout-publisher-note {
          margin-top: 2px;
          color: #9a7d60;
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
          background: #efe4d2;
        }
        #jlc-wb .jlc-wb-item-meta-line.scout-work-meta {
          color: #9a7d60;
          font-size: 11.5px;
        }
        #jlc-wb .jlc-wb-item-meta-line.scout-work-tags {
          margin-top: 2px;
          color: #a89078;
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
          color: #a89078;
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
          border-top: 1px dashed #efe0cc;
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
          background: #efe4d2;
          color: #6b4a2e;
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
          color: #b42318;
        }
        #jlc-wb .scout-block-reason {
          margin-top: 4px;
          color: #9a7d60;
          font-size: 11px;
        }
        #jlc-wb .person-item span.remove.scout-block-remove {
          flex: 0 0 auto;
          color: #b42318;
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
          color: #7a5a3c;
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
          color: #9a7d60;
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
          border: 1px solid #e4d4bc;
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
`;
}
