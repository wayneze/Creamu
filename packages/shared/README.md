# Creamu shared modules

## `creamu-workbench-css.js`

Provides `getCreamuWorkbenchCss()` and `injectCreamuWorkbenchStyles()` for the workbench shell. Colors use the scoped `--creamu-wb-*` custom properties, and product styles are supplied through `extraCss`.

## `creamu-workbench-geometry.js`

Provides viewport-safe rectangle, movement, resizing, and floating-button calculations for workbench implementations.

## `creamu-workbench-interactions.js`

Provides shared pointer/mouse bindings for the floating button, panel dragging, and panel resizing. Product code supplies persistence and rendering callbacks.

## `creamu-webdav.js`

Provides `createCreamuWebDavSync()` for product vault synchronization.
