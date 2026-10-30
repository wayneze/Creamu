// 30-media-parser.js

/**
 * 缓存被拦截和提取到的媒体直链信息
 */
if (typeof window !== 'undefined') {
  window.__creamu_hj_media_cache = window.__creamu_hj_media_cache || {
    videos: [],
    images: [],
    rawUrls: new Set()
  };
  window.__creamu_hj_network_log = window.__creamu_hj_network_log || [];
}

let currentHjSelectedVideoIndex = 0;

/** 海角换帖不刷新页面。地址缓存只增不减时，同一用户的下一帖会接着播上一帖。 */
function hjPostIdentity() {
  const href = String((typeof location !== 'undefined' && location.href) || '');
  const fromUrl = href.match(/\/(?:post|topic|detail|article)\/(\d+)/i);
  if (fromUrl) return fromUrl[1];
  return href.split('#')[0];
}

function resetHjMediaForPost(identity) {
  const cache = window.__creamu_hj_media_cache;
  if (!cache) return;
  cache.videos = [];
  if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    cache.images.forEach((url) => {
      if (String(url).startsWith('blob:')) URL.revokeObjectURL(url);
    });
  }
  cache.images = [];
  cache.rawUrls = new Set();
  cache.postIdentity = identity;
  currentHjSelectedVideoIndex = 0;
  if (typeof window !== 'undefined') window.__creamu_hj_images_pid = '';
  const box = typeof document !== 'undefined' ? document.getElementById('creamu-hj-inline-player-box') : null;
  if (box) box.removeAttribute('data-video-url');
  const images = typeof document !== 'undefined' ? document.getElementById('creamu-hj-image-box') : null;
  if (images) {
    images.innerHTML = '';
    if (images.dataset) delete images.dataset.images;
  }
  hjDebug('换帖，清空 ' + identity);
}

/**
 * 格式化时间 (秒 -> mm:ss 或 hh:mm:ss)
 */
function formatHjTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(r)}`;
  return `${pad(m)}:${pad(r)}`;
}

/**
 * 在屏幕中央显示微型手势 HUD 提示
 */
function showHjSeekHud(text) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
  let hud = document.getElementById('hj-seek-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'hj-seek-hud';
    document.documentElement.appendChild(hud);
  }
  hud.textContent = text;
  hud.classList.add('is-active');

  if (hud._hideTimer) clearTimeout(hud._hideTimer);
  hud._hideTimer = setTimeout(() => {
    hud.classList.remove('is-active');
  }, 800);
}

/**
 * 动态引入 Hls.js 脚本兜底（防止浏览器将其当成文件下载）
 */
function ensureHlsJsLoaded(callback) {
  if (typeof window === 'undefined') return;
  if (typeof window.Hls === 'function') {
    if (callback) callback();
    return;
  }
  let script = document.getElementById('creamu-hj-hls-script');
  if (!script) {
    script = document.createElement('script');
    script.id = 'creamu-hj-hls-script';
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
    script.onload = () => { if (callback) callback(); };
    (document.head || document.documentElement).appendChild(script);
  } else if (callback) {
    script.addEventListener('load', () => { callback(); }, { once: true });
  }
}

/** 分片地址经常是相对路径，拼回播放列表所在目录。 */
function resolveHjMediaUrl(base, raw) {
  const value = String(raw || '').trim();
  if (!value || value.startsWith('data:')) return '';
  try {
    return new URL(value, base).href;
  } catch (_) {
    return '';
  }
}

function hjDebug(line) {
  const log = window.__creamu_hj_debug || (window.__creamu_hj_debug = []);
  log.push(new Date().toLocaleTimeString() + ' ' + line);
  if (log.length > 40) log.shift();
  const box = typeof document !== 'undefined' ? document.getElementById('creamu-hj-debug') : null;
  if (box) box.textContent = log.join('\n');
}

function copyHjDebug() {
  const log = (window.__creamu_hj_debug || []).join('\n');
  const cache = window.__creamu_hj_media_cache || { videos: [] };
  const text = '地址:\n' + (cache.videos.join('\n') || '无') + '\n\n过程:\n' + (log || '无');
  if (typeof GM_setClipboard === 'function') GM_setClipboard(text);
  else if (navigator.clipboard) navigator.clipboard.writeText(text);
}

/** 油猴对二进制的返回不一致：可能是 ArrayBuffer，也可能是 blob，还可能是按 Latin-1 转过的字符串。统一还原成字节。 */
function gmHjBytes(response) {
  return new Promise((resolve) => {
    const data = response && (response.response != null ? response.response : response.responseText);
    if (data == null) {
      resolve(null);
      return;
    }
    if (Object.prototype.toString.call(data) === '[object ArrayBuffer]') {
      resolve(data);
      return;
    }
    if (typeof data.byteLength === 'number' && typeof data.buffer !== 'undefined' && data.buffer !== data) {
      resolve(data.buffer.slice(data.byteOffset || 0, (data.byteOffset || 0) + data.byteLength));
      return;
    }
    if (typeof data.arrayBuffer === 'function') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsArrayBuffer(data);
      return;
    }
    if (typeof data === 'string') {
      const bytes = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i += 1) bytes[i] = data.charCodeAt(i) & 0xff;
      resolve(bytes.buffer);
      return;
    }
    resolve(null);
  });
}

function gmHjRequest(url, responseType, headers) {
  return new Promise((resolve) => {
    if (typeof GM_xmlhttpRequest !== 'function') {
      resolve(null);
      return;
    }
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      headers: headers || {},
      responseType: responseType || 'text',
      timeout: 20000,
      onload: (response) => {
        hjDebug('请求 ' + (response.status || '?') + ' ' + url.slice(0, 90));
        resolve(response);
      },
      onerror: () => {
        hjDebug('请求失败 ' + url.slice(0, 90));
        resolve(null);
      },
      ontimeout: () => {
        hjDebug('请求超时 ' + url.slice(0, 90));
        resolve(null);
      },
    });
  });
}

/**
 * 分片是 MPEG-TS，拼成一个文件后手机浏览器报 code=4。
 * 交给 Hls.js 转封装，分片请求仍然走油猴，避开 CDN 跨域。
 */
/** 海角的 enc.key 不是解密密钥。页面 /js/jquery.js 里的 jquery_key 用同名 .jpg 把它变掉。 */
function loadHjSiteKeyModule() {
  if (window.__creamu_hj_key_module) return window.__creamu_hj_key_module;
  window.__creamu_hj_key_module = new Promise((resolve) => {
    const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
    const ready = () => typeof pageWindow.createModule === 'function';
    const finish = () => {
      if (!ready()) {
        resolve(null);
        return;
      }
      Promise.resolve(pageWindow.createModule()).then(resolve).catch(() => resolve(null));
    };
    if (ready() || typeof document.createElement !== 'function') {
      finish();
      return;
    }
    const script = document.createElement('script');
    script.src = location.origin + '/js/jquery.js';
    script.onload = finish;
    script.onerror = () => resolve(null);
    (document.head || document.documentElement).appendChild(script);
    setTimeout(() => {
      if (!ready()) resolve(null);
    }, 4000);
  });
  return window.__creamu_hj_key_module;
}

function transformHjAesKey(mod, rawKey, jpgKey) {
  const key = rawKey instanceof Uint8Array ? rawKey : new Uint8Array(rawKey);
  const keyPtr = mod._malloc(key.length);
  const jpgPtr = mod._malloc(jpgKey.length);
  try {
    mod.HEAPU8.set(key, keyPtr);
    mod.HEAPU8.set(jpgKey, jpgPtr);
    mod.ccall('jquery_key', null, ['number', 'number', 'number', 'number'], [keyPtr, key.length, jpgPtr, jpgKey.length]);
    return new Uint8Array(mod.HEAPU8.buffer, keyPtr, key.length).slice();
  } finally {
    try { mod._free(keyPtr); } catch (_) {}
    try { mod._free(jpgPtr); } catch (_) {}
  }
}

function loadHjM3u8WithGm(video, playlistUrl, onStatus) {
  // Hls 解析完列表后会读 performance.now()。油猴沙箱里没有它，解析完就抛 internalException。
  if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
    window.performance = { now: () => Date.now() };
  }
  const start = () => {
    if (typeof window.Hls !== 'function' || !window.Hls.isSupported()) {
      hjDebug('Hls 不可用');
      if (onStatus) onStatus('播放器组件没加载');
      return;
    }
    if (video._hjHls) {
      try { video._hjHls.destroy(); } catch (_) {}
    }
    const loader = function () {};
    loader.prototype.load = function (context, config, callbacks) {
      let url = context.url;
      if (/\.key($|\?)/i.test(url)) {
        let kversion = '';
        try {
          const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
          const cfg = JSON.parse(pageWindow.sessionStorage.getItem('config') || '{}');
          kversion = cfg && cfg.kversion != null ? String(cfg.kversion) : '';
        } catch (_) {}
        if (kversion) url = url.replace('.key', '.key' + kversion);
      }
      const wantsText = !context.responseType || context.responseType === 'text';
      const started = Date.now();
      const headers = {};
      if (Number.isFinite(context.rangeStart) && Number.isFinite(context.rangeEnd)) {
        headers.Range = 'bytes=' + context.rangeStart + '-' + (context.rangeEnd - 1);
      }
      const fail = (text) => {
        const now = Date.now();
        callbacks.onError({ code: 0, text }, context, null, this.stats);
        this.stats.loading.end = now;
      };
      gmHjRequest(url, wantsText ? 'text' : 'arraybuffer', headers).then((response) => {
        if (!response) {
          fail('请求失败');
          return;
        }
        const finish = (data) => {
        if (data == null || data === '') {
          fail('空响应');
          return;
        }
        const len = typeof data === 'string' ? data.length : data.byteLength || 0;
        const now = Date.now();
        this.stats.loaded = len;
        this.stats.total = len;
        this.stats.chunkCount = 1;
        this.stats.loading.end = now;
        let head = '';
        if (!wantsText && data instanceof ArrayBuffer) {
          head = ' ' + [...new Uint8Array(data).slice(0, 4)].map((b) => b.toString(16).padStart(2, '0')).join('');
        }
        hjDebug((wantsText ? '列表 ' : '分片 ') + len + head + ' ' + url.slice(0, 70));
        callbacks.onSuccess({ url, data }, this.stats, context, response);
        };
        if (wantsText) finish(String(response.responseText || response.response || ''));
        else gmHjBytes(response).then(finish);
      }).catch((error) => fail(String(error && error.message || error)));
    };
    loader.prototype.abort = function () {};
    loader.prototype.destroy = function () {};
    // Hls 拉分片前把 loader.stats 记到分片上。没有这份对象就会读到 undefined.retry。
    Object.defineProperty(loader.prototype, 'stats', {
      get() {
        if (!this._stats) {
          const now = Date.now();
          this._stats = {
            aborted: false, loaded: 0, total: 0, retry: 0, chunkCount: 0, bwEstimate: 0,
            loading: { start: now, first: now, end: 0 },
            parsing: { start: 0, end: 0 },
            buffering: { start: 0, first: 0, end: 0 },
          };
        }
        return this._stats;
      },
    });
    const hls = new window.Hls({
      enableWorker: false,
      loader,
    });
    video._hjHls = hls;
    hls.on(window.Hls.Events.ERROR, (_, info) => {
      const reason = info.error && (info.error.message || info.error.name || String(info.error));
      hjDebug('Hls ' + info.type + ' ' + info.details + (reason ? ' ' + reason : ''));
      if (info.fatal && onStatus) onStatus('Hls 失败 ' + info.details);
    });
    hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
      hjDebug('播放列表已解析');
      if (onStatus) onStatus('');
      const play = video.play();
      if (play && typeof play.catch === 'function') play.catch(() => {});
    });
    const jpgUrl = String(playlistUrl).replace(/\.m3u8($|\?)/i, '.jpg$1');
    Promise.all([loadHjSiteKeyModule(), gmHjRequest(jpgUrl, 'text')]).then(([mod, jpgResponse]) => {
      const jpgText = String((jpgResponse && (jpgResponse.responseText || jpgResponse.response)) || '').trim();
      if (!mod || !jpgText) {
        hjDebug('站点密钥模块不可用');
        return;
      }
      let jpgKey = null;
      try {
        const bin = atob(jpgText);
        jpgKey = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i += 1) jpgKey[i] = bin.charCodeAt(i) & 0xff;
      } catch (_) {
        hjDebug('jpg 材料不是 base64');
        return;
      }
      let realKey = null;
      hls.on(window.Hls.Events.KEY_LOADED, (_, data) => {
        const decryptdata = data && data.frag && data.frag.decryptdata;
        if (!decryptdata || !decryptdata.key) return;
        try {
          if (!realKey) realKey = transformHjAesKey(mod, decryptdata.key, jpgKey);
          decryptdata.key = realKey;
          hjDebug('密钥已变换 ' + realKey.length);
        } catch (error) {
          hjDebug('密钥变换失败 ' + (error && error.message || error));
        }
      });
      hjDebug('jpg 材料 ' + jpgKey.length);
    });
    hls.loadSource(playlistUrl);
    hls.attachMedia(video);
    hjDebug('交给 Hls');
  };
  if (typeof window.Hls === 'function') start();
  else ensureHlsJsLoaded(start);
}

/**
 * 在画面上左右拖动拉进度。拖动距离按画面宽度折成整段时长。
 */
function enableHjVideoGestureSeek(video, surface) {
  const target = surface || video;
  if (!video || !target || target._creamu_hj_gesture_bound) return;
  target._creamu_hj_gesture_bound = true;

  let tracking = false;
  let startX = 0;
  let startTime = 0;
  const point = (event) => (event.touches && event.touches[0]) || event;

  const onStart = (event) => {
    if (event.target && event.target.closest && event.target.closest('button, input')) return;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    const p = point(event);
    tracking = true;
    startX = p.clientX;
    startTime = video.currentTime || 0;
  };
  const onMove = (event) => {
    if (!tracking) return;
    const p = point(event);
    const dx = p.clientX - startX;
    if (Math.abs(dx) < 6) return;
    if (event.cancelable) event.preventDefault();
    const width = Math.max(target.clientWidth || window.innerWidth || 320, 160);
    const targetTime = Math.max(0, Math.min(video.duration, startTime + (dx / width) * video.duration));
    video.currentTime = targetTime;
    showHjSeekHud(formatHjTime(targetTime) + ' / ' + formatHjTime(video.duration));
  };
  const onEnd = () => { tracking = false; };

  target.addEventListener('touchstart', onStart, { passive: true });
  target.addEventListener('touchmove', onMove, { passive: false });
  target.addEventListener('touchend', onEnd, { passive: true });
  target.addEventListener('touchcancel', onEnd, { passive: true });
  target.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);
}

/**
 * 校验 URL 是否为真正的视频直链 (严格防误判)
 */
function isRealVideoUrl(url) {
  if (typeof url !== 'string' || !url || url.length < 10) return false;

  // 1. 过滤静态资源、代码文件及通用接口
  if (/\.(js|css|json|html|ts|map|png|jpg|jpeg|gif|webp|svg|ico)($|\?|#)/i.test(url) && !/\.(m3u8|mp4|mov|flv)($|\?|#)/i.test(url)) {
    return false;
  }

  if (/\/api\/(banner|login|captcha|favorite|comment|like|folderList|conf|isNeed)/i.test(url)) {
    return false;
  }

  // 带后缀的是片源。/hls/、/vod/、/m3u8/ 这种没后缀的也是播放地址，海角经常只给这种。
  // /video/ 太宽，接口、封面都会撞上，不收。
  const hasVideoExt = /\.(m3u8|mp4|mov|flv|webm)($|\?|#)/i.test(url);
  const hasStreamPath = /\/(hls|vod|m3u8|playlist)\//i.test(url);
  return hasVideoExt || hasStreamPath;
}

/** 带播放列表后缀的优先。没后缀的流地址放后面，分片列表放最后。 */
function hjVideoPlayRank(url) {
  const value = String(url || '').toLowerCase();
  if (/\/seg[-_]|\d+\.ts($|\?)/.test(value)) return 4;
  if (value.includes('.m3u8') && /\/(index|playlist|master)[^/]*\.m3u8($|\?|#)/.test(value)) return 0;
  if (/\.m3u8($|\?|#)/.test(value)) return 3;
  if (/\.(mp4|mov|flv|webm)($|\?|#)/.test(value)) return 1;
  return 2;
}

/**
 * 校验 URL 是否为真正的图片直链
 */
const HJ_IMG_ALPHABET = 'ABCD*EFGHIJKLMNOPQRSTUVWX#YZabcdefghijklmnopqrstuvwxyz1234567890';

/** 与站点 app.js function w 一致：+/ 换成 *#，再按 UTF-8 还原。 */
function decodeHjImageCipher(value) {
  const alphabet = HJ_IMG_ALPHABET;
  const text = String(value || '').replace(/[^A-Za-z0-9*#]/g, '');
  if (text.length < 8) return '';
  let binary = '';
  for (let index = 0; index < text.length;) {
    let a = alphabet.indexOf(text.charAt(index++));
    let b = alphabet.indexOf(text.charAt(index++));
    let c = alphabet.indexOf(text.charAt(index++));
    let d = alphabet.indexOf(text.charAt(index++));
    if (a < 0) a = 0;
    if (b < 0) b = 0;
    if (c < 0) c = 64;
    if (d < 0) d = 64;
    binary += String.fromCharCode((a << 2) | (b >> 4));
    if (c !== 64) binary += String.fromCharCode(((15 & b) << 4) | (c >> 2));
    if (d !== 64) binary += String.fromCharCode(((3 & c) << 6) | d);
  }
  let out = '';
  for (let index = 0; index < binary.length;) {
    const lead = binary.charCodeAt(index);
    if (lead < 128) {
      out += String.fromCharCode(lead);
      index += 1;
    } else if (lead > 191 && lead < 224) {
      out += String.fromCharCode(((31 & lead) << 6) | (63 & binary.charCodeAt(index + 1)));
      index += 2;
    } else {
      out += String.fromCharCode(((15 & lead) << 12) | ((63 & binary.charCodeAt(index + 1)) << 6) | (63 & binary.charCodeAt(index + 2)));
      index += 3;
    }
  }
  return out;
}

function hjImageBytesFromBase64(value) {
  let text = String(value || '').replace(/[\s\u0000-\u001f]+/g, '').replace(/\*/g, '+').replace(/#/g, '/');
  text = text.replace(/[^A-Za-z0-9+/=]/g, '');
  if (!text || typeof atob !== 'function') return null;
  const mod = text.length % 4;
  if (mod) text += '===='.slice(mod);
  try {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i) & 0xff;
    return bytes;
  } catch (_) {
    return null;
  }
}

function hjImageMime(bytes) {
  if (!bytes || bytes.length < 3) return '';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return 'image/bmp';
  return '';
}

function hjBytesToImageUrl(bytes, mime) {
  if (typeof Blob === 'function' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  }
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return 'data:' + mime + ';base64,' + btoa(binary);
}

/** 附件文件解开后是 data:image/...;base64。魔数不对就丢掉，避免把密文当图片贴上。 */
function hjImageDataUrl(text) {
  const decoded = decodeHjImageCipher(text);
  const source = /base64,/i.test(decoded) ? decoded : (/^data:/i.test(String(text || '').trim()) ? String(text).trim() : '');
  const matched = source.match(/^data:([^;:,]+)?(?:;charset=[^;,]+)?;base64,([\s\S]+)$/i);
  if (!matched) return '';
  const bytes = hjImageBytesFromBase64(matched[2]);
  const mime = hjImageMime(bytes);
  if (!mime || bytes.length < 24) return '';
  return hjBytesToImageUrl(bytes, mime);
}

function hjTopicImageAttachments(topic) {
  const attachments = topic && Array.isArray(topic.attachments) ? topic.attachments : [];
  return attachments.filter((item) => {
    if (!item) return false;
    const category = String(item.category || item.type || '').toLowerCase();
    const remote = String(item.remoteUrl || item.url || '');
    if (/video|m3u8|audio|mp3|sound/.test(category)) return false;
    return /image|img|photo|pic|cover/.test(category) || /\.(jpe?g|png|gif|webp|bmp)(\.txt)?([?#]|$)/i.test(remote);
  });
}

function ensureHjImageSlot() {
  const slotted = typeof ensureHjInlineSlot === 'function' ? ensureHjInlineSlot() : null;
  if (slotted) return slotted;
  if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return null;
  const existing = document.getElementById('creamu-hj-inline-slot');
  if (existing) return existing;
  const button = Array.from(document.querySelectorAll('button')).find((el) => {
    return String(el.textContent || '').replace(/\s+/g, '') === '点击展开完整贴文';
  });
  const anchor = button && (button.parentElement || button);
  if (!anchor || !anchor.parentElement || typeof document.createElement !== 'function') return null;
  const slot = document.createElement('div');
  slot.id = 'creamu-hj-inline-slot';
  slot.style.cssText = 'display:block;width:100%;margin:8px 0;';
  anchor.parentElement.insertBefore(slot, anchor);
  return slot;
}

function renderHjUnlockedImages() {
  const cache = window.__creamu_hj_media_cache;
  if (!cache || !cache.images.length || typeof document === 'undefined') return;
  const slot = ensureHjImageSlot();
  if (!slot) return;
  let box = document.getElementById('creamu-hj-image-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'creamu-hj-image-box';
    box.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px;';
    slot.appendChild(box);
  }
  const current = cache.images.join('\n');
  if (box.dataset.images === current) return;
  box.dataset.images = current;
  box.innerHTML = '';
  cache.images.forEach((url) => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.style.cssText = 'width:100%;height:auto;border-radius:12px;background:#fffaf6;';
    box.appendChild(img);
  });
}

async function unlockHjHiddenImages(topic) {
  const cache = window.__creamu_hj_media_cache;
  const attachments = hjTopicImageAttachments(topic);
  if (!cache || !attachments.length) return 0;
  const before = cache.images.length;
  for (const item of attachments) {
    const remote = tryNormalizeHjMediaUrl(String(item.remoteUrl || item.url || ''));
    if (!remote || cache.rawUrls.has('image:' + remote)) continue;
    const response = await gmHjRequest(remote, 'arraybuffer');
    const buffer = response ? await gmHjBytes(response) : null;
    if (!buffer) continue;
    const bytes = new Uint8Array(buffer);
    const mime = hjImageMime(bytes);
    const url = mime && bytes.length > 100 ? hjBytesToImageUrl(bytes, mime) : hjImageDataUrl(new TextDecoder('utf-8').decode(bytes));
    if (!url) continue;
    cache.rawUrls.add('image:' + remote);
    cache.images.push(url);
  }
  renderHjUnlockedImages();
  return cache.images.length - before;
}

function isRealImageUrl(url) {
  if (typeof url !== 'string' || !url || url.length < 10) return false;
  if (isRealVideoUrl(url)) return false;
  return /\.(jpg|jpeg|png|webp|gif)($|\?|#)/i.test(url);
}

/**
 * 深度智能规范化媒体 URL：支持绝对路径、各类无斜杠相对路径、Base64 解码与转义字符
 */
function tryNormalizeHjMediaUrl(rawStr) {
  if (typeof rawStr !== 'string') return '';
  let str = rawStr.trim();
  if (!str || str.length < 3) return '';

  // 1. 去除首尾引号及 JSON 转义
  str = str.replace(/^["']|["']$/g, '').replace(/\\\/|\\u002[fF]/g, '/');

  // 2. URL 解编码与反转义
  try {
    if (str.includes('%2F') || str.includes('%3A')) {
      str = decodeURIComponent(str);
    }
  } catch (_) {}

  // 3. 解码 Base64 编码字符串
  if (str.startsWith('aHR0cHM6Ly9') || str.startsWith('aHR0cDovLw') || str.startsWith('aHR0c')) {
    try {
      if (typeof atob === 'function') {
        const decoded = atob(str);
        if (decoded.startsWith('http') || decoded.startsWith('/') || decoded.includes('.m3u8')) str = decoded;
      }
    } catch (_) {}
  }

  // 4. 补全协议相对路径 (//cdn.com/...)
  if (str.startsWith('//')) {
    const proto = (typeof location !== 'undefined' && location.protocol) ? location.protocol : 'https:';
    return proto + str;
  }

  // 5. 绝对路径直接返回
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }

  // 6. 补全相对路径
  const isMediaLike = /\.(m3u8|mp4|mov|flv|jpg|jpeg|png|webp|gif)/i.test(str) ||
                     /(?:upload|video|attachment|play|hls|media|vod)\//i.test(str);
                     
  if (isMediaLike) {
    const origin = (typeof location !== 'undefined' && location.origin) ? location.origin : '';
    if (str.startsWith('/')) {
      return origin + str;
    }
    return origin + '/' + str;
  }

  return '';
}

/**
 * 拦截与解析接口 API 响应中的媒体数据 (XHR & Fetch Hook)
 */
function initHjNetworkInterceptor() {
  if (typeof window === 'undefined' || window.__creamu_hj_interceptor_injected) return;
  window.__creamu_hj_interceptor_injected = true;

  // 页面自己的请求跑在页面窗口里。油猴的 isolated world 看到的 fetch 不是那一份。
  const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;

  const logNet = (url, bodySnippet = '') => {
    try {
      const netLog = window.__creamu_hj_network_log || [];
      if (netLog.length > 50) netLog.shift();
      netLog.push({ url: String(url), time: new Date().toLocaleTimeString(), snippet: bodySnippet.slice(0, 300) });
      console.log('[Creamu Hook]', url);
    } catch (_) {}
  };

  const handleResponseText = (url, text) => {
    if (!text || typeof text !== 'string') return;
    logNet(url, text);

    // 1. 全字符串正则提取
    parseHjMediaFromString(text);

    // 2. 如果是 JSON，进行结构化递归提取
    try {
      const data = JSON.parse(text);
      parseHjMediaFromData(data);
    } catch (_) {}
  };

  // 1. Hook Fetch
  const originalFetch = pageWindow.fetch;
  if (typeof originalFetch === 'function') {
    pageWindow.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      try {
        const url = args[0] ? (typeof args[0] === 'string' ? args[0] : args[0].url) : '';
        const clone = response.clone();
        clone.text().then((text) => {
          handleResponseText(url, text);
        }).catch(() => {});
      } catch (_) {}
      return response;
    };
  }

  // 2. Hook XMLHttpRequest
  const PageXHR = pageWindow.XMLHttpRequest || XMLHttpRequest;
  const originalOpen = PageXHR.prototype.open;
  const originalSend = PageXHR.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._hj_url = url;
    return originalOpen.apply(this, [method, url, ...rest]);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', function () {
      try {
        if (this.responseText) {
          handleResponseText(this._hj_url || '', this.responseText);
        }
      } catch (_) {}
    });
    return originalSend.apply(this, args);
  };
}

/**
 * 精准字符串提取 (严格限制为真实 m3u8 / mp4 视频及图片)
 */
function parseHjMediaFromString(text) {
  if (typeof text !== 'string' || !text) return;
  const cache = window.__creamu_hj_media_cache;

  // 1. 解压缩 JSON 转义斜杠
  let cleanText = text
    .replace(/\\\/|\\u002[fF]/g, '/')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#x2F;/gi, '/');

  // 2. 正则查找 Base64 编码并尝试解码
  cleanText = cleanText.replace(/aHR0c[A-Za-z0-9+/=]{20,}/g, (b64) => {
    try {
      if (typeof atob === 'function') {
        const decoded = atob(b64);
        if (decoded.includes('http') || decoded.includes('/') || decoded.includes('.m3u8')) {
          return decoded;
        }
      }
    } catch (_) {}
    return b64;
  });

  // 3. 精确搜索视频与图片 URL
  const mediaRegexes = [
    // 显式 http(s) URL
    /https?:\/\/[^\s"'<>\\]+?\.(?:m3u8|mp4|mov|flv|jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>\\]*)?/gi,
    // 包含 hls / video / upload / vod 关键词的媒体路径
    /(?:https?:\/\/[^\s"'<>\\]+|\/?(?:upload|video|hls|vod)\/)[^\s"'<>\\]+?\.(?:m3u8|mp4|mov|flv)(?:\?[^\s"'<>\\]*)?/gi,
    // 海角的播放地址经常没有后缀，只挂在 /hls/、/vod/、/playlist/ 下面
    /https?:\/\/[^\s"'<>\\]+?\/(?:hls|vod|m3u8|playlist)\/[^\s"'<>\\]+/gi
  ];

  let added = false;
  for (const regex of mediaRegexes) {
    let match;
    while ((match = regex.exec(cleanText)) !== null) {
      const raw = match[0];
      const url = tryNormalizeHjMediaUrl(raw);
      if (url && url.length > 8 && !cache.rawUrls.has(url)) {
        if (isRealVideoUrl(url)) {
          cache.rawUrls.add(url);
          if (!cache.videos.includes(url)) cache.videos.push(url);
          cache.videos.sort((a, b) => hjVideoPlayRank(a) - hjVideoPlayRank(b));
          added = true;
        } else if (isRealImageUrl(url)) {
          cache.rawUrls.add(url);
          if (!cache.images.includes(url)) cache.images.push(url);
          added = true;
        }
      }
    }
  }

  if (added) {
    scheduleHjMediaUpdate();
  }
}

/**
 * 从 JSON 对象中递归查找视频与图片 (全泛型结构递归扫描)
 */
function parseHjMediaFromData(obj) {
  if (!obj || typeof obj !== 'object') return;
  const cache = window.__creamu_hj_media_cache;
  let added = false;

  const checkString = (rawStr, keyHint = '') => {
    if (typeof rawStr !== 'string') return;
    
    // 如果长字符串包含 HTML 或多个字符，先跑全字符串正则提取
    if (rawStr.length > 30 || rawStr.includes('<') || rawStr.includes('http') || rawStr.includes('/')) {
      parseHjMediaFromString(rawStr);
    }

    const url = tryNormalizeHjMediaUrl(rawStr);
    if (!url || url.length < 8) return;
    if (cache.rawUrls.has(url)) return;

    if (isRealVideoUrl(url)) {
      cache.rawUrls.add(url);
      if (!cache.videos.includes(url)) cache.videos.push(url);
      cache.videos.sort((a, b) => hjVideoPlayRank(a) - hjVideoPlayRank(b));
      added = true;
    } else if (isRealImageUrl(url)) {
      cache.rawUrls.add(url);
      if (!cache.images.includes(url)) cache.images.push(url);
      added = true;
    }
  };

  const traverse = (item, parentKey = '') => {
    if (!item) return;
    if (typeof item === 'string') {
      checkString(item, parentKey);
    } else if (Array.isArray(item)) {
      item.forEach((el) => traverse(el, parentKey));
    } else if (typeof item === 'object') {
      for (const key in item) {
        if (Object.prototype.hasOwnProperty.call(item, key)) {
          traverse(item[key], key);
        }
      }
    }
  };

  traverse(obj);
  if (added) {
    scheduleHjMediaUpdate();
  }
}

/**
 * 从全局状态变量及 DOM 节点深度扫描
 */
function parseHjHiddenMediaFromGlobals() {
  const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
  const cache = window.__creamu_hj_media_cache || { videos: [], images: [], rawUrls: new Set() };
  
  const globals = [pageWindow.__INITIAL_STATE__, pageWindow.__NUXT__, pageWindow.detailData, pageWindow.postData, pageWindow.$video, pageWindow.videoInfo, pageWindow.playData, pageWindow.topicData];
  globals.forEach((g) => {
    if (g) parseHjMediaFromData(g);
  });

  if (typeof document !== 'undefined') {
    // 1. 扫描脚本
    const scripts = document.querySelectorAll('script:not([src])');
    scripts.forEach((script) => {
      parseHjMediaFromString(script.textContent || '');
    });

    // 2. 扫描 video / source 节点
    const videoElements = document.querySelectorAll('video, video source, audio source');
    videoElements.forEach((v) => {
      const src = v.getAttribute('src') || v.src;
      if (src) {
        const normalized = tryNormalizeHjMediaUrl(src);
        if (normalized && isRealVideoUrl(normalized)) parseHjMediaFromData({ url: normalized });
      }
    });

    // 3. 扫描 dataset 节点
    const nodes = document.querySelectorAll('[data-src], [data-video], [data-url], [data-original], [data-hls], [data-play-url], [data-m3u8]');
    nodes.forEach((el) => {
      ['data-src', 'data-video', 'data-url', 'data-original', 'data-hls', 'data-play-url', 'data-m3u8'].forEach((attr) => {
        const val = el.getAttribute(attr);
        if (val) {
          const normalized = tryNormalizeHjMediaUrl(val);
          if (normalized && isRealVideoUrl(normalized)) parseHjMediaFromData({ url: normalized });
        }
      });
    });
  }

  return {
    videos: cache.videos,
    images: cache.images
  };
}

/**
 * 校验节点是否属于顶部导航栏、页脚或侧栏
 */
function isHeaderOrNav(el) {
  if (!el) return true;
  let cur = el;
  while (cur && cur !== document.body && cur !== document.documentElement) {
    const className = String(cur.className || '').toLowerCase();
    const id = String(cur.id || '').toLowerCase();
    const tagName = String(cur.tagName || '').toLowerCase();
    if (
      className.includes('nav') || className.includes('header') || className.includes('tabbar') ||
      className.includes('head') || className.includes('topbar') || className.includes('footer') ||
      id.includes('nav') || id.includes('header') || id.includes('head') ||
      tagName === 'header' || tagName === 'nav' || tagName === 'footer'
    ) {
      return true;
    }
    cur = cur.parentElement;
  }
  return false;
}

/**
 * 手机版帖子的 class 会换，不能只认一组写死的名字。
 * 从付费墙、封面、正文这些真实节点往上收，收到一块够大、又不是导航的容器。
 */
function findHjPostMediaContainer() {
  if (typeof document === 'undefined') return null;

  const knownSelectors = [
    '.topic-detail', '.topic_detail', '.post-detail', '.post_detail',
    '.detail-content', '.detail_content', '.post-content', '.post_content',
    '.article-body', '.pay-box', '.attachment-box', '.video-player',
    '.video-box', '.post-media', '.media-wrapper',
    '.topic-content', '.topic_content', '.detail-body', '.article-content',
    '.content-body', '.rich-text', '.ql-editor'
  ];
  for (const selector of knownSelectors) {
    const el = document.querySelector(selector);
    if (el && isHjPostMount(el)) return el;
  }

  const seeds = [];
  document.querySelectorAll('button, a, div, span, p').forEach((el) => {
    const text = String(el.textContent || '').replace(/\s+/g, '');
    if (text && text.length <= 24 && /解锁|付费|购买|立即看|金币/.test(text)) seeds.push(el);
  });
  document.querySelectorAll('video, img, [class*="cover"], [class*="poster"], [class*="blur"]').forEach((el) => {
    if (el && el.nodeType === 1) seeds.push(el);
  });

  // 种子本身常是按钮或封面。播放器要挂在包住它的帖子上，所以从父节点开始收。
  let best = null;
  let bestArea = Infinity;
  const seen = new Set();
  for (const seed of seeds) {
    let cur = seed.parentElement;
    for (let depth = 0; cur && depth < 8; depth += 1) {
      if (!seen.has(cur) && isHjPostMount(cur)) {
        seen.add(cur);
        const rect = cur.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (area < bestArea) {
          best = cur;
          bestArea = area;
        }
        break;
      }
      cur = cur.parentElement;
    }
  }
  return best;
}

function isHjPostMount(el) {
  if (!el || el === document.body || el === document.documentElement) return false;
  if (el.id === 'app' || el.id === '__nuxt' || el.id === 'root') return false;
  if (isHeaderOrNav(el)) return false;
  const className = String(el.className || '');
  if (className.includes('creamu-hj')) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 100 && rect.height > 30;
}

/**
 * 播放器贴在帖子正文前面，跟着帖子滚动。
 * 帖子被页面重绘清掉时，由定时器把同一块播放器挪回去，不拆掉重做。
 */
function ensureHjInlineSlot() {
  const anchor = findHjPostMediaContainer();
  if (!anchor || !anchor.parentElement) return null;
  let slot = document.getElementById('creamu-hj-inline-slot');
  if (!slot) {
    slot = document.createElement('div');
    slot.id = 'creamu-hj-inline-slot';
  }
  slot.style.cssText = 'display:block;width:100%;margin:8px 0;';
  if (slot.parentElement !== anchor.parentElement || slot.nextElementSibling !== anchor) {
    anchor.parentElement.insertBefore(slot, anchor);
  }
  return slot;
}

/**
 * 全局 HTML5 视频播放弹窗 (保底 100% 浮层播放)
 */
function openHjModalPlayer(videoUrl) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
  if (!videoUrl) return;

  let modal = document.getElementById('creamu-hj-modal-player');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'creamu-hj-modal-player';
    document.body.appendChild(modal);
  }

  modal.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background: rgba(0, 0, 0, 0.92) !important;
    z-index: 2147483646 !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    align-items: center !important;
    box-sizing: border-box !important;
    padding: 16px !important;
    backdrop-filter: blur(12px) !important;
  `;

  modal.innerHTML = `
    <div style="width: 100%; max-width: 600px; background: #141418; border-radius: 16px; overflow: hidden; border: 1px solid rgba(226,183,184,0.4); box-shadow: 0 12px 36px rgba(0,0,0,0.8);">
      <div style="padding: 10px 16px; background: #1a1a20; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08);">
        <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #e1e1e6; font-weight: bold;">
          <span style="background: #e2b7b8; color: #121214; font-size: 10px; padding: 2px 6px; border-radius: 4px;">Creamu</span>
          <span>视频解封播放器</span>
        </div>
        <button id="creamu-hj-modal-close" style="background: transparent; color: #a0a0b0; border: none; font-size: 20px; cursor: pointer; padding: 0 6px;">✕</button>
      </div>

      <video id="creamu-hj-modal-video" controls playsinline webkit-playsinline x5-playsinline="true" x5-video-player-type="h5-page" x5-video-player-fullscreen="true" style="width: 100%; max-height: 65vh; background: #000; display: block;">
        您的浏览器不支持 HTML5 视频播放。
      </video>

      <div class="creamu-hj-player-toolbar" style="padding: 10px 14px; background: #18181c; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; gap: 6px;">
          <button class="creamu-hj-btn" id="creamu-hj-m-rewind">⏪ -10s</button>
          <button class="creamu-hj-btn" id="creamu-hj-m-forward">⏩ +10s</button>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="creamu-hj-btn" id="creamu-hj-m-speed">⚡ 1.5x</button>
          <button class="creamu-hj-btn" id="creamu-hj-m-copy">📋 复制直链</button>
        </div>
      </div>
    </div>
  `;

  const videoEl = document.getElementById('creamu-hj-modal-video');
  const closeBtn = document.getElementById('creamu-hj-modal-close');

  if (closeBtn) {
    closeBtn.onclick = () => {
      if (videoEl) videoEl.pause();
      modal.style.display = 'none';
    };
  }

  if ((/\.m3u8($|\?)/i.test(videoUrl) || /\/(hls|vod|m3u8|playlist)\//i.test(videoUrl)) && typeof GM_xmlhttpRequest === 'function') {
    loadHjM3u8WithGm(videoEl, videoUrl);
  } else {
    videoEl.src = videoUrl;
  }

  enableHjVideoGestureSeek(videoEl);

  const rewindBtn = document.getElementById('creamu-hj-m-rewind');
  if (rewindBtn) rewindBtn.onclick = () => { videoEl.currentTime = Math.max(0, videoEl.currentTime - 10); };

  const forwardBtn = document.getElementById('creamu-hj-m-forward');
  if (forwardBtn) forwardBtn.onclick = () => { videoEl.currentTime = Math.min(videoEl.duration || 0, videoEl.currentTime + 10); };

  const speedBtn = document.getElementById('creamu-hj-m-speed');
  if (speedBtn) {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    let sIdx = 2;
    videoEl.playbackRate = 1.5;
    speedBtn.onclick = () => {
      sIdx = (sIdx + 1) % speeds.length;
      const spd = speeds[sIdx];
      videoEl.playbackRate = spd;
      speedBtn.textContent = `⚡ ${spd}x`;
      showHjSeekHud(`倍速播放: ${spd}x`);
    };
  }

  const copyBtn = document.getElementById('creamu-hj-m-copy');
  if (copyBtn) {
    copyBtn.onclick = () => {
      if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(videoUrl);
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(videoUrl);
      }
      alert('已复制视频直链！');
    };
  }

  modal.style.display = 'flex';
}

/**
 * 安全的更新触发调度器（防死循环 + 防卡死防抖）
 */
let hjUpdateTimer = null;
function scheduleHjMediaUpdate() {
  if (hjUpdateTimer) return;
  if (typeof setTimeout === 'function') {
    hjUpdateTimer = setTimeout(() => {
      hjUpdateTimer = null;
      embedHjUnlockedMediaInline();
    }, 400);
  } else {
    embedHjUnlockedMediaInline();
  }
}

/**
 * 主入口：解析隐藏媒体
 */
function parseHjHiddenMedia() {
  initHjNetworkInterceptor();
  const res = parseHjHiddenMediaFromGlobals();
  scheduleHjMediaUpdate();
  setupHjMobileObserver();
  return res;
}

/**
 * 监听移动端 DOM 变动 (防死循环 + 忽略 Creamu 自身节点)
 */
function setupHjMobileObserver() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || window.__creamu_hj_observer_active) return;
  window.__creamu_hj_observer_active = true;

  // 小窗建好后不再监听整页。海角页面自己一直在改 DOM，整页监听会把播放器反复拆掉重做。
  if (typeof setInterval !== 'function' || typeof document.getElementById !== 'function') return;
  setInterval(() => {
    const cache = window.__creamu_hj_media_cache;
    const identity = hjPostIdentity();
    if (cache && cache.postIdentity && cache.postIdentity !== identity) {
      resetHjMediaForPost(identity);
    }
    if (cache && !cache.postIdentity) cache.postIdentity = identity;
    if (!cache || !cache.videos || !cache.videos.length) {
      parseHjHiddenMediaFromGlobals();
      if (cache && cache.images && cache.images.length) renderHjUnlockedImages();
      return;
    }
    if (cache.images && cache.images.length) renderHjUnlockedImages();
    const slot = document.getElementById('creamu-hj-inline-slot');
    const box = document.getElementById('creamu-hj-inline-player-box');
    if (slot && slot.parentElement === document.body && box && slot.contains(box)) return;
    embedHjUnlockedMediaInline();
  }, 1500);
}

/**
 * 顶层状态诊断提示条。默认不挂到页面上，解析结果只进内嵌播放器。
 */
function renderHjUnlockedMediaBar() {
  return;
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
  const cache = window.__creamu_hj_media_cache || { videos: [], images: [] };

  const root = document.documentElement || document.body;
  if (!root) return;

  let bar = document.getElementById('creamu-hj-media-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'creamu-hj-media-bar';
    root.appendChild(bar);
  }

  bar.style.cssText = `
    position: fixed !important;
    top: 10px !important;
    left: 10px !important;
    right: 10px !important;
    z-index: 2147483647 !important;
    box-sizing: border-box !important;
    pointer-events: auto !important;
    visibility: visible !important;
    opacity: 1 !important;
    display: block !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  `;

  const videoCount = cache.videos.length;
  const imageCount = cache.images.length;
  const logCount = (window.__creamu_hj_network_log || []).length;
  
  const playBtnHtml = videoCount > 0 ? `<button id="creamu-hj-play-now-btn" style="background:#e2b7b8 !important; color:#121214 !important; font-weight:bold !important; border:none !important; padding:4px 9px !important; border-radius:6px !important; font-size:11px !important; cursor:pointer !important;">▶ 播放 (${videoCount})</button>` : '';

  bar.innerHTML = `
    <div style="display:flex !important; align-items:center !important; justify-content:space-between !important; gap:8px !important; padding:8px 12px !important; background:rgba(28,28,34,0.96) !important; border:1px solid rgba(226,183,184,0.5) !important; border-radius:12px !important; color:#e1e1e6 !important; font-size:12px !important; box-shadow:0 6px 20px rgba(0,0,0,0.6) !important; backdrop-filter:blur(10px) !important;">
      <div style="display:flex !important; align-items:center !important; gap:6px !important;">
        <span style="background:#e2b7b8 !important; color:#121214 !important; font-weight:bold !important; font-size:10px !important; padding:2px 5px !important; border-radius:4px !important;">Creamu</span>
        <span>已捕获: <strong style="color:#e2b7b8 !important;">${videoCount}</strong> 视频</span>
      </div>
      <div style="display:flex !important; gap:4px !important; align-items:center !important;">
        ${playBtnHtml}
        <button id="creamu-hj-log-btn" style="background:#2a2a34 !important; color:#e2b7b8 !important; border:1px solid rgba(226,183,184,0.3) !important; padding:4px 8px !important; border-radius:6px !important; font-size:11px !important; cursor:pointer !important;">📋 日志 (${logCount})</button>
        <button id="creamu-hj-close-btn" style="background:transparent !important; color:#a0a0b0 !important; border:none !important; font-size:15px !important; padding:0 4px !important; cursor:pointer !important;">✕</button>
      </div>
    </div>
  `;

  const closeBtn = document.getElementById('creamu-hj-close-btn');
  if (closeBtn) {
    closeBtn.onclick = () => { bar.style.display = 'none'; };
  }

  const playNowBtn = document.getElementById('creamu-hj-play-now-btn');
  if (playNowBtn) {
    playNowBtn.onclick = () => {
      if (cache.videos.length > 0) {
        openHjModalPlayer(cache.videos[0]);
      }
    };
  }

  const logBtn = document.getElementById('creamu-hj-log-btn');
  if (logBtn) {
    logBtn.onclick = () => {
      const logs = window.__creamu_hj_network_log || [];
      const netUrls = logs.map((l) => `${l.time} -> ${l.url}`).join('\n');
      const vUrls = cache.videos.join('\n');
      const imgUrls = cache.images.join('\n');
      alert(`【Creamu 诊断日志】\n\n已拦截网络请求(${logs.length}个):\n${netUrls.slice(0, 400) || '无'}\n\n当前提取视频链接:\n${vUrls || '未提取到视频链接'}\n\n当前提取图片链接:\n${imgUrls.slice(0, 200) || '无'}`);
    };
  }
}

/**
 * 核心升级：直接把 HLS.js HTML5 视频播放器【内嵌到帖子正文中】！
 */
/** ArtPlayer 负责画面、进度拖动、全屏和倍速。解码仍走带站点密钥的 Hls。 */
function mountHjArtPlayer(videoUrl) {
  const mount = document.getElementById('creamu-hj-art-mount');
  if (!mount || typeof Artplayer !== 'function') return null;
  if (mount._hjArt) {
    try { mount._hjArt.destroy(false); } catch (_) {}
  }
  const art = new Artplayer({
    container: mount,
    url: videoUrl,
    type: 'm3u8',
    autoplay: true,
    playsInline: true,
    fullscreen: true,
    fullscreenWeb: true,
    pip: true,
    playbackRate: true,
    setting: true,
    flip: true,
    aspectRatio: true,
    gesture: true,
    theme: '#e2b7b8',
    lang: 'zh-cn',
    moreVideoAttr: { playsInline: true, 'webkit-playsinline': 'true' },
    customType: {
      m3u8(video, url) {
        if (typeof window.Hls === 'function' && window.Hls.isSupported()) loadHjM3u8WithGm(video, url);
        else video.src = url;
      },
    },
  });
  mount._hjArt = art;
  return art.video || art.template && art.template.$video;
}

function embedHjUnlockedMediaInline() {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
  const cache = window.__creamu_hj_media_cache;
  if (!cache || cache.videos.length === 0) return;

  const videoIndex = Math.min(currentHjSelectedVideoIndex, cache.videos.length - 1);
  const videoUrl = cache.videos[videoIndex];
  if (!videoUrl) return;

  // 只要解析到视频就开小窗，不再依赖帖子节点。
  const container = ensureHjInlineSlot();
  if (!container) return;

  let playerBox = document.getElementById('creamu-hj-inline-player-box');
  if (!playerBox) {
    playerBox = document.createElement('div');
    playerBox.id = 'creamu-hj-inline-player-box';
    playerBox.className = 'creamu-hj-inline-player-box';
  }

  // 1. 动态迁移：如果 playerBox 不在当前最新查找到的 container 中，迁移！
  if (playerBox.parentElement !== container) {
    if (container.firstChild) {
      container.insertBefore(playerBox, container.firstChild);
    } else {
      container.appendChild(playerBox);
    }
  }

  // 2. 防重复渲染校验：URL 相同且已经在目标容器中才跳过 HTML 构建
  if (playerBox.getAttribute('data-video-url') === videoUrl && playerBox.parentElement === container) {
    return;
  }

  playerBox.setAttribute('data-video-url', videoUrl);

  playerBox.style.cssText = `
    width: 100% !important;
    margin: 12px 0 !important;
    background: #000 !important;
    border-radius: 12px !important;
    overflow: hidden !important;
    box-shadow: 0 6px 20px rgba(0,0,0,0.5) !important;
    border: 1px solid rgba(226,183,184,0.4) !important;
    position: relative !important;
    z-index: 99999 !important;
  `;

  // 构建多视频切换按钮
  let switcherHtml = '';
  if (cache.videos.length > 1) {
    switcherHtml = `<div style="display:flex; gap:6px; padding:6px 12px; background:#121216; overflow-x:auto; border-bottom:1px solid rgba(255,255,255,0.08);">`;
    cache.videos.forEach((v, idx) => {
      const activeStyle = idx === videoIndex ? 'background:#e2b7b8; color:#121214; font-weight:bold;' : 'background:#2a2a34; color:#e1e1e6;';
      switcherHtml += `<button class="creamu-hj-vswitch-btn" data-idx="${idx}" style="${activeStyle} border:none; padding:4px 10px; border-radius:6px; font-size:11px; cursor:pointer; whitespace:nowrap;">视频 ${idx + 1}</button>`;
    });
    switcherHtml += `</div>`;
  }

  if (playerBox.getAttribute('data-video-url') === videoUrl && document.getElementById('creamu-hj-art-mount')) {
    return;
  }
  playerBox.innerHTML = `
    ${switcherHtml}
    <div id="creamu-hj-art-mount" style="width:100%; aspect-ratio:16/9; background:#000;"></div>
    <div id="creamu-hj-play-status" style="display:none; padding:4px 8px; background:#2a1618; color:#ffb4af; font-size:11px;"></div>
    <button class="creamu-hj-btn" id="creamu-hj-debug-toggle" type="button">调试</button>
    <pre id="creamu-hj-debug" style="display:none; margin:0; padding:6px 8px; white-space:pre-wrap; word-break:break-all; color:#b7b7c4; font-size:11px; max-height:180px; overflow:auto; background:#101014;"></pre>
  `;

  // 绑定多视频切换
  const switchBtns = playerBox.querySelectorAll('.creamu-hj-vswitch-btn');
  switchBtns.forEach((btn) => {
    btn.onclick = () => {
      const idx = parseInt(btn.getAttribute('data-idx') || '0', 10);
      currentHjSelectedVideoIndex = idx;
      playerBox.removeAttribute('data-video-url');
      embedHjUnlockedMediaInline();
    };
  });

  const videoEl = mountHjArtPlayer(videoUrl);
  if (!videoEl) return;
  const statusEl = document.getElementById('creamu-hj-play-status');
  const showPlayStatus = (text) => {
    if (!statusEl) return;
    statusEl.style.display = text ? 'block' : 'none';
    statusEl.textContent = text || '';
  };
  videoEl.addEventListener('error', () => {
    const code = videoEl.error && videoEl.error.code;
    hjDebug('播放器错误 code=' + code + ' src=' + String(videoEl.currentSrc || videoEl.src).slice(0, 80));
    showPlayStatus('播放器报错 code=' + code);
  });
  videoEl.addEventListener('playing', () => showPlayStatus(''));
  hjDebug('选用 ' + videoUrl);

  const debugToggle = document.getElementById('creamu-hj-debug-toggle');
  const debugBox = document.getElementById('creamu-hj-debug');
  if (debugBox) debugBox.textContent = (window.__creamu_hj_debug || []).join('\n');
  if (debugToggle && debugBox) {
    debugToggle.onclick = () => {
      if (debugBox.style.display === 'none') {
        debugBox.style.display = 'block';
        debugBox.textContent = (window.__creamu_hj_debug || []).join('\n');
        debugToggle.textContent = '复制调试';
        return;
      }
      copyHjDebug();
      debugToggle.textContent = '已复制';
    };
  }
  hjDebug('地址 ' + cache.videos.length + ' 条');
}

// 启动运行
parseHjHiddenMedia();
