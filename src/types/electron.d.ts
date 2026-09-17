export interface ProjectLockInfo {
  pilot: string;
  computer: string;
  timestamp: string;
}

export interface ProjectListItem {
  fileName: string;
  filePath: string;
  modifiedTime: number;
  sizeBytes: number;
  lockInfo: ProjectLockInfo | null;
}

export interface ElectronProjectPayload {
  filePath: string;
  fileName: string;
  data: Uint8Array | ArrayBuffer;
  lockInfo?: ProjectLockInfo | null;
  isLockedByOther?: boolean;
}

export interface ElectronAPI {
  isElectron: boolean;
  openProjectFile: () => Promise<ElectronProjectPayload | null>;
  openFileByPath: (filePath: string, pilotName?: string) => Promise<ElectronProjectPayload | null>;
  saveProjectAs: (
    uint8Array: Uint8Array,
    suggestedName?: string
  ) => Promise<{ filePath: string; fileName: string } | null>;
  saveProject: (
    uint8Array: Uint8Array,
    filePath?: string | null
  ) => Promise<{ filePath: string; fileName: string } | null>;
  getCurrentFilePath: () => Promise<string | null>;

  selectProjectsFolder: () => Promise<string | null>;
  getSavedProjectsFolder: () => Promise<string | null>;
  listProjectsInFolder: (folderPath?: string) => Promise<ProjectListItem[]>;
  acquireLock: (filePath: string, pilotName?: string) => Promise<{ locked: boolean; lockInfo?: ProjectLockInfo }>;
  releaseLock: (filePath?: string | null) => Promise<void>;

  onProjectLoaded: (callback: (payload: ElectronProjectPayload) => void) => () => void;
  onNewProject: (callback: () => void) => () => void;
  onRequestSave: (callback: () => void) => () => void;
  onRequestSaveAs: (callback: () => void) => () => void;
  onExternalChange: (callback: (payload: { filePath: string; fileName: string; modifiedTime: number }) => void) => () => void;
  onFolderUpdated: (callback: (folderPath: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
