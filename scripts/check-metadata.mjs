import fs from 'node:fs';
import path from 'node:path';

const packages = [
  ['exh-commander', 'creamu-exh.user.js'],
  ['jlc-commander', 'creamu-jlc.user.js'],
  ['scout-commander', 'creamu-scout.user.js'],
];

function readUserscriptVersion(file) {
  const source = fs.readFileSync(file, 'utf8');
  const match = source.match(/^\/\/ @version\s+(.+)$/m);
  if (!match) throw new Error('Missing @version: ' + file);
  return match[1].trim();
}

for (const [directory, distName] of packages) {
  const root = path.join('packages', directory);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const sourceVersion = readUserscriptVersion(path.join(root, 'src', 'parts', '00-header.meta.js'));
  const distVersion = readUserscriptVersion(path.join(root, 'dist', distName));
  const versions = [manifest.version, sourceVersion, distVersion];
  if (versions.some((version) => version !== manifest.version)) {
    throw new Error(directory + ' version mismatch: ' + versions.join(' / '));
  }
}

console.log('metadata versions OK');
