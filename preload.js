'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wordIsle', {
  accountStatus: () => ipcRenderer.invoke('auth:status'),
  accountLoginOptions: input => ipcRenderer.invoke('auth:login-options', input),
  accountForget: () => ipcRenderer.invoke('auth:forget'),
  accountAutoLogin: () => ipcRenderer.invoke('auth:auto-login'),
  accountCancelAuto: () => ipcRenderer.invoke('auth:cancel-auto'),
  accountRegister: input => ipcRenderer.invoke('auth:register', input),
  accountLogin: input => ipcRenderer.invoke('auth:login', input),
  accountRecover: input => ipcRenderer.invoke('auth:recover', input),
  accountLoad: () => ipcRenderer.invoke('auth:load'),
  accountSave: raw => ipcRenderer.invoke('auth:save', raw),
  accountAutoBackup: () => ipcRenderer.invoke('auth:auto-backup'),
  accountCompleteOnboarding: status => ipcRenderer.invoke('auth:onboarding', status),
  accountProfile: input => ipcRenderer.invoke('auth:profile', input),
  accountPassword: input => ipcRenderer.invoke('auth:password', input),
  accountLogout: input => ipcRenderer.invoke('auth:logout', input),
  accountCopy: text => ipcRenderer.invoke('auth:copy', text),
  accountExport: () => ipcRenderer.invoke('auth:export'),
  accountImport: input => ipcRenderer.invoke('auth:import', input),
  accountCloseReady: input => ipcRenderer.invoke('auth:close-ready', input),
  onAccountLifecycle: callback => { const handler = (event, request) => callback(request); ipcRenderer.on('auth:lifecycle', handler); return () => ipcRenderer.removeListener('auth:lifecycle', handler); },
  // 返回 { updatedAt, items }；force=true 时强制联网刷新
  news: (force) => ipcRenderer.invoke('news:get', !!force),
  newsStatus: () => ipcRenderer.invoke('news:status'),
  newsRefresh: input => ipcRenderer.invoke('news:refresh', input),
  newsCancel: () => ipcRenderer.invoke('news:cancel'),
  newsFullText: input => ipcRenderer.invoke('news:article', input),
  newsDownload: input => ipcRenderer.invoke('news:download', input),
  newsProgress: () => ipcRenderer.invoke('news:progress'),
  info: () => ipcRenderer.invoke('app:info'),
  setNetworkEnhanced: enabled => ipcRenderer.invoke('app:network', enabled===true),
  syncVocabulary: address => ipcRenderer.invoke('vocab:sync', address),
  // 朗读音频代理：url -> data URL（失败返回 null，由前端回退系统语音）
  ttsFetch: (url) => ipcRenderer.invoke('tts:fetch', String(url || '')),
  // 微软在线语音（Edge 神经语音）：text -> data URL，失败 null
  ttsMsEdge: (text, voice) => ipcRenderer.invoke('tts:msedge', String(text || ''), String(voice || 'en-US-AriaNeural')),
  // 自定义背景图：弹系统选图框并复制进用户目录，只回传随机文件名
  bgPick: (oldName) => ipcRenderer.invoke('bg:pick', String(oldName || '')),
  bgUrl: (name) => ipcRenderer.invoke('bg:url', String(name || '')),
  bgClear: (name) => ipcRenderer.invoke('bg:clear', String(name || '')),
  // 更新检查：只读公开清单，不传任何本机数据
  updateCheck: () => ipcRenderer.invoke('update:check'),
  aiSource: (request) => ipcRenderer.invoke('ai:source', request),
  localModelStatus: () => ipcRenderer.invoke('local:status'),
  translationStatus: () => ipcRenderer.invoke('translation:status'),
  localSource: (request) => ipcRenderer.invoke('local:source', request),
  warmOral: () => ipcRenderer.invoke('local:oral-warm'),
  transcribe: (input) => ipcRenderer.invoke('speech:transcribe', input),
  neuralVoiceWarm: (voice) => ipcRenderer.invoke('tts:neural-warm', voice),
  neuralVoice: (input) => ipcRenderer.invoke('tts:neural', input),
  neuralVoiceStop: () => ipcRenderer.invoke('tts:neural-stop'),
  vadStart: (mode) => ipcRenderer.invoke('vad:start', mode),
  vadPush: (input) => ipcRenderer.invoke('vad:push', input),
  vadFlush: (token) => ipcRenderer.invoke('vad:flush', token),
  boundaryStatus: () => ipcRenderer.invoke('boundary:status'),
  boundaryTrain: (input) => ipcRenderer.invoke('boundary:train', input),
  boundaryCancel: () => ipcRenderer.invoke('boundary:cancel'),
  boundaryRestore: () => ipcRenderer.invoke('boundary:restore'),
  onBoundaryProgress: (callback) => { const handler = (event, info) => callback(info); ipcRenderer.on('boundary:progress', handler); return () => ipcRenderer.removeListener('boundary:progress', handler); }
});

// The page retains native Windows caption controls; this blank area only enables dragging.
if (process.platform === 'win32') {
  window.addEventListener('DOMContentLoaded', () => {
    if (!['index.html', 'account.html'].some(name => location.pathname.endsWith('/' + name))) return;
    document.documentElement.classList.add('desktop-overlay');
    const drag = document.createElement('div');
    drag.className = 'desktop-drag-region';
    drag.setAttribute('aria-hidden', 'true');
    document.body.prepend(drag);
  });
}
