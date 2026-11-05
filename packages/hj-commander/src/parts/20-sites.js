// 20-sites.js

function isHjSite() {
  const host = String(location.hostname || '').toLowerCase();
  return /(^|\.)haijiao[^.]*\.com$/.test(host);
}

function currentHjPostId(href = location.href) {
  const match = String(href || '').match(/(?:[?&#](?:pid|topicId)=|\/(?:post|topic)\/)(\d+)/i);
  return match ? match[1] : '';
}

function isHjPostDetail() { return !!currentHjPostId(); }
