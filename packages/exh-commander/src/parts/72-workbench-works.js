
  async function renderWorksPage() {
    const root = document.getElementById('exc-wb-works-root');
    if (!root) return;
    const tab = ['blocked', 'better', 'lrr'].includes(wbSession.workTab) ? wbSession.workTab : 'lrr';
    root.innerHTML =
      '<div class="jlc-wb-toolbar">' +
      '  <div class="jlc-wb-toolbar-row" id="exc-work-chips"></div>' +
      '  <div class="jlc-wb-toolbar-row jlc-wb-toolbar-note">在库=同步后的 LRR 档案；有更好版/抛弃依赖已浏览作品。搜索收藏请用「追更」。</div>' +
      '</div>' +
      '<div class="jlc-wb-list-scroll" id="jlc-wb-works-scroll"></div>';

    const chips = [
      { id: 'lrr', label: 'LRR 在库' },
      { id: 'better', label: '有更好版' },
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
  }

  async function paintWorksList(tab) {
    const host = document.getElementById('jlc-wb-works-scroll');
    if (!host) return;
    const storageSnapshot = await loadLibraryStorageSnapshot();

    // LRR 在库：直接列档案（同步后即有），不依赖是否点过画廊
    if (tab === 'lrr') {
      await paintLrrLibraryList(host, storageSnapshot);
      return;
    }

    let works = [];
    if (tab === 'blocked') works = await listBlockedWorks(storageSnapshot);
    else if (tab === 'better') {
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
        '<div class="jlc-wb-empty">暂无条目。有更好版需先浏览过相关画廊；画廊页可「抛弃」屏蔽单本。</div>';
      return;
    }
    const chunks = [];
    for (const w of works.slice(0, 80)) {
      const eds = storageSnapshot.editionsByWork.get(w.work_id) || [];
      const best = pickBestEdition(eds, config);
      const title = w.title_raw || (best && best.title_raw) || w.work_id;
      const url = best ? best.url || buildGalleryUrl(location.origin, best.gid, best.token) : '';
      chunks.push(
        '<div class="jlc-wb-item" data-work="' +
          escapeHtml(w.work_id) +
          '">' +
          '<div class="jlc-wb-item-title">' +
          (url ? '<a href="' + escapeHtml(url) + '" class="jlc-wb-title-link">' + escapeHtml(title) + '</a>' : escapeHtml(title)) +
          '</div>' +
          '<div class="jlc-wb-item-actions">' +
          '<button type="button" class="jlc-wb-btn primary" data-wact="best">最佳版</button>' +
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
      if (btn.getAttribute('data-wact') === 'bind' && best) {
        best.work_id = workId;
        await openBindModal(best);
      }
    };
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
    // 当前画廊页：对应档案置顶 + 高亮
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
    const ranked = entries.slice().sort((x, y) => {
      const cx = isEntCurrent(x) ? 1 : 0;
      const cy = isEntCurrent(y) ? 1 : 0;
      if (cy !== cx) return cy - cx;
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
          ' 本（当前页相关置顶，其余按标题）。</div>'
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
      const onPage = isEntCurrent(ent);
      const metaBits = [];
      if (onPage) metaBits.push('当前页');
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
        '<div class="jlc-wb-item' +
          (onPage ? ' is-current is-lrr-page' : '') +
          '" data-arcid="' +
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
          (onPage ? '<span class="exc-ed-cur-tag">当前</span> ' : '') +
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
