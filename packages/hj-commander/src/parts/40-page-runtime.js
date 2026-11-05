// 40-page-runtime.js

function initHjStartupRecovery() {
  const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
  const fetchResource = pageWindow.fetch.bind(pageWindow);
  const recover = async () => {
    const app = document.getElementById('app');
    const entry = [...document.scripts].find(script => {
      const url = new URL(script.src || location.href);
      return url.origin === location.origin && /^\/static\/js[^/]*\/app[-.][^/]+\.js$/.test(url.pathname);
    });
    if (!app || app.childElementCount || !entry) return;
    let notice;
    try {
      // 手机入口曾把主脚本缓存成 HTML。只在此错误已证实且应用未启动时重取一次。
      const response = await fetchResource(entry.src, { signal: AbortSignal.timeout(10000) });
      if (!response.ok || !/^\s*(?:<!doctype html|<html)/i.test(await response.text()) || app.childElementCount) return;
      notice = document.createElement('section');
      notice.id = 'creamu-hj-startup';
      notice.setAttribute('role', 'status');
      notice.innerHTML = '<strong>正在恢复页面</strong><p>站点加载文件异常，正在重新获取…</p><button class="creamu-hj-btn" type="button" hidden>重新加载页面</button>';
      notice.querySelector('button').onclick = () => location.reload();
      document.body.appendChild(notice);
      const retryUrl = new URL(entry.src);
      retryUrl.searchParams.set('creamu_reload', String(Date.now()));
      const retried = await fetchResource(retryUrl.href, { signal: AbortSignal.timeout(10000) });
      if (!retried.ok || !/javascript/.test(retried.headers.get('content-type') || '')) throw new Error('invalid entry');
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const observer = new MutationObserver(() => { if (document.getElementById('app')?.childElementCount) finish(); });
        const timer = setTimeout(() => finish(new Error('startup timeout')), 12000);
        const finish = error => {
          clearTimeout(timer);
          observer.disconnect();
          script.remove();
          error ? reject(error) : resolve();
        };
        // Vue 挂载时会替换 #app 本身，不能只观察旧的空根节点。
        observer.observe(document.body, { childList: true, subtree: true });
        script.src = retryUrl.href;
        script.onerror = () => finish(new Error('entry load failed'));
        document.head.appendChild(script);
      });
      notice.remove();
    } catch (_) {
      if (!notice) return;
      notice.querySelector('strong').textContent = '站点暂时未能加载';
      notice.querySelector('p').textContent = '自动恢复未成功。请重新加载页面，或稍后再试。';
      notice.querySelector('button').hidden = false;
    }
  };
  if (document.readyState === 'complete') recover();
  else window.addEventListener('load', recover, { once: true });
}

function initHjPageRuntime() {
  if (window.__creamu_hj_runtime_ready) return;
  window.__creamu_hj_runtime_ready = true;
  const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
  let href = location.href;
  let timer;
  const refresh = () => {
    timer = null;
    const pageType = /^\/(?:es|search)\/?$/.test(location.pathname) ? 'search'
      : /^\/(?:homepage(?:\/|$)|user\/userinfo)/.test(location.pathname) ? 'profile'
      : isHjPostDetail() ? 'detail' : 'home';
    if (document.documentElement.dataset.hjPage !== pageType) document.documentElement.dataset.hjPage = pageType;
    if (href !== location.href) {
      href = location.href;
      if (window.__creamu_hj_media_cache.postIdentity !== currentHjPostId()) resetHjMediaForPost(currentHjPostId());
      window.__creamu_hj_restore_search?.();
    }
    window.__creamu_hj_refresh_sorter?.();
    refreshHjNavigation();
    closeHjLandingDialogs();
    refreshHjPostReading();
    if (isHjPostDetail()) embedHjUnlockedMediaInline();
  };
  const schedule = () => {
    if (!timer) timer = setTimeout(refresh, 80);
  };
  for (const method of ['pushState', 'replaceState']) {
    const original = pageWindow.history[method];
    pageWindow.history[method] = function (...args) {
      window.__creamu_hj_save_search?.();
      const result = original.apply(this, args);
      // Stop old media synchronously, before the next post can issue requests.
      const identity = currentHjPostId();
      if (window.__creamu_hj_media_cache.postIdentity !== identity) resetHjMediaForPost(identity);
      schedule();
      return result;
    };
  }
  window.addEventListener('popstate', () => {
    resetHjMediaForPost(currentHjPostId());
    schedule();
  });
  const owned = node => {
    const el = node.nodeType === 1 ? node : node.parentElement;
    return !!el?.closest('[id^="creamu-hj-"]');
  };
  const observer = new MutationObserver(records => {
    if (records.some(record => {
      if (owned(record.target)) return false;
      if (record.type === 'childList') return record.removedNodes.length || [...record.addedNodes].some(node => !owned(node));
      const element = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      return !!element?.closest(hjLandingDialogSelector + ', .el-dialog__wrapper');
    })) schedule();
  });
  observer.observe(document.body, { childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'], subtree: true });
  refresh();
}
