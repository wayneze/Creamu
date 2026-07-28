// @@creamu-part:36-tracking-page
function openTrackAtBreakpoint(track, site, query) {
  const siteNorm = String(site || (track && track.site) || '') || (typeof detectSite === 'function' ? detectSite() : '');
  const q = String((track && track.query) || query || '').trim();
  if (!siteNorm || !q) return;
  const page = track ? Number(track.last_seen_page) || 1 : 1;
  const baseUrl =
    (track && track.url) ||
    (typeof buildSearchUrl === 'function' ? buildSearchUrl(siteNorm, q) : '');
  if (!baseUrl) return;
  if (track && track.id) {
    updateTrack(track.id, { updated_at: new Date().toISOString() });
  }
  const target =
    typeof applyListPageToUrl === 'function'
      ? applyListPageToUrl(baseUrl, siteNorm, page)
      : baseUrl;
  openScoutUrl(target, { newTab: true });
}

function openScoutRecipeFromTracking(group) {
  if (!group || !group.recipe || typeof saveScoutSearchDraft !== 'function') return false;
  saveScoutSearchDraft(group.recipe);
  window.__scoutRunSearchOnOpen = true;
  const button = document.querySelector('#jlc-wb .jlc-wb-nav button[data-tab="combo"]');
  if (button) button.click();
  return !!button;
}

function renderTracksPage() {
  const container = document.querySelector('[data-jlc-wb-page="tracks"]');
  if (!container) return;

  const tracks = getTracks();
  const groups =
    typeof groupTracksByQuery === 'function' ? groupTracksByQuery(tracks) : [];
  const currentSite = typeof detectSite === 'function' ? detectSite() : null;
  const siteOrder =
    typeof orderSitesCurrentFirst === 'function'
      ? orderSitesCurrentFirst(currentSite)
      : ['xvideos', 'xnxx', 'eporner'];

  let listHtml = '';
  if (!tracks.length) {
    listHtml =
      '<div class="jlc-wb-empty">还没有收藏的搜索追更。在搜索页时，可在“组合搜索”中一键收藏！</div>';
  } else {
    groups.forEach((g) => {
      const curTrack =
        typeof findTrackInGroup === 'function'
          ? findTrackInGroup(g, currentSite)
          : null;
      const timeStr = g.updated_at ? new Date(g.updated_at).toLocaleString() : '';
      const sitePills = siteOrder
        .map((sid) => {
          const hit =
            typeof findTrackInGroup === 'function'
              ? findTrackInGroup(g, sid)
              : null;
          const short =
            typeof scoutSiteShortLabel === 'function'
              ? scoutSiteShortLabel(sid)
              : sid;
          const on = sid === currentSite ? ' is-current' : '';
          const tone = hit ? ' is-subscribed' : ' is-empty';
          return `<span class="jlc-site-pill scout-track-site-pill${on}${tone}" title="${escapeHtml(sid)}${hit ? ' · 已订' : ' · 未订'}">${escapeHtml(short)}${hit ? '' : '·'}</span>`;
        })
        .join('');

      let curMeta = '';
      if (currentSite && curTrack) {
        curMeta = `当前站 ${typeof scoutSiteShortLabel === 'function' ? scoutSiteShortLabel(currentSite) : currentSite}：p${curTrack.last_seen_page || 1}${curTrack.last_seen_item ? ' · 已记片' : ' · 未点片'}`;
      } else if (currentSite) {
        curMeta = `当前站未订 · 续看将打开搜索第 1 页`;
      } else {
        const any = g.tracks[0];
        curMeta = any
          ? `${typeof scoutSiteShortLabel === 'function' ? scoutSiteShortLabel(any.site) : any.site} p${any.last_seen_page || 1}`
          : '';
      }

      const rowsHtml = siteOrder
        .map((sid) => {
          const t =
            typeof findTrackInGroup === 'function'
              ? findTrackInGroup(g, sid)
              : null;
          const short =
            typeof scoutSiteShortLabel === 'function'
              ? scoutSiteShortLabel(sid)
              : sid;
          const isCur = sid === currentSite;
          if (t) {
            return `
              <div class="scout-track-site-row${isCur ? ' is-current' : ''}" data-site="${escapeHtml(sid)}" data-track-id="${escapeHtml(t.id)}">
                <span class="jlc-site-pill${isCur ? ' is-current' : ''}">${escapeHtml(short)}${isCur ? ' ·本站' : ''}</span>
                <span class="scout-track-site-meta">p${t.last_seen_page || 1}${t.last_seen_item ? ' · 已记片' : ''}</span>
                <button type="button" class="jlc-wb-btn ghost scout-track-site-open">续看</button>
                <button type="button" class="jlc-wb-btn danger scout-track-site-del">取消</button>
              </div>`;
          }
          return `
            <div class="scout-track-site-row${isCur ? ' is-current' : ''}" data-site="${escapeHtml(sid)}">
              <span class="jlc-site-pill is-empty">${escapeHtml(short)}${isCur ? ' ·本站' : ''}</span>
              <span class="scout-track-site-meta">未订阅</span>
              <button type="button" class="jlc-wb-btn ghost scout-track-site-search">去搜</button>
            </div>`;
        })
        .join('');

      listHtml += `
        <div class="jlc-wb-item scout-track-group" data-group-key="${escapeHtml(g.key)}">
          <div class="jlc-wb-item-row">
            <div class="jlc-wb-item-body">
              <div class="jlc-wb-item-title-row">
                <span class="jlc-wb-item-title scout-track-title">⭐ ${escapeHtml(g.label)}</span>
                <span class="jlc-site-pill">${g.siteCount} 站</span>
              </div>
              <div class="scout-track-site-pills">${sitePills}</div>
              <div class="jlc-wb-item-meta-line scout-track-query">
                ${g.recipe ? '配方' : '查询'}: <b>${escapeHtml(g.recipe && typeof describeScoutSearchRecipe === 'function' ? describeScoutSearchRecipe(g.recipe) : g.query)}</b>
              </div>
              <div class="jlc-wb-item-meta-line scout-track-updated">
                ${escapeHtml(curMeta)}${timeStr ? ' | ' + escapeHtml(timeStr) : ''}
              </div>
            </div>
            <div class="jlc-wb-item-side">
              <button type="button" class="jlc-wb-open-btn scout-track-open-btn" title="${g.recipe ? '重新运行组合结果' : '优先当前站断点'}">${g.recipe ? '结果' : '续看'}</button>
              <button type="button" class="jlc-wb-btn ghost scout-track-expand-btn">站点</button>
              <button type="button" class="jlc-wb-more-btn scout-track-more-btn">•••</button>
            </div>
          </div>
          <div class="scout-track-group-sites">${rowsHtml}</div>
          <div class="jlc-wb-item-edit scout-track-edit">
            <div class="scout-track-edit-actions">
              ${curTrack ? '<button type="button" class="jlc-wb-btn danger scout-track-del-current-btn">取消当前站</button>' : ''}
              <button type="button" class="jlc-wb-btn danger scout-track-delete-btn">删除整组</button>
              <button type="button" class="jlc-wb-btn ghost scout-track-cancel-btn">取消</button>
            </div>
          </div>
        </div>`;
    });
  }

  container.innerHTML = `
    <div class="jlc-wb-list-scroll scout-wb-list">
      <div class="legacy-note scout-wb-page-note">
        同搜索词多站合成一卡。<b>续看优先当前站</b>；点「站点」可看三站断点 / 去搜。
      </div>
      ${listHtml}
    </div>
  `;

  container.querySelectorAll('.scout-track-group').forEach((itemEl) => {
    const key = itemEl.getAttribute('data-group-key');
    const group = groups.find((g) => g.key === key);
    if (!group) return;

    itemEl.querySelector('.scout-track-open-btn')?.addEventListener('click', () => {
      if (group.recipe && openScoutRecipeFromTracking(group)) return;
      // 优先当前站：有订则续断点，无订则当前站搜第 1 页；无法识别站则用组内最新一条
      let site = currentSite;
      let track = site
        ? typeof findTrackInGroup === 'function'
          ? findTrackInGroup(group, site)
          : null
        : null;
      if (!site) {
        track = group.tracks
          .slice()
          .sort(
            (a, b) =>
              new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
          )[0];
        site = track && track.site;
      }
      openTrackAtBreakpoint(track, site, group.query);
      renderTracksPage();
    });

    itemEl.querySelector('.scout-track-expand-btn')?.addEventListener('click', () => {
      itemEl
        .querySelector('.scout-track-group-sites')
        ?.classList.toggle('is-open');
    });

    const moreBtn = itemEl.querySelector('.scout-track-more-btn');
    const editArea = itemEl.querySelector('.scout-track-edit');
    moreBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = editArea.classList.contains('is-open');
      container
        .querySelectorAll('.scout-track-edit')
        .forEach((el) => el.classList.remove('is-open'));
      if (!isOpen) editArea.classList.add('is-open');
    });

    editArea?.querySelector('.scout-track-cancel-btn')?.addEventListener('click', () => {
      editArea.classList.remove('is-open');
    });

    editArea?.querySelector('.scout-track-del-current-btn')?.addEventListener('click', () => {
      const t =
        typeof findTrackInGroup === 'function'
          ? findTrackInGroup(group, currentSite)
          : null;
      if (!t) return;
      if (!confirm(`取消当前站「${group.label}」追更？`)) return;
      deleteTrack(t.id);
      showToast('已取消当前站追更');
      renderTracksPage();
    });

    editArea?.querySelector('.scout-track-delete-btn')?.addEventListener('click', () => {
      if (!confirm(`删除整组「${group.label}」？将去掉 ${group.siteCount} 站追更。`)) return;
      if (typeof deleteTracksByQueryKey === 'function') {
        deleteTracksByQueryKey(group.key);
      } else {
        group.tracks.forEach((t) => deleteTrack(t.id));
      }
      showToast('已删除整组追更');
      renderTracksPage();
    });

    itemEl.querySelectorAll('.scout-track-site-row').forEach((row) => {
      const sid = row.getAttribute('data-site');
      const tid = row.getAttribute('data-track-id');
      const t = tid ? group.tracks.find((x) => x.id === tid) : null;
      row.querySelector('.scout-track-site-open')?.addEventListener('click', () => {
        openTrackAtBreakpoint(t, sid, group.query);
        renderTracksPage();
      });
      row.querySelector('.scout-track-site-search')?.addEventListener('click', () => {
        openTrackAtBreakpoint(null, sid, group.query);
      });
      row.querySelector('.scout-track-site-del')?.addEventListener('click', () => {
        if (!t) return;
        if (!confirm(`取消 ${typeof scoutSiteShortLabel === 'function' ? scoutSiteShortLabel(sid) : sid} 上的「${group.label}」？`)) return;
        deleteTrack(t.id);
        showToast('已取消该站追更');
        renderTracksPage();
      });
    });
  });
  markScoutWorkbenchPageRendered('tracks');
}

// 
function renderBlocksPage() {
  const container = document.querySelector('[data-jlc-wb-page="blocks"]');
  if (!container) return;

  const blocks = getBlockList();
  let listHtml = '';

  if (blocks.length === 0) {
    listHtml = '<div class="jlc-wb-empty">暂无屏蔽词。默认整词匹配标题，避免 ass 误伤 class 一类词。</div>';
  } else {
    blocks.forEach(b => {
      const zhPart = b.zh ? ` (${b.zh})` : '';
      const reasonPart = b.reason ? `原因: ${b.reason}` : '';
      const isHide = b.mode === 'hide';
      const isSub = normalizeBlockMatch(b.match) === 'sub';
      const scope = normalizeBlockScope(b.scope);
      const scopeLabel = scope === 'both' ? '标题+上传者' : scope === 'uploader' ? '上传者' : '标题';

      const modeBadge = isHide
        ? `<span class="jlc-status-pill tone-red scout-toggle-mode-btn" data-id="${b.id}" title="点击切换为弱淡化">🚫 强隐藏</span>`
        : `<span class="jlc-status-pill tone-yellow scout-toggle-mode-btn" data-id="${b.id}" title="点击切换为强隐藏">🌁 弱淡化</span>`;
      const matchBadge = `<span class="jlc-status-pill scout-toggle-match-btn" data-id="${b.id}" title="点击切换 整词/子串">${isSub ? '⊂ 子串' : '⬚ 整词'}</span>`;
      const scopeBadge = `<span class="jlc-status-pill scout-toggle-scope-btn" data-id="${b.id}" title="点击切换匹配范围">${escapeHtml(scopeLabel)}</span>`;

      listHtml += `
        <div class="person-item scout-block-item">
          <div class="scout-block-body">
            <div class="scout-block-heading">
              <b class="scout-block-name">${escapeHtml(b.text)}</b>${escapeHtml(zhPart)}
              ${modeBadge}${matchBadge}${scopeBadge}
            </div>
            <div class="scout-block-reason">${escapeHtml(reasonPart)}</div>
          </div>
          <span class="remove scout-block-remove" data-id="${b.id}" title="取消屏蔽">✕</span>
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
        <input type="text" class="jlc-wb-search scout-wb-add-primary" id="scout-add-block-text" placeholder="屏蔽词...">
        <input type="text" class="jlc-wb-search scout-wb-add-secondary" id="scout-add-block-zh" placeholder="中文翻译...">
        <input type="text" class="jlc-wb-search scout-wb-add-detail" id="scout-add-block-reason" placeholder="屏蔽理由...">

        <div class="scout-block-options is-first">
          <span class="scout-block-option-title">效果:</span>
          <label class="scout-block-option">
            <input type="radio" name="scout-add-block-mode" value="dim" checked> 弱淡化
          </label>
          <label class="scout-block-option">
            <input type="radio" name="scout-add-block-mode" value="hide"> 强隐藏
          </label>
        </div>
        <div class="scout-block-options">
          <span class="scout-block-option-title">匹配:</span>
          <label class="scout-block-option">
            <input type="radio" name="scout-add-block-match" value="word" checked> 整词
          </label>
          <label class="scout-block-option">
            <input type="radio" name="scout-add-block-match" value="sub"> 子串
          </label>
          <span class="scout-block-option-title is-scope">范围:</span>
          <label class="scout-block-option">
            <input type="radio" name="scout-add-block-scope" value="title" checked> 标题
          </label>
          <label class="scout-block-option">
            <input type="radio" name="scout-add-block-scope" value="uploader"> 上传者
          </label>
          <label class="scout-block-option">
            <input type="radio" name="scout-add-block-scope" value="both"> 两者
          </label>
        </div>

        <button class="jlc-wb-btn primary" id="scout-add-block-btn">添加屏蔽</button>
      </div>
    </div>
  `;

  container.querySelectorAll('.remove').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-id');
      if (deleteBlockWord(id)) {
        showToast('已取消屏蔽');
        applyListBlocks();
        renderBlocksPage();
      }
    });
  });

  container.querySelectorAll('.scout-toggle-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const b = blocks.find(item => item.id === id);
      if (b) {
        addBlockWord({ text: b.text, mode: b.mode === 'hide' ? 'dim' : 'hide' });
        applyListBlocks();
        renderBlocksPage();
      }
    });
  });

  container.querySelectorAll('.scout-toggle-match-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const b = blocks.find(item => item.id === id);
      if (b) {
        const next = normalizeBlockMatch(b.match) === 'sub' ? 'word' : 'sub';
        addBlockWord({ text: b.text, match: next });
        showToast(`匹配方式: ${next === 'sub' ? '子串' : '整词'}`);
        applyListBlocks();
        renderBlocksPage();
      }
    });
  });

  container.querySelectorAll('.scout-toggle-scope-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const b = blocks.find(item => item.id === id);
      if (b) {
        const cur = normalizeBlockScope(b.scope);
        const next = cur === 'title' ? 'uploader' : cur === 'uploader' ? 'both' : 'title';
        addBlockWord({ text: b.text, scope: next });
        showToast(`匹配范围已切换`);
        applyListBlocks();
        renderBlocksPage();
      }
    });
  });

  container.querySelector('#scout-add-block-btn').addEventListener('click', () => {
    const textVal = container.querySelector('#scout-add-block-text').value.trim();
    const zhVal = container.querySelector('#scout-add-block-zh').value.trim();
    const reasonVal = container.querySelector('#scout-add-block-reason').value.trim();
    const modeVal = container.querySelector('input[name="scout-add-block-mode"]:checked').value;
    const matchVal = container.querySelector('input[name="scout-add-block-match"]:checked').value;
    const scopeVal = container.querySelector('input[name="scout-add-block-scope"]:checked').value;

    if (!textVal) {
      showToast('请输入屏蔽词', true);
      return;
    }
    const added = addBlockWord({
      text: textVal,
      zh: zhVal,
      reason: reasonVal,
      mode: modeVal,
      match: matchVal,
      scope: scopeVal
    });
    if (added) {
      showToast(`已屏蔽: ${textVal}`, true);
      applyListBlocks();
      renderBlocksPage();
    }
  });
  markScoutWorkbenchPageRendered('blocks');
}

// 
