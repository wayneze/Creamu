// @@creamu-part:16-indexeddb
    async function initDB() {
        return new Promise((resolve) => {
            if (!window.indexedDB) {
                console.warn('[Commander] 当前环境不支持 IndexedDB');
                resolve();
                return;
            }

            let settled = false;
            let upgradeBlocked = false;
            let fallbackStarted = false;
            let timer = null;

            const attachDb = (nextDb = null) => {
                db = nextDb || null;
                if (db) {
                    db.onversionchange = () => {
                        try { db.close(); } catch (e) {}
                    };
                    invalidateIdbStoreSnapshot('emby_data');
                    invalidateIdbStoreSnapshot(TRACKING_STORE);
                    try {
                        if (typeof flushMetaCacheWrites === 'function') void flushMetaCacheWrites();
                    } catch (_) { /* ignore */ }
                }
            };

            const refreshAfterLateDb = () => {
                window.setTimeout(() => {
                    if (!db) return;
                    Promise.resolve()
                        .then(() => loadRadarData?.())
                        .then(() => refreshLibraryUI?.())
                        .then(() => refreshCommanderDecorations?.())
                        .then(() => {
                            renderTrackingUI?.();
                            scheduleTrackingPageRefresh?.(true);
                        })
                        .catch(() => {});
                }, 50);
            };

            const finish = (nextDb = null) => {
                if (settled) return;
                settled = true;
                if (timer) clearTimeout(timer);
                attachDb(nextDb);
                resolve();
            };

            const adoptLateDb = (nextDb, reason) => {
                if (!nextDb || db === nextDb) return;
                attachDb(nextDb);
                console.info('[Commander] ' + reason + '已在后台就绪');
                refreshAfterLateDb();
            };

            const openFallback = () => {
                if (fallbackStarted) return;
                fallbackStarted = true;
                try {
                    const fallbackReq = indexedDB.open(DB_NAME);
                    fallbackReq.onsuccess = (e) => {
                        const fallbackDb = e.target.result;
                        if (upgradeBlocked && !fallbackDb.objectStoreNames.contains(TRACKING_STORE)) {
                            console.warn('[Commander] Tracking 存储升级被阻塞，本次先以兼容模式启动');
                        }
                        if (settled) {
                            adoptLateDb(fallbackDb, '兼容数据库连接');
                            return;
                        }
                        finish(fallbackDb);
                    };
                    fallbackReq.onerror = () => {
                        console.error('[Commander] 数据库回退打开失败');
                        if (!settled) finish(null);
                    };
                    fallbackReq.onblocked = () => {
                        console.error('[Commander] 数据库回退打开仍被阻塞');
                        if (!settled) finish(null);
                    };
                } catch (e) {
                    console.error('[Commander] 数据库回退异常', e);
                    if (!settled) finish(null);
                }
            };

            try {
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                const unblockStartup = (message) => {
                    if (settled) return;
                    upgradeBlocked = true;
                    console.warn(message);
                    finish(null);
                    window.setTimeout(openFallback, 60);
                };

                timer = window.setTimeout(() => {
                    unblockStartup('[Commander] 数据库升级等待超时，先跳过数据库启动');
                }, 2500);

                req.onupgradeneeded = (e) => {
                    const d = e.target.result;
                    if (!d.objectStoreNames.contains('videos')) d.createObjectStore('videos', { keyPath: 'avid' });
                    if (!d.objectStoreNames.contains('emby_data')) d.createObjectStore('emby_data', { keyPath: 'id' });
                    if (!d.objectStoreNames.contains('meta_cache')) d.createObjectStore('meta_cache', { keyPath: 'avid' });
                    if (!d.objectStoreNames.contains(TRACKING_STORE)) d.createObjectStore(TRACKING_STORE, { keyPath: 'id' });
                };
                req.onsuccess = (e) => {
                    const openedDb = e.target.result;
                    if (settled) {
                        adoptLateDb(openedDb, '数据库升级连接');
                        return;
                    }
                    finish(openedDb);
                };
                req.onblocked = () => {
                    unblockStartup('[Commander] 数据库升级被旧连接阻塞，先跳过数据库启动');
                };
                req.onerror = () => {
                    console.error('[Commander] 数据库连接失败');
                    if (!settled) {
                        finish(null);
                        window.setTimeout(openFallback, 60);
                    }
                };
            } catch (e) {
                console.error('[Commander] 数据库初始化异常', e);
                finish(null);
            }
        });
    }

    async function getVal(store, key) {
        if (!db) return null;
        return new Promise(resolve => {
            let settled = false;
            const finish = (value = null) => {
                if (settled) return;
                settled = true;
                resolve(value);
            };
            try {
                const tx = db.transaction(store, 'readonly');
                const req = tx.objectStore(store).get(key);
                req.onsuccess = () => finish(req.result);
                req.onerror = () => finish(null);
                tx.onabort = () => finish(null);
            } catch (e) { finish(null); }
        });
    }

    async function getManyFromStore(store, keys) {
        const uniqueKeys = Array.from(new Set(Array.from(keys || []).filter(key => key != null)));
        if (!db || !uniqueKeys.length) return new Map();
        return new Promise(resolve => {
            const values = new Map();
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                resolve(values);
            };
            try {
                const tx = db.transaction(store, 'readonly');
                const objectStore = tx.objectStore(store);
                uniqueKeys.forEach(key => {
                    const request = objectStore.get(key);
                    request.onsuccess = () => {
                        if (request.result !== undefined) values.set(key, request.result);
                    };
                });
                tx.oncomplete = finish;
                tx.onerror = finish;
                tx.onabort = finish;
            } catch (_) {
                finish();
            }
        });
    }

    /** 会进 WebDAV vault 的 IDB 仓库（meta_cache 可再生，不同步） */
    const SYNCABLE_IDB_STORES = new Set(['videos', 'emby_data', 'tracking_searches']);

    function invalidateIdbStoreSnapshot(store) {
        if (store === 'emby_data') embyDataSnapshot = null;
        if (store === 'emby_data' || store === 'videos') libraryDataRevision += 1;
        if (store === TRACKING_STORE) trackingDataRevision += 1;
    }

    function markIdbStoreDirty(store) {
        invalidateIdbStoreSnapshot(store);
        if (!SYNCABLE_IDB_STORES.has(store)) return;
        try {
            if (typeof markStatusPrefsDirty === 'function') markStatusPrefsDirty();
            else if (typeof ensureCreamuSync === 'function') ensureCreamuSync()?.markLocalDirty();
        } catch (_) { /* ignore */ }
    }

    async function setManyVals(store, values) {
        const rows = Array.from(values || []).filter(value => value != null);
        if (!rows.length) return true;
        if (!db) return false;
        return new Promise(resolve => {
            let settled = false;
            let tx = null;
            const finish = (written) => {
                if (settled) return;
                settled = true;
                resolve(written);
            };
            try {
                tx = db.transaction(store, 'readwrite');
                const objectStore = tx.objectStore(store);
                tx.oncomplete = () => {
                    markIdbStoreDirty(store);
                    finish(true);
                };
                tx.onerror = () => finish(false);
                tx.onabort = () => finish(false);
                rows.forEach(value => objectStore.put(value));
            } catch (e) {
                try { tx?.abort(); } catch (_) { /* ignore */ }
                finish(false);
            }
        });
    }

    async function setVal(store, val) {
        return setManyVals(store, [val]);
    }

    async function deleteVal(store, key) {
        if (!db) return false;
        return new Promise(resolve => {
            let settled = false;
            const finish = (deleted) => {
                if (settled) return;
                settled = true;
                resolve(deleted);
            };
            try {
                const tx = db.transaction(store, 'readwrite');
                tx.objectStore(store).delete(key);
                tx.oncomplete = () => {
                    markIdbStoreDirty(store);
                    finish(true);
                };
                tx.onerror = () => finish(false);
                tx.onabort = () => finish(false);
            } catch (e) { finish(false); }
        });
    }

    async function getAllFromStores(stores) {
        const names = Array.from(new Set(Array.from(stores || []).filter(Boolean)));
        const rowsByStore = new Map(names.map(name => [name, []]));
        if (!db || !names.length) return rowsByStore;
        const available = names.filter(name => db.objectStoreNames.contains(name));
        if (!available.length) return rowsByStore;
        return new Promise(resolve => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                resolve(rowsByStore);
            };
            try {
                const tx = db.transaction(available, 'readonly');
                available.forEach(name => {
                    const request = tx.objectStore(name).getAll();
                    request.onsuccess = () => rowsByStore.set(name, request.result || []);
                });
                tx.oncomplete = finish;
                tx.onerror = finish;
                tx.onabort = finish;
            } catch (e) { finish(); }
        });
    }

    async function getAllFromStore(store) {
        const rowsByStore = await getAllFromStores([store]);
        return rowsByStore.get(store) || [];
    }
