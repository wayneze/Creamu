  const CENSOR_ALIASES = {
    uncensored: [
      '無修正',
      '无修正',
      '无码',
      '無碼',
      '无码',
      'uncensored',
      'decensored',
      '無修正版',
    ],
    light: ['条纹', '條紋', '薄码', '薄碼', 'mosaic lite', 'light mosaic', 'ハケ消し'],
    heavy: ['厚码', '厚碼', 'heavy mosaic', 'モザイク', '有码', '有碼'],
  };

  const LANG_PATTERNS = [
    { id: 'zh', re: /chinese|中国語|漢化|汉化|中文|中国翻訳|中國翻譯|zh[-_]?cn|zh[-_]?tw|ce\b/i },
    { id: 'ja', re: /japanese|日本語|日語|日语|\bja\b/i },
    { id: 'en', re: /english|英語|英语|\ben\b/i },
    { id: 'ko', re: /korean|한국어|韓語|韩语|\bko\b/i },
    { id: 'ru', re: /russian|русский|\bru\b/i },
    { id: 'es', re: /spanish|español|\bes\b/i },
    { id: 'fr', re: /french|français|\bfr\b/i },
    { id: 'pt', re: /portuguese|português|\bpt\b/i },
  ];

  function normalizeNamespaceTag(tag) {
    const t = compactText(tag).toLowerCase();
    if (!t) return '';
    return t.replace(/^"+|"+$/g, '');
  }

  function stripTitleDecorations(title) {
    let s = String(title || '');
    // remove nested-ish bracket groups iteratively
    for (let i = 0; i < 8; i++) {
      const next = s
        .replace(/\[[^\[\]]*\]/g, ' ')
        .replace(/\([^\(\)]*\)/g, ' ')
        .replace(/\{[^\{\}]*\}/g, ' ')
        .replace(/【[^】]*】/g, ' ')
        .replace(/（[^）]*）/g, ' ');
      if (next === s) break;
      s = next;
    }
    s = s
      .replace(/[～〜~]/g, ' ')
      .replace(/[|｜]/g, ' ')
      .replace(/[^\S\n]+/g, ' ')
      .trim();
    return s;
  }

  function buildTitleCore(title) {
    let core = stripTitleDecorations(title);
    core = core
      .replace(/\b(chinese|english|japanese|korean|digital|fakku|dl版|コミック)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return core;
  }

  function detectLanguageFromText(text, tags) {
    const bag = [String(text || ''), ...(tags || []).map(String)].join(' | ');
    for (const item of LANG_PATTERNS) {
      if (item.re.test(bag)) return item.id;
    }
    // language:chinese style tags
    const langTag = (tags || []).map(normalizeNamespaceTag).find((t) => t.startsWith('language:'));
    if (langTag) {
      const v = langTag.slice('language:'.length);
      for (const item of LANG_PATTERNS) {
        if (item.re.test(v)) return item.id;
      }
      if (v) return v.slice(0, 12);
    }
    return 'other';
  }

  function detectCensorTier(title, tags) {
    const tagList = (tags || []).map(String);
    // 优先 namespace 标签（LRR/EH 常见 other:uncensored）
    for (const raw of tagList) {
      const t = normalizeNamespaceTag(raw);
      if (!t) continue;
      const val = t.includes(':') ? t.slice(t.indexOf(':') + 1) : t;
      if (
        t === 'other:uncensored' ||
        t === 'other:decensored' ||
        val === 'uncensored' ||
        val === 'decensored' ||
        /無修正|无修正|无码|無碼/.test(val)
      ) {
        return 'uncensored';
      }
      if (/条纹|薄码|thin.?mosaic|light.?mosaic|mosaic.?lite/.test(val) || t.includes('light mosaic')) {
        return 'light';
      }
      if (/厚码|heavy.?mosaic|有码|有碼/.test(val) && !/无码|無碼|uncensored/.test(val)) {
        return 'heavy';
      }
    }
    const bag = [String(title || ''), ...tagList].join(' ').toLowerCase();
    for (const [tier, aliases] of Object.entries(CENSOR_ALIASES)) {
      for (const a of aliases) {
        if (bag.includes(String(a).toLowerCase())) return tier;
      }
    }
    if (/uncensored|decensored|無修正|无码|無碼/.test(bag)) return 'uncensored';
    if (/条纹|薄码|thin.?mosaic|light.?mosaic/.test(bag)) return 'light';
    if (/厚码|heavy.?mosaic|有码/.test(bag)) return 'heavy';
    return 'unknown';
  }

  /** LRR 档案质量维：码级以档案自检优先，unknown 才参考绑定源 */
  function applyBoundEditionQualityToArchive(archive, boundEdition) {
    if (!archive) return archive;
    if (!boundEdition) return archive;
    const out = Object.assign({}, archive);
    const arcCensor = compactText(out.censor_tier || '') || 'unknown';
    const srcCensor = compactText(boundEdition.censor_tier || '') || 'unknown';
    // 语言：档案 other/空 → 可用源
    if (
      boundEdition.language &&
      (!out.language || out.language === 'other' || out.language === 'unknown')
    ) {
      out.language = boundEdition.language;
    }
    // 码级：绝不在档案已有明确码级时用源覆盖；unknown 才参考源（并标记来自源）
    if (arcCensor === 'unknown' && srcCensor && srcCensor !== 'unknown') {
      out.censor_tier = srcCensor;
      out.censor_from_eh_source = 1;
    } else {
      out.censor_from_eh_source = 0;
    }
    if (!out.group && boundEdition.group) out.group = boundEdition.group;
    out.eh_source_gid = boundEdition.gid ? String(boundEdition.gid) : out.eh_gid || '';
    out.quality_from_eh_source = 1;
    // 源画廊码级仅作备注，不强制等于包内
    out.source_censor_tier = srcCensor;
    return out;
  }

  function extractGroupFromTitle(title) {
    const m = String(title || '').match(/\[([^\]]+)\]/);
    if (!m) return '';
    const g = compactText(m[1]);
    // skip pure language / tech markers
    if (/^(chinese|english|japanese|digital|dl版|中国翻訳|中國翻譯)$/i.test(g)) return '';
    return g;
  }

  function extractGroupsFromTags(tags) {
    const out = [];
    const seen = new Set();
    for (const raw of tags || []) {
      let t = normalizeNamespaceTag(raw);
      // LRR 常见 artist_xxx / group_xxx 下划线写法
      t = t.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
      // 兼容 "group: name" / "circle:xxx" / "parody:xxx" 不当团体熟人
      let name = '';
      if (t.startsWith('group:')) name = t.slice(6);
      else if (t.startsWith('translator:')) name = t.slice(11);
      else if (t.startsWith('circle:')) name = t.slice(7);
      else if (/^groups?:/i.test(String(raw || ''))) {
        name = String(raw).replace(/^groups?:\s*/i, '');
      }
      name = compactText(name).replace(/_/g, ' ');
      if (!name || name.length < 2) continue;
      const k = name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(name);
    }
    return out;
  }

  function extractArtistsFromTags(tags) {
    const out = [];
    const seen = new Set();
    for (const raw of tags || []) {
      const rawS = String(raw || '').trim();
      let t = normalizeNamespaceTag(rawS);
      t = t.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
      let name = '';
      if (t.startsWith('artist:')) name = t.slice(7);
      else if (/^artists?:\s*/i.test(rawS)) name = rawS.replace(/^artists?:\s*/i, '');
      // LRR 有时用 "by: name"
      else if (/^by:\s*/i.test(rawS)) name = rawS.replace(/^by:\s*/i, '');
      name = compactText(name).replace(/_/g, ' ');
      if (!name || name.length < 2) continue;
      const k = name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(name);
    }
    return out;
  }

  /** 心动标签中英别名映射表 */
  const FAV_TAG_ALIASES = {
    巨乳: ['big breasts', 'huge breasts', 'gigantic breasts', '巨乳', '爆乳'],
    贫乳: ['small breasts', 'flat chest', '贫乳', '平胸'],
    丝袜: ['pantyhose', 'stockings', 'thighhighs', '丝袜', '黑丝', '裤袜'],
    人妻: ['milf', 'married', 'netorare', '人妻', '熟女'],
    熟女: ['milf', 'mature', '人妻', '熟女'],
    母: ['mother', 'milf', 'mama', 'mom', 'incest', '母', '母親', '母亲', '妈妈', '母女'],
    母女: ['mother', 'daughter', 'incest', '母女', '母'],
    姐妹: ['sister', 'sisters', 'incest', '姐妹', '姐姐', '妹妹'],
    乱伦: ['incest', '乱伦', '亂倫', '母', 'mother', 'sister', 'daughter'],
    出轨: ['cheating', 'netorare', '出轨', '偷情'],
    受精: ['impregnation', 'pregnant', '受精', '怀胎', '中出', '着床'],
    纯爱: ['pure love', '纯爱', '純愛'],
    催眠: ['mind control', 'hypnosis', '催眠', '洗脑'],
    恶堕: ['mind break', 'corruption', '恶堕', '堕落'],
    百合: ['yuri', 'gl', '百合'],
    扶她: ['futanari', 'futa', '扶她'],
    女仆: ['maid', '女仆', '女僕'],
    辣妹: ['gyaru', 'gal', '辣妹'],
    黑皮: ['dark skin', '黑皮'],
    潮吹: ['squirting', 'female ejaculation', '潮吹'],
    无码: ['uncensored', 'decensored', '无码', '無碼'],
    全彩: ['full color', 'full colour', '全彩'],
    后宫: ['harem', '后宫', '後宮'],
    露出: ['exhibitionism', 'public use', '露出'],
    凌辱: ['rape', 'forced', '凌辱', '强暴'],
  };

  /**
   * 将心动标签列表展开为包含全部中英同义别名的匹配集合
   */
  function expandFavTagAliases(favList) {
    const set = new Set();
    (favList || []).forEach((item) => {
      const raw = compactText(item).toLowerCase().trim();
      if (!raw) return;
      set.add(raw);
      const bare = raw.includes(':') ? raw.split(':').slice(1).join(':').trim() : raw;
      set.add(bare);

      // 双向检索别名映射
      Object.keys(FAV_TAG_ALIASES).forEach((k) => {
        const kl = k.toLowerCase();
        const arr = FAV_TAG_ALIASES[k] || [];
        const isMatch =
          kl === raw ||
          kl === bare ||
          arr.some((a) => a.toLowerCase() === raw || a.toLowerCase() === bare);
        if (isMatch) {
          set.add(kl);
          arr.forEach((a) => set.add(a.toLowerCase()));
        }
      });
    });
    return set;
  }

  /** 屏蔽标签中英别名映射表 */
  const HATE_TAG_ALIASES = {
    男同: ['yaoi', 'male on male', 'bara'],
    耽美: ['yaoi', 'male on male', 'bara'],
    bl: ['yaoi', 'male on male', 'bara'],
    gay: ['yaoi', 'male on male', 'bara'],
    屎尿: ['scat', 'coprophagia'],
    食粪: ['coprophagia'],
    重口: ['scat', 'coprophagia', 'guro'],
    猎奇: ['guro', 'snuff', 'amputee', 'cannibalism'],
    兽交: ['bestiality'],
    异种: ['parasite', 'alien'],
  };

  /**
   * 将屏蔽标签列表展开为包含全部中英同义别名的匹配词列表
   */
  function expandHateTagAliases(hateList) {
    const needles = [];
    (hateList || []).forEach((item) => {
      const raw = compactText(item).toLowerCase().trim();
      if (!raw) return;
      if (!needles.includes(raw)) needles.push(raw);
      const bare = raw.includes(':') ? raw.split(':').slice(1).join(':').trim() : raw;
      if (bare && !needles.includes(bare)) needles.push(bare);

      Object.keys(HATE_TAG_ALIASES).forEach((k) => {
        const kl = k.toLowerCase();
        const arr = HATE_TAG_ALIASES[k] || [];
        const isMatch =
          kl === raw ||
          kl === bare ||
          arr.some((a) => a.toLowerCase() === raw || a.toLowerCase() === bare);
        if (isMatch) {
          if (!needles.includes(kl)) needles.push(kl);
          arr.forEach((a) => {
            const al = a.toLowerCase();
            if (!needles.includes(al)) needles.push(al);
          });
        }
      });
    });
    return needles;
  }

  function isCjkText(s) {
    return /[\u3040-\u30ff\u3400-\u9fff]/.test(String(s || ''));
  }

  /** 汉字 ≥1 字可匹配；英文 ≥2 */
  function favNeedleUsable(n) {
    const s = String(n || '');
    if (!s) return false;
    if (isCjkText(s)) return s.length >= 1;
    return s.length >= 2;
  }

  /** @returns {string[]} 命中的用户原文 */
  function matchFavTags(favList, tags, title) {
    const hits = [];
    const tagset = (tags || []).map((t) => normalizeNamespaceTag(t));
    const tagBag = tagset.join(' | ');
    const titleBag = compactText(title || '').toLowerCase();
    // 无空格标题，方便 mother / 母 等
    const titleCompact = titleBag.replace(/[\s_\-]+/g, '');
    const tagCompact = tagBag.replace(/[\s_\-]+/g, '');

    (favList || []).forEach((ft) => {
      const raw = compactText(ft);
      if (!raw) return;
      const h = normalizeNamespaceTag(raw);
      const bare = h.includes(':') ? h.split(':').slice(1).join(':') : h;
      const bareLow = bare.toLowerCase();
      const needles = [];
      const addNeedle = (x) => {
        const n = String(x || '').toLowerCase().trim();
        if (!favNeedleUsable(n)) return;
        if (needles.indexOf(n) < 0) needles.push(n);
      };
      addNeedle(bareLow);
      addNeedle(h);
      // 别名：键命中或别名值命中都整组扩开
      Object.keys(FAV_TAG_ALIASES).forEach((k) => {
        const kl = k.toLowerCase();
        const arr = FAV_TAG_ALIASES[k] || [];
        const keyHit = kl === bareLow || k === bare || kl === bare;
        const valHit = arr.some((a) => String(a).toLowerCase() === bareLow);
        if (keyHit || valHit) {
          addNeedle(k);
          arr.forEach(addNeedle);
        }
      });

      let hit = false;
      for (let i = 0; i < needles.length && !hit; i++) {
        const n = needles[i];
        const nCompact = n.replace(/[\s_\-]+/g, '');
        // 标签精确 / 后缀 / 包含
        if (
          tagset.some((t) => {
            if (!t) return false;
            if (t === h || t === n || t === bareLow) return true;
            if (t.endsWith(':' + n) || t.endsWith(':' + bareLow)) return true;
            // 单词边界：避免 "a" 乱配；汉字/≥3 英文可用 includes
            if (isCjkText(n) || n.length >= 3) {
              if (t.includes(n) || t.includes(bareLow)) return true;
            }
            return false;
          })
        ) {
          hit = true;
          break;
        }
        // 标题 / 标签串
        if (isCjkText(n) || n.length >= 3) {
          if (titleBag.includes(n) || tagBag.includes(n)) hit = true;
          else if (nCompact && (titleCompact.includes(nCompact) || tagCompact.includes(nCompact))) {
            hit = true;
          }
        } else if (n.length >= 2) {
          // 短英文：要求标签 namespace 形式或整词
          if (tagset.some((t) => t === n || t.endsWith(':' + n) || t === 'female:' + n || t === 'male:' + n)) {
            hit = true;
          } else if (new RegExp('(?:^|[^a-z0-9])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:[^a-z0-9]|$)', 'i').test(titleBag + ' ' + tagBag)) {
            hit = true;
          }
        }
      }
      if (hit) hits.push(raw);
    });
    return hits;
  }

  /** 人名归一：小写、下划线/点→空格、多空格合并；另给无空格键 */
  function normalizePersonKey(s) {
    return compactText(s)
      .toLowerCase()
      .replace(/[_\-・·．.／/]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function compactPersonKey(s) {
    return normalizePersonKey(s).replace(/\s+/g, '');
  }

  /**
   * 人名是否匹配（emori uki / emoriuki / Emori_Uki / 标题子串）
   */
  function personNameMatches(candidate, haystack) {
    const c = normalizePersonKey(candidate);
    const cc = compactPersonKey(candidate);
    if (!c || c.length < 2) return false;
    const h = normalizePersonKey(haystack);
    const hc = compactPersonKey(haystack);
    if (!h) return false;
    if (h === c || hc === cc) return true;
    if (h.includes(c) || hc.includes(cc)) return true;
    // 标题里是 "emoriuki"，熟人是 "emori uki"
    if (cc.length >= 4 && (hc.includes(cc) || h.replace(/\s+/g, '').includes(cc))) return true;
    // 熟人名拆开：姓/名都出现（至少 3 字母一段）
    const parts = c.split(' ').filter((p) => p.length >= 3);
    if (parts.length >= 2 && parts.every((p) => h.includes(p) || hc.includes(p))) return true;
    return false;
  }

  let ehSyringeDatabaseCache = null;
  let ehSyringeChecked = false;

  /**
   * 探测并只读连接本地 EhSyringe (E站翻译注射器) IndexedDB 数据库
   * 零网络请求，在内存中缓存 TagMap，查询耗时 0ms。
   */
  function buildEhSyringeCache(data) {
    if (!data || typeof data !== 'object') return null;
    const map = Object.create(null);
    if (Array.isArray(data.data)) {
      data.data.forEach((nsBlock) => {
        const ns = nsBlock && nsBlock.namespace ? String(nsBlock.namespace).toLowerCase() : '';
        const tagsObj = (nsBlock && nsBlock.data) || {};
        for (const [tagKey, tagVal] of Object.entries(tagsObj)) {
          const cnName =
            (tagVal && (typeof tagVal === 'string' ? tagVal : tagVal.name || tagVal.cn)) || '';
          if (!cnName) continue;
          const tLow = String(tagKey).toLowerCase();
          if (ns) map[ns + ':' + tLow] = cnName;
          if (!map[tLow]) map[tLow] = cnName;
        }
      });
      return map;
    }
    for (const [key, val] of Object.entries(data)) {
      if (!val) continue;
      const cnName = typeof val === 'string' ? val : val.name || val.cn || '';
      if (cnName) {
        map[String(key).toLowerCase()] = cnName;
      }
    }
    return map;
  }

  async function initEhSyringeBridge() {
    if (ehSyringeChecked) return ehSyringeDatabaseCache;
    ehSyringeChecked = true;
    try {
      if (typeof indexedDB === 'undefined') return null;
      const req = indexedDB.open('EhSyringe');
      const db = await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      if (!db.objectStoreNames.contains('keyval')) {
        db.close();
        return null;
      }
      const tx = db.transaction('keyval', 'readonly');
      const store = tx.objectStore('keyval');
      const getReq = store.get('database');
      const data = await new Promise((resolve) => {
        getReq.onsuccess = () => resolve(getReq.result);
        getReq.onerror = () => resolve(null);
      });
      db.close();
      if (data && typeof data === 'object') {
        ehSyringeDatabaseCache = buildEhSyringeCache(data);
      }
    } catch (_) {
      // ignore
    }
    return ehSyringeDatabaseCache;
  }

  /** 内置高频核心标签汉化表（覆盖高频形态、题材、角色属性与核心特征） */
  const BUILTIN_TAG_CN = {
    // 码级 / 形态 / 介质
    'uncensored': '无码',
    'decensored': '去码',
    'mosaic': '有码',
    'censored': '有码',
    'full censorship': '完全遮挡',
    'full color': '全彩',
    'full colour': '全彩',
    'anthology': '选集',
    'webtoon': '条漫',
    'cg set': 'CG包',
    '3d': '3D',

    // 核心关系 / 题材 / 身份
    'mother': '母',
    'milf': '熟女',
    'incest': '乱伦',
    'daughter': '女儿',
    'sister': '姐妹',
    'aunt': '阿姨',
    'cousin': '表亲',
    'stepmother': '继母',
    'dilf': '大叔',
    'father': '父亲',
    'brother': '兄弟',
    'teacher': '教师',
    'student': '学生',
    'hypnosis': '催眠',
    'mind break': '恶堕',
    'mind control': '洗脑',
    'netorare': 'NTR',
    'netori': '逆NTR',
    'cheating': '出轨',
    'pure love': '纯爱',
    'femdom': '女王',
    'maledom': '男支配',
    'crossdressing': '女装',
    'tomgirl': '伪娘',
    'tomboy': '假小子',
    'futanari': '扶她',
    'monster girl': '魔物娘',
    'dark skin': '黑皮',
    'glasses': '眼镜',
    'maid': '女仆',
    'schoolgirl uniform': '水手服',
    'sailor suit': '水手服',
    'swimsuit': '泳装',
    'bikini': '比基尼',
    'bunny girl': '兔女郎',
    'nurse': '护士',
    'cheerleader': '啦啦队',
    'miko': '巫女',
    'nun': '修女',
    'waitress': '女仆侍应',
    'gyaru': '辣妹',
    'yandere': '病娇',
    'tsundere': '傲娇',
    'kuudere': '三无',
    'twintails': '双马尾',
    'ponytail': '单马尾',
    'catgirl': '猫娘',
    'foxgirl': '狐娘',
    'elf': '精灵',
    'succubus': '魅魔',
    'vampire': '吸血鬼',
    'demon girl': '恶魔娘',
    'angel': '天使',
    'stockings': '长筒袜',
    'pantyhose': '连裤袜',
    'garter belt': '吊袜带',
    'bloomers': '灯笼裤',
    'leotard': '紧身衣',
    'bondage': '束缚',
    'bdsm': 'BDSM',
    'collar': '项圈',
    'blindfold': '蒙眼',
    'gag': '口塞',
    'spanking': '打屁股',
    'rape': '强暴',
    'blackmail': '胁迫',
    'corruption': '堕落',
    'drugs': '药物',
    'aphrodisiac': '春药',
    'exhibitionism': '露出',
    'voyeurism': '偷窥',
    'public use': '公用',
    'masturbation': '自慰',
    'yuri': '百合',
    'yaoi': '耽美',
    'shotacon': '正太',
    'lolicon': '萝莉',
    'gokkun': '精饮',
    'creampie': '中出',
    'bukkake': '颜射',
    'nakadashi': '体内射精',
    'defloration': '破处',
    'virginity': '处女',
    'big breasts': '巨乳',
    'huge breasts': '爆乳',
    'large breasts': '巨乳',
    'small breasts': '贫乳',
    'flat chest': '平胸',
    'lactation': '泌乳',
    'pregnant': '妊娠',
    'impregnation': '受精',
    'tall girl': '高挑',
    'sweating': '出汗',
    'squirting': '潮吹',
    'tentacles': '触手',
    'slime': '史莱姆',
    'parasite': '寄生',
    'sleeping': '睡眠奸',
    'drunk': '醉酒',
    'body swap': '身体交换',
    'gender bender': '性转换',
    'harem': '后宫',
    'double penetration': '双重穿透',
    'gangbang': '轮奸',
    'sole female': '单女',
    'sole male': '单男'
  };

  /**
   * 将标签翻译为地道中文：优先查 EhSyringe 本地缓存，次查内置核心字典，未命中返回原名
   */
  function translateTagCn(ns, name) {
    if (!name) return '';
    const nameLow = String(name).toLowerCase().trim();
    const fullKey = (ns ? ns.toLowerCase() + ':' : '') + nameLow;

    // 1) 优先查 EhSyringe 缓存
    if (ehSyringeDatabaseCache) {
      const match =
        ehSyringeDatabaseCache[fullKey] ||
        ehSyringeDatabaseCache[nameLow] ||
        ehSyringeDatabaseCache[name];
      if (match) {
        return typeof match === 'string' ? match : match.name || match.cn || name;
      }
    }

    // 2) 查内置高频字典
    if (BUILTIN_TAG_CN[nameLow]) return BUILTIN_TAG_CN[nameLow];
    if (BUILTIN_TAG_CN[fullKey]) return BUILTIN_TAG_CN[fullKey];

    // 3) 原名返回
    return name;
  }

  /**
   * 列表标签流：排除的命名空间集合
   * 社团/画师归属于熟人雷达徽章与标题；角色/原作已在封面与标题呈现；语言/杂项属于元数据。
   */
  const STREAM_EXCLUDED_NAMESPACES = new Set([
    'artist',
    'group',
    'translator',
    'circle',
    'character',
    'parody',
    'misc',
    'language',
  ]);

  /**
   * 默认过滤的通用低信息量噪声标签（泛动作、细微服饰配件与介质描述）
   */
  const STREAM_NOISE_TAGS = new Set([
    // 介质与非题材类
    'original', 'tankoubon', 'digital', 'anthology', 'webtoon',
    // 泛生理与常规动作
    'sole female', 'sole male', 'group', 'x-ray', 'anal', 'blowjob', 'handjob',
    'fingering', 'cunnilingus', 'nakadashi', 'creampie', 'bukkake', 'gokkun',
    'paizuri', 'deepthroat', 'fellatio', 'kissing', 'masturbation',
    'clothed female nude male', 'double penetration',
    // 泛身体表现与细微配件
    'sweating', 'saliva', 'navel', 'beauty mark', 'mole', 'hair buns',
    'very long hair', 'short hair', 'twintails', 'ponytail', 'muscular',
    'stomach deformation', 'gloves', 'collar', 'hair ornament', 'hair ribbon',
    'boots', 'shoes', 'socks', 'apron', 'ribbon', 'bandages', 'hairband',
    'choker', 'tiara', 'glasses',
    // 审查标记
    'mosaic censorship', 'full censorship', 'mosaic',
  ]);

  /**
   * 叙事题材、核心关系与核心互动机制（最高优先级候选）
   */
  const STREAM_THEME_NARRATIVE = new Set([
    // 亲属与伦理关系
    'mother', 'daughter', 'sister', 'aunt', 'cousin', 'stepmother', 'incest',
    // 核心关系定性
    'netorare', 'netori', 'cheating', 'pure love', 'yuri', 'yaoi', 'futanari',
    // 互动机制与情境
    'mind control', 'hypnosis', 'mind break', 'corruption', 'blackmail',
    'femdom', 'maledom', 'rape', 'drugs', 'aphrodisiac', 'gender bender',
    'body swap', 'harem', 'gangbang', 'public use', 'exhibitionism',
    'voyeurism', 'tentacles', 'sleeping', 'drunk', 'bondage', 'bdsm',
    'defloration', 'virginity', 'shota', 'lolicon',
  ]);

  /**
   * 核心身份设定、职业与角色原型（第二优先级候选）
   */
  const STREAM_THEME_ARCHETYPES = new Set([
    'milf', 'gyaru', 'maid', 'nun', 'miko', 'teacher', 'student', 'nurse',
    'bunny girl', 'cheerleader', 'waitress', 'succubus', 'elf', 'catgirl',
    'foxgirl', 'vampire', 'demon girl', 'angel', 'monster girl', 'yandere',
    'tsundere', 'tomboy', 'tomgirl', 'crossdressing', 'dilf', 'swimsuit',
    'bikini', 'leotard', 'bloomers',
  ]);

  /**
   * 显著体态与身材特征（第三优先级候选）
   */
  const STREAM_THEME_PHYSICAL = new Set([
    'big breasts', 'huge breasts', 'small breasts', 'flat chest', 'dark skin',
    'pregnant', 'lactation', 'tall girl', 'femboy',
  ]);

  /**
   * 语义包含与从属抑制表
   * 当具体子项存在时，自动抑制泛指或较轻的父项，避免近义重复占用展示坑位
   */
  const STREAM_SEMANTIC_SUBORDINATION = [
    {
      general: 'incest',
      specifics: ['mother', 'daughter', 'sister', 'aunt', 'cousin', 'stepmother'],
    },
    {
      general: 'cheating',
      specifics: ['netorare', 'netori'],
    },
  ];

  /**
   * 版本形态优先级字典（最多占用 1 个名额）
   */
  const STREAM_FORMAT_PRIORITY = {
    uncensored: 1,
    decensored: 1,
    'full color': 2,
    'full colour': 2,
    'cg set': 3,
    '3d': 4,
  };

  /**
   * 列表标签流决策引擎：数据驱动的分层提取与自适应配额装配
   */
  function pickHighlightTags(tags, opts) {
    opts = opts || {};
    const max = Math.max(1, Math.min(8, Math.floor(Number(opts.max) || 4)));
    const favBare = typeof expandFavTagAliases === 'function'
      ? expandFavTagAliases(opts.favTags)
      : new Set(
          (opts.favTags || []).map((t) => {
            const h = normalizeNamespaceTag(t);
            return (h.includes(':') ? h.split(':').slice(1).join(':') : h).toLowerCase().trim();
          })
        );

    const formatSlot = [];
    const favSlot = [];
    const narrativeSlot = [];
    const archetypeSlot = [];
    const physicalSlot = [];
    const fallbackSlot = [];
    const seen = new Set();
    const rawNameSet = new Set();

    (tags || []).forEach((raw) => {
      const full = normalizeNamespaceTag(raw);
      if (!full || seen.has(full)) return;
      seen.add(full);

      let ns = '';
      let name = full;
      const colon = full.indexOf(':');
      if (colon > 0) {
        ns = full.slice(0, colon).toLowerCase().trim();
        name = full.slice(colon + 1);
      }
      if (!name || name.length > 40) return;

      // 1. 过滤不在标签流展示的命名空间
      if (STREAM_EXCLUDED_NAMESPACES.has(ns)) return;

      const nameLow = name.toLowerCase().trim();
      rawNameSet.add(nameLow);
      const isFav = favBare.has(nameLow) || favBare.has(full.toLowerCase());

      // 2. 过滤噪声词（心动标签除外）
      if (STREAM_NOISE_TAGS.has(nameLow) && !isFav) return;

      // 3. 用户心动标签：最高优先进入独立心动槽
      if (isFav) {
        favSlot.push({ ns, name, full, priority: 0 });
        return;
      }

      // 4. 版本形态槽（最多保留 1 个）
      if (ns === 'other' || ns === 'censor') {
        const fmtPri = STREAM_FORMAT_PRIORITY[nameLow];
        if (fmtPri != null) {
          formatSlot.push({ ns: 'other', name, full, priority: fmtPri });
          return;
        }
      }

      // 5. 语义层级分流
      if (STREAM_THEME_NARRATIVE.has(nameLow)) {
        narrativeSlot.push({ ns, name, full, priority: 10 });
        return;
      }
      if (STREAM_THEME_ARCHETYPES.has(nameLow)) {
        archetypeSlot.push({ ns, name, full, priority: 20 });
        return;
      }
      if (STREAM_THEME_PHYSICAL.has(nameLow)) {
        physicalSlot.push({ ns, name, full, priority: 30 });
        return;
      }

      // 6. 兜底合法题材（如常规 female/male/other）
      fallbackSlot.push({ ns, name, full, priority: 40 });
    });

    // 声明式语义从属抑制（泛指词让位于具体词）
    const suppressedGenerals = new Set();
    STREAM_SEMANTIC_SUBORDINATION.forEach(({ general, specifics }) => {
      const hasSpecific = specifics.some((s) => rawNameSet.has(s));
      if (hasSpecific) suppressedGenerals.add(general);
    });

    const activeNarrative = narrativeSlot.filter(
      (item) => !suppressedGenerals.has(item.name.toLowerCase().trim())
    );

    // 排序各槽位候选
    formatSlot.sort((a, b) => a.priority - b.priority);
    favSlot.sort((a, b) => a.priority - b.priority);
    activeNarrative.sort((a, b) => a.priority - b.priority);
    archetypeSlot.sort((a, b) => a.priority - b.priority);
    physicalSlot.sort((a, b) => a.priority - b.priority);
    fallbackSlot.sort((a, b) => a.priority - b.priority);

    // 组装最终结果（高决策权重优先占位）
    const out = [];
    const usedFull = new Set();
    const pushItem = (item) => {
      if (!item || usedFull.has(item.full)) return false;
      usedFull.add(item.full);
      out.push(item);
      return true;
    };

    // 1. 版本形态：最多占用 1 个名额
    if (formatSlot.length > 0) pushItem(formatSlot[0]);

    // 2. 心动标签：最多 2 个
    for (let i = 0; i < favSlot.length && out.length < max && i < 2; i++) {
      pushItem(favSlot[i]);
    }

    // 3. 核心叙事与关系题材：允许动态抢占所有剩余名额
    for (let i = 0; i < activeNarrative.length && out.length < max; i++) {
      pushItem(activeNarrative[i]);
    }

    // 4. 核心身份设定：填补剩余名额
    for (let i = 0; i < archetypeSlot.length && out.length < max; i++) {
      pushItem(archetypeSlot[i]);
    }

    // 5. 显著身材体态：填补剩余名额
    for (let i = 0; i < physicalSlot.length && out.length < max; i++) {
      pushItem(physicalSlot[i]);
    }

    // 6. 通用题材保底补齐
    for (let i = 0; i < fallbackSlot.length && out.length < max; i++) {
      pushItem(fallbackSlot[i]);
    }

    return out.slice(0, max);
  }

  /**
   * 列表展示用短标签名：地道中文 + 紧凑呈现
   */
  function formatHighlightTagLabel(item) {
    if (!item) return '';
    const ns = item.ns || '';
    const name = item.name || '';
    const cn = translateTagCn(ns, name);

    if (ns === 'other') {
      if (/uncensored|decensored/i.test(name)) return '无码';
      if (/mosaic|full.?censorship/i.test(name)) return '有码';
      if (/full.?colou?r/i.test(name)) return '全彩';
      if (/cg set/i.test(name)) return 'CG包';
      if (/3d/i.test(name)) return '3D';
    }
    if (ns === 'character') return '角:' + cn.slice(0, 10);
    if (ns === 'parody') return '原:' + cn.slice(0, 10);
    if (ns === 'language') return cn.slice(0, 8);
    return cn.slice(0, 12);
  }

  function parseSizeToBytes(text) {
    const s = compactText(text);
    if (!s) return 0;
    const m = s.match(/([\d.]+)\s*(tib|gib|mib|kib|tb|gb|mb|kb|b)\b/i);
    if (!m) {
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    }
    const n = parseFloat(m[1]);
    if (!Number.isFinite(n)) return 0;
    const u = m[2].toLowerCase();
    const map = {
      b: 1,
      kb: 1024,
      kib: 1024,
      mb: 1024 ** 2,
      mib: 1024 ** 2,
      gb: 1024 ** 3,
      gib: 1024 ** 3,
      tb: 1024 ** 4,
      tib: 1024 ** 4,
    };
    return Math.round(n * (map[u] || 1));
  }

  function formatBytes(n) {
    const v = Number(n) || 0;
    if (v <= 0) return '—';
    if (v < 1024) return v + ' B';
    if (v < 1024 ** 2) return (v / 1024).toFixed(1) + ' KB';
    if (v < 1024 ** 3) return (v / 1024 ** 2).toFixed(1) + ' MB';
    return (v / 1024 ** 3).toFixed(2) + ' GB';
  }

  function sizeTier(bytes) {
    const b = Number(bytes) || 0;
    if (b <= 0) return 'U';
    if (b < 5 * 1024 * 1024) return 'S';
    if (b < 20 * 1024 * 1024) return 'M';
    if (b < 60 * 1024 * 1024) return 'L';
    return 'XL';
  }

  function langRank(lang, order) {
    const list = order && order.length ? order : DEFAULT_CONFIG.lang_order;
    const id = lang || 'other';
    // zh covers zh-cn etc
    let idx = list.indexOf(id);
    if (idx < 0 && id.startsWith('zh')) idx = list.indexOf('zh');
    if (idx < 0) idx = list.indexOf('other');
    if (idx < 0) idx = list.length;
    return idx;
  }

  function censorRank(tier, order) {
    const list = order && order.length ? order : DEFAULT_CONFIG.censor_order;
    const idx = list.indexOf(tier || 'unknown');
    return idx < 0 ? list.length : idx;
  }

  function groupBonus(group, cfg) {
    const g = compactText(group).toLowerCase();
    if (!g) return 0;
    if ((cfg.group_blacklist || []).some((x) => compactText(x).toLowerCase() === g)) return -1000;
    if ((cfg.group_whitelist || []).some((x) => compactText(x).toLowerCase() === g)) return 100;
    return 0;
  }

  const EDITION_AVAILABILITY_STATUSES = new Set([
    'active',
    'expunged',
    'unavailable',
    'unknown',
  ]);

  function hasEditionExpungedFlag(value) {
    if (value === true || value === 1) return true;
    const normalized = compactText(value).toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }

  function normalizeEditionAvailabilityStatus(value, expunged) {
    if (hasEditionExpungedFlag(expunged)) return 'expunged';
    const normalized = compactText(value).toLowerCase();
    return EDITION_AVAILABILITY_STATUSES.has(normalized) ? normalized : 'unknown';
  }

  function isEditionAvailabilityIssue(edition) {
    if (!edition) return false;
    const status = normalizeEditionAvailabilityStatus(
      edition.availability_status,
      edition.expunged
    );
    return status === 'expunged' || status === 'unavailable';
  }

  function getEditionAvailabilityLabel(edition) {
    const status = normalizeEditionAvailabilityStatus(
      edition && edition.availability_status,
      edition && edition.expunged
    );
    if (status === 'active') return '来源正常';
    if (status === 'expunged') return '已清退';
    if (status === 'unavailable') return '不可访问';
    return '未检查';
  }

  function getEditionAvailabilityTone(edition) {
    const status = normalizeEditionAvailabilityStatus(
      edition && edition.availability_status,
      edition && edition.expunged
    );
    if (status === 'active') return 'green';
    if (status === 'expunged') return 'red';
    if (status === 'unavailable') return 'yellow';
    return 'gray';
  }

  /**
   * 偏好排序：语言 → 码级 → 体积 → 汉化组 → 页数
   * （黑名单组仍通过 groupBonus 强惩罚 / pickBest 过滤）
   */
  function scoreEdition(edition, cfg) {
    const c = cfg || config;
    let score = 0;
    if (isEditionAvailabilityIssue(edition)) score -= 1e15;
    // 1e12 级：语言
    score += (10 - Math.min(9, langRank(edition.language, c.lang_order))) * 1e12;
    // 1e10 级：码级
    score += (10 - Math.min(9, censorRank(edition.censor_tier, c.censor_order))) * 1e10;
    // 1e6 级：体积（越大越好，对数压缩）
    const size = Number(edition.size_bytes) || 0;
    score += Math.min(9999, Math.floor(Math.log10(size + 1) * 1000)) * 1e6;
    // 1e4 级：汉化组（白名单加分、黑名单大惩罚）
    const gb = groupBonus(edition.group || '', c);
    score += (gb + 1000) * 1e4;
    // 1e2 级：页数
    const pages = Number(edition.pages) || 0;
    score += Math.min(9999, pages) * 1e2;
    // 末位：上传时间
    if (edition.posted_at) {
      score += Math.min(99, (Number(edition.posted_at) || 0) / 1e13);
    }
    return score;
  }

  function pickBestEdition(editions, cfg) {
    const list = (editions || []).filter(Boolean);
    if (!list.length) return null;
    const c = cfg || config;
    let pool = list.slice();
    // 已清退或不可访问的来源只在没有其它版本时作为兜底。
    const available = pool.filter((ed) => !isEditionAvailabilityIssue(ed));
    if (available.length) pool = available;
    // drop blacklisted groups when alternatives exist
    const nonBlack = pool.filter((ed) => groupBonus(ed.group || '', c) > -500);
    if (nonBlack.length) pool = nonBlack;
    let best = pool[0];
    let bestScore = scoreEdition(best, c);
    for (let i = 1; i < pool.length; i++) {
      const s = scoreEdition(pool[i], c);
      if (s > bestScore) {
        best = pool[i];
        bestScore = s;
      }
    }
    return best;
  }

  function structuralMatchScore(edition, archive, preparedTitleScore) {
    if (!edition || !archive) return 0;
    let score = Number.isFinite(preparedTitleScore)
      ? preparedTitleScore
      : titleSimilarity(edition.title_raw || edition.title_core, archive.title || archive.title_core);
    if (!score) return 0;
    if (edition.group && archive.group) {
      if (compactText(edition.group).toLowerCase() === compactText(archive.group).toLowerCase()) score += 0.08;
    }
    if (edition.language && archive.language && edition.language === archive.language) score += 0.05;
    const ep = Number(edition.pages) || 0;
    const ap = Number(archive.pages) || 0;
    if (ep > 0 && ap > 0) {
      const diff = Math.abs(ep - ap);
      if (diff <= 2) score += 0.06;
      else if (diff <= 5) score += 0.03;
      else if (diff > Math.max(ep, ap) * 0.5) score -= 0.15;
    }
    if (edition.censor_tier && archive.censor_tier && edition.censor_tier === archive.censor_tier && edition.censor_tier !== 'unknown') {
      score += 0.03;
    }
    return Math.max(0, Math.min(1.2, score));
  }

  /** 页数容差：默认约 10%（10 页容 1 页），夹在 min~max */
  function pageDiffTolerance(pagesA, pagesB, cfg) {
    const c = cfg || config;
    const a = Number(pagesA) || 0;
    const b = Number(pagesB) || 0;
    const base = Math.min(a, b) > 0 ? Math.min(a, b) : Math.max(a, b);
    if (base <= 0) return Math.max(1, Number(c.pages_tolerance_min) || 1);
    const ratio = Number(c.pages_tolerance_ratio);
    const r = Number.isFinite(ratio) && ratio >= 0 ? ratio : 0.1;
    const min = Math.max(1, Number(c.pages_tolerance_min) || 1);
    const max = Math.max(min, Number(c.pages_tolerance_max) || 25);
    return Math.min(max, Math.max(min, Math.round(base * r)));
  }

  /** 体积容差：默认 max 侧的 12%，且不少于 minBytes */
  function sizeDiffTolerance(bytesA, bytesB, cfg) {
    const c = cfg || config;
    const a = Number(bytesA) || 0;
    const b = Number(bytesB) || 0;
    const hi = Math.max(a, b);
    if (hi <= 0) return Math.max(0, Number(c.size_tolerance_min_bytes) || 1024 * 1024);
    const ratio = Number(c.size_tolerance_ratio);
    const r = Number.isFinite(ratio) && ratio >= 0 ? ratio : 0.12;
    const minB = Math.max(0, Number(c.size_tolerance_min_bytes) || 1024 * 1024);
    return Math.max(minB, Math.round(hi * r));
  }

  /** 页均体积是否接近（删页后总积变了，但 bpp 仍像同一套图） */
  function isBytesPerPageClose(bytesA, pagesA, bytesB, pagesB, cfg) {
    const c = cfg || config;
    const pa = Number(pagesA) || 0;
    const pb = Number(pagesB) || 0;
    const ba = Number(bytesA) || 0;
    const bb = Number(bytesB) || 0;
    if (pa <= 0 || pb <= 0 || ba <= 0 || bb <= 0) return false;
    const bppA = ba / pa;
    const bppB = bb / pb;
    const hi = Math.max(bppA, bppB);
    if (hi <= 0) return false;
    const ratio = Number(c.bpp_tolerance_ratio);
    const r = Number.isFinite(ratio) && ratio >= 0 ? ratio : 0.2;
    return Math.abs(bppA - bppB) / hi <= r;
  }

  function isCensorBetter(candidateTier, baseTier, cfg) {
    const a = candidateTier || 'unknown';
    const b = baseTier || 'unknown';
    if (a === b) return false;
    // 已知码级优于「码未知」：无码 vs 码未知 → 无码更好
    if (a !== 'unknown' && b === 'unknown') return true;
    if (a === 'unknown' && b !== 'unknown') return false;
    return censorRank(a, (cfg || config).censor_order) < censorRank(b, (cfg || config).censor_order);
  }

  function isLangBetter(candidateLang, baseLang, cfg) {
    const a = candidateLang || 'other';
    const b = baseLang || 'other';
    if (a === b) return false;
    // 明确语言优于 other/unknown
    if (a && a !== 'other' && a !== 'unknown' && (!b || b === 'other' || b === 'unknown')) return true;
    if (b && b !== 'other' && b !== 'unknown' && (!a || a === 'other' || a === 'unknown')) return false;
    if (!a || a === 'other' || a === 'unknown') return false;
    if (!b || b === 'other' || b === 'unknown') return false;
    return langRank(a, (cfg || config).lang_order) < langRank(b, (cfg || config).lang_order);
  }

  /** 线上相对库内是否更优：只认语言/码级（页数体积不算） */
  function isEditionBetter(remote, base, cfg) {
    if (!remote || !base) return false;
    if (isEditionAvailabilityIssue(remote)) return false;
    if (isEditionAvailabilityIssue(base)) return true;
    if (isLangBetter(remote.language, base.language, cfg)) return true;
    const rl = remote.language || 'other';
    const bl = base.language || 'other';
    // 同语言，或任一侧语言不明：仍可比码级
    const sameOrUnkLang =
      rl === bl ||
      !rl ||
      !bl ||
      rl === 'other' ||
      bl === 'other' ||
      rl === 'unknown' ||
      bl === 'unknown';
    if (sameOrUnkLang && isCensorBetter(remote.censor_tier, base.censor_tier, cfg)) return true;
    return false;
  }

  function shortLang(lang) {
    const l = compactText(lang || '').toLowerCase();
    if (!l || l === 'other' || l === 'unknown') return '?';
    if (l.startsWith('zh')) return '中';
    if (l === 'ja' || l.startsWith('jp')) return '日';
    if (l === 'en') return '英';
    if (l === 'ko') return '韩';
    return l.slice(0, 4);
  }

  function shortCensor(tier) {
    if (tier === 'uncensored') return '无码';
    if (tier === 'light') return '条纹';
    if (tier === 'heavy') return '厚码';
    if (tier === 'unknown' || !tier) return '码未知';
    return '';
  }

  function formatEditionBrief(ed) {
    if (!ed) return '—';
    const bits = [];
    const lg = shortLang(ed.language);
    if (lg !== '?') bits.push(lg);
    // 码级始终写出，避免「没写 = 无码」的误解
    const cs = shortCensor(ed.censor_tier || 'unknown');
    if (cs) {
      bits.push(ed.censor_from_eh_source ? cs + '(源)' : cs);
    }
    if (ed.group) bits.push(String(ed.group).slice(0, 10));
    if (ed.pages) bits.push(ed.pages + 'p');
    if (ed.size_bytes) bits.push(formatBytes(ed.size_bytes));
    return bits.join('/') || '未知';
  }

  function diffEditionVsArchive(edition, archive, cfg) {
    const c = cfg || config;
    const diffs = [];
    const same = [];
    const eLang = edition.language || 'other';
    const aLang = archive.language || 'other';
    if (eLang && aLang && eLang !== 'other' && aLang !== 'other') {
      if (eLang === aLang) same.push('语言');
      else diffs.push({ key: 'language', label: '语言', online: shortLang(eLang), library: shortLang(aLang), better: isLangBetter(eLang, aLang, c) ? 'online' : isLangBetter(aLang, eLang, c) ? 'library' : '' });
    }
    const eC = edition.censor_tier || 'unknown';
    const aC = archive.censor_tier || 'unknown';
    // 两侧都写；码未知 vs 无码 等要判 better
    if (eC === aC && eC !== 'unknown') {
      same.push('码级');
    } else if (eC !== aC) {
      diffs.push({
        key: 'censor',
        label: '码级',
        online: shortCensor(eC) || eC,
        library: shortCensor(aC) || aC,
        better: isCensorBetter(eC, aC, c) ? 'online' : isCensorBetter(aC, eC, c) ? 'library' : '',
        uncertain: eC === 'unknown' || aC === 'unknown' ? 1 : 0,
      });
    }
    const eg = compactText(edition.group || '').toLowerCase();
    const ag = compactText(archive.group || '').toLowerCase();
    if (eg && ag) {
      if (eg === ag) same.push('组');
      else diffs.push({ key: 'group', label: '汉化组', online: edition.group, library: archive.group, better: '' });
    }
    const ep = Number(edition.pages) || 0;
    const ap = Number(archive.pages) || 0;
    const es = Number(edition.size_bytes) || 0;
    const as = Number(archive.size_bytes) || 0;
    const pageTol = pageDiffTolerance(ep, ap, c);
    const sizeTol = sizeDiffTolerance(es, as, c);
    const bppClose = isBytesPerPageClose(es, ep, as, ap, c);
    let pageOut = false;
    let sizeOut = false;

    if (ep > 0 && ap > 0) {
      const pageDelta = Math.abs(ep - ap);
      if (pageDelta <= pageTol) {
        same.push('页数');
      } else {
        pageOut = true;
        // 超容差只标打包差异；页均体积接近时说明更像去广告而非换源
        diffs.push({
          key: 'pages',
          label: '页数',
          online: ep + 'p',
          library: ap + 'p',
          better: '',
          packaging: true,
          tolerance: pageTol,
          delta: pageDelta,
        });
      }
    }
    if (es > 0 && as > 0) {
      const sizeDelta = Math.abs(es - as);
      if (sizeDelta <= sizeTol) {
        same.push('体积');
      } else {
        sizeOut = true;
        diffs.push({
          key: 'size',
          label: '体积',
          online: formatBytes(es),
          library: formatBytes(as),
          better: '',
          packaging: true,
          tolerance: sizeTol,
          delta: sizeDelta,
        });
      }
    }

    // 总判定只看语言/码级；页数/体积只参与容差与打包说明
    const qualityKeys = { language: 1, censor: 1 };
    const onlineBetter = diffs.some((d) => d.better === 'online' && qualityKeys[d.key]);
    const libraryBetter = diffs.some((d) => d.better === 'library' && qualityKeys[d.key]) && !onlineBetter;
    const packagingDiffs = diffs.filter((d) => d.packaging || d.key === 'pages' || d.key === 'size');
    const packagingOnly = diffs.length > 0 && diffs.every((d) => d.packaging || d.key === 'pages' || d.key === 'size');

    let packaging_note = '';
    if (packagingDiffs.length) {
      const bits = [];
      if (pageOut) bits.push('页数容差±' + pageTol);
      if (sizeOut) bits.push('体积容差' + formatBytes(sizeTol));
      if (bppClose && (pageOut || sizeOut)) bits.push('页均体积接近');
      packaging_note =
        (bits.length ? bits.join(' · ') + '。' : '') +
        '页数/体积差只算打包差异（体积更大≠画质更好，常见广告页/重压/不同源包），不判「有更好版」';
    }

    let short = '';
    if (onlineBetter) {
      short = '线上质量更优';
    } else if (libraryBetter) {
      short = '库内质量更优';
    } else if (packagingOnly) {
      short = bppClose ? '打包差异(页均接近)' : '打包差异';
    } else if (diffs.length) {
      short = '库:' + diffs.slice(0, 2).map((d) => d.library).join('/');
    } else if (same.length) {
      short = '近似';
    } else {
      short = '标题像';
    }

    return {
      diffs,
      same,
      short_label: short,
      online_brief: formatEditionBrief(edition),
      library_brief: formatEditionBrief(archive),
      online_better: onlineBetter,
      library_better: libraryBetter,
      packaging_only: packagingOnly,
      packaging_note,
      page_tolerance: pageTol,
      size_tolerance: sizeTol,
      bpp_close: bppClose,
      title_sim: titleSimilarity(edition.title_raw || edition.title_core, archive.title || archive.title_core),
    };
  }

  /**
   * 线上两个 edition 之间对照（当前页 vs 同 Work 另一版本）。
   * 字段语义：left=当前，right=对照目标；复用与库对照相同的容差与质量判定。
   */
  function diffEditionVsEdition(left, right, cfg) {
    if (!left || !right) return null;
    const asArchive = {
      language: right.language,
      censor_tier: right.censor_tier,
      group: right.group,
      pages: right.pages,
      size_bytes: right.size_bytes,
      title: right.title_raw || right.title_core || right.title || '',
      title_core: right.title_core || '',
    };
    const base = diffEditionVsArchive(left, asArchive, cfg);
    if (!base) return null;
    // 把 online/library 语义改成 当前/对方，避免 UI 误读成 LRR
    const diffs = (base.diffs || []).map((d) =>
      Object.assign({}, d, {
        current: d.online,
        other: d.library,
        better:
          d.better === 'online' ? 'current' : d.better === 'library' ? 'other' : d.better || '',
      })
    );
    let short = base.short_label || '';
    if (base.online_better) short = '当前更优';
    else if (base.library_better) short = '对方更优';
    else if (base.packaging_only) short = base.bpp_close ? '打包差异(页均接近)' : '打包差异';
    else if (diffs.length) short = '有差异';
    else if (base.same && base.same.length) short = '接近';
    else short = '可对照';
    return {
      diffs,
      same: base.same || [],
      short_label: short,
      current_brief: base.online_brief,
      other_brief: base.library_brief,
      current_better: !!base.online_better,
      other_better: !!base.library_better,
      packaging_only: !!base.packaging_only,
      packaging_note: base.packaging_note || '',
      page_tolerance: base.page_tolerance,
      size_tolerance: base.size_tolerance,
      bpp_close: !!base.bpp_close,
    };
  }

  function tokenize(s) {
    return compactText(s)
      .toLowerCase()
      .split(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]+/i)
      .filter((t) => t.length >= 2);
  }

  function jaccard(aTokens, bTokens) {
    const a = new Set(aTokens);
    const b = new Set(bTokens);
    if (!a.size || !b.size) return 0;
    let inter = 0;
    for (const t of a) if (b.has(t)) inter++;
    return inter / (a.size + b.size - inter);
  }

  function titleSimilarity(a, b) {
    const ca = buildTitleCore(a);
    const cb = buildTitleCore(b);
    if (!ca || !cb) return 0;
    if (ca === cb) return 1;
    if (ca.includes(cb) || cb.includes(ca)) return 0.92;
    return jaccard(tokenize(ca), tokenize(cb));
  }

  function parseGalleryUrl(url) {
    const s = String(url || '');
    const m = s.match(/\/g\/(\d+)\/([0-9a-f]+)\/?/i);
    if (!m) return null;
    return { gid: m[1], token: m[2].toLowerCase() };
  }

  function buildGalleryUrl(host, gid, token) {
    const h = host || location.origin;
    return h.replace(/\/$/, '') + '/g/' + gid + '/' + token + '/';
  }

  function buildSearchUrl(host, query) {
    const h = (host || location.origin).replace(/\/$/, '');
    return h + '/?f_search=' + encodeURIComponent(query || '');
  }

  function editionKey(gid, token) {
    return String(gid) + ':' + String(token || '').toLowerCase();
  }

  function normalizeEditionRecord(partial) {
    partial = partial || {};
    const title = compactText(partial.title_raw || partial.title || '');
    const tags = Array.isArray(partial.tags) ? partial.tags.slice() : [];
    const group =
      compactText(partial.group) ||
      extractGroupFromTitle(title) ||
      extractGroupsFromTags(tags)[0] ||
      '';
    const language = partial.language || detectLanguageFromText(title, tags);
    const censor_tier = partial.censor_tier || detectCensorTier(title, tags);
    const size_bytes = Number(partial.size_bytes) || parseSizeToBytes(partial.size_text || '') || 0;
    const availability_status = normalizeEditionAvailabilityStatus(
      partial.availability_status,
      partial.expunged
    );
    return {
      gid: String(partial.gid || ''),
      token: String(partial.token || '').toLowerCase(),
      work_id: partial.work_id || '',
      title_raw: title,
      title_core: partial.title_core || buildTitleCore(title),
      language,
      group,
      pages: Number(partial.pages) || 0,
      category: compactText(partial.category || ''),
      size_bytes,
      size_tier: partial.size_tier || sizeTier(size_bytes),
      censor_tier,
      tags,
      uploader: compactText(partial.uploader || ''),
      posted_at: Number(partial.posted_at) || 0,
      url: partial.url || '',
      thumb: partial.thumb || '',
      availability_status,
      availability_checked_at: Math.max(0, Number(partial.availability_checked_at) || 0),
      tags_fetched_at: Math.max(0, Number(partial.tags_fetched_at) || 0),
      availability_reason: compactText(partial.availability_reason || ''),
      availability_error: compactText(partial.availability_error || ''),
      expunged: availability_status === 'expunged' ? 1 : 0,
      updated_at: typeof nowMs === 'function' ? nowMs() : Date.now(),
    };
  }

  const FORMAT_TAG_NAMES = new Set(['uncensored', 'decensored', 'full color', 'full colour', 'cg set', '3d']);

  function isEditionMissingRealTags(edition, partial) {
    if (!edition || !edition.gid || !edition.token) return false;
    const availability =
      typeof normalizeEditionAvailabilityStatus === 'function'
        ? normalizeEditionAvailabilityStatus(edition.availability_status, edition.expunged)
        : edition.availability_status;
    if (availability === 'expunged' || availability === 'unavailable') return false;

    // 1. 若近期已专门拉取过 gdata 标签（7天内），即使原站本身标签极少也不再重复请求
    const currentMs = typeof nowMs === 'function' ? nowMs() : Date.now();
    const tagsFetchedAt = Number(edition.tags_fetched_at) || 0;
    if (tagsFetchedAt > 0 && currentMs - tagsFetchedAt < 7 * 86400000) {
      return false;
    }

    // 2. 检查是否有真实的官方深层内容标签
    // 注意：parody 绝不能算深层内容标签，因为 parseListCard 会从标题括号中提取常见二创 IP（如 parody:碧蓝档案、parody:Fate/Grand Order）
    // 列表页卡片 DOM 解析绝对不可能产生 female, male, character, mixed, cosplayer 等命名空间
    const tags =
      (Array.isArray(edition.tags) && edition.tags.length ? edition.tags : (partial && partial.tags)) || [];
    const hasDeepContentTag = tags.some((t) => {
      const s = String(t).toLowerCase().trim();
      if (
        s.startsWith('female:') ||
        s.startsWith('male:') ||
        s.startsWith('character:') ||
        s.startsWith('mixed:') ||
        s.startsWith('cosplayer:')
      ) {
        return true;
      }
      if (s.startsWith('other:')) {
        const name = s.slice(6).trim();
        return !FORMAT_TAG_NAMES.has(name);
      }
      return false;
    });

    if (hasDeepContentTag) return false;

    return true;
  }
