// 31-search-memory.js

function initHjFloatingSearch() {
  if (document.getElementById('creamu-hj-search-trigger')) return;
  const trigger = document.createElement('button');
  trigger.id = 'creamu-hj-search-trigger';
  trigger.className = 'creamu-hj-btn';
  trigger.type = 'button';
  trigger.textContent = '搜索';
  trigger.setAttribute('aria-haspopup', 'dialog');
  const dialog = document.createElement('dialog');
  dialog.id = 'creamu-hj-search-dialog';
  dialog.setAttribute('aria-labelledby', 'creamu-hj-search-title');
  dialog.innerHTML = '<form><div class="creamu-hj-search-head"><strong id="creamu-hj-search-title">搜索海角</strong><button class="creamu-hj-btn" type="button" data-close aria-label="关闭搜索">关闭</button></div><label for="creamu-hj-search-query">关键词</label><input id="creamu-hj-search-query" name="keyword" type="search" placeholder="搜索帖子、用户或标签" autocomplete="off" required><div class="creamu-hj-search-actions"><select name="type" aria-label="搜索类型"><option value="1">帖子</option><option value="2">用户</option><option value="3">帖子标签</option><option value="4">用户标签</option></select><button class="creamu-hj-btn" type="submit">搜索</button></div></form>';
  const input = dialog.querySelector('input');
  trigger.onclick = () => {
    const url = new URL(location.href);
    input.value = url.searchParams.get('key') || url.searchParams.get('search') || '';
    dialog.showModal();
    input.focus({ preventScroll: true });
  };
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.querySelector('form').onsubmit = event => {
    event.preventDefault();
    const keyword = input.value.trim();
    if (!keyword) return;
    const mobile = !!document.querySelector('#app > .mobile');
    const query = mobile ? { search: keyword, type: dialog.querySelector('select').value } : { key: keyword, type: dialog.querySelector('select').value, node_id: '0' };
    const path = mobile ? '/search' : '/es';
    const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
    const router = pageWindow.document.getElementById('app')?.__vue__?.$router;
    dialog.close();
    if (router) router.push({ path, query }).catch(error => { if (error.name !== 'NavigationDuplicated') console.error(error); });
    else location.assign(path + '?' + new URLSearchParams(query));
  };
  document.body.append(trigger, dialog);
}

function initHjSearchMemory() {
  let key = '';
  const save = () => {
    if (!key) return;
    try { sessionStorage.setItem(key, String(window.scrollY)); } catch (_) {}
  };
  window.__creamu_hj_save_search = save;
  window.__creamu_hj_restore_search = () => {
    const url = new URL(location.href);
    key = /\/(?:es|search)\/?$/.test(url.pathname) || url.searchParams.has('q')
      ? 'creamu_hj_search_scroll:' + url.pathname + url.search : '';
    if (!key) return;
    try {
      const y = Number(sessionStorage.getItem(key));
      if (Number.isFinite(y) && y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
    } catch (_) {}
  };
  window.addEventListener('pagehide', save);
  window.__creamu_hj_restore_search();
}
