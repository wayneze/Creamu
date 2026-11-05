# Creamu

五款站点增强油猴脚本，覆盖影片与画廊检索、追更、阅读和直播观看。各站保留适合自身的浅色或深色主题；ExH、JLC、Scout、FC2 共用可随时呼出的控制台，桌面支持并排比对，窄屏适配底部面板。

## 安装与使用

先安装 [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/)，再点击对应的「安装」。脚本名称链接到详细使用说明。

| 脚本 | 适用站点 | 主要功能 | 安装 |
| --- | --- | --- | --- |
| [ExH](packages/exh-commander/README.md) | E-Hentai / ExHentai | 画廊预览、标签偏好、追更断点、LRR 本地库对照 | [安装](https://raw.githubusercontent.com/wayneze/Creamu/main/packages/exh-commander/dist/creamu-exh.user.js) |
| [JLC · JavLibrary](packages/jlc-commander/README.md) | JavLibrary / JavBus / JavDB / AVMOO 及已适配镜像 | 影片资料与资源整合、熟人库、偏好金框、追更与 Emby 在库比对 | [安装](https://raw.githubusercontent.com/wayneze/Creamu/main/packages/jlc-commander/dist/creamu-jlc.user.js) |
| [Scout](packages/scout-commander/README.md) | XVideos / XNXX / Eporner | 多站搜索比较、词库、收藏、屏蔽与追更 | [安装](https://raw.githubusercontent.com/wayneze/Creamu/main/packages/scout-commander/dist/creamu-scout.user.js) |
| [HJ](packages/hj-commander/README.md) | haijiao.com / haijiao2.com 及其子域 | 桌面与手机阅读界面、悬浮搜索、用户帖子分页排序、详情媒体播放 | [安装](https://raw.githubusercontent.com/wayneze/Creamu/main/packages/hj-commander/dist/creamu-hj.user.js) |
| [FC2 Live](packages/fc2-commander/README.md) | FC2 Live 普通区 / 成人区 | 直播筛选、关注与访问记录、增强播放器、多路同屏 | [安装](https://raw.githubusercontent.com/wayneze/Creamu/main/packages/fc2-commander/dist/creamu-fc2.user.js) |

如果链接只打开代码，请确认脚本管理器已启用，或在其「从 URL 安装」中粘贴同一链接。GitHub 文件浏览页不触发安装，需要使用表中的 raw 链接。

从旧名称或旧 namespace 的脚本迁移时，先在旧脚本中导出备份，再安装新版并导入；停用旧脚本，避免重复接管页面。

## 控制台与数据

ExH、JLC、Scout、FC2 的追更、资料库或关注记录都可从悬浮控制台查看，不必离开当前页面。宽屏可停靠在右侧并排比对，也可切换自由浮窗；手机使用适配窄屏的面板。HJ 直接增强原站页面，提供独立的悬浮搜索入口。

四款控制台脚本支持 JSON 备份和 WebDAV 同步，各自使用独立数据文件：

| 脚本 | WebDAV 设置入口 | 默认远端文件 |
| --- | --- | --- |
| ExH | 控制台 → 设置 → 同步 | `/Creamu/exh.vault.json` |
| JLC | 控制台 → 设置 → 服务同步 | `/Creamu/jlc.vault.json` |
| Scout | 控制台 → 设置 → 同步 | `/Creamu/scout.vault.json` |
| FC2 | 设置 → WebDAV 同步 | `/Creamu/fc2.vault.json` |

填写服务地址、用户名、应用密码与远端目录，测试连接后执行一次手动同步；需要自动同步时再开启相应选项。HJ 暂无 WebDAV 同步。

坚果云配置示例：

| 项目 | 值 |
| --- | --- |
| 服务地址 | `https://dav.jianguoyun.com/dav/` |
| 用户名 | 坚果云注册邮箱 |
| 密码 | 账号安全中生成的应用密码 |
| 目录 | `/Creamu`，也可自行修改 |

也支持 Nextcloud、群晖等兼容 WebDAV 的服务。目录无法自动创建或返回 403 时，先检查远端目录、账号权限与服务流量限制。

## 开发

以下命令均在仓库根目录执行，推荐 Node.js 22 或 24（与 CI 一致）。

```bash
npm ci
npm run build
```

单独构建使用 `npm run build:exh`、`build:jlc`、`build:scout`、`build:hj` 或 `build:fc2`。

```text
packages/
  exh-commander/     ExH
  jlc-commander/     JLC
  scout-commander/   Scout
  hj-commander/      HJ
  fc2-commander/     FC2 Live
  shared/           控制台样式、几何、交互与 WebDAV
scripts/            共享构建器、仓库与产物校验、测试入口
tests/              核心回归、浏览器场景及本地 fixtures
```

包清单由根 `package.json` 的 `workspaces` 维护。各包的 `src/parts.manifest.json` 定义源码顺序、共享模块注入与产物路径；修改 `src/parts` 或 `packages/shared` 后重新构建，不直接编辑生成的 `dist/*.user.js`。源码与对应 dist 一起提交，安装链接使用 dist。

[共享模块说明](packages/shared/README.md) 定义四款控制台共用的样式、位置约束、拖动与缩放接口；产品包负责页面内容、数据存储和主题扩展。

## 验证

```bash
npm run check
npx playwright install chromium
npm run test:e2e
```

| 命令 | 检查范围 |
| --- | --- |
| `npm run check` | 仓库规则、五包构建、版本一致性、核心回归 |
| `npm run test:e2e` | 构建、产物一致性、控制台与页面浏览器回归 |
| `npm run check:dist` | 按当前 manifest 重组源码，与已生成的 dist 比较；不修改产物 |
| `npm run check:metadata` | 包版本、源码头部与 dist 头部的版本一致性 |

浏览器测试使用本地 fixtures 和模拟响应。真实站点登录、付费观看、移动浏览器及油猴沙箱兼容性需在对应环境验收，不能由本地回归替代。

## License

[MIT](LICENSE)
