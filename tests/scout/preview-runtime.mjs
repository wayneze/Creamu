import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(
  'packages/scout-commander/src/parts/44-preview-runtime.js',
  'utf8'
);
const themeSource = fs.readFileSync(
  'packages/scout-commander/src/parts/27-page-enhancement-theme.js',
  'utf8'
);

function createHarness({ enabled = true, kind = 'search' } = {}) {
  const state = { enabled, kind };
  const listeners = new Map();
  const windowListeners = new Map();
  const observers = [];
  const counts = { paused: 0, restored: 0 };

  function MediaElement() {}
  const originalPlay = function originalPlay() {
    return Promise.resolve();
  };
  MediaElement.prototype.play = originalPlay;

  const document = {
    documentElement: {},
    addEventListener(type, handler, capture) {
      listeners.set(`${type}:${capture === true}`, handler);
    },
    removeEventListener(type, handler, capture) {
      const key = `${type}:${capture === true}`;
      if (listeners.get(key) === handler) listeners.delete(key);
    },
    querySelectorAll() {
      return [];
    },
  };
  const window = {
    scrollY: 0,
    innerWidth: 1280,
    matchMedia: () => ({ matches: false }),
    addEventListener(type, handler, options) {
      const capture = options === true || !!(options && options.capture);
      windowListeners.set(`${type}:${capture}`, handler);
    },
    removeEventListener(type, handler, options) {
      const capture = options === true || !!(options && options.capture);
      const key = `${type}:${capture}`;
      if (windowListeners.get(key) === handler) windowListeners.delete(key);
    },
  };
  const context = vm.createContext({
    console,
    Promise,
    document,
    window,
    HTMLMediaElement: MediaElement,
    MutationObserver: class {
      constructor(callback) {
        this.callback = callback;
        this.disconnected = false;
        observers.push(this);
      }
      observe() {}
      disconnect() {
        this.disconnected = true;
      }
    },
    detectPageKind: () => state.kind,
    isBlockSiteAutoPreview: () => state.enabled,
    stopListPreview() {},
    setTimeout,
    clearInterval,
  });

  vm.runInContext(source, context, { filename: '44-preview-runtime.js' });
  context.pauseSiteListPreviewVideos = () => {
    counts.paused += 1;
  };
  return {
    context,
    counts,
    listeners,
    windowListeners,
    observers,
    originalPlay,
    state,
    MediaElement,
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

console.log('Scout preview runtime tests');

test('preview presentation stays in the page theme', () => {
  assert.doesNotMatch(source, /\.style\.(?:cssText|display|position)\s*=/);
  assert.ok(themeSource.includes('.scout-preview-positioned {'));
  assert.ok(themeSource.includes('.scout-site-preview-disabled {'));
  assert.ok(source.includes("host.classList.add('scout-preview-positioned')"));
  assert.ok(source.includes("v.classList.add('scout-site-preview-disabled')"));
});

test('disabled mode installs no global preview guards', () => {
  const harness = createHarness({ enabled: false });
  harness.context.setupBlockSiteAutoPreview();

  assert.equal(harness.listeners.size, 0);
  assert.equal(harness.observers.length, 0);
  assert.equal(harness.MediaElement.prototype.play, harness.originalPlay);
});

test('enabled list mode releases and restores preview guards', () => {
  const harness = createHarness({ enabled: true, kind: 'search' });
  harness.context.setupBlockSiteAutoPreview();

  assert.equal(harness.listeners.size, 5);
  assert.equal(harness.observers.length, 1);
  assert.notEqual(harness.MediaElement.prototype.play, harness.originalPlay);
  assert.equal(harness.counts.paused, 1);

  harness.context.applyBlockSiteAutoPreviewMode();
  assert.equal(harness.counts.paused, 1, 'active preview guard should not rescan the page');

  harness.state.enabled = false;
  harness.context.applyBlockSiteAutoPreviewMode();

  assert.equal(harness.listeners.size, 0);
  assert.equal(harness.observers[0].disconnected, true);
  assert.equal(harness.MediaElement.prototype.play, harness.originalPlay);

  harness.state.enabled = true;
  harness.context.applyBlockSiteAutoPreviewMode();
  assert.equal(harness.listeners.size, 5);
  assert.equal(harness.observers.length, 2);
  assert.notEqual(harness.MediaElement.prototype.play, harness.originalPlay);
  assert.equal(harness.counts.paused, 2, 're-enabled preview guard should scan the current page once');
});

test('detail pages keep list preview guards detached', () => {
  const harness = createHarness({ enabled: true, kind: 'video' });
  harness.context.setupBlockSiteAutoPreview();

  assert.equal(harness.listeners.size, 0);
  assert.equal(harness.observers.length, 0);
  assert.equal(harness.MediaElement.prototype.play, harness.originalPlay);
});

test('manual list preview listeners detach outside list pages', () => {
  const harness = createHarness({ enabled: false, kind: 'search' });
  harness.context.setupListPreviewPlayback();

  assert.equal(harness.listeners.size, 2);
  assert.equal(harness.windowListeners.size, 1);

  harness.state.kind = 'video';
  harness.context.applyListPreviewPlaybackMode();
  assert.equal(harness.listeners.size, 0);
  assert.equal(harness.windowListeners.size, 0);

  harness.state.kind = 'search';
  harness.context.applyListPreviewPlaybackMode();
  assert.equal(harness.listeners.size, 2);
  assert.equal(harness.windowListeners.size, 1);
});

if (!process.exitCode) {
  console.log(`Scout preview runtime tests OK (${passed} cases)`);
}
