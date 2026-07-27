
  async function collectManualFolderOptions() {
    const all = await listTrackingSearches();
    const map = new Map();
    (all || []).forEach((r) => {
      const name = compactText(r.custom_folder || '');
      if (!name) return;
      const key = 'uf:' + name.toLowerCase();
      if (!map.has(key)) map.set(key, name);
    });
    return Array.from(map.entries())
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  }

  async function openTrackingFolderDialog(record, options) {
    if (!record) return null;
    const opts = options || {};
    const folders = await collectManualFolderOptions();
    const current = compactText(record.custom_folder || '');
    const folderButtons = [
      '<button type="button" class="exc-folder-choice' +
        (!current ? ' is-selected' : '') +
        '" data-folder-choice=""><span>未分类</span><small>稍后整理</small></button>',
    ];
    folders.forEach((folder) => {
      folderButtons.push(
        '<button type="button" class="exc-folder-choice' +
          (folder.name.toLowerCase() === current.toLowerCase() ? ' is-selected' : '') +
          '" data-folder-choice="' +
          escapeHtml(folder.name) +
          '"><span>' +
          escapeHtml(folder.name) +
          '</span></button>'
      );
    });

    const box = openModal(
      opts.reason === 'collect' ? '收藏到分类' : '设置分类',
      '<div id="exc-folder-dialog">' +
        '<p class="exc-folder-intro">' +
        escapeHtml(getTrackingDisplayTitle(record)) +
        '</p>' +
        '<div class="exc-folder-options" role="listbox" aria-label="已有分类">' +
        folderButtons.join('') +
        '</div>' +
        '<div class="exc-folder-create">' +
        '<label for="exc-folder-new">新分类</label>' +
        '<div><input id="exc-folder-new" class="jlc-wb-input" type="text" maxlength="40" placeholder="输入分类名">' +
        '<button type="button" class="jlc-wb-btn primary" data-folder-action="create">使用此分类</button></div>' +
        '</div>' +
        '</div>',
      '<button type="button" class="jlc-wb-btn ghost" data-folder-action="cancel">' +
        (opts.reason === 'collect' ? '稍后设置' : '取消') +
        '</button>'
    );

    const applyFolder = async (folder) => {
      record.custom_folder = compactText(folder || '').slice(0, 40);
      await saveTrackingRecord(record);
      closeModal();
      showToast(record.custom_folder ? '已分类到：' + record.custom_folder : '已放入未分类');
      const trackingRoot = document.getElementById('exc-wb-tracking-root');
      const trackingPage = trackingRoot && trackingRoot.closest('[data-jlc-wb-page="tracking"]');
      const trackingVisible = !!(
        trackingPage &&
        !trackingPage.hidden &&
        document.getElementById('jlc-wb')?.classList.contains('is-open')
      );
      if (trackingVisible) {
        await renderTrackingPage();
      }
      if (typeof refreshListVolatileState === 'function') {
        await refreshListVolatileState();
      }
      if (trackingVisible) void updateFabBadge();
      else if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
      return record.custom_folder;
    };

    box.onclick = (event) => {
      const choice = event.target.closest('[data-folder-choice]');
      const action = event.target.closest('[data-folder-action]');
      if (choice) {
        event.preventDefault();
        void applyFolder(choice.getAttribute('data-folder-choice') || '').catch((error) => {
          showToast('分类失败: ' + ((error && error.message) || error));
        });
        return;
      }
      if (!action) return;
      event.preventDefault();
      const kind = action.getAttribute('data-folder-action');
      if (kind === 'cancel') {
        closeModal();
        return;
      }
      if (kind === 'create') {
        const input = box.querySelector('#exc-folder-new');
        const value = compactText(input && input.value);
        if (!value) {
          if (input) input.focus();
          showToast('请输入分类名');
          return;
        }
        void applyFolder(value).catch((error) => {
          showToast('分类失败: ' + ((error && error.message) || error));
        });
      }
    };
    const input = box.querySelector('#exc-folder-new');
    if (input) {
      input.onkeydown = (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        box.querySelector('[data-folder-action="create"]')?.click();
      };
      setTimeout(() => input.focus(), 0);
    }
    return box;
  }

  async function renderTrackingPage() {
    invalidateTrackingListPaint();
    const root = document.getElementById('exc-wb-tracking-root');
    if (!root) return;
    const query = compactText(wbSession.trackingQuery || '');
    let groupFilter = wbSession.trackingGroup || 'all';
    // 旧版按 group_type 的筛选项作废，回到全部
    if (
      groupFilter !== 'all' &&
      groupFilter !== 'none' &&
      groupFilter.indexOf('uf:') !== 0
    ) {
      groupFilter = 'all';
      wbSession.trackingGroup = 'all';
      saveSession(wbSession);
    }
    const folders = await collectManualFolderOptions();

    root.innerHTML =
      '<div class="jlc-wb-toolbar">' +
      '  <div class="jlc-wb-toolbar-row">' +
      '    <input class="jlc-wb-search" id="exc-trk-q" type="search" placeholder="筛选追更标题…" value="' +
      escapeHtml(query) +
      '">' +
      '    <select class="jlc-wb-select" id="exc-trk-group">' +
      '      <option value="all"' +
      (groupFilter === 'all' ? ' selected' : '') +
      '>全部分组</option>' +
      '      <option value="none"' +
      (groupFilter === 'none' ? ' selected' : '') +
      '>未分类</option>' +
      folders
        .map(
          (f) =>
            '<option value="' +
            escapeHtml(f.key) +
            '"' +
            (groupFilter === f.key ? ' selected' : '') +
            '>' +
            escapeHtml(f.name) +
            '</option>'
        )
        .join('') +
      '    </select>' +
      '  </div>' +
      '  <div class="jlc-wb-toolbar-row jlc-wb-toolbar-note">' +
      '分组靠手动：菜单「设分类」。未设的在「未分类」。自由词搜索不再自动拆组。检查更新间隔 5～10 秒。' +
      '  </div>' +
      '</div>' +
      '<div class="jlc-wb-list-scroll" id="jlc-wb-list-scroll"></div>';

    document.getElementById('exc-trk-q').oninput = (e) => {
      wbSession.trackingQuery = e.target.value;
      saveSession(wbSession);
      scheduleTrackingListPaint();
    };
    document.getElementById('exc-trk-group').onchange = (e) => {
      wbSession.trackingGroup = e.target.value;
      saveSession(wbSession);
      paintTrackingList();
    };
    await paintTrackingList();
  }

  function formatCompactRelativeTime(value) {
    if (!value) return '';
    const time = typeof value === 'number' ? value : new Date(value).getTime();
    if (!Number.isFinite(time)) return '';
    const diff = Date.now() - time;
    if (diff < 60 * 1000) return '刚刚';
    if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + '分钟前';
    if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + '小时前';
    if (diff < 30 * 24 * 60 * 60 * 1000) return Math.floor(diff / (24 * 60 * 60 * 1000)) + '天前';
    const d = new Date(time);
    return d.getMonth() + 1 + '/' + d.getDate();
  }

  function getTrackingReleaseAge(record, referenceNow) {
    const postedAt = Number(record && record.top_posted_at) || 0;
    if (!postedAt) return { text: '', days: 0, stale: false };
    const now = Number(referenceNow) || Date.now();
    const diff = Math.max(0, now - postedAt);
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.floor(diff / dayMs);
    let text = '';
    if (days <= 0) text = '今天';
    else if (days < 30) text = days + '天前';
    else if (days < 365) text = Math.max(1, Math.floor(days / 30)) + '个月前';
    else {
      const years = Math.floor(days / 365);
      const months = Math.floor((days % 365) / 30);
      text = years + '年' + (months ? months + '个月' : '') + '前';
    }
    return { text, days, stale: days >= 90 };
  }

  function updateTrackingCheckButton() {
    const btn = document.getElementById('exc-check-updates');
    if (!btn) return;
    if (trackingCheckRuntime && trackingCheckRuntime.active) {
      btn.disabled = true;
      btn.textContent =
        '检查中 ' +
        trackingCheckRuntime.completed +
        '/' +
        trackingCheckRuntime.total +
        (trackingCheckRuntime.note ? ' · ' + trackingCheckRuntime.note : '');
    } else {
      btn.disabled = false;
      btn.textContent = '检查更新';
    }
  }

  async function refreshAllTrackingSearches(options) {
    options = options || {};
    if (trackingCheckRuntime && trackingCheckRuntime.active) {
      showToast('正在检查更新…');
      return;
    }
    let list = await listTrackingSearches();
    if (options.recordIds && options.recordIds.length) {
      const set = new Set(options.recordIds.map(String));
      list = list.filter((r) => set.has(String(r.id)));
    }
    if (!list.length) {
      showToast('没有可检查的追更项');
      return;
    }

    trackingCheckRuntime = {
      active: true,
      completed: 0,
      total: list.length,
      note: '开始',
      cancelled: false,
      updates: 0,
      errors: 0,
    };
    updateTrackingCheckButton();
    setFooterSummary('检查更新 0/' + list.length);

    try {
      for (let i = 0; i < list.length; i++) {
        if (trackingCheckRuntime.cancelled) break;
        const rec = list[i];
        const title = getTrackingDisplayTitle(rec);
        trackingCheckRuntime.note = title.slice(0, 18);
        updateTrackingCheckButton();
        setFooterSummary(
          '检查 ' +
            (i + 1) +
            '/' +
            list.length +
            ' · ' +
            title.slice(0, 24)
        );
        try {
          await refreshSingleTrackingRecord(rec);
          if (
            typeof trackingHasPendingUpdate === 'function'
              ? trackingHasPendingUpdate(rec)
              : rec.has_update
          ) {
            trackingCheckRuntime.updates += 1;
          }
        } catch (err) {
          trackingCheckRuntime.errors += 1;
          try {
            rec.last_check_at = nowMs();
            rec.last_check_error = (err && err.message) || String(err);
            await saveTrackingRecord(rec);
          } catch (_) { /* ignore */ }
          const msg = (err && err.message) || String(err);
          if (/限流|429|封禁|Sad Panda|banned/i.test(msg)) {
            showToast('已暂停：' + msg);
            break;
          }
        }
        trackingCheckRuntime.completed = i + 1;
        updateTrackingCheckButton();
        updateFabBadge();
        // 轻量刷新列表状态（不整页重绑过多）
        if (document.getElementById('jlc-wb-list-scroll')) {
          await paintTrackingList();
        }
        if (i < list.length - 1 && !trackingCheckRuntime.cancelled) {
          const wait = pickTrackingCheckDelayMs();
          trackingCheckRuntime.note = '间隔 ' + Math.round(wait / 1000) + 's';
          updateTrackingCheckButton();
          setFooterSummary(
            '冷却 ' +
              Math.round(wait / 1000) +
              's · 已检 ' +
              trackingCheckRuntime.completed +
              '/' +
              list.length
          );
          await sleepMs(wait);
        }
      }
      const done = trackingCheckRuntime.completed;
      const total = trackingCheckRuntime.total;
      const errN = trackingCheckRuntime.errors;
      showToast(
        '检查完成 ' +
          done +
          '/' +
          total +
          (errN ? ' · 失败 ' + errN : '')
      );
    } finally {
      trackingCheckRuntime = null;
      updateTrackingCheckButton();
      await paintTrackingList();
      updateFabBadge();
    }
  }

  /** 对齐 JLC buildTrackingStatus：有估数时 leaf 显示 +N */
  function buildExhTrackingStatus(r) {
    if (!r) return { tone: 'gray', text: '未检查', note: '' };
    if (r.last_check_error) {
      return { tone: 'red', text: '检查失败', note: String(r.last_check_error).slice(0, 80) };
    }
    const top = compactText(r.top_gid || '');
    const bp = compactText(r.breakpoint_gid || '');
    const pill =
      typeof getTrackingUpdatePillText === 'function' ? getTrackingUpdatePillText(r) : '';
    const unreadN =
      typeof getTrackingUnreadEstimate === 'function' ? getTrackingUnreadEstimate(r) : 0;
    const unreadNote = unreadN
      ? r.unread_estimate_capped
        ? '约 ' + unreadN + '+ 条未读'
        : '约 ' + unreadN + ' 条未读'
      : '';
    // 最新 ≠ 断点作品 → 必有更新（用户贴的就是这种：不该显示「已检查」）
    if (top && bp && top !== bp) {
      const noteBits = [
        '最新 ' + (getTrackingTopMetaLabel(r) || '—'),
        '上次看到 ' + (getTrackingBpMetaLabel(r) || '—'),
      ];
      if (unreadNote) noteBits.push(unreadNote);
      return {
        tone: 'red',
        text: pill || '更新',
        note: noteBits.join(' · '),
      };
    }
    if (r.has_update) {
      return {
        tone: 'yellow',
        text: pill || '更新',
        note:
          (unreadNote ? unreadNote + ' · ' : '') +
          (getTrackingTopMetaLabel(r) || '列表顶部有变化'),
      };
    }
    if (top && bp && top === bp) {
      return { tone: 'green', text: '已追到', note: '断点已在最新' };
    }
    if (r.last_check_at) {
      const rel = formatCompactRelativeTime(r.last_check_at);
      return { tone: 'gray', text: '已检查', note: rel ? '检查于 ' + rel : '已检查' };
    }
    return {
      tone: 'gray',
      text: '未检查',
      note: r.last_browsed_at
        ? '上次浏览 ' + (formatCompactRelativeTime(r.last_browsed_at) || '')
        : '尚未浏览',
    };
  }

  /**
   * ExH 卡片：
   * 标题 + leaf(更新/…)
   * 胶囊行：[最新 YY-MM-DD HH:mm] [断点 YY-MM-DD HH:mm]
   * （发布时间改放胶囊，不再占 meta 长行；「当前/上次」去掉，当前页用卡片 is-current 描边）
   */
  function buildExhTrackingItemHtml(r, curSig) {
    const isCurrent = !!(curSig && r.query_signature === curSig);
    const title = getTrackingDisplayTitle(r);
    const status = buildExhTrackingStatus(r);
    const hasBp = trackingHasAnyBreakpoint(r);
    const hasWorkBp = trackingHasWorkBreakpoint(r);
    const bpPage = Number(r.breakpoint_page);
    const hasBpPage = Number.isFinite(bpPage) && bpPage >= 0 && (hasBp || hasWorkBp);
    const topGid = compactText(r.top_gid || '');
    const bpGid = compactText(r.breakpoint_gid || '');

    const topPosted = getTrackingTopMetaLabel(r);
    const bpPosted = getTrackingBpMetaLabel(r);

    const topHover =
      '最新 ' +
      (topPosted || '未知时间') +
      (r.top_title ? ' · ' + compactText(r.top_title) : topGid ? ' · g' + topGid : '');
    const bpHoverBits = [
      '上次看到 ' + (bpPosted || '未知时间'),
      r.breakpoint_title
        ? compactText(r.breakpoint_title)
        : bpGid
          ? 'g' + bpGid
          : '',
      hasBpPage ? '列表第' + (bpPage + 1) + '页' : '',
    ].filter(Boolean);
    const bpHover = bpHoverBits.join(' · ');
    const releaseAge = getTrackingReleaseAge(r);

    // 胶囊：最新 / 断点（替代原「当前 · 上次」行）
    const subPills = [];
    if (topGid || topPosted) {
      subPills.push(
        '<span class="jlc-site-pill is-top' +
          (releaseAge.stale ? ' is-stale' : '') +
          '" title="' +
          escapeHtml(topHover) +
          '">' +
          escapeHtml(
            '最新 ' +
              (topPosted || '—') +
              (releaseAge.text ? ' · ' + releaseAge.text : '')
          ) +
          '</span>'
      );
    }
    if (bpGid || bpPosted || hasWorkBp) {
      subPills.push(
        '<span class="jlc-site-pill is-bp' +
          (hasWorkBp ? ' is-last' : '') +
          '" title="' +
          escapeHtml(bpHover) +
          '">' +
          escapeHtml('上次看到 ' + (bpPosted || '—')) +
          '</span>'
      );
    }

    const leafTitle = status.note || status.text || '';
    const isFocus = !!(
      status.tone === 'red' ||
      status.tone === 'yellow' ||
      (typeof trackingHasPendingUpdate === 'function'
        ? trackingHasPendingUpdate(r)
        : r.has_update) ||
      isCurrent
    );

    return (
      '<div class="jlc-wb-item tone-' +
      escapeHtml(status.tone || 'gray') +
      (isFocus ? ' is-focus' : '') +
      (isCurrent ? ' is-current' : '') +
      '" data-trk="' +
      escapeHtml(r.id) +
      '" title="点击打开">' +
      '<div class="jlc-wb-item-row">' +
      buildTrackingCoverHtml(r) +
      '<div class="jlc-wb-item-body">' +
      '<div class="jlc-wb-item-title-row">' +
      '<div class="jlc-wb-item-title">' +
      escapeHtml(title) +
      '</div>' +
      '<span class="jlc-wb-leaf tone-' +
      escapeHtml(status.tone || 'gray') +
      '" title="' +
      escapeHtml(leafTitle) +
      '">' +
      escapeHtml(status.text) +
      '</span>' +
      '</div>' +
      (subPills.length
        ? '<div class="jlc-wb-item-pills">' + subPills.join('') + '</div>'
        : '<div class="jlc-wb-item-pills"></div>') +
      '</div>' +
      '<div class="jlc-wb-item-side">' +
      '<button type="button" class="jlc-wb-open-btn" data-tact="open" title="打开">Open</button>' +
      '<button type="button" class="jlc-wb-more-btn" data-tact="menu" title="更多">···</button>' +
      '<div class="jlc-wb-item-menu" data-menu="' +
      escapeHtml(r.id) +
      '" hidden>' +
      '<button type="button" data-tact="open-same">本页打开</button>' +
      '<button type="button" data-tact="check">检查更新</button>' +
      '<button type="button" data-tact="rename">改名</button>' +
      '<button type="button" data-tact="folder">设分类</button>' +
      (hasBp ? '<button type="button" data-tact="bp">继续断点</button>' : '') +
      '<button type="button" data-tact="clear-bp">清除断点</button>' +
      '<button type="button" class="is-danger" data-tact="del">删除</button>' +
      '</div>' +
      '</div></div></div>'
    );
  }

  async function paintTrackingList() {
    cancelScheduledTrackingListPaint();
    const paintId = ++trackingListPaintId;
    const host = document.getElementById('jlc-wb-list-scroll');
    if (!host) return;
    const q = compactText(wbSession.trackingQuery || '').toLowerCase();
    const gf = wbSession.trackingGroup || 'all';
    const isCurrentPaint = () =>
      paintId === trackingListPaintId &&
      host.isConnected &&
      document.getElementById('jlc-wb-list-scroll') === host;
    let list = await listTrackingSearches();
    if (!isCurrentPaint()) return;
    if (gf === 'none') {
      list = list.filter((r) => !compactText(r.custom_folder || ''));
    } else if (gf.indexOf('uf:') === 0) {
      const want = gf.slice(3);
      list = list.filter((r) => compactText(r.custom_folder || '').toLowerCase() === want);
    } else if (gf !== 'all') {
      // 兼容旧筛选：不再按自动类型拆，忽略
    }
    if (q) {
      list = list.filter(
        (r) =>
          getTrackingDisplayTitle(r).toLowerCase().includes(q) ||
          (r.f_search || '').toLowerCase().includes(q) ||
          compactText(r.custom_folder || '')
            .toLowerCase()
            .includes(q)
      );
    }

    const ctx = parseExhPageContext(location.href);
    const curSig = ctx && ctx.trackable ? ctx.query_signature : '';

    // 旧记录可能没有发布时间：DOM / editions / gdata 批量回填
    try {
      await enrichTrackingListPosted(list, { shouldContinue: isCurrentPaint });
    } catch (_) { /* ignore */ }
    if (!isCurrentPaint()) return;

    if (!(trackingCheckRuntime && trackingCheckRuntime.active)) {
      const pending = list.filter((r) =>
        typeof trackingHasPendingUpdate === 'function' ? trackingHasPendingUpdate(r) : !!r.has_update
      );
      const unreadSum = pending.reduce((s, r) => {
        const n =
          typeof getTrackingUnreadEstimate === 'function' ? getTrackingUnreadEstimate(r) : 0;
        return s + n;
      }, 0);
      setFooterSummary(
        (list.length ? list.length + ' 个追更' : '还没有追更') +
          (pending.length ? ' · ' + pending.length + ' 更新' : '') +
          (unreadSum ? ' · 约 +' + unreadSum : '') +
          (ctx && ctx.trackable ? ' · 可收藏当前' : '')
      );
    }
    updateTrackingCheckButton();

    if (!list.length) {
      host.innerHTML =
        '<div class="jlc-wb-empty">' +
        (ctx && ctx.trackable
          ? '没有匹配的追更项。可点顶部条「⭐ 收藏」或底部「⭐ 收藏当前」。'
          : '还没有追更项。请先打开标签/搜索/社团页，再点「⭐ 收藏」。') +
        '</div>';
      return;
    }

    // 分组：仅手动分类；无分类 →「未分类」
    const groups = {};
    list.forEach((r) => {
      const g = getTrackingListGroupKey(r);
      if (!groups[g]) groups[g] = [];
      groups[g].push(r);
    });
    const groupKeys = Object.keys(groups).sort((a, b) => {
      // 未分类置顶，便于先处理再「设分类」
      if (a === 'none' && b !== 'none') return -1;
      if (b === 'none' && a !== 'none') return 1;
      const la = getTrackingListGroupLabel(a, groups[a][0]);
      const lb = getTrackingListGroupLabel(b, groups[b][0]);
      return la.localeCompare(lb, 'zh');
    });

    if (!wbSession.collapsedGroups || typeof wbSession.collapsedGroups !== 'object') {
      wbSession.collapsedGroups = {};
    }
    const collapsedMap = wbSession.collapsedGroups;

    const chunks = [];
    groupKeys.forEach((g) => {
      const rows = groups[g];
      if (!rows || !rows.length) return;
      const updates = rows.filter((r) =>
        typeof trackingHasPendingUpdate === 'function' ? trackingHasPendingUpdate(r) : !!r.has_update
      );
      const unreadSum = updates.reduce((s, r) => {
        const n =
          typeof getTrackingUnreadEstimate === 'function' ? getTrackingUnreadEstimate(r) : 0;
        return s + n;
      }, 0);
      const gLabel = getTrackingListGroupLabel(g, rows[0]);
      const collapsed = !!collapsedMap[g];
      const updateLabel = updates.length
        ? '（' +
          updates.length +
          ' 更新' +
          (unreadSum ? ' · +' + unreadSum + (updates.some((r) => r.unread_estimate_capped) ? '+' : '') : '') +
          '）'
        : '';
      chunks.push(
        '<section class="jlc-wb-group' +
          (collapsed ? ' collapsed' : '') +
          '" data-jlc-group="' +
          escapeHtml(g) +
          '">' +
          '<button type="button" class="jlc-wb-group-toggle" data-jlc-toggle-group="' +
          escapeHtml(g) +
          '"><span>' +
          escapeHtml(gLabel) +
          escapeHtml(updateLabel) +
          '</span><small>' +
          rows.length +
          ' 项</small></button>' +
          '<div class="jlc-wb-group-body">'
      );
      rows.forEach((r) => {
        chunks.push(buildExhTrackingItemHtml(r, curSig));
      });
      chunks.push('</div></section>');
    });

    host.innerHTML = chunks.join('');
    // 点列表外关掉 fixed 菜单
    if (!host.dataset.excMenuDocBound) {
      host.dataset.excMenuDocBound = '1';
      document.addEventListener(
        'click',
        (ev) => {
          if (ev.target.closest && ev.target.closest('#jlc-wb .jlc-wb-item-menu, #jlc-wb .jlc-wb-more-btn')) {
            return;
          }
          const sc = document.getElementById('jlc-wb-list-scroll');
          if (!sc) return;
          sc.querySelectorAll('.jlc-wb-item-menu').forEach((m) => {
            m.hidden = true;
            m.classList.remove('is-fixed-menu', 'is-up');
            m.style.cssText = '';
          });
          sc.querySelectorAll('.jlc-wb-more-btn.is-open').forEach((b) => b.classList.remove('is-open'));
          sc.querySelectorAll('.jlc-wb-item.is-menu-open').forEach((c) => c.classList.remove('is-menu-open'));
        },
        true
      );
    }
    host.onclick = async (e) => {
      // 分组折叠/展开
      const toggle = e.target.closest('[data-jlc-toggle-group]');
      if (toggle) {
        e.preventDefault();
        e.stopPropagation();
        const gk = toggle.getAttribute('data-jlc-toggle-group') || '';
        const section = toggle.closest('.jlc-wb-group');
        if (!gk || !section) return;
        wbSession = wbSession || loadSession();
        if (!wbSession.collapsedGroups || typeof wbSession.collapsedGroups !== 'object') {
          wbSession.collapsedGroups = {};
        }
        const next = !section.classList.contains('collapsed');
        section.classList.toggle('collapsed', next);
        if (next) wbSession.collapsedGroups[gk] = true;
        else delete wbSession.collapsedGroups[gk];
        saveSession(wbSession);
        return;
      }

      const menuBtn = e.target.closest('[data-tact="menu"]');
      const tactBtn = e.target.closest('[data-tact]');
      const item = e.target.closest('[data-trk]');
      if (!item) return;
      const id = item.getAttribute('data-trk');
      const list2 = await listTrackingSearches();
      const rec = list2.find((r) => r.id === id);
      if (!rec) return;

      if (menuBtn) {
        e.preventDefault();
        e.stopPropagation();
        const menu = item.querySelector('.jlc-wb-item-menu');
        const moreBtn = item.querySelector('.jlc-wb-more-btn');
        const willOpen = !!(menu && menu.hidden);
        // 关掉其它菜单并清掉 fixed 定位
        host.querySelectorAll('.jlc-wb-item-menu').forEach((m) => {
          m.hidden = true;
          m.classList.remove('is-up', 'is-fixed-menu');
          m.style.cssText = '';
        });
        host.querySelectorAll('.jlc-wb-more-btn.is-open').forEach((b) => b.classList.remove('is-open'));
        host.querySelectorAll('.jlc-wb-item.is-menu-open').forEach((c) => c.classList.remove('is-menu-open'));
        if (menu && willOpen) {
          menu.hidden = false;
          if (moreBtn) moreBtn.classList.add('is-open');
          item.classList.add('is-menu-open');
          // fixed 挂到视口：避免列表 overflow 裁切 / 上翻被组头挡住
          const anchor = moreBtn || menuBtn;
          const r = anchor.getBoundingClientRect();
          menu.classList.add('is-fixed-menu');
          menu.style.position = 'fixed';
          menu.style.zIndex = '1000200';
          menu.style.left = 'auto';
          menu.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
          menu.style.top = r.bottom + 4 + 'px';
          menu.style.bottom = 'auto';
          requestAnimationFrame(() => {
            const mr = menu.getBoundingClientRect();
            if (mr.bottom > window.innerHeight - 8) {
              // 下方不够：贴按钮上方，仍用 fixed，不会被列表裁
              menu.style.top = 'auto';
              menu.style.bottom = Math.max(8, window.innerHeight - r.top + 4) + 'px';
            }
            if (mr.right > window.innerWidth - 4) {
              menu.style.right = '8px';
            }
          });
        }
        return;
      }

      if (!tactBtn) {
        // 点卡片空白：按默认方式打开，并收起工作台
        await openTrackingRecordFromWorkbench(rec, 'default');
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const act = tactBtn.getAttribute('data-tact');
      if (act === 'open') {
        await openTrackingRecordFromWorkbench(rec, 'default');
      } else if (act === 'open-same') {
        await openTrackingRecordFromWorkbench(rec, 'same');
      } else if (act === 'check') {
        if (trackingCheckRuntime && trackingCheckRuntime.active) {
          showToast('正在批量检查中…');
          return;
        }
        showToast('检查中…');
        try {
          await refreshSingleTrackingRecord(rec);
          {
            const pending =
              typeof trackingHasPendingUpdate === 'function'
                ? trackingHasPendingUpdate(rec)
                : !!rec.has_update;
            const pill =
              typeof getTrackingUpdatePillText === 'function' ? getTrackingUpdatePillText(rec) : '';
            showToast(
              pending
                ? '有更新' + (pill && pill !== '更新' ? ' ' + pill : '') + '：' + getTrackingDisplayTitle(rec)
                : '无新顶栏'
            );
          }
        } catch (err) {
          showToast('检查失败: ' + ((err && err.message) || err));
        }
        paintTrackingList();
        updateFabBadge();
      } else if (act === 'bp') {
        wbSession = wbSession || loadSession();
        wbSession.open = false;
        saveSession(wbSession);
        try {
          toggleWorkbench(false);
        } catch (_) { /* ignore */ }
        await openTrackingBreakpoint(rec);
      } else if (act === 'clear-bp') {
        rec.breakpoint_page = '';
        rec.breakpoint_url = '';
        rec.breakpoint_at = 0;
        rec.breakpoint_gid = '';
        rec.breakpoint_token = '';
        rec.breakpoint_title = '';
        rec.breakpoint_posted_at = 0;
        await saveTrackingRecord(rec);
        showToast('已清除断点');
        paintTrackingList();
      } else if (act === 'rename') {
        const next = prompt('追更显示名', getTrackingDisplayTitle(rec));
        if (next == null) return;
        rec.custom_label = compactText(next);
        await saveTrackingRecord(rec);
        paintTrackingList();
      } else if (act === 'folder') {
        await openTrackingFolderDialog(rec, { reason: 'edit' });
      } else if (act === 'del') {
        if (!confirm('删除追更「' + getTrackingDisplayTitle(rec) + '」？')) return;
        await deleteTrackingRecord(id);
        paintTrackingList();
        updateFabBadge();
      }
    };
  }
