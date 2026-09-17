import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import QuickCapture from '../ui/QuickCapture';
import GlobalSearch from '../ui/GlobalSearch';
import { useUIStore } from '../../store/useUIStore';

export default function Layout() {
  const { quickCaptureOpen, searchOpen } = useUIStore();

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
    </div>
  );
}
