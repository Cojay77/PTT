import { useState, useMemo, Fragment } from 'react';
import { useDataStore } from '../store/useDataStore';
import type { BudgetItem } from '../types';
import {
  PlusCircle, Pencil, Trash2, X, TrendingUp, TrendingDown, DollarSign,
  AlertTriangle, CheckCircle2, Package, BarChart3, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];
const BUDGET_TYPES: BudgetItem['type'][] = ['opex', 'capex', 'resource', 'infrastructure', 'license', 'consulting', 'other'];
const BUDGET_STATUSES: BudgetItem['status'][] = ['planned', 'committed', 'invoiced', 'paid', 'cancelled'];
const CATEGORIES = ['Team', 'Infrastructure', 'Licenses', 'Consulting', 'Reserve', 'Travel', 'Other'];

const STATUS_COLORS: Record<BudgetItem['status'], string> = {
  planned: 'var(--text-muted)',
  committed: 'var(--info)',
  invoiced: 'var(--warning)',
  paid: 'var(--success)',
  cancelled: 'var(--danger)',
};

const TYPE_LABELS: Record<BudgetItem['type'], string> = {
  opex: 'OpEx', capex: 'CapEx', resource: 'Resource', infrastructure: 'Infrastructure',
  license: 'License', consulting: 'Consulting', other: 'Other',
};

const CHART_COLORS = ['#4f8ef7', '#7c6af7', '#f79a4f', '#4ff7a8', '#f74f8e', '#f7d14f', '#4fd9f7'];

function fmt(n: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

function VariancePill({ planned, actual, currency }: { planned: number; actual: number; currency?: string }) {
  const diff = actual - planned;
  if (Math.abs(diff) < 0.01) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>;
  const pct = planned > 0 ? ((diff / planned) * 100).toFixed(1) : '∞';
  const over = diff > 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 600, color: over ? 'var(--danger)' : 'var(--success)' }}>
      {over ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {over ? '+' : ''}{fmt(diff, currency)} ({over ? '+' : ''}{pct}%)
    </span>
  );
}

const emptyForm = (): Partial<BudgetItem> => ({
  category: 'Team', description: '', type: 'opex', vendor: '', plannedAmount: 0,
  actualAmount: 0, forecastAmount: 0, currency: 'EUR', status: 'planned',
  invoiceDate: '', paymentDate: '', purchaseOrder: '', phase: '', milestoneId: null, notes: '',
});

export default function Budget() {
  const { budgetItems, createBudgetItem, updateBudgetItem, deleteBudgetItem } = useDataStore();

  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<BudgetItem>>(emptyForm());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let items = [...budgetItems];
    if (filterType !== 'all') items = items.filter(b => b.type === filterType);
    if (filterStatus !== 'all') items = items.filter(b => b.status === filterStatus);
    return items;
  }, [budgetItems, filterType, filterStatus]);

  // Derive display currency: use the most-common currency across items (default EUR)
  const currency = useMemo(() => {
    if (budgetItems.length === 0) return 'EUR';
    const counts: Record<string, number> = {};
    budgetItems.forEach(b => { counts[b.currency] = (counts[b.currency] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [budgetItems]);

  // Detect mixed currencies
  const uniqueCurrencies = useMemo(() => {
    return [...new Set(budgetItems.map(b => b.currency))];
  }, [budgetItems]);
  const hasMixedCurrencies = uniqueCurrencies.length > 1;

  // KPIs — totals are summed numerically; mixed-currency projects should be aware
  const totalPlanned = budgetItems.filter(b => b.currency === currency).reduce((s, b) => s + b.plannedAmount, 0);
  const totalActual = budgetItems.filter(b => b.currency === currency).reduce((s, b) => s + b.actualAmount, 0);
  const totalForecast = budgetItems.filter(b => b.currency === currency).reduce((s, b) => s + b.forecastAmount, 0);
  const totalVariance = totalForecast - totalPlanned;
  const pctSpent = totalPlanned > 0 ? Math.min(100, Math.round((totalActual / totalPlanned) * 100)) : 0;
  const overBudgetItems = budgetItems.filter(b => b.forecastAmount > b.plannedAmount && b.status !== 'cancelled').length;
  const isBudgetBreached = totalPlanned > 0 && totalForecast > totalPlanned;
  const budgetBreachPct = totalPlanned > 0 ? (((totalForecast - totalPlanned) / totalPlanned) * 100).toFixed(1) : '0';


  // Category chart data
  const categoryData = useMemo(() => {
    const cats: Record<string, { planned: number; actual: number; forecast: number }> = {};
    budgetItems.forEach(b => {
      if (!cats[b.category]) cats[b.category] = { planned: 0, actual: 0, forecast: 0 };
      cats[b.category].planned += b.plannedAmount;
      cats[b.category].actual += b.actualAmount;
      cats[b.category].forecast += b.forecastAmount;
    });
    return Object.entries(cats).map(([name, values]) => ({ name, ...values }));
  }, [budgetItems]);

  // Type breakdown
  const typeData = useMemo(() => {
    const types: Record<string, number> = {};
    budgetItems.forEach(b => { types[b.type] = (types[b.type] || 0) + b.plannedAmount; });
    return Object.entries(types).map(([name, value]) => ({ name: TYPE_LABELS[name as BudgetItem['type']] || name, value }));
  }, [budgetItems]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setIsModalOpen(true);
  }

  function openEdit(item: BudgetItem) {
    setEditingId(item.id);
    setForm({ ...item });
    setIsModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      updateBudgetItem(editingId, form);
    } else {
      createBudgetItem(form);
    }
    setIsModalOpen(false);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    deleteBudgetItem(id);
    setConfirmDeleteId(null);
  }

  function setField(key: keyof BudgetItem, val: unknown) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  const grouped = useMemo(() => {
    const g: Record<string, BudgetItem[]> = {};
    filtered.forEach(b => {
      if (!g[b.category]) g[b.category] = [];
      g[b.category].push(b);
    });
    return g;
  }, [filtered]);

  return (
    <div className="budget-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="page-title">Budget Tracking</h1>
          <p className="page-subtitle">Track planned vs. actual project spend by category, vendor, and type. Monitor variances and forecast to completion.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <PlusCircle size={15} /> Add Budget Line
        </button>
      </div>

      {/* Multi-currency warning banner */}
      {hasMixedCurrencies && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', marginBottom: 16, background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--warning)' }}>
          <AlertTriangle size={15} />
          <span>
            <strong>Mixed currencies detected</strong> — {uniqueCurrencies.join(', ')}.
            KPI totals show <strong>{currency}</strong> items only. Set a single currency per project for accurate consolidated totals.
          </span>
        </div>
      )}

      {/* Budget ceiling breach banner */}
      {isBudgetBreached && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', marginBottom: 16, background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--danger)' }}>
          <TrendingUp size={15} />
          <span>
            <strong>Budget ceiling breached</strong> — forecast at completion exceeds planned budget by{' '}
            <strong>{fmt(totalForecast - totalPlanned, currency)}</strong> (+{budgetBreachPct}%).
            Review over-forecast lines and update mitigation actions.
          </span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="budget-kpi-grid mb-6">
        <div className="card budget-kpi-card">
          <div className="budget-kpi-icon-wrap info"><DollarSign size={22} color="var(--info)" /></div>
          <div className="budget-kpi-content">
            <span className="budget-kpi-label">Total Budget (Planned)</span>
            <span className="budget-kpi-value">{fmt(totalPlanned, currency)}</span>
          </div>
        </div>

        <div className="card budget-kpi-card">
          <div className="budget-kpi-icon-wrap success"><CheckCircle2 size={22} color="var(--success)" /></div>
          <div className="budget-kpi-content">
            <span className="budget-kpi-label">Actual Spend to Date</span>
            <span className="budget-kpi-value">{fmt(totalActual, currency)}</span>
            <span className="budget-kpi-sub">{pctSpent}% of plan consumed</span>
          </div>
        </div>

        <div className="card budget-kpi-card">
          <div className={`budget-kpi-icon-wrap ${totalVariance > 0 ? 'danger' : 'success'}`}>
            {totalVariance > 0 ? <TrendingUp size={22} color="var(--danger)" /> : <TrendingDown size={22} color="var(--success)" />}
          </div>
          <div className="budget-kpi-content">
            <span className="budget-kpi-label">Forecast at Completion</span>
            <span className="budget-kpi-value">{fmt(totalForecast, currency)}</span>
            <span className="budget-kpi-sub" style={{ color: totalVariance > 0 ? 'var(--danger)' : 'var(--success)' }}>
              Variance: {totalVariance > 0 ? '+' : ''}{fmt(totalVariance, currency)}
            </span>
          </div>
        </div>

        <div className="card budget-kpi-card">
          <div className={`budget-kpi-icon-wrap ${overBudgetItems > 0 ? 'warning' : 'neutral'}`}>
            <AlertTriangle size={22} color={overBudgetItems > 0 ? 'var(--warning)' : 'var(--text-muted)'} />
          </div>
          <div className="budget-kpi-content">
            <span className="budget-kpi-label">Over-Forecast Items</span>
            <span className="budget-kpi-value" style={{ color: overBudgetItems > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>{overBudgetItems}</span>
            <span className="budget-kpi-sub">lines exceeding planned budget</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card mb-6" style={{ padding: '16px 20px' }}>
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Overall Budget Consumption</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: pctSpent > 90 ? 'var(--danger)' : 'var(--text-primary)' }}>{pctSpent}%</span>
        </div>
        <div className="budget-progress-track">
          <div
            className="budget-progress-fill"
            style={{ width: `${pctSpent}%`, background: pctSpent > 90 ? 'var(--danger)' : pctSpent > 70 ? 'var(--warning)' : 'var(--success)' }}
          />
        </div>
        <div className="flex items-center justify-between mt-2" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          <span>0</span>
          <span>Actual: {fmt(totalActual, currency)} / Planned: {fmt(totalPlanned, currency)}</span>
          <span>{fmt(totalPlanned, currency)}</span>
        </div>
      </div>

      {/* Charts Row */}
      {categoryData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
          <div className="card">
            <div className="card-header"><BarChart3 size={16} color="var(--accent)" /><span className="section-title">Planned vs. Actual vs. Forecast by Category</span></div>
            <div style={{ padding: '8px 16px 16px' }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip formatter={(v: number) => fmt(v, currency)} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="planned" name="Planned" fill="#4f8ef7" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="actual" name="Actual" fill="#4ff7a8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="forecast" name="Forecast" fill="#f79a4f" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><Package size={16} color="var(--accent)" /><span className="section-title">Planned Budget by Type</span></div>
            <div style={{ padding: '12px 16px' }}>
              {typeData.map((d, i) => (
                <div key={d.name} style={{ marginBottom: 10 }}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{d.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{fmt(d.value, currency)}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-muted)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${totalPlanned > 0 ? (d.value / totalPlanned) * 100 : 0}%`, background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filter:</span>
        <select className="input" style={{ width: 140 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {BUDGET_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <select className="input" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          {BUDGET_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} line{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Budget Lines Table — grouped by category */}
      {Object.keys(grouped).length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <DollarSign size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>No budget lines found. <button className="btn btn-primary btn-sm ml-2" onClick={openCreate}>Add First Line</button></p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => {
          const catPlanned = items.reduce((s, b) => s + b.plannedAmount, 0);
          const catActual = items.reduce((s, b) => s + b.actualAmount, 0);
          const catForecast = items.reduce((s, b) => s + b.forecastAmount, 0);
          return (
            <div key={cat} className="card mb-3">
              {/* Category Header */}
              <div style={{ padding: '12px 20px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{cat}</span>
                  <div className="flex items-center gap-6" style={{ fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Planned: <strong style={{ color: 'var(--text-primary)' }}>{fmt(catPlanned, currency)}</strong></span>
                    <span style={{ color: 'var(--text-muted)' }}>Actual: <strong style={{ color: 'var(--success)' }}>{fmt(catActual, currency)}</strong></span>
                    <span style={{ color: 'var(--text-muted)' }}>Forecast: <strong style={{ color: catForecast > catPlanned ? 'var(--danger)' : 'var(--text-primary)' }}>{fmt(catForecast, currency)}</strong></span>
                  </div>
                </div>
              </div>

              {/* Line items */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '8px 20px', textAlign: 'left', fontWeight: 600 }}>Description</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Type</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Vendor</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Planned</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Actual</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Forecast</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Variance</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <Fragment key={item.id}>
                      <tr
                        style={{ borderTop: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        className="budget-row"
                      >
                        <td style={{ padding: '10px 20px', fontSize: 13 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {expandedId === item.id ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.description}</span>
                          </div>
                          {item.phase && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 20, marginTop: 2 }}>{item.phase}</div>}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className="badge badge-neutral" style={{ fontSize: 11 }}>{TYPE_LABELS[item.type]}</span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{item.vendor || '—'}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontWeight: 500 }}>{fmt(item.plannedAmount, item.currency)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>{fmt(item.actualAmount, item.currency)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontWeight: 500 }}>{fmt(item.forecastAmount, item.currency)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <VariancePill planned={item.plannedAmount} actual={item.forecastAmount} currency={item.currency} />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLORS[item.status] }}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <div className="flex items-center gap-1 justify-center" onClick={e => e.stopPropagation()}>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(item)} title="Edit">
                              <Pencil size={13} />
                            </button>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setConfirmDeleteId(item.id)} title="Delete" style={{ color: 'var(--danger)' }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === item.id && (
                        <tr style={{ background: 'var(--bg-elevated)' }}>
                          <td colSpan={9} style={{ padding: '12px 40px 16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, fontSize: 12 }}>
                              {item.purchaseOrder && <div><span style={{ color: 'var(--text-muted)' }}>PO Number:</span> <strong>{item.purchaseOrder}</strong></div>}
                              {item.invoiceDate && <div><span style={{ color: 'var(--text-muted)' }}>Invoice Date:</span> <strong>{item.invoiceDate}</strong></div>}
                              {item.paymentDate && <div><span style={{ color: 'var(--text-muted)' }}>Payment Date:</span> <strong>{item.paymentDate}</strong></div>}
                              {item.milestoneId && <div><span style={{ color: 'var(--text-muted)' }}>Linked Milestone:</span> <strong>{item.milestoneId}</strong></div>}
                            </div>
                            {item.notes && <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: 12 }}>📝 {item.notes}</div>}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      )}

      {/* Modal: Create / Edit Budget Line */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Edit Budget Line' : 'Add Budget Line'}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Description *</label>
                    <input className="input" required value={form.description || ''} onChange={e => setField('description', e.target.value)} placeholder="e.g. Lead Developer allocation — Phase 3" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="input" value={form.category || ''} onChange={e => setField('category', e.target.value)}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginTop: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="input" value={form.type || 'opex'} onChange={e => setField('type', e.target.value)}>
                      {BUDGET_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="input" value={form.status || 'planned'} onChange={e => setField('status', e.target.value)}>
                      {BUDGET_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vendor / Supplier</label>
                    <input className="input" value={form.vendor || ''} onChange={e => setField('vendor', e.target.value)} placeholder="e.g. Microsoft Azure" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select className="input" value={form.currency || 'EUR'} onChange={e => setField('currency', e.target.value)}>
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Planned Amount</label>
                    <input className="input" type="number" min={0} step={100} value={form.plannedAmount ?? 0} onChange={e => setField('plannedAmount', Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Actual Amount</label>
                    <input className="input" type="number" min={0} step={100} value={form.actualAmount ?? 0} onChange={e => setField('actualAmount', Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Forecast at Completion</label>
                    <input className="input" type="number" min={0} step={100} value={form.forecastAmount ?? 0} onChange={e => setField('forecastAmount', Number(e.target.value))} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginTop: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Phase</label>
                    <input className="input" value={form.phase || ''} onChange={e => setField('phase', e.target.value)} placeholder="e.g. Phase 3" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Purchase Order #</label>
                    <input className="input" value={form.purchaseOrder || ''} onChange={e => setField('purchaseOrder', e.target.value)} placeholder="PO-2026-XXX" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Invoice Date</label>
                    <input className="input" type="date" value={form.invoiceDate || ''} onChange={e => setField('invoiceDate', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Date</label>
                    <input className="input" type="date" value={form.paymentDate || ''} onChange={e => setField('paymentDate', e.target.value)} />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 14 }}>
                  <label className="form-label">Notes</label>
                  <textarea className="textarea" rows={2} value={form.notes || ''} onChange={e => setField('notes', e.target.value)} placeholder="Additional context, caveats, or approval conditions..." />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Add Budget Line'}</button>
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
            <div className="modal-body"><p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Are you sure you want to delete this budget line? This action cannot be undone.</p></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDeleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
