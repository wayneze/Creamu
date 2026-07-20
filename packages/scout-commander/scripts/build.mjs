/**
 * 按 parts.manifest.json 拼接 parts → dist/creamu-scout.user.js
 * 10-core 之后注入 monorepo shared（workbench-css / webdav）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const monorepo = path.resolve(pkgRoot, '../..');
const partsDir = path.join(pkgRoot, 'src', 'parts');
const distDir = path.join(pkgRoot, 'dist');
const manifestPath = path.join(pkgRoot, 'src', 'parts.manifest.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const outFile = path.join(pkgRoot, manifest.output || 'dist/creamu-scout.user.js');
const injectAfter = manifest.injectAfter || {
  '10-core.js': [
    'packages/shared/creamu-workbench-css.js',
    'packages/shared/creamu-webdav.js'
  ]
};

const chunks = [];
for (const name of manifest.parts) {
  const p = path.join(partsDir, name);
  if (!fs.existsSync(p)) throw new Error('missing part: ' + name);
  let text = fs.readFileSync(p, 'utf8');
  if (!text.endsWith('\n')) text += '\n';
  chunks.push(text);

  const injects = injectAfter[name];
  if (Array.isArray(injects)) {
    for (const rel of injects) {
      const abs = path.isAbsolute(rel) ? rel : path.join(monorepo, rel);
      if (!fs.existsSync(abs)) {
        console.warn('skip missing shared:', rel);
        continue;
      }
      let shared = fs.readFileSync(abs, 'utf8');
      if (!shared.endsWith('\n')) shared += '\n';
      chunks.push(shared);
    }
  }
}

const out = chunks.join('');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, out);
console.log('build OK ->', outFile, '(' + out.length + ' bytes)');

// 产物完整性检查
const checks = [
  [out.includes('// ==UserScript=='), 'userscript header'],
  [out.includes("(function ()") || out.includes('(function()'), 'IIFE open'],
  [/\}\)\(\);\s*$/.test(out) || out.trimEnd().endsWith('})();'), 'IIFE close'],
  [out.includes('function detectSite'), 'detectSite'],
  [out.includes('function initScoutWorkbench'), 'workbench'],
  [out.includes('function bootCreamuScout'), 'boot'],
  [out.includes('createCreamuWebDavSync') || out.includes('function createCreamuWebDavSync'), 'webdav'],
  [out.includes('getCreamuWorkbenchCss') || out.includes('function getCreamuWorkbenchCss'), 'workbench-css']
];
let failed = 0;
for (const [ok, label] of checks) {
  if (!ok) {
    console.error('build check FAIL:', label);
    failed++;
  }
}
if (failed) process.exit(1);
console.log('build checks OK (' + checks.length + ')');

const check = spawnSync(process.execPath, ['--check', outFile], { encoding: 'utf8' });
if (check.status !== 0) {
  console.error(check.stderr || check.stdout);
  process.exit(1);
}
console.log('syntax OK');
