
  function injectBaseStyles() {
    if (typeof injectCreamuWorkbenchStyles !== 'function') {
      console.warn('[Creamu·ExH] workbench styles unavailable');
      return;
    }
    injectCreamuWorkbenchStyles({
      styleId: 'jlc-wb-style-exc',
      extraCss: `
/* list cover / card badge */
        .exc-cover-host { position: relative !important; }
        .exc-gl-item.exc-card-badge-host,
        .exc-gl-item { position: relative !important; }
        .exc-gl-item .exc-cover-host,
        .exc-gl-item .glthumb,
        .exc-gl-item td.gl1e,
        .exc-gl-item .gl3t { position: relative; }
        /* 状态徽章：卡片框左上（在库/熟人/心动…） */
        .exc-badge-container {
            position: absolute; top: 4px; left: 4px; display: flex;
            flex-direction: column; gap: 3px; z-index: 30; pointer-events: none;
            max-width: min(94%, 168px);
        }
        /* 标签流：卡片框左下，与上徽章分开 */
        .exc-tag-stream {
            position: absolute; bottom: 4px; left: 4px; display: flex;
            flex-direction: column; gap: 3px; z-index: 30; pointer-events: none;
            max-width: min(94%, 168px);
            align-items: flex-start;
        }
        .gl1t.exc-gl-item > .exc-badge-container {
            top: 6px; left: 6px;
        }
        .gl1t.exc-gl-item > .exc-tag-stream {
            bottom: 6px; left: 6px;
        }
        tr.exc-gl-item > .exc-badge-container {
            top: 4px; left: 4px;
        }
        tr.exc-gl-item > .exc-tag-stream {
            bottom: 4px; left: 4px;
        }
        .exc-meta-overlay {
            display: flex; flex-direction: column; align-items: flex-start; gap: 3px;
            max-width: 160px; pointer-events: none;
        }
        /* 奶油系胶囊（对齐工作台 jlc-status-pill，避免黑底块） */
        .meta-tag {
            display: inline-block; padding: 2px 8px; border-radius: 999px;
            background: rgba(255,253,248,.94); color: #5a4030;
            border: 1px solid #e0cdae;
            font-size: 11px; font-weight: 700; line-height: 1.25;
            box-shadow: 0 2px 6px rgba(90,60,30,.12);
            text-shadow: none; white-space: nowrap;
            max-width: 100%; overflow: hidden; text-overflow: ellipsis;
        }
        .meta-tag.hot {
            background: linear-gradient(135deg, #e8a24e, #d4883a) !important;
            color: #fff !important; border-color: transparent !important;
            box-shadow: 0 2px 0 #b56e28, 0 4px 10px rgba(212,136,58,.28);
        }
        .meta-tag.more {
            background: rgba(255,250,242,.9) !important; color: #8a6f55 !important;
            border-color: #e4d4bc !important;
        }
        .meta-tag.ok {
            background: #e2f5e4 !important; color: #2f6b3a !important;
            border-color: #b7dfbf !important;
        }
        /* LRR 熟人：画师 / 团队（对齐 JLC 熟人蓝徽章） */
        .meta-tag.familiar,
        .meta-tag.familiar-artist {
            background: linear-gradient(135deg, #5b8fd9, #3a6fbf) !important;
            color: #fff !important; border-color: transparent !important;
            box-shadow: 0 2px 0 #2a528f, 0 4px 10px rgba(58,111,191,.28);
        }
        .meta-tag.familiar-group {
            background: linear-gradient(135deg, #5aaf7a, #3d8f52) !important;
            color: #fff !important; border-color: transparent !important;
            box-shadow: 0 2px 0 #2a6b3a, 0 4px 10px rgba(61,143,82,.26);
        }
        .meta-tag.warn {
            background: #fde2df !important; color: #b42318 !important;
            border-color: #f0b8b2 !important;
        }
        .meta-tag.maybe {
            background: #fff4db !important; color: #9a6700 !important;
            border-color: #f0d7a0 !important; border-style: dashed !important;
        }
        /* 标签流：近乎无底，靠描边+轻阴影辨认，避免白底糊住封面 */
        .meta-tag.stream {
            background: rgba(40,28,18,.28) !important;
            color: #fffdf8 !important;
            border: 1px solid rgba(255,253,248,.35) !important;
            font-weight: 650 !important;
            font-size: 10.5px !important;
            max-width: 140px;
            text-shadow: 0 1px 2px rgba(0,0,0,.55);
            box-shadow: none !important;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
        }
        /* 普通状态胶囊也别用实心白 */
        .exc-badge-container .meta-tag:not(.hot):not(.familiar):not(.familiar-artist):not(.familiar-group):not(.ok):not(.warn):not(.stream) {
            background: rgba(40,28,18,.32) !important;
            color: #fffdf8 !important;
            border-color: rgba(255,253,248,.3) !important;
            text-shadow: 0 1px 2px rgba(0,0,0,.5);
            box-shadow: none !important;
        }
        .exc-badge-container .meta-tag.hot {
            background: rgba(212,136,58,.55) !important;
            border-color: rgba(255,220,160,.4) !important;
            box-shadow: none !important;
        }
        .exc-badge-container .meta-tag.familiar,
        .exc-badge-container .meta-tag.familiar-artist {
            background: rgba(58,111,191,.55) !important;
            border-color: rgba(180,210,255,.4) !important;
            box-shadow: none !important;
        }
        .exc-badge-container .meta-tag.familiar-group {
            background: rgba(61,143,82,.55) !important;
            border-color: rgba(180,230,190,.4) !important;
            box-shadow: none !important;
        }
        .exc-badge-container .meta-tag.ok {
            background: rgba(47,107,58,.5) !important;
            color: #e8ffe8 !important;
            border-color: rgba(180,230,190,.4) !important;
            box-shadow: none !important;
        }
        .exc-badge-container .meta-tag.more {
            background: rgba(40,28,18,.22) !important;
            color: rgba(255,253,248,.85) !important;
            border-color: rgba(255,253,248,.25) !important;
            box-shadow: none !important;
        }
        .exc-gl-item.is-exc-familiar .exc-cover-host {
            outline: 2px solid rgba(58,111,191,.45);
            outline-offset: -2px;
        }
        .meta-tag.exc-meta-act {
            pointer-events: auto !important;
            cursor: pointer;
            appearance: none;
            font: inherit;
            margin: 0;
            text-align: left;
            max-width: 100%;
        }
        .meta-tag.exc-meta-act:hover {
            border-color: #e8a24e !important;
            color: #fff !important;
        }
        .exc-meta-overlay .exc-meta-act { pointer-events: auto; }
        .exc-tool-bar {
            position: absolute; right: 4px; bottom: 4px; z-index: 21;
            display: flex; gap: 2px; align-items: center;
            padding: 3px 4px; border-radius: 8px;
            background: rgba(20,16,12,.55); backdrop-filter: blur(2px);
        }
        .exc-tool-btn {
            display: inline-flex; align-items: center; justify-content: center;
            width: 22px; height: 22px; margin: 0; padding: 0; border: 0;
            background: transparent; color: #f5efe6; cursor: pointer;
            opacity: .45; font-size: 13px; line-height: 1;
            transition: transform .15s ease, opacity .15s ease, color .15s ease;
        }
        .exc-tool-btn:hover { opacity: 1; transform: scale(1.1); color: #e8a24e; }
        .exc-tool-btn.is-on { opacity: 1; color: #e8a24e; text-shadow: 0 0 8px rgba(232,162,78,.45); }
        .exc-tool-btn.is-bp { opacity: 1; color: #ff8a7a; font-weight: 800; text-shadow: 0 0 8px rgba(255,95,86,.4); }
        .exc-tool-btn.is-want { opacity: 1; color: #7dd3fc; text-shadow: 0 0 8px rgba(125,211,252,.4); }
        /* 断点作品：洋红描边，别跟点过/库内/心动混 */
        .exc-gl-item.is-exc-breakpoint {
            outline: 2px solid rgba(232, 72, 90, 0.95) !important;
            outline-offset: -2px;
            box-shadow: 0 0 0 1px rgba(232, 72, 90, 0.25), 0 6px 16px rgba(180, 40, 50, 0.15) !important;
        }
        tr.exc-gl-item.is-exc-breakpoint > td.gl1e {
            box-shadow: inset 3px 0 0 #e8485a !important;
        }
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

        .exc-fold-tag {
            pointer-events: auto !important;
            cursor: pointer;
            appearance: none;
            font: inherit;
            margin: 0;
            max-width: 100%;
            border: 1px solid #e0cdae !important;
            background: rgba(255,253,248,.94) !important;
            color: #5a4030 !important;
        }
        .exc-fold-tag:hover {
            border-color: #d4bc96 !important;
            background: #fff !important;
            color: #4a3728 !important;
        }
        .exc-fold-tag.hot {
            background: linear-gradient(135deg, #e8a24e, #d4883a) !important;
            color: #fff !important;
            border-color: transparent !important;
        }
        .exc-meta-overlay { pointer-events: none; }
        .exc-meta-overlay .exc-fold-tag { pointer-events: auto; }

        .exc-tool-btn.is-block { opacity: 1; color: #ff6666; }
        .exc-gl-item .exc-enhance-host { display: none !important; }
        .exc-gl-item.is-exc-blocked { outline: 2px solid rgba(180,35,24,.4); outline-offset: -2px; opacity: .45; }
        .exc-gl-item.is-exc-blocked.exc-hide { display: none !important; }
        .exc-gl-item.is-exc-folded-child { display: none !important; }
        /* page chrome */
        #exc-toast-host {
            position: fixed; z-index: 1000001; right: 24px; bottom: 90px;
            display: flex; flex-direction: column; gap: 8px; pointer-events: none;
        }
        .exc-toast {
            background: #fffdf8; color: #4a3728; border: 1px solid #e4d4bc; border-left: 4px solid #d4883a;
            border-radius: 14px; padding: 12px 14px; font: 13.5px/1.45 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            box-shadow: 0 10px 28px rgba(90,60,30,.18); max-width: 360px;
            transition: opacity .25s, transform .25s;
        }
        .exc-toast.is-out { opacity: 0; transform: translateY(8px); }

        /* 列表悬停预览 */
        #exc-hover-preview {
            position: fixed; z-index: 1000000; display: none;
            max-width: min(520px, calc(100vw - 16px));
            padding: 10px 12px 12px; border-radius: 16px;
            background: #fffdf8; color: #4a3728;
            border: 1px solid #e4d4bc;
            box-shadow: 0 14px 36px rgba(90,60,30,.22), 0 3px 0 #ead7bb;
            font: 12.5px/1.35 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            pointer-events: auto;
        }
        #exc-hover-preview.is-open { display: block; }
        #exc-hover-preview .exc-hp-head {
            display: flex; align-items: center; justify-content: space-between; gap: 8px;
            margin-bottom: 8px; font-weight: 750; color: #6b4a2e;
        }
        #exc-hover-preview .exc-hp-head a {
            color: #8a5a20; text-decoration: none; font-weight: 700; font-size: 11.5px;
        }
        #exc-hover-preview .exc-hp-head a:hover { color: #d4883a; }
        #exc-hover-preview .exc-hp-status { font-size: 11.5px; color: #9a7d60; font-weight: 600; }
        #exc-hover-preview .exc-hp-grid {
            display: flex; flex-wrap: wrap; gap: 6px; align-items: flex-start;
        }
        #exc-hover-preview .exc-hp-cell {
            flex: 0 0 auto; border-radius: 6px; overflow: hidden;
            border: 1px solid #e8d8c0; background: #f6efe3;
            line-height: 0;
        }
        #exc-hover-preview .exc-hp-cell img {
            display: block; max-height: 160px; width: auto; max-width: 120px;
            object-fit: contain; background: #f0e6d8;
        }
        #exc-hover-preview .exc-hp-cell .exc-hp-bg {
            display: block; max-width: 120px; max-height: 160px;
            background-color: #f0e6d8; background-repeat: no-repeat;
        }
        #exc-hover-preview.is-loading .exc-hp-grid,
        #exc-hover-preview.is-empty .exc-hp-grid { display: none; }
        #exc-hover-preview.is-error .exc-hp-status { color: #b42318; }

        .exc-badge-row { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; margin-bottom: 2px; align-items: center; }
        .exc-card-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; align-items: center; }
        /* 画廊面板：小胶囊按钮，尽量一排塞得下 */
        #exc-gallery-panel .jlc-wb-btn,
        #exc-gallery-panel .exc-compare-actions .jlc-wb-btn,
        #exc-gallery-panel .exc-card-actions .jlc-wb-btn,
        #exc-gallery-panel a.jlc-wb-btn {
            padding: 4px 10px !important;
            font-size: 12px !important;
            line-height: 1.2 !important;
            border-radius: 999px !important;
            font-weight: 650 !important;
            box-shadow: none !important;
            min-height: 0 !important;
            height: auto !important;
            white-space: nowrap;
        }
        #exc-gallery-panel .jlc-wb-btn.primary {
            box-shadow: 0 1px 0 #b56e28 !important;
        }
        #exc-gallery-panel .exc-badge-row .jlc-status-pill {
            padding: 1px 7px;
            font-size: 10.5px;
            font-weight: 700;
        }
        #exc-gallery-panel .jlc-wb-view-title {
            margin: 8px 0 6px;
            font-size: 11px;
        }
        #exc-gallery-panel .exc-edition-list {
            margin-top: 6px; gap: 6px;
            display: flex !important; flex-direction: column !important;
        }
        #exc-gallery-panel .exc-edition-list .exc-ed {
            padding: 8px 10px;
            border-radius: 12px;
            font-size: 12.5px;
            box-shadow: 0 2px 0 #ead7bb;
        }
        #exc-gallery-panel .exc-edition-list .exc-ed.is-current {
            border: 2px solid #d4883a !important;
            background: linear-gradient(135deg, #fff8ef 0%, #ffeed6 100%) !important;
            box-shadow: 0 0 0 2px rgba(212,136,58,.28), 0 3px 0 #e8c48a !important;
            order: -2 !important;
        }
        #exc-gallery-panel .exc-edition-list .exc-ed.is-lrr-bound:not(.is-current) {
            border: 2px solid #5a9a60 !important;
            background: linear-gradient(135deg, #f3faf4 0%, #e8f5ea 100%) !important;
            order: -1 !important;
        }
        .exc-gl-item.is-exc-blocked { outline: 2px solid rgba(180,35,24,.35); outline-offset: -2px; opacity: .5; }
        .exc-gl-item.is-exc-blocked.exc-hide { display: none !important; }
        .exc-gl-item.is-exc-folded-child { display: none !important; }
        #exc-gallery-panel {
            margin: 14px 0 18px; padding: 0; border: 1px solid #e4d4bc; border-radius: 22px;
            background: #f6efe3; color: #4a3728; font: 14.5px/1.45 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            box-shadow: 0 12px 32px rgba(90,60,30,.16); overflow: hidden;
            clear: both; width: 100%; box-sizing: border-box;
            position: relative; z-index: 2;
        }
        #exc-gallery-panel .exc-g-head {
            padding: 14px 16px 8px; background: transparent; border-bottom: 0;
            font-weight: 800; font-size: 17px; color: #6b4a2e;
        }
        #exc-gallery-panel .exc-g-body { padding: 2px 16px 14px; }

        /*
         * 列表作品框体（可叠加）
         * 点过 is-exc-seen：金褐描边 + 封面压暗
         * 库内 is-exc-lib：绿色描边
         * 心动 is-exc-fav：橙色描边 + 标题染色
         */
        .exc-gl-item.is-exc-seen,
        .exc-gl-item.is-exc-lib,
        .exc-gl-item.is-exc-fav {
            border-radius: 6px;
            position: relative;
        }
        /* 点过：金边 + 压暗 */
        .exc-gl-item.is-exc-seen {
            outline: 2px solid rgba(180, 145, 90, 0.95);
            outline-offset: -2px;
        }
        .exc-gl-item.is-exc-seen img,
        .exc-gl-item.is-exc-seen .glthumb img,
        .exc-gl-item.is-exc-seen .glthumb,
        .exc-gl-item.is-exc-seen .exc-cover-host,
        .exc-gl-item.is-exc-seen .exc-cover-host img {
            opacity: 0.62 !important;
            filter: saturate(0.72) brightness(0.9) !important;
        }
        .exc-gl-item.is-exc-seen .exc-cover-host {
            position: relative;
        }
        .exc-gl-item.is-exc-seen .exc-cover-host::after {
            content: '';
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 1;
            background: rgba(90, 70, 40, 0.18);
            border-radius: inherit;
        }
        /* 库内：绿框（盖住部分金边感，库优先用绿） */
        .exc-gl-item.is-exc-lib {
            outline: 2px solid rgba(45, 140, 75, 0.95);
            outline-offset: -2px;
            box-shadow: 0 0 0 1px rgba(45, 140, 75, 0.2), 0 4px 12px rgba(45, 100, 60, 0.12);
        }
        .exc-gl-item.is-exc-lib.is-exc-seen {
            outline: 2px solid rgba(45, 140, 75, 0.95);
            box-shadow:
              0 0 0 1px rgba(45, 140, 75, 0.25),
              inset 0 0 0 2px rgba(180, 145, 90, 0.55);
        }
        /* 心动：橙框；与库叠加时内圈橙 */
        .exc-gl-item.is-exc-fav {
            outline: 2px solid rgba(212, 136, 58, 0.95);
            outline-offset: -2px;
            box-shadow: 0 0 0 1px rgba(212, 136, 58, 0.22), 0 4px 12px rgba(180, 100, 30, 0.12);
        }
        .exc-gl-item.is-exc-fav .glname a,
        .exc-gl-item.is-exc-fav .glink {
            color: #9a6700 !important;
        }
        .exc-gl-item.is-exc-lib.is-exc-fav {
            outline: 2px solid rgba(45, 140, 75, 0.95);
            box-shadow:
              0 0 0 1px rgba(45, 140, 75, 0.25),
              inset 0 0 0 2px rgba(212, 136, 58, 0.75);
        }
        .exc-gl-item.is-exc-seen.is-exc-fav:not(.is-exc-lib) {
            outline: 2px solid rgba(212, 136, 58, 0.95);
            box-shadow:
              0 0 0 1px rgba(212, 136, 58, 0.25),
              inset 0 0 0 2px rgba(180, 145, 90, 0.55);
        }
        /* 表格行：描边作用在首格封面更明显，整行加左侧色条 */
        tr.exc-gl-item.is-exc-seen > td.gl1e {
            box-shadow: inset 3px 0 0 #c4a574;
        }
        tr.exc-gl-item.is-exc-lib > td.gl1e {
            box-shadow: inset 3px 0 0 #2d8c4b;
        }
        tr.exc-gl-item.is-exc-fav > td.gl1e {
            box-shadow: inset 3px 0 0 #d4883a;
        }
        tr.exc-gl-item.is-exc-lib.is-exc-fav > td.gl1e {
            box-shadow: inset 3px 0 0 #2d8c4b, inset 6px 0 0 #d4883a;
        }
        tr.exc-gl-item.is-exc-seen.is-exc-lib > td.gl1e {
            box-shadow: inset 3px 0 0 #2d8c4b, inset 6px 0 0 #c4a574;
        }
        #exc-gallery-panel .exc-g-kv { font-size: 13px; color: #9a7d60; margin-bottom: 8px; }
        #exc-gallery-panel .exc-g-kv b { color: #4a3728; }
        /* tracking bar：挂在列表正上方（#dms / 顶部分页之后），不贴 #nb */
        #exc-tracking-bar {
            margin: 16px 0 12px;
            padding: 11px 14px 11px 16px;
            border-radius: 14px;
            background: rgba(255, 253, 248, 0.97);
            border: 1px solid #e4d4bc;
            border-left: 4px solid #d4883a;
            box-shadow: 0 10px 24px rgba(90, 60, 30, 0.12);
            font: 12.5px/1.35 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            color: #4a3728;
            display: flex;
            flex-wrap: wrap;
            gap: 8px 10px;
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
            color: #6b4a2e;
            font-weight: 650;
        }
        #exc-tracking-bar .exc-track-label b {
            color: #d4883a; font-weight: 800; margin-right: 2px;
        }
        #exc-tracking-bar.is-tracked {
            background: linear-gradient(90deg, #f2faf3 0%, #fffdf8 40%);
            border-color: #c5d9c8;
            border-left-color: #3d8f52;
            box-shadow: 0 10px 24px rgba(60, 100, 70, 0.1);
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
        #exc-tracking-bar .exc-track-meta {
            width: 100%; font-size: 11.5px; color: #9a7d60; line-height: 1.35;
            padding-top: 2px; border-top: 1px dashed #eadcc6; margin-top: 2px;
        }
        #exc-tracking-bar .exc-bp-continue {
            background: linear-gradient(135deg, #ff5f56, #e54840) !important;
            border-color: transparent !important; color: #fff !important;
            box-shadow: 0 3px 0 #b8322b, 0 6px 14px rgba(255,95,86,.22) !important;
            font-weight: 800 !important;
        }
        #exc-tracking-bar .exc-track-btn {
            flex: 0 0 auto;
            padding: 3px 10px !important;
            font-size: 11.5px !important;
            line-height: 1.2 !important;
            border-radius: 999px !important;
            box-shadow: none !important;
            min-height: 0;
        }
        /* library / edition compare card */
        .exc-compare-card {
            margin: 8px 0 4px; padding: 10px 12px; border-radius: 14px;
            background: #fffdf8; border: 1px solid #efe0cc;
            box-shadow: 0 2px 0 #ead7bb; color: #4a3728;
        }
        .exc-compare-card.is-maybe {
            border-color: #e8c48a; background: linear-gradient(180deg, #fff8ec 0%, #fffdf8 100%);
            box-shadow: 0 3px 0 #f0d9a8;
        }
        .exc-compare-card.is-diff {
            border-color: #e0c8a0;
        }
        .exc-compare-card.is-same {
            border-color: #9dcea8;
            background: linear-gradient(180deg, #f4fbf5 0%, #fffdf8 100%);
            box-shadow: 0 3px 0 #c5e0cb;
        }
        .exc-compare-card.is-same .exc-compare-chip {
            background: #e2f5e4; color: #2f6b3a; border-color: #b7dfbf;
        }
        /* 对照卡① 方案 A 结论色 */
        .exc-compare-card.is-lrr.is-lib {
            border-color: #b8cfe0;
            background: linear-gradient(180deg, #f4f8fc 0%, #fffdf8 100%);
            box-shadow: 0 2px 0 #c9dbe8;
        }
        .exc-compare-card.is-lrr.is-online-win {
            border-color: #e0b070;
            background: linear-gradient(180deg, #fff6e8 0%, #fffdf8 100%);
            box-shadow: 0 2px 0 #efd2a8;
        }
        .exc-compare-card.is-lrr.is-lib-win {
            border-color: #7fbf8a;
            background: linear-gradient(180deg, #eef8f0 0%, #fffdf8 100%);
            box-shadow: 0 2px 0 #c5e4cb;
        }
        .exc-compare-card.is-lrr.is-pack {
            border-color: #cfc4b0;
            background: linear-gradient(180deg, #f7f3ea 0%, #fffdf8 100%);
            box-shadow: 0 2px 0 #e2d8c4;
        }
        /* 对照卡② 线上多版本 */
        .exc-compare-card.is-editions {
            border-color: #d4c4e8;
            background: linear-gradient(180deg, #faf6ff 0%, #fffdf8 100%);
            box-shadow: 0 2px 0 #e2d6f0;
        }
        .exc-compare-card.is-editions .exc-edition-list { margin-top: 8px; }
        .exc-compare-card.is-editions .exc-ed.is-peer a { color: #6b3fa0; }
        /* 当前页：橙色描边，始终最显眼 */
        .exc-edition-list .exc-ed.is-current {
            order: -2 !important;
            border: 2px solid #d4883a !important;
            background: linear-gradient(135deg, #fff8ef 0%, #ffeed6 100%) !important;
            box-shadow: 0 0 0 2px rgba(212,136,58,.28), 0 3px 0 #e8c48a !important;
        }
        .exc-edition-list .exc-ed.is-current a { color: #8a4a12 !important; font-weight: 800; }
        /* 库源（非当前）：绿色框 */
        .exc-edition-list .exc-ed.is-lrr-bound:not(.is-current) {
            order: -1 !important;
            border: 2px solid #5a9a60 !important;
            background: linear-gradient(135deg, #f3faf4 0%, #e8f5ea 100%) !important;
            box-shadow: 0 0 0 1px rgba(90,154,96,.2), 0 3px 0 #c5dfc8 !important;
        }
        /* 当前页且是库源：橙框 + 绿底提示同源 */
        .exc-edition-list .exc-ed.is-lrr-bound.is-current {
            order: -2 !important;
            border: 2px solid #d4883a !important;
            background: linear-gradient(135deg, #f6faf4 0%, #fff0dc 55%, #ffeed6 100%) !important;
            box-shadow: 0 0 0 2px rgba(212,136,58,.3), 0 0 0 4px rgba(90,154,96,.18), 0 3px 0 #e0c090 !important;
        }
        .exc-edition-list .exc-ed.is-lrr-bound:not(.is-current) a { color: #2f5a36; }
        .exc-ed-lrr-tag {
            display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: .04em;
            color: #fff; background: #5a9a60; border-radius: 4px; padding: 1px 5px;
            vertical-align: middle; margin-right: 2px;
        }
        .exc-ed-cur-tag {
            display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: .04em;
            color: #fff; background: #d4883a; border-radius: 4px; padding: 1px 5px;
            vertical-align: middle; margin-right: 2px;
        }
        .exc-edition-list {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px;
        }
        .exc-compare-head {
            display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
            margin-bottom: 8px;
        }
        .exc-compare-title { font-weight: 800; font-size: 14px; color: #6b4a2e; }
        .exc-compare-chip {
            display: inline-block; padding: 2px 8px; border-radius: 999px;
            font-size: 11px; font-weight: 700; color: #8a5a20;
            background: #f3e2c4; border: 1px solid #e8c48a;
            max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .exc-compare-card.is-maybe .exc-compare-chip {
            background: #f7e0b0; border-style: dashed;
        }
        /* 结论 chip：高对比分色 */
        .exc-compare-chip.is-verdict { font-size: 12px; padding: 3px 10px; letter-spacing: .02em; }
        .exc-compare-chip.is-verdict.is-same {
            background: #e8e4dc; color: #5a5040; border-color: #cfc6b6;
        }
        .exc-compare-chip.is-verdict.is-samever {
            background: #2f6b3a; color: #fff; border-color: #2f6b3a;
        }
        .exc-compare-chip.is-verdict.is-online {
            background: #d4883a; color: #fff; border-color: #b56e28;
        }
        .exc-compare-chip.is-verdict.is-library {
            background: #3d8f52; color: #fff; border-color: #2f6b3a;
        }
        .exc-compare-chip.is-verdict.is-pack {
            background: #8a7a60; color: #fff; border-color: #6f614c;
        }
        /* 库内(冷绿) vs 线上(暖橙) 双列 */
        .exc-compare-vs {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 6px;
            align-items: stretch;
            margin-bottom: 8px;
        }
        .exc-compare-col {
            border-radius: 10px;
            padding: 7px 9px;
            min-width: 0;
            border: 1px solid transparent;
        }
        .exc-compare-col.is-lib {
            background: #e8f4ec;
            border-color: #a8d0b4;
            color: #1f4d2c;
        }
        .exc-compare-col.is-on {
            background: #fff0e0;
            border-color: #e8b878;
            color: #7a3e10;
        }
        .exc-compare-col-lab {
            font-size: 11px; font-weight: 800; letter-spacing: .04em;
            margin-bottom: 3px; opacity: .92;
        }
        .exc-compare-col.is-lib .exc-compare-col-lab { color: #2f6b3a; }
        .exc-compare-col.is-on .exc-compare-col-lab { color: #b56e28; }
        .exc-compare-col-val {
            font-size: 12.5px; font-weight: 700; line-height: 1.35;
            word-break: break-word;
        }
        .exc-compare-vs-mid {
            align-self: center;
            font-size: 11px; font-weight: 800; color: #a08868;
            padding: 0 2px;
        }
        .exc-compare-pair {
            display: flex; flex-direction: column; gap: 4px;
            font-size: 12.5px; color: #7a5a3c; margin-bottom: 6px;
        }
        .exc-compare-side { line-height: 1.35; }
        .exc-compare-k {
            display: inline-block; min-width: 2.5em; font-weight: 750; color: #9a7d60;
        }
        .exc-compare-diffs {
            list-style: none; margin: 0 0 6px; padding: 0;
            display: flex; flex-direction: column; gap: 4px;
        }
        .exc-compare-diffs li {
            font-size: 12.5px; color: #6b4a2e; padding: 4px 8px;
            border-radius: 8px; background: #f6efe3;
        }
        .exc-compare-diffs li b { margin-right: 4px; }
        .exc-compare-arrow { color: #c49a5c; margin: 0 2px; }
        .exc-compare-diffs li em {
            font-style: normal; font-size: 11px; font-weight: 700;
            margin-left: 6px; color: #b86a20;
        }
        .exc-compare-diffs li.is-online-better {
            background: #fff0e0; border-left: 3px solid #d4883a;
        }
        .exc-compare-diffs li.is-lib-better {
            background: #e8f4ec; border-left: 3px solid #3d8f52;
        }
        .exc-cmp-v.is-lib { color: #2f6b3a; font-weight: 750; }
        .exc-cmp-v.is-on { color: #b56e28; font-weight: 750; }
        .exc-compare-pack {
            font-size: 11.5px; color: #8a7a60; line-height: 1.35;
            margin: 2px 0 4px; padding: 4px 8px; border-radius: 8px;
            background: #f3efe6; border: 1px dashed #d8ccb8;
        }
        .exc-compare-pack.is-quiet { border-style: solid; background: #f0f4f0; color: #6a7a68; }
        .exc-compare-note { font-size: 11.5px; color: #9a7d60; line-height: 1.35; margin-top: 2px; }
        .exc-compare-actions {
            display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; align-items: center;
        }
        .exc-compare-actions .jlc-wb-btn,
        .exc-compare-actions a.jlc-wb-btn {
            padding: 4px 10px !important;
            font-size: 12px !important;
            line-height: 1.2 !important;
            border-radius: 999px !important;
            box-shadow: none !important;
            min-height: 0 !important;
            white-space: nowrap;
        }
        .exc-compare-actions .jlc-wb-btn.primary {
            box-shadow: 0 1px 0 #b56e28 !important;
        }
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
        .exc-edition-list { margin-top: 10px; display: flex; flex-direction: column; gap: 10px; }
        .exc-edition-list .exc-ed {
            border-radius: 16px; padding: 12px 14px; background: #fffdf8; border: 1px solid #efe0cc;
            font-size: 13px; color: #8a6f55; box-shadow: 0 3px 0 #ead7bb;
        }
        /* 后段通用卡片样式不得盖掉当前页/库源高亮 */
        .exc-edition-list .exc-ed.is-current {
            border: 2px solid #d4883a !important;
            background: linear-gradient(135deg, #fff8ef 0%, #ffeed6 100%) !important;
            box-shadow: 0 0 0 2px rgba(212,136,58,.28), 0 3px 0 #e8c48a !important;
        }
        .exc-edition-list .exc-ed.is-lrr-bound:not(.is-current) {
            border: 2px solid #5a9a60 !important;
            background: linear-gradient(135deg, #f3faf4 0%, #e8f5ea 100%) !important;
            box-shadow: 0 0 0 1px rgba(90,154,96,.2), 0 3px 0 #c5dfc8 !important;
        }
        .exc-edition-list .exc-ed a { color: #4a3728; text-decoration: none; font-weight: 750; }
        .exc-edition-list .exc-ed a:hover { color: #d4883a; }
        /* 工作台 · 作品状态：当前页对应 LRR 档案 */
        #jlc-wb-works-scroll .jlc-wb-item.is-current,
        #jlc-wb-works-scroll .jlc-wb-item.is-lrr-page {
            border: 2px solid #d4883a !important;
            background: linear-gradient(135deg, #fff8ef 0%, #ffeed6 100%) !important;
            box-shadow: 0 0 0 2px rgba(212,136,58,.22), 0 3px 0 #e8c48a !important;
            order: -1;
        }
        #jlc-wb-works-scroll {
            display: flex;
            flex-direction: column;
            gap: 10px;
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
            position: fixed; inset: 0; z-index: 1000001; display: none; align-items: center; justify-content: center;
            background: rgba(90,60,30,.35); padding: 20px;
        }
        #exc-wb-dialog.is-open { display: flex; }
        #exc-wb-dialog .jlc-wb-dialog-card {
            width: min(520px, 92vw); max-height: min(80vh, 640px); overflow: auto;
            background: #f6efe3; border: 1px solid #e4d4bc; border-radius: 22px;
            padding: 18px; box-shadow: 0 18px 50px rgba(90,60,30,.22); color: #4a3728;
            font: 14.5px/1.45 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
        }
        #exc-wb-dialog h4 { margin: 0 0 8px; font-size: 18px; color: #6b4a2e; font-weight: 800; }
        #exc-wb-dialog p { margin: 0 0 12px; font-size: 13.5px; color: #9a7d60; line-height: 1.55; }
        #exc-wb-dialog .jlc-wb-dialog-actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; margin-top: 12px; }
        #exc-wb-dialog .exc-modal-row {
            display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px;
            border: 1px solid #efe0cc; border-radius: 16px; margin-bottom: 10px; background: #fffdf8;
            box-shadow: 0 3px 0 #ead7bb;
        }
        /* shared controls (unscoped) */
        .jlc-wb-icon-btn, .jlc-wb-chip, .jlc-wb-btn {
            appearance: none; border: 1px solid #e0cdae; background: #fffaf2; color: #5a4030;
            border-radius: 999px; cursor: pointer; font-size: 13px; line-height: 1.25; font-weight: 650;
            text-decoration: none; display: inline-flex; align-items: center; justify-content: center;
            box-sizing: border-box;
        }
        .jlc-wb-icon-btn {
            width: 34px; height: 34px; padding: 0; background: #fff; font-size: 15px; box-shadow: 0 2px 0 #e6d3b5;
        }
        .jlc-wb-chip { padding: 7px 12px; background: #fff; box-shadow: 0 2px 0 #e6d3b5; }
        .jlc-wb-chip.is-on { background: #d4883a; border-color: transparent; color: #fff; box-shadow: 0 2px 0 #b56e28; }
        .jlc-wb-btn { padding: 9px 13px; border-radius: 12px; box-shadow: 0 2px 0 #e0cdae; }
        .jlc-wb-btn.primary { background: #d4883a; border-color: transparent; color: #fff; box-shadow: 0 2px 0 #b56e28; }
        .jlc-wb-btn.ghost { background: #fffaf2; }
        .jlc-wb-btn.danger { background: #f3d5d0; border-color: #e8b8b0; color: #8a3a32; box-shadow: none; }
        .jlc-wb-btn:hover, .jlc-wb-icon-btn:hover, .jlc-wb-chip:hover {
            background: #fff; border-color: #d4bc96; filter: brightness(1.02);
        }
        .jlc-wb-btn.primary:hover { background: #e09848; border-color: transparent; filter: none; }
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
