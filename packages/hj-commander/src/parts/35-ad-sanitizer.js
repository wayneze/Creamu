// 35-ad-sanitizer.js

/**
 * 站点用 sessionStorage.pageOpen 决定进站弹窗。
 * 刷新会重新读它；新标签页是空的，所以每次打开帖子都会再弹。脚本一加载就写上。
 */
function armHjEntryDialog() {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('pageOpen', '1');
  } catch (_) {}
}

function hjDialogText(el) {
  return String((el && (el.textContent || el.innerText)) || '').replace(/\s+/g, '');
}

function isHjLandingDialog(el) {
  if (!el) return false;
  const className = String(el.className || '');
  if (className.includes('luodiye_dialog')) return true;
  if (typeof el.querySelector === 'function' && el.querySelector('.luodiye_dialog')) return true;
  const text = hjDialogText(el);
  if (!text || /重新登录|登录令牌|支付|密码|验证码|忘记密码/.test(text)) return false;
  return /重要提示|亲爱的海友|年满18|请收藏|永久网址|不会迷路|页面被劫持|自动进入本站|海外华人社区|秒后自动进入/.test(text);
}

/** 首页落地弹窗和确认提示。登录、支付、验证码这类弹窗不关。 */
function closeHjLandingDialogs() {
  armHjEntryDialog();
  if (typeof document === 'undefined') return;
  const wrappers = document.querySelectorAll('.el-dialog__wrapper, .luodiye_dialog, .el-message-box__wrapper, .van-dialog, .van-popup, #hj_modal_confirm');
  wrappers.forEach((wrap) => {
    if (!isHjLandingDialog(wrap)) return;
    if (typeof wrap.querySelectorAll === 'function') {
      wrap.querySelectorAll('button, span, .el-button').forEach((button) => {
        const label = String(button.textContent || '').replace(/\s+/g, '');
        if (/^(我知道了|好|确认|我确认)([（(]\d+[)）])?$/.test(label)) button.click();
      });
    }
    const layer = (typeof wrap.closest === 'function' && (wrap.closest('.el-dialog__wrapper') || wrap.closest('.van-popup') || wrap.closest('.van-dialog'))) || wrap;
    if (layer.parentElement) layer.parentElement.removeChild(layer);
  });
  const left = [...document.querySelectorAll('.el-dialog__wrapper, .el-message-box__wrapper, .van-dialog, .van-popup')]
    .some((wrap) => /重新登录|登录令牌|支付|密码|验证码/.test(hjDialogText(wrap)));
  if (left) return;
  document.querySelectorAll('.v-modal, .van-overlay').forEach((mask) => {
    if (mask.parentElement) mask.parentElement.removeChild(mask);
  });
  if (document.body) {
    document.body.classList.remove('el-popup-parent--hidden', 'van-overflow-hidden');
    if (document.body.style) document.body.style.overflow = '';
  }
  if (document.documentElement && document.documentElement.style) document.documentElement.style.overflow = '';

  document.querySelectorAll('.addbox').forEach((box) => {
    const text = String(box.innerText || '').replace(/\s+/g, '');
    if (!/添加到主屏幕|添加海角社区到主屏幕/.test(text)) return;
    const close = box.querySelector('.van-icon-cross');
    if (close) close.click();
    if (box.parentElement) box.parentElement.removeChild(box);
  });
}

function applyHjAdSanitizer() {
  if (typeof window !== 'undefined' && window.__creamu_hj_ad_ready) {
    closeHjLandingDialogs();
    return;
  }
  if (typeof window !== 'undefined') window.__creamu_hj_ad_ready = true;
  closeHjLandingDialogs();
  if (typeof setInterval === 'function') setInterval(closeHjLandingDialogs, 800);
}

armHjEntryDialog();
