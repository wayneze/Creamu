// @@creamu-part:60-list-runtime
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
            if (currentObj.excludePages) {
                for (let page of currentObj.excludePages) {
                    if (location.pathname.includes(page)) return;
                }
            }
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
            showVersionNotice();
            lazyLoad = new CoverLazyLoader({
                callback_loaded: function (img) {
                    applyLoadedCoverStyle(img);
                }
            });
            let gridPanel = new GridPanel($items,lazyLoad);
            myModal = new Popover();//弹出插件
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
            lazyLoad.update(this.$dom);
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
            me.scroller_status=$(`<div class="scroller-status"><div class="scroll-request"><span></span><span></span><span></span><span></span></div><h2 class="scroll-last">${lang.scrollerPlugin_end}</h2><div class="scroll-error"><span>${lang.scrollerPlugin_error}</span><button type="button" class="scroll-retry">${lang.scrollerPlugin_retry}</button></div></div>`);
            me.waterfall.after(me.scroller_status);
            me.locked=false;
            me.canLoad=true;
            me.destroyed=false;
            me.scrollFrame=null;
            me.abortController=null;
            me.$page=$(currentObj.pageSelector);
            me.domWatch_func=me.domWatch.bind(me);
            me.scroller_status.on('click', '.scroll-retry', () => {
                if (!me.locked && me.canLoad && me.nextURL) void me.loadNextPage(me.nextURL);
            });
            document.addEventListener('scroll',me.domWatch_func,{passive:true});
            if (history.scrollRestoration) {
               me.previousScrollRestoration = history.scrollRestoration;
               history.scrollRestoration = 'manual';
            }
            me.domWatch();
        }
        domWatch (){
            if (this.destroyed || this.scrollFrame !== null) return;
            this.scrollFrame = window.requestAnimationFrame(() => {
                this.scrollFrame = null;
                const page = this.$page.get(0);
                if (!page || this.locked || !this.canLoad || !this.nextURL) return;
                if (page.getBoundingClientRect().top - window.innerHeight < 300) {
                    void this.loadNextPage(this.nextURL);
                }
            });
        }
        async loadNextPage(url){
            if (!url || this.destroyed || this.locked || !this.canLoad) return false;
            this.locked = true;
            this.showStatus('request');
            const controller = typeof AbortController === 'function' ? new AbortController() : null;
            this.abortController = controller;
            const timeout = controller
                ? window.setTimeout(() => controller.abort(), 20000)
                : null;
            let loaded = false;
            try {
                const response = await fetch(url, {
                    credentials: 'same-origin',
                    signal: controller?.signal
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const responseText = await response.text();
                if (!responseText) throw new Error('Empty response');
                if (this.destroyed) return false;

                let $body = $(new DOMParser().parseFromString(responseText, 'text/html'));
                let elems = GridPanel.parseItems($body.find(currentObj.itemSelector));
                if (currentWeb != "javdb" && location.pathname.includes('/star/') && elems) {
                    elems=elems.slice(1);
                }
                const appendedItems = collectCommanderItems(elems);
                this.scroller_status.hide();
                this.waterfall.append(elems);
                this.lazyLoad.update(elems);
                if (typeof runCommanderScanner === 'function') {
                    if (appendedItems.length) {
                        runCommanderScanner(appendedItems, true);
                        window.setTimeout(() => runCommanderScanner(appendedItems, true), 120);
                        window.setTimeout(() => runCommanderScanner(appendedItems, true), 700);
                    } else {
                        runCommanderScanner(this.waterfall?.get?.(0) || this.waterfall?.[0] || document, true);
                    }
                }
                this.nextURL = $body.find(currentObj.pageNext).attr('href');
                if(!this.nextURL){
                    this.canLoad=false;
                    this.showStatus("last");
                }
                loaded = true;
                return true;
            } catch (error) {
                if (!this.destroyed) {
                    console.warn('[Creamu] auto page', error);
                    this.showStatus('error');
                }
                return false;
            } finally {
                if (timeout !== null) window.clearTimeout(timeout);
                if (this.abortController === controller) this.abortController = null;
                this.locked = false;
                if (loaded && this.canLoad && !this.destroyed) this.domWatch();
            }
        }
        showStatus(status){
            this.scroller_status.children().each( (i,e)=>{$(e).hide()});
            this.scroller_status.find(`.scroll-${status}`).show();
            this.scroller_status.show();
        }
        destroy (){
            this.destroyed=true;
            this.abortController?.abort();
            this.abortController=null;
            if (this.scrollFrame !== null) {
                window.cancelAnimationFrame(this.scrollFrame);
                this.scrollFrame=null;
            }
            this.scroller_status.remove();
            document.removeEventListener('scroll',this.domWatch_func);
            if (this.previousScrollRestoration && history.scrollRestoration === 'manual') {
                history.scrollRestoration = this.previousScrollRestoration;
            }
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

.alert-zdy{position:fixed;top:50%;left:50%;padding:12px 20px;font-size:20px;color:white;background-color:rgb(0,0,0,.75);border-radius:4px;animation:itemShow .3s;z-index:1051}
.titleNowrap{white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
.download-icon{position:absolute;right:0;z-index:2;cursor:pointer}
.download-icon>svg{width:30px;height:30px;fill:aliceblue}
@keyframes fadeInUp{0%{transform:translate3d(0,10%,0);opacity:.5}100%{transform:none;opacity:1}}
@keyframes fadeInDown{0%{transform:translate3d(0,-100%,0);opacity:0}100%{transform:none;opacity:1}}
@keyframes itemShow{0%{transform:scale(0)}100%{transform:scale(1)}}
@keyframes span-loading{0%{transform:scale(1);opacity:1}50%{transform:scale(1.2);opacity:1}100%{transform:scale(1);opacity:1}}
.scroller-status{text-align:center;display:none}
.scroll-request{text-align:center;height:15px;margin:15px auto}
.scroll-request span{display:inline-block;width:15px;height:100%;margin-right:8px;border-radius:50%;background:rgb(16,19,16);animation:scroll-load 1s ease infinite}
@keyframes scroll-load{0%,100%{transform:scale(1)} 50%{transform:scale(0)}}
.scroll-request span:nth-child(2){animation-delay:0.125s}
.scroll-request span:nth-child(3){animation-delay:0.25s}
.scroll-request span:nth-child(4){animation-delay:0.375s}
.scroll-error{display:flex;gap:8px;align-items:center;justify-content:center;margin:14px auto;color:#b42318}
.scroll-retry{border:1px solid currentColor;border-radius:4px;padding:4px 10px;background:transparent;color:inherit;cursor:pointer}
.imgResult-li{color:rgb(255,255,255,50%);font-size:20px}
.imgResult-li.imgResult-Current{color:white}
.imgResult-loading{animation:changeTextColor 1s  ease-in  infinite}
.imgResult-li:hover{cursor:pointer;color:white}
@keyframes changeTextColor{0%{color:rgba(255,255,255,1)}50%{color:rgba(255,255,255,.5)}100%{color:rgba(255,255,255,1)}}`;
        GM_addStyle(css_waterfall);
    }

    startIntegratedApp();
})();
