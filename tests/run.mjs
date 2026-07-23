import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const files = [
  'tests/shared/workbench-geometry.mjs',
  'tests/shared/workbench-interactions.mjs',
  'tests/shared/workbench-css.mjs',
  'tests/webdav.mjs',
  'tests/exh/test-domain.mjs',
  'tests/jlc/core.mjs',
  'tests/jlc/dom-scanning.mjs',
  'tests/jlc/idb-batching.mjs',
  'tests/jlc/meta-fetching.mjs',
  'tests/jlc/meta-scheduling.mjs',
  'packages/scout-commander/scripts/test-core.mjs',
];

for (const file of files) {
  console.log(`\n>>> ${file}`);
  const result = spawnSync(process.execPath, [path.join(root, file)], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log('\nPublic tests OK');
