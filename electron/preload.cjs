const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
  'galflowDesktop',
  Object.freeze({
    isDesktop: true,
    platform: process.platform,
    electronVersion: process.versions.electron,
    saveFile: (options) => ipcRenderer.invoke('galflow:save-file', options),
  }),
)
