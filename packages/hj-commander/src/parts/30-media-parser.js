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
}

let currentHjSelectedVideoIndex = 0;

function resetHjMediaForPost(identity) {
  const cache = window.__creamu_hj_media_cache;
  if (!cache) return;
  destroyHjPlayer();
  cache.generation = (cache.generation || 0) + 1;
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
  const box = typeof document !== 'undefined' ? document.getElementById('creamu-hj-inline-player-box') : null;
  if (box) box.remove();
  document.getElementById('creamu-hj-inline-slot')?.remove();
  const images = typeof document !== 'undefined' ? document.getElementById('creamu-hj-image-box') : null;
  if (images) {
    images.innerHTML = '';
    if (images.dataset) delete images.dataset.images;
  }
  cache.status = '';
  cache.topicRequested = false;
  cache.topicLoading = false;
  cache.imageRequests = new Map();
  window.__creamu_hj_debug = [];
  hjDebug('当前帖子 ' + (identity || '列表'));
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

function gmHjRequest(url, responseType, headers, signal) {
  return new Promise((resolve) => {
    if (typeof GM_xmlhttpRequest !== 'function') {
      resolve(null);
      return;
    }
    if (signal?.aborted) { resolve(null); return; }
    const request = GM_xmlhttpRequest({
      method: 'GET',
      url,
      headers: headers || {},
      responseType: responseType || 'text',
      timeout: 20000,
      onload: (response) => {
        hjDebug('请求 ' + (response.status || '?') + ' ' + url.slice(0, 90));
        resolve(response.status && (response.status < 200 || response.status >= 300) ? null : response);
      },
      onabort: () => resolve(null),
      onerror: () => {
        hjDebug('请求失败 ' + url.slice(0, 90));
        resolve(null);
      },
      ontimeout: () => {
        hjDebug('请求超时 ' + url.slice(0, 90));
        resolve(null);
      },
    });
    signal?.addEventListener('abort', () => { request?.abort(); resolve(null); }, { once: true });
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
  const pending = window.__creamu_hj_key_module;
  pending.then(mod => {
    if (!mod && window.__creamu_hj_key_module === pending) window.__creamu_hj_key_module = null;
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
    if (video._hjDisposed) return;
    if (typeof window.Hls !== 'function' || !window.Hls.isSupported()) {
      if (video.canPlayType?.('application/vnd.apple.mpegurl')) video.src = playlistUrl;
      else if (onStatus) onStatus('当前浏览器无法加载 HLS 播放组件，请刷新后重试。');
      return;
    }
    if (video._hjHls) {
      try { video._hjHls.destroy(); } catch (_) {}
    }
    let keyMaterial;
    const getKeyMaterial = () => keyMaterial || (keyMaterial = Promise.all([
      loadHjSiteKeyModule(), gmHjRequest(String(playlistUrl).replace(/\.m3u8($|\?)/i, '.jpg$1'), 'text'),
    ]));
    const loader = function () {};
    loader.prototype.load = function (context, config, callbacks) {
      this.controller = new AbortController();
      this.aborted = false;
      let url = context.url;
      const encryptedKey = /\.key(?:[^/]*)($|\?)/i.test(url);
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
        if (this.aborted) return;
        this.stats.loading.end = now;
        callbacks.onError({ code: 0, text }, context, null, this.stats);
      };
      gmHjRequest(url, wantsText ? 'text' : 'arraybuffer', headers, this.controller.signal).then(async response => {
        if (this.aborted) return;
        if (!response) {
          fail('请求失败');
          return;
        }
        const finish = (data) => {
        if (this.aborted) return;
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
        else {
          let bytes = await gmHjBytes(response);
          if (encryptedKey) {
            const [mod, jpg] = await getKeyMaterial();
            if (this.aborted) return;
            if (!mod || !jpg) throw new Error('站点解码材料不可用');
            const binary = atob(String(jpg.responseText || jpg.response || '').trim());
            const material = Uint8Array.from(binary, char => char.charCodeAt(0));
            bytes = transformHjAesKey(mod, bytes, material).buffer;
          }
          finish(bytes);
        }
      }).catch((error) => fail(String(error && error.message || error)));
    };
    loader.prototype.abort = function () { this.aborted = true; this.stats.aborted = true; this.controller?.abort(); };
    loader.prototype.destroy = loader.prototype.abort;
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

    });
    hls.loadSource(playlistUrl);
    hls.attachMedia(video);
    hjDebug('交给 Hls');
  };
  start();
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

function renderHjUnlockedImages() {
  const cache = window.__creamu_hj_media_cache;
  if (!cache || !cache.images.length || typeof document === 'undefined') return;
  const slot = ensureHjInlineSlot();
  if (!slot) return;
  let box = document.getElementById('creamu-hj-image-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'creamu-hj-image-box';

    slot.appendChild(box);
  }
  const current = cache.images.join('\n');
  if (box.dataset.images === current) return;
  box.dataset.images = current;
  box.innerHTML = '';
  cache.images.forEach((url) => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '帖子图片';
    img.loading = 'lazy';
    box.appendChild(img);
  });
}

async function unlockHjHiddenImages(topic) {
  const cache = window.__creamu_hj_media_cache;
  const attachments = hjTopicImageAttachments(topic);
  if (!cache || !attachments.length) return 0;
  const generation = cache.generation;
  const requests = cache.imageRequests || (cache.imageRequests = new Map());
  const before = cache.images.length;
  for (const item of attachments) {
    const remote = tryNormalizeHjMediaUrl(String(item.remoteUrl || item.url || ''));
    if (!remote || cache.rawUrls.has('image:' + remote)) continue;
    if (!requests.has(remote)) requests.set(remote, gmHjRequest(remote, 'arraybuffer'));
    const response = await requests.get(remote);
    requests.delete(remote);
    const buffer = response ? await gmHjBytes(response) : null;
    if (generation !== cache.generation) return 0;
    if (cache.rawUrls.has('image:' + remote)) continue;
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
  if (window.__creamu_hj_interceptor_injected) return;
  window.__creamu_hj_interceptor_injected = true;
  const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
  const requestScope = (raw) => {
    const identity = currentHjPostId();
    const cache = window.__creamu_hj_media_cache;
    if (cache.postIdentity !== identity) resetHjMediaForPost(identity);
    if (!identity) return null;
    let url;
    try { url = new URL(raw, location.href); } catch (_) { return null; }
    const topic = url.pathname.match(/\/api\/topic\/(\d+)$/);
    if (topic && topic[1] !== identity) return null;
    // 只接收当前帖子的详情，推荐列表与广告响应不进入媒体缓存。
    if (!topic) return null;
    return { generation: cache.generation, topic: true };
  };
  const accept = (scope, text) => {
    if (!scope || scope.generation !== window.__creamu_hj_media_cache.generation) return;
    if (scope.topic) {
      const payload = decodeHjTopicPayload(text);
      if (payload) acceptHjTopicData(payload, scope.generation).catch(() => {});
    }
  };
  const originalFetch = pageWindow.fetch;
  if (typeof originalFetch === 'function') window.__creamu_hj_fetch = originalFetch.bind(pageWindow);
  if (typeof originalFetch === 'function') pageWindow.fetch = async function (...args) {
    const scope = requestScope(typeof args[0] === 'string' ? args[0] : args[0]?.url);
    const response = await originalFetch.apply(this, args);
    if (scope?.topic && response.ok) response.clone().text().then(text => accept(scope, text)).catch(() => {});
    return response;
  };
  const PageXHR = pageWindow.XMLHttpRequest;
  if (!PageXHR) return;
  const originalOpen = PageXHR.prototype.open;
  const originalSend = PageXHR.prototype.send;
  PageXHR.prototype.open = function (method, url, ...rest) {
    this._hjScope = requestScope(url);
    return originalOpen.apply(this, [method, url, ...rest]);
  };
  PageXHR.prototype.send = function (...args) {
    this.addEventListener('load', () => {
      if (this.status < 200 || this.status >= 300) return;
      try { accept(this._hjScope, this.responseType === 'json' ? JSON.stringify(this.response) : this.responseText); } catch (_) {}
    }, { once: true });
    return originalSend.apply(this, args);
  };
}

async function acceptHjTopicData(payload, generation) {
  const cache = window.__creamu_hj_media_cache;
  if (generation !== cache.generation) return;
  const topic = payload.results?.[0] || payload;
  if (!topic || (!topic.topicId && !Array.isArray(topic.attachments) && typeof topic.content !== 'string')) {
    throw new Error('帖子响应不含正文或附件，请确认当前登录状态');
  }
  if (topic.topicId && String(topic.topicId) !== cache.postIdentity) return;
  cache.status = '';
  const attachments = Array.isArray(topic.attachments) ? topic.attachments : [];
  parseHjMediaFromData({ attachments: attachments.filter(item => item.category !== 'images' && item.category !== 'image'), content: topic.content, videoUrl: topic.videoUrl });
  await unlockHjHiddenImages(topic);
  if (generation !== cache.generation) return;
  const missing = hjTopicImageAttachments(topic).filter(item => !cache.rawUrls.has('image:' + tryNormalizeHjMediaUrl(String(item.remoteUrl || item.url || '')))).length;
  cache.status = missing ? missing + ' 张图片读取失败，可重新解析。' : cache.videos.length || cache.images.length ? '' : '当前帖子没有可播放的媒体。';
  scheduleHjMediaUpdate();
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
    /https?:\/\/[^\s"'<>\\]+?\.(?:m3u8|mp4|mov|flv|jpg|jpeg|png|webp|gif)(?![\w.])(?:\?[^\s"'<>\\]*)?/gi,
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
const hjScannedGlobals = new WeakSet();
function parseHjHiddenMediaFromGlobals() {
  const pageWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
  const cache = window.__creamu_hj_media_cache || { videos: [], images: [], rawUrls: new Set() };
  
  const globals = [pageWindow.__INITIAL_STATE__, pageWindow.__NUXT__, pageWindow.detailData, pageWindow.postData, pageWindow.$video, pageWindow.videoInfo, pageWindow.playData, pageWindow.topicData];
  globals.forEach((g) => {
    if (!g || typeof g !== 'object' || hjScannedGlobals.has(g)) return;
    const id = g.topicId || g.post?.topicId;
    if (id && String(id) !== cache.postIdentity) return;
    hjScannedGlobals.add(g);
    parseHjMediaFromData(g);
  });

  if (typeof document !== 'undefined') {
    // 2. 扫描 video / source 节点
    const videoElements = document.querySelectorAll('video, video source, audio source');
    videoElements.forEach((v) => {
      if (v.closest('#creamu-hj-inline-slot, .ad-banner, .custom_carousel')) return;
      const src = v.getAttribute('src') || v.src;
      if (src) {
        const normalized = tryNormalizeHjMediaUrl(src);
        if (normalized && isRealVideoUrl(normalized)) parseHjMediaFromData({ url: normalized });
      }
    });

    // 3. 扫描 dataset 节点
    const nodes = document.querySelectorAll('[data-src], [data-video], [data-url], [data-original], [data-hls], [data-play-url], [data-m3u8]');
    nodes.forEach((el) => {
      if (el.closest('#creamu-hj-inline-slot, .ad-banner, .custom_carousel')) return;
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

/** 仅挂载到已确认的两版帖子正文；SPA 正文尚未出现时等待页面刷新。 */
function findHjPostMediaContainer() {
  return document.querySelector('#details-page .article.ql-editor, .mobile .details .reset-html-box');
}

/**
 * 播放器贴在帖子正文前面，跟着帖子滚动。
 * 帖子被页面重绘清掉时，由页面观察器把同一块播放器挪回去，不拆掉重做。
 */
function ensureHjInlineSlot() {
  const anchor = findHjPostMediaContainer();
  if (!anchor || !anchor.parentElement) return null;
  let slot = document.getElementById('creamu-hj-inline-slot');
  if (!slot) {
    slot = document.createElement('div');
    slot.id = 'creamu-hj-inline-slot';
  }

  if (slot.parentElement !== anchor.parentElement || slot.nextElementSibling !== anchor) {
    anchor.parentElement.insertBefore(slot, anchor);
  }
  return slot;
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
    }, 80);
  } else {
    embedHjUnlockedMediaInline();
  }
}

/**
 * 主入口：解析隐藏媒体
 */
function parseHjHiddenMedia() {
  const res = parseHjHiddenMediaFromGlobals();
  scheduleHjMediaUpdate();

  return res;
}

let hjPlayer = null;
function destroyHjPlayer() {
  if (!hjPlayer) return;
  const { art, video } = hjPlayer;
  if (video) video._hjDisposed = true;
  if (video?._hjHls) { video._hjHls.destroy(); video._hjHls = null; }
  if (art) art.destroy(false);
  else if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
  hjPlayer = null;
}

function mountHjArtPlayer(videoUrl) {
  const mount = document.getElementById('creamu-hj-art-mount');
  if (!mount) return null;
  const hls = /\.m3u8($|\?)/i.test(videoUrl) || /\/(hls|vod|m3u8|playlist)\//i.test(videoUrl);
  const onStatus = text => {
    if (hjPlayer?.url !== videoUrl) return;
    const el = document.getElementById('creamu-hj-play-status');
    if (el) el.textContent = text;
  };
  let art = null, video;
  hjPlayer = { art: null, video: null, url: videoUrl };
  if (typeof Artplayer === 'function') {
    art = new Artplayer({
      container: mount, url: videoUrl, type: hls ? 'm3u8' : 'mp4', autoplay: false,
      playsInline: true, fullscreen: true, fullscreenWeb: true, pip: true,
      playbackRate: true, setting: true, gesture: true, theme: '#78947c', lang: 'zh-cn',
      moreVideoAttr: { playsInline: true, 'webkit-playsinline': 'true' },
      customType: { m3u8: (el, url) => loadHjM3u8WithGm(el, url, onStatus) },
    });
    video = art.video || art.template?.$video;
  } else {
    video = document.createElement('video');
    video.controls = true; video.playsInline = true; video.preload = 'metadata';
    mount.appendChild(video);
    if (hls) loadHjM3u8WithGm(video, videoUrl, onStatus);
    else video.src = videoUrl;
  }
  hjPlayer = { art, video, url: videoUrl };
  video?.addEventListener('error', () => onStatus('播放失败，可重试解析或复制地址检查。'));
  video?.addEventListener('playing', () => onStatus(''));
  return video;
}

function embedHjUnlockedMediaInline() {
  const cache = window.__creamu_hj_media_cache;
  if (!cache || (!cache.videos.length && !cache.postIdentity)) return;
  const container = ensureHjInlineSlot();
  if (!container) return;
  let box = document.getElementById('creamu-hj-inline-player-box');
  if (!box) {
    box = document.createElement('section');
    box.id = 'creamu-hj-inline-player-box';
    box.className = 'creamu-hj-media';
    box.innerHTML = `<div class="creamu-hj-media-head"><strong>帖子媒体</strong><small id="creamu-hj-media-count"></small><div class="creamu-hj-switcher"></div></div>
      <div id="creamu-hj-art-mount"></div><div id="creamu-hj-play-status" role="status"></div>
      <div class="creamu-hj-player-toolbar"><button class="creamu-hj-btn" id="creamu-hj-retry" type="button">重新解析</button><button class="creamu-hj-btn" id="creamu-hj-copy" type="button">复制地址</button></div>
      <details id="creamu-hj-debug-details"><summary>播放诊断</summary><pre id="creamu-hj-debug"></pre><button class="creamu-hj-btn" id="creamu-hj-debug-copy" type="button">复制诊断</button></details>`;
    container.insertBefore(box, container.firstChild);
    box.querySelector('#creamu-hj-retry').onclick = () => loadHjCurrentTopic(true);
    box.querySelector('#creamu-hj-copy').onclick = event => {
      const url = hjPlayer?.url;
      if (!url) return;
      if (typeof GM_setClipboard === 'function') GM_setClipboard(url);
      event.currentTarget.textContent = '已复制';
    };
    box.querySelector('#creamu-hj-debug-copy').onclick = copyHjDebug;
  }
  const index = Math.min(currentHjSelectedVideoIndex, Math.max(0, cache.videos.length - 1));
  const url = cache.videos[index] || '';
  const signature = cache.videos.join('\n') + ':' + index;
  const switcher = box.querySelector('.creamu-hj-switcher');
  if (switcher.dataset.signature !== signature) {
    switcher.dataset.signature = signature;
    switcher.replaceChildren();
    if (cache.videos.length > 1) cache.videos.forEach((_, i) => {
      const button = document.createElement('button');
      button.className = 'creamu-hj-btn creamu-hj-vswitch-btn'; button.type = 'button';
      button.textContent = '视频 ' + (i + 1); button.setAttribute('aria-pressed', String(i === index));
      button.onclick = () => { currentHjSelectedVideoIndex = i; embedHjUnlockedMediaInline(); };
      switcher.appendChild(button);
    });
  }
  box.querySelector('#creamu-hj-media-count').textContent = cache.videos.length ? cache.videos.length + ' 段视频' : '当前帖子';
  box.querySelector('#creamu-hj-copy').disabled = !url;
  box.querySelector('#creamu-hj-retry').disabled = !!cache.topicLoading;
  box.querySelector('#creamu-hj-play-status').textContent = cache.status || '';
  if (url && (hjPlayer?.url !== url || !hjPlayer.video?.isConnected)) {
    destroyHjPlayer();
    box.querySelector('#creamu-hj-art-mount').replaceChildren();
    try {
      mountHjArtPlayer(url);
    } catch (error) {
      box.querySelector('#creamu-hj-play-status').textContent = '播放器初始化失败，请重新解析。';
      hjDebug(String(error.message || error));
    }
    box.setAttribute('data-video-url', url);
    hjDebug('选用视频 ' + (index + 1));
  }
  renderHjUnlockedImages();
}
