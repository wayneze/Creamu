function installFc2Theme() {
  const style = document.createElement('style');
  style.id = 'creamu-fc2-theme';
  style.textContent = `
html.creamu-fc2 {
  --fc-bg:#121313; --fc-panel:#1b1d1d; --fc-raised:#242727;
  --fc-text:#f1eee8; --fc-muted:#b0b5b3; --fc-line:#373c3a;
  --fc-accent:#f3a18c; --fc-ink:#29130e; --fc-green:#a6d3b4;
  background:var(--fc-bg); color-scheme:dark;
}
html.creamu-fc2 body { box-sizing:border-box; margin:0; min-width:0!important; width:100%!important; background:var(--fc-bg)!important; color:var(--fc-text); }
html.creamu-fc2 .l-wp { min-width:0!important; width:100%!important; }
.fc-app, .fc-dialog, .fc-toast, .fc-restore {
  font:14px/1.55 "Segoe UI","Microsoft YaHei",sans-serif;
  color:var(--fc-text,#f1eee8); text-align:left; letter-spacing:normal;
}
.fc-app *, .fc-dialog *, .fc-restore * { box-sizing:border-box; }
.fc-app button, .fc-app input, .fc-app select, .fc-dialog button,
.fc-dialog input, .fc-dialog textarea, .fc-dialog select, .fc-restore button {
  font:inherit; color:inherit; box-sizing:border-box;
}
.fc-app button, .fc-dialog button, .fc-restore button, .fc-link-button {
  display:inline-flex; align-items:center; justify-content:center; gap:6px;
  min-height:40px; padding:8px 13px; border:1px solid var(--fc-line,#373c3a);
  border-radius:8px; background:var(--fc-panel,#1b1d1d); cursor:pointer;
  text-decoration:none; color:var(--fc-text,#f1eee8); line-height:1.3;
  transition:background .15s,border-color .15s;
}
.fc-app button:hover, .fc-dialog button:hover { background:var(--fc-raised); border-color:#6d7772; }
.fc-app button[aria-pressed=true], .fc-app button[aria-current=page], .fc-primary {
  background:var(--fc-accent)!important; color:var(--fc-ink)!important; border-color:transparent!important;
}
.fc-app :focus-visible, .fc-dialog :focus-visible, .fc-restore :focus-visible {
  outline:2px solid var(--fc-accent,#f3a18c); outline-offset:3px;
}
.fc-app button:disabled, .fc-dialog button:disabled { opacity:.55; cursor:wait; }
.fc-app input:not([type=checkbox]):not([type=range]), .fc-app select,
.fc-dialog input:not([type=checkbox]), .fc-dialog textarea, .fc-dialog select {
  width:100%; min-height:42px; border:1px solid var(--fc-line); border-radius:8px;
  padding:9px 12px; background:var(--fc-bg); color:var(--fc-text); box-shadow:none;
}
.fc-app input::placeholder, .fc-dialog input::placeholder { color:var(--fc-muted); opacity:1; }
.fc-app a { color:inherit; text-decoration:none; }
.fc-app h1, .fc-app h2, .fc-app p, .fc-dialog h2, .fc-dialog p { margin:0; }
.fc-header {
  display:flex; align-items:center; gap:24px; padding:16px 32px;
  border-bottom:1px solid var(--fc-line); background:var(--fc-bg); flex-wrap:wrap;
}
.fc-brand { display:flex; align-items:center; gap:12px; flex-shrink:0; }
.fc-brand-mark {
  display:grid; place-items:center; width:36px; height:36px; border-radius:11px 11px 11px 3px;
  background:var(--fc-accent); color:var(--fc-ink); font:bold 24px/1 Georgia,serif;
}
.fc-brand strong { font:600 23px/1.1 Georgia,"Microsoft YaHei",serif; letter-spacing:-.6px; }
.fc-brand small { display:block; color:var(--fc-muted); font-size:10px; letter-spacing:2px; margin-top:4px; }
.fc-header nav { display:flex; gap:8px; flex:1; flex-wrap:wrap; }
.fc-header nav button { background:transparent; border-color:transparent; }
.fc-header-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.fc-site-menu { position:relative; }
.fc-site-menu summary { cursor:pointer; padding:8px; min-height:40px; display:list-item; list-style-position:inside; }
.fc-site-menu > div { position:absolute; top:100%; right:0; z-index:30; min-width:170px; padding:8px; background:var(--fc-panel); border:1px solid var(--fc-line); border-radius:8px; box-shadow:0 8px 24px #0005; }
.fc-site-menu a { display:block; padding:10px; border-radius:5px; }
.fc-site-menu a:hover { background:var(--fc-raised); }
.fc-main { max-width:1920px; margin:auto; padding:30px 32px 64px; }
.fc-heading { display:flex; align-items:end; gap:20px; justify-content:space-between; margin-bottom:22px; }
.fc-eyebrow { color:var(--fc-accent); font-size:11px; letter-spacing:2px; margin-bottom:7px!important; }
.fc-heading h1 { font-size:28px; line-height:1.3; font-weight:650; letter-spacing:-.6px; }
.fc-subtitle { color:var(--fc-muted); margin-top:8px!important; font-size:13px; }
.fc-scope { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.fc-scope a { padding:7px 12px; border:1px solid var(--fc-line); border-radius:30px; color:var(--fc-muted); }
.fc-scope a[aria-current=page] { border-color:var(--fc-accent); color:var(--fc-accent); }
.fc-toolbar { padding:16px; border:1px solid var(--fc-line); border-radius:12px; background:var(--fc-panel); }
.fc-filters { display:grid; grid-template-columns:minmax(200px,1fr) minmax(540px,1.15fr); gap:12px; align-items:end; }
.fc-filter-options > div { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }
.fc-filter-options > summary { display:none; }
.fc-app label, .fc-dialog label { display:block; font-size:12px; color:var(--fc-muted); }
.fc-app label > input, .fc-app label > select, .fc-dialog label > input, .fc-dialog label > textarea { margin-top:5px; }
.fc-more { margin-top:12px; }
.fc-more summary { cursor:pointer; color:var(--fc-muted); }
.fc-more > div { display:flex; gap:18px; align-items:end; padding-top:12px; flex-wrap:wrap; }
.fc-more label { min-width:130px; }
.fc-check { display:flex!important; gap:8px; align-items:center; min-height:42px; }
.fc-check input { margin:0!important; accent-color:var(--fc-accent); }
.fc-results-bar { display:flex; justify-content:space-between; gap:12px; margin:22px 0 14px; color:var(--fc-muted); font-size:12px; }
.fc-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(245px,1fr)); gap:20px; }
.fc-app[data-density=compact] .fc-grid { grid-template-columns:repeat(auto-fill,minmax(195px,1fr)); gap:14px; }
.fc-card { display:flex; flex-direction:column; min-width:0; overflow:hidden; border:1px solid var(--fc-line); border-radius:12px; background:var(--fc-panel); }
.fc-card:hover { border-color:#69756d; }
.fc-card[data-followed=true] { border-color:var(--fc-accent); box-shadow:0 0 0 1px var(--fc-accent); }
.fc-cover { display:block; position:relative; aspect-ratio:16/10; background:#292d2b; overflow:hidden; }
.fc-cover::before { content:"FC2 LIVE"; position:absolute; inset:0; display:grid; place-items:center; color:#a6b0aa; font-size:13px; letter-spacing:3px; }
.fc-cover img { position:relative; display:block; width:100%; height:100%; object-fit:contain; background:#101211; }
.fc-cover-badges { position:absolute; left:10px; right:10px; bottom:10px; display:flex; gap:5px; justify-content:space-between; pointer-events:none; }
.fc-badge { padding:3px 7px; border-radius:4px; background:#171c19; color:#edf2ed; font-size:11px; border:1px solid #4e5e52; }
.fc-badge-live { color:#b7e5c5; }
.fc-visited { position:absolute; top:10px; left:10px; padding:4px 8px; border:1px solid #d7b5a8; border-radius:5px; background:#2b211d; color:#f5c7b6; font-size:11px; line-height:1.5; }
.fc-card-body { flex:1; padding:14px 14px 10px; }
.fc-card-title { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; min-height:44px; font-size:15px; line-height:22px; font-weight:600; overflow-wrap:anywhere; }
.fc-card-name { display:block; color:var(--fc-muted)!important; font-size:12px; margin-top:7px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.fc-card-note { color:var(--fc-accent); font-size:12px; margin-top:8px!important; white-space:pre-wrap; overflow-wrap:anywhere; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.fc-card-tags { display:flex; flex-wrap:wrap; gap:4px; margin-top:9px; }
.fc-card-tags span { color:var(--fc-muted); font-size:11px; padding:2px 6px; background:var(--fc-raised); border-radius:4px; }
.fc-card-actions { padding:0 10px 10px; display:flex; gap:6px; }
.fc-card-actions button { flex:1; min-width:0; min-height:36px; padding:7px 5px; font-size:12px; }
.fc-card-info { display:flex; justify-content:space-between; gap:8px; color:var(--fc-muted); font-size:11px; margin:10px 0 0; }
.fc-empty { grid-column:1/-1; border:1px dashed var(--fc-line); padding:54px 20px; text-align:center; color:var(--fc-muted); border-radius:12px; }
.fc-message { margin:16px 0!important; padding:12px 16px; background:#362920; color:#f4cfad; border:1px solid #7e5c3a; border-radius:8px; }
.fc-message[hidden] { display:none; }
html.creamu-fc2-list .js-head, html.creamu-fc2-list #js-container { display:none!important; }
html.creamu-fc2 .js-foot { background:var(--fc-bg); color:var(--fc-muted); border-top:1px solid var(--fc-line); margin:0; padding:24px; }
html.creamu-fc2 .js-foot a { color:var(--fc-muted); }
.fc-dialog {
  box-sizing:border-box;
  width:min(560px,calc(100vw - 32px)); max-height:85dvh; padding:24px;
  background:var(--fc-panel); border:1px solid var(--fc-line); border-radius:14px; overflow:auto;
}
.fc-dialog::backdrop { background:rgba(0,0,0,.72); }
.fc-dialog h2 { font-size:21px; margin-bottom:8px; }
.fc-dialog p { color:var(--fc-muted); margin-bottom:16px; }
.fc-dialog label { margin:14px 0; }
.fc-dialog textarea { resize:vertical; min-height:100px; }
.fc-dialog-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:20px; justify-content:flex-end; }
.fc-dialog hr { border:0; border-top:1px solid var(--fc-line); margin:22px 0; }
.fc-dialog details summary { cursor:pointer; font-size:16px; }
.fc-dialog-status { white-space:pre-wrap; overflow-wrap:anywhere; font-size:12px; margin-top:12px!important; }
.fc-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); z-index:2147483646; max-width:calc(100vw - 32px); background:#f1eee8; color:#191e1a; padding:12px 20px; border-radius:9px; box-shadow:0 6px 24px #0006; }
.fc-restore { display:flex; gap:16px; align-items:center; justify-content:center; flex-wrap:wrap; padding:12px; background:#1b1d1d; color:#f1eee8; }
html.fc-multiview-open { overflow:hidden; }
#fc-multiview { position:fixed; inset:0; display:flex; flex-direction:column; background:var(--fc-bg); z-index:1000; container:fc-multi / inline-size; }
html.fc-console-docked #fc-multiview { right:var(--fc-dock-width); }
.fc-multi-count { color:var(--fc-muted); font-size:12px; font-weight:400; white-space:nowrap; }
.fc-multi-toolbar { display:grid; grid-template-columns:auto minmax(180px,1fr) auto auto; align-items:center; gap:16px; flex-shrink:0; padding:9px 16px; border-bottom:1px solid var(--fc-line); }
.fc-multi-brand, .fc-multi-options, .fc-multi-actions { display:flex; align-items:center; gap:8px; }
.fc-multi-brand strong { font-size:14px; font-weight:600; white-space:nowrap; }
.fc-multi-brand .fc-brand-mark { width:28px; height:28px; border-radius:8px 8px 8px 3px; font-size:21px; }
.fc-multi-add { display:flex; gap:6px; min-width:0; max-width:380px; margin:0; }
#fc-multiview .fc-multi-toolbar :is(button,input,select,summary) { min-height:34px; padding:6px 9px; font-size:12px; line-height:20px; }
#fc-multiview .fc-multi-add input { flex:1; min-width:0; width:0; }
.fc-multi-add button { flex-shrink:0; white-space:nowrap; }
.fc-multi-toolbar label { display:flex; align-items:center; gap:6px; white-space:nowrap; }
#fc-multiview .fc-multi-toolbar label select { width:auto; margin:0; }
.fc-multi-more > div button { display:block; width:100%; text-align:left; background:transparent; border:0; }
.fc-multi-more > div button:hover { background:var(--fc-raised); }
.fc-multi-quality-actions { display:flex; flex-wrap:wrap; gap:8px; }
.fc-dialog .fc-multi-quality-row { display:grid; grid-template-columns:minmax(0,1fr) minmax(150px,1fr); align-items:center; gap:12px; }
.fc-multi-quality-row span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.fc-dialog .fc-multi-quality-row select { margin:0; }
.fc-multi-scroll { overflow:auto; flex:1; min-height:0; padding:12px 16px 24px; }
@container fc-multi (max-width:850px) {
  .fc-multi-toolbar { grid-template-columns:minmax(0,1fr) auto; gap:8px 12px; }
  .fc-multi-actions { grid-column:2; grid-row:1; justify-content:flex-end; }
  .fc-multi-add { max-width:none; }
  .fc-multi-options { justify-content:flex-end; }
}
@container fc-multi (max-width:480px) {
  .fc-multi-toolbar { padding:8px 12px; gap:8px; }
  .fc-multi-add { grid-column:1/-1; }
  .fc-multi-options { grid-column:1/-1; justify-content:flex-start; }
  #fc-multiview .fc-multi-add input { font-size:16px; }
}
.fc-multi-grid { --fc-multi-header-height:54px; display:grid; grid-template-columns:repeat(var(--fc-multi-columns,1),minmax(0,1fr)); gap:12px; align-items:start; reading-flow:grid-order; }
.fc-multi-grid.is-fit { grid-auto-rows:var(--fc-multi-row-height); align-items:stretch; }
.fc-multi-grid.is-fit .fc-multi-tile { display:flex; flex-direction:column; min-height:0; }
.fc-multi-grid.is-fit .fc-multi-video { flex:1; min-height:0; aspect-ratio:auto; }
.fc-multi-empty { max-width:560px; margin:12vh auto; padding:40px 24px; border:1px dashed var(--fc-line); border-radius:12px; text-align:center; }
.fc-multi-empty strong { font-size:23px; font-weight:500; }
.fc-multi-empty p { margin:12px 0 24px; color:var(--fc-muted); }
.fc-multi-empty[hidden] { display:none; }
.fc-multi-tile { min-width:0; border:1px solid var(--fc-line); border-radius:10px; overflow:hidden; background:#080a09; }
.fc-multi-tile.is-audible { border-color:var(--fc-accent); }
.fc-multi-tile-header { display:flex; align-items:center; gap:8px; height:var(--fc-multi-header-height); flex-shrink:0; padding:8px 10px; background:var(--fc-panel); }
.fc-app .fc-multi-reorder { flex-shrink:0; width:22px; min-height:32px; padding:0; border:0; color:var(--fc-muted); background:transparent; font-size:20px; cursor:grab; touch-action:none; }
.fc-multi-grid.is-reordering { cursor:grabbing; user-select:none; }
.fc-multi-grid.is-reordering video { pointer-events:none; }
.fc-multi-tile.is-reordering { opacity:.65; }
.fc-multi-tile.is-drop-target { outline:2px solid var(--fc-accent); outline-offset:-2px; }
.fc-multi-tile-title { min-width:0; flex:1; }
.fc-multi-tile-title strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; font-weight:600; }
.fc-multi-status { display:block; color:var(--fc-muted); font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.fc-multi-tile-actions { display:flex; align-items:center; gap:4px; flex-shrink:0; }
.fc-multi-tile-actions :is(button,a) { display:inline-flex; align-items:center; justify-content:center; min-height:30px; padding:4px 7px; font-size:12px; line-height:20px; border-radius:6px; }
.fc-multi-tile-actions a:hover { background:var(--fc-raised); }
.fc-multi-video { position:relative; aspect-ratio:16/9; }
.fc-multi-host { position:absolute; inset:0; }
.fc-multi-host .art-control-volume { display:none!important; }
.fc-multi-host .art-video-player { font:12px/1.5 "Segoe UI","Microsoft YaHei",sans-serif; color:var(--fc-text); }
.fc-multi-host .fc-player-button { padding:4px 6px; }
.fc-multi-host .art-control-sound { width:auto; }
@media(max-width:700px) {
  .fc-multi-scroll { padding:12px; }
}
/* The native player and chat nodes keep their owners and event listeners. */
html.creamu-fc2-room .js-head { display:none!important; }
html.creamu-fc2-room .l-wp, html.creamu-fc2-room .l-cont, html.creamu-fc2-room .m-cont-ni { width:100%!important; min-width:0!important; padding-top:0!important; background:var(--fc-bg); }
html.creamu-fc2-room .js-cont > .m-cont-ni { display:flex; flex-direction:column; }
html.creamu-fc2-room .m-info01 { order:0; margin:0; padding:6px 24px; background:#242a29; color:var(--fc-muted); font-size:12px; }
html.creamu-fc2-room .m-info01 a { color:var(--fc-accent); }
html.creamu-fc2-room .fc-room-tools { order:1; }
html.creamu-fc2-room .m-viewPlayer { order:2; margin:0!important; padding:0 24px!important; width:100%!important; box-sizing:border-box; background:var(--fc-bg)!important; }
html.creamu-fc2-room .m-viewTop { order:3; padding:20px 24px!important; margin:0!important; color:var(--fc-text); background:var(--fc-panel)!important; }
html.creamu-fc2-room .m-viewBtm { order:4; padding:20px 24px; color:var(--fc-text); background:var(--fc-panel); }
html.creamu-fc2-room .m-viewPlayer_in { position:relative!important; inset:auto!important; box-sizing:border-box; max-width:none!important; width:100%!important; margin:0!important; padding-bottom:0!important; }
html.creamu-fc2-room #js-player { height:clamp(423px,calc(100dvh - 196px),920px)!important; }
html.creamu-fc2-room #js-livePlayerContainer { display:flex; flex-direction:column; height:100%!important; }
html.creamu-fc2-room #js-livePlayerContainer > .livePlayer { flex:1; min-height:0; height:auto; background:var(--fc-panel); }
html.creamu-fc2-room .livePlayer-operation { flex-shrink:0; color:var(--fc-text); background:var(--fc-panel); padding:0 12px; }
html.creamu-fc2-room .operation_row { border-color:var(--fc-line)!important; }
html.creamu-fc2-room #js-right_area { width:var(--fc-chat-width,340px)!important; color:var(--fc-text); background:var(--fc-panel); }
html.creamu-fc2-room #js-left_area { margin-right:var(--fc-chat-width,340px)!important; }
html.creamu-fc2-room #js-video_area:not(:fullscreen):not(.is-fullScreen) { right:12px; background:#080a09; }
html.creamu-fc2-room #js-video_area:fullscreen { inset:0!important; }
html.creamu-fc2-room .chat_content, html.creamu-fc2-room .chat_display,
html.creamu-fc2-room .chat_tab-control { background:var(--fc-panel)!important; color:var(--fc-text)!important; border-color:var(--fc-line)!important; }
/* The row owns every message surface; native wrappers and interaction states cannot paint white blocks. */
html.creamu-fc2-room .c-chatLines > li {
  --fc-chat-row-bg:var(--fc-panel);
  background:var(--fc-chat-row-bg)!important; color:var(--fc-text);
  border-bottom:1px solid var(--fc-line); padding:8px!important; font-size:14px; line-height:1.5;
}
html.creamu-fc2-room .c-chatLines > li[class*="is-system_"] { --fc-chat-row-bg:#30271f; }
html.creamu-fc2-room .c-chatLines > li:is(.is-system_gift,.is-system_tip) { --fc-chat-row-bg:#38301d; }
html.creamu-fc2-room .c-chatLines > li.is-clicked { --fc-chat-row-bg:#323c37; }
html.creamu-fc2-room .c-chatLines > li.is-sameUser { --fc-chat-row-bg:#23374a; }
html.creamu-fc2-room .c-chatLines > li:hover { box-shadow:inset 0 0 0 1px #68776f; }
html.creamu-fc2-room .c-chatLines > li > :is(.chat-left,.chat-body) {
  background:transparent!important; border-color:transparent!important;
}
html.creamu-fc2-room .c-chatLines .com { color:var(--fc-text); }
html.creamu-fc2-room .c-chatLines .com.black { color:var(--fc-text)!important; }
html.creamu-fc2-room .c-chatLines .nam, html.creamu-fc2-room .c-chatLines .tim,
html.creamu-fc2-room .c-chatLines .uid { color:var(--fc-muted)!important; }
html.creamu-fc2-room .c-chatAdjuster { display:none; }
html.creamu-fc2-room .commentSend { background:var(--fc-panel); color:var(--fc-text); }
html.creamu-fc2-room .commentSend input { background:var(--fc-bg); color:var(--fc-text); border-color:var(--fc-line); }
html.creamu-fc2-room .m-viewBtm .c-bx01, html.creamu-fc2-room .m-viewBtm .c-bx03 { background:var(--fc-panel); border-color:var(--fc-line); color:var(--fc-text); }
html.creamu-fc2-room .m-pgInf_rt, html.creamu-fc2-room .m-viewTop a,
html.creamu-fc2-room .m-viewBtm a { color:var(--fc-text); }
html.creamu-fc2-room .m-viewTop :is(h2,p), html.creamu-fc2-room .m-viewBtm :is(h2,h3,p,dt,dd) { color:var(--fc-text); }
html.creamu-fc2-room .m-viewTop .c-bx03 { background:var(--fc-raised); border-color:var(--fc-line); color:var(--fc-text); }
/* FC2's detail panels and player dialogs have their own light surfaces and gradients. */
html.creamu-fc2-room :is(
  .c-bx05, .chat_tab-content, .recommend, .cover-chat, .panel-login,
  .setting_content, .setting_title, .c-popup_in, .c-modal_content,
  .c-chatTool_content, .c-rightClickMenu, .c-dropUp, .c-dropDown_choise,
  .c-tab-normal_content, .m-tab02, .m-tab03, .m-fter01, .m-fter02, .m-fterGe, .m-fterMdl
) {
  background:var(--fc-panel)!important; background-image:none!important;
  color:var(--fc-text)!important; border-color:var(--fc-line)!important;
}
html.creamu-fc2-room :is(
  #js-amount > div > div, .c-pointView, .m-pfl_tmb, .c-info02.info,
  .c-tab-normal_tab li, .chat_tab-control li, .c-modal_button,
  .setting_item .title
) {
  background:var(--fc-raised)!important; color:var(--fc-text)!important;
  border-color:var(--fc-line)!important;
}
html.creamu-fc2-room :is(
  .c-btn, .c-button, .c-button-op, .setting_buttonGroup button,
  .c-input-text, .c-input_dropDown-101, .c-pgr01_btn, .c-pgr02 a
) {
  background:var(--fc-raised)!important; background-image:none!important;
  color:var(--fc-text)!important; border-color:var(--fc-line)!important;
  text-shadow:none!important;
}
html.creamu-fc2-room :is(.c-btn,.c-button,.c-button-op,.setting_buttonGroup button):hover {
  background:#353d38!important; border-color:#718078!important;
}
html.creamu-fc2-room :is(
  .setting_buttonGroup button.is-active, .c-tab-normal_tab li.is-active,
  .chat_tab-control li.is-active, .c-btnCr, .m-tab02_cr a, .m-tab03_cr a,
  .c-pgr01_crt .c-pgr01_btn
) {
  background:var(--fc-accent)!important; color:var(--fc-ink)!important; border-color:var(--fc-accent)!important;
}
html.creamu-fc2-room :is(
  .recommend_title, .setting_title, .setting_item .title, .c-popup-gift li,
  .c-modal_text, .m-pfl_name, .c-ctbName, .c-pgTit, .c-bx05 h3,
  .c-bx05 dt, .c-bx05 dd, .c-bx05 label, .c-bx05 .fwbd
) { color:var(--fc-text)!important; }
html.creamu-fc2-room :is(.fcl02,.fcl03,.c-detailInfo,.js-foot) { color:var(--fc-muted)!important; }
html.creamu-fc2-room :is(.c-bx05,.c-info02,.recommend,.m-fter01,.m-fter02,.m-fterGe,.m-fterMdl) a { color:var(--fc-accent); }
html.creamu-fc2-room .c-tab01 { border-color:var(--fc-line)!important; }
html.creamu-fc2-room .c-tab01_itm { color:var(--fc-muted)!important; border-color:transparent!important; }
html.creamu-fc2-room :is(.c-tab01_cr,.c-tab01_itm:hover) { color:var(--fc-accent)!important; border-color:var(--fc-accent)!important; }
html.creamu-fc2-room :is(.c-tab-normal_tab,.chat_tab-control) li.is-active a { color:var(--fc-ink)!important; }
html.creamu-fc2-room .m-fterMdl a:hover { background:var(--fc-raised)!important; }
html.creamu-fc2-room :is(.c-bx05,.m-viewTop,.m-viewBtm,.js-foot) :is(input,textarea,select) {
  background:var(--fc-bg)!important; color:var(--fc-text)!important; border-color:var(--fc-line)!important;
}
html.creamu-fc2-room .commentSend input::placeholder { color:var(--fc-muted)!important; opacity:1; }
html.creamu-fc2-room .c-popup-font li.black { color:var(--fc-text)!important; }
html.creamu-fc2-room :is(.c-btn,.c-button,.c-button-op,input,select,textarea):focus-visible { outline:2px solid var(--fc-accent); outline-offset:2px; }
.fc-art-host { position:absolute; inset:0; width:100%; height:100%; container:fc-video / inline-size; }
html.creamu-fc2-room .fc-art-host .art-video { position:absolute!important; inset:0!important; width:100%!important; height:100%!important; z-index:0!important; margin:0!important; object-fit:var(--fc-video-fit,contain); }
html.creamu-fc2-room .fc-art-host .art-video-player { font:14px/1.5 "Segoe UI","Microsoft YaHei",sans-serif; color:#f1eee8; background:transparent; }
.fc-art-host .fc-player-spinner { display:block; width:32px; height:32px; border:3px solid #ffffff30; border-top-color:var(--fc-accent); border-radius:50%; }
.fc-art-host .art-loading-show .fc-player-spinner { animation:fc-player-spin .8s linear infinite; }
@keyframes fc-player-spin { to { transform:rotate(1turn); } }
@media(prefers-reduced-motion:reduce) { .fc-art-host .art-loading-show .fc-player-spinner { animation:none; } }
/* Video stays below FC2's comments (2); controls stay below native permission covers (4–6). */
html.creamu-fc2-room .fc-art-host :is(.art-bottom,.art-mask,.art-loading,.art-settings,.art-notice,.art-contextmenus,.art-info) { z-index:3; }
html.creamu-fc2-room .fc-art-host .art-bottom { background-image:linear-gradient(transparent,#101312eb); background-size:100% 110px; background-repeat:no-repeat; background-position:bottom; padding:20px 12px 6px; box-sizing:border-box; }
html.creamu-fc2-room .fc-art-host .art-video-player:has(:focus-visible) .art-bottom { opacity:1; }
html.creamu-fc2-room .fc-art-host .art-video-player:has(:focus-visible) .art-controls { transform:translateY(0); }
html.creamu-fc2-room .fc-art-host :is(.art-control-live,.art-control-reconnect,.art-control-settings,.art-control-screenshot,.art-control-web,.art-control-fullscreen) { width:auto; flex-shrink:0; }
html.creamu-fc2-room .fc-art-host .art-controls { gap:8px; }
html.creamu-fc2-room .fc-art-host :is(.art-controls-left,.art-controls-right) { gap:8px; }
.fc-art-host .art-control-live { padding:0 6px; }
.fc-player-status { color:#a6d3b4; font-size:12px; white-space:nowrap; }
.fc-player-button { border:0; border-radius:6px; background:transparent; color:#f1eee8; font:inherit; padding:7px 9px; cursor:pointer; white-space:nowrap; }
.fc-player-button:hover { background:#ffffff20; }
.fc-player-button:focus-visible { outline:2px solid #f3a18c; outline-offset:1px; }
html.creamu-fc2-room .fc-art-host .fc-player-menu { right:12px; bottom:62px; width:min(300px,calc(100% - 24px)); max-height:calc(100% - 84px); overflow:auto; padding:16px; border:1px solid var(--fc-line); border-radius:12px; background:#1b1d1df5; box-shadow:0 8px 30px #0007; }
.fc-player-menu [hidden] { display:none!important; }
.fc-player-menu label + label { margin-top:12px; }
.fc-player-menu-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
html.creamu-fc2-room .fc-player-menu button { border:1px solid var(--fc-line); border-radius:8px; padding:8px 12px; min-height:40px; font:inherit; }
.fc-player-menu-mobile { display:none; }
.fc-player-menu p { margin:14px 0 0; font-size:12px; color:var(--fc-muted); }
/* Native controls still receive delegated quality/reload events, but no longer appear or take focus. */
html.creamu-fc2-room .fc-art-active #js-player_controls { display:block!important; visibility:hidden!important; pointer-events:none!important; }
html.creamu-fc2-room .fc-art-active #js-player_controls .c-toolpanel { display:block!important; }
html.creamu-fc2-room .fc-art-active #js-player_controls * { visibility:hidden!important; }
html.creamu-fc2-room .fc-art-active .js-play_cover { display:none!important; }
/* Empty native interaction/loading surfaces must not intercept ArtPlayer's pointer events. */
html.creamu-fc2-room .fc-art-active :is(.js-playerOn,.js-loading-gif,.c-soundOnly) { pointer-events:none; }
html.creamu-fc2-room .fc-art-active :is(#js-comment_canvas,#js-gift_canvas,.c-ply01_cmtBln) { z-index:2; pointer-events:none; }
html.creamu-fc2-room .fc-player-web, html.creamu-fc2-room .fc-art-active:fullscreen { position:fixed!important; inset:0!important; width:100vw!important; height:100dvh!important; z-index:2147483640!important; background:#080a09!important; }
html.fc-player-web-open { overflow:hidden!important; }
html.creamu-fc2-room :is(.fc-player-web,.fc-art-active:fullscreen) #js-liveVideo { width:100%!important; height:100%!important; }
@container fc-video (max-width:700px) {
  html.creamu-fc2-room .fc-art-host :is(.art-controls,.art-controls-left,.art-controls-right) { gap:0; }
  html.creamu-fc2-room .fc-art-host .art-control { min-width:32px; }
  .fc-player-button { padding:8px 5px; font-size:12px; }
  .fc-art-host .art-control-screenshot, .fc-art-host .art-control-reconnect, .fc-art-host .art-control-live { display:none!important; }
  html.creamu-fc2-room .fc-art-host .fc-player-menu { bottom:48px; padding:12px; max-height:calc(100% - 58px); }
  .fc-player-menu-mobile { display:flex; gap:8px; margin-top:12px; }
}
.fc-room-tools { display:flex; gap:14px; align-items:center; flex-wrap:wrap; padding:14px 24px; }
.fc-room-heading { flex:1; min-width:160px; }
.fc-room-heading strong { display:block; font-size:17px; line-height:1.4; overflow-wrap:anywhere; }
.fc-room-heading span { display:block; color:var(--fc-muted); font-size:12px; }
.fc-room-buttons { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.fc-width-control { display:flex!important; align-items:center; gap:8px; }
.fc-width-control input { width:90px; accent-color:var(--fc-accent); }
html.creamu-fc2-room.fc-chat-hidden #js-right_area { display:none!important; }
html.creamu-fc2-room.fc-chat-hidden #js-left_area { margin-right:0!important; }
html.creamu-fc2-room.fc-chat-hidden #js-video_area { right:0; }
html.creamu-fc2-room.fc-cinema .m-viewPlayer { padding:0!important; }
html.creamu-fc2-room.fc-cinema #js-player { height:calc(100dvh - 150px)!important; }
html.creamu-fc2-room:has(:fullscreen) #js-livePlayerContainer,
html.creamu-fc2-room #js-player:fullscreen { height:100dvh!important; }
html.creamu-fc2-room :fullscreen #js-right_area { width:var(--fc-chat-width,340px)!important; }
@media(min-width:1600px) { .fc-grid { grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); } }
@media(max-width:1000px) {
  .fc-header { gap:12px; padding:14px 20px; }
  .fc-header nav { order:3; flex-basis:100%; }
  .fc-header-actions { margin-left:auto; }
  .fc-main { padding:24px 20px 48px; }
  .fc-filters { grid-template-columns:1fr; }
}
@media(max-width:700px) {
  .fc-header { padding:12px 16px; }
  .fc-brand strong { font-size:21px; }
  .fc-header-actions button { padding:8px 10px; }
  .fc-site-menu summary { font-size:12px; padding:10px 4px; }
  .fc-header nav { flex-wrap:nowrap; gap:4px; }
  .fc-header nav button { flex:1; padding:8px 6px; min-height:44px; }
  .fc-main { padding:20px 16px 40px; }
  .fc-heading { align-items:start; flex-direction:column; gap:14px; }
  .fc-heading h1 { font-size:25px; }
  .fc-filters { grid-template-columns:1fr 1fr; }
  .fc-search-label { grid-column:1/-1; }
  .fc-filter-options { display:block; grid-column:1/-1; }
  .fc-filter-options > summary { display:list-item; cursor:pointer; color:var(--fc-muted); padding:6px 0; }
  .fc-filter-options > div { display:grid; grid-template-columns:1fr 1fr; gap:12px; padding-top:12px; }
  .fc-filter-options:not([open]) > div { display:none; }
  .fc-grid, .fc-app[data-density=compact] .fc-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
  .fc-cover { aspect-ratio:4/3; }
  .fc-card-body { padding:10px; }
  .fc-card-title { font-size:14px; }
  .fc-card-actions { flex-wrap:wrap; padding:0 8px 8px; }
  .fc-card-actions button { min-height:44px; }
  .fc-card-actions button:first-child { flex-basis:100%; }
  .fc-cover-badges { left:6px; right:6px; bottom:6px; }
  .fc-badge { font-size:10px; padding:2px 4px; }
  .fc-results-bar { flex-wrap:wrap; }
  .fc-app input:not([type=range]), .fc-app select, .fc-dialog input, .fc-dialog textarea { font-size:16px!important; }
  .fc-room-tools { padding:12px 16px; }
  .fc-room-buttons { gap:6px; }
  .fc-width-control { display:none!important; }
  html.creamu-fc2-room .m-viewPlayer { padding:0!important; }
  html.creamu-fc2-room #js-player, html.creamu-fc2-room.fc-cinema #js-player { height:auto!important; }
  html.creamu-fc2-room #js-livePlayerContainer { height:auto!important; }
  html.creamu-fc2-room #js-livePlayerContainer > .livePlayer { display:flex; flex:initial; flex-direction:column; height:auto!important; min-height:0!important; }
  html.creamu-fc2-room #js-left_area { order:0; width:100%; margin:0!important; height:auto!important; aspect-ratio:16/10; flex-shrink:0; }
  html.creamu-fc2-room #js-video_area { right:0; }
  html.creamu-fc2-room #js-right_area { order:1; float:none; width:100%!important; height:400px!important; margin-top:12px; }
  html.creamu-fc2-room .m-viewTop, html.creamu-fc2-room .m-viewBtm { padding:16px!important; }
  html.creamu-fc2-room .m-viewTop_head { display:flex; flex-direction:column; }
  html.creamu-fc2-room .m-viewTop_lt, html.creamu-fc2-room .m-viewTop_rt { float:none!important; width:100%!important; margin:0!important; }
  html.creamu-fc2-room .m-pgInf { min-width:0; }
  html.creamu-fc2-room .m-pgInf_rt { min-width:0; overflow-wrap:anywhere; }
  html.creamu-fc2-room .operation_row { display:flex; flex-direction:column; height:auto!important; gap:10px; padding:10px 0!important; }
  html.creamu-fc2-room .operation_topLeft { order:0; margin:0!important; width:100%; }
  html.creamu-fc2-room .operation_topRight { order:1; }
  html.creamu-fc2-room .operation_bottomLeft, html.creamu-fc2-room .operation_bottomRight,
  html.creamu-fc2-room .operation_topRight { float:none!important; display:flex; flex-wrap:wrap; gap:8px; }
  html.creamu-fc2-room .commentSend { display:flex; flex-direction:column; gap:8px; }
  html.creamu-fc2-room .commentSend_text { margin:0!important; }
  html.creamu-fc2-room .commentSend input { font-size:16px!important; }
  html.creamu-fc2-room :fullscreen #js-left_area { height:100dvh!important; aspect-ratio:auto; }
  html.creamu-fc2-room :fullscreen #js-right_area { display:none!important; }
}
@media(max-width:359px) { .fc-grid, .fc-app[data-density=compact] .fc-grid { grid-template-columns:1fr; } }
@media(prefers-reduced-motion:reduce) { .fc-app *, .fc-dialog * { transition:none!important; scroll-behavior:auto!important; } }
`;
  document.head.append(style);
}
