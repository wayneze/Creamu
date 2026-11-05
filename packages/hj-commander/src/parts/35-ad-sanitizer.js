// 35-ad-sanitizer.js

// 只关闭站点已识别的落地提示；弹窗、遮罩和滚动锁由站点组件一起回收。
const hjDismissedDialogs = new WeakMap();
const hjLandingDialogSelector = '.luodiye_dialog, .luodiconfirm, .luodisconfirm, .addbox';
function closeHjLandingDialogs() {
  document.querySelectorAll(hjLandingDialogSelector).forEach(dialog => {
    if (!dialog.getClientRects().length || getComputedStyle(dialog).visibility === 'hidden') {
      hjDismissedDialogs.delete(dialog);
      return;
    }
    const button = dialog.matches('.addbox')
      ? dialog.querySelector('.van-icon-cross')
      : [...dialog.querySelectorAll('button, .el-dialog__footer .dialog-footer > span')]
        .find(el => /^(我知道了|好|确认|我确认)$/.test(el.textContent.trim()));
    if (!button || button.disabled) return;
    // Vant 会复用同一个节点展示下一步，内容变化后需要重新执行关闭。
    const content = dialog.textContent;
    if (hjDismissedDialogs.get(dialog) === content) return;
    hjDismissedDialogs.set(dialog, content);
    button.click();
  });
}

function applyHjAdSanitizer() { closeHjLandingDialogs(); }
