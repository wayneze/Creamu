// @@creamu-part:59-cover-download
    const COVER_DOWNLOAD_LIBRARY_URLS = [
        'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
        'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
    ];
    let coverDownloadLibraryPromise = null;
    let coverDownloadDialogInstance = null;
    let coverDownloadStylesReady = false;

    function hasCoverDownloadLibrary() {
        return typeof globalThis.JSZip === 'function';
    }

    async function ensureCoverDownloadLibrary() {
        if (hasCoverDownloadLibrary()) return true;
        if (coverDownloadLibraryPromise) return coverDownloadLibraryPromise;

        coverDownloadLibraryPromise = (async () => {
            const savedIndex = Math.max(0, Number(GM_getValue('downloadPanel_url', 0)) || 0)
                % COVER_DOWNLOAD_LIBRARY_URLS.length;
            let lastError = null;
            for (let offset = 0; offset < COVER_DOWNLOAD_LIBRARY_URLS.length; offset += 1) {
                const index = (savedIndex + offset) % COVER_DOWNLOAD_LIBRARY_URLS.length;
                const url = COVER_DOWNLOAD_LIBRARY_URLS[index];
                try {
                    const response = await getRequest(url, { timeout: 10000, responseType: 'text' });
                    const status = Number(response?.status || 0);
                    if (status < 200 || status >= 300 || !response?.responseText) {
                        throw new Error(`HTTP ${status || 'unknown'}`);
                    }
                    (0, eval)(response.responseText);
                    if (!hasCoverDownloadLibrary()) throw new Error('JSZip did not initialize');
                    GM_setValue('downloadPanel_url', index);
                    return true;
                } catch (error) {
                    lastError = error;
                }
            }
            throw new Error(`下载组件加载失败：${lastError?.message || '所有镜像均不可用'}`);
        })();

        try {
            return await coverDownloadLibraryPromise;
        } catch (error) {
            coverDownloadLibraryPromise = null;
            throw error;
        }
    }

    function sanitizeCoverFilename(value) {
        const normalized = String(value || '')
            .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/[. ]+$/g, '')
            .slice(0, 180);
        return normalized || 'cover';
    }

    function saveCoverArchive(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.hidden = true;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function initCoverDownloadStyles() {
        if (coverDownloadStylesReady) return;
        coverDownloadStylesReady = true;
        GM_addStyle(`
        #jlc-wb #jlc-cover-download-dialog[hidden]{display:none!important}
        #jlc-wb #jlc-cover-download-dialog{position:absolute;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(74,55,40,.32);font-family:inherit}
        #jlc-wb .jlc-cover-download-surface{width:min(460px,100%);max-height:calc(100% - 20px);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--creamu-wb-border);border-radius:8px;background:var(--creamu-wb-surface);box-shadow:0 18px 40px rgba(74,55,40,.25);color:var(--creamu-wb-text)}
        #jlc-wb .jlc-cover-download-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid var(--creamu-wb-divider)}
        #jlc-wb .jlc-cover-download-head h2{margin:0;font-size:16px;letter-spacing:0;color:var(--creamu-wb-title)}
        #jlc-wb .jlc-cover-download-body{min-height:0;overflow:auto;padding:14px}
        #jlc-wb .jlc-cover-download-form{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center}
        #jlc-wb .jlc-cover-download-form label{font-weight:650;white-space:nowrap}
        #jlc-wb .jlc-cover-download-form input{width:100%;min-width:0;height:36px;padding:6px 9px;border:1px solid var(--creamu-wb-border-strong);border-radius:6px;background:var(--creamu-wb-surface-raised);color:var(--creamu-wb-text);font:inherit}
        #jlc-wb .jlc-cover-download-message{min-height:20px;margin-top:10px;color:var(--creamu-wb-text-muted);font-size:12px}
        #jlc-wb .jlc-cover-download-files{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 12px;margin-top:8px}
        #jlc-wb .jlc-cover-download-file{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:center;min-width:0;font-size:12px}
        #jlc-wb .jlc-cover-download-file-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        #jlc-wb .jlc-cover-download-file-state[data-state="error"]{color:var(--creamu-wb-danger)}
        @media(max-width:520px){#jlc-wb .jlc-cover-download-form{grid-template-columns:1fr}#jlc-wb .jlc-cover-download-files{grid-template-columns:1fr}}
        `);
    }

    class CoverDownloadPanel {
        constructor() {
            this.element = $(`
                <div class="jlc-cover-download-panel">
                    <div class="jlc-cover-download-form">
                        <label for="jlc-cover-download-key">番号</label>
                        <input id="jlc-cover-download-key" placeholder="SSNI, ABP" autocomplete="off" name="key">
                        <button type="button" class="jlc-wb-btn primary" name="download">下载 ZIP</button>
                    </div>
                    <div class="jlc-cover-download-message" role="status" aria-live="polite"></div>
                    <div class="jlc-cover-download-files"></div>
                </div>
            `);
            this.element.find('button[name="download"]').on('click', (event) => {
                void this.startDownload(event.currentTarget);
            });
        }

        setMessage(message) {
            this.element.find('.jlc-cover-download-message').text(message || '');
        }

        getResultList() {
            const keys = String(this.element.find('input[name="key"]').val() || '')
                .replace(/，/g, ',')
                .split(',')
                .map(key => key.trim().toUpperCase())
                .filter(Boolean);
            const list = [];
            $('div.box-b').each(function () {
                const box = $(this);
                const avid = String(box.find('date[name="avid"]').text() || '').trim();
                if (!avid || (keys.length && !keys.some(key => avid.toUpperCase().includes(key)))) return;
                const image = box.find('img.lazy').first();
                const url = String(image.attr('data-src') || image.attr('src') || '').trim();
                if (!url) return;
                const title = String(box.find('a[name="av-title"]').attr('title') || '').trim();
                list.push({
                    avid,
                    url,
                    filename: `${sanitizeCoverFilename(`${avid} ${title}`)}.jpg`
                });
            });
            return list;
        }

        async startDownload(button) {
            const items = this.getResultList();
            this.resetInfo();
            if (!items.length) {
                this.setMessage('当前列表没有匹配的封面');
                return;
            }

            button.disabled = true;
            const originalText = button.textContent;
            button.textContent = '准备中...';
            this.setMessage(`正在准备 ${items.length} 张封面`);
            try {
                await ensureCoverDownloadLibrary();
                button.textContent = '下载中...';
                const result = await this.downloadZip(3, items);
                this.setMessage(`已打包 ${result.succeeded} 张${result.failed ? `，失败 ${result.failed} 张` : ''}`);
            } catch (error) {
                this.setMessage(error?.message || String(error));
            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        }

        async downloadZip(poolLimit, items) {
            const zip = new globalThis.JSZip();
            let completed = 0;
            let succeeded = 0;
            let failed = 0;
            await this.asyncPool(poolLimit, items, async (item) => {
                const state = this.addFileInfo(item.avid);
                try {
                    const response = await this.getImgResource(item.url);
                    const status = Number(response?.status || 0);
                    if (status < 200 || status >= 300 || !response?.response) {
                        throw new Error(`HTTP ${status || 'unknown'}`);
                    }
                    zip.file(item.filename, response.response);
                    succeeded += 1;
                    state.text('完成').attr('data-state', 'done');
                } catch (_) {
                    failed += 1;
                    state.text('失败').attr('data-state', 'error');
                } finally {
                    completed += 1;
                    this.setMessage(`正在下载 ${completed}/${items.length}`);
                }
            });
            if (!succeeded) throw new Error('所有封面均下载失败');
            const blob = await zip.generateAsync({ type: 'blob' });
            saveCoverArchive(blob, 'covers.zip');
            return { succeeded, failed };
        }

        getImgResource(url) {
            return getRequest(url, { responseType: 'blob', headers: { Referer: url } });
        }

        async asyncPool(poolLimit, array, iteratorFn) {
            let cursor = 0;
            const workerCount = Math.max(1, Math.min(Number(poolLimit) || 1, array.length));
            const workers = Array.from({ length: workerCount }, async () => {
                while (cursor < array.length) {
                    const index = cursor;
                    cursor += 1;
                    await iteratorFn(array[index], index);
                }
            });
            await Promise.all(workers);
        }

        addFileInfo(avid) {
            const row = $('<div class="jlc-cover-download-file"></div>');
            row.append($('<span class="jlc-cover-download-file-name"></span>').text(avid));
            const state = $('<span class="jlc-cover-download-file-state">等待</span>');
            row.append(state);
            this.element.find('.jlc-cover-download-files').append(row);
            return state;
        }

        resetInfo() {
            this.setMessage('');
            this.element.find('.jlc-cover-download-files').empty();
        }
    }

    class CoverDownloadDialog {
        constructor() {
            initCoverDownloadStyles();
            this.panel = new CoverDownloadPanel();
            this.element = $(`
                <div id="jlc-cover-download-dialog" role="dialog" aria-modal="true" aria-labelledby="jlc-cover-download-title" tabindex="-1" hidden>
                    <section class="jlc-cover-download-surface">
                        <header class="jlc-cover-download-head">
                            <h2 id="jlc-cover-download-title">批量下载封面</h2>
                            <button type="button" class="jlc-wb-icon-btn" name="close" title="关闭" aria-label="关闭">&#215;</button>
                        </header>
                        <div class="jlc-cover-download-body"></div>
                    </section>
                </div>
            `);
            this.element.find('.jlc-cover-download-body').append(this.panel.element);
            this.element.on('click', (event) => {
                if (event.target === this.element.get(0)) this.hide();
            });
            this.element.on('keydown', (event) => {
                if (event.key === 'Escape') this.hide();
            });
            this.element.find('button[name="close"]').on('click', () => this.hide());
        }

        mount() {
            const shell = getWorkbenchEl();
            if (shell && this.element.parent().get(0) !== shell) $(shell).append(this.element);
            return shell;
        }

        show() {
            if (!this.mount()) return;
            this.element.prop('hidden', false);
            this.element.trigger('focus');
        }

        hide() {
            this.element.prop('hidden', true);
        }
    }

    function openCoverDownloadDialog() {
        if (!coverDownloadDialogInstance) coverDownloadDialogInstance = new CoverDownloadDialog();
        coverDownloadDialogInstance.show();
    }

    function closeCoverDownloadDialog() {
        coverDownloadDialogInstance?.hide();
    }
