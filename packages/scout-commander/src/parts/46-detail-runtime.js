// @@creamu-part:detail-runtime

// 详情全屏横滑 seek

function formatScoutSeekTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ':' + String(r).padStart(2, '0');
}

function findScoutDetailVideo() {
  const sels = [
    '#html5video video',
    '#html5video_base video',
    '#video-player-bg video',
    '.video-player video',
    '#player video',
    'video'
  ];
  for (const s of sels) {
    const v = document.querySelector(s);
    if (v && v.tagName === 'VIDEO') return v;
  }
  return null;
}

function getScoutFullscreenRoot() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null
  );
}

function showScoutSeekHud(text, mountRoot) {
  const root = mountRoot || document.documentElement;
  let el = document.getElementById('scout-seek-hud');
  if (!el) {
    el = document.createElement('div');
    el.id = 'scout-seek-hud';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
  }
  if (el.parentNode !== root) {
    try {
      root.appendChild(el);
    } catch (_) {
      document.documentElement.appendChild(el);
    }
  }
  el.textContent = text;
  el.classList.add('is-on');
  if (el._scoutHideTimer) clearTimeout(el._scoutHideTimer);
  el._scoutHideTimer = setTimeout(() => {
    el.classList.remove('is-on');
  }, 700);
}

function enableVideoSeekGesture() {
  if (typeof detectPageKind === 'function' && detectPageKind() !== 'video') return;
  if (window.__creamuScoutSeekGestureRuntime) return;

  let tracking = false;
  let axisLocked = '';
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let video = null;
  let moved = false;

  const reset = () => {
    tracking = false;
    axisLocked = '';
    video = null;
    moved = false;
  };

  const onStart = (e) => {
    if (typeof detectPageKind === 'function' && detectPageKind() !== 'video') return;
    if (!e.touches || e.touches.length !== 1) return;
    const fs = getScoutFullscreenRoot();
    if (!fs) return;
    const v = findScoutDetailVideo();
    if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return;
    const target = e.target;
    if (!fs.contains(target) && target !== fs) return;
    const t = e.touches[0];
    tracking = true;
    axisLocked = '';
    moved = false;
    startX = t.clientX;
    startY = t.clientY;
    startTime = v.currentTime || 0;
    video = v;
  };

  const onMove = (e) => {
    if (!tracking || !video || !e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (!axisLocked) {
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      axisLocked = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      if (axisLocked === 'v') {
        reset();
        return;
      }
    }
    if (axisLocked !== 'h') return;
    e.preventDefault();
    moved = true;
    const w = Math.max(window.innerWidth || 320, 320);
    const span = Math.min(90, Math.max(30, (video.duration || 90) * 0.25));
    const delta = (dx / w) * span;
    let next = startTime + delta;
    next = Math.max(0, Math.min(video.duration - 0.25, next));
    const sign = delta >= 0 ? '+' : '−';
    const abs = formatScoutSeekTime(Math.abs(delta));
    const fs = getScoutFullscreenRoot() || document.documentElement;
    showScoutSeekHud(
      sign + abs + ' → ' + formatScoutSeekTime(next) + ' / ' + formatScoutSeekTime(video.duration),
      fs
    );
    try {
      video.currentTime = next;
    } catch (_) { /* ignore */ }
  };

  const onEnd = () => {
    if (tracking && moved && video && typeof showToast === 'function') {
      try {
        showToast('进度 ' + formatScoutSeekTime(video.currentTime));
      } catch (_) { /* ignore */ }
    }
    reset();
  };

  window.__creamuScoutSeekGestureRuntime = { onStart, onMove, onEnd, reset };
  document.addEventListener('touchstart', onStart, { passive: true, capture: true });
  document.addEventListener('touchmove', onMove, { passive: false, capture: true });
  document.addEventListener('touchend', onEnd, { passive: true, capture: true });
  document.addEventListener('touchcancel', onEnd, { passive: true, capture: true });
}

function disableVideoSeekGesture() {
  const runtime = window.__creamuScoutSeekGestureRuntime;
  if (!runtime) return;
  document.removeEventListener('touchstart', runtime.onStart, true);
  document.removeEventListener('touchmove', runtime.onMove, true);
  document.removeEventListener('touchend', runtime.onEnd, true);
  document.removeEventListener('touchcancel', runtime.onEnd, true);
  runtime.reset();
  window.__creamuScoutSeekGestureRuntime = null;

  const hud = document.getElementById('scout-seek-hud');
  if (hud) {
    if (hud._scoutHideTimer) clearTimeout(hud._scoutHideTimer);
    hud.remove();
  }
}

function applyVideoSeekGestureMode() {
  const isVideo =
    typeof detectPageKind !== 'function' || detectPageKind() === 'video';
  if (isVideo) enableVideoSeekGesture();
  else disableVideoSeekGesture();
}

function setupVideoSeekGesture() {
  applyVideoSeekGestureMode();
}
