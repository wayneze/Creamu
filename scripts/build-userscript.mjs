import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const MANIFEST_KEYS = new Set(['parts', 'injectAfter', 'output', 'required']);

function resolveInside(root, relativePath, label) {
  const resolved = path.resolve(root, relativePath);
  const relation = path.relative(root, resolved);
  if (!relation || relation.startsWith('..') || path.isAbsolute(relation)) {
    throw new Error(label + ' must resolve inside ' + root + ': ' + relativePath);
  }
  return resolved;
}

function readSource(file) {
  if (!fs.existsSync(file)) throw new Error('missing source: ' + file);
  const source = fs.readFileSync(file, 'utf8');
  return source.endsWith('\n') ? source : source + '\n';
}

function readManifest(file) {
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const unknownKeys = Object.keys(manifest).filter((key) => !MANIFEST_KEYS.has(key));
  if (unknownKeys.length) throw new Error('unknown manifest keys: ' + unknownKeys.join(', '));
  if (!Array.isArray(manifest.parts) || !manifest.parts.length) {
    throw new Error('manifest.parts must be a non-empty array');
  }
  if (new Set(manifest.parts).size !== manifest.parts.length) {
    throw new Error('manifest.parts contains duplicates');
  }
  if (typeof manifest.output !== 'string' || !manifest.output.endsWith('.user.js')) {
    throw new Error('manifest.output must point to a .user.js file');
  }
  if (manifest.injectAfter != null && typeof manifest.injectAfter !== 'object') {
    throw new Error('manifest.injectAfter must be an object');
  }
  const unknownInjectionPoints = Object.keys(manifest.injectAfter || {})
    .filter((part) => !manifest.parts.includes(part));
  if (unknownInjectionPoints.length) {
    throw new Error('injectAfter references unknown parts: ' + unknownInjectionPoints.join(', '));
  }
  if (manifest.required != null && !Array.isArray(manifest.required)) {
    throw new Error('manifest.required must be an array');
  }
  return manifest;
}

function validateOutput(source, required) {
  const checks = [
    [source.startsWith('// ==UserScript=='), 'userscript header'],
    [source.includes('(function ()') || source.includes('(function()'), 'IIFE open'],
    [/\}\)\(\);\s*$/.test(source) || source.trimEnd().endsWith('})();'), 'IIFE close'],
  ];
  for (const entry of required || []) {
    if (!entry || typeof entry.label !== 'string' || typeof entry.text !== 'string') {
      throw new Error('manifest.required entries need label and text');
    }
    checks.push([source.includes(entry.text), entry.label]);
  }
  const failed = checks.filter(([ok]) => !ok).map(([, label]) => label);
  if (failed.length) throw new Error('build checks failed: ' + failed.join(', '));
  return checks.length;
}

export function buildUserscript(buildModuleUrl) {
  const scriptsDirectory = path.dirname(fileURLToPath(buildModuleUrl));
  const packageRoot = path.resolve(scriptsDirectory, '..');
  const monorepoRoot = path.resolve(packageRoot, '../..');
  const partsRoot = path.join(packageRoot, 'src', 'parts');
  const manifest = readManifest(path.join(packageRoot, 'src', 'parts.manifest.json'));
  const outputFile = resolveInside(packageRoot, manifest.output, 'manifest.output');
  const included = new Set();
  const chunks = [];

  function append(file) {
    const resolved = path.resolve(file);
    if (included.has(resolved)) throw new Error('source included more than once: ' + resolved);
    included.add(resolved);
    chunks.push(readSource(resolved));
  }

  for (const part of manifest.parts) {
    const partFile = resolveInside(partsRoot, part, 'manifest.parts entry');
    append(partFile);
    const sharedFiles = manifest.injectAfter?.[part] || [];
    if (!Array.isArray(sharedFiles)) throw new Error('injectAfter.' + part + ' must be an array');
    for (const sharedFile of sharedFiles) {
      if (typeof sharedFile !== 'string') throw new Error('shared source paths must be strings');
      append(resolveInside(monorepoRoot, sharedFile, 'shared source'));
    }
  }

  const source = chunks.join('');
  const checkCount = validateOutput(source, manifest.required);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, source);

  const syntax = spawnSync(process.execPath, ['--check', outputFile], { encoding: 'utf8' });
  if (syntax.error) throw syntax.error;
  if (syntax.status !== 0) throw new Error((syntax.stderr || syntax.stdout || 'syntax check failed').trim());

  console.log('build OK ->', outputFile, '(' + source.length + ' bytes)');
  console.log('build checks OK (' + checkCount + ')');
  console.log('syntax OK');
}
