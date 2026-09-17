export interface ElectronProjectPayload {
  filePath: string;
  fileName: string;
  data: Uint8Array | ArrayBuffer;
}

export interface ElectronAPI {
  isElectron: boolean;
  openProjectFile: () => Promise<ElectronProjectPayload | null>;
  saveProjectAs: (
    uint8Array: Uint8Array,
    suggestedName?: string
  ) => Promise<{ filePath: string; fileName: string } | null>;
  saveProject: (
    uint8Array: Uint8Array,
    filePath?: string | null
  ) => Promise<{ filePath: string; fileName: string } | null>;
  getCurrentFilePath: () => Promise<string | null>;
  onProjectLoaded: (callback: (payload: ElectronProjectPayload) => void) => () => void;
  onNewProject: (callback: () => void) => () => void;
  onRequestSave: (callback: () => void) => () => void;
  onRequestSaveAs: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
