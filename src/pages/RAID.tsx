import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Zap, Scale, CheckSquare, ArrowRight } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { useTaskStore } from '../store/useTaskStore';
import { SeverityBadge, IssueBadge, DecisionBadge, ActionBadge, StatusBadge, DateDisplay } from '../components/ui/shared';

export default function RAID() {
  const navigate = useNavigate();
  const { risks, issues, decisions, actions } = useDataStore();
  const { tasks } = useTaskStore();

  const openRisks = risks.filter(r => !['closed', 'accepted'].includes(r.status));
  const openIssues = issues.filter(i => ['open', 'in-progress', 'escalated'].includes(i.status));
  const pendingDecisions = decisions.filter(d => ['proposed', 'under-discussion', 'decision-required'].includes(d.status));
  const openActions = actions.filter(a => ['open', 'in-progress'].includes(a.status));
  const today = new Date().toISOString().split('T')[0];
  const blockedTasks = tasks.filter(t => t.status === 'blocked' || t.status === 'waiting');

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">RAID View</h1>
        <p className="page-subtitle">Consolidated Risks · Actions · Issues · Decisions</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Risks */}
        <div className="card">
          <div className="card-header">
            <div style={{ width: 28, height: 28, background: 'var(--warning-bg)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={14} color="var(--warning)" />
            </div>
            <span className="section-title">Risks</span>
            <span className="badge priority-high" style={{ marginLeft: 'auto' }}>{openRisks.length} open</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/risks')}><ArrowRight size={12} /></button>
          </div>
          <div>
            {openRisks.slice(0, 8).map(r => (
              <div key={r.id} className="attention-item" onClick={() => navigate('/risks')}>
                <SeverityBadge severity={r.severity} />
                <div className="attention-content">
                  <div className="attention-title">{r.title}</div>
                  <div className="attention-meta">{r.owner || 'Unassigned'} · {r.category}</div>
                </div>
              </div>
            ))}
            {openRisks.length === 0 && <div style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>✓ No open risks</div>}
          </div>
        </div>

        {/* Actions */}
        <div className="card">
          <div className="card-header">
            <div style={{ width: 28, height: 28, background: 'var(--accent-soft)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={14} color="var(--accent)" />
            </div>
            <span className="section-title">Actions</span>
            <span className="badge status-in-progress" style={{ marginLeft: 'auto' }}>{openActions.length} open</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/actions')}><ArrowRight size={12} /></button>
          </div>
          <div>
            {openActions.slice(0, 8).map(a => {
              const isOverdue = a.dueDate && a.dueDate < today;
              return (
                <div key={a.id} className="attention-item" onClick={() => navigate('/actions')} style={{ background: isOverdue ? 'var(--danger-bg)' : undefined }}>
                  <ActionBadge status={a.status} />
                  <div className="attention-content">
                    <div className="attention-title">{a.action}</div>
                    <div className="attention-meta" style={{ color: isOverdue ? 'var(--danger)' : undefined }}>
                      {a.owner || 'Unassigned'} · <DateDisplay date={a.dueDate} />
                    </div>
                  </div>
                </div>
              );
            })}
            {openActions.length === 0 && <div style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>✓ No open actions</div>}
          </div>
        </div>

        {/* Issues */}
        <div className="card">
          <div className="card-header">
            <div style={{ width: 28, height: 28, background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={14} color="var(--danger)" />
            </div>
            <span className="section-title">Issues & Blockers</span>
            <span className="badge priority-critical" style={{ marginLeft: 'auto' }}>{openIssues.length} open</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/issues')}><ArrowRight size={12} /></button>
          </div>
          <div>
            {openIssues.slice(0, 8).map(i => (
              <div key={i.id} className="attention-item" onClick={() => navigate('/issues')} style={{ background: i.severity === 'critical' ? 'var(--danger-bg)' : undefined }}>
                <SeverityBadge severity={i.severity} />
                <div className="attention-content">
                  <div className="attention-title">{i.title}</div>
                  <div className="attention-meta">{i.owner || 'Unassigned'} · <IssueBadge status={i.status} /></div>
                </div>
              </div>
            ))}
            {blockedTasks.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
                <div style={{ padding: '4px 24px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Blocked Tasks</div>
                {blockedTasks.slice(0, 3).map(t => (
                  <div key={t.id} className="attention-item" onClick={() => navigate('/tasks')}>
                    <StatusBadge status={t.status} />
                    <div className="attention-content">
                      <div className="attention-title">{t.title}</div>
                      <div className="attention-meta">{t.blockingReason?.slice(0, 60) || 'No reason'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {openIssues.length === 0 && blockedTasks.length === 0 && <div style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>✓ No open issues</div>}
          </div>
        </div>

        {/* Decisions */}
        <div className="card">
          <div className="card-header">
            <div style={{ width: 28, height: 28, background: 'var(--purple-bg)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scale size={14} color="var(--purple)" />
            </div>
            <span className="section-title">Decisions</span>
            <span className="badge status-waiting" style={{ marginLeft: 'auto' }}>{pendingDecisions.length} pending</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/decisions')}><ArrowRight size={12} /></button>
          </div>
          <div>
            {pendingDecisions.slice(0, 8).map(d => (
              <div key={d.id} className="attention-item" onClick={() => navigate('/decisions')} style={{ background: d.status === 'decision-required' ? 'var(--warning-bg)' : undefined }}>
                <DecisionBadge status={d.status} />
                <div className="attention-content">
                  <div className="attention-title">{d.title}</div>
                  <div className="attention-meta">{d.owner || 'Unassigned'}{d.deadline && ` · Deadline: ${d.deadline}`}</div>
                </div>
              </div>
            ))}
            {pendingDecisions.length === 0 && <div style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>✓ No pending decisions</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
