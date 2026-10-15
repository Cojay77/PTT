import { useState, useMemo } from 'react';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { Clock, Calendar, AlertCircle, ChevronRight, User, CheckCircle2 } from 'lucide-react';
import type { Task, Priority } from '../../types';
import { StatusBadge, PriorityBadge } from '../ui/shared';

interface TaskDeadlinesTimelineProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

type Horizon = '14' | '30' | '60' | 'all';

const PRIORITY_COLORS: Record<Priority, string> = {
  critical: 'var(--danger)',
  high: 'var(--warning)',
  medium: 'var(--accent)',
  low: 'var(--text-muted)',
  none: 'var(--border)',
};

export function TaskDeadlinesTimeline({ tasks, onEditTask }: TaskDeadlinesTimelineProps) {
  const [horizon, setHorizon] = useState<Horizon>('30');
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);

  // Filter to active tasks with a due date
  const activeDatedTasks = useMemo(() => {
    return tasks
      .filter(t => !t.isBacklog && t.dueDate && !['done', 'cancelled'].includes(t.status))
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  }, [tasks]);

  // Compute horizon cutoff
  const maxDateStr = useMemo(() => {
    if (horizon === 'all') return '9999-12-31';
    const days = parseInt(horizon, 10);
    return addDays(today, days).toISOString().split('T')[0];
  }, [horizon, today]);

  // Tasks in current horizon scope
  const scopedTasks = useMemo(() => {
    return activeDatedTasks.filter(t => (t.dueDate || '') <= maxDateStr);
  }, [activeDatedTasks, maxDateStr]);

  // Segment tasks into time buckets
  const overdueTasks = useMemo(() => scopedTasks.filter(t => (t.dueDate || '') < todayStr), [scopedTasks, todayStr]);
  const dueTodayTasks = useMemo(() => scopedTasks.filter(t => t.dueDate === todayStr), [scopedTasks, todayStr]);

  const dueThisWeekTasks = useMemo(() => {
    const endOfWeekStr = addDays(today, 7).toISOString().split('T')[0];
    return scopedTasks.filter(t => (t.dueDate || '') > todayStr && (t.dueDate || '') <= endOfWeekStr);
  }, [scopedTasks, today, todayStr]);

  const dueLaterTasks = useMemo(() => {
    const endOfWeekStr = addDays(today, 7).toISOString().split('T')[0];
    return scopedTasks.filter(t => (t.dueDate || '') > endOfWeekStr);
  }, [scopedTasks, today]);

  // Helper for human-friendly countdown label
  function getRelativeDueLabel(dueDateStr: string): { label: string; isPast: boolean; isToday: boolean } {
    try {
      const d = parseISO(dueDateStr);
      const diff = differenceInDays(d, today);
      if (diff === 0) return { label: 'Due Today', isPast: false, isToday: true };
      if (diff === 1) return { label: 'Tomorrow', isPast: false, isToday: false };
      if (diff === -1) return { label: '1 day late', isPast: true, isToday: false };
      if (diff < -1) return { label: `${Math.abs(diff)} days late`, isPast: true, isToday: false };
      if (diff <= 7) return { label: `In ${diff} days`, isPast: false, isToday: false };
      const weeks = Math.round(diff / 7);
      return { label: `In ~${weeks}w (${diff}d)`, isPast: false, isToday: false };
    } catch {
      return { label: dueDateStr, isPast: false, isToday: false };
    }
  }

  // Linear axis calculations
  const timelineBounds = useMemo(() => {
    if (scopedTasks.length === 0) return null;
    const earliestStr = overdueTasks.length > 0 ? overdueTasks[0].dueDate! : todayStr;
    const daysOffset = horizon === 'all' ? 45 : parseInt(horizon, 10);
    const latestStr = addDays(today, Math.max(daysOffset, 14)).toISOString().split('T')[0];

    const startDate = parseISO(earliestStr);
    const endDate = parseISO(latestStr);
    const totalDays = Math.max(1, differenceInDays(endDate, startDate));

    return { startDate, endDate, totalDays, earliestStr, latestStr };
  }, [scopedTasks, overdueTasks, today, todayStr, horizon]);

  function getPositionPercent(dateStr: string): number {
    if (!timelineBounds) return 0;
    try {
      const d = parseISO(dateStr);
      const offset = differenceInDays(d, timelineBounds.startDate);
      const pct = (offset / timelineBounds.totalDays) * 100;
      return Math.max(1, Math.min(99, pct));
    } catch {
      return 0;
    }
  }

  const todayPercent = timelineBounds ? getPositionPercent(todayStr) : 0;

  return (
    <div
      className="card"
      style={{
        marginTop: 24,
        padding: 0,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        background: 'var(--bg-surface)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          background: 'var(--bg-elevated)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                Upcoming Task Deadlines Timeline
              </span>
              <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                {scopedTasks.length} with deadline
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Interactive delivery roadmap · Click any card to inspect or edit task details
            </div>
          </div>
        </div>

        {/* Quick KPI badges + Horizon toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5" style={{ fontSize: 11 }}>
            {overdueTasks.length > 0 && (
              <span
                className="badge"
                style={{
                  background: 'rgba(247, 79, 79, 0.15)',
                  color: 'var(--danger)',
                  border: '1px solid rgba(247, 79, 79, 0.3)',
                  fontWeight: 700,
                  fontSize: 10,
                }}
              >
                ● {overdueTasks.length} Overdue
              </span>
            )}
            {dueTodayTasks.length > 0 && (
              <span
                className="badge"
                style={{
                  background: 'rgba(247, 154, 79, 0.15)',
                  color: 'var(--warning)',
                  border: '1px solid rgba(247, 154, 79, 0.3)',
                  fontWeight: 700,
                  fontSize: 10,
                }}
              >
                ⚡ {dueTodayTasks.length} Due Today
              </span>
            )}
            <span
              className="badge"
              style={{
                background: 'rgba(79, 142, 247, 0.15)',
                color: 'var(--accent)',
                border: '1px solid rgba(79, 142, 247, 0.3)',
                fontWeight: 600,
                fontSize: 10,
              }}
            >
              📅 {dueThisWeekTasks.length} Next 7 Days
            </span>
          </div>

          {/* Horizon Selector */}
          <div className="flex items-center gap-1" style={{ background: 'var(--bg-surface)', padding: 2, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            {(['14', '30', '60', 'all'] as Horizon[]).map(h => (
              <button
                key={h}
                type="button"
                className="btn btn-ghost btn-xs"
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  height: 'auto',
                  fontWeight: horizon === h ? 700 : 500,
                  background: horizon === h ? 'var(--accent)' : 'transparent',
                  color: horizon === h ? 'white' : 'var(--text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                }}
                onClick={() => setHorizon(h)}
              >
                {h === 'all' ? 'All' : `${h}d`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {scopedTasks.length === 0 ? (
        <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Calendar size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
            No task deadlines in this horizon ({horizon === 'all' ? 'all time' : `next ${horizon} days`})
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            Assign due dates to active tasks to visualize your upcoming delivery roadmap.
          </div>
        </div>
      ) : (
        <div style={{ padding: '16px 20px' }}>
          {/* Continuous Proportional Time Axis */}
          {timelineBounds && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  position: 'relative',
                  height: 48,
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {/* Baseline rail */}
                <div
                  style={{
                    position: 'absolute',
                    left: '2%',
                    right: '2%',
                    height: 4,
                    background: 'var(--border)',
                    borderRadius: 2,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                />

                {/* TODAY vertical line and marker */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${todayPercent}%`,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: 'var(--danger)',
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--danger)',
                      color: 'white',
                      fontSize: 8,
                      fontWeight: 800,
                      padding: '1px 4px',
                      borderRadius: 3,
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    TODAY
                  </div>
                </div>

                {/* Milestone tick marks for timeline */}
                {scopedTasks.map(t => {
                  const pct = getPositionPercent(t.dueDate!);
                  const isLate = (t.dueDate || '') < todayStr;
                  const prioColor = PRIORITY_COLORS[t.priority] || 'var(--accent)';
                  return (
                    <div
                      key={t.id}
                      onClick={() => onEditTask(t)}
                      title={`${t.title} · Due: ${t.dueDate} (${t.priority} priority)`}
                      style={{
                        position: 'absolute',
                        left: `${pct}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: isLate ? 'var(--danger)' : prioColor,
                        border: '2px solid var(--bg-surface)',
                        cursor: 'pointer',
                        zIndex: 3,
                        boxShadow: '0 0 0 1px var(--border)',
                        transition: 'transform var(--transition-fast)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.4)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)')}
                    />
                  );
                })}

                {/* Start and End date labels */}
                <div
                  style={{
                    position: 'absolute',
                    left: 10,
                    bottom: 4,
                    fontSize: 9,
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {format(timelineBounds.startDate, 'MMM d')}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    right: 10,
                    bottom: 4,
                    fontSize: 9,
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {format(timelineBounds.endDate, 'MMM d, yyyy')}
                </div>
              </div>
            </div>
          )}

          {/* Grouped Chronological Roadmaps / Buckets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {/* OVERDUE BUCKET */}
            {overdueTasks.length > 0 && (
              <div
                style={{
                  background: 'rgba(247, 79, 79, 0.04)',
                  border: '1px solid rgba(247, 79, 79, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5" style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 12 }}>
                    <AlertCircle size={14} />
                    <span>Overdue ({overdueTasks.length})</span>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 600 }}>Needs Immediate Action</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {overdueTasks.map(t => (
                    <TaskDeadlineCard key={t.id} task={t} onEdit={onEditTask} relativeDue={getRelativeDueLabel(t.dueDate!)} />
                  ))}
                </div>
              </div>
            )}

            {/* DUE TODAY BUCKET */}
            {dueTodayTasks.length > 0 && (
              <div
                style={{
                  background: 'rgba(247, 154, 79, 0.05)',
                  border: '1px solid rgba(247, 154, 79, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5" style={{ color: 'var(--warning)', fontWeight: 700, fontSize: 12 }}>
                    <Clock size={14} />
                    <span>Due Today ({dueTodayTasks.length})</span>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--warning)', fontWeight: 600 }}>Target: Today</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dueTodayTasks.map(t => (
                    <TaskDeadlineCard key={t.id} task={t} onEdit={onEditTask} relativeDue={getRelativeDueLabel(t.dueDate!)} />
                  ))}
                </div>
              </div>
            )}

            {/* DUE NEXT 7 DAYS */}
            {dueThisWeekTasks.length > 0 && (
              <div
                style={{
                  background: 'rgba(79, 142, 247, 0.04)',
                  border: '1px solid rgba(79, 142, 247, 0.22)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 12 }}>
                    <Calendar size={14} />
                    <span>Next 7 Days ({dueThisWeekTasks.length})</span>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Sprint Priority</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dueThisWeekTasks.map(t => (
                    <TaskDeadlineCard key={t.id} task={t} onEdit={onEditTask} relativeDue={getRelativeDueLabel(t.dueDate!)} />
                  ))}
                </div>
              </div>
            )}

            {/* LATER TASKS */}
            {dueLaterTasks.length > 0 && (
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: 12 }}>
                    <CheckCircle2 size={14} />
                    <span>Upcoming Deadlines ({dueLaterTasks.length})</span>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Upcoming Horizon</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dueLaterTasks.slice(0, 10).map(t => (
                    <TaskDeadlineCard key={t.id} task={t} onEdit={onEditTask} relativeDue={getRelativeDueLabel(t.dueDate!)} />
                  ))}
                  {dueLaterTasks.length > 10 && (
                    <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', paddingTop: 4 }}>
                      +{dueLaterTasks.length - 10} more tasks with upcoming deadlines
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskDeadlineCard({
  task,
  onEdit,
  relativeDue,
}: {
  task: Task;
  onEdit: (t: Task) => void;
  relativeDue: { label: string; isPast: boolean; isToday: boolean };
}) {
  const prioColor = PRIORITY_COLORS[task.priority] || 'var(--accent)';

  return (
    <div
      onClick={() => onEdit(task)}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${task.priority === 'critical' ? 'var(--danger)' : prioColor}`,
        borderRadius: 'var(--radius-sm)',
        padding: '8px 10px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        transition: 'border var(--transition-fast), transform var(--transition-fast)',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }} className="truncate">
          {task.title}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap" style={{ fontSize: 10 }}>
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {task.owner && (
            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <User size={10} /> {task.owner}
            </span>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: relativeDue.isPast
              ? 'var(--danger)'
              : relativeDue.isToday
              ? 'var(--warning)'
              : 'var(--text-primary)',
          }}
        >
          {task.dueDate ? format(parseISO(task.dueDate), 'MMM d') : ''}
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: relativeDue.isPast
              ? 'var(--danger)'
              : relativeDue.isToday
              ? 'var(--warning)'
              : 'var(--text-muted)',
          }}
        >
          {relativeDue.label}
        </div>
      </div>
    </div>
  );
}
