// @@creamu-part:17-library-sync
    function getEmbyDataSnapshot() {
        return embyDataSnapshot;
    }

    function refreshKnownPersonsFromSnapshot() {
        const embyPersons = Array.from(embyDataSnapshot?.personNames || []);
        knownPersons = new Set([...(config.custom_persons || []), ...embyPersons]);
        return knownPersons;
    }

    function getEmbyMovieRecordsFromSnapshot(avids) {
        if (!embyDataSnapshot) return null;
        const records = new Map();
        Array.from(avids || []).forEach(avid => {
            const normalized = String(avid || '').trim().toUpperCase();
            if (!normalized) return;
            const id = `vid_${normalized}`;
            if (embyDataSnapshot.movieIds.has(id)) records.set(id, { id, type: 'movie' });
        });
        return records;
    }

    async function loadRadarData(preloadedItems) {
        const items = Array.isArray(preloadedItems)
            ? preloadedItems
            : await getAllFromStore('emby_data');
        const movieIds = new Set();
        const personNames = [];
        items.forEach(item => {
            if (item?.type === 'movie' && item.id) movieIds.add(String(item.id));
            if (item?.type === 'person') {
                const name = String(item.name || '').trim();
                if (name) personNames.push(name);
            }
        });
        embyDataSnapshot = { movieIds, movieCount: movieIds.size, personNames };
        refreshKnownPersonsFromSnapshot();
        libraryDataRevision += 1;
        return embyDataSnapshot;
    }

    function requestEmbyJson(pathname, label) {
        const baseUrl = String(config.emby_url || '').replace(/\/+$/, '');
        const separator = pathname.includes('?') ? '&' : '?';
        const url = `${baseUrl}${pathname}${separator}api_key=${encodeURIComponent(config.emby_key || '')}`;
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                timeout: 20000,
                onload: (response) => {
                    const status = Number(response?.status || 0);
                    if (status < 200 || status >= 300) {
                        reject(new Error(`${label}请求失败（HTTP ${status || 'unknown'}）`));
                        return;
                    }
                    try {
                        resolve(JSON.parse(response.responseText));
                    } catch (_) {
                        reject(new Error(`${label}返回了无效 JSON`));
                    }
                },
                onerror: () => reject(new Error(`${label}网络错误`)),
                ontimeout: () => reject(new Error(`${label}请求超时`)),
                onabort: () => reject(new Error(`${label}请求已取消`))
            });
        });
    }

    function parseEmbyMovieRecords(payload) {
        const records = new Map();
        const items = Array.isArray(payload?.Items) ? payload.Items : [];
        items.forEach(item => {
            const match = `${String(item?.Name || '')} ${String(item?.Path || '')}`
                .match(/[a-zA-Z0-9]{2,}-[0-9]{2,}/);
            if (!match) return;
            const id = `vid_${match[0].toUpperCase()}`;
            records.set(id, { id, type: 'movie' });
        });
        return Array.from(records.values());
    }

    function parseEmbyPersonRecords(payload) {
        const records = new Map();
        const items = Array.isArray(payload?.Items) ? payload.Items : [];
        items.forEach(item => {
            const name = String(item?.Name || '').trim();
            if (!name) return;
            const id = `p_${name}`;
            records.set(id, { id, name, type: 'person' });
        });
        return Array.from(records.values());
    }

    function replaceEmbyData(records) {
        if (!db) return Promise.reject(new Error('数据库未就绪'));
        return new Promise((resolve, reject) => {
            let settled = false;
            let tx = null;
            const finish = (error = null) => {
                if (settled) return;
                settled = true;
                if (error) reject(error);
                else resolve(true);
            };
            try {
                tx = db.transaction('emby_data', 'readwrite');
                const store = tx.objectStore('emby_data');
                tx.oncomplete = () => {
                    markIdbStoreDirty('emby_data');
                    finish();
                };
                tx.onerror = () => finish(tx.error || new Error('Emby 数据写入失败'));
                tx.onabort = () => finish(tx.error || new Error('Emby 数据写入已中止'));
                store.clear();
                Array.from(records || []).forEach(record => store.put(record));
            } catch (error) {
                try { tx?.abort(); } catch (_) { /* ignore */ }
                finish(error);
            }
        });
    }

    async function syncEmby(options = {}) {
        const silent = !!options.silent;
        const extraButtons = Array.isArray(options.buttons) ? options.buttons.filter(Boolean) : [];
        const btns = Array.from(new Set([
            document.getElementById('jlc-btn-sync'),
            document.getElementById('jlc-wb-btn-sync'),
            ...extraButtons
        ].filter(Boolean)));
        const originalLabels = new Map(btns.map(btn => [btn, btn.textContent]));
        const setSyncButtons = (text, disabled) => {
            btns.forEach(btn => {
                if (text != null) btn.textContent = text;
                btn.disabled = !!disabled;
            });
        };
        const resetSyncButtons = () => {
            btns.forEach(btn => {
                btn.textContent = originalLabels.get(btn) || '立即同步 Emby';
                btn.disabled = false;
            });
        };
        const notify = (msg, force) => {
            if (silent && !force) return;
            if (typeof showAlert === 'function') showAlert(msg, !!force);
            else alert(msg);
        };

        if (!config.emby_url || !config.emby_key) {
            notify('请先配置 Emby 信息！', true);
            return { ok: false, skipped: true, message: '未配置 Emby' };
        }
        if (!db) {
            notify('数据库未就绪，请稍后重试。', true);
            return { ok: false, message: '数据库未就绪' };
        }

        setSyncButtons('正在同步 Emby...', true);
        try {
            const [moviePayload, personPayload] = await Promise.all([
                requestEmbyJson('/Items?IncludeItemTypes=Movie&Recursive=true&Fields=Path', '影片列表'),
                requestEmbyJson('/Persons?Recursive=true', '人员列表')
            ]);
            const movies = parseEmbyMovieRecords(moviePayload);
            const persons = parseEmbyPersonRecords(personPayload);
            const records = [...movies, ...persons];
            await replaceEmbyData(records);
            await loadRadarData(records);
            try { await refreshLibraryUI(); } catch (_) { /* ignore */ }
            try { await refreshCommanderDecorations(); } catch (_) { /* ignore */ }
            if (!silent) notify('Emby 同步完成！');
            return { ok: true, movieCount: movies.length, personCount: persons.length };
        } catch (error) {
            const message = String(error?.message || error);
            notify('Emby 同步失败：' + message, true);
            return { ok: false, message };
        } finally {
            resetSyncButtons();
        }
    }

    /**
     * 页脚「立即同步」：先 Emby 拉库，再 WebDAV 推送 vault（含点击过的 videos）。
     * @param {{ button?: HTMLElement }} [options]
     */
    async function syncEmbyAndWebDav(options = {}) {
        const btn = options.button || null;
        const original = btn ? btn.textContent : '';
        const setBtn = (text, disabled) => {
            if (!btn) return;
            if (text != null) btn.textContent = text;
            btn.disabled = !!disabled;
        };
        const parts = [];
        let embyOk = true;
        let wdOk = true;
        try {
            setBtn('⏳ Emby…', true);
            const embyConfigured = !!(config.emby_url && config.emby_key);
            if (embyConfigured) {
                const er = await syncEmby({ silent: true, buttons: btn ? [btn] : [] });
                if (er.ok) {
                    parts.push('Emby 影片 ' + (er.movieCount || 0) + ' · 熟人 ' + (er.personCount || 0));
                } else {
                    embyOk = false;
                    parts.push('Emby 失败：' + (er.message || '未知'));
                }
            } else {
                parts.push('Emby 未配置（跳过）');
            }

            setBtn('⏳ WebDAV…', true);
            const sync = typeof ensureCreamuSync === 'function' ? ensureCreamuSync() : null;
            if (!sync) {
                wdOk = false;
                parts.push('WebDAV 模块未加载');
            } else if (typeof sync.isConfigured === 'function' && !sync.isConfigured()) {
                wdOk = false;
                parts.push('WebDAV 未配置（请到 设置 → 服务 填写）');
            } else {
                // 确保最新本地数据进 vault（含刚拉的 emby_data / 点击/心动）
                try { sync.markLocalDirty(); } catch (_) { /* ignore */ }
                try {
                    await sync.syncNow({ force: 'push' });
                    parts.push('WebDAV 已推送（含点击/心动/追更/屏蔽词）');
                } catch (e) {
                    wdOk = false;
                    parts.push('WebDAV 失败：' + (e?.message || e));
                }
            }

            const msg = parts.join('\n');
            if (typeof showAlert === 'function') showAlert(msg, !(embyOk && wdOk));
            else alert(msg);
            return { ok: embyOk && wdOk, parts };
        } finally {
            setBtn(original || '☁ 立即同步', false);
        }
    }
