import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, CheckSquare, ListTodo, Milestone, MessageSquare,
  Users, UserCog, CalendarDays, AlertTriangle, Zap, Scale,
  CalendarCheck, Shield, BookOpen, BarChart3, ClipboardCheck, GitBranch,
  HandshakeIcon, Settings, ChevronLeft, ChevronRight, PlusCircle
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useDataStore } from '../../store/useDataStore';
import { useTaskStore } from '../../store/useTaskStore';

interface BadgeInfo {
  count: number;
  level: 'danger' | 'warning' | 'info';
}

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
      { path: '/milestones', icon: Milestone, label: 'Milestones', badge: 'milestones' },
      { path: '/timeline', icon: GitBranch, label: 'Timeline' },
    ],
  },
  {
    label: 'Control',
    items: [
      { path: '/raid', icon: Shield, label: 'RAID View', badge: 'raid' },
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

export default function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, setQuickCaptureOpen } = useUIStore();
  const tasks = useTaskStore((s) => s.tasks);
  const { risks, issues, decisions, actions, communications, milestones, projectConfig } = useDataStore();

  const today = new Date().toISOString().split('T')[0];

  // Reactively calculate notification badges based on live store data
  const badges = useMemo(() => {
    const activeTasks = tasks.filter((t) => !t.isBacklog);
    const overdueTasks = activeTasks.filter(
      (t) => t.dueDate && t.dueDate < today && !['done', 'cancelled'].includes(t.status)
    ).length;
    const blockedTasks = activeTasks.filter((t) => t.status === 'blocked').length;
    const tasksCount = overdueTasks + blockedTasks;

    // Active high or critical risks that are not resolved/closed/accepted
    const openRisks = risks.filter(
      (r) => !['closed', 'accepted'].includes(r.status) && (r.severity === 'critical' || r.severity === 'high')
    ).length;

    // Active issues (not resolved or closed)
    const openIssues = issues.filter(
      (i) => ['open', 'in-progress', 'escalated'].includes(i.status)
    ).length;

    // Pending decisions (proposed, under-discussion, decision-required)
    // When resolved (approved, rejected, superseded), count decreases immediately!
    const pendingDecisions = decisions.filter(
      (d) => ['proposed', 'under-discussion', 'decision-required'].includes(d.status)
    ).length;

    // Overdue open actions
    const overdueActions = actions.filter(
      (a) => a.dueDate && a.dueDate < today && !['done', 'cancelled'].includes(a.status)
    ).length;

    // Overdue communication responses or follow-ups
    const overdueComms = communications.filter(
      (c) =>
        (c.status === 'awaiting-response' && c.expectedResponseDate && c.expectedResponseDate < today) ||
        (c.followUpRequired && !['closed', 'response-received'].includes(c.status) && c.nextFollowUpDate && c.nextFollowUpDate < today)
    ).length;

    // Delayed or at-risk milestones
    const delayedMilestones = milestones.filter(
      (m) => m.status === 'delayed' || m.status === 'at-risk'
    ).length;

    // RAID combined alert count
    const raidAlerts = openRisks + openIssues + pendingDecisions;

    const map: Record<string, BadgeInfo> = {};
    if (tasksCount > 0) map.tasks = { count: tasksCount, level: 'danger' };
    if (openRisks > 0) map.risks = { count: openRisks, level: 'danger' };
    if (openIssues > 0) map.issues = { count: openIssues, level: 'danger' };
    if (pendingDecisions > 0) map.decisions = { count: pendingDecisions, level: 'warning' };
    if (overdueActions > 0) map.actions = { count: overdueActions, level: 'warning' };
    if (overdueComms > 0) map.comms = { count: overdueComms, level: 'warning' };
    if (delayedMilestones > 0) map.milestones = { count: delayedMilestones, level: 'warning' };
    if (raidAlerts > 0) map.raid = { count: raidAlerts, level: 'danger' };

    return map;
  }, [tasks, risks, issues, decisions, actions, communications, milestones, today]);

  const projectName = projectConfig?.name || 'Customer Portal Migration';
  const projectCode = projectConfig?.code || 'CPM-2026';

  function getBadge(badgeKey?: string): BadgeInfo | null {
    if (!badgeKey) return null;
    return badges[badgeKey] ?? null;
  }

  return (
    <nav className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
      {/* Header */}
      <div className="sidebar-header" style={sidebarCollapsed ? { justifyContent: 'center', padding: '10px 8px' } : undefined}>
        {sidebarCollapsed ? (
          <button
            className="btn-icon btn-ghost"
            style={{
              color: 'var(--text-sidebar-active)',
              background: 'var(--bg-sidebar-hover)',
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
            }}
            onClick={() => setSidebarCollapsed(false)}
            title="Expand sidebar"
            id="sidebar-expand-btn"
          >
            <ChevronRight size={18} />
          </button>
        ) : (
          <>
            <div className="sidebar-logo">
              <LayoutDashboard />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="sidebar-project-name truncate" title={projectName}>{projectName}</div>
              {projectCode && <div className="sidebar-project-code">{projectCode}</div>}
            </div>
            <button
              className="btn-icon btn-ghost"
              style={{ color: 'var(--text-sidebar)', flexShrink: 0 }}
              onClick={() => setSidebarCollapsed(true)}
              title="Collapse sidebar"
              id="sidebar-collapse-btn"
            >
              <ChevronLeft size={16} />
            </button>
          </>
        )}
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
                        <span className={`nav-badge ${badge.level === 'warning' ? 'warning' : ''}`}>
                          {badge.count}
                        </span>
                      ) : null}
                    </>
                  )}
                  {sidebarCollapsed && badge ? (
                    <span
                      style={{
                        position: 'absolute',
                        right: 4,
                        top: 4,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: badge.level === 'warning' ? 'var(--warning)' : 'var(--danger)',
                      }}
                      title={`${item.label}: ${badge.count}`}
                    />
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
