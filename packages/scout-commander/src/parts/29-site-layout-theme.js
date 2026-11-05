// 29-site-layout-theme.js

function getScoutSiteLayoutThemeCss() {
  return `
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
          box-shadow: none !important;
          overflow: hidden !important;
          padding: 6px !important;
          color: var(--scout-text-color, #e8eaef) !important;
        }
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block {
          box-shadow: none !important;
        }
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block {
          box-shadow: none !important;
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
          color: var(--scout-text-color, #e8eaef) !important;
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
          color: var(--scout-text-color, #e8eaef) !important;
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
          color: var(--scout-text-color, #e8eaef) !important;
          box-sizing: border-box !important;
        }
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbtit,
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbtit a,
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbunder,
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbunder a,
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbstats,
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mb-uploader a {
          color: var(--scout-text-color, #e8eaef) !important;
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

        /* 当前 URL 的临时精确过滤，不参与全局屏蔽配置。 */
        html.scout-cream-site .scout-exact-filter-hidden {
          display: none !important;
        }
        html.scout-cream-site .scout-exact-filter-pending {
          opacity: .58 !important;
          transition: opacity .16s ease !important;
        }
        html.scout-cream-site .scout-exact-filter-failed {
          outline: 2px dashed rgba(230, 170, 70, .8) !important;
          outline-offset: 2px !important;
        }
        #scout-exact-filter-bar {
          position: relative !important;
          z-index: 999992 !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          width: min(540px, calc(100% - 24px)) !important;
          max-width: calc(100% - 24px) !important;
          min-height: 32px !important;
          margin: 8px auto 10px !important;
          padding: 5px 6px 5px 11px !important;
          border: 1px solid rgba(92, 196, 128, .42) !important;
          border-radius: 7px !important;
          background: rgba(18, 24, 21, .94) !important;
          box-shadow: 0 5px 16px rgba(0, 0, 0, .34) !important;
          color: #e8f5ec !important;
          font-size: 11.5px !important;
          line-height: 1.3 !important;
          box-sizing: border-box !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        #scout-exact-filter-bar .scout-exact-filter-text {
          min-width: 0 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          font-weight: 650 !important;
        }
        #scout-exact-filter-bar .scout-exact-filter-actions {
          display: flex !important;
          align-items: center !important;
          gap: 4px !important;
          flex: 0 0 auto !important;
        }
        #scout-exact-filter-bar button {
          min-height: 22px !important;
          padding: 2px 8px !important;
          border: 1px solid rgba(255, 255, 255, .18) !important;
          border-radius: 5px !important;
          background: rgba(255, 255, 255, .09) !important;
          color: #eef7f0 !important;
          cursor: pointer !important;
          font: inherit !important;
          font-weight: 650 !important;
          letter-spacing: 0 !important;
        }
        #scout-exact-filter-bar button:hover {
          background: rgba(92, 196, 128, .2) !important;
          border-color: rgba(92, 196, 128, .55) !important;
        }
        @media (max-width: 620px) {
          #scout-exact-filter-bar {
            width: calc(100% - 20px) !important;
            max-width: calc(100% - 20px) !important;
            margin: 8px 10px 10px !important;
          }
          #scout-exact-filter-bar .scout-exact-filter-text {
            flex: 1 1 auto !important;
          }
        }

        #scout-search-track-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 10px 8px; padding: 10px 12px; border: 1px solid var(--scout-page-border, #cdd0ca); border-radius: 8px; background: var(--scout-page-panel, #eeeee8); color: var(--scout-text-color, #343b36); font: 13px/1.5 'Segoe UI', 'Microsoft YaHei', sans-serif; }
        .scout-track-banner-text { flex: 1; min-width: 120px; overflow-wrap: anywhere; }
        .scout-track-banner-text small { display: block; font-size: 10px; color: var(--scout-text-muted, #737970); }
        #scout-search-track-bar button { min-height: 34px; padding: 5px 9px; border: 1px solid var(--scout-page-border, #cdd0ca); border-radius: 6px; color: inherit; background: transparent; cursor: pointer; font: 12px/1.4 'Segoe UI', 'Microsoft YaHei', sans-serif; box-sizing: border-box; }

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

        html.scout-cream-site :is(#video-player-bg, #movieplayer-box, .video-wrapper) {
          background: #101216 !important; padding: 0 !important; box-shadow: none !important;
        }
        html.scout-cream-site .player-container { max-width: 100% !important; margin: 0 auto !important; box-shadow: none !important; }
        html.scout-console-docked :is(#main, #content, #movieplayer-left, #video-player-bg, #html5video, #movieplayer-box, .video-wrapper) { min-width: 0 !important; max-width: 100% !important; box-sizing: border-box; }
        html.scout-console-docked :is(#html5video, #movieplayer-box) video { max-width: 100% !important; }

        @media (max-width: 820px) {
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
