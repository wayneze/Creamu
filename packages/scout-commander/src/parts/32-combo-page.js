// @@creamu-part:32-combo-page
function getComboTokens() {
  const v = GM_getValue('scout_combo_tokens', null);
  if (Array.isArray(v)) return v.map(s => compactText(s)).filter(Boolean);
  return [];
}
function saveComboTokens(list) {
  GM_setValue('scout_combo_tokens', list || []);
}
function addComboToken(text) {
  const t = compactText(text);
  if (!t) return getComboTokens();
  const list = getComboTokens();
  if (list.some(x => x.toLowerCase() === t.toLowerCase())) return list;
  list.push(t);
  saveComboTokens(list);
  return list;
}
function removeComboToken(text) {
  const t = compactText(text).toLowerCase();
  const list = getComboTokens().filter(x => x.toLowerCase() !== t);
  saveComboTokens(list);
  return list;
}

function renderComboPage() {
  const container = document.querySelector('[data-jlc-wb-page="combo"]');
  if (!container) return;

  const terms = getLexiconTerms().filter(t => t.status !== 'retired');
  const types = getLexiconTypes();
  let tokens = getComboTokens();
  let filterType = container.getAttribute('data-combo-filter') || '全部';

  const meta = scrapeVideoMeta();
  const currentSite = detectSite();
  const activeSite = currentSite || 'xvideos';

  // 已选 chips
  let selectedHtml = tokens.length
    ? tokens.map(t => `
        <span class="jlc-wb-chip is-on" data-combo-token="${escapeHtml(t)}" style="margin:2px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" title="点击移除">
          ${escapeHtml(t)} <b style="opacity:.8;">×</b>
        </span>`).join('')
    : '<span style="font-size:12.5px;color:#9a7d60;">点下方词库添加，或手动输入多个词组合搜索</span>';

  // 分类筛选
  const typeFilters = ['全部', ...types];
  let filterHtml = typeFilters.map(ty => {
    const on = filterType === ty ? 'is-on' : '';
    return `<span class="jlc-wb-chip ${on}" data-combo-filter="${escapeHtml(ty)}" style="margin:2px;cursor:pointer;font-size:12px;">${escapeHtml(ty)}</span>`;
  }).join('');

  // 词库快捷（未选中的）
  let pool = terms.slice();
  if (filterType !== '全部') pool = pool.filter(t => t.type === filterType);
  pool.sort((a, b) => {
    if (!!b.loved !== !!a.loved) return b.loved ? 1 : -1;
    return getEffectiveHeat(b) - getEffectiveHeat(a);
  });
  const selectedLower = new Set(tokens.map(t => t.toLowerCase()));
  pool = pool.filter(t => !selectedLower.has(t.text.toLowerCase())).slice(0, 80);

  let poolHtml = pool.length
    ? pool.map(t => {
        const zh = t.zh ? ` · ${t.zh}` : '';
        const heart = t.loved ? '❤️' : '';
        return `<span class="jlc-wb-chip" data-combo-pick="${escapeHtml(t.text)}" style="margin:2px;cursor:pointer;font-size:12px;" title="${escapeHtml(t.type)}">
          ${heart}${escapeHtml(t.text)}${escapeHtml(zh)}
        </span>`;
      }).join('')
    : '<span style="font-size:12px;color:#9a7d60;">该分类暂无更多词，可手动输入</span>';

  // 当前视频标签
  let currentVideoTagsHtml = '';
  if (meta && meta.tags && meta.tags.length > 0) {
    const tagPills = meta.tags.map(tag => `
      <span class="jlc-wb-chip" style="margin:2px;display:inline-flex;align-items:center;gap:4px;padding:4px 8px;font-size:12px;" data-tag="${escapeHtml(tag)}">
        ${escapeHtml(tag)}
        <b class="scout-combo-pick-tag" style="color:#2f6b3a;cursor:pointer;" title="加入组合">＋</b>
        <b class="scout-add-quick" style="color:#2f6b3a;cursor:pointer;">库</b>
        <b class="scout-block-quick" style="color:#b42318;cursor:pointer;">✕</b>
      </span>`).join('');
    currentVideoTagsHtml = `
      <div class="jlc-wb-view-block" style="margin-top:14px;">
        <div class="jlc-wb-view-title">当前视频标签</div>
        <div style="display:flex;flex-wrap:wrap;max-height:120px;overflow:auto;">${tagPills}</div>
        <div style="font-size:11px;color:#9a7d60;margin-top:4px;">＋加入组合 · 库入库 · ✕屏蔽</div>
      </div>`;
  }

  const sites = [
    { key: 'xvideos', name: 'XV', full: 'XVideos' },
    { key: 'xnxx', name: 'XN', full: 'XNXX' },
    { key: 'eporner', name: 'EP', full: 'EPorner' }
  ];
  const siteRadioHtml = sites.map(s => `
    <label class="scout-combo-site" title="${escapeHtml(s.full)}" style="display:inline-flex;align-items:center;gap:3px;margin:0;padding:2px 6px;border-radius:999px;border:1px solid #e4d4bc;font-size:11.5px;cursor:pointer;text-transform:none;letter-spacing:0;">
      <input type="radio" name="scout-search-site" value="${s.key}" ${s.key === activeSite ? 'checked' : ''} style="width:13px;height:13px;margin:0;accent-color:var(--scout-theme-color);">
      ${s.name}
    </label>`).join('');

  const searchCtx = parseSearchContext();
  const canSavePageSearch = detectPageKind() === 'search' && !!(searchCtx && searchCtx.query);
  const saveSearchTitle = canSavePageSearch
    ? `收藏当前页搜索：${searchCtx.query}`
    : '收藏当前组合为追更（不打开页面）';

  const joinMode = typeof getComboJoinMode === 'function' ? getComboJoinMode() : 'and';
  const preview = (typeof joinComboQuery === 'function'
    ? joinComboQuery(tokens, joinMode)
    : tokens.join(' and ')) || '（尚未选词）';

  const joinOpts = [
    { key: 'and', label: 'AND', tip: 'word1 and word2（推荐，结果更稳）' },
    { key: 'space', label: '空格', tip: 'word1 word2（部分站会空结果）' },
    { key: 'or', label: 'OR', tip: 'word1 or word2' }
  ];
  const joinHtml = joinOpts.map(o => `
    <label style="display:inline-flex;align-items:center;margin-right:10px;font-size:12.5px;cursor:pointer;text-transform:none;letter-spacing:0;margin-top:0;" title="${escapeHtml(o.tip)}">
      <input type="radio" name="scout-combo-join" value="${o.key}" ${joinMode === o.key ? 'checked' : ''} style="width:15px;height:15px;margin-right:4px;accent-color:var(--scout-theme-color);">
      ${o.label}
    </label>`).join('');

  container.innerHTML = `
    <div class="jlc-wb-list-scroll" style="padding-bottom:12px;">
      <div class="jlc-wb-view-block">
        <div class="jlc-wb-view-title">已选词（可多个，顺序=搜索顺序）</div>
        <div id="scout-combo-selected" style="display:flex;flex-wrap:wrap;min-height:32px;margin-bottom:8px;">${selectedHtml}</div>
        <div style="margin-bottom:8px;">
          <span style="font-size:12px;color:#9a7d60;margin-right:6px;">连接方式</span>
          ${joinHtml}
        </div>
        <div style="font-size:12px;color:#9a7d60;margin-bottom:10px;word-break:break-word;">预览：<b style="color:var(--scout-theme-color);">${escapeHtml(preview)}</b></div>
        <div style="font-size:11.5px;color:#9a7d60;margin-bottom:10px;line-height:1.4;">
          提示：多站用空格拼词常无结果，用 <b>AND</b> 更稳。多词短语请整段添加为一个 token。
        </div>
        <div style="display:flex;gap:6px;">
          <input type="text" class="jlc-wb-search" id="scout-combo-free-input" placeholder="手动加词，回车或点添加" style="flex:1;padding:8px 12px;font-size:13.5px;">
          <button class="jlc-wb-btn primary" id="scout-combo-add-btn" style="padding:8px 14px;">添加</button>
        </div>
      </div>

      <div class="jlc-wb-view-block">
        <div class="jlc-wb-view-title">从词库点选</div>
        <div style="display:flex;flex-wrap:wrap;margin-bottom:8px;">${filterHtml}</div>
        <div id="scout-combo-pool" style="display:flex;flex-wrap:wrap;max-height:160px;overflow:auto;">${poolHtml}</div>
      </div>

      ${currentVideoTagsHtml}
    </div>
    <div class="jlc-wb-footer scout-combo-dock" id="scout-combo-dock">
      <div class="scout-combo-dock-inner">
        <div class="scout-combo-dock-sites" role="group" aria-label="搜索引擎">${siteRadioHtml}</div>
        <label class="scout-combo-dock-track" title="搜索时自动加入追更">
          <input type="checkbox" id="scout-combo-auto-track" ${GM_getValue('scout_combo_auto_track', true) ? 'checked' : ''}>
          <span>追更</span>
        </label>
        <div class="scout-combo-dock-actions">
          <button type="button" class="jlc-wb-btn primary" id="scout-combo-search-btn">🔍 搜索</button>
          <button type="button" class="jlc-wb-btn ghost" id="scout-save-current-search-btn" title="${escapeHtml(saveSearchTitle)}">⭐ 收藏</button>
          <button type="button" class="jlc-wb-btn ghost" id="scout-combo-clear-btn" title="清空已选词">清空</button>
        </div>
      </div>
    </div>
  `;

  const refresh = () => renderComboPage();

  container.querySelectorAll('[data-combo-token]').forEach(el => {
    el.addEventListener('click', () => {
      removeComboToken(el.getAttribute('data-combo-token'));
      refresh();
    });
  });

  container.querySelectorAll('[data-combo-filter]').forEach(el => {
    el.addEventListener('click', () => {
      container.setAttribute('data-combo-filter', el.getAttribute('data-combo-filter') || '全部');
      refresh();
    });
  });

  container.querySelectorAll('[data-combo-pick]').forEach(el => {
    el.addEventListener('click', () => {
      addComboToken(el.getAttribute('data-combo-pick'));
      refresh();
    });
  });

  const freeInp = container.querySelector('#scout-combo-free-input');
  const doAddFree = () => {
    const v = freeInp.value.trim();
    if (!v) return;
    // 逗号批量；否则整段算一个 token（可含空格短语）
    if (/[,，;；]/.test(v)) {
      v.split(/[,，;；]+/).forEach(part => {
        if (part.trim()) addComboToken(part.trim());
      });
    } else {
      addComboToken(v);
    }
    freeInp.value = '';
    refresh();
  };
  container.querySelector('#scout-combo-add-btn')?.addEventListener('click', doAddFree);
  freeInp?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doAddFree();
    }
  });

  container.querySelectorAll('input[name="scout-combo-join"]').forEach((r) => {
    r.addEventListener('change', () => {
      if (!r.checked) return;
      const cur = getConfig();
      cur.combo_join = r.value || 'and';
      saveConfig(cur);
      refresh();
    });
  });

  container.querySelector('#scout-combo-auto-track')?.addEventListener('change', (e) => {
    GM_setValue('scout_combo_auto_track', !!e.currentTarget.checked);
  });

  container.querySelector('#scout-combo-search-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    tokens = getComboTokens();
    if (!tokens.length) {
      showToast('请至少添加一个词（可多选人物再加行为/场景）', true);
      return;
    }
    const allTerms = getLexiconTerms();
    tokens.forEach(w => {
      const t = allTerms.find(item => item.text.toLowerCase() === w.toLowerCase());
      if (t) incrementTermHeat(t.id, 'use');
    });
    const mode = container.querySelector('input[name="scout-combo-join"]:checked')?.value
      || (typeof getComboJoinMode === 'function' ? getComboJoinMode() : 'and');
    const query = typeof joinComboQuery === 'function'
      ? joinComboQuery(tokens, mode)
      : tokens.join(' and ');
    const site = container.querySelector('input[name="scout-search-site"]:checked')?.value || 'xvideos';
    const url = buildSearchUrl(site, query);
    if (!url) {
      showToast('无法生成搜索链接', true);
      return;
    }
    const autoTrack = container.querySelector('#scout-combo-auto-track')?.checked !== false;
    if (autoTrack) {
      addTrack({
        site,
        query,
        label: query,
        url
      });
      if (typeof setupSearchClickTracking === 'function') setupSearchClickTracking();
    }
    openScoutUrl(url, { newTab: true });
    showToast(autoTrack ? '已打开搜索并加入追更：' + query : '已打开搜索：' + query);
  });

  container.querySelector('#scout-combo-clear-btn')?.addEventListener('click', () => {
    saveComboTokens([]);
    refresh();
  });

  container.querySelector('#scout-save-current-search-btn')?.addEventListener('click', () => {
    // 在搜索页：收藏当前页查询；否则收藏当前组合预览
    let site = detectSite() || container.querySelector('input[name="scout-search-site"]:checked')?.value || 'xvideos';
    let query = '';
    let url = '';
    if (canSavePageSearch) {
      query = searchCtx.query;
      url = searchCtx.url || location.href;
      site = detectSite() || site;
    } else {
      tokens = getComboTokens();
      if (!tokens.length) {
        showToast('请先选词，或打开一个搜索页再收藏', true);
        return;
      }
      const mode = container.querySelector('input[name="scout-combo-join"]:checked')?.value
        || (typeof getComboJoinMode === 'function' ? getComboJoinMode() : 'and');
      query = typeof joinComboQuery === 'function'
        ? joinComboQuery(tokens, mode)
        : tokens.join(' and ');
      site = container.querySelector('input[name="scout-search-site"]:checked')?.value || site;
      url = buildSearchUrl(site, query);
    }
    const label = prompt('请输入此收藏搜索的标签别名：', query);
    if (label === null) return;
    addTrack({ site, query, label: label.trim() || query, url });
    if (typeof setupSearchClickTracking === 'function') setupSearchClickTracking();
    if (typeof checkSearchTrackingBreakpoints === 'function') checkSearchTrackingBreakpoints();
    showToast('已收藏追更：之后在该搜索点片会记断点');
    refresh();
  });

  container.querySelectorAll('[data-tag]').forEach(chip => {
    const tag = chip.getAttribute('data-tag');
    chip.querySelector('.scout-combo-pick-tag')?.addEventListener('click', (e) => {
      e.stopPropagation();
      addComboToken(tag);
      refresh();
    });
    chip.querySelector('.scout-add-quick')?.addEventListener('click', (e) => {
      e.stopPropagation();
      showScoutCollectDialog({
        text: tag,
        sources: [{ site: currentSite, url: location.href, title: meta && meta.title, at: new Date().toISOString() }],
        onSaved() { refresh(); enhancePageTags(); }
      });
    });
    chip.querySelector('.scout-block-quick')?.addEventListener('click', (e) => {
      e.stopPropagation();
      addBlockWord({ text: tag, mode: 'dim', match: 'word', scope: 'title', reason: '从当前视频标签快速屏蔽' });
      showToast('已屏蔽: ' + tag, true);
      applyListBlocks();
      refresh();
    });
  });
}

// 
