// Native content keeps its links, form state and event listeners when arranged in the Creamu page.
    const JLC_PAGE_REGIONS = {
        javlibrary: {
            navigation: ['#leftmenu'],
            search: '#topsearch, #topmenu form',
            searchLinks: '#topmenu a[href*="search.php"]',
            account: '#topmenu',
            title: '#video_title',
            info: '#video_info',
            cover: '#video_jacket',
            actions: '#video_favorite_edit'
        },
        javbus: {
            navigation: ['nav.navbar', '#navbar'],
            title: '.container > h3',
            info: '.col-md-3.info',
            cover: '.screencap'
        },
        javdb: {
            navigation: ['nav.navbar'],
            title: 'h2.title',
            info: '.video-meta-panel, .movie-panel-info',
            cover: '.column-video-cover'
        },
        avmoo: { navigation: ['nav.navbar', '#navbar'] }
    };

    function installJlcPageLayout() {
        if (document.getElementById('jlc-page-header')) return;
        const regions = JLC_PAGE_REGIONS[currentWeb];
        if (!regions) return;
        document.documentElement.classList.add('jlc-page');
        document.documentElement.dataset.jlcSite = currentWeb;
        const header = document.createElement('header');
        header.id = 'jlc-page-header';
        header.innerHTML = ''
            + '<a class="jlc-page-brand" href="/"><span class="jlc-brand-mark" aria-hidden="true">c</span>'
            + '<span>Creamu<small>' + escapeHtml(getSiteLabel(currentWeb)) + '</small></span></a>'
            + '<div class="jlc-page-search"></div>'
            + '<div class="jlc-page-tools">'
            + '<details class="jlc-native-navigation" name="jlc-page-menu"><summary>网站导航</summary><div></div></details>'
            + '<details class="jlc-native-account" name="jlc-page-menu"><summary>账号</summary><div></div></details>'
            + '</div>';
        // Extract search first: JavLibrary nests it in the same native top bar as account links.
        const search = regions.search && document.querySelector(regions.search);
        const searchLinks = regions.searchLinks ? [...document.querySelectorAll(regions.searchLinks)] : [];
        const searchMount = header.querySelector('.jlc-page-search');
        if (search) searchMount.append(search);
        searchLinks.forEach(link => searchMount.append(link));
        const accountMenu = header.querySelector('.jlc-native-account');
        const account = regions.account && document.querySelector(regions.account);
        if (account?.querySelector('a, button')) {
            // Keep native links, unread counts and event listeners; discard only textual separators.
            const walker = document.createTreeWalker(account, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
                if (/^[\s|[\]]+$/.test(walker.currentNode.textContent)) walker.currentNode.textContent = '';
            }
            accountMenu.querySelector('div').append(account);
        } else accountMenu.remove();
        const nav = header.querySelector('.jlc-native-navigation > div');
        regions.navigation.forEach(selector => {
            document.querySelectorAll(selector).forEach(node => {
                if (!nav.contains(node)) nav.append(node);
            });
        });
        if (!nav.childElementCount) header.querySelector('.jlc-native-navigation').remove();
        document.body.prepend(header);
        const menus = [...header.querySelectorAll('details')];
        header.addEventListener('keydown', event => {
            const menu = menus.find(item => item.open);
            if (event.key !== 'Escape' || !menu) return;
            event.preventDefault();
            event.stopPropagation();
            menu.open = false;
            menu.querySelector('summary').focus();
        });
        document.addEventListener('click', event => {
            if (!header.contains(event.target)) menus.forEach(menu => { menu.open = false; });
        });
    }

    function ensureJlcDetailLayout(context) {
        if (!context) return null;
        let detail = document.getElementById('jlc-detail');
        if (detail) return detail;
        const regions = JLC_PAGE_REGIONS[context.site];
        if (!regions) return null;
        const info = document.querySelector(regions.info) || context.anchor;
        const title = document.querySelector(regions.title);
        const cover = document.querySelector(regions.cover) || getDetailCoverDecorationMount(context);
        // A complete native region is moved once. Never duplicate controls or serialize native markup.
        const first = [title, cover, info].filter(Boolean).sort((a, b) => (
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
        ))[0];
        if (!first?.parentElement) return null;
        const placement = first.closest('#video_jacket_info') || first;
        detail = document.createElement('article');
        detail.id = 'jlc-detail';
        detail.innerHTML = ''
            + '<div class="jlc-detail-heading"><div class="jlc-detail-eyebrow">影片资料</div></div>'
            + '<div class="jlc-detail-overview"><div class="jlc-detail-artwork"></div><div class="jlc-detail-facts"></div></div>'
            + '<nav class="jlc-detail-sections" aria-label="影片内容">'
            + '<a href="#jlc-detail">资料</a><a href="#jlc-detail-media">预告与截图</a><a href="#jlc-detail-files">磁力与字幕</a>'
            + '<button type="button" data-jlc-detail-console>打开控制台对照</button></nav>'
            + '<div class="jlc-detail-resources"></div>';
        placement.before(detail);
        const heading = detail.querySelector('.jlc-detail-heading');
        if (title) heading.append(title);
        else {
            const h1 = document.createElement('h1');
            h1.textContent = context.title || context.avid;
            heading.append(h1);
        }
        const artwork = detail.querySelector('.jlc-detail-artwork');
        if (cover && !cover.contains(info)) artwork.append(cover);
        else artwork.remove();
        const facts = detail.querySelector('.jlc-detail-facts');
        facts.append(info);
        const actions = regions.actions && document.querySelector(regions.actions);
        if (actions && !facts.contains(actions)) facts.append(actions);
        // Group only the count text; native buttons keep their parent and click handlers.
        if (context.site === 'javlibrary' && actions) {
            actions.querySelectorAll('.favoritetype').forEach(row => {
                const count = document.createElement('span');
                count.className = 'jlc-favorite-count';
                Array.from(row.childNodes).filter(node => node.nodeName !== 'BUTTON').forEach(node => count.append(node));
                row.append(count);
            });
        }
        detail.querySelector('[data-jlc-detail-console]').addEventListener('click', () => openWorkbenchV3());
        updateJlcDetailSections();
        return detail;
    }

    function updateJlcDetailSections() {
        const detail = document.getElementById('jlc-detail');
        if (!detail) return;
        const enabled = config.resource_center !== false;
        detail.querySelector('[href="#jlc-detail-media"]').hidden = !enabled
            || (config.resource_trailer === false && config.resource_screenshot === false);
        detail.querySelector('[href="#jlc-detail-files"]').hidden = !enabled
            || (config.resource_magnet === false && config.resource_subtitle === false);
    }
