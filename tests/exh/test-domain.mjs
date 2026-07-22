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
    compactText(v) {
      return String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    },
    DEFAULT_CONFIG,
    config: Object.assign({}, DEFAULT_CONFIG),
    location: { origin: 'https://e-hentai.org' },
  };
  const ctx = createContext(sandbox);
  runInContext(src, ctx, { filename: '20-domain.js' });
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

if (!process.exitCode) {
  console.log('All tests passed (' + passed + ')');
} else {
  console.error('Some tests failed');
}
