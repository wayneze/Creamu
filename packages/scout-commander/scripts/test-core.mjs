/**
 * Scout 核心数据层单测（mock GM storage，无浏览器）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createContext, runInContext } from 'vm';
import assert from 'assert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const partsDir = path.join(pkgRoot, 'src', 'parts');

const store = new Map();
const gm = {
  GM_getValue(key, def) {
    return store.has(key) ? store.get(key) : def;
  },
  GM_setValue(key, val) {
    store.set(key, val);
  },
};

function loadCore() {
  store.clear();
  const coreSrc = fs.readFileSync(path.join(partsDir, '10-core.js'), 'utf8');
  const sandbox = {
    ...gm,
    console,
    Date,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Set,
    Map,
    Error,
    createCreamuWebDavSync: undefined,
    scoutSync: null,
  };
  const ctx = createContext(sandbox);
  // 10-core 依赖 triggerWebDavDirty / createCreamuWebDavSync，已在 sandbox 提供
  runInContext(coreSrc, ctx, { filename: '10-core.js' });
  return ctx;
}

function loadSitesHelpers() {
  // 仅测纯函数：videoIdFromUrl / applyListPageToUrl（需 mock location）
  const sitesSrc = fs.readFileSync(path.join(partsDir, '20-sites.js'), 'utf8');
  const sandbox = {
    console,
    location: {
      hostname: 'www.xvideos.com',
      href: 'https://www.xvideos.com/?k=test&p=2',
      pathname: '/',
      search: '?k=test&p=2',
      origin: 'https://www.xvideos.com',
    },
    URL,
    URLSearchParams,
    document: { querySelectorAll: () => [], querySelector: () => null },
  };
  const ctx = createContext(sandbox);
  runInContext(sitesSrc, ctx, { filename: '20-sites.js' });
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

console.log('Scout core tests');

test('addLexiconTerm 新建与去重合并', () => {
  const ctx = loadCore();
  const a = ctx.addLexiconTerm({ text: '  Stepmom  ', zh: '继母', type: '家庭类' });
  assert.ok(a && a.id);
  assert.strictEqual(a.text, 'Stepmom');
  assert.strictEqual(a.zh, '继母');
  const b = ctx.addLexiconTerm({ text: 'stepmom', zh: '', type: '未分类' });
  assert.strictEqual(b.id, a.id);
  assert.strictEqual(b.zh, '继母');
  assert.ok(b.heat >= 2);
  assert.strictEqual(ctx.getLexiconTerms().length, 1);
});

test('importLexiconPackage note 为空不崩溃', () => {
  const ctx = loadCore();
  ctx.addLexiconTerm({ text: 'anal', zh: '' });
  const pkg = JSON.stringify({
    format: 'creamu-scout-lexicon',
    version: 1,
    terms: [{ text: 'anal', zh: '后庭', note: 'from import' }],
    blocks: [{ text: 'spam', reason: 'test' }],
    publishers: [],
    types: ['行为类'],
  });
  assert.strictEqual(ctx.importLexiconPackage(pkg), true);
  const t = ctx.getLexiconTerms().find(x => x.text.toLowerCase() === 'anal');
  assert.ok(t);
  assert.strictEqual(t.zh, '后庭');
  assert.ok((t.note || '').includes('from import'));
  // 再次导入：existing.note 有值；再导入无 note 的 block/term 也不崩
  assert.strictEqual(
    ctx.importLexiconPackage(
      JSON.stringify({
        format: 'creamu-scout-lexicon',
        terms: [{ text: 'anal', note: 'from import' }],
        blocks: [{ text: 'spam', reason: 'test' }],
      })
    ),
    true
  );
});

test('addTrack 同站同 query 去重', () => {
  const ctx = loadCore();
  const t1 = ctx.addTrack({ site: 'xvideos', query: 'milf', label: 'A', url: 'https://www.xvideos.com/?k=milf' });
  const t2 = ctx.addTrack({ site: 'xvideos', query: 'MILF', label: 'B', url: 'https://www.xvideos.com/?k=milf&p=1' });
  assert.strictEqual(t1.id, t2.id);
  assert.strictEqual(t2.label, 'B');
  assert.strictEqual(ctx.getTracks().length, 1);
});

test('groupTracksByQuery 同词多站折叠', () => {
  const ctx = loadCore();
  ctx.addTrack({ site: 'xvideos', query: 'mom daughter', label: 'L1', url: 'https://www.xvideos.com/?k=mom+daughter' });
  ctx.addTrack({ site: 'xnxx', query: 'Mom AND Daughter', label: 'L2', url: 'https://www.xnxx.com/search/mom' });
  ctx.addTrack({ site: 'eporner', query: 'other', label: 'O', url: 'https://www.eporner.com/search/other/' });
  const groups = ctx.groupTracksByQuery();
  assert.strictEqual(groups.length, 2);
  const g = groups.find((x) => x.key === ctx.normalizeSearchQueryKey('mom daughter'));
  assert.ok(g);
  assert.strictEqual(g.siteCount, 2);
  assert.ok(ctx.findTrackInGroup(g, 'xvideos'));
  assert.ok(ctx.findTrackInGroup(g, 'xnxx'));
  assert.strictEqual(ctx.findTrackInGroup(g, 'eporner'), null);
});

test('deleteTracksByQueryKey 删整组', () => {
  const ctx = loadCore();
  ctx.addTrack({ site: 'xvideos', query: 'milf', label: 'A', url: 'u1' });
  ctx.addTrack({ site: 'xnxx', query: 'MILF', label: 'B', url: 'u2' });
  ctx.addTrack({ site: 'eporner', query: 'teen', label: 'C', url: 'u3' });
  const n = ctx.deleteTracksByQueryKey('milf');
  assert.strictEqual(n, 2);
  assert.strictEqual(ctx.getTracks().length, 1);
  assert.strictEqual(ctx.getTracks()[0].query, 'teen');
});

test('orderSitesCurrentFirst / workSearchQueryFromTitle', () => {
  const ctx = loadCore();
  const o1 = ctx.orderSitesCurrentFirst('xnxx');
  assert.strictEqual(o1[0], 'xnxx');
  assert.strictEqual(o1.length, 3);
  assert.ok(o1.includes('xvideos') && o1.includes('eporner'));
  const o0 = ctx.orderSitesCurrentFirst(null);
  assert.strictEqual(o0[0], 'xvideos');
  assert.strictEqual(o0.join(','), 'xvideos,xnxx,eporner');
  const q = ctx.workSearchQueryFromTitle('Hot Mom 1080p Full Video XXX - Studio');
  assert.ok(!/1080p/i.test(q));
  assert.ok(!/xxx/i.test(q));
  assert.ok(q.toLowerCase().includes('hot'));
  assert.ok(q.toLowerCase().includes('mom'));
});

test('block / publisher CRUD', () => {
  const ctx = loadCore();
  const b = ctx.addBlockWord({ text: 'stepsis', mode: 'hide', reason: 'nope' });
  assert.ok(b.id);
  ctx.addBlockWord({ text: 'stepsis', mode: 'dim' });
  assert.strictEqual(ctx.getBlockList().length, 1);
  assert.strictEqual(ctx.getBlockList()[0].mode, 'dim');

  const p = ctx.addPublisher({ name: 'StudioX', site: 'xvideos', status: 'loved' });
  assert.ok(p.id);
  ctx.addPublisher({ name: 'studiox', status: 'blocked' });
  assert.strictEqual(ctx.getPublishers().length, 1);
  assert.strictEqual(ctx.getPublishers()[0].status, 'blocked');
  assert.ok(ctx.deletePublisher(p.id));
  assert.strictEqual(ctx.getPublishers().length, 0);
});

test('exportLexiconPackage 格式', () => {
  const ctx = loadCore();
  ctx.addLexiconTerm({ text: 'a', zh: '甲' });
  ctx.addTrack({ site: 'xvideos', query: 'milf', label: 'M', url: 'https://www.xvideos.com/?k=milf' });
  ctx.updateTrack(ctx.getTracks()[0].id, { last_seen_item: 'vid_1', last_seen_page: 4 });
  ctx.markVideoClicked({ site: 'xvideos', videoId: '/video.abc/title', title: 'T', url: 'https://www.xvideos.com/video.abc/title' });
  const raw = ctx.exportLexiconPackage();
  const pkg = JSON.parse(raw);
  assert.strictEqual(pkg.format, 'creamu-scout-lexicon');
  assert.ok(Array.isArray(pkg.terms));
  assert.ok(pkg.terms.length >= 1);
  assert.ok(Array.isArray(pkg.tracks), 'export 须含 tracks（追更断点）');
  assert.strictEqual(pkg.tracks.length, 1);
  assert.strictEqual(pkg.tracks[0].last_seen_page, 4);
  assert.strictEqual(pkg.tracks[0].last_seen_item, 'vid_1');
  assert.ok(Array.isArray(pkg.clicks), 'export 须含 clicks（已点片库，与断点分离）');
  assert.strictEqual(pkg.clicks.length, 1);
  assert.strictEqual(pkg.clicks[0].id, '/video.abc/title');
});

test('词库+屏蔽 合包导出导入', () => {
  const ctx = loadCore();
  ctx.addLexiconTerm({ text: 'milf', zh: '', type: '人物类' });
  ctx.addBlockWord({ text: 'scat', mode: 'hide', match: 'word', scope: 'title' });
  const raw = ctx.exportAiLexiconPackage();
  const pkg = JSON.parse(raw);
  assert.strictEqual(pkg.format, 'creamu-scout-ai');
  assert.ok(Array.isArray(pkg.terms) && pkg.terms.length >= 1);
  assert.ok(Array.isArray(pkg.blocks) && pkg.blocks.length >= 1);
  pkg.terms[0].zh = '熟女';
  pkg.terms.push({ text: 'teen', zh: '年轻', type: '人物类' });
  pkg.blocks[0].reason = 'AI标注';
  pkg.blocks.push({ text: 'gore', mode: 'hide', match: 'word', scope: 'title' });
  const r = ctx.importAiLexiconPackage(JSON.stringify(pkg));
  assert.ok(r && r.terms >= 1 && r.blocks >= 1);
  assert.strictEqual(ctx.getLexiconTerms().find(t => t.text === 'milf').zh, '熟女');
  assert.ok(ctx.getLexiconTerms().some(t => t.text === 'teen'));
  assert.ok(ctx.getBlockList().some(b => b.text === 'gore'));
});

test('joinComboQuery and/space/or', () => {
  const ctx = loadCore();
  assert.strictEqual(ctx.joinComboQuery(['daughter', 'mom'], 'and'), 'daughter and mom');
  assert.strictEqual(ctx.joinComboQuery(['daughter', 'mom'], 'space'), 'daughter mom');
  assert.strictEqual(ctx.joinComboQuery(['a', 'b'], 'or'), 'a or b');
  assert.strictEqual(ctx.joinComboQuery(['step mom', 'lesbian'], 'and'), 'step mom and lesbian');
  assert.strictEqual(ctx.joinComboQuery(['only'], 'and'), 'only');
});

test('AI 包：blocks 误写正则 / terms 用于屏蔽 会纠正', () => {
  const ctx = loadCore();
  const pkg = {
    format: 'creamu-scout-ai',
    terms: [
      { text: 'daughter', zh: '女儿', type: '家庭类' },
      { text: 'black', zh: '黑人', type: '人物类', note: '用于屏蔽' }
    ],
    blocks: [
      {
        reason: '种族屏蔽',
        mode: 'block',
        match: 'black|negro|nigger',
        scope: 'all'
      }
    ]
  };
  const r = ctx.importAiLexiconPackage(JSON.stringify(pkg));
  assert.ok(r);
  assert.ok(ctx.getLexiconTerms().some(t => t.text === 'daughter'));
  assert.ok(!ctx.getLexiconTerms().some(t => t.text === 'black'), '用于屏蔽不应进词库');
  const blocks = ctx.getBlockList();
  assert.ok(blocks.some(b => b.text === 'black' && b.mode === 'hide' && b.scope === 'both'));
  assert.ok(blocks.some(b => b.text === 'negro'));
  assert.ok(blocks.some(b => b.text === 'nigger'));
});

test('matchLexiconHits 词库命中中文与心动', () => {
  const ctx = loadCore();
  ctx.addLexiconTerm({ text: 'mom', zh: '妈妈', type: '家庭类', loved: true });
  ctx.addLexiconTerm({ text: 'daughter', zh: '女儿', type: '家庭类' });
  ctx.addLexiconTerm({ text: 'unrelated', zh: '无关', type: '未分类' });
  const r = ctx.matchLexiconHits({
    title: 'Hot mom and daughter scene',
    tags: ['mom', 'lesbian'],
    uploader: ''
  });
  assert.ok(r.total >= 2);
  assert.ok(r.lovedCount >= 1);
  assert.ok(r.hits.some((h) => h.label === '妈妈' && h.loved));
  assert.ok(r.hits.some((h) => h.text === 'daughter' && h.label === '女儿'));
  assert.ok(!r.hits.some((h) => h.text === 'unrelated'));
  // 实测 xvideos 标签形态 hot-mom / stepmom
  const r2 = ctx.matchLexiconHits({
    title: 'clip',
    tags: ['hot-mom', 'stepmom', 'condom-size']
  });
  assert.ok(r2.hits.some((h) => h.text === 'mom'), 'hot-mom/stepmom 应命中 mom');

  // 真实片：Step Daughter 标题 + mom 标签；stepdaughter 紧凑形也要命中
  ctx.addLexiconTerm({ text: 'stepdaughter', zh: '继女', type: '家庭类' });
  const r3 = ctx.matchLexiconHits({
    title: 'Cherie DeVille and her tiny Step Daughter Kennedy Kressler',
    tags: ['mom', 'milf', 'lesbian'],
    url: 'https://www.xvideos.com/video.huioubd2027/cherie_deville_and_her_tiny_step_daughter_kennedy_kressler'
  });
  assert.ok(r3.hits.some((h) => h.text === 'mom'), '标签 mom');
  assert.ok(r3.rawHits.some((h) => h.text === 'daughter'), '原始命中含 daughter');
  assert.ok(r3.rawHits.some((h) => h.text === 'stepdaughter'), '原始命中含 stepdaughter');
  // 展示去重后：daughter 族只留一条更具体的
  const daughterFamily = r3.hits.filter((h) => /daughter/i.test(h.text));
  assert.strictEqual(daughterFamily.length, 1, '展示侧 daughter 族只一条');
  assert.ok(
    daughterFamily[0].text === 'stepdaughter' || daughterFamily[0].text === 'step daughter',
    '展示优先继女'
  );
});

test('dedupeLexiconHits 去重同族词', () => {
  const ctx = loadCore();
  const raw = [
    { text: 'mom', zh: '妈妈', loved: false, heat: 10 },
    { text: 'stepmom', zh: '继母', loved: false, heat: 2 },
    { text: 'daughter', zh: '女儿', loved: false, heat: 9 },
    { text: 'stepdaughter', zh: '继女', loved: true, heat: 2 },
    { text: 'step daughter', zh: '继女', loved: false, heat: 1 },
    { text: 'lesbian', zh: '女同', loved: false, heat: 3 }
  ];
  const d = ctx.dedupeLexiconHitsForDisplay(raw);
  const texts = d.map((h) => h.text);
  assert.ok(texts.includes('stepmom'), '留继母');
  assert.ok(!texts.includes('mom'), '去掉被覆盖的妈妈');
  assert.ok(
    texts.includes('stepdaughter') || texts.includes('step daughter'),
    '留继女'
  );
  assert.ok(!texts.includes('daughter'), '去掉被覆盖的女儿');
  assert.ok(texts.includes('lesbian'), '无关词保留');
});

test('作品收藏 addWork 并采集标签', () => {
  const ctx = loadCore();
  const r = ctx.addWork(
    {
      site: 'xvideos',
      videoId: '/video.abc/title',
      title: 'Demo',
      url: 'https://www.xvideos.com/video.abc/title',
      tags: ['mom', 'daughter', 'lesbian']
    },
    { autoCollectTags: true }
  );
  assert.ok(r.work && r.added);
  assert.ok(r.tagsCollected >= 3);
  assert.strictEqual(ctx.getWorks().length, 1);
  assert.ok(ctx.isWorkSaved('xvideos', '/video.abc/title'));
  assert.ok(ctx.getLexiconTerms().some((t) => t.text === 'mom'));
  assert.ok(ctx.removeWork(r.work.id));
  assert.strictEqual(ctx.getWorks().length, 0);
});

test('sanitize 清洗 ＋✕ 噪声', () => {
  const ctx = loadCore();
  assert.strictEqual(ctx.sanitizeLexiconText('anal＋✕'), 'anal');
  assert.strictEqual(ctx.sanitizeLexiconText('  teen + '), 'teen');
  assert.strictEqual(ctx.sanitizeLexiconText('❤️ mom'), 'mom');
});

test('自动采集拒绝过宽词与 ＋✕ 脏标签', () => {
  const ctx = loadCore();
  const r = ctx.addWork(
    {
      site: 'xvideos',
      videoId: '/video.wide/tags',
      title: 'Wide',
      url: 'https://www.xvideos.com/video.wide/tags',
      tags: ['mom', 'sex', 'hd', 'young', 'step', 'anal＋✕', 'hardcore', 'daughter']
    },
    { autoCollectTags: true }
  );
  assert.ok(r.work);
  const texts = ctx.getLexiconTerms().map((t) => t.text.toLowerCase());
  assert.ok(texts.includes('mom'));
  assert.ok(texts.includes('daughter'));
  assert.ok(texts.includes('anal'), 'anal＋✕ 应清洗后入库为 anal');
  assert.ok(!texts.includes('sex'), 'sex 过宽不采集');
  assert.ok(!texts.includes('hd'), 'hd 不采集');
  assert.ok(!texts.includes('young'), 'young 不采集');
  assert.ok(!texts.includes('step'), 'step 单独不采集');
  assert.ok(!texts.includes('hardcore'), 'hardcore 不采集');
  assert.ok(!texts.some((t) => t.includes('＋') || t.includes('✕')), '词库不得含 UI 噪声');
});

test('覆盖导入默认删除包外旧词并保留热度', () => {
  const ctx = loadCore();
  ctx.addLexiconTerm({ text: 'mom', zh: '旧妈', type: '家庭类' });
  // 抬高 heat/use
  const t = ctx.getLexiconTerms().find((x) => x.text === 'mom');
  t.heat = 20;
  t.use = 7;
  ctx.saveLexiconTerms(ctx.getLexiconTerms());
  ctx.addLexiconTerm({ text: 'sex', zh: '过宽旧词', type: '未分类' });
  ctx.addBlockWord({ text: 'black', mode: 'hide', reason: '旧' });
  ctx.addBlockWord({ text: 'obsolete', mode: 'dim', reason: '包外屏蔽' });

  const pkg = {
    format: 'creamu-scout-ai',
    terms: [
      { text: 'mom', zh: '妈妈', type: '家庭类', status: 'confirmed', heat: 1 },
      { text: 'daughter', zh: '女儿', type: '家庭类' }
    ],
    blocks: [
      { text: 'black', zh: '黑人', reason: '种族', mode: 'hide', match: 'word', scope: 'both' }
    ]
  };
  const r = ctx.importAiLexiconPackage(JSON.stringify(pkg)); // 默认 replace
  assert.ok(r);
  assert.strictEqual(r.mode, 'replace');
  const terms = ctx.getLexiconTerms();
  assert.strictEqual(terms.length, 2);
  assert.ok(!terms.some((x) => x.text === 'sex'), '包外旧词应删除');
  const mom = terms.find((x) => x.text === 'mom');
  assert.ok(mom);
  assert.strictEqual(mom.zh, '妈妈');
  assert.strictEqual(mom.heat, 20, '本地热度应保留');
  assert.strictEqual(mom.use, 7);
  assert.ok(terms.some((x) => x.text === 'daughter'));
  const blocks = ctx.getBlockList();
  assert.ok(blocks.some((b) => b.text === 'black'));
  assert.ok(!blocks.some((b) => b.text === 'obsolete'), '包外旧屏蔽应删除');
});

test('导入按 identity 合并重复且清洗脏 text', () => {
  const ctx = loadCore();
  ctx.addLexiconTerm({ text: 'mom', zh: '妈妈', type: '家庭类', heat: 3 });
  // 模拟历史脏数据直接写入
  const raw = ctx.getLexiconTerms();
  raw.push({
    id: 'term_dup1',
    text: 'Mom',
    zh: '',
    type: '未分类',
    heat: 2,
    use: 1,
    good: 0,
    bad: 0,
    status: 'unreviewed'
  });
  raw.push({
    id: 'term_dup2',
    text: 'mom＋✕',
    zh: '',
    type: '未分类',
    heat: 1,
    use: 0,
    good: 0,
    bad: 0,
    status: 'unreviewed'
  });
  ctx.saveLexiconTerms(raw);
  assert.ok(ctx.getLexiconTerms().length >= 3);

  const pkg = {
    format: 'creamu-scout-ai',
    terms: [
      { text: 'mom', zh: '妈咪', type: '家庭类', status: 'confirmed' },
      { text: 'MOM', zh: '妈妈', type: '家庭类' },
      { text: 'daughter', zh: '女儿', type: '家庭类' }
    ],
    blocks: []
  };
  const r = ctx.importAiLexiconPackage(JSON.stringify(pkg));
  assert.ok(r);
  const moms = ctx.getLexiconTerms().filter((t) => t.text.toLowerCase() === 'mom');
  assert.strictEqual(moms.length, 1, 'mom 只应一条');
  assert.ok(moms[0].zh === '妈咪' || moms[0].zh === '妈妈');
  assert.ok(ctx.getLexiconTerms().some((t) => t.text === 'daughter'));
  assert.ok(!ctx.getLexiconTerms().some((t) => /[＋✕]/.test(t.text || '')));
});

test('dedupeLexiconTermsStore 压掉本地重复', () => {
  const ctx = loadCore();
  ctx.saveLexiconTerms([
    { id: 'a', text: 'sister', zh: '姐', type: '家庭类', heat: 1, use: 0, status: 'confirmed' },
    { id: 'b', text: 'Sister', zh: '姐姐/妹妹', type: '家庭类', heat: 4, use: 2, status: 'confirmed' },
    { id: 'c', text: 'sister＋✕', zh: '', type: '未分类', heat: 1, use: 0, status: 'unreviewed' }
  ]);
  const n = ctx.dedupeLexiconTermsStore();
  assert.ok(n >= 2);
  assert.strictEqual(ctx.getLexiconTerms().length, 1);
  assert.strictEqual(ctx.getLexiconTerms()[0].text.toLowerCase(), 'sister');
  assert.ok(ctx.getLexiconTerms()[0].zh);
});

test('purgeBlockedTermsFromLexicon 踢出已在屏蔽表的词', () => {
  const ctx = loadCore();
  ctx.addLexiconTerm({ text: 'black', zh: '黑人', type: '人物类' });
  ctx.addLexiconTerm({ text: 'mom', zh: '妈妈', type: '家庭类' });
  ctx.addBlockWord({ text: 'black', mode: 'hide', match: 'word', scope: 'both', reason: '种族' });
  const n = ctx.purgeBlockedTermsFromLexicon();
  assert.ok(n >= 1);
  assert.ok(!ctx.getLexiconTerms().some(t => t.text === 'black'));
  assert.ok(ctx.getLexiconTerms().some(t => t.text === 'mom'));
  assert.ok(ctx.getBlockList().some(b => b.text === 'black'));
});

test('已点片库 mark/is/merge 与断点独立', () => {
  const ctx = loadCore();
  assert.strictEqual(ctx.getClickedCount(), 0);
  ctx.markVideoClicked({ site: 'xnxx', videoId: '/video-1', title: 'A' });
  ctx.markVideoClicked({ site: 'xnxx', videoId: '/video-1', title: 'A2' }); // 再点不重复计数
  assert.strictEqual(ctx.getClickedCount(), 1);
  assert.ok(ctx.isVideoClicked('xnxx', '/video-1'));
  assert.ok(!ctx.isVideoClicked('xnxx', '/video-2'));
  // 断点 tracks 为空
  assert.strictEqual(ctx.getTracks().length, 0);
  ctx.mergeClickRecords([{ site: 'xnxx', id: '/video-2', title: 'B', clicked_at: new Date().toISOString() }]);
  assert.strictEqual(ctx.getClickedCount(), 2);
});

test('importLexiconPackage 合并 tracks 断点', () => {
  const ctx = loadCore();
  ctx.addTrack({ site: 'xvideos', query: 'teen', label: 'T', url: 'https://www.xvideos.com/?k=teen' });
  const id = ctx.getTracks()[0].id;
  ctx.updateTrack(id, { last_seen_page: 2, last_seen_item: 'old' });
  const pkg = {
    format: 'creamu-scout-lexicon',
    version: 2,
    tracks: [{
      site: 'xvideos',
      query: 'teen',
      label: 'T2',
      url: 'https://www.xvideos.com/?k=teen',
      last_seen_page: 5,
      last_seen_item: 'new_vid',
      updated_at: new Date(Date.now() + 1000).toISOString()
    }]
  };
  assert.ok(ctx.importLexiconPackage(JSON.stringify(pkg)));
  const t = ctx.getTracks()[0];
  assert.strictEqual(t.last_seen_page, 5);
  assert.strictEqual(t.last_seen_item, 'new_vid');
});

test('getEffectiveHeat 衰减', () => {
  const ctx = loadCore();
  const heat = ctx.getEffectiveHeat({
    heat: 100,
    last_used_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  });
  assert.ok(heat < 100);
  assert.ok(heat > 50);
});

console.log('\nScout sites helpers');

test('applyListPageToUrl xvideos 0-based', () => {
  const ctx = loadSitesHelpers();
  const u = ctx.applyListPageToUrl('https://www.xvideos.com/?k=test', 'xvideos', 3);
  assert.ok(u.includes('p=2'), 'page3 → p=2, got ' + u);
  const u1 = ctx.applyListPageToUrl('https://www.xvideos.com/?k=test', 'xvideos', 1);
  assert.ok(u1.includes('p=0'), 'page1 → p=0, got ' + u1);
});

test('applyListPageToUrl eporner 路径分页', () => {
  const ctx = loadSitesHelpers();
  // 改版后分页是 /tag/q/N/，不是 ?page=
  const u = ctx.applyListPageToUrl('https://www.eporner.com/tag/mom/', 'eporner', 4);
  assert.ok(/\/tag\/mom\/4\/?$/.test(new URL(u).pathname), 'got ' + u);
  assert.ok(!/[?&]page=/.test(u), '不应写无效 ?page=');
  const u1 = ctx.applyListPageToUrl('https://www.eporner.com/tag/step-mom/', 'eporner', 1);
  assert.ok(/\/tag\/step-mom\/?$/.test(new URL(u1).pathname), 'page1: ' + u1);
});

test('eporner 路径解析 /tag /search 与 slug', () => {
  const ctx = loadSitesHelpers();
  const p1 = ctx.parseEpornerListPath('/tag/mom/');
  assert.strictEqual(p1.query, 'mom');
  assert.strictEqual(p1.page, 1);
  const p2 = ctx.parseEpornerListPath('/tag/mom/2/');
  assert.strictEqual(p2.query, 'mom');
  assert.strictEqual(p2.page, 2);
  const p3 = ctx.parseEpornerListPath('/tag/mom-and-daughter/');
  assert.strictEqual(p3.query, 'mom and daughter');
  assert.strictEqual(ctx.epornerQueryToSlug('mom and daughter'), 'mom-and-daughter');
  assert.strictEqual(ctx.epornerQueryToSlug('Step Mom'), 'step-mom');
});

test('xnxx 搜索路径解析 + 路径分页 URL', () => {
  const ctx = loadSitesHelpers();
  const p1 = ctx.parseXnxxSearchPath('/search/mom');
  assert.strictEqual(p1.query, 'mom');
  assert.strictEqual(p1.page, 1);
  const p2 = ctx.parseXnxxSearchPath('/search/mom/2');
  assert.strictEqual(p2.query, 'mom');
  assert.strictEqual(p2.page, 2);
  const p3 = ctx.parseXnxxSearchPath('/search/mom+and+daughter/3');
  assert.strictEqual(p3.query, 'mom and daughter');
  assert.strictEqual(p3.page, 3);
  // 旧逻辑会把 0-10min 当成 query
  const p4 = ctx.parseXnxxSearchPath('/search/0-10min/mom');
  assert.strictEqual(p4.query, 'mom');
  assert.ok(p4.filters.includes('0-10min'));

  const u = ctx.applyListPageToUrl('https://www.xnxx.com/search/mom', 'xnxx', 3);
  assert.ok(/\/search\/mom\/3/.test(u), 'xnxx page3 路径分页, got ' + u);
  assert.ok(!/[?&]p=/.test(u), 'xnxx 不应写无效 ?p=');
  const u1 = ctx.applyListPageToUrl('https://www.xnxx.com/search/mom+and+daughter', 'xnxx', 1);
  assert.ok(/\/search\/mom\+and\+daughter\/?$/.test(new URL(u1).pathname), 'page1 无页码段: ' + u1);
});

test('videoIdFromUrl 短 id + videoIdsMatch 兼容旧 path', () => {
  const ctx = loadSitesHelpers();
  assert.strictEqual(
    ctx.videoIdFromUrl('https://www.xnxx.com/video-1h4gc1b7/some_slug'),
    '1h4gc1b7'
  );
  assert.strictEqual(
    ctx.videoIdFromUrl('https://www.xvideos.com/video.oohdvlee3fe/title'),
    'oohdvlee3fe'
  );
  assert.ok(
    ctx.videoIdsMatch(
      '1h4gc1b7',
      '/video-1h4gc1b7/some_slug'
    ),
    '短 id 应匹配旧 pathname 断点'
  );
});

test('parseListPage xvideos p=2 → 3', () => {
  const sitesSrc = fs.readFileSync(path.join(partsDir, '20-sites.js'), 'utf8');
  const sandbox = {
    console,
    location: {
      hostname: 'www.xvideos.com',
      href: 'https://www.xvideos.com/?k=test&p=2',
      pathname: '/',
      search: '?k=test&p=2',
      origin: 'https://www.xvideos.com',
    },
    URL,
    URLSearchParams,
    document: { querySelectorAll: () => [], querySelector: () => null },
  };
  const ctx = createContext(sandbox);
  runInContext(sitesSrc, ctx, { filename: '20-sites.js' });
  assert.strictEqual(ctx.parseListPage('xvideos'), 3);
});

test('parseListPage eporner /tag/q/2/ → 2', () => {
  const sitesSrc = fs.readFileSync(path.join(partsDir, '20-sites.js'), 'utf8');
  const sandbox = {
    console,
    location: {
      hostname: 'www.eporner.com',
      href: 'https://www.eporner.com/tag/mom/2/',
      pathname: '/tag/mom/2/',
      search: '',
      origin: 'https://www.eporner.com',
    },
    URL,
    URLSearchParams,
    document: { querySelectorAll: () => [], querySelector: () => null },
  };
  const ctx = createContext(sandbox);
  runInContext(sitesSrc, ctx, { filename: '20-sites.js' });
  assert.strictEqual(ctx.parseListPage('eporner'), 2);
});

test('videoIdFromUrl', () => {
  const ctx = loadSitesHelpers();
  assert.strictEqual(
    ctx.videoIdFromUrl('https://www.xvideos.com/video.abc123/title'),
    'abc123'
  );
});

console.log('\nBlock matching');

test('整词匹配：ass 不误伤 class，命中独立词', () => {
  const ctx = loadCore();
  const block = { text: 'ass', match: 'word' };
  assert.strictEqual(ctx.textMatchesBlock('hot class action', block), false);
  assert.strictEqual(ctx.textMatchesBlock('big ass girl', block), true);
  assert.strictEqual(ctx.textMatchesBlock('ASS', block), true);
  assert.strictEqual(ctx.textMatchesBlock('classic', block), false);
});

test('子串匹配：ass 命中 class', () => {
  const ctx = loadCore();
  const block = { text: 'ass', match: 'sub' };
  assert.strictEqual(ctx.textMatchesBlock('classic', block), true);
});

test('blockMatchesVideo 范围 title / uploader / both', () => {
  const ctx = loadCore();
  const meta = { title: 'summer vacation', uploader: 'BadChannel' };
  assert.strictEqual(
    ctx.blockMatchesVideo(meta, { text: 'BadChannel', match: 'word', scope: 'title' }),
    false
  );
  assert.strictEqual(
    ctx.blockMatchesVideo(meta, { text: 'BadChannel', match: 'word', scope: 'uploader' }),
    true
  );
  assert.strictEqual(
    ctx.blockMatchesVideo(meta, { text: 'vacation', match: 'word', scope: 'both' }),
    true
  );
});

test('addBlockWord 写入 match/scope', () => {
  const ctx = loadCore();
  const b = ctx.addBlockWord({ text: 'stepsis', mode: 'hide', match: 'word', scope: 'both' });
  assert.strictEqual(b.match, 'word');
  assert.strictEqual(b.scope, 'both');
  const b2 = ctx.addBlockWord({ text: 'stepsis', match: 'sub', scope: 'title' });
  assert.strictEqual(b2.id, b.id);
  assert.strictEqual(b2.match, 'sub');
  assert.strictEqual(b2.scope, 'title');
});

test('多词短语整词匹配', () => {
  const ctx = loadCore();
  const block = { text: 'step mom', match: 'word' };
  assert.strictEqual(ctx.textMatchesBlock('hot step mom scene', block), true);
  assert.strictEqual(ctx.textMatchesBlock('stepmother', block), false);
});

if (process.exitCode) {
  console.error('\nSome tests failed.');
  process.exit(1);
}
console.log('\nAll tests passed (' + passed + ')');
