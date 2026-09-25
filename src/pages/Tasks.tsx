import { useState, useMemo } from 'react';
import { Plus, Filter, Search, Trash2, Edit3, ChevronUp, ChevronDown } from 'lucide-react';
import { useTaskStore } from '../store/useTaskStore';
import { useDataStore } from '../store/useDataStore';
import { StatusBadge, PriorityBadge, DateDisplay, Modal, ConfirmDialog, EmptyState, ProgressBar } from '../components/ui/shared';
import type { Task, TaskStatus, Priority } from '../types';

const STATUSES: TaskStatus[] = ['backlog', 'planned', 'ready', 'in-progress', 'blocked', 'waiting', 'done', 'cancelled'];
const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low', 'none'];

function TaskModal({ task, onClose }: { task?: Partial<Task>; onClose: () => void }) {
  const milestones = useDataStore(s => s.milestones);
  const stakeholders = useDataStore(s => s.stakeholders);
  const resources = useDataStore(s => s.resources);
  const { createTask, updateTask } = useTaskStore();
  const isEdit = Boolean(task?.id);
  const [form, setForm] = useState<Partial<Task>>({
    title: '', status: 'planned', priority: 'medium', owner: '', dueDate: '', startDate: '',
    estimatedWorkload: 0, remainingWorkload: 0, actualWorkload: 0, category: '', tags: '',
    phase: '', description: '', notes: '', blockingReason: '', ...task,
  });
  const [titleError, setTitleError] = useState(false);

  const knownOwners = useMemo(() => {
    const set = new Set<string>();
    resources.forEach(r => { if (r.name) set.add(r.name); });
    stakeholders.forEach(s => { if (s.name) set.add(s.name); });
    return Array.from(set).sort();
  }, [resources, stakeholders]);

  function save() {
    if (!form.title?.trim()) { setTitleError(true); return; }
    setTitleError(false);
    if (isEdit) updateTask(task!.id!, form);
    else createTask(form);
    onClose();
  }

  const f = (k: keyof Task) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Modal title={isEdit ? 'Edit Task' : 'New Task'} onClose={onClose} size="lg"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save}>Save Task</button>
      </>}
    >
      <datalist id="task-owners-list">
        {knownOwners.map(name => <option key={name} value={name} />)}
      </datalist>
      <div className="form-row" style={{ marginBottom: 16 }}>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label required">Title</label>
          <input
            className="input"
            placeholder="Task title..."
            value={form.title || ''}
            onChange={e => { setTitleError(false); setForm(p => ({ ...p, title: e.target.value })); }}
            style={titleError ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px var(--danger-bg)' } : undefined}
            autoFocus
          />
          {titleError && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4, fontWeight: 500 }}>⚠ Title is required</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="select" value={form.status} onChange={f('status')}>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="select" value={form.priority} onChange={f('priority')}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Owner</label>
          <input className="input" list="task-owners-list" placeholder="Assignee name..." value={form.owner || ''} onChange={f('owner')} />
        </div>
        <div className="form-group">
          <label className="form-label">Contributors</label>
          <input className="input" list="task-owners-list" placeholder="Contributors..." value={form.contributors || ''} onChange={f('contributors')} />
        </div>
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input className="input" type="date" value={form.startDate || ''} onChange={f('startDate')} />
        </div>
        <div className="form-group">
          <label className="form-label">Due Date</label>
          <input className="input" type="date" value={form.dueDate || ''} onChange={f('dueDate')} />
        </div>
        <div className="form-group">
          <label className="form-label">Est. Workload (h)</label>
          <input className="input" type="number" min="0" value={form.estimatedWorkload || 0} onChange={e => setForm(p => ({ ...p, estimatedWorkload: Number(e.target.value) }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Remaining (h)</label>
          <input className="input" type="number" min="0" value={form.remainingWorkload || 0} onChange={e => setForm(p => ({ ...p, remainingWorkload: Number(e.target.value) }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Actual (h)</label>
          <input className="input" type="number" min="0" value={form.actualWorkload || 0} onChange={e => setForm(p => ({ ...p, actualWorkload: Number(e.target.value) }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <input className="input" value={form.category || ''} onChange={f('category')} />
        </div>
        <div className="form-group">
          <label className="form-label">Phase</label>
          <input className="input" value={form.phase || ''} onChange={f('phase')} />
        </div>
        <div className="form-group">
          <label className="form-label">Milestone</label>
          <select className="select" value={form.milestoneId || ''} onChange={e => setForm(p => ({ ...p, milestoneId: e.target.value || null }))}>
            <option value="">No milestone</option>
            {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Tags</label>
          <input className="input" value={form.tags || ''} onChange={f('tags')} placeholder="Comma separated" />
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Description</label>
          <textarea className="textarea" rows={3} value={form.description || ''} onChange={f('description')} />
        </div>
        {form.status === 'blocked' && (
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" style={{ color: 'var(--danger)' }}>Blocking Reason</label>
            <textarea className="textarea" rows={2} value={form.blockingReason || ''} onChange={f('blockingReason')} />
          </div>
        )}
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Notes</label>
          <textarea className="textarea" rows={2} value={form.notes || ''} onChange={f('notes')} />
        </div>
      </div>
    </Modal>
  );
}

function KanbanView({
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  tasks: Task[];
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}) {
  const statuses: TaskStatus[] = ['planned', 'ready', 'in-progress', 'blocked', 'waiting', 'done'];
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  return (
    <div className="kanban-board">
      {statuses.map(status => {
        const col = tasks.filter(t => t.status === status);
        const isOver = dragOverCol === status;
        return (
          <div
            key={status}
            className={`kanban-column${isOver ? ' drag-over' : ''}`}
            style={{
              transition: 'background-color 0.2s, outline 0.2s',
              outline: isOver ? '2px dashed var(--accent)' : 'none',
              backgroundColor: isOver ? 'var(--bg-card-hover, rgba(59, 130, 246, 0.06))' : undefined,
            }}
            onDragOver={e => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (dragOverCol !== status) setDragOverCol(status);
            }}
            onDragLeave={e => {
              // Avoid clearing when moving over child elements
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setDragOverCol(null);
            }}
            onDrop={e => {
              e.preventDefault();
              setDragOverCol(null);
              const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
              if (id) {
                onStatusChange(id, status);
              }
              setDraggedTaskId(null);
            }}
          >
            <div className="kanban-column-header">
              <StatusBadge status={status} />
              <span className="kanban-count">{col.length}</span>
            </div>
            <div className="kanban-cards" style={{ minHeight: 120 }}>
              {col.map(t => (
                <div
                  key={t.id}
                  className="kanban-card"
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('text/plain', t.id);
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggedTaskId(t.id);
                  }}
                  onDragEnd={() => {
                    setDraggedTaskId(null);
                    setDragOverCol(null);
                  }}
                  onClick={() => onEdit(t)}
                  style={{ cursor: 'grab' }}
                >
                  <div className="kanban-card-title">{t.title}</div>
                  <div className="kanban-card-meta">
                    <PriorityBadge priority={t.priority} />
                    {t.dueDate && <DateDisplay date={t.dueDate} showRelative />}
                    {t.estimatedWorkload > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{t.estimatedWorkload}h</span>
                    )}
                  </div>
                  {t.owner && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>👤 {t.owner}</div>
                  )}
                  {t.status === 'blocked' && t.blockingReason && (
                    <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, background: 'var(--danger-bg)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                      🚫 {t.blockingReason.slice(0, 60)}
                    </div>
                  )}
                </div>
              ))}
              {col.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-placeholder)', fontSize: 12 }}>Drop tasks here</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Tasks() {
  const { tasks, createTask, updateTask, deleteTask } = useTaskStore();
  const milestones = useDataStore(s => s.milestones);

  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterOwner, setFilterOwner] = useState('');
  const [search, setSearch] = useState('');
  const [editTask, setEditTask] = useState<Partial<Task> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortField, setSortField] = useState('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const activeTasks = tasks.filter(t => !t.isBacklog);

  const filtered = useMemo(() => {
    let list = activeTasks;
    if (filterStatus) list = list.filter(t => t.status === filterStatus);
    if (filterPriority) list = list.filter(t => t.priority === filterPriority);
    if (filterOwner) list = list.filter(t => t.owner.toLowerCase().includes(filterOwner.toLowerCase()));
    if (search) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()));
    return [...list].sort((a, b) => {
      const av = ((a as unknown as Record<string, unknown>)[sortField] as string) || '';
      const bv = ((b as unknown as Record<string, unknown>)[sortField] as string) || '';
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [activeTasks, filterStatus, filterPriority, filterOwner, search, sortField, sortDir]);

  const today = new Date().toISOString().split('T')[0];
  const stats = {
    total: activeTasks.length,
    done: activeTasks.filter(t => t.status === 'done').length,
    overdue: activeTasks.filter(t => t.dueDate && t.dueDate < today && !['done', 'cancelled'].includes(t.status)).length,
    blocked: activeTasks.filter(t => t.status === 'blocked').length,
    inProgress: activeTasks.filter(t => t.status === 'in-progress').length,
  };

  const CYCLE_STATUSES: TaskStatus[] = ['planned', 'ready', 'in-progress', 'blocked', 'waiting', 'done'];

  function cycleStatus(t: Task, e: React.MouseEvent) {
    e.stopPropagation();
    const idx = CYCLE_STATUSES.indexOf(t.status);
    const nextStatus = idx >= 0 ? CYCLE_STATUSES[(idx + 1) % CYCLE_STATUSES.length] : 'planned';
    updateTask(t.id, { status: nextStatus });
  }

  function sort(field: string) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  function SortIcon({ field }: { field: string }) {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{stats.total} tasks · {stats.done} done · {stats.overdue} overdue · {stats.blocked} blocked</p>
        </div>
        <div className="ml-auto flex gap-2">
          <div className="tabs" style={{ border: 'none', gap: 0 }}>
            <button className={`tab${view === 'table' ? ' active' : ''}`} onClick={() => setView('table')}>Table</button>
            <button className={`tab${view === 'kanban' ? ' active' : ''}`} onClick={() => setView('kanban')}>Kanban</button>
          </div>
          <button className="btn btn-primary" onClick={() => setEditTask({})}>
            <Plus size={14} /> New Task
          </button>
        </div>
      </div>

      {/* Quick stats */}
      {stats.overdue > 0 && (
        <div className="alert-banner alert-critical mb-4" style={{ marginBottom: 16 }}>
          <span>🔴 {stats.overdue} overdue task{stats.overdue > 1 ? 's' : ''}</span>
          {stats.blocked > 0 && <span style={{ marginLeft: 16 }}>🚫 {stats.blocked} blocked</span>}
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="input-with-icon" style={{ flex: 1, maxWidth: 320 }}>
          <Search className="input-icon" size={14} />
          <input className="input" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>)}
        </select>
        <select className="select" style={{ width: 'auto' }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input className="input" style={{ width: 160 }} placeholder="Filter by owner..." value={filterOwner} onChange={e => setFilterOwner(e.target.value)} />
        {(filterStatus || filterPriority || filterOwner || search) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterStatus(''); setFilterPriority(''); setFilterOwner(''); setSearch(''); }}>
            Clear filters
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Content */}
      {view === 'kanban' ? (
        <KanbanView
          tasks={filtered}
          onEdit={setEditTask}
          onDelete={setDeleteId}
          onStatusChange={(id, status) => updateTask(id, { status })}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => sort('title')} className={sortField === 'title' ? 'sorted' : ''}>Title <SortIcon field="title" /></th>
                <th onClick={() => sort('status')} className={sortField === 'status' ? 'sorted' : ''}>Status <SortIcon field="status" /></th>
                <th onClick={() => sort('priority')} className={sortField === 'priority' ? 'sorted' : ''}>Priority <SortIcon field="priority" /></th>
                <th onClick={() => sort('owner')} className={sortField === 'owner' ? 'sorted' : ''}>Owner <SortIcon field="owner" /></th>
                <th onClick={() => sort('dueDate')} className={sortField === 'dueDate' ? 'sorted' : ''}>Due Date <SortIcon field="dueDate" /></th>
                <th>Workload</th>
                <th>Milestone</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const isOverdue = t.dueDate && t.dueDate < today && !['done', 'cancelled'].includes(t.status);
                const milestone = milestones.find(m => m.id === t.milestoneId);
                return (
                  <tr key={t.id} style={{ opacity: t.status === 'cancelled' ? 0.5 : 1 }} onClick={() => setEditTask(t)}>
                    <td style={{ maxWidth: 300 }}>
                      <div style={{ fontWeight: 500 }} className="truncate">{t.title}</div>
                      {t.status === 'blocked' && t.blockingReason && (
                        <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>🚫 {t.blockingReason.slice(0, 50)}</div>
                      )}
                      {t.tags && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{t.tags}</div>}
                    </td>
                    <td onClick={e => cycleStatus(t, e)} title="Click to cycle status" style={{ cursor: 'pointer' }}>
                      <StatusBadge status={t.status} />
                    </td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{t.owner || '—'}</td>
                    <td style={{ color: isOverdue ? 'var(--danger)' : 'inherit' }}>
                      <DateDisplay date={t.dueDate} />
                    </td>
                    <td>
                      {t.estimatedWorkload > 0 ? (
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {t.actualWorkload}h / {t.estimatedWorkload}h
                          </div>
                          <ProgressBar value={t.actualWorkload} max={t.estimatedWorkload} />
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{milestone?.name || '—'}</td>
                    <td>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button className="btn-icon btn-ghost" onClick={() => setEditTask(t)}><Edit3 size={13} /></button>
                        <button className="btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(t.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8}><EmptyState icon={Filter} title="No tasks found" desc="Try adjusting filters or create a new task." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editTask !== null && <TaskModal task={editTask} onClose={() => setEditTask(null)} />}
      {deleteId && (
        <ConfirmDialog
          message="Delete this task permanently?"
          onConfirm={() => { deleteTask(deleteId); setDeleteId(null); }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
