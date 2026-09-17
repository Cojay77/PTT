import { useState } from 'react';
import { Plus, Trash2, Edit3, Target } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { useTaskStore } from '../store/useTaskStore';
import { MilestoneBadge, ProgressBar, DateDisplay, Modal, ConfirmDialog, EmptyState } from '../components/ui/shared';
import type { Milestone, MilestoneStatus } from '../types';
import { format, parseISO, differenceInDays } from 'date-fns';

function MilestoneModal({ milestone, onClose }: { milestone?: Partial<Milestone>; onClose: () => void }) {
  const { createMilestone, updateMilestone } = useDataStore();
  const isEdit = Boolean(milestone?.id);
  const [form, setForm] = useState<Partial<Milestone>>({
    name: '', description: '', targetDate: '', status: 'planned', progress: 0, owner: '', notes: '', ...milestone,
  });
  function save() {
    if (!form.name?.trim()) return;
    if (isEdit) updateMilestone(milestone!.id!, form);
    else createMilestone(form);
    onClose();
  }
  return (
    <Modal title={isEdit ? 'Edit Milestone' : 'New Milestone'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
    >
      <div className="form-row">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label required">Name</label>
          <input className="input" value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Target Date</label>
          <input className="input" type="date" value={form.targetDate || ''} onChange={e => setForm(p => ({ ...p, targetDate: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as MilestoneStatus }))}>
            {(['planned', 'in-progress', 'completed', 'delayed', 'at-risk', 'cancelled'] as MilestoneStatus[]).map(s => <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Progress (%)</label>
          <input className="input" type="number" min="0" max="100" value={form.progress || 0} onChange={e => setForm(p => ({ ...p, progress: Number(e.target.value) }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Owner</label>
          <input className="input" value={form.owner || ''} onChange={e => setForm(p => ({ ...p, owner: e.target.value }))} />
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Description</label>
          <textarea className="textarea" rows={3} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Notes</label>
          <textarea className="textarea" rows={2} value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </div>
      </div>
    </Modal>
  );
}

export default function Milestones() {
  const { milestones, createMilestone, updateMilestone, deleteMilestone } = useDataStore();
  const tasks = useTaskStore(s => s.tasks);
  const [edit, setEdit] = useState<Partial<Milestone> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sorted = [...milestones].sort((a, b) => (a.targetDate || '').localeCompare(b.targetDate || ''));
  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="page-title">Milestones & Roadmap</h1>
          <p className="page-subtitle">{milestones.length} milestones · {milestones.filter(m => m.status === 'completed').length} completed</p>
        </div>
        <button className="btn btn-primary ml-auto" onClick={() => setEdit({})}>
          <Plus size={14} /> New Milestone
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Target} title="No milestones defined" desc="Add project milestones to track major deliverables." action={<button className="btn btn-primary" onClick={() => setEdit({})}>Add Milestone</button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sorted.map(m => {
            const mTasks = tasks.filter(t => t.milestoneId === m.id && !t.isBacklog);
            const doneTasks = mTasks.filter(t => t.status === 'done').length;
            const daysLeft = m.targetDate ? differenceInDays(parseISO(m.targetDate), new Date()) : null;
            const isDelayed = m.targetDate && m.targetDate < today && m.status !== 'completed';
            return (
              <div key={m.id} className="card" style={{ borderLeft: `4px solid ${m.status === 'completed' ? 'var(--success)' : m.status === 'delayed' || isDelayed ? 'var(--danger)' : m.status === 'at-risk' ? 'var(--warning)' : 'var(--accent)'}` }}>
                <div className="card-body">
                  <div className="flex items-center gap-3 mb-3">
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-3">
                        <h3 style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>{m.name}</h3>
                        <MilestoneBadge status={isDelayed ? 'delayed' : m.status} />
                      </div>
                      {m.description && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>{m.description}</p>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 'var(--text-xl)', color: daysLeft !== null && daysLeft < 0 ? 'var(--danger)' : daysLeft !== null && daysLeft <= 7 ? 'var(--warning)' : 'var(--text-primary)' }}>
                        {daysLeft === null ? '—' : daysLeft < 0 ? `${Math.abs(daysLeft)}d late` : daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {m.targetDate ? format(parseISO(m.targetDate), 'MMM d, yyyy') : 'No date'}
                      </div>
                      {m.owner && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Owner: {m.owner}</div>}
                    </div>
                    <div className="flex gap-1">
                      <button className="btn-icon btn-ghost" onClick={() => setEdit(m)}><Edit3 size={14} /></button>
                      <button className="btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(m.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Progress</span>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{m.progress}%</span>
                        {mTasks.length > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{doneTasks}/{mTasks.length} tasks done</span>}
                      </div>
                      <ProgressBar value={m.progress} />
                    </div>
                  </div>
                  {m.notes && <div style={{ marginTop: 12, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--border)' }}>{m.notes}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {edit !== null && <MilestoneModal milestone={edit} onClose={() => setEdit(null)} />}
      {deleteId && <ConfirmDialog message="Delete this milestone?" onConfirm={() => { deleteMilestone(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}
