// @@creamu-part:page-enhancements

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
    // 延后清除，避免自身 DOM 更新再次触发 observer
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
