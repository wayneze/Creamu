// ==UserScript==
// @name         Creamu · HJ
// @name:zh-CN   Creamu · HJ
// @namespace    https://github.com/wayneze/Creamu
// @version      0.1.46
// @description  Creamu：海角极简移动端体验、强力去广告、隐藏媒体解析提取、搜索与排序增强
// @author       wayneze
// @match        *://*.haijiao.com/*
// @match        *://haijiao.com/*
// @match        *://*.haijiao2.com/*
// @match        *://*.haijiao*.com/*
// @match        *://*/*haijiao*/*
// @allFrames     true
// @require      https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js
// @require      https://cdn.jsdelivr.net/npm/artplayer@5/dist/artplayer.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @connect      *

// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';
