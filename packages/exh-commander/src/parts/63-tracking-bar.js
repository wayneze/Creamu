
  let trackingBarBrowseTimer = null;

  function mountTrackingBar(bar) {
    // 挂在「工具条/顶部分页」之后、「画廊列表」之前，避免贴 #nb 或搜索框上方
    const list =
      document.querySelector('#ido table.itg') ||
      document.querySelector('#ido .itg') ||
      document.querySelector('table.itg') ||
      document.querySelector('.itg') ||
      document.querySelector('#ido .gl1t') ||
      document.querySelector('.gl1t');
    const dms = document.getElementById('dms');
    const topPager =
      document.querySelector('#ido table.ptt') ||
      document.querySelector('table.ptt') ||
      document.querySelector('.ptt');
    const favForm =
      document.querySelector('#favform') ||
      document.querySelector('form[action*="favorites"]') ||
      document.querySelector('#ido form');

    if (list && list.parentNode) {
      // 若顶部分页与列表同父，插在分页后；否则直接在列表前
      let insertBeforeNode = list;
      if (
        topPager &&
        topPager.parentNode === list.parentNode &&
        topPager.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING
      ) {
        // 分页 → [bar] → 列表
        insertBeforeNode = list;
        if (bar.parentNode !== list.parentNode || bar.nextElementSibling !== list) {
          list.parentNode.insertBefore(bar, list);
        }
        return;
      }
      if (dms && dms.parentNode === list.parentNode) {
        // dms → [bar] → 列表（中间可能还有节点，仍贴列表前更稳）
        if (bar.parentNode !== list.parentNode || bar.nextElementSibling !== list) {
          list.parentNode.insertBefore(bar, list);
        }
        return;
      }
      if (bar.parentNode !== list.parentNode || bar.nextElementSibling !== insertBeforeNode) {
        list.parentNode.insertBefore(bar, insertBeforeNode);
      }
      return;
    }

    if (dms && dms.parentNode) {
      // 无列表时：放在 dms 后
      if (bar.previousElementSibling !== dms || bar.parentNode !== dms.parentNode) {
        dms.parentNode.insertBefore(bar, dms.nextSibling);
      }
      return;
    }

    if (favForm && favForm.parentNode) {
      if (bar.previousElementSibling !== favForm || bar.parentNode !== favForm.parentNode) {
        favForm.parentNode.insertBefore(bar, favForm.nextSibling);
      }
      return;
    }

    const ido = document.getElementById('ido') || document.querySelector('.ido');
    if (ido) {
      // 不要 prepend 到 ido 顶：尽量找内容块
      const firstBig = ido.querySelector('.itg, table.ptt, #dms, .gl1t, table');
      if (firstBig && firstBig.parentNode === ido) {
        if (firstBig.id === 'dms' || (firstBig.classList && firstBig.classList.contains('ptt'))) {
          if (bar.previousElementSibling !== firstBig) {
            ido.insertBefore(bar, firstBig.nextSibling);
          }
        } else if (bar.nextElementSibling !== firstBig) {
          ido.insertBefore(bar, firstBig);
        }
      } else if (!bar.parentNode || bar.parentNode !== ido) {
        // 最后手段：插在 ido 末尾附近，而不是最顶
        ido.appendChild(bar);
      }
      return;
    }
    if (!bar.parentNode) document.body.appendChild(bar);
  }

  function refreshTrackingBarFrom(preloaded) {
    const pending = preloaded
      ? Promise.resolve(preloaded).then((state) => refreshTrackingBarState(state))
      : refreshTrackingBarState();
    void pending.catch(() => {});
  }

  function injectTrackingBar(preloaded) {
    const ctx = parseExhPageContext(location.href);
    let bar = document.getElementById('exc-tracking-bar');
    if (!ctx || !ctx.trackable) {
      if (bar) bar.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'exc-tracking-bar';
    }

    // 同一 signature 不重建 DOM，只校正挂载位置。
    if (bar.dataset.sig === ctx.query_signature && bar.dataset.ready === '1') {
      mountTrackingBar(bar);
      refreshTrackingBarFrom(preloaded);
      return;
    }

    mountTrackingBar(bar);

    bar.dataset.sig = ctx.query_signature;
    bar.dataset.ready = '1';
    bar.removeAttribute('style');
    const groupLabel = getTrackingGroupLabel(ctx.group_type);
    bar.innerHTML =
      '<span class="exc-track-label" title="' +
      escapeHtml(ctx.label) +
      '"><b>追更</b> · ' +
      escapeHtml(groupLabel) +
      ' · ' +
      escapeHtml(ctx.label) +
      '</span>' +
      '<span class="exc-track-status" id="exc-track-status">未收藏</span>' +
      '<div class="exc-track-actions">' +
      // 继续断点放最前：有断点时最显眼，不再排在「已追更」后面
      '<button type="button" class="jlc-wb-btn primary exc-track-btn exc-bp-continue" id="exc-goto-bp" hidden title="跳到断点作品并定位">继续断点</button>' +
      '<button type="button" class="jlc-wb-btn ghost exc-track-btn" id="exc-save-tracking">⭐ 收藏追更</button>' +
      '<button type="button" class="jlc-wb-btn ghost exc-track-btn" id="exc-untrack" hidden title="从追更列表移除">取消追更</button>' +
      '</div>' +
      '<div class="exc-track-meta" id="exc-track-meta" hidden></div>';

    const btn = document.getElementById('exc-save-tracking');
    if (btn) {
      btn.onclick = async () => {
        await saveCurrentPageAsTracking({ chooseFolder: true });
        void refreshTrackingBarState();
      };
    }
    const gotoBp = document.getElementById('exc-goto-bp');
    if (gotoBp) {
      gotoBp.onclick = async () => {
        const rec =
          typeof findTrackingForContext === 'function'
            ? await findTrackingForContext(ctx)
            : await getTrackingBySignature(ctx.query_signature);
        if (!rec) return;
        await openTrackingBreakpoint(rec);
      };
    }
    const untrack = document.getElementById('exc-untrack');
    if (untrack) {
      untrack.onclick = async () => {
        const rec =
          typeof findTrackingForContext === 'function'
            ? await findTrackingForContext(ctx)
            : await getTrackingBySignature(ctx.query_signature);
        if (!rec) return;
        if (!confirm('取消追更「' + getTrackingDisplayTitle(rec) + '」？')) return;
        await deleteTrackingRecord(rec.id);
        showToast('已取消追更');
        void refreshTrackingBarState();
        if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
      };
    }
    refreshTrackingBarFrom(preloaded);
  }

  async function refreshTrackingBarState(preloaded) {
    const ctx = preloaded && preloaded.context
      ? preloaded.context
      : parseExhPageContext(location.href);
    const bar = document.getElementById('exc-tracking-bar');
    const btn = document.getElementById('exc-save-tracking');
    const status = document.getElementById('exc-track-status');
    const gotoBp = document.getElementById('exc-goto-bp');
    const untrack = document.getElementById('exc-untrack');
    const meta = document.getElementById('exc-track-meta');
    if (!ctx || !ctx.trackable || !bar || !btn) return;
    if (bar.dataset.sig && ctx.query_signature && bar.dataset.sig !== ctx.query_signature) return;

    const rec = preloaded && preloaded.resolved
      ? preloaded.record || null
      : typeof findTrackingForContext === 'function'
        ? await findTrackingForContext(ctx)
        : await getTrackingBySignature(ctx.query_signature);
    const pageState =
      typeof getListPageState === 'function'
        ? getListPageState(location.href, document)
        : {
            index: getCurrentListPageIndex(),
            known: true,
            isFirst: getCurrentListPageIndex() === 0,
            mode: 'page',
            display: String((getCurrentListPageIndex() || 0) + 1),
          };
    let pageIdx = pageState.known && pageState.index >= 0 ? pageState.index : -1;
    const pageDisp =
      pageState.display ||
      (typeof formatListPageDisplay === 'function'
        ? formatListPageDisplay(pageState)
        : pageIdx >= 0
          ? String(pageIdx + 1)
          : '深页');
    const isFirstPage = pageState.isFirst === true;

    if (rec) {
      // 追更条与卡片共用同一游标深度，prev= 返回更新结果时必须递减。
      if (rec.id && typeof resolveTrackingListDepth === 'function') {
        pageIdx = resolveTrackingListDepth(rec.id, pageState, location.href, rec.last_page);
      }
      if (rec.id && pageIdx >= 0) {
        document.querySelectorAll('.exc-gl-item[data-exc-track-id="' + rec.id + '"]').forEach((el) => {
          el.dataset.excTrackLastPage = String(pageIdx);
        });
      }
      bar.classList.add('is-tracked');
      if (status) status.textContent = '已追更';
      btn.textContent = '✓ 已追更';
      btn.classList.remove('primary');
      btn.classList.add('ghost');
      btn.title = '已在追更列表';
      if (untrack) untrack.hidden = false;
      const hasBp = trackingHasAnyBreakpoint(rec);
      if (gotoBp) {
        gotoBp.hidden = !hasBp;
        if (hasBp) {
          const bpPage = Number(rec.breakpoint_page);
          const bpPageLabel =
            Number.isFinite(bpPage) && bpPage >= 0
              ? String(bpPage + 1)
              : rec.breakpoint_page_mode === 'cursor' || bpPage < 0
                ? '深页'
                : '1';
          const bpPosted = getTrackingBpMetaLabel(rec);
          const bpTitle = shortTrackingWorkLabel(
            rec.breakpoint_title,
            rec.breakpoint_gid,
            40
          );
          gotoBp.textContent = bpPosted
            ? '继续断点 · ' + bpPosted
            : '继续断点 · 第' + bpPageLabel + '页';
          gotoBp.title =
            '定位断点作品' +
            (bpTitle ? '「' + bpTitle + '」' : '') +
            (bpPosted ? ' · ' + bpPosted : '') +
            '（列表第 ' +
            bpPageLabel +
            ' 页）· 在封面点「断」可改断点';
        }
      }
      if (meta) {
        meta.hidden = false;
        const bits = [
          pageState.mode === 'cursor' && !pageState.known
            ? '当前深页（游标 next/prev）'
            : '当前第 ' + pageDisp + ' 页',
        ];
        if (rec.breakpoint_gid || rec.breakpoint_posted_at || rec.breakpoint_title) {
          bits.push('断点 ' + (getTrackingBpMetaLabel(rec) || '已设'));
        }
        if (hasBp) {
          const bpPage = Number(rec.breakpoint_page);
          const bpPageLabel =
            Number.isFinite(bpPage) && bpPage >= 0
              ? String(bpPage + 1)
              : '深页';
          bits.push('断点第' + bpPageLabel + '页');
        }
        if (
          typeof trackingHasPendingUpdate === 'function'
            ? trackingHasPendingUpdate(rec)
            : rec.has_update ||
              (rec.top_gid && rec.breakpoint_gid && rec.top_gid !== rec.breakpoint_gid)
        ) {
          const n =
            typeof getTrackingUnreadEstimate === 'function' ? getTrackingUnreadEstimate(rec) : 0;
          bits.push(n > 0 ? (rec.unread_estimate_capped ? '+' + n + '+ 未读' : '+' + n + ' 未读') : '有更新');
        }
        bits.push('封面右下角「断」= 设作品断点');
        meta.textContent = bits.join(' · ');
      }
      // 轻量记浏览页（防抖）；深页/游标页绝不改写 top_gid
      if (trackingBarBrowseTimer) clearTimeout(trackingBarBrowseTimer);
      trackingBarBrowseTimer = setTimeout(async () => {
        try {
          const latest =
            typeof findTrackingForContext === 'function'
              ? await findTrackingForContext(ctx)
              : await getTrackingBySignature(ctx.query_signature);
          if (!latest) return;
          latest.last_page = pageIdx;
          latest.last_browsed_at = nowMs();
          if (latest.open_url && typeof canonicalizeTrackingOpenUrl === 'function') {
            const canon = canonicalizeTrackingOpenUrl(latest.open_url);
            if (latest.open_url !== canon) {
              latest.open_url = canon;
              latest.page_url = canon;
            }
          }
          // 仅真·首页才更新「最新」；深页/游标只估未读
          if (isFirstPage && ctx.top_gid) {
            const previousTop = compactText(latest.top_gid || '');
            if (latest.top_gid && latest.top_gid !== ctx.top_gid) {
              latest.has_update = 1;
              latest.prev_top_gid = latest.top_gid;
            }
            if (
              latest.breakpoint_gid &&
              String(latest.breakpoint_gid) !== String(ctx.top_gid)
            ) {
              latest.has_update = 1;
            }
            latest.top_gid = ctx.top_gid;
            if (ctx.top_title) latest.top_title = compactText(ctx.top_title).slice(0, 160);
            if (ctx.top_posted_at) latest.top_posted_at = Number(ctx.top_posted_at) || 0;
            if (ctx.top_cover) applyTrackingCoverFields(latest, ctx.top_cover);
            try {
              const gids =
                typeof extractOrderedGidsFromDocument === 'function'
                  ? extractOrderedGidsFromDocument(document)
                  : [];
              if (typeof applyTrackingUnreadFromGids === 'function') {
                applyTrackingUnreadFromGids(latest, gids, ctx.top_gid || latest.top_gid || '', {
                  previousTop: previousTop,
                  pageIndex: 0,
                  isFirst: true,
                  mode: 'absolute',
                });
              }
            } catch (_) { /* ignore */ }
          } else if (!isFirstPage && latest.breakpoint_gid) {
            // 深页浏览：只记位置；未读禁止用当页局部覆盖（next= 会把 +200 打成 +23）
            // 已知 page=N 时才允许用页偏移抬高下限
            try {
              if (pageState.known && pageIdx >= 0) {
                const gids =
                  typeof extractOrderedGidsFromDocument === 'function'
                    ? extractOrderedGidsFromDocument(document)
                    : [];
                if (typeof applyTrackingUnreadFromGids === 'function') {
                  applyTrackingUnreadFromGids(latest, gids, latest.top_gid || '', {
                    pageIndex: pageIdx,
                    isFirst: false,
                    deepUnknown: false,
                    mode: 'browse',
                  });
                }
              } else {
                // 游标深页：最多维持 has_update，不改 unread_estimate
                if (
                  latest.top_gid &&
                  latest.breakpoint_gid &&
                  String(latest.top_gid) !== String(latest.breakpoint_gid)
                ) {
                  latest.has_update = 1;
                }
              }
            } catch (_) { /* ignore */ }
          }
          await saveTrackingRecord(latest);
        } catch (_) { /* ignore */ }
      }, 800);
    } else {
      bar.classList.remove('is-tracked');
      if (status) status.textContent = '未收藏';
      btn.textContent = '⭐ 收藏追更';
      btn.title = '收藏当前搜索到追更';
      if (gotoBp) gotoBp.hidden = true;
      if (untrack) untrack.hidden = true;
      if (meta) {
        meta.hidden = false;
        meta.textContent =
          (pageState.mode === 'cursor' && !pageState.known
            ? '当前深页（游标）'
            : '当前列表第 ' + pageDisp + ' 页') +
          ' · 在任意作品封面右下角点「断」设为断点作品';
      }
    }
  }
