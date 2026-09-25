import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Zap, Scale, ArrowRight, Plus, Check } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { useTaskStore } from '../store/useTaskStore';
import { SeverityBadge, IssueBadge, DecisionBadge, ActionBadge, StatusBadge, DateDisplay, Modal } from '../components/ui/shared';
import type { Risk, Action, Issue, Decision, ActionStatus, Severity, IssueStatus, DecisionStatus } from '../types';

export default function RAID() {
  const navigate = useNavigate();
  const {
    risks, issues, decisions, actions,
    updateAction, updateRisk, updateIssue, updateDecision,
    createRisk, createAction, createIssue, createDecision,
  } = useDataStore();
  const { tasks } = useTaskStore();

  const [activeModal, setActiveModal] = useState<{
    type: 'risk' | 'action' | 'issue' | 'decision';
    item?: Partial<Risk | Action | Issue | Decision>;
  } | null>(null);

  const [form, setForm] = useState<Record<string, any>>({});

  const openRisks = risks.filter(r => !['closed', 'accepted'].includes(r.status));
  const openIssues = issues.filter(i => ['open', 'in-progress', 'escalated'].includes(i.status));
  const pendingDecisions = decisions.filter(d => ['proposed', 'under-discussion', 'decision-required'].includes(d.status));
  const openActions = actions.filter(a => ['open', 'in-progress'].includes(a.status));
  const today = new Date().toISOString().split('T')[0];
  const blockedTasks = tasks.filter(t => t.status === 'blocked' || t.status === 'waiting');

  const ACTION_CYCLE: ActionStatus[] = ['open', 'in-progress', 'done', 'cancelled'];
  function cycleAction(a: Action, e: React.MouseEvent) {
    e.stopPropagation();
    const idx = ACTION_CYCLE.indexOf(a.status);
    const next = idx >= 0 ? ACTION_CYCLE[(idx + 1) % ACTION_CYCLE.length] : 'open';
    updateAction(a.id, { status: next });
  }

  function openCreateModal(type: 'risk' | 'action' | 'issue' | 'decision') {
    const defaultData =
      type === 'risk' ? { title: '', severity: 'medium', status: 'identified', category: 'General', owner: '' } :
      type === 'action' ? { action: '', status: 'open', owner: '', dueDate: today } :
      type === 'issue' ? { title: '', severity: 'medium', status: 'open', owner: '' } :
      { title: '', status: 'proposed', owner: '', deadline: '' };
    setForm(defaultData);
    setActiveModal({ type });
  }

  function openEditModal(type: 'risk' | 'action' | 'issue' | 'decision', item: any) {
    setForm({ ...item });
    setActiveModal({ type, item });
  }

  function handleSave() {
    if (!activeModal) return;
    const isEdit = Boolean(activeModal.item?.id);
    const id = activeModal.item?.id;

    if (activeModal.type === 'risk') {
      if (!form.title?.trim()) return;
      if (isEdit) updateRisk(id!, form);
      else createRisk(form);
    } else if (activeModal.type === 'action') {
      if (!form.action?.trim()) return;
      if (isEdit) updateAction(id!, form);
      else createAction(form);
    } else if (activeModal.type === 'issue') {
      if (!form.title?.trim()) return;
      if (isEdit) updateIssue(id!, form);
      else createIssue(form);
    } else if (activeModal.type === 'decision') {
      if (!form.title?.trim()) return;
      if (isEdit) updateDecision(id!, form);
      else createDecision(form);
    }

    setActiveModal(null);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="page-title">RAID View</h1>
          <p className="page-subtitle">Consolidated Risks · Actions · Issues · Decisions with Quick Inline Actions</p>
        </div>
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
            <button className="btn btn-secondary btn-xs" onClick={() => openCreateModal('risk')}>
              <Plus size={11} /> New
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/risks')} title="View full Risks table"><ArrowRight size={12} /></button>
          </div>
          <div>
            {openRisks.slice(0, 8).map(r => (
              <div key={r.id} className="attention-item flex items-center justify-between" onClick={() => openEditModal('risk', r)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                  <SeverityBadge severity={r.severity} />
                  <div className="attention-content truncate">
                    <div className="attention-title truncate">{r.title}</div>
                    <div className="attention-meta">{r.owner || 'Unassigned'} · {r.category}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
                  <button
                    className="btn btn-ghost btn-xs"
                    style={{ fontSize: 10, padding: '2px 6px' }}
                    onClick={e => { e.stopPropagation(); updateRisk(r.id, { status: 'closed' }); }}
                    title="Mark as closed / mitigated"
                  >
                    Close
                  </button>
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
            <button className="btn btn-secondary btn-xs" onClick={() => openCreateModal('action')}>
              <Plus size={11} /> New
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/actions')} title="View full Actions table"><ArrowRight size={12} /></button>
          </div>
          <div>
            {openActions.slice(0, 8).map(a => {
              const isOverdue = a.dueDate && a.dueDate < today;
              return (
                <div key={a.id} className="attention-item flex items-center justify-between" onClick={() => openEditModal('action', a)} style={{ background: isOverdue ? 'var(--danger-bg)' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    <span onClick={e => cycleAction(a, e)} title="Click to cycle status" style={{ cursor: 'pointer' }}>
                      <ActionBadge status={a.status} />
                    </span>
                    <div className="attention-content truncate">
                      <div className="attention-title truncate">{a.action}</div>
                      <div className="attention-meta" style={{ color: isOverdue ? 'var(--danger)' : undefined }}>
                        {a.owner || 'Unassigned'} · <DateDisplay date={a.dueDate} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: 11, padding: '2px 8px' }}
                      onClick={e => { e.stopPropagation(); updateAction(a.id, { status: 'done' }); }}
                      title="Mark action as done"
                    >
                      <Check size={11} /> Done
                    </button>
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
              <AlertTriangle size={14} color="var(--danger)" />
            </div>
            <span className="section-title">Issues & Blockers</span>
            <span className="badge priority-critical" style={{ marginLeft: 'auto' }}>{openIssues.length} open</span>
            <button className="btn btn-secondary btn-xs" onClick={() => openCreateModal('issue')}>
              <Plus size={11} /> New
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/issues')} title="View full Issues table"><ArrowRight size={12} /></button>
          </div>
          <div>
            {openIssues.slice(0, 8).map(i => (
              <div key={i.id} className="attention-item flex items-center justify-between" onClick={() => openEditModal('issue', i)} style={{ background: i.severity === 'critical' ? 'var(--danger-bg)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                  <SeverityBadge severity={i.severity} />
                  <div className="attention-content truncate">
                    <div className="attention-title truncate">{i.title}</div>
                    <div className="attention-meta">{i.owner || 'Unassigned'} · <IssueBadge status={i.status} /></div>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
                  <button
                    className="btn btn-ghost btn-xs"
                    style={{ fontSize: 10, padding: '2px 6px' }}
                    onClick={e => { e.stopPropagation(); updateIssue(i.id, { status: 'resolved' }); }}
                    title="Mark issue as resolved"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
            {blockedTasks.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
                <div style={{ padding: '4px 24px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Blocked Tasks</div>
                {blockedTasks.slice(0, 3).map(t => (
                  <div key={t.id} className="attention-item" onClick={() => navigate('/tasks')}>
                    <StatusBadge status={t.status} />
                    <div className="attention-content truncate">
                      <div className="attention-title truncate">{t.title}</div>
                      <div className="attention-meta">{t.blockingReason?.slice(0, 60) || 'No reason specified'}</div>
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
            <button className="btn btn-secondary btn-xs" onClick={() => openCreateModal('decision')}>
              <Plus size={11} /> New
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/decisions')} title="View full Decisions table"><ArrowRight size={12} /></button>
          </div>
          <div>
            {pendingDecisions.slice(0, 8).map(d => (
              <div key={d.id} className="attention-item flex items-center justify-between" onClick={() => openEditModal('decision', d)} style={{ background: d.status === 'decision-required' ? 'var(--warning-bg)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                  <DecisionBadge status={d.status} />
                  <div className="attention-content truncate">
                    <div className="attention-title truncate">{d.title}</div>
                    <div className="attention-meta">{d.owner || 'Unassigned'}{d.deadline && ` · Deadline: ${d.deadline}`}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
                  <button
                    className="btn btn-ghost btn-xs"
                    style={{ fontSize: 10, padding: '2px 6px' }}
                    onClick={e => { e.stopPropagation(); updateDecision(d.id, { status: 'approved', decisionDate: today }); }}
                    title="Mark decision as approved"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
            {pendingDecisions.length === 0 && <div style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>✓ No pending decisions</div>}
          </div>
        </div>
      </div>

      {/* Quick Modal for Create / Edit within RAID */}
      {activeModal && (
        <Modal
          title={`${activeModal.item?.id ? 'Edit' : 'New'} ${activeModal.type.charAt(0).toUpperCase() + activeModal.type.slice(1)}`}
          onClose={() => setActiveModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>Save</button>
          </>}
        >
          <div className="form-row">
            {activeModal.type === 'action' ? (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label required">Action Description</label>
                <input
                  className="input"
                  value={form.action || ''}
                  onChange={e => setForm(p => ({ ...p, action: e.target.value }))}
                  placeholder="What needs to be done..."
                  autoFocus
                />
              </div>
            ) : (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label required">Title</label>
                <input
                  className="input"
                  value={form.title || ''}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Title..."
                  autoFocus
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Owner</label>
              <input
                className="input"
                value={form.owner || ''}
                onChange={e => setForm(p => ({ ...p, owner: e.target.value }))}
                placeholder="Assignee name..."
              />
            </div>

            {activeModal.type === 'action' && (
              <>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    className="input"
                    type="date"
                    value={form.dueDate || ''}
                    onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    {ACTION_CYCLE.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </>
            )}

            {(activeModal.type === 'risk' || activeModal.type === 'issue') && (
              <div className="form-group">
                <label className="form-label">Severity</label>
                <select className="select" value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}>
                  {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {activeModal.type === 'decision' && (
              <>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    {['proposed', 'under-discussion', 'decision-required', 'decided', 'rejected'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <input
                    className="input"
                    type="date"
                    value={form.deadline || ''}
                    onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                  />
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
