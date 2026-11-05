let fc2Multiview = null;

function mountFc2Multiview() {
  const storageKey = 'creamu_fc2_multiview';
  const saved = GM_getValue(storageKey, {}) || {};
  const rooms = new Map();
  const tiles = new Map();
  let columns = ['1', '2', '3', '4'].includes(saved.columns) ? saved.columns : 'auto';
  let audible = '';
  let layoutColumns = 1;
  let drag = null;
  let dragFrame = 0;
  let qualityView = null;
  const root = document.documentElement;
  root.classList.add('creamu-fc2', 'fc-multiview-open');
  const save = () => GM_setValue(storageKey, { rooms: [...rooms.values()], columns });
  const count = fc2El('span', { class: 'fc-multi-count', role: 'status' });
  const grid = fc2El('div', { class: 'fc-multi-grid', role: 'list', 'aria-label': '多路直播' });
  const empty = fc2El('div', { class: 'fc-multi-empty' },
    fc2El('strong', { text: '把想看的直播放在一起' }),
    fc2El('p', { text: '输入房间链接或 ID，或从控制台的关注与最近访问中加入。' }),
    fc2Button('从关注与记录中添加', () => fc2Workbench.open()));
  const input = fc2El('input', { type: 'text', placeholder: '房间链接或 ID', 'aria-label': '添加直播房间', autocomplete: 'off' });
  const form = fc2El('form', { class: 'fc-multi-add' }, input,
    fc2El('button', { type: 'submit', text: '加入同屏' }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    let id = fc2Id(input.value.trim());
    if (!id) {
      try {
        const url = new URL(input.value.trim());
        if (url.origin === location.origin && /^\/(?:2_)?[1-9]\d*\/?$/.test(url.pathname)) id = fc2Id(url.pathname.split('/')[1]);
      } catch (_) {}
    }
    if (!id) { fc2Toast('请输入有效的 FC2 房间链接或 ID'); return; }
    add(readFc2Library()[id] || { id, name: `房间 ${id}` });
    input.value = '';
  });
  const layout = fc2Select('排列', [['auto', '铺满一屏'], ['1', '1 列'], ['2', '2 列'], ['3', '3 列'], ['4', '4 列']], columns, value => {
    columns = value;
    save();
    arrange();
  });
  const muteAll = fc2Button('全部静音', () => setAudio(''));
  const more = fc2El('details', { class: 'fc-site-menu fc-multi-more' },
    fc2El('summary', { text: '更多', 'aria-label': '同屏更多操作' }),
    fc2El('div', {},
      fc2El('a', { href: '/', text: '返回直播列表' }),
      fc2Button('多路画质', () => { more.open = false; openQuality(); }),
      fc2Button('设置', () => { more.open = false; openFc2Settings(); }),
      fc2Button('原站', () => {
        setFc2Preferences({ enabled: false });
        location.href = '/';
      })));
  fc2Multiview = { add, has: id => rooms.has(id) };
  const viewport = fc2El('div', { class: 'fc-multi-scroll' }, empty, grid);
  const app = fc2El('main', { id: 'fc-multiview', class: 'fc-app' },
    fc2El('header', { class: 'fc-multi-toolbar', 'aria-label': '同屏控制栏' },
      fc2El('div', { class: 'fc-multi-brand' },
        fc2El('a', { class: 'fc-brand-mark', href: '/', text: 'c', 'aria-label': 'Creamu FC2 Live 首页' }),
        fc2El('strong', { text: '同屏' }), count),
      form,
      fc2El('div', { class: 'fc-multi-options' }, layout, muteAll),
      fc2El('div', { class: 'fc-multi-actions' },
        fc2Button('控制台', () => fc2Workbench.open(), { 'aria-controls': 'fc-wb' }), more)),
    viewport);
  document.body.append(app);
  const resize = new ResizeObserver(arrange);
  resize.observe(viewport);
  function arrange() {
    const style = getComputedStyle(viewport);
    const width = viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height = viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const gridStyle = getComputedStyle(grid);
    const gap = parseFloat(gridStyle.gap);
    const headerHeight = parseFloat(gridStyle.getPropertyValue('--fc-multi-header-height')) + 2;
    const minHeight = headerHeight + 120;
    const size = Math.max(1, rooms.size);
    const maxColumns = Math.min(size, Math.max(1, Math.floor((width + gap) / (320 + gap))));
    let rowHeight = minHeight;
    layoutColumns = Math.min(maxColumns, columns === 'auto' ? maxColumns : Number(columns));
    if (columns === 'auto') {
      let bestArea = -1;
      for (let candidate = 1; candidate <= maxColumns; candidate++) {
        const rows = Math.ceil(size / candidate);
        const cellHeight = Math.floor((height - gap * (rows - 1)) / rows);
        if (cellHeight < minHeight) continue;
        const cellWidth = (width - gap * (candidate - 1)) / candidate - 2;
        const pictureWidth = Math.min(cellWidth, (cellHeight - headerHeight) * 16 / 9);
        if (pictureWidth * pictureWidth > bestArea) {
          bestArea = pictureWidth * pictureWidth;
          layoutColumns = candidate;
          rowHeight = cellHeight;
        }
      }
    }
    grid.classList.toggle('is-fit', columns === 'auto');
    grid.style.setProperty('--fc-multi-columns', layoutColumns);
    grid.style.setProperty('--fc-multi-row-height', `${rowHeight}px`);
  }
  function applyOrder() {
    let index = 0;
    for (const id of rooms.keys()) {
      const tile = tiles.get(id);
    // Sorting preserves each media session and its live connection.
      tile.element.style.order = index;
      tile.element.setAttribute('aria-posinset', String(++index));
      tile.element.setAttribute('aria-setsize', String(rooms.size));
      tile.reorder.setAttribute('aria-label', `调整房间 ${id} 的位置，当前第 ${index} 位`);
    }
  }
  function moveRoom(id, target) {
    const entries = [...rooms];
    const from = entries.findIndex(([roomId]) => roomId === id);
    const to = Math.max(0, Math.min(entries.length - 1, target));
    if (from < 0 || from === to) return;
    entries.splice(to, 0, ...entries.splice(from, 1));
    rooms.clear();
    for (const [roomId, channel] of entries) rooms.set(roomId, channel);
    applyOrder();
    save();
    fc2Toast(`已将 ${rooms.get(id).name} 移到第 ${to + 1} 位`);
  }
  function dropTarget() {
    const element = document.elementFromPoint(drag.x, drag.y)?.closest('.fc-multi-tile');
    return element?.parentElement === grid ? element.dataset.roomId : '';
  }
  function trackDrag() {
    dragFrame = 0;
    if (!drag?.active) return;
    const bounds = viewport.getBoundingClientRect();
    const inside = drag.x >= bounds.left && drag.x <= bounds.right && drag.y >= bounds.top && drag.y <= bounds.bottom;
    const delta = !inside ? 0 : drag.y < bounds.top + 36 ? -10 : drag.y > bounds.bottom - 36 ? 10 : 0;
    const oldScroll = viewport.scrollTop;
    if (delta) viewport.scrollTop += delta;
    const target = dropTarget();
    if (target !== drag.target) {
      tiles.get(drag.target)?.element.classList.remove('is-drop-target');
      drag.target = target;
      if (target !== drag.id) tiles.get(target)?.element.classList.add('is-drop-target');
    }
    if (viewport.scrollTop !== oldScroll) dragFrame = requestAnimationFrame(trackDrag);
  }
  function finishDrag(commit) {
    if (!drag) return;
    const { id, handle, pointerId, active } = drag;
    const target = active && commit ? dropTarget() : '';
    drag = null;
    cancelAnimationFrame(dragFrame);
    dragFrame = 0;
    grid.classList.remove('is-reordering');
    for (const tile of tiles.values()) tile.element.classList.remove('is-reordering', 'is-drop-target');
    if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
    if (target && target !== id) moveRoom(id, [...rooms.keys()].indexOf(target));
  }
  grid.addEventListener('pointerdown', event => {
    const handle = event.target.closest('[data-reorder-id]');
    if (!handle || event.button !== 0 || !event.isPrimary || drag || rooms.size < 2) return;
    event.preventDefault();
    handle.focus({ preventScroll: true });
    handle.setPointerCapture(event.pointerId);
    drag = { id: handle.dataset.reorderId, handle, pointerId: event.pointerId, active: false,
      startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, target: '' };
  });
  grid.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (!drag.active && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) >= 5) {
      drag.active = true;
      grid.classList.add('is-reordering');
      tiles.get(drag.id).element.classList.add('is-reordering');
    }
    if (drag.active && !dragFrame) dragFrame = requestAnimationFrame(trackDrag);
  });
  grid.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    finishDrag(true);
  });
  for (const event of ['pointercancel', 'lostpointercapture']) grid.addEventListener(event, () => finishDrag(false));
  grid.addEventListener('keydown', event => {
    if (event.key === 'Escape' && drag) {
      event.preventDefault();
      finishDrag(false);
      return;
    }
    const handle = event.target.closest('[data-reorder-id]');
    if (!handle || drag) return;
    const index = [...rooms.keys()].indexOf(handle.dataset.reorderId);
    const target = {
      ArrowLeft: index - 1, ArrowRight: index + 1, ArrowUp: index - layoutColumns,
      ArrowDown: index + layoutColumns, Home: 0, End: rooms.size - 1
    }[event.key];
    if (target == null) return;
    event.preventDefault();
    moveRoom(handle.dataset.reorderId, target);
  });
  viewport.addEventListener('scroll', () => {
    if (drag?.active && !dragFrame) dragFrame = requestAnimationFrame(trackDrag);
  }, { passive: true });
  async function requestQuality(id, value) {
    const tile = tiles.get(id);
    if (!tile?.player) throw new Error('房间已移除');
    tile.player.setQuality(value);
  }
  function openQuality() {
    const rows = fc2El('div', { class: 'fc-multi-quality-list' });
    const message = fc2El('p', { class: 'fc-dialog-status', role: 'status' });
    let busy = false;
    async function apply(changes, skipped = 0) {
      if (busy) return;
      busy = true;
      message.textContent = '正在切换画质…';
      qualityView?.render();
      const results = await Promise.allSettled(changes.map(([id, value]) => requestQuality(id, value)));
      const failed = results.filter(result => result.status === 'rejected');
      message.textContent = changes.length
        ? `已向 ${changes.length - failed.length} 路提交切换${skipped ? `，${skipped} 路没有对应选项` : ''}${failed.length ? `；${failed.length} 路失败：${failed[0].reason.message}` : ''}。`
        : '当前没有可切换的画质。';
      busy = false;
      qualityView?.render();
    }
    function batch(mode) {
      const changes = [];
      for (const [id, tile] of tiles) {
        const options = tile.qualities || [];
        const selected = mode === 'low' ? options.filter(item => item.bitrate > 0).sort((a, b) => a.bitrate - b.bitrate)[0]
          : options.find(item => item.value === 'auto');
        if (selected) changes.push([id, selected.value]);
      }
      void apply(changes, rooms.size - changes.length);
    }
    const low = fc2Button('全部最低码率', () => batch('low'));
    const automatic = fc2Button('全部自动', () => batch('auto'));
    const dialog = openFc2Dialog('多路画质',
      fc2El('div', {}, fc2El('p', { text: '画质来自各路实际播放列表。自动模式根据带宽调整；降低码率可减少多路观看的带宽占用。' }),
        fc2El('div', { class: 'fc-multi-quality-actions' }, low, automatic), rows, message));
    function render() {
      low.disabled = busy || ![...tiles.values()].some(tile => tile.qualities?.some(item => item.bitrate > 0));
      automatic.disabled = busy || ![...tiles.values()].some(tile => tile.qualities?.some(item => item.value === 'auto'));
      const existing = new Map([...rows.children].map(row => [row.dataset.roomId, row]));
      for (const [id, channel] of rooms) {
        const options = tiles.get(id).qualities || [];
        const signature = JSON.stringify([channel.name, options, busy]);
        let row = existing.get(id);
        existing.delete(id);
        if (row?.dataset.signature === signature) continue;
        const select = fc2El('select', { 'aria-label': `房间 ${id} 的画质`, disabled: busy || !options.length ? '' : null },
          options.length ? options.map(item => fc2El('option', { value: item.value, text: item.label }))
            : fc2El('option', { text: '原站暂未提供可选画质' }));
        select.value = options.find(item => item.selected)?.value || options[0]?.value || select.value;
        select.addEventListener('change', () => { void apply([[id, select.value]]); });
        const next = fc2El('label', { class: 'fc-multi-quality-row', 'data-room-id': id, 'data-signature': signature },
          fc2El('span', { text: `${channel.name} · ${id}` }), select);
        if (row) row.replaceWith(next);
        else rows.append(next);
      }
      for (const row of existing.values()) row.remove();
    }
    qualityView = { render };
    dialog.addEventListener('close', () => { qualityView = null; }, { once: true });
    render();
  }
  function setAudio(id) {
    audible = rooms.has(id) ? id : '';
    for (const [roomId, tile] of tiles) {
      tile.sound.setAttribute('aria-pressed', String(audible === roomId));
      tile.sound.textContent = audible === roomId ? '静音' : '听这路';
      tile.element.classList.toggle('is-audible', audible === roomId);
      tile.player?.setAudible(audible === roomId);
    }
    muteAll.disabled = !audible;
  }
  function update() {
    count.textContent = `${rooms.size} 路`;
    empty.hidden = rooms.size > 0;
    applyOrder();
    arrange();
    qualityView?.render();
    document.dispatchEvent(new Event('creamu-fc2-multiview'));
  }
  function remove(id) {
    finishDrag(false);
    const tile = tiles.get(id);
    tile?.player.destroy();
    tile?.element.remove();
    tiles.delete(id);
    rooms.delete(id);
    if (audible === id) setAudio('');
    save();
    update();
  }
  function add(channel, persist = true) {
    const id = fc2Id(channel?.id);
    if (!id) return;
    if (rooms.has(id)) {
      fc2Toast(`房间 ${id} 已在同屏中`);
      tiles.get(id)?.element.scrollIntoView({ block: 'nearest' });
      return;
    }
    const name = fc2Text(channel.name) || `房间 ${id}`;
    finishDrag(false);
    rooms.set(id, { id, name });
    const url = fc2RoomUrl({ id });
    const status = fc2El('span', { class: 'fc-multi-status', text: '正在连接', role: 'status' });
    const host = fc2El('div', { class: 'fc-multi-host fc-art-host' });
    const sound = fc2Button('听这路', () => setAudio(audible === id ? '' : id),
      { 'aria-label': `切换房间 ${id} 的声音`, 'aria-pressed': 'false' });
    const reload = fc2Button('↻', () => {
      tile.player.reload();
    }, { 'aria-label': `重新载入房间 ${id}`, title: '仅重新载入这一路' });
    const reorder = fc2El('button', { type: 'button', class: 'fc-multi-reorder', text: '⠿',
      'data-reorder-id': id, title: '拖动排序；聚焦后按方向键调整位置，Home / End 移到首尾',
      'aria-keyshortcuts': 'ArrowLeft ArrowRight ArrowUp ArrowDown Home End' });
    const element = fc2El('section', { class: 'fc-multi-tile', role: 'listitem', 'data-room-id': id, 'aria-label': `${name} · ${id}` },
      fc2El('header', { class: 'fc-multi-tile-header' },
        reorder,
        fc2El('div', { class: 'fc-multi-tile-title' }, fc2El('strong', { text: name, title: `${name} · ${id}` }), status),
        fc2El('div', { class: 'fc-multi-tile-actions' }, sound, reload,
          fc2El('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: '↗', title: '打开原房间',
            'aria-label': `在新标签页打开房间 ${id}` }),
          fc2Button('×', () => remove(id), { 'aria-label': `移除房间 ${id}`, title: '移除并停止这一路' }))),
      fc2El('div', { class: 'fc-multi-video' }, host));
    const tile = { element, sound, status, reorder, qualities: [], player: null };
    tiles.set(id, tile);
    grid.append(element);
    tile.player = createFc2MultiPlayer({
      id, container: host,
      onStatus(text) { status.textContent = text; status.title = text; },
      onSound() { setAudio(audible === id ? '' : id); },
      onQualities(options) { tile.qualities = options; qualityView?.render(); },
      onChannel(current) {
        rooms.set(id, { id, name: current.name });
        const title = element.querySelector('.fc-multi-tile-title strong');
        title.textContent = current.name;
        title.title = `${current.name} · ${id}`;
        save();
        updateFc2Record(current, { visitedAt: Date.now() });
      }
    });
    if (persist) fc2Toast(`已加入 ${name}`);
    if (persist) save();
    update();
  }
  for (const channel of Array.isArray(saved.rooms) ? saved.rooms : []) add(channel, false);
  setAudio('');
  update();
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    finishDrag(false);
    for (const tile of tiles.values()) tile.player.destroy();
    resize.disconnect();
  }, { once: true });
}
