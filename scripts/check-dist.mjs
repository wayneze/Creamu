import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assembleUserscript } from './build-userscript.mjs';

const packages = [
  'exh-commander',
  'jlc-commander',
  'scout-commander',
];

const root = process.cwd();
const failures = [];

for (const directory of packages) {
  const packageBuild = path.join(root, 'packages', directory, 'scripts', 'build.mjs');
  const moduleUrl = pathToFileURL(packageBuild).href;
  const expected = assembleUserscript(moduleUrl);
  const actualPath = expected.outputFile;
  if (!fs.existsSync(actualPath)) {
    failures.push(actualPath + ': missing generated artifact');
    continue;
  }
  const actual = fs.readFileSync(actualPath, 'utf8');
  if (actual !== expected.source) {
    failures.push(actualPath + ': differs from the current source assembly');
    continue;
  }
  console.log(path.relative(root, actualPath) + ' synchronized (' + expected.source.length + ' bytes)');
}

if (failures.length) {
  for (const failure of failures) console.error(failure);
  console.error('Generated dist files are stale. Run npm run build and review the diff.');
  process.exit(1);
}

console.log('dist artifacts are synchronized');
