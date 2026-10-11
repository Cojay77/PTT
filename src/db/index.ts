export {
  query, queryOne, execute, generateId, initDatabase, getDb, saveDbNow,
  exportDatabase, importDatabase, scheduleDbSave,
  openProjectFileDialog, openProjectByFilePath, saveProjectAsDialog, createNewBlankProject,
  getCurrentProjectFilePath, onProjectFileChange,
  isReadOnlyProject, getActiveLockInfo, setReadOnlyMode,
  // Multi-project workspace
  getActiveProjectId, isFreshWorkspace, flushPendingSave, listWorkspaceProjects,
  switchProject, createProject, importProjectFromBytes, duplicateProject, renameProject,
  setProjectColor, deleteProject, reloadActiveProjectFromStorage, exportProjectFile,
  exportWorkspaceBundle, importWorkspaceBundle, openWorkspaceBundleDialog,
  resetWorkspace, resetCurrentProject, restoreIntoCurrentProject,
} from './db';
export type { WorkspaceProject, WorkspaceProjectSummary, NewProjectTemplate } from './db';
export { getStorageEstimate, PROJECT_COLORS } from './projectStore';
