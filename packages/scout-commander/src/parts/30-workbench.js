// 30-workbench.js

function getDefaultWorkbenchRect() {
  const width = Math.min(520, Math.max(360, window.innerWidth - 96));
  const height = Math.min(window.innerHeight * 0.76, 780, window.innerHeight - 80);
  const left = Math.max(24, Math.round(window.innerWidth - width - 48));
  const top = Math.max(32, Math.round((window.innerHeight - height) * 0.12));
  return {
    left,
    top,
    width: Math.round(width),
    height: Math.round(Math.max(280, height))
  };
}

function clampWorkbenchRect(left, top, width, height) {
  const margin = 12;
  const maxW = Math.max(360, window.innerWidth - margin * 2);
  const maxH = Math.max(280, window.innerHeight - margin * 2);
  let w = Math.round(Number(width));
  let h = Math.round(Number(height));
  if (!Number.isFinite(w) || w <= 0) w = 520;
  if (!Number.isFinite(h) || h <= 0) h = 560;
  w = Math.min(maxW, Math.max(360, w));
  h = Math.min(maxH, Math.max(280, h));
  let l = Number(left);
  let t = Number(top);
  if (!Number.isFinite(l)) l = getDefaultWorkbenchRect().left;
  if (!Number.isFinite(t)) t = getDefaultWorkbenchRect().top;
  l = Math.round(Math.min(Math.max(margin, l), Math.max(margin, window.innerWidth - w - margin)));
  t = Math.round(Math.min(Math.max(margin, t), Math.max(margin, window.innerHeight - h - margin)));
  return { left: l, top: t, width: w, height: h };
}

/** 将工作台放到视口内；无有效记忆位置时用默认几何 */
function applyScoutWorkbenchGeometry(wb, patch = {}) {
  if (!wb) return null;
  const def = getDefaultWorkbenchRect();
  const savedPos = GM_getValue('scout_wb_pos', null) || {};
  const savedSize = GM_getValue('scout_wb_size', null) || {};

  const parsePx = (v) => {
    if (v == null || v === '') return NaN;
    if (typeof v === 'number') return v;
    return parseFloat(String(v).replace(/px$/i, ''));
  };

  const nextWidth = patch.width != null
    ? patch.width
    : (parsePx(savedSize.width) || parsePx(wb.style.width) || def.width);
  const nextHeight = patch.height != null
    ? patch.height
    : (parsePx(savedSize.height) || parsePx(wb.style.height) || def.height);
  const nextLeft = patch.left != null
    ? patch.left
    : (parsePx(savedPos.left) || parsePx(wb.style.left));
  const nextTop = patch.top != null
    ? patch.top
    : (parsePx(savedPos.top) || parsePx(wb.style.top));

  const rect = clampWorkbenchRect(nextLeft, nextTop, nextWidth, nextHeight);
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
  const parsePx = (v) => {
    if (v == null || v === '') return NaN;
    if (typeof v === 'number') return v;
    return parseFloat(String(v).replace(/px$/i, ''));
  };
  let left = parsePx(fab.style.left);
  let top = parsePx(fab.style.top);
  // 仍用默认 right/bottom 时不必钳制
  if (!Number.isFinite(left) || !Number.isFinite(top)) return;
  const w = fab.offsetWidth || 34;
  const h = fab.offsetHeight || 34;
  left = Math.max(8, Math.min(window.innerWidth - w - 8, left));
  top = Math.max(8, Math.min(window.innerHeight - h - 8, top));
  fab.style.left = left + 'px';
  fab.style.top = top + 'px';
  fab.style.right = 'auto';
  fab.style.bottom = 'auto';
}

// 
function makeDraggable(el, isFab = false) {
  if (!el || el.dataset.scoutDragBound === '1') return;
  el.dataset.scoutDragBound = '1';

  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;

  el.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    // 徽章/按钮点击不抢拖动手势，仍可冒泡到 click 开面板
    if (e.target.closest('button') || e.target.closest('input')) return;
    // 手机 FAB 贴右下固定，禁止拖走（否则一滚就找不到）
    if (isFab && isScoutNarrowViewport()) return;

    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    const rect = el.getBoundingClientRect();
    originLeft = rect.left;
    originTop = rect.top;
    try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }

    const onMove = (ev) => {
      if (!dragging) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        moved = true;
        el.classList.add('is-dragging');
        el.dataset.suppressClick = '1';
      }
      if (!moved) return;

      const w = el.offsetWidth || 34;
      const h = el.offsetHeight || 34;
      const nextLeft = Math.max(8, Math.min(window.innerWidth - w - 8, originLeft + dx));
      const nextTop = Math.max(8, Math.min(window.innerHeight - h - 8, originTop + dy));
      el.style.left = nextLeft + 'px';
      el.style.top = nextTop + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('is-dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);

      if (moved) {
        if (isFab) {
          GM_setValue('scout_fab_pos', { left: el.style.left, top: el.style.top });
        } else {
          GM_setValue('scout_wb_pos', { left: el.style.left, top: el.style.top });
        }
        // click 在 pointerup 之后；下一帧再清 suppress，避免拖完误开
        setTimeout(() => {
          delete el.dataset.suppressClick;
        }, 0);
      }
      moved = false;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  });
}

function makeHeaderDraggable(wbEl, headerEl) {
  if (!headerEl || headerEl.dataset.scoutDragBound === '1') return;
  headerEl.dataset.scoutDragBound = '1';

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let lockedW = 0;
  let lockedH = 0;

  headerEl.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest('.jlc-wb-header-actions')) return;

    dragging = true;
    wbEl.classList.add('is-dragging');
    startX = e.clientX;
    startY = e.clientY;
    const rect = wbEl.getBoundingClientRect();
    originLeft = rect.left;
    originTop = rect.top;
    lockedW = Math.round(rect.width);
    lockedH = Math.round(rect.height);
    try { headerEl.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }

    const onMove = (ev) => {
      if (!dragging) return;
      applyScoutWorkbenchGeometry(wbEl, {
        left: originLeft + (ev.clientX - startX),
        top: originTop + (ev.clientY - startY),
        width: lockedW,
        height: lockedH
      });
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      wbEl.classList.remove('is-dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      GM_setValue('scout_wb_pos', { left: wbEl.style.left, top: wbEl.style.top });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  });
}

function makeResizable(wbEl) {
  if (!wbEl || wbEl.dataset.scoutResizeBound === '1') return;
  wbEl.dataset.scoutResizeBound = '1';

  const resizeCorner = wbEl.querySelector('.jlc-wb-resize-corner');
  const resizeW = wbEl.querySelector('.jlc-wb-resize-w');
  const resizeH = wbEl.querySelector('.jlc-wb-resize-h');

  const initResize = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = wbEl.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;
    const startLeft = rect.left;
    const startTop = rect.top;
    const startX = e.clientX;
    const startY = e.clientY;

    wbEl.classList.add('is-resizing');

    const doResize = (ev) => {
      let nextLeft = startLeft;
      let nextTop = startTop;
      let nextW = startWidth;
      let nextH = startHeight;
      if (direction === 'corner' || direction === 'w') {
        const dx = ev.clientX - startX;
        if (direction === 'w') {
          nextW = startWidth - dx;
          nextLeft = startLeft + dx;
        } else {
          nextW = startWidth + dx;
        }
      }
      if (direction === 'corner' || direction === 'h') {
        nextH = startHeight + (ev.clientY - startY);
      }
      applyScoutWorkbenchGeometry(wbEl, {
        left: nextLeft,
        top: nextTop,
        width: nextW,
        height: nextH
      });
    };

    const stopResize = () => {
      wbEl.classList.remove('is-resizing');
      window.removeEventListener('pointermove', doResize);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
      GM_setValue('scout_wb_size', { width: wbEl.style.width, height: wbEl.style.height });
      GM_setValue('scout_wb_pos', { left: wbEl.style.left, top: wbEl.style.top });
    };

    window.addEventListener('pointermove', doResize);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
  };

  if (resizeCorner) resizeCorner.addEventListener('pointerdown', (e) => initResize(e, 'corner'));
  if (resizeW) resizeW.addEventListener('pointerdown', (e) => initResize(e, 'w'));
  if (resizeH) resizeH.addEventListener('pointerdown', (e) => initResize(e, 'h'));
}

/** 清除列表卡屏蔽呈现（类名 + 内联，避免被主题 !important 盖掉） */
function clearListBlockPresentation(el) {
  if (!el) return;
  el.classList.remove('scout-blocked-hide', 'scout-blocked-dim');
  try {
    el.style.removeProperty('display');
    el.style.removeProperty('opacity');
    el.style.removeProperty('pointer-events');
  } catch (_) {
    el.style.display = '';
    el.style.opacity = '';
    el.style.pointerEvents = '';
  }
  el.removeAttribute('title');
}

function applyListBlockHide(el) {
  if (!el) return;
  el.classList.remove('scout-blocked-dim');
  el.classList.add('scout-blocked-hide');
  try {
    el.style.setProperty('display', 'none', 'important');
    el.style.removeProperty('opacity');
    el.style.removeProperty('pointer-events');
  } catch (_) {
    el.style.display = 'none';
  }
}

function applyListBlockDim(el, titleText) {
  if (!el) return;
  el.classList.remove('scout-blocked-hide');
  el.classList.add('scout-blocked-dim');
  try {
    el.style.removeProperty('display');
    el.style.setProperty('opacity', '0.08', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
  } catch (_) {
    el.style.display = '';
    el.style.opacity = '0.08';
    el.style.pointerEvents = 'none';
  }
  if (titleText) el.title = titleText;
}

function applyListBlocks() {
  const blocks = getBlockList();
  const pubs = getPublishers();
  const els = getVideoElements();
  let blockedCount = 0;

  els.forEach(el => {
    const meta = parseVideoElement(el);
    if (!meta) return;

    let hitBlock = null;

    // 1. 匹配熟人关注与拉黑
    let pubLoved = false;
    if (meta.uploader) {
      const uploaderLower = meta.uploader.toLowerCase().trim();
      const matchedPub = pubs.find(p => p.name.toLowerCase().trim() === uploaderLower);
      if (matchedPub) {
        if (matchedPub.status === 'blocked') {
          applyListBlockHide(el);
          blockedCount++;
          return;
        } else if (matchedPub.status === 'loved') {
          pubLoved = true;
        }
      }
    }

    // 2. 匹配屏蔽词（整词/子串 + 标题/上传者；hide 优先）
    for (const b of blocks) {
      if (!blockMatchesVideo(meta, b)) continue;
      if (!hitBlock || b.mode === 'hide') {
        hitBlock = b;
        if (b.mode === 'hide') break;
      }
    }

    // 3. 执行过滤视觉呈现
    if (hitBlock) {
      blockedCount++;
      if (hitBlock.mode === 'hide') {
        applyListBlockHide(el);
      } else {
        const matchLabel = normalizeBlockMatch(hitBlock.match) === 'sub' ? '子串' : '整词';
        const scopeLabel = normalizeBlockScope(hitBlock.scope) === 'both'
          ? '标题+上传者'
          : normalizeBlockScope(hitBlock.scope) === 'uploader' ? '上传者' : '标题';
        applyListBlockDim(
          el,
          `已被弱屏蔽词 "${hitBlock.text}" 过滤 [${matchLabel}/${scopeLabel}] (原因: ${hitBlock.reason || '无'})`
        );
      }
    } else {
      clearListBlockPresentation(el);

      if (pubLoved) {
        el.classList.add('scout-pub-loved-card');
        if (!el.querySelector('.scout-pub-badge')) {
          const badge = document.createElement('div');
          badge.className = 'scout-pub-badge';
          badge.textContent = `★ ${meta.uploader}`;
          el.style.position = 'relative';
          el.appendChild(badge);
        }
      } else {
        el.classList.remove('scout-pub-loved-card');
        el.querySelector('.scout-pub-badge')?.remove();
      }
    }
  });

  const badge = document.querySelector('#jlc-wb-fab .jlc-wb-fab-badge');
  if (badge) {
    if (blockedCount > 0) {
      badge.textContent = blockedCount;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // 屏蔽之后再刷已点样式、点击绑定、词库命中流
  applyClickedEnhancements();
  enhanceListLexiconHitFlows();
}

/**
 * 列表影片链接：是否新标签打开（设置项 open_videos_new_tab）
 */
function applyVideoOpenMode() {
  const newTab = typeof isOpenVideosNewTab === 'function' ? isOpenVideosNewTab() : true;
  const els = getVideoElements();
  els.forEach(el => {
    if (!el || el.nodeType !== 1) return;
    el.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (!href || href === '#' || href.startsWith('javascript:')) return;
      // 只处理看起来像视频的链接
      if (
        !/\/video|\/video-|\/videos\//i.test(href) &&
        !a.closest('.thumb-block, .post, .video-block, [id^="video_"], .mb, .mb[data-id], #vidresults .mb')
      ) {
        return;
      }
      if (newTab) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
        if (a.dataset.scoutNewTabBound === '1') return;
        a.dataset.scoutNewTabBound = '1';
        a.addEventListener('click', (e) => {
          if (!isOpenVideosNewTab()) return;
          // 左键：强制新标签（部分站点忽略 target）
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          e.stopPropagation();
          openScoutUrl(a.href, { newTab: true });
        }, true);
      } else {
        a.removeAttribute('target');
      }
    });
  });
}

/**
 * 已点片库：列表灰显 + 点击即记（与 tracks 断点无关）
 */
function applyClickedEnhancements() {
  const site = detectSite();
  if (!site) return;
  const kind = detectPageKind();
  if (kind !== 'search' && kind !== 'other') return;

  const els = getVideoElements();
  els.forEach(el => {
    if (!el || el.nodeType !== 1) return;
    const meta = parseVideoElement(el);
    if (!meta || !meta.url) return;
    const videoId = videoIdFromUrl(meta.url);
    if (!videoId) return;

    if (isVideoClicked(site, videoId)) {
      el.classList.add('scout-visited-item');
    }

    if (el.dataset.scoutClickBound === '1') return;
    el.dataset.scoutClickBound = '1';

    const mark = () => {
      markVideoClicked({
        site,
        videoId,
        title: meta.title,
        url: meta.url,
        thumb: meta.thumb,
        uploader: meta.uploader
      });
      el.classList.add('scout-visited-item');
    };

    // 卡片内链接（含中键）；整卡 pointerdown 兜底
    el.querySelectorAll('a[href]').forEach(a => {
      a.addEventListener('pointerdown', mark, { passive: true });
      a.addEventListener('click', mark, { passive: true });
      a.addEventListener('auxclick', mark, { passive: true });
    });
    el.addEventListener('pointerdown', (e) => {
      // 避免与屏蔽控件等冲突：仅卡片主体
      if (e.target.closest('.scout-tag-addon, .scout-pub-addon, button, input')) return;
      mark();
    }, { passive: true });
  });

  applyVideoOpenMode();
}

/** 进入视频详情页时记为已点 */
function markCurrentVideoPageClicked() {
  if (detectPageKind() !== 'video') return;
  const site = detectSite();
  if (!site) return;
  const meta = scrapeVideoMeta();
  const url = (meta && meta.url) || location.href;
  const videoId = videoIdFromUrl(url);
  if (!videoId) return;
  markVideoClicked({
    site,
    videoId,
    title: meta && meta.title,
    url,
    thumb: meta && meta.thumb,
    uploader: meta && meta.uploader
  });
}

// 
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

// 
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

/**
 * 详情页：词库样式融进原生标签；
 * 手机：标签默认一行、描述默认两行，点按钮展开。
 */
function enhancePageLexiconHitFlow() {
  if (detectPageKind() !== 'video') return;
  const legacy = document.getElementById('scout-lex-hit-bar');
  if (legacy) legacy.remove();

  let isNarrow = false;
  try {
    isNarrow = !!(window.matchMedia && window.matchMedia('(max-width: 820px)').matches);
  } catch (_) {
    isNarrow = window.innerWidth <= 820;
  }

  // 标签容器：xvideos 用 video-metadata.video-tags-list；xnxx 用 metadata-row.video-tags
  const tagBoxes = document.querySelectorAll(
    [
      '.video-metadata.video-tags-list',
      '.video-metadata.ordered-label-list',
      '.metadata-row.video-tags',
      '.video-tags-list',
      '.ordered-label-list',
      '.video-tags'
    ].join(',')
  );

  // 描述容器（有则折叠；xnxx/xvideos 常见选择器）
  const descBoxes = document.querySelectorAll(
    [
      '.video-description',
      '#video-description',
      '[itemprop="description"]',
      '.metadata-row.video-description',
      'p.video-description',
      '.video-desc',
      '#video-desc',
      // xnxx 偶发长文案块
      '.clear-infobar .description',
      '#video-content-metadata .description'
    ].join(',')
  );

  if (!isNarrow) {
    tagBoxes.forEach((el) => {
      el.classList.remove('cropped', 'scout-tags-collapsed');
      el.classList.add('scout-tags-expanded');
      el.style.maxHeight = 'none';
      el.style.overflow = 'visible';
      el.style.height = 'auto';
    });
    descBoxes.forEach((el) => {
      el.classList.remove('scout-desc-collapsed');
      el.classList.add('scout-desc-expanded');
      el.style.maxHeight = '';
      el.style.overflow = '';
      el.style.webkitLineClamp = '';
    });
    document.getElementById('scout-tags-toggle')?.remove();
    document.getElementById('scout-desc-toggle')?.remove();
    return;
  }

  setupMobileDetailTagsCollapse(tagBoxes);
  setupMobileDetailDescCollapse(descBoxes);
}

function setupMobileDetailTagsCollapse(boxes) {
  const list = Array.from(boxes || []).filter(Boolean);
  // 不要把投票行 metadata-row.video-metadata 当成标签
  const tagsOnly = list.filter((el) => {
    const c = el.className || '';
    if (/video-tags|tags-list|ordered-label|is-keyword/i.test(c)) return true;
    if (/video-metadata/i.test(c) && !/video-tags/i.test(c) && el.querySelector('a.is-keyword')) {
      return true;
    }
    return !!el.querySelector('a.is-keyword, a[href^="/tags/"], a[href^="/tag/"]');
  });
  if (!tagsOnly.length) return;

  const box = tagsOnly[0];
  tagsOnly.forEach((el) => {
    el.classList.add('scout-tags-collapsed');
    el.classList.remove('scout-tags-expanded');
    el.style.maxHeight = '';
    el.style.overflow = '';
    el.style.height = '';
  });

  let toggle = document.getElementById('scout-tags-toggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'scout-tags-toggle';
    toggle.className = 'scout-tags-toggle';
    toggle.setAttribute('data-scout-ui', '1');
    if (box.parentNode) box.parentNode.insertBefore(toggle, box.nextSibling);
    else box.appendChild(toggle);
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const open = box.classList.contains('scout-tags-expanded');
      tagsOnly.forEach((el) => {
        el.classList.toggle('scout-tags-collapsed', open);
        el.classList.toggle('scout-tags-expanded', !open);
      });
      toggle.textContent = open ? '展开全部标签 ▾' : '收起标签 ▴';
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  }
  const open = box.classList.contains('scout-tags-expanded');
  toggle.textContent = open ? '收起标签 ▴' : '展开全部标签 ▾';
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function setupMobileDetailDescCollapse(boxes) {
  const list = Array.from(boxes || []).filter((el) => {
    if (!el) return false;
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    // 太短不折叠
    return text.length >= 60;
  });
  if (!list.length) {
    document.getElementById('scout-desc-toggle')?.remove();
    return;
  }

  const box = list[0];
  list.forEach((el) => {
    el.classList.add('scout-desc-collapsed');
    el.classList.remove('scout-desc-expanded');
  });

  let toggle = document.getElementById('scout-desc-toggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'scout-desc-toggle';
    toggle.className = 'scout-tags-toggle scout-desc-toggle';
    toggle.setAttribute('data-scout-ui', '1');
    if (box.parentNode) box.parentNode.insertBefore(toggle, box.nextSibling);
    else box.appendChild(toggle);
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const open = box.classList.contains('scout-desc-expanded');
      list.forEach((el) => {
        el.classList.toggle('scout-desc-collapsed', open);
        el.classList.toggle('scout-desc-expanded', !open);
      });
      toggle.textContent = open ? '展开描述 ▾' : '收起描述 ▴';
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  }
  const open = box.classList.contains('scout-desc-expanded');
  toggle.textContent = open ? '收起描述 ▴' : '展开描述 ▾';
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}

/**
 * 列表卡片：词库命中标签流
 * 列表词库命中流：叠在缩略图上（站点常裁切 .thumb-under）
 */
function enhanceListLexiconHitFlows() {
  try {
    if (detectPageKind() === 'video') return;
    const terms = getLexiconTerms().filter((t) => t && t.status !== 'retired');
    if (!terms.length) return;

    const els = getVideoElements();
    if (!els || !els.length) return;

    // 手机也要标签流；只允许把 relative 写在图容器上，绝不写到 .thumb-block 本身
    let isNarrow = false;
    try {
      isNarrow = !!(window.matchMedia && window.matchMedia('(max-width: 820px)').matches);
    } catch (_) { /* ignore */ }

    Array.from(els).forEach((el) => {
      if (!el || el.nodeType !== 1) return;
      if (el.closest && el.closest('#jlc-wb, #scout-lex-hit-bar')) return;

      const meta = parseVideoElement(el);
      // 标题可空：matchLexiconHits 仍会从 url slug 补伪标签；二者皆空才跳过
      if (!meta || (!compactText(meta.title) && !compactText(meta.url))) return;

      const slugTags = [];
      try {
        const path = new URL(meta.url, location.origin).pathname || '';
        const slug = path.split('/').filter(Boolean).pop() || '';
        // 整段 slug + 下划线/连字符分词
        const spaced = slug.replace(/[-_~.]+/g, ' ').replace(/\s+/g, ' ').trim();
        if (spaced) slugTags.push(spaced);
        spaced.split(/\s+/).forEach((w) => {
          const t = compactText(w);
          if (t.length >= 2) slugTags.push(t);
        });
      } catch (_) { /* ignore */ }

      const match = matchLexiconHits(
        {
          title: meta.title || '',
          tags: [].concat(meta.tags || [], slugTags),
          uploader: meta.uploader || '',
          url: meta.url || ''
        },
        { terms }
      );

      // 旧位置（thumb-under）里的节点清掉，避免重复
      el.querySelectorAll('.scout-lex-flow-card').forEach((n) => {
        if (!n.classList.contains('scout-lex-flow-overlay')) n.remove();
      });

      let flow = el.querySelector('.scout-lex-flow-overlay');
      if (!match.total) {
        if (flow) flow.remove();
        return;
      }

      // 叠在缩略图容器上（禁止落到卡片根节点，避免手机 float 标题散落）
      let thumbHost =
        el.querySelector('.thumb-inside') ||
        el.querySelector('.mbimg') ||
        el.querySelector('.mbcontent') ||
        el.querySelector('.thumb') ||
        el.querySelector('a[href*="/video"] img')?.parentElement ||
        el.querySelector('a[href*="/video"]')?.parentElement;
      if (!thumbHost || thumbHost === el) {
        // 再退一步：有图的 a，仍不要用整张 .thumb-block
        const imgA = el.querySelector('a[href*="/video"] img, a[href*="/video-"] img');
        thumbHost = (imgA && imgA.parentElement) || null;
      }
      if (!thumbHost || thumbHost === el) {
        if (flow) flow.remove();
        return;
      }
      try {
        const cs = window.getComputedStyle(thumbHost);
        if (cs.position === 'static') thumbHost.style.position = 'relative';
        // 图容器需可裁剪叠层，但不改 height/width（交给站点）
        if (cs.overflow === 'visible') thumbHost.style.overflow = 'hidden';
      } catch (_) {
        thumbHost.style.position = 'relative';
      }

      if (!flow) {
        flow = document.createElement('div');
        flow.className = 'scout-lex-flow-card scout-lex-flow scout-lex-flow-overlay';
        thumbHost.appendChild(flow);
      } else if (flow.parentNode !== thumbHost) {
        thumbHost.appendChild(flow);
      }

      // 强制可见：半透明底 + 白字芯片，盖在图上
      const maxH = isNarrow ? '36%' : '46%';
      const pad = isNarrow ? '3px' : '4px';
      const chipFs = isNarrow ? '9px' : '10px';
      flow.style.cssText = [
        'display:flex',
        'flex-wrap:wrap',
        'gap:3px',
        'align-items:flex-start',
        'position:absolute',
        'left:4px',
        'right:4px',
        'bottom:4px',
        'top:auto',
        'z-index:30',
        'margin:0',
        `padding:${pad}`,
        `max-height:${maxH}`,
        'overflow:hidden',
        'pointer-events:none',
        'background:linear-gradient(transparent,rgba(0,0,0,.78))',
        'border-radius:0 0 8px 8px',
        'box-sizing:border-box'
      ].join('!important;') + '!important;';

      flow.innerHTML = buildLexiconHitFlowHtml(match, {
        max: isNarrow ? 5 : 8,
        showCount: false
      });

      // 列表叠加：毛玻璃小胶囊（可两行，避免只看见 1 个）
      flow.style.maxHeight = isNarrow ? '38%' : '52%';
      flow.style.overflow = 'hidden';
      flow.querySelectorAll('.scout-lex-chip').forEach((chip) => {
        const base =
          'display:inline-flex!important;align-items:center!important;' +
          `padding:2px 7px!important;border-radius:999px!important;` +
          `font-size:${chipFs}!important;font-weight:650!important;line-height:1.2!important;` +
          'letter-spacing:.2px!important;backdrop-filter:blur(6px)!important;' +
          '-webkit-backdrop-filter:blur(6px)!important;' +
          'box-shadow:0 1px 3px rgba(0,0,0,.28)!important;';
        if (chip.classList.contains('is-more')) {
          chip.style.cssText =
            base +
            'color:rgba(255,255,255,.9)!important;background:rgba(255,255,255,.18)!important;' +
            'border:1px solid rgba(255,255,255,.28)!important;';
          return;
        }
        if (chip.classList.contains('is-loved')) {
          chip.style.cssText =
            base +
            'color:#fff!important;background:rgba(229,72,64,.92)!important;' +
            'border:1px solid rgba(255,180,160,.55)!important;';
        } else {
          chip.style.cssText =
            base +
            'color:#fff!important;background:rgba(20,22,28,.72)!important;' +
            'border:1px solid rgba(255,255,255,.22)!important;';
        }
      });
    });
  } catch (err) {
    console.warn('[Creamu Scout] list lexicon flow failed', err);
  }
}

// 
function applyTagVisualState(a, txt, terms, blocks) {
  const txtKey =
    typeof lexiconIdentityKey === 'function' ? lexiconIdentityKey(txt) : String(txt || '').toLowerCase().trim();
  let matchedTerm = terms.find(
    (t) =>
      t &&
      t.status !== 'retired' &&
      (typeof lexiconIdentityKey === 'function'
        ? lexiconIdentityKey(t.text)
        : String(t.text || '').toLowerCase().trim()) === txtKey
  );
  // 站内标签：用词库匹配补中文样式
  if (!matchedTerm && typeof matchLexiconHits === 'function') {
    try {
      const hit = matchLexiconHits({ title: '', tags: [txt], uploader: '' }, { terms });
      const h0 = hit && hit.hits && hit.hits[0];
      if (h0) {
        matchedTerm = terms.find(
          (t) => t && String(t.text || '').toLowerCase() === String(h0.text || '').toLowerCase()
        );
      }
    } catch (_) { /* ignore */ }
  }
  const matchedBlock = blocks.find((b) => textMatchesBlock(txt, b));
  const oldHeart = a.querySelector('.scout-tag-heart');
  let zhEl = a.querySelector('.scout-tag-zh');

  a.classList.remove(
    'scout-tag-explored',
    'scout-tag-loved',
    'scout-tag-blocked',
    'scout-tag-in',
    'scout-tag-out'
  );
  a.classList.add('scout-site-tag');

  if (matchedBlock) {
    if (oldHeart) oldHeart.remove();
    if (zhEl) zhEl.remove();
    a.classList.add('scout-tag-blocked');
    a.title = `已被屏蔽 (理由: ${matchedBlock.reason || '无'}, 模式: ${matchedBlock.mode === 'hide' ? '强隐藏' : '弱淡化'})`;
    return;
  }

  if (matchedTerm && matchedTerm.status !== 'retired') {
    a.classList.add('scout-tag-in', 'scout-tag-explored');
    if (matchedTerm.loved) a.classList.add('scout-tag-loved');
    const zh = compactText(matchedTerm.zh);
    a.title = zh
      ? `${matchedTerm.text} · ${zh} [${matchedTerm.type || ''}]`
      : `${matchedTerm.text} [${matchedTerm.type || ''}]`;
    if (zh) {
      if (!zhEl) {
        zhEl = document.createElement('span');
        zhEl.className = 'scout-tag-zh';
        a.appendChild(zhEl);
      }
      if (zhEl.textContent !== zh) zhEl.textContent = zh;
    } else if (zhEl) {
      zhEl.remove();
    }
    if (matchedTerm.loved) {
      if (!oldHeart) {
        const heartSpan = document.createElement('span');
        heartSpan.className = 'scout-tag-heart';
        heartSpan.textContent = '♥';
        heartSpan.setAttribute('aria-hidden', '1');
        a.insertBefore(heartSpan, a.firstChild);
      }
    } else if (oldHeart) {
      oldHeart.remove();
    }
    return;
  }

  if (oldHeart) oldHeart.remove();
  if (zhEl) zhEl.remove();
  a.classList.add('scout-tag-out');
  a.title = txt + '（未入库 · 点 ＋ 采集）';
}

function enhancePageTags() {
  const currentSite = detectSite();
  if (!currentSite) return;
  if (detectPageKind() !== 'video') return;

  window.__scoutUiMutating = true;
  try {
    // 词库命中流（中文标签流 + 心动）
    enhancePageLexiconHitFlow();

    let selector = '';
    if (currentSite === 'xvideos' || currentSite === 'xnxx') {
      selector =
        '.video-metadata a.is-keyword, .video-tags-list a.is-keyword, .ordered-label-list a.is-keyword, ' +
        '.video-metadata .video-tags a, .metadata-row .video-tags a, .video-tags a';
    } else if (currentSite === 'eporner') {
      selector =
        'a[href^="/tag/"], a[href^="/cat/"], .vit-pornstar a, .vit-category a, ' +
        '#video-tags a, .tag-container a, a.is-keyword, a.tag';
    }
    if (!selector) return;

    const meta = scrapeVideoMeta();
    const terms = getLexiconTerms();
    const blocks = getBlockList();

    document.querySelectorAll(selector).forEach(a => {
      if (a.querySelector('.scout-tag-addon')) {
        const txt = a.getAttribute('data-scout-tag') || '';
        if (txt) applyTagVisualState(a, txt, terms, blocks);
        return;
      }

      let txt =
        typeof tagTextFromAnchor === 'function'
          ? tagTextFromAnchor(a)
          : a.textContent
              .replace(/[♥❤️]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
      // 去掉我们嵌的中文 span / 操作钮文本
      const zhNode = a.querySelector('.scout-tag-zh');
      if (zhNode && zhNode.textContent && txt.endsWith(zhNode.textContent)) {
        txt = txt.slice(0, -zhNode.textContent.length).trim();
      }
      txt = txt.replace(/[＋✕+]/g, ' ').replace(/\s+/g, ' ').trim();
      if (typeof sanitizeLexiconText === 'function') txt = sanitizeLexiconText(txt);
      if (!txt || txt.startsWith('+') || /[＋✕]/.test(txt)) return;

      a.setAttribute('data-scout-tag', txt);

      applyTagVisualState(a, txt, terms, blocks);

      const wrapper = document.createElement('span');
      wrapper.className = 'scout-tag-addon';

      const addBtn = document.createElement('span');
      addBtn.textContent = '＋';
      addBtn.title = '采集入库（选分类/翻译）';
      addBtn.style.cssText = 'cursor:pointer;color:#8fd4a0;';
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showScoutCollectDialog({
          text: txt,
          sources: [{ site: currentSite, url: location.href, title: meta.title, at: new Date().toISOString() }],
          onSaved() {
            const activeBtn = document.querySelector('.jlc-wb-nav button.active');
            if (activeBtn && activeBtn.getAttribute('data-tab') === 'lexicon') renderLexiconPage();
            else if (activeBtn && activeBtn.getAttribute('data-tab') === 'combo') renderComboPage();
            // 清签名以允许词库条更新
            const bar = document.getElementById('scout-lex-hit-bar');
            if (bar) delete bar.dataset.hitSig;
            enhancePageTags();
          }
        });
      });

      const blockBtn = document.createElement('span');
      blockBtn.textContent = '✕';
      blockBtn.title = '弱屏蔽(点击) | 强隐藏(Shift+点击)';
      blockBtn.style.cssText = 'cursor:pointer;color:#f09088;';
      blockBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isShift = e.shiftKey;
        const targetMode = isShift ? 'hide' : 'dim';
        addBlockWord({
          text: txt,
          mode: targetMode,
          match: 'word',
          scope: 'title',
          reason: `自视频标签快捷添加 (${isShift ? '强隐藏' : '弱淡化'})`
        });
        showToast(`已加入屏蔽库: ${txt} (${isShift ? '彻底蒸发' : '弱淡化'})`, true);
        applyListBlocks();
        const activeBtn = document.querySelector('.jlc-wb-nav button.active');
        if (activeBtn && activeBtn.getAttribute('data-tab') === 'blocks') renderBlocksPage();
        else if (activeBtn && activeBtn.getAttribute('data-tab') === 'combo') renderComboPage();
        const bar = document.getElementById('scout-lex-hit-bar');
        if (bar) delete bar.dataset.hitSig;
        enhancePageTags();
      });

      wrapper.appendChild(addBtn);
      wrapper.appendChild(blockBtn);
      a.appendChild(wrapper);
    });
  } finally {
    // 延后清除，吞掉本轮 DOM 变更触发的 observer
    setTimeout(() => {
      window.__scoutUiMutating = false;
    }, 50);
  }
}

/**
 * 搜索页订阅追更入口
 * - PC：顶部细条
 * - 手机：FAB 旁小圆钮（不再铺底大横条）
 */
function enhanceSearchTrackSubscribe() {
  const site = typeof detectSite === 'function' ? detectSite() : null;
  if (!site || typeof detectPageKind !== 'function' || detectPageKind() !== 'search') {
    document.getElementById('scout-search-track-bar')?.remove();
    return;
  }

  const ctx = typeof parseSearchContext === 'function' ? parseSearchContext() : { query: '', url: location.href };
  const query = compactText(ctx && ctx.query);
  if (!query) {
    document.getElementById('scout-search-track-bar')?.remove();
    return;
  }

  let isNarrow = false;
  try {
    isNarrow = !!(window.matchMedia && window.matchMedia('(max-width: 820px)').matches);
  } catch (_) { /* ignore */ }

  const existing =
    typeof findTrackBySiteQuery === 'function' ? findTrackBySiteQuery(site, query) : null;
  const on = !!existing;
  const qShort = query.length > 28 ? query.slice(0, 26) + '…' : query;

  let bar = document.getElementById('scout-search-track-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'scout-search-track-bar';
    bar.setAttribute('data-scout-ui', '1');
    (document.body || document.documentElement).appendChild(bar);
  }
  bar.className = isNarrow ? 'scout-track-fab' : 'scout-track-banner';
  bar.classList.toggle('is-on', on);

  const doToggle = () => {
    if (on) {
      if (!confirm(`取消订阅「${query}」？断点会一并删除。`)) return;
      deleteTrack(existing.id);
      showToast('已取消搜索追更');
    } else {
      addTrack({
        site,
        query,
        label: query,
        url: (ctx && ctx.url) || location.href
      });
      if (typeof setupSearchClickTracking === 'function') setupSearchClickTracking();
      showToast('已订阅：' + qShort);
    }
    enhanceSearchTrackSubscribe();
    const active = document.querySelector('.jlc-wb-nav button.active');
    if (active && active.getAttribute('data-tab') === 'tracks' && typeof renderTracksPage === 'function') {
      renderTracksPage();
    }
    if (active && active.getAttribute('data-tab') === 'combo' && typeof renderComboPage === 'function') {
      renderComboPage();
    }
  };

  if (isNarrow) {
    // 手机：小圆钮，一点即订/取消；叠在工作台钮上方
    bar.innerHTML = '';
    bar.title = on ? `已订阅：${query}（点按取消）` : `订阅追更：${query}`;
    bar.setAttribute('role', 'button');
    bar.setAttribute('aria-label', on ? '取消搜索追更' : '订阅搜索追更');
    bar.innerHTML = `<span class="scout-track-fab-ico">${on ? '⭐' : '☆'}</span>`;
    bar.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      doToggle();
    };
    if (typeof dockMobileFabStack === 'function') dockMobileFabStack();
    return;
  }

  // PC：顶部细条
  bar.onclick = null;
  bar.removeAttribute('role');
  bar.innerHTML = `
    <span class="scout-track-banner-text" title="${escapeHtml(query)}">
      ${on ? '⭐ 已订阅' : '☆ 追更'} · <b>${escapeHtml(qShort)}</b>
    </span>
    <button type="button" id="scout-search-track-toggle" class="scout-track-banner-btn">
      ${on ? '取消' : '订阅'}
    </button>
  `;
  bar.querySelector('#scout-search-track-toggle')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    doToggle();
  });
}

/**
 * 详情页：收藏作品 → 作品列表 + 可选采集标签进词库
 * 醒目双行按钮（PC 贴标题下；手机加宽触控）
 */
function enhancePageWorkFavorite() {
  const currentSite = detectSite();
  if (!currentSite || detectPageKind() !== 'video') return;

  const meta = scrapeVideoMeta();
  const url = (meta && meta.url) || location.href;
  const videoId = videoIdFromUrl(url);
  if (!videoId) return;

  const host =
    document.querySelector('h2.page-title') ||
    document.querySelector('.page-title') ||
    document.querySelector('h1') ||
    document.querySelector('.video-metadata') ||
    document.querySelector('#video-info, .video-info, .title-container');
  if (!host) return;

  let wrap = document.getElementById('scout-work-fav-bar');
  let btn = document.getElementById('scout-work-fav-btn');

  const syncBtn = () => {
    const b = document.getElementById('scout-work-fav-btn');
    if (!b) return;
    const saved = isWorkSaved(currentSite, videoId);
    b.classList.toggle('is-saved', saved);
    b.setAttribute('aria-pressed', saved ? 'true' : 'false');
    const ico = b.querySelector('.scout-work-fav-ico');
    const label = b.querySelector('.scout-work-fav-label');
    const sub = b.querySelector('.scout-work-fav-sub');
    if (ico) ico.textContent = saved ? '★' : '☆';
    if (label) label.textContent = saved ? '已收藏' : '收藏作品';
    if (sub) sub.textContent = saved ? '点按更新 · 补采标签' : '入库作品 · 采集标签';
    b.title = saved
      ? '已在作品列表。再次点击可更新信息并补采标签'
      : '收藏到「作品」列表，并采集本页标签进词库';
  };

  if (wrap && btn) {
    syncBtn();
    return;
  }

  wrap = document.createElement('div');
  wrap.id = 'scout-work-fav-bar';
  wrap.className = 'scout-work-fav-bar';
  wrap.setAttribute('data-scout-ui', '1');

  btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'scout-work-fav-btn';
  btn.className = 'scout-work-fav-btn';
  btn.innerHTML =
    '<span class="scout-work-fav-ico" aria-hidden="true">☆</span>' +
    '<span class="scout-work-fav-text">' +
    '<span class="scout-work-fav-label">收藏作品</span>' +
    '<span class="scout-work-fav-sub">入库作品 · 采集标签</span>' +
    '</span>';

  syncBtn();

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const saved = isWorkSaved(currentSite, videoId);
    if (saved && !confirm('已在作品列表中。更新信息并再次采集标签？')) return;
    // 点击时重采（创建按钮时 poster/og 可能还没就绪 → thumb 空）
    const live = typeof scrapeVideoMeta === 'function' ? scrapeVideoMeta() : meta;
    const liveUrl = (live && live.url) || url;
    const liveId =
      (typeof videoIdFromUrl === 'function' ? videoIdFromUrl(liveUrl) : '') || videoId;
    const liveThumb =
      (live && live.thumb) ||
      (typeof pickDetailThumbUrl === 'function' ? pickDetailThumbUrl() : '') ||
      (meta && meta.thumb) ||
      '';
    const res = addWork(
      {
        site: currentSite,
        videoId: liveId,
        title: (live && live.title) || meta.title,
        url: liveUrl,
        thumb: liveThumb,
        thumbUrl: liveThumb,
        uploader: (live && live.uploader) || meta.uploader,
        tags: (live && live.tags) || meta.tags || []
      },
      { autoCollectTags: true }
    );
    syncBtn();
    if (res.work) {
      showToast(
        (res.added ? '已收藏作品' : '已更新作品') +
          (res.tagsCollected ? `，采集标签 ${res.tagsCollected} 个` : '') +
          (liveThumb ? '' : '（暂无封面，稍后再更）')
      );
      markVideoClicked({
        site: currentSite,
        videoId: liveId,
        title: (live && live.title) || meta.title,
        url: liveUrl,
        thumb: liveThumb,
        uploader: (live && live.uploader) || meta.uploader
      });
      // 异步把远程封面缓存成 dataURL（列表离线可显，防防盗链）
      if (
        liveThumb &&
        !/^data:image\//i.test(liveThumb) &&
        typeof cacheThumbToDataUrl === 'function' &&
        typeof updateWorkThumb === 'function'
      ) {
        const wid = res.work.id;
        cacheThumbToDataUrl(liveThumb).then((dataUrl) => {
          if (!dataUrl) return;
          if (updateWorkThumb(wid, dataUrl, liveThumb)) {
            const active = document.querySelector('.jlc-wb-nav button.active');
            if (active && active.getAttribute('data-tab') === 'works') {
              renderWorksPage();
            }
          }
        });
      }
      const active = document.querySelector('.jlc-wb-nav button.active');
      if (active && active.getAttribute('data-tab') === 'works') renderWorksPage();
      if (active && active.getAttribute('data-tab') === 'lexicon') renderLexiconPage();
      enhancePageTags();
    } else {
      showToast('收藏失败：无法识别作品 ID', true);
    }
  });

  wrap.appendChild(btn);
  if (host.parentNode) {
    host.parentNode.insertBefore(wrap, host.nextSibling);
  } else {
    host.appendChild(wrap);
  }
}

function enhancePagePublisher() {
  const currentSite = detectSite();
  if (!currentSite) return;
  const pageKind = detectPageKind();
  if (pageKind !== 'video') return;

  enhancePageWorkFavorite();
  
  const meta = scrapeVideoMeta();
  const pubName = meta.uploader;
  if (!pubName) return;
  
  let anchorEl = null;
  if (currentSite === 'xvideos' || currentSite === 'xnxx') {
    anchorEl = document.querySelector('.video-metadata .uploader a, a.uploader-tag, .video-metadata-uploader a');
  } else if (currentSite === 'eporner') {
    anchorEl = document.querySelector(
      'a[href*="/profile/"][title="Uploader"], a[href*="/profile/"], ' +
        '.publisher-name, .publisher a, a[href*="/channel/"], .post-channel a'
    );
  }
  
  if (!anchorEl) return;
  if (anchorEl.parentNode.querySelector('.scout-pub-addon')) return;
  
  const wrapper = document.createElement('span');
  wrapper.className = 'scout-pub-addon';
  wrapper.style.cssText = 'display:inline-flex;gap:4px;margin-left:8px;vertical-align:middle;font-size:12px;';
  
  const pubs = getPublishers();
  const matched = pubs.find(p => p.name.toLowerCase() === pubName.toLowerCase());
  
  const loveBtn = document.createElement('button');
  loveBtn.className = 'jlc-wb-btn ghost';
  loveBtn.style.cssText = 'padding:2px 8px;font-size:11.5px;height:24px;line-height:1;border-radius:6px;margin:0;cursor:pointer;';
  if (matched && matched.status === 'loved') {
    loveBtn.textContent = '❤️ 已关注熟人';
    loveBtn.style.background = '#e2f5e4';
    loveBtn.style.color = '#2f6b3a';
    loveBtn.style.borderColor = '#2f6b3a';
  } else {
    loveBtn.textContent = '❤️ 关注熟人';
  }
  
  loveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (matched && matched.status === 'loved') {
      deletePublisher(matched.id);
      showToast('已取消关注熟人');
    } else {
      addPublisher({ name: pubName, site: currentSite, status: 'loved' });
      showToast(`已关注熟人: ${pubName}`);
    }
    wrapper.remove();
    enhancePagePublisher();
  });
  
  const blockBtn = document.createElement('button');
  blockBtn.className = 'jlc-wb-btn danger';
  blockBtn.style.cssText = 'padding:2px 8px;font-size:11.5px;height:24px;line-height:1;border-radius:6px;margin:0;cursor:pointer;';
  if (matched && matched.status === 'blocked') {
    blockBtn.textContent = '🚫 已拉黑';
  } else {
    blockBtn.textContent = '✕ 拉黑';
  }
  
  blockBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (matched && matched.status === 'blocked') {
      deletePublisher(matched.id);
      showToast('已解除拉黑');
    } else {
      addPublisher({ name: pubName, site: currentSite, status: 'blocked' });
      showToast(`已拉黑该频道: ${pubName}`, true);
    }
    wrapper.remove();
    enhancePagePublisher();
  });
  
  wrapper.appendChild(loveBtn);
  wrapper.appendChild(blockBtn);
  anchorEl.parentNode.insertBefore(wrapper, anchorEl.nextSibling);
}

// 
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
                <button type="button" class="jlc-wb-btn ghost scout-track-site-open" style="padding:3px 8px;font-size:11px;">续看</button>
                <button type="button" class="jlc-wb-btn danger scout-track-site-del" style="padding:3px 8px;font-size:11px;">取消</button>
              </div>`;
          }
          return `
            <div class="scout-track-site-row${isCur ? ' is-current' : ''}" data-site="${escapeHtml(sid)}">
              <span class="jlc-site-pill is-empty">${escapeHtml(short)}${isCur ? ' ·本站' : ''}</span>
              <span class="scout-track-site-meta">未订阅</span>
              <button type="button" class="jlc-wb-btn ghost scout-track-site-search" style="padding:3px 8px;font-size:11px;">去搜</button>
            </div>`;
        })
        .join('');

      listHtml += `
        <div class="jlc-wb-item scout-track-group" data-group-key="${escapeHtml(g.key)}">
          <div class="jlc-wb-item-row">
            <div class="jlc-wb-item-body">
              <div class="jlc-wb-item-title-row">
                <span class="jlc-wb-item-title" style="color:var(--scout-theme-color);">⭐ ${escapeHtml(g.label)}</span>
                <span class="jlc-site-pill">${g.siteCount} 站</span>
              </div>
              <div class="scout-track-site-pills" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${sitePills}</div>
              <div class="jlc-wb-item-meta-line" style="font-size:12px;margin-top:4px;">
                查询: <b>${escapeHtml(g.query)}</b>
              </div>
              <div class="jlc-wb-item-meta-line" style="font-size:11px;color:#a89078;">
                ${escapeHtml(curMeta)}${timeStr ? ' | ' + escapeHtml(timeStr) : ''}
              </div>
            </div>
            <div class="jlc-wb-item-side">
              <button type="button" class="jlc-wb-open-btn scout-track-open-btn" style="min-width:54px;padding:6px 12px;font-size:12px;" title="优先当前站断点">续看</button>
              <button type="button" class="jlc-wb-btn ghost scout-track-expand-btn" style="min-width:54px;padding:4px 8px;font-size:11px;margin-top:4px;">站点</button>
              <button type="button" class="jlc-wb-more-btn scout-track-more-btn">•••</button>
            </div>
          </div>
          <div class="scout-track-group-sites">${rowsHtml}</div>
          <div class="jlc-wb-item-edit scout-track-edit">
            <div style="display:flex;justify-content:flex-end;gap:8px;width:100%;flex-wrap:wrap;border-top:1px dashed #efe0cc;padding-top:8px;margin-top:6px;">
              ${curTrack ? '<button type="button" class="jlc-wb-btn danger scout-track-del-current-btn" style="padding:4px 10px;font-size:12px;">取消当前站</button>' : ''}
              <button type="button" class="jlc-wb-btn danger scout-track-delete-btn" style="padding:4px 10px;font-size:12px;">删除整组</button>
              <button type="button" class="jlc-wb-btn ghost scout-track-cancel-btn" style="padding:4px 10px;font-size:12px;">取消</button>
            </div>
          </div>
        </div>`;
    });
  }

  container.innerHTML = `
    <div class="jlc-wb-list-scroll" style="padding-top:14px;">
      <div class="legacy-note" style="margin:0 14px 10px;line-height:1.45;">
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
        ? `<span class="jlc-status-pill tone-red scout-toggle-mode-btn" style="font-size:10px;padding:1px 6px;cursor:pointer;" data-id="${b.id}" title="点击切换为弱淡化">🚫 强隐藏</span>`
        : `<span class="jlc-status-pill tone-yellow scout-toggle-mode-btn" style="font-size:10px;padding:1px 6px;cursor:pointer;background:#ffe8c2;color:#b54708;border-color:#f5c77a;" data-id="${b.id}" title="点击切换为强隐藏">🌁 弱淡化</span>`;
      const matchBadge = `<span class="jlc-status-pill scout-toggle-match-btn" style="font-size:10px;padding:1px 6px;cursor:pointer;background:#efe4d2;color:#6b4a2e;" data-id="${b.id}" title="点击切换 整词/子串">${isSub ? '⊂ 子串' : '⬚ 整词'}</span>`;
      const scopeBadge = `<span class="jlc-status-pill scout-toggle-scope-btn" style="font-size:10px;padding:1px 6px;cursor:pointer;background:#e7f1ff;color:#175cd3;" data-id="${b.id}" title="点击切换匹配范围">${escapeHtml(scopeLabel)}</span>`;

      listHtml += `
        <div class="person-item" style="border-radius:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div style="min-width:0;flex:1;">
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px;">
              <b style="color:#b42318;">${escapeHtml(b.text)}</b>${escapeHtml(zhPart)}
              ${modeBadge}${matchBadge}${scopeBadge}
            </div>
            <div style="font-size:11px;color:#9a7d60;margin-top:4px;">${escapeHtml(reasonPart)}</div>
          </div>
          <span class="remove" data-id="${b.id}" title="取消屏蔽" style="color:#b42318;font-weight:bold;cursor:pointer;font-size:16px;flex:0 0 auto;">✕</span>
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
        <input type="text" class="jlc-wb-search" id="scout-add-block-text" placeholder="屏蔽词..." style="flex:1.5;padding:8px;font-size:13px;">
        <input type="text" class="jlc-wb-search" id="scout-add-block-zh" placeholder="中文翻译..." style="flex:1;padding:8px;font-size:13px;">
        <input type="text" class="jlc-wb-search" id="scout-add-block-reason" placeholder="屏蔽理由..." style="flex:100%;padding:8px;font-size:13px;margin-top:4px;">

        <div style="display:flex;align-items:center;gap:10px;width:100%;margin-top:4px;padding:0 4px;flex-wrap:wrap;">
          <span style="font-size:12px;color:#7a5a3c;font-weight:bold;">效果:</span>
          <label style="display:inline-flex;align-items:center;font-size:12.5px;cursor:pointer;margin-top:0;text-transform:none;letter-spacing:0;">
            <input type="radio" name="scout-add-block-mode" value="dim" checked style="width:15px;height:15px;margin-right:4px;accent-color:var(--scout-theme-color);"> 弱淡化
          </label>
          <label style="display:inline-flex;align-items:center;font-size:12.5px;cursor:pointer;margin-top:0;text-transform:none;letter-spacing:0;">
            <input type="radio" name="scout-add-block-mode" value="hide" style="width:15px;height:15px;margin-right:4px;accent-color:var(--scout-theme-color);"> 强隐藏
          </label>
        </div>
        <div style="display:flex;align-items:center;gap:10px;width:100%;padding:0 4px;flex-wrap:wrap;">
          <span style="font-size:12px;color:#7a5a3c;font-weight:bold;">匹配:</span>
          <label style="display:inline-flex;align-items:center;font-size:12.5px;cursor:pointer;margin-top:0;text-transform:none;letter-spacing:0;">
            <input type="radio" name="scout-add-block-match" value="word" checked style="width:15px;height:15px;margin-right:4px;accent-color:var(--scout-theme-color);"> 整词
          </label>
          <label style="display:inline-flex;align-items:center;font-size:12.5px;cursor:pointer;margin-top:0;text-transform:none;letter-spacing:0;">
            <input type="radio" name="scout-add-block-match" value="sub" style="width:15px;height:15px;margin-right:4px;accent-color:var(--scout-theme-color);"> 子串
          </label>
          <span style="font-size:12px;color:#7a5a3c;font-weight:bold;margin-left:6px;">范围:</span>
          <label style="display:inline-flex;align-items:center;font-size:12.5px;cursor:pointer;margin-top:0;text-transform:none;letter-spacing:0;">
            <input type="radio" name="scout-add-block-scope" value="title" checked style="width:15px;height:15px;margin-right:4px;accent-color:var(--scout-theme-color);"> 标题
          </label>
          <label style="display:inline-flex;align-items:center;font-size:12.5px;cursor:pointer;margin-top:0;text-transform:none;letter-spacing:0;">
            <input type="radio" name="scout-add-block-scope" value="uploader" style="width:15px;height:15px;margin-right:4px;accent-color:var(--scout-theme-color);"> 上传者
          </label>
          <label style="display:inline-flex;align-items:center;font-size:12.5px;cursor:pointer;margin-top:0;text-transform:none;letter-spacing:0;">
            <input type="radio" name="scout-add-block-scope" value="both" style="width:15px;height:15px;margin-right:4px;accent-color:var(--scout-theme-color);"> 两者
          </label>
        </div>

        <button class="jlc-wb-btn primary" id="scout-add-block-btn" style="flex:1;margin-top:6px;padding:8px;justify-content:center;">添加屏蔽</button>
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
}

// 
function setScoutSettingsOpen(open, tab) {
  const drawer = document.getElementById('jlc-wb-settings');
  if (!drawer) return;
  drawer.classList.toggle('is-open', !!open);
  if (open) {
    renderScoutSettingsSection(tab || 'overview');
  }
}

function renderScoutSettingsSection(tab) {
  const t = tab || 'overview';
  document.querySelectorAll('[data-scout-settings-tab]').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-scout-settings-tab') === t);
  });
  renderSettingsPage(t);
}

function renderSettingsPage(section) {
  const container = document.getElementById('scout-settings-body');
  if (!container) return;
  const sec = section || 'overview';

  const cfg = getConfig();
  const terms = getLexiconTerms();
  const blocks = getBlockList();
  const tracks = getTracks();
  const pubs = getPublishers();
  const clickCount = typeof getClickedCount === 'function' ? getClickedCount() : 0;

  const statusStr = scoutSync ? scoutSync.statusText() : '未加载同步模块';
  let html = '';

  if (sec === 'ui') {
    html = `
      <h3>站点界面</h3>
      <div class="legacy-row">
        <label class="legacy-toggle">
          <span>站点奶油主题</span>
          <input type="checkbox" id="scout-cfg-cream-site" ${cfg.cream_site_theme !== false ? 'checked' : ''}>
        </label>
      </div>
      <div class="legacy-note" style="margin-top:8px;line-height:1.5;">
        开启后重绘三站底色、顶栏、列表卡片（非统一奶油）。<br>
        <b>xvideos 暖红 · xnxx 冷蓝 · eporner 叶绿</b>。卡片用站点色，不用白底。关闭=原生样式。
      </div>
      <h3 style="margin-top:16px;">浏览</h3>
      <div class="legacy-row">
        <label class="legacy-toggle">
          <span>新标签打开影片</span>
          <input type="checkbox" id="scout-cfg-open-new-tab" ${cfg.open_videos_new_tab !== false ? 'checked' : ''}>
        </label>
      </div>
      <div class="legacy-note" style="margin-top:8px;">开启后列表点影片在新标签打开，不离开当前搜索页。组合搜索同样用新标签。</div>
      <div class="legacy-row" style="margin-top:12px;">
        <label class="legacy-toggle">
          <span>关闭站点自动预览</span>
          <input type="checkbox" id="scout-cfg-block-site-preview" ${cfg.block_site_auto_preview !== false ? 'checked' : ''}>
        </label>
      </div>
      <div class="legacy-note" style="margin-top:8px;line-height:1.5;">
        关闭站点列表自动播放预览，减轻下滑卡顿。<br>
        点缩略图的手动预览仍可用。
      </div>
    `;
  } else if (sec === 'overview') {
    html = `
      <h3>数据概况</h3>
      <div class="stat-box">
        <div class="stat-item"><b>${terms.filter(t => t.status !== 'retired').length}</b><span>词库</span></div>
        <div class="stat-item"><b>${blocks.length}</b><span>屏蔽</span></div>
        <div class="stat-item"><b>${pubs.length}</b><span>熟人</span></div>
        <div class="stat-item"><b>${tracks.length}</b><span>追更</span></div>
      </div>
      <div class="stat-box" style="margin-top:10px;">
        <div class="stat-item"><b>${typeof getWorks === 'function' ? getWorks().length : 0}</b><span>作品</span></div>
        <div class="stat-item"><b>${clickCount}</b><span>已点</span></div>
        <div class="stat-item" style="flex:2;text-align:left;padding:0 8px;">
          <span style="display:block;font-size:12px;color:#9a7d60;line-height:1.45;text-transform:none;letter-spacing:0;">
            已点 = 点过的片（灰显）· 断点 = 收藏搜索 last_seen
          </span>
        </div>
      </div>
      <button type="button" class="jlc-wb-btn ghost" id="scout-clear-clicks-btn" style="margin-top:12px;width:100%;">清空已点记录</button>
      <button type="button" class="jlc-wb-btn ghost" id="scout-purge-block-terms-btn" style="margin-top:8px;width:100%;">清理词库中的屏蔽词</button>
      <div class="legacy-note" style="margin-top:6px;">把「已在屏蔽表」或 note 写「用于屏蔽」的条目移出词库，只留在屏蔽里。</div>
    `;
  } else if (sec === 'backup') {
    html = `
      <h3>词库+屏蔽（给 AI）</h3>
      <div class="legacy-note" style="margin:0 0 8px;line-height:1.45;">
        推荐：点「复制给 AI」= 提示词 + 数据包，直接粘贴对话。<br>
        回填后整段 JSON 粘到下方点「覆盖导入」。<br>
        <b>覆盖</b>＝以包为准（包外旧词会删），<b>同词保留本地热度/use</b>。<br>
        「合并」只增补不删旧词。不含熟人/断点/已点。
      </div>
      <textarea id="scout-ai-textarea" style="width:100%;height:120px;font-family:monospace;font-size:11.5px;padding:8px;border-radius:12px;border:1px solid #e4d4bc;" placeholder="词库+屏蔽 JSON…"></textarea>
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
        <button class="jlc-wb-btn primary" id="scout-ai-copy-chat" style="flex:1.4;min-width:100px;">📋 复制给 AI</button>
        <button class="jlc-wb-btn ghost" id="scout-ai-copy-prompt" style="flex:1;min-width:80px;">只复制提示词</button>
      </div>
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
        <button class="jlc-wb-btn ghost" id="scout-ai-export" style="flex:1;min-width:70px;">导出JSON</button>
        <button class="jlc-wb-btn ghost" id="scout-ai-copy" style="flex:1;min-width:70px;">复制JSON</button>
        <button class="jlc-wb-btn ghost" id="scout-ai-import" style="flex:1.2;min-width:80px;color:#b54708;">覆盖导入</button>
        <button class="jlc-wb-btn ghost" id="scout-ai-import-merge" style="flex:1;min-width:70px;">合并</button>
        <button class="jlc-wb-btn ghost" id="scout-ai-clip" style="flex:1;min-width:70px;color:#b54708;">剪贴板覆盖</button>
      </div>

      <h3 style="margin-top:16px;">完整备份</h3>
      <div class="legacy-note" style="margin:0 0 8px;">词库+屏蔽+熟人+断点+已点</div>
      <textarea id="scout-backup-textarea" style="width:100%;height:72px;font-family:monospace;font-size:11.5px;padding:8px;border-radius:12px;border:1px solid #e4d4bc;" placeholder="完整 JSON…"></textarea>
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
        <button class="jlc-wb-btn ghost" id="scout-export-btn" style="flex:1;min-width:70px;">导出</button>
        <button class="jlc-wb-btn ghost" id="scout-copy-btn" style="flex:1;min-width:70px;">复制</button>
        <button class="jlc-wb-btn ghost" id="scout-import-btn" style="flex:1;min-width:70px;color:#b54708;">导入</button>
        <button class="jlc-wb-btn ghost" id="scout-import-clipboard-btn" style="flex:1;min-width:70px;color:#b54708;">剪贴板</button>
      </div>
    `;
  } else {
    html = `
      <h3>WebDAV 同步</h3>
      <div class="legacy-row">
        <label class="legacy-toggle">
          <span>启用同步</span>
          <input type="checkbox" id="scout-wd-enabled" ${cfg.webdav_enabled ? 'checked' : ''}>
        </label>
      </div>
      <div id="scout-wd-form" style="${cfg.webdav_enabled ? '' : 'display:none;'}">
        <label>服务器地址</label>
        <input type="text" id="scout-wd-url" value="${escapeHtml(cfg.webdav_url)}" placeholder="https://dav.jianguoyun.com/dav/">
        <label>用户名</label>
        <input type="text" id="scout-wd-user" value="${escapeHtml(cfg.webdav_user)}" placeholder="example@email.com">
        <label>应用密码</label>
        <input type="password" id="scout-wd-password" value="${escapeHtml(cfg.webdav_password)}" placeholder="应用密码">
        <label>远端路径</label>
        <input type="text" id="scout-wd-path" value="${escapeHtml(cfg.webdav_path)}" placeholder="/Creamu">
        <div class="legacy-row" style="margin-top:12px;">
          <label class="legacy-toggle">
            <span>自动同步 (约 8 秒)</span>
            <input type="checkbox" id="scout-wd-auto" ${cfg.webdav_auto !== false ? 'checked' : ''}>
          </label>
        </div>
        <label>冲突策略</label>
        <select id="scout-wd-conflict">
          <option value="ask" ${cfg.webdav_conflict === 'ask' ? 'selected' : ''}>询问</option>
          <option value="local" ${cfg.webdav_conflict === 'local' ? 'selected' : ''}>本机优先</option>
          <option value="remote" ${cfg.webdav_conflict === 'remote' ? 'selected' : ''}>云端优先</option>
        </select>
        <div class="legacy-note" style="margin-top:10px;word-break:break-all;">
          <b>状态</b><br><span id="scout-wd-status-text">${escapeHtml(statusStr)}</span>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;">
          <button class="jlc-wb-btn ghost" id="scout-wd-test-btn" style="flex:1;">测试连接</button>
          <button class="jlc-wb-btn primary" id="scout-wd-sync-btn" style="flex:1;">手动同步</button>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  const refresh = () => renderScoutSettingsSection(sec);
  const textBackup = container.querySelector('#scout-backup-textarea');

  container.querySelector('#scout-cfg-cream-site')?.addEventListener('change', (e) => {
    const curCfg = getConfig();
    curCfg.cream_site_theme = !!e.currentTarget.checked;
    saveConfig(curCfg); // 内含 applyScoutSiteTheme
    showToast(curCfg.cream_site_theme ? '已开启站点主题' : '已关闭站点主题');
  });

  container.querySelector('#scout-cfg-open-new-tab')?.addEventListener('change', (e) => {
    const curCfg = getConfig();
    curCfg.open_videos_new_tab = !!e.currentTarget.checked;
    saveConfig(curCfg);
    showToast(curCfg.open_videos_new_tab ? '影片将在新标签打开' : '影片将在当前页打开');
  });

  container.querySelector('#scout-cfg-block-site-preview')?.addEventListener('change', (e) => {
    const curCfg = getConfig();
    curCfg.block_site_auto_preview = !!e.currentTarget.checked;
    saveConfig(curCfg);
    if (typeof applyBlockSiteAutoPreviewMode === 'function') {
      try { applyBlockSiteAutoPreviewMode(); } catch (_) { /* ignore */ }
    } else if (typeof pauseSiteListPreviewVideos === 'function') {
      try { pauseSiteListPreviewVideos(); } catch (_) { /* ignore */ }
    }
    showToast(curCfg.block_site_auto_preview ? '已关闭站点自动预览' : '已恢复站点自动预览');
  });

  const copyText = (data, ta) => {
    if (typeof GM_setClipboard === 'function') {
      GM_setClipboard(data);
      showToast('已复制到剪贴板');
    } else if (ta) {
      ta.value = data;
      ta.select();
      document.execCommand('copy');
      showToast('已全选，请 Ctrl+C');
    }
  };
  const readClip = async () => {
    if (navigator.clipboard && navigator.clipboard.readText) {
      return await navigator.clipboard.readText();
    }
    return '';
  };

  const aiTa = container.querySelector('#scout-ai-textarea');
  const afterAiImport = (r) => {
    if (!r) return;
    const modeLabel = r.mode === 'merge' ? '已合并' : '已覆盖';
    let msg = `${modeLabel}：词库 ${r.terms || 0} · 屏蔽 ${r.blocks || 0}`;
    if (r.keptStats) msg += ` · 保留热度 ${r.keptStats}`;
    if (r.removed) msg += ` · 移除旧词 ${r.removed}`;
    if (r.diverted) msg += ` · 改道屏蔽 ${r.diverted}`;
    if (r.purged) msg += ` · 已从词库清除 ${r.purged}`;
    if (r.dedupedTerms) msg += ` · 压重复词 ${r.dedupedTerms}`;
    if (r.dedupedBlocks) msg += ` · 压重复屏蔽 ${r.dedupedBlocks}`;
    showToast(msg);
    renderLexiconPage();
    renderComboPage();
    applyListBlocks();
    renderBlocksPage();
  };
  container.querySelector('#scout-ai-copy-chat')?.addEventListener('click', () => {
    const blob = exportAiLexiconForChat();
    if (aiTa) aiTa.value = exportAiLexiconPackage();
    copyText(blob, null);
    showToast('已复制：提示词 + 数据包（粘贴给 AI）');
  });
  container.querySelector('#scout-ai-copy-prompt')?.addEventListener('click', () => {
    copyText(getScoutAiPromptText(), null);
    showToast('已复制 AI 提示词');
  });
  container.querySelector('#scout-ai-export')?.addEventListener('click', () => {
    if (!aiTa) return;
    aiTa.value = exportAiLexiconPackage();
    showToast('词库+屏蔽已导出');
  });
  container.querySelector('#scout-ai-copy')?.addEventListener('click', () => {
    copyText(exportAiLexiconPackage(), aiTa);
  });
  container.querySelector('#scout-ai-import')?.addEventListener('click', () => {
    const val = (aiTa && aiTa.value.trim()) || '';
    if (!val) return showToast('文本框为空', true);
    if (!confirm('覆盖导入词库+屏蔽？\n· 以包为准，包里没有的旧词会删掉\n· 同词保留本地 heat / use / good / bad')) return;
    afterAiImport(importAiLexiconPackage(val, { mode: 'replace' }));
  });
  container.querySelector('#scout-ai-import-merge')?.addEventListener('click', () => {
    const val = (aiTa && aiTa.value.trim()) || '';
    if (!val) return showToast('文本框为空', true);
    if (!confirm('合并导入？（只增补/更新，不删本地旧词）')) return;
    afterAiImport(importAiLexiconPackage(val, { mode: 'merge' }));
  });
  container.querySelector('#scout-ai-clip')?.addEventListener('click', async () => {
    if (!confirm('从剪贴板覆盖导入词库+屏蔽？\n同词保留本地热度，包外旧词删除。')) return;
    try {
      const text = await readClip();
      if (!text) return showToast('剪贴板为空', true);
      if (aiTa) aiTa.value = text;
      afterAiImport(importAiLexiconPackage(text, { mode: 'replace' }));
    } catch (_) {
      showToast('读取剪贴板失败', true);
    }
  });

  container.querySelector('#scout-clear-clicks-btn')?.addEventListener('click', () => {
    if (!confirm('确定清空全部「已点」记录？不影响词库、屏蔽与追更断点。')) return;
    clearAllClicks();
    showToast('已点记录已清空');
    document.querySelectorAll('.scout-visited-item').forEach(el => el.classList.remove('scout-visited-item'));
    refresh();
  });

  container.querySelector('#scout-purge-block-terms-btn')?.addEventListener('click', () => {
    if (!confirm('从词库移除：已在屏蔽表中的词，以及标记「用于屏蔽」的词？')) return;
    const n = purgeBlockedTermsFromLexicon();
    showToast(n ? `已从词库清除 ${n} 条（仅保留在屏蔽）` : '词库中没有需要清理的屏蔽词');
    renderLexiconPage();
    renderComboPage();
    renderBlocksPage();
    refresh();
  });

  container.querySelector('#scout-export-btn')?.addEventListener('click', () => {
    if (!textBackup) return;
    textBackup.value = exportLexiconPackage();
    showToast('已导出（词库/屏蔽/熟人/断点/已点）');
  });

  container.querySelector('#scout-import-btn')?.addEventListener('click', () => {
    const val = (textBackup && textBackup.value.trim()) || '';
    if (!val) return showToast('文本框为空', true);
    if (!confirm('确定从文本框导入并合并？')) return;
    if (importLexiconPackage(val)) {
      showToast('导入成功');
      refresh();
    }
  });

  container.querySelector('#scout-copy-btn')?.addEventListener('click', () => {
    const data = exportLexiconPackage();
    if (typeof GM_setClipboard === 'function') {
      GM_setClipboard(data);
      showToast('已复制到剪贴板');
    } else if (textBackup) {
      textBackup.value = data;
      textBackup.select();
      document.execCommand('copy');
      showToast('已全选，请 Ctrl+C');
    }
  });

  container.querySelector('#scout-import-clipboard-btn')?.addEventListener('click', async () => {
    if (!confirm('从剪贴板导入并合并？')) return;
    try {
      const text = (navigator.clipboard && navigator.clipboard.readText)
        ? await navigator.clipboard.readText()
        : '';
      if (!text) return showToast('剪贴板为空，请手动粘贴后导入', true);
      if (importLexiconPackage(text)) {
        showToast('剪贴板导入成功');
        refresh();
      }
    } catch (_) {
      showToast('读取剪贴板失败', true);
    }
  });

  const wdEnabledCb = container.querySelector('#scout-wd-enabled');
  const wdForm = container.querySelector('#scout-wd-form');
  wdEnabledCb?.addEventListener('change', () => {
    const curCfg = getConfig();
    curCfg.webdav_enabled = !!wdEnabledCb.checked;
    saveConfig(curCfg);
    if (wdForm) wdForm.style.display = curCfg.webdav_enabled ? '' : 'none';
    initScoutWebDav();
    refresh();
  });

  ['scout-wd-url', 'scout-wd-user', 'scout-wd-password', 'scout-wd-path', 'scout-wd-conflict'].forEach((id) => {
    const el = container.querySelector('#' + id);
    if (!el) return;
    el.addEventListener('change', () => {
      const curCfg = getConfig();
      const q = (sid) => container.querySelector('#' + sid);
      curCfg.webdav_url = (q('scout-wd-url')?.value || '').trim();
      curCfg.webdav_user = (q('scout-wd-user')?.value || '').trim();
      curCfg.webdav_password = q('scout-wd-password')?.value || '';
      curCfg.webdav_path = (q('scout-wd-path')?.value || '').trim();
      curCfg.webdav_conflict = q('scout-wd-conflict')?.value || 'ask';
      saveConfig(curCfg);
      initScoutWebDav();
      const st = container.querySelector('#scout-wd-status-text');
      if (st && scoutSync) st.textContent = scoutSync.statusText();
    });
  });

  container.querySelector('#scout-wd-auto')?.addEventListener('change', (e) => {
    const curCfg = getConfig();
    curCfg.webdav_auto = !!e.currentTarget.checked;
    saveConfig(curCfg);
    initScoutWebDav();
  });

  container.querySelector('#scout-wd-test-btn')?.addEventListener('click', async () => {
    const testBtn = container.querySelector('#scout-wd-test-btn');
    if (!testBtn) return;
    testBtn.disabled = true;
    testBtn.textContent = '测试中…';
    try {
      if (!scoutSync) throw new Error('同步实例未就绪');
      await scoutSync.testConnection();
    } catch (e) {
      showToast(e.message || '测试失败', true);
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = '测试连接';
      const st = container.querySelector('#scout-wd-status-text');
      if (st && scoutSync) st.textContent = scoutSync.statusText();
    }
  });

  container.querySelector('#scout-wd-sync-btn')?.addEventListener('click', async () => {
    const syncBtn = container.querySelector('#scout-wd-sync-btn');
    if (!syncBtn) return;
    syncBtn.disabled = true;
    syncBtn.textContent = '同步中…';
    try {
      if (!scoutSync) throw new Error('同步实例未就绪');
      await scoutSync.syncNow();
      renderLexiconPage();
      renderBlocksPage();
      renderPublishersPage();
      renderTracksPage();
      renderComboPage();
    } catch (e) {
      showToast(e.message || '同步出错', true);
    } finally {
      syncBtn.disabled = false;
      syncBtn.textContent = '手动同步';
      refresh();
    }
  });
}

// 
function initScoutWorkbench() {
  if (typeof injectCreamuWorkbenchStyles === 'function') {
    injectCreamuWorkbenchStyles({
      styleId: 'scout-wb-style',
      extraCss: typeof getScoutThemeCss === 'function' ? getScoutThemeCss() : ''
    });
  }

  let fab = document.getElementById('jlc-wb-fab');
  if (!fab) {
    fab = document.createElement('div');
    fab.id = 'jlc-wb-fab';
    fab.innerHTML = '<span class="jlc-wb-fab-badge">0</span>🧭';
    document.body.appendChild(fab);
  }

  if (!isScoutNarrowViewport()) {
    const fabPos = GM_getValue('scout_fab_pos', null);
    if (fabPos && (fabPos.left != null || fabPos.top != null)) {
      fab.style.left = fabPos.left;
      fab.style.top = fabPos.top;
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
    }
  }
  clampScoutFabPosition(fab);
  dockMobileFabStack();
  if (!window.__scoutFabDockBound) {
    window.__scoutFabDockBound = true;
    window.addEventListener('resize', () => {
      clampScoutFabPosition(document.getElementById('jlc-wb-fab'));
      dockMobileFabStack();
    }, { passive: true });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        clampScoutFabPosition(document.getElementById('jlc-wb-fab'));
        dockMobileFabStack();
      }, 120);
    }, { passive: true });
  }

  let wb = document.getElementById('jlc-wb');
  if (!wb) {
    wb = document.createElement('div');
    wb.id = 'jlc-wb';
    wb.innerHTML = `
      <div class="jlc-wb-resize-w"></div>
      <div class="jlc-wb-resize-h"></div>
      <div class="jlc-wb-resize-corner"></div>

      <div class="jlc-wb-header">
        <div>
          <div class="jlc-wb-title">Creamu · Scout</div>
          <div class="jlc-wb-subtitle">欧美发现工作台 v${SCOUT_VERSION}</div>
        </div>
        <div class="jlc-wb-header-actions">
          <button type="button" class="jlc-wb-icon-btn" id="scout-wb-settings-btn" title="设置">⚙</button>
          <button type="button" class="jlc-wb-icon-btn" id="scout-wb-close-btn" title="最小化">✕</button>
        </div>
      </div>

      <div class="jlc-wb-nav">
        <button class="active" data-tab="combo">组合</button>
        <button data-tab="lexicon">词库</button>
        <button data-tab="works">作品</button>
        <button data-tab="publishers">熟人</button>
        <button data-tab="tracks">追更</button>
        <button data-tab="blocks">屏蔽</button>
      </div>

      <div class="jlc-wb-body">
        <div data-jlc-wb-page="combo"></div>
        <div data-jlc-wb-page="lexicon" hidden></div>
        <div data-jlc-wb-page="works" hidden></div>
        <div data-jlc-wb-page="publishers" hidden></div>
        <div data-jlc-wb-page="tracks" hidden></div>
        <div data-jlc-wb-page="blocks" hidden></div>
      </div>

      <div class="jlc-wb-settings" id="jlc-wb-settings">
        <div class="jlc-wb-settings-panel">
          <div class="jlc-wb-settings-head">
            <strong>设置</strong>
            <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-settings-close" title="关闭">×</button>
          </div>
          <div class="jlc-wb-settings-nav" id="scout-settings-nav">
            <button type="button" data-scout-settings-tab="overview" class="active">概况</button>
            <button type="button" data-scout-settings-tab="ui">界面</button>
            <button type="button" data-scout-settings-tab="backup">备份</button>
            <button type="button" data-scout-settings-tab="sync">同步</button>
          </div>
          <div class="jlc-wb-settings-body" id="scout-settings-body"></div>
        </div>
      </div>
    `;
    document.body.appendChild(wb);
  }

  // 预写入合法几何，避免 PC 端 top:auto 开在视口外
  applyScoutWorkbenchGeometry(wb);

  makeDraggable(fab, true);
  makeHeaderDraggable(wb, wb.querySelector('.jlc-wb-header'));
  makeResizable(wb);

  function triggerTab(tabName) {
    wb.querySelectorAll('.jlc-wb-nav button').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    wb.querySelectorAll('[data-jlc-wb-page]').forEach(page => {
      if (page.getAttribute('data-jlc-wb-page') === tabName) {
        page.removeAttribute('hidden');
      } else {
        page.setAttribute('hidden', '');
      }
    });

    if (tabName === 'combo') renderComboPage();
    else if (tabName === 'lexicon') renderLexiconPage();
    else if (tabName === 'works') renderWorksPage();
    else if (tabName === 'publishers') renderPublishersPage();
    else if (tabName === 'tracks') renderTracksPage();
    else if (tabName === 'blocks') renderBlocksPage();
  }

  function openScoutWorkbench(tabName) {
    applyScoutWorkbenchGeometry(wb);
    wb.classList.add('is-open');
    // PC 端不要锁 body 滚动：部分站点会因此产生遮罩/焦点异常，表现为“点了没开”
    if (window.matchMedia && window.matchMedia('(max-width: 820px)').matches) {
      document.body.style.overflow = 'hidden';
    }
    const tab = tabName || (wb.querySelector('.jlc-wb-nav button.active')?.getAttribute('data-tab')) || 'combo';
    triggerTab(tab);
  }

  function closeScoutWorkbench() {
    setScoutSettingsOpen(false);
    wb.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  if (fab.dataset.scoutClickBound !== '1') {
    fab.dataset.scoutClickBound = '1';
    fab.addEventListener('click', (e) => {
      if (fab.dataset.suppressClick === '1' || fab.classList.contains('is-dragging')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (wb.classList.contains('is-open')) {
        closeScoutWorkbench();
      } else {
        openScoutWorkbench();
      }
    });
  }

  const closeBtn = wb.querySelector('#scout-wb-close-btn');
  if (closeBtn && closeBtn.dataset.scoutBound !== '1') {
    closeBtn.dataset.scoutBound = '1';
    closeBtn.addEventListener('click', () => closeScoutWorkbench());
  }

  const settingsBtn = wb.querySelector('#scout-wb-settings-btn');
  if (settingsBtn && settingsBtn.dataset.scoutBound !== '1') {
    settingsBtn.dataset.scoutBound = '1';
    settingsBtn.addEventListener('click', () => {
      const drawer = wb.querySelector('#jlc-wb-settings');
      const open = !(drawer && drawer.classList.contains('is-open'));
      setScoutSettingsOpen(open);
    });
  }

  const settingsClose = wb.querySelector('#jlc-wb-settings-close');
  if (settingsClose && settingsClose.dataset.scoutBound !== '1') {
    settingsClose.dataset.scoutBound = '1';
    settingsClose.addEventListener('click', () => setScoutSettingsOpen(false));
  }

  const settingsMask = wb.querySelector('#jlc-wb-settings');
  if (settingsMask && settingsMask.dataset.scoutMaskBound !== '1') {
    settingsMask.dataset.scoutMaskBound = '1';
    settingsMask.addEventListener('click', (e) => {
      if (e.target === settingsMask) setScoutSettingsOpen(false);
    });
  }

  if (wb.dataset.scoutNavBound !== '1') {
    wb.dataset.scoutNavBound = '1';
    wb.querySelectorAll('.jlc-wb-nav button').forEach(btn => {
      btn.addEventListener('click', () => {
        setScoutSettingsOpen(false);
        triggerTab(btn.getAttribute('data-tab'));
      });
    });
  }

  if (wb.dataset.scoutSettingsNavBound !== '1') {
    wb.dataset.scoutSettingsNavBound = '1';
    wb.querySelectorAll('[data-scout-settings-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-scout-settings-tab') || 'overview';
        wb.querySelectorAll('[data-scout-settings-tab]').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-scout-settings-tab') === tab);
        });
        renderScoutSettingsSection(tab);
      });
    });
  }

  if (!window.__creamuScoutWbResizeBound) {
    window.__creamuScoutWbResizeBound = true;
    window.addEventListener('resize', () => {
      clampScoutFabPosition(fab);
      if (wb.classList.contains('is-open')) {
        applyScoutWorkbenchGeometry(wb);
      }
    }, { passive: true });
  }

  renderComboPage();
}
