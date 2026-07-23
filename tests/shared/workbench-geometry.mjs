import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createContext, runInContext } from 'node:vm';

const source = fs.readFileSync(
  path.join(process.cwd(), 'packages/shared/creamu-workbench-geometry.js'),
  'utf8'
);
const context = createContext({});
runInContext(source, context, { filename: 'creamu-workbench-geometry.js' });

console.log('Shared workbench geometry');

assert.equal(context.parseCreamuPixel('42px'), 42);
assert.ok(Number.isNaN(context.parseCreamuPixel('')));
console.log('  OK  pixel parsing');

const viewport = { width: 1440, height: 900 };
const defaults = context.getCreamuDefaultWorkbenchRect(viewport);
assert.equal(defaults.width, 520);
assert.equal(defaults.height, 684);
assert.equal(defaults.left, 872);
assert.equal(defaults.top, 32);
console.log('  OK  default geometry');

const clamped = context.clampCreamuWorkbenchRect({
  left: -100,
  top: 2000,
  width: 2000,
  height: 100,
}, viewport);
assert.equal(clamped.left, 12);
assert.equal(clamped.top, 608);
assert.equal(clamped.width, 1416);
assert.equal(clamped.height, 280);
console.log('  OK  viewport clamping');

const point = context.clampCreamuWorkbenchPoint(
  { left: 2000, top: -20 },
  { width: 34, height: 34 },
  viewport
);
assert.equal(point.left, 1398);
assert.equal(point.top, 8);
console.log('  OK  floating button clamping');

const moved = context.moveCreamuWorkbenchRect(
  { left: 100, top: 100, width: 520, height: 560 },
  { x: 10, y: 20 },
  { x: -200, y: 1000 },
  viewport
);
assert.equal(moved.left, 12);
assert.equal(moved.top, 328);
console.log('  OK  panel movement');

const resizedWest = context.resizeCreamuWorkbenchRect(
  { left: 400, top: 100, width: 500, height: 500 },
  { x: 400, y: 100 },
  { x: 520, y: 100 },
  'w',
  viewport
);
assert.equal(resizedWest.width, 380);
assert.equal(resizedWest.left + resizedWest.width, 900);

const resizedCorner = context.resizeCreamuWorkbenchRect(
  { left: 400, top: 100, width: 500, height: 500 },
  { x: 900, y: 600 },
  { x: 1050, y: 720 },
  'corner',
  viewport
);
assert.equal(resizedCorner.width, 650);
assert.equal(resizedCorner.height, 620);

const resizedHeight = context.resizeCreamuWorkbenchRect(
  { left: 400, top: 100, width: 500, height: 500 },
  { x: 900, y: 600 },
  { x: 900, y: 300 },
  'h',
  viewport
);
assert.equal(resizedHeight.width, 500);
assert.equal(resizedHeight.height, 280);
console.log('  OK  west, height, and corner resizing');

console.log('Shared workbench geometry tests passed (6)');
