// 16-data-portability.js

// 导入导出（完整包含 tracks/clicks/works；lex 合包仅 terms+blocks）
function exportLexiconPackage() {
  const pkg = {
    format: "creamu-scout-lexicon",
    version: 4,
    exported_at: new Date().toISOString(),
    site_hint: "xvideos|xnxx|eporner|mixed",
    types: getLexiconTypes(),
    terms: getLexiconTerms(),
    blocks: getBlockList(),
    publishers: getPublishers(),
    tracks: getTracks(),
    clicks: getClickedList(),
    works: getWorks(),
    search_draft: typeof getScoutSearchDraft === 'function' ? getScoutSearchDraft() : null,
    search_relations: typeof getScoutSearchRelations === 'function'
      ? getScoutSearchRelations()
      : []
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
          aliases: newT.aliases || [],
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
        aliases: Array.isArray(newT.aliases) ? newT.aliases : (old.aliases || []),
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
        aliases: newT.aliases || [],
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
            aliases: newT.aliases || [],
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
          if (newT.recipe) existing.recipe = newT.recipe;
          if (newT.recipe_id) existing.recipe_id = String(newT.recipe_id);
          if (newT.recipe_fingerprint) existing.recipe_fingerprint = String(newT.recipe_fingerprint);
          if (Array.isArray(newT.probe_queries)) existing.probe_queries = newT.probe_queries.slice();
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
            recipe: newT.recipe || null,
            recipe_id: String(newT.recipe_id || ''),
            recipe_fingerprint: String(newT.recipe_fingerprint || ''),
            probe_queries: Array.isArray(newT.probe_queries) ? newT.probe_queries.slice() : [],
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

    if (pkg.search_draft && typeof saveScoutSearchDraft === 'function') {
      saveScoutSearchDraft(pkg.search_draft);
    }
    if (
      Array.isArray(pkg.search_relations) &&
      typeof mergeScoutSearchRelations === 'function'
    ) {
      mergeScoutSearchRelations(pkg.search_relations);
    }

    triggerWebDavDirty();
    return true;
  } catch(e) {
    showToast(e.message || '导入解析失败', true);
    return false;
  }
}
