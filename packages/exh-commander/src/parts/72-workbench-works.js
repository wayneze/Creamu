
  async function renderWorksPage() {
    const root = document.getElementById('exc-wb-works-root');
    if (!root) return;
    const tab = ['blocked', 'better', 'availability', 'lrr'].includes(wbSession.workTab)
      ? wbSession.workTab
      : 'lrr';
    root.innerHTML =
      '<div class="jlc-wb-toolbar">' +
      '  <div class="jlc-wb-toolbar-row" id="exc-work-chips"></div>' +
      (tab === 'availability'
        ? '  <div class="jlc-wb-toolbar-row exc-source-check-row"><button type="button" class="jlc-wb-btn primary" id="exc-check-all-sources">检查全部来源</button><span class="jlc-wb-toolbar-note">接口失败不会把来源误标为不可访问。</span></div>'
        : '  <div class="jlc-wb-toolbar-row jlc-wb-toolbar-note">在库=同步后的 LRR 档案；有更好版/抛弃依赖已浏览作品。搜索收藏请用「追更」。</div>') +
      '</div>' +
      '<div id="exc-current-work" hidden></div>' +
      '<div class="jlc-wb-list-scroll" id="jlc-wb-works-scroll"></div>';

    const chips = [
      { id: 'lrr', label: 'LRR 在库' },
      { id: 'better', label: '有更好版' },
      { id: 'availability', label: '来源异常' },
      { id: 'blocked', label: '已抛弃' },
    ];
    const chipHost = document.getElementById('exc-work-chips');
    chipHost.innerHTML = chips
      .map(
        (c) =>
          '<button type="button" class="jlc-wb-chip' +
          (c.id === tab ? ' is-on' : '') +
          '" data-wtab="' +
          c.id +
          '">' +
          c.label +
          '</button>'
      )
      .join('');
    chipHost.onclick = (e) => {
      const b = e.target.closest('[data-wtab]');
      if (!b) return;
      wbSession.workTab = b.getAttribute('data-wtab');
      saveSession(wbSession);
      renderWorksPage();
    };
    await paintWorksList(tab);
    const checkAllButton = document.getElementById('exc-check-all-sources');
    if (checkAllButton) {
      checkAllButton.onclick = async () => {
        const snapshot = await loadLibraryStorageSnapshot();
        await runWorkbenchAvailabilityCheck(snapshot.editions || [], checkAllButton);
      };
    }
  }

  async function runWorkbenchAvailabilityCheck(editions, button) {
    const candidates = Array.from(editions || []).filter(
      (edition) => edition && compactText(edition.gid || '') && compactText(edition.token || '')
    );
    if (!candidates.length) {
      showToast('没有可检查的来源');
      return null;
    }
    const originalText = button ? button.textContent : '';
    if (button) {
      button.disabled = true;
      button.textContent = '检查中 0/' + candidates.length;
    }
    try {
      const result = await checkEditionAvailabilityBatch(candidates, {
        onProgress(progress) {
          if (!button || !button.isConnected) return;
          const completedBatches =
            Number(progress.successfulBatches || 0) + Number(progress.failedBatches || 0);
          button.textContent =
            '检查中 ' + Math.min(candidates.length, completedBatches * 25) + '/' + candidates.length;
        },
      });
      const failed = Number(result.failedBatches) || 0;
      showToast(
        '已更新 ' +
          result.updatedCount +
          ' 个来源' +
          (failed ? '，' + failed + ' 批检查失败' : '')
      );
      await renderWorksPage();
      let currentGallery = null;
      try {
        currentGallery = parseGalleryUrl(location.href);
      } catch (_) { /* ignore */ }
      if (
        currentGallery &&
        candidates.some((edition) => String(edition.gid) === String(currentGallery.gid)) &&
        typeof enhanceGalleryPage === 'function'
      ) {
        await enhanceGalleryPage({ skipRelatedImport: true });
      }
      return result;
    } catch (error) {
      showToast('来源检查失败：' + ((error && error.message) || error));
      if (button && button.isConnected) {
        button.disabled = false;
        button.textContent = originalText || '重试来源';
      }
      return null;
    }
  }

  async function paintWorksList(tab) {
    const host = document.getElementById('jlc-wb-works-scroll');
    if (!host) return;
    const storageSnapshot = await loadLibraryStorageSnapshot();
    const checkAllButton = document.getElementById('exc-check-all-sources');
    if (checkAllButton) {
      const checkableCount = (storageSnapshot.editions || []).filter(
        (edition) => edition && edition.gid && edition.token
      ).length;
      checkAllButton.textContent = '检查全部来源 (' + checkableCount + ')';
      checkAllButton.disabled = checkableCount === 0;
    }
    await renderCurrentGalleryWork(
      document.getElementById('exc-current-work'),
      storageSnapshot
    );

    // LRR 在库：直接列档案（同步后即有），不依赖是否点过画廊
    if (tab === 'lrr') {
      await paintLrrLibraryList(host, storageSnapshot);
      return;
    }

    let works = [];
    if (tab === 'blocked') works = await listBlockedWorks(storageSnapshot);
    else if (tab === 'availability') {
      const all = await listAllWorks(storageSnapshot);
      works = all.filter((work) => {
        const editions = storageSnapshot.editionsByWork.get(work.work_id) || [];
        return editions.some((edition) => isEditionAvailabilityIssue(edition));
      });
    } else if (tab === 'better') {
      const all = await listAllWorks(storageSnapshot);
      for (const w of all) {
        const eds = storageSnapshot.editionsByWork.get(w.work_id) || [];
        if (!eds.length) continue;
        const lib = await resolveLibraryState(
          Object.assign({}, eds[0], { work_id: w.work_id }),
          storageSnapshot
        );
        if (lib.has_better_remote) works.push(Object.assign({}, w, { _lib: lib }));
      }
    }

    setFooterSummary((works.length ? works.length + ' 本' : '无') + ' · 作品');
    if (!works.length) {
      host.innerHTML =
        '<div class="jlc-wb-empty">' +
        (tab === 'availability'
          ? '暂无已知异常来源。可用上方按钮重新检查所有已浏览版本。'
          : '暂无条目。有更好版需先浏览过相关画廊；画廊页可「抛弃」屏蔽单本。') +
        '</div>';
      return;
    }
    const chunks = [];
    for (const w of works.slice(0, 80)) {
      const eds = storageSnapshot.editionsByWork.get(w.work_id) || [];
      const best = pickBestEdition(eds, config);
      const title = w.title_raw || (best && best.title_raw) || w.work_id;
      const url = best ? best.url || buildGalleryUrl(location.origin, best.gid, best.token) : '';
      const sourceIssues = eds.filter((edition) => isEditionAvailabilityIssue(edition));
      const sourceHtml =
        tab === 'availability'
          ? '<div class="exc-source-editions">' +
            sourceIssues
              .slice(0, 6)
              .map((edition) => {
                const editionUrl =
                  edition.url || buildGalleryUrl(location.origin, edition.gid, edition.token);
                const reason = [edition.availability_error, edition.availability_reason]
                  .map((value) => compactText(value || ''))
                  .filter(Boolean)
                  .join(' · ');
                return (
                  '<div class="exc-source-edition">' +
                  editionAvailabilityBadgeHtml(edition) +
                  '<a href="' +
                  escapeHtml(editionUrl) +
                  '" target="_blank" rel="noopener">gid ' +
                  escapeHtml(edition.gid) +
                  '</a>' +
                  (reason ? '<span>' + escapeHtml(reason) + '</span>' : '') +
                  '</div>'
                );
              })
              .join('') +
            (sourceIssues.length > 6
              ? '<div class="jlc-wb-toolbar-note">另有 ' +
                (sourceIssues.length - 6) +
                ' 个异常版本</div>'
              : '') +
            '</div>'
          : '';
      chunks.push(
        '<div class="jlc-wb-item" data-work="' +
          escapeHtml(w.work_id) +
          '">' +
          '<div class="jlc-wb-item-title">' +
          (url ? '<a href="' + escapeHtml(url) + '" class="jlc-wb-title-link">' + escapeHtml(title) + '</a>' : escapeHtml(title)) +
          '</div>' +
          sourceHtml +
          '<div class="jlc-wb-item-actions">' +
          (tab === 'availability'
            ? '<button type="button" class="jlc-wb-btn primary" data-wact="source">复查来源</button>'
            : '') +
          '<button type="button" class="jlc-wb-btn ' +
          (tab === 'availability' ? 'ghost' : 'primary') +
          '" data-wact="best">最佳版</button>' +
          '<button type="button" class="jlc-wb-btn ghost" data-wact="bind">LRR</button>' +
          '</div></div>'
      );
    }
    host.innerHTML = chunks.join('');
    host.onclick = async (e) => {
      const btn = e.target.closest('[data-wact]');
      if (!btn) return;
      const workId = btn.closest('[data-work]')?.getAttribute('data-work');
      if (!workId) return;
      const eds = await listEditionsByWork(workId);
      const best = pickBestEdition(eds, config) || eds[0];
      if (btn.getAttribute('data-wact') === 'best') await openBestEdition(workId);
      if (btn.getAttribute('data-wact') === 'source') {
        await runWorkbenchAvailabilityCheck(eds, btn);
        return;
      }
      if (btn.getAttribute('data-wact') === 'bind' && best) {
        best.work_id = workId;
        await openBindModal(best);
      }
    };
  }

  async function renderCurrentGalleryWork(host, storageSnapshot) {
    if (!host) return null;
    let galleryTarget = null;
    try {
      galleryTarget = parseGalleryUrl(location.href);
    } catch (_) { /* ignore */ }
    if (!galleryTarget || !galleryTarget.gid) {
      host.hidden = true;
      host.innerHTML = '';
      return null;
    }

    const snapshot = indexListStorageSnapshot(storageSnapshot || {});
    let edition = snapshot.editionsByGid.get(String(galleryTarget.gid)) || null;
    if (!edition && typeof parseGalleryPage === 'function') {
      try {
        edition = parseGalleryPage();
      } catch (_) { /* ignore */ }
    }
    if (!edition) {
      host.hidden = true;
      host.innerHTML = '';
      return null;
    }

    const work = edition.work_id ? snapshot.worksById.get(edition.work_id) || null : null;
    let lib = null;
    try {
      lib = await resolveLibraryState(edition, snapshot);
    } catch (_) { /* ignore */ }
    const title = compactText(
      (work && work.title_raw) || edition.title_raw || edition.title_core || '当前作品'
    );
    const statusBits = [];
    if (work && work.blocked) statusBits.push('已抛弃');
    if (isEditionAvailabilityIssue(edition)) {
      statusBits.push(getEditionAvailabilityLabel(edition));
    }
    if (lib) {
      if (lib.same_version_confirmed) statusBits.push('已确认同源');
      else if (lib.edition_in_library) statusBits.push('本版在库');
      else if (lib.work_in_library) statusBits.push('库内有版本');
      else if (lib.maybe_in_library) statusBits.push(maybeLibLabel(lib));
      else statusBits.push('未在库');
      if (lib.has_better_remote) statusBits.push('有更好版');
    }
    if (!statusBits.length) statusBits.push('未设置作品状态');

    const cover = compactText(edition.thumb || '');
    const mono = title.charAt(0) || '本';
    const topArchive =
      lib &&
      ((lib.exact_archives && lib.exact_archives[0]) ||
        (lib.work_archives && lib.work_archives[0]));
    const lrrUrl = topArchive ? buildLrrReaderUrl(topArchive.arcid) : '';
    host.hidden = false;
    host.innerHTML =
      '<div class="exc-current-work-label">当前详情作品</div>' +
      '<div class="jlc-wb-item is-current"' +
      (edition.work_id ? ' data-work="' + escapeHtml(edition.work_id) + '"' : '') +
      '>' +
      '<div class="jlc-wb-item-row">' +
      '<div class="jlc-wb-cover is-poster" data-group="tag">' +
      (cover
        ? '<img src="' + escapeHtml(cover) + '" alt="" loading="lazy">'
        : '<span class="jlc-wb-cover-fallback">' + escapeHtml(mono) + '</span>') +
      '</div>' +
      '<div class="jlc-wb-item-body">' +
      '<div class="jlc-wb-item-title"><span class="exc-ed-cur-tag">当前</span> ' +
      escapeHtml(title) +
      '</div>' +
      '<div class="jlc-wb-item-meta"><div class="jlc-wb-item-meta-line">' +
      escapeHtml(statusBits.join(' · ')) +
      '</div></div>' +
      '<div class="jlc-wb-item-actions">' +
      '<button type="button" class="jlc-wb-btn primary" data-current-wact="best">最佳版</button>' +
      '<button type="button" class="jlc-wb-btn ghost" data-current-wact="source">检查来源</button>' +
      '<button type="button" class="jlc-wb-btn ghost" data-current-wact="bind">绑定 LRR</button>' +
      (lrrUrl
        ? '<a class="jlc-wb-btn ghost" href="' +
          escapeHtml(lrrUrl) +
          '" target="_blank" rel="noopener">开 LRR</a>'
        : '') +
      '</div></div></div></div>';

    host.onclick = async (event) => {
      const button = event.target.closest('[data-current-wact]');
      if (!button) return;
      const action = button.getAttribute('data-current-wact');
      if (action === 'best' && edition.work_id) await openBestEdition(edition.work_id);
      else if (action === 'source') {
        await runWorkbenchAvailabilityCheck([edition], button);
      }
      else if (action === 'bind') await openBindModal(edition);
    };
    return { edition, work, lib };
  }

  async function paintLrrLibraryList(host, storageSnapshot) {
    const entries = typeof listLibraryArchiveEntries === 'function'
      ? await listLibraryArchiveEntries(storageSnapshot)
      : [];
    const total = entries.length;
    setFooterSummary((total ? total + ' 本' : '无') + ' · LRR 档案');
    if (!total) {
      const st = typeof getLrrStatus === 'function' ? getLrrStatus() : {};
      host.innerHTML =
        '<div class="jlc-wb-empty">' +
        (st.configured
          ? st.last_error
            ? 'LRR 上次同步失败：' + escapeHtml(st.last_error) + '。请到「设置 → 同步」重试。'
            : st.last_sync
              ? '本地无档案。可到「设置 → 同步」重新同步 LRR。'
              : '尚未同步 LRR。请到「设置 → 同步」拉取在库列表。'
          : '未配置 LRR。请到「设置 → 同步」填写 Base URL / API Key 后同步。') +
        '</div>';
      return;
    }

    const limit = 200;
    // 当前画廊由上方固定摘要承载；列表里省略同一档案，避免重复。
    let pageGid = '';
    try {
      if (typeof parseGalleryUrl === 'function') {
        const gt = parseGalleryUrl(location.href);
        if (gt && gt.gid) pageGid = String(gt.gid);
      }
    } catch (_) { /* ignore */ }
    const isEntCurrent = (ent) => {
      if (!pageGid || !ent) return false;
      const a = ent.archive || {};
      if (a.eh_gid && String(a.eh_gid) === pageGid) return true;
      if (ent.edition && String(ent.edition.gid) === pageGid) return true;
      if (ent.source && String(ent.source.gid) === pageGid) return true;
      if (ent.link && ent.link.edition_id && String(ent.link.edition_id).indexOf('e_' + pageGid + '_') === 0) {
        return true;
      }
      return false;
    };
    const ranked = entries.filter((entry) => !isEntCurrent(entry)).sort((x, y) => {
      const tx = String((x.archive && x.archive.title) || '').toLowerCase();
      const ty = String((y.archive && y.archive.title) || '').toLowerCase();
      return tx < ty ? -1 : tx > ty ? 1 : 0;
    });
    const shown = ranked.slice(0, limit);
    const chunks = [];
    if (total > limit) {
      chunks.push(
        '<div class="legacy-note jlc-wb-intro-note">共 ' +
          total +
          ' 本，先显示前 ' +
          limit +
          ' 本（当前作品固定在上方，档案按标题排列）。</div>'
      );
    }
    for (const ent of shown) {
      const a = ent.archive;
      const title =
        (ent.work && ent.work.title_raw) ||
        (ent.edition && ent.edition.title_raw) ||
        a.title ||
        a.arcid;
      const lrrUrl = typeof buildLrrReaderUrl === 'function' ? buildLrrReaderUrl(a.arcid) : '';
      let galleryUrl = '';
      if (ent.edition && ent.edition.gid && ent.edition.token) {
        galleryUrl = ent.edition.url || buildGalleryUrl(location.origin, ent.edition.gid, ent.edition.token);
      } else if (ent.source && ent.source.gid && ent.source.token) {
        galleryUrl = buildGalleryUrl(location.origin, ent.source.gid, ent.source.token);
      }
      const metaBits = [];
      if (a.pages) metaBits.push(a.pages + 'p');
      if (a.eh_gid) metaBits.push('gid ' + a.eh_gid);
      if (ent.link) metaBits.push(ent.link.same_version ? '已确认同源' : '已绑定');
      else if (ent.edition) metaBits.push('ehgid 命中');
      else metaBits.push('仅档案');

      const mono = compactText(title).charAt(0) || '本';
      const actions =
        (lrrUrl
          ? '<a class="jlc-wb-btn primary" href="' +
            escapeHtml(lrrUrl) +
            '" target="_blank" rel="noopener">开 LRR</a>'
          : '') +
        (galleryUrl
          ? '<a class="jlc-wb-btn ghost" href="' +
            escapeHtml(galleryUrl) +
            '" target="_blank" rel="noopener">画廊</a>'
          : '') +
        (ent.work && ent.work.work_id
          ? '<button type="button" class="jlc-wb-btn ghost" data-wact="best">最佳版</button>'
          : '');

      chunks.push(
        '<div class="jlc-wb-item" data-arcid="' +
          escapeHtml(a.arcid) +
          '"' +
          (ent.work && ent.work.work_id ? ' data-work="' + escapeHtml(ent.work.work_id) + '"' : '') +
          '>' +
          '<div class="jlc-wb-item-row">' +
          '<div class="jlc-wb-cover is-poster" data-lrr-cover="' +
          escapeHtml(a.arcid) +
          '" data-group="tag">' +
          '<span class="jlc-wb-cover-fallback">' +
          escapeHtml(mono) +
          '</span></div>' +
          '<div class="jlc-wb-item-body">' +
          '<div class="jlc-wb-item-title">' +
          escapeHtml(title) +
          '</div>' +
          (metaBits.length
            ? '<div class="jlc-wb-item-meta"><div class="jlc-wb-item-meta-line">' +
              escapeHtml(metaBits.join(' · ')) +
              '</div></div>'
            : '') +
          (actions ? '<div class="jlc-wb-item-actions">' + actions + '</div>' : '') +
          '</div></div></div>'
      );
    }
    host.innerHTML = chunks.join('');
    if (typeof hydrateLrrThumbnailsIn === 'function') {
      try {
        hydrateLrrThumbnailsIn(host);
      } catch (_) { /* ignore */ }
    }
    host.onclick = async (e) => {
      const btn = e.target.closest('[data-wact]');
      if (!btn) return;
      const workId = btn.closest('[data-work]')?.getAttribute('data-work');
      if (!workId) return;
      if (btn.getAttribute('data-wact') === 'best') await openBestEdition(workId);
    };
  }
