const FC2_LIBRARY_KEY = 'creamu_fc2_library';
const FC2_PREFS_KEY = 'creamu_fc2_preferences';
const FC2_DAV_KEY = 'creamu_fc2_webdav';
const FC2_CATEGORIES = { 1: '杂谈', 2: '游戏 / 制作', 3: '视频', 4: '其他', 5: '声音' };
let fc2Sync;

function fc2Text(value, max = 200) {
  return String(value ?? '').trim().slice(0, max);
}

function fc2Id(value) {
  const id = String(value ?? '');
  return /^(?:2_)?[1-9]\d{0,14}$/.test(id) ? id : '';
}

function fc2Image(value) {
  try {
    const url = new URL(String(value || ''), 'https://live.fc2.com');
    return url.protocol === 'https:' ? url.href : '';
  } catch (_) {
    return '';
  }
}

function fc2Record(value) {
  if (!value || !fc2Id(value.id)) return null;
  return {
    id: fc2Id(value.id),
    name: fc2Text(value.name),
    title: fc2Text(value.title, 500),
    image: fc2Image(value.image),
    adult: value.adult === true,
    followed: value.followed === true,
    blocked: value.blocked === true,
    note: fc2Text(value.note, 1000),
    tags: Array.isArray(value.tags)
      ? [...new Set(value.tags.map(v => fc2Text(v, 30)).filter(Boolean))].slice(0, 12) : [],
    visitedAt: Math.max(0, Number(value.visitedAt) || 0),
    updatedAt: Math.max(0, Number(value.updatedAt) || 0)
  };
}

function readFc2Library() {
  const stored = GM_getValue(FC2_LIBRARY_KEY, {});
  const result = {};
  for (const value of Object.values(stored && typeof stored === 'object' ? stored : {})) {
    const record = fc2Record(value);
    if (record) result[record.id] = record;
  }
  return result;
}

function updateFc2Record(channel, changes) {
  const records = readFc2Library();
  const id = fc2Id(channel.id);
  if (!id) return;
  records[id] = fc2Record({
    ...channel, ...records[id], name: channel.name, title: channel.title,
    image: channel.image, ...changes, id, updatedAt: Date.now()
  });
  GM_setValue(FC2_LIBRARY_KEY, records);
  fc2Sync?.markLocalDirty();
  document.dispatchEvent(new Event('creamu-fc2-library'));
}

function readFc2Preferences() {
  const raw = GM_getValue(FC2_PREFS_KEY, {}) || {};
  return {
    enabled: raw.enabled !== false,
    density: raw.density === 'compact' ? 'compact' : 'comfortable',
    chatWidth: Math.min(460, Math.max(280, Number(raw.chatWidth) || 340)),
    chatHidden: raw.chatHidden === true,
    nativePlayer: raw.nativePlayer === true,
    playerVolume: typeof raw.playerVolume === 'number' ? Math.min(1, Math.max(0, raw.playerVolume)) : null,
    playerMuted: typeof raw.playerMuted === 'boolean' ? raw.playerMuted : null,
    cinema: raw.cinema === true
  };
}

function setFc2Preferences(changes) {
  GM_setValue(FC2_PREFS_KEY, { ...readFc2Preferences(), ...changes });
}

function exportFc2Data() {
  return { format: 'creamu-fc2', version: 1, channels: Object.values(readFc2Library()) };
}

function validateFc2Data(data) {
  if (!data || data.format !== 'creamu-fc2' || data.version !== 1 ||
      !Array.isArray(data.channels) || data.channels.length > 20000) {
    throw new Error('请选择 Creamu · FC2 Live v1 数据文件。');
  }
  const records = {};
  for (const value of data.channels) {
    const record = fc2Record(value);
    if (!record) throw new Error('数据中包含无效的房间标识，未导入。');
    if (!records[record.id] || record.updatedAt >= records[record.id].updatedAt) {
      records[record.id] = record;
    }
  }
  return records;
}

function importFc2Data(data, replace = false) {
  const incoming = validateFc2Data(data);
  const result = replace ? {} : readFc2Library();
  for (const [id, record] of Object.entries(incoming)) {
    if (!result[id] || record.updatedAt >= result[id].updatedAt) result[id] = record;
  }
  GM_setValue(FC2_LIBRARY_KEY, result);
  if (!replace) fc2Sync?.markLocalDirty();
  document.dispatchEvent(new Event('creamu-fc2-library'));
}

function initFc2Sync() {
  fc2Sync = createCreamuWebDavSync({
    product: 'fc2',
    notify: fc2Toast,
    exportPayload: async () => exportFc2Data(),
    importPayload: async data => importFc2Data(data, true),
    getSettings: () => GM_getValue(FC2_DAV_KEY, {})
  });
  if (typeof GM_addValueChangeListener === 'function') {
    GM_addValueChangeListener(FC2_LIBRARY_KEY, (_key, _old, _value, remote) => {
      if (remote) document.dispatchEvent(new Event('creamu-fc2-library'));
    });
  }
  void fc2Sync.bootSync();
}
