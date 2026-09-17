import { create } from 'zustand';
import type { Alert, QuickCaptureType } from '../types';

interface UIState {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  quickCaptureOpen: boolean;
  quickCaptureType: QuickCaptureType;
  searchOpen: boolean;
  searchQuery: string;
  alerts: Alert[];
  
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setQuickCaptureOpen: (open: boolean, type?: QuickCaptureType) => void;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
  setAlerts: (alerts: Alert[]) => void;
  dismissAlert: (id: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: (localStorage.getItem('ptt_theme') as 'light' | 'dark') || 'dark',
  sidebarCollapsed: false,
  quickCaptureOpen: false,
  quickCaptureType: 'task',
  searchOpen: false,
  searchQuery: '',
  alerts: [],

  setTheme: (theme) => {
    localStorage.setItem('ptt_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  setQuickCaptureOpen: (open, type = 'task') =>
    set({ quickCaptureOpen: open, quickCaptureType: type }),

  setSearchOpen: (open) => set({ searchOpen: open }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  setAlerts: (alerts) => set({ alerts }),
  
  dismissAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, isDismissed: true } : a)),
    })),
}));

// Apply theme on load
const savedTheme = (localStorage.getItem('ptt_theme') as 'light' | 'dark') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
