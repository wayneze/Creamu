import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createContext, runInContext } from 'node:vm';

class FakeTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const list = this.listeners.get(type) || [];
    if (!list.includes(listener)) list.push(listener);
    this.listeners.set(type, list);
  }

  removeEventListener(type, listener) {
    const list = this.listeners.get(type) || [];
    this.listeners.set(type, list.filter((entry) => entry !== listener));
  }

  dispatch(type, event = {}) {
    const payload = Object.assign({ type, target: this }, event);
    for (const listener of [...(this.listeners.get(type) || [])]) listener(payload);
  }

  listenerCount(type) {
    return (this.listeners.get(type) || []).length;
  }
}

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  contains(value) { return this.values.has(value); }
}

class FakeElement extends FakeTarget {
  constructor(rect) {
    super();
    this.rect = { ...rect };
    this.style = { left: '', top: '', right: '', bottom: '', width: '', height: '' };
    this.dataset = {};
    this.classList = new FakeClassList();
    this.offsetWidth = rect.width;
    this.offsetHeight = rect.height;
    this.ownerDocument = { body: { style: {} } };
    this.children = new Map();
  }

  getBoundingClientRect() {
    return { ...this.rect };
  }

  setPointerCapture() {}

  querySelector(selector) {
    return this.children.get(selector) || null;
  }
}

function pointerEvent(x, y, target) {
  return {
    clientX: x,
    clientY: y,
    button: 0,
    pointerId: 1,
    target,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.propagationStopped = true; },
  };
}

const root = process.cwd();
const source = [
  fs.readFileSync(path.join(root, 'packages/shared/creamu-workbench-geometry.js'), 'utf8'),
  fs.readFileSync(path.join(root, 'packages/shared/creamu-workbench-interactions.js'), 'utf8'),
].join('\n');
const eventTarget = new FakeTarget();
eventTarget.innerWidth = 500;
eventTarget.innerHeight = 400;
const context = createContext({
  window: eventTarget,
  document: { body: { style: {} } },
  setTimeout,
  clearTimeout,
});
runInContext(source, context, { filename: 'creamu-workbench-interactions.js' });

console.log('Shared workbench interactions');

{
  const fab = new FakeElement({ left: 100, top: 100, width: 34, height: 34 });
  const saved = [];
  let activations = 0;
  context.bindCreamuFabDrag(fab, {
    eventTarget,
    viewport: { width: 500, height: 400 },
    threshold: 4,
    savePosition: (point) => saved.push({ left: point.left, top: point.top }),
    onActivate: () => { activations += 1; },
    applyPosition: (point) => {
      fab.rect.left = point.left;
      fab.rect.top = point.top;
    },
  });
  assert.equal(fab.listenerCount('pointerdown'), 1);
  context.bindCreamuFabDrag(fab, { eventTarget });
  assert.equal(fab.listenerCount('pointerdown'), 1, 're-init must not duplicate FAB listeners');

  fab.dispatch('pointerdown', pointerEvent(100, 100, fab));
  eventTarget.dispatch('pointermove', pointerEvent(490, 390, fab));
  eventTarget.dispatch('pointerup', pointerEvent(490, 390, fab));
  assert.equal(saved.length, 1, 'FAB position should persist once per gesture');
  assert.deepEqual(saved[0], { left: 458, top: 358 });
  fab.dispatch('click', pointerEvent(490, 390, fab));
  assert.equal(activations, 0, 'drag release must not activate the FAB');
  await new Promise((resolve) => setTimeout(resolve, 5));
  fab.dispatch('click', pointerEvent(490, 390, fab));
  assert.equal(activations, 1);
  console.log('  OK  FAB drag, clamp, persistence, and click suppression');
}

{
  const panel = new FakeElement({ left: 100, top: 100, width: 200, height: 150 });
  const header = new FakeElement({ left: 100, top: 100, width: 200, height: 40 });
  const west = new FakeElement({ left: 100, top: 100, width: 8, height: 150 });
  const height = new FakeElement({ left: 100, top: 242, width: 200, height: 8 });
  const corner = new FakeElement({ left: 292, top: 242, width: 8, height: 8 });
  panel.children.set('.jlc-wb-header', header);
  panel.children.set('.jlc-wb-resize-w', west);
  panel.children.set('.jlc-wb-resize-h', height);
  panel.children.set('.jlc-wb-resize-corner', corner);
  const dragEnds = [];
  const resizeEnds = [];
  const apply = (rect) => {
    panel.rect = { ...rect };
    panel.style.left = rect.left + 'px';
    panel.style.top = rect.top + 'px';
    panel.style.width = rect.width + 'px';
    panel.style.height = rect.height + 'px';
  };

  context.bindCreamuWorkbenchDrag(panel, {
    eventTarget,
    viewport: { width: 500, height: 400 },
    geometryOptions: { minWidth: 100, minHeight: 100, margin: 8 },
    applyRect: apply,
    onEnd: (rect) => dragEnds.push(rect),
  });
  context.bindCreamuWorkbenchResize(panel, {
    eventTarget,
    viewport: { width: 500, height: 400 },
    geometryOptions: { minWidth: 100, minHeight: 100, margin: 8 },
    applyRect: apply,
    onEnd: (rect, mode) => resizeEnds.push({ rect, mode }),
  });
  context.bindCreamuWorkbenchDrag(panel, { eventTarget });
  context.bindCreamuWorkbenchResize(panel, { eventTarget });
  assert.equal(header.listenerCount('pointerdown'), 1, 're-init must not duplicate drag listeners');
  assert.equal(corner.listenerCount('pointerdown'), 1, 're-init must not duplicate resize listeners');

  header.dispatch('pointerdown', pointerEvent(100, 100, header));
  eventTarget.dispatch('pointermove', pointerEvent(-100, -100, header));
  eventTarget.dispatch('pointerup', pointerEvent(-100, -100, header));
  assert.equal(dragEnds.length, 1);
  assert.equal(dragEnds[0].left, 8);
  assert.equal(dragEnds[0].top, 8);

  corner.dispatch('pointerdown', pointerEvent(208, 158, corner));
  eventTarget.dispatch('pointermove', pointerEvent(408, 358, corner));
  eventTarget.dispatch('pointerup', pointerEvent(408, 358, corner));
  assert.equal(resizeEnds.length, 1);
  assert.equal(resizeEnds[0].mode, 'corner');
  assert.equal(resizeEnds[0].rect.width, 400);
  assert.equal(resizeEnds[0].rect.height, 350);
  assert.equal(panel.classList.contains('is-dragging'), false);
  assert.equal(panel.classList.contains('is-resizing'), false);
  console.log('  OK  panel drag, resize, clamp, and cleanup');
}

console.log('Shared workbench interaction tests passed (2)');
