import { create } from 'zustand';
import { listWorkspaceProjects, getActiveProjectId, type WorkspaceProject } from '../db';

interface WorkspaceState {
  projects: WorkspaceProject[];
  activeId: string | null;
  switcherOpen: boolean;
  newProjectOpen: boolean;
  newProjectDraft: string;
  refresh: () => Promise<void>;
  setSwitcherOpen: (open: boolean) => void;
  setNewProjectOpen: (open: boolean, draftName?: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  projects: [],
  activeId: null,
  switcherOpen: false,
  newProjectOpen: false,
  newProjectDraft: '',

  refresh: async () => {
    try {
      const projects = await listWorkspaceProjects();
      set({ projects, activeId: getActiveProjectId() });
    } catch (err) {
      console.error('Failed to list workspace projects:', err);
    }
  },

  setSwitcherOpen: (open) => set({ switcherOpen: open }),
  setNewProjectOpen: (open, draftName = '') => set((s) => ({
    newProjectOpen: open,
    newProjectDraft: open ? draftName : '',
    switcherOpen: open ? false : s.switcherOpen,
  })),
}));

// Keep the list in sync with any workspace change (save, switch, create, delete, other tabs)
if (typeof window !== 'undefined') {
  let pending: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener('ptt:workspace-changed', () => {
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => { void useWorkspaceStore.getState().refresh(); }, 50);
  });
}
