// @@creamu-part:14-data-portability
    function applyImportedConfig(rawConfig) {
        if (!rawConfig || typeof rawConfig !== 'object') {
            return { ok: false, summary: '备份里没有 config 字段' };
        }
        const next = Object.assign({}, DEFAULT_CONFIG, rawConfig);
        if (Array.isArray(rawConfig.fav_tags)) next.fav_tags = rawConfig.fav_tags.slice();
        if (Array.isArray(rawConfig.custom_persons)) next.custom_persons = rawConfig.custom_persons.slice();
        if (Array.isArray(rawConfig.hate_tags)) next.hate_tags = rawConfig.hate_tags.slice();
        // 原样保留其余未知字段，避免以后扩展丢失
        Object.keys(rawConfig).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(next, key)) next[key] = rawConfig[key];
        });
        config = next;
        GM_setValue('jlc_config_stable', config);
        // 立刻回读校验是否真的写入油猴存储
        const verify = GM_getValue('jlc_config_stable');
        const keyLen = String(verify?.emby_key || '').length;
        const tags = Array.isArray(verify?.fav_tags) ? verify.fav_tags : [];
        return {
            ok: true,
            summary: [
                'Emby: ' + (verify?.emby_url || '（空）'),
                '密钥: ' + (keyLen ? ('已写入 ' + keyLen + ' 位') : '（空）'),
                '心动标签: ' + (tags.length ? tags.join(' / ') : '（空）'),
                'MetaTube: ' + (verify?.metatube_url || '（空）')
            ].join('\n')
        };
    }

    function describeLiveConfig() {
        const live = loadConfig();
        const keyLen = String(live.emby_key || '').length;
        const tags = Array.isArray(live.fav_tags) ? live.fav_tags : [];
        return {
            emby_url: live.emby_url || '',
            emby_key_len: keyLen,
            emby_key_preview: keyLen ? (String(live.emby_key).slice(0, 4) + '…' + String(live.emby_key).slice(-4)) : '',
            fav_tags: tags,
            metatube_url: live.metatube_url || '',
            hate_tags: Array.isArray(live.hate_tags) ? live.hate_tags : []
        };
    }

    /** 本机断点 / 浏览 / 点击数量摘要 */
    async function collectDataIntegrityReport() {
        if (!db) {
            try { await initDB(); } catch (_) { /* ignore */ }
        }
        const tracking = await getAllFromStore(TRACKING_STORE);
        const videos = await getAllFromStore('videos');
        const emby = await getAllFromStore('emby_data');
        const hw = GM_getValue('hiddenWord', statusDefault.hiddenWord) || [];
        const ha = GM_getValue('hiddenAvid', statusDefault.hiddenAvid) || [];
        const compact = (v) => String(v == null ? '' : v).trim();

        const tr = {
            total: tracking.length,
            withTop: 0,
            withSeen: 0,
            withBrowsed: 0,
            withCheck: 0,
            updated: 0,
            latest: 0,
            archived: 0
        };
        let latestBrowsedAt = '';
        let latestBrowsedTitle = '';
        let sampleWithSeen = null;
        tracking.forEach((r) => {
            if (!r || typeof r !== 'object') return;
            if (r.archived) tr.archived += 1;
            const top = compact(r.top_avid);
            const seen = compact(r.last_seen_avid);
            const browsed = compact(r.last_browsed_at);
            if (top) tr.withTop += 1;
            if (seen) tr.withSeen += 1;
            if (browsed) {
                tr.withBrowsed += 1;
                if (!latestBrowsedAt || browsed > latestBrowsedAt) {
                    latestBrowsedAt = browsed;
                    latestBrowsedTitle = compact(r.custom_label || r.group_name || r.title || r.id);
                }
            }
            if (compact(r.check_status)) tr.withCheck += 1;
            if (r.check_status === 'updated') tr.updated += 1;
            if (r.check_status === 'latest') tr.latest += 1;
            if (!sampleWithSeen && seen) {
                sampleWithSeen = {
                    title: compact(r.custom_label || r.group_name || r.title || r.id).slice(0, 40),
                    top_avid: top,
                    last_seen_avid: seen,
                    check_status: compact(r.check_status)
                };
            }
        });

        const vid = {
            total: videos.length,
            clicked: videos.filter((v) => v && v.clicked).length,
            liked: videos.filter((v) => v && v.status === 'like').length,
            hated: videos.filter((v) => v && v.status === 'hate').length
        };
        const em = {
            total: emby.length,
            movies: emby.filter((x) => x && x.type === 'movie').length,
            persons: emby.filter((x) => x && x.type === 'person').length
        };

        const lines = [
            '【本机数据】' + new Date().toLocaleString(),
            '',
            '追更 ' + tr.total + ' · 断点 ' + tr.withSeen + ' · 浏览 ' + tr.withBrowsed
                + ' · updated ' + tr.updated + ' / latest ' + tr.latest,
            latestBrowsedAt ? ('最近浏览：' + latestBrowsedTitle + ' @ ' + latestBrowsedAt) : '最近浏览：（无）',
            sampleWithSeen
                ? ('样例：' + sampleWithSeen.title + ' | 最新 ' + (sampleWithSeen.top_avid || '—')
                    + ' | 断点 ' + (sampleWithSeen.last_seen_avid || '—'))
                : '',
            '',
            '点击 ' + vid.clicked + '/' + vid.total + ' · 心动 ' + vid.liked + ' · 屏蔽片 ' + vid.hated,
            'Emby ' + em.total + '（影片 ' + em.movies + ' / 熟人 ' + em.persons + '）',
            '屏蔽词 ' + (Array.isArray(hw) ? hw.length : 0) + ' · 屏蔽番号 ' + (Array.isArray(ha) ? ha.length : 0)
        ].filter(Boolean);

        return {
            ok: tr.withSeen > 0 && vid.clicked > 0,
            text: lines.join('\n'),
            tracking: tr,
            videos: vid,
            emby: em,
            hiddenWords: Array.isArray(hw) ? hw.length : 0,
            hiddenAvids: Array.isArray(ha) ? ha.length : 0
        };
    }

    async function showDataIntegrityReport() {
        try {
            const report = await collectDataIntegrityReport();
            if (typeof showAlert === 'function') showAlert(report.text, true);
            else alert(report.text);
            try {
                const box = document.getElementById('jlc-wb-data-integrity');
                if (box) {
                    box.hidden = false;
                    box.textContent = report.text;
                }
            } catch (_) { /* ignore */ }
            return report;
        } catch (e) {
            const msg = '检查失败：' + (e?.message || e);
            if (typeof showAlert === 'function') showAlert(msg, true);
            else alert(msg);
            return null;
        }
    }

    function updateWorkbenchConfigDiag() {
        const el = document.getElementById('jlc-wb-config-diag');
        if (!el) return;
        const d = describeLiveConfig();
        el.innerHTML = ''
            + '<div><b>当前脚本实际配置</b></div>'
            + '<div>Emby URL：' + escapeHtml(d.emby_url || '（空）') + '</div>'
            + '<div>Emby 密钥：' + (d.emby_key_len
                ? ('已保存 ' + d.emby_key_len + ' 位（' + escapeHtml(d.emby_key_preview) + '）')
                : '（空）') + '</div>'
            + '<div>心动标签：' + (d.fav_tags.length ? escapeHtml(d.fav_tags.join(' / ')) : '（空）') + '</div>'
            + '<div>MetaTube：' + escapeHtml(d.metatube_url || '（空）') + '</div>'
            + (d.hate_tags.length ? ('<div>屏蔽标签：' + escapeHtml(d.hate_tags.join(' / ')) + '</div>') : '');
    }

    async function putAllInStore(storeName, rows) {
        if (!db) throw new Error('数据库未就绪');
        if (!Array.isArray(rows) || !rows.length) return 0;
        if (!db.objectStoreNames.contains(storeName)) {
            throw new Error('缺少对象仓库 ' + storeName);
        }
        const chunkSize = 150;
        let written = 0;
        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            await new Promise((resolve, reject) => {
                let settled = false;
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                chunk.forEach(row => {
                    try { store.put(row); } catch (e) { /* skip bad row */ }
                });
                tx.oncomplete = () => { if (!settled) { settled = true; resolve(); } };
                tx.onerror = () => { if (!settled) { settled = true; reject(tx.error || new Error(storeName + ' 写入失败')); } };
                tx.onabort = () => { if (!settled) { settled = true; reject(tx.error || new Error(storeName + ' 写入中止')); } };
            });
            written += chunk.length;
            // 让出主线程，避免 50MB 备份卡死页面
            await new Promise(r => setTimeout(r, 0));
        }
        return written;
    }

    /** 列表/界面偏好（含屏蔽词），与 jlc_config_stable 分存，需单独进备份与 WebDAV */
    const STATUS_PREF_SIMPLE_KEYS = [
        'autoPage', 'copyBtn', 'toolBar', 'avInfo', 'halfImg', 'fullTitle',
        'menutoTop', 'hiddenWord', 'hiddenAvid',
        'columnNumFull', 'columnNumHalf'
    ];
    /** 本机专用，不进备份 / WebDAV（按显示器/DPI 各自调） */
    const STATUS_PREF_LOCAL_ONLY_KEYS = ['uiBtnScale'];
    const WATERFALL_SITE_KEYS = ['javlibrary', 'javbus', 'javdb', 'avmoo'];

    function isStatusPrefLocalOnly(key) {
        return STATUS_PREF_LOCAL_ONLY_KEYS.includes(String(key || ''));
    }

    function collectStatusPrefs() {
        const prefs = {};
        STATUS_PREF_SIMPLE_KEYS.forEach((key) => {
            prefs[key] = GM_getValue(key, statusDefault[key]);
        });
        prefs.waterfallWidth_by_site = {};
        const sites = WATERFALL_SITE_KEYS.slice();
        if (typeof currentWeb === 'string' && currentWeb && !sites.includes(currentWeb)) {
            sites.push(currentWeb);
        }
        sites.forEach((site) => {
            const raw = GM_getValue('waterfallWidth_' + site, null);
            if (raw !== null && raw !== undefined) prefs.waterfallWidth_by_site[site] = raw;
        });
        return prefs;
    }

    function applyStatusPrefs(prefs) {
        if (!prefs || typeof prefs !== 'object') {
            return { ok: false, summary: '未包含 status 偏好' };
        }
        STATUS_PREF_SIMPLE_KEYS.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(prefs, key)) {
                GM_setValue(key, prefs[key]);
            }
        });
        // 显式忽略旧 vault 里可能带的本机字段（如 uiBtnScale）
        STATUS_PREF_LOCAL_ONLY_KEYS.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(prefs, key)) {
                /* skip */
            }
        });
        if (prefs.waterfallWidth_by_site && typeof prefs.waterfallWidth_by_site === 'object') {
            Object.keys(prefs.waterfallWidth_by_site).forEach((site) => {
                GM_setValue('waterfallWidth_' + site, prefs.waterfallWidth_by_site[site]);
            });
        }
        // 兼容旧字段：仅当前站 waterfallWidth
        if (prefs.waterfallWidth !== undefined && typeof currentWeb === 'string' && currentWeb) {
            GM_setValue('waterfallWidth_' + currentWeb, prefs.waterfallWidth);
        }
        // 应用列表相关开关（若页面已初始化）；不含 uiBtnScale
        try {
            if (typeof legacySettingHandlers !== 'undefined' && legacySettingHandlers) {
                ['autoPage', 'copyBtn', 'toolBar', 'halfImg', 'fullTitle', 'columnNum', 'waterfallWidth'].forEach((k) => {
                    if (k === 'columnNum') legacySettingHandlers.columnNum?.(Status?.getColumnNum?.() ?? prefs.columnNumFull);
                    else if (k === 'waterfallWidth') {
                        const w = Status?.get?.('waterfallWidth');
                        if (w != null) legacySettingHandlers.waterfallWidth?.(w);
                    } else if (prefs[k] !== undefined) legacySettingHandlers[k]?.(prefs[k]);
                });
            }
        } catch (_) { /* ignore */ }
        try {
            if (typeof refreshCommanderDecorations === 'function') refreshCommanderDecorations();
        } catch (_) { /* ignore */ }
        try {
            if (typeof syncWorkbenchSettingsForm === 'function') syncWorkbenchSettingsForm();
        } catch (_) { /* ignore */ }
        const hw = GM_getValue('hiddenWord', []);
        const ha = GM_getValue('hiddenAvid', []);
        return {
            ok: true,
            summary: '屏蔽词 ' + (Array.isArray(hw) ? hw.length : 0)
                + ' · 屏蔽番号 ' + (Array.isArray(ha) ? ha.length : 0)
                + ' · 列表偏好已恢复（不含本机 UI 缩放）'
        };
    }

    function markStatusPrefsDirty() {
        try {
            if (typeof ensureCreamuSync === 'function') ensureCreamuSync()?.markLocalDirty();
        } catch (_) { /* ignore */ }
    }

    async function buildBackupPayload() {
        return {
            config: loadConfig(),
            status: collectStatusPrefs(),
            videos: await getAllFromStore('videos'),
            emby_data: await getAllFromStore('emby_data'),
            tracking_searches: await getAllFromStore(TRACKING_STORE),
            exported_at: new Date().toISOString(),
            kind: 'full_without_meta_cache'
        };
    }

    async function applyBackupPayload(data, mode) {
        mode = mode === 'config' ? 'config' : 'full';
        if (!data || typeof data !== 'object') throw new Error('invalid backup');
        const rawConfig = data.config && typeof data.config === 'object'
            ? data.config
            : (data.emby_url !== undefined || data.fav_tags !== undefined ? data : null);
        let configResult = { ok: false, summary: '未包含 config' };
        if (rawConfig) configResult = applyImportedConfig(rawConfig);
        else if (mode === 'config' && !(data.status && typeof data.status === 'object')) {
            throw new Error('备份无 config / status');
        }
        // 屏蔽词与列表偏好：config 与 full 都恢复（体积小，且本就应跨机一致）
        let statusResult = { ok: false, summary: '未包含 status' };
        if (data.status && typeof data.status === 'object') {
            statusResult = applyStatusPrefs(data.status);
        }
        syncCommanderConfigInputs();
        if (mode === 'full') {
            if (!db) await initDB();
            if (Array.isArray(data.videos) && data.videos.length) await putAllInStore('videos', data.videos);
            if (Array.isArray(data.emby_data) && data.emby_data.length) await putAllInStore('emby_data', data.emby_data);
            if (Array.isArray(data.tracking_searches) && data.tracking_searches.length) {
                await putAllInStore(TRACKING_STORE, data.tracking_searches);
            }
            await loadRadarData();
            await refreshLibraryUI();
            refreshCommanderDecorations();
            await renderTrackingUI();
            void refreshWorkbenchFabBadge();
        }
        if (statusResult.ok) {
            configResult = {
                ok: configResult.ok || statusResult.ok,
                summary: [configResult.summary, statusResult.summary].filter(Boolean).join('\n')
            };
        }
        return configResult;
    }

    async function exportBackup() {
        const data = await buildBackupPayload();
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `jlc_commander_backup_${new Date().toLocaleDateString()}.json`;
        a.click();
        showAlert('完整备份已导出（含屏蔽词/显示偏好，不含 meta_cache）。');
    }

    async function exportConfigOnly() {
        const data = {
            config: loadConfig(),
            status: collectStatusPrefs(),
            exported_at: new Date().toISOString(),
            kind: 'config_only'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `jlc_config_only_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        showAlert('已导出「仅配置」小文件（含 Emby/心动标签/屏蔽词/显示偏好）。');
    }

    function revealImportedConfigInUi() {
        openCommanderPanel('filter');
        try { setWorkbenchSettingsOpen(false); } catch (_) { /* ignore */ }
        try { syncWorkbenchSettingsForm(); } catch (_) { /* ignore */ }
        try { updateWorkbenchConfigDiag(); } catch (_) { /* ignore */ }
    }

    async function importBackup(options = {}) {
        const mode = options.mode === 'full' ? 'full' : 'config'; // 默认只导配置，最稳
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.json,application/json';
        inp.onchange = (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const mb = Math.round(file.size / 1024 / 1024 * 10) / 10;
            showAlert('正在读取备份（' + mb + ' MB，模式：' + (mode === 'full' ? '完整' : '仅配置') + '）…');
            const reader = new FileReader();
            reader.onerror = () => showAlert('读取备份文件失败。', true);
            reader.onload = async (re) => {
                let data;
                try {
                    data = JSON.parse(re.target.result);
                } catch (err) {
                    showAlert('JSON 解析失败：' + (err?.message || err) + '\n若文件约 50MB，请改用「仅导入配置」或先用旧脚本导出一份 config。', true);
                    return;
                }
                if (!data || typeof data !== 'object') {
                    showAlert('备份格式不对：根节点不是对象。', true);
                    return;
                }

                // 兼容：有人只保存了扁平 config 对象
                const rawConfig = data.config && typeof data.config === 'object'
                    ? data.config
                    : (data.emby_url !== undefined || data.fav_tags !== undefined ? data : null);

                let configResult = { ok: false, summary: '未包含 config' };
                if (rawConfig) {
                    configResult = applyImportedConfig(rawConfig);
                } else if (mode === 'config' && !(data.status && typeof data.status === 'object')) {
                    showAlert('这个文件里没有 config（也没有 emby_url/fav_tags 字段），也无法恢复 status 偏好。', true);
                    return;
                }

                let statusResult = { ok: false, summary: '未包含 status' };
                if (data.status && typeof data.status === 'object') {
                    statusResult = applyStatusPrefs(data.status);
                    if (statusResult.ok) {
                        configResult = {
                            ok: configResult.ok || true,
                            summary: [configResult.summary, statusResult.summary].filter(Boolean).join('\n')
                        };
                    }
                }

                // 配置成功后立刻展示诊断；有屏蔽词时优先打开「过滤」
                syncCommanderConfigInputs();
                revealImportedConfigInUi();

                const storeStats = [];
                if (mode === 'full') {
                    try {
                        if (!db) await initDB();
                        if (!db) throw new Error('IndexedDB 不可用');
                        if (Array.isArray(data.videos) && data.videos.length) {
                            storeStats.push('videos ' + (await putAllInStore('videos', data.videos)));
                        }
                        if (Array.isArray(data.emby_data) && data.emby_data.length) {
                            storeStats.push('emby ' + (await putAllInStore('emby_data', data.emby_data)));
                        }
                        if (Array.isArray(data.tracking_searches) && data.tracking_searches.length) {
                            storeStats.push('tracking ' + (await putAllInStore(TRACKING_STORE, data.tracking_searches)));
                        }
                        // meta_cache：可再生缓存，导出已不再包含；旧备份里若仍有则一律忽略
                        if (Array.isArray(data.meta_cache) && data.meta_cache.length) {
                            storeStats.push('meta 已忽略(' + data.meta_cache.length + '，缓存可运行时重建)');
                        }
                    } catch (err) {
                        const live = describeLiveConfig();
                        showAlert(
                            '配置已尝试写入：\n' + (configResult.summary || '')
                            + '\n\n回读心动：' + (live.fav_tags.join(' / ') || '空')
                            + '\n回读密钥：' + (live.emby_key_len ? (live.emby_key_len + ' 位') : '空')
                            + '\n\n数据库导入中断：' + (err?.message || err),
                            true
                        );
                        return;
                    }
                    await loadRadarData();
                    await refreshLibraryUI();
                    refreshCommanderDecorations();
                    await renderTrackingUI();
                    void refreshWorkbenchFabBadge();
                }

                revealImportedConfigInUi();
                const live = describeLiveConfig();
                const looksDefault = isLikelyFreshDefaultConfig(loadConfig());
                showAlert(
                    (mode === 'config' ? '【仅配置】导入完成\n\n' : '【完整】导入完成\n\n')
                    + configResult.summary + '\n\n'
                    + (storeStats.length ? ('库写入：' + storeStats.join('，') + '\n\n') : '')
                    + '—— 回读校验（以这里为准）——\n'
                    + '心动标签：' + (live.fav_tags.join(' / ') || '（空）') + '\n'
                    + '密钥：' + (live.emby_key_len ? (live.emby_key_len + ' 位 ' + live.emby_key_preview) : '（空）') + '\n'
                    + 'Emby：' + (live.emby_url || '（空）') + '\n\n'
                    + (looksDefault
                        ? '⚠ 回读仍像默认空配置：请确认导入的是旧脚本导出的备份，且文件里 config.fav_tags 不是默认那串。'
                        : '✓ 回读已不是默认空配置。密钥框为空是正常的（已保存则占位提示），请看上方诊断区。'),
                    true
                );
            };
            reader.readAsText(file, 'utf-8');
        };
        inp.click();
    }
