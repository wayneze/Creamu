
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

  function getTrackingCursorDirection(href) {
    try {
      const params = new URL(href || location.href, location.origin).searchParams;
      if (compactText(params.get('next') || '')) return 1;
      if (compactText(params.get('prev') || '')) return -1;
    } catch (_) { /* ignore */ }
    return 0;
  }

  /**
   * 维护追更列表的 0-based 浏览深度。EH 的 next= 指向更旧结果，prev= 返回更新结果；
   * 同一 URL 可能被追更条和卡片先后读取，因此只有 URL 变化时才推进一次。
   */
  function resolveTrackingListDepth(trackingId, pageState, href, fallbackDepth) {
    const state = pageState || {};
    const explicit = Number(state.index);
    const fallback = Number(fallbackDepth);
    if (state.isFirst === true) {
      if (!trackingId) return 0;
    } else if (state.known === true && Number.isFinite(explicit) && explicit >= 0) {
      if (!trackingId) return explicit;
    } else if (!trackingId) {
      return Number.isFinite(fallback) && fallback >= 0 ? fallback : -1;
    }

    const depthKey = 'exc_trk_depth_' + trackingId;
    const urlKey = 'exc_trk_url_' + trackingId;
    const currentUrl = compactText(href || location.href).split('#')[0];
    let depth = Number.isFinite(fallback) && fallback >= 0 ? Math.floor(fallback) : -1;
    try {
      const stored = parseInt(sessionStorage.getItem(depthKey) || '-1', 10);
      if (Number.isFinite(stored) && stored >= 0) depth = stored;

      if (state.isFirst === true) {
        depth = 0;
      } else if (state.known === true && Number.isFinite(explicit) && explicit >= 0) {
        depth = Math.floor(explicit);
      } else {
        const previousUrl = sessionStorage.getItem(urlKey) || '';
        if (currentUrl && currentUrl !== previousUrl) {
          const direction = getTrackingCursorDirection(currentUrl);
          if (direction > 0) depth = depth >= 0 ? depth + 1 : 1;
          else if (direction < 0 && depth >= 0) depth = Math.max(0, depth - 1);
        }
      }

      if (depth >= 0) sessionStorage.setItem(depthKey, String(depth));
      if (currentUrl) sessionStorage.setItem(urlKey, currentUrl);
    } catch (_) { /* ignore */ }
    return depth;
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

  async function saveCurrentPageAsTracking(options) {
    const opts = options || {};
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
    if (typeof applyListVolatileState === 'function') {
      applyListVolatileState(loadSeenGids(), rec);
    }
    if (opts.chooseFolder === true && typeof openTrackingFolderDialog === 'function') {
      await openTrackingFolderDialog(rec, { reason: 'collect' });
    }
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
    try {
      const savedPage = Number(rec.breakpoint_page);
      if (rec.id && Number.isFinite(savedPage) && savedPage >= 0) {
        sessionStorage.setItem('exc_trk_depth_' + rec.id, String(Math.floor(savedPage)));
        sessionStorage.setItem('exc_trk_url_' + rec.id, url.split('#')[0]);
      }
    } catch (_) { /* ignore */ }
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
