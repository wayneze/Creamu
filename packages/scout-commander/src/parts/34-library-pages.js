// @@creamu-part:34-library-pages
function renderLexiconPage() {
  const container = document.querySelector('[data-jlc-wb-page="lexicon"]');
  if (!container) return;

  const terms = getLexiconTerms();
  const types = getLexiconTypes();

  let curType = container.getAttribute('data-selected-type') || '全部';
  let searchQuery = (container.querySelector('#scout-lexicon-search') ? container.querySelector('#scout-lexicon-search').value : '') || '';

  let typeChipsHtml = `<span class="jlc-wb-chip scout-wb-chip ${curType === '全部' ? 'is-on' : ''}" data-type="全部">全部 (${terms.filter(t => t.status !== 'retired').length})</span>`;
  types.forEach(t => {
    const count = terms.filter(item => item.type === t && item.status !== 'retired').length;
    typeChipsHtml += `<span class="jlc-wb-chip scout-wb-chip ${curType === t ? 'is-on' : ''}" data-type="${escapeHtml(t)}">${escapeHtml(t)} (${count})</span>`;
  });
  const retiredCount = terms.filter(t => t.status === 'retired').length;
  typeChipsHtml += `<span class="jlc-wb-chip scout-wb-chip is-retired ${curType === '已废弃' ? 'is-on' : ''}" data-type="已废弃">已废弃 (${retiredCount})</span>`;

  let filtered = terms;
  if (curType === '全部') {
    filtered = terms.filter(t => t.status !== 'retired');
  } else if (curType === '已废弃') {
    filtered = terms.filter(t => t.status === 'retired');
  } else {
    filtered = terms.filter(t => t.type === curType && t.status !== 'retired');
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(t => t.text.toLowerCase().includes(q) || (t.zh && t.zh.toLowerCase().includes(q)));
  }

  filtered.sort((a, b) => {
    const diff = getEffectiveHeat(b) - getEffectiveHeat(a);
    if (diff !== 0) return diff;
    return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
  });

  let itemsHtml = '';
  if (filtered.length === 0) {
    itemsHtml = '<div class="jlc-wb-empty">该分类下没有词，快去采集或者在下方新增一个吧～</div>';
  } else {
    filtered.forEach(t => {
      const zhText = t.zh ? ` · ${t.zh}` : ' · <span class="scout-lexicon-missing">暂无翻译</span>';
      const statusPill = t.status === 'confirmed' ? '<span class="jlc-status-pill tone-green scout-lexicon-confirmed">已确认</span>' : '';
      const loveHeart = t.loved ? '<span class="scout-lexicon-loved" title="心动标签">❤️</span>' : '';
      
      let typeOpts = '';
      types.forEach(ty => {
        typeOpts += `<option value="${escapeHtml(ty)}" ${t.type === ty ? 'selected' : ''}>${escapeHtml(ty)}</option>`;
      });

      itemsHtml += `
        <div class="jlc-wb-item" data-id="${t.id}">
          <div class="jlc-wb-item-row">
            <div class="jlc-wb-item-body">
              <div class="jlc-wb-item-title-row">
                <span class="jlc-wb-item-title">${loveHeart}${escapeHtml(t.text)}${zhText}${statusPill}</span>
                <span class="jlc-wb-leaf tone-yellow" title="原始热度: ${t.heat}">🔥 ${getEffectiveHeat(t).toFixed(1)}</span>
              </div>
              <div class="jlc-wb-item-meta-line scout-lexicon-meta">
                分类: ${escapeHtml(t.type)} | 使用: ${t.use} | 赞/踩: ${t.good}/${t.bad}
              </div>
            </div>
            <div class="jlc-wb-item-side">
              <button class="jlc-wb-more-btn">•••</button>
            </div>
          </div>

          <div class="jlc-wb-item-edit" id="edit-${t.id}">
            <div class="scout-lexicon-edit">
              <div class="scout-lexicon-edit-row">
                <span class="scout-lexicon-edit-label">翻译:</span>
                <input type="text" value="${escapeHtml(t.zh || '')}" placeholder="中文含义" class="scout-edit-zh scout-lexicon-edit-input">
              </div>
              <div class="scout-lexicon-edit-row">
                <span class="scout-lexicon-edit-label">类型:</span>
                <select class="jlc-wb-select scout-edit-type scout-lexicon-edit-select">
                  ${typeOpts}
                </select>
              </div>
              <div class="scout-lexicon-edit-row">
                <span class="scout-lexicon-edit-label">心动:</span>
                <label class="scout-lexicon-loved-toggle">
                  <input type="checkbox" class="scout-edit-loved scout-lexicon-loved-checkbox" ${t.loved ? 'checked' : ''}> 标记为心动标签
                </label>
              </div>
              <div class="scout-lexicon-edit-row">
                <span class="scout-lexicon-edit-label">备注:</span>
                <input type="text" value="${escapeHtml(t.note || '')}" placeholder="来源/其他备注" class="scout-edit-note scout-lexicon-edit-input">
              </div>
              <div class="scout-lexicon-edit-actions">
                <div class="scout-wb-button-group">
                  <button class="jlc-wb-btn primary scout-save-btn scout-wb-btn-compact">保存</button>
                  <button class="jlc-wb-btn ghost scout-cancel-btn scout-wb-btn-compact">取消</button>
                </div>
                <div class="scout-wb-button-group">
                  <button class="jlc-wb-btn primary scout-good-btn scout-wb-btn-compact scout-lexicon-good" title="很好用，热度+3">👍 赞</button>
                  <button class="jlc-wb-btn ghost scout-bad-btn scout-wb-btn-compact scout-lexicon-bad" title="不好用，热度-2">👎 踩</button>
                  <button class="jlc-wb-btn danger scout-retire-btn scout-wb-btn-compact">🗑️ 废弃</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    });
  }

  container.innerHTML = `
    <div class="jlc-wb-toolbar scout-lexicon-toolbar">
      <div class="jlc-wb-toolbar-row">
        <input type="text" class="jlc-wb-search scout-lexicon-search" id="scout-lexicon-search" placeholder="在词库中搜索..." value="${escapeHtml(searchQuery)}">
      </div>
      <div class="scout-lexicon-types">
        ${typeChipsHtml}
      </div>
    </div>

    <div class="jlc-wb-list-scroll">
      ${itemsHtml}
    </div>

    <div class="jlc-wb-footer scout-lexicon-footer">
      <div class="scout-wb-add-form">
        <input type="text" class="jlc-wb-search scout-wb-add-primary" id="scout-add-term-text" placeholder="英文词...">
        <input type="text" class="jlc-wb-search scout-wb-add-secondary" id="scout-add-term-zh" placeholder="中文翻译...">
        <button class="jlc-wb-btn primary scout-wb-add-submit" id="scout-add-term-btn">添加</button>
      </div>
    </div>
  `;

  container.querySelectorAll('.jlc-wb-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const type = chip.getAttribute('data-type');
      container.setAttribute('data-selected-type', type);
      renderLexiconPage();
    });
  });

  const searchInp = container.querySelector('#scout-lexicon-search');
  searchInp.addEventListener('input', () => {
    const val = searchInp.value;
    const selectionStart = searchInp.selectionStart;
    const selectionEnd = searchInp.selectionEnd;
    renderLexiconPage();
    const newSearchInp = container.querySelector('#scout-lexicon-search');
    newSearchInp.focus();
    newSearchInp.setSelectionRange(selectionStart, selectionEnd);
  });

  container.querySelector('#scout-add-term-btn').addEventListener('click', () => {
    const textVal = container.querySelector('#scout-add-term-text').value.trim();
    const zhVal = container.querySelector('#scout-add-term-zh').value.trim();
    if (!textVal) {
      showToast('请输入英文词', true);
      return;
    }
    const added = addLexiconTerm({
      text: textVal,
      zh: zhVal,
      type: '未分类'
    });
    if (added) {
      showToast(`词库已添加: ${textVal}`);
      renderLexiconPage();
    }
  });

  container.querySelectorAll('.jlc-wb-item').forEach(itemEl => {
    const id = itemEl.getAttribute('data-id');
    const editArea = itemEl.querySelector('.jlc-wb-item-edit');
    const moreBtn = itemEl.querySelector('.jlc-wb-more-btn');

    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = editArea.classList.contains('is-open');
      container.querySelectorAll('.jlc-wb-item-edit').forEach(el => el.classList.remove('is-open'));
      if (!isOpen) {
        editArea.classList.add('is-open');
      }
    });

    editArea.addEventListener('click', (e) => e.stopPropagation());

    editArea.querySelector('.scout-save-btn').addEventListener('click', () => {
      const zh = editArea.querySelector('.scout-edit-zh').value.trim();
      const type = editArea.querySelector('.scout-edit-type').value;
      const note = editArea.querySelector('.scout-edit-note').value.trim();
      const loved = editArea.querySelector('.scout-edit-loved').checked;
      updateLexiconTerm(id, { zh, type, note, loved, status: 'confirmed' });
      showToast('词库已保存并确认');
      renderLexiconPage();
    });

    editArea.querySelector('.scout-cancel-btn').addEventListener('click', () => {
      editArea.classList.remove('is-open');
    });

    editArea.querySelector('.scout-good-btn').addEventListener('click', () => {
      incrementTermHeat(id, 'good');
      showToast('已标记赞 (热度上升)');
      renderLexiconPage();
    });

    editArea.querySelector('.scout-bad-btn').addEventListener('click', () => {
      incrementTermHeat(id, 'bad');
      showToast('已标记踩 (热度下降)', true);
      renderLexiconPage();
    });

    editArea.querySelector('.scout-retire-btn').addEventListener('click', () => {
      updateLexiconTerm(id, { status: 'retired' });
      showToast('已移入废弃桶');
      renderLexiconPage();
    });
  });
  markScoutWorkbenchPageRendered('lexicon');
}

// 
function renderPublishersPage() {
  const container = document.querySelector('[data-jlc-wb-page="publishers"]');
  if (!container) return;

  const list = getPublishers();
  let listHtml = '';

  if (list.length === 0) {
    listHtml = '<div class="jlc-wb-empty">暂无关注或拉黑的频道。可在视频播放页的上传者名字旁一键管理。</div>';
  } else {
    list.sort((a,b) => {
      if (a.status === b.status) return a.name.localeCompare(b.name);
      return a.status === 'loved' ? -1 : 1;
    });

    list.forEach(p => {
      const isLoved = p.status === 'loved';
      const statusText = isLoved ? '★ 熟人关注' : '✕ 已拉黑';
      const statusClass = isLoved ? 'tone-green' : 'tone-red';
      const notePart = p.note ? ` [备注: ${p.note}]` : '';
      
      listHtml += `
        <div class="person-item scout-publisher-item">
          <div>
            <b class="scout-publisher-name ${isLoved ? 'is-loved' : 'is-blocked'}">${escapeHtml(p.name)}</b>
            <span class="jlc-status-pill ${statusClass} scout-publisher-status">${statusText}</span>
            <span class="scout-publisher-site">(${p.site || '未知'})</span>
            <div class="scout-publisher-note">${escapeHtml(notePart)}</div>
          </div>
          <div class="scout-publisher-actions">
            <span class="remove scout-publisher-remove" data-id="${p.id}" title="取消熟人状态">✕</span>
          </div>
        </div>
      `;
    });
  }

  container.innerHTML = `
    <div class="jlc-wb-list-scroll scout-wb-list">
      ${listHtml}
    </div>
    <div class="jlc-wb-footer">
      <div class="scout-wb-add-form is-wrap">
        <input type="text" class="jlc-wb-search scout-wb-add-primary" id="scout-add-pub-name" placeholder="频道/制片名称...">
        <select class="jlc-wb-select scout-wb-add-secondary" id="scout-add-pub-status">
          <option value="loved">❤️ 关注熟人</option>
          <option value="blocked">✕ 拉黑频道</option>
        </select>
        <button class="jlc-wb-btn primary scout-wb-add-submit is-grow" id="scout-add-pub-btn">手动添加</button>
      </div>
    </div>
  `;

  container.querySelectorAll('.remove').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-id');
      if (deletePublisher(id)) {
        showToast('已取消熟人状态');
        applyListBlocks();
        renderPublishersPage();
      }
    });
  });

  container.querySelector('#scout-add-pub-btn').addEventListener('click', () => {
    const name = container.querySelector('#scout-add-pub-name').value.trim();
    const status = container.querySelector('#scout-add-pub-status').value;
    if (!name) {
      showToast('请输入频道名称', true);
      return;
    }
    const added = addPublisher({ name, site: detectSite() || 'mixed', status });
    if (added) {
      showToast(status === 'loved' ? `已关注熟人: ${name}` : `已拉黑频道: ${name}`, status !== 'loved');
      applyListBlocks();
      renderPublishersPage();
    }
  });
  markScoutWorkbenchPageRendered('publishers');
}

// Render Tab: Works（作品收藏）
// 主按钮优先当前站；三站芯片 = 原站打开 / 其它站按标题搜（L0）
function renderWorksPage() {
  const container = document.querySelector('[data-jlc-wb-page="works"]');
  if (!container) return;

  const works = getWorks().slice().sort((a, b) => {
    return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
  });
  const currentSite = typeof detectSite === 'function' ? detectSite() : null;
  const siteOrder =
    typeof orderSitesCurrentFirst === 'function'
      ? orderSitesCurrentFirst(currentSite)
      : ['xvideos', 'xnxx', 'eporner'];

  let listHtml = '';
  if (!works.length) {
    listHtml =
      '<div class="jlc-wb-empty">还没有收藏作品。打开视频详情页，点「☆ 收藏作品」：会进入本列表，并采集该片标签进词库。</div>';
  } else {
    works.forEach((w) => {
      const tags = (w.tags || []).slice(0, 8).map((t) => escapeHtml(t)).join(' · ');
      const more = (w.tags || []).length > 8 ? '…' : '';
      const timeStr = w.updated_at ? new Date(w.updated_at).toLocaleString() : '';
      const workSite = String(w.site || '');
      const onCurrent = !!(currentSite && workSite === currentSite);
      const primaryLabel = onCurrent || !currentSite ? '打开' : '本站搜';
      const primaryTitle = onCurrent || !currentSite
        ? '打开收藏原链'
        : '用标题在当前站搜索（优先当前站）';
      const chips = siteOrder
        .map((sid) => {
          const short =
            typeof scoutSiteShortLabel === 'function'
              ? scoutSiteShortLabel(sid)
              : sid;
          const isOrigin = sid === workSite;
          const isCur = sid === currentSite;
          const kind = isOrigin ? 'open' : 'search';
          const cls =
            'scout-work-site-chip' +
            (isCur ? ' is-current' : '') +
            (isOrigin ? ' is-origin' : '');
          const tip = isOrigin
            ? `打开原站 ${short}`
            : `在 ${short} 按标题搜索`;
          return `<button type="button" class="${cls}" data-site="${escapeHtml(sid)}" data-kind="${kind}" title="${escapeHtml(tip)}">${escapeHtml(short)}${isOrigin ? '★' : ''}</button>`;
        })
        .join('');

      listHtml += `
        <div class="jlc-wb-item" data-work-id="${escapeHtml(w.id)}">
          <div class="jlc-wb-item-row">
            <div class="jlc-wb-cover is-poster scout-work-cover">
              ${w.thumb
                ? `<img class="scout-work-thumb" src="${escapeHtml(w.thumb)}" alt="" referrerpolicy="no-referrer" loading="lazy"><span class="jlc-wb-cover-fallback" hidden>▶</span>`
                : '<span class="jlc-wb-cover-fallback">▶</span>'}
            </div>
            <div class="jlc-wb-item-body">
              <div class="jlc-wb-item-title-row">
                <span class="jlc-wb-item-title">${escapeHtml(w.title || w.videoId || '未命名')}</span>
                <span class="jlc-site-pill">${escapeHtml(typeof scoutSiteShortLabel === 'function' ? scoutSiteShortLabel(workSite) : workSite.toUpperCase())}</span>
              </div>
              <div class="jlc-wb-item-meta-line scout-work-meta">
                ${w.uploader ? escapeHtml(w.uploader) + ' · ' : ''}${timeStr}
              </div>
              ${tags ? `<div class="jlc-wb-item-meta-line scout-work-tags">站标: ${tags}${more}</div>` : ''}
              <div class="scout-work-site-chips">${chips}</div>
              <div class="scout-lex-flow scout-lex-flow-work">${(() => {
                const m = matchLexiconHits({ title: w.title, tags: w.tags || [], uploader: w.uploader });
                return buildLexiconHitFlowHtml(m, { max: 8, showCount: false, emptyHtml: '<span class="scout-lex-flow-empty">暂无词库标签</span>' });
              })()}</div>
            </div>
            <div class="jlc-wb-item-side">
              <button type="button" class="jlc-wb-open-btn scout-work-open" title="${escapeHtml(primaryTitle)}">${primaryLabel}</button>
              ${!onCurrent && currentSite && workSite
                ? '<button type="button" class="jlc-wb-btn ghost scout-work-origin" title="打开收藏时的原站链接">原站</button>'
                : ''}
              <button type="button" class="jlc-wb-btn danger scout-work-del">删除</button>
            </div>
          </div>
        </div>`;
    });
  }

  container.innerHTML = `
    <div class="jlc-wb-list-scroll scout-wb-list is-compact">
      <div class="legacy-note scout-wb-page-note">
        详情收藏 → 本列表 → 采标签库。主按钮<b>优先当前站</b>（本站片=打开；跨站=本站搜标题）。
        芯片 XV/XN/EP：★=原站打开，其余=按标题搜。共 <b>${works.length}</b> 部。
      </div>
      ${listHtml}
    </div>
  `;

  container.querySelectorAll('[data-work-id]').forEach((el) => {
    const id = el.getAttribute('data-work-id');
    const work = works.find((w) => w.id === id);
    if (!work) return;
    const q =
      typeof workSearchQueryFromTitle === 'function'
        ? workSearchQueryFromTitle(work.title)
        : compactText(work.title);

    const thumbImg = el.querySelector('img.scout-work-thumb');
    if (thumbImg) {
      thumbImg.addEventListener('error', () => {
        thumbImg.style.display = 'none';
        const fb = el.querySelector('.jlc-wb-cover-fallback');
        if (fb) fb.hidden = false;
        // 远程裂了且尚无 data 缓存：后台再拉一次
        const remote = work.thumbUrl || (!/^data:/i.test(work.thumb || '') ? work.thumb : '');
        if (
          remote &&
          !/^data:image\//i.test(work.thumb || '') &&
          typeof cacheThumbToDataUrl === 'function' &&
          typeof updateWorkThumb === 'function'
        ) {
          cacheThumbToDataUrl(remote).then((dataUrl) => {
            if (!dataUrl) return;
            if (updateWorkThumb(work.id, dataUrl, remote)) renderWorksPage();
          });
        }
      });
    }

    el.querySelector('.scout-work-open')?.addEventListener('click', () => {
      const onCur = currentSite && work.site === currentSite;
      if (onCur || !currentSite) {
        openScoutUrl(work.url, { newTab: true });
        return;
      }
      if (!q) {
        showToast('无标题，无法在本站搜索', true);
        return;
      }
      const url =
        typeof buildSearchUrl === 'function'
          ? buildSearchUrl(currentSite, q)
          : '';
      if (!url) return;
      openScoutUrl(url, { newTab: true });
    });

    el.querySelector('.scout-work-origin')?.addEventListener('click', () => {
      openScoutUrl(work.url, { newTab: true });
    });

    el.querySelectorAll('.scout-work-site-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const sid = chip.getAttribute('data-site');
        const kind = chip.getAttribute('data-kind');
        if (kind === 'open') {
          openScoutUrl(work.url, { newTab: true });
          return;
        }
        if (!q) {
          showToast('无标题，无法跨站搜索', true);
          return;
        }
        const url =
          typeof buildSearchUrl === 'function' ? buildSearchUrl(sid, q) : '';
        if (!url) return;
        openScoutUrl(url, { newTab: true });
      });
    });

    el.querySelector('.scout-work-del')?.addEventListener('click', () => {
      if (!confirm('从作品收藏中删除？不影响词库里已采集的标签。')) return;
      removeWork(id);
      showToast('已删除作品收藏');
      renderWorksPage();
    });
  });
  markScoutWorkbenchPageRendered('works');
}

// Render Tab 4: Tracks (Saved Searches)
// 同 query 折叠为一卡；组级「续看」优先当前站

/** 打开某站断点页；无 track 时按 query 搜第 1 页 */
