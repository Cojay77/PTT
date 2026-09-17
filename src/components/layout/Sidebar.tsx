import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, CheckSquare, ListTodo, Milestone, MessageSquare,
  Users, UserCog, CalendarDays, AlertTriangle, Zap, Scale, ClipboardList,
  CalendarCheck, Shield, BookOpen, BarChart3, ClipboardCheck, GitBranch,
  HandshakeIcon, Settings, ChevronLeft, ChevronRight, PlusCircle
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useDataStore } from '../../store/useDataStore';
import { useTaskStore } from '../../store/useTaskStore';
import { taskQueries } from '../../db/queries/tasks';
import { issueQueries, decisionQueries, actionQueries, communicationQueries } from '../../db/queries';
import { projectConfigQueries } from '../../db/queries';

const navGroups = [
  {
    label: 'Command',
    items: [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/overview', icon: FolderKanban, label: 'Project Overview' },
    ],
  },
  {
    label: 'Execution',
    items: [
      { path: '/tasks', icon: CheckSquare, label: 'Tasks', badge: 'tasks' },
      { path: '/backlog', icon: ListTodo, label: 'Backlog' },
      { path: '/actions', icon: Zap, label: 'Actions', badge: 'actions' },
      { path: '/meetings', icon: CalendarCheck, label: 'Meetings' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { path: '/milestones', icon: Milestone, label: 'Milestones' },
      { path: '/timeline', icon: GitBranch, label: 'Timeline' },
    ],
  },
  {
    label: 'Control',
    items: [
      { path: '/raid', icon: Shield, label: 'RAID View' },
      { path: '/risks', icon: AlertTriangle, label: 'Risks', badge: 'risks' },
      { path: '/issues', icon: Zap, label: 'Issues', badge: 'issues' },
      { path: '/decisions', icon: Scale, label: 'Decisions', badge: 'decisions' },
      { path: '/communications', icon: MessageSquare, label: 'Communications', badge: 'comms' },
    ],
  },
  {
    label: 'People',
    items: [
      { path: '/stakeholders', icon: Users, label: 'Stakeholders' },
      { path: '/resources', icon: UserCog, label: 'Resources' },
      { path: '/calendar', icon: CalendarDays, label: 'Team Calendar' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { path: '/reports', icon: BarChart3, label: 'Reports' },
      { path: '/weekly-review', icon: ClipboardCheck, label: 'Weekly Review' },
      { path: '/handover', icon: HandshakeIcon, label: 'Handover View' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { path: '/notes', icon: BookOpen, label: 'Notebook' },
      { path: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

function useBadgeCounts() {
  const today = new Date().toISOString().split('T')[0];
  const overdueTasks = taskQueries.getOverdue().length;
  const blockedTasks = taskQueries.getBlocked().length;
  const openIssues = issueQueries.getOpen().length;
  const pendingDecisions = decisionQueries.getPending().length;
  const overdueActions = actionQueries.getOverdue().length;
  const overdueComms = communicationQueries.getOverdueResponses().length;
  const openRisks = issueQueries.getOpen().filter(i => i.severity === 'critical' || i.severity === 'high').length;
  return { overdueTasks, blockedTasks, openIssues, pendingDecisions, overdueActions, overdueComms, openRisks };
}

export default function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, setQuickCaptureOpen } = useUIStore();
  const badges = useBadgeCounts();

  const config = projectConfigQueries.get();
  const projectName = (config?.name as string) || 'New Project';
  const projectCode = (config?.code as string) || '';

  function getBadge(badge?: string) {
    if (!badge) return null;
    const counts: Record<string, number> = {
      tasks: badges.overdueTasks + badges.blockedTasks,
      actions: badges.overdueActions,
      risks: badges.openRisks,
      issues: badges.openIssues,
      decisions: badges.pendingDecisions,
      comms: badges.overdueComms,
    };
    const count = counts[badge] || 0;
    if (!count) return null;
    return count;
  }

  return (
    <nav className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <LayoutDashboard />
        </div>
        {!sidebarCollapsed && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="sidebar-project-name">{projectName}</div>
            {projectCode && <div className="sidebar-project-code">{projectCode}</div>}
          </div>
        )}
        <button
          className="btn-icon btn-ghost"
          style={{ color: 'var(--text-sidebar)', flexShrink: 0 }}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Quick Capture */}
      {!sidebarCollapsed && (
        <div style={{ padding: '8px 10px' }}>
          <button
            className="btn btn-primary w-full"
            style={{ justifyContent: 'center' }}
            onClick={() => setQuickCaptureOpen(true)}
          >
            <PlusCircle size={14} />
            Quick Capture
            <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7 }}>⌘K</span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="sidebar-nav">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!sidebarCollapsed && (
              <div className="sidebar-section-label">{group.label}</div>
            )}
            {group.items.map((item) => {
              const badge = getBadge(item.badge);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <item.icon />
                  {!sidebarCollapsed && (
                    <>
                      <span>{item.label}</span>
                      {badge ? (
                        <span className={`nav-badge ${badge > 0 ? '' : ''}`}>{badge}</span>
                      ) : null}
                    </>
                  )}
                  {sidebarCollapsed && badge ? (
                    <span style={{
                      position: 'absolute', right: 4, top: 4,
                      width: 8, height: 8, borderRadius: '50%',
                      background: 'var(--danger)'
                    }} />
                  ) : null}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
