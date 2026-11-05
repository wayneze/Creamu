function fc2El(tag, attributes = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (value == null) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else el.setAttribute(key, String(value));
  }
  el.append(...children.flat().filter(value => value != null));
  return el;
}

function fc2Button(text, onClick, attributes = {}) {
  const button = fc2El('button', { type: 'button', ...attributes, text });
  button.addEventListener('click', onClick);
  return button;
}

let fc2ToastTimer;
function fc2Toast(message) {
  document.getElementById('fc-toast')?.remove();
  const toast = fc2El('div', { id: 'fc-toast', class: 'fc-toast', role: 'status', text: message });
  document.body.append(toast);
  clearTimeout(fc2ToastTimer);
  fc2ToastTimer = setTimeout(() => toast.remove(), 4500);
}

function openFc2Dialog(title, content, actions = []) {
  document.querySelector('.fc-dialog')?.close();
  const previousFocus = document.activeElement;
  const dialog = fc2El('dialog', { class: 'fc-dialog', 'aria-labelledby': 'fc-dialog-title' },
    fc2El('h2', { id: 'fc-dialog-title', text: title }), content,
    fc2El('div', { class: 'fc-dialog-actions' }, actions,
      fc2Button('关闭', () => dialog.close())));
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (previousFocus?.isConnected) previousFocus.focus();
  }, { once: true });
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}

function editFc2Channel(channel) {
  const record = readFc2Library()[channel.id] || {};
  const note = fc2El('textarea', { rows: 4, maxlength: 1000 });
  note.value = record.note || '';
  const tags = fc2El('input', { type: 'text', maxlength: 360, placeholder: '用逗号分隔，例如：游戏, 日语' });
  tags.value = (record.tags || []).join(', ');
  const content = fc2El('div', {},
    fc2El('p', { text: channel.name || `主播 ${channel.id}` }),
    fc2El('label', { text: '私人备注' }, note),
    fc2El('label', { text: '标签（最多 12 个）' }, tags));
  const dialog = openFc2Dialog('记住这位主播', content, [
    fc2Button('保存备注', () => {
      updateFc2Record(channel, { note: note.value, tags: tags.value.split(/[,，]/) });
      dialog.close();
      fc2Toast('备注已保存');
    }, { class: 'fc-primary' })
  ]);
}

function fc2ChannelActions(channel, record = readFc2Library()[channel.id] || {}) {
  return [
    fc2Button(record.followed ? '已关注' : '关注', () => {
      updateFc2Record(channel, { followed: !readFc2Library()[channel.id]?.followed });
    }, { 'aria-pressed': !!record.followed, 'data-action': 'follow', 'data-id': channel.id }),
    fc2Button('备注', () => editFc2Channel(channel), { 'data-action': 'note', 'data-id': channel.id }),
    fc2Button(record.blocked ? '取消屏蔽' : '屏蔽', () => {
      const blocked = !readFc2Library()[channel.id]?.blocked;
      updateFc2Record(channel, { blocked });
      fc2Toast(blocked ? '已屏蔽，可在控制台的黑名单中恢复' : '已取消屏蔽');
    }, { 'data-action': 'block', 'data-id': channel.id })
  ];
}

function fc2NativeMode() {
  setFc2Preferences({ enabled: false });
  location.reload();
}

function fc2Header(navigation) {
  const links = new Map();
  document.querySelectorAll('.js-head a[href], .m-tab01_lst a[href]').forEach(anchor => {
    const url = new URL(anchor.href, location.href);
    const label = fc2Text(anchor.textContent) || fc2Text(anchor.getAttribute('aria-label'));
    if (url.hostname !== 'live.fc2.com' || !label || url.pathname === '/') return;
    links.set(url.href, label);
  });
  const siteMenu = links.size ? fc2El('details', { class: 'fc-site-menu' },
    fc2El('summary', { text: '站点导航' }),
    fc2El('div', {}, [...links].map(([href, text]) => fc2El('a', { href, text })))) : null;
  return fc2El('header', { class: 'fc-header' },
    fc2El('a', { class: 'fc-brand', href: '/', 'aria-label': 'Creamu FC2 Live 首页' },
      fc2El('span', { class: 'fc-brand-mark', 'aria-hidden': 'true', text: 'c' }),
      fc2El('span', {}, fc2El('strong', { text: 'Creamu' }), fc2El('small', { text: 'FC2 LIVE' }))),
    navigation || fc2El('nav', { 'aria-label': '页面导航' },
      fc2El('a', { href: '/', class: 'fc-link-button', text: '返回直播列表' })),
    fc2El('div', { class: 'fc-header-actions' },
      siteMenu,
      !fc2Multiview ? fc2El('a', { class: 'fc-link-button', href: '/?creamu=multi', target: '_blank',
        rel: 'noopener noreferrer', text: '同屏', title: '打开多路观看台' }) : null,
      fc2Button('控制台', () => fc2Workbench.open(), { 'aria-controls': 'fc-wb' }),
      fc2Button('设置', openFc2Settings),
      fc2Button('原站', fc2NativeMode, { title: '切换回原站布局，可随时恢复 Creamu' })));
}

function openFc2Settings() {
  const content = fc2El('div', {},
    fc2El('p', { text: '收藏、备注和屏蔽保存在油猴本地。导出与同步不包含 WebDAV 密码。' }));
  const file = fc2El('input', { type: 'file', accept: '.json,application/json', 'aria-label': '选择 FC2 数据文件' });
  const status = fc2El('p', { class: 'fc-dialog-status', role: 'status' });
  const exportButton = fc2Button('导出 JSON', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportFc2Data(), null, 2)], { type: 'application/json' }));
    const link = fc2El('a', { href: url, download: 'creamu-fc2.json' });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  file.addEventListener('change', async () => {
    const selected = file.files[0];
    if (!selected) return;
    try {
      if (selected.size > 10 * 1024 * 1024) throw new Error('文件超过 10 MB，未导入。');
      importFc2Data(JSON.parse(await selected.text()));
      status.textContent = '导入成功，已按更新时间合并。';
    } catch (error) {
      status.textContent = error.message;
    }
    file.value = '';
  });
  content.append(exportButton, fc2El('label', { text: '导入并合并数据' }, file), status, fc2El('hr'));
  const dav = GM_getValue(FC2_DAV_KEY, {}) || {};
  const fields = {};
  const details = fc2El('details', {}, fc2El('summary', { text: 'WebDAV 同步' }),
    fc2El('p', { text: '复用 Creamu 同步机制，文件为 fc2.vault.json。连接信息仅保存在本机。' }));
  for (const [key, label, type, defaultValue] of [
    ['url', '服务地址（HTTPS）', 'url', ''],
    ['user', '用户名', 'text', ''],
    ['password', '应用密码', 'password', ''],
    ['path', '远端目录', 'text', '/Creamu']
  ]) {
    fields[key] = fc2El('input', { type, autocomplete: 'off' });
    fields[key].value = dav[key] || defaultValue;
    details.append(fc2El('label', { text: label }, fields[key]));
  }
  for (const [key, label] of [['enabled', '启用同步'], ['auto', '自动同步数据变化']]) {
    fields[key] = fc2El('input', { type: 'checkbox' });
    fields[key].checked = dav[key] === true;
    details.append(fc2El('label', { class: 'fc-check' }, fields[key], label));
  }
  const davStatus = fc2El('p', { class: 'fc-dialog-status', role: 'status', text: fc2Sync.statusText() });
  function saveDav() {
    const url = fields.url.value.trim();
    if (url && new URL(url).protocol !== 'https:') throw new Error('请使用 HTTPS WebDAV 地址。');
    GM_setValue(FC2_DAV_KEY, {
      url, user: fields.user.value.trim(), password: fields.password.value,
      path: fields.path.value, enabled: fields.enabled.checked,
      auto: fields.auto.checked, conflict: 'ask'
    });
  }
  for (const [label, operation] of [
    ['保存设置', async () => {}],
    ['测试连接', () => fc2Sync.testConnection()],
    ['立即同步', () => fc2Sync.syncNow({ reason: 'manual' })]
  ]) {
    const button = fc2Button(label, async () => {
      button.disabled = true;
      try {
        saveDav();
        await operation();
        davStatus.textContent = label === '保存设置' ? '设置已保存' : fc2Sync.statusText();
      } catch (error) {
        davStatus.textContent = error.message || '同步失败，请检查连接设置。';
      } finally {
        button.disabled = false;
      }
    });
    details.append(button, ' ');
  }
  details.append(davStatus);
  content.append(details);
  openFc2Dialog('数据与设置', content);
}

function fc2Select(label, options, value, onChange, attributes = {}) {
  const select = fc2El('select', { 'aria-label': label, ...attributes },
    options.map(([key, text]) => fc2El('option', { value: key, text })));
  select.value = value;
  select.addEventListener('change', () => onChange(select.value));
  return fc2El('label', { text: label }, select);
}

function bindFc2VisitLinks(element, channel) {
  function rememberVisit(event) {
    if (!event.target.closest('a') || (event.type === 'auxclick' && event.button !== 1)) return;
    // Let the browser activate the original anchor before a storage update re-renders it.
    setTimeout(() => updateFc2Record(channel, { visitedAt: Date.now() }), 0);
  }
  element.addEventListener('click', rememberVisit);
  element.addEventListener('auxclick', rememberVisit);
}

function createFc2Card(channel, record) {
  const url = fc2RoomUrl(channel);
  const linkAttributes = { href: url, target: '_blank', rel: 'noopener noreferrer' };
  const cover = fc2El('a', { ...linkAttributes, class: 'fc-cover', 'aria-label': `进入 ${channel.name}（新标签页）` });
  if (channel.image) {
    const image = fc2El('img', { src: channel.image, alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
    image.addEventListener('error', () => image.remove(), { once: true });
    cover.append(image);
  }
  const state = channel.observed ? (channel.type === 2 ? '一对一' : '直播中') : '状态未确认';
  const payment = channel.observed
    ? channel.access || (channel.pay === 1 ? '付费' : channel.pay === 0 ? '免费' : '费用未知') : '';
  cover.append(fc2El('div', { class: 'fc-cover-badges' },
    fc2El('span', { class: `fc-badge${channel.observed ? ' fc-badge-live' : ''}`, text: state }),
    payment ? fc2El('span', { class: 'fc-badge', text: payment }) : null));
  if (record.visitedAt) {
    const currentBroadcast = channel.observed && channel.startedAt > 0 && record.visitedAt >= channel.startedAt;
    cover.append(fc2El('span', {
      class: 'fc-visited', text: currentBroadcast ? '本场已看' : '曾访问',
      title: `最近访问：${new Date(record.visitedAt).toLocaleString()}`
    }));
  }
  const card = fc2El('article', { class: 'fc-card', 'data-channel-id': channel.id, 'data-followed': !!record.followed },
    cover,
    fc2El('div', { class: 'fc-card-body' },
      fc2El('a', { ...linkAttributes, class: 'fc-card-title', text: channel.title || '未填写直播标题', title: `${channel.title || '直播间'}（新标签页）` }),
      fc2El('a', { ...linkAttributes, class: 'fc-card-name', text: channel.name, title: `${channel.name} · ${channel.id}（新标签页）` }),
      record.note ? fc2El('p', { class: 'fc-card-note', text: record.note, title: record.note }) : null,
      record.tags?.length ? fc2El('div', { class: 'fc-card-tags' }, record.tags.map(text => fc2El('span', { text }))) : null,
      fc2El('div', { class: 'fc-card-info' },
        fc2El('span', { text: channel.observed ? `${channel.viewers.toLocaleString()} 人在看` : '未出现在本次频道列表' }),
        fc2El('span', { text: FC2_CATEGORIES[channel.category] || (record.visitedAt ? '曾经访问' : '') }))),
    fc2El('div', { class: 'fc-card-actions' }, fc2ChannelActions(channel, record)));
  bindFc2VisitLinks(card, channel);
  return card;
}

function mountFc2Directory() {
  const adult = location.pathname.startsWith('/adult');
  const filters = { view: 'discover', query: '', category: '', fee: '', type: '', sort: 'popular', liveOnly: false };
  const state = fc2ChannelSnapshot(adult);
  const grid = fc2El('div', { class: 'fc-grid', 'aria-label': '频道列表' });
  const title = fc2El('h1', { text: '发现直播' });
  const count = fc2El('span', { role: 'status' });
  const time = fc2El('span');
  const message = fc2El('p', { class: 'fc-message', role: 'status', hidden: '' });
  const nav = fc2El('nav', { 'aria-label': '页面导航' }, fc2El('span', { text: '发现直播' }));
  const app = fc2El('div', { id: 'creamu-fc2', class: 'fc-app', 'data-density': readFc2Preferences().density });
  function render() {
    const focused = document.activeElement;
    const focusId = focused?.dataset.id;
    const focusAction = focused?.dataset.action;
    const records = readFc2Library();
    const selected = selectFc2Channels(state.channels, records, filters);
    count.textContent = `${selected.length} 个频道 / 本次读取 ${state.channels.length} 个`;
    time.textContent = state.checkedAt ? `${adult ? '成人区' : '普通区'} · ${new Date(state.checkedAt).toLocaleTimeString()} 更新` : '尚未读取频道';
    refresh.disabled = !!state.pending;
    refresh.textContent = state.pending ? '读取中…' : '刷新直播';
    grid.setAttribute('aria-busy', String(!!state.pending));
    message.hidden = !state.error;
    message.textContent = state.error
      ? `${state.error}。${state.checkedAt ? '保留上次读取结果；可点击刷新重试。' : '原站列表仍保留在下方；可点击刷新重试。'}` : '';
    if (state.checkedAt) document.documentElement.classList.add('creamu-fc2-list');
    grid.replaceChildren(...selected.map(channel => createFc2Card(channel, records[channel.id] || {})));
    if (!selected.length) grid.append(fc2El('div', { class: 'fc-empty', text:
      state.pending ? '正在读取直播列表…' : '没有符合条件的频道，试试清除筛选。' }));
    if (focusId && focusAction) {
      grid.querySelector(`[data-id="${focusId}"][data-action="${focusAction}"]`)?.focus({ preventScroll: true });
    }
  }
  const search = fc2El('input', { type: 'search', placeholder: '搜索标题、主播、备注或标签', 'aria-label': '搜索直播' });
  search.addEventListener('input', () => { filters.query = search.value; render(); });
  const selects = [
    fc2Select('分类', [['', '全部分类'], ...Object.entries(FC2_CATEGORIES)], '', value => { filters.category = value; render(); }),
    fc2Select('费用', [['', '全部费用'], ['0', '免费'], ['1', '付费']], '', value => { filters.fee = value; render(); }),
    fc2Select('排序', [['popular', '观看人数'], ['new', '最近开播']], 'popular', value => { filters.sort = value; render(); }),
    fc2Select('卡片密度', [['comfortable', '舒适'], ['compact', '紧凑']], readFc2Preferences().density, value => {
      setFc2Preferences({ density: value }); app.dataset.density = value;
    })
  ];
  const filterOptions = fc2El('details', { class: 'fc-filter-options' },
    fc2El('summary', { text: '分类、费用与排序' }), fc2El('div', {}, selects));
  const narrowScreen = matchMedia('(max-width:700px)');
  const sizeFilters = () => { filterOptions.open = !narrowScreen.matches; };
  narrowScreen.addEventListener('change', sizeFilters);
  sizeFilters();
  const liveOnly = fc2El('input', { type: 'checkbox' });
  liveOnly.addEventListener('change', () => { filters.liveOnly = liveOnly.checked; render(); });
  const program = fc2Select('节目类型', [['', '全部类型'], ['1', '直播'], ['2', '一对一']], '', value => { filters.type = value; render(); });
  const clear = fc2Button('清除筛选', () => {
    Object.assign(filters, { query: '', category: '', fee: '', type: '', liveOnly: false });
    search.value = '';
    liveOnly.checked = false;
    [selects[0], selects[1], program].forEach(label => { label.querySelector('select').value = ''; });
    render();
  });
  const refresh = fc2Button('刷新直播', () => refreshFc2Channels(adult));
  const scope = fc2El('div', { class: 'fc-scope' },
    fc2El('a', { href: '/', text: '普通区', 'aria-current': adult ? null : 'page' }),
    fc2El('a', { href: '/adult/', text: '成人区', 'aria-current': adult ? 'page' : null }), refresh);
  app.append(fc2Header(nav),
    fc2El('main', { class: 'fc-main' },
      fc2El('div', { class: 'fc-heading' },
        fc2El('div', {}, fc2El('p', { class: 'fc-eyebrow', text: 'YOUR LIVE DIRECTORY' }), title,
          fc2El('p', { class: 'fc-subtitle', text: '找到想看的直播，记住值得再见的主播。' })), scope),
      fc2El('section', { class: 'fc-toolbar', 'aria-label': '筛选直播' },
        fc2El('div', { class: 'fc-filters' }, fc2El('label', { class: 'fc-search-label', text: '搜索' }, search), filterOptions),
        fc2El('details', { class: 'fc-more' }, fc2El('summary', { text: '更多筛选' }),
          fc2El('div', {}, program, fc2El('label', { class: 'fc-check' }, liveOnly, '仅本次确认在线'), clear))),
      message, fc2El('div', { class: 'fc-results-bar' }, count, time), grid));
  document.querySelector('.js-wrap')?.before(app);
  if (!app.isConnected) document.body.prepend(app);
  document.documentElement.classList.add('creamu-fc2');
  document.addEventListener('creamu-fc2-library', render);
  document.addEventListener('creamu-fc2-channels', render);
  render();
  void refreshFc2Channels(adult);
}
