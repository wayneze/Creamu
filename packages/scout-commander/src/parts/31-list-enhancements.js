// @@creamu-part:list-enhancements

function clearListBlockInlinePresentation(el) {
  if (!el || !el.style) return;
  el.style.removeProperty('display');
  el.style.removeProperty('opacity');
  el.style.removeProperty('pointer-events');
}

/** 清除列表卡屏蔽呈现 */
function clearListBlockPresentation(el) {
  if (!el) return;
  el.classList.remove('scout-blocked-hide', 'scout-blocked-dim');
  clearListBlockInlinePresentation(el);
  el.removeAttribute('title');
}

function applyListBlockHide(el) {
  if (!el) return;
  el.classList.remove('scout-blocked-dim');
  el.classList.add('scout-blocked-hide');
  clearListBlockInlinePresentation(el);
}

function applyListBlockDim(el, titleText) {
  if (!el) return;
  el.classList.remove('scout-blocked-hide');
  el.classList.add('scout-blocked-dim');
  clearListBlockInlinePresentation(el);
  if (titleText) el.title = titleText;
}

function collectListVideoEntries(elements) {
  const nodes = elements == null ? getVideoElements() : elements;
  return Array.from(nodes || []).map((element) => ({
    element,
    meta: element && element.nodeType === 1 ? parseVideoElement(element) : null
  }));
}

function applyListBlocks(listEntries) {
  const blocks = getBlockList();
  const pubs = getPublishers();
  const preparedBlocks = prepareBlockMatchers(blocks);
  const publisherIndex = buildPublisherIndex(pubs);
  const entries = listEntries || collectListVideoEntries();
  let blockedCount = 0;

  entries.forEach(({ element: el, meta }) => {
    if (!meta) return;
    const preparedMeta = {
      title: normalizeBlockText(meta.title),
      uploader: normalizeBlockText(meta.uploader || '')
    };

    let hitBlock = null;

    // 1. 匹配熟人关注与拉黑
    let pubLoved = false;
    if (meta.uploader) {
      const matchedPub = publisherIndex.get(publisherIdentityKey(meta.uploader));
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
    for (const matcher of preparedBlocks) {
      if (!preparedBlockMatchesVideo(preparedMeta, matcher)) continue;
      const b = matcher.block;
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
          el.appendChild(badge);
        }
      } else {
        el.classList.remove('scout-pub-loved-card');
        el.querySelector('.scout-pub-badge')?.remove();
      }
    }
  });

  const fab = document.querySelector('#jlc-wb-fab');
  const badge = fab && fab.querySelector('.jlc-wb-fab-badge');
  if (badge) {
    if (blockedCount > 0) {
      badge.textContent = blockedCount;
    } else {
      badge.textContent = '0';
    }
  }
  if (fab) fab.classList.toggle('has-updates', blockedCount > 0);

  // 屏蔽之后再刷已点样式、点击绑定、词库命中流
  applyClickedEnhancements(entries);
  enhanceListLexiconHitFlows(entries);
}

/**
 * 列表影片链接：是否新标签打开（设置项 open_videos_new_tab）
 */
function applyVideoOpenMode(listEntries) {
  const newTab = typeof isOpenVideosNewTab === 'function' ? isOpenVideosNewTab() : true;
  const els = listEntries
    ? listEntries.map((entry) => entry && entry.element).filter(Boolean)
    : Array.from(getVideoElements() || []);
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
function applyClickedEnhancements(listEntries) {
  const site = detectSite();
  if (!site) return;
  const kind = detectPageKind();
  if (kind !== 'search' && kind !== 'other') return;

  const entries = listEntries || collectListVideoEntries();
  const clickedIndex = buildClickedVideoIdIndex(site);
  entries.forEach(({ element: el, meta }) => {
    if (!el || el.nodeType !== 1) return;
    if (!meta || !meta.url) return;
    const videoId = videoIdFromUrl(meta.url);
    if (!videoId) return;

    if (isVideoClickedInIndex(clickedIndex, videoId)) {
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

  applyVideoOpenMode(entries);
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

/**
 * 列表卡片：词库命中标签流
 * 列表词库命中流：叠在缩略图上（站点常裁切 .thumb-under）
 */
function clearListLexiconOverlays(root) {
  const scope = root && root.querySelectorAll ? root : document;
  scope.querySelectorAll('.scout-lex-flow-overlay').forEach((flow) => {
    releaseListLexiconOverlayHost(flow);
    flow.remove();
  });
}

function releaseListLexiconOverlayHost(flow) {
  const host = flow && (flow.parentElement || flow.parentNode);
  if (!host || !host.classList) return;
  host.classList.remove(
    'scout-lex-overlay-host',
    'scout-lex-overlay-positioned',
    'scout-lex-overlay-clipped'
  );
  if (host.dataset) delete host.dataset.scoutLexOverlayMode;
}

function prepareListLexiconOverlayHost(host, isNarrow) {
  if (!host || !host.classList) return;
  const mode = isNarrow ? 'narrow' : 'wide';
  if (
    host.dataset &&
    host.dataset.scoutLexOverlayMode === mode &&
    host.classList.contains('scout-lex-overlay-host')
  ) {
    return;
  }
  host.classList.remove('scout-lex-overlay-positioned', 'scout-lex-overlay-clipped');
  host.classList.add('scout-lex-overlay-host');
  try {
    const cs = window.getComputedStyle(host);
    if (cs.position === 'static') host.classList.add('scout-lex-overlay-positioned');
    if (cs.overflow === 'visible') host.classList.add('scout-lex-overlay-clipped');
  } catch (_) {
    host.classList.add('scout-lex-overlay-positioned');
  }
  if (host.dataset) host.dataset.scoutLexOverlayMode = mode;
}

function enhanceListLexiconHitFlows(listEntries) {
  try {
    if (detectPageKind() === 'video') {
      clearListLexiconOverlays(document);
      return;
    }
    const terms = getLexiconTerms().filter((t) => t && t.status !== 'retired');
    if (!terms.length) {
      clearListLexiconOverlays(document);
      return;
    }
    const preparedTerms = prepareLexiconMatcher(terms);

    const entries = listEntries || collectListVideoEntries();
    if (!entries.length) return;

    // 手机也要标签流；只允许把 relative 写在图容器上，绝不写到 .thumb-block 本身
    let isNarrow = false;
    try {
      isNarrow = !!(window.matchMedia && window.matchMedia('(max-width: 820px)').matches);
    } catch (_) { /* ignore */ }

    entries.forEach(({ element: el, meta }) => {
      if (!el || el.nodeType !== 1) return;
      if (el.closest && el.closest('#jlc-wb, #scout-lex-hit-bar')) return;

      // 标题可空：matchLexiconHits 仍会从 url slug 补伪标签；二者皆空才跳过
      if (!meta || (!compactText(meta.title) && !compactText(meta.url))) return;

      const match = matchLexiconHits(
        {
          title: meta.title || '',
          tags: [].concat(meta.tags || []),
          uploader: meta.uploader || '',
          url: meta.url || ''
        },
        { preparedTerms }
      );

      // 旧位置（thumb-under）里的节点清掉，避免重复
      el.querySelectorAll('.scout-lex-flow-card').forEach((n) => {
        if (!n.classList.contains('scout-lex-flow-overlay')) n.remove();
      });

      let flow = el.querySelector('.scout-lex-flow-overlay');
      if (!match.total) {
        if (flow) {
          releaseListLexiconOverlayHost(flow);
          flow.remove();
        }
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
        if (flow) {
          releaseListLexiconOverlayHost(flow);
          flow.remove();
        }
        return;
      }

      if (!flow) {
        flow = document.createElement('div');
        flow.className = 'scout-lex-flow-card scout-lex-flow scout-lex-flow-overlay';
        thumbHost.appendChild(flow);
      } else if (flow.parentNode !== thumbHost) {
        releaseListLexiconOverlayHost(flow);
        thumbHost.appendChild(flow);
      }
      prepareListLexiconOverlayHost(thumbHost, isNarrow);

      const flowSignature = JSON.stringify([
        isNarrow ? 1 : 0,
        match.total || 0,
        match.lovedCount || 0,
        (match.hits || []).map((hit) => [
          hit.text || '',
          hit.zh || '',
          hit.type || '',
          !!hit.loved,
          hit.via || '',
          hit.label || ''
        ])
      ]);
      if (flow.dataset.scoutFlowSignature === flowSignature) return;

      flow.innerHTML = buildLexiconHitFlowHtml(match, {
        max: isNarrow ? 5 : 8,
        showCount: false
      });
      flow.dataset.scoutFlowSignature = flowSignature;
    });
  } catch (err) {
    console.warn('[Creamu Scout] list lexicon flow failed', err);
  }
}
