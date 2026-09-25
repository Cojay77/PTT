import { useState, useMemo } from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { useTaskStore } from '../store/useTaskStore';
import { Avatar, Modal, ConfirmDialog, EmptyState, ProgressBar } from '../components/ui/shared';
import type { Resource, Absence } from '../types';
import { UserCog } from 'lucide-react';

function ResourceModal({ r, onClose }: { r?: Partial<Resource>; onClose: () => void }) {
  const { createResource, updateResource } = useDataStore();
  const isEdit = Boolean(r?.id);
  const [form, setForm] = useState<Partial<Resource>>({ name: '', role: '', organization: '', email: '', allocationPercent: 100, plannedWorkload: 0, skills: '', projectStartDate: '', projectEndDate: '', notes: '', ...r });
  function save() { if (!form.name?.trim()) return; if (isEdit) updateResource(r!.id!, form); else createResource(form); onClose(); }
  const f = (k: keyof Resource) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <Modal title={isEdit ? 'Edit Resource' : 'New Resource'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
    >
      <div className="form-row">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label required">Name</label><input className="input" value={form.name || ''} onChange={f('name')} autoFocus /></div>
        <div className="form-group"><label className="form-label">Role</label><input className="input" value={form.role || ''} onChange={f('role')} /></div>
        <div className="form-group"><label className="form-label">Organization/Team</label><input className="input" value={form.organization || ''} onChange={f('organization')} /></div>
        <div className="form-group"><label className="form-label">Email</label><input className="input" type="email" value={form.email || ''} onChange={f('email')} /></div>
        <div className="form-group"><label className="form-label">Allocation (%)</label><input className="input" type="number" min="0" max="100" value={form.allocationPercent || 100} onChange={e => setForm(p => ({ ...p, allocationPercent: Number(e.target.value) }))} /></div>
        <div className="form-group"><label className="form-label">Planned Workload (h)</label><input className="input" type="number" min="0" value={form.plannedWorkload || 0} onChange={e => setForm(p => ({ ...p, plannedWorkload: Number(e.target.value) }))} /></div>
        <div className="form-group"><label className="form-label">Project Start</label><input className="input" type="date" value={form.projectStartDate || ''} onChange={f('projectStartDate')} /></div>
        <div className="form-group"><label className="form-label">Project End</label><input className="input" type="date" value={form.projectEndDate || ''} onChange={f('projectEndDate')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Skills / Responsibilities</label><textarea className="textarea" rows={2} value={form.skills || ''} onChange={f('skills')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Notes</label><textarea className="textarea" rows={2} value={form.notes || ''} onChange={f('notes')} /></div>
      </div>
    </Modal>
  );
}

function AbsenceModal({ resources, onClose }: { resources: Resource[]; onClose: () => void }) {
  const { createAbsence } = useDataStore();
  const [form, setForm] = useState<Partial<Absence>>({ resourceId: '', type: 'vacation', startDate: '', endDate: '', notes: '' });
  function save() {
    if (!form.resourceId || !form.startDate || !form.endDate) return;
    const r = resources.find(r => r.id === form.resourceId);
    createAbsence({ ...form, resourceName: r?.name || '' });
    onClose();
  }
  const ABSENCE_TYPES = ['vacation', 'RTT', 'sick', 'training', 'business-trip', 'remote', 'partial-availability'];
  return (
    <Modal title="Add Absence" onClose={onClose} size="sm"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
    >
      <div className="form-row">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label required">Resource</label>
          <select className="select" value={form.resourceId} onChange={e => setForm(p => ({ ...p, resourceId: e.target.value }))}>
            <option value="">Select resource...</option>
            {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Type</label><select className="select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>{ABSENCE_TYPES.map(t => <option key={t} value={t}>{t.replace(/-/g, ' ')}</option>)}</select></div>
        <div className="form-group"><label className="form-label required">Start</label><input className="input" type="date" value={form.startDate || ''} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label required">End</label><input className="input" type="date" value={form.endDate || ''} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Notes</label><textarea className="textarea" rows={2} value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
      </div>
    </Modal>
  );
}

export default function Resources() {
  const { resources, absences, deleteResource, deleteAbsence } = useDataStore();
  const tasks = useTaskStore(s => s.tasks);
  const [editResource, setEditResource] = useState<Partial<Resource> | null>(null);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  // Compute assigned workload from tasks for each resource (by name match on owner field)
  const workloadByName = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.filter(t => !t.isBacklog && !['done', 'cancelled'].includes(t.status)).forEach(t => {
      if (t.owner) map[t.owner] = (map[t.owner] || 0) + (t.remainingWorkload || t.estimatedWorkload || 0);
    });
    return map;
  }, [tasks]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div><h1 className="page-title">Resources</h1><p className="page-subtitle">{resources.length} team members</p></div>
        <div className="ml-auto flex gap-2">
          <button className="btn btn-secondary" onClick={() => setShowAbsenceModal(true)}><Plus size={14} /> Add Absence</button>
          <button className="btn btn-primary" onClick={() => setEditResource({})}><Plus size={14} /> Add Resource</button>
        </div>
      </div>

      {resources.length === 0 ? (
        <EmptyState icon={UserCog} title="No resources added" desc="Add project team members to track workload and availability." action={<button className="btn btn-primary" onClick={() => setEditResource({})}>Add Resource</button>} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {resources.map(r => {
            const rAbsences = absences.filter(a => a.resourceId === r.id && a.endDate >= today);
            const isCurrentlyAbsent = rAbsences.some(a => a.startDate <= today && a.endDate >= today);
            const assignedWorkload = workloadByName[r.name] || 0;
            const isOverloaded = r.plannedWorkload > 0 && assignedWorkload > r.plannedWorkload;
            return (
              <div key={r.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setEditResource(r)}>
                <div className="card-body">
                  <div className="flex items-start gap-3">
                    <div style={{ position: 'relative' }}>
                      <Avatar name={r.name} size={40} />
                      {isCurrentlyAbsent && (
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: 'var(--warning)', border: '2px solid var(--bg-surface)' }} title="Currently absent" />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 'var(--text-md)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {r.name}
                        {isOverloaded && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: 'var(--danger)', background: 'var(--danger-bg)', padding: '1px 7px', borderRadius: 99 }}>
                            <AlertTriangle size={10} /> Over capacity
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{r.role}</div>
                      {r.organization && <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{r.organization}</div>}
                    </div>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button className="btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(r.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Allocation</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: r.allocationPercent > 100 ? 'var(--danger)' : r.allocationPercent >= 80 ? 'var(--warning)' : 'var(--success)' }}>{r.allocationPercent}%</span>
                    </div>
                    <ProgressBar value={r.allocationPercent} max={100} color={r.allocationPercent > 100 ? 'var(--danger)' : r.allocationPercent >= 80 ? 'var(--warning)' : 'var(--success)'} />
                  </div>
                  {r.plannedWorkload > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Workload (assigned vs planned)</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: isOverloaded ? 'var(--danger)' : 'var(--text-secondary)' }}>
                          {assignedWorkload}h / {r.plannedWorkload}h
                        </span>
                      </div>
                      <ProgressBar value={assignedWorkload} max={r.plannedWorkload} color={isOverloaded ? 'var(--danger)' : assignedWorkload > r.plannedWorkload * 0.8 ? 'var(--warning)' : 'var(--success)'} />
                    </div>
                  )}
                  {r.skills && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)' }}>{r.skills}</div>}
                  {rAbsences.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {rAbsences.slice(0, 2).map(a => (
                        <div key={a.id} style={{ fontSize: 11, color: isCurrentlyAbsent && a.startDate <= today ? 'var(--warning)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'space-between' }}>
                          <span>📅 {a.type}: {a.startDate} → {a.endDate}</span>
                          <button className="btn-icon btn-ghost" style={{ width: 16, height: 16 }} onClick={ev => { ev.stopPropagation(); deleteAbsence(a.id); }}><Trash2 size={10} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editResource !== null && <ResourceModal r={editResource} onClose={() => setEditResource(null)} />}
      {showAbsenceModal && <AbsenceModal resources={resources} onClose={() => setShowAbsenceModal(false)} />}
      {deleteId && <ConfirmDialog message="Remove this resource?" onConfirm={() => { deleteResource(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}
