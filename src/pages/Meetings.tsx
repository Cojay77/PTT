import { useState } from 'react';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { Modal, ConfirmDialog, EmptyState } from '../components/ui/shared';
import type { Meeting } from '../types';
import { CalendarCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const MEETING_TYPES = ['Project Meeting', 'Steering Committee', 'Operational Committee', 'Technical Meeting', 'Vendor Meeting', 'Workshop', 'Review', 'Retrospective', 'Informal', 'Other'];

function MeetingModal({ meeting, onClose }: { meeting?: Partial<Meeting>; onClose: () => void }) {
  const { createMeeting, updateMeeting } = useDataStore();
  const isEdit = Boolean(meeting?.id);
  const [form, setForm] = useState<Partial<Meeting>>({ title: '', date: new Date().toISOString().split('T')[0], type: 'Project Meeting', participants: '', agenda: '', notes: '', decisions: '', actions: '', risksIdentified: '', blockersIdentified: '', followUps: '', ...meeting });
  function save() { if (!form.title?.trim()) return; if (isEdit) updateMeeting(meeting!.id!, form); else createMeeting(form); onClose(); }
  const f = (k: keyof Meeting) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <Modal title={isEdit ? 'Edit Meeting' : 'New Meeting'} onClose={onClose} size="xl"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label required">Title</label><input className="input" value={form.title || ''} onChange={f('title')} autoFocus /></div>
        <div className="form-group"><label className="form-label">Date</label><input className="input" type="date" value={form.date || ''} onChange={f('date')} /></div>
        <div className="form-group"><label className="form-label">Type</label><select className="select" value={form.type} onChange={f('type')}>{MEETING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Participants</label><input className="input" value={form.participants || ''} onChange={f('participants')} placeholder="Name, Name, ..." /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="form-group"><label className="form-label">Agenda</label><textarea className="textarea" rows={5} value={form.agenda || ''} onChange={f('agenda')} placeholder="1. Topic&#10;2. Topic..." /></div>
        <div className="form-group"><label className="form-label">Meeting Notes</label><textarea className="textarea" rows={5} value={form.notes || ''} onChange={f('notes')} /></div>
        <div className="form-group"><label className="form-label">Decisions Made</label><textarea className="textarea" rows={4} value={form.decisions || ''} onChange={f('decisions')} /></div>
        <div className="form-group"><label className="form-label">Actions Identified</label><textarea className="textarea" rows={4} value={form.actions || ''} onChange={f('actions')} /></div>
        <div className="form-group"><label className="form-label">Risks Identified</label><textarea className="textarea" rows={3} value={form.risksIdentified || ''} onChange={f('risksIdentified')} /></div>
        <div className="form-group"><label className="form-label">Blockers Identified</label><textarea className="textarea" rows={3} value={form.blockersIdentified || ''} onChange={f('blockersIdentified')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Follow-ups</label><textarea className="textarea" rows={3} value={form.followUps || ''} onChange={f('followUps')} /></div>
      </div>
    </Modal>
  );
}

export default function Meetings() {
  const { meetings, deleteMeeting } = useDataStore();
  const [edit, setEdit] = useState<Partial<Meeting> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const sorted = [...meetings].sort((a, b) => b.date.localeCompare(a.date));
  const filtered = search ? sorted.filter(m => m.title.toLowerCase().includes(search.toLowerCase()) || m.participants.toLowerCase().includes(search.toLowerCase())) : sorted;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div><h1 className="page-title">Meetings</h1><p className="page-subtitle">{meetings.length} meetings recorded</p></div>
        <div className="ml-auto flex gap-2">
          <input className="input" style={{ width: 220 }} placeholder="Search meetings..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setEdit({})}><Plus size={14} /> New Meeting</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="No meetings" desc="Record meeting notes, decisions, and actions." action={<button className="btn btn-primary" onClick={() => setEdit({})}>Add Meeting</button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(m => (
            <div key={m.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setEdit(m)}>
              <div className="card-body">
                <div className="flex items-start gap-4">
                  <div style={{ textAlign: 'center', background: 'var(--accent-soft)', borderRadius: 'var(--radius-md)', padding: '8px 12px', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>{m.date ? format(parseISO(m.date), 'MMM') : '—'}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{m.date ? format(parseISO(m.date), 'd') : '—'}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-md)' }}>{m.title}</span>
                      <span className="badge status-planned">{m.type}</span>
                    </div>
                    {m.participants && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>👥 {m.participants}</div>}
                    <div className="flex gap-3 mt-2">
                      {m.decisions && <span style={{ fontSize: 11, background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>✓ Decisions</span>}
                      {m.actions && <span style={{ fontSize: 11, background: 'var(--accent-soft)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>⚡ Actions</span>}
                      {m.risksIdentified && <span style={{ fontSize: 11, background: 'var(--warning-bg)', color: 'var(--warning)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>⚠ Risks</span>}
                      {m.blockersIdentified && <span style={{ fontSize: 11, background: 'var(--danger-bg)', color: 'var(--danger)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>🚫 Blockers</span>}
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button className="btn-icon btn-ghost" onClick={() => setEdit(m)}><Edit3 size={13} /></button>
                    <button className="btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(m.id)}><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {edit !== null && <MeetingModal meeting={edit} onClose={() => setEdit(null)} />}
      {deleteId && <ConfirmDialog message="Delete this meeting?" onConfirm={() => { deleteMeeting(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}
