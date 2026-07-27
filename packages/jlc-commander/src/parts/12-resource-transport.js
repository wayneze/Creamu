// @@creamu-part:12-resource-transport
    async function requestPage(url, extra = {}) {
        return new Promise(resolve => {
            let settled = false;
            const finish = (result) => {
                if (settled) return;
                settled = true;
                resolve(result);
            };
            const failed = (error) => ({
                ok: false,
                status: 0,
                responseText: '',
                finalUrl: url,
                error
            });
            const options = Object.assign({}, extra, {
                method: extra.method || 'GET',
                url,
                timeout: extra.timeout === undefined ? 15000 : extra.timeout,
                onload: (res) => finish({
                    ok: Number(res?.status || 0) >= 200 && Number(res?.status || 0) < 400,
                    status: Number(res?.status || 0),
                    responseText: String(res?.responseText || ''),
                    finalUrl: res?.finalUrl || url,
                    error: ''
                }),
                onerror: () => finish(failed('network')),
                ontimeout: () => finish(failed('timeout')),
                onabort: () => finish(failed('abort'))
            });
            try {
                GM_xmlhttpRequest(options);
            } catch (_) {
                finish(failed('network'));
            }
        });
    }

    async function requestText(url, extra = {}) {
        const result = await requestPage(url, extra);
        return result.ok ? (result.responseText || '') : '';
    }

    function sanitizeBrowserFetchHeaders(headers = {}) {
        const sanitized = Object.assign({}, headers || {});
        const referrer = sanitized.Referer || sanitized.referer || '';
        delete sanitized.Referer;
        delete sanitized.referer;
        return {
            headers: Object.keys(sanitized).length ? sanitized : undefined,
            referrer: compactText(referrer || '')
        };
    }

    function isLikelyBotGuardResponse(text = '') {
        const normalized = compactText(String(text || '')).toLowerCase();
        if (!normalized) return false;
        return /(performing security verification|enable javascript and cookies to continue|attention required|cf-browser-verification|just a moment|why have i been blocked|checking if the site connection is secure|\b403 forbidden\b)/i.test(normalized);
    }

    async function requestPageWithHiddenFrame(url, extra = {}) {
        const target = parseTrackingUrl(url, location.href);
        const current = parseTrackingUrl(location.href, location.href);
        if (!target || !current || target.origin !== current.origin || String(extra.method || 'GET').toUpperCase() !== 'GET') {
            return requestPage(url, extra);
        }
        const mountHost = document.body || document.documentElement;
        if (!mountHost) return requestPage(url, extra);
        const timeout = Number(extra.timeout || 0) || 15000;
        return new Promise(resolve => {
            let settled = false;
            const iframe = document.createElement('iframe');
            iframe.setAttribute('aria-hidden', 'true');
            iframe.tabIndex = -1;
            iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;border:0;';
            const finalize = (result) => {
                if (settled) return;
                settled = true;
                if (timer) window.clearTimeout(timer);
                iframe.removeEventListener('load', onLoad);
                iframe.removeEventListener('error', onError);
                iframe.remove();
                resolve(result);
            };
            const onLoad = () => {
                try {
                    const frameWindow = iframe.contentWindow;
                    const frameDoc = iframe.contentDocument || frameWindow?.document;
                    const finalUrl = compactText(frameWindow?.location?.href || iframe.src || target.href) || target.href;
                    const responseText = frameDoc?.documentElement?.outerHTML || '';
                    const blocked = isLikelyBotGuardResponse(responseText);
                    finalize({
                        ok: !!responseText && !blocked,
                        status: blocked ? 403 : 200,
                        responseText,
                        finalUrl,
                        error: blocked ? 'forbidden' : ''
                    });
                } catch (error) {
                    finalize({ ok: false, status: 0, responseText: '', finalUrl: target.href, error: 'network' });
                }
            };
            const onError = () => finalize({ ok: false, status: 0, responseText: '', finalUrl: target.href, error: 'network' });
            const timer = window.setTimeout(() => {
                finalize({ ok: false, status: 0, responseText: '', finalUrl: target.href, error: 'timeout' });
            }, timeout);
            iframe.addEventListener('load', onLoad);
            iframe.addEventListener('error', onError);
            mountHost.appendChild(iframe);
            iframe.src = target.href;
        });
    }

    async function requestPageWithBrowserFetch(url, extra = {}) {
        const target = parseTrackingUrl(url, location.href);
        const current = parseTrackingUrl(location.href, location.href);
        if (!target || !current || target.origin !== current.origin || String(extra.method || 'GET').toUpperCase() !== 'GET') {
            return requestPage(url, extra);
        }
        const timeout = Number(extra.timeout || 0) || 15000;
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? window.setTimeout(() => controller.abort(), timeout) : null;
        const prepared = sanitizeBrowserFetchHeaders(extra.headers || {});
        let fetchResult = null;
        try {
            const response = await fetch(target.href, {
                method: 'GET',
                credentials: 'include',
                redirect: 'follow',
                cache: 'no-store',
                headers: prepared.headers,
                referrer: prepared.referrer || undefined,
                signal: controller?.signal
            });
            const responseText = await response.text();
            fetchResult = {
                ok: response.ok && !isLikelyBotGuardResponse(responseText),
                status: response.status || 0,
                responseText: responseText || '',
                finalUrl: response.url || target.href,
                error: ''
            };
        } catch (error) {
            const message = String(error?.name || error?.message || '').toLowerCase();
            fetchResult = {
                ok: false,
                status: 0,
                responseText: '',
                finalUrl: target.href,
                error: message.includes('abort') ? 'timeout' : 'network'
            };
        } finally {
            if (timer) window.clearTimeout(timer);
        }
        const shouldTryHiddenFrame = !fetchResult.ok
            || !fetchResult.responseText
            || fetchResult.status === 401
            || fetchResult.status === 403
            || isLikelyBotGuardResponse(fetchResult.responseText);
        if (!shouldTryHiddenFrame) return fetchResult;
        const frameResult = await requestPageWithHiddenFrame(target.href, extra);
        if (frameResult.ok && frameResult.responseText) return frameResult;
        const gmResult = await requestPage(url, extra);
        if (gmResult.ok && gmResult.responseText && !isLikelyBotGuardResponse(gmResult.responseText)) return gmResult;
        if (fetchResult.ok && fetchResult.responseText && !isLikelyBotGuardResponse(fetchResult.responseText)) return fetchResult;
        return frameResult.status ? frameResult : (gmResult.status ? gmResult : fetchResult);
    }

    async function probeMediaUrl(url) {
        const head = await requestPage(url, { method: 'HEAD', timeout: 7000 });
        if (head.ok) {
            return { ok: true, status: head.status || 200, state: 'ok', note: describeRequestStatus(head, 'HTTP 200') };
        }
        const range = await requestPage(url, { method: 'GET', timeout: 7000, headers: { Range: 'bytes=0-0' } });
        if (range.ok || range.status === 206) {
            return { ok: true, status: range.status || 206, state: 'ok', note: describeRequestStatus(range, 'HTTP 206') };
        }
        const failed = range.status ? range : head;
        const state = failed.status === 403 ? 'blocked' : (failed.status === 404 ? 'empty' : 'error');
        return { ok: false, status: failed.status || 0, state, note: describeRequestStatus(failed) };
    }

    async function headRequestOK(url) {
        return (await probeMediaUrl(url)).ok;
    }
