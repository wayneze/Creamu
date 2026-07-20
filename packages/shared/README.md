# Creamu shared modules

Userscripts concatenate these into both product builds (`exh-commander` / `jlc-commander`).

## `creamu-workbench-css.js`

**Single source of truth for workbench UI (`#jlc-wb` / FAB) colors and layout.**

- Both products call `injectCreamuWorkbenchStyles({ styleId, extraCss? })`.
- Do **not** maintain a second copy of workbench CSS in ExH or JLC.
- ExH may pass `extraCss` for page-only styles (list badges, tracking bar, hover preview, gallery panel).
- Cream **site** theme (whole e-hentai page) stays ExH-only in `getCreamSiteThemeCss()`.

Edit this file when changing workbench look. Rebuild both packages after.

## `creamu-webdav.js`

Shared WebDAV vault sync.
