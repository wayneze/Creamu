// @@creamu-part:page-enhancements
// Shared page helpers

let scoutDrawerExpanded = false;
let scoutBodyOverflow = null;

function isScoutNarrowViewport() { return window.matchMedia('(max-width: 820px)').matches; }

function applyScoutWorkbenchGeometry(wb, patch = {}) {
  if (!wb) return null;
  const narrow = isScoutNarrowViewport();
  const docked = !narrow && window.innerWidth >= 1200 && GM_getValue('scout_wb_layout', 'dock') === 'dock';
  const open = wb.classList.contains('is-open');
  const viewport = window.visualViewport;
  const height = viewport ? viewport.height : window.innerHeight;
  const top = viewport ? viewport.offsetTop : 0;
  const keyboardOpen = narrow && height < window.innerHeight * .75;
  let rect;
  if (narrow) {
    const expanded = scoutDrawerExpanded || keyboardOpen;
    const panelHeight = Math.round(height * (expanded ? .96 : .64));
    rect = { left: 0, top: top + height - panelHeight, width: window.innerWidth, height: panelHeight };
  } else if (docked) {
    const width = Math.min(520, Math.max(400, Math.round(window.innerWidth * .3)));
    rect = { left: window.innerWidth - width, top: 0, width, height: window.innerHeight };
  } else {
    const def = getCreamuDefaultWorkbenchRect(window);
    const saved = { ...GM_getValue('scout_wb_pos', {}), ...GM_getValue('scout_wb_size', {}) };
    rect = clampCreamuWorkbenchRect({
      left: patch.left ?? parseCreamuPixel(saved.left), top: patch.top ?? parseCreamuPixel(saved.top),
      width: patch.width ?? (parseCreamuPixel(saved.width) || def.width),
      height: patch.height ?? (parseCreamuPixel(saved.height) || def.height),
    }, window);
  }
  wb.classList.toggle('is-mobile', narrow);
  wb.classList.toggle('is-docked', docked);
  wb.classList.toggle('is-expanded', scoutDrawerExpanded);
  wb.classList.toggle('is-keyboard-open', keyboardOpen);
  // Scout owns geometry, including visualViewport offsets; override shared CSS's bottom-pinned mobile default.
  const geometry = { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px', right: 'auto', bottom: 'auto', 'max-height': 'none' };
  Object.entries(geometry).forEach(([property, value]) => wb.style.setProperty(property, value, 'important'));
  document.documentElement.classList.toggle('scout-console-docked', open && docked);
  document.documentElement.style.setProperty('--scout-dock-width', rect.width + 'px');
  const lock = open && narrow && scoutDrawerExpanded;
  if (lock && scoutBodyOverflow === null) { scoutBodyOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
  if (!lock && scoutBodyOverflow !== null) { document.body.style.overflow = scoutBodyOverflow; scoutBodyOverflow = null; }
  const expand = wb.querySelector('#scout-wb-expand-btn');
  if (expand) { expand.hidden = !narrow; expand.textContent = scoutDrawerExpanded ? '收起' : '展开'; expand.setAttribute('aria-expanded', String(scoutDrawerExpanded)); }
  const layout = wb.querySelector('#scout-wb-layout-btn');
  if (layout) { layout.hidden = narrow || window.innerWidth < 1200; layout.textContent = docked ? '浮窗' : '停靠'; }
  const focused = document.activeElement;
  if (open && narrow && wb.contains(focused) && focused.matches('input, textarea, select')) {
    focused.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  return rect;
}

function clampScoutFabPosition(fab) {
  if (!fab) return;
  if (isScoutNarrowViewport()) {
    Object.assign(fab.style, { left: 'auto', top: 'auto', right: '16px', bottom: 'max(16px, env(safe-area-inset-bottom))' });
    return;
  }
  const left = parseCreamuPixel(fab.style.left), top = parseCreamuPixel(fab.style.top);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return;
  const point = clampCreamuWorkbenchPoint({ left, top }, { width: fab.offsetWidth || 110, height: fab.offsetHeight || 44 }, window);
  Object.assign(fab.style, { left: point.left + 'px', top: point.top + 'px', right: 'auto', bottom: 'auto' });
}

function makeDraggable(el, isFab = false) {
  if (!el) return;
  bindCreamuFabDrag(el, {
    boundKey: 'scoutDragBound',
    threshold: 6,
    thresholdMode: 'axis',
    isDragDisabled: () => isFab && isScoutNarrowViewport(),
    shouldIgnoreDrag: (event) => {
      const control = event.target?.closest?.('button, input');
      return !!control && control !== el;
    },
    applyPosition: (point) => {
      el.style.left = point.left + 'px';
      el.style.top = point.top + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    },
    savePosition: () => {
      const key = isFab ? 'scout_fab_pos' : 'scout_wb_pos';
      GM_setValue(key, { left: el.style.left, top: el.style.top });
    },
    bindClick: false
  });
}

function makeHeaderDraggable(wbEl, headerEl) {
  bindCreamuWorkbenchDrag(wbEl, {
    header: headerEl,
    isDragDisabled: () => wbEl.classList.contains('is-mobile') || wbEl.classList.contains('is-docked'),
    boundKey: 'scoutHeaderDragBound',
    shouldIgnoreDrag: (event) => !!event.target?.closest?.('.jlc-wb-header-actions'),
    applyRect: (rect) => applyScoutWorkbenchGeometry(wbEl, rect),
    onEnd: () => GM_setValue('scout_wb_pos', { left: wbEl.style.left, top: wbEl.style.top }),
    lockBodySelection: false
  });
}

function makeResizable(wbEl) {
  bindCreamuWorkbenchResize(wbEl, {
    boundKey: 'scoutPanelResizeBound',
    handleBoundPrefix: 'scoutResizeHandle',
    isDragDisabled: () => wbEl.classList.contains('is-mobile') || wbEl.classList.contains('is-docked'),
    applyRect: (rect) => applyScoutWorkbenchGeometry(wbEl, rect),
    onEnd: () => {
      GM_setValue('scout_wb_size', { width: wbEl.style.width, height: wbEl.style.height });
      GM_setValue('scout_wb_pos', { left: wbEl.style.left, top: wbEl.style.top });
    },
    lockBodySelection: false
  });
}

function showScoutCollectDialog({ text, sources, onSaved, tags }) {
  const existing = document.getElementById('scout-collect-dialog');
  if (existing) { existing.close(); existing.remove(); }
  const choices = [...new Set((tags || [text]).filter(Boolean))];
  if (!choices.length) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'scout-collect-dialog';
  dialog.setAttribute('aria-label', '标签操作');
  document.body.appendChild(dialog);
  const render = (selected) => {
    const known = getLexiconTerms().find(term => lexiconIdentityKey(term.text) === lexiconIdentityKey(selected));
    dialog.innerHTML = `<div class="scout-collect-card">
      <div class="scout-dialog-head"><strong>用标签继续找</strong><button type="button" class="jlc-wb-icon-btn" id="scout-collect-cancel" aria-label="关闭标签操作">×</button></div>
      <label for="scout-tag-choice">当前标签</label><select id="scout-tag-choice">${choices.map(tag => `<option${tag === selected ? ' selected' : ''}>${escapeHtml(tag)}</option>`).join('')}</select>
      <div class="scout-tag-search-actions">${Object.entries(SCOUT_SEARCH_ROLE_LABELS).map(([role, label]) => `<button type="button" class="jlc-wb-btn" data-tag-search="${role}">${label}</button>`).join('')}</div>
      <p class="scout-dialog-note">加入搜索后可以继续选词，也可以直接搜索。</p>
      <div class="scout-collect-actions"><button type="button" class="jlc-wb-btn primary" id="scout-collect-save">${known ? '更新词条' : '收藏词条'}</button><button type="button" class="jlc-wb-btn ghost" id="scout-tag-love">${known?.loved ? '取消心动' : '标为心动'}</button></div>
      <details><summary>分类与中文备注</summary><label for="scout-collect-zh">中文含义</label><input type="text" id="scout-collect-zh" value="${escapeHtml(known?.zh || '')}" placeholder="可以稍后填写">
      <label for="scout-collect-type">分类</label><select id="scout-collect-type">${getLexiconTypes().map(type => `<option${type === (known?.type || '未分类') ? ' selected' : ''}>${escapeHtml(type)}</option>`).join('')}</select></details>
      <details><summary>减少不想看的内容</summary><p class="scout-dialog-note">对标题含有此词的作品生效。</p><div class="scout-collect-actions"><button type="button" class="jlc-wb-btn ghost" data-tag-block="dim">淡化</button><button type="button" class="jlc-wb-btn ghost" data-tag-block="hide">隐藏</button></div></details>
    </div>`;
    dialog.querySelector('#scout-tag-choice').onchange = event => render(event.target.value);
    dialog.querySelector('#scout-collect-cancel').onclick = () => dialog.close();
    const saved = (term) => {
      if (!term) return;
      onSaved?.(term);
      refreshScoutWorkbenchPagesIfActive('lexicon', 'combo');
      enhancePageTags();
      dialog.close();
    };
    dialog.querySelector('#scout-collect-save').onclick = () => {
      const term = addLexiconTerm({ text: selected, sources: sources || [], zh: dialog.querySelector('#scout-collect-zh').value.trim(), type: dialog.querySelector('#scout-collect-type').value, loved: !!known?.loved });
      showToast('已收藏词条：' + selected); saved(term);
    };
    dialog.querySelector('#scout-tag-love').onclick = () => {
      const term = known ? updateLexiconTerm(known.id, { loved: !known.loved }) : addLexiconTerm({ text: selected, loved: true, sources: sources || [] });
      showToast(term?.loved ? '已标为心动：' + selected : '已取消心动：' + selected); saved(term);
    };
    dialog.querySelectorAll('[data-tag-search]').forEach(button => button.onclick = () => {
      const recipe = addScoutSearchTerms(getScoutSearchDraft(), selected, button.dataset.tagSearch, 1);
      saveScoutSearchDraft(recipe); resetScoutSearchUiSession();
      dialog.close();
      window.__scoutOpenWorkbench('combo');
    });
    dialog.querySelectorAll('[data-tag-block]').forEach(button => button.onclick = () => {
      addBlockWord({ text: selected, mode: button.dataset.tagBlock, match: 'word', scope: 'title', reason: '从作品标签添加' });
      showToast('已更新屏蔽：' + selected); applyListBlocks(); enhancePageTags(); refreshScoutWorkbenchPagesIfActive('blocks', 'lexicon'); dialog.close();
    });
  };
  render(text || choices[0]);
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.showModal();
}

function buildLexiconHitFlowHtml(matchResult, options) {
  const opts = options || {};
  const max = opts.max != null ? opts.max : 12;
  const r = matchResult || { hits: [], lovedCount: 0, total: 0 };
  if (!r.total) {
    return opts.emptyHtml != null
      ? opts.emptyHtml
      : '<span class="scout-lex-flow-empty">未命中词库</span>';
  }
  const slice = r.hits.slice(0, max);
  const chips = slice
    .map((h) => {
      const cls = h.loved ? 'scout-lex-chip is-loved' : 'scout-lex-chip';
      const tip = `${h.text}${h.zh ? ' · ' + h.zh : ''} [${h.type}] · ${h.via}`;
      const heart = h.loved ? '❤️' : '';
      return `<span class="${cls}" title="${escapeHtml(tip)}">${heart}${escapeHtml(h.label)}</span>`;
    })
    .join('');
  const more =
    r.total > max
      ? `<span class="scout-lex-chip is-more">+${r.total - max}</span>`
      : '';
  // 默认不显示「命中 N」文案，只保留芯片；需要时 opts.showCount
  const head = opts.showCount
    ? `<span class="scout-lex-flow-count">${r.total}${r.lovedCount ? '·❤️' + r.lovedCount : ''}</span>`
    : '';
  return `${head}<span class="scout-lex-flow-chips">${chips}${more}</span>`;
}
