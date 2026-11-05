function bootCreamuFc2() {
  if (window.self === window.top && location.pathname === '/' && new URLSearchParams(location.search).get('creamu') === 'multi') {
    installFc2Theme();
    initFc2Sync();
    mountFc2Workbench();
    mountFc2Multiview();
    return true;
  }
  const directory = /^\/(?:adult\/?)?$/.test(location.pathname) && document.getElementById('live-list');
  const room = /^\/(?:2_)?[1-9]\d*\/?$/.test(location.pathname)
    && document.querySelector('.m-viewPlayer #js-video_area') && document.querySelector('.js-wrap');
  // Leave account/payment pages and the site's age/consent entry screens with their native UI.
  if (!directory && !room) return false;
  installFc2Theme();
  if (!readFc2Preferences().enabled) {
    document.body.prepend(fc2El('div', { class: 'fc-restore' },
      '当前使用 FC2 原站布局',
      fc2Button('恢复 Creamu 布局', () => {
        setFc2Preferences({ enabled: true });
        location.reload();
      })));
    return true;
  }
  if (!document.querySelector('meta[name="viewport"]')) {
    document.head.append(fc2El('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1' }));
  }
  initFc2Sync();
  mountFc2Workbench();
  if (directory) mountFc2Directory();
  else mountFc2Room();
  return true;
}

function startCreamuFc2() {
  if (!/^\/(?:(?:adult\/?)|(?:(?:2_)?[1-9]\d*\/?))?$/.test(location.pathname)) return;
  if (bootCreamuFc2()) return;
  // FC2 creates its player asynchronously. Observe readiness instead of abandoning a cold entry.
  const observer = new MutationObserver(() => {
    if (bootCreamuFc2()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('pagehide', event => { if (!event.persisted) observer.disconnect(); }, { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startCreamuFc2, { once: true });
} else {
  startCreamuFc2();
}
})();
