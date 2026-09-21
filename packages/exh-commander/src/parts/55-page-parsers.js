
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
    // 标题里 [group] (artist) 与形态/原作补成伪标签
    const group = extractGroupFromTitle(title);
    if (group) pushTag('group:' + group);

    const titleStr = String(title || '');
    // 标题全文速检：无码 / 全彩
    if (/uncensored|decensored|無修正|无修正|无码/i.test(titleStr)) {
      pushTag('other:uncensored');
    }
    if (/full.?colou?r|全彩|フルカラー/i.test(titleStr)) {
      pushTag('other:full color');
    }

    const parenRegex = /\[([^\]]+)\]|\(([^)]+)\)|【([^】]+)】/g;
    let pMatch;
    while ((pMatch = parenRegex.exec(titleStr)) !== null) {
      const isBracket = !!(pMatch[1] || pMatch[3]);
      const raw = compactText(pMatch[1] || pMatch[2] || pMatch[3] || '');
      if (!raw || raw.length < 2 || raw.length > 48) continue;
      const low = raw.toLowerCase();

      // 1) 纯数字或年份跳过
      if (/^\d{2,4}$/.test(raw)) continue;

      // 2) 形态 / 码级（只提取真正有决策价值的无码、全彩、3D、CG包）
      let matchedFormat = false;
      if (/^(uncensored|decensored|無修正|无修正|无码|去码)$/i.test(low)) {
        pushTag('other:uncensored');
        matchedFormat = true;
      } else if (/^(full.?colou?r|全彩|フルカラー)$/i.test(low)) {
        pushTag('other:full color');
        matchedFormat = true;
      } else if (/^(cg set|cg集|同人cg)$/i.test(low)) {
        pushTag('other:cg set');
        matchedFormat = true;
      } else if (/^3d$/i.test(low)) {
        pushTag('other:3d');
        matchedFormat = true;
      }
      if (matchedFormat) continue;

      // 介质与非题材噪声：直接跳过
      if (/^(tankoubon|单行本|単行本|digital|dl版|anthology|选集|original|オリジナル|よろず)$/i.test(low)) {
        continue;
      }

      // 3) 汉化组 / 语言
      if (/汉化|漢化|翻译|翻譯|字幕|个人汉化|嵌字/i.test(raw)) {
        pushTag('translator:' + raw);
        pushTag('language:chinese');
        continue;
      }
      if (/^(chinese|中国翻訳|中國翻譯)$/i.test(low)) {
        pushTag('language:chinese');
        continue;
      }
      if (/^(english|japanese|korean|complete|ongoing)$/i.test(low)) {
        continue;
      }

      // 4) 常见原作（Parody）判断（仅二创 IP）
      if (
        /^(fate|fgo|grand order|碧蓝航线|アズールレーン|azur lane|原神|genshin|偶像大师|アイドルマスター|imas|东方|東方|touhou|舰队|艦これ|kancolle|blue archive|碧蓝档案|ブルーアーカイブ|arknights|明日方舟|pokemon|宝可梦|nikke|胜利女神)/i.test(
          low
        )
      ) {
        pushTag('parody:' + raw);
        continue;
      }

      // 5) 社团与画师（保留熟人雷达职责）
      if (isBracket) {
        pushTag('group:' + raw);
      } else {
        pushTag('artist:' + raw);
      }

      // 嵌套 [Group (Artist)]
      const nested = raw.match(/\(([^)]+)\)/);
      if (nested) {
        const an = compactText(nested[1]);
        if (an && an.length >= 2 && !/^(chinese|english|digital|dl版|\d{2,4})$/i.test(an)) {
          pushTag('artist:' + an);
        }
      }
    }

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

  function queryListItems(root) {
    const scope = root && root.querySelectorAll ? root : document;
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
      scope.querySelectorAll(sel).forEach((el) => {
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
      scope.querySelectorAll('a[href*="/g/"]').forEach((a) => {
        const row = a.closest('tr, .gl1t, .gl2t, .gl3t, .gl1e, .gl2e, li, div') || a.parentElement;
        if (row && !seen.has(row) && row.querySelectorAll) {
          // avoid grabbing entire body
          if (row === document.body || (row.id && row.id === 'gdt')) return;
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
      tags_fetched_at: nowMs(),
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
    const hateNeedles = typeof expandHateTagAliases === 'function'
      ? expandHateTagAliases(config.hate_tags || [])
      : (config.hate_tags || []);
    const tagset = (edition.tags || []).map((t) => normalizeNamespaceTag(t).toLowerCase());
    for (const ht of hateNeedles) {
      const h = normalizeNamespaceTag(ht).toLowerCase().trim();
      if (!h) continue;
      // 快速防线：如果是中文屏蔽词且标题直接包含该词，无需等待标签即可快速屏蔽
      if (typeof isCjkText === 'function' && isCjkText(h) && h.length >= 2 && title.includes(h)) {
        return { blocked: true, reason: 'title_hate:' + h };
      }
      const hit = tagset.some((t) => {
        if (t === h) return true;
        if (t.endsWith(':' + h)) return true;
        if (h.endsWith(':' + t)) return true;
        if (typeof isCjkText === 'function' && isCjkText(h) && t.includes(h)) return true;
        return false;
      });
      if (hit) {
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
