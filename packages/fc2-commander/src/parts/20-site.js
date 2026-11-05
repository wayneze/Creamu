function normalizeFc2Channel(raw, adult) {
  const id = fc2Id(raw?.id);
  if (!id) return null;
  // id is the room URL identity; cid is not interchangeable with it.
  return {
    id, adult, name: fc2Text(raw.name) || '匿名主播',
    title: fc2Text(raw.title, 500) || '未填写直播标题',
    image: fc2Image(raw.image), category: String(raw.category ?? ''),
    type: Number(raw.type),
    pay: Number(raw.tid) > 0 ? 1 : raw.pay === 0 || raw.pay === 1 ? raw.pay : null,
    access: Number(raw.tid) > 0 ? '需门票'
      : Number(raw.login) === 2 ? '需持有点数'
      : Number(raw.login) === 1 ? '需登录' : '',
    viewers: Math.max(0, Number(raw.count) || 0),
    startedAt: Math.max(0, Number(raw.start_time) || 0),
    lang: fc2Text(raw.lang, 20),
    observed: true
  };
}

async function fetchFc2Channels(adult) {
  const response = await fetch(`${adult ? '/adult' : ''}/contents/allchannellist.php`, {
    method: 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`列表读取失败（HTTP ${response.status}）`);
  const payload = await response.json();
  if (!Array.isArray(payload?.channel)) throw new Error('站点未返回有效的频道列表');
  return [...new Map(payload.channel.map(row => normalizeFc2Channel(row, adult))
    .filter(Boolean).map(row => [row.id, row])).values()];
}

// Directory and workbench share one snapshot/request per area.
const fc2ChannelSnapshots = new Map();
function fc2ChannelSnapshot(adult) {
  if (!fc2ChannelSnapshots.has(adult)) {
    fc2ChannelSnapshots.set(adult, { channels: [], checkedAt: 0, error: '', pending: null });
  }
  return fc2ChannelSnapshots.get(adult);
}

function refreshFc2Channels(adult) {
  const state = fc2ChannelSnapshot(adult);
  if (state.pending) return state.pending;
  state.pending = fetchFc2Channels(adult).then(channels => {
    state.channels = channels;
    state.checkedAt = Date.now();
    state.error = '';
  }).catch(error => {
    state.error = error.message;
  }).finally(() => {
    state.pending = null;
    document.dispatchEvent(new Event('creamu-fc2-channels'));
  });
  document.dispatchEvent(new Event('creamu-fc2-channels'));
  return state.pending;
}

function fc2RoomUrl(channel) {
  return `https://live.fc2.com/${channel.id}/`;
}

function selectFc2Channels(channels, records, filters) {
  const live = new Map(channels.map(channel => [channel.id, channel]));
  const source = filters.view === 'discover'
    ? channels
    : Object.values(records)
      .filter(row => filters.view === 'following' ? row.followed
        : filters.view === 'blocked' ? row.blocked : row.visitedAt > 0)
      .map(row => live.get(row.id) || { ...row, observed: false });
  const query = filters.query.trim().toLocaleLowerCase();
  return source.filter(channel => {
    const record = records[channel.id] || {};
    if (filters.view !== 'blocked' && record.blocked) return false;
    if (query && ![channel.id, channel.title, channel.name, record.note, ...(record.tags || [])]
      .join(' ').toLocaleLowerCase().includes(query)) return false;
    if (filters.category && channel.category !== filters.category) return false;
    if (filters.fee && channel.pay !== Number(filters.fee)) return false;
    if (filters.type && channel.type !== Number(filters.type)) return false;
    if (filters.liveOnly && !channel.observed) return false;
    return true;
  }).sort((a, b) => {
    if (filters.view === 'recent') return (records[b.id]?.visitedAt || 0) - (records[a.id]?.visitedAt || 0);
    if (a.observed !== b.observed) return a.observed ? -1 : 1;
    if (filters.sort === 'new') return (b.startedAt || 0) - (a.startedAt || 0);
    return (b.viewers || 0) - (a.viewers || 0);
  });
}

function readFc2Room() {
  const id = fc2Id(location.pathname.split('/').filter(Boolean)[0]);
  if (!id) return null;
  return {
    id,
    name: fc2Text(document.querySelector('.c-ctbName')?.textContent) || `主播 ${id}`,
    title: fc2Text(document.querySelector('.c-pgTit')?.textContent, 500),
    image: fc2Image(document.querySelector('.m-pgInf img')?.getAttribute('src'))
  };
}
