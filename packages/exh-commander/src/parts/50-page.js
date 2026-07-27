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
      current_url: parsed.href.split('#')[0],
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
