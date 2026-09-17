import { useState } from 'react';
import { Plus, ArrowRight, Trash2, Edit3 } from 'lucide-react';
import { useTaskStore } from '../store/useTaskStore';
import { PriorityBadge, EmptyState, Modal, ConfirmDialog } from '../components/ui/shared';
import type { Task, Priority } from '../types';
import { ListTodo } from 'lucide-react';

function BacklogModal({ task, onClose }: { task?: Partial<Task>; onClose: () => void }) {
  const { createTask, updateTask } = useTaskStore();
  const isEdit = Boolean(task?.id);
  const [form, setForm] = useState<Partial<Task>>({
    title: '', priority: 'medium', effort: '', businessValue: '', technicalValue: '',
    description: '', tags: '', category: '', isBacklog: true, ...task,
  });

  function save() {
    if (!form.title?.trim()) return;
    if (isEdit) updateTask(task!.id!, form);
    else createTask({ ...form, isBacklog: true });
    onClose();
  }

  return (
    <Modal title={isEdit ? 'Edit Backlog Item' : 'New Backlog Item'} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save}>Save</button>
      </>}
    >
      <div className="form-row">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label required">Title</label>
          <input className="input" value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="select" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as Priority }))}>
            {(['critical', 'high', 'medium', 'low', 'none'] as Priority[]).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Effort</label>
          <select className="select" value={form.effort || ''} onChange={e => setForm(p => ({ ...p, effort: e.target.value }))}>
            <option value="">Unknown</option>
            <option value="xs">XS — Hours</option>
            <option value="s">S — 1-2 days</option>
            <option value="m">M — 3-5 days</option>
            <option value="l">L — 1-2 weeks</option>
            <option value="xl">XL — 2+ weeks</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Business Value</label>
          <select className="select" value={form.businessValue || ''} onChange={e => setForm(p => ({ ...p, businessValue: e.target.value }))}>
            <option value="">Unknown</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Technical Value</label>
          <select className="select" value={form.technicalValue || ''} onChange={e => setForm(p => ({ ...p, technicalValue: e.target.value }))}>
            <option value="">Unknown</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <input className="input" value={form.category || ''} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Tags</label>
          <input className="input" value={form.tags || ''} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="Comma separated" />
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Description / Notes</label>
          <textarea className="textarea" rows={4} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
      </div>
    </Modal>
  );
}

const EFFORT_LABELS: Record<string, string> = { xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL' };
const VALUE_COLORS: Record<string, string> = { critical: 'var(--danger)', high: 'var(--success)', medium: 'var(--warning)', low: 'var(--text-muted)' };

export default function Backlog() {
  const { backlog, promoteFromBacklog, deleteTask } = useTaskStore();
  const [edit, setEdit] = useState<Partial<Task> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="page-title">Backlog</h1>
          <p className="page-subtitle">{backlog.length} items · Ideas, future tasks, improvements</p>
        </div>
        <button className="btn btn-primary ml-auto" onClick={() => setEdit({})}>
          <Plus size={14} /> Add to Backlog
        </button>
      </div>

      {backlog.length === 0 ? (
        <EmptyState icon={ListTodo} title="Backlog is empty" desc="Add future tasks, ideas, improvements, and deferred items." action={
          <button className="btn btn-primary" onClick={() => setEdit({})}>Add First Item</button>
        } />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Priority</th>
                <th>Effort</th>
                <th>Business Value</th>
                <th>Tech Value</th>
                <th>Category</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backlog.map(t => (
                <tr key={t.id} onClick={() => setEdit(t)}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{t.title}</div>
                    {t.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.description.slice(0, 80)}</div>}
                    {t.tags && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.tags}</div>}
                  </td>
                  <td><PriorityBadge priority={t.priority} /></td>
                  <td><span className="badge status-planned">{EFFORT_LABELS[t.effort || ''] || '—'}</span></td>
                  <td>
                    <span style={{ fontSize: 12, fontWeight: 600, color: VALUE_COLORS[t.businessValue || ''] || 'var(--text-muted)' }}>
                      {t.businessValue || '—'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, fontWeight: 600, color: VALUE_COLORS[t.technicalValue || ''] || 'var(--text-muted)' }}>
                      {t.technicalValue || '—'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.category || '—'}</td>
                  <td>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button className="btn btn-sm btn-secondary" onClick={() => promoteFromBacklog(t.id)} title="Promote to active task">
                        <ArrowRight size={12} /> Promote
                      </button>
                      <button className="btn-icon btn-ghost" onClick={() => setEdit(t)}><Edit3 size={13} /></button>
                      <button className="btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(t.id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit !== null && <BacklogModal task={edit} onClose={() => setEdit(null)} />}
      {deleteId && (
        <ConfirmDialog message="Remove this backlog item?" onConfirm={() => { deleteTask(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />
      )}
    </div>
  );
}
