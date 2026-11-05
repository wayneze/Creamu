let fc2Workbench;

function createFc2LibraryRow(channel, record) {
  const link = { href: fc2RoomUrl(channel), target: '_blank', rel: 'noopener noreferrer' };
  const cover = fc2El('a', { ...link, class: 'jlc-wb-cover', 'aria-label': `进入 ${channel.name}（新标签页）` },
    fc2El('span', { class: 'fc-library-placeholder', text: 'LIVE', 'aria-hidden': 'true' }));
  if (channel.image) {
    const image = fc2El('img', { src: channel.image, alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
    image.addEventListener('error', () => image.remove(), { once: true });
    cover.append(image);
  }
  const current = fc2Id(location.pathname.split('/')[1]) === channel.id;
  const info = [
    channel.observed ? `${channel.viewers.toLocaleString()} 人在看` : '',
    channel.observed ? channel.access || (channel.pay === 1 ? '付费' : channel.pay === 0 ? '免费' : '费用未知') : '',
    current ? '当前房间' : '',
    record.visitedAt ? `${new Date(record.visitedAt).toLocaleString()} 访问` : ''
  ].filter(Boolean).join(' · ');
  const actions = fc2ChannelActions(channel, record);
  if (fc2Multiview) actions.unshift(fc2Button(fc2Multiview.has(channel.id) ? '已在同屏' : '加入同屏', () => fc2Multiview.add(channel),
    { disabled: fc2Multiview.has(channel.id) ? '' : null }));
  actions.forEach(button => { button.className = 'jlc-wb-btn ghost'; });
  const row = fc2El('article', { class: 'jlc-wb-item fc-library-item', 'data-channel-id': channel.id,
    'aria-current': current ? 'page' : null, 'data-followed': !!record.followed },
    fc2El('div', { class: 'jlc-wb-item-row' }, cover,
      fc2El('div', { class: 'jlc-wb-item-body' },
        fc2El('div', { class: 'jlc-wb-item-title-row' },
          fc2El('a', { ...link, class: 'jlc-wb-item-title fc-library-title',
            text: channel.title || channel.name, title: `${channel.title || channel.name}（新标签页）` }),
          fc2El('span', { class: 'jlc-wb-leaf fc-library-status', 'data-live': !!channel.observed,
            text: channel.observed ? channel.type === 2 ? '一对一' : '直播中' : '状态未确认' })),
        fc2El('a', { ...link, class: 'fc-library-name', text: `${channel.name} · ${channel.id}` }),
        info ? fc2El('p', { class: 'fc-library-meta', text: info, title: info }) : null)),
    record.note ? fc2El('p', { class: 'fc-library-note', text: record.note, title: record.note }) : null,
    record.tags?.length ? fc2El('div', { class: 'fc-library-tags' }, record.tags.map(text => fc2El('span', { text }))) : null,
    fc2El('div', { class: 'jlc-wb-item-actions' }, actions));
  bindFc2VisitLinks(row, channel);
  return row;
}

function mountFc2Workbench() {
  const storageKey = 'creamu_fc2_workbench';
  const saved = GM_getValue(storageKey, {}) || {};
  const views = { following: '我的关注', recent: '最近访问', blocked: '黑名单' };
  const filters = { view: Object.hasOwn(views, saved.view) ? saved.view : 'following',
    query: '', category: '', fee: '', type: '', sort: 'popular', liveOnly: false };
  let adult = location.pathname.startsWith('/adult')
    || readFc2Library()[fc2Id(location.pathname.split('/')[1])]?.adult === true;
  let previousFocus;
  let rect = saved.rect;
  let panelMode = saved.panelMode === 'dock' ? 'dock' : 'float';
  let dockWidth = 0;
  const root = document.documentElement;
  const batchSize = 40;
  let visibleCount = batchSize;
  let selectedChannels = [];
  let currentRecords = {};
  let renderedSignature = '';
  const narrow = matchMedia('(max-width:820px)');
  const geometryOptions = { minWidth: 360, minHeight: 320 };
  const save = changes => GM_setValue(storageKey, { ...GM_getValue(storageKey, {}), ...changes });
  injectCreamuWorkbenchStyles({
    styleId: 'fc-workbench-theme', panelSelector: '#fc-wb', fabSelector: '#fc-wb-fab',
    extraCss: `
      #fc-wb, #fc-wb-fab {
        --creamu-wb-bg:var(--fc-bg); --creamu-wb-surface:var(--fc-panel); --creamu-wb-surface-soft:var(--fc-panel);
        --creamu-wb-surface-muted:var(--fc-raised); --creamu-wb-surface-raised:var(--fc-panel);
        --creamu-wb-text:var(--fc-text); --creamu-wb-text-strong:var(--fc-text); --creamu-wb-title:var(--fc-text);
        --creamu-wb-text-muted:var(--fc-muted); --creamu-wb-text-subtle:var(--fc-muted); --creamu-wb-secondary-ink:var(--fc-muted);
        --creamu-wb-border:var(--fc-line); --creamu-wb-border-strong:#69756d; --creamu-wb-divider:var(--fc-line);
        --creamu-wb-accent:var(--fc-accent); --creamu-wb-accent-hover:#f6b5a4; --creamu-wb-on-accent:var(--fc-ink);
        --creamu-wb-control-radius:8px; --creamu-wb-panel-radius:16px; --creamu-wb-card-radius:10px;
        --creamu-wb-control-elevation:none; --creamu-wb-card-elevation:none;
        --creamu-wb-card-border:var(--fc-line); --creamu-wb-card-hover-border:#69756d;
        --creamu-wb-card-hover-elevation:none;
        color-scheme:dark; font:14px/1.5 "Segoe UI","Microsoft YaHei",sans-serif;
      }
      #fc-wb { min-width:0; box-shadow:0 18px 60px #0006,0 2px 8px #0003; z-index:2147483642; text-align:left; }
      html.fc-console-docked body { padding-right:var(--fc-dock-width)!important; }
      html.fc-console-docked .fc-filters { grid-template-columns:1fr; }
      #fc-wb.is-docked {
        left:auto!important; right:0!important; top:0!important; bottom:0!important;
        width:var(--fc-dock-width)!important; height:100dvh!important; border-radius:0;
        border-width:0 0 0 1px; box-shadow:none;
      }
      #fc-wb.is-docked .jlc-wb-header { cursor:default; }
      #fc-wb.is-docked :is(.jlc-wb-resize-w,.jlc-wb-resize-h,.jlc-wb-resize-corner) { display:none; }
      #fc-wb :is(h2,p) { margin:0; }
      #fc-wb :is(button,input,select) { font-family:inherit; box-sizing:border-box; margin:0; }
      #fc-wb button { min-width:0; min-height:0; width:auto; height:auto; text-transform:none; letter-spacing:normal; }
      #fc-wb a { color:inherit; text-decoration:none; }
      #fc-wb a:hover { color:var(--creamu-wb-accent); }
      #fc-wb :focus-visible, #fc-wb-fab:focus-visible { outline:2px solid var(--creamu-wb-accent); outline-offset:2px; }
      #fc-wb-fab {
        width:auto; min-width:112px; height:44px; padding:0 14px 0 9px; gap:9px;
        border:1px solid var(--creamu-wb-border)!important; border-radius:12px;
        background:var(--creamu-wb-surface)!important; color:var(--creamu-wb-text)!important;
        box-shadow:0 4px 20px #0005!important; z-index:2147483641; font-size:13px; font-weight:600;
      }
      #fc-wb-fab .fc-brand-mark { width:30px; height:30px; border-radius:9px 9px 9px 3px; background:var(--creamu-wb-accent); color:var(--fc-ink); font-size:23px; }
      #fc-wb-fab.is-panel-open { visibility:hidden; pointer-events:none; }
      #fc-wb .jlc-wb-header { padding:20px 20px 16px; gap:12px; background:var(--creamu-wb-surface); }
      #fc-wb .jlc-wb-title { font-size:18px; line-height:1.3; font-weight:600; letter-spacing:0; }
      #fc-wb .jlc-wb-subtitle { font-size:11px; letter-spacing:.6px; margin-top:5px; }
      #fc-wb .jlc-wb-header-actions { flex-wrap:nowrap; gap:6px; }
      #fc-wb .jlc-wb-header-actions .jlc-wb-btn { font-size:12px; line-height:18px; padding:7px 9px; }
      #fc-wb .jlc-wb-header-actions button:disabled { opacity:.45; cursor:default; }
      #fc-wb .jlc-wb-btn { display:inline-flex; align-items:center; justify-content:center; padding:8px 10px; border-radius:8px; }
      #fc-wb :is(.jlc-wb-btn,.jlc-wb-icon-btn):hover { background:var(--fc-raised); border-color:#69756d; }
      #fc-wb .jlc-wb-icon-btn { width:36px; height:36px; border-radius:8px; }
      #fc-wb .jlc-wb-nav { padding:0 20px; gap:24px; background:var(--creamu-wb-surface); border-bottom:1px solid var(--creamu-wb-divider); }
      #fc-wb .jlc-wb-nav button { flex:0 1 auto; padding:12px 2px; border-radius:0; background:transparent; border-bottom:2px solid transparent; font-size:14px; font-weight:600; }
      #fc-wb .jlc-wb-nav button.active { background:transparent; color:var(--creamu-wb-accent); border-bottom-color:var(--creamu-wb-accent); box-shadow:none; }
      #fc-wb .fc-library-count { font-size:11px; margin-left:5px; font-weight:400; }
      #fc-wb .fc-library-toolbar { display:grid; grid-template-columns:minmax(0,1fr); gap:10px; padding:14px 16px 12px; flex-shrink:0; }
      #fc-wb .jlc-wb-search { width:100%; padding:9px 12px; border-radius:8px; font-size:13px; line-height:20px; }
      #fc-wb .jlc-wb-search::placeholder { color:var(--creamu-wb-text-muted); opacity:1; }
      #fc-wb .fc-library-filters { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
      #fc-wb .fc-library-filters select { color-scheme:dark; width:auto; min-width:0; padding:7px 8px; border:1px solid var(--creamu-wb-border); border-radius:8px; font-size:12px; line-height:18px; }
      #fc-wb .fc-library-filters .jlc-wb-btn { margin-left:auto; font-size:12px; line-height:18px; padding:7px 9px; }
      #fc-wb .fc-library-check { display:flex; align-items:center; gap:5px; font-size:12px; color:var(--creamu-wb-text-muted); white-space:nowrap; cursor:pointer; }
      #fc-wb .fc-library-check input { width:14px; height:14px; accent-color:var(--creamu-wb-accent); }
      #fc-wb .fc-library-summary { padding:0 16px 10px; color:var(--creamu-wb-text-muted); font-size:11px; }
      #fc-wb .fc-library-list { overflow:auto; flex:1; min-height:0; padding:0 16px 20px; overscroll-behavior:contain; }
      #fc-wb .fc-library-more { display:block; margin:10px auto 0; }
      #fc-wb .fc-library-item { padding:12px; margin-bottom:8px; cursor:default; }
      #fc-wb .fc-library-item[aria-current=page] { border-color:#8f6a5f; }
      #fc-wb .fc-library-item[data-followed=true] { border-color:var(--fc-accent); box-shadow:inset 0 0 0 1px var(--fc-accent); }
      #fc-wb .jlc-wb-item-row { align-items:flex-start; gap:10px; }
      #fc-wb .jlc-wb-cover { width:64px; height:48px; border-radius:7px; }
      #fc-wb .jlc-wb-cover img { position:absolute; inset:0; object-fit:contain; background:var(--creamu-wb-surface-muted); }
      #fc-wb .fc-library-placeholder { font-size:10px; letter-spacing:1px; color:var(--creamu-wb-text-muted); }
      #fc-wb .jlc-wb-item-title-row { gap:6px; }
      #fc-wb .jlc-wb-item-title { font-size:14px; font-weight:600; line-height:1.45; }
      #fc-wb .fc-library-status { max-width:none; padding:2px 5px; border-radius:4px; font-size:10px; font-weight:400; }
      #fc-wb .fc-library-status[data-live=true] { background:#24382b; color:var(--fc-green); }
      #fc-wb .fc-library-name { display:block; font-size:12px; color:var(--creamu-wb-text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      #fc-wb .fc-library-meta { margin-top:3px; font-size:11px; color:var(--creamu-wb-text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      #fc-wb .fc-library-note { font-size:12px; margin-top:7px; color:var(--creamu-wb-accent); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; overflow-wrap:anywhere; }
      #fc-wb .fc-library-tags { display:flex; flex-wrap:wrap; gap:5px; margin-top:6px; }
      #fc-wb .fc-library-tags span { padding:1px 5px; border-radius:4px; font-size:10px; background:var(--creamu-wb-surface-muted); }
      #fc-wb .jlc-wb-item-actions { margin-top:8px; gap:6px; }
      #fc-wb .jlc-wb-item-actions .jlc-wb-btn { flex:none; min-width:0; padding:5px 9px; font-size:12px; line-height:18px; border-color:var(--creamu-wb-border); }
      #fc-wb .jlc-wb-item-actions [aria-pressed=true] { color:var(--creamu-wb-accent); background:#30231f; border-color:#875c4f; }
      #fc-wb .fc-library-error { color:#f4cfad; padding:0 16px 10px; font-size:12px; }
      #fc-wb .jlc-wb-empty { background:var(--fc-panel); border-color:var(--fc-line); border-radius:10px; }
      #fc-wb [hidden] { display:none!important; }
      @media(max-width:820px) {
        #fc-wb { height:86dvh!important; max-height:calc(100dvh - 16px); padding-bottom:env(safe-area-inset-bottom); }
        #fc-wb .jlc-wb-resize-w, #fc-wb .jlc-wb-resize-h, #fc-wb .jlc-wb-resize-corner { display:none; }
        #fc-wb .jlc-wb-header { padding:16px; }
        #fc-wb .jlc-wb-nav { padding:0 16px; gap:20px; }
        #fc-wb .jlc-wb-search { font-size:16px; }
        #fc-wb .jlc-wb-item-actions .jlc-wb-btn { min-height:34px; }
      }
    `
  });
  const fab = fc2El('button', { id: 'fc-wb-fab', type: 'button', title: '打开控制台 · 拖动可调整位置',
    'aria-label': '打开 FC2 控制台', 'aria-controls': 'fc-wb', 'aria-expanded': 'false' },
    fc2El('span', { class: 'fc-brand-mark', text: 'c', 'aria-hidden': 'true' }),
    fc2El('span', { text: '控制台' }));
  const list = fc2El('div', { class: 'fc-library-list', 'aria-label': '控制台频道' });
  const items = fc2El('div', { class: 'fc-library-items' });
  const more = fc2Button('显示更多', () => {
    visibleCount += batchSize;
    renderItems();
  }, { class: 'jlc-wb-btn ghost fc-library-more' });
  list.append(items, more);
  const summary = fc2El('p', { class: 'fc-library-summary', role: 'status' });
  const error = fc2El('p', { class: 'fc-library-error', role: 'status', hidden: '' });
  const nav = fc2El('nav', { class: 'jlc-wb-nav', 'aria-label': '控制台分类' });
  const closeButton = fc2Button('×', close, { class: 'jlc-wb-icon-btn', 'aria-label': '最小化控制台' });
  const modeButton = fc2Button('并排', () => {
    panelMode = panelMode === 'dock' ? 'float' : 'dock';
    save({ panelMode });
    applyGeometry();
  }, { class: 'jlc-wb-btn ghost', 'aria-label': '切换为并排停靠' });
  const header = fc2El('div', { class: 'jlc-wb-header', title: '拖动标题栏移动控制台，拖动边缘调整大小' },
    fc2El('div', {}, fc2El('h2', { class: 'jlc-wb-title', id: 'fc-wb-title', text: '控制台' }),
      fc2El('p', { class: 'jlc-wb-subtitle', text: 'FC2 LIVE · 关注与记录' })),
    fc2El('div', { class: 'jlc-wb-header-actions' },
      modeButton,
      fc2Button('设置', openFc2Settings, { class: 'jlc-wb-btn ghost', 'aria-label': '控制台数据与设置' }), closeButton));
  const search = fc2El('input', { type: 'search', class: 'jlc-wb-search',
    placeholder: '搜索主播、ID、标题、备注或标签', 'aria-label': '搜索控制台' });
  search.addEventListener('input', () => { filters.query = search.value; resetList(); render(); });
  const scope = fc2Select('查询直播区域', [['normal', '普通区'], ['adult', '成人区']], adult ? 'adult' : 'normal', value => {
    adult = value === 'adult';
    resetList();
    render();
    void refreshFc2Channels(adult);
  }).querySelector('select');
  const refresh = fc2Button('刷新状态', () => refreshFc2Channels(adult), { class: 'jlc-wb-btn ghost' });
  const liveOnly = fc2El('input', { type: 'checkbox' });
  liveOnly.addEventListener('change', () => { filters.liveOnly = liveOnly.checked; resetList(); render(); });
  const panel = fc2El('section', { id: 'fc-wb', role: 'dialog', 'aria-modal': 'false',
    'aria-labelledby': 'fc-wb-title', tabindex: '-1' },
    ['w', 'h', 'corner'].map(direction => fc2El('div', { class: `jlc-wb-resize-${direction}`, 'aria-hidden': 'true' })),
    header, nav, fc2El('div', { class: 'fc-library-toolbar' }, search,
      fc2El('div', { class: 'fc-library-filters' }, scope,
        fc2El('label', { class: 'fc-library-check', title: '仅显示本次查询确认在线的直播' },
          liveOnly, fc2El('span', { text: '仅在线' })), refresh)),
    summary, error, list);
  liveOnly.setAttribute('aria-label', '仅显示本次确认在线');
  document.body.append(panel, fab);
  for (const [view, label] of Object.entries(views)) {
    nav.append(fc2Button(label, () => {
      filters.view = view;
      save({ view });
      resetList();
      render();
    }, { 'data-view': view, 'aria-label': label }));
    nav.lastElementChild.append(fc2El('span', { class: 'fc-library-count', 'aria-hidden': 'true' }));
  }
  function applyGeometry() {
    const fullscreen = !!document.fullscreenElement || root.classList.contains('fc-player-web-open');
    const canDock = innerWidth >= 1180 && !fullscreen;
    const docked = panel.classList.contains('is-open') && panelMode === 'dock' && canDock;
    const nextWidth = docked ? Math.round(Math.min(440, Math.max(360, innerWidth * .3))) : 0;
    panel.classList.toggle('is-docked', docked);
    root.classList.toggle('fc-console-docked', docked);
    modeButton.disabled = !canDock;
    modeButton.textContent = panelMode === 'dock' ? '浮窗' : '并排';
    modeButton.setAttribute('aria-label', panelMode === 'dock' ? '切换为自由浮窗' : '切换为并排停靠');
    modeButton.title = !canDock ? fullscreen ? '全屏时暂用浮窗，退出后恢复' : '窗口宽度不足 1180px，暂用浮窗'
      : panelMode === 'dock' ? '切换为可拖动、缩放的自由浮窗' : '停靠右侧，与当前页面并排浏览';
    header.title = docked ? '控制台已停靠右侧' : narrow.matches ? '控制台'
      : '拖动标题栏移动控制台，拖动边缘调整大小';
    // Keep the saved floating rectangle independent of dock/fullscreen/viewport geometry.
    if (!docked && !narrow.matches) applyCreamuInteractionRect(panel, clampCreamuWorkbenchRect(rect, window, geometryOptions));
    if (nextWidth !== dockWidth) {
      dockWidth = nextWidth;
      root.style.setProperty('--fc-dock-width', `${dockWidth}px`);
      // FC2 owns its video/canvas dimensions. Notify only an actual content-width change.
      window.dispatchEvent(new Event('resize'));
    }
  }
  function open() {
    previousFocus = document.activeElement;
    panel.classList.add('is-open');
    applyGeometry();
    fab.classList.add('is-panel-open');
    fab.setAttribute('aria-expanded', 'true');
    render();
    closeButton.focus({ preventScroll: true });
    if (!fc2ChannelSnapshot(adult).checkedAt) void refreshFc2Channels(adult);
  }
  function close() {
    panel.classList.remove('is-open');
    applyGeometry();
    fab.classList.remove('is-panel-open');
    fab.setAttribute('aria-expanded', 'false');
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  function resetList() {
    visibleCount = batchSize;
    list.scrollTop = 0;
  }
  function renderItems() {
    const visible = selectedChannels.slice(0, visibleCount);
    const signature = JSON.stringify([filters.view, !!filters.query, filters.liveOnly,
      visible.map(channel => fc2Multiview?.has(channel.id)),
      visible.map(channel => [channel, currentRecords[channel.id]])]);
    if (signature !== renderedSignature) {
      const focused = document.activeElement;
      const focusId = focused?.dataset.id;
      const action = focused?.dataset.action;
      const scroll = list.scrollTop;
      // Retain rows already on screen when only more results are appended or one record changes.
      const existing = new Map([...items.children].map(row => [row.dataset.channelId, row]));
      let cursor = items.firstChild;
      for (const channel of visible) {
        const record = currentRecords[channel.id] || {};
        const rowSignature = JSON.stringify([channel, record, fc2Multiview?.has(channel.id)]);
        let row = existing.get(channel.id);
        existing.delete(channel.id);
        if (!row || row.fc2Signature !== rowSignature) {
          row = createFc2LibraryRow(channel, record);
          row.fc2Signature = rowSignature;
        }
        if (row !== cursor) items.insertBefore(row, cursor);
        else cursor = cursor.nextSibling;
      }
      while (cursor) {
        const next = cursor.nextSibling;
        cursor.remove();
        cursor = next;
      }
      for (const row of existing.values()) row.remove();
      if (!visible.length) items.replaceChildren(fc2El('p', { class: 'jlc-wb-empty', text: filters.query || filters.liveOnly
        ? '没有符合筛选的记录。' : filters.view === 'following' ? '在直播卡片或房间中关注主播，会收在这里。'
          : filters.view === 'recent' ? '访问直播间后，记录会出现在这里。' : '黑名单为空。屏蔽的主播可在这里恢复。' }));
      renderedSignature = signature;
      list.scrollTop = scroll;
      if (focusId && action) items.querySelector(`[data-id="${focusId}"][data-action="${action}"]`)?.focus({ preventScroll: true });
    }
    more.hidden = visible.length >= selectedChannels.length;
    more.textContent = `显示更多 · 还有 ${Math.max(0, selectedChannels.length - visible.length)} 个`;
  }
  function render() {
    if (!panel.classList.contains('is-open')) return;
    const state = fc2ChannelSnapshot(adult);
    const records = readFc2Library();
    selectedChannels = selectFc2Channels(state.channels, records, filters);
    currentRecords = records;
    for (const button of nav.querySelectorAll('button')) {
      const view = button.dataset.view;
      const count = Object.values(records).filter(row => view === 'blocked' ? row.blocked
        : !row.blocked && (view === 'following' ? row.followed : row.visitedAt > 0)).length;
      button.querySelector('.fc-library-count').textContent = count;
      button.classList.toggle('active', view === filters.view);
      button.setAttribute('aria-pressed', String(view === filters.view));
    }
    refresh.disabled = !!state.pending;
    refresh.textContent = state.pending ? '读取中…' : '刷新状态';
    const region = adult ? '成人区' : '普通区';
    summary.textContent = `${selectedChannels.length} 个频道 · ${region}${state.checkedAt
      ? ` ${new Date(state.checkedAt).toLocaleTimeString()} 更新` : '状态尚未读取'}`;
    error.hidden = !state.error;
    error.textContent = state.error ? `${state.error}。本地记录仍可使用，点击刷新状态重试。` : '';
    list.setAttribute('aria-busy', String(!!state.pending));
    renderItems();
  }
  const moreObserver = new IntersectionObserver(entries => {
    if (panel.classList.contains('is-open') && !more.hidden && entries.some(entry => entry.isIntersecting)) more.click();
  }, { root: list, rootMargin: '0px 0px 200px 0px' });
  moreObserver.observe(more);
  window.addEventListener('pagehide', event => { if (!event.persisted) moreObserver.disconnect(); }, { once: true });
  const interaction = {
    geometryOptions, isDragDisabled: () => narrow.matches || panel.classList.contains('is-docked'), lockBodySelection: true,
    applyRect(next, context) {
      rect = next;
      applyCreamuInteractionRect(panel, rect);
      if (context.persist) save({ rect });
    }
  };
  bindCreamuWorkbenchDrag(panel, { ...interaction, header, shouldIgnoreDrag: event => !!event.target.closest('button') });
  bindCreamuWorkbenchResize(panel, interaction);
  bindCreamuFabDrag(fab, {
    getInitialPosition: () => clampCreamuWorkbenchPoint(saved.fab, { width: fab.offsetWidth, height: fab.offsetHeight }, window),
    savePosition: point => save({ fab: point }), isDragDisabled: () => narrow.matches,
    onActivate: () => panel.classList.contains('is-open') ? close() : open(),
    onViewportChange: () => {
      const point = clampCreamuWorkbenchPoint(getCreamuInteractionRect(fab), { width: fab.offsetWidth, height: fab.offsetHeight }, window);
      applyCreamuInteractionRect(fab, point);
      applyGeometry();
    }
  });
  panel.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    close();
  });
  // Keep controls reachable in the browser's native fullscreen top layer.
  document.addEventListener('fullscreenchange', () => {
    const parent = document.fullscreenElement || document.body;
    parent.append(panel, fab);
    applyGeometry();
  });
  document.addEventListener('creamu-fc2-library', render);
  document.addEventListener('creamu-fc2-channels', render);
  document.addEventListener('creamu-fc2-multiview', render);
  fc2Workbench = { open };
}
