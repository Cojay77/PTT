const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openProjectFile: () => ipcRenderer.invoke('dialog:openProject'),
  saveProjectAs: (uint8Array, suggestedName) =>
    ipcRenderer.invoke('dialog:saveProjectAs', uint8Array, suggestedName),
  saveProject: (uint8Array, filePath) =>
    ipcRenderer.invoke('file:saveProject', uint8Array, filePath),
  getCurrentFilePath: () => ipcRenderer.invoke('app:getCurrentFilePath'),
  onProjectLoaded: (callback) => {
    const handler = (_, payload) => callback(payload);
    ipcRenderer.on('project:loaded', handler);
    return () => ipcRenderer.removeListener('project:loaded', handler);
  },
  onNewProject: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('project:new', handler);
    return () => ipcRenderer.removeListener('project:new', handler);
  },
  onRequestSave: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('project:request-save', handler);
    return () => ipcRenderer.removeListener('project:request-save', handler);
  },
  onRequestSaveAs: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('project:request-save-as', handler);
    return () => ipcRenderer.removeListener('project:request-save-as', handler);
  },
});
