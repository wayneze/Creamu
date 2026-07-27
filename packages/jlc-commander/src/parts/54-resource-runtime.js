// @@creamu-part:54-resource-runtime
    function renderDetailResourceCenter(force = false) {
        applyJavlibraryMenuTopStyle();
        const context = getCurrentDetailContext();
        if (context) {
            void decorateCurrentDetailPage(force);
            ensureDetailPageCopyButtons(context);
        } else {
            removeDetailPageCopyButtons();
        }
        if (!context || config.resource_center === false) {
            removeDetailResourceCenter();
            return;
        }
        if (force) {
            clearDetailResourceCaches(context.avid);
        }
        const releaseDate = extractDetailReleaseDate(context);
        syncDetailReleaseBadge(context, releaseDate);
        const container = ensureDetailResourceCenter(context);
        if (!container) return;
        const renderSignature = buildDetailResourceRenderSignature(context, releaseDate);
        if (!force && container.dataset.renderSignature === renderSignature) return;
        cancelResourceSectionLoads(container);
        container.dataset.renderSignature = renderSignature;
        const token = Date.now() + '-' + Math.random().toString(36).slice(2);
        container.dataset.renderToken = token;
        const subtitle = [context.siteLabel, context.avid, releaseDate ? ('发行 ' + releaseDate) : ''].filter(Boolean).join(' · ');
        const cards = [];
        if (config.resource_trailer !== false) {
            cards.push('<section class="jlc-resource-card" data-jlc-resource="trailer"><h3>预告片</h3><div class="jlc-resource-body"></div></section>');
        }
        if (config.resource_screenshot !== false) {
            cards.push('<section class="jlc-resource-card" data-jlc-resource="screenshot"><h3>截图</h3><div class="jlc-resource-body"></div></section>');
        }
        if (config.resource_magnet !== false) {
            cards.push('<section class="jlc-resource-card" data-jlc-resource="magnet"><h3>磁力</h3><div class="jlc-resource-body"></div></section>');
        }
        if (config.resource_links !== false) {
            cards.push('<section class="jlc-resource-card" data-jlc-resource="links"><h3>站外链接</h3><div class="jlc-resource-body"></div></section>');
        }
        container.innerHTML = ''
            + '<div class="jlc-resource-header">'
            + '    <div>'
            + '        <div class="jlc-resource-title">JLC 资源中心</div>'
            + '        <div class="jlc-resource-subtitle">' + escapeHtml(subtitle) + (context.title ? (' · ' + escapeHtml(context.title)) : '') + '</div>'
            + '    </div>'
            + '    <div class="jlc-resource-header-actions">'
            + '        <button type="button" data-jlc-resource-refresh>刷新资源</button>'
            + '        <button type="button" data-jlc-resource-settings>资源设置</button>'
            + '    </div>'
            + '</div>'
            + '<div class="jlc-resource-grid">' + (cards.length ? cards.join('') : '<div class="jlc-resource-empty">当前没有启用任何资源模块。</div>') + '</div>';
        container.querySelector('[data-jlc-resource-refresh]')?.addEventListener('click', () => renderDetailResourceCenter(true));
        container.querySelector('[data-jlc-resource-settings]')?.addEventListener('click', () => openCommanderPanel('resource'));

        const trailerCard = container.querySelector('[data-jlc-resource="trailer"]');
        if (trailerCard) renderTrailerSection(trailerCard, context, token);
        const screenshotCard = container.querySelector('[data-jlc-resource="screenshot"]');
        if (screenshotCard) renderScreenshotSection(screenshotCard, context, token);
        const magnetCard = container.querySelector('[data-jlc-resource="magnet"]');
        if (magnetCard) renderMagnetSection(magnetCard, context, token);
        const linksCard = container.querySelector('[data-jlc-resource="links"]');
        if (linksCard) renderResourceLinksSection(linksCard, context);
    }
