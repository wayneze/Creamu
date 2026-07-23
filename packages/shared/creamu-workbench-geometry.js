function parseCreamuPixel(value) {
  if (value == null || value === '') return NaN;
  if (typeof value === 'number') return value;
  return parseFloat(String(value).replace(/px$/i, ''));
}

function getCreamuViewportSize(viewport) {
  const width = Number(viewport?.innerWidth ?? viewport?.width);
  const height = Number(viewport?.innerHeight ?? viewport?.height);
  return {
    width: Number.isFinite(width) && width > 0 ? width : 1280,
    height: Number.isFinite(height) && height > 0 ? height : 720,
  };
}

function getCreamuDefaultWorkbenchRect(viewport, options = {}) {
  const size = getCreamuViewportSize(viewport);
  const minWidth = Number(options.minWidth) || 360;
  const minHeight = Number(options.minHeight) || 280;
  const preferredMaxWidth = Number(options.preferredMaxWidth) || 520;
  const preferredMaxHeight = Number(options.preferredMaxHeight) || 780;
  const widthPadding = Number(options.widthPadding) || 96;
  const heightPadding = Number(options.heightPadding) || 80;
  const heightRatio = Number(options.heightRatio) || 0.76;
  const rightOffset = Number(options.rightOffset) || 48;
  const minLeft = Number(options.minLeft) || 24;
  const minTop = Number(options.minTop) || 32;
  const topRatio = Number(options.topRatio) || 0.12;
  const width = Math.min(preferredMaxWidth, Math.max(minWidth, size.width - widthPadding));
  const height = Math.max(
    minHeight,
    Math.min(size.height * heightRatio, preferredMaxHeight, size.height - heightPadding)
  );

  return {
    left: Math.max(minLeft, Math.round(size.width - width - rightOffset)),
    top: Math.max(minTop, Math.round((size.height - height) * topRatio)),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function clampCreamuWorkbenchRect(rect, viewport, options = {}) {
  const size = getCreamuViewportSize(viewport);
  const margin = Number.isFinite(Number(options.margin)) ? Number(options.margin) : 12;
  const minWidth = Number(options.minWidth) || 360;
  const minHeight = Number(options.minHeight) || 280;
  const availableWidth = Math.max(minWidth, size.width - margin * 2);
  const availableHeight = Math.max(minHeight, size.height - margin * 2);
  const configuredMaxWidth = Number(options.maxWidth);
  const configuredMaxHeight = Number(options.maxHeight);
  const maxWidth = Number.isFinite(configuredMaxWidth)
    ? Math.min(availableWidth, Math.max(minWidth, configuredMaxWidth))
    : availableWidth;
  const maxHeight = Number.isFinite(configuredMaxHeight)
    ? Math.min(availableHeight, Math.max(minHeight, configuredMaxHeight))
    : availableHeight;
  const defaultRect = options.defaultRect || getCreamuDefaultWorkbenchRect(size, options);

  let width = Math.round(parseCreamuPixel(rect?.width));
  let height = Math.round(parseCreamuPixel(rect?.height));
  if (!Number.isFinite(width) || width <= 0) width = Number(options.fallbackWidth) || defaultRect.width;
  if (!Number.isFinite(height) || height <= 0) height = Number(options.fallbackHeight) || defaultRect.height;
  width = Math.min(maxWidth, Math.max(minWidth, width));
  height = Math.min(maxHeight, Math.max(minHeight, height));

  let left = parseCreamuPixel(rect?.left);
  let top = parseCreamuPixel(rect?.top);
  if (!Number.isFinite(left)) left = defaultRect.left;
  if (!Number.isFinite(top)) top = defaultRect.top;
  const maxLeft = Math.max(margin, size.width - width - margin);
  const maxTop = Math.max(margin, size.height - height - margin);

  return {
    left: Math.round(Math.min(maxLeft, Math.max(margin, left))),
    top: Math.round(Math.min(maxTop, Math.max(margin, top))),
    width,
    height,
  };
}

function clampCreamuWorkbenchPoint(point, elementSize, viewport, options = {}) {
  const left = parseCreamuPixel(point?.left);
  const top = parseCreamuPixel(point?.top);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
  const size = getCreamuViewportSize(viewport);
  const margin = Number.isFinite(Number(options.margin)) ? Number(options.margin) : 8;
  const width = Math.max(0, parseCreamuPixel(elementSize?.width) || 0);
  const height = Math.max(0, parseCreamuPixel(elementSize?.height) || 0);
  return {
    left: Math.min(Math.max(margin, left), Math.max(margin, size.width - width - margin)),
    top: Math.min(Math.max(margin, top), Math.max(margin, size.height - height - margin)),
  };
}

function moveCreamuWorkbenchRect(rect, startPoint, currentPoint, viewport, options = {}) {
  const startX = Number(startPoint?.x);
  const startY = Number(startPoint?.y);
  const currentX = Number(currentPoint?.x);
  const currentY = Number(currentPoint?.y);
  const dx = Number.isFinite(startX) && Number.isFinite(currentX) ? currentX - startX : 0;
  const dy = Number.isFinite(startY) && Number.isFinite(currentY) ? currentY - startY : 0;
  return clampCreamuWorkbenchRect({
    left: parseCreamuPixel(rect?.left) + dx,
    top: parseCreamuPixel(rect?.top) + dy,
    width: rect?.width,
    height: rect?.height,
  }, viewport, options);
}

function resizeCreamuWorkbenchRect(rect, startPoint, currentPoint, mode, viewport, options = {}) {
  const base = clampCreamuWorkbenchRect(rect, viewport, options);
  const startX = Number(startPoint?.x);
  const startY = Number(startPoint?.y);
  const currentX = Number(currentPoint?.x);
  const currentY = Number(currentPoint?.y);
  const dx = Number.isFinite(startX) && Number.isFinite(currentX) ? currentX - startX : 0;
  const dy = Number.isFinite(startY) && Number.isFinite(currentY) ? currentY - startY : 0;
  const next = { ...base };

  if (mode === 'w') {
    next.left = base.left + dx;
    next.width = base.width - dx;
  } else if (mode === 'corner') {
    next.width = base.width + dx;
    next.height = base.height + dy;
  } else if (mode === 'h') {
    next.height = base.height + dy;
  }

  const resized = clampCreamuWorkbenchRect(next, viewport, options);
  if (mode !== 'w') return resized;
  const right = base.left + base.width;
  return clampCreamuWorkbenchRect({
    ...resized,
    left: right - resized.width,
  }, viewport, options);
}
