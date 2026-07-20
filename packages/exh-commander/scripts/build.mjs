/**
 * 拼接 header + parts + shared webdav → dist/creamu-exh.user.js
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
const outFile = path.join(distDir, 'creamu-exh.user.js');
const manifestPath = path.join(pkgRoot, 'src', 'parts.manifest.json');
const sharedWd = path.join(monorepo, 'packages', 'shared', 'creamu-webdav.js');
const sharedWbCss = path.join(monorepo, 'packages', 'shared', 'creamu-workbench-css.js');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const chunks = [];
for (const name of manifest.parts) {
  const p = path.join(partsDir, name);
  if (!fs.existsSync(p)) throw new Error('missing part: ' + name);
  chunks.push(fs.readFileSync(p, 'utf8'));
  if (name === '10-core.js') {
    if (fs.existsSync(sharedWbCss)) {
      chunks.push(fs.readFileSync(sharedWbCss, 'utf8'));
      if (!String(chunks[chunks.length - 1]).endsWith('\n')) chunks[chunks.length - 1] += '\n';
    }
    if (fs.existsSync(sharedWd)) {
      chunks.push(fs.readFileSync(sharedWd, 'utf8'));
      if (!String(chunks[chunks.length - 1]).endsWith('\n')) chunks[chunks.length - 1] += '\n';
    }
  }
}

let out = chunks.join('');
if (!out.endsWith('\n')) out += '\n';

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(outFile, out);
console.log('build OK ->', outFile, '(' + out.length + ' bytes)');

const check = spawnSync(process.execPath, ['--check', outFile], { encoding: 'utf8' });
if (check.status !== 0) {
  console.error(check.stderr || check.stdout);
  process.exit(1);
}
console.log('syntax OK');
