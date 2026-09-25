import { useDataStore } from '../store/useDataStore';
import { useTaskStore } from '../store/useTaskStore';
import { ProgressBar, MilestoneBadge } from '../components/ui/shared';
import { format, parseISO, differenceInDays } from 'date-fns';

const TRACK_COLORS: Record<string, string> = {
  Development: '#4f8ef7', Infrastructure: '#7c6af7', Migration: '#f79a4f',
  Planning: '#4fd9f7', Quality: '#4ff7a8', Design: '#f7d14f',
};

export default function Timeline() {
  const { milestones } = useDataStore();
  const { tasks } = useTaskStore();

  // Filter milestones that have a target date (undated ones would produce Invalid Date)
  const sorted = milestones
    .filter(m => m.targetDate)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  const undated = milestones.filter(m => !m.targetDate);

  if (milestones.length === 0) {
    return (
      <div>
        <h1 className="page-title mb-6">Project Timeline</h1>
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          No milestones to display. Add milestones to see the timeline.
        </div>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div>
        <h1 className="page-title mb-6">Project Timeline</h1>
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          All {milestones.length} milestone{milestones.length > 1 ? 's have' : ' has'} no target date set. Add dates to see the timeline.
        </div>
      </div>
    );
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Timeline bounds — safe because sorted only contains dated milestones
  const firstDate = sorted[0].targetDate;
  const lastDate = sorted[sorted.length - 1].targetDate;
  const startDate = new Date(firstDate);
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date(lastDate);
  endDate.setDate(endDate.getDate() + 30);
  const totalDays = differenceInDays(endDate, startDate);

  function getX(dateStr: string): string {
    const d = parseISO(dateStr);
    const offset = differenceInDays(d, startDate);
    return `${Math.max(0, Math.min(100, (offset / totalDays) * 100))}%`;
  }

  const todayX = getX(todayStr);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Project Timeline</h1>
        <p className="page-subtitle">
          {sorted.length} milestone{sorted.length !== 1 ? 's' : ''} on timeline
          {undated.length > 0 && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>· {undated.length} without date</span>}
        </p>
      </div>

      {/* Gantt-style timeline */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div className="section-title">Milestone Timeline</div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 800, padding: '20px 32px' }}>
            {/* Time axis */}
            <div style={{ position: 'relative', height: 32, marginLeft: 220, marginBottom: 8 }}>
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(startDate);
                d.setDate(d.getDate() + Math.floor((totalDays / 6) * i));
                const x = ((differenceInDays(d, startDate) / totalDays) * 100);
                return (
                  <div key={i} style={{ position: 'absolute', left: `${x}%`, transform: 'translateX(-50%)', fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {format(d, 'MMM d')}
                  </div>
                );
              })}
              {/* Today line */}
              <div style={{ position: 'absolute', left: todayX, top: -4, width: 2, height: 'calc(100% + 4px)', background: 'var(--danger)', opacity: 0.8 }} />
            </div>

            {/* Milestone rows */}
            {sorted.map(m => {
              const mTasks = tasks.filter(t => t.milestoneId === m.id && !t.isBacklog);
              const daysLeft = m.targetDate ? differenceInDays(parseISO(m.targetDate), today) : null;
              const isLate = m.targetDate && m.targetDate < todayStr && m.status !== 'completed';
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 16, minHeight: 44 }}>
                  {/* Label */}
                  <div style={{ width: 220, flexShrink: 0, paddingRight: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                    <div style={{ marginTop: 2 }}><MilestoneBadge status={isLate ? 'delayed' : m.status} /></div>
                  </div>

                  {/* Bar track */}
                  <div style={{ flex: 1, position: 'relative', height: 36, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                    {/* Today line */}
                    <div style={{ position: 'absolute', left: todayX, top: 0, width: 2, height: '100%', background: 'var(--danger)', opacity: 0.6, zIndex: 2 }} />

                    {/* Milestone marker */}
                    {m.targetDate && (
                      <div style={{ position: 'absolute', left: getX(m.targetDate), top: '50%', transform: 'translate(-50%, -50%)', zIndex: 3 }}>
                        <div style={{
                          width: 16, height: 16,
                          background: m.status === 'completed' ? 'var(--success)' : isLate ? 'var(--danger)' : m.status === 'at-risk' ? 'var(--warning)' : 'var(--accent)',
                          borderRadius: 3, transform: 'rotate(45deg)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        }} title={`${m.name}: ${m.targetDate}`} />
                      </div>
                    )}

                    {/* Task indicators */}
                    {mTasks.filter(t => t.dueDate).slice(0, 5).map(t => (
                      <div key={t.id} style={{
                        position: 'absolute', left: getX(t.dueDate!), top: '50%', transform: 'translate(-50%, -50%)',
                        width: 6, height: 6, borderRadius: '50%',
                        background: t.status === 'done' ? 'var(--success)' : t.status === 'blocked' ? 'var(--danger)' : 'var(--text-muted)',
                        opacity: 0.7, zIndex: 1,
                      }} title={t.title} />
                    ))}

                    {/* Progress fill from start */}
                    {m.targetDate && m.progress > 0 && (
                      <div style={{
                        position: 'absolute', left: 0, top: '25%', height: '50%',
                        width: `calc(${getX(m.targetDate)} * ${m.progress / 100})`,
                        background: 'var(--accent)', opacity: 0.25, borderRadius: 4,
                        maxWidth: getX(m.targetDate),
                      }} />
                    )}

                    {/* Date label */}
                    {m.targetDate && (
                      <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: isLate ? 'var(--danger)' : 'var(--text-muted)', fontWeight: daysLeft !== null && Math.abs(daysLeft) <= 7 ? 700 : 400 }}>
                        {format(parseISO(m.targetDate), 'MMM d')}
                        {daysLeft !== null && ` (${daysLeft < 0 ? `${Math.abs(daysLeft)}d late` : `${daysLeft}d`})`}
                      </div>
                    )}
                  </div>

                  {/* Progress */}
                  <div style={{ width: 60, flexShrink: 0, textAlign: 'right', paddingLeft: 12, fontSize: 12, fontWeight: 700, color: m.progress === 100 ? 'var(--success)' : 'var(--text-muted)' }}>
                    {m.progress}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Milestone table */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><span className="section-title">Milestone Details</span></div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Milestone</th>
                <th>Status</th>
                <th>Target Date</th>
                <th>Days Left</th>
                <th>Progress</th>
                <th>Owner</th>
                <th>Tasks</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(m => {
                const mTasks = tasks.filter(t => t.milestoneId === m.id && !t.isBacklog);
                const daysLeft = m.targetDate ? differenceInDays(parseISO(m.targetDate), today) : null;
                const isLate = m.targetDate && m.targetDate < todayStr && m.status !== 'completed';
                return (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                    <td><MilestoneBadge status={isLate ? 'delayed' : m.status} /></td>
                    <td>{m.targetDate ? format(parseISO(m.targetDate), 'MMM d, yyyy') : '—'}</td>
                    <td style={{ color: daysLeft !== null && daysLeft < 0 ? 'var(--danger)' : daysLeft !== null && daysLeft <= 14 ? 'var(--warning)' : 'var(--text-secondary)', fontWeight: 600 }}>
                      {daysLeft === null ? '—' : daysLeft < 0 ? `${Math.abs(daysLeft)}d late` : `${daysLeft}d`}
                    </td>
                    <td style={{ minWidth: 150 }}><ProgressBar value={m.progress} /></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{m.owner || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{mTasks.filter(t => t.status === 'done').length}/{mTasks.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
