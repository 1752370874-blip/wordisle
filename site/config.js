// 词屿官网配置：部署前只需要改这里
// 安装包统一由 GitHub Releases 分发，winDownload 使用 latest 固定直链，
// 以后发新版本时改这里的文件名即可（网站正文不用动）。
window.SITE_CONFIG = {
  version: '3.9.3',

  // Windows 安装包直链（GitHub Releases 的 latest/download 固定链接）
  // 形如：https://github.com/<owner>/<repo>/releases/latest/download/<文件名>
  winDownload: 'https://github.com/1752370874-blip/wordisle/releases/latest/download/WordIsle-Enhanced-Setup-3.9.3.exe',

  // 备用入口：直链失效时跳 Releases 页面，让用户自己选版本
  winDownloadFallback: 'https://github.com/1752370874-blip/wordisle/releases/latest',

  // macOS 安装包（在 Mac 上构建后填这里）
  macDownload: '',

  // GitHub 仓库
  github: 'https://github.com/1752370874-blip/wordisle',

  // 联系邮箱（可选，留空则页脚不显示）
  email: '',

  // 中国大陆服务器备案号（可选，例如 '京ICP备2026000000号-1'）
  icp: ''
};
