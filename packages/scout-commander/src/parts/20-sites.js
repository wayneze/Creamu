// 20-sites.js

/**
 * 列表卡选标题链接（跳过仅缩略图的空 <a>，避免标签流整卡跳过）。
 */
function pickListVideoLink(el) {
  if (!el || !el.querySelectorAll) return null;
  const anchors = el.querySelectorAll(
    'a[href*="/video"], a[href*="/video-"], a[href*="/video."]'
  );
  let best = null;
  let bestTitle = '';
  let bestScore = -1;

  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const href = (a.getAttribute('href') || '').trim();
    if (!href || /javascript:/i.test(href) || !/\/video/i.test(href)) continue;

    const titleAttr = (a.getAttribute('title') || '').trim();
    let text = titleAttr || (a.textContent || '').trim();
    text = text
      .replace(/\s*\d+\s*min\s*/gi, ' ')
      .replace(/\s*\d+\s*sec\s*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const img = a.querySelector && a.querySelector('img');
    // eporner 图链 text 空，但 img[alt] 常有完整标题
    if (text.length < 3 && img) {
      const alt = (img.getAttribute('alt') || '').replace(/\s+/g, ' ').trim();
      if (alt.length >= 3) text = alt;
    }

    const onlyImg = !!(img && text.length < 3 && !titleAttr);
    if (onlyImg) {
      if (!best) {
        best = a;
        bestTitle = '';
        bestScore = 0;
      }
      continue;
    }

    const inTitleZone = !!(
      a.closest &&
      a.closest(
        '.thumb-under, p.title, .title, .thumb-block p, .mbtit, p.mbtit, .mbunder'
      )
    );
    const fromAlt = !titleAttr && img && text === (img.getAttribute('alt') || '').replace(/\s+/g, ' ').trim();
    const score =
      (titleAttr ? 120 : 0) +
      (inTitleZone ? 80 : 0) +
      (fromAlt ? 40 : 0) +
      Math.min(text.length, 80);

    if (text.length >= 2 && score > bestScore) {
      best = a;
      bestTitle = text;
      bestScore = score;
    }
  }

  if (!best && anchors.length) best = anchors[0];
  if (!best) return null;

  if (!bestTitle) {
    try {
      const href = best.getAttribute('href') || '';
      const path = href.startsWith('http')
        ? new URL(href).pathname
        : href.split('?')[0];
      const slug = (path || '').split('/').filter(Boolean).pop() || '';
      bestTitle = slug.replace(/[-_~.]+/g, ' ').replace(/\s+/g, ' ').trim();
    } catch (_) {
      /* ignore */
    }
  }

  return { linkEl: best, title: bestTitle };
}

function pickListUploader(el) {
  if (!el || !el.querySelector) return '';
  const uploaderEl = el.querySelector(
    // eporner 新版
    '.mb-uploader a, span.mb-uploader a, a[href*="/profile/"][title="Uploader"], ' +
      // xvideos / xnxx
      '.uploader .name, div.uploader a .name, div.uploader a, span.uploader, ' +
      '.metadata a[href*="/channels/"] .name, .metadata a[href*="/profiles/"] .name, ' +
      '.metadata a[href*="/channels/"], .metadata a[href*="/profiles/"], ' +
      '.metadata .name, p.metadata a .name, p.metadata a, ' +
      'a[href*="/porn-maker/"] .name, a[href*="/porn-maker/"], ' +
      'a[href*="/amateur-channels/"] .name, a[href*="/profiles/"]'
  );
  if (!uploaderEl) return '';
  return (uploaderEl.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * 详情页缩略图 URL：多源兜底（og / twitter / video poster / 播放器图）。
 * 只返回 http(s) 或 data:，相对路径会拼 origin。
 */
function pickDetailThumbUrl() {
  const candidates = [];
  const push = (u) => {
    const s = String(u || '').trim();
    if (!s || s === 'about:blank') return;
    if (/^data:image\//i.test(s)) {
      candidates.push(s);
      return;
    }
    if (/^https?:\/\//i.test(s)) {
      candidates.push(s);
      return;
    }
    if (s.startsWith('//')) {
      candidates.push((location.protocol || 'https:') + s);
      return;
    }
    if (s.startsWith('/')) {
      try {
        candidates.push(location.origin + s);
      } catch (_) { /* ignore */ }
    }
  };

  document
    .querySelectorAll(
      'meta[property="og:image"], meta[property="og:image:secure_url"], meta[name="twitter:image"], meta[name="twitter:image:src"]'
    )
    .forEach((m) => push(m.getAttribute('content')));

  document.querySelectorAll('video').forEach((v) => {
    push(v.getAttribute('poster'));
    // 部分站 poster 在 dataset
    push(v.dataset && (v.dataset.poster || v.dataset.thumb));
  });

  document
    .querySelectorAll(
      '#video-player-bg img, .video-player img, .player-container img, ' +
        '#html5video img, .xplayer img, img.thumb, img[itemprop="thumbnailUrl"], ' +
        'link[rel="image_src"]'
    )
    .forEach((el) => {
      if (el.tagName === 'LINK') push(el.getAttribute('href'));
      else {
        push(el.getAttribute('data-src'));
        push(el.getAttribute('src'));
      }
    });

  // 去重保序，优先非 1x1 占位
  const seen = new Set();
  for (let i = 0; i < candidates.length; i++) {
    const u = candidates[i];
    if (seen.has(u)) continue;
    seen.add(u);
    if (/pixel|blank|spacer|1x1|data:image\/gif;base64,R0lGOD/i.test(u)) continue;
    return u;
  }
  return '';
}

const SITE_ADAPTERS = {
  xvideos: {
    matchHost: /xvideos\.com/i,
    detectPageKind() {
      if (location.pathname.startsWith('/video') || /\/video[0-9]+/.test(location.pathname)) {
        return 'video';
      }
      if (location.pathname === '/' || location.search.includes('k=') || location.pathname.startsWith('/tags/')) {
        return 'search';
      }
      return 'other';
    },
    buildSearchUrl(query) {
      return `https://www.xvideos.com/?k=${encodeURIComponent(query)}`;
    },
    parseSearchContext() {
      const sp = new URLSearchParams(location.search);
      let k = sp.get('k') || '';
      if (!k) {
        const m = location.pathname.match(/\/tags\/([^/]+)/);
        if (m) k = decodeURIComponent(m[1]).replace(/-/g, ' ');
      }
      return {
        query: k.trim(),
        url: location.href
      };
    },
    scrapeVideoMeta() {
      // 标题含 duration/hd 标记，剥掉
      const titleEl = document.querySelector('h2.page-title') || document.querySelector('.video-metadata .title') || document.querySelector('title');
      let title = titleEl ? titleEl.textContent.trim() : '';
      title = title.replace(/\s*\d+\s*min\s*/gi, ' ').replace(/\s*\d+p\s*/gi, ' ').replace(/\s+/g, ' ').trim();

      // 标签 a.is-keyword；tagTextFromAnchor 去 ＋✕ 噪声
      const tags = [];
      const seen = new Set();
      document.querySelectorAll(
        '.video-metadata a.is-keyword, .video-tags-list a.is-keyword, .ordered-label-list a.is-keyword, ' +
        '.video-metadata .video-tags a, .metadata-row .video-tags a, .video-tags a'
      ).forEach((a) => {
        const txt =
          typeof tagTextFromAnchor === 'function'
            ? tagTextFromAnchor(a)
            : (a.textContent || '').trim();
        if (!txt || txt.startsWith('+')) return;
        const key = txt.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        tags.push(txt);
      });
      
      const thumb = pickDetailThumbUrl();

      // 上传者：.uploader-tag / main-uploader
      const uploaderEl = document.querySelector(
        '.video-metadata a.uploader-tag .name, .video-metadata a.uploader-tag, ' +
        '.main-uploader a, a.uploader-tag, .video-metadata .uploader a, ' +
        'a[href*="/profiles/"], a[href*="/channels/"], .video-metadata-uploader a'
      );
      let uploader = uploaderEl ? uploaderEl.textContent.trim() : '';
      uploader = uploader.replace(/\s+/g, ' ').trim();
      
      return {
        title,
        url: location.href,
        thumb,
        tags,
        uploader
      };
    },
    getVideoElements() {
      return document.querySelectorAll('.mozaique .thumb-block, .mozaique [id^="video_"], .video-block');
    },
    parseVideoElement(el) {
      const picked = pickListVideoLink(el);
      if (!picked || !picked.linkEl) return null;
      let title = (picked.title || '').replace(/\s*\d+\s*min\s*/gi, ' ').replace(/\s+/g, ' ').trim();
      const href = picked.linkEl.getAttribute('href') || '';
      const url = href.startsWith('http') ? href : location.origin + href;
      const thumbEl = el.querySelector('img');
      const thumb = thumbEl ? (thumbEl.getAttribute('data-src') || thumbEl.getAttribute('src') || '') : '';
      const uploader = pickListUploader(el);
      return { el, title, url, thumb, uploader };
    }
  },
  
  xnxx: {
    matchHost: /xnxx\.com/i,
    detectPageKind() {
      // 详情：/video-xxxx/slug（勿用 startsWith('/video') 误伤其它路径）
      if (/^\/video[-.]/i.test(location.pathname) || /\/video[0-9]+/i.test(location.pathname)) {
        return 'video';
      }
      if (
        location.pathname === '/' ||
        location.search.includes('k=') ||
        /^\/search(\/|$)/i.test(location.pathname)
      ) {
        return 'search';
      }
      return 'other';
    },
    buildSearchUrl(query) {
      // 空格用 + 连接：/search/a+and+b
      const enc = encodeURIComponent(String(query || '').trim())
        .replace(/%20/g, '+')
        .replace(/%2B/gi, '+');
      return `https://www.xnxx.com/search/${enc}`;
    },
    parseSearchContext() {
      const sp = new URLSearchParams(location.search);
      let k = sp.get('k') || '';
      if (!k) {
        const parsed = parseXnxxSearchPath(location.pathname);
        k = parsed.query || '';
      }
      // 路径解析失败时从标题兜底
      if (!k && typeof document !== 'undefined' && document.title) {
        const tm = document.title.match(/^['"]([^'"]+)['"]\s*Search/i);
        if (tm) k = tm[1];
      }
      k = decodeSearchSegment(k);
      return {
        query: k.trim(),
        url: location.href
      };
    },
    scrapeVideoMeta() {
      const titleEl = document.querySelector('h2.page-title') || document.querySelector('.video-metadata .title') || document.querySelector('title');
      let title = titleEl ? titleEl.textContent.trim() : '';
      title = title.replace(/\s*\d+\s*min\s*/gi, ' ').replace(/\s*\d+p\s*/gi, ' ').replace(/\s+/g, ' ').trim();
      
      const tags = [];
      const seen = new Set();
      document.querySelectorAll(
        '.video-metadata a.is-keyword, .video-tags-list a.is-keyword, .ordered-label-list a.is-keyword, ' +
        '.video-metadata .video-tags a, .metadata-row .video-tags a, .video-tags a, .tags a'
      ).forEach((a) => {
        const txt =
          typeof tagTextFromAnchor === 'function'
            ? tagTextFromAnchor(a)
            : (a.textContent || '').trim();
        if (!txt || txt.startsWith('+')) return;
        const key = txt.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        tags.push(txt);
      });
      
      const thumb = pickDetailThumbUrl();

      const uploaderEl = document.querySelector(
        '.video-metadata a.uploader-tag .name, .video-metadata a.uploader-tag, ' +
        '.main-uploader a, a.uploader-tag, .video-metadata .uploader a, ' +
        'a[href*="/profiles/"], a[href*="/channels/"], .video-metadata-uploader a'
      );
      let uploader = uploaderEl ? uploaderEl.textContent.trim() : '';
      uploader = uploader.replace(/\s+/g, ' ').trim();
      
      return {
        title,
        url: location.href,
        thumb,
        tags,
        uploader
      };
    },
    getVideoElements() {
      return document.querySelectorAll('.mozaique .thumb-block, .mozaique [id^="video_"], .video-block');
    },
    parseVideoElement(el) {
      // xnxx：无 p.title，标题在 .thumb-under > p > a[title]；图链在前且无字
      const picked = pickListVideoLink(el);
      if (!picked || !picked.linkEl) return null;
      let title = (picked.title || '').replace(/\s*\d+\s*min\s*/gi, ' ').replace(/\s+/g, ' ').trim();
      const href = picked.linkEl.getAttribute('href') || '';
      const url = href.startsWith('http') ? href : location.origin + href;
      const thumbEl = el.querySelector('img');
      const thumb = thumbEl ? (thumbEl.getAttribute('data-src') || thumbEl.getAttribute('src') || '') : '';
      // xnxx 上传者：div.uploader > a > span.name（非 span.uploader）
      const uploader = pickListUploader(el);
      return { el, title, url, thumb, uploader };
    }
  },
  
  eporner: {
    matchHost: /eporner\.com/i,
    detectPageKind() {
      // 详情：/video-XXXX/slug/
      if (/^\/video-/i.test(location.pathname)) {
        return 'video';
      }
      // 列表：/tag/ /search/ /cat/ 首页；旧 ?key= 仍兼容
      if (
        location.pathname === '/' ||
        /^\/(search|tag|cat)(\/|$)/i.test(location.pathname) ||
        location.search.includes('key=') ||
        location.search.includes('search=')
      ) {
        return 'search';
      }
      return 'other';
    },
    buildSearchUrl(query) {
      // 站内 /search/q/ 会 301 到 /tag/q/；直接走 tag，空格→连字符
      const slug = epornerQueryToSlug(query);
      return `https://www.eporner.com/tag/${slug}/`;
    },
    parseSearchContext() {
      const sp = new URLSearchParams(location.search);
      let query = sp.get('search') || sp.get('key') || sp.get('q') || '';
      if (!query) {
        const parsed = parseEpornerListPath(location.pathname);
        query = parsed.query || '';
      }
      // 标题兜底： "Mom Porn - ..." / "Search Mom Daughter Porn"
      if (!query && typeof document !== 'undefined' && document.title) {
        const t = document.title;
        let m = t.match(/^Search\s+(.+?)\s+Porn\b/i);
        if (!m) m = t.match(/^(.+?)\s+Porn\b/i);
        if (m) query = m[1].replace(/\s*-\s*.*$/, '').trim();
      }
      query = decodeSearchSegment(String(query || ''));
      // 搜索框当前值（最准）
      try {
        const inp = document.querySelector('#srch, input[name="search"]');
        const v = inp && (inp.value || '').trim();
        if (v) query = v;
      } catch (_) {
        /* ignore */
      }
      return {
        query: query.trim(),
        url: location.href
      };
    },
    scrapeVideoMeta() {
      const titleEl = document.querySelector('h1') || document.querySelector('title');
      let title = titleEl ? titleEl.textContent.trim() : '';
      title = title
        .replace(/\s*\d+\s*min\s*/gi, ' ')
        .replace(/\s*\d+p\s*/gi, ' ')
        .replace(/\s*\(4K\)\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const tags = [];
      const seen = new Set();
      document
        .querySelectorAll(
          'a[href^="/tag/"], a[href^="/cat/"], .vit-pornstar a, .vit-category a, ' +
            '#video-tags a, .tag-container a, a.tag'
        )
        .forEach((a) => {
          const txt =
            typeof tagTextFromAnchor === 'function'
              ? tagTextFromAnchor(a)
              : (a.textContent || '').trim();
          if (!txt || txt.length > 48 || txt.startsWith('+')) return;
          if (
            /^(home|search|video|upload|popular|latest|verified|hd|3d|vr|pornstars|subscribe)$/i.test(
              txt
            )
          ) {
            return;
          }
          if (typeof isBroadOrNoiseLexiconTag === 'function' && isBroadOrNoiseLexiconTag(txt)) {
            return;
          }
          const key = txt.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          tags.push(txt);
        });

      const thumb = pickDetailThumbUrl();

      const uploaderEl = document.querySelector(
        'a[href*="/profile/"][title="Uploader"], a[href*="/profile/"], ' +
          '.publisher-name, a[href*="/channel/"], .post-channel a'
      );
      const uploader = uploaderEl ? uploaderEl.textContent.trim() : '';

      return {
        title,
        url: location.href,
        thumb,
        tags,
        uploader
      };
    },
    getVideoElements() {
      const modern = document.querySelectorAll('#vidresults .mb, .mb[data-id]');
      if (modern && modern.length) return modern;
      return document.querySelectorAll(
        '#videos-list .post, .post, .post-container, div.mb'
      );
    },
    parseVideoElement(el) {
      const picked = pickListVideoLink(el);
      if (!picked || !picked.linkEl) return null;
      let title = (picked.title || '')
        .replace(/\s*\d+\s*min\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      // .mbtit 文本优先（比 img alt 更干净）
      const titA = el.querySelector('.mbtit a, p.mbtit a');
      if (titA) {
        const t2 = (titA.getAttribute('title') || titA.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();
        if (t2.length >= 2) title = t2;
      }
      const href = (titA && titA.getAttribute('href')) || picked.linkEl.getAttribute('href') || '';
      const url = href.startsWith('http') ? href : location.origin + href;
      const thumbEl = el.querySelector('img');
      const thumb = thumbEl
        ? thumbEl.getAttribute('data-src') || thumbEl.getAttribute('src') || ''
        : '';
      const uploader = pickListUploader(el);
      return { el, title, url, thumb, uploader };
    }
  }
};

// 适配器统一入口
function detectSite() {
  const host = location.hostname;
  for (const k in SITE_ADAPTERS) {
    if (SITE_ADAPTERS[k].matchHost.test(host)) {
      return k;
    }
  }
  return null;
}

function getSiteAdapter() {
  const s = detectSite();
  return s ? SITE_ADAPTERS[s] : null;
}

function detectPageKind() {
  const ad = getSiteAdapter();
  return ad ? ad.detectPageKind() : 'other';
}

function buildSearchUrl(site, query) {
  const ad = SITE_ADAPTERS[site] || getSiteAdapter();
  if (ad) {
    return ad.buildSearchUrl(query);
  }
  return `https://www.xvideos.com/?k=${encodeURIComponent(query)}`;
}

function parseSearchContext() {
  const ad = getSiteAdapter();
  return ad ? ad.parseSearchContext() : { query: '', url: location.href };
}

function scrapeVideoMeta() {
  const ad = getSiteAdapter();
  return ad ? ad.scrapeVideoMeta() : { title: '', url: location.href, thumb: '', tags: [], uploader: '' };
}

function getVideoElements() {
  const ad = getSiteAdapter();
  return ad ? ad.getVideoElements() : [];
}

function parseVideoElement(el) {
  const ad = getSiteAdapter();
  return ad ? ad.parseVideoElement(el) : null;
}

/** 搜索路径段解码：%20 / + / - → 空格 */
function decodeSearchSegment(seg) {
  let s = String(seg == null ? '' : seg);
  try {
    s = decodeURIComponent(s);
  } catch (_) {
    /* keep raw */
  }
  return s
    .replace(/\+/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * xnxx 搜索路径：
 * /search/{q}
 * /search/{q}/{page}
 * /search/{filter}/{q}
 * /search/{filter}/{q}/{page}
 * filter 例：0-10min、10min+；勿把 filter 段当成搜索词。
 */
function parseXnxxSearchPath(pathname) {
  const parts = String(pathname || '')
    .split('/')
    .filter(Boolean);
  if (!parts.length || parts[0].toLowerCase() !== 'search') {
    return { query: '', page: 1, filters: [] };
  }
  const segs = parts.slice(1);
  if (!segs.length) return { query: '', page: 1, filters: [] };

  let page = 1;
  if (/^\d+$/.test(segs[segs.length - 1])) {
    page = Math.max(1, parseInt(segs.pop(), 10) || 1);
  }

  const FILTER_RE = /^(?:\d+(?:-\d+)?min\+?|hd|4k|vr)$/i;
  const filters = [];
  while (segs.length > 1 && FILTER_RE.test(segs[0])) {
    filters.push(segs.shift());
  }

  const query = segs.map(decodeSearchSegment).filter(Boolean).join(' ');
  return { query, page, filters };
}

/** eporner：query → URL slug（空格/and 变连字符） */
function epornerQueryToSlug(query) {
  return String(query || '')
    .trim()
    .toLowerCase()
    .replace(/\+/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'all';
}

/**
 * eporner 列表路径：
 * /tag/{q}/  /tag/{q}/{page}/
 * /search/{q}/ → 常 301 到 /tag/
 * /cat/{q}/
 * 排序段 longest/shortest 等不是页码
 */
function parseEpornerListPath(pathname) {
  const parts = String(pathname || '')
    .split('/')
    .filter(Boolean);
  if (!parts.length) return { kind: '', query: '', page: 1 };
  const kind = parts[0].toLowerCase();
  if (kind !== 'tag' && kind !== 'search' && kind !== 'cat') {
    return { kind: '', query: '', page: 1 };
  }
  const segs = parts.slice(1);
  if (!segs.length) return { kind, query: '', page: 1 };

  let page = 1;
  if (/^\d+$/.test(segs[segs.length - 1])) {
    page = Math.max(1, parseInt(segs.pop(), 10) || 1);
  }
  const SORT_RE =
    /^(longest|shortest|top|recent|recently|most-viewed|best|hot|new|rated)$/i;
  if (segs.length && SORT_RE.test(segs[segs.length - 1])) {
    segs.pop();
  }
  const query = segs.map(decodeSearchSegment).filter(Boolean).join(' ');
  return { kind, query, page };
}

/**
 * 列表页码：内部统一 1-based。
 * xvideos ?p= 0-based；xnxx /search/q/N；eporner /tag/q/N（优先路径分页）。
 */
function parseListPage(site) {
  const s = site || detectSite();
  const sp = new URLSearchParams(location.search);

  if (s === 'eporner') {
    const parsed = parseEpornerListPath(location.pathname);
    if (parsed.page > 1) return parsed.page;
    let page = parseInt(sp.get('page'), 10);
    if (Number.isFinite(page) && page >= 1) return page;
    return 1;
  }

  if (s === 'xnxx') {
    // 优先路径分页；部分站 ?p= 无效
    const parsed = parseXnxxSearchPath(location.pathname);
    if (parsed.page > 1) return parsed.page;
    const rawP = sp.get('p');
    if (rawP != null && rawP !== '') {
      const p = parseInt(rawP, 10);
      if (Number.isFinite(p) && p >= 0) return p + 1;
    }
    return 1;
  }

  // xvideos
  const rawP = sp.get('p');
  if (rawP != null && rawP !== '') {
    const p = parseInt(rawP, 10);
    if (Number.isFinite(p) && p >= 0) return p + 1;
  }
  return 1;
}

/** 把收藏断点页码写回站点 URL（1-based → 站点参数） */
function applyListPageToUrl(urlStr, site, page1Based) {
  const page = Math.max(1, Number(page1Based) || 1);
  try {
    const u = new URL(
      urlStr,
      typeof location !== 'undefined' ? location.origin : 'https://www.xnxx.com'
    );
    if (site === 'eporner') {
      // 真实分页：/tag/q/N/ ；?page= 常 301 丢页码
      u.searchParams.delete('page');
      const parsed = parseEpornerListPath(u.pathname);
      let q = parsed.query;
      if (!q) {
        const spQ = u.searchParams.get('search') || u.searchParams.get('key') || '';
        q = decodeSearchSegment(spQ);
      }
      const slug = epornerQueryToSlug(q || 'all');
      const kind = parsed.kind === 'cat' ? 'cat' : 'tag';
      u.pathname = page > 1 ? `/${kind}/${slug}/${page}/` : `/${kind}/${slug}/`;
      return u.toString();
    }
    if (site === 'xnxx') {
      // 站内分页是 /search/q/N，不是 ?p=
      u.searchParams.delete('p');
      const parsed = parseXnxxSearchPath(u.pathname);
      let q = parsed.query;
      if (!q) {
        // 兼容收藏时带编码的 /search/...
        const rawSegs = u.pathname.split('/').filter(Boolean).slice(1);
        if (rawSegs.length && !/^\d+$/.test(rawSegs[rawSegs.length - 1])) {
          q = decodeSearchSegment(rawSegs[rawSegs.length - 1]);
        } else if (rawSegs.length >= 2) {
          q = decodeSearchSegment(rawSegs[rawSegs.length - 2]);
        }
      }
      const qSeg = encodeURIComponent(q).replace(/%20/g, '+');
      let path = '/search/';
      if (parsed.filters && parsed.filters.length) {
        path += parsed.filters.join('/') + '/';
      }
      path += qSeg || 'search';
      if (page > 1) path += '/' + page;
      u.pathname = path;
      return u.toString();
    }
    // xvideos：0-based ?p=
    u.searchParams.set('p', String(page - 1));
    return u.toString();
  } catch (_) {
    return urlStr;
  }
}

/**
 * 稳定视频 ID（短 id）。旧断点可能存整段 pathname，匹配时用 videoIdsMatch。
 */
function videoIdFromUrl(urlStr) {
  if (!urlStr) return '';
  try {
    const path = new URL(urlStr, typeof location !== 'undefined' ? location.origin : 'https://x.com')
      .pathname || '';
    // xvideos: /video.oohdvlee3fe/slug
    let m = path.match(/\/video\.([a-z0-9]+)/i);
    if (m) return m[1];
    // xnxx / eporner: /video-1h4gc1b7/slug
    m = path.match(/\/video-([a-z0-9]+)/i);
    if (m) return m[1];
    m = path.match(/\/video(\d+)/i);
    if (m) return m[1];
    return path;
  } catch (_) {
    return String(urlStr);
  }
}

/** 兼容旧断点（整 path）与新短 id */
function videoIdsMatch(a, b) {
  const x = String(a || '').trim();
  const y = String(b || '').trim();
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.includes(y) || y.includes(x)) return true;
  // 各自再抽一次 id
  const ix = videoIdFromUrl(x.startsWith('/') || x.includes('://') ? x : '/' + x);
  const iy = videoIdFromUrl(y.startsWith('/') || y.includes('://') ? y : '/' + y);
  return !!(ix && iy && ix === iy);
}
