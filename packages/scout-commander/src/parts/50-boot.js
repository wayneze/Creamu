// @@creamu-part:boot

function bootCreamuScout() {
  const currentSite = detectSite();
  if (currentSite) {
    document.body.classList.add(`creamu-site-${currentSite}`);
  }

  setupScoutStorageChangeListeners();
  initScoutWebDav();
  initScoutWorkbench();
  if (typeof applyScoutSiteTheme === 'function') {
    try { applyScoutSiteTheme(); } catch (_) { /* ignore */ }
  }
  // 启动纠正：屏蔽词踢出词库、合并历史重复
  if (typeof purgeBlockedTermsFromLexicon === 'function') {
    try { purgeBlockedTermsFromLexicon(); } catch (_) { /* ignore */ }
  }
  if (typeof dedupeLexiconTermsStore === 'function') {
    try { dedupeLexiconTermsStore(); } catch (_) { /* ignore */ }
  }
  if (typeof dedupeBlockListStore === 'function') {
    try { dedupeBlockListStore(); } catch (_) { /* ignore */ }
  }
  setupScoutPageLifecycle();
  refreshPageEnhancements('boot');

  if (scoutSync) {
    scoutSync.bootSync().catch((err) => {
      console.warn('[Creamu Scout] Sync on boot failed:', err);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootCreamuScout);
} else {
  bootCreamuScout();
}

})();
