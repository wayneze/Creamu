import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function createEventTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, handler, options) {
      const capture = options === true || !!(options && options.capture);
      listeners.set(`${type}:${capture}`, handler);
    },
    removeEventListener(type, handler, options) {
      const capture = options === true || !!(options && options.capture);
      const key = `${type}:${capture}`;
      if (listeners.get(key) === handler) listeners.delete(key);
    },
  };
}

let passed = 0;

function test(name, run) {
  try {
    run();
    passed += 1;
    console.log('  OK  ' + name);
  } catch (error) {
    console.error('  FAIL  ' + name);
    console.error('       ', error.message);
    process.exitCode = 1;
  }
}

console.log('Scout page runtime tests');

test('tracking pagebar keeps presentation in the site layout theme', () => {
  const source = fs.readFileSync(
    'packages/scout-commander/src/parts/42-tracking-runtime.js',
    'utf8'
  );
  const themeSource = fs.readFileSync(
    'packages/scout-commander/src/parts/29-site-layout-theme.js',
    'utf8'
  );
  assert.doesNotMatch(source, /\bstyle\s*=|\.style\./);
  assert.ok(source.includes("bar.className = 'jlc-wb-pagebar scout-tracking-pagebar'"));
  assert.ok(source.includes('class="scout-tracking-pagebar-action jlc-bp-continue"'));
  [
    '#jlc-tracking-pagebar {',
    '#jlc-tracking-pagebar .jlc-tracking-pagebar-text {',
    '#jlc-tracking-pagebar .scout-tracking-pagebar-action {',
    '#jlc-tracking-pagebar .scout-bp-dismiss {',
  ].forEach((selector) => {
    assert.ok(themeSource.includes(selector), 'missing tracking selector: ' + selector);
  });
});

test('search tracking listeners follow the active page kind', () => {
  const source = fs.readFileSync(
    'packages/scout-commander/src/parts/42-tracking-runtime.js',
    'utf8'
  );
  const body = createEventTarget();
  const state = { kind: 'video' };
  const context = vm.createContext({
    console,
    window: {},
    document: { body, getElementById: () => null },
    detectPageKind: () => state.kind,
  });
  vm.runInContext(source, context, { filename: '42-tracking-runtime.js' });

  context.setupSearchClickTracking();
  assert.equal(body.listeners.size, 0);

  state.kind = 'search';
  context.applySearchClickTrackingMode();
  assert.equal(body.listeners.size, 3);
  context.applySearchClickTrackingMode();
  assert.equal(body.listeners.size, 3);

  state.kind = 'list';
  context.applySearchClickTrackingMode();
  assert.equal(body.listeners.size, 0);
});

test('detail seek listeners follow the active page kind', () => {
  const source = fs.readFileSync(
    'packages/scout-commander/src/parts/46-detail-runtime.js',
    'utf8'
  );
  const documentEvents = createEventTarget();
  const state = { kind: 'search' };
  const document = {
    ...documentEvents,
    documentElement: {},
    fullscreenElement: null,
    webkitFullscreenElement: null,
    mozFullScreenElement: null,
    msFullscreenElement: null,
    querySelector: () => null,
    getElementById: () => null,
    createElement: () => ({}),
  };
  const context = vm.createContext({
    console,
    window: { innerWidth: 1280 },
    document,
    detectPageKind: () => state.kind,
    setTimeout,
    clearTimeout,
  });
  vm.runInContext(source, context, { filename: '46-detail-runtime.js' });

  context.setupVideoSeekGesture();
  assert.equal(documentEvents.listeners.size, 0);

  state.kind = 'video';
  context.applyVideoSeekGestureMode();
  assert.equal(documentEvents.listeners.size, 4);
  context.applyVideoSeekGestureMode();
  assert.equal(documentEvents.listeners.size, 4);

  state.kind = 'search';
  context.applyVideoSeekGestureMode();
  assert.equal(documentEvents.listeners.size, 0);
});

test('detail seek HUD keeps presentation in the page theme', () => {
  const source = fs.readFileSync(
    'packages/scout-commander/src/parts/46-detail-runtime.js',
    'utf8'
  );
  const themeSource = fs.readFileSync(
    'packages/scout-commander/src/parts/27-page-enhancement-theme.js',
    'utf8'
  );
  assert.doesNotMatch(source, /\bstyle\s*=|\.style\./);
  assert.ok(themeSource.includes('#scout-seek-hud {'));
  assert.ok(themeSource.includes('#scout-seek-hud.is-on {'));
  assert.ok(source.includes("el.setAttribute('role', 'status')"));
  assert.ok(source.includes("el.classList.add('is-on')"));
});

if (!process.exitCode) {
  console.log(`Scout page runtime tests OK (${passed} cases)`);
}
