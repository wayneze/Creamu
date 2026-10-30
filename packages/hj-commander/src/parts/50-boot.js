// 50-boot.js

function bootCreamuHj() {
  if (typeof isHjSite === 'function' && !isHjSite()) return;
  const core = initCreamuHjCore();
  applyCreamuHjTheme();
  applyHjAdSanitizer();
  initHjSearchMemory();
  initHjPostSorter();
  parseHjHiddenMedia();
  core.log('Boot completed.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootCreamuHj);
} else {
  bootCreamuHj();
}
})();
