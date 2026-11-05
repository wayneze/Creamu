# Creamu 共享模块

ExH、JLC、Scout、FC2 通过各包 `src/parts.manifest.json` 的 `injectAfter` 注入以下模块。修改共享模块后在仓库根目录运行 `npm run build`，同步四款脚本的 dist；`npm run test:e2e` 包含共享控制台浏览器回归。

## `creamu-workbench-css.js`

提供 `getCreamuWorkbenchCss()` 与 `injectCreamuWorkbenchStyles()`，统一控制台壳层。颜色使用作用域内的 `--creamu-wb-*` CSS 变量，产品扩展样式通过 `extraCss` 传入。

## `creamu-workbench-geometry.js`

负责面板矩形、拖动、缩放与悬浮按钮的位置约束，确保操作区域位于可用视口内。

## `creamu-workbench-interactions.js`

统一悬浮按钮、面板拖动与缩放的 pointer / mouse 事件。产品包提供渲染与位置持久化回调。

## `creamu-webdav.js`

提供 `createCreamuWebDavSync()`，处理各产品独立 vault 文件的 WebDAV 同步；产品包负责数据导出、合并与配置接线。
