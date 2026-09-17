import { useState, useMemo } from 'react';
import { useDataStore } from '../store/useDataStore';
import type { ChangeRequest } from '../types';
import {
  PlusCircle, Pencil, Trash2, X, ChevronDown, ChevronUp, CheckCircle2,
  Clock, AlertCircle, XCircle, GitMerge, Send, Eye, Filter,
} from 'lucide-react';
import { format } from 'date-fns';

const CR_STATUSES: ChangeRequest['status'][] = ['draft', 'submitted', 'under-review', 'approved', 'rejected', 'withdrawn', 'implemented'];
const CR_CATEGORIES: ChangeRequest['category'][] = ['scope', 'schedule', 'budget', 'resources', 'technical', 'quality', 'other'];
const CR_PRIORITIES: ChangeRequest['priority'][] = ['critical', 'high', 'medium', 'low'];

const STATUS_META: Record<ChangeRequest['status'], { label: string; color: string; icon: React.FC<{ size?: number }> }> = {
  draft: { label: 'Draft', color: 'var(--text-muted)', icon: Clock },
  submitted: { label: 'Submitted', color: 'var(--info)', icon: Send },
  'under-review': { label: 'Under Review', color: 'var(--warning)', icon: Eye },
  approved: { label: 'Approved', color: 'var(--success)', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'var(--danger)', icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: 'var(--text-muted)', icon: XCircle },
  implemented: { label: 'Implemented', color: 'var(--accent)', icon: GitMerge },
};

const PRIORITY_COLORS: Record<ChangeRequest['priority'], string> = {
  critical: 'var(--danger)',
  high: 'var(--warning)',
  medium: 'var(--info)',
  low: 'var(--text-muted)',
};

const CATEGORY_LABELS: Record<ChangeRequest['category'], string> = {
  scope: 'Scope', schedule: 'Schedule', budget: 'Budget', resources: 'Resources',
  technical: 'Technical', quality: 'Quality', other: 'Other',
};

function StatusBadge({ status }: { status: ChangeRequest['status'] }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: meta.color, background: `${meta.color}18`, padding: '3px 10px', borderRadius: 99 }}>
      <Icon size={11} /> {meta.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: ChangeRequest['priority'] }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '0.3px', color: PRIORITY_COLORS[priority], background: `${PRIORITY_COLORS[priority]}18`, padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase' }}>
      {priority}
    </span>
  );
}

const emptyForm = (): Partial<ChangeRequest> => ({
  title: '', description: '', category: 'scope', requestor: '', requestDate: '',
  priority: 'medium', status: 'draft', impactScope: '', impactSchedule: '',
  impactBudget: '', impactResources: '', impactRisk: '', estimatedCost: 0,
  estimatedDurationDays: 0, justification: '', alternatives: '', recommendation: '',
  approver: '', approvalDate: '', decisionNotes: '', linkedMilestoneId: null,
  linkedTaskIds: '', notes: '',
});

type CrTab = 'open' | 'decided' | 'all';

export default function ChangeRequests() {
  const { changeRequests, createChangeRequest, updateChangeRequest, deleteChangeRequest } = useDataStore();

  const [activeTab, setActiveTab] = useState<CrTab>('open');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ChangeRequest>>(emptyForm());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const openStatuses: ChangeRequest['status'][] = ['draft', 'submitted', 'under-review'];
  const decidedStatuses: ChangeRequest['status'][] = ['approved', 'rejected', 'withdrawn', 'implemented'];

  const filtered = useMemo(() => {
    let items = [...changeRequests];
    if (activeTab === 'open') items = items.filter(c => openStatuses.includes(c.status));
    else if (activeTab === 'decided') items = items.filter(c => decidedStatuses.includes(c.status));
    if (filterCategory !== 'all') items = items.filter(c => c.category === filterCategory);
    if (filterPriority !== 'all') items = items.filter(c => c.priority === filterPriority);
    return items;
  }, [changeRequests, activeTab, filterCategory, filterPriority]);

  const openCount = changeRequests.filter(c => openStatuses.includes(c.status)).length;
  const approvedCount = changeRequests.filter(c => c.status === 'approved' || c.status === 'implemented').length;
  const rejectedCount = changeRequests.filter(c => c.status === 'rejected' || c.status === 'withdrawn').length;
  const totalEstimatedCost = changeRequests.filter(c => ['submitted', 'under-review', 'approved', 'implemented'].includes(c.status)).reduce((s, c) => s + c.estimatedCost, 0);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setIsModalOpen(true);
  }

  function openEdit(item: ChangeRequest, e?: React.MouseEvent) {
    e?.stopPropagation();
    setDetailId(null);
    setEditingId(item.id);
    setForm({ ...item });
    setIsModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      updateChangeRequest(editingId, form);
    } else {
      createChangeRequest(form);
    }
    setIsModalOpen(false);
    setEditingId(null);
  }

  function setField(key: keyof ChangeRequest, val: unknown) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  const detailItem = detailId ? changeRequests.find(c => c.id === detailId) : null;

  function quickStatusChange(id: string, status: ChangeRequest['status']) {
    updateChangeRequest(id, { status });
  }

  function formatCost(n: number): string {
    if (n === 0) return '—';
    const prefix = n < 0 ? '-€' : '+€';
    return prefix + Math.abs(n).toLocaleString();
  }

  return (
    <div className="cr-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="page-title">Change Request Log</h1>
          <p className="page-subtitle">Track, assess, and manage project change requests through a formal approval workflow. Monitor scope, schedule, and budget impacts.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <PlusCircle size={15} /> New Change Request
        </button>
      </div>

      {/* Summary KPI cards */}
      <div className="cr-kpi-grid mb-6">
        <div className="card cr-kpi-card">
          <AlertCircle size={22} color="var(--warning)" />
          <div>
            <div className="cr-kpi-value" style={{ color: openCount > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>{openCount}</div>
            <div className="cr-kpi-label">Pending Decision</div>
          </div>
        </div>
        <div className="card cr-kpi-card">
          <CheckCircle2 size={22} color="var(--success)" />
          <div>
            <div className="cr-kpi-value">{approvedCount}</div>
            <div className="cr-kpi-label">Approved / Implemented</div>
          </div>
        </div>
        <div className="card cr-kpi-card">
          <XCircle size={22} color="var(--danger)" />
          <div>
            <div className="cr-kpi-value">{rejectedCount}</div>
            <div className="cr-kpi-label">Rejected / Withdrawn</div>
          </div>
        </div>
        <div className="card cr-kpi-card">
          <GitMerge size={22} color="var(--accent)" />
          <div>
            <div className="cr-kpi-value" style={{ color: totalEstimatedCost > 0 ? 'var(--danger)' : totalEstimatedCost < 0 ? 'var(--success)' : 'var(--text-primary)' }}>
              {totalEstimatedCost === 0 ? '—' : (totalEstimatedCost > 0 ? '+' : '') + '€' + Math.abs(totalEstimatedCost).toLocaleString()}
            </div>
            <div className="cr-kpi-label">Net Cost Impact (Active CRs)</div>
          </div>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="tab-bar">
          {(['open', 'decided', 'all'] as CrTab[]).map(tab => (
            <button key={tab} className={`tab-btn${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'open' && openCount > 0 && <span className="tab-badge">{openCount}</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} color="var(--text-muted)" />
          <select className="input" style={{ width: 130 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {CR_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
          <select className="input" style={{ width: 120 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="all">All Priorities</option>
            {CR_PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* CR List */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <GitMerge size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>No change requests found. <button className="btn btn-primary btn-sm ml-2" onClick={openCreate}>Create First CR</button></p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(cr => {
            const meta = STATUS_META[cr.status];
            const isExpanded = expandedId === cr.id;
            return (
              <div
                key={cr.id}
                className="card cr-card"
                style={{ borderLeft: `4px solid ${PRIORITY_COLORS[cr.priority]}` }}
              >
                {/* Card Header */}
                <div
                  className="cr-card-header"
                  onClick={() => setExpandedId(isExpanded ? null : cr.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <PriorityBadge priority={cr.priority} />
                      <span className="badge badge-neutral" style={{ fontSize: 11 }}>{CATEGORY_LABELS[cr.category]}</span>
                      <StatusBadge status={cr.status} />
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{cr.title}</h3>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Requested by <strong style={{ color: 'var(--text-secondary)' }}>{cr.requestor || 'Unknown'}</strong>
                      {cr.requestDate && <> on {format(new Date(cr.requestDate), 'MMM d, yyyy')}</>}
                      {cr.approver && <> · Approver: <strong style={{ color: 'var(--text-secondary)' }}>{cr.approver}</strong></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4" style={{ flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      {cr.estimatedCost !== 0 && (
                        <div style={{ fontSize: 13, fontWeight: 700, color: cr.estimatedCost > 0 ? 'var(--danger)' : 'var(--success)' }}>
                          {formatCost(cr.estimatedCost)}
                        </div>
                      )}
                      {cr.estimatedDurationDays !== 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {cr.estimatedDurationDays > 0 ? '+' : ''}{cr.estimatedDurationDays}d
                        </div>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="cr-card-body">
                    {/* Description */}
                    {cr.description && (
                      <div className="cr-field-block">
                        <div className="cr-field-label">Description</div>
                        <div className="cr-field-value">{cr.description}</div>
                      </div>
                    )}

                    {/* Impact Grid */}
                    <div className="cr-impact-grid">
                      {cr.impactScope && (
                        <div className="cr-impact-block scope">
                          <div className="cr-impact-label">📐 Scope Impact</div>
                          <div className="cr-impact-text">{cr.impactScope}</div>
                        </div>
                      )}
                      {cr.impactSchedule && (
                        <div className="cr-impact-block schedule">
                          <div className="cr-impact-label">📅 Schedule Impact</div>
                          <div className="cr-impact-text">{cr.impactSchedule}</div>
                        </div>
                      )}
                      {cr.impactBudget && (
                        <div className="cr-impact-block budget">
                          <div className="cr-impact-label">💰 Budget Impact</div>
                          <div className="cr-impact-text">{cr.impactBudget}</div>
                        </div>
                      )}
                      {cr.impactResources && (
                        <div className="cr-impact-block resources">
                          <div className="cr-impact-label">👥 Resource Impact</div>
                          <div className="cr-impact-text">{cr.impactResources}</div>
                        </div>
                      )}
                      {cr.impactRisk && (
                        <div className="cr-impact-block risk">
                          <div className="cr-impact-label">⚠️ Risk Impact</div>
                          <div className="cr-impact-text">{cr.impactRisk}</div>
                        </div>
                      )}
                    </div>

                    {/* Analysis fields */}
                    <div className="cr-analysis-grid">
                      {cr.justification && (
                        <div>
                          <div className="cr-field-label">Justification</div>
                          <div className="cr-field-value">{cr.justification}</div>
                        </div>
                      )}
                      {cr.alternatives && (
                        <div>
                          <div className="cr-field-label">Alternatives Considered</div>
                          <div className="cr-field-value" style={{ whiteSpace: 'pre-line' }}>{cr.alternatives}</div>
                        </div>
                      )}
                      {cr.recommendation && (
                        <div>
                          <div className="cr-field-label">PM Recommendation</div>
                          <div className="cr-field-value" style={{ color: 'var(--accent)' }}>{cr.recommendation}</div>
                        </div>
                      )}
                    </div>

                    {/* Decision Notes */}
                    {cr.decisionNotes && (
                      <div className="cr-decision-block">
                        <div className="cr-field-label">Decision Notes{cr.approvalDate && ` — ${format(new Date(cr.approvalDate), 'MMMM d, yyyy')}`}</div>
                        <div className="cr-field-value">{cr.decisionNotes}</div>
                      </div>
                    )}

                    {cr.notes && (
                      <div style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>📝 {cr.notes}</div>
                    )}

                    {/* Action Bar */}
                    <div className="cr-action-bar">
                      {/* Quick status transitions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {cr.status === 'draft' && (
                          <button className="btn btn-sm" style={{ background: 'var(--info)', color: '#fff' }} onClick={() => quickStatusChange(cr.id, 'submitted')}>
                            <Send size={12} /> Submit for Review
                          </button>
                        )}
                        {cr.status === 'submitted' && (
                          <button className="btn btn-sm" style={{ background: 'var(--warning)', color: '#fff' }} onClick={() => quickStatusChange(cr.id, 'under-review')}>
                            <Eye size={12} /> Start Review
                          </button>
                        )}
                        {(cr.status === 'under-review' || cr.status === 'submitted') && (
                          <>
                            <button className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff' }} onClick={() => quickStatusChange(cr.id, 'approved')}>
                              <CheckCircle2 size={12} /> Approve
                            </button>
                            <button className="btn btn-sm" style={{ background: 'var(--danger)', color: '#fff' }} onClick={() => quickStatusChange(cr.id, 'rejected')}>
                              <XCircle size={12} /> Reject
                            </button>
                          </>
                        )}
                        {cr.status === 'approved' && (
                          <button className="btn btn-sm" style={{ background: 'var(--accent)', color: '#fff' }} onClick={() => quickStatusChange(cr.id, 'implemented')}>
                            <GitMerge size={12} /> Mark Implemented
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <button className="btn btn-secondary btn-sm" onClick={(e) => openEdit(cr, e)}>
                          <Pencil size={12} /> Edit
                        </button>
                        <button className="btn btn-sm" style={{ color: 'var(--danger)', background: 'transparent', border: '1px solid var(--danger)' }} onClick={() => setConfirmDeleteId(cr.id)}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Edit Change Request' : 'New Change Request'}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Title *</label>
                    <input className="input" required value={form.title || ''} onChange={e => setField('title', e.target.value)} placeholder="Short, descriptive title of the change request" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="textarea" rows={3} value={form.description || ''} onChange={e => setField('description', e.target.value)} placeholder="Detailed description of what is being requested and why..." />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="input" value={form.category || 'scope'} onChange={e => setField('category', e.target.value)}>
                      {CR_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="input" value={form.priority || 'medium'} onChange={e => setField('priority', e.target.value)}>
                      {CR_PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="input" value={form.status || 'draft'} onChange={e => setField('status', e.target.value)}>
                      {CR_STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Request Date</label>
                    <input className="input" type="date" value={form.requestDate || ''} onChange={e => setField('requestDate', e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Requestor</label>
                    <input className="input" value={form.requestor || ''} onChange={e => setField('requestor', e.target.value)} placeholder="Name and role" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Approver</label>
                    <input className="input" value={form.approver || ''} onChange={e => setField('approver', e.target.value)} placeholder="Decision maker name" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Estimated Cost Impact (€, negative = saving)</label>
                    <input className="input" type="number" step={100} value={form.estimatedCost ?? 0} onChange={e => setField('estimatedCost', Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estimated Duration Impact (days, negative = shorter)</label>
                    <input className="input" type="number" step={1} value={form.estimatedDurationDays ?? 0} onChange={e => setField('estimatedDurationDays', Number(e.target.value))} />
                  </div>
                </div>

                <div className="cr-modal-section-label">Impact Analysis</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Scope Impact</label>
                    <textarea className="textarea" rows={2} value={form.impactScope || ''} onChange={e => setField('impactScope', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Schedule Impact</label>
                    <textarea className="textarea" rows={2} value={form.impactSchedule || ''} onChange={e => setField('impactSchedule', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Budget Impact</label>
                    <textarea className="textarea" rows={2} value={form.impactBudget || ''} onChange={e => setField('impactBudget', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Resource Impact</label>
                    <textarea className="textarea" rows={2} value={form.impactResources || ''} onChange={e => setField('impactResources', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Risk Impact</label>
                    <textarea className="textarea" rows={2} value={form.impactRisk || ''} onChange={e => setField('impactRisk', e.target.value)} />
                  </div>
                </div>

                <div className="cr-modal-section-label">Decision & Analysis</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Justification</label>
                    <textarea className="textarea" rows={2} value={form.justification || ''} onChange={e => setField('justification', e.target.value)} placeholder="Why is this change necessary?" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Alternatives Considered</label>
                    <textarea className="textarea" rows={2} value={form.alternatives || ''} onChange={e => setField('alternatives', e.target.value)} placeholder="What other options were assessed?" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PM Recommendation</label>
                    <textarea className="textarea" rows={2} value={form.recommendation || ''} onChange={e => setField('recommendation', e.target.value)} placeholder="What does the PM recommend and why?" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Approval Date</label>
                    <input className="input" type="date" value={form.approvalDate || ''} onChange={e => setField('approvalDate', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Decision Notes</label>
                    <input className="input" value={form.decisionNotes || ''} onChange={e => setField('decisionNotes', e.target.value)} placeholder="Decision rationale or conditions" />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 14 }}>
                  <label className="form-label">Internal Notes</label>
                  <textarea className="textarea" rows={2} value={form.notes || ''} onChange={e => setField('notes', e.target.value)} placeholder="Tracking notes, follow-up items, stakeholder reactions..." />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Create Change Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDeleteId && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 400 }}>
            <div className="modal-header"><h3 className="modal-title">Confirm Delete</h3></div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                Are you sure you want to delete this change request? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { deleteChangeRequest(confirmDeleteId); setConfirmDeleteId(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
