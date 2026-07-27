// @@creamu-part:53-resource-sections
    async function buildInlineScreenshotPanel(context) {
        const key = context?.avid;
        if (!key) throw new Error('missing avid');
        let promise = resourceScreenshotCache.get(key);
        if (!promise) {
            promise = getAvImg(key, `jlc-resource-${key}`).catch(err => {
                resourceScreenshotCache.delete(key);
                throw err;
            });
            resourceScreenshotCache.set(key, promise);
        }
        const originalPanel = await promise;
        const $panel = originalPanel.clone(true, true);
        $panel.removeAttr('name').removeClass('pop-up-tag').addClass('jlc-inline-screenshot-panel').show();
        $panel.css({ minHeight: '0', width: '100%' });
        $panel.find('ul').remove();
        $panel.find('img[name="screenshot"]').each((index, img) => {
            if (index === 0) {
                img.loading = 'eager';
            } else {
                $(img).remove();
            }
        });
        $panel.find('li.imgResult-li').removeClass('imgResult-loading');
        $panel.find('li.imgResult-li').eq(0).addClass('imgResult-Current').siblings().removeClass('imgResult-Current');
        return $panel.get(0);
    }
    function renderResourceLinksSection(card, context) {
        const body = card.querySelector('.jlc-resource-body');
        const markup = makeResourceLinksMarkup(buildExternalResourceLinks(context.avid, context.site));
        body.innerHTML = markup || '<div class="jlc-resource-empty">暂无站外入口。</div>';
    }

    async function renderTrailerSection(card, context, token) {
        const body = card.querySelector('.jlc-resource-body');
        const key = normalizeResourceAvid(context?.avid);
        const idleStatuses = [
            { label: 'DMM', state: 'pending', note: '自动检测中' },
            { label: 'MissAV 有码', state: 'pending', note: '自动检测中' },
            { label: 'MissAV 无码流出', state: 'pending', note: '自动检测中' },
            { label: 'FALENO', state: 'pending', note: '自动检测中' },
            { label: '7MMTV', state: 'pending', note: '自动检测中' },
            { label: 'SupJav', state: 'pending', note: '自动检测中' },
            { label: '123AV', state: 'pending', note: '自动检测中' }
        ];
        if (isLikelyMgsAvid(key)) {
            idleStatuses.splice(3, 0, { label: 'MGS', state: 'pending', note: '等待回退' });
        }
        const idleLinks = uniqueTrailerLinks([
            ...buildMissAVManualLinks(key),
            ...buildTrailerFallbackLinks(key)
        ]);
        let loadingTrailer = false;

        const swallowEvent = (event, preventDefault = false) => {
            if (!event) return;
            if (preventDefault) event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        };

        const bindReloadButton = () => {
            const button = body.querySelector('[data-jlc-load-trailer]');
            if (!button) return;
            button.addEventListener('click', (event) => {
                swallowEvent(event, true);
                clearTrailerResourceCaches(key);
                void loadTrailer();
            }, { capture: true });
        };

        const renderLoading = () => {
            body.innerHTML = makeTrailerProviderMarkup(idleStatuses, idleLinks)
                + '<div class="jlc-resource-loading">自动检测预告中...</div>';
        };

        const renderResolved = (result) => {
            const videoSources = uniqueTrailerSources(result.videoSources || []);
            const linkSources = uniqueTrailerLinks(result.linkSources || idleLinks);
            const displayLinks = linkSources.length ? linkSources : idleLinks;
            const statuses = result.statuses || idleStatuses;
            const providerMarkup = makeTrailerProviderMarkup(statuses, displayLinks);
            const actionsBase = ''
                + '<div class="jlc-resource-inline-actions jlc-trailer-main-actions">'
                + '    <button type="button" data-jlc-open-trailer>弹层播放</button>'
                + '    <a href="#" target="_blank" rel="noopener noreferrer nofollow" data-jlc-open-trailer-blank>新标签打开</a>'
                + '    <button type="button" data-jlc-load-trailer>重新检测</button>'
                + '</div>';

            if (!videoSources.length) {
                body.innerHTML = providerMarkup
                    + '<div class="jlc-resource-empty">暂时没找到可直连预告。</div>'
                    + actionsBase;
                const openBlank = body.querySelector('[data-jlc-open-trailer-blank]');
                if (openBlank) openBlank.href = (linkSources[0] || {}).href || '#';
                body.querySelector('[data-jlc-open-trailer]')?.addEventListener('click', (event) => {
                    swallowEvent(event, true);
                    const target = linkSources[0];
                    if (target?.href) window.open(target.href, '_blank', 'noopener,noreferrer');
                });
                bindReloadButton();
                return;
            }

            body.innerHTML = providerMarkup
                + '<div class="jlc-trailer-inline-player" data-jlc-trailer-inline-player></div>'
                + (videoSources.length > 1
                    ? '<div class="jlc-resource-inline-actions jlc-trailer-source-list">'
                        + videoSources.map((source, index) => '<button type="button" class="jlc-trailer-source-button" data-jlc-trailer-index="' + index + '">' + escapeHtml(source.label) + '</button>').join('')
                        + '</div>'
                    : '')
                + actionsBase;

            const playerHost = body.querySelector('[data-jlc-trailer-inline-player]');
            const openButton = body.querySelector('[data-jlc-open-trailer]');
            const openBlank = body.querySelector('[data-jlc-open-trailer-blank]');
            let activeIndex = 0;

            const activateSource = (index) => {
                activeIndex = index;
                const activeSource = videoSources[index] || videoSources[0];
                mountTrailerPlayer(playerHost, activeSource, { mode: 'inline', autoplay: false, muted: true });
                body.querySelectorAll('[data-jlc-trailer-index]').forEach((button, buttonIndex) => {
                    button.classList.toggle('is-active', buttonIndex === index);
                });
                if (openBlank && activeSource) openBlank.href = activeSource.pageUrl || activeSource.href;
            };

            activateSource(0);

            openButton?.addEventListener('click', (event) => {
                swallowEvent(event, true);
                openTrailerOverlay(videoSources[activeIndex] || videoSources[0]);
            });

            body.querySelectorAll('[data-jlc-trailer-index]').forEach(button => {
                button.addEventListener('click', (event) => {
                    swallowEvent(event, true);
                    activateSource(Number(button.dataset.jlcTrailerIndex));
                });
            });

            bindReloadButton();
        };

        const loadTrailer = async () => {
            if (loadingTrailer) return;
            loadingTrailer = true;
            renderLoading();
            try {
                const result = await resolveTrailerSources(context, { includeMissAV: true });
                if (!isResourceCenterTokenAlive(token)) return;
                renderResolved(result);
            } finally {
                loadingTrailer = false;
            }
        };

        renderLoading();
        scheduleResourceSectionLoad(card, token, loadTrailer);
    }

    function renderScreenshotSection(card, context, token) {
        const body = card.querySelector('.jlc-resource-body');
        const screenshotLinks = buildScreenshotSearchLinks(context.avid);
        const linkMap = new Map(screenshotLinks.map(item => [item.label, item.href]));
        const pendingStatuses = [
            { label: 'BlogJav', state: 'pending', note: '主源待查', href: linkMap.get('BlogJav') || '' },
            { label: 'JavStore', state: 'pending', note: '兜底待查', href: linkMap.get('JavStore') || '' }
        ];
        const loadScreenshots = async () => {
            body.innerHTML = makeResourceStatusMarkup(pendingStatuses) + '<div class="jlc-resource-loading">正在加载截图...</div>';
            let info = null;
            try {
                info = await fetchScreenshotResourceInfo(context.avid);
                if (!isResourceCenterTokenAlive(token)) return;
                const panel = await buildInlineScreenshotPanel(context);
                if (!isResourceCenterTokenAlive(token)) return;
                body.innerHTML = makeResourceStatusMarkup(info?.statuses || pendingStatuses);
                body.appendChild(panel);
            } catch (error) {
                if (!isResourceCenterTokenAlive(token)) return;
                body.innerHTML = makeResourceStatusMarkup(info?.statuses || pendingStatuses)
                    + '<div class="jlc-resource-empty">' + escapeHtml(error || info?.message || lang.getAvImg_none || '暂无截图') + '</div>';
            }
        };

        if (config.resource_screenshot_auto) {
            body.innerHTML = makeResourceStatusMarkup(pendingStatuses)
                + '<div class="jlc-resource-loading">正在加载截图...</div>';
            scheduleResourceSectionLoad(card, token, loadScreenshots);
            return;
        }
        body.innerHTML = makeResourceStatusMarkup(pendingStatuses)
            + '<div class="jlc-resource-note">沿用主脚本截图面板，优先 BlogJav，失败再回退 JavStore；默认手动加载避免拖慢首屏。</div>'
            + '<div class="jlc-resource-inline-actions"><button type="button" data-jlc-load-screenshot>加载截图</button></div>';
        body.querySelector('[data-jlc-load-screenshot]')?.addEventListener('click', loadScreenshots, { once: true });
    }
