
  function renderSettingsSections(tab) {
    const body = document.getElementById('exc-settings-body');
    if (!body) return;
    const st = getLrrStatus();

    // 兼容旧 tab id
    if (tab === 'lrr') tab = 'sync';
    if (tab === 'block') tab = 'tags';

    if (tab === 'sync') {
      const intervalMin = Math.max(5, Number(config.lrr_sync_interval_min) || 60);
      const sync = ensureCreamuSync();
      const syncStatus = sync ? sync.statusText() : '同步模块未加载';
      const conf = config.webdav_conflict || 'ask';
      const pwdSaved = !!(config.webdav_password || '');
      body.innerHTML =
        '<section class="jlc-wb-settings-section is-active">' +
        '<h3>一键同步</h3>' +
        '<div class="legacy-note">工作台底部「同步」= WebDAV + LRR（已配置的项）。本页可单独配置与触发。</div>' +
        '<button type="button" class="jlc-wb-btn primary jlc-wb-block-action" id="exc-cfg-sync-both">同步 WebDAV + LRR</button>' +
        '<h3 class="jlc-wb-section-title">WebDAV</h3>' +
        '<div class="legacy-note">坚果云 / Nextcloud 等。读写 {路径}/exh.vault.json。请用应用密码。</div>' +
        '<label>地址</label><input id="exc-cfg-wd-url" type="text" value="' +
        escapeHtml(config.webdav_url || '') +
        '" placeholder="https://dav.jianguoyun.com/dav/">' +
        '<label>用户名</label><input id="exc-cfg-wd-user" type="text" value="' +
        escapeHtml(config.webdav_user || '') +
        '" autocomplete="username">' +
        '<label>应用密码</label><input id="exc-cfg-wd-pass" type="password" value="" placeholder="' +
        (pwdSaved ? '已保存（留空不修改）' : '应用密码') +
        '" autocomplete="new-password">' +
        '<label>远端路径</label><input id="exc-cfg-wd-path" type="text" value="' +
        escapeHtml(config.webdav_path || '/Creamu') +
        '">' +
        '<div class="legacy-row legacy-toggle"><span>启用 WebDAV</span><input type="checkbox" id="exc-cfg-wd-en" ' +
        (config.webdav_enabled ? 'checked' : '') +
        '></div>' +
        '<div class="legacy-row legacy-toggle"><span>打开页面时自动同步 WebDAV</span><input type="checkbox" id="exc-cfg-wd-auto" ' +
        (config.webdav_auto !== false ? 'checked' : '') +
        '></div>' +
        '<label>冲突策略</label><select id="exc-cfg-wd-conflict" class="jlc-wb-select">' +
        '<option value="ask"' +
        (conf === 'ask' ? ' selected' : '') +
        '>询问</option>' +
        '<option value="remote"' +
        (conf === 'remote' ? ' selected' : '') +
        '>云端优先</option>' +
        '<option value="local"' +
        (conf === 'local' ? ' selected' : '') +
        '>本机优先</option>' +
        '</select>' +
        '<div class="legacy-note" id="exc-wd-status">' +
        escapeHtml(syncStatus) +
        '</div>' +
        '<div class="jlc-wb-form-actions">' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-wd-test">测试连接</button>' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-wd-sync">仅同步 WebDAV</button>' +
        '</div>' +
        '<div class="jlc-wb-form-actions">' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-wd-push">强制推送</button>' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-wd-pull">强制拉取</button>' +
        '</div>' +
        '<h3 class="jlc-wb-section-title">LANraragi</h3>' +
        '<div class="legacy-note">' +
        (st.configured
          ? st.last_error
            ? '错误: ' + escapeHtml(st.last_error)
            : '已配置' +
              (st.last_sync
                ? ' · 上次 ' +
                  new Date(st.last_sync).toLocaleString() +
                  (st.last_count ? ' · ' + st.last_count + ' 条' : '')
                : ' · 尚未同步')
          : '未配置 Base URL / API Key') +
        ' · 自动间隔 ' +
        intervalMin +
        ' 分钟</div>' +
        '<label>Base URL</label><input id="exc-cfg-lrr-url" type="text" value="' +
        escapeHtml(config.lrr_base_url || '') +
        '">' +
        '<label>API Key</label><input id="exc-cfg-lrr-key" type="password" value="' +
        escapeHtml(config.lrr_api_key || '') +
        '">' +
        '<label>自动同步间隔（分钟，≥5）</label><input id="exc-cfg-lrr-interval" type="number" min="5" step="5" value="' +
        escapeHtml(String(intervalMin)) +
        '">' +
        '<div class="legacy-row legacy-toggle"><span>结构指纹自动链接</span><input type="checkbox" id="exc-cfg-struct" ' +
        (config.auto_link_structural ? 'checked' : '') +
        '></div>' +
        '<button type="button" class="jlc-wb-btn ghost jlc-wb-block-action" id="exc-cfg-lrr-sync-now">仅同步 LRR</button>' +
        settingsSaveFooter() +
        '</section>';
      bindSyncSettingsHandlers(body);
    } else if (tab === 'pref') {
      const foldMode = ['preference', 'newest', 'list_order'].includes(config.fold_primary_mode)
        ? config.fold_primary_mode
        : 'preference';
      body.innerHTML =
        '<section class="jlc-wb-settings-section is-active">' +
        '<h3>版本偏好</h3>' +
        '<label>语言序</label><input id="exc-cfg-lang" type="text" value="' +
        escapeHtml((config.lang_order || []).join(', ')) +
        '">' +
        '<label>码级序</label><input id="exc-cfg-censor" type="text" value="' +
        escapeHtml((config.censor_order || []).join(', ')) +
        '">' +
        '<label>汉化组白名单</label><input id="exc-cfg-gwhite" type="text" value="' +
        escapeHtml((config.group_whitelist || []).join(', ')) +
        '">' +
        '<label>汉化组黑名单</label><input id="exc-cfg-gblack" type="text" value="' +
        escapeHtml((config.group_blacklist || []).join(', ')) +
        '">' +
        '<div class="legacy-row legacy-toggle"><span>列表折叠同 Work</span><input type="checkbox" id="exc-cfg-fold" ' +
        (config.list_fold_works ? 'checked' : '') +
        '></div>' +
        '<div class="legacy-row legacy-toggle"><span>列表打开画廊用新标签页</span><input type="checkbox" id="exc-cfg-list-newtab" ' +
        (config.list_open_in_new_tab ? 'checked' : '') +
        '></div>' +
        '<div class="legacy-note jlc-wb-intro-note">开启后，列表点作品默认 target=_blank（站点本身是本页打开）。</div>' +
        '<div class="legacy-row legacy-toggle"><span>列表显示重点标签流</span><input type="checkbox" id="exc-cfg-tag-stream" ' +
        (config.list_show_tag_stream !== false ? 'checked' : '') +
        '></div>' +
        '<label>标签流最多条数</label><input id="exc-cfg-tag-stream-max" type="number" min="1" max="8" step="1" value="' +
        escapeHtml(String(Math.max(1, Math.min(8, Number(config.list_tag_stream_max) || 4)))) +
        '">' +
        '<div class="legacy-note jlc-wb-intro-note">标签流只补标题/熟人看不出的信息：无码·全彩·内容(mother…)·角色。画师/组仅熟人徽章；在库用绿框+徽章，不进标签流。</div>' +
        '<label>折叠时主显示版本</label>' +
        '<select id="exc-cfg-fold-mode" class="jlc-wb-select">' +
        '<option value="preference"' +
        (foldMode === 'preference' ? ' selected' : '') +
        '>偏好最佳（语言→码级→体积→汉化组→页数）</option>' +
        '<option value="newest"' +
        (foldMode === 'newest' ? ' selected' : '') +
        '>最新上传</option>' +
        '<option value="list_order"' +
        (foldMode === 'list_order' ? ' selected' : '') +
        '>列表原序（页面里更靠前）</option>' +
        '</select>' +
        '<div class="legacy-note">「偏好最佳」与打开最佳版一致；「最新」看 posted；「列表原序」保留站点排序。</div>' +
        '<div class="legacy-row legacy-toggle"><span>自动聚类</span><input type="checkbox" id="exc-cfg-auto-cluster" ' +
        (config.auto_cluster ? 'checked' : '') +
        '></div>' +
        '<h3 class="jlc-wb-section-title">库内对照容差</h3>' +
        '<div class="legacy-note">页数/体积容差：超容差只标打包差异，不判更优。</div>' +
        '<label>页数容差比例（%）</label><input id="exc-cfg-page-tol-pct" type="number" min="0" max="100" step="1" value="' +
        escapeHtml(String(Math.round((Number(config.pages_tolerance_ratio) || 0.1) * 100))) +
        '">' +
        '<div class="jlc-wb-field-grid">' +
        '<div><label>页数容差最小</label><input id="exc-cfg-page-tol-min" type="number" min="0" step="1" value="' +
        escapeHtml(String(Number(config.pages_tolerance_min) || 1)) +
        '"></div>' +
        '<div><label>页数容差最大</label><input id="exc-cfg-page-tol-max" type="number" min="1" step="1" value="' +
        escapeHtml(String(Number(config.pages_tolerance_max) || 25)) +
        '"></div></div>' +
        '<label>体积容差比例（%）</label><input id="exc-cfg-size-tol-pct" type="number" min="0" max="100" step="1" value="' +
        escapeHtml(String(Math.round((Number(config.size_tolerance_ratio) || 0.12) * 100))) +
        '">' +
        '<label>体积容差最小（MB）</label><input id="exc-cfg-size-tol-mb" type="number" min="0" step="0.5" value="' +
        escapeHtml(String(Math.round(((Number(config.size_tolerance_min_bytes) || 1048576) / (1024 * 1024)) * 10) / 10)) +
        '">' +
        '<label>页均体积容差（%）</label><input id="exc-cfg-bpp-tol-pct" type="number" min="0" max="100" step="1" value="' +
        escapeHtml(String(Math.round((Number(config.bpp_tolerance_ratio) || 0.2) * 100))) +
        '">' +
        settingsSaveFooter() +
        '</section>';
    } else if (tab === 'tags') {
      const radar = typeof getFamiliarRadar === 'function' ? getFamiliarRadar() : { artistList: [], groupList: [] };
      const lrrArtists = (loadLrrMeta().familiar_artists || []).length;
      const lrrGroups = (loadLrrMeta().familiar_groups || []).length;
      body.innerHTML =
        '<section class="jlc-wb-settings-section is-active">' +
        '<h3>心动标签</h3>' +
        '<div class="legacy-note">逗号分隔。中英文都可：「母」「mother」「巨乳」等会扩别名。极简列表若无标签，需标题里出现关键词，或先点开过该本（会缓存标签）。命中后橙框 + ♥。</div>' +
        '<textarea id="exc-cfg-fav-tags" rows="3" placeholder="母, mother, 巨乳, pantyhose">' +
        escapeHtml((config.fav_tags || []).join(', ')) +
        '</textarea>' +
        '<h3 class="jlc-wb-section-title">过滤 / 屏蔽</h3>' +
        '<label>屏蔽标签</label><textarea id="exc-cfg-hate-tags" rows="2">' +
        escapeHtml((config.hate_tags || []).join(', ')) +
        '</textarea>' +
        '<label>标题屏蔽词</label><input id="exc-cfg-title-kw" type="text" value="' +
        escapeHtml((config.block_title_keywords || []).join(', ')) +
        '">' +
        '<div class="legacy-row legacy-toggle"><span>隐藏已屏蔽条目</span><input type="checkbox" id="exc-cfg-hide-block" ' +
        (config.hide_blocked ? 'checked' : '') +
        '></div>' +
        '<h3 class="jlc-wb-section-title">熟人（画师 / 团队）</h3>' +
        '<div class="stat-box">' +
        '<div class="stat-item"><b>' +
        (radar.artistList || []).length +
        '</b><span>画师</span></div>' +
        '<div class="stat-item"><b>' +
        (radar.groupList || []).length +
        '</b><span>团队</span></div>' +
        '<div class="stat-item"><b>' +
        lrrArtists +
        '/' +
        lrrGroups +
        '</b><span>LRR汇总</span></div>' +
        '</div>' +
        '<div class="legacy-note">同步 LRR / 点「刷新熟人」只汇总档案里带 <b>artist:</b> / <b>group:</b> 的标签。名单里没有的名字（如 emori uki）不会点亮——请确认 LRR 该本有 artist 标签，或手动加到手动画师。画师与团队已去重（同名优先算画师）。</div>' +
        '<label>手动画师（补 LRR 没打上的）</label><textarea id="exc-cfg-custom-artists" rows="2" placeholder="emori uki, other artist">' +
        escapeHtml((config.custom_artists || []).join(', ')) +
        '</textarea>' +
        '<label>手动团队/汉化组</label><textarea id="exc-cfg-custom-groups" rows="2" placeholder="group name">' +
        escapeHtml((config.custom_groups || []).join(', ')) +
        '</textarea>' +
        '<button type="button" class="jlc-wb-btn ghost jlc-wb-block-action" id="exc-cfg-rebuild-familiar">从本地 LRR 库刷新熟人</button>' +
        '<div id="exc-fam-preview" class="legacy-note jlc-wb-scroll-note">' +
        '<div class="jlc-wb-note-summary"><b>画师 ' +
        (radar.artistList || []).length +
        '</b> · <b>团队 ' +
        (radar.groupList || []).length +
        '</b> · LRR汇总 ' +
        lrrArtists +
        '/' +
        lrrGroups +
        '</div>' +
        (radar.artistList && radar.artistList.length
          ? '<b>画师</b> ' + escapeHtml(radar.artistList.slice(0, 40).join(' · ')) +
            (radar.artistList.length > 40 ? ' …' : '')
          : '暂无画师') +
        '<br>' +
        (radar.groupList && radar.groupList.length
          ? '<b>团队</b> ' + escapeHtml(radar.groupList.slice(0, 40).join(' · ')) +
            (radar.groupList.length > 40 ? ' …' : '')
          : '暂无团队') +
        '</div>' +
        settingsSaveFooter() +
        '</section>';
      const rebuildBtn = body.querySelector('#exc-cfg-rebuild-familiar');
      if (rebuildBtn) {
        rebuildBtn.onclick = async () => {
          if (typeof rebuildFamiliarFromLrrArchives !== 'function') {
            showToast('熟人模块未加载');
            return;
          }
          showToast('正在汇总…');
          try {
            const fam = await rebuildFamiliarFromLrrArchives();
            saveLrrMeta(
              Object.assign({}, loadLrrMeta(), {
                familiar_artists: fam.artists,
                familiar_groups: fam.groups,
              })
            );
            showToast('熟人 · 画师 ' + fam.artists.length + ' · 团队 ' + fam.groups.length);
            renderSettingsSections('tags');
            if (window.__excRefreshPage) window.__excRefreshPage();
          } catch (e) {
            showToast('刷新失败: ' + ((e && e.message) || e));
          }
        };
      }
    } else if (tab === 'data') {
      body.innerHTML =
        '<section class="jlc-wb-settings-section is-active">' +
        '<h3>备份</h3>' +
        '<div class="legacy-note jlc-wb-intro-note">导出/导入本机追更、配置、作品状态等。WebDAV 请到「同步」页。</div>' +
        '<div class="jlc-wb-form-actions">' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-export">导出到剪贴板</button>' +
        '<button type="button" class="jlc-wb-btn ghost" id="exc-import">从 JSON 导入</button>' +
        '</div>' +
        '</section>';
      const exp = body.querySelector('#exc-export');
      if (exp) {
        exp.onclick = async () => {
          const data = await exportBackup();
          if (typeof GM_setClipboard === 'function') {
            GM_setClipboard(JSON.stringify(data, null, 2));
            showToast('已复制备份 JSON');
          } else showToast('当前环境无法写剪贴板');
        };
      }
      const imp = body.querySelector('#exc-import');
      if (imp) {
        imp.onclick = async () => {
          const textIn = prompt('粘贴备份 JSON');
          if (!textIn) return;
          try {
            await importBackup(JSON.parse(textIn));
            showToast('导入完成');
            renderWorkbench();
          } catch (e) {
            showToast('导入失败');
          }
        };
      }
    } else if (tab === 'ui') {
      body.innerHTML =
        '<section class="jlc-wb-settings-section is-active">' +
        '<h3>外观</h3>' +
        '<div class="legacy-row legacy-toggle"><span>站点奶油主题</span><input type="checkbox" id="exc-cfg-cream-site" ' +
        (config.cream_site_theme ? 'checked' : '') +
        '></div>' +
        '<div class="legacy-note">e/exhentai 页面奶油底色。可随时关。</div>' +
        '<label>详情页缩略图倍率</label>' +
        '<select id="exc-cfg-gdt-scale" class="jlc-wb-select">' +
        [1, 1.25, 1.5, 1.75, 2]
          .map((s) => {
            const cur = clampGalleryThumbScale(config.gallery_thumb_scale);
            const sel = Math.abs(cur - s) < 0.01 ? ' selected' : '';
            const lab =
              s === 1 ? '1.0× 原样' : s === 1.5 ? '1.5× 默认' : s + '×';
            return '<option value="' + s + '"' + sel + '>' + lab + '</option>';
          })
          .join('') +
        '</select>' +
        '<h3 class="jlc-wb-section-title">列表悬停预览</h3>' +
        '<div class="legacy-row legacy-toggle"><span>悬停显示前几张</span><input type="checkbox" id="exc-cfg-hover-preview" ' +
        (config.list_hover_preview !== false ? 'checked' : '') +
        '></div>' +
        '<label>预览张数</label><select id="exc-cfg-hover-count" class="jlc-wb-select">' +
        [3, 4, 5, 6, 8]
          .map((n) => {
            const cur = clampHoverPreviewCount(config.list_hover_preview_count);
            return (
              '<option value="' +
              n +
              '"' +
              (cur === n ? ' selected' : '') +
              '>' +
              n +
              ' 张</option>'
            );
          })
          .join('') +
        '</select>' +
        '<label>悬停延迟</label><select id="exc-cfg-hover-delay" class="jlc-wb-select">' +
        [500, 1000, 2000, 3000, 4000, 5000]
          .map((n) => {
            const cur = clampHoverPreviewDelay(config.list_hover_preview_delay_ms);
            const closest = [500, 1000, 2000, 3000, 4000, 5000].reduce((a, b) =>
              Math.abs(b - cur) < Math.abs(a - cur) ? b : a
            );
            const sec = n >= 1000 ? n / 1000 + ' 秒' : n + ' ms';
            return (
              '<option value="' +
              n +
              '"' +
              (closest === n ? ' selected' : '') +
              '>' +
              sec +
              '</option>'
            );
          })
          .join('') +
        '</select>' +
        '<h3 class="jlc-wb-section-title">追更检查更新</h3>' +
        '<div class="legacy-note">默认只请求每条追更的<strong>首页</strong>（与改跨页扫描前一样快）。断点不在首页时用断点页码估算未读（显示 +N+）。开启「跨页精确未读」才会向后翻页计数，会明显变慢。</div>' +
        '<div class="legacy-row legacy-toggle"><span>跨页精确未读（较慢）</span><input type="checkbox" id="exc-cfg-deep-scan" ' +
        (config.tracking_unread_deep_scan === true ? 'checked' : '') +
        '></div>' +
        '<div class="jlc-wb-field-grid">' +
        '<div><label>条目间隔最小（秒）</label><input id="exc-cfg-chk-lo" type="number" min="2" max="60" step="1" value="' +
        escapeHtml(String(Math.round((Number(config.tracking_check_interval_min_ms) || 5000) / 1000))) +
        '"></div>' +
        '<div><label>条目间隔最大（秒）</label><input id="exc-cfg-chk-hi" type="number" min="2" max="120" step="1" value="' +
        escapeHtml(String(Math.round((Number(config.tracking_check_interval_max_ms) || 10000) / 1000))) +
        '"></div>' +
        '<div><label>精确扫描最多页数</label><input id="exc-cfg-scan-pages" type="number" min="1" max="40" step="1" value="' +
        escapeHtml(String(Math.max(1, Math.min(40, Number(config.tracking_unread_scan_max_pages) || 12)))) +
        '"></div></div>' +
        settingsSaveFooter() +
        '</section>';
      const creamToggle = body.querySelector('#exc-cfg-cream-site');
      if (creamToggle) {
        creamToggle.addEventListener('change', () => {
          config.cream_site_theme = !!creamToggle.checked;
          applyCreamSiteTheme();
        });
      }
      const gdtScaleSel = body.querySelector('#exc-cfg-gdt-scale');
      if (gdtScaleSel) {
        gdtScaleSel.addEventListener('change', () => {
          config.gallery_thumb_scale = clampGalleryThumbScale(gdtScaleSel.value);
          applyGalleryThumbScale();
        });
      }
      const hoverPrev = body.querySelector('#exc-cfg-hover-preview');
      if (hoverPrev) {
        hoverPrev.addEventListener('change', () => {
          config.list_hover_preview = !!hoverPrev.checked;
          if (!config.list_hover_preview && typeof hideHoverPreview === 'function') {
            hideHoverPreview();
          }
        });
      }
    } else {
      body.innerHTML =
        '<section class="jlc-wb-settings-section is-active"><div class="legacy-note">未知设置页</div></section>';
    }

    const saveBtn = body.querySelector('#exc-cfg-save');
    if (saveBtn) {
      saveBtn.onclick = () => {
        const patch = {};
        const v = (id) => body.querySelector('#' + id)?.value || '';
        const c = (id) => !!body.querySelector('#' + id)?.checked;
        if (tab === 'sync') {
          patch.lrr_base_url = v('exc-cfg-lrr-url');
          patch.lrr_api_key = v('exc-cfg-lrr-key');
          patch.auto_link_structural = c('exc-cfg-struct');
          {
            const iv = parseInt(v('exc-cfg-lrr-interval'), 10);
            if (Number.isFinite(iv)) patch.lrr_sync_interval_min = Math.max(5, iv);
          }
          patch.webdav_url = v('exc-cfg-wd-url').trim();
          patch.webdav_user = v('exc-cfg-wd-user').trim();
          patch.webdav_path = v('exc-cfg-wd-path').trim() || '/Creamu';
          patch.webdav_enabled = c('exc-cfg-wd-en');
          patch.webdav_auto = c('exc-cfg-wd-auto');
          patch.webdav_conflict = body.querySelector('#exc-cfg-wd-conflict')?.value || 'ask';
          const typedPass = v('exc-cfg-wd-pass');
          if (typedPass) patch.webdav_password = typedPass;
        } else if (tab === 'tags') {
          if (body.querySelector('#exc-cfg-fav-tags')) {
            patch.fav_tags = splitCsvField(v('exc-cfg-fav-tags'));
          }
          patch.hate_tags = splitCsvField(v('exc-cfg-hate-tags'));
          patch.block_title_keywords = splitCsvField(v('exc-cfg-title-kw'));
          patch.hide_blocked = c('exc-cfg-hide-block');
          patch.custom_artists = splitCsvField(v('exc-cfg-custom-artists'));
          patch.custom_groups = splitCsvField(v('exc-cfg-custom-groups'));
        } else if (tab === 'pref') {
          const lang = splitCsvField(v('exc-cfg-lang'));
          const censor = splitCsvField(v('exc-cfg-censor'));
          if (lang.length) patch.lang_order = lang;
          if (censor.length) patch.censor_order = censor;
          patch.group_whitelist = splitCsvField(v('exc-cfg-gwhite'));
          patch.group_blacklist = splitCsvField(v('exc-cfg-gblack'));
          patch.list_fold_works = c('exc-cfg-fold');
          patch.list_open_in_new_tab = c('exc-cfg-list-newtab');
          patch.list_show_tag_stream = c('exc-cfg-tag-stream');
          {
            const tm = Number(body.querySelector('#exc-cfg-tag-stream-max')?.value);
            if (Number.isFinite(tm) && tm >= 1) {
              patch.list_tag_stream_max = Math.min(8, Math.max(1, Math.floor(tm)));
            }
          }
          {
            const fm = body.querySelector('#exc-cfg-fold-mode')?.value || 'preference';
            patch.fold_primary_mode = ['preference', 'newest', 'list_order'].includes(fm)
              ? fm
              : 'preference';
          }
          patch.auto_cluster = c('exc-cfg-auto-cluster');
          {
            const pagePct = Number(body.querySelector('#exc-cfg-page-tol-pct')?.value);
            if (Number.isFinite(pagePct) && pagePct >= 0) {
              patch.pages_tolerance_ratio = Math.min(1, pagePct / 100);
            }
            const pageMin = Number(body.querySelector('#exc-cfg-page-tol-min')?.value);
            if (Number.isFinite(pageMin) && pageMin >= 0) patch.pages_tolerance_min = Math.floor(pageMin);
            const pageMax = Number(body.querySelector('#exc-cfg-page-tol-max')?.value);
            if (Number.isFinite(pageMax) && pageMax >= 1) {
              patch.pages_tolerance_max = Math.max(patch.pages_tolerance_min || 1, Math.floor(pageMax));
            }
            const sizePct = Number(body.querySelector('#exc-cfg-size-tol-pct')?.value);
            if (Number.isFinite(sizePct) && sizePct >= 0) {
              patch.size_tolerance_ratio = Math.min(1, sizePct / 100);
            }
            const sizeMb = Number(body.querySelector('#exc-cfg-size-tol-mb')?.value);
            if (Number.isFinite(sizeMb) && sizeMb >= 0) {
              patch.size_tolerance_min_bytes = Math.round(sizeMb * 1024 * 1024);
            }
            const bppPct = Number(body.querySelector('#exc-cfg-bpp-tol-pct')?.value);
            if (Number.isFinite(bppPct) && bppPct >= 0) {
              patch.bpp_tolerance_ratio = Math.min(1, bppPct / 100);
            }
          }
        } else if (tab === 'ui') {
          patch.cream_site_theme = c('exc-cfg-cream-site');
          {
            const sc = Number(body.querySelector('#exc-cfg-gdt-scale')?.value);
            if (Number.isFinite(sc)) patch.gallery_thumb_scale = clampGalleryThumbScale(sc);
          }
          if (body.querySelector('#exc-cfg-hover-preview')) {
            patch.list_hover_preview = c('exc-cfg-hover-preview');
            const hc = Number(body.querySelector('#exc-cfg-hover-count')?.value);
            if (Number.isFinite(hc)) patch.list_hover_preview_count = clampHoverPreviewCount(hc);
            const hd = Number(body.querySelector('#exc-cfg-hover-delay')?.value);
            if (Number.isFinite(hd)) patch.list_hover_preview_delay_ms = clampHoverPreviewDelay(hd);
          }
          {
            const loSec = Number(body.querySelector('#exc-cfg-chk-lo')?.value);
            const hiSec = Number(body.querySelector('#exc-cfg-chk-hi')?.value);
            if (Number.isFinite(loSec) && loSec >= 2) {
              patch.tracking_check_interval_min_ms = Math.min(60000, Math.round(loSec * 1000));
            }
            if (Number.isFinite(hiSec) && hiSec >= 2) {
              patch.tracking_check_interval_max_ms = Math.min(120000, Math.round(hiSec * 1000));
            }
            if (
              patch.tracking_check_interval_min_ms &&
              patch.tracking_check_interval_max_ms &&
              patch.tracking_check_interval_max_ms < patch.tracking_check_interval_min_ms
            ) {
              patch.tracking_check_interval_max_ms = patch.tracking_check_interval_min_ms;
            }
            const scanP = Number(body.querySelector('#exc-cfg-scan-pages')?.value);
            if (Number.isFinite(scanP) && scanP >= 1) {
              patch.tracking_unread_scan_max_pages = Math.min(40, Math.max(1, Math.floor(scanP)));
            }
            if (body.querySelector('#exc-cfg-deep-scan')) {
              patch.tracking_unread_deep_scan = !!body.querySelector('#exc-cfg-deep-scan').checked;
            }
          }
        }
        // data 页无表单保存
        if (tab !== 'data') {
          saveConfig(patch);
          showToast('已保存');
          injectBaseStyles();
          applyCreamSiteTheme();
          applyGalleryThumbScale();
        }
      };
    }
  }
