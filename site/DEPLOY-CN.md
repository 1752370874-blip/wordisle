# 部署说明：GitHub Pages 主站 + 国内托管备选

线上地址：**<https://1752370874-blip.github.io/wordisle/>**

本站没有任何构建步骤，`site/` 目录就是站点根目录。安装包不进仓库，走 GitHub Releases（单文件上限 2 GB，当前安装包 127 MB）。

---

## 一、GitHub Pages（当前使用）

### 原理

- 仓库 `1752370874-blip/wordisle` 的 **`gh-pages` 分支**根目录 = 站点根目录；
- 仓库 **`main` 分支**的 `site/` 目录是站点源码；
- 把 `site/` 的内容发布到 `gh-pages`，GitHub Pages 就会在 30–60 秒内重建站点。

### 手动发布（网页操作，零脚本）

1. 打开 <https://github.com/1752370874-blip/wordisle>；
2. 确认 `main` 分支里的 `site/` 已是最新；
3. 用 GitHub Desktop 或 `git subtree push --prefix site origin gh-pages` 把 `site/` 推到 `gh-pages`；
4. 打开 <https://github.com/1752370874-blip/wordisle/settings/pages> 确认 Source = `gh-pages` / `/(root)`；
5. 等 1 分钟，访问站点地址。

### 脚本发布（本机已登录 GitHub 时）

```powershell
python scripts/publish_github.py --site-only
```

脚本会读取 Windows 凭据管理器里已保存的 GitHub 登录凭据，把 `site/` 整批推送到 `gh-pages`，不需要手工处理 token。

---

## 二、安装包与「点击此处下载」的对接

站点里所有下载按钮的 `href` 由 `site/config.js` 决定：

```js
winDownload: 'https://github.com/1752370874-blip/wordisle/releases/latest/download/WordIsle-Enhanced-Setup-3.9.3.exe'
```

- `releases/latest/download/<文件名>` 是 GitHub 的固定跳转链接，永远指向最新正式 Release；
- 只要新 Release 里的**文件名不变**，就不用改网站；
- 文件名变化时，改上面这一行 → 重新发布 `gh-pages`；
- 直链失效时 `site.js` 会退回到 `winDownloadFallback`（Releases 列表）。

发新版本：

1. 打包安装包；
2. 新建 Release（tag 例如 `v3.9.4`）并上传安装包；
3. 如果文件名变了，改 `site/config.js` 的 `version` 与 `winDownload`；
4. 改 `site/index.html` 里的版本/体积文字（搜索 `127 MB`、`v3.9.3`）；
5. 发布 `gh-pages`。

---

## 三、国内访问备选（可选）

`*.github.io` 在大陆可以访问，但速度一般。国内更快的做法是只换网站外壳、安装包仍留在 GitHub Releases：

| 渠道 | 费用 | 说明 |
| --- | --- | --- |
| 腾讯云 EdgeOne Makers | 免费版永久 | 国内 CDN，默认域名 `*.edgeone.app` 免备案；单文件 25 MB（只放网站，不放假安装包） |
| 阿里云 OSS / 腾讯云 COS + CDN | 按量计费 | 大陆最快；自定义域名需备案 |
| Cloudflare Pages | 免费 | 全球快，大陆默认域名一般 |

步骤（以 EdgeOne 为例）：

1. 把 `site/` 目录**压缩成 zip，`index.html` 必须在 zip 根目录**；
2. EdgeOne 控制台 → 创建项目 → 直接上传 → 拖入 zip；
3. 得到 `https://xxx.edgeone.app` 地址，这就是新的官网入口；
4. 页面代码不用改——`config.js` 里仍指向 GitHub Releases 的下载直链，安装包依旧从 GitHub 分发。

---

## 四、常见问题

- **站点 404？** 检查 Pages 的 Source 是否指向 `gh-pages` / 根目录，以及 `gh-pages` 分支根目录下是否有 `index.html`。
- **CSS/图片 404？** 路径都是相对路径；请从站点根地址访问（`https://…/wordisle/`），不要直接打开子目录。
- **下载按钮没反应？** 打开 `site/config.js` 看 `winDownload` 是否被改坏；或直接访问 Release 页面。
- **大陆打不开？** 先试 `https://ghfast.top/https://github.com/...` 这类镜像下载安装包；网站可迁到 EdgeOne。
- **想统计访问量？** 目前没有统计脚本。需要的话可用 Cloudflare Web Analytics（对大陆加载有轻微影响）。
