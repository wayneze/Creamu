// @@creamu-part:50-resource-center
    function extractReleaseDateFromText(text) {
        const normalizedText = String(text || '').replace(/年/g, '-').replace(/月/g, '-').replace(/日/g, ' ');
        const labeled = normalizedText.match(/(?:发行(?:日期)?|發行(?:日期)?|発売日|配信開始日|release(?:\s*date)?|date)\s*[:：]?\s*([0-9]{4}[-/.][0-9]{1,2}[-/.][0-9]{1,2}|[0-9]{8})/i);
        if (labeled?.[1]) return normalizeReleaseDate(labeled[1]);
        const direct = normalizedText.match(/([0-9]{4}[-/.][0-9]{1,2}[-/.][0-9]{1,2}|[0-9]{8})/);
        return direct?.[1] ? normalizeReleaseDate(direct[1]) : '';
    }

    function extractDetailReleaseDate(context) {
        if (!context) return '';
        const directSelectors = {
            javlibrary: ['#video_date .text', '#video_date', 'td#video_date + td', '#video_info .text'],
            javbus: ['.col-md-3.info p', '#mag-submit-show'],
            javdb: ['.video-meta-panel .panel-block', '.movie-panel-info .panel-block']
        };
        const selectors = directSelectors[context.site] || [];
        for (const selector of selectors) {
            const nodes = Array.from(document.querySelectorAll(selector));
            for (const node of nodes) {
                const date = extractReleaseDateFromText(node.textContent || '');
                if (date) return date;
            }
        }

        let blocks = [];
        if (context.site === 'javlibrary') {
            blocks = Array.from(document.querySelectorAll('#video_info tr, #video_details tr, table tr'));
        } else if (context.site === 'javbus') {
            blocks = Array.from(document.querySelectorAll('.col-md-3.info p, .col-md-3.info li, .info p'));
        } else if (context.site === 'javdb') {
            blocks = Array.from(document.querySelectorAll('.video-meta-panel .panel-block, .movie-panel-info .panel-block, .panel-block'));
        }
        const labels = ['发行', '發行', '発売', 'release', 'date', '配信'];
        for (const block of blocks) {
            const text = compactText(block);
            if (!text) continue;
            if (labels.some(label => text.toLowerCase().includes(label.toLowerCase()))) {
                const date = extractReleaseDateFromText(text);
                if (date) return date;
            }
        }
        return '';
    }

    function getCurrentDetailContext() {
        const site = String(currentWeb || '').toLowerCase();
        let anchor = null;
        let avidNode = null;
        let title = '';
        let avid = '';

        if (site === 'javlibrary') {
            anchor = document.querySelector('#video_favorite_edit')
                || document.querySelector('#video_genres')
                || document.querySelector('#video_cast')
                || document.querySelector('#video_info');
            if (!anchor) return null;
            avidNode = document.querySelector('#video_id .text')
                || document.querySelector('td#video_id + td .text')
                || document.querySelector('#video_id');
            avid = normalizeResourceAvid(avidNode?.textContent || document.title);
            title = compactText(document.querySelector('#video_title h3 a') || document.querySelector('#video_title a') || document.title);
        } else if (site === 'javbus') {
            anchor = document.querySelector('.col-md-3.info')
                || document.querySelector('#mag-submit-show')
                || document.querySelector('.screencap');
            if (!anchor) return null;
            avidNode = document.querySelector('[data-clipboard-text]')
                || Array.from(document.querySelectorAll('.col-md-3.info p, .info p, span')).find(node => /識別碼|识别码|ID/i.test(compactText(node)));
            const pathCode = normalizeResourceAvid(location.pathname.split('/').filter(Boolean).pop() || '');
            avid = normalizeResourceAvid(avidNode?.getAttribute?.('data-clipboard-text') || avidNode?.textContent || pathCode || document.title);
            title = compactText(document.querySelector('.bigImage img')?.getAttribute('title') || document.querySelector('h3') || document.title);
        } else if (site === 'javdb') {
            anchor = document.querySelector('.video-meta-panel')
                || document.querySelector('.movie-panel-info')
                || document.querySelector('.panel.movie-panel-info');
            if (!anchor) return null;
            avidNode = document.querySelector('[data-clipboard-text]')
                || document.querySelector('.first-block .value')
                || document.querySelector('.movie-panel-info .panel-block');
            avid = normalizeResourceAvid(avidNode?.getAttribute?.('data-clipboard-text') || avidNode?.textContent || document.title);
            title = compactText(document.querySelector('.title.is-4') || document.querySelector('h2.title') || document.title);
        } else {
            return null;
        }

        if (!avid) return null;
        return {
            site,
            siteLabel: getSiteLabel(site),
            avid,
            title,
            anchor,
            avidNode,
            pageUrl: location.href
        };
    }

    function ensureStandaloneCommanderEntry() {
        createWorkbenchV3();
    }

    function removeDetailResourceCenter() {
        const container = document.getElementById('jlc-resource-center');
        if (!container) return;
        cancelResourceSectionLoads(container);
        container.remove();
    }

    function ensureDetailResourceCenter(context) {
        if (!context?.anchor) return null;
        let container = document.getElementById('jlc-resource-center');
        if (!container) {
            container = document.createElement('section');
            container.id = 'jlc-resource-center';
            container.className = 'jlc-resource-center';
        }
        if (context.anchor.nextElementSibling !== container) {
            context.anchor.insertAdjacentElement('afterend', container);
        }
        return container;
    }

    function makeResourceLinksMarkup(links) {
        const list = uniqueLinkObjects(links);
        if (!list.length) return '';
        return `<div class="jlc-resource-chip-list">${list.map(link => `
            <a class="jlc-resource-chip" href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer nofollow" title="${escapeHtml(link.note || link.label)}">
                <span>${escapeHtml(link.label)}</span>
                ${link.note ? `<small>${escapeHtml(link.note)}</small>` : ''}
            </a>`).join('')}</div>`;
    }

    function applyJavlibraryMenuTopStyle() {
        if (typeof document === 'undefined') return;
        const styleId = 'jlc-javlibrary-menutop-style';
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            (document.head || document.documentElement || document.body)?.appendChild(styleEl);
        }
        if (currentWeb !== 'javlibrary' || !Status.get('menutoTop')) {
            styleEl.textContent = '';
            return;
        }
        styleEl.textContent = `
            #leftmenu { width: 100%; float: none; }
            #leftmenu > table { display: none; }
            #leftmenu .menul1,
            #leftmenu .menul1 > ul { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; }
            #leftmenu .menul1 { padding: 5px; }
            #rightcolumn { margin: 0 5px; padding: 10px 5px; }
        `;
    }

    function syncDetailReleaseBadge(context, dateText) {
        const node = context?.avidNode;
        if (!node || !(node instanceof Element)) return;
        const value = normalizeReleaseDate(dateText);
        let badge = node.parentElement?.querySelector('.avid-date-badge[data-jlc-detail-date="1"]') || null;
        if (!value) {
            badge?.remove();
            return;
        }
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'avid-date-badge';
            badge.dataset.jlcDetailDate = '1';
            node.insertAdjacentElement('afterend', badge);
        }
        badge.textContent = value;
        badge.title = value;
    }
    function isResourceCenterTokenAlive(token) {
        return document.getElementById('jlc-resource-center')?.dataset.renderToken === token;
    }

    const resourceSectionLoadObservers = new Map();

    function cancelResourceSectionLoads(root = null) {
        resourceSectionLoadObservers.forEach((observer, card) => {
            if (root && card !== root && !root.contains?.(card)) return;
            observer.disconnect();
            resourceSectionLoadObservers.delete(card);
        });
    }

    function scheduleResourceSectionLoad(card, token, load) {
        if (!card || typeof load !== 'function') return () => false;
        let started = false;
        let observer = null;
        const stopObserving = () => {
            if (!observer) return;
            observer.disconnect();
            resourceSectionLoadObservers.delete(card);
            observer = null;
        };
        const start = () => {
            if (started) return false;
            if (!isResourceCenterTokenAlive(token)) {
                stopObserving();
                return false;
            }
            started = true;
            stopObserving();
            void Promise.resolve().then(load).catch(error => {
                console.warn('[JLC] 资源区块加载失败', error);
            });
            return true;
        };
        if (typeof IntersectionObserver !== 'function') {
            window.setTimeout(start, 0);
            return start;
        }
        observer = new IntersectionObserver((entries) => {
            if (entries.some(entry => entry.isIntersecting || entry.intersectionRatio > 0)) start();
        }, { root: null, rootMargin: '240px 0px' });
        resourceSectionLoadObservers.set(card, observer);
        observer.observe(card);
        return start;
    }

    function buildDetailResourceRenderSignature(context, releaseDate = '') {
        return JSON.stringify([
            compactText(context?.site || ''),
            normalizeResourceAvid(context?.avid || ''),
            compactText(context?.title || ''),
            normalizeReleaseDate(releaseDate),
            config.resource_trailer !== false,
            config.resource_screenshot !== false,
            !!config.resource_screenshot_auto,
            config.resource_magnet !== false,
            config.resource_subtitle !== false,
            config.resource_links !== false
        ]);
    }
