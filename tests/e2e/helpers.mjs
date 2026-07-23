import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const testsRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testsRoot, '../..');

export const PATHS = {
  repositoryRoot,
  scoutDist: path.join(repositoryRoot, 'packages/scout-commander/dist/creamu-scout.user.js'),
  exhDist: path.join(repositoryRoot, 'packages/exh-commander/dist/creamu-exh.user.js'),
  jlcDist: path.join(repositoryRoot, 'packages/jlc-commander/dist/creamu-jlc.user.js'),
  jquery: require.resolve('jquery/dist/jquery.min.js'),
  fixtures: path.join(testsRoot, 'fixtures'),
};

export function stripUserscriptMeta(source) {
  return String(source || '').replace(
    /\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==\s*/m,
    ''
  );
}

export function gmMockSource(initialValues = {}) {
  const seed = JSON.stringify(initialValues && typeof initialValues === 'object' ? initialValues : {});
  return `
(function () {
  const store = Object.assign(Object.create(null), ${seed});
  function GM_getValue(key, def) {
    return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : def;
  }
  function GM_setValue(key, value) {
    store[key] = value;
  }
  function GM_addStyle(css) {
    const style = document.createElement('style');
    style.textContent = String(css || '');
    (document.head || document.documentElement).appendChild(style);
    return style;
  }
  function GM_setClipboard() {}
  function GM_openInTab(url) {
    window.open(url, '_blank');
  }
  function GM_download() {}
  function GM_xmlhttpRequest(options) {
    const request = options || {};
    setTimeout(function () {
      if (typeof request.onload === 'function') {
        request.onload({
          status: 404,
          responseText: '',
          finalUrl: request.url || '',
          responseHeaders: '',
        });
      }
    }, 0);
  }
  window.GM_getValue = GM_getValue;
  window.GM_setValue = GM_setValue;
  window.GM_addStyle = GM_addStyle;
  window.GM_setClipboard = GM_setClipboard;
  window.GM_openInTab = GM_openInTab;
  window.GM_download = GM_download;
  window.GM_xmlhttpRequest = GM_xmlhttpRequest;
  window.unsafeWindow = window;
})();
`;
}

function isDocumentRequest(request) {
  return request.resourceType() === 'document';
}

/**
 * Open a site fixture and inject one built userscript into an isolated page.
 * Every request is fulfilled locally so the test never contacts a real site.
 */
export async function openScriptPage(browser, options) {
  if (!browser) throw new TypeError('browser is required');
  const context = await browser.newContext({
    serviceWorkers: 'block',
    viewport: options.viewport || { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push('pageerror: ' + error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push('console: ' + message.text());
  });

  const fixtureHtml = options.fixtureHtml != null
    ? String(options.fixtureHtml)
    : fs.readFileSync(path.join(PATHS.fixtures, options.fixtureFile), 'utf8');
  const scriptBody = stripUserscriptMeta(fs.readFileSync(options.scriptPath, 'utf8'));
  const jqueryBody = options.needJquery
    ? fs.readFileSync(PATHS.jquery, 'utf8')
    : '';
  const host = String(options.host || '').toLowerCase();
  const hostWithoutWww = host.replace(/^www\./, '');
  const allowedHosts = new Set([host, hostWithoutWww, 'www.' + hostWithoutWww]);

  await page.route('**/*', async (route) => {
    const request = route.request();
    let url;
    try {
      url = new URL(request.url());
    } catch (_) {
      return route.abort();
    }
    if (allowedHosts.has(url.hostname.toLowerCase()) && isDocumentRequest(request)) {
      return route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: fixtureHtml,
      });
    }
    return route.fulfill({ status: 204, body: '' });
  });

  try {
    await page.goto('https://' + host + '/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    if (typeof options.beforeInject === 'function') await options.beforeInject(page);
    await page.addScriptTag({ content: gmMockSource(options.gmValues) });
    if (jqueryBody) await page.addScriptTag({ content: jqueryBody });
    if (typeof options.beforeScript === 'function') await options.beforeScript(page);
    await page.addScriptTag({ content: scriptBody });
    return { context, page, runtimeErrors };
  } catch (error) {
    await context.close();
    throw error;
  }
}

export async function waitFab(page, timeout = 15000) {
  const fab = page.locator('#jlc-wb-fab');
  await fab.waitFor({ state: 'visible', timeout });
  return fab;
}

export async function waitWorkbenchOpen(page, timeout = 15000) {
  await page.waitForFunction(
    () => document.getElementById('jlc-wb')?.classList.contains('is-open'),
    null,
    { timeout }
  );
}

export async function waitWorkbenchClosed(page, timeout = 10000) {
  await page.waitForFunction(
    () => !document.getElementById('jlc-wb')?.classList.contains('is-open'),
    null,
    { timeout }
  );
}

export function assertNoRuntimeErrors(runtimeErrors) {
  if (runtimeErrors.length) {
    throw new Error('browser runtime errors:\n' + runtimeErrors.join('\n'));
  }
}
