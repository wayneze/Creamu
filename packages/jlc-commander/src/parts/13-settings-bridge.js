// @@creamu-part:13-settings-bridge
    function syncCommanderConfigInputs() {
        const map = {
            'jlc-i-url': config.emby_url || '',
            'jlc-i-key': config.emby_key || '',
            'jlc-i-mt': config.metatube_url || '',
            'jlc-i-fav': (config.fav_tags || []).join(','),
        };
        Object.entries(map).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        });
        const toggles = {
            'jlc-c-resource-center': config.resource_center !== false,
            'jlc-c-resource-trailer': config.resource_trailer !== false,
            'jlc-c-resource-screenshot': config.resource_screenshot !== false,
            'jlc-c-resource-screenshot-auto': !!config.resource_screenshot_auto,
            'jlc-c-resource-magnet': config.resource_magnet !== false,
        };
        Object.entries(toggles).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.checked = !!value;
        });
        syncResourceSettingInputs();
    }







    function openCommanderPanel(tabId = '') {
        openWorkbenchV3(tabId);
    }

    function closeCommanderPanel() {
        closeWorkbenchV3();
    }

    function toggleCommanderPanel(tabId = '') {
        toggleWorkbenchV3(tabId);
    }

    function getLegacySettingsSchema() {
        const items = [
            { type: 'toggle', key: 'autoPage', label: lang.menu_autoPage },
            { type: 'toggle', key: 'copyBtn', label: lang.menu_copyBtn },
            { type: 'toggle', key: 'toolBar', label: lang.menu_toolBar },
            { type: 'toggle', key: 'halfImg', label: lang.menu_halfImg, disabled: Status.halfImg_block },
            { type: 'toggle', key: 'fullTitle', label: lang.menu_fullTitle },
        ];
        if (['javbus', 'javdb'].includes(currentWeb)) {
            items.push({ type: 'toggle', key: 'avInfo', label: lang.menu_avInfo });
        }
        if (currentWeb === 'javlibrary') {
            items.push({ type: 'toggle', key: 'menutoTop', label: lang.menu_menutoTop });
        }
        items.push({ type: 'range', key: 'columnNum', label: lang.menu_columnNum, value: Status.getColumnNum(), min: 1, max: 8 });
        items.push({ type: 'range', key: 'waterfallWidth', label: '%', value: Status.get('waterfallWidth'), min: 1, max: currentObj?.maxWidth ? currentObj.maxWidth : 100 });
        items.push({ type: 'range', key: 'uiBtnScale', label: lang.menu_uiBtnScale, value: Status.get('uiBtnScale'), min: 70, max: 110, step: 5 });
        items.push({ type: 'button', key: 'downloadPanel', label: '批量下载封面' });
        items.push({ type: 'button', key: 'addHiddenWords', label: '添加屏蔽词' });
        return items;
    }

    const legacySettingHandlers = {
        autoPage() {
            if (scroller) {
                scroller.destroy();
                scroller = null;
                return;
            }
            if ($(currentObj.pageSelector).length) {
                scroller = new ScrollerPlugin($('#grid-b'), lazyLoad);
            }
        },
        copyBtn(enabled = Status.get('copyBtn')) {
            const visible = !!enabled;
            $('#grid-b .copy-span').toggle(visible);
            if (visible) ensureDetailPageCopyButtons();
            else removeDetailPageCopyButtons();
        },
        toolBar() {
            $('#grid-b .toolbar-b').toggle();
        },
        halfImg() {
            $('#grid-b .box-b img.loaded').each(function (_, el) {
                imgCallback(el);
            });
            const columnNum = Status.getColumnNum();
            GM_addStyle(`#grid-b .item-b{ width: ${100 / columnNum}%;}`);
        },
        fullTitle() {
            $('#grid-b a[name="av-title"]').toggleClass('titleNowrap');
        },
        avInfo() {},
        menutoTop() {
            location.reload();
        },
        columnNum(columnNum) {
            GM_addStyle(`#grid-b .item-b{ width: ${100 / columnNum}%;}`);
        },
        waterfallWidth(width) {
            $(currentObj.widthSelector).css({ width: `${width}%`, margin: `${width > 100 ? (100 - width) / 2 + '%' : 'auto'}` });
        },
        uiBtnScale(value) {
            if (typeof applyUiBtnScale === 'function') applyUiBtnScale(value);
        },
        downloadPanel() {
            closeCommanderPanel();
            TabPanel.getInstance().show(0);
        },
        addHiddenWords() {
            closeCommanderPanel();
            TabPanel.getInstance().show(1);
        }
    };





    async function refreshLibraryUI() {
        const [embyItems, videoItems] = await Promise.all([
            getAllFromStore('emby_data'),
            getAllFromStore('videos')
        ]);
        const mCount = embyItems.filter(i => i.type === 'movie').length;
        const pList = embyItems.filter(i => i.type === 'person');
        const vCount = videoItems.length;
        const personCount = knownPersons.size;

        const mEl = document.getElementById('st-m');
        const mElV3 = document.getElementById('jlc-wb-st-m');
        if (mEl) {
            mEl.innerText = mCount;
            const pEl = document.getElementById('st-p');
            const vEl = document.getElementById('st-v');
            if (pEl) pEl.innerText = personCount;
            if (vEl) vEl.innerText = vCount;
        }
        if (mElV3) {
            mElV3.innerText = mCount;
            const pEl = document.getElementById('jlc-wb-st-p');
            const vEl = document.getElementById('jlc-wb-st-v');
            if (pEl) pEl.innerText = personCount;
            if (vEl) vEl.innerText = vCount;
        }
        if (!mEl && !mElV3) return;

        const fillPersonList = (wrap) => {
            if (!wrap) return;
            wrap.innerHTML = '';
            const all = [...new Set([...config.custom_persons, ...pList.map(x => x.name).filter(Boolean)])].sort((a, b) => String(a).localeCompare(String(b), 'zh-Hans-CN'));
            all.slice(0, 300).forEach(name => {
                const div = document.createElement('div');
                div.className = 'person-item';
                div.innerHTML = `<span>👤 ${escapeHtml(name)}</span><span class="remove" data-name="${escapeHtml(name)}">✕</span>`;
                div.querySelector('.remove').onclick = async (e) => {
                    const n = e.target.dataset.name;
                    config.custom_persons = config.custom_persons.filter(x => x !== n);
                    GM_setValue('jlc_config_stable', config);
                    await loadRadarData();
                    await refreshLibraryUI();
                    refreshCommanderDecorations();
                };
                wrap.appendChild(div);
            });
        };
        fillPersonList(document.getElementById('jlc-person-list'));
        fillPersonList(document.getElementById('jlc-wb-person-list'));
    }
