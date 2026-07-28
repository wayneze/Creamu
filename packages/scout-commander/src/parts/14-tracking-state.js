// 14-tracking-state.js

// Tracks：搜索追更（存储一站一条；UI 按 query 折叠）
function getTracks() {
  const val = GM_getValue('creamu_scout_tracks', null);
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch(_) { return []; }
  }
  return [];
}

function saveTracks(tracks) {
  GM_setValue('creamu_scout_tracks', tracks);
  markScoutStorageChanged('creamu_scout_tracks');
}

/** 搜索词归一化：大小写、+、空白；and/or 折叠便于断点匹配 */
function normalizeSearchQueryKey(q) {
  return String(q == null ? '' : q)
    .toLowerCase()
    .replace(/\+/g, ' ')
    .replace(/\s+and\s+/g, ' ')
    .replace(/\s+or\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findTrackBySiteQuery(site, query) {
  const siteNorm = String(site || '');
  const key = normalizeSearchQueryKey(query);
  if (!siteNorm || !key) return null;
  const tracks = getTracks();
  return (
    tracks.find(
      (t) =>
        t.site === siteNorm &&
        normalizeSearchQueryKey(t.query) === key
    ) || null
  );
}

function addTrack({ site, query, label, url, recipe, recipe_id, probe_queries }) {
  const tracks = getTracks();
  const siteNorm = String(site || '');
  const queryNorm = String(query || '').trim();
  const normalizedRecipe = recipe && typeof normalizeScoutSearchRecipe === 'function'
    ? normalizeScoutSearchRecipe(recipe)
    : null;
  const recipeId = compactText(
    recipe_id || (normalizedRecipe && normalizedRecipe.id) || ''
  );
  const recipeFingerprint = normalizedRecipe && typeof scoutSearchRecipeFingerprint === 'function'
    ? scoutSearchRecipeFingerprint(normalizedRecipe)
    : '';
  const existing = tracks.find((track) => {
    if (!track || track.site !== siteNorm) return false;
    if (recipeId && track.recipe_id === recipeId) return true;
    if (recipeFingerprint && track.recipe_fingerprint === recipeFingerprint) return true;
    return !recipeId && normalizeSearchQueryKey(track.query) === normalizeSearchQueryKey(queryNorm);
  }) || null;
  if (existing) {
    if (label) existing.label = String(label);
    if (url) existing.url = String(url);
    // 若原先 query 写法不同，统一成当前写法便于展示
    if (queryNorm) existing.query = queryNorm;
    if (normalizedRecipe) {
      existing.recipe = normalizedRecipe;
      existing.recipe_id = recipeId;
      existing.recipe_fingerprint = recipeFingerprint;
      existing.probe_queries = Array.isArray(probe_queries) ? probe_queries.slice() : [];
    }
    existing.updated_at = new Date().toISOString();
    saveTracks(tracks);
    triggerWebDavDirty();
    return existing;
  }
  const newTrack = {
    id: 'track_' + uid(),
    site: siteNorm,
    query: queryNorm,
    label: String(label || queryNorm),
    url: String(url || ''),
    recipe: normalizedRecipe,
    recipe_id: recipeId,
    recipe_fingerprint: recipeFingerprint,
    probe_queries: Array.isArray(probe_queries) ? probe_queries.slice() : [],
    last_seen_item: '',
    last_seen_page: 1,
    updated_at: new Date().toISOString()
  };
  tracks.push(newTrack);
  saveTracks(tracks);
  triggerWebDavDirty();
  return newTrack;
}

function updateTrack(id, fields) {
  const tracks = getTracks();
  const track = tracks.find(t => t.id === id);
  if (track) {
    Object.assign(track, fields);
    track.updated_at = new Date().toISOString();
    saveTracks(tracks);
    triggerWebDavDirty();
    return track;
  }
  return null;
}

function deleteTrack(id) {
  let tracks = getTracks();
  const len = tracks.length;
  tracks = tracks.filter(t => t.id !== id);
  if (tracks.length !== len) {
    saveTracks(tracks);
    triggerWebDavDirty();
    return true;
  }
  return false;
}

/** 三站固定顺序；列表展示时再按「当前站优先」重排 */
const SCOUT_SITE_IDS = ['xvideos', 'xnxx', 'eporner'];

function scoutSiteShortLabel(site) {
  const m = { xvideos: 'XV', xnxx: 'XN', eporner: 'EP' };
  const s = String(site || '');
  return m[s] || (s ? s.toUpperCase().slice(0, 3) : '?');
}

/**
 * 当前站优先的站点顺序（用于追更展开行 / 作品三站芯片）。
 * @param {string|null|undefined} currentSite
 * @returns {string[]}
 */
function orderSitesCurrentFirst(currentSite) {
  const cur = String(currentSite || '');
  if (cur && SCOUT_SITE_IDS.indexOf(cur) >= 0) {
    return [cur].concat(SCOUT_SITE_IDS.filter((s) => s !== cur));
  }
  return SCOUT_SITE_IDS.slice();
}

/**
 * 按归一化 query 折叠 tracks（存储仍是一站一条，仅展示聚合）。
 * @param {object[]|null} [tracks]
 * @returns {{ key:string, query:string, label:string, tracks:object[], updated_at:string, siteCount:number }[]}
 */
function groupTracksByQuery(tracks) {
  const list = Array.isArray(tracks) ? tracks : getTracks();
  const map = new Map();
  list.forEach((t) => {
    if (!t) return;
    const recipe = t.recipe && typeof normalizeScoutSearchRecipe === 'function'
      ? normalizeScoutSearchRecipe(t.recipe)
      : null;
    const recipeIdentity = compactText(t.recipe_id || (recipe && recipe.id) || '');
    const key = recipeIdentity
      ? 'recipe:' + recipeIdentity
      : normalizeSearchQueryKey(t.query);
    if (!key) return;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        query: String(t.query || '').trim(),
        label: String(t.label || t.query || key),
        recipe,
        tracks: [],
        updated_at: t.updated_at || ''
      };
      map.set(key, g);
    }
    g.tracks.push(t);
    if (!g.recipe && recipe) g.recipe = recipe;
    const tAt = new Date(t.updated_at || 0).getTime();
    const gAt = new Date(g.updated_at || 0).getTime();
    if (tAt >= gAt) {
      g.updated_at = t.updated_at || g.updated_at;
      if (t.label) g.label = String(t.label);
      if (t.query) g.query = String(t.query).trim();
    }
  });
  return Array.from(map.values())
    .map((g) => {
      g.siteCount = g.tracks.length;
      return g;
    })
    .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
}

function findTrackInGroup(group, site) {
  if (!group || !Array.isArray(group.tracks)) return null;
  const siteNorm = String(site || '');
  if (!siteNorm) return null;
  return group.tracks.find((t) => t && t.site === siteNorm) || null;
}

/** 删除同一归一化 query 下所有站的追更 */
function deleteTracksByQueryKey(queryKey) {
  const rawKey = String(queryKey || '');
  const key = rawKey.startsWith('recipe:') ? rawKey : normalizeSearchQueryKey(rawKey);
  if (!key) return 0;
  const tracks = getTracks();
  const next = tracks.filter((t) => {
    const recipeIdentity = compactText(t && (t.recipe_id || (t.recipe && t.recipe.id)) || '');
    const trackKey = recipeIdentity
      ? 'recipe:' + recipeIdentity
      : normalizeSearchQueryKey(t && t.query);
    return trackKey !== key;
  });
  const n = tracks.length - next.length;
  if (n > 0) {
    saveTracks(next);
    triggerWebDavDirty();
  }
  return n;
}

function addTracksForScoutRecipe(recipe, label, preparedPlan) {
  if (typeof normalizeScoutSearchRecipe !== 'function') return [];
  const normalized = normalizeScoutSearchRecipe(recipe);
  const plan = preparedPlan || (
    typeof buildScoutSearchPlan === 'function' ? buildScoutSearchPlan(normalized) : null
  );
  const created = [];
  normalized.sites.forEach((site) => {
    const probes = plan && Array.isArray(plan.probes)
      ? plan.probes.filter((probe) => probe.site === site)
      : [];
    const primary = probes[0];
    if (!primary || !primary.query) return;
    created.push(addTrack({
      site,
      query: primary.query,
      label: label || normalized.label || describeScoutSearchRecipe(normalized),
      url: primary.url,
      recipe: normalized,
      recipe_id: normalized.id,
      probe_queries: probes
        .filter((probe) => probe.level === 'strict' || probe.level === 'alias')
        .map((probe) => probe.query),
    }));
  });
  return created;
}

/**
 * 作品标题 → 跨站搜索 query（去分辨率等噪声，最多 8 词）。
 * 不做自动绑定，仅 L0「去搜」。
 */
function workSearchQueryFromTitle(title) {
  let t = compactText(title);
  if (!t) return '';
  t = t
    .replace(/\b(?:\d{3,4}p|4k|uhd|hd|full\s*hd|full\s*video|xxx|porn)\b/gi, ' ')
    .replace(/[^\w\s'’\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length > 8) return words.slice(0, 8).join(' ');
  return t;
}

// Config
function getConfig() {
  const def = {
    webdav_enabled: false,
    webdav_url: '',
    webdav_user: '',
    webdav_password: '',
    webdav_path: '/Creamu',
    webdav_auto: true,
    webdav_conflict: 'ask',
    /** 三站页面奶油主题（列表/顶栏/底色）；与工作台样式独立，可关 */
    cream_site_theme: true,
    /** 列表点影片是否新标签打开（默认开，避免站点当前页跳转） */
    open_videos_new_tab: true,
    /** 拦截站点列表自动预览；默认 true */
    block_site_auto_preview: true,
    /**
     * 组合搜索多词连接：and（默认，多站更稳）| space | or
     */
    combo_join: 'and'
  };
  const val = GM_getValue('creamu_scout_config', null);
  if (val && typeof val === 'object') {
    return Object.assign(def, val);
  }
  if (typeof val === 'string') {
    try { return Object.assign(def, JSON.parse(val)); } catch(_) { return def; }
  }
  return def;
}

function saveConfig(cfg) {
  GM_setValue('creamu_scout_config', cfg);
  markScoutStorageChanged('creamu_scout_config');
  if (typeof applyScoutSiteTheme === 'function') {
    try { applyScoutSiteTheme(); } catch (_) { /* ignore */ }
  }
  if (typeof applyVideoOpenMode === 'function') {
    try { applyVideoOpenMode(); } catch (_) { /* ignore */ }
  }
}

/**
 * 打开链接。默认新标签；油猴用 GM_openInTab 避免 window.open 被拦。
 * @param {string} url
 * @param {{ newTab?: boolean }} [opts]
 */
function openScoutUrl(url, opts) {
  const href = compactText(url);
  if (!href) return false;
  const newTab = !opts || opts.newTab !== false;
  try {
    if (newTab && typeof GM_openInTab === 'function') {
      GM_openInTab(href, { active: true, insert: true, setParent: true });
      return true;
    }
  } catch (_) { /* fall through */ }
  if (newTab) {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  }
  location.href = href;
  return true;
}

function isOpenVideosNewTab() {
  const cfg = getConfig();
  return cfg.open_videos_new_tab !== false;
}

function isBlockSiteAutoPreview() {
  const cfg = getConfig();
  return cfg.block_site_auto_preview !== false;
}

/** 组合搜索连接符：and | space | or */
function getComboJoinMode() {
  const m = (getConfig().combo_join || 'and').toLowerCase();
  if (m === 'space' || m === 'or' || m === 'and') return m;
  return 'and';
}

/**
 * 把已选词拼成站点搜索串。
 * 单 token 内空格保留；token 之间按 and / space / or 连接。
 */
function joinComboQuery(tokens, mode) {
  const list = (Array.isArray(tokens) ? tokens : [])
    .map((t) => compactText(t))
    .filter(Boolean);
  if (!list.length) return '';
  if (list.length === 1) return list[0];
  const m = (mode || getComboJoinMode() || 'and').toLowerCase();
  if (m === 'or') return list.join(' or ');
  if (m === 'space') return list.join(' ');
  // and（默认）：多站对空格拼词更苛刻
  return list.join(' and ');
}

// ----------------------------------------
// Clicked videos（已点片库，与追更断点 tracks 无关）
// key = site|videoId
// ----------------------------------------
const CLICK_MAP_KEY = 'creamu_scout_clicks';
/** 防止无限膨胀：超过上限时按 clicked_at 淘汰最旧 */
const CLICK_MAP_MAX = 8000;

function clickRecordKey(site, videoId) {
  return String(site || '') + '|' + String(videoId || '');
}

function getClickMap() {
  const val = GM_getValue(CLICK_MAP_KEY, null);
  if (val && typeof val === 'object' && !Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (_) { /* ignore */ }
  }
  // 兼容：若曾存成数组 [{site,id,...}]
  if (Array.isArray(val)) {
    const map = {};
    val.forEach(row => {
      if (!row) return;
      const id = row.videoId || row.id || '';
      const site = row.site || '';
      if (!id) return;
      map[clickRecordKey(site, id)] = row;
    });
    return map;
  }
  return {};
}

function saveClickMap(map) {
  GM_setValue(CLICK_MAP_KEY, map || {});
  markScoutStorageChanged(CLICK_MAP_KEY);
}

function pruneClickMap(map) {
  const keys = Object.keys(map || {});
  if (keys.length <= CLICK_MAP_MAX) return map;
  keys.sort((a, b) => {
    const ta = new Date((map[a] && map[a].clicked_at) || 0).getTime() || 0;
    const tb = new Date((map[b] && map[b].clicked_at) || 0).getTime() || 0;
    return ta - tb; // 旧 → 新
  });
  const drop = keys.length - CLICK_MAP_MAX;
  for (let i = 0; i < drop; i++) delete map[keys[i]];
  return map;
}

function addClickedVideoIdAliases(index, videoId) {
  const raw = String(videoId || '').trim();
  if (!raw) return;
  index.add(raw);
  if (typeof videoIdFromUrl !== 'function') return;
  const normalized = String(videoIdFromUrl(raw) || '').trim();
  if (normalized) index.add(normalized);
}

function buildClickedVideoIdIndex(site, map) {
  const source = map && typeof map === 'object' ? map : getClickMap();
  const siteNorm = String(site || '');
  const index = new Set();
  Object.values(source || {}).forEach((row) => {
    if (!row || String(row.site || '') !== siteNorm) return;
    addClickedVideoIdAliases(index, row.id || row.videoId);
  });
  return index;
}

function isVideoClickedInIndex(index, videoId) {
  if (!index || typeof index.has !== 'function' || !videoId) return false;
  const raw = String(videoId).trim();
  if (!raw) return false;
  if (index.has(raw)) return true;
  if (typeof videoIdFromUrl !== 'function') return false;
  const normalized = String(videoIdFromUrl(raw) || '').trim();
  return !!(normalized && index.has(normalized));
}

function isVideoClicked(site, videoId) {
  if (!videoId) return false;
  const map = getClickMap();
  if (map[clickRecordKey(site, videoId)]) return true;
  // 兼容：旧记录存整段 pathname，新逻辑用短 id
  const short =
    typeof videoIdFromUrl === 'function' ? videoIdFromUrl(videoId) : '';
  if (short && short !== videoId && map[clickRecordKey(site, short)]) return true;
  const siteNorm = String(site || '');
  for (const key of Object.keys(map)) {
    const row = map[key];
    if (!row || String(row.site || '') !== siteNorm) continue;
    if (typeof videoIdsMatch === 'function') {
      if (videoIdsMatch(row.id, videoId) || (short && videoIdsMatch(row.id, short))) return true;
    } else if (row.id === videoId || (short && row.id === short)) {
      return true;
    }
  }
  return false;
}

/**
 * 标记已点。同一片再次点击只刷新本地时间，不重复触发同步。
 * @returns {object|null} 记录
 */
function markVideoClicked({ site, videoId, title, url, thumb, uploader }) {
  const id = compactText(videoId);
  if (!id) return null;
  const siteNorm = String(
    site || (typeof detectSite === 'function' ? detectSite() : '') || ''
  );
  const key = clickRecordKey(siteNorm, id);
  const map = getClickMap();
  const prev = map[key];
  const now = new Date().toISOString();
  const isNew = !prev;
  const row = {
    id,
    site: siteNorm,
    title: compactText(title) || (prev && prev.title) || '',
    url: compactText(url) || (prev && prev.url) || '',
    thumb: compactText(thumb) || (prev && prev.thumb) || '',
    uploader: compactText(uploader) || (prev && prev.uploader) || '',
    clicked: true,
    clicked_at: now,
    first_clicked_at: (prev && prev.first_clicked_at) || now
  };
  map[key] = row;
  if (isNew) pruneClickMap(map);
  saveClickMap(map);
  // 仅首次记入已点时标脏同步，避免 hover/重复 pointerdown 刷 WebDAV
  if (isNew) triggerWebDavDirty();
  return row;
}

function getClickedList() {
  return Object.values(getClickMap()).filter(Boolean);
}

function getClickedCount() {
  return Object.keys(getClickMap()).length;
}

function clearAllClicks() {
  saveClickMap({});
  triggerWebDavDirty();
}

function normalizeClickRow(row) {
  if (!row) return null;
  const id = compactText(row.videoId || row.id);
  if (!id) return null;
  const site = String(row.site || '');
  const now = new Date().toISOString();
  return {
    id,
    site,
    title: compactText(row.title),
    url: compactText(row.url),
    thumb: compactText(row.thumb),
    uploader: compactText(row.uploader),
    clicked: true,
    clicked_at: row.clicked_at || now,
    first_clicked_at: row.first_clicked_at || row.clicked_at || now
  };
}

/** WebDAV 整包覆盖：vault 为权威快照 */
function replaceClickRecords(incoming) {
  const map = {};
  const list = Array.isArray(incoming)
    ? incoming
    : (incoming && typeof incoming === 'object' ? Object.values(incoming) : []);
  for (const raw of list) {
    const row = normalizeClickRow(raw);
    if (!row) continue;
    map[clickRecordKey(row.site, row.id)] = row;
  }
  pruneClickMap(map);
  saveClickMap(map);
}

/** 本地 JSON 包合并（按 key；保留更早 first_clicked_at、更新的 clicked_at） */
function mergeClickRecords(incoming) {
  if (incoming == null) return;
  const map = getClickMap();
  const list = Array.isArray(incoming)
    ? incoming
    : (typeof incoming === 'object' ? Object.values(incoming) : []);
  for (const raw of list) {
    const row = normalizeClickRow(raw);
    if (!row) continue;
    const key = clickRecordKey(row.site, row.id);
    const prev = map[key];
    if (!prev) {
      map[key] = row;
      continue;
    }
    const remoteFirst = new Date(row.first_clicked_at || 0).getTime() || 0;
    const localFirst = new Date(prev.first_clicked_at || prev.clicked_at || 0).getTime() || 0;
    if (remoteFirst && (!localFirst || remoteFirst < localFirst)) {
      prev.first_clicked_at = row.first_clicked_at || row.clicked_at;
    }
    const remoteAt = new Date(row.clicked_at || 0).getTime() || 0;
    const localAt = new Date(prev.clicked_at || 0).getTime() || 0;
    if (remoteAt >= localAt) {
      prev.clicked_at = row.clicked_at || prev.clicked_at;
      if (row.title) prev.title = row.title;
      if (row.url) prev.url = row.url;
      if (row.thumb) prev.thumb = row.thumb;
      if (row.uploader) prev.uploader = row.uploader;
    }
    prev.clicked = true;
    map[key] = prev;
  }
  pruneClickMap(map);
  saveClickMap(map);
}
