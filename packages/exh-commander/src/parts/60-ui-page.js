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
    if (cmp && (cmp.current_brief || cmp.other_brief)) {
      body +=
        '<div class="exc-compare-pair">' +
        '<div class="exc-compare-side"><span class="exc-compare-k">当前</span> ' +
        escapeHtml(cmp.current_brief || '—') +
        (currentIsLrr ? ' · 库源' : '') +
        '</div>' +
        '<div class="exc-compare-side"><span class="exc-compare-k">对方</span> ' +
        escapeHtml(cmp.other_brief || '—') +
        (peer && peer.gid ? ' · g' + escapeHtml(String(peer.gid)) : '') +
        (peer && isLrrGid(peer.gid) ? ' · 库源' : '') +
        '</div>' +
        '</div>';
    }
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

  function badgeHtml(lib, work, edition) {
    const bits = [];
    if (lib) {
      // 库内主状态由对照卡承担，badge 只补额外态
      const cardCoversInLib = !!(lib.work_in_library || lib.edition_in_library);
      if (lib.same_version_confirmed) {
        bits.push('<span class="jlc-status-pill tone-green" title="已手动确认与库内为同一版本">同源✓</span>');
      }
      if (!cardCoversInLib) {
        if (lib.preferred_in_library) bits.push('<span class="jlc-status-pill tone-blue">偏好版在库</span>');
      } else if (lib.preferred_in_library && !lib.edition_in_library) {
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
      if (lib.has_better_remote && !lib.same_version_confirmed) {
        bits.push('<span class="jlc-status-pill tone-orange">⬆有更好版</span>');
      }
    }
    if (edition) {
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

  // —— 列表悬停预览 ——
  const hoverPreviewCache = new Map();
  const hoverPreviewInflight = new Map();
  let hoverPreviewActive = 0;
  let hoverPreviewHideTimer = null;
  let hoverPreviewGen = 0;
  let hoverPreviewScrollBound = false;

  function ensureHoverPreviewPanel() {
    let panel = document.getElementById('exc-hover-preview');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'exc-hover-preview';
    panel.innerHTML =
      '<div class="exc-hp-head"><span class="exc-hp-title">预览</span><a class="exc-hp-open" href="#" target="_blank" rel="noreferrer">打开画廊</a></div>' +
      '<div class="exc-hp-status"></div>' +
      '<div class="exc-hp-grid"></div>';
    panel.addEventListener('mouseenter', () => {
      if (hoverPreviewHideTimer) {
        clearTimeout(hoverPreviewHideTimer);
        hoverPreviewHideTimer = null;
      }
    });
    panel.addEventListener('mouseleave', () => {
      scheduleHideHoverPreview(80);
    });
    document.body.appendChild(panel);
    if (!hoverPreviewScrollBound) {
      hoverPreviewScrollBound = true;
      window.addEventListener(
        'scroll',
        () => {
          hideHoverPreview();
        },
        { passive: true, capture: true }
      );
    }
    return panel;
  }

  function hideHoverPreview() {
    if (hoverPreviewHideTimer) {
      clearTimeout(hoverPreviewHideTimer);
      hoverPreviewHideTimer = null;
    }
    const panel = document.getElementById('exc-hover-preview');
    if (panel) {
      panel.classList.remove('is-open', 'is-loading', 'is-empty', 'is-error');
      panel.style.display = 'none';
    }
  }

  function scheduleHideHoverPreview(ms) {
    if (hoverPreviewHideTimer) clearTimeout(hoverPreviewHideTimer);
    hoverPreviewHideTimer = setTimeout(() => {
      hoverPreviewHideTimer = null;
      hideHoverPreview();
    }, ms == null ? 120 : ms);
  }

  function positionHoverPreview(panel, anchor) {
    if (!panel || !anchor) return;
    panel.style.display = 'block';
    const r = anchor.getBoundingClientRect();
    const pw = panel.offsetWidth || 360;
    const ph = panel.offsetHeight || 180;
    let left = r.right + 10;
    let top = r.top;
    if (left + pw > window.innerWidth - 8) left = Math.max(8, r.left - pw - 10);
    if (left < 8) left = 8;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, window.innerHeight - ph - 8);
    if (top < 8) top = 8;
    panel.style.left = Math.round(left) + 'px';
    panel.style.top = Math.round(top) + 'px';
  }

  function renderHoverPreviewThumbs(panel, thumbs, galleryUrl) {
    const grid = panel.querySelector('.exc-hp-grid');
    const status = panel.querySelector('.exc-hp-status');
    const open = panel.querySelector('.exc-hp-open');
    if (open && galleryUrl) {
      open.href = galleryUrl;
      open.style.display = '';
    } else if (open) {
      open.style.display = 'none';
    }
    if (!grid) return;
    if (!thumbs || !thumbs.length) {
      panel.classList.add('is-empty');
      panel.classList.remove('is-loading', 'is-error');
      if (status) status.textContent = '没有可预览的缩略图';
      grid.innerHTML = '';
      return;
    }
    panel.classList.remove('is-empty', 'is-loading', 'is-error');
    if (status) status.textContent = '内容预览 · ' + thumbs.length + ' 张（已跳过封面页）';
    grid.innerHTML = thumbs
      .map((t) => {
        const href = t.href || galleryUrl || '#';
        if (t.type === 'bg' && t.style) {
          const wh =
            (t.w ? 'width:' + t.w + 'px;' : '') + (t.h ? 'height:' + t.h + 'px;' : 'min-height:100px;');
          return (
            '<a class="exc-hp-cell" href="' +
            escapeHtml(href) +
            '" target="_blank" rel="noreferrer">' +
            '<span class="exc-hp-bg" style="' +
            escapeHtml(t.style) +
            ';' +
            wh +
            '"></span></a>'
          );
        }
        return (
          '<a class="exc-hp-cell" href="' +
          escapeHtml(href) +
          '" target="_blank" rel="noreferrer">' +
          '<img src="' +
          escapeHtml(t.src || '') +
          '" alt="" loading="lazy"></a>'
        );
      })
      .join('');
  }

  async function fetchGalleryPreviewThumbs(gid, token, count, coverUrl) {
    const key = String(gid) + '|v2|' + String(count);
    const cached = hoverPreviewCache.get(key);
    if (cached && Array.isArray(cached.thumbs)) {
      if (cached.thumbs.length >= count || cached.partial === false) return cached;
    }
    if (hoverPreviewInflight.has(key)) return hoverPreviewInflight.get(key);

    const run = (async () => {
      while (hoverPreviewActive >= 2) {
        await new Promise((r) => setTimeout(r, 40));
      }
      hoverPreviewActive++;
      try {
        const url = buildGalleryUrl(location.origin, gid, token);
        const res = await gmRequest({
          method: 'GET',
          url: url,
          timeout: 15000,
          headers: {
            Accept: 'text/html,application/xhtml+xml',
            'Cache-Control': 'no-cache',
          },
        });
        const status = res && res.status;
        if (status < 200 || status >= 400) {
          throw new Error('HTTP ' + status);
        }
        const text = (res && res.responseText) || '';
        if (/Sad Panda|Your IP address has been temporarily banned|Please wait/i.test(text) && !/id="gdt"/i.test(text)) {
          throw new Error('页面不可用或限流');
        }
        // 跳过与封面重复的前 1～2 张，多取再筛
        const thumbs = parseGalleryThumbsFromHtml(text, count, {
          skipCoverDupes: true,
          coverUrl: coverUrl || '',
        });
        const entry = { thumbs: thumbs, partial: thumbs.length < count, ts: nowMs() };
        hoverPreviewCache.set(key, entry);
        if (hoverPreviewCache.size > 100) {
          const oldest = hoverPreviewCache.keys().next().value;
          if (oldest != null) hoverPreviewCache.delete(oldest);
        }
        return entry;
      } finally {
        hoverPreviewActive = Math.max(0, hoverPreviewActive - 1);
        hoverPreviewInflight.delete(key);
      }
    })();

    hoverPreviewInflight.set(key, run);
    return run;
  }

  async function showHoverPreview(anchorEl, partial) {
    if (!config.list_hover_preview) return;
    if (!partial || !partial.gid || !partial.token) return;
    const panel = ensureHoverPreviewPanel();
    const gen = ++hoverPreviewGen;
    const count = clampHoverPreviewCount(config.list_hover_preview_count);
    const galleryUrl = buildGalleryUrl(location.origin, partial.gid, partial.token);
    // 列表封面：用于去掉预览里重复的首页
    let coverUrl = partial.thumb || '';
    if (!coverUrl && anchorEl) {
      const img = anchorEl.querySelector('img');
      if (img) coverUrl = img.getAttribute('data-src') || img.src || '';
    }

    panel.classList.add('is-open', 'is-loading');
    panel.classList.remove('is-empty', 'is-error');
    panel.style.display = 'block';
    const status = panel.querySelector('.exc-hp-status');
    const title = panel.querySelector('.exc-hp-title');
    if (title) title.textContent = '预览';
    if (status) status.textContent = '加载中…';
    const grid = panel.querySelector('.exc-hp-grid');
    if (grid) grid.innerHTML = '';
    const open = panel.querySelector('.exc-hp-open');
    if (open) {
      open.href = galleryUrl;
      open.style.display = '';
    }
    positionHoverPreview(panel, anchorEl);

    try {
      const entry = await fetchGalleryPreviewThumbs(partial.gid, partial.token, count, coverUrl);
      if (gen !== hoverPreviewGen) return;
      renderHoverPreviewThumbs(panel, entry.thumbs, galleryUrl);
      positionHoverPreview(panel, anchorEl);
    } catch (err) {
      if (gen !== hoverPreviewGen) return;
      panel.classList.remove('is-loading');
      panel.classList.add('is-error', 'is-empty');
      if (status) status.textContent = '预览失败: ' + ((err && err.message) || err);
      if (grid) grid.innerHTML = '';
      positionHoverPreview(panel, anchorEl);
    }
  }

  function bindListHoverPreview(el, partial) {
    if (!el || !partial || !partial.gid) return;
    if (el.dataset.excHoverBound === '1') return;
    el.dataset.excHoverBound = '1';

    let enterTimer = null;
    let localGen = 0;

    const clearEnter = () => {
      if (enterTimer) {
        clearTimeout(enterTimer);
        enterTimer = null;
      }
    };

    el.addEventListener('mouseenter', () => {
      if (config.list_hover_preview === false) return;
      clearEnter();
      const my = ++localGen;
      const delay = clampHoverPreviewDelay(config.list_hover_preview_delay_ms);
      enterTimer = setTimeout(() => {
        enterTimer = null;
        if (my !== localGen) return;
        if (hoverPreviewHideTimer) {
          clearTimeout(hoverPreviewHideTimer);
          hoverPreviewHideTimer = null;
        }
        showHoverPreview(el, partial).catch(() => {});
      }, delay);
    });

    el.addEventListener('mouseleave', (ev) => {
      clearEnter();
      localGen++;
      const to = ev.relatedTarget;
      if (to && to.closest && to.closest('#exc-hover-preview')) return;
      scheduleHideHoverPreview(140);
    });
  }

  async function enhanceListItem(el, ctx) {
    if (!el || el.dataset.excEnhanced === '1') return null;
    const partial = parseListCard(el);
    if (!partial || !partial.gid) return null;
    el.dataset.excEnhanced = '1';
    el.classList.add('exc-gl-item');
    el.dataset.excGid = partial.gid;
    el.dataset.excToken = partial.token;
    // 悬停预览尽早绑定（不等 DB）
    bindListHoverPreview(el, partial);

    // 列表打开方式：设置里「新标签页打开」
    try {
      if (config.list_open_in_new_tab) {
        el.querySelectorAll('a[href*="/g/"]').forEach((a) => {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        });
      } else {
        el.querySelectorAll('a[href*="/g/"]').forEach((a) => {
          if (a.getAttribute('target') === '_blank' && a.dataset.excTabForced === '1') {
            a.removeAttribute('target');
            a.removeAttribute('rel');
            delete a.dataset.excTabForced;
          }
        });
      }
      if (config.list_open_in_new_tab) {
        el.querySelectorAll('a[href*="/g/"]').forEach((a) => {
          a.dataset.excTabForced = '1';
        });
      }
    } catch (_) { /* ignore */ }

    let edition;
    try {
      edition = await upsertEdition(partial);
    } catch (e) {
      console.warn('[ExC] upsert list edition', e);
      return null;
    }
    el.dataset.excWork = edition.work_id || '';

    const work = edition.work_id ? await idbGet(STORE_WORKS, edition.work_id) : null;
    const lib = await resolveLibraryState(edition);
    const block = isBlockedEdition(edition, work);

    if (block.blocked) {
      el.classList.add('is-exc-blocked');
      if (config.hide_blocked) el.classList.add('exc-hide');
    }
    // 三类框体分开打标（互不顶替，可叠加）
    // 1) 点过 2) 库内 3) 心动
    el.classList.remove('is-exc-seen', 'is-exc-lib', 'is-exc-fav', 'is-exc-familiar');
    const seenOnly = isGallerySeen(edition.gid);
    if (seenOnly) el.classList.add('is-exc-seen');
    const inLib = !!(
      lib &&
      (lib.same_version_confirmed || lib.edition_in_library || lib.work_in_library)
    );
    if (inLib) el.classList.add('is-exc-lib');

    // 封面 host：点过/库内描边仍打在图上
    let coverHost =
      el.querySelector('.glthumb') ||
      el.querySelector('.gl1e') ||
      el.querySelector('.gl3t') ||
      el.querySelector('a[href*="/g/"]') ||
      el;
    if (!(coverHost && coverHost.querySelector && coverHost.querySelector('img'))) {
      const img = el.querySelector('img');
      if (img && img.parentElement) coverHost = img.parentElement;
    }
    if (coverHost && coverHost.nodeType === 1) {
      coverHost.classList.add('exc-cover-host');
      const cs = window.getComputedStyle(coverHost);
      if (cs.position === 'static') coverHost.style.position = 'relative';
    }

    // 徽章左上 + 标签流左下，都挂卡片框
    const badgeHost = el;
    if (badgeHost && badgeHost.nodeType === 1) {
      badgeHost.classList.add('exc-card-badge-host');
      const cs = window.getComputedStyle(badgeHost);
      if (cs.position === 'static') badgeHost.style.position = 'relative';
    }
    try {
      if (coverHost) {
        coverHost
          .querySelectorAll(':scope > .exc-badge-container, :scope > .exc-tag-stream')
          .forEach((n) => n.remove());
      }
    } catch (_) { /* ignore */ }

    const ensureBox = (cls) => {
      let box = badgeHost && badgeHost.querySelector(':scope > .' + cls);
      if (badgeHost && !box) {
        box = document.createElement('div');
        box.className = cls;
        badgeHost.appendChild(box);
      }
      return box;
    };
    const badgeBox = ensureBox('exc-badge-container');
    const streamBox = ensureBox('exc-tag-stream');

    const renderMetaHtml = (items) =>
      items
        .map((x) => {
          const tip = x.title ? ' title="' + escapeHtml(x.title) + '"' : '';
          if (x.act) {
            return (
              '<button type="button" class="meta-tag ' +
              (x.cls || '') +
              ' exc-meta-act"' +
              tip +
              ' data-exc-meta="' +
              escapeHtml(x.act) +
              '">' +
              escapeHtml(x.t) +
              '</button>'
            );
          }
          return (
            '<span class="meta-tag ' +
            (x.cls || '') +
            '"' +
            tip +
            '>' +
            escapeHtml(x.t) +
            '</span>'
          );
        })
        .join('');

    if (badgeBox || streamBox) {
      const topTags = [];
      const streamTags = [];
      const edTitle = edition.title_raw || edition.title || partial.title_raw || partial.title || '';
      const edTags = (() => {
        const set = new Set();
        const add = (arr) =>
          (arr || []).forEach((t) => {
            const s = compactText(t);
            if (s) set.add(s);
          });
        add(edition.tags);
        add(partial.tags);
        return Array.from(set);
      })();

      // —— 左上：状态徽章 ——
      if (lib && lib.same_version_confirmed) {
        topTags.push({ t: '同源✓', cls: 'ok', title: '已手动确认与库内为同一版本' });
      } else if (lib && lib.edition_in_library) topTags.push({ t: '本版在库', cls: 'ok' });
      else if (lib && lib.work_in_library) {
        const tip = libraryCompareTip(lib);
        const short =
          lib.library_compare && lib.library_compare.diffs && lib.library_compare.diffs.length
            ? (lib.library_compare.short_label || '库内有').slice(0, 16)
            : '库内有';
        topTags.push({ t: short, cls: 'ok', title: tip || '本 Work 库内已有版本' });
      } else if (lib && lib.maybe_in_library) {
        const label = maybeLibLabel(lib);
        topTags.push({
          t: label.slice(0, 16),
          cls:
            lib.library_compare && lib.library_compare.online_better
              ? 'maybe hot'
              : 'maybe',
          title: libraryCompareTip(lib) || '可能在库，点绑定 LRR 确认',
          act: 'bind',
        });
      }
      if (lib && lib.has_better_remote && !lib.same_version_confirmed) {
        topTags.push({ t: '有更好版', cls: 'hot' });
      }
      if (work && work.blocked) topTags.push({ t: '抛弃', cls: 'warn' });

      try {
        if (typeof matchFamiliarRadar === 'function') {
          const fam = matchFamiliarRadar(edTitle, edTags);
          if (fam && fam.name) {
            el.classList.add('is-exc-familiar');
            topTags.unshift({
              t: (fam.kind === 'group' ? '团队: ' : '画师: ') + String(fam.name).slice(0, 14),
              cls: fam.kind === 'group' ? 'familiar-group' : 'familiar-artist',
              title: '熟人 · ' + (fam.kind === 'group' ? '团队' : '画师') + ' · ' + fam.name,
            });
          }
        }
      } catch (_) { /* ignore */ }

      const favHits =
        typeof matchFavTags === 'function'
          ? matchFavTags(config.fav_tags || [], edTags, edTitle)
          : [];
      if (favHits.length) el.classList.add('is-exc-fav');
      favHits.slice(0, 2).forEach((ft) => {
        topTags.unshift({ t: '♥ ' + String(ft).slice(0, 12), cls: 'hot', title: '心动标签: ' + ft });
      });
      if (favHits.length > 2) {
        topTags.unshift({
          t: '♥+' + (favHits.length - 2),
          cls: 'hot',
          title: '更多心动: ' + favHits.slice(2).join(', '),
        });
      }

      // —— 左下：标签流（码级/内容/角色）——
      if (config.list_show_tag_stream !== false && typeof pickHighlightTags === 'function') {
        const hi = pickHighlightTags(edTags, {
          max: Number(config.list_tag_stream_max) || 3,
          favTags: config.fav_tags || [],
          title: edTitle,
        });
        hi.forEach((item) => {
          const label =
            typeof formatHighlightTagLabel === 'function'
              ? formatHighlightTagLabel(item)
              : item.name;
          streamTags.push({
            t: label,
            cls: 'stream',
            title: item.full || item.name,
          });
        });
      }
      // 码级简写可跟标签流一起放左下（标题常没有）
      if (edition.censor_tier && edition.censor_tier !== 'unknown') {
        const cs = shortCensor(edition.censor_tier) || edition.censor_tier;
        if (cs && !streamTags.some((x) => x.t === cs)) {
          streamTags.unshift({ t: cs, cls: 'stream', title: '码级' });
        }
      }

      if (badgeBox) {
        const showTop = topTags.slice(0, 6);
        const moreTop = topTags.length - showTop.length;
        badgeBox.innerHTML =
          '<div class="exc-meta-overlay">' +
          renderMetaHtml(showTop) +
          (moreTop > 0 ? '<span class="meta-tag more">+' + moreTop + '</span>' : '') +
          '</div>';
        badgeBox.onclick = async (ev) => {
          const btn = ev.target && ev.target.closest && ev.target.closest('[data-exc-meta]');
          if (!btn) return;
          ev.preventDefault();
          ev.stopPropagation();
          const act = btn.getAttribute('data-exc-meta');
          try {
            if (act === 'bind') await openBindModal(edition);
          } catch (err) {
            showToast('操作失败: ' + ((err && err.message) || err));
          }
        };
      }
      if (streamBox) {
        if (streamTags.length) {
          streamBox.innerHTML =
            '<div class="exc-meta-overlay">' + renderMetaHtml(streamTags.slice(0, 4)) + '</div>';
          streamBox.hidden = false;
        } else {
          streamBox.innerHTML = '';
          streamBox.hidden = true;
        }
      }
    }

    let tools = coverHost && coverHost.querySelector(':scope > .exc-tool-bar');
    if (coverHost && !tools) {
      tools = document.createElement('div');
      tools.className = 'exc-tool-bar';
      coverHost.appendChild(tools);
    }
    if (tools) {
      const blockOn = work && work.blocked;
      // 当前列表是否可追更 + 是否已是断点作品
      const pageCtx = parseExhPageContext(location.href);
      let isBpWork = false;
      let trkRec = null;
      if (pageCtx && pageCtx.trackable) {
        try {
          trkRec =
            typeof findTrackingForContext === 'function'
              ? await findTrackingForContext(pageCtx)
              : await getTrackingBySignature(pageCtx.query_signature);
          if (trkRec && trkRec.id) {
            el.dataset.excTrackId = String(trkRec.id);
            if (trkRec.last_page != null) el.dataset.excTrackLastPage = String(trkRec.last_page);
          }
          if (trkRec && String(trkRec.breakpoint_gid || '') === String(edition.gid)) {
            isBpWork = true;
            el.classList.add('is-exc-breakpoint');
          }
          // 浏览列表时回填最新/断点的发布时间
          if (trkRec) {
            const isTop = String(trkRec.top_gid || '') === String(edition.gid);
            const isBp = String(trkRec.breakpoint_gid || '') === String(edition.gid);
            let posted =
              Number(edition.posted_at) ||
              Number(partial.posted_at) ||
              extractListItemPostedAt(el, edition.gid) ||
              0;
            // 仅对最新/断点作品走 gdata，避免列表刷爆 API
            if (!posted && (isTop || isBp)) {
              posted = await resolveGalleryPostedMs(
                edition.gid,
                edition.token || partial.token || '',
                el
              );
            }
            let trkDirty = false;
            if (isTop) {
              if (edition.token || partial.token) {
                trkRec.top_token = compactText(edition.token || partial.token);
              }
              if (posted && (!(Number(trkRec.top_posted_at) > 0) || Number(trkRec.top_posted_at) !== posted)) {
                trkRec.top_posted_at = posted;
                trkDirty = true;
              }
              const tt = compactText(partial.title_raw || edition.title_raw || '');
              if (tt && tt !== trkRec.top_title) {
                trkRec.top_title = tt.slice(0, 160);
                trkDirty = true;
              }
              if (partial.thumb || edition.thumb) {
                applyTrackingCoverFields(trkRec, partial.thumb || edition.thumb);
                trkDirty = true;
              }
            }
            if (isBp) {
              if (edition.token || partial.token) {
                trkRec.breakpoint_token = compactText(edition.token || partial.token);
              }
              if (
                posted &&
                (!(Number(trkRec.breakpoint_posted_at) > 0) ||
                  Number(trkRec.breakpoint_posted_at) !== posted)
              ) {
                trkRec.breakpoint_posted_at = posted;
                trkDirty = true;
              }
              const bt = compactText(partial.title_raw || edition.title_raw || '');
              if (bt && bt !== trkRec.breakpoint_title) {
                trkRec.breakpoint_title = bt.slice(0, 120);
                trkDirty = true;
              }
            }
            if (trkDirty) {
              await saveTrackingRecord(trkRec);
            }
          }
        } catch (_) { /* ignore */ }
      }
      // 作品级断点按钮：封面右下角「断」——不是顶栏整页断点
      const bpBtn =
        pageCtx && pageCtx.trackable
          ? '<button type="button" class="exc-tool-btn' +
            (isBpWork ? ' is-on is-bp' : '') +
            '" data-exc-act="breakpoint" title="设为追更断点（本作品）">断</button>'
          : '';
      tools.innerHTML =
        bpBtn +
        '<button type="button" class="exc-tool-btn" data-exc-act="best" title="最佳版">↗</button>' +
        '<button type="button" class="exc-tool-btn" data-exc-act="bind" title="绑定 LRR">📦</button>' +
        '<button type="button" class="exc-tool-btn' +
        (blockOn ? ' is-block is-on' : '') +
        '" data-exc-act="drop" title="抛弃/屏蔽此单本">✕</button>';

      tools.onclick = async (ev) => {
        const btn = ev.target && ev.target.closest && ev.target.closest('[data-exc-act]');
        if (!btn) return;
        ev.preventDefault();
        ev.stopPropagation();
        const act = btn.getAttribute('data-exc-act');
        try {
          if (act === 'breakpoint') {
            const ctx = parseExhPageContext(location.href);
            if (!ctx || !ctx.trackable) {
              showToast('当前页不能设断点');
              return;
            }
            let rec =
              typeof findTrackingForContext === 'function'
                ? await findTrackingForContext(ctx)
                : await getTrackingBySignature(ctx.query_signature);
            if (!rec) {
              rec = await saveCurrentPageAsTracking();
              if (!rec) return;
            }
            const postedLocal =
              Number(edition.posted_at) ||
              Number(partial.posted_at) ||
              extractListItemPostedAt(el, edition.gid) ||
              0;
            await markTrackingBreakpoint(rec, {
              gid: edition.gid,
              token: edition.token || partial.token || '',
              title: compactText(
                edition.title_raw || partial.title_raw || edition.title || partial.title || ''
              ),
              posted_at: postedLocal,
              root: el,
            });
            let bpPosted = '';
            try {
              const latest =
                typeof findTrackingForContext === 'function'
                  ? await findTrackingForContext(ctx)
                  : await getTrackingBySignature(ctx.query_signature);
              bpPosted = formatTrackingPostedShort(latest && latest.breakpoint_posted_at);
            } catch (_) { /* ignore */ }
            const pgSt =
              typeof getListPageState === 'function'
                ? getListPageState(location.href, document)
                : null;
            const pgBit = pgSt
              ? pgSt.known && pgSt.index >= 0
                ? '列表第 ' + (pgSt.index + 1) + ' 页'
                : pgSt.isFirst
                  ? '列表第 1 页'
                  : '列表深页（游标）'
              : '列表第 ' + (Math.max(0, getCurrentListPageIndex()) + 1) + ' 页';
            showToast(
              '已设断点' + (bpPosted ? ' · ' + bpPosted : '') + ' · ' + pgBit
            );
            // 刷新本页作品工具条状态
            document.querySelectorAll('.exc-gl-item.is-exc-breakpoint').forEach((n) => {
              n.classList.remove('is-exc-breakpoint');
            });
            el.classList.add('is-exc-breakpoint');
            await enhanceListItemForce(el);
            if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
            void refreshTrackingBarState();
            return;
          }
          if (act === 'drop' || act === 'block') {
            const next = !(work && work.blocked);
            await setWorkBlocked(edition.work_id, next);
            try {
              await setWorkStatus(edition.work_id, next ? 'dropped' : 'none');
            } catch (_) { /* ignore */ }
          } else if (act === 'best') {
            await openBestEdition(edition.work_id);
            return;
          } else if (act === 'bind') {
            await openBindModal(edition);
            return;
          }
          await enhanceListItemForce(el);
          if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
        } catch (err) {
          showToast('操作失败: ' + ((err && err.message) || err));
        }
      };
    }

    const legacy = el.querySelector('.exc-enhance-host');
    if (legacy) legacy.remove();

    // 点开：记追更上下文、乐观跟断点、立即已点
    if (el.dataset.excTrackOpenBound !== '1') {
      el.dataset.excTrackOpenBound = '1';
      el.addEventListener(
        'click',
        (ev) => {
          const a = ev.target && ev.target.closest && ev.target.closest('a[href*="/g/"]');
          if (!a) return;
          if (
            ev.target.closest &&
            ev.target.closest('.exc-tool-bar, .exc-meta-overlay, [data-exc-act], [data-exc-meta]')
          ) {
            return;
          }
          try {
            const gid = el.dataset.excGid || '';
            // 立即「已点」渲染（新标签打开时列表页还在）
            if (gid && typeof markGallerySeen === 'function') {
              markGallerySeen(gid);
              el.classList.add('is-exc-seen');
            }

            const tid = el.dataset.excTrackId || '';
            if (!tid) return;
            const st =
              typeof getListPageState === 'function'
                ? getListPageState(location.href, document)
                : null;
            let listIndex = -1;
            let pageLen = 0;
            try {
              const gids =
                typeof extractOrderedGidsFromDocument === 'function'
                  ? extractOrderedGidsFromDocument(document)
                  : [];
              pageLen = gids.length || 0;
              listIndex = gid && gids.length ? gids.indexOf(String(gid)) : -1;
            } catch (_) { /* ignore */ }
            let pageIndex = st && st.known ? st.index : -1;
            if (!(pageIndex >= 0) || (st && st.isFirst === false && !(pageIndex > 0))) {
              const lp = parseInt(el.dataset.excTrackLastPage || '', 10);
              if (Number.isFinite(lp) && lp > 0) pageIndex = lp;
            }
            try {
              const depthKey = 'exc_trk_depth_' + tid;
              const urlKey = 'exc_trk_url_' + tid;
              if (st && st.isFirst) {
                sessionStorage.setItem(depthKey, '0');
                sessionStorage.setItem(urlKey, location.href.split('#')[0]);
                pageIndex = 0;
              } else if (pageIndex > 0) {
                sessionStorage.setItem(depthKey, String(pageIndex));
                sessionStorage.setItem(urlKey, location.href.split('#')[0]);
              } else {
                const prevUrl = sessionStorage.getItem(urlKey) || '';
                const curUrl = location.href.split('#')[0];
                let depth = parseInt(sessionStorage.getItem(depthKey) || '-1', 10);
                if (prevUrl && curUrl !== prevUrl && /[?&](next|prev)=/i.test(curUrl)) {
                  depth = (Number.isFinite(depth) && depth >= 0 ? depth : 0) + 1;
                  sessionStorage.setItem(depthKey, String(depth));
                }
                sessionStorage.setItem(urlKey, curUrl);
                if (!(pageIndex > 0) && Number.isFinite(depth) && depth > 0) pageIndex = depth;
              }
            } catch (_) { /* ignore */ }

            const postedAt =
              Number(edition.posted_at) ||
              Number(partial.posted_at) ||
              (typeof extractListItemPostedAt === 'function'
                ? extractListItemPostedAt(el, gid)
                : 0) ||
              0;
            const pending = {
              trackingId: tid,
              gid: gid,
              token: el.dataset.excToken || edition.token || '',
              title: compactText(
                edition.title_raw || partial.title_raw || edition.title || partial.title || ''
              ),
              posted_at: postedAt,
              listUrl: location.href,
              pageIndex: pageIndex,
              pageMode: (st && st.mode) || '',
              listIndex: listIndex,
              pageLen: pageLen,
            };
            if (typeof setPendingTrackingOpen === 'function') {
              setPendingTrackingOpen(pending);
            }
            // 列表侧乐观跟断点（新标签时画廊页也会再跑一遍，幂等）
            void maybeAutoAdvanceTrackingBreakpoint(
              {
                gid: gid,
                token: pending.token,
                posted_at: postedAt,
                title_raw: pending.title,
              },
              partial,
              { pending: pending, skipUnreadScan: true }
            ).then((advanced) => {
              if (!advanced) return;
              // 更新本页断点高亮
              document.querySelectorAll('.exc-gl-item.is-exc-breakpoint').forEach((n) => {
                n.classList.remove('is-exc-breakpoint');
                const btn = n.querySelector('[data-exc-act="breakpoint"]');
                if (btn) btn.classList.remove('is-on', 'is-bp');
              });
              el.classList.add('is-exc-breakpoint');
              const bpBtn = el.querySelector('[data-exc-act="breakpoint"]');
              if (bpBtn) bpBtn.classList.add('is-on', 'is-bp');
              if (typeof refreshTrackingBarState === 'function') void refreshTrackingBarState();
            });
          } catch (_) { /* ignore */ }
        },
        true
      );
    }

    return { el, edition, work, lib, coverHost };
  }

  async function enhanceListItemForce(el) {
    el.dataset.excEnhanced = '';
    el.classList.remove(
      'is-exc-blocked',
      'exc-hide',
      'is-exc-fav',
      'is-exc-lib',
      'is-exc-seen',
      'is-exc-breakpoint',
      'is-exc-folded-child'
    );
    return enhanceListItem(el);
  }

  async function openBestEdition(workId) {
    const editions = await listEditionsByWork(workId);
    const best = pickBestEdition(editions, config);
    if (!best) {
      const works = await idbGet(STORE_WORKS, workId);
      if (works) {
        const sample = editions[0];
        if (sample) {
          const lib = await resolveLibraryState(sample);
          const arc = (lib.work_archives || lib.exact_archives || [])[0];
          if (arc) {
            const u = buildLrrReaderUrl(arc.arcid);
            if (u) {
              window.open(u, '_blank');
              return;
            }
          }
        }
      }
      showToast('暂无可用版本');
      return;
    }
    const url = best.url || buildGalleryUrl(location.origin, best.gid, best.token);
    if (config.open_best_in_new_tab) window.open(url, '_blank');
    else location.href = url;
  }

  function describePrimaryEdition(ed) {
    if (!ed) return '';
    const bits = [];
    if (ed.language) bits.push(ed.language);
    if (ed.censor_tier && ed.censor_tier !== 'unknown') bits.push(ed.censor_tier);
    if (ed.group) bits.push(ed.group);
    if (ed.pages) bits.push(ed.pages + 'p');
    if (ed.size_bytes) bits.push(formatBytes(ed.size_bytes));
    return bits.join(' · ') || '偏好最佳';
  }

  function getFoldPrimaryMode() {
    const m = config.fold_primary_mode || 'preference';
    return FOLD_PRIMARY_MODES[m] ? m : 'preference';
  }

  function getFoldPrimaryModeLabel(mode) {
    return FOLD_PRIMARY_MODES[mode] || FOLD_PRIMARY_MODES.preference;
  }

  function rankFoldGroup(list) {
    const mode = getFoldPrimaryMode();
    const arr = list.slice();
    arr.forEach((item, idx) => {
      item._listIndex = idx;
    });
    if (mode === 'newest') {
      arr.sort((a, b) => {
        const ta = Number(a.edition && a.edition.posted_at) || 0;
        const tb = Number(b.edition && b.edition.posted_at) || 0;
        if (tb !== ta) return tb - ta;
        return (a._listIndex || 0) - (b._listIndex || 0);
      });
    } else if (mode === 'list_order') {
      arr.sort((a, b) => (a._listIndex || 0) - (b._listIndex || 0));
    } else {
      arr.sort((a, b) => scoreEdition(b.edition, config) - scoreEdition(a.edition, config));
    }
    return arr;
  }

  function applyWorkFold(enhanced) {
    if (!config.list_fold_works) return;
    const groups = new Map();
    for (const item of enhanced) {
      if (!item || !item.edition || !item.edition.work_id) continue;
      const wid = item.edition.work_id;
      if (!groups.has(wid)) groups.set(wid, []);
      groups.get(wid).push(item);
    }
    const mode = getFoldPrimaryMode();
    const modeLabel = getFoldPrimaryModeLabel(mode);

    for (const [, list] of groups) {
      if (list.length < 2) continue;
      const ranked = rankFoldGroup(list);
      const primary = ranked[0];
      list.forEach((x) => {
        x.el.classList.remove('is-exc-folded-child');
        const old = x.el.querySelector('.exc-fold-tag');
        if (old) old.remove();
      });
      ranked.slice(1).forEach((x) => x.el.classList.add('is-exc-folded-child'));

      const hidden = ranked.length - 1;
      let badgeBox =
        (primary.coverHost && primary.coverHost.querySelector('.exc-badge-container')) ||
        primary.el.querySelector('.exc-badge-container');
      if (!badgeBox && primary.coverHost) {
        badgeBox = document.createElement('div');
        badgeBox.className = 'exc-badge-container';
        primary.coverHost.appendChild(badgeBox);
      }
      if (!badgeBox) continue;

      let overlay = badgeBox.querySelector('.exc-meta-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'exc-meta-overlay';
        badgeBox.appendChild(overlay);
      }

      let tag = overlay.querySelector('.exc-fold-tag');
      if (!tag) {
        tag = document.createElement('button');
        tag.type = 'button';
        tag.className = 'meta-tag more exc-fold-tag';
        overlay.appendChild(tag);
      }
      const tip =
        '同作 ' +
        ranked.length +
        ' 个版本\n主显示：' +
        describePrimaryEdition(primary.edition) +
        '\n规则：' +
        modeLabel +
        '\n（工作台 ⚙ 偏好可改）\n点击展开/收起其余 ' +
        hidden +
        ' 个';
      tag.title = tip;
      tag.setAttribute('aria-label', tip);
      tag.textContent = '×' + ranked.length;
      tag.dataset.open = '0';
      tag.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const open = tag.dataset.open === '1';
        tag.dataset.open = open ? '0' : '1';
        ranked.slice(1).forEach((x) => {
          x.el.classList.toggle('is-exc-folded-child', open);
        });
        tag.textContent = open ? '×' + ranked.length : '收起';
        tag.classList.toggle('hot', !open);
      };
    }
  }

  let trackingBarBrowseTimer = null;

  function mountTrackingBar(bar) {
    // 挂在「工具条/顶部分页」之后、「画廊列表」之前，避免贴 #nb 或搜索框上方
    const list =
      document.querySelector('#ido table.itg') ||
      document.querySelector('#ido .itg') ||
      document.querySelector('table.itg') ||
      document.querySelector('.itg') ||
      document.querySelector('#ido .gl1t') ||
      document.querySelector('.gl1t');
    const dms = document.getElementById('dms');
    const topPager =
      document.querySelector('#ido table.ptt') ||
      document.querySelector('table.ptt') ||
      document.querySelector('.ptt');
    const favForm =
      document.querySelector('#favform') ||
      document.querySelector('form[action*="favorites"]') ||
      document.querySelector('#ido form');

    if (list && list.parentNode) {
      // 若顶部分页与列表同父，插在分页后；否则直接在列表前
      let insertBeforeNode = list;
      if (
        topPager &&
        topPager.parentNode === list.parentNode &&
        topPager.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING
      ) {
        // 分页 → [bar] → 列表
        insertBeforeNode = list;
        if (bar.parentNode !== list.parentNode || bar.nextElementSibling !== list) {
          list.parentNode.insertBefore(bar, list);
        }
        return;
      }
      if (dms && dms.parentNode === list.parentNode) {
        // dms → [bar] → 列表（中间可能还有节点，仍贴列表前更稳）
        if (bar.parentNode !== list.parentNode || bar.nextElementSibling !== list) {
          list.parentNode.insertBefore(bar, list);
        }
        return;
      }
      if (bar.parentNode !== list.parentNode || bar.nextElementSibling !== insertBeforeNode) {
        list.parentNode.insertBefore(bar, insertBeforeNode);
      }
      return;
    }

    if (dms && dms.parentNode) {
      // 无列表时：放在 dms 后
      if (bar.previousElementSibling !== dms || bar.parentNode !== dms.parentNode) {
        dms.parentNode.insertBefore(bar, dms.nextSibling);
      }
      return;
    }

    if (favForm && favForm.parentNode) {
      if (bar.previousElementSibling !== favForm || bar.parentNode !== favForm.parentNode) {
        favForm.parentNode.insertBefore(bar, favForm.nextSibling);
      }
      return;
    }

    const ido = document.getElementById('ido') || document.querySelector('.ido');
    if (ido) {
      // 不要 prepend 到 ido 顶：尽量找内容块
      const firstBig = ido.querySelector('.itg, table.ptt, #dms, .gl1t, table');
      if (firstBig && firstBig.parentNode === ido) {
        if (firstBig.id === 'dms' || (firstBig.classList && firstBig.classList.contains('ptt'))) {
          if (bar.previousElementSibling !== firstBig) {
            ido.insertBefore(bar, firstBig.nextSibling);
          }
        } else if (bar.nextElementSibling !== firstBig) {
          ido.insertBefore(bar, firstBig);
        }
      } else if (!bar.parentNode || bar.parentNode !== ido) {
        // 最后手段：插在 ido 末尾附近，而不是最顶
        ido.appendChild(bar);
      }
      return;
    }
    if (!bar.parentNode) document.body.appendChild(bar);
  }

  function injectTrackingBar() {
    const ctx = parseExhPageContext(location.href);
    let bar = document.getElementById('exc-tracking-bar');
    if (!ctx || !ctx.trackable) {
      if (bar) bar.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'exc-tracking-bar';
    }

    // 同一 signature 不重建 DOM（只校正挂载位 + 刷状态），避免收藏页 mutation 闪烁
    if (bar.dataset.sig === ctx.query_signature && bar.dataset.ready === '1') {
      mountTrackingBar(bar);
      void refreshTrackingBarState();
      return;
    }

    mountTrackingBar(bar);

    bar.dataset.sig = ctx.query_signature;
    bar.dataset.ready = '1';
    bar.removeAttribute('style');
    const groupLabel = getTrackingGroupLabel(ctx.group_type);
    bar.innerHTML =
      '<span class="exc-track-label" title="' +
      escapeHtml(ctx.label) +
      '"><b>追更</b> · ' +
      escapeHtml(groupLabel) +
      ' · ' +
      escapeHtml(ctx.label) +
      '</span>' +
      '<span class="exc-track-status" id="exc-track-status">未收藏</span>' +
      '<div class="exc-track-actions">' +
      // 继续断点放最前：有断点时最显眼，不再排在「已追更」后面
      '<button type="button" class="jlc-wb-btn primary exc-track-btn exc-bp-continue" id="exc-goto-bp" hidden title="跳到断点作品并定位">继续断点</button>' +
      '<button type="button" class="jlc-wb-btn ghost exc-track-btn" id="exc-save-tracking">⭐ 收藏追更</button>' +
      '<button type="button" class="jlc-wb-btn ghost exc-track-btn" id="exc-untrack" hidden title="从追更列表移除">取消追更</button>' +
      '</div>' +
      '<div class="exc-track-meta" id="exc-track-meta" hidden></div>';

    const btn = document.getElementById('exc-save-tracking');
    if (btn) {
      btn.onclick = async () => {
        await saveCurrentPageAsTracking();
        void refreshTrackingBarState();
      };
    }
    const gotoBp = document.getElementById('exc-goto-bp');
    if (gotoBp) {
      gotoBp.onclick = async () => {
        const rec =
          typeof findTrackingForContext === 'function'
            ? await findTrackingForContext(ctx)
            : await getTrackingBySignature(ctx.query_signature);
        if (!rec) return;
        await openTrackingBreakpoint(rec);
      };
    }
    const untrack = document.getElementById('exc-untrack');
    if (untrack) {
      untrack.onclick = async () => {
        const rec =
          typeof findTrackingForContext === 'function'
            ? await findTrackingForContext(ctx)
            : await getTrackingBySignature(ctx.query_signature);
        if (!rec) return;
        if (!confirm('取消追更「' + getTrackingDisplayTitle(rec) + '」？')) return;
        await deleteTrackingRecord(rec.id);
        showToast('已取消追更');
        void refreshTrackingBarState();
        if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
      };
    }
    void refreshTrackingBarState();
  }

  async function refreshTrackingBarState() {
    const ctx = parseExhPageContext(location.href);
    const bar = document.getElementById('exc-tracking-bar');
    const btn = document.getElementById('exc-save-tracking');
    const status = document.getElementById('exc-track-status');
    const gotoBp = document.getElementById('exc-goto-bp');
    const untrack = document.getElementById('exc-untrack');
    const meta = document.getElementById('exc-track-meta');
    if (!ctx || !ctx.trackable || !bar || !btn) return;

    const rec =
      typeof findTrackingForContext === 'function'
        ? await findTrackingForContext(ctx)
        : await getTrackingBySignature(ctx.query_signature);
    const pageState =
      typeof getListPageState === 'function'
        ? getListPageState(location.href, document)
        : {
            index: getCurrentListPageIndex(),
            known: true,
            isFirst: getCurrentListPageIndex() === 0,
            mode: 'page',
            display: String((getCurrentListPageIndex() || 0) + 1),
          };
    const pageIdx = pageState.known && pageState.index >= 0 ? pageState.index : -1;
    const pageDisp =
      pageState.display ||
      (typeof formatListPageDisplay === 'function'
        ? formatListPageDisplay(pageState)
        : pageIdx >= 0
          ? String(pageIdx + 1)
          : '深页');
    const isFirstPage = pageState.isFirst === true;

    if (rec) {
      // 翻页时维护 session 深度，点开作品才能正确下调未读
      try {
        if (rec.id) {
          const depthKey = 'exc_trk_depth_' + rec.id;
          const urlKey = 'exc_trk_url_' + rec.id;
          const curUrl = location.href.split('#')[0];
          if (isFirstPage) {
            sessionStorage.setItem(depthKey, '0');
          } else if (pageIdx > 0) {
            sessionStorage.setItem(depthKey, String(pageIdx));
          } else {
            const prevUrl = sessionStorage.getItem(urlKey) || '';
            let depth = parseInt(sessionStorage.getItem(depthKey) || '-1', 10);
            if (prevUrl && curUrl !== prevUrl && /[?&](next|prev)=/i.test(curUrl)) {
              depth = (Number.isFinite(depth) && depth >= 0 ? depth : 0) + 1;
              sessionStorage.setItem(depthKey, String(depth));
            }
          }
          sessionStorage.setItem(urlKey, curUrl);
          const d = parseInt(sessionStorage.getItem(depthKey) || '', 10);
          if (Number.isFinite(d) && d >= 0) {
            document.querySelectorAll('.exc-gl-item[data-exc-track-id="' + rec.id + '"]').forEach((el) => {
              el.dataset.excTrackLastPage = String(d);
            });
          }
        }
      } catch (_) { /* ignore */ }
      bar.classList.add('is-tracked');
      if (status) status.textContent = '已追更';
      btn.textContent = '✓ 已追更';
      btn.classList.remove('primary');
      btn.classList.add('ghost');
      btn.title = '已在追更列表';
      if (untrack) untrack.hidden = false;
      const hasBp = trackingHasAnyBreakpoint(rec);
      if (gotoBp) {
        gotoBp.hidden = !hasBp;
        if (hasBp) {
          const bpPage = Number(rec.breakpoint_page);
          const bpPageLabel =
            Number.isFinite(bpPage) && bpPage >= 0
              ? String(bpPage + 1)
              : rec.breakpoint_page_mode === 'cursor' || bpPage < 0
                ? '深页'
                : '1';
          const bpPosted = getTrackingBpMetaLabel(rec);
          const bpTitle = shortTrackingWorkLabel(
            rec.breakpoint_title,
            rec.breakpoint_gid,
            40
          );
          gotoBp.textContent = bpPosted
            ? '继续断点 · ' + bpPosted
            : '继续断点 · 第' + bpPageLabel + '页';
          gotoBp.title =
            '定位断点作品' +
            (bpTitle ? '「' + bpTitle + '」' : '') +
            (bpPosted ? ' · ' + bpPosted : '') +
            '（列表第 ' +
            bpPageLabel +
            ' 页）· 在封面点「断」可改断点';
        }
      }
      if (meta) {
        meta.hidden = false;
        const bits = [
          pageState.mode === 'cursor' && !pageState.known
            ? '当前深页（游标 next/prev）'
            : '当前第 ' + pageDisp + ' 页',
        ];
        if (rec.breakpoint_gid || rec.breakpoint_posted_at || rec.breakpoint_title) {
          bits.push('断点 ' + (getTrackingBpMetaLabel(rec) || '已设'));
        }
        if (hasBp) {
          const bpPage = Number(rec.breakpoint_page);
          const bpPageLabel =
            Number.isFinite(bpPage) && bpPage >= 0
              ? String(bpPage + 1)
              : '深页';
          bits.push('断点第' + bpPageLabel + '页');
        }
        if (
          typeof trackingHasPendingUpdate === 'function'
            ? trackingHasPendingUpdate(rec)
            : rec.has_update ||
              (rec.top_gid && rec.breakpoint_gid && rec.top_gid !== rec.breakpoint_gid)
        ) {
          const n =
            typeof getTrackingUnreadEstimate === 'function' ? getTrackingUnreadEstimate(rec) : 0;
          bits.push(n > 0 ? (rec.unread_estimate_capped ? '+' + n + '+ 未读' : '+' + n + ' 未读') : '有更新');
        }
        bits.push('封面右下角「断」= 设作品断点');
        meta.textContent = bits.join(' · ');
      }
      // 轻量记浏览页（防抖）；深页/游标页绝不改写 top_gid
      if (trackingBarBrowseTimer) clearTimeout(trackingBarBrowseTimer);
      trackingBarBrowseTimer = setTimeout(async () => {
        try {
          const latest =
            typeof findTrackingForContext === 'function'
              ? await findTrackingForContext(ctx)
              : await getTrackingBySignature(ctx.query_signature);
          if (!latest) return;
          latest.last_page = pageIdx;
          latest.last_browsed_at = nowMs();
          if (latest.open_url && typeof canonicalizeTrackingOpenUrl === 'function') {
            const canon = canonicalizeTrackingOpenUrl(latest.open_url);
            if (latest.open_url !== canon) {
              latest.open_url = canon;
              latest.page_url = canon;
            }
          }
          // 仅真·首页才更新「最新」；深页/游标只估未读
          if (isFirstPage && ctx.top_gid) {
            const previousTop = compactText(latest.top_gid || '');
            if (latest.top_gid && latest.top_gid !== ctx.top_gid) {
              latest.has_update = 1;
              latest.prev_top_gid = latest.top_gid;
            }
            if (
              latest.breakpoint_gid &&
              String(latest.breakpoint_gid) !== String(ctx.top_gid)
            ) {
              latest.has_update = 1;
            }
            latest.top_gid = ctx.top_gid;
            if (ctx.top_title) latest.top_title = compactText(ctx.top_title).slice(0, 160);
            if (ctx.top_posted_at) latest.top_posted_at = Number(ctx.top_posted_at) || 0;
            if (ctx.top_cover) applyTrackingCoverFields(latest, ctx.top_cover);
            try {
              const gids =
                typeof extractOrderedGidsFromDocument === 'function'
                  ? extractOrderedGidsFromDocument(document)
                  : [];
              if (typeof applyTrackingUnreadFromGids === 'function') {
                applyTrackingUnreadFromGids(latest, gids, ctx.top_gid || latest.top_gid || '', {
                  previousTop: previousTop,
                  pageIndex: 0,
                  isFirst: true,
                  mode: 'absolute',
                });
              }
            } catch (_) { /* ignore */ }
          } else if (!isFirstPage && latest.breakpoint_gid) {
            // 深页浏览：只记位置；未读禁止用当页局部覆盖（next= 会把 +200 打成 +23）
            // 已知 page=N 时才允许用页偏移抬高下限
            try {
              if (pageState.known && pageIdx >= 0) {
                const gids =
                  typeof extractOrderedGidsFromDocument === 'function'
                    ? extractOrderedGidsFromDocument(document)
                    : [];
                if (typeof applyTrackingUnreadFromGids === 'function') {
                  applyTrackingUnreadFromGids(latest, gids, latest.top_gid || '', {
                    pageIndex: pageIdx,
                    isFirst: false,
                    deepUnknown: false,
                    mode: 'browse',
                  });
                }
              } else {
                // 游标深页：最多维持 has_update，不改 unread_estimate
                if (
                  latest.top_gid &&
                  latest.breakpoint_gid &&
                  String(latest.top_gid) !== String(latest.breakpoint_gid)
                ) {
                  latest.has_update = 1;
                }
              }
            } catch (_) { /* ignore */ }
          }
          await saveTrackingRecord(latest);
        } catch (_) { /* ignore */ }
      }, 800);
    } else {
      bar.classList.remove('is-tracked');
      if (status) status.textContent = '未收藏';
      btn.textContent = '⭐ 收藏追更';
      btn.title = '收藏当前搜索到追更';
      if (gotoBp) gotoBp.hidden = true;
      if (untrack) untrack.hidden = true;
      if (meta) {
        meta.hidden = false;
        meta.textContent =
          (pageState.mode === 'cursor' && !pageState.known
            ? '当前深页（游标）'
            : '当前列表第 ' + pageDisp + ' 页') +
          ' · 在任意作品封面右下角点「断」设为断点作品';
      }
    }
  }

  async function enhanceListPage() {
    bindListLiveRefresh();
    injectTrackingBar();
    const items = queryListItems();
    const enhanced = [];
    let n = 0;
    for (const el of items) {
      const r = await enhanceListItem(el);
      if (r) enhanced.push(r);
      n++;
      if (n % 10 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    applyWorkFold(enhanced);
    tryConsumeBreakpointScroll();
    return enhanced.length;
  }

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

  /** 列表页回前台时重绘已点/断点/徽章 */
  let listLiveRefreshTimer = null;
  function scheduleListLiveRefresh(reason) {
    if (listLiveRefreshTimer) clearTimeout(listLiveRefreshTimer);
    listLiveRefreshTimer = setTimeout(() => {
      listLiveRefreshTimer = null;
      try {
        const kind = detectPageKind();
        if (kind === 'gallery' || kind === 'image') return;
        document.querySelectorAll('.exc-gl-item').forEach((el) => {
          el.dataset.excEnhanced = '';
        });
        enhanceListPage().catch(() => {});
        if (typeof refreshTrackingBarState === 'function') {
          void refreshTrackingBarState();
        }
        if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
      } catch (e) {
        console.warn('[ExC] list live refresh', reason, e);
      }
    }, 200);
  }

  function bindListLiveRefresh() {
    if (window.__excListLiveBound) return;
    window.__excListLiveBound = true;
    window.addEventListener('pageshow', () => scheduleListLiveRefresh('pageshow'));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') scheduleListLiveRefresh('visible');
    });
    window.addEventListener('focus', () => scheduleListLiveRefresh('focus'));
  }

  /** 兄弟版本缺体积/时间/码级时 gdata 补全 */
  async function enrichSiblingEditionsMeta(siblings) {
    const list = (siblings || []).filter(Boolean);
    if (!list.length || typeof fetchGalleryGdataBatch !== 'function') return 0;
    const need = list.filter((ed) => {
      if (!ed.token) return false;
      return (
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
    const pairs = need.slice(0, 25).map((ed) => ({ gid: ed.gid, token: ed.token }));
    let gmap = {};
    try {
      gmap = await fetchGalleryGdataBatch(pairs);
    } catch (_) {
      return 0;
    }
    let n = 0;
    for (let i = 0; i < need.length; i++) {
      const ed = need[i];
      const gm = gmap[String(ed.gid)];
      if (!gm) continue;
      let dirty = false;
      if (gm.posted_at && !(Number(ed.posted_at) > 0)) {
        ed.posted_at = gm.posted_at;
        dirty = true;
      }
      if (gm.pages && !(Number(ed.pages) > 0)) {
        ed.pages = gm.pages;
        dirty = true;
      }
      if (gm.size_bytes && !(Number(ed.size_bytes) > 0)) {
        ed.size_bytes = gm.size_bytes;
        dirty = true;
      }
      if (gm.censor_tier && gm.censor_tier !== 'unknown' && (!ed.censor_tier || ed.censor_tier === 'unknown')) {
        ed.censor_tier = gm.censor_tier;
        dirty = true;
      }
      if (gm.language && gm.language !== 'other' && (!ed.language || ed.language === 'other')) {
        ed.language = gm.language;
        dirty = true;
      }
      if (gm.group && !ed.group) {
        ed.group = gm.group;
        dirty = true;
      }
      if (gm.tags && gm.tags.length && !(ed.tags && ed.tags.length)) {
        ed.tags = gm.tags;
        dirty = true;
      }
      if (gm.title_raw && (!ed.title_raw || ed.title_raw.length < gm.title_raw.length)) {
        ed.title_raw = gm.title_raw;
        dirty = true;
      }
      if (dirty) {
        ed.updated_at = nowMs();
        await idbPut(STORE_EDITIONS, ed);
        n++;
      }
    }
    return n;
  }

  /** 按标题搜相关上传并入 Work；同 work 5 分钟内最多一次 */
  async function autoImportRelatedOnlineEditions(edition) {
    if (!edition || !edition.work_id) return;
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
      const sibs = await listEditionsByWork(edition.work_id);
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
    const edition = await upsertEdition(partial);
    try {
      markGallerySeen(edition.gid);
    } catch (_) { /* ignore */ }
    try {
      // 列表已乐观跟进时 pending 可能已消费；画廊再试一次（幂等）
      await maybeAutoAdvanceTrackingBreakpoint(edition, partial);
    } catch (e) {
      console.warn('[ExC] auto bp', e);
    }
    const work = await idbGet(STORE_WORKS, edition.work_id);
    const lib = await resolveLibraryState(edition);
    let siblings = await listEditionsByWork(edition.work_id);
    // 已有兄弟但缺体积/时间：进页就补一轮（不依赖搜索）
    if (opts.skipRelatedImport && siblings && siblings.length) {
      try {
        await enrichSiblingEditionsMeta(siblings);
        siblings = await listEditionsByWork(edition.work_id);
      } catch (_) { /* ignore */ }
    }
    const prog = await getProgress(edition.work_id);

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
      badgeHtml(lib, work, edition) +
      lrrCompareCard +
      edCompareCard +
      '<div class="jlc-wb-view-title" style="margin-top:10px">操作</div>' +
      '<div class="exc-card-actions">' +
      '<button type="button" class="jlc-wb-btn danger" data-exc-g="drop" title="屏蔽此单本（列表淡化/可隐藏）">' +
      (work && work.blocked ? '取消抛弃' : '抛弃') +
      '</button>' +
      '<button type="button" class="jlc-wb-btn primary" data-exc-g="best">最佳版</button>' +
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
      void autoImportRelatedOnlineEditions(edition);
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

  function observeListMutations() {
    // 只观察列表本体，避开 #nb / 追更条自身，减少闪烁
    const root =
      document.querySelector('table.itg') ||
      document.querySelector('.itg') ||
      document.getElementById('gdt') ||
      document.getElementById('ido') ||
      document.body;
    let timer = null;
    const mo = new MutationObserver((mutations) => {
      // 忽略追更条内部变更
      let relevant = false;
      for (const m of mutations) {
        const t = m.target;
        if (t && t.closest && t.closest('#exc-tracking-bar, #jlc-wb, #jlc-wb-fab, #exc-hover-preview')) {
          continue;
        }
        relevant = true;
        break;
      }
      if (!relevant) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        enhanceListPage().catch((e) => console.warn('[ExC] list enhance', e));
      }, 400);
    });
    mo.observe(root, { childList: true, subtree: true });
  }
