// @@creamu-part:detail-enhancements

const SCOUT_DETAIL_TAG_BOX_SELECTOR = [
  '.video-metadata.video-tags-list',
  '.video-metadata.ordered-label-list',
  '.metadata-row.video-tags',
  '.video-tags-list',
  '.ordered-label-list',
  '.video-tags'
].join(',');

const SCOUT_DETAIL_DESCRIPTION_SELECTOR = [
  '.video-description',
  '#video-description',
  '[itemprop="description"]',
  '.metadata-row.video-description',
  'p.video-description',
  '.video-desc',
  '#video-desc',
  '.clear-infobar .description',
  '#video-content-metadata .description'
].join(',');

function getScoutDetailTagBoxes() {
  return Array.from(document.querySelectorAll(SCOUT_DETAIL_TAG_BOX_SELECTOR));
}

function getScoutDetailDescriptionBoxes() {
  return Array.from(document.querySelectorAll(SCOUT_DETAIL_DESCRIPTION_SELECTOR));
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
  const tagBoxes = getScoutDetailTagBoxes();

  // 描述容器（有则折叠；xnxx/xvideos 常见选择器）
  const descBoxes = getScoutDetailDescriptionBoxes();

  if (!isNarrow) {
    tagBoxes.forEach((el) => {
      el.classList.remove('cropped', 'scout-tags-collapsed');
      el.classList.add('scout-tags-expanded');
    });
    descBoxes.forEach((el) => {
      el.classList.remove('scout-desc-collapsed');
      el.classList.add('scout-desc-expanded');
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

let __scoutPageTagSignature = '';
let __scoutNextTagNodeId = 1;
const __scoutTagNodeIds = new WeakMap();

function getScoutTagNodeId(node) {
  if (!node || (typeof node !== 'object' && typeof node !== 'function')) return '';
  let id = __scoutTagNodeIds.get(node);
  if (!id) {
    id = __scoutNextTagNodeId++;
    __scoutTagNodeIds.set(node, id);
  }
  return id;
}

function getScoutEnhanceTagText(a) {
  let txt =
    typeof tagTextFromAnchor === 'function'
      ? tagTextFromAnchor(a)
      : (a.textContent || '')
          .replace(/[♥❤️]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
  const zhNode = a.querySelector('.scout-tag-zh');
  if (zhNode && zhNode.textContent && txt.endsWith(zhNode.textContent)) {
    txt = txt.slice(0, -zhNode.textContent.length).trim();
  }
  txt = txt.replace(/[＋✕+]/g, ' ').replace(/\s+/g, ' ').trim();
  if (typeof sanitizeLexiconText === 'function') txt = sanitizeLexiconText(txt);
  return txt;
}

function buildScoutPageTagSignature(site, anchors, terms, blocks, isNarrow) {
  const termState = (Array.isArray(terms) ? terms : []).map((term) => [
    term && term.id,
    term && term.text,
    term && term.zh,
    term && term.type,
    term && term.status,
    !!(term && term.loved),
    term && term.heat,
    term && term.use,
    term && term.good,
    term && term.bad,
    term && term.updated_at
  ]);
  const blockState = (Array.isArray(blocks) ? blocks : []).map((block) => [
    block && block.id,
    block && block.text,
    block && block.reason,
    block && block.mode,
    block && block.match,
    block && block.scope
  ]);
  const tagState = (Array.isArray(anchors) ? anchors : []).map((anchor) => [
    getScoutTagNodeId(anchor),
    getScoutEnhanceTagText(anchor),
    anchor.getAttribute('href') || '',
    anchor.querySelector('.scout-tag-addon') ? 1 : 0
  ]);
  return JSON.stringify([
    site || '',
    location.href,
    isNarrow ? 1 : 0,
    tagState,
    termState,
    blockState
  ]);
}

function getScoutPageTagSelector(site) {
  if (site === 'xvideos' || site === 'xnxx') {
    return (
      '.video-metadata a.is-keyword, .video-tags-list a.is-keyword, .ordered-label-list a.is-keyword, ' +
      '.video-metadata .video-tags a, .metadata-row .video-tags a, .video-tags a'
    );
  }
  if (site === 'eporner') {
    return (
      'a[href^="/tag/"], a[href^="/cat/"], .vit-pornstar a, .vit-category a, ' +
      '#video-tags a, .tag-container a, a.is-keyword, a.tag'
    );
  }
  return '';
}

function getScoutPageTagAnchors(site) {
  const selector = getScoutPageTagSelector(site);
  return selector ? Array.from(document.querySelectorAll(selector)) : [];
}

function findPreparedTagBlock(txt, preparedBlocks) {
  const normalized = normalizeBlockText(txt);
  if (!normalized) return null;
  for (const matcher of preparedBlocks || []) {
    if (preparedBlockTextMatches(normalized, matcher)) return matcher.block;
  }
  return null;
}

function applyTagVisualState(a, txt, termIndex, preparedBlocks, preparedTerms) {
  const txtKey =
    typeof lexiconIdentityKey === 'function' ? lexiconIdentityKey(txt) : String(txt || '').toLowerCase().trim();
  let matchedTerm = termIndex && typeof termIndex.get === 'function'
    ? termIndex.get(txtKey)
    : null;
  // 站内标签：用词库匹配补中文样式
  if (!matchedTerm && typeof matchLexiconHits === 'function' && Array.isArray(preparedTerms)) {
    try {
      const hit = matchLexiconHits(
        { title: '', tags: [txt], uploader: '' },
        { preparedTerms }
      );
      const h0 = hit && hit.hits && hit.hits[0];
      if (h0) {
        matchedTerm = termIndex && typeof termIndex.get === 'function'
          ? termIndex.get(
              typeof lexiconIdentityKey === 'function'
                ? lexiconIdentityKey(h0.text)
                : String(h0.text || '').toLowerCase()
            )
          : null;
      }
    } catch (_) { /* ignore */ }
  }
  const matchedBlock = findPreparedTagBlock(txt, preparedBlocks);
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

  if (!getScoutPageTagSelector(currentSite)) return;

  // 词库命中流（中文标签流 + 心动）
  enhancePageLexiconHitFlow();

  const anchors = getScoutPageTagAnchors(currentSite);
  const terms = getLexiconTerms();
  const blocks = getBlockList();
  let isNarrow = false;
  try {
    isNarrow = !!(window.matchMedia && window.matchMedia('(max-width: 820px)').matches);
  } catch (_) {
    isNarrow = window.innerWidth <= 820;
  }

  const nextSignature = buildScoutPageTagSignature(
    currentSite,
    anchors,
    terms,
    blocks,
    isNarrow
  );
  if (__scoutPageTagSignature === nextSignature) return;

  const preparedTerms = prepareLexiconMatcher(terms);
  const termIndex = buildLexiconTermIndex(preparedTerms);
  const preparedBlocks = prepareBlockMatchers(blocks);
  const meta = scrapeVideoMeta();

  window.__scoutUiMutating = true;
  try {
    anchors.forEach(a => {
      let txt = '';
      if (a.querySelector('.scout-tag-addon')) {
        const txt = a.getAttribute('data-scout-tag') || '';
        if (txt) applyTagVisualState(a, txt, termIndex, preparedBlocks, preparedTerms);
        return;
      }

      txt = getScoutEnhanceTagText(a);
      if (!txt || txt.startsWith('+') || /[＋✕]/.test(txt)) return;

      a.setAttribute('data-scout-tag', txt);

      applyTagVisualState(a, txt, termIndex, preparedBlocks, preparedTerms);

      const wrapper = document.createElement('span');
      wrapper.className = 'scout-tag-addon';

      const addBtn = document.createElement('span');
      addBtn.className = 'scout-tag-action scout-tag-add-action';
      addBtn.textContent = '＋';
      addBtn.title = '采集入库（选分类/翻译）';
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showScoutCollectDialog({
          text: txt,
          sources: [{ site: currentSite, url: location.href, title: meta.title, at: new Date().toISOString() }],
          onSaved() {
            refreshScoutWorkbenchPageIfActive('lexicon');
            refreshScoutWorkbenchPageIfActive('combo');
            // 清签名以允许词库条更新
            const bar = document.getElementById('scout-lex-hit-bar');
            if (bar) delete bar.dataset.hitSig;
            enhancePageTags();
          }
        });
      });

      const blockBtn = document.createElement('span');
      blockBtn.className = 'scout-tag-action scout-tag-block-action';
      blockBtn.textContent = '✕';
      blockBtn.title = '弱屏蔽(点击) | 强隐藏(Shift+点击)';
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
        refreshScoutWorkbenchPageIfActive('blocks');
        refreshScoutWorkbenchPageIfActive('combo');
        const bar = document.getElementById('scout-lex-hit-bar');
        if (bar) delete bar.dataset.hitSig;
        enhancePageTags();
      });

      wrapper.appendChild(addBtn);
      wrapper.appendChild(blockBtn);
      a.appendChild(wrapper);
    });
    __scoutPageTagSignature = buildScoutPageTagSignature(
      currentSite,
      anchors,
      terms,
      blocks,
      isNarrow
    );
  } finally {
    // 延后清除，避免自身 DOM 更新再次触发 observer
    setTimeout(() => {
      window.__scoutUiMutating = false;
    }, 50);
  }
}

/**
 * 详情页：收藏作品 → 作品列表 + 可选采集标签进词库
 * 醒目双行按钮（PC 贴标题下；手机加宽触控）
 */
function findScoutWorkFavoriteHost() {
  return (
    document.querySelector('h2.page-title') ||
    document.querySelector('.page-title') ||
    document.querySelector('h1') ||
    document.querySelector('.video-metadata') ||
    document.querySelector('#video-info, .video-info, .title-container')
  );
}

function syncScoutWorkFavoriteButton(site, videoId, targetButton) {
  const button = targetButton || document.getElementById('scout-work-fav-btn');
  if (!button || !videoId) return;
  const saved = isWorkSaved(site, videoId);
  button.classList.toggle('is-saved', saved);
  button.setAttribute('aria-pressed', saved ? 'true' : 'false');
  const ico = button.querySelector('.scout-work-fav-ico');
  const label = button.querySelector('.scout-work-fav-label');
  const sub = button.querySelector('.scout-work-fav-sub');
  if (ico) ico.textContent = saved ? '★' : '☆';
  if (label) label.textContent = saved ? '已收藏' : '收藏作品';
  if (sub) sub.textContent = saved ? '点按更新 · 补采标签' : '入库作品 · 采集标签';
  button.title = saved
    ? '已在作品列表。再次点击可更新信息并补采标签'
    : '收藏到「作品」列表，并采集本页标签进词库';
}

function enhancePageWorkFavorite() {
  const currentSite = detectSite();
  if (!currentSite || detectPageKind() !== 'video') return;

  let wrap = document.getElementById('scout-work-fav-bar');
  let btn = document.getElementById('scout-work-fav-btn');
  const locationVideoId = videoIdFromUrl(location.href);
  if (
    wrap &&
    btn &&
    btn.dataset.scoutSite === currentSite &&
    (!locationVideoId || btn.dataset.scoutVideoId === locationVideoId)
  ) {
    syncScoutWorkFavoriteButton(currentSite, btn.dataset.scoutVideoId || locationVideoId);
    return;
  }
  if (btn) btn.remove();
  if (wrap) wrap.remove();

  const meta = scrapeVideoMeta();
  const url = (meta && meta.url) || location.href;
  const videoId = videoIdFromUrl(url);
  if (!videoId) return;

  const host = findScoutWorkFavoriteHost();
  if (!host) return;

  wrap = document.createElement('div');
  wrap.id = 'scout-work-fav-bar';
  wrap.className = 'scout-work-fav-bar';
  wrap.setAttribute('data-scout-ui', '1');

  btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'scout-work-fav-btn';
  btn.className = 'scout-work-fav-btn';
  btn.dataset.scoutSite = currentSite;
  btn.dataset.scoutVideoId = videoId;
  btn.innerHTML =
    '<span class="scout-work-fav-ico" aria-hidden="true">☆</span>' +
    '<span class="scout-work-fav-text">' +
    '<span class="scout-work-fav-label">收藏作品</span>' +
    '<span class="scout-work-fav-sub">入库作品 · 采集标签</span>' +
    '</span>';

  syncScoutWorkFavoriteButton(currentSite, videoId, btn);

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
    syncScoutWorkFavoriteButton(currentSite, videoId);
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
            refreshScoutWorkbenchPageIfActive('works');
          }
        });
      }
      refreshScoutWorkbenchPageIfActive('works');
      refreshScoutWorkbenchPageIfActive('lexicon');
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

function findScoutPublisherAnchor(site) {
  if (site === 'xvideos' || site === 'xnxx') {
    return document.querySelector(
      '.video-metadata .uploader a, a.uploader-tag, .video-metadata-uploader a'
    );
  }
  if (site === 'eporner') {
    return document.querySelector(
      'a[href*="/profile/"][title="Uploader"], a[href*="/profile/"], ' +
        '.publisher-name, .publisher a, a[href*="/channel/"], .post-channel a'
    );
  }
  return null;
}

function enhancePagePublisher() {
  const currentSite = detectSite();
  if (!currentSite) return;
  const pageKind = detectPageKind();
  if (pageKind !== 'video') return;

  enhancePageWorkFavorite();

  const anchorEl = findScoutPublisherAnchor(currentSite);
  if (!anchorEl) return;
  const revision = typeof getScoutLibraryRevision === 'function'
    ? getScoutLibraryRevision()
    : 0;
  const existing = anchorEl.parentNode.querySelector('.scout-pub-addon');
  if (existing && existing.dataset.scoutLibraryRevision === String(revision)) return;
  if (existing) existing.remove();

  const meta = scrapeVideoMeta();
  const pubName = meta.uploader;
  if (!pubName) return;

  const wrapper = document.createElement('span');
  wrapper.className = 'scout-pub-addon';
  wrapper.dataset.scoutLibraryRevision = String(revision);

  const pubs = getPublishers();
  const matched = pubs.find(p => p.name.toLowerCase() === pubName.toLowerCase());

  const loveBtn = document.createElement('button');
  loveBtn.className = 'scout-pub-action scout-pub-love-action';
  if (matched && matched.status === 'loved') {
    loveBtn.textContent = '❤️ 已关注熟人';
    loveBtn.classList.add('is-loved');
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
  blockBtn.className = 'scout-pub-action scout-pub-block-action';
  if (matched && matched.status === 'blocked') {
    blockBtn.textContent = '🚫 已拉黑';
    blockBtn.classList.add('is-blocked');
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

let __scoutNextDetailNodeId = 1;
const __scoutDetailNodeIds = new WeakMap();

function getScoutDetailNodeId(node) {
  if (!node || (typeof node !== 'object' && typeof node !== 'function')) return '';
  let id = __scoutDetailNodeIds.get(node);
  if (!id) {
    id = __scoutNextDetailNodeId++;
    __scoutDetailNodeIds.set(node, id);
  }
  return id;
}

function getScoutDetailTextFingerprint(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return text.length + ':' + (hash >>> 0).toString(36);
}

function getScoutDetailContentSignature() {
  const site = detectSite();
  if (!site || detectPageKind() !== 'video') return '';

  let isNarrow = false;
  try {
    isNarrow = !!(window.matchMedia && window.matchMedia('(max-width: 820px)').matches);
  } catch (_) {
    isNarrow = window.innerWidth <= 820;
  }

  const anchors = getScoutPageTagAnchors(site);
  const tagState = anchors.map((anchor) => [
    getScoutDetailNodeId(anchor),
    getScoutEnhanceTagText(anchor),
    anchor.getAttribute('href') || '',
    anchor.querySelector('.scout-tag-addon') ? 1 : 0
  ]);
  const tagBoxState = getScoutDetailTagBoxes().map((box) => getScoutDetailNodeId(box));
  const descriptionState = getScoutDetailDescriptionBoxes().map((box) => [
    getScoutDetailNodeId(box),
    getScoutDetailTextFingerprint(box.textContent)
  ]);
  const favoriteHost = findScoutWorkFavoriteHost();
  const favoriteButton = document.getElementById('scout-work-fav-btn');
  const publisherAnchor = findScoutPublisherAnchor(site);
  const publisherAddon = publisherAnchor && publisherAnchor.parentNode
    ? publisherAnchor.parentNode.querySelector('.scout-pub-addon')
    : null;
  const revision = typeof getScoutLibraryRevision === 'function'
    ? getScoutLibraryRevision()
    : 0;

  return JSON.stringify([
    site,
    location.href,
    isNarrow ? 1 : 0,
    revision,
    tagState,
    tagBoxState,
    descriptionState,
    [
      getScoutDetailNodeId(favoriteHost),
      favoriteButton ? 1 : 0,
      favoriteButton && favoriteButton.dataset.scoutSite,
      favoriteButton && favoriteButton.dataset.scoutVideoId
    ],
    [
      getScoutDetailNodeId(publisherAnchor),
      publisherAnchor && getScoutDetailTextFingerprint(publisherAnchor.textContent),
      publisherAnchor && publisherAnchor.getAttribute('href'),
      publisherAddon ? 1 : 0,
      publisherAddon && publisherAddon.dataset.scoutLibraryRevision
    ],
    document.getElementById('scout-tags-toggle') ? 1 : 0,
    document.getElementById('scout-desc-toggle') ? 1 : 0
  ]);
}
