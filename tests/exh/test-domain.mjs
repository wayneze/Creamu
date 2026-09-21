/**
 * ExH domain pure function tests (mocked config, no browser).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createContext, runInContext } from 'vm';
import assert from 'assert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const partsDir = path.resolve(__dirname, '../../packages/exh-commander/src/parts');

function loadDomain() {
  const src = fs.readFileSync(path.join(partsDir, '20-domain.js'), 'utf8');
  const DEFAULT_CONFIG = {
    lang_order: ['zh', 'ja', 'en', 'other'],
    censor_order: ['uncensored', 'light', 'heavy', 'unknown'],
    group_whitelist: [],
    group_blacklist: [],
    pages_tolerance_ratio: 0.1,
    pages_tolerance_min: 1,
    pages_tolerance_max: 25,
    size_tolerance_ratio: 0.12,
    size_tolerance_min_bytes: 1 * 1024 * 1024,
    bpp_tolerance_ratio: 0.2,
  };
  const sandbox = {
    console,
    Math,
    Number,
    String,
    Array,
    Object,
    JSON,
    RegExp,
    Error,
    Date,
    nowMs() {
      return Date.now();
    },
    compactText(v) {
      return String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    },
    DEFAULT_CONFIG,
    config: Object.assign({}, DEFAULT_CONFIG),
    location: { origin: 'https://e-hentai.org' },
    document: { title: '', body: { innerText: '' }, querySelector: () => null },
  };
  const ctx = createContext(sandbox);
  runInContext(src, ctx, { filename: '20-domain.js' });
  const src55 = fs.readFileSync(path.join(partsDir, '55-page-parsers.js'), 'utf8');
  runInContext(src55, ctx, { filename: '55-page-parsers.js' });
  return ctx;
}

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  OK  ' + name);
  } catch (e) {
    console.error('  FAIL  ' + name);
    console.error('       ', e.message);
    process.exitCode = 1;
  }
}

console.log('ExH domain tests');

const d = loadDomain();

test('buildTitleCore 去括号与语言噪声', () => {
  const core = d.buildTitleCore('[Group] Sample Work (Chinese) [Digital]');
  assert.ok(core.includes('sample'));
  assert.ok(core.includes('work'));
  assert.ok(!/chinese/i.test(core));
  assert.ok(!/digital/i.test(core));
});

test('detectLanguageFromText / detectCensorTier', () => {
  assert.strictEqual(d.detectLanguageFromText('foo Chinese bar', []), 'zh');
  assert.strictEqual(d.detectLanguageFromText('title', ['language:japanese']), 'ja');
  assert.strictEqual(d.detectCensorTier('foo', ['other:uncensored']), 'uncensored');
  assert.strictEqual(d.detectCensorTier('有码本', []), 'heavy');
  assert.strictEqual(d.detectCensorTier('plain', []), 'unknown');
});

test('parseSizeToBytes', () => {
  assert.strictEqual(d.parseSizeToBytes('1.5 MiB'), Math.round(1.5 * 1024 * 1024));
  assert.strictEqual(d.parseSizeToBytes('2 GB'), 2 * 1024 ** 3);
  assert.ok(d.parseSizeToBytes('') === 0);
});

test('parseGalleryUrl / editionKey', () => {
  const p = d.parseGalleryUrl('https://e-hentai.org/g/12345/abcdef0123/');
  assert.ok(p);
  assert.strictEqual(p.gid, '12345');
  assert.strictEqual(p.token, 'abcdef0123');
  assert.strictEqual(d.editionKey(12345, 'AbCd'), '12345:abcd');
  assert.strictEqual(d.parseGalleryUrl('https://example.com/nope'), null);
});

test('pageDiffTolerance / sizeDiffTolerance 默认夹紧', () => {
  // 100 页 * 0.1 = 10
  assert.strictEqual(d.pageDiffTolerance(100, 100), 10);
  // 很小：不低于 min=1
  assert.strictEqual(d.pageDiffTolerance(5, 5), 1);
  // 很大：不超过 max=25
  assert.strictEqual(d.pageDiffTolerance(1000, 1000), 25);

  const tol = d.sizeDiffTolerance(10 * 1024 * 1024, 10 * 1024 * 1024);
  assert.ok(tol >= 1024 * 1024);
  assert.ok(tol >= Math.round(10 * 1024 * 1024 * 0.12));
});

test('isBytesPerPageClose', () => {
  assert.strictEqual(d.isBytesPerPageClose(1000, 10, 1100, 10), true);
  assert.strictEqual(d.isBytesPerPageClose(1000, 10, 5000, 10), false);
  assert.strictEqual(d.isBytesPerPageClose(0, 10, 1000, 10), false);
});

test('pickBestEdition 语言优先于体积', () => {
  const cfg = {
    lang_order: ['zh', 'ja', 'en', 'other'],
    censor_order: ['uncensored', 'light', 'heavy', 'unknown'],
    group_whitelist: [],
    group_blacklist: [],
  };
  const best = d.pickBestEdition(
    [
      { language: 'en', censor_tier: 'uncensored', size_bytes: 9e9, pages: 200, group: '' },
      { language: 'zh', censor_tier: 'heavy', size_bytes: 1e6, pages: 20, group: '' },
    ],
    cfg
  );
  assert.strictEqual(best.language, 'zh');
});

test('pickBestEdition 黑名单组有替代时剔除', () => {
  const cfg = {
    lang_order: ['zh', 'ja', 'en', 'other'],
    censor_order: ['uncensored', 'light', 'heavy', 'unknown'],
    group_whitelist: [],
    group_blacklist: ['BadGroup'],
  };
  const best = d.pickBestEdition(
    [
      { language: 'zh', censor_tier: 'uncensored', size_bytes: 5e7, pages: 50, group: 'BadGroup' },
      { language: 'zh', censor_tier: 'heavy', size_bytes: 1e6, pages: 40, group: 'OkGroup' },
    ],
    cfg
  );
  assert.strictEqual(best.group, 'OkGroup');
});

test('isEditionBetter 语言/码级', () => {
  assert.strictEqual(
    d.isEditionBetter(
      { language: 'zh', censor_tier: 'heavy' },
      { language: 'en', censor_tier: 'uncensored' }
    ),
    true
  );
  assert.strictEqual(
    d.isEditionBetter(
      { language: 'zh', censor_tier: 'uncensored' },
      { language: 'zh', censor_tier: 'heavy' }
    ),
    true
  );
  assert.strictEqual(
    d.isEditionBetter(
      { language: 'zh', censor_tier: 'heavy' },
      { language: 'zh', censor_tier: 'uncensored' }
    ),
    false
  );
});

test('titleSimilarity 高相似', () => {
  const s = d.titleSimilarity('Sample Work Title One', 'Sample Work Title One!');
  assert.ok(s >= 0.9, 'got ' + s);
});

test('pickHighlightTags 纯粹题材流：分层筛选与水词过滤', () => {
  const rawTags = [
    'female:sole female', // 泛水词，应被过滤
    'male:sole male',     // 泛水词，应被过滤
    'female:mother',      // Tier 1 核心题材，进内容槽
    'female:big breasts', // Tier 3 核心特征，进内容槽
    'other:uncensored',   // 进形态槽
    'other:full color',   // 形态候选
    'character:mash kyrielight', // 角色标签，标签流不收录（留给封面和熟人）
    'female:gloves',      // 细微服饰，应被过滤
    'female:sweating',    // 泛生理，应被过滤
    'female:nakadashi',   // 泛水词，应被过滤
  ];
  const picked = d.pickHighlightTags(rawTags, { max: 3 });
  const names = picked.map((x) => x.name);

  // 形态槽只能占 1 个，uncensored 优先于 full color
  assert.ok(names.includes('uncensored'));
  assert.ok(!names.includes('full color'));

  // 泛水词、细微服饰、角色标签全被剔除
  assert.ok(!names.includes('sole female'));
  assert.ok(!names.includes('sole male'));
  assert.ok(!names.includes('nakadashi'));
  assert.ok(!names.includes('gloves'));
  assert.ok(!names.includes('sweating'));
  assert.ok(!names.includes('mash kyrielight'), '角色名不占标签流');

  // 核心内容题材与身材入选
  assert.ok(names.includes('mother'));
  assert.ok(names.includes('big breasts'));

  // 总数不超过 max
  assert.strictEqual(picked.length, 3);
});

test('pickHighlightTags 心动标签破格优先入选', () => {
  const rawTags = [
    'female:sole female', // 本是泛水词
    'female:glasses',
    'other:full color',
  ];
  // 设为心动
  const picked = d.pickHighlightTags(rawTags, { max: 3, favTags: ['sole female'] });
  const names = picked.map((x) => x.name);
  assert.ok(names.includes('sole female'), '心动标签应当破格入选');
});

test('心动标签支持纯中文输入并自动双向匹配官方英文标签', () => {
  const rawTags = [
    'female:milf',
    'female:impregnation',
    'female:sister',
    'female:glasses',
  ];
  // 用户在设置里输入纯中文心动词
  const userFavs = ['人妻', '受精', '姐妹'];

  // 1. matchFavTags 徽章判定
  const hits = d.matchFavTags(userFavs, rawTags, '测试画册标题');
  assert.ok(hits.includes('人妻'), '人妻成功匹配 milf');
  assert.ok(hits.includes('受精'), '受精成功匹配 impregnation');
  assert.ok(hits.includes('姐妹'), '姐妹成功匹配 sister');

  // 2. pickHighlightTags 标签流高亮槽判定
  const picked = d.pickHighlightTags(rawTags, { max: 3, favTags: userFavs });
  const names = picked.map((x) => x.name);
  assert.ok(names.includes('milf'), '人妻心动词成功进入标签流');
  assert.ok(names.includes('impregnation'), '受精心动词成功进入标签流');
  assert.ok(!names.includes('glasses'), '非心动次级词被挤下');
});

test('formatHighlightTagLabel 地道汉化与短标签格式化', () => {
  assert.strictEqual(d.formatHighlightTagLabel({ ns: 'other', name: 'uncensored' }), '无码');
  assert.strictEqual(d.formatHighlightTagLabel({ ns: 'other', name: 'full color' }), '全彩');
  assert.strictEqual(d.formatHighlightTagLabel({ ns: 'female', name: 'mother' }), '母');
  assert.strictEqual(d.formatHighlightTagLabel({ ns: 'female', name: 'milf' }), '熟女');
  assert.strictEqual(d.formatHighlightTagLabel({ ns: 'female', name: 'big breasts' }), '巨乳');
  assert.strictEqual(d.formatHighlightTagLabel({ ns: 'female', name: 'hypnosis' }), '催眠');
  assert.strictEqual(d.formatHighlightTagLabel({ ns: 'female', name: 'schoolgirl uniform' }), '水手服');
});

test('pickHighlightTags 坚决丢弃原创/单行本/DL版等垃圾非题材标签', () => {
  const rawTags = [
    'parody:original',
    'other:digital',
    'other:tankoubon',
    'female:mother',
  ];
  const picked = d.pickHighlightTags(rawTags, { max: 4 });
  const names = picked.map((x) => x.name);
  assert.ok(!names.includes('original'), 'original 必须被丢弃');
  assert.ok(!names.includes('digital'), 'digital 必须被丢弃');
  assert.ok(!names.includes('tankoubon'), 'tankoubon 必须被丢弃');
  assert.ok(names.includes('mother'), '真实题材标签保留');
});

test('buildEhSyringeCache 支持 EhTagTranslation 标准结构', () => {
  const syringeData = {
    data: [
      {
        namespace: 'female',
        data: {
          mother: { name: '母亲', intro: '' },
          milf: { name: '熟女', intro: '' },
        },
      },
      {
        namespace: 'parody',
        data: {
          'blue archive': { name: '碧蓝档案', intro: '' },
        },
      },
    ],
  };
  const cache = d.buildEhSyringeCache(syringeData);
  assert.ok(cache);
  assert.strictEqual(cache['female:mother'], '母亲');
  assert.strictEqual(cache['mother'], '母亲');
  assert.strictEqual(cache['parody:blue archive'], '碧蓝档案');
});

test('pickHighlightTags 保留 other: 命名空间下的题材标签（如乱伦、百合）', () => {
  const rawTags = [
    'other:incest',
    'other:yuri',
    'other:full color',
  ];
  const picked = d.pickHighlightTags(rawTags, { max: 3 });
  const names = picked.map((x) => x.name);
  assert.ok(names.includes('full color'), '形态槽保留');
  assert.ok(names.includes('incest'), 'other:incest 题材标签不应被丢弃');
  assert.ok(names.includes('yuri'), 'other:yuri 题材标签不应被丢弃');
});

test('pickHighlightTags 顶级伦理/重磅玩法动态抢占与近义收敛', () => {
  // 作品同时包含：乱伦 + 母 + NTR + 出轨 + 催眠 + 恶堕 + 水手服
  const rawTags = [
    'other:incest',
    'female:mother',
    'female:netorare',
    'female:cheating',
    'female:hypnosis',
    'female:mind break',
    'female:schoolgirl uniform',
    'character:shiroko',
    'parody:blue archive',
  ];
  const picked = d.pickHighlightTags(rawTags, { max: 4 });
  const names = picked.map((x) => x.name);

  // 1. 角色和原作坚决不占位
  assert.ok(!names.includes('shiroko'), '角色不占位');
  assert.ok(!names.includes('blue archive'), '原作不占位');

  // 2. 近义收敛：已有具体血亲 mother，自动剔除抽象的 incest
  assert.ok(!names.includes('incest'), '已有母时乱伦自动折叠');
  // 已有具体的 netorare，自动剔除轻微的 cheating
  assert.ok(!names.includes('cheating'), '已有NTR时出轨自动折叠');

  // 3. 顶级题材动态抢占全部名额！
  assert.ok(names.includes('mother'), '母入选');
  assert.ok(names.includes('netorare'), 'NTR入选');
  assert.ok(names.includes('hypnosis'), '催眠入选');
  assert.ok(names.includes('mind break'), '恶堕入选');

  // 4. 普通服装让位
  assert.ok(!names.includes('schoolgirl uniform'), '低阶服饰被重磅玩法挤下');
  assert.strictEqual(picked.length, 4);
});

test('isEditionMissingRealTags 正确识别二创本需快充，且不漏网', () => {
  // 场景 1：知名二创本，卡片仅从标题提取出 parody:blue archive 和 artist
  // 绝不能因为有 parody 就误判为已有完整标签！必须返回 true 进行 gdata 快充
  const doujinCard = {
    gid: '12345',
    token: 'abcdef',
    tags: ['parody:blue archive', 'artist:test_artist', 'language:chinese', 'other:uncensored'],
  };
  assert.strictEqual(d.isEditionMissingRealTags(doujinCard), true, '二创本仅有标题正则提取的parody时必须拉取真实标签');

  // 场景 2：已有官方真实深度标签（如 female, character, male, other:incest）
  const fullEdition = {
    gid: '12345',
    token: 'abcdef',
    tags: ['parody:blue archive', 'character:shiroko sunaookami', 'female:maid'],
  };
  assert.strictEqual(d.isEditionMissingRealTags(fullEdition), false, '已有官方深度标签则无需重复拉取');

  // 场景 3：已在 7 天内专门通过 gdata 拉取过（即使原站本身标签极少），不可死循环重复请求
  const fetchedEdition = {
    gid: '12345',
    token: 'abcdef',
    tags: ['artist:lonely_artist'],
    tags_fetched_at: Date.now() - 3600000, // 1 小时前拉取过
  };
  assert.strictEqual(d.isEditionMissingRealTags(fetchedEdition), false, '近期已拉取过的不重复请求');

  // 场景 4：拉取超过 7 天且无深度标签，允许重新拉取
  const expiredEdition = {
    gid: '12345',
    token: 'abcdef',
    tags: ['artist:lonely_artist'],
    tags_fetched_at: Date.now() - 8 * 86400000, // 8 天前
  };
  assert.strictEqual(d.isEditionMissingRealTags(expiredEdition), true, '过期缓存且缺标签可重新快充');

  // 场景 5：画廊已失效或已清退，不请求
  const expungedEdition = {
    gid: '12345',
    token: 'abcdef',
    availability_status: 'expunged',
    tags: [],
  };
  assert.strictEqual(d.isEditionMissingRealTags(expungedEdition), false, '已清退画廊不请求');
});

test('expandHateTagAliases 支持中英文双向别名展开', () => {
  const needles1 = d.expandHateTagAliases(['男同']);
  assert.ok(needles1.includes('男同'), '包含原文');
  assert.ok(needles1.includes('yaoi'), '展开 yaoi');
  assert.ok(needles1.includes('male on male'), '展开 male on male');
  assert.ok(needles1.includes('bara'), '展开 bara');

  const needles2 = d.expandHateTagAliases(['scat']);
  assert.ok(needles2.includes('scat'), '包含 scat');
  assert.ok(needles2.includes('coprophagia'), '展开 coprophagia');
  assert.ok(needles2.includes('屎尿'), '展开中文 屎尿');
});

test('isBlockedEdition 精准拦截男同与重口，且零误伤异性向标签', () => {
  // 配置填中文「男同」
  d.config.hate_tags = ['男同'];
  d.config.block_title_keywords = [];

  // 1. 命中男同官方标签：male:yaoi
  const yaoiCard = {
    title_raw: 'Normal Title',
    tags: ['female:big breasts', 'male:yaoi'],
  };
  assert.strictEqual(d.isBlockedEdition(yaoiCard).blocked, true, '中文「男同」成功拦截 male:yaoi');

  // 2. 命中男同行为标签：male:male on male
  const momCard = {
    title_raw: 'Another Story',
    tags: ['male:male on male'],
  };
  assert.strictEqual(d.isBlockedEdition(momCard).blocked, true, '中文「男同」成功拦截 male:male on male');

  // 3. 标题直接包含中文屏蔽词，无标签也能拦截
  const titleGayCard = {
    title_raw: '[作者] 某某故事 [男同汉化]',
    tags: [],
  };
  assert.strictEqual(d.isBlockedEdition(titleGayCard).blocked, true, '标题含男同词直接前置拦截');

  // 4. 普通异性向作品绝对零误伤（哪怕含 male 命名空间或类似拼写）
  const heteroCard = {
    title_raw: '[Circle] Pure Hetero Story',
    tags: ['female:big breasts', 'female:milf', 'male:sole male', 'female:blindfold', 'female:blonde hair'],
  };
  assert.strictEqual(d.isBlockedEdition(heteroCard).blocked, false, '普通异性向本子绝不误伤');

  // 5. 配置填裸词 scat，自动通配 female:scat 与 male:scat
  d.config.hate_tags = ['scat'];
  const scatCard = {
    title_raw: 'Weird Story',
    tags: ['female:scat'],
  };
  assert.strictEqual(d.isBlockedEdition(scatCard).blocked, true, '裸词 scat 通配 female:scat');
});

if (!process.exitCode) {
  console.log('All tests passed (' + passed + ')');
} else {
  console.error('Some tests failed');
}
