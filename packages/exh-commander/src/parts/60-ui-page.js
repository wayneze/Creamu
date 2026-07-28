  function libraryCompareTip(lib) {
    const c = lib && lib.library_compare;
    if (!c) {
      if (lib && lib.maybe_in_library) return '标题近似库内档案，可点「绑定 LRR」确认（不是正式对照卡）';
      return '';
    }
    const lines = [];
    if (c.online_brief) lines.push('线上: ' + c.online_brief);
    if (c.library_brief) lines.push('库内: ' + c.library_brief);
    (c.diffs || []).forEach((d) => {
      let s = d.label + ': ' + d.library + ' → ' + d.online;
      if (d.better === 'online') s += '（线上更优）';
      else if (d.better === 'library') s += '（库内更优）';
      else if (d.packaging || d.key === 'pages' || d.key === 'size') s += '（打包差异）';
      lines.push(s);
    });
    if (c.packaging_note) lines.push(c.packaging_note);
    if (!(c.diffs && c.diffs.length)) {
      if (c.same && c.same.length) lines.push('一致: ' + c.same.join('、'));
      else lines.push('主要靠标题相似，请人工确认');
    }
    if (typeof c.title_sim === 'number' && c.title_sim > 0) {
      lines.push('标题相似 ' + Math.round(c.title_sim * 100) + '%');
    }
    return lines.join(' · ');
  }

  function maybeLibLabel(lib) {
    if (!lib || !lib.maybe_in_library) return '';
    return compactText(lib.maybe_label || '') || '可能在库';
  }

  /** 差异列表 HTML：sideA→sideB；better 取值 online/library 或 current/other */
  function compareDiffsListHtml(diffs, sideMap) {
    const map = sideMap || {
      leftBetter: 'online',
      rightBetter: 'library',
      leftTag: '线上',
      rightTag: '库内',
    };
    const quality = (diffs || []).filter((d) => d.key === 'language' || d.key === 'censor' || d.key === 'group');
    const packing = (diffs || []).filter((d) => d.packaging || d.key === 'pages' || d.key === 'size');
    const shown = quality.concat(packing.slice(0, 2));
    if (!shown.length) return '';
    let html =
      '<ul class="exc-compare-diffs">' +
      shown
        .map((d) => {
          const leftVal = d.current != null ? d.current : d.online;
          const rightVal = d.other != null ? d.other : d.library;
          // 展示方向：库内/对方 → 当前/线上（与旧 LRR 卡一致）
          const from = rightVal;
          const to = leftVal;
          const better = d.better || '';
          const tone =
            better === map.leftBetter || better === 'current' || better === 'online'
              ? ' is-online-better'
              : better === map.rightBetter || better === 'other' || better === 'library'
                ? ' is-lib-better'
                : '';
          const tag =
            better === map.leftBetter || better === 'current' || better === 'online'
              ? ' <em>' + escapeHtml(map.leftTag) + '</em>'
              : better === map.rightBetter || better === 'other' || better === 'library'
                ? ' <em>' + escapeHtml(map.rightTag) + '</em>'
                : d.packaging || d.key === 'pages' || d.key === 'size'
                  ? ' <em>打包</em>'
                  : '';
          return (
            '<li class="' +
            tone +
            '"><b>' +
            escapeHtml(d.label) +
            '</b> ' +
            escapeHtml(String(from)) +
            ' <span class="exc-compare-arrow">→</span> ' +
            escapeHtml(String(to)) +
            tag +
            '</li>'
          );
        })
        .join('') +
      '</ul>';
    if (packing.length > 2) {
      html += '<div class="exc-compare-note">另有 ' + (packing.length - 2) + ' 项打包差异</div>';
    }
    return html;
  }

  /** LRR 库内对照卡（可能在库不算正式卡） */
  function libraryCompareCardHtml(lib, opts) {
    opts = opts || {};
    if (!lib) return '';
    const inLib = !!(lib.work_in_library || lib.edition_in_library);
    if (!inLib) return '';

    const c = lib.library_compare || null;
    const confirmed = !!(lib.same_version_confirmed || (c && c.same_version));
    const diffs = (c && c.diffs) || [];
    const qualityDiffs = diffs.filter((d) => d.key === 'language' || d.key === 'censor' || d.key === 'group');
    const packingDiffs = diffs.filter((d) => d.packaging || d.key === 'pages' || d.key === 'size');
    const onlineBetter = !!(c && c.online_better) || qualityDiffs.some((d) => d.better === 'online');
    const libraryBetter =
      !onlineBetter &&
      (!!(c && c.library_better) || qualityDiffs.some((d) => d.better === 'library'));

    // 一眼结论（码未知→无码 等质量差优先于「差不多」）
    let verdict = 'same';
    let verdictText = '差不多';
    if (confirmed) {
      verdict = 'samever';
      verdictText = '已同源';
    } else if (onlineBetter || (c && c.online_better)) {
      verdict = 'online';
      verdictText = '线上更好';
    } else if (libraryBetter || (c && c.library_better)) {
      verdict = 'library';
      verdictText = '库内更好';
    } else if (packingDiffs.length && !qualityDiffs.length) {
      verdict = 'pack';
      verdictText = '打包差异';
    }

    const whereText = lib.edition_in_library ? '本版在库' : '库内有';
    const libBrief = (c && c.library_brief) || '—';
    const onBrief = (c && c.online_brief) || '—';

    // 质量差最多 2 条，紧凑
    let qualityHtml = '';
    if (qualityDiffs.length && !confirmed) {
      qualityHtml =
        '<ul class="exc-compare-diffs exc-compare-qdiffs">' +
        qualityDiffs
          .slice(0, 2)
          .map((d) => {
            const tone =
              d.better === 'online' ? ' is-online-better' : d.better === 'library' ? ' is-lib-better' : '';
            const tag =
              d.better === 'online' ? ' <em>线上</em>' : d.better === 'library' ? ' <em>库内</em>' : '';
            return (
              '<li class="' +
              tone +
              '"><b>' +
              escapeHtml(d.label) +
              '</b> ' +
              '<span class="exc-cmp-v is-lib">' +
              escapeHtml(String(d.library)) +
              '</span>' +
              ' <span class="exc-compare-arrow">→</span> ' +
              '<span class="exc-cmp-v is-on">' +
              escapeHtml(String(d.online)) +
              '</span>' +
              tag +
              '</li>'
            );
          })
          .join('') +
        '</ul>';
    }

    // 打包默认一行灰字，不占列表
    let packHtml = '';
    if (packingDiffs.length && !confirmed) {
      const bits = packingDiffs.slice(0, 3).map((d) => {
        return d.label + ' ' + d.library + '→' + d.online;
      });
      packHtml =
        '<div class="exc-compare-pack" title="' +
        escapeHtml((c && c.packaging_note) || '页数/体积多半是删广告或重打包') +
        '">打包 · ' +
        escapeHtml(bits.join(' · ')) +
        (packingDiffs.length > 3 ? ' · …' : '') +
        '</div>';
    } else if (confirmed) {
      packHtml = '<div class="exc-compare-pack is-quiet">已确认同源，打包差不再提示</div>';
    }

    const canSame = opts.withActions && !!lib.same_target_arcid && !confirmed;
    const actions = opts.withActions
      ? '<div class="exc-compare-actions">' +
        (opts.lrrOpenHtml || '') +
        (canSame
          ? '<button type="button" class="jlc-wb-btn primary" data-exc-g="samever" title="确认库内就是这个版本">视为同源</button>'
          : '') +
        '</div>'
      : '';

    const toneClass =
      verdict === 'samever' || (verdict === 'same' && !packingDiffs.length)
        ? ' is-same'
        : verdict === 'online'
          ? ' is-online-win'
          : verdict === 'library'
            ? ' is-lib-win'
            : verdict === 'pack'
              ? ' is-pack'
              : ' is-lib';

    return (
      '<div class="exc-compare-card is-lrr' +
      toneClass +
      '">' +
      '<div class="exc-compare-head">' +
      '<span class="exc-compare-title">LRR · ' +
      escapeHtml(whereText) +
      '</span>' +
      '<span class="exc-compare-chip is-verdict is-' +
      verdict +
      '">' +
      escapeHtml(verdictText) +
      '</span>' +
      '</div>' +
      '<div class="exc-compare-vs" aria-label="库内与线上对照">' +
      '<div class="exc-compare-col is-lib">' +
      '<div class="exc-compare-col-lab">库内</div>' +
      '<div class="exc-compare-col-val">' +
      escapeHtml(libBrief) +
      '</div>' +
      '</div>' +
      '<div class="exc-compare-vs-mid" aria-hidden="true">vs</div>' +
      '<div class="exc-compare-col is-on">' +
      '<div class="exc-compare-col-lab">线上</div>' +
      '<div class="exc-compare-col-val">' +
      escapeHtml(onBrief) +
      '</div>' +
      '</div>' +
      '</div>' +
      qualityHtml +
      packHtml +
      actions +
      '</div>'
    );
  }

  /** 线上多版本对照卡（otherEds 不含当前页；库源置顶高亮） */
  function editionCompareCardHtml(current, otherEds, opts) {
    opts = opts || {};
    if (!current) return '';
    const cfg = opts.cfg || config;
    const libGids = new Set((opts.libraryGids || []).map(String));
    const isLrrGid = (gid) => libGids.has(String(gid || ''));
    const currentIsLrr = isLrrGid(current.gid);

    // 无其它版本时：若当前是库源画廊，仍显示一条说明（不是「线上只有 LRR 文件」）
    if (!otherEds || !otherEds.length) {
      if (!currentIsLrr) return '';
      const url = current.url || buildGalleryUrl(location.origin, current.gid, current.token);
      return (
        '<div class="exc-compare-card is-editions is-same">' +
        '<div class="exc-compare-head"><span class="exc-compare-title">作品状态 · 线上版本</span>' +
        '<span class="exc-compare-chip">当前即库源</span></div>' +
        '<div class="exc-compare-note">打开画廊时会自动按标题搜索相关上传并并入列表。</div>' +
        '<div class="exc-edition-list">' +
        '<div class="exc-ed is-lrr-bound is-current">' +
        '<a href="' +
        escapeHtml(url) +
        '">' +
        '<span class="exc-ed-lrr-tag" title="LRR 档案绑定的 EH 源画廊，不是「文件在 LRR」">库源</span> ' +
        escapeHtml(formatEditionBrief(current)) +
        ' · 当前页' +
        '</a></div></div></div>'
      );
    }

    const sorted = otherEds.slice().sort((a, b) => {
      const aL = isLrrGid(a.gid) ? 1 : 0;
      const bL = isLrrGid(b.gid) ? 1 : 0;
      if (bL !== aL) return bL - aL;
      const ds = scoreEdition(b, cfg) - scoreEdition(a, cfg);
      if (Math.abs(ds) > 1) return ds;
      // 码未知时靠体积/时间区分
      const sz = (Number(b.size_bytes) || 0) - (Number(a.size_bytes) || 0);
      if (sz) return sz;
      return (Number(b.posted_at) || 0) - (Number(a.posted_at) || 0);
    });
    const all = [current].concat(otherEds);
    const bestAll = pickBestEdition(all, cfg);
    const currentIsBest = !!(bestAll && String(bestAll.gid) === String(current.gid));
    // 对照对象：优先 LRR 绑定版；否则偏好逻辑
    const lrrPeer = sorted.find((ed) => isLrrGid(ed.gid));
    const peer = lrrPeer
      ? lrrPeer
      : currentIsBest
        ? sorted[0]
        : bestAll && String(bestAll.gid) !== String(current.gid)
          ? bestAll
          : sorted[0];
    const cmp = peer ? diffEditionVsEdition(current, peer, cfg) : null;
    const total = otherEds.length + 1;
    const head = '作品状态 · 线上多版本 · 共 ' + total + ' 本';
    const label = currentIsLrr
      ? '当前即库源'
      : lrrPeer
        ? '含库源画廊'
        : currentIsBest
          ? '当前已是偏好'
          : cmp && cmp.other_better
            ? '有更优版本'
            : cmp && cmp.short_label
              ? cmp.short_label
              : '可切换版本';

    let body =
      '<div class="exc-compare-note">含自动标题搜索并入的相关上传。</div>';
    if (cmp && cmp.diffs && cmp.diffs.length) {
      body += compareDiffsListHtml(cmp.diffs, {
        leftBetter: 'current',
        rightBetter: 'other',
        leftTag: '当前',
        rightTag: '对方',
      });
    } else {
      body +=
        '<div class="exc-compare-note">' +
        (currentIsLrr
          ? '当前页是 LRR 绑定的 EH 源；下方为其它已见线上版本。'
          : currentIsBest
            ? '其它版本主要维度接近；下方可切换查看。'
            : '与偏好版接近；可用「最佳版」跳转。') +
        '</div>';
    }

    function edRowHtml(ed, flags) {
      flags = flags || {};
      const url = ed.url || buildGalleryUrl(location.origin, ed.gid, ed.token);
      const isPeer = peer && String(ed.gid) === String(peer.gid);
      const isLrr = isLrrGid(ed.gid);
      const sourceIssue = isEditionAvailabilityIssue(ed);
      const sc = scoreEdition(ed, cfg);
      const curSc = scoreEdition(current, cfg);
      const marks = [];
      if (flags.isCurrent) marks.push('当前页');
      if (isLrr) marks.push('库源');
      if (isPeer && !flags.isCurrent) marks.push('对照中');
      else if (!flags.isCurrent && sc > curSc) marks.push('更优');
      const bits = [];
      bits.push(shortLang(ed.language) !== '?' ? shortLang(ed.language) : ed.language || '?');
      if (ed.group) bits.push(String(ed.group).slice(0, 12));
      bits.push(shortCensor(ed.censor_tier || 'unknown'));
      // 码未知时体积/时间更重要，始终展示
      if (Number(ed.pages) > 0) bits.push(ed.pages + 'p');
      else bits.push('?p');
      if (Number(ed.size_bytes) > 0) bits.push(formatBytes(ed.size_bytes));
      else bits.push('?MB');
      const when =
        typeof formatTrackingPostedShort === 'function'
          ? formatTrackingPostedShort(ed.posted_at)
          : '';
      if (when) bits.push(when);
      else bits.push('?时');
      if (marks.length) bits.push(marks.join(' · '));
      const cls =
        'exc-ed' +
        (isPeer ? ' is-peer' : '') +
        (isLrr ? ' is-lrr-bound' : '') +
        (sourceIssue ? ' is-source-issue' : '') +
        (flags.isCurrent ? ' is-current' : '');
      return (
        '<div class="' +
        cls +
        '"><a href="' +
        escapeHtml(url) +
        '" title="' +
        escapeHtml(ed.title_raw || ed.title_core || '') +
        '">' +
        (flags.isCurrent
          ? '<span class="exc-ed-cur-tag" title="当前正在看的画廊">当前</span> '
          : '') +
        (isLrr
          ? '<span class="exc-ed-lrr-tag" title="LRR 档案绑定的 EH 源画廊">库源</span> '
          : '') +
        editionAvailabilityBadgeHtml(ed) +
        escapeHtml(bits.join(' · ')) +
        '</a></div>'
      );
    }

    // 列表顺序：①当前页（始终置顶+高亮）②其它库源 ③其余按偏好/体积/时间
    const listParts = [];
    listParts.push(edRowHtml(current, { isCurrent: true }));
    sorted.forEach((ed) => {
      if (String(ed.gid) === String(current.gid)) return;
      listParts.push(edRowHtml(ed, {}));
    });
    const listHtml = listParts.join('');

    const actions = opts.withActions
      ? '<div class="exc-compare-actions">' +
        (currentIsBest
          ? ''
          : '<button type="button" class="jlc-wb-btn primary" data-exc-g="best">打开最佳版</button>') +
        '</div>'
      : '';

    return (
      '<div class="exc-compare-card is-editions' +
      (currentIsBest ? ' is-same' : ' is-diff') +
      (currentIsLrr || lrrPeer ? ' has-lrr-bound' : '') +
      '">' +
      '<div class="exc-compare-head"><span class="exc-compare-title">' +
      escapeHtml(head) +
      '</span><span class="exc-compare-chip">' +
      escapeHtml(label) +
      '</span></div>' +
      body +
      (listHtml ? '<div class="exc-edition-list">' + listHtml + '</div>' : '') +
      actions +
      '</div>'
    );
  }

  function editionAvailabilityBadgeHtml(edition, options) {
    if (!edition) return '';
    const opts = options || {};
    const status = normalizeEditionAvailabilityStatus(
      edition.availability_status,
      edition.expunged
    );
    if (status === 'active' && !opts.showActive) return '';
    if (status === 'unknown' && !opts.showUnknown) return '';
    const details = [];
    if (edition.availability_reason) details.push(edition.availability_reason);
    if (edition.availability_error) details.push(edition.availability_error);
    const checkedAt = Number(edition.availability_checked_at) || 0;
    if (checkedAt) {
      try {
        details.push('检查于 ' + new Date(checkedAt).toLocaleString('zh-CN', { hour12: false }));
      } catch (_) { /* ignore */ }
    }
    const title = details.length ? ' title="' + escapeHtml(details.join(' · ')) + '"' : '';
    return (
      '<span class="jlc-status-pill exc-source-pill tone-' +
      getEditionAvailabilityTone(edition) +
      '" data-source-status="' +
      status +
      '"' +
      title +
      '>' +
      escapeHtml(opts.label || getEditionAvailabilityLabel(edition)) +
      '</span>' +
      (opts.trailingSpace === false ? '' : ' ')
    );
  }

  function badgeHtml(lib, work, edition, options) {
    const opts = options || {};
    const bits = [];
    if (lib) {
      // 库内主状态由对照卡承担，badge 只补额外态
      const cardCoversInLib = !!(lib.work_in_library || lib.edition_in_library);
      if (lib.same_version_confirmed && !opts.lrrComparisonVisible) {
        bits.push('<span class="jlc-status-pill tone-green" title="已手动确认与库内为同一版本">同源✓</span>');
      }
      if (!cardCoversInLib && !opts.lrrComparisonVisible) {
        if (lib.preferred_in_library) bits.push('<span class="jlc-status-pill tone-blue">偏好版在库</span>');
      } else if (
        lib.preferred_in_library &&
        !lib.edition_in_library &&
        !opts.lrrComparisonVisible
      ) {
        bits.push('<span class="jlc-status-pill tone-blue">偏好版在库</span>');
      }
      if (!cardCoversInLib && lib.maybe_in_library) {
        const label = maybeLibLabel(lib);
        const tip = libraryCompareTip(lib);
        const tone =
          lib.library_compare && lib.library_compare.online_better ? 'tone-orange' : 'tone-gray';
        bits.push(
          '<span class="jlc-status-pill ' +
            tone +
            '" title="' +
            escapeHtml(tip) +
            '">' +
            escapeHtml(label) +
            '</span>'
        );
      }
      if (
        lib.has_better_remote &&
        !lib.same_version_confirmed &&
        !opts.editionComparisonVisible
      ) {
        bits.push('<span class="jlc-status-pill tone-orange">⬆有更好版</span>');
      }
    }
    if (edition) {
      const availabilityBadge = editionAvailabilityBadgeHtml(edition, { trailingSpace: false });
      if (availabilityBadge) bits.push(availabilityBadge);
      try {
        if (typeof matchFamiliarRadar === 'function') {
          const fam = matchFamiliarRadar(edition.title_raw || edition.title || '', edition.tags || []);
          if (fam && fam.name) {
            bits.push(
              '<span class="jlc-status-pill tone-blue" title="熟人 · ' +
                escapeHtml(fam.kind + ':' + fam.name) +
                '">' +
                escapeHtml((fam.kind === 'group' ? '团队: ' : '画师: ') + String(fam.name).slice(0, 16)) +
                '</span>'
            );
          }
        }
        if (typeof matchFavTags === 'function') {
          const favs = matchFavTags(
            config.fav_tags || [],
            edition.tags || [],
            edition.title_raw || edition.title || ''
          );
          favs.slice(0, 3).forEach((ft) => {
            bits.push(
              '<span class="jlc-status-pill tone-orange" title="心动标签">' +
                escapeHtml('♥ ' + String(ft).slice(0, 14)) +
                '</span>'
            );
          });
        }
      } catch (_) { /* ignore */ }
    }
    if (work && work.blocked) bits.push('<span class="jlc-status-pill tone-red">已抛弃</span>');
    return bits.length ? '<div class="exc-badge-row">' + bits.join('') + '</div>' : '';
  }

  function ensureModal() {
    let mask = document.getElementById('exc-wb-dialog');
    if (mask) return mask;
    mask = document.createElement('div');
    mask.id = 'exc-wb-dialog';
    mask.innerHTML = '<div class="jlc-wb-dialog-card" id="exc-wb-dialog-card"></div>';
    mask.addEventListener('click', (e) => {
      if (e.target === mask) closeModal();
    });
    document.body.appendChild(mask);
    return mask;
  }

  function openModal(title, bodyHtml, actionsHtml) {
    const mask = ensureModal();
    const box = document.getElementById('exc-wb-dialog-card');
    box.innerHTML =
      '<h4>' +
      escapeHtml(title || 'Creamu · ExH') +
      '</h4>' +
      (bodyHtml || '') +
      (actionsHtml ? '<div class="jlc-wb-dialog-actions">' + actionsHtml + '</div>' : '');
    mask.classList.add('is-open');
    return box;
  }

  function closeModal() {
    const mask = document.getElementById('exc-wb-dialog');
    if (mask) mask.classList.remove('is-open');
  }

  async function openBindModal(edition) {
    const candidates = await findArchiveCandidates(edition, 20);
    const lib = await resolveLibraryState(edition);
    // 绑定弹窗仅挂 LRR 正式对照卡（库内命中），模糊候选靠列表行内 diff
    const compareBanner = libraryCompareCardHtml(lib, { withActions: false });
    let rows = '';
    if (!candidates.length) {
      rows = '<div class="exc-empty">无候选。请先同步 LRR，或用下方搜索打开 LRR。</div>';
    } else {
      const rowParts = [];
      for (const c of candidates) {
        let a = c.archive;
        if (typeof enrichArchiveForCompare === 'function') {
          try {
            a = await enrichArchiveForCompare(a);
          } catch (_) { /* ignore */ }
        }
        const cmp = diffEditionVsArchive(edition, a, config);
        const diffBits = (cmp.diffs || [])
          .slice(0, 3)
          .map((d) => d.label + ' ' + d.library + '→' + d.online)
          .join(' · ');
        const sameBits = !(cmp.diffs && cmp.diffs.length) && cmp.same && cmp.same.length
          ? '接近: ' + cmp.same.join('/')
          : '';
        rowParts.push(
          '<div class="exc-modal-row' +
            (c.linked ? ' is-linked' : '') +
            '" data-arcid="' +
            escapeHtml(a.arcid) +
            '">' +
            '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:600">' +
            escapeHtml(a.title) +
            (c.linked ? ' · 已绑定' : '') +
            '</div>' +
            '<div class="exc-modal-meta">' +
            escapeHtml(c.reason || 'match') +
            ' · ' +
            c.score.toFixed(2) +
            ' · ' +
            escapeHtml(formatEditionBrief(a)) +
            ' · ' +
            escapeHtml(a.arcid.slice(0, 10)) +
            '</div>' +
            (diffBits || sameBits
              ? '<div class="exc-modal-compare' +
                (cmp.online_better ? ' is-online-better' : cmp.library_better ? ' is-lib-better' : '') +
                '">' +
                escapeHtml(diffBits || sameBits) +
                '</div>'
              : '') +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:4px">' +
            (c.linked
              ? '<button type="button" class="jlc-wb-btn ghost" data-bact="unlink">解绑</button>'
              : '<button type="button" class="jlc-wb-btn primary" data-bact="bind">绑定</button>') +
            (c.same_version
              ? '<span class="jlc-status-pill tone-green" style="justify-content:center">同源✓</span>'
              : '<button type="button" class="jlc-wb-btn ghost" data-bact="samever" title="确认就是这个库内版本">视为同源</button>') +
            '<button type="button" class="jlc-wb-btn danger" data-bact="neg">不是</button>' +
            (buildLrrReaderUrl(a.arcid)
              ? '<a class="jlc-wb-btn ghost" target="_blank" rel="noreferrer" href="' +
                escapeHtml(buildLrrReaderUrl(a.arcid)) +
                '">打开</a>'
              : '') +
            '</div></div>'
        );
      }
      rows = rowParts.join('');
    }

    const box = openModal(
      '对照绑定 · LANraragi',
      '<div class="exc-g-kv" style="margin-bottom:10px">' +
        escapeHtml(edition.title_raw) +
        '</div>' +
        compareBanner +
        '<div class="exc-modal-list">' +
        rows +
        '</div>',
      '<button type="button" class="jlc-wb-btn ghost" data-bact="search">LRR 搜索标题</button>' +
        '<button type="button" class="jlc-wb-btn ghost" data-bact="manual">手动输入 arcid</button>' +
        '<button type="button" class="jlc-wb-btn primary" data-bact="close">关闭</button>'
    );

    box.onclick = async (ev) => {
      const t = ev.target;
      if (!t || !t.getAttribute) return;
      const act = t.getAttribute('data-bact');
      if (!act) return;
      if (act === 'close') {
        closeModal();
        return;
      }
      if (act === 'search') {
        const u = buildLrrSearchUrl(edition.title_core || edition.title_raw);
        if (!u) showToast('请先配置 LRR');
        else window.open(u, '_blank');
        return;
      }
      if (act === 'manual') {
        const arcid = compactText(prompt('输入 LRR arcid：'));
        if (!arcid) return;
        await bindArchiveToEdition(edition, arcid, 'manual');
        showToast('已绑定 ' + arcid);
        closeModal();
        await refreshCurrentPageUi();
        return;
      }
      const row = t.closest('[data-arcid]');
      const arcid = row && row.getAttribute('data-arcid');
      if (!arcid) return;
      if (act === 'bind') {
        await bindArchiveToEdition(edition, arcid, 'manual');
        showToast('已绑定');
      } else if (act === 'samever') {
        await markEditionArchiveSameVersion(edition, arcid);
        showToast('已视为同源');
      } else if (act === 'unlink') {
        await unlinkArchive(edition.id || makeEditionId(edition.gid, edition.token), edition.work_id, arcid);
        showToast('已解绑');
      } else if (act === 'neg') {
        await negateArchiveForEdition(edition, arcid);
        showToast('已标记不是同一本');
      }
      await openBindModal(edition);
      if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
    };
  }

  async function openMergeModal(edition) {
    const cands = await findMergeCandidates(edition);
    let rows = '';
    if (!cands.length) {
      rows = '<div class="exc-empty">暂无相似 Work 候选</div>';
    } else {
      rows = cands
        .map(
          (c) =>
            '<div class="exc-modal-row" data-wid="' +
            escapeHtml(c.work_id) +
            '">' +
            '<div style="flex:1">' +
            '<div style="font-weight:600">' +
            escapeHtml(c.title_raw || c.work_id) +
            '</div>' +
            '<div style="color:#999;font-size:11px">sim ' +
            c.sim.toFixed(2) +
            ' · ' +
            escapeHtml(c.work_id) +
            '</div></div>' +
            '<button type="button" class="jlc-wb-btn primary" data-mact="merge">合并到此</button></div>'
        )
        .join('');
    }
    const box = openModal(
      '合并 Work',
      '<p>当前: ' +
        escapeHtml(edition.work_id) +
        ' · ' +
        escapeHtml(edition.title_raw) +
        '</p>' +
        '<p>将当前 Work 的版本并入所选 Work，并删除当前 Work 记录。</p>' +
        rows,
      '<button type="button" class="jlc-wb-btn ghost" data-mact="split">拆出当前 Edition</button>' +
        '<button type="button" class="jlc-wb-btn primary" data-mact="close">关闭</button>'
    );
    box.onclick = async (ev) => {
      const t = ev.target;
      const act = t && t.getAttribute && t.getAttribute('data-mact');
      if (!act) return;
      if (act === 'close') return closeModal();
      if (act === 'split') {
        await splitEditionToNewWork(edition);
        showToast('已拆为新 Work');
        closeModal();
        await refreshCurrentPageUi();
        return;
      }
      if (act === 'merge') {
        const row = t.closest('[data-wid]');
        const target = row && row.getAttribute('data-wid');
        if (!target) return;
        if (!confirm('确认合并到 ' + target + '？')) return;
        await mergeWorks(target, edition.work_id);
        showToast('合并完成');
        closeModal();
        await refreshCurrentPageUi();
        if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
      }
    };
  }
