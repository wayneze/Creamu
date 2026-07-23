import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createContext, runInContext } from 'node:vm';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'packages/shared/creamu-workbench-css.js'), 'utf8');
const scoutThemeSource = fs.readFileSync(
  path.join(root, 'packages/scout-commander/src/parts/25-theme.js'),
  'utf8'
);

function createDocument(withHead = true) {
  const children = [];
  const writes = { count: 0 };
  const appendChild = (element) => {
    children.push(element);
    return element;
  };
  const documentElement = { appendChild, children };
  return {
    children,
    head: withHead ? { appendChild, children } : null,
    documentElement,
    createElement(tagName) {
      const element = { tagName: String(tagName).toUpperCase(), id: '' };
      let text = '';
      Object.defineProperty(element, 'textContent', {
        get() { return text; },
        set(value) { writes.count += 1; text = String(value); },
      });
      return element;
    },
    getElementById(id) {
      return children.find((element) => element.id === id) || null;
    },
    writes,
  };
}

function loadStyles(document) {
  const context = createContext({ document });
  runInContext(source, context, { filename: 'creamu-workbench-css.js' });
  return context;
}

console.log('Shared workbench styles');

{
  const context = loadStyles(createDocument());
  const css = context.getCreamuWorkbenchCss();
  assert.ok(css.includes('--creamu-wb-bg: #f6efe3'));
  assert.ok(css.includes('--creamu-wb-control-shadow: #e6d3b5'));
  assert.ok(css.includes('--creamu-wb-accent-shadow: rgba(140,90,40,.26)'));
  assert.ok(css.includes('var(--creamu-wb-accent)'));
  assert.ok(css.includes('0 3px 0 var(--creamu-wb-accent-dark)'));
  assert.ok(css.includes('0 0 0 2px var(--creamu-wb-accent-ring)'));
  assert.ok(css.includes('background: var(--creamu-wb-accent-overlay)'));
  assert.ok(css.includes('var(--creamu-wb-border)'));
  assert.match(css, /#jlc-wb\s*\{[^}]*box-sizing:\s*border-box/s);
  assert.ok(css.includes('#jlc-wb-fab.is-panel-open'));
  assert.ok(!css.includes('#jlc-tracking-pagebar.jlc-wb-pagebar .jlc-tracking-pagebar-title'));
  console.log('  OK  theme tokens and shared boundary');
}

{
  const document = createDocument();
  const context = loadStyles(document);
  const first = context.injectCreamuWorkbenchStyles({
    styleId: 'workbench-test-style',
    extraCss: '#product-rule { color: tomato; }',
  });
  const second = context.injectCreamuWorkbenchStyles({
    styleId: 'workbench-test-style',
    extraCss: '#product-rule { color: steelblue; }',
  });

  assert.equal(first, second);
  assert.equal(document.children.length, 1);
  assert.ok(second.textContent.includes('var(--creamu-wb-accent)'));
  assert.ok(second.textContent.includes('color: steelblue'));
  assert.ok(!second.textContent.includes('color: tomato'));
  const writesBeforeRepeat = document.writes.count;
  const third = context.injectCreamuWorkbenchStyles({
    styleId: 'workbench-test-style',
    extraCss: '#product-rule { color: steelblue; }',
  });
  assert.equal(third, second);
  assert.equal(document.writes.count, writesBeforeRepeat, 'unchanged CSS should not rewrite the style node');
  console.log('  OK  idempotent injection and product extension');
}

{
  const document = createDocument(false);
  const context = loadStyles(document);
  const style = context.injectCreamuWorkbenchStyles({ styleId: 'fallback-style' });
  assert.equal(document.documentElement.children[0], style);
  assert.ok(style.textContent.includes('#jlc-wb'));
  console.log('  OK  documentElement fallback');
}

{
  const document = createDocument();
  const context = loadStyles(document);
  const style = context.injectCreamuWorkbenchStyles({
    styleId: 'scoped-style',
    panelSelector: '#product-wb',
    fabSelector: '#product-fab',
    dialogSelector: '#product-dialog',
    pagebarSelector: '#product-pagebar',
    extraCss: '#jlc-wb .product-only { color: tomato; }',
  });
  assert.ok(style.textContent.includes('#product-wb .jlc-wb-header'));
  assert.ok(style.textContent.includes('#product-fab.is-panel-open'));
  assert.ok(style.textContent.includes('#product-dialog .jlc-wb-dialog-card'));
  assert.ok(style.textContent.includes('#product-wb .product-only'));
  assert.ok(!style.textContent.includes('#jlc-wb .product-only'));
  console.log('  OK  configurable selectors include product extensions');
}

{
  const context = createContext({});
  runInContext(scoutThemeSource, context, { filename: '25-theme.js' });
  const css = context.getScoutThemeCss();
  assert.ok(css.includes('--creamu-wb-accent: var(--scout-theme-color)'));
  assert.ok(css.includes('--creamu-wb-accent-dark: var(--scout-theme-dark)'));
  assert.ok(css.includes('--creamu-wb-accent-ring: var(--scout-theme-shadow)'));
  assert.ok(css.includes('background: var(--creamu-wb-surface-muted) !important'));
  assert.ok(css.includes('box-shadow: 0 2px 0 var(--creamu-wb-control-shadow) !important'));
  console.log('  OK  Scout theme maps site colors to shared tokens');
}

console.log('Shared workbench style tests passed (5)');
