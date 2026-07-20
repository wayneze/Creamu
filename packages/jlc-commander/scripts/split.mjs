/**
 * dist/creamu-jlc.user.js → src/parts/*
 * 分界：// @@creamu-part:workbench 与 // @@creamu-part:services
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const srcFile = path.join(pkgRoot, 'dist', 'creamu-jlc.user.js');
const partsDir = path.join(pkgRoot, 'src', 'parts');

if (!fs.existsSync(srcFile)) {
  throw new Error('missing dist/creamu-jlc.user.js');
}

const raw = fs.readFileSync(srcFile, 'utf8');
const headerEnd = raw.indexOf('// ==/UserScript==');
if (headerEnd < 0) throw new Error('userscript header not found');
const header = raw.slice(0, headerEnd + '// ==/UserScript=='.length).trimEnd() + '\n';
const body = raw.slice(headerEnd + '// ==/UserScript=='.length).replace(/^\uFEFF?\r?\n/, '');

if (!body.includes('(function () {') && !body.includes('(function(){')) {
  throw new Error('IIFE open not found');
}

const MARK_WB = '// @@creamu-part:workbench';
const MARK_SVC = '// @@creamu-part:services';
let wbStart = body.indexOf(MARK_WB);
let svcStart = body.indexOf(MARK_SVC);

// 兼容旧标记
if (wbStart < 0) {
  const legacy = body.indexOf('// UI v3 工作台');
  if (legacy >= 0) {
    const sec = body.lastIndexOf('// ==========================================', legacy);
    wbStart = sec >= 0 && legacy - sec < 120 ? sec : legacy;
  }
}
if (svcStart < 0) {
  svcStart = body.indexOf('// 弹出提示框');
}

if (wbStart < 0 || svcStart < 0 || svcStart <= wbStart) {
  throw new Error('part markers not found (need @@creamu-part:workbench / @@creamu-part:services)');
}

const beforeWb = body.slice(0, wbStart);
const workbenchAndBoot = body.slice(wbStart, svcStart);
const afterBoot = body.slice(svcStart);

fs.mkdirSync(partsDir, { recursive: true });
fs.writeFileSync(path.join(partsDir, '00-header.meta.js'), header);
fs.writeFileSync(path.join(partsDir, '10-core.js'), beforeWb);
fs.writeFileSync(path.join(partsDir, '20-workbench.js'), workbenchAndBoot);
fs.writeFileSync(path.join(partsDir, '30-services-rest.js'), afterBoot);

const verMatch = header.match(/@version\s+(\S+)/);
const version = verMatch ? verMatch[1] : '0.0.0';
const manifest = {
  version,
  generatedAt: new Date().toISOString(),
  parts: ['00-header.meta.js', '10-core.js', '20-workbench.js', '30-services-rest.js'],
  output: 'dist/creamu-jlc.user.js',
};
fs.writeFileSync(path.join(pkgRoot, 'src', 'parts.manifest.json'), JSON.stringify(manifest, null, 2));
console.log('split OK');
console.log(manifest.parts.map((p) => p + ' ' + fs.statSync(path.join(partsDir, p)).size).join('\n'));
