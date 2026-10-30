// ==UserScript==
// @name         Creamu · HJ
// @name:zh-CN   Creamu · HJ
// @namespace    https://github.com/wayneze/Creamu
// @version      0.1.46
// @description  Creamu：海角极简移动端体验、强力去广告、隐藏媒体解析提取、搜索与排序增强
// @author       wayneze
// @match        *://*.haijiao.com/*
// @match        *://haijiao.com/*
// @match        *://*.haijiao2.com/*
// @match        *://*.haijiao*.com/*
// @match        *://*/*haijiao*/*
// @allFrames     true
// @require      https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js
// @require      https://cdn.jsdelivr.net/npm/artplayer@5/dist/artplayer.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @connect      *

// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';
// 10-core.js

function initCreamuHjCore() {
  return {
    version: '0.1.46',
    log(...args) {
      console.log('[Creamu · HJ]', ...args);
    }
  };
}
// 20-sites.js

/** 只在海角站点上跑。域名含 haijiao，或地址里带海角路径。 */
function isHjSite() {
  const host = String((typeof location !== 'undefined' && location.hostname) || '').toLowerCase();
  const href = String((typeof location !== 'undefined' && location.href) || '').toLowerCase();
  if (host.includes('haijiao')) return true;
  return /haijiao/.test(href);
}
// 25-theme.js

function applyCreamuHjTheme() {
  const css = `
    :root {
      --hj-accent: #e2b7b8;
    }
    html {
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }
    /* clip 不建滚动容器，不会让站点的 sticky 失效 */
    html, body {
      overflow-x: clip;
    }

    /* 浅奶油底。黑底把海角原来的浅色字压没了。 */
    html, body, #app {
      background-color: #f6f0ea !important;
      color: #2b2623 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }
    body, #app {
      color: #2b2623 !important;
    }
    a { color: #8a4b4e !important; }

    /* 列表卡片。listContainer 是海角手机版的帖子块。 */
    .listContainer {
      background: #fffaf6 !important;
      color: #2b2623 !important;
      border-radius: 16px !important;
      border: 1px solid rgba(138, 75, 78, 0.12) !important;
      box-shadow: none !important;
      margin: 10px 12px !important;
      overflow: hidden !important;
    }

    /* 帖子正文 */
    .post-details, .post-content, .topic-content, .detail-content, .article-content {
      background: #fffaf6 !important;
      color: #2b2623 !important;
      border-radius: 16px !important;
      margin: 10px 12px !important;
      padding: 12px !important;
      font-size: 16px;
      line-height: 1.75;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    /* 正文里的图、视频、表格不许撑出屏幕。播放器盒子自己管尺寸。 */
    :is(.post-details, .post-content, .topic-content, .detail-content, .article-content, .listContainer)
      :is(img, video):not(#creamu-hj-inline-player-box *) {
      max-width: 100% !important;
      height: auto;
    }
    :is(.post-details, .post-content, .topic-content, .detail-content, .article-content) iframe {
      max-width: 100% !important;
    }
    :is(.post-details, .post-content, .topic-content, .detail-content, .article-content) table {
      display: block;
      max-width: 100%;
      overflow-x: auto;
    }
    :is(.post-details, .post-content, .topic-content, .detail-content, .article-content) pre {
      white-space: pre-wrap;
    }

    /* 顶栏不靠 class。贴在视口顶部、横跨屏幕的那一层就是它。 */
    div[style*="position: fixed"][style*="top: 0"],
    div[style*="position:fixed"][style*="top:0"] {
      background: rgba(246, 240, 234, 0.94) !important;
      backdrop-filter: blur(12px) !important;
      box-shadow: inset 0 -1px 0 rgba(138, 75, 78, 0.12) !important;
    }
    div[style*="position: fixed"][style*="bottom: 0"],
    div[style*="position:fixed"][style*="bottom:0"] {
      background: rgba(255, 250, 246, 0.96) !important;
      border-top: 1px solid rgba(138, 75, 78, 0.12) !important;
    }
    /* 刘海和底部手势条：没有安全区的设备 env() 取 0，不变样 */
    div[style*="position: fixed"][style*="top: 0"],
    div[style*="position:fixed"][style*="top:0"] {
      padding-top: env(safe-area-inset-top, 0px);
    }
    div[style*="position: fixed"][style*="bottom: 0"],
    div[style*="position:fixed"][style*="bottom:0"] {
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }

    /* 手机上输入框低于 16px，iOS 一聚焦就整页放大 */
    @media (pointer: coarse) {
      input:not([type="checkbox"]):not([type="radio"]), textarea, select {
        font-size: 16px !important;
      }
    }

    /* Vant / Element 弹窗：小屏不顶边，内容多时能滚 */
    .van-dialog, .el-message-box {
      max-width: calc(100vw - 32px) !important;
      border-radius: 16px !important;
    }
    .el-dialog {
      width: auto !important;
      max-width: calc(100vw - 32px) !important;
      border-radius: 16px !important;
    }
    .el-dialog__body, .van-dialog__content {
      max-height: 70vh;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    /* 用户页正倒序按钮：手指能稳稳点中，并避开底部手势条 */
    #creamu-hj-order-toggle {
      min-height: 40px !important;
      min-width: 64px;
      padding: 8px 14px !important;
      font-size: 14px !important;
      line-height: 1.2 !important;
      border-radius: 999px;
      background: #fffaf6;
      color: #8a4b4e;
      border: 1px solid rgba(138, 75, 78, 0.25);
      box-shadow: 0 4px 14px rgba(43, 38, 35, 0.14);
      bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important;
    }
    #creamu-hj-order-toggle:active {
      background: var(--hj-accent);
      color: #24181a;
    }

    /* 购买和付费按钮收成一颗，不改它的位置。 */
    .sell-btn, .sell_line1, .sell_line2 {
      background: #e2b7b8 !important;
      color: #24181a !important;
      border: none !important;
      border-radius: 999px !important;
    }

    /* 只藏明确的广告和弹窗。固定定位里有底栏和播放器，不能按这个藏。 */
    .ad-banner, .pop-vip-notice, [class*="download-app"],
    .luodiye_dialog, .el-dialog__wrapper:has(.luodiye_dialog),
    .van-popup:has(.luodiye_dialog), .van-dialog:has(.luodiye_dialog),
    img[data-id^="banner_"], [class*="advertising"], [class*="Advertis"] {
      display: none !important;
    }

    /* 移动端播放器与手势 HUD 提示框 */
    #hj-seek-hud {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(18, 18, 20, 0.92);
      color: var(--hj-accent);
      border: 1px solid rgba(226, 183, 184, 0.4);
      border-radius: 12px;
      padding: 12px 24px;
      font-size: 16px;
      font-weight: bold;
      pointer-events: none;
      z-index: 999999;
      opacity: 0;
      transition: opacity 0.15s ease;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
      backdrop-filter: blur(8px);
    }
    #hj-seek-hud.is-active {
      opacity: 1;
    }

    /* 触控大目标辅助操作栏 */
    .creamu-hj-player-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    .creamu-hj-btn,
    #creamu-hj-inline-player-box button {
      background: #2a2a34;
      color: #e1e1e6;
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 2px 7px !important;
      border-radius: 5px;
      font-size: 11px !important;
      line-height: 16px !important;
      min-height: 0 !important;
      height: auto !important;
      font-weight: 500;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      appearance: none;
      -webkit-appearance: none;
    }
    .creamu-hj-btn:active {
      background: var(--hj-accent);
      color: #121214;
    }
    #creamu-hj-inline-player-box.creamu-hj-filled > div:first-child,
    #creamu-hj-inline-player-box.creamu-hj-filled .creamu-hj-player-toolbar,
    #creamu-hj-inline-player-box.creamu-hj-filled #creamu-hj-play-status,
    #creamu-hj-inline-player-box.creamu-hj-filled #creamu-hj-debug {
      display: none !important;
    }
  `;
  if (typeof GM_addStyle === 'function') {
    GM_addStyle(css);
  }
}
function replaceCreamuWorkbenchSelectors(css, options = {}) {
    const replacements = [
        ['#jlc-wb-dialog', options.dialogSelector || '#jlc-wb-dialog'],
        ['#jlc-tracking-pagebar', options.pagebarSelector || '#jlc-tracking-pagebar'],
        ['#jlc-wb-fab', options.fabSelector || '#jlc-wb-fab'],
        ['#jlc-wb', options.panelSelector || '#jlc-wb'],
    ];
    return replacements.reduce((result, [from, to]) => result.split(from).join(to), String(css || ''));
}

function getCreamuWorkbenchCss(options = {}) {
  const css = `
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
            --creamu-wb-control-shadow: #e6d3b5;
            --creamu-wb-accent: #d4883a;
            --creamu-wb-accent-hover: #e09848;
            --creamu-wb-accent-light: #e8a24e;
            --creamu-wb-accent-dark: #b56e28;
            --creamu-wb-accent-shadow: rgba(140,90,40,.26);
            --creamu-wb-accent-shadow-soft: rgba(140,90,40,.22);
            --creamu-wb-accent-ring: rgba(212,136,58,.22);
            --creamu-wb-accent-overlay: rgba(212,136,58,.28);
            --creamu-wb-accent-overlay-soft: rgba(212,136,58,.18);
            --creamu-wb-on-accent: #fff;
            --creamu-wb-danger: #b42318;
        }

        #jlc-wb-fab {
            position: fixed; bottom: 20px; right: 18px; width: 34px; height: 34px;
            border-radius: 11px; border: 0 !important; color: #fff !important;
            background: linear-gradient(var(--creamu-wb-accent-light), var(--creamu-wb-accent)) !important;
            background-color: var(--creamu-wb-accent) !important;
            box-shadow: 0 3px 0 var(--creamu-wb-accent-dark), 0 8px 16px var(--creamu-wb-accent-shadow) !important;
            z-index: 999999; cursor: grab; touch-action: none; user-select: none;
            display: flex; align-items: center; justify-content: center; font-size: 14px;
            opacity: 1 !important;
            transition: filter .14s ease, box-shadow .14s ease, transform .12s ease;
        }
        #jlc-wb-fab:hover { filter: brightness(1.05); }
        #jlc-wb-fab:active, #jlc-wb-fab.is-dragging {
            cursor: grabbing; transform: translateY(2px);
            box-shadow: 0 2px 0 var(--creamu-wb-accent-dark), 0 4px 10px var(--creamu-wb-accent-shadow-soft);
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
            background: var(--creamu-wb-surface-raised); font-size: 15px; box-shadow: 0 2px 0 var(--creamu-wb-control-shadow);
        }
        #jlc-wb .jlc-wb-chip { padding: 7px 12px; background: var(--creamu-wb-surface-raised); box-shadow: 0 2px 0 var(--creamu-wb-control-shadow); }
        #jlc-wb .jlc-wb-chip.is-on { background: var(--creamu-wb-accent); border-color: transparent; color: var(--creamu-wb-on-accent); box-shadow: 0 2px 0 var(--creamu-wb-accent-dark); }
        #jlc-wb .jlc-wb-btn { padding: 9px 13px; border-radius: 12px; box-shadow: 0 2px 0 #e0cdae; }
        #jlc-wb .jlc-wb-btn.primary { background: var(--creamu-wb-accent); border-color: transparent; color: var(--creamu-wb-on-accent); box-shadow: 0 2px 0 var(--creamu-wb-accent-dark); }
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
            color: var(--creamu-wb-on-accent); background: var(--creamu-wb-accent); box-shadow: 0 2px 0 var(--creamu-wb-accent-dark);
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
        #jlc-wb .jlc-wb-footer-actions {
            display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
        }

        #jlc-wb .jlc-wb-toolbar {
            flex: 0 0 auto; display: flex; flex-direction: column; gap: 9px;
            padding: 4px 14px 10px; background: transparent; border-bottom: 0;
            position: static;
        }
        #jlc-wb .jlc-wb-toolbar-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        #jlc-wb .jlc-wb-toolbar-note {
            color: var(--creamu-wb-text-muted); font-size: 12.5px; line-height: 1.45;
        }
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
            border-color: var(--creamu-wb-accent); box-shadow: 0 0 0 2px var(--creamu-wb-accent-ring), 0 4px 0 #e0c9a8;
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
            box-shadow: 0 3px 0 var(--creamu-wb-accent-dark); transition: transform .12s ease, filter .12s ease;
        }
        #jlc-wb .jlc-wb-open-btn:hover { filter: brightness(1.05); transform: translateY(-1px); }
        #jlc-wb .jlc-wb-open-btn:active { transform: translateY(1px); box-shadow: 0 1px 0 var(--creamu-wb-accent-dark); }
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

        #jlc-wb .jlc-wb-view-block {
            background: var(--creamu-wb-surface); border: 1px solid #efe0cc; border-radius: 16px; padding: 14px; margin-bottom: 14px;
            box-shadow: 0 3px 0 #ead7bb;
        }
        #jlc-wb .jlc-wb-view-title {
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
        #jlc-wb .legacy-note.jlc-wb-intro-note,
        #jlc-wb .jlc-wb-settings .legacy-note.jlc-wb-intro-note { margin: 0 0 10px; }
        #jlc-wb .jlc-wb-status-note { margin: 4px 0 0; }
        #jlc-wb .jlc-wb-scroll-note { max-height: 140px; overflow: auto; }
        #jlc-wb .jlc-wb-note-summary { margin-bottom: 4px; }
        #jlc-wb .jlc-wb-title-link { color: inherit; text-decoration: none; }
        #jlc-wb .jlc-wb-inline-form { display: flex; gap: 6px; align-items: stretch; }
        #jlc-wb .jlc-wb-inline-form input {
            flex: 1 1 auto; min-width: 0; width: auto; margin-top: 0;
        }
        #jlc-wb #jlc-wb-library-root .jlc-wb-inline-form input[type="text"] {
            flex: 1 1 auto; min-width: 0; width: auto; margin-top: 0;
        }
        #jlc-wb .jlc-wb-list-stack { margin-top: 10px; }
        #jlc-wb .jlc-wb-range-head {
            display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px;
        }
        #jlc-wb .jlc-wb-range-value { color: var(--creamu-wb-accent); }
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
        #jlc-wb .jlc-wb-settings h3.jlc-wb-section-title { margin-top: 16px; }
        #jlc-wb .jlc-wb-form-actions {
            display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;
        }
        #jlc-wb .jlc-wb-form-actions > .jlc-wb-btn {
            flex: 1 1 120px; min-width: 0; justify-content: center;
        }
        #jlc-wb .jlc-wb-field-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; margin-top: 6px;
        }
        #jlc-wb .jlc-wb-field-grid > * { min-width: 0; }
        #jlc-wb .jlc-wb-block-action,
        #jlc-wb .jlc-wb-save-action {
            width: 100%; justify-content: center;
        }
        #jlc-wb .jlc-wb-block-action { margin-top: 8px; }
        #jlc-wb .jlc-wb-save-action { margin-top: 14px; }
        #jlc-wb .jlc-wb-settings .legacy-note.jlc-wb-data-report {
            margin-top: 10px; white-space: pre-wrap; word-break: break-word;
            max-height: 220px; overflow: auto; font-size: 12px; line-height: 1.45;
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
        #jlc-wb .stat-box {
            display: flex; justify-content: space-around; background: var(--creamu-wb-surface); border: 1px solid #efe0cc;
            border-radius: 14px; padding: 14px; margin-bottom: 14px;
        }
        #jlc-wb .stat-item { text-align: center; }
        #jlc-wb .stat-item b { display: block; color: var(--creamu-wb-accent); font-size: 22px; margin-bottom: 4px; }
        #jlc-wb .stat-item span { font-size: 11px; color: var(--creamu-wb-text-muted); }
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
            background: var(--creamu-wb-accent-overlay);
        }
        #jlc-wb .jlc-wb-resize-corner:hover, #jlc-wb .jlc-wb-resize-corner.is-dragging {
            background: var(--creamu-wb-accent-overlay-soft);
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
        #jlc-wb .jlc-wb-settings-footer .jlc-wb-btn { width: 100%; justify-content: center; }

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
  return replaceCreamuWorkbenchSelectors(css, options);
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
    const extra = replaceCreamuWorkbenchSelectors(opts.extraCss || '', opts);
    const css = getCreamuWorkbenchCss(opts) + (extra ? '\n' + extra : '');
    if (styleEl.textContent !== css) styleEl.textContent = css;
    return styleEl;
  }
function parseCreamuPixel(value) {
  if (value == null || value === '') return NaN;
  if (typeof value === 'number') return value;
  return parseFloat(String(value).replace(/px$/i, ''));
}

function getCreamuViewportSize(viewport) {
  const width = Number(viewport?.innerWidth ?? viewport?.width);
  const height = Number(viewport?.innerHeight ?? viewport?.height);
  return {
    width: Number.isFinite(width) && width > 0 ? width : 1280,
    height: Number.isFinite(height) && height > 0 ? height : 720,
  };
}

function getCreamuDefaultWorkbenchRect(viewport, options = {}) {
  const size = getCreamuViewportSize(viewport);
  const minWidth = Number(options.minWidth) || 360;
  const minHeight = Number(options.minHeight) || 280;
  const preferredMaxWidth = Number(options.preferredMaxWidth) || 520;
  const preferredMaxHeight = Number(options.preferredMaxHeight) || 780;
  const widthPadding = Number(options.widthPadding) || 96;
  const heightPadding = Number(options.heightPadding) || 80;
  const heightRatio = Number(options.heightRatio) || 0.76;
  const rightOffset = Number(options.rightOffset) || 48;
  const minLeft = Number(options.minLeft) || 24;
  const minTop = Number(options.minTop) || 32;
  const topRatio = Number(options.topRatio) || 0.12;
  const width = Math.min(preferredMaxWidth, Math.max(minWidth, size.width - widthPadding));
  const height = Math.max(
    minHeight,
    Math.min(size.height * heightRatio, preferredMaxHeight, size.height - heightPadding)
  );

  return {
    left: Math.max(minLeft, Math.round(size.width - width - rightOffset)),
    top: Math.max(minTop, Math.round((size.height - height) * topRatio)),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function clampCreamuWorkbenchRect(rect, viewport, options = {}) {
  const size = getCreamuViewportSize(viewport);
  const margin = Number.isFinite(Number(options.margin)) ? Number(options.margin) : 12;
  const minWidth = Number(options.minWidth) || 360;
  const minHeight = Number(options.minHeight) || 280;
  const availableWidth = Math.max(minWidth, size.width - margin * 2);
  const availableHeight = Math.max(minHeight, size.height - margin * 2);
  const configuredMaxWidth = Number(options.maxWidth);
  const configuredMaxHeight = Number(options.maxHeight);
  const maxWidth = Number.isFinite(configuredMaxWidth)
    ? Math.min(availableWidth, Math.max(minWidth, configuredMaxWidth))
    : availableWidth;
  const maxHeight = Number.isFinite(configuredMaxHeight)
    ? Math.min(availableHeight, Math.max(minHeight, configuredMaxHeight))
    : availableHeight;
  const defaultRect = options.defaultRect || getCreamuDefaultWorkbenchRect(size, options);

  let width = Math.round(parseCreamuPixel(rect?.width));
  let height = Math.round(parseCreamuPixel(rect?.height));
  if (!Number.isFinite(width) || width <= 0) width = Number(options.fallbackWidth) || defaultRect.width;
  if (!Number.isFinite(height) || height <= 0) height = Number(options.fallbackHeight) || defaultRect.height;
  width = Math.min(maxWidth, Math.max(minWidth, width));
  height = Math.min(maxHeight, Math.max(minHeight, height));

  let left = parseCreamuPixel(rect?.left);
  let top = parseCreamuPixel(rect?.top);
  if (!Number.isFinite(left)) left = defaultRect.left;
  if (!Number.isFinite(top)) top = defaultRect.top;
  const maxLeft = Math.max(margin, size.width - width - margin);
  const maxTop = Math.max(margin, size.height - height - margin);

  return {
    left: Math.round(Math.min(maxLeft, Math.max(margin, left))),
    top: Math.round(Math.min(maxTop, Math.max(margin, top))),
    width,
    height,
  };
}

function clampCreamuWorkbenchPoint(point, elementSize, viewport, options = {}) {
  const left = parseCreamuPixel(point?.left);
  const top = parseCreamuPixel(point?.top);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
  const size = getCreamuViewportSize(viewport);
  const margin = Number.isFinite(Number(options.margin)) ? Number(options.margin) : 8;
  const width = Math.max(0, parseCreamuPixel(elementSize?.width) || 0);
  const height = Math.max(0, parseCreamuPixel(elementSize?.height) || 0);
  return {
    left: Math.min(Math.max(margin, left), Math.max(margin, size.width - width - margin)),
    top: Math.min(Math.max(margin, top), Math.max(margin, size.height - height - margin)),
  };
}

function moveCreamuWorkbenchRect(rect, startPoint, currentPoint, viewport, options = {}) {
  const startX = Number(startPoint?.x);
  const startY = Number(startPoint?.y);
  const currentX = Number(currentPoint?.x);
  const currentY = Number(currentPoint?.y);
  const dx = Number.isFinite(startX) && Number.isFinite(currentX) ? currentX - startX : 0;
  const dy = Number.isFinite(startY) && Number.isFinite(currentY) ? currentY - startY : 0;
  return clampCreamuWorkbenchRect({
    left: parseCreamuPixel(rect?.left) + dx,
    top: parseCreamuPixel(rect?.top) + dy,
    width: rect?.width,
    height: rect?.height,
  }, viewport, options);
}

function resizeCreamuWorkbenchRect(rect, startPoint, currentPoint, mode, viewport, options = {}) {
  const base = clampCreamuWorkbenchRect(rect, viewport, options);
  const startX = Number(startPoint?.x);
  const startY = Number(startPoint?.y);
  const currentX = Number(currentPoint?.x);
  const currentY = Number(currentPoint?.y);
  const dx = Number.isFinite(startX) && Number.isFinite(currentX) ? currentX - startX : 0;
  const dy = Number.isFinite(startY) && Number.isFinite(currentY) ? currentY - startY : 0;
  const next = { ...base };

  if (mode === 'w') {
    next.left = base.left + dx;
    next.width = base.width - dx;
  } else if (mode === 'corner') {
    next.width = base.width + dx;
    next.height = base.height + dy;
  } else if (mode === 'h') {
    next.height = base.height + dy;
  }

  const resized = clampCreamuWorkbenchRect(next, viewport, options);
  if (mode !== 'w') return resized;
  const right = base.left + base.width;
  return clampCreamuWorkbenchRect({
    ...resized,
    left: right - resized.width,
  }, viewport, options);
}
function getCreamuInteractionTarget(options = {}) {
  return options.eventTarget || (typeof window !== 'undefined' ? window : null);
}

function getCreamuInteractionDocument(element, options = {}) {
  return options.document || element?.ownerDocument || (typeof document !== 'undefined' ? document : null);
}

function getCreamuInteractionRect(element) {
  const rect = element?.getBoundingClientRect?.() || {};
  return {
    left: Number(rect.left) || 0,
    top: Number(rect.top) || 0,
    width: Number(rect.width) || 0,
    height: Number(rect.height) || 0,
  };
}

function applyCreamuInteractionRect(element, rect) {
  if (!element?.style || !rect) return;
  element.style.left = Math.round(Number(rect.left) || 0) + 'px';
  element.style.top = Math.round(Number(rect.top) || 0) + 'px';
  element.style.right = 'auto';
  element.style.bottom = 'auto';
  if (rect.width != null) element.style.width = Math.round(Number(rect.width) || 0) + 'px';
  if (rect.height != null) element.style.height = Math.round(Number(rect.height) || 0) + 'px';
}

function isCreamuPrimaryPointer(event) {
  return event && (event.button == null || event.button === 0);
}

function getCreamuClientPoint(event) {
  return { x: Number(event?.clientX) || 0, y: Number(event?.clientY) || 0 };
}

function getCreamuDataset(element) {
  if (!element) return null;
  if (!element.dataset) element.dataset = {};
  return element.dataset;
}

function callCreamuPreventDefault(event) {
  if (typeof event?.preventDefault === 'function') event.preventDefault();
}

function callCreamuStopPropagation(event) {
  if (typeof event?.stopPropagation === 'function') event.stopPropagation();
}

function bindCreamuFabDrag(fab, options = {}) {
  if (!fab) return () => {};
  const dataset = getCreamuDataset(fab);
  const boundKey = options.boundKey || 'creamuFabDragBound';
  if (dataset?.[boundKey] === '1') return () => {};
  if (dataset) dataset[boundKey] = '1';

  const target = getCreamuInteractionTarget(options);
  const doc = getCreamuInteractionDocument(fab, options);
  if (!target || typeof fab.addEventListener !== 'function') return () => {};

  const eventType = options.eventType === 'mouse' ? 'mouse' : 'pointer';
  const downEvent = eventType === 'mouse' ? 'mousedown' : 'pointerdown';
  const moveEvent = eventType === 'mouse' ? 'mousemove' : 'pointermove';
  const upEvent = eventType === 'mouse' ? 'mouseup' : 'pointerup';
  const cancelEvent = eventType === 'mouse' ? null : 'pointercancel';
  const applyPosition = options.applyPosition || ((point) => {
    if (!fab.style || !point) return;
    fab.style.left = Math.round(Number(point.left) || 0) + 'px';
    fab.style.top = Math.round(Number(point.top) || 0) + 'px';
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
  });
  const getPosition = options.getPosition || (() => {
    const rect = getCreamuInteractionRect(fab);
    return { left: rect.left, top: rect.top };
  });
  const savePosition = options.savePosition || (() => {});
  const onActivate = options.onActivate || (() => {});
  const shouldIgnoreDrag = options.shouldIgnoreDrag || (() => false);
  const isDragDisabled = options.isDragDisabled || (() => false);
  const threshold = Number.isFinite(Number(options.threshold)) ? Number(options.threshold) : 5;
  const thresholdMode = options.thresholdMode === 'axis' ? 'axis' : 'sum';
  const preventClick = options.preventClick !== false;
  const bindClick = options.bindClick !== false;
  const suppressDuration = Number.isFinite(Number(options.suppressDuration))
    ? Math.max(0, Number(options.suppressDuration))
    : 0;
  let active = false;
  let moved = false;
  let startPoint = { x: 0, y: 0 };
  let origin = { left: 0, top: 0 };
  let lastPoint = null;

  if (typeof options.getInitialPosition === 'function') {
    const initial = options.getInitialPosition();
    if (initial) applyPosition(initial, { phase: 'initial' });
  }

  const onMove = (event) => {
    if (!active) return;
    const point = getCreamuClientPoint(event);
    const dx = point.x - startPoint.x;
    const dy = point.y - startPoint.y;
    const crossedThreshold = thresholdMode === 'axis'
      ? Math.abs(dx) >= threshold || Math.abs(dy) >= threshold
      : Math.abs(dx) + Math.abs(dy) >= threshold;
    if (!moved && crossedThreshold) {
      moved = true;
      fab.classList?.add('is-dragging');
    }
    if (!moved) return;
    callCreamuPreventDefault(event);
    const width = fab.offsetWidth || 34;
    const height = fab.offsetHeight || 34;
    const next = clampCreamuWorkbenchPoint(
      { left: origin.left + dx, top: origin.top + dy },
      { width, height },
      options.viewport || (typeof window !== 'undefined' ? window : null),
      options.geometryOptions || {}
    );
    if (!next) return;
    lastPoint = next;
    applyPosition(next, { phase: 'move', event });
  };

  const onUp = (event) => {
    if (!active) return;
    active = false;
    target.removeEventListener(moveEvent, onMove, true);
    target.removeEventListener(upEvent, onUp, true);
    if (cancelEvent) target.removeEventListener(cancelEvent, onUp, true);
    fab.classList?.remove('is-dragging');
    if (moved) {
      savePosition(lastPoint || getPosition(), { phase: 'end', event });
      dataset.suppressClick = '1';
      const clear = () => { delete dataset.suppressClick; };
      if (suppressDuration > 0 && typeof setTimeout === 'function') setTimeout(clear, suppressDuration);
      else if (typeof setTimeout === 'function') setTimeout(clear, 0);
      else clear();
    }
    moved = false;
    lastPoint = null;
  };

  const onDown = (event) => {
    if (!isCreamuPrimaryPointer(event) || isDragDisabled(event) || shouldIgnoreDrag(event)) return;
    active = true;
    moved = false;
    startPoint = getCreamuClientPoint(event);
    const rect = getCreamuInteractionRect(fab);
    origin = { left: rect.left, top: rect.top };
    if (eventType === 'pointer' && typeof fab.setPointerCapture === 'function' && event.pointerId != null) {
      try { fab.setPointerCapture(event.pointerId); } catch (_) { /* ignore */ }
    }
    target.addEventListener(moveEvent, onMove, true);
    target.addEventListener(upEvent, onUp, true);
    if (cancelEvent) target.addEventListener(cancelEvent, onUp, true);
  };

  const onClick = (event) => {
    if (dataset.suppressClick === '1' || moved) {
      if (preventClick) callCreamuPreventDefault(event);
      callCreamuStopPropagation(event);
      return;
    }
    if (preventClick) callCreamuPreventDefault(event);
    onActivate(event);
  };

  const onViewportChange = () => {
    if (typeof options.onViewportChange === 'function') options.onViewportChange(fab);
  };

  fab.addEventListener(downEvent, onDown);
  if (bindClick) fab.addEventListener('click', onClick);
  if (typeof options.onViewportChange === 'function') {
    target.addEventListener('resize', onViewportChange, { passive: true });
  }

  return () => {
    fab.removeEventListener(downEvent, onDown);
    if (bindClick) fab.removeEventListener('click', onClick);
    target.removeEventListener(moveEvent, onMove, true);
    target.removeEventListener(upEvent, onUp, true);
    if (cancelEvent) target.removeEventListener(cancelEvent, onUp, true);
    if (typeof options.onViewportChange === 'function') target.removeEventListener('resize', onViewportChange);
    if (dataset) delete dataset[boundKey];
    if (doc?.body) doc.body.style.userSelect = '';
  };
}

function bindCreamuWorkbenchDrag(panel, options = {}) {
  if (!panel) return () => {};
  const header = options.header || panel.querySelector?.(options.headerSelector || '.jlc-wb-header');
  if (!header) return () => {};
  const dataset = getCreamuDataset(header);
  const boundKey = options.boundKey || 'creamuWorkbenchDragBound';
  if (dataset?.[boundKey] === '1') return () => {};
  if (dataset) dataset[boundKey] = '1';

  const target = getCreamuInteractionTarget(options);
  const doc = getCreamuInteractionDocument(panel, options);
  if (!target || typeof header.addEventListener !== 'function') return () => {};
  const eventType = options.eventType === 'mouse' ? 'mouse' : 'pointer';
  const downEvent = eventType === 'mouse' ? 'mousedown' : 'pointerdown';
  const moveEvent = eventType === 'mouse' ? 'mousemove' : 'pointermove';
  const upEvent = eventType === 'mouse' ? 'mouseup' : 'pointerup';
  const cancelEvent = eventType === 'mouse' ? null : 'pointercancel';
  const getStartRect = options.getStartRect || (() => getCreamuInteractionRect(panel));
  const applyRect = options.applyRect || ((rect) => applyCreamuInteractionRect(panel, rect));
  const shouldIgnoreDrag = options.shouldIgnoreDrag || (() => false);
  const isDragDisabled = options.isDragDisabled || (() => false);
  const lockBodySelection = options.lockBodySelection === true;
  const body = options.body || doc?.body;
  let active = false;
  let startPoint = { x: 0, y: 0 };
  let startRect = null;
  let lastRect = null;

  const finish = (event) => {
    if (!active) return;
    active = false;
    panel.classList?.remove('is-dragging');
    if (lockBodySelection && body) body.style.userSelect = '';
    target.removeEventListener(moveEvent, onMove, true);
    target.removeEventListener(upEvent, finish, true);
    if (cancelEvent) target.removeEventListener(cancelEvent, finish, true);
    const rect = lastRect || getCreamuInteractionRect(panel);
    if (typeof options.onEnd === 'function') options.onEnd(rect, { event, phase: 'end' });
    else applyRect(rect, { event, phase: 'end', persist: true });
    lastRect = null;
  };

  const onMove = (event) => {
    if (!active) return;
    const current = getCreamuClientPoint(event);
    lastRect = moveCreamuWorkbenchRect(
      startRect,
      startPoint,
      current,
      options.viewport || (typeof window !== 'undefined' ? window : null),
      options.geometryOptions || {}
    );
    applyRect(lastRect, { event, phase: 'move', persist: false });
  };

  const onDown = (event) => {
    if (!isCreamuPrimaryPointer(event) || isDragDisabled(event) || shouldIgnoreDrag(event)) return;
    callCreamuPreventDefault(event);
    startRect = getStartRect(panel, event);
    startPoint = getCreamuClientPoint(event);
    lastRect = startRect;
    active = true;
    panel.classList?.add('is-dragging');
    if (lockBodySelection && body) body.style.userSelect = 'none';
    if (eventType === 'pointer' && typeof header.setPointerCapture === 'function' && event.pointerId != null) {
      try { header.setPointerCapture(event.pointerId); } catch (_) { /* ignore */ }
    }
    if (typeof options.onStart === 'function') options.onStart(startRect, { event, phase: 'start' });
    target.addEventListener(moveEvent, onMove, true);
    target.addEventListener(upEvent, finish, true);
    if (cancelEvent) target.addEventListener(cancelEvent, finish, true);
  };

  header.addEventListener(downEvent, onDown);
  return () => {
    header.removeEventListener(downEvent, onDown);
    target.removeEventListener(moveEvent, onMove, true);
    target.removeEventListener(upEvent, finish, true);
    if (cancelEvent) target.removeEventListener(cancelEvent, finish, true);
    if (lockBodySelection && body) body.style.userSelect = '';
    if (dataset) delete dataset[boundKey];
  };
}

function bindCreamuWorkbenchResize(panel, options = {}) {
  if (!panel) return () => {};
  const dataset = getCreamuDataset(panel);
  const boundKey = options.boundKey || 'creamuWorkbenchResizeBound';
  if (dataset?.[boundKey] === '1') return () => {};
  if (dataset) dataset[boundKey] = '1';

  const target = getCreamuInteractionTarget(options);
  const doc = getCreamuInteractionDocument(panel, options);
  if (!target || typeof panel.querySelector !== 'function') return () => {};
  const eventType = options.eventType === 'mouse' ? 'mouse' : 'pointer';
  const downEvent = eventType === 'mouse' ? 'mousedown' : 'pointerdown';
  const moveEvent = eventType === 'mouse' ? 'mousemove' : 'pointermove';
  const upEvent = eventType === 'mouse' ? 'mouseup' : 'pointerup';
  const cancelEvent = eventType === 'mouse' ? null : 'pointercancel';
  const getStartRect = options.getStartRect || (() => getCreamuInteractionRect(panel));
  const applyRect = options.applyRect || ((rect) => applyCreamuInteractionRect(panel, rect));
  const isDragDisabled = options.isDragDisabled || (() => false);
  const lockBodySelection = options.lockBodySelection === true;
  const body = options.body || doc?.body;
  const handles = [
    [options.westSelector || '.jlc-wb-resize-w', 'w'],
    [options.heightSelector || '.jlc-wb-resize-h', 'h'],
    [options.cornerSelector || '.jlc-wb-resize-corner', 'corner'],
  ];
  const cleanups = [];

  handles.forEach(([selector, mode]) => {
    const handle = panel.querySelector(selector);
    if (!handle || typeof handle.addEventListener !== 'function') return;
    const handleDataset = getCreamuDataset(handle);
    const handleKey = (options.handleBoundPrefix || 'creamuResizeHandle') + mode;
    if (handleDataset?.[handleKey] === '1') return;
    if (handleDataset) handleDataset[handleKey] = '1';
    let active = false;
    let startPoint = { x: 0, y: 0 };
    let startRect = null;
    let lastRect = null;

    const finish = (event) => {
      if (!active) return;
      active = false;
      handle.classList?.remove('is-dragging');
      panel.classList?.remove('is-resizing');
      if (lockBodySelection && body) body.style.userSelect = '';
      target.removeEventListener(moveEvent, onMove, true);
      target.removeEventListener(upEvent, finish, true);
      if (cancelEvent) target.removeEventListener(cancelEvent, finish, true);
      const rect = lastRect || getCreamuInteractionRect(panel);
      if (typeof options.onEnd === 'function') options.onEnd(rect, mode, { event, phase: 'end' });
      else applyRect(rect, { event, phase: 'end', persist: true, mode });
      lastRect = null;
    };

    const onMove = (event) => {
      if (!active) return;
      lastRect = resizeCreamuWorkbenchRect(
        startRect,
        startPoint,
        getCreamuClientPoint(event),
        mode,
        options.viewport || (typeof window !== 'undefined' ? window : null),
        options.geometryOptions || {}
      );
      applyRect(lastRect, { event, phase: 'move', persist: false, mode });
    };

    const onDown = (event) => {
      if (!isCreamuPrimaryPointer(event) || isDragDisabled(event)) return;
      callCreamuPreventDefault(event);
      callCreamuStopPropagation(event);
      startRect = getStartRect(panel, event);
      startPoint = getCreamuClientPoint(event);
      lastRect = startRect;
      active = true;
      handle.classList?.add('is-dragging');
      panel.classList?.add('is-resizing');
      if (lockBodySelection && body) body.style.userSelect = 'none';
      if (eventType === 'pointer' && typeof handle.setPointerCapture === 'function' && event.pointerId != null) {
        try { handle.setPointerCapture(event.pointerId); } catch (_) { /* ignore */ }
      }
      if (typeof options.onStart === 'function') options.onStart(startRect, mode, { event, phase: 'start' });
      target.addEventListener(moveEvent, onMove, true);
      target.addEventListener(upEvent, finish, true);
      if (cancelEvent) target.addEventListener(cancelEvent, finish, true);
    };

    handle.addEventListener(downEvent, onDown);
    cleanups.push(() => {
      handle.removeEventListener(downEvent, onDown);
      target.removeEventListener(moveEvent, onMove, true);
      target.removeEventListener(upEvent, finish, true);
      if (cancelEvent) target.removeEventListener(cancelEvent, finish, true);
      if (handleDataset) delete handleDataset[handleKey];
    });
  });

  return () => {
    cleanups.forEach((cleanup) => cleanup());
    if (lockBodySelection && body) body.style.userSelect = '';
    if (dataset) delete dataset[boundKey];
  };
}
  /* Creamu WebDAV sync (generic vault file over WebDAV / 坚果云等) */
  const CREAMU_WD_DEFAULT_PATH = '/Creamu';

  function creamuWdCompact(v) {
    return String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  }

  function creamuWdSafeJson(text, fallback) {
    try {
      return JSON.parse(text);
    } catch (_) {
      return fallback;
    }
  }

  function creamuWdHttp(opts) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== 'function') {
        reject(new Error('GM_xmlhttpRequest unavailable'));
        return;
      }
      GM_xmlhttpRequest({
        method: opts.method || 'GET',
        url: opts.url,
        headers: opts.headers || {},
        data: opts.data,
        timeout: opts.timeout || 60000,
        responseType: opts.responseType || 'text',
        onload(res) {
          resolve(res);
        },
        onerror(err) {
          reject(err || new Error('network error'));
        },
        ontimeout() {
          reject(new Error('timeout'));
        },
      });
    });
  }

  function creamuWdCleanPassword(url, pass) {
    const raw = String(pass == null ? '' : pass).trim();
    if (!raw) return '';
    // 坚果云应用密码为 16 位连续字母，去内部空格/换行
    if (/jianguoyun\.com/i.test(String(url || ''))) {
      return raw.replace(/\s+/g, '');
    }
    return raw;
  }

  /** Basic Auth：兼容非 ASCII 用户名/密码 */
  function creamuWdBasicAuth(user, pass, url) {
    const cleanPass = creamuWdCleanPassword(url, pass);
    const raw = String(user == null ? '' : user) + ':' + cleanPass;
    let b64;
    try {
      b64 = btoa(unescape(encodeURIComponent(raw)));
    } catch (_) {
      b64 = btoa(raw);
    }
    return 'Basic ' + b64;
  }

  function creamuWdJoinUrl(base, relPath) {
    const b = creamuWdCompact(base).replace(/\/+$/, '');
    const p = String(relPath == null ? '' : relPath)
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');
    if (!b) return '/' + p;
    if (!p) return b;
    return b + '/' + p;
  }

  /** 规范化相对目录：无首尾斜杠，空则默认 Creamu */
  function creamuWdNormDir(dir) {
    let d = creamuWdCompact(dir || CREAMU_WD_DEFAULT_PATH)
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');
    if (!d) d = 'Creamu';
    return d;
  }

  /**
   * @param {{
   *   product: string,
   *   notify?: (msg: string, isErr?: boolean) => void,
   *   exportPayload: () => Promise<object>,
   *   importPayload: (payload: object) => Promise<void>,
   *   getSettings: () => {
   *     enabled?: boolean,
   *     url?: string,
   *     user?: string,
   *     password?: string,
   *     path?: string,
   *     auto?: boolean,
   *     conflict?: string
   *   },
   * }} host
   */
  function createCreamuWebDavSync(host) {
    const product = creamuWdCompact(host.product || 'app').toLowerCase() || 'app';
    const metaKey = 'creamu_wd_meta_' + product;
    const vaultName = product + '.vault.json';
    let pushTimer = null;
    let busy = false;
    let retryCount = 0;

    function notify(msg, isErr) {
      if (typeof host.notify === 'function') host.notify(msg, !!isErr);
      else if (typeof showToast === 'function') showToast(msg);
      else console.info('[Creamu WD]', msg);
    }

    function gmGet(key, def) {
      if (typeof GM_getValue !== 'function') return def;
      const v = GM_getValue(key, def);
      return v === undefined ? def : v;
    }

    function gmSet(key, val) {
      if (typeof GM_setValue === 'function') GM_setValue(key, val);
    }

    function loadMeta() {
      const raw = gmGet(metaKey, null);
      let m = typeof raw === 'string' ? creamuWdSafeJson(raw, null) : raw;
      if (!m || typeof m !== 'object') m = {};
      if (!m.device_id) {
        m.device_id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
        // 立即落盘：冲突判断要靠 vault.device_id 认出「上次是本机推的」
        gmSet(metaKey, JSON.stringify(m));
      }
      m.local_revision = Number(m.local_revision) || 0;
      // 上次成功同步时云端的 revision；-1 = 旧版 meta 未记录
      const remoteRev = m.remote_revision == null || m.remote_revision === '' ? NaN : Number(m.remote_revision);
      m.remote_revision = Number.isFinite(remoteRev) ? remoteRev : -1;
      m.dirty = !!m.dirty;
      m.last_sync = Number(m.last_sync) || 0;
      m.last_error = m.last_error || '';
      m.last_action = m.last_action || '';
      m.tested_ok = !!m.tested_ok;
      return m;
    }

    function saveMeta(m) {
      gmSet(metaKey, JSON.stringify(m || {}));
    }

    function settings() {
      const s = (typeof host.getSettings === 'function' && host.getSettings()) || {};
      const url = creamuWdCompact(s.url || '');
      const rawPass = String(s.password == null ? '' : s.password);
      const cleanPass = creamuWdCleanPassword(url, rawPass);
      return {
        enabled: !!s.enabled,
        url,
        user: creamuWdCompact(s.user || ''),
        password: cleanPass,
        path: creamuWdNormDir(s.path),
        auto: !!s.auto,
        conflict: s.conflict === 'remote' || s.conflict === 'local' ? s.conflict : 'ask',
      };
    }

    function vaultRelPath() {
      return settings().path + '/' + vaultName;
    }

    function vaultUrl() {
      const st = settings();
      return creamuWdJoinUrl(st.url, vaultRelPath());
    }

    function authHeaders(extra) {
      const st = settings();
      return Object.assign(
        {
          Authorization: creamuWdBasicAuth(st.user, st.password, st.url),
        },
        extra || {}
      );
    }

    function isConfigured() {
      const st = settings();
      return !!(st.url && st.user && st.password);
    }

    function isConnected() {
      return isConfigured();
    }

    function statusText() {
      const st = settings();
      const m = loadMeta();
      if (!st.url) return '未配置 WebDAV 地址';
      if (!st.user || !st.password) return '未配置账号/应用密码';
      const when = m.last_sync ? new Date(m.last_sync).toLocaleString() : '从未';
      const err = m.last_error ? ' · 错: ' + m.last_error : '';
      const en = st.enabled ? '' : ' · 未启用';
      const relPath = st.path + '/' + vaultName;
      return st.user + ' · ' + relPath + ' · rev ' + m.local_revision + ' · 上次 ' + when + en + err;
    }

    function checkDavAuthStatus(res) {
      if (res.status === 401) {
        throw new Error('认证失败，请检查用户名与应用密码（坚果云需用应用密码，用户名需为注册邮箱）');
      }
      if (res.status === 403) {
        throw new Error(
          '访问被拒绝 (403 Forbidden)：请检查坚果云中是否已创建该同步文件夹（如 /Creamu），或使用「/我的坚果云/Creamu」，或检查当月流量是否超限'
        );
      }
    }

    async function davRequest(method, url, body, headers, timeout) {
      const res = await creamuWdHttp({
        method,
        url,
        headers: authHeaders(headers),
        data: body,
        timeout: timeout || (method === 'PUT' ? 180000 : 60000),
      });
      return res;
    }

    function httpError(res, fallback) {
      const text = res.responseText != null ? String(res.responseText) : '';
      // 坚果云等常返回 HTML/Exception 堆栈，不当作用户可读主文案
      let snippet = text.replace(/\s+/g, ' ').trim();
      if (/IllegalArgument|Exception|stackTrace|<!DOCTYPE|<html/i.test(snippet)) {
        snippet = '';
      } else {
        snippet = snippet.slice(0, 120);
      }
      const msg = snippet || fallback || 'HTTP ' + res.status;
      const err = new Error(msg);
      err.status = res.status;
      err.body = text;
      return err;
    }

    /**
     * 尽力 MKCOL 创建目录。坚果云等对 MKCOL/PROPFIND 不友好，失败不抛错：
     * 真正依赖 PUT（多数服务会自动建中间路径）。
     */
    async function ensureFolder() {
      const st = settings();
      const segments = st.path.split('/').filter(Boolean);
      let acc = '';
      for (const seg of segments) {
        acc = acc ? acc + '/' + seg : seg;
        const url = creamuWdJoinUrl(st.url, acc);
        try {
          const res = await davRequest('MKCOL', url, null, {}, 30000);
          if (res.status >= 200 && res.status < 300) continue;
          // 已存在 / 不允许 / 不支持 都继续，交给后续 PUT
          if (
            res.status === 401 ||
            res.status === 403
          ) {
            // 鉴权问题后面 GET/PUT 再报；此处不提前中断
            continue;
          }
        } catch (_) {
          /* ignore */
        }
      }
    }

    async function downloadVault() {
      const res = await davRequest('GET', vaultUrl(), null, { Accept: 'application/json,text/plain,*/*' }, 120000);
      if (res.status === 404) return null;
      checkDavAuthStatus(res);
      if (res.status < 200 || res.status >= 300) throw httpError(res, '下载失败 HTTP ' + res.status);
      const text = res.responseText != null ? String(res.responseText) : '';
      if (!text.trim()) return null;
      const data = creamuWdSafeJson(text, null);
      if (!data || data.creamu_vault !== 1) {
        if (data && data.payload) return data;
        throw new Error('远端文件不是有效的 Creamu vault');
      }
      return data;
    }

    async function uploadVault(vault) {
      await ensureFolder();
      const body = JSON.stringify(vault);
      const res = await davRequest(
        'PUT',
        vaultUrl(),
        body,
        {
          'Content-Type': 'application/json; charset=utf-8',
        },
        180000
      );
      checkDavAuthStatus(res);
      if (res.status < 200 || res.status >= 300) throw httpError(res, '上传失败 HTTP ' + res.status);
      return true;
    }

    /**
     * 测试连接：与真实同步同一路径（GET vault）。
     * 不用 PROPFIND/HEAD —— 坚果云等常对它们返回 IllegalArgumentException。
     * 200 / 404 均视为连通；再可选做一次小 PUT 写探针不合适，避免污染 vault。
     */
    async function testConnection() {
      if (!isConfigured()) throw new Error('请先填写 WebDAV 地址、用户名和应用密码');
      const res = await davRequest(
        'GET',
        vaultUrl(),
        null,
        { Accept: 'application/json,text/plain,*/*' },
        30000
      );
      checkDavAuthStatus(res);
      // 文件尚未存在也算鉴权与路径可达
      if (res.status === 404 || (res.status >= 200 && res.status < 300)) {
        const m = loadMeta();
        m.tested_ok = true;
        m.last_error = '';
        m.last_action = 'test';
        saveMeta(m);
        notify(res.status === 404 ? 'WebDAV 连接正常（云端尚无 vault，同步时会上传）' : 'WebDAV 连接正常');
        return true;
      }
      // 部分网关对不存在资源返回 409/405 等，再试 PUT 空路径探测成本高；直接报告状态
      throw httpError(res, '测试失败 HTTP ' + res.status + '（同步若正常可忽略测试，或检查路径）');
    }

    function markLocalDirty() {
      const m = loadMeta();
      m.dirty = true;
      m.local_revision = (Number(m.local_revision) || 0) + 1;
      saveMeta(m);
      const st = settings();
      if (st.enabled && st.auto && isConfigured()) {
        retryCount = 0;
        schedulePush(8000);
      }
    }

    function schedulePush(ms) {
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {
        pushTimer = null;
        void syncNow({ reason: 'auto' })
          .then((result) => {
            if (result && result.action === 'busy') schedulePush(2000);
            else retryCount = 0;
          })
          .catch((e) => {
            const m = loadMeta();
            m.last_error = (e && e.message) || String(e);
            saveMeta(m);
            const isAuthOrForbidden =
              (e && (e.status === 401 || e.status === 403)) ||
              /401|403|认证|拒绝|Forbidden/i.test((e && e.message) || '');
            if (!isAuthOrForbidden) {
              retryCount++;
              if (retryCount <= 5) schedulePush(Math.min(60000, 2000 * 2 ** (retryCount - 1)));
            } else {
              retryCount = 0;
            }
          });
      }, ms || 8000);
    }

    async function buildVault(revision) {
      const payload = await host.exportPayload();
      const m = loadMeta();
      return {
        creamu_vault: 1,
        product,
        revision: Number(revision) || 1,
        updated_at: new Date().toISOString(),
        device_id: m.device_id,
        payload,
      };
    }

    async function applyRemote(vault) {
      if (!vault || !vault.payload) throw new Error('远端 vault 无效');
      if (vault.product && vault.product !== product) {
        throw new Error('远端产品不匹配：' + vault.product);
      }
      await host.importPayload(vault.payload);
      const m = loadMeta();
      m.local_revision = Number(vault.revision) || m.local_revision;
      m.remote_revision = Number(vault.revision) || 0;
      m.dirty = false;
      m.last_sync = Date.now();
      m.last_action = 'pull';
      m.last_error = '';
      saveMeta(m);
    }

    /** @param {number} [aboveRevision] 云端当前 revision；上传的 revision 必须比它大 */
    async function pushVault(aboveRevision) {
      const m = loadMeta();
      const floor = Math.max(0, Number(aboveRevision) || 0, Number(m.remote_revision) || 0);
      if ((Number(m.local_revision) || 0) <= floor) {
        m.local_revision = floor + 1;
        saveMeta(m);
      }
      const rev = Math.max(1, Number(m.local_revision) || 1);
      const vault = await buildVault(rev);
      await uploadVault(vault);
      const latest = loadMeta();
      const changedDuringPush = Number(latest.local_revision) > rev;
      latest.dirty = changedDuringPush;
      latest.local_revision = Math.max(rev, Number(latest.local_revision) || 0);
      latest.remote_revision = rev;
      latest.last_sync = Date.now();
      latest.last_action = changedDuringPush ? 'push-pending' : 'push';
      latest.last_error = '';
      saveMeta(latest);
      if (changedDuringPush) schedulePush(1000);
      return vault;
    }

    /**
     * @param {{ reason?: string, force?: 'pull'|'push' }} [opts]
     */
    async function syncNow(opts) {
      opts = opts || {};
      if (busy) return { action: 'busy' };
      if (!isConfigured()) throw new Error('请先填写 WebDAV 地址、用户名和应用密码');
      busy = true;
      try {
        if (opts.force === 'push') {
          let current = null;
          try {
            current = await downloadVault();
          } catch (_) {
            /* 强推不在乎云端内容；鉴权问题由 PUT 报 */
          }
          const m0 = loadMeta();
          m0.dirty = true;
          saveMeta(m0);
          await pushVault(current ? Number(current.revision) || 0 : 0);
          notify('已推送到 WebDAV');
          return { action: 'push' };
        }
        if (opts.force === 'pull') {
          const remote = await downloadVault();
          if (!remote) {
            notify('云端尚无备份，将推送本地');
            await pushVault();
            return { action: 'push' };
          }
          await applyRemote(remote);
          notify('已从 WebDAV 拉取');
          return { action: 'pull' };
        }

        const remote = await downloadVault();
        const m = loadMeta();
        const localRev = Number(m.local_revision) || 0;

        if (!remote) {
          await pushVault();
          notify('云端为空，已上传本地');
          return { action: 'push' };
        }

        const remoteRev = Number(remote.revision) || 0;

        if (m.dirty) {
          // 只看 revision 大小分不清「云端被别的设备推过」：两端都从 rev N 改，都会到 N+1
          const remoteChanged =
            m.remote_revision >= 0
              ? remoteRev !== m.remote_revision
              : remoteRev > localRev || (!!remote.device_id && remote.device_id !== m.device_id);
          if (!remoteChanged) {
            await pushVault(remoteRev);
            notify('已推送到云端 rev ' + loadMeta().local_revision);
            return { action: 'push' };
          }
          const conflict = settings().conflict;
          const keepLocal =
            conflict === 'local' ||
            (conflict === 'ask' &&
              typeof confirm === 'function' &&
              !confirm(
                '云端 rev ' +
                  remoteRev +
                  ' 已被其他设备更新，本机也有未同步修改。\n确定用云端覆盖本机？\n（取消则改为推送本机）'
              ));
          if (keepLocal) {
            await pushVault(remoteRev);
            notify(conflict === 'local' ? '冲突策略：已推送本机' : '已用本机覆盖云端');
            return { action: 'push' };
          }
          await applyRemote(remote);
          notify('已从云端更新到 rev ' + remoteRev);
          return { action: 'pull' };
        }

        if (remoteRev > localRev) {
          await applyRemote(remote);
          notify('已从云端更新到 rev ' + remoteRev);
          return { action: 'pull' };
        }

        if (remoteRev < localRev) {
          await pushVault(remoteRev);
          notify('已推送到云端 rev ' + loadMeta().local_revision);
          return { action: 'push' };
        }

        m.last_sync = Date.now();
        m.last_action = 'noop';
        m.last_error = '';
        saveMeta(m);
        if (opts.reason !== 'auto') notify('已与云端一致');
        return { action: 'noop' };
      } catch (e) {
        const m = loadMeta();
        m.last_error = (e && e.message) || String(e);
        saveMeta(m);
        throw e;
      } finally {
        busy = false;
      }
    }


    async function bootSync() {
      const st = settings();
      if (!st.enabled || !st.auto || !isConfigured()) return null;
      const m = loadMeta();
      const lastSync = Number(m.last_sync) || 0;
      // 开页冷却保护：10分钟内开过同步且本地不脏，则跳过开页拉取，防连续开标签页浪费流量
      if (!m.dirty && lastSync && Date.now() - lastSync < 10 * 60 * 1000) {
        return { action: 'noop', reason: 'cooldown' };
      }
      try {
        return await syncNow({ reason: 'boot' });
      } catch (e) {
        console.warn('[Creamu WD] boot sync', e);
        return { action: 'error', error: e };
      }
    }

    return {
      product,
      vaultRelPath,
      vaultUrl,
      statusText,
      isConfigured,
      isConnected,
      testConnection,
      markLocalDirty,
      schedulePush,
      syncNow,
      bootSync,
      loadMeta,
      settings,
    };
  }
// 30-media-parser.js

/**
 * 缓存被拦截和提取到的媒体直链信息
 */
if (typeof window !== 'undefined') {
  window.__creamu_hj_media_cache = window.__creamu_hj_media_cache || {
    videos: [],
    images: [],
    rawUrls: new Set()
  };
  window.__creamu_hj_network_log = window.__creamu_hj_network_log || [];
}

let currentHjSelectedVideoIndex = 0;

/** 海角换帖不刷新页面。地址缓存只增不减时，同一用户的下一帖会接着播上一帖。 */
function hjPostIdentity() {
  const href = String((typeof location !== 'undefined' && location.href) || '');
  const fromUrl = href.match(/\/(?:post|topic|detail|article)\/(\d+)/i);
  if (fromUrl) return fromUrl[1];
  return href.split('#')[0];
}

function resetHjMediaForPost(identity) {
  const cache = window.__creamu_hj_media_cache;
  if (!cache) return;
  cache.videos = [];
  if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    cache.images.forEach((url) => {
      if (String(url).startsWith('blob:')) URL.revokeObjectURL(url);
    });
  }
  cache.images = [];
  cache.rawUrls = new Set();
  cache.postIdentity = identity;
  currentHjSelectedVideoIndex = 0;
  if (typeof window !== 'undefined') window.__creamu_hj_images_pid = '';
  const box = typeof document !== 'undefined' ? document.getElementById('creamu-hj-inline-player-box') : null;
  if (box) box.removeAttribute('data-video-url');
  const images = typeof document !== 'undefined' ? document.getElementById('creamu-hj-image-box') : null;
  if (images) {
    images.innerHTML = '';
    if (images.dataset) delete images.dataset.images;
  }
  hjDebug('换帖，清空 ' + identity);
}

/**
 * 格式化时间 (秒 -> mm:ss 或 hh:mm:ss)
 */
function formatHjTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(r)}`;
  return `${pad(m)}:${pad(r)}`;
}

/**
 * 在屏幕中央显示微型手势 HUD 提示
 */
function showHjSeekHud(text) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
  let hud = document.getElementById('hj-seek-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'hj-seek-hud';
    document.documentElement.appendChild(hud);
  }
  hud.textContent = text;
  hud.classList.add('is-active');

  if (hud._hideTimer) clearTimeout(hud._hideTimer);
  hud._hideTimer = setTimeout(() => {
    hud.classList.remove('is-active');
  }, 800);
}

/**
 * 动态引入 Hls.js 脚本兜底（防止浏览器将其当成文件下载）
 */
function ensureHlsJsLoaded(callback) {
  if (typeof window === 'undefined') return;
  if (typeof window.Hls === 'function') {
    if (callback) callback();
    return;
  }
  let script = document.getElementById('creamu-hj-hls-script');
  if (!script) {
    script = document.createElement('script');
    script.id = 'creamu-hj-hls-script';
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
    script.onload = () => { if (callback) callback(); };
    (document.head || document.documentElement).appendChild(script);
  } else if (callback) {
    script.addEventListener('load', () => { callback(); }, { once: true });
  }
}

/** 分片地址经常是相对路径，拼回播放列表所在目录。 */
function resolveHjMediaUrl(base, raw) {
  const value = String(raw || '').trim();
  if (!value || value.startsWith('data:')) return '';
  try {
    return new URL(value, base).href;
  } catch (_) {
    return '';
  }
}

function hjDebug(line) {
  const log = window.__creamu_hj_debug || (window.__creamu_hj_debug = []);
  log.push(new Date().toLocaleTimeString() + ' ' + line);
  if (log.length > 40) log.shift();
  const box = typeof document !== 'undefined' ? document.getElementById('creamu-hj-debug') : null;
  if (box) box.textContent = log.join('\n');
}

function copyHjDebug() {
  const log = (window.__creamu_hj_debug || []).join('\n');
  const cache = window.__creamu_hj_media_cache || { videos: [] };
  const text = '地址:\n' + (cache.videos.join('\n') || '无') + '\n\n过程:\n' + (log || '无');
  if (typeof GM_setClipboard === 'function') GM_setClipboard(text);
  else if (navigator.clipboard) navigator.clipboard.writeText(text);
}

/** 油猴对二进制的返回不一致：可能是 ArrayBuffer，也可能是 blob，还可能是按 Latin-1 转过的字符串。统一还原成字节。 */
function gmHjBytes(response) {
  return new Promise((resolve) => {
    const data = response && (response.response != null ? response.response : response.responseText);
    if (data == null) {
      resolve(null);
      return;
    }
    if (Object.prototype.toString.call(data) === '[object ArrayBuffer]') {
      resolve(data);
      return;
    }
    if (typeof data.byteLength === 'number' && typeof data.buffer !== 'undefined' && data.buffer !== data) {
      resolve(data.buffer.slice(data.byteOffset || 0, (data.byteOffset || 0) + data.byteLength));
      return;
    }
    if (typeof data.arrayBuffer === 'function') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsArrayBuffer(data);
      return;
    }
    if (typeof data === 'string') {
      const bytes = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i += 1) bytes[i] = data.charCodeAt(i) & 0xff;
      resolve(bytes.buffer);
      return;
    }
    resolve(null);
  });
}

function gmHjRequest(url, responseType, headers) {
  return new Promise((resolve) => {
    if (typeof GM_xmlhttpRequest !== 'function') {
      resolve(null);
      return;
    }
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      headers: headers || {},
      responseType: responseType || 'text',
      timeout: 20000,
      onload: (response) => {
        hjDebug('请求 ' + (response.status || '?') + ' ' + url.slice(0, 90));
        resolve(response);
      },
      onerror: () => {
        hjDebug('请求失败 ' + url.slice(0, 90));
        resolve(null);
      },
      ontimeout: () => {
        hjDebug('请求超时 ' + url.slice(0, 90));
        resolve(null);
      },
    });
  });
}

/**
 * 分片是 MPEG-TS，拼成一个文件后手机浏览器报 code=4。
 * 交给 Hls.js 转封装，分片请求仍然走油猴，避开 CDN 跨域。
 */
/** 海角的 enc.key 不是解密密钥。页面 /js/jquery.js 里的 jquery_key 用同名 .jpg 把它变掉。 */
function loadHjSiteKeyModule() {
  if (window.__creamu_hj_key_module) return window.__creamu_hj_key_module;
  window.__creamu_hj_key_module = new Promise((resolve) => {
    const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
    const ready = () => typeof pageWindow.createModule === 'function';
    const finish = () => {
      if (!ready()) {
        resolve(null);
        return;
      }
      Promise.resolve(pageWindow.createModule()).then(resolve).catch(() => resolve(null));
    };
    if (ready() || typeof document.createElement !== 'function') {
      finish();
      return;
    }
    const script = document.createElement('script');
    script.src = location.origin + '/js/jquery.js';
    script.onload = finish;
    script.onerror = () => resolve(null);
    (document.head || document.documentElement).appendChild(script);
    setTimeout(() => {
      if (!ready()) resolve(null);
    }, 4000);
  });
  return window.__creamu_hj_key_module;
}

function transformHjAesKey(mod, rawKey, jpgKey) {
  const key = rawKey instanceof Uint8Array ? rawKey : new Uint8Array(rawKey);
  const keyPtr = mod._malloc(key.length);
  const jpgPtr = mod._malloc(jpgKey.length);
  try {
    mod.HEAPU8.set(key, keyPtr);
    mod.HEAPU8.set(jpgKey, jpgPtr);
    mod.ccall('jquery_key', null, ['number', 'number', 'number', 'number'], [keyPtr, key.length, jpgPtr, jpgKey.length]);
    return new Uint8Array(mod.HEAPU8.buffer, keyPtr, key.length).slice();
  } finally {
    try { mod._free(keyPtr); } catch (_) {}
    try { mod._free(jpgPtr); } catch (_) {}
  }
}

function loadHjM3u8WithGm(video, playlistUrl, onStatus) {
  // Hls 解析完列表后会读 performance.now()。油猴沙箱里没有它，解析完就抛 internalException。
  if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
    window.performance = { now: () => Date.now() };
  }
  const start = () => {
    if (typeof window.Hls !== 'function' || !window.Hls.isSupported()) {
      hjDebug('Hls 不可用');
      if (onStatus) onStatus('播放器组件没加载');
      return;
    }
    if (video._hjHls) {
      try { video._hjHls.destroy(); } catch (_) {}
    }
    const loader = function () {};
    loader.prototype.load = function (context, config, callbacks) {
      let url = context.url;
      if (/\.key($|\?)/i.test(url)) {
        let kversion = '';
        try {
          const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
          const cfg = JSON.parse(pageWindow.sessionStorage.getItem('config') || '{}');
          kversion = cfg && cfg.kversion != null ? String(cfg.kversion) : '';
        } catch (_) {}
        if (kversion) url = url.replace('.key', '.key' + kversion);
      }
      const wantsText = !context.responseType || context.responseType === 'text';
      const started = Date.now();
      const headers = {};
      if (Number.isFinite(context.rangeStart) && Number.isFinite(context.rangeEnd)) {
        headers.Range = 'bytes=' + context.rangeStart + '-' + (context.rangeEnd - 1);
      }
      const fail = (text) => {
        const now = Date.now();
        callbacks.onError({ code: 0, text }, context, null, this.stats);
        this.stats.loading.end = now;
      };
      gmHjRequest(url, wantsText ? 'text' : 'arraybuffer', headers).then((response) => {
        if (!response) {
          fail('请求失败');
          return;
        }
        const finish = (data) => {
        if (data == null || data === '') {
          fail('空响应');
          return;
        }
        const len = typeof data === 'string' ? data.length : data.byteLength || 0;
        const now = Date.now();
        this.stats.loaded = len;
        this.stats.total = len;
        this.stats.chunkCount = 1;
        this.stats.loading.end = now;
        let head = '';
        if (!wantsText && data instanceof ArrayBuffer) {
          head = ' ' + [...new Uint8Array(data).slice(0, 4)].map((b) => b.toString(16).padStart(2, '0')).join('');
        }
        hjDebug((wantsText ? '列表 ' : '分片 ') + len + head + ' ' + url.slice(0, 70));
        callbacks.onSuccess({ url, data }, this.stats, context, response);
        };
        if (wantsText) finish(String(response.responseText || response.response || ''));
        else gmHjBytes(response).then(finish);
      }).catch((error) => fail(String(error && error.message || error)));
    };
    loader.prototype.abort = function () {};
    loader.prototype.destroy = function () {};
    // Hls 拉分片前把 loader.stats 记到分片上。没有这份对象就会读到 undefined.retry。
    Object.defineProperty(loader.prototype, 'stats', {
      get() {
        if (!this._stats) {
          const now = Date.now();
          this._stats = {
            aborted: false, loaded: 0, total: 0, retry: 0, chunkCount: 0, bwEstimate: 0,
            loading: { start: now, first: now, end: 0 },
            parsing: { start: 0, end: 0 },
            buffering: { start: 0, first: 0, end: 0 },
          };
        }
        return this._stats;
      },
    });
    const hls = new window.Hls({
      enableWorker: false,
      loader,
    });
    video._hjHls = hls;
    hls.on(window.Hls.Events.ERROR, (_, info) => {
      const reason = info.error && (info.error.message || info.error.name || String(info.error));
      hjDebug('Hls ' + info.type + ' ' + info.details + (reason ? ' ' + reason : ''));
      if (info.fatal && onStatus) onStatus('Hls 失败 ' + info.details);
    });
    hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
      hjDebug('播放列表已解析');
      if (onStatus) onStatus('');
      const play = video.play();
      if (play && typeof play.catch === 'function') play.catch(() => {});
    });
    const jpgUrl = String(playlistUrl).replace(/\.m3u8($|\?)/i, '.jpg$1');
    Promise.all([loadHjSiteKeyModule(), gmHjRequest(jpgUrl, 'text')]).then(([mod, jpgResponse]) => {
      const jpgText = String((jpgResponse && (jpgResponse.responseText || jpgResponse.response)) || '').trim();
      if (!mod || !jpgText) {
        hjDebug('站点密钥模块不可用');
        return;
      }
      let jpgKey = null;
      try {
        const bin = atob(jpgText);
        jpgKey = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i += 1) jpgKey[i] = bin.charCodeAt(i) & 0xff;
      } catch (_) {
        hjDebug('jpg 材料不是 base64');
        return;
      }
      let realKey = null;
      hls.on(window.Hls.Events.KEY_LOADED, (_, data) => {
        const decryptdata = data && data.frag && data.frag.decryptdata;
        if (!decryptdata || !decryptdata.key) return;
        try {
          if (!realKey) realKey = transformHjAesKey(mod, decryptdata.key, jpgKey);
          decryptdata.key = realKey;
          hjDebug('密钥已变换 ' + realKey.length);
        } catch (error) {
          hjDebug('密钥变换失败 ' + (error && error.message || error));
        }
      });
      hjDebug('jpg 材料 ' + jpgKey.length);
    });
    hls.loadSource(playlistUrl);
    hls.attachMedia(video);
    hjDebug('交给 Hls');
  };
  if (typeof window.Hls === 'function') start();
  else ensureHlsJsLoaded(start);
}

/**
 * 在画面上左右拖动拉进度。拖动距离按画面宽度折成整段时长。
 */
function enableHjVideoGestureSeek(video, surface) {
  const target = surface || video;
  if (!video || !target || target._creamu_hj_gesture_bound) return;
  target._creamu_hj_gesture_bound = true;

  let tracking = false;
  let startX = 0;
  let startTime = 0;
  const point = (event) => (event.touches && event.touches[0]) || event;

  const onStart = (event) => {
    if (event.target && event.target.closest && event.target.closest('button, input')) return;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    const p = point(event);
    tracking = true;
    startX = p.clientX;
    startTime = video.currentTime || 0;
  };
  const onMove = (event) => {
    if (!tracking) return;
    const p = point(event);
    const dx = p.clientX - startX;
    if (Math.abs(dx) < 6) return;
    if (event.cancelable) event.preventDefault();
    const width = Math.max(target.clientWidth || window.innerWidth || 320, 160);
    const targetTime = Math.max(0, Math.min(video.duration, startTime + (dx / width) * video.duration));
    video.currentTime = targetTime;
    showHjSeekHud(formatHjTime(targetTime) + ' / ' + formatHjTime(video.duration));
  };
  const onEnd = () => { tracking = false; };

  target.addEventListener('touchstart', onStart, { passive: true });
  target.addEventListener('touchmove', onMove, { passive: false });
  target.addEventListener('touchend', onEnd, { passive: true });
  target.addEventListener('touchcancel', onEnd, { passive: true });
  target.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);
}

/**
 * 校验 URL 是否为真正的视频直链 (严格防误判)
 */
function isRealVideoUrl(url) {
  if (typeof url !== 'string' || !url || url.length < 10) return false;

  // 1. 过滤静态资源、代码文件及通用接口
  if (/\.(js|css|json|html|ts|map|png|jpg|jpeg|gif|webp|svg|ico)($|\?|#)/i.test(url) && !/\.(m3u8|mp4|mov|flv)($|\?|#)/i.test(url)) {
    return false;
  }

  if (/\/api\/(banner|login|captcha|favorite|comment|like|folderList|conf|isNeed)/i.test(url)) {
    return false;
  }

  // 带后缀的是片源。/hls/、/vod/、/m3u8/ 这种没后缀的也是播放地址，海角经常只给这种。
  // /video/ 太宽，接口、封面都会撞上，不收。
  const hasVideoExt = /\.(m3u8|mp4|mov|flv|webm)($|\?|#)/i.test(url);
  const hasStreamPath = /\/(hls|vod|m3u8|playlist)\//i.test(url);
  return hasVideoExt || hasStreamPath;
}

/** 带播放列表后缀的优先。没后缀的流地址放后面，分片列表放最后。 */
function hjVideoPlayRank(url) {
  const value = String(url || '').toLowerCase();
  if (/\/seg[-_]|\d+\.ts($|\?)/.test(value)) return 4;
  if (value.includes('.m3u8') && /\/(index|playlist|master)[^/]*\.m3u8($|\?|#)/.test(value)) return 0;
  if (/\.m3u8($|\?|#)/.test(value)) return 3;
  if (/\.(mp4|mov|flv|webm)($|\?|#)/.test(value)) return 1;
  return 2;
}

/**
 * 校验 URL 是否为真正的图片直链
 */
const HJ_IMG_ALPHABET = 'ABCD*EFGHIJKLMNOPQRSTUVWX#YZabcdefghijklmnopqrstuvwxyz1234567890';

/** 与站点 app.js function w 一致：+/ 换成 *#，再按 UTF-8 还原。 */
function decodeHjImageCipher(value) {
  const alphabet = HJ_IMG_ALPHABET;
  const text = String(value || '').replace(/[^A-Za-z0-9*#]/g, '');
  if (text.length < 8) return '';
  let binary = '';
  for (let index = 0; index < text.length;) {
    let a = alphabet.indexOf(text.charAt(index++));
    let b = alphabet.indexOf(text.charAt(index++));
    let c = alphabet.indexOf(text.charAt(index++));
    let d = alphabet.indexOf(text.charAt(index++));
    if (a < 0) a = 0;
    if (b < 0) b = 0;
    if (c < 0) c = 64;
    if (d < 0) d = 64;
    binary += String.fromCharCode((a << 2) | (b >> 4));
    if (c !== 64) binary += String.fromCharCode(((15 & b) << 4) | (c >> 2));
    if (d !== 64) binary += String.fromCharCode(((3 & c) << 6) | d);
  }
  let out = '';
  for (let index = 0; index < binary.length;) {
    const lead = binary.charCodeAt(index);
    if (lead < 128) {
      out += String.fromCharCode(lead);
      index += 1;
    } else if (lead > 191 && lead < 224) {
      out += String.fromCharCode(((31 & lead) << 6) | (63 & binary.charCodeAt(index + 1)));
      index += 2;
    } else {
      out += String.fromCharCode(((15 & lead) << 12) | ((63 & binary.charCodeAt(index + 1)) << 6) | (63 & binary.charCodeAt(index + 2)));
      index += 3;
    }
  }
  return out;
}

function hjImageBytesFromBase64(value) {
  let text = String(value || '').replace(/[\s\u0000-\u001f]+/g, '').replace(/\*/g, '+').replace(/#/g, '/');
  text = text.replace(/[^A-Za-z0-9+/=]/g, '');
  if (!text || typeof atob !== 'function') return null;
  const mod = text.length % 4;
  if (mod) text += '===='.slice(mod);
  try {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i) & 0xff;
    return bytes;
  } catch (_) {
    return null;
  }
}

function hjImageMime(bytes) {
  if (!bytes || bytes.length < 3) return '';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return 'image/bmp';
  return '';
}

function hjBytesToImageUrl(bytes, mime) {
  if (typeof Blob === 'function' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  }
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return 'data:' + mime + ';base64,' + btoa(binary);
}

/** 附件文件解开后是 data:image/...;base64。魔数不对就丢掉，避免把密文当图片贴上。 */
function hjImageDataUrl(text) {
  const decoded = decodeHjImageCipher(text);
  const source = /base64,/i.test(decoded) ? decoded : (/^data:/i.test(String(text || '').trim()) ? String(text).trim() : '');
  const matched = source.match(/^data:([^;:,]+)?(?:;charset=[^;,]+)?;base64,([\s\S]+)$/i);
  if (!matched) return '';
  const bytes = hjImageBytesFromBase64(matched[2]);
  const mime = hjImageMime(bytes);
  if (!mime || bytes.length < 24) return '';
  return hjBytesToImageUrl(bytes, mime);
}

function hjTopicImageAttachments(topic) {
  const attachments = topic && Array.isArray(topic.attachments) ? topic.attachments : [];
  return attachments.filter((item) => {
    if (!item) return false;
    const category = String(item.category || item.type || '').toLowerCase();
    const remote = String(item.remoteUrl || item.url || '');
    if (/video|m3u8|audio|mp3|sound/.test(category)) return false;
    return /image|img|photo|pic|cover/.test(category) || /\.(jpe?g|png|gif|webp|bmp)(\.txt)?([?#]|$)/i.test(remote);
  });
}

function ensureHjImageSlot() {
  const slotted = typeof ensureHjInlineSlot === 'function' ? ensureHjInlineSlot() : null;
  if (slotted) return slotted;
  if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return null;
  const existing = document.getElementById('creamu-hj-inline-slot');
  if (existing) return existing;
  const button = Array.from(document.querySelectorAll('button')).find((el) => {
    return String(el.textContent || '').replace(/\s+/g, '') === '点击展开完整贴文';
  });
  const anchor = button && (button.parentElement || button);
  if (!anchor || !anchor.parentElement || typeof document.createElement !== 'function') return null;
  const slot = document.createElement('div');
  slot.id = 'creamu-hj-inline-slot';
  slot.style.cssText = 'display:block;width:100%;margin:8px 0;';
  anchor.parentElement.insertBefore(slot, anchor);
  return slot;
}

function renderHjUnlockedImages() {
  const cache = window.__creamu_hj_media_cache;
  if (!cache || !cache.images.length || typeof document === 'undefined') return;
  const slot = ensureHjImageSlot();
  if (!slot) return;
  let box = document.getElementById('creamu-hj-image-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'creamu-hj-image-box';
    box.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px;';
    slot.appendChild(box);
  }
  const current = cache.images.join('\n');
  if (box.dataset.images === current) return;
  box.dataset.images = current;
  box.innerHTML = '';
  cache.images.forEach((url) => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.style.cssText = 'width:100%;height:auto;border-radius:12px;background:#fffaf6;';
    box.appendChild(img);
  });
}

async function unlockHjHiddenImages(topic) {
  const cache = window.__creamu_hj_media_cache;
  const attachments = hjTopicImageAttachments(topic);
  if (!cache || !attachments.length) return 0;
  const before = cache.images.length;
  for (const item of attachments) {
    const remote = tryNormalizeHjMediaUrl(String(item.remoteUrl || item.url || ''));
    if (!remote || cache.rawUrls.has('image:' + remote)) continue;
    const response = await gmHjRequest(remote, 'arraybuffer');
    const buffer = response ? await gmHjBytes(response) : null;
    if (!buffer) continue;
    const bytes = new Uint8Array(buffer);
    const mime = hjImageMime(bytes);
    const url = mime && bytes.length > 100 ? hjBytesToImageUrl(bytes, mime) : hjImageDataUrl(new TextDecoder('utf-8').decode(bytes));
    if (!url) continue;
    cache.rawUrls.add('image:' + remote);
    cache.images.push(url);
  }
  renderHjUnlockedImages();
  return cache.images.length - before;
}

function isRealImageUrl(url) {
  if (typeof url !== 'string' || !url || url.length < 10) return false;
  if (isRealVideoUrl(url)) return false;
  return /\.(jpg|jpeg|png|webp|gif)($|\?|#)/i.test(url);
}

/**
 * 深度智能规范化媒体 URL：支持绝对路径、各类无斜杠相对路径、Base64 解码与转义字符
 */
function tryNormalizeHjMediaUrl(rawStr) {
  if (typeof rawStr !== 'string') return '';
  let str = rawStr.trim();
  if (!str || str.length < 3) return '';

  // 1. 去除首尾引号及 JSON 转义
  str = str.replace(/^["']|["']$/g, '').replace(/\\\/|\\u002[fF]/g, '/');

  // 2. URL 解编码与反转义
  try {
    if (str.includes('%2F') || str.includes('%3A')) {
      str = decodeURIComponent(str);
    }
  } catch (_) {}

  // 3. 解码 Base64 编码字符串
  if (str.startsWith('aHR0cHM6Ly9') || str.startsWith('aHR0cDovLw') || str.startsWith('aHR0c')) {
    try {
      if (typeof atob === 'function') {
        const decoded = atob(str);
        if (decoded.startsWith('http') || decoded.startsWith('/') || decoded.includes('.m3u8')) str = decoded;
      }
    } catch (_) {}
  }

  // 4. 补全协议相对路径 (//cdn.com/...)
  if (str.startsWith('//')) {
    const proto = (typeof location !== 'undefined' && location.protocol) ? location.protocol : 'https:';
    return proto + str;
  }

  // 5. 绝对路径直接返回
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }

  // 6. 补全相对路径
  const isMediaLike = /\.(m3u8|mp4|mov|flv|jpg|jpeg|png|webp|gif)/i.test(str) ||
                     /(?:upload|video|attachment|play|hls|media|vod)\//i.test(str);
                     
  if (isMediaLike) {
    const origin = (typeof location !== 'undefined' && location.origin) ? location.origin : '';
    if (str.startsWith('/')) {
      return origin + str;
    }
    return origin + '/' + str;
  }

  return '';
}

/**
 * 拦截与解析接口 API 响应中的媒体数据 (XHR & Fetch Hook)
 */
function initHjNetworkInterceptor() {
  if (typeof window === 'undefined' || window.__creamu_hj_interceptor_injected) return;
  window.__creamu_hj_interceptor_injected = true;

  // 页面自己的请求跑在页面窗口里。油猴的 isolated world 看到的 fetch 不是那一份。
  const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;

  const logNet = (url, bodySnippet = '') => {
    try {
      const netLog = window.__creamu_hj_network_log || [];
      if (netLog.length > 50) netLog.shift();
      netLog.push({ url: String(url), time: new Date().toLocaleTimeString(), snippet: bodySnippet.slice(0, 300) });
      console.log('[Creamu Hook]', url);
    } catch (_) {}
  };

  const handleResponseText = (url, text) => {
    if (!text || typeof text !== 'string') return;
    logNet(url, text);

    // 1. 全字符串正则提取
    parseHjMediaFromString(text);

    // 2. 如果是 JSON，进行结构化递归提取
    try {
      const data = JSON.parse(text);
      parseHjMediaFromData(data);
    } catch (_) {}
  };

  // 1. Hook Fetch
  const originalFetch = pageWindow.fetch;
  if (typeof originalFetch === 'function') {
    pageWindow.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      try {
        const url = args[0] ? (typeof args[0] === 'string' ? args[0] : args[0].url) : '';
        const clone = response.clone();
        clone.text().then((text) => {
          handleResponseText(url, text);
        }).catch(() => {});
      } catch (_) {}
      return response;
    };
  }

  // 2. Hook XMLHttpRequest
  const PageXHR = pageWindow.XMLHttpRequest || XMLHttpRequest;
  const originalOpen = PageXHR.prototype.open;
  const originalSend = PageXHR.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._hj_url = url;
    return originalOpen.apply(this, [method, url, ...rest]);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', function () {
      try {
        if (this.responseText) {
          handleResponseText(this._hj_url || '', this.responseText);
        }
      } catch (_) {}
    });
    return originalSend.apply(this, args);
  };
}

/**
 * 精准字符串提取 (严格限制为真实 m3u8 / mp4 视频及图片)
 */
function parseHjMediaFromString(text) {
  if (typeof text !== 'string' || !text) return;
  const cache = window.__creamu_hj_media_cache;

  // 1. 解压缩 JSON 转义斜杠
  let cleanText = text
    .replace(/\\\/|\\u002[fF]/g, '/')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#x2F;/gi, '/');

  // 2. 正则查找 Base64 编码并尝试解码
  cleanText = cleanText.replace(/aHR0c[A-Za-z0-9+/=]{20,}/g, (b64) => {
    try {
      if (typeof atob === 'function') {
        const decoded = atob(b64);
        if (decoded.includes('http') || decoded.includes('/') || decoded.includes('.m3u8')) {
          return decoded;
        }
      }
    } catch (_) {}
    return b64;
  });

  // 3. 精确搜索视频与图片 URL
  const mediaRegexes = [
    // 显式 http(s) URL
    /https?:\/\/[^\s"'<>\\]+?\.(?:m3u8|mp4|mov|flv|jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>\\]*)?/gi,
    // 包含 hls / video / upload / vod 关键词的媒体路径
    /(?:https?:\/\/[^\s"'<>\\]+|\/?(?:upload|video|hls|vod)\/)[^\s"'<>\\]+?\.(?:m3u8|mp4|mov|flv)(?:\?[^\s"'<>\\]*)?/gi,
    // 海角的播放地址经常没有后缀，只挂在 /hls/、/vod/、/playlist/ 下面
    /https?:\/\/[^\s"'<>\\]+?\/(?:hls|vod|m3u8|playlist)\/[^\s"'<>\\]+/gi
  ];

  let added = false;
  for (const regex of mediaRegexes) {
    let match;
    while ((match = regex.exec(cleanText)) !== null) {
      const raw = match[0];
      const url = tryNormalizeHjMediaUrl(raw);
      if (url && url.length > 8 && !cache.rawUrls.has(url)) {
        if (isRealVideoUrl(url)) {
          cache.rawUrls.add(url);
          if (!cache.videos.includes(url)) cache.videos.push(url);
          cache.videos.sort((a, b) => hjVideoPlayRank(a) - hjVideoPlayRank(b));
          added = true;
        } else if (isRealImageUrl(url)) {
          cache.rawUrls.add(url);
          if (!cache.images.includes(url)) cache.images.push(url);
          added = true;
        }
      }
    }
  }

  if (added) {
    scheduleHjMediaUpdate();
  }
}

/**
 * 从 JSON 对象中递归查找视频与图片 (全泛型结构递归扫描)
 */
function parseHjMediaFromData(obj) {
  if (!obj || typeof obj !== 'object') return;
  const cache = window.__creamu_hj_media_cache;
  let added = false;

  const checkString = (rawStr, keyHint = '') => {
    if (typeof rawStr !== 'string') return;
    
    // 如果长字符串包含 HTML 或多个字符，先跑全字符串正则提取
    if (rawStr.length > 30 || rawStr.includes('<') || rawStr.includes('http') || rawStr.includes('/')) {
      parseHjMediaFromString(rawStr);
    }

    const url = tryNormalizeHjMediaUrl(rawStr);
    if (!url || url.length < 8) return;
    if (cache.rawUrls.has(url)) return;

    if (isRealVideoUrl(url)) {
      cache.rawUrls.add(url);
      if (!cache.videos.includes(url)) cache.videos.push(url);
      cache.videos.sort((a, b) => hjVideoPlayRank(a) - hjVideoPlayRank(b));
      added = true;
    } else if (isRealImageUrl(url)) {
      cache.rawUrls.add(url);
      if (!cache.images.includes(url)) cache.images.push(url);
      added = true;
    }
  };

  const traverse = (item, parentKey = '') => {
    if (!item) return;
    if (typeof item === 'string') {
      checkString(item, parentKey);
    } else if (Array.isArray(item)) {
      item.forEach((el) => traverse(el, parentKey));
    } else if (typeof item === 'object') {
      for (const key in item) {
        if (Object.prototype.hasOwnProperty.call(item, key)) {
          traverse(item[key], key);
        }
      }
    }
  };

  traverse(obj);
  if (added) {
    scheduleHjMediaUpdate();
  }
}

/**
 * 从全局状态变量及 DOM 节点深度扫描
 */
function parseHjHiddenMediaFromGlobals() {
  const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
  const cache = window.__creamu_hj_media_cache || { videos: [], images: [], rawUrls: new Set() };
  
  const globals = [pageWindow.__INITIAL_STATE__, pageWindow.__NUXT__, pageWindow.detailData, pageWindow.postData, pageWindow.$video, pageWindow.videoInfo, pageWindow.playData, pageWindow.topicData];
  globals.forEach((g) => {
    if (g) parseHjMediaFromData(g);
  });

  if (typeof document !== 'undefined') {
    // 1. 扫描脚本
    const scripts = document.querySelectorAll('script:not([src])');
    scripts.forEach((script) => {
      parseHjMediaFromString(script.textContent || '');
    });

    // 2. 扫描 video / source 节点
    const videoElements = document.querySelectorAll('video, video source, audio source');
    videoElements.forEach((v) => {
      const src = v.getAttribute('src') || v.src;
      if (src) {
        const normalized = tryNormalizeHjMediaUrl(src);
        if (normalized && isRealVideoUrl(normalized)) parseHjMediaFromData({ url: normalized });
      }
    });

    // 3. 扫描 dataset 节点
    const nodes = document.querySelectorAll('[data-src], [data-video], [data-url], [data-original], [data-hls], [data-play-url], [data-m3u8]');
    nodes.forEach((el) => {
      ['data-src', 'data-video', 'data-url', 'data-original', 'data-hls', 'data-play-url', 'data-m3u8'].forEach((attr) => {
        const val = el.getAttribute(attr);
        if (val) {
          const normalized = tryNormalizeHjMediaUrl(val);
          if (normalized && isRealVideoUrl(normalized)) parseHjMediaFromData({ url: normalized });
        }
      });
    });
  }

  return {
    videos: cache.videos,
    images: cache.images
  };
}

/**
 * 校验节点是否属于顶部导航栏、页脚或侧栏
 */
function isHeaderOrNav(el) {
  if (!el) return true;
  let cur = el;
  while (cur && cur !== document.body && cur !== document.documentElement) {
    const className = String(cur.className || '').toLowerCase();
    const id = String(cur.id || '').toLowerCase();
    const tagName = String(cur.tagName || '').toLowerCase();
    if (
      className.includes('nav') || className.includes('header') || className.includes('tabbar') ||
      className.includes('head') || className.includes('topbar') || className.includes('footer') ||
      id.includes('nav') || id.includes('header') || id.includes('head') ||
      tagName === 'header' || tagName === 'nav' || tagName === 'footer'
    ) {
      return true;
    }
    cur = cur.parentElement;
  }
  return false;
}

/**
 * 手机版帖子的 class 会换，不能只认一组写死的名字。
 * 从付费墙、封面、正文这些真实节点往上收，收到一块够大、又不是导航的容器。
 */
function findHjPostMediaContainer() {
  if (typeof document === 'undefined') return null;

  const knownSelectors = [
    '.topic-detail', '.topic_detail', '.post-detail', '.post_detail',
    '.detail-content', '.detail_content', '.post-content', '.post_content',
    '.article-body', '.pay-box', '.attachment-box', '.video-player',
    '.video-box', '.post-media', '.media-wrapper',
    '.topic-content', '.topic_content', '.detail-body', '.article-content',
    '.content-body', '.rich-text', '.ql-editor'
  ];
  for (const selector of knownSelectors) {
    const el = document.querySelector(selector);
    if (el && isHjPostMount(el)) return el;
  }

  const seeds = [];
  document.querySelectorAll('button, a, div, span, p').forEach((el) => {
    const text = String(el.textContent || '').replace(/\s+/g, '');
    if (text && text.length <= 24 && /解锁|付费|购买|立即看|金币/.test(text)) seeds.push(el);
  });
  document.querySelectorAll('video, img, [class*="cover"], [class*="poster"], [class*="blur"]').forEach((el) => {
    if (el && el.nodeType === 1) seeds.push(el);
  });

  // 种子本身常是按钮或封面。播放器要挂在包住它的帖子上，所以从父节点开始收。
  let best = null;
  let bestArea = Infinity;
  const seen = new Set();
  for (const seed of seeds) {
    let cur = seed.parentElement;
    for (let depth = 0; cur && depth < 8; depth += 1) {
      if (!seen.has(cur) && isHjPostMount(cur)) {
        seen.add(cur);
        const rect = cur.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (area < bestArea) {
          best = cur;
          bestArea = area;
        }
        break;
      }
      cur = cur.parentElement;
    }
  }
  return best;
}

function isHjPostMount(el) {
  if (!el || el === document.body || el === document.documentElement) return false;
  if (el.id === 'app' || el.id === '__nuxt' || el.id === 'root') return false;
  if (isHeaderOrNav(el)) return false;
  const className = String(el.className || '');
  if (className.includes('creamu-hj')) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 100 && rect.height > 30;
}

/**
 * 播放器贴在帖子正文前面，跟着帖子滚动。
 * 帖子被页面重绘清掉时，由定时器把同一块播放器挪回去，不拆掉重做。
 */
function ensureHjInlineSlot() {
  const anchor = findHjPostMediaContainer();
  if (!anchor || !anchor.parentElement) return null;
  let slot = document.getElementById('creamu-hj-inline-slot');
  if (!slot) {
    slot = document.createElement('div');
    slot.id = 'creamu-hj-inline-slot';
  }
  slot.style.cssText = 'display:block;width:100%;margin:8px 0;';
  if (slot.parentElement !== anchor.parentElement || slot.nextElementSibling !== anchor) {
    anchor.parentElement.insertBefore(slot, anchor);
  }
  return slot;
}

/**
 * 全局 HTML5 视频播放弹窗 (保底 100% 浮层播放)
 */
function openHjModalPlayer(videoUrl) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
  if (!videoUrl) return;

  let modal = document.getElementById('creamu-hj-modal-player');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'creamu-hj-modal-player';
    document.body.appendChild(modal);
  }

  modal.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background: rgba(0, 0, 0, 0.92) !important;
    z-index: 2147483646 !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    align-items: center !important;
    box-sizing: border-box !important;
    padding: 16px !important;
    backdrop-filter: blur(12px) !important;
  `;

  modal.innerHTML = `
    <div style="width: 100%; max-width: 600px; background: #141418; border-radius: 16px; overflow: hidden; border: 1px solid rgba(226,183,184,0.4); box-shadow: 0 12px 36px rgba(0,0,0,0.8);">
      <div style="padding: 10px 16px; background: #1a1a20; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08);">
        <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #e1e1e6; font-weight: bold;">
          <span style="background: #e2b7b8; color: #121214; font-size: 10px; padding: 2px 6px; border-radius: 4px;">Creamu</span>
          <span>视频解封播放器</span>
        </div>
        <button id="creamu-hj-modal-close" style="background: transparent; color: #a0a0b0; border: none; font-size: 20px; cursor: pointer; padding: 0 6px;">✕</button>
      </div>

      <video id="creamu-hj-modal-video" controls playsinline webkit-playsinline x5-playsinline="true" x5-video-player-type="h5-page" x5-video-player-fullscreen="true" style="width: 100%; max-height: 65vh; background: #000; display: block;">
        您的浏览器不支持 HTML5 视频播放。
      </video>

      <div class="creamu-hj-player-toolbar" style="padding: 10px 14px; background: #18181c; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; gap: 6px;">
          <button class="creamu-hj-btn" id="creamu-hj-m-rewind">⏪ -10s</button>
          <button class="creamu-hj-btn" id="creamu-hj-m-forward">⏩ +10s</button>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="creamu-hj-btn" id="creamu-hj-m-speed">⚡ 1.5x</button>
          <button class="creamu-hj-btn" id="creamu-hj-m-copy">📋 复制直链</button>
        </div>
      </div>
    </div>
  `;

  const videoEl = document.getElementById('creamu-hj-modal-video');
  const closeBtn = document.getElementById('creamu-hj-modal-close');

  if (closeBtn) {
    closeBtn.onclick = () => {
      if (videoEl) videoEl.pause();
      modal.style.display = 'none';
    };
  }

  if ((/\.m3u8($|\?)/i.test(videoUrl) || /\/(hls|vod|m3u8|playlist)\//i.test(videoUrl)) && typeof GM_xmlhttpRequest === 'function') {
    loadHjM3u8WithGm(videoEl, videoUrl);
  } else {
    videoEl.src = videoUrl;
  }

  enableHjVideoGestureSeek(videoEl);

  const rewindBtn = document.getElementById('creamu-hj-m-rewind');
  if (rewindBtn) rewindBtn.onclick = () => { videoEl.currentTime = Math.max(0, videoEl.currentTime - 10); };

  const forwardBtn = document.getElementById('creamu-hj-m-forward');
  if (forwardBtn) forwardBtn.onclick = () => { videoEl.currentTime = Math.min(videoEl.duration || 0, videoEl.currentTime + 10); };

  const speedBtn = document.getElementById('creamu-hj-m-speed');
  if (speedBtn) {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    let sIdx = 2;
    videoEl.playbackRate = 1.5;
    speedBtn.onclick = () => {
      sIdx = (sIdx + 1) % speeds.length;
      const spd = speeds[sIdx];
      videoEl.playbackRate = spd;
      speedBtn.textContent = `⚡ ${spd}x`;
      showHjSeekHud(`倍速播放: ${spd}x`);
    };
  }

  const copyBtn = document.getElementById('creamu-hj-m-copy');
  if (copyBtn) {
    copyBtn.onclick = () => {
      if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(videoUrl);
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(videoUrl);
      }
      alert('已复制视频直链！');
    };
  }

  modal.style.display = 'flex';
}

/**
 * 安全的更新触发调度器（防死循环 + 防卡死防抖）
 */
let hjUpdateTimer = null;
function scheduleHjMediaUpdate() {
  if (hjUpdateTimer) return;
  if (typeof setTimeout === 'function') {
    hjUpdateTimer = setTimeout(() => {
      hjUpdateTimer = null;
      embedHjUnlockedMediaInline();
    }, 400);
  } else {
    embedHjUnlockedMediaInline();
  }
}

/**
 * 主入口：解析隐藏媒体
 */
function parseHjHiddenMedia() {
  initHjNetworkInterceptor();
  const res = parseHjHiddenMediaFromGlobals();
  scheduleHjMediaUpdate();
  setupHjMobileObserver();
  return res;
}

/**
 * 监听移动端 DOM 变动 (防死循环 + 忽略 Creamu 自身节点)
 */
function setupHjMobileObserver() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || window.__creamu_hj_observer_active) return;
  window.__creamu_hj_observer_active = true;

  // 小窗建好后不再监听整页。海角页面自己一直在改 DOM，整页监听会把播放器反复拆掉重做。
  if (typeof setInterval !== 'function' || typeof document.getElementById !== 'function') return;
  setInterval(() => {
    const cache = window.__creamu_hj_media_cache;
    const identity = hjPostIdentity();
    if (cache && cache.postIdentity && cache.postIdentity !== identity) {
      resetHjMediaForPost(identity);
    }
    if (cache && !cache.postIdentity) cache.postIdentity = identity;
    if (!cache || !cache.videos || !cache.videos.length) {
      parseHjHiddenMediaFromGlobals();
      if (cache && cache.images && cache.images.length) renderHjUnlockedImages();
      return;
    }
    if (cache.images && cache.images.length) renderHjUnlockedImages();
    const slot = document.getElementById('creamu-hj-inline-slot');
    const box = document.getElementById('creamu-hj-inline-player-box');
    if (slot && slot.parentElement === document.body && box && slot.contains(box)) return;
    embedHjUnlockedMediaInline();
  }, 1500);
}

/**
 * 顶层状态诊断提示条。默认不挂到页面上，解析结果只进内嵌播放器。
 */
function renderHjUnlockedMediaBar() {
  return;
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
  const cache = window.__creamu_hj_media_cache || { videos: [], images: [] };

  const root = document.documentElement || document.body;
  if (!root) return;

  let bar = document.getElementById('creamu-hj-media-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'creamu-hj-media-bar';
    root.appendChild(bar);
  }

  bar.style.cssText = `
    position: fixed !important;
    top: 10px !important;
    left: 10px !important;
    right: 10px !important;
    z-index: 2147483647 !important;
    box-sizing: border-box !important;
    pointer-events: auto !important;
    visibility: visible !important;
    opacity: 1 !important;
    display: block !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  `;

  const videoCount = cache.videos.length;
  const imageCount = cache.images.length;
  const logCount = (window.__creamu_hj_network_log || []).length;
  
  const playBtnHtml = videoCount > 0 ? `<button id="creamu-hj-play-now-btn" style="background:#e2b7b8 !important; color:#121214 !important; font-weight:bold !important; border:none !important; padding:4px 9px !important; border-radius:6px !important; font-size:11px !important; cursor:pointer !important;">▶ 播放 (${videoCount})</button>` : '';

  bar.innerHTML = `
    <div style="display:flex !important; align-items:center !important; justify-content:space-between !important; gap:8px !important; padding:8px 12px !important; background:rgba(28,28,34,0.96) !important; border:1px solid rgba(226,183,184,0.5) !important; border-radius:12px !important; color:#e1e1e6 !important; font-size:12px !important; box-shadow:0 6px 20px rgba(0,0,0,0.6) !important; backdrop-filter:blur(10px) !important;">
      <div style="display:flex !important; align-items:center !important; gap:6px !important;">
        <span style="background:#e2b7b8 !important; color:#121214 !important; font-weight:bold !important; font-size:10px !important; padding:2px 5px !important; border-radius:4px !important;">Creamu</span>
        <span>已捕获: <strong style="color:#e2b7b8 !important;">${videoCount}</strong> 视频</span>
      </div>
      <div style="display:flex !important; gap:4px !important; align-items:center !important;">
        ${playBtnHtml}
        <button id="creamu-hj-log-btn" style="background:#2a2a34 !important; color:#e2b7b8 !important; border:1px solid rgba(226,183,184,0.3) !important; padding:4px 8px !important; border-radius:6px !important; font-size:11px !important; cursor:pointer !important;">📋 日志 (${logCount})</button>
        <button id="creamu-hj-close-btn" style="background:transparent !important; color:#a0a0b0 !important; border:none !important; font-size:15px !important; padding:0 4px !important; cursor:pointer !important;">✕</button>
      </div>
    </div>
  `;

  const closeBtn = document.getElementById('creamu-hj-close-btn');
  if (closeBtn) {
    closeBtn.onclick = () => { bar.style.display = 'none'; };
  }

  const playNowBtn = document.getElementById('creamu-hj-play-now-btn');
  if (playNowBtn) {
    playNowBtn.onclick = () => {
      if (cache.videos.length > 0) {
        openHjModalPlayer(cache.videos[0]);
      }
    };
  }

  const logBtn = document.getElementById('creamu-hj-log-btn');
  if (logBtn) {
    logBtn.onclick = () => {
      const logs = window.__creamu_hj_network_log || [];
      const netUrls = logs.map((l) => `${l.time} -> ${l.url}`).join('\n');
      const vUrls = cache.videos.join('\n');
      const imgUrls = cache.images.join('\n');
      alert(`【Creamu 诊断日志】\n\n已拦截网络请求(${logs.length}个):\n${netUrls.slice(0, 400) || '无'}\n\n当前提取视频链接:\n${vUrls || '未提取到视频链接'}\n\n当前提取图片链接:\n${imgUrls.slice(0, 200) || '无'}`);
    };
  }
}

/**
 * 核心升级：直接把 HLS.js HTML5 视频播放器【内嵌到帖子正文中】！
 */
/** ArtPlayer 负责画面、进度拖动、全屏和倍速。解码仍走带站点密钥的 Hls。 */
function mountHjArtPlayer(videoUrl) {
  const mount = document.getElementById('creamu-hj-art-mount');
  if (!mount || typeof Artplayer !== 'function') return null;
  if (mount._hjArt) {
    try { mount._hjArt.destroy(false); } catch (_) {}
  }
  const art = new Artplayer({
    container: mount,
    url: videoUrl,
    type: 'm3u8',
    autoplay: true,
    playsInline: true,
    fullscreen: true,
    fullscreenWeb: true,
    pip: true,
    playbackRate: true,
    setting: true,
    flip: true,
    aspectRatio: true,
    gesture: true,
    theme: '#e2b7b8',
    lang: 'zh-cn',
    moreVideoAttr: { playsInline: true, 'webkit-playsinline': 'true' },
    customType: {
      m3u8(video, url) {
        if (typeof window.Hls === 'function' && window.Hls.isSupported()) loadHjM3u8WithGm(video, url);
        else video.src = url;
      },
    },
  });
  mount._hjArt = art;
  return art.video || art.template && art.template.$video;
}

function embedHjUnlockedMediaInline() {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
  const cache = window.__creamu_hj_media_cache;
  if (!cache || cache.videos.length === 0) return;

  const videoIndex = Math.min(currentHjSelectedVideoIndex, cache.videos.length - 1);
  const videoUrl = cache.videos[videoIndex];
  if (!videoUrl) return;

  // 只要解析到视频就开小窗，不再依赖帖子节点。
  const container = ensureHjInlineSlot();
  if (!container) return;

  let playerBox = document.getElementById('creamu-hj-inline-player-box');
  if (!playerBox) {
    playerBox = document.createElement('div');
    playerBox.id = 'creamu-hj-inline-player-box';
    playerBox.className = 'creamu-hj-inline-player-box';
  }

  // 1. 动态迁移：如果 playerBox 不在当前最新查找到的 container 中，迁移！
  if (playerBox.parentElement !== container) {
    if (container.firstChild) {
      container.insertBefore(playerBox, container.firstChild);
    } else {
      container.appendChild(playerBox);
    }
  }

  // 2. 防重复渲染校验：URL 相同且已经在目标容器中才跳过 HTML 构建
  if (playerBox.getAttribute('data-video-url') === videoUrl && playerBox.parentElement === container) {
    return;
  }

  playerBox.setAttribute('data-video-url', videoUrl);

  playerBox.style.cssText = `
    width: 100% !important;
    margin: 12px 0 !important;
    background: #000 !important;
    border-radius: 12px !important;
    overflow: hidden !important;
    box-shadow: 0 6px 20px rgba(0,0,0,0.5) !important;
    border: 1px solid rgba(226,183,184,0.4) !important;
    position: relative !important;
    z-index: 99999 !important;
  `;

  // 构建多视频切换按钮
  let switcherHtml = '';
  if (cache.videos.length > 1) {
    switcherHtml = `<div style="display:flex; gap:6px; padding:6px 12px; background:#121216; overflow-x:auto; border-bottom:1px solid rgba(255,255,255,0.08);">`;
    cache.videos.forEach((v, idx) => {
      const activeStyle = idx === videoIndex ? 'background:#e2b7b8; color:#121214; font-weight:bold;' : 'background:#2a2a34; color:#e1e1e6;';
      switcherHtml += `<button class="creamu-hj-vswitch-btn" data-idx="${idx}" style="${activeStyle} border:none; padding:4px 10px; border-radius:6px; font-size:11px; cursor:pointer; whitespace:nowrap;">视频 ${idx + 1}</button>`;
    });
    switcherHtml += `</div>`;
  }

  if (playerBox.getAttribute('data-video-url') === videoUrl && document.getElementById('creamu-hj-art-mount')) {
    return;
  }
  playerBox.innerHTML = `
    ${switcherHtml}
    <div id="creamu-hj-art-mount" style="width:100%; aspect-ratio:16/9; background:#000;"></div>
    <div id="creamu-hj-play-status" style="display:none; padding:4px 8px; background:#2a1618; color:#ffb4af; font-size:11px;"></div>
    <button class="creamu-hj-btn" id="creamu-hj-debug-toggle" type="button">调试</button>
    <pre id="creamu-hj-debug" style="display:none; margin:0; padding:6px 8px; white-space:pre-wrap; word-break:break-all; color:#b7b7c4; font-size:11px; max-height:180px; overflow:auto; background:#101014;"></pre>
  `;

  // 绑定多视频切换
  const switchBtns = playerBox.querySelectorAll('.creamu-hj-vswitch-btn');
  switchBtns.forEach((btn) => {
    btn.onclick = () => {
      const idx = parseInt(btn.getAttribute('data-idx') || '0', 10);
      currentHjSelectedVideoIndex = idx;
      playerBox.removeAttribute('data-video-url');
      embedHjUnlockedMediaInline();
    };
  });

  const videoEl = mountHjArtPlayer(videoUrl);
  if (!videoEl) return;
  const statusEl = document.getElementById('creamu-hj-play-status');
  const showPlayStatus = (text) => {
    if (!statusEl) return;
    statusEl.style.display = text ? 'block' : 'none';
    statusEl.textContent = text || '';
  };
  videoEl.addEventListener('error', () => {
    const code = videoEl.error && videoEl.error.code;
    hjDebug('播放器错误 code=' + code + ' src=' + String(videoEl.currentSrc || videoEl.src).slice(0, 80));
    showPlayStatus('播放器报错 code=' + code);
  });
  videoEl.addEventListener('playing', () => showPlayStatus(''));
  hjDebug('选用 ' + videoUrl);

  const debugToggle = document.getElementById('creamu-hj-debug-toggle');
  const debugBox = document.getElementById('creamu-hj-debug');
  if (debugBox) debugBox.textContent = (window.__creamu_hj_debug || []).join('\n');
  if (debugToggle && debugBox) {
    debugToggle.onclick = () => {
      if (debugBox.style.display === 'none') {
        debugBox.style.display = 'block';
        debugBox.textContent = (window.__creamu_hj_debug || []).join('\n');
        debugToggle.textContent = '复制调试';
        return;
      }
      copyHjDebug();
      debugToggle.textContent = '已复制';
    };
  }
  hjDebug('地址 ' + cache.videos.length + ' 条');
}

// 启动运行
parseHjHiddenMedia();
// 31-search-memory.js

function initHjSearchMemory() {
  // 恢复/保持搜索状态与滚动位置
  try {
    const savedScroll = sessionStorage.getItem('creamu_hj_search_scroll');
    if (savedScroll && location.search.includes('q=')) {
      window.scrollTo(0, parseInt(savedScroll, 10));
    }
    window.addEventListener('beforeunload', () => {
      sessionStorage.setItem('creamu_hj_search_scroll', String(window.scrollY));
    });
  } catch (e) {
    /* ignore */
  }
}
// 32-user-post-sorter.js

/**
 * 用户页的「最新」是滑到底自动加载的接口分页，页面上没有可排序的节点。
 * 列表在页面组件的 forumList 里：正序要先让页面把剩下的页都加载出来，再按站点原序反过来。
 */
function initHjPostSorter(options) {
  if (typeof document === 'undefined' || window.__creamu_hj_sorter_ready) return;
  window.__creamu_hj_sorter_ready = true;
  const opts = options || {};
  const wait = opts.wait || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const roundMs = opts.roundMs || 700;
  const settleRounds = opts.settleRounds || 4;
  const maxMs = opts.maxMs || 5 * 60 * 1000;
  let oldestFirst = false;
  let loading = false;
  let pageHref = String(location.href || '');
  // 帖子第一次出现的先后 = 站点原序（新 → 旧）。按它排，翻页追加或数组被换掉都不会乱。
  const firstSeen = new WeakMap();
  let seenCounter = 0;

  const pageVm = () => {
    const roots = document.querySelectorAll('.userinfo');
    for (let i = roots.length - 1; i >= 0; i -= 1) {
      const vm = roots[i] && roots[i].__vue__;
      if (vm && Array.isArray(vm.forumList)) return vm;
    }
    return null;
  };

  const currentList = () => {
    const vm = pageVm();
    return vm ? vm.forumList : null;
  };

  const label = (count) => {
    if (loading) return '加载中 ' + count;
    return (oldestFirst ? '正序 ' : '倒序 ') + count;
  };

  const updateLabel = () => {
    const button = document.getElementById('creamu-hj-order-toggle');
    const list = currentList();
    if (button) button.textContent = label(list ? list.length : 0);
  };

  const seqOf = (item) => (item && typeof item === 'object' ? firstSeen.get(item) : 0) || 0;

  const applyOrder = () => {
    const list = currentList();
    updateLabel();
    if (!list || !list.length) return;
    list.forEach((item) => {
      if (item && typeof item === 'object' && !firstSeen.has(item)) firstSeen.set(item, ++seenCounter);
    });
    if (list.length < 2) return;
    const direction = oldestFirst ? -1 : 1;
    let sorted = true;
    for (let i = 1; i < list.length && sorted; i += 1) {
      if ((seqOf(list[i]) - seqOf(list[i - 1])) * direction < 0) sorted = false;
    }
    // 只在原数组里调顺序。换成新数组会让页面列表丢掉响应，帖子直接消失。
    if (!sorted) list.sort((a, b) => (seqOf(a) - seqOf(b)) * direction);
  };

  const scrollContainer = () => {
    let cur = document.querySelector('.userinfo');
    while (cur && cur !== document.body && cur !== document.documentElement) {
      const style = typeof getComputedStyle === 'function' ? getComputedStyle(cur) : null;
      if (style && /(auto|scroll)/.test(style.overflowY) && cur.scrollHeight > cur.clientHeight) return cur;
      cur = cur.parentElement;
    }
    return null;
  };

  const scrollToBottom = () => {
    const box = scrollContainer();
    if (box) {
      box.scrollTop = box.scrollHeight;
      if (typeof Event === 'function') box.dispatchEvent(new Event('scroll'));
    }
    const height = Math.max(
      (document.documentElement && document.documentElement.scrollHeight) || 0,
      (document.body && document.body.scrollHeight) || 0
    );
    if (typeof window.scrollTo === 'function') window.scrollTo(0, height);
    if (typeof window.dispatchEvent === 'function' && typeof Event === 'function') {
      window.dispatchEvent(new Event('scroll'));
    }
  };

  const scrollToTop = () => {
    const box = scrollContainer();
    if (box) box.scrollTop = 0;
    if (typeof window.scrollTo === 'function') window.scrollTo(0, 0);
  };

  /** 一直滑到底，直到连续几轮没有新帖（站点已加载完）或超时 */
  const loadAllPages = async () => {
    loading = true;
    const startedAt = Date.now();
    let stableRounds = 0;
    let lastCount = -1;
    try {
      while (stableRounds < settleRounds && Date.now() - startedAt < maxMs) {
        if (!oldestFirst) break;
        scrollToBottom();
        await wait(roundMs);
        applyOrder();
        const list = currentList();
        const count = list ? list.length : 0;
        if (count === lastCount) stableRounds += 1;
        else stableRounds = 0;
        lastCount = count;
      }
    } finally {
      loading = false;
      applyOrder();
      scrollToTop();
    }
  };

  const toggleOrder = () => {
    if (loading) return;
    oldestFirst = !oldestFirst;
    applyOrder();
    if (oldestFirst) return loadAllPages();
    scrollToTop();
    return undefined;
  };

  const mount = () => {
    if (!/\/user\/userinfo/i.test(String(location.pathname || ''))) return;
    const href = String(location.href || '');
    if (href !== pageHref) {
      // 换了别人的主页：回到站点默认顺序
      pageHref = href;
      oldestFirst = false;
    }
    let button = document.getElementById('creamu-hj-order-toggle');
    if (!button && document.body) {
      button = document.createElement('button');
      button.id = 'creamu-hj-order-toggle';
      button.type = 'button';
      button.className = 'creamu-hj-btn';
      button.style.cssText = 'position:fixed;right:12px;bottom:72px;z-index:2147483646;';
      button.onclick = toggleOrder;
      document.body.appendChild(button);
    }
    if (!loading) applyOrder();
    else updateLabel();
  };

  mount();
  if (typeof setInterval === 'function') setInterval(mount, 1500);
  initHjPostReading();
}

/** 详情接口的 data 是三重 base64。解出来才是帖子正文。 */
function decodeHjTopicPayload(text) {
  let raw = String(text || '');
  try {
    const wrapped = JSON.parse(raw);
    if (wrapped && typeof wrapped.data === 'string') raw = wrapped.data;
    else if (wrapped && wrapped.data) return wrapped.data;
  } catch (_) {}
  try {
    for (let i = 0; i < 3; i += 1) raw = atob(raw);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i) & 0xff;
    const json = typeof TextDecoder === 'function' ? new TextDecoder('utf-8').decode(bytes) : raw;
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}

function currentHjPostId() {
  const href = String((typeof location !== 'undefined' && location.href) || '');
  const matched = href.match(/(?:[?&#](?:pid|id|topicId)=|\/post\/|\/topic\/)(\d+)/i);
  return matched ? matched[1] : '';
}

function isHjPostDetail() {
  return /\/post\/details|\/topic\/details/i.test(String((typeof location !== 'undefined' && location.pathname) || ''));
}

/** 列表点击按帖子数据开新标签。详情页拉接口，把完整正文填进去。 */
function initHjPostReading() {
  if (window.__creamu_hj_reading_ready) {
    if (typeof window.__creamu_hj_open_detail === 'function') window.__creamu_hj_open_detail();
    return;
  }
  window.__creamu_hj_reading_ready = true;

  const componentOf = (node) => {
    let cur = node;
    for (let depth = 0; cur && depth < 12; depth += 1) {
      const vm = cur && (cur.__vue__ || cur.__vueParentComponent);
      if (vm) return vm;
      cur = cur.parentElement;
    }
    return null;
  };

  const postIdOf = (node) => {
    const vm = componentOf(document.querySelector('.userinfo'));
    const list = vm && vm.forumList;
    if (!Array.isArray(list)) return '';
    let cur = node;
    for (let depth = 0; cur && depth < 8; depth += 1) {
      const text = String(cur.innerText || cur.textContent || '').replace(/\s+/g, '');
      if (text.length >= 6) {
        const hit = list.find((item) => {
          const title = String(item && item.title || '').replace(/\s+/g, '');
          return title && title.length >= 6 && text.includes(title);
        });
        const pid = hit && (hit.topicId || hit.id);
        if (pid) return String(pid);
      }
      cur = cur.parentElement;
    }
    return '';
  };

  let listHref = isHjPostDetail() ? '' : String(location.href || '');
  const openDetailInNewTab = () => {
    if (!isHjPostDetail()) {
      listHref = String(location.href || '');
      return;
    }
    if (!listHref || window.__creamu_hj_detail_opened === location.href) return;
    const pid = currentHjPostId();
    if (!pid) return;
    window.__creamu_hj_detail_opened = location.href;
    window.open(location.origin + '/post/details?pid=' + pid, '_blank', 'noopener');
    history.back();
  };
  window.__creamu_hj_open_detail = openDetailInNewTab;
  openDetailInNewTab();
  if (typeof setInterval === 'function') setInterval(openDetailInNewTab, 300);

  const loadHiddenImages = async () => {
    const pid = currentHjPostId();
    if (!pid || window.__creamu_hj_images_pid === pid) return;
    window.__creamu_hj_images_pid = pid;
    try {
      const response = await fetch(location.origin + '/api/topic/' + pid + '?date=' + Date.now(), {
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = decodeHjTopicPayload(await response.text());
      if (!payload) {
        window.__creamu_hj_images_pid = '';
        return;
      }
      const topic = payload.attachments ? payload : payload.results && payload.results[0];
      const added = typeof unlockHjHiddenImages === 'function' ? await unlockHjHiddenImages(topic || payload) : 0;
      const pending = typeof hjTopicImageAttachments === 'function' ? hjTopicImageAttachments(topic || payload) : [];
      if (pending.length && !added) window.__creamu_hj_images_pid = '';
      if (typeof renderHjUnlockedImages === 'function') renderHjUnlockedImages();
    } catch (_) {
      window.__creamu_hj_images_pid = '';
    }
  };

  const showFullPost = () => {
    if (!isHjPostDetail()) return;
    loadHiddenImages();
    if (typeof renderHjUnlockedImages === 'function') renderHjUnlockedImages();
    document.querySelectorAll('button').forEach((button) => {
      const text = String(button.textContent || '').replace(/\s+/g, '');
      if (text !== '点击展开完整贴文' || button.dataset.hjExpanded === '1') return;
      button.dataset.hjExpanded = '1';
      button.click();
    });
  };

  showFullPost();
  if (typeof setInterval === 'function') setInterval(showFullPost, 1500);
}
// 35-ad-sanitizer.js

/**
 * 站点用 sessionStorage.pageOpen 决定进站弹窗。
 * 刷新会重新读它；新标签页是空的，所以每次打开帖子都会再弹。脚本一加载就写上。
 */
function armHjEntryDialog() {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('pageOpen', '1');
  } catch (_) {}
}

function hjDialogText(el) {
  return String((el && (el.textContent || el.innerText)) || '').replace(/\s+/g, '');
}

function isHjLandingDialog(el) {
  if (!el) return false;
  const className = String(el.className || '');
  if (className.includes('luodiye_dialog')) return true;
  if (typeof el.querySelector === 'function' && el.querySelector('.luodiye_dialog')) return true;
  const text = hjDialogText(el);
  if (!text || /重新登录|登录令牌|支付|密码|验证码|忘记密码/.test(text)) return false;
  return /重要提示|亲爱的海友|年满18|请收藏|永久网址|不会迷路|页面被劫持|自动进入本站|海外华人社区|秒后自动进入/.test(text);
}

/** 首页落地弹窗和确认提示。登录、支付、验证码这类弹窗不关。 */
function closeHjLandingDialogs() {
  armHjEntryDialog();
  if (typeof document === 'undefined') return;
  const wrappers = document.querySelectorAll('.el-dialog__wrapper, .luodiye_dialog, .el-message-box__wrapper, .van-dialog, .van-popup, #hj_modal_confirm');
  wrappers.forEach((wrap) => {
    if (!isHjLandingDialog(wrap)) return;
    if (typeof wrap.querySelectorAll === 'function') {
      wrap.querySelectorAll('button, span, .el-button').forEach((button) => {
        const label = String(button.textContent || '').replace(/\s+/g, '');
        if (/^(我知道了|好|确认|我确认)([（(]\d+[)）])?$/.test(label)) button.click();
      });
    }
    const layer = (typeof wrap.closest === 'function' && (wrap.closest('.el-dialog__wrapper') || wrap.closest('.van-popup') || wrap.closest('.van-dialog'))) || wrap;
    if (layer.parentElement) layer.parentElement.removeChild(layer);
  });
  const left = [...document.querySelectorAll('.el-dialog__wrapper, .el-message-box__wrapper, .van-dialog, .van-popup')]
    .some((wrap) => /重新登录|登录令牌|支付|密码|验证码/.test(hjDialogText(wrap)));
  if (left) return;
  document.querySelectorAll('.v-modal, .van-overlay').forEach((mask) => {
    if (mask.parentElement) mask.parentElement.removeChild(mask);
  });
  if (document.body) {
    document.body.classList.remove('el-popup-parent--hidden', 'van-overflow-hidden');
    if (document.body.style) document.body.style.overflow = '';
  }
  if (document.documentElement && document.documentElement.style) document.documentElement.style.overflow = '';

  document.querySelectorAll('.addbox').forEach((box) => {
    const text = String(box.innerText || '').replace(/\s+/g, '');
    if (!/添加到主屏幕|添加海角社区到主屏幕/.test(text)) return;
    const close = box.querySelector('.van-icon-cross');
    if (close) close.click();
    if (box.parentElement) box.parentElement.removeChild(box);
  });
}

function applyHjAdSanitizer() {
  if (typeof window !== 'undefined' && window.__creamu_hj_ad_ready) {
    closeHjLandingDialogs();
    return;
  }
  if (typeof window !== 'undefined') window.__creamu_hj_ad_ready = true;
  closeHjLandingDialogs();
  if (typeof setInterval === 'function') setInterval(closeHjLandingDialogs, 800);
}

armHjEntryDialog();
// 50-boot.js

function bootCreamuHj() {
  if (typeof isHjSite === 'function' && !isHjSite()) return;
  const core = initCreamuHjCore();
  applyCreamuHjTheme();
  applyHjAdSanitizer();
  initHjSearchMemory();
  initHjPostSorter();
  parseHjHiddenMedia();
  core.log('Boot completed.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootCreamuHj);
} else {
  bootCreamuHj();
}
})();
