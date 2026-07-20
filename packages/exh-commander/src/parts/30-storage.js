  const STORE_WORKS = 'works';
  const STORE_EDITIONS = 'editions';
  const STORE_ARCHIVES = 'local_archives';
  const STORE_LINKS = 'links';
  const STORE_PROGRESS = 'progress';
  const STORE_TRACKING = 'tracking_searches';

  const TRACKING_GROUP_ORDER = ['artist', 'group', 'parody', 'character', 'female', 'male', 'tag', 'category', 'uploader', 'search', 'favorites', 'other'];
  const TRACKING_GROUP_LABELS = {
    artist: '画师',
    group: '社团/汉化组',
    parody: '原作',
    character: '角色',
    female: '女性标签',
    male: '男性标签',
    tag: '标签',
    category: '分类',
    uploader: '上传者',
    search: '搜索',
    favorites: '站内收藏夹',
    other: '其它',
  };

  function openDb() {
    return new Promise((resolve, reject) => {
      if (db) {
        resolve(db);
        return;
      }
      if (typeof indexedDB === 'undefined') {
        reject(new Error('indexedDB unavailable'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE_WORKS)) {
          const s = d.createObjectStore(STORE_WORKS, { keyPath: 'work_id' });
          s.createIndex('title_core', 'title_core', { unique: false });
          s.createIndex('status', 'status', { unique: false });
          s.createIndex('favorite', 'favorite', { unique: false });
        }
        if (!d.objectStoreNames.contains(STORE_EDITIONS)) {
          const s = d.createObjectStore(STORE_EDITIONS, { keyPath: 'id' });
          s.createIndex('work_id', 'work_id', { unique: false });
          s.createIndex('gid', 'gid', { unique: false });
          s.createIndex('title_core', 'title_core', { unique: false });
        }
        if (!d.objectStoreNames.contains(STORE_ARCHIVES)) {
          const s = d.createObjectStore(STORE_ARCHIVES, { keyPath: 'arcid' });
          s.createIndex('title_core', 'title_core', { unique: false });
          s.createIndex('eh_gid', 'eh_gid', { unique: false });
        }
        if (!d.objectStoreNames.contains(STORE_LINKS)) {
          const s = d.createObjectStore(STORE_LINKS, { keyPath: 'id' });
          s.createIndex('work_id', 'work_id', { unique: false });
          s.createIndex('edition_id', 'edition_id', { unique: false });
          s.createIndex('arcid', 'arcid', { unique: false });
        }
        if (!d.objectStoreNames.contains(STORE_PROGRESS)) {
          d.createObjectStore(STORE_PROGRESS, { keyPath: 'work_id' });
        }
        if (!d.objectStoreNames.contains(STORE_TRACKING)) {
          const s = d.createObjectStore(STORE_TRACKING, { keyPath: 'id' });
          s.createIndex('query_signature', 'query_signature', { unique: false });
          s.createIndex('group_type', 'group_type', { unique: false });
          s.createIndex('archived', 'archived', { unique: false });
        }
      };
      req.onsuccess = () => {
        db = req.result;
        resolve(db);
      };
      req.onerror = () => reject(req.error || new Error('idb open failed'));
    });
  }

  function idbReq(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** 与 exportBackup 一致的仓库；写后标 WebDAV 脏（import 批量时可 suppress） */
  const SYNCABLE_IDB_STORES = new Set([
    STORE_WORKS,
    STORE_EDITIONS,
    STORE_ARCHIVES,
    STORE_LINKS,
    STORE_PROGRESS,
    STORE_TRACKING,
  ]);
  let idbSyncSuppress = false;

  function markIdbStoreDirty(store) {
    if (idbSyncSuppress) return;
    if (!SYNCABLE_IDB_STORES.has(store)) return;
    if (typeof markCreamuLocalDirty === 'function') markCreamuLocalDirty();
  }

  async function idbPut(store, value) {
    const d = await openDb();
    const tx = d.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        markIdbStoreDirty(store);
        resolve(value);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGet(store, key) {
    const d = await openDb();
    return idbReq(d.transaction(store, 'readonly').objectStore(store).get(key));
  }

  async function idbDelete(store, key) {
    const d = await openDb();
    const tx = d.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        markIdbStoreDirty(store);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGetAll(store) {
    const d = await openDb();
    return idbReq(d.transaction(store, 'readonly').objectStore(store).getAll());
  }

  async function idbIndexGetAll(store, indexName, query) {
    const d = await openDb();
    const idx = d.transaction(store, 'readonly').objectStore(store).index(indexName);
    return idbReq(query === undefined ? idx.getAll() : idx.getAll(query));
  }

  function makeEditionId(gid, token) {
    return editionKey(gid, token);
  }

  async function upsertEdition(partial) {
    const rec = normalizeEditionRecord(partial);
    if (!rec.gid || !rec.token) throw new Error('edition requires gid/token');
    const id = makeEditionId(rec.gid, rec.token);
    const prev = await idbGet(STORE_EDITIONS, id);
    const merged = Object.assign({}, prev || {}, rec, { id });
    // 列表页常无标签：空 tags 不要冲掉画廊页已写入的完整标签
    if (
      prev &&
      Array.isArray(prev.tags) &&
      prev.tags.length &&
      (!Array.isArray(merged.tags) || !merged.tags.length)
    ) {
      merged.tags = prev.tags.slice();
    } else if (prev && Array.isArray(prev.tags) && prev.tags.length && Array.isArray(merged.tags)) {
      // 合并去重
      const set = new Set(prev.tags.map(String));
      merged.tags.forEach((t) => set.add(String(t)));
      merged.tags = Array.from(set);
    }
    // 列表缺语言/码级时保留旧值
    if (prev) {
      if ((!merged.language || merged.language === 'other') && prev.language && prev.language !== 'other') {
        merged.language = prev.language;
      }
      if (
        (!merged.censor_tier || merged.censor_tier === 'unknown') &&
        prev.censor_tier &&
        prev.censor_tier !== 'unknown'
      ) {
        merged.censor_tier = prev.censor_tier;
      }
      if (!merged.group && prev.group) merged.group = prev.group;
      if (!(Number(merged.pages) > 0) && Number(prev.pages) > 0) merged.pages = prev.pages;
      if (!(Number(merged.size_bytes) > 0) && Number(prev.size_bytes) > 0) {
        merged.size_bytes = prev.size_bytes;
      }
    }
    if (!merged.work_id) {
      merged.work_id = (prev && prev.work_id) || (await ensureWorkForEdition(merged)).work_id;
    }
    await idbPut(STORE_EDITIONS, merged);
    await touchWorkFromEdition(merged);
    // 点开画廊后回写 LRR 里 source=该 gid 的档案码级/语言
    try {
      await refreshArchivesBoundToEdition(merged);
    } catch (_) { /* ignore */ }
    return merged;
  }

  /** 本地见到 EH 画廊后，刷新所有 eh_gid 指向它的 LRR 档案质量维 */
  async function refreshArchivesBoundToEdition(edition) {
    if (!edition || !edition.gid) return 0;
    let rows = [];
    try {
      rows = (await idbIndexGetAll(STORE_ARCHIVES, 'eh_gid', String(edition.gid))) || [];
    } catch (_) {
      rows = [];
    }
    // 兜底：tags 含 gid 但 eh_gid 未写
    if (!rows.length) {
      const all = (await listArchives()) || [];
      rows = all.filter((a) => {
        if (a.eh_gid && String(a.eh_gid) === String(edition.gid)) return true;
        const g = extractEhGidFromTags(a.tags || []);
        return g && String(g) === String(edition.gid);
      });
    }
    let n = 0;
    for (const a of rows) {
      const en = applyBoundEditionQualityToArchive(
        Object.assign({}, a, { eh_gid: String(edition.gid) }),
        edition
      );
      const changed =
        en.language !== a.language ||
        en.censor_tier !== a.censor_tier ||
        (en.group && en.group !== a.group) ||
        !a.eh_gid;
      if (!changed) continue;
      a.eh_gid = String(edition.gid);
      a.language = en.language;
      a.censor_tier = en.censor_tier;
      if (en.group) a.group = en.group;
      a.quality_from_eh_source = 1;
      a.updated_at = nowMs();
      await idbPut(STORE_ARCHIVES, a);
      n++;
    }
    return n;
  }

  async function listEditionsByWork(workId) {
    if (!workId) return [];
    return idbIndexGetAll(STORE_EDITIONS, 'work_id', workId);
  }

  async function ensureWorkForEdition(edition) {
    if (edition.work_id) {
      const existing = await idbGet(STORE_WORKS, edition.work_id);
      if (existing) return existing;
    }

    if (config.auto_cluster) {
      const candidates = await idbIndexGetAll(STORE_EDITIONS, 'title_core', edition.title_core);
      let best = null;
      let bestScore = 0;
      for (const ed of candidates || []) {
        if (!ed.work_id) continue;
        if (ed.gid === edition.gid && ed.token === edition.token) continue;
        let score = titleSimilarity(edition.title_raw, ed.title_raw);
        if (edition.group && ed.group && edition.group.toLowerCase() === String(ed.group).toLowerCase()) {
          score += 0.05;
        }
        if (score >= (config.cluster_threshold || 0.82) && score > bestScore) {
          bestScore = score;
          best = ed;
        }
      }
      if (best && best.work_id) {
        const work = await idbGet(STORE_WORKS, best.work_id);
        if (work) return work;
      }
    }

    const work = {
      work_id: uid('work'),
      title_raw: edition.title_raw,
      title_core: edition.title_core,
      favorite: 0,
      status: 'none', // none | want | reading | read | dropped
      blocked: 0,
      note: '',
      created_at: nowMs(),
      updated_at: nowMs(),
    };
    await idbPut(STORE_WORKS, work);
    return work;
  }

  async function touchWorkFromEdition(edition) {
    if (!edition.work_id) return null;
    const work = (await idbGet(STORE_WORKS, edition.work_id)) || {
      work_id: edition.work_id,
      favorite: 0,
      status: 'none',
      blocked: 0,
      note: '',
      created_at: nowMs(),
    };
    if (!work.title_core) work.title_core = edition.title_core;
    if (!work.title_raw) work.title_raw = edition.title_raw;
    work.updated_at = nowMs();
    await idbPut(STORE_WORKS, work);
    return work;
  }

  async function setWorkStatus(workId, status) {
    const work = await idbGet(STORE_WORKS, workId);
    if (!work) return null;
    work.status = status || 'none';
    work.updated_at = nowMs();
    await idbPut(STORE_WORKS, work);
    return work;
  }

  async function setWorkBlocked(workId, blocked) {
    const work = await idbGet(STORE_WORKS, workId);
    if (!work) return null;
    work.blocked = blocked ? 1 : 0;
    work.updated_at = nowMs();
    await idbPut(STORE_WORKS, work);
    return work;
  }

  async function mergeWorks(targetWorkId, sourceWorkId) {
    if (!targetWorkId || !sourceWorkId || targetWorkId === sourceWorkId) return null;
    const editions = await listEditionsByWork(sourceWorkId);
    for (const ed of editions) {
      ed.work_id = targetWorkId;
      ed.updated_at = nowMs();
      await idbPut(STORE_EDITIONS, ed);
    }
    const links = await idbIndexGetAll(STORE_LINKS, 'work_id', sourceWorkId);
    for (const link of links || []) {
      link.work_id = targetWorkId;
      await idbPut(STORE_LINKS, link);
    }
    const prog = await idbGet(STORE_PROGRESS, sourceWorkId);
    if (prog) {
      prog.work_id = targetWorkId;
      await idbPut(STORE_PROGRESS, prog);
      await idbDelete(STORE_PROGRESS, sourceWorkId);
    }
    await idbDelete(STORE_WORKS, sourceWorkId);
    return idbGet(STORE_WORKS, targetWorkId);
  }

  /** 按 gid 取本地已见 edition（LRR source 绑定用） */
  async function getEditionByGid(gid) {
    const g = String(gid || '');
    if (!g) return null;
    try {
      const rows = await idbIndexGetAll(STORE_EDITIONS, 'gid', g);
      if (rows && rows.length) {
        // 同 gid 多 token 时取较新
        return rows.slice().sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0))[0];
      }
    } catch (_) { /* ignore */ }
    return null;
  }

  async function putArchive(rec) {
    const title = compactText(rec.title || '');
    const tags = Array.isArray(rec.tags) ? rec.tags : String(rec.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
    const eh = extractEhGidFromTags(tags) || rec.eh_gid || '';
    let language = detectLanguageFromText(title, tags);
    let censor_tier = detectCensorTier(title, tags);
    let group = extractGroupFromTitle(title) || extractGroupsFromTags(tags)[0] || '';
    let quality_from_eh_source = 0;
    // 有 source/eh_gid 时，用本地已点过的 EH 画廊元数据覆盖码级/语言（否则 LRR 标签常缺 uncensored）
    if (eh) {
      const bound = await getEditionByGid(eh);
      if (bound) {
        const enriched = applyBoundEditionQualityToArchive(
          { language, censor_tier, group, eh_gid: eh },
          bound
        );
        language = enriched.language || language;
        censor_tier = enriched.censor_tier || censor_tier;
        group = enriched.group || group;
        quality_from_eh_source = 1;
      }
    }
    const row = {
      arcid: String(rec.arcid),
      title,
      title_core: buildTitleCore(title),
      tags,
      size_bytes: Number(rec.size_bytes) || parseSizeToBytes(rec.size || rec.filesize || '') || 0,
      size_tier: sizeTier(Number(rec.size_bytes) || 0),
      language,
      censor_tier,
      group,
      pages: Number(rec.pages) || 0,
      eh_gid: eh ? String(eh) : '',
      quality_from_eh_source,
      updated_at: nowMs(),
    };
    row.size_tier = sizeTier(row.size_bytes);
    await idbPut(STORE_ARCHIVES, row);
    return row;
  }

  /**
   * 对比前把 LRR 档案质量维 enrich 成「绑定 EH 源」视角。
   * @param {object} archive
   * @param {Map<string, object>} [edByGid] 可选预载 map
   */
  async function enrichArchiveForCompare(archive, edByGid) {
    if (!archive) return archive;
    const gid = archive.eh_gid || extractEhGidFromTags(archive.tags || '') || '';
    if (!gid) {
      // 无绑定源：仍用标题/标签检测（已含 other:uncensored）
      return Object.assign({}, archive, {
        language: archive.language || detectLanguageFromText(archive.title, archive.tags),
        censor_tier: archive.censor_tier || detectCensorTier(archive.title, archive.tags),
      });
    }
    let bound = null;
    if (edByGid && edByGid.has(String(gid))) bound = edByGid.get(String(gid));
    else bound = await getEditionByGid(gid);
    if (!bound) {
      // 尚未点过源画廊：至少重跑标签检测
      return Object.assign({}, archive, {
        eh_gid: String(gid),
        language: detectLanguageFromText(archive.title, archive.tags) || archive.language,
        censor_tier: detectCensorTier(archive.title, archive.tags) || archive.censor_tier,
      });
    }
    return applyBoundEditionQualityToArchive(
      Object.assign({}, archive, { eh_gid: String(gid) }),
      bound
    );
  }

  function extractEhGidFromTags(tags) {
    const src = extractEhSourceFromTags(tags);
    if (src && src.gid) return src.gid;
    for (const raw of tags || []) {
      const t = String(raw);
      let m = t.match(/(?:^|:)(?:ehgid|gid)[=:](\d+)/i);
      if (m) return m[1];
      m = t.match(/(?:exhentai|e-hentai)\.org\/g\/(\d+)/i);
      if (m) return m[1];
      m = t.match(/source:.*?\/g\/(\d+)/i);
      if (m) return m[1];
    }
    return '';
  }

  /** 从 LRR 标签解析 EH 源（gid + token，若有） */
  function extractEhSourceFromTags(tags) {
    for (const raw of tags || []) {
      const t = String(raw);
      let m = t.match(/(?:exhentai|e-hentai)\.org\/g\/(\d+)\/([0-9a-f]{8,})/i);
      if (m) return { gid: m[1], token: m[2] };
      m = t.match(/source:.*?\/g\/(\d+)\/([0-9a-f]{8,})/i);
      if (m) return { gid: m[1], token: m[2] };
    }
    return null;
  }

  async function clearArchives() {
    const all = await idbGetAll(STORE_ARCHIVES);
    for (const row of all || []) {
      await idbDelete(STORE_ARCHIVES, row.arcid);
    }
  }

  async function listArchives() {
    return idbGetAll(STORE_ARCHIVES);
  }

  async function putLink(link) {
    const row = Object.assign(
      {
        id: link.id || uid('link'),
        work_id: link.work_id || '',
        edition_id: link.edition_id || '',
        arcid: link.arcid || '',
        confidence: link.confidence || 'manual',
        source: link.source || 'manual',
        negative: link.negative ? 1 : 0,
        /** 用户确认与库内为同一打包/版本（忽略页数体积容差外的打包差异） */
        same_version: link.same_version ? 1 : 0,
        updated_at: nowMs(),
      },
      link
    );
    row.id = row.id || uid('link');
    row.same_version = row.same_version ? 1 : 0;
    await idbPut(STORE_LINKS, row);
    return row;
  }

  async function listLinks() {
    return idbGetAll(STORE_LINKS);
  }

  async function findLinksForEdition(editionId) {
    return (await idbIndexGetAll(STORE_LINKS, 'edition_id', editionId)) || [];
  }

  async function unlinkArchive(editionId, workId, arcid) {
    const links = await listLinks();
    for (const l of links || []) {
      if (l.arcid !== arcid) continue;
      if ((editionId && l.edition_id === editionId) || (workId && l.work_id === workId)) {
        await idbDelete(STORE_LINKS, l.id);
      }
    }
  }

  async function bindArchiveToEdition(edition, arcid, source) {
    if (!edition || !arcid) throw new Error('bind requires edition/arcid');
    const editionId = edition.id || makeEditionId(edition.gid, edition.token);
    const asSame = source === 'same_version';
    const existing = (await findLinksForEdition(editionId)).filter((l) => l.arcid === String(arcid));
    for (const l of existing) {
      if (l.negative) {
        await idbDelete(STORE_LINKS, l.id);
        continue;
      }
      if (asSame && !l.same_version) {
        return putLink(
          Object.assign({}, l, {
            same_version: 1,
            confidence: 'same_version',
            source: 'same_version',
            negative: 0,
          })
        );
      }
      return l;
    }
    return putLink({
      work_id: edition.work_id || '',
      edition_id: editionId,
      arcid: String(arcid),
      confidence: asSame ? 'same_version' : source === 'manual' ? 'manual' : source || 'manual',
      source: asSame ? 'same_version' : source || 'manual',
      same_version: asSame ? 1 : 0,
      negative: 0,
    });
  }

  /**
   * 手动确认「就是这个库内版本」（同源）。
   * 会建立/升级绑定，并尽量回写 archive.eh_gid 方便以后精确命中。
   */
  async function markEditionArchiveSameVersion(edition, arcid) {
    if (!edition || !arcid) throw new Error('same_version requires edition/arcid');
    const link = await bindArchiveToEdition(edition, arcid, 'same_version');
    try {
      const arc = await idbGet(STORE_ARCHIVES, String(arcid));
      if (arc && edition.gid && !arc.eh_gid) {
        arc.eh_gid = String(edition.gid);
        arc.updated_at = nowMs();
        await putArchive(arc);
      }
    } catch (_) { /* ignore */ }
    return link;
  }

  async function negateArchiveForEdition(edition, arcid) {
    const editionId = edition.id || makeEditionId(edition.gid, edition.token);
    // remove positive links first
    await unlinkArchive(editionId, edition.work_id, arcid);
    return putLink({
      work_id: edition.work_id || '',
      edition_id: editionId,
      arcid: String(arcid),
      confidence: 'manual',
      source: 'negative',
      same_version: 0,
      negative: 1,
    });
  }

  async function getProgress(workId) {
    if (!workId) return null;
    return idbGet(STORE_PROGRESS, workId);
  }

  async function setProgress(workId, page, total) {
    if (!workId) return null;
    const row = {
      work_id: workId,
      page: Number(page) || 0,
      total: Number(total) || 0,
      updated_at: nowMs(),
    };
    await idbPut(STORE_PROGRESS, row);
    return row;
  }

  async function findMergeCandidates(edition) {
    if (!edition || !edition.title_core) return [];
    const all = await idbIndexGetAll(STORE_EDITIONS, 'title_core', edition.title_core);
    const map = new Map();
    for (const ed of all || []) {
      if (!ed.work_id || ed.work_id === edition.work_id) continue;
      if (ed.gid === edition.gid) continue;
      const sim = titleSimilarity(edition.title_raw, ed.title_raw);
      if (sim < 0.75) continue;
      const prev = map.get(ed.work_id);
      if (!prev || sim > prev.sim) {
        map.set(ed.work_id, { work_id: ed.work_id, title_raw: ed.title_raw, sim, sample_gid: ed.gid });
      }
    }
    // also scan works with similar title_core via all editions loosely
    if (map.size < 8) {
      const eds = await idbGetAll(STORE_EDITIONS);
      for (const ed of eds || []) {
        if (!ed.work_id || ed.work_id === edition.work_id) continue;
        const sim = titleSimilarity(edition.title_raw, ed.title_raw);
        if (sim < 0.8) continue;
        const prev = map.get(ed.work_id);
        if (!prev || sim > prev.sim) {
          map.set(ed.work_id, { work_id: ed.work_id, title_raw: ed.title_raw, sim, sample_gid: ed.gid });
        }
      }
    }
    return [...map.values()].sort((a, b) => b.sim - a.sim).slice(0, 12);
  }

  async function splitEditionToNewWork(edition) {
    if (!edition) return null;
    const id = edition.id || makeEditionId(edition.gid, edition.token);
    const ed = (await idbGet(STORE_EDITIONS, id)) || edition;
    const work = {
      work_id: uid('work'),
      title_raw: ed.title_raw,
      title_core: ed.title_core,
      favorite: 0,
      status: 'none',
      blocked: 0,
      note: '',
      created_at: nowMs(),
      updated_at: nowMs(),
    };
    await idbPut(STORE_WORKS, work);
    ed.work_id = work.work_id;
    ed.updated_at = nowMs();
    await idbPut(STORE_EDITIONS, ed);
    return { work, edition: ed };
  }

  async function findArchiveCandidates(edition, limit) {
    const archives = await listArchives();
    const links = await listLinks();
    const editionId = edition.id || makeEditionId(edition.gid, edition.token);
    const workId = edition.work_id;
    const negative = new Set(
      (links || [])
        .filter((l) => l.negative && (l.edition_id === editionId || (workId && l.work_id === workId)))
        .map((l) => l.arcid)
    );
    const positive = new Set(
      (links || []).filter((l) => !l.negative && l.edition_id === editionId).map((l) => l.arcid)
    );
    const sameVersion = new Set(
      (links || [])
        .filter((l) => !l.negative && l.same_version && l.edition_id === editionId)
        .map((l) => l.arcid)
    );

    const scored = [];
    for (const a of archives || []) {
      if (negative.has(a.arcid)) continue;
      let score = 0;
      let reason = '';
      if (a.eh_gid && String(a.eh_gid) === String(edition.gid)) {
        score = 1.5;
        reason = 'ehgid';
      } else {
        score = structuralMatchScore(edition, a);
        reason = score >= 0.88 ? 'structural' : score >= 0.75 ? 'fuzzy' : '';
      }
      if (positive.has(a.arcid)) {
        score = Math.max(score, 1.2);
        reason = 'linked';
      }
      if (sameVersion.has(a.arcid)) {
        score = Math.max(score, 1.4);
        reason = 'same_version';
      }
      if (score < 0.72 && reason !== 'linked' && reason !== 'same_version') continue;
      scored.push({
        archive: a,
        score,
        reason,
        linked: positive.has(a.arcid),
        same_version: sameVersion.has(a.arcid),
      });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit || 15);
  }

  async function resolveLibraryState(edition) {
    const archives = await listArchives();
    const links = await listLinks();
    const editionId = edition.id || makeEditionId(edition.gid, edition.token);
    const workId = edition.work_id;

    const negativeArc = new Set(
      links.filter((l) => l.negative && (l.edition_id === editionId || l.work_id === workId)).map((l) => l.arcid)
    );

    const linked = links.filter(
      (l) =>
        !l.negative &&
        ((l.edition_id && l.edition_id === editionId) || (l.work_id && workId && l.work_id === workId))
    );

    const byGid = archives.filter((a) => a.eh_gid && String(a.eh_gid) === String(edition.gid));
    const exactArcIds = new Set([
      ...linked.filter((l) => l.edition_id === editionId).map((l) => l.arcid),
      ...byGid.map((a) => a.arcid),
    ]);

    const workArcIds = new Set([...exactArcIds, ...linked.map((l) => l.arcid)]);

    if (workId) {
      const siblings = await listEditionsByWork(workId);
      for (const ed of siblings) {
        for (const a of archives) {
          if (a.eh_gid && String(a.eh_gid) === String(ed.gid)) workArcIds.add(a.arcid);
        }
      }
    }

    const exactArchives = archives.filter((a) => exactArcIds.has(a.arcid) && !negativeArc.has(a.arcid));
    const workArchives = archives.filter((a) => workArcIds.has(a.arcid) && !negativeArc.has(a.arcid));

    // 同 work edition map：LRR source/eh_gid → 码级语言
    const siblingEds = workId ? await listEditionsByWork(workId) : [edition];
    const edByGid = new Map();
    (siblingEds || []).forEach((ed) => {
      if (ed && ed.gid) edByGid.set(String(ed.gid), ed);
    });
    if (edition && edition.gid) edByGid.set(String(edition.gid), edition);

    // 在库的 EH gid（绑源 / 当前页 eh_gid 命中）
    const libraryGids = new Set();
    for (const a of workArchives.concat(exactArchives)) {
      const g = a.eh_gid || extractEhGidFromTags(a.tags || '');
      if (g) libraryGids.add(String(g));
    }
    // 已绑定到本 work 的 edition_id → gid
    for (const l of linked) {
      if (!l.edition_id) continue;
      const m = String(l.edition_id).match(/^e_(\d+)_/);
      if (m) libraryGids.add(m[1]);
      // 也从 sibling 反查
      for (const ed of siblingEds || []) {
        if (ed && (ed.id === l.edition_id || makeEditionId(ed.gid, ed.token) === l.edition_id)) {
          libraryGids.add(String(ed.gid));
        }
      }
    }

    const fuzzy = [];
    if (edition.title_core) {
      for (const a of archives) {
        if (negativeArc.has(a.arcid)) continue;
        if (exactArcIds.has(a.arcid) || workArcIds.has(a.arcid)) continue;
        const aEn = await enrichArchiveForCompare(a, edByGid);
        const score = structuralMatchScore(edition, aEn);
        if (score < 0.85) continue;
        const compare = diffEditionVsArchive(edition, aEn, config);
        fuzzy.push({ archive: aEn, sim: score, score, compare });
      }
      fuzzy.sort((x, y) => y.score - x.score);
    }
    const fuzzyTop = fuzzy.slice(0, 8);

    const preferredEdition = pickBestEdition(siblingEds && siblingEds.length ? siblingEds : [edition], config);
    let preferred_in_library = false;
    if (preferredEdition) {
      preferred_in_library = await resolveEditionExactInLibrary(preferredEdition, archives, links);
    }

    const sameVersionArcIds = new Set(
      links
        .filter(
          (l) =>
            !l.negative &&
            l.same_version &&
            ((l.edition_id && l.edition_id === editionId) || (workId && l.work_id === workId && l.work_id))
        )
        .map((l) => l.arcid)
    );

    let has_better_remote = false;
    let library_compare = null;
    let compareArc = null;

    if (workArchives.length || exactArchives.length) {
      const pool = exactArchives.length ? exactArchives : workArchives;
      // 先按绑定 EH 源 enrich，再比质量（否则 LRR 全是 unknown 无法比码）
      const enriched = [];
      for (const a of pool) {
        enriched.push(await enrichArchiveForCompare(a, edByGid));
      }
      // 优先：eh_gid 就是当前画廊；否则按偏好分
      const exactGidArc = enriched.find((a) => a.eh_gid && String(a.eh_gid) === String(edition.gid));
      compareArc =
        exactGidArc ||
        enriched.slice().sort((a, b) => scoreEdition(b, config) - scoreEdition(a, config))[0];
      library_compare = diffEditionVsArchive(edition, compareArc, config);
      const remotes = siblingEds && siblingEds.length ? siblingEds : [edition];
      for (const r of remotes) {
        if (isEditionBetter(r, compareArc, config)) {
          has_better_remote = true;
          break;
        }
      }
    } else if (fuzzyTop.length) {
      compareArc = await enrichArchiveForCompare(fuzzyTop[0].archive, edByGid);
      library_compare = diffEditionVsArchive(edition, compareArc, config);
    }

    const same_version_confirmed =
      !!(compareArc && sameVersionArcIds.has(compareArc.arcid)) ||
      exactArchives.some((a) => sameVersionArcIds.has(a.arcid));

    if (library_compare && same_version_confirmed) {
      // 用户已确认同源：去掉打包维噪音，仅保留语言/码级等质量差异
      const kept = (library_compare.diffs || []).filter(
        (d) => d.key === 'language' || d.key === 'censor' || d.key === 'group'
      );
      library_compare = Object.assign({}, library_compare, {
        diffs: kept,
        packaging_only: false,
        packaging_note: '',
        same_version: true,
        online_better: kept.some((d) => d.better === 'online'),
        library_better: kept.some((d) => d.better === 'library') && !kept.some((d) => d.better === 'online'),
        short_label: kept.length ? library_compare.short_label : '已确认同源',
      });
      // 仅打包导致的「更好线上版」不再提示
      if (!kept.some((d) => d.key === 'language' || d.key === 'censor')) {
        has_better_remote = false;
      }
    }

    const maybe_in_library = !exactArchives.length && !workArchives.length && fuzzyTop.length > 0;
    let maybe_label = '';
    if (maybe_in_library && library_compare) {
      maybe_label = library_compare.short_label || '可能在库';
      if (library_compare.diffs && library_compare.diffs.length === 0) {
        maybe_label = '库内近似';
      }
    }

    const same_target_arcid =
      (compareArc && compareArc.arcid) ||
      (exactArchives[0] && exactArchives[0].arcid) ||
      (workArchives[0] && workArchives[0].arcid) ||
      (fuzzyTop[0] && fuzzyTop[0].archive && fuzzyTop[0].archive.arcid) ||
      '';

    return {
      edition_in_library: exactArchives.length > 0,
      work_in_library: workArchives.length > 0 || exactArchives.length > 0,
      preferred_in_library,
      has_better_remote,
      maybe_in_library,
      maybe_label,
      library_compare,
      exact_archives: exactArchives,
      work_archives: workArchives,
      fuzzy_candidates: fuzzyTop,
      same_version_confirmed,
      same_target_arcid: String(same_target_arcid || ''),
      /** 在库档案对应的 EH gid，详情页多版本列表置顶高亮 */
      library_gids: Array.from(libraryGids),
      compare_archive: compareArc || null,
    };
  }

  async function resolveEditionExactInLibrary(edition, archives, links) {
    const editionId = edition.id || makeEditionId(edition.gid, edition.token);
    if ((links || []).some((l) => !l.negative && l.edition_id === editionId && l.arcid)) return true;
    return (archives || []).some((a) => a.eh_gid && String(a.eh_gid) === String(edition.gid));
  }

  async function listBlockedWorks() {
    const all = await idbGetAll(STORE_WORKS);
    return (all || []).filter((w) => w.blocked).sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  }

  /** LRR 在库：以 local_archives 为准，再挂 work/edition/link（若有） */
  async function listLibraryArchiveEntries() {
    const archives = (await listArchives()) || [];
    if (!archives.length) return [];

    const links = (await listLinks()) || [];
    const editions = (await idbGetAll(STORE_EDITIONS)) || [];
    const works = (await idbGetAll(STORE_WORKS)) || [];
    const workMap = new Map(works.map((w) => [w.work_id, w]));
    const edById = new Map();
    const edByGid = new Map();
    for (const ed of editions) {
      const id = ed.id || makeEditionId(ed.gid, ed.token);
      if (id) edById.set(String(id), ed);
      if (ed.gid != null && ed.gid !== '') {
        const g = String(ed.gid);
        if (!edByGid.has(g)) edByGid.set(g, ed);
      }
    }
    const linkByArc = new Map();
    for (const l of links) {
      if (!l || l.negative || !l.arcid) continue;
      const key = String(l.arcid);
      const prev = linkByArc.get(key);
      // 优先 same_version / 有 work_id 的链接
      if (!prev || (l.same_version && !prev.same_version) || (l.work_id && !prev.work_id)) {
        linkByArc.set(key, l);
      }
    }

    const out = [];
    for (const a of archives) {
      if (!a || !a.arcid) continue;
      const link = linkByArc.get(String(a.arcid)) || null;
      let edition = null;
      let work = null;
      if (link) {
        if (link.edition_id) edition = edById.get(String(link.edition_id)) || null;
        if (link.work_id) work = workMap.get(link.work_id) || null;
      }
      if (!edition && a.eh_gid) {
        edition = edByGid.get(String(a.eh_gid)) || null;
      }
      if (!work && edition && edition.work_id) {
        work = workMap.get(edition.work_id) || null;
      }
      const source = extractEhSourceFromTags(a.tags) || (a.eh_gid ? { gid: String(a.eh_gid), token: '' } : null);
      out.push({ archive: a, work, edition, link, source });
    }

    out.sort((x, y) => {
      const tx = compactText((x.work && x.work.title_raw) || (x.edition && x.edition.title_raw) || x.archive.title || '');
      const ty = compactText((y.work && y.work.title_raw) || (y.edition && y.edition.title_raw) || y.archive.title || '');
      return tx.localeCompare(ty, 'zh');
    });
    return out;
  }

  async function listAllWorks() {
    const all = await idbGetAll(STORE_WORKS);
    return (all || []).sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  }

  async function listTrackingSearches() {
    const all = await idbGetAll(STORE_TRACKING);
    const live = (all || []).filter((r) => !r.archived);
    // 同 site + 同搜索词的历史重复项：列表时合并（保留有断点/较新的）
    const byKey = new Map();
    const orphans = [];
    for (const r of live) {
      const site = r.site || '';
      const fs = trackingFSearchKey(r.f_search || r.label || '');
      if (!fs) {
        orphans.push(r);
        continue;
      }
      const key = site + '\0' + fs;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, r);
        continue;
      }
      // 选保留者
      const prevBp = prev.breakpoint_gid ? 1 : 0;
      const curBp = r.breakpoint_gid ? 1 : 0;
      let keep = prev;
      let drop = r;
      if (curBp > prevBp || (curBp === prevBp && (r.updated_at || 0) > (prev.updated_at || 0))) {
        keep = r;
        drop = prev;
      }
      if (typeof mergeTrackingRecord === 'function') {
        const merged = mergeTrackingRecord(keep, drop);
        Object.assign(keep, merged);
        keep.id = keep.id || merged.id;
      }
      byKey.set(key, keep);
      if (drop && drop.id && drop.id !== keep.id) {
        try {
          await idbDelete(STORE_TRACKING, drop.id);
        } catch (_) { /* ignore */ }
      }
      try {
        await idbPut(STORE_TRACKING, keep);
      } catch (_) { /* ignore */ }
    }
    const out = orphans.concat([...byKey.values()]);
    return out.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  }

  async function getTrackingBySignature(sig) {
    if (!sig) return null;
    const rows = await idbIndexGetAll(STORE_TRACKING, 'query_signature', sig);
    return (rows || []).find((r) => !r.archived) || null;
  }

  function trackingFSearchKey(s) {
    if (typeof normalizeTrackingFSearch === 'function') return normalizeTrackingFSearch(s);
    return compactText(s)
      .toLowerCase()
      .replace(/[＋+]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * 按上下文找追更：先精确签名，再按 site+f_search 软匹配（吞掉旧版噪声签名重复）。
   * 若命中多条重复，合并进一条并删其余。
   */
  async function findTrackingForContext(context) {
    if (!context) return null;
    const sig = context.query_signature || '';
    if (sig) {
      const exact = await getTrackingBySignature(sig);
      if (exact) return exact;
    }
    const all = await listTrackingSearches();
    if (!all.length) return null;
    const site = context.site || '';
    const fs = trackingFSearchKey(context.f_search || '');
    const labelKey = trackingFSearchKey(context.label || '');
    const hits = all.filter((r) => {
      if (r.archived) return false;
      if (site && r.site && r.site !== site) return false;
      if (sig && r.query_signature === sig) return true;
      const rfs = trackingFSearchKey(r.f_search || '');
      if (fs && rfs && fs === rfs) return true;
      // 旧签名把 f_search 嵌在中间段
      if (fs && r.query_signature && String(r.query_signature).toLowerCase().indexOf(fs) >= 0) return true;
      const rl = trackingFSearchKey(r.label || r.custom_label || '');
      if (labelKey && rl && labelKey === rl && fs) return true;
      return false;
    });
    if (!hits.length) return null;
    if (hits.length === 1) {
      const one = hits[0];
      // 迁移到新签名 / 首页 open_url
      let dirty = false;
      if (sig && one.query_signature !== sig) {
        one.query_signature = sig;
        dirty = true;
      }
      if (context.open_url) {
        const canon =
          typeof canonicalizeTrackingOpenUrl === 'function'
            ? canonicalizeTrackingOpenUrl(context.open_url)
            : context.open_url;
        if (one.open_url !== canon) {
          one.open_url = canon;
          one.page_url = canon;
          dirty = true;
        }
      }
      if (dirty) await saveTrackingRecord(one);
      return one;
    }
    // 多条重复：保留「有断点 / 最近浏览」优先者，合并字段后删其余
    hits.sort((a, b) => {
      const bpA = a.breakpoint_gid ? 1 : 0;
      const bpB = b.breakpoint_gid ? 1 : 0;
      if (bpA !== bpB) return bpB - bpA;
      return (b.last_browsed_at || b.updated_at || 0) - (a.last_browsed_at || a.updated_at || 0);
    });
    const keep = hits[0];
    for (let i = 1; i < hits.length; i++) {
      const other = hits[i];
      if (typeof mergeTrackingRecord === 'function') {
        const merged = mergeTrackingRecord(keep, other);
        Object.assign(keep, merged);
      } else {
        if (!keep.breakpoint_gid && other.breakpoint_gid) {
          keep.breakpoint_gid = other.breakpoint_gid;
          keep.breakpoint_token = other.breakpoint_token;
          keep.breakpoint_title = other.breakpoint_title;
          keep.breakpoint_page = other.breakpoint_page;
          keep.breakpoint_url = other.breakpoint_url;
          keep.breakpoint_posted_at = other.breakpoint_posted_at;
        }
        if (!keep.top_gid && other.top_gid) {
          keep.top_gid = other.top_gid;
          keep.top_token = other.top_token;
          keep.top_title = other.top_title;
          keep.top_posted_at = other.top_posted_at;
        }
        // 未读跟较新断点，禁止 max 粘住旧大数
        const ka = Number(keep.breakpoint_at) || 0;
        const oa = Number(other.breakpoint_at) || 0;
        if (oa > ka && other.unread_estimate != null) {
          keep.unread_estimate = Number(other.unread_estimate) || 0;
          keep.unread_estimate_capped = other.unread_estimate_capped ? 1 : 0;
        }
        if (other.has_update) keep.has_update = 1;
      }
      try {
        await deleteTrackingRecord(other.id);
      } catch (_) { /* ignore */ }
    }
    if (sig) keep.query_signature = sig;
    if (context.open_url) {
      const canon =
        typeof canonicalizeTrackingOpenUrl === 'function'
          ? canonicalizeTrackingOpenUrl(context.open_url)
          : context.open_url;
      keep.open_url = canon;
      keep.page_url = canon;
    }
    if (context.f_search) keep.f_search = context.f_search;
    if (context.label) keep.label = context.label;
    await saveTrackingRecord(keep);
    return keep;
  }

  async function saveTrackingRecord(record) {
    const row = Object.assign({}, record, { updated_at: nowMs() });
    if (!row.id) row.id = uid('trk');
    if (!row.created_at) row.created_at = nowMs();
    await idbPut(STORE_TRACKING, row);
    return row;
  }

  async function deleteTrackingRecord(id) {
    if (!id) return;
    await idbDelete(STORE_TRACKING, id);
  }

  async function upsertTrackingFromContext(context, options = {}) {
    if (!context || !context.query_signature) throw new Error('无法识别当前页为可收藏搜索');
    const openCanon =
      typeof canonicalizeTrackingOpenUrl === 'function'
        ? canonicalizeTrackingOpenUrl(context.open_url || context.page_url || location.href)
        : context.open_url || context.page_url || location.href;
    context.open_url = openCanon;
    context.page_url = openCanon;

    let existing = null;
    if (!options.forceNew) {
      existing =
        typeof findTrackingForContext === 'function'
          ? await findTrackingForContext(context)
          : await getTrackingBySignature(context.query_signature);
    }
    if (existing && !options.forceNew) {
      existing.query_signature = context.query_signature || existing.query_signature;
      existing.open_url = openCanon;
      existing.page_url = openCanon;
      existing.label = context.label || existing.label;
      existing.group_type = context.group_type || existing.group_type;
      existing.f_search = context.f_search || existing.f_search;
      existing.namespace = context.namespace || existing.namespace;
      existing.tag_name = context.tag_name || existing.tag_name;
      if (context.site) existing.site = context.site;
      if (context.favcat != null && context.favcat !== '') existing.favcat = context.favcat;
      if (context.favcat_label) existing.favcat_label = context.favcat_label;
      existing.last_browsed_at = nowMs();
      // 仅首页上下文才更新 top（深页 top_gid 为空）
      if (context.top_gid) {
        if (existing.top_gid && existing.top_gid !== context.top_gid) {
          existing.has_update = 1;
          existing.prev_top_gid = existing.top_gid;
        }
        existing.top_gid = context.top_gid;
        if (context.top_token) existing.top_token = compactText(context.top_token);
        if (context.top_title) existing.top_title = compactText(context.top_title).slice(0, 160);
        if (context.top_posted_at) existing.top_posted_at = Number(context.top_posted_at) || 0;
      }
      if (context.top_cover) applyTrackingCoverFields(existing, context.top_cover);
      return saveTrackingRecord(existing);
    }
    const created = {
      id: uid('trk'),
      query_signature: context.query_signature,
      group_type: context.group_type || 'other',
      label: context.label || context.f_search || '未命名搜索',
      custom_label: '',
      custom_folder: '',
      note: '',
      open_url: openCanon,
      page_url: openCanon,
      f_search: context.f_search || '',
      namespace: context.namespace || '',
      tag_name: context.tag_name || '',
      favcat: context.favcat || '',
      favcat_label: context.favcat_label || '',
      site: context.site || '',
      top_gid: context.top_gid || '',
      top_token: context.top_token || '',
      top_title: context.top_title || '',
      top_posted_at: Number(context.top_posted_at) || 0,
      top_cover: '',
      cover_url: '',
      has_update: 0,
      unread_estimate: 0,
      unread_estimate_capped: 0,
      unread_estimate_source: '',
      archived: 0,
      last_check_at: nowMs(),
      last_browsed_at: nowMs(),
      created_at: nowMs(),
    };
    if (context.top_cover) applyTrackingCoverFields(created, context.top_cover);
    return saveTrackingRecord(created);
  }

  /**
   * ExH 列表分组：以手动「设分类」为主。
   * 自由词搜索很难自动分得准，故不再按 artist/search/favorites 等自动拆组；
   * 无 custom_folder 的一律进「未分类」。
   */
  function getTrackingListGroupKey(r) {
    if (!r) return 'none';
    const folder = compactText(r.custom_folder || '');
    if (folder) return 'uf:' + folder.toLowerCase();
    return 'none';
  }

  function getTrackingListGroupLabel(key, sample) {
    if (!key || key === 'none') return '未分类';
    if (key.indexOf('uf:') === 0) {
      return compactText((sample && sample.custom_folder) || key.slice(3)) || '自定义';
    }
    // 兼容旧 session 筛选键
    if (key.indexOf('fav:') === 0) {
      const cat = key.slice(4);
      const name =
        compactText((sample && sample.favcat_label) || '') ||
        (cat === 'all' ? '全部' : '夹 ' + cat);
      return '收藏 · ' + name;
    }
    if (key.indexOf('g:') === 0) {
      return getTrackingGroupLabel(key.slice(2) || 'other');
    }
    return getTrackingGroupLabel((sample && sample.group_type) || key);
  }

  /** 卡片左侧 monogram（对齐 JLC 封面位） */
  function getTrackingGroupMonogram(groupType) {
    const map = {
      artist: '画',
      group: '社',
      parody: '原',
      character: '角',
      female: '女',
      male: '男',
      tag: '标',
      category: '类',
      uploader: '传',
      search: '搜',
      favorites: '藏',
      folder: '夹',
      other: '追',
    };
    return map[String(groupType || '').toLowerCase()] || '追';
  }

  function getTrackingCardGroupType(record) {
    if (!record) return 'other';
    if (compactText(record.custom_folder || '')) return 'folder';
    return record.group_type || 'other';
  }

  /** 封面 URL 优先级：列表顶封面 > 通用封面（对齐 JLC） */
  function getTrackingDisplayCoverUrl(record) {
    return compactText((record && (record.top_cover || record.cover_url)) || '');
  }

  function applyTrackingCoverFields(record, coverUrl) {
    if (!record) return record;
    const c = compactText(coverUrl || '');
    if (!c || /^data:/i.test(c)) return record;
    if (/placeholder|blank\.|spacer|1x1|loading\.gif|transparent/i.test(c)) return record;
    record.top_cover = c;
    record.cover_url = c;
    return record;
  }

  function buildTrackingCoverHtml(record) {
    const gt = getTrackingCardGroupType(record);
    const mono = getTrackingGroupMonogram(gt === 'folder' ? 'folder' : gt);
    const coverUrl = getTrackingDisplayCoverUrl(record);
    if (coverUrl) {
      return (
        '<div class="jlc-wb-cover is-poster" data-group="' +
        escapeHtml(gt) +
        '">' +
        '<img src="' +
        escapeHtml(coverUrl) +
        '" alt="" loading="lazy" referrerpolicy="no-referrer" draggable="false"' +
        ' onerror="this.style.display=\'none\';var f=this.nextElementSibling;if(f)f.hidden=false;">' +
        '<span class="jlc-wb-cover-fallback" hidden>' +
        escapeHtml(mono) +
        '</span></div>'
      );
    }
    return (
      '<div class="jlc-wb-cover is-mono" data-group="' +
      escapeHtml(gt) +
      '"><span class="jlc-wb-cover-fallback">' +
      escapeHtml(mono) +
      '</span></div>'
    );
  }

  function getTrackingDisplayTitle(record) {
    if (!record) return '';
    let t = compactText(
      record.custom_label || record.label || record.f_search || record.query_signature || record.id
    );
    // 清掉历史脏后缀
    t = t.replace(/\s*·\s*分类过滤\s*$/i, '').trim();
    return t;
  }

  function shortTrackingWorkLabel(title, gid, maxLen) {
    maxLen = maxLen || 40;
    const tt = compactText(title || '');
    if (tt) return tt.length > maxLen ? tt.slice(0, maxLen) + '…' : tt;
    const g = compactText(gid || '');
    return g ? 'g' + g : '';
  }

  /** 作品发布时间短标签：YY-MM-DD HH:mm（对齐 EH 列表观感，远短于标题） */
  function formatTrackingPostedShort(ms) {
    const t = Number(ms) || 0;
    if (!t) return '';
    const d = new Date(t);
    if (!Number.isFinite(d.getTime()) || d.getTime() <= 0) return '';
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return yy + '-' + mm + '-' + dd + ' ' + hh + ':' + mi;
  }

  /**
   * 卡片「最新」展示：只显示发布时间（标题太长会挤爆）。
   * 无时间返回空串，由 UI 显示「—」，绝不回退长标题 / g####。
   */
  function getTrackingTopMetaLabel(record) {
    return formatTrackingPostedShort(record && record.top_posted_at);
  }

  /** 卡片「断点」展示：只显示发布时间 */
  function getTrackingBpMetaLabel(record) {
    return formatTrackingPostedShort(record && record.breakpoint_posted_at);
  }

  function getTrackingGroupLabel(type) {
    return TRACKING_GROUP_LABELS[type] || TRACKING_GROUP_LABELS.other;
  }

  async function exportBackup() {
    return {
      version: VERSION,
      exported_at: new Date().toISOString(),
      kind: 'exh_full',
      // 配置去掉本机显示相关字段（缩略倍率、工作台宽度等）
      config: typeof cloneConfigForSync === 'function' ? cloneConfigForSync() : deepClone(config),
      // 列表「已点」描边
      seen_gids: typeof loadSeenGids === 'function' ? loadSeenGids() : {},
      // LRR 同步元数据 / 熟人汇总（可被 LRR 再刷新，但仍应跨机）
      lrr_meta: typeof loadLrrMeta === 'function' ? loadLrrMeta() : {},
      tracking_searches: await idbGetAll(STORE_TRACKING),
      works: await idbGetAll(STORE_WORKS),
      editions: await idbGetAll(STORE_EDITIONS),
      local_archives: await idbGetAll(STORE_ARCHIVES),
      links: await idbGetAll(STORE_LINKS),
      progress: await idbGetAll(STORE_PROGRESS),
    };
  }

  /**
   * 合并单条追更：同 id 或同 query_signature 视为同一项。
   * 按 updated_at 取较新侧为主，并保留断点 / 未读估数等「更完整」字段。
   */
  function mergeTrackingRecord(local, remote) {
    if (!local) return remote;
    if (!remote) return local;
    const lu = Number(local.updated_at) || 0;
    const ru = Number(remote.updated_at) || 0;
    const newer = ru >= lu ? remote : local;
    const older = ru >= lu ? local : remote;
    const out = Object.assign({}, older, newer);
    // 固定用本机已有 id，避免同 signature 双份
    out.id = local.id || remote.id;
    out.query_signature = local.query_signature || remote.query_signature;
    // 断点：谁更新更晚且有断点用谁；否则拼较完整的一侧
    const localBpAt = Number(local.breakpoint_at) || 0;
    const remoteBpAt = Number(remote.breakpoint_at) || 0;
    if (remoteBpAt > localBpAt && remote.breakpoint_gid) {
      out.breakpoint_gid = remote.breakpoint_gid;
      out.breakpoint_token = remote.breakpoint_token || '';
      out.breakpoint_title = remote.breakpoint_title || '';
      out.breakpoint_page = remote.breakpoint_page;
      out.breakpoint_url = remote.breakpoint_url || '';
      out.breakpoint_at = remote.breakpoint_at;
      out.breakpoint_posted_at = remote.breakpoint_posted_at || 0;
    } else if (local.breakpoint_gid) {
      out.breakpoint_gid = local.breakpoint_gid;
      out.breakpoint_token = local.breakpoint_token || out.breakpoint_token || '';
      out.breakpoint_title = local.breakpoint_title || out.breakpoint_title || '';
      out.breakpoint_page = local.breakpoint_page != null ? local.breakpoint_page : out.breakpoint_page;
      out.breakpoint_url = local.breakpoint_url || out.breakpoint_url || '';
      out.breakpoint_at = local.breakpoint_at || out.breakpoint_at;
      out.breakpoint_posted_at = local.breakpoint_posted_at || out.breakpoint_posted_at || 0;
    }
    // 未读：跟断点会变小，不能 Math.max 把旧大数粘回来；跟较新断点一侧
    const top = compactText(out.top_gid || '');
    const bp = compactText(out.breakpoint_gid || '');
    const caughtUp = !!(top && bp && top === bp);
    if (caughtUp) {
      out.has_update = 0;
      out.unread_estimate = 0;
      out.unread_estimate_capped = 0;
      out.unread_estimate_source = 'home_caught_up';
    } else {
      out.has_update = local.has_update || remote.has_update ? 1 : out.has_update || 0;
      const bpSide = remoteBpAt > localBpAt ? remote : localBpAt > remoteBpAt ? local : newer;
      if (bpSide && bpSide.unread_estimate != null) {
        out.unread_estimate = Math.max(0, Math.floor(Number(bpSide.unread_estimate) || 0));
        out.unread_estimate_capped = bpSide.unread_estimate_capped ? 1 : 0;
        out.unread_estimate_source = bpSide.unread_estimate_source || out.unread_estimate_source || '';
      }
    }
    // 分类 / 自定义名：非空优先较新，空则回退旧
    if (!compactText(out.custom_folder || '')) {
      out.custom_folder = compactText(older.custom_folder || '') || '';
    }
    if (!compactText(out.custom_label || '')) {
      out.custom_label = compactText(older.custom_label || '') || '';
    }
    out.updated_at = Math.max(lu, ru, Number(out.updated_at) || 0);
    return out;
  }

  /** @param {{ fromSync?: boolean }} [options] fromSync 时不标脏 */
  async function importBackup(payload, options) {
    if (!payload || typeof payload !== 'object') throw new Error('invalid backup');
    options = options || {};
    idbSyncSuppress = true;
    try {
      if (payload.config && typeof payload.config === 'object') {
        // 保留本机显示类配置，不被云端/备份覆盖
        const localKeep = typeof pickConfigLocalOnly === 'function' ? pickConfigLocalOnly(config) : {};
        saveConfig(Object.assign({}, payload.config, localKeep));
      }
      if (payload.seen_gids && typeof payload.seen_gids === 'object' && typeof saveSeenGids === 'function') {
        // 合并：云端 + 本机（本机更新时间较新的保留）
        const local = typeof loadSeenGids === 'function' ? loadSeenGids() : {};
        const merged = Object.assign({}, payload.seen_gids);
        Object.keys(local).forEach((gid) => {
          const a = Number(local[gid]) || 0;
          const b = Number(merged[gid]) || 0;
          if (a >= b) merged[gid] = local[gid];
        });
        saveSeenGids(merged);
      }
      if (payload.lrr_meta && typeof payload.lrr_meta === 'object' && typeof saveLrrMeta === 'function') {
        saveLrrMeta(payload.lrr_meta);
      }
      // 追更：按 id / signature 合并，避免「空本机推上去」或「双端各写几条」丢收藏
      if (Array.isArray(payload.tracking_searches) && payload.tracking_searches.length) {
        const localRows = (await idbGetAll(STORE_TRACKING)) || [];
        const byId = new Map();
        const bySig = new Map();
        localRows.forEach((r) => {
          if (!r) return;
          if (r.id) byId.set(String(r.id), r);
          if (r.query_signature) bySig.set(String(r.query_signature), r);
        });
        const consumedLocal = new Set();
        for (const remote of payload.tracking_searches) {
          if (!remote || typeof remote !== 'object') continue;
          let local = remote.id ? byId.get(String(remote.id)) : null;
          if (!local && remote.query_signature) {
            local = bySig.get(String(remote.query_signature)) || null;
          }
          if (local && local.id) consumedLocal.add(String(local.id));
          const merged = mergeTrackingRecord(local, remote);
          if (!merged.id) merged.id = uid('trk');
          await idbPut(STORE_TRACKING, merged);
        }
      }
      for (const w of payload.works || []) await idbPut(STORE_WORKS, w);
      for (const e of payload.editions || []) await idbPut(STORE_EDITIONS, e);
      for (const a of payload.local_archives || []) await idbPut(STORE_ARCHIVES, a);
      for (const l of payload.links || []) await idbPut(STORE_LINKS, l);
      for (const p of payload.progress || []) await idbPut(STORE_PROGRESS, p);
    } finally {
      idbSyncSuppress = false;
      if (!options.fromSync && typeof markCreamuLocalDirty === 'function') {
        markCreamuLocalDirty();
      }
    }
  }
