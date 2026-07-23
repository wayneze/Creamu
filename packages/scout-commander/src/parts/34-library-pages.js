// @@creamu-part:34-library-pages
function renderLexiconPage() {
  const container = document.querySelector('[data-jlc-wb-page="lexicon"]');
  if (!container) return;

  const terms = getLexiconTerms();
  const types = getLexiconTypes();

  let curType = container.getAttribute('data-selected-type') || '全部';
  let searchQuery = (container.querySelector('#scout-lexicon-search') ? container.querySelector('#scout-lexicon-search').value : '') || '';

  let typeChipsHtml = `<span class="jlc-wb-chip ${curType === '全部' ? 'is-on' : ''}" data-type="全部" style="margin:2px;cursor:pointer;">全部 (${terms.filter(t => t.status !== 'retired').length})</span>`;
  types.forEach(t => {
    const count = terms.filter(item => item.type === t && item.status !== 'retired').length;
    typeChipsHtml += `<span class="jlc-wb-chip ${curType === t ? 'is-on' : ''}" data-type="${escapeHtml(t)}" style="margin:2px;cursor:pointer;">${escapeHtml(t)} (${count})</span>`;
  });
  const retiredCount = terms.filter(t => t.status === 'retired').length;
  typeChipsHtml += `<span class="jlc-wb-chip ${curType === '已废弃' ? 'is-on' : ''}" data-type="已废弃" style="margin:2px;cursor:pointer;background:#ffe5e5;color:#b42318;">已废弃 (${retiredCount})</span>`;

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
      const zhText = t.zh ? ` · ${t.zh}` : ' · <span style="color:#b09070;font-style:italic;">暂无翻译</span>';
      const statusPill = t.status === 'confirmed' ? '<span class="jlc-status-pill tone-green" style="font-size:10px;padding:1px 4px;margin-left:4px;">已确认</span>' : '';
      const loveHeart = t.loved ? '<span style="color:#e54840;margin-right:4px;" title="心动标签">❤️</span>' : '';
      
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
              <div class="jlc-wb-item-meta-line" style="font-size:11.5px;color:#9a7d60;">
                分类: ${escapeHtml(t.type)} | 使用: ${t.use} | 赞/踩: ${t.good}/${t.bad}
              </div>
            </div>
            <div class="jlc-wb-item-side">
              <button class="jlc-wb-more-btn">•••</button>
            </div>
          </div>

          <div class="jlc-wb-item-edit" id="edit-${t.id}">
            <div style="display:flex;flex-direction:column;gap:8px;width:100%;margin-top:8px;border-top:1px dashed #efe0cc;padding-top:8px;">
              <div style="display:flex;gap:6px;align-items:center;">
                <span style="font-size:12px;color:#7a5a3c;width:54px;">翻译:</span>
                <input type="text" value="${escapeHtml(t.zh || '')}" placeholder="中文含义" class="scout-edit-zh" style="flex:1;padding:6px;font-size:13px;">
              </div>
              <div style="display:flex;gap:6px;align-items:center;">
                <span style="font-size:12px;color:#7a5a3c;width:54px;">类型:</span>
                <select class="jlc-wb-select scout-edit-type" style="flex:1;padding:4px 6px;">
                  ${typeOpts}
                </select>
              </div>
              <div style="display:flex;gap:6px;align-items:center;">
                <span style="font-size:12px;color:#7a5a3c;width:54px;">心动:</span>
                <label style="display:inline-flex;align-items:center;cursor:pointer;margin-top:0;text-transform:none;letter-spacing:0;font-size:13px;">
                  <input type="checkbox" class="scout-edit-loved" ${t.loved ? 'checked' : ''} style="width:16px;height:16px;margin-right:6px;accent-color:var(--scout-theme-color);"> 标记为心动标签
                </label>
              </div>
              <div style="display:flex;gap:6px;align-items:center;">
                <span style="font-size:12px;color:#7a5a3c;width:54px;">备注:</span>
                <input type="text" value="${escapeHtml(t.note || '')}" placeholder="来源/其他备注" class="scout-edit-note" style="flex:1;padding:6px;font-size:13px;">
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;flex-wrap:wrap;gap:6px;">
                <div style="display:flex;gap:4px;">
                  <button class="jlc-wb-btn primary scout-save-btn" style="padding:4px 8px;font-size:12px;">保存</button>
                  <button class="jlc-wb-btn ghost scout-cancel-btn" style="padding:4px 8px;font-size:12px;">取消</button>
                </div>
                <div style="display:flex;gap:4px;">
                  <button class="jlc-wb-btn primary scout-good-btn" title="很好用，热度+3" style="padding:4px 8px;font-size:12px;background:#2f6b3a;border:0;">👍 赞</button>
                  <button class="jlc-wb-btn ghost scout-bad-btn" title="不好用，热度-2" style="padding:4px 8px;font-size:12px;color:#8a3a32;border-color:#e8b8b0;">👎 踩</button>
                  <button class="jlc-wb-btn danger scout-retire-btn" style="padding:4px 8px;font-size:12px;">🗑️ 废弃</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    });
  }

  container.innerHTML = `
    <div class="jlc-wb-toolbar" style="padding-top:12px;">
      <div class="jlc-wb-toolbar-row">
        <input type="text" class="jlc-wb-search" id="scout-lexicon-search" placeholder="在词库中搜索..." value="${escapeHtml(searchQuery)}" style="padding:8px 12px;font-size:13.5px;">
      </div>
      <div style="display:flex;flex-wrap:wrap;margin-top:2px;">
        ${typeChipsHtml}
      </div>
    </div>

    <div class="jlc-wb-list-scroll">
      ${itemsHtml}
    </div>

    <div class="jlc-wb-footer" style="padding:10px 14px;">
      <div style="display:flex;gap:6px;width:100%;">
        <input type="text" class="jlc-wb-search" id="scout-add-term-text" placeholder="英文词..." style="flex:1.5;padding:8px;font-size:13px;">
        <input type="text" class="jlc-wb-search" id="scout-add-term-zh" placeholder="中文翻译..." style="flex:1;padding:8px;font-size:13px;">
        <button class="jlc-wb-btn primary" id="scout-add-term-btn" style="padding:8px 12px;">添加</button>
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
        <div class="person-item" style="border-radius:12px;margin-bottom:8px;">
          <div>
            <b style="color:${isLoved ? '#2f6b3a' : '#b42318'};">${escapeHtml(p.name)}</b> 
            <span class="jlc-status-pill ${statusClass}" style="font-size:10.5px;padding:1px 6px;margin-left:4px;">${statusText}</span>
            <span style="font-size:11px;color:#9a7d60;margin-left:4px;">(${p.site || '未知'})</span>
            <div style="font-size:11px;color:#9a7d60;margin-top:2px;">${escapeHtml(notePart)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="remove" data-id="${p.id}" title="取消熟人状态" style="cursor:pointer;font-weight:bold;">✕</span>
          </div>
        </div>
      `;
    });
  }

  container.innerHTML = `
    <div class="jlc-wb-list-scroll" style="padding-top:14px;">
      ${listHtml}
    </div>
    <div class="jlc-wb-footer">
      <div style="display:flex;gap:6px;width:100%;flex-wrap:wrap;">
        <input type="text" class="jlc-wb-search" id="scout-add-pub-name" placeholder="频道/制片名称..." style="flex:1.5;padding:8px;font-size:13px;">
        <select class="jlc-wb-select" id="scout-add-pub-status" style="flex:1;padding:4px 6px;">
          <option value="loved">❤️ 关注熟人</option>
          <option value="blocked">✕ 拉黑频道</option>
        </select>
        <button class="jlc-wb-btn primary" id="scout-add-pub-btn" style="flex:1;padding:8px;justify-content:center;">手动添加</button>
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
            <div class="jlc-wb-cover is-poster" style="flex:0 0 72px;width:72px;height:54px;border-radius:10px;overflow:hidden;background:#efe4d2;">
              ${w.thumb
                ? `<img class="scout-work-thumb" src="${escapeHtml(w.thumb)}" alt="" referrerpolicy="no-referrer" loading="lazy" style="width:100%;height:100%;object-fit:cover;"><span class="jlc-wb-cover-fallback" hidden>▶</span>`
                : '<span class="jlc-wb-cover-fallback">▶</span>'}
            </div>
            <div class="jlc-wb-item-body" style="min-width:0;">
              <div class="jlc-wb-item-title-row">
                <span class="jlc-wb-item-title">${escapeHtml(w.title || w.videoId || '未命名')}</span>
                <span class="jlc-site-pill">${escapeHtml(typeof scoutSiteShortLabel === 'function' ? scoutSiteShortLabel(workSite) : workSite.toUpperCase())}</span>
              </div>
              <div class="jlc-wb-item-meta-line" style="font-size:11.5px;color:#9a7d60;">
                ${w.uploader ? escapeHtml(w.uploader) + ' · ' : ''}${timeStr}
              </div>
              ${tags ? `<div class="jlc-wb-item-meta-line" style="font-size:11px;color:#a89078;margin-top:2px;">站标: ${tags}${more}</div>` : ''}
              <div class="scout-work-site-chips">${chips}</div>
              <div class="scout-lex-flow scout-lex-flow-work" style="margin-top:6px;">${(() => {
                const m = matchLexiconHits({ title: w.title, tags: w.tags || [], uploader: w.uploader });
                return buildLexiconHitFlowHtml(m, { max: 8, showCount: false, emptyHtml: '<span class="scout-lex-flow-empty">暂无词库标签</span>' });
              })()}</div>
            </div>
            <div class="jlc-wb-item-side">
              <button type="button" class="jlc-wb-open-btn scout-work-open" style="min-width:52px;padding:6px 10px;font-size:12px;" title="${escapeHtml(primaryTitle)}">${primaryLabel}</button>
              ${!onCurrent && currentSite && workSite
                ? '<button type="button" class="jlc-wb-btn ghost scout-work-origin" style="min-width:52px;padding:4px 8px;font-size:11px;margin-top:4px;" title="打开收藏时的原站链接">原站</button>'
                : ''}
              <button type="button" class="jlc-wb-btn danger scout-work-del" style="padding:4px 8px;font-size:11px;margin-top:4px;">删除</button>
            </div>
          </div>
        </div>`;
    });
  }

  container.innerHTML = `
    <div class="jlc-wb-list-scroll" style="padding-top:12px;">
      <div class="legacy-note" style="margin:0 14px 10px;line-height:1.45;">
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
}

// Render Tab 4: Tracks (Saved Searches)
// 同 query 折叠为一卡；组级「续看」优先当前站

/** 打开某站断点页；无 track 时按 query 搜第 1 页 */
