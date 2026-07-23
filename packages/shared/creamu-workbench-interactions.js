function getCreamuInteractionTarget(options = {}) {
  return options.eventTarget || (typeof window !== 'undefined' ? window : null);
}

function getCreamuInteractionDocument(element, options = {}) {
  return options.document || element?.ownerDocument || (typeof document !== 'undefined' ? document : null);
}

function getCreamuInteractionRect(element) {
  const rect = element?.getBoundingClientRect?.() || {};
  return {
    left: Number(rect.left) || 0,
    top: Number(rect.top) || 0,
    width: Number(rect.width) || 0,
    height: Number(rect.height) || 0,
  };
}

function applyCreamuInteractionRect(element, rect) {
  if (!element?.style || !rect) return;
  element.style.left = Math.round(Number(rect.left) || 0) + 'px';
  element.style.top = Math.round(Number(rect.top) || 0) + 'px';
  element.style.right = 'auto';
  element.style.bottom = 'auto';
  if (rect.width != null) element.style.width = Math.round(Number(rect.width) || 0) + 'px';
  if (rect.height != null) element.style.height = Math.round(Number(rect.height) || 0) + 'px';
}

function isCreamuPrimaryPointer(event) {
  return event && (event.button == null || event.button === 0);
}

function getCreamuClientPoint(event) {
  return { x: Number(event?.clientX) || 0, y: Number(event?.clientY) || 0 };
}

function getCreamuDataset(element) {
  if (!element) return null;
  if (!element.dataset) element.dataset = {};
  return element.dataset;
}

function callCreamuPreventDefault(event) {
  if (typeof event?.preventDefault === 'function') event.preventDefault();
}

function callCreamuStopPropagation(event) {
  if (typeof event?.stopPropagation === 'function') event.stopPropagation();
}

function bindCreamuFabDrag(fab, options = {}) {
  if (!fab) return () => {};
  const dataset = getCreamuDataset(fab);
  const boundKey = options.boundKey || 'creamuFabDragBound';
  if (dataset?.[boundKey] === '1') return () => {};
  if (dataset) dataset[boundKey] = '1';

  const target = getCreamuInteractionTarget(options);
  const doc = getCreamuInteractionDocument(fab, options);
  if (!target || typeof fab.addEventListener !== 'function') return () => {};

  const eventType = options.eventType === 'mouse' ? 'mouse' : 'pointer';
  const downEvent = eventType === 'mouse' ? 'mousedown' : 'pointerdown';
  const moveEvent = eventType === 'mouse' ? 'mousemove' : 'pointermove';
  const upEvent = eventType === 'mouse' ? 'mouseup' : 'pointerup';
  const cancelEvent = eventType === 'mouse' ? null : 'pointercancel';
  const applyPosition = options.applyPosition || ((point) => {
    if (!fab.style || !point) return;
    fab.style.left = Math.round(Number(point.left) || 0) + 'px';
    fab.style.top = Math.round(Number(point.top) || 0) + 'px';
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
  });
  const getPosition = options.getPosition || (() => {
    const rect = getCreamuInteractionRect(fab);
    return { left: rect.left, top: rect.top };
  });
  const savePosition = options.savePosition || (() => {});
  const onActivate = options.onActivate || (() => {});
  const shouldIgnoreDrag = options.shouldIgnoreDrag || (() => false);
  const isDragDisabled = options.isDragDisabled || (() => false);
  const threshold = Number.isFinite(Number(options.threshold)) ? Number(options.threshold) : 5;
  const thresholdMode = options.thresholdMode === 'axis' ? 'axis' : 'sum';
  const preventClick = options.preventClick !== false;
  const bindClick = options.bindClick !== false;
  const suppressDuration = Number.isFinite(Number(options.suppressDuration))
    ? Math.max(0, Number(options.suppressDuration))
    : 0;
  let active = false;
  let moved = false;
  let startPoint = { x: 0, y: 0 };
  let origin = { left: 0, top: 0 };
  let lastPoint = null;

  if (typeof options.getInitialPosition === 'function') {
    const initial = options.getInitialPosition();
    if (initial) applyPosition(initial, { phase: 'initial' });
  }

  const onMove = (event) => {
    if (!active) return;
    const point = getCreamuClientPoint(event);
    const dx = point.x - startPoint.x;
    const dy = point.y - startPoint.y;
    const crossedThreshold = thresholdMode === 'axis'
      ? Math.abs(dx) >= threshold || Math.abs(dy) >= threshold
      : Math.abs(dx) + Math.abs(dy) >= threshold;
    if (!moved && crossedThreshold) {
      moved = true;
      fab.classList?.add('is-dragging');
    }
    if (!moved) return;
    callCreamuPreventDefault(event);
    const width = fab.offsetWidth || 34;
    const height = fab.offsetHeight || 34;
    const next = clampCreamuWorkbenchPoint(
      { left: origin.left + dx, top: origin.top + dy },
      { width, height },
      options.viewport || (typeof window !== 'undefined' ? window : null),
      options.geometryOptions || {}
    );
    if (!next) return;
    lastPoint = next;
    applyPosition(next, { phase: 'move', event });
  };

  const onUp = (event) => {
    if (!active) return;
    active = false;
    target.removeEventListener(moveEvent, onMove, true);
    target.removeEventListener(upEvent, onUp, true);
    if (cancelEvent) target.removeEventListener(cancelEvent, onUp, true);
    fab.classList?.remove('is-dragging');
    if (moved) {
      savePosition(lastPoint || getPosition(), { phase: 'end', event });
      dataset.suppressClick = '1';
      const clear = () => { delete dataset.suppressClick; };
      if (suppressDuration > 0 && typeof setTimeout === 'function') setTimeout(clear, suppressDuration);
      else if (typeof setTimeout === 'function') setTimeout(clear, 0);
      else clear();
    }
    moved = false;
    lastPoint = null;
  };

  const onDown = (event) => {
    if (!isCreamuPrimaryPointer(event) || isDragDisabled(event) || shouldIgnoreDrag(event)) return;
    active = true;
    moved = false;
    startPoint = getCreamuClientPoint(event);
    const rect = getCreamuInteractionRect(fab);
    origin = { left: rect.left, top: rect.top };
    if (eventType === 'pointer' && typeof fab.setPointerCapture === 'function' && event.pointerId != null) {
      try { fab.setPointerCapture(event.pointerId); } catch (_) { /* ignore */ }
    }
    target.addEventListener(moveEvent, onMove, true);
    target.addEventListener(upEvent, onUp, true);
    if (cancelEvent) target.addEventListener(cancelEvent, onUp, true);
  };

  const onClick = (event) => {
    if (dataset.suppressClick === '1' || moved) {
      if (preventClick) callCreamuPreventDefault(event);
      callCreamuStopPropagation(event);
      return;
    }
    if (preventClick) callCreamuPreventDefault(event);
    onActivate(event);
  };

  const onViewportChange = () => {
    if (typeof options.onViewportChange === 'function') options.onViewportChange(fab);
  };

  fab.addEventListener(downEvent, onDown);
  if (bindClick) fab.addEventListener('click', onClick);
  if (typeof options.onViewportChange === 'function') {
    target.addEventListener('resize', onViewportChange, { passive: true });
  }

  return () => {
    fab.removeEventListener(downEvent, onDown);
    if (bindClick) fab.removeEventListener('click', onClick);
    target.removeEventListener(moveEvent, onMove, true);
    target.removeEventListener(upEvent, onUp, true);
    if (cancelEvent) target.removeEventListener(cancelEvent, onUp, true);
    if (typeof options.onViewportChange === 'function') target.removeEventListener('resize', onViewportChange);
    if (dataset) delete dataset[boundKey];
    if (doc?.body) doc.body.style.userSelect = '';
  };
}

function bindCreamuWorkbenchDrag(panel, options = {}) {
  if (!panel) return () => {};
  const header = options.header || panel.querySelector?.(options.headerSelector || '.jlc-wb-header');
  if (!header) return () => {};
  const dataset = getCreamuDataset(header);
  const boundKey = options.boundKey || 'creamuWorkbenchDragBound';
  if (dataset?.[boundKey] === '1') return () => {};
  if (dataset) dataset[boundKey] = '1';

  const target = getCreamuInteractionTarget(options);
  const doc = getCreamuInteractionDocument(panel, options);
  if (!target || typeof header.addEventListener !== 'function') return () => {};
  const eventType = options.eventType === 'mouse' ? 'mouse' : 'pointer';
  const downEvent = eventType === 'mouse' ? 'mousedown' : 'pointerdown';
  const moveEvent = eventType === 'mouse' ? 'mousemove' : 'pointermove';
  const upEvent = eventType === 'mouse' ? 'mouseup' : 'pointerup';
  const cancelEvent = eventType === 'mouse' ? null : 'pointercancel';
  const getStartRect = options.getStartRect || (() => getCreamuInteractionRect(panel));
  const applyRect = options.applyRect || ((rect) => applyCreamuInteractionRect(panel, rect));
  const shouldIgnoreDrag = options.shouldIgnoreDrag || (() => false);
  const isDragDisabled = options.isDragDisabled || (() => false);
  const lockBodySelection = options.lockBodySelection === true;
  const body = options.body || doc?.body;
  let active = false;
  let startPoint = { x: 0, y: 0 };
  let startRect = null;
  let lastRect = null;

  const finish = (event) => {
    if (!active) return;
    active = false;
    panel.classList?.remove('is-dragging');
    if (lockBodySelection && body) body.style.userSelect = '';
    target.removeEventListener(moveEvent, onMove, true);
    target.removeEventListener(upEvent, finish, true);
    if (cancelEvent) target.removeEventListener(cancelEvent, finish, true);
    const rect = lastRect || getCreamuInteractionRect(panel);
    if (typeof options.onEnd === 'function') options.onEnd(rect, { event, phase: 'end' });
    else applyRect(rect, { event, phase: 'end', persist: true });
    lastRect = null;
  };

  const onMove = (event) => {
    if (!active) return;
    const current = getCreamuClientPoint(event);
    lastRect = moveCreamuWorkbenchRect(
      startRect,
      startPoint,
      current,
      options.viewport || (typeof window !== 'undefined' ? window : null),
      options.geometryOptions || {}
    );
    applyRect(lastRect, { event, phase: 'move', persist: false });
  };

  const onDown = (event) => {
    if (!isCreamuPrimaryPointer(event) || isDragDisabled(event) || shouldIgnoreDrag(event)) return;
    callCreamuPreventDefault(event);
    startRect = getStartRect(panel, event);
    startPoint = getCreamuClientPoint(event);
    lastRect = startRect;
    active = true;
    panel.classList?.add('is-dragging');
    if (lockBodySelection && body) body.style.userSelect = 'none';
    if (eventType === 'pointer' && typeof header.setPointerCapture === 'function' && event.pointerId != null) {
      try { header.setPointerCapture(event.pointerId); } catch (_) { /* ignore */ }
    }
    if (typeof options.onStart === 'function') options.onStart(startRect, { event, phase: 'start' });
    target.addEventListener(moveEvent, onMove, true);
    target.addEventListener(upEvent, finish, true);
    if (cancelEvent) target.addEventListener(cancelEvent, finish, true);
  };

  header.addEventListener(downEvent, onDown);
  return () => {
    header.removeEventListener(downEvent, onDown);
    target.removeEventListener(moveEvent, onMove, true);
    target.removeEventListener(upEvent, finish, true);
    if (cancelEvent) target.removeEventListener(cancelEvent, finish, true);
    if (lockBodySelection && body) body.style.userSelect = '';
    if (dataset) delete dataset[boundKey];
  };
}

function bindCreamuWorkbenchResize(panel, options = {}) {
  if (!panel) return () => {};
  const dataset = getCreamuDataset(panel);
  const boundKey = options.boundKey || 'creamuWorkbenchResizeBound';
  if (dataset?.[boundKey] === '1') return () => {};
  if (dataset) dataset[boundKey] = '1';

  const target = getCreamuInteractionTarget(options);
  const doc = getCreamuInteractionDocument(panel, options);
  if (!target || typeof panel.querySelector !== 'function') return () => {};
  const eventType = options.eventType === 'mouse' ? 'mouse' : 'pointer';
  const downEvent = eventType === 'mouse' ? 'mousedown' : 'pointerdown';
  const moveEvent = eventType === 'mouse' ? 'mousemove' : 'pointermove';
  const upEvent = eventType === 'mouse' ? 'mouseup' : 'pointerup';
  const cancelEvent = eventType === 'mouse' ? null : 'pointercancel';
  const getStartRect = options.getStartRect || (() => getCreamuInteractionRect(panel));
  const applyRect = options.applyRect || ((rect) => applyCreamuInteractionRect(panel, rect));
  const isDragDisabled = options.isDragDisabled || (() => false);
  const lockBodySelection = options.lockBodySelection === true;
  const body = options.body || doc?.body;
  const handles = [
    [options.westSelector || '.jlc-wb-resize-w', 'w'],
    [options.heightSelector || '.jlc-wb-resize-h', 'h'],
    [options.cornerSelector || '.jlc-wb-resize-corner', 'corner'],
  ];
  const cleanups = [];

  handles.forEach(([selector, mode]) => {
    const handle = panel.querySelector(selector);
    if (!handle || typeof handle.addEventListener !== 'function') return;
    const handleDataset = getCreamuDataset(handle);
    const handleKey = (options.handleBoundPrefix || 'creamuResizeHandle') + mode;
    if (handleDataset?.[handleKey] === '1') return;
    if (handleDataset) handleDataset[handleKey] = '1';
    let active = false;
    let startPoint = { x: 0, y: 0 };
    let startRect = null;
    let lastRect = null;

    const finish = (event) => {
      if (!active) return;
      active = false;
      handle.classList?.remove('is-dragging');
      panel.classList?.remove('is-resizing');
      if (lockBodySelection && body) body.style.userSelect = '';
      target.removeEventListener(moveEvent, onMove, true);
      target.removeEventListener(upEvent, finish, true);
      if (cancelEvent) target.removeEventListener(cancelEvent, finish, true);
      const rect = lastRect || getCreamuInteractionRect(panel);
      if (typeof options.onEnd === 'function') options.onEnd(rect, mode, { event, phase: 'end' });
      else applyRect(rect, { event, phase: 'end', persist: true, mode });
      lastRect = null;
    };

    const onMove = (event) => {
      if (!active) return;
      lastRect = resizeCreamuWorkbenchRect(
        startRect,
        startPoint,
        getCreamuClientPoint(event),
        mode,
        options.viewport || (typeof window !== 'undefined' ? window : null),
        options.geometryOptions || {}
      );
      applyRect(lastRect, { event, phase: 'move', persist: false, mode });
    };

    const onDown = (event) => {
      if (!isCreamuPrimaryPointer(event) || isDragDisabled(event)) return;
      callCreamuPreventDefault(event);
      callCreamuStopPropagation(event);
      startRect = getStartRect(panel, event);
      startPoint = getCreamuClientPoint(event);
      lastRect = startRect;
      active = true;
      handle.classList?.add('is-dragging');
      panel.classList?.add('is-resizing');
      if (lockBodySelection && body) body.style.userSelect = 'none';
      if (eventType === 'pointer' && typeof handle.setPointerCapture === 'function' && event.pointerId != null) {
        try { handle.setPointerCapture(event.pointerId); } catch (_) { /* ignore */ }
      }
      if (typeof options.onStart === 'function') options.onStart(startRect, mode, { event, phase: 'start' });
      target.addEventListener(moveEvent, onMove, true);
      target.addEventListener(upEvent, finish, true);
      if (cancelEvent) target.addEventListener(cancelEvent, finish, true);
    };

    handle.addEventListener(downEvent, onDown);
    cleanups.push(() => {
      handle.removeEventListener(downEvent, onDown);
      target.removeEventListener(moveEvent, onMove, true);
      target.removeEventListener(upEvent, finish, true);
      if (cancelEvent) target.removeEventListener(cancelEvent, finish, true);
      if (handleDataset) delete handleDataset[handleKey];
    });
  });

  return () => {
    cleanups.forEach((cleanup) => cleanup());
    if (lockBodySelection && body) body.style.userSelect = '';
    if (dataset) delete dataset[boundKey];
  };
}
