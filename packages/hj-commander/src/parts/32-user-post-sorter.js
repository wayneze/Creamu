// 32-user-post-sorter.js

/**
 * 用户页的「最新」是滑到底自动加载的接口分页，页面上没有可排序的节点。
 * 列表在页面组件的 forumList 里：正序要先让页面把剩下的页都加载出来，再按站点原序反过来。
 */
function initHjPostSorter(options) {
  if (typeof document === 'undefined' || window.__creamu_hj_sorter_ready) return;
  window.__creamu_hj_sorter_ready = true;
  const opts = options || {};
  const wait = opts.wait || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const roundMs = opts.roundMs || 700;
  const settleRounds = opts.settleRounds || 4;
  const maxMs = opts.maxMs || 5 * 60 * 1000;
  let oldestFirst = false;
  let loading = false;
  let pageHref = String(location.href || '');
  // 帖子第一次出现的先后 = 站点原序（新 → 旧）。按它排，翻页追加或数组被换掉都不会乱。
  const firstSeen = new WeakMap();
  let seenCounter = 0;

  const pageVm = () => {
    const roots = document.querySelectorAll('.userinfo');
    for (let i = roots.length - 1; i >= 0; i -= 1) {
      const vm = roots[i] && roots[i].__vue__;
      if (vm && Array.isArray(vm.forumList)) return vm;
    }
    return null;
  };

  const currentList = () => {
    const vm = pageVm();
    return vm ? vm.forumList : null;
  };

  const label = (count) => {
    if (loading) return '加载中 ' + count;
    return (oldestFirst ? '正序 ' : '倒序 ') + count;
  };

  const updateLabel = () => {
    const button = document.getElementById('creamu-hj-order-toggle');
    const list = currentList();
    if (button) button.textContent = label(list ? list.length : 0);
  };

  const seqOf = (item) => (item && typeof item === 'object' ? firstSeen.get(item) : 0) || 0;

  const applyOrder = () => {
    const list = currentList();
    updateLabel();
    if (!list || !list.length) return;
    list.forEach((item) => {
      if (item && typeof item === 'object' && !firstSeen.has(item)) firstSeen.set(item, ++seenCounter);
    });
    if (list.length < 2) return;
    const direction = oldestFirst ? -1 : 1;
    let sorted = true;
    for (let i = 1; i < list.length && sorted; i += 1) {
      if ((seqOf(list[i]) - seqOf(list[i - 1])) * direction < 0) sorted = false;
    }
    // 只在原数组里调顺序。换成新数组会让页面列表丢掉响应，帖子直接消失。
    if (!sorted) list.sort((a, b) => (seqOf(a) - seqOf(b)) * direction);
  };

  const scrollContainer = () => {
    let cur = document.querySelector('.userinfo');
    while (cur && cur !== document.body && cur !== document.documentElement) {
      const style = typeof getComputedStyle === 'function' ? getComputedStyle(cur) : null;
      if (style && /(auto|scroll)/.test(style.overflowY) && cur.scrollHeight > cur.clientHeight) return cur;
      cur = cur.parentElement;
    }
    return null;
  };

  const scrollToBottom = () => {
    const box = scrollContainer();
    if (box) {
      box.scrollTop = box.scrollHeight;
      if (typeof Event === 'function') box.dispatchEvent(new Event('scroll'));
    }
    const height = Math.max(
      (document.documentElement && document.documentElement.scrollHeight) || 0,
      (document.body && document.body.scrollHeight) || 0
    );
    if (typeof window.scrollTo === 'function') window.scrollTo(0, height);
    if (typeof window.dispatchEvent === 'function' && typeof Event === 'function') {
      window.dispatchEvent(new Event('scroll'));
    }
  };

  const scrollToTop = () => {
    const box = scrollContainer();
    if (box) box.scrollTop = 0;
    if (typeof window.scrollTo === 'function') window.scrollTo(0, 0);
  };

  /** 一直滑到底，直到连续几轮没有新帖（站点已加载完）或超时 */
  const loadAllPages = async () => {
    loading = true;
    const startedAt = Date.now();
    let stableRounds = 0;
    let lastCount = -1;
    try {
      while (stableRounds < settleRounds && Date.now() - startedAt < maxMs) {
        if (!oldestFirst) break;
        scrollToBottom();
        await wait(roundMs);
        applyOrder();
        const list = currentList();
        const count = list ? list.length : 0;
        if (count === lastCount) stableRounds += 1;
        else stableRounds = 0;
        lastCount = count;
      }
    } finally {
      loading = false;
      applyOrder();
      scrollToTop();
    }
  };

  const toggleOrder = () => {
    if (loading) return;
    oldestFirst = !oldestFirst;
    applyOrder();
    if (oldestFirst) return loadAllPages();
    scrollToTop();
    return undefined;
  };

  const mount = () => {
    if (!/\/user\/userinfo/i.test(String(location.pathname || ''))) return;
    const href = String(location.href || '');
    if (href !== pageHref) {
      // 换了别人的主页：回到站点默认顺序
      pageHref = href;
      oldestFirst = false;
    }
    let button = document.getElementById('creamu-hj-order-toggle');
    if (!button && document.body) {
      button = document.createElement('button');
      button.id = 'creamu-hj-order-toggle';
      button.type = 'button';
      button.className = 'creamu-hj-btn';
      button.style.cssText = 'position:fixed;right:12px;bottom:72px;z-index:2147483646;';
      button.onclick = toggleOrder;
      document.body.appendChild(button);
    }
    if (!loading) applyOrder();
    else updateLabel();
  };

  mount();
  if (typeof setInterval === 'function') setInterval(mount, 1500);
  initHjPostReading();
}

/** 详情接口的 data 是三重 base64。解出来才是帖子正文。 */
function decodeHjTopicPayload(text) {
  let raw = String(text || '');
  try {
    const wrapped = JSON.parse(raw);
    if (wrapped && typeof wrapped.data === 'string') raw = wrapped.data;
    else if (wrapped && wrapped.data) return wrapped.data;
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

function currentHjPostId() {
  const href = String((typeof location !== 'undefined' && location.href) || '');
  const matched = href.match(/(?:[?&#](?:pid|id|topicId)=|\/post\/|\/topic\/)(\d+)/i);
  return matched ? matched[1] : '';
}

function isHjPostDetail() {
  return /\/post\/details|\/topic\/details/i.test(String((typeof location !== 'undefined' && location.pathname) || ''));
}

/** 列表点击按帖子数据开新标签。详情页拉接口，把完整正文填进去。 */
function initHjPostReading() {
  if (window.__creamu_hj_reading_ready) {
    if (typeof window.__creamu_hj_open_detail === 'function') window.__creamu_hj_open_detail();
    return;
  }
  window.__creamu_hj_reading_ready = true;

  const componentOf = (node) => {
    let cur = node;
    for (let depth = 0; cur && depth < 12; depth += 1) {
      const vm = cur && (cur.__vue__ || cur.__vueParentComponent);
      if (vm) return vm;
      cur = cur.parentElement;
    }
    return null;
  };

  const postIdOf = (node) => {
    const vm = componentOf(document.querySelector('.userinfo'));
    const list = vm && vm.forumList;
    if (!Array.isArray(list)) return '';
    let cur = node;
    for (let depth = 0; cur && depth < 8; depth += 1) {
      const text = String(cur.innerText || cur.textContent || '').replace(/\s+/g, '');
      if (text.length >= 6) {
        const hit = list.find((item) => {
          const title = String(item && item.title || '').replace(/\s+/g, '');
          return title && title.length >= 6 && text.includes(title);
        });
        const pid = hit && (hit.topicId || hit.id);
        if (pid) return String(pid);
      }
      cur = cur.parentElement;
    }
    return '';
  };

  let listHref = isHjPostDetail() ? '' : String(location.href || '');
  const openDetailInNewTab = () => {
    if (!isHjPostDetail()) {
      listHref = String(location.href || '');
      return;
    }
    if (!listHref || window.__creamu_hj_detail_opened === location.href) return;
    const pid = currentHjPostId();
    if (!pid) return;
    window.__creamu_hj_detail_opened = location.href;
    window.open(location.origin + '/post/details?pid=' + pid, '_blank', 'noopener');
    history.back();
  };
  window.__creamu_hj_open_detail = openDetailInNewTab;
  openDetailInNewTab();
  if (typeof setInterval === 'function') setInterval(openDetailInNewTab, 300);

  const loadHiddenImages = async () => {
    const pid = currentHjPostId();
    if (!pid || window.__creamu_hj_images_pid === pid) return;
    window.__creamu_hj_images_pid = pid;
    try {
      const response = await fetch(location.origin + '/api/topic/' + pid + '?date=' + Date.now(), {
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = decodeHjTopicPayload(await response.text());
      if (!payload) {
        window.__creamu_hj_images_pid = '';
        return;
      }
      const topic = payload.attachments ? payload : payload.results && payload.results[0];
      const added = typeof unlockHjHiddenImages === 'function' ? await unlockHjHiddenImages(topic || payload) : 0;
      const pending = typeof hjTopicImageAttachments === 'function' ? hjTopicImageAttachments(topic || payload) : [];
      if (pending.length && !added) window.__creamu_hj_images_pid = '';
      if (typeof renderHjUnlockedImages === 'function') renderHjUnlockedImages();
    } catch (_) {
      window.__creamu_hj_images_pid = '';
    }
  };

  const showFullPost = () => {
    if (!isHjPostDetail()) return;
    loadHiddenImages();
    if (typeof renderHjUnlockedImages === 'function') renderHjUnlockedImages();
    document.querySelectorAll('button').forEach((button) => {
      const text = String(button.textContent || '').replace(/\s+/g, '');
      if (text !== '点击展开完整贴文' || button.dataset.hjExpanded === '1') return;
      button.dataset.hjExpanded = '1';
      button.click();
    });
  };

  showFullPost();
  if (typeof setInterval === 'function') setInterval(showFullPost, 1500);
}
