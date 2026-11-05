// ==UserScript==
// @name         Creamu · FC2 Live
// @name:zh-CN    Creamu · FC2 Live
// @namespace    https://github.com/wayneze/Creamu
// @version      0.5.1
// @description  FC2 Live 整页改版：直播卡片与筛选、关注/访问/黑名单控制台、多路同屏、增强播放器、JSON / WebDAV
// @author       wayneze
// @match        https://live.fc2.com/*
// @require      https://cdn.jsdelivr.net/npm/artplayer@5.4.0/dist/artplayer.js
// @require      https://cdn.jsdelivr.net/npm/hls.js@1.7.4/dist/hls.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
