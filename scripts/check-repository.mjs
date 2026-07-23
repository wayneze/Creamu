import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const listed = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' });
if (listed.error) throw listed.error;
if (listed.status !== 0) process.exit(listed.status || 1);

const files = listed.stdout.split('\0').filter(Boolean);
const failures = [];
const localPath = /(^|\/)(?:private|\.local|\.notes)(?:\/|$)|(^|\/)(?:notes|drafts)\.local\//i;
const contentChecks = [
  ['Windows user path', /[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s"']+/i],
  ['macOS user path', /\/Users\/[^/\s"']+/],
  ['Linux user path', /\/home\/[^/\s"']+/],
  ['private IPv4 address', /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/],
];

for (const file of files) {
  const normalized = file.replaceAll('\\', '/');
  if (localPath.test(normalized)) failures.push(file + ': local-only path is included');
  if (!fs.existsSync(file) || fs.statSync(file).size > 2_000_000) continue;
  const source = fs.readFileSync(file, 'utf8');
  for (const [label, pattern] of contentChecks) {
    if (pattern.test(source)) failures.push(file + ': ' + label);
  }
}

if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log('repository checks OK (' + files.length + ' files)');
