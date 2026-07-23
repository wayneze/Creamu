// @@creamu-part:22-workbench-settings
    function renderWorkbenchViewSettings() {
        const container = document.getElementById('jlc-wb-view-root');
        if (!container) return;
        const items = getLegacySettingsSchema().filter(item => item.type !== 'button');
        const toggles = items.filter(item => item.type === 'toggle');
        const layoutRanges = items.filter(item => item.type === 'range' && (item.key === 'columnNum' || item.key === 'waterfallWidth'));
        const uiRanges = items.filter(item => item.type === 'range' && item.key === 'uiBtnScale');
        const openMode = getWorkbenchSession().openMode || config.open_mode || 'tab';

        const renderRangeRow = (item) => {
            const value = item.key === 'columnNum' ? Status.getColumnNum()
                : item.key === 'uiBtnScale' ? clampUiBtnScale(Status.get(item.key))
                : Status.get(item.key);
            const step = item.step != null ? item.step : 1;
            return ''
                + '<div class="legacy-row">'
                + '  <div style="display:flex;justify-content:space-between;margin-bottom:6px;align-items:center;"><span>' + escapeHtml(item.label) + '</span><b style="color:#d4883a" data-jlc-wb-range-value="' + escapeHtml(item.key) + '">' + value + '</b></div>'
                + '  <div class="legacy-range"><input type="range" data-jlc-wb-range="' + escapeHtml(item.key) + '" min="' + item.min + '" max="' + item.max + '" step="' + step + '" value="' + value + '"></div>'
                + (item.key === 'uiBtnScale' ? '<div class="legacy-note" style="margin-top:6px;">只缩放工作台按钮与悬浮球，列表封面/文字不变。笔记本可试 80–90。</div>' : '')
                + '</div>';
        };

        // 与设置其它页一致：直接 h3 + legacy-row，不再套 view-block 卡片
        container.innerHTML = ''
            + '<h3>列表功能</h3>'
            + toggles.map(item => ''
                + '<div class="legacy-row legacy-toggle' + (item.disabled ? ' disabled' : '') + '">'
                + '  <span>' + escapeHtml(item.label) + '</span>'
                + '  <input type="checkbox" data-jlc-wb-toggle="' + escapeHtml(item.key) + '"' + (Status.get(item.key) ? ' checked' : '') + (item.disabled ? ' disabled' : '') + '>'
                + '</div>').join('')
            + '<h3 style="margin-top:16px">布局</h3>'
            + layoutRanges.map(renderRangeRow).join('')
            + '<h3 style="margin-top:16px">工作台</h3>'
            + uiRanges.map(renderRangeRow).join('')
            + '<div class="legacy-row" style="margin-top:4px;">'
            + '  <div style="margin-bottom:6px;">默认打开方式</div>'
            + '  <select id="jlc-wb-view-open-mode" class="jlc-wb-select" style="width:100%;">'
            + '    <option value="tab"' + (openMode === 'tab' ? ' selected' : '') + '>新标签打开</option>'
            + '    <option value="same"' + (openMode === 'same' ? ' selected' : '') + '>本页打开</option>'
            + '  </select>'
            + '</div>'
            + '<button type="button" class="jlc-wb-btn ghost" data-jlc-wb-action="downloadPanel" style="width:100%;margin-top:8px;">批量下载封面</button>';

        container.querySelectorAll('[data-jlc-wb-toggle]').forEach(input => {
            input.addEventListener('change', () => {
                const key = input.getAttribute('data-jlc-wb-toggle');
                Status.set(key, !!input.checked);
                legacySettingHandlers[key]?.(!!input.checked);
            });
        });
        container.querySelectorAll('[data-jlc-wb-range]').forEach(input => {
            input.addEventListener('input', () => {
                const key = input.getAttribute('data-jlc-wb-range');
                let value = Number(input.value);
                if (key === 'uiBtnScale') value = clampUiBtnScale(value);
                const valueEl = container.querySelector('[data-jlc-wb-range-value="' + CSS.escape(key) + '"]');
                if (valueEl) valueEl.textContent = String(value);
                if (key === 'columnNum') Status.set('columnNum', value);
                else Status.set(key, value);
                legacySettingHandlers[key]?.(value);
            });
        });
        container.querySelectorAll('[data-jlc-wb-action]').forEach(button => {
            button.addEventListener('click', () => {
                const key = button.getAttribute('data-jlc-wb-action');
                legacySettingHandlers[key]?.();
            });
        });
        container.querySelector('#jlc-wb-view-open-mode')?.addEventListener('change', (e) => {
            const next = e.currentTarget.value === 'same' ? 'same' : 'tab';
            config.open_mode = next;
            GM_setValue('jlc_config_stable', config);
            persistWorkbenchSession({ openMode: next });
            updateWorkbenchOpenModeChip();
        });
    }

    function syncWorkbenchSettingsForm() {
        const shell = getWorkbenchEl();
        if (!shell) return;
        // 每次打开都从内存 config 回填，避免密码框/隐藏分区导致“看起来没加载”
        config = loadConfig();
        const url = shell.querySelector('#jlc-wb-i-url');
        const key = shell.querySelector('#jlc-wb-i-key');
        const mt = shell.querySelector('#jlc-wb-i-mt');
        const fav = shell.querySelector('#jlc-wb-i-fav');
        if (url) url.value = config.emby_url || '';
        if (mt) mt.value = config.metatube_url || '';
        if (fav) fav.value = (config.fav_tags || []).join(', ');
        const hiddenSummary = shell.querySelector('#jlc-wb-hidden-summary');
        if (hiddenSummary) {
            try {
                const hiddenWords = Status.get('hiddenWord') || [];
                const hiddenAvids = Status.get('hiddenAvid') || [];
                hiddenSummary.textContent = '屏蔽标题词 ' + hiddenWords.length + ' 个 / 屏蔽番号 ' + hiddenAvids.length + ' 个';
            } catch (_) {
                hiddenSummary.textContent = '屏蔽词状态读取失败';
            }
        }
        if (key) {
            // 已保存密钥时不回填到 password（部分浏览器会丢隐藏 password 值），用占位提示
            if (compactText(config.emby_key || '')) {
                key.value = '';
                key.placeholder = '已保存密钥（留空=不修改，输入新值则覆盖）';
                key.dataset.hasSaved = '1';
            } else {
                key.value = '';
                key.placeholder = '粘贴 Emby API Key';
                key.dataset.hasSaved = '0';
            }
            key.dataset.userEdited = '0';
        }
        const openMode = shell.querySelector('#jlc-wb-open-mode');
        if (openMode) openMode.value = (getWorkbenchSession().openMode || config.open_mode || 'tab');
        const wdUrl = shell.querySelector('#jlc-wb-wd-url');
        const wdUser = shell.querySelector('#jlc-wb-wd-user');
        const wdPass = shell.querySelector('#jlc-wb-wd-pass');
        const wdPath = shell.querySelector('#jlc-wb-wd-path');
        const wdEn = shell.querySelector('#jlc-wb-wd-en');
        const wdAuto = shell.querySelector('#jlc-wb-wd-auto');
        const wdConf = shell.querySelector('#jlc-wb-wd-conflict');
        const wdStatus = shell.querySelector('#jlc-wb-wd-status');
        if (wdUrl) wdUrl.value = config.webdav_url || '';
        if (wdUser) wdUser.value = config.webdav_user || '';
        if (wdPath) wdPath.value = config.webdav_path || '/Creamu';
        if (wdPass) {
            wdPass.value = '';
            wdPass.placeholder = compactText(config.webdav_password || '')
                ? '已保存（留空不修改）'
                : '应用密码，非登录密码';
        }
        if (wdEn) wdEn.checked = !!config.webdav_enabled;
        if (wdAuto) wdAuto.checked = config.webdav_auto !== false;
        if (wdConf) wdConf.value = config.webdav_conflict || 'ask';
        if (wdStatus) {
            const sync = ensureCreamuSync();
            wdStatus.textContent = sync ? sync.statusText() : '同步模块未加载';
        }
        const resourceKeys = ['resource_center', 'resource_trailer', 'resource_screenshot', 'resource_screenshot_auto', 'resource_magnet', 'resource_links'];
        resourceKeys.forEach(k => {
            const input = shell.querySelector('[data-jlc-wb-resource="' + k + '"]');
            if (input) input.checked = config[k] !== false;
        });
        const hint = shell.querySelector('#jlc-wb-config-hint');
        if (hint) {
            if (isLikelyFreshDefaultConfig(config)) {
                hint.hidden = false;
                hint.textContent = '当前像是空配置（默认心动标签、无 Emby）。若以前用过旧版脚本，这通常是因为新脚本有独立存储：请到旧脚本导出备份，再在 设置 → 备份 里导入。';
            } else {
                hint.hidden = true;
                hint.textContent = '';
            }
        }
        updateWorkbenchConfigDiag();
    }

    function activateWorkbenchSettingsTab(tabId = 'resource') {
        const shell = getWorkbenchEl();
        if (!shell) return;
        const next = normalizeWorkbenchSettingsTab(tabId);
        shell.querySelectorAll('[data-jlc-settings-tab]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-jlc-settings-tab') === next);
        });
        shell.querySelectorAll('[data-jlc-settings-panel]').forEach(panel => {
            panel.classList.toggle('is-active', panel.getAttribute('data-jlc-settings-panel') === next);
        });
        persistWorkbenchSession({ settingsSection: next });
        // 含密码字段的页再回填一次，避免 password 空显示
        if (next === 'services' || next === 'backup') syncWorkbenchSettingsForm();
        if (next === 'display') renderWorkbenchViewSettings();
        const body = shell.querySelector('.jlc-wb-settings-body');
        if (body) body.scrollTop = 0;
    }

    function bindWorkbenchSettingsEvents(shell) {
        shell.querySelectorAll('[data-jlc-settings-tab]').forEach(btn => {
            btn.addEventListener('click', () => activateWorkbenchSettingsTab(btn.getAttribute('data-jlc-settings-tab') || 'resource'));
        });
        shell.querySelector('#jlc-wb-settings-close')?.addEventListener('click', () => setWorkbenchSettingsOpen(false));
        shell.querySelector('.jlc-wb-settings')?.addEventListener('click', (e) => {
            if (e.target?.classList?.contains('jlc-wb-settings')) setWorkbenchSettingsOpen(false);
        });
        shell.querySelector('#jlc-wb-i-key')?.addEventListener('input', (e) => {
            e.currentTarget.dataset.userEdited = '1';
        });
        shell.querySelector('#jlc-wb-btn-save')?.addEventListener('click', async () => {
            // 先读回最新 config，防止空 password 覆盖密钥
            const previous = loadConfig();
            const urlVal = shell.querySelector('#jlc-wb-i-url')?.value.trim().replace(/\/$/, '') || '';
            const keyEl = shell.querySelector('#jlc-wb-i-key');
            const keyTyped = keyEl?.value.trim() || '';
            const mtVal = shell.querySelector('#jlc-wb-i-mt')?.value.trim().replace(/\/$/, '') || '';
            const favRaw = shell.querySelector('#jlc-wb-i-fav')?.value;
            const favList = String(favRaw ?? '').split(',').map(s => s.trim()).filter(Boolean);

            config.emby_url = urlVal;
            // 密钥：留空且已有保存值 => 不改；用户输入了才覆盖
            if (keyTyped) {
                config.emby_key = keyTyped;
            } else if (previous.emby_key) {
                config.emby_key = previous.emby_key;
            } else {
                config.emby_key = '';
            }
            config.metatube_url = mtVal;
            // 心动标签：只要 textarea 存在就采用其内容（允许用户清空）
            if (shell.querySelector('#jlc-wb-i-fav')) {
                config.fav_tags = favList;
            }
            // 打开方式：优先设置/显示页下拉，否则沿用 session / 已有 config
            const openModeEl = shell.querySelector('#jlc-wb-open-mode') || shell.querySelector('#jlc-wb-view-open-mode');
            const openMode = openModeEl
                ? (openModeEl.value === 'same' ? 'same' : 'tab')
                : ((getWorkbenchSession().openMode || config.open_mode || previous.open_mode || 'tab') === 'same' ? 'same' : 'tab');
            config.open_mode = openMode;
            ['resource_center', 'resource_trailer', 'resource_screenshot', 'resource_screenshot_auto', 'resource_magnet', 'resource_links'].forEach(k => {
                const input = shell.querySelector('[data-jlc-wb-resource="' + k + '"]');
                if (input) config[k] = !!input.checked;
            });
            config.webdav_url = (shell.querySelector('#jlc-wb-wd-url')?.value || '').trim();
            config.webdav_user = (shell.querySelector('#jlc-wb-wd-user')?.value || '').trim();
            config.webdav_path = (shell.querySelector('#jlc-wb-wd-path')?.value || '').trim() || '/Creamu';
            const wdPassTyped = shell.querySelector('#jlc-wb-wd-pass')?.value || '';
            if (wdPassTyped) config.webdav_password = wdPassTyped;
            config.webdav_enabled = !!shell.querySelector('#jlc-wb-wd-en')?.checked;
            config.webdav_auto = !!shell.querySelector('#jlc-wb-wd-auto')?.checked;
            config.webdav_conflict = shell.querySelector('#jlc-wb-wd-conflict')?.value || 'ask';
            GM_setValue('jlc_config_stable', config);
            if (previous.metatube_url !== config.metatube_url) clearMetaMissCache();
            persistWorkbenchSession({ openMode });
            try { ensureCreamuSync()?.markLocalDirty(); } catch (_) {}
            await loadRadarData();
            await refreshLibraryUI();
            refreshCommanderDecorations();
            renderDetailResourceCenter(true);
            syncWorkbenchSettingsForm();
            showAlert('设置已保存并应用！');
        });
        shell.querySelector('#jlc-wb-btn-sync')?.addEventListener('click', () => { void syncEmby(); });
        shell.querySelector('#jlc-wb-btn-rescan')?.addEventListener('click', () => {
            refreshCommanderDecorations(document, { clearMetaMisses: true });
            renderDetailResourceCenter(true);
            showAlert('已重新扫描当前页！');
        });
        shell.querySelector('#jlc-wb-btn-export')?.addEventListener('click', exportBackup);
        shell.querySelector('#jlc-wb-btn-export-config')?.addEventListener('click', () => { void exportConfigOnly(); });
        shell.querySelector('#jlc-wb-btn-import')?.addEventListener('click', () => { void importBackup({ mode: 'full' }); });
        shell.querySelector('#jlc-wb-btn-import-config')?.addEventListener('click', () => { void importBackup({ mode: 'config' }); });
        shell.querySelector('#jlc-wb-btn-integrity')?.addEventListener('click', () => {
            if (typeof showDataIntegrityReport === 'function') void showDataIntegrityReport();
            else showAlert('检查功能未就绪', true);
        });
        // 屏蔽词已内联在「过滤」主 Tab，不再跳转 TabPanel

        const applyWdFormToConfig = () => {
            config.webdav_url = (shell.querySelector('#jlc-wb-wd-url')?.value || '').trim();
            config.webdav_user = (shell.querySelector('#jlc-wb-wd-user')?.value || '').trim();
            config.webdav_path = (shell.querySelector('#jlc-wb-wd-path')?.value || '').trim() || '/Creamu';
            const typed = shell.querySelector('#jlc-wb-wd-pass')?.value || '';
            if (typed) config.webdav_password = typed;
            config.webdav_enabled = !!shell.querySelector('#jlc-wb-wd-en')?.checked;
            config.webdav_auto = !!shell.querySelector('#jlc-wb-wd-auto')?.checked;
            config.webdav_conflict = shell.querySelector('#jlc-wb-wd-conflict')?.value || 'ask';
            GM_setValue('jlc_config_stable', config);
        };
        const refreshWdStatus = () => {
            const el = shell.querySelector('#jlc-wb-wd-status');
            const sync = ensureCreamuSync();
            if (el) el.textContent = sync ? sync.statusText() : '同步模块未加载';
        };
        shell.querySelector('#jlc-wb-wd-test')?.addEventListener('click', async () => {
            applyWdFormToConfig();
            const sync = ensureCreamuSync();
            if (!sync) return showAlert('同步模块未加载', true);
            try {
                await sync.testConnection();
                refreshWdStatus();
            } catch (e) {
                showAlert('测试失败：' + (e?.message || e), true);
                refreshWdStatus();
            }
        });
        shell.querySelector('#jlc-wb-wd-sync')?.addEventListener('click', async () => {
            applyWdFormToConfig();
            try {
                await ensureCreamuSync().syncNow({});
                refreshWdStatus();
            } catch (e) {
                showAlert('同步失败：' + (e?.message || e), true);
                refreshWdStatus();
            }
        });
        shell.querySelector('#jlc-wb-wd-push')?.addEventListener('click', async () => {
            applyWdFormToConfig();
            try {
                await ensureCreamuSync().syncNow({ force: 'push' });
                refreshWdStatus();
            } catch (e) {
                showAlert('推送失败：' + (e?.message || e), true);
            }
        });
        shell.querySelector('#jlc-wb-wd-pull')?.addEventListener('click', async () => {
            applyWdFormToConfig();
            try {
                await ensureCreamuSync().syncNow({ force: 'pull' });
                refreshWdStatus();
            } catch (e) {
                showAlert('拉取失败：' + (e?.message || e), true);
            }
        });
        shell.querySelector('#jlc-wb-btn-diag')?.addEventListener('click', () => {
            config = loadConfig();
            syncWorkbenchSettingsForm();
            updateWorkbenchConfigDiag();
            const d = describeLiveConfig();
            showAlert(
                '配置回读：\nEmby ' + (d.emby_url || '空')
                + '\n密钥 ' + (d.emby_key_len ? (d.emby_key_len + ' 位 ' + d.emby_key_preview) : '空')
                + '\n心动 ' + (d.fav_tags.join(' / ') || '空'),
                true
            );
        });
        shell.querySelector('#jlc-wb-btn-add-p')?.addEventListener('click', async () => {
            const input = shell.querySelector('#jlc-wb-i-new-p');
            const name = compactText(input?.value || '');
            if (!name || config.custom_persons.includes(name)) return;
            config.custom_persons.push(name);
            GM_setValue('jlc_config_stable', config);
            if (input) input.value = '';
            await loadRadarData();
            await refreshLibraryUI();
            refreshCommanderDecorations();
        });
    }
