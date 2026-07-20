  function detectSite() {
    const host = location.hostname || '';
    if (/exhentai\.org$/i.test(host)) return 'exhentai';
    if (/e-hentai\.org$/i.test(host)) return 'ehentai';
    return '';
  }

  function detectPageKind() {
    const path = location.pathname || '';
    if (/\/g\/\d+\/[0-9a-f]+\//i.test(path)) return 'gallery';
    if (/\/s\//i.test(path)) return 'image';
    if (/\/tag\//i.test(path)) return 'tag';
    if (/favorites\.php/i.test(path) || path.includes('favorites')) return 'favorites';
    if (/toplist\.php/i.test(path)) return 'toplist';
    if (/watched/i.test(path)) return 'watched';
    return 'list';
  }

  /** 搜索词规范化：空白/大小写，避免 +/%20 编码差拆成两条追更 */
  function normalizeTrackingFSearch(s) {
    return compactText(s)
      .toLowerCase()
      .replace(/[＋+]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * 稳定追更签名：不含 page / f_apply 等噪声参数。
   * 旧版把整段 search 拼进签名，同搜索不同参数会重复建收藏。
   */
  function buildTrackingQuerySignature(parts) {
    parts = parts || {};
    const site = parts.site || '';
    const group = parts.group_type || 'other';
    const ns = compactText(parts.namespace || '').toLowerCase();
    const tag = compactText(parts.tag_name || '').toLowerCase();
    const fav = parts.favcat != null && parts.favcat !== '' ? String(parts.favcat) : '';
    const fs = normalizeTrackingFSearch(parts.f_search || '');
    const cats = compactText(parts.f_cats || '');
    const catsKey = cats && cats !== '0' ? cats : '';
    const browse = compactText(parts.browse_key || '').toLowerCase();
    return [site, group, ns, tag, fav, fs, catsKey, browse].join('|');
  }

  /** EH 游标翻页参数：点「>」常用 next=gid，而不是 page=N */
  function listUrlHasCursorNav(href) {
    try {
      const u = new URL(href || location.href, location.origin);
      const keys = ['next', 'prev', 'seek', 'jump'];
      for (let i = 0; i < keys.length; i++) {
        const v = u.searchParams.get(keys[i]);
        if (v != null && String(v).trim() !== '') return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /** 列表首页 URL：去掉 page/游标/噪声，供 open_url / 检查更新 */
  function canonicalizeTrackingOpenUrl(url) {
    try {
      const u = new URL(url || location.href, location.origin);
      u.hash = '';
      u.searchParams.delete('page');
      // 游标深页参数，绝不能当 open_url 首页
      u.searchParams.delete('next');
      u.searchParams.delete('prev');
      u.searchParams.delete('seek');
      u.searchParams.delete('jump');
      // 表单提交残留，不影响结果集
      u.searchParams.delete('f_apply');
      u.searchParams.delete('apply');
      return u.href;
    } catch (_) {
      return url || location.href;
    }
  }

  function parseExhPageContext(url) {
    let parsed;
    try {
      parsed = new URL(url || location.href, location.origin);
    } catch (_) {
      return null;
    }
    const site = /exhentai/i.test(parsed.hostname) ? 'exhentai' : /e-hentai/i.test(parsed.hostname) ? 'ehentai' : detectSite();
    if (!site) return null;

    const path = parsed.pathname || '';
    const params = parsed.searchParams;
    const kind = (() => {
      if (/\/g\/\d+\/[0-9a-f]+/i.test(path)) return 'gallery';
      if (/\/s\//i.test(path)) return 'image';
      if (/\/tag\//i.test(path)) return 'tag';
      if (/favorites\.php/i.test(path)) return 'favorites';
      if (/toplist\.php/i.test(path)) return 'toplist';
      if (/watched/i.test(path)) return 'watched';
      return 'list';
    })();

    if (kind === 'gallery' || kind === 'image') {
      return {
        trackable: false,
        kind,
        site,
        reason: '画廊/阅读页：请收藏标签、社团、画师或搜索，而不是单本',
      };
    }

    let group_type = 'search';
    let label = '';
    let namespace = '';
    let tag_name = '';
    let f_search = compactText(params.get('f_search') || '');
    let favcat = '';
    let favcat_label = '';
    let f_cats = compactText(params.get('f_cats') || '');
    let browse_key = '';

    // /tag/artist:name  or /tag/group:foo/
    const tagMatch = path.match(/\/tag\/([^/?#]+)/i);
    if (tagMatch) {
      let raw = tagMatch[1];
      try {
        raw = decodeURIComponent(raw.replace(/\+/g, ' '));
      } catch (_) {}
      raw = raw.replace(/\$+$/g, '');
      const colon = raw.indexOf(':');
      if (colon > 0) {
        namespace = compactText(raw.slice(0, colon)).toLowerCase();
        tag_name = compactText(raw.slice(colon + 1));
      } else {
        tag_name = compactText(raw);
      }
      f_search = f_search || (namespace ? namespace + ':"' + tag_name + '$"' : tag_name);
      label = namespace ? namespace + ':' + tag_name : tag_name;
      if (namespace === 'artist') group_type = 'artist';
      else if (namespace === 'group' || namespace === 'translator') group_type = 'group';
      else if (namespace === 'parody') group_type = 'parody';
      else if (namespace === 'character') group_type = 'character';
      else if (namespace === 'female') group_type = 'female';
      else if (namespace === 'male') group_type = 'male';
      else if (namespace === 'uploader') group_type = 'uploader';
      else group_type = 'tag';
    } else if (kind === 'favorites') {
      group_type = 'favorites';
      const cat = params.get('favcat');
      favcat = cat != null && cat !== '' ? String(cat) : 'all';
      try {
        const sel =
          document.querySelector('#favcat option[selected]') ||
          document.querySelector('select[name="favcat"] option[selected]') ||
          document.querySelector('#favcat option:checked');
        if (sel) favcat_label = compactText(sel.textContent);
        if (!favcat_label && favcat !== 'all') {
          const byVal = document.querySelector(
            '#favcat option[value="' + favcat + '"], select[name="favcat"] option[value="' + favcat + '"]'
          );
          if (byVal) favcat_label = compactText(byVal.textContent);
        }
      } catch (_) { /* ignore */ }
      label = favcat_label
        ? '收藏 · ' + favcat_label
        : favcat === 'all'
          ? '站内收藏夹 · 全部'
          : '站内收藏夹 · ' + favcat;
      f_search = 'favorites:' + favcat;
    } else if (kind === 'toplist') {
      group_type = 'other';
      label = '排行榜';
      f_search = 'toplist';
      browse_key = 'toplist';
    } else if (f_search) {
      label = f_search;
      group_type = 'search';
      if (/^artist:"/i.test(f_search) || /^artist:/i.test(f_search)) group_type = 'artist';
      else if (/^group:"/i.test(f_search) || /^group:/i.test(f_search)) group_type = 'group';
      else if (/^parody:"/i.test(f_search) || /^parody:/i.test(f_search)) group_type = 'parody';
      else if (/^character:"/i.test(f_search)) group_type = 'character';
      else if (/^female:"/i.test(f_search)) group_type = 'female';
      else if (/^male:"/i.test(f_search)) group_type = 'male';
    } else {
      if (f_cats && f_cats !== '0') {
        group_type = 'category';
        label = '分类 f_cats=' + f_cats;
        f_search = 'f_cats:' + f_cats;
        browse_key = 'cats:' + f_cats;
      } else {
        group_type = 'other';
        label = '首页/浏览';
        f_search = 'browse:home';
        browse_key = 'home:' + (path || '/').toLowerCase();
      }
    }

    // 页码：URL page= + DOM + next/prev 游标；仅真·首页才写 top
    const pageState =
      typeof getListPageState === 'function'
        ? getListPageState(parsed.href, typeof document !== 'undefined' ? document : null)
        : { index: getListPageIndexFromUrl(parsed.href), known: true, isFirst: getListPageIndexFromUrl(parsed.href) <= 0, mode: 'page', display: '' };
    const pageIndex = pageState.known ? pageState.index : -1;
    const isFirst = pageState.isFirst === true;

    // 「最新」只认真·首页第一条；next=/深页第一条不能当 top
    let top_gid = '';
    let top_token = '';
    let top_title = '';
    let top_cover = '';
    let top_posted_at = 0;
    let page_head_gid = '';
    let page_head_token = '';
    let page_head_title = '';
    let page_head_cover = '';
    let page_head_posted_at = 0;

    const firstLink = document.querySelector(
      '#ido a[href*="/g/"], table.itg a[href*="/g/"], .itg a[href*="/g/"], a[href*="/g/"]'
    );
    if (firstLink) {
      const gt = parseGalleryUrl(firstLink.href || firstLink.getAttribute('href'));
      // 注意：不要 closest('[class*="gl"]')，会误命中 .glink 自身，吃不到 posted
      const cardRoot =
        firstLink.closest('tr, .gl1t, .gl1e, .gl2t, .gl3t') ||
        firstLink.parentElement ||
        firstLink;
      const titleEl =
        (cardRoot &&
          cardRoot.querySelector('.glink, .glname a, .gl3e a, .gl4e a')) ||
        firstLink;
      const title = compactText(titleEl && titleEl.textContent ? titleEl.textContent : '');
      const cover = extractListItemCoverUrl(cardRoot || firstLink);
      const posted = extractListItemPostedAt(cardRoot || firstLink, gt && gt.gid);
      if (gt) {
        page_head_gid = gt.gid;
        page_head_token = gt.token || '';
      }
      page_head_title = title;
      page_head_cover = cover;
      page_head_posted_at = posted;
      if (isFirst) {
        top_gid = page_head_gid;
        top_token = page_head_token;
        top_title = page_head_title;
        top_cover = page_head_cover;
        top_posted_at = page_head_posted_at;
      }
    }

    const open_url = canonicalizeTrackingOpenUrl(parsed.href);
    const query_signature = buildTrackingQuerySignature({
      site,
      group_type,
      namespace,
      tag_name,
      f_search,
      favcat,
      f_cats,
      browse_key,
    });

    return {
      trackable: true,
      kind,
      site,
      group_type,
      label: compactText(label) || '未命名搜索',
      namespace,
      tag_name,
      f_search,
      f_cats,
      browse_key,
      favcat: favcat || '',
      favcat_label: favcat_label || '',
      open_url,
      page_url: open_url,
      page_index: pageIndex,
      page_known: pageState.known !== false,
      page_is_first: isFirst,
      page_mode: pageState.mode || '',
      page_display: pageState.display || formatListPageDisplay(pageState),
      // 仅首页有效；深页为空，避免污染 top
      top_gid,
      top_token,
      top_title,
      top_cover,
      top_posted_at,
      // 当前页第一条（定位/显示用，不当「最新」）
      page_head_gid,
      page_head_token,
      page_head_title,
      page_head_cover,
      page_head_posted_at,
      query_signature,
    };
  }

  /** 规范化日期文本：全角数字、各种横线、nbsp */
  function normalizePostedText(raw) {
    let s = String(raw == null ? '' : raw);
    s = s.replace(/[\u2010-\u2015\u2212\uff0d]/g, '-');
    s = s.replace(/[\u00a0\u2000-\u200b\u202f\u205f\u3000]/g, ' ');
    // 全角数字 → 半角
    s = s.replace(/[\uff10-\uff19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30));
    return compactText(s);
  }

  /**
   * 从列表卡片取发布时间（ms）。
   * 优先 #posted_{gid}（全页），再卡片内文本。极简模式可能无日期 → 上层用 gdata 补。
   */
  function extractListItemPostedAt(root, gid) {
    const g = compactText(gid || '');
    const tryNode = (node) => {
      if (!node) return 0;
      const bits = [
        node.textContent,
        node.innerText,
        node.getAttribute && node.getAttribute('title'),
        node.getAttribute && node.getAttribute('data-title'),
        node.outerHTML,
      ];
      for (let i = 0; i < bits.length; i++) {
        const t = parsePostedToMs(bits[i]);
        if (t) return t;
      }
      return 0;
    };
    // 全页 id 最准（扩展/缩略图列表）
    if (g && typeof document !== 'undefined') {
      try {
        const byId = document.getElementById('posted_' + g);
        const t = tryNode(byId);
        if (t) return t;
        // 有的皮肤 id 大小写或嵌套
        const alt =
          document.querySelector('[id="posted_' + g + '"]') ||
          document.querySelector('[id="Posted_' + g + '"]');
        const t2 = tryNode(alt);
        if (t2) return t2;
      } catch (_) { /* ignore */ }
    }
    if (root && root.querySelector) {
      if (g) {
        const t = tryNode(root.querySelector('#posted_' + g));
        if (t) return t;
      }
      const postedEls = root.querySelectorAll('[id^="posted_"], [id^="Posted_"]');
      for (let i = 0; i < postedEls.length; i++) {
        const t = tryNode(postedEls[i]);
        if (t) return t;
      }
      const dateEl = root.querySelector('.glnew, .gltime, .gl4t, .gl2c, td.gl2c');
      if (dateEl) {
        const t = tryNode(dateEl);
        if (t) return t;
      }
      const blob = normalizePostedText(root.textContent || '').slice(0, 1200);
      const m = blob.match(/(20\d{2}-\d{1,2}-\d{1,2})(?:\s+(\d{1,2}:\d{2}))?/);
      if (m) return parsePostedToMs(m[1] + (m[2] ? ' ' + m[2] : ''));
    }
    // 无 root 时仍可用 gid 扫全页邻近
    if (g && typeof document !== 'undefined') {
      try {
        const link = document.querySelector('a[href*="/g/' + g + '/"]');
        if (link) {
          const card =
            link.closest('tr, .gl1t, .gl1e, .gl2t, .gl3t, .exc-gl-item') ||
            link.parentElement;
          if (card && card !== root) {
            const blob = normalizePostedText(card.textContent || '').slice(0, 1200);
            const m = blob.match(/(20\d{2}-\d{1,2}-\d{1,2})(?:\s+(\d{1,2}:\d{2}))?/);
            if (m) return parsePostedToMs(m[1] + (m[2] ? ' ' + m[2] : ''));
          }
        }
      } catch (_) { /* ignore */ }
    }
    return 0;
  }

  function extractTokenForGidFromDom(gid) {
    const g = compactText(gid || '');
    if (!g) return '';
    try {
      const a = document.querySelector('a[href*="/g/' + g + '/"]');
      if (!a) return '';
      const gt = parseGalleryUrl(a.href || a.getAttribute('href') || '');
      return gt && gt.token ? gt.token : '';
    } catch (_) {
      return '';
    }
  }

  function getEhGdataApiUrl() {
    const h = (location.hostname || '').toLowerCase();
    if (h.indexOf('exhentai') >= 0) {
      return (location.origin || 'https://exhentai.org').replace(/\/$/, '') + '/api.php';
    }
    return 'https://api.e-hentai.org/api.php';
  }

  /**
   * EH 官方 gdata 批量：posted / 页数 / 体积 / 标签（码级语言）。
   * @param {{gid:string|number,token:string}[]} pairs
   * @returns {Promise<Object<string, object>>} gid → meta
   */
  async function fetchGalleryGdataBatch(pairs) {
    const out = Object.create(null);
    const uniq = [];
    const seen = Object.create(null);
    for (let i = 0; i < (pairs || []).length; i++) {
      const p = pairs[i] || {};
      const g = compactText(p.gid || '');
      const t = compactText(p.token || '');
      if (!g || !t || seen[g]) continue;
      seen[g] = 1;
      uniq.push({ gid: g, token: t });
    }
    if (!uniq.length) return out;
    const api = getEhGdataApiUrl();
    for (let off = 0; off < uniq.length; off += 25) {
      const chunk = uniq.slice(off, off + 25);
      const gidlist = chunk.map((x) => [Number(x.gid), x.token]);
      try {
        const res = await gmRequest({
          method: 'POST',
          url: api,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          data: JSON.stringify({
            method: 'gdata',
            gidlist: gidlist,
            namespace: 1,
          }),
          timeout: 25000,
        });
        let body = res && (res.responseText || res.response);
        if (typeof body === 'string') {
          try {
            body = JSON.parse(body);
          } catch (_) {
            body = null;
          }
        }
        const arr = body && body.gmetadata;
        if (!Array.isArray(arr)) continue;
        for (let j = 0; j < arr.length; j++) {
          const meta = arr[j];
          if (!meta || meta.error) continue;
          const g = compactText(meta.gid);
          if (!g) continue;
          const sec = Number(meta.posted);
          const pages = Number(meta.filecount) || 0;
          const size_bytes = Number(meta.filesize) || 0;
          const tags = Array.isArray(meta.tags) ? meta.tags.map(String) : [];
          const title = compactText(meta.title || meta.title_jpn || '');
          const language = detectLanguageFromText(title, tags);
          const censor_tier = detectCensorTier(title, tags);
          const group =
            extractGroupFromTitle(title) || extractGroupsFromTags(tags)[0] || '';
          out[g] = {
            gid: g,
            token: compactText(meta.token || ''),
            posted_at: Number.isFinite(sec) && sec > 0 ? Math.round(sec * 1000) : 0,
            pages: pages,
            size_bytes: size_bytes,
            tags: tags,
            title_raw: title,
            language: language,
            censor_tier: censor_tier,
            group: group,
            uploader: compactText(meta.uploader || ''),
          };
        }
      } catch (_) {
        /* ignore chunk errors */
      }
    }
    return out;
  }

  /** gdata 仅取 posted（兼容旧调用） */
  async function fetchGalleryMetaPostedMs(gid, token) {
    const map = await fetchGalleryGdataBatch([{ gid: gid, token: token }]);
    const g = compactText(gid || '');
    return (map && map[g] && map[g].posted_at) || 0;
  }

  /** @param {{gid:string|number,token:string}[]} pairs */
  async function fetchGalleryMetaPostedBatch(pairs) {
    const full = await fetchGalleryGdataBatch(pairs);
    const out = Object.create(null);
    Object.keys(full).forEach((g) => {
      if (full[g] && full[g].posted_at) out[g] = full[g].posted_at;
    });
    return out;
  }

  /** 列表卡片抽页数/体积（缩略图/扩展模式常见） */
  function extractListItemPagesSize(root) {
    const result = { pages: 0, size_bytes: 0, size_text: '' };
    if (!root) return result;
    const blob = compactText(root.textContent || '').slice(0, 2000);
    // 页数：123 pages / 123頁 / 123p
    let m = blob.match(/(\d{1,5})\s*(?:pages?|頁|页|p)\b/i);
    if (m) result.pages = parseInt(m[1], 10) || 0;
    // 体积：220.8 MB / 389.5 MiB
    m = blob.match(/([\d.]+)\s*(TiB|GiB|MiB|KiB|TB|GB|MB|KB|B)\b/i);
    if (m) {
      result.size_text = m[1] + ' ' + m[2];
      result.size_bytes = parseSizeToBytes(result.size_text) || 0;
    }
    // 缩略图模式 .ir 等
    try {
      const ir = root.querySelector && root.querySelector('.ir, .glthumb div div, .gl4c, .gl3c');
      if (ir) {
        const t = compactText(ir.textContent || '');
        if (!result.pages) {
          const pm = t.match(/(\d{1,5})\s*(?:pages?|頁|页)/i);
          if (pm) result.pages = parseInt(pm[1], 10) || 0;
        }
        if (!result.size_bytes) {
          const sm = t.match(/([\d.]+)\s*(TiB|GiB|MiB|KiB|TB|GB|MB|KB)\b/i);
          if (sm) {
            result.size_text = sm[1] + ' ' + sm[2];
            result.size_bytes = parseSizeToBytes(result.size_text) || 0;
          }
        }
      }
    } catch (_) { /* ignore */ }
    return result;
  }

  /** 从离线 doc 取 posted（不用全局 document） */
  function extractListItemPostedAtInDoc(root, gid, doc) {
    const g = compactText(gid || '');
    const tryNode = (node) => {
      if (!node) return 0;
      const bits = [
        node.textContent,
        node.getAttribute && node.getAttribute('title'),
        node.outerHTML,
      ];
      for (let i = 0; i < bits.length; i++) {
        const t = parsePostedToMs(bits[i]);
        if (t) return t;
      }
      return 0;
    };
    if (g && doc && doc.getElementById) {
      const t = tryNode(doc.getElementById('posted_' + g));
      if (t) return t;
    }
    if (root && root.querySelector) {
      if (g) {
        const t = tryNode(root.querySelector('#posted_' + g));
        if (t) return t;
      }
      const postedEls = root.querySelectorAll('[id^="posted_"], [id^="Posted_"]');
      for (let i = 0; i < postedEls.length; i++) {
        const t = tryNode(postedEls[i]);
        if (t) return t;
      }
      const dateEl = root.querySelector('.glnew, .gltime, .gl4t, .gl2c, td.gl2c, .gl3e, .gl4e');
      if (dateEl) {
        const t = tryNode(dateEl);
        if (t) return t;
      }
      const blob = normalizePostedText(root.textContent || '').slice(0, 1200);
      const m = blob.match(/(20\d{2}-\d{1,2}-\d{1,2})(?:\s+(\d{1,2}:\d{2}))?/);
      if (m) return parsePostedToMs(m[1] + (m[2] ? ' ' + m[2] : ''));
    }
    return 0;
  }

  /** 解析作品发布时间：DOM →（可选）gdata */
  async function resolveGalleryPostedMs(gid, token, root) {
    const g = compactText(gid || '');
    if (!g) return 0;
    let p = extractListItemPostedAt(root || null, g);
    if (p) return p;
    p = lookupDomPostedByGid(g);
    if (p) return p;
    let tok = compactText(token || '');
    if (!tok) tok = extractTokenForGidFromDom(g);
    if (tok) {
      p = await fetchGalleryMetaPostedMs(g, tok);
      if (p) return p;
    }
    return 0;
  }

  /** 当前页 DOM 按 gid 找发布时间（回填旧追更记录用） */
  function lookupDomPostedByGid(gid) {
    const g = compactText(gid || '');
    if (!g) return 0;
    try {
      const byId = document.getElementById('posted_' + g);
      if (byId) {
        const t = parsePostedToMs(byId.textContent || '');
        if (t) return t;
      }
      const links = document.querySelectorAll('a[href*="/g/' + g + '/"]');
      for (let i = 0; i < links.length; i++) {
        const card =
          links[i].closest('tr, .gl1t, .gl1e, .gl2t, .gl3t, .exc-gl-item') ||
          links[i].parentElement;
        const t = extractListItemPostedAt(card, g);
        if (t) return t;
      }
    } catch (_) { /* ignore */ }
    return 0;
  }

  /** 从 editions 库按 gid 取 posted_at（gid 可能是 string/number） */
  async function lookupEditionPostedByGid(gid) {
    const g = compactText(gid || '');
    if (!g) return 0;
    try {
      let rows = await idbIndexGetAll(STORE_EDITIONS, 'gid', g);
      if ((!rows || !rows.length) && /^\d+$/.test(g)) {
        rows = await idbIndexGetAll(STORE_EDITIONS, 'gid', Number(g));
      }
      if (!rows || !rows.length) return 0;
      let best = 0;
      for (let i = 0; i < rows.length; i++) {
        const p = Number(rows[i] && rows[i].posted_at) || 0;
        if (p > best) best = p;
      }
      return best;
    } catch (_) {
      return 0;
    }
  }

  /**
   * 补全追更记录的 top/断点发布时间。
   * 顺序：DOM → editions → gdata（需 token）。
   * @param {object} [opts]
   * @param {boolean} [opts.skipGdata]
   */
  async function enrichTrackingPostedFields(rec, opts) {
    if (!rec) return rec;
    opts = opts || {};
    let dirty = false;
    if (rec.top_gid && !(Number(rec.top_posted_at) > 0)) {
      let p = lookupDomPostedByGid(rec.top_gid);
      if (!p) p = await lookupEditionPostedByGid(rec.top_gid);
      if (!p && !opts.skipGdata) {
        const tok = compactText(rec.top_token || '') || extractTokenForGidFromDom(rec.top_gid);
        if (tok) {
          if (!rec.top_token) rec.top_token = tok;
          p = await fetchGalleryMetaPostedMs(rec.top_gid, tok);
        }
      }
      if (p) {
        rec.top_posted_at = p;
        dirty = true;
      }
    }
    if (rec.breakpoint_gid && !(Number(rec.breakpoint_posted_at) > 0)) {
      let p = lookupDomPostedByGid(rec.breakpoint_gid);
      if (!p) p = await lookupEditionPostedByGid(rec.breakpoint_gid);
      if (!p && !opts.skipGdata) {
        const tok =
          compactText(rec.breakpoint_token || '') ||
          extractTokenForGidFromDom(rec.breakpoint_gid);
        if (tok) {
          if (!rec.breakpoint_token) rec.breakpoint_token = tok;
          p = await fetchGalleryMetaPostedMs(rec.breakpoint_gid, tok);
        }
      }
      if (p) {
        rec.breakpoint_posted_at = p;
        dirty = true;
      }
    }
    if (dirty) {
      try {
        await saveTrackingRecord(rec);
      } catch (_) { /* ignore */ }
    }
    return rec;
  }

  /** 批量补全列表里缺失的发布时间（gdata 每批最多 25） */
  async function enrichTrackingListPosted(list) {
    const rows = list || [];
    const need = [];
    for (let i = 0; i < rows.length; i++) {
      const rec = rows[i];
      if (!rec) continue;
      await enrichTrackingPostedFields(rec, { skipGdata: true });
      if (rec.top_gid && !(Number(rec.top_posted_at) > 0)) {
        const tok = compactText(rec.top_token || '') || extractTokenForGidFromDom(rec.top_gid);
        if (tok) {
          rec.top_token = rec.top_token || tok;
          need.push({ gid: rec.top_gid, token: tok, rec: rec, field: 'top' });
        }
      }
      if (rec.breakpoint_gid && !(Number(rec.breakpoint_posted_at) > 0)) {
        const tok =
          compactText(rec.breakpoint_token || '') ||
          extractTokenForGidFromDom(rec.breakpoint_gid);
        if (tok) {
          rec.breakpoint_token = rec.breakpoint_token || tok;
          need.push({ gid: rec.breakpoint_gid, token: tok, rec: rec, field: 'bp' });
        }
      }
    }
    if (!need.length) return rows;
    const pairs = need.map((x) => ({ gid: x.gid, token: x.token }));
    const map = await fetchGalleryMetaPostedBatch(pairs);
    const dirtyIds = Object.create(null);
    for (let j = 0; j < need.length; j++) {
      const item = need[j];
      const ms = map[compactText(item.gid)] || 0;
      if (!ms) continue;
      if (item.field === 'top' && !(Number(item.rec.top_posted_at) > 0)) {
        item.rec.top_posted_at = ms;
        dirtyIds[item.rec.id] = item.rec;
      }
      if (item.field === 'bp' && !(Number(item.rec.breakpoint_posted_at) > 0)) {
        item.rec.breakpoint_posted_at = ms;
        dirtyIds[item.rec.id] = item.rec;
      }
    }
    const saves = Object.keys(dirtyIds);
    for (let k = 0; k < saves.length; k++) {
      try {
        await saveTrackingRecord(dirtyIds[saves[k]]);
      } catch (_) { /* ignore */ }
    }
    return rows;
  }

  /** 从列表卡片节点取封面图 URL（img / data-src / 背景图） */
  function extractListItemCoverUrl(root, baseUrl) {
    if (!root) return '';
    baseUrl = baseUrl || location.href;
    const pick = (raw) => {
      let s = compactText(raw || '');
      if (!s || /^data:/i.test(s)) return '';
      if (/placeholder|blank\.|spacer|1x1|loading\.gif|transparent|data:image\/gif/i.test(s)) {
        return '';
      }
      if (s.indexOf(',') >= 0) s = compactText(s.split(',')[0] || '');
      if (/\s/.test(s)) s = compactText(s.split(/\s+/)[0] || '');
      try {
        return new URL(s, baseUrl).href;
      } catch (_) {
        return s;
      }
    };
    const imgs = root.querySelectorAll ? root.querySelectorAll('img') : [];
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      const src =
        img.getAttribute('data-src') ||
        img.getAttribute('data-original') ||
        img.getAttribute('data-lazy-src') ||
        img.getAttribute('data-srcset') ||
        img.getAttribute('srcset') ||
        img.currentSrc ||
        img.getAttribute('src') ||
        '';
      const u = pick(src);
      if (u) return u;
    }
    // 部分模式用 div 背景当缩略图
    const styled = root.querySelectorAll
      ? root.querySelectorAll('.glthumb div, .glthumb, [style*="background"]')
      : [];
    for (let j = 0; j < styled.length; j++) {
      const st = (styled[j].getAttribute('style') || '') + '';
      const m = st.match(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/i);
      if (m) {
        const u = pick(m[1]);
        if (u) return u;
      }
    }
    return '';
  }

  /** 从 URL 读 page（EH 从 0 起）。无 page 参数时返回 null（不是 0） */
  function getListPageIndexFromUrl(href) {
    try {
      const raw = new URL(href || location.href, location.origin).searchParams.get('page');
      if (raw == null || raw === '') return null;
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n >= 0 ? n : null;
    } catch (_) {
      return null;
    }
  }

  /**
   * 从分页表读当前页（0 起）。
   * EH 有 .ptt（上）/ .ptb（下）；游标 next= 时 .ptds 常仍亮「1」，不可单独信任。
   */
  function getListPageIndexFromDom(doc) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    if (!doc || !doc.querySelector) return null;
    try {
      const roots = [];
      const ptt = doc.querySelector('#ido table.ptt, table.ptt, .ptt');
      const ptb = doc.querySelector('#ido table.ptb, table.ptb, .ptb');
      if (ptt) roots.push(ptt);
      if (ptb && ptb !== ptt) roots.push(ptb);
      if (!roots.length) roots.push(doc);

      for (let r = 0; r < roots.length; r++) {
        const root = roots[r];
        const cur =
          root.querySelector('td.ptds') ||
          root.querySelector('.ptds');
        if (cur) {
          const t = compactText(cur.textContent || '');
          // 忽略 < > » 等非数字
          const n = parseInt(t, 10);
          if (Number.isFinite(n) && n >= 1 && n < 5000 && String(n) === t.replace(/[^\d]/g, '')) {
            return n - 1;
          }
          // 文本里夹杂时再试
          const m = t.match(/(\d{1,4})/);
          if (m) {
            const nn = parseInt(m[1], 10);
            if (Number.isFinite(nn) && nn >= 1 && nn < 5000) return nn - 1;
          }
        }
        // 当前页：无链接的数字格
        const cells = root.querySelectorAll('td');
        for (let i = 0; i < cells.length; i++) {
          const td = cells[i];
          if (!td || td.querySelector('a')) continue;
          const t = compactText(td.textContent || '');
          const n = parseInt(t, 10);
          if (Number.isFinite(n) && n >= 1 && n < 5000 && String(n) === t) return n - 1;
        }
      }
    } catch (_) { /* ignore */ }
    return null;
  }

  function formatListPageDisplay(state) {
    if (!state) return '?';
    if (state.isFirst) return '1';
    if (state.known && state.index >= 0) return String(state.index + 1);
    if (state.mode === 'cursor') return '深页';
    return '?';
  }

  /**
   * 列表页位置状态。
   * ExH 点「>」常用 ?next=gid（游标），URL 无 page=，.ptds 还可能停在 1 —— 不能当首页。
   * @returns {{ index: number, known: boolean, isFirst: boolean, mode: string, display: string }}
   */
  function getListPageState(href, doc) {
    href = href || (typeof location !== 'undefined' ? location.href : '');
    doc = doc !== undefined ? doc : typeof document !== 'undefined' ? document : null;
    const cursor = listUrlHasCursorNav(href);
    const fromUrl = getListPageIndexFromUrl(href);
    // 仅当前文档 URL 才信 DOM（解析别的 href 时 DOM 对不上）
    let fromDom = null;
    try {
      const sameDoc =
        doc &&
        typeof location !== 'undefined' &&
        (() => {
          try {
            const a = new URL(href, location.origin);
            const b = new URL(location.href, location.origin);
            return a.pathname === b.pathname && a.search === b.search;
          } catch (_) {
            return false;
          }
        })();
      if (sameDoc || (doc && href === (typeof location !== 'undefined' ? location.href : href))) {
        fromDom = getListPageIndexFromDom(doc);
      }
    } catch (_) { /* ignore */ }

    // 1) 明确 page=N
    if (fromUrl != null && fromUrl > 0) {
      return {
        index: fromUrl,
        known: true,
        isFirst: false,
        mode: 'page',
        display: String(fromUrl + 1),
      };
    }
    if (fromUrl === 0 && !cursor) {
      return { index: 0, known: true, isFirst: true, mode: 'page', display: '1' };
    }

    // 2) 游标 next/prev/seek/jump：绝不是结果集首页
    if (cursor) {
      // DOM 若给出 >1 的页码可参考；=0/1 在游标下不可信
      if (fromDom != null && fromDom > 0) {
        return {
          index: fromDom,
          known: true,
          isFirst: false,
          mode: 'cursor',
          display: String(fromDom + 1),
        };
      }
      return {
        index: -1,
        known: false,
        isFirst: false,
        mode: 'cursor',
        display: '深页',
      };
    }

    // 3) 无 page、无游标：看 DOM
    if (fromDom != null && fromDom > 0) {
      return {
        index: fromDom,
        known: true,
        isFirst: false,
        mode: 'dom',
        display: String(fromDom + 1),
      };
    }
    if (fromDom === 0) {
      return { index: 0, known: true, isFirst: true, mode: 'dom', display: '1' };
    }

    // 4) 默认当首页（无任何深页信号）
    return { index: 0, known: true, isFirst: true, mode: 'home', display: '1' };
  }

  /** 当前列表页码（0 起）；游标深页未知时 -1 */
  function getCurrentListPageIndex() {
    const st = getListPageState(location.href, document);
    if (st.known && st.index >= 0) return st.index;
    if (!st.isFirst) return -1;
    return 0;
  }

  function buildListUrlWithPage(baseUrl, pageIndex) {
    try {
      const u = new URL(baseUrl || location.href, location.origin);
      // 按页码跳转时清掉游标，否则 page= 与 next= 混用结果难料
      u.searchParams.delete('next');
      u.searchParams.delete('prev');
      u.searchParams.delete('seek');
      u.searchParams.delete('jump');
      const p = Math.max(0, Math.floor(Number(pageIndex) || 0));
      if (p <= 0) u.searchParams.delete('page');
      else u.searchParams.set('page', String(p));
      u.searchParams.delete('f_apply');
      u.searchParams.delete('apply');
      return u.href;
    } catch (_) {
      return baseUrl || location.href;
    }
  }

  async function saveCurrentPageAsTracking() {
    const ctx = parseExhPageContext(location.href);
    if (!ctx || !ctx.trackable) {
      showToast((ctx && ctx.reason) || '当前页不能收藏。请打开标签/搜索/社团页再点收藏。');
      return null;
    }
    // 列表 DOM 经常拿不到 posted（极简模式等）→ gdata 补最新发布时间
    if (ctx.top_gid && !(Number(ctx.top_posted_at) > 0)) {
      ctx.top_posted_at = await resolveGalleryPostedMs(
        ctx.top_gid,
        ctx.top_token || '',
        null
      );
    }
    const rec = await upsertTrackingFromContext(ctx);
    // 顺手记下当前页为浏览位置
    try {
      rec.last_page = getCurrentListPageIndex();
      rec.last_browsed_at = nowMs();
      if (ctx.top_token) rec.top_token = ctx.top_token;
      if (ctx.top_posted_at && !(Number(rec.top_posted_at) > 0)) {
        rec.top_posted_at = Number(ctx.top_posted_at) || 0;
      }
      await saveTrackingRecord(rec);
    } catch (_) { /* ignore */ }
    showToast('已收藏：' + getTrackingDisplayTitle(rec));
    if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
    return rec;
  }

  /**
   * 设追更断点。
   * @param {object} rec tracking record
   * @param {object} [opts]
   * @param {string} [opts.gid] 断点作品 gid（作品级，主断点）
   * @param {string} [opts.token]
   * @param {string} [opts.title]
   * @param {number} [opts.posted_at]
   * @param {Element} [opts.root] 列表卡片根节点（辅助抽 posted）
   * @param {boolean} [opts.pageOnly] 仅记当前列表页（顶栏「本页」）
   */
  async function markTrackingBreakpoint(rec, opts) {
    if (!rec) return null;
    opts = opts || {};
    // fromGallery：当前在画廊页，页码/URL 用 opts 传入的列表上下文，勿读 location
    const fromGallery = opts.fromGallery === true;
    const pageState = fromGallery
      ? { known: opts.pageIndex != null && Number(opts.pageIndex) >= 0, index: Number(opts.pageIndex), isFirst: Number(opts.pageIndex) === 0, mode: opts.pageMode || '' }
      : getListPageState(location.href, document);
    const page = pageState.known && pageState.index >= 0 ? pageState.index : -1;
    rec.breakpoint_page = page;
    rec.breakpoint_page_known = pageState.known && page >= 0 ? 1 : 0;
    rec.breakpoint_page_mode = pageState.mode || '';
    rec.breakpoint_url = fromGallery && opts.listUrl
      ? String(opts.listUrl).split('#')[0]
      : location.href.split('#')[0];
    rec.breakpoint_at = nowMs();
    rec.last_page = page;
    rec.last_browsed_at = nowMs();
    if (rec.open_url) {
      rec.open_url = canonicalizeTrackingOpenUrl(rec.open_url);
      rec.page_url = rec.open_url;
    }
    if (opts.pageOnly) {
      // 仅页码，不改作品断点
    } else if (opts.gid) {
      rec.breakpoint_gid = String(opts.gid);
      rec.breakpoint_token = compactText(opts.token || '');
      rec.breakpoint_title = compactText(opts.title || '').slice(0, 120);
      let posted = Number(opts.posted_at) || 0;
      if (!posted) {
        posted = await resolveGalleryPostedMs(
          opts.gid,
          opts.token || rec.breakpoint_token,
          opts.root || null
        );
      }
      if (posted) rec.breakpoint_posted_at = posted;
    }
    // 设断点后回写未读（画廊页无列表 DOM，跳过估数）
    try {
      if (fromGallery) {
        if (rec.top_gid && rec.breakpoint_gid && String(rec.top_gid) === String(rec.breakpoint_gid)) {
          rec.has_update = 0;
          rec.unread_estimate = 0;
          rec.unread_estimate_capped = 0;
          rec.unread_estimate_source = 'home_caught_up';
        } else if (rec.breakpoint_gid) {
          rec.has_update = 1;
          // 断点已前移：未读必须下降或重算，禁止继续挂着旧的 +226
          const prevEst = Math.max(0, Math.floor(Number(rec.unread_estimate) || 0));
          const pIdx = Number(opts.pageIndex);
          const lIdx = Number(opts.listIndex);
          const pLen = Number(opts.pageLen) || 25;
          let provisional = -1;
          if (Number.isFinite(pIdx) && pIdx >= 0 && Number.isFinite(lIdx) && lIdx >= 0) {
            writeUnreadFromPagePos(rec, pIdx, lIdx, pLen);
            provisional = Math.max(0, Math.floor(Number(rec.unread_estimate) || 0));
            // 跟断点只往更新走：公式若异常偏高，先压到不超过旧值
            if (prevEst > 0 && provisional > prevEst) {
              rec.unread_estimate = prevEst;
              provisional = prevEst;
            }
          } else if (prevEst > 0) {
            // 无页码时先不清成 0（避免闪「更新」），标记待扫；扫描后覆盖
            rec.unread_estimate_capped = 1;
            rec.unread_estimate_source = 'bp_advanced';
          }
          await saveTrackingRecord(rec);
          if (opts.skipUnreadScan !== true) {
            try {
              if (typeof showToast === 'function') showToast('断点已跟到，正在重算未读…');
              rec = (await recountTrackingUnreadDeep(rec, { prevEstimate: prevEst })) || rec;
            } catch (e) {
              console.warn('[ExC] unread scan after gallery bp', e);
              // 扫描失败：至少用临时公式，且不得超过旧值
              if (provisional >= 0 && provisional < prevEst) {
                rec.unread_estimate = provisional;
                rec.unread_estimate_capped = 1;
                rec.unread_estimate_source = 'page_formula';
                await saveTrackingRecord(rec);
              }
            }
          }
          return rec;
        }
        await saveTrackingRecord(rec);
        return rec;
      }
      const gids =
        typeof extractOrderedGidsFromDocument === 'function'
          ? extractOrderedGidsFromDocument(document)
          : [];
      const top = compactText(rec.top_gid || '');
      const homeLook = listPageLooksLikeHome(gids, top);
      let isFirst = pageState.isFirst === true;
      let known = pageState.known === true && page >= 0;
      let pageIdx = known ? page : -1;
      if (homeLook === false) {
        isFirst = false;
        // 无可信页码时，用 last_page / 浏览页兜底，保证还能算出数量
        if (pageIdx <= 0) {
          const lp = Number(rec.last_page);
          if (Number.isFinite(lp) && lp > 0) {
            pageIdx = lp;
            known = true;
            rec.breakpoint_page = lp;
            rec.breakpoint_page_known = 1;
          } else {
            known = false;
            pageIdx = -1;
            rec.breakpoint_page = -1;
            rec.breakpoint_page_known = 0;
            if (!rec.breakpoint_page_mode || rec.breakpoint_page_mode === 'home') {
              rec.breakpoint_page_mode = pageState.mode || 'cursor';
            }
          }
        }
      }
      const bpGid = compactText(rec.breakpoint_gid || '');
      const listIdx = bpGid && gids.length ? gids.indexOf(String(bpGid)) : -1;
      const pageLen = gids.length || 25;
      if (isFirst && homeLook !== false) {
        // 真·首页：当页位置 = 精确未读
        if (listIdx >= 0) writeUnreadFromPagePos(rec, 0, listIdx, pageLen);
        else if (typeof applyTrackingUnreadFromGids === 'function') {
          applyTrackingUnreadFromGids(rec, gids, top, {
            pageIndex: 0,
            isFirst: true,
            deepUnknown: false,
            mode: 'absolute',
          });
        }
        if (rec.unread_estimate_source !== 'home_caught_up') {
          rec.unread_estimate_source = rec.unread_estimate_source || 'set_bp_home';
        }
      } else if (known && pageIdx > 0 && listIdx >= 0) {
        // 临时页码公式；下面会跨页精确扫覆盖
        writeUnreadFromPagePos(rec, pageIdx, listIdx, pageLen);
      } else if (top && bpGid && top !== bpGid) {
        rec.has_update = 1;
        // 禁止再写假的 +25（一页条数）；保留旧值等跨页扫描
      }
      // 非首页：从首页扫到断点，写真实数量（否则永远是 +25+）
      const needScan =
        opts.skipUnreadScan !== true &&
        bpGid &&
        !(isFirst && homeLook !== false && listIdx >= 0);
      if (needScan && !(isFirst && homeLook !== false)) {
        await saveTrackingRecord(rec);
        try {
          if (typeof showToast === 'function') showToast('断点已记，正在计算未读…');
          rec = (await recountTrackingUnreadDeep(rec)) || rec;
        } catch (scanErr) {
          console.warn('[ExC] unread scan', scanErr);
        }
        return rec;
      }
    } catch (_) { /* ignore */ }
    await saveTrackingRecord(rec);
    return rec;
  }

  /** 从首页扫到断点写 unread_estimate；opts.prevEstimate 防止扫失败保留过大旧值 */
  async function recountTrackingUnreadDeep(rec, opts) {
    if (!rec) return null;
    opts = opts || {};
    const bp = compactText(rec.breakpoint_gid || '');
    const raw = rec.open_url || rec.page_url || '';
    if (!bp || !raw) return rec;
    const prevEst = Math.max(
      0,
      Math.floor(Number(opts.prevEstimate != null ? opts.prevEstimate : rec.unread_estimate) || 0)
    );
    const home = buildListUrlWithPage(canonicalizeTrackingOpenUrl(raw), 0);
    const maxPages = Math.min(
      40,
      Math.max(8, Math.floor(Number(config.tracking_unread_scan_max_pages) || 20))
    );
    const scan = await scanTrackingUnreadAcrossPages(home, bp, { maxPages: maxPages });
    if (scan.topGal && scan.topGal.gid) {
      rec.top_gid = String(scan.topGal.gid);
      if (scan.topGal.token) rec.top_token = compactText(scan.topGal.token);
      if (scan.topGal.title) rec.top_title = String(scan.topGal.title).slice(0, 160);
      if (scan.topGal.cover) applyTrackingCoverFields(rec, scan.topGal.cover);
    }
    if (scan.found) {
      // 精确值：跟断点后应比旧未读小（或相等）；异常偏高时取较小者
      let n = Math.max(0, Number(scan.count) || 0);
      if (prevEst > 0 && n > prevEst) n = prevEst;
      rec.unread_estimate = n;
      rec.unread_estimate_capped = 0;
      rec.unread_estimate_source = 'deep_scan';
      rec.has_update = n > 0 ? 1 : 0;
      if (scan.pagesScanned > 0) {
        rec.breakpoint_page = Math.max(0, scan.pagesScanned - 1);
        rec.breakpoint_page_known = 1;
        rec.breakpoint_page_mode = 'scan';
      }
    } else {
      rec.has_update = 1;
      const floor = Math.max(0, Number(scan.count) || 0);
      // 未扫到断点：用已扫条数作下限；若有旧值则取 min（跟断后不应更大）
      if (floor > 0) {
        rec.unread_estimate = prevEst > 0 ? Math.min(prevEst, floor) : floor;
        rec.unread_estimate_capped = 1;
        rec.unread_estimate_source = 'deep_scan';
      } else if (prevEst > 0 && compactText(rec.unread_estimate_source || '') === 'bp_advanced') {
        // 完全没扫到：保持旧值并标约数，避免假装精确
        rec.unread_estimate = prevEst;
        rec.unread_estimate_capped = 1;
      }
      if (scan.lastError) {
        rec.last_check_error = String(scan.lastError).slice(0, 160);
      }
    }
    rec.unread_scan_pages = scan.pagesScanned || 0;
    await saveTrackingRecord(rec);
    if (typeof showToast === 'function' && (scan.found || Number(rec.unread_estimate) >= 0)) {
      const n = Math.max(0, Math.floor(Number(rec.unread_estimate) || 0));
      if (scan.found) {
        showToast(n > 0 ? '未读 +' + n : '已追上最新');
      }
    }
    if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
    return rec;
  }

  function trackingHasWorkBreakpoint(rec) {
    return !!(rec && compactText(rec.breakpoint_gid || ''));
  }

  function trackingHasAnyBreakpoint(rec) {
    if (!rec) return false;
    return !!(
      trackingHasWorkBreakpoint(rec) ||
      rec.breakpoint_url ||
      (rec.breakpoint_page != null && rec.breakpoint_page !== '')
    );
  }

  /** 打开断点：优先原 breakpoint_url（含 next= 游标），否则 page= 跳转 */
  async function openTrackingBreakpoint(rec) {
    if (!rec) return;
    const gid = compactText(rec.breakpoint_gid || '');
    if (gid) {
      try {
        sessionStorage.setItem('exc_bp_scroll_gid', gid);
      } catch (_) { /* ignore */ }
    }
    const bpUrl = compactText(rec.breakpoint_url || '');
    let url = '';
    // 游标断点：原 URL 最可靠（page= 重建对不上 next= 位置）
    if (bpUrl && listUrlHasCursorNav(bpUrl)) {
      url = bpUrl.split('#')[0];
    } else if (bpUrl && (Number(rec.breakpoint_page) || 0) < 0) {
      // 未知深页但存了 URL
      url = bpUrl.split('#')[0];
    } else {
      const targetPage =
        Number(rec.breakpoint_page) >= 0 ? Number(rec.breakpoint_page) : 0;
      const base =
        bpUrl || rec.open_url || rec.page_url || location.href;
      // 从首页规范 URL 建 page=，避免 base 仍带 next=
      const home = canonicalizeTrackingOpenUrl(base);
      url = buildListUrlWithPage(home, targetPage);
    }
    const here = location.href.split('#')[0];
    if (url.split('#')[0] === here) {
      void scrollToBreakpointGid(gid);
      return;
    }
    location.href = url;
  }

  function scrollToBreakpointGid(gid) {
    if (!gid) return false;
    const items = document.querySelectorAll('.exc-gl-item, a[href*="/g/"]');
    let target = null;
    items.forEach((el) => {
      if (target) return;
      const g = el.dataset && el.dataset.excGid;
      if (g && String(g) === String(gid)) {
        target = el.classList && el.classList.contains('exc-gl-item') ? el : el.closest('.exc-gl-item') || el;
        return;
      }
      const href = el.getAttribute && (el.getAttribute('href') || '');
      const m = String(href).match(/\/g\/(\d+)\//);
      if (m && m[1] === String(gid)) {
        target = el.closest('.gl1t, tr, .exc-gl-item') || el;
      }
    });
    if (!target) {
      showToast('本页未找到断点作品 g' + gid + '，可能已翻页或不在当前列表');
      return false;
    }
    document.querySelectorAll('.is-exc-breakpoint').forEach((n) => n.classList.remove('is-exc-breakpoint'));
    target.classList.add('is-exc-breakpoint');
    try {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_) {
      target.scrollIntoView(true);
    }
    showToast('已定位到断点作品');
    return true;
  }

  function tryConsumeBreakpointScroll() {
    let gid = '';
    try {
      gid = sessionStorage.getItem('exc_bp_scroll_gid') || '';
      if (gid) sessionStorage.removeItem('exc_bp_scroll_gid');
    } catch (_) {
      return;
    }
    if (!gid) return;
    // 等列表增强完再滚
    setTimeout(() => {
      if (!scrollToBreakpointGid(gid)) {
        setTimeout(() => scrollToBreakpointGid(gid), 800);
      }
    }, 400);
  }

  /** 列表点开作品时暂存追更上下文（画廊页/乐观跟断点） */
  const EXC_TRACK_OPEN_KEY = 'exc_track_open_ctx';

  function setPendingTrackingOpen(payload) {
    if (!payload || !payload.trackingId || !payload.gid) return;
    try {
      sessionStorage.setItem(
        EXC_TRACK_OPEN_KEY,
        JSON.stringify({
          trackingId: String(payload.trackingId),
          gid: String(payload.gid),
          token: compactText(payload.token || ''),
          title: compactText(payload.title || '').slice(0, 120),
          posted_at: Number(payload.posted_at) || 0,
          listUrl: compactText(payload.listUrl || location.href).split('#')[0],
          pageIndex: payload.pageIndex != null ? Number(payload.pageIndex) : -1,
          pageMode: compactText(payload.pageMode || ''),
          // 当页序号（0 起），配合 pageIndex 算未读
          listIndex: payload.listIndex != null ? Number(payload.listIndex) : -1,
          pageLen: payload.pageLen != null ? Number(payload.pageLen) : 0,
          at: nowMs(),
        })
      );
    } catch (_) { /* ignore */ }
  }

  /** 用页码 + 当页位置写未读数量（深页约数，带 +N+） */
  function writeUnreadFromPagePos(rec, pageIndex, listIndex, pageLen) {
    if (!rec) return;
    const idx = Math.max(0, Math.floor(Number(listIndex) || 0));
    const len = Math.max(1, Math.floor(Number(pageLen) || 25));
    const pageSize = len >= 20 ? len : 25;
    const p = Number(pageIndex);
    if (!Number.isFinite(p) || p < 0) return false;
    if (p === 0) {
      rec.unread_estimate = idx;
      rec.unread_estimate_capped = 0;
      rec.unread_estimate_source = 'home_exact';
    } else {
      rec.unread_estimate = p * pageSize + idx;
      rec.unread_estimate_capped = 1;
      rec.unread_estimate_source = 'page_formula';
    }
    if (rec.unread_estimate > 0) rec.has_update = 1;
    else if (rec.top_gid && rec.breakpoint_gid && String(rec.top_gid) === String(rec.breakpoint_gid)) {
      rec.has_update = 0;
    }
    return true;
  }

  function takePendingTrackingOpen() {
    try {
      const raw = sessionStorage.getItem(EXC_TRACK_OPEN_KEY);
      if (!raw) return null;
      sessionStorage.removeItem(EXC_TRACK_OPEN_KEY);
      const o = JSON.parse(raw);
      if (!o || !o.trackingId || !o.gid) return null;
      // 超过 30 分钟丢弃，避免脏上下文
      if (o.at && nowMs() - Number(o.at) > 30 * 60 * 1000) return null;
      return o;
    } catch (_) {
      return null;
    }
  }

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

  /** 当前文档列表 gid 顺序（与角标增强同源选择器） */
  function extractOrderedGidsFromDocument(doc) {
    doc = doc || document;
    const out = [];
    const seen = new Set();
    try {
      if (typeof queryListItems === 'function') {
        (queryListItems() || []).forEach((el) => {
          const card = typeof parseListCard === 'function' ? parseListCard(el) : null;
          const g = card && card.gid ? String(card.gid) : '';
          if (!g || seen.has(g)) return;
          seen.add(g);
          out.push(g);
        });
      }
    } catch (_) { /* ignore */ }
    if (out.length) return out;
    try {
      const links = doc.querySelectorAll(
        '#ido a[href*="/g/"], table.itg a[href*="/g/"], .itg a[href*="/g/"], a[href*="/g/"]'
      );
      links.forEach((a) => {
        const href = a.getAttribute('href') || a.href || '';
        const gt = typeof parseGalleryUrl === 'function' ? parseGalleryUrl(href) : null;
        const g = gt && gt.gid ? String(gt.gid) : '';
        if (!g || seen.has(g)) return;
        seen.add(g);
        out.push(g);
      });
    } catch (_) { /* ignore */ }
    return out;
  }

  /** 相对锚点估算未读条数：found=锚点在本页，count=其前条数 */
  function estimateUnreadFromGids(gids, anchorGid) {
    const list = Array.isArray(gids) ? gids.map(String) : [];
    const anchor = compactText(anchorGid || '');
    if (!list.length || !anchor) return { found: false, count: 0, pageLen: list.length };
    const idx = list.indexOf(anchor);
    if (idx < 0) return { found: false, count: 0, pageLen: list.length };
    return { found: true, count: idx, pageLen: list.length };
  }

  /**
   * 从列表 HTML 取「下一页」URL。
   * 优先分页表 > / » 链（常带 next=gid）；其次任意 next=；再否则 null（由调用方用 page=/next= 拼）。
   */
  function extractListNextPageUrl(html, baseUrl) {
    baseUrl = baseUrl || (typeof location !== 'undefined' ? location.href : '');
    const s = String(html || '');
    try {
      if (typeof DOMParser !== 'undefined') {
        const doc = new DOMParser().parseFromString(s, 'text/html');
        const roots = doc.querySelectorAll('table.ptt, table.ptb, .ptt, .ptb');
        const prefer = [];
        const collect = (root) => {
          if (!root) return;
          root.querySelectorAll('a[href]').forEach((a) => {
            const t = compactText(a.textContent || '');
            const href = a.getAttribute('href') || '';
            if (!href || href === '#' || /^javascript:/i.test(href)) return;
            let abs = '';
            try {
              abs = new URL(href, baseUrl).href;
            } catch (_) {
              return;
            }
            // 只认明确「下一页」：> » ›，或 href 带 next=
            // （不要取最大 page=，会直接跳到末页）
            const isFwd = /^[>›»]+$/.test(t) || /[?&]next=\d+/i.test(href);
            if (isFwd) prefer.push(abs);
          });
        };
        for (let i = 0; i < roots.length; i++) collect(roots[i]);
        if (!prefer.length) collect(doc);
        for (let i = 0; i < prefer.length; i++) {
          if (/[?&]next=\d+/i.test(prefer[i])) return prefer[i];
        }
        if (prefer.length) return prefer[0];
      }
    } catch (_) { /* regex */ }
    let m = s.match(/href=["']([^"']*[?&]next=\d+[^"']*)["']/i);
    if (m) {
      try {
        return new URL(m[1].replace(/&amp;/g, '&'), baseUrl).href;
      } catch (_) { /* ignore */ }
    }
    m = s.match(/href=["']([^"']*)["'][^>]*>\s*(?:&gt;|>|›|»)\s*</i);
    if (m) {
      try {
        return new URL(m[1].replace(/&amp;/g, '&'), baseUrl).href;
      } catch (_) { /* ignore */ }
    }
    return '';
  }

  /** 用本页最后一条 gid 拼 next= 游标 URL（EH 翻页主路径） */
  function buildListUrlWithNextGid(homeUrl, lastGid) {
    const g = compactText(lastGid || '');
    if (!g) return '';
    try {
      const u = new URL(canonicalizeTrackingOpenUrl(homeUrl), location.origin);
      u.searchParams.delete('page');
      u.searchParams.delete('prev');
      u.searchParams.delete('seek');
      u.searchParams.delete('jump');
      u.searchParams.set('next', g);
      return u.href;
    } catch (_) {
      return '';
    }
  }

  function pickTrackingPageScanDelayMs() {
    // 同条内跨页：尽量短，主要靠条目之间的 5～10s 防限流
    const lo = 280;
    const hi = 550;
    return Math.round(lo + Math.random() * (hi - lo));
  }

  /**
   * 断点不在首页时的快速未读估算（不额外请求）。
   * - 断点在首页 → 精确 count
   * - 有可信 breakpoint_page(>0) → page×页长（下限，capped）
   * - 否则保留已有估数（绝不因为「未知」就压成一页）
   */
  function estimateUnreadWithoutDeepScan(rec, homeGids, top) {
    const bp = compactText((rec && rec.breakpoint_gid) || '');
    const topS = compactText(top || '');
    const pageLen = Array.isArray(homeGids) ? homeGids.length : 0;
    const pageSize = pageLen >= 20 ? pageLen : pageLen > 0 ? pageLen : 25;
    if (!bp) return { count: 0, capped: 0, has_update: 0, source: 'none' };

    if (topS && bp === topS) {
      return { count: 0, capped: 0, has_update: 0, source: 'home_caught_up' };
    }

    const onHome = estimateUnreadFromGids(homeGids, bp);
    if (onHome.found) {
      return {
        count: onHome.count,
        capped: 0,
        has_update: onHome.count > 0 ? 1 : 0,
        source: 'home_exact',
      };
    }

    // 不在首页：不得用「当页序号」；只用断点页码或保留旧值
    const bpPage = Number(rec.breakpoint_page);
    const prev = Math.max(0, Math.floor(Number(rec.unread_estimate) || 0));
    const prevSource = compactText(rec.unread_estimate_source || '');
    // 曾被深页局部回写污染的小值不可信（无 source 或 source=partial）
    const prevTrusted =
      prev > 0 &&
      prevSource !== 'partial' &&
      prevSource !== 'deep_page_local' &&
      (prevSource === 'home_exact' ||
        prevSource === 'page_formula' ||
        prevSource === 'deep_scan' ||
        prevSource === 'set_bp' ||
        prev >= pageSize);

    if (Number.isFinite(bpPage) && bpPage > 0) {
      const floor = bpPage * pageSize;
      // 取「页码公式」与可信旧值的较大者，避免检查更新把更好的估数打小
      const count = Math.max(floor, prevTrusted ? prev : 0, 1);
      return { count: count, capped: 1, has_update: 1, source: 'page_formula' };
    }

    if (prevTrusted) {
      return { count: prev, capped: 1, has_update: 1, source: prevSource || 'keep' };
    }
    // 完全未知：只标「有更新」，不写假的 +23
    return { count: 0, capped: 1, has_update: 1, source: 'unknown_deep' };
  }

  /**
   * 从首页向后扫，统计断点前未读条数（支持 page= 与 next= 游标）。
   * @returns {{ found:boolean, count:number, capped:boolean, pagesScanned:number, topGal:object|null, firstGids:string[], lastError:string }}
   */
  async function scanTrackingUnreadAcrossPages(homeUrl, anchorGid, opts) {
    opts = opts || {};
    const anchor = compactText(anchorGid || '');
    const maxPages = Math.min(
      40,
      Math.max(1, Math.floor(Number(opts.maxPages) || Number(config.tracking_unread_scan_max_pages) || 12))
    );
    const home = buildListUrlWithPage(canonicalizeTrackingOpenUrl(homeUrl), 0);
    const result = {
      found: false,
      count: 0,
      capped: 0,
      pagesScanned: 0,
      topGal: null,
      firstGids: [],
      lastError: '',
    };
    if (!anchor) return result;

    let url = home;
    let totalBefore = 0;
    const seen = new Set();
    let pages = 0;
    // 调用方已拉过首页时可注入，避免重复请求
    let seedHtml = opts.seedHtml ? String(opts.seedHtml) : '';
    let seedUrl = opts.seedUrl || home;

    while (pages < maxPages) {
      if (!url || seen.has(url)) break;
      seen.add(url);
      let html = '';
      if (seedHtml && pages === 0) {
        html = seedHtml;
        url = seedUrl || home;
        seedHtml = '';
      } else {
        if (pages > 0) {
          await sleepMs(
            typeof opts.delayMs === 'number' ? opts.delayMs : pickTrackingPageScanDelayMs()
          );
        }
        try {
          html = await fetchTrackingPageHtml(url);
        } catch (err) {
          result.lastError = (err && err.message) || String(err || 'fetch fail');
          break;
        }
      }
      const gids = extractOrderedGidsFromListHtml(html);
      if (pages === 0) {
        result.topGal = extractTopGalleryFromListHtml(html, url);
        result.firstGids = gids.slice();
      }
      pages += 1;
      result.pagesScanned = pages;

      if (!gids.length) break;

      const est = estimateUnreadFromGids(gids, anchor);
      if (est.found) {
        result.found = true;
        result.count = totalBefore + est.count;
        result.capped = 0;
        break;
      }
      totalBefore += gids.length;

      // 下一页：HTML 链 → next=末 gid → page=N
      let nextUrl = extractListNextPageUrl(html, url);
      if (!nextUrl) {
        nextUrl = buildListUrlWithNextGid(home, gids[gids.length - 1]);
      }
      if (!nextUrl) {
        nextUrl = buildListUrlWithPage(home, pages); // pages 已是下一页的 0 起下标
      }
      if (!nextUrl || nextUrl === url || seen.has(nextUrl)) break;
      // 避免 next 指回首页死循环
      try {
        const a = new URL(nextUrl);
        const b = new URL(home);
        if (a.pathname === b.pathname && a.search === b.search) break;
      } catch (_) { /* ignore */ }
      url = nextUrl;
    }

    if (!result.found) {
      result.count = totalBefore;
      result.capped = 1;
    }
    return result;
  }

  /** 是否仍有待追更新（has_update 或 顶≠断点） */
  function trackingHasPendingUpdate(r) {
    if (!r) return false;
    if (r.has_update) return true;
    const top = compactText(r.top_gid || '');
    const bp = compactText(r.breakpoint_gid || '');
    return !!(top && bp && top !== bp);
  }

  /**
   * 当前列表是否像「真·首页」：有 top 时，首页第一条必须是 top。
   * URL/DOM 会误报第 1 页；这条能挡住 next= 深页被当成首页。
   * @returns {boolean|null} true/false；无法判断时 null
   */
  function listPageLooksLikeHome(gids, topGid) {
    const top = compactText(topGid || '');
    if (!top || !Array.isArray(gids) || !gids.length) return null;
    return String(gids[0]) === top;
  }

  /** 未读数字是否可信（过滤当页序号污染、假 +25） */
  function isTrackingUnreadTrusted(r) {
    if (!r) return false;
    const n = Math.max(0, Math.floor(Number(r.unread_estimate) || 0));
    if (!(n > 0)) return false;
    const src = compactText(r.unread_estimate_source || '');
    if (src === 'partial' || src === 'deep_page_local') return false;
    const bpPage = Number(r.breakpoint_page);
    if (
      Number.isFinite(bpPage) &&
      bpPage > 0 &&
      n < 20 &&
      (src === 'home_exact' || src === 'set_bp_home' || !src)
    ) {
      return false;
    }
    // 典型假数：刚好 25 且不是跨页扫描结果
    if (n === 25 && src !== 'deep_scan' && src !== 'home_exact' && !(bpPage > 1)) {
      return false;
    }
    if (src === 'deep_scan' || src === 'home_exact' || src === 'set_bp_home') return true;
    if (src === 'page_formula' && (bpPage > 0 || n > 25)) return true;
    if (src === 'home_not_found' || src === 'home_new_top') return n > 25;
    return !!src && n > 25;
  }

  function getTrackingUnreadEstimate(r) {
    if (!isTrackingUnreadTrusted(r)) return 0;
    return Math.max(0, Math.floor(Number(r && r.unread_estimate) || 0));
  }

  /** 卡片 leaf：优先 +N / +N+，没有可信数字才「更新」 */
  function getTrackingUpdatePillText(r) {
    if (!trackingHasPendingUpdate(r)) return '';
    const n = getTrackingUnreadEstimate(r);
    if (n > 0) {
      return r && r.unread_estimate_capped ? '+' + n + '+' : '+' + n;
    }
    return '更新';
  }

  function sleepMs(ms) {
    return new Promise((r) => setTimeout(r, Math.max(0, ms || 0)));
  }

  function pickTrackingCheckDelayMs() {
    const lo = Math.max(2000, Number(config.tracking_check_interval_min_ms) || 5000);
    const hi = Math.max(lo, Number(config.tracking_check_interval_max_ms) || 10000);
    return Math.round(lo + Math.random() * (hi - lo));
  }

  async function fetchTrackingPageHtml(url) {
    const res = await gmRequest({
      method: 'GET',
      url: url,
      timeout: 25000,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Cache-Control': 'no-cache',
      },
    });
    const status = res && res.status;
    if (status === 429) throw new Error('HTTP 429 限流');
    if (status < 200 || status >= 400) throw new Error('HTTP ' + status);
    const text = (res && res.responseText) || '';
    if (/Sad Panda/i.test(text) && !/\/g\/\d+\//i.test(text)) throw new Error('Sad Panda / 无法访问');
    if (/Your IP address has been temporarily banned/i.test(text)) throw new Error('IP 暂时封禁');
    if (/too many requests|rate.?limit/i.test(text) && !/\/g\/\d+\//i.test(text)) throw new Error('站点限流');
    return text;
  }

  /**
   * 根据列表 gid 序写回 unread_estimate / has_update。
   *
   * 只有「绝对上下文」才能写总量：真·首页 / 已知 page=N。
   * 游标深页（next=）禁止把「当页第 23 条」写成未读 +23。
   *
   * @param {{ previousTop?: string, pageIndex?: number, isFirst?: boolean, deepUnknown?: boolean, mode?: string }} [opts]
   *   mode: 'absolute' | 'browse'
   */
  function applyTrackingUnreadFromGids(rec, gids, top, opts) {
    if (!rec) return rec;
    opts = opts || {};
    const bp = compactText(rec.breakpoint_gid || '');
    const prevTop = compactText(opts.previousTop || rec.prev_top_gid || '');
    const topS = compactText(top || '');
    const pageLen = Array.isArray(gids) ? gids.length : 0;
    const rawIdx = Number(opts.pageIndex);
    // 首条 ≠ top：绝不是结果集首页（挡住 URL/DOM 误报第 1 页）
    const homeLook = listPageLooksLikeHome(gids, topS);
    let deepUnknown =
      opts.deepUnknown === true ||
      (Number.isFinite(rawIdx) && rawIdx < 0) ||
      (opts.isFirst === false && !(Number.isFinite(rawIdx) && rawIdx >= 0));
    if (homeLook === false) {
      deepUnknown = deepUnknown || !(Number.isFinite(rawIdx) && rawIdx > 0);
    }
    const pageIndex = deepUnknown
      ? -1
      : Math.max(0, Math.floor(Number.isFinite(rawIdx) ? rawIdx : 0));
    let isFirst =
      opts.isFirst === true ||
      (opts.isFirst !== false && pageIndex === 0 && !deepUnknown);
    if (homeLook === false) isFirst = false;
    // 仅真·首页才允许 absolute 写「当页序号=总量」
    const mode =
      opts.mode === 'browse'
        ? 'browse'
        : isFirst && homeLook !== false
          ? 'absolute'
          : deepUnknown || !isFirst
            ? 'browse'
            : opts.mode || 'absolute';
    const pageSize =
      pageIndex > 0
        ? Math.max(pageLen >= 20 ? pageLen : 25, 1)
        : pageLen > 0
          ? pageLen
          : 25;
    const pageOffset = pageIndex > 0 ? pageIndex * pageSize : 0;
    const prevEst = Math.max(0, Math.floor(Number(rec.unread_estimate) || 0));

    if (isFirst && topS && bp && topS === bp) {
      rec.has_update = 0;
      rec.unread_estimate = 0;
      rec.unread_estimate_capped = 0;
      rec.unread_estimate_source = 'home_caught_up';
      return rec;
    }

    const anchor = bp || (prevTop && prevTop !== topS ? prevTop : '');
    if (!anchor) {
      if (prevTop && topS && prevTop !== topS) {
        rec.has_update = 1;
        if (!(prevEst > 0) && pageLen > 0 && isFirst) {
          rec.unread_estimate = pageLen;
          rec.unread_estimate_capped = 1;
          rec.unread_estimate_source = 'home_new_top';
        }
      }
      return rec;
    }

    const est = estimateUnreadFromGids(gids, anchor);

    // 浏览/游标深页：禁止当页局部覆盖总量
    if (mode === 'browse' || (deepUnknown && !isFirst)) {
      if (bp && topS && bp !== topS) rec.has_update = 1;
      if (est.found && pageIndex > 0) {
        const total = pageOffset + est.count;
        if (total > prevEst) {
          rec.unread_estimate = total;
          rec.unread_estimate_capped = 1;
          rec.unread_estimate_source = 'page_formula';
        }
        if (total > 0) rec.has_update = 1;
      } else if (!est.found && pageIndex > 0) {
        const floor = pageOffset + (pageLen > 0 ? pageLen : 1);
        if (floor > prevEst) {
          rec.unread_estimate = floor;
          rec.unread_estimate_capped = 1;
          rec.unread_estimate_source = 'page_formula';
        }
        rec.has_update = 1;
      }
      // deepUnknown + found：故意不写 unread（避免 +23）
      return rec;
    }

    // 绝对上下文：首页或已知 page=N
    if (est.found) {
      const total = pageOffset + est.count;
      rec.unread_estimate = total;
      rec.unread_estimate_capped = pageIndex > 0 ? 1 : 0;
      rec.unread_estimate_source = pageIndex > 0 ? 'page_formula' : 'home_exact';
      if (total > 0) rec.has_update = 1;
      else if (isFirst && topS && bp && topS === bp) rec.has_update = 0;
      else if (!isFirst && total === 0 && bp) {
        rec.has_update = 1;
        const floor = pageOffset > 0 ? pageOffset : 1;
        rec.unread_estimate = Math.max(prevEst, floor);
        rec.unread_estimate_capped = 1;
        rec.unread_estimate_source = 'page_formula';
      }
    } else if (bp || (prevTop && topS && prevTop !== topS)) {
      rec.has_update = 1;
      if (isFirst) {
        const floor = pageLen > 0 ? pageLen : 1;
        rec.unread_estimate = Math.max(prevEst, floor);
        rec.unread_estimate_capped = 1;
        rec.unread_estimate_source = 'home_not_found';
      } else if (pageIndex > 0) {
        const floor = pageOffset + (pageLen > 0 ? pageLen : 1);
        rec.unread_estimate = Math.max(prevEst, floor);
        rec.unread_estimate_capped = 1;
        rec.unread_estimate_source = 'page_formula';
      }
    }
    return rec;
  }

  /**
   * 主动检查单条追更。
   * @param {object} rec
   * @param {{ deepScan?: boolean }} [opts]
   *   deepScan：true 时跨页精确数未读（慢）；默认跟 config.tracking_unread_deep_scan
   */
  async function refreshSingleTrackingRecord(rec, opts) {
    if (!rec) throw new Error('无记录');
    opts = opts || {};
    const raw = rec.open_url || rec.page_url;
    if (!raw) throw new Error('无 URL');
    const home = buildListUrlWithPage(canonicalizeTrackingOpenUrl(raw), 0);
    // 顺手纠正历史脏 open_url（带深页 page/next）
    if (rec.open_url && rec.open_url !== home) {
      rec.open_url = home;
      rec.page_url = home;
    }
    const previousTop = compactText(rec.top_gid || '');
    const bp = compactText(rec.breakpoint_gid || '');
    // 断点不在首页时默认跨页扫；否则只会得到假 +25。opts.deepScan===false 才强制快路径
    const allowDeep = opts.deepScan !== false;
    rec.last_check_at = nowMs();
    rec.last_check_error = '';

    let topGal = null;
    let gids = [];
    let top = '';
    let scan = null;
    let usedDeep = false;

    // 始终先拉首页
    const homeHtml = await fetchTrackingPageHtml(home);
    topGal = extractTopGalleryFromListHtml(homeHtml, home);
    gids = extractOrderedGidsFromListHtml(homeHtml);
    top = topGal && topGal.gid ? String(topGal.gid) : gids[0] || '';

    if (bp && top) {
      const onHome = estimateUnreadFromGids(gids, bp);
      if (onHome.found) {
        scan = {
          found: true,
          count: onHome.count,
          capped: 0,
          pagesScanned: 1,
          topGal: topGal,
          firstGids: gids,
          lastError: '',
        };
      } else if (allowDeep) {
        // 不在首页 → 跨页精确数（这才是真 +N，不是一页 25）
        usedDeep = true;
        scan = await scanTrackingUnreadAcrossPages(home, bp, {
          maxPages: Math.min(
            40,
            Math.max(8, Math.floor(Number(config.tracking_unread_scan_max_pages) || 20))
          ),
          seedHtml: homeHtml,
          seedUrl: home,
        });
        if (scan.topGal) topGal = scan.topGal;
        if (scan.firstGids && scan.firstGids.length) gids = scan.firstGids;
        top = topGal && topGal.gid ? String(topGal.gid) : gids[0] || top;
        if (scan.lastError && !top) rec.last_check_error = scan.lastError;
        if (scan.found && scan.pagesScanned > 0) {
          rec.breakpoint_page = Math.max(0, scan.pagesScanned - 1);
          rec.breakpoint_page_known = 1;
          rec.breakpoint_page_mode = 'scan';
        }
      } else {
        const fast = estimateUnreadWithoutDeepScan(rec, gids, top);
        // 丢弃假一页 25：page_formula 且仅一页且无可信 bp 页码
        let count = fast.count;
        if (
          fast.source === 'page_formula' &&
          count > 0 &&
          count <= (gids.length || 25) &&
          !(Number(rec.breakpoint_page) > 0)
        ) {
          count = 0;
        }
        scan = {
          found: fast.source === 'home_exact',
          count: count,
          capped: fast.capped,
          pagesScanned: 1,
          topGal: topGal,
          firstGids: gids,
          lastError: '',
          fastEstimate: fast.source !== 'home_exact',
          source: fast.source || '',
        };
      }
    }

    if (top) {
      if (previousTop && previousTop !== top) {
        rec.has_update = 1;
        rec.prev_top_gid = previousTop;
      }
      if (bp && bp !== top) {
        rec.has_update = 1;
      }
      rec.top_gid = top;
      if (topGal && topGal.token) rec.top_token = compactText(topGal.token);
      if (topGal && topGal.title) rec.top_title = String(topGal.title).slice(0, 160);
      if (topGal && topGal.cover) applyTrackingCoverFields(rec, topGal.cover);
      // 列表已有 posted 则不再打 gdata，省一次请求
      let posted = (topGal && Number(topGal.posted_at)) || 0;
      if (!posted && !(Number(rec.top_posted_at) > 0)) {
        posted = await resolveGalleryPostedMs(top, (topGal && topGal.token) || rec.top_token || '', null);
      } else if (!posted) {
        posted = Number(rec.top_posted_at) || 0;
      }
      if (posted) rec.top_posted_at = posted;

      if (bp && scan) {
        if (scan.found) {
          rec.unread_estimate = Math.max(0, Number(scan.count) || 0);
          rec.unread_estimate_capped = 0;
          rec.unread_estimate_source = usedDeep ? 'deep_scan' : 'home_exact';
          if (rec.unread_estimate > 0) rec.has_update = 1;
          else if (top === bp) {
            rec.has_update = 0;
            rec.unread_estimate = 0;
            rec.unread_estimate_source = 'home_caught_up';
          }
        } else if (scan.fastEstimate) {
          const n = Math.max(0, Number(scan.count) || 0);
          // unknown_deep 且 count=0：只标有更新，显示「更新」而非假 +N
          if (n > 0) {
            rec.unread_estimate = n;
            rec.unread_estimate_capped = scan.capped ? 1 : 0;
            rec.has_update = 1;
          } else {
            rec.has_update = 1;
            // 保留可信旧值；清掉 partial 污染
            const src = compactText(rec.unread_estimate_source || '');
            if (src === 'partial' || src === 'deep_page_local') {
              rec.unread_estimate = 0;
              rec.unread_estimate_capped = 1;
            }
            rec.unread_estimate_capped = 1;
          }
          rec.unread_estimate_source = scan.source || 'page_formula';
        } else {
          // 深度扫满仍未见断点
          rec.has_update = 1;
          rec.unread_estimate = Math.max(
            Number(rec.unread_estimate) || 0,
            Number(scan.count) || 0,
            gids.length || 0
          );
          rec.unread_estimate_capped = 1;
          rec.unread_estimate_source = 'deep_scan';
          if (scan.lastError) {
            rec.last_check_error =
              (rec.last_check_error ? rec.last_check_error + '；' : '') + scan.lastError;
          } else if (scan.pagesScanned > 0) {
            rec.last_check_error =
              '断点未在前 ' + scan.pagesScanned + ' 页内找到（未读≥' + rec.unread_estimate + '）';
          }
        }
        rec.unread_scan_pages = scan.pagesScanned || 0;
        rec.unread_deep_scan = usedDeep ? 1 : 0;
      } else {
        applyTrackingUnreadFromGids(rec, gids, top, {
          previousTop: previousTop,
          pageIndex: 0,
          isFirst: true,
          mode: 'absolute',
        });
      }
    } else if (!rec.last_check_error) {
      rec.last_check_error = '未解析到列表顶画廊';
    }
    await saveTrackingRecord(rec);
    return rec;
  }

  function detectAccessIssue() {
    const title = compactText(document.title).toLowerCase();
    const bodyText = compactText((document.body && document.body.innerText) || '').slice(0, 2000).toLowerCase();
    if (/sad panda|1007/i.test(title) || /sad panda/i.test(bodyText)) {
      return { type: 'sad_panda', message: 'Sad Panda：当前账号/Cookie 无法访问 ExHentai。请在浏览器登录后刷新。' };
    }
    if (/cloudflare|just a moment|attention required|checking your browser/i.test(title + bodyText)) {
      return { type: 'challenge', message: '站点正在做人机验证，通过后刷新页面即可。' };
    }
    if (/429|too many requests/i.test(bodyText) || /rate.?limit/i.test(bodyText)) {
      return { type: 'rate_limit', message: '请求过于频繁（限流）。请稍后再试，并降低自动同步频率。' };
    }
    if (!document.querySelector('a[href*="/g/"]') && /error|禁止|denied|login/i.test(bodyText) && bodyText.length < 800) {
      return { type: 'empty_or_error', message: '页面无画廊列表，可能是登录态失效或页面异常。' };
    }
    return null;
  }

  function parsePostedToMs(text) {
    const s = normalizePostedText(text);
    if (!s) return 0;
    // unix 秒（gdata / 偶发属性）
    if (/^\d{10}$/.test(s)) {
      const sec = Number(s);
      return sec > 1e9 ? sec * 1000 : 0;
    }
    if (/^\d{13}$/.test(s)) {
      const ms = Number(s);
      return ms > 1e12 ? ms : 0;
    }
    // EH 标准：2025-03-18 14:20
    let m = s.match(/(20\d{2})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) {
      const d = new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4] || 0),
        Number(m[5] || 0),
        Number(m[6] || 0)
      );
      const t = d.getTime();
      return Number.isFinite(t) && t > 0 ? t : 0;
    }
    m = s.match(/(20\d{2})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (m) {
      const d = new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4] || 0),
        Number(m[5] || 0)
      );
      const t = d.getTime();
      return Number.isFinite(t) && t > 0 ? t : 0;
    }
    // 从混杂 HTML 里抠日期
    m = s.match(/(20\d{2}-\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{2})?)/);
    if (m) return parsePostedToMs(m[1]);
    const t = Date.parse(s.replace(/-/g, '/'));
    return Number.isFinite(t) && t > 0 ? t : 0;
  }

  function parseListCard(root) {
    if (!root || root.nodeType !== 1) return null;
    const link =
      root.querySelector('a[href*="/g/"]') ||
      (root.matches && root.matches('a[href*="/g/"]') ? root : null);
    if (!link) return null;
    const href = link.href || link.getAttribute('href') || '';
    const gt = parseGalleryUrl(href);
    if (!gt) return null;

    let title = '';
    const nameEl =
      root.querySelector('.glink') ||
      root.querySelector('.glname a') ||
      root.querySelector('.glname') ||
      link.querySelector('.glink') ||
      link;
    title = compactText(nameEl && (nameEl.getAttribute('title') || nameEl.textContent));

    let category = '';
    const catEl = root.querySelector('.cn, .cs, .glcat');
    if (catEl) category = compactText(catEl.textContent);

    const thumb = extractListItemCoverUrl(root);

    const posted_at = extractListItemPostedAt(root, gt.gid);

    const tags = [];
    const pushTag = (t) => {
      const s = compactText(t);
      if (!s || s.length > 80) return;
      const low = s.toLowerCase();
      if (tags.some((x) => String(x).toLowerCase() === low)) return;
      tags.push(s);
    };
    // 扩展模式：.gt 的 title 常是 namespace:name
    root.querySelectorAll('.gt, .gtl, .gtw, .gtw, [title*=":"]').forEach((el) => {
      pushTag(el.getAttribute('title') || el.textContent);
    });
    // 标题里 [group] (artist) 补成伪标签（取所有括号，跳过语言标记）
    const group = extractGroupFromTitle(title);
    if (group) pushTag('group:' + group);
    const skipParen =
      /^(chinese|english|japanese|korean|digital|dl版|中国翻訳|中國翻譯|complete|ongoing|decensored|uncensored|\d{2,4})$/i;
    String(title || '').replace(/\[([^\]]+)\]|\(([^)]+)\)|【([^】]+)】/g, (_, a, b, c) => {
      const raw = compactText(a || b || c || '');
      if (!raw || raw.length < 2 || raw.length > 48 || skipParen.test(raw)) return '';
      // 方括号更常是组；圆括号更常是画师；都挂上以便熟人匹配
      if (a || c) pushTag('group:' + raw);
      if (b) pushTag('artist:' + raw);
      // 嵌套 [Group (Artist)] 
      const nested = raw.match(/\(([^)]+)\)/);
      if (nested) {
        const an = compactText(nested[1]);
        if (an && an.length >= 2 && !skipParen.test(an)) pushTag('artist:' + an);
      }
      return '';
    });

    // thumbnail mode sometimes has size in popup / title
    let size_text = '';
    const ir = root.querySelector('.ir, .glthumb div div');
    if (ir && /[0-9.]+\s*[KMG]i?B/i.test(ir.textContent || '')) {
      size_text = compactText(ir.textContent);
    }

    return normalizeEditionRecord({
      gid: gt.gid,
      token: gt.token,
      title_raw: title,
      category,
      thumb,
      posted_at,
      tags,
      size_text,
      group: group || '',
      url: href.split('?')[0],
    });
  }

  function queryListItems() {
    const selectors = [
      'table.itg > tbody > tr',
      'table.itg tr',
      'div.gl1t',
      'div.gl2t',
      'div.gl3t',
      '.gl1e',
      '.gl2e',
      '#gdt .gdtm',
      '#gdt .gdtl',
    ];
    const seen = new Set();
    const items = [];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        if (seen.has(el)) return;
        // skip header row
        if (el.querySelector && el.querySelector('th')) return;
        if (!el.querySelector('a[href*="/g/"]')) return;
        seen.add(el);
        items.push(el);
      });
      if (items.length) break;
    }
    if (!items.length) {
      document.querySelectorAll('a[href*="/g/"]').forEach((a) => {
        const row = a.closest('tr, .gl1t, .gl2t, .gl3t, .gl1e, .gl2e, li, div') || a.parentElement;
        if (row && !seen.has(row) && row.querySelectorAll) {
          // avoid grabbing entire body
          if (row === document.body || row.id === 'gdt') return;
          seen.add(row);
          items.push(row);
        }
      });
    }
    return items;
  }

  function parseGalleryTags() {
    const tags = [];
    const seen = new Set();
    const push = (raw) => {
      let tag = compactText(raw || '');
      if (!tag || /^show all/i.test(tag)) return;
      // 统一 namespace 小写
      const colon = tag.indexOf(':');
      if (colon > 0) {
        tag = tag.slice(0, colon).toLowerCase() + ':' + tag.slice(colon + 1).trim();
      }
      const key = tag.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      tags.push(tag);
    };
    // 1) 标准 #taglist 链接 / ta_ id
    document.querySelectorAll('#taglist a, #taglist span[id^="ta_"], #taglist div[id^="td_"]').forEach((el) => {
      let tag = '';
      const href = el.getAttribute('href') || '';
      const m = href.match(/\/tag\/([^/?#]+)/i);
      if (m) {
        try {
          tag = decodeURIComponent(m[1].replace(/\+/g, ' '));
        } catch (_) {
          tag = m[1];
        }
      }
      if (!tag) {
        const id = el.getAttribute('id') || '';
        // ta_artist:emori_uki / td_artist:emori_uki
        if (/^t[ad]_/i.test(id)) {
          try {
            tag = decodeURIComponent(id.slice(3).replace(/_/g, ' '));
          } catch (_) {
            tag = id.slice(3).replace(/_/g, ' ');
          }
        }
      }
      // 显示名兜底 + 从父行猜 namespace
      if (!tag) tag = compactText(el.getAttribute('title') || el.textContent);
      if (tag && tag.indexOf(':') < 0) {
        const row = el.closest('tr');
        const th = row && row.querySelector('td.tc, .tc');
        if (th) {
          let ns = compactText(th.textContent).toLowerCase().replace(/:$/, '');
          if (ns) tag = ns + ':' + tag;
        }
      }
      push(tag);
    });
    // 2) 无 #taglist 时的松散结构
    if (!tags.length) {
      document.querySelectorAll('#gd4 a[href*="/tag/"], .gt a[href*="/tag/"]').forEach((el) => {
        const href = el.getAttribute('href') || '';
        const m = href.match(/\/tag\/([^/?#]+)/i);
        if (m) {
          try {
            push(decodeURIComponent(m[1].replace(/\+/g, ' ')));
          } catch (_) {
            push(m[1]);
          }
        }
      });
    }
    return tags;
  }

  function parseGalleryPage() {
    const gt = parseGalleryUrl(location.href);
    if (!gt) return null;

    let title = '';
    const h1 = document.getElementById('gn');
    const h2 = document.getElementById('gj');
    title = compactText((h1 && h1.textContent) || '') || compactText((h2 && h2.textContent) || '');
    if (!title) title = compactText(document.title).replace(/\s*-\s*E-?Hentai.*$/i, '');

    const tags = parseGalleryTags();

    let category = '';
    const cat = document.querySelector('#gdc .cs, #gdc .cn, .cs');
    if (cat) category = compactText(cat.textContent);

    let uploader = '';
    const up = document.querySelector('#gdn a');
    if (up) uploader = compactText(up.textContent);

    let pages = 0;
    let size_text = '';
    let posted_at = 0;
    document.querySelectorAll('#gdd tr').forEach((tr) => {
      const cells = tr.querySelectorAll('td');
      if (cells.length < 2) return;
      const k = compactText(cells[0].textContent).toLowerCase();
      const v = compactText(cells[1].textContent);
      if (/length|页|頁|language/.test(k) && /(\d+)\s*page/i.test(v)) {
        const m = v.match(/(\d+)\s*page/i);
        if (m) pages = parseInt(m[1], 10);
      } else if (/length|页|頁/.test(k)) {
        const m = v.match(/(\d+)/);
        if (m) pages = parseInt(m[1], 10);
      }
      if (/file size|大小|size/.test(k)) size_text = v;
      if (/posted|发布|發表|上傳|上传/.test(k)) posted_at = parsePostedToMs(v);
    });

    let thumb = '';
    const cover = document.querySelector('#gd1 img, #gd1 > div');
    if (cover) {
      if (cover.tagName === 'IMG') thumb = cover.src || '';
      else {
        const bg = (cover.getAttribute('style') || '') + (cover.style && cover.style.backgroundImage) || '';
        const m = String(bg).match(/url\(["']?([^"')]+)["']?\)/i);
        if (m) thumb = m[1];
      }
    }

    return normalizeEditionRecord({
      gid: gt.gid,
      token: gt.token,
      title_raw: title,
      tags,
      category,
      uploader,
      pages,
      size_text,
      posted_at,
      thumb,
      url: buildGalleryUrl(location.origin, gt.gid, gt.token),
    });
  }

  function normalizeThumbUrlKey(u) {
    let s = compactText(u || '');
    if (!s) return '';
    s = s.replace(/^url\((['"]?)(.+)\1\)$/i, '$2');
    s = s.replace(/^["']|["']$/g, '');
    // 去协议与查询，便于封面大图 vs 缩略路径近似匹配
    s = s.replace(/^https?:/i, '').split('?')[0].split('#')[0].toLowerCase();
    // ehgt 路径末段文件名
    const m = s.match(/\/([a-f0-9]{2}\/[a-f0-9]{2}\/[^/]+)$/i) || s.match(/\/([^/]+\.(?:jpg|jpeg|png|webp|gif))$/i);
    return m ? m[1] : s;
  }

  function thumbEntryKey(t) {
    if (!t) return '';
    if (t.type === 'img') return normalizeThumbUrlKey(t.src);
    const st = t.style || '';
    const m = st.match(/url\((['"]?)([^)'"]+)\1\)/i);
    return m ? normalizeThumbUrlKey(m[2]) : normalizeThumbUrlKey(st);
  }

  /**
   * 从画廊 HTML 抽出缩略（img 或雪碧 background）。
   * limit = 需要的张数；skipCoverDupes 时多取几张，去掉与封面重复的开头页。
   */
  function parseGalleryThumbsFromHtml(html, limit, opts) {
    opts = opts || {};
    const max = Math.max(1, Math.min(12, Number(limit) || 4));
    // 多取：常跳过首页（=封面），有时前两页都像封面
    const collect = Math.min(24, max + (opts.skipCoverDupes ? 4 : 0));
    const out = [];
    if (!html) return out;
    let doc;
    try {
      doc = new DOMParser().parseFromString(String(html), 'text/html');
    } catch (_) {
      return out;
    }
    const gdt = doc.querySelector('#gdt');
    if (!gdt) return out;

    const cells = gdt.querySelectorAll('.gdtm, .gdtl');
    const pickFrom = cells.length ? cells : gdt.querySelectorAll('a[href*="/s/"]');

    const isBlank = (u) => !u || /blank\.gif|transparent\.gif|loading\.gif|\/g\/blank/i.test(u);

    for (let i = 0; i < pickFrom.length && out.length < collect; i++) {
      const cell = pickFrom[i];
      const a =
        cell.tagName === 'A'
          ? cell
          : cell.querySelector('a[href*="/s/"]') || cell.querySelector('a[href*="/g/"]');
      const href = a ? a.getAttribute('href') || '' : '';

      let imgSrc = '';
      const img = cell.querySelector ? cell.querySelector('img') : cell.tagName === 'IMG' ? cell : null;
      if (img) {
        imgSrc = img.getAttribute('data-src') || img.getAttribute('src') || '';
        if (isBlank(imgSrc)) imgSrc = '';
      }

      if (imgSrc) {
        out.push({ type: 'img', src: imgSrc, href: href });
        continue;
      }

      // 雪碧图：取带 url(...) 的 style
      const candidates = [];
      if (cell.getAttribute) candidates.push(cell);
      if (cell.querySelectorAll) {
        cell.querySelectorAll('div[style*="background"], div[style*="url("]').forEach((d) => candidates.push(d));
      }
      let bgStyle = '';
      let w = 0;
      let h = 0;
      for (const el of candidates) {
        const st = el.getAttribute('style') || '';
        if (!/url\s*\(/i.test(st)) continue;
        const parts = [];
        st.split(';').forEach((p) => {
          const t = compactText(p);
          if (!t) return;
          const k = t.split(':')[0].toLowerCase();
          if (
            k === 'background' ||
            k === 'background-image' ||
            k === 'background-position' ||
            k === 'background-size' ||
            k === 'background-repeat' ||
            k === 'width' ||
            k === 'height'
          ) {
            parts.push(t);
            if (k === 'width') {
              const m = t.match(/(\d+)/);
              if (m) w = parseInt(m[1], 10) || 0;
            }
            if (k === 'height') {
              const m = t.match(/(\d+)/);
              if (m) h = parseInt(m[1], 10) || 0;
            }
          }
        });
        if (parts.length) {
          bgStyle = parts.join(';');
          break;
        }
      }
      if (bgStyle) {
        out.push({ type: 'bg', style: bgStyle, href: href, w: w || 100, h: h || 140 });
      }
    }

    if (!opts.skipCoverDupes) return out.slice(0, max);
    return selectHoverPreviewThumbs(out, opts.coverUrl || '', max);
  }

  /**
   * 悬停预览：去掉与封面重复的开头页。
   * - 永远跳过第 1 张（几乎总是封面）
   * - 第 2 张若与封面或第 1 张相同也跳过
   * - 之后仍命中封面 key 的再跳过（最多再 1 次）
   */
  function selectHoverPreviewThumbs(rawThumbs, coverUrl, wantCount) {
    const want = Math.max(1, Math.min(12, Number(wantCount) || 4));
    const list = rawThumbs || [];
    if (!list.length) return [];
    const coverKey = normalizeThumbUrlKey(coverUrl);
    const firstKey = thumbEntryKey(list[0]);
    const out = [];
    let skippedLead = 0;
    for (let i = 0; i < list.length && out.length < want; i++) {
      const t = list[i];
      const k = thumbEntryKey(t);
      if (i === 0) {
        // 首页 ≈ 封面
        skippedLead++;
        continue;
      }
      if (i === 1) {
        const sameAsFirst = k && firstKey && k === firstKey;
        const sameAsCover = k && coverKey && (k === coverKey || k.endsWith(coverKey) || coverKey.endsWith(k));
        if (sameAsFirst || sameAsCover) {
          skippedLead++;
          continue;
        }
      }
      // 开头连续封面重复（最多再跳 1 张）
      if (out.length === 0 && skippedLead < 3 && k && coverKey && k === coverKey) {
        skippedLead++;
        continue;
      }
      out.push(t);
    }
    // 若跳完不够，从原列表后面补（仍不回填第 0 张）
    if (out.length < want) {
      for (let i = 1; i < list.length && out.length < want; i++) {
        if (out.indexOf(list[i]) >= 0) continue;
        out.push(list[i]);
      }
    }
    return out;
  }

  function isBlockedEdition(edition, work) {
    if (work && work.blocked) return { blocked: true, reason: 'work' };
    const title = (edition.title_raw || '').toLowerCase();
    for (const kw of config.block_title_keywords || []) {
      const k = compactText(kw).toLowerCase();
      if (k && title.includes(k)) return { blocked: true, reason: 'title:' + k };
    }
    const up = (edition.uploader || '').toLowerCase();
    for (const u of config.block_uploaders || []) {
      if (compactText(u).toLowerCase() === up && up) return { blocked: true, reason: 'uploader' };
    }
    if ((config.block_languages || []).includes(edition.language)) {
      return { blocked: true, reason: 'language' };
    }
    if ((config.block_censor || []).includes(edition.censor_tier)) {
      return { blocked: true, reason: 'censor' };
    }
    const cat = (edition.category || '').toLowerCase();
    for (const c of config.block_categories || []) {
      if (compactText(c).toLowerCase() === cat && cat) return { blocked: true, reason: 'category' };
    }
    const tagset = (edition.tags || []).map((t) => normalizeNamespaceTag(t));
    for (const ht of config.hate_tags || []) {
      const h = normalizeNamespaceTag(ht);
      if (h && tagset.some((t) => t === h || t.endsWith(':' + h) || t.includes(h))) {
        return { blocked: true, reason: 'tag:' + h };
      }
    }
    const g = (edition.group || '').toLowerCase();
    for (const b of config.group_blacklist || []) {
      if (compactText(b).toLowerCase() === g && g) return { blocked: true, reason: 'group' };
    }
    return { blocked: false, reason: '' };
  }

  function parseImagePageProgress() {
    // /s/{token}/{gid}-{page}
    const m = (location.pathname || '').match(/\/s\/[^/]+\/(\d+)-(\d+)/i);
    if (!m) return null;
    return { gid: m[1], page: parseInt(m[2], 10) || 0 };
  }
