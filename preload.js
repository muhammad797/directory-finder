// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  chooseRoot: () => ipcRenderer.invoke('dialog:choose-root'),
  runScan: (payload) => ipcRenderer.invoke('scan:run', payload),
  revealInFolder: (absPath) => ipcRenderer.invoke('file:reveal', absPath),
  deleteFile: (absPath) => ipcRenderer.invoke('file:delete', absPath)
});