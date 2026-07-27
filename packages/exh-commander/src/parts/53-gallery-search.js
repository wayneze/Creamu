
  function extractTopGalleryFromListHtml(html, baseUrl) {
    const s = String(html || '');
    baseUrl = baseUrl || location.href;
    // 优先 DOM 解析：同时拿 gid / 标题 / 封面
    try {
      if (typeof DOMParser !== 'undefined') {
        const doc = new DOMParser().parseFromString(s, 'text/html');
        const firstLink = doc.querySelector(
          '#ido a[href*="/g/"], table.itg a[href*="/g/"], .itg a[href*="/g/"], a[href*="/g/"]'
        );
        if (firstLink) {
          const href = firstLink.getAttribute('href') || '';
          const gt = parseGalleryUrl(href, baseUrl);
          if (gt && gt.gid) {
            const cardRoot =
              firstLink.closest('tr, .gl1t, .gl1e, .gl2t, .gl3t') ||
              firstLink.parentElement ||
              firstLink;
            const titleEl =
              (cardRoot &&
                cardRoot.querySelector('.glink, .glname a, .gl3e a, .gl4e a')) ||
              firstLink;
            const title = compactText(
              (titleEl && (titleEl.getAttribute('title') || titleEl.textContent)) || ''
            );
            const cover = extractListItemCoverUrl(cardRoot || firstLink, baseUrl);
            const posted_at = extractListItemPostedAt(cardRoot || firstLink, gt.gid);
            return {
              gid: String(gt.gid),
              token: gt.token || '',
              title: title,
              cover: cover,
              posted_at: posted_at,
            };
          }
        }
      }
    } catch (_) { /* fall through regex */ }
    // glink 标题 + 邻近 /g/gid/
    let m = s.match(
      /class=["']glink["'][^>]*>([^<]{1,200})<\/[\s\S]{0,600}?\/g\/(\d+)\/[0-9a-f]+/i
    );
    if (m) {
      const cover = extractCoverUrlNearGidFromHtml(s, m[2], baseUrl);
      const posted_at = extractPostedNearGidFromHtml(s, m[2]);
      return { gid: m[2], title: compactText(m[1]), cover: cover, posted_at: posted_at };
    }
    m = s.match(
      /\/g\/(\d+)\/[0-9a-f]+\/[^"'<]{0,80}["'][^>]*>[\s\S]{0,400}?class=["']glink["'][^>]*>([^<]{1,200})</i
    );
    if (m) {
      const cover = extractCoverUrlNearGidFromHtml(s, m[1], baseUrl);
      const posted_at = extractPostedNearGidFromHtml(s, m[1]);
      return { gid: m[1], title: compactText(m[2]), cover: cover, posted_at: posted_at };
    }
    m = s.match(/id=["']?itg[\s\S]{0,8000}?\/g\/(\d+)\/[0-9a-f]+/i);
    if (m) {
      return {
        gid: m[1],
        title: '',
        cover: extractCoverUrlNearGidFromHtml(s, m[1], baseUrl),
        posted_at: extractPostedNearGidFromHtml(s, m[1]),
      };
    }
    m = s.match(/\/g\/(\d+)\/[0-9a-f]{8,}/i);
    return m
      ? {
          gid: m[1],
          title: '',
          cover: extractCoverUrlNearGidFromHtml(s, m[1], baseUrl),
          posted_at: extractPostedNearGidFromHtml(s, m[1]),
        }
      : null;
  }

  /** 正则兜底：id="posted_GID" 或邻近日期文本 */
  function extractPostedNearGidFromHtml(html, gid) {
    const s = String(html || '');
    const g = String(gid || '');
    if (!g) return 0;
    let m = s.match(new RegExp('id=["\']?posted_' + g + '["\']?[^>]*>([^<]{6,40})<', 'i'));
    if (m) {
      const t = parsePostedToMs(m[1]);
      if (t) return t;
    }
    const idx = s.search(new RegExp('\\/g\\/' + g + '\\/', 'i'));
    if (idx < 0) return 0;
    const slice = s.slice(Math.max(0, idx - 1200), Math.min(s.length, idx + 1600));
    m = slice.match(/(20\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
    if (m) return parsePostedToMs(m[1]);
    m = slice.match(/(20\d{2}-\d{2}-\d{2})/);
    return m ? parsePostedToMs(m[1]) : 0;
  }

  /** 正则兜底：在 gid 邻近片段里找 ehgt / hath 缩略图 */
  function extractCoverUrlNearGidFromHtml(html, gid, baseUrl) {
    const s = String(html || '');
    const g = String(gid || '');
    if (!g) return '';
    const idx = s.search(new RegExp('\\/g\\/' + g + '\\/', 'i'));
    if (idx < 0) return '';
    const slice = s.slice(Math.max(0, idx - 2500), Math.min(s.length, idx + 800));
    const m = slice.match(
      /(?:src|data-src|data-original)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/i
    );
    if (!m) {
      const m2 = slice.match(
        /url\(\s*['"]?(https?:\/\/[^'")\s]+\.(?:jpg|jpeg|png|webp|gif)[^'")\s]*)['"]?\s*\)/i
      );
      if (!m2) return '';
      try {
        return new URL(m2[1], baseUrl || location.href).href;
      } catch (_) {
        return m2[1];
      }
    }
    try {
      return new URL(m[1], baseUrl || location.href).href;
    } catch (_) {
      return m[1];
    }
  }

  /** 列表 HTML 中按出现顺序去重的 gid（用于估算未读条数） */
  function extractOrderedGidsFromListHtml(html) {
    const s = String(html || '');
    const re = /\/g\/(\d+)\/[0-9a-f]+/gi;
    const out = [];
    const seen = new Set();
    let m;
    while ((m = re.exec(s))) {
      const g = String(m[1]);
      if (seen.has(g)) continue;
      seen.add(g);
      out.push(g);
      if (out.length >= 100) break;
    }
    return out;
  }

  /** 从列表 HTML 解析画廊条目（相关版本搜索用） */
  function parseGalleryListFromHtml(html, baseUrl) {
    const out = [];
    const seen = new Set();
    baseUrl = baseUrl || (typeof location !== 'undefined' ? location.href : '');
    try {
      if (typeof DOMParser === 'undefined') return out;
      const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
      const roots = [];
      const selectors = [
        'table.itg > tbody > tr',
        'table.itg tr',
        'div.gl1t',
        'div.gl2t',
        'div.gl3t',
        '.gl1e',
        '.gl2e',
      ];
      for (let s = 0; s < selectors.length; s++) {
        const nodes = doc.querySelectorAll(selectors[s]);
        if (nodes && nodes.length) {
          nodes.forEach((el) => roots.push(el));
          break;
        }
      }
      if (!roots.length) {
        doc.querySelectorAll('a[href*="/g/"]').forEach((a) => {
          const row = a.closest('tr, .gl1t, .gl2t, .gl3t, .gl1e, .gl2e') || a;
          if (row && roots.indexOf(row) < 0) roots.push(row);
        });
      }
      for (let i = 0; i < roots.length; i++) {
        const root = roots[i];
        if (root.querySelector && root.querySelector('th')) continue;
        const link = root.querySelector && root.querySelector('a[href*="/g/"]');
        if (!link) continue;
        const href = link.getAttribute('href') || link.href || '';
        const gt = typeof parseGalleryUrl === 'function' ? parseGalleryUrl(href, baseUrl) : null;
        if (!gt || !gt.gid || seen.has(String(gt.gid))) continue;
        seen.add(String(gt.gid));
        const titleEl =
          root.querySelector('.glink') ||
          root.querySelector('.glname a') ||
          root.querySelector('.glname') ||
          link;
        const title = compactText(
          (titleEl && (titleEl.getAttribute('title') || titleEl.textContent)) || ''
        );
        let cover = '';
        try {
          cover =
            typeof extractListItemCoverUrl === 'function'
              ? extractListItemCoverUrl(root, baseUrl)
              : '';
        } catch (_) { /* ignore */ }
        let posted_at = 0;
        try {
          posted_at = extractListItemPostedAtInDoc(root, gt.gid, doc);
          if (!posted_at && typeof extractListItemPostedAt === 'function') {
            posted_at = extractListItemPostedAt(root, gt.gid);
          }
        } catch (_) { /* ignore */ }
        const ps = extractListItemPagesSize(root);
        // 列表上语言/码级先从标题猜；gdata 会再补
        const language = detectLanguageFromText(title, []);
        const censor_tier = detectCensorTier(title, []);
        const group = extractGroupFromTitle(title) || '';
        out.push({
          gid: String(gt.gid),
          token: gt.token || '',
          title_raw: title,
          title: title,
          thumb: cover,
          cover: cover,
          posted_at: posted_at || 0,
          pages: ps.pages || 0,
          size_bytes: ps.size_bytes || 0,
          size_text: ps.size_text || '',
          language: language,
          censor_tier: censor_tier,
          group: group,
          url:
            typeof buildGalleryUrl === 'function'
              ? buildGalleryUrl(new URL(baseUrl).origin, gt.gid, gt.token)
              : href,
        });
        if (out.length >= 40) break;
      }
    } catch (e) {
      console.warn('[ExC] parseGalleryListFromHtml', e);
    }
    return out;
  }

  /** @returns {{ imported:number, total:number, error?:string }} */
  async function importRelatedOnlineEditions(edition, opts) {
    opts = opts || {};
    if (!edition || !edition.gid) return { imported: 0, total: 0, error: 'no edition' };
    const workId = opts.workId || edition.work_id;
    if (!workId) return { imported: 0, total: 0, error: 'no work' };
    const core = compactText(edition.title_core || buildTitleCore(edition.title_raw || edition.title || ''));
    if (!core || core.length < 3) return { imported: 0, total: 0, error: 'title too short' };
    const q = '"' + core.slice(0, 90) + '"';
    const home =
      typeof buildSearchUrl === 'function'
        ? buildSearchUrl(location.origin, q)
        : location.origin + '/?f_search=' + encodeURIComponent(q);
    let html = '';
    try {
      html = await fetchTrackingPageHtml(home);
    } catch (e) {
      return { imported: 0, total: 0, error: (e && e.message) || String(e) };
    }
    const items = parseGalleryListFromHtml(html, home);
    const minSim = Number(opts.minSim);
    const thr = Number.isFinite(minSim) ? minSim : 0.7;
    const limit = Math.min(20, Math.max(4, Math.floor(Number(opts.limit) || 12)));
    // 先筛相似，再 gdata 补全体积/时间/码级
    const picked = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.gid || String(it.gid) === String(edition.gid)) continue;
      const sim = titleSimilarity(
        edition.title_raw || edition.title_core || '',
        it.title_raw || it.title || ''
      );
      if (sim < thr) continue;
      picked.push(Object.assign({}, it, { _sim: sim }));
      if (picked.length >= limit) break;
    }
    let gmap = Object.create(null);
    try {
      gmap = await fetchGalleryGdataBatch(
        picked.map((x) => ({ gid: x.gid, token: x.token }))
      );
    } catch (e) {
      console.warn('[ExC] related gdata', e);
    }
    let imported = 0;
    for (let i = 0; i < picked.length; i++) {
      const it = picked[i];
      try {
        const gm = gmap[String(it.gid)] || null;
        const title = (gm && gm.title_raw) || it.title_raw || it.title || '';
        const partial = {
          gid: it.gid,
          token: it.token || (gm && gm.token) || '',
          title_raw: title,
          thumb: it.thumb || it.cover || '',
          posted_at: (gm && gm.posted_at) || it.posted_at || 0,
          pages: (gm && gm.pages) || it.pages || 0,
          size_bytes: (gm && gm.size_bytes) || it.size_bytes || 0,
          size_text: it.size_text || '',
          language:
            (gm && gm.language) ||
            it.language ||
            detectLanguageFromText(title, (gm && gm.tags) || []),
          censor_tier:
            (gm && gm.censor_tier) ||
            it.censor_tier ||
            detectCensorTier(title, (gm && gm.tags) || []),
          group: (gm && gm.group) || it.group || extractGroupFromTitle(title) || '',
          tags: (gm && gm.tags) || [],
          uploader: (gm && gm.uploader) || '',
          url: it.url || '',
        };
        const id = makeEditionId(String(it.gid), String(partial.token || ''));
        const prev = await idbGet(STORE_EDITIONS, id);
        const rec = normalizeEditionRecord(partial);
        // 合并时：新 gdata 有值优先；避免用空覆盖已有
        const merged = Object.assign({}, prev || {}, rec, {
          id: id,
          work_id: workId,
          updated_at: nowMs(),
        });
        if (prev) {
          if (!(Number(merged.posted_at) > 0) && Number(prev.posted_at) > 0) {
            merged.posted_at = prev.posted_at;
          }
          if (!(Number(merged.size_bytes) > 0) && Number(prev.size_bytes) > 0) {
            merged.size_bytes = prev.size_bytes;
          }
          if (!(Number(merged.pages) > 0) && Number(prev.pages) > 0) {
            merged.pages = prev.pages;
          }
          if (
            (!merged.censor_tier || merged.censor_tier === 'unknown') &&
            prev.censor_tier &&
            prev.censor_tier !== 'unknown'
          ) {
            merged.censor_tier = prev.censor_tier;
          }
        }
        if (!merged.created_at) merged.created_at = nowMs();
        await idbPut(STORE_EDITIONS, merged);
        imported++;
      } catch (err) {
        console.warn('[ExC] import related', it && it.gid, err);
      }
    }
    try {
      await touchWorkFromEdition(Object.assign({}, edition, { work_id: workId }));
    } catch (_) { /* ignore */ }
    return { imported: imported, total: picked.length };
  }
