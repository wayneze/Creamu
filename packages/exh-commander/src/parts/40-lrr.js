  let lrrSyncing = false;
  let lrrLastSync = 0;
  let lrrLastCount = 0;
  let lrrLastError = '';

  // 启动时恢复 LRR 同步状态
  {
    const m = loadLrrMeta();
    lrrLastSync = Number(m.last_sync) || 0;
    lrrLastCount = Number(m.last_count) || 0;
    lrrLastError = m.last_error || '';
  }

  function normalizeLrrBase(url) {
    return compactText(url).replace(/\/+$/, '');
  }

  function lrrConfigured() {
    return !!(normalizeLrrBase(config.lrr_base_url) && compactText(config.lrr_api_key));
  }

  function lrrHeaders() {
    const key = compactText(config.lrr_api_key);
    return {
      Authorization: key,
      Accept: 'application/json',
    };
  }

  async function lrrFetchJson(path) {
    const base = normalizeLrrBase(config.lrr_base_url);
    if (!base) throw new Error('LRR URL 未配置');
    const url = base + (path.startsWith('/') ? path : '/' + path);
    const res = await gmRequest({
      method: 'GET',
      url,
      headers: lrrHeaders(),
      timeout: 45000,
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error('LRR HTTP ' + res.status + (res.responseText ? ': ' + String(res.responseText).slice(0, 120) : ''));
    }
    const text = res.responseText || '';
    const data = safeJsonParse(text, null);
    if (data == null) throw new Error('LRR 返回非 JSON');
    return data;
  }

  function normalizeLrrArchiveList(data) {
    let list = [];
    if (Array.isArray(data)) list = data;
    else if (Array.isArray(data.data)) list = data.data;
    else if (Array.isArray(data.result)) list = data.result;
    else if (Array.isArray(data.archives)) list = data.archives;
    else if (data.data && Array.isArray(data.data.archives)) list = data.data.archives;
    else if (typeof data === 'object' && data !== null) {
      const values = Object.values(data);
      if (values.length && values.every((v) => v && typeof v === 'object' && (v.arcid || v.id || v.filename || v.title || v.tags != null))) {
        list = values.map((v, i) => {
          const key = Object.keys(data).find((k) => data[k] === v);
          return Object.assign({ arcid: v.arcid || v.id || key || String(i) }, v);
        });
      }
    }

    return list
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const arcid = item.arcid || item.id || item.archive_id || item.hash;
        if (!arcid) return null;
        let tags = item.tags;
        if (typeof tags === 'string') tags = tags.split(/,\s*/).map((t) => t.trim()).filter(Boolean);
        if (!Array.isArray(tags)) tags = [];
        return {
          arcid: String(arcid),
          title: item.title || item.filename || item.name || String(arcid),
          tags,
          size_bytes: Number(item.size) || Number(item.filesize) || Number(item.bytes) || 0,
          pages: Number(item.pagecount) || Number(item.pages) || 0,
        };
      })
      .filter(Boolean);
  }

  async function autoLinkAfterSync() {
    const editions = await idbGetAll(STORE_EDITIONS);
    const archives = await listArchives();
    let linked = 0;

    // P0 ehgid
    for (const a of archives) {
      if (!a.eh_gid) continue;
      const eds = (editions || []).filter((e) => String(e.gid) === String(a.eh_gid));
      for (const ed of eds) {
        const editionId = ed.id || makeEditionId(ed.gid, ed.token);
        const existing = (await findLinksForEdition(editionId)).filter((l) => l.arcid === a.arcid);
        if (existing.some((l) => l.negative)) continue;
        if (existing.some((l) => !l.negative)) continue;
        await putLink({
          work_id: ed.work_id || '',
          edition_id: editionId,
          arcid: a.arcid,
          confidence: 'high',
          source: 'ehgid',
          negative: 0,
        });
        linked++;
      }
    }

    // P1 structural (optional)
    if (config.auto_link_structural) {
      const thr = Number(config.structural_link_threshold) || 0.9;
      for (const ed of editions || []) {
        const editionId = ed.id || makeEditionId(ed.gid, ed.token);
        const hasExact = (await findLinksForEdition(editionId)).some((l) => !l.negative);
        if (hasExact) continue;
        let best = null;
        for (const a of archives) {
          const score = structuralMatchScore(ed, a);
          if (score >= thr && (!best || score > best.score)) best = { a, score };
        }
        if (!best) continue;
        const neg = (await listLinks()).some(
          (l) => l.negative && l.arcid === best.a.arcid && (l.edition_id === editionId || l.work_id === ed.work_id)
        );
        if (neg) continue;
        await putLink({
          work_id: ed.work_id || '',
          edition_id: editionId,
          arcid: best.a.arcid,
          confidence: 'structural',
          source: 'structural',
          negative: 0,
        });
        linked++;
      }
    }
    return linked;
  }

  async function syncLanraragi(options) {
    if (lrrSyncing) return { ok: false, error: '同步进行中' };
    if (!lrrConfigured()) {
      lrrLastError = '未配置 LRR';
      saveLrrMeta({ last_sync: lrrLastSync, last_count: lrrLastCount, last_error: lrrLastError });
      return { ok: false, error: lrrLastError };
    }
    lrrSyncing = true;
    lrrLastError = '';
    try {
      let data = null;
      const endpoints = ['/api/archives', '/api/archives/', '/api/search?filter='];
      let lastErr = null;
      for (const ep of endpoints) {
        try {
          data = await lrrFetchJson(ep);
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (data == null) throw lastErr || new Error('无法拉取 LRR 列表');

      const rows = normalizeLrrArchiveList(data);
      if (!options || options.replace !== false) {
        await clearArchives();
      }
      for (const row of rows) {
        await putArchive(row);
      }
      const autoLinked = await autoLinkAfterSync();
      const familiar = await rebuildFamiliarFromLrrArchives();

      lrrLastSync = nowMs();
      lrrLastCount = rows.length;
      lrrLastError = '';
      saveLrrMeta({
        last_sync: lrrLastSync,
        last_count: lrrLastCount,
        last_error: '',
        familiar_artists: familiar.artists,
        familiar_groups: familiar.groups,
      });
      return {
        ok: true,
        count: rows.length,
        linked: autoLinked,
        familiar_artists: familiar.artists.length,
        familiar_groups: familiar.groups.length,
      };
    } catch (err) {
      lrrLastError = (err && err.message) || String(err);
      saveLrrMeta({ last_sync: lrrLastSync, last_count: lrrLastCount, last_error: lrrLastError });
      return { ok: false, error: lrrLastError };
    } finally {
      lrrSyncing = false;
    }
  }

  /** 从 LRR 标签汇总熟人（仅 artist:/group: 等 namespace） */
  async function rebuildFamiliarFromLrrArchives() {
    const archives = await listArchives();
    const artists = new Map();
    const groups = new Map();
    const add = (map, name) => {
      let n = compactText(name);
      if (!n || n.length < 2) return;
      n = n.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
      if (!n || n.length < 2) return;
      // 过滤明显不是人名/社团的噪声
      if (/^(chinese|english|japanese|digital|translated|rewrite|sampled)$/i.test(n)) return;
      const key =
        typeof normalizePersonKey === 'function' ? normalizePersonKey(n) : n.toLowerCase();
      if (!key) return;
      if (!map.has(key)) map.set(key, n);
    };
    (archives || []).forEach((a) => {
      const rawTags = a.tags || [];
      extractArtistsFromTags(rawTags).forEach((n) => add(artists, n));
      extractGroupsFromTags(rawTags).forEach((n) => add(groups, n));
      // 不再把 a.group（常来自标题 [xxx]）整表塞进团队——会把画师名洗成「团队」
    });
    // 若某人既在 artist 又在 group，保留 artist，从 group 去掉（减少双列表污染）
    for (const k of artists.keys()) {
      if (groups.has(k)) groups.delete(k);
      const ck = typeof compactPersonKey === 'function' ? compactPersonKey(k) : k.replace(/\s+/g, '');
      if (ck && groups.has(ck)) groups.delete(ck);
    }
    const out = {
      artists: Array.from(artists.values()).sort((a, b) => a.localeCompare(b, 'en')),
      groups: Array.from(groups.values()).sort((a, b) => a.localeCompare(b, 'en')),
    };
    return out;
  }

  /**
   * 熟人雷达：手动 custom_* + LRR 同步汇总
   * @returns {{ artists: Set<string>, groups: Set<string>, artistList: string[], groupList: string[] }}
   */
  function getFamiliarRadar() {
    const m = loadLrrMeta();
    const artistDisp = new Map();
    const groupDisp = new Map();
    const ingest = (map, list) => {
      (list || []).forEach((raw) => {
        const n = compactText(raw);
        if (!n || n.length < 2) return;
        // 主键：归一空格
        const k =
          typeof normalizePersonKey === 'function' ? normalizePersonKey(n) : n.toLowerCase();
        if (!k) return;
        if (!map.has(k)) map.set(k, n);
        // 副键：无空格（emoriuki），匹配时用 personNameMatches 也能对上
        const ck = typeof compactPersonKey === 'function' ? compactPersonKey(n) : k.replace(/\s+/g, '');
        if (ck && ck !== k && !map.has(ck)) map.set(ck, n);
      });
    };
    ingest(artistDisp, m.familiar_artists);
    ingest(artistDisp, config.custom_artists);
    ingest(groupDisp, m.familiar_groups);
    ingest(groupDisp, config.custom_groups);
    return {
      artists: new Set(artistDisp.keys()),
      groups: new Set(groupDisp.keys()),
      artistList: Array.from(new Set(artistDisp.values())).sort((a, b) => a.localeCompare(b, 'zh')),
      groupList: Array.from(new Set(groupDisp.values())).sort((a, b) => a.localeCompare(b, 'zh')),
    };
  }

  /** @returns {{ kind: 'artist'|'group', name: string } | null} */
  function matchFamiliarRadar(title, tags) {
    const radar = getFamiliarRadar();
    if (!radar.artists.size && !radar.groups.size) return null;
    const titleBag = compactText(title || '');
    const tagList = Array.isArray(tags) ? tags : [];
    const matchFn =
      typeof personNameMatches === 'function'
        ? personNameMatches
        : (a, b) =>
            String(b || '')
              .toLowerCase()
              .includes(String(a || '').toLowerCase());

    const resolveDisp = (kind, key) => {
      const list =
        kind === 'artist'
          ? [].concat(config.custom_artists || [], loadLrrMeta().familiar_artists || [])
          : [].concat(config.custom_groups || [], loadLrrMeta().familiar_groups || []);
      const hit = list.find((x) => {
        const n = compactText(x);
        if (!n) return false;
        if (n.toLowerCase() === key) return true;
        if (typeof compactPersonKey === 'function' && compactPersonKey(n) === compactPersonKey(key)) {
          return true;
        }
        return matchFn(key, n) || matchFn(n, key);
      });
      return compactText(hit || key);
    };

    // 1) namespace 标签 artist:/group:
    for (const raw of tagList) {
      const t = normalizeNamespaceTag(raw);
      if (t.startsWith('artist:')) {
        const name = t.slice(7);
        for (const key of radar.artists) {
          if (matchFn(key, name) || matchFn(name, key)) {
            return { kind: 'artist', name: resolveDisp('artist', name) };
          }
        }
      }
      if (t.startsWith('group:') || t.startsWith('translator:')) {
        const name = t.startsWith('group:') ? t.slice(6) : t.slice(11);
        for (const key of radar.groups) {
          if (matchFn(key, name) || matchFn(name, key)) {
            return { kind: 'group', name: resolveDisp('group', name) };
          }
        }
      }
    }

    // 2) 整段标题
    for (const key of radar.artists) {
      if (key.length >= 2 && matchFn(key, titleBag)) {
        return { kind: 'artist', name: resolveDisp('artist', key) };
      }
    }
    for (const key of radar.groups) {
      if (key.length >= 2 && matchFn(key, titleBag)) {
        return { kind: 'group', name: resolveDisp('group', key) };
      }
    }

    // 3) 标题括号/方括号抽名再比（列表无 tag 时）
    const bracketBits = [];
    String(titleBag).replace(/\[([^\]]+)\]|\(([^)]+)\)|【([^】]+)】/g, (_, a, b, c) => {
      const n = compactText(a || b || c || '');
      if (n && n.length >= 2 && n.length < 48) bracketBits.push(n);
      return '';
    });
    for (const bit of bracketBits) {
      for (const key of radar.artists) {
        if (matchFn(key, bit) || matchFn(bit, key)) {
          return { kind: 'artist', name: resolveDisp('artist', bit) };
        }
      }
      for (const key of radar.groups) {
        if (matchFn(key, bit) || matchFn(bit, key)) {
          return { kind: 'group', name: resolveDisp('group', bit) };
        }
      }
    }

    // 4) 所有标签文本兜底（无 namespace 的 LRR 纯名）
    const tagBlob = tagList.map((t) => String(t || '')).join(' | ');
    for (const key of radar.artists) {
      if (key.length >= 2 && matchFn(key, tagBlob)) {
        return { kind: 'artist', name: resolveDisp('artist', key) };
      }
    }
    for (const key of radar.groups) {
      if (key.length >= 2 && matchFn(key, tagBlob)) {
        return { kind: 'group', name: resolveDisp('group', key) };
      }
    }
    return null;
  }

  function getLrrStatus() {
    const radar = getFamiliarRadar();
    return {
      configured: lrrConfigured(),
      syncing: lrrSyncing,
      last_sync: lrrLastSync,
      last_error: lrrLastError,
      last_count: lrrLastCount,
      familiar_artists: radar.artistList.length,
      familiar_groups: radar.groupList.length,
    };
  }

  function buildLrrReaderUrl(arcid) {
    const base = normalizeLrrBase(config.lrr_base_url);
    if (!base || !arcid) return '';
    return base + '/reader?id=' + encodeURIComponent(arcid);
  }

  /** LRR 封面直链（nofun 关闭时浏览器可直接 img；跨源/鉴权场景见 fetchLrrThumbnailObjectUrl） */
  function buildLrrThumbnailUrl(arcid) {
    const base = normalizeLrrBase(config.lrr_base_url);
    if (!base || !arcid) return '';
    return base + '/api/archives/' + encodeURIComponent(String(arcid)) + '/thumbnail';
  }

  function buildLrrSearchUrl(query) {
    const base = normalizeLrrBase(config.lrr_base_url);
    if (!base) return '';
    return base + '/?q=' + encodeURIComponent(query || '');
  }

  /** arcid → blob: URL（含失败空串缓存，避免重复打 LRR） */
  const lrrThumbCache = new Map();
  const lrrThumbInflight = new Map();

  /**
   * 经 GM 拉取缩略图为 object URL（带 API Key，绕过混合内容 / nofun 鉴权）。
   * @returns {Promise<string>} blob: URL 或 ''
   */
  async function fetchLrrThumbnailObjectUrl(arcid) {
    const id = String(arcid || '');
    if (!id) return '';
    if (lrrThumbCache.has(id)) return lrrThumbCache.get(id) || '';
    if (lrrThumbInflight.has(id)) return lrrThumbInflight.get(id);

    const job = (async () => {
      try {
        const url = buildLrrThumbnailUrl(id);
        if (!url) {
          lrrThumbCache.set(id, '');
          return '';
        }
        const key = compactText(config.lrr_api_key);
        const headers = { Accept: 'image/*,*/*' };
        if (key) headers.Authorization = key;
        const res = await gmRequest({
          method: 'GET',
          url,
          headers,
          responseType: 'blob',
          timeout: 25000,
        });
        if (res.status < 200 || res.status >= 300 || !res.response) {
          lrrThumbCache.set(id, '');
          return '';
        }
        // 202 排队时可能返回 JSON
        const blob = res.response;
        if (!blob || typeof blob !== 'object') {
          lrrThumbCache.set(id, '');
          return '';
        }
        const type = String(blob.type || '');
        if (type.includes('json') || type.includes('text')) {
          lrrThumbCache.set(id, '');
          return '';
        }
        const objUrl = URL.createObjectURL(blob);
        lrrThumbCache.set(id, objUrl);
        return objUrl;
      } catch (_) {
        lrrThumbCache.set(id, '');
        return '';
      } finally {
        lrrThumbInflight.delete(id);
      }
    })();
    lrrThumbInflight.set(id, job);
    return job;
  }

  /**
   * 列表内懒加载 LRR 封面：IntersectionObserver + 限流 GM 拉取。
   * @param {ParentNode} root
   */
  function hydrateLrrThumbnailsIn(root) {
    if (!root || typeof fetchLrrThumbnailObjectUrl !== 'function') return;
    const nodes = root.querySelectorAll('[data-lrr-cover]');
    if (!nodes.length) return;

    let active = 0;
    const maxConcurrent = 4;
    const queue = [];

    const runNext = () => {
      while (active < maxConcurrent && queue.length) {
        const job = queue.shift();
        active++;
        Promise.resolve()
          .then(job)
          .finally(() => {
            active--;
            runNext();
          });
      }
    };

    const loadOne = (el) => {
      if (!el || el.dataset.lrrCoverLoaded === '1') return;
      el.dataset.lrrCoverLoaded = '1';
      const arcid = el.getAttribute('data-lrr-cover') || '';
      if (!arcid) return;
      queue.push(async () => {
        const objUrl = await fetchLrrThumbnailObjectUrl(arcid);
        if (!objUrl || !el.isConnected) return;
        let img = el.querySelector('img.jlc-wb-lrr-thumb');
        if (!img) {
          img = document.createElement('img');
          img.className = 'jlc-wb-lrr-thumb';
          img.alt = '';
          img.draggable = false;
          img.loading = 'lazy';
          el.insertBefore(img, el.firstChild);
        }
        img.src = objUrl;
        img.onload = () => {
          el.classList.add('has-thumb');
          const fb = el.querySelector('.jlc-wb-cover-fallback');
          if (fb) fb.hidden = true;
        };
        img.onerror = () => {
          el.classList.remove('has-thumb');
          const fb = el.querySelector('.jlc-wb-cover-fallback');
          if (fb) fb.hidden = false;
          if (img) img.remove();
        };
      });
      runNext();
    };

    if (typeof IntersectionObserver === 'function') {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (!en.isIntersecting) return;
            io.unobserve(en.target);
            loadOne(en.target);
          });
        },
        { root: root.closest('.jlc-wb-list-scroll') || null, rootMargin: '120px 0px', threshold: 0.01 }
      );
      nodes.forEach((n) => io.observe(n));
    } else {
      nodes.forEach(loadOne);
    }
  }
