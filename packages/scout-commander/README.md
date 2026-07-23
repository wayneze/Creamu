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

`src/parts` 按 `parts.manifest.json` 拼接；`10-core.js` 之后注入 monorepo shared（工作台 CSS、WebDAV）。

| 文件 | 职责 |
|------|------|
| `00-header.meta.js` | 元数据与 IIFE 开头 |
| `10-core.js` | 词库 / 屏蔽 / 作品 / 追更 / 已点 / 导入导出 |
| `20-sites.js` | 三站适配与分页 |
| `25-theme.js` | 主题样式 |
| `30-page-enhancements.js` | 页面增强、工作台几何、屏蔽与标签视觉状态 |
| `32-combo-page.js` | 组合搜索页 |
| `34-library-pages.js` | 词库、发布者与作品页 |
| `36-tracking-page.js` | 追更与屏蔽列表页 |
| `38-settings.js` | 设置页与导入导出入口 |
| `40-workbench-shell.js` | 工作台壳层与共享样式接线 |
| `50-boot.js` | 启动、生命周期、预览与详情手势 |

## 构建与测试

```bash
npm run test
npm run build
npm run check
```

产物：`dist/creamu-scout.user.js`。

设置页可导出 `creamu-scout-ai`（词库+屏蔽）或完整备份 `creamu-scout-lexicon` v3。
