// @@creamu-part:page-enhancements
// Shared page helpers

/** 将工作台放到视口内；无有效记忆位置时用默认几何 */
function applyScoutWorkbenchGeometry(wb, patch = {}) {
  if (!wb) return null;
  const def = getCreamuDefaultWorkbenchRect(window);
  const savedPos = GM_getValue('scout_wb_pos', null) || {};
  const savedSize = GM_getValue('scout_wb_size', null) || {};

  const nextWidth = patch.width != null
    ? patch.width
    : (parseCreamuPixel(savedSize.width) || parseCreamuPixel(wb.style.width) || def.width);
  const nextHeight = patch.height != null
    ? patch.height
    : (parseCreamuPixel(savedSize.height) || parseCreamuPixel(wb.style.height) || def.height);
  const nextLeft = patch.left != null
    ? patch.left
    : (parseCreamuPixel(savedPos.left) || parseCreamuPixel(wb.style.left));
  const nextTop = patch.top != null
    ? patch.top
    : (parseCreamuPixel(savedPos.top) || parseCreamuPixel(wb.style.top));

  const rect = clampCreamuWorkbenchRect({
    left: nextLeft,
    top: nextTop,
    width: nextWidth,
    height: nextHeight
  }, window);
  wb.style.left = rect.left + 'px';
  wb.style.top = rect.top + 'px';
  wb.style.right = 'auto';
  wb.style.bottom = 'auto';
  wb.style.width = rect.width + 'px';
  wb.style.height = rect.height + 'px';
  wb.style.maxHeight = 'none';
  return rect;
}

function isScoutNarrowViewport() {
  try {
    return !!(window.matchMedia && window.matchMedia('(max-width: 820px)').matches);
  } catch (_) {
    return window.innerWidth <= 820;
  }
}

/**
 * 手机：工作台钮 + 订阅钮叠在右下角视口固定（不跟页滚走，不吃 left/top 记忆）
 * 上 ☆订阅 · 下 🧭工作台
 */
function dockMobileFabStack() {
  if (!isScoutNarrowViewport()) return;
  const fab = document.getElementById('jlc-wb-fab');
  if (fab) {
    fab.style.position = 'fixed';
    fab.style.left = 'auto';
    fab.style.top = 'auto';
    fab.style.right = '16px';
    fab.style.bottom = '16px';
    fab.style.zIndex = '2147483000';
    fab.style.visibility = 'visible';
    fab.style.opacity = '1';
    fab.style.display = 'flex';
    fab.style.pointerEvents = 'auto';
    fab.classList.add('scout-fab-docked');
  }
  const track = document.getElementById('scout-search-track-bar');
  if (track && track.classList.contains('scout-track-fab')) {
    track.style.left = 'auto';
    track.style.top = 'auto';
    track.style.right = '16px';
    track.style.bottom = '64px';
  }
}

function clampScoutFabPosition(fab) {
  if (!fab) return;
  // 手机强制贴右下，忽略 left/top 记忆（否则一滚/换页就像丢了）
  if (isScoutNarrowViewport()) {
    dockMobileFabStack();
    return;
  }
  const left = parseCreamuPixel(fab.style.left);
  const top = parseCreamuPixel(fab.style.top);
  // 仍用默认 right/bottom 时不必钳制
  if (!Number.isFinite(left) || !Number.isFinite(top)) return;
  const point = clampCreamuWorkbenchPoint(
    { left, top },
    { width: fab.offsetWidth || 34, height: fab.offsetHeight || 34 },
    window
  );
  fab.style.left = point.left + 'px';
  fab.style.top = point.top + 'px';
  fab.style.right = 'auto';
  fab.style.bottom = 'auto';
}

function makeDraggable(el, isFab = false) {
  if (!el) return;
  bindCreamuFabDrag(el, {
    boundKey: 'scoutDragBound',
    threshold: 6,
    thresholdMode: 'axis',
    isDragDisabled: () => isFab && isScoutNarrowViewport(),
    shouldIgnoreDrag: (event) => !!event.target?.closest?.('button, input'),
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
    applyRect: (rect) => applyScoutWorkbenchGeometry(wbEl, rect),
    onEnd: () => {
      GM_setValue('scout_wb_size', { width: wbEl.style.width, height: wbEl.style.height });
      GM_setValue('scout_wb_pos', { left: wbEl.style.left, top: wbEl.style.top });
    },
    lockBodySelection: false
  });
}

function showScoutCollectDialog({ text, sources, onSaved }) {
  const existing = document.getElementById('scout-collect-dialog');
  if (existing) existing.remove();

  const types = getLexiconTypes();
  const known = getLexiconTerms().find(t => t.text.toLowerCase().trim() === compactText(text).toLowerCase());

  const dialog = document.createElement('div');
  dialog.id = 'scout-collect-dialog';
  dialog.innerHTML = `
    <div class="scout-collect-card">
      <h4>采集词条</h4>
      <p class="scout-collect-term">${escapeHtml(text)}</p>
      <label>中文翻译</label>
      <input type="text" id="scout-collect-zh" placeholder="可选，填写中文含义" value="${escapeHtml((known && known.zh) || '')}">
      <label>分类</label>
      <select id="scout-collect-type">
        ${types.map(ty => {
          const sel = known && known.type === ty ? 'selected' : (ty === '未分类' && !known ? 'selected' : '');
          return `<option value="${escapeHtml(ty)}" ${sel}>${escapeHtml(ty)}</option>`;
        }).join('')}
      </select>
      <label class="scout-collect-loved">
        <input type="checkbox" id="scout-collect-loved" ${(known && known.loved) ? 'checked' : ''}>
        标记为心动标签
      </label>
      <div class="scout-collect-actions">
        <button type="button" class="jlc-wb-btn ghost" id="scout-collect-cancel">取消</button>
        <button type="button" class="jlc-wb-btn primary" id="scout-collect-save">入库</button>
      </div>
    </div>
  `;
  document.body.appendChild(dialog);

  const close = () => dialog.remove();
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  dialog.querySelector('#scout-collect-cancel').addEventListener('click', close);
  dialog.querySelector('#scout-collect-save').addEventListener('click', () => {
    const zh = dialog.querySelector('#scout-collect-zh').value.trim();
    const type = dialog.querySelector('#scout-collect-type').value || '未分类';
    const loved = dialog.querySelector('#scout-collect-loved').checked;
    const term = addLexiconTerm({
      text,
      zh,
      type,
      loved,
      status: zh || type !== '未分类' ? 'confirmed' : 'unreviewed',
      sources: sources || []
    });
    close();
    if (term) {
      showToast(`已采集: ${term.text}${term.zh ? ' · ' + term.zh : ''} [${term.type}]`);
      if (typeof onSaved === 'function') onSaved(term);
    }
  });

  const zhInp = dialog.querySelector('#scout-collect-zh');
  setTimeout(() => {
    zhInp.focus();
    zhInp.select();
  }, 30);
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
