// 10-core.js

const SCOUT_VERSION = '0.1.3';

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

// 
const DEFAULT_TYPES = ['主题', '角色', '场景', '其他', '未分类'];

// Lexicon Types
function getLexiconTypes() {
  const t = GM_getValue('creamu_scout_lexicon_types', null);
  if (Array.isArray(t) && t.length > 0) return t;
  return DEFAULT_TYPES.slice();
}

function saveLexiconTypes(types) {
  GM_setValue('creamu_scout_lexicon_types', types);
}

// Lexicon Terms
function getLexiconTerms() {
  const val = GM_getValue('creamu_scout_lexicon_terms', null);
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch(_) { return []; }
  }
  return [];
}

function saveLexiconTerms(terms) {
  GM_setValue('creamu_scout_lexicon_terms', terms);
}

/**
 * 入库词条。自动合并同 identity（清洗后大小写不敏感）。
 * opts / termData.fromAutoCollect：自动采集时拒绝过宽词与噪声。
 */
function addLexiconTerm(termData) {
  if (!termData) return null;
  const terms = getLexiconTerms();
  const textNorm = sanitizeLexiconText(termData.text);
  if (!textNorm) return null;

  // 自动采集：过宽/噪声不入库
  if (termData.fromAutoCollect && isBroadOrNoiseLexiconTag(textNorm)) {
    return null;
  }

  const key = textNorm.toLowerCase();
  const existing = terms.find((t) => lexiconIdentityKey(t.text) === key);

  if (existing) {
    // 纠正历史脏 text
    existing.text = sanitizeLexiconText(existing.text) || textNorm;
    mergeLexiconTermFields(existing, {
      zh: termData.zh,
      type: termData.type,
      loved: termData.loved,
      note: termData.note,
      status: termData.status,
      subtypes: termData.subtypes,
      sources: termData.sources,
      heat: termData.heat,
      use: termData.use,
      good: termData.good,
      bad: termData.bad
    }, { bumpHeat: true });
    if (existing.status === 'retired' && termData.status !== 'retired') {
      existing.status = termData.status || 'unreviewed';
    }
    saveLexiconTerms(terms);
    triggerWebDavDirty();
    return existing;
  }

  const newTerm = {
    id: 'term_' + uid(),
    text: textNorm,
    zh: compactText(termData.zh),
    type: termData.type || '未分类',
    subtypes: termData.subtypes || [],
    loved: !!termData.loved,
    status: termData.status || 'unreviewed', // unreviewed | confirmed | retired
    heat: Number(termData.heat) > 0 ? Number(termData.heat) : 1,
    use: Number(termData.use) || 0,
    good: Number(termData.good) || 0,
    bad: Number(termData.bad) || 0,
    sources: termData.sources || [],
    note: compactText(termData.note),
    last_used_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  terms.push(newTerm);
  saveLexiconTerms(terms);
  triggerWebDavDirty();
  return newTerm;
}

function updateLexiconTerm(id, fields) {
  const terms = getLexiconTerms();
  const term = terms.find(t => t.id === id);
  if (term) {
    Object.assign(term, fields);
    term.updated_at = new Date().toISOString();
    saveLexiconTerms(terms);
    triggerWebDavDirty();
    return term;
  }
  return null;
}

function deleteLexiconTerm(id) {
  let terms = getLexiconTerms();
  const len = terms.length;
  terms = terms.filter(t => t.id !== id);
  if (terms.length !== len) {
    saveLexiconTerms(terms);
    triggerWebDavDirty();
    return true;
  }
  return false;
}

function incrementTermHeat(id, action = 'use') {
  const terms = getLexiconTerms();
  const term = terms.find(t => t.id === id);
  if (term) {
    if (action === 'use') {
      term.use = (Number(term.use) || 0) + 1;
      term.heat = (Number(term.heat) || 0) + 2;
    } else if (action === 'good') {
      term.good = (Number(term.good) || 0) + 1;
      term.heat = (Number(term.heat) || 0) + 3;
    } else if (action === 'bad') {
      term.bad = (Number(term.bad) || 0) + 1;
      term.heat = Math.max(0, (Number(term.heat) || 0) - 2);
    }
    term.last_used_at = new Date().toISOString();
    term.updated_at = new Date().toISOString();
    saveLexiconTerms(terms);
    triggerWebDavDirty();
    return term;
  }
  return null;
}

function getEffectiveHeat(term) {
  const heat = Number(term.heat) || 0;
  const lastUsed = term.last_used_at || term.updated_at || term.created_at;
  if (!lastUsed) return heat;
  const diffMs = Date.now() - new Date(lastUsed).getTime();
  const days = diffMs / (1000 * 60 * 60 * 24);
  if (days <= 0) return heat;
  return heat * Math.pow(0.95, days);
}

/** 匹配用归一化：小写、_-→空格、多空格合并 */
function normalizeLexKey(s) {
  return compactText(s)
    .toLowerCase()
    .replace(/[-_+/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 去空格/连字符紧凑形，便于词库与标题写法对齐 */
function compactLexKey(s) {
  return normalizeLexKey(s).replace(/\s+/g, '');
}

/**
 * 词库词是否命中一段文本（标题/slug/标签）。
 * 整词匹配 + 紧凑等价（空格/连字符写法对齐）
 */
function lexiconTermHitsText(termText, haystack) {
  const term = normalizeLexKey(termText);
  const hay = normalizeLexKey(haystack);
  if (!term || !hay) return false;
  // 1) 标准整词
  if (typeof textMatchesBlock === 'function') {
    if (textMatchesBlock(hay, { text: term, match: 'word' })) return true;
  } else if (hay === term || (' ' + hay + ' ').includes(' ' + term + ' ')) {
    return true;
  }
  // 2) 紧凑形：整段相等，或紧凑 hay 中按整段命中长词（≥5 防短词误伤）
  const tc = compactLexKey(term);
  const hc = compactLexKey(hay);
  if (!tc || !hc) return false;
  if (tc === hc) return true;
  if (tc.length >= 5) {
    // 长词：紧凑串包含即视为命中（短词走整词规则防误伤）
    if (hc.indexOf(tc) >= 0) return true;
  }
  return false;
}

/**
 * 词库命中：对照标题 / 标签 / URL 路径（列表无站标时靠 slug）。
 * 展示优先中文 zh，心动 loved 排前。
 */
function matchLexiconHits(meta, options) {
  const opts = options || {};
  const terms = (opts.terms || getLexiconTerms()).filter(
    (t) => t && t.status !== 'retired' && compactText(t.text)
  );
  const title = compactText(meta && meta.title);
  const uploader = compactText(meta && meta.uploader);
  let tags = Array.isArray(meta && meta.tags)
    ? meta.tags.map((t) => compactText(t)).filter(Boolean)
    : [];
  // URL 路径分词补伪标签
  const url = compactText(meta && meta.url);
  if (url) {
    try {
      const path = new URL(url, typeof location !== 'undefined' ? location.origin : 'https://x.com').pathname || '';
      const slug = path.split('/').filter(Boolean).pop() || '';
      const spaced = slug.replace(/[-_]+/g, ' ');
      if (spaced) tags = tags.concat(spaced.split(/\s+/).filter((w) => w.length >= 2));
      tags.push(spaced);
    } catch (_) { /* ignore */ }
  }
  // 去重保留顺序
  const seenTag = new Set();
  tags = tags.filter((t) => {
    const k = t.toLowerCase();
    if (seenTag.has(k)) return false;
    seenTag.add(k);
    return true;
  });

  const hits = [];
  const seen = new Set();

  terms.forEach((term) => {
    const key = normalizeLexKey(term.text);
    if (!key || seen.has(key) || seen.has(compactLexKey(key))) return;

    let via = '';
    for (let i = 0; i < tags.length; i++) {
      if (lexiconTermHitsText(term.text, tags[i])) {
        via = 'tag';
        break;
      }
    }
    if (!via && title && lexiconTermHitsText(term.text, title)) via = 'title';
    if (!via && uploader && lexiconTermHitsText(term.text, uploader)) via = 'uploader';
    if (!via) return;

    seen.add(key);
    seen.add(compactLexKey(key));
    hits.push({
      text: term.text,
      zh: compactText(term.zh),
      type: term.type || '未分类',
      loved: !!term.loved,
      via,
      label: compactText(term.zh) || term.text,
      heat: getEffectiveHeat(term)
    });
  });

  hits.sort((a, b) => {
    if (a.loved !== b.loved) return a.loved ? -1 : 1;
    return (b.heat || 0) - (a.heat || 0);
  });

  // 展示去重：继母/妈妈、继女/女儿 等同族只留更具体的一条
  const displayHits = dedupeLexiconHitsForDisplay(hits);

  return {
    hits: displayHits,
    /** 去重前原始命中（调试/统计用） */
    rawHits: hits,
    lovedCount: displayHits.filter((h) => h.loved).length,
    total: displayHits.length,
    rawTotal: hits.length
  };
}

/**
 * 标签流去重：compact 相同只留一条；更长词覆盖其子串短词。
 * 优先：更长/更具体 > 心动 > 热度
 */
function dedupeLexiconHitsForDisplay(hits) {
  if (!Array.isArray(hits) || hits.length <= 1) return hits || [];

  const covers = (longer, shorter) => {
    const a = compactLexKey(longer.text || longer);
    const b = compactLexKey(shorter.text || shorter);
    if (!a || !b) return false;
    if (a === b) return true;
    // 仅当短词是长词的「整段尾缀/前缀」时覆盖，减少误伤
    if (b.length < 3 || a.length <= b.length) return false;
    if (a.endsWith(b) || a.startsWith(b)) return true;
    if (b.length >= 3 && a.includes(b)) {
      // 短词在长词中占比够高才覆盖，减少误伤
      if (b.length / a.length >= 0.35) return true;
    }
    return false;
  };

  const sorted = hits.slice().sort((a, b) => {
    const la = compactLexKey(a.text).length;
    const lb = compactLexKey(b.text).length;
    if (lb !== la) return lb - la; // 更长更具体优先
    if (!!b.loved !== !!a.loved) return a.loved ? -1 : 1;
    return (b.heat || 0) - (a.heat || 0);
  });

  const kept = [];
  for (const h of sorted) {
    // 已有更具体的盖住当前 → 丢弃
    if (kept.some((k) => covers(k, h))) continue;
    // 当前更具体 → 去掉被盖住的旧条
    for (let i = kept.length - 1; i >= 0; i--) {
      if (covers(h, kept[i])) kept.splice(i, 1);
    }
    kept.push(h);
  }

  // 最终仍按 心动 > 热度 排展示顺序
  kept.sort((a, b) => {
    if (a.loved !== b.loved) return a.loved ? -1 : 1;
    return (b.heat || 0) - (a.heat || 0);
  });
  return kept;
}

// Block Words
function getBlockList() {
  const val = GM_getValue('creamu_scout_block_list', null);
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch(_) { return []; }
  }
  return [];
}

function saveBlockList(list) {
  GM_setValue('creamu_scout_block_list', list);
}

/** match: word(整词，默认) | sub(子串) */
function normalizeBlockMatch(m) {
  return m === 'sub' ? 'sub' : 'word';
}

/** scope: title(默认) | uploader | both */
function normalizeBlockScope(s) {
  if (s === 'uploader' || s === 'both') return s;
  return 'title';
}

function escapeRegExp(str) {
  return String(str == null ? '' : str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 标题/上传者文本是否命中屏蔽词。
 * word：按词边界匹配（避免 ass 误伤 class）；多词短语允许中间空白。
 * sub：纯子串 contains。
 */
function textMatchesBlock(haystack, block) {
  const text = compactText(haystack).toLowerCase();
  const needle = compactText(block && block.text).toLowerCase();
  if (!text || !needle) return false;
  if (normalizeBlockMatch(block.match) === 'sub') {
    return text.includes(needle);
  }
  const parts = needle.split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (!parts.length) return false;
  const body = parts.join('\\s+');
  try {
    return new RegExp('(^|[^a-z0-9_])' + body + '([^a-z0-9_]|$)', 'i').test(text);
  } catch (_) {
    return text.includes(needle);
  }
}

function blockMatchesVideo(meta, block) {
  if (!meta || !block) return false;
  const scope = normalizeBlockScope(block.scope);
  if (scope === 'title' || scope === 'both') {
    if (textMatchesBlock(meta.title, block)) return true;
  }
  if (scope === 'uploader' || scope === 'both') {
    if (textMatchesBlock(meta.uploader || '', block)) return true;
  }
  return false;
}

function addBlockWord({ text, zh, reason, mode = 'dim', match, scope }) {
  const list = getBlockList();
  const textNorm = sanitizeLexiconText(text) || compactText(text);
  if (!textNorm) return null;
  const key = textNorm.toLowerCase();
  const existing = list.find((b) => lexiconIdentityKey(b.text) === key);
  if (existing) {
    existing.text = sanitizeLexiconText(existing.text) || textNorm;
    if (!existing.zh && zh) existing.zh = compactText(zh);
    if (reason) existing.reason = compactText(reason);
    if (mode) existing.mode = mode;
    if (match !== undefined) existing.match = normalizeBlockMatch(match);
    if (scope !== undefined) existing.scope = normalizeBlockScope(scope);
    if (!existing.match) existing.match = 'word';
    if (!existing.scope) existing.scope = 'title';
    existing.heat = (existing.heat || 0) + 1;
    saveBlockList(list);
    triggerWebDavDirty();
    return existing;
  } else {
    const newBlock = {
      id: 'block_' + uid(),
      text: textNorm,
      zh: compactText(zh),
      reason: compactText(reason),
      mode: mode || 'dim', // dim | hide
      match: normalizeBlockMatch(match), // word | sub
      scope: normalizeBlockScope(scope), // title | uploader | both
      heat: 1,
      created_at: new Date().toISOString()
    };
    list.push(newBlock);
    saveBlockList(list);
    triggerWebDavDirty();
    return newBlock;
  }
}

function deleteBlockWord(id) {
  let list = getBlockList();
  const len = list.length;
  list = list.filter(b => b.id !== id);
  if (list.length !== len) {
    saveBlockList(list);
    triggerWebDavDirty();
    return true;
  }
  return false;
}

// Familiar / Publishers
function getPublishers() {
  const val = GM_getValue('creamu_scout_publishers', null);
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch(_) { return []; }
  }
  return [];
}

function savePublishers(list) {
  GM_setValue('creamu_scout_publishers', list);
}

function addPublisher({ name, site, status = 'loved', note = '' }) {
  const list = getPublishers();
  const nameNorm = compactText(name);
  if (!nameNorm) return null;
  
  const existing = list.find(p => p.name.toLowerCase().trim() === nameNorm.toLowerCase());
  if (existing) {
    existing.status = status || existing.status;
    if (note) existing.note = compactText(note);
    existing.site = site || existing.site;
    savePublishers(list);
    triggerWebDavDirty();
    return existing;
  } else {
    const newPub = {
      id: 'pub_' + uid(),
      name: nameNorm,
      site: String(site || ''),
      status: status || 'loved', // loved | blocked
      note: compactText(note),
      created_at: new Date().toISOString()
    };
    list.push(newPub);
    savePublishers(list);
    triggerWebDavDirty();
    return newPub;
  }
}

function deletePublisher(id) {
  let list = getPublishers();
  const len = list.length;
  list = list.filter(p => p.id !== id);
  if (list.length !== len) {
    savePublishers(list);
    triggerWebDavDirty();
    return true;
  }
  return false;
}

// Works：作品收藏（主键 site + videoId；可缓存 thumb dataURL）
const WORKS_KEY = 'creamu_scout_works';

function workKey(site, videoId) {
  return String(site || '') + '|' + String(videoId || '');
}

function getWorks() {
  const val = GM_getValue(WORKS_KEY, null);
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val);
      return Array.isArray(p) ? p : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

function saveWorks(list) {
  GM_setValue(WORKS_KEY, list || []);
}

function findWork(site, videoId) {
  const id = compactText(videoId);
  if (!id) return null;
  const siteNorm = String(site || '');
  return (
    getWorks().find(
      (w) => w && w.site === siteNorm && compactText(w.videoId || w.id) === id
    ) || null
  );
}

function isWorkSaved(site, videoId) {
  return !!findWork(site, videoId);
}

/**
 * 收藏作品。可选 autoCollectTags：把标签合并进词库（unreviewed）。
 * @returns {{ work: object, added: boolean, tagsCollected: number }}
 */
function addWork(data, options) {
  const opts = options || {};
  const site = String((data && data.site) || (typeof detectSite === 'function' ? detectSite() : '') || '');
  const url = compactText(data && data.url) || (typeof location !== 'undefined' ? location.href : '');
  const videoId = compactText(data && (data.videoId || data.id)) || (typeof videoIdFromUrl === 'function' ? videoIdFromUrl(url) : '');
  if (!videoId) return { work: null, added: false, tagsCollected: 0 };

  // 清洗标签：去 ＋✕、过宽词不进作品 tags 列表（保留有意义的）
  const rawTags = Array.isArray(data && data.tags) ? data.tags : [];
  const tags = [];
  const seenTagKey = new Set();
  rawTags.forEach((t) => {
    const s = sanitizeLexiconText(t);
    if (!s) return;
    const k = s.toLowerCase();
    if (seenTagKey.has(k)) return;
    seenTagKey.add(k);
    tags.push(s);
  });
  const list = getWorks();
  const existing = list.find(
    (w) => w && w.site === site && compactText(w.videoId || w.id) === videoId
  );
  const now = new Date().toISOString();
  let work;
  let added = false;
  const thumbIn = compactText(data && data.thumb);
  const thumbUrlIn = compactText(data && data.thumbUrl);
  const isDataThumb = /^data:image\//i.test(thumbIn);

  if (existing) {
    existing.title = compactText(data && data.title) || existing.title;
    existing.url = url || existing.url;
    // 已有 dataURL 缓存时，勿被空的远程 URL 冲掉
    if (isDataThumb) {
      existing.thumb = thumbIn;
      if (thumbUrlIn) existing.thumbUrl = thumbUrlIn;
      else if (existing.thumbUrl == null && existing.thumb && !/^data:/i.test(existing.thumb)) {
        existing.thumbUrl = existing.thumb;
      }
    } else if (thumbIn) {
      if (!existing.thumb || !/^data:image\//i.test(existing.thumb)) {
        existing.thumb = thumbIn;
      }
      existing.thumbUrl = thumbIn;
    }
    existing.uploader = compactText(data && data.uploader) || existing.uploader;
    if (tags.length) {
      const set = new Set([...(existing.tags || []), ...tags].map((t) => sanitizeLexiconText(t).toLowerCase()).filter(Boolean));
      existing.tags = Array.from(set).map((low) => {
        const hit = tags.find((t) => t.toLowerCase() === low) || (existing.tags || []).find((t) => sanitizeLexiconText(t).toLowerCase() === low);
        return hit || low;
      });
    }
    if (data && data.note != null) existing.note = compactText(data.note);
    existing.updated_at = now;
    work = existing;
  } else {
    work = {
      id: 'work_' + uid(),
      site,
      videoId,
      title: compactText(data && data.title),
      url,
      thumb: thumbIn,
      thumbUrl: isDataThumb ? thumbUrlIn : thumbIn || thumbUrlIn,
      uploader: compactText(data && data.uploader),
      tags,
      note: compactText(data && data.note),
      created_at: now,
      updated_at: now
    };
    list.unshift(work);
    added = true;
  }
  saveWorks(list);
  triggerWebDavDirty();

  let tagsCollected = 0;
  if (opts.autoCollectTags !== false && tags.length) {
    tags.forEach((tag) => {
      if (isBroadOrNoiseLexiconTag(tag)) return;
      // 已在屏蔽表的不进词库
      const blocked = getBlockList().some(
        (b) => b && lexiconIdentityKey(b.text) === lexiconIdentityKey(tag)
      );
      if (blocked) return;
      const term = addLexiconTerm({
        text: tag,
        type: '未分类',
        status: 'unreviewed',
        fromAutoCollect: true,
        sources: [
          {
            site,
            url,
            title: work.title,
            at: now,
            from: 'work_favorite'
          }
        ]
      });
      if (term) tagsCollected++;
    });
  }
  return { work, added, tagsCollected };
}

function removeWork(idOrSite, videoIdMaybe) {
  let list = getWorks();
  const len = list.length;
  if (videoIdMaybe != null) {
    const site = String(idOrSite || '');
    const vid = compactText(videoIdMaybe);
    list = list.filter(
      (w) => !(w && w.site === site && compactText(w.videoId || w.id) === vid)
    );
  } else {
    const id = String(idOrSite || '');
    list = list.filter((w) => w && w.id !== id);
  }
  if (list.length === len) return false;
  saveWorks(list);
  triggerWebDavDirty();
  return true;
}

/** 写入作品缩略图缓存（data URL）；保留 thumbUrl 远程地址 */
function updateWorkThumb(workId, dataUrl, remoteUrl) {
  const id = String(workId || '');
  const data = compactText(dataUrl);
  if (!id || !data || !/^data:image\//i.test(data)) return false;
  const list = getWorks();
  const w = list.find((x) => x && x.id === id);
  if (!w) return false;
  if (remoteUrl) w.thumbUrl = compactText(remoteUrl) || w.thumbUrl;
  else if (w.thumb && !/^data:/i.test(w.thumb)) w.thumbUrl = w.thumb;
  w.thumb = data;
  w.updated_at = new Date().toISOString();
  saveWorks(list);
  triggerWebDavDirty();
  return true;
}

/**
 * 远程缩略图 → 本地 data URL（缩小后，控制 GM 存储体积）。
 * 失败则 resolve 空串，由调用方保留原 URL。
 * @param {string} url
 * @returns {Promise<string>}
 */
function cacheThumbToDataUrl(url) {
  const src = compactText(url);
  if (!src) return Promise.resolve('');
  if (/^data:image\//i.test(src)) return Promise.resolve(src);
  if (typeof GM_xmlhttpRequest !== 'function') return Promise.resolve('');

  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => {
      if (settled) return;
      settled = true;
      resolve(v || '');
    };

    GM_xmlhttpRequest({
      method: 'GET',
      url: src,
      responseType: 'blob',
      timeout: 20000,
      headers: {
        // 部分 CDN 对空 Referer 更友好
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
      },
      onload(res) {
        try {
          if (!res || res.status < 200 || res.status >= 300 || !res.response) {
            done('');
            return;
          }
          const blob = res.response;
          if (!blob || !(blob.size > 0) || blob.size > 2.5 * 1024 * 1024) {
            done('');
            return;
          }
          const reader = new FileReader();
          reader.onerror = () => done('');
          reader.onload = () => {
            const raw = String(reader.result || '');
            if (!/^data:image\//i.test(raw)) {
              done('');
              return;
            }
            // 缩到约 160×120，作品列表封面够用
            shrinkImageDataUrl(raw, 160, 120)
              .then((small) => done(small || raw))
              .catch(() => done(raw));
          };
          reader.readAsDataURL(blob);
        } catch (_) {
          done('');
        }
      },
      onerror: () => done(''),
      ontimeout: () => done(''),
      onabort: () => done('')
    });
  });
}

/**
 * data URL 缩小（canvas）。不可用时原样返回。
 * @param {string} dataUrl
 * @param {number} maxW
 * @param {number} maxH
 * @returns {Promise<string>}
 */
function shrinkImageDataUrl(dataUrl, maxW, maxH) {
  return new Promise((resolve) => {
    try {
      if (typeof Image === 'undefined' || typeof document === 'undefined') {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          let w = img.naturalWidth || img.width || 0;
          let h = img.naturalHeight || img.height || 0;
          if (w < 8 || h < 8) {
            resolve(dataUrl);
            return;
          }
          const mw = Math.max(32, maxW || 160);
          const mh = Math.max(32, maxH || 120);
          const scale = Math.min(1, mw / w, mh / h);
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          let out = '';
          try {
            out = canvas.toDataURL('image/jpeg', 0.72);
          } catch (_) {
            out = canvas.toDataURL('image/png');
          }
          // 过大则仍用原图（少见）
          if (out && out.length < dataUrl.length * 1.2) resolve(out);
          else resolve(dataUrl);
        } catch (_) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch (_) {
      resolve(dataUrl);
    }
  });
}

// Tracks：搜索追更（存储一站一条；UI 按 query 折叠）
function getTracks() {
  const val = GM_getValue('creamu_scout_tracks', null);
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch(_) { return []; }
  }
  return [];
}

function saveTracks(tracks) {
  GM_setValue('creamu_scout_tracks', tracks);
}

/** 搜索词归一化：大小写、+、空白；and/or 折叠便于断点匹配 */
function normalizeSearchQueryKey(q) {
  return String(q == null ? '' : q)
    .toLowerCase()
    .replace(/\+/g, ' ')
    .replace(/\s+and\s+/g, ' ')
    .replace(/\s+or\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findTrackBySiteQuery(site, query) {
  const siteNorm = String(site || '');
  const key = normalizeSearchQueryKey(query);
  if (!siteNorm || !key) return null;
  const tracks = getTracks();
  return (
    tracks.find(
      (t) =>
        t.site === siteNorm &&
        normalizeSearchQueryKey(t.query) === key
    ) || null
  );
}

function addTrack({ site, query, label, url }) {
  const tracks = getTracks();
  const siteNorm = String(site || '');
  const queryNorm = String(query || '').trim();
  const existing = findTrackBySiteQuery(siteNorm, queryNorm);
  if (existing) {
    if (label) existing.label = String(label);
    if (url) existing.url = String(url);
    // 若原先 query 写法不同，统一成当前写法便于展示
    if (queryNorm) existing.query = queryNorm;
    existing.updated_at = new Date().toISOString();
    saveTracks(tracks);
    triggerWebDavDirty();
    return existing;
  }
  const newTrack = {
    id: 'track_' + uid(),
    site: siteNorm,
    query: queryNorm,
    label: String(label || queryNorm),
    url: String(url || ''),
    last_seen_item: '',
    last_seen_page: 1,
    updated_at: new Date().toISOString()
  };
  tracks.push(newTrack);
  saveTracks(tracks);
  triggerWebDavDirty();
  return newTrack;
}

function updateTrack(id, fields) {
  const tracks = getTracks();
  const track = tracks.find(t => t.id === id);
  if (track) {
    Object.assign(track, fields);
    track.updated_at = new Date().toISOString();
    saveTracks(tracks);
    triggerWebDavDirty();
    return track;
  }
  return null;
}

function deleteTrack(id) {
  let tracks = getTracks();
  const len = tracks.length;
  tracks = tracks.filter(t => t.id !== id);
  if (tracks.length !== len) {
    saveTracks(tracks);
    triggerWebDavDirty();
    return true;
  }
  return false;
}

/** 三站固定顺序；列表展示时再按「当前站优先」重排 */
const SCOUT_SITE_IDS = ['xvideos', 'xnxx', 'eporner'];

function scoutSiteShortLabel(site) {
  const m = { xvideos: 'XV', xnxx: 'XN', eporner: 'EP' };
  const s = String(site || '');
  return m[s] || (s ? s.toUpperCase().slice(0, 3) : '?');
}

/**
 * 当前站优先的站点顺序（用于追更展开行 / 作品三站芯片）。
 * @param {string|null|undefined} currentSite
 * @returns {string[]}
 */
function orderSitesCurrentFirst(currentSite) {
  const cur = String(currentSite || '');
  if (cur && SCOUT_SITE_IDS.indexOf(cur) >= 0) {
    return [cur].concat(SCOUT_SITE_IDS.filter((s) => s !== cur));
  }
  return SCOUT_SITE_IDS.slice();
}

/**
 * 按归一化 query 折叠 tracks（存储仍是一站一条，仅展示聚合）。
 * @param {object[]|null} [tracks]
 * @returns {{ key:string, query:string, label:string, tracks:object[], updated_at:string, siteCount:number }[]}
 */
function groupTracksByQuery(tracks) {
  const list = Array.isArray(tracks) ? tracks : getTracks();
  const map = new Map();
  list.forEach((t) => {
    if (!t) return;
    const key = normalizeSearchQueryKey(t.query);
    if (!key) return;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        query: String(t.query || '').trim(),
        label: String(t.label || t.query || key),
        tracks: [],
        updated_at: t.updated_at || ''
      };
      map.set(key, g);
    }
    g.tracks.push(t);
    const tAt = new Date(t.updated_at || 0).getTime();
    const gAt = new Date(g.updated_at || 0).getTime();
    if (tAt >= gAt) {
      g.updated_at = t.updated_at || g.updated_at;
      if (t.label) g.label = String(t.label);
      if (t.query) g.query = String(t.query).trim();
    }
  });
  return Array.from(map.values())
    .map((g) => {
      g.siteCount = g.tracks.length;
      return g;
    })
    .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
}

function findTrackInGroup(group, site) {
  if (!group || !Array.isArray(group.tracks)) return null;
  const siteNorm = String(site || '');
  if (!siteNorm) return null;
  return group.tracks.find((t) => t && t.site === siteNorm) || null;
}

/** 删除同一归一化 query 下所有站的追更 */
function deleteTracksByQueryKey(queryKey) {
  const key = normalizeSearchQueryKey(queryKey);
  if (!key) return 0;
  const tracks = getTracks();
  const next = tracks.filter((t) => normalizeSearchQueryKey(t && t.query) !== key);
  const n = tracks.length - next.length;
  if (n > 0) {
    saveTracks(next);
    triggerWebDavDirty();
  }
  return n;
}

/**
 * 作品标题 → 跨站搜索 query（去分辨率等噪声，最多 8 词）。
 * 不做自动绑定，仅 L0「去搜」。
 */
function workSearchQueryFromTitle(title) {
  let t = compactText(title);
  if (!t) return '';
  t = t
    .replace(/\b(?:\d{3,4}p|4k|uhd|hd|full\s*hd|full\s*video|xxx|porn)\b/gi, ' ')
    .replace(/[^\w\s'’\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length > 8) return words.slice(0, 8).join(' ');
  return t;
}

// Config
function getConfig() {
  const def = {
    webdav_enabled: false,
    webdav_url: '',
    webdav_user: '',
    webdav_password: '',
    webdav_path: '/Creamu',
    webdav_auto: true,
    webdav_conflict: 'ask',
    /** 三站页面奶油主题（列表/顶栏/底色）；与工作台样式独立，可关 */
    cream_site_theme: true,
    /** 列表点影片是否新标签打开（默认开，避免站点当前页跳转） */
    open_videos_new_tab: true,
    /**
     * 关闭站点列表自动预览（xv/xnxx 滑过/进视野自动播会卡顿）。
     * 不影响 Creamu「点缩略图才播」的预览。默认开。
     */
    block_site_auto_preview: true,
    /**
     * 组合搜索多词连接：and（默认，多站更稳）| space | or
     */
    combo_join: 'and'
  };
  const val = GM_getValue('creamu_scout_config', null);
  if (val && typeof val === 'object') {
    return Object.assign(def, val);
  }
  if (typeof val === 'string') {
    try { return Object.assign(def, JSON.parse(val)); } catch(_) { return def; }
  }
  return def;
}

function saveConfig(cfg) {
  GM_setValue('creamu_scout_config', cfg);
  if (typeof applyScoutSiteTheme === 'function') {
    try { applyScoutSiteTheme(); } catch (_) { /* ignore */ }
  }
  if (typeof applyVideoOpenMode === 'function') {
    try { applyVideoOpenMode(); } catch (_) { /* ignore */ }
  }
}

/**
 * 打开链接。默认新标签；油猴用 GM_openInTab 避免 window.open 被拦。
 * @param {string} url
 * @param {{ newTab?: boolean }} [opts]
 */
function openScoutUrl(url, opts) {
  const href = compactText(url);
  if (!href) return false;
  const newTab = !opts || opts.newTab !== false;
  try {
    if (newTab && typeof GM_openInTab === 'function') {
      GM_openInTab(href, { active: true, insert: true, setParent: true });
      return true;
    }
  } catch (_) { /* fall through */ }
  if (newTab) {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  }
  location.href = href;
  return true;
}

function isOpenVideosNewTab() {
  const cfg = getConfig();
  return cfg.open_videos_new_tab !== false;
}

/** 是否拦截站点列表自动预览（默认 true） */
function isBlockSiteAutoPreview() {
  const cfg = getConfig();
  return cfg.block_site_auto_preview !== false;
}

/** 组合搜索连接符：and | space | or */
function getComboJoinMode() {
  const m = (getConfig().combo_join || 'and').toLowerCase();
  if (m === 'space' || m === 'or' || m === 'and') return m;
  return 'and';
}

/**
 * 把已选词拼成站点搜索串。
 * 单 token 内空格保留；token 之间按 and / space / or 连接。
 */
function joinComboQuery(tokens, mode) {
  const list = (Array.isArray(tokens) ? tokens : [])
    .map((t) => compactText(t))
    .filter(Boolean);
  if (!list.length) return '';
  if (list.length === 1) return list[0];
  const m = (mode || getComboJoinMode() || 'and').toLowerCase();
  if (m === 'or') return list.join(' or ');
  if (m === 'space') return list.join(' ');
  // and（默认）：多站对空格拼词更苛刻
  return list.join(' and ');
}

// ----------------------------------------
// Clicked videos（已点片库，与追更断点 tracks 无关）
// key = site|videoId
// ----------------------------------------
const CLICK_MAP_KEY = 'creamu_scout_clicks';
/** 防止无限膨胀：超过上限时按 clicked_at 淘汰最旧 */
const CLICK_MAP_MAX = 8000;

function clickRecordKey(site, videoId) {
  return String(site || '') + '|' + String(videoId || '');
}

function getClickMap() {
  const val = GM_getValue(CLICK_MAP_KEY, null);
  if (val && typeof val === 'object' && !Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (_) { /* ignore */ }
  }
  // 兼容：若曾存成数组 [{site,id,...}]
  if (Array.isArray(val)) {
    const map = {};
    val.forEach(row => {
      if (!row) return;
      const id = row.videoId || row.id || '';
      const site = row.site || '';
      if (!id) return;
      map[clickRecordKey(site, id)] = row;
    });
    return map;
  }
  return {};
}

function saveClickMap(map) {
  GM_setValue(CLICK_MAP_KEY, map || {});
}

function pruneClickMap(map) {
  const keys = Object.keys(map || {});
  if (keys.length <= CLICK_MAP_MAX) return map;
  keys.sort((a, b) => {
    const ta = new Date((map[a] && map[a].clicked_at) || 0).getTime() || 0;
    const tb = new Date((map[b] && map[b].clicked_at) || 0).getTime() || 0;
    return ta - tb; // 旧 → 新
  });
  const drop = keys.length - CLICK_MAP_MAX;
  for (let i = 0; i < drop; i++) delete map[keys[i]];
  return map;
}

function isVideoClicked(site, videoId) {
  if (!videoId) return false;
  const map = getClickMap();
  if (map[clickRecordKey(site, videoId)]) return true;
  // 兼容：旧记录存整段 pathname，新逻辑用短 id
  const short =
    typeof videoIdFromUrl === 'function' ? videoIdFromUrl(videoId) : '';
  if (short && short !== videoId && map[clickRecordKey(site, short)]) return true;
  const siteNorm = String(site || '');
  for (const key of Object.keys(map)) {
    const row = map[key];
    if (!row || String(row.site || '') !== siteNorm) continue;
    if (typeof videoIdsMatch === 'function') {
      if (videoIdsMatch(row.id, videoId) || (short && videoIdsMatch(row.id, short))) return true;
    } else if (row.id === videoId || (short && row.id === short)) {
      return true;
    }
  }
  return false;
}

/**
 * 标记已点。同一片再次点击只刷新本地时间，不重复触发同步。
 * @returns {object|null} 记录
 */
function markVideoClicked({ site, videoId, title, url, thumb, uploader }) {
  const id = compactText(videoId);
  if (!id) return null;
  const siteNorm = String(
    site || (typeof detectSite === 'function' ? detectSite() : '') || ''
  );
  const key = clickRecordKey(siteNorm, id);
  const map = getClickMap();
  const prev = map[key];
  const now = new Date().toISOString();
  const isNew = !prev;
  const row = {
    id,
    site: siteNorm,
    title: compactText(title) || (prev && prev.title) || '',
    url: compactText(url) || (prev && prev.url) || '',
    thumb: compactText(thumb) || (prev && prev.thumb) || '',
    uploader: compactText(uploader) || (prev && prev.uploader) || '',
    clicked: true,
    clicked_at: now,
    first_clicked_at: (prev && prev.first_clicked_at) || now
  };
  map[key] = row;
  if (isNew) pruneClickMap(map);
  saveClickMap(map);
  // 仅首次记入已点时标脏同步，避免 hover/重复 pointerdown 刷 WebDAV
  if (isNew) triggerWebDavDirty();
  return row;
}

function getClickedList() {
  return Object.values(getClickMap()).filter(Boolean);
}

function getClickedCount() {
  return Object.keys(getClickMap()).length;
}

function clearAllClicks() {
  saveClickMap({});
  triggerWebDavDirty();
}

function normalizeClickRow(row) {
  if (!row) return null;
  const id = compactText(row.videoId || row.id);
  if (!id) return null;
  const site = String(row.site || '');
  const now = new Date().toISOString();
  return {
    id,
    site,
    title: compactText(row.title),
    url: compactText(row.url),
    thumb: compactText(row.thumb),
    uploader: compactText(row.uploader),
    clicked: true,
    clicked_at: row.clicked_at || now,
    first_clicked_at: row.first_clicked_at || row.clicked_at || now
  };
}

/** WebDAV 整包覆盖：vault 为权威快照 */
function replaceClickRecords(incoming) {
  const map = {};
  const list = Array.isArray(incoming)
    ? incoming
    : (incoming && typeof incoming === 'object' ? Object.values(incoming) : []);
  for (const raw of list) {
    const row = normalizeClickRow(raw);
    if (!row) continue;
    map[clickRecordKey(row.site, row.id)] = row;
  }
  pruneClickMap(map);
  saveClickMap(map);
}

/** 本地 JSON 包合并（按 key；保留更早 first_clicked_at、更新的 clicked_at） */
function mergeClickRecords(incoming) {
  if (incoming == null) return;
  const map = getClickMap();
  const list = Array.isArray(incoming)
    ? incoming
    : (typeof incoming === 'object' ? Object.values(incoming) : []);
  for (const raw of list) {
    const row = normalizeClickRow(raw);
    if (!row) continue;
    const key = clickRecordKey(row.site, row.id);
    const prev = map[key];
    if (!prev) {
      map[key] = row;
      continue;
    }
    const remoteFirst = new Date(row.first_clicked_at || 0).getTime() || 0;
    const localFirst = new Date(prev.first_clicked_at || prev.clicked_at || 0).getTime() || 0;
    if (remoteFirst && (!localFirst || remoteFirst < localFirst)) {
      prev.first_clicked_at = row.first_clicked_at || row.clicked_at;
    }
    const remoteAt = new Date(row.clicked_at || 0).getTime() || 0;
    const localAt = new Date(prev.clicked_at || 0).getTime() || 0;
    if (remoteAt >= localAt) {
      prev.clicked_at = row.clicked_at || prev.clicked_at;
      if (row.title) prev.title = row.title;
      if (row.url) prev.url = row.url;
      if (row.thumb) prev.thumb = row.thumb;
      if (row.uploader) prev.uploader = row.uploader;
    }
    prev.clicked = true;
    map[key] = prev;
  }
  pruneClickMap(map);
  saveClickMap(map);
}

// 导入导出（完整包含 tracks/clicks/works；lex 合包仅 terms+blocks）
function exportLexiconPackage() {
  const pkg = {
    format: "creamu-scout-lexicon",
    version: 3,
    exported_at: new Date().toISOString(),
    site_hint: "xvideos|xnxx|eporner|mixed",
    types: getLexiconTypes(),
    terms: getLexiconTerms(),
    blocks: getBlockList(),
    publishers: getPublishers(),
    tracks: getTracks(),
    clicks: getClickedList(),
    works: getWorks()
  };
  return JSON.stringify(pkg, null, 2);
}

/** 外部编辑用的格式说明（随导出包附带） */
function getScoutAiPromptText() {
  return [
    '你是 Creamu · Scout 的词库/屏蔽编辑助手。',
    '用户会给你一份 JSON。请严格遵守格式：补全中文、归类、增补合理词条、优化屏蔽。',
    '',
    '【两套数据，严禁混用】',
    '1) terms（词库）= 用于「组合搜索」的词。',
    '2) blocks（屏蔽）= 列表匹配后淡化/隐藏的词。',
    '→ 要屏蔽的词只能写在 blocks，禁止写进 terms（即使 note 写「用于屏蔽」也不行）。',
    '',
    '【字段】',
    '· 每条 terms / blocks 必须有 text（主键；尽量勿改已有 text）。',
    '· terms 可选：zh, type, loved(boolean), status(unreviewed|confirmed|retired), note。',
    '· type 只能用 types 数组里已有分类；未知则用「未分类」。',
    '· blocks 每条一个词；禁止在 text/match 写正则，禁止用 | 拼多个词。',
    '· blocks.mode 仅 dim | hide；match 仅 word | sub；scope 仅 title | uploader | both。',
    '· blocks 可选：zh, reason。',
    '',
    '【输出】',
    '1. 只输出一个完整 JSON（或先 JSON 再极短说明）。',
    '2. 顶层必须含：format:"creamu-scout-ai", version:1, types, terms, blocks。',
    '3. 合并用户原有条目：保留合理 heat/use；可新增；不要删光。',
    '4. 分类名以用户 types 为准；增补词条归入已有 type。',
    '',
    '【blocks 正确】',
    '{ "text": "spamword", "zh": "垃圾词", "reason": "不想看到", "mode": "hide", "match": "word", "scope": "title" }',
    '',
    '【blocks 错误】',
    '{ "mode": "block", "match": "a|b|c", "scope": "all" }  ← 无 text、match 当正则、mode/scope 非法',
    '',
    '【terms 正确】',
    '{ "text": "example", "zh": "示例", "type": "未分类", "loved": false, "status": "confirmed", "note": "" }',
    '',
    '下面是用户当前数据包，请直接处理并输出完整 JSON：'
  ].join('\n');
}

/** 词库+屏蔽导出（不含熟人/断点/已点） */
function exportAiLexiconPackage() {
  const terms = getLexiconTerms().map((t) => ({
    text: t.text,
    zh: t.zh || '',
    type: t.type || '未分类',
    loved: !!t.loved,
    status: t.status || 'unreviewed',
    note: t.note || '',
    heat: Number(t.heat) || 0,
    use: Number(t.use) || 0,
    good: Number(t.good) || 0,
    bad: Number(t.bad) || 0
  }));
  const blocks = getBlockList().map((b) => ({
    text: b.text,
    zh: b.zh || '',
    reason: b.reason || '',
    mode: b.mode || 'dim',
    match: normalizeBlockMatch(b.match),
    scope: normalizeBlockScope(b.scope),
    heat: Number(b.heat) || 1
  }));
  return JSON.stringify({
    format: 'creamu-scout-ai',
    version: 1,
    purpose:
      '词库+屏蔽合包。terms=搜索用词；blocks=屏蔽词（一条一个 text）。' +
      'mode 仅 dim|hide；match 仅 word|sub；scope 仅 title|uploader|both。屏蔽勿进 terms。',
    schema: {
      terms: '{ text, zh?, type?, loved?, status?, note? }',
      blocks: '{ text, zh?, reason?, mode: dim|hide, match: word|sub, scope: title|uploader|both }'
    },
    ai_prompt: getScoutAiPromptText(),
    exported_at: new Date().toISOString(),
    types: getLexiconTypes(),
    terms,
    blocks
  }, null, 2);
}

/** 提示词 + 数据包（便于外部编辑） */
function exportAiLexiconForChat() {
  const data = exportAiLexiconPackage();
  return getScoutAiPromptText() + '\n\n```json\n' + data + '\n```\n';
}

function parseScoutJsonPackage(jsonStr) {
  const raw = compactText(jsonStr);
  if (!raw) throw new Error('内容为空');
  let pkg;
  try {
    pkg = JSON.parse(raw);
  } catch (_) {
    throw new Error('不是合法 JSON');
  }
  if (Array.isArray(pkg)) {
    // 裸数组：按字段猜词库或屏蔽
    if (pkg.length && pkg[0] && (pkg[0].mode || pkg[0].match || pkg[0].scope || pkg[0].reason)) {
      return { format: 'creamu-scout-blocks', blocks: pkg };
    }
    return { format: 'creamu-scout-terms', terms: pkg };
  }
  if (!pkg || typeof pkg !== 'object') throw new Error('包格式无效');
  return pkg;
}

/** note 标明用于屏蔽的词条 → 导入时改走 blocks */
function termLooksLikeBlockOnly(t) {
  if (!t) return false;
  if (t.as_block === true || t.block_only === true || t.block === true) return true;
  const note = compactText(t.note);
  if (/用于屏蔽|仅屏蔽|屏蔽用|block\s*only|do\s*not\s*search/i.test(note)) return true;
  return false;
}

/** mode：dim|hide；兼容 block/strong → hide */
function normalizeAiBlockMode(m) {
  const s = String(m == null ? '' : m).toLowerCase().trim();
  if (s === 'hide' || s === 'block' || s === 'hidden' || s === 'strong' || s === 'hard') return 'hide';
  return 'dim';
}

/** scope：title|uploader|both；兼容 all → both */
function normalizeAiBlockScope(s) {
  const v = String(s == null ? '' : s).toLowerCase().trim();
  if (v === 'uploader' || v === 'channel' || v === 'author') return 'uploader';
  if (v === 'both' || v === 'all' || v === 'any' || v === 'everywhere') return 'both';
  return 'title';
}

/**
 * 把不规范的 blocks 展平成脚本格式：
 * - 每条必须有 text（一个屏蔽词一条）
 * - match 字段只能是 word|sub；若写成 black|negro 则拆成多条 text
 * - mode: block → hide；scope: all → both
 */
function expandAiBlockRows(blocks) {
  const out = [];
  const seen = new Set();
  const pushText = (text, base) => {
    const t = sanitizeLexiconText(text) || compactText(text);
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      text: t,
      zh: compactText(base && base.zh),
      reason: compactText(base && base.reason),
      mode: normalizeAiBlockMode(base && base.mode),
      match: (function () {
        const m = compactText(base && base.match).toLowerCase();
        return m === 'sub' || m === 'substring' || m === 'contains' ? 'sub' : 'word';
      })(),
      scope: normalizeAiBlockScope(base && base.scope),
      heat: Number(base && base.heat) || 1,
      id: base && base.id,
      created_at: base && base.created_at
    });
  };

  (Array.isArray(blocks) ? blocks : []).forEach((b) => {
    if (!b || typeof b !== 'object') return;
    const texts = [];
    const rawText = compactText(b.text);
    const rawMatch = compactText(b.match);

    // match 若是 word/sub → 匹配方式；否则当「关键词列表」误写
    let matchIsMode = false;
    if (/^(word|sub|substring|contains)$/i.test(rawMatch)) {
      matchIsMode = true;
    }

    if (rawText) {
      if (/[|｜,，;；]/.test(rawText)) {
        rawText.split(/[|｜,，;；]+/).forEach((p) => texts.push(p));
      } else {
        texts.push(rawText);
      }
    }
    if (!matchIsMode && rawMatch) {
      rawMatch.split(/[|｜,，;；]+/).forEach((p) => texts.push(p));
    }
    if (Array.isArray(b.texts)) {
      b.texts.forEach((p) => texts.push(p));
    }
    if (Array.isArray(b.keywords)) {
      b.keywords.forEach((p) => texts.push(p));
    }

    // 纠正 match 字段：只有 word/sub 才保留给 base
    const base = Object.assign({}, b, {
      match: matchIsMode ? rawMatch : (b.match_mode || b.matchType || 'word')
    });

    if (!texts.length) return;
    texts.forEach((t) => pushText(t, base));
  });
  return out;
}

/**
 * 从词库删除指定 text（大小写不敏感）。
 * 用于：屏蔽词不应出现在组合搜索词库。
 */
function removeLexiconTermsByTexts(texts) {
  const set = new Set(
    (Array.isArray(texts) ? texts : [])
      .map((t) => lexiconIdentityKey(t))
      .filter(Boolean)
  );
  if (!set.size) return 0;
  const terms = getLexiconTerms();
  const next = terms.filter((t) => !set.has(lexiconIdentityKey(t && t.text)));
  const removed = terms.length - next.length;
  if (removed > 0) {
    saveLexiconTerms(next);
    triggerWebDavDirty();
  }
  return removed;
}

/**
 * 清理词库里不该存在的屏蔽词：
 * 1) note/标记 表明「用于屏蔽」
 * 2) text 已在屏蔽列表中（同词不应两边都有）
 */
function purgeBlockedTermsFromLexicon() {
  const blocks = getBlockList();
  const blockTexts = blocks.map((b) => b && b.text).filter(Boolean);
  let removed = 0;

  // 已在屏蔽表中的 text → 踢出词库
  removed += removeLexiconTermsByTexts(blockTexts);

  // 仍残留「用于屏蔽」标记的
  const leftover = getLexiconTerms().filter((t) => termLooksLikeBlockOnly(t));
  if (leftover.length) {
    leftover.forEach((t) => {
      // 确保进屏蔽表
      addBlockWord({
        text: t.text,
        zh: t.zh,
        reason: compactText(t.note) || '自词库清理：用于屏蔽',
        mode: 'hide',
        match: 'word',
        scope: 'both'
      });
    });
    removed += removeLexiconTermsByTexts(leftover.map((t) => t.text));
  }
  return removed;
}

function mergeTermsFromPackage(pkg) {
  if (!pkg) return { types: 0, terms: 0, divertedBlocks: [] };
  let typeN = 0;
  let termN = 0;
  const divertedBlocks = [];
  if (Array.isArray(pkg.types)) {
    const currentTypes = getLexiconTypes();
    const mergedTypes = Array.from(new Set([...currentTypes, ...pkg.types]));
    typeN = mergedTypes.length - currentTypes.length;
    saveLexiconTypes(mergedTypes);
  }
  if (Array.isArray(pkg.terms)) {
    // 先压掉本地已有重复，再按 identity 合并包内条目
    dedupeLexiconTermsStore();
    const currentTerms = getLexiconTerms();
    const before = currentTerms.length;
    const indexByKey = new Map();
    currentTerms.forEach((t, i) => {
      const k = lexiconIdentityKey(t && t.text);
      if (k && !indexByKey.has(k)) indexByKey.set(k, i);
    });

    for (const newT of pkg.terms) {
      if (!newT || !newT.text) continue;
      // 屏蔽意图的条目不进词库
      if (termLooksLikeBlockOnly(newT)) {
        divertedBlocks.push({
          text: sanitizeLexiconText(newT.text) || compactText(newT.text),
          zh: newT.zh,
          reason: compactText(newT.note) || compactText(newT.reason) || '自词库字段标记为屏蔽',
          mode: newT.mode || 'hide',
          match: newT.match || 'word',
          scope: newT.scope || 'both'
        });
        continue;
      }
      const textNorm = sanitizeLexiconText(newT.text);
      if (!textNorm) continue;
      const key = textNorm.toLowerCase();
      const idx = indexByKey.get(key);
      if (idx != null) {
        const existing = currentTerms[idx];
        existing.text = sanitizeLexiconText(existing.text) || textNorm;
        mergeLexiconTermFields(existing, newT, { preferIncomingMeta: true, bumpHeat: false });
        termN++;
      } else {
        currentTerms.push({
          id: newT.id || 'term_' + uid(),
          text: textNorm,
          zh: compactText(newT.zh),
          type: newT.type || '未分类',
          subtypes: newT.subtypes || [],
          loved: !!newT.loved,
          status: newT.status || 'unreviewed',
          heat: Number(newT.heat) || 1,
          use: Number(newT.use) || 0,
          good: Number(newT.good) || 0,
          bad: Number(newT.bad) || 0,
          sources: newT.sources || [],
          note: compactText(newT.note),
          last_used_at: newT.last_used_at || new Date().toISOString(),
          created_at: newT.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        indexByKey.set(key, currentTerms.length - 1);
        termN++;
      }
    }
    saveLexiconTerms(currentTerms);
    // 包内若仍有重复/脏键，再压一次
    dedupeLexiconTermsStore();
    if (termN === 0 && getLexiconTerms().length > before) {
      termN = getLexiconTerms().length - before;
    }
  }
  return { types: typeN, terms: termN, divertedBlocks };
}

function mergeBlocksFromPackage(pkg) {
  if (!pkg) return { blocks: 0 };
  const rawList = Array.isArray(pkg.blocks) ? pkg.blocks : [];
  const rows = expandAiBlockRows(rawList);
  if (!rows.length) return { blocks: 0 };
  dedupeBlockListStore();
  const currentBlocks = getBlockList();
  const indexByKey = new Map();
  currentBlocks.forEach((b, i) => {
    const k = lexiconIdentityKey(b && b.text);
    if (k && !indexByKey.has(k)) indexByKey.set(k, i);
  });
  let n = 0;
  for (const newB of rows) {
    if (!newB || !newB.text) continue;
    const textNorm = sanitizeLexiconText(newB.text) || compactText(newB.text);
    if (!textNorm) continue;
    const key = textNorm.toLowerCase();
    const idx = indexByKey.get(key);
    if (idx != null) {
      const existing = currentBlocks[idx];
      existing.text = sanitizeLexiconText(existing.text) || textNorm;
      if (newB.zh != null && compactText(newB.zh)) existing.zh = compactText(newB.zh);
      if (newB.reason != null && compactText(newB.reason)) existing.reason = compactText(newB.reason);
      existing.mode = normalizeAiBlockMode(newB.mode || existing.mode);
      existing.match = normalizeBlockMatch(newB.match);
      existing.scope = normalizeAiBlockScope(newB.scope || existing.scope);
      if (newB.heat != null) existing.heat = Math.max(existing.heat || 0, Number(newB.heat) || 0);
      n++;
    } else {
      currentBlocks.push({
        id: newB.id || 'block_' + uid(),
        text: textNorm,
        zh: compactText(newB.zh),
        reason: compactText(newB.reason),
        mode: normalizeAiBlockMode(newB.mode),
        match: normalizeBlockMatch(newB.match),
        scope: normalizeAiBlockScope(newB.scope),
        heat: Number(newB.heat) || 1,
        created_at: newB.created_at || new Date().toISOString()
      });
      indexByKey.set(key, currentBlocks.length - 1);
      n++;
    }
  }
  saveBlockList(currentBlocks);
  dedupeBlockListStore();
  return { blocks: n };
}

/**
 * 覆盖写词库：以包内 terms 为完整清单，包外旧词删除。
 * 同 text 保留本地 heat/use/good/bad/id/sources/created_at/last_used_at/loved。
 * 元数据（zh/type/status/note）以包为准。
 */
function replaceTermsFromPackage(pkg) {
  if (!pkg) return { types: 0, terms: 0, keptStats: 0, removed: 0, divertedBlocks: [] };
  const divertedBlocks = [];
  let typeN = 0;

  if (Array.isArray(pkg.types) && pkg.types.length) {
    const nextTypes = Array.from(new Set(pkg.types.map((t) => compactText(t)).filter(Boolean)));
    if (nextTypes.length) {
      saveLexiconTypes(nextTypes);
      typeN = nextTypes.length;
    }
  }

  if (!Array.isArray(pkg.terms)) {
    return { types: typeN, terms: 0, keptStats: 0, removed: 0, divertedBlocks };
  }

  const oldList = getLexiconTerms();
  const oldByKey = new Map();
  oldList.forEach((t) => {
    const k = lexiconIdentityKey(t && t.text);
    if (!k) return;
    if (!oldByKey.has(k)) oldByKey.set(k, t);
    else {
      // 本地重复：热度累加到先见那条
      const keep = oldByKey.get(k);
      keep.heat = (Number(keep.heat) || 0) + (Number(t.heat) || 0);
      keep.use = (Number(keep.use) || 0) + (Number(t.use) || 0);
      keep.good = (Number(keep.good) || 0) + (Number(t.good) || 0);
      keep.bad = (Number(keep.bad) || 0) + (Number(t.bad) || 0);
    }
  });

  const next = [];
  const seen = new Set();
  let keptStats = 0;
  const now = new Date().toISOString();

  for (const newT of pkg.terms) {
    if (!newT || !newT.text) continue;
    if (termLooksLikeBlockOnly(newT)) {
      divertedBlocks.push({
        text: sanitizeLexiconText(newT.text) || compactText(newT.text),
        zh: newT.zh,
        reason: compactText(newT.note) || compactText(newT.reason) || '自词库字段标记为屏蔽',
        mode: newT.mode || 'hide',
        match: newT.match || 'word',
        scope: newT.scope || 'both'
      });
      continue;
    }
    const textNorm = sanitizeLexiconText(newT.text);
    if (!textNorm) continue;
    const key = textNorm.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const old = oldByKey.get(key);
    const pkgHeat = Number(newT.heat) || 0;
    const pkgUse = Number(newT.use) || 0;
    const pkgGood = Number(newT.good) || 0;
    const pkgBad = Number(newT.bad) || 0;

    if (old) {
      keptStats++;
      next.push({
        id: old.id || newT.id || 'term_' + uid(),
        text: textNorm,
        zh: compactText(newT.zh != null ? newT.zh : old.zh),
        type: (newT.type && newT.type !== '未分类') ? newT.type : (old.type || '未分类'),
        subtypes: Array.isArray(newT.subtypes) ? newT.subtypes : (old.subtypes || []),
        loved: newT.loved !== undefined ? !!newT.loved : !!old.loved,
        status: newT.status || old.status || 'unreviewed',
        // 热度：本地与包取较大，避免导入 heat=0 冲掉使用记录
        heat: Math.max(Number(old.heat) || 0, pkgHeat, 1),
        use: Math.max(Number(old.use) || 0, pkgUse),
        good: Math.max(Number(old.good) || 0, pkgGood),
        bad: Math.max(Number(old.bad) || 0, pkgBad),
        sources: old.sources || newT.sources || [],
        note: compactText(newT.note != null ? newT.note : old.note),
        last_used_at: old.last_used_at || newT.last_used_at || now,
        created_at: old.created_at || newT.created_at || now,
        updated_at: now
      });
    } else {
      next.push({
        id: newT.id || 'term_' + uid(),
        text: textNorm,
        zh: compactText(newT.zh),
        type: newT.type || '未分类',
        subtypes: newT.subtypes || [],
        loved: !!newT.loved,
        status: newT.status || 'unreviewed',
        heat: pkgHeat > 0 ? pkgHeat : 1,
        use: pkgUse,
        good: pkgGood,
        bad: pkgBad,
        sources: newT.sources || [],
        note: compactText(newT.note),
        last_used_at: newT.last_used_at || now,
        created_at: newT.created_at || now,
        updated_at: now
      });
    }
  }

  const removed = oldList.length - keptStats;
  saveLexiconTerms(next);
  return {
    types: typeN,
    terms: next.length,
    keptStats,
    removed: removed > 0 ? removed : 0,
    divertedBlocks
  };
}

/**
 * 覆盖写屏蔽：以包内 blocks 为完整清单。
 * 同 text 保留本地 heat/id/created_at。
 */
function replaceBlocksFromPackage(pkg) {
  if (!pkg) return { blocks: 0, keptStats: 0, removed: 0 };
  const rawList = Array.isArray(pkg.blocks) ? pkg.blocks : [];
  const rows = expandAiBlockRows(rawList);
  const oldList = getBlockList();
  const oldByKey = new Map();
  oldList.forEach((b) => {
    const k = lexiconIdentityKey(b && b.text);
    if (k && !oldByKey.has(k)) oldByKey.set(k, b);
  });

  const next = [];
  const seen = new Set();
  let keptStats = 0;
  const now = new Date().toISOString();

  for (const newB of rows) {
    if (!newB || !newB.text) continue;
    const textNorm = sanitizeLexiconText(newB.text) || compactText(newB.text);
    if (!textNorm) continue;
    const key = textNorm.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const old = oldByKey.get(key);
    if (old) {
      keptStats++;
      next.push({
        id: old.id || newB.id || 'block_' + uid(),
        text: textNorm,
        zh: compactText(newB.zh != null && compactText(newB.zh) ? newB.zh : old.zh),
        reason: compactText(newB.reason != null && compactText(newB.reason) ? newB.reason : old.reason),
        mode: normalizeAiBlockMode(newB.mode || old.mode),
        match: normalizeBlockMatch(newB.match || old.match),
        scope: normalizeAiBlockScope(newB.scope || old.scope),
        heat: Math.max(Number(old.heat) || 0, Number(newB.heat) || 0, 1),
        created_at: old.created_at || newB.created_at || now
      });
    } else {
      next.push({
        id: newB.id || 'block_' + uid(),
        text: textNorm,
        zh: compactText(newB.zh),
        reason: compactText(newB.reason),
        mode: normalizeAiBlockMode(newB.mode),
        match: normalizeBlockMatch(newB.match),
        scope: normalizeAiBlockScope(newB.scope),
        heat: Number(newB.heat) || 1,
        created_at: newB.created_at || now
      });
    }
  }

  const removed = oldList.length - keptStats;
  saveBlockList(next);
  return {
    blocks: next.length,
    keptStats,
    removed: removed > 0 ? removed : 0
  };
}

/**
 * 导入词库+屏蔽合包。
 * 默认 mode=replace：以包为准覆盖，同词保留本地热度。
 * mode=merge：只增补不删旧词。
 */
function importAiLexiconPackage(jsonStr, options) {
  try {
    const opts = options || {};
    const mode = opts.mode === 'merge' ? 'merge' : 'replace';
    const pkg = parseScoutJsonPackage(jsonStr);
    const fmt = pkg.format || '';
    const okFmt = !fmt
      || fmt === 'creamu-scout-ai'
      || fmt === 'creamu-scout-terms'
      || fmt === 'creamu-scout-blocks'
      || fmt === 'creamu-scout-lexicon';
    if (!okFmt) throw new Error('不是词库/屏蔽包');
    const hasTerms = Array.isArray(pkg.terms) || Array.isArray(pkg.types);
    const hasBlocks = Array.isArray(pkg.blocks);
    if (!hasTerms && !hasBlocks) throw new Error('包内没有 terms / blocks');

    let tr = { types: 0, terms: 0, divertedBlocks: [], keptStats: 0, removed: 0 };
    let br = { blocks: 0, keptStats: 0, removed: 0 };

    if (mode === 'replace') {
      if (hasTerms) tr = replaceTermsFromPackage(pkg);
      const blockPkg = {
        blocks: []
          .concat(hasBlocks ? (pkg.blocks || []) : [])
          .concat(tr.divertedBlocks || [])
      };
      // 仅当包带 blocks 或有改道项时覆盖屏蔽；纯词库包不误清空屏蔽
      if (hasBlocks || (tr.divertedBlocks || []).length) {
        br = replaceBlocksFromPackage(blockPkg);
      }
    } else {
      tr = hasTerms ? mergeTermsFromPackage(pkg) : tr;
      const blockPkg = {
        blocks: []
          .concat(hasBlocks ? (pkg.blocks || []) : [])
          .concat(tr.divertedBlocks || [])
      };
      br = blockPkg.blocks.length ? mergeBlocksFromPackage(blockPkg) : br;
    }

    const purged = purgeBlockedTermsFromLexicon();
    const dedupedTerms = dedupeLexiconTermsStore();
    const dedupedBlocks = dedupeBlockListStore();
    triggerWebDavDirty();
    const diverted = (tr.divertedBlocks || []).length;
    return {
      mode,
      terms: tr.terms,
      types: tr.types,
      blocks: br.blocks,
      keptStats: (tr.keptStats || 0) + (br.keptStats || 0),
      removed: (tr.removed || 0) + (br.removed || 0),
      diverted,
      purged,
      dedupedTerms,
      dedupedBlocks
    };
  } catch (e) {
    showToast(e.message || '词库/屏蔽导入失败', true);
    return null;
  }
}

function importLexiconPackage(jsonStr) {
  try {
    const pkg = JSON.parse(jsonStr);
    if (!pkg || pkg.format !== 'creamu-scout-lexicon') {
      throw new Error('导入失败：不是合法的 Creamu Scout 词库包');
    }
    
    // Merge types
    if (Array.isArray(pkg.types)) {
      const currentTypes = getLexiconTypes();
      const mergedTypes = Array.from(new Set([...currentTypes, ...pkg.types]));
      saveLexiconTypes(mergedTypes);
    }
    
    // Merge terms（identity 合并 + 清洗）
    if (Array.isArray(pkg.terms)) {
      dedupeLexiconTermsStore();
      const currentTerms = getLexiconTerms();
      const indexByKey = new Map();
      currentTerms.forEach((t, i) => {
        const k = lexiconIdentityKey(t && t.text);
        if (k && !indexByKey.has(k)) indexByKey.set(k, i);
      });
      for (const newT of pkg.terms) {
        if (!newT || !newT.text) continue;
        const textNorm = sanitizeLexiconText(newT.text);
        if (!textNorm) continue;
        const key = textNorm.toLowerCase();
        const idx = indexByKey.get(key);
        if (idx != null) {
          const existing = currentTerms[idx];
          existing.text = sanitizeLexiconText(existing.text) || textNorm;
          mergeLexiconTermFields(existing, newT, { preferIncomingMeta: false, sumStats: true });
          if (newT.status === 'confirmed' || existing.status === 'confirmed') {
            existing.status = 'confirmed';
          } else if (newT.status === 'unreviewed' || existing.status === 'unreviewed') {
            existing.status = 'unreviewed';
          }
        } else {
          currentTerms.push({
            id: newT.id || 'term_' + uid(),
            text: textNorm,
            zh: compactText(newT.zh),
            type: newT.type || '未分类',
            subtypes: newT.subtypes || [],
            loved: !!newT.loved,
            status: newT.status || 'unreviewed',
            heat: Number(newT.heat) || 1,
            use: Number(newT.use) || 0,
            good: Number(newT.good) || 0,
            bad: Number(newT.bad) || 0,
            sources: newT.sources || [],
            note: compactText(newT.note),
            last_used_at: newT.last_used_at || new Date().toISOString(),
            created_at: newT.created_at || new Date().toISOString(),
            updated_at: newT.updated_at || new Date().toISOString()
          });
          indexByKey.set(key, currentTerms.length - 1);
        }
      }
      saveLexiconTerms(currentTerms);
      dedupeLexiconTermsStore();
    }
    
    // Merge blocks
    if (Array.isArray(pkg.blocks)) {
      dedupeBlockListStore();
      const currentBlocks = getBlockList();
      const blockIndex = new Map();
      currentBlocks.forEach((b, i) => {
        const k = lexiconIdentityKey(b && b.text);
        if (k && !blockIndex.has(k)) blockIndex.set(k, i);
      });
      for (const newB of pkg.blocks) {
        if (!newB || !newB.text) continue;
        const textNorm = sanitizeLexiconText(newB.text) || compactText(newB.text);
        if (!textNorm) continue;
        const key = textNorm.toLowerCase();
        const idx = blockIndex.get(key);
        if (idx != null) {
          const existing = currentBlocks[idx];
          existing.text = sanitizeLexiconText(existing.text) || textNorm;
          if (!existing.zh && newB.zh) existing.zh = compactText(newB.zh);
          if (newB.reason) {
            const prevReason = existing.reason || '';
            if (!prevReason.includes(newB.reason)) {
              existing.reason = prevReason ? prevReason + '; ' + newB.reason : compactText(newB.reason);
            }
          }
          if (newB.mode) existing.mode = newB.mode;
          if (newB.match) existing.match = normalizeBlockMatch(newB.match);
          if (newB.scope) existing.scope = normalizeBlockScope(newB.scope);
          existing.heat = (existing.heat || 0) + (newB.heat || 0);
        } else {
          currentBlocks.push({
            id: newB.id || 'block_' + uid(),
            text: textNorm,
            zh: compactText(newB.zh),
            reason: compactText(newB.reason),
            mode: newB.mode || 'dim',
            match: normalizeBlockMatch(newB.match),
            scope: normalizeBlockScope(newB.scope),
            heat: Number(newB.heat) || 1,
            created_at: newB.created_at || new Date().toISOString()
          });
          blockIndex.set(key, currentBlocks.length - 1);
        }
      }
      saveBlockList(currentBlocks);
      dedupeBlockListStore();
    }
    
    // Merge publishers
    if (Array.isArray(pkg.publishers)) {
      const currentPubs = getPublishers();
      for (const newP of pkg.publishers) {
        if (!newP.name) continue;
        const nameNorm = compactText(newP.name);
        const existing = currentPubs.find(p => p.name.toLowerCase().trim() === nameNorm.toLowerCase());
        if (existing) {
          if (newP.status) existing.status = newP.status;
          if (newP.note) existing.note = compactText(newP.note);
        } else {
          currentPubs.push({
            id: newP.id || 'pub_' + uid(),
            name: nameNorm,
            site: newP.site || '',
            status: newP.status || 'loved',
            note: compactText(newP.note),
            created_at: newP.created_at || new Date().toISOString()
          });
        }
      }
      savePublishers(currentPubs);
    }

    // Merge tracks（追更断点，与已点片库无关）
    if (Array.isArray(pkg.tracks)) {
      const currentTracks = getTracks();
      for (const newT of pkg.tracks) {
        if (!newT || !newT.query) continue;
        const siteNorm = String(newT.site || '');
        const queryNorm = String(newT.query || '').trim();
        const existing = currentTracks.find(
          t => t.site === siteNorm && String(t.query || '').toLowerCase().trim() === queryNorm.toLowerCase()
        );
        if (existing) {
          if (newT.label) existing.label = String(newT.label);
          if (newT.url) existing.url = String(newT.url);
          // 取更新的断点：页码更大或 updated_at 更新
          const remotePage = Number(newT.last_seen_page) || 1;
          const localPage = Number(existing.last_seen_page) || 1;
          const remoteAt = new Date(newT.updated_at || 0).getTime() || 0;
          const localAt = new Date(existing.updated_at || 0).getTime() || 0;
          if (remoteAt >= localAt || remotePage > localPage) {
            if (newT.last_seen_item) existing.last_seen_item = String(newT.last_seen_item);
            if (newT.last_seen_page != null) existing.last_seen_page = remotePage;
            existing.updated_at = newT.updated_at || existing.updated_at || new Date().toISOString();
          }
        } else {
          currentTracks.push({
            id: newT.id || 'track_' + uid(),
            site: siteNorm,
            query: queryNorm,
            label: String(newT.label || queryNorm),
            url: String(newT.url || ''),
            last_seen_item: String(newT.last_seen_item || ''),
            last_seen_page: Number(newT.last_seen_page) || 1,
            updated_at: newT.updated_at || new Date().toISOString()
          });
        }
      }
      saveTracks(currentTracks);
    }

    // 已点片库（clicks）
    if (pkg.clicks != null) {
      mergeClickRecords(pkg.clicks);
    }

    // 作品收藏
    if (Array.isArray(pkg.works)) {
      const map = {};
      getWorks().forEach((w) => {
        if (!w) return;
        map[workKey(w.site, w.videoId || w.id)] = w;
      });
      pkg.works.forEach((w) => {
        if (!w) return;
        const vid = compactText(w.videoId || w.id);
        if (!vid) return;
        const k = workKey(w.site, vid);
        if (!map[k]) map[k] = w;
        else {
          const prev = map[k];
          const ra = new Date(w.updated_at || 0).getTime() || 0;
          const la = new Date(prev.updated_at || 0).getTime() || 0;
          if (ra >= la) map[k] = Object.assign({}, prev, w);
        }
      });
      saveWorks(Object.values(map));
    }
    
    triggerWebDavDirty();
    return true;
  } catch(e) {
    showToast(e.message || '导入解析失败', true);
    return false;
  }
}

// WebDAV（createCreamuWebDavSync 来自 shared 注入）
let scoutSync = null;

function triggerWebDavDirty() {
  if (scoutSync) {
    scoutSync.markLocalDirty();
  }
}

function initScoutWebDav() {
  if (typeof createCreamuWebDavSync !== 'function') {
    console.warn('[Creamu Scout] WebDAV module not found in shared script.');
    return;
  }
  
  scoutSync = createCreamuWebDavSync({
    product: 'scout',
    notify(msg, isErr) {
      showToast(msg, isErr);
    },
    async exportPayload() {
      return {
        terms: getLexiconTerms(),
        blocks: getBlockList(),
        tracks: getTracks(),
        types: getLexiconTypes(),
        config: getConfig(),
        publishers: getPublishers(),
        // 已点片库（与 tracks 断点分离）
        clicks: getClickedList(),
        // 作品收藏
        works: getWorks()
      };
    },
    async importPayload(payload) {
      if (!payload) return;
      if (Array.isArray(payload.terms)) {
        saveLexiconTerms(payload.terms);
      }
      if (Array.isArray(payload.blocks)) {
        saveBlockList(payload.blocks);
      }
      if (Array.isArray(payload.tracks)) {
        saveTracks(payload.tracks);
      }
      if (Array.isArray(payload.types)) {
        saveLexiconTypes(payload.types);
      }
      if (payload.config) {
        saveConfig(payload.config);
      }
      if (Array.isArray(payload.publishers)) {
        savePublishers(payload.publishers);
      }
      // 已点：vault 整包覆盖（与 terms/tracks 一致；清空后同步才能对端清空）
      if (payload.clicks != null) {
        replaceClickRecords(payload.clicks);
      }
      if (Array.isArray(payload.works)) {
        saveWorks(payload.works);
      }
    },
    getSettings() {
      const cfg = getConfig();
      return {
        enabled: cfg.webdav_enabled,
        url: cfg.webdav_url,
        user: cfg.webdav_user,
        password: cfg.webdav_password,
        path: cfg.webdav_path,
        auto: cfg.webdav_auto,
        conflict: cfg.webdav_conflict
      };
    }
  });
}
