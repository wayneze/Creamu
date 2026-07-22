import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const files = ['tests/webdav.mjs', 'tests/exh/test-domain.mjs'];

for (const file of files) {
  console.log(`\n>>> ${file}`);
  const result = spawnSync(process.execPath, [path.join(root, file)], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log('\nPublic tests OK');
