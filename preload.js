const { contextBridge, ipcRenderer, shell } = require("electron")

contextBridge.exposeInMainWorld('api', {
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  getConfig: () => ipcRenderer.invoke('get-config'),
  getTokens: () => ipcRenderer.invoke('get-tokens'),
  saveTokens: (tokens) => ipcRenderer.invoke('save-tokens', tokens),
  openWebBrowser: (url) => shell.openExternal(url),
  exitApp: () => ipcRenderer.invoke('exit-app'),
  initBot: () => ipcRenderer.invoke('init-bot'),
  restartBot: () => ipcRenderer.invoke('restart-bot'),
  buyToken: (token) => ipcRenderer.invoke('buy-token', token),
  sellToken: (token) => ipcRenderer.invoke('sell-token', token)
})