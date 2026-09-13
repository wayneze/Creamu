// @@creamu-part:52-resource-subtitles
    async function fetchSupplementalSubtitleInfo(avid) {
        const key = normalizeResourceAvid(avid);
        const emptyMessage = '未搜索到字幕';
        const searchUrl = buildSubtitlecatSearchUrl(key);
        if (!key || !searchUrl) return { subtitles: [], statuses: [], packs: [], message: emptyMessage };
        if (resourceSubtitleCache.has(key)) return resourceSubtitleCache.get(key);
        const promise = (async () => {
            const searchResponse = await requestPage(searchUrl, { timeout: 12000 });
            if (!searchResponse.ok || searchResponse.blockedByChallenge) {
                const state = searchResponse.blockedByChallenge
                    ? 'blocked'
                    : ([403, 429, 503].includes(searchResponse.status) ? 'blocked' : (searchResponse.status === 404 ? 'empty' : 'error'));
                return {
                    subtitles: [],
                    packs: [],
                    statuses: [{
                        key: 'subtitlecat',
                        label: 'Subtitlecat',
                        state,
                        note: searchResponse.blockedByChallenge ? 'JS challenge' : describeRequestStatus(searchResponse, '检索失败'),
                        href: searchUrl
                    }],
                    message: emptyMessage
                };
            }
            const packs = extractSubtitlecatSearchEntries(searchResponse.responseText, key).slice(0, 8);
            if (!packs.length) {
                return {
                    subtitles: [],
                    packs: [],
                    statuses: [{ key: 'subtitlecat', label: 'Subtitlecat', state: 'empty', note: '未命中', href: searchUrl }],
                    message: emptyMessage
                };
            }
            const packResults = await Promise.all(packs.map(async pack => {
                try {
                    const detail = await requestPage(pack.href, { timeout: 12000 });
                    if (!detail.ok || detail.blockedByChallenge) {
                        return { pack, entries: [], state: detail.blockedByChallenge ? 'blocked' : 'error' };
                    }
                    return {
                        pack,
                        entries: extractSubtitlecatLanguageEntries(detail.responseText, pack),
                        state: 'ok'
                    };
                } catch (error) {
                    console.warn('[JLC] Subtitlecat 详情解析失败', pack.href, error);
                    return { pack, entries: [], state: 'error' };
                }
            }));
            const subtitles = sortSubtitleEntries(packResults.flatMap(item => item.entries));
            const chineseCount = filterSubtitlesByScope(subtitles, 'zh').length;
            return {
                subtitles,
                packs,
                statuses: [{
                    key: 'subtitlecat',
                    label: 'Subtitlecat',
                    state: subtitles.length ? 'ok' : 'empty',
                    note: subtitles.length
                        ? (subtitles.length + ' 条 · 中文 ' + chineseCount)
                        : '有字幕包但没有已生成文件',
                    href: searchUrl
                }],
                message: subtitles.length ? '' : emptyMessage
            };
        })().catch(error => {
            console.warn('[JLC] 字幕搜索失败', error);
            resourceSubtitleCache.delete(key);
            return {
                subtitles: [],
                packs: [],
                statuses: [{ key: 'subtitlecat', label: 'Subtitlecat', state: 'error', note: '解析异常', href: searchUrl }],
                message: emptyMessage
            };
        });
        resourceSubtitleCache.set(key, promise);
        return promise;
    }

    function makeSubtitleListMarkup(subtitles) {
        if (!subtitles.length) return '';
        return `<div class="jlc-magnet-list jlc-subtitle-list">${subtitles.map((item, index) => {
            const title = item.title || ((item.label || '字幕') + ' ' + (index + 1));
            const note = item.note || item.label || '字幕';
            return `
            <div class="jlc-magnet-row" data-jlc-subtitle-index="${index}">
                <div class="jlc-magnet-meta">
                    <div class="jlc-magnet-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
                </div>
                <div class="jlc-magnet-side">
                    <div class="jlc-magnet-sub" title="${escapeHtml(note)}">${escapeHtml(note)}</div>
                    <div class="jlc-magnet-actions">
                        <button type="button" data-jlc-download-subtitle="${index}" title="下载字幕">下载</button>
                        <a href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer nofollow">打开</a>
                        ${item.src ? `<a href="${escapeHtml(item.src)}" target="_blank" rel="noopener noreferrer nofollow">来源</a>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('')}</div>`;
    }

    function downloadSubtitleFile(avid, item, button) {
        if (!item?.href) return;
        if (button?.dataset.jlcBusy === '1') return;
        if (button) {
            button.dataset.jlcBusy = '1';
            button.disabled = true;
        }
        const name = buildSubtitleDownloadName(avid, item);
        const finish = (ok, note) => {
            if (button) {
                button.dataset.jlcBusy = '0';
                button.disabled = false;
            }
            showAlert(ok ? ('已开始下载 ' + name) : (note || '字幕下载失败'));
        };
        try {
            GM_download({
                url: item.href,
                name,
                headers: { Referer: item.src || buildSubtitlecatSearchUrl(avid) || item.href },
                onload: () => finish(true),
                onerror: () => finish(false, '字幕下载失败'),
                ontimeout: () => finish(false, '字幕下载超时')
            });
        } catch (error) {
            finish(false, '当前环境不支持直接下载');
        }
    }

    function bindSubtitleActionButtons(body, avid, subtitles) {
        body.querySelectorAll('[data-jlc-download-subtitle]').forEach(button => {
            button.addEventListener('click', () => {
                const item = subtitles[Number(button.dataset.jlcDownloadSubtitle)];
                if (!item) return;
                downloadSubtitleFile(avid, item, button);
            });
        });
    }

    function renderSubtitleSection(card, context, token) {
        const body = card.querySelector('.jlc-resource-body');
        const titleNode = card.querySelector('h3');
        let titleBar = card.querySelector('.jlc-resource-card-titlebar');
        if (titleNode && !titleBar) {
            titleBar = document.createElement('div');
            titleBar.className = 'jlc-resource-card-titlebar';
            titleNode.parentNode.insertBefore(titleBar, titleNode);
            titleBar.appendChild(titleNode);
        }
        let titleTools = card.querySelector('.jlc-resource-card-tools');
        if (titleBar && !titleTools) {
            titleTools = document.createElement('div');
            titleTools.className = 'jlc-resource-card-tools';
            titleBar.appendChild(titleTools);
        }

        const searchUrl = buildSubtitlecatSearchUrl(context.avid);
        let info = { subtitles: [], statuses: [], packs: [], message: '' };
        let loading = false;
        let searched = false;
        let activeScope = 'zh';
        let lastMessage = '准备搜索 Subtitlecat。';
        let startDeferredLoad = () => false;

        const getVisibleSubtitles = () => filterSubtitlesByScope(info.subtitles, activeScope);

        const buildStatuses = () => {
            const allCount = uniqueSubtitleEntries(info.subtitles).length;
            const zhCount = filterSubtitlesByScope(info.subtitles, 'zh').length;
            const source = (info.statuses || [])[0] || {};
            const sourceState = loading
                ? (allCount ? 'ok' : 'pending')
                : (source.state || (searched ? (allCount ? 'ok' : 'empty') : 'pending'));
            return [
                {
                    key: 'zh',
                    label: '中文',
                    state: loading ? (zhCount ? 'ok' : 'pending') : (zhCount ? 'ok' : (searched ? 'empty' : 'pending')),
                    note: loading ? (zhCount ? (zhCount + ' 条 · 搜索中') : '搜索中') : (zhCount ? (zhCount + ' 条') : (searched ? '无中文' : '默认')),
                    count: zhCount,
                    active: activeScope === 'zh'
                },
                {
                    key: 'all',
                    label: '全部',
                    state: loading ? (allCount ? 'ok' : 'pending') : (allCount ? 'ok' : (searched ? 'empty' : 'pending')),
                    note: loading ? (allCount ? (allCount + ' 条 · 搜索中') : '搜索中') : (allCount ? (allCount + ' 条') : (searched ? '未命中' : '含英日韩')),
                    count: allCount,
                    active: activeScope === 'all'
                },
                {
                    key: 'subtitlecat',
                    label: source.label || 'Subtitlecat',
                    state: sourceState,
                    note: source.note || (loading ? '自动检测中' : (searched ? (allCount + ' 条') : '来源')),
                    href: source.href || searchUrl,
                    count: allCount,
                    active: false
                }
            ];
        };

        const makeStatusMarkup = (statuses) => {
            return '<div class="jlc-resource-status-list">' + statuses.map(item => {
                const state = normalizeResourceStatusState(item.state);
                const inner = '<strong>' + escapeHtml(item.label) + '</strong>' + (item.note ? '<small>' + escapeHtml(item.note) + '</small>' : '');
                const activeClass = item.active ? ' is-active-filter' : '';
                if (item.key === 'subtitlecat' && item.href) {
                    return '<a class="jlc-resource-status is-' + escapeHtml(state) + activeClass + '" href="' + escapeHtml(item.href) + '" target="_blank" rel="noopener noreferrer nofollow" title="打开 Subtitlecat 搜索页">' + inner + '</a>';
                }
                return '<button type="button" class="jlc-resource-status is-' + escapeHtml(state) + activeClass + '" data-jlc-subtitle-scope="' + escapeHtml(item.key) + '">' + inner + '</button>';
            }).join('') + '</div>';
        };

        const renderTitleTools = () => {
            if (!titleTools) return;
            titleTools.innerHTML = '<button type="button" class="jlc-title-inline-button" data-jlc-load-subtitle' + (loading ? ' disabled' : '') + '>' + (loading ? '刷新中...' : '刷新字幕') + '</button>';
            titleTools.querySelector('[data-jlc-load-subtitle]')?.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
                if (startDeferredLoad()) return;
                resourceSubtitleCache.delete(normalizeResourceAvid(context.avid));
                void loadSubtitles();
            }, { capture: true });
        };

        const render = () => {
            const subtitles = getVisibleSubtitles();
            const statuses = buildStatuses();
            const zhCount = statuses.find(item => item.key === 'zh')?.count || 0;
            const allCount = statuses.find(item => item.key === 'all')?.count || 0;
            const summaryParts = ['中文 ' + zhCount + ' 条', '全部 ' + allCount + ' 条'];
            if (activeScope === 'all') summaryParts.push('筛选 全部');
            let emptyText = lastMessage || '当前还没有可用字幕。';
            if (searched && activeScope === 'zh' && !subtitles.length && allCount) {
                emptyText = '没有中文字幕，可切到「全部」。';
            } else if (searched && !subtitles.length) {
                emptyText = activeScope === 'zh' ? '未找到已生成的中文字幕。' : (lastMessage || '未搜索到字幕');
            }
            const contentMarkup = subtitles.length ? makeSubtitleListMarkup(subtitles) : `<div class="jlc-resource-empty">${escapeHtml(emptyText)}</div>`;
            renderTitleTools();
            body.innerHTML = makeStatusMarkup(statuses)
                + `<div class="jlc-resource-note">${escapeHtml(summaryParts.join(' · '))}</div>`
                + (loading ? '<div class="jlc-resource-loading">正在搜索 Subtitlecat...</div>' : '')
                + contentMarkup;
            body.querySelectorAll('[data-jlc-subtitle-scope]').forEach(button => {
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    activeScope = button.dataset.jlcSubtitleScope === 'all' ? 'all' : 'zh';
                    render();
                });
            });
            bindSubtitleActionButtons(body, context.avid, subtitles);
        };

        const loadSubtitles = async () => {
            if (loading) return;
            loading = true;
            render();
            const next = await fetchSupplementalSubtitleInfo(context.avid);
            if (!isResourceCenterTokenAlive(token)) return;
            info = next || { subtitles: [], statuses: [], packs: [], message: '' };
            lastMessage = info.message || (info.subtitles?.length ? '' : '未搜索到字幕');
            searched = true;
            loading = false;
            render();
        };

        render();
        startDeferredLoad = scheduleResourceSectionLoad(card, token, loadSubtitles);
    }
