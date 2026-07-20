// @@creamu-part:services
    let showAlert = (msg,close) => {
        let $alert=$(`<div  class="alert-zdy" >${msg}</div>`);
        if(close){
            let $close = $(`<div style="display: inline-block;padding: 0 0 0 10px;color:gray;cursor: pointer;">X</div>`);
            $alert.append($close);
            $close.on("click",()=>$alert.hide());
        }
        $('body').append($alert);
        $alert.show({start:function(){
            $(this).css({'margin-top': -$(this).height() / 2  ,'margin-left': -$(this).width() / 2 });
        }});
        if(!close){$alert.delay(3000).fadeOut()};
    }

    //图片加载时的回调函数
    let imgCallback =  (img)=> {
        if (Status.isHalfImg()) {
            if(img.height < img.width){
                img.style= halfImgCSS ;
            }else{
                img.style= fullImgCSS ;
            }
        }else{
            //大图模式下，对大于标准比例(以ipx的封面为准)的图片进行缩小
            if(img.height/img.width>=0.7){
                img.style= `width:${img.width*67.25/img.height}%;` ;
            }else{
                img.style= fullImgCSS ;
            }
        }
    }

    let Status = {
        halfImg_block:false,//是否屏蔽竖图模式，默认为否
        set : function(key,value){
            const origKey = key;
            if(key=="columnNum") {
                key=key+(this.isHalfImg()?"Half":"Full");
            }else if(key=="waterfallWidth"){
                key=key+"_"+currentWeb;//宽度为各网站独立属性
            }
            const ret = GM_setValue(key, value);
            // 本机专用偏好（如按钮缩放）不标脏、不进 WebDAV
            const localOnly = typeof isStatusPrefLocalOnly === 'function' && isStatusPrefLocalOnly(origKey);
            if (!localOnly) {
                try {
                    if (typeof markStatusPrefsDirty === 'function') markStatusPrefsDirty();
                } catch (_) { /* ignore */ }
            }
            // 过滤摘要即时刷新
            if (origKey === 'hiddenWord' || origKey === 'hiddenAvid') {
                try {
                    if (typeof syncWorkbenchSettingsForm === 'function') syncWorkbenchSettingsForm();
                } catch (_) { /* ignore */ }
            }
            return ret;
        },
        get : function(key){
            return GM_getValue(key=="waterfallWidth"?(key+"_"+currentWeb):key, statusDefault[key]);
        },
        //是否为竖图模式
        isHalfImg: function () {
            return this.get("halfImg") && (!this.halfImg_block);
        },
        //获取列数
        getColumnNum: function () {
            var key= 'columnNum'+(this.isHalfImg()?"Half":"Full");
            return this.get(key);
        }
    };
    //弹窗类，用于展示演员,样品图和磁力
    class Popover{
        show(){
            document.documentElement.classList.add("scrollBarHide");
            this.element.show({duration:0,start:function(){
                var t=$(this).find('#modal-div');
                t.css({'margin-top': Math.max(0, ($(window).height() - t.height()) / 2) });
            }});
        }
        hide(){
            document.documentElement.classList.remove("scrollBarHide");
            this.element.hide();
            this.element.find('.pop-up-tag').hide();
        }
        init(){
            var me=this;
            me.element = $('<div  id="myModal"><div  id="modal-div" > </div></div>');
            me.element.on('click',function(e){
                if($(e.target).closest("#modal-div").length==0){
                    me.hide();
                }
            });
            me.scrollBarWidth = me.getScrollBarWidth();
            GM_addStyle('.scrollBarHide{ padding-right: ' + me.scrollBarWidth + 'px;overflow:hidden;}');
            $('body').append(me.element);
            //加载javbus的图片浏览插件
            if(currentWeb=="javbus"){
                me.element.magnificPopup({
                    delegate: 'a.sample-box-zdy:visible',
                    type: 'image',
                    closeOnContentClick: false,
                    closeBtnInside: false,
                    mainClass: 'mfp-with-zoom mfp-img-mobile',
                    image: {verticalFit: true},
                    gallery: { enabled: true},
                    zoom: {enabled: true,duration: 300,opener: function (element) {return element.find('img');}}
                });
            }
        }
        append(elem){
            if(!this.element){ this.init();}
            this.element.find("#modal-div").append(elem);
            return this;
        }
        //获取滚动条的宽度
        getScrollBarWidth() {
            var el = document.createElement("p");
            var styles = {width: "100px",height: "100px",overflowY: "scroll" };
            for (var i in styles) {
                el.style[i] = styles[i];
            }
            document.body.appendChild(el);
            var scrollBarWidth = el.offsetWidth - el.clientWidth;
            el.remove();
            return scrollBarWidth;
        }
    }

    class SettingMenu {
        constructor() {
            createWorkbenchV3();

            let version = Status.get('version');
            if (version != VERSION) {
                if (!version) {
                    setTimeout(() => openCommanderPanel('tracking'), 120);
                }
                showAlert(NOTICE, true);
                Status.set('version', VERSION);
            }
        }
    }


    const notice = ($menu)=>{
        let version = Status.get("version");
        if(version != VERSION){
            if(!version){
                $menu.slideDown();
            }
            showAlert(NOTICE,true);
            Status.set("version",VERSION);
        }
    }
    function showMagnetTable(itemID,avid,href,elem) {
        if ($(elem).hasClass("span-loading")) {return;}
        let tagName = `${itemID}${AVINFO_SUFFIX}`;
        let $el=$(`.pop-up-tag[name='${tagName}']`);
        if ($el.length > 0) {
            $el.show();myModal.show();
        } else {
            $(elem).addClass("span-loading");
            Promise.resolve().then(()=>{
                switch(currentWeb) {
                    case "javbus": {
                        return getMagnet4JavBus(href,tagName)
                    }
                    case "javdb": {
                        return getMagnet4JavDB(href,tagName,itemID)
                    }
                }
            }).then((dom)=>{
                myModal.append(dom).show();
            }).catch(err=>alert(err)).then(()=>$(elem).removeClass("span-loading"));
        }
    }
    //获取javdb的演员磁力信息
    async function getMagnet4JavDB(href,tagName,itemID) {
        let doc = await fetch(href).then(response => response.text());
        let $doc=$($.parseHTML(doc));
        let info = $(`<div class="pop-up-tag" name="${tagName}"></div>`);
        if(Status.get("avInfo")){
            let actors= $doc.find("div.video-meta-panel .panel-block").toArray().find(el=> $(el).find("a[href^='/actors/']").length>0);
            $(actors).find("a").attr("target","_blank");
            let preview_images= $doc.find(".columns").toArray().find(el=> $(el).find("div.tile-images.preview-images").length>0);
            let $preview_images = $(preview_images);
            $preview_images.find(".preview-video-container").attr("href",`#preview-video-${itemID}`);
            $preview_images.find("#preview-video").attr("id",`preview-video-${itemID}`);
            $preview_images.find("img[data-src]").each((i,el)=> $(el).attr("src",$(el).attr("data-src")));
            info.append(actors);info.append(preview_images);
        }
        let magnetTable = $doc.find(`div.columns[data-controller="movie-tab"]`);
        magnetTable.find("div.top-meta").remove();// 移除广告
        info.append(magnetTable);
        return info;
    };
    // javbus：获取演员磁力信息
    async function getMagnet4JavBus(href, tagName) {
        let {gid,dom} = await avInfofetch(href,tagName);
        //有码和欧美 0  无码 1
        let uc_code = location.pathname.search(/(uncensored|mod=uc)/) < 1 ? 0 : 1;
        let url = `${location.protocol}//${location.hostname}/ajax/uncledatoolsbyajax.php?gid=${gid}&lang=zh&img=&uc=${uc_code}&floor=` + Math.floor(Math.random() * 1e3 + 1);
        let doc = await fetch(url).then(response => response.text());
        let table_html = doc.substring(0, doc.indexOf('<script')).trim();
        let table_tag = $(`<table class="table pop-up-tag" name="${tagName}" style="background-color:#FFFFFF;" ></table>`);
        table_tag.append($(table_html));
        table_tag.find("tr").each(function (i) { // 遍历 tr
            let $a = $(this).find('a');
            if ($a.length) {
               let magent_url = $a[0].href;
               $(this).prepend(creatCopybutton(magent_url));
            }
        });
        dom.push(table_tag);
        return dom;
    };
    //javbus：磁力链接添加复制按钮
    function creatCopybutton(text) {
        let $copyButton = $(`<td><button class="center-block">${lang.copyButton}</button></td>`);
        $copyButton.find("button").click(function () {
            GM_setClipboard(text);
            showAlert(lang.copySuccess);
        });
        return $copyButton;
    }
    //javbus：获取详情页面的 演员表和样品图元素
    async function avInfofetch(href,tagName) {
        let doc = await fetch(href).then(response => response.text())
        let str = /var\s+gid\s+=\s+(\d{1,})/.exec(doc);
        let avInfo = {gid:str[1],dom:[]};
        if(Status.get("avInfo")){
            let sample_waterfall = $($.parseHTML(doc)).find("#sample-waterfall");
            let avatar_waterfall = $($.parseHTML(doc)).find("#avatar-waterfall");
            if(avatar_waterfall.length>0){
                avatar_waterfall[0].id = "";
                avatar_waterfall.addClass("pop-up-tag");
                avatar_waterfall.attr("name",tagName);
                avatar_waterfall.find("a.avatar-box span").each((i,el)=> {
                    let $copySvg = $(`<div style="width:24px;height:24px;display: flex;align-items: center;justify-content: center;">${copy_Svg}</div>`);
                    $copySvg.click(function () {
                        GM_setClipboard($(el).text());
                        showAlert(lang.copySuccess);
                        return false;
                    });
                    $(el).prepend($copySvg);
                });
                avatar_waterfall.find("a.avatar-box").attr("target","_blank").removeClass("avatar-box").addClass("avatar-box-zdy");
                avInfo.dom.push(avatar_waterfall);
            }
            if(sample_waterfall.length>0){
                sample_waterfall[0].id = "";
                sample_waterfall.addClass("pop-up-tag");
                sample_waterfall.attr("name",tagName);
                sample_waterfall.find(".sample-box").removeClass("sample-box").addClass("sample-box-zdy");
                avInfo.dom.push(sample_waterfall);
            }
        }
        return avInfo;
    };

    //弹出视频截图
    function showBigImg(itemID,avid,elem) {
        if ($(elem).hasClass("span-loading")) {return;}
        let tagName = `${itemID}${SCREENSHOT_SUFFIX}`;
        let $selector = $(`.pop-up-tag[name='${tagName}']`);
        if ($selector.length > 0) {
            $selector.show();
            myModal.show();
        } else {
            $(elem).addClass("span-loading");
            getAvImg(avid,tagName).then(($img)=>{
                myModal.append($img).show();
            }).catch(err=>err && showAlert(err)).then(()=>{
                $(elem).removeClass("span-loading");
            });
        }
    }
    const getRequest = (url,params) => {
        return new Promise((resolve, reject)=>{
            GM_xmlhttpRequest(Object.assign({
                method: "GET",
                url: url,
                timeout: 20000,
                onload: (r)=>resolve(r),
                onerror : (r)=> reject(`error`),
                ontimeout : (r)=> reject(`timeout`)
            },params));
        })
    }
    const  downloadImg =  (url,name,elem) => {
        if ($(elem).hasClass("span-loading")) return;
        $(elem).addClass("span-loading");
        new Promise((resolve, reject)=>{
            GM_download({
                url: url,
                name :name,
                headers : {Referer : url},
                onload: (r)=>resolve(r),
                onerror : (error,detail)=> reject(`error 错误`),
                ontimeout : (r)=> reject(`timeout 超时`)
            })})
        .catch(err=>showAlert(err))
        .then(()=>$(elem).removeClass("span-loading"));
    }
    async function fetchScreenshotResourceInfo(avid) {
        const key = normalizeResourceAvid(avid);
        const emptyMessage = lang.getAvImg_none || '未搜索到';
        if (!key) return { entries: [], statuses: [], message: emptyMessage };
        if (resourceScreenshotInfoCache.has(key)) return resourceScreenshotInfoCache.get(key);
        const promise = (async () => {
            const statuses = [];
            const entries = [];
            const pushUniqueNote = (list, value) => {
                const note = String(value || '').trim();
                if (!note || list.includes(note)) return;
                list.push(note);
            };

            const blogKeyword = buildBlogJavSearchKeyword(key) || key;
            const blogSearchUrl = 'https://blogjav.net/?s=' + encodeURIComponent(blogKeyword);
            const blogSearch = await requestPage(blogSearchUrl);
            let blogEntries = blogSearch.ok ? extractBlogJavSearchEntries(blogSearch.responseText, key) : [];
            let blogSourceNote = blogEntries.length ? '站内搜索' : '';
            if (!blogEntries.length) {
                const blogBing = await searchSiteViaBing('blogjav.net', blogKeyword.replace(/\+/g, ' '), '&mkt=zh-TW');
                if (blogBing.links.length) {
                    blogEntries = uniqueResourceEntries(blogBing.links.map(link => ({
                        title: 'BlogJav · ' + stripHtmlTags(link.label || key),
                        href: link.href,
                        provider: 'blogjav',
                        note: 'Bing'
                    })));
                    blogSourceNote = 'Bing';
                } else if (!blogSearch.ok) {
                    blogSourceNote = describeRequestStatus(blogSearch, '站内搜索失败');
                } else if (!blogBing.response.ok) {
                    blogSourceNote = describeRequestStatus(blogBing.response, 'Bing 失败');
                } else {
                    blogSourceNote = '站内搜索未命中';
                }
            }
            const blogResolved = await Promise.all(blogEntries.slice(0, 4).map(async entry => {
                const page = await requestPage(entry.href);
                const src = page.ok ? (extractBlogJavScreenshotCandidates(page.responseText)[0] || '') : '';
                return Object.assign({}, entry, { src: src || undefined, note: entry.note || blogSourceNote });
            }));
            const blogHitCount = blogResolved.filter(entry => entry.src).length;
            const blogState = blogHitCount ? 'ok'
                : blogResolved.length ? 'partial'
                : (blogSearch.status === 403 || blogSearch.status === 503 ? 'blocked' : (blogSearch.status === 404 ? 'empty' : (blogSearch.ok ? 'empty' : 'error')));
            const blogNotes = [];
            pushUniqueNote(blogNotes, blogSourceNote);
            if (blogResolved.length) pushUniqueNote(blogNotes, blogResolved.length + ' 条');
            if (blogHitCount) pushUniqueNote(blogNotes, blogHitCount + ' 图');
            else if (!blogResolved.length && !blogSearch.ok) pushUniqueNote(blogNotes, describeRequestStatus(blogSearch));
            statuses.push({
                label: 'BlogJav',
                state: blogState,
                note: blogNotes.join(' · ') || '未命中',
                href: (blogResolved.find(entry => entry.src) || blogResolved[0] || blogEntries[0] || {}).href || blogSearchUrl
            });
            entries.push(...blogResolved);

            const javStoreSearchUrl = buildJavStoreLookupUrl(key);
            const javStoreSearch = await requestPage(javStoreSearchUrl, { timeout: 12000 });
            let javStoreEntries = javStoreSearch.ok ? extractJavStoreSearchEntries(javStoreSearch.responseText, key).slice(0, 4) : [];
            let javStoreSourceNote = javStoreEntries.length ? '站内搜索' : '';
            let javStoreStatusResponse = javStoreSearch;
            if (!javStoreEntries.length) {
                const javStoreBing = await searchSiteViaBing('javstore.net', key, '&mkt=ja-JP');
                if (javStoreBing.links.length) {
                    javStoreEntries = uniqueResourceEntries(javStoreBing.links.slice(0, 4).map(link => ({
                        title: 'JavStore · ' + stripHtmlTags(link.label || key),
                        href: link.href,
                        provider: 'javstore',
                        note: 'Bing'
                    })));
                    javStoreSourceNote = 'Bing';
                    javStoreStatusResponse = javStoreBing.response;
                } else if (!javStoreSearch.ok) {
                    javStoreSourceNote = describeRequestStatus(javStoreSearch, '站内搜索失败');
                } else if (!javStoreBing.response.ok) {
                    javStoreSourceNote = describeRequestStatus(javStoreBing.response, 'Bing 失败');
                    javStoreStatusResponse = javStoreBing.response;
                } else {
                    javStoreSourceNote = '站内搜索未命中';
                }
            }
            const javStoreResolved = uniqueResourceEntries((await Promise.all(javStoreEntries.slice(0, 4).map(async entry => {
                const page = await requestPage(entry.href, { timeout: 12000 });
                const screenshots = page.ok ? extractJavStoreScreenshotCandidates(page.responseText, key).slice(0, 10) : [];
                if (!screenshots.length) {
                    return [Object.assign({}, entry, { src: undefined, note: entry.note || javStoreSourceNote })];
                }
                return screenshots.map((src, index) => Object.assign({}, entry, {
                    title: screenshots.length > 1 ? (entry.title + ' · 图' + (index + 1)) : entry.title,
                    href: src,
                    src,
                    note: entry.note || javStoreSourceNote
                }));
            }))).flat());
            const javStoreHitCount = javStoreResolved.filter(entry => entry.src).length;
            const javStoreState = javStoreHitCount ? 'ok'
                : javStoreResolved.length ? 'partial'
                : (javStoreStatusResponse.status === 403 || javStoreStatusResponse.status === 503 ? 'blocked' : (javStoreStatusResponse.status === 404 ? 'empty' : (javStoreStatusResponse.ok ? 'empty' : 'error')));
            const javStoreNotes = [];
            pushUniqueNote(javStoreNotes, javStoreSourceNote);
            if (javStoreEntries.length) pushUniqueNote(javStoreNotes, javStoreEntries.length + ' 页');
            if (javStoreHitCount) pushUniqueNote(javStoreNotes, javStoreHitCount + ' 图');
            else if (!javStoreEntries.length && !javStoreStatusResponse.ok) pushUniqueNote(javStoreNotes, describeRequestStatus(javStoreStatusResponse));
            statuses.push({
                label: 'JavStore',
                state: javStoreState,
                note: javStoreNotes.join(' · ') || '未命中',
                href: (javStoreEntries[0] || {}).href || javStoreSearchUrl
            });
            entries.push(...javStoreResolved);

            const uniqueEntries = uniqueResourceEntries(entries).slice(0, 12);
            return {
                entries: uniqueEntries,
                statuses,
                message: uniqueEntries.length ? '' : emptyMessage
            };
        })().catch(error => {
            console.warn('[JLC] 截图 provider 解析失败', error);
            resourceScreenshotInfoCache.delete(key);
            return {
                entries: [],
                statuses: [
                    { label: 'BlogJav', state: 'error', note: '解析异常', href: 'https://blogjav.net/' },
                    { label: 'JavStore', state: 'error', note: '解析异常', href: buildJavStoreLookupUrl(key) || 'https://javstore.net/' }
                ],
                message: emptyMessage
            };
        });
        resourceScreenshotInfoCache.set(key, promise);
        return promise;
    }

        async function seedScreenshotEntries(entries, limit = 4) {
        const list = (Array.isArray(entries) ? entries : []).map(item => Object.assign({}, item));
        const max = Math.min(limit, list.length);
        for (let i = 0; i < max; i += 1) {
            if (list[i].src) continue;
            list[i].src = await ScreenshotPanel.getScreenshotUrl(list[i].href, list[i].provider);
            if (!list[i].src) list[i].src = null;
        }
        return list;
    }

    /**根据番号获取截图资源，优先 BlogJav，失败再回退 JavStore*/
    async function getAvImg(avid,tagName) {
        const info = await fetchScreenshotResourceInfo(avid);
        if (!info?.entries?.length) {
            return Promise.reject(info?.message || lang.getAvImg_none);
        }
        let resultList = await seedScreenshotEntries(info.entries, 4);
        const indexTo = resultList.findIndex(item => !!item.src);
        if (indexTo === -1) {
            return Promise.reject(info?.message || lang.getAvImg_none);
        }
        if (indexTo > 0) {
            resultList = [resultList[indexTo], ...resultList.slice(0, indexTo), ...resultList.slice(indexTo + 1)];
        }
        const $img = new ScreenshotPanel(tagName, resultList, avid);
        $img.data('jlcScreenshotInfo', info);
        return $img;
    };
    class ScreenshotPanel{
        constructor(tagName,resultList,avid){
            let me = this;
            let liHtml = resultList.map((v,i) => {
                if(i===0){
                    return '<li class="imgResult-li imgResult-Current" index="' + i + '">' + escapeHtml(v.title || ('截图 ' + (i + 1))) + '</li>';
                }
                return '<li class="imgResult-li" index="' + i + '">' + escapeHtml(v.title || ('截图 ' + (i + 1))) + '</li>';
            }).join('');
            let imgsHtml = resultList.map((v,i)=> {
                if(i===0){
                    return '<img index="' + i + '" src="' + escapeHtml(v.src || '') + '" name="screenshot" style="width:100%" />';
                }
                return '<img index="' + i + '" name="screenshot" style="display:none;width:100%" />';
            }).join('');
            let $panel = $('<div name="' + tagName + '" class="pop-up-tag" style="min-height:' + $(window).height() + 'px;"><ul>' + liHtml + '</ul><span class="download-icon" >' + download_Svg + '</span>' + imgsHtml + '</div>');
            $panel.find('li.imgResult-li').click(async function(){
                if ($(this).hasClass('imgResult-loading')) {return;}
                let index_to = Number($(this).attr('index'));
                let index_from = Number($panel.find('img:visible').attr('index'));
                if( index_to !== index_from){
                    $panel.find('li.imgResult-li.imgResult-Current').removeClass('imgResult-Current');
                    $(this).addClass('imgResult-loading').addClass('imgResult-Current');
                    $panel.find('img').hide();
                    let $img_to = $panel.find('img[index=' + index_to + ']');
                    $img_to.show();
                    try {
                        let data = resultList[index_to];
                        if(!data.src){
                            if(data.src === undefined){
                                let src = await me.constructor.getScreenshotUrl(data.href, data.provider);
                                data.src = src || null;
                                if(src === null){
                                    throw lang.getAvImg_none;
                                }
                                $img_to.attr('src',src);
                            }else if(data.src === null){
                                throw lang.getAvImg_none;
                            }
                        }
                    } catch (error) {
                        showAlert(error);
                    }finally{
                        $(this).removeClass('imgResult-loading');
                    }
                }
            });
            $panel.find('span.download-icon').click(function(){
                let url = $panel.find('img:visible').attr('src');
                let name = (avid || 'screenshot') + '.jpg';
                downloadImg(url,name,this);
            });
            return $panel;
        }
        static normalizeScreenshotUrl(url){
            return normalizePreviewImageUrl(url);
        }
        static isDirectImageUrl(url) {
            const value = String(url || '').trim();
            return !!value && (/\.(?:jpe?g|png|webp)(?:$|[?#])/i.test(value) || /(pixhost|imagetwist)/i.test(value));
        }
        static extractBlogJavScreenshotUrlFromHtml(responseText){
            return extractBlogJavScreenshotCandidates(responseText)[0] || null;
        }
        static extractJavStoreScreenshotUrlFromHtml(responseText){
            return extractJavStoreScreenshotCandidates(responseText)[0] || null;
        }
        static extractScreenshotUrlFromHtml(responseText, provider){
            if (provider === 'javstore') return this.extractJavStoreScreenshotUrlFromHtml(responseText);
            if (provider === 'blogjav') return this.extractBlogJavScreenshotUrlFromHtml(responseText);
            return this.extractBlogJavScreenshotUrlFromHtml(responseText) || this.extractJavStoreScreenshotUrlFromHtml(responseText);
        }
        static async getScreenshotUrl(imgUrl, provider = 'blogjav'){
            if (!imgUrl) return null;
            if (this.isDirectImageUrl(imgUrl)) {
                return this.normalizeScreenshotUrl(imgUrl);
            }
            const result = await getRequest(imgUrl);
            if (!result || result.status < 200 || result.status >= 400) {
                return null;
            }
            let src = this.extractScreenshotUrlFromHtml(result.responseText, provider);
            if (!src) {
                return null;
            }
            return this.normalizeScreenshotUrl(src);
        }
    }
    function extractTextContent(value) {
        if (!value) return '';
        if (typeof value === 'string') return value;
        if (value.jquery && typeof value.text === 'function') return value.text();
        if (typeof value.textContent === 'string') return value.textContent;
        return String(value || '');
    }

    function compactText(value) {
        return extractTextContent(value).replace(/\s+/g, ' ').trim();
    }

    function getSiteLabel(site = currentWeb) {
        const map = {
            javlibrary: 'JavLibrary',
            javbus: 'JavBus',
            javdb: 'JavDB'
        };
        return map[String(site || '').toLowerCase()] || 'JLC';
    }

    function copyPlainText(text) {
        const value = compactText(text);
        if (!value) return false;
        GM_setClipboard(value);
        showAlert(lang.copySuccess);
        return true;
    }

    const DETAIL_COPY_FIELD_LABELS = Object.freeze({
        avid: ['识别码', '識別碼', '番号', '番號', 'id'],
        director: ['导演', '導演', '監督', 'director'],
        maker: ['制作商', '製作商', '制作', '製作', 'メーカー', 'maker', 'studio', '片商'],
        label: ['发行商', '發行商', 'レーベル', 'label', '厂牌', '廠牌'],
        cast: ['演员', '演員', '出演', '女优', '女優', 'actor', 'cast']
    });
    const DETAIL_COPY_FIELD_ORDER = ['avid', 'director', 'maker', 'label', 'cast'];
    const DETAIL_COPY_FIELD_IDS = Object.freeze({
        javlibrary: {
            avid: 'video_id',
            director: 'video_director',
            maker: 'video_maker',
            label: 'video_label',
            cast: 'video_cast'
        }
    });

    function escapeRegExpText(value) {
        return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function normalizeDetailLabelText(value) {
        return compactText(value).replace(/[：:]/g, '').replace(/\s+/g, '').toLowerCase();
    }

    function matchesDetailFieldLabel(value, aliases = []) {
        const normalized = normalizeDetailLabelText(value);
        if (!normalized) return false;
        return aliases.some(alias => normalized.includes(normalizeDetailLabelText(alias)));
    }

    function collectDetailFieldBlocks(context) {
        if (!context) return [];
        if (context.site === 'javlibrary') {
            return Array.from(document.querySelectorAll('#video_info tr, #video_details tr'));
        }
        if (context.site === 'javbus') {
            return Array.from(document.querySelectorAll('.col-md-3.info p, .col-md-3.info li, .info p'));
        }
        if (context.site === 'javdb') {
            return Array.from(document.querySelectorAll('.video-meta-panel .panel-block, .movie-panel-info .panel-block'));
        }
        return [];
    }

    function getDetailFieldLabelNode(block) {
        if (!block) return null;
        if (block.matches?.('tr')) return block.querySelector('td, th');
        return block.querySelector('.header, strong, b, .title, .name, .label') || block.firstElementChild || block;
    }

    function getDetailFieldValueNode(block) {
        if (!block) return null;
        if (block.matches?.('tr')) {
            const cells = Array.from(block.querySelectorAll('td, th'));
            return cells.find(cell => cell.classList?.contains('text'))
                || cells.find(cell => !cell.classList?.contains('header') && !cell.classList?.contains('icon'))
                || cells[cells.length - 1]
                || block;
        }
        const explicit = block.querySelector('.value, td.text, .text');
        if (explicit) return explicit;
        const children = Array.from(block.children || []).filter(node => !/^(STRONG|B)$/i.test(node.tagName || ''));
        return children.find(node => !node.classList?.contains('header') && !node.classList?.contains('icon'))
            || children[children.length - 1]
            || block;
    }

    function stripDetailFieldLabel(text, aliases = []) {
        const raw = compactText(text);
        if (!raw) return '';
        for (const alias of aliases) {
            const pattern = new RegExp('^' + escapeRegExpText(alias) + '\\s*[:：]?\\s*', 'i');
            if (pattern.test(raw)) {
                return compactText(raw.replace(pattern, ''));
            }
        }
        const dividerIndex = raw.search(/[：:]/);
        return dividerIndex >= 0 ? compactText(raw.slice(dividerIndex + 1)) : raw;
    }

    function extractDetailFieldText(block, aliases = [], preferredValueNode = null) {
        const root = preferredValueNode || getDetailFieldValueNode(block) || block;
        const clipboardText = root?.getAttribute?.('data-clipboard-text') || block?.getAttribute?.('data-clipboard-text');
        if (clipboardText) return compactText(clipboardText);
        const anchorTexts = Array.from(root?.querySelectorAll?.('a') || [])
            .map(node => compactText(node))
            .filter(Boolean);
        if (anchorTexts.length) return anchorTexts.join(' / ');
        return stripDetailFieldLabel(root?.textContent || block?.textContent || '', aliases);
    }

    function resolveDetailFieldTarget(context, fieldKey) {
        if (!context) return null;
        const aliases = DETAIL_COPY_FIELD_LABELS[fieldKey] || [];
        const directFieldId = DETAIL_COPY_FIELD_IDS[context.site]?.[fieldKey];
        if (directFieldId) {
            const fieldRoot = document.getElementById(directFieldId);
            if (fieldRoot) {
                const row = fieldRoot.querySelector('tr') || fieldRoot.closest('tr');
                const valueNode = getDetailFieldValueNode(row || fieldRoot);
                let text = extractDetailFieldText(row || fieldRoot, aliases, valueNode || undefined);
                if (fieldKey === 'avid') text = normalizeResourceAvid(text);
                if (text) return { host: valueNode || row || fieldRoot, text };
            }
        }

        const blocks = collectDetailFieldBlocks(context);
        for (const block of blocks) {
            const labelNode = getDetailFieldLabelNode(block);
            const labelText = compactText(labelNode || block);
            if (!matchesDetailFieldLabel(labelText, aliases)) continue;
            const valueNode = getDetailFieldValueNode(block);
            let text = extractDetailFieldText(block, aliases, valueNode || undefined);
            if (fieldKey === 'avid') text = normalizeResourceAvid(text);
            if (text) return { host: valueNode || block, text };
        }
        return null;
    }

    function resolveDetailTitleTarget(context) {
        if (!context?.title) return null;
        let host = null;
        if (context.site === 'javlibrary') {
            host = document.querySelector('#video_title h3') || document.querySelector('#video_title');
        } else if (context.site === 'javbus') {
            host = document.querySelector('.container h3') || document.querySelector('h3');
        } else if (context.site === 'javdb') {
            host = document.querySelector('.title.is-4') || document.querySelector('h2.title') || document.querySelector('h2');
        }
        return host ? { host, text: context.title } : null;
    }

    function ensureInlineDetailCopyButton(host, fieldKey, text) {
        if (host instanceof HTMLAnchorElement && host.parentElement) host = host.parentElement;
        if (!(host instanceof HTMLElement) || !fieldKey || !text) return;
        let button = Array.from(host.children || []).find(node => node.classList?.contains('jlc-detail-copy-btn') && node.dataset.jlcCopyKey === fieldKey) || null;
        if (!button) {
            button = document.createElement('button');
            button.type = 'button';
            button.className = 'jlc-detail-copy-btn';
            button.dataset.jlcCopyKey = fieldKey;
            button.innerHTML = copy_Svg;
            button.title = lang.copyButton;
            button.setAttribute('aria-label', lang.copyButton);
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                copyPlainText(button.dataset.jlcCopyText || '');
                return false;
            });
            host.appendChild(button);
        }
        button.dataset.jlcCopyText = text;
    }

    function removeDetailPageCopyButtons() {
        document.querySelectorAll('.jlc-detail-copy-btn').forEach(button => button.remove());
    }

    function ensureDetailPageCopyButtons(context = getCurrentDetailContext()) {
        if (!context || !Status.get('copyBtn')) {
            removeDetailPageCopyButtons();
            return;
        }
        const titleTarget = resolveDetailTitleTarget(context);
        if (titleTarget?.host && titleTarget.text) {
            ensureInlineDetailCopyButton(titleTarget.host, 'title', titleTarget.text);
        }
        DETAIL_COPY_FIELD_ORDER.forEach(fieldKey => {
            const target = resolveDetailFieldTarget(context, fieldKey);
            if (target?.host && target.text) {
                ensureInlineDetailCopyButton(target.host, fieldKey, target.text);
            }
        });
    }


    const TRACKING_GROUP_LABELS = {
        actor: '演员',
        director: '导演',
        maker: '制作',
        studio: '片商',
        series: '系列',
        tag: '标签',
        keyword: '关键词',
        custom: '自定义'
    };
    const TRACKING_GROUP_ORDER = ['actor', 'director', 'maker', 'studio', 'series', 'tag', 'keyword', 'custom'];

    function getTrackingUiState() {
        const saved = GM_getValue(TRACKING_UI_STATE_KEY);
        if (saved && typeof saved === 'object') {
            if (!saved.collapsed || typeof saved.collapsed !== 'object') saved.collapsed = {};
            if (saved.refresh_resume && typeof saved.refresh_resume !== 'object') saved.refresh_resume = null;
            if (!Object.prototype.hasOwnProperty.call(saved, 'refresh_resume')) saved.refresh_resume = null;
            return saved;
        }
        return { collapsed: {}, refresh_resume: null };
    }

    function getTrackingRefreshResumeState() {
        const state = getTrackingUiState();
        return state.refresh_resume && typeof state.refresh_resume === 'object' ? state.refresh_resume : null;
    }

    function setTrackingRefreshResumeState(resumeState) {
        const state = getTrackingUiState();
        state.refresh_resume = resumeState && typeof resumeState === 'object' ? resumeState : null;
        GM_setValue(TRACKING_UI_STATE_KEY, state);
    }

    function clearTrackingRefreshResumeState() {
        setTrackingRefreshResumeState(null);
    }

    function getTrackingRefreshRuntimeState() {
        return trackingRefreshRuntimeState && trackingRefreshRuntimeState.active ? trackingRefreshRuntimeState : null;
    }

    function setTrackingRefreshRuntimeState(nextState = null) {
        if (!nextState || nextState.active === false) {
            trackingRefreshRuntimeState = null;
            return null;
        }
        trackingRefreshRuntimeState = Object.assign({}, trackingRefreshRuntimeState || {}, nextState, {
            active: true,
            updated_at: new Date().toISOString()
        });
        return trackingRefreshRuntimeState;
    }

    function buildTrackingRefreshRuntimeSummary(state) {
        if (!state?.active) return '';
        const completed = Number(state.completed || 0) || 0;
        const total = Number(state.total || 0) || 0;
        if (state.phase === 'cooldown') {
            const remainSeconds = Math.max(0, Math.ceil((Number(state.remainingMs || 0) || 0) / 1000));
            const note = compactText(state.note || '') ? (' · ' + compactText(state.note || '')) : '';
            return '批量刷新冷却中 ' + remainSeconds + 's · ' + completed + '/' + total + note;
        }
        const currentIndex = total > 0 ? Math.min(total, completed + (state.phase === 'refreshing' ? 1 : 0)) : completed;
        const note = compactText(state.note || '') ? (' · ' + compactText(state.note || '')) : '';
        return '批量刷新中 ' + currentIndex + '/' + total + note;
    }

    function buildTrackingRefreshRuntimeButtonText(state) {
        if (!state?.active) return '刷新全部';
        if (state.phase === 'cooldown') {
            return '冷却中 ' + Math.max(0, Math.ceil((Number(state.remainingMs || 0) || 0) / 1000)) + 's';
        }
        const completed = Number(state.completed || 0) || 0;
        const total = Number(state.total || 0) || 0;
        return '刷新中 ' + Math.min(total || completed, completed + 1) + '/' + total;
    }

    async function waitTrackingRefreshCountdown(waitMs, onTick = null) {
        let remainingMs = Math.max(0, Number(waitMs || 0) || 0);
        if (!(remainingMs > 0)) {
            if (typeof onTick === 'function') onTick(0);
            return;
        }
        while (remainingMs > 0) {
            if (typeof onTick === 'function') onTick(remainingMs);
            const stepMs = Math.min(1000, remainingMs);
            await delayMs(stepMs);
            remainingMs = Math.max(0, remainingMs - stepMs);
        }
        if (typeof onTick === 'function') onTick(0);
    }

    function setTrackingGroupCollapsed(groupKey, collapsed) {
        const state = getTrackingUiState();
        state.collapsed = state.collapsed || {};
        state.collapsed[groupKey] = !!collapsed;
        GM_setValue(TRACKING_UI_STATE_KEY, state);
    }

    function getTrackingGroupLabel(groupType) {
        return TRACKING_GROUP_LABELS[String(groupType || '').toLowerCase()] || '其他';
    }

    function normalizeTrackingGroupType(groupType) {
        const key = String(groupType || '').toLowerCase();
        return Object.prototype.hasOwnProperty.call(TRACKING_GROUP_LABELS, key) ? key : '';
    }

    function inferTrackingGroupType(site, url, fallbackType = 'custom') {
        const fallback = normalizeTrackingGroupType(fallbackType) || 'custom';
        const parsed = parseTrackingUrl(url || '');
        if (!parsed) return fallback;
        const lowerSite = String(site || '').toLowerCase();
        const lowerPath = String(parsed.pathname || '').toLowerCase();
        const combined = lowerPath + String(parsed.search || '');
        if (lowerSite === 'javlibrary') {
            if (/director/i.test(combined)) return 'director';
            if (/maker/i.test(combined)) return 'maker';
            if (/label|studio/i.test(combined)) return 'studio';
            if (/series/i.test(combined)) return 'series';
            if (/tag|genre/i.test(combined)) return 'tag';
            if (/star|actress|actor/i.test(combined)) return 'actor';
            return fallback;
        }
        if (lowerSite === 'javbus' || lowerSite === 'avmoo') {
            if (/\/director\//i.test(lowerPath)) return 'director';
            if (/\/maker\//i.test(lowerPath)) return 'maker';
            if (/\/studio\//i.test(lowerPath)) return 'studio';
            if (/\/series\//i.test(lowerPath)) return 'series';
            if (/\/(?:genre|genres)\//i.test(lowerPath)) return 'tag';
            if (/\/star\//i.test(lowerPath)) return 'actor';
            return fallback;
        }
        if (lowerSite === 'javdb') {
            if (/\/directors?\//i.test(lowerPath)) return 'director';
            if (/\/makers?\//i.test(lowerPath)) return 'maker';
            if (/\/(?:studios?|publishers?|labels?)\//i.test(lowerPath)) return 'studio';
            if (/\/series\//i.test(lowerPath)) return 'series';
            if (/\/(?:tags?|categories)\//i.test(lowerPath)) return 'tag';
            if (/\/actors?\//i.test(lowerPath)) return 'actor';
            return fallback;
        }
        return fallback;
    }

    function getTrackingEffectiveGroupType(record = null) {
        const explicit = normalizeTrackingGroupType(record?.group_type || '');
        if (explicit && explicit !== 'series' && explicit !== 'custom') return explicit;
        const inferred = inferTrackingGroupType(record?.site, record?.page_url || record?.open_url || '', explicit || record?.page_type || 'custom');
        return normalizeTrackingGroupType(inferred || explicit || 'custom') || 'custom';
    }

    function delayMs(ms) {
        return new Promise(resolve => window.setTimeout(resolve, ms));
    }

    function parseTrackingUrl(url, fallback) {
        try {
            return new URL(url, fallback || location.href);
        } catch (error) {
            try {
                return new URL(String(url || ''), 'https://www.javlibrary.com/');
            } catch (innerError) {
                return null;
            }
        }
    }

    function buildTrackingCanonicalUrl(url = location.href) {
        const parsed = parseTrackingUrl(url);
        if (!parsed) return String(url || '');
        parsed.hash = '';
        ['page', 'p', 'offset'].forEach(key => parsed.searchParams.delete(key));
        if (/javlibrary\./i.test(String(parsed.hostname || '')) && /\/vl_searchby(?:title|combo)\.php$/i.test(String(parsed.pathname || '').toLowerCase())) {
            const keyword = compactText(parsed.searchParams.get('keyword') || parsed.searchParams.get('q') || parsed.searchParams.get('search') || '');
            const lowerPath = String(parsed.pathname || '').toLowerCase();
            if (/\/vl_searchbycombo\.php$/i.test(lowerPath) || keyword) {
                parsed.searchParams.delete('searchid');
            }
        }
        if (/\/(?:search|star|actor|actors|actress|series|genre|genres|tag|tags|studio|studios|maker|makers|director|directors|label|labels|publisher|publishers)\/[^/?]+\/\d+\/?$/i.test(parsed.pathname)) {
            parsed.pathname = parsed.pathname.replace(/\/\d+\/?$/, '');
        }
        parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/');
        return parsed.toString().replace(/\/$/, '');
    }

    function decodeTrackingSegment(value) {
        if (value == null) return '';
        try {
            return decodeURIComponent(String(value)).trim();
        } catch (error) {
            return String(value || '').trim();
        }
    }

    function normalizeTrackingQueryLabel(value) {
        let text = compactText(decodeTrackingSegment(value || ''));
        if (!text) return '';
        text = text
            .replace(/^(?:search\s*result(?:s)?(?:\s*of)?|search|results?\s*for|搜索结果|搜尋結果|标题搜索|標題搜索|title\s*search|组合搜索|組合搜索|combo\s*search)[:：\s-]*/i, '')
            .replace(/^["'“”‘’【】\[\]『』]+|["'“”‘’【】\[\]『』]+$/g, '')
            .trim();
        return text;
    }

    function isTrackingSiteGenericLabel(value) {
        const text = normalizeTrackingQueryLabel(value || '').toLowerCase();
        if (!text) return false;
        return /^(?:javlibrary|jav\s*library|javbus|javdb|avmoo|missav|emby|metatube)$/.test(text);
    }

    function isTrackingGenericSearchLabel(value) {
        const text = normalizeTrackingQueryLabel(value || '').toLowerCase();
        if (!text) return false;
        return isTrackingSiteGenericLabel(text)
            || /^(?:search\s*result(?:s)?|results?\s*for|标题搜(?:索|尋|寻)结果|標題搜(?:索|尋|寻)結果|标题搜(?:索|尋|寻)|標題搜(?:索|尋|寻)|title\s*search(?:\s*result(?:s)?)?|组合搜(?:索|尋|寻)结果|組合搜(?:索|尋|寻)結果|组合搜(?:索|尋|寻)|組合搜(?:索|尋|寻)|combo\s*search(?:\s*result(?:s)?)?)$/i.test(text);
    }

    /** 工作台/设置等脚本 UI 文案，禁止当追更标题或关键词 */
    function isTrackingUiChromeLabel(value) {
        const text = compactText(value || '');
        if (!text) return true;
        const bare = text
            .replace(/^(?:javlibrary|jav\s*library|javbus|javdb|jlc)\s*[·•|\-—–]\s*/i, '')
            .trim();
        if (!bare) return true;
        return /^(?:资源增强|详情页资源增强|系统连接|熟人与资料库|数据与界面|指挥官|工作台|Creamu|Creamu\s*·\s*JavLibrary|设置|追更|视图|资源|连接|熟人|数据|加载中|保存并应用|立即同步|重新读取|仅导入配置|完整导入|导出配置|完整导出)$/i.test(bare)
            || /资源增强|详情页资源增强|系统连接|熟人与资料库|数据与界面/.test(text);
    }

    function isScriptUiNode(node) {
        if (!node || typeof node.closest !== 'function') return false;
        return !!node.closest([
            '#jlc-wb',
            '#jlc-wb-fab',
            '#jlc-wb-dialog',
            '#jlc-panel',
            '#jlc-tracking-pagebar',
            '#jlc-toast',
            '#jlc-alert',
            '.jlc-resource-center',
            '.jlc-resource-root',
            '[id^="jlc-"]'
        ].join(','));
    }

    /** 仅当新标签非 UI 污染、且旧值空/污染/明显更弱时才采纳 */
    function shouldAdoptTrackingLabel(nextValue, prevValue) {
        const next = compactText(nextValue || '');
        const prev = compactText(prevValue || '');
        if (!next || isTrackingUiChromeLabel(next)) return false;
        if (!prev || isTrackingUiChromeLabel(prev)) return true;
        if (isTrackingGenericSearchLabel(next) && !isTrackingGenericSearchLabel(prev)) return false;
        if (next === prev) return false;
        return true;
    }

    function buildTrackingSearchFallbackLabel(label, parsed) {
        const searchId = compactText(parsed?.searchParams?.get('searchid') || '');
        const page = Number(parsed?.searchParams?.get('page') || parsed?.searchParams?.get('p') || 0) || 0;
        let text = String(label || '搜索');
        if (searchId) text += ' #' + searchId;
        if (page > 1) text += ' · 第' + page + '页';
        return text;
    }

    function extractTrackingSearchKeyword(doc = document, parsed, heading = '') {
        const candidates = [];
        const pushCandidate = (value) => {
            const text = normalizeTrackingQueryLabel(value || '');
            if (!text || isTrackingGenericSearchLabel(text) || isTrackingSiteGenericLabel(text) || isTrackingUiChromeLabel(text)) return;
            if (!candidates.includes(text)) candidates.push(text);
        };
        pushCandidate(parsed?.searchParams?.get('keyword'));
        pushCandidate(parsed?.searchParams?.get('q'));
        pushCandidate(parsed?.searchParams?.get('search'));
        [
            'input[name="keyword"]',
            'input[name="q"]',
            'input[name="search"]',
            'input[type="search"]',
            'form[action*="search"] input[type="text"]',
            'form[action*="search"] input[type="search"]',
            'form[action*="vl_searchbytitle"] input[type="text"]',
            'form[action*="vl_searchbytitle"] input[type="search"]',
            '#search input[type="text"]',
            '#search input[type="search"]',
            '.search input[type="text"]',
            '.search input[type="search"]'
        ].forEach(selector => {
            doc.querySelectorAll(selector).forEach(node => {
                pushCandidate(node?.value || node?.getAttribute?.('value') || node?.textContent || '');
            });
        });
        const titleText = compactText(doc?.title || '');
        const titleMatches = [
            titleText.match(/[“"「『](.+?)[”"」』]/),
            titleText.match(/(?:search\s*(?:result(?:s)?\s*(?:of|for)?|for)|标题搜(?:索|尋|寻)结果|標題搜(?:索|尋|寻)結果|title\s*search)[:：\s-]*(.+?)\s*(?:[-|｜]\s*JAVLibrary.*)?$/i),
            titleText.match(/^(.+?)\s*(?:[-|｜]\s*JAVLibrary.*)$/i)
        ];
        titleMatches.forEach(match => pushCandidate(match?.[1] || ''));
        pushCandidate(heading);
        return candidates[0] || '';
    }

    function detectTrackingSearchMode(site, parsed) {
        if (String(site || '').toLowerCase() !== 'javlibrary') return 'forward';
        const lowerPath = String(parsed?.pathname || '').toLowerCase();
        if (/\/vl_searchbytitle\.php$/i.test(lowerPath)) return 'backfill';
        if (/\/vl_searchbycombo\.php$/i.test(lowerPath)) return 'forward';
        return 'forward';
    }

    function resolveTrackingSearchMode(recordOrSite, parsed) {
        const site = typeof recordOrSite === 'string' ? recordOrSite : recordOrSite?.site;
        const explicit = typeof recordOrSite === 'string' ? '' : String(recordOrSite?.search_mode || '').toLowerCase();
        if (explicit === 'backfill' || explicit === 'forward') return explicit;
        return detectTrackingSearchMode(site, parsed);
    }

    function buildTrackingOpenUrl(site, parsed, descriptor = {}) {
        const target = parseTrackingUrl(parsed?.href || parsed || location.href);
        if (!target) return buildTrackingCanonicalUrl(parsed?.href || parsed || location.href);
        target.hash = '';
        const lowerSite = String(site || '').toLowerCase();
        const lowerPath = String(target.pathname || '').toLowerCase();
        ['page', 'p', 'offset'].forEach(key => target.searchParams.delete(key));
        if (lowerSite === 'javlibrary') {
            if (/\/vl_searchbycombo\.php$/i.test(lowerPath)) {
                const pageCandidate = descriptor?.page_url || descriptor?.pageUrl || descriptor?.href || '';
                if (!compactText(target.searchParams.get('searchid') || '') && pageCandidate) {
                    const pageParsed = parseTrackingUrl(pageCandidate, target.href);
                    const pageLowerPath = String(pageParsed?.pathname || '').toLowerCase();
                    if (pageParsed && /\/vl_searchbycombo\.php$/i.test(pageLowerPath)) {
                        const pageSearchId = compactText(pageParsed.searchParams.get('searchid') || '');
                        const pageKeyword = pageParsed.searchParams.get('keyword') || '';
                        if (pageSearchId) target.searchParams.set('searchid', pageSearchId);
                        if (!target.searchParams.get('keyword') && pageKeyword) target.searchParams.set('keyword', pageKeyword);
                    }
                }
                return target.toString().replace(/\/$/, '');
            }
            if (/\/vl_searchbytitle\.php$/i.test(lowerPath)) {
                const currentKeyword = compactText(target.searchParams.get('keyword') || '');
                if (currentKeyword && isTrackingGenericSearchLabel(currentKeyword)) {
                    target.searchParams.delete('keyword');
                }
                return target.toString().replace(/\/$/, '');
            }
        }
        return buildTrackingCanonicalUrl(target.href);
    }

    function isJavLibraryTitleSearchUrl(url) {
        const parsed = parseTrackingUrl(url || '');
        if (!parsed) return false;
        return /javlibrary\./i.test(String(parsed.hostname || ''))
            && /\/vl_searchbytitle\.php$/i.test(String(parsed.pathname || '').toLowerCase());
    }

    function pickTrackingSearchQueryCandidate(candidates = []) {
        for (const candidate of candidates) {
            const text = normalizeTrackingQueryLabel(candidate || '');
            if (!text || isTrackingGenericSearchLabel(text) || isTrackingSiteGenericLabel(text)) continue;
            return text;
        }
        return '';
    }

    function extractTrackingSearchQueryFromUrl(url = '') {
        const parsed = parseTrackingUrl(url || '');
        if (!parsed) return '';
        return pickTrackingSearchQueryCandidate([
            parsed.searchParams.get('keyword'),
            parsed.searchParams.get('q'),
            parsed.searchParams.get('search')
        ]);
    }

    function replaceTrackingSearchKeywordInUrl(url = '', keyword = '') {
        const parsed = parseTrackingUrl(url || '');
        const searchQuery = compactText(keyword || '');
        if (!parsed || !searchQuery) return compactText(url || '');
        if (isJavLibraryResolvableSearchUrl(parsed.href)) {
            parsed.searchParams.set('keyword', searchQuery);
        }
        return parsed.toString().replace(/\/$/, '');
    }

    function getTrackingSearchQuery(record = null, fallbackContext = null) {
        const primaryCandidates = [
            record?.raw_query,
            record?.query_text,
            extractTrackingSearchQueryFromUrl(record?.page_url || ''),
            extractTrackingSearchQueryFromUrl(record?.open_url || ''),
            getTrackingEffectiveGroupType(record) === 'keyword' ? record?.group_name : '',
            record?.manual_query
        ];
        const primaryQuery = pickTrackingSearchQueryCandidate(primaryCandidates);
        if (primaryQuery) return primaryQuery;
        if (record?.id) return '';
        const fallbackCandidates = [
            fallbackContext?.raw_query,
            fallbackContext?.query_text,
            extractTrackingSearchQueryFromUrl(fallbackContext?.pageUrl || fallbackContext?.page_url || ''),
            extractTrackingSearchQueryFromUrl(fallbackContext?.open_url || ''),
            normalizeTrackingGroupType(fallbackContext?.group_type || '') === 'keyword' ? fallbackContext?.group_name : '',
            fallbackContext?.manual_query
        ];
        return pickTrackingSearchQueryCandidate(fallbackCandidates);
    }

    function promptTrackingSearchQuery(record = null, context = null) {
        const recordDefault = getTrackingSearchQuery(record)
            || pickTrackingSearchQueryCandidate([
                getTrackingEffectiveGroupType(record) === 'keyword' ? record?.group_name : '',
                record?.custom_label
            ]);
        const contextDefault = getTrackingSearchQuery(null, context)
            || pickTrackingSearchQueryCandidate([
                normalizeTrackingGroupType(context?.group_type || '') === 'keyword' ? context?.group_name : '',
                context?.custom_label
            ]);
        const defaultValue = record?.id ? recordDefault : (recordDefault || contextDefault);
        const result = window.prompt('请输入这个 JavLibrary 搜索的原始关键词 / 组合条件（用于重新生成已过期搜索）', defaultValue);
        if (result == null) return null;
        return compactText(result);
    }

    function applyTrackingSearchQuery(record, rawQuery) {
        if (!record) return '';
        const searchQuery = compactText(rawQuery || '');
        record.manual_query = searchQuery;
        if (!searchQuery) return '';
        record.raw_query = searchQuery;
        record.query_text = searchQuery;
        if (isJavLibraryResolvableSearchUrl(record?.page_url || record?.open_url || '')) {
            if (record.page_url) record.page_url = replaceTrackingSearchKeywordInUrl(record.page_url, searchQuery);
            if (record.open_url) record.open_url = replaceTrackingSearchKeywordInUrl(record.open_url, searchQuery);
        }
        if (getTrackingEffectiveGroupType(record) === 'keyword' || isJavLibraryResolvableSearchUrl(record?.page_url || record?.open_url || '')) {
            if (searchQuery && !isTrackingUiChromeLabel(searchQuery)) {
                record.group_name = searchQuery;
                record.title = getSiteLabel(record.site) + ' · ' + searchQuery;
            }
        }
        record.query_signature = buildTrackingSignature({
            site: record.site,
            page_type: record.page_type,
            open_url: record.open_url || record.page_url || '',
            pageUrl: record.page_url || record.open_url || '',
            raw_query: record.raw_query,
            query_text: record.query_text
        });
        return searchQuery;
    }

    function buildJavLibraryTitleSearchSubmitUrl(seedUrl = location.href) {
        const parsed = parseTrackingUrl(seedUrl || location.href);
        if (!parsed) return 'https://www.javlibrary.com/cn/vl_searchbytitle.php';
        const localeMatch = String(parsed.pathname || '').match(/^\/([a-z]{2})(?:\/|$)/i);
        const locale = localeMatch?.[1] || 'cn';
        return new URL('/' + locale + '/vl_searchbytitle.php', parsed.origin).toString();
    }

    function buildJavLibrarySimpleSearchAjaxUrl(seedUrl = location.href) {
        const parsed = parseTrackingUrl(seedUrl || location.href);
        if (!parsed) return 'https://www.javlibrary.com/ajax/ajax_simplesearch.php';
        return new URL('/ajax/ajax_simplesearch.php', parsed.origin).toString();
    }

    function isJavLibraryComboSearchUrl(url) {
        const parsed = parseTrackingUrl(url || '');
        if (!parsed) return false;
        return /javlibrary\./i.test(String(parsed.hostname || ''))
            && /\/vl_searchbycombo\.php$/i.test(String(parsed.pathname || '').toLowerCase());
    }

    function isJavLibraryResolvableSearchUrl(url) {
        return isJavLibraryTitleSearchUrl(url) || isJavLibraryComboSearchUrl(url);
    }

    function buildJavLibraryComboSearchAjaxUrl(seedUrl = location.href) {
        const parsed = parseTrackingUrl(seedUrl || location.href);
        if (!parsed) return 'https://www.javlibrary.com/ajax/ajax_combosearch.php';
        return new URL('/ajax/ajax_combosearch.php', parsed.origin).toString();
    }

    function buildJavLibraryAdvancedSearchUrl(seedUrl = location.href) {
        const parsed = parseTrackingUrl(seedUrl || location.href);
        if (!parsed) return 'https://www.javlibrary.com/cn/search.php';
        const localeMatch = String(parsed.pathname || '').match(/^\/([a-z]{2})(?:\/|$)/i);
        const locale = localeMatch?.[1] || 'cn';
        return new URL('/' + locale + '/search.php', parsed.origin).toString();
    }

    const JAVLIBRARY_COMBO_OPTION_CACHE = new Map();
    const JAVLIBRARY_SEARCH_PAGE_CONTEXT_CACHE = new Map();
    const JAVLIBRARY_COMBO_OPTION_STORAGE_KEY = 'jlc_javlibrary_combo_option_snapshot_v1';
    const JAVLIBRARY_COMBO_FIELD_TABLE_MAP = Object.freeze({
        director: 'director_filter',
        maker: 'maker_filter',
        label: 'label_filter',
        genre: 'genre_filter',
        cast: 'cast_filter'
    });

    function normalizeJavLibraryComboOptionLabel(value) {
        return compactText(value || '')
            .replace(/[：:=]/g, '')
            .replace(/[()（）[]【】]/g, '')
            .replace(/[/／]/g, '')
            .replace(/[|｜]/g, '')
            .replace(/s+/g, '')
            .toLowerCase();
    }

    function resolveJavLibraryComboFieldAlias(rawKey) {
        const key = normalizeJavLibraryComboOptionLabel(rawKey);
        if (!key) return '';
        if (key.includes('title') || key.includes('標題') || key.includes('标题') || key.includes('片名')) return 'title';
        if (key.includes('genre') || key.includes('ジャンル') || key.includes('類別') || key.includes('类别') || key.includes('分類') || key.includes('分类')) return 'genre';
        if (key.includes('director') || key.includes('監督') || key.includes('导演') || key.includes('導演')) return 'director';
        if (key.includes('maker') || key.includes('メーカー') || key.includes('製作') || key.includes('制作') || key.includes('片商') || key.includes('studio')) return 'maker';
        if (key.includes('label') || key.includes('レーベル') || key.includes('系列') || key.includes('厂牌') || key.includes('廠牌')) return 'label';
        if (key.includes('cast') || key.includes('actor') || key.includes('出演') || key.includes('女优') || key.includes('女優') || key.includes('演员') || key.includes('演員')) return 'cast';
        return '';
    }

    function parseJavLibraryComboKeyword(keyword) {
        const raw = compactText(keyword || '');
        if (!raw || !raw.includes('=')) return [];
        const entries = [];
        const segments = raw.split('||');
        for (const segment of segments) {
            const cleaned = compactText(String(segment || '').replace(/^\|+|\|+$/g, ''));
            if (!cleaned) continue;
            const normalized = cleaned.replace(/＝/g, '=');
            const dividerIndex = normalized.indexOf('=');
            if (dividerIndex <= 0) continue;
            const key = compactText(normalized.slice(0, dividerIndex));
            const value = compactText(normalized.slice(dividerIndex + 1));
            const fieldAlias = resolveJavLibraryComboFieldAlias(key);
            if (!fieldAlias || !value) continue;
            entries.push({ key, value, fieldAlias });
        }
        return entries;
    }

    function isJavLibraryAdvancedSearchDocumentReady(doc) {
        return !!doc?.querySelector([
            'select[name="genre1"]',
            'select[name="genre2"]',
            'select[name="director"]',
            'select[name="maker"]',
            'select[name="label"]',
            '#genre_filter .multiselectblock .block[value]',
            '#director_filter .multiselectblock .block[value]',
            '#maker_filter .multiselectblock .block[value]',
            '#label_filter .multiselectblock .block[value]',
            '#cast_filter .multiselectblock .block[value]'
        ].join(', '));
    }

    function summarizeJavLibrarySearchDocument(doc) {
        return compactText(doc?.body?.textContent || doc?.title || '').slice(0, 120);
    }

    function parseJavLibrarySearchHtml(htmlText) {
        const html = String(htmlText || '');
        if (!html) return null;
        try {
            return new DOMParser().parseFromString(html, 'text/html');
        } catch (error) {
            return null;
        }
    }

    function createJavLibraryComboOptionEntry(value, label) {
        const normalized = normalizeJavLibraryComboOptionLabel(label);
        const compactValue = compactText(value || '');
        const compactLabel = compactText(label || '');
        if (!normalized || !compactValue) return null;
        return { value: compactValue, label: compactLabel, normalized };
    }

    function mergeJavLibraryComboOptionArrays(...lists) {
        const merged = [];
        const seen = new Set();
        lists.flat().forEach((option) => {
            const normalized = compactText(option?.normalized || normalizeJavLibraryComboOptionLabel(option?.label || ''));
            const value = compactText(option?.value || '');
            const label = compactText(option?.label || '');
            if (!normalized || !value) return;
            const key = normalized + '|' + value;
            if (seen.has(key)) return;
            seen.add(key);
            merged.push({ value, label, normalized });
        });
        return merged;
    }

    function extractJavLibraryComboSelectOptions(doc, name) {
        const select = doc?.querySelector('select[name="' + name + '"]');
        if (!select) return [];
        return mergeJavLibraryComboOptionArrays(Array.from(select.querySelectorAll('option')).map((option) => createJavLibraryComboOptionEntry(option.getAttribute('value') || '', option.textContent || '')));
    }

    function extractJavLibraryComboBlockOptions(doc, fieldAlias) {
        const tableId = JAVLIBRARY_COMBO_FIELD_TABLE_MAP[fieldAlias] || '';
        if (!tableId) return [];
        const nodes = doc?.querySelectorAll('#' + tableId + ' .multiselectblock .block[value]') || [];
        return mergeJavLibraryComboOptionArrays(Array.from(nodes).map((node) => createJavLibraryComboOptionEntry(node.getAttribute('value') || '', node.textContent || '')));
    }

    function normalizeJavLibraryComboOptionFields(fields) {
        const next = Object.create(null);
        for (const name of ['director', 'maker', 'label', 'genre1', 'genre2', 'cast1', 'cast2']) {
            next[name] = mergeJavLibraryComboOptionArrays(fields?.[name] || []);
        }
        return next;
    }

    function mergeJavLibraryComboOptionFields(...sources) {
        const merged = Object.create(null);
        for (const name of ['director', 'maker', 'label', 'genre1', 'genre2', 'cast1', 'cast2']) {
            merged[name] = mergeJavLibraryComboOptionArrays(...sources.map((source) => source?.[name] || []));
        }
        return merged;
    }

    function hasJavLibraryComboOptionFields(fields) {
        return ['director', 'maker', 'label', 'genre1', 'genre2', 'cast1', 'cast2'].some((name) => Array.isArray(fields?.[name]) && fields[name].length > 0);
    }

    function loadStoredJavLibraryComboOptionFields() {
        const raw = GM_getValue(JAVLIBRARY_COMBO_OPTION_STORAGE_KEY, '');
        if (!raw) return normalizeJavLibraryComboOptionFields({});
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return normalizeJavLibraryComboOptionFields(parsed?.fields || parsed || {});
        } catch (error) {
            return normalizeJavLibraryComboOptionFields({});
        }
    }

    function saveStoredJavLibraryComboOptionFields(fields, meta = {}) {
        const incoming = normalizeJavLibraryComboOptionFields(fields || {});
        if (!hasJavLibraryComboOptionFields(incoming)) return loadStoredJavLibraryComboOptionFields();
        const current = loadStoredJavLibraryComboOptionFields();
        const merged = mergeJavLibraryComboOptionFields(current, incoming);
        const currentJson = JSON.stringify(current);
        const mergedJson = JSON.stringify(merged);
        if (currentJson !== mergedJson) {
            GM_setValue(JAVLIBRARY_COMBO_OPTION_STORAGE_KEY, JSON.stringify({
                updatedAt: Date.now(),
                source: compactText(meta?.source || ''),
                fields: merged
            }));
        }
        return merged;
    }

    async function ensureJavLibrarySearchPageContext(seedUrl = location.href) {
        const searchUrl = buildJavLibraryAdvancedSearchUrl(seedUrl);
        if (JAVLIBRARY_SEARCH_PAGE_CONTEXT_CACHE.has(searchUrl)) return JAVLIBRARY_SEARCH_PAGE_CONTEXT_CACHE.get(searchUrl);
        const pending = new Promise((resolve, reject) => {
            const frame = document.createElement('iframe');
            frame.style.cssText = 'position:fixed;left:-99999px;top:-99999px;width:1px;height:1px;opacity:0;pointer-events:none;border:0;';
            frame.setAttribute('aria-hidden', 'true');
            let settled = false;
            let timer = 0;
            let deadline = 0;
            const cleanup = () => {
                frame.onload = null;
                frame.onerror = null;
                if (timer) {
                    window.clearTimeout(timer);
                    timer = 0;
                }
            };
            const fail = (error) => {
                if (settled) return;
                settled = true;
                cleanup();
                try { frame.remove(); } catch (_) {}
                JAVLIBRARY_SEARCH_PAGE_CONTEXT_CACHE.delete(searchUrl);
                reject(error instanceof Error ? error : new Error(String(error || 'load-search-page-failed')));
            };
            const inspect = () => {
                if (settled) return;
                try {
                    const win = frame.contentWindow;
                    const doc = frame.contentDocument || win?.document;
                    if (!win || !doc) throw new Error('search-page-context-empty');
                    if (isJavLibraryAdvancedSearchDocumentReady(doc)) {
                        settled = true;
                        cleanup();
                        resolve({ searchUrl, frame, window: win, document: doc });
                        return;
                    }
                    if (Date.now() >= deadline) {
                        const snippet = compactText(doc.body?.textContent || doc.title || '').slice(0, 120);
                        throw new Error('search-page-form-not-ready' + (snippet ? ' · ' + snippet : ''));
                    }
                    timer = window.setTimeout(inspect, 300);
                } catch (error) {
                    fail(error);
                }
            };
            frame.onload = () => inspect();
            frame.onerror = () => fail(new Error('search-page-load-error'));
            document.body.appendChild(frame);
            deadline = Date.now() + 20000;
            frame.src = searchUrl;
        });
        JAVLIBRARY_SEARCH_PAGE_CONTEXT_CACHE.set(searchUrl, pending);
        return pending;
    }

    function extractJavLibraryComboSearchOptionsFromDoc(doc) {
        const fields = Object.create(null);
        fields.director = mergeJavLibraryComboOptionArrays(extractJavLibraryComboSelectOptions(doc, 'director'), extractJavLibraryComboBlockOptions(doc, 'director'));
        fields.maker = mergeJavLibraryComboOptionArrays(extractJavLibraryComboSelectOptions(doc, 'maker'), extractJavLibraryComboBlockOptions(doc, 'maker'));
        fields.label = mergeJavLibraryComboOptionArrays(extractJavLibraryComboSelectOptions(doc, 'label'), extractJavLibraryComboBlockOptions(doc, 'label'));
        const genreOptions = mergeJavLibraryComboOptionArrays(extractJavLibraryComboSelectOptions(doc, 'genre1'), extractJavLibraryComboSelectOptions(doc, 'genre2'), extractJavLibraryComboBlockOptions(doc, 'genre'));
        const castOptions = mergeJavLibraryComboOptionArrays(extractJavLibraryComboSelectOptions(doc, 'cast1'), extractJavLibraryComboSelectOptions(doc, 'cast2'), extractJavLibraryComboBlockOptions(doc, 'cast'));
        fields.genre1 = genreOptions;
        fields.genre2 = genreOptions;
        fields.cast1 = castOptions;
        fields.cast2 = castOptions;
        return normalizeJavLibraryComboOptionFields(fields);
    }

    async function fetchJavLibraryAdvancedSearchDocument(searchUrl, seedUrl = searchUrl) {
        if (isJavLibraryAdvancedSearchDocumentReady(document) && buildJavLibraryAdvancedSearchUrl(location.href) === searchUrl) {
            return { searchUrl, document, source: 'current-document' };
        }

        const acceptHeader = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
        let lastSnippet = '';

        try {
            const response = await fetch(searchUrl, {
                method: 'GET',
                credentials: 'include',
                redirect: 'follow',
                headers: { 'Accept': acceptHeader }
            });
            const text = await response.text();
            const doc = parseJavLibrarySearchHtml(text);
            lastSnippet = summarizeJavLibrarySearchDocument(doc);
            if (response.ok && isJavLibraryAdvancedSearchDocumentReady(doc)) {
                return { searchUrl, document: doc, source: 'fetch' };
            }
        } catch (error) {
            lastSnippet = compactText(error?.message || lastSnippet || '');
        }

        const pageResponse = await requestPage(searchUrl, {
            headers: {
                'Accept': acceptHeader,
                'Referer': seedUrl || searchUrl
            }
        });
        const pageDoc = parseJavLibrarySearchHtml(pageResponse.responseText || '');
        lastSnippet = summarizeJavLibrarySearchDocument(pageDoc) || lastSnippet;
        if (pageResponse.ok && isJavLibraryAdvancedSearchDocumentReady(pageDoc)) {
            return { searchUrl, document: pageDoc, source: 'gm-request' };
        }

        const context = await ensureJavLibrarySearchPageContext(seedUrl);
        if (isJavLibraryAdvancedSearchDocumentReady(context?.document)) {
            return { searchUrl, document: context.document, source: 'iframe' };
        }

        throw new Error('search-page-form-not-ready' + (lastSnippet ? ' · ' + lastSnippet : ''));
    }

    async function loadJavLibraryComboSearchOptions(seedUrl = location.href) {
        const searchUrl = buildJavLibraryAdvancedSearchUrl(seedUrl);
        if (JAVLIBRARY_COMBO_OPTION_CACHE.has(searchUrl)) return JAVLIBRARY_COMBO_OPTION_CACHE.get(searchUrl);
        const pending = (async () => {
            const storedFields = loadStoredJavLibraryComboOptionFields();
            try {
                const state = await fetchJavLibraryAdvancedSearchDocument(searchUrl, seedUrl);
                const liveFields = extractJavLibraryComboSearchOptionsFromDoc(state?.document);
                const mergedFields = hasJavLibraryComboOptionFields(liveFields)
                    ? saveStoredJavLibraryComboOptionFields(liveFields, { source: state?.source || '' })
                    : storedFields;
                return {
                    searchUrl,
                    source: hasJavLibraryComboOptionFields(liveFields) && hasJavLibraryComboOptionFields(storedFields)
                        ? (state?.source || 'live') + '+stored-cache'
                        : (state?.source || (hasJavLibraryComboOptionFields(mergedFields) ? 'stored-cache' : '')),
                    fields: mergeJavLibraryComboOptionFields(storedFields, liveFields)
                };
            } catch (error) {
                if (hasJavLibraryComboOptionFields(storedFields)) {
                    return { searchUrl, source: 'stored-cache', fields: storedFields, stale: true };
                }
                JAVLIBRARY_COMBO_OPTION_CACHE.delete(searchUrl);
                throw error;
            }
        })().catch((error) => {
            JAVLIBRARY_COMBO_OPTION_CACHE.delete(searchUrl);
            throw error;
        });
        JAVLIBRARY_COMBO_OPTION_CACHE.set(searchUrl, pending);
        return pending;
    }

    function primeJavLibraryComboOptionSnapshotFromCurrentPage() {
        if (currentWeb !== 'javlibrary' || !isJavLibraryAdvancedSearchPageUrl(location.href)) return;
        let attempts = 0;
        const inspect = () => {
            attempts += 1;
            const fields = extractJavLibraryComboSearchOptionsFromDoc(document);
            if (hasJavLibraryComboOptionFields(fields)) {
                saveStoredJavLibraryComboOptionFields(fields, { source: 'current-page-prime' });
                return;
            }
            if (attempts < 20) window.setTimeout(inspect, 800);
        };
        window.setTimeout(inspect, 600);
    }

    function createDefaultJavLibraryComboForm(keyword) {
        const form = new URLSearchParams();
        form.set('title', '');
        form.set('start_year', '');
        form.set('start_month', '');
        form.set('end_year', '');
        form.set('end_month', '');
        form.set('min_rating', '0');
        form.set('max_rating', '10');
        form.set('director', '');
        form.set('maker', '');
        form.set('label', '');
        form.set('genre1', '');
        form.set('genre2', '');
        form.set('cast1', '');
        form.set('cast2', '');
        form.set('data', keyword);
        return form;
    }

    // 基于 2026-04-08 search.php HAR 提取的类别映射，用于过期 combo searchid 重建。
    const JAVLIBRARY_COMBO_GENRE_STATIC_ENTRIES = [
            [
                    "72",
                    "69"
            ],
            [
                    "190",
                    "3D"
            ],
            [
                    "88",
                    "4小时以上作品"
            ],
            [
                    "676",
                    "AI生成作品"
            ],
            [
                    "250",
                    "COSPLAY服饰"
            ],
            [
                    "279",
                    "HD DVD"
            ],
            [
                    "232",
                    "MicroSD"
            ],
            [
                    "590",
                    "M女"
            ],
            [
                    "513",
                    "M男"
            ],
            [
                    "2",
                    "OL"
            ],
            [
                    "298",
                    "R-15"
            ],
            [
                    "304",
                    "R-18"
            ],
            [
                    "4",
                    "SM"
            ],
            [
                    "220",
                    "UMD"
            ],
            [
                    "302",
                    "VFT"
            ],
            [
                    "311",
                    "VHS"
            ],
            [
                    "558",
                    "VR"
            ],
            [
                    "610",
                    "下属・同事"
            ],
            [
                    "36",
                    "业余"
            ],
            [
                    "12",
                    "中出"
            ],
            [
                    "631",
                    "主妇之友"
            ],
            [
                    "78",
                    "主观视角"
            ],
            [
                    "273",
                    "主题工作"
            ],
            [
                    "93",
                    "乱伦"
            ],
            [
                    "48",
                    "乳交"
            ],
            [
                    "70",
                    "乳房"
            ],
            [
                    "596",
                    "乳房偷窺"
            ],
            [
                    "123",
                    "乳液"
            ],
            [
                    "291",
                    "亚洲"
            ],
            [
                    "163",
                    "亚洲女演员"
            ],
            [
                    "199",
                    "介绍影片"
            ],
            [
                    "50",
                    "企画"
            ],
            [
                    "37",
                    "伴侣"
            ],
            [
                    "194",
                    "修女"
            ],
            [
                    "47",
                    "倒追"
            ],
            [
                    "626",
                    "假阳具"
            ],
            [
                    "52",
                    "偶像"
            ],
            [
                    "214",
                    "偷窥"
            ],
            [
                    "33",
                    "偷窥"
            ],
            [
                    "119",
                    "催眠"
            ],
            [
                    "111",
                    "兔女郎"
            ],
            [
                    "75",
                    "全裸"
            ],
            [
                    "283",
                    "公主"
            ],
            [
                    "120",
                    "其他学生"
            ],
            [
                    "31",
                    "其他恋物癖"
            ],
            [
                    "594",
                    "养女"
            ],
            [
                    "87",
                    "内衣"
            ],
            [
                    "32",
                    "内衣"
            ],
            [
                    "181",
                    "冒险"
            ],
            [
                    "284",
                    "写真偶像"
            ],
            [
                    "84",
                    "凌辱"
            ],
            [
                    "76",
                    "出轨"
            ],
            [
                    "26",
                    "制服"
            ],
            [
                    "154",
                    "制服外套"
            ],
            [
                    "209",
                    "动画人物"
            ],
            [
                    "18",
                    "单体作品"
            ],
            [
                    "173",
                    "即兴性交"
            ],
            [
                    "207",
                    "历史剧"
            ],
            [
                    "517",
                    "原作改编"
            ],
            [
                    "195",
                    "去背影片"
            ],
            [
                    "215",
                    "及膝袜"
            ],
            [
                    "293",
                    "友谊"
            ],
            [
                    "14",
                    "双性人"
            ],
            [
                    "616",
                    "叔母"
            ],
            [
                    "536",
                    "受孕"
            ],
            [
                    "5",
                    "变性者"
            ],
            [
                    "8",
                    "口交"
            ],
            [
                    "74",
                    "各种职业"
            ],
            [
                    "184",
                    "后母"
            ],
            [
                    "66",
                    "吞精"
            ],
            [
                    "313",
                    "呕吐"
            ],
            [
                    "128",
                    "和服、丧服"
            ],
            [
                    "289",
                    "喜剧"
            ],
            [
                    "170",
                    "国外进口"
            ],
            [
                    "188",
                    "处女"
            ],
            [
                    "183",
                    "处男"
            ],
            [
                    "13",
                    "多P"
            ],
            [
                    "51",
                    "大小姐"
            ],
            [
                    "244",
                    "天赋"
            ],
            [
                    "597",
                    "夫妻交换"
            ],
            [
                    "234",
                    "奇异的"
            ],
            [
                    "57",
                    "女上位"
            ],
            [
                    "592",
                    "女上司"
            ],
            [
                    "174",
                    "女主播"
            ],
            [
                    "62",
                    "女优按摩棒"
            ],
            [
                    "10",
                    "女佣"
            ],
            [
                    "175",
                    "女儿"
            ],
            [
                    "67",
                    "女医生"
            ],
            [
                    "15",
                    "女同性恋"
            ],
            [
                    "145",
                    "女同接吻"
            ],
            [
                    "91",
                    "女大学生"
            ],
            [
                    "208",
                    "女忍者"
            ],
            [
                    "200",
                    "女战士"
            ],
            [
                    "27",
                    "女教师"
            ],
            [
                    "249",
                    "女检察官"
            ],
            [
                    "219",
                    "女祭司"
            ],
            [
                    "151",
                    "女装人妖"
            ],
            [
                    "3",
                    "奴隶"
            ],
            [
                    "105",
                    "妄想"
            ],
            [
                    "71",
                    "妓女"
            ],
            [
                    "165",
                    "妹妹"
            ],
            [
                    "34",
                    "姐姐"
            ],
            [
                    "204",
                    "娃娃"
            ],
            [
                    "216",
                    "子宫颈"
            ],
            [
                    "133",
                    "孕妇"
            ],
            [
                    "65",
                    "学校作品"
            ],
            [
                    "82",
                    "学校泳装"
            ],
            [
                    "92",
                    "家教"
            ],
            [
                    "168",
                    "寡妇"
            ],
            [
                    "312",
                    "导尿"
            ],
            [
                    "157",
                    "局部特写"
            ],
            [
                    "103",
                    "屁股"
            ],
            [
                    "117",
                    "展场女孩"
            ],
            [
                    "44",
                    "巨乳"
            ],
            [
                    "515",
                    "巨大屁股"
            ],
            [
                    "516",
                    "巨大阴茎"
            ],
            [
                    "45",
                    "已婚妇女"
            ],
            [
                    "243",
                    "帽型"
            ],
            [
                    "149",
                    "平胸"
            ],
            [
                    "146",
                    "年轻女孩"
            ],
            [
                    "83",
                    "强奸"
            ],
            [
                    "90",
                    "强奸"
            ],
            [
                    "299",
                    "形象俱乐部"
            ],
            [
                    "263",
                    "心理、惊悚片"
            ],
            [
                    "206",
                    "性感的"
            ],
            [
                    "236",
                    "性爱"
            ],
            [
                    "554",
                    "性转换・女体化"
            ],
            [
                    "158",
                    "性骚扰"
            ],
            [
                    "99",
                    "恋乳癖"
            ],
            [
                    "197",
                    "恋爱"
            ],
            [
                    "35",
                    "恋物癖"
            ],
            [
                    "122",
                    "恋腿癖"
            ],
            [
                    "281",
                    "恐怖"
            ],
            [
                    "182",
                    "恶作剧"
            ],
            [
                    "248",
                    "悬疑"
            ],
            [
                    "115",
                    "情侣"
            ],
            [
                    "308",
                    "感官作品"
            ],
            [
                    "166",
                    "戏剧"
            ],
            [
                    "269",
                    "成人动漫"
            ],
            [
                    "189",
                    "成人电影"
            ],
            [
                    "104",
                    "成熟的女人"
            ],
            [
                    "196",
                    "战斗行动"
            ],
            [
                    "22",
                    "户外"
            ],
            [
                    "59",
                    "手指插入"
            ],
            [
                    "9",
                    "打手枪"
            ],
            [
                    "86",
                    "投稿"
            ],
            [
                    "95",
                    "护士"
            ],
            [
                    "16",
                    "拘束"
            ],
            [
                    "186",
                    "拳交"
            ],
            [
                    "77",
                    "拷问"
            ],
            [
                    "85",
                    "按摩"
            ],
            [
                    "17",
                    "按摩棒"
            ],
            [
                    "136",
                    "排便"
            ],
            [
                    "520",
                    "接吻"
            ],
            [
                    "602",
                    "接待员"
            ],
            [
                    "100",
                    "插入异物"
            ],
            [
                    "319",
                    "搔痒"
            ],
            [
                    "102",
                    "放尿"
            ],
            [
                    "218",
                    "故事集"
            ],
            [
                    "303",
                    "教学"
            ],
            [
                    "167",
                    "数位马赛克"
            ],
            [
                    "296",
                    "文化"
            ],
            [
                    "611",
                    "新娘"
            ],
            [
                    "73",
                    "新娘、年轻妻子"
            ],
            [
                    "595",
                    "旅行"
            ],
            [
                    "159",
                    "旗袍"
            ],
            [
                    "601",
                    "无内裤"
            ],
            [
                    "112",
                    "无毛"
            ],
            [
                    "608",
                    "无胸罩"
            ],
            [
                    "549",
                    "时间停止"
            ],
            [
                    "96",
                    "明星脸"
            ],
            [
                    "521",
                    "晒黑"
            ],
            [
                    "247",
                    "暗黑系"
            ],
            [
                    "288",
                    "暴力"
            ],
            [
                    "148",
                    "服务生"
            ],
            [
                    "586",
                    "极致·性高潮"
            ],
            [
                    "131",
                    "校服"
            ],
            [
                    "139",
                    "格斗家"
            ],
            [
                    "179",
                    "模拟"
            ],
            [
                    "107",
                    "模特儿"
            ],
            [
                    "185",
                    "正太控"
            ],
            [
                    "255",
                    "正常"
            ],
            [
                    "233",
                    "残忍画面"
            ],
            [
                    "46",
                    "母乳"
            ],
            [
                    "125",
                    "母亲"
            ],
            [
                    "11",
                    "水手服"
            ],
            [
                    "24",
                    "汽车性爱"
            ],
            [
                    "266",
                    "法国"
            ],
            [
                    "588",
                    "泡沫浴"
            ],
            [
                    "110",
                    "泡泡袜"
            ],
            [
                    "109",
                    "泳装"
            ],
            [
                    "618",
                    "洗浴"
            ],
            [
                    "609",
                    "洽公服装"
            ],
            [
                    "523",
                    "流汗"
            ],
            [
                    "60",
                    "浴衣"
            ],
            [
                    "280",
                    "海外"
            ],
            [
                    "251",
                    "淋浴"
            ],
            [
                    "56",
                    "淫乱、真实"
            ],
            [
                    "40",
                    "淫语"
            ],
            [
                    "113",
                    "深喉"
            ],
            [
                    "512",
                    "温泉"
            ],
            [
                    "210",
                    "滑稽模仿"
            ],
            [
                    "116",
                    "滥交"
            ],
            [
                    "64",
                    "潮吹"
            ],
            [
                    "25",
                    "灌肠"
            ],
            [
                    "106",
                    "烂醉如泥的"
            ],
            [
                    "294",
                    "爱好、文化"
            ],
            [
                    "264",
                    "爱情故事"
            ],
            [
                    "265",
                    "爱情浪漫"
            ],
            [
                    "212",
                    "特效"
            ],
            [
                    "224",
                    "独立制作"
            ],
            [
                    "79",
                    "猎艳"
            ],
            [
                    "217",
                    "猥亵穿着"
            ],
            [
                    "130",
                    "猫耳女"
            ],
            [
                    "126",
                    "玩具"
            ],
            [
                    "619",
                    "瑜伽"
            ],
            [
                    "134",
                    "男同性恋"
            ],
            [
                    "242",
                    "男性"
            ],
            [
                    "591",
                    "男潮吹"
            ],
            [
                    "147",
                    "瘦小身型"
            ],
            [
                    "152",
                    "白人"
            ],
            [
                    "187",
                    "白天出轨"
            ],
            [
                    "169",
                    "监禁"
            ],
            [
                    "81",
                    "眼镜"
            ],
            [
                    "114",
                    "礼仪小姐"
            ],
            [
                    "604",
                    "社团・经理"
            ],
            [
                    "211",
                    "科幻"
            ],
            [
                    "171",
                    "秘书"
            ],
            [
                    "101",
                    "空中小姐"
            ],
            [
                    "285",
                    "童年朋友"
            ],
            [
                    "53",
                    "第一人称摄影"
            ],
            [
                    "522",
                    "粉丝感谢"
            ],
            [
                    "132",
                    "粪便"
            ],
            [
                    "39",
                    "精选、综合"
            ],
            [
                    "140",
                    "紧缚"
            ],
            [
                    "63",
                    "紧身衣"
            ],
            [
                    "605",
                    "约会"
            ],
            [
                    "97",
                    "纪录片"
            ],
            [
                    "137",
                    "经典"
            ],
            [
                    "80",
                    "绳缚"
            ],
            [
                    "310",
                    "给女性观众"
            ],
            [
                    "292",
                    "综合短篇"
            ],
            [
                    "30",
                    "美容院"
            ],
            [
                    "55",
                    "美少女"
            ],
            [
                    "301",
                    "美少女电影"
            ],
            [
                    "23",
                    "羞耻"
            ],
            [
                    "632",
                    "翻白眼・失神"
            ],
            [
                    "124",
                    "老板娘、女主人"
            ],
            [
                    "198",
                    "肌肉"
            ],
            [
                    "6",
                    "肛交"
            ],
            [
                    "614",
                    "背后"
            ],
            [
                    "135",
                    "胖女人"
            ],
            [
                    "203",
                    "脱衣"
            ],
            [
                    "19",
                    "自慰"
            ],
            [
                    "603",
                    "自慰辅助"
            ],
            [
                    "42",
                    "舔阴"
            ],
            [
                    "202",
                    "艺人"
            ],
            [
                    "89",
                    "苗条"
            ],
            [
                    "68",
                    "荡妇"
            ],
            [
                    "155",
                    "药物"
            ],
            [
                    "20",
                    "萝莉塔"
            ],
            [
                    "231",
                    "歌德萝莉"
            ],
            [
                    "635",
                    "蒙面・面具"
            ],
            [
                    "129",
                    "蓝光"
            ],
            [
                    "222",
                    "薄马赛克"
            ],
            [
                    "600",
                    "虐打"
            ],
            [
                    "223",
                    "蛮横娇羞"
            ],
            [
                    "589",
                    "蜡烛"
            ],
            [
                    "201",
                    "行动"
            ],
            [
                    "49",
                    "裸体围裙"
            ],
            [
                    "177",
                    "西洋片"
            ],
            [
                    "7",
                    "角色扮演"
            ],
            [
                    "164",
                    "角色扮演者"
            ],
            [
                    "225",
                    "触手"
            ],
            [
                    "246",
                    "触摸打字"
            ],
            [
                    "191",
                    "讲师"
            ],
            [
                    "205",
                    "访问"
            ],
            [
                    "61",
                    "调教"
            ],
            [
                    "118",
                    "赛车女郎"
            ],
            [
                    "229",
                    "超乳"
            ],
            [
                    "282",
                    "超短裙"
            ],
            [
                    "98",
                    "足交"
            ],
            [
                    "153",
                    "跳舞"
            ],
            [
                    "156",
                    "跳蛋"
            ],
            [
                    "121",
                    "身体意识"
            ],
            [
                    "172",
                    "车掌小姐"
            ],
            [
                    "94",
                    "轮奸"
            ],
            [
                    "620",
                    "软体"
            ],
            [
                    "43",
                    "辣妹"
            ],
            [
                    "587",
                    "辱骂"
            ],
            [
                    "245",
                    "运动"
            ],
            [
                    "617",
                    "运动员"
            ],
            [
                    "127",
                    "运动短裤"
            ],
            [
                    "29",
                    "连裤袜"
            ],
            [
                    "38",
                    "迷你裙"
            ],
            [
                    "150",
                    "迷你裙警察"
            ],
            [
                    "622",
                    "酒店"
            ],
            [
                    "192",
                    "重印版"
            ],
            [
                    "666",
                    "长靴"
            ],
            [
                    "21",
                    "露出"
            ],
            [
                    "286",
                    "青年"
            ],
            [
                    "615",
                    "面试"
            ],
            [
                    "268",
                    "韩国"
            ],
            [
                    "69",
                    "颜射"
            ],
            [
                    "58",
                    "颜射"
            ],
            [
                    "144",
                    "颜面骑乘"
            ],
            [
                    "193",
                    "飞特族"
            ],
            [
                    "138",
                    "食粪"
            ],
            [
                    "141",
                    "饮尿"
            ],
            [
                    "606",
                    "饮酒派对"
            ],
            [
                    "54",
                    "首次亮相"
            ],
            [
                    "108",
                    "高"
            ],
            [
                    "28",
                    "高中女生"
            ],
            [
                    "607",
                    "高龄男"
            ],
            [
                    "178",
                    "魔鬼系"
            ],
            [
                    "162",
                    "鸭嘴"
            ],
            [
                    "160",
                    "黑人演员"
            ],
            [
                    "627",
                    "鼻勾"
            ]
    ];

    const JAVLIBRARY_COMBO_STATIC_VALUE_MAP = (() => {
        const map = Object.create(null);
        const define = (fieldAlias, value, labels) => {
            if (!fieldAlias || !value || !Array.isArray(labels)) return;
            const bucket = map[fieldAlias] || (map[fieldAlias] = Object.create(null));
            labels.forEach((label) => {
                const normalized = normalizeJavLibraryComboOptionLabel(label);
                if (normalized && !bucket[normalized]) bucket[normalized] = compactText(value);
            });
        };
        JAVLIBRARY_COMBO_GENRE_STATIC_ENTRIES.forEach(([value, label]) => define('genre', value, [label]));
        define('genre', '15', ['女同性恋', '女同性戀', '女同', 'レズ', 'レズビアン', 'lesbian']);
        define('genre', '12', ['中出', '中出し', '内射', '內射']);
        define('genre', '93', ['乱伦', '亂倫', '近親相姦', '近亲相奸', 'incest']);
        define('genre', '34', ['姐姐', '姉', 'お姉さん', '姉系']);
        return map;
    })();

    function resolveJavLibraryComboStaticValue(fieldAlias, rawValue) {
        const normalized = normalizeJavLibraryComboOptionLabel(rawValue);
        if (!normalized) return '';
        const bucket = JAVLIBRARY_COMBO_STATIC_VALUE_MAP[fieldAlias] || null;
        return compactText(bucket?.[normalized] || '');
    }

    function shouldTryLoadJavLibraryComboOptions(entries) {
        return (Array.isArray(entries) ? entries : []).some((entry) => {
            if (!entry?.fieldAlias || entry.fieldAlias === 'title') return false;
            if (entry.fieldAlias === 'genre') return !resolveJavLibraryComboStaticValue('genre', entry.value);
            return true;
        });
    }

    function resolveJavLibraryComboOptionValue(fieldOptions, rawValue, fieldAlias = '') {
        const normalized = normalizeJavLibraryComboOptionLabel(rawValue);
        if (!normalized) return '';
        const options = Array.isArray(fieldOptions) ? fieldOptions : [];
        let matched = options.find((option) => option.normalized === normalized);
        if (!matched) matched = options.find((option) => option.normalized.includes(normalized) || normalized.includes(option.normalized));
        return compactText(matched?.value || '') || resolveJavLibraryComboStaticValue(fieldAlias, rawValue);
    }

    async function buildJavLibraryComboSearchBody(keyword, seedUrl = location.href) {
        const form = createDefaultJavLibraryComboForm(keyword);
        const entries = parseJavLibraryComboKeyword(keyword);
        if (!entries.length) return form.toString();

        let optionState = null;
        let optionLoadError = null;
        if (shouldTryLoadJavLibraryComboOptions(entries)) {
            try {
                optionState = await loadJavLibraryComboSearchOptions(seedUrl);
            } catch (error) {
                optionLoadError = error;
            }
        }

        const fields = optionState?.fields || {};
        const unresolved = [];
        let genreIndex = 0;
        let castIndex = 0;
        for (const entry of entries) {
            if (entry.fieldAlias === 'title') {
                form.set('title', entry.value);
                continue;
            }
            if (entry.fieldAlias === 'director' || entry.fieldAlias === 'maker' || entry.fieldAlias === 'label') {
                const resolvedValue = resolveJavLibraryComboOptionValue(fields[entry.fieldAlias], entry.value, entry.fieldAlias);
                if (resolvedValue) form.set(entry.fieldAlias, resolvedValue);
                else unresolved.push(entry);
                continue;
            }
            if (entry.fieldAlias === 'genre') {
                const targetField = genreIndex === 0 ? 'genre1' : (genreIndex === 1 ? 'genre2' : '');
                if (!targetField) continue;
                const resolvedValue = resolveJavLibraryComboOptionValue(fields[targetField], entry.value, 'genre')
                    || resolveJavLibraryComboOptionValue(fields.genre1, entry.value, 'genre')
                    || resolveJavLibraryComboOptionValue(fields.genre2, entry.value, 'genre');
                if (resolvedValue) {
                    form.set(targetField, resolvedValue);
                    genreIndex += 1;
                } else {
                    unresolved.push(entry);
                }
                continue;
            }
            if (entry.fieldAlias === 'cast') {
                const targetField = castIndex === 0 ? 'cast1' : (castIndex === 1 ? 'cast2' : '');
                if (!targetField) continue;
                const resolvedValue = resolveJavLibraryComboOptionValue(fields[targetField], entry.value, 'cast')
                    || resolveJavLibraryComboOptionValue(fields.cast1, entry.value, 'cast')
                    || resolveJavLibraryComboOptionValue(fields.cast2, entry.value, 'cast');
                if (resolvedValue) {
                    form.set(targetField, resolvedValue);
                    castIndex += 1;
                } else {
                    unresolved.push(entry);
                }
            }
        }
        if (unresolved.length) {
            console.warn('[Commander] JavLibrary combo 仍有未解析选项', {
                keyword,
                unresolved: unresolved.map((entry) => ({ fieldAlias: entry.fieldAlias, key: entry.key, value: entry.value })),
                optionSource: optionState?.source || 'static',
                optionError: optionLoadError?.message || ''
            });
        }
        return form.toString();
    }

    function buildResolvedJavLibrarySearchUrl(seedParsed, targetPhp, searchId, keyword, pageHint) {
        const localeMatch = String(seedParsed?.pathname || '').match(/^\/([a-z]{2})(?:\/|$)/i);
        const locale = localeMatch?.[1] || 'cn';
        const resultUrl = new URL('/' + locale + '/' + String(targetPhp || '').replace(/^\/+/, ''), seedParsed?.origin || 'https://www.javlibrary.com');
        resultUrl.searchParams.set('searchid', searchId);
        resultUrl.searchParams.set('keyword', keyword);
        if ((Number(pageHint || 0) || 1) > 1) resultUrl.searchParams.set('page', String(Number(pageHint || 0) || 1));
        else resultUrl.searchParams.delete('page');
        return resultUrl.toString();
    }

    async function requestJavLibrarySearchId(seedUrl, ajaxUrl, body, options = {}) {
        let responseText = '';
        let status = 0;
        let blockedByChallenge = false;
        const fetchImpl = options?.fetchWindow && typeof options.fetchWindow.fetch === 'function'
            ? options.fetchWindow.fetch.bind(options.fetchWindow)
            : (typeof fetch === 'function'
                ? fetch.bind(typeof globalThis !== 'undefined' ? globalThis : window)
                : window.fetch.bind(window));
        try {
            const requestInit = {
                method: 'POST',
                credentials: 'include',
                redirect: 'follow',
                cache: 'no-store',
                headers: {
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body
            };
            if (options?.referrerUrl) requestInit.referrer = options.referrerUrl;
            if (options?.referrerPolicy) requestInit.referrerPolicy = options.referrerPolicy;
            const response = await fetchImpl(ajaxUrl, requestInit);
            status = response.status || 0;
            responseText = await response.text();
            blockedByChallenge = isChallengePage(responseText) || isLikelyBotGuardResponse(responseText);
            if (blockedByChallenge || [403, 429, 503].includes(status)) {
                return {
                    ok: false,
                    error: blockedByChallenge ? 'challenge' : ('HTTP ' + status),
                    url: seedUrl,
                    cfRequired: true,
                    blockedByChallenge: blockedByChallenge || [403, 429, 503].includes(status),
                    response: { status, text: responseText }
                };
            }
            if (!response.ok) {
                return { ok: false, error: 'HTTP ' + status, url: seedUrl, response: { status, text: responseText } };
            }
        } catch (error) {
            return { ok: false, error: error?.message || 'network', url: seedUrl, response: null };
        }

        let payload = null;
        try {
            payload = JSON.parse(responseText || '{}');
        } catch (error) {
            if (blockedByChallenge || isChallengePage(responseText) || isLikelyBotGuardResponse(responseText)) {
                return {
                    ok: false,
                    error: 'challenge',
                    url: seedUrl,
                    cfRequired: true,
                    blockedByChallenge: true,
                    response: { status, text: responseText }
                };
            }
            return { ok: false, error: 'JavLibrary 返回的不是 JSON', url: seedUrl, response: { status, text: responseText } };
        }

        const searchId = compactText(payload?.ID || payload?.id || '');
        const targetPhp = compactText(payload?.URL || '');
        if (!searchId || !targetPhp) {
            const delay = Number(payload?.DELAY || payload?.delay || 0) || 0;
            const apiError = Number(payload?.ERROR || payload?.error || 0) || 0;
            if (apiError < 0 && delay > 0) {
                return {
                    ok: false,
                    error: 'rate-limited',
                    url: seedUrl,
                    rateLimited: true,
                    retryAfterMs: delay >= 1000 ? delay : (delay * 1000),
                    response: { status, payload, text: responseText }
                };
            }
            console.warn('[Commander] JavLibrary searchid 响应异常', { seedUrl, ajaxUrl, payload, text: responseText, body });
            return { ok: false, error: '未拿到新的 searchid', url: seedUrl, response: { status, payload, text: responseText } };
        }
        return { ok: true, status, payload, text: responseText, searchId, targetPhp };
    }

    async function resolveJavLibraryTitleSearchUrl(record, options = {}) {
        const keyword = compactText(options.keyword || getTrackingSearchQuery(record, options.context) || '');
        const seedUrl = options.seedUrl || record?.page_url || record?.open_url || location.href;
        const pageHint = Number(options.pageHint || 0) || 1;
        if (!keyword) {
            return { ok: false, error: 'missing-query', url: seedUrl, response: null };
        }

        const seedParsed = parseTrackingUrl(seedUrl || location.href);
        const currentParsed = parseTrackingUrl(location.href);
        if (!seedParsed) {
            return { ok: false, error: '无效的 JavLibrary 链接', url: seedUrl, response: null };
        }
        if (currentParsed && currentParsed.origin !== seedParsed.origin) {
            return { ok: false, error: '请在 JavLibrary 页面中打开这条追更后再重建 searchid', url: seedUrl, response: null };
        }

        const requestResult = await requestJavLibrarySearchId(seedUrl, buildJavLibrarySimpleSearchAjaxUrl(seedUrl), 'type=1&data=' + encodeURIComponent(keyword));
        if (!requestResult.ok) return requestResult;
        return {
            ok: true,
            url: buildResolvedJavLibrarySearchUrl(seedParsed, requestResult.targetPhp || 'vl_searchbytitle.php', requestResult.searchId, keyword, pageHint),
            response: { status: requestResult.status, payload: requestResult.payload, text: requestResult.text },
            keyword
        };
    }

    async function resolveJavLibraryComboSearchUrl(record, options = {}) {
        const keyword = compactText(options.keyword || getTrackingSearchQuery(record, options.context) || '');
        const seedUrl = options.seedUrl || record?.page_url || record?.open_url || location.href;
        const pageHint = Number(options.pageHint || 0) || 1;
        if (!keyword) {
            return { ok: false, error: 'missing-query', url: seedUrl, response: null };
        }

        const seedParsed = parseTrackingUrl(seedUrl || location.href);
        const currentParsed = parseTrackingUrl(location.href);
        if (!seedParsed) {
            return { ok: false, error: '无效的 JavLibrary 链接', url: seedUrl, response: null };
        }
        if (currentParsed && currentParsed.origin !== seedParsed.origin) {
            return { ok: false, error: '请在 JavLibrary 页面中打开这条追更后再重建 searchid', url: seedUrl, response: null };
        }

        const ajaxUrl = buildJavLibraryComboSearchAjaxUrl(seedUrl);
        const searchUrl = buildJavLibraryAdvancedSearchUrl(seedUrl);
        const requestBody = await buildJavLibraryComboSearchBody(keyword, seedUrl);
        const requestOptions = { referrerUrl: searchUrl, referrerPolicy: 'strict-origin-when-cross-origin' };
        const requestResult = await requestJavLibrarySearchId(seedUrl, ajaxUrl, requestBody, requestOptions);
        if (!requestResult.ok) return requestResult;
        return {
            ok: true,
            url: buildResolvedJavLibrarySearchUrl(seedParsed, requestResult.targetPhp || 'vl_searchbycombo.php', requestResult.searchId, keyword, pageHint),
            response: { status: requestResult.status, payload: requestResult.payload, text: requestResult.text },
            keyword
        };
    }

    async function resolveJavLibrarySearchUrl(record, options = {}) {
        const seedUrl = options.seedUrl || record?.page_url || record?.open_url || location.href;
        return isJavLibraryComboSearchUrl(seedUrl)
            ? resolveJavLibraryComboSearchUrl(record, options)
            : resolveJavLibraryTitleSearchUrl(record, options);
    }

    const JAVLIBRARY_PENDING_COMBO_REBUILD_KEY = 'jlc_pending_javlibrary_combo_rebuild_v1';

    function loadPendingJavLibraryComboRebuild() {
        const raw = GM_getValue(JAVLIBRARY_PENDING_COMBO_REBUILD_KEY, '');
        if (!raw) return null;
        try {
            return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (error) {
            return null;
        }
    }

    function savePendingJavLibraryComboRebuild(payload) {
        GM_setValue(JAVLIBRARY_PENDING_COMBO_REBUILD_KEY, payload ? JSON.stringify(payload) : '');
    }

    function clearPendingJavLibraryComboRebuild() {
        GM_setValue(JAVLIBRARY_PENDING_COMBO_REBUILD_KEY, '');
    }

    function isJavLibraryAdvancedSearchPageUrl(url = location.href) {
        const parsed = parseTrackingUrl(url || '');
        if (!parsed) return false;
        return /javlibrary\./i.test(String(parsed.hostname || ''))
            && /\/search\.php$/i.test(String(parsed.pathname || '').toLowerCase());
    }

    async function waitForJavLibraryAdvancedSearchDocument(timeoutMs = 20000) {
        if (isJavLibraryAdvancedSearchDocumentReady(document)) return document;
        return new Promise((resolve, reject) => {
            const deadline = Date.now() + timeoutMs;
            let timer = 0;
            const inspect = () => {
                if (isJavLibraryAdvancedSearchDocumentReady(document)) {
                    if (timer) window.clearTimeout(timer);
                    resolve(document);
                    return;
                }
                if (Date.now() >= deadline) {
                    if (timer) window.clearTimeout(timer);
                    reject(new Error('search-page-form-not-ready' + (summarizeJavLibrarySearchDocument(document) ? ' · ' + summarizeJavLibrarySearchDocument(document) : '')));
                    return;
                }
                timer = window.setTimeout(inspect, 300);
            };
            inspect();
        });
    }

    async function redirectToJavLibraryComboSearchPage(record, options = {}) {
        const seedUrl = options.seedUrl || record?.page_url || record?.open_url || location.href;
        const keyword = compactText(options.keyword || getTrackingSearchQuery(record, options.context) || '');
        const pageHint = Number(options.pageHint || 0) || 1;
        if (!keyword) {
            return { ok: false, error: 'missing-query', url: seedUrl, response: null };
        }
        savePendingJavLibraryComboRebuild({
            recordId: compactText(record?.id || ''),
            keyword,
            seedUrl,
            pageHint,
            createdAt: Date.now()
        });
        if (record?.id) await saveTrackingRecord(record);
        const searchUrl = buildJavLibraryAdvancedSearchUrl(seedUrl);
        location.href = searchUrl;
        return { ok: false, pending: true, url: searchUrl, response: null };
    }

    async function processPendingJavLibraryComboRebuild() {
        if (currentWeb !== 'javlibrary' || !isJavLibraryAdvancedSearchPageUrl(location.href)) return false;
        const pending = loadPendingJavLibraryComboRebuild();
        if (!pending) return false;
        const createdAt = Number(pending.createdAt || 0) || 0;
        if (createdAt > 0 && Date.now() - createdAt > 10 * 60 * 1000) {
            clearPendingJavLibraryComboRebuild();
            return false;
        }

        const seedUrl = pending.seedUrl || location.href;
        const searchUrl = buildJavLibraryAdvancedSearchUrl(seedUrl);
        if (buildTrackingCanonicalUrl(location.href) !== buildTrackingCanonicalUrl(searchUrl)) {
            location.replace(searchUrl);
            return true;
        }

        let record = null;
        if (pending.recordId) {
            try {
                record = await getVal(TRACKING_STORE, pending.recordId);
            } catch (error) {
                record = null;
            }
        }
        const keyword = compactText(pending.keyword || getTrackingSearchQuery(record) || '');
        if (!keyword) {
            clearPendingJavLibraryComboRebuild();
            showAlert('组合搜索重建失败：缺少原搜索词');
            return true;
        }

        try {
            await waitForJavLibraryAdvancedSearchDocument(20000);
        } catch (error) {
            clearPendingJavLibraryComboRebuild();
            showAlert('组合搜索页还没准备好：' + (error?.message || '未知错误'));
            return true;
        }

        if (record) applyTrackingSearchQuery(record, keyword);
        const pageHint = Number(pending.pageHint || 0) || 1;
        const ajaxUrl = buildJavLibraryComboSearchAjaxUrl(seedUrl);
        const requestBody = await buildJavLibraryComboSearchBody(keyword, seedUrl);
        const requestOptions = { fetchWindow: window, referrerUrl: searchUrl, referrerPolicy: 'strict-origin-when-cross-origin' };
        const requestResult = await requestJavLibrarySearchId(seedUrl, ajaxUrl, requestBody, requestOptions);
        clearPendingJavLibraryComboRebuild();
        if (!requestResult.ok) {
            if (record?.id) {
                record.last_check_at = new Date().toISOString();
                record.check_status = 'error';
                record.check_note = '组合搜索重建失败 · ' + (requestResult.error || '未知错误');
                await saveTrackingRecord(record);
            }
            showAlert('重新生成 JavLibrary 组合搜索失败：' + (requestResult.error || '未知错误'));
            return true;
        }

        const seedParsed = parseTrackingUrl(seedUrl || location.href);
        const resultUrl = buildResolvedJavLibrarySearchUrl(seedParsed, requestResult.targetPhp || 'vl_searchbycombo.php', requestResult.searchId, keyword, pageHint);
        if (record?.id) {
            record.open_url = resultUrl;
            await saveTrackingRecord(record);
        }
        location.replace(resultUrl);
        return true;
    }

function isTrackingResolvableOpenUrl(url) {
        const parsed = parseTrackingUrl(url || '');
        if (!parsed) return false;
        if (isJavLibraryResolvableSearchUrl(parsed.href)) {
            const keyword = compactText(parsed.searchParams.get('keyword') || '');
            return !!keyword || !!parsed.searchParams.get('searchid');
        }
        return true;
    }

    function buildTrackingNavigationUrl(record) {
        const normalizedUrl = buildTrackingOpenUrl(record?.site, record?.open_url || record?.page_url || '', record || {}) || '';
        const fallbackUrl = record?.page_url || record?.open_url || normalizedUrl || '';
        const baseUrl = isTrackingResolvableOpenUrl(normalizedUrl) ? normalizedUrl : fallbackUrl;
        const parsed = parseTrackingUrl(baseUrl);
        if (!parsed) return baseUrl;
        const mode = resolveTrackingSearchMode(record, parsed);
        if (String(record?.site || '').toLowerCase() === 'javlibrary' && mode === 'backfill') {
            const topPage = Number(record.top_page_hint || 0) || 0;
            const seenPage = Number(record.last_seen_page_hint || 0) || 0;
            const browsedPage = Number(record.last_browsed_page_hint || 0) || 0;
            const page = topPage > seenPage
                ? topPage
                : Number(seenPage || topPage || browsedPage || 0);
            if (page > 1) parsed.searchParams.set('page', String(page));
            else parsed.searchParams.delete('page');
        }
        return parsed.toString();
    }

    function getTrackingHeadingText(doc = document) {
        // 绝不能扫到工作台设置里的 <h3>资源增强</h3> 等脚本 UI
        const selectors = [
            '#rightcolumn h3',
            '#rightcolumn h2',
            '#rightcolumn h1',
            '#content h1',
            '#content h2',
            '#content h3',
            '.boxtitle',
            'h1.title',
            'h1',
            'h2.title',
            'h2',
            'h3',
            '.page-title',
            '.section-name',
            '.title.is-4',
            '.title.is-3',
            '.main h3',
            '.container h3'
        ];
        for (const selector of selectors) {
            const nodes = doc.querySelectorAll(selector);
            for (const node of nodes) {
                if (isScriptUiNode(node)) continue;
                const text = compactText(node);
                if (!text || text.length > 120 || isTrackingUiChromeLabel(text)) continue;
                return text;
            }
        }
        const title = compactText(doc.title || '');
        const cleaned = title.replace(/\s*[-|｜·].*$/, '').trim();
        return isTrackingUiChromeLabel(cleaned) ? '' : cleaned;
    }

    function getCurrentListPageHint(url = location.href, doc = document) {
        const parsed = parseTrackingUrl(url);
        if (!parsed) return 1;
        const fromParam = Number(parsed.searchParams.get('page') || parsed.searchParams.get('p') || 0);
        if (fromParam > 0) return fromParam;
        const pathMatch = parsed.pathname.match(/\/(\d+)\/?$/);
        if (pathMatch?.[1] && /(search|star|actor|series|genre|tag|studio|maker|director|label|publisher)/i.test(parsed.pathname)) {
            return Number(pathMatch[1]) || 1;
        }
        const active = doc.querySelector('.pagination .active, .pagination .current, .page_selector .page.active, .page_selector .current, .pagination-list .is-current');
        const activeText = parseInt(compactText(active), 10);
        return Number.isFinite(activeText) && activeText > 0 ? activeText : 1;
    }

    function normalizeTrackingCoverUrl(url, baseUrl = location.href) {
        let raw = compactText(url || '');
        if (!raw || /^data:/i.test(raw)) return '';
        if (/placeholder|blank\.|spacer|1x1|loading\.gif|transparent|data:image\/gif/i.test(raw)) return '';
        // srcset 取第一段
        if (raw.includes(',')) raw = compactText(raw.split(',')[0] || '');
        if (/\s/.test(raw)) raw = compactText(raw.split(/\s+/)[0] || '');
        try {
            const abs = new URL(raw, baseUrl || location.href).href;
            return abs.replace(/\/thumbs\//ig, '/images/');
        } catch (error) {
            return raw;
        }
    }

    function extractCoverUrlFromNode(node, baseUrl = location.href) {
        if (!node || typeof node.querySelectorAll !== 'function') return '';
        const imgs = node.querySelectorAll('img');
        for (const img of imgs) {
            const src = img.getAttribute('data-src')
                || img.getAttribute('data-original')
                || img.getAttribute('data-lazy-src')
                || img.getAttribute('data-srcset')
                || img.getAttribute('srcset')
                || img.currentSrc
                || img.getAttribute('src')
                || '';
            const normalized = normalizeTrackingCoverUrl(src, baseUrl);
            if (normalized) return normalized;
        }
        return '';
    }

    function extractTrackingAvatarFromDocument(doc = document, groupType = '', baseUrl = location.href) {
        if (String(groupType || '').toLowerCase() !== 'actor' || !doc?.querySelector) return '';
        const selectors = [
            '.avatar-box img',
            '.photo-frame img',
            '#avatar img',
            'img.avatar',
            '.star-photo img',
            '.actor-avatar img',
            '.avatar img',
            '#side-menu img[src*="actress"]',
            '#side-menu img[src*="actor"]'
        ];
        for (const selector of selectors) {
            const img = doc.querySelector(selector);
            if (!img || (typeof img.closest === 'function' && isScriptUiNode(img))) continue;
            const url = normalizeTrackingCoverUrl(
                img.getAttribute('data-src') || img.getAttribute('src') || img.currentSrc || '',
                baseUrl
            );
            if (url) return url;
        }
        return '';
    }

    function applyTrackingCoverFields(record, itemInfo = null, options = {}) {
        if (!record) return record;
        const cover = normalizeTrackingCoverUrl(
            itemInfo?.cover || options.cover || '',
            options.baseUrl || location.href
        );
        if (cover) {
            record.top_cover = cover;
            record.cover_url = cover;
        }
        const avatar = normalizeTrackingCoverUrl(options.avatar || '', options.baseUrl || location.href);
        if (avatar) record.avatar_url = avatar;
        return record;
    }

    function getTrackingGroupMonogram(groupType) {
        const map = {
            actor: '演',
            director: '导',
            maker: '商',
            studio: '牌',
            series: '系',
            tag: '标',
            keyword: '搜',
            custom: '追'
        };
        return map[String(groupType || '').toLowerCase()] || '追';
    }

    function getTrackingDisplayCoverUrl(record) {
        return compactText(record?.avatar_url || record?.top_cover || record?.cover_url || '');
    }

    function buildWorkbenchCoverHtml(record) {
        const coverUrl = getTrackingDisplayCoverUrl(record);
        const groupType = getTrackingEffectiveGroupType(record);
        const mono = getTrackingGroupMonogram(groupType);
        const shapeClass = groupType === 'actor' && record?.avatar_url ? ' is-avatar' : ' is-poster';
        if (coverUrl) {
            return ''
                + '<div class="jlc-wb-cover' + shapeClass + '" data-group="' + escapeHtml(groupType) + '">'
                + '  <img src="' + escapeHtml(coverUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer" draggable="false"'
                + '    onerror="this.style.display=\'none\';var f=this.nextElementSibling;if(f)f.hidden=false;">'
                + '  <span class="jlc-wb-cover-fallback" hidden>' + escapeHtml(mono) + '</span>'
                + '</div>';
        }
        return ''
            + '<div class="jlc-wb-cover is-mono" data-group="' + escapeHtml(groupType) + '">'
            + '  <span class="jlc-wb-cover-fallback">' + escapeHtml(mono) + '</span>'
            + '</div>';
    }

    function getTrackingItemInfoFromNode(node) {
        if (!node) return null;
        const avid = normalizeResourceAvid(
            node.dataset.jlcAvid
            || node.querySelector('date[name="avid"]')?.textContent
            || node.querySelector('.id')?.textContent
            || ''
        );
        if (!avid) return null;
        const title = compactText(
            node.dataset.jlcTitle
            || node.querySelector('a[name="av-title"]')?.getAttribute('title')
            || node.querySelector('a[name="av-title"] span:last-child')?.textContent
            || node.querySelector('.detail-b a')?.getAttribute('title')
            || node.querySelector('.detail-b a')?.textContent
            || node.querySelector('.title')?.textContent
            || ''
        );
        const cover = extractCoverUrlFromNode(node, location.href);
        return { avid, title, cover, node };
    }

    function getTrackingItemNodesFromRoot(root = document) {
        return collectCommanderItems(root).filter(item => item instanceof HTMLElement && item.matches('.item-b'));
    }

    function getFirstTrackingPageItemInfo(root = document) {
        const items = getTrackingItemNodesFromRoot(root);
        for (const item of items) {
            const info = getTrackingItemInfoFromNode(item);
            if (info?.avid) return info;
        }
        return null;
    }

    function getTrackingDocumentItemCount(doc, site) {
        const selector = ConstCode[site]?.itemSelector;
        if (!selector || !doc?.querySelectorAll) return 0;
        return Array.from(doc.querySelectorAll(selector)).reduce((count, node) => {
            return getTrackingRawItemInfo(node, site)?.avid ? (count + 1) : count;
        }, 0);
    }

    function getTrackingAnchorItemInfo(root = document, mode = 'forward') {
        const items = getTrackingItemNodesFromRoot(root);
        const infos = [];
        for (const item of items) {
            const info = getTrackingItemInfoFromNode(item);
            if (info?.avid) infos.push(info);
        }
        if (!infos.length) return null;
        return mode === 'backfill' ? infos[infos.length - 1] : infos[0];
    }

    function getTrackingVisibleRangeInfo(root = document) {
        const infos = [];
        getTrackingItemNodesFromRoot(root).forEach(item => {
            const info = getTrackingItemInfoFromNode(item);
            if (info?.avid) infos.push(info);
        });
        if (!infos.length) {
            return { first: '', last: '', label: '' };
        }
        const first = infos[0].avid || '';
        const last = infos[infos.length - 1].avid || '';
        return {
            first,
            last,
            label: first && last ? (first === last ? first : (first + ' ~ ' + last)) : (first || last || '')
        };
    }

    function getTrackingRawItemInfo(node, site, baseUrl = '') {
        if (!node) return null;
        let avid = '';
        let title = '';
        if (site === 'javlibrary') {
            avid = normalizeResourceAvid(node.querySelector('div.id')?.textContent || '');
            title = compactText(node.querySelector('div.title')?.textContent || node.querySelector('a')?.getAttribute('title') || '');
        } else if (site === 'javdb') {
            avid = normalizeResourceAvid(node.querySelector('div.video-title strong')?.textContent || node.querySelector('strong')?.textContent || '');
            title = compactText(node.querySelector('a')?.getAttribute('title') || node.querySelector('div.video-title')?.textContent || '');
        } else {
            avid = normalizeResourceAvid(node.querySelector('date')?.textContent || '');
            title = compactText(node.querySelector('img')?.getAttribute('title') || node.querySelector('.photo-info')?.textContent || node.querySelector('a')?.getAttribute('title') || '');
        }
        const href = node.querySelector('a')?.getAttribute('href') || '';
        const cover = extractCoverUrlFromNode(node, baseUrl || location.href);
        return avid ? { avid, title, href, cover } : null;
    }

    function getTrackingFirstItemFromDocument(doc, site) {
        const selector = ConstCode[site]?.itemSelector;
        if (!selector) return null;
        const nodes = Array.from(doc.querySelectorAll(selector));
        for (const node of nodes) {
            const info = getTrackingRawItemInfo(node, site);
            if (info?.avid) return info;
        }
        return null;
    }

    function getTrackingAnchorItemFromDocument(doc, site, mode = 'forward') {
        const selector = ConstCode[site]?.itemSelector;
        if (!selector) return null;
        const infos = [];
        Array.from(doc.querySelectorAll(selector)).forEach(node => {
            const info = getTrackingRawItemInfo(node, site);
            if (info?.avid) infos.push(info);
        });
        if (!infos.length) return null;
        return mode === 'backfill' ? infos[infos.length - 1] : infos[0];
    }

    function getTrackingItemInfosFromDocument(doc, site, baseUrl = '') {
        const selector = ConstCode[site]?.itemSelector;
        if (!selector) return [];
        const infos = [];
        Array.from(doc.querySelectorAll(selector)).forEach(node => {
            const info = getTrackingRawItemInfo(node, site, baseUrl);
            if (info?.avid) infos.push(info);
        });
        return infos;
    }

    function estimateTrackingUnreadFromInfos(record, infos, mode = 'forward') {
        const seenCode = normalizeCode(record?.last_seen_avid || '');
        if (!seenCode || !Array.isArray(infos) || !infos.length) return -1;
        const foundIndex = infos.findIndex(info => normalizeCode(info?.avid || '') === seenCode);
        if (foundIndex < 0) return -1;
        return mode === 'backfill'
            ? Math.max(0, infos.length - foundIndex - 1)
            : Math.max(0, foundIndex);
    }

    function normalizeTrackingPageLinkUrl(href, baseUrl) {
        if (!href) return '';
        const parsed = parseTrackingUrl(href, baseUrl || location.href);
        return parsed ? parsed.href : href;
    }

    function getTrackingNextPageUrl(doc, site, baseUrl) {
        const selector = ConstCode[site]?.pageNext;
        if (!selector) return '';
        const anchor = doc.querySelector(selector);
        const href = anchor?.getAttribute?.('href') || anchor?.href || '';
        return normalizeTrackingPageLinkUrl(href, baseUrl);
    }

    function getTrackingPrevPageUrl(doc, site, baseUrl) {
        const selectors = [
            ConstCode[site]?.pagePrev,
            'a.page.prev',
            'a.pagination-previous',
            'a[rel="prev"]',
            'a.prev',
            'a.previous',
            'a#prev'
        ].filter(Boolean);
        for (const selector of selectors) {
            const anchor = doc.querySelector(selector);
            const href = anchor?.getAttribute?.('href') || anchor?.href || '';
            const normalized = normalizeTrackingPageLinkUrl(href, baseUrl);
            if (normalized) return normalized;
        }
        const parsed = parseTrackingUrl(baseUrl || location.href);
        if (!parsed) return '';
        const currentPage = Number(parsed.searchParams.get('page') || parsed.searchParams.get('p') || getCurrentListPageHint(parsed.href, doc) || 0) || 0;
        if (!(currentPage > 1)) return '';
        const paramName = parsed.searchParams.has('page') ? 'page' : (parsed.searchParams.has('p') ? 'p' : 'page');
        const targetPage = currentPage - 1;
        if (targetPage > 1) parsed.searchParams.set(paramName, String(targetPage));
        else parsed.searchParams.delete(paramName);
        return parsed.toString();
    }

    function getTrackingDirectionalPageUrl(doc, site, baseUrl, direction) {
        return direction === 'prev'
            ? getTrackingPrevPageUrl(doc, site, baseUrl)
            : getTrackingNextPageUrl(doc, site, baseUrl);
    }

    function buildTrackingPageRequestOptions(url, referer = '', extra = {}) {
        const headers = Object.assign({
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache'
        }, extra.headers || {});
        const normalizedReferer = compactText(referer || '');
        if (normalizedReferer && !headers.Referer) headers.Referer = normalizedReferer;
        return Object.assign({}, extra, { headers });
    }

    function getTrackingBreakpointSearchDirections(record, currentPageHint = 0) {
        const seenPageHint = Number(record?.last_seen_page_hint || 0) || 0;
        if (seenPageHint > 0 && currentPageHint > seenPageHint) return ['prev', 'next'];
        if (seenPageHint > 0 && currentPageHint < seenPageHint) return ['next', 'prev'];
        const mode = resolveTrackingSearchMode(record, parseTrackingUrl(record?.open_url || record?.page_url || location.href));
        if (mode === 'backfill') return currentPageHint > 1 ? ['next', 'prev'] : ['next', 'prev'];
        return currentPageHint > 1 ? ['prev', 'next'] : ['next', 'prev'];
    }

    function getTrackingBreakpointDirectionLabel(direction) {
        return direction === 'prev' ? '向前' : '向后';
    }

    function getTrackingLastPageInfo(doc, baseUrl) {
        let maxPage = getCurrentListPageHint(baseUrl, doc);
        let maxUrl = '';
        const anchors = Array.from(doc.querySelectorAll('.page_selector a, .pagination a, .pagination-list a, a.page'));
        anchors.forEach(anchor => {
            const href = anchor?.getAttribute?.('href') || anchor?.href || '';
            if (!href) return;
            const parsed = parseTrackingUrl(href, baseUrl || location.href);
            if (!parsed) return;
            let page = Number(parsed.searchParams.get('page') || parsed.searchParams.get('p') || 0);
            if (!(page > 0)) page = parseInt(compactText(anchor), 10) || 0;
            if (page > maxPage) {
                maxPage = page;
                maxUrl = parsed.href;
            }
        });
        return { page: maxPage, url: maxUrl };
    }

    function getTrackingPageDescriptor(site, parsed, doc = document) {
        const pathname = String(parsed?.pathname || '');
        const lowerPath = pathname.toLowerCase();
        const heading = getTrackingHeadingText(doc);
        const visibleRange = getTrackingVisibleRangeInfo(doc);
        let pageType = 'list';
        let groupType = 'custom';
        let queryText = '';
        let groupName = '';

        const setGroup = (nextType, nextName, nextPageType = pageType) => {
            groupType = nextType;
            pageType = nextPageType;
            groupName = compactText(nextName || heading || queryText || '');
        };

        if (site === 'javlibrary') {
            const keyword = parsed?.searchParams?.get('keyword') || parsed?.searchParams?.get('q') || parsed?.searchParams?.get('search') || '';
            const extractedKeyword = extractTrackingSearchKeyword(doc, parsed, heading);
            if (/\/vl_searchbytitle\.php$/i.test(lowerPath)) {
                queryText = extractedKeyword || '';
                const friendlyFallback = visibleRange.label
                    ? ('标题搜索 · ' + visibleRange.label)
                    : buildTrackingSearchFallbackLabel('标题搜索', parsed);
                setGroup('keyword', queryText || friendlyFallback, 'search');
            } else if (/\/vl_searchbycombo\.php$/i.test(lowerPath)) {
                queryText = decodeTrackingSegment(keyword || extractedKeyword || '');
                const friendlyFallback = visibleRange.label
                    ? ('组合搜索 · ' + visibleRange.label)
                    : buildTrackingSearchFallbackLabel('组合搜索', parsed);
                setGroup('keyword', normalizeTrackingQueryLabel(queryText || heading || extractedKeyword) || queryText || friendlyFallback, 'search');
            } else if (keyword) {
                queryText = decodeTrackingSegment(keyword);
                setGroup('keyword', queryText, 'search');
            } else if (/star|actress|actor/i.test(lowerPath + String(parsed?.search || ''))) {
                setGroup('actor', heading || parsed?.searchParams?.get('star') || '', 'actor');
            } else if (/tag|genre/i.test(lowerPath + String(parsed?.search || ''))) {
                setGroup('tag', heading || parsed?.searchParams?.get('tag') || '', 'tag');
            } else if (/director/i.test(lowerPath + String(parsed?.search || ''))) {
                setGroup('director', heading || '', 'director');
            } else if (/maker/i.test(lowerPath + String(parsed?.search || ''))) {
                setGroup('maker', heading || '', 'maker');
            } else if (/label|studio/i.test(lowerPath + String(parsed?.search || ''))) {
                setGroup('studio', heading || '', 'studio');
            } else if (/series/i.test(lowerPath + String(parsed?.search || ''))) {
                setGroup('series', heading || '', 'series');
            } else {
                setGroup('custom', heading || '列表', 'list');
            }
        } else if (site === 'javbus' || site === 'avmoo') {
            if (/\/search\//i.test(lowerPath)) {
                const match = pathname.match(/\/search\/([^/]+)/i);
                queryText = decodeTrackingSegment(match?.[1] || parsed?.searchParams?.get('keyword') || '');
                setGroup('keyword', queryText, 'search');
            } else if (/\/star\//i.test(lowerPath)) {
                setGroup('actor', heading || decodeTrackingSegment(pathname.split('/star/')[1]?.split('/')[0] || ''), 'actor');
            } else if (/\/(?:genre|genres)\//i.test(lowerPath)) {
                setGroup('tag', heading || decodeTrackingSegment(pathname.split('/genre/')[1]?.split('/')[0] || ''), 'tag');
            } else if (/\/director\//i.test(lowerPath)) {
                const segment = pathname.split('/').filter(Boolean).slice(-1)[0] || '';
                setGroup('director', heading || decodeTrackingSegment(segment), 'director');
            } else if (/\/maker\//i.test(lowerPath)) {
                const segment = pathname.split('/').filter(Boolean).slice(-1)[0] || '';
                setGroup('maker', heading || decodeTrackingSegment(segment), 'maker');
            } else if (/\/studio\//i.test(lowerPath)) {
                const segment = pathname.split('/').filter(Boolean).slice(-1)[0] || '';
                setGroup('studio', heading || decodeTrackingSegment(segment), 'studio');
            } else if (/\/series\//i.test(lowerPath)) {
                const segment = pathname.split('/').filter(Boolean).slice(-1)[0] || '';
                setGroup('series', heading || decodeTrackingSegment(segment), 'series');
            } else {
                setGroup('custom', heading || '列表', 'list');
            }
        } else if (site === 'javdb') {
            const keyword = parsed?.searchParams?.get('q') || parsed?.searchParams?.get('keyword') || '';
            if (/\/search/i.test(lowerPath) || keyword) {
                queryText = decodeTrackingSegment(keyword || pathname.split('/search/')[1] || '');
                setGroup('keyword', queryText, 'search');
            } else if (/\/actors?\//i.test(lowerPath)) {
                setGroup('actor', heading || decodeTrackingSegment(pathname.split('/').filter(Boolean).slice(-1)[0] || ''), 'actor');
            } else if (/\/directors?\//i.test(lowerPath)) {
                setGroup('director', heading || decodeTrackingSegment(pathname.split('/').filter(Boolean).slice(-1)[0] || ''), 'director');
            } else if (/\/makers?\//i.test(lowerPath)) {
                setGroup('maker', heading || decodeTrackingSegment(pathname.split('/').filter(Boolean).slice(-1)[0] || ''), 'maker');
            } else if (/\/(?:studios?|publishers?|labels?)\//i.test(lowerPath)) {
                setGroup('studio', heading || decodeTrackingSegment(pathname.split('/').filter(Boolean).slice(-1)[0] || ''), 'studio');
            } else if (/\/series\//i.test(lowerPath)) {
                setGroup('series', heading || decodeTrackingSegment(pathname.split('/').filter(Boolean).slice(-1)[0] || ''), 'series');
            } else if (/\/(?:tags?|categories)\//i.test(lowerPath)) {
                setGroup('tag', heading || decodeTrackingSegment(pathname.split('/').filter(Boolean).slice(-1)[0] || ''), 'tag');
            } else {
                setGroup('custom', heading || '列表', 'list');
            }
        } else {
            setGroup('custom', heading || '列表', 'list');
        }

        const fallbackKeywordLabel = groupType === 'keyword'
            ? buildTrackingSearchFallbackLabel(pageType === 'search' && /combo/i.test(lowerPath) ? '组合搜索' : '标题搜索', parsed)
            : '';
        const pickClean = (...values) => {
            for (const value of values) {
                const text = compactText(value || '');
                if (text && !isTrackingUiChromeLabel(text)) return text;
            }
            return '';
        };
        const pageTitleBare = compactText(doc.title || '').replace(/\s*[-|｜·].*$/, '').trim();
        const resolvedName = pickClean(
            groupName,
            queryText,
            groupType === 'keyword' ? fallbackKeywordLabel : '',
            heading,
            pageTitleBare
        ) || getSiteLabel(site);
        const resolvedQueryText = pickClean(queryText);
        const resolvedRawQuery = groupType === 'keyword'
            ? pickClean(extractTrackingSearchKeyword(doc, parsed, heading), resolvedQueryText)
            : '';
        return {
            page_type: pageType,
            group_type: groupType,
            group_name: resolvedName,
            query_text: resolvedQueryText,
            raw_query: resolvedRawQuery,
            title: getSiteLabel(site) + ' · ' + resolvedName
        };
    }

    function buildTrackingSignature(context) {
        const seedUrl = context?.open_url || context?.pageUrl || location.href;
        const parsed = parseTrackingUrl(seedUrl);
        let identity = compactText(context?.raw_query || context?.query_text || '');
        if (!identity && /javlibrary\./i.test(String(parsed?.hostname || '')) && /\/vl_searchby(?:title|combo)\.php$/i.test(String(parsed?.pathname || '').toLowerCase())) {
            const searchId = compactText(parsed?.searchParams?.get('searchid') || '');
            if (searchId) identity = 'searchid:' + searchId;
        }
        const parts = [
            String(context?.site || '').toLowerCase(),
            String(context?.page_type || '').toLowerCase(),
            buildTrackingCanonicalUrl(seedUrl),
            identity
        ];
        return normalizeCode(parts.join('|'));
    }

    function getCurrentTrackingPageContext(doc = document, url = location.href) {
        const site = String(currentWeb || '').toLowerCase();
        if (!site || !ConstCode[site]) return null;
        const itemNodes = getTrackingItemNodesFromRoot(doc);
        if (!itemNodes.length) return null;
        const parsed = parseTrackingUrl(url);
        if (!parsed) return null;
        const descriptor = getTrackingPageDescriptor(site, parsed, doc);
        const searchMode = detectTrackingSearchMode(site, parsed);
        const openUrl = buildTrackingOpenUrl(site, parsed, descriptor);
        const firstItem = getTrackingAnchorItemInfo(doc, searchMode) || getFirstTrackingPageItemInfo(doc);
        const pageHint = getCurrentListPageHint(parsed.href, doc);
        const context = {
            site,
            siteLabel: getSiteLabel(site),
            open_url: openUrl,
            pageUrl: parsed.href,
            page_type: descriptor.page_type,
            group_type: descriptor.group_type,
            group_name: descriptor.group_name,
            query_text: descriptor.query_text,
            raw_query: descriptor.raw_query,
            title: descriptor.title,
            firstItem,
            itemNodes,
            page_hint: pageHint,
            page_size_hint: itemNodes.length || 0,
            search_mode: searchMode
        };
        context.query_signature = buildTrackingSignature(context);
        return context;
    }

    function formatRelativeTime(value) {
        if (!value) return '未记录';
        const time = new Date(value).getTime();
        if (!Number.isFinite(time)) return '未记录';
        const diff = Date.now() - time;
        if (diff < 60 * 1000) return '刚刚';
        if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + ' 分钟前';
        if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + ' 小时前';
        if (diff < 30 * 24 * 60 * 60 * 1000) return Math.floor(diff / (24 * 60 * 60 * 1000)) + ' 天前';
        return formatDateTime(value);
    }

    function formatDateTime(value) {
        if (!value) return '未记录';
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) return '未记录';
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
            + ' ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
    }

    /** 展示标题里去掉「JavLibrary · 」等站点前缀（站点已有胶囊） */
    function stripTrackingSiteTitlePrefix(value, site = '') {
        let text = compactText(value || '');
        if (!text) return '';
        const labels = [
            getSiteLabel(site),
            'JavLibrary', 'JAVLibrary', 'javlibrary', 'JavLib', 'Jav Library',
            'JavBus', 'javbus', 'JavDB', 'javdb', 'Avmoo', 'avmoo', 'JLC'
        ].filter(Boolean);
        const seen = new Set();
        for (const label of labels) {
            const key = String(label).toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            const escaped = String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            text = text.replace(new RegExp('^' + escaped + '\\s*[·•|\\-—–:]\\s*', 'i'), '');
        }
        text = text.replace(/^(?:jav\s*library|javlibrary|javbus|javdb|avmoo|jlc)\s*[·•|\-—–:]\s*/i, '');
        return compactText(text);
    }

    function getTrackingDisplayTitle(record, fallbackContext = null) {
        const site = record?.site || fallbackContext?.site || '';
        const custom = stripTrackingSiteTitlePrefix(record?.custom_label || '', site);
        if (custom && !isTrackingUiChromeLabel(custom)) return custom;
        const fallback = fallbackContext || {};
        const candidates = [
            record?.group_name, // 优先纯名称，避免「站点 · 名」冗余
            record?.query_text,
            record?.raw_query,
            record?.title,
            fallback.group_name,
            fallback.query_text,
            fallback.raw_query,
            fallback.title,
            record?.id,
            '当前搜索'
        ];
        for (const item of candidates) {
            const text = stripTrackingSiteTitlePrefix(item, site);
            if (text && !isTrackingUiChromeLabel(text) && !/^https?:\/\//i.test(text)) return text;
        }
        return '当前搜索';
    }

    function promptTrackingCustomLabel(record = null, context = null) {
        const defaultValue = getTrackingDisplayTitle(record, context);
        const result = window.prompt('请输入追更备注名（可留空使用自动标题）', defaultValue);
        if (result == null) return null;
        const value = compactText(result);
        if (!value || value === defaultValue) return '';
        return value;
    }

    function getTrackingUnreadMetrics(record) {
        const topCode = normalizeCode(record?.top_avid || '');
        const seenCode = normalizeCode(record?.last_seen_avid || '');
        const hasUpdate = !!topCode && !!seenCode && topCode !== seenCode;
        const topPage = Number(record?.top_page_hint || 0) || 0;
        const seenPage = Number(record?.last_seen_page_hint || 0) || 0;
        const unreadEstimate = Number(record?.unread_estimate || 0) || 0;
        const pageSizeHint = Number(record?.page_size_hint || 0) || 0;
        const pageDelta = topPage > 0 && seenPage > 0 ? Math.abs(topPage - seenPage) : 0;
        const estimatedCount = hasUpdate
            ? ((pageDelta > 0 && pageSizeHint > 0)
                ? (pageDelta * pageSizeHint + unreadEstimate)
                : unreadEstimate)
            : 0;
        return {
            hasUpdate,
            topPage,
            seenPage,
            unreadEstimate,
            pageSizeHint,
            pageDelta,
            estimatedCount: estimatedCount > 0 ? estimatedCount : 0
        };
    }

    function getTrackingUnreadSummary(record) {
        const metrics = getTrackingUnreadMetrics(record);
        if (!metrics.hasUpdate) return '';
        if (metrics.estimatedCount > 0) {
            const parts = ['约 ' + metrics.estimatedCount + ' 条更新'];
            if (metrics.pageDelta > 0) parts.push('跨 ' + metrics.pageDelta + ' 页');
            return parts.join(' · ');
        }
        if (metrics.pageDelta > 0) return '跨 ' + metrics.pageDelta + ' 页以上';
        const mode = resolveTrackingSearchMode(record, parseTrackingUrl(record?.open_url || record?.page_url || ''));
        return mode === 'backfill' ? '尾页内有更新' : '本页内有更新';
    }

    function getTrackingUnreadPillText(record) {
        const metrics = getTrackingUnreadMetrics(record);
        if (!metrics.hasUpdate) return '';
        if (metrics.estimatedCount > 0) return '+' + metrics.estimatedCount;
        if (metrics.pageDelta > 0) return '+' + metrics.pageDelta + '页';
        if (metrics.unreadEstimate > 0) return '+' + metrics.unreadEstimate;
        return '+?';
    }

    function buildTrackingStatus(record) {
        const topCode = normalizeCode(record?.top_avid || '');
        const seenCode = normalizeCode(record?.last_seen_avid || '');
        const unreadSummary = getTrackingUnreadSummary(record);
        if (record?.check_status === 'cf_required') {
            return { tone: 'yellow', text: '待验证', note: record.check_note || '需要先通过 Cloudflare 验证' };
        }
        if (record?.check_status === 'error') {
            return { tone: 'red', text: '检查失败', note: record.check_note || '请求失败' };
        }
        if (topCode && seenCode && topCode !== seenCode) {
            const noteParts = ['最新 ' + (record.top_avid || '')];
            if (unreadSummary) noteParts.push(unreadSummary);
            return { tone: 'red', text: getTrackingUnreadPillText(record) || '+?', note: noteParts.join(' · ') };
        }
        if (seenCode && topCode && seenCode === topCode) {
            return { tone: 'green', text: '已读', note: '已追到 ' + (record.last_seen_avid || '') };
        }
        if (record?.last_check_at) {
            return { tone: 'yellow', text: '已检查', note: formatRelativeTime(record.last_check_at) };
        }
        return { tone: 'gray', text: '未检查', note: record?.last_browsed_at ? ('最后浏览 ' + formatRelativeTime(record.last_browsed_at)) : '尚未浏览' };
    }

    function buildTrackingPageHintSummary(record, options = {}) {

        const parts = [];
        const topPage = Number(record?.top_page_hint || 0) || 0;
        const seenPage = Number(record?.last_seen_page_hint || 0) || 0;
        const browsedPage = Number(record?.last_browsed_page_hint || 0) || 0;
        const includeBrowsed = !!options.includeBrowsed;
        if (topPage > 0) parts.push('最新第' + topPage + '页');
        if (seenPage > 0) parts.push('断点第' + seenPage + '页');
        if (includeBrowsed && browsedPage > 0 && browsedPage !== seenPage && browsedPage !== topPage) {
            parts.push('浏览第' + browsedPage + '页');
        }
        return parts;
    }

    function isTransientTrackingErrorNote(note = '') {
        const value = String(note || '');
        if (!value) return false;
        return /(请求超时|网络失败|HTTP 403|HTTP 429|HTTP 503|Cloudflare|暂时限制刷新|返回的不是 JSON|未拿到新的 searchid|列表检查失败|尾页检查失败|重建搜索失败)/i.test(value);
    }

    function normalizeTrackingRuntimeRecord(record) {
        if (!record || typeof record !== 'object') return record;
        if (record.check_status === 'error'
            && isTransientTrackingErrorNote(record.check_note)
            && (compactText(record.top_avid || '') || compactText(record.last_seen_avid || ''))) {
            record.last_refresh_error_at = record.last_refresh_error_at || record.last_check_at || '';
            record.last_refresh_error_note = record.last_refresh_error_note || record.check_note || '';
            record.check_status = deriveTrackingStatusFromSnapshot(record);
            if (record.check_status === 'latest') record.check_note = '已追到最新';
            else if (record.check_status === 'updated') record.check_note = record.top_avid ? ('发现新番号 ' + record.top_avid) : '发现新更新';
            else if (record.check_status === 'checked') record.check_note = '已检查';
            else record.check_note = '';
        }
        return record;
    }

    async function getTrackingSearches() {
        const list = await getAllFromStore(TRACKING_STORE);
        return (Array.isArray(list) ? list : [])
            .filter(Boolean)
            .map(record => normalizeTrackingRuntimeRecord(record))
            .sort((a, b) => {
                const aTime = Date.parse(a.created_at || a.updated_at || a.last_check_at || a.last_browsed_at || 0) || 0;
                const bTime = Date.parse(b.created_at || b.updated_at || b.last_check_at || b.last_browsed_at || 0) || 0;
                return Number(!!b.pinned) - Number(!!a.pinned) || aTime - bTime;
            });
    }

    async function getTrackingRecordBySignature(signature, openUrl = '') {
        const list = await getTrackingSearches();
        const canonical = buildTrackingCanonicalUrl(openUrl || '');
        return list.find(record => record.query_signature === signature)
            || list.find(record => buildTrackingCanonicalUrl(record.open_url || '') === canonical)
            || null;
    }

    async function saveTrackingRecord(record) {
        if (!record?.id) return null;
        record.updated_at = new Date().toISOString();
        await setVal(TRACKING_STORE, record);
        return record;
    }

    async function createOrUpdateTrackingFromContext(context = getCurrentTrackingPageContext(), options = {}) {
        if (!context) return null;
        const existing = await getTrackingRecordBySignature(context.query_signature, context.open_url);
        if (!existing && options.createIfMissing === false) return null;
        const now = new Date().toISOString();
        const firstItem = context.firstItem || getFirstTrackingPageItemInfo(document);
        const pageHint = Number(context.page_hint || 0) || 1;
        const pageSizeHint = Number(context.page_size_hint || 0) || 0;
        const contextParsed = parseTrackingUrl(context.pageUrl || context.open_url || location.href);
        const searchMode = resolveTrackingSearchMode({ site: context.site, search_mode: context.search_mode }, contextParsed);
        const record = existing || {
            id: 'trk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            created_at: now,
            archived: false,
            pinned: false,
            unread_estimate: 0,
            check_status: 'unchecked',
            check_note: ''
        };
        const previousTop = record.top_avid || '';
        record.site = context.site;
        record.page_type = context.page_type;
        record.group_type = context.group_type;
        // 禁止把工作台 UI 文案（如「资源增强」）写进追更标题；已有好标题时不被污染覆盖
        const nextGroupName = compactText(context.group_name || '');
        const nextTitle = compactText(context.title || '');
        const nextQueryText = compactText(context.query_text || '');
        const nextRawQuery = compactText(context.raw_query || '');
        if (!existing) {
            record.group_name = isTrackingUiChromeLabel(nextGroupName) ? '' : nextGroupName;
            record.title = isTrackingUiChromeLabel(nextTitle) ? '' : nextTitle;
            record.query_text = isTrackingUiChromeLabel(nextQueryText) ? '' : nextQueryText;
            record.raw_query = isTrackingUiChromeLabel(nextRawQuery) ? '' : nextRawQuery;
        } else {
            if (shouldAdoptTrackingLabel(nextGroupName, record.group_name)) {
                record.group_name = nextGroupName;
            } else if (isTrackingUiChromeLabel(record.group_name)) {
                record.group_name = '';
            }
            if (shouldAdoptTrackingLabel(nextTitle, record.title)) {
                record.title = nextTitle;
            } else if (isTrackingUiChromeLabel(record.title)) {
                record.title = '';
            }
            if (shouldAdoptTrackingLabel(nextQueryText, record.query_text)) {
                record.query_text = nextQueryText;
            } else if (isTrackingUiChromeLabel(record.query_text)) {
                record.query_text = '';
            }
            if (shouldAdoptTrackingLabel(nextRawQuery, record.raw_query)) {
                record.raw_query = nextRawQuery;
            } else if (isTrackingUiChromeLabel(record.raw_query)) {
                record.raw_query = '';
            }
            // 标题被清空时，尽量用仍干净的字段拼回展示标题
            if (!compactText(record.title || '')) {
                const recoverName = compactText(record.group_name || record.query_text || record.raw_query || '');
                if (recoverName && !isTrackingUiChromeLabel(recoverName)) {
                    record.title = getSiteLabel(record.site) + ' · ' + recoverName;
                }
            }
        }
        record.page_url = context.pageUrl || record.page_url || '';
        record.open_url = context.open_url;
        record.query_signature = context.query_signature;
        record.search_mode = searchMode;
        if (pageSizeHint > 0) {
            record.page_size_hint = Math.max(Number(record.page_size_hint || 0) || 0, pageSizeHint);
        }
        if (Object.prototype.hasOwnProperty.call(options, 'customLabel')) {
            record.custom_label = compactText(options.customLabel || '');
        }

        const shouldAdoptContextTop = (() => {
            if (!firstItem?.avid || options.checkTop === false) return false;
            if (!existing || !record.top_avid) return true;
            if (searchMode === 'forward') return pageHint <= 1;
            if (searchMode === 'backfill') {
                const knownTopPage = Number(record.top_page_hint || 0) || 0;
                return knownTopPage > 0
                    && knownTopPage === pageHint
                    && normalizeCode(record.top_avid || '') === normalizeCode(firstItem.avid || '');
            }
            return pageHint <= 1;
        })();

        const pageBaseUrl = context.pageUrl || context.open_url || location.href;
        const pageAvatar = extractTrackingAvatarFromDocument(document, context.group_type || record.group_type, pageBaseUrl);
        if (pageAvatar) record.avatar_url = pageAvatar;
        if (shouldAdoptContextTop) {
            record.top_avid = firstItem.avid;
            record.top_title = firstItem.title || record.top_title || '';
            record.top_page_hint = pageHint;
            applyTrackingCoverFields(record, firstItem, { baseUrl: pageBaseUrl, avatar: pageAvatar });
            if (options.updateCheck !== false) {
                record.top_checked_at = now;
                record.last_check_at = now;
                if (record.last_seen_avid && normalizeCode(record.last_seen_avid) === normalizeCode(firstItem.avid)) {
                    record.check_status = 'latest';
                    record.check_note = '已追到最新';
                } else if (!previousTop || normalizeCode(previousTop) !== normalizeCode(firstItem.avid)) {
                    record.check_status = record.last_seen_avid ? 'updated' : 'checked';
                    record.check_note = (record.last_seen_avid ? '发现新番号 ' : '最新 ') + firstItem.avid;
                } else if (!record.check_status || record.check_status === 'unchecked') {
                    record.check_status = 'checked';
                    record.check_note = '已检查';
                }
            } else if (!record.top_checked_at) {
                record.top_checked_at = now;
            }
        } else if (firstItem?.cover && !getTrackingDisplayCoverUrl(record)) {
            // 未采纳 top 时，若仍无封面，用当前页可见首图顶一下空槽
            applyTrackingCoverFields(record, firstItem, { baseUrl: pageBaseUrl, avatar: pageAvatar });
        }

        if (options.touchBrowse) {
            record.last_browsed_at = now;
            record.last_browsed_page_hint = pageHint;
            record.last_browsed_avid = firstItem?.avid || record.last_browsed_avid || '';
            record.last_browsed_title = firstItem?.title || record.last_browsed_title || '';
        }

        if (options.seedSeen && !record.last_seen_avid && firstItem?.avid) {
            record.last_seen_avid = firstItem.avid;
            record.last_seen_title = firstItem.title || '';
            record.last_seen_at = now;
            record.last_seen_page_hint = pageHint;
            record.last_found_at = now;
            record.unread_estimate = 0;
            record.check_status = 'latest';
            record.check_note = '初始断点已设为当前首项';
        }

        if (options.explicitLastSeen?.avid) {
            record.last_seen_avid = options.explicitLastSeen.avid;
            record.last_seen_title = options.explicitLastSeen.title || '';
            record.last_seen_at = now;
            record.last_seen_page_hint = options.explicitLastSeen.page_hint || pageHint;
            record.last_found_at = now;
            const explicitUnreadEstimate = Number(options.explicitLastSeen.unread_estimate);
            if (Number.isFinite(explicitUnreadEstimate) && explicitUnreadEstimate >= 0) {
                record.unread_estimate = Math.max(0, Math.floor(explicitUnreadEstimate));
            }
            record.check_status = record.top_avid && normalizeCode(record.top_avid) === normalizeCode(record.last_seen_avid) ? 'latest' : 'checked';
            record.check_note = '断点已更新';
        }

        await saveTrackingRecord(record);
        return record;
    }

    async function markTrackingRecordRead(recordId, source = 'top') {
        const list = await getTrackingSearches();
        const record = list.find(item => item.id === recordId);
        if (!record) return null;
        const now = new Date().toISOString();
        const target = source === 'browse'
            ? { avid: record.last_browsed_avid, title: record.last_browsed_title }
            : { avid: record.top_avid, title: record.top_title };
        if (!target.avid) return null;
        const searchMode = resolveTrackingSearchMode(record, parseTrackingUrl(record.open_url || ''));
        const pageHint = source === 'browse'
            ? (Number(record.last_browsed_page_hint || record.top_page_hint || record.last_seen_page_hint || 0) || 1)
            : (searchMode === 'backfill'
                ? (Number(record.top_page_hint || record.last_browsed_page_hint || record.last_seen_page_hint || 0) || 1)
                : 1);
        record.last_seen_avid = target.avid;
        record.last_seen_title = target.title || '';
        record.last_seen_at = now;
        record.last_seen_page_hint = pageHint;
        record.last_found_at = now;
        record.unread_estimate = 0;
        record.check_status = 'latest';
        record.check_note = '已设为已读';
        await saveTrackingRecord(record);
        if (trackingPageState.record?.id === record.id) {
            trackingPageState.record = record;
            applyTrackingPageDecorations(record);
            ensureTrackingPageBar({ context: trackingPageState.context, record });
            refreshTrackingToolbarButtons();
        }
        return record;
    }

    function isTrackingVerificationRequired(record, response) {
        if (!response) return false;
        if (String(record?.site || '').toLowerCase() !== 'javlibrary') return false;
        if (response.blockedByChallenge) return true;
        const responseText = String(response.responseText || '');
        return isChallengePage(responseText)
            || isLikelyBotGuardResponse(responseText)
            || [403, 429, 503].includes(Number(response.status || 0));
    }

    function buildTrackingVerifyUrl(record) {
        return compactText(record?.pending_verify_url || '')
            || buildTrackingNavigationUrl(record)
            || record?.open_url
            || record?.page_url
            || '';
    }

    function deriveTrackingStatusFromSnapshot(record) {
        const topCode = normalizeCode(record?.top_avid || '');
        const seenCode = normalizeCode(record?.last_seen_avid || '');
        if (topCode && seenCode) return topCode === seenCode ? 'latest' : 'updated';
        if (topCode) return 'checked';
        return 'unchecked';
    }

    function clearTrackingVerificationRequired(record, options = {}) {
        if (!record || typeof record !== 'object') return record;
        record.pending_verify_url = '';
        record.verify_required_at = '';
        if (record.check_status === 'cf_required' && options.restoreStatus !== false) {
            record.check_status = deriveTrackingStatusFromSnapshot(record);
            if (!compactText(record.check_note || '') || /cloudflare|验证/i.test(String(record.check_note || ''))) {
                if (record.check_status === 'latest') record.check_note = '已追到最新';
                else if (record.check_status === 'updated') record.check_note = record.top_avid ? ('发现新番号 ' + record.top_avid) : '发现新更新';
                else if (record.check_status === 'checked') record.check_note = '已检查';
                else record.check_note = '';
            }
        }
        return record;
    }

    function preserveTrackingStatusOnRefreshFailure(record, note, now, options = {}) {
        const preserve = !!options.preserveStatus
            && (!!compactText(record?.top_avid || '')
                || !!compactText(record?.last_seen_avid || '')
                || ['latest', 'updated', 'checked'].includes(String(record?.check_status || '')));
        record.last_check_at = now;
        record.last_refresh_error_at = now;
        record.last_refresh_error_note = note || '';
        if (preserve) {
            clearTrackingVerificationRequired(record, { restoreStatus: true });
            return record;
        }
        record.check_status = 'error';
        record.check_note = note || '请求失败';
        return record;
    }

    async function probeTrackingVerificationReady(record, verifyUrl) {
        const targetUrl = compactText(verifyUrl || buildTrackingVerifyUrl(record) || '');
        if (!targetUrl) return { ok: true, skipped: true };
        const target = parseTrackingUrl(targetUrl, location.href);
        const current = parseTrackingUrl(location.href, location.href);
        if (!target || !current || target.origin !== current.origin) {
            return { ok: true, skipped: true, url: targetUrl };
        }
        const probeRecord = record || { site: 'javlibrary' };
        const response = await requestPageWithBrowserFetch(targetUrl, { timeout: 12000 });
        if (isTrackingVerificationRequired(probeRecord, response)) {
            return { ok: false, url: targetUrl, response, note: '验证尚未生效' };
        }
        if (!response.ok || !response.responseText) {
            return { ok: false, url: targetUrl, response, note: describeRequestStatus(response, '验证页请求失败') };
        }
        return { ok: true, url: targetUrl, response };
    }

    function hasPendingTrackingVerification(record) {
        return record?.check_status === 'cf_required'
            || !!compactText(record?.pending_verify_url || '');
    }

    function openTrackingVerificationUrl(verifyUrl, options = {}) {
        const normalizedUrl = compactText(verifyUrl || '');
        if (!normalizedUrl) return false;
        const opened = window.open(normalizedUrl, '_blank', 'noopener');
        if (!opened && options.fallbackToNavigate) {
            location.href = normalizedUrl;
            return true;
        }
        return !!opened;
    }

    function markTrackingVerificationRequired(record, verifyUrl, note = '') {
        record.check_status = 'cf_required';
        record.check_note = note || '遇到 Cloudflare 验证，先手动验证后再继续刷新';
        record.pending_verify_url = compactText(verifyUrl || buildTrackingVerifyUrl(record) || '');
        record.verify_required_at = new Date().toISOString();
        return record;
    }

    async function refreshSingleTrackingRecord(recordOrId, options = {}) {
        const list = await getTrackingSearches();
        const record = typeof recordOrId === 'string'
            ? list.find(item => item.id === recordOrId)
            : list.find(item => item.id === recordOrId?.id) || recordOrId;
        if (!record?.open_url || !record.site) return null;
        const now = new Date().toISOString();
        const preserveStatusOnFailure = !!options.silent || !!options.preserveStatusOnFailure;
        let requestSeedUrl = '';

        if (hasPendingTrackingVerification(record)) {
            clearTrackingVerificationRequired(record, { restoreStatus: true });
        }

        if (isJavLibraryResolvableSearchUrl(record.page_url || record.open_url || '')) {
            const searchQuery = getTrackingSearchQuery(record);
            if (!searchQuery) {
                record.last_check_at = now;
                record.check_status = 'error';
                record.check_note = '缺少原搜索词，无法刷新已过期搜索';
                await saveTrackingRecord(record);
                return record;
            }
            applyTrackingSearchQuery(record, searchQuery);
            const resolved = await resolveJavLibrarySearchUrl(record, { keyword: searchQuery, pageHint: 1 });
            if (!resolved.ok || !resolved.url) {
                const resolvedError = String(resolved.error || '');
                const rebuildNote = resolved.rateLimited
                    ? 'JavLibrary 暂时限制刷新，请稍后再试'
                    : '重建搜索失败 · ' + (resolvedError || '未知错误');
                if (resolved.cfRequired || /403|cloudflare|challenge|forbidden|验证/i.test(resolvedError)) {
                    record.last_check_at = now;
                    markTrackingVerificationRequired(record, buildTrackingNavigationUrl(record), '重建搜索时遇到 Cloudflare 验证');
                } else {
                    preserveTrackingStatusOnRefreshFailure(record, rebuildNote, now, {
                        preserveStatus: preserveStatusOnFailure || !!resolved.rateLimited
                    });
                }
                await saveTrackingRecord(record);
                return record;
            }
            requestSeedUrl = resolved.url;
            record.open_url = resolved.url;
        } else {
            const normalizedOpenUrl = buildTrackingOpenUrl(record.site, record.open_url || record.page_url || '', record || {}) || record.open_url || record.page_url;
            requestSeedUrl = isTrackingResolvableOpenUrl(normalizedOpenUrl)
                ? normalizedOpenUrl
                : (record.page_url || record.open_url || normalizedOpenUrl);
            if (normalizedOpenUrl && normalizedOpenUrl !== record.open_url && isTrackingResolvableOpenUrl(normalizedOpenUrl)) {
                record.open_url = normalizedOpenUrl;
            } else if ((!record.open_url || !isTrackingResolvableOpenUrl(record.open_url)) && requestSeedUrl) {
                record.open_url = requestSeedUrl;
            }
        }
        const openParsed = parseTrackingUrl(requestSeedUrl || record.open_url || '');
        const searchMode = resolveTrackingSearchMode(record, openParsed);
        const response = await requestPageWithBrowserFetch(requestSeedUrl || record.open_url, { timeout: 18000 });
        if (isTrackingVerificationRequired(record, response)) {
            record.last_check_at = now;
            markTrackingVerificationRequired(record, requestSeedUrl || record.open_url, '列表检查遇到 Cloudflare 验证');
            await saveTrackingRecord(record);
            return record;
        }
        if (!response.ok || !response.responseText) {
            preserveTrackingStatusOnRefreshFailure(record, '列表检查失败 · ' + describeRequestStatus(response, '请求失败'), now, {
                preserveStatus: preserveStatusOnFailure
            });
            await saveTrackingRecord(record);
            return record;
        }
        const baseDoc = new DOMParser().parseFromString(response.responseText, 'text/html');
        const baseItemCount = getTrackingDocumentItemCount(baseDoc, record.site);
        const buildPagedUrl = (seedUrl, page) => {
            const parsed = parseTrackingUrl(seedUrl || record.open_url || '');
            if (!parsed) return seedUrl || record.open_url || '';
            if (page > 1) parsed.searchParams.set('page', String(page));
            else parsed.searchParams.delete('page');
            return parsed.toString();
        };

        let targetDoc = baseDoc;
        let targetUrl = requestSeedUrl || record.open_url;
        let topPageHint = Number(getCurrentListPageHint(requestSeedUrl || record.open_url, baseDoc) || 0) || 1;

        if (String(record.site || '').toLowerCase() === 'javlibrary' && searchMode === 'backfill') {
            const lastPageInfo = getTrackingLastPageInfo(baseDoc, requestSeedUrl || record.open_url);
            const lastPage = Number(lastPageInfo.page || 0) || topPageHint || 1;
            if (lastPage > 0) topPageHint = lastPage;
            const basePageHint = Number(getCurrentListPageHint(requestSeedUrl || record.open_url, baseDoc) || 0) || 1;
            targetUrl = lastPageInfo.url || buildPagedUrl(requestSeedUrl || record.open_url, topPageHint);
            if (topPageHint > 1 && topPageHint != basePageHint) {
                const tailResponse = await requestPageWithBrowserFetch(targetUrl, { timeout: 18000 });
                if (isTrackingVerificationRequired(record, tailResponse)) {
                    record.last_check_at = now;
                    markTrackingVerificationRequired(record, targetUrl, '尾页检查遇到 Cloudflare 验证');
                    await saveTrackingRecord(record);
                    return record;
                }
                if (!tailResponse.ok || !tailResponse.responseText) {
                    preserveTrackingStatusOnRefreshFailure(record, '尾页检查失败 · ' + describeRequestStatus(tailResponse, '请求失败'), now, {
                        preserveStatus: preserveStatusOnFailure
                    });
                    await saveTrackingRecord(record);
                    return record;
                }
                targetDoc = new DOMParser().parseFromString(tailResponse.responseText, 'text/html');
            }
        }

        const targetItemCount = getTrackingDocumentItemCount(targetDoc, record.site);
        const targetInfos = getTrackingItemInfosFromDocument(targetDoc, record.site, targetUrl || requestSeedUrl || record.open_url || '');
        const pageUnreadEstimate = estimateTrackingUnreadFromInfos(record, targetInfos, searchMode);
        const firstItem = (searchMode === 'backfill' ? targetInfos[targetInfos.length - 1] : targetInfos[0])
            || getTrackingAnchorItemFromDocument(targetDoc, record.site, searchMode)
            || getTrackingFirstItemFromDocument(targetDoc, record.site);
        record.last_check_at = now;
        record.top_checked_at = now;
        record.search_mode = searchMode;
        record.pending_verify_url = '';
        record.verify_required_at = '';
        record.last_refresh_error_at = '';
        record.last_refresh_error_note = '';
        if (topPageHint > 0) record.top_page_hint = topPageHint;
        if (Math.max(baseItemCount, targetItemCount) > 0) {
            record.page_size_hint = Math.max(Number(record.page_size_hint || 0) || 0, baseItemCount, targetItemCount);
        }
        if (!firstItem?.avid) {
            record.check_status = 'error';
            record.check_note = '未解析到首个番号';
            await saveTrackingRecord(record);
            return record;
        }
        const previousTop = record.top_avid || '';
        const previousUnreadEstimate = Number(record.unread_estimate || 0) || 0;
        record.top_avid = firstItem.avid;
        record.top_title = firstItem.title || '';
        applyTrackingCoverFields(record, firstItem, {
            baseUrl: targetUrl || requestSeedUrl || record.open_url || location.href,
            avatar: extractTrackingAvatarFromDocument(targetDoc, record.group_type, targetUrl || requestSeedUrl || record.open_url || location.href)
                || extractTrackingAvatarFromDocument(baseDoc, record.group_type, requestSeedUrl || record.open_url || location.href)
        });
        if (record.last_seen_avid && normalizeCode(record.last_seen_avid) === normalizeCode(record.top_avid)) {
            record.check_status = 'latest';
            record.check_note = '已追到最新';
            record.unread_estimate = 0;
        } else {
            if (pageUnreadEstimate >= 0) {
                record.unread_estimate = pageUnreadEstimate;
            } else if (record.last_seen_avid) {
                const fallbackUnreadEstimate = (!previousTop || normalizeCode(previousTop) !== normalizeCode(record.top_avid))
                    ? Math.max(1, previousUnreadEstimate)
                    : Math.max(1, previousUnreadEstimate || 0);
                record.unread_estimate = fallbackUnreadEstimate;
            }
            if (!previousTop || normalizeCode(previousTop) !== normalizeCode(record.top_avid)) {
                record.check_status = 'updated';
                record.check_note = '发现新番号 ' + record.top_avid;
            } else {
                record.check_status = 'checked';
                record.check_note = '已检查';
            }
        }
        await saveTrackingRecord(record);
        if (!options.silent && trackingPageState.record?.id === record.id) {
            trackingPageState.record = record;
            ensureTrackingPageBar({ context: trackingPageState.context, record });
        }
        return record;
    }

    function isTrackingRefreshRateLimited(record) {

        return String(record?.site || '').toLowerCase() === 'javlibrary'
            && isJavLibraryResolvableSearchUrl(record?.page_url || record?.open_url || '');
    }

    function getTrackingRefreshBucket(record) {
        return isTrackingRefreshRateLimited(record)
            ? 'javlibrary-search-rebuild'
            : ('record:' + String(record?.id || 'unknown'));
    }

    function getTrackingRefreshCooldownMs(record) {
        return isTrackingRefreshRateLimited(record) ? (5 * 60 * 1000) : 0;
    }

    function pickNextTrackingRefreshRecord(pending, bucketLastRunAt, nowMs = Date.now()) {
        let minWaitMs = Infinity;
        for (let index = 0; index < pending.length; index += 1) {
            const record = pending[index];
            const cooldownMs = getTrackingRefreshCooldownMs(record);
            if (!(cooldownMs > 0)) {
                return { index, record, waitMs: 0 };
            }
            const bucket = getTrackingRefreshBucket(record);
            const lastRunAt = Number(bucketLastRunAt.get(bucket) || 0) || 0;
            const readyAt = lastRunAt + cooldownMs;
            if (readyAt <= nowMs) {
                return { index, record, waitMs: 0 };
            }
            minWaitMs = Math.min(minWaitMs, readyAt - nowMs);
        }
        return {
            index: -1,
            record: null,
            waitMs: Number.isFinite(minWaitMs) ? Math.max(0, minWaitMs) : 0
        };
    }

    async function refreshAllTrackingSearches(button, options = {}) {
        const requestedIds = Array.isArray(options.recordIds) ? options.recordIds.filter(Boolean) : null;
        let list = (await getTrackingSearches()).filter(record => !record.archived);
        if (requestedIds?.length) {
            const byId = new Map(list.map(record => [record.id, record]));
            list = requestedIds.map(id => byId.get(id)).filter(Boolean);
            if (options.resumeVerified) clearTrackingRefreshResumeState();
        } else {
            clearTrackingRefreshResumeState();
        }
        if (!list.length) {
            showAlert('当前没有可刷新的追更项。');
            return;
        }
        const pending = list.slice();
        const bucketLastRunAt = new Map();
        let completed = Number(options.completedBase || 0) || 0;
        const total = Number(options.total || 0) || (requestedIds?.length ? (completed + list.length) : list.length);
        let pausedForVerification = false;
        setTrackingRefreshRuntimeState({
            phase: 'refreshing',
            completed,
            total,
            note: requestedIds?.length ? '继续剩余队列' : '开始扫描'
        });
        await renderTrackingUI();
        try {
            while (pending.length) {
                const nextTask = pickNextTrackingRefreshRecord(pending, bucketLastRunAt, Date.now());
                if (!nextTask.record) {
                    const waitMs = Math.min(Math.max(1500, nextTask.waitMs || 1500), 5 * 60 * 1000);
                    await waitTrackingRefreshCountdown(waitMs, remainingMs => {
                        setTrackingRefreshRuntimeState({
                            phase: 'cooldown',
                            completed,
                            total,
                            remainingMs,
                            note: 'JavLibrary 冷却桶'
                        });
                        void renderTrackingUI();
                    });
                    continue;
                }
                const [record] = pending.splice(nextTask.index, 1);
                const cooldownNote = getTrackingRefreshCooldownMs(record) > 0 ? 'JavLibrary 冷却桶' : '请求中';
                setTrackingRefreshRuntimeState({
                    phase: 'refreshing',
                    completed,
                    total,
                    remainingMs: 0,
                    note: cooldownNote
                });
                await renderTrackingUI();
                const refreshed = await refreshSingleTrackingRecord(record, { silent: true });
                if (refreshed?.check_status === 'cf_required') {
                    pausedForVerification = true;
                    const pendingIds = [refreshed.id, ...pending.map(item => item.id)];
                    const verifyUrl = buildTrackingVerifyUrl(refreshed);
                    setTrackingRefreshResumeState({
                        pending_ids: pendingIds,
                        total,
                        completed,
                        record_id: refreshed.id,
                        verify_url: verifyUrl,
                        note: refreshed.check_note || '',
                        paused_at: new Date().toISOString()
                    });
                    setTrackingRefreshRuntimeState(null);
                    await renderTrackingUI();
                    const opened = openTrackingVerificationUrl(verifyUrl);
                    showAlert(opened
                        ? '刷新遇到 Cloudflare 验证，已尝试打开验证页；验证完回到这里点“验证后继续刷新”。'
                        : '刷新遇到 Cloudflare 验证，先点“去验证”，验证完再点“验证后继续刷新”。');
                    return;
                }
                completed += 1;
                setTrackingRefreshRuntimeState({
                    phase: 'refreshing',
                    completed,
                    total,
                    remainingMs: 0,
                    note: refreshed?.top_avid ? ('刚检查到 ' + refreshed.top_avid) : '已更新列表'
                });
                await renderTrackingUI();
                const cooldownMs = getTrackingRefreshCooldownMs(refreshed || record);
                if (cooldownMs > 0) {
                    bucketLastRunAt.set(getTrackingRefreshBucket(refreshed || record), Date.now());
                }
                if (pending.length) {
                    const pauseMs = cooldownMs > 0
                        ? (3500 + Math.random() * 2500)
                        : (2200 + Math.random() * 2200);
                    await waitTrackingRefreshCountdown(pauseMs, remainingMs => {
                        setTrackingRefreshRuntimeState({
                            phase: 'cooldown',
                            completed,
                            total,
                            remainingMs,
                            note: cooldownMs > 0 ? 'JavLibrary 冷却桶' : '请求间隔'
                        });
                        void renderTrackingUI();
                    });
                }
            }
            clearTrackingRefreshResumeState();
            setTrackingRefreshRuntimeState(null);
            await renderTrackingUI();
            showAlert(requestedIds?.length ? '剩余追更项已继续刷新完成！' : '追更列表刷新完成！');
        } finally {
            if (!pausedForVerification) setTrackingRefreshRuntimeState(null);
            renderTrackingUI();
        }
    }

    async function renderTrackingUI() {
        if (typeof scheduleRenderWorkbenchTrackingList === 'function') {
            // 后台刷新/滚动中勿立刻整表重绘，避免滚动被打断
            scheduleRenderWorkbenchTrackingList({}, workbenchListScrolling ? 0 : 220);
            return;
        }
        if (typeof renderWorkbenchTrackingList === 'function') {
            await renderWorkbenchTrackingList();
            return;
        }
        const root = document.getElementById('jlc-tracking-root');
        if (!root) return;
        const context = getCurrentTrackingPageContext();
        const list = (await getTrackingSearches()).filter(record => !record.archived);
        const updateCount = list.filter(record => normalizeCode(record.top_avid || '') && normalizeCode(record.top_avid || '') !== normalizeCode(record.last_seen_avid || '')).length;
        const refreshResume = getTrackingRefreshResumeState();
        const refreshRuntime = getTrackingRefreshRuntimeState();
        const runtimeSummary = buildTrackingRefreshRuntimeSummary(refreshRuntime);
        const runtimeButtonText = buildTrackingRefreshRuntimeButtonText(refreshRuntime);
        const resumePendingIds = Array.isArray(refreshResume?.pending_ids)
            ? refreshResume.pending_ids.filter(id => list.some(record => record.id === id))
            : [];
        const resumePendingCount = resumePendingIds.length;
        const collapsedState = getTrackingUiState().collapsed || {};
        const groups = new Map();
        list.forEach(record => {
            const key = getTrackingEffectiveGroupType(record);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(record);
        });

        const groupMarkup = Array.from(groups.entries())
            .sort((a, b) => {
                const aIndex = TRACKING_GROUP_ORDER.indexOf(a[0]);
                const bIndex = TRACKING_GROUP_ORDER.indexOf(b[0]);
                const normalizedA = aIndex === -1 ? TRACKING_GROUP_ORDER.length : aIndex;
                const normalizedB = bIndex === -1 ? TRACKING_GROUP_ORDER.length : bIndex;
                return normalizedA - normalizedB || String(a[0]).localeCompare(String(b[0]));
            })
            .map(([groupType, records]) => {
            const groupKey = 'group_' + groupType;
            const collapsed = !!collapsedState[groupKey];
            const hasUpdate = records.filter(record => normalizeCode(record.top_avid || '') && normalizeCode(record.top_avid || '') !== normalizeCode(record.last_seen_avid || '')).length;
            const rows = records.map(record => {
                const status = buildTrackingStatus(record);
                const displayTitle = getTrackingDisplayTitle(record);
                const pageHints = buildTrackingPageHintSummary(record);
                const pageSummary = pageHints.length ? (' · ' + pageHints.join(' · ')) : '';
                const metaParts = [];
                if (record.top_avid) metaParts.push('<span>最新：' + escapeHtml(record.top_avid) + '</span>');
                if (record.last_seen_avid) metaParts.push('<span>断点：' + escapeHtml(record.last_seen_avid) + '</span>');
                const browseOnly = buildTrackingPageHintSummary(record, { includeBrowsed: true }).find(item => item.startsWith('浏览第'));
                if (browseOnly) metaParts.push('<span>' + escapeHtml(browseOnly) + '</span>');
                metaParts.push('<span title="' + escapeHtml(formatDateTime(record.last_browsed_at)) + '">最后浏览：' + escapeHtml(formatRelativeTime(record.last_browsed_at)) + '</span>');
                metaParts.push('<span title="' + escapeHtml(formatDateTime(record.last_check_at)) + '">最后检查：' + escapeHtml(formatRelativeTime(record.last_check_at)) + '</span>');
                return ''
                    + '<div class="jlc-tracking-item" data-jlc-tracking-id="' + escapeHtml(record.id) + '">'
                    + '  <div class="jlc-tracking-main">'
                    + '    <div class="jlc-tracking-title-row">'
                    + '      <span class="jlc-status-pill tone-' + escapeHtml(status.tone) + '" title="' + escapeHtml(status.note || '') + '">' + escapeHtml(status.text) + '</span>'
                    + '      <span class="jlc-site-pill">' + escapeHtml(getSiteLabel(record.site)) + '</span>'
                    + '      <span class="jlc-tracking-title-text">' + escapeHtml(displayTitle) + '</span>'
                    + (pageSummary ? '      <span class="jlc-tracking-pagehint">' + escapeHtml(pageSummary) + '</span>' : '')
                    + '    </div>'
                    + '    <div class="jlc-tracking-meta">' + metaParts.join('') + '</div>'
                    + '  </div>'
                    + '  <div class="jlc-tracking-actions">'
                    + '    <button type="button" data-jlc-tracking-open="' + escapeHtml(record.id) + '">打开</button>'
                    + (isJavLibraryResolvableSearchUrl(record.page_url || record.open_url || '')
                        ? '    <button type="button" data-jlc-tracking-query="' + escapeHtml(record.id) + '" style="background:#3f5368;">改词</button>'
                        : '')
                    + '    <button type="button" data-jlc-tracking-label="' + escapeHtml(record.id) + '" style="background:#555;">改名</button>'
                    + (hasPendingTrackingVerification(record)
                        ? '    <button type="button" data-jlc-tracking-verify="' + escapeHtml(record.id) + '" style="background:#6b4f1d;">验证</button>'
                        : '')
                    + '    <button type="button" data-jlc-tracking-refresh="' + escapeHtml(record.id) + '" style="background:#444;">刷新</button>'
                    + '    <button type="button" data-jlc-tracking-delete="' + escapeHtml(record.id) + '" style="background:#5b2d2d;">删除</button>'
                    + '  </div>'
                    + '</div>';
            }).join('');
            return ''
                + '<section class="jlc-tracking-group' + (collapsed ? ' collapsed' : '') + '" data-jlc-group="' + escapeHtml(groupKey) + '">'
                + '  <button type="button" class="jlc-tracking-group-toggle" data-jlc-toggle-group="' + escapeHtml(groupKey) + '">'
                + '    <span>' + escapeHtml(getTrackingGroupLabel(groupType)) + (hasUpdate ? '（' + hasUpdate + ' 项有更新）' : '') + '</span>'
                + '    <small>' + records.length + ' 项</small>'
                + '  </button>'
                + '  <div class="jlc-tracking-group-body">' + rows + '</div>'
                + '</section>';
        }).join('');

        root.innerHTML = ''
            + '<div class="jlc-tracking-toolbar">'
            + '  <div class="jlc-tracking-toolbar-summary">共 ' + list.length + ' 项 · ' + updateCount + ' 项有更新</div>'
            + (runtimeSummary
                ? '  <div class="jlc-tracking-toolbar-summary" style="color:#93c5fd;">' + escapeHtml(runtimeSummary) + '</div>'
                : '')
            + (resumePendingCount
                ? '  <div class="jlc-tracking-toolbar-summary" style="color:#fde68a;">刷新已暂停 · 待验证后继续 ' + resumePendingCount + ' 项</div>'
                : '')
            + '  <div class="jlc-tracking-toolbar-actions">'
            + '    ' + (context ? '<button type="button" data-jlc-tracking-save-current' + (refreshRuntime ? ' disabled' : '') + '>⭐ 收藏当前搜索</button>' : '')
            + '    <button type="button" data-jlc-tracking-refresh-all style="background:#444;"' + (refreshRuntime ? ' disabled' : '') + '>' + escapeHtml(runtimeButtonText) + '</button>'
            + (resumePendingCount
                ? '    <button type="button" data-jlc-tracking-open-verify style="background:#6b4f1d;">去验证</button>'
                    + '    <button type="button" data-jlc-tracking-resume style="background:#3f5368;">验证后继续</button>'
                : '')
            + '  </div>'
            + '</div>'
            + (groupMarkup || '<div class="jlc-tracking-empty">' + (context ? '当前页可收藏为追更项，点击上方“收藏当前搜索”即可开始记录。' : '当前还没有追更项，先在列表页点击“收藏当前搜索”吧。') + '</div>');

        root.querySelector('[data-jlc-tracking-save-current]')?.addEventListener('click', async () => {
            const currentContext = getCurrentTrackingPageContext();
            if (!currentContext) {
                showAlert('当前页面还不是可收藏的列表页。');
                return;
            }
            const customLabel = promptTrackingCustomLabel(null, currentContext);
            if (customLabel === null) return;
            const record = await createOrUpdateTrackingFromContext(currentContext, {
                createIfMissing: true,
                touchBrowse: true,
                checkTop: true,
                updateCheck: true,
                seedSeen: true,
                customLabel
            });
            trackingPageState.record = record;
            trackingPageState.context = currentContext;
            trackingPageState.signature = currentContext.query_signature;
            trackingPageTouchSignature = currentContext.query_signature;
            applyTrackingPageDecorations(record);
            ensureTrackingPageBar({ context: currentContext, record });
            refreshTrackingToolbarButtons();
            renderTrackingUI();
            showAlert('当前搜索已加入追更！');
        });

        root.querySelector('[data-jlc-tracking-refresh-all]')?.addEventListener('click', (event) => {
            if (getTrackingRefreshRuntimeState()) return;
            void refreshAllTrackingSearches(event.currentTarget);
        });

        root.querySelector('[data-jlc-tracking-open-verify]')?.addEventListener('click', () => {
            const verifyRecord = list.find(record => record.id === refreshResume?.record_id)
                || list.find(record => resumePendingIds.includes(record.id));
            const verifyUrl = compactText(refreshResume?.verify_url || '') || buildTrackingVerifyUrl(verifyRecord);
            if (!verifyUrl) {
                showAlert('当前没有可打开的验证页面。');
                return;
            }
            openTrackingVerificationUrl(verifyUrl, { fallbackToNavigate: true });
        });

        root.querySelector('[data-jlc-tracking-resume]')?.addEventListener('click', async (event) => {
            if (!resumePendingIds.length) {
                clearTrackingRefreshResumeState();
                renderTrackingUI();
                return;
            }
            const verifyRecord = list.find(record => record.id === refreshResume?.record_id)
                || list.find(record => resumePendingIds.includes(record.id));
            const verifyUrl = compactText(refreshResume?.verify_url || '') || buildTrackingVerifyUrl(verifyRecord);
            const probe = await probeTrackingVerificationReady(verifyRecord, verifyUrl);
            if (!probe.ok) {
                if (verifyUrl) openTrackingVerificationUrl(verifyUrl);
                showAlert((probe.note || '验证尚未生效') + '，请在打开的 JavLibrary 页面完成验证后再点继续。');
                return;
            }
            clearTrackingRefreshResumeState();
            if (verifyRecord) {
                clearTrackingVerificationRequired(verifyRecord, { restoreStatus: true });
                await saveTrackingRecord(verifyRecord);
            }
            void refreshAllTrackingSearches(event.currentTarget, {
                recordIds: resumePendingIds,
                total: Number(refreshResume?.total || 0) || resumePendingIds.length,
                completedBase: Number(refreshResume?.completed || 0) || 0,
                resumeVerified: true
            });
        });

        root.querySelectorAll('[data-jlc-toggle-group]').forEach(button => {
            button.addEventListener('click', () => {
                const groupKey = button.getAttribute('data-jlc-toggle-group') || '';
                const section = root.querySelector('[data-jlc-group="' + CSS.escape(groupKey) + '"]');
                const collapsed = !section?.classList.contains('collapsed');
                setTrackingGroupCollapsed(groupKey, collapsed);
                section?.classList.toggle('collapsed', collapsed);
            });
        });

        root.querySelectorAll('[data-jlc-tracking-open]').forEach(button => {
            button.addEventListener('click', async () => {
                const record = list.find(item => item.id === button.getAttribute('data-jlc-tracking-open'));
                if (!record) return;
                const targetUrl = buildTrackingNavigationUrl(record) || record.open_url;
                const targetMode = resolveTrackingSearchMode(record, parseTrackingUrl(targetUrl || record.open_url || ''));
                const targetPageHint = targetMode === 'backfill'
                    ? (Number(record.last_seen_page_hint || record.top_page_hint || record.last_browsed_page_hint || 0) || 1)
                    : (Number(getCurrentListPageHint(targetUrl) || 0) || 1);
                record.last_browsed_at = new Date().toISOString();
                record.last_browsed_page_hint = targetPageHint;

                if (isJavLibraryResolvableSearchUrl(record.page_url || record.open_url || targetUrl || '')) {
                    let searchQuery = getTrackingSearchQuery(record);
                    if (!searchQuery) {
                        searchQuery = promptTrackingSearchQuery(record);
                        if (searchQuery == null) return;
                    }
                    searchQuery = compactText(searchQuery || '');
                    if (!searchQuery) {
                        showAlert('原搜索词不能为空。');
                        return;
                    }
                    applyTrackingSearchQuery(record, searchQuery);
                    const resolved = await resolveJavLibrarySearchUrl(record, {
                        keyword: searchQuery,
                        pageHint: targetPageHint
                    });
                    if (!resolved.ok || !resolved.url) {
                        await saveTrackingRecord(record);
                        showAlert('重新生成 JavLibrary 搜索失败：' + (resolved.error || '未知错误'));
                        return;
                    }
                    record.open_url = resolved.url;
                    await saveTrackingRecord(record);
                    location.href = resolved.url;
                    return;
                }

                await saveTrackingRecord(record);
                location.href = targetUrl;
            });
        });

        root.querySelectorAll('[data-jlc-tracking-verify]').forEach(button => {
            button.addEventListener('click', () => {
                const record = list.find(item => item.id === button.getAttribute('data-jlc-tracking-verify'));
                if (!record) return;
                const verifyUrl = buildTrackingVerifyUrl(record);
                if (!verifyUrl) {
                    showAlert('当前没有可打开的验证页面。');
                    return;
                }
                openTrackingVerificationUrl(verifyUrl, { fallbackToNavigate: true });
            });
        });

        root.querySelectorAll('[data-jlc-tracking-refresh]').forEach(button => {
            button.addEventListener('click', async () => {
                const recordId = button.getAttribute('data-jlc-tracking-refresh');
                button.disabled = true;
                button.textContent = '刷新中...';
                try {
                    await refreshSingleTrackingRecord(recordId);
                } finally {
                    renderTrackingUI();
                }
            });
        });

        root.querySelectorAll('[data-jlc-tracking-query]').forEach(button => {
            button.addEventListener('click', async () => {
                const recordId = button.getAttribute('data-jlc-tracking-query');
                const record = list.find(item => item.id === recordId);
                if (!record) return;
                const searchQuery = promptTrackingSearchQuery(record, context);
                if (searchQuery == null) return;
                if (!compactText(searchQuery || '')) {
                    showAlert('原搜索词不能为空。');
                    return;
                }
                applyTrackingSearchQuery(record, searchQuery);
                await saveTrackingRecord(record);
                if (trackingPageState.record?.id === record.id) {
                    trackingPageState.record = record;
                    ensureTrackingPageBar({ context: trackingPageState.context, record });
                }
                renderTrackingUI();
            });
        });

        root.querySelectorAll('[data-jlc-tracking-label]').forEach(button => {
            button.addEventListener('click', async () => {
                const recordId = button.getAttribute('data-jlc-tracking-label');
                const record = list.find(item => item.id === recordId);
                if (!record) return;
                const customLabel = promptTrackingCustomLabel(record, context);
                if (customLabel === null) return;
                record.custom_label = compactText(customLabel || '');
                await saveTrackingRecord(record);
                if (trackingPageState.record?.id === record.id) {
                    trackingPageState.record = record;
                    ensureTrackingPageBar({ context: trackingPageState.context, record });
                }
                renderTrackingUI();
            });
        });

        root.querySelectorAll('[data-jlc-tracking-delete]').forEach(button => {
            button.addEventListener('click', async () => {
                const recordId = button.getAttribute('data-jlc-tracking-delete');
                const record = list.find(item => item.id === recordId);
                if (!record) return;
                if (!window.confirm('确定删除追更项“' + getTrackingDisplayTitle(record) + '”吗？')) return;
                await deleteVal(TRACKING_STORE, recordId);
                if (trackingPageState.record?.id === recordId) {
                    trackingPageState.record = null;
                    trackingPageState.signature = '';
                    trackingPageState.lastSeenFound = false;
                    clearTrackingPageDecorations();
                    ensureTrackingPageBar({ context: trackingPageState.context, record: null });
                    refreshTrackingToolbarButtons();
                }
                renderTrackingUI();
            });
        });
    }

    function clearTrackingPageDecorations() {
        document.querySelectorAll('.jlc-tracking-divider').forEach(node => node.remove());
        getTrackingItemNodesFromRoot(document).forEach(item => {
            item.classList.remove('jlc-tracking-old-item', 'jlc-tracking-breakpoint-item');
        });
        document.getElementById('jlc-tracking-breakpoint-finder')?.remove();
    }

    /**
     * 断点查找进度：写入 state + 刷新顶栏按钮。
     * loading 会贯穿「连翻 → 命中 → 滚到位置」整段，避免按钮先复原再突然跳。
     * @param {{ loading?: boolean, text?: string }} [options]
     */
    function setContinueBreakpointProgress(options = {}) {
        document.getElementById('jlc-tracking-breakpoint-finder')?.remove();
        if (options.loading) {
            trackingPageState.breakpointSearching = true;
            trackingPageState.breakpointSearchLabel = compactText(options.text) || '查找断点中…';
        } else {
            trackingPageState.breakpointSearching = false;
            trackingPageState.breakpointSearchLabel = '';
        }
        return applyContinueBreakpointButtonState();
    }

    /** 根据 trackingPageState 把顶栏「继续断点」绘成 loading / 可点 */
    function applyContinueBreakpointButtonState() {
        document.getElementById('jlc-tracking-breakpoint-finder')?.remove();
        const searching = !!trackingPageState.breakpointSearching;
        let btn = document.querySelector('[data-jlc-page-continue-bp]');
        // 命中后 bar 可能不再渲染该按钮：查找中时补一颗临时进度钮
        if (!btn && searching) {
            const actions = document.querySelector('#jlc-tracking-pagebar .jlc-tracking-pagebar-actions');
            if (actions) {
                btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'jlc-bp-continue is-loading';
                btn.setAttribute('data-jlc-page-continue-bp', '1');
                btn.disabled = true;
                actions.insertBefore(btn, actions.firstChild);
            }
        }
        if (!btn) return null;
        if (searching) {
            btn.disabled = true;
            btn.classList.add('is-loading');
            btn.textContent = trackingPageState.breakpointSearchLabel || '查找断点中…';
        } else {
            btn.disabled = false;
            btn.classList.remove('is-loading');
            btn.textContent = '继续断点';
        }
        return btn;
    }

    /** 把断点条目滚到视口中间（继续断点 / 命中后调用） */
    function scrollToTrackingBreakpoint(el, options = {}) {
        const target = el || document.querySelector('.jlc-tracking-breakpoint-item');
        if (!target || typeof target.scrollIntoView !== 'function') return false;
        try {
            target.scrollIntoView({
                block: options.block || 'center',
                behavior: options.behavior || 'smooth',
                inline: 'nearest'
            });
        } catch (_) {
            try { target.scrollIntoView(true); } catch (__) { /* ignore */ }
        }
        return true;
    }

    /** 连翻时轻量跟滚，让用户看到列表在长，而不是最后突然一跳 */
    function softFollowBreakpointSearch(appendedItems, direction) {
        if (!appendedItems || !appendedItems.length) return;
        const el = direction === 'prev' ? appendedItems[0] : appendedItems[appendedItems.length - 1];
        if (!el || typeof el.scrollIntoView !== 'function') return;
        try {
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth', inline: 'nearest' });
        } catch (_) {
            try { el.scrollIntoView(false); } catch (__) { /* ignore */ }
        }
    }

    /**
     * 命中断点后的过渡：装饰 → 进度「定位中」→ 平滑滚动 → 脉冲 → 再结束 loading
     */
    async function settleBreakpointHit(found, record) {
        setContinueBreakpointProgress({ loading: true, text: '已命中，定位中…' });
        applyTrackingPageDecorations(record);
        ensureTrackingPageBar({
            context: trackingPageState.context || getCurrentTrackingPageContext(),
            record
        });
        applyContinueBreakpointButtonState();
        await delayMs(80);
        const marked = document.querySelector('.jlc-tracking-breakpoint-item') || found;
        if (marked) {
            marked.classList.add('jlc-bp-locating');
            scrollToTrackingBreakpoint(marked, { block: 'center', behavior: 'smooth' });
        }
        // 等平滑滚动大致走完再松手
        await delayMs(620);
        setContinueBreakpointProgress({ loading: false });
        ensureTrackingPageBar({
            context: trackingPageState.context || getCurrentTrackingPageContext(),
            record: trackingPageState.record || record
        });
        window.setTimeout(() => {
            document.querySelectorAll('.jlc-bp-locating').forEach((node) => node.classList.remove('jlc-bp-locating'));
        }, 1200);
    }

    function applyTrackingPageDecorations(record) {
        clearTrackingPageDecorations();
        trackingPageState.lastSeenFound = false;
        trackingPageState.breakpointMissHint = '';
        if (!record?.last_seen_avid) {
            trackingPageState.breakpointCursor = { prev: '', next: '' };
            return;
        }
        const items = getTrackingItemNodesFromRoot(document);
        if (!items.length) return;
        const targetCode = normalizeCode(record.last_seen_avid);
        if (!targetCode) return;
        const searchMode = resolveTrackingSearchMode(record, parseTrackingUrl(record.open_url || location.href));
        const isBackfill = searchMode === 'backfill';
        const currentContext = trackingPageState.context || getCurrentTrackingPageContext();
        const currentPageHint = Number(currentContext?.page_hint || getCurrentListPageHint(location.href, document) || 0) || 1;
        const seenPageHint = Number(record.last_seen_page_hint || 0) || 0;
        let foundIndex = -1;
        items.forEach((item, index) => {
            const info = getTrackingItemInfoFromNode(item);
            if (foundIndex === -1 && normalizeCode(info?.avid || '') === targetCode) {
                foundIndex = index;
                item.classList.add('jlc-tracking-breakpoint-item');
            }
        });
        if (foundIndex >= 0) {
            trackingPageState.lastSeenFound = true;
            trackingPageState.breakpointMissHint = '';
            trackingPageState.breakpointCursor = { prev: '', next: '' };
            // 唯一列表内标识：命中断点时的分割线
            const divider = document.createElement('div');
            divider.className = 'jlc-tracking-divider';
            divider.textContent = isBackfill ? '上次看到这里（下面是更新）' : '上次看到这里';
            if (isBackfill) {
                items[foundIndex].after(divider);
                record.unread_estimate = Math.max(0, items.length - foundIndex - 1);
            } else {
                items[foundIndex].before(divider);
                record.unread_estimate = foundIndex;
            }
            void saveTrackingRecord(record);
            refreshTrackingToolbarButtons();
            return;
        }

        // 未命中：不在列表再插「整页更新」横幅（与顶栏重复）；只记方向提示给 pagebar
        if (seenPageHint > 0) {
            if (isBackfill && currentPageHint > seenPageHint) {
                trackingPageState.breakpointMissHint = 'earlier';
            } else if (!isBackfill && currentPageHint < seenPageHint) {
                trackingPageState.breakpointMissHint = 'later';
            }
        }
        refreshTrackingToolbarButtons();
    }

    function ensureTrackingPageBar(state = {}) {
        const grid = document.getElementById('grid-b');
        const context = state.context || trackingPageState.context;
        const record = state.record !== undefined ? state.record : trackingPageState.record;
        let bar = document.getElementById('jlc-tracking-pagebar');
        if (!grid || !context) {
            bar?.remove();
            document.getElementById('jlc-tracking-breakpoint-finder')?.remove();
            return null;
        }
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'jlc-tracking-pagebar';
            grid.before(bar);
        }
        bar.classList.add('jlc-wb-pagebar');
        if (!record) {
            bar.innerHTML = ''
                + '<div class="jlc-tracking-pagebar-main">'
                + '  <div class="jlc-tracking-pagebar-title">当前搜索还未加入追更</div>'
                + '  <div class="jlc-tracking-pagebar-meta"><span>' + escapeHtml(context.title || context.group_name || context.query_text || '当前列表') + '</span></div>'
                + '</div>'
                + '<div class="jlc-tracking-pagebar-actions">'
                + '  <button type="button" class="primary" data-jlc-page-save>⭐ 收藏此搜索</button>'
                + '  <button type="button" data-jlc-page-open-panel>打开工作台</button>'
                + '</div>';
            bar.querySelector('[data-jlc-page-save]')?.addEventListener('click', async () => {
                const customLabel = await showWorkbenchPrompt({
                    title: '收藏此搜索',
                    note: '可填写备注名，留空则使用自动标题。',
                    value: '',
                    placeholder: '备注名（可选）'
                });
                if (customLabel === null) return;
                const saved = await createOrUpdateTrackingFromContext(context, {
                    createIfMissing: true,
                    touchBrowse: true,
                    checkTop: true,
                    updateCheck: true,
                    seedSeen: true,
                    customLabel
                });
                trackingPageState.record = saved;
                trackingPageState.signature = context.query_signature;
                trackingPageTouchSignature = context.query_signature;
                applyTrackingPageDecorations(saved);
                ensureTrackingPageBar({ context, record: saved });
                renderTrackingUI();
                showAlert('当前搜索已收藏到追更！');
            });
            bar.querySelector('[data-jlc-page-open-panel]')?.addEventListener('click', () => openCommanderPanel('tracking'));
            return bar;
        }
        const status = buildTrackingStatus(record);
        const metaParts = [];
        if (record.top_avid) metaParts.push('<span>最新：' + escapeHtml(record.top_avid) + '</span>');
        if (!record.last_seen_avid) {
            metaParts.push('<span>尚未设置断点</span>');
        } else if (trackingPageState.lastSeenFound) {
            metaParts.push('<span>断点：' + escapeHtml(record.last_seen_avid) + '</span>');
        } else {
            // 未命中：状态集中在顶栏，不再在列表插第三份文案
            metaParts.push('<span>断点：' + escapeHtml(record.last_seen_avid) + '（本页未找到）</span>');
            if (trackingPageState.breakpointMissHint === 'later') {
                metaParts.push('<span class="jlc-bp-miss-hint">在后面页</span>');
            } else if (trackingPageState.breakpointMissHint === 'earlier') {
                metaParts.push('<span class="jlc-bp-miss-hint">在更早页</span>');
            }
        }
        const browseOnly = buildTrackingPageHintSummary(record, { includeBrowsed: true }).find(item => item.startsWith('浏览第'));
        if (browseOnly) metaParts.push('<span>' + escapeHtml(browseOnly) + '</span>');
        metaParts.push('<span title="' + escapeHtml(formatDateTime(record.last_browsed_at)) + '">最后浏览：' + escapeHtml(formatRelativeTime(record.last_browsed_at)) + '</span>');
        const displayTitle = getTrackingDisplayTitle(record, context);
        const pageSummary = buildTrackingPageHintSummary(record).join(' · ');
        const searching = !!trackingPageState.breakpointSearching;
        const canContinueBreakpoint = !!record.last_seen_avid && !trackingPageState.lastSeenFound;
        // 查找/定位过程中始终保留进度钮（即使已命中、本可隐藏「继续断点」）
        const showContinueBtn = canContinueBreakpoint || searching;
        const continueLabel = searching
            ? (trackingPageState.breakpointSearchLabel || '查找断点中…')
            : '继续断点';
        const continueTitle = searching
            ? continueLabel
            : (trackingPageState.breakpointMissHint === 'later'
                ? '本页均为更新，点击向后加载直到命中断点'
                : (trackingPageState.breakpointMissHint === 'earlier'
                    ? '本页均为更新，点击向前加载直到命中断点'
                    : '向后/向前加载列表直到命中断点番号'));
        bar.innerHTML = ''
            + '<div class="jlc-tracking-pagebar-main">'
            + '  <div class="jlc-tracking-pagebar-title"><span class="jlc-status-pill tone-' + escapeHtml(status.tone) + '">' + escapeHtml(status.text) + '</span> ' + escapeHtml(displayTitle) + (pageSummary ? ' <span class="jlc-tracking-pagehint">' + escapeHtml('· ' + pageSummary) + '</span>' : '') + '</div>'
            + '  <div class="jlc-tracking-pagebar-meta">' + metaParts.join('') + '</div>'
            + '</div>'
            + '<div class="jlc-tracking-pagebar-actions">'
            + (showContinueBtn
                ? '  <button type="button" class="jlc-bp-continue' + (searching ? ' is-loading' : '') + '" data-jlc-page-continue-bp'
                    + (searching ? ' disabled' : '')
                    + ' title="' + escapeHtml(continueTitle) + '">' + escapeHtml(continueLabel) + '</button>'
                : '')
            + '  <button type="button" class="primary" data-jlc-page-mark-read>设首页为断点</button>'
            + '  <button type="button" data-jlc-page-refresh>刷新本项</button>'
            + '  <button type="button" data-jlc-page-focus>在工作台中定位</button>'
            + '  <button type="button" data-jlc-page-edit-label>备注</button>'
            + '  <button type="button" data-jlc-page-open-panel>打开工作台</button>'
            + '</div>';
        bar.querySelector('[data-jlc-page-mark-read]')?.addEventListener('click', async () => {
            await markTrackingRecordRead(record.id, 'top');
            renderTrackingUI();
            showAlert('已把当前首项设为新断点！');
        });
        bar.querySelector('[data-jlc-page-continue-bp]')?.addEventListener('click', () => {
            if (trackingPageState.breakpointSearching) return;
            void continueTrackingBreakpointSearch();
        });
        bar.querySelector('[data-jlc-page-refresh]')?.addEventListener('click', async (event) => {
            const button = event.currentTarget;
            const prev = button.textContent;
            button.disabled = true;
            button.textContent = '刷新中…';
            try {
                await refreshSingleTrackingRecord(record.id);
                ensureTrackingPageBar({ context, record: trackingPageState.record || record });
                await renderTrackingUI();
                showAlert('本项已刷新！');
            } finally {
                button.disabled = false;
                button.textContent = prev;
            }
        });
        bar.querySelector('[data-jlc-page-focus]')?.addEventListener('click', () => {
            focusTrackingInWorkbench(record.id);
            showAlert('已在工作台定位该项。');
        });
        bar.querySelector('[data-jlc-page-edit-label]')?.addEventListener('click', async () => {
            const customLabel = await showWorkbenchPrompt({
                title: '修改追更备注',
                note: '留空可恢复自动标题。',
                value: record.custom_label || getTrackingDisplayTitle(record, context) || '',
                placeholder: '备注名'
            });
            if (customLabel === null) return;
            record.custom_label = compactText(customLabel || '');
            await saveTrackingRecord(record);
            trackingPageState.record = record;
            ensureTrackingPageBar({ context, record });
            renderTrackingUI();
            showAlert(record.custom_label ? '追更备注已更新！' : '已恢复自动标题！');
        });
        bar.querySelector('[data-jlc-page-open-panel]')?.addEventListener('click', () => {
            focusTrackingInWorkbench(record.id);
        });
        return bar;
    }

    async function setTrackingBreakpointByItem(item, options = {}) {
        const info = getTrackingItemInfoFromNode(item);
        if (!info?.avid) return null;
        const context = getCurrentTrackingPageContext();
        if (!context) {
            showAlert('当前页面还不是可追更的列表页。');
            return null;
        }
        const items = getTrackingItemNodesFromRoot(document);
        const itemIndex = items.findIndex(node => node === item);
        const searchMode = resolveTrackingSearchMode({ site: context.site, search_mode: context.search_mode }, parseTrackingUrl(context.pageUrl || context.open_url || location.href));
        const unreadEstimate = itemIndex >= 0
            ? (searchMode === 'backfill'
                ? Math.max(0, items.length - itemIndex - 1)
                : Math.max(0, itemIndex))
            : 0;
        const record = await createOrUpdateTrackingFromContext(context, {
            createIfMissing: true,
            touchBrowse: trackingPageTouchSignature !== context.query_signature,
            checkTop: true,
            updateCheck: trackingPageTouchSignature !== context.query_signature,
            explicitLastSeen: {
                avid: info.avid,
                title: info.title,
                page_hint: context.page_hint,
                unread_estimate: unreadEstimate
            }
        });
        trackingPageState.context = context;
        trackingPageState.record = record;
        trackingPageState.signature = context.query_signature;
        trackingPageTouchSignature = context.query_signature;
        applyTrackingPageDecorations(record);
        ensureTrackingPageBar({ context, record });
        renderTrackingUI();
        showAlert((options.silent ? '' : '断点已更新到 ') + info.avid + '！');
        return record;
    }

    function refreshTrackingToolbarButtons() {
        const activeCode = normalizeCode(trackingPageState.record?.last_seen_avid || '');
        getTrackingItemNodesFromRoot(document).forEach(item => {
            const button = item.querySelector('.jlc-tool-btn.j-bm');
            if (button) {
                button.classList.toggle('active-bookmark', !!activeCode && normalizeCode(item.dataset.jlcAvid || '') === activeCode);
            }
        });
    }

    function scheduleTrackingPageRefresh(force = false) {
        if (trackingPageRefreshTimer) window.clearTimeout(trackingPageRefreshTimer);
        trackingPageRefreshTimer = window.setTimeout(() => {
            trackingPageRefreshTimer = null;
            void syncTrackingPageState(force);
        }, force ? 40 : 180);
    }

    async function syncTrackingPageState(force = false) {
        const context = getCurrentTrackingPageContext();
        const previousSignature = trackingPageState.signature;
        const previousPageUrl = trackingPageState.context?.pageUrl || '';
        trackingPageState.context = context;
        if (!context) {
            trackingPageState.record = null;
            trackingPageState.signature = '';
            trackingPageState.lastSeenFound = false;
            trackingPageState.breakpointCursor = { prev: '', next: '' };
            clearTrackingPageDecorations();
            ensureTrackingPageBar({ context: null, record: null });
            return null;
        }
        if (context.query_signature !== previousSignature || context.pageUrl !== previousPageUrl) {
            trackingPageState.breakpointCursor = { prev: '', next: '' };
        }
        const shouldTouchBrowse = trackingPageTouchSignature !== context.query_signature;
        const shouldCheck = shouldTouchBrowse || force;
        const record = await createOrUpdateTrackingFromContext(context, {
            createIfMissing: false,
            touchBrowse: shouldTouchBrowse,
            checkTop: true,
            updateCheck: shouldCheck
        });
        if (shouldTouchBrowse) trackingPageTouchSignature = context.query_signature;
        trackingPageState.record = record;
        trackingPageState.signature = context.query_signature;
        applyTrackingPageDecorations(record);
        ensureTrackingPageBar({ context, record });
        refreshTrackingToolbarButtons();
        if (isWorkbenchOpen() && getWorkbenchSession().nav === 'tracking') {
            void renderTrackingUI();
        } else {
            void refreshWorkbenchFabBadge();
        }
        return record;
    }

    async function continueTrackingBreakpointSearch() {
        if (trackingPageSearchPromise) return trackingPageSearchPromise;
        const context = trackingPageState.context || getCurrentTrackingPageContext();
        const record = trackingPageState.record;
        if (!context || !record?.last_seen_avid) {
            showAlert('当前没有可继续搜索的断点。');
            return null;
        }
        const cursorState = trackingPageState.breakpointCursor || (trackingPageState.breakpointCursor = { prev: '', next: '' });
        const currentPageHint = Number(context.page_hint || getCurrentListPageHint(location.href, document) || 0) || 1;
        const directions = getTrackingBreakpointSearchDirections(record, currentPageHint);
        const directionSeeds = {
            prev: cursorState.prev || getTrackingPrevPageUrl(document, currentWeb, location.href),
            next: cursorState.next || scroller?.nextURL || getTrackingNextPageUrl(document, currentWeb, location.href)
        };
        const availableDirections = directions.filter(direction => !!directionSeeds[direction]);
        if (!availableDirections.length) {
            setContinueBreakpointProgress({ loading: false });
            showAlert('前后都没有更多页面了。');
            return null;
        }
        const targetCode = normalizeCode(record.last_seen_avid);
        const grid = document.getElementById('grid-b');
        if (!grid) return null;

        trackingPageSearchPromise = (async () => {
            const maxStepsPerDirection = 12;
            const maxTotalSteps = 18;
            let totalStep = 0;
            let lastFailure = '';
            for (const direction of availableDirections) {
                let nextUrl = directionSeeds[direction];
                if (!nextUrl) continue;
                let refererUrl = location.href;
                let directionStep = 0;
                const directionLabel = getTrackingBreakpointDirectionLabel(direction);
                setContinueBreakpointProgress({ loading: true, text: '正在' + directionLabel + '查找…' });
                while (nextUrl && directionStep < maxStepsPerDirection && totalStep < maxTotalSteps) {
                    directionStep += 1;
                    totalStep += 1;
                    cursorState[direction] = nextUrl || '';
                    const response = await requestPageWithBrowserFetch(nextUrl, buildTrackingPageRequestOptions(nextUrl, refererUrl, { timeout: 18000 }));
                    if (!response.ok || !response.responseText) {
                        lastFailure = directionLabel + '搜索失败：' + describeRequestStatus(response, '请求失败');
                        break;
                    }
                    const doc = new DOMParser().parseFromString(response.responseText, 'text/html');
                    let elems = GridPanel.parseItems($(doc).find(currentObj.itemSelector));
                    if (currentWeb !== 'javdb' && location.pathname.includes('/star/') && elems) {
                        elems = elems.slice(1);
                    }
                    const appendedItems = collectCommanderItems(elems);
                    if (appendedItems.length) {
                        if (direction === 'prev') grid.prepend(...appendedItems);
                        else grid.append(...appendedItems);
                        lazyLoad?.update?.();
                        runCommanderScanner(appendedItems, true);
                        window.setTimeout(() => runCommanderScanner(appendedItems, true), 120);
                        window.setTimeout(() => runCommanderScanner(appendedItems, true), 620);
                        // 边加载边轻跟滚，避免最后才「闪」到下面
                        softFollowBreakpointSearch(appendedItems, direction);
                    }
                    const found = appendedItems.find(item => normalizeCode(getTrackingItemInfoFromNode(item)?.avid || '') === targetCode);
                    if (found) {
                        record.last_found_at = new Date().toISOString();
                        record.last_seen_page_hint = getCurrentListPageHint(response.finalUrl || nextUrl, doc);
                        trackingPageState.breakpointCursor = { prev: '', next: '' };
                        await saveTrackingRecord(record);
                        trackingPageState.record = record;
                        await settleBreakpointHit(found, record);
                        showAlert('已找到断点 ' + record.last_seen_avid + '！');
                        return found;
                    }
                    refererUrl = response.finalUrl || nextUrl;
                    nextUrl = getTrackingDirectionalPageUrl(doc, currentWeb, refererUrl, direction);
                    cursorState[direction] = nextUrl || '';
                    if (direction === 'next' && scroller) scroller.nextURL = nextUrl || '';
                    if (nextUrl) {
                        const pageHint = Number(getCurrentListPageHint(refererUrl, doc) || 0) || 1;
                        setContinueBreakpointProgress({
                            loading: true,
                            text: directionLabel + '第' + pageHint + '页…'
                        });
                        // 间隔略缩短：跟滚已经给了反馈，不必干等太久
                        await delayMs(480 + Math.random() * 320);
                    }
                }
                if (directionStep >= maxStepsPerDirection || totalStep >= maxTotalSteps) {
                    lastFailure = '已连续翻到限制页数，断点还没出现';
                    break;
                }
            }
            const remainingDirections = directions.filter(direction => !!(trackingPageState.breakpointCursor || {})[direction]);
            setContinueBreakpointProgress({ loading: false });
            if (remainingDirections.length) {
                showAlert(lastFailure ? ('断点定位未完成：' + lastFailure) : '这次先翻到这里，再点一次「继续断点」即可。');
                return null;
            }
            showAlert(lastFailure ? ('断点定位失败：' + lastFailure) : '已经翻到前后边界，仍未找到断点。');
            return null;
        })().finally(() => {
            trackingPageSearchPromise = null;
            // settle 成功时已结束 loading；失败路径也兜底复位
            if (trackingPageState.breakpointSearching) {
                setContinueBreakpointProgress({ loading: false });
            }
            scheduleTrackingPageRefresh(false);
        });

        return trackingPageSearchPromise;
    }

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
        document.getElementById('jlc-resource-center')?.remove();
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
            <a class="jlc-resource-chip" href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer nofollow">
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
            badge.style.marginLeft = '8px';
            node.insertAdjacentElement('afterend', badge);
        }
        badge.textContent = value;
        badge.title = value;
    }

    function uniqueTrailerLinks(list) {
        const normalized = uniqueLinkObjects(list);
        const seen = new Set();
        return normalized.filter(item => {
            let key = '';
            if (/^MissAV\b/i.test(item.label)) {
                key = 'missav:' + (item.kind || normalizeText(item.label));
            } else if (/^FALENO\b/i.test(item.label) || item.kind === 'faleno') {
                key = 'faleno';
            } else if (/^MGS\b/i.test(item.label) || /^mgs/i.test(item.kind || '')) {
                key = 'mgs';
            }
            if (!key) return true;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function isIframeLikeTrailerHref(href) {
        const value = normalizeMediaUrl(href, location?.href || 'https://www.javlibrary.com/');
        if (!value) return false;
        if (/\.(?:mp4|m4v|mov|webm|ogv|m3u8)(?:$|[?#])/i.test(value)) return false;
        return /(?:youtube\.com|youtu\.be|vimeo\.com|player\.|embed|iframe|sampleplayer|sample_movie|\/player\/|\/embed\/)/i.test(value);
    }

    function buildTrailerEmbedUrl(url, options = {}) {
        const value = normalizeMediaUrl(url, location?.href || 'https://www.javlibrary.com/');
        if (!value) return '';
        const autoplay = options.autoplay !== false;
        const muted = options.muted !== false;
        let parsed;
        try {
            parsed = new URL(value);
        } catch (error) {
            return value;
        }
        const hostname = String(parsed.hostname || '').toLowerCase();
        const applyVideoParams = (urlObj, useMutedAlias = false) => {
            if (autoplay) {
                urlObj.searchParams.set('autoplay', '1');
            } else {
                urlObj.searchParams.delete('autoplay');
            }
            if (muted) {
                urlObj.searchParams.set(useMutedAlias ? 'muted' : 'mute', '1');
            } else {
                urlObj.searchParams.delete('mute');
                urlObj.searchParams.delete('muted');
            }
        };
        if (hostname === 'youtu.be') {
            const id = parsed.pathname.replace(/^\/+/, '').split(/[/?#]/)[0];
            if (!id) return value;
            const params = [];
            if (autoplay) params.push('autoplay=1');
            if (muted) params.push('mute=1');
            params.push('playsinline=1', 'rel=0');
            return 'https://www.youtube.com/embed/' + id + '?' + params.join('&');
        }
        if (hostname.endsWith('youtube.com')) {
            if (/\/watch/i.test(parsed.pathname || '')) {
                const id = parsed.searchParams.get('v');
                if (!id) return value;
                const params = [];
                if (autoplay) params.push('autoplay=1');
                if (muted) params.push('mute=1');
                params.push('playsinline=1', 'rel=0');
                return 'https://www.youtube.com/embed/' + id + '?' + params.join('&');
            }
            if (/\/embed\//i.test(parsed.pathname || '')) {
                applyVideoParams(parsed, false);
                parsed.searchParams.set('playsinline', '1');
                parsed.searchParams.set('rel', '0');
                return parsed.toString();
            }
        }
        if (hostname === 'vimeo.com') {
            const matched = parsed.pathname.match(/\/(\d+)(?:$|[/?#])/);
            if (!matched) return value;
            const params = [];
            if (autoplay) params.push('autoplay=1');
            if (muted) params.push('muted=1');
            return 'https://player.vimeo.com/video/' + matched[1] + (params.length ? ('?' + params.join('&')) : '');
        }
        if (hostname === 'player.vimeo.com') {
            applyVideoParams(parsed, true);
            return parsed.toString();
        }
        applyVideoParams(parsed, false);
        return parsed.toString();
    }

    function uniqueTrailerSources(list) {
        const seen = new Set();
        return (Array.isArray(list) ? list : []).map(item => {
            if (!item) return null;
            const href = normalizeMediaUrl(item.href || item.url || '', item.pageUrl || location?.href || 'https://www.javlibrary.com/');
            if (!href) return null;
            let type = String(item.type || '').trim().toLowerCase();
            if (!type) type = isIframeLikeTrailerHref(href) ? 'iframe' : 'video';
            if (!['iframe', 'video'].includes(type)) type = 'video';
            const pageUrl = normalizeMediaUrl(item.pageUrl || href, location?.href || 'https://www.javlibrary.com/');
            return {
                label: String(item.label || item.text || '').trim() || href,
                href,
                kind: String(item.kind || '').trim(),
                note: String(item.note || '').trim(),
                pageUrl,
                type
            };
        }).filter(Boolean).filter(item => {
            const key = item.type + '|' + item.href;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function isIframeTrailerSource(source) {
        if (!source) return false;
        if (String(source.type || '').trim().toLowerCase() === 'iframe') return true;
        return isIframeLikeTrailerHref(source.embedUrl || source.href || '');
    }

    function getTrailerPlayableUrl(source, options = {}) {
        if (!source) return '';
        return isIframeTrailerSource(source)
            ? buildTrailerEmbedUrl(source.embedUrl || source.href || '', options)
            : normalizeMediaUrl(source.href || source.embedUrl || '', source.pageUrl || location?.href || 'https://www.javlibrary.com/');
    }

    function mountTrailerPlayer(container, source, options = {}) {
        if (!container) return null;
        container.innerHTML = '';
        if (!source) return null;
        const mode = options.mode === 'overlay' ? 'overlay' : 'inline';
        const autoplay = options.autoplay !== false;
        const muted = options.muted !== false;
        const playableUrl = getTrailerPlayableUrl(source, { autoplay, muted });
        if (!playableUrl) return null;
        const shell = document.createElement('div');
        shell.className = 'jlc-trailer-player-shell is-' + mode;
        if (isIframeTrailerSource(source)) {
            const iframe = document.createElement('iframe');
            iframe.src = playableUrl;
            iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
            iframe.allowFullscreen = true;
            iframe.loading = 'lazy';
            iframe.referrerPolicy = 'strict-origin-when-cross-origin';
            shell.appendChild(iframe);
            container.appendChild(shell);
            return iframe;
        }
        const video = document.createElement('video');
        video.className = mode === 'overlay' ? 'jlc-trailer-overlay-video' : 'jlc-resource-video';
        video.controls = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.muted = muted;
        video.autoplay = autoplay;
        video.src = playableUrl;
        shell.appendChild(video);
        container.appendChild(shell);
        if (autoplay) {
            const playPromise = video.play();
            if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
        }
        return video;
    }

    function ensureTrailerOverlay() {
        let overlay = document.getElementById('jlc-trailer-overlay');
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'jlc-trailer-overlay';
        overlay.className = 'jlc-trailer-overlay';
        overlay.hidden = true;
        overlay.innerHTML = ''
            + '<div class="jlc-trailer-dialog" role="dialog" aria-modal="true" aria-label="预告播放">'
            + '<button type="button" class="jlc-trailer-close" data-jlc-close-trailer aria-label="关闭预告">×</button>'
            + '<div class="jlc-trailer-dialog-head"><strong data-jlc-trailer-title>预告片</strong><small>默认静音 · 弹层播放</small></div>'
            + '<div class="jlc-trailer-dialog-player" data-jlc-trailer-player></div>'
            + '<div class="jlc-trailer-dialog-actions"><a href="#" target="_blank" rel="noopener noreferrer nofollow" data-jlc-trailer-openblank>新标签打开</a></div>'
            + '</div>';
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay || event.target?.dataset?.jlcCloseTrailer !== undefined) {
                closeTrailerOverlay();
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeTrailerOverlay();
        });
        document.body.appendChild(overlay);
        return overlay;
    }

    function closeTrailerOverlay() {
        const overlay = document.getElementById('jlc-trailer-overlay');
        if (!overlay) return;
        const video = overlay.querySelector('video');
        if (video) {
            video.pause();
            video.removeAttribute('src');
            video.load();
        }
        const player = overlay.querySelector('[data-jlc-trailer-player]');
        if (player) player.innerHTML = '';
        overlay.classList.remove('is-open');
        overlay.hidden = true;
        document.documentElement.classList.remove('scrollBarHide');
    }

    function openTrailerOverlay(source) {
        if (!source?.href) return;
        const overlay = ensureTrailerOverlay();
        const title = overlay.querySelector('[data-jlc-trailer-title]');
        const openBlank = overlay.querySelector('[data-jlc-trailer-openblank]');
        const player = overlay.querySelector('[data-jlc-trailer-player]');
        if (title) title.textContent = source.label || '预告片';
        if (openBlank) openBlank.href = source.pageUrl || source.href;
        mountTrailerPlayer(player, source, { mode: 'overlay', autoplay: true, muted: true });
        overlay.hidden = false;
        overlay.classList.add('is-open');
        document.documentElement.classList.add('scrollBarHide');
    }

    function isResourceCenterTokenAlive(token) {
        return document.getElementById('jlc-resource-center')?.dataset.renderToken === token;
    }

    async function fetchDmmSearchTrailerInfo(context) {
        const key = context?.avid;
        const searchUrl = buildDmmSearchUrl(key);
        if (!key || !searchUrl) return null;
        const response = await requestPage(searchUrl, {
            timeout: 12000,
            headers: {
                Cookie: 'age_check_done=1',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
            }
        });
        if (!response.ok) {
            const state = [403, 429, 503].includes(response.status) ? 'blocked'
                : (response.status === 404 ? 'empty' : 'error');
            return {
                videoSources: [],
                links: uniqueLinkObjects([{ label: 'DMM 搜索', href: searchUrl, note: '官方搜索' }]),
                status: state,
                note: describeRequestStatus(response, '搜索失败')
            };
        }
        return extractDmmSearchPreviewInfo(response.responseText, key);
    }

    async function fetchMissAVTrailerInfo(context) {
        const key = context?.avid;
        if (!key) return null;
        if (resourceMissAVCache.has(key)) return resourceMissAVCache.get(key);
        const promise = (async () => {
            const variants = await Promise.all(buildMissAVVariantGroups(key).map(async group => {
                let abnormalRedirect = false;
                let blockedStatus = 0;
                let hardErrorNote = '';
                for (const candidate of group.candidates) {
                    const result = await requestPage(candidate.href, { timeout: 12000 });
                    const safeHref = sanitizeMissAVPageUrl(result.finalUrl || candidate.href, key, candidate.href);
                    if (result.ok && safeHref) {
                        return {
                            key: group.key,
                            label: group.label,
                            state: 'ok',
                            note: '存在页',
                            href: safeHref,
                            link: { label: group.label, href: safeHref, note: '存在页', kind: group.key }
                        };
                    }
                    if (result.ok && !safeHref) {
                        abnormalRedirect = true;
                        continue;
                    }
                    if (result.status === 403 && !blockedStatus) blockedStatus = 403;
                    if (!hardErrorNote && result.status && result.status !== 404) {
                        hardErrorNote = describeRequestStatus(result, '请求失败');
                    }
                }
                const fallback = group.candidates.find(item => /\/cn\//i.test(item.href)) || group.candidates[0] || null;
                let state = 'empty';
                let note = '未找到';
                if (blockedStatus) {
                    state = 'blocked';
                    note = 'HTTP ' + blockedStatus;
                } else if (abnormalRedirect) {
                    state = 'partial';
                    note = '异常跳转已忽略';
                } else if (hardErrorNote) {
                    state = 'error';
                    note = hardErrorNote;
                }
                return {
                    key: group.key,
                    label: group.label,
                    state,
                    note,
                    href: fallback?.href || '',
                    link: (state === 'blocked' || state === 'partial') && fallback
                        ? { label: group.label, href: fallback.href, note, kind: group.key }
                        : null
                };
            }));
            return {
                variants,
                links: uniqueLinkObjects(variants.map(item => item.link).filter(Boolean)),
                status: variants.some(item => item.state === 'ok')
                    ? 'ok'
                    : (variants.some(item => item.state === 'blocked')
                        ? 'blocked'
                        : (variants.some(item => item.state === 'partial')
                            ? 'partial'
                            : (variants.some(item => item.state === 'error') ? 'error' : 'empty'))),
                note: variants.map(item => item.label.replace(/^MissAV\s*/, '') + '：' + item.note).join(' · ')
            };
        })().catch(err => {
            console.warn('[JLC] MissAV 页面检测失败', err);
            resourceMissAVCache.delete(key);
            return {
                variants: buildMissAVVariantGroups(key).map(group => ({
                    key: group.key,
                    label: group.label,
                    state: 'error',
                    note: '解析异常',
                    href: (group.candidates[0] || {}).href || '',
                    link: null
                })),
                links: [],
                status: 'error',
                note: '解析异常'
            };
        });
        resourceMissAVCache.set(key, promise);
        return promise;
    }

    async function fetchFalenoTrailerInfo(context) {
        const key = context?.avid;
        if (!key) return null;
        if (resourceFalenoCache.has(key)) return resourceFalenoCache.get(key);
        const promise = (async () => {
            const searchUrl = buildFalenoSearchUrl(key);
            if (!searchUrl) return { videoSources: [], links: [], status: 'empty', note: '无候选', detailUrl: '' };
            const response = await requestPage(searchUrl, {
                timeout: 9000,
                headers: { 'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8' }
            });
            const searchLink = { label: 'FALENO', href: searchUrl, note: '官方搜索', kind: 'faleno' };
            if (!response.ok) {
                const state = [403, 429, 503].includes(response.status) ? 'blocked'
                    : (response.status === 404 ? 'empty' : 'error');
                return {
                    videoSources: [],
                    links: uniqueTrailerLinks([searchLink]),
                    status: state,
                    note: describeRequestStatus(response, '搜索失败'),
                    detailUrl: ''
                };
            }
            const searchVideos = extractFalenoPreviewCandidates(response.responseText, response.finalUrl || searchUrl);
            const detailLinks = extractFalenoDetailLinks(response.responseText, key, response.finalUrl || searchUrl);
            if (searchVideos.length) {
                return {
                    videoSources: searchVideos,
                    links: uniqueTrailerLinks([searchLink, ...detailLinks]),
                    status: 'ok',
                    note: '官方搜索页命中样片',
                    detailUrl: (detailLinks[0] || {}).href || response.finalUrl || searchUrl
                };
            }
            let blockedStatus = 0;
            let hardErrorNote = '';
            for (const detailLink of detailLinks.slice(0, 2)) {
                const detail = await requestPage(detailLink.href, {
                    timeout: 9000,
                    headers: { 'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8' }
                });
                if (!detail.ok) {
                    if ([403, 429, 503].includes(detail.status) && !blockedStatus) blockedStatus = detail.status;
                    if (!hardErrorNote && detail.status && detail.status !== 404) {
                        hardErrorNote = describeRequestStatus(detail, '详情请求失败');
                    }
                    continue;
                }
                const videos = extractFalenoPreviewCandidates(detail.responseText, detail.finalUrl || detailLink.href);
                if (videos.length) {
                    return {
                        videoSources: videos,
                        links: uniqueTrailerLinks([searchLink, detailLink]),
                        status: 'ok',
                        note: '官方详情命中样片',
                        detailUrl: detail.finalUrl || detailLink.href
                    };
                }
            }
            let state = detailLinks.length ? 'partial' : 'empty';
            let note = detailLinks.length ? '详情命中，未抽到样片' : '搜索未命中';
            if (blockedStatus) {
                state = 'blocked';
                note = 'HTTP ' + blockedStatus;
            } else if (hardErrorNote) {
                state = 'error';
                note = hardErrorNote;
            }
            return {
                videoSources: [],
                links: uniqueTrailerLinks([searchLink, ...detailLinks]),
                status: state,
                note,
                detailUrl: (detailLinks[0] || {}).href || response.finalUrl || searchUrl
            };
        })().catch(error => {
            console.warn('[JLC] FALENO 预告解析失败', error);
            resourceFalenoCache.delete(key);
            return {
                videoSources: [],
                links: uniqueTrailerLinks([{ label: 'FALENO', href: buildFalenoSearchUrl(key), note: '官方搜索', kind: 'faleno' }]),
                status: 'error',
                note: '解析异常',
                detailUrl: ''
            };
        });
        resourceFalenoCache.set(key, promise);
        return promise;
    }

    async function fetchMgsTrailerInfo(context) {
        const key = context?.avid;
        if (!key) return null;
        if (resourceMgsCache.has(key)) return resourceMgsCache.get(key);
        const promise = (async () => {
            if (!isLikelyMgsAvid(key)) {
                return { videoSources: [], links: buildMgsManualLinks(key), status: 'empty', note: '非 MGS 番号', detailUrl: '' };
            }
            const detailCandidates = buildMgsDetailCandidates(key);
            if (!detailCandidates.length) {
                return { videoSources: [], links: buildMgsManualLinks(key), status: 'empty', note: '无候选', detailUrl: '' };
            }
            let blockedStatus = 0;
            let hardErrorNote = '';
            for (const candidate of detailCandidates) {
                const detail = await requestPage(candidate.href, { timeout: 12000 });
                if (!detail.ok) {
                    if (detail.status === 403 && !blockedStatus) blockedStatus = 403;
                    if (!hardErrorNote && detail.status && detail.status !== 404) {
                        hardErrorNote = describeRequestStatus(detail, '详情请求失败');
                    }
                    continue;
                }
                const samplePlayers = extractMgsSamplePlayerLinks(detail.responseText, key);
                if (!samplePlayers.length) {
                    continue;
                }
                for (const sample of samplePlayers.slice(0, 2)) {
                    if (!sample.pid) continue;
                    const info = await requestPage('https://www.mgstage.com/sampleplayer/sampleRespons.php?pid=' + encodeURIComponent(sample.pid), { timeout: 12000 });
                    if (!info.ok) {
                        if (info.status === 403 && !blockedStatus) blockedStatus = 403;
                        if (!hardErrorNote && info.status && info.status !== 404) {
                            hardErrorNote = describeRequestStatus(info, '样片请求失败');
                        }
                        continue;
                    }
                    let payload = null;
                    try {
                        payload = JSON.parse(info.responseText || '{}');
                    } catch (error) {
                        payload = null;
                    }
                    const movieUrl = buildMgsSampleVideoUrl(payload?.url || '');
                    if (!movieUrl) continue;
                    return {
                        videoSources: [{ label: 'MGS 官方预告', href: movieUrl, kind: 'official', pageUrl: candidate.href }],
                        links: uniqueLinkObjects([{ label: 'MGS', href: candidate.href, note: '官方详情' }]),
                        status: 'ok',
                        note: '官方样片直连',
                        detailUrl: candidate.href
                    };
                }
                return {
                    videoSources: [],
                    links: uniqueLinkObjects([{ label: 'MGS', href: candidate.href, note: '官方详情' }]),
                    status: 'partial',
                    note: '详情命中，样片解析失败',
                    detailUrl: candidate.href
                };
            }
            let state = 'empty';
            let note = '未命中';
            if (blockedStatus) {
                state = 'blocked';
                note = 'HTTP ' + blockedStatus;
            } else if (hardErrorNote) {
                state = 'error';
                note = hardErrorNote;
            }
            return {
                videoSources: [],
                links: buildMgsManualLinks(key),
                status: state,
                note,
                detailUrl: (detailCandidates[0] || {}).href || ''
            };
        })().catch(err => {
            console.warn('[JLC] MGS 预告解析失败', err);
            resourceMgsCache.delete(key);
            return {
                videoSources: [],
                links: buildMgsManualLinks(key),
                status: 'error',
                note: '解析异常',
                detailUrl: (buildMgsDetailCandidates(key)[0] || {}).href || ''
            };
        });
        resourceMgsCache.set(key, promise);
        return promise;
    }

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

    async function resolveTrailerSources(context, options = {}) {
        const key = context?.avid;
        if (!key) return { videoSources: [], linkSources: [], statuses: [], trailerNote: '' };
        const includeMissAV = options?.includeMissAV !== false;
        const cacheKey = includeMissAV ? key + '::missav-status' : key + '::dmm-only';
        if (resourceTrailerCache.has(cacheKey)) return resourceTrailerCache.get(cacheKey);
        const promise = (async () => {
            const officialCandidates = buildOfficialPreviewCandidates(key);
            const missPromise = includeMissAV
                ? fetchMissAVTrailerInfo(context)
                : Promise.resolve({
                    variants: buildMissAVVariantGroups(key).map(group => ({
                        key: group.key,
                        label: group.label,
                        state: 'empty',
                        note: '仅保留直达候选',
                        href: (group.candidates[0] || {}).href || ''
                    })),
                    links: buildMissAVManualLinks(key),
                    status: 'empty',
                    note: '仅保留直达候选'
                });
            const shouldTryMgs = isLikelyMgsAvid(key);
            const earlyMgsPromise = shouldTryMgs ? fetchMgsTrailerInfo(context) : null;
            const supplementalPromise = fetchTrailerSupplementalStatus(key);
            const officialChecks = await Promise.all(officialCandidates.map(async candidate => ({
                candidate,
                probe: await probeMediaUrl(candidate.href)
            })));
            const officialHit = officialChecks.find(item => item.probe?.ok);
            const bestOfficialFailure = officialChecks.find(item => item.probe && item.probe.state !== 'ok')?.probe || null;
            const dmmSearchInfo = officialHit ? null : await fetchDmmSearchTrailerInfo(context);
            const hasDmmSearchVideo = !!(dmmSearchInfo?.videoSources?.length);
            const falenoInfo = (!officialHit && !hasDmmSearchVideo) ? await fetchFalenoTrailerInfo(context) : null;
            const hasFalenoVideo = !!(falenoInfo?.videoSources?.length);
            const missInfo = await missPromise;
            const mgsInfo = (!officialHit && !hasDmmSearchVideo && !hasFalenoVideo && shouldTryMgs)
                ? await earlyMgsPromise
                : null;
            const supplementalInfo = await supplementalPromise;

            const statuses = [
                officialHit
                    ? { label: 'DMM', state: 'ok', note: officialHit.probe.note || '直连可用', href: officialHit.candidate.href }
                    : {
                        label: 'DMM',
                        state: normalizeResourceStatusState((dmmSearchInfo?.status && dmmSearchInfo.status !== 'empty')
                            ? dmmSearchInfo.status
                            : (bestOfficialFailure?.state || dmmSearchInfo?.status || 'empty')),
                        note: dmmSearchInfo?.note || bestOfficialFailure?.note || (officialCandidates.length ? '未命中' : '无候选'),
                        href: (dmmSearchInfo?.links?.[0] || officialCandidates[0] || {}).href || ''
                    },
                ...(falenoInfo ? [{
                    label: 'FALENO',
                    state: normalizeResourceStatusState(falenoInfo.status || 'empty'),
                    note: falenoInfo.note || '未命中',
                    href: (falenoInfo.links?.[0] || {}).href || ''
                }] : []),
                ...(mgsInfo ? [{
                    label: 'MGS',
                    state: normalizeResourceStatusState(mgsInfo.status || 'empty'),
                    note: mgsInfo.note || '未命中',
                    href: (mgsInfo.links?.[0] || {}).href || ''
                }] : []),
                ...((missInfo?.variants || []).map(item => ({
                    label: item.label,
                    state: normalizeResourceStatusState(item.state || 'empty'),
                    note: item.note || '未命中',
                    href: item.href || ''
                }))),
                ...((supplementalInfo?.statuses || []).map(item => ({
                    label: item.label,
                    state: normalizeResourceStatusState(item.state || 'empty'),
                    note: item.note || '未命中',
                    href: item.href || '',
                    kind: item.kind || ''
                })))
            ];

            const videoSources = uniqueTrailerSources([
                ...(officialHit ? [{
                    label: 'DMM 官方预告',
                    href: officialHit.candidate.href,
                    kind: 'official',
                    pageUrl: officialHit.candidate.href,
                    type: 'video'
                }] : []),
                ...(!officialHit && hasDmmSearchVideo ? (dmmSearchInfo.videoSources || []) : []),
                ...(!officialHit && !hasDmmSearchVideo ? (falenoInfo?.videoSources || []) : []),
                ...(!officialHit && !hasDmmSearchVideo && !hasFalenoVideo ? (mgsInfo?.videoSources || []) : [])
            ]);

            const missLinks = includeMissAV ? (missInfo?.links || []) : buildMissAVManualLinks(key);
            const linkSources = uniqueTrailerLinks([
                ...((officialHit || dmmSearchInfo?.links?.length) ? [] : officialCandidates.slice(0, 1).map(item => ({
                    label: 'DMM 直链候选',
                    href: item.href,
                    note: bestOfficialFailure?.note || '待手动验证'
                }))),
                ...(dmmSearchInfo?.links || []),
                ...(falenoInfo?.links || []),
                ...(mgsInfo?.links || []),
                ...missLinks,
                ...(supplementalInfo?.links || [])
            ]);

            return {
                videoSources,
                linkSources,
                statuses,
                trailerNote: ''
            };
        })().catch(err => {
            console.warn('[JLC] 预告解析失败', err);
            resourceTrailerCache.delete(cacheKey);
            return {
                videoSources: [],
                linkSources: uniqueTrailerLinks([...buildMissAVManualLinks(key), ...buildTrailerFallbackLinks(key)]),
                statuses: [
                    { label: 'DMM', state: 'error', note: '解析异常' },
                    { label: 'FALENO', state: 'error', note: '解析异常' },
                    { label: 'MGS', state: 'error', note: '解析异常' },
                    { label: 'MissAV 有码', state: 'error', note: '解析异常' },
                    { label: 'MissAV 无码流出', state: 'error', note: '解析异常' }
                ],
                trailerNote: ''
            };
        });
        resourceTrailerCache.set(cacheKey, promise);
        return promise;
    }

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
                img.style.display = 'block';
            } else {
                $(img).remove();
            }
        });
        $panel.find('li.imgResult-li').removeClass('imgResult-loading');
        $panel.find('li.imgResult-li').eq(0).addClass('imgResult-Current').siblings().removeClass('imgResult-Current');
        return $panel.get(0);
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
                        <button type="button" data-jlc-copy-magnet="${index}">复制磁链</button>
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
        window.setTimeout(() => {
            if (!isResourceCenterTokenAlive(token)) return;
            void loadTrailer();
        }, 0);
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
            loadScreenshots();
            return;
        }
        body.innerHTML = makeResourceStatusMarkup(pendingStatuses)
            + '<div class="jlc-resource-note">沿用主脚本截图面板，优先 BlogJav，失败再回退 JavStore；默认手动加载避免拖慢首屏。</div>'
            + '<div class="jlc-resource-inline-actions"><button type="button" data-jlc-load-screenshot>加载截图</button></div>';
        body.querySelector('[data-jlc-load-screenshot]')?.addEventListener('click', loadScreenshots, { once: true });
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
        window.setTimeout(() => {
            if (!isResourceCenterTokenAlive(token)) return;
            void loadMagnets();
        }, 0);
    }

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
    }



    let lazyLoad;
    let scroller;
    let myModal;//弹窗插件实例
    let currentWeb = "javbus";//网站域名标识，用于判断当前在什么网站
    let currentObj ;//当前网站对应的属性对象
    /**
     * 通用属性对象
     * domainReg：         域名正则式 用于判断当前在什么网站
     * excludePages：      排除的页面
     * halfImg_block_Pages 屏蔽竖图的页面
     * gridSelector        源网页的网格选择器
     * itemSelector        源网页的子元素选择器
     * widthSelector       源网页的宽度设置元素选择器
     * pageNext            源网页的下一页元素选择器
     * pageSelector        源网页的翻页元素选择器
     * getAvItem           解析源网页item的数据
     * init_Style          加载各网页的特殊css
     */
    let ConstCode = {
        javbus: {
            domainReg: /(javbus|busjav|busfan|fanbus|buscdn|cdnbus|dmmsee|seedmm|busdmm|dmmbus|javsee|seejav)\./i,
            excludePages: ['/actresses', 'mdl=favor&sort=1', 'mdl=favor&sort=2', 'mdl=favor&sort=3', 'mdl=favor&sort=4', 'searchstar'],
            halfImg_block_Pages:['/uncensored','javbus.one','mod=uc','javbus.red'],
            gridSelector: 'div#waterfall',
            itemSelector: 'div#waterfall div.item',
            widthSelector : '#grid-b',
            pageNext:'a#next',
            pageSelector:'.pagination',
            getAvItem: function (elem) {
                var photoDiv = elem.find("div.photo-frame")[0];
                var href = elem.find("a")[0].href;
                var img = $(photoDiv).children("img")[0];
                var src = img.src;
                if (src.match(/pics.dmm.co.jp/)) {
                    src = src.replace(/ps.jpg/, "pl.jpg");
                }else if(src.match(/image.mgstage.com/)){
                    src = src.replace(/pf_o1_|pb_p_/, "pb_e_");
                } else {
                    src = src.replace(/thumbs/, "cover").replace(/thumb/, "cover").replace(/.jpg/, "_b.jpg");
                }
                var title = img.title;
                var AVID = elem.find("date").eq(0).text();
                var date = elem.find("date").eq(1).text();
                var itemTag = "";elem.find("div.photo-info .btn").toArray().forEach( x=> itemTag+=x.outerHTML);
                return {AVID,href,src,title,date,itemTag};
            }
        },
        javdb: {
            domainReg: /(javdb)[0-9]*\./i,
            excludePages: ['/users/'],
            halfImg_block_Pages:['/uncensored','/western','/video_uncensored','/video_western'],
            gridSelector: 'div.movie-list.h',
            itemSelector: 'div.movie-list.h>div.item',
            widthSelector : '#grid-b',
            pageNext: 'a.pagination-next',
            pageSelector:'.pagination-list',
            init_Style: function(){
                GM_addStyle(`#grid-b .info-bottom-two{flex-grow:1}
                [data-theme=light] .pop-up-tag[name$='${AVINFO_SUFFIX}'] {background-color: rgb(255 255 255 / 90%);}
                [data-theme=dark] .scroll-request span{background:white;}
                [data-theme=dark] #grid-b .box-b a:link {color : inherit;}
                [data-theme=dark] #grid-b  .box-b{background-color:#222;}
                [data-theme=dark] .alert-zdy {color: black;background-color: rgb(255 255 255 / 90%);}
                #myModal #modal-div article.message {margin-bottom: 0}`);
            },
            maxWidth: 150,//javdb允许的最大宽度为150%，其他网站默认最大宽度为100%
            getAvItem: function (elem) {
                var href = elem.find("a")[0].href;
                var src = elem.find("div.cover>img").eq(0).attr("src");
                var title = elem.find("a")[0].title;
                var AVID = elem.find("div.video-title>strong").eq(0).text();
                var date = elem.find("div.meta").eq(0).text();
                var score = elem.find("div.score").html();
                var itemTag = elem.find(".tags.has-addons").html();
                return {AVID,href,src,title,date,itemTag,score};
            }
            //init: function(){ if(location.href.includes("/users/")){ this.widthSelector="div.section";} }
        },
        avmoo: {
            domainReg: /avmoo\./i,
            excludePages: ['/actresses'],
            gridSelector: 'div#waterfall',
            itemSelector: 'div#waterfall div.item',
            widthSelector : '#grid-b',
            pageNext: 'a[name="nextpage"]',
            pageSelector:'.pagination',
            getAvItem: function (elem) {
                var photoDiv = elem.find("div.photo-frame")[0];
                var href = elem.find("a")[0].href;
                var img = $(photoDiv).children("img")[0];
                var src = img.src.replace(/ps.jpg/, "pl.jpg");
                var title = img.title;
                var AVID = elem.find("date").eq(0).text();
                var date = elem.find("date").eq(1).text();
                var itemTag = "";elem.find("div.photo-info .btn").toArray().forEach( x=> itemTag+=x.outerHTML);
                return {AVID,href,src,title,date,itemTag};
            }
        },
        javlibrary: {
            domainReg: /javlibrary\./i,
            gridSelector: 'div.videothumblist',
            itemSelector: 'div.videos div.video',
            widthSelector : '#grid-b',
            pageNext: 'a.page.next',
            pageSelector:'.page_selector',
            getAvItem: function (elem) {
                var href = elem.find("a")[0].href;
                var src = elem.find("img")[0].src;
                if(src.indexOf("pixhost")<0){//排除含有pixhost的src，暂时未发现规律
                    src= src.replace(/ps.jpg/, "pl.jpg");
                }
                var title = elem.find("div.title").eq(0).text();
                var AVID = elem.find("div.id").eq(0).text();
                return {AVID,href,src,title,date: '',itemTag:''};
            },
            init_Style: function(){
                applyJavlibraryMenuTopStyle();
                GM_addStyle(`#grid-b div{box-sizing: border-box;}`);
            },
        }
    };

    /** 用于屏蔽老司机脚本的代码*/
    function oldDriverBlock(){
        if(['javbus','avmoo'].includes(currentWeb)){ //屏蔽老司机脚本,改写id
            if ($('.masonry').length > 0) {
                $('.masonry').removeClass("masonry");
            }
            let $waterfall = $('#waterfall');
            if($waterfall.length){
                $waterfall.get(0).id = "waterfall-destroy";
            }
            if($waterfall.find("#waterfall").length){ //javbus首页有2个'waterfall' ID
                $waterfall.find("#waterfall").get(0).id = "";
            }
            //解决 JAV老司机 $pages[0].parentElement.parentElement.id = "waterfall_h";
            //女优作品界面此代码会把id设置到class=row层
            if ($('#waterfall_h.row').length > 0) {
                $('#waterfall_h.row').removeAttr("id");
            }
            let $waterfall_h= $('#waterfall_h');
            if ($waterfall_h.length) {
                $waterfall_h.get(0).id = "waterfall-destroy";
            }
            if(location.pathname.search(/search/) > 0){//解决"改写id后，搜索页面自动跳转到无码页面"的bug
                $('body').append('<div id="waterfall"></div>');
            }
            currentObj.gridSelector = "#waterfall-destroy";
        }
        if(['javlibrary'].includes(currentWeb)){ //屏蔽老司机脚本,改写id
            let $waterfall = $('div.videothumblist');
            if($waterfall.length){
                $waterfall.removeClass("videothumblist");
                $waterfall.find(".videos").removeClass("videos");
                $waterfall.get(0).id = "waterfall-destroy";
            }
            currentObj.gridSelector = "#waterfall-destroy";
        }
    }
    class Page{
         constructor(){
            for (let key in ConstCode) {
                let domainReg = ConstCode[key].domainReg;
                if (domainReg && domainReg.test(location.href)) {
                    currentWeb = key;//首先判断当前是什么网站
                    break;
                }
            }
            currentObj = ConstCode[currentWeb];
            //排除页面的判断
            if (currentObj.excludePages) {
                for (let page of currentObj.excludePages) {
                    if (location.pathname.includes(page)) return;
                }
            }
            //调用初始化方法 未使用  if (currentObj.init) { currentObj.init();}
            //屏蔽竖图模式的页面判断
            if (currentObj.halfImg_block_Pages) {
                for (let blockPage of currentObj.halfImg_block_Pages) {
                    if (location.href.includes(blockPage)) {
                        Status.halfImg_block = true;
                        break;
                    };
                }
            }
            this.render();
         }
         render(){
            let $items = $(currentObj.itemSelector);
            if ($items.length<1) return;
            oldDriverBlock();
            addStyle();
            currentObj.init_Style?.();
            let menu = new SettingMenu();
            //加载图片懒加载插件
            lazyLoad = new LazyLoad({
                callback_loaded: function (img) {
                    applyLoadedCoverStyle(img);
                }
            });
            let gridPanel = new GridPanel($items,lazyLoad);
            myModal = new Popover();//弹出插件
            //加载滚动翻页插件
            if(Status.get("autoPage") && $(currentObj.pageSelector).length ){
                scroller=new ScrollerPlugin(gridPanel.$dom,lazyLoad);
            }
         }
    }
    class GridPanel{
        constructor($items,lazyLoad){
            this.$dom=$(`<div id= 'grid-b'></div>`);
            $(currentObj.gridSelector).hide().eq(0).before(this.$dom);
            let $elems = this.constructor.parseItems($items);
            this.$dom.append($elems);
            lazyLoad.update();
        }
        static parseItems(elems){
            let elemsHtml = "";
            let {imgStyle,getAvItem,toolBar,copyBtn,fullTitle,magnet,magnetTip,downloadTip,pictureTip} = {
                imgStyle: Status.isHalfImg() ? halfImgCSS : fullImgCSS,
                getAvItem: currentObj.getAvItem,
                toolBar: Status.get("toolBar")?'':'hidden-b',
                copyBtn: Status.get("copyBtn")?'':'hidden-b',
                fullTitle: Status.get("fullTitle")?'':'titleNowrap',
                magnet: ['javbus','javdb'].includes(currentWeb)?'':'hidden-b',
                magnetTip : lang.tool_magnetTip,
                downloadTip: lang.tool_downloadTip,
                pictureTip: lang.tool_pictureTip,
            };
            let [hiddenWords,hiddenAvids] = [Status.get("hiddenWord"),Status.get("hiddenAvid")];
            for (let i = 0; i < elems.length; i++) {
                let tag = elems.eq(i);
                let html = "";
                //判断是否为 女优个人资料item
                if (currentWeb!="javdb" && tag.find(".avatar-box").length) {
                    tag.find(".avatar-box").addClass("avatar-box-b").removeClass("avatar-box");
                    html = `<div class='item-b'>${tag.html()}</div>`;
                }else{
                    let AvItem = getAvItem(tag);
                    if (!(hiddenWords.find((v, i) => AvItem.title.includes(v)) || 
                        hiddenAvids.find((v, i) => AvItem.AVID.toUpperCase().startsWith(v.toUpperCase()+"-")|| AvItem.AVID.toUpperCase()==v.toUpperCase() ))) {
                        const releaseDate = String(AvItem.date || '').trim();
                        const releaseDateHtml = releaseDate ? `<span class="avid-date-badge">${releaseDate}</span>` : '';
                        const coverStateClass = isPlaceholderCover(AvItem.src, AvItem.title) ? 'minHeight-96 jlc-placeholder-cover' : 'minHeight-200';
                        html = `<div class="item-b">
                                <div class="box-b">
                                <div class="cover-b">
                                    <a  href="${AvItem.href}" target="_blank"><img style="${imgStyle}" class="lazy ${coverStateClass}"  data-src="${AvItem.src}" ></a>
                                </div>
                                <div class="detail-b">
                                    <a name="av-title" href="${AvItem.href}" target="_blank" title="${AvItem.title}" class="${fullTitle}"><span class="tool-span copy-span ${copyBtn}" name="copy">${copy_Svg}</span> <span>${AvItem.title}</span></a>
                                    <div class="info-bottom">
                                      <div class="info-bottom-one">
                                          <a class="avid-link-b" href="${AvItem.href}" target="_blank"><span class="avid-line-b"><span class="tool-span copy-span ${copyBtn}"  name="copy">${copy_Svg}</span><date name="avid">${AvItem.AVID}</date></span>${releaseDateHtml}</a>
                                      </div>
                                      ${AvItem.score?`<a  href="${AvItem.href}" target="_blank"><div class="score">${AvItem.score}</div></a>`:``}
                                      <div class="info-bottom-two">
                                        <div class="item-tag">${AvItem.itemTag}</div>
                                        <div class="toolbar-b ${toolBar}" item-id="${AvItem.AVID}${Math.random().toString(16).slice(2)}"  >
                                        <span name="magnet" class="tool-span  ${magnet}" title="${magnetTip}" AVID="${AvItem.AVID}" data-href="${AvItem.href}">${magnet_Svg}</span>
                                        <span name="download" class="tool-span" title="${downloadTip}" src="${AvItem.src}" src-title="${AvItem.AVID} ${AvItem.title}">${download_Svg}</span>
                                        <span name="picture" class="tool-span" title="${pictureTip}" AVID="${AvItem.AVID}" >${picture_Svg}</span>
                                       </div>
                                     </div>
                                   </div>
                                </div>
                                </div>
                            </div>`;
                    }
                }
                elemsHtml = elemsHtml + html;
            }
            let $elems = $(elemsHtml);
            $elems.find("span[name]").click(function () {
                let name = $(this).attr("name");
                switch (name) {
                    case "copy":
                        markItemVisitedByItem($(this).closest('.item-b').get(0));
                        GM_setClipboard($(this).next().text());
                        showAlert(lang.copySuccess);
                        return false;
                    case "download":
                        let [url,name] = [$(this).attr("src"),$(this).attr("src-title")+".jpg"];
                        downloadImg(url,name,this);break;
                    case "magnet":showMagnetTable($(this).parent("div").attr("item-id"),$(this).attr("AVID").replace(/\./g, '-'),$(this).attr("data-href"),this);break;
                    case "picture":showBigImg($(this).parent("div").attr("item-id"),$(this).attr("AVID"),this);break;
                    default:break;
                }
            });
            return $elems;
        }
    }
    class ScrollerPlugin{
        constructor(waterfall,lazyLoad){
            let me=this;
            me.waterfall=waterfall;
            me.lazyLoad=lazyLoad;
            let $pageNext=$(currentObj.pageNext);
            me.nextURL = $pageNext.attr('href');
            me.scroller_status=$(`<div class = "scroller-status"  style="text-align:center;display:none"><div class="scroll-request"><span></span><span></span><span></span><span></span></div><h2 class="scroll-last">${lang.scrollerPlugin_end}</h2></div>`);
            me.waterfall.after(me.scroller_status);
            me.locked=false;
            me.canLoad=true;
            me.$page=$(currentObj.pageSelector);
            me.domWatch_func=me.domWatch.bind(me);
            document.addEventListener('scroll',me.domWatch_func);
            if (history.scrollRestoration) {
               history.scrollRestoration = 'manual';//防止自动恢复页面位置
            }
        }
        domWatch (){
            let me = this;
            if (me.$page.get(0).getBoundingClientRect().top - $(window).height() < 300 && (!me.locked) && (me.canLoad)) {
                me.locked=true;
                me.loadNextPage(me.nextURL).then(()=>{me.locked=false});
            }
        }
        async loadNextPage(url){
            this.showStatus('request');
            console.log(url);
            let responseText = await fetch(url, { credentials: 'same-origin' }).then(respond=>respond.text());
            let $body = $(new DOMParser().parseFromString(responseText, 'text/html'));
            let elems = GridPanel.parseItems($body.find(currentObj.itemSelector));
            if (currentWeb != "javdb" && location.pathname.includes('/star/') && elems) {
                elems=elems.slice(1);
            }
            const appendedItems = collectCommanderItems(elems);
            this.scroller_status.hide();
            this.waterfall.append(elems);
            this.lazyLoad.update();
            if (typeof runCommanderScanner === 'function') {
                if (appendedItems.length) {
                    runCommanderScanner(appendedItems, true);
                    window.setTimeout(() => runCommanderScanner(appendedItems, true), 120);
                    window.setTimeout(() => runCommanderScanner(appendedItems, true), 700);
                } else {
                    runCommanderScanner(this.waterfall?.get?.(0) || this.waterfall?.[0] || document, true);
                }
                scheduleCommanderRescan(10);
            }
            //history.pushState({}, "", url);
            this.nextURL = $body.find(currentObj.pageNext).attr('href');
            if(!this.nextURL){
                this.canLoad=false;
                this.showStatus("last");
            }
        }
        showStatus(status){
            this.scroller_status.children().each( (i,e)=>{$(e).hide()});
            this.scroller_status.find(`.scroll-${status}`).show();
            this.scroller_status.show();
        }
        destroy (){
            this.scroller_status.remove();
            document.removeEventListener('scroll',this.domWatch_func);
        }
    }

    const addStyle = () => {
        let columnNum = Status.getColumnNum();
        let waterfallWidth=Status.get("waterfallWidth");
        let css_waterfall = `
${currentObj.widthSelector}{width:${waterfallWidth}%;margin:0 ${waterfallWidth>100?(100-waterfallWidth)/2+'%':'auto'};transition:.5s ;}
#grid-b{display:flex;flex-direction:row;flex-wrap:wrap;}
#grid-b .item-b{padding:5px;width:${100 / columnNum}%;transition:.5s ;animation: fadeInUp .5s ease-out;}
#grid-b .box-b{border-radius:5px;background-color:white;border:1px solid rgba(0,0,0,0.2);box-shadow:0 2px 3px 0 rgba(0,0,0,0.1);overflow:hidden}
#grid-b .box-b a:link{color:black}
#grid-b .box-b a:visited{color:gray}
#grid-b .box-b .cover-b{text-align:center}
#grid-b .box-b .detail-b{padding:7px}
#grid-b .box-b .detail-b a{display:block}
#grid-b .info-bottom,.info-bottom-two{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap}
#grid-b .avatar-box-b{display:flex;flex-direction:column;background-color:white;border-radius:5px;align-items:center;border:1px solid rgba(0,0,0,0.2)}
#grid-b .avatar-box-b p{margin:0 !important}
#grid-b date:first-of-type{font-size:18px !important}
#grid-b .toolbar-b{float:right;padding:2px;white-space:nowrap}
#grid-b .toolbar-b span{margin-right:2px}
#grid-b .copy-span{vertical-align:middle;display:inline-block}
#grid-b span.tool-span{cursor:pointer;opacity:.3}
#grid-b span.tool-span:hover{opacity:1}
#grid-b .item-tag{display:inline-block;white-space:nowrap}
#grid-b .hidden-b{display:none}
#grid-b .minHeight-200{min-height:200px}
#grid-b .cover-b img:not([src]) {visibility: hidden;}
svg.tool-svg{fill:currentColor;width:22px;height:22px;vertical-align:middle}
span.span-loading{display:inline-block;animation:span-loading 2s infinite}

#myModal{overflow-x:hidden;overflow-y:auto;display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:1050;background-color:rgba(0,0,0,0.5)}
#myModal #modal-div{position:relative;width:80%;margin:0 auto;background-color:rgb(6 6 6 / 50%);border-radius:8px;animation:fadeInDown .5s}
#modal-div .pop-up-tag{border-radius:8px;overflow:hidden}
#modal-div .sample-box-zdy,.avatar-box-zdy{display:inline-block;border-radius:8px;background-color:#fff;overflow:hidden;margin:5px;width:140px}
#modal-div .sample-box-zdy .photo-frame{overflow:hidden;margin:10px}
#modal-div .sample-box-zdy img{height:90px}
#modal-div .avatar-box-zdy .photo-frame{overflow:hidden;height:120px;margin:10px}
#modal-div .avatar-box-zdy img{height:120px}
#modal-div .avatar-box-zdy span{font-weight:bold;text-align:center;word-wrap:break-word;display:flex;justify-content:center;align-items:center;padding:5px;line-height:22px;color:#333;background-color:#fafafa;border-top:1px solid #f2f2f2}

#menu-div{white-space:nowrap;background-color:white;color:black;display:none;min-width:200px;border-radius:5px;padding:10px;box-shadow:0 10px 20px 0 rgb(0 0 0 / 50%)}
#menu-div>div:hover{background-color:gainsboro}
#menu-div .switch-div{display:flex;align-items:center;font-size:large;font-weight:bold}
#menu-div .switch-div *{margin:0;padding:4px}
#menu-div .switch-div label{flex-grow:1}
#menu-div .range-div{display:flex;flex-direction:row;flex-wrap:nowrap}
#menu-div .range-div input{cursor:pointer;width:80%;max-width:200px}
.alert-zdy{position:fixed;top:50%;left:50%;padding:12px 20px;font-size:20px;color:white;background-color:rgb(0,0,0,.75);border-radius:4px;animation:itemShow .3s;z-index:1051}
.titleNowrap{white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
.download-icon{position:absolute;right:0;z-index:2;cursor:pointer}
.download-icon>svg{width:30px;height:30px;fill:aliceblue}
@keyframes fadeInUp{0%{transform:translate3d(0,10%,0);opacity:.5}100%{transform:none;opacity:1}}
@keyframes fadeInDown{0%{transform:translate3d(0,-100%,0);opacity:0}100%{transform:none;opacity:1}}
@keyframes itemShow{0%{transform:scale(0)}100%{transform:scale(1)}}
@keyframes span-loading{0%{transform:scale(1);opacity:1}50%{transform:scale(1.2);opacity:1}100%{transform:scale(1);opacity:1}}
.scroll-request{text-align:center;height:15px;margin:15px auto}
.scroll-request span{display:inline-block;width:15px;height:100%;margin-right:8px;border-radius:50%;background:rgb(16,19,16);animation:scroll-load 1s ease infinite}
@keyframes scroll-load{0%,100%{transform:scale(1)} 50%{transform:scale(0)}}
.scroll-request span:nth-child(2){animation-delay:0.125s}
.scroll-request span:nth-child(3){animation-delay:0.25s}
.scroll-request span:nth-child(4){animation-delay:0.375s}
.imgResult-li{color:rgb(255,255,255,50%);font-size:20px}
.imgResult-li.imgResult-Current{color:white}
.imgResult-loading{animation:changeTextColor 1s  ease-in  infinite}
.imgResult-li:hover{cursor:pointer;color:white}
@keyframes changeTextColor{0%{color:rgba(255,255,255,1)}50%{color:rgba(255,255,255,.5)}100%{color:rgba(255,255,255,1)}}`;
        GM_addStyle(css_waterfall);
    }

    class DownloadPanel{
        constructor(){
            this.addPanel();
        }
        async loadJS(){
            let me =this;
            const urlList = [['https://unpkg.com/jszip@3.6.0/dist/jszip.min.js','https://unpkg.com/file-saver@2.0.5/dist/FileSaver.min.js'],
                            ['https://cdn.jsdelivr.net/npm/jszip@3.6.0/dist/jszip.min.js','https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js'],
                            ['https://cdnjs.cloudflare.com/ajax/libs/jszip/3.6.0/jszip.min.js','https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js']];
            const getJSFile = url => {
                console.log(url);
                return getRequest(url,{timeout: 10000,responseType: 'text'})
            }
            let index = GM_getValue('downloadPanel_url',0);
            for (let k = 0; k < urlList.length; k++) {
                const values = await Promise.all([getJSFile(urlList[index][0]), getJSFile(urlList[index][1])])
                                     .catch(reason => {console.log(reason); return false});
                if(values) {
                    values.forEach(v=> eval(v.responseText));
                    me.element.find("button[name=download]").attr("disabled",false);
                    GM_setValue('downloadPanel_url',index);
                    break;
                }else{
                    index++;
                    if(index>=urlList.length){ index = urlList.length-index; }
                    continue;
                }
            }
        }
        addPanel(){
            let me=this;
            GM_addStyle(`#downloadPanel{margin:5px;}#downloadPanel button[name="download"]{height:38px;border:1px solid #ce9c9c;padding:0 9px;border-radius:4px;font-size:20px;}#downloadPanel input{height:30px;padding:4px;border-radius:4px;border:1px solid #ce9c9c;font-size:20px;}#downloadPanel input:focus{outline:0px;}#downloadPanel button[disabled]{color:#0006;cursor:not-allowed !important}.downloadform{font-size:20px;display:flex;height:40px;align-items:center;}#file-Info div[name=filename]{width:70%;display:inline-block;text-align:right}#file-Info div[name=state]{width:30%;display:inline}`)
            me.element = $(`<div  id="downloadPanel">
                          <div class="downloadform">
                            <button name="download"  disabled="true">下载</button>
                            <span style="margin-left:10px;">番号: </span><input  placeholder="ssni,abp" autocomplete="off" name="key"></input>
                            <span style="display:none">线程数</span><input style="display:none" name="poolLimit" value="3"></input>
                            <span class="progress-Info" style="margin-left:10px;">
                                <span name="sum"></span><span name="total"></span><span name="msg"></span>
                            </span>
                          </div>
                          <div id="file-Info"></div>
                       </div>`);
            me.loadJS();
            me.element.find("button[name=download]").on("click", function () {
                let button = this;
                button.disabled= true;
                me.resetInfo();
                let arrayList = me.getResultList();
                if(arrayList.length){
                    me.element.find("span[name=total]").text(arrayList.length);
                    let poolLimit = me.element.find("input[name=poolLimit]").val();
                    me.downloadZip(poolLimit?poolLimit:5,arrayList).then(()=>(button.disabled=false));
                }else{
                    me.element.find("span[name=msg]").text("无过滤结果");button.disabled=false;
                }
            });
        }
        getResultList(){
            let list =[];
            let key = this.element.find("input[name=key]").val().toUpperCase();
            let keyArray = key.replace("，",",").split(",").filter(k=> k && k.trim());
            $("div.box-b").each(function () {
                let avid = $(this).find("date[name=avid]").text();
                if(keyArray.length && (! keyArray.find(k=> avid.toUpperCase().indexOf(k)>-1)) ){
                    return ;
                }
                let url = $(this).find("img.lazy").attr("data-src");
                let title = $(this).find("a[name='av-title']").attr("title");
                let filename = `${avid} ${title.replace(/\//g,'_')}.jpg`;//标题中含有斜杠时，压缩包创建文件夹
                list.push({avid:avid,url:url,filename:filename});
            });
            return list;
        }
        downloadZip(poolLimit,arrayList){
            let me=this;
            let sum = 0;
            let zip = new JSZip();
            return me.asyncPool(poolLimit,arrayList,function(item,array){
                let $state=me.addFileInfo(item.avid);
                return me.getImgResource(item.url).then(r =>{
                    if (r.status == '200') {
                        zip.file(item.filename, r.response);
                        $state.text(`✔`);
                        me.element.find(`span[name="sum"]`).text(`${++sum}/`);
                    } else {
                        $state.text(`❎`);
                    }
                }).catch(err =>$state.text(`❎`));
            }).then(() => zip.generateAsync({type:"blob"}).then(blob => saveAs(blob, "download.zip") ))
        }
        getImgResource(url){
            return getRequest(url,{responseType: 'blob',headers : {Referer : url}})
        }
        //https://blog.csdn.net/ghostlpx/article/details/106431837
        async asyncPool(poolLimit, array, iteratorFn) {
            const ret = []
            const executing = []
            for (const item of array) {
                const p = Promise.resolve().then(() => iteratorFn(item, array));
                ret.push(p)
                const e = p.then(() => executing.splice(executing.indexOf(e), 1))
                executing.push(e)
                if (executing.length >= poolLimit) {
                    await Promise.race(executing)
                }
            }
            return Promise.all(ret)
        }
        addFileInfo(avid){
            let $fileInfo=$(`<div style="width:50%;display:inline-block;float:left;"><div name="filename">${avid}:</div><div name="state">--></div></div>`);
            this.element.find("#file-Info").append($fileInfo);
            return $fileInfo.find("div[name=state]");
        }
        resetInfo(){
            this.element.find("span.progress-Info span").text("");
            this.element.find("#file-Info").empty();
        }
    }

    class InputTagPanel{
        constructor(key, placeholder) {
            let me = this;
            me.key = key;
            me.data = Status.get(key) || [];
            me.$panel = $(`<div class="input-tag-panel" name="${key}"></div>`);
            me.$input = $(`<input type="text" autocomplete="off" value="" placeholder="${placeholder}">`);
            me.$panel.append(me.$input);
            me.data.forEach(function(value, index, array) {
                me.$panel.append(`<div class="tag-div"><span>${value}</span><a href="#">X</a></div>`);
            });
            me.$panel.on('click', 'a', function(){
                me.delete($(this));
            });
            me.$input.keyup(function(event) {
                let key = me.$input.val().trim();
                if (key && ((event.keyCode ? event.keyCode : event.which) === 13)) {
                    let keyArray = key.replace("，",",").split(",").filter(k=> k && k.trim());
                    me.add(keyArray);
                }
            });
            GM_addStyle(`.input-tag-panel{display:flex;flex-direction:row;flex-wrap:wrap;margin:5px;align-content:flex-start;align-items:stretch;}.input-tag-panel>div{font-size:25px;height:25px;box-shadow:5px 5px 4px 0 rgb(0 0 0 / 10%);display:flex;line-height:25px;background-color:burlywood;float:left;padding:5px;margin-right:5px;margin-top:5px;border-radius:4px;align-items:center;}.input-tag-panel>div>a{color:white !important;font-size:20px;text-decoration:none;padding:0 5px 0 5px;}.input-tag-panel>div>a:hover{cursor:pointer;color:red;}.input-tag-panel input{width:100%;height:30px;border:solid 1px burlywood;border-radius:5px;padding:5px;font-size:20px;}.input-tag-panel input:focus{outline:none;}`);
        }
        add(keyArray) {
            let me = this;
            let $tag = [];
            keyArray.forEach(key=>{
                $tag.push(`<div class="tag-div"><span>${key}</span><a>X</a></div>`);
                me.data.push(key);
            })
            me.$panel.append($tag).fadeIn();
            Status.set(me.key, me.data);
        }
        delete($a) {
            let me = this;
            let key = $a.prev('span').text();
            $a.parent('div').fadeOut();
            let index = me.data.findIndex(v => key == v);
            index > -1 && me.data.splice(index, 1);
            Status.set(me.key, me.data);
        }
    }
    
    class TabPanel{
        constructor(){
            let me=this;
            GM_addStyle(`#tabPanel{display:none;width:600px;height:400px;background-color:white;border-radius:5px;position:fixed;right:15px;bottom:5px;color:black;text-align:center;border:1px solid #ccc;box-shadow:5px 5px 4px 0 rgb(0 0 0 / 10%);z-index:1000}#tabPanel *{box-sizing:content-box;}#tabPanel ul{padding:0;margin:0;}.tab_list{height:40px;background-color:#facbcb;}.tab_list ul li{list-style:none;float:left;height:40px;padding:0 20px;font-size:20px;border-radius:5px 5px 0 0;text-align:center;line-height:40px;cursor:pointer;}.tab_list .tab_current{background-color:white;}.tab_content{height:355px;}.tab_content_item{overflow-y:auto;display:none;width:100%;height:100%;background-color:white;}.tab_content_item::-webkit-scrollbar{width:7px}.tab_content_item::-webkit-scrollbar-track{border-radius:8px;background-color:#f5f5f5}.tab_content_item::-webkit-scrollbar-thumb{border-radius:8px;background-color:#c8c8c8}.close-div{position:absolute;right:0px;width:40px;height:40px;font-size:40px;line-height:30px;cursor:pointer;color:gray;transform:rotate(45deg);}.close-div:hover{color:black;}`)
            me.element = $(`<div id="tabPanel">
                                <div class="tab_list">
                                    <ul><li>批量下载</li><li>屏蔽词</li></ul>
                                    <div class="close-div">+</div>
                                </div>
                                <div class="tab_content">
                                    <div class="tab_content_item"></div>
                                    <div class="tab_content_item"></div>
                                </div>   
                            </div>`);
            me.$li = me.element.find(".tab_list ul>li");
            me.$item = me.element.find(".tab_content_item");
            me.$li.on("click", function () {
                me.show(me.$li.index(this));
            });
            me.element.find(".close-div").on("click", function () {
                me.element.toggle();
            });
            $('body').append(me.element);
        }
        show(index=0){
            let me =this;
            me.$li.each((i,el)=>{$(el).removeClass("tab_current")});
            me.$li.eq(index).addClass("tab_current");
            me.$item.each((i,el)=>{$(el).hide()});
            if(me.$item.eq(index).children().length==0){
                me.addItem(index);
            }
            me.$item.eq(index).show();
            me.element.show();
        }
        addItem(index){
            let me= this;
            switch (index) {
                case 0:
                    let downloadPanel =new DownloadPanel();
                    me.$item.eq(index).append(downloadPanel.element);
                    break;
                case 1:
                    let tag1 =new InputTagPanel("hiddenWord","标题：支持逗号隔开");
                    let tag2 =new InputTagPanel("hiddenAvid",`番号：支持逗号隔开,单个或系列如SSIS,OPX-123`);
                    me.$item.eq(index).append(tag1.$panel).append(tag2.$panel);
                    break;
            }
        }
        static getInstance(){
            if(!this.instance){
                this.instance = new TabPanel();
            }
            return this.instance;
        }
    }    
    startIntegratedApp();
})();


