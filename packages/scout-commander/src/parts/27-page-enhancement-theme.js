// 27-page-enhancement-theme.js

function getScoutPageEnhancementThemeCss() {
  return `
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
          .scout-desc-expanded,
          .video-description.scout-desc-expanded,
          #video-description.scout-desc-expanded,
          [itemprop="description"].scout-desc-expanded {
            display: block !important;
            -webkit-line-clamp: unset !important;
            max-height: none !important;
            overflow: visible !important;
          }
        }
        /* 手机详情：标签默认一行；描述默认两行；点展开 */
        @media (max-width: 820px) {
          :is(.scout-tags-collapsed, .scout-tags-expanded) {
            max-height: none !important; overflow: visible !important; height: auto !important;
          }
          .scout-tags-collapsed [data-scout-tag-extra] { display: none !important; }
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
            width: fit-content !important;
            max-width: 100% !important;
            min-height: 32px;
            margin: 4px 0 8px !important;
            padding: 4px 9px !important;
            border: 1px solid rgba(255,255,255,0.16) !important;
            border-radius: 6px !important;
            background: rgba(0,0,0,0.35) !important;
            color: #e8eaef !important;
            font: 12px/1.4 'Segoe UI', 'Microsoft YaHei', sans-serif !important;
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
          gap: 3px !important;
          align-items: flex-start !important;
          position: absolute !important;
          left: 4px !important;
          right: 4px !important;
          bottom: 4px !important;
          top: auto !important;
          z-index: 30 !important;
          margin: 0 !important;
          padding: 4px !important;
          max-height: 54% !important;
          overflow: hidden !important;
          pointer-events: none !important;
          background: linear-gradient(transparent, rgba(0,0,0,.78)) !important;
          border-radius: 0 0 8px 8px !important;
          box-sizing: border-box !important;
        }
        .scout-lex-overlay-positioned {
          position: relative !important;
        }
        .scout-lex-overlay-clipped {
          overflow: hidden !important;
        }
        .scout-detail-title { margin-bottom: 8px !important; line-height: 1.35 !important; overflow-wrap: anywhere; }
        .scout-work-fav-bar { display: flex; clear: both; width: 100%; flex-wrap: wrap; align-items: center; gap: 8px; margin: 8px 0 14px; padding: 0 0 12px; border-bottom: 1px solid var(--scout-page-border, #ccd0c8); max-width: 100%; box-sizing: border-box; }
        #scout-work-fav-bar > button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-height: 34px; padding: 6px 9px; border: 1px solid var(--scout-page-border, #ccd0c8); border-radius: 6px; background: transparent; color: var(--scout-text-color, #343b36); font: 600 12px/1.4 'Segoe UI', 'Microsoft YaHei', sans-serif; cursor: pointer; box-shadow: none; box-sizing: border-box; }
        #scout-work-fav-bar > button:hover { background: var(--scout-accent-soft, #899b8014); }
        #scout-work-fav-bar > button:focus-visible { outline: 2px solid var(--scout-theme-color); outline-offset: 2px; }
        #scout-work-fav-bar > button:disabled { opacity: .5; cursor: default; }
        #scout-work-fav-bar .scout-work-fav-btn { background: var(--scout-accent-soft, #899b8014); border-color: var(--scout-link, #71816b); }
        #scout-work-fav-bar .scout-work-fav-btn.is-saved { border-color: var(--scout-theme-color); }
        .scout-work-fav-ico { font-size: 16px; line-height: 1; color: var(--scout-link, #71816b); }
        #scout-detail-console { margin-left: auto; }
        @media (max-width: 820px) {
          #scout-work-fav-bar { gap: 6px; margin-bottom: 10px; }
          #scout-detail-console { margin-left: 0; }
        }

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
        .scout-preview-positioned {
          position: relative !important;
        }
        .scout-site-preview-disabled {
          display: none !important;
        }
        .scout-preview-button { position: absolute; right: 8px; bottom: 8px; z-index: 30; min-height: 32px; padding: 5px 9px; border: 1px solid #ffffff66; border-radius: 6px; background: #17201bd9; color: white; font: 600 12px/1.2 'Segoe UI', sans-serif; cursor: pointer; box-sizing: border-box; }
        .scout-preview-button[aria-pressed="true"] { background: #3d6348; }
        .scout-preview-button:focus-visible { outline: 2px solid white; outline-offset: 2px; }


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
          line-height: 1.2 !important;
          letter-spacing: 0.2px !important;
          color: #fff !important;
          background: rgba(20, 22, 28, 0.72) !important;
          border: 1px solid rgba(255,255,255,0.22) !important;
          box-shadow: 0 1px 3px rgba(0,0,0,.28) !important;
          backdrop-filter: blur(6px) !important;
          -webkit-backdrop-filter: blur(6px) !important;
        }
        .scout-lex-flow-overlay .scout-lex-chip.is-loved {
          color: #fff !important;
          background: rgba(229, 72, 64, 0.92) !important;
          border-color: rgba(255, 180, 160, 0.55) !important;
        }
        .scout-lex-flow-overlay .scout-lex-chip.is-more {
          background: rgba(255,255,255,0.18) !important;
          border-color: rgba(255,255,255,0.28) !important;
          border-style: dashed !important;
          color: rgba(255,255,255,0.9) !important;
        }
        @media (max-width: 820px) {
          .scout-lex-flow-overlay {
            max-height: 36% !important;
            padding: 3px !important;
          }
          .scout-lex-flow-overlay .scout-lex-chip {
            font-size: 9px !important;
          }
        }

        #scout-seek-hud {
          position: fixed !important;
          left: 50% !important;
          top: 18% !important;
          transform: translateX(-50%) !important;
          z-index: 2147483646 !important;
          display: none !important;
          padding: 10px 16px !important;
          border-radius: 12px !important;
          color: #fff !important;
          background: rgba(0,0,0,.72) !important;
          box-shadow: 0 6px 20px rgba(0,0,0,.35) !important;
          font-size: 16px !important;
          font-weight: 700 !important;
          white-space: nowrap !important;
          pointer-events: none !important;
        }
        #scout-seek-hud.is-on {
          display: block !important;
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
        /* 未入库：轻描边，跟随站点明暗配色 */
        html.scout-cream-site a.scout-site-tag.scout-tag-out,
        html.scout-cream-site .scout-site-tag.scout-tag-out {
          background: transparent !important;
          border: 1px solid var(--scout-page-border, #ccd0c8) !important;
          color: var(--scout-text-color, #343b36) !important;
        }
        html.scout-cream-site a.scout-site-tag.scout-tag-out:hover {
          border-color: var(--scout-accent, #5b8def) !important;
          color: var(--scout-link) !important;
        }
        /* 已入库：强调色填充 */
        html.scout-cream-site a.scout-site-tag.scout-tag-in,
        html.scout-cream-site .scout-site-tag.scout-tag-in,
        html.scout-cream-site a.scout-site-tag.scout-tag-explored {
          background: var(--scout-accent-soft, rgba(91,141,239,.22)) !important;
          border: 1px solid var(--scout-accent, #5b8def) !important;
          color: var(--scout-text-color, #343b36) !important;
        }
        html.scout-cream-site a.scout-site-tag.scout-tag-loved {
          background: rgba(229, 72, 64, 0.10) !important;
          border-color: #e54840 !important;
          color: var(--scout-text-color, #343b36) !important;
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
        .scout-pub-addon {
          display: inline-flex;
          gap: 6px;
          margin-left: 8px;
          max-width: 100%;
          vertical-align: middle;
          font-size: 12px;
        }
        .scout-pub-addon .scout-pub-action {
          min-height: 32px;
          margin: 0;
          padding: 4px 8px;
          border: 1px solid var(--scout-page-border, #ccd0c8);
          border-radius: 6px;
          background: var(--scout-page-panel, #eeeee8);
          color: var(--scout-text-color, #343b36);
          font: 12px/1.4 'Segoe UI', 'Microsoft YaHei', sans-serif;
          box-sizing: border-box;
          box-shadow: none;
          cursor: pointer;
        }
        .scout-pub-addon .scout-pub-love-action.is-loved {
          border-color: #2f6b3a;
          background: #e2f5e4;
          color: #2f6b3a;
        }
        /* 标签容器保持原生结构；发布者不参与标签折叠。 */
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

        /* 列表屏蔽：提高选择器优先级，避免站点布局规则覆盖过滤状态 */
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
`;
}
