// 词屿官网配置：部署前只需要改这里
// 主包与模型包统一由 GitHub Releases 分发，链接用 latest/download 固定直链，
// 以后发新版本时改这里的文件名即可（网站正文里的体积文字同步改一下）。
window.SITE_CONFIG = {
  version: '3.9.35-preview',

  // Windows 主包（GitHub Releases 的 latest/download 固定链接）
  // 形如：https://github.com/<owner>/<repo>/releases/latest/download/<文件名>
  winDownload: 'https://github.com/1752370874-blip/wordisle/releases/latest/download/WordIsle-3.9.35-preview-win-x64.zip',
  winSize: '293 MB',

  // 可选本地模型包（不下载也能正常背词、查词、阅读）
  models: {
    qwen: {
      label: 'Qwen3-1.7B · 伴学 / 讲解',
      size: '1.22 GB',
      url: 'https://github.com/1752370874-blip/wordisle/releases/latest/download/WordIsle-3.9.35-models-qwen3-1.7b.zip'
    },
    hy: {
      label: 'Hy-MT2-1.8B · 离线翻译',
      size: '1.08 GB',
      url: 'https://github.com/1752370874-blip/wordisle/releases/latest/download/WordIsle-3.9.35-models-hy-mt2.zip'
    }
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
