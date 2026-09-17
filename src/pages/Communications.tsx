import { useState, useMemo } from 'react';
import { Plus, Trash2, Edit3, Search } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { CommBadge, DateDisplay, Modal, ConfirmDialog, EmptyState } from '../components/ui/shared';
import type { Communication, CommunicationStatus } from '../types';
import { MessageSquare } from 'lucide-react';

const COMM_TYPES = ['Email', 'Meeting', 'Phone call', 'Teams', 'Slack', 'Informal discussion', 'Committee', 'Vendor', 'Client'];
const STATUSES: CommunicationStatus[] = ['sent', 'received', 'awaiting-response', 'response-received', 'follow-up-needed', 'closed'];

function CommModal({ comm, onClose }: { comm?: Partial<Communication>; onClose: () => void }) {
  const { createCommunication, updateCommunication } = useDataStore();
  const isEdit = Boolean(comm?.id);
  const [form, setForm] = useState<Partial<Communication>>({
    subject: '', type: 'Email', sender: '', recipients: '', date: new Date().toISOString().split('T')[0],
    channel: '', summary: '', informationSent: '', informationRequested: '', expectedResponse: '',
    expectedResponseDate: '', status: 'sent', followUpRequired: false, nextFollowUpDate: '', notes: '', ...comm,
  });
  function save() {
    if (!form.subject?.trim()) return;
    if (isEdit) updateCommunication(comm!.id!, form);
    else createCommunication(form);
    onClose();
  }
  const f = (k: keyof Communication) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <Modal title={isEdit ? 'Edit Communication' : 'New Communication'} onClose={onClose} size="lg"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
    >
      <div className="form-row">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label required">Subject</label>
          <input className="input" value={form.subject || ''} onChange={f('subject')} autoFocus />
        </div>
        <div className="form-group"><label className="form-label">Type</label><select className="select" value={form.type} onChange={f('type')}>{COMM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Date</label><input className="input" type="date" value={form.date || ''} onChange={f('date')} /></div>
        <div className="form-group"><label className="form-label">Sender</label><input className="input" value={form.sender || ''} onChange={f('sender')} /></div>
        <div className="form-group"><label className="form-label">Recipients</label><input className="input" value={form.recipients || ''} onChange={f('recipients')} placeholder="Name, Name, ..." /></div>
        <div className="form-group"><label className="form-label">Status</label><select className="select" value={form.status} onChange={f('status')}>{STATUSES.map(s => <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Channel</label><input className="input" value={form.channel || ''} onChange={f('channel')} placeholder="Email, Teams, ..." /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Summary</label><textarea className="textarea" rows={2} value={form.summary || ''} onChange={f('summary')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Information Sent</label><textarea className="textarea" rows={2} value={form.informationSent || ''} onChange={f('informationSent')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Information Requested / Expected Response</label><textarea className="textarea" rows={2} value={form.informationRequested || ''} onChange={f('informationRequested')} /></div>
        <div className="form-group"><label className="form-label">Expected Response Date</label><input className="input" type="date" value={form.expectedResponseDate || ''} onChange={f('expectedResponseDate')} /></div>
        <div className="form-group">
          <label className="form-label">Follow-up Required</label>
          <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
            <input type="checkbox" id="follow-up" checked={form.followUpRequired || false} onChange={e => setForm(p => ({ ...p, followUpRequired: e.target.checked }))} />
            <label htmlFor="follow-up" style={{ fontSize: 'var(--text-sm)' }}>Yes</label>
          </div>
        </div>
        {form.followUpRequired && <div className="form-group"><label className="form-label">Next Follow-up Date</label><input className="input" type="date" value={form.nextFollowUpDate || ''} onChange={f('nextFollowUpDate')} /></div>}
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Actual Response</label><textarea className="textarea" rows={2} value={form.actualResponse || ''} onChange={f('actualResponse')} /></div>
        <div className="form-group"><label className="form-label">Response Date</label><input className="input" type="date" value={form.responseDate || ''} onChange={f('responseDate')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Notes</label><textarea className="textarea" rows={2} value={form.notes || ''} onChange={f('notes')} /></div>
      </div>
    </Modal>
  );
}

export default function Communications() {
  const { communications, deleteCommunication } = useDataStore();
  const [activeTab, setActiveTab] = useState('all');
  const [edit, setEdit] = useState<Partial<Communication> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const filtered = useMemo(() => {
    let list = [...communications].sort((a, b) => b.date.localeCompare(a.date));
    if (activeTab === 'awaiting') list = list.filter(c => c.status === 'awaiting-response');
    if (activeTab === 'follow-up') list = list.filter(c => c.followUpRequired && c.status !== 'closed');
    if (activeTab === 'overdue') list = list.filter(c => c.status === 'awaiting-response' && c.expectedResponseDate && c.expectedResponseDate < today);
    if (search) list = list.filter(c => c.subject.toLowerCase().includes(search.toLowerCase()) || c.recipients.toLowerCase().includes(search.toLowerCase()) || c.sender.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [communications, activeTab, search, today]);

  const awaiting = communications.filter(c => c.status === 'awaiting-response').length;
  const overdueCount = communications.filter(c => c.status === 'awaiting-response' && c.expectedResponseDate && c.expectedResponseDate < today).length;
  const followUp = communications.filter(c => c.followUpRequired && c.status !== 'closed').length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div>
          <h1 className="page-title">Communications</h1>
          <p className="page-subtitle">{communications.length} records · {awaiting} awaiting response</p>
        </div>
        <button className="btn btn-primary ml-auto" onClick={() => setEdit({})}>
          <Plus size={14} /> Log Communication
        </button>
      </div>

      {overdueCount > 0 && (
        <div className="alert-banner alert-critical" style={{ marginBottom: 16 }}>
          🔴 {overdueCount} overdue response{overdueCount > 1 ? 's' : ''} — someone hasn't replied yet!
        </div>
      )}

      <div className="flex gap-4 mb-4" style={{ alignItems: 'center' }}>
        <div className="tabs" style={{ flex: 1 }}>
          {[
            { id: 'all', label: 'All', count: communications.length },
            { id: 'awaiting', label: 'Awaiting Response', count: awaiting },
            { id: 'overdue', label: 'Overdue', count: overdueCount },
            { id: 'follow-up', label: 'Follow-up Needed', count: followUp },
          ].map(tab => (
            <button key={tab.id} className={`tab${activeTab === tab.id ? ' active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
              {tab.count > 0 && <span className="tab-count">{tab.count}</span>}
            </button>
          ))}
        </div>
        <div className="input-with-icon" style={{ width: 240 }}>
          <Search className="input-icon" size={14} />
          <input className="input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No communications" desc="Log emails, calls, and meetings to track who you're waiting for." action={<button className="btn btn-primary" onClick={() => setEdit({})}>Log First Communication</button>} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Type</th>
                <th>Recipients</th>
                <th>Date</th>
                <th>Status</th>
                <th>Expected Response</th>
                <th>Follow-up</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const isOverdue = c.status === 'awaiting-response' && c.expectedResponseDate && c.expectedResponseDate < today;
                return (
                  <tr key={c.id} onClick={() => setEdit(c)} style={{ background: isOverdue ? 'var(--danger-bg)' : undefined }}>
                    <td style={{ maxWidth: 260 }}>
                      <div style={{ fontWeight: 500 }} className="truncate">{c.subject}</div>
                      {c.summary && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.summary.slice(0, 60)}</div>}
                    </td>
                    <td><span className="badge status-planned">{c.type}</span></td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: 160 }} className="truncate">{c.recipients}</td>
                    <td><DateDisplay date={c.date} showRelative={false} /></td>
                    <td><CommBadge status={c.status} /></td>
                    <td style={{ color: isOverdue ? 'var(--danger)' : 'inherit' }}>
                      {c.expectedResponseDate ? <DateDisplay date={c.expectedResponseDate} /> : '—'}
                    </td>
                    <td>
                      {c.followUpRequired ? (
                        <div>
                          <span className="badge status-blocked" style={{ fontSize: 10 }}>Yes</span>
                          {c.nextFollowUpDate && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{c.nextFollowUpDate}</div>}
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button className="btn-icon btn-ghost" onClick={() => setEdit(c)}><Edit3 size={13} /></button>
                        <button className="btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(c.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {edit !== null && <CommModal comm={edit} onClose={() => setEdit(null)} />}
      {deleteId && <ConfirmDialog message="Delete this communication?" onConfirm={() => { deleteCommunication(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}
