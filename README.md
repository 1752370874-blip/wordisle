<div align="center">

<img src="site/assets/favicon.png" width="76" alt="词屿 logo">

# 词屿 · Word Isle

**每天一点，词自成屿。**

离线可用的英语学习桌面应用 · Windows 10 / 11 (x64) · 无需注册 · 数据只留在本机

[![官方网站](https://img.shields.io/badge/%E5%AE%98%E6%96%B9%E7%BD%91%E7%AB%99-wordisle-2f6f63?style=for-the-badge)](https://1752370874-blip.github.io/wordisle/)
[![点击此处下载](https://img.shields.io/badge/%E2%AC%87%20%E7%82%B9%E5%87%BB%E6%AD%A4%E5%A4%84%E4%B8%8B%E8%BD%BD-v3.9.3%20Enhanced-f0a05a?style=for-the-badge)](https://1752370874-blip.github.io/wordisle/#download)
[![GitHub Release](https://img.shields.io/github/v/release/1752370874-blip/wordisle?label=GitHub%20Release&style=for-the-badge)](https://github.com/1752370874-blip/wordisle/releases/latest)

</div>

---

## ⬇ 下载

| 入口 | 说明 |
| --- | --- |
| **[点击此处下载（官网下载区）](https://1752370874-blip.github.io/wordisle/#download)** | 官方站点下载入口，页面里的「点击此处下载」按钮直接从这里取最新安装包 |
| [GitHub 直链下载](https://github.com/1752370874-blip/wordisle/releases/latest/download/WordIsle-Enhanced-Setup-3.9.3.exe) | `releases/latest/download/...` 固定链接，永远指向最新版本的安装包 |
| [全部版本 / 更新说明](https://github.com/1752370874-blip/wordisle/releases) | Release 列表，含历史版本与校验信息 |

> 安装包约 127 MB，**只通过 GitHub Releases 分发**（Git 仓库单文件上限 100 MB，所以二进制不进 Git 历史）。
> 官网下载按钮与 `site/config.js` 里的 `winDownload` 都指向同一个 Release 直链，改版本时只需要改这一处。

安装：下载 `WordIsle-Enhanced-Setup-3.9.3.exe` → 双击 → 一路下一步 → 桌面出现「词屿」图标。
默认装到 `%LOCALAPPDATA%\Programs\词屿`，不需要管理员权限；卸载不会删除学习记录。

---

## 本次版本：v3.9.3 Enhanced

在 3.9.2 的基础上新增 **文章词汇地图**，其余功能保持原样。

- **文章词汇地图**：侧栏新增入口。粘贴任意英文文章 → 「生成词汇地图」，绿色 = 该词形在本机有练习记录，橙色 = 没有记录；同时给出「练习记录覆盖率」与不同词形数量。
- **统计口径说明**：按原词形精确匹配，不推断词形变化；「练习过」不等于「已经掌握」，「没有记录」也不等于「不认识」。
- **隐私**：粘贴的文章只在本进程内存中分析，关闭程序即丢弃，不写入数据文件、不参与备份同步、不发网络请求；单次最多 20,000 字符。
- 其余改动：导航顺序、样式与桌面主进程同步更新；`data/` 九本词库与阅读数据与 3.9.2 完全一致。

完整说明见 [docs/使用说明-3.9.3.md](docs/使用说明-3.9.3.md)。

---

## 功能

- **九本词库**：CET-4 / CET-6 / 考研 / 雅思 / 托福 / GRE + 牛津 3000 / 5000 + 柯林斯五星，28,497 词条，SM-2 间隔重复。
- **65,000 词本地词典**：输入即查，中英互查，音标 / 词性 / 释义 / 例句离线可用。
- **外刊与每日新闻**：52 篇双语精读 + 每天自动刷新的 NASA 新闻；点词查义、整篇朗读、进度可拖。
- **三音源朗读**：单词用有道美音/英音，整句用微软在线神经语音或百度翻译，断网自动回退系统语音。
- **五种练法 + 小测**：翻卡、四选一、例句填空、拼写、听写；连续打卡、斩词、错词本、统计。
- **文章词汇地图**（3.9.3 新增）。
- **液态玻璃界面**：浅色纸感 + 发丝高光，GPU 合成下约 160fps，可在设置里关闭。

![首页](shots/01-home.png)

---

## 仓库结构

```
wordisle/
├─ index.html / app.js / styles.css / preload.js   前端（渲染层，纯 HTML/CSS/JS）
├─ main.js                                          Electron 主进程（窗口、朗读、新闻抓取）
├─ splash.html / splash-logo.png                    启动闪屏
├─ data/                                            九本词库 + 65k 查词词典 + 52 篇阅读
├─ site/                                            官方网站源码（纯静态，无构建步骤）
├─ desktop/                                         打包相关
│  ├─ installer/                                    electron-builder + NSIS 安装包脚本、签名脚本
│  └─ macos-build/                                  macOS DMG/ZIP 构建配置（需在 macOS 上跑）
├─ scripts/                                         词库/词典/阅读数据的构建与校验脚本
├─ shots/                                           README 与文档用截图
├─ docs/                                            应用文档（CSV 导入模板、3.9.3 使用说明）
└─ .github/workflows/build-macos.yml                在 GitHub Actions 的 macOS runner 上出 DMG
```

## 官网

官网是 `site/` 目录下的纯静态页面（`index.html` + `styles.css` + `config.js` + `site.js` + `assets/`），没有构建步骤：

- 线上地址：<https://1752370874-blip.github.io/wordisle/>
- 站点里的「点击此处下载」按钮，链接取自 `site/config.js` 的 `winDownload`：

```js
window.SITE_CONFIG = {
  version: '3.9.3',
  winDownload: 'https://github.com/1752370874-blip/wordisle/releases/latest/download/WordIsle-Enhanced-Setup-3.9.3.exe',
  github: 'https://github.com/1752370874-blip/wordisle'
};
```

本地预览：`cd site && python -m http.server 8123`，打开 <http://127.0.0.1:8123>。
部署方式：把 `site/` 推送到本仓库的 `gh-pages` 分支，GitHub Pages 即以该分支根目录发布；详细步骤见 [site/DEPLOY-CN.md](site/DEPLOY-CN.md)。

> 大陆网络访问 `*.github.io` 可能偏慢。如需国内 CDN，可把 `site/` 目录原样上传到任意静态托管（腾讯云 EdgeOne、阿里云 OSS 等），只改 `config.js` 的下载直链即可，页面代码不用动。

## 本地运行（开发）

```bash
# 仅前端：用静态服务器打开 index.html 即可（需 Electron 才能朗读/抓新闻）
python -m http.server 8000

# 完整桌面应用
cd desktop && npm install
npx electron .
```

## 构建 Windows 安装包

```bash
cd desktop/installer
npm install
node build.mjs        # --dir 打包 → 签名主程序 → makensis 出安装包 → 签名安装包
```

产物在 `desktop/installer/dist/`。安装包使用自签名证书（CN=WordMaster），没有购买 CA 代码签名证书，所以 Windows SmartScreen 可能提示「未知发布者」：点「更多信息 → 仍要运行」即可。

## 构建 macOS 安装包

macOS 包必须在 macOS 上构建（`codesign` / `hdiutil` / 公证只有 macOS 提供）：

```bash
cd desktop/macos-build && ./build-macos.sh    # 需要 Node 20+ 与 Xcode 命令行工具
```

也可以在 GitHub Actions 里手动触发 `.github/workflows/build-macos.yml`，在 `macos-14` runner 上免费产出 DMG。

## 数据与隐私

- 没有账号系统，学习进度、生词本、设置全部保存在本机；
- 不接入统计、广告或第三方追踪脚本；
- 只有「在线朗读」和「每日新闻」需要联网，其余功能完全离线；
- 文章词汇地图粘贴的正文只在内存中处理，关闭即消失。

## 许可与致谢

源码与界面：© 2026 词屿，保留所有权利。公开仓库是为了便于分发、构建与问题反馈，**不代表**允许商业再分发或二次打包发布，详见 [LICENSE](LICENSE)。

词库与语料来自开源项目与公共领域作品（不是牛津词典原文）：

- **ECDICT**（MIT）—— 中文释义与音标数据
- **Oxford 3000 / 5000 公开词表** —— 词头与 CEFR 等级
- **Tatoeba**（CC BY 2.0 FR）与 **WordNet** —— 例句
- **CMUdict** —— 音标转写
- **Project Gutenberg** —— 公版经典选段
- **NASA**（公共领域）—— 每日英语新闻
- **Electron**（MIT）—— 桌面运行时
- **有道 / 百度 / 微软** —— 运行时在线朗读服务（不内置音频）

## 免责与说明

- 3.9.3 Enhanced 是在 3.9.2 安装包基础上重新打包的修改版，**未重新进行可信代码签名**；
- 它沿用原程序的数据路径，可能读取/修改原有学习数据，升级前建议先在原程序里导出备份；
- 这是一个独立文件夹版本，不会自动替换桌面原有快捷方式。
