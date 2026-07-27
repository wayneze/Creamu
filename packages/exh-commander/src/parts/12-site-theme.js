
  function applyCreamSiteTheme() {
    const on = !!config.cream_site_theme;
    try {
      document.documentElement.classList.toggle('exc-cream-site', on);
      if (document.body) document.body.classList.toggle('exc-cream-site', on);
    } catch (_) {}

    let el = document.getElementById('exc-site-theme-cream');
    if (!on) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('style');
      el.id = 'exc-site-theme-cream';
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = getCreamSiteThemeCss();
  }

  /**
   * 画廊详情：把 #gdt 整块按倍率放大（zoom）。
   * 站点第一页有几张还是几张，只是每格更大；高度可多占排。
   */
  function applyGalleryThumbScale() {
    const scale = clampGalleryThumbScale(config.gallery_thumb_scale);
    config.gallery_thumb_scale = scale;
    const on = scale > 1.001;
    try {
      document.documentElement.classList.toggle('exc-gdt-scale', on);
      document.documentElement.style.setProperty('--exc-gdt-scale', String(scale));
    } catch (_) {}

    let el = document.getElementById('exc-gdt-scale-style');
    if (!on) {
      if (el) el.remove();
      try {
        document.documentElement.style.removeProperty('--exc-gdt-scale');
      } catch (_) {}
      return;
    }
    if (!el) {
      el = document.createElement('style');
      el.id = 'exc-gdt-scale-style';
      (document.head || document.documentElement).appendChild(el);
    }
    // zoom：保持同一批缩略与排版语义，整块放大（含雪碧图 background）
    el.textContent =
      '/* Creamu：画廊缩略图倍率（张数不变） */\n' +
      'html.exc-gdt-scale #gdt {\n' +
      '  zoom: var(--exc-gdt-scale, 1.5);\n' +
      '}\n' +
      '/* 不支持 zoom 时用 transform，并补高度避免叠到下方 */\n' +
      '@supports not (zoom: 1) {\n' +
      '  html.exc-gdt-scale #gdt {\n' +
      '    zoom: unset;\n' +
      '    transform: scale(var(--exc-gdt-scale, 1.5));\n' +
      '    transform-origin: top left;\n' +
      '    width: calc(100% / var(--exc-gdt-scale, 1.5));\n' +
      '  }\n' +
      '}\n';
  }

  function getCreamSiteThemeCss() {
    return `
/*
 * 奶油站点主题层次：
 * 页底（深奶油）→ 浮起卡片（中奶油+阴影）→ 封面槽（更深）
 * 列表作品框禁止纯白 #fff / #fffdf8，用色阶+投影做立体感
 */
html.exc-cream-site,
html.exc-cream-site body {
  background: #e5d9c8 !important;
  color: #4a3728 !important;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif !important;
  color-scheme: light;
}
html.exc-cream-site body a { color: #8a5a20 !important; }
html.exc-cream-site body a:visited { color: #7a4a28 !important; }
html.exc-cream-site body a:hover { color: #d4883a !important; }

/* 顶栏：略深于页底，压住内容 */
html.exc-cream-site #nb {
  background: #dccfb8 !important;
  border-bottom: 1px solid #cbb89a !important;
  box-shadow: 0 2px 8px rgba(90, 60, 30, 0.1);
}
html.exc-cream-site #nb div,
html.exc-cream-site #nb a {
  background: transparent !important;
  color: #6b4a2e !important;
  border-color: #e0cdae !important;
}
html.exc-cream-site #nb a:hover { color: #d4883a !important; }

/* 主容器 */
html.exc-cream-site .ido,
html.exc-cream-site #ido,
html.exc-cream-site div.ido {
  background: transparent !important;
  color: #4a3728 !important;
}
html.exc-cream-site .stuffbox,
html.exc-cream-site .homebox,
html.exc-cream-site .d,
html.exc-cream-site #gw,
html.exc-cream-site #gm,
html.exc-cream-site .gm,
html.exc-cream-site #gmid,
html.exc-cream-site #gd2,
html.exc-cream-site #gd3,
html.exc-cream-site #gd4,
html.exc-cream-site #gd5,
html.exc-cream-site #gleft,
html.exc-cream-site #gright {
  background: #faf6f0 !important;
  color: #4a3728 !important;
  border-color: #e4d4bc !important;
}
/* 封面列与信息列：近白奶油，避免露站点深色 */
html.exc-cream-site body #gleft,
html.exc-cream-site body #gmid,
html.exc-cream-site body #gright,
html.exc-cream-site body #gd2 {
  background: #faf6f0 !important;
  background-image: none !important;
}
html.exc-cream-site body #gleft {
  min-height: 100%;
  box-sizing: border-box;
}
html.exc-cream-site body #exc-gallery-panel {
  clear: both !important;
  display: block !important;
  width: auto !important;
  max-width: none !important;
  background: #f6efe3 !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

/* 搜索 / 筛选项：白输入 + 奶油底区分 */
html.exc-cream-site input[type="text"],
html.exc-cream-site input[type="password"],
html.exc-cream-site input[type="search"],
html.exc-cream-site input[type="number"],
html.exc-cream-site textarea,
html.exc-cream-site select {
  background: #fffdf8 !important;
  color: #4a3728 !important;
  border: 1px solid #e0cdae !important;
  border-radius: 8px !important;
  box-shadow: 0 1px 0 #eadcc6 !important;
  color-scheme: light;
}
html.exc-cream-site select option {
  background: #fffdf8 !important;
  color: #4a3728 !important;
}
html.exc-cream-site #jlc-wb-fab,
html.exc-cream-site button#jlc-wb-fab {
  background: linear-gradient(#e8a24e, #d4883a) !important;
  background-color: #d4883a !important;
  color: #fff !important;
  border: 0 !important;
  box-shadow: 0 3px 0 #b56e28, 0 8px 16px rgba(140,90,40,.26) !important;
  opacity: 1 !important;
}
html.exc-cream-site #jlc-wb-fab > span { color: #fff !important; }
html.exc-cream-site input[type="button"],
html.exc-cream-site input[type="submit"],
html.exc-cream-site input[type="reset"],
html.exc-cream-site button:not(#jlc-wb-fab):not(.jlc-wb-btn):not(.jlc-wb-icon-btn):not(.jlc-wb-chip):not(.exc-tool-btn):not(.exc-meta-act):not(.exc-fold-tag):not(.exc-track-btn) {
  background: #fffaf2 !important;
  color: #5a4030 !important;
  border: 1px solid #e0cdae !important;
  border-radius: 10px !important;
  box-shadow: 0 2px 0 #e6d3b5 !important;
  cursor: pointer;
}
html.exc-cream-site input[type="button"]:hover,
html.exc-cream-site input[type="submit"]:hover,
html.exc-cream-site button:not(#jlc-wb-fab):not(.jlc-wb-btn):not(.jlc-wb-icon-btn):not(.jlc-wb-chip):not(.exc-tool-btn):not(.exc-meta-act):not(.exc-fold-tag):not(.exc-track-btn):hover {
  background: #fff !important;
  border-color: #d4bc96 !important;
}

html.exc-cream-site .cs {
  border-radius: 6px !important;
  border-color: rgba(90, 60, 30, 0.2) !important;
  box-shadow: 0 1px 0 rgba(90, 60, 30, 0.08);
}

/* 列表表：透明底，行作为浮卡 */
html.exc-cream-site table.itg {
  background: transparent !important;
  border-collapse: separate !important;
  border-spacing: 0 10px !important;
  color: #4a3728 !important;
}
html.exc-cream-site table.itg > tbody > tr,
html.exc-cream-site table.itg th {
  background: transparent !important;
  color: #4a3728 !important;
  border: 0 !important;
}
html.exc-cream-site table.itg > tbody > tr > td {
  background: #efe4d4 !important;
  color: #4a3728 !important;
  border-top: 1px solid #d8c8b0 !important;
  border-bottom: 1px solid #d8c8b0 !important;
  border-left: 0 !important;
  border-right: 0 !important;
  box-shadow: 0 4px 14px rgba(90, 60, 30, 0.1), inset 0 1px 0 rgba(255, 248, 236, 0.45);
  vertical-align: middle;
}
html.exc-cream-site table.itg > tbody > tr > td:first-child {
  border-left: 1px solid #d8c8b0 !important;
  border-radius: 12px 0 0 12px !important;
}
html.exc-cream-site table.itg > tbody > tr > td:last-child {
  border-right: 1px solid #d8c8b0 !important;
  border-radius: 0 12px 12px 0 !important;
}
html.exc-cream-site table.itg > tbody > tr:hover > td {
  background: #f4ebe0 !important;
  box-shadow: 0 8px 20px rgba(90, 60, 30, 0.14), inset 0 1px 0 rgba(255, 250, 242, 0.55);
}
html.exc-cream-site .gl1e,
html.exc-cream-site .gl2e,
html.exc-cream-site .gl3e,
html.exc-cream-site .gl4e,
html.exc-cream-site .gl1c,
html.exc-cream-site .gl2c,
html.exc-cream-site .gl3c,
html.exc-cream-site .gl4c,
html.exc-cream-site .gltc,
html.exc-cream-site .gltm,
html.exc-cream-site .glname,
html.exc-cream-site .glink,
html.exc-cream-site .glhide {
  background: transparent !important;
  color: #4a3728 !important;
  border-color: #d8c8b0 !important;
}
html.exc-cream-site .glink,
html.exc-cream-site .glname a {
  color: #4a3728 !important;
}
html.exc-cream-site .glink:hover,
html.exc-cream-site .glname a:hover {
  color: #d4883a !important;
}

/* 缩略网格卡：中奶油浮在深页底上，标题区再深一档 */
html.exc-cream-site .gl1t {
  background: #efe4d4 !important;
  border: 1px solid #d4c2a8 !important;
  border-radius: 14px !important;
  box-shadow:
    0 6px 16px rgba(90, 60, 30, 0.12),
    0 1px 0 rgba(255, 248, 236, 0.5) inset;
  overflow: hidden;
  transition: box-shadow 0.14s ease, transform 0.14s ease, border-color 0.14s ease;
}
html.exc-cream-site .gl1t:hover {
  border-color: #c9b090 !important;
  box-shadow:
    0 10px 24px rgba(90, 60, 30, 0.16),
    0 1px 0 rgba(255, 250, 242, 0.55) inset;
  transform: translateY(-1px);
}
html.exc-cream-site .gl1t .gl4t,
html.exc-cream-site .gl1t .gl3t,
html.exc-cream-site .gl1t .gl5t,
html.exc-cream-site .gl1t .gl6t {
  background: #e6d8c4 !important;
  color: #5a4030 !important;
  border-top: 1px solid rgba(180, 150, 110, 0.25) !important;
}
html.exc-cream-site .glthumb,
html.exc-cream-site .gl3t a,
html.exc-cream-site .gl1e,
html.exc-cream-site td.gl1e,
html.exc-cream-site .glthumb div {
  background-color: #dccfb8 !important;
  border-color: #cbb89a !important;
}
html.exc-cream-site .glthumb img,
html.exc-cream-site .gl1t img,
html.exc-cream-site table.itg td img {
  background-color: #dccfb8 !important;
  /* 列表图略压亮，避免在奶油底上刺眼 */
  filter: brightness(0.94) saturate(0.96);
}
/* 追更条：浮在列表上的独立卡 */
html.exc-cream-site #exc-tracking-bar {
  background: #efe4d4 !important;
  border-color: #d4c2a8 !important;
  border-left: 4px solid #d4883a !important;
  box-shadow: 0 8px 22px rgba(90, 60, 30, 0.14) !important;
}
html.exc-cream-site #exc-tracking-bar.is-tracked {
  background: linear-gradient(90deg, #e2efe4 0%, #efe4d4 48%) !important;
  border-color: #b8d0bc !important;
  border-left-color: #3d8f52 !important;
}

/* 分页：小浮钮，不是白块 */
html.exc-cream-site .ptt td,
html.exc-cream-site .ptb td,
html.exc-cream-site table.ptt td,
html.exc-cream-site table.ptb td {
  background: #efe4d4 !important;
  border: 1px solid #d4c2a8 !important;
  color: #6b4a2e !important;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(90, 60, 30, 0.08);
}
html.exc-cream-site .ptt td a,
html.exc-cream-site .ptb td a { color: #6b4a2e !important; }
html.exc-cream-site .ptt td.ptds,
html.exc-cream-site .ptb td.ptds,
html.exc-cream-site .ptt .ptds,
html.exc-cream-site .ptb .ptds {
  background: #d4883a !important;
  border-color: #b56e28 !important;
}
html.exc-cream-site .ptt td.ptds a,
html.exc-cream-site .ptb td.ptds a { color: #fff !important; }

/* 标签 */
html.exc-cream-site #taglist a,
html.exc-cream-site #taglist div,
html.exc-cream-site .gt,
html.exc-cream-site .gtl,
html.exc-cream-site .gtw {
  background: #fffaf2 !important;
  border: 1px solid #e0cdae !important;
  color: #5a4030 !important;
  border-radius: 8px !important;
  box-shadow: 0 1px 0 #ead7bb;
}
html.exc-cream-site #taglist a:hover,
html.exc-cream-site .gt:hover,
html.exc-cream-site .gtl:hover {
  background: #fff1d6 !important;
  border-color: #e8c48a !important;
  color: #8a5a20 !important;
}

/* 画廊信息区 */
html.exc-cream-site #gdn,
html.exc-cream-site #gdd,
html.exc-cream-site #gdr,
html.exc-cream-site #gdf,
html.exc-cream-site #gds {
  background: transparent !important;
  color: #4a3728 !important;
  border-color: #e4d4bc !important;
}
/*
 * #gd1 内层 div 才是 background:url(封面)。
 * 外层 #gd1 铺奶油底，避免图未铺满时露站点原色；禁止 background 简写冲掉内层图。
 */
html.exc-cream-site body #gd1 {
  color: #4a3728 !important;
  border-color: #e4d4bc !important;
  background-color: #f6efe3 !important;
  background-image: none !important;
  margin: 0 !important;
  padding: 0 !important;
}
html.exc-cream-site body #gd1 > div {
  /* 保留 inline 的 background-image / size，只补底色 */
  background-color: #f6efe3 !important;
  margin: 0 auto 0 0 !important;
}
html.exc-cream-site #gd2 h1,
html.exc-cream-site #gd2 #gn,
html.exc-cream-site #gd2 #gj {
  color: #4a3728 !important;
}
/* 缩略条容器可奶油底；单格 gdtm/gdtl 用 background-image，禁止整块填色 */
html.exc-cream-site #gdt {
  background: #f6efe3 !important;
  border-color: #e4d4bc !important;
}
html.exc-cream-site #gdt .gdtm,
html.exc-cream-site #gdt .gdtl {
  background-color: transparent !important;
  border-color: #e4d4bc !important;
}
html.exc-cream-site #gdt a img {
  border-color: #e4d4bc !important;
  border-radius: 4px;
  opacity: 1 !important;
  filter: none !important;
}

/*
 * 已点过：轻描边 + 轻微压暗（覆盖站点厚遮罩，也别完全不标）
 * 同时用 :visited 与 .is-exc-seen（脚本根据本地状态打标，规避隐私限制）
 */
html.exc-cream-site .glname a:visited,
html.exc-cream-site .glink:visited {
  color: #8a7058 !important;
}
/* 已点/已访问：压暗（勿被下方「未访问清图」规则盖掉） */
html.exc-cream-site a:visited img,
html.exc-cream-site a:visited .glthumb img,
html.exc-cream-site .gl1t:has(a:visited) img,
html.exc-cream-site tr:has(a:visited) img,
html.exc-cream-site .exc-gl-item.is-exc-seen img,
html.exc-cream-site .exc-gl-item.is-exc-seen .glthumb img,
html.exc-cream-site .exc-gl-item.is-exc-seen .glthumb,
html.exc-cream-site .exc-gl-item.is-exc-seen .exc-cover-host,
html.exc-cream-site .exc-gl-item.is-exc-seen .exc-cover-host img {
  opacity: 0.62 !important;
  filter: saturate(0.72) brightness(0.9) !important;
}
/* 奶油页：三类框体色与浮卡阴影共存 */
html.exc-cream-site .gl1t:has(a:visited),
html.exc-cream-site .exc-gl-item.is-exc-seen.gl1t,
html.exc-cream-site .gl1t.exc-gl-item.is-exc-seen {
  outline: 2px solid rgba(180, 145, 90, 0.95) !important;
  outline-offset: -2px;
}
html.exc-cream-site .exc-gl-item.is-exc-lib.gl1t,
html.exc-cream-site .gl1t.exc-gl-item.is-exc-lib {
  outline: 2px solid rgba(45, 140, 75, 0.95) !important;
  outline-offset: -2px;
  box-shadow: 0 6px 16px rgba(45, 100, 60, 0.14) !important;
}
html.exc-cream-site .exc-gl-item.is-exc-fav.gl1t,
html.exc-cream-site .gl1t.exc-gl-item.is-exc-fav:not(.is-exc-lib) {
  outline: 2px solid rgba(212, 136, 58, 0.95) !important;
  outline-offset: -2px;
  box-shadow: 0 6px 16px rgba(180, 100, 30, 0.14) !important;
}
html.exc-cream-site .exc-gl-item.is-exc-lib.is-exc-fav.gl1t,
html.exc-cream-site .gl1t.exc-gl-item.is-exc-lib.is-exc-fav {
  outline: 2px solid rgba(45, 140, 75, 0.95) !important;
  box-shadow:
    0 6px 16px rgba(45, 100, 60, 0.12),
    inset 0 0 0 2px rgba(212, 136, 58, 0.8) !important;
}
html.exc-cream-site tr:has(a:visited) > td.gl1e,
html.exc-cream-site tr.exc-gl-item.is-exc-seen > td.gl1e {
  box-shadow: inset 3px 0 0 #c4a574 !important;
}
html.exc-cream-site tr.exc-gl-item.is-exc-lib > td.gl1e {
  box-shadow: inset 3px 0 0 #2d8c4b !important;
}
html.exc-cream-site tr.exc-gl-item.is-exc-fav > td.gl1e {
  box-shadow: inset 3px 0 0 #d4883a !important;
}
html.exc-cream-site tr.exc-gl-item.is-exc-lib.is-exc-fav > td.gl1e {
  box-shadow: inset 3px 0 0 #2d8c4b, inset 6px 0 0 #d4883a !important;
}
/* 未访问：保留轻微压亮，不要 filter:none 冲掉层次 */
html.exc-cream-site .gl1t:not(:has(a:visited)):not(.is-exc-seen) img,
html.exc-cream-site tr.exc-gl-item:not(.is-exc-seen):not(:has(a:visited)) img,
html.exc-cream-site tr:not(.is-exc-seen):not(:has(a:visited)):not(:has(.is-exc-seen)) > td img {
  opacity: 1 !important;
  filter: brightness(0.94) saturate(0.96) !important;
}

/* 评论：同列表浮卡色阶 */
html.exc-cream-site #cdiv .c1,
html.exc-cream-site div.c1 {
  background: #efe4d4 !important;
  border: 1px solid #d4c2a8 !important;
  border-radius: 12px !important;
  color: #4a3728 !important;
  box-shadow: 0 4px 12px rgba(90, 60, 30, 0.08);
}
html.exc-cream-site #cdiv .c3,
html.exc-cream-site #cdiv .c5,
html.exc-cream-site #cdiv .c6 { color: #9a7d60 !important; }

/* 图片阅读页 chrome */
html.exc-cream-site #i1,
html.exc-cream-site #i2,
html.exc-cream-site #i3,
html.exc-cream-site #i4,
html.exc-cream-site #i5,
html.exc-cream-site #i6,
html.exc-cream-site #i7 {
  background: #f3ebe0 !important;
  color: #4a3728 !important;
  border-color: #e4d4bc !important;
}
html.exc-cream-site #i2 a,
html.exc-cream-site #i4 a,
html.exc-cream-site #i5 a,
html.exc-cream-site #i6 a,
html.exc-cream-site #i7 a { color: #8a5a20 !important; }

/* 页脚 / 杂项 */
html.exc-cream-site #footer,
html.exc-cream-site .dp,
html.exc-cream-site p.ip,
html.exc-cream-site .searchnav,
html.exc-cream-site .searchhead {
  color: #9a7d60 !important;
  background: transparent !important;
  border-color: #e4d4bc !important;
}
html.exc-cream-site hr {
  border-color: #e4d4bc !important;
  background: #e4d4bc !important;
}

/* 弹出层 / 提示（站点自带） */
html.exc-cream-site #csp,
html.exc-cream-site #eventpane,
html.exc-cream-site .ths,
html.exc-cream-site .tdn {
  background: #f6efe3 !important;
  color: #4a3728 !important;
  border-color: #e4d4bc !important;
}

/* 收藏夹色块页略提亮底 */
html.exc-cream-site #favform,
html.exc-cream-site .fp {
  background: #f6efe3 !important;
  color: #4a3728 !important;
}

html.exc-cream-site #jlc-wb,
html.exc-cream-site #jlc-wb-fab,
html.exc-cream-site #exc-wb-dialog,
html.exc-cream-site #exc-toast-host {
  color: inherit;
}
`;
  }
