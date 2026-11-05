// @@creamu-part:40-workbench-shell
const SCOUT_WORKBENCH_PAGE_NAMES = [
  'combo',
  'lexicon',
  'works',
  'publishers',
  'tracks',
  'blocks',
  'settings',
];
const __scoutWorkbenchDirtyPages = new Set(SCOUT_WORKBENCH_PAGE_NAMES);

function markScoutWorkbenchPagesDirty(...pageNames) {
  const names = pageNames.length ? pageNames : SCOUT_WORKBENCH_PAGE_NAMES;
  names.forEach((name) => {
    if (SCOUT_WORKBENCH_PAGE_NAMES.includes(name)) {
      __scoutWorkbenchDirtyPages.add(name);
    }
  });
}

function markScoutWorkbenchPageRendered(pageName) {
  __scoutWorkbenchDirtyPages.delete(pageName);
}

function isScoutWorkbenchPageDirty(pageName) {
  return __scoutWorkbenchDirtyPages.has(pageName);
}

function renderScoutWorkbenchTab(tabName) {
  const container = document.querySelector(`[data-jlc-wb-page="${tabName}"]`);
  if (container && container.childElementCount > 0 && !isScoutWorkbenchPageDirty(tabName)) {
    return false;
  }
  if (tabName === 'combo') renderComboPage();
  else if (tabName === 'lexicon') renderLexiconPage();
  else if (tabName === 'works') renderWorksPage();
  else if (tabName === 'publishers') renderPublishersPage();
  else if (tabName === 'tracks') renderTracksPage();
  else if (tabName === 'blocks') renderBlocksPage();
  else return false;
  return true;
}

function refreshScoutWorkbenchPageIfActive(pageName) {
  return refreshScoutWorkbenchPagesIfActive(pageName);
}

function refreshScoutWorkbenchPagesIfActive(...pageNames) {
  const workbench = document.getElementById('jlc-wb');
  if (!workbench || !workbench.classList.contains('is-open')) return false;
  refreshScoutWorkbenchContext();
  const active = workbench.querySelector('.jlc-wb-nav button.active');
  const activePageName = active && active.getAttribute('data-tab');
  const candidates = pageNames.length ? pageNames : SCOUT_WORKBENCH_PAGE_NAMES;
  if (!activePageName || !candidates.includes(activePageName)) return false;
  return renderScoutWorkbenchTab(activePageName);
}

function refreshScoutWorkbenchContext() {
  const wb = document.getElementById('jlc-wb');
  const context = document.getElementById('scout-workbench-context');
  if (!context || !wb.classList.contains('is-open')) return;
  if (detectPageKind() !== 'video') {
    context.hidden = true;
    context.replaceChildren();
    delete context.dataset.signature;
    return;
  }
  const signature = [
    location.href, getScoutLibraryRevision(),
    findScoutWorkFavoriteHost()?.textContent,
    findScoutPublisherAnchor(detectSite())?.textContent,
    document.querySelector('meta[property="og:image"]')?.content,
    ...getScoutPageTagAnchors(detectSite()).map(getScoutEnhanceTagText),
  ].join('|');
  if (context.dataset.signature === signature) return;
  const meta = scrapeVideoMeta();
  const saved = isWorkSaved(detectSite(), videoIdFromUrl(location.href));
  context.hidden = false;
  context.dataset.signature = signature;
  context.innerHTML = `<div class="scout-current-work-heading">
    ${meta.thumb ? `<img class="scout-current-work-cover" src="${escapeHtml(meta.thumb)}" alt="">` : ''}
    <div class="scout-current-work-copy"><small>当前作品 · ${escapeHtml(scoutSiteShortLabel(detectSite()))}</small>
    <strong title="${escapeHtml(meta.title)}">${escapeHtml(meta.title || '当前作品')}</strong>
    <span>${escapeHtml(meta.uploader || '发布者未提供')}${meta.tags.length ? ' · ' + meta.tags.length + ' 个标签' : ''}</span></div>
    <button type="button" class="jlc-wb-btn ghost" data-context-action="return">返回影片</button>
    </div><div class="scout-current-work-actions">
    <button type="button" class="jlc-wb-btn ghost" data-context-action="favorite" aria-pressed="${saved}">${saved ? '已收藏 · 更新' : '收藏作品'}</button>
    <button type="button" class="jlc-wb-btn ghost" data-context-action="tags"${meta.tags.length ? '' : ' disabled'}>用标签继续找</button></div>`;
  context.querySelector('img')?.addEventListener('error', event => event.currentTarget.remove(), { once: true });
  context.querySelector('[data-context-action="favorite"]').onclick = saveScoutCurrentWork;
  context.querySelector('[data-context-action="tags"]').onclick = () => {
    window.__scoutOpenWorkbench('combo');
    const picker = document.getElementById('scout-search-word-picker');
    if (picker) picker.open = true;
    document.querySelector('.scout-search-current-tags')?.scrollIntoView({ block: 'nearest' });
  };
  context.querySelector('[data-context-action="return"]').onclick = () => {
    window.__scoutCloseWorkbench();
    const title = findScoutWorkFavoriteHost();
    if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); title.scrollIntoView({ block: 'start' }); }
  };
}

function initScoutWorkbench() {
  if (typeof injectCreamuWorkbenchStyles === 'function') {
    injectCreamuWorkbenchStyles({
      styleId: 'scout-wb-style',
      extraCss: typeof getScoutThemeCss === 'function' ? getScoutThemeCss() : ''
    });
  }

  let fab = document.getElementById('jlc-wb-fab');
  if (!fab) {
    fab = document.createElement('button');
    fab.type = 'button';
    fab.setAttribute('aria-label', '打开 Scout 控制台');
    fab.setAttribute('aria-expanded', 'false');
    fab.id = 'jlc-wb-fab';
    fab.innerHTML = '<span class="scout-brand-mark" aria-hidden="true">S</span><span>Scout</span><span class="jlc-wb-fab-badge">0</span>';
    document.body.appendChild(fab);
  }

  if (!isScoutNarrowViewport()) {
    const fabPos = GM_getValue('scout_fab_pos', null);
    if (fabPos && (fabPos.left != null || fabPos.top != null)) {
      fab.style.left = fabPos.left;
      fab.style.top = fabPos.top;
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
    }
  }
  clampScoutFabPosition(fab);

  let wb = document.getElementById('jlc-wb');
  if (!wb) {
    wb = document.createElement('div');
    wb.id = 'jlc-wb';
    wb.tabIndex = -1;
    wb.setAttribute('role', 'region');
    wb.setAttribute('aria-label', 'Scout 控制台');
    wb.innerHTML = `
      <div class="jlc-wb-resize-w"></div>
      <div class="jlc-wb-resize-h"></div>
      <div class="jlc-wb-resize-corner"></div>

      <div class="jlc-wb-header">
        <div>
          <div class="jlc-wb-title">Creamu · Scout</div>
          <div class="jlc-wb-subtitle">发现 · 收藏 · 继续浏览</div>
        </div>
        <div class="jlc-wb-header-actions">
          <button type="button" class="jlc-wb-btn ghost" id="scout-wb-expand-btn">展开</button>
          <button type="button" class="jlc-wb-btn ghost" id="scout-wb-layout-btn">浮窗</button>
          <button type="button" class="jlc-wb-icon-btn" id="scout-wb-settings-btn" title="设置">⚙</button>
          <button type="button" class="jlc-wb-icon-btn" id="scout-wb-close-btn" title="最小化">✕</button>
        </div>
      </div>

      <div class="jlc-wb-nav" aria-label="控制台导航">
        <button type="button" class="active" data-tab="combo">搜索</button>
        <button type="button" data-tab="tracks">追更</button>
        <button type="button" data-tab="works">收藏</button>
        <button type="button" id="scout-wb-more-btn" aria-expanded="false">管理 ▾</button>
        <div class="scout-secondary-nav" hidden>
          <button type="button" data-tab="lexicon">词库</button>
          <button type="button" data-tab="publishers">熟人</button>
          <button type="button" data-tab="blocks">屏蔽</button>
        </div>
      </div>

      <section id="scout-workbench-context" aria-label="当前作品" hidden></section>
      <div class="jlc-wb-body">
        <div data-jlc-wb-page="combo"></div>
        <div data-jlc-wb-page="lexicon" hidden></div>
        <div data-jlc-wb-page="works" hidden></div>
        <div data-jlc-wb-page="publishers" hidden></div>
        <div data-jlc-wb-page="tracks" hidden></div>
        <div data-jlc-wb-page="blocks" hidden></div>
      </div>

      <div class="jlc-wb-settings" id="jlc-wb-settings">
        <div class="jlc-wb-settings-panel">
          <div class="jlc-wb-settings-head">
            <strong>设置</strong>
            <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-settings-close" title="关闭">×</button>
          </div>
          <div class="jlc-wb-settings-nav" id="scout-settings-nav">
            <button type="button" data-scout-settings-tab="overview" class="active">概况</button>
            <button type="button" data-scout-settings-tab="ui">界面</button>
            <button type="button" data-scout-settings-tab="backup">备份</button>
            <button type="button" data-scout-settings-tab="sync">同步</button>
          </div>
          <div class="jlc-wb-settings-body" id="scout-settings-body"></div>
        </div>
      </div>
    `;
    document.body.appendChild(wb);
  }

  // 预写入合法几何，避免 PC 端 top:auto 开在视口外
  applyScoutWorkbenchGeometry(wb);

  makeDraggable(fab, true);
  makeHeaderDraggable(wb, wb.querySelector('.jlc-wb-header'));
  makeResizable(wb);

  function triggerTab(tabName) {
    wb.querySelectorAll('.jlc-wb-nav [data-tab]').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    wb.querySelectorAll('[data-jlc-wb-page]').forEach(page => {
      if (page.getAttribute('data-jlc-wb-page') === tabName) {
        page.removeAttribute('hidden');
      } else {
        page.setAttribute('hidden', '');
      }
    });

    const secondary = ['lexicon', 'publishers', 'blocks'].includes(tabName);
    wb.querySelector('.scout-secondary-nav').hidden = !secondary;
    wb.querySelector('#scout-wb-more-btn').setAttribute('aria-expanded', String(secondary));
    if (isScoutNarrowViewport() && tabName !== 'combo') scoutDrawerExpanded = true;
    renderScoutWorkbenchTab(tabName);
    applyScoutWorkbenchGeometry(wb);
  }

  function openScoutWorkbench(tabName) {
    ensureScoutSearchContextDraft();
    wb.classList.add('is-open');
    fab.classList.add('is-panel-open');
    fab.setAttribute('aria-expanded', 'true');
    const tab = tabName || (wb.querySelector('.jlc-wb-nav button.active')?.getAttribute('data-tab')) || 'combo';
    triggerTab(tab);
    refreshScoutWorkbenchContext();
    wb.focus({ preventScroll: true });
  }

  function closeScoutWorkbench() {
    setScoutSettingsOpen(false);
    wb.classList.remove('is-open');
    fab.classList.remove('is-panel-open');
    fab.setAttribute('aria-expanded', 'false');
    applyScoutWorkbenchGeometry(wb);
    fab.focus({ preventScroll: true });
  }

  if (fab.dataset.scoutClickBound !== '1') {
    fab.dataset.scoutClickBound = '1';
    fab.addEventListener('click', (e) => {
      if (fab.dataset.suppressClick === '1' || fab.classList.contains('is-dragging')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (wb.classList.contains('is-open')) {
        closeScoutWorkbench();
      } else {
        openScoutWorkbench();
      }
    });
  }

  window.__scoutOpenWorkbench = openScoutWorkbench;
  window.__scoutCloseWorkbench = closeScoutWorkbench;
  wb.querySelector('#scout-wb-expand-btn').onclick = () => { scoutDrawerExpanded = !scoutDrawerExpanded; applyScoutWorkbenchGeometry(wb); };
  wb.querySelector('#scout-wb-layout-btn').onclick = () => {
    GM_setValue('scout_wb_layout', wb.classList.contains('is-docked') ? 'float' : 'dock');
    applyScoutWorkbenchGeometry(wb);
  };
  wb.querySelector('#scout-wb-more-btn').onclick = (event) => {
    const menu = wb.querySelector('.scout-secondary-nav');
    menu.hidden = !menu.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!menu.hidden));
  };
  wb.addEventListener('focusin', (event) => {
    if (isScoutNarrowViewport() && event.target.matches('input, textarea')) {
      scoutDrawerExpanded = true;
      applyScoutWorkbenchGeometry(wb);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !wb.classList.contains('is-open') || document.querySelector('dialog[open]')) return;
    if (wb.querySelector('.jlc-wb-settings.is-open')) setScoutSettingsOpen(false);
    else closeScoutWorkbench();
  });
  document.addEventListener('fullscreenchange', () => {
    document.documentElement.classList.toggle('scout-player-fullscreen', !!document.fullscreenElement);
    if (document.fullscreenElement) { stopListPreview(); closeScoutWorkbench(); }
  });
  window.visualViewport?.addEventListener('resize', () => { if (wb.classList.contains('is-open')) applyScoutWorkbenchGeometry(wb); });
  window.visualViewport?.addEventListener('scroll', () => { if (wb.classList.contains('is-open') && isScoutNarrowViewport()) applyScoutWorkbenchGeometry(wb); });

  const closeBtn = wb.querySelector('#scout-wb-close-btn');
  if (closeBtn && closeBtn.dataset.scoutBound !== '1') {
    closeBtn.dataset.scoutBound = '1';
    closeBtn.addEventListener('click', () => closeScoutWorkbench());
  }

  const settingsBtn = wb.querySelector('#scout-wb-settings-btn');
  if (settingsBtn && settingsBtn.dataset.scoutBound !== '1') {
    settingsBtn.dataset.scoutBound = '1';
    settingsBtn.addEventListener('click', () => {
      const drawer = wb.querySelector('#jlc-wb-settings');
      const open = !(drawer && drawer.classList.contains('is-open'));
      setScoutSettingsOpen(open);
    });
  }

  const settingsClose = wb.querySelector('#jlc-wb-settings-close');
  if (settingsClose && settingsClose.dataset.scoutBound !== '1') {
    settingsClose.dataset.scoutBound = '1';
    settingsClose.addEventListener('click', () => setScoutSettingsOpen(false));
  }

  const settingsMask = wb.querySelector('#jlc-wb-settings');
  if (settingsMask && settingsMask.dataset.scoutMaskBound !== '1') {
    settingsMask.dataset.scoutMaskBound = '1';
    settingsMask.addEventListener('click', (e) => {
      if (e.target === settingsMask) setScoutSettingsOpen(false);
    });
  }

  if (wb.dataset.scoutNavBound !== '1') {
    wb.dataset.scoutNavBound = '1';
    wb.querySelectorAll('.jlc-wb-nav [data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        setScoutSettingsOpen(false);
        triggerTab(btn.getAttribute('data-tab'));
      });
    });
  }

  if (wb.dataset.scoutSettingsNavBound !== '1') {
    wb.dataset.scoutSettingsNavBound = '1';
    wb.querySelectorAll('[data-scout-settings-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-scout-settings-tab') || 'overview';
        wb.querySelectorAll('[data-scout-settings-tab]').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-scout-settings-tab') === tab);
        });
        renderScoutSettingsSection(tab);
      });
    });
  }

  if (!window.__creamuScoutWbResizeBound) {
    window.__creamuScoutWbResizeBound = true;
    window.addEventListener('resize', () => {
      clampScoutFabPosition(fab);
      if (wb.classList.contains('is-open')) {
        applyScoutWorkbenchGeometry(wb);
      }
    }, { passive: true });
  }
}
