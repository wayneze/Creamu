// @@creamu-part:detail-enhancements

const SCOUT_DETAIL_TAG_BOX_SELECTOR = [
  '.video-metadata.video-tags-list',
  '.video-metadata.ordered-label-list',
  '.metadata-row.video-tags',
  '.video-tags-list',
  '.ordered-label-list',
  '.video-tags',
  '#video-info-tags',
  '#video-tags',
  '.tag-container'
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
  const items = [...new Set(getScoutPageTagAnchors(detectSite()).map(anchor => anchor.closest('li') || anchor))];
  items.forEach((item, index) => item.toggleAttribute('data-scout-tag-extra', index >= 4));

  const box = tagsOnly[0];
  tagsOnly.forEach((el) => {
    el.classList.remove('cropped');
    if (!document.getElementById('scout-tags-toggle') && !el.classList.contains('scout-tags-expanded')) el.classList.add('scout-tags-collapsed');
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
    if (!document.getElementById('scout-desc-toggle') && !el.classList.contains('scout-desc-expanded')) el.classList.add('scout-desc-collapsed');
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
    anchor.getAttribute('href') || ''
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
  a.title = txt + '（未入库 · 可在“用标签搜索 / 收藏”中添加）';
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

  window.__scoutUiMutating = true;
  try {
    anchors.forEach(a => {
      let txt = '';
      txt = getScoutEnhanceTagText(a);
      if (!txt || txt.startsWith('+') || /[＋✕]/.test(txt)) return;

      a.setAttribute('data-scout-tag', txt);

      applyTagVisualState(a, txt, termIndex, preparedBlocks, preparedTerms);
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
 * 原生标题之后的统一操作栏；保持播放器和站点操作的原有节点。
 */
function findScoutWorkFavoriteHost() {
  return (
    document.querySelector('h2.page-title') ||
    document.querySelector('.page-title') ||
    document.querySelector('#video-content-metadata .video-title') ||
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
  if (ico) ico.textContent = saved ? '★' : '☆';
  if (label) label.textContent = saved ? '已收藏' : '收藏作品';
  button.title = saved
    ? '已在作品列表。再次点击可更新信息并补采标签'
    : '收藏到「作品」列表，并采集本页标签进词库';
}

function saveScoutCurrentWork() {
  const currentSite = detectSite();
  if (!currentSite || detectPageKind() !== 'video') return;
  const meta = scrapeVideoMeta();
  const url = meta.url || location.href;
  const videoId = videoIdFromUrl(url);
  if (!videoId) { showToast('无法识别当前作品', true); return; }
  const thumb = meta.thumb || pickDetailThumbUrl() || '';
  const res = addWork(
    {
      site: currentSite,
      videoId: videoId,
      title: meta.title,
      url: url,
      thumb: thumb,
      thumbUrl: thumb,
      uploader: meta.uploader,
      tags: meta.tags || []
    },
    { autoCollectTags: true }
  );
  syncScoutWorkFavoriteButton(currentSite, videoId);
  if (res.work) {
    showToast(
      (res.added ? '已收藏作品' : '已更新作品') +
        (res.tagsCollected ? `，采集标签 ${res.tagsCollected} 个` : '') +
        (thumb ? '' : '（暂无封面，稍后再更）')
    );
    markVideoClicked({
      site: currentSite,
      videoId: videoId,
      title: meta.title,
      url: url,
      thumb: thumb,
      uploader: meta.uploader
    });
    // 异步把远程封面缓存成 dataURL（列表离线可显，防防盗链）
    if (
      thumb &&
      !/^data:image\//i.test(thumb) &&
      typeof cacheThumbToDataUrl === 'function' &&
      typeof updateWorkThumb === 'function'
    ) {
      const wid = res.work.id;
      cacheThumbToDataUrl(thumb).then((dataUrl) => {
        if (!dataUrl) return;
        if (updateWorkThumb(wid, dataUrl, thumb)) {
          refreshScoutWorkbenchPageIfActive('works');
        }
      });
    }
    refreshScoutWorkbenchPageIfActive('works');
    refreshScoutWorkbenchPageIfActive('lexicon');
    refreshScoutWorkbenchContext();
    enhancePageTags();
  } else {
    showToast('收藏失败：无法识别作品 ID', true);
  }

}

function openScoutCurrentTags() {
  const meta = scrapeVideoMeta();
  const tags = getScoutPageTagAnchors(detectSite()).map(getScoutEnhanceTagText).filter(Boolean);
  if (!tags.length) { showToast('当前作品暂无可用标签'); return; }
  showScoutCollectDialog({ tags, sources: [{ site: detectSite(), url: location.href, title: meta.title, at: new Date().toISOString() }] });
}

function enhancePageWorkFavorite() {
  const site = detectSite();
  if (!site || detectPageKind() !== 'video') return;
  const host = findScoutWorkFavoriteHost();
  const videoId = videoIdFromUrl(location.href);
  if (!host || !videoId) return;
  host.classList.add('scout-detail-title');
  let bar = document.getElementById('scout-work-fav-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'scout-work-fav-bar';
    bar.className = 'scout-work-fav-bar';
    bar.dataset.scoutUi = '1';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', '当前作品操作');
    bar.innerHTML = `<button type="button" id="scout-work-fav-btn" class="scout-work-fav-btn"><span class="scout-work-fav-ico" aria-hidden="true">☆</span><span class="scout-work-fav-label">收藏作品</span></button>
      <button type="button" id="scout-tags-manage">用标签搜索 / 收藏</button>
      <button type="button" id="scout-detail-console">打开控制台 <span aria-hidden="true">↗</span></button>`;
    bar.querySelector('#scout-work-fav-btn').onclick = saveScoutCurrentWork;
    bar.querySelector('#scout-tags-manage').onclick = openScoutCurrentTags;
    bar.querySelector('#scout-detail-console').onclick = () => window.__scoutOpenWorkbench();
  }
  if (host.nextElementSibling !== bar) host.insertAdjacentElement('afterend', bar);
  const button = bar.querySelector('#scout-work-fav-btn');
  button.dataset.scoutSite = site;
  button.dataset.scoutVideoId = videoId;
  syncScoutWorkFavoriteButton(site, videoId, button);
  bar.querySelector('#scout-tags-manage').disabled = !getScoutPageTagAnchors(site).length;
}

function findScoutPublisherAnchor(site) {
  if (site === 'xvideos' || site === 'xnxx') {
    return document.querySelector(
      '.video-metadata .uploader a, a.uploader-tag, .video-metadata-uploader a'
    );
  }
  if (site === 'eporner') {
    return document.querySelector(
      '#video-info-tags .vit-uploader a, a[href*="/profile/"][title="Uploader"], ' +
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
  const publisherKey = [location.href, anchorEl.getAttribute('href'), anchorEl.textContent].join('|');
  if (existing && existing.dataset.scoutLibraryRevision === String(revision) && existing.dataset.scoutPublisher === publisherKey) return;
  if (existing) existing.remove();

  const meta = scrapeVideoMeta();
  const pubName = meta.uploader;
  if (!pubName) return;

  const wrapper = document.createElement('span');
  wrapper.className = 'scout-pub-addon';
  wrapper.dataset.scoutLibraryRevision = String(revision);
  wrapper.dataset.scoutPublisher = publisherKey;

  const pubs = getPublishers();
  const matched = pubs.find(p => p.name.toLowerCase() === pubName.toLowerCase());

  const loveBtn = document.createElement('button');
  loveBtn.type = 'button';
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
  blockBtn.type = 'button';
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
    anchor.getAttribute('href') || ''
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
