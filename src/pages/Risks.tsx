import { useState } from 'react';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { SeverityBadge, DateDisplay, Modal, ConfirmDialog, EmptyState } from '../components/ui/shared';
import type { Risk, Severity, RiskStatus, Probability, Impact } from '../types';
import { AlertTriangle } from 'lucide-react';

const CATEGORIES = ['Technical', 'Resource', 'Business', 'Infrastructure', 'Security', 'Legal', 'External', 'Financial', 'Schedule', 'Scope'];

function RiskModal({ risk, onClose }: { risk?: Partial<Risk>; onClose: () => void }) {
  const { createRisk, updateRisk } = useDataStore();
  const milestones = useDataStore(s => s.milestones);
  const isEdit = Boolean(risk?.id);
  const [form, setForm] = useState<Partial<Risk>>({
    title: '', description: '', category: '', probability: 3, impact: 3, severity: 'medium',
    owner: '', mitigationStrategy: '', contingencyPlan: '', status: 'identified',
    targetResolutionDate: '', notes: '', ...risk,
  });

  const computedSeverity = (): Severity => {
    const score = (form.probability || 3) * (form.impact || 3);
    if (score >= 16) return 'critical';
    if (score >= 9) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  };

  function save() {
    if (!form.title?.trim()) return;
    const data = { ...form, severity: computedSeverity() };
    if (isEdit) updateRisk(risk!.id!, data);
    else createRisk(data);
    onClose();
  }
  const f = (k: keyof Risk) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <Modal title={isEdit ? 'Edit Risk' : 'New Risk'} onClose={onClose} size="lg"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
    >
      <div className="form-row">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label required">Title</label><input className="input" value={form.title || ''} onChange={f('title')} autoFocus /></div>
        <div className="form-group"><label className="form-label">Category</label><select className="select" value={form.category} onChange={f('category')}><option value="">Select...</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Owner</label><input className="input" value={form.owner || ''} onChange={f('owner')} /></div>
        <div className="form-group"><label className="form-label">Status</label><select className="select" value={form.status} onChange={f('status')}>{(['identified', 'analysed', 'mitigated', 'accepted', 'closed'] as RiskStatus[]).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Target Resolution</label><input className="input" type="date" value={form.targetResolutionDate || ''} onChange={f('targetResolutionDate')} /></div>
        <div className="form-group">
          <label className="form-label">Probability (1-5): {form.probability}</label>
          <input type="range" min="1" max="5" value={form.probability || 3} onChange={e => setForm(p => ({ ...p, probability: Number(e.target.value) as Probability }))} style={{ width: '100%' }} />
        </div>
        <div className="form-group">
          <label className="form-label">Impact (1-5): {form.impact}</label>
          <input type="range" min="1" max="5" value={form.impact || 3} onChange={e => setForm(p => ({ ...p, impact: Number(e.target.value) as Impact }))} style={{ width: '100%' }} />
        </div>
        <div className="form-group">
          <label className="form-label">Computed Severity</label>
          <div style={{ marginTop: 8 }}><SeverityBadge severity={computedSeverity()} /></div>
        </div>
        <div className="form-group">
          <label className="form-label">Milestone</label>
          <select className="select" value={form.relatedMilestoneId || ''} onChange={e => setForm(p => ({ ...p, relatedMilestoneId: e.target.value || null }))}>
            <option value="">No milestone</option>
            {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Description</label><textarea className="textarea" rows={3} value={form.description || ''} onChange={f('description')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Mitigation Strategy</label><textarea className="textarea" rows={3} value={form.mitigationStrategy || ''} onChange={f('mitigationStrategy')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Contingency Plan</label><textarea className="textarea" rows={2} value={form.contingencyPlan || ''} onChange={f('contingencyPlan')} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Notes</label><textarea className="textarea" rows={2} value={form.notes || ''} onChange={f('notes')} /></div>
      </div>
    </Modal>
  );
}

const MATRIX_COLORS: Record<number, string> = {
  1: '#22c55e', 2: '#86efac', 3: '#fbbf24', 4: '#f97316', 6: '#fbbf24',
  8: '#f97316', 9: '#ef4444', 10: '#f97316', 12: '#dc2626', 15: '#b91c1c',
  16: '#991b1b', 20: '#7f1d1d', 25: '#7f1d1d',
};
function matrixColor(p: number, i: number) {
  const s = p * i;
  if (s >= 20) return '#7f1d1d';
  if (s >= 15) return '#991b1b';
  if (s >= 12) return '#dc2626';
  if (s >= 9) return '#ef4444';
  if (s >= 6) return '#f97316';
  if (s >= 4) return '#fbbf24';
  if (s >= 2) return '#86efac';
  return '#22c55e';
}

export default function Risks() {
  const { risks, deleteRisk } = useDataStore();
  const [edit, setEdit] = useState<Partial<Risk> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);

  const open = risks.filter(r => !['closed', 'accepted'].includes(r.status));
  const critical = open.filter(r => r.severity === 'critical').length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div><h1 className="page-title">Risk Register</h1><p className="page-subtitle">{open.length} open risks · {critical} critical</p></div>
        <div className="ml-auto flex gap-2">
          <button className="btn btn-secondary" onClick={() => setShowMatrix(v => !v)}>{showMatrix ? 'Hide' : 'Show'} Risk Matrix</button>
          <button className="btn btn-primary" onClick={() => setEdit({})}><Plus size={14} /> Add Risk</button>
        </div>
      </div>

      {critical > 0 && <div className="alert-banner alert-critical" style={{ marginBottom: 16 }}>🔴 {critical} critical risk{critical > 1 ? 's' : ''} require immediate attention.</div>}

      {showMatrix && (
        <div className="card" style={{ marginBottom: 24, padding: 24 }}>
          <div className="section-title mb-4">Risk Matrix</div>
          <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(5, 1fr)', gap: 4, maxWidth: 420 }}>
            <div />
            {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>I={i}</div>)}
            {[5, 4, 3, 2, 1].map(p => (
              <>
                <div key={`p${p}`} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>P={p}</div>
                {[1, 2, 3, 4, 5].map(i => {
                  const count = risks.filter(r => r.probability === p && r.impact === i && r.status !== 'closed').length;
                  return (
                    <div key={`${p}-${i}`} style={{ height: 48, borderRadius: 6, background: matrixColor(p, i), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: count ? 16 : 11, opacity: count ? 1 : 0.3 }}>
                      {count || ''}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
          <div className="flex gap-3 mt-3">
            {[['critical', '#991b1b'], ['high', '#ef4444'], ['medium', '#fbbf24'], ['low', '#22c55e']].map(([l, c]) => (
              <div key={l} className="flex items-center gap-1" style={{ fontSize: 11 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: c as string }} />
                <span style={{ color: 'var(--text-muted)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {risks.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No risks registered" desc="Document project risks to track probability, impact, and mitigation." action={<button className="btn btn-primary" onClick={() => setEdit({})}>Add First Risk</button>} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Risk</th>
                <th>Category</th>
                <th>Severity</th>
                <th>P×I</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Resolution Target</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {risks.map(r => (
                <tr key={r.id} onClick={() => setEdit(r)} style={{ background: r.severity === 'critical' ? 'var(--danger-bg)' : r.severity === 'high' ? 'var(--warning-bg)' : undefined }}>
                  <td style={{ maxWidth: 280 }}>
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    {r.mitigationStrategy && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>🛡️ {r.mitigationStrategy.slice(0, 60)}</div>}
                  </td>
                  <td><span className="badge status-planned">{r.category || '—'}</span></td>
                  <td><SeverityBadge severity={r.severity} /></td>
                  <td>
                    <div style={{ width: 36, height: 36, borderRadius: 6, background: matrixColor(r.probability, r.impact), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12 }}>
                      {r.probability * r.impact}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{r.owner || '—'}</td>
                  <td><span className="badge status-planned">{r.status}</span></td>
                  <td><DateDisplay date={r.targetResolutionDate} /></td>
                  <td>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button className="btn-icon btn-ghost" onClick={() => setEdit(r)}><Edit3 size={13} /></button>
                      <button className="btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(r.id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit !== null && <RiskModal risk={edit} onClose={() => setEdit(null)} />}
      {deleteId && <ConfirmDialog message="Delete this risk?" onConfirm={() => { deleteRisk(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}
