// 10-core.js

const SCOUT_VERSION = '0.1.5';

function compactText(str) {
  return String(str == null ? '' : str).replace(/\s+/g, ' ').trim();
}

function escapeHtml(html) {
  return String(html || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function uid() {
  return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/**
 * 清洗词库/标签文本：去掉页面注入的 ＋✕、爱心、首尾 + 号等噪声。
 * 解决收藏时 textContent 把 UI 按钮读进词条（如 anal＋✕）。
 */
function sanitizeLexiconText(raw) {
  let s = String(raw == null ? '' : raw);
  // 去掉脚本注入的 UI 字符与常见装饰
  s = s.replace(/[＋✕×✖❌★☆♥❤️♥︎♡]/g, '');
  s = s.replace(/[\u200b-\u200d\ufeff]/g, '');
  // 去掉首尾 ASCII +（站内「+tag」噪声）
  s = s.replace(/^\++|\++$/g, '');
  // 全角空格等
  s = s.replace(/[\u3000]/g, ' ');
  s = compactText(s);
  // 残留「词 +」尾巴
  s = s.replace(/\s*\+\s*$/g, '').trim();
  return s;
}

/**
 * 词条身份键：清洗后小写。导入/入库合并用此键，避免同词多条。
 */
function lexiconIdentityKey(text) {
  return sanitizeLexiconText(text).toLowerCase();
}

/**
 * 自动采集时拒绝的过宽/无题材区分度词（单独搜几乎等于不搜）。
 * 手动入库仍允许（不拦 addLexiconTerm 除非 fromAutoCollect）。
 */
const BROAD_LEXICON_TAGS = new Set([
  'sex', 'porn', 'porno', 'xxx', 'nsfw',
  'hd', '4k', 'uhd', 'fhd', 'hq', 'lq',
  'video', 'videos', 'movie', 'movies', 'clip', 'clips', 'scene', 'scenes',
  'free', 'hot', 'new', 'young', 'sexy', 'best', 'top', 'latest', 'popular',
  'hardcore', 'softcore', 'amateur', 'official', 'exclusive',
  'step', // 仅前缀过宽；更具体复合词仍可手动采
  'and', 'the', 'with', 'for', 'from', 'you', 'your', 'my',
  'pornstar', 'pornstars', 'channel', 'profile', 'model', 'models',
  '1080p', '720p', '480p', '360p', '2160p', '1440p',
  '3d', 'vr', 'live', 'cam', 'webcam',
  'fuck', 'fucking', 'fucks',
  'butt', 'ass',
  'cum', 'cumshot',
  'big', 'small', 'long', 'huge', 'tiny',
  'girl', 'girls', 'boy', 'boys', 'man', 'woman', 'women', 'guy', 'guys',
  'love', 'lover', 'lovers',
  'onlyfans', 'fansly',
  'verified', 'premium', 'full', 'complete',
  'english', 'deutsch', 'french', 'spanish', 'japanese',
  // 肤色/族裔词默认不进自动词库（可手动入库或走屏蔽）
  'black', 'white', 'asian', 'latina', 'ebony', 'bbc'
]);

/** 是否过宽/噪声（自动采集应跳过） */
function isBroadOrNoiseLexiconTag(text) {
  const t = sanitizeLexiconText(text);
  if (!t) return true;
  if (t.length < 2 || t.length > 40) return true;
  // 仍含 UI 噪声
  if (/[＋✕×✖❌]/.test(String(text || ''))) {
    // 清洗后若变成正常词可过；上面已 sanitize，这里用清洗后的 t
  }
  if (/^\d+$/.test(t)) return true;
  if (/^\d{3,4}p$/i.test(t)) return true;
  if (/^[+\-_.\s]+$/.test(t)) return true;
  // 纯分辨率/时长碎片
  if (/^\d+\s*min$/i.test(t)) return true;
  const low = t.toLowerCase();
  if (BROAD_LEXICON_TAGS.has(low)) return true;
  // 全是停用短词
  const words = low.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.every((w) => BROAD_LEXICON_TAGS.has(w) || w.length <= 1)) {
    return true;
  }
  return false;
}

/**
 * 从 DOM 锚点取干净标签文本（优先 data-scout-tag，并去掉注入的 ＋✕ 节点）。
 */
function tagTextFromAnchor(a) {
  if (!a) return '';
  try {
    const data = a.getAttribute && a.getAttribute('data-scout-tag');
    if (data) return sanitizeLexiconText(data);
  } catch (_) { /* ignore */ }
  try {
    if (a.cloneNode) {
      const c = a.cloneNode(true);
      if (c.querySelectorAll) {
        c.querySelectorAll(
          '.scout-tag-addon, .scout-tag-heart, .scout-pub-addon, button, input'
        ).forEach((n) => n.remove());
      }
      return sanitizeLexiconText(c.textContent || '');
    }
  } catch (_) { /* ignore */ }
  return sanitizeLexiconText(a.textContent || '');
}

/**
 * 把 incoming 字段合并进 keep（同 text 身份）。
 * @param {object} keep
 * @param {object} incoming
 * @param {{ bumpHeat?: boolean, preferIncomingMeta?: boolean }} opts
 */
function mergeLexiconTermFields(keep, incoming, opts) {
  const o = opts || {};
  if (!keep || !incoming) return keep;
  if (incoming.zh != null && compactText(incoming.zh)) {
    if (o.preferIncomingMeta || !compactText(keep.zh)) {
      keep.zh = compactText(incoming.zh);
    }
  }
  if (incoming.type && incoming.type !== '未分类') {
    if (o.preferIncomingMeta || !keep.type || keep.type === '未分类') {
      keep.type = incoming.type;
    }
  }
  if (incoming.loved !== undefined) {
    keep.loved = !!incoming.loved || !!keep.loved;
  }
  if (incoming.note != null && compactText(incoming.note)) {
    const n = compactText(incoming.note);
    if (o.preferIncomingMeta || !compactText(keep.note)) {
      keep.note = n;
    } else if (!(keep.note || '').includes(n)) {
      keep.note = keep.note ? keep.note + '; ' + n : n;
    }
  }
  if (incoming.status) {
    if (incoming.status === 'confirmed' || keep.status === 'confirmed') {
      keep.status = 'confirmed';
    } else if (o.preferIncomingMeta) {
      keep.status = incoming.status;
    } else if (keep.status === 'retired' && incoming.status !== 'retired') {
      keep.status = incoming.status;
    }
  }
  if (Array.isArray(incoming.subtypes)) {
    keep.subtypes = Array.from(new Set([...(keep.subtypes || []), ...incoming.subtypes]));
  }
  if (Array.isArray(incoming.aliases)) {
    const aliases = Array.isArray(keep.aliases) ? keep.aliases.slice() : [];
    const aliasIndex = new Map();
    aliases.forEach((alias, index) => {
      const text = typeof alias === 'string' ? alias : alias && alias.text;
      const key = lexiconIdentityKey(text);
      if (key && !aliasIndex.has(key)) aliasIndex.set(key, index);
    });
    incoming.aliases.forEach((alias) => {
      const text = typeof alias === 'string' ? alias : alias && alias.text;
      const key = lexiconIdentityKey(text);
      if (!key) return;
      const index = aliasIndex.get(key);
      if (index == null) {
        aliasIndex.set(key, aliases.length);
        aliases.push(alias);
      } else if (typeof alias === 'object' && alias) {
        aliases[index] = Object.assign({}, aliases[index], alias);
      }
    });
    keep.aliases = aliases.slice(-40);
  }
  const existingSrc = keep.sources || [];
  const newSrc = incoming.sources || [];
  for (const ns of newSrc) {
    if (ns && ns.url && !existingSrc.some((s) => s && s.url === ns.url)) {
      existingSrc.push(ns);
    }
  }
  keep.sources = existingSrc.slice(-15);
  if (o.sumStats) {
    // 全量包导入：数值相加
    keep.heat = (Number(keep.heat) || 0) + (Number(incoming.heat) || 0);
    keep.use = (Number(keep.use) || 0) + (Number(incoming.use) || 0);
    keep.good = (Number(keep.good) || 0) + (Number(incoming.good) || 0);
    keep.bad = (Number(keep.bad) || 0) + (Number(incoming.bad) || 0);
  } else if (o.bumpHeat) {
    // 再次采集同一词：heat +1
    keep.heat = (Number(keep.heat) || 0) + 1;
    keep.use = Math.max(Number(keep.use) || 0, Number(incoming.use) || 0);
    keep.good = Math.max(Number(keep.good) || 0, Number(incoming.good) || 0);
    keep.bad = Math.max(Number(keep.bad) || 0, Number(incoming.bad) || 0);
  } else {
    // 导入合并：热度取较大值
    keep.heat = Math.max(Number(keep.heat) || 0, Number(incoming.heat) || 0);
    keep.use = Math.max(Number(keep.use) || 0, Number(incoming.use) || 0);
    keep.good = Math.max(Number(keep.good) || 0, Number(incoming.good) || 0);
    keep.bad = Math.max(Number(keep.bad) || 0, Number(incoming.bad) || 0);
  }
  keep.last_used_at = incoming.last_used_at || keep.last_used_at || new Date().toISOString();
  keep.updated_at = new Date().toISOString();
  return keep;
}

/**
 * 就地合并词库中同 identity 的重复条（导入后/启动时调用）。
 * @returns {number} 去掉的条数
 */
function dedupeLexiconTermsStore() {
  const terms = getLexiconTerms();
  if (!Array.isArray(terms) || terms.length < 2) {
    // 仍清洗 text
    let dirty = false;
    (terms || []).forEach((t) => {
      if (!t) return;
      const s = sanitizeLexiconText(t.text);
      if (s && s !== t.text) {
        t.text = s;
        dirty = true;
      }
    });
    if (dirty) {
      saveLexiconTerms(terms);
      triggerWebDavDirty();
    }
    return 0;
  }
  const map = new Map();
  let removed = 0;
  for (const t of terms) {
    if (!t) {
      removed++;
      continue;
    }
    const text = sanitizeLexiconText(t.text);
    if (!text) {
      removed++;
      continue;
    }
    t.text = text;
    const key = text.toLowerCase();
    if (!map.has(key)) {
      map.set(key, t);
    } else {
      mergeLexiconTermFields(map.get(key), t, { preferIncomingMeta: false, sumStats: false });
      // 累加 heat 避免丢使用痕迹
      const keep = map.get(key);
      keep.heat = (Number(keep.heat) || 0) + (Number(t.heat) || 0);
      keep.use = (Number(keep.use) || 0) + (Number(t.use) || 0);
      removed++;
    }
  }
  const next = Array.from(map.values());
  if (removed > 0 || next.length !== terms.length) {
    saveLexiconTerms(next);
    triggerWebDavDirty();
  }
  return removed;
}

/**
 * 屏蔽表同 text 去重合并。
 * @returns {number}
 */
function dedupeBlockListStore() {
  const list = getBlockList();
  if (!Array.isArray(list) || list.length < 2) return 0;
  const map = new Map();
  let removed = 0;
  for (const b of list) {
    if (!b) {
      removed++;
      continue;
    }
    const text = sanitizeLexiconText(b.text);
    if (!text) {
      removed++;
      continue;
    }
    b.text = text;
    const key = text.toLowerCase();
    if (!map.has(key)) {
      map.set(key, b);
    } else {
      const keep = map.get(key);
      if (!keep.zh && b.zh) keep.zh = compactText(b.zh);
      if (b.reason && !(keep.reason || '').includes(b.reason)) {
        keep.reason = keep.reason
          ? keep.reason + '; ' + compactText(b.reason)
          : compactText(b.reason);
      }
      if (b.mode === 'hide' || keep.mode === 'hide') keep.mode = 'hide';
      keep.heat = Math.max(Number(keep.heat) || 0, Number(b.heat) || 0);
      removed++;
    }
  }
  const next = Array.from(map.values());
  if (removed > 0) {
    saveBlockList(next);
    triggerWebDavDirty();
  }
  return removed;
}

// Lightweight Toast UI
function showToast(msg, isError = false) {
  let container = document.getElementById('creamu-scout-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'creamu-scout-toast-container';
    container.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.style.cssText = 'padding:10px 18px;border-radius:10px;font-size:13.5px;font-weight:600;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:opacity 0.2s, transform 0.2s;transform:translateY(-10px);opacity:0;pointer-events:auto;';
  if (isError) {
    el.style.backgroundColor = '#b42318';
  } else {
    el.style.backgroundColor = '#d4883a';
  }
  el.textContent = msg;
  container.appendChild(el);
  
  // animate in
  setTimeout(() => {
    el.style.transform = 'translateY(0)';
    el.style.opacity = '1';
  }, 10);
  
  // animate out
  setTimeout(() => {
    el.style.transform = 'translateY(-10px)';
    el.style.opacity = '0';
    setTimeout(() => {
      el.remove();
      if (container.children.length === 0) {
        container.remove();
      }
    }, 200);
  }, 3500);
}
