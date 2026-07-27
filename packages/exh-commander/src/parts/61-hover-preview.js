
  // —— 列表悬停预览 ——
  const hoverPreviewCache = new Map();
  const hoverPreviewInflight = new Map();
  let hoverPreviewActive = 0;
  let hoverPreviewHideTimer = null;
  let hoverPreviewGen = 0;
  let hoverPreviewScrollBound = false;

  function invalidateHoverPreview() {
    hoverPreviewGen++;
  }

  function ensureHoverPreviewPanel() {
    let panel = document.getElementById('exc-hover-preview');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'exc-hover-preview';
    panel.innerHTML =
      '<div class="exc-hp-head"><span class="exc-hp-title">预览</span><a class="exc-hp-open" href="#" target="_blank" rel="noreferrer">打开画廊</a></div>' +
      '<div class="exc-hp-status"></div>' +
      '<div class="exc-hp-grid"></div>';
    panel.addEventListener('mouseenter', () => {
      if (hoverPreviewHideTimer) {
        clearTimeout(hoverPreviewHideTimer);
        hoverPreviewHideTimer = null;
      }
    });
    panel.addEventListener('mouseleave', () => {
      scheduleHideHoverPreview(80);
    });
    document.body.appendChild(panel);
    if (!hoverPreviewScrollBound) {
      hoverPreviewScrollBound = true;
      window.addEventListener(
        'scroll',
        () => {
          hideHoverPreview();
        },
        { passive: true, capture: true }
      );
    }
    return panel;
  }

  function hideHoverPreview() {
    invalidateHoverPreview();
    if (hoverPreviewHideTimer) {
      clearTimeout(hoverPreviewHideTimer);
      hoverPreviewHideTimer = null;
    }
    const panel = document.getElementById('exc-hover-preview');
    if (panel) {
      panel.classList.remove('is-open', 'is-loading', 'is-empty', 'is-error');
      panel.style.display = 'none';
    }
  }

  function scheduleHideHoverPreview(ms) {
    if (hoverPreviewHideTimer) clearTimeout(hoverPreviewHideTimer);
    hoverPreviewHideTimer = setTimeout(() => {
      hoverPreviewHideTimer = null;
      hideHoverPreview();
    }, ms == null ? 120 : ms);
  }

  function positionHoverPreview(panel, anchor) {
    if (!panel || !anchor) return;
    panel.style.display = 'block';
    const r = anchor.getBoundingClientRect();
    const pw = panel.offsetWidth || 360;
    const ph = panel.offsetHeight || 180;
    let left = r.right + 10;
    let top = r.top;
    if (left + pw > window.innerWidth - 8) left = Math.max(8, r.left - pw - 10);
    if (left < 8) left = 8;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, window.innerHeight - ph - 8);
    if (top < 8) top = 8;
    panel.style.left = Math.round(left) + 'px';
    panel.style.top = Math.round(top) + 'px';
  }

  function renderHoverPreviewThumbs(panel, thumbs, galleryUrl) {
    const grid = panel.querySelector('.exc-hp-grid');
    const status = panel.querySelector('.exc-hp-status');
    const open = panel.querySelector('.exc-hp-open');
    if (open && galleryUrl) {
      open.href = galleryUrl;
      open.style.display = '';
    } else if (open) {
      open.style.display = 'none';
    }
    if (!grid) return;
    if (!thumbs || !thumbs.length) {
      panel.classList.add('is-empty');
      panel.classList.remove('is-loading', 'is-error');
      if (status) status.textContent = '没有可预览的缩略图';
      grid.innerHTML = '';
      return;
    }
    panel.classList.remove('is-empty', 'is-loading', 'is-error');
    if (status) status.textContent = '内容预览 · ' + thumbs.length + ' 张（已跳过封面页）';
    grid.innerHTML = thumbs
      .map((t) => {
        const href = t.href || galleryUrl || '#';
        if (t.type === 'bg' && t.style) {
          const wh =
            (t.w ? 'width:' + t.w + 'px;' : '') + (t.h ? 'height:' + t.h + 'px;' : 'min-height:100px;');
          return (
            '<a class="exc-hp-cell" href="' +
            escapeHtml(href) +
            '" target="_blank" rel="noreferrer">' +
            '<span class="exc-hp-bg" style="' +
            escapeHtml(t.style) +
            ';' +
            wh +
            '"></span></a>'
          );
        }
        return (
          '<a class="exc-hp-cell" href="' +
          escapeHtml(href) +
          '" target="_blank" rel="noreferrer">' +
          '<img src="' +
          escapeHtml(t.src || '') +
          '" alt="" loading="lazy"></a>'
        );
      })
      .join('');
  }

  async function fetchGalleryPreviewThumbs(gid, token, count, coverUrl) {
    const key = String(gid) + '|v2|' + String(count);
    const cached = hoverPreviewCache.get(key);
    if (cached && Array.isArray(cached.thumbs)) {
      if (cached.thumbs.length >= count || cached.partial === false) return cached;
    }
    if (hoverPreviewInflight.has(key)) return hoverPreviewInflight.get(key);

    const run = (async () => {
      while (hoverPreviewActive >= 2) {
        await new Promise((r) => setTimeout(r, 40));
      }
      hoverPreviewActive++;
      try {
        const url = buildGalleryUrl(location.origin, gid, token);
        const res = await gmRequest({
          method: 'GET',
          url: url,
          timeout: 15000,
          headers: {
            Accept: 'text/html,application/xhtml+xml',
            'Cache-Control': 'no-cache',
          },
        });
        const status = res && res.status;
        if (status < 200 || status >= 400) {
          throw new Error('HTTP ' + status);
        }
        const text = (res && res.responseText) || '';
        if (/Sad Panda|Your IP address has been temporarily banned|Please wait/i.test(text) && !/id="gdt"/i.test(text)) {
          throw new Error('页面不可用或限流');
        }
        // 跳过与封面重复的前 1～2 张，多取再筛
        const thumbs = parseGalleryThumbsFromHtml(text, count, {
          skipCoverDupes: true,
          coverUrl: coverUrl || '',
        });
        const entry = { thumbs: thumbs, partial: thumbs.length < count, ts: nowMs() };
        hoverPreviewCache.set(key, entry);
        if (hoverPreviewCache.size > 100) {
          const oldest = hoverPreviewCache.keys().next().value;
          if (oldest != null) hoverPreviewCache.delete(oldest);
        }
        return entry;
      } finally {
        hoverPreviewActive = Math.max(0, hoverPreviewActive - 1);
        hoverPreviewInflight.delete(key);
      }
    })();

    hoverPreviewInflight.set(key, run);
    return run;
  }

  async function showHoverPreview(anchorEl, partial) {
    if (!config.list_hover_preview) return;
    if (!partial || !partial.gid || !partial.token) return;
    const panel = ensureHoverPreviewPanel();
    const gen = ++hoverPreviewGen;
    const count = clampHoverPreviewCount(config.list_hover_preview_count);
    const galleryUrl = buildGalleryUrl(location.origin, partial.gid, partial.token);
    // 列表封面：用于去掉预览里重复的首页
    let coverUrl = partial.thumb || '';
    if (!coverUrl && anchorEl) {
      const img = anchorEl.querySelector('img');
      if (img) coverUrl = img.getAttribute('data-src') || img.src || '';
    }

    panel.classList.add('is-open', 'is-loading');
    panel.classList.remove('is-empty', 'is-error');
    panel.style.display = 'block';
    const status = panel.querySelector('.exc-hp-status');
    const title = panel.querySelector('.exc-hp-title');
    if (title) title.textContent = '预览';
    if (status) status.textContent = '加载中…';
    const grid = panel.querySelector('.exc-hp-grid');
    if (grid) grid.innerHTML = '';
    const open = panel.querySelector('.exc-hp-open');
    if (open) {
      open.href = galleryUrl;
      open.style.display = '';
    }
    positionHoverPreview(panel, anchorEl);

    try {
      const entry = await fetchGalleryPreviewThumbs(partial.gid, partial.token, count, coverUrl);
      if (gen !== hoverPreviewGen) return;
      renderHoverPreviewThumbs(panel, entry.thumbs, galleryUrl);
      positionHoverPreview(panel, anchorEl);
    } catch (err) {
      if (gen !== hoverPreviewGen) return;
      panel.classList.remove('is-loading');
      panel.classList.add('is-error', 'is-empty');
      if (status) status.textContent = '预览失败: ' + ((err && err.message) || err);
      if (grid) grid.innerHTML = '';
      positionHoverPreview(panel, anchorEl);
    }
  }

  function bindListHoverPreview(el, partial) {
    if (!el || !partial || !partial.gid) return;
    if (el.dataset.excHoverBound === '1') return;
    el.dataset.excHoverBound = '1';

    let enterTimer = null;
    let localGen = 0;

    const clearEnter = () => {
      if (enterTimer) {
        clearTimeout(enterTimer);
        enterTimer = null;
      }
    };

    el.addEventListener('mouseenter', () => {
      if (config.list_hover_preview === false) return;
      clearEnter();
      const my = ++localGen;
      const delay = clampHoverPreviewDelay(config.list_hover_preview_delay_ms);
      enterTimer = setTimeout(() => {
        enterTimer = null;
        if (my !== localGen) return;
        if (hoverPreviewHideTimer) {
          clearTimeout(hoverPreviewHideTimer);
          hoverPreviewHideTimer = null;
        }
        showHoverPreview(el, partial).catch(() => {});
      }, delay);
    });

    el.addEventListener('mouseleave', (ev) => {
      clearEnter();
      localGen++;
      const to = ev.relatedTarget;
      if (to && to.closest && to.closest('#exc-hover-preview')) return;
      invalidateHoverPreview();
      scheduleHideHoverPreview(140);
    });
  }
