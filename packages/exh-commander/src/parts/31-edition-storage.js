
  function makeEditionId(gid, token) {
    return editionKey(gid, token);
  }

  function mergeEditionAvailabilityState(merged, incoming, previous) {
    if (!previous) return merged;
    const incomingAvailabilityAt = Number(incoming.availability_checked_at) || 0;
    const previousAvailabilityAt = Number(previous.availability_checked_at) || 0;
    const incomingAvailability = normalizeEditionAvailabilityStatus(
      incoming.availability_status,
      incoming.expunged
    );
    const previousAvailability = normalizeEditionAvailabilityStatus(
      previous.availability_status,
      previous.expunged
    );
    const keepPreviousAvailability =
      !incomingAvailabilityAt ||
      previousAvailabilityAt > incomingAvailabilityAt ||
      (previousAvailabilityAt === incomingAvailabilityAt &&
        previousAvailability !== 'unknown' &&
        incomingAvailability === 'unknown');
    if (!keepPreviousAvailability) return merged;
    merged.availability_status = previousAvailability;
    merged.availability_checked_at = previousAvailabilityAt;
    merged.availability_reason = compactText(previous.availability_reason || '');
    merged.availability_error = compactText(previous.availability_error || '');
    merged.expunged = previousAvailability === 'expunged' ? 1 : 0;
    return merged;
  }

  function mergeEditionRecord(partial, previous) {
    const rec = normalizeEditionRecord(partial);
    if (!rec.gid || !rec.token) throw new Error('edition requires gid/token');
    const id = makeEditionId(rec.gid, rec.token);
    const prev = previous || null;
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
      const set = new Set(prev.tags.map(String));
      merged.tags.forEach((t) => set.add(String(t)));
      merged.tags = Array.from(set);
    }
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

      mergeEditionAvailabilityState(merged, rec, prev);
    }
    return { merged, previous: prev };
  }

  async function upsertEdition(partial) {
    const rec = normalizeEditionRecord(partial);
    if (!rec.gid || !rec.token) throw new Error('edition requires gid/token');
    const id = makeEditionId(rec.gid, rec.token);
    const prev = await idbGet(STORE_EDITIONS, id);
    const merged = mergeEditionRecord(partial, prev).merged;
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

  function createWorkFromEdition(edition, workId) {
    return {
      work_id: workId || uid('work'),
      title_raw: edition.title_raw,
      title_core: edition.title_core,
      favorite: 0,
      status: 'none',
      blocked: 0,
      note: '',
      created_at: nowMs(),
      updated_at: nowMs(),
    };
  }

  const LIST_LIBRARY_MIN_TITLE_SCORE = 0.6;

  function addListIndexValue(index, key, value) {
    if (!key) return;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(value);
  }

  function createListTitleIndex(value) {
    const core = buildTitleCore(value || '');
    const tokens = tokenize(core);
    const compact = Array.from(core.replace(/\s+/g, ''));
    const grams = new Set();
    for (let index = 0; index + 2 < compact.length; index++) {
      grams.add(compact.slice(index, index + 3).join(''));
    }
    return { core, tokens, grams: Array.from(grams), compactLength: compact.length };
  }

  function getIndexedTitleSimilarity(left, right) {
    if (!left.core || !right.core) return 0;
    if (left.core === right.core) return 1;
    if (left.core.includes(right.core) || right.core.includes(left.core)) return 0.92;
    return jaccard(left.tokens, right.tokens);
  }

  function getSnapshotArchiveCandidates(storageSnapshot, edition) {
    const snapshot = indexListStorageSnapshot(storageSnapshot);
    const query = createListTitleIndex(edition.title_raw || edition.title_core || '');
    if (!query.core) return [];

    const candidates = new Map();
    const add = (archive) => {
      if (archive && archive.arcid) candidates.set(String(archive.arcid), archive);
    };
    if (query.compactLength < 3) {
      snapshot.archives.forEach(add);
    } else {
      new Set(query.tokens).forEach((token) => {
        (snapshot.archivesByTitleToken.get(token) || []).forEach(add);
      });
      query.grams.forEach((gram) => {
        (snapshot.archivesByTitleGram.get(gram) || []).forEach(add);
      });
      snapshot.shortTitleArchives.forEach(add);
    }

    // structuralMatchScore 最多再加 0.22；低于 0.6 的标题不可能达到模糊命中阈值 0.85。
    const result = [];
    candidates.forEach((archive, arcid) => {
      const title = snapshot.archiveTitleInfoById.get(arcid);
      const titleScore = title ? getIndexedTitleSimilarity(query, title) : 0;
      if (titleScore < LIST_LIBRARY_MIN_TITLE_SCORE) return;
      result.push({ archive, titleScore });
    });
    result.sort(
      (left, right) =>
        (snapshot.archiveOrderById.get(String(left.archive.arcid)) || 0) -
        (snapshot.archiveOrderById.get(String(right.archive.arcid)) || 0)
    );
    return result;
  }

  function getSnapshotArchivesByIds(storageSnapshot, arcids, excludedArcids) {
    const snapshot = indexListStorageSnapshot(storageSnapshot);
    const excluded = excludedArcids || new Set();
    const rows = [];
    for (const arcid of arcids || []) {
      const id = String(arcid || '');
      if (!id || excluded.has(arcid) || excluded.has(id)) continue;
      const archive = snapshot.archivesById.get(id);
      if (archive) rows.push(archive);
    }
    rows.sort(
      (left, right) =>
        (snapshot.archiveOrderById.get(String(left.arcid)) || 0) -
        (snapshot.archiveOrderById.get(String(right.arcid)) || 0)
    );
    return rows;
  }

  function indexListStorageSnapshot(snapshot) {
    const indexed = snapshot || {};
    if (
      indexed._listStorageIndexed === true &&
      indexed.editionsByWork instanceof Map &&
      indexed.worksById instanceof Map &&
      indexed.archivesBySourceGid instanceof Map &&
      indexed.archiveTitleInfoById instanceof Map
    ) {
      return indexed;
    }
    const editions = Array.isArray(indexed.editions) ? indexed.editions : [];
    const works = Array.isArray(indexed.works) ? indexed.works : [];
    const archives = Array.isArray(indexed.archives) ? indexed.archives : [];
    indexed.editionsById = new Map(editions.map((row) => [row.id, row]));
    indexed.worksById = new Map(works.map((row) => [row.work_id, row]));
    indexed.editionsByWork = new Map();
    indexed.editionsByGid = new Map();
    indexed.editionsByTitleCore = new Map();
    for (const row of editions) {
      if (row.work_id) {
        if (!indexed.editionsByWork.has(row.work_id)) indexed.editionsByWork.set(row.work_id, []);
        indexed.editionsByWork.get(row.work_id).push(row);
      }
      if (row.gid) {
        const gid = String(row.gid);
        const current = indexed.editionsByGid.get(gid);
        if (!current || (Number(row.updated_at) || 0) >= (Number(current.updated_at) || 0)) {
          indexed.editionsByGid.set(gid, row);
        }
      }
      if (row.title_core) {
        if (!indexed.editionsByTitleCore.has(row.title_core)) indexed.editionsByTitleCore.set(row.title_core, []);
        indexed.editionsByTitleCore.get(row.title_core).push(row);
      }
    }
    indexed.archivesById = new Map();
    indexed.archiveOrderById = new Map();
    indexed.archivesByGid = new Map();
    indexed.archivesBySourceGid = new Map();
    indexed.archivesByTitleToken = new Map();
    indexed.archivesByTitleGram = new Map();
    indexed.archiveTitleInfoById = new Map();
    indexed.shortTitleArchives = [];
    for (let archiveIndex = 0; archiveIndex < archives.length; archiveIndex++) {
      const row = archives[archiveIndex];
      const arcid = String(row.arcid || '');
      if (arcid) {
        indexed.archivesById.set(arcid, row);
        indexed.archiveOrderById.set(arcid, archiveIndex);
      }
      const explicitGid = row.eh_gid ? String(row.eh_gid) : '';
      const sourceGid = explicitGid || String(extractEhGidFromTags(row.tags || []) || '');
      if (explicitGid) addListIndexValue(indexed.archivesByGid, explicitGid, row);
      if (sourceGid) addListIndexValue(indexed.archivesBySourceGid, sourceGid, row);

      const title = createListTitleIndex(row.title || row.title_core || '');
      if (arcid) indexed.archiveTitleInfoById.set(arcid, title);
      new Set(title.tokens).forEach((token) => {
        addListIndexValue(indexed.archivesByTitleToken, token, row);
      });
      title.grams.forEach((gram) => {
        addListIndexValue(indexed.archivesByTitleGram, gram, row);
      });
      if (title.compactLength < 3) indexed.shortTitleArchives.push(row);
    }
    indexed._listStorageIndexed = true;
    return indexed;
  }

  async function loadLibraryStorageSnapshot() {
    const loaded = await idbGetAllFromStores([
      STORE_WORKS,
      STORE_EDITIONS,
      STORE_ARCHIVES,
      STORE_LINKS,
    ]);
    return indexListStorageSnapshot({
      works: loaded[STORE_WORKS] || [],
      editions: loaded[STORE_EDITIONS] || [],
      archives: loaded[STORE_ARCHIVES] || [],
      links: loaded[STORE_LINKS] || [],
    });
  }

  function removeIndexedEdition(snapshot, edition) {
    if (!edition) return;
    const remove = (map, key) => {
      if (!key || !map.has(key)) return;
      const next = map.get(key).filter((row) => row.id !== edition.id);
      if (next.length) map.set(key, next);
      else map.delete(key);
    };
    remove(snapshot.editionsByWork, edition.work_id);
    remove(snapshot.editionsByTitleCore, edition.title_core);
    if (edition.gid && snapshot.editionsByGid.get(String(edition.gid))?.id === edition.id) {
      snapshot.editionsByGid.delete(String(edition.gid));
    }
  }

  function addIndexedEdition(snapshot, edition) {
    snapshot.editionsById.set(edition.id, edition);
    if (edition.work_id) {
      if (!snapshot.editionsByWork.has(edition.work_id)) snapshot.editionsByWork.set(edition.work_id, []);
      snapshot.editionsByWork.get(edition.work_id).push(edition);
    }
    if (edition.gid) {
      const gid = String(edition.gid);
      const current = snapshot.editionsByGid.get(gid);
      if (!current || (Number(edition.updated_at) || 0) >= (Number(current.updated_at) || 0)) {
        snapshot.editionsByGid.set(gid, edition);
      }
    }
    if (edition.title_core) {
      if (!snapshot.editionsByTitleCore.has(edition.title_core)) {
        snapshot.editionsByTitleCore.set(edition.title_core, []);
      }
      snapshot.editionsByTitleCore.get(edition.title_core).push(edition);
    }
  }

  function findSnapshotWorkForEdition(edition, snapshot) {
    if (edition.work_id && snapshot.worksById.has(edition.work_id)) {
      return snapshot.worksById.get(edition.work_id);
    }
    if (config.auto_cluster) {
      const candidates = snapshot.editionsByTitleCore.get(edition.title_core) || [];
      let best = null;
      let bestScore = 0;
      for (const candidate of candidates) {
        if (!candidate.work_id) continue;
        if (candidate.gid === edition.gid && candidate.token === edition.token) continue;
        let score = titleSimilarity(edition.title_raw, candidate.title_raw);
        if (
          edition.group &&
          candidate.group &&
          edition.group.toLowerCase() === String(candidate.group).toLowerCase()
        ) {
          score += 0.05;
        }
        if (score >= (config.cluster_threshold || 0.82) && score > bestScore) {
          bestScore = score;
          best = candidate;
        }
      }
      if (best && snapshot.worksById.has(best.work_id)) {
        return snapshot.worksById.get(best.work_id);
      }
    }
    return null;
  }

  function refreshSnapshotArchivesForEdition(edition, snapshot, archiveWrites) {
    if (!edition || !edition.gid) return;
    const gid = String(edition.gid);
    const explicit = snapshot.archivesByGid.get(gid) || [];
    const rows = explicit.length
      ? explicit
      : snapshot.archivesBySourceGid.get(gid) || [];
    for (const archive of rows) {
      const enriched = applyBoundEditionQualityToArchive(
        Object.assign({}, archive, { eh_gid: gid }),
        edition
      );
      const changed =
        enriched.language !== archive.language ||
        enriched.censor_tier !== archive.censor_tier ||
        (enriched.group && enriched.group !== archive.group) ||
        !archive.eh_gid;
      if (!changed) continue;
      archive.eh_gid = gid;
      archive.language = enriched.language;
      archive.censor_tier = enriched.censor_tier;
      if (enriched.group) archive.group = enriched.group;
      archive.quality_from_eh_source = 1;
      archive.updated_at = nowMs();
      archiveWrites.set(archive.arcid, archive);
      if (!snapshot.archivesByGid.has(gid)) snapshot.archivesByGid.set(gid, []);
      const explicitBucket = snapshot.archivesByGid.get(gid);
      if (!explicitBucket.some((row) => row.arcid === archive.arcid)) explicitBucket.push(archive);
      if (!snapshot.archivesBySourceGid.has(gid)) snapshot.archivesBySourceGid.set(gid, []);
      const sourceBucket = snapshot.archivesBySourceGid.get(gid);
      if (!sourceBucket.some((row) => row.arcid === archive.arcid)) sourceBucket.push(archive);
    }
  }

  async function upsertEditionsWithSnapshot(partials) {
    const input = Array.from(partials || []);
    if (!input.length) {
      return { editions: [], snapshot: indexListStorageSnapshot({ works: [], editions: [], archives: [], links: [] }) };
    }
    const snapshot = await loadLibraryStorageSnapshot();
    const editionWrites = new Map();
    const workWrites = new Map();
    const archiveWrites = new Map();
    const result = [];

    for (const partial of input) {
      const normalized = normalizeEditionRecord(partial);
      if (!normalized.gid || !normalized.token) throw new Error('edition requires gid/token');
      const id = makeEditionId(normalized.gid, normalized.token);
      const previous = snapshot.editionsById.get(id) || null;
      const edition = mergeEditionRecord(partial, previous).merged;
      let work = null;
      if (!edition.work_id && previous && previous.work_id) edition.work_id = previous.work_id;
      work = findSnapshotWorkForEdition(edition, snapshot);
      if (!work) {
        work = createWorkFromEdition(edition, edition.work_id);
        snapshot.works.push(work);
        snapshot.worksById.set(work.work_id, work);
      }
      edition.work_id = work.work_id;
      if (!work.title_core) work.title_core = edition.title_core;
      if (!work.title_raw) work.title_raw = edition.title_raw;
      work.updated_at = nowMs();

      removeIndexedEdition(snapshot, previous);
      addIndexedEdition(snapshot, edition);
      editionWrites.set(edition.id, edition);
      workWrites.set(work.work_id, work);
      refreshSnapshotArchivesForEdition(edition, snapshot, archiveWrites);
      result.push(edition);
    }

    snapshot.editions = Array.from(snapshot.editionsById.values());
    snapshot.works = Array.from(snapshot.worksById.values());
    await idbPutBatches({
      [STORE_WORKS]: Array.from(workWrites.values()),
      [STORE_EDITIONS]: Array.from(editionWrites.values()),
      [STORE_ARCHIVES]: Array.from(archiveWrites.values()),
    });
    return { editions: result, snapshot };
  }
