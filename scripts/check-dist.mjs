import { spawnSync } from 'node:child_process';

const paths = [
  'packages/exh-commander/dist/creamu-exh.user.js',
  'packages/jlc-commander/dist/creamu-jlc.user.js',
  'packages/scout-commander/dist/creamu-scout.user.js',
];

const result = spawnSync('git', ['diff', '--exit-code', '--', ...paths], {
  cwd: process.cwd(),
  stdio: 'inherit',
});

if (result.error) throw result.error;
if (result.status !== 0) {
  console.error('Generated dist files differ from the checked-in artifacts. Run npm run build and review the diff.');
  process.exit(result.status || 1);
}

console.log('dist artifacts are synchronized');
