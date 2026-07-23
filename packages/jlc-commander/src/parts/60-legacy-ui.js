// @@creamu-part:60-legacy-ui
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


