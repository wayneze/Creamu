
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
  async function enrichArchiveForCompare(archive, edByGid, completeEditionIndex) {
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
    else if (!completeEditionIndex) bound = await getEditionByGid(gid);
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
