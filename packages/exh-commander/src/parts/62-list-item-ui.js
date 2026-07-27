
  async function enhanceListItem(el, ctx) {
    if (!el || el.dataset.excEnhanced === '1') return null;
    const listContext = ctx || {};
    const partial = listContext.partial || parseListCard(el);
    if (!partial || !partial.gid) return null;
    el.dataset.excEnhanced = '1';
    el.classList.add('exc-gl-item');
    el.dataset.excGid = partial.gid;
    el.dataset.excToken = partial.token;
    // 悬停预览尽早绑定（不等 DB）
    bindListHoverPreview(el, partial);

    // 列表打开方式：设置里「新标签页打开」
    try {
      if (config.list_open_in_new_tab) {
        el.querySelectorAll('a[href*="/g/"]').forEach((a) => {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        });
      } else {
        el.querySelectorAll('a[href*="/g/"]').forEach((a) => {
          if (a.getAttribute('target') === '_blank' && a.dataset.excTabForced === '1') {
            a.removeAttribute('target');
            a.removeAttribute('rel');
            delete a.dataset.excTabForced;
          }
        });
      }
      if (config.list_open_in_new_tab) {
        el.querySelectorAll('a[href*="/g/"]').forEach((a) => {
          a.dataset.excTabForced = '1';
        });
      }
    } catch (_) { /* ignore */ }

    let edition;
    try {
      edition = listContext.edition || (await upsertEdition(partial));
    } catch (e) {
      console.warn('[ExC] upsert list edition', e);
      delete el.dataset.excEnhanced;
      return null;
    }
    el.dataset.excWork = edition.work_id || '';

    const hasPreparedWork = Object.prototype.hasOwnProperty.call(listContext, 'work');
    const work = hasPreparedWork
      ? listContext.work
      : edition.work_id
        ? await idbGet(STORE_WORKS, edition.work_id)
        : null;
    const lib = listContext.libraryState ||
      (await resolveLibraryState(edition, listContext.storageSnapshot));
    const block = isBlockedEdition(edition, work);

    if (block.blocked) {
      el.classList.add('is-exc-blocked');
      if (config.hide_blocked) el.classList.add('exc-hide');
    }
    // 三类框体分开打标（互不顶替，可叠加）
    // 1) 点过 2) 库内 3) 心动
    el.classList.remove('is-exc-seen', 'is-exc-lib', 'is-exc-fav', 'is-exc-familiar');
    const seenOnly = listContext.seenGids
      ? !!listContext.seenGids[String(edition.gid)]
      : isGallerySeen(edition.gid);
    if (seenOnly) el.classList.add('is-exc-seen');
    const inLib = !!(
      lib &&
      (lib.same_version_confirmed || lib.edition_in_library || lib.work_in_library)
    );
    if (inLib) el.classList.add('is-exc-lib');

    // 封面 host：点过/库内描边仍打在图上
    let coverHost =
      el.querySelector('.glthumb') ||
      el.querySelector('.gl1e') ||
      el.querySelector('.gl3t') ||
      el.querySelector('a[href*="/g/"]') ||
      el;
    if (!(coverHost && coverHost.querySelector && coverHost.querySelector('img'))) {
      const img = el.querySelector('img');
      if (img && img.parentElement) coverHost = img.parentElement;
    }
    if (coverHost && coverHost.nodeType === 1) {
      coverHost.classList.add('exc-cover-host');
      const cs = window.getComputedStyle(coverHost);
      if (cs.position === 'static') coverHost.style.position = 'relative';
    }

    // 徽章左上 + 标签流左下，都挂卡片框
    const badgeHost = el;
    if (badgeHost && badgeHost.nodeType === 1) {
      badgeHost.classList.add('exc-card-badge-host');
      const cs = window.getComputedStyle(badgeHost);
      if (cs.position === 'static') badgeHost.style.position = 'relative';
    }
    try {
      if (coverHost) {
        coverHost
          .querySelectorAll(':scope > .exc-badge-container, :scope > .exc-tag-stream')
          .forEach((n) => n.remove());
      }
    } catch (_) { /* ignore */ }

    const ensureBox = (cls) => {
      let box = badgeHost && badgeHost.querySelector(':scope > .' + cls);
      if (badgeHost && !box) {
        box = document.createElement('div');
        box.className = cls;
        badgeHost.appendChild(box);
      }
      return box;
    };
    const badgeBox = ensureBox('exc-badge-container');
    const streamBox = ensureBox('exc-tag-stream');

    const renderMetaHtml = (items) =>
      items
        .map((x) => {
          const tip = x.title ? ' title="' + escapeHtml(x.title) + '"' : '';
          if (x.act) {
            return (
              '<button type="button" class="meta-tag ' +
              (x.cls || '') +
              ' exc-meta-act"' +
              tip +
              ' data-exc-meta="' +
              escapeHtml(x.act) +
              '">' +
              escapeHtml(x.t) +
              '</button>'
            );
          }
          return (
            '<span class="meta-tag ' +
            (x.cls || '') +
            '"' +
            tip +
            '>' +
            escapeHtml(x.t) +
            '</span>'
          );
        })
        .join('');

    if (badgeBox || streamBox) {
      const topTags = [];
      const streamTags = [];
      const edTitle = edition.title_raw || edition.title || partial.title_raw || partial.title || '';
      const edTags = (() => {
        const set = new Set();
        const add = (arr) =>
          (arr || []).forEach((t) => {
            const s = compactText(t);
            if (s) set.add(s);
          });
        add(edition.tags);
        add(partial.tags);
        return Array.from(set);
      })();

      // —— 左上：状态徽章 ——
      if (lib && lib.same_version_confirmed) {
        topTags.push({ t: '同源✓', cls: 'ok', title: '已手动确认与库内为同一版本' });
      } else if (lib && lib.edition_in_library) topTags.push({ t: '本版在库', cls: 'ok' });
      else if (lib && lib.work_in_library) {
        const tip = libraryCompareTip(lib);
        const short =
          lib.library_compare && lib.library_compare.diffs && lib.library_compare.diffs.length
            ? (lib.library_compare.short_label || '库内有').slice(0, 16)
            : '库内有';
        topTags.push({ t: short, cls: 'ok', title: tip || '本 Work 库内已有版本' });
      } else if (lib && lib.maybe_in_library) {
        const label = maybeLibLabel(lib);
        topTags.push({
          t: label.slice(0, 16),
          cls:
            lib.library_compare && lib.library_compare.online_better
              ? 'maybe hot'
              : 'maybe',
          title: libraryCompareTip(lib) || '可能在库，点绑定 LRR 确认',
          act: 'bind',
        });
      }
      if (lib && lib.has_better_remote && !lib.same_version_confirmed) {
        topTags.push({ t: '有更好版', cls: 'hot' });
      }
      if (work && work.blocked) topTags.push({ t: '抛弃', cls: 'warn' });

      try {
        if (typeof matchFamiliarRadar === 'function') {
          const fam = matchFamiliarRadar(edTitle, edTags);
          if (fam && fam.name) {
            el.classList.add('is-exc-familiar');
            topTags.unshift({
              t: (fam.kind === 'group' ? '团队: ' : '画师: ') + String(fam.name).slice(0, 14),
              cls: fam.kind === 'group' ? 'familiar-group' : 'familiar-artist',
              title: '熟人 · ' + (fam.kind === 'group' ? '团队' : '画师') + ' · ' + fam.name,
            });
          }
        }
      } catch (_) { /* ignore */ }

      const favHits =
        typeof matchFavTags === 'function'
          ? matchFavTags(config.fav_tags || [], edTags, edTitle)
          : [];
      if (favHits.length) el.classList.add('is-exc-fav');
      favHits.slice(0, 2).forEach((ft) => {
        topTags.unshift({ t: '♥ ' + String(ft).slice(0, 12), cls: 'hot', title: '心动标签: ' + ft });
      });
      if (favHits.length > 2) {
        topTags.unshift({
          t: '♥+' + (favHits.length - 2),
          cls: 'hot',
          title: '更多心动: ' + favHits.slice(2).join(', '),
        });
      }

      // —— 左下：标签流（码级/内容/角色）——
      if (config.list_show_tag_stream !== false && typeof pickHighlightTags === 'function') {
        const hi = pickHighlightTags(edTags, {
          max: Number(config.list_tag_stream_max) || 3,
          favTags: config.fav_tags || [],
          title: edTitle,
        });
        hi.forEach((item) => {
          const label =
            typeof formatHighlightTagLabel === 'function'
              ? formatHighlightTagLabel(item)
              : item.name;
          streamTags.push({
            t: label,
            cls: 'stream',
            title: item.full || item.name,
          });
        });
      }
      // 码级简写可跟标签流一起放左下（标题常没有）
      if (edition.censor_tier && edition.censor_tier !== 'unknown') {
        const cs = shortCensor(edition.censor_tier) || edition.censor_tier;
        if (cs && !streamTags.some((x) => x.t === cs)) {
          streamTags.unshift({ t: cs, cls: 'stream', title: '码级' });
        }
      }

      if (badgeBox) {
        const showTop = topTags.slice(0, 6);
        const moreTop = topTags.length - showTop.length;
        badgeBox.innerHTML =
          '<div class="exc-meta-overlay">' +
          renderMetaHtml(showTop) +
          (moreTop > 0 ? '<span class="meta-tag more">+' + moreTop + '</span>' : '') +
          '</div>';
        badgeBox.onclick = async (ev) => {
          const btn = ev.target && ev.target.closest && ev.target.closest('[data-exc-meta]');
          if (!btn) return;
          ev.preventDefault();
          ev.stopPropagation();
          const act = btn.getAttribute('data-exc-meta');
          try {
            if (act === 'bind') await openBindModal(edition);
          } catch (err) {
            showToast('操作失败: ' + ((err && err.message) || err));
          }
        };
      }
      if (streamBox) {
        if (streamTags.length) {
          streamBox.innerHTML =
            '<div class="exc-meta-overlay">' + renderMetaHtml(streamTags.slice(0, 4)) + '</div>';
          streamBox.hidden = false;
        } else {
          streamBox.innerHTML = '';
          streamBox.hidden = true;
        }
      }
    }

    let tools = coverHost && coverHost.querySelector(':scope > .exc-tool-bar');
    if (coverHost && !tools) {
      tools = document.createElement('div');
      tools.className = 'exc-tool-bar';
      coverHost.appendChild(tools);
    }
    if (tools) {
      const blockOn = work && work.blocked;
      // 当前列表是否可追更 + 是否已是断点作品
      const pageCtx = Object.prototype.hasOwnProperty.call(listContext, 'pageContext')
        ? listContext.pageContext
        : parseExhPageContext(location.href);
      let isBpWork = false;
      let trkRec = null;
      if (pageCtx && pageCtx.trackable) {
        try {
          trkRec = listContext.trackingResolved
            ? listContext.trackingRecord || null
            : typeof findTrackingForContext === 'function'
              ? await findTrackingForContext(pageCtx)
              : await getTrackingBySignature(pageCtx.query_signature);
          if (trkRec && trkRec.id) {
            el.dataset.excTrackId = String(trkRec.id);
            if (trkRec.last_page != null) el.dataset.excTrackLastPage = String(trkRec.last_page);
          }
          if (trkRec && String(trkRec.breakpoint_gid || '') === String(edition.gid)) {
            isBpWork = true;
            el.classList.add('is-exc-breakpoint');
          }
          // 浏览列表时回填最新/断点的发布时间
          if (trkRec) {
            const isTop = String(trkRec.top_gid || '') === String(edition.gid);
            const isBp = String(trkRec.breakpoint_gid || '') === String(edition.gid);
            let posted =
              Number(edition.posted_at) ||
              Number(partial.posted_at) ||
              extractListItemPostedAt(el, edition.gid) ||
              0;
            // 仅对最新/断点作品走 gdata，避免列表刷爆 API
            if (!posted && (isTop || isBp)) {
              posted = await resolveGalleryPostedMs(
                edition.gid,
                edition.token || partial.token || '',
                el
              );
            }
            let trkDirty = false;
            if (isTop) {
              if (edition.token || partial.token) {
                trkRec.top_token = compactText(edition.token || partial.token);
              }
              if (posted && (!(Number(trkRec.top_posted_at) > 0) || Number(trkRec.top_posted_at) !== posted)) {
                trkRec.top_posted_at = posted;
                trkDirty = true;
              }
              const tt = compactText(partial.title_raw || edition.title_raw || '');
              if (tt && tt !== trkRec.top_title) {
                trkRec.top_title = tt.slice(0, 160);
                trkDirty = true;
              }
              if (partial.thumb || edition.thumb) {
                applyTrackingCoverFields(trkRec, partial.thumb || edition.thumb);
                trkDirty = true;
              }
            }
            if (isBp) {
              if (edition.token || partial.token) {
                trkRec.breakpoint_token = compactText(edition.token || partial.token);
              }
              if (
                posted &&
                (!(Number(trkRec.breakpoint_posted_at) > 0) ||
                  Number(trkRec.breakpoint_posted_at) !== posted)
              ) {
                trkRec.breakpoint_posted_at = posted;
                trkDirty = true;
              }
              const bt = compactText(partial.title_raw || edition.title_raw || '');
              if (bt && bt !== trkRec.breakpoint_title) {
                trkRec.breakpoint_title = bt.slice(0, 120);
                trkDirty = true;
              }
            }
            if (trkDirty) {
              await saveTrackingRecord(trkRec);
            }
          }
        } catch (_) { /* ignore */ }
      }
      // 作品级断点按钮：封面右下角「断」——不是顶栏整页断点
      const bpBtn =
        pageCtx && pageCtx.trackable
          ? '<button type="button" class="exc-tool-btn' +
            (isBpWork ? ' is-on is-bp' : '') +
            '" data-exc-act="breakpoint" title="设为追更断点（本作品）">断</button>'
          : '';
      tools.innerHTML =
        bpBtn +
        '<button type="button" class="exc-tool-btn" data-exc-act="best" title="最佳版">↗</button>' +
        '<button type="button" class="exc-tool-btn" data-exc-act="bind" title="绑定 LRR">📦</button>' +
        '<button type="button" class="exc-tool-btn' +
        (blockOn ? ' is-block is-on' : '') +
        '" data-exc-act="drop" title="抛弃/屏蔽此单本">✕</button>';

      tools.onclick = async (ev) => {
        const btn = ev.target && ev.target.closest && ev.target.closest('[data-exc-act]');
        if (!btn) return;
        ev.preventDefault();
        ev.stopPropagation();
        const act = btn.getAttribute('data-exc-act');
        try {
          if (act === 'breakpoint') {
            const ctx = parseExhPageContext(location.href);
            if (!ctx || !ctx.trackable) {
              showToast('当前页不能设断点');
              return;
            }
            let rec =
              typeof findTrackingForContext === 'function'
                ? await findTrackingForContext(ctx)
                : await getTrackingBySignature(ctx.query_signature);
            if (!rec) {
              rec = await saveCurrentPageAsTracking();
              if (!rec) return;
            }
            const postedLocal =
              Number(edition.posted_at) ||
              Number(partial.posted_at) ||
              extractListItemPostedAt(el, edition.gid) ||
              0;
            await markTrackingBreakpoint(rec, {
              gid: edition.gid,
              token: edition.token || partial.token || '',
              title: compactText(
                edition.title_raw || partial.title_raw || edition.title || partial.title || ''
              ),
              posted_at: postedLocal,
              root: el,
            });
            let bpPosted = '';
            try {
              const latest =
                typeof findTrackingForContext === 'function'
                  ? await findTrackingForContext(ctx)
                  : await getTrackingBySignature(ctx.query_signature);
              bpPosted = formatTrackingPostedShort(latest && latest.breakpoint_posted_at);
            } catch (_) { /* ignore */ }
            const pgSt =
              typeof getListPageState === 'function'
                ? getListPageState(location.href, document)
                : null;
            const pgBit = pgSt
              ? pgSt.known && pgSt.index >= 0
                ? '列表第 ' + (pgSt.index + 1) + ' 页'
                : pgSt.isFirst
                  ? '列表第 1 页'
                  : '列表深页（游标）'
              : '列表第 ' + (Math.max(0, getCurrentListPageIndex()) + 1) + ' 页';
            showToast(
              '已设断点' + (bpPosted ? ' · ' + bpPosted : '') + ' · ' + pgBit
            );
            // 刷新本页作品工具条状态
            document.querySelectorAll('.exc-gl-item.is-exc-breakpoint').forEach((n) => {
              n.classList.remove('is-exc-breakpoint');
            });
            el.classList.add('is-exc-breakpoint');
            await enhanceListItemForce(el);
            if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
            void refreshTrackingBarState();
            return;
          }
          if (act === 'drop' || act === 'block') {
            const next = !(work && work.blocked);
            await setWorkBlocked(edition.work_id, next);
            try {
              await setWorkStatus(edition.work_id, next ? 'dropped' : 'none');
            } catch (_) { /* ignore */ }
          } else if (act === 'best') {
            await openBestEdition(edition.work_id);
            return;
          } else if (act === 'bind') {
            await openBindModal(edition);
            return;
          }
          await enhanceListItemForce(el);
          if (window.__excRefreshWorkbench) window.__excRefreshWorkbench();
        } catch (err) {
          showToast('操作失败: ' + ((err && err.message) || err));
        }
      };
    }

    const legacy = el.querySelector('.exc-enhance-host');
    if (legacy) legacy.remove();

    // 点开：记追更上下文、乐观跟断点、立即已点
    if (el.dataset.excTrackOpenBound !== '1') {
      el.dataset.excTrackOpenBound = '1';
      el.addEventListener(
        'click',
        (ev) => {
          const a = ev.target && ev.target.closest && ev.target.closest('a[href*="/g/"]');
          if (!a) return;
          if (
            ev.target.closest &&
            ev.target.closest('.exc-tool-bar, .exc-meta-overlay, [data-exc-act], [data-exc-meta]')
          ) {
            return;
          }
          try {
            const gid = el.dataset.excGid || '';
            // 立即「已点」渲染（新标签打开时列表页还在）
            if (gid && typeof markGallerySeen === 'function') {
              markGallerySeen(gid);
              el.classList.add('is-exc-seen');
            }

            const tid = el.dataset.excTrackId || '';
            if (!tid) return;
            const st =
              typeof getListPageState === 'function'
                ? getListPageState(location.href, document)
                : null;
            let listIndex = -1;
            let pageLen = 0;
            try {
              const gids =
                typeof extractOrderedGidsFromDocument === 'function'
                  ? extractOrderedGidsFromDocument(document)
                  : [];
              pageLen = gids.length || 0;
              listIndex = gid && gids.length ? gids.indexOf(String(gid)) : -1;
            } catch (_) { /* ignore */ }
            let pageIndex = st && st.known ? st.index : -1;
            if (!(pageIndex >= 0) || (st && st.isFirst === false && !(pageIndex > 0))) {
              const lp = parseInt(el.dataset.excTrackLastPage || '', 10);
              if (Number.isFinite(lp) && lp > 0) pageIndex = lp;
            }
            try {
              const depthKey = 'exc_trk_depth_' + tid;
              const urlKey = 'exc_trk_url_' + tid;
              if (st && st.isFirst) {
                sessionStorage.setItem(depthKey, '0');
                sessionStorage.setItem(urlKey, location.href.split('#')[0]);
                pageIndex = 0;
              } else if (pageIndex > 0) {
                sessionStorage.setItem(depthKey, String(pageIndex));
                sessionStorage.setItem(urlKey, location.href.split('#')[0]);
              } else {
                const prevUrl = sessionStorage.getItem(urlKey) || '';
                const curUrl = location.href.split('#')[0];
                let depth = parseInt(sessionStorage.getItem(depthKey) || '-1', 10);
                if (prevUrl && curUrl !== prevUrl && /[?&](next|prev)=/i.test(curUrl)) {
                  depth = (Number.isFinite(depth) && depth >= 0 ? depth : 0) + 1;
                  sessionStorage.setItem(depthKey, String(depth));
                }
                sessionStorage.setItem(urlKey, curUrl);
                if (!(pageIndex > 0) && Number.isFinite(depth) && depth > 0) pageIndex = depth;
              }
            } catch (_) { /* ignore */ }

            const postedAt =
              Number(edition.posted_at) ||
              Number(partial.posted_at) ||
              (typeof extractListItemPostedAt === 'function'
                ? extractListItemPostedAt(el, gid)
                : 0) ||
              0;
            const pending = {
              trackingId: tid,
              gid: gid,
              token: el.dataset.excToken || edition.token || '',
              title: compactText(
                edition.title_raw || partial.title_raw || edition.title || partial.title || ''
              ),
              posted_at: postedAt,
              listUrl: location.href,
              pageIndex: pageIndex,
              pageMode: (st && st.mode) || '',
              listIndex: listIndex,
              pageLen: pageLen,
            };
            if (typeof setPendingTrackingOpen === 'function') {
              setPendingTrackingOpen(pending);
            }
            // 列表侧乐观跟断点（新标签时画廊页也会再跑一遍，幂等）
            void maybeAutoAdvanceTrackingBreakpoint(
              {
                gid: gid,
                token: pending.token,
                posted_at: postedAt,
                title_raw: pending.title,
              },
              partial,
              { pending: pending, skipUnreadScan: true }
            ).then((advanced) => {
              if (!advanced) return;
              // 更新本页断点高亮
              document.querySelectorAll('.exc-gl-item.is-exc-breakpoint').forEach((n) => {
                n.classList.remove('is-exc-breakpoint');
                const btn = n.querySelector('[data-exc-act="breakpoint"]');
                if (btn) btn.classList.remove('is-on', 'is-bp');
              });
              el.classList.add('is-exc-breakpoint');
              const bpBtn = el.querySelector('[data-exc-act="breakpoint"]');
              if (bpBtn) bpBtn.classList.add('is-on', 'is-bp');
              if (typeof refreshTrackingBarState === 'function') void refreshTrackingBarState();
            });
          } catch (_) { /* ignore */ }
        },
        true
      );
    }

    return { el, edition, work, lib, coverHost };
  }

  async function enhanceListItemForce(el) {
    el.dataset.excEnhanced = '';
    el.classList.remove(
      'is-exc-blocked',
      'exc-hide',
      'is-exc-fav',
      'is-exc-lib',
      'is-exc-seen',
      'is-exc-breakpoint',
      'is-exc-folded-child'
    );
    return enhanceListItem(el);
  }

  async function openBestEdition(workId) {
    const editions = await listEditionsByWork(workId);
    const best = pickBestEdition(editions, config);
    if (!best) {
      const works = await idbGet(STORE_WORKS, workId);
      if (works) {
        const sample = editions[0];
        if (sample) {
          const lib = await resolveLibraryState(sample);
          const arc = (lib.work_archives || lib.exact_archives || [])[0];
          if (arc) {
            const u = buildLrrReaderUrl(arc.arcid);
            if (u) {
              window.open(u, '_blank');
              return;
            }
          }
        }
      }
      showToast('暂无可用版本');
      return;
    }
    const url = best.url || buildGalleryUrl(location.origin, best.gid, best.token);
    if (config.open_best_in_new_tab) window.open(url, '_blank');
    else location.href = url;
  }

  function describePrimaryEdition(ed) {
    if (!ed) return '';
    const bits = [];
    if (ed.language) bits.push(ed.language);
    if (ed.censor_tier && ed.censor_tier !== 'unknown') bits.push(ed.censor_tier);
    if (ed.group) bits.push(ed.group);
    if (ed.pages) bits.push(ed.pages + 'p');
    if (ed.size_bytes) bits.push(formatBytes(ed.size_bytes));
    return bits.join(' · ') || '偏好最佳';
  }

  function getFoldPrimaryMode() {
    const m = config.fold_primary_mode || 'preference';
    return FOLD_PRIMARY_MODES[m] ? m : 'preference';
  }

  function getFoldPrimaryModeLabel(mode) {
    return FOLD_PRIMARY_MODES[mode] || FOLD_PRIMARY_MODES.preference;
  }

  function rankFoldGroup(list) {
    const mode = getFoldPrimaryMode();
    const arr = list.slice();
    arr.forEach((item, idx) => {
      item._listIndex = idx;
    });
    if (mode === 'newest') {
      arr.sort((a, b) => {
        const ta = Number(a.edition && a.edition.posted_at) || 0;
        const tb = Number(b.edition && b.edition.posted_at) || 0;
        if (tb !== ta) return tb - ta;
        return (a._listIndex || 0) - (b._listIndex || 0);
      });
    } else if (mode === 'list_order') {
      arr.sort((a, b) => (a._listIndex || 0) - (b._listIndex || 0));
    } else {
      arr.sort((a, b) => scoreEdition(b.edition, config) - scoreEdition(a.edition, config));
    }
    return arr;
  }

  function applyWorkFold(enhanced) {
    for (const item of enhanced || []) {
      if (!item || !item.el) continue;
      item.el.classList.remove('is-exc-folded-child');
      const old = item.el.querySelector('.exc-fold-tag');
      if (old) old.remove();
    }
    if (!config.list_fold_works) return;
    const groups = new Map();
    for (const item of enhanced) {
      if (!item || !item.edition || !item.edition.work_id) continue;
      const wid = item.edition.work_id;
      if (!groups.has(wid)) groups.set(wid, []);
      groups.get(wid).push(item);
    }
    const mode = getFoldPrimaryMode();
    const modeLabel = getFoldPrimaryModeLabel(mode);

    for (const [, list] of groups) {
      if (list.length < 2) continue;
      const ranked = rankFoldGroup(list);
      const primary = ranked[0];
      ranked.slice(1).forEach((x) => x.el.classList.add('is-exc-folded-child'));

      const hidden = ranked.length - 1;
      let badgeBox =
        (primary.coverHost && primary.coverHost.querySelector('.exc-badge-container')) ||
        primary.el.querySelector('.exc-badge-container');
      if (!badgeBox && primary.coverHost) {
        badgeBox = document.createElement('div');
        badgeBox.className = 'exc-badge-container';
        primary.coverHost.appendChild(badgeBox);
      }
      if (!badgeBox) continue;

      let overlay = badgeBox.querySelector('.exc-meta-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'exc-meta-overlay';
        badgeBox.appendChild(overlay);
      }

      let tag = overlay.querySelector('.exc-fold-tag');
      if (!tag) {
        tag = document.createElement('button');
        tag.type = 'button';
        tag.className = 'meta-tag more exc-fold-tag';
        overlay.appendChild(tag);
      }
      const tip =
        '同作 ' +
        ranked.length +
        ' 个版本\n主显示：' +
        describePrimaryEdition(primary.edition) +
        '\n规则：' +
        modeLabel +
        '\n（工作台 ⚙ 偏好可改）\n点击展开/收起其余 ' +
        hidden +
        ' 个';
      tag.title = tip;
      tag.setAttribute('aria-label', tip);
      tag.textContent = '×' + ranked.length;
      tag.dataset.open = '0';
      tag.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const open = tag.dataset.open === '1';
        tag.dataset.open = open ? '0' : '1';
        ranked.slice(1).forEach((x) => {
          x.el.classList.toggle('is-exc-folded-child', open);
        });
        tag.textContent = open ? '×' + ranked.length : '收起';
        tag.classList.toggle('hot', !open);
      };
    }
  }
