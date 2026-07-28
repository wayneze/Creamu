
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

  function getGdataFailureMessage(error, fallback) {
    const value = error && (error.message || error.error || error.statusText || error);
    return compactText(value || fallback || 'gdata request failed').slice(0, 300);
  }

  function createGalleryGdataRecord(meta, requested, checkedAt) {
    const source = meta || {};
    const fallback = requested || {};
    const gid = compactText(source.gid || fallback.gid || '');
    if (!gid) return null;
    const token = compactText(source.token || fallback.token || '').toLowerCase();
    const error = compactText(source.error || '');
    const expunged = hasEditionExpungedFlag(source.expunged);
    if (error) {
      return {
        gid,
        token,
        availability_status: 'unavailable',
        availability_checked_at: checkedAt,
        availability_reason: error,
        availability_error: '',
        expunged: 0,
      };
    }

    const sec = Number(source.posted);
    const pages = Number(source.filecount) || 0;
    const size_bytes = Number(source.filesize) || 0;
    const tags = Array.isArray(source.tags) ? source.tags.map(String) : [];
    const title = compactText(source.title || source.title_jpn || '');
    const language = detectLanguageFromText(title, tags);
    const censor_tier = detectCensorTier(title, tags);
    const group = extractGroupFromTitle(title) || extractGroupsFromTags(tags)[0] || '';
    return {
      gid,
      token,
      posted_at: Number.isFinite(sec) && sec > 0 ? Math.round(sec * 1000) : 0,
      pages,
      size_bytes,
      tags,
      title_raw: title,
      language,
      censor_tier,
      group,
      uploader: compactText(source.uploader || ''),
      availability_status: expunged ? 'expunged' : 'active',
      availability_checked_at: checkedAt,
      availability_reason: expunged
        ? compactText(source.expunged_reason || '站点标记为已清退')
        : '',
      availability_error: '',
      expunged: expunged ? 1 : 0,
    };
  }

  /**
   * EH 官方 gdata 批量结果。接口失败仅记录在 errors，不推断作品不可访问。
   * @param {{gid:string|number,token:string}[]} pairs
   * @param {object} [options]
   * @param {Function} [options.shouldContinue]
   * @param {Function} [options.onProgress]
   */
  async function fetchGalleryGdataBatchDetailed(pairs, options) {
    options = options || {};
    const shouldContinue =
      typeof options.shouldContinue === 'function' ? options.shouldContinue : () => true;
    const records = Object.create(null);
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
    const result = {
      records,
      requestedCount: uniq.length,
      successfulBatches: 0,
      failedBatches: 0,
      errors: [],
      cancelled: false,
    };
    if (!uniq.length) return result;
    const api = getEhGdataApiUrl();
    for (let off = 0; off < uniq.length; off += 25) {
      if (!shouldContinue()) {
        result.cancelled = true;
        break;
      }
      const chunk = uniq.slice(off, off + 25);
      const gidlist = chunk.map((x) => [Number(x.gid), x.token]);
      let res;
      try {
        res = await gmRequest({
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
      } catch (error) {
        result.failedBatches += 1;
        result.errors.push({
          type: 'network',
          gids: chunk.map((item) => item.gid),
          message: getGdataFailureMessage(error, 'gdata network failure'),
        });
        if (typeof options.onProgress === 'function') {
          try {
            options.onProgress(result);
          } catch (_) { /* ignore */ }
        }
        continue;
      }

      try {
        let body = res && (res.responseText || res.response);
        if (typeof body === 'string') {
          if (!body.trim()) throw new Error('gdata response is empty');
          body = JSON.parse(body);
        }
        const arr = body && body.gmetadata;
        if (!Array.isArray(arr)) throw new Error('gdata response has no gmetadata array');
        const requestedByGid = new Map(chunk.map((item) => [String(item.gid), item]));
        const checkedAt = nowMs();
        for (let j = 0; j < arr.length; j++) {
          const meta = arr[j];
          if (!meta) continue;
          let gid = compactText(meta.gid || '');
          if (!gid && arr.length === 1 && chunk.length === 1) gid = chunk[0].gid;
          const record = createGalleryGdataRecord(
            Object.assign({}, meta, { gid }),
            requestedByGid.get(String(gid)) || null,
            checkedAt
          );
          if (record) records[record.gid] = record;
        }
        result.successfulBatches += 1;
      } catch (error) {
        result.failedBatches += 1;
        result.errors.push({
          type: 'response',
          gids: chunk.map((item) => item.gid),
          message: getGdataFailureMessage(error, 'invalid gdata response'),
        });
      }
      if (typeof options.onProgress === 'function') {
        try {
          options.onProgress(result);
        } catch (_) { /* ignore */ }
      }
    }
    return result;
  }

  /** gid → meta 的兼容入口。 */
  async function fetchGalleryGdataBatch(pairs, options) {
    const detail = await fetchGalleryGdataBatchDetailed(pairs, options);
    return detail.records;
  }

  async function checkEditionAvailabilityBatch(editions, options) {
    options = options || {};
    const input = Array.from(editions || []).filter((edition) => {
      return edition && compactText(edition.gid || '') && compactText(edition.token || '');
    });
    const detail = await fetchGalleryGdataBatchDetailed(
      input.map((edition) => ({ gid: edition.gid, token: edition.token })),
      options
    );
    const writes = new Map();
    for (let i = 0; i < input.length; i++) {
      const edition = input[i];
      const meta = detail.records[String(edition.gid)];
      if (!meta) continue;
      const merged = mergeEditionRecord(Object.assign({}, edition, meta), edition).merged;
      writes.set(merged.id, merged);
      Object.assign(edition, merged);
    }

    const failureByGid = new Map();
    for (let i = 0; i < detail.errors.length; i++) {
      const failure = detail.errors[i];
      for (let j = 0; j < (failure.gids || []).length; j++) {
        failureByGid.set(String(failure.gids[j]), failure.message);
      }
    }
    const failedWrites = new Map();
    for (let i = 0; i < input.length; i++) {
      const edition = input[i];
      const id = edition.id || makeEditionId(edition.gid, edition.token);
      if (writes.has(id)) continue;
      const error = failureByGid.get(String(edition.gid));
      if (!error) continue;
      if (compactText(edition.availability_error || '') === error) continue;
      const status = normalizeEditionAvailabilityStatus(
        edition.availability_status,
        edition.expunged
      );
      const failedEdition = Object.assign({}, edition, {
        id,
        availability_status: status,
        availability_error: error,
        expunged: status === 'expunged' ? 1 : 0,
        updated_at: nowMs(),
      });
      failedWrites.set(id, failedEdition);
      Object.assign(edition, failedEdition);
    }

    const updatedEditions = Array.from(writes.values());
    const failedEditions = Array.from(failedWrites.values());
    const saved = updatedEditions.concat(failedEditions);
    if (saved.length && options.persist !== false) {
      await idbPutBatches({ [STORE_EDITIONS]: saved });
    }
    return Object.assign({}, detail, {
      editions: updatedEditions,
      failedEditions,
      updatedCount: updatedEditions.length,
      errorUpdatedCount: failedEditions.length,
    });
  }

  /** gdata 仅取 posted（兼容旧调用） */
  async function fetchGalleryMetaPostedMs(gid, token) {
    const map = await fetchGalleryGdataBatch([{ gid: gid, token: token }]);
    const g = compactText(gid || '');
    return (map && map[g] && map[g].posted_at) || 0;
  }

  /** @param {{gid:string|number,token:string}[]} pairs */
  async function fetchGalleryMetaPostedBatch(pairs, options) {
    const full = await fetchGalleryGdataBatch(pairs, options);
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

  async function lookupEditionPostedByGids(gids) {
    const keys = Array.from(
      new Set((gids || []).map((gid) => compactText(gid || '')).filter(Boolean))
    );
    const out = new Map();
    if (!keys.length) return out;
    try {
      const d = await openDb();
      const transaction = d.transaction(STORE_EDITIONS, 'readonly');
      const index = transaction.objectStore(STORE_EDITIONS).index('gid');
      const pending = [];
      keys.forEach((gid) => {
        pending.push(idbReq(index.getAll(gid)).then((rows) => [gid, rows || []]));
        if (/^\d+$/.test(gid)) {
          pending.push(idbReq(index.getAll(Number(gid))).then((rows) => [gid, rows || []]));
        }
      });
      const groups = await Promise.all(pending);
      groups.forEach(([gid, rows]) => {
        let best = Number(out.get(gid)) || 0;
        rows.forEach((row) => {
          const posted = Number(row && row.posted_at) || 0;
          if (posted > best) best = posted;
        });
        if (best) out.set(gid, best);
      });
    } catch (_) { /* ignore */ }
    return out;
  }

  /**
   * 补全追更记录的 top/断点发布时间。
   * 顺序：DOM → editions → gdata（需 token）。
   * @param {object} [opts]
   * @param {boolean} [opts.skipGdata]
   * @param {boolean} [opts.deferSave]
   */
  async function enrichTrackingPostedFields(rec, opts) {
    if (!rec) return rec;
    opts = opts || {};
    let dirty = false;
    if (rec.top_gid && !(Number(rec.top_posted_at) > 0)) {
      let p = lookupDomPostedByGid(rec.top_gid);
      if (!p && opts.editionPostedByGid) {
        p = Number(opts.editionPostedByGid.get(compactText(rec.top_gid))) || 0;
      } else if (!p) p = await lookupEditionPostedByGid(rec.top_gid);
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
      if (!p && opts.editionPostedByGid) {
        p = Number(opts.editionPostedByGid.get(compactText(rec.breakpoint_gid))) || 0;
      } else if (!p) p = await lookupEditionPostedByGid(rec.breakpoint_gid);
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
    if (dirty && !opts.deferSave) {
      try {
        await saveTrackingRecord(rec);
      } catch (_) { /* ignore */ }
    }
    return rec;
  }

  /** 批量补全列表里缺失的发布时间（gdata 每批最多 25） */
  async function enrichTrackingListPosted(list, options) {
    options = options || {};
    const shouldContinue =
      typeof options.shouldContinue === 'function' ? options.shouldContinue : () => true;
    const rows = list || [];
    const need = [];
    const dirtyRecords = new Map();
    const missingGids = [];
    rows.forEach((rec) => {
      if (!rec) return;
      if (rec.top_gid && !(Number(rec.top_posted_at) > 0)) missingGids.push(rec.top_gid);
      if (rec.breakpoint_gid && !(Number(rec.breakpoint_posted_at) > 0)) {
        missingGids.push(rec.breakpoint_gid);
      }
    });
    if (!shouldContinue()) return rows;
    const editionPostedByGid = await lookupEditionPostedByGids(missingGids);
    if (!shouldContinue()) return rows;
    for (let i = 0; i < rows.length; i++) {
      if (!shouldContinue()) break;
      const rec = rows[i];
      if (!rec) continue;
      const previousTopPosted = Number(rec.top_posted_at) || 0;
      const previousBreakpointPosted = Number(rec.breakpoint_posted_at) || 0;
      await enrichTrackingPostedFields(rec, {
        skipGdata: true,
        deferSave: true,
        editionPostedByGid,
      });
      if (
        (Number(rec.top_posted_at) || 0) !== previousTopPosted ||
        (Number(rec.breakpoint_posted_at) || 0) !== previousBreakpointPosted
      ) {
        dirtyRecords.set(rec.id || rec, rec);
      }
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
    if (need.length && shouldContinue()) {
      const pairs = need.map((x) => ({ gid: x.gid, token: x.token }));
      const map = await fetchGalleryMetaPostedBatch(pairs, { shouldContinue });
      for (let j = 0; j < need.length; j++) {
        const item = need[j];
        const ms = map[compactText(item.gid)] || 0;
        if (!ms) continue;
        if (item.field === 'top' && !(Number(item.rec.top_posted_at) > 0)) {
          item.rec.top_posted_at = ms;
          dirtyRecords.set(item.rec.id || item.rec, item.rec);
        }
        if (item.field === 'bp' && !(Number(item.rec.breakpoint_posted_at) > 0)) {
          item.rec.breakpoint_posted_at = ms;
          dirtyRecords.set(item.rec.id || item.rec, item.rec);
        }
      }
    }
    const saves = Array.from(dirtyRecords.values());
    if (saves.length) {
      try {
        await saveTrackingRecords(saves);
      } catch (_) {
        for (let k = 0; k < saves.length; k++) {
          try {
            await saveTrackingRecord(saves[k]);
          } catch (_) { /* ignore */ }
        }
      }
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
