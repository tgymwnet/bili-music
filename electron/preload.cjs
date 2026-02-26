const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  // 播放状态同步（任务栏按钮）
  notifyPlayState: (isPlaying) => ipcRenderer.send('play-state-changed', isPlaying),
  onPlayerControl: (cb) => ipcRenderer.on('player-control', (_, cmd) => cb(cmd)),
  // Cookie 管理（让 buvid 可靠写入 bilibili.com）
  setCookie: (cookie) => ipcRenderer.invoke('cookies-set', cookie),
  getCookies: (url) => ipcRenderer.invoke('cookies-get', url),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
})
