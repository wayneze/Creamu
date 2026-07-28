import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(
  'packages/scout-commander/src/parts/37-exact-search-filter.js',
  'utf8'
);

function createClassList() {
  const values = new Set();
  return {
    add(...names) {
      names.forEach((name) => values.add(name));
    },
    remove(...names) {
      names.forEach((name) => values.delete(name));
    },
    contains(name) {
      return values.has(name);
    },
  };
}

function createCard(url, title = '') {
  return {
    nodeType: 1,
    classList: createClassList(),
    meta: { url, title: title || url.split('/').pop(), uploader: '', thumb: '' },
  };
}

function createAnchor(href) {
  const attributes = new Map([['href', href]]);
  return {
    getAttribute(name) {
      return attributes.get(name) || '';
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
  };
}

function createHarness() {
  const bodyChildren = [];
  const state = {
    entries: [],
    parsed: null,
    scope: 'xvideos:documentary city walk',
    verifier: async () => ({ evaluation: { exact_match: false } }),
  };
  const location = {
    href: 'https://www.xvideos.com/?k=documentary+and+city+walk#exact',
    hash: '#exact',
  };
  const pagination = createAnchor('/?k=documentary+and+city+walk&p=1');

  function createUiElement() {
    const attributes = new Map();
    const actions = new Map();
    const element = {
      nodeType: 1,
      id: '',
      classList: createClassList(),
      _html: '',
      setAttribute(name, value) {
        attributes.set(name, String(value));
      },
      getAttribute(name) {
        return attributes.get(name) || '';
      },
      querySelector(selector) {
        const match = String(selector).match(/data-scout-exact-action="([^"]+)"/);
        return match ? actions.get(match[1]) || null : null;
      },
      remove() {
        const index = bodyChildren.indexOf(element);
        if (index >= 0) bodyChildren.splice(index, 1);
      },
    };
    Object.defineProperty(element, 'innerHTML', {
      get() {
        return element._html;
      },
      set(value) {
        element._html = String(value);
        actions.clear();
        for (const action of ['retry', 'show-all']) {
          if (!element._html.includes(`data-scout-exact-action="${action}"`)) continue;
          const listeners = new Map();
          actions.set(action, {
            addEventListener(type, handler) {
              listeners.set(type, handler);
            },
            click() {
              listeners.get('click')?.({
                preventDefault() {},
                stopPropagation() {},
              });
            },
          });
        }
      },
    });
    return element;
  }

  const body = {
    get firstChild() {
      return bodyChildren[0] || null;
    },
    insertBefore(element) {
      const existing = bodyChildren.indexOf(element);
      if (existing >= 0) bodyChildren.splice(existing, 1);
      bodyChildren.unshift(element);
    },
  };
  const document = {
    body,
    documentElement: body,
    createElement: createUiElement,
    getElementById(id) {
      return bodyChildren.find((element) => element.id === id) || null;
    },
    querySelectorAll(selector) {
      if (selector === '.pagination a') return [pagination];
      if (
        selector === '[data-scout-exact-original-href]' &&
        pagination.getAttribute('data-scout-exact-original-href')
      ) {
        return [pagination];
      }
      return [];
    },
  };
  const context = vm.createContext({
    console,
    URL,
    Map,
    Set,
    Array,
    Object,
    String,
    Promise,
    document,
    location,
    history: {
      replaceState(_state, _title, href) {
        location.href = String(href);
        location.hash = new URL(location.href).hash;
      },
    },
    detectSite: () => 'xvideos',
    detectPageKind: () => 'search',
    compactText: (value) => String(value || '').replace(/\s+/g, ' ').trim(),
    videoIdFromUrl: (url) => String(url || '').split('/').pop(),
    scoutSearchResultKey: (site, url) => site + ':' + url,
    collectListVideoEntries: () => state.entries.map((element) => ({
      element,
      meta: element.meta,
    })),
    parseScoutExactFilterLocation: () => state.parsed,
    getScoutExactFilterSearchScope: () => state.scope,
    scoutSearchRecipeFingerprint: (recipe) => recipe.marker,
    getLexiconTerms: () => [],
    buildScoutExactFilterUrl(href) {
      const target = new URL(href, location.href);
      target.hash = '#creamu-exact=test';
      return target.href;
    },
    verifyScoutSearchResult: (recipe, result, options) => state.verifier(recipe, result, options),
  });
  vm.runInContext(source, context, { filename: '37-exact-search-filter.js' });
  return { context, document, location, pagination, state };
}

function recipe(marker) {
  return {
    marker,
    sites: ['xvideos'],
    conditions: [{ id: 'required', text: 'documentary', role: 'required', priority: 0 }],
  };
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 20));
  await Promise.resolve();
}

console.log('Scout exact search filter tests');

{
  const { context, document, pagination, state } = createHarness();
  const match = createCard('https://www.xvideos.com/video.match');
  const miss = createCard('https://www.xvideos.com/video.miss');
  const failed = createCard('https://www.xvideos.com/video.fail');
  state.entries = [match, miss, failed];
  state.parsed = { recipe: recipe('first'), scope: state.scope };
  state.verifier = async (_recipe, result, options) => {
    assert.equal(options.recordRelations, false);
    if (result.url.endsWith('.fail')) throw new Error('request failed');
    return { evaluation: { exact_match: result.url.endsWith('.match') } };
  };

  context.applyScoutExactSearchFilter();
  await settle();

  assert.ok(match.classList.contains('scout-exact-filter-match'));
  assert.ok(miss.classList.contains('scout-exact-filter-hidden'));
  assert.ok(failed.classList.contains('scout-exact-filter-failed'));
  assert.ok(!failed.classList.contains('scout-exact-filter-hidden'));
  const bar = document.getElementById('scout-exact-filter-bar');
  assert.match(bar.innerHTML, /保留 1\/3/);
  assert.match(bar.innerHTML, /1 条未能核验/);
  assert.match(pagination.getAttribute('href'), /#creamu-exact=test$/);

  state.parsed = null;
  context.applyScoutExactSearchFilter();
  assert.ok(!match.classList.contains('scout-exact-filter-match'));
  assert.ok(!miss.classList.contains('scout-exact-filter-hidden'));
  assert.ok(!failed.classList.contains('scout-exact-filter-failed'));
  assert.equal(document.getElementById('scout-exact-filter-bar'), null);
  assert.equal(
    pagination.getAttribute('href'),
    '/?k=documentary+and+city+walk&p=1'
  );
  console.log('  OK  exact matches hide only verified non-matches and ordinary searches restore all cards');
}

{
  const { context, location, state } = createHarness();
  const card = createCard('https://www.xvideos.com/video.same');
  state.entries = [card];
  state.parsed = { recipe: recipe('old'), scope: state.scope };
  let resolveOld;
  state.verifier = (activeRecipe) => {
    if (activeRecipe.marker === 'old') {
      return new Promise((resolve) => {
        resolveOld = resolve;
      });
    }
    return Promise.resolve({ evaluation: { exact_match: true } });
  };

  context.applyScoutExactSearchFilter();
  state.parsed = { recipe: recipe('new'), scope: state.scope };
  location.href = 'https://www.xvideos.com/?k=documentary+and+city+walk&p=1#exact';
  context.applyScoutExactSearchFilter();
  await settle();
  assert.ok(card.classList.contains('scout-exact-filter-match'));

  resolveOld({ evaluation: { exact_match: false } });
  await settle();
  assert.ok(card.classList.contains('scout-exact-filter-match'));
  assert.ok(!card.classList.contains('scout-exact-filter-hidden'));
  console.log('  OK  stale detail requests cannot overwrite a newer search page');
}

console.log('Scout exact search filter tests passed (2)');
