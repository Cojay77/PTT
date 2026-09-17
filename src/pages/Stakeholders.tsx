import { useState } from 'react';
import { Plus, Trash2, Edit3, Mail, Phone } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { Avatar, Modal, ConfirmDialog, EmptyState } from '../components/ui/shared';
import type { Stakeholder } from '../types';
import { Users } from 'lucide-react';

const INFLUENCE = ['very-high', 'high', 'medium', 'low', 'very-low'];
const COLORS: Record<string, string> = { 'very-high': 'var(--danger)', high: 'var(--warning)', medium: 'var(--accent)', low: 'var(--success)', 'very-low': 'var(--text-muted)' };

function StakeholderModal({ s: sh, onClose }: { s?: Partial<Stakeholder>; onClose: () => void }) {
  const { createStakeholder, updateStakeholder } = useDataStore();
  const isEdit = Boolean(sh?.id);
  const [form, setForm] = useState<Partial<Stakeholder>>({
    name: '', role: '', organization: '', email: '', phone: '', responsibilities: '',
    influenceLevel: 'medium', involvementLevel: 'medium', communicationPreferences: '',
    projectTopics: '', notes: '', ...sh,
  });
  function save() {
    if (!form.name?.trim()) return;
    if (isEdit) updateStakeholder(sh!.id!, form);
    else createStakeholder(form);
    onClose();
  }
  const f = (k: keyof Stakeholder) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <Modal title={isEdit ? 'Edit Stakeholder' : 'New Stakeholder'} onClose={onClose} size="lg"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
    >
      <div className="form-row">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label required">Name</label><input className="input" value={form.name || ''} onChange={f('name')} autoFocus /></div>
        <div className="form-group"><label className="form-label">Role</label><input className="input" value={form.role || ''} onChange={f('role')} /></div>
        <div className="form-group"><label className="form-label">Organization</label><input className="input" value={form.organization || ''} onChange={f('organization')} /></div>
        <div className="form-group"><label className="form-label">Email</label><input className="input" type="email" value={form.email || ''} onChange={f('email')} /></div>
        <div className="form-group"><label className="form-label">Phone</label><input className="input" value={form.phone || ''} onChange={f('phone')} /></div>
        <div className="form-group"><label className="form-label">Influence Level</label><select className="select" value={form.influenceLevel} onChange={f('influenceLevel')}>{INFLUENCE.map(i => <option key={i} value={i}>{i.replace(/-/g, ' ')}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Involvement Level</label><select className="select" value={form.involvementLevel} onChange={f('involvementLevel')}>{INFLUENCE.map(i => <option key={i} value={i}>{i.replace(/-/g, ' ')}</option>)}</select></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Responsibilities</label><textarea className="textarea" rows={2} value={form.responsibilities || ''} onChange={f('responsibilities')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Project Topics</label><input className="input" value={form.projectTopics || ''} onChange={f('projectTopics')} placeholder="Topics this stakeholder is concerned with" /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Communication Preferences</label><textarea className="textarea" rows={2} value={form.communicationPreferences || ''} onChange={f('communicationPreferences')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Notes</label><textarea className="textarea" rows={2} value={form.notes || ''} onChange={f('notes')} /></div>
      </div>
    </Modal>
  );
}

export default function Stakeholders() {
  const { stakeholders, deleteStakeholder } = useDataStore();
  const [edit, setEdit] = useState<Partial<Stakeholder> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = stakeholders.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.organization.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div><h1 className="page-title">Stakeholders</h1><p className="page-subtitle">{stakeholders.length} stakeholders</p></div>
        <div className="ml-auto flex gap-2">
          <input className="input" style={{ width: 220 }} placeholder="Search stakeholders..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setEdit({})}><Plus size={14} /> Add Stakeholder</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No stakeholders" desc="Add key contacts, decision makers, and influencers." action={<button className="btn btn-primary" onClick={() => setEdit({})}>Add Stakeholder</button>} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(s => (
            <div key={s.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setEdit(s)}>
              <div className="card-body">
                <div className="flex items-start gap-3">
                  <Avatar name={s.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-md)' }}>{s.name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{s.role}</div>
                    {s.organization && <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{s.organization}</div>}
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button className="btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(s.id)}><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <span className="badge" style={{ background: `${COLORS[s.influenceLevel] || 'var(--text-muted)'}22`, color: COLORS[s.influenceLevel] || 'var(--text-muted)', fontSize: 10 }}>
                    Influence: {s.influenceLevel?.replace(/-/g, ' ')}
                  </span>
                  <span className="badge status-planned" style={{ fontSize: 10 }}>
                    Involvement: {s.involvementLevel?.replace(/-/g, ' ')}
                  </span>
                </div>
                {s.projectTopics && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)' }}>Topics: {s.projectTopics}</div>}
                <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                  {s.email && <a href={`mailto:${s.email}`} className="btn btn-ghost btn-sm"><Mail size={12} /> Email</a>}
                  {s.phone && <a href={`tel:${s.phone}`} className="btn btn-ghost btn-sm"><Phone size={12} /> Call</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {edit !== null && <StakeholderModal s={edit} onClose={() => setEdit(null)} />}
      {deleteId && <ConfirmDialog message="Remove this stakeholder?" onConfirm={() => { deleteStakeholder(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}
