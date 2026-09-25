import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CheckSquare, Zap, Scale, MessageSquare, Shield,
  TrendingUp, Clock, Users, Calendar, ArrowRight, Flame, Milestone,
  Activity, Target, BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { taskQueries } from '../db/queries/tasks';
import {
  riskQueries, issueQueries, decisionQueries, actionQueries,
  communicationQueries, absenceQueries, milestoneQueries, activityQueries,
  projectConfigQueries,
} from '../db/queries';
import { StatusBadge, PriorityBadge, SeverityBadge, DateDisplay, ProgressBar, Avatar } from '../components/ui/shared';
import { format, differenceInDays, parseISO } from 'date-fns';

function computeBurndownData(totalTasks: number, doneTasks: number) {
  const remaining = Math.max(0, totalTasks - doneTasks);
  return [
    { period: 'Week -4', Ideal: totalTasks, Remaining: totalTasks },
    { period: 'Week -2', Ideal: Math.round(totalTasks * 0.8), Remaining: Math.round(totalTasks * 0.85) },
    { period: 'Current', Ideal: Math.round(totalTasks * 0.6), Remaining: remaining },
    { period: 'Week +2', Ideal: Math.round(totalTasks * 0.4), Projected: Math.max(0, Math.round(remaining * 0.65)) },
    { period: 'Week +4', Ideal: Math.round(totalTasks * 0.2), Projected: Math.max(0, Math.round(remaining * 0.3)) },
    { period: 'Target', Ideal: 0, Projected: 0 },
  ];
}

function useProjectSnapshot() {
  const config = projectConfigQueries.get();
  const taskStats = taskQueries.getStats() as Record<string, number>;
  const tasks = taskQueries.getAll();
  const overdueTasks = taskQueries.getOverdue();
  const blockedTasks = taskQueries.getBlocked();
  const upcomingMilestones = milestoneQueries.getUpcoming(30);
  const openRisks = riskQueries.getOpen();
  const openIssues = issueQueries.getOpen();
  const pendingDecisions = decisionQueries.getPending();
  const openActions = actionQueries.getOpen();
  const overdueActions = actionQueries.getOverdue();
  const awaitingComms = communicationQueries.getAwaitingResponse();
  const overdueComms = communicationQueries.getOverdueResponses();
  const upcomingAbsences = absenceQueries.getUpcoming(14);
  const activity = activityQueries.getRecent(20);

  const criticalRisks = openRisks.filter(r => r.severity === 'critical' || r.severity === 'high');
  const criticalIssues = openIssues.filter(i => i.severity === 'critical' || i.severity === 'high');
  const decisionRequired = pendingDecisions.filter(d => d.status === 'decision-required');

  const totalTasks = tasks.filter(t => !t.isBacklog).length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const daysToDelivery = config?.targetDate ? differenceInDays(parseISO(config.targetDate), new Date()) : null;
  const nextMilestone = upcomingMilestones[0];
  const daysToNextMilestone = nextMilestone?.targetDate ? differenceInDays(parseISO(nextMilestone.targetDate), new Date()) : null;

  // Project health score (0 - 100)
  let healthScore = 100;
  healthScore -= Math.min(35, overdueTasks.length * 7);
  healthScore -= Math.min(25, blockedTasks.length * 6);
  healthScore -= Math.min(25, criticalRisks.length * 8);
  healthScore -= Math.min(20, criticalIssues.length * 6);
  healthScore -= Math.min(15, decisionRequired.length * 4);
  healthScore = Math.max(0, Math.min(100, healthScore));

  const healthLabel = healthScore >= 80 ? 'Healthy' : healthScore >= 60 ? 'Needs Attention' : 'At Risk';
  const healthColor = healthScore >= 80 ? 'var(--success)' : healthScore >= 60 ? 'var(--warning)' : 'var(--danger)';

  return {
    config, taskStats, overdueTasks, blockedTasks, upcomingMilestones, openRisks, openIssues,
    pendingDecisions, openActions, overdueActions, awaitingComms, overdueComms, upcomingAbsences,
    activity, criticalRisks, criticalIssues, decisionRequired, progress, daysToDelivery,
    nextMilestone, daysToNextMilestone, totalTasks, doneTasks, healthScore, healthLabel, healthColor,
  };
}

// Attention item types
type AttentionItemData = {
  id: string; level: 'critical' | 'warning' | 'info'; type: string;
  title: string; description: string; link: string;
};

function buildAttentionItems(snapshot: ReturnType<typeof useProjectSnapshot>): AttentionItemData[] {
  const items: AttentionItemData[] = [];
  const today = new Date().toISOString().split('T')[0];

  snapshot.overdueTasks.forEach(t => items.push({
    id: `ot-${t.id}`, level: 'critical', type: 'Overdue Task',
    title: t.title, description: `Due ${t.dueDate} · Owner: ${t.owner || 'Unassigned'}`,
    link: '/tasks',
  }));

  snapshot.blockedTasks.forEach(t => items.push({
    id: `bt-${t.id}`, level: 'critical', type: 'Blocked Task',
    title: t.title, description: t.blockingReason || 'No reason specified',
    link: '/tasks',
  }));

  snapshot.criticalIssues.forEach(i => items.push({
    id: `iss-${i.id}`, level: 'critical', type: 'Critical Issue',
    title: i.title, description: i.impact || i.description.slice(0, 80),
    link: '/issues',
  }));

  snapshot.criticalRisks.forEach(r => items.push({
    id: `risk-${r.id}`, level: r.severity === 'critical' ? 'critical' : 'warning', type: 'Risk',
    title: r.title, description: `${r.severity.toUpperCase()} — Owner: ${r.owner}`,
    link: '/risks',
  }));

  snapshot.decisionRequired.forEach(d => items.push({
    id: `dec-${d.id}`, level: 'warning', type: 'Decision Required',
    title: d.title, description: `Deadline: ${d.deadline || 'No deadline'} · Owner: ${d.owner}`,
    link: '/decisions',
  }));

  snapshot.overdueComms.forEach(c => items.push({
    id: `comm-${c.id}`, level: 'warning', type: 'Overdue Response',
    title: c.subject, description: `Expected ${c.expectedResponseDate} · To: ${c.recipients}`,
    link: '/communications',
  }));

  snapshot.overdueActions.forEach(a => items.push({
    id: `act-${a.id}`, level: 'warning', type: 'Overdue Action',
    title: a.action, description: `Due ${a.dueDate} · Owner: ${a.owner}`,
    link: '/actions',
  }));

  snapshot.upcomingAbsences
    .filter(a => { const d = differenceInDays(parseISO(a.startDate), new Date()); return d <= 5 && d >= 0; })
    .forEach(a => items.push({
      id: `abs-${a.id}`, level: 'info', type: 'Upcoming Absence',
      title: `${a.resourceName} — ${a.type}`,
      description: `${a.startDate} → ${a.endDate}`,
      link: '/calendar',
    }));

  return items;
}

const LEVEL_COLORS = {
  critical: { bg: 'var(--danger-bg)', text: 'var(--danger)', border: 'var(--danger-border)' },
  warning: { bg: 'var(--warning-bg)', text: 'var(--warning)', border: 'var(--warning-border)' },
  info: { bg: 'var(--info-bg)', text: 'var(--info)', border: 'var(--info-border)' },
};

const LEVEL_ICONS = {
  critical: Flame, warning: AlertTriangle, info: Calendar,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const snap = useProjectSnapshot();
  const attentionItems = useMemo(() => buildAttentionItems(snap), [snap]);
  const burndownData = useMemo(() => computeBurndownData(snap.totalTasks, snap.doneTasks), [snap.totalTasks, snap.doneTasks]);
  const [activityExpanded, setActivityExpanded] = useState(false);

  const projectName = snap.config?.name || 'New Project';
  const projectStatus = snap.config?.status || 'on-track';
  const projectPhase = snap.config?.currentPhase || '';
  const statusNote = snap.config?.statusNote || '';
  const targetDate = snap.config?.targetDate || '';
  const manager = snap.config?.manager || '';

  const statusColors: Record<string, string> = {
    'on-track': 'var(--success)', 'at-risk': 'var(--warning)',
    'off-track': 'var(--danger)', 'on-hold': 'var(--text-muted)', completed: 'var(--teal)',
  };
  const statusColor = statusColors[projectStatus] || 'var(--text-muted)';

  return (
    <div>
      {/* Project Banner */}
      <div className="card" style={{ marginBottom: 24, padding: '20px 24px', background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--accent-soft) 100%)', borderColor: 'var(--accent-glow)' }}>
        <div className="flex items-center gap-4">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="page-title">{projectName}</h1>
              <span className="badge" style={{ background: `${statusColor}22`, color: statusColor, borderColor: `${statusColor}44`, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>
                <span className="badge-dot" style={{ background: statusColor }} />
                {projectStatus.replace(/-/g, ' ')}
              </span>
              {projectPhase && <span className="badge status-in-progress">{projectPhase}</span>}
            </div>
            {statusNote && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{statusNote}</p>}
          </div>
          <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
            {targetDate && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target Delivery</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{format(parseISO(targetDate), 'MMM d, yyyy')}</div>
                {snap.daysToDelivery !== null && (
                  <div style={{ fontSize: 'var(--text-xs)', color: snap.daysToDelivery < 30 ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {snap.daysToDelivery} days remaining
                  </div>
                )}
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Health Score</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 'var(--text-2xl)', color: snap.healthColor }}>{snap.healthScore}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>/100</span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: snap.healthColor }}>{snap.healthLabel}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Progress</div>
              <div style={{ fontWeight: 800, fontSize: 'var(--text-2xl)', color: 'var(--text-primary)' }}>{snap.progress}%</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <ProgressBar value={snap.progress} color={statusColor} />
        </div>
      </div>

      {/* KPI Grid */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard value={snap.taskStats.overdue || 0} label="Overdue Tasks" icon={Clock} color="var(--danger)" bgColor="var(--danger-bg)" onClick={() => navigate('/tasks')} />
        <StatCard value={snap.taskStats.blocked || 0} label="Blocked Tasks" icon={Shield} color="var(--danger)" bgColor="var(--danger-bg)" onClick={() => navigate('/tasks')} />
        <StatCard value={snap.openIssues.length} label="Open Issues" icon={Flame} color="var(--warning)" bgColor="var(--warning-bg)" onClick={() => navigate('/issues')} />
        <StatCard value={snap.criticalRisks.length} label="Critical Risks" icon={AlertTriangle} color="var(--orange)" bgColor="var(--orange-bg)" onClick={() => navigate('/risks')} />
        <StatCard value={snap.pendingDecisions.length} label="Pending Decisions" icon={Scale} color="var(--purple)" bgColor="var(--purple-bg)" onClick={() => navigate('/decisions')} />
        <StatCard value={snap.awaitingComms.length} label="Awaiting Response" icon={MessageSquare} color="var(--teal)" bgColor="var(--teal-bg)" onClick={() => navigate('/communications')} />
        <StatCard value={snap.openActions.length} label="Open Actions" icon={Zap} color="var(--accent)" bgColor="var(--accent-soft)" onClick={() => navigate('/actions')} />
        <StatCard
          value={snap.nextMilestone ? `${snap.daysToNextMilestone}d` : '—'}
          label="Next Milestone"
          icon={Milestone}
          color="var(--success)"
          bgColor="var(--success-bg)"
          sub={snap.nextMilestone?.name}
          onClick={() => navigate('/milestones')}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Attention Required */}
          {attentionItems.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div style={{ width: 32, height: 32, background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={16} color="var(--danger)" />
                </div>
                <span className="section-title">Attention Required</span>
                <span className="badge priority-high" style={{ marginLeft: 'auto' }}>{attentionItems.length} items</span>
              </div>
              <div>
                {attentionItems.slice(0, 12).map(item => {
                  const colors = LEVEL_COLORS[item.level];
                  const Icon = LEVEL_ICONS[item.level];
                  return (
                    <div
                      key={item.id}
                      className="attention-item"
                      onClick={() => navigate(item.link)}
                    >
                      <div className="attention-icon" style={{ background: colors.bg, color: colors.text }}>
                        <Icon size={14} />
                      </div>
                      <div className="attention-content">
                        <div className="attention-title">{item.title}</div>
                        <div className="attention-meta">
                          <span style={{ color: colors.text, fontWeight: 600, fontSize: 10 }}>{item.type}</span>
                          {' · '}
                          {item.description}
                        </div>
                      </div>
                      <ArrowRight size={14} color="var(--text-muted)" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upcoming Milestones */}
          {snap.upcomingMilestones.length > 0 && (
            <div className="card">
              <div className="card-header">
                <Milestone size={18} color="var(--accent)" />
                <span className="section-title">Upcoming Milestones</span>
                <button className="btn btn-ghost btn-sm ml-auto" onClick={() => navigate('/milestones')}>
                  View all <ArrowRight size={12} />
                </button>
              </div>
              {snap.upcomingMilestones.map(m => {
                const days = differenceInDays(parseISO(m.targetDate), new Date());
                const urgencyColor = days <= 7 ? 'var(--danger)' : days <= 14 ? 'var(--warning)' : 'var(--text-muted)';
                return (
                  <div key={m.id} style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-subtle)' }} onClick={() => navigate('/milestones')} className="cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 6 }}>{m.name}</div>
                        <ProgressBar value={m.progress} />
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, color: urgencyColor, fontSize: 'var(--text-sm)' }}>
                          {days === 0 ? 'Today' : days < 0 ? `${Math.abs(days)}d late` : `${days}d`}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {format(parseISO(m.targetDate), 'MMM d')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Task Burndown & Delivery Trajectory Card */}
          {snap.totalTasks > 0 && (
            <div className="card">
              <div className="card-header">
                <TrendingUp size={18} color="var(--accent)" />
                <span className="section-title">Task Burndown & Trajectory</span>
                <span className="badge badge-primary" style={{ marginLeft: 'auto', fontSize: 11 }}>
                  {snap.doneTasks} of {snap.totalTasks} completed ({snap.progress}%)
                </span>
              </div>
              <div style={{ height: 210, padding: '12px 16px 8px 8px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={burndownData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                    <XAxis dataKey="period" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-card)',
                        borderColor: 'var(--border)',
                        borderRadius: 8,
                        fontSize: 12,
                        boxShadow: 'var(--shadow-md)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <Line
                      type="monotone"
                      dataKey="Ideal"
                      stroke="var(--text-muted)"
                      strokeDasharray="4 4"
                      dot={false}
                      strokeWidth={1.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="Remaining"
                      stroke="var(--accent)"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: 'var(--accent)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Projected"
                      stroke="#4ff7a8"
                      strokeDasharray="3 3"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#4ff7a8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Who am I waiting for? */}
          {snap.awaitingComms.length > 0 && (
            <div className="card">
              <div className="card-header">
                <MessageSquare size={18} color="var(--teal)" />
                <span className="section-title">Awaiting Response From</span>
                <button className="btn btn-ghost btn-sm ml-auto" onClick={() => navigate('/communications')}>
                  View all <ArrowRight size={12} />
                </button>
              </div>
              {snap.awaitingComms.slice(0, 5).map(c => {
                const isOverdue = c.expectedResponseDate && c.expectedResponseDate < new Date().toISOString().split('T')[0];
                return (
                  <div key={c.id} className="attention-item" onClick={() => navigate('/communications')}>
                    <Avatar name={c.recipients.split(',')[0].trim()} size={32} />
                    <div className="attention-content">
                      <div className="attention-title">{c.subject}</div>
                      <div className="attention-meta">
                        <span style={{ color: 'var(--text-secondary)' }}>→ {c.recipients}</span>
                        {c.expectedResponseDate && (
                          <span style={{ color: isOverdue ? 'var(--danger)' : 'var(--text-muted)', marginLeft: 8 }}>
                            Expected: {c.expectedResponseDate}
                          </span>
                        )}
                      </div>
                    </div>
                    {isOverdue && <span className="badge priority-high" style={{ flexShrink: 0 }}>Overdue</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Top Risks */}
          <div className="card">
            <div className="card-header">
              <AlertTriangle size={18} color="var(--warning)" />
              <span className="section-title">Top Risks</span>
              <button className="btn btn-ghost btn-sm ml-auto" onClick={() => navigate('/risks')}>
                All <ArrowRight size={12} />
              </button>
            </div>
            {snap.openRisks.slice(0, 5).map(r => (
              <div key={r.id} className="attention-item" onClick={() => navigate('/risks')}>
                <SeverityBadge severity={r.severity} />
                <div className="attention-content">
                  <div className="attention-title">{r.title}</div>
                  <div className="attention-meta">P{r.probability} × I{r.impact} · {r.owner || 'Unassigned'}</div>
                </div>
              </div>
            ))}
            {snap.openRisks.length === 0 && (
              <div style={{ padding: '20px 24px', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>
                ✓ No open risks
              </div>
            )}
          </div>

          {/* Upcoming Absences */}
          {snap.upcomingAbsences.length > 0 && (
            <div className="card">
              <div className="card-header">
                <Calendar size={18} color="var(--info)" />
                <span className="section-title">Team Absences</span>
                <button className="btn btn-ghost btn-sm ml-auto" onClick={() => navigate('/calendar')}>
                  Calendar <ArrowRight size={12} />
                </button>
              </div>
              {snap.upcomingAbsences.slice(0, 5).map(a => {
                const days = differenceInDays(parseISO(a.startDate), new Date());
                return (
                  <div key={a.id} className="attention-item" onClick={() => navigate('/calendar')}>
                    <Avatar name={a.resourceName} size={28} />
                    <div className="attention-content">
                      <div className="attention-title">{a.resourceName}</div>
                      <div className="attention-meta">
                        {a.type} · {a.startDate} → {a.endDate}
                      </div>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: days <= 3 ? 'var(--warning)' : 'var(--text-muted)', flexShrink: 0 }}>
                      {days === 0 ? 'Today' : days < 0 ? 'Now' : `in ${days}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <Activity size={18} color="var(--accent)" />
              <span className="section-title">Recent Activity</span>
              {snap.activity.length > 10 && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginLeft: 'auto', fontSize: 11 }}
                  onClick={() => setActivityExpanded(e => !e)}
                >
                  {activityExpanded ? 'Show less' : `Show all ${snap.activity.length}`}
                </button>
              )}
            </div>
            <div style={{ padding: '8px 0' }}>
              {(activityExpanded ? snap.activity : snap.activity.slice(0, 10)).map(a => (
                <div key={a.id} className="timeline-item" style={{ padding: '6px 20px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 7 }} />
                  <div className="attention-content">
                    <div className="attention-title" style={{ fontSize: 'var(--text-xs)' }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{a.entityType}</span>
                      {' '}{a.action}:{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{a.entityTitle}</span>
                    </div>
                    <div className="attention-meta">
                      {format(new Date(a.createdAt), 'MMM d, HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
              {snap.activity.length === 0 && (
                <div style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  No recent activity yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  value, label, icon: Icon, color, bgColor, sub, onClick
}: {
  value: number | string; label: string; icon: React.ElementType;
  color: string; bgColor: string; sub?: string; onClick?: () => void;
}) {
  return (
    <div
      className="stat-card"
      style={{ '--stat-accent': color, '--stat-accent-bg': bgColor, cursor: onClick ? 'pointer' : 'default' } as React.CSSProperties}
      onClick={onClick}
    >
      <div className="stat-icon">
        <Icon />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub truncate">{sub}</div>}
    </div>
  );
}
