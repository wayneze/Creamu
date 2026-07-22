import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const root = process.cwd();

function run(command, args) {
  const executable = command === 'npm' && process.env.npm_execpath ? process.execPath : command;
  const commandArgs = executable === process.execPath && command === 'npm'
    ? [process.env.npm_execpath, ...args]
    : args;
  const result = spawnSync(executable, commandArgs, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

// Builds are the public smoke test and validate generated userscript syntax.
run('npm', ['run', 'build']);

// Published userscripts must match the checked-in build output.
run(process.execPath, ['scripts/check-dist.mjs']);

// Public contract tests always run in clean checkouts and CI.
run(process.execPath, ['tests/run.mjs']);

// Private fixtures stay out of the repository; run them when available locally.
if (existsSync('private/tests/run-all.mjs')) {
  run(process.execPath, ['private/tests/run-all.mjs']);
} else {
  console.log('Private tests not present; public build smoke tests completed.');
}
