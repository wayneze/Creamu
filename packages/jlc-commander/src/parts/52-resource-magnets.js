// @@creamu-part:52-resource-magnets
    async function fetchSupplementalMagnetInfo(avid) {
        const key = normalizeResourceAvid(avid);
        const emptyMessage = '未搜索到补充磁力';
        if (!key) return { magnets: [], statuses: [], sources: [], message: emptyMessage };
        if (resourceMagnetCache.has(key)) return resourceMagnetCache.get(key);
        const providers = [
            { key: 'sukebei', label: 'Sukebei', url: buildSukebeiSearchUrl(key), extract: extractSukebeiMagnetEntries, fetch: (url) => requestPage(url, { timeout: 12000 }) },
            { key: 'torrentkitty', label: 'Torkitty', url: buildTorrentKittySearchUrl(key), extract: extractTorrentKittyMagnetEntries, fetch: (url) => requestPage(url, { timeout: 12000 }) },
            { key: 'btsow', label: 'BTSOW', url: buildBtsowSearchUrl(key), extract: extractBtsowMagnetEntries, fetch: (url) => requestBtsowSearchPage(url) }
        ];
        const promise = (async () => {
            const results = await Promise.all(providers.map(async provider => {
                try {
                    if (!provider.url) {
                        return { key: provider.key, label: provider.label, href: provider.url, state: 'empty', note: '缺少番号', entries: [] };
                    }
                    const response = await provider.fetch(provider.url);
                    if (!response.ok || response.blockedByChallenge) {
                        const state = response.blockedByChallenge
                            ? 'blocked'
                            : ([403, 429, 503].includes(response.status) ? 'blocked' : (response.status === 404 ? 'empty' : 'error'));
                        return {
                            key: provider.key,
                            label: provider.label,
                            href: provider.url,
                            state,
                            note: response.blockedByChallenge ? 'JS challenge' : describeRequestStatus(response, '检索失败'),
                            entries: []
                        };
                    }
                    const entries = provider.extract(response.responseText, key);
                    return {
                        key: provider.key,
                        label: provider.label,
                        href: provider.url,
                        state: entries.length ? 'ok' : 'empty',
                        note: entries.length ? (entries.length + ' 条') : '未命中',
                        entries
                    };
                } catch (error) {
                    console.warn('[JLC] 磁力 provider 解析失败', provider.label, error);
                    return { key: provider.key, label: provider.label, href: provider.url, state: 'error', note: '解析异常', entries: [] };
                }
            }));
            const statuses = results.map(result => ({
                key: result.key,
                label: result.label,
                state: result.state,
                note: result.note,
                href: result.href
            }));
            const magnets = uniqueMagnetEntries(results.flatMap(result => result.entries));
            const sources = results.map(result => ({
                key: result.key,
                label: result.label,
                href: result.href,
                state: result.state,
                note: result.note,
                magnets: uniqueMagnetEntries(result.entries)
            }));
            return {
                magnets,
                statuses,
                sources,
                message: magnets.length ? '' : emptyMessage
            };
        })().catch(error => {
            console.warn('[JLC] 磁力补充搜索失败', error);
            resourceMagnetCache.delete(key);
            return {
                magnets: [],
                statuses: [
                    { key: 'sukebei', label: 'Sukebei', state: 'error', note: '解析异常', href: buildSukebeiSearchUrl(key) },
                    { key: 'torrentkitty', label: 'Torkitty', state: 'error', note: '解析异常', href: buildTorrentKittySearchUrl(key) },
                    { key: 'btsow', label: 'BTSOW', state: 'error', note: '解析异常', href: buildBtsowSearchUrl(key) }
                ],
                sources: [],
                message: emptyMessage
            };
        });
        resourceMagnetCache.set(key, promise);
        return promise;
    }
    function extractCurrentPageMagnets() {
        const anchors = Array.from(document.querySelectorAll('a[href^="magnet:"]'));
        return uniqueMagnetEntries(anchors.map((anchor, index) => {
            const row = anchor.closest('tr, .item, .magnet-item, .columns, .panel-block, .message, .card-content') || anchor.parentElement;
            const rowText = compactText(row);
            const text = compactText(anchor.textContent);
            const sizeMatch = rowText.match(/(?:\d+(?:\.\d+)?\s*(?:GB|MB|TB))/i);
            const dateMatch = rowText.match(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/);
            const noteParts = ['当前页'];
            if (sizeMatch?.[0]) noteParts.push(sizeMatch[0]);
            if (dateMatch?.[0]) noteParts.push(dateMatch[0]);
            return {
                title: text || `磁链 ${index + 1}`,
                href: anchor.href,
                provider: 'page',
                note: noteParts.join(' · ')
            };
        }));
    }

    function normalizeMagnetProviderKey(value) {
        const key = normalizeText(value || '').replace(/[^a-z0-9]+/g, '');
        if (!key || key === 'all') return 'all';
        if (key === 'page' || key === 'currentpage') return 'page';
        if (key === 'torrentkitty' || key === 'torkitty') return 'torrentkitty';
        if (key === 'sukebei') return 'sukebei';
        if (key === 'btsow') return 'btsow';
        if (key === 'sehuatang' || key === 'sehua' || key === 'sehuatangsearch') return 'sehuatang';
        return key;
    }

    function filterMagnetsByProvider(list, providerKey) {
        const key = normalizeMagnetProviderKey(providerKey);
        if (!key || key === 'all') return uniqueMagnetEntries(list);
        return uniqueMagnetEntries((Array.isArray(list) ? list : []).filter(item => normalizeMagnetProviderKey(item?.provider) === key));
    }

    function makeMagnetProviderStatusMarkup(statuses, activeProvider = 'all') {
        const list = Array.isArray(statuses) ? statuses : [];
        if (!list.length) return '';
        return '<div class="jlc-resource-status-list">' + list.map(item => {
            const state = normalizeResourceStatusState(item.state || item.status);
            const label = String(item.label || item.provider || '来源').trim();
            const note = String(item.note || '').trim();
            const key = normalizeMagnetProviderKey(item.key || item.provider || item.label || 'all');
            const href = normalizeMediaUrl(item.href || item.url || '', location?.href || 'https://www.javlibrary.com/');
            const title = href ? '点击切换；再次点击或空结果时打开源站' : '点击切换磁力来源';
            return '<button type="button" class="jlc-resource-status is-' + escapeHtml(state) + (normalizeMagnetProviderKey(activeProvider) === key ? ' is-active-filter' : '') + '" data-jlc-magnet-provider="' + escapeHtml(key) + '"' + (href ? ' data-jlc-provider-href="' + escapeHtml(href) + '"' : '') + ' title="' + escapeHtml(title) + '">' + '<strong>' + escapeHtml(label) + '</strong>' + (note ? '<small>' + escapeHtml(note) + '</small>' : '') + '</button>';
        }).join('') + '</div>';
    }

    function bindMagnetProviderButtons(body, handlers = {}) {
        body.querySelectorAll('[data-jlc-magnet-provider]').forEach(button => {
            const handleActivate = (event) => {
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
                }
                const key = normalizeMagnetProviderKey(button.dataset.jlcMagnetProvider || 'all');
                const href = button.dataset.jlcProviderHref || '';
                const count = Number(button.dataset.jlcProviderCount || 0);
                const isActive = button.dataset.jlcProviderActive === '1';
                if (href && (isActive || count < 1)) {
                    window.open(href, '_blank', 'noopener,noreferrer');
                    return;
                }
                handlers.onSwitch?.(key);
            };
            button.addEventListener('click', handleActivate);
            button.addEventListener('auxclick', (event) => {
                if (event.button !== 1) return;
                handleActivate(event);
            });
        });
    }

    function makeMagnetListMarkup(magnets) {
        if (!magnets.length) return '';
        return `<div class="jlc-magnet-list">${magnets.map((magnet, index) => {
            const title = magnet.label || magnet.title || ('磁链 ' + (index + 1));
            const note = magnet.note || '磁力链接';
            return `
            <div class="jlc-magnet-row" data-jlc-magnet-index="${index}">
                <div class="jlc-magnet-meta">
                    <div class="jlc-magnet-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
                </div>
                <div class="jlc-magnet-side">
                    <div class="jlc-magnet-sub" title="${escapeHtml(note)}">${escapeHtml(note)}</div>
                    <div class="jlc-magnet-actions">
                        <button type="button" data-jlc-copy-magnet="${index}" title="复制磁链">复制</button>
                        <a href="${escapeHtml(magnet.href)}" target="_blank" rel="noopener noreferrer nofollow">打开</a>
                        ${magnet.src ? `<a href="${escapeHtml(magnet.src)}" target="_blank" rel="noopener noreferrer nofollow">来源</a>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('')}</div>`;
    }

    function bindMagnetActionButtons(body, magnets) {
        body.querySelectorAll('[data-jlc-copy-magnet]').forEach(button => {
            button.addEventListener('click', () => {
                const magnet = magnets[Number(button.dataset.jlcCopyMagnet)];
                if (!magnet) return;
                GM_setClipboard(magnet.href);
                showAlert('磁链已复制！');
            });
        });
    }
    function renderMagnetSection(card, context, token) {
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

        const pageMagnets = extractCurrentPageMagnets();
        const pendingStatuses = [
            { key: 'all', label: '全部', state: pageMagnets.length ? 'ok' : 'pending', note: pageMagnets.length ? `去重 ${pageMagnets.length} 条` : '准备搜索' },
            { key: 'page', label: '当前页', state: pageMagnets.length ? 'ok' : 'empty', note: pageMagnets.length ? `${pageMagnets.length} 条` : '无直出' },
            { key: 'sukebei', label: 'Sukebei', state: 'pending', note: '自动检测中', href: buildSukebeiSearchUrl(context.avid) },
            { key: 'torrentkitty', label: 'Torkitty', state: 'pending', note: '自动检测中', href: buildTorrentKittySearchUrl(context.avid) },
            { key: 'btsow', label: 'BTSOW', state: 'pending', note: '自动检测中', href: buildBtsowSearchUrl(context.avid) },
            { key: 'sehuatang', label: '色花堂', state: 'ok', note: '番号搜索', href: buildSehuatangSearchUrl(context.avid) }
        ];
        let supplementalInfo = { magnets: [], statuses: pendingStatuses.slice(2, 5), sources: [], message: '' };
        let loading = false;
        let searched = false;
        let activeProvider = 'all';
        let lastMessage = pageMagnets.length ? '' : '当前页暂无可直接抽取的磁力。';
        let startDeferredLoad = () => false;

        const getSourceMagnets = () => {
            const key = normalizeMagnetProviderKey(activeProvider);
            const sourceMap = new Map((supplementalInfo.sources || []).map(item => [normalizeMagnetProviderKey(item.key), item]));
            if (key === 'page') return pageMagnets;
            if (key === 'all') return uniqueMagnetEntries([...pageMagnets, ...((supplementalInfo.sources || []).flatMap(item => item.magnets || []))]);
            return sourceMap.get(key)?.magnets || [];
        };

        const buildStatuses = () => {
            const sourceMap = new Map((supplementalInfo.sources || []).map(item => [normalizeMagnetProviderKey(item.key), item]));
            const totalMagnets = uniqueMagnetEntries([...pageMagnets, ...((supplementalInfo.sources || []).flatMap(item => item.magnets || []))]);
            const list = [
                {
                    key: 'all',
                    label: '全部',
                    state: loading ? (totalMagnets.length ? 'ok' : 'pending') : (totalMagnets.length ? 'ok' : (searched ? 'empty' : (pageMagnets.length ? 'ok' : 'pending'))),
                    note: loading ? `去重 ${totalMagnets.length} 条 · 搜索中` : `去重 ${totalMagnets.length} 条`
                },
                { key: 'page', label: '当前页', state: pageMagnets.length ? 'ok' : 'empty', note: pageMagnets.length ? `${pageMagnets.length} 条` : '无直出' }
            ];
            ['sukebei', 'torrentkitty', 'btsow', 'sehuatang'].forEach(providerKey => {
                const source = sourceMap.get(providerKey);
                const fallback = pendingStatuses.find(item => item.key === providerKey) || { key: providerKey, label: providerKey.toUpperCase(), state: 'pending', note: '自动检测中' };
                const sourceMagnets = source?.magnets || [];
                const sourceNoteParts = [];
                if (sourceMagnets.length) sourceNoteParts.push(sourceMagnets.length + ' 条');
                if (source?.note && source.note !== '未命中' && source.note !== (sourceMagnets.length + ' 条')) sourceNoteParts.push(source.note);
                list.push({
                    key: providerKey,
                    label: source?.label || fallback.label,
                    state: source?.state || fallback.state,
                    note: sourceNoteParts.join(' · ') || source?.note || fallback.note,
                    href: source?.href || fallback.href
                });
            });
            return list.map(item => Object.assign({}, item, {
                count: normalizeMagnetProviderKey(item.key) === 'all' ? totalMagnets.length
                    : (normalizeMagnetProviderKey(item.key) === 'page' ? pageMagnets.length : (sourceMap.get(normalizeMagnetProviderKey(item.key))?.magnets || []).length),
                active: normalizeMagnetProviderKey(activeProvider) === normalizeMagnetProviderKey(item.key)
            }));
        };

        const renderTitleTools = () => {
            if (!titleTools) return;
            titleTools.innerHTML = '<button type="button" class="jlc-title-inline-button" data-jlc-load-magnet' + (loading ? ' disabled' : '') + '>' + (loading ? '刷新中...' : '刷新磁力') + '</button>';
            titleTools.querySelector('[data-jlc-load-magnet]')?.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
                if (startDeferredLoad()) return;
                resourceMagnetCache.delete(normalizeResourceAvid(context.avid));
                void loadMagnets();
            }, { capture: true });
        };

        const render = () => {
            const magnets = getSourceMagnets();
            const statuses = buildStatuses();
            const totalCount = statuses.find(item => normalizeMagnetProviderKey(item.key) === 'all')?.count || 0;
            const summaryParts = [`去重聚合 ${totalCount} 条`, `当前页 ${pageMagnets.length} 条`];
            if (activeProvider !== 'all') {
                const activeStatus = statuses.find(item => normalizeMagnetProviderKey(item.key) === normalizeMagnetProviderKey(activeProvider));
                if (activeStatus?.label) summaryParts.push('筛选 ' + activeStatus.label);
            }
            let emptyText = lastMessage || '当前还没有可用磁力。';
            if (searched && activeProvider !== 'all' && !magnets.length) {
                const activeStatus = statuses.find(item => normalizeMagnetProviderKey(item.key) === normalizeMagnetProviderKey(activeProvider));
                emptyText = (activeStatus?.label || '当前来源') + ' 暂无磁力';
            }
            const contentMarkup = magnets.length ? makeMagnetListMarkup(magnets) : `<div class="jlc-resource-empty">${escapeHtml(emptyText)}</div>`;
            renderTitleTools();
            body.innerHTML = makeMagnetProviderStatusMarkup(statuses, activeProvider)
                + `<div class="jlc-resource-note">${escapeHtml(summaryParts.join(' · '))}</div>`
                + (loading ? '<div class="jlc-resource-loading">正在搜索 Sukebei / Torkitty / BTSOW...</div>' : '')
                + contentMarkup;
            body.querySelectorAll('[data-jlc-magnet-provider]').forEach(button => {
                const key = normalizeMagnetProviderKey(button.dataset.jlcMagnetProvider || 'all');
                const status = statuses.find(item => normalizeMagnetProviderKey(item.key) === key);
                button.dataset.jlcProviderCount = String(status?.count || 0);
                button.dataset.jlcProviderActive = status?.active ? '1' : '0';
            });
            bindMagnetProviderButtons(body, {
                onSwitch: (providerKey) => {
                    activeProvider = normalizeMagnetProviderKey(providerKey);
                    render();
                }
            });
            bindMagnetActionButtons(body, magnets);
        };

        const loadMagnets = async () => {
            if (loading) return;
            loading = true;
            render();
            const info = await fetchSupplementalMagnetInfo(context.avid);
            if (!isResourceCenterTokenAlive(token)) return;
            supplementalInfo = info || { magnets: [], statuses: [], sources: [], message: '' };
            lastMessage = info?.message || (pageMagnets.length ? '' : '未搜索到补充磁力');
            searched = true;
            loading = false;
            render();
        };

        render();
        startDeferredLoad = scheduleResourceSectionLoad(card, token, loadMagnets);
    }
