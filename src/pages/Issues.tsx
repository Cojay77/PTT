import { useState } from 'react';
import { Plus, Trash2, Edit3, Flame } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { SeverityBadge, IssueBadge, DateDisplay, Modal, ConfirmDialog, EmptyState } from '../components/ui/shared';
import type { Issue, Severity, IssueStatus } from '../types';

function IssueModal({ issue, onClose }: { issue?: Partial<Issue>; onClose: () => void }) {
  const { createIssue, updateIssue } = useDataStore();
  const isEdit = Boolean(issue?.id);
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState<Partial<Issue>>({ title: '', description: '', impact: '', severity: 'medium', owner: '', detectedDate: today, resolutionTarget: '', resolutionActions: '', status: 'open', escalationStatus: '', notes: '', ...issue });
  function save() { if (!form.title?.trim()) return; if (isEdit) updateIssue(issue!.id!, form); else createIssue(form); onClose(); }
  const f = (k: keyof Issue) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <Modal title={isEdit ? 'Edit Issue / Blocker' : 'New Issue / Blocker'} onClose={onClose} size="lg"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
    >
      <div className="form-row">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label required">Title</label><input className="input" value={form.title || ''} onChange={f('title')} autoFocus /></div>
        <div className="form-group"><label className="form-label">Severity</label><select className="select" value={form.severity} onChange={f('severity')}>{(['critical', 'high', 'medium', 'low'] as Severity[]).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Status</label><select className="select" value={form.status} onChange={f('status')}>{(['open', 'in-progress', 'resolved', 'escalated', 'closed'] as IssueStatus[]).map(s => <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Owner</label><input className="input" value={form.owner || ''} onChange={f('owner')} /></div>
        <div className="form-group"><label className="form-label">Detected Date</label><input className="input" type="date" value={form.detectedDate || ''} onChange={f('detectedDate')} /></div>
        <div className="form-group"><label className="form-label">Resolution Target</label><input className="input" type="date" value={form.resolutionTarget || ''} onChange={f('resolutionTarget')} /></div>
        <div className="form-group"><label className="form-label">Escalation Status</label><input className="input" value={form.escalationStatus || ''} onChange={f('escalationStatus')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Description</label><textarea className="textarea" rows={3} value={form.description || ''} onChange={f('description')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Impact</label><textarea className="textarea" rows={2} value={form.impact || ''} onChange={f('impact')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Resolution Actions</label><textarea className="textarea" rows={3} value={form.resolutionActions || ''} onChange={f('resolutionActions')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Notes</label><textarea className="textarea" rows={2} value={form.notes || ''} onChange={f('notes')} /></div>
      </div>
    </Modal>
  );
}

export default function Issues() {
  const { issues, deleteIssue } = useDataStore();
  const [edit, setEdit] = useState<Partial<Issue> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('open');

  const filtered = filterStatus === 'all' ? issues : issues.filter(i => i.status === filterStatus || (filterStatus === 'open' && ['open', 'in-progress', 'escalated'].includes(i.status)));
  const openCount = issues.filter(i => ['open', 'in-progress', 'escalated'].includes(i.status)).length;
  const critical = issues.filter(i => i.severity === 'critical' && ['open', 'in-progress', 'escalated'].includes(i.status)).length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div><h1 className="page-title">Issues & Blockers</h1><p className="page-subtitle">{openCount} open · {critical} critical</p></div>
        <button className="btn btn-primary ml-auto" onClick={() => setEdit({})}><Plus size={14} /> Log Issue</button>
      </div>

      {critical > 0 && <div className="alert-banner alert-critical" style={{ marginBottom: 16 }}>🚫 {critical} critical issue{critical > 1 ? 's' : ''} require immediate resolution!</div>}

      <div className="tabs" style={{ marginBottom: 16 }}>
        {[
          { id: 'open', label: 'Open', count: issues.filter(i => ['open', 'in-progress', 'escalated'].includes(i.status)).length },
          { id: 'resolved', label: 'Resolved', count: issues.filter(i => i.status === 'resolved').length },
          { id: 'all', label: 'All', count: issues.length },
        ].map(tab => (
          <button key={tab.id} className={`tab${filterStatus === tab.id ? ' active' : ''}`} onClick={() => setFilterStatus(tab.id)}>
            {tab.label} <span className="tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Flame} title={filterStatus === 'open' ? 'No open issues — great!' : 'No issues'} desc="Track blockers, problems, and escalations here." action={<button className="btn btn-primary" onClick={() => setEdit({})}>Log Issue</button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(i => (
            <div key={i.id} className="card" style={{ borderLeft: `4px solid ${i.severity === 'critical' ? 'var(--danger)' : i.severity === 'high' ? 'var(--warning)' : 'var(--border)'}`, cursor: 'pointer' }} onClick={() => setEdit(i)}>
              <div className="card-body">
                <div className="flex items-start gap-3">
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-md)' }}>{i.title}</span>
                      <SeverityBadge severity={i.severity} />
                      <IssueBadge status={i.status} />
                    </div>
                    {i.description && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 4 }}>{i.description}</p>}
                    {i.impact && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--danger)', fontWeight: 500 }}>⚡ Impact: {i.impact}</p>}
                    {i.resolutionActions && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 4 }}>▶ {i.resolutionActions.slice(0, 120)}</p>}
                    {i.escalationStatus && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--warning)', marginTop: 4 }}>⬆ {i.escalationStatus}</p>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Detected: {i.detectedDate}</div>
                    {i.resolutionTarget && <div style={{ fontSize: 11, color: i.resolutionTarget < new Date().toISOString().split('T')[0] ? 'var(--danger)' : 'var(--text-muted)' }}>Target: {i.resolutionTarget}</div>}
                    {i.owner && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Owner: {i.owner}</div>}
                    <div className="flex gap-1 justify-end mt-2" onClick={e => e.stopPropagation()}>
                      <button className="btn-icon btn-ghost" onClick={() => setEdit(i)}><Edit3 size={13} /></button>
                      <button className="btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(i.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {edit !== null && <IssueModal issue={edit} onClose={() => setEdit(null)} />}
      {deleteId && <ConfirmDialog message="Delete this issue?" onConfirm={() => { deleteIssue(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}
