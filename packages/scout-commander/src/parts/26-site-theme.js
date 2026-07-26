// 26-site-theme.js

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

  /* 仅站点原生表单暗色；工作台 / 采集弹层由各自组件样式负责 */
  html.scout-cream-site input[type="text"]:where(:not(#jlc-wb *)):where(:not(#scout-collect-dialog *)),
  html.scout-cream-site input[type="search"]:where(:not(#jlc-wb *)):where(:not(#scout-collect-dialog *)),
  html.scout-cream-site input[type="password"]:where(:not(#jlc-wb *)):where(:not(#scout-collect-dialog *)),
  html.scout-cream-site input[type="email"]:where(:not(#jlc-wb *)):where(:not(#scout-collect-dialog *)),
  html.scout-cream-site textarea:where(:not(#jlc-wb *)):where(:not(#scout-collect-dialog *)),
  html.scout-cream-site select:where(:not(#jlc-wb *)):where(:not(#scout-collect-dialog *)) {
    background: var(--scout-card) !important;
    color: var(--scout-text-color) !important;
    border: 1px solid var(--scout-page-border) !important;
    border-radius: 10px !important;
    box-shadow: 0 1px 0 rgba(0,0,0,0.04) !important;
    color-scheme: dark;
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
