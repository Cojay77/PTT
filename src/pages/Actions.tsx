import { useState } from 'react';
import { Plus, Trash2, Edit3, Zap } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { ActionBadge, DateDisplay, Modal, ConfirmDialog, EmptyState } from '../components/ui/shared';
import type { Action, ActionStatus } from '../types';

function ActionModal({ action, onClose }: { action?: Partial<Action>; onClose: () => void }) {
  const { createAction, updateAction } = useDataStore();
  const isEdit = Boolean(action?.id);
  const [form, setForm] = useState<Partial<Action>>({ action: '', owner: '', dueDate: '', status: 'open', source: '', notes: '', ...action });
  function save() { if (!form.action?.trim()) return; if (isEdit) updateAction(action!.id!, form); else createAction(form); onClose(); }
  const f = (k: keyof Action) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <Modal title={isEdit ? 'Edit Action' : 'New Action'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
    >
      <div className="form-row">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label required">Action</label><textarea className="textarea" rows={2} value={form.action || ''} onChange={f('action')} autoFocus /></div>
        <div className="form-group"><label className="form-label">Owner</label><input className="input" value={form.owner || ''} onChange={f('owner')} /></div>
        <div className="form-group"><label className="form-label">Due Date</label><input className="input" type="date" value={form.dueDate || ''} onChange={f('dueDate')} /></div>
        <div className="form-group"><label className="form-label">Status</label><select className="select" value={form.status} onChange={f('status')}>{(['open', 'in-progress', 'done', 'cancelled'] as ActionStatus[]).map(s => <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>)}</select></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Source</label><input className="input" value={form.source || ''} onChange={f('source')} placeholder="Where this action came from..." /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Notes</label><textarea className="textarea" rows={2} value={form.notes || ''} onChange={f('notes')} /></div>
      </div>
    </Modal>
  );
}

export default function Actions() {
  const { actions, deleteAction, updateAction } = useDataStore();
  const [edit, setEdit] = useState<Partial<Action> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('open');

  const today = new Date().toISOString().split('T')[0];
  const open = actions.filter(a => a.status === 'open' || a.status === 'in-progress');
  const overdue = open.filter(a => a.dueDate && a.dueDate < today);
  const done = actions.filter(a => a.status === 'done');

  const displayed = activeTab === 'open' ? open : activeTab === 'overdue' ? overdue : activeTab === 'done' ? done : actions;

  function markDone(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    updateAction(id, { status: 'done' });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div><h1 className="page-title">Actions Log</h1><p className="page-subtitle">{open.length} open · {overdue.length} overdue</p></div>
        <button className="btn btn-primary ml-auto" onClick={() => setEdit({})}><Plus size={14} /> Quick Action</button>
      </div>

      {overdue.length > 0 && <div className="alert-banner alert-critical" style={{ marginBottom: 16 }}>🔴 {overdue.length} action{overdue.length > 1 ? 's' : ''} overdue!</div>}

      <div className="tabs" style={{ marginBottom: 16 }}>
        {[
          { id: 'open', label: 'Open', count: open.length },
          { id: 'overdue', label: 'Overdue', count: overdue.length },
          { id: 'done', label: 'Done', count: done.length },
          { id: 'all', label: 'All', count: actions.length },
        ].map(tab => (
          <button key={tab.id} className={`tab${activeTab === tab.id ? ' active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label} <span className="tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <EmptyState icon={Zap} title={activeTab === 'open' ? 'No open actions' : 'No actions'} desc="Capture quick operational actions and track who is responsible." action={<button className="btn btn-primary" onClick={() => setEdit({})}>Add Action</button>} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Owner</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Source</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(a => {
                const isOverdue = a.dueDate && a.dueDate < today && a.status !== 'done';
                return (
                  <tr key={a.id} onClick={() => setEdit(a)} style={{ background: isOverdue ? 'var(--danger-bg)' : a.status === 'done' ? 'var(--success-bg)' : undefined, opacity: a.status === 'done' ? 0.6 : 1 }}>
                    <td style={{ maxWidth: 320 }}>
                      <div style={{ fontWeight: 500, textDecoration: a.status === 'done' ? 'line-through' : 'none' }}>{a.action}</div>
                      {a.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{a.notes.slice(0, 60)}</div>}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{a.owner || '—'}</td>
                    <td style={{ color: isOverdue ? 'var(--danger)' : 'inherit' }}><DateDisplay date={a.dueDate} /></td>
                    <td><ActionBadge status={a.status} /></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 160 }} className="truncate">{a.source || '—'}</td>
                    <td>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        {a.status !== 'done' && <button className="btn btn-sm btn-secondary" onClick={e => markDone(a.id, e)}>✓ Done</button>}
                        <button className="btn-icon btn-ghost" onClick={() => setEdit(a)}><Edit3 size={13} /></button>
                        <button className="btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(a.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {edit !== null && <ActionModal action={edit} onClose={() => setEdit(null)} />}
      {deleteId && <ConfirmDialog message="Delete this action?" onConfirm={() => { deleteAction(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}
