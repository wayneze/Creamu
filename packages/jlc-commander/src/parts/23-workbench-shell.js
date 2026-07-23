// @@creamu-part:23-workbench-shell
    function createWorkbenchV3() {
        initWorkbenchV3Styles();

        if (!document.getElementById('jlc-wb-fab')) {
            const fab = document.createElement('button');
            fab.id = 'jlc-wb-fab';
            fab.type = 'button';
            fab.title = 'Creamu · JavLibrary（可拖动）';
            fab.innerHTML = '<span>⌘</span><span class="jlc-wb-fab-badge">0</span>';
            document.body.appendChild(fab);
            bindWorkbenchFabDrag(fab);
        } else {
            bindWorkbenchFabDrag(document.getElementById('jlc-wb-fab'));
        }

        if (document.getElementById('jlc-wb')) return;

        const shell = document.createElement('div');
        shell.id = 'jlc-wb';
        shell.innerHTML = ''
            + '<div class="jlc-wb-resize-w" title="拖拽调整宽度"></div>'
            + '<div class="jlc-wb-resize-h" title="拖拽调整高度"></div>'
            + '<div class="jlc-wb-resize-corner" title="拖拽调整大小"></div>'
            + '<div class="jlc-wb-header" title="按住标题栏拖动窗口">'
            + '  <div><div class="jlc-wb-title">Creamu · JavLibrary</div><div class="jlc-wb-subtitle" id="jlc-wb-header-sub">加载中… · 可拖动</div></div>'
            + '  <div class="jlc-wb-header-actions">'
            + '    <button type="button" class="jlc-wb-chip" id="jlc-wb-open-mode-toggle" title="切换默认打开方式">新标签</button>'
            + '    <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-settings-btn" title="设置">⚙</button>'
            + '    <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-min-btn" title="收起">—</button>'
            + '    <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-close-btn" title="关闭">×</button>'
            + '  </div>'
            + '</div>'
            + '<div class="jlc-wb-nav">'
            + '  <button type="button" data-nav="tracking" class="active">追更</button>'
            + '  <button type="button" data-nav="library">库</button>'
            + '  <button type="button" data-nav="filter">过滤</button>'
            + '</div>'
            + '<div class="jlc-wb-body">'
            + '  <div data-jlc-wb-page="tracking"><div id="jlc-wb-tracking-root"></div></div>'
            + '  <div data-jlc-wb-page="library" hidden><div id="jlc-wb-library-root" style="padding:14px;overflow:auto;flex:1;min-height:0;">'
            + '    <div class="jlc-wb-view-block"><div class="jlc-wb-view-title">熟人与统计</div>'
            + '      <div class="stat-box"><div class="stat-item"><b id="jlc-wb-st-m">0</b><span>影片</span></div><div class="stat-item"><b id="jlc-wb-st-p">0</b><span>追踪</span></div><div class="stat-item"><b id="jlc-wb-st-v">0</b><span>已阅</span></div></div>'
            + '      <div class="legacy-note" style="margin:0 0 10px;">Emby 影片/熟人缓存统计；下方可手动加熟人。</div>'
            + '      <div style="display:flex;gap:6px;"><input id="jlc-wb-i-new-p" type="text" placeholder="手动添加演员/导演" style="flex:1"><button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-add-p">+</button></div>'
            + '      <div id="jlc-wb-person-list" style="margin-top:10px;"></div>'
            + '    </div></div></div>'
            + '  <div data-jlc-wb-page="filter" hidden><div id="jlc-wb-filter-root" style="padding:14px;overflow:auto;flex:1;min-height:0;">'
            + '    <div class="jlc-wb-view-block"><div class="jlc-wb-view-title">心动标签</div>'
            + '      <div class="legacy-note" style="margin:0 0 8px;">列表高亮你关心的标签。回车或失焦即保存。</div>'
            + '      <textarea id="jlc-wb-i-fav" rows="3" placeholder="女优, 巨乳, … 逗号分隔"></textarea>'
            + '    </div>'
            + '    <div class="jlc-wb-view-block"><div class="jlc-wb-view-title">屏蔽标题词</div>'
            + '      <div class="legacy-note" style="margin:0 0 8px;">标题含这些词会淡化/隐藏。回车添加，点 × 删除。</div>'
            + '      <div id="jlc-wb-tags-hidden-word" class="jlc-wb-tag-editor" data-key="hiddenWord" data-placeholder="输入词后回车，支持逗号批量"></div>'
            + '    </div>'
            + '    <div class="jlc-wb-view-block"><div class="jlc-wb-view-title">屏蔽番号</div>'
            + '      <div class="legacy-note" style="margin:0 0 8px;">单个或系列前缀，如 SSIS、OPX-123。</div>'
            + '      <div id="jlc-wb-tags-hidden-avid" class="jlc-wb-tag-editor" data-key="hiddenAvid" data-placeholder="输入番号后回车，支持逗号批量"></div>'
            + '    </div>'
            + '    <div class="legacy-note" id="jlc-wb-hidden-summary" style="margin:4px 0 0;">—</div>'
            + '  </div></div>'
            + '</div>'
            + '<div class="jlc-wb-footer">'
            + '  <div class="jlc-wb-footer-summary" id="jlc-wb-footer-summary">—</div>'
            + '  <div style="display:flex;gap:8px;flex-wrap:wrap;">'
            + '    <button type="button" class="jlc-wb-btn primary" id="jlc-wb-save-current">⭐ 收藏当前</button>'
            + '    <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-refresh-all">刷新全部</button>'
            + '    <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-sync-now" title="先同步 Emby，再推送 WebDAV（含点击/心动/追更/屏蔽词）">☁ 立即同步</button>'
            + '  </div>'
            + '</div>'
            + '<div class="jlc-wb-settings" id="jlc-wb-settings">'
            + '  <div class="jlc-wb-settings-panel">'
            + '    <div class="jlc-wb-settings-head">'
            + '      <strong>设置</strong>'
            + '      <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-settings-close">×</button>'
            + '    </div>'
            + '    <div class="jlc-wb-settings-nav" id="jlc-wb-settings-nav">'
            + '      <button type="button" data-jlc-settings-tab="resource" class="active">资源</button>'
            + '      <button type="button" data-jlc-settings-tab="display">显示</button>'
            + '      <button type="button" data-jlc-settings-tab="services">服务</button>'
            + '      <button type="button" data-jlc-settings-tab="backup">备份</button>'
            + '    </div>'
            + '    <div id="jlc-wb-config-hint" class="legacy-note" hidden style="margin:0;padding:10px 12px;background:#2a1f10;border-bottom:1px solid #5a4020;color:#fde68a;line-height:1.5;"></div>'
            + '    <div class="jlc-wb-settings-body">'
            // —— 资源：详情页增强 ——
            + '      <section class="jlc-wb-settings-section is-active" data-jlc-settings-panel="resource">'
            + '        <h3>详情页资源</h3>'
            + '        <div class="legacy-note" style="margin:0 0 10px;">控制详情页资源中心各模块，点底部「保存并应用」后生效。</div>'
            + '        <div class="legacy-row legacy-toggle"><span>详情页资源中心</span><input type="checkbox" data-jlc-wb-resource="resource_center"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>预告片模块</span><input type="checkbox" data-jlc-wb-resource="resource_trailer"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>截图模块</span><input type="checkbox" data-jlc-wb-resource="resource_screenshot"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>截图自动展开</span><input type="checkbox" data-jlc-wb-resource="resource_screenshot_auto"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>磁力模块</span><input type="checkbox" data-jlc-wb-resource="resource_magnet"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>站外链接</span><input type="checkbox" data-jlc-wb-resource="resource_links"></div>'
            + '      </section>'
            // —— 服务：Emby / MetaTube / WebDAV ——
            + '      <section class="jlc-wb-settings-section" data-jlc-settings-panel="services">'
            + '        <h3>Emby / MetaTube</h3>'
            + '        <div id="jlc-wb-config-diag" class="legacy-note" style="margin:0 0 12px;padding:10px 12px;background:#1a222c;border:1px solid #334;border-radius:10px;color:#cde;line-height:1.6;"></div>'
            + '        <label>Emby 地址</label><input id="jlc-wb-i-url" type="text" placeholder="http://emby.example:8096">'
            + '        <label>Emby API Key</label><input id="jlc-wb-i-key" type="password">'
            + '        <div class="legacy-note">密钥框留空=不修改已保存值；只有输入新内容才会覆盖。</div>'
            + '        <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-sync" style="width:100%;margin-top:8px;">🔄 立即同步 Emby</button>'
            + '        <label>MetaTube Server</label><input id="jlc-wb-i-mt" type="text" placeholder="http://127.0.0.1:1234">'
            + '        <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-diag" style="width:100%;margin-top:8px;">🔍 重新读取并显示配置</button>'
            + '        <h3 style="margin-top:16px">WebDAV 同步</h3>'
            + '        <div class="legacy-note">通用 WebDAV（坚果云 / Nextcloud / 群晖等）。读写 {路径}/jlc.vault.json。坚果云请用应用密码。</div>'
            + '        <label>地址</label><input id="jlc-wb-wd-url" type="text" placeholder="https://dav.jianguoyun.com/dav/">'
            + '        <label>用户名</label><input id="jlc-wb-wd-user" type="text" placeholder="邮箱 / 用户名" autocomplete="username">'
            + '        <label>应用密码</label><input id="jlc-wb-wd-pass" type="password" placeholder="应用密码，非登录密码" autocomplete="new-password">'
            + '        <label>远端路径</label><input id="jlc-wb-wd-path" type="text" placeholder="/Creamu">'
            + '        <div class="legacy-row legacy-toggle"><span>启用同步</span><input type="checkbox" id="jlc-wb-wd-en"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>打开时自动同步</span><input type="checkbox" id="jlc-wb-wd-auto"></div>'
            + '        <label>冲突策略</label><select id="jlc-wb-wd-conflict" class="jlc-wb-select" style="width:100%;margin-top:6px;"><option value="ask">询问</option><option value="remote">云端优先</option><option value="local">本机优先</option></select>'
            + '        <div class="legacy-note" id="jlc-wb-wd-status" style="margin-top:8px;">—</div>'
            + '        <div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;">'
            + '          <button type="button" class="jlc-wb-btn primary" id="jlc-wb-wd-test" style="flex:1;min-width:100px;">测试连接</button>'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-wd-sync" style="flex:1;min-width:100px;">立即同步</button>'
            + '        </div>'
            + '        <div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;">'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-wd-push" style="flex:1;">强制推送</button>'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-wd-pull" style="flex:1;">强制拉取</button>'
            + '        </div>'
            + '      </section>'
            // —— 显示：列表/布局/按钮缩放（renderWorkbenchViewSettings 填充）——
            + '      <section class="jlc-wb-settings-section" data-jlc-settings-panel="display">'
            + '        <div id="jlc-wb-view-root"></div>'
            + '      </section>'
            // —— 备份：导入导出 ——
            + '      <section class="jlc-wb-settings-section" data-jlc-settings-panel="backup">'
            + '        <h3>导入 / 导出</h3>'
            + '        <div class="legacy-note" style="margin-bottom:10px;">配置/追更/Emby 按脚本安装隔离。从旧脚本迁移：先导出 → 再在这里导入。</div>'
            + '        <div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;">'
            + '          <button type="button" class="jlc-wb-btn primary" id="jlc-wb-btn-import-config" style="flex:1;min-width:120px;">仅导入配置</button>'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-import" style="flex:1;min-width:120px;">完整导入</button>'
            + '        </div>'
            + '        <div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;">'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-export-config" style="flex:1;min-width:120px;">导出配置</button>'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-export" style="flex:1;min-width:120px;">完整导出</button>'
            + '        </div>'
            + '        <div class="legacy-note">完整备份不含 meta_cache。</div>'
            + '        <h3 style="margin-top:14px">数据检查</h3>'
            + '        <div class="legacy-note" style="margin-bottom:8px;">查看本机断点、浏览时间与点击记录数量。</div>'
            + '        <button type="button" class="jlc-wb-btn primary" id="jlc-wb-btn-integrity" style="width:100%;">🩺 检查断点·浏览·点击</button>'
            + '        <pre id="jlc-wb-data-integrity" class="legacy-note" hidden style="margin-top:10px;white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto;font-size:12px;line-height:1.45;"></pre>'
            + '      </section>'
            + '    </div>'
            + '    <div class="jlc-wb-settings-footer">'
            + '      <button type="button" class="jlc-wb-btn primary" id="jlc-wb-btn-save" style="width:100%;">💾 保存并应用</button>'
            + '      <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-rescan" style="width:100%;">🔁 重扫当前页</button>'
            + '    </div>'
            + '  </div>'
            + '</div>';
        document.body.appendChild(shell);
        applyWorkbenchShellGeometry();
        bindWorkbenchResize(shell);
        bindWorkbenchDrag(shell);
        // 列表滚动绑在 #jlc-wb-list-scroll（渲染后挂），body 本身不再滚动，避免抢事件
        shell.querySelector('.jlc-wb-settings-body')?.addEventListener('scroll', scheduleWorkbenchScrollSave, { passive: true });
        shell.querySelector('#jlc-wb-library-root')?.addEventListener('scroll', scheduleWorkbenchScrollSave, { passive: true });
        shell.querySelector('#jlc-wb-filter-root')?.addEventListener('scroll', scheduleWorkbenchScrollSave, { passive: true });
        shell.querySelectorAll('.jlc-wb-nav button').forEach(btn => {
            btn.addEventListener('click', () => { void activateWorkbenchNav(btn.dataset.nav || 'tracking'); });
        });
        shell.querySelector('#jlc-wb-close-btn')?.addEventListener('click', closeWorkbenchV3);
        shell.querySelector('#jlc-wb-min-btn')?.addEventListener('click', closeWorkbenchV3);
        shell.querySelector('#jlc-wb-settings-btn')?.addEventListener('click', () => {
            const session = getWorkbenchSession();
            const next = !session.settingsOpen;
            setWorkbenchSettingsOpen(next);
            if (next) {
                syncWorkbenchSettingsForm();
                void refreshLibraryUI();
            }
        });
        shell.querySelector('#jlc-wb-open-mode-toggle')?.addEventListener('click', () => {
            const session = getWorkbenchSession();
            const next = session.openMode === 'tab' ? 'same' : 'tab';
            config.open_mode = next;
            GM_setValue('jlc_config_stable', config);
            persistWorkbenchSession({ openMode: next });
            updateWorkbenchOpenModeChip();
            showAlert(next === 'tab' ? '默认改为新标签打开。' : '默认改为本页打开。');
        });
        shell.querySelector('#jlc-wb-save-current')?.addEventListener('click', async () => {
            const currentContext = getCurrentTrackingPageContext();
            if (!currentContext) {
                showAlert('当前页面还不是可收藏的列表页。');
                return;
            }
            const customLabel = await showWorkbenchPrompt({
                title: '收藏当前搜索',
                note: '可填写备注名，留空则使用自动标题。',
                value: '',
                placeholder: '备注名（可选）'
            });
            if (customLabel === null) return;
            const record = await createOrUpdateTrackingFromContext(currentContext, {
                createIfMissing: true,
                touchBrowse: true,
                checkTop: true,
                updateCheck: true,
                seedSeen: true,
                customLabel
            });
            trackingPageState.record = record;
            trackingPageState.context = currentContext;
            trackingPageState.signature = currentContext.query_signature;
            trackingPageTouchSignature = currentContext.query_signature;
            applyTrackingPageDecorations(record);
            ensureTrackingPageBar({ context: currentContext, record });
            await renderWorkbenchTrackingList();
            showAlert('当前搜索已加入追更！');
        });
        shell.querySelector('#jlc-wb-refresh-all')?.addEventListener('click', (event) => {
            if (getTrackingRefreshRuntimeState()) return;
            void refreshAllTrackingSearches(event.currentTarget);
        });
        shell.querySelector('#jlc-wb-sync-now')?.addEventListener('click', (event) => {
            const btn = event.currentTarget;
            if (btn?.disabled) return;
            if (typeof syncEmbyAndWebDav === 'function') {
                void syncEmbyAndWebDav({ button: btn });
            } else {
                showAlert('同步功能未就绪', true);
            }
        });

        bindWorkbenchSettingsEvents(shell);
        updateWorkbenchOpenModeChip();
        syncWorkbenchSettingsForm();
        if (!workbenchUiBound) {
            workbenchUiBound = true;
            window.addEventListener('pagehide', () => {
                captureWorkbenchScroll();
            });
        }
    }

    function updateWorkbenchOpenModeChip() {
        const chip = document.getElementById('jlc-wb-open-mode-toggle');
        if (!chip) return;
        const mode = getWorkbenchSession().openMode || config.open_mode || 'tab';
        chip.textContent = mode === 'same' ? '本页' : '新标签';
        chip.classList.toggle('is-on', mode === 'tab');
    }

    async function restoreWorkbenchSession() {
        createWorkbenchV3();
        const session = getWorkbenchSession();
        updateWorkbenchOpenModeChip();
        if (session.panelOpen) {
            openWorkbenchV3(normalizeWorkbenchMainNav(session.nav));
            if (session.settingsOpen) {
                setWorkbenchSettingsOpen(true, session.settingsSection || '');
                syncWorkbenchSettingsForm();
                await refreshLibraryUI();
            }
        } else {
            await refreshWorkbenchFabBadge();
        }
    }
