// 50-boot.js

function bootCreamuHj() {
  if (!isHjSite() || window.top !== window.self || window.__creamu_hj_booted) return;
  window.__creamu_hj_booted = true;
  const core = initCreamuHjCore();
  if (typeof Hls === 'function') window.Hls = Hls;
  applyCreamuHjTheme();
  applyHjAdSanitizer();
  initHjSearchMemory();
  initHjFloatingSearch();
  initHjPostSorter();
  initHjPostReading();
  if (isHjPostDetail()) parseHjHiddenMedia();
  initHjPageRuntime();
  core.log('Boot completed.');
}

if (isHjSite() && window.top === window.self) {
  initHjStartupRecovery();
  resetHjMediaForPost(currentHjPostId());
  initHjNetworkInterceptor();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootCreamuHj);
} else {
  bootCreamuHj();
}
})();
