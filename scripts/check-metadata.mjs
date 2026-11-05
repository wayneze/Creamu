import fs from 'node:fs';
import path from 'node:path';

const { workspaces } = JSON.parse(fs.readFileSync('package.json', 'utf8'));

function readUserscriptVersion(file) {
  const source = fs.readFileSync(file, 'utf8');
  const match = source.match(/^\/\/ @version\s+(.+)$/m);
  if (!match) throw new Error('Missing @version: ' + file);
  return match[1].trim();
}

for (const directory of workspaces) {
  const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'src', 'parts.manifest.json'), 'utf8'));
  const sourceVersion = readUserscriptVersion(path.join(directory, 'src', 'parts', manifest.parts[0]));
  const distVersion = readUserscriptVersion(path.join(directory, manifest.output));
  const versions = [pkg.version, sourceVersion, distVersion];
  if (versions.some((version) => version !== pkg.version)) {
    throw new Error(directory + ' version mismatch: ' + versions.join(' / '));
  }
}

console.log('metadata versions OK');
