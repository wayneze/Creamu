// ==UserScript==
// @name         Creamu · Scout
// @name:zh-CN   Creamu · Scout
// @namespace    https://github.com/wayneze/Creamu
// @version      0.1.3
// @description  Creamu：欧美发现工作台；组合模板；词库采集；屏蔽；搜索追更断点；导入导出
// @author       wayneze
// @match        *://*.xvideos.com/*
// @match        *://xvideos.com/*
// @match        *://*.xnxx.com/*
// @match        *://xnxx.com/*
// @match        *://*.eporner.com/*
// @match        *://eporner.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @grant        GM_openInTab
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
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
  /* Creamu shared workbench CSS — single source (from JLC). Both products inject this. */
  function getCreamuWorkbenchCss() {
    return "\n        #jlc-wb-fab {\n            position: fixed; bottom: 20px; right: 18px; width: 34px; height: 34px;\n            border-radius: 11px; border: 0 !important; color: #fff !important;\n            background: linear-gradient(#e8a24e, #d4883a) !important;\n            background-color: #d4883a !important;\n            box-shadow: 0 3px 0 #b56e28, 0 8px 16px rgba(140,90,40,.26) !important;\n            z-index: 999999; cursor: grab; touch-action: none; user-select: none;\n            display: flex; align-items: center; justify-content: center; font-size: 14px;\n            opacity: 1 !important;\n            transition: filter .14s ease, box-shadow .14s ease, transform .12s ease;\n        }\n        #jlc-wb-fab:hover { filter: brightness(1.05); }\n        #jlc-wb-fab:active, #jlc-wb-fab.is-dragging {\n            cursor: grabbing; transform: translateY(2px);\n            box-shadow: 0 2px 0 #b56e28, 0 4px 10px rgba(140,90,40,.22);\n            filter: brightness(.98);\n        }\n        #jlc-wb-fab .jlc-wb-fab-badge {\n            position: absolute; top: -4px; right: -4px; min-width: 15px; height: 15px; padding: 0 3px;\n            border-radius: 999px; background: #5c3a1a; border: 1.5px solid #f6efe3; color: #fff;\n            font-size: 9px; font-weight: 700; display: none; align-items: center; justify-content: center;\n            box-shadow: 0 1px 0 rgba(0,0,0,.12);\n        }\n        #jlc-wb-fab.has-updates .jlc-wb-fab-badge { display: inline-flex; }\n\n        #jlc-wb {\n            position: fixed; left: auto; top: auto; right: 48px; bottom: auto;\n            width: min(520px, calc(100vw - 64px));\n            height: min(78vh, 800px); max-height: none; min-width: 360px; min-height: 280px;\n            display: none; flex-direction: column; z-index: 999998; overflow: hidden;\n            background: #f6efe3; color: #4a3728; border-radius: 22px; border: 1px solid #e4d4bc;\n            box-shadow: 0 18px 50px rgba(90,60,30,.22); font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;\n            font-size: 14.5px;\n        }\n        #jlc-wb.is-open { display: flex; }\n        #jlc-wb.is-dragging, #jlc-wb.is-resizing { opacity: .98; user-select: none; }\n        #jlc-wb * { box-sizing: border-box; }\n\n        #jlc-wb .jlc-wb-header {\n            display: flex; align-items: center; justify-content: space-between; gap: 10px;\n            padding: 16px 18px 12px; background: transparent; border-bottom: 0; flex: 0 0 auto;\n            cursor: move; touch-action: none;\n        }\n        #jlc-wb .jlc-wb-header .jlc-wb-header-actions,\n        #jlc-wb .jlc-wb-header .jlc-wb-header-actions * { cursor: pointer; }\n        #jlc-wb .jlc-wb-title { font-weight: 800; font-size: 18px; color: #6b4a2e; letter-spacing: .2px; }\n        #jlc-wb .jlc-wb-subtitle { font-size: 12px; color: #a08468; margin-top: 3px; }\n        #jlc-wb .jlc-wb-header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }\n\n        #jlc-wb .jlc-wb-icon-btn, #jlc-wb .jlc-wb-chip, #jlc-wb .jlc-wb-btn {\n            appearance: none; border: 1px solid #e0cdae; background: #fffaf2; color: #5a4030;\n            border-radius: 999px; cursor: pointer; font-size: 13px; line-height: 1.25; font-weight: 650;\n        }\n        #jlc-wb .jlc-wb-icon-btn {\n            width: 34px; height: 34px; padding: 0; display: inline-flex; align-items: center; justify-content: center;\n            background: #fff; font-size: 15px; box-shadow: 0 2px 0 #e6d3b5;\n        }\n        #jlc-wb .jlc-wb-chip { padding: 7px 12px; background: #fff; box-shadow: 0 2px 0 #e6d3b5; }\n        #jlc-wb .jlc-wb-chip.is-on { background: #d4883a; border-color: transparent; color: #fff; box-shadow: 0 2px 0 #b56e28; }\n        #jlc-wb .jlc-wb-btn { padding: 9px 13px; border-radius: 12px; box-shadow: 0 2px 0 #e0cdae; }\n        #jlc-wb .jlc-wb-btn.primary { background: #d4883a; border-color: transparent; color: #fff; box-shadow: 0 2px 0 #b56e28; }\n        #jlc-wb .jlc-wb-btn.ghost { background: #fffaf2; }\n        #jlc-wb .jlc-wb-btn.danger { background: #f3d5d0; border-color: #e8b8b0; color: #8a3a32; box-shadow: none; }\n        #jlc-wb .jlc-wb-btn:hover, #jlc-wb .jlc-wb-icon-btn:hover, #jlc-wb .jlc-wb-chip:hover {\n            background: #fff; border-color: #d4bc96; filter: brightness(1.02);\n        }\n        #jlc-wb .jlc-wb-btn.primary:hover { background: #e09848; border-color: transparent; filter: none; }\n        #jlc-wb .jlc-wb-btn[disabled] { opacity: .5; cursor: not-allowed; }\n\n        #jlc-wb .jlc-wb-nav {\n            display: flex; gap: 8px; background: transparent; border-bottom: 0; flex: 0 0 auto;\n            padding: 0 16px 10px;\n        }\n        #jlc-wb .jlc-wb-nav button {\n            flex: 1; border: 0; background: #efe4d2; color: #8a6f55; padding: 10px 10px; cursor: pointer;\n            font-size: 14px; font-weight: 700; transition: .18s; border-radius: 12px;\n        }\n        #jlc-wb .jlc-wb-nav button.active {\n            color: #fff; background: #d4883a; box-shadow: 0 2px 0 #b56e28;\n        }\n\n        #jlc-wb .jlc-wb-body {\n            flex: 1 1 auto; min-height: 0; overflow: hidden; display: flex; flex-direction: column;\n            padding: 0; background: transparent;\n        }\n        #jlc-wb [data-jlc-wb-page] {\n            flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; overflow: hidden;\n        }\n        #jlc-wb [data-jlc-wb-page][hidden] { display: none !important; }\n        #jlc-wb #jlc-wb-tracking-root,\n        #jlc-wb #exc-wb-tracking-root,\n        #jlc-wb #exc-wb-works-root,\n        #jlc-wb [data-jlc-wb-page] > * {\n            flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; overflow: hidden;\n        }\n        #jlc-wb #jlc-wb-view-root {\n            flex: 1 1 auto; min-height: 0; overflow: auto; padding: 14px;\n        }\n        #jlc-wb #jlc-wb-library-root,\n        #jlc-wb #jlc-wb-filter-root {\n            flex: 1 1 auto; min-height: 0; overflow: auto; padding: 14px;\n        }\n\n        #jlc-wb .jlc-wb-footer {\n            flex: 0 0 auto; border-top: 1px solid #eadcc6; padding: 12px 14px; background: rgba(255,255,255,.45);\n            display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between;\n        }\n        #jlc-wb .jlc-wb-footer-summary { font-size: 12.5px; color: #9a7d60; line-height: 1.45; max-width: 52%; }\n\n        #jlc-wb .jlc-wb-toolbar {\n            flex: 0 0 auto; display: flex; flex-direction: column; gap: 9px;\n            padding: 4px 14px 10px; background: transparent; border-bottom: 0;\n            position: static;\n        }\n        #jlc-wb .jlc-wb-toolbar-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }\n        #jlc-wb .jlc-wb-list-scroll {\n            flex: 1 1 auto; min-height: 0; overflow-x: hidden; overflow-y: auto;\n            /* 底边留白：少条目时「更多」菜单向下仍有空间；仍不够时 JS 会 is-up 上翻 */\n            padding: 4px 14px 96px; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;\n        }\n        #jlc-wb .jlc-wb-list-scroll::-webkit-scrollbar { width: 8px; }\n        #jlc-wb .jlc-wb-list-scroll::-webkit-scrollbar-thumb {\n            background: rgba(140,100,50,.22); border-radius: 999px;\n        }\n\n        #jlc-wb .jlc-wb-search {\n            flex: 1 1 180px; min-width: 0; padding: 10px 14px; border-radius: 14px; border: 1px solid #e4d4bc;\n            background: #fff; color: #4a3728; font-size: 14.5px; box-shadow: 0 2px 0 #eadcc6;\n        }\n        #jlc-wb .jlc-wb-search:focus { outline: none; border-color: #d4883a; background: #fff; }\n        #jlc-wb select.jlc-wb-select,\n        #jlc-wb select {\n            color-scheme: light;\n            background: #fffdf8 !important;\n            color: #4a3728 !important;\n        }\n        #jlc-wb select option,\n        #jlc-wb select.jlc-wb-select option {\n            background: #fffdf8 !important;\n            color: #4a3728 !important;\n        }\n        #jlc-wb select.jlc-wb-select {\n            padding: 9px 11px; border-radius: 12px; border: 1px solid #e4d4bc; background: #fff; color: #4a3728; font-size: 13.5px;\n            box-shadow: 0 2px 0 #eadcc6;\n        }\n\n        #jlc-wb .jlc-wb-group {\n            border: 0; border-radius: 16px; overflow: visible; margin-bottom: 18px; background: transparent;\n        }\n        #jlc-wb .jlc-wb-group-toggle {\n            width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px;\n            background: transparent; color: #7a5a3c; border: 0; padding: 10px 6px 10px;\n            cursor: pointer; font-size: 13.5px; font-weight: 750;\n            border-radius: 0; margin: 0 0 2px; line-height: 1.35;\n            min-height: 36px;\n        }\n        #jlc-wb .jlc-wb-group.collapsed .jlc-wb-group-toggle { border-radius: 0; }\n        #jlc-wb .jlc-wb-group-toggle small {\n            color: #9a7d60; font-weight: 650; background: #efe4d2; padding: 3px 9px; border-radius: 999px; font-size: 12px;\n            flex: 0 0 auto;\n        }\n        #jlc-wb .jlc-wb-group-body {\n            padding: 2px 0 4px; display: flex; flex-direction: column; gap: 12px; overflow: visible;\n        }\n        #jlc-wb .jlc-wb-group.collapsed .jlc-wb-group-body { display: none; }\n\n        #jlc-wb .jlc-wb-item {\n            position: relative; border-radius: 18px; padding: 12px 12px 12px 12px;\n            background: #fffdf8; border: 1px solid #efe0cc; overflow: visible;\n            cursor: pointer; transition: border-color .12s ease, background .12s ease, box-shadow .12s ease, transform .12s ease;\n            box-shadow: 0 3px 0 #ead7bb;\n        }\n        #jlc-wb .jlc-wb-item:hover {\n            border-color: #e0c9a8; background: #fff;\n            box-shadow: 0 6px 16px rgba(120,80,30,.12); z-index: 3;\n        }\n        #jlc-wb .jlc-wb-item::before { display: none; }\n        #jlc-wb .jlc-wb-item.is-focus {\n            border-color: #d4883a; box-shadow: 0 0 0 2px rgba(212,136,58,.22), 0 4px 0 #e0c9a8;\n            background: #fff8ee;\n        }\n        #jlc-wb .jlc-wb-item.is-current { border-color: #8eb6e8; }\n        /* 菜单打开时抬高整卡，避免被下方 Open 按钮盖住 */\n        #jlc-wb .jlc-wb-item.is-menu-open {\n            z-index: 50;\n            position: relative;\n        }\n\n        #jlc-wb .jlc-wb-item-row {\n            display: flex; align-items: center; gap: 12px; min-width: 0;\n        }\n        #jlc-wb .jlc-wb-cover {\n            flex: 0 0 auto; width: 54px; height: 54px; border-radius: 14px;\n            background: #efe4d2; border: 1px solid #e4d4bc; overflow: hidden;\n            display: flex; align-items: center; justify-content: center; position: relative;\n        }\n        #jlc-wb .jlc-wb-cover.is-avatar { border-radius: 50%; }\n        #jlc-wb .jlc-wb-cover.is-poster { border-radius: 12px; }\n        #jlc-wb .jlc-wb-cover img {\n            width: 100%; height: 100%; object-fit: cover; display: block; background: #f0e6d6;\n        }\n        #jlc-wb .jlc-wb-cover img.jlc-wb-lrr-thumb {\n            position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;\n        }\n        #jlc-wb .jlc-wb-cover { position: relative; }\n        #jlc-wb .jlc-wb-item-actions {\n            display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; align-items: center;\n        }\n        #jlc-wb .jlc-wb-item-actions .jlc-wb-btn {\n            display: inline-flex; align-items: center; justify-content: center; text-decoration: none;\n            padding: 7px 11px; font-size: 12.5px;\n        }\n        #jlc-wb .jlc-wb-cover-fallback {\n            font-size: 18px; font-weight: 800; color: #a07850; line-height: 1;\n        }\n        #jlc-wb .jlc-wb-cover[data-group=\"actor\"] { background: #f3e2ef; }\n        #jlc-wb .jlc-wb-cover[data-group=\"director\"] { background: #e4eef8; }\n        #jlc-wb .jlc-wb-cover[data-group=\"maker\"],\n        #jlc-wb .jlc-wb-cover[data-group=\"studio\"] { background: #e8f0e4; }\n        #jlc-wb .jlc-wb-cover[data-group=\"series\"] { background: #f7ebe0; }\n        #jlc-wb .jlc-wb-cover[data-group=\"tag\"] { background: #f0ebe0; }\n        #jlc-wb .jlc-wb-cover[data-group=\"keyword\"] { background: #efe8f5; }\n\n        #jlc-wb .jlc-wb-item-body { flex: 1 1 auto; min-width: 0; }\n        #jlc-wb .jlc-wb-item-title-row {\n            display: flex; align-items: flex-start; gap: 8px; margin-bottom: 4px;\n        }\n        #jlc-wb .jlc-wb-item-title {\n            flex: 1 1 auto; min-width: 0; font-size: 14.5px; font-weight: 750; color: #4a3728;\n            line-height: 1.35; margin: 0; word-break: break-word;\n            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;\n        }\n        #jlc-wb .jlc-wb-leaf {\n            flex: 0 0 auto; max-width: 72px; padding: 2px 8px; border-radius: 999px;\n            font-size: 11px; font-weight: 750; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\n            background: #efe4d2; color: #8a6f55;\n        }\n        #jlc-wb .jlc-wb-leaf.tone-red { background: #fde2df; color: #b42318; }\n        #jlc-wb .jlc-wb-leaf.tone-green { background: #e2f5e4; color: #2f6b3a; }\n        #jlc-wb .jlc-wb-leaf.tone-yellow { background: #fff1d6; color: #9a6700; }\n        #jlc-wb .jlc-wb-leaf.tone-gray { background: #efe4d2; color: #8a6f55; }\n        #jlc-wb .jlc-wb-item-meta {\n            display: flex; flex-direction: column; gap: 2px;\n            margin-bottom: 5px; min-width: 0;\n        }\n        #jlc-wb .jlc-wb-item-meta-line {\n            font-size: 12.5px; color: #9a7d60; line-height: 1.4;\n            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\n            min-width: 0;\n        }\n        #jlc-wb .jlc-wb-item-meta-line.is-avid {\n            color: #7a6048; font-weight: 650;\n        }\n        #jlc-wb .jlc-wb-item-pills {\n            display: flex; flex-wrap: wrap; gap: 5px; align-items: center;\n        }\n        #jlc-wb .jlc-wb-item-side {\n            flex: 0 0 auto; display: flex; flex-direction: column; align-items: flex-end; gap: 6px;\n            position: relative; z-index: 2;\n        }\n        #jlc-wb .jlc-wb-open-btn {\n            appearance: none; border: 0; cursor: pointer;\n            min-width: 64px; padding: 8px 14px; border-radius: 999px;\n            background: linear-gradient(#e8a24e, #d4883a); color: #fff; font-weight: 800; font-size: 13px;\n            box-shadow: 0 3px 0 #b56e28; transition: transform .12s ease, filter .12s ease;\n        }\n        #jlc-wb .jlc-wb-open-btn:hover { filter: brightness(1.05); transform: translateY(-1px); }\n        #jlc-wb .jlc-wb-open-btn:active { transform: translateY(1px); box-shadow: 0 1px 0 #b56e28; }\n        #jlc-wb .jlc-wb-more-btn {\n            appearance: none; border: 0; background: transparent; color: #b09070;\n            width: 28px; height: 22px; border-radius: 8px; cursor: pointer; font-size: 16px; line-height: 1;\n            font-weight: 800; letter-spacing: 1px;\n        }\n        #jlc-wb .jlc-wb-more-btn:hover, #jlc-wb .jlc-wb-more-btn.is-open {\n            background: #efe4d2; color: #6b4a2e;\n        }\n        #jlc-wb .jlc-wb-item-menu {\n            position: absolute; top: calc(100% + 4px); right: 0; min-width: 132px;\n            background: #fffdf8; border: 1px solid #e4d4bc; border-radius: 12px;\n            box-shadow: 0 12px 28px rgba(90,60,30,.2); padding: 6px; z-index: 80;\n            display: flex; flex-direction: column; gap: 2px;\n        }\n        #jlc-wb .jlc-wb-item-menu.is-up {\n            top: auto; bottom: calc(100% + 4px);\n        }\n        #jlc-wb .jlc-wb-item-menu[hidden] { display: none !important; }\n        #jlc-wb .jlc-wb-item-menu button {\n            appearance: none; border: 0; background: transparent; text-align: left;\n            padding: 8px 10px; border-radius: 8px; cursor: pointer; color: #5a4030;\n            font-size: 13px; font-weight: 650;\n        }\n        #jlc-wb .jlc-wb-item-menu button:hover { background: #f3e9d8; }\n        #jlc-wb .jlc-wb-item-menu button.is-danger { color: #b42318; }\n\n        #jlc-wb .jlc-status-pill, #jlc-wb .jlc-site-pill {\n            display: inline-flex; align-items: center; border-radius: 999px; padding: 2px 8px;\n            font-size: 11.5px; font-weight: 700; border: 1px solid transparent;\n        }\n        #jlc-wb .jlc-site-pill { background: #f3e9d8; color: #8a6f55; border-color: #eadcc6; }\n        #jlc-wb .jlc-site-pill.is-current { background: #e7f1ff; color: #175cd3; border-color: #c2dbff; }\n        /* 上次：默认琥珀；按打开时效加深/减弱 */\n        #jlc-wb .jlc-site-pill.is-last { background: #fff4db; color: #9a6700; border-color: #f0d7a0; }\n        #jlc-wb .jlc-site-pill.is-last.recency-fresh {\n            background: #ffe8c2; color: #b54708; border-color: #f5c77a; font-weight: 800;\n        }\n        #jlc-wb .jlc-site-pill.is-last.recency-warm {\n            background: #fff0d0; color: #9a6700; border-color: #ebc98a;\n        }\n        #jlc-wb .jlc-site-pill.is-last.recency-mid {\n            background: #f6efe2; color: #8a7048; border-color: #e4d4bc;\n        }\n        #jlc-wb .jlc-site-pill.is-last.recency-cool {\n            background: #f0ebe4; color: #9a8a78; border-color: #e0d6c8;\n        }\n        #jlc-wb .jlc-wb-item-meta-line .jlc-wb-pagehint,\n        #jlc-wb .jlc-wb-pagehint {\n            color: #a89078; font-weight: 550;\n        }\n        #jlc-wb .jlc-wb-item-meta-line.is-sub {\n            color: #a89078; font-weight: 550;\n        }\n        #jlc-wb .jlc-status-pill.tone-gray { background: #efe4d2; color: #8a6f55; }\n        #jlc-wb .jlc-status-pill.tone-green { background: #e2f5e4; color: #2f6b3a; }\n        #jlc-wb .jlc-status-pill.tone-red { background: #fde2df; color: #b42318; }\n        #jlc-wb .jlc-status-pill.tone-yellow { background: #fff1d6; color: #9a6700; }\n\n        #jlc-wb .jlc-wb-empty {\n            padding: 20px; border: 1px dashed #e0cdae; border-radius: 16px; color: #9a7d60;\n            background: rgba(255,255,255,.55); font-size: 14.5px; line-height: 1.65;\n        }\n\n        #jlc-wb #jlc-wb-view-root .jlc-wb-view-block,\n        #jlc-wb #jlc-wb-library-root .jlc-wb-view-block,\n        #jlc-wb #jlc-wb-filter-root .jlc-wb-view-block {\n            background: #fffdf8; border: 1px solid #efe0cc; border-radius: 16px; padding: 14px; margin-bottom: 14px;\n            box-shadow: 0 3px 0 #ead7bb;\n        }\n        #jlc-wb #jlc-wb-view-root .jlc-wb-view-title,\n        #jlc-wb #jlc-wb-library-root .jlc-wb-view-title,\n        #jlc-wb #jlc-wb-filter-root .jlc-wb-view-title {\n            font-size: 12px; color: #d4883a; font-weight: 750; letter-spacing: .5px; margin: 0 0 12px;\n            text-transform: uppercase;\n        }\n        #jlc-wb .legacy-row,\n        #jlc-wb .jlc-wb-settings .legacy-row {\n            background: #fffaf2; border: 1px solid #e4d4bc; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px;\n        }\n        #jlc-wb .legacy-toggle,\n        #jlc-wb .jlc-wb-settings .legacy-toggle {\n            display: flex; align-items: center; justify-content: space-between; gap: 12px;\n        }\n        #jlc-wb .legacy-toggle > span,\n        #jlc-wb .jlc-wb-settings .legacy-toggle > span { color: #4a3728; font-size: 14.5px; }\n        #jlc-wb .legacy-toggle input[type=\"checkbox\"],\n        #jlc-wb .jlc-wb-settings .legacy-toggle input[type=\"checkbox\"] {\n            width: 20px; height: 20px; margin: 0; accent-color: #d4883a; cursor: pointer;\n        }\n        #jlc-wb .legacy-row.disabled { opacity: .45; }\n        #jlc-wb .legacy-range,\n        #jlc-wb .jlc-wb-settings .legacy-range { display: flex; align-items: center; gap: 10px; }\n        #jlc-wb .legacy-range input[type=\"range\"],\n        #jlc-wb .jlc-wb-settings .legacy-range input[type=\"range\"] {\n            flex: 1; margin: 0; background: transparent; border: 0; accent-color: #d4883a;\n        }\n        #jlc-wb .legacy-note,\n        #jlc-wb .jlc-wb-settings .legacy-note { font-size: 13px; color: #9a7d60; line-height: 1.55; margin-top: 8px; }\n        #jlc-wb .jlc-wb-view-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px; }\n        #jlc-wb .jlc-wb-view-actions .jlc-wb-btn { width: 100%; justify-content: center; }\n\n        #jlc-wb .jlc-wb-settings {\n            display: none; position: absolute; inset: 0; z-index: 5; background: rgba(90,60,30,.28);\n        }\n        #jlc-wb .jlc-wb-settings.is-open { display: block; }\n        #jlc-wb .jlc-wb-settings-panel {\n            position: absolute; top: 0; right: 0; width: min(100%, 430px); height: 100%;\n            display: flex; flex-direction: column; background: #f6efe3; border-left: 1px solid #e4d4bc;\n        }\n        #jlc-wb .jlc-wb-settings-head {\n            flex: 0 0 auto; display: flex; justify-content: space-between; align-items: center;\n            gap: 8px; padding: 14px 16px; border-bottom: 1px solid #eadcc6; background: #fffaf2; font-size: 15px; color: #4a3728;\n        }\n        #jlc-wb .jlc-wb-settings-nav {\n            flex: 0 0 auto; display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 14px;\n            border-bottom: 1px solid #eadcc6; background: #f3e9d8;\n        }\n        #jlc-wb .jlc-wb-settings-nav button {\n            appearance: none; border: 1px solid #e0cdae; background: #fff; color: #8a6f55;\n            border-radius: 999px; padding: 8px 12px; cursor: pointer; font-size: 13.5px; font-weight: 700;\n        }\n        #jlc-wb .jlc-wb-settings-nav button.active {\n            background: #d4883a; border-color: transparent; color: #fff;\n        }\n        #jlc-wb .jlc-wb-settings-body {\n            flex: 1 1 auto; min-height: 0; overflow: auto; padding: 14px 16px 20px; background: #f6efe3;\n        }\n        #jlc-wb .jlc-wb-settings-section { display: none; }\n        #jlc-wb .jlc-wb-settings-section.is-active { display: block; }\n        #jlc-wb .jlc-wb-settings h3 {\n            margin: 0 0 12px; font-size: 13px; color: #d4883a; letter-spacing: 1px; text-transform: uppercase;\n        }\n        #jlc-wb .jlc-wb-settings label,\n        #jlc-wb #jlc-wb-library-root label,\n        #jlc-wb #jlc-wb-filter-root label {\n            display: block; font-size: 12px; color: #9a7d60; margin-top: 12px; text-transform: uppercase; letter-spacing: 1px;\n        }\n        #jlc-wb .jlc-wb-settings input[type=\"text\"],\n        #jlc-wb .jlc-wb-settings input[type=\"password\"],\n        #jlc-wb .jlc-wb-settings input[type=\"number\"],\n        #jlc-wb .jlc-wb-settings textarea,\n        #jlc-wb .jlc-wb-settings select,\n        #jlc-wb #jlc-wb-library-root input[type=\"text\"],\n        #jlc-wb #jlc-wb-library-root input[type=\"password\"],\n        #jlc-wb #jlc-wb-library-root input[type=\"number\"],\n        #jlc-wb #jlc-wb-library-root textarea,\n        #jlc-wb #jlc-wb-library-root select,\n        #jlc-wb #jlc-wb-filter-root input[type=\"text\"],\n        #jlc-wb #jlc-wb-filter-root textarea {\n            width: 100%; padding: 12px; margin-top: 8px; border-radius: 12px; border: 1px solid #e4d4bc;\n            background: #fff; color: #4a3728; font-size: 14px;\n        }\n        #jlc-wb .jlc-wb-settings input:focus,\n        #jlc-wb .jlc-wb-settings textarea:focus,\n        #jlc-wb .jlc-wb-settings select:focus,\n        #jlc-wb #jlc-wb-library-root input:focus,\n        #jlc-wb #jlc-wb-library-root textarea:focus,\n        #jlc-wb #jlc-wb-library-root select:focus {\n            border-color: #d4883a; outline: none; background: #fff;\n        }\n        #jlc-wb .jlc-wb-settings .stat-box,\n        #jlc-wb #jlc-wb-library-root .stat-box {\n            display: flex; justify-content: space-around; background: #fffdf8; border: 1px solid #efe0cc;\n            border-radius: 14px; padding: 14px; margin-bottom: 14px;\n        }\n        #jlc-wb .jlc-wb-settings .stat-item,\n        #jlc-wb #jlc-wb-library-root .stat-item { text-align: center; }\n        #jlc-wb .jlc-wb-settings .stat-item b,\n        #jlc-wb #jlc-wb-library-root .stat-item b { display: block; color: #d4883a; font-size: 22px; margin-bottom: 4px; }\n        #jlc-wb .jlc-wb-settings .stat-item span,\n        #jlc-wb #jlc-wb-library-root .stat-item span { font-size: 11px; color: #9a7d60; }\n        #jlc-wb .person-item {\n            background: #fffdf8; padding: 12px 14px; border-radius: 12px; margin-bottom: 8px;\n            display: flex; justify-content: space-between; align-items: center; border: 1px solid #efe0cc; font-size: 14px;\n            color: #4a3728;\n        }\n        #jlc-wb .person-item:hover { border-color: #e0c9a8; background: #fff; }\n        #jlc-wb .person-item span.remove { color: #d4883a; cursor: pointer; font-size: 18px; padding: 0 8px; }\n\n        #jlc-tracking-pagebar.jlc-wb-pagebar {\n            background: rgba(255,253,248,.97); border: 1px solid #e4d4bc; color: #4a3728;\n            box-shadow: 0 10px 24px rgba(90,60,30,.12);\n        }\n        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-title { color: #4a3728; }\n        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagehint {\n            color: #a89078 !important; font-weight: 550; font-size: 12px;\n        }\n        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-meta { color: #9a7d60; }\n        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button {\n            appearance: none; border: 1px solid #e0cdae; background: #fffaf2; color: #5a4030;\n            border-radius: 999px; padding: 7px 12px; cursor: pointer; font-size: 13px; font-weight: 650;\n        }\n        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button.primary {\n            background: #d4883a; border-color: transparent; color: #fff;\n        }\n        /* 奶油条上的继续断点：沿用断点红，压过 ghost 默认样式 */\n        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button.jlc-bp-continue {\n            background: linear-gradient(135deg, #ff5f56, #e54840); border: 0; color: #fff;\n            font-weight: 800; box-shadow: 0 3px 0 #b8322b, 0 8px 18px rgba(255,95,86,.22);\n        }\n\n        #jlc-wb .jlc-wb-resize-w {\n            position: absolute; left: 0; top: 0; bottom: 0; width: 8px; cursor: ew-resize; z-index: 8;\n        }\n        #jlc-wb .jlc-wb-resize-h {\n            position: absolute; left: 0; right: 0; bottom: 0; height: 8px; cursor: ns-resize; z-index: 8;\n        }\n        #jlc-wb .jlc-wb-resize-corner {\n            position: absolute; right: 0; bottom: 0; width: 18px; height: 18px; cursor: nwse-resize; z-index: 9;\n        }\n        #jlc-wb .jlc-wb-resize-corner::after {\n            content: ''; position: absolute; right: 5px; bottom: 5px; width: 9px; height: 9px;\n            border-right: 2px solid rgba(180,130,70,.55); border-bottom: 2px solid rgba(180,130,70,.55);\n            border-radius: 0 0 3px 0;\n        }\n        #jlc-wb .jlc-wb-resize-w:hover, #jlc-wb .jlc-wb-resize-w.is-dragging,\n        #jlc-wb .jlc-wb-resize-h:hover, #jlc-wb .jlc-wb-resize-h.is-dragging {\n            background: rgba(212,136,58,.28);\n        }\n        #jlc-wb .jlc-wb-resize-corner:hover, #jlc-wb .jlc-wb-resize-corner.is-dragging {\n            background: rgba(212,136,58,.18);\n        }\n\n        #jlc-wb .jlc-wb-item-edit {\n            display: none; position: relative; z-index: 6;\n            margin-top: 10px; gap: 8px; align-items: center; flex-wrap: wrap;\n        }\n        #jlc-wb .jlc-wb-item-edit.is-open { display: flex; }\n        #jlc-wb .jlc-wb-item-edit input {\n            flex: 1 1 160px; min-width: 0; padding: 9px 11px; border-radius: 12px;\n            border: 1px solid #e4d4bc; background: #fff; color: #4a3728; font-size: 14px;\n        }\n        #jlc-wb-dialog {\n            position: fixed; inset: 0; z-index: 1000001; display: none; align-items: center; justify-content: center;\n            background: rgba(90,60,30,.35); padding: 20px;\n        }\n        #jlc-wb-dialog.is-open { display: flex; }\n        #jlc-wb-dialog .jlc-wb-dialog-card {\n            width: min(440px, 92vw); background: #fffdf8; border: 1px solid #e4d4bc; border-radius: 18px;\n            padding: 18px; box-shadow: 0 18px 50px rgba(90,60,30,.22); color: #4a3728;\n        }\n        #jlc-wb-dialog h4 { margin: 0 0 8px; font-size: 16px; color: #4a3728; }\n        #jlc-wb-dialog p { margin: 0 0 12px; font-size: 13.5px; color: #9a7d60; line-height: 1.55; }\n        #jlc-wb-dialog input {\n            width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #e4d4bc;\n            background: #fff; color: #4a3728; font-size: 14.5px; margin-bottom: 14px;\n        }\n        #jlc-wb-dialog .jlc-wb-dialog-actions { display: flex; gap: 8px; justify-content: flex-end; }\n\n        #jlc-wb #jlc-wb-config-diag {\n            background: #fffdf8 !important; border: 1px solid #efe0cc !important; color: #5a4030 !important;\n        }\n        #jlc-wb #jlc-wb-config-hint {\n            background: #fff7ea !important; border-color: #f0d7a0 !important; color: #9a6700 !important;\n        }\n\n                #jlc-wb .jlc-wb-settings-footer {\n            flex: 0 0 auto; border-top: 1px solid #eadcc6; padding: 12px 14px; background: #fffaf2;\n            display: flex; flex-direction: column; gap: 8px;\n        }\n\n        \n        #jlc-wb .jlc-wb-settings input[type=\"number\"] {\n            -moz-appearance: textfield;\n            appearance: textfield;\n            color-scheme: light;\n        }\n        #jlc-wb .jlc-wb-settings input[type=\"number\"]::-webkit-outer-spin-button,\n        #jlc-wb .jlc-wb-settings input[type=\"number\"]::-webkit-inner-spin-button {\n            -webkit-appearance: none; margin: 0;\n        }\n        /* 按钮缩放：由脚本设置 --jlc-btn-scale（如 0.85）；默认 1 不影响布局 */\n        #jlc-wb-fab,\n        #jlc-wb .jlc-wb-btn,\n        #jlc-wb .jlc-wb-icon-btn,\n        #jlc-wb .jlc-wb-chip,\n        #jlc-wb .jlc-wb-nav button,\n        #jlc-wb .jlc-wb-open-btn,\n        #jlc-wb .jlc-wb-more-btn,\n        #jlc-wb .jlc-wb-settings-nav button,\n        #jlc-wb .jlc-wb-item-menu button,\n        #jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-actions button,\n        #jlc-wb-dialog .jlc-wb-dialog-actions button {\n            zoom: var(--jlc-btn-scale, 1);\n        }\n\n        @media (max-width: 820px) {\n            #jlc-wb {\n                left: 0 !important; right: 0 !important; top: auto !important; bottom: 0 !important;\n                width: 100% !important; height: min(86vh, 840px); border-radius: 16px 16px 0 0;\n            }\n            #jlc-wb .jlc-wb-header { cursor: default; }\n            #jlc-wb-fab { width: 42px; height: 42px; font-size: 17px; }\n        }";
  }

function injectCreamuWorkbenchStyles(opts) {
    opts = opts || {};
    const id = opts.styleId || 'jlc-wb-style';
    let styleEl = document.getElementById(id);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = id;
      (document.head || document.documentElement).appendChild(styleEl);
    }
    const extra = opts.extraCss || '';
    styleEl.textContent = getCreamuWorkbenchCss() + (extra ? '\n' + extra : '');
    return styleEl;
  }
  /* Creamu WebDAV sync (generic vault file over WebDAV / 坚果云等) */
  const CREAMU_WD_DEFAULT_PATH = '/Creamu';

  function creamuWdCompact(v) {
    return String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  }

  function creamuWdSafeJson(text, fallback) {
    try {
      return JSON.parse(text);
    } catch (_) {
      return fallback;
    }
  }

  function creamuWdHttp(opts) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== 'function') {
        reject(new Error('GM_xmlhttpRequest unavailable'));
        return;
      }
      GM_xmlhttpRequest({
        method: opts.method || 'GET',
        url: opts.url,
        headers: opts.headers || {},
        data: opts.data,
        timeout: opts.timeout || 60000,
        responseType: opts.responseType || 'text',
        onload(res) {
          resolve(res);
        },
        onerror(err) {
          reject(err || new Error('network error'));
        },
        ontimeout() {
          reject(new Error('timeout'));
        },
      });
    });
  }

  /** Basic Auth：兼容非 ASCII 用户名/密码 */
  function creamuWdBasicAuth(user, pass) {
    const raw = String(user == null ? '' : user) + ':' + String(pass == null ? '' : pass);
    let b64;
    try {
      b64 = btoa(unescape(encodeURIComponent(raw)));
    } catch (_) {
      b64 = btoa(raw);
    }
    return 'Basic ' + b64;
  }

  function creamuWdJoinUrl(base, relPath) {
    const b = creamuWdCompact(base).replace(/\/+$/, '');
    const p = String(relPath == null ? '' : relPath)
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');
    if (!b) return '/' + p;
    if (!p) return b;
    return b + '/' + p;
  }

  /** 规范化相对目录：无首尾斜杠，空则默认 Creamu */
  function creamuWdNormDir(dir) {
    let d = creamuWdCompact(dir || CREAMU_WD_DEFAULT_PATH)
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');
    if (!d) d = 'Creamu';
    return d;
  }

  /**
   * @param {{
   *   product: string,
   *   notify?: (msg: string, isErr?: boolean) => void,
   *   exportPayload: () => Promise<object>,
   *   importPayload: (payload: object) => Promise<void>,
   *   getSettings: () => {
   *     enabled?: boolean,
   *     url?: string,
   *     user?: string,
   *     password?: string,
   *     path?: string,
   *     auto?: boolean,
   *     conflict?: string
   *   },
   * }} host
   */
  function createCreamuWebDavSync(host) {
    const product = creamuWdCompact(host.product || 'app').toLowerCase() || 'app';
    const metaKey = 'creamu_wd_meta_' + product;
    const vaultName = product + '.vault.json';
    let pushTimer = null;
    let busy = false;

    function notify(msg, isErr) {
      if (typeof host.notify === 'function') host.notify(msg, !!isErr);
      else if (typeof showToast === 'function') showToast(msg);
      else console.info('[Creamu WD]', msg);
    }

    function gmGet(key, def) {
      if (typeof GM_getValue !== 'function') return def;
      const v = GM_getValue(key, def);
      return v === undefined ? def : v;
    }

    function gmSet(key, val) {
      if (typeof GM_setValue === 'function') GM_setValue(key, val);
    }

    function loadMeta() {
      const raw = gmGet(metaKey, null);
      let m = typeof raw === 'string' ? creamuWdSafeJson(raw, null) : raw;
      if (!m || typeof m !== 'object') m = {};
      if (!m.device_id) m.device_id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      m.local_revision = Number(m.local_revision) || 0;
      m.dirty = !!m.dirty;
      m.last_sync = Number(m.last_sync) || 0;
      m.last_error = m.last_error || '';
      m.last_action = m.last_action || '';
      m.tested_ok = !!m.tested_ok;
      return m;
    }

    function saveMeta(m) {
      gmSet(metaKey, JSON.stringify(m || {}));
    }

    function settings() {
      const s = (typeof host.getSettings === 'function' && host.getSettings()) || {};
      return {
        enabled: !!s.enabled,
        url: creamuWdCompact(s.url || ''),
        user: creamuWdCompact(s.user || ''),
        password: String(s.password == null ? '' : s.password),
        path: creamuWdNormDir(s.path),
        auto: s.auto !== false,
        conflict: s.conflict === 'remote' || s.conflict === 'local' ? s.conflict : 'ask',
      };
    }

    function vaultRelPath() {
      return settings().path + '/' + vaultName;
    }

    function vaultUrl() {
      const st = settings();
      return creamuWdJoinUrl(st.url, vaultRelPath());
    }

    function authHeaders(extra) {
      const st = settings();
      return Object.assign(
        {
          Authorization: creamuWdBasicAuth(st.user, st.password),
        },
        extra || {}
      );
    }

    function isConfigured() {
      const st = settings();
      return !!(st.url && st.user && st.password);
    }

    function isConnected() {
      return isConfigured();
    }

    function statusText() {
      const st = settings();
      const m = loadMeta();
      if (!st.url) return '未配置 WebDAV 地址';
      if (!st.user || !st.password) return '未配置账号/应用密码';
      const when = m.last_sync ? new Date(m.last_sync).toLocaleString() : '从未';
      const err = m.last_error ? ' · 错: ' + m.last_error : '';
      const en = st.enabled ? '' : ' · 未启用';
      return st.user + ' · ' + vaultRelPath() + ' · rev ' + m.local_revision + ' · 上次 ' + when + en + err;
    }

    async function davRequest(method, url, body, headers, timeout) {
      const res = await creamuWdHttp({
        method,
        url,
        headers: authHeaders(headers),
        data: body,
        timeout: timeout || (method === 'PUT' ? 180000 : 60000),
      });
      return res;
    }

    function httpError(res, fallback) {
      const text = res.responseText != null ? String(res.responseText) : '';
      // 坚果云等常返回 HTML/Exception 堆栈，不当作用户可读主文案
      let snippet = text.replace(/\s+/g, ' ').trim();
      if (/IllegalArgument|Exception|stackTrace|<!DOCTYPE|<html/i.test(snippet)) {
        snippet = '';
      } else {
        snippet = snippet.slice(0, 120);
      }
      const msg = snippet || fallback || 'HTTP ' + res.status;
      const err = new Error(msg);
      err.status = res.status;
      err.body = text;
      return err;
    }

    /**
     * 尽力 MKCOL 创建目录。坚果云等对 MKCOL/PROPFIND 不友好，失败不抛错：
     * 真正依赖 PUT（多数服务会自动建中间路径）。
     */
    async function ensureFolder() {
      const st = settings();
      const segments = st.path.split('/').filter(Boolean);
      let acc = '';
      for (const seg of segments) {
        acc = acc ? acc + '/' + seg : seg;
        const url = creamuWdJoinUrl(st.url, acc);
        try {
          const res = await davRequest('MKCOL', url, null, {}, 30000);
          if (res.status >= 200 && res.status < 300) continue;
          // 已存在 / 不允许 / 不支持 都继续，交给后续 PUT
          if (
            res.status === 401 ||
            res.status === 403
          ) {
            // 鉴权问题后面 GET/PUT 再报；此处不提前中断
            continue;
          }
        } catch (_) {
          /* ignore */
        }
      }
    }

    async function downloadVault() {
      const res = await davRequest('GET', vaultUrl(), null, { Accept: 'application/json,text/plain,*/*' }, 120000);
      if (res.status === 404) return null;
      if (res.status === 401 || res.status === 403) {
        throw new Error('认证失败，请检查用户名与应用密码（坚果云需用应用密码）');
      }
      if (res.status < 200 || res.status >= 300) throw httpError(res, '下载失败 HTTP ' + res.status);
      const text = res.responseText != null ? String(res.responseText) : '';
      if (!text.trim()) return null;
      const data = creamuWdSafeJson(text, null);
      if (!data || data.creamu_vault !== 1) {
        if (data && data.payload) return data;
        throw new Error('远端文件不是有效的 Creamu vault');
      }
      return data;
    }

    async function uploadVault(vault) {
      await ensureFolder();
      const body = JSON.stringify(vault);
      const res = await davRequest(
        'PUT',
        vaultUrl(),
        body,
        {
          'Content-Type': 'application/json; charset=utf-8',
        },
        180000
      );
      if (res.status === 401 || res.status === 403) {
        throw new Error('认证失败，请检查用户名与应用密码（坚果云需用应用密码）');
      }
      if (res.status < 200 || res.status >= 300) throw httpError(res, '上传失败 HTTP ' + res.status);
      return true;
    }

    /**
     * 测试连接：与真实同步同一路径（GET vault）。
     * 不用 PROPFIND/HEAD —— 坚果云等常对它们返回 IllegalArgumentException。
     * 200 / 404 均视为连通；再可选做一次小 PUT 写探针不合适，避免污染 vault。
     */
    async function testConnection() {
      if (!isConfigured()) throw new Error('请先填写 WebDAV 地址、用户名和应用密码');
      const res = await davRequest(
        'GET',
        vaultUrl(),
        null,
        { Accept: 'application/json,text/plain,*/*' },
        30000
      );
      if (res.status === 401 || res.status === 403) {
        throw new Error('认证失败，请检查用户名与应用密码（坚果云需用应用密码）');
      }
      // 文件尚未存在也算鉴权与路径可达
      if (res.status === 404 || (res.status >= 200 && res.status < 300)) {
        const m = loadMeta();
        m.tested_ok = true;
        m.last_error = '';
        m.last_action = 'test';
        saveMeta(m);
        notify(res.status === 404 ? 'WebDAV 连接正常（云端尚无 vault，同步时会上传）' : 'WebDAV 连接正常');
        return true;
      }
      // 部分网关对不存在资源返回 409/405 等，再试 PUT 空路径探测成本高；直接报告状态
      throw httpError(res, '测试失败 HTTP ' + res.status + '（同步若正常可忽略测试，或检查路径）');
    }

    function markLocalDirty() {
      const m = loadMeta();
      m.dirty = true;
      m.local_revision = (Number(m.local_revision) || 0) + 1;
      saveMeta(m);
      const st = settings();
      if (st.enabled && st.auto && isConfigured()) schedulePush(8000);
    }

    function schedulePush(ms) {
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {
        pushTimer = null;
        void syncNow({ reason: 'auto' }).catch((e) => {
          const m = loadMeta();
          m.last_error = (e && e.message) || String(e);
          saveMeta(m);
        });
      }, ms || 8000);
    }

    async function buildVault(revision) {
      const payload = await host.exportPayload();
      const m = loadMeta();
      return {
        creamu_vault: 1,
        product,
        revision: Number(revision) || 1,
        updated_at: new Date().toISOString(),
        device_id: m.device_id,
        payload,
      };
    }

    async function applyRemote(vault) {
      if (!vault || !vault.payload) throw new Error('远端 vault 无效');
      if (vault.product && vault.product !== product) {
        throw new Error('远端产品不匹配：' + vault.product);
      }
      await host.importPayload(vault.payload);
      const m = loadMeta();
      m.local_revision = Number(vault.revision) || m.local_revision;
      m.dirty = false;
      m.last_sync = Date.now();
      m.last_action = 'pull';
      m.last_error = '';
      saveMeta(m);
    }

    async function pushVault() {
      const m = loadMeta();
      const rev = Math.max(1, Number(m.local_revision) || 1);
      const vault = await buildVault(rev);
      await uploadVault(vault);
      m.dirty = false;
      m.local_revision = rev;
      m.last_sync = Date.now();
      m.last_action = 'push';
      m.last_error = '';
      saveMeta(m);
      return vault;
    }

    /**
     * @param {{ reason?: string, force?: 'pull'|'push' }} [opts]
     */
    async function syncNow(opts) {
      opts = opts || {};
      if (busy) return { action: 'busy' };
      if (!isConfigured()) throw new Error('请先填写 WebDAV 地址、用户名和应用密码');
      busy = true;
      try {
        if (opts.force === 'push') {
          const m0 = loadMeta();
          m0.local_revision = Math.max(1, Number(m0.local_revision) || 0) + (m0.dirty ? 0 : 1);
          m0.dirty = true;
          saveMeta(m0);
          await pushVault();
          notify('已推送到 WebDAV');
          return { action: 'push' };
        }
        if (opts.force === 'pull') {
          const remote = await downloadVault();
          if (!remote) {
            notify('云端尚无备份，将推送本地');
            await pushVault();
            return { action: 'push' };
          }
          await applyRemote(remote);
          notify('已从 WebDAV 拉取');
          return { action: 'pull' };
        }

        const remote = await downloadVault();
        const m = loadMeta();
        const localRev = Number(m.local_revision) || 0;

        if (!remote) {
          await pushVault();
          notify('云端为空，已上传本地');
          return { action: 'push' };
        }

        const remoteRev = Number(remote.revision) || 0;

        if (remoteRev > localRev) {
          if (m.dirty && stConflictAsk()) {
            const ok =
              typeof confirm === 'function'
                ? confirm(
                    '云端 revision ' +
                      remoteRev +
                      ' 新于本地 ' +
                      localRev +
                      '，且本地有未同步修改。\n确定用云端覆盖本机？\n（取消则改为推送本机）'
                  )
                : true;
            if (!ok) {
              m.local_revision = remoteRev + 1;
              saveMeta(m);
              await pushVault();
              notify('已用本机覆盖云端');
              return { action: 'push' };
            }
          } else if (m.dirty && settings().conflict === 'local') {
            m.local_revision = remoteRev + 1;
            saveMeta(m);
            await pushVault();
            notify('冲突策略：已推送本机');
            return { action: 'push' };
          }
          await applyRemote(remote);
          notify('已从云端更新到 rev ' + remoteRev);
          return { action: 'pull' };
        }

        if (remoteRev < localRev || m.dirty) {
          if (remoteRev === localRev && m.dirty) {
            m.local_revision = localRev + 1;
            saveMeta(m);
          }
          await pushVault();
          notify('已推送到云端 rev ' + loadMeta().local_revision);
          return { action: 'push' };
        }

        m.last_sync = Date.now();
        m.last_action = 'noop';
        m.last_error = '';
        saveMeta(m);
        if (opts.reason !== 'auto') notify('已与云端一致');
        return { action: 'noop' };
      } catch (e) {
        const m = loadMeta();
        m.last_error = (e && e.message) || String(e);
        saveMeta(m);
        throw e;
      } finally {
        busy = false;
      }
    }

    function stConflictAsk() {
      return settings().conflict === 'ask';
    }

    async function bootSync() {
      const st = settings();
      if (!st.enabled || !st.auto || !isConfigured()) return null;
      try {
        return await syncNow({ reason: 'boot' });
      } catch (e) {
        console.warn('[Creamu WD] boot sync', e);
        return { action: 'error', error: e };
      }
    }

    return {
      product,
      vaultRelPath,
      vaultUrl,
      statusText,
      isConfigured,
      isConnected,
      testConnection,
      markLocalDirty,
      schedulePush,
      syncNow,
      bootSync,
      loadMeta,
      settings,
    };
  }
// 20-sites.js

/**
 * 列表卡选标题链接（跳过仅缩略图的空 <a>，避免标签流整卡跳过）。
 */
function pickListVideoLink(el) {
  if (!el || !el.querySelectorAll) return null;
  const anchors = el.querySelectorAll(
    'a[href*="/video"], a[href*="/video-"], a[href*="/video."]'
  );
  let best = null;
  let bestTitle = '';
  let bestScore = -1;

  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const href = (a.getAttribute('href') || '').trim();
    if (!href || /javascript:/i.test(href) || !/\/video/i.test(href)) continue;

    const titleAttr = (a.getAttribute('title') || '').trim();
    let text = titleAttr || (a.textContent || '').trim();
    text = text
      .replace(/\s*\d+\s*min\s*/gi, ' ')
      .replace(/\s*\d+\s*sec\s*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const img = a.querySelector && a.querySelector('img');
    // eporner 图链 text 空，但 img[alt] 常有完整标题
    if (text.length < 3 && img) {
      const alt = (img.getAttribute('alt') || '').replace(/\s+/g, ' ').trim();
      if (alt.length >= 3) text = alt;
    }

    const onlyImg = !!(img && text.length < 3 && !titleAttr);
    if (onlyImg) {
      if (!best) {
        best = a;
        bestTitle = '';
        bestScore = 0;
      }
      continue;
    }

    const inTitleZone = !!(
      a.closest &&
      a.closest(
        '.thumb-under, p.title, .title, .thumb-block p, .mbtit, p.mbtit, .mbunder'
      )
    );
    const fromAlt = !titleAttr && img && text === (img.getAttribute('alt') || '').replace(/\s+/g, ' ').trim();
    const score =
      (titleAttr ? 120 : 0) +
      (inTitleZone ? 80 : 0) +
      (fromAlt ? 40 : 0) +
      Math.min(text.length, 80);

    if (text.length >= 2 && score > bestScore) {
      best = a;
      bestTitle = text;
      bestScore = score;
    }
  }

  if (!best && anchors.length) best = anchors[0];
  if (!best) return null;

  if (!bestTitle) {
    try {
      const href = best.getAttribute('href') || '';
      const path = href.startsWith('http')
        ? new URL(href).pathname
        : href.split('?')[0];
      const slug = (path || '').split('/').filter(Boolean).pop() || '';
      bestTitle = slug.replace(/[-_~.]+/g, ' ').replace(/\s+/g, ' ').trim();
    } catch (_) {
      /* ignore */
    }
  }

  return { linkEl: best, title: bestTitle };
}

function pickListUploader(el) {
  if (!el || !el.querySelector) return '';
  const uploaderEl = el.querySelector(
    // eporner 新版
    '.mb-uploader a, span.mb-uploader a, a[href*="/profile/"][title="Uploader"], ' +
      // xvideos / xnxx
      '.uploader .name, div.uploader a .name, div.uploader a, span.uploader, ' +
      '.metadata a[href*="/channels/"] .name, .metadata a[href*="/profiles/"] .name, ' +
      '.metadata a[href*="/channels/"], .metadata a[href*="/profiles/"], ' +
      '.metadata .name, p.metadata a .name, p.metadata a, ' +
      'a[href*="/porn-maker/"] .name, a[href*="/porn-maker/"], ' +
      'a[href*="/amateur-channels/"] .name, a[href*="/profiles/"]'
  );
  if (!uploaderEl) return '';
  return (uploaderEl.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * 详情页缩略图 URL：多源兜底（og / twitter / video poster / 播放器图）。
 * 只返回 http(s) 或 data:，相对路径会拼 origin。
 */
function pickDetailThumbUrl() {
  const candidates = [];
  const push = (u) => {
    const s = String(u || '').trim();
    if (!s || s === 'about:blank') return;
    if (/^data:image\//i.test(s)) {
      candidates.push(s);
      return;
    }
    if (/^https?:\/\//i.test(s)) {
      candidates.push(s);
      return;
    }
    if (s.startsWith('//')) {
      candidates.push((location.protocol || 'https:') + s);
      return;
    }
    if (s.startsWith('/')) {
      try {
        candidates.push(location.origin + s);
      } catch (_) { /* ignore */ }
    }
  };

  document
    .querySelectorAll(
      'meta[property="og:image"], meta[property="og:image:secure_url"], meta[name="twitter:image"], meta[name="twitter:image:src"]'
    )
    .forEach((m) => push(m.getAttribute('content')));

  document.querySelectorAll('video').forEach((v) => {
    push(v.getAttribute('poster'));
    // 部分站 poster 在 dataset
    push(v.dataset && (v.dataset.poster || v.dataset.thumb));
  });

  document
    .querySelectorAll(
      '#video-player-bg img, .video-player img, .player-container img, ' +
        '#html5video img, .xplayer img, img.thumb, img[itemprop="thumbnailUrl"], ' +
        'link[rel="image_src"]'
    )
    .forEach((el) => {
      if (el.tagName === 'LINK') push(el.getAttribute('href'));
      else {
        push(el.getAttribute('data-src'));
        push(el.getAttribute('src'));
      }
    });

  // 去重保序，优先非 1x1 占位
  const seen = new Set();
  for (let i = 0; i < candidates.length; i++) {
    const u = candidates[i];
    if (seen.has(u)) continue;
    seen.add(u);
    if (/pixel|blank|spacer|1x1|data:image\/gif;base64,R0lGOD/i.test(u)) continue;
    return u;
  }
  return '';
}

const SITE_ADAPTERS = {
  xvideos: {
    matchHost: /xvideos\.com/i,
    detectPageKind() {
      if (location.pathname.startsWith('/video') || /\/video[0-9]+/.test(location.pathname)) {
        return 'video';
      }
      if (location.pathname === '/' || location.search.includes('k=') || location.pathname.startsWith('/tags/')) {
        return 'search';
      }
      return 'other';
    },
    buildSearchUrl(query) {
      return `https://www.xvideos.com/?k=${encodeURIComponent(query)}`;
    },
    parseSearchContext() {
      const sp = new URLSearchParams(location.search);
      let k = sp.get('k') || '';
      if (!k) {
        const m = location.pathname.match(/\/tags\/([^/]+)/);
        if (m) k = decodeURIComponent(m[1]).replace(/-/g, ' ');
      }
      return {
        query: k.trim(),
        url: location.href
      };
    },
    scrapeVideoMeta() {
      // 标题含 duration/hd 标记，剥掉
      const titleEl = document.querySelector('h2.page-title') || document.querySelector('.video-metadata .title') || document.querySelector('title');
      let title = titleEl ? titleEl.textContent.trim() : '';
      title = title.replace(/\s*\d+\s*min\s*/gi, ' ').replace(/\s*\d+p\s*/gi, ' ').replace(/\s+/g, ' ').trim();

      // 标签 a.is-keyword；tagTextFromAnchor 去 ＋✕ 噪声
      const tags = [];
      const seen = new Set();
      document.querySelectorAll(
        '.video-metadata a.is-keyword, .video-tags-list a.is-keyword, .ordered-label-list a.is-keyword, ' +
        '.video-metadata .video-tags a, .metadata-row .video-tags a, .video-tags a'
      ).forEach((a) => {
        const txt =
          typeof tagTextFromAnchor === 'function'
            ? tagTextFromAnchor(a)
            : (a.textContent || '').trim();
        if (!txt || txt.startsWith('+')) return;
        const key = txt.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        tags.push(txt);
      });
      
      const thumb = pickDetailThumbUrl();

      // 上传者：.uploader-tag / main-uploader
      const uploaderEl = document.querySelector(
        '.video-metadata a.uploader-tag .name, .video-metadata a.uploader-tag, ' +
        '.main-uploader a, a.uploader-tag, .video-metadata .uploader a, ' +
        'a[href*="/profiles/"], a[href*="/channels/"], .video-metadata-uploader a'
      );
      let uploader = uploaderEl ? uploaderEl.textContent.trim() : '';
      uploader = uploader.replace(/\s+/g, ' ').trim();
      
      return {
        title,
        url: location.href,
        thumb,
        tags,
        uploader
      };
    },
    getVideoElements() {
      return document.querySelectorAll('.mozaique .thumb-block, .mozaique [id^="video_"], .video-block');
    },
    parseVideoElement(el) {
      const picked = pickListVideoLink(el);
      if (!picked || !picked.linkEl) return null;
      let title = (picked.title || '').replace(/\s*\d+\s*min\s*/gi, ' ').replace(/\s+/g, ' ').trim();
      const href = picked.linkEl.getAttribute('href') || '';
      const url = href.startsWith('http') ? href : location.origin + href;
      const thumbEl = el.querySelector('img');
      const thumb = thumbEl ? (thumbEl.getAttribute('data-src') || thumbEl.getAttribute('src') || '') : '';
      const uploader = pickListUploader(el);
      return { el, title, url, thumb, uploader };
    }
  },
  
  xnxx: {
    matchHost: /xnxx\.com/i,
    detectPageKind() {
      // 详情：/video-xxxx/slug（勿用 startsWith('/video') 误伤其它路径）
      if (/^\/video[-.]/i.test(location.pathname) || /\/video[0-9]+/i.test(location.pathname)) {
        return 'video';
      }
      if (
        location.pathname === '/' ||
        location.search.includes('k=') ||
        /^\/search(\/|$)/i.test(location.pathname)
      ) {
        return 'search';
      }
      return 'other';
    },
    buildSearchUrl(query) {
      // 空格用 + 连接：/search/a+and+b
      const enc = encodeURIComponent(String(query || '').trim())
        .replace(/%20/g, '+')
        .replace(/%2B/gi, '+');
      return `https://www.xnxx.com/search/${enc}`;
    },
    parseSearchContext() {
      const sp = new URLSearchParams(location.search);
      let k = sp.get('k') || '';
      if (!k) {
        const parsed = parseXnxxSearchPath(location.pathname);
        k = parsed.query || '';
      }
      // 路径解析失败时从标题兜底
      if (!k && typeof document !== 'undefined' && document.title) {
        const tm = document.title.match(/^['"]([^'"]+)['"]\s*Search/i);
        if (tm) k = tm[1];
      }
      k = decodeSearchSegment(k);
      return {
        query: k.trim(),
        url: location.href
      };
    },
    scrapeVideoMeta() {
      const titleEl = document.querySelector('h2.page-title') || document.querySelector('.video-metadata .title') || document.querySelector('title');
      let title = titleEl ? titleEl.textContent.trim() : '';
      title = title.replace(/\s*\d+\s*min\s*/gi, ' ').replace(/\s*\d+p\s*/gi, ' ').replace(/\s+/g, ' ').trim();
      
      const tags = [];
      const seen = new Set();
      document.querySelectorAll(
        '.video-metadata a.is-keyword, .video-tags-list a.is-keyword, .ordered-label-list a.is-keyword, ' +
        '.video-metadata .video-tags a, .metadata-row .video-tags a, .video-tags a, .tags a'
      ).forEach((a) => {
        const txt =
          typeof tagTextFromAnchor === 'function'
            ? tagTextFromAnchor(a)
            : (a.textContent || '').trim();
        if (!txt || txt.startsWith('+')) return;
        const key = txt.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        tags.push(txt);
      });
      
      const thumb = pickDetailThumbUrl();

      const uploaderEl = document.querySelector(
        '.video-metadata a.uploader-tag .name, .video-metadata a.uploader-tag, ' +
        '.main-uploader a, a.uploader-tag, .video-metadata .uploader a, ' +
        'a[href*="/profiles/"], a[href*="/channels/"], .video-metadata-uploader a'
      );
      let uploader = uploaderEl ? uploaderEl.textContent.trim() : '';
      uploader = uploader.replace(/\s+/g, ' ').trim();
      
      return {
        title,
        url: location.href,
        thumb,
        tags,
        uploader
      };
    },
    getVideoElements() {
      return document.querySelectorAll('.mozaique .thumb-block, .mozaique [id^="video_"], .video-block');
    },
    parseVideoElement(el) {
      // xnxx：无 p.title，标题在 .thumb-under > p > a[title]；图链在前且无字
      const picked = pickListVideoLink(el);
      if (!picked || !picked.linkEl) return null;
      let title = (picked.title || '').replace(/\s*\d+\s*min\s*/gi, ' ').replace(/\s+/g, ' ').trim();
      const href = picked.linkEl.getAttribute('href') || '';
      const url = href.startsWith('http') ? href : location.origin + href;
      const thumbEl = el.querySelector('img');
      const thumb = thumbEl ? (thumbEl.getAttribute('data-src') || thumbEl.getAttribute('src') || '') : '';
      // xnxx 上传者：div.uploader > a > span.name（非 span.uploader）
      const uploader = pickListUploader(el);
      return { el, title, url, thumb, uploader };
    }
  },
  
  eporner: {
    matchHost: /eporner\.com/i,
    detectPageKind() {
      // 详情：/video-XXXX/slug/
      if (/^\/video-/i.test(location.pathname)) {
        return 'video';
      }
      // 列表：/tag/ /search/ /cat/ 首页；旧 ?key= 仍兼容
      if (
        location.pathname === '/' ||
        /^\/(search|tag|cat)(\/|$)/i.test(location.pathname) ||
        location.search.includes('key=') ||
        location.search.includes('search=')
      ) {
        return 'search';
      }
      return 'other';
    },
    buildSearchUrl(query) {
      // 站内 /search/q/ 会 301 到 /tag/q/；直接走 tag，空格→连字符
      const slug = epornerQueryToSlug(query);
      return `https://www.eporner.com/tag/${slug}/`;
    },
    parseSearchContext() {
      const sp = new URLSearchParams(location.search);
      let query = sp.get('search') || sp.get('key') || sp.get('q') || '';
      if (!query) {
        const parsed = parseEpornerListPath(location.pathname);
        query = parsed.query || '';
      }
      // 标题兜底： "Mom Porn - ..." / "Search Mom Daughter Porn"
      if (!query && typeof document !== 'undefined' && document.title) {
        const t = document.title;
        let m = t.match(/^Search\s+(.+?)\s+Porn\b/i);
        if (!m) m = t.match(/^(.+?)\s+Porn\b/i);
        if (m) query = m[1].replace(/\s*-\s*.*$/, '').trim();
      }
      query = decodeSearchSegment(String(query || ''));
      // 搜索框当前值（最准）
      try {
        const inp = document.querySelector('#srch, input[name="search"]');
        const v = inp && (inp.value || '').trim();
        if (v) query = v;
      } catch (_) {
        /* ignore */
      }
      return {
        query: query.trim(),
        url: location.href
      };
    },
    scrapeVideoMeta() {
      const titleEl = document.querySelector('h1') || document.querySelector('title');
      let title = titleEl ? titleEl.textContent.trim() : '';
      title = title
        .replace(/\s*\d+\s*min\s*/gi, ' ')
        .replace(/\s*\d+p\s*/gi, ' ')
        .replace(/\s*\(4K\)\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const tags = [];
      const seen = new Set();
      document
        .querySelectorAll(
          'a[href^="/tag/"], a[href^="/cat/"], .vit-pornstar a, .vit-category a, ' +
            '#video-tags a, .tag-container a, a.tag'
        )
        .forEach((a) => {
          const txt =
            typeof tagTextFromAnchor === 'function'
              ? tagTextFromAnchor(a)
              : (a.textContent || '').trim();
          if (!txt || txt.length > 48 || txt.startsWith('+')) return;
          if (
            /^(home|search|video|upload|popular|latest|verified|hd|3d|vr|pornstars|subscribe)$/i.test(
              txt
            )
          ) {
            return;
          }
          if (typeof isBroadOrNoiseLexiconTag === 'function' && isBroadOrNoiseLexiconTag(txt)) {
            return;
          }
          const key = txt.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          tags.push(txt);
        });

      const thumb = pickDetailThumbUrl();

      const uploaderEl = document.querySelector(
        'a[href*="/profile/"][title="Uploader"], a[href*="/profile/"], ' +
          '.publisher-name, a[href*="/channel/"], .post-channel a'
      );
      const uploader = uploaderEl ? uploaderEl.textContent.trim() : '';

      return {
        title,
        url: location.href,
        thumb,
        tags,
        uploader
      };
    },
    getVideoElements() {
      const modern = document.querySelectorAll('#vidresults .mb, .mb[data-id]');
      if (modern && modern.length) return modern;
      return document.querySelectorAll(
        '#videos-list .post, .post, .post-container, div.mb'
      );
    },
    parseVideoElement(el) {
      const picked = pickListVideoLink(el);
      if (!picked || !picked.linkEl) return null;
      let title = (picked.title || '')
        .replace(/\s*\d+\s*min\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      // .mbtit 文本优先（比 img alt 更干净）
      const titA = el.querySelector('.mbtit a, p.mbtit a');
      if (titA) {
        const t2 = (titA.getAttribute('title') || titA.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();
        if (t2.length >= 2) title = t2;
      }
      const href = (titA && titA.getAttribute('href')) || picked.linkEl.getAttribute('href') || '';
      const url = href.startsWith('http') ? href : location.origin + href;
      const thumbEl = el.querySelector('img');
      const thumb = thumbEl
        ? thumbEl.getAttribute('data-src') || thumbEl.getAttribute('src') || ''
        : '';
      const uploader = pickListUploader(el);
      return { el, title, url, thumb, uploader };
    }
  }
};

// 适配器统一入口
function detectSite() {
  const host = location.hostname;
  for (const k in SITE_ADAPTERS) {
    if (SITE_ADAPTERS[k].matchHost.test(host)) {
      return k;
    }
  }
  return null;
}

function getSiteAdapter() {
  const s = detectSite();
  return s ? SITE_ADAPTERS[s] : null;
}

function detectPageKind() {
  const ad = getSiteAdapter();
  return ad ? ad.detectPageKind() : 'other';
}

function buildSearchUrl(site, query) {
  const ad = SITE_ADAPTERS[site] || getSiteAdapter();
  if (ad) {
    return ad.buildSearchUrl(query);
  }
  return `https://www.xvideos.com/?k=${encodeURIComponent(query)}`;
}

function parseSearchContext() {
  const ad = getSiteAdapter();
  return ad ? ad.parseSearchContext() : { query: '', url: location.href };
}

function scrapeVideoMeta() {
  const ad = getSiteAdapter();
  return ad ? ad.scrapeVideoMeta() : { title: '', url: location.href, thumb: '', tags: [], uploader: '' };
}

function getVideoElements() {
  const ad = getSiteAdapter();
  return ad ? ad.getVideoElements() : [];
}

function parseVideoElement(el) {
  const ad = getSiteAdapter();
  return ad ? ad.parseVideoElement(el) : null;
}

/** 搜索路径段解码：%20 / + / - → 空格 */
function decodeSearchSegment(seg) {
  let s = String(seg == null ? '' : seg);
  try {
    s = decodeURIComponent(s);
  } catch (_) {
    /* keep raw */
  }
  return s
    .replace(/\+/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * xnxx 搜索路径：
 * /search/{q}
 * /search/{q}/{page}
 * /search/{filter}/{q}
 * /search/{filter}/{q}/{page}
 * filter 例：0-10min、10min+；勿把 filter 段当成搜索词。
 */
function parseXnxxSearchPath(pathname) {
  const parts = String(pathname || '')
    .split('/')
    .filter(Boolean);
  if (!parts.length || parts[0].toLowerCase() !== 'search') {
    return { query: '', page: 1, filters: [] };
  }
  const segs = parts.slice(1);
  if (!segs.length) return { query: '', page: 1, filters: [] };

  let page = 1;
  if (/^\d+$/.test(segs[segs.length - 1])) {
    page = Math.max(1, parseInt(segs.pop(), 10) || 1);
  }

  const FILTER_RE = /^(?:\d+(?:-\d+)?min\+?|hd|4k|vr)$/i;
  const filters = [];
  while (segs.length > 1 && FILTER_RE.test(segs[0])) {
    filters.push(segs.shift());
  }

  const query = segs.map(decodeSearchSegment).filter(Boolean).join(' ');
  return { query, page, filters };
}

/** eporner：query → URL slug（空格/and 变连字符） */
function epornerQueryToSlug(query) {
  return String(query || '')
    .trim()
    .toLowerCase()
    .replace(/\+/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'all';
}

/**
 * eporner 列表路径：
 * /tag/{q}/  /tag/{q}/{page}/
 * /search/{q}/ → 常 301 到 /tag/
 * /cat/{q}/
 * 排序段 longest/shortest 等不是页码
 */
function parseEpornerListPath(pathname) {
  const parts = String(pathname || '')
    .split('/')
    .filter(Boolean);
  if (!parts.length) return { kind: '', query: '', page: 1 };
  const kind = parts[0].toLowerCase();
  if (kind !== 'tag' && kind !== 'search' && kind !== 'cat') {
    return { kind: '', query: '', page: 1 };
  }
  const segs = parts.slice(1);
  if (!segs.length) return { kind, query: '', page: 1 };

  let page = 1;
  if (/^\d+$/.test(segs[segs.length - 1])) {
    page = Math.max(1, parseInt(segs.pop(), 10) || 1);
  }
  const SORT_RE =
    /^(longest|shortest|top|recent|recently|most-viewed|best|hot|new|rated)$/i;
  if (segs.length && SORT_RE.test(segs[segs.length - 1])) {
    segs.pop();
  }
  const query = segs.map(decodeSearchSegment).filter(Boolean).join(' ');
  return { kind, query, page };
}

/**
 * 列表页码：内部统一 1-based。
 * xvideos ?p= 0-based；xnxx /search/q/N；eporner /tag/q/N（优先路径分页）。
 */
function parseListPage(site) {
  const s = site || detectSite();
  const sp = new URLSearchParams(location.search);

  if (s === 'eporner') {
    const parsed = parseEpornerListPath(location.pathname);
    if (parsed.page > 1) return parsed.page;
    let page = parseInt(sp.get('page'), 10);
    if (Number.isFinite(page) && page >= 1) return page;
    return 1;
  }

  if (s === 'xnxx') {
    // 优先路径分页；部分站 ?p= 无效
    const parsed = parseXnxxSearchPath(location.pathname);
    if (parsed.page > 1) return parsed.page;
    const rawP = sp.get('p');
    if (rawP != null && rawP !== '') {
      const p = parseInt(rawP, 10);
      if (Number.isFinite(p) && p >= 0) return p + 1;
    }
    return 1;
  }

  // xvideos
  const rawP = sp.get('p');
  if (rawP != null && rawP !== '') {
    const p = parseInt(rawP, 10);
    if (Number.isFinite(p) && p >= 0) return p + 1;
  }
  return 1;
}

/** 把收藏断点页码写回站点 URL（1-based → 站点参数） */
function applyListPageToUrl(urlStr, site, page1Based) {
  const page = Math.max(1, Number(page1Based) || 1);
  try {
    const u = new URL(
      urlStr,
      typeof location !== 'undefined' ? location.origin : 'https://www.xnxx.com'
    );
    if (site === 'eporner') {
      // 真实分页：/tag/q/N/ ；?page= 常 301 丢页码
      u.searchParams.delete('page');
      const parsed = parseEpornerListPath(u.pathname);
      let q = parsed.query;
      if (!q) {
        const spQ = u.searchParams.get('search') || u.searchParams.get('key') || '';
        q = decodeSearchSegment(spQ);
      }
      const slug = epornerQueryToSlug(q || 'all');
      const kind = parsed.kind === 'cat' ? 'cat' : 'tag';
      u.pathname = page > 1 ? `/${kind}/${slug}/${page}/` : `/${kind}/${slug}/`;
      return u.toString();
    }
    if (site === 'xnxx') {
      // 站内分页是 /search/q/N，不是 ?p=
      u.searchParams.delete('p');
      const parsed = parseXnxxSearchPath(u.pathname);
      let q = parsed.query;
      if (!q) {
        // 兼容收藏时带编码的 /search/...
        const rawSegs = u.pathname.split('/').filter(Boolean).slice(1);
        if (rawSegs.length && !/^\d+$/.test(rawSegs[rawSegs.length - 1])) {
          q = decodeSearchSegment(rawSegs[rawSegs.length - 1]);
        } else if (rawSegs.length >= 2) {
          q = decodeSearchSegment(rawSegs[rawSegs.length - 2]);
        }
      }
      const qSeg = encodeURIComponent(q).replace(/%20/g, '+');
      let path = '/search/';
      if (parsed.filters && parsed.filters.length) {
        path += parsed.filters.join('/') + '/';
      }
      path += qSeg || 'search';
      if (page > 1) path += '/' + page;
      u.pathname = path;
      return u.toString();
    }
    // xvideos：0-based ?p=
    u.searchParams.set('p', String(page - 1));
    return u.toString();
  } catch (_) {
    return urlStr;
  }
}

/**
 * 稳定视频 ID（短 id）。旧断点可能存整段 pathname，匹配时用 videoIdsMatch。
 */
function videoIdFromUrl(urlStr) {
  if (!urlStr) return '';
  try {
    const path = new URL(urlStr, typeof location !== 'undefined' ? location.origin : 'https://x.com')
      .pathname || '';
    // xvideos: /video.oohdvlee3fe/slug
    let m = path.match(/\/video\.([a-z0-9]+)/i);
    if (m) return m[1];
    // xnxx / eporner: /video-1h4gc1b7/slug
    m = path.match(/\/video-([a-z0-9]+)/i);
    if (m) return m[1];
    m = path.match(/\/video(\d+)/i);
    if (m) return m[1];
    return path;
  } catch (_) {
    return String(urlStr);
  }
}

/** 兼容旧断点（整 path）与新短 id */
function videoIdsMatch(a, b) {
  const x = String(a || '').trim();
  const y = String(b || '').trim();
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.includes(y) || y.includes(x)) return true;
  // 各自再抽一次 id
  const ix = videoIdFromUrl(x.startsWith('/') || x.includes('://') ? x : '/' + x);
  const iy = videoIdFromUrl(y.startsWith('/') || y.includes('://') ? y : '/' + y);
  return !!(ix && iy && ix === iy);
}
// 25-theme.js

function getScoutThemeCss() {
  return `
        /* 站点配色皮肤体系 (CSS 变量) */
        :root {
          --scout-theme-color: #d4883a;
          --scout-theme-dark: #b56e28;
          --scout-theme-light: #fffdf8;
          --scout-theme-shadow: rgba(212, 136, 58, 0.22);
          --scout-bg-clean: #fafafa;
          --scout-card-bg: #ffffff;
          --scout-text-color: #4a3728;
        }
        /* 三站分色：工作台 + 列表卡片（卡片禁止纯白，避免三站长一样） */
        body.creamu-site-xvideos {
          --scout-theme-color: #e54840;
          --scout-theme-dark: #9e2a24;
          --scout-theme-light: #fde8e6;
          --scout-theme-shadow: rgba(229, 72, 64, 0.28);
          --scout-bg-clean: #f2d4d0;
          --scout-card-bg: #f8e0dc;
          --scout-text-color: #3a1512;
        }
        body.creamu-site-xnxx {
          --scout-theme-color: #2e70e5;
          --scout-theme-dark: #1a3f96;
          --scout-theme-light: #e3ecfc;
          --scout-theme-shadow: rgba(46, 112, 229, 0.28);
          --scout-bg-clean: #d2def2;
          --scout-card-bg: #e0eaf8;
          --scout-text-color: #122038;
        }
        body.creamu-site-eporner {
          --scout-theme-color: #2ea854;
          --scout-theme-dark: #186b34;
          --scout-theme-light: #e3f6e9;
          --scout-theme-shadow: rgba(46, 168, 84, 0.28);
          --scout-bg-clean: #d0e8d6;
          --scout-card-bg: #def0e4;
          --scout-text-color: #12301c;
        }

        /*
         * 清爽：只藏明确广告位，禁止 class/id 子串 *ad-*（会误伤 gamepad 等，
         * 运行时广告壳也常套在列表附近，过宽选择器会把整列视频 height:0 挡没）。
         * 绝不匹配 .thumb-block / .mozaique / 列表卡。
         */
        html.scout-cream-site body.creamu-site-xvideos .ad-provider,
        html.scout-cream-site body.creamu-site-xvideos .sponsor,
        html.scout-cream-site body.creamu-site-xvideos .video-ad-panel,
        html.scout-cream-site body.creamu-site-xvideos .ads-container,
        html.scout-cream-site body.creamu-site-xvideos .premium-tab,
        html.scout-cream-site body.creamu-site-xvideos #ad-footer,
        html.scout-cream-site body.creamu-site-xvideos [id^="ad_"]:not(.thumb-block):not([id^="video_"]),
        html.scout-cream-site body.creamu-site-xvideos iframe[src*="doubleclick"],
        html.scout-cream-site body.creamu-site-xvideos iframe[src*="/ads"],
        html.scout-cream-site body.creamu-site-xvideos iframe[src*="exoclick"],
        html.scout-cream-site body.creamu-site-xnxx .ad-provider,
        html.scout-cream-site body.creamu-site-xnxx .sponsor,
        html.scout-cream-site body.creamu-site-xnxx .video-ad-panel,
        html.scout-cream-site body.creamu-site-xnxx .ads-container,
        html.scout-cream-site body.creamu-site-xnxx .premium-tab,
        html.scout-cream-site body.creamu-site-xnxx #ad-footer,
        html.scout-cream-site body.creamu-site-xnxx [id^="ad_"]:not(.thumb-block):not([id^="video_"]),
        html.scout-cream-site body.creamu-site-xnxx iframe[src*="doubleclick"],
        html.scout-cream-site body.creamu-site-xnxx iframe[src*="/ads"],
        html.scout-cream-site body.creamu-site-xnxx iframe[src*="exoclick"],
        html.scout-cream-site body.creamu-site-eporner .adv_box,
        html.scout-cream-site body.creamu-site-eporner .ad_direct,
        html.scout-cream-site body.creamu-site-eporner .ads-container,
        html.scout-cream-site body.creamu-site-eporner #ad-footer,
        html.scout-cream-site body.creamu-site-eporner [id^="ad_"]:not(.post):not([id^="video_"]),
        html.scout-cream-site body.creamu-site-eporner iframe[src*="doubleclick"],
        html.scout-cream-site body.creamu-site-eporner iframe[src*="/ads"] {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          max-height: 0 !important;
          overflow: hidden !important;
          pointer-events: none !important;
        }

        /* 奶油工作台及 FAB 响应色（覆盖 shared 的固定橙） */
        #jlc-wb-fab {
          position: fixed !important;
          z-index: 2147483000 !important;
          background: linear-gradient(var(--scout-theme-color), var(--scout-theme-dark)) !important;
          background-color: var(--scout-theme-color) !important;
          box-shadow: 0 4px 0 var(--scout-theme-dark), 0 10px 20px var(--scout-theme-shadow) !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
          display: flex !important;
        }
        #jlc-wb-fab:active, #jlc-wb-fab.is-dragging {
          box-shadow: 0 2px 0 var(--scout-theme-dark), 0 4px 10px var(--scout-theme-shadow) !important;
        }
        #scout-search-track-bar.scout-track-fab {
          z-index: 2147483001 !important;
        }
        /*
         * 工作台按钮/导航：必须 !important。
         * cream 页主题用 html.scout-cream-site button:not(.jlc-wb-btn)… 暗色，
         * 而「组合/词库/…」导航是裸 button（无 jlc-wb-btn），会被整排刷黑。
         */
        #jlc-wb .jlc-wb-nav button,
        #jlc-wb .jlc-wb-settings-nav button {
          appearance: none !important;
          flex: 1 1 auto !important;
          border: 0 !important;
          background: #efe4d2 !important;
          background-color: #efe4d2 !important;
          color: #8a6f55 !important;
          padding: 10px 8px !important;
          cursor: pointer !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          border-radius: 12px !important;
          box-shadow: none !important;
        }
        #jlc-wb .jlc-wb-nav button.active,
        #jlc-wb .jlc-wb-settings-nav button.active {
          color: #fff !important;
          background: var(--scout-theme-color) !important;
          background-color: var(--scout-theme-color) !important;
          box-shadow: 0 2px 0 var(--scout-theme-dark) !important;
        }
        #jlc-wb .jlc-wb-btn {
          appearance: none !important;
          background: #fffaf2 !important;
          background-color: #fffaf2 !important;
          color: #5a4030 !important;
          border: 1px solid #e0cdae !important;
          box-shadow: 0 2px 0 #e0cdae !important;
        }
        #jlc-wb .jlc-wb-btn.primary {
          background: linear-gradient(var(--scout-theme-color), var(--scout-theme-dark)) !important;
          background-color: var(--scout-theme-color) !important;
          border-color: transparent !important;
          color: #fff !important;
          box-shadow: 0 2px 0 var(--scout-theme-dark) !important;
        }
        #jlc-wb .jlc-wb-btn.primary:hover {
          filter: brightness(1.05);
        }
        #jlc-wb .jlc-wb-btn.ghost {
          background: #fffaf2 !important;
          background-color: #fffaf2 !important;
          color: #5a4030 !important;
          border: 1px solid #e0cdae !important;
        }
        #jlc-wb .jlc-wb-btn.ghost:hover {
          color: var(--scout-theme-color) !important;
          border-color: var(--scout-theme-color) !important;
          background: #fff !important;
        }
        #jlc-wb .jlc-wb-btn.danger {
          background: #f3d5d0 !important;
          background-color: #f3d5d0 !important;
          border-color: #e8b8b0 !important;
          color: #8a3a32 !important;
          box-shadow: none !important;
        }
        #jlc-wb .jlc-wb-chip {
          background: #fff !important;
          background-color: #fff !important;
          color: #5a4030 !important;
          border: 1px solid #e0cdae !important;
          box-shadow: 0 2px 0 #e6d3b5 !important;
        }
        #jlc-wb .jlc-wb-chip.is-on {
          background: var(--scout-theme-color) !important;
          background-color: var(--scout-theme-color) !important;
          border-color: transparent !important;
          color: #fff !important;
          box-shadow: 0 2px 0 var(--scout-theme-dark) !important;
        }
        #jlc-wb .jlc-wb-open-btn {
          background: linear-gradient(var(--scout-theme-color), var(--scout-theme-dark)) !important;
          background-color: var(--scout-theme-color) !important;
          color: #fff !important;
          box-shadow: 0 3px 0 var(--scout-theme-dark) !important;
          border: 0 !important;
        }
        #jlc-wb .jlc-wb-more-btn {
          background: #fffaf2 !important;
          color: #5a4030 !important;
          border: 1px solid #e0cdae !important;
        }
        #jlc-wb .jlc-wb-icon-btn {
          background: #fff !important;
          color: #5a4030 !important;
          border: 1px solid #e0cdae !important;
          box-shadow: 0 2px 0 #e6d3b5 !important;
        }
        /* 组合底栏：搜索主色、收藏/清空 ghost */
        #jlc-wb .scout-combo-dock-actions .jlc-wb-btn.primary,
        #jlc-wb .scout-combo-dock-actions #scout-combo-search-btn {
          background: linear-gradient(var(--scout-theme-color), var(--scout-theme-dark)) !important;
          background-color: var(--scout-theme-color) !important;
          color: #fff !important;
          border-color: transparent !important;
        }
        #jlc-wb .legacy-toggle input[type="checkbox"] {
          accent-color: var(--scout-theme-color) !important;
        }
        #jlc-wb .jlc-wb-search:focus {
          border-color: var(--scout-theme-color) !important;
        }

        /*
         * Scout 页面布局：shared 的 [data-jlc-wb-page] > * 会把所有子节点
         * 设成 flex:1 + overflow:hidden，PC 上列表/表单看起来像“打开了但空白”。
         * 这里用更高优先级纠正 toolbar/footer 与可滚动区。
         */
        #jlc-wb [data-jlc-wb-page] {
          min-height: 0 !important;
          overflow: hidden !important;
        }
        #jlc-wb [data-jlc-wb-page] > .jlc-wb-toolbar,
        #jlc-wb [data-jlc-wb-page] > .jlc-wb-footer {
          flex: 0 0 auto !important;
          min-height: auto !important;
          overflow: visible !important;
          display: flex !important;
          flex-direction: column !important;
        }
        #jlc-wb [data-jlc-wb-page] > .jlc-wb-list-scroll {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          display: block !important;
        }
        /* 仅有 list-scroll 单子节点时同样可滚 */
        #jlc-wb [data-jlc-wb-page] > .jlc-wb-list-scroll:only-child {
          height: 100%;
        }

        /* 组合页底栏：宽度跟工作台走，一行流式自适应 */
        #jlc-wb [data-jlc-wb-page="combo"] {
          display: flex !important;
          flex-direction: column !important;
          min-width: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        #jlc-wb [data-jlc-wb-page="combo"] > .jlc-wb-footer.scout-combo-dock,
        #jlc-wb .scout-combo-dock {
          flex: 0 0 auto !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px)) !important;
          box-sizing: border-box !important;
          border-top: 1px solid #ead7bb !important;
          background: #fffaf3 !important;
          box-shadow: 0 -4px 12px rgba(80, 50, 20, 0.06) !important;
        }
        #jlc-wb .scout-combo-dock-inner {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 8px !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }
        #jlc-wb .scout-combo-dock-sites {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 4px !important;
          flex: 0 1 auto !important;
          min-width: 0 !important;
        }
        #jlc-wb .scout-combo-dock-sites .scout-combo-site {
          flex: 0 0 auto !important;
          box-sizing: border-box !important;
        }
        #jlc-wb .scout-combo-dock-sites .scout-combo-site:has(input:checked) {
          border-color: var(--scout-theme-color) !important;
          background: var(--scout-theme-light, #fff3e0) !important;
          color: var(--scout-theme-dark, #b56e28) !important;
          font-weight: 650;
        }
        #jlc-wb .scout-combo-dock-track {
          display: inline-flex !important;
          align-items: center !important;
          gap: 3px !important;
          flex: 0 0 auto !important;
          margin: 0 !important;
          font-size: 11.5px !important;
          color: #6a5040 !important;
          cursor: pointer;
          white-space: nowrap;
          text-transform: none !important;
          letter-spacing: 0 !important;
        }
        #jlc-wb .scout-combo-dock-track input {
          width: 14px !important;
          height: 14px !important;
          margin: 0 !important;
          accent-color: var(--scout-theme-color);
        }
        /* 按钮区吃掉剩余宽度；窄到放不下则整行 100% */
        #jlc-wb .scout-combo-dock-actions {
          display: flex !important;
          flex: 1 1 200px !important;
          gap: 6px !important;
          min-width: min(100%, 200px) !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        #jlc-wb .scout-combo-dock-actions .jlc-wb-btn {
          flex: 1 1 0 !important;
          width: auto !important;
          min-width: 0 !important;
          max-width: none !important;
          justify-content: center !important;
          min-height: 34px !important;
          padding: 6px 8px !important;
          font-size: 12.5px !important;
          box-sizing: border-box !important;
        }
        #jlc-wb .scout-combo-dock-actions #scout-combo-search-btn {
          flex: 1.35 1 0 !important;
        }
        #jlc-wb .scout-combo-dock-actions #scout-combo-clear-btn {
          flex: 0.75 1 0 !important;
        }
        /* 极窄：引擎+追更一行，按钮整行三等分 */
        @media (max-width: 380px) {
          #jlc-wb .scout-combo-dock-actions {
            flex: 1 1 100% !important;
            width: 100% !important;
            min-width: 100% !important;
          }
        }

        /* Scout 页面块：不依赖 #jlc-wb-view-root */
        #jlc-wb .jlc-wb-view-block {
          background: #fffdf8;
          border: 1px solid #efe0cc;
          border-radius: 16px;
          padding: 14px;
          margin-bottom: 14px;
          box-shadow: 0 3px 0 #ead7bb;
        }
        #jlc-wb .jlc-wb-view-title {
          font-size: 12px;
          color: var(--scout-theme-color);
          font-weight: 750;
          letter-spacing: .5px;
          margin: 0 0 12px;
          text-transform: uppercase;
        }
        #jlc-wb .stat-box {
          display: flex;
          justify-content: space-around;
          background: #fffdf8;
          border: 1px solid #efe0cc;
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 4px;
        }
        #jlc-wb .stat-item { text-align: center; }
        #jlc-wb .stat-item b {
          display: block;
          color: var(--scout-theme-color);
          font-size: 22px;
          margin-bottom: 4px;
        }
        #jlc-wb .stat-item span { font-size: 11px; color: #9a7d60; }

        /*
         * 工作台表单：强制奶油浅色，避免 cream 页主题全局 input 暗色
         * （html.scout-cream-site input { background: var(--scout-card) !important }）
         */
        #jlc-wb {
          color-scheme: light;
        }
        #jlc-wb input[type="text"],
        #jlc-wb input[type="search"],
        #jlc-wb input[type="password"],
        #jlc-wb input[type="email"],
        #jlc-wb input[type="number"],
        #jlc-wb input[type="url"],
        #jlc-wb input:not([type]),
        #jlc-wb textarea,
        #jlc-wb select,
        #jlc-wb .jlc-wb-search,
        #jlc-wb select.jlc-wb-select {
          background: #fffaf3 !important;
          color: #4a3728 !important;
          border: 1px solid #e4d4bc !important;
          box-shadow: 0 1px 0 #efe0cc !important;
          color-scheme: light !important;
          caret-color: var(--scout-theme-dark, #b56e28) !important;
        }
        #jlc-wb input[type="text"]::placeholder,
        #jlc-wb input[type="search"]::placeholder,
        #jlc-wb input[type="password"]::placeholder,
        #jlc-wb input:not([type])::placeholder,
        #jlc-wb textarea::placeholder,
        #jlc-wb .jlc-wb-search::placeholder {
          color: #a89078 !important;
          opacity: 1 !important;
        }
        #jlc-wb input[type="text"]:focus,
        #jlc-wb input[type="search"]:focus,
        #jlc-wb input[type="password"]:focus,
        #jlc-wb input[type="email"]:focus,
        #jlc-wb input:not([type]):focus,
        #jlc-wb textarea:focus,
        #jlc-wb select:focus,
        #jlc-wb .jlc-wb-search:focus {
          border-color: var(--scout-theme-color) !important;
          outline: none !important;
          background: #fff !important;
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--scout-theme-color) 25%, transparent) !important;
        }

        /* 设置页表单（settings 不在 .jlc-wb-settings 抽屉内） */
        #jlc-wb [data-jlc-wb-page="settings"] label {
          display: block;
          font-size: 12px;
          color: #9a7d60;
          margin-top: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        #jlc-wb [data-jlc-wb-page="settings"] input[type="text"],
        #jlc-wb [data-jlc-wb-page="settings"] input[type="password"],
        #jlc-wb [data-jlc-wb-page="settings"] textarea,
        #jlc-wb [data-jlc-wb-page="settings"] select {
          width: 100%;
          padding: 12px;
          margin-top: 8px;
          border-radius: 12px;
          border: 1px solid #e4d4bc !important;
          background: #fff !important;
          color: #4a3728 !important;
          font-size: 14px;
          box-sizing: border-box;
        }
        #jlc-wb [data-jlc-wb-page="settings"] input:focus,
        #jlc-wb [data-jlc-wb-page="settings"] textarea:focus,
        #jlc-wb [data-jlc-wb-page="settings"] select:focus {
          border-color: var(--scout-theme-color) !important;
          outline: none;
          background: #fff !important;
        }

        /* 采集弹层 */
        #scout-collect-dialog {
          position: fixed;
          inset: 0;
          z-index: 1000002;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(90, 60, 30, 0.35);
          padding: 20px;
        }
        #scout-collect-dialog .scout-collect-card {
          width: min(400px, 92vw);
          background: #fffdf8;
          border: 1px solid #e4d4bc;
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 18px 50px rgba(90, 60, 30, 0.22);
          color: #4a3728;
        }
        #scout-collect-dialog h4 {
          margin: 0 0 6px;
          font-size: 16px;
          color: #4a3728;
        }
        #scout-collect-dialog .scout-collect-term {
          margin: 0 0 12px;
          font-size: 15px;
          font-weight: 750;
          color: var(--scout-theme-color);
          word-break: break-word;
        }
        #scout-collect-dialog label {
          display: block;
          font-size: 12px;
          color: #9a7d60;
          margin-top: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        #scout-collect-dialog label.scout-collect-loved {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 14px;
          text-transform: none;
          letter-spacing: 0;
          font-size: 13.5px;
          color: #4a3728;
          cursor: pointer;
        }
        #scout-collect-dialog input[type="text"],
        #scout-collect-dialog select {
          width: 100%;
          padding: 10px 12px;
          margin-top: 6px;
          border-radius: 12px;
          border: 1px solid #e4d4bc !important;
          background: #fffaf3 !important;
          color: #4a3728 !important;
          font-size: 14px;
          box-sizing: border-box;
          color-scheme: light !important;
        }
        #scout-collect-dialog input[type="text"]:focus,
        #scout-collect-dialog select:focus {
          border-color: var(--scout-theme-color) !important;
          outline: none;
          background: #fff !important;
        }
        #scout-collect-dialog input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: var(--scout-theme-color);
        }
        #scout-collect-dialog .scout-collect-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 16px;
        }

        /* 追更：同 query 折叠组 + 三站展开行 */
        .scout-track-group-sites {
          display: none;
          flex-direction: column;
          gap: 6px;
          margin: 0 10px 10px;
          padding: 8px 10px;
          border-top: 1px dashed #efe0cc;
          background: rgba(255, 250, 240, 0.55);
          border-radius: 0 0 12px 12px;
        }
        .scout-track-group-sites.is-open { display: flex; }
        .scout-track-site-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          font-size: 12px;
        }
        .scout-track-site-row.is-current { font-weight: 650; }
        .scout-track-site-meta { color: #9a7d60; font-size: 11px; flex: 1 1 auto; min-width: 0; }
        .scout-track-site-pill.is-subscribed { opacity: 1; }
        .scout-track-site-pill.is-empty { opacity: 0.45; }
        .jlc-site-pill.is-empty { opacity: 0.5; }

        /* 作品：三站芯片（★ 原站 / 其余去搜）— 跟站点主题色，勿被 cream 全局 button 暗色盖掉 */
        #jlc-wb .scout-work-site-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 6px;
        }
        #jlc-wb .scout-work-site-chip {
          appearance: none;
          border: 1px solid color-mix(in srgb, var(--scout-theme-color) 45%, #e6d3b8) !important;
          background: var(--scout-theme-light, #fffaf3) !important;
          color: var(--scout-theme-dark, #6b4a2e) !important;
          border-radius: 999px !important;
          padding: 2px 8px !important;
          font-size: 11px !important;
          font-weight: 650 !important;
          cursor: pointer;
          line-height: 1.4;
          box-shadow: none !important;
        }
        #jlc-wb .scout-work-site-chip:hover {
          border-color: var(--scout-theme-color) !important;
          color: var(--scout-theme-color) !important;
          background: #fff !important;
          filter: none !important;
        }
        #jlc-wb .scout-work-site-chip.is-current,
        #jlc-wb .scout-work-site-chip.is-origin {
          border-color: transparent !important;
          background: linear-gradient(var(--scout-theme-color), var(--scout-theme-dark)) !important;
          background-color: var(--scout-theme-color) !important;
          color: #fff !important;
          font-weight: 750 !important;
          box-shadow: 0 2px 0 var(--scout-theme-dark) !important;
        }

        .scout-breakpoint-highlight {
          outline: 3px dashed var(--scout-theme-color) !important;
          outline-offset: 4px !important;
          position: relative !important;
          box-shadow: 0 0 20px var(--scout-theme-shadow) !important;
          animation: scoutPulse 1.5s infinite alternate !important;
          transition: outline-color 0.3s;
        }
        @keyframes scoutPulse {
          from { outline-color: var(--scout-theme-color); }
          to { outline-color: #ff5f56; }
        }

        .scout-tag-explored {
          opacity: 0.65 !important;
          border: 1px dashed var(--scout-theme-color) !important;
          border-radius: 4px !important;
          padding: 1px 4px !important;
        }
        .scout-tag-loved {
          box-shadow: 0 0 8px var(--scout-theme-shadow) !important;
          border: 1px solid var(--scout-theme-color) !important;
          font-weight: 750 !important;
          background: var(--scout-theme-light) !important;
        }

        /* PC：站点 cropped 展开 */
        @media (min-width: 821px) {
          .video-metadata.cropped,
          .ordered-label-list.cropped,
          .video-tags-list.cropped,
          .scout-tags-expanded {
            max-height: none !important;
            overflow: visible !important;
            height: auto !important;
          }
        }
        /* 手机详情：标签默认一行；描述默认两行；点展开 */
        @media (max-width: 820px) {
          .video-metadata.scout-tags-collapsed,
          .ordered-label-list.scout-tags-collapsed,
          .video-tags-list.scout-tags-collapsed,
          .metadata-row.video-tags.scout-tags-collapsed,
          .video-tags.scout-tags-collapsed,
          .video-metadata.cropped:not(.scout-tags-expanded) {
            max-height: 2.15em !important;
            overflow: hidden !important;
            height: auto !important;
          }
          .video-metadata.scout-tags-expanded,
          .ordered-label-list.scout-tags-expanded,
          .video-tags-list.scout-tags-expanded,
          .metadata-row.video-tags.scout-tags-expanded,
          .video-tags.scout-tags-expanded {
            max-height: none !important;
            overflow: visible !important;
            height: auto !important;
          }
          .scout-desc-collapsed,
          .video-description.scout-desc-collapsed,
          #video-description.scout-desc-collapsed,
          [itemprop="description"].scout-desc-collapsed {
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            -webkit-line-clamp: 2 !important;
            max-height: 3em !important;
            overflow: hidden !important;
            line-height: 1.45 !important;
            word-break: break-word !important;
          }
          .scout-desc-expanded,
          .video-description.scout-desc-expanded,
          #video-description.scout-desc-expanded {
            display: block !important;
            -webkit-line-clamp: unset !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .scout-tags-toggle,
          .scout-desc-toggle {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 4px 0 8px !important;
            padding: 8px 12px !important;
            border: 1px solid rgba(255,255,255,0.16) !important;
            border-radius: 12px !important;
            background: rgba(0,0,0,0.35) !important;
            color: #e8eaef !important;
            font-size: 13px !important;
            font-weight: 650 !important;
            cursor: pointer !important;
            box-sizing: border-box !important;
            -webkit-tap-highlight-color: transparent;
          }
          html.scout-cream-site .scout-tags-toggle,
          html.scout-cream-site .scout-desc-toggle {
            background: var(--scout-page-panel, rgba(30,36,48,.92)) !important;
            border-color: var(--scout-page-border, rgba(255,255,255,.14)) !important;
            color: var(--scout-text-color, #e8eaef) !important;
          }
        }
        @media (min-width: 821px) {
          .scout-tags-toggle,
          .scout-desc-toggle { display: none !important; }
        }
        /* 详情词库行：嵌在 metadata 内，不另起大卡片 */
        #scout-lex-hit-bar.scout-lex-hit-inline,
        li.scout-lex-hit-inline,
        .scout-lex-hit-bar.scout-lex-hit-inline {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 4px !important;
          list-style: none !important;
          width: 100% !important;
          margin: 6px 0 0 !important;
          padding: 6px 0 0 !important;
          border: 0 !important;
          border-top: 1px solid rgba(0, 0, 0, 0.08) !important;
          background: transparent !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          clear: both !important;
        }
        .scout-lex-inline-prefix {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-width: 18px !important;
          height: 18px !important;
          padding: 0 5px !important;
          border-radius: 3px !important;
          font-size: 10px !important;
          font-weight: 800 !important;
          color: #fff !important;
          background: var(--scout-theme-color, #d4883a) !important;
          line-height: 1 !important;
          flex: 0 0 auto !important;
        }
        .scout-lex-hit-inline .scout-lex-flow-chips {
          display: contents !important;
        }
        .scout-lex-hit-inline .scout-lex-chip {
          display: inline-flex !important;
          align-items: center !important;
          padding: 2px 8px !important;
          border-radius: 3px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          line-height: 1.35 !important;
          background: rgba(212, 136, 58, 0.12) !important;
          color: var(--scout-text-color, #4a3728) !important;
          border: 1px solid rgba(212, 136, 58, 0.35) !important;
        }
        .scout-lex-hit-inline .scout-lex-chip.is-loved {
          background: rgba(229, 72, 64, 0.12) !important;
          color: #b8322b !important;
          border-color: rgba(229, 72, 64, 0.4) !important;
        }
        .scout-lex-hit-inline .scout-lex-chip.is-more {
          background: transparent !important;
          border-style: dashed !important;
          color: #888 !important;
        }
        .scout-lex-flow {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          align-items: center;
        }
        .scout-lex-flow-empty {
          font-size: 11px;
          color: #9a7d60;
        }
        .scout-lex-chip {
          display: inline-flex;
          align-items: center;
          max-width: 100%;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11.5px;
          font-weight: 650;
          line-height: 1.35;
          background: #efe4d2;
          color: #5a4030;
          border: 1px solid #e0cdae;
        }
        .scout-lex-chip.is-loved {
          background: #fde8e6;
          color: #b8322b;
          border-color: #f0b8b0;
        }
        .scout-lex-chip.is-more {
          background: transparent;
          border-style: dashed;
          color: #9a7d60;
        }
        /* 列表：缩略图底部轻渐变 + 胶囊标签（无「命中」文案） */
        .scout-lex-flow-overlay {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 4px !important;
          position: absolute !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          z-index: 30 !important;
          margin: 0 !important;
          padding: 18px 6px 6px !important;
          max-height: 54% !important;
          overflow: hidden !important;
          pointer-events: none !important;
          background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,.15) 35%, rgba(0,0,0,.72) 100%) !important;
          border-radius: 0 0 10px 10px !important;
          box-sizing: border-box !important;
        }
        /*
         * 仅在有词库叠层时改 position，避免全局 .thumb{relative}
         * 打坏 xnxx/xvideos 手机站比例盒 → 列表「被挡没」
         */
        .thumb-inside:has(.scout-lex-flow-overlay),
        .thumb:has(.scout-lex-flow-overlay),
        .mbimg:has(.scout-lex-flow-overlay),
        .mbcontent:has(.scout-lex-flow-overlay) {
          position: relative !important;
        }
        /* ===== 详情页：收藏作品按钮（PC / 手机） ===== */
        .scout-work-fav-bar {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          margin: 8px 0 10px !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          clear: both !important;
        }
        .scout-work-fav-btn {
          display: inline-flex !important;
          align-items: center !important;
          gap: 10px !important;
          min-height: 44px !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 8px 14px 8px 12px !important;
          border: 0 !important;
          border-radius: 14px !important;
          cursor: pointer !important;
          box-sizing: border-box !important;
          text-align: left !important;
          color: #fff !important;
          background: linear-gradient(135deg, var(--scout-accent, #e8a24e), var(--scout-theme-dark, #b56e28)) !important;
          box-shadow: 0 3px 0 rgba(0,0,0,.22), 0 8px 18px rgba(0,0,0,.28) !important;
          transition: transform .12s ease, filter .12s ease, box-shadow .12s ease !important;
          -webkit-tap-highlight-color: transparent;
        }
        .scout-work-fav-btn:hover {
          filter: brightness(1.06);
        }
        .scout-work-fav-btn:active {
          transform: translateY(1px);
          box-shadow: 0 1px 0 rgba(0,0,0,.22), 0 4px 10px rgba(0,0,0,.22) !important;
        }
        .scout-work-fav-btn.is-saved {
          background: linear-gradient(135deg, #3d4a3a, #2a3828) !important;
          box-shadow: 0 0 0 1px rgba(120, 200, 140, 0.45), 0 6px 14px rgba(0,0,0,.25) !important;
          color: #e8f8ec !important;
        }
        .scout-work-fav-ico {
          flex: 0 0 auto !important;
          width: 28px !important;
          height: 28px !important;
          border-radius: 50% !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 16px !important;
          line-height: 1 !important;
          background: rgba(0,0,0,.22) !important;
        }
        .scout-work-fav-btn.is-saved .scout-work-fav-ico {
          color: #ffd76a !important;
          background: rgba(255, 215, 100, 0.16) !important;
        }
        .scout-work-fav-text {
          display: flex !important;
          flex-direction: column !important;
          gap: 1px !important;
          min-width: 0 !important;
        }
        .scout-work-fav-label {
          font-size: 14px !important;
          font-weight: 750 !important;
          line-height: 1.2 !important;
          letter-spacing: 0.2px !important;
        }
        .scout-work-fav-sub {
          font-size: 11px !important;
          font-weight: 500 !important;
          line-height: 1.2 !important;
          opacity: 0.88 !important;
        }
        @media (max-width: 820px) {
          .scout-work-fav-bar {
            width: 100% !important;
            margin: 10px 0 12px !important;
          }
          .scout-work-fav-btn {
            width: 100% !important;
            min-height: 48px !important;
            padding: 10px 14px !important;
            border-radius: 16px !important;
            justify-content: flex-start !important;
          }
          .scout-work-fav-ico {
            width: 32px !important;
            height: 32px !important;
            font-size: 18px !important;
          }
          .scout-work-fav-label {
            font-size: 15px !important;
          }
          .scout-work-fav-sub {
            font-size: 12px !important;
          }
        }
        @media (min-width: 821px) {
          .scout-work-fav-btn {
            min-width: 200px !important;
          }
        }
        /* 奶油主题下跟站强调色 */
        html.scout-cream-site .scout-work-fav-btn:not(.is-saved) {
          background: linear-gradient(135deg, var(--scout-accent, #5b8def), color-mix(in srgb, var(--scout-accent, #5b8def) 70%, #000)) !important;
        }
        html.scout-cream-site body.creamu-site-xvideos .scout-work-fav-btn:not(.is-saved) {
          background: linear-gradient(135deg, #e54840, #9e2a24) !important;
        }
        html.scout-cream-site body.creamu-site-xnxx .scout-work-fav-btn:not(.is-saved) {
          background: linear-gradient(135deg, #4d8ef0, #1a4fa0) !important;
        }
        html.scout-cream-site body.creamu-site-eporner .scout-work-fav-btn:not(.is-saved) {
          background: linear-gradient(135deg, #3cb86a, #1e7a42) !important;
        }

        /* 手机列表预览层：绝对铺满，不参与文档流、不撑大卡片 */
        .scout-list-preview-layer {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100% !important;
          height: 100% !important;
          z-index: 20 !important;
          overflow: hidden !important;
          pointer-events: none !important;
          border-radius: inherit !important;
        }
        .scout-list-preview-video {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border: 0 !important;
          background: transparent !important;
          pointer-events: none !important;
        }
        /* 不强制改 position，避免 eporner 卡被撑大；有 relative 的宿主才叠角标 */
        .scout-preview-playing {
          outline: 2px solid rgba(255, 200, 80, 0.75);
          outline-offset: -2px;
        }
        .thumb.scout-preview-playing,
        .thumb-inside.scout-preview-playing,
        .mbcontent.scout-preview-playing,
        .mbimg.scout-preview-playing {
          position: relative !important;
        }
        .scout-preview-playing::after {
          content: '预览中 · 再点进入';
          position: absolute;
          left: 6px;
          bottom: 6px;
          z-index: 25;
          padding: 2px 7px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 650;
          color: #fff;
          background: rgba(0,0,0,.62);
          pointer-events: none;
          max-width: calc(100% - 12px);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* 无 :has 的老内核兜底：JS 会写 inline position:relative */
        .scout-lex-flow-overlay .scout-lex-flow-chips {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 4px !important;
          align-items: center !important;
        }
        .scout-lex-flow-overlay .scout-lex-chip {
          font-size: 10px !important;
          font-weight: 650 !important;
          padding: 2px 7px !important;
          border-radius: 999px !important;
          color: #fff !important;
          background: rgba(18, 20, 26, 0.72) !important;
          border: 1px solid rgba(255,255,255,0.2) !important;
          box-shadow: 0 1px 3px rgba(0,0,0,.25) !important;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        .scout-lex-flow-overlay .scout-lex-chip.is-loved {
          color: #fff !important;
          background: rgba(229, 72, 64, 0.92) !important;
          border-color: rgba(255, 180, 160, 0.5) !important;
        }
        .scout-lex-flow-overlay .scout-lex-chip.is-more {
          background: rgba(255,255,255,0.16) !important;
          border-style: dashed !important;
          color: rgba(255,255,255,0.9) !important;
        }
        /* 详情页词库条 */
        .scout-lex-hit-bar .scout-lex-chip {
          background: #f3ebe0 !important;
          color: #4a3728 !important;
          border: 1px solid #e4d4bc !important;
          padding: 3px 9px !important;
          font-size: 12px !important;
        }
        .scout-lex-hit-bar .scout-lex-chip.is-loved {
          background: #fde8e6 !important;
          color: #b8322b !important;
          border-color: #f0b8b0 !important;
        }
        .scout-lex-flow-work .scout-lex-chip {
          background: #efe4d2 !important;
          color: #5a4030 !important;
          border: 1px solid #e0cdae !important;
        }
        .scout-lex-flow-work .scout-lex-chip.is-loved {
          background: #fde8e6 !important;
          color: #b8322b !important;
          border-color: #f0b8b0 !important;
        }
        .scout-tag-blocked {
          opacity: 0.28 !important;
          text-decoration: line-through !important;
          pointer-events: none !important;
          cursor: not-allowed !important;
          filter: grayscale(0.6);
        }
        /*
         * 详情页原生标签融合：统一胶囊，词库内/外两套样式
         * xvideos/xnxx a.is-keyword · eporner .vit-tag a / .vit-category a
         */
        html.scout-cream-site a.scout-site-tag,
        html.scout-cream-site .scout-site-tag {
          display: inline-flex !important;
          align-items: center !important;
          gap: 4px !important;
          flex-wrap: nowrap !important;
          max-width: 100% !important;
          margin: 2px 3px !important;
          padding: 3px 9px !important;
          border-radius: 999px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          line-height: 1.35 !important;
          text-decoration: none !important;
          box-sizing: border-box !important;
          vertical-align: middle !important;
          transition: background .12s ease, border-color .12s ease, color .12s ease;
        }
        /* 未入库：暗底描边 */
        html.scout-cream-site a.scout-site-tag.scout-tag-out,
        html.scout-cream-site .scout-site-tag.scout-tag-out {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.14) !important;
          color: #c8cdd8 !important;
        }
        html.scout-cream-site a.scout-site-tag.scout-tag-out:hover {
          border-color: var(--scout-accent, #5b8def) !important;
          color: #fff !important;
        }
        /* 已入库：强调色填充 */
        html.scout-cream-site a.scout-site-tag.scout-tag-in,
        html.scout-cream-site .scout-site-tag.scout-tag-in,
        html.scout-cream-site a.scout-site-tag.scout-tag-explored {
          background: var(--scout-accent-soft, rgba(91,141,239,.22)) !important;
          border: 1px solid var(--scout-accent, #5b8def) !important;
          color: #f0f4ff !important;
        }
        html.scout-cream-site a.scout-site-tag.scout-tag-loved {
          background: rgba(229, 72, 64, 0.28) !important;
          border-color: #e54840 !important;
          color: #ffe8e6 !important;
          box-shadow: 0 0 0 1px rgba(229, 72, 64, 0.25);
        }
        html.scout-cream-site .scout-tag-zh {
          font-size: 11px !important;
          font-weight: 650 !important;
          opacity: 0.92;
          color: inherit !important;
          border-left: 1px solid rgba(255,255,255,0.22);
          padding-left: 5px;
          margin-left: 1px;
          max-width: 7em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        html.scout-cream-site .scout-tag-heart {
          color: #ff6b62 !important;
          font-size: 11px !important;
          line-height: 1 !important;
        }
        html.scout-cream-site .scout-tag-addon {
          display: inline-flex !important;
          gap: 2px !important;
          margin-left: 2px !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          line-height: 1 !important;
          vertical-align: middle !important;
        }
        html.scout-cream-site .scout-tag-addon span {
          cursor: pointer;
          border-radius: 4px !important;
          padding: 1px 3px !important;
          background: rgba(0,0,0,0.28) !important;
        }
        /* 标签容器：可换行，暗色面板 */
        html.scout-cream-site .video-metadata,
        html.scout-cream-site .video-tags-list,
        html.scout-cream-site .ordered-label-list,
        html.scout-cream-site .metadata-row.video-metadata {
          background: transparent !important;
        }
        html.scout-cream-site .video-metadata ul,
        html.scout-cream-site .video-tags-list ul,
        html.scout-cream-site .ordered-label-list ul {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 2px 0 !important;
          height: auto !important;
        }
        @media (min-width: 821px) {
          html.scout-cream-site .video-metadata ul,
          html.scout-cream-site .video-tags-list ul,
          html.scout-cream-site .ordered-label-list ul {
            max-height: none !important;
            overflow: visible !important;
          }
        }

        /*
         * 已点：PC 轻微整卡变暗；手机用缩略图遮罩（站点原生卡 opacity 几乎看不出，
         * 且 eporner 手机曾强制 opacity:1 盖掉已点）。
         * 屏蔽仍是 opacity ~0.08，两者差很多
         */
        .scout-visited-item {
          opacity: 0.78 !important;
          filter: none !important;
        }
        .scout-visited-item::after {
          content: none !important;
          display: none !important;
        }
        .scout-visited-item .thumb-inside::before,
        .scout-visited-item .thumb::before {
          content: none !important;
          display: none !important;
        }
        body.creamu-site-xvideos .mozaique .thumb-block.scout-visited-item,
        body.creamu-site-xnxx .mozaique .thumb-block.scout-visited-item,
        body.creamu-site-eporner #videos-list .post.scout-visited-item,
        body.creamu-site-eporner .post.scout-visited-item,
        body.creamu-site-eporner #vidresults .mb.scout-visited-item,
        body.creamu-site-eporner .mb.scout-visited-item {
          outline: none !important;
        }
        @media (max-width: 820px) {
          .scout-visited-item {
            opacity: 1 !important;
            position: relative !important;
            outline: 2px solid rgba(200, 200, 210, 0.55) !important;
            outline-offset: 0 !important;
          }
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb.scout-visited-item,
          html.scout-cream-site body.creamu-site-eporner .mb.scout-visited-item {
            opacity: 1 !important;
          }
          /* 缩略图区域暗罩（不整卡淡） */
          .scout-visited-item .thumb,
          .scout-visited-item .thumb-inside,
          .scout-visited-item .mbimg,
          .scout-visited-item .mbcontent {
            position: relative !important;
          }
          .scout-visited-item .thumb::after,
          .scout-visited-item .thumb-inside::after,
          .scout-visited-item .mbimg::after,
          .scout-visited-item .mbcontent::after {
            content: '' !important;
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background: rgba(0, 0, 0, 0.42) !important;
            pointer-events: none !important;
            z-index: 25 !important;
            border-radius: inherit;
          }
          /* 无 .thumb 结构时：罩在首图上 */
          .scout-visited-item > a:first-child,
          .scout-visited-item a.thumb,
          .scout-visited-item .frame-block > a {
            position: relative !important;
          }
          .scout-visited-item::before {
            content: '过' !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: absolute !important;
            top: 6px !important;
            right: 6px !important;
            z-index: 40 !important;
            min-width: 22px !important;
            height: 20px !important;
            padding: 0 6px !important;
            border-radius: 6px !important;
            font-size: 11px !important;
            font-weight: 750 !important;
            line-height: 1 !important;
            color: #f2f2f4 !important;
            background: rgba(0, 0, 0, 0.62) !important;
            border: 1px solid rgba(255, 255, 255, 0.22) !important;
            pointer-events: none !important;
            box-sizing: border-box !important;
          }
        }

        .scout-pub-loved-card {
          outline: 3px solid var(--scout-theme-color) !important;
          outline-offset: 2px !important;
          box-shadow: 0 10px 30px var(--scout-theme-shadow) !important;
          position: relative !important;
        }
        .scout-pub-badge {
          position: absolute;
          top: 4px;
          left: 4px;
          background: var(--scout-theme-color);
          color: #fff;
          font-size: 10px;
          font-weight: bold;
          padding: 1px 5px;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
          z-index: 5;
          pointer-events: none;
        }

        /*
         * 列表「一卡一框」：统一暗卡 + 浅字，三站只差强调色（PC/手机同结构）
         */
        /* xvideos / xnxx 列表卡框 */
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block {
          box-sizing: border-box !important;
          background: var(--scout-card-bg, #1e2430) !important;
          border: 1px solid var(--scout-page-border, rgba(255,255,255,.10)) !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 14px rgba(0,0,0,.28) !important;
          overflow: hidden !important;
          padding: 6px !important;
          color: #e8eaef !important;
        }
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block {
          box-shadow: 0 4px 14px rgba(229, 72, 64, 0.12) !important;
        }
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block {
          box-shadow: 0 4px 14px rgba(77, 142, 240, 0.12) !important;
        }
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb-inside,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb-inside,
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb {
          border-radius: 8px !important;
          overflow: hidden !important;
          max-width: 100% !important;
        }
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb-under,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb-under {
          padding: 4px 2px 0 !important;
          box-sizing: border-box !important;
          max-width: 100% !important;
          color: #e8eaef !important;
        }
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block p,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block p,
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block p a,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block p a,
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb-under,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb-under,
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb-under a,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb-under a,
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .metadata,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .metadata,
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .metadata a,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .metadata a,
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .uploader,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .uploader,
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .uploader a,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .uploader a {
          color: #e8eaef !important;
          max-width: 100% !important;
          overflow: hidden !important;
          word-break: break-word !important;
          opacity: 1 !important;
        }
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block p a,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block p a,
        html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb-under a,
        html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb-under a {
          color: var(--scout-link, #8eb4f0) !important;
          font-weight: 650 !important;
        }
        /*
         * eporner 列表：只做轻染色，绝不改 display/float/width/img position
         * （grid + absolute 图会把卡压没 / 挡死）
         */
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb,
        html.scout-cream-site body.creamu-site-eporner .mb[data-id] {
          background: var(--scout-card-bg, #161e18) !important;
          border: 1px solid var(--scout-page-border, rgba(255,255,255,.10)) !important;
          border-radius: 10px !important;
          box-shadow: 0 2px 10px rgba(0,0,0,.22) !important;
          color: #e8eaef !important;
          box-sizing: border-box !important;
        }
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbtit,
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbtit a,
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbunder,
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbunder a,
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbstats,
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mb-uploader a {
          color: #e8eaef !important;
          opacity: 1 !important;
        }
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbtit a {
          color: var(--scout-link, #7fd4a0) !important;
          font-weight: 650 !important;
        }
        html.scout-cream-site body.creamu-site-eporner #vidresults .mb img {
          visibility: visible !important;
          opacity: 1 !important;
        }

        /* PC：顶部超矮订阅条 */
        #scout-search-track-bar.scout-track-banner {
          position: fixed !important;
          top: 8px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 999990 !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          max-width: min(380px, 72vw) !important;
          min-height: 0 !important;
          height: auto !important;
          padding: 3px 4px 3px 10px !important;
          border-radius: 999px !important;
          background: rgba(18, 20, 28, 0.92) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          box-shadow: 0 4px 12px rgba(0,0,0,.28) !important;
          color: #e8eaef !important;
          font-size: 11.5px !important;
          line-height: 1.2 !important;
          box-sizing: border-box !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        #scout-search-track-bar .scout-track-banner-text {
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 600;
        }
        #scout-search-track-bar .scout-track-banner-btn {
          flex: 0 0 auto;
          border: 0;
          border-radius: 999px;
          padding: 2px 9px;
          min-height: 22px;
          font-size: 11px;
          font-weight: 650;
          line-height: 1.2;
          cursor: pointer;
          background: var(--scout-accent, #5b8def);
          color: #fff;
        }
        #scout-search-track-bar.scout-track-banner.is-on .scout-track-banner-btn {
          background: rgba(255,255,255,0.12);
          color: #e8eaef;
        }
        /* 断点条：全局压成单行矮胶囊 */
        #jlc-tracking-pagebar {
          min-height: 0 !important;
          max-height: 36px !important;
          padding: 4px 8px !important;
          border-radius: 999px !important;
          gap: 6px !important;
        }
        #jlc-tracking-pagebar .jlc-tracking-pagebar-text {
          font-size: 11.5px !important;
          line-height: 1.2 !important;
        }
        #jlc-tracking-pagebar button {
          min-height: 22px !important;
          padding: 2px 8px !important;
          font-size: 11px !important;
        }
        /* 手机：订阅小圆钮 —— 固定视口右下，在工作台钮上方 */
        #scout-search-track-bar.scout-track-fab {
          position: fixed !important;
          right: 16px !important;
          bottom: 64px !important;
          left: auto !important;
          top: auto !important;
          transform: none !important;
          z-index: 999991 !important;
          width: 40px !important;
          height: 40px !important;
          min-width: 40px !important;
          max-width: 40px !important;
          padding: 0 !important;
          margin: 0 !important;
          border-radius: 50% !important;
          border: 1px solid rgba(255,255,255,0.14) !important;
          background: rgba(18, 20, 28, 0.92) !important;
          box-shadow: 0 4px 14px rgba(0,0,0,.35) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          color: #f0f0f0 !important;
          font-size: 18px !important;
          line-height: 1 !important;
          box-sizing: border-box !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          -webkit-tap-highlight-color: transparent;
        }
        #scout-search-track-bar.scout-track-fab.is-on {
          border-color: rgba(255, 200, 80, 0.55) !important;
          box-shadow: 0 4px 16px rgba(255, 180, 40, 0.28) !important;
        }
        #scout-search-track-bar.scout-track-fab .scout-track-fab-ico {
          pointer-events: none;
        }
        @media (max-width: 820px) {
          #jlc-tracking-pagebar {
            top: 6px !important;
            bottom: auto !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: min(340px, 94vw) !important;
            max-height: 34px !important;
            padding: 3px 6px 3px 8px !important;
            font-size: 11px !important;
          }
          /* 手机订阅仍是 40 圆钮，略缩小一点少挡屏 */
          #scout-search-track-bar.scout-track-fab {
            width: 36px !important;
            height: 36px !important;
            min-width: 36px !important;
            max-width: 36px !important;
            font-size: 16px !important;
            bottom: 60px !important;
          }
        }

        @media (min-width: 821px) {
          /* PC：内容区 + 列表底色 + 卡面 */
          html.scout-cream-site body.creamu-site-xvideos #content,
          html.scout-cream-site body.creamu-site-xnxx #content {
            background-color: var(--scout-bg-clean) !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            min-height: 0 !important;
          }
          html.scout-cream-site body.creamu-site-xvideos .mozaique,
          html.scout-cream-site body.creamu-site-xnxx .mozaique,
          html.scout-cream-site body.creamu-site-eporner #vidresults {
            background: var(--scout-bg-clean) !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block,
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block,
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb,
          html.scout-cream-site body.creamu-site-eporner #videos-list .post {
            background: var(--scout-card-bg) !important;
            border-radius: 12px !important;
            border: 1px solid rgba(0,0,0,0.06) !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.06) !important;
            visibility: visible !important;
            max-height: none !important;
          }
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block img,
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block img,
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb img {
            visibility: visible !important;
            opacity: 1 !important;
          }
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block p,
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block p,
          html.scout-cream-site body.creamu-site-eporner #videos-list .post .title,
          html.scout-cream-site body.creamu-site-eporner #videos-list .post .title a,
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbtit,
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbtit a {
            color: var(--scout-text-color) !important;
          }
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .metadata a,
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .metadata a {
            color: var(--scout-theme-color) !important;
          }
          html.scout-cream-site body.creamu-site-xvideos .mozaique,
          html.scout-cream-site body.creamu-site-xnxx .mozaique {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important;
            gap: 20px !important;
            padding: 16px !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            /* 清掉站点 float 布局残留 */
            font-size: inherit !important;
          }
          /*
           * 仅对「可见」卡片做 flex 卡面：:not([style*="display: none"])
           * 避免 !important 把屏蔽 hide 的片又顶回来。
           */
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block:not([style*="display: none"]),
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block:not([style*="display: none"]) {
            display: flex !important;
            flex-direction: column !important;
            float: none !important;
            clear: none !important;
            width: auto !important;
            min-width: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 10px !important;
            border-radius: 16px !important;
            overflow: visible !important;
            transition: transform 0.25s ease, box-shadow 0.25s ease !important;
          }
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block:hover,
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block:hover {
            transform: translateY(-5px) !important;
            box-shadow: 0 12px 30px var(--scout-theme-shadow) !important;
          }
          /* 打破站点 padding-bottom 比例盒 + absolute 图导致高度塌成 0 */
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb-inside,
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb-inside,
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb,
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb {
            position: relative !important;
            width: 100% !important;
            height: auto !important;
            min-height: 148px !important;
            margin: 0 !important;
            padding: 0 !important;
            padding-bottom: 0 !important;
            overflow: hidden !important;
            border-radius: 12px !important;
            flex: 0 0 auto !important;
          }
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block img,
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block img {
            position: relative !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            bottom: auto !important;
            display: block !important;
            visibility: visible !important;
            border-radius: 12px !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 165px !important;
            min-height: 148px !important;
            object-fit: cover !important;
          }
          html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block p,
          html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block p {
            font-size: 13.5px !important;
            font-weight: 600 !important;
            line-height: 1.45 !important;
            margin-top: 10px !important;
            max-height: 40px !important;
            overflow: hidden !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
          }
          /* eporner PC：不再强行 grid/absolute（会挡没列表），只保证可见 */
          html.scout-cream-site body.creamu-site-eporner #vidresults,
          html.scout-cream-site body.creamu-site-eporner #videos-list {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            visibility: visible !important;
          }
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb,
          html.scout-cream-site body.creamu-site-eporner .mb[data-id] {
            visibility: visible !important;
            opacity: 1 !important;
          }
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb img {
            visibility: visible !important;
            opacity: 1 !important;
          }
        }

        html.scout-cream-site body.creamu-site-xvideos #video-player-bg,
        html.scout-cream-site body.creamu-site-xnxx #video-player-bg {
          background-color: #0b0909 !important;
          padding: 24px 0 !important;
        }
        html.scout-cream-site body.creamu-site-xvideos .player-container,
        html.scout-cream-site body.creamu-site-xnxx .player-container {
          max-width: 1200px !important;
          margin: 0 auto !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5) !important;
        }
        html.scout-cream-site body.creamu-site-eporner .video-wrapper {
          background-color: #0b0909 !important;
          padding: 20px !important;
          border-radius: 16px !important;
          max-width: 1200px !important;
          margin: 0 auto !important;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5) !important;
        }

        @media (max-width: 820px) {
          #jlc-wb .jlc-wb-nav {
            display: flex !important;
            gap: 8px !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            padding: 0 16px 12px !important;
            white-space: nowrap !important;
            scrollbar-width: none !important;
          }
          #jlc-wb .jlc-wb-nav::-webkit-scrollbar { display: none !important; }
          #jlc-wb .jlc-wb-nav button {
            flex: 0 0 auto !important;
            padding: 8px 16px !important;
            font-size: 13.5px !important;
          }
          /* 手机工作台钮：与订阅同款小圆，贴视口右下（不跟页滚） */
          #jlc-wb-fab {
            position: fixed !important;
            right: 16px !important;
            bottom: 16px !important;
            left: auto !important;
            top: auto !important;
            opacity: 1 !important;
            width: 40px !important;
            height: 40px !important;
            min-width: 40px !important;
            border-radius: 50% !important;
            font-size: 17px !important;
            z-index: 2147483000 !important;
            box-shadow: 0 4px 14px rgba(0,0,0,.45) !important;
            visibility: visible !important;
            display: flex !important;
            pointer-events: auto !important;
          }
          #jlc-wb-fab:active, #jlc-wb-fab.is-dragging {
            opacity: 1 !important;
          }
          #jlc-wb-fab .jlc-wb-fab-badge {
            top: -2px !important;
            right: -2px !important;
            font-size: 10px !important;
            min-width: 16px !important;
            height: 16px !important;
          }
          #jlc-wb .jlc-wb-search,
          #jlc-wb select.jlc-wb-select,
          #jlc-wb select,
          #jlc-wb .jlc-wb-btn {
            min-height: 40px !important;
            font-size: 14px !important;
          }
          .scout-tag-addon {
            margin-left: 6px !important;
            gap: 4px !important;
          }
          .scout-tag-addon span {
            padding: 3px 5px !important;
            font-size: 11px !important;
            border-radius: 4px !important;
          }
          #jlc-wb { height: 70vh !important; }

          /*
           * 窄屏：完全不碰 .mozaique / .thumb-block / 标题 p。
           * 任何 height/overflow/padding 都会让 xnxx 标题从 float 卡里散出来。
           * 仅收缩词库叠层，少挡画面。
           */
          .scout-lex-flow-overlay {
            max-height: 36% !important;
            padding: 8px 4px 4px !important;
          }
          .scout-lex-flow-overlay .scout-lex-chip {
            font-size: 9px !important;
            padding: 1px 5px !important;
          }

          /*
           * eporner 手机：尽量单列，但不用 absolute 图（易高度塌成 0 挡没）
           * 只清 float + 宽度 100%，图片保持站点自然高度
           */
          html.scout-cream-site body.creamu-site-eporner #vidresults {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            padding: 6px 8px !important;
            box-sizing: border-box !important;
            font-size: 0 !important; /* 清 inline-block 空隙；子项再设字号 */
          }
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb,
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb[data-id] {
            display: inline-block !important;
            float: none !important;
            vertical-align: top !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 0 12px 0 !important;
            padding: 6px !important;
            height: auto !important;
            box-sizing: border-box !important;
            font-size: 14px !important;
            visibility: visible !important;
          }
          /* 未点过才强制不透明，避免盖掉 .scout-visited-item */
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb:not(.scout-visited-item),
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb[data-id]:not(.scout-visited-item) {
            opacity: 1 !important;
          }
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbimg,
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbcontent,
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb img {
            max-width: 100% !important;
            visibility: visible !important;
          }
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb:not(.scout-visited-item) img {
            opacity: 1 !important;
          }
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb img {
            width: 100% !important;
            height: auto !important;
            position: static !important;
            display: block !important;
            object-fit: cover !important;
          }
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbtit,
          html.scout-cream-site body.creamu-site-eporner #vidresults .mb .mbtit a {
            font-size: 14px !important;
            line-height: 1.35 !important;
            white-space: normal !important;
          }
        }
  `;
}

/**
 * 三站页面奶油主题（参考 EXH cream_site_theme）
 * 需 html/body 带 .scout-cream-site；三站用 creamu-site-* 区分配色
 */
function applyScoutSiteTheme() {
  const cfg = typeof getConfig === 'function' ? getConfig() : {};
  const on = cfg.cream_site_theme !== false;
  try {
    document.documentElement.classList.toggle('scout-cream-site', on);
    if (document.body) document.body.classList.toggle('scout-cream-site', on);
  } catch (_) { /* ignore */ }

  let el = document.getElementById('scout-site-theme-cream');
  if (!on) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('style');
    el.id = 'scout-site-theme-cream';
    (document.head || document.documentElement).appendChild(el);
  }
  el.textContent = getScoutSitePageThemeCss();
}

function getScoutSitePageThemeCss() {
  return `
/* ===== 三站统一暗色页主题：同结构，只换强调色（PC/手机同一套） ===== */
html.scout-cream-site,
html.scout-cream-site body {
  /* 默认暗底 */
  --scout-page-bg: #12141a;
  --scout-page-panel: #1a1e28;
  --scout-page-header: #161a24;
  --scout-page-border: rgba(255,255,255,0.10);
  --scout-card: #1e2430;
  --scout-card-bg: #1e2430;
  --scout-bg-clean: #12141a;
  --scout-text-color: #e8eaef;
  --scout-text-muted: #9aa3b5;
  --scout-link: #8eb4f0;
  --scout-link-hover: #b8d0ff;
  --scout-accent: #5b8def;
  --scout-accent-soft: rgba(91, 141, 239, 0.18);
  background: var(--scout-page-bg) !important;
  color: var(--scout-text-color) !important;
  color-scheme: dark;
}

/* xvideos：暗红强调 */
html.scout-cream-site body.creamu-site-xvideos {
  --scout-accent: #e54840;
  --scout-accent-soft: rgba(229, 72, 64, 0.20);
  --scout-link: #f09088;
  --scout-link-hover: #ffb8b0;
  --scout-page-header: #1a1214;
  --scout-card: #22181a;
  --scout-card-bg: #22181a;
  --scout-page-panel: #1e1618;
}
/* xnxx：冷蓝强调（仍暗底，不走白天粉蓝） */
html.scout-cream-site body.creamu-site-xnxx {
  --scout-accent: #4d8ef0;
  --scout-accent-soft: rgba(77, 142, 240, 0.20);
  --scout-link: #8eb4f0;
  --scout-link-hover: #c0d8ff;
  --scout-page-header: #121820;
  --scout-card: #181e2a;
  --scout-card-bg: #181e2a;
  --scout-page-panel: #161c28;
}
/* eporner：叶绿强调 */
html.scout-cream-site body.creamu-site-eporner {
  --scout-accent: #3cb86a;
  --scout-accent-soft: rgba(60, 184, 106, 0.20);
  --scout-link: #7fd4a0;
  --scout-link-hover: #b0ecc8;
  --scout-page-header: #121a14;
  --scout-card: #161e18;
  --scout-card-bg: #161e18;
  --scout-page-panel: #141c16;
}

/* 正文链接：轻量，列表卡内另有强制色 */
html.scout-cream-site body a { color: var(--scout-link); }
html.scout-cream-site body a:visited { color: var(--scout-link); opacity: 0.9; }
html.scout-cream-site body a:hover { color: var(--scout-link-hover); }

/* 订阅钮底色已在 getScoutThemeCss 中；此处仅保证 cream 下对比 */
html.scout-cream-site #scout-search-track-bar.scout-track-fab,
html.scout-cream-site #scout-search-track-bar.scout-track-banner {
  background: rgba(18, 20, 28, 0.94) !important;
  border-color: var(--scout-page-border, rgba(255,255,255,0.12)) !important;
  color: var(--scout-text-color, #e8eaef) !important;
}

/* 顶栏/表单/分页/侧栏：仅 PC。手机保持站点原生控件，避免列表周边被改乱 */
@media (min-width: 821px) {
  html.scout-cream-site #header,
  html.scout-cream-site .header,
  html.scout-cream-site #main-nav,
  html.scout-cream-site .main-nav,
  html.scout-cream-site #nav,
  html.scout-cream-site .top-menu,
  html.scout-cream-site #top-menu,
  html.scout-cream-site .head-container,
  html.scout-cream-site #head {
    background: var(--scout-page-header) !important;
    border-color: var(--scout-page-border) !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06) !important;
    color: var(--scout-text-color) !important;
  }
  html.scout-cream-site #header a,
  html.scout-cream-site .header a,
  html.scout-cream-site #main-nav a,
  html.scout-cream-site .main-nav a,
  html.scout-cream-site #nav a {
    color: var(--scout-text-color) !important;
  }
  html.scout-cream-site #header a:hover,
  html.scout-cream-site .main-nav a:hover {
    color: var(--scout-link-hover) !important;
  }

  html.scout-cream-site #content,
  html.scout-cream-site #main,
  html.scout-cream-site .main-content,
  html.scout-cream-site #page,
  html.scout-cream-site .page,
  html.scout-cream-site #wrapper,
  html.scout-cream-site .wrapper {
    background: transparent !important;
    color: var(--scout-text-color) !important;
  }

  /* 仅站点原生表单暗色；工作台 / 采集弹层保持奶油浅色（下方再强制覆盖） */
  html.scout-cream-site input[type="text"],
  html.scout-cream-site input[type="search"],
  html.scout-cream-site input[type="password"],
  html.scout-cream-site input[type="email"],
  html.scout-cream-site textarea,
  html.scout-cream-site select {
    background: var(--scout-card) !important;
    color: var(--scout-text-color) !important;
    border: 1px solid var(--scout-page-border) !important;
    border-radius: 10px !important;
    box-shadow: 0 1px 0 rgba(0,0,0,0.04) !important;
    color-scheme: dark;
  }
  html.scout-cream-site #jlc-wb input[type="text"],
  html.scout-cream-site #jlc-wb input[type="search"],
  html.scout-cream-site #jlc-wb input[type="password"],
  html.scout-cream-site #jlc-wb input[type="email"],
  html.scout-cream-site #jlc-wb input[type="number"],
  html.scout-cream-site #jlc-wb input[type="url"],
  html.scout-cream-site #jlc-wb input:not([type]),
  html.scout-cream-site #jlc-wb textarea,
  html.scout-cream-site #jlc-wb select,
  html.scout-cream-site #jlc-wb .jlc-wb-search,
  html.scout-cream-site #scout-collect-dialog input[type="text"],
  html.scout-cream-site #scout-collect-dialog select,
  html.scout-cream-site #scout-collect-dialog textarea {
    background: #fffaf3 !important;
    color: #4a3728 !important;
    border: 1px solid #e4d4bc !important;
    box-shadow: 0 1px 0 #efe0cc !important;
    color-scheme: light !important;
    caret-color: var(--scout-theme-dark, #b56e28) !important;
  }
  html.scout-cream-site #jlc-wb input::placeholder,
  html.scout-cream-site #jlc-wb textarea::placeholder,
  html.scout-cream-site #jlc-wb .jlc-wb-search::placeholder {
    color: #a89078 !important;
    opacity: 1 !important;
  }
  html.scout-cream-site #jlc-wb input:focus,
  html.scout-cream-site #jlc-wb textarea:focus,
  html.scout-cream-site #jlc-wb select:focus,
  html.scout-cream-site #scout-collect-dialog input:focus,
  html.scout-cream-site #scout-collect-dialog select:focus {
    border-color: var(--scout-theme-color) !important;
    background: #fff !important;
    outline: none !important;
  }
  /*
   * 页级暗色按钮：只用 :where() 排除工作台，避免 :not(#id) 把特异性抬到
   * 压过 #jlc-wb .jlc-wb-nav button（组合/词库那排裸 button 会被刷黑）。
   */
  html.scout-cream-site input[type="button"],
  html.scout-cream-site input[type="submit"],
  html.scout-cream-site button:where(:not(#jlc-wb *)):where(:not(#scout-collect-dialog *)):where(:not(#jlc-wb-fab)):where(:not(#scout-search-track-bar *)):where(:not(.scout-work-fav-bar *)):where(:not(.scout-pub-addon *)) {
    background: var(--scout-page-panel) !important;
    color: var(--scout-text-color) !important;
    border: 1px solid var(--scout-page-border) !important;
    border-radius: 10px !important;
    box-shadow: 0 2px 0 var(--scout-page-border) !important;
    cursor: pointer;
  }
  html.scout-cream-site input[type="button"]:hover,
  html.scout-cream-site input[type="submit"]:hover,
  html.scout-cream-site button:where(:not(#jlc-wb *)):where(:not(#scout-collect-dialog *)):where(:not(#jlc-wb-fab)):where(:not(#scout-search-track-bar *)):where(:not(.scout-work-fav-bar *)):where(:not(.scout-pub-addon *)):hover {
    border-color: var(--scout-theme-color) !important;
    color: var(--scout-theme-color) !important;
  }

  /* 工作台导航/主按钮：覆盖站内全局 button 样式 */
  html.scout-cream-site #jlc-wb .jlc-wb-nav button,
  html.scout-cream-site #jlc-wb .jlc-wb-settings-nav button {
    background: #efe4d2 !important;
    background-color: #efe4d2 !important;
    color: #8a6f55 !important;
    border: 0 !important;
    box-shadow: none !important;
  }
  html.scout-cream-site #jlc-wb .jlc-wb-nav button.active,
  html.scout-cream-site #jlc-wb .jlc-wb-settings-nav button.active {
    background: var(--scout-theme-color) !important;
    background-color: var(--scout-theme-color) !important;
    color: #fff !important;
    box-shadow: 0 2px 0 var(--scout-theme-dark) !important;
  }
  html.scout-cream-site #jlc-wb .jlc-wb-btn {
    background: #fffaf2 !important;
    color: #5a4030 !important;
    border: 1px solid #e0cdae !important;
  }
  html.scout-cream-site #jlc-wb .jlc-wb-btn.primary {
    background: linear-gradient(var(--scout-theme-color), var(--scout-theme-dark)) !important;
    background-color: var(--scout-theme-color) !important;
    color: #fff !important;
    border-color: transparent !important;
    box-shadow: 0 2px 0 var(--scout-theme-dark) !important;
  }
  html.scout-cream-site #jlc-wb .jlc-wb-btn.ghost {
    background: #fffaf2 !important;
    color: #5a4030 !important;
  }
  html.scout-cream-site #jlc-wb .jlc-wb-btn.danger {
    background: #f3d5d0 !important;
    color: #8a3a32 !important;
    border-color: #e8b8b0 !important;
  }
  html.scout-cream-site #jlc-wb .jlc-wb-chip {
    background: #fff !important;
    color: #5a4030 !important;
    border: 1px solid #e0cdae !important;
  }
  html.scout-cream-site #jlc-wb .jlc-wb-chip.is-on {
    background: var(--scout-theme-color) !important;
    color: #fff !important;
    border-color: transparent !important;
  }
  html.scout-cream-site #jlc-wb .jlc-wb-open-btn {
    background: linear-gradient(var(--scout-theme-color), var(--scout-theme-dark)) !important;
    color: #fff !important;
    border: 0 !important;
  }

  html.scout-cream-site #footer,
  html.scout-cream-site .footer,
  html.scout-cream-site .pagination,
  html.scout-cream-site .page-list,
  html.scout-cream-site .pages {
    background: var(--scout-page-panel) !important;
    color: var(--scout-text-color) !important;
    border-color: var(--scout-page-border) !important;
  }
  html.scout-cream-site .pagination a,
  html.scout-cream-site .page-list a {
    background: var(--scout-card) !important;
    border: 1px solid var(--scout-page-border) !important;
    border-radius: 8px !important;
    color: var(--scout-link) !important;
  }
  html.scout-cream-site .pagination a:hover,
  html.scout-cream-site .pagination .active,
  html.scout-cream-site .page-list .active {
    background: var(--scout-theme-color) !important;
    color: #fff !important;
    border-color: transparent !important;
  }

  /* 侧栏（勿碰 .mobile-hide；xvideos 列表卡是 .frame-block.thumb-block） */
  html.scout-cream-site .sidebar,
  html.scout-cream-site #sidebar,
  html.scout-cream-site .side-block,
  html.scout-cream-site .frame-block:not(.thumb-block) {
    background: var(--scout-page-panel) !important;
    color: var(--scout-text-color) !important;
    border-color: var(--scout-page-border) !important;
    border-radius: 12px !important;
  }
}

/* 视频标题色 */
html.scout-cream-site .page-title,
html.scout-cream-site h2.page-title,
html.scout-cream-site .video-title {
  color: var(--scout-text-color) !important;
  white-space: normal !important;
  height: auto !important;
  max-height: none !important;
  overflow: visible !important;
}

/*
 * 详情元信息 / 标签：PC 全展开；手机折叠由 .scout-tags-collapsed 控制。
 */
@media (min-width: 821px) {
  html.scout-cream-site body.creamu-site-xvideos .video-metadata,
  html.scout-cream-site body.creamu-site-xnxx .video-metadata,
  html.scout-cream-site body.creamu-site-xvideos .video-metadata-list,
  html.scout-cream-site body.creamu-site-xnxx .video-metadata-list,
  html.scout-cream-site body.creamu-site-xvideos .metadata-row,
  html.scout-cream-site body.creamu-site-xnxx .metadata-row {
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    white-space: normal !important;
    line-height: 1.45 !important;
  }
  html.scout-cream-site body.creamu-site-xvideos .video-tags,
  html.scout-cream-site body.creamu-site-xnxx .video-tags,
  html.scout-cream-site body.creamu-site-eporner #video-tags,
  html.scout-cream-site body.creamu-site-eporner .tag-container {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    gap: 6px !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    white-space: normal !important;
    background: var(--scout-page-panel) !important;
    border: 1px solid var(--scout-page-border) !important;
    border-radius: 12px !important;
    padding: 8px 10px !important;
    margin-top: 8px !important;
  }
}
@media (max-width: 820px) {
  html.scout-cream-site body.creamu-site-xvideos .video-metadata.scout-tags-collapsed,
  html.scout-cream-site body.creamu-site-xnxx .video-metadata.scout-tags-collapsed,
  html.scout-cream-site body.creamu-site-xnxx .metadata-row.video-tags.scout-tags-collapsed,
  html.scout-cream-site body.creamu-site-xnxx .video-tags.scout-tags-collapsed {
    max-height: 2.15em !important;
    overflow: hidden !important;
  }
  html.scout-cream-site body.creamu-site-xvideos .video-metadata.scout-tags-expanded,
  html.scout-cream-site body.creamu-site-xnxx .video-metadata.scout-tags-expanded,
  html.scout-cream-site body.creamu-site-xnxx .metadata-row.video-tags.scout-tags-expanded,
  html.scout-cream-site body.creamu-site-xnxx .video-tags.scout-tags-expanded {
    max-height: none !important;
    overflow: visible !important;
  }
  html.scout-cream-site .scout-desc-collapsed {
    -webkit-line-clamp: 2 !important;
    max-height: 3em !important;
    overflow: hidden !important;
  }
}
html.scout-cream-site body.creamu-site-xvideos .video-tags a,
html.scout-cream-site body.creamu-site-xnxx .video-tags a,
html.scout-cream-site body.creamu-site-xvideos .video-metadata .video-tags a,
html.scout-cream-site body.creamu-site-xnxx .video-metadata .video-tags a,
html.scout-cream-site body.creamu-site-eporner #video-tags a,
html.scout-cream-site body.creamu-site-eporner .tag-container a {
  display: inline-flex !important;
  flex: 0 1 auto !important;
  align-items: center !important;
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
  background: var(--scout-card) !important;
  border: 1px solid var(--scout-page-border) !important;
  border-radius: 999px !important;
  color: var(--scout-text-color) !important;
  padding: 3px 8px !important;
  margin: 0 !important;
  max-width: 100% !important;
}

/*
 * 列表/mozaique/标题：仅 PC。手机零改动，否则 xnxx 标题会从 float 卡散出。
 */
@media (min-width: 821px) {
  html.scout-cream-site body.creamu-site-xvideos #content,
  html.scout-cream-site body.creamu-site-xnxx #content,
  html.scout-cream-site body.creamu-site-eporner body,
  html.scout-cream-site body.creamu-site-eporner #content {
    background: var(--scout-page-bg) !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }
  html.scout-cream-site body.creamu-site-xvideos .mozaique,
  html.scout-cream-site body.creamu-site-xnxx .mozaique {
    background: transparent !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }
  html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block,
  html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block {
    visibility: visible !important;
    background: var(--scout-card, var(--scout-card-bg)) !important;
    border: 1px solid var(--scout-page-border) !important;
    box-shadow: 0 4px 14px rgba(0,0,0,0.08) !important;
  }
  html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb-inside,
  html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb-inside,
  html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block .thumb,
  html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block .thumb {
    background: transparent !important;
  }
  html.scout-cream-site body.creamu-site-xvideos .mozaique .thumb-block p,
  html.scout-cream-site body.creamu-site-xnxx .mozaique .thumb-block p {
    color: var(--scout-text-color) !important;
  }
  /* eporner 仅可见性，不改布局 */
  html.scout-cream-site body.creamu-site-eporner #vidresults {
    height: auto !important;
    overflow: visible !important;
    visibility: visible !important;
  }
}

/* 开主题时播放器区保持深色 */
html.scout-cream-site body.creamu-site-xvideos #video-player-bg,
html.scout-cream-site body.creamu-site-xnxx #video-player-bg {
  background: #121010 !important;
}

/* 全屏横滑 seek 浮层（挂到 fullscreenElement 内才看得见） */
#scout-seek-hud {
  position: fixed !important;
  left: 50% !important;
  top: 18% !important;
  transform: translateX(-50%) !important;
  z-index: 2147483646 !important;
  padding: 10px 16px !important;
  border-radius: 12px !important;
  background: rgba(0, 0, 0, 0.72) !important;
  color: #fff !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  letter-spacing: 0.02em !important;
  pointer-events: none !important;
  white-space: nowrap !important;
  display: none !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35) !important;
}
#scout-seek-hud.is-on {
  display: block !important;
}
`;
}
// 30-workbench.js

function getDefaultWorkbenchRect() {
  const width = Math.min(520, Math.max(360, window.innerWidth - 96));
  const height = Math.min(window.innerHeight * 0.76, 780, window.innerHeight - 80);
  const left = Math.max(24, Math.round(window.innerWidth - width - 48));
  const top = Math.max(32, Math.round((window.innerHeight - height) * 0.12));
  return {
    left,
    top,
    width: Math.round(width),
    height: Math.round(Math.max(280, height))
  };
}

function clampWorkbenchRect(left, top, width, height) {
  const margin = 12;
  const maxW = Math.max(360, window.innerWidth - margin * 2);
  const maxH = Math.max(280, window.innerHeight - margin * 2);
  let w = Math.round(Number(width));
  let h = Math.round(Number(height));
  if (!Number.isFinite(w) || w <= 0) w = 520;
  if (!Number.isFinite(h) || h <= 0) h = 560;
  w = Math.min(maxW, Math.max(360, w));
  h = Math.min(maxH, Math.max(280, h));
  let l = Number(left);
  let t = Number(top);
  if (!Number.isFinite(l)) l = getDefaultWorkbenchRect().left;
  if (!Number.isFinite(t)) t = getDefaultWorkbenchRect().top;
  l = Math.round(Math.min(Math.max(margin, l), Math.max(margin, window.innerWidth - w - margin)));
  t = Math.round(Math.min(Math.max(margin, t), Math.max(margin, window.innerHeight - h - margin)));
  return { left: l, top: t, width: w, height: h };
}

/** 将工作台放到视口内；无有效记忆位置时用默认几何 */
function applyScoutWorkbenchGeometry(wb, patch = {}) {
  if (!wb) return null;
  const def = getDefaultWorkbenchRect();
  const savedPos = GM_getValue('scout_wb_pos', null) || {};
  const savedSize = GM_getValue('scout_wb_size', null) || {};

  const parsePx = (v) => {
    if (v == null || v === '') return NaN;
    if (typeof v === 'number') return v;
    return parseFloat(String(v).replace(/px$/i, ''));
  };

  const nextWidth = patch.width != null
    ? patch.width
    : (parsePx(savedSize.width) || parsePx(wb.style.width) || def.width);
  const nextHeight = patch.height != null
    ? patch.height
    : (parsePx(savedSize.height) || parsePx(wb.style.height) || def.height);
  const nextLeft = patch.left != null
    ? patch.left
    : (parsePx(savedPos.left) || parsePx(wb.style.left));
  const nextTop = patch.top != null
    ? patch.top
    : (parsePx(savedPos.top) || parsePx(wb.style.top));

  const rect = clampWorkbenchRect(nextLeft, nextTop, nextWidth, nextHeight);
  wb.style.left = rect.left + 'px';
  wb.style.top = rect.top + 'px';
  wb.style.right = 'auto';
  wb.style.bottom = 'auto';
  wb.style.width = rect.width + 'px';
  wb.style.height = rect.height + 'px';
  wb.style.maxHeight = 'none';
  return rect;
}

function isScoutNarrowViewport() {
  try {
    return !!(window.matchMedia && window.matchMedia('(max-width: 820px)').matches);
  } catch (_) {
    return window.innerWidth <= 820;
  }
}

/**
 * 手机：工作台钮 + 订阅钮叠在右下角视口固定（不跟页滚走，不吃 left/top 记忆）
 * 上 ☆订阅 · 下 🧭工作台
 */
function dockMobileFabStack() {
  if (!isScoutNarrowViewport()) return;
  const fab = document.getElementById('jlc-wb-fab');
  if (fab) {
    fab.style.position = 'fixed';
    fab.style.left = 'auto';
    fab.style.top = 'auto';
    fab.style.right = '16px';
    fab.style.bottom = '16px';
    fab.style.zIndex = '2147483000';
    fab.style.visibility = 'visible';
    fab.style.opacity = '1';
    fab.style.display = 'flex';
    fab.style.pointerEvents = 'auto';
    fab.classList.add('scout-fab-docked');
  }
  const track = document.getElementById('scout-search-track-bar');
  if (track && track.classList.contains('scout-track-fab')) {
    track.style.left = 'auto';
    track.style.top = 'auto';
    track.style.right = '16px';
    track.style.bottom = '64px';
  }
}

function clampScoutFabPosition(fab) {
  if (!fab) return;
  // 手机强制贴右下，忽略 left/top 记忆（否则一滚/换页就像丢了）
  if (isScoutNarrowViewport()) {
    dockMobileFabStack();
    return;
  }
  const parsePx = (v) => {
    if (v == null || v === '') return NaN;
    if (typeof v === 'number') return v;
    return parseFloat(String(v).replace(/px$/i, ''));
  };
  let left = parsePx(fab.style.left);
  let top = parsePx(fab.style.top);
  // 仍用默认 right/bottom 时不必钳制
  if (!Number.isFinite(left) || !Number.isFinite(top)) return;
  const w = fab.offsetWidth || 34;
  const h = fab.offsetHeight || 34;
  left = Math.max(8, Math.min(window.innerWidth - w - 8, left));
  top = Math.max(8, Math.min(window.innerHeight - h - 8, top));
  fab.style.left = left + 'px';
  fab.style.top = top + 'px';
  fab.style.right = 'auto';
  fab.style.bottom = 'auto';
}

// 
function makeDraggable(el, isFab = false) {
  if (!el || el.dataset.scoutDragBound === '1') return;
  el.dataset.scoutDragBound = '1';

  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;

  el.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    // 徽章/按钮点击不抢拖动手势，仍可冒泡到 click 开面板
    if (e.target.closest('button') || e.target.closest('input')) return;
    // 手机 FAB 贴右下固定，禁止拖走（否则一滚就找不到）
    if (isFab && isScoutNarrowViewport()) return;

    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    const rect = el.getBoundingClientRect();
    originLeft = rect.left;
    originTop = rect.top;
    try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }

    const onMove = (ev) => {
      if (!dragging) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        moved = true;
        el.classList.add('is-dragging');
        el.dataset.suppressClick = '1';
      }
      if (!moved) return;

      const w = el.offsetWidth || 34;
      const h = el.offsetHeight || 34;
      const nextLeft = Math.max(8, Math.min(window.innerWidth - w - 8, originLeft + dx));
      const nextTop = Math.max(8, Math.min(window.innerHeight - h - 8, originTop + dy));
      el.style.left = nextLeft + 'px';
      el.style.top = nextTop + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('is-dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);

      if (moved) {
        if (isFab) {
          GM_setValue('scout_fab_pos', { left: el.style.left, top: el.style.top });
        } else {
          GM_setValue('scout_wb_pos', { left: el.style.left, top: el.style.top });
        }
        // click 在 pointerup 之后；下一帧再清 suppress，避免拖完误开
        setTimeout(() => {
          delete el.dataset.suppressClick;
        }, 0);
      }
      moved = false;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  });
}

function makeHeaderDraggable(wbEl, headerEl) {
  if (!headerEl || headerEl.dataset.scoutDragBound === '1') return;
  headerEl.dataset.scoutDragBound = '1';

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let lockedW = 0;
  let lockedH = 0;

  headerEl.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest('.jlc-wb-header-actions')) return;

    dragging = true;
    wbEl.classList.add('is-dragging');
    startX = e.clientX;
    startY = e.clientY;
    const rect = wbEl.getBoundingClientRect();
    originLeft = rect.left;
    originTop = rect.top;
    lockedW = Math.round(rect.width);
    lockedH = Math.round(rect.height);
    try { headerEl.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }

    const onMove = (ev) => {
      if (!dragging) return;
      applyScoutWorkbenchGeometry(wbEl, {
        left: originLeft + (ev.clientX - startX),
        top: originTop + (ev.clientY - startY),
        width: lockedW,
        height: lockedH
      });
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      wbEl.classList.remove('is-dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      GM_setValue('scout_wb_pos', { left: wbEl.style.left, top: wbEl.style.top });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  });
}

function makeResizable(wbEl) {
  if (!wbEl || wbEl.dataset.scoutResizeBound === '1') return;
  wbEl.dataset.scoutResizeBound = '1';

  const resizeCorner = wbEl.querySelector('.jlc-wb-resize-corner');
  const resizeW = wbEl.querySelector('.jlc-wb-resize-w');
  const resizeH = wbEl.querySelector('.jlc-wb-resize-h');

  const initResize = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = wbEl.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;
    const startLeft = rect.left;
    const startTop = rect.top;
    const startX = e.clientX;
    const startY = e.clientY;

    wbEl.classList.add('is-resizing');

    const doResize = (ev) => {
      let nextLeft = startLeft;
      let nextTop = startTop;
      let nextW = startWidth;
      let nextH = startHeight;
      if (direction === 'corner' || direction === 'w') {
        const dx = ev.clientX - startX;
        if (direction === 'w') {
          nextW = startWidth - dx;
          nextLeft = startLeft + dx;
        } else {
          nextW = startWidth + dx;
        }
      }
      if (direction === 'corner' || direction === 'h') {
        nextH = startHeight + (ev.clientY - startY);
      }
      applyScoutWorkbenchGeometry(wbEl, {
        left: nextLeft,
        top: nextTop,
        width: nextW,
        height: nextH
      });
    };

    const stopResize = () => {
      wbEl.classList.remove('is-resizing');
      window.removeEventListener('pointermove', doResize);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
      GM_setValue('scout_wb_size', { width: wbEl.style.width, height: wbEl.style.height });
      GM_setValue('scout_wb_pos', { left: wbEl.style.left, top: wbEl.style.top });
    };

    window.addEventListener('pointermove', doResize);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
  };

  if (resizeCorner) resizeCorner.addEventListener('pointerdown', (e) => initResize(e, 'corner'));
  if (resizeW) resizeW.addEventListener('pointerdown', (e) => initResize(e, 'w'));
  if (resizeH) resizeH.addEventListener('pointerdown', (e) => initResize(e, 'h'));
}

// 
function applyListBlocks() {
  const blocks = getBlockList();
  const pubs = getPublishers();
  const els = getVideoElements();
  let blockedCount = 0;

  els.forEach(el => {
    const meta = parseVideoElement(el);
    if (!meta) return;

    let hitBlock = null;

    // 1. 匹配熟人关注与拉黑
    let pubLoved = false;
    if (meta.uploader) {
      const uploaderLower = meta.uploader.toLowerCase().trim();
      const matchedPub = pubs.find(p => p.name.toLowerCase().trim() === uploaderLower);
      if (matchedPub) {
        if (matchedPub.status === 'blocked') {
          el.style.display = 'none';
          blockedCount++;
          return;
        } else if (matchedPub.status === 'loved') {
          pubLoved = true;
        }
      }
    }

    // 2. 匹配屏蔽词（整词/子串 + 标题/上传者；hide 优先）
    for (const b of blocks) {
      if (!blockMatchesVideo(meta, b)) continue;
      if (!hitBlock || b.mode === 'hide') {
        hitBlock = b;
        if (b.mode === 'hide') break;
      }
    }

    // 3. 执行过滤视觉呈现
    if (hitBlock) {
      blockedCount++;
      if (hitBlock.mode === 'hide') {
        el.style.display = 'none';
      } else {
        el.style.display = '';
        el.style.opacity = '0.08';
        el.style.pointerEvents = 'none';
        const matchLabel = normalizeBlockMatch(hitBlock.match) === 'sub' ? '子串' : '整词';
        const scopeLabel = normalizeBlockScope(hitBlock.scope) === 'both'
          ? '标题+上传者'
          : normalizeBlockScope(hitBlock.scope) === 'uploader' ? '上传者' : '标题';
        el.title = `已被弱屏蔽词 "${hitBlock.text}" 过滤 [${matchLabel}/${scopeLabel}] (原因: ${hitBlock.reason || '无'})`;
      }
    } else {
      el.style.display = '';
      el.style.opacity = '';
      el.style.pointerEvents = '';
      el.removeAttribute('title');

      if (pubLoved) {
        el.classList.add('scout-pub-loved-card');
        if (!el.querySelector('.scout-pub-badge')) {
          const badge = document.createElement('div');
          badge.className = 'scout-pub-badge';
          badge.textContent = `★ ${meta.uploader}`;
          el.style.position = 'relative';
          el.appendChild(badge);
        }
      } else {
        el.classList.remove('scout-pub-loved-card');
        el.querySelector('.scout-pub-badge')?.remove();
      }
    }
  });

  const badge = document.querySelector('#jlc-wb-fab .jlc-wb-fab-badge');
  if (badge) {
    if (blockedCount > 0) {
      badge.textContent = blockedCount;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // 屏蔽之后再刷已点样式、点击绑定、词库命中流
  applyClickedEnhancements();
  enhanceListLexiconHitFlows();
}

/**
 * 列表影片链接：是否新标签打开（设置项 open_videos_new_tab）
 */
function applyVideoOpenMode() {
  const newTab = typeof isOpenVideosNewTab === 'function' ? isOpenVideosNewTab() : true;
  const els = getVideoElements();
  els.forEach(el => {
    if (!el || el.nodeType !== 1) return;
    el.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (!href || href === '#' || href.startsWith('javascript:')) return;
      // 只处理看起来像视频的链接
      if (
        !/\/video|\/video-|\/videos\//i.test(href) &&
        !a.closest('.thumb-block, .post, .video-block, [id^="video_"], .mb, .mb[data-id], #vidresults .mb')
      ) {
        return;
      }
      if (newTab) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
        if (a.dataset.scoutNewTabBound === '1') return;
        a.dataset.scoutNewTabBound = '1';
        a.addEventListener('click', (e) => {
          if (!isOpenVideosNewTab()) return;
          // 左键：强制新标签（部分站点忽略 target）
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          e.stopPropagation();
          openScoutUrl(a.href, { newTab: true });
        }, true);
      } else {
        a.removeAttribute('target');
      }
    });
  });
}

/**
 * 已点片库：列表灰显 + 点击即记（与 tracks 断点无关）
 */
function applyClickedEnhancements() {
  const site = detectSite();
  if (!site) return;
  const kind = detectPageKind();
  if (kind !== 'search' && kind !== 'other') return;

  const els = getVideoElements();
  els.forEach(el => {
    if (!el || el.nodeType !== 1) return;
    const meta = parseVideoElement(el);
    if (!meta || !meta.url) return;
    const videoId = videoIdFromUrl(meta.url);
    if (!videoId) return;

    if (isVideoClicked(site, videoId)) {
      el.classList.add('scout-visited-item');
    }

    if (el.dataset.scoutClickBound === '1') return;
    el.dataset.scoutClickBound = '1';

    const mark = () => {
      markVideoClicked({
        site,
        videoId,
        title: meta.title,
        url: meta.url,
        thumb: meta.thumb,
        uploader: meta.uploader
      });
      el.classList.add('scout-visited-item');
    };

    // 卡片内链接（含中键）；整卡 pointerdown 兜底
    el.querySelectorAll('a[href]').forEach(a => {
      a.addEventListener('pointerdown', mark, { passive: true });
      a.addEventListener('click', mark, { passive: true });
      a.addEventListener('auxclick', mark, { passive: true });
    });
    el.addEventListener('pointerdown', (e) => {
      // 避免与屏蔽控件等冲突：仅卡片主体
      if (e.target.closest('.scout-tag-addon, .scout-pub-addon, button, input')) return;
      mark();
    }, { passive: true });
  });

  applyVideoOpenMode();
}

/** 进入视频详情页时记为已点 */
function markCurrentVideoPageClicked() {
  if (detectPageKind() !== 'video') return;
  const site = detectSite();
  if (!site) return;
  const meta = scrapeVideoMeta();
  const url = (meta && meta.url) || location.href;
  const videoId = videoIdFromUrl(url);
  if (!videoId) return;
  markVideoClicked({
    site,
    videoId,
    title: meta && meta.title,
    url,
    thumb: meta && meta.thumb,
    uploader: meta && meta.uploader
  });
}

// 
function showScoutCollectDialog({ text, sources, onSaved }) {
  const existing = document.getElementById('scout-collect-dialog');
  if (existing) existing.remove();

  const types = getLexiconTypes();
  const known = getLexiconTerms().find(t => t.text.toLowerCase().trim() === compactText(text).toLowerCase());

  const dialog = document.createElement('div');
  dialog.id = 'scout-collect-dialog';
  dialog.innerHTML = `
    <div class="scout-collect-card">
      <h4>采集词条</h4>
      <p class="scout-collect-term">${escapeHtml(text)}</p>
      <label>中文翻译</label>
      <input type="text" id="scout-collect-zh" placeholder="可选，填写中文含义" value="${escapeHtml((known && known.zh) || '')}">
      <label>分类</label>
      <select id="scout-collect-type">
        ${types.map(ty => {
          const sel = known && known.type === ty ? 'selected' : (ty === '未分类' && !known ? 'selected' : '');
          return `<option value="${escapeHtml(ty)}" ${sel}>${escapeHtml(ty)}</option>`;
        }).join('')}
      </select>
      <label class="scout-collect-loved">
        <input type="checkbox" id="scout-collect-loved" ${(known && known.loved) ? 'checked' : ''}>
        标记为心动标签
      </label>
      <div class="scout-collect-actions">
        <button type="button" class="jlc-wb-btn ghost" id="scout-collect-cancel">取消</button>
        <button type="button" class="jlc-wb-btn primary" id="scout-collect-save">入库</button>
      </div>
    </div>
  `;
  document.body.appendChild(dialog);

  const close = () => dialog.remove();
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  dialog.querySelector('#scout-collect-cancel').addEventListener('click', close);
  dialog.querySelector('#scout-collect-save').addEventListener('click', () => {
    const zh = dialog.querySelector('#scout-collect-zh').value.trim();
    const type = dialog.querySelector('#scout-collect-type').value || '未分类';
    const loved = dialog.querySelector('#scout-collect-loved').checked;
    const term = addLexiconTerm({
      text,
      zh,
      type,
      loved,
      status: zh || type !== '未分类' ? 'confirmed' : 'unreviewed',
      sources: sources || []
    });
    close();
    if (term) {
      showToast(`已采集: ${term.text}${term.zh ? ' · ' + term.zh : ''} [${term.type}]`);
      if (typeof onSaved === 'function') onSaved(term);
    }
  });

  const zhInp = dialog.querySelector('#scout-collect-zh');
  setTimeout(() => {
    zhInp.focus();
    zhInp.select();
  }, 30);
}

// 
function buildLexiconHitFlowHtml(matchResult, options) {
  const opts = options || {};
  const max = opts.max != null ? opts.max : 12;
  const r = matchResult || { hits: [], lovedCount: 0, total: 0 };
  if (!r.total) {
    return opts.emptyHtml != null
      ? opts.emptyHtml
      : '<span class="scout-lex-flow-empty">未命中词库</span>';
  }
  const slice = r.hits.slice(0, max);
  const chips = slice
    .map((h) => {
      const cls = h.loved ? 'scout-lex-chip is-loved' : 'scout-lex-chip';
      const tip = `${h.text}${h.zh ? ' · ' + h.zh : ''} [${h.type}] · ${h.via}`;
      const heart = h.loved ? '❤️' : '';
      return `<span class="${cls}" title="${escapeHtml(tip)}">${heart}${escapeHtml(h.label)}</span>`;
    })
    .join('');
  const more =
    r.total > max
      ? `<span class="scout-lex-chip is-more">+${r.total - max}</span>`
      : '';
  // 默认不显示「命中 N」文案，只保留芯片；需要时 opts.showCount
  const head = opts.showCount
    ? `<span class="scout-lex-flow-count">${r.total}${r.lovedCount ? '·❤️' + r.lovedCount : ''}</span>`
    : '';
  return `${head}<span class="scout-lex-flow-chips">${chips}${more}</span>`;
}

/**
 * 详情页：词库样式融进原生标签；
 * 手机：标签默认一行、描述默认两行，点按钮展开。
 */
function enhancePageLexiconHitFlow() {
  if (detectPageKind() !== 'video') return;
  const legacy = document.getElementById('scout-lex-hit-bar');
  if (legacy) legacy.remove();

  let isNarrow = false;
  try {
    isNarrow = !!(window.matchMedia && window.matchMedia('(max-width: 820px)').matches);
  } catch (_) {
    isNarrow = window.innerWidth <= 820;
  }

  // 标签容器：xvideos 用 video-metadata.video-tags-list；xnxx 用 metadata-row.video-tags
  const tagBoxes = document.querySelectorAll(
    [
      '.video-metadata.video-tags-list',
      '.video-metadata.ordered-label-list',
      '.metadata-row.video-tags',
      '.video-tags-list',
      '.ordered-label-list',
      '.video-tags'
    ].join(',')
  );

  // 描述容器（有则折叠；xnxx/xvideos 常见选择器）
  const descBoxes = document.querySelectorAll(
    [
      '.video-description',
      '#video-description',
      '[itemprop="description"]',
      '.metadata-row.video-description',
      'p.video-description',
      '.video-desc',
      '#video-desc',
      // xnxx 偶发长文案块
      '.clear-infobar .description',
      '#video-content-metadata .description'
    ].join(',')
  );

  if (!isNarrow) {
    tagBoxes.forEach((el) => {
      el.classList.remove('cropped', 'scout-tags-collapsed');
      el.classList.add('scout-tags-expanded');
      el.style.maxHeight = 'none';
      el.style.overflow = 'visible';
      el.style.height = 'auto';
    });
    descBoxes.forEach((el) => {
      el.classList.remove('scout-desc-collapsed');
      el.classList.add('scout-desc-expanded');
      el.style.maxHeight = '';
      el.style.overflow = '';
      el.style.webkitLineClamp = '';
    });
    document.getElementById('scout-tags-toggle')?.remove();
    document.getElementById('scout-desc-toggle')?.remove();
    return;
  }

  setupMobileDetailTagsCollapse(tagBoxes);
  setupMobileDetailDescCollapse(descBoxes);
}

function setupMobileDetailTagsCollapse(boxes) {
  const list = Array.from(boxes || []).filter(Boolean);
  // 不要把投票行 metadata-row.video-metadata 当成标签
  const tagsOnly = list.filter((el) => {
    const c = el.className || '';
    if (/video-tags|tags-list|ordered-label|is-keyword/i.test(c)) return true;
    if (/video-metadata/i.test(c) && !/video-tags/i.test(c) && el.querySelector('a.is-keyword')) {
      return true;
    }
    return !!el.querySelector('a.is-keyword, a[href^="/tags/"], a[href^="/tag/"]');
  });
  if (!tagsOnly.length) return;

  const box = tagsOnly[0];
  tagsOnly.forEach((el) => {
    el.classList.add('scout-tags-collapsed');
    el.classList.remove('scout-tags-expanded');
    el.style.maxHeight = '';
    el.style.overflow = '';
    el.style.height = '';
  });

  let toggle = document.getElementById('scout-tags-toggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'scout-tags-toggle';
    toggle.className = 'scout-tags-toggle';
    toggle.setAttribute('data-scout-ui', '1');
    if (box.parentNode) box.parentNode.insertBefore(toggle, box.nextSibling);
    else box.appendChild(toggle);
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const open = box.classList.contains('scout-tags-expanded');
      tagsOnly.forEach((el) => {
        el.classList.toggle('scout-tags-collapsed', open);
        el.classList.toggle('scout-tags-expanded', !open);
      });
      toggle.textContent = open ? '展开全部标签 ▾' : '收起标签 ▴';
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  }
  const open = box.classList.contains('scout-tags-expanded');
  toggle.textContent = open ? '收起标签 ▴' : '展开全部标签 ▾';
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function setupMobileDetailDescCollapse(boxes) {
  const list = Array.from(boxes || []).filter((el) => {
    if (!el) return false;
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    // 太短不折叠
    return text.length >= 60;
  });
  if (!list.length) {
    document.getElementById('scout-desc-toggle')?.remove();
    return;
  }

  const box = list[0];
  list.forEach((el) => {
    el.classList.add('scout-desc-collapsed');
    el.classList.remove('scout-desc-expanded');
  });

  let toggle = document.getElementById('scout-desc-toggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'scout-desc-toggle';
    toggle.className = 'scout-tags-toggle scout-desc-toggle';
    toggle.setAttribute('data-scout-ui', '1');
    if (box.parentNode) box.parentNode.insertBefore(toggle, box.nextSibling);
    else box.appendChild(toggle);
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const open = box.classList.contains('scout-desc-expanded');
      list.forEach((el) => {
        el.classList.toggle('scout-desc-collapsed', open);
        el.classList.toggle('scout-desc-expanded', !open);
      });
      toggle.textContent = open ? '展开描述 ▾' : '收起描述 ▴';
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  }
  const open = box.classList.contains('scout-desc-expanded');
  toggle.textContent = open ? '收起描述 ▴' : '展开描述 ▾';
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}

/**
 * 列表卡片：词库命中标签流
 * 列表词库命中流：叠在缩略图上（站点常裁切 .thumb-under）
 */
function enhanceListLexiconHitFlows() {
  try {
    if (detectPageKind() === 'video') return;
    const terms = getLexiconTerms().filter((t) => t && t.status !== 'retired');
    if (!terms.length) return;

    const els = getVideoElements();
    if (!els || !els.length) return;

    // 手机也要标签流；只允许把 relative 写在图容器上，绝不写到 .thumb-block 本身
    let isNarrow = false;
    try {
      isNarrow = !!(window.matchMedia && window.matchMedia('(max-width: 820px)').matches);
    } catch (_) { /* ignore */ }

    Array.from(els).forEach((el) => {
      if (!el || el.nodeType !== 1) return;
      if (el.closest && el.closest('#jlc-wb, #scout-lex-hit-bar')) return;

      const meta = parseVideoElement(el);
      // 标题可空：matchLexiconHits 仍会从 url slug 补伪标签；二者皆空才跳过
      if (!meta || (!compactText(meta.title) && !compactText(meta.url))) return;

      const slugTags = [];
      try {
        const path = new URL(meta.url, location.origin).pathname || '';
        const slug = path.split('/').filter(Boolean).pop() || '';
        // 整段 slug + 下划线/连字符分词
        const spaced = slug.replace(/[-_~.]+/g, ' ').replace(/\s+/g, ' ').trim();
        if (spaced) slugTags.push(spaced);
        spaced.split(/\s+/).forEach((w) => {
          const t = compactText(w);
          if (t.length >= 2) slugTags.push(t);
        });
      } catch (_) { /* ignore */ }

      const match = matchLexiconHits(
        {
          title: meta.title || '',
          tags: [].concat(meta.tags || [], slugTags),
          uploader: meta.uploader || '',
          url: meta.url || ''
        },
        { terms }
      );

      // 旧位置（thumb-under）里的节点清掉，避免重复
      el.querySelectorAll('.scout-lex-flow-card').forEach((n) => {
        if (!n.classList.contains('scout-lex-flow-overlay')) n.remove();
      });

      let flow = el.querySelector('.scout-lex-flow-overlay');
      if (!match.total) {
        if (flow) flow.remove();
        return;
      }

      // 叠在缩略图容器上（禁止落到卡片根节点，避免手机 float 标题散落）
      let thumbHost =
        el.querySelector('.thumb-inside') ||
        el.querySelector('.mbimg') ||
        el.querySelector('.mbcontent') ||
        el.querySelector('.thumb') ||
        el.querySelector('a[href*="/video"] img')?.parentElement ||
        el.querySelector('a[href*="/video"]')?.parentElement;
      if (!thumbHost || thumbHost === el) {
        // 再退一步：有图的 a，仍不要用整张 .thumb-block
        const imgA = el.querySelector('a[href*="/video"] img, a[href*="/video-"] img');
        thumbHost = (imgA && imgA.parentElement) || null;
      }
      if (!thumbHost || thumbHost === el) {
        if (flow) flow.remove();
        return;
      }
      try {
        const cs = window.getComputedStyle(thumbHost);
        if (cs.position === 'static') thumbHost.style.position = 'relative';
        // 图容器需可裁剪叠层，但不改 height/width（交给站点）
        if (cs.overflow === 'visible') thumbHost.style.overflow = 'hidden';
      } catch (_) {
        thumbHost.style.position = 'relative';
      }

      if (!flow) {
        flow = document.createElement('div');
        flow.className = 'scout-lex-flow-card scout-lex-flow scout-lex-flow-overlay';
        thumbHost.appendChild(flow);
      } else if (flow.parentNode !== thumbHost) {
        thumbHost.appendChild(flow);
      }

      // 强制可见：半透明底 + 白字芯片，盖在图上
      const maxH = isNarrow ? '36%' : '46%';
      const pad = isNarrow ? '3px' : '4px';
      const chipFs = isNarrow ? '9px' : '10px';
      flow.style.cssText = [
        'display:flex',
        'flex-wrap:wrap',
        'gap:3px',
        'align-items:flex-start',
        'position:absolute',
        'left:4px',
        'right:4px',
        'bottom:4px',
        'top:auto',
        'z-index:30',
        'margin:0',
        `padding:${pad}`,
        `max-height:${maxH}`,
        'overflow:hidden',
        'pointer-events:none',
        'background:linear-gradient(transparent,rgba(0,0,0,.78))',
        'border-radius:0 0 8px 8px',
        'box-sizing:border-box'
      ].join('!important;') + '!important;';

      flow.innerHTML = buildLexiconHitFlowHtml(match, {
        max: isNarrow ? 5 : 8,
        showCount: false
      });

      // 列表叠加：毛玻璃小胶囊（可两行，避免只看见 1 个）
      flow.style.maxHeight = isNarrow ? '38%' : '52%';
      flow.style.overflow = 'hidden';
      flow.querySelectorAll('.scout-lex-chip').forEach((chip) => {
        const base =
          'display:inline-flex!important;align-items:center!important;' +
          `padding:2px 7px!important;border-radius:999px!important;` +
          `font-size:${chipFs}!important;font-weight:650!important;line-height:1.2!important;` +
          'letter-spacing:.2px!important;backdrop-filter:blur(6px)!important;' +
          '-webkit-backdrop-filter:blur(6px)!important;' +
          'box-shadow:0 1px 3px rgba(0,0,0,.28)!important;';
        if (chip.classList.contains('is-more')) {
          chip.style.cssText =
            base +
            'color:rgba(255,255,255,.9)!important;background:rgba(255,255,255,.18)!important;' +
            'border:1px solid rgba(255,255,255,.28)!important;';
          return;
        }
        if (chip.classList.contains('is-loved')) {
          chip.style.cssText =
            base +
            'color:#fff!important;background:rgba(229,72,64,.92)!important;' +
            'border:1px solid rgba(255,180,160,.55)!important;';
        } else {
          chip.style.cssText =
            base +
            'color:#fff!important;background:rgba(20,22,28,.72)!important;' +
            'border:1px solid rgba(255,255,255,.22)!important;';
        }
      });
    });
  } catch (err) {
    console.warn('[Creamu Scout] list lexicon flow failed', err);
  }
}

// 
function applyTagVisualState(a, txt, terms, blocks) {
  const txtKey =
    typeof lexiconIdentityKey === 'function' ? lexiconIdentityKey(txt) : String(txt || '').toLowerCase().trim();
  let matchedTerm = terms.find(
    (t) =>
      t &&
      t.status !== 'retired' &&
      (typeof lexiconIdentityKey === 'function'
        ? lexiconIdentityKey(t.text)
        : String(t.text || '').toLowerCase().trim()) === txtKey
  );
  // 站内标签：用词库匹配补中文样式
  if (!matchedTerm && typeof matchLexiconHits === 'function') {
    try {
      const hit = matchLexiconHits({ title: '', tags: [txt], uploader: '' }, { terms });
      const h0 = hit && hit.hits && hit.hits[0];
      if (h0) {
        matchedTerm = terms.find(
          (t) => t && String(t.text || '').toLowerCase() === String(h0.text || '').toLowerCase()
        );
      }
    } catch (_) { /* ignore */ }
  }
  const matchedBlock = blocks.find((b) => textMatchesBlock(txt, b));
  const oldHeart = a.querySelector('.scout-tag-heart');
  let zhEl = a.querySelector('.scout-tag-zh');

  a.classList.remove(
    'scout-tag-explored',
    'scout-tag-loved',
    'scout-tag-blocked',
    'scout-tag-in',
    'scout-tag-out'
  );
  a.classList.add('scout-site-tag');

  if (matchedBlock) {
    if (oldHeart) oldHeart.remove();
    if (zhEl) zhEl.remove();
    a.classList.add('scout-tag-blocked');
    a.title = `已被屏蔽 (理由: ${matchedBlock.reason || '无'}, 模式: ${matchedBlock.mode === 'hide' ? '强隐藏' : '弱淡化'})`;
    return;
  }

  if (matchedTerm && matchedTerm.status !== 'retired') {
    a.classList.add('scout-tag-in', 'scout-tag-explored');
    if (matchedTerm.loved) a.classList.add('scout-tag-loved');
    const zh = compactText(matchedTerm.zh);
    a.title = zh
      ? `${matchedTerm.text} · ${zh} [${matchedTerm.type || ''}]`
      : `${matchedTerm.text} [${matchedTerm.type || ''}]`;
    if (zh) {
      if (!zhEl) {
        zhEl = document.createElement('span');
        zhEl.className = 'scout-tag-zh';
        a.appendChild(zhEl);
      }
      if (zhEl.textContent !== zh) zhEl.textContent = zh;
    } else if (zhEl) {
      zhEl.remove();
    }
    if (matchedTerm.loved) {
      if (!oldHeart) {
        const heartSpan = document.createElement('span');
        heartSpan.className = 'scout-tag-heart';
        heartSpan.textContent = '♥';
        heartSpan.setAttribute('aria-hidden', '1');
        a.insertBefore(heartSpan, a.firstChild);
      }
    } else if (oldHeart) {
      oldHeart.remove();
    }
    return;
  }

  if (oldHeart) oldHeart.remove();
  if (zhEl) zhEl.remove();
  a.classList.add('scout-tag-out');
  a.title = txt + '（未入库 · 点 ＋ 采集）';
}

function enhancePageTags() {
  const currentSite = detectSite();
  if (!currentSite) return;
  if (detectPageKind() !== 'video') return;

  window.__scoutUiMutating = true;
  try {
    // 词库命中流（中文标签流 + 心动）
    enhancePageLexiconHitFlow();

    let selector = '';
    if (currentSite === 'xvideos' || currentSite === 'xnxx') {
      selector =
        '.video-metadata a.is-keyword, .video-tags-list a.is-keyword, .ordered-label-list a.is-keyword, ' +
        '.video-metadata .video-tags a, .metadata-row .video-tags a, .video-tags a';
    } else if (currentSite === 'eporner') {
      selector =
        'a[href^="/tag/"], a[href^="/cat/"], .vit-pornstar a, .vit-category a, ' +
        '#video-tags a, .tag-container a, a.is-keyword, a.tag';
    }
    if (!selector) return;

    const meta = scrapeVideoMeta();
    const terms = getLexiconTerms();
    const blocks = getBlockList();

    document.querySelectorAll(selector).forEach(a => {
      if (a.querySelector('.scout-tag-addon')) {
        const txt = a.getAttribute('data-scout-tag') || '';
        if (txt) applyTagVisualState(a, txt, terms, blocks);
        return;
      }

      let txt =
        typeof tagTextFromAnchor === 'function'
          ? tagTextFromAnchor(a)
          : a.textContent
              .replace(/[♥❤️]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
      // 去掉我们嵌的中文 span / 操作钮文本
      const zhNode = a.querySelector('.scout-tag-zh');
      if (zhNode && zhNode.textContent && txt.endsWith(zhNode.textContent)) {
        txt = txt.slice(0, -zhNode.textContent.length).trim();
      }
      txt = txt.replace(/[＋✕+]/g, ' ').replace(/\s+/g, ' ').trim();
      if (typeof sanitizeLexiconText === 'function') txt = sanitizeLexiconText(txt);
      if (!txt || txt.startsWith('+') || /[＋✕]/.test(txt)) return;

      a.setAttribute('data-scout-tag', txt);

      applyTagVisualState(a, txt, terms, blocks);

      const wrapper = document.createElement('span');
      wrapper.className = 'scout-tag-addon';

      const addBtn = document.createElement('span');
      addBtn.textContent = '＋';
      addBtn.title = '采集入库（选分类/翻译）';
      addBtn.style.cssText = 'cursor:pointer;color:#8fd4a0;';
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showScoutCollectDialog({
          text: txt,
          sources: [{ site: currentSite, url: location.href, title: meta.title, at: new Date().toISOString() }],
          onSaved() {
            const activeBtn = document.querySelector('.jlc-wb-nav button.active');
            if (activeBtn && activeBtn.getAttribute('data-tab') === 'lexicon') renderLexiconPage();
            else if (activeBtn && activeBtn.getAttribute('data-tab') === 'combo') renderComboPage();
            // 清签名以允许词库条更新
            const bar = document.getElementById('scout-lex-hit-bar');
            if (bar) delete bar.dataset.hitSig;
            enhancePageTags();
          }
        });
      });

      const blockBtn = document.createElement('span');
      blockBtn.textContent = '✕';
      blockBtn.title = '弱屏蔽(点击) | 强隐藏(Shift+点击)';
      blockBtn.style.cssText = 'cursor:pointer;color:#f09088;';
      blockBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isShift = e.shiftKey;
        const targetMode = isShift ? 'hide' : 'dim';
        addBlockWord({
          text: txt,
          mode: targetMode,
          match: 'word',
          scope: 'title',
          reason: `自视频标签快捷添加 (${isShift ? '强隐藏' : '弱淡化'})`
        });
        showToast(`已加入屏蔽库: ${txt} (${isShift ? '彻底蒸发' : '弱淡化'})`, true);
        applyListBlocks();
        const activeBtn = document.querySelector('.jlc-wb-nav button.active');
        if (activeBtn && activeBtn.getAttribute('data-tab') === 'blocks') renderBlocksPage();
        else if (activeBtn && activeBtn.getAttribute('data-tab') === 'combo') renderComboPage();
        const bar = document.getElementById('scout-lex-hit-bar');
        if (bar) delete bar.dataset.hitSig;
        enhancePageTags();
      });

      wrapper.appendChild(addBtn);
      wrapper.appendChild(blockBtn);
      a.appendChild(wrapper);
    });
  } finally {
    // 延后清除，吞掉本轮 DOM 变更触发的 observer
    setTimeout(() => {
      window.__scoutUiMutating = false;
    }, 50);
  }
}

/**
 * 搜索页订阅追更入口
 * - PC：顶部细条
 * - 手机：FAB 旁小圆钮（不再铺底大横条）
 */
function enhanceSearchTrackSubscribe() {
  const site = typeof detectSite === 'function' ? detectSite() : null;
  if (!site || typeof detectPageKind !== 'function' || detectPageKind() !== 'search') {
    document.getElementById('scout-search-track-bar')?.remove();
    return;
  }

  const ctx = typeof parseSearchContext === 'function' ? parseSearchContext() : { query: '', url: location.href };
  const query = compactText(ctx && ctx.query);
  if (!query) {
    document.getElementById('scout-search-track-bar')?.remove();
    return;
  }

  let isNarrow = false;
  try {
    isNarrow = !!(window.matchMedia && window.matchMedia('(max-width: 820px)').matches);
  } catch (_) { /* ignore */ }

  const existing =
    typeof findTrackBySiteQuery === 'function' ? findTrackBySiteQuery(site, query) : null;
  const on = !!existing;
  const qShort = query.length > 28 ? query.slice(0, 26) + '…' : query;

  let bar = document.getElementById('scout-search-track-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'scout-search-track-bar';
    bar.setAttribute('data-scout-ui', '1');
    (document.body || document.documentElement).appendChild(bar);
  }
  bar.className = isNarrow ? 'scout-track-fab' : 'scout-track-banner';
  bar.classList.toggle('is-on', on);

  const doToggle = () => {
    if (on) {
      if (!confirm(`取消订阅「${query}」？断点会一并删除。`)) return;
      deleteTrack(existing.id);
      showToast('已取消搜索追更');
    } else {
      addTrack({
        site,
        query,
        label: query,
        url: (ctx && ctx.url) || location.href
      });
      if (typeof setupSearchClickTracking === 'function') setupSearchClickTracking();
      showToast('已订阅：' + qShort);
    }
    enhanceSearchTrackSubscribe();
    const active = document.querySelector('.jlc-wb-nav button.active');
    if (active && active.getAttribute('data-tab') === 'tracks' && typeof renderTracksPage === 'function') {
      renderTracksPage();
    }
    if (active && active.getAttribute('data-tab') === 'combo' && typeof renderComboPage === 'function') {
      renderComboPage();
    }
  };

  if (isNarrow) {
    // 手机：小圆钮，一点即订/取消；叠在工作台钮上方
    bar.innerHTML = '';
    bar.title = on ? `已订阅：${query}（点按取消）` : `订阅追更：${query}`;
    bar.setAttribute('role', 'button');
    bar.setAttribute('aria-label', on ? '取消搜索追更' : '订阅搜索追更');
    bar.innerHTML = `<span class="scout-track-fab-ico">${on ? '⭐' : '☆'}</span>`;
    bar.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      doToggle();
    };
    if (typeof dockMobileFabStack === 'function') dockMobileFabStack();
    return;
  }

  // PC：顶部细条
  bar.onclick = null;
  bar.removeAttribute('role');
  bar.innerHTML = `
    <span class="scout-track-banner-text" title="${escapeHtml(query)}">
      ${on ? '⭐ 已订阅' : '☆ 追更'} · <b>${escapeHtml(qShort)}</b>
    </span>
    <button type="button" id="scout-search-track-toggle" class="scout-track-banner-btn">
      ${on ? '取消' : '订阅'}
    </button>
  `;
  bar.querySelector('#scout-search-track-toggle')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    doToggle();
  });
}

/**
 * 详情页：收藏作品 → 作品列表 + 可选采集标签进词库
 * 醒目双行按钮（PC 贴标题下；手机加宽触控）
 */
function enhancePageWorkFavorite() {
  const currentSite = detectSite();
  if (!currentSite || detectPageKind() !== 'video') return;

  const meta = scrapeVideoMeta();
  const url = (meta && meta.url) || location.href;
  const videoId = videoIdFromUrl(url);
  if (!videoId) return;

  const host =
    document.querySelector('h2.page-title') ||
    document.querySelector('.page-title') ||
    document.querySelector('h1') ||
    document.querySelector('.video-metadata') ||
    document.querySelector('#video-info, .video-info, .title-container');
  if (!host) return;

  let wrap = document.getElementById('scout-work-fav-bar');
  let btn = document.getElementById('scout-work-fav-btn');

  const syncBtn = () => {
    const b = document.getElementById('scout-work-fav-btn');
    if (!b) return;
    const saved = isWorkSaved(currentSite, videoId);
    b.classList.toggle('is-saved', saved);
    b.setAttribute('aria-pressed', saved ? 'true' : 'false');
    const ico = b.querySelector('.scout-work-fav-ico');
    const label = b.querySelector('.scout-work-fav-label');
    const sub = b.querySelector('.scout-work-fav-sub');
    if (ico) ico.textContent = saved ? '★' : '☆';
    if (label) label.textContent = saved ? '已收藏' : '收藏作品';
    if (sub) sub.textContent = saved ? '点按更新 · 补采标签' : '入库作品 · 采集标签';
    b.title = saved
      ? '已在作品列表。再次点击可更新信息并补采标签'
      : '收藏到「作品」列表，并采集本页标签进词库';
  };

  if (wrap && btn) {
    syncBtn();
    return;
  }

  wrap = document.createElement('div');
  wrap.id = 'scout-work-fav-bar';
  wrap.className = 'scout-work-fav-bar';
  wrap.setAttribute('data-scout-ui', '1');

  btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'scout-work-fav-btn';
  btn.className = 'scout-work-fav-btn';
  btn.innerHTML =
    '<span class="scout-work-fav-ico" aria-hidden="true">☆</span>' +
    '<span class="scout-work-fav-text">' +
    '<span class="scout-work-fav-label">收藏作品</span>' +
    '<span class="scout-work-fav-sub">入库作品 · 采集标签</span>' +
    '</span>';

  syncBtn();

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const saved = isWorkSaved(currentSite, videoId);
    if (saved && !confirm('已在作品列表中。更新信息并再次采集标签？')) return;
    // 点击时重采（创建按钮时 poster/og 可能还没就绪 → thumb 空）
    const live = typeof scrapeVideoMeta === 'function' ? scrapeVideoMeta() : meta;
    const liveUrl = (live && live.url) || url;
    const liveId =
      (typeof videoIdFromUrl === 'function' ? videoIdFromUrl(liveUrl) : '') || videoId;
    const liveThumb =
      (live && live.thumb) ||
      (typeof pickDetailThumbUrl === 'function' ? pickDetailThumbUrl() : '') ||
      (meta && meta.thumb) ||
      '';
    const res = addWork(
      {
        site: currentSite,
        videoId: liveId,
        title: (live && live.title) || meta.title,
        url: liveUrl,
        thumb: liveThumb,
        thumbUrl: liveThumb,
        uploader: (live && live.uploader) || meta.uploader,
        tags: (live && live.tags) || meta.tags || []
      },
      { autoCollectTags: true }
    );
    syncBtn();
    if (res.work) {
      showToast(
        (res.added ? '已收藏作品' : '已更新作品') +
          (res.tagsCollected ? `，采集标签 ${res.tagsCollected} 个` : '') +
          (liveThumb ? '' : '（暂无封面，稍后再更）')
      );
      markVideoClicked({
        site: currentSite,
        videoId: liveId,
        title: (live && live.title) || meta.title,
        url: liveUrl,
        thumb: liveThumb,
        uploader: (live && live.uploader) || meta.uploader
      });
      // 异步把远程封面缓存成 dataURL（列表离线可显，防防盗链）
      if (
        liveThumb &&
        !/^data:image\//i.test(liveThumb) &&
        typeof cacheThumbToDataUrl === 'function' &&
        typeof updateWorkThumb === 'function'
      ) {
        const wid = res.work.id;
        cacheThumbToDataUrl(liveThumb).then((dataUrl) => {
          if (!dataUrl) return;
          if (updateWorkThumb(wid, dataUrl, liveThumb)) {
            const active = document.querySelector('.jlc-wb-nav button.active');
            if (active && active.getAttribute('data-tab') === 'works') {
              renderWorksPage();
            }
          }
        });
      }
      const active = document.querySelector('.jlc-wb-nav button.active');
      if (active && active.getAttribute('data-tab') === 'works') renderWorksPage();
      if (active && active.getAttribute('data-tab') === 'lexicon') renderLexiconPage();
      enhancePageTags();
    } else {
      showToast('收藏失败：无法识别作品 ID', true);
    }
  });

  wrap.appendChild(btn);
  if (host.parentNode) {
    host.parentNode.insertBefore(wrap, host.nextSibling);
  } else {
    host.appendChild(wrap);
  }
}

function enhancePagePublisher() {
  const currentSite = detectSite();
  if (!currentSite) return;
  const pageKind = detectPageKind();
  if (pageKind !== 'video') return;

  enhancePageWorkFavorite();
  
  const meta = scrapeVideoMeta();
  const pubName = meta.uploader;
  if (!pubName) return;
  
  let anchorEl = null;
  if (currentSite === 'xvideos' || currentSite === 'xnxx') {
    anchorEl = document.querySelector('.video-metadata .uploader a, a.uploader-tag, .video-metadata-uploader a');
  } else if (currentSite === 'eporner') {
    anchorEl = document.querySelector(
      'a[href*="/profile/"][title="Uploader"], a[href*="/profile/"], ' +
        '.publisher-name, .publisher a, a[href*="/channel/"], .post-channel a'
    );
  }
  
  if (!anchorEl) return;
  if (anchorEl.parentNode.querySelector('.scout-pub-addon')) return;
  
  const wrapper = document.createElement('span');
  wrapper.className = 'scout-pub-addon';
  wrapper.style.cssText = 'display:inline-flex;gap:4px;margin-left:8px;vertical-align:middle;font-size:12px;';
  
  const pubs = getPublishers();
  const matched = pubs.find(p => p.name.toLowerCase() === pubName.toLowerCase());
  
  const loveBtn = document.createElement('button');
  loveBtn.className = 'jlc-wb-btn ghost';
  loveBtn.style.cssText = 'padding:2px 8px;font-size:11.5px;height:24px;line-height:1;border-radius:6px;margin:0;cursor:pointer;';
  if (matched && matched.status === 'loved') {
    loveBtn.textContent = '❤️ 已关注熟人';
    loveBtn.style.background = '#e2f5e4';
    loveBtn.style.color = '#2f6b3a';
    loveBtn.style.borderColor = '#2f6b3a';
  } else {
    loveBtn.textContent = '❤️ 关注熟人';
  }
  
  loveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (matched && matched.status === 'loved') {
      deletePublisher(matched.id);
      showToast('已取消关注熟人');
    } else {
      addPublisher({ name: pubName, site: currentSite, status: 'loved' });
      showToast(`已关注熟人: ${pubName}`);
    }
    wrapper.remove();
    enhancePagePublisher();
  });
  
  const blockBtn = document.createElement('button');
  blockBtn.className = 'jlc-wb-btn danger';
  blockBtn.style.cssText = 'padding:2px 8px;font-size:11.5px;height:24px;line-height:1;border-radius:6px;margin:0;cursor:pointer;';
  if (matched && matched.status === 'blocked') {
    blockBtn.textContent = '🚫 已拉黑';
  } else {
    blockBtn.textContent = '✕ 拉黑';
  }
  
  blockBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (matched && matched.status === 'blocked') {
      deletePublisher(matched.id);
      showToast('已解除拉黑');
    } else {
      addPublisher({ name: pubName, site: currentSite, status: 'blocked' });
      showToast(`已拉黑该频道: ${pubName}`, true);
    }
    wrapper.remove();
    enhancePagePublisher();
  });
  
  wrapper.appendChild(loveBtn);
  wrapper.appendChild(blockBtn);
  anchorEl.parentNode.insertBefore(wrapper, anchorEl.nextSibling);
}

// 
function getComboTokens() {
  const v = GM_getValue('scout_combo_tokens', null);
  if (Array.isArray(v)) return v.map(s => compactText(s)).filter(Boolean);
  return [];
}
function saveComboTokens(list) {
  GM_setValue('scout_combo_tokens', list || []);
}
function addComboToken(text) {
  const t = compactText(text);
  if (!t) return getComboTokens();
  const list = getComboTokens();
  if (list.some(x => x.toLowerCase() === t.toLowerCase())) return list;
  list.push(t);
  saveComboTokens(list);
  return list;
}
function removeComboToken(text) {
  const t = compactText(text).toLowerCase();
  const list = getComboTokens().filter(x => x.toLowerCase() !== t);
  saveComboTokens(list);
  return list;
}

function renderComboPage() {
  const container = document.querySelector('[data-jlc-wb-page="combo"]');
  if (!container) return;

  const terms = getLexiconTerms().filter(t => t.status !== 'retired');
  const types = getLexiconTypes();
  let tokens = getComboTokens();
  let filterType = container.getAttribute('data-combo-filter') || '全部';

  const meta = scrapeVideoMeta();
  const currentSite = detectSite();
  const activeSite = currentSite || 'xvideos';

  // 已选 chips
  let selectedHtml = tokens.length
    ? tokens.map(t => `
        <span class="jlc-wb-chip is-on" data-combo-token="${escapeHtml(t)}" style="margin:2px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" title="点击移除">
          ${escapeHtml(t)} <b style="opacity:.8;">×</b>
        </span>`).join('')
    : '<span style="font-size:12.5px;color:#9a7d60;">点下方词库添加，或手动输入多个词组合搜索</span>';

  // 分类筛选
  const typeFilters = ['全部', ...types];
  let filterHtml = typeFilters.map(ty => {
    const on = filterType === ty ? 'is-on' : '';
    return `<span class="jlc-wb-chip ${on}" data-combo-filter="${escapeHtml(ty)}" style="margin:2px;cursor:pointer;font-size:12px;">${escapeHtml(ty)}</span>`;
  }).join('');

  // 词库快捷（未选中的）
  let pool = terms.slice();
  if (filterType !== '全部') pool = pool.filter(t => t.type === filterType);
  pool.sort((a, b) => {
    if (!!b.loved !== !!a.loved) return b.loved ? 1 : -1;
    return getEffectiveHeat(b) - getEffectiveHeat(a);
  });
  const selectedLower = new Set(tokens.map(t => t.toLowerCase()));
  pool = pool.filter(t => !selectedLower.has(t.text.toLowerCase())).slice(0, 80);

  let poolHtml = pool.length
    ? pool.map(t => {
        const zh = t.zh ? ` · ${t.zh}` : '';
        const heart = t.loved ? '❤️' : '';
        return `<span class="jlc-wb-chip" data-combo-pick="${escapeHtml(t.text)}" style="margin:2px;cursor:pointer;font-size:12px;" title="${escapeHtml(t.type)}">
          ${heart}${escapeHtml(t.text)}${escapeHtml(zh)}
        </span>`;
      }).join('')
    : '<span style="font-size:12px;color:#9a7d60;">该分类暂无更多词，可手动输入</span>';

  // 当前视频标签
  let currentVideoTagsHtml = '';
  if (meta && meta.tags && meta.tags.length > 0) {
    const tagPills = meta.tags.map(tag => `
      <span class="jlc-wb-chip" style="margin:2px;display:inline-flex;align-items:center;gap:4px;padding:4px 8px;font-size:12px;" data-tag="${escapeHtml(tag)}">
        ${escapeHtml(tag)}
        <b class="scout-combo-pick-tag" style="color:#2f6b3a;cursor:pointer;" title="加入组合">＋</b>
        <b class="scout-add-quick" style="color:#2f6b3a;cursor:pointer;">库</b>
        <b class="scout-block-quick" style="color:#b42318;cursor:pointer;">✕</b>
      </span>`).join('');
    currentVideoTagsHtml = `
      <div class="jlc-wb-view-block" style="margin-top:14px;">
        <div class="jlc-wb-view-title">当前视频标签</div>
        <div style="display:flex;flex-wrap:wrap;max-height:120px;overflow:auto;">${tagPills}</div>
        <div style="font-size:11px;color:#9a7d60;margin-top:4px;">＋加入组合 · 库入库 · ✕屏蔽</div>
      </div>`;
  }

  const sites = [
    { key: 'xvideos', name: 'XV', full: 'XVideos' },
    { key: 'xnxx', name: 'XN', full: 'XNXX' },
    { key: 'eporner', name: 'EP', full: 'EPorner' }
  ];
  const siteRadioHtml = sites.map(s => `
    <label class="scout-combo-site" title="${escapeHtml(s.full)}" style="display:inline-flex;align-items:center;gap:3px;margin:0;padding:2px 6px;border-radius:999px;border:1px solid #e4d4bc;font-size:11.5px;cursor:pointer;text-transform:none;letter-spacing:0;">
      <input type="radio" name="scout-search-site" value="${s.key}" ${s.key === activeSite ? 'checked' : ''} style="width:13px;height:13px;margin:0;accent-color:var(--scout-theme-color);">
      ${s.name}
    </label>`).join('');

  const searchCtx = parseSearchContext();
  const canSavePageSearch = detectPageKind() === 'search' && !!(searchCtx && searchCtx.query);
  const saveSearchTitle = canSavePageSearch
    ? `收藏当前页搜索：${searchCtx.query}`
    : '收藏当前组合为追更（不打开页面）';

  const joinMode = typeof getComboJoinMode === 'function' ? getComboJoinMode() : 'and';
  const preview = (typeof joinComboQuery === 'function'
    ? joinComboQuery(tokens, joinMode)
    : tokens.join(' and ')) || '（尚未选词）';

  const joinOpts = [
    { key: 'and', label: 'AND', tip: 'word1 and word2（推荐，结果更稳）' },
    { key: 'space', label: '空格', tip: 'word1 word2（部分站会空结果）' },
    { key: 'or', label: 'OR', tip: 'word1 or word2' }
  ];
  const joinHtml = joinOpts.map(o => `
    <label style="display:inline-flex;align-items:center;margin-right:10px;font-size:12.5px;cursor:pointer;text-transform:none;letter-spacing:0;margin-top:0;" title="${escapeHtml(o.tip)}">
      <input type="radio" name="scout-combo-join" value="${o.key}" ${joinMode === o.key ? 'checked' : ''} style="width:15px;height:15px;margin-right:4px;accent-color:var(--scout-theme-color);">
      ${o.label}
    </label>`).join('');

  container.innerHTML = `
    <div class="jlc-wb-list-scroll" style="padding-bottom:12px;">
      <div class="jlc-wb-view-block">
        <div class="jlc-wb-view-title">已选词（可多个，顺序=搜索顺序）</div>
        <div id="scout-combo-selected" style="display:flex;flex-wrap:wrap;min-height:32px;margin-bottom:8px;">${selectedHtml}</div>
        <div style="margin-bottom:8px;">
          <span style="font-size:12px;color:#9a7d60;margin-right:6px;">连接方式</span>
          ${joinHtml}
        </div>
        <div style="font-size:12px;color:#9a7d60;margin-bottom:10px;word-break:break-word;">预览：<b style="color:var(--scout-theme-color);">${escapeHtml(preview)}</b></div>
        <div style="font-size:11.5px;color:#9a7d60;margin-bottom:10px;line-height:1.4;">
          提示：多站用空格拼词常无结果，用 <b>AND</b> 更稳。多词短语请整段添加为一个 token。
        </div>
        <div style="display:flex;gap:6px;">
          <input type="text" class="jlc-wb-search" id="scout-combo-free-input" placeholder="手动加词，回车或点添加" style="flex:1;padding:8px 12px;font-size:13.5px;">
          <button class="jlc-wb-btn primary" id="scout-combo-add-btn" style="padding:8px 14px;">添加</button>
        </div>
      </div>

      <div class="jlc-wb-view-block">
        <div class="jlc-wb-view-title">从词库点选</div>
        <div style="display:flex;flex-wrap:wrap;margin-bottom:8px;">${filterHtml}</div>
        <div id="scout-combo-pool" style="display:flex;flex-wrap:wrap;max-height:160px;overflow:auto;">${poolHtml}</div>
      </div>

      ${currentVideoTagsHtml}
    </div>
    <div class="jlc-wb-footer scout-combo-dock" id="scout-combo-dock">
      <div class="scout-combo-dock-inner">
        <div class="scout-combo-dock-sites" role="group" aria-label="搜索引擎">${siteRadioHtml}</div>
        <label class="scout-combo-dock-track" title="搜索时自动加入追更">
          <input type="checkbox" id="scout-combo-auto-track" ${GM_getValue('scout_combo_auto_track', true) ? 'checked' : ''}>
          <span>追更</span>
        </label>
        <div class="scout-combo-dock-actions">
          <button type="button" class="jlc-wb-btn primary" id="scout-combo-search-btn">🔍 搜索</button>
          <button type="button" class="jlc-wb-btn ghost" id="scout-save-current-search-btn" title="${escapeHtml(saveSearchTitle)}">⭐ 收藏</button>
          <button type="button" class="jlc-wb-btn ghost" id="scout-combo-clear-btn" title="清空已选词">清空</button>
        </div>
      </div>
    </div>
  `;

  const refresh = () => renderComboPage();

  container.querySelectorAll('[data-combo-token]').forEach(el => {
    el.addEventListener('click', () => {
      removeComboToken(el.getAttribute('data-combo-token'));
      refresh();
    });
  });

  container.querySelectorAll('[data-combo-filter]').forEach(el => {
    el.addEventListener('click', () => {
      container.setAttribute('data-combo-filter', el.getAttribute('data-combo-filter') || '全部');
      refresh();
    });
  });

  container.querySelectorAll('[data-combo-pick]').forEach(el => {
    el.addEventListener('click', () => {
      addComboToken(el.getAttribute('data-combo-pick'));
      refresh();
    });
  });

  const freeInp = container.querySelector('#scout-combo-free-input');
  const doAddFree = () => {
    const v = freeInp.value.trim();
    if (!v) return;
    // 逗号批量；否则整段算一个 token（可含空格短语）
    if (/[,，;；]/.test(v)) {
      v.split(/[,，;；]+/).forEach(part => {
        if (part.trim()) addComboToken(part.trim());
      });
    } else {
      addComboToken(v);
    }
    freeInp.value = '';
    refresh();
  };
  container.querySelector('#scout-combo-add-btn')?.addEventListener('click', doAddFree);
  freeInp?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doAddFree();
    }
  });

  container.querySelectorAll('input[name="scout-combo-join"]').forEach((r) => {
    r.addEventListener('change', () => {
      if (!r.checked) return;
      const cur = getConfig();
      cur.combo_join = r.value || 'and';
      saveConfig(cur);
      refresh();
    });
  });

  container.querySelector('#scout-combo-auto-track')?.addEventListener('change', (e) => {
    GM_setValue('scout_combo_auto_track', !!e.currentTarget.checked);
  });

  container.querySelector('#scout-combo-search-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    tokens = getComboTokens();
    if (!tokens.length) {
      showToast('请至少添加一个词（可多选人物再加行为/场景）', true);
      return;
    }
    const allTerms = getLexiconTerms();
    tokens.forEach(w => {
      const t = allTerms.find(item => item.text.toLowerCase() === w.toLowerCase());
      if (t) incrementTermHeat(t.id, 'use');
    });
    const mode = container.querySelector('input[name="scout-combo-join"]:checked')?.value
      || (typeof getComboJoinMode === 'function' ? getComboJoinMode() : 'and');
    const query = typeof joinComboQuery === 'function'
      ? joinComboQuery(tokens, mode)
      : tokens.join(' and ');
    const site = container.querySelector('input[name="scout-search-site"]:checked')?.value || 'xvideos';
    const url = buildSearchUrl(site, query);
    if (!url) {
      showToast('无法生成搜索链接', true);
      return;
    }
    const autoTrack = container.querySelector('#scout-combo-auto-track')?.checked !== false;
    if (autoTrack) {
      addTrack({
        site,
        query,
        label: query,
        url
      });
      if (typeof setupSearchClickTracking === 'function') setupSearchClickTracking();
    }
    openScoutUrl(url, { newTab: true });
    showToast(autoTrack ? '已打开搜索并加入追更：' + query : '已打开搜索：' + query);
  });

  container.querySelector('#scout-combo-clear-btn')?.addEventListener('click', () => {
    saveComboTokens([]);
    refresh();
  });

  container.querySelector('#scout-save-current-search-btn')?.addEventListener('click', () => {
    // 在搜索页：收藏当前页查询；否则收藏当前组合预览
    let site = detectSite() || container.querySelector('input[name="scout-search-site"]:checked')?.value || 'xvideos';
    let query = '';
    let url = '';
    if (canSavePageSearch) {
      query = searchCtx.query;
      url = searchCtx.url || location.href;
      site = detectSite() || site;
    } else {
      tokens = getComboTokens();
      if (!tokens.length) {
        showToast('请先选词，或打开一个搜索页再收藏', true);
        return;
      }
      const mode = container.querySelector('input[name="scout-combo-join"]:checked')?.value
        || (typeof getComboJoinMode === 'function' ? getComboJoinMode() : 'and');
      query = typeof joinComboQuery === 'function'
        ? joinComboQuery(tokens, mode)
        : tokens.join(' and ');
      site = container.querySelector('input[name="scout-search-site"]:checked')?.value || site;
      url = buildSearchUrl(site, query);
    }
    const label = prompt('请输入此收藏搜索的标签别名：', query);
    if (label === null) return;
    addTrack({ site, query, label: label.trim() || query, url });
    if (typeof setupSearchClickTracking === 'function') setupSearchClickTracking();
    if (typeof checkSearchTrackingBreakpoints === 'function') checkSearchTrackingBreakpoints();
    showToast('已收藏追更：之后在该搜索点片会记断点');
    refresh();
  });

  container.querySelectorAll('[data-tag]').forEach(chip => {
    const tag = chip.getAttribute('data-tag');
    chip.querySelector('.scout-combo-pick-tag')?.addEventListener('click', (e) => {
      e.stopPropagation();
      addComboToken(tag);
      refresh();
    });
    chip.querySelector('.scout-add-quick')?.addEventListener('click', (e) => {
      e.stopPropagation();
      showScoutCollectDialog({
        text: tag,
        sources: [{ site: currentSite, url: location.href, title: meta && meta.title, at: new Date().toISOString() }],
        onSaved() { refresh(); enhancePageTags(); }
      });
    });
    chip.querySelector('.scout-block-quick')?.addEventListener('click', (e) => {
      e.stopPropagation();
      addBlockWord({ text: tag, mode: 'dim', match: 'word', scope: 'title', reason: '从当前视频标签快速屏蔽' });
      showToast('已屏蔽: ' + tag, true);
      applyListBlocks();
      refresh();
    });
  });
}

// 
function renderLexiconPage() {
  const container = document.querySelector('[data-jlc-wb-page="lexicon"]');
  if (!container) return;

  const terms = getLexiconTerms();
  const types = getLexiconTypes();

  let curType = container.getAttribute('data-selected-type') || '全部';
  let searchQuery = (container.querySelector('#scout-lexicon-search') ? container.querySelector('#scout-lexicon-search').value : '') || '';

  let typeChipsHtml = `<span class="jlc-wb-chip ${curType === '全部' ? 'is-on' : ''}" data-type="全部" style="margin:2px;cursor:pointer;">全部 (${terms.filter(t => t.status !== 'retired').length})</span>`;
  types.forEach(t => {
    const count = terms.filter(item => item.type === t && item.status !== 'retired').length;
    typeChipsHtml += `<span class="jlc-wb-chip ${curType === t ? 'is-on' : ''}" data-type="${escapeHtml(t)}" style="margin:2px;cursor:pointer;">${escapeHtml(t)} (${count})</span>`;
  });
  const retiredCount = terms.filter(t => t.status === 'retired').length;
  typeChipsHtml += `<span class="jlc-wb-chip ${curType === '已废弃' ? 'is-on' : ''}" data-type="已废弃" style="margin:2px;cursor:pointer;background:#ffe5e5;color:#b42318;">已废弃 (${retiredCount})</span>`;

  let filtered = terms;
  if (curType === '全部') {
    filtered = terms.filter(t => t.status !== 'retired');
  } else if (curType === '已废弃') {
    filtered = terms.filter(t => t.status === 'retired');
  } else {
    filtered = terms.filter(t => t.type === curType && t.status !== 'retired');
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(t => t.text.toLowerCase().includes(q) || (t.zh && t.zh.toLowerCase().includes(q)));
  }

  filtered.sort((a, b) => {
    const diff = getEffectiveHeat(b) - getEffectiveHeat(a);
    if (diff !== 0) return diff;
    return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
  });

  let itemsHtml = '';
  if (filtered.length === 0) {
    itemsHtml = '<div class="jlc-wb-empty">该分类下没有词，快去采集或者在下方新增一个吧～</div>';
  } else {
    filtered.forEach(t => {
      const zhText = t.zh ? ` · ${t.zh}` : ' · <span style="color:#b09070;font-style:italic;">暂无翻译</span>';
      const statusPill = t.status === 'confirmed' ? '<span class="jlc-status-pill tone-green" style="font-size:10px;padding:1px 4px;margin-left:4px;">已确认</span>' : '';
      const loveHeart = t.loved ? '<span style="color:#e54840;margin-right:4px;" title="心动标签">❤️</span>' : '';
      
      let typeOpts = '';
      types.forEach(ty => {
        typeOpts += `<option value="${escapeHtml(ty)}" ${t.type === ty ? 'selected' : ''}>${escapeHtml(ty)}</option>`;
      });

      itemsHtml += `
        <div class="jlc-wb-item" data-id="${t.id}">
          <div class="jlc-wb-item-row">
            <div class="jlc-wb-item-body">
              <div class="jlc-wb-item-title-row">
                <span class="jlc-wb-item-title">${loveHeart}${escapeHtml(t.text)}${zhText}${statusPill}</span>
                <span class="jlc-wb-leaf tone-yellow" title="原始热度: ${t.heat}">🔥 ${getEffectiveHeat(t).toFixed(1)}</span>
              </div>
              <div class="jlc-wb-item-meta-line" style="font-size:11.5px;color:#9a7d60;">
                分类: ${escapeHtml(t.type)} | 使用: ${t.use} | 赞/踩: ${t.good}/${t.bad}
              </div>
            </div>
            <div class="jlc-wb-item-side">
              <button class="jlc-wb-more-btn">•••</button>
            </div>
          </div>

          <div class="jlc-wb-item-edit" id="edit-${t.id}">
            <div style="display:flex;flex-direction:column;gap:8px;width:100%;margin-top:8px;border-top:1px dashed #efe0cc;padding-top:8px;">
              <div style="display:flex;gap:6px;align-items:center;">
                <span style="font-size:12px;color:#7a5a3c;width:54px;">翻译:</span>
                <input type="text" value="${escapeHtml(t.zh || '')}" placeholder="中文含义" class="scout-edit-zh" style="flex:1;padding:6px;font-size:13px;">
              </div>
              <div style="display:flex;gap:6px;align-items:center;">
                <span style="font-size:12px;color:#7a5a3c;width:54px;">类型:</span>
                <select class="jlc-wb-select scout-edit-type" style="flex:1;padding:4px 6px;">
                  ${typeOpts}
                </select>
              </div>
              <div style="display:flex;gap:6px;align-items:center;">
                <span style="font-size:12px;color:#7a5a3c;width:54px;">心动:</span>
                <label style="display:inline-flex;align-items:center;cursor:pointer;margin-top:0;text-transform:none;letter-spacing:0;font-size:13px;">
                  <input type="checkbox" class="scout-edit-loved" ${t.loved ? 'checked' : ''} style="width:16px;height:16px;margin-right:6px;accent-color:var(--scout-theme-color);"> 标记为心动标签
                </label>
              </div>
              <div style="display:flex;gap:6px;align-items:center;">
                <span style="font-size:12px;color:#7a5a3c;width:54px;">备注:</span>
                <input type="text" value="${escapeHtml(t.note || '')}" placeholder="来源/其他备注" class="scout-edit-note" style="flex:1;padding:6px;font-size:13px;">
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;flex-wrap:wrap;gap:6px;">
                <div style="display:flex;gap:4px;">
                  <button class="jlc-wb-btn primary scout-save-btn" style="padding:4px 8px;font-size:12px;">保存</button>
                  <button class="jlc-wb-btn ghost scout-cancel-btn" style="padding:4px 8px;font-size:12px;">取消</button>
                </div>
                <div style="display:flex;gap:4px;">
                  <button class="jlc-wb-btn primary scout-good-btn" title="很好用，热度+3" style="padding:4px 8px;font-size:12px;background:#2f6b3a;border:0;">👍 赞</button>
                  <button class="jlc-wb-btn ghost scout-bad-btn" title="不好用，热度-2" style="padding:4px 8px;font-size:12px;color:#8a3a32;border-color:#e8b8b0;">👎 踩</button>
                  <button class="jlc-wb-btn danger scout-retire-btn" style="padding:4px 8px;font-size:12px;">🗑️ 废弃</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    });
  }

  container.innerHTML = `
    <div class="jlc-wb-toolbar" style="padding-top:12px;">
      <div class="jlc-wb-toolbar-row">
        <input type="text" class="jlc-wb-search" id="scout-lexicon-search" placeholder="在词库中搜索..." value="${escapeHtml(searchQuery)}" style="padding:8px 12px;font-size:13.5px;">
      </div>
      <div style="display:flex;flex-wrap:wrap;margin-top:2px;">
        ${typeChipsHtml}
      </div>
    </div>

    <div class="jlc-wb-list-scroll">
      ${itemsHtml}
    </div>

    <div class="jlc-wb-footer" style="padding:10px 14px;">
      <div style="display:flex;gap:6px;width:100%;">
        <input type="text" class="jlc-wb-search" id="scout-add-term-text" placeholder="英文词..." style="flex:1.5;padding:8px;font-size:13px;">
        <input type="text" class="jlc-wb-search" id="scout-add-term-zh" placeholder="中文翻译..." style="flex:1;padding:8px;font-size:13px;">
        <button class="jlc-wb-btn primary" id="scout-add-term-btn" style="padding:8px 12px;">添加</button>
      </div>
    </div>
  `;

  container.querySelectorAll('.jlc-wb-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const type = chip.getAttribute('data-type');
      container.setAttribute('data-selected-type', type);
      renderLexiconPage();
    });
  });

  const searchInp = container.querySelector('#scout-lexicon-search');
  searchInp.addEventListener('input', () => {
    const val = searchInp.value;
    const selectionStart = searchInp.selectionStart;
    const selectionEnd = searchInp.selectionEnd;
    renderLexiconPage();
    const newSearchInp = container.querySelector('#scout-lexicon-search');
    newSearchInp.focus();
    newSearchInp.setSelectionRange(selectionStart, selectionEnd);
  });

  container.querySelector('#scout-add-term-btn').addEventListener('click', () => {
    const textVal = container.querySelector('#scout-add-term-text').value.trim();
    const zhVal = container.querySelector('#scout-add-term-zh').value.trim();
    if (!textVal) {
      showToast('请输入英文词', true);
      return;
    }
    const added = addLexiconTerm({
      text: textVal,
      zh: zhVal,
      type: '未分类'
    });
    if (added) {
      showToast(`词库已添加: ${textVal}`);
      renderLexiconPage();
    }
  });

  container.querySelectorAll('.jlc-wb-item').forEach(itemEl => {
    const id = itemEl.getAttribute('data-id');
    const editArea = itemEl.querySelector('.jlc-wb-item-edit');
    const moreBtn = itemEl.querySelector('.jlc-wb-more-btn');

    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = editArea.classList.contains('is-open');
      container.querySelectorAll('.jlc-wb-item-edit').forEach(el => el.classList.remove('is-open'));
      if (!isOpen) {
        editArea.classList.add('is-open');
      }
    });

    editArea.addEventListener('click', (e) => e.stopPropagation());

    editArea.querySelector('.scout-save-btn').addEventListener('click', () => {
      const zh = editArea.querySelector('.scout-edit-zh').value.trim();
      const type = editArea.querySelector('.scout-edit-type').value;
      const note = editArea.querySelector('.scout-edit-note').value.trim();
      const loved = editArea.querySelector('.scout-edit-loved').checked;
      updateLexiconTerm(id, { zh, type, note, loved, status: 'confirmed' });
      showToast('词库已保存并确认');
      renderLexiconPage();
    });

    editArea.querySelector('.scout-cancel-btn').addEventListener('click', () => {
      editArea.classList.remove('is-open');
    });

    editArea.querySelector('.scout-good-btn').addEventListener('click', () => {
      incrementTermHeat(id, 'good');
      showToast('已标记赞 (热度上升)');
      renderLexiconPage();
    });

    editArea.querySelector('.scout-bad-btn').addEventListener('click', () => {
      incrementTermHeat(id, 'bad');
      showToast('已标记踩 (热度下降)', true);
      renderLexiconPage();
    });

    editArea.querySelector('.scout-retire-btn').addEventListener('click', () => {
      updateLexiconTerm(id, { status: 'retired' });
      showToast('已移入废弃桶');
      renderLexiconPage();
    });
  });
}

// 
function renderPublishersPage() {
  const container = document.querySelector('[data-jlc-wb-page="publishers"]');
  if (!container) return;

  const list = getPublishers();
  let listHtml = '';

  if (list.length === 0) {
    listHtml = '<div class="jlc-wb-empty">暂无关注或拉黑的频道。可在视频播放页的上传者名字旁一键管理。</div>';
  } else {
    list.sort((a,b) => {
      if (a.status === b.status) return a.name.localeCompare(b.name);
      return a.status === 'loved' ? -1 : 1;
    });

    list.forEach(p => {
      const isLoved = p.status === 'loved';
      const statusText = isLoved ? '★ 熟人关注' : '✕ 已拉黑';
      const statusClass = isLoved ? 'tone-green' : 'tone-red';
      const notePart = p.note ? ` [备注: ${p.note}]` : '';
      
      listHtml += `
        <div class="person-item" style="border-radius:12px;margin-bottom:8px;">
          <div>
            <b style="color:${isLoved ? '#2f6b3a' : '#b42318'};">${escapeHtml(p.name)}</b> 
            <span class="jlc-status-pill ${statusClass}" style="font-size:10.5px;padding:1px 6px;margin-left:4px;">${statusText}</span>
            <span style="font-size:11px;color:#9a7d60;margin-left:4px;">(${p.site || '未知'})</span>
            <div style="font-size:11px;color:#9a7d60;margin-top:2px;">${escapeHtml(notePart)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="remove" data-id="${p.id}" title="取消熟人状态" style="cursor:pointer;font-weight:bold;">✕</span>
          </div>
        </div>
      `;
    });
  }

  container.innerHTML = `
    <div class="jlc-wb-list-scroll" style="padding-top:14px;">
      ${listHtml}
    </div>
    <div class="jlc-wb-footer">
      <div style="display:flex;gap:6px;width:100%;flex-wrap:wrap;">
        <input type="text" class="jlc-wb-search" id="scout-add-pub-name" placeholder="频道/制片名称..." style="flex:1.5;padding:8px;font-size:13px;">
        <select class="jlc-wb-select" id="scout-add-pub-status" style="flex:1;padding:4px 6px;">
          <option value="loved">❤️ 关注熟人</option>
          <option value="blocked">✕ 拉黑频道</option>
        </select>
        <button class="jlc-wb-btn primary" id="scout-add-pub-btn" style="flex:1;padding:8px;justify-content:center;">手动添加</button>
      </div>
    </div>
  `;

  container.querySelectorAll('.remove').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-id');
      if (deletePublisher(id)) {
        showToast('已取消熟人状态');
        applyListBlocks();
        renderPublishersPage();
      }
    });
  });

  container.querySelector('#scout-add-pub-btn').addEventListener('click', () => {
    const name = container.querySelector('#scout-add-pub-name').value.trim();
    const status = container.querySelector('#scout-add-pub-status').value;
    if (!name) {
      showToast('请输入频道名称', true);
      return;
    }
    const added = addPublisher({ name, site: detectSite() || 'mixed', status });
    if (added) {
      showToast(status === 'loved' ? `已关注熟人: ${name}` : `已拉黑频道: ${name}`, status !== 'loved');
      applyListBlocks();
      renderPublishersPage();
    }
  });
}

// Render Tab: Works（作品收藏）
// 主按钮优先当前站；三站芯片 = 原站打开 / 其它站按标题搜（L0）
function renderWorksPage() {
  const container = document.querySelector('[data-jlc-wb-page="works"]');
  if (!container) return;

  const works = getWorks().slice().sort((a, b) => {
    return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
  });
  const currentSite = typeof detectSite === 'function' ? detectSite() : null;
  const siteOrder =
    typeof orderSitesCurrentFirst === 'function'
      ? orderSitesCurrentFirst(currentSite)
      : ['xvideos', 'xnxx', 'eporner'];

  let listHtml = '';
  if (!works.length) {
    listHtml =
      '<div class="jlc-wb-empty">还没有收藏作品。打开视频详情页，点「☆ 收藏作品」：会进入本列表，并采集该片标签进词库。</div>';
  } else {
    works.forEach((w) => {
      const tags = (w.tags || []).slice(0, 8).map((t) => escapeHtml(t)).join(' · ');
      const more = (w.tags || []).length > 8 ? '…' : '';
      const timeStr = w.updated_at ? new Date(w.updated_at).toLocaleString() : '';
      const workSite = String(w.site || '');
      const onCurrent = !!(currentSite && workSite === currentSite);
      const primaryLabel = onCurrent || !currentSite ? '打开' : '本站搜';
      const primaryTitle = onCurrent || !currentSite
        ? '打开收藏原链'
        : '用标题在当前站搜索（优先当前站）';
      const chips = siteOrder
        .map((sid) => {
          const short =
            typeof scoutSiteShortLabel === 'function'
              ? scoutSiteShortLabel(sid)
              : sid;
          const isOrigin = sid === workSite;
          const isCur = sid === currentSite;
          const kind = isOrigin ? 'open' : 'search';
          const cls =
            'scout-work-site-chip' +
            (isCur ? ' is-current' : '') +
            (isOrigin ? ' is-origin' : '');
          const tip = isOrigin
            ? `打开原站 ${short}`
            : `在 ${short} 按标题搜索`;
          return `<button type="button" class="${cls}" data-site="${escapeHtml(sid)}" data-kind="${kind}" title="${escapeHtml(tip)}">${escapeHtml(short)}${isOrigin ? '★' : ''}</button>`;
        })
        .join('');

      listHtml += `
        <div class="jlc-wb-item" data-work-id="${escapeHtml(w.id)}">
          <div class="jlc-wb-item-row">
            <div class="jlc-wb-cover is-poster" style="flex:0 0 72px;width:72px;height:54px;border-radius:10px;overflow:hidden;background:#efe4d2;">
              ${w.thumb
                ? `<img class="scout-work-thumb" src="${escapeHtml(w.thumb)}" alt="" referrerpolicy="no-referrer" loading="lazy" style="width:100%;height:100%;object-fit:cover;"><span class="jlc-wb-cover-fallback" hidden>▶</span>`
                : '<span class="jlc-wb-cover-fallback">▶</span>'}
            </div>
            <div class="jlc-wb-item-body" style="min-width:0;">
              <div class="jlc-wb-item-title-row">
                <span class="jlc-wb-item-title">${escapeHtml(w.title || w.videoId || '未命名')}</span>
                <span class="jlc-site-pill">${escapeHtml(typeof scoutSiteShortLabel === 'function' ? scoutSiteShortLabel(workSite) : workSite.toUpperCase())}</span>
              </div>
              <div class="jlc-wb-item-meta-line" style="font-size:11.5px;color:#9a7d60;">
                ${w.uploader ? escapeHtml(w.uploader) + ' · ' : ''}${timeStr}
              </div>
              ${tags ? `<div class="jlc-wb-item-meta-line" style="font-size:11px;color:#a89078;margin-top:2px;">站标: ${tags}${more}</div>` : ''}
              <div class="scout-work-site-chips">${chips}</div>
              <div class="scout-lex-flow scout-lex-flow-work" style="margin-top:6px;">${(() => {
                const m = matchLexiconHits({ title: w.title, tags: w.tags || [], uploader: w.uploader });
                return buildLexiconHitFlowHtml(m, { max: 8, showCount: false, emptyHtml: '<span class="scout-lex-flow-empty">暂无词库标签</span>' });
              })()}</div>
            </div>
            <div class="jlc-wb-item-side">
              <button type="button" class="jlc-wb-open-btn scout-work-open" style="min-width:52px;padding:6px 10px;font-size:12px;" title="${escapeHtml(primaryTitle)}">${primaryLabel}</button>
              ${!onCurrent && currentSite && workSite
                ? '<button type="button" class="jlc-wb-btn ghost scout-work-origin" style="min-width:52px;padding:4px 8px;font-size:11px;margin-top:4px;" title="打开收藏时的原站链接">原站</button>'
                : ''}
              <button type="button" class="jlc-wb-btn danger scout-work-del" style="padding:4px 8px;font-size:11px;margin-top:4px;">删除</button>
            </div>
          </div>
        </div>`;
    });
  }

  container.innerHTML = `
    <div class="jlc-wb-list-scroll" style="padding-top:12px;">
      <div class="legacy-note" style="margin:0 14px 10px;line-height:1.45;">
        详情收藏 → 本列表 → 采标签库。主按钮<b>优先当前站</b>（本站片=打开；跨站=本站搜标题）。
        芯片 XV/XN/EP：★=原站打开，其余=按标题搜。共 <b>${works.length}</b> 部。
      </div>
      ${listHtml}
    </div>
  `;

  container.querySelectorAll('[data-work-id]').forEach((el) => {
    const id = el.getAttribute('data-work-id');
    const work = works.find((w) => w.id === id);
    if (!work) return;
    const q =
      typeof workSearchQueryFromTitle === 'function'
        ? workSearchQueryFromTitle(work.title)
        : compactText(work.title);

    const thumbImg = el.querySelector('img.scout-work-thumb');
    if (thumbImg) {
      thumbImg.addEventListener('error', () => {
        thumbImg.style.display = 'none';
        const fb = el.querySelector('.jlc-wb-cover-fallback');
        if (fb) fb.hidden = false;
        // 远程裂了且尚无 data 缓存：后台再拉一次
        const remote = work.thumbUrl || (!/^data:/i.test(work.thumb || '') ? work.thumb : '');
        if (
          remote &&
          !/^data:image\//i.test(work.thumb || '') &&
          typeof cacheThumbToDataUrl === 'function' &&
          typeof updateWorkThumb === 'function'
        ) {
          cacheThumbToDataUrl(remote).then((dataUrl) => {
            if (!dataUrl) return;
            if (updateWorkThumb(work.id, dataUrl, remote)) renderWorksPage();
          });
        }
      });
    }

    el.querySelector('.scout-work-open')?.addEventListener('click', () => {
      const onCur = currentSite && work.site === currentSite;
      if (onCur || !currentSite) {
        openScoutUrl(work.url, { newTab: true });
        return;
      }
      if (!q) {
        showToast('无标题，无法在本站搜索', true);
        return;
      }
      const url =
        typeof buildSearchUrl === 'function'
          ? buildSearchUrl(currentSite, q)
          : '';
      if (!url) return;
      openScoutUrl(url, { newTab: true });
    });

    el.querySelector('.scout-work-origin')?.addEventListener('click', () => {
      openScoutUrl(work.url, { newTab: true });
    });

    el.querySelectorAll('.scout-work-site-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const sid = chip.getAttribute('data-site');
        const kind = chip.getAttribute('data-kind');
        if (kind === 'open') {
          openScoutUrl(work.url, { newTab: true });
          return;
        }
        if (!q) {
          showToast('无标题，无法跨站搜索', true);
          return;
        }
        const url =
          typeof buildSearchUrl === 'function' ? buildSearchUrl(sid, q) : '';
        if (!url) return;
        openScoutUrl(url, { newTab: true });
      });
    });

    el.querySelector('.scout-work-del')?.addEventListener('click', () => {
      if (!confirm('从作品收藏中删除？不影响词库里已采集的标签。')) return;
      removeWork(id);
      showToast('已删除作品收藏');
      renderWorksPage();
    });
  });
}

// Render Tab 4: Tracks (Saved Searches)
// 同 query 折叠为一卡；组级「续看」优先当前站

/** 打开某站断点页；无 track 时按 query 搜第 1 页 */
function openTrackAtBreakpoint(track, site, query) {
  const siteNorm = String(site || (track && track.site) || '') || (typeof detectSite === 'function' ? detectSite() : '');
  const q = String((track && track.query) || query || '').trim();
  if (!siteNorm || !q) return;
  const page = track ? Number(track.last_seen_page) || 1 : 1;
  const baseUrl =
    (track && track.url) ||
    (typeof buildSearchUrl === 'function' ? buildSearchUrl(siteNorm, q) : '');
  if (!baseUrl) return;
  if (track && track.id) {
    updateTrack(track.id, { updated_at: new Date().toISOString() });
  }
  const target =
    typeof applyListPageToUrl === 'function'
      ? applyListPageToUrl(baseUrl, siteNorm, page)
      : baseUrl;
  openScoutUrl(target, { newTab: true });
}

function renderTracksPage() {
  const container = document.querySelector('[data-jlc-wb-page="tracks"]');
  if (!container) return;

  const tracks = getTracks();
  const groups =
    typeof groupTracksByQuery === 'function' ? groupTracksByQuery(tracks) : [];
  const currentSite = typeof detectSite === 'function' ? detectSite() : null;
  const siteOrder =
    typeof orderSitesCurrentFirst === 'function'
      ? orderSitesCurrentFirst(currentSite)
      : ['xvideos', 'xnxx', 'eporner'];

  let listHtml = '';
  if (!tracks.length) {
    listHtml =
      '<div class="jlc-wb-empty">还没有收藏的搜索追更。在搜索页时，可在“组合搜索”中一键收藏！</div>';
  } else {
    groups.forEach((g) => {
      const curTrack =
        typeof findTrackInGroup === 'function'
          ? findTrackInGroup(g, currentSite)
          : null;
      const timeStr = g.updated_at ? new Date(g.updated_at).toLocaleString() : '';
      const sitePills = siteOrder
        .map((sid) => {
          const hit =
            typeof findTrackInGroup === 'function'
              ? findTrackInGroup(g, sid)
              : null;
          const short =
            typeof scoutSiteShortLabel === 'function'
              ? scoutSiteShortLabel(sid)
              : sid;
          const on = sid === currentSite ? ' is-current' : '';
          const tone = hit ? ' is-subscribed' : ' is-empty';
          return `<span class="jlc-site-pill scout-track-site-pill${on}${tone}" title="${escapeHtml(sid)}${hit ? ' · 已订' : ' · 未订'}">${escapeHtml(short)}${hit ? '' : '·'}</span>`;
        })
        .join('');

      let curMeta = '';
      if (currentSite && curTrack) {
        curMeta = `当前站 ${typeof scoutSiteShortLabel === 'function' ? scoutSiteShortLabel(currentSite) : currentSite}：p${curTrack.last_seen_page || 1}${curTrack.last_seen_item ? ' · 已记片' : ' · 未点片'}`;
      } else if (currentSite) {
        curMeta = `当前站未订 · 续看将打开搜索第 1 页`;
      } else {
        const any = g.tracks[0];
        curMeta = any
          ? `${typeof scoutSiteShortLabel === 'function' ? scoutSiteShortLabel(any.site) : any.site} p${any.last_seen_page || 1}`
          : '';
      }

      const rowsHtml = siteOrder
        .map((sid) => {
          const t =
            typeof findTrackInGroup === 'function'
              ? findTrackInGroup(g, sid)
              : null;
          const short =
            typeof scoutSiteShortLabel === 'function'
              ? scoutSiteShortLabel(sid)
              : sid;
          const isCur = sid === currentSite;
          if (t) {
            return `
              <div class="scout-track-site-row${isCur ? ' is-current' : ''}" data-site="${escapeHtml(sid)}" data-track-id="${escapeHtml(t.id)}">
                <span class="jlc-site-pill${isCur ? ' is-current' : ''}">${escapeHtml(short)}${isCur ? ' ·本站' : ''}</span>
                <span class="scout-track-site-meta">p${t.last_seen_page || 1}${t.last_seen_item ? ' · 已记片' : ''}</span>
                <button type="button" class="jlc-wb-btn ghost scout-track-site-open" style="padding:3px 8px;font-size:11px;">续看</button>
                <button type="button" class="jlc-wb-btn danger scout-track-site-del" style="padding:3px 8px;font-size:11px;">取消</button>
              </div>`;
          }
          return `
            <div class="scout-track-site-row${isCur ? ' is-current' : ''}" data-site="${escapeHtml(sid)}">
              <span class="jlc-site-pill is-empty">${escapeHtml(short)}${isCur ? ' ·本站' : ''}</span>
              <span class="scout-track-site-meta">未订阅</span>
              <button type="button" class="jlc-wb-btn ghost scout-track-site-search" style="padding:3px 8px;font-size:11px;">去搜</button>
            </div>`;
        })
        .join('');

      listHtml += `
        <div class="jlc-wb-item scout-track-group" data-group-key="${escapeHtml(g.key)}">
          <div class="jlc-wb-item-row">
            <div class="jlc-wb-item-body">
              <div class="jlc-wb-item-title-row">
                <span class="jlc-wb-item-title" style="color:var(--scout-theme-color);">⭐ ${escapeHtml(g.label)}</span>
                <span class="jlc-site-pill">${g.siteCount} 站</span>
              </div>
              <div class="scout-track-site-pills" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${sitePills}</div>
              <div class="jlc-wb-item-meta-line" style="font-size:12px;margin-top:4px;">
                查询: <b>${escapeHtml(g.query)}</b>
              </div>
              <div class="jlc-wb-item-meta-line" style="font-size:11px;color:#a89078;">
                ${escapeHtml(curMeta)}${timeStr ? ' | ' + escapeHtml(timeStr) : ''}
              </div>
            </div>
            <div class="jlc-wb-item-side">
              <button type="button" class="jlc-wb-open-btn scout-track-open-btn" style="min-width:54px;padding:6px 12px;font-size:12px;" title="优先当前站断点">续看</button>
              <button type="button" class="jlc-wb-btn ghost scout-track-expand-btn" style="min-width:54px;padding:4px 8px;font-size:11px;margin-top:4px;">站点</button>
              <button type="button" class="jlc-wb-more-btn scout-track-more-btn">•••</button>
            </div>
          </div>
          <div class="scout-track-group-sites">${rowsHtml}</div>
          <div class="jlc-wb-item-edit scout-track-edit">
            <div style="display:flex;justify-content:flex-end;gap:8px;width:100%;flex-wrap:wrap;border-top:1px dashed #efe0cc;padding-top:8px;margin-top:6px;">
              ${curTrack ? '<button type="button" class="jlc-wb-btn danger scout-track-del-current-btn" style="padding:4px 10px;font-size:12px;">取消当前站</button>' : ''}
              <button type="button" class="jlc-wb-btn danger scout-track-delete-btn" style="padding:4px 10px;font-size:12px;">删除整组</button>
              <button type="button" class="jlc-wb-btn ghost scout-track-cancel-btn" style="padding:4px 10px;font-size:12px;">取消</button>
            </div>
          </div>
        </div>`;
    });
  }

  container.innerHTML = `
    <div class="jlc-wb-list-scroll" style="padding-top:14px;">
      <div class="legacy-note" style="margin:0 14px 10px;line-height:1.45;">
        同搜索词多站合成一卡。<b>续看优先当前站</b>；点「站点」可看三站断点 / 去搜。
      </div>
      ${listHtml}
    </div>
  `;

  container.querySelectorAll('.scout-track-group').forEach((itemEl) => {
    const key = itemEl.getAttribute('data-group-key');
    const group = groups.find((g) => g.key === key);
    if (!group) return;

    itemEl.querySelector('.scout-track-open-btn')?.addEventListener('click', () => {
      // 优先当前站：有订则续断点，无订则当前站搜第 1 页；无法识别站则用组内最新一条
      let site = currentSite;
      let track = site
        ? typeof findTrackInGroup === 'function'
          ? findTrackInGroup(group, site)
          : null
        : null;
      if (!site) {
        track = group.tracks
          .slice()
          .sort(
            (a, b) =>
              new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
          )[0];
        site = track && track.site;
      }
      openTrackAtBreakpoint(track, site, group.query);
      renderTracksPage();
    });

    itemEl.querySelector('.scout-track-expand-btn')?.addEventListener('click', () => {
      itemEl
        .querySelector('.scout-track-group-sites')
        ?.classList.toggle('is-open');
    });

    const moreBtn = itemEl.querySelector('.scout-track-more-btn');
    const editArea = itemEl.querySelector('.scout-track-edit');
    moreBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = editArea.classList.contains('is-open');
      container
        .querySelectorAll('.scout-track-edit')
        .forEach((el) => el.classList.remove('is-open'));
      if (!isOpen) editArea.classList.add('is-open');
    });

    editArea?.querySelector('.scout-track-cancel-btn')?.addEventListener('click', () => {
      editArea.classList.remove('is-open');
    });

    editArea?.querySelector('.scout-track-del-current-btn')?.addEventListener('click', () => {
      const t =
        typeof findTrackInGroup === 'function'
          ? findTrackInGroup(group, currentSite)
          : null;
      if (!t) return;
      if (!confirm(`取消当前站「${group.label}」追更？`)) return;
      deleteTrack(t.id);
      showToast('已取消当前站追更');
      renderTracksPage();
    });

    editArea?.querySelector('.scout-track-delete-btn')?.addEventListener('click', () => {
      if (!confirm(`删除整组「${group.label}」？将去掉 ${group.siteCount} 站追更。`)) return;
      if (typeof deleteTracksByQueryKey === 'function') {
        deleteTracksByQueryKey(group.key);
      } else {
        group.tracks.forEach((t) => deleteTrack(t.id));
      }
      showToast('已删除整组追更');
      renderTracksPage();
    });

    itemEl.querySelectorAll('.scout-track-site-row').forEach((row) => {
      const sid = row.getAttribute('data-site');
      const tid = row.getAttribute('data-track-id');
      const t = tid ? group.tracks.find((x) => x.id === tid) : null;
      row.querySelector('.scout-track-site-open')?.addEventListener('click', () => {
        openTrackAtBreakpoint(t, sid, group.query);
        renderTracksPage();
      });
      row.querySelector('.scout-track-site-search')?.addEventListener('click', () => {
        openTrackAtBreakpoint(null, sid, group.query);
      });
      row.querySelector('.scout-track-site-del')?.addEventListener('click', () => {
        if (!t) return;
        if (!confirm(`取消 ${typeof scoutSiteShortLabel === 'function' ? scoutSiteShortLabel(sid) : sid} 上的「${group.label}」？`)) return;
        deleteTrack(t.id);
        showToast('已取消该站追更');
        renderTracksPage();
      });
    });
  });
}

// 
function renderBlocksPage() {
  const container = document.querySelector('[data-jlc-wb-page="blocks"]');
  if (!container) return;

  const blocks = getBlockList();
  let listHtml = '';

  if (blocks.length === 0) {
    listHtml = '<div class="jlc-wb-empty">暂无屏蔽词。默认整词匹配标题，避免 ass 误伤 class 一类词。</div>';
  } else {
    blocks.forEach(b => {
      const zhPart = b.zh ? ` (${b.zh})` : '';
      const reasonPart = b.reason ? `原因: ${b.reason}` : '';
      const isHide = b.mode === 'hide';
      const isSub = normalizeBlockMatch(b.match) === 'sub';
      const scope = normalizeBlockScope(b.scope);
      const scopeLabel = scope === 'both' ? '标题+上传者' : scope === 'uploader' ? '上传者' : '标题';

      const modeBadge = isHide
        ? `<span class="jlc-status-pill tone-red scout-toggle-mode-btn" style="font-size:10px;padding:1px 6px;cursor:pointer;" data-id="${b.id}" title="点击切换为弱淡化">🚫 强隐藏</span>`
        : `<span class="jlc-status-pill tone-yellow scout-toggle-mode-btn" style="font-size:10px;padding:1px 6px;cursor:pointer;background:#ffe8c2;color:#b54708;border-color:#f5c77a;" data-id="${b.id}" title="点击切换为强隐藏">🌁 弱淡化</span>`;
      const matchBadge = `<span class="jlc-status-pill scout-toggle-match-btn" style="font-size:10px;padding:1px 6px;cursor:pointer;background:#efe4d2;color:#6b4a2e;" data-id="${b.id}" title="点击切换 整词/子串">${isSub ? '⊂ 子串' : '⬚ 整词'}</span>`;
      const scopeBadge = `<span class="jlc-status-pill scout-toggle-scope-btn" style="font-size:10px;padding:1px 6px;cursor:pointer;background:#e7f1ff;color:#175cd3;" data-id="${b.id}" title="点击切换匹配范围">${escapeHtml(scopeLabel)}</span>`;

      listHtml += `
        <div class="person-item" style="border-radius:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div style="min-width:0;flex:1;">
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px;">
              <b style="color:#b42318;">${escapeHtml(b.text)}</b>${escapeHtml(zhPart)}
              ${modeBadge}${matchBadge}${scopeBadge}
            </div>
            <div style="font-size:11px;color:#9a7d60;margin-top:4px;">${escapeHtml(reasonPart)}</div>
          </div>
          <span class="remove" data-id="${b.id}" title="取消屏蔽" style="color:#b42318;font-weight:bold;cursor:pointer;font-size:16px;flex:0 0 auto;">✕</span>
        </div>
      `;
    });
  }

  container.innerHTML = `
    <div class="jlc-wb-list-scroll" style="padding-top:14px;">
      ${listHtml}
    </div>

    <div class="jlc-wb-footer">
      <div style="display:flex;gap:6px;width:100%;flex-wrap:wrap;">
        <input type="text" class="jlc-wb-search" id="scout-add-block-text" placeholder="屏蔽词..." style="flex:1.5;padding:8px;font-size:13px;">
        <input type="text" class="jlc-wb-search" id="scout-add-block-zh" placeholder="中文翻译..." style="flex:1;padding:8px;font-size:13px;">
        <input type="text" class="jlc-wb-search" id="scout-add-block-reason" placeholder="屏蔽理由..." style="flex:100%;padding:8px;font-size:13px;margin-top:4px;">

        <div style="display:flex;align-items:center;gap:10px;width:100%;margin-top:4px;padding:0 4px;flex-wrap:wrap;">
          <span style="font-size:12px;color:#7a5a3c;font-weight:bold;">效果:</span>
          <label style="display:inline-flex;align-items:center;font-size:12.5px;cursor:pointer;margin-top:0;text-transform:none;letter-spacing:0;">
            <input type="radio" name="scout-add-block-mode" value="dim" checked style="width:15px;height:15px;margin-right:4px;accent-color:var(--scout-theme-color);"> 弱淡化
          </label>
          <label style="display:inline-flex;align-items:center;font-size:12.5px;cursor:pointer;margin-top:0;text-transform:none;letter-spacing:0;">
            <input type="radio" name="scout-add-block-mode" value="hide" style="width:15px;height:15px;margin-right:4px;accent-color:var(--scout-theme-color);"> 强隐藏
          </label>
        </div>
        <div style="display:flex;align-items:center;gap:10px;width:100%;padding:0 4px;flex-wrap:wrap;">
          <span style="font-size:12px;color:#7a5a3c;font-weight:bold;">匹配:</span>
          <label style="display:inline-flex;align-items:center;font-size:12.5px;cursor:pointer;margin-top:0;text-transform:none;letter-spacing:0;">
            <input type="radio" name="scout-add-block-match" value="word" checked style="width:15px;height:15px;margin-right:4px;accent-color:var(--scout-theme-color);"> 整词
          </label>
          <label style="display:inline-flex;align-items:center;font-size:12.5px;cursor:pointer;margin-top:0;text-transform:none;letter-spacing:0;">
            <input type="radio" name="scout-add-block-match" value="sub" style="width:15px;height:15px;margin-right:4px;accent-color:var(--scout-theme-color);"> 子串
          </label>
          <span style="font-size:12px;color:#7a5a3c;font-weight:bold;margin-left:6px;">范围:</span>
          <label style="display:inline-flex;align-items:center;font-size:12.5px;cursor:pointer;margin-top:0;text-transform:none;letter-spacing:0;">
            <input type="radio" name="scout-add-block-scope" value="title" checked style="width:15px;height:15px;margin-right:4px;accent-color:var(--scout-theme-color);"> 标题
          </label>
          <label style="display:inline-flex;align-items:center;font-size:12.5px;cursor:pointer;margin-top:0;text-transform:none;letter-spacing:0;">
            <input type="radio" name="scout-add-block-scope" value="uploader" style="width:15px;height:15px;margin-right:4px;accent-color:var(--scout-theme-color);"> 上传者
          </label>
          <label style="display:inline-flex;align-items:center;font-size:12.5px;cursor:pointer;margin-top:0;text-transform:none;letter-spacing:0;">
            <input type="radio" name="scout-add-block-scope" value="both" style="width:15px;height:15px;margin-right:4px;accent-color:var(--scout-theme-color);"> 两者
          </label>
        </div>

        <button class="jlc-wb-btn primary" id="scout-add-block-btn" style="flex:1;margin-top:6px;padding:8px;justify-content:center;">添加屏蔽</button>
      </div>
    </div>
  `;

  container.querySelectorAll('.remove').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-id');
      if (deleteBlockWord(id)) {
        showToast('已取消屏蔽');
        applyListBlocks();
        renderBlocksPage();
      }
    });
  });

  container.querySelectorAll('.scout-toggle-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const b = blocks.find(item => item.id === id);
      if (b) {
        addBlockWord({ text: b.text, mode: b.mode === 'hide' ? 'dim' : 'hide' });
        applyListBlocks();
        renderBlocksPage();
      }
    });
  });

  container.querySelectorAll('.scout-toggle-match-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const b = blocks.find(item => item.id === id);
      if (b) {
        const next = normalizeBlockMatch(b.match) === 'sub' ? 'word' : 'sub';
        addBlockWord({ text: b.text, match: next });
        showToast(`匹配方式: ${next === 'sub' ? '子串' : '整词'}`);
        applyListBlocks();
        renderBlocksPage();
      }
    });
  });

  container.querySelectorAll('.scout-toggle-scope-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const b = blocks.find(item => item.id === id);
      if (b) {
        const cur = normalizeBlockScope(b.scope);
        const next = cur === 'title' ? 'uploader' : cur === 'uploader' ? 'both' : 'title';
        addBlockWord({ text: b.text, scope: next });
        showToast(`匹配范围已切换`);
        applyListBlocks();
        renderBlocksPage();
      }
    });
  });

  container.querySelector('#scout-add-block-btn').addEventListener('click', () => {
    const textVal = container.querySelector('#scout-add-block-text').value.trim();
    const zhVal = container.querySelector('#scout-add-block-zh').value.trim();
    const reasonVal = container.querySelector('#scout-add-block-reason').value.trim();
    const modeVal = container.querySelector('input[name="scout-add-block-mode"]:checked').value;
    const matchVal = container.querySelector('input[name="scout-add-block-match"]:checked').value;
    const scopeVal = container.querySelector('input[name="scout-add-block-scope"]:checked').value;

    if (!textVal) {
      showToast('请输入屏蔽词', true);
      return;
    }
    const added = addBlockWord({
      text: textVal,
      zh: zhVal,
      reason: reasonVal,
      mode: modeVal,
      match: matchVal,
      scope: scopeVal
    });
    if (added) {
      showToast(`已屏蔽: ${textVal}`, true);
      applyListBlocks();
      renderBlocksPage();
    }
  });
}

// 
function setScoutSettingsOpen(open, tab) {
  const drawer = document.getElementById('jlc-wb-settings');
  if (!drawer) return;
  drawer.classList.toggle('is-open', !!open);
  if (open) {
    renderScoutSettingsSection(tab || 'overview');
  }
}

function renderScoutSettingsSection(tab) {
  const t = tab || 'overview';
  document.querySelectorAll('[data-scout-settings-tab]').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-scout-settings-tab') === t);
  });
  renderSettingsPage(t);
}

function renderSettingsPage(section) {
  const container = document.getElementById('scout-settings-body');
  if (!container) return;
  const sec = section || 'overview';

  const cfg = getConfig();
  const terms = getLexiconTerms();
  const blocks = getBlockList();
  const tracks = getTracks();
  const pubs = getPublishers();
  const clickCount = typeof getClickedCount === 'function' ? getClickedCount() : 0;

  const statusStr = scoutSync ? scoutSync.statusText() : '未加载同步模块';
  let html = '';

  if (sec === 'ui') {
    html = `
      <h3>站点界面</h3>
      <div class="legacy-row">
        <label class="legacy-toggle">
          <span>站点奶油主题</span>
          <input type="checkbox" id="scout-cfg-cream-site" ${cfg.cream_site_theme !== false ? 'checked' : ''}>
        </label>
      </div>
      <div class="legacy-note" style="margin-top:8px;line-height:1.5;">
        开启后重绘三站底色、顶栏、列表卡片（非统一奶油）。<br>
        <b>xvideos 暖红 · xnxx 冷蓝 · eporner 叶绿</b>。卡片用站点色，不用白底。关闭=原生样式。
      </div>
      <h3 style="margin-top:16px;">浏览</h3>
      <div class="legacy-row">
        <label class="legacy-toggle">
          <span>新标签打开影片</span>
          <input type="checkbox" id="scout-cfg-open-new-tab" ${cfg.open_videos_new_tab !== false ? 'checked' : ''}>
        </label>
      </div>
      <div class="legacy-note" style="margin-top:8px;">开启后列表点影片在新标签打开，不离开当前搜索页。组合搜索同样用新标签。</div>
      <div class="legacy-row" style="margin-top:12px;">
        <label class="legacy-toggle">
          <span>关闭站点自动预览</span>
          <input type="checkbox" id="scout-cfg-block-site-preview" ${cfg.block_site_auto_preview !== false ? 'checked' : ''}>
        </label>
      </div>
      <div class="legacy-note" style="margin-top:8px;line-height:1.5;">
        关掉 xv/xnxx 列表「滑过/进视野就播」的预览，减轻下滑卡顿。<br>
        <b>不影响</b>Creamu：点缩略图仍可手动预览。
      </div>
    `;
  } else if (sec === 'overview') {
    html = `
      <h3>数据概况</h3>
      <div class="stat-box">
        <div class="stat-item"><b>${terms.filter(t => t.status !== 'retired').length}</b><span>词库</span></div>
        <div class="stat-item"><b>${blocks.length}</b><span>屏蔽</span></div>
        <div class="stat-item"><b>${pubs.length}</b><span>熟人</span></div>
        <div class="stat-item"><b>${tracks.length}</b><span>追更</span></div>
      </div>
      <div class="stat-box" style="margin-top:10px;">
        <div class="stat-item"><b>${typeof getWorks === 'function' ? getWorks().length : 0}</b><span>作品</span></div>
        <div class="stat-item"><b>${clickCount}</b><span>已点</span></div>
        <div class="stat-item" style="flex:2;text-align:left;padding:0 8px;">
          <span style="display:block;font-size:12px;color:#9a7d60;line-height:1.45;text-transform:none;letter-spacing:0;">
            已点 = 点过的片（灰显）· 断点 = 收藏搜索 last_seen
          </span>
        </div>
      </div>
      <button type="button" class="jlc-wb-btn ghost" id="scout-clear-clicks-btn" style="margin-top:12px;width:100%;">清空已点记录</button>
      <button type="button" class="jlc-wb-btn ghost" id="scout-purge-block-terms-btn" style="margin-top:8px;width:100%;">清理词库中的屏蔽词</button>
      <div class="legacy-note" style="margin-top:6px;">把「已在屏蔽表」或 note 写「用于屏蔽」的条目移出词库，只留在屏蔽里。</div>
    `;
  } else if (sec === 'backup') {
    html = `
      <h3>词库+屏蔽（给 AI）</h3>
      <div class="legacy-note" style="margin:0 0 8px;line-height:1.45;">
        推荐：点「复制给 AI」= 提示词 + 数据包，直接粘贴对话。<br>
        回填后整段 JSON 粘到下方点「覆盖导入」。<br>
        <b>覆盖</b>＝以包为准（包外旧词会删），<b>同词保留本地热度/use</b>。<br>
        「合并」只增补不删旧词。不含熟人/断点/已点。
      </div>
      <textarea id="scout-ai-textarea" style="width:100%;height:120px;font-family:monospace;font-size:11.5px;padding:8px;border-radius:12px;border:1px solid #e4d4bc;" placeholder="词库+屏蔽 JSON…"></textarea>
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
        <button class="jlc-wb-btn primary" id="scout-ai-copy-chat" style="flex:1.4;min-width:100px;">📋 复制给 AI</button>
        <button class="jlc-wb-btn ghost" id="scout-ai-copy-prompt" style="flex:1;min-width:80px;">只复制提示词</button>
      </div>
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
        <button class="jlc-wb-btn ghost" id="scout-ai-export" style="flex:1;min-width:70px;">导出JSON</button>
        <button class="jlc-wb-btn ghost" id="scout-ai-copy" style="flex:1;min-width:70px;">复制JSON</button>
        <button class="jlc-wb-btn ghost" id="scout-ai-import" style="flex:1.2;min-width:80px;color:#b54708;">覆盖导入</button>
        <button class="jlc-wb-btn ghost" id="scout-ai-import-merge" style="flex:1;min-width:70px;">合并</button>
        <button class="jlc-wb-btn ghost" id="scout-ai-clip" style="flex:1;min-width:70px;color:#b54708;">剪贴板覆盖</button>
      </div>

      <h3 style="margin-top:16px;">完整备份</h3>
      <div class="legacy-note" style="margin:0 0 8px;">词库+屏蔽+熟人+断点+已点</div>
      <textarea id="scout-backup-textarea" style="width:100%;height:72px;font-family:monospace;font-size:11.5px;padding:8px;border-radius:12px;border:1px solid #e4d4bc;" placeholder="完整 JSON…"></textarea>
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
        <button class="jlc-wb-btn ghost" id="scout-export-btn" style="flex:1;min-width:70px;">导出</button>
        <button class="jlc-wb-btn ghost" id="scout-copy-btn" style="flex:1;min-width:70px;">复制</button>
        <button class="jlc-wb-btn ghost" id="scout-import-btn" style="flex:1;min-width:70px;color:#b54708;">导入</button>
        <button class="jlc-wb-btn ghost" id="scout-import-clipboard-btn" style="flex:1;min-width:70px;color:#b54708;">剪贴板</button>
      </div>
    `;
  } else {
    html = `
      <h3>WebDAV 同步</h3>
      <div class="legacy-row">
        <label class="legacy-toggle">
          <span>启用同步</span>
          <input type="checkbox" id="scout-wd-enabled" ${cfg.webdav_enabled ? 'checked' : ''}>
        </label>
      </div>
      <div id="scout-wd-form" style="${cfg.webdav_enabled ? '' : 'display:none;'}">
        <label>服务器地址</label>
        <input type="text" id="scout-wd-url" value="${escapeHtml(cfg.webdav_url)}" placeholder="https://dav.jianguoyun.com/dav/">
        <label>用户名</label>
        <input type="text" id="scout-wd-user" value="${escapeHtml(cfg.webdav_user)}" placeholder="example@email.com">
        <label>应用密码</label>
        <input type="password" id="scout-wd-password" value="${escapeHtml(cfg.webdav_password)}" placeholder="应用密码">
        <label>远端路径</label>
        <input type="text" id="scout-wd-path" value="${escapeHtml(cfg.webdav_path)}" placeholder="/Creamu">
        <div class="legacy-row" style="margin-top:12px;">
          <label class="legacy-toggle">
            <span>自动同步 (约 8 秒)</span>
            <input type="checkbox" id="scout-wd-auto" ${cfg.webdav_auto !== false ? 'checked' : ''}>
          </label>
        </div>
        <label>冲突策略</label>
        <select id="scout-wd-conflict">
          <option value="ask" ${cfg.webdav_conflict === 'ask' ? 'selected' : ''}>询问</option>
          <option value="local" ${cfg.webdav_conflict === 'local' ? 'selected' : ''}>本机优先</option>
          <option value="remote" ${cfg.webdav_conflict === 'remote' ? 'selected' : ''}>云端优先</option>
        </select>
        <div class="legacy-note" style="margin-top:10px;word-break:break-all;">
          <b>状态</b><br><span id="scout-wd-status-text">${escapeHtml(statusStr)}</span>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;">
          <button class="jlc-wb-btn ghost" id="scout-wd-test-btn" style="flex:1;">测试连接</button>
          <button class="jlc-wb-btn primary" id="scout-wd-sync-btn" style="flex:1;">手动同步</button>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  const refresh = () => renderScoutSettingsSection(sec);
  const textBackup = container.querySelector('#scout-backup-textarea');

  container.querySelector('#scout-cfg-cream-site')?.addEventListener('change', (e) => {
    const curCfg = getConfig();
    curCfg.cream_site_theme = !!e.currentTarget.checked;
    saveConfig(curCfg); // 内含 applyScoutSiteTheme
    showToast(curCfg.cream_site_theme ? '已开启站点主题' : '已关闭站点主题');
  });

  container.querySelector('#scout-cfg-open-new-tab')?.addEventListener('change', (e) => {
    const curCfg = getConfig();
    curCfg.open_videos_new_tab = !!e.currentTarget.checked;
    saveConfig(curCfg);
    showToast(curCfg.open_videos_new_tab ? '影片将在新标签打开' : '影片将在当前页打开');
  });

  container.querySelector('#scout-cfg-block-site-preview')?.addEventListener('change', (e) => {
    const curCfg = getConfig();
    curCfg.block_site_auto_preview = !!e.currentTarget.checked;
    saveConfig(curCfg);
    if (typeof pauseSiteListPreviewVideos === 'function') {
      try { pauseSiteListPreviewVideos(); } catch (_) { /* ignore */ }
    }
    showToast(
      curCfg.block_site_auto_preview
        ? '已关闭站点自动预览（点按预览仍可用）'
        : '已恢复站点自动预览'
    );
  });

  const copyText = (data, ta) => {
    if (typeof GM_setClipboard === 'function') {
      GM_setClipboard(data);
      showToast('已复制到剪贴板');
    } else if (ta) {
      ta.value = data;
      ta.select();
      document.execCommand('copy');
      showToast('已全选，请 Ctrl+C');
    }
  };
  const readClip = async () => {
    if (navigator.clipboard && navigator.clipboard.readText) {
      return await navigator.clipboard.readText();
    }
    return '';
  };

  const aiTa = container.querySelector('#scout-ai-textarea');
  const afterAiImport = (r) => {
    if (!r) return;
    const modeLabel = r.mode === 'merge' ? '已合并' : '已覆盖';
    let msg = `${modeLabel}：词库 ${r.terms || 0} · 屏蔽 ${r.blocks || 0}`;
    if (r.keptStats) msg += ` · 保留热度 ${r.keptStats}`;
    if (r.removed) msg += ` · 移除旧词 ${r.removed}`;
    if (r.diverted) msg += ` · 改道屏蔽 ${r.diverted}`;
    if (r.purged) msg += ` · 已从词库清除 ${r.purged}`;
    if (r.dedupedTerms) msg += ` · 压重复词 ${r.dedupedTerms}`;
    if (r.dedupedBlocks) msg += ` · 压重复屏蔽 ${r.dedupedBlocks}`;
    showToast(msg);
    renderLexiconPage();
    renderComboPage();
    applyListBlocks();
    renderBlocksPage();
  };
  container.querySelector('#scout-ai-copy-chat')?.addEventListener('click', () => {
    const blob = exportAiLexiconForChat();
    if (aiTa) aiTa.value = exportAiLexiconPackage();
    copyText(blob, null);
    showToast('已复制：提示词 + 数据包（粘贴给 AI）');
  });
  container.querySelector('#scout-ai-copy-prompt')?.addEventListener('click', () => {
    copyText(getScoutAiPromptText(), null);
    showToast('已复制 AI 提示词');
  });
  container.querySelector('#scout-ai-export')?.addEventListener('click', () => {
    if (!aiTa) return;
    aiTa.value = exportAiLexiconPackage();
    showToast('词库+屏蔽已导出');
  });
  container.querySelector('#scout-ai-copy')?.addEventListener('click', () => {
    copyText(exportAiLexiconPackage(), aiTa);
  });
  container.querySelector('#scout-ai-import')?.addEventListener('click', () => {
    const val = (aiTa && aiTa.value.trim()) || '';
    if (!val) return showToast('文本框为空', true);
    if (!confirm('覆盖导入词库+屏蔽？\n· 以包为准，包里没有的旧词会删掉\n· 同词保留本地 heat / use / good / bad')) return;
    afterAiImport(importAiLexiconPackage(val, { mode: 'replace' }));
  });
  container.querySelector('#scout-ai-import-merge')?.addEventListener('click', () => {
    const val = (aiTa && aiTa.value.trim()) || '';
    if (!val) return showToast('文本框为空', true);
    if (!confirm('合并导入？（只增补/更新，不删本地旧词）')) return;
    afterAiImport(importAiLexiconPackage(val, { mode: 'merge' }));
  });
  container.querySelector('#scout-ai-clip')?.addEventListener('click', async () => {
    if (!confirm('从剪贴板覆盖导入词库+屏蔽？\n同词保留本地热度，包外旧词删除。')) return;
    try {
      const text = await readClip();
      if (!text) return showToast('剪贴板为空', true);
      if (aiTa) aiTa.value = text;
      afterAiImport(importAiLexiconPackage(text, { mode: 'replace' }));
    } catch (_) {
      showToast('读取剪贴板失败', true);
    }
  });

  container.querySelector('#scout-clear-clicks-btn')?.addEventListener('click', () => {
    if (!confirm('确定清空全部「已点」记录？不影响词库、屏蔽与追更断点。')) return;
    clearAllClicks();
    showToast('已点记录已清空');
    document.querySelectorAll('.scout-visited-item').forEach(el => el.classList.remove('scout-visited-item'));
    refresh();
  });

  container.querySelector('#scout-purge-block-terms-btn')?.addEventListener('click', () => {
    if (!confirm('从词库移除：已在屏蔽表中的词，以及标记「用于屏蔽」的词？')) return;
    const n = purgeBlockedTermsFromLexicon();
    showToast(n ? `已从词库清除 ${n} 条（仅保留在屏蔽）` : '词库中没有需要清理的屏蔽词');
    renderLexiconPage();
    renderComboPage();
    renderBlocksPage();
    refresh();
  });

  container.querySelector('#scout-export-btn')?.addEventListener('click', () => {
    if (!textBackup) return;
    textBackup.value = exportLexiconPackage();
    showToast('已导出（词库/屏蔽/熟人/断点/已点）');
  });

  container.querySelector('#scout-import-btn')?.addEventListener('click', () => {
    const val = (textBackup && textBackup.value.trim()) || '';
    if (!val) return showToast('文本框为空', true);
    if (!confirm('确定从文本框导入并合并？')) return;
    if (importLexiconPackage(val)) {
      showToast('导入成功');
      refresh();
    }
  });

  container.querySelector('#scout-copy-btn')?.addEventListener('click', () => {
    const data = exportLexiconPackage();
    if (typeof GM_setClipboard === 'function') {
      GM_setClipboard(data);
      showToast('已复制到剪贴板');
    } else if (textBackup) {
      textBackup.value = data;
      textBackup.select();
      document.execCommand('copy');
      showToast('已全选，请 Ctrl+C');
    }
  });

  container.querySelector('#scout-import-clipboard-btn')?.addEventListener('click', async () => {
    if (!confirm('从剪贴板导入并合并？')) return;
    try {
      const text = (navigator.clipboard && navigator.clipboard.readText)
        ? await navigator.clipboard.readText()
        : '';
      if (!text) return showToast('剪贴板为空，请手动粘贴后导入', true);
      if (importLexiconPackage(text)) {
        showToast('剪贴板导入成功');
        refresh();
      }
    } catch (_) {
      showToast('读取剪贴板失败', true);
    }
  });

  const wdEnabledCb = container.querySelector('#scout-wd-enabled');
  const wdForm = container.querySelector('#scout-wd-form');
  wdEnabledCb?.addEventListener('change', () => {
    const curCfg = getConfig();
    curCfg.webdav_enabled = !!wdEnabledCb.checked;
    saveConfig(curCfg);
    if (wdForm) wdForm.style.display = curCfg.webdav_enabled ? '' : 'none';
    initScoutWebDav();
    refresh();
  });

  ['scout-wd-url', 'scout-wd-user', 'scout-wd-password', 'scout-wd-path', 'scout-wd-conflict'].forEach((id) => {
    const el = container.querySelector('#' + id);
    if (!el) return;
    el.addEventListener('change', () => {
      const curCfg = getConfig();
      const q = (sid) => container.querySelector('#' + sid);
      curCfg.webdav_url = (q('scout-wd-url')?.value || '').trim();
      curCfg.webdav_user = (q('scout-wd-user')?.value || '').trim();
      curCfg.webdav_password = q('scout-wd-password')?.value || '';
      curCfg.webdav_path = (q('scout-wd-path')?.value || '').trim();
      curCfg.webdav_conflict = q('scout-wd-conflict')?.value || 'ask';
      saveConfig(curCfg);
      initScoutWebDav();
      const st = container.querySelector('#scout-wd-status-text');
      if (st && scoutSync) st.textContent = scoutSync.statusText();
    });
  });

  container.querySelector('#scout-wd-auto')?.addEventListener('change', (e) => {
    const curCfg = getConfig();
    curCfg.webdav_auto = !!e.currentTarget.checked;
    saveConfig(curCfg);
    initScoutWebDav();
  });

  container.querySelector('#scout-wd-test-btn')?.addEventListener('click', async () => {
    const testBtn = container.querySelector('#scout-wd-test-btn');
    if (!testBtn) return;
    testBtn.disabled = true;
    testBtn.textContent = '测试中…';
    try {
      if (!scoutSync) throw new Error('同步实例未就绪');
      await scoutSync.testConnection();
    } catch (e) {
      showToast(e.message || '测试失败', true);
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = '测试连接';
      const st = container.querySelector('#scout-wd-status-text');
      if (st && scoutSync) st.textContent = scoutSync.statusText();
    }
  });

  container.querySelector('#scout-wd-sync-btn')?.addEventListener('click', async () => {
    const syncBtn = container.querySelector('#scout-wd-sync-btn');
    if (!syncBtn) return;
    syncBtn.disabled = true;
    syncBtn.textContent = '同步中…';
    try {
      if (!scoutSync) throw new Error('同步实例未就绪');
      await scoutSync.syncNow();
      renderLexiconPage();
      renderBlocksPage();
      renderPublishersPage();
      renderTracksPage();
      renderComboPage();
    } catch (e) {
      showToast(e.message || '同步出错', true);
    } finally {
      syncBtn.disabled = false;
      syncBtn.textContent = '手动同步';
      refresh();
    }
  });
}

// 
function initScoutWorkbench() {
  if (typeof injectCreamuWorkbenchStyles === 'function') {
    injectCreamuWorkbenchStyles({
      styleId: 'scout-wb-style',
      extraCss: typeof getScoutThemeCss === 'function' ? getScoutThemeCss() : ''
    });
  }

  let fab = document.getElementById('jlc-wb-fab');
  if (!fab) {
    fab = document.createElement('div');
    fab.id = 'jlc-wb-fab';
    fab.innerHTML = '<span class="jlc-wb-fab-badge">0</span>🧭';
    document.body.appendChild(fab);
  }

  if (!isScoutNarrowViewport()) {
    const fabPos = GM_getValue('scout_fab_pos', null);
    if (fabPos && (fabPos.left != null || fabPos.top != null)) {
      fab.style.left = fabPos.left;
      fab.style.top = fabPos.top;
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
    }
  }
  clampScoutFabPosition(fab);
  dockMobileFabStack();
  if (!window.__scoutFabDockBound) {
    window.__scoutFabDockBound = true;
    window.addEventListener('resize', () => {
      clampScoutFabPosition(document.getElementById('jlc-wb-fab'));
      dockMobileFabStack();
    }, { passive: true });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        clampScoutFabPosition(document.getElementById('jlc-wb-fab'));
        dockMobileFabStack();
      }, 120);
    }, { passive: true });
  }

  let wb = document.getElementById('jlc-wb');
  if (!wb) {
    wb = document.createElement('div');
    wb.id = 'jlc-wb';
    wb.innerHTML = `
      <div class="jlc-wb-resize-w"></div>
      <div class="jlc-wb-resize-h"></div>
      <div class="jlc-wb-resize-corner"></div>

      <div class="jlc-wb-header">
        <div>
          <div class="jlc-wb-title">Creamu · Scout</div>
          <div class="jlc-wb-subtitle">欧美发现工作台 v${SCOUT_VERSION}</div>
        </div>
        <div class="jlc-wb-header-actions">
          <button type="button" class="jlc-wb-icon-btn" id="scout-wb-settings-btn" title="设置">⚙</button>
          <button type="button" class="jlc-wb-icon-btn" id="scout-wb-close-btn" title="最小化">✕</button>
        </div>
      </div>

      <div class="jlc-wb-nav">
        <button class="active" data-tab="combo">组合</button>
        <button data-tab="lexicon">词库</button>
        <button data-tab="works">作品</button>
        <button data-tab="publishers">熟人</button>
        <button data-tab="tracks">追更</button>
        <button data-tab="blocks">屏蔽</button>
      </div>

      <div class="jlc-wb-body">
        <div data-jlc-wb-page="combo"></div>
        <div data-jlc-wb-page="lexicon" hidden></div>
        <div data-jlc-wb-page="works" hidden></div>
        <div data-jlc-wb-page="publishers" hidden></div>
        <div data-jlc-wb-page="tracks" hidden></div>
        <div data-jlc-wb-page="blocks" hidden></div>
      </div>

      <div class="jlc-wb-settings" id="jlc-wb-settings">
        <div class="jlc-wb-settings-panel">
          <div class="jlc-wb-settings-head">
            <strong>设置</strong>
            <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-settings-close" title="关闭">×</button>
          </div>
          <div class="jlc-wb-settings-nav" id="scout-settings-nav">
            <button type="button" data-scout-settings-tab="overview" class="active">概况</button>
            <button type="button" data-scout-settings-tab="ui">界面</button>
            <button type="button" data-scout-settings-tab="backup">备份</button>
            <button type="button" data-scout-settings-tab="sync">同步</button>
          </div>
          <div class="jlc-wb-settings-body" id="scout-settings-body"></div>
        </div>
      </div>
    `;
    document.body.appendChild(wb);
  }

  // 预写入合法几何，避免 PC 端 top:auto 开在视口外
  applyScoutWorkbenchGeometry(wb);

  makeDraggable(fab, true);
  makeHeaderDraggable(wb, wb.querySelector('.jlc-wb-header'));
  makeResizable(wb);

  function triggerTab(tabName) {
    wb.querySelectorAll('.jlc-wb-nav button').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    wb.querySelectorAll('[data-jlc-wb-page]').forEach(page => {
      if (page.getAttribute('data-jlc-wb-page') === tabName) {
        page.removeAttribute('hidden');
      } else {
        page.setAttribute('hidden', '');
      }
    });

    if (tabName === 'combo') renderComboPage();
    else if (tabName === 'lexicon') renderLexiconPage();
    else if (tabName === 'works') renderWorksPage();
    else if (tabName === 'publishers') renderPublishersPage();
    else if (tabName === 'tracks') renderTracksPage();
    else if (tabName === 'blocks') renderBlocksPage();
  }

  function openScoutWorkbench(tabName) {
    applyScoutWorkbenchGeometry(wb);
    wb.classList.add('is-open');
    // PC 端不要锁 body 滚动：部分站点会因此产生遮罩/焦点异常，表现为“点了没开”
    if (window.matchMedia && window.matchMedia('(max-width: 820px)').matches) {
      document.body.style.overflow = 'hidden';
    }
    const tab = tabName || (wb.querySelector('.jlc-wb-nav button.active')?.getAttribute('data-tab')) || 'combo';
    triggerTab(tab);
  }

  function closeScoutWorkbench() {
    setScoutSettingsOpen(false);
    wb.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  if (fab.dataset.scoutClickBound !== '1') {
    fab.dataset.scoutClickBound = '1';
    fab.addEventListener('click', (e) => {
      if (fab.dataset.suppressClick === '1' || fab.classList.contains('is-dragging')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (wb.classList.contains('is-open')) {
        closeScoutWorkbench();
      } else {
        openScoutWorkbench();
      }
    });
  }

  const closeBtn = wb.querySelector('#scout-wb-close-btn');
  if (closeBtn && closeBtn.dataset.scoutBound !== '1') {
    closeBtn.dataset.scoutBound = '1';
    closeBtn.addEventListener('click', () => closeScoutWorkbench());
  }

  const settingsBtn = wb.querySelector('#scout-wb-settings-btn');
  if (settingsBtn && settingsBtn.dataset.scoutBound !== '1') {
    settingsBtn.dataset.scoutBound = '1';
    settingsBtn.addEventListener('click', () => {
      const drawer = wb.querySelector('#jlc-wb-settings');
      const open = !(drawer && drawer.classList.contains('is-open'));
      setScoutSettingsOpen(open);
    });
  }

  const settingsClose = wb.querySelector('#jlc-wb-settings-close');
  if (settingsClose && settingsClose.dataset.scoutBound !== '1') {
    settingsClose.dataset.scoutBound = '1';
    settingsClose.addEventListener('click', () => setScoutSettingsOpen(false));
  }

  const settingsMask = wb.querySelector('#jlc-wb-settings');
  if (settingsMask && settingsMask.dataset.scoutMaskBound !== '1') {
    settingsMask.dataset.scoutMaskBound = '1';
    settingsMask.addEventListener('click', (e) => {
      if (e.target === settingsMask) setScoutSettingsOpen(false);
    });
  }

  if (wb.dataset.scoutNavBound !== '1') {
    wb.dataset.scoutNavBound = '1';
    wb.querySelectorAll('.jlc-wb-nav button').forEach(btn => {
      btn.addEventListener('click', () => {
        setScoutSettingsOpen(false);
        triggerTab(btn.getAttribute('data-tab'));
      });
    });
  }

  if (wb.dataset.scoutSettingsNavBound !== '1') {
    wb.dataset.scoutSettingsNavBound = '1';
    wb.querySelectorAll('[data-scout-settings-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-scout-settings-tab') || 'overview';
        wb.querySelectorAll('[data-scout-settings-tab]').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-scout-settings-tab') === tab);
        });
        renderScoutSettingsSection(tab);
      });
    });
  }

  if (!window.__creamuScoutWbResizeBound) {
    window.__creamuScoutWbResizeBound = true;
    window.addEventListener('resize', () => {
      clampScoutFabPosition(fab);
      if (wb.classList.contains('is-open')) {
        applyScoutWorkbenchGeometry(wb);
      }
    }, { passive: true });
  }

  renderComboPage();
}
// 40-boot.js

function findBreakpointVideoElement(track) {
  const els = getVideoElements();
  const target = track && track.last_seen_item;
  if (!target) return null;
  for (const el of els) {
    const meta = parseVideoElement(el);
    if (!meta || !meta.url) continue;
    const videoId = videoIdFromUrl(meta.url);
    const match =
      typeof videoIdsMatch === 'function'
        ? videoIdsMatch(videoId, target)
        : videoId && videoId === target;
    if (match) return el;
  }
  return null;
}

/**
 * 列表点击 → 写追更断点（与 JLC last_seen 类似）。
 * 在搜索页始终绑定；是否写入取决于当前 URL 能否匹配收藏 track。
 */
function setupSearchClickTracking() {
  if (window.__creamuScoutClickTrackBound) return;
  window.__creamuScoutClickTrackBound = true;

  const markBreakpointFromEvent = (e) => {
    const site = detectSite();
    if (!site) return;
    if (detectPageKind() !== 'search') return;

    const videoEl = e.target.closest(
      '.mozaique .thumb-block, .mozaique [id^="video_"], .video-block, ' +
        '#videos-list .post, .post, .post-container, ' +
        '#vidresults .mb, .mb[data-id], div.mb'
    );
    if (!videoEl) return;

    const meta = parseVideoElement(videoEl);
    if (!meta || !meta.url) return;

    const searchCtx = parseSearchContext();
    if (!searchCtx.query) return;

    const matchedTrack =
      typeof findTrackBySiteQuery === 'function'
        ? findTrackBySiteQuery(site, searchCtx.query)
        : null;
    if (!matchedTrack) return;

    const videoId = videoIdFromUrl(meta.url);
    const currentPage = parseListPage(site);

    updateTrack(matchedTrack.id, {
      last_seen_item: videoId,
      last_seen_page: currentPage,
      url: searchCtx.url || matchedTrack.url,
      updated_at: new Date().toISOString()
    });

    markVideoClicked({
      site,
      videoId,
      title: meta.title,
      url: meta.url,
      thumb: meta.thumb,
      uploader: meta.uploader
    });
  };

  // 捕获阶段：新标签打开（preventDefault）前也能记断点；中键 auxclick 一并覆盖
  document.body.addEventListener('click', markBreakpointFromEvent, true);
  document.body.addEventListener('auxclick', markBreakpointFromEvent, true);
  document.body.addEventListener('pointerdown', markBreakpointFromEvent, true);
}

function showTrackingPagebar(track, targetEl) {
  let bar = document.getElementById('jlc-tracking-pagebar');
  if (bar) return;

  bar = document.createElement('div');
  bar.id = 'jlc-tracking-pagebar';
  bar.className = 'jlc-wb-pagebar';
  // 单行矮条：少占高度（PC/手机同一套）
  bar.style.cssText =
    'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:999999;' +
    'width:min(420px,94vw);display:flex;align-items:center;gap:8px;' +
    'padding:5px 8px 5px 10px;border-radius:999px;box-sizing:border-box;' +
    'background:rgba(18,20,28,.92);border:1px solid rgba(255,255,255,.12);' +
    'box-shadow:0 4px 14px rgba(0,0,0,.28);color:#e8eaef;font-size:12px;';

  let hint = '';
  let buttonText = '';
  let actionFn = null;
  const label = escapeHtml(track.label || '');
  const page = track.last_seen_page || 1;

  if (targetEl) {
    hint = `本页有断点 · p${page}`;
    buttonText = '定位';
    actionFn = () => {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetEl.classList.add('scout-breakpoint-highlight');
      setTimeout(() => {
        targetEl.classList.remove('scout-breakpoint-highlight');
      }, 5000);
      bar.remove();
    };
  } else {
    hint = `上次 p${page}`;
    buttonText = '续看';
    const targetUrl = applyListPageToUrl(track.url, track.site, track.last_seen_page);
    actionFn = () => {
      location.href = targetUrl;
    };
  }

  bar.innerHTML = `
    <span class="jlc-tracking-pagebar-text" title="${label}" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:650;">
      ⭐ ${label} · ${hint}
    </span>
    <button type="button" class="jlc-bp-continue" id="scout-bp-jump-btn"
      style="flex:0 0 auto;padding:3px 10px;font-size:11.5px;border-radius:999px;cursor:pointer;border:0;background:var(--scout-accent,#5b8def);color:#fff;font-weight:650;">${buttonText}</button>
    <button type="button" id="scout-bp-close-bar-btn"
      style="flex:0 0 auto;padding:3px 8px;font-size:11.5px;border-radius:999px;cursor:pointer;background:transparent;border:1px solid rgba(255,255,255,.2);color:#c8cdd8;">忽略</button>
  `;

  document.body.appendChild(bar);

  bar.querySelector('#scout-bp-jump-btn').addEventListener('click', actionFn);
  bar.querySelector('#scout-bp-close-bar-btn').addEventListener('click', () => {
    bar.remove();
  });
}

function checkSearchTrackingBreakpoints() {
  const site = detectSite();
  if (!site) return;
  const kind = detectPageKind();
  if (kind !== 'search') return;

  // 搜索页始终挂断点监听（收藏可后发生）
  setupSearchClickTracking();

  const searchCtx = parseSearchContext();
  if (!searchCtx.query) return;

  const matchedTrack =
    typeof findTrackBySiteQuery === 'function'
      ? findTrackBySiteQuery(site, searchCtx.query)
      : null;
  if (!matchedTrack) return;

  const currentPage = parseListPage(site);
  const lastPage = Number(matchedTrack.last_seen_page) || 1;

  if (matchedTrack.last_seen_item && currentPage === lastPage) {
    setTimeout(() => {
      const foundEl = findBreakpointVideoElement(matchedTrack);
      if (foundEl) {
        showTrackingPagebar(matchedTrack, foundEl);
      } else if (lastPage > 1) {
        // 本页未找到该片，仍提示可跳页
        showTrackingPagebar(matchedTrack, null);
      }
    }, 800);
  } else if (lastPage > 1 && currentPage !== lastPage) {
    // 不在断点页（含从首页回来）→ 提示继续
    showTrackingPagebar(matchedTrack, null);
  }
}

// ----------------------------------------
// 列表预览：点缩略图播预览，再点一次进详情（xvideos/xnxx 的 data-pvv；eporner 不做预览）
let __scoutPreviewVideo = null;
let __scoutPreviewHost = null;
let __scoutPreviewTimer = null;

function isScoutMobileListViewport() {
  try {
    if (window.matchMedia && window.matchMedia('(max-width: 820px)').matches) return true;
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) return true;
  } catch (_) { /* ignore */ }
  return window.innerWidth <= 820;
}

function stopListPreview() {
  if (__scoutPreviewTimer) {
    clearInterval(__scoutPreviewTimer);
    __scoutPreviewTimer = null;
  }
  if (__scoutPreviewVideo) {
    try {
      const layer = __scoutPreviewVideo.closest('.scout-list-preview-layer');
      __scoutPreviewVideo.pause();
      __scoutPreviewVideo.removeAttribute('src');
      __scoutPreviewVideo.load();
      if (layer) layer.remove();
      else __scoutPreviewVideo.remove();
    } catch (_) { /* ignore */ }
    __scoutPreviewVideo = null;
  }
  if (__scoutPreviewHost) {
    __scoutPreviewHost.classList.remove('scout-preview-playing');
    __scoutPreviewHost.querySelectorAll('img[data-scout-orig-src]').forEach((img) => {
      if (img.dataset.scoutOrigSrc) img.src = img.dataset.scoutOrigSrc;
    });
    const img = __scoutPreviewHost.querySelector('img');
    if (img && img.dataset.scoutOrigSrc) img.src = img.dataset.scoutOrigSrc;
    __scoutPreviewHost = null;
  }
  document.querySelectorAll('.scout-preview-playing').forEach((el) => {
    el.classList.remove('scout-preview-playing');
  });
  document.querySelectorAll('.scout-list-preview-layer').forEach((el) => el.remove());
}

/** 列表预览地址：仅站内 data-pvv 等；不用 gvideo（黑屏且撑布局） */
function getListPreviewUrl(img) {
  if (!img) return '';
  return (
    img.getAttribute('data-pvv') ||
    img.getAttribute('data-spvv') ||
    img.getAttribute('data-preview') ||
    ''
  ).trim();
}

/** eporner 列表没有可用预览源（无 data-pvv，gvideo 黑屏，换帧会撑卡）→ 不做预览 */
function isEpornerListContext(el) {
  if (detectSite && detectSite() === 'eporner') return true;
  if (!el || !el.closest) return false;
  return !!el.closest('#vidresults, .mb[data-id], body.creamu-site-eporner');
}

function mountPreviewVideo(host, url) {
  // 用与缩略图同尺寸的覆盖层，避免撑大卡片
  const wrap = document.createElement('div');
  wrap.className = 'scout-list-preview-layer';
  const v = document.createElement('video');
  v.className = 'scout-list-preview-video';
  v.muted = true;
  v.defaultMuted = true;
  v.loop = true;
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.setAttribute('webkit-playsinline', '');
  v.setAttribute('muted', '');
  v.preload = 'metadata';
  v.setAttribute('aria-label', '列表预览');
  wrap.appendChild(v);
  host.appendChild(wrap);
  __scoutPreviewVideo = v;

  let failed = false;
  const fail = () => {
    if (failed) return;
    failed = true;
    try {
      wrap.remove();
    } catch (_) { /* ignore */ }
    if (__scoutPreviewVideo === v) __scoutPreviewVideo = null;
    stopListPreview();
  };
  v.addEventListener('error', fail);
  v.src = url;
  const p = v.play();
  if (p && typeof p.catch === 'function') p.catch(fail);
  setTimeout(() => {
    if (v && v.readyState < 2 && !failed) fail();
  }, 1800);
  return v;
}

function playListPreviewOnHost(host, img) {
  if (!host || !img) return false;

  // eporner：列表无可靠预览，直接放行（不拦截点击、不改 DOM）
  if (isEpornerListContext(img) || isEpornerListContext(host)) {
    return false;
  }

  // 已在本卡播放 → 交给外层去导航
  if (__scoutPreviewHost === host && host.classList.contains('scout-preview-playing')) {
    return false;
  }

  const pvv = getListPreviewUrl(img);
  if (!pvv) return false;

  stopListPreview();
  __scoutPreviewHost = host;
  host.classList.add('scout-preview-playing');

  // 仅在已有定位上下文时叠层；不强制改 eporner 式布局
  try {
    const cs = window.getComputedStyle(host);
    if (cs.position === 'static') host.style.position = 'relative';
  } catch (_) {
    host.style.position = 'relative';
  }

  mountPreviewVideo(host, pvv);
  return true;
}

function setupListPreviewPlayback() {
  if (window.__scoutListPreviewBound) return;
  window.__scoutListPreviewBound = true;

  let lastScrollY = window.scrollY || 0;

  // 点缩略图区域：先预览；再点同卡缩略图 → 放行进详情
  document.addEventListener(
    'click',
    (e) => {
      if (!isScoutMobileListViewport()) return;
      if (detectPageKind && detectPageKind() === 'video') return;
      if (e.target.closest('#jlc-wb, #jlc-wb-fab, #scout-search-track-bar')) return;

      // 标题/元信息区：不拦截
      if (e.target.closest('.thumb-under, .mbtit, p.title, .title, .mbunder, .mbstats, .uploader')) {
        return;
      }

      // eporner 列表无预览能力：完全不拦截
      if (isEpornerListContext(e.target)) return;

      // xvideos / xnxx 卡
      const card = e.target.closest('.thumb-block, .mozaique [id^="video_"]');
      const img =
        (e.target.tagName === 'IMG' ? e.target : null) ||
        (card && card.querySelector('.thumb img, .thumb-inside img, img'));
      if (!img) return;

      // 必须点在图区域
      const inThumb = e.target.closest('.thumb, .thumb-inside, a[href*="/video"]');
      if (!inThumb && e.target !== img) return;

      const a =
        img.closest('a[href*="/video"]') ||
        (card && card.querySelector('a[href*="/video"]'));
      if (!a) return;

      const host = img.closest('.thumb, .thumb-inside') || a || img.parentElement;
      if (!host) return;

      // 第二次点同一预览中的图 → 不拦截，进详情
      if (__scoutPreviewHost === host && host.classList.contains('scout-preview-playing')) {
        stopListPreview();
        return;
      }

      const ok = playListPreviewOnHost(host, img);
      if (ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  // 明显滚动才停预览（避免点按微抖立刻关掉）
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY || 0;
      if (Math.abs(y - lastScrollY) < 48) return;
      lastScrollY = y;
      if (__scoutPreviewHost || __scoutPreviewVideo) stopListPreview();
    },
    { passive: true, capture: true }
  );
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopListPreview();
  });
}

// ----------------------------------------
// 关闭站点列表自动预览（不影响 Creamu 点按预览）
// ----------------------------------------

function isSiteListPreviewHost(el) {
  if (!el || !el.closest) return false;
  return !!el.closest(
    '.thumb-block, .thumb, .thumb-inside, .mozaique, .video-block, ' +
      '.mb, .mbimg, .mbcontent, #vidresults, #videos-list .post, .post'
  );
}

function isMainDetailPlayerVideo(v) {
  if (!v || !v.closest) return false;
  return !!v.closest(
    '#html5video, #html5video_base, #video-player-bg, .video-player, ' +
      '#player, .x-video-player, [class*="player-container"]'
  );
}

/** 暂停列表里非 Creamu 的预览 video */
function pauseSiteListPreviewVideos() {
  if (typeof isBlockSiteAutoPreview === 'function' && !isBlockSiteAutoPreview()) return;
  if (typeof detectPageKind === 'function' && detectPageKind() === 'video') return;
  document.querySelectorAll('video').forEach((v) => {
    if (!v || v.classList.contains('scout-list-preview-video')) return;
    if (isMainDetailPlayerVideo(v)) return;
    if (!isSiteListPreviewHost(v) && !v.closest('.mozaique, #vidresults, #content')) return;
    try {
      v.autoplay = false;
      v.removeAttribute('autoplay');
      if (!v.paused) v.pause();
    } catch (_) { /* ignore */ }
  });
}

function setupBlockSiteAutoPreview() {
  if (window.__scoutBlockSitePreviewBound) return;
  window.__scoutBlockSitePreviewBound = true;

  const stopHoverPreview = (e) => {
    if (typeof isBlockSiteAutoPreview === 'function' && !isBlockSiteAutoPreview()) return;
    if (typeof detectPageKind === 'function' && detectPageKind() === 'video') return;
    if (e.target && e.target.closest && e.target.closest('#jlc-wb, #jlc-wb-fab, .scout-list-preview-layer')) {
      return;
    }
    if (!isSiteListPreviewHost(e.target)) return;
    e.stopPropagation();
  };
  ['mouseenter', 'mouseover', 'pointerenter', 'pointerover'].forEach((type) => {
    document.addEventListener(type, stopHoverPreview, true);
  });

  document.addEventListener(
    'play',
    (e) => {
      const v = e.target;
      if (!v || v.tagName !== 'VIDEO') return;
      if (v.classList.contains('scout-list-preview-video')) return;
      if (typeof isBlockSiteAutoPreview === 'function' && !isBlockSiteAutoPreview()) return;
      if (typeof detectPageKind === 'function' && detectPageKind() === 'video') return;
      if (isMainDetailPlayerVideo(v)) return;
      if (!isSiteListPreviewHost(v) && !v.closest('.mozaique, #vidresults')) return;
      try {
        v.pause();
      } catch (_) { /* ignore */ }
    },
    true
  );
}

// ----------------------------------------
// 详情 / 全屏：横向滑动调进度
// ----------------------------------------

function formatScoutSeekTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ':' + String(r).padStart(2, '0');
}

function findScoutDetailVideo() {
  const sels = [
    '#html5video video',
    '#html5video_base video',
    '#video-player-bg video',
    '.video-player video',
    '#player video',
    'video'
  ];
  for (const s of sels) {
    const v = document.querySelector(s);
    if (v && v.tagName === 'VIDEO') return v;
  }
  return null;
}

function getScoutFullscreenRoot() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null
  );
}

function showScoutSeekHud(text, mountRoot) {
  const root = mountRoot || document.documentElement;
  let el = document.getElementById('scout-seek-hud');
  if (!el) {
    el = document.createElement('div');
    el.id = 'scout-seek-hud';
    el.style.cssText =
      'position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:2147483646;' +
      'padding:10px 16px;border-radius:12px;background:rgba(0,0,0,.72);color:#fff;' +
      'font-size:16px;font-weight:700;pointer-events:none;white-space:nowrap;' +
      'box-shadow:0 6px 20px rgba(0,0,0,.35);display:none;';
  }
  if (el.parentNode !== root) {
    try {
      root.appendChild(el);
    } catch (_) {
      document.documentElement.appendChild(el);
    }
  }
  el.textContent = text;
  el.style.display = 'block';
  el.classList.add('is-on');
  if (el._scoutHideTimer) clearTimeout(el._scoutHideTimer);
  el._scoutHideTimer = setTimeout(() => {
    el.style.display = 'none';
    el.classList.remove('is-on');
  }, 700);
}

function setupVideoSeekGesture() {
  if (window.__scoutSeekGestureBound) return;
  window.__scoutSeekGestureBound = true;

  let tracking = false;
  let axisLocked = '';
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let video = null;
  let moved = false;

  const reset = () => {
    tracking = false;
    axisLocked = '';
    video = null;
    moved = false;
  };

  const onStart = (e) => {
    if (typeof detectPageKind === 'function' && detectPageKind() !== 'video') return;
    if (!e.touches || e.touches.length !== 1) return;
    const fs = getScoutFullscreenRoot();
    if (!fs) return;
    const v = findScoutDetailVideo();
    if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return;
    const target = e.target;
    if (!fs.contains(target) && target !== fs) return;
    const t = e.touches[0];
    tracking = true;
    axisLocked = '';
    moved = false;
    startX = t.clientX;
    startY = t.clientY;
    startTime = v.currentTime || 0;
    video = v;
  };

  const onMove = (e) => {
    if (!tracking || !video || !e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (!axisLocked) {
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      axisLocked = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      if (axisLocked === 'v') {
        reset();
        return;
      }
    }
    if (axisLocked !== 'h') return;
    e.preventDefault();
    moved = true;
    const w = Math.max(window.innerWidth || 320, 320);
    const span = Math.min(90, Math.max(30, (video.duration || 90) * 0.25));
    const delta = (dx / w) * span;
    let next = startTime + delta;
    next = Math.max(0, Math.min(video.duration - 0.25, next));
    const sign = delta >= 0 ? '+' : '−';
    const abs = formatScoutSeekTime(Math.abs(delta));
    const fs = getScoutFullscreenRoot() || document.documentElement;
    showScoutSeekHud(
      sign + abs + ' → ' + formatScoutSeekTime(next) + ' / ' + formatScoutSeekTime(video.duration),
      fs
    );
    try {
      video.currentTime = next;
    } catch (_) { /* ignore */ }
  };

  const onEnd = () => {
    if (tracking && moved && video && typeof showToast === 'function') {
      try {
        showToast('进度 ' + formatScoutSeekTime(video.currentTime));
      } catch (_) { /* ignore */ }
    }
    reset();
  };

  document.addEventListener('touchstart', onStart, { passive: true, capture: true });
  document.addEventListener('touchmove', onMove, { passive: false, capture: true });
  document.addEventListener('touchend', onEnd, { passive: true, capture: true });
  document.addEventListener('touchcancel', onEnd, { passive: true, capture: true });
}

// ----------------------------------------
// Page lifecycle: MutationObserver + history
// ----------------------------------------
let __scoutEnhancing = false;
let __scoutRefreshTimer = null;
let __scoutLastHref = '';
let __scoutLastKind = '';

function refreshPageEnhancements(reason) {
  if (__scoutEnhancing) return;
  __scoutEnhancing = true;
  try {
    const site = detectSite();
    if (site) {
      // 站点 class 只加不乱删其它 creamu-site-*
      if (!document.body.classList.contains('creamu-site-' + site)) {
        ['xvideos', 'xnxx', 'eporner'].forEach(s => document.body.classList.remove('creamu-site-' + s));
        document.body.classList.add('creamu-site-' + site);
      }
    }

    const href = location.href;
    const kind = detectPageKind();
    const navigated = href !== __scoutLastHref || kind !== __scoutLastKind;
    __scoutLastHref = href;
    __scoutLastKind = kind;

    if (kind === 'video') {
      markCurrentVideoPageClicked();
      enhancePageTags();
      enhancePagePublisher();
    } else if (kind === 'search') {
      applyListBlocks(); // 内含已点 + 词库列表流
      // 再显式刷一次列表词库流（防止 applyListBlocks 中途 return/抛错漏掉）
      if (typeof enhanceListLexiconHitFlows === 'function') {
        try { enhanceListLexiconHitFlows(); } catch (e) { console.warn(e); }
      }
      // 搜索页顶栏：订阅/取消追更（不依赖打开工作台）
      if (typeof enhanceSearchTrackSubscribe === 'function') {
        try { enhanceSearchTrackSubscribe(); } catch (e) { console.warn(e); }
      }
      if (typeof setupListPreviewPlayback === 'function') {
        try { setupListPreviewPlayback(); } catch (e) { console.warn(e); }
      }
      if (navigated || reason === 'boot') {
        checkSearchTrackingBreakpoints();
      }
      pauseSiteListPreviewVideos();
    } else {
      // 首页/分类等列表页
      applyClickedEnhancements();
      if (typeof enhanceListLexiconHitFlows === 'function') {
        try { enhanceListLexiconHitFlows(); } catch (e) { console.warn(e); }
      }
      if (typeof setupListPreviewPlayback === 'function') {
        try { setupListPreviewPlayback(); } catch (e) { console.warn(e); }
      }
      document.getElementById('scout-search-track-bar')?.remove();
      pauseSiteListPreviewVideos();
    }

    if (kind === 'video') {
      document.getElementById('scout-search-track-bar')?.remove();
      if (typeof stopListPreview === 'function') stopListPreview();
    }
  } catch (err) {
    console.warn('[Creamu Scout] refresh failed:', reason, err);
  } finally {
    __scoutEnhancing = false;
  }
}

function schedulePageRefresh(reason) {
  if (__scoutEnhancing) return;
  if (window.__scoutUiMutating) return;
  if (__scoutRefreshTimer) clearTimeout(__scoutRefreshTimer);
  __scoutRefreshTimer = setTimeout(() => {
    __scoutRefreshTimer = null;
    refreshPageEnhancements(reason || 'debounced');
  }, 280);
}

/** 是否我们自己的 UI 节点（改这些不应再触发全页增强） */
function isScoutUiNode(node) {
  if (!node || node.nodeType !== 1) return false;
  if (
    node.id === 'scout-lex-hit-bar' ||
    node.id === 'scout-work-fav-bar' ||
    node.id === 'scout-search-track-bar' ||
    node.id === 'scout-tags-toggle' ||
    node.id === 'scout-desc-toggle' ||
    node.id === 'jlc-tracking-pagebar' ||
    node.id === 'jlc-wb' ||
    node.id === 'jlc-wb-fab'
  ) {
    return true;
  }
  if (node.classList && (
    node.classList.contains('scout-lex-flow-card') ||
    node.classList.contains('scout-lex-flow-overlay') ||
    node.classList.contains('scout-lex-hit-bar') ||
    node.classList.contains('scout-tag-addon') ||
    node.classList.contains('scout-tag-heart') ||
    node.classList.contains('scout-pub-addon') ||
    node.classList.contains('scout-pub-badge') ||
    node.classList.contains('scout-visited-item') ||
    node.classList.contains('scout-list-preview-video') ||
    node.classList.contains('scout-preview-playing')
  )) {
    return true;
  }
  if (node.id === 'scout-seek-hud') return true;
  return !!(node.closest && node.closest(
    '#scout-lex-hit-bar, #scout-work-fav-bar, #jlc-wb, #jlc-wb-fab, #scout-seek-hud, .scout-lex-flow-overlay, .scout-tag-addon, .scout-pub-addon, .scout-list-preview-video'
  ));
}

function setupScoutPageLifecycle() {
  if (window.__creamuScoutLifecycleBound) return;
  window.__creamuScoutLifecycleBound = true;

  // DOM 变更：列表懒加载 / 局部刷新（忽略我们自己的 UI，防详情页词库条死循环跳动）
  try {
    const obs = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        const nodes = [];
        if (m.target) nodes.push(m.target);
        if (m.addedNodes && m.addedNodes.length) {
          m.addedNodes.forEach((n) => nodes.push(n));
        }
        if (m.removedNodes && m.removedNodes.length) {
          m.removedNodes.forEach((n) => nodes.push(n));
        }
        // 任意非 scout 节点变化才刷新
        if (nodes.some((n) => n && !isScoutUiNode(n))) {
          schedulePageRefresh('mutation');
          return;
        }
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {
    console.warn('[Creamu Scout] MutationObserver unavailable', e);
  }

  // SPA / 站内 pushState 翻页
  if (!window.__creamuScoutHistoryHooked) {
    window.__creamuScoutHistoryHooked = true;
    const wrap = (type) => {
      const orig = history[type];
      if (typeof orig !== 'function') return;
      history[type] = function () {
        const ret = orig.apply(this, arguments);
        schedulePageRefresh('history:' + type);
        return ret;
      };
    };
    wrap('pushState');
    wrap('replaceState');
    window.addEventListener('popstate', () => schedulePageRefresh('popstate'));
    window.addEventListener('hashchange', () => schedulePageRefresh('hashchange'));
  }

  // 兜底：极低频轮询（站点偶发不触发 mutation）
  setInterval(() => {
    if (location.href !== __scoutLastHref) {
      refreshPageEnhancements('href-poll');
    } else {
      const kind = detectPageKind();
      if (kind === 'search') applyListBlocks();
      else if (kind === 'video') {
        enhancePageTags();
        enhancePagePublisher();
      }
    }
  }, 8000);
}

function bootCreamuScout() {
  const currentSite = detectSite();
  if (currentSite) {
    document.body.classList.add(`creamu-site-${currentSite}`);
  }

  initScoutWebDav();
  initScoutWorkbench();
  if (typeof setupSearchClickTracking === 'function') {
    try { setupSearchClickTracking(); } catch (_) { /* ignore */ }
  }
  if (typeof applyScoutSiteTheme === 'function') {
    try { applyScoutSiteTheme(); } catch (_) { /* ignore */ }
  }
  // 启动纠正：屏蔽词踢出词库、合并历史重复
  if (typeof purgeBlockedTermsFromLexicon === 'function') {
    try { purgeBlockedTermsFromLexicon(); } catch (_) { /* ignore */ }
  }
  if (typeof dedupeLexiconTermsStore === 'function') {
    try { dedupeLexiconTermsStore(); } catch (_) { /* ignore */ }
  }
  if (typeof dedupeBlockListStore === 'function') {
    try { dedupeBlockListStore(); } catch (_) { /* ignore */ }
  }
  setupScoutPageLifecycle();
  if (typeof setupBlockSiteAutoPreview === 'function') {
    try { setupBlockSiteAutoPreview(); } catch (_) { /* ignore */ }
  }
  if (typeof setupVideoSeekGesture === 'function') {
    try { setupVideoSeekGesture(); } catch (_) { /* ignore */ }
  }
  refreshPageEnhancements('boot');
  if (typeof applyVideoOpenMode === 'function') {
    try { applyVideoOpenMode(); } catch (_) { /* ignore */ }
  }

  if (scoutSync) {
    scoutSync.bootSync().catch((err) => {
      console.warn('[Creamu Scout] Sync on boot failed:', err);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootCreamuScout);
} else {
  bootCreamuScout();
}

})();
