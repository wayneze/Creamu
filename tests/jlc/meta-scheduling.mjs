import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('packages/jlc-commander/src/parts/18-commander-decoration.js', 'utf8');

function extract(pattern, label) {
  const match = source.match(pattern);
  assert.ok(match, label + ' not found');
  return match[0];
}

const prefetchMatch = source.match(/const META_PREFETCH_MARGIN_PX = (\d+);/);
assert.ok(prefetchMatch, 'META_PREFETCH_MARGIN_PX not found');
assert.equal(Number(prefetchMatch[1]), 1200);
const batchMatch = source.match(/const META_DEFERRED_BATCH_SIZE = (\d+);/);
assert.ok(batchMatch, 'META_DEFERRED_BATCH_SIZE not found');
assert.ok(Number(batchMatch[1]) > 0 && Number(batchMatch[1]) <= 32);

const prioritySource = extract(
  /function getRectViewportPriority[\s\S]*?(?=\n\s*function clearDeferredMetaItem)/,
  'viewport priority helpers'
);
const priorityContext = {
  window: { innerHeight: 800 },
  document: { documentElement: { clientHeight: 800 } },
};
vm.createContext(priorityContext);
vm.runInContext(prioritySource, priorityContext);

function item(id, top, height = 100) {
  return {
    id,
    getBoundingClientRect() {
      return { top, bottom: top + height };
    },
  };
}

const completionOrder = [
  item('below', 1100),
  item('visible-late', 520),
  item('above', -500, 100),
  item('visible-first', 20),
  item('visible-middle', 240),
];
const requestOrder = Array.from(
  priorityContext.sortMetaItemsByViewport(completionOrder),
  (entry) => entry.id
);
assert.deepEqual(requestOrder, [
  'visible-first',
  'visible-middle',
  'visible-late',
  'below',
  'above',
]);

const equalPriority = [item('first', 100), item('second', 100)];
assert.deepEqual(
  Array.from(priorityContext.sortMetaItemsByViewport(equalPriority), (entry) => entry.id),
  ['first', 'second']
);

let priorityReads = 0;
const measuredItems = [300, 100, 200].map((top, index) => ({
  id: index,
  getBoundingClientRect() {
    priorityReads += 1;
    return { top, bottom: top + 100 };
  },
}));
priorityContext.sortMetaItemsByViewport(measuredItems);
assert.equal(priorityReads, measuredItems.length, 'viewport priority should be measured once per item');

const scheduleSource = extract(
  /function scheduleDeferredMetaSweep[\s\S]*?(?=\n\s*function ensureMetaViewportObserver)/,
  'deferred sweep scheduler'
);
const timerCalls = [];
const clearedTimers = [];
const scheduleContext = {
  Date,
  META_DEFERRED_SWEEP_DELAY: 120,
  metaDeferredSweepTimer: null,
  metaDeferredSweepDueAt: 0,
  flushDeferredMetaItems() {},
  window: {
    setTimeout(callback, delay) {
      const timer = { callback, delay };
      timerCalls.push(timer);
      return timer;
    },
    clearTimeout(timer) {
      clearedTimers.push(timer);
    },
  },
};
vm.createContext(scheduleContext);
vm.runInContext(scheduleSource, scheduleContext);
scheduleContext.scheduleDeferredMetaSweep(120);
scheduleContext.scheduleDeferredMetaSweep(32);
scheduleContext.scheduleDeferredMetaSweep(80);
assert.deepEqual(timerCalls.map((entry) => entry.delay), [120, 32]);
assert.equal(clearedTimers.length, 1);

const observerSource = extract(
  /function ensureMetaViewportObserver[\s\S]*?(?=\n\s*function bindMetaSweepEvents)/,
  'viewport observer'
);
assert.doesNotMatch(observerSource, /requestMetaEnrichment\s*\(/);
assert.match(observerSource, /metaNearViewportItems/);

const sweepSource = extract(
  /function clearDeferredMetaItem[\s\S]*?(?=\n\s*function scheduleDeferredMetaSweep)/,
  'deferred metadata sweep'
);
const sweepItems = [0, 1, 2].map((id) => ({
  id: String(id),
  isConnected: true,
  _jlcMetaPending: { avid: 'T-' + id, title: '' },
}));
const requested = [];
const sweepContext = {
  metaDeferredItems: new Set(sweepItems),
  metaNearViewportItems: new Set(sweepItems),
  metaViewportObserver: null,
  metaDeferredSweepTimer: null,
  metaDeferredSweepDueAt: 0,
  META_DEFERRED_BATCH_SIZE: 2,
  META_IMMEDIATE_SWEEP_DELAY: 32,
  sortMetaItemsByViewport(items) { return Array.from(items); },
  isItemNearViewport() { return true; },
  isItemImmediateViewport() { return true; },
  requestMetaEnrichment(item, avid) { requested.push([item.id, avid]); },
  scheduleDeferredMetaSweep() {},
};
vm.createContext(sweepContext);
vm.runInContext(sweepSource, sweepContext);
sweepContext.flushDeferredMetaItems();
assert.deepEqual(requested, [['0', 'T-0'], ['1', 'T-1']]);
assert.equal(sweepContext.metaDeferredItems.size, 1, 'a sweep should cap visible metadata requests');

const enqueueSource = extract(
  /function scheduleMetaEnrichment[\s\S]*?(?=\n\s*function refreshCommanderDecorations)/,
  'metadata enqueue function'
);
assert.match(enqueueSource, /metaDeferredItems\.add\(item\)/);
assert.match(enqueueSource, /META_IMMEDIATE_SWEEP_DELAY/);
assert.doesNotMatch(enqueueSource, /requestMetaEnrichment\s*\(/);

console.log('JLC metadata scheduling tests OK');
