import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search, Bell, Sun, Moon, Save, Download, PanelLeftClose, PanelLeftOpen,
  AlertCircle, AlertTriangle, Info, CheckCircle2, X, ArrowRight,
  FolderKanban, ChevronDown, Upload, PlusCircle, Copy, Lock, RefreshCw, FolderOpen, Check, Cloud
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useDataStore } from '../../store/useDataStore';
import { useTaskStore } from '../../store/useTaskStore';
import {
  saveDbNow, exportDatabase, openProjectFileDialog, saveProjectAsDialog,
  createNewBlankProject, getCurrentProjectFilePath, onProjectFileChange,
  openProjectByFilePath, isReadOnlyProject, getActiveLockInfo, setReadOnlyMode
} from '../../db';
import type { ProjectListItem } from '../../types/electron';
import { projectConfigQueries } from '../../db/queries';
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

interface LiveAlert {
  id: string;
  level: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  link: string;
}

export default function TopBar() {
  const { theme, toggleTheme, setSearchOpen, sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();

  const tasks = useTaskStore((s) => s.tasks);
  const { risks, issues, decisions, actions, communications } = useDataStore();

  const DISMISSED_KEY = 'ptt_dismissed_alerts';
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem(DISMISSED_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const alertsRef = useRef<HTMLDivElement>(null);

  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(getCurrentProjectFilePath());
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

  const [sharedFolder, setSharedFolder] = useState<string | null>(null);
  const [projectList, setProjectList] = useState<ProjectListItem[]>([]);
  const [externalUpdate, setExternalUpdate] = useState<{ fileName: string; filePath: string } | null>(null);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(isReadOnlyProject());
  const [lockInfo, setLockInfo] = useState<{ pilot: string; computer: string; timestamp: string } | null>(getActiveLockInfo());

  // Load shared folder & project list on mount & when menu opens
  const refreshProjectsList = useCallback(async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const folder = await window.electronAPI.getSavedProjectsFolder();
        setSharedFolder(folder);
        if (folder) {
          const items = await window.electronAPI.listProjectsInFolder(folder);
          setProjectList(items);
        }
      } catch (err) {
        console.error('Failed to list projects:', err);
      }
    }
  }, []);

  useEffect(() => {
    refreshProjectsList();
  }, [refreshProjectsList]);

  useEffect(() => {
    if (projectMenuOpen) {
      refreshProjectsList();
    }
  }, [projectMenuOpen, refreshProjectsList]);

  // Listen for external updates (e.g. Google Drive sync) and lock changes
  useEffect(() => {
    const handleExternal = (e: Event) => {
      const customEvent = e as CustomEvent<{ fileName: string; filePath: string }>;
      setExternalUpdate(customEvent.detail);
    };
    const handleLock = (e: Event) => {
      const customEvent = e as CustomEvent<{ isReadOnly: boolean; lockInfo: { pilot: string; computer: string; timestamp: string } | null }>;
      setIsReadOnly(customEvent.detail.isReadOnly);
      setLockInfo(customEvent.detail.lockInfo);
    };

    window.addEventListener('ptt:external-change', handleExternal);
    window.addEventListener('ptt:lock-status-changed', handleLock);

    return () => {
      window.removeEventListener('ptt:external-change', handleExternal);
      window.removeEventListener('ptt:lock-status-changed', handleLock);
    };
  }, []);

  useEffect(() => {
    return onProjectFileChange((path: string | null) => {
      setCurrentFilePath(path);
      setIsReadOnly(isReadOnlyProject());
      setLockInfo(getActiveLockInfo());
    });
  }, []);

  // Click outside to close project menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
        setProjectMenuOpen(false);
      }
    }
    if (projectMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [projectMenuOpen]);

  const projectName = useMemo(() => {
    try {
      const cfg = projectConfigQueries.get();
      return cfg?.name || 'Customer Portal Migration';
    } catch {
      return 'Customer Portal Migration';
    }
  }, [currentFilePath, location.pathname]);

  const currentFileName = useMemo(() => {
    if (!currentFilePath) return null;
    return currentFilePath.split(/[\\/]/).pop() || null;
  }, [currentFilePath]);

  const title = PAGE_TITLES[location.pathname] || 'Project Tracking Tool';
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');
  const todayIso = new Date().toISOString().split('T')[0];

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
    if (e.key === 'Escape') {
      setAlertsOpen(false);
    }
  }, [setSearchOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Click outside to close alerts popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setAlertsOpen(false);
      }
    }
    if (alertsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [alertsOpen]);

  // Reactively calculate live alerts
  const activeAlerts = useMemo(() => {
    const list: LiveAlert[] = [];

    // Critical Issues
    issues.forEach((i) => {
      if (['open', 'in-progress', 'escalated'].includes(i.status)) {
        if (i.severity === 'critical') {
          list.push({
            id: `issue-${i.id}`,
            level: 'critical',
            category: 'Issue',
            title: `Critical Blocker: ${i.title}`,
            description: i.impact || i.resolutionActions || 'Requires immediate resolution',
            link: '/issues',
          });
        } else if (i.severity === 'high') {
          list.push({
            id: `issue-${i.id}`,
            level: 'warning',
            category: 'Issue',
            title: `High Issue: ${i.title}`,
            description: i.impact || 'In progress',
            link: '/issues',
          });
        }
      }
    });

    // Critical & High Risks
    risks.forEach((r) => {
      if (!['closed', 'accepted'].includes(r.status)) {
        if (r.severity === 'critical') {
          list.push({
            id: `risk-${r.id}`,
            level: 'critical',
            category: 'Risk',
            title: `Critical Risk: ${r.title}`,
            description: r.mitigationStrategy ? `Mitigation: ${r.mitigationStrategy}` : 'Assessment needed',
            link: '/risks',
          });
        } else if (r.severity === 'high') {
          list.push({
            id: `risk-${r.id}`,
            level: 'warning',
            category: 'Risk',
            title: `High Risk: ${r.title}`,
            description: r.mitigationStrategy || 'Under review',
            link: '/risks',
          });
        }
      }
    });

    // Overdue Tasks
    tasks.forEach((t) => {
      if (!t.isBacklog && t.dueDate && t.dueDate < todayIso && !['done', 'cancelled'].includes(t.status)) {
        list.push({
          id: `task-overdue-${t.id}`,
          level: 'critical',
          category: 'Task',
          title: `Overdue Task: ${t.title}`,
          description: `Due on ${t.dueDate} · Owner: ${t.owner || 'Unassigned'}`,
          link: '/tasks',
        });
      } else if (!t.isBacklog && t.status === 'blocked') {
        list.push({
          id: `task-blocked-${t.id}`,
          level: 'warning',
          category: 'Task',
          title: `Blocked Task: ${t.title}`,
          description: t.blockingReason || 'Task is currently blocked',
          link: '/tasks',
        });
      }
    });

    // Decisions requiring action
    decisions.forEach((d) => {
      if (d.status === 'decision-required') {
        list.push({
          id: `decision-${d.id}`,
          level: 'warning',
          category: 'Decision',
          title: `Decision Required: ${d.title}`,
          description: d.deadline ? `Deadline: ${d.deadline}` : (d.decisionRequired || 'Pending review'),
          link: '/decisions',
        });
      }
    });

    // Communications overdue
    communications.forEach((c) => {
      if (c.status === 'awaiting-response' && c.expectedResponseDate && c.expectedResponseDate < todayIso) {
        list.push({
          id: `comm-${c.id}`,
          level: 'warning',
          category: 'Communication',
          title: `Awaiting Response: ${c.subject}`,
          description: `Expected from ${c.recipients || 'stakeholder'} by ${c.expectedResponseDate}`,
          link: '/communications',
        });
      }
    });

    // Overdue actions
    actions.forEach((a) => {
      if (a.dueDate && a.dueDate < todayIso && !['done', 'cancelled'].includes(a.status)) {
        list.push({
          id: `action-${a.id}`,
          level: 'warning',
          category: 'Action',
          title: `Overdue Action: ${a.action}`,
          description: `Due on ${a.dueDate} · Owner: ${a.owner || 'Unassigned'}`,
          link: '/actions',
        });
      }
    });

    return list.filter((item) => !dismissedIds.has(item.id));
  }, [tasks, risks, issues, decisions, actions, communications, todayIso, dismissedIds]);

  const criticalCount = activeAlerts.filter((a) => a.level === 'critical').length;
  const totalAlerts = activeAlerts.length;

  function dismissOne(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setDismissedIds((prev) => {
      const next = new Set([...prev, id]);
      try { sessionStorage.setItem('ptt_dismissed_alerts', JSON.stringify([...next])); } catch { /* noop */ }
      return next;
    });
  }

  function dismissAll() {
    setDismissedIds((prev) => {
      const next = new Set([...prev, ...activeAlerts.map((a) => a.id)]);
      try { sessionStorage.setItem('ptt_dismissed_alerts', JSON.stringify([...next])); } catch { /* noop */ }
      return next;
    });
  }

  return (
    <header className="topbar">
      {/* Floating Google Drive Sync Toast */}
      {externalUpdate && (
        <div className="sync-notification-bar">
          <div className="flex items-center gap-2">
            <Cloud size={18} color="var(--accent)" />
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
              <strong>Google Drive Synced:</strong> A newer version of <em>{externalUpdate.fileName}</em> was saved by another team member.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-primary btn-sm"
              onClick={async () => {
                const target = externalUpdate.filePath;
                setExternalUpdate(null);
                await openProjectByFilePath(target);
              }}
            >
              <RefreshCw size={13} /> Reload Changes
            </button>
            <button
              className="btn-icon btn-ghost btn-sm"
              onClick={() => setExternalUpdate(null)}
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Left section: Sidebar toggle + Page title */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          className="btn-icon btn-ghost"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ color: 'var(--text-sidebar-active)', flexShrink: 0 }}
          id="topbar-sidebar-toggle"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        <div className="min-w-0">
          <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', margin: 0 }}>
            {title}
          </h1>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, marginTop: 1 }}>{today}</p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Project File & Multi-Project Switcher */}
        <div className="project-file-menu" ref={projectMenuRef}>
          <button
            className="btn btn-secondary btn-sm flex items-center gap-2"
            onClick={() => setProjectMenuOpen(!projectMenuOpen)}
            title="Project File & Workspace Manager"
            id="topbar-project-menu-btn"
            style={{ fontWeight: 500 }}
          >
            <FolderKanban size={14} color="var(--accent)" />
            <span style={{ maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentFileName || projectName}
            </span>
            {isReadOnly ? (
              <span className="badge badge-warning flex items-center gap-1" style={{ fontSize: 9, padding: '1px 5px' }} title={`Piloted by ${lockInfo?.pilot || 'another PM'}`}>
                <Lock size={9} /> Review
              </span>
            ) : isElectron ? (
              <span className="badge badge-primary" style={{ fontSize: 9, padding: '1px 5px' }}>
                Desktop
              </span>
            ) : (
              <span className="badge badge-neutral" style={{ fontSize: 9, padding: '1px 5px' }}>
                Local
              </span>
            )}
            <ChevronDown size={12} style={{ opacity: 0.7 }} />
          </button>

          {projectMenuOpen && (
            <div className="project-dropdown-card">
              <div className="project-dropdown-header">
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Active Project {isElectron ? '(Desktop Mode)' : '(Local-First Mode)'}
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginTop: 2, wordBreak: 'break-all' }}>
                  {currentFileName || projectName}
                </div>
                {isReadOnly && (
                  <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Lock size={11} /> Piloted by <strong>{lockInfo?.pilot || 'another PM'}</strong> on {lockInfo?.computer} (Read-Only)
                  </div>
                )}
                {currentFilePath && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
                    {currentFilePath}
                  </div>
                )}
              </div>

              {/* Shared Team Workspace / Google Drive Section */}
              <div className="project-dropdown-section-title">
                <span>Shared Projects (Google Drive)</span>
                {isElectron && (
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={async () => {
                      const folder = await window.electronAPI?.selectProjectsFolder();
                      if (folder) {
                        setSharedFolder(folder);
                        await refreshProjectsList();
                      }
                    }}
                    title="Choose Google Drive synced folder"
                    style={{ fontSize: 11, padding: '2px 6px', color: 'var(--accent)' }}
                  >
                    <FolderOpen size={12} /> {sharedFolder ? 'Change Folder' : 'Set Folder'}
                  </button>
                )}
              </div>

              {sharedFolder ? (
                <div className="project-list-scroll">
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '2px 10px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📁 {sharedFolder}
                  </div>
                  {projectList.length === 0 ? (
                    <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
                      No .ptt project files in this folder yet.
                    </div>
                  ) : (
                    projectList.map((item) => {
                      const isActive = currentFilePath === item.filePath;
                      return (
                        <button
                          key={item.filePath}
                          className={`project-list-item-btn${isActive ? ' active' : ''}`}
                          onClick={async () => {
                            setProjectMenuOpen(false);
                            await openProjectByFilePath(item.filePath);
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            {isActive ? (
                              <Check size={14} color="var(--accent)" />
                            ) : (
                              <FolderKanban size={14} color="var(--text-muted)" />
                            )}
                            <div style={{ textAlign: 'left', minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.fileName.replace(/\.(ptt|db)$/, '')}
                              </div>
                              {item.lockInfo && !isActive && (
                                <div style={{ fontSize: 10, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <Lock size={9} /> Piloted by {item.lockInfo.pilot}
                                </div>
                              )}
                            </div>
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {item.fileName.endsWith('.ptt') ? '.ptt' : '.db'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              ) : (
                <div style={{ padding: '8px 14px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {isElectron ? (
                    <div>
                      Point PTT to your team's Google Drive folder to list and switch projects in 1 click.
                    </div>
                  ) : (
                    <div>
                      Running in web mode. In Desktop mode, choose a Google Drive folder to list all team projects automatically.
                    </div>
                  )}
                </div>
              )}

              <div className="project-dropdown-actions">
                <button
                  className="project-dropdown-item"
                  onClick={async () => {
                    setProjectMenuOpen(false);
                    await openProjectFileDialog();
                  }}
                >
                  <Upload size={14} /> Open Project (.ptt / .db)...
                </button>
                <button
                  className="project-dropdown-item"
                  onClick={async () => {
                    setProjectMenuOpen(false);
                    await saveProjectAsDialog(projectName ? `${projectName.replace(/\s+/g, '_')}.ptt` : 'Project.ptt');
                  }}
                >
                  <Download size={14} /> Save Project As (.ptt)...
                </button>
                <button
                  className="project-dropdown-item"
                  onClick={async () => {
                    setProjectMenuOpen(false);
                    if (window.confirm('Create a new blank project? Make sure you have saved or exported your current project first.')) {
                      await createNewBlankProject();
                    }
                  }}
                >
                  <PlusCircle size={14} /> New Blank Project
                </button>
                <button
                  className="project-dropdown-item"
                  onClick={async () => {
                    setProjectMenuOpen(false);
                    await saveProjectAsDialog(`Copy_of_${(projectName || 'Project').replace(/\s+/g, '_')}.ptt`);
                  }}
                >
                  <Copy size={14} /> Duplicate Project (.ptt)
                </button>
              </div>
            </div>
          )}
        </div>

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

        {/* Alerts Bell + Popover */}
        <div className="tooltip-wrapper" ref={alertsRef}>
          <button
            className="btn-icon btn-ghost"
            style={{
              position: 'relative',
              background: alertsOpen ? 'var(--bg-hover)' : undefined,
              color: criticalCount > 0 ? 'var(--danger)' : undefined,
            }}
            onClick={() => setAlertsOpen(!alertsOpen)}
            title="Alerts & Notifications"
            id="topbar-alerts-btn"
          >
            <Bell size={16} />
            {criticalCount > 0 ? (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--danger)',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: '0 0 0 2px var(--bg-surface)',
                }}
              >
                {criticalCount}
              </span>
            ) : totalAlerts > 0 ? (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--warning)',
                  color: 'hsl(38, 80%, 15%)',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: '0 0 0 2px var(--bg-surface)',
                }}
              >
                {totalAlerts}
              </span>
            ) : null}
          </button>
          {!alertsOpen && (
            <div className="tooltip">
              {totalAlerts > 0
                ? `${totalAlerts} active alert${totalAlerts > 1 ? 's' : ''} (${criticalCount} critical)`
                : 'Alerts (All clear)'}
            </div>
          )}

          {/* Alerts Dropdown Popover */}
          {alertsOpen && (
            <div className="alerts-popover">
              <div className="alerts-header">
                <div className="flex items-center gap-2">
                  <span style={{ fontWeight: 700, fontSize: 13 }}>Alerts & Notifications</span>
                  <span
                    className={`badge ${criticalCount > 0 ? 'status-blocked' : 'badge-info'}`}
                    style={{ fontSize: 10, padding: '2px 6px' }}
                  >
                    {totalAlerts} active
                  </span>
                </div>
                {totalAlerts > 0 && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, padding: '2px 6px', height: 'auto' }}
                    onClick={dismissAll}
                  >
                    Dismiss all
                  </button>
                )}
              </div>

              <div className="alerts-list">
                {activeAlerts.length > 0 ? (
                  activeAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`alert-item ${alert.level}`}
                      onClick={() => {
                        navigate(alert.link);
                        setAlertsOpen(false);
                      }}
                    >
                      <div className={`alert-badge-icon ${alert.level}`}>
                        {alert.level === 'critical' ? (
                          <AlertCircle size={15} />
                        ) : alert.level === 'warning' ? (
                          <AlertTriangle size={15} />
                        ) : (
                          <Info size={15} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }} className="truncate">
                          {alert.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                          {alert.description}
                        </div>
                      </div>
                      <button
                        className="btn-icon btn-ghost"
                        style={{ width: 22, height: 22, padding: 0, opacity: 0.6, flexShrink: 0 }}
                        onClick={(e) => dismissOne(e, alert.id)}
                        title="Dismiss"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={32} color="var(--success)" style={{ margin: '0 auto 8px auto' }} />
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>All Clear!</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>No active blockers or overdue items requiring attention.</div>
                  </div>
                )}
              </div>

              <div className="alerts-footer">
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11, padding: 0 }}
                  onClick={() => {
                    navigate('/raid');
                    setAlertsOpen(false);
                  }}
                >
                  Open RAID View <ArrowRight size={11} style={{ marginLeft: 4 }} />
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 11, height: 24, padding: '0 8px' }}
                  onClick={() => setAlertsOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Save */}
        <div className="tooltip-wrapper">
          <button className="btn-icon btn-ghost" onClick={saveDbNow} title="Save now" id="topbar-save-btn">
            <Save size={16} />
          </button>
          <div className="tooltip">Save database</div>
        </div>

        {/* Export */}
        <div className="tooltip-wrapper">
          <button className="btn-icon btn-ghost" onClick={exportDatabase} title="Export backup" id="topbar-export-btn">
            <Download size={16} />
          </button>
          <div className="tooltip">Export database backup (.db)</div>
        </div>

        {/* Theme toggle */}
        <div className="tooltip-wrapper">
          <button className="btn-icon btn-ghost" onClick={toggleTheme} title="Toggle theme" id="topbar-theme-btn">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div className="tooltip">{theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}</div>
        </div>
      </div>
    </header>
  );
}
