
  /**
   * 把画廊增强面板放到封面/信息浮动块之后（与 #gleft #gmid #gright 同级）。
   */
  function placeGalleryPanel(panel) {
    if (!panel) return;
    const gleft = document.getElementById('gleft');
    const gmid = document.getElementById('gmid');
    const gright = document.getElementById('gright');
    const gd2 = document.getElementById('gd2');
    // 取同级浮动块中 DOM 顺序最后的一个，插在其后
    const floats = [gleft, gd2, gmid, gright].filter(Boolean);
    let last = null;
    for (const el of floats) {
      if (!last) {
        last = el;
        continue;
      }
      // 若 el 在 last 之后
      if (last.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) {
        last = el;
      }
    }
    const parent = (last && last.parentNode) || document.body;
    if (panel.parentNode === parent && last && last.nextSibling === panel) return;
    if (last) parent.insertBefore(panel, last.nextSibling);
    else parent.appendChild(panel);
  }

  /** 点击是否比断点更新（EH：更小页码 / 同页更前 / 时间 / gid） */
  function isClickNewerThanBreakpoint(pending, rec, edition, partial) {
    if (!rec) return false;
    const curGid = String((edition && edition.gid) || pending.gid || '');
    const bpGid = compactText(rec.breakpoint_gid || '');
    if (!curGid) return false;
    if (!bpGid) return true;
    if (bpGid === curGid) return false;

    // 1) 列表位置：EH 第 1 页最新；页码 0-based 越小越新
    const pPage = Number(pending && pending.pageIndex);
    const bpPage = Number(rec.breakpoint_page);
    const pIdx = Number(pending && pending.listIndex);
    if (Number.isFinite(pPage) && pPage >= 0 && Number.isFinite(bpPage) && bpPage >= 0) {
      if (pPage < bpPage) return true;
      if (pPage > bpPage) return false;
      // 同页：列表序号越小越新
      if (Number.isFinite(pIdx) && pIdx >= 0) {
        // 若断点也在本页 DOM 里，用位置比
        try {
          if (typeof extractOrderedGidsFromDocument === 'function' && detectPageKind() !== 'gallery') {
            const gids = extractOrderedGidsFromDocument(document) || [];
            const bpAt = gids.indexOf(String(bpGid));
            if (bpAt >= 0) return pIdx < bpAt;
          }
        } catch (_) { /* ignore */ }
        // 无断点位置：同页仍倾向跟进（用户从断点往新翻）
        return true;
      }
    }

    // 2) 发布时间
    const curPosted =
      Number(edition && edition.posted_at) ||
      Number(partial && partial.posted_at) ||
      Number(pending && pending.posted_at) ||
      0;
    const bpPosted = Number(rec.breakpoint_posted_at) || 0;
    if (curPosted > 0 && bpPosted > 0) return curPosted > bpPosted;

    // 3) gid 近似（通常新作更大）
    const a = Number(curGid) || 0;
    const b = Number(bpGid) || 0;
    if (a > 0 && b > 0 && a !== b) return a > b;

    // 4) 有追更列表上下文但比不出新旧：默认跟进（用户主动点开）
    return true;
  }

  /**
   * 若比断点更新则跟进。opts.pending 有则用列表上下文（不消费 session）。
   */
  async function maybeAutoAdvanceTrackingBreakpoint(edition, partial, opts) {
    opts = opts || {};
    let pending = opts.pending || null;
    if (!pending) {
      if (typeof takePendingTrackingOpen !== 'function') return null;
      pending = takePendingTrackingOpen();
    }
    if (!pending || !pending.trackingId) return null;
    if (edition && pending.gid && String(pending.gid) !== String(edition.gid)) return null;

    const rec = await idbGet(STORE_TRACKING, pending.trackingId);
    if (!rec) return null;

    const ed = edition || {
      gid: pending.gid,
      token: pending.token,
      posted_at: pending.posted_at,
      title_raw: pending.title,
    };
    if (!isClickNewerThanBreakpoint(pending, rec, ed, partial)) return null;

    const curPosted =
      Number(ed.posted_at) ||
      Number(partial && partial.posted_at) ||
      Number(pending.posted_at) ||
      0;

    await markTrackingBreakpoint(rec, {
      fromGallery: true,
      gid: ed.gid,
      token: ed.token || pending.token || '',
      title: compactText(
        ed.title_raw || (partial && partial.title_raw) || ed.title || pending.title || ''
      ),
      posted_at: curPosted,
      listUrl: pending.listUrl || rec.breakpoint_url || rec.open_url || '',
      pageIndex: pending.pageIndex,
      pageMode: pending.pageMode || '',
      listIndex: pending.listIndex,
      pageLen: pending.pageLen,
      skipUnreadScan: opts.skipUnreadScan === true,
    });
    showToast('断点已跟到当前作品');
    if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
    return rec;
  }

  /** 兄弟版本缺元数据或尚未检查来源时，用 gdata 批量补全。 */
  async function enrichSiblingEditionsMeta(siblings) {
    const list = (siblings || []).filter(Boolean);
    if (!list.length || typeof checkEditionAvailabilityBatch !== 'function') return 0;
    const need = list.filter((ed) => {
      if (!ed.token) return false;
      const availability = normalizeEditionAvailabilityStatus(
        ed.availability_status,
        ed.expunged
      );
      if (availability === 'expunged' || availability === 'unavailable') return false;
      return (
        availability === 'unknown' ||
        !(Number(ed.availability_checked_at) > 0) ||
        !(Number(ed.size_bytes) > 0) ||
        !(Number(ed.posted_at) > 0) ||
        !(Number(ed.pages) > 0) ||
        !ed.censor_tier ||
        ed.censor_tier === 'unknown' ||
        !ed.language ||
        ed.language === 'other'
      );
    });
    if (!need.length) return 0;
    try {
      const result = await checkEditionAvailabilityBatch(need.slice(0, 25));
      return Number(result && result.updatedCount) || 0;
    } catch (_) {
      return 0;
    }
  }

  /** 按标题搜相关上传并入 Work；同 work 5 分钟内最多一次 */
  async function autoImportRelatedOnlineEditions(edition, options) {
    if (!edition || !edition.work_id) return;
    options = options || {};
    const key = 'exc_rel_imp_' + edition.work_id;
    let skipSearch = false;
    try {
      const last = Number(sessionStorage.getItem(key) || 0);
      if (last && nowMs() - last < 5 * 60 * 1000) skipSearch = true;
      else sessionStorage.setItem(key, String(nowMs()));
    } catch (_) { /* ignore */ }
    try {
      let r = { imported: 0 };
      // 5 分钟内不再重复标题搜索；但缺体积/时间的兄弟仍用 gdata 补
      if (!skipSearch && typeof importRelatedOnlineEditions === 'function') {
        r = await importRelatedOnlineEditions(edition, {
          workId: edition.work_id,
          limit: 12,
          minSim: 0.68,
        });
      }
      const sibs = r && r.imported > 0
        ? await listEditionsByWork(edition.work_id)
        : Array.isArray(options.siblings)
          ? options.siblings
          : await listEditionsByWork(edition.work_id);
      const filled = await enrichSiblingEditionsMeta(sibs);
      if ((r && r.imported > 0) || filled > 0) {
        await enhanceGalleryPage({ skipRelatedImport: true });
        if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
      }
    } catch (e) {
      console.warn('[ExC] auto related import', e);
    }
  }

  async function enhanceGalleryPage(opts) {
    opts = opts || {};
    const partial = parseGalleryPage();
    if (!partial) return null;
    const prepared = await upsertEditionsWithSnapshot([partial]);
    const edition = prepared.editions[0];
    if (!edition) return null;
    try {
      markGallerySeen(edition.gid);
    } catch (_) { /* ignore */ }
    try {
      // 列表已乐观跟进时 pending 可能已消费；画廊再试一次（幂等）
      await maybeAutoAdvanceTrackingBreakpoint(edition, partial);
    } catch (e) {
      console.warn('[ExC] auto bp', e);
    }
    const storageSnapshot = prepared.snapshot;
    const work = storageSnapshot.worksById.get(edition.work_id) || null;
    const lib = await resolveLibraryState(edition, storageSnapshot);
    let siblings = storageSnapshot.editionsByWork.get(edition.work_id) || [];
    // 已有兄弟但缺体积/时间：进页就补一轮（不依赖搜索）
    if (opts.skipRelatedImport && siblings && siblings.length) {
      try {
        await enrichSiblingEditionsMeta(siblings);
        siblings = await listEditionsByWork(edition.work_id);
      } catch (_) { /* ignore */ }
    }

    let panel = document.getElementById('exc-gallery-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'exc-gallery-panel';
      // 必须插在 gleft/gmid/gright 整组浮动之后，不能插在 #gd4（gmid 内部）
      // 否则 gmid 被撑高、封面下方左侧会露出站点原色竖条
      placeGalleryPanel(panel);
    } else {
      // 旧版若误插在 gmid 内，纠正位置
      placeGalleryPanel(panel);
    }

    // 其它线上版本（本机 + 自动搜索并入）
    let otherEds = (siblings || []).filter((ed) => String(ed.gid) !== String(edition.gid));

    const lrrLinks = (lib.exact_archives || lib.work_archives || [])
      .slice(0, 4)
      .map((a) => {
        const u = buildLrrReaderUrl(a.arcid);
        return u
          ? '<a class="jlc-wb-btn ghost" href="' +
              escapeHtml(u) +
              '" target="_blank" rel="noreferrer">LRR读 ' +
              escapeHtml(a.arcid.slice(0, 8)) +
              '</a>'
          : '';
      })
      .join(' ');

    let lrrOpenHtml = '';
    // 正式库内打开只认已命中档案，不把模糊候选当库
    const topArc =
      (lib.exact_archives && lib.exact_archives[0]) || (lib.work_archives && lib.work_archives[0]);
    if (topArc && buildLrrReaderUrl(topArc.arcid)) {
      lrrOpenHtml =
        '<a class="jlc-wb-btn ghost" href="' +
        escapeHtml(buildLrrReaderUrl(topArc.arcid)) +
        '" target="_blank" rel="noreferrer">打开库内</a>';
    }
    // 对照卡① LRR 库内 · 对照卡② EXH 多版本（互不混用）
    const lrrCompareCard = libraryCompareCardHtml(lib, { withActions: true, lrrOpenHtml: lrrOpenHtml });
    const edCompareCard = editionCompareCardHtml(edition, otherEds, {
      withActions: true,
      cfg: config,
      libraryGids: (lib && lib.library_gids) || [],
    });

    // 仅 artist / group / parody 快捷追更（不堆 character/female 等标签）
    const trackHints = [];
    (edition.tags || []).forEach((t) => {
      const low = normalizeNamespaceTag(t);
      if (low.startsWith('artist:')) trackHints.push({ ns: 'artist', name: t.split(':').slice(1).join(':').trim() || low.slice(7) });
      if (low.startsWith('group:')) trackHints.push({ ns: 'group', name: t.split(':').slice(1).join(':').trim() || low.slice(6) });
      if (low.startsWith('parody:')) trackHints.push({ ns: 'parody', name: t.split(':').slice(1).join(':').trim() || low.slice(7) });
    });
    if (edition.group) trackHints.push({ ns: 'group', name: edition.group });
    const seenHint = new Set();
    const trackBtns = trackHints
      .filter((h) => {
        const k = h.ns + ':' + h.name.toLowerCase();
        if (seenHint.has(k)) return false;
        seenHint.add(k);
        return !!h.name;
      })
      .slice(0, 6)
      .map(
        (h) =>
          '<button type="button" class="jlc-wb-btn ghost" data-exc-g="track" data-ns="' +
          escapeHtml(h.ns) +
          '" data-name="' +
          escapeHtml(h.name) +
          '" title="加入追更">⭐ ' +
          escapeHtml(h.ns + ':' + h.name) +
          '</button>'
      )
      .join('');

    // 精简面板：badge + 对照卡（有才显示）+ 操作 + 可选追更
    panel.innerHTML =
      '<div class="exc-g-head">Creamu · ExH · 画廊</div>' +
      '<div class="exc-g-body">' +
      badgeHtml(lib, work, edition, {
        lrrComparisonVisible: !!lrrCompareCard,
        editionComparisonVisible: !!edCompareCard,
      }) +
      lrrCompareCard +
      edCompareCard +
      '<div class="jlc-wb-view-title" style="margin-top:10px">操作</div>' +
      '<div class="exc-card-actions">' +
      '<button type="button" class="jlc-wb-btn danger" data-exc-g="drop" title="屏蔽此单本（列表淡化/可隐藏）">' +
      (work && work.blocked ? '取消抛弃' : '抛弃') +
      '</button>' +
      '<button type="button" class="jlc-wb-btn primary" data-exc-g="best">最佳版</button>' +
      '<button type="button" class="jlc-wb-btn ghost" data-exc-g="source">检查来源</button>' +
      '<button type="button" class="jlc-wb-btn ghost" data-exc-g="bind">绑定 LRR</button>' +
      '<button type="button" class="jlc-wb-btn ghost" data-exc-g="merge">合并 Work</button>' +
      '<button type="button" class="jlc-wb-btn ghost" data-exc-g="lrrq">LRR 搜索</button>' +
      '<button type="button" class="jlc-wb-btn ghost" data-exc-g="sim">相似搜索</button>' +
      lrrLinks +
      '</div>' +
      (trackBtns
        ? '<div class="jlc-wb-view-title" style="margin-top:10px">快捷追更</div><div class="exc-card-actions">' +
          trackBtns +
          '</div>'
        : '') +
      '</div>';

    panel.onclick = async (ev) => {
      const btn = ev.target && ev.target.closest && ev.target.closest('[data-exc-g]');
      if (!btn) return;
      const act = btn.getAttribute('data-exc-g');
      try {
        if (act === 'track') {
          const ns = btn.getAttribute('data-ns') || '';
          const name = btn.getAttribute('data-name') || '';
          const f_search = ns ? ns + ':"' + name + '$"' : name;
          const open_url = buildSearchUrl(location.origin, f_search);
          const group_type =
            ns === 'artist' ? 'artist' : ns === 'group' ? 'group' : ns === 'parody' ? 'parody' : 'tag';
          const site = detectSite();
          await upsertTrackingFromContext({
            trackable: true,
            site,
            group_type,
            label: ns ? ns + ':' + name : name,
            namespace: ns,
            tag_name: name,
            f_search,
            open_url,
            page_url: open_url,
            query_signature: buildTrackingQuerySignature({
              site,
              group_type,
              namespace: ns,
              tag_name: name,
              f_search,
            }),
          });
          showToast('已加入追更：' + (ns ? ns + ':' + name : name));
          if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
          return;
        } else if (act === 'drop' || act === 'block' || act === 'dropped') {
          // 抛弃 = 屏蔽单本（与列表淡化/隐藏一致）
          const next = !(work && work.blocked);
          await setWorkBlocked(edition.work_id, next);
          try {
            await setWorkStatus(edition.work_id, next ? 'dropped' : 'none');
          } catch (_) { /* ignore */ }
        } else if (act === 'best') {
          await openBestEdition(edition.work_id);
          return;
        } else if (act === 'source') {
          btn.disabled = true;
          btn.textContent = '检查中…';
          const result = await checkEditionAvailabilityBatch([edition]);
          if (result.updatedCount > 0) {
            const checked = result.editions[0] || edition;
            showToast('来源状态：' + getEditionAvailabilityLabel(checked));
            await enhanceGalleryPage({ skipRelatedImport: true });
            if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
          } else if (result.errors && result.errors.length) {
            showToast('来源检查失败：' + result.errors[0].message);
            btn.disabled = false;
            btn.textContent = '重试来源';
          } else {
            showToast('来源未返回可判定状态');
            btn.disabled = false;
            btn.textContent = '重试来源';
          }
          return;
        } else if (act === 'bind') {
          await openBindModal(edition);
          return;
        } else if (act === 'samever') {
          const arcid = compactText(lib && lib.same_target_arcid);
          if (!arcid) {
            showToast('没有可确认的库内档案，请先对照绑定');
            await openBindModal(edition);
            return;
          }
          await markEditionArchiveSameVersion(edition, arcid);
          showToast('已视为同源');
          await enhanceGalleryPage();
          if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
          return;
        } else if (act === 'merge') {
          await openMergeModal(edition);
          return;
        } else if (act === 'lrrq') {
          const u = buildLrrSearchUrl(edition.title_core || edition.title_raw);
          if (!u) showToast('请先配置 LRR URL');
          else window.open(u, '_blank');
          return;
        } else if (act === 'sim') {
          location.href = buildSearchUrl(location.origin, '"' + (edition.title_core || edition.title_raw).slice(0, 80) + '"');
          return;
        }
        showToast('已更新');
        await enhanceGalleryPage();
        if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
      } catch (err) {
        showToast('失败: ' + ((err && err.message) || err));
      }
    };

    // 移除旧版标签堆叠条（character/female 等不应塞进画廊面板）
    document.getElementById('exc-tag-bar')?.remove();

    // 后台自动搜相关线上版本（同 work 5 分钟内最多一次）
    if (!opts.skipRelatedImport) {
      void autoImportRelatedOnlineEditions(edition, { siblings });
    }
    return edition;
  }

  function showDiagnosticBanner(issue) {
    if (document.getElementById('exc-diag')) return;
    const el = document.createElement('div');
    el.id = 'exc-diag';
    el.innerHTML =
      '<div class="exc-g-head">Creamu · ExH</div><div class="exc-g-body"><div style="color:#ccc">' +
      escapeHtml(issue.message) +
      '</div>' +
      '<div style="margin-top:12px"><button type="button" class="jlc-wb-btn primary" id="exc-diag-dismiss">知道了</button></div></div>';
    document.body.insertBefore(el, document.body.firstChild);
    document.getElementById('exc-diag-dismiss').onclick = () => el.remove();
  }

  async function enhanceImagePage() {
    const info = parseImagePageProgress();
    if (!info) return;
    try {
      markGallerySeen(info.gid);
    } catch (_) { /* ignore */ }
    // 只记阅读进度与已点，不再自动改「在读」状态
    const eds = await idbIndexGetAll(STORE_EDITIONS, 'gid', String(info.gid));
    const ed = (eds && eds[0]) || null;
    if (!ed || !ed.work_id) return;
    await setProgress(ed.work_id, info.page, ed.pages || 0);
  }

  async function refreshCurrentPageUi() {
    const kind = detectPageKind();
    if (kind === 'gallery') await enhanceGalleryPage();
    else if (kind === 'image') await enhanceImagePage();
    else {
      document.querySelectorAll('.exc-gl-item').forEach((el) => {
        el.dataset.excEnhanced = '';
      });
      await enhanceListPage();
    }
  }
