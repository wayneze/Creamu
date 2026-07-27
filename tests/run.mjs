import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const files = [
  'tests/shared/workbench-geometry.mjs',
  'tests/shared/workbench-interactions.mjs',
  'tests/shared/workbench-css.mjs',
  'tests/webdav.mjs',
  'tests/exh/test-domain.mjs',
  'tests/exh/list-storage.mjs',
  'tests/exh/module-boundaries.mjs',
  'tests/exh/workbench-modules.mjs',
  'tests/exh/tracking-ui.mjs',
  'tests/jlc/core.mjs',
  'tests/jlc/list-runtime.mjs',
  'tests/jlc/dom-scanning.mjs',
  'tests/jlc/idb-batching.mjs',
  'tests/jlc/library-sync.mjs',
  'tests/jlc/resource-services.mjs',
  'tests/jlc/tracking-search-modules.mjs',
  'tests/jlc/tracking-state-modules.mjs',
  'tests/jlc/resource-center-modules.mjs',
  'tests/jlc/data-portability.mjs',
  'tests/jlc/meta-fetching.mjs',
  'tests/jlc/meta-scheduling.mjs',
  'tests/jlc/workbench-navigation.mjs',
  'tests/scout/page-runtime.mjs',
  'tests/scout/lifecycle.mjs',
  'tests/scout/preview-runtime.mjs',
  'tests/scout/list-enhancements.mjs',
  'tests/scout/detail-enhancements.mjs',
  'tests/scout/workbench-pages.mjs',
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
