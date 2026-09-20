
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
  function estimateUnreadFromGids(gids, anchorGid, opts) {
    const list = Array.isArray(gids) ? gids.map(String) : [];
    const pageLen = list.length;
    const anchors = [];
    const primary = compactText(anchorGid || '');
    if (primary) anchors.push({ gid: primary, kind: 'exact', shift: 0 });
    const older = compactText((opts && opts.olderGid) || '');
    const newer = compactText((opts && opts.newerGid) || '');
    if (older) anchors.push({ gid: older, kind: 'older', shift: 0 });
    if (newer) anchors.push({ gid: newer, kind: 'newer', shift: 1 });
    if (!list.length || !anchors.length) return { found: false, count: 0, pageLen, kind: '' };
    for (let i = 0; i < anchors.length; i++) {
      const idx = list.indexOf(anchors[i].gid);
      if (idx < 0) continue;
      return {
        found: true,
        count: Math.max(0, idx + anchors[i].shift),
        pageLen,
        kind: anchors[i].kind,
      };
    }
    return { found: false, count: 0, pageLen, kind: '' };
  }

  /**
   * 从列表文档取相邻页 URL。
   * next：分页表 > / » 或 href 带 next=；prev：< / « 或 href 带 prev=。
   * 不要取最大 page=，会直接跳到末页。
   */
  function extractListAdjacentPageUrlFromDocument(doc, baseUrl, direction) {
    if (!doc || !doc.querySelectorAll) return '';
    baseUrl = baseUrl || (typeof location !== 'undefined' ? location.href : '');
    const wantNext = direction !== 'prev';
    const cursorRe = wantNext ? /[?&]next=\d+/i : /[?&]prev=\d+/i;
    const arrowRe = wantNext ? /^[>›»]+$/ : /^[<‹«]+$/;
    const roots = doc.querySelectorAll('table.ptt, table.ptb, .ptt, .ptb');
    const prefer = [];
    const collect = (root) => {
      if (!root || !root.querySelectorAll) return;
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
        if (arrowRe.test(t) || cursorRe.test(href)) {
          prefer.push(inheritTrackingListIdentity(abs, baseUrl));
        }
      });
    };
    for (let i = 0; i < roots.length; i++) collect(roots[i]);
    if (!prefer.length) collect(doc);
    for (let i = 0; i < prefer.length; i++) {
      if (cursorRe.test(prefer[i])) return prefer[i];
    }
    return prefer[0] || '';
  }

  function extractListAdjacentPageUrl(html, baseUrl, direction) {
    baseUrl = baseUrl || (typeof location !== 'undefined' ? location.href : '');
    if (html && html.querySelectorAll && typeof html !== 'string') {
      return extractListAdjacentPageUrlFromDocument(html, baseUrl, direction);
    }
    const s = String(html || '');
    try {
      if (typeof DOMParser !== 'undefined') {
        const doc = new DOMParser().parseFromString(s, 'text/html');
        const fromDom = extractListAdjacentPageUrlFromDocument(doc, baseUrl, direction);
        if (fromDom) return fromDom;
      }
    } catch (_) { /* regex */ }
    const wantNext = direction !== 'prev';
    let m = s.match(
      wantNext
        ? /href=["']([^"']*[?&]next=\d+[^"']*)["']/i
        : /href=["']([^"']*[?&]prev=\d+[^"']*)["']/i
    );
    if (m) {
      try {
        return inheritTrackingListIdentity(
          new URL(m[1].replace(/&amp;/g, '&'), baseUrl).href,
          baseUrl
        );
      } catch (_) { /* ignore */ }
    }
    m = s.match(
      wantNext
        ? /href=["']([^"']*)["'][^>]*>\s*(?:&gt;|>|›|»)\s*</i
        : /href=["']([^"']*)["'][^>]*>\s*(?:&lt;|<|‹|«)\s*</i
    );
    if (m) {
      try {
        return inheritTrackingListIdentity(
          new URL(m[1].replace(/&amp;/g, '&'), baseUrl).href,
          baseUrl
        );
      } catch (_) { /* ignore */ }
    }
    return '';
  }

  function extractListNextPageUrl(html, baseUrl) {
    return extractListAdjacentPageUrl(html, baseUrl, 'next');
  }

  function extractListPrevPageUrl(html, baseUrl) {
    return extractListAdjacentPageUrl(html, baseUrl, 'prev');
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
      return inheritTrackingListIdentity(u.href, homeUrl);
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

    const onHome = estimateUnreadFromGids(homeGids, bp, {
      newerGid: rec.breakpoint_newer_gid,
      olderGid: rec.breakpoint_older_gid,
    });
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
      kind: '',
      count: 0,
      capped: 0,
      pagesScanned: 0,
      topGal: null,
      firstGids: [],
      lastError: '',
    };
    const neighborOpts = {
      newerGid: compactText((opts && opts.newerGid) || ''),
      olderGid: compactText((opts && opts.olderGid) || ''),
    };
    if (!anchor && !neighborOpts.newerGid && !neighborOpts.olderGid) return result;

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

      const est = estimateUnreadFromGids(gids, anchor, neighborOpts);
      if (est.found) {
        result.found = true;
        result.kind = est.kind || 'exact';
        result.count = totalBefore + est.count;
        result.capped = 0;
        break;
      }
      totalBefore += gids.length;

      // 下一页：HTML 链 → next=末 gid → page=N
      let nextUrl = extractListNextPageUrl(html, url);
      if (nextUrl) nextUrl = inheritTrackingListIdentity(nextUrl, home);
      if (!nextUrl) {
        nextUrl = buildListUrlWithNextGid(home, gids[gids.length - 1]);
      }
      if (!nextUrl) {
        nextUrl = inheritTrackingListIdentity(buildListUrlWithPage(home, pages), home);
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

    const est = estimateUnreadFromGids(gids, anchor, {
      newerGid: rec.breakpoint_newer_gid,
      olderGid: rec.breakpoint_older_gid,
    });

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
   *   deepScan：false 才强制只看首页；默认从首页向后翻到断点。
   */
  async function refreshSingleTrackingRecord(rec, opts) {
    if (!rec) throw new Error('无记录');
    opts = opts || {};
    const raw = rec.open_url || rec.page_url;
    if (!raw) throw new Error('无 URL');
    const home = buildListUrlWithPage(canonicalizeTrackingOpenUrl(raw), 0);
    // 顺手纠正历史脏 open_url（带深页 page/next）；丢掉 f_search/favcat 的首页不算纠正
    if (
      rec.open_url &&
      rec.open_url !== home &&
      !(typeof trackingOpenUrlLosesIdentity === 'function' && trackingOpenUrlLosesIdentity(rec.open_url, home))
    ) {
      rec.open_url = home;
      rec.page_url = home;
    }
    const previousTop = compactText(rec.top_gid || '');
    const bp = compactText(rec.breakpoint_gid || '');
    // 断点不在首页时跨页扫；否则只会得到假 +25。opts.deepScan===false 才强制快路径
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
      const onHome = estimateUnreadFromGids(gids, bp, {
        newerGid: rec.breakpoint_newer_gid,
        olderGid: rec.breakpoint_older_gid,
      });
      if (onHome.found) {
        scan = {
          found: true,
          kind: onHome.kind || 'exact',
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
          newerGid: rec.breakpoint_newer_gid,
          olderGid: rec.breakpoint_older_gid,
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
        rec.breakpoint_missing = 0;
        rec.breakpoint_anchor_kind = '';
        if (scan.found) {
          rec.unread_estimate = Math.max(0, Number(scan.count) || 0);
          rec.unread_estimate_capped = 0;
          rec.unread_estimate_source = usedDeep ? 'deep_scan' : 'home_exact';
          rec.breakpoint_anchor_kind = scan.kind || 'exact';
          rec.last_check_error = '';
          if (rec.unread_estimate > 0) rec.has_update = 1;
          else if (top === bp || scan.kind === 'newer' || scan.kind === 'older') {
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
          // 深度扫满仍未见断点：列表检查本身成功，只是作品可能已下架
          rec.has_update = 1;
          rec.breakpoint_missing = 1;
          rec.unread_estimate = Math.max(
            Number(rec.unread_estimate) || 0,
            Number(scan.count) || 0,
            gids.length || 0
          );
          rec.unread_estimate_capped = 1;
          rec.unread_estimate_source = 'deep_scan';
          rec.last_check_error = '';
          if (scan.lastError) {
            rec.last_check_error = scan.lastError;
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
