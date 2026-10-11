import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import QuickCapture from '../ui/QuickCapture';
import GlobalSearch from '../ui/GlobalSearch';
import ProjectSwitcher from '../workspace/ProjectSwitcher';
import NewProjectDialog from '../workspace/NewProjectDialog';
import { useUIStore } from '../../store/useUIStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

export default function Layout() {
  const { quickCaptureOpen, searchOpen } = useUIStore();
  const { switcherOpen, newProjectOpen, setSwitcherOpen } = useWorkspaceStore();

  // Keyboard shortcut: Alt+P to toggle the Project Switcher
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.altKey && e.key.toLowerCase() === 'p') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        setSwitcherOpen(!useWorkspaceStore.getState().switcherOpen);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSwitcherOpen]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <TopBar />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
      {quickCaptureOpen && <QuickCapture />}
      {searchOpen && <GlobalSearch />}
      {switcherOpen && <ProjectSwitcher />}
      {newProjectOpen && <NewProjectDialog />}
    </div>
  );
}
