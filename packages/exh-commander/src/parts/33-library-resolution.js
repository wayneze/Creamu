
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

  async function resolveLibraryState(edition, storageSnapshot) {
    const hasSnapshot = !!storageSnapshot;
    const snapshot = hasSnapshot ? indexListStorageSnapshot(storageSnapshot) : null;
    const archives = hasSnapshot ? snapshot.archives : await listArchives();
    const links = hasSnapshot ? snapshot.links : await listLinks();
    const editionId = edition.id || makeEditionId(edition.gid, edition.token);
    const workId = edition.work_id;
    const siblingEds = workId
      ? hasSnapshot
        ? snapshot.editionsByWork.get(workId) || []
        : await listEditionsByWork(workId)
      : [edition];

    const negativeArc = new Set(
      links.filter((l) => l.negative && (l.edition_id === editionId || l.work_id === workId)).map((l) => l.arcid)
    );

    const linked = links.filter(
      (l) =>
        !l.negative &&
        ((l.edition_id && l.edition_id === editionId) || (l.work_id && workId && l.work_id === workId))
    );

    const byGid = hasSnapshot
      ? snapshot.archivesByGid.get(String(edition.gid)) || []
      : archives.filter((a) => a.eh_gid && String(a.eh_gid) === String(edition.gid));
    const exactArcIds = new Set([
      ...linked.filter((l) => l.edition_id === editionId).map((l) => l.arcid),
      ...byGid.map((a) => a.arcid),
    ]);

    const workArcIds = new Set([...exactArcIds, ...linked.map((l) => l.arcid)]);

    if (workId) {
      for (const ed of siblingEds) {
        const siblingArchives = hasSnapshot
          ? snapshot.archivesByGid.get(String(ed.gid)) || []
          : archives;
        for (const a of siblingArchives) {
          if (hasSnapshot || (a.eh_gid && String(a.eh_gid) === String(ed.gid))) {
            workArcIds.add(a.arcid);
          }
        }
      }
    }

    const exactArchives = hasSnapshot
      ? getSnapshotArchivesByIds(snapshot, exactArcIds, negativeArc)
      : archives.filter((a) => exactArcIds.has(a.arcid) && !negativeArc.has(a.arcid));
    const workArchives = hasSnapshot
      ? getSnapshotArchivesByIds(snapshot, workArcIds, negativeArc)
      : archives.filter((a) => workArcIds.has(a.arcid) && !negativeArc.has(a.arcid));

    // 同 work edition map：LRR source/eh_gid → 码级语言
    const edByGid = new Map();
    if (hasSnapshot) {
      snapshot.editionsByGid.forEach((ed, gid) => edByGid.set(String(gid), ed));
    }
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
      const candidates = hasSnapshot
        ? getSnapshotArchiveCandidates(snapshot, edition)
        : archives.map((archive) => ({ archive, titleScore: undefined }));
      for (const candidate of candidates) {
        const a = candidate.archive;
        if (negativeArc.has(a.arcid)) continue;
        if (exactArcIds.has(a.arcid) || workArcIds.has(a.arcid)) continue;
        const aEn = await enrichArchiveForCompare(a, edByGid, hasSnapshot);
        const score = structuralMatchScore(edition, aEn, candidate.titleScore);
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
      preferred_in_library = hasSnapshot
        ? links.some(
            (link) =>
              !link.negative &&
              link.edition_id ===
                (preferredEdition.id || makeEditionId(preferredEdition.gid, preferredEdition.token)) &&
              link.arcid
          ) || (snapshot.archivesByGid.get(String(preferredEdition.gid)) || []).length > 0
        : await resolveEditionExactInLibrary(preferredEdition, archives, links);
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
        enriched.push(await enrichArchiveForCompare(a, edByGid, hasSnapshot));
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
      compareArc = await enrichArchiveForCompare(fuzzyTop[0].archive, edByGid, hasSnapshot);
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

  async function listBlockedWorks(storageSnapshot) {
    const all = storageSnapshot
      ? indexListStorageSnapshot(storageSnapshot).works
      : await idbGetAll(STORE_WORKS);
    return (all || []).filter((w) => w.blocked).sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  }

  /** LRR 在库：以 local_archives 为准，再挂 work/edition/link（若有） */
  async function listLibraryArchiveEntries(storageSnapshot) {
    const snapshot = storageSnapshot
      ? indexListStorageSnapshot(storageSnapshot)
      : await loadLibraryStorageSnapshot();
    const archives = snapshot.archives || [];
    if (!archives.length) return [];

    const links = snapshot.links || [];
    const editions = snapshot.editions || [];
    const works = snapshot.works || [];
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

  async function listAllWorks(storageSnapshot) {
    const all = storageSnapshot
      ? indexListStorageSnapshot(storageSnapshot).works
      : await idbGetAll(STORE_WORKS);
    return Array.from(all || []).sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  }
