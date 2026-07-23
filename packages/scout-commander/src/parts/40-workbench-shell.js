// @@creamu-part:40-workbench-shell
function initScoutWorkbench() {
  if (typeof injectCreamuWorkbenchStyles === 'function') {
    injectCreamuWorkbenchStyles({
      styleId: 'scout-wb-style',
      extraCss: typeof getScoutThemeCss === 'function' ? getScoutThemeCss() : ''
    });
  }

  let fab = document.getElementById('jlc-wb-fab');
  if (!fab) {
    fab = document.createElement('div');
    fab.id = 'jlc-wb-fab';
    fab.innerHTML = '<span class="jlc-wb-fab-badge">0</span>🧭';
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
  dockMobileFabStack();
  if (!window.__scoutFabDockBound) {
    window.__scoutFabDockBound = true;
    window.addEventListener('resize', () => {
      clampScoutFabPosition(document.getElementById('jlc-wb-fab'));
      dockMobileFabStack();
    }, { passive: true });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        clampScoutFabPosition(document.getElementById('jlc-wb-fab'));
        dockMobileFabStack();
      }, 120);
    }, { passive: true });
  }

  let wb = document.getElementById('jlc-wb');
  if (!wb) {
    wb = document.createElement('div');
    wb.id = 'jlc-wb';
    wb.innerHTML = `
      <div class="jlc-wb-resize-w"></div>
      <div class="jlc-wb-resize-h"></div>
      <div class="jlc-wb-resize-corner"></div>

      <div class="jlc-wb-header">
        <div>
          <div class="jlc-wb-title">Creamu · Scout</div>
          <div class="jlc-wb-subtitle">欧美发现工作台 v${SCOUT_VERSION}</div>
        </div>
        <div class="jlc-wb-header-actions">
          <button type="button" class="jlc-wb-icon-btn" id="scout-wb-settings-btn" title="设置">⚙</button>
          <button type="button" class="jlc-wb-icon-btn" id="scout-wb-close-btn" title="最小化">✕</button>
        </div>
      </div>

      <div class="jlc-wb-nav">
        <button class="active" data-tab="combo">组合</button>
        <button data-tab="lexicon">词库</button>
        <button data-tab="works">作品</button>
        <button data-tab="publishers">熟人</button>
        <button data-tab="tracks">追更</button>
        <button data-tab="blocks">屏蔽</button>
      </div>

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
    wb.querySelectorAll('.jlc-wb-nav button').forEach(btn => {
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

    if (tabName === 'combo') renderComboPage();
    else if (tabName === 'lexicon') renderLexiconPage();
    else if (tabName === 'works') renderWorksPage();
    else if (tabName === 'publishers') renderPublishersPage();
    else if (tabName === 'tracks') renderTracksPage();
    else if (tabName === 'blocks') renderBlocksPage();
  }

  function openScoutWorkbench(tabName) {
    applyScoutWorkbenchGeometry(wb);
    wb.classList.add('is-open');
    fab.classList.add('is-panel-open');
    // PC 端不要锁 body 滚动：部分站点会因此产生遮罩/焦点异常，表现为“点了没开”
    if (window.matchMedia && window.matchMedia('(max-width: 820px)').matches) {
      document.body.style.overflow = 'hidden';
    }
    const tab = tabName || (wb.querySelector('.jlc-wb-nav button.active')?.getAttribute('data-tab')) || 'combo';
    triggerTab(tab);
  }

  function closeScoutWorkbench() {
    setScoutSettingsOpen(false);
    wb.classList.remove('is-open');
    fab.classList.remove('is-panel-open');
    document.body.style.overflow = '';
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
    wb.querySelectorAll('.jlc-wb-nav button').forEach(btn => {
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

  renderComboPage();
}
