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
