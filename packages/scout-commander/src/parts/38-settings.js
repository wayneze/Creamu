// @@creamu-part:38-settings
function setScoutSettingsOpen(open, tab) {
  const drawer = document.getElementById('jlc-wb-settings');
  if (!drawer) return;
  drawer.classList.toggle('is-open', !!open);
  if (open) {
    renderScoutSettingsSection(tab || 'overview');
  }
}

function renderScoutSettingsSection(tab) {
  const t = tab || 'overview';
  document.querySelectorAll('[data-scout-settings-tab]').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-scout-settings-tab') === t);
  });
  renderSettingsPage(t);
}

function renderSettingsPage(section) {
  const container = document.getElementById('scout-settings-body');
  if (!container) return;
  const sec = section || 'overview';

  const cfg = getConfig();
  const terms = getLexiconTerms();
  const blocks = getBlockList();
  const tracks = getTracks();
  const pubs = getPublishers();
  const clickCount = typeof getClickedCount === 'function' ? getClickedCount() : 0;

  const statusStr = scoutSync ? scoutSync.statusText() : '未加载同步模块';
  let html = '';

  if (sec === 'ui') {
    html = `
      <h3>站点界面</h3>
      <div class="legacy-row">
        <label class="legacy-toggle">
          <span>站点奶油主题</span>
          <input type="checkbox" id="scout-cfg-cream-site" ${cfg.cream_site_theme !== false ? 'checked' : ''}>
        </label>
      </div>
      <div class="legacy-note" style="margin-top:8px;line-height:1.5;">
        开启后重绘三站底色、顶栏、列表卡片（非统一奶油）。<br>
        <b>xvideos 暖红 · xnxx 冷蓝 · eporner 叶绿</b>。卡片用站点色，不用白底。关闭=原生样式。
      </div>
      <h3 style="margin-top:16px;">浏览</h3>
      <div class="legacy-row">
        <label class="legacy-toggle">
          <span>新标签打开影片</span>
          <input type="checkbox" id="scout-cfg-open-new-tab" ${cfg.open_videos_new_tab !== false ? 'checked' : ''}>
        </label>
      </div>
      <div class="legacy-note" style="margin-top:8px;">开启后列表点影片在新标签打开，不离开当前搜索页。组合搜索同样用新标签。</div>
      <div class="legacy-row" style="margin-top:12px;">
        <label class="legacy-toggle">
          <span>关闭站点自动预览</span>
          <input type="checkbox" id="scout-cfg-block-site-preview" ${cfg.block_site_auto_preview !== false ? 'checked' : ''}>
        </label>
      </div>
      <div class="legacy-note" style="margin-top:8px;line-height:1.5;">
        关闭站点列表自动播放预览，减轻下滑卡顿。<br>
        点缩略图的手动预览仍可用。
      </div>
    `;
  } else if (sec === 'overview') {
    html = `
      <h3>数据概况</h3>
      <div class="stat-box">
        <div class="stat-item"><b>${terms.filter(t => t.status !== 'retired').length}</b><span>词库</span></div>
        <div class="stat-item"><b>${blocks.length}</b><span>屏蔽</span></div>
        <div class="stat-item"><b>${pubs.length}</b><span>熟人</span></div>
        <div class="stat-item"><b>${tracks.length}</b><span>追更</span></div>
      </div>
      <div class="stat-box" style="margin-top:10px;">
        <div class="stat-item"><b>${typeof getWorks === 'function' ? getWorks().length : 0}</b><span>作品</span></div>
        <div class="stat-item"><b>${clickCount}</b><span>已点</span></div>
        <div class="stat-item" style="flex:2;text-align:left;padding:0 8px;">
          <span style="display:block;font-size:12px;color:#9a7d60;line-height:1.45;text-transform:none;letter-spacing:0;">
            已点 = 点过的片（灰显）· 断点 = 收藏搜索 last_seen
          </span>
        </div>
      </div>
      <button type="button" class="jlc-wb-btn ghost" id="scout-clear-clicks-btn" style="margin-top:12px;width:100%;">清空已点记录</button>
      <button type="button" class="jlc-wb-btn ghost" id="scout-purge-block-terms-btn" style="margin-top:8px;width:100%;">清理词库中的屏蔽词</button>
      <div class="legacy-note" style="margin-top:6px;">把「已在屏蔽表」或 note 写「用于屏蔽」的条目移出词库，只留在屏蔽里。</div>
    `;
  } else if (sec === 'backup') {
    html = `
      <h3>词库+屏蔽（给 AI）</h3>
      <div class="legacy-note" style="margin:0 0 8px;line-height:1.45;">
        推荐：点「复制给 AI」= 提示词 + 数据包，直接粘贴对话。<br>
        回填后整段 JSON 粘到下方点「覆盖导入」。<br>
        <b>覆盖</b>＝以包为准（包外旧词会删），<b>同词保留本地热度/use</b>。<br>
        「合并」只增补不删旧词。不含熟人/断点/已点。
      </div>
      <textarea id="scout-ai-textarea" style="width:100%;height:120px;font-family:monospace;font-size:11.5px;padding:8px;border-radius:12px;border:1px solid #e4d4bc;" placeholder="词库+屏蔽 JSON…"></textarea>
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
        <button class="jlc-wb-btn primary" id="scout-ai-copy-chat" style="flex:1.4;min-width:100px;">📋 复制给 AI</button>
        <button class="jlc-wb-btn ghost" id="scout-ai-copy-prompt" style="flex:1;min-width:80px;">只复制提示词</button>
      </div>
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
        <button class="jlc-wb-btn ghost" id="scout-ai-export" style="flex:1;min-width:70px;">导出JSON</button>
        <button class="jlc-wb-btn ghost" id="scout-ai-copy" style="flex:1;min-width:70px;">复制JSON</button>
        <button class="jlc-wb-btn ghost" id="scout-ai-import" style="flex:1.2;min-width:80px;color:#b54708;">覆盖导入</button>
        <button class="jlc-wb-btn ghost" id="scout-ai-import-merge" style="flex:1;min-width:70px;">合并</button>
        <button class="jlc-wb-btn ghost" id="scout-ai-clip" style="flex:1;min-width:70px;color:#b54708;">剪贴板覆盖</button>
      </div>

      <h3 style="margin-top:16px;">完整备份</h3>
      <div class="legacy-note" style="margin:0 0 8px;">词库+屏蔽+熟人+断点+已点</div>
      <textarea id="scout-backup-textarea" style="width:100%;height:72px;font-family:monospace;font-size:11.5px;padding:8px;border-radius:12px;border:1px solid #e4d4bc;" placeholder="完整 JSON…"></textarea>
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
        <button class="jlc-wb-btn ghost" id="scout-export-btn" style="flex:1;min-width:70px;">导出</button>
        <button class="jlc-wb-btn ghost" id="scout-copy-btn" style="flex:1;min-width:70px;">复制</button>
        <button class="jlc-wb-btn ghost" id="scout-import-btn" style="flex:1;min-width:70px;color:#b54708;">导入</button>
        <button class="jlc-wb-btn ghost" id="scout-import-clipboard-btn" style="flex:1;min-width:70px;color:#b54708;">剪贴板</button>
      </div>
    `;
  } else {
    html = `
      <h3>WebDAV 同步</h3>
      <div class="legacy-row">
        <label class="legacy-toggle">
          <span>启用同步</span>
          <input type="checkbox" id="scout-wd-enabled" ${cfg.webdav_enabled ? 'checked' : ''}>
        </label>
      </div>
      <div id="scout-wd-form" style="${cfg.webdav_enabled ? '' : 'display:none;'}">
        <label>服务器地址</label>
        <input type="text" id="scout-wd-url" value="${escapeHtml(cfg.webdav_url)}" placeholder="https://dav.jianguoyun.com/dav/">
        <label>用户名</label>
        <input type="text" id="scout-wd-user" value="${escapeHtml(cfg.webdav_user)}" placeholder="example@email.com">
        <label>应用密码</label>
        <input type="password" id="scout-wd-password" value="${escapeHtml(cfg.webdav_password)}" placeholder="应用密码">
        <label>远端路径</label>
        <input type="text" id="scout-wd-path" value="${escapeHtml(cfg.webdav_path)}" placeholder="/Creamu">
        <div class="legacy-row" style="margin-top:12px;">
          <label class="legacy-toggle">
            <span>自动同步 (约 8 秒)</span>
            <input type="checkbox" id="scout-wd-auto" ${cfg.webdav_auto !== false ? 'checked' : ''}>
          </label>
        </div>
        <label>冲突策略</label>
        <select id="scout-wd-conflict">
          <option value="ask" ${cfg.webdav_conflict === 'ask' ? 'selected' : ''}>询问</option>
          <option value="local" ${cfg.webdav_conflict === 'local' ? 'selected' : ''}>本机优先</option>
          <option value="remote" ${cfg.webdav_conflict === 'remote' ? 'selected' : ''}>云端优先</option>
        </select>
        <div class="legacy-note" style="margin-top:10px;word-break:break-all;">
          <b>状态</b><br><span id="scout-wd-status-text">${escapeHtml(statusStr)}</span>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;">
          <button class="jlc-wb-btn ghost" id="scout-wd-test-btn" style="flex:1;">测试连接</button>
          <button class="jlc-wb-btn primary" id="scout-wd-sync-btn" style="flex:1;">手动同步</button>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  const refresh = () => renderScoutSettingsSection(sec);
  const textBackup = container.querySelector('#scout-backup-textarea');

  container.querySelector('#scout-cfg-cream-site')?.addEventListener('change', (e) => {
    const curCfg = getConfig();
    curCfg.cream_site_theme = !!e.currentTarget.checked;
    saveConfig(curCfg); // 内含 applyScoutSiteTheme
    showToast(curCfg.cream_site_theme ? '已开启站点主题' : '已关闭站点主题');
  });

  container.querySelector('#scout-cfg-open-new-tab')?.addEventListener('change', (e) => {
    const curCfg = getConfig();
    curCfg.open_videos_new_tab = !!e.currentTarget.checked;
    saveConfig(curCfg);
    showToast(curCfg.open_videos_new_tab ? '影片将在新标签打开' : '影片将在当前页打开');
  });

  container.querySelector('#scout-cfg-block-site-preview')?.addEventListener('change', (e) => {
    const curCfg = getConfig();
    curCfg.block_site_auto_preview = !!e.currentTarget.checked;
    saveConfig(curCfg);
    if (typeof applyBlockSiteAutoPreviewMode === 'function') {
      try { applyBlockSiteAutoPreviewMode(); } catch (_) { /* ignore */ }
    } else if (typeof pauseSiteListPreviewVideos === 'function') {
      try { pauseSiteListPreviewVideos(); } catch (_) { /* ignore */ }
    }
    showToast(curCfg.block_site_auto_preview ? '已关闭站点自动预览' : '已恢复站点自动预览');
  });

  const copyText = (data, ta) => {
    if (typeof GM_setClipboard === 'function') {
      GM_setClipboard(data);
      showToast('已复制到剪贴板');
    } else if (ta) {
      ta.value = data;
      ta.select();
      document.execCommand('copy');
      showToast('已全选，请 Ctrl+C');
    }
  };
  const readClip = async () => {
    if (navigator.clipboard && navigator.clipboard.readText) {
      return await navigator.clipboard.readText();
    }
    return '';
  };

  const aiTa = container.querySelector('#scout-ai-textarea');
  const afterAiImport = (r) => {
    if (!r) return;
    const modeLabel = r.mode === 'merge' ? '已合并' : '已覆盖';
    let msg = `${modeLabel}：词库 ${r.terms || 0} · 屏蔽 ${r.blocks || 0}`;
    if (r.keptStats) msg += ` · 保留热度 ${r.keptStats}`;
    if (r.removed) msg += ` · 移除旧词 ${r.removed}`;
    if (r.diverted) msg += ` · 改道屏蔽 ${r.diverted}`;
    if (r.purged) msg += ` · 已从词库清除 ${r.purged}`;
    if (r.dedupedTerms) msg += ` · 压重复词 ${r.dedupedTerms}`;
    if (r.dedupedBlocks) msg += ` · 压重复屏蔽 ${r.dedupedBlocks}`;
    showToast(msg);
    renderLexiconPage();
    renderComboPage();
    applyListBlocks();
    renderBlocksPage();
  };
  container.querySelector('#scout-ai-copy-chat')?.addEventListener('click', () => {
    const blob = exportAiLexiconForChat();
    if (aiTa) aiTa.value = exportAiLexiconPackage();
    copyText(blob, null);
    showToast('已复制：提示词 + 数据包（粘贴给 AI）');
  });
  container.querySelector('#scout-ai-copy-prompt')?.addEventListener('click', () => {
    copyText(getScoutAiPromptText(), null);
    showToast('已复制 AI 提示词');
  });
  container.querySelector('#scout-ai-export')?.addEventListener('click', () => {
    if (!aiTa) return;
    aiTa.value = exportAiLexiconPackage();
    showToast('词库+屏蔽已导出');
  });
  container.querySelector('#scout-ai-copy')?.addEventListener('click', () => {
    copyText(exportAiLexiconPackage(), aiTa);
  });
  container.querySelector('#scout-ai-import')?.addEventListener('click', () => {
    const val = (aiTa && aiTa.value.trim()) || '';
    if (!val) return showToast('文本框为空', true);
    if (!confirm('覆盖导入词库+屏蔽？\n· 以包为准，包里没有的旧词会删掉\n· 同词保留本地 heat / use / good / bad')) return;
    afterAiImport(importAiLexiconPackage(val, { mode: 'replace' }));
  });
  container.querySelector('#scout-ai-import-merge')?.addEventListener('click', () => {
    const val = (aiTa && aiTa.value.trim()) || '';
    if (!val) return showToast('文本框为空', true);
    if (!confirm('合并导入？（只增补/更新，不删本地旧词）')) return;
    afterAiImport(importAiLexiconPackage(val, { mode: 'merge' }));
  });
  container.querySelector('#scout-ai-clip')?.addEventListener('click', async () => {
    if (!confirm('从剪贴板覆盖导入词库+屏蔽？\n同词保留本地热度，包外旧词删除。')) return;
    try {
      const text = await readClip();
      if (!text) return showToast('剪贴板为空', true);
      if (aiTa) aiTa.value = text;
      afterAiImport(importAiLexiconPackage(text, { mode: 'replace' }));
    } catch (_) {
      showToast('读取剪贴板失败', true);
    }
  });

  container.querySelector('#scout-clear-clicks-btn')?.addEventListener('click', () => {
    if (!confirm('确定清空全部「已点」记录？不影响词库、屏蔽与追更断点。')) return;
    clearAllClicks();
    showToast('已点记录已清空');
    document.querySelectorAll('.scout-visited-item').forEach(el => el.classList.remove('scout-visited-item'));
    refresh();
  });

  container.querySelector('#scout-purge-block-terms-btn')?.addEventListener('click', () => {
    if (!confirm('从词库移除：已在屏蔽表中的词，以及标记「用于屏蔽」的词？')) return;
    const n = purgeBlockedTermsFromLexicon();
    showToast(n ? `已从词库清除 ${n} 条（仅保留在屏蔽）` : '词库中没有需要清理的屏蔽词');
    renderLexiconPage();
    renderComboPage();
    renderBlocksPage();
    refresh();
  });

  container.querySelector('#scout-export-btn')?.addEventListener('click', () => {
    if (!textBackup) return;
    textBackup.value = exportLexiconPackage();
    showToast('已导出（词库/屏蔽/熟人/断点/已点）');
  });

  container.querySelector('#scout-import-btn')?.addEventListener('click', () => {
    const val = (textBackup && textBackup.value.trim()) || '';
    if (!val) return showToast('文本框为空', true);
    if (!confirm('确定从文本框导入并合并？')) return;
    if (importLexiconPackage(val)) {
      showToast('导入成功');
      refresh();
    }
  });

  container.querySelector('#scout-copy-btn')?.addEventListener('click', () => {
    const data = exportLexiconPackage();
    if (typeof GM_setClipboard === 'function') {
      GM_setClipboard(data);
      showToast('已复制到剪贴板');
    } else if (textBackup) {
      textBackup.value = data;
      textBackup.select();
      document.execCommand('copy');
      showToast('已全选，请 Ctrl+C');
    }
  });

  container.querySelector('#scout-import-clipboard-btn')?.addEventListener('click', async () => {
    if (!confirm('从剪贴板导入并合并？')) return;
    try {
      const text = (navigator.clipboard && navigator.clipboard.readText)
        ? await navigator.clipboard.readText()
        : '';
      if (!text) return showToast('剪贴板为空，请手动粘贴后导入', true);
      if (importLexiconPackage(text)) {
        showToast('剪贴板导入成功');
        refresh();
      }
    } catch (_) {
      showToast('读取剪贴板失败', true);
    }
  });

  const wdEnabledCb = container.querySelector('#scout-wd-enabled');
  const wdForm = container.querySelector('#scout-wd-form');
  wdEnabledCb?.addEventListener('change', () => {
    const curCfg = getConfig();
    curCfg.webdav_enabled = !!wdEnabledCb.checked;
    saveConfig(curCfg);
    if (wdForm) wdForm.style.display = curCfg.webdav_enabled ? '' : 'none';
    initScoutWebDav();
    refresh();
  });

  ['scout-wd-url', 'scout-wd-user', 'scout-wd-password', 'scout-wd-path', 'scout-wd-conflict'].forEach((id) => {
    const el = container.querySelector('#' + id);
    if (!el) return;
    el.addEventListener('change', () => {
      const curCfg = getConfig();
      const q = (sid) => container.querySelector('#' + sid);
      curCfg.webdav_url = (q('scout-wd-url')?.value || '').trim();
      curCfg.webdav_user = (q('scout-wd-user')?.value || '').trim();
      curCfg.webdav_password = q('scout-wd-password')?.value || '';
      curCfg.webdav_path = (q('scout-wd-path')?.value || '').trim();
      curCfg.webdav_conflict = q('scout-wd-conflict')?.value || 'ask';
      saveConfig(curCfg);
      initScoutWebDav();
      const st = container.querySelector('#scout-wd-status-text');
      if (st && scoutSync) st.textContent = scoutSync.statusText();
    });
  });

  container.querySelector('#scout-wd-auto')?.addEventListener('change', (e) => {
    const curCfg = getConfig();
    curCfg.webdav_auto = !!e.currentTarget.checked;
    saveConfig(curCfg);
    initScoutWebDav();
  });

  container.querySelector('#scout-wd-test-btn')?.addEventListener('click', async () => {
    const testBtn = container.querySelector('#scout-wd-test-btn');
    if (!testBtn) return;
    testBtn.disabled = true;
    testBtn.textContent = '测试中…';
    try {
      if (!scoutSync) throw new Error('同步实例未就绪');
      await scoutSync.testConnection();
    } catch (e) {
      showToast(e.message || '测试失败', true);
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = '测试连接';
      const st = container.querySelector('#scout-wd-status-text');
      if (st && scoutSync) st.textContent = scoutSync.statusText();
    }
  });

  container.querySelector('#scout-wd-sync-btn')?.addEventListener('click', async () => {
    const syncBtn = container.querySelector('#scout-wd-sync-btn');
    if (!syncBtn) return;
    syncBtn.disabled = true;
    syncBtn.textContent = '同步中…';
    try {
      if (!scoutSync) throw new Error('同步实例未就绪');
      await scoutSync.syncNow();
      renderLexiconPage();
      renderBlocksPage();
      renderPublishersPage();
      renderTracksPage();
      renderComboPage();
    } catch (e) {
      showToast(e.message || '同步出错', true);
    } finally {
      syncBtn.disabled = false;
      syncBtn.textContent = '手动同步';
      refresh();
    }
  });
}

// 
