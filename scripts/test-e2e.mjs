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

run('npm', ['run', 'build']);
run(process.execPath, ['scripts/check-dist.mjs']);
run(process.execPath, ['tests/e2e/workbench.mjs']);
