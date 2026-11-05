// 32-user-post-sorter.js

/** 「最新」由接口分页；最早优先从末页开始，每次只读取一页。 */
function initHjPostSorter() {
  if (window.__creamu_hj_sorter_ready) return;
  window.__creamu_hj_sorter_ready = true;
  let owner = null;

  const findDesktopVm = element => {
    const walk = vm => {
      if (!vm) return null;
      if (Array.isArray(vm.listData) && vm.pagination && typeof vm.oninit === 'function') return vm;
      for (const child of vm.$children || []) { const found = walk(child); if (found) return found; }
      return null;
    };
    return walk(element?.__vue__);
  };
  const release = () => {
    if (!owner) return;
    owner.abort?.abort();
    owner.vm[owner.method] = owner.original;
    if (owner.mobile) owner.vm.getForumList = owner.acceptPage;
    owner.root.classList.remove('creamu-hj-paged');
    owner.bar.remove();
    owner = null;
  };
  const refresh = () => {
    if (!/^\/(?:homepage\/last\/|user\/userinfo)/.test(location.pathname)) { release(); return; }
    const mobileRoot = document.querySelector('.userinfo');
    const mobileVm = mobileRoot?.__vue__;
    const desktopRoot = document.querySelector('.main_body');
    const desktopVm = findDesktopVm(desktopRoot) || [...(desktopRoot?.children || [])].map(findDesktopVm).find(Boolean);
    const mobile = !!mobileVm;
    const vm = mobile ? mobileVm : desktopVm;
    const latest = mobile ? Number(vm?.active) === 4 : vm?.meta?.type === 1;
    const uid = mobile ? new URL(location.href).searchParams.get('uid') : location.pathname.split('/').pop();
    const componentUid = mobile ? vm?.$route?.query?.uid : vm?.params?.uid;
    if (!latest || !uid || !vm || String(componentUid) !== String(uid)) { release(); return; }
    if (!mobile && !vm.isinit) return;
    const identity = String(uid) + ':' + location.pathname;
    if (owner?.vm === vm && owner.identity === identity) return;
    release();
    const root = mobile ? mobileRoot : desktopRoot;
    const bar = document.createElement('div');
    bar.id = 'creamu-hj-post-order';
    bar.innerHTML = '<div class="creamu-hj-order-options"><button type="button" class="creamu-hj-btn" data-order="newest">最新优先</button><button type="button" class="creamu-hj-btn" data-order="oldest">最早优先</button></div><div class="creamu-hj-order-pages"><button type="button" class="creamu-hj-btn" data-step="-1">上一页</button><span role="status"></span><button type="button" class="creamu-hj-btn" data-step="1">下一页</button><button type="button" class="creamu-hj-btn" data-retry hidden>重试</button></div>';
    const anchor = mobile ? root.querySelector('.van-tabs__content') : root.firstElementChild;
    if (anchor) anchor.before(bar); else root.append(bar);
    root.classList.add('creamu-hj-paged');
    const state = owner = { vm, root, bar, identity, mobile, order: 'newest', page: 1, pages: 1, total: 0, busy: false, error: '', known: false, abort: null, method: mobile ? 'onLoad' : 'oninit' };
    state.original = vm[state.method];
    if (mobile) {
      state.acceptPage = vm.getForumList;
      // 接管前已经发出的站点请求，不再向新分页结果追加数据。
      vm.getForumList = function (data) {
        if (owner !== state || Number(vm.active) !== 4) return state.acceptPage.call(this, data);
      };
    }
    const render = () => {
      bar.querySelector('[role="status"]').textContent = state.error || (state.busy ? '正在读取…' : '第 ' + (state.order === 'oldest' ? state.pages - state.page + 1 : state.page) + ' / ' + state.pages + ' 页 · ' + state.total + ' 帖');
      bar.querySelectorAll('[data-order]').forEach(button => { button.disabled = state.busy; button.setAttribute('aria-pressed', String(button.dataset.order === state.order)); });
      const direction = state.order === 'oldest' ? -1 : 1;
      bar.querySelectorAll('[data-step]').forEach(button => { const next = state.page + Number(button.dataset.step) * direction; button.disabled = state.busy || !state.known || next < 1 || next > state.pages; });
      bar.querySelector('[data-retry]').hidden = !state.error;
    };
    const load = async (page, order = state.order) => {
      if (state.busy || owner !== state) return;
      const controller = state.abort = new AbortController();
      state.busy = true; state.error = ''; render();
      if (mobile) { vm.finished = true; vm.loading = true; }
      const requested = page || (order === 'oldest' ? state.pages : 1);
      state.retry = { page: requested, order };
      try {
        const url = new URL('/api/topic/node/topics', location.origin);
        url.search = new URLSearchParams({ page: String(requested), userId: String(uid), type: '1' });
        const data = await fetchHjPayload(url.href, controller.signal);
        if (owner !== state || controller.signal.aborted) return;
        const pagination = data?.page;
        if (!Array.isArray(data?.results) || !Number.isFinite(Number(pagination?.total)) || Number(pagination?.limit) <= 0 || Number(pagination?.page) !== requested) throw new Error('分页响应异常');
        state.pages = Math.max(1, Math.ceil(Number(pagination.total) / Number(pagination.limit)));
        state.total = Number(pagination.total); state.known = true;
        state.page = requested; state.order = order;
        const seen = new Set();
        const results = data.results.filter(item => { const id = String(item.topicId || item.id); if (seen.has(id)) return false; seen.add(id); return true; });
        if (order === 'oldest') results.reverse();
        if (mobile) {
          vm.forumList = []; vm.refreshing = false;
          state.acceptPage.call(vm, { ...data, results });
          vm.pageNum = requested; vm.finished = true;
        } else {
          vm.listData = results.map(item => ({ ...item, attachments: item.attachments?.filter(attachment => attachment.category !== 'audio'), isAudio: item.isAudio || item.attachments?.some(attachment => attachment.category === 'audio') }));
          vm.pagination = { ...pagination }; vm.isinit = true;
        }
      } catch (error) {
        if (owner === state && !controller.signal.aborted) state.error = '读取失败，可重试';
      } finally {
        if (owner === state) {
          state.busy = false;
          if (mobile) { vm.loading = false; vm.finished = true; vm.skeletonLoading = false; }
          render();
        }
      }
    };
    // 仅接管当前「最新」分页，其他栏目继续使用站点的加载方法。
    vm[state.method] = function (...args) {
      if (owner !== state || (mobile && Number(vm.active) !== 4)) return state.original.apply(this, args);
      if (mobile && vm.refreshing) return load(state.order === 'oldest' ? state.pages : 1);
      if (mobile) { vm.loading = false; vm.finished = true; return; }
      return load(vm.pagination.page);
    };
    bar.onclick = event => {
      const button = event.target.closest('button');
      if (!button || button.disabled) return;
      if (button.dataset.order) load(button.dataset.order === 'oldest' ? state.pages : 1, button.dataset.order);
      else if (button.dataset.step) load(state.page + Number(button.dataset.step) * (state.order === 'oldest' ? -1 : 1));
      else if (button.hasAttribute('data-retry')) load(state.retry.page, state.retry.order);
    };
    load(1);
  };
  window.__creamu_hj_refresh_sorter = refresh;
  refresh();
}

/** 详情接口的 data 是三重 base64。解出来才是帖子正文。 */
function decodeHjTopicPayload(text) {
  let raw = String(text || '');
  try {
    const wrapped = JSON.parse(raw);
    if (wrapped && typeof wrapped.data === 'string') raw = wrapped.data;
    else if (wrapped && wrapped.data) return wrapped.data;
    else if (wrapped && typeof wrapped === 'object') return wrapped;
  } catch (_) {}
  try {
    for (let i = 0; i < 3; i += 1) raw = atob(raw);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i) & 0xff;
    const json = typeof TextDecoder === 'function' ? new TextDecoder('utf-8').decode(bytes) : raw;
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}

async function fetchHjPayload(url, signal) {
  const cookies = new Map(document.cookie.split(';').map(pair => {
    const separator = pair.indexOf('=');
    return [pair.slice(0, separator).trim(), pair.slice(separator + 1)];
  }));
  const headers = { pcVer: '2' };
  for (const [cookie, header] of [['token', 'X-User-Token'], ['uid', 'X-User-Id']]) {
    if (cookies.get(cookie)) headers[header] = decodeURIComponent(cookies.get(cookie));
  }
  const response = await window.__creamu_hj_fetch(url, { credentials: 'include', cache: 'no-store', headers, signal });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const payload = decodeHjTopicPayload(await response.text());
  if (!payload) throw new Error('无法识别站点数据');
  return payload;
}

/** 请求与结果都绑定当前帖子；失败由用户重试，不按计时器反复请求。 */
async function loadHjCurrentTopic(force = false) {
  const cache = window.__creamu_hj_media_cache;
  const pid = currentHjPostId();
  if (!pid || cache.postIdentity !== pid || cache.topicLoading || (cache.topicRequested && !force)) return;
  const generation = cache.generation;
  if (force) destroyHjPlayer();
  cache.topicRequested = true; cache.topicLoading = true; cache.status = '正在读取帖子媒体…';
  scheduleHjMediaUpdate();
  try {
    const payload = await fetchHjPayload(location.origin + '/api/topic/' + pid);
    if (generation !== cache.generation) return;
    await acceptHjTopicData(payload, generation);
  } catch (error) {
    if (generation !== cache.generation) return;
    cache.status = '帖子媒体读取失败，请重试。';
    hjDebug(String(error.message || error));
  } finally {
    if (generation === cache.generation) { cache.topicLoading = false; scheduleHjMediaUpdate(); }
  }
}

function initHjPostReading() {
  if (window.__creamu_hj_reading_ready) return;
  window.__creamu_hj_reading_ready = true;
  document.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
    const anchor = event.target.closest('a[href]');
    if (!anchor || anchor.target === '_blank' || !currentHjPostId(anchor.href)) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin) return;
    event.preventDefault();
    event.stopPropagation();
    window.open(url.href, '_blank', 'noopener');
  }, true);
}

function refreshHjPostReading() {
  if (!isHjPostDetail()) return;
  loadHjCurrentTopic();
  document.querySelectorAll('button').forEach(button => {
    if (button.textContent.replace(/\s+/g, '') !== '点击展开完整贴文' || button.dataset.hjExpanded) return;
    button.dataset.hjExpanded = '1'; button.click();
  });
}
