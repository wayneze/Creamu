  let nativeSearchLayout = null;
  let nativeResultNavigation = null;

  function applyListCardLayout(card) {
    if (!card.matches('.gl1t')) return;
    let disclosure = card.querySelector(':scope > .exc-native-tags');
    if (!config.cream_site_theme) {
      if (disclosure) disclosure.replaceWith(...disclosure.querySelectorAll('.gl6t'));
      return;
    }
    const tags = card.querySelector('.gl6t');
    if (!tags || disclosure) return;
    disclosure = document.createElement('details');
    disclosure.className = 'exc-native-tags';
    const summary = document.createElement('summary');
    summary.textContent = '全部标签 · ' + tags.children.length;
    tags.replaceWith(disclosure);
    disclosure.append(summary, tags);
  }

  function applyResultNavigationLayout(enabled) {
    const range = document.getElementById('rangebar');
    if (nativeResultNavigation && (!enabled || nativeResultNavigation.range !== range)) {
      nativeResultNavigation.entries.forEach(({ node, anchor }) => anchor.replaceWith(node));
      nativeResultNavigation.shell.remove();
      nativeResultNavigation = null;
    }
    if (!enabled || !range || nativeResultNavigation) return;
    const parent = range.parentElement;
    const count = parent.querySelector(':scope > .searchtext');
    const pager = parent.querySelector(':scope > .searchnav');
    if (!count || !pager) return;
    const shell = document.createElement('div');
    shell.className = 'exc-result-navigation';
    parent.insertBefore(shell, range);
    const entries = [range, count, pager].map((node) => {
      const anchor = document.createComment('Creamu: native result navigation');
      node.replaceWith(anchor);
      shell.append(node);
      return { node, anchor };
    });
    nativeResultNavigation = { range, shell, entries };
  }

  function applyCompactSearchLayout(enabled) {
    const form = document.querySelector('#searchbox > form');
    if (nativeSearchLayout && (!enabled || nativeSearchLayout.form !== form)) {
      const previous = nativeSearchLayout;
      previous.observer.disconnect();
      previous.form.removeEventListener('keydown', previous.onKeydown);
      previous.form.classList.remove('exc-search-compact', 'exc-categories-open');
      previous.queryRow.classList.remove('exc-search-query');
      previous.optionsRow.classList.remove('exc-search-options');
      previous.categories.classList.remove('exc-search-categories');
      if (!previous.categoryId) previous.categories.removeAttribute('id');
      previous.button.remove();
      nativeSearchLayout = null;
    }
    if (!enabled || !form || nativeSearchLayout) return;
    const search = form.querySelector('#f_search');
    const queryRow = search?.parentElement;
    const categories = form.querySelector(':scope > table.itc');
    const optionsRow = Array.from(form.children).find((node) =>
      node.querySelector('a[onclick*="toggle_advsearch_pane"], a[onclick*="toggle_filesearch_pane"]')
    );
    if (!categories || queryRow?.parentElement !== form || !optionsRow) return;

    // Keep native nodes, handlers and form values; only their visual order changes.
    const categoryId = categories.id;
    if (!categoryId) categories.id = 'exc-search-categories';
    form.classList.add('exc-search-compact');
    queryRow.classList.add('exc-search-query');
    optionsRow.classList.add('exc-search-options');
    categories.classList.add('exc-search-categories');
    const button = document.createElement('button');
    button.id = 'exc-search-filter-toggle';
    button.type = 'button';
    button.setAttribute('aria-controls', categories.id);
    const update = () => {
      const excluded = Array.from(categories.querySelectorAll('.cs[data-disabled]'));
      const open = form.classList.contains('exc-categories-open');
      button.textContent = '分类 · ' + (excluded.length ? '排除 ' + excluded.length + ' 类' : '全部') + (open ? ' ▴' : ' ▾');
      button.setAttribute('aria-expanded', String(open));
      button.classList.toggle('is-filtered', excluded.length > 0);
      button.title = excluded.length
        ? '已排除：' + excluded.map((node) => compactText(node.textContent)).join('、')
        : '展开画廊分类筛选';
    };
    button.addEventListener('click', () => {
      form.classList.toggle('exc-categories-open');
      update();
    });
    const onKeydown = (event) => {
      if (event.key !== 'Escape' || !form.classList.contains('exc-categories-open')) return;
      form.classList.remove('exc-categories-open');
      update();
      button.focus({ preventScroll: true });
      event.preventDefault();
      event.stopPropagation();
    };
    form.addEventListener('keydown', onKeydown);
    optionsRow.prepend(button);
    const observer = new MutationObserver(update);
    observer.observe(categories, { subtree: true, attributes: true, attributeFilter: ['data-disabled'] });
    nativeSearchLayout = { form, queryRow, optionsRow, categories, categoryId, button, observer, onKeydown };
    update();
  }

  function applyCreamSiteTheme() {
    const on = !!config.cream_site_theme;
    applyCompactSearchLayout(on);
    applyResultNavigationLayout(on);
    document.querySelectorAll('.gl1t.exc-gl-item').forEach(applyListCardLayout);
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
/* 柔和灰米底保留封面原色，原站搜索与可展开筛选共用紧凑工具栏。 */
html.exc-cream-site, html.exc-cream-site body { background: var(--exc-page-bg) !important; color: #353832 !important; font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif !important; color-scheme: light; }
html.exc-cream-site body a:not(:where(#jlc-wb *, #exc-wb-dialog *, #jlc-wb-dialog *, #exc-gallery-panel *, #exc-hover-preview *)) { color: #48583d !important; }
html.exc-cream-site body a:not(:where(#jlc-wb *, #exc-wb-dialog *, #jlc-wb-dialog *, #exc-gallery-panel *, #exc-hover-preview *)):hover { color: #34452b !important; }
html.exc-cream-site #nb { background: var(--exc-surface) !important; border-bottom: 1px solid var(--exc-line) !important; box-shadow: none; padding: 4px 10px !important; min-width: 0 !important; max-height: none !important; line-height: 20px; }
html.exc-cream-site #nb div, html.exc-cream-site #nb a { background: transparent !important; color: #48583d !important; border-color: var(--exc-line) !important; }
html.exc-cream-site .ido:has(.itg) { width: auto !important; max-width: none !important; margin: 6px 0 5px !important; padding: 5px 10px 10px !important; border: 0 !important; min-width: 0 !important; box-sizing: border-box; }
html.exc-cream-site #searchbox { width: auto; max-width: 100%; margin: 0 auto 4px !important; padding: 3px 6px !important; border: 0 !important; box-sizing: border-box; }
html.exc-cream-site #searchbox .itc { border-spacing: 2px 0; }
html.exc-cream-site #searchbox .itc td { padding: 1px 4px; }
html.exc-cream-site #searchbox .exc-search-compact { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 16px; }
html.exc-cream-site #searchbox .exc-search-query { order: 0; flex: 1 1 300px; display: flex; align-items: center; gap: 6px; min-width: 0; padding: 0 !important; }
html.exc-cream-site #searchbox .exc-search-query input { box-sizing: border-box; margin: 0; min-height: 30px; }
html.exc-cream-site #searchbox .exc-search-query #f_search { flex: 1; width: 0; min-width: 80px; padding: 4px 8px; }
html.exc-cream-site #searchbox .exc-search-options { order: 1; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; padding: 0 !important; font-size: 0; }
html.exc-cream-site #searchbox .exc-search-options a { font-size: 11px; line-height: 30px; white-space: nowrap; }
html.exc-cream-site #exc-search-filter-toggle { font: 600 12px/1.3 'Segoe UI', 'Microsoft YaHei', sans-serif; min-height: 30px; padding: 4px 8px; cursor: pointer; white-space: nowrap; }
html.exc-cream-site #exc-search-filter-toggle.is-filtered { border-color: #758f61 !important; color: #3f5035 !important; background: #e3eadb !important; }
html.exc-cream-site #exc-search-filter-toggle:focus-visible { outline: 2px solid #758f61; outline-offset: 2px; }
html.exc-cream-site #searchbox .exc-search-categories { order: 2; flex: 1 0 100%; width: 100%; margin: 0; padding: 6px 0; border-top: 1px solid var(--exc-line); }
html.exc-cream-site #searchbox .exc-search-compact:not(.exc-categories-open) > .exc-search-categories { display: none !important; }
html.exc-cream-site #searchbox .exc-search-categories tbody { display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 5px; }
html.exc-cream-site #searchbox .exc-search-categories tr { display: contents; }
html.exc-cream-site #searchbox .exc-search-categories td { padding: 0; }
html.exc-cream-site #searchbox .exc-search-categories .cs { min-height: 22px; line-height: 22px; cursor: pointer; }
html.exc-cream-site #searchbox .exc-search-compact > #advdiv { order: 3; flex: 1 0 100%; max-width: 100%; }
html.exc-cream-site #searchbox .searchadv > div { flex-wrap: wrap; }
html.exc-cream-site #fsdiv { width: auto; max-width: 100%; box-sizing: border-box; }
html.exc-cream-site #fsdiv input[type="file"] { max-width: 100%; box-sizing: border-box; }
/* 原站范围、结果数和分页共用一栏；保留链接、禁用状态与跳页弹窗。 */
html.exc-cream-site .exc-result-navigation {
  display: flex; flex-wrap: wrap; align-items: center; gap: 0 16px;
  padding: 2px 6px 0; margin: 0 0 6px; min-width: 0;
}
html.exc-cream-site .searchtext { padding: 0; color: #697065 !important; font-size: 12px; line-height: 30px; text-align: left; }
html.exc-cream-site .searchtext p { padding: 0; margin: 0; }
html.exc-cream-site .exc-result-navigation > .searchtext { flex: 1 1 auto; }
html.exc-cream-site .searchnav { gap: 4px; padding: 4px 0; font-size: 12px; line-height: 20px; flex-wrap: wrap; min-width: 0; }
html.exc-cream-site .searchnav > div { padding: 0 !important; width: auto !important; flex: 0 0 auto; text-align: center !important; font-size: inherit; }
html.exc-cream-site .searchnav > div:empty { display: none; }
html.exc-cream-site .searchnav > div > :is(a, span) { display: inline-flex; align-items: center; justify-content: center; padding: 4px 7px; border-radius: 5px; white-space: nowrap; }
html.exc-cream-site .searchnav > div > a:hover { background: var(--exc-muted-surface); }
html.exc-cream-site .searchnav > div > span { color: #8b8f84; }
html.exc-cream-site .searchnav select { width: auto; max-width: 120px; min-height: 28px; margin-left: 8px; padding: 2px 6px; font-size: 12px; }
html.exc-cream-site .searchnav .jumpbox { min-width: 90px; }
html.exc-cream-site .searchnav .jumpbox > input { box-sizing: border-box; width: 104px; max-width: 100%; min-height: 28px; top: 0; left: 0; margin: 0; }
html.exc-cream-site .searchnav .jumppop { border: 1px solid var(--exc-line); background: var(--exc-surface) !important; border-radius: 8px; box-shadow: 0 6px 20px #292e2926; padding: 8px; font-size: 12px; }
html.exc-cream-site #rangebar {
  order: 2; flex: 1 0 100%; box-sizing: border-box; width: 100%; max-width: 100%;
  margin: 0; padding: 0; height: 14px; gap: 0; align-items: center;
  border: 0; border-radius: 0; background: transparent !important; box-shadow: none;
}
html.exc-cream-site #rangebar:empty { display: none; }
html.exc-cream-site #rangebar > a { display: flex; align-items: center; flex: 1 1 0; height: 14px; padding: 0 1px; min-width: 0; box-sizing: border-box; }
html.exc-cream-site #rangebar div { width: 100%; height: 3px; border-radius: 2px; background: #c9cbbf !important; box-shadow: none; }
html.exc-cream-site #rangebar > div { flex: 1 1 0; margin: 0 1px; }
html.exc-cream-site #rangebar div[data-inrange] { background: #7e8d71 !important; }
html.exc-cream-site #rangebar a:hover > div, html.exc-cream-site #rangebar a:focus-visible > div { background: #526347 !important; height: 5px; }
@media (max-width: 820px) {
  html.exc-cream-site .exc-result-navigation { gap: 0 8px; padding-inline: 0; }
  html.exc-cream-site .exc-result-navigation > .searchnav { flex: 1 1 100%; justify-content: flex-start; gap: 2px; }
  html.exc-cream-site .searchnav > div > :is(a, span) { padding-inline: 5px; }
  html.exc-cream-site .searchnav select { margin-left: 0; }
}
/* Native gallery nodes keep their handlers and data; the layout owns sizing. */
html.exc-cream-site :is(.ido, #ido) { background: transparent !important; color: #353832 !important; }
html.exc-cream-site :is(.stuffbox, .homebox, .d, #gw, #gm, .gm) { background: var(--exc-surface) !important; color: #353832 !important; border-color: var(--exc-line) !important; }
html.exc-cream-site :is(.gm, .dp, .gtb, #gdo, #asm, #gdt) { min-width: 0 !important; box-sizing: border-box; }
html.exc-cream-site .gm:has(> #gleft) { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 0 24px; padding: 22px; border-radius: 12px; }
html.exc-cream-site #gleft { position: static; width: auto; height: auto; grid-column: 1; grid-row: 1 / 3; min-width: 0; }
html.exc-cream-site #gd1 { display: flex !important; float: none; width: 100%; height: auto; padding: 0; margin: 0; background: var(--exc-muted-surface); border-radius: 8px; overflow: hidden; }
html.exc-cream-site #gd1 > div { width: 100% !important; max-height: 330px; margin: 0; border: 0; background-size: contain !important; background-position: center !important; background-repeat: no-repeat !important; }
html.exc-cream-site #gd1 img { display: block; max-width: 100%; max-height: 330px; object-fit: contain; margin: auto; }
html.exc-cream-site #gd2 { grid-column: 2; float: none; width: auto; min-width: 0; min-height: 0; padding: 0 0 16px; margin: 0; text-align: left; background: transparent !important; }
html.exc-cream-site :is(#gn, #gj) { padding: 0; margin: 0; border: 0; text-align: left; color: #353832; overflow-wrap: anywhere; }
html.exc-cream-site #gn { font-size: 21px; line-height: 1.4; font-weight: 650; }
html.exc-cream-site #gj { margin-top: 6px; font-size: 13px; line-height: 1.5; color: #697065; font-weight: 400; }
html.exc-cream-site #gmid { grid-column: 2; display: grid; grid-template-columns: 165px minmax(0, 1fr); gap: 16px; float: none; width: auto; height: auto; background: transparent !important; min-width: 0; }
html.exc-cream-site :is(#gd3, #gd4, #gd5) { float: none; width: auto; min-width: 0; padding: 0; margin: 0; border: 0; background: transparent !important; font-size: 12px; }
html.exc-cream-site #gd3 { padding-right: 14px; border-right: 1px solid var(--exc-line); }
html.exc-cream-site :is(#gdn, #gdd, #gdr, #gdf, #gds) { background: transparent !important; color: #353832; border-color: var(--exc-line); }
html.exc-cream-site :is(#gdc, #gdn, #gdd, #gdr, #gdf) { width: auto; margin: 0; text-align: left; }
html.exc-cream-site :is(#gdd, #gdr) table { width: 100%; margin: 6px 0; }
html.exc-cream-site #gdd td { padding-block: 3px; white-space: normal; }
html.exc-cream-site #gdd td:first-child { white-space: nowrap; }
html.exc-cream-site #gdn { padding: 8px 0; overflow-wrap: anywhere; }
html.exc-cream-site #gdf { float: none; padding: 10px 0 0; font-size: 12px; }
html.exc-cream-site #gd5 { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px 18px; border-top: 1px solid var(--exc-line); padding-top: 10px; }
html.exc-cream-site #gd5 p { padding: 0; margin: 0; line-height: 26px; }
html.exc-cream-site #taglist { height: auto; min-height: 0; padding: 0; overflow: visible; }
html.exc-cream-site #taglist table { width: 100%; }
html.exc-cream-site #taglist td { padding: 3px 0; vertical-align: top; }
html.exc-cream-site #taglist td.tc { width: 70px; color: #697065; font-size: 11px; padding-right: 8px; }
html.exc-cream-site :is(#tagmenu_act, #tagmenu_new) { width: auto; padding-top: 10px; }
html.exc-cream-site #tagmenu_new input[type=text] { max-width: 65%; box-sizing: border-box; }
@media (max-width: 820px) {
  html.exc-cream-site .gm:has(> #gleft) { grid-template-columns: 110px minmax(0, 1fr); gap: 14px; padding: 14px; }
  html.exc-cream-site #gleft { grid-row: 1; }
  html.exc-cream-site #gd1 > div { max-height: 160px; }
  html.exc-cream-site #gd2 { align-self: center; padding: 0; }
  html.exc-cream-site #gn { font-size: 16px; }
  html.exc-cream-site #gj { font-size: 11px; }
  html.exc-cream-site #gmid { grid-column: 1 / -1; grid-template-columns: minmax(0, 1fr); gap: 14px; }
  html.exc-cream-site #gd3 { border-right: 0; border-bottom: 1px solid var(--exc-line); padding: 0 0 12px; }
  html.exc-cream-site #gdd table { width: 100%; }
  html.exc-cream-site #gmid > .c, html.exc-cream-site .gm:has(> #gleft) > .c { display: none; }
}

html.exc-cream-site :is(input, textarea, select, button):not(:where(#jlc-wb *, #jlc-wb-fab, #exc-wb-dialog *, #jlc-wb-dialog *, .exc-tool-btn, .exc-meta-act, .exc-fold-tag, .exc-track-btn, #exc-gallery-panel *, #exc-hover-preview *)) {
  background: var(--exc-surface) !important; color: #353832 !important; border: 1px solid #c9cdc1 !important; border-radius: 6px !important; box-shadow: none !important; color-scheme: light;
}
html.exc-cream-site .cs { border-radius: 5px !important; }
html.exc-cream-site table.itg { background: transparent !important; border-collapse: separate !important; border-spacing: 0 9px !important; color: #353832 !important; }
html.exc-cream-site table.itg > tbody > tr, html.exc-cream-site table.itg th { background: transparent !important; color: #353832 !important; border: 0 !important; }
html.exc-cream-site table.itg > tbody > tr > td { background: var(--exc-surface) !important; color: #353832 !important; border: 0 !important; border-block: 1px solid var(--exc-line) !important; vertical-align: middle; }
html.exc-cream-site table.itg > tbody > tr > td:first-child { border-left: 1px solid var(--exc-line) !important; border-radius: 8px 0 0 8px !important; }
html.exc-cream-site table.itg > tbody > tr > td:last-child { border-right: 1px solid var(--exc-line) !important; border-radius: 0 8px 8px 0 !important; }
html.exc-cream-site table.itg > tbody > tr:hover > td { background: #f4f5ef !important; }
html.exc-cream-site :is(.gl1e, .gl2e, .gl3e, .gl4e, .gl1c, .gl2c, .gl3c, .gl4c, .gltc, .gltm, .glname, .glink, .glhide) { background: transparent !important; color: #353832 !important; border-color: var(--exc-line) !important; }
/* A stable cover/title/metadata rhythm, independent of native image dimensions. */
html.exc-cream-site .itg:has(> .gl1t.exc-gl-item) {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 272px), 1fr));
  gap: 22px 18px; padding: 8px !important; border: 0 !important;
  width: 100% !important; box-sizing: border-box; align-items: stretch;
}
@media (max-width: 820px) {
  html.exc-cream-site .itg:has(> .gl1t.exc-gl-item) { gap: 18px 14px; padding: 6px !important; }
}
html.exc-cream-site .gl1t { background: var(--exc-surface) !important; border: 1px solid var(--exc-line) !important; border-radius: 9px !important; overflow: hidden; }
html.exc-cream-site .gl1t:hover { border-color: #a9b49d !important; }
html.exc-cream-site .gl1t.exc-gl-item { width: auto; min-width: 0; max-width: none; margin: 0 !important; padding: 0; gap: 0; }
html.exc-cream-site .gl1t > .gl3t { order: -2; width: calc(100% - 20px) !important; height: auto !important; aspect-ratio: 4 / 5; margin: 10px 10px 0; border: 0; border-radius: 5px; display: flex; align-items: center; justify-content: center; }
html.exc-cream-site .gl3t > a { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
html.exc-cream-site .gl3t > a > img { width: 100% !important; height: 100% !important; top: auto !important; left: auto !important; object-fit: contain; }
html.exc-cream-site .gl1t > :is(.gl4t, a:has(> .gl4t)) { order: -1; }
html.exc-cream-site .gl1t .gl4t { margin: 10px 12px 6px; padding: 0; min-height: 38px; max-height: 38px; line-height: 19px; font-size: 12px; text-align: left; }
html.exc-cream-site :is(.gl4t.glink, .gl4t .glink) { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-weight: 600; }
html.exc-cream-site .gl1t > .gl5t { width: auto; height: auto; margin: 0; padding: 0 12px 8px; display: flex; justify-content: space-between; gap: 8px; font-size: 10px; color: #697065; }
html.exc-cream-site .gl5t > div { display: flex; flex-direction: column; gap: 5px; min-width: 0 !important; max-width: none !important; padding: 0 !important; }
html.exc-cream-site .gl5t > div > div { position: static !important; margin: 0; }
html.exc-cream-site .gl5t > div > div:not(.ir) { width: auto !important; height: auto !important; text-align: left !important; }
html.exc-cream-site .gl5t > div:nth-child(2) { display: grid; grid-template-columns: auto 15px; gap: 4px 6px; align-content: start; align-items: center; }
html.exc-cream-site .gl5t .ir { grid-column: 1 / -1; }
html.exc-cream-site :is(.gl5t, #gdc) :is(.cs, .cn) { background: var(--exc-muted-surface) !important; color: #59614f !important; border: 1px solid var(--exc-line); box-shadow: none; text-shadow: none; font-weight: 500; font-size: 10px; height: auto; line-height: 17px; }
html.exc-cream-site .exc-native-tags { margin: 0 12px 8px; font-size: 10px; color: #697065; }
html.exc-cream-site .exc-native-tags summary { cursor: pointer; padding: 3px 0; width: fit-content; }
html.exc-cream-site .exc-native-tags .gl6t { justify-content: flex-start; padding: 5px 0 0; }
html.exc-cream-site .gl1t .exc-tool-bar { order: 2; padding: 5px 6px; }
html.exc-cream-site :is(.glthumb, .gl3t, .gl3t a, .glthumb div) { background-color: var(--exc-muted-surface) !important; border-color: var(--exc-line) !important; }
html.exc-cream-site :is(.ptt, .ptb) td { background: var(--exc-surface) !important; border: 1px solid var(--exc-line) !important; color: #48583d !important; border-radius: 5px; box-shadow: none; }
html.exc-cream-site :is(.ptt, .ptb) td.ptds { background: #526347 !important; border-color: #526347 !important; }
html.exc-cream-site :is(.ptt, .ptb) td.ptds a { color: white !important; }

/* Native tags remain available; grid cards disclose the full list on demand. */
html.exc-cream-site :is(.gt, .gtl, .gtw) { background: #dbddd299 !important; border: 1px solid #c4c9bb !important; color: #59614f !important; border-radius: 4px !important; box-shadow: none; font-size: 10px; line-height: 16px; }
html.exc-cream-site :is(.gt, .gtl, .gtw):hover { background: #d2dac8 !important; border-color: #a9b49d !important; }
html.exc-cream-site #gdt { background: transparent !important; border: 0 !important; padding: 12px 0; max-width: 1180px; }
html.exc-cream-site #gdt :is(.gdtm, .gdtl) { background-color: transparent !important; border-color: var(--exc-line) !important; }
html.exc-cream-site #gdt > a > div { border-color: var(--exc-line); border-radius: 5px; }
html.exc-cream-site #gdt a img { border-color: var(--exc-line) !important; border-radius: 5px; opacity: 1 !important; filter: none !important; }
html.exc-cream-site :is(#cdiv .c1, div.c1) { background: var(--exc-surface) !important; border: 1px solid var(--exc-line) !important; border-radius: 8px; color: #353832 !important; box-shadow: none; }
html.exc-cream-site #cdiv :is(.c3, .c5, .c6) { color: #697065 !important; }

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

`;
  }
