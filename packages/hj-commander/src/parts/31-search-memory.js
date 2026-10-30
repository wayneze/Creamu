// 31-search-memory.js

function initHjSearchMemory() {
  // 恢复/保持搜索状态与滚动位置
  try {
    const savedScroll = sessionStorage.getItem('creamu_hj_search_scroll');
    if (savedScroll && location.search.includes('q=')) {
      window.scrollTo(0, parseInt(savedScroll, 10));
    }
    window.addEventListener('beforeunload', () => {
      sessionStorage.setItem('creamu_hj_search_scroll', String(window.scrollY));
    });
  } catch (e) {
    /* ignore */
  }
}
