import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createContext, runInContext } from 'node:vm';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'packages/shared/creamu-workbench-css.js'), 'utf8');
const scoutThemeSources = [
  '25-theme.js',
  '27-page-enhancement-theme.js',
  '29-site-layout-theme.js',
].map((filename) => ({
  filename,
  source: fs.readFileSync(
    path.join(root, 'packages/scout-commander/src/parts', filename),
    'utf8'
  ),
}));
const scoutSiteThemeSource = fs.readFileSync(
  path.join(root, 'packages/scout-commander/src/parts/26-site-theme.js'),
  'utf8'
);
const exhPartsRoot = path.join(root, 'packages/exh-commander/src/parts');
const exhManifest = JSON.parse(
  fs.readFileSync(path.join(root, 'packages/exh-commander/src/parts.manifest.json'), 'utf8')
);
const workbenchTemplateSources = {
  exh: exhManifest.parts
    .filter((filename) => /^7\d-workbench(?:-|\.)/.test(filename))
    .map((filename) => fs.readFileSync(path.join(exhPartsRoot, filename), 'utf8'))
    .join('\n'),
  jlcTracking: fs.readFileSync(
    path.join(root, 'packages/jlc-commander/src/parts/21-workbench-tracking.js'),
    'utf8'
  ),
  jlcSettings: fs.readFileSync(
    path.join(root, 'packages/jlc-commander/src/parts/22-workbench-settings.js'),
    'utf8'
  ),
  jlcShell: fs.readFileSync(
    path.join(root, 'packages/jlc-commander/src/parts/23-workbench-shell.js'),
    'utf8'
  ),
};

function collectInlineStyleAttributes(templateSource) {
  return Array.from(templateSource.matchAll(/\bstyle=(["'])(.*?)\1/g), (match) => match[2]);
}

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
  assert.ok(css.includes('#jlc-wb .jlc-wb-view-block {'));
  assert.ok(css.includes('#jlc-wb .jlc-wb-view-title {'));
  assert.ok(css.includes('#jlc-wb .stat-box {'));
  assert.ok(css.includes('#jlc-wb .stat-item b {'));
  [
    '.jlc-wb-footer-actions {',
    '.jlc-wb-toolbar-note {',
    '.legacy-note.jlc-wb-intro-note,',
    '.jlc-wb-form-actions {',
    '.jlc-wb-field-grid {',
    '.jlc-wb-block-action,',
    '.legacy-note.jlc-wb-data-report {',
  ].forEach((selector) => {
    assert.ok(css.includes(selector), 'missing shared workbench component: ' + selector);
  });
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
  scoutThemeSources.forEach(({ filename, source: themeSource }) => {
    runInContext(themeSource, context, { filename });
  });
  const css = context.getScoutThemeCss();
  const workbenchCss = context.getScoutWorkbenchThemeCss();
  const pageEnhancementCss = context.getScoutPageEnhancementThemeCss();
  const siteLayoutCss = context.getScoutSiteLayoutThemeCss();
  assert.equal(css, workbenchCss + pageEnhancementCss + siteLayoutCss);
  assert.ok(
    workbenchCss.includes('#jlc-wb [data-jlc-wb-page="combo"] > .scout-combo-dock {')
  );
  assert.ok(pageEnhancementCss.includes('.scout-breakpoint-highlight {'));
  assert.ok(pageEnhancementCss.includes('.scout-work-fav-bar {'));
  assert.ok(siteLayoutCss.includes('body.creamu-site-xvideos .mozaique .thumb-block'));
  assert.ok(siteLayoutCss.includes('@media (max-width: 820px)'));
  assert.ok(css.includes('--creamu-wb-accent: var(--scout-theme-color)'));
  assert.ok(css.includes('--creamu-wb-accent-dark: var(--scout-theme-dark)'));
  assert.ok(css.includes('--creamu-wb-accent-ring: var(--scout-theme-shadow)'));
  assert.ok(css.includes('#jlc-wb-fab {'), 'Scout keeps its product-specific FAB visibility layer');
  assert.ok(css.includes('#jlc-wb .scout-combo-dock-actions .jlc-wb-btn {'));
  [
    '#jlc-wb .jlc-wb-nav button,',
    '#jlc-wb .jlc-wb-btn.primary {',
    '#jlc-wb .jlc-wb-chip {',
    '#jlc-wb .jlc-wb-icon-btn {',
    '#jlc-wb .jlc-wb-open-btn {',
    '#jlc-wb .jlc-wb-more-btn {',
    '#jlc-wb .jlc-wb-view-block {',
    '#jlc-wb .jlc-wb-view-title {',
    '#jlc-wb .stat-box {',
    '#jlc-wb .stat-item {',
  ].forEach((selector) => {
    assert.ok(!css.includes(selector), 'Scout should inherit shared base selector: ' + selector);
  });
  assert.ok(
    css.includes('#jlc-wb .jlc-wb-nav button {'),
    'Scout keeps the mobile-only navigation sizing rule'
  );
  assert.equal(
    (css.match(/#jlc-wb \.jlc-wb-btn \{/g) || []).length,
    1,
    'Scout should only retain the mobile button sizing rule'
  );
  assert.match(
    css,
    /@media \(max-width: 820px\)[\s\S]*#jlc-wb \.jlc-wb-btn \{\s*min-height: 40px !important;/
  );
  console.log('  OK  Scout maps tokens without copying shared base components');
}

{
  const context = createContext({});
  runInContext(scoutSiteThemeSource, context, { filename: '26-site-theme.js' });
  const css = context.getScoutSitePageThemeCss();
  assert.ok(css.includes('button:where(:not(#jlc-wb *))'));
  assert.ok(css.includes(
    'input[type="text"]:where(:not(#jlc-wb *)):where(:not(#scout-collect-dialog *))'
  ));
  assert.ok(!css.includes('html.scout-cream-site #jlc-wb input'));
  [
    'html.scout-cream-site #jlc-wb .jlc-wb-nav button',
    'html.scout-cream-site #jlc-wb .jlc-wb-btn',
    'html.scout-cream-site #jlc-wb .jlc-wb-chip',
    'html.scout-cream-site #jlc-wb .jlc-wb-open-btn',
  ].forEach((selector) => {
    assert.ok(!css.includes(selector), 'site theme should not restyle workbench components: ' + selector);
  });
  console.log('  OK  Scout site theme isolates native controls from the workbench');
}

{
  assert.deepEqual(
    collectInlineStyleAttributes(workbenchTemplateSources.exh),
    [],
    'ExH workbench templates should keep static presentation in CSS'
  );
  assert.deepEqual(
    collectInlineStyleAttributes(workbenchTemplateSources.jlcSettings),
    [],
    'JLC settings templates should keep static presentation in CSS'
  );
  assert.deepEqual(
    collectInlineStyleAttributes(workbenchTemplateSources.jlcShell),
    [],
    'JLC shell templates should keep static presentation in CSS'
  );
  assert.deepEqual(
    collectInlineStyleAttributes(workbenchTemplateSources.jlcTracking),
    ["height:' + row.height + 'px", "min-height:' + row.height + 'px"],
    'JLC tracking should only inline measured virtual-row geometry'
  );
  console.log('  OK  ExH and JLC templates keep presentation styles at the theme boundary');
}

console.log('Shared workbench style tests passed (7)');
