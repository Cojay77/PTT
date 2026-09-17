import { useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Sun, Moon, Save, Download } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { saveDbNow, exportDatabase } from '../../db';
import { format } from 'date-fns';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/overview': 'Project Overview',
  '/tasks': 'Tasks',
  '/backlog': 'Backlog',
  '/milestones': 'Milestones & Roadmap',
  '/communications': 'Communications',
  '/stakeholders': 'Stakeholders',
  '/resources': 'Resources',
  '/calendar': 'Team Calendar',
  '/risks': 'Risk Register',
  '/issues': 'Issues & Blockers',
  '/decisions': 'Decisions Log',
  '/actions': 'Actions Log',
  '/meetings': 'Meetings',
  '/raid': 'RAID View',
  '/notes': 'Project Notebook',
  '/reports': 'Reports & Dashboards',
  '/weekly-review': 'Weekly Review',
  '/timeline': 'Project Timeline',
  '/handover': 'Handover View',
  '/settings': 'Settings',
};

export default function TopBar() {
  const { theme, toggleTheme, setSearchOpen, alerts } = useUIStore();
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'Project Tracking Tool';
  const criticalAlerts = alerts.filter(a => !a.isDismissed && a.level === 'critical').length;
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const { setQuickCaptureOpen } = useUIStore.getState();
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setQuickCaptureOpen(true);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === '/') {
      e.preventDefault();
      setSearchOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <header className="topbar">
      <div className="flex-1 min-w-0">
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {title}
        </h1>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 1 }}>{today}</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setSearchOpen(true)}
          title="Global search (Ctrl+/)"
          id="topbar-search-btn"
        >
          <Search size={14} />
          <span style={{ color: 'var(--text-muted)' }}>Search...</span>
          <span style={{ fontSize: 10, color: 'var(--text-placeholder)', marginLeft: 8, fontFamily: 'var(--font-mono)' }}>⌘/</span>
        </button>

        {/* Alerts bell */}
        <div className="tooltip-wrapper">
          <button className="btn-icon btn-ghost" style={{ position: 'relative' }} title="Alerts">
            <Bell size={16} />
            {criticalAlerts > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--danger)',
                animation: 'pulse-ring 2s infinite',
              }} />
            )}
          </button>
          <div className="tooltip">Alerts ({criticalAlerts} critical)</div>
        </div>

        {/* Save */}
        <div className="tooltip-wrapper">
          <button className="btn-icon btn-ghost" onClick={saveDbNow} title="Save now">
            <Save size={16} />
          </button>
          <div className="tooltip">Save database</div>
        </div>

        {/* Export */}
        <div className="tooltip-wrapper">
          <button className="btn-icon btn-ghost" onClick={exportDatabase} title="Export backup">
            <Download size={16} />
          </button>
          <div className="tooltip">Export database backup</div>
        </div>

        {/* Theme toggle */}
        <div className="tooltip-wrapper">
          <button className="btn-icon btn-ghost" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div className="tooltip">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</div>
        </div>
      </div>
    </header>
  );
}
