# Creamu · Scout

欧美发现工作台油猴脚本，适配 **xvideos / xnxx / eporner**。

产物：[`creamu-scout.user.js`](dist/creamu-scout.user.js)。

## 功能

1. **搜索**：输入后直接搜索当前站；“必须有 / 更喜欢 / 不要”区分硬条件与偏好，普通浏览只过滤违反硬条件的已核验作品。需要时展开“比较三站”，查看结果量、精确样本与逐词命中；仍可选择只看全部条件同时命中。
2. **词库**：详情的“用标签搜索 / 收藏”面板支持加入搜索、收藏、心动、分类 / 中文备注及屏蔽；原生标签仍可直接跳转。
3. **屏蔽**：整词（默认）或子串；范围标题 / 上传者 / 两者；弱淡化或强隐藏。
4. **追更断点**：收藏搜索条件，列表上方直接定位或继续；仅打开作品时记页码，预览、滑动、发布者链接不记断点；同一配方的多站订阅折叠，续看优先当前站并带上筛选条件。
5. **详情与收藏**：标题下统一放置收藏、标签和控制台入口；收藏与更新共用同一动作。控制台持续显示当前作品摘要，切换搜索 / 追更 / 收藏仍可比对，一键返回影片。手机折叠标签时保留发布者；封面可缓存为 data URL。
6. **独立预览按钮**（xv/xnxx）：封面始终进入详情；预览失败可继续点封面。Eporner 没有可靠预览源时不显示按钮。
7. **随时呼出的控制台**：搜索 / 追更 / 收藏为主导航，词库 / 熟人 / 屏蔽收进管理。桌面支持停靠和浮窗；手机使用半屏抽屉，编辑时展开，关闭再开保留草稿和滚动位置，全屏播放时隐藏。
8. **已点灰显**、站点协调配色、WebDAV 同步与 JSON 导入导出。XVideos 使用柔和浅色，XNXX / Eporner 使用深色。

搜索筛选保存在当前 URL 的 hash 中，支持最多 16 个条件、每个 96 字；核验失败的作品保留可见。手机浏览器地址栏和键盘适配使用 `visualViewport`，仍需结合实际浏览器与脚本管理器验收。

## 源码结构

`src/parts` 按 `parts.manifest.json` 拼接；`18-webdav.js` 之后注入 monorepo shared（工作台 CSS、几何/交互和 WebDAV）。

| 文件 | 职责 |
|------|------|
| `00-header.meta.js` | 元数据与 IIFE 开头 |
| `10-core.js` | 公共文本、匹配和基础工具 |
| `12-library-state.js` | 词库、屏蔽词、熟人和作品状态 |
| `14-tracking-state.js` | 追更、配置和已点片库 |
| `15-search-recipes.js` | 搜索配方、查询计划、命中评估与临时过滤 URL |
| `16-data-portability.js` | JSON 导入导出与合并 |
| `18-webdav.js` | WebDAV 状态同步接线 |
| `20-sites.js` | 三站适配与分页 |
| `21-search-runtime.js` | 站点查询、结果量读取与详情样本核验 |
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
| `37-exact-search-filter.js` | 当前搜索页的硬条件 / 全部同时命中核验与临时过滤 |
| `38-settings.js` | 设置页与导入导出入口 |
| `40-workbench-shell.js` | 工作台壳层与共享样式接线 |
| `42-tracking-runtime.js` | 搜索追更断点交互 |
| `44-preview-runtime.js` | 列表手动预览与站点预览拦截 |
| `46-detail-runtime.js` | 详情全屏手势 |
| `48-page-lifecycle.js` | 页面变化检测与增强调度 |
| `50-boot.js` | 启动装配 |

## 构建与测试

在仓库根目录执行：

```bash
npm run build:scout
npm run check
npm run test:e2e
```

浏览器环境见[仓库开发说明](../../README.md#验证)。

设置页可导出 `creamu-scout-ai`（词库+屏蔽）或完整备份 `creamu-scout-lexicon` v3。
