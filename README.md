# Creamu

自用奶油系站点增强油猴脚本。

仓库：https://github.com/wayneze/Creamu

非官方、无保证。使用后果自负。

## 一键安装

先安装 [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/)，再点下方绿色 **Install** 徽章（raw 直链，会弹出油猴安装确认）：

| 脚本 | 适用站点 | 安装 | 源文件 |
|------|----------|------|--------|
| **Creamu · ExH** | e-hentai · exhentai | [![Install](https://img.shields.io/badge/Install-userscript-00A86B?style=for-the-badge&logo=tampermonkey&logoColor=white)](https://raw.githubusercontent.com/wayneze/Creamu/main/packages/exh-commander/dist/creamu-exh.user.js) | [`creamu-exh.user.js`](packages/exh-commander/dist/creamu-exh.user.js) |
| **Creamu · JavLibrary** | JavLibrary · JavBus · JavDB · AVMOO 等常见镜像 | [![Install](https://img.shields.io/badge/Install-userscript-00A86B?style=for-the-badge&logo=tampermonkey&logoColor=white)](https://raw.githubusercontent.com/wayneze/Creamu/main/packages/jlc-commander/dist/creamu-jlc.user.js) | [`creamu-jlc.user.js`](packages/jlc-commander/dist/creamu-jlc.user.js) |
| **Creamu · Scout** | xvideos · xnxx · eporner | [![Install](https://img.shields.io/badge/Install-userscript-00A86B?style=for-the-badge&logo=tampermonkey&logoColor=white)](https://raw.githubusercontent.com/wayneze/Creamu/main/packages/scout-commander/dist/creamu-scout.user.js) | [`creamu-scout.user.js`](packages/scout-commander/dist/creamu-scout.user.js) |

也可以直接点这些链接（效果相同）：

- [Install · ExH](https://raw.githubusercontent.com/wayneze/Creamu/main/packages/exh-commander/dist/creamu-exh.user.js)
- [Install · JavLibrary](https://raw.githubusercontent.com/wayneze/Creamu/main/packages/jlc-commander/dist/creamu-jlc.user.js)
- [Install · Scout](https://raw.githubusercontent.com/wayneze/Creamu/main/packages/scout-commander/dist/creamu-scout.user.js)

> **说明**
> - GitHub 的 blob 浏览页**不会**触发安装，必须用 `raw.githubusercontent.com/.../*.user.js`
> - 若点徽章只打开了代码、没有安装窗：确认扩展已启用，或在油猴里用「从 URL 安装」粘贴同一 raw 链接
> - 默认分支写的是 `main`；若不是，请改 URL 中的分支名
> - `dist/*.user.js` 需已推送到 GitHub，否则 raw 会 404

从旧脚本迁移请先导出备份再导入（`@name` / `@namespace` 已更换）。

## WebDAV 同步

设置 → 数据 → WebDAV：填写服务地址、用户名、**应用密码**、远端目录 → 测试连接 → 启用同步。

云端文件默认：`{path}/exh.vault.json`、`{path}/jlc.vault.json`、`{path}/scout.vault.json`（默认 path 为 `/Creamu`）。

### 坚果云示例

| 项 | 值 |
|----|-----|
| 地址 | `https://dav.jianguoyun.com/dav/` |
| 用户名 | 坚果云注册邮箱 |
| 密码 | 账号安全里生成的 **应用密码**（不是登录密码） |
| 路径 | `/Creamu`（可改） |

任意兼容 WebDAV 的服务（Nextcloud、群晖、自建等）均可：改地址与鉴权即可。

## 构建

在根目录下：
```bash
npm run build
```
或者单独构建各个脚本：
```bash
npm run build:exh
npm run build:jlc
npm run build:scout
```

测试与产物校验：
```bash
npm run check
npm run test:e2e
```

`check` 包含仓库规则与公开单元测试；`test:e2e` 包含构建、产物校验和本地浏览器场景。需要单独检查生成文件时可运行 `npm run check:dist`，它会按当前 manifest 重组源码并比较 `dist`，不依赖 Git 工作区是否干净。

浏览器测试使用本地 fixture，不访问真实站点。首次运行前安装 Chromium：

```bash
npx playwright install chromium
```

源码在 `packages/*/src/parts`，构建为单文件 userscript。

## License

MIT
