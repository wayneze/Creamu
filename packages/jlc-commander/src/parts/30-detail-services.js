// @@creamu-part:details
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


