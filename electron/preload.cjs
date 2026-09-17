const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openProjectFile: () => ipcRenderer.invoke('dialog:openProject'),
  openFileByPath: (filePath, pilotName) => ipcRenderer.invoke('file:openByPath', filePath, pilotName),
  saveProjectAs: (uint8Array, suggestedName) =>
    ipcRenderer.invoke('dialog:saveProjectAs', uint8Array, suggestedName),
  saveProject: (uint8Array, filePath) =>
    ipcRenderer.invoke('file:saveProject', uint8Array, filePath),
  getCurrentFilePath: () => ipcRenderer.invoke('app:getCurrentFilePath'),

  // Shared Workspace Folder & Google Drive Sync
  selectProjectsFolder: () => ipcRenderer.invoke('folder:selectProjectsFolder'),
  getSavedProjectsFolder: () => ipcRenderer.invoke('folder:getSavedFolder'),
  listProjectsInFolder: (folderPath) => ipcRenderer.invoke('folder:listProjects', folderPath),
  acquireLock: (filePath, pilotName) => ipcRenderer.invoke('project:acquireLock', filePath, pilotName),
  releaseLock: (filePath) => ipcRenderer.invoke('project:releaseLock', filePath),

  // Event Listeners
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
  onExternalChange: (callback) => {
    const handler = (_, payload) => callback(payload);
    ipcRenderer.on('project:external-change', handler);
    return () => ipcRenderer.removeListener('project:external-change', handler);
  },
  onFolderUpdated: (callback) => {
    const handler = (_, folderPath) => callback(folderPath);
    ipcRenderer.on('folder:updated', handler);
    return () => ipcRenderer.removeListener('folder:updated', handler);
  },
});
