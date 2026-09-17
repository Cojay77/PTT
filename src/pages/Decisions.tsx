import { useState } from 'react';
import { Plus, Trash2, Edit3, Scale } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { DecisionBadge, DateDisplay, Modal, ConfirmDialog, EmptyState } from '../components/ui/shared';
import type { Decision, DecisionStatus } from '../types';

const STATUSES: DecisionStatus[] = ['proposed', 'under-discussion', 'decision-required', 'approved', 'rejected', 'superseded'];

function DecisionModal({ decision, onClose }: { decision?: Partial<Decision>; onClose: () => void }) {
  const { createDecision, updateDecision } = useDataStore();
  const milestones = useDataStore(s => s.milestones);
  const isEdit = Boolean(decision?.id);
  const [form, setForm] = useState<Partial<Decision>>({
    title: '', context: '', decisionRequired: '', alternativesConsidered: '', finalDecision: '',
    owner: '', contributors: '', decisionDate: '', deadline: '', impact: '', status: 'proposed', notes: '', ...decision,
  });
  function save() { if (!form.title?.trim()) return; if (isEdit) updateDecision(decision!.id!, form); else createDecision(form); onClose(); }
  const f = (k: keyof Decision) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <Modal title={isEdit ? 'Edit Decision' : 'New Decision'} onClose={onClose} size="lg"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
    >
      <div className="form-row">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label required">Title</label><input className="input" value={form.title || ''} onChange={f('title')} autoFocus /></div>
        <div className="form-group"><label className="form-label">Status</label><select className="select" value={form.status} onChange={f('status')}>{STATUSES.map(s => <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Owner</label><input className="input" value={form.owner || ''} onChange={f('owner')} /></div>
        <div className="form-group"><label className="form-label">Contributors</label><input className="input" value={form.contributors || ''} onChange={f('contributors')} /></div>
        <div className="form-group"><label className="form-label">Deadline</label><input className="input" type="date" value={form.deadline || ''} onChange={f('deadline')} /></div>
        <div className="form-group"><label className="form-label">Decision Date</label><input className="input" type="date" value={form.decisionDate || ''} onChange={f('decisionDate')} /></div>
        <div className="form-group">
          <label className="form-label">Milestone</label>
          <select className="select" value={form.relatedMilestoneId || ''} onChange={e => setForm(p => ({ ...p, relatedMilestoneId: e.target.value || null }))}>
            <option value="">No milestone</option>
            {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Context</label><textarea className="textarea" rows={3} value={form.context || ''} onChange={f('context')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Decision Required</label><textarea className="textarea" rows={2} value={form.decisionRequired || ''} onChange={f('decisionRequired')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Alternatives Considered</label><textarea className="textarea" rows={3} value={form.alternativesConsidered || ''} onChange={f('alternativesConsidered')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Final Decision</label><textarea className="textarea" rows={3} value={form.finalDecision || ''} onChange={f('finalDecision')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Impact</label><textarea className="textarea" rows={2} value={form.impact || ''} onChange={f('impact')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Notes</label><textarea className="textarea" rows={2} value={form.notes || ''} onChange={f('notes')} /></div>
      </div>
    </Modal>
  );
}

export default function Decisions() {
  const { decisions, deleteDecision } = useDataStore();
  const [edit, setEdit] = useState<Partial<Decision> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  const pending = decisions.filter(d => ['proposed', 'under-discussion', 'decision-required'].includes(d.status));
  const resolved = decisions.filter(d => ['approved', 'rejected', 'superseded'].includes(d.status));
  const required = pending.filter(d => d.status === 'decision-required').length;

  const displayed = activeTab === 'pending' ? pending : activeTab === 'resolved' ? resolved : decisions;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div><h1 className="page-title">Decisions Log</h1><p className="page-subtitle">{pending.length} pending · {required} decision required</p></div>
        <button className="btn btn-primary ml-auto" onClick={() => setEdit({})}><Plus size={14} /> New Decision</button>
      </div>

      {required > 0 && <div className="alert-banner alert-warning" style={{ marginBottom: 16 }}>⚠️ {required} decision{required > 1 ? 's' : ''} require a decision urgently.</div>}

      <div className="tabs" style={{ marginBottom: 16 }}>
        {[
          { id: 'pending', label: 'Pending', count: pending.length },
          { id: 'resolved', label: 'Resolved', count: resolved.length },
          { id: 'all', label: 'All', count: decisions.length },
        ].map(tab => (
          <button key={tab.id} className={`tab${activeTab === tab.id ? ' active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label} <span className="tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <EmptyState icon={Scale} title="No decisions" desc="Record project decisions, options considered, and rationale." action={<button className="btn btn-primary" onClick={() => setEdit({})}>Add Decision</button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayed.map(d => {
            const isUrgent = d.deadline && d.deadline < new Date().toISOString().split('T')[0] && d.status !== 'approved';
            return (
              <div key={d.id} className="card" style={{ borderLeft: `4px solid ${d.status === 'decision-required' ? 'var(--danger)' : d.status === 'approved' ? 'var(--success)' : d.status === 'rejected' ? 'var(--text-muted)' : 'var(--warning)'}`, cursor: 'pointer' }} onClick={() => setEdit(d)}>
                <div className="card-body">
                  <div className="flex items-start gap-3">
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span style={{ fontWeight: 700 }}>{d.title}</span>
                        <DecisionBadge status={d.status} />
                        {isUrgent && <span className="badge priority-critical">Overdue deadline</span>}
                      </div>
                      {d.context && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 6 }}>{d.context.slice(0, 160)}</p>}
                      {d.decisionRequired && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>❓ {d.decisionRequired.slice(0, 120)}</p>}
                      {d.finalDecision && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--success)', marginTop: 4 }}>✓ {d.finalDecision.slice(0, 120)}</p>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {d.deadline && <div style={{ fontSize: 11, color: isUrgent ? 'var(--danger)' : 'var(--text-muted)' }}>Deadline: {d.deadline}</div>}
                      {d.owner && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Owner: {d.owner}</div>}
                      <div className="flex gap-1 justify-end mt-2" onClick={e => e.stopPropagation()}>
                        <button className="btn-icon btn-ghost" onClick={() => setEdit(d)}><Edit3 size={13} /></button>
                        <button className="btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(d.id)}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {edit !== null && <DecisionModal decision={edit} onClose={() => setEdit(null)} />}
      {deleteId && <ConfirmDialog message="Delete this decision?" onConfirm={() => { deleteDecision(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}
