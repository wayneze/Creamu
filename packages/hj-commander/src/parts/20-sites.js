// 20-sites.js

/** 只在海角站点上跑。域名含 haijiao，或地址里带海角路径。 */
function isHjSite() {
  const host = String((typeof location !== 'undefined' && location.hostname) || '').toLowerCase();
  const href = String((typeof location !== 'undefined' && location.href) || '').toLowerCase();
  if (host.includes('haijiao')) return true;
  return /haijiao/.test(href);
}
