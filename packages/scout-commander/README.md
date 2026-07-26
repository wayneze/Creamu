# Creamu · Scout

欧美发现工作台油猴脚本，适配 **xvideos / xnxx / eporner**。

## 功能

1. **组合搜索**：多词槽位 + 词库点选，可选 `and` / 空格 / `or` 连接，一键跳转引擎。
2. **词库**：页面标签采集、分类 / 中文 / 心动、热度与废弃。
3. **屏蔽**：整词（默认）或子串；范围标题 / 上传者 / 两者；弱淡化或强隐藏。
4. **追更断点**：收藏搜索 query；列表点片记页码；同词多站在 UI 折叠，续看优先当前站。
5. **作品收藏**：详情一键入库 + 采标签库；封面可缓存为 data URL。
6. **已点灰显**、列表预览（xv/xnxx）、WebDAV 同步与 JSON 导入导出。

## 源码结构

`src/parts` 按 `parts.manifest.json` 拼接；`18-webdav.js` 之后注入 monorepo shared（工作台 CSS、几何/交互和 WebDAV）。

| 文件 | 职责 |
|------|------|
| `00-header.meta.js` | 元数据与 IIFE 开头 |
| `10-core.js` | 公共文本、匹配和基础工具 |
| `12-library-state.js` | 词库、屏蔽词、熟人和作品状态 |
| `14-tracking-state.js` | 追更、配置和已点片库 |
| `16-data-portability.js` | JSON 导入导出与合并 |
| `18-webdav.js` | WebDAV 状态同步接线 |
| `20-sites.js` | 三站适配与分页 |
| `25-theme.js` | 主题装配、配色 token 与工作台扩展样式 |
| `26-site-theme.js` | 三站页面主题 |
| `27-page-enhancement-theme.js` | 详情标签、收藏、预览和屏蔽状态样式 |
| `29-site-layout-theme.js` | 三站列表卡片与响应式布局样式 |
| `30-page-enhancements.js` | 工作台几何、采集对话框和标签流 HTML |
| `31-list-enhancements.js` | 列表屏蔽、已点和词库标签流 |
| `32-combo-page.js` | 组合搜索页 |
| `33-detail-enhancements.js` | 详情标签、作品收藏和熟人按钮 |
| `34-library-pages.js` | 词库、发布者与作品页 |
| `35-search-enhancements.js` | 搜索追更入口 |
| `36-tracking-page.js` | 追更与屏蔽列表页 |
| `38-settings.js` | 设置页与导入导出入口 |
| `40-workbench-shell.js` | 工作台壳层与共享样式接线 |
| `42-tracking-runtime.js` | 搜索追更断点交互 |
| `44-preview-runtime.js` | 列表手动预览与站点预览拦截 |
| `46-detail-runtime.js` | 详情全屏手势 |
| `48-page-lifecycle.js` | 页面变化检测与增强调度 |
| `50-boot.js` | 启动装配 |

## 构建与测试

```bash
npm run test
npm run build
npm run check
```

产物：`dist/creamu-scout.user.js`。

设置页可导出 `creamu-scout-ai`（词库+屏蔽）或完整备份 `creamu-scout-lexicon` v3。
