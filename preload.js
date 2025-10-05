// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  chooseRoot: () => ipcRenderer.invoke('dialog:choose-root'),
  runScan: (payload) => ipcRenderer.invoke('scan:run', payload)
});