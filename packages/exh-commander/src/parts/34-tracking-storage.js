
  async function listTrackingSearches(preloadedRows) {
    const all = Array.isArray(preloadedRows)
      ? preloadedRows
      : await idbGetAll(STORE_TRACKING);
    const live = (all || []).filter((r) => !r.archived);
    // 同 site + 同搜索词的历史重复项：列表时合并（保留有断点/较新的）
    const byKey = new Map();
    const orphans = [];
    for (const r of live) {
      const site = r.site || '';
      const fs = trackingFSearchKey(r.f_search || r.label || '');
      if (!fs) {
        orphans.push(r);
        continue;
      }
      const key = site + '\0' + fs;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, r);
        continue;
      }
      // 选保留者
      const prevBp = prev.breakpoint_gid ? 1 : 0;
      const curBp = r.breakpoint_gid ? 1 : 0;
      let keep = prev;
      let drop = r;
      if (curBp > prevBp || (curBp === prevBp && (r.updated_at || 0) > (prev.updated_at || 0))) {
        keep = r;
        drop = prev;
      }
      if (typeof mergeTrackingRecord === 'function') {
        const merged = mergeTrackingRecord(keep, drop);
        Object.assign(keep, merged);
        keep.id = keep.id || merged.id;
      }
      byKey.set(key, keep);
      if (drop && drop.id && drop.id !== keep.id) {
        try {
          await idbDelete(STORE_TRACKING, drop.id);
        } catch (_) { /* ignore */ }
      }
      try {
        await idbPut(STORE_TRACKING, keep);
      } catch (_) { /* ignore */ }
    }
    const out = orphans.concat([...byKey.values()]);
    return out.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  }

  async function getTrackingBySignature(sig) {
    if (!sig) return null;
    const rows = await idbIndexGetAll(STORE_TRACKING, 'query_signature', sig);
    return (rows || []).find((r) => !r.archived) || null;
  }

  async function loadTrackingRowsForContext(sig) {
    const d = await openDb();
    const tx = d.transaction(STORE_TRACKING, 'readonly');
    const store = tx.objectStore(STORE_TRACKING);
    return new Promise((resolve, reject) => {
      let result = null;
      tx.oncomplete = () => resolve(result || { exact: null, rows: [] });
      tx.onerror = () => reject(tx.error || new Error('tracking lookup failed'));
      tx.onabort = () => reject(tx.error || new Error('tracking lookup aborted'));

      const exactRequest = store.index('query_signature').getAll(sig);
      exactRequest.onsuccess = () => {
        const exact = (exactRequest.result || []).find((record) => !record.archived) || null;
        if (exact) {
          result = { exact, rows: null };
          return;
        }
        const allRequest = store.getAll();
        allRequest.onsuccess = () => {
          result = { exact: null, rows: allRequest.result || [] };
        };
      };
    });
  }

  function trackingFSearchKey(s) {
    if (typeof normalizeTrackingFSearch === 'function') return normalizeTrackingFSearch(s);
    return compactText(s)
      .toLowerCase()
      .replace(/[＋+]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * 按上下文找追更：先精确签名，再按 site+f_search 软匹配（吞掉旧版噪声签名重复）。
   * 若命中多条重复，合并进一条并删其余。
   */
  async function findTrackingForContext(context, preloadedRecords) {
    if (!context) return null;
    const sig = context.query_signature || '';
    const hasPreloadedRecords = Array.isArray(preloadedRecords);
    let all = hasPreloadedRecords ? preloadedRecords : null;
    if (sig) {
      let exact = null;
      if (hasPreloadedRecords) {
        exact = preloadedRecords.find(
          (record) => record && !record.archived && record.query_signature === sig
        ) || null;
      } else {
        const loaded = await loadTrackingRowsForContext(sig);
        exact = loaded.exact;
        if (!exact) all = await listTrackingSearches(loaded.rows);
      }
      if (exact) return exact;
    }
    if (!all) all = await listTrackingSearches();
    if (!all.length) return null;
    const site = context.site || '';
    const fs = trackingFSearchKey(context.f_search || '');
    const labelKey = trackingFSearchKey(context.label || '');
    const hits = all.filter((r) => {
      if (r.archived) return false;
      if (site && r.site && r.site !== site) return false;
      if (sig && r.query_signature === sig) return true;
      const rfs = trackingFSearchKey(r.f_search || '');
      if (fs && rfs && fs === rfs) return true;
      // 旧签名把 f_search 嵌在中间段
      if (fs && r.query_signature && String(r.query_signature).toLowerCase().indexOf(fs) >= 0) return true;
      const rl = trackingFSearchKey(r.label || r.custom_label || '');
      if (labelKey && rl && labelKey === rl && fs) return true;
      return false;
    });
    if (!hits.length) return null;
    if (hits.length === 1) {
      const one = hits[0];
      // 迁移到新签名 / 首页 open_url
      let dirty = false;
      if (sig && one.query_signature !== sig) {
        one.query_signature = sig;
        dirty = true;
      }
      if (context.open_url) {
        const canon =
          typeof canonicalizeTrackingOpenUrl === 'function'
            ? canonicalizeTrackingOpenUrl(context.open_url)
            : context.open_url;
        if (one.open_url !== canon) {
          one.open_url = canon;
          one.page_url = canon;
          dirty = true;
        }
      }
      if (dirty) await saveTrackingRecord(one);
      return one;
    }
    // 多条重复：保留「有断点 / 最近浏览」优先者，合并字段后删其余
    hits.sort((a, b) => {
      const bpA = a.breakpoint_gid ? 1 : 0;
      const bpB = b.breakpoint_gid ? 1 : 0;
      if (bpA !== bpB) return bpB - bpA;
      return (b.last_browsed_at || b.updated_at || 0) - (a.last_browsed_at || a.updated_at || 0);
    });
    const keep = hits[0];
    for (let i = 1; i < hits.length; i++) {
      const other = hits[i];
      if (typeof mergeTrackingRecord === 'function') {
        const merged = mergeTrackingRecord(keep, other);
        Object.assign(keep, merged);
      } else {
        if (!keep.breakpoint_gid && other.breakpoint_gid) {
          keep.breakpoint_gid = other.breakpoint_gid;
          keep.breakpoint_token = other.breakpoint_token;
          keep.breakpoint_title = other.breakpoint_title;
          keep.breakpoint_page = other.breakpoint_page;
          keep.breakpoint_url = other.breakpoint_url;
          keep.breakpoint_posted_at = other.breakpoint_posted_at;
        }
        if (!keep.top_gid && other.top_gid) {
          keep.top_gid = other.top_gid;
          keep.top_token = other.top_token;
          keep.top_title = other.top_title;
          keep.top_posted_at = other.top_posted_at;
        }
        // 未读跟较新断点，禁止 max 粘住旧大数
        const ka = Number(keep.breakpoint_at) || 0;
        const oa = Number(other.breakpoint_at) || 0;
        if (oa > ka && other.unread_estimate != null) {
          keep.unread_estimate = Number(other.unread_estimate) || 0;
          keep.unread_estimate_capped = other.unread_estimate_capped ? 1 : 0;
        }
        if (other.has_update) keep.has_update = 1;
      }
      try {
        await deleteTrackingRecord(other.id);
      } catch (_) { /* ignore */ }
    }
    if (sig) keep.query_signature = sig;
    if (context.open_url) {
      const canon =
        typeof canonicalizeTrackingOpenUrl === 'function'
          ? canonicalizeTrackingOpenUrl(context.open_url)
          : context.open_url;
      keep.open_url = canon;
      keep.page_url = canon;
    }
    if (context.f_search) keep.f_search = context.f_search;
    if (context.label) keep.label = context.label;
    await saveTrackingRecord(keep);
    return keep;
  }

  async function saveTrackingRecords(records) {
    const rows = (records || []).filter(Boolean).map((record) => {
      const row = Object.assign({}, record, { updated_at: nowMs() });
      if (!row.id) row.id = uid('trk');
      if (!row.created_at) row.created_at = nowMs();
      return row;
    });
    if (!rows.length) return rows;
    await idbPutBatches({ [STORE_TRACKING]: rows });
    return rows;
  }

  async function saveTrackingRecord(record) {
    return (await saveTrackingRecords([record]))[0];
  }

  async function deleteTrackingRecord(id) {
    if (!id) return;
    await idbDelete(STORE_TRACKING, id);
  }

  async function upsertTrackingFromContext(context, options = {}) {
    if (!context || !context.query_signature) throw new Error('无法识别当前页为可收藏搜索');
    const openCanon =
      typeof canonicalizeTrackingOpenUrl === 'function'
        ? canonicalizeTrackingOpenUrl(context.open_url || context.page_url || location.href)
        : context.open_url || context.page_url || location.href;
    context.open_url = openCanon;
    context.page_url = openCanon;

    let existing = null;
    if (!options.forceNew) {
      existing =
        typeof findTrackingForContext === 'function'
          ? await findTrackingForContext(context)
          : await getTrackingBySignature(context.query_signature);
    }
    if (existing && !options.forceNew) {
      existing.query_signature = context.query_signature || existing.query_signature;
      existing.open_url = openCanon;
      existing.page_url = openCanon;
      existing.label = context.label || existing.label;
      existing.group_type = context.group_type || existing.group_type;
      existing.f_search = context.f_search || existing.f_search;
      existing.namespace = context.namespace || existing.namespace;
      existing.tag_name = context.tag_name || existing.tag_name;
      if (context.site) existing.site = context.site;
      if (context.favcat != null && context.favcat !== '') existing.favcat = context.favcat;
      if (context.favcat_label) existing.favcat_label = context.favcat_label;
      existing.last_browsed_at = nowMs();
      // 仅首页上下文才更新 top（深页 top_gid 为空）
      if (context.top_gid) {
        if (existing.top_gid && existing.top_gid !== context.top_gid) {
          existing.has_update = 1;
          existing.prev_top_gid = existing.top_gid;
        }
        existing.top_gid = context.top_gid;
        if (context.top_token) existing.top_token = compactText(context.top_token);
        if (context.top_title) existing.top_title = compactText(context.top_title).slice(0, 160);
        if (context.top_posted_at) existing.top_posted_at = Number(context.top_posted_at) || 0;
      }
      if (context.top_cover) applyTrackingCoverFields(existing, context.top_cover);
      return saveTrackingRecord(existing);
    }
    const created = {
      id: uid('trk'),
      query_signature: context.query_signature,
      group_type: context.group_type || 'other',
      label: context.label || context.f_search || '未命名搜索',
      custom_label: '',
      custom_folder: '',
      note: '',
      open_url: openCanon,
      page_url: openCanon,
      f_search: context.f_search || '',
      namespace: context.namespace || '',
      tag_name: context.tag_name || '',
      favcat: context.favcat || '',
      favcat_label: context.favcat_label || '',
      site: context.site || '',
      top_gid: context.top_gid || '',
      top_token: context.top_token || '',
      top_title: context.top_title || '',
      top_posted_at: Number(context.top_posted_at) || 0,
      top_cover: '',
      cover_url: '',
      has_update: 0,
      unread_estimate: 0,
      unread_estimate_capped: 0,
      unread_estimate_source: '',
      archived: 0,
      last_check_at: nowMs(),
      last_browsed_at: nowMs(),
      created_at: nowMs(),
    };
    if (context.top_cover) applyTrackingCoverFields(created, context.top_cover);
    return saveTrackingRecord(created);
  }

  /**
   * ExH 列表分组：以手动「设分类」为主。
   * 自由词搜索很难自动分得准，故不再按 artist/search/favorites 等自动拆组；
   * 无 custom_folder 的一律进「未分类」。
   */
  function getTrackingListGroupKey(r) {
    if (!r) return 'none';
    const folder = compactText(r.custom_folder || '');
    if (folder) return 'uf:' + folder.toLowerCase();
    return 'none';
  }

  function getTrackingListGroupLabel(key, sample) {
    if (!key || key === 'none') return '未分类';
    if (key.indexOf('uf:') === 0) {
      return compactText((sample && sample.custom_folder) || key.slice(3)) || '自定义';
    }
    // 兼容旧 session 筛选键
    if (key.indexOf('fav:') === 0) {
      const cat = key.slice(4);
      const name =
        compactText((sample && sample.favcat_label) || '') ||
        (cat === 'all' ? '全部' : '夹 ' + cat);
      return '收藏 · ' + name;
    }
    if (key.indexOf('g:') === 0) {
      return getTrackingGroupLabel(key.slice(2) || 'other');
    }
    return getTrackingGroupLabel((sample && sample.group_type) || key);
  }

  /** 卡片左侧 monogram（对齐 JLC 封面位） */
  function getTrackingGroupMonogram(groupType) {
    const map = {
      artist: '画',
      group: '社',
      parody: '原',
      character: '角',
      female: '女',
      male: '男',
      tag: '标',
      category: '类',
      uploader: '传',
      search: '搜',
      favorites: '藏',
      folder: '夹',
      other: '追',
    };
    return map[String(groupType || '').toLowerCase()] || '追';
  }

  function getTrackingCardGroupType(record) {
    if (!record) return 'other';
    if (compactText(record.custom_folder || '')) return 'folder';
    return record.group_type || 'other';
  }

  /** 封面 URL 优先级：列表顶封面 > 通用封面（对齐 JLC） */
  function getTrackingDisplayCoverUrl(record) {
    return compactText((record && (record.top_cover || record.cover_url)) || '');
  }

  function applyTrackingCoverFields(record, coverUrl) {
    if (!record) return record;
    const c = compactText(coverUrl || '');
    if (!c || /^data:/i.test(c)) return record;
    if (/placeholder|blank\.|spacer|1x1|loading\.gif|transparent/i.test(c)) return record;
    record.top_cover = c;
    record.cover_url = c;
    return record;
  }

  function buildTrackingCoverHtml(record) {
    const gt = getTrackingCardGroupType(record);
    const mono = getTrackingGroupMonogram(gt === 'folder' ? 'folder' : gt);
    const coverUrl = getTrackingDisplayCoverUrl(record);
    if (coverUrl) {
      return (
        '<div class="jlc-wb-cover is-poster" data-group="' +
        escapeHtml(gt) +
        '">' +
        '<img src="' +
        escapeHtml(coverUrl) +
        '" alt="" loading="lazy" referrerpolicy="no-referrer" draggable="false"' +
        ' onerror="this.style.display=\'none\';var f=this.nextElementSibling;if(f)f.hidden=false;">' +
        '<span class="jlc-wb-cover-fallback" hidden>' +
        escapeHtml(mono) +
        '</span></div>'
      );
    }
    return (
      '<div class="jlc-wb-cover is-mono" data-group="' +
      escapeHtml(gt) +
      '"><span class="jlc-wb-cover-fallback">' +
      escapeHtml(mono) +
      '</span></div>'
    );
  }

  function getTrackingDisplayTitle(record) {
    if (!record) return '';
    let t = compactText(
      record.custom_label || record.label || record.f_search || record.query_signature || record.id
    );
    // 清掉历史脏后缀
    t = t.replace(/\s*·\s*分类过滤\s*$/i, '').trim();
    return t;
  }

  function shortTrackingWorkLabel(title, gid, maxLen) {
    maxLen = maxLen || 40;
    const tt = compactText(title || '');
    if (tt) return tt.length > maxLen ? tt.slice(0, maxLen) + '…' : tt;
    const g = compactText(gid || '');
    return g ? 'g' + g : '';
  }

  /** 作品发布时间短标签：YY-MM-DD HH:mm（对齐 EH 列表观感，远短于标题） */
  function formatTrackingPostedShort(ms) {
    const t = Number(ms) || 0;
    if (!t) return '';
    const d = new Date(t);
    if (!Number.isFinite(d.getTime()) || d.getTime() <= 0) return '';
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return yy + '-' + mm + '-' + dd + ' ' + hh + ':' + mi;
  }

  /**
   * 卡片「最新」展示：只显示发布时间（标题太长会挤爆）。
   * 无时间返回空串，由 UI 显示「—」，绝不回退长标题 / g####。
   */
  function getTrackingTopMetaLabel(record) {
    return formatTrackingPostedShort(record && record.top_posted_at);
  }

  /** 卡片「断点」展示：只显示发布时间 */
  function getTrackingBpMetaLabel(record) {
    return formatTrackingPostedShort(record && record.breakpoint_posted_at);
  }

  function getTrackingGroupLabel(type) {
    return TRACKING_GROUP_LABELS[type] || TRACKING_GROUP_LABELS.other;
  }
