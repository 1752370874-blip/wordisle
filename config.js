// 词屿官网配置：部署前只需要改这里
// 主包、绿色版与离线增强包统一由 GitHub Releases 分发，链接用 latest/download 固定直链，
// 以后发新版本时改这里的文件名即可（网站正文里的体积文字同步改一下）。
window.SITE_CONFIG = {
  version: '3.9.56-preview',

  // Windows 安装包（推荐，GitHub Releases 的 latest/download 固定链接）
  installDownload: 'https://github.com/1752370874-blip/wordisle/releases/latest/download/WordIsle-3.9.56-preview-Setup-x64.exe',
  installSize: '492 MB',

  // Windows 绿色版（解压即用）
  winDownload: 'https://github.com/1752370874-blip/wordisle/releases/latest/download/WordIsle-3.9.56-preview-win-x64.zip',
  winSize: '527 MB',

  // 可选离线增强包：GitHub 单文件上限 2 GB，按 1.5 GB 分卷上传，需要集齐全部 3 卷
  enhance: {
    label: '离线增强包 · Qwen3-4B / Hy-MT2 / Whisper small',
    totalSize: '3.73 GB',
    parts: [
      { name: '第 1 卷', file: 'WordIsle-3.9.56-enhance-models.zip.001', size: '1.46 GB', url: 'https://github.com/1752370874-blip/wordisle/releases/latest/download/WordIsle-3.9.56-enhance-models.zip.001' },
      { name: '第 2 卷', file: 'WordIsle-3.9.56-enhance-models.zip.002', size: '1.46 GB', url: 'https://github.com/1752370874-blip/wordisle/releases/latest/download/WordIsle-3.9.56-enhance-models.zip.002' },
      { name: '第 3 卷', file: 'WordIsle-3.9.56-enhance-models.zip.003', size: '816 MB', url: 'https://github.com/1752370874-blip/wordisle/releases/latest/download/WordIsle-3.9.56-enhance-models.zip.003' }
    ]
  },

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
