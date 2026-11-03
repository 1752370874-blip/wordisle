'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wordIsle', {
  // 返回 { updatedAt, items }；force=true 时强制联网刷新
  news: (force) => ipcRenderer.invoke('news:get', !!force),
  info: () => ipcRenderer.invoke('app:info'),
  // 朗读音频代理：url -> data URL（失败返回 null，由前端回退系统语音）
  ttsFetch: (url) => ipcRenderer.invoke('tts:fetch', String(url || '')),
  // 微软在线语音（Edge 神经语音）：text -> data URL，失败 null
  ttsMsEdge: (text, voice) => ipcRenderer.invoke('tts:msedge', String(text || ''), String(voice || 'en-US-AriaNeural')),
  // 自定义背景图：弹系统选图框并复制进用户目录，只回传随机文件名
  bgPick: (oldName) => ipcRenderer.invoke('bg:pick', String(oldName || '')),
  bgUrl: (name) => ipcRenderer.invoke('bg:url', String(name || '')),
  bgClear: (name) => ipcRenderer.invoke('bg:clear', String(name || '')),
  // 更新检查：只读公开清单，不传任何本机数据
  updateCheck: () => ipcRenderer.invoke('update:check')
});
