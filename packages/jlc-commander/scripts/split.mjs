import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const srcFile = path.join(pkgRoot, 'dist', 'creamu-jlc.user.js');
const partsDir = path.join(pkgRoot, 'src', 'parts');
const manifestFile = path.join(pkgRoot, 'src', 'parts.manifest.json');
const monorepoRoot = path.resolve(pkgRoot, '../..');

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

const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const [headerPart, ...bodyParts] = manifest.parts;
if (!headerPart || !bodyParts.length) {
  throw new Error('manifest must contain a header and at least one body part');
}

const boundaries = bodyParts.map((part, index) => {
  if (index === 0) return { part, start: 0 };
  const current = fs.readFileSync(path.join(partsDir, part), 'utf8');
  const marker = current.match(/^\/\/ @@creamu-part:[^\r\n]+/m)?.[0];
  if (!marker) throw new Error('part marker missing: ' + part);
  const start = body.indexOf(marker);
  if (start < 0) throw new Error('part marker not found in dist: ' + marker);
  return { part, start };
});

for (let index = 1; index < boundaries.length; index += 1) {
  if (boundaries[index].start <= boundaries[index - 1].start) {
    throw new Error('part markers are out of order: ' + boundaries[index].part);
  }
}

const sources = new Map();
boundaries.forEach((entry, index) => {
  const end = boundaries[index + 1]?.start ?? body.length;
  let source = body.slice(entry.start, end);
  const sharedFiles = manifest.injectAfter?.[entry.part] || [];
  const injectedSource = sharedFiles.map((relativePath) => {
    const shared = fs.readFileSync(path.join(monorepoRoot, relativePath), 'utf8');
    return shared.endsWith('\n') ? shared : shared + '\n';
  }).join('');
  if (injectedSource) {
    if (!source.endsWith(injectedSource)) {
      throw new Error('dist shared sources differ after ' + entry.part + '; run the JLC build before split');
    }
    source = source.slice(0, -injectedSource.length);
  }
  sources.set(entry.part, source);
});

fs.mkdirSync(partsDir, { recursive: true });
fs.writeFileSync(path.join(partsDir, headerPart), header);
bodyParts.forEach((part) => fs.writeFileSync(path.join(partsDir, part), sources.get(part)));

console.log('split OK');
console.log(manifest.parts.map((p) => p + ' ' + fs.statSync(path.join(partsDir, p)).size).join('\n'));
