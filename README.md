# 词屿官网（静态站）

纯静态 HTML/CSS/JS，没有构建步骤、没有后端。线上地址：

- **<https://1752370874-blip.github.io/wordisle/>**（GitHub Pages，由本仓库的 `gh-pages` 分支发布）

## 本地预览

```bash
cd site
python -m http.server 8080
# 打开 http://localhost:8080
```

## 目录

```
site/
├─ index.html        首页（含「点击此处下载」下载区）
├─ styles.css        样式
├─ config.js         下载链接 / 仓库链接 / 邮箱 / 备案号（只改这里）
├─ site.js           小脚本（年份、下载按钮、联系方式、备案号）
├─ assets/           favicon、截图（webp）、OG 分享图
├─ DEPLOY-CN.md      部署说明（GitHub Pages 主用 + 国内托管备选）
├─ robots.txt
├─ sitemap.xml
└─ 404.html
```

## 下载按钮怎么连到 GitHub Releases

`config.js` 里只有一个关键字段：

```js
winDownload: 'https://github.com/1752370874-blip/wordisle/releases/latest/download/WordIsle-Enhanced-Setup-3.9.3.exe'
```

- `latest/download/<文件名>` 是 GitHub 的固定跳转链接：永远指向**最新的正式 Release**，所以页面上的「点击此处下载」不需要跟着版本号改地址。
- 发新版本时：上传新 Release → 如果文件名变了，只改 `config.js` 的这一行 → 重新发布 `gh-pages`。
- 直链失效（比如文件名写错）时，`site.js` 会退回到 `winDownloadFallback`（Releases 列表页）。

## 发布官网到 GitHub Pages

1. 修改 `site/` 里的文件；
2. 把 `site/` 的内容推到本仓库的 `gh-pages` 分支（根目录就是站点根目录）；
3. GitHub Pages 会自动重建（约 30–60 秒），刷新 <https://1752370874-blip.github.io/wordisle/> 即可。

用本机脚本发布（需要本机已登录过 GitHub，凭据在 Windows 凭据管理器里）：

```powershell
python scripts/publish_github.py --site-only
```

## 国内访问备选

`*.github.io` 在大陆可能偏慢。可以把这个目录原样上传到任意静态托管（腾讯云 EdgeOne、阿里云 OSS、Cloudflare Pages 等），**页面代码不用改**，只要 `config.js` 里仍然指向 GitHub Releases 的下载直链——安装包还是从 GitHub 分发，网站只是换个壳。详见 [DEPLOY-CN.md](DEPLOY-CN.md)。

## 隐私与统计

站点本身不收集数据、没有 cookie、没有第三方统计脚本。
