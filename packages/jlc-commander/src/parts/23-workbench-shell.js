// @@creamu-part:23-workbench-shell
    function createWorkbenchV3() {
        initWorkbenchV3Styles();

        if (!document.getElementById('jlc-wb-fab')) {
            const fab = document.createElement('button');
            fab.id = 'jlc-wb-fab';
            fab.type = 'button';
            fab.title = '打开 Creamu 控制台 · 拖动可调整位置';
            fab.setAttribute('aria-label', '打开 Creamu 控制台');
            fab.setAttribute('aria-controls', 'jlc-wb');
            fab.setAttribute('aria-expanded', 'false');
            fab.innerHTML = '<span class="jlc-brand-mark" aria-hidden="true">c</span><span>控制台</span><span class="jlc-wb-fab-badge" aria-hidden="true">0</span>';
            document.body.appendChild(fab);
            bindWorkbenchFabDrag(fab);
        } else {
            bindWorkbenchFabDrag(document.getElementById('jlc-wb-fab'));
        }

        if (document.getElementById('jlc-wb')) return;

        const shell = document.createElement('div');
        shell.id = 'jlc-wb';
        shell.setAttribute('role', 'region');
        shell.setAttribute('aria-label', 'Creamu · JavLibrary 控制台');
        shell.tabIndex = -1;
        shell.innerHTML = ''
            + '<div class="jlc-wb-resize-w" title="拖拽调整宽度"></div>'
            + '<div class="jlc-wb-resize-h" title="拖拽调整高度"></div>'
            + '<div class="jlc-wb-resize-corner" title="拖拽调整大小"></div>'
            + '<div class="jlc-wb-header" title="按住标题栏拖动窗口">'
            + '  <div class="jlc-wb-brand"><div><div class="jlc-wb-title">控制台</div><div class="jlc-wb-subtitle"><span id="jlc-wb-header-sub">追更与资料</span></div></div></div>'
            + '  <div class="jlc-wb-header-actions">'
            + '    <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-layout-toggle" title="切换并排停靠与自由浮窗">浮窗</button>'
            + '    <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-settings-btn" aria-controls="jlc-wb-settings" aria-expanded="false">设置</button>'
            + '    <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-close-btn" title="收起控制台" aria-label="收起控制台">×</button>'
            + '  </div>'
            + '</div>'
            + '<nav class="jlc-wb-nav" aria-label="控制台导航">'
            + '  <button type="button" data-nav="tracking" class="active" aria-current="page">追更</button>'
            + '  <button type="button" data-nav="library">熟人库</button>'
            + '  <button type="button" data-nav="filter">过滤</button>'
            + '</nav>'
            + '<div class="jlc-wb-body">'
            + '  <div data-jlc-wb-page="tracking">'
            + '    <div class="jlc-wb-tracking-actions">'
            + '      <span class="jlc-wb-footer-summary" id="jlc-wb-footer-summary" role="status">我的追更</span>'
            + '      <div><button type="button" class="jlc-wb-btn primary" id="jlc-wb-save-current">收藏当前搜索</button>'
            + '      <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-refresh-all">刷新全部</button></div>'
            + '    </div><div id="jlc-wb-tracking-root"></div></div>'
            + '  <div data-jlc-wb-page="library" hidden><div id="jlc-wb-library-root">'
            + '    <div class="jlc-wb-view-block"><div class="jlc-wb-view-title">熟人与统计</div>'
            + '      <div class="stat-box"><div class="stat-item"><b id="jlc-wb-st-m">0</b><span>影片</span></div><div class="stat-item"><b id="jlc-wb-st-p">0</b><span>追踪</span></div><div class="stat-item"><b id="jlc-wb-st-v">0</b><span>已阅</span></div></div>'
            + '      <div class="legacy-note jlc-wb-intro-note">Emby 影片/熟人缓存统计；下方可手动加熟人。</div>'
            + '      <div class="jlc-wb-inline-form"><input id="jlc-wb-i-new-p" type="text" placeholder="演员或导演姓名" aria-label="演员或导演姓名"><button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-add-p">添加</button></div>'
            + '      <div id="jlc-wb-person-list" class="jlc-wb-list-stack"></div>'
            + '    </div></div></div>'
            + '  <div data-jlc-wb-page="filter" hidden><div id="jlc-wb-filter-root">'
            + '    <div class="jlc-wb-view-block"><div class="jlc-wb-view-title">心动标签</div>'
            + '      <div class="legacy-note jlc-wb-intro-note">不同标签各算 1 项，熟人合计 1 项；命中至少 2 项自动亮金框，已入库仍显示绿框。自动命中不加入手动心动。逗号分隔，失焦保存。</div>'
            + '      <textarea id="jlc-wb-i-fav" aria-label="心动标签" rows="3" placeholder="女优, 巨乳, … 逗号分隔"></textarea>'
            + '    </div>'
            + '    <div class="jlc-wb-view-block"><div class="jlc-wb-view-title">屏蔽标题词</div>'
            + '      <div class="legacy-note jlc-wb-intro-note">标题含这些词会淡化/隐藏。回车添加，点 × 删除。</div>'
            + '      <div id="jlc-wb-tags-hidden-word" class="jlc-wb-tag-editor" data-key="hiddenWord" data-placeholder="输入词后回车，支持逗号批量"></div>'
            + '    </div>'
            + '    <div class="jlc-wb-view-block"><div class="jlc-wb-view-title">屏蔽番号</div>'
            + '      <div class="legacy-note jlc-wb-intro-note">单个或系列前缀，如 SSIS、OPX-123。</div>'
            + '      <div id="jlc-wb-tags-hidden-avid" class="jlc-wb-tag-editor" data-key="hiddenAvid" data-placeholder="输入番号后回车，支持逗号批量"></div>'
            + '    </div>'
            + '    <div class="legacy-note jlc-wb-status-note" id="jlc-wb-hidden-summary">—</div>'
            + '  </div></div>'
            + '</div>'
            + '<div class="jlc-wb-settings" id="jlc-wb-settings" role="region" aria-label="控制台设置">'
            + '  <div class="jlc-wb-settings-panel">'
            + '    <div class="jlc-wb-settings-head">'
            + '      <strong>设置</strong>'
            + '      <button type="button" class="jlc-wb-icon-btn" id="jlc-wb-settings-close" aria-label="返回控制台" title="返回控制台">←</button>'
            + '    </div>'
            + '    <div class="jlc-wb-settings-nav" id="jlc-wb-settings-nav">'
            + '      <button type="button" data-jlc-settings-tab="resource" class="active">资源</button>'
            + '      <button type="button" data-jlc-settings-tab="display">显示</button>'
            + '      <button type="button" data-jlc-settings-tab="services">服务同步</button>'
            + '      <button type="button" data-jlc-settings-tab="backup">数据备份</button>'
            + '    </div>'
            + '    <div class="jlc-wb-settings-body">'
            // —— 资源：详情页增强 ——
            + '      <section class="jlc-wb-settings-section is-active" data-jlc-settings-panel="resource">'
            + '        <h3>详情页资源</h3>'
            + '        <div class="legacy-note jlc-wb-intro-note">控制详情页资源中心各模块，点底部「保存并应用」后生效。</div>'
            + '        <div class="legacy-row legacy-toggle"><span>详情页资源中心</span><input type="checkbox" data-jlc-wb-resource="resource_center"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>预告片模块</span><input type="checkbox" data-jlc-wb-resource="resource_trailer"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>截图模块</span><input type="checkbox" data-jlc-wb-resource="resource_screenshot"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>截图自动展开</span><input type="checkbox" data-jlc-wb-resource="resource_screenshot_auto"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>磁力模块</span><input type="checkbox" data-jlc-wb-resource="resource_magnet"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>字幕模块</span><input type="checkbox" data-jlc-wb-resource="resource_subtitle"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>站外链接</span><input type="checkbox" data-jlc-wb-resource="resource_links"></div>'
            + '      </section>'
            // —— 服务：Emby / MetaTube / WebDAV ——
            + '      <section class="jlc-wb-settings-section" data-jlc-settings-panel="services">'
            + '        <h3>数据同步</h3>'
            + '        <p class="legacy-note jlc-wb-intro-note">先更新 Emby 影片与熟人，再同步 WebDAV 数据。</p>'
            + '        <button type="button" class="jlc-wb-btn primary jlc-wb-block-action" id="jlc-wb-sync-now">立即同步全部数据</button>'
            + '        <h3 class="jlc-wb-section-title">Emby / MetaTube</h3>'
            + '        <div id="jlc-wb-config-diag" class="legacy-note"></div>'
            + '        <label>Emby 地址</label><input id="jlc-wb-i-url" type="text" placeholder="http://emby.example:8096">'
            + '        <label>Emby API Key</label><input id="jlc-wb-i-key" type="password">'
            + '        <div class="legacy-note">密钥框留空=不修改已保存值；只有输入新内容才会覆盖。</div>'
            + '        <button type="button" class="jlc-wb-btn ghost jlc-wb-block-action" id="jlc-wb-btn-sync">立即同步 Emby</button>'
            + '        <label>MetaTube Server</label><input id="jlc-wb-i-mt" type="text" placeholder="http://127.0.0.1:1234">'
            + '        <button type="button" class="jlc-wb-btn ghost jlc-wb-block-action" id="jlc-wb-btn-diag">重新读取并显示配置</button>'
            + '        <h3 class="jlc-wb-section-title">WebDAV 同步</h3>'
            + '        <div class="legacy-note">通用 WebDAV（坚果云 / Nextcloud / 群晖等）。读写 {路径}/jlc.vault.json。坚果云请用应用密码。</div>'
            + '        <label>地址</label><input id="jlc-wb-wd-url" type="text" placeholder="https://dav.jianguoyun.com/dav/">'
            + '        <label>用户名</label><input id="jlc-wb-wd-user" type="text" placeholder="坚果云需填注册邮箱（如 user@example.com，勿填昵称）" autocomplete="off" data-lpignore="true" data-bwignore="true" data-1p-ignore="true">'
            + '        <label>应用密码</label><input id="jlc-wb-wd-pass" type="password" placeholder="应用授权密码（非网页登录密码）" autocomplete="off" data-lpignore="true" data-bwignore="true" data-1p-ignore="true">'
            + '        <label>远端路径</label><input id="jlc-wb-wd-path" type="text" placeholder="/Creamu">'
            + '        <div class="legacy-row legacy-toggle"><span>启用同步</span><input type="checkbox" id="jlc-wb-wd-en"></div>'
            + '        <div class="legacy-row legacy-toggle"><span>开启自动同步（未勾选时仅手动同步）</span><input type="checkbox" id="jlc-wb-wd-auto"></div>'
            + '        <label>冲突策略</label><select id="jlc-wb-wd-conflict" class="jlc-wb-select"><option value="ask">询问</option><option value="remote">云端优先</option><option value="local">本机优先</option></select>'
            + '        <div class="legacy-note" id="jlc-wb-wd-status">—</div>'
            + '        <div class="jlc-wb-form-actions">'
            + '          <button type="button" class="jlc-wb-btn primary" id="jlc-wb-wd-test">测试连接</button>'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-wd-sync">立即同步</button>'
            + '        </div>'
            + '        <div class="jlc-wb-form-actions">'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-wd-push">强制推送</button>'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-wd-pull">强制拉取</button>'
            + '        </div>'
            + '      </section>'
            // —— 显示：列表/布局/按钮缩放（renderWorkbenchViewSettings 填充）——
            + '      <section class="jlc-wb-settings-section" data-jlc-settings-panel="display">'
            + '        <div id="jlc-wb-view-root"></div>'
            + '      </section>'
            // —— 备份：导入导出 ——
            + '      <section class="jlc-wb-settings-section" data-jlc-settings-panel="backup">'
            + '        <h3>导入 / 导出</h3>'
            + '        <div class="legacy-note jlc-wb-intro-note">配置/追更/Emby 按脚本安装隔离。从旧脚本迁移：先导出 → 再在这里导入。</div>'
            + '        <div class="jlc-wb-form-actions">'
            + '          <button type="button" class="jlc-wb-btn primary" id="jlc-wb-btn-import-config">仅导入配置</button>'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-import">完整导入</button>'
            + '        </div>'
            + '        <div class="jlc-wb-form-actions">'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-export-config">导出配置</button>'
            + '          <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-export">完整导出</button>'
            + '        </div>'
            + '        <div class="legacy-note">完整备份不含 meta_cache。</div>'
            + '        <h3 class="jlc-wb-section-title">数据检查</h3>'
            + '        <div class="legacy-note jlc-wb-intro-note">查看本机断点、浏览时间与点击记录数量。</div>'
            + '        <button type="button" class="jlc-wb-btn primary jlc-wb-block-action" id="jlc-wb-btn-integrity">检查断点·浏览·点击</button>'
            + '        <pre id="jlc-wb-data-integrity" class="legacy-note jlc-wb-data-report" hidden></pre>'
            + '      </section>'
            + '    </div>'
            + '    <div class="jlc-wb-settings-footer">'
            + '      <button type="button" class="jlc-wb-btn primary" id="jlc-wb-btn-save">保存并应用</button>'
            + '      <button type="button" class="jlc-wb-btn ghost" id="jlc-wb-btn-rescan">重扫当前页</button>'
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
            btn.addEventListener('click', () => {
                void activateWorkbenchNav(btn.dataset.nav || 'tracking', { reuseIfUnchanged: true });
            });
        });
        shell.querySelector('#jlc-wb-close-btn')?.addEventListener('click', closeWorkbenchV3);
        shell.querySelector('#jlc-wb-layout-toggle')?.addEventListener('click', () => {
            const next = getWorkbenchSession().panelMode === 'float' ? 'dock' : 'float';
            persistWorkbenchSession({ panelMode: next });
            applyWorkbenchShellGeometry({}, { skipPersist: true });
        });
        shell.querySelector('#jlc-wb-settings-btn')?.addEventListener('click', () => {
            const session = getWorkbenchSession();
            const next = !session.settingsOpen;
            setWorkbenchSettingsOpen(next);
            if (next) {
                syncWorkbenchSettingsForm();
            }
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
            const resume = typeof getTrackingRefreshResumeState === 'function'
                ? getTrackingRefreshResumeState()
                : null;
            if (resume?.pending_ids?.length) {
                void resumeSavedTrackingRefresh(event.currentTarget);
                return;
            }
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

        shell.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape' || event.defaultPrevented) return;
            event.preventDefault();
            if (getWorkbenchSession().settingsOpen) setWorkbenchSettingsOpen(false);
            else closeWorkbenchV3();
        });
        shell.querySelectorAll('label').forEach(label => {
            const field = label.nextElementSibling;
            if (field?.id && field.matches('input, select, textarea')) label.htmlFor = field.id;
        });
        shell.querySelectorAll('.legacy-toggle').forEach(row => {
            const label = document.createElement('label');
            label.className = row.className;
            label.append(...row.childNodes);
            row.replaceWith(label);
        });
        bindWorkbenchSettingsEvents(shell);
        window.addEventListener('resize', () => {
            applyWorkbenchShellGeometry({}, { skipPersist: true });
        });
        syncWorkbenchSettingsForm();
        if (!workbenchUiBound) {
            workbenchUiBound = true;
            window.addEventListener('pagehide', () => {
                captureWorkbenchScroll();
                if (typeof markTrackingRefreshInterrupted === 'function') {
                    markTrackingRefreshInterrupted();
                }
            });
        }
    }

    async function restoreWorkbenchSession() {
        createWorkbenchV3();
        const session = getWorkbenchSession();
        if (session.panelOpen) {
            openWorkbenchV3(normalizeWorkbenchMainNav(session.nav));
            if (session.settingsOpen) {
                setWorkbenchSettingsOpen(true, session.settingsSection || '');
                syncWorkbenchSettingsForm();
            }
        } else {
            await refreshWorkbenchFabBadge();
        }
    }
