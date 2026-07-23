// @@creamu-part:24-app-runtime
    function collectCommanderMutationItems(mutations) {
        const items = new Set();
        const isPendingItem = (item) => item
            && item.dataset?.jlcBaseDone !== '1'
            && !item.classList?.contains?.('jlc-final-done');
        Array.from(mutations || []).forEach(mutation => {
            Array.from(mutation?.addedNodes || []).forEach(node => {
                if (!node || node.nodeType !== 1) return;
                if (node.matches?.('.item-b')) {
                    items.add(node);
                    return;
                }
                const owner = node.closest?.('.item-b');
                if (owner) {
                    if (isPendingItem(owner)) items.add(owner);
                    return;
                }
                node.querySelectorAll?.('.item-b').forEach(item => items.add(item));
            });
        });
        return items;
    }

    function ensureCommanderObserver() {
        if (commanderObserver) return;
        commanderObserver = new MutationObserver((mutations) => {
            const items = collectCommanderMutationItems(mutations);
            const queuedCount = queueCommanderItems(items);
            if (queuedCount) {
                const hasIncompleteItem = Array.from(items).some(item => (
                    typeof getCommanderItemAvid !== 'function' || !getCommanderItemAvid(item)
                ));
                if (hasIncompleteItem) scheduleCommanderRescan(2);
                scheduleTrackingPageRefresh(false);
            }
        });
        if (document.body) {
            commanderObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    /** 启动：先可点 UI，再异步拉 DB / 追更 / WebDAV */
    async function startIntegratedApp() {
        try {
            initCommanderStyles();
            initWorkbenchV3Styles();
        } catch (e) {
            console.warn('[Creamu] styles', e);
        }

        let dbReady;
        try {
            dbReady = initDB();
        } catch (e) {
            console.warn('[Creamu] initDB', e);
        }

        try {
            createWorkbenchV3();
        } catch (e) {
            console.warn('[Creamu] workbench', e);
        }

        try {
            bindMetaSweepEvents();
            new Page();
        } catch (e) {
            console.error('[Creamu] Page', e);
        }

        ensureCommanderObserver();
        try {
            await dbReady;
        } catch (e) {
            console.warn('[Creamu] initDB', e);
        }

        try {
            await loadRadarData();
        } catch (e) {
            console.warn('[Creamu] radar', e);
        }

        try {
            await restoreWorkbenchSession();
            await refreshLibraryUI();
            ensureStandaloneCommanderEntry();
            renderDetailResourceCenter();
            refreshCommanderDecorations?.(document, {
                scheduleRescan: false,
                syncTracking: false
            });
        } catch (e) {
            console.warn('[Creamu] library', e);
        }

        try {
            const queuedCount = runCommanderScanner(document.getElementById('grid-b') || document, true);
            if (queuedCount) scheduleCommanderRescan(10);
        } catch (_) { /* ignore */ }

        void Promise.resolve()
            .then(() => syncTrackingPageState(true))
            .catch((e) => console.warn('[Creamu] tracking', e));

        primeJavLibraryComboOptionSnapshotFromCurrentPage();

        void Promise.resolve()
            .then(async () => {
                const sync = ensureCreamuSync();
                if (sync) await sync.bootSync();
            })
            .catch((e) => console.warn('[Creamu] WebDAV', e));

        if (!configMigrationHintShown && isLikelyFreshDefaultConfig()) {
            configMigrationHintShown = true;
            window.setTimeout(() => {
                showAlert('未读到 Emby/自定义心动标签。若以前用过旧版：请用旧脚本导出备份，再在设置 → 备份 → 导入。', true);
            }, 1200);
        }

        window.setTimeout(() => {
            const queuedCount = runCommanderScanner(document.getElementById('grid-b') || document, true);
            if (queuedCount) scheduleCommanderRescan(8);
            renderDetailResourceCenter();
        }, 900);
        window.setTimeout(() => {
            const queuedCount = runCommanderScanner(document.getElementById('grid-b') || document, true);
            if (queuedCount) scheduleCommanderRescan(10);
            renderDetailResourceCenter();
        }, 2200);

        const detailContext = getCurrentDetailContext();
        if (detailContext?.avid) {
            getVal('videos', detailContext.avid).then(data => {
                const current = data || { avid: detailContext.avid, clicked: true, status: 'none' };
                current.clicked = true;
                setVal('videos', current);
            }).catch(() => {});
        }
    }
