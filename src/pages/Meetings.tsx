import { useState, useMemo } from 'react';
import {
  Plus, Trash2, Edit3, CalendarCheck, CheckSquare, Square,
  Scale, Zap, ListTodo, Link2, X, ChevronDown, ChevronUp,
  Search, Calendar, User, Clock, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { useTaskStore } from '../store/useTaskStore';
import {
  Modal, ConfirmDialog, EmptyState,
  ActionBadge, DecisionBadge, StatusBadge, PriorityBadge, DateDisplay
} from '../components/ui/shared';
import type { Meeting, Action, Task, Decision, ActionStatus, TaskStatus, DecisionStatus, Priority } from '../types';
import { format, parseISO } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MEETING_TYPES = [
  'Project Meeting',
  'Steering Committee',
  'Operational Committee',
  'Technical Meeting',
  'Vendor Meeting',
  'Workshop',
  'Review',
  'Retrospective',
  'Informal',
  'Other',
];

function parseIdList(str?: string | null): string[] {
  if (!str) return [];
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

function serializeIdList(ids: string[]): string {
  return Array.from(new Set(ids.map(s => s.trim()).filter(Boolean))).join(',');
}

interface MeetingModalProps {
  meeting?: Partial<Meeting>;
  onClose: () => void;
}

function MeetingModal({ meeting, onClose }: MeetingModalProps) {
  const {
    createMeeting, updateMeeting,
    actions, updateAction, createAction,
    decisions, updateDecision, createDecision,
  } = useDataStore();
  const { tasks, createTask } = useTaskStore();

  const isEdit = Boolean(meeting?.id);
  const [activeTab, setActiveTab] = useState<'details' | 'links'>('details');
  const [previewMarkdown, setPreviewMarkdown] = useState(false);

  const [form, setForm] = useState<Partial<Meeting>>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    type: 'Project Meeting',
    participants: '',
    agenda: '',
    notes: '',
    decisions: '',
    actions: '',
    risksIdentified: '',
    blockersIdentified: '',
    followUps: '',
    relatedActionIds: '',
    relatedTaskIds: '',
    relatedDecisionIds: '',
    ...meeting,
  });

  // Track linked IDs locally in modal
  const [linkedActionIds, setLinkedActionIds] = useState<string[]>(() => {
    const fromMeeting = parseIdList(meeting?.relatedActionIds);
    if (meeting?.id) {
      const fromActions = actions.filter(a => a.relatedMeetingId === meeting.id).map(a => a.id);
      return Array.from(new Set([...fromMeeting, ...fromActions]));
    }
    return fromMeeting;
  });

  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>(() => {
    return parseIdList(meeting?.relatedTaskIds);
  });

  const [linkedDecisionIds, setLinkedDecisionIds] = useState<string[]>(() => {
    const fromMeeting = parseIdList(meeting?.relatedDecisionIds);
    if (meeting?.id) {
      const fromDecisions = decisions.filter(d => d.relatedMeetingId === meeting.id).map(d => d.id);
      return Array.from(new Set([...fromMeeting, ...fromDecisions]));
    }
    return fromMeeting;
  });

  // Select state for linking existing items
  const [selectedActionToLink, setSelectedActionToLink] = useState('');
  const [selectedTaskToLink, setSelectedTaskToLink] = useState('');
  const [selectedDecisionToLink, setSelectedDecisionToLink] = useState('');

  // Inline Quick Add states
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [newActionText, setNewActionText] = useState('');
  const [newActionOwner, setNewActionOwner] = useState('');
  const [newActionDueDate, setNewActionDueDate] = useState('');

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskOwner, setNewTaskOwner] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');

  const [isAddingDecision, setIsAddingDecision] = useState(false);
  const [newDecisionTitle, setNewDecisionTitle] = useState('');
  const [newDecisionOwner, setNewDecisionOwner] = useState('');
  const [newDecisionDeadline, setNewDecisionDeadline] = useState('');
  const [newDecisionStatus, setNewDecisionStatus] = useState<DecisionStatus>('proposed');

  // Resolved linked objects
  const resolvedActions = useMemo(() => {
    return linkedActionIds.map(id => actions.find(a => a.id === id)).filter((a): a is Action => Boolean(a));
  }, [linkedActionIds, actions]);

  const resolvedTasks = useMemo(() => {
    return linkedTaskIds.map(id => tasks.find(t => t.id === id)).filter((t): t is Task => Boolean(t));
  }, [linkedTaskIds, tasks]);

  const resolvedDecisions = useMemo(() => {
    return linkedDecisionIds.map(id => decisions.find(d => d.id === id)).filter((d): d is Decision => Boolean(d));
  }, [linkedDecisionIds, decisions]);

  // Available to link (not yet linked)
  const availableActions = useMemo(() => {
    const set = new Set(linkedActionIds);
    return actions.filter(a => !set.has(a.id));
  }, [actions, linkedActionIds]);

  const availableTasks = useMemo(() => {
    const set = new Set(linkedTaskIds);
    return tasks.filter(t => !set.has(t.id));
  }, [tasks, linkedTaskIds]);

  const availableDecisions = useMemo(() => {
    const set = new Set(linkedDecisionIds);
    return decisions.filter(d => !set.has(d.id));
  }, [decisions, linkedDecisionIds]);

  function handleAddExistingAction() {
    if (!selectedActionToLink) return;
    setLinkedActionIds(prev => Array.from(new Set([...prev, selectedActionToLink])));
    setSelectedActionToLink('');
  }

  function handleCreateQuickAction() {
    if (!newActionText.trim()) return;
    const created = createAction({
      action: newActionText.trim(),
      owner: newActionOwner.trim(),
      dueDate: newActionDueDate || undefined,
      status: 'open',
      source: form.title || 'Meeting',
      relatedMeetingId: meeting?.id || null,
    });
    setLinkedActionIds(prev => [...prev, created.id]);
    setNewActionText('');
    setNewActionOwner('');
    setNewActionDueDate('');
    setIsAddingAction(false);
  }

  function handleAddExistingTask() {
    if (!selectedTaskToLink) return;
    setLinkedTaskIds(prev => Array.from(new Set([...prev, selectedTaskToLink])));
    setSelectedTaskToLink('');
  }

  function handleCreateQuickTask() {
    if (!newTaskTitle.trim()) return;
    const created = createTask({
      title: newTaskTitle.trim(),
      owner: newTaskOwner.trim(),
      dueDate: newTaskDueDate || undefined,
      priority: newTaskPriority,
      status: 'planned',
      notes: `Originated from meeting: ${form.title || 'Meeting'}`,
    });
    setLinkedTaskIds(prev => [...prev, created.id]);
    setNewTaskTitle('');
    setNewTaskOwner('');
    setNewTaskDueDate('');
    setIsAddingTask(false);
  }

  function handleAddExistingDecision() {
    if (!selectedDecisionToLink) return;
    setLinkedDecisionIds(prev => Array.from(new Set([...prev, selectedDecisionToLink])));
    setSelectedDecisionToLink('');
  }

  function handleCreateQuickDecision() {
    if (!newDecisionTitle.trim()) return;
    const created = createDecision({
      title: newDecisionTitle.trim(),
      owner: newDecisionOwner.trim(),
      deadline: newDecisionDeadline || undefined,
      status: newDecisionStatus,
      context: `Discussed in meeting: ${form.title || 'Meeting'}`,
      relatedMeetingId: meeting?.id || null,
    });
    setLinkedDecisionIds(prev => [...prev, created.id]);
    setNewDecisionTitle('');
    setNewDecisionOwner('');
    setNewDecisionDeadline('');
    setIsAddingDecision(false);
  }

  function save() {
    if (!form.title?.trim()) return;

    const payload: Partial<Meeting> = {
      ...form,
      relatedActionIds: serializeIdList(linkedActionIds),
      relatedTaskIds: serializeIdList(linkedTaskIds),
      relatedDecisionIds: serializeIdList(linkedDecisionIds),
    };

    let meetingId = meeting?.id;
    if (isEdit && meetingId) {
      updateMeeting(meetingId, payload);
    } else {
      const created = createMeeting(payload);
      meetingId = created.id;
    }

    // Bidirectional sync: set relatedMeetingId on linked actions
    linkedActionIds.forEach(id => {
      const act = actions.find(a => a.id === id);
      if (act && act.relatedMeetingId !== meetingId) {
        updateAction(id, { relatedMeetingId: meetingId });
      }
    });

    // Bidirectional sync: set relatedMeetingId on linked decisions
    linkedDecisionIds.forEach(id => {
      const dec = decisions.find(d => d.id === id);
      if (dec && dec.relatedMeetingId !== meetingId) {
        updateDecision(id, { relatedMeetingId: meetingId });
      }
    });

    onClose();
  }

  const f = (k: keyof Meeting) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const totalLinkedCount = linkedActionIds.length + linkedTaskIds.length + linkedDecisionIds.length;

  return (
    <Modal
      title={isEdit ? 'Edit Meeting' : 'New Meeting'}
      onClose={onClose}
      size="xl"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save}>
            {isEdit ? 'Save Changes' : 'Create Meeting'}
          </button>
        </>
      }
    >
      {/* Modal Tab Switcher */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button
          className={`tab${activeTab === 'details' ? ' active' : ''}`}
          onClick={() => setActiveTab('details')}
          type="button"
        >
          Meeting Details & Notes
        </button>
        <button
          className={`tab${activeTab === 'links' ? ' active' : ''}`}
          onClick={() => setActiveTab('links')}
          type="button"
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Link2 size={13} />
            Linked Objects
            {totalLinkedCount > 0 && (
              <span className="badge badge-sm badge-primary" style={{ fontSize: 10, padding: '1px 6px' }}>
                {totalLinkedCount}
              </span>
            )}
          </span>
        </button>
      </div>

      {activeTab === 'details' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label required">Title</label>
              <input
                className="input"
                placeholder="Meeting title or subject..."
                value={form.title || ''}
                onChange={f('title')}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="input" type="date" value={form.date || ''} onChange={f('date')} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="select" value={form.type} onChange={f('type')}>
                {MEETING_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Participants</label>
              <input
                className="input"
                value={form.participants || ''}
                onChange={f('participants')}
                placeholder="Jean-Baptiste, Sophie, Karim..."
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <div className="flex items-center justify-between mb-1">
                <label className="form-label" style={{ marginBottom: 0 }}>Agenda (Markdown)</label>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  style={{ fontSize: 10, padding: '1px 6px', height: 'auto', minHeight: 20 }}
                  onClick={() => setPreviewMarkdown(!previewMarkdown)}
                >
                  {previewMarkdown ? 'Edit' : 'Preview'}
                </button>
              </div>
              {previewMarkdown ? (
                <div
                  className="prose prose-sm"
                  style={{
                    minHeight: 120,
                    padding: '8px 12px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: 12,
                    maxHeight: 180,
                    overflowY: 'auto',
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.agenda || '*No agenda content*'}</ReactMarkdown>
                </div>
              ) : (
                <textarea
                  className="textarea"
                  rows={5}
                  value={form.agenda || ''}
                  onChange={f('agenda')}
                  placeholder="1. Topic A&#10;2. Topic B&#10;3. Next steps"
                />
              )}
            </div>
            <div className="form-group">
              <div className="flex items-center justify-between mb-1">
                <label className="form-label" style={{ marginBottom: 0 }}>Meeting Notes (Markdown)</label>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  style={{ fontSize: 10, padding: '1px 6px', height: 'auto', minHeight: 20 }}
                  onClick={() => setPreviewMarkdown(!previewMarkdown)}
                >
                  {previewMarkdown ? 'Edit' : 'Preview'}
                </button>
              </div>
              {previewMarkdown ? (
                <div
                  className="prose prose-sm"
                  style={{
                    minHeight: 120,
                    padding: '8px 12px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: 12,
                    maxHeight: 180,
                    overflowY: 'auto',
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.notes || '*No notes content*'}</ReactMarkdown>
                </div>
              ) : (
                <textarea
                  className="textarea"
                  rows={5}
                  value={form.notes || ''}
                  onChange={f('notes')}
                  placeholder="Key discussion points, outcomes, context..."
                />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Decisions Summary (Notes)</label>
              <textarea
                className="textarea"
                rows={3}
                value={form.decisions || ''}
                onChange={f('decisions')}
                placeholder="Free text summary (or link structured decisions in Linked Objects tab)"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Actions Summary (Notes)</label>
              <textarea
                className="textarea"
                rows={3}
                value={form.actions || ''}
                onChange={f('actions')}
                placeholder="Free text summary (or link structured actions in Linked Objects tab)"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Risks Identified</label>
              <textarea
                className="textarea"
                rows={3}
                value={form.risksIdentified || ''}
                onChange={f('risksIdentified')}
                placeholder="New project risks discussed during meeting..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Blockers Identified</label>
              <textarea
                className="textarea"
                rows={3}
                value={form.blockersIdentified || ''}
                onChange={f('blockersIdentified')}
                placeholder="Operational blockers and impediments..."
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Follow-ups</label>
              <textarea
                className="textarea"
                rows={2}
                value={form.followUps || ''}
                onChange={f('followUps')}
                placeholder="Next sync, pending questions, external reviews..."
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'links' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* SECTION 1: ACTIONS */}
          <div className="card" style={{ padding: 16, background: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Zap size={16} color="var(--accent)" />
                <span style={{ fontWeight: 700, fontSize: 13 }}>
                  Linked Actions ({resolvedActions.length})
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsAddingAction(p => !p)}
              >
                <Plus size={12} /> {isAddingAction ? 'Cancel' : 'New Action'}
              </button>
            </div>

            {/* Quick Create Action Form */}
            {isAddingAction && (
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                  marginBottom: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 12 }}>Create & Link New Action</div>
                <input
                  className="input"
                  placeholder="Action to take..."
                  value={newActionText}
                  onChange={e => setNewActionText(e.target.value)}
                  style={{ fontSize: 12 }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input
                    className="input"
                    placeholder="Owner (name)..."
                    value={newActionOwner}
                    onChange={e => setNewActionOwner(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                  <input
                    className="input"
                    type="date"
                    value={newActionDueDate}
                    onChange={e => setNewActionDueDate(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setIsAddingAction(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleCreateQuickAction}
                    disabled={!newActionText.trim()}
                  >
                    Create & Link Action
                  </button>
                </div>
              </div>
            )}

            {/* Link Existing Action Selector */}
            <div className="flex items-center gap-2 mb-3">
              <select
                className="select"
                value={selectedActionToLink}
                onChange={e => setSelectedActionToLink(e.target.value)}
                style={{ fontSize: 12, height: 32, flex: 1 }}
              >
                <option value="">Link existing action...</option>
                {availableActions.map(a => (
                  <option key={a.id} value={a.id}>
                    [{a.status.toUpperCase()}] {a.action} {a.owner ? `(${a.owner})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddExistingAction}
                disabled={!selectedActionToLink}
              >
                <Link2 size={12} /> Link
              </button>
            </div>

            {/* Linked Actions List */}
            {resolvedActions.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                No actions linked to this meeting yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {resolvedActions.map(a => (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12,
                    }}
                  >
                    <div className="flex items-center gap-2" style={{ minWidth: 0, flex: 1 }}>
                      <ActionBadge status={a.status} />
                      <span
                        style={{
                          fontWeight: 500,
                          textDecoration: a.status === 'done' ? 'line-through' : 'none',
                        }}
                        className="truncate"
                      >
                        {a.action}
                      </span>
                      {a.owner && (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
                          · {a.owner}
                        </span>
                      )}
                      {a.dueDate && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                          [Due: {a.dueDate}]
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn-icon btn-ghost btn-sm"
                      title="Unlink action"
                      onClick={() => setLinkedActionIds(prev => prev.filter(id => id !== a.id))}
                      style={{ color: 'var(--text-muted)', marginLeft: 8 }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: TASKS */}
          <div className="card" style={{ padding: 16, background: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <ListTodo size={16} color="var(--primary)" />
                <span style={{ fontWeight: 700, fontSize: 13 }}>
                  Linked Tasks ({resolvedTasks.length})
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsAddingTask(p => !p)}
              >
                <Plus size={12} /> {isAddingTask ? 'Cancel' : 'New Task'}
              </button>
            </div>

            {/* Quick Create Task Form */}
            {isAddingTask && (
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                  marginBottom: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 12 }}>Create & Link New Task</div>
                <input
                  className="input"
                  placeholder="Task title..."
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  style={{ fontSize: 12 }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <input
                    className="input"
                    placeholder="Owner (name)..."
                    value={newTaskOwner}
                    onChange={e => setNewTaskOwner(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                  <input
                    className="input"
                    type="date"
                    value={newTaskDueDate}
                    onChange={e => setNewTaskDueDate(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                  <select
                    className="select"
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value as Priority)}
                    style={{ fontSize: 12 }}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 mt-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setIsAddingTask(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleCreateQuickTask}
                    disabled={!newTaskTitle.trim()}
                  >
                    Create & Link Task
                  </button>
                </div>
              </div>
            )}

            {/* Link Existing Task Selector */}
            <div className="flex items-center gap-2 mb-3">
              <select
                className="select"
                value={selectedTaskToLink}
                onChange={e => setSelectedTaskToLink(e.target.value)}
                style={{ fontSize: 12, height: 32, flex: 1 }}
              >
                <option value="">Link existing task...</option>
                {availableTasks.map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.status}] {t.title} {t.owner ? `(${t.owner})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddExistingTask}
                disabled={!selectedTaskToLink}
              >
                <Link2 size={12} /> Link
              </button>
            </div>

            {/* Linked Tasks List */}
            {resolvedTasks.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                No tasks linked to this meeting yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {resolvedTasks.map(t => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12,
                    }}
                  >
                    <div className="flex items-center gap-2" style={{ minWidth: 0, flex: 1 }}>
                      <StatusBadge status={t.status} />
                      <PriorityBadge priority={t.priority} />
                      <span style={{ fontWeight: 500 }} className="truncate">
                        {t.title}
                      </span>
                      {t.owner && (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
                          · {t.owner}
                        </span>
                      )}
                      {t.dueDate && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                          [Due: {t.dueDate}]
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn-icon btn-ghost btn-sm"
                      title="Unlink task"
                      onClick={() => setLinkedTaskIds(prev => prev.filter(id => id !== t.id))}
                      style={{ color: 'var(--text-muted)', marginLeft: 8 }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: DECISIONS */}
          <div className="card" style={{ padding: 16, background: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Scale size={16} color="var(--warning)" />
                <span style={{ fontWeight: 700, fontSize: 13 }}>
                  Linked Decisions ({resolvedDecisions.length})
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsAddingDecision(p => !p)}
              >
                <Plus size={12} /> {isAddingDecision ? 'Cancel' : 'New Decision'}
              </button>
            </div>

            {/* Quick Create Decision Form */}
            {isAddingDecision && (
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                  marginBottom: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 12 }}>Create & Link New Decision</div>
                <input
                  className="input"
                  placeholder="Decision title or question..."
                  value={newDecisionTitle}
                  onChange={e => setNewDecisionTitle(e.target.value)}
                  style={{ fontSize: 12 }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <input
                    className="input"
                    placeholder="Owner (name)..."
                    value={newDecisionOwner}
                    onChange={e => setNewDecisionOwner(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                  <input
                    className="input"
                    type="date"
                    value={newDecisionDeadline}
                    onChange={e => setNewDecisionDeadline(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                  <select
                    className="select"
                    value={newDecisionStatus}
                    onChange={e => setNewDecisionStatus(e.target.value as DecisionStatus)}
                    style={{ fontSize: 12 }}
                  >
                    <option value="proposed">Proposed</option>
                    <option value="under-discussion">Under Discussion</option>
                    <option value="decision-required">Decision Required</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 mt-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setIsAddingDecision(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleCreateQuickDecision}
                    disabled={!newDecisionTitle.trim()}
                  >
                    Create & Link Decision
                  </button>
                </div>
              </div>
            )}

            {/* Link Existing Decision Selector */}
            <div className="flex items-center gap-2 mb-3">
              <select
                className="select"
                value={selectedDecisionToLink}
                onChange={e => setSelectedDecisionToLink(e.target.value)}
                style={{ fontSize: 12, height: 32, flex: 1 }}
              >
                <option value="">Link existing decision...</option>
                {availableDecisions.map(d => (
                  <option key={d.id} value={d.id}>
                    [{d.status}] {d.title} {d.owner ? `(${d.owner})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddExistingDecision}
                disabled={!selectedDecisionToLink}
              >
                <Link2 size={12} /> Link
              </button>
            </div>

            {/* Linked Decisions List */}
            {resolvedDecisions.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                No decisions linked to this meeting yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {resolvedDecisions.map(d => (
                  <div
                    key={d.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12,
                    }}
                  >
                    <div className="flex items-center gap-2" style={{ minWidth: 0, flex: 1 }}>
                      <DecisionBadge status={d.status} />
                      <span style={{ fontWeight: 500 }} className="truncate">
                        {d.title}
                      </span>
                      {d.owner && (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
                          · {d.owner}
                        </span>
                      )}
                      {d.deadline && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                          [Deadline: {d.deadline}]
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn-icon btn-ghost btn-sm"
                      title="Unlink decision"
                      onClick={() => setLinkedDecisionIds(prev => prev.filter(id => id !== d.id))}
                      style={{ color: 'var(--text-muted)', marginLeft: 8 }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Meetings() {
  const {
    meetings, deleteMeeting, updateMeeting,
    actions, updateAction, createAction,
    decisions, updateDecision, createDecision,
  } = useDataStore();
  const { tasks, createTask } = useTaskStore();

  const [edit, setEdit] = useState<Partial<Meeting> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterLinked, setFilterLinked] = useState<'all' | 'actions' | 'tasks' | 'decisions'>('all');

  // Track expanded meeting cards
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Inline quick linking state for expanded cards
  const [quickLinkActionId, setQuickLinkActionId] = useState<Record<string, string>>({});
  const [quickLinkTaskId, setQuickLinkTaskId] = useState<Record<string, string>>({});
  const [quickLinkDecisionId, setQuickLinkDecisionId] = useState<Record<string, string>>({});

  function toggleExpand(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Helpers to get linked objects for any meeting
  function getMeetingLinkedActions(m: Meeting): Action[] {
    const idSet = new Set(parseIdList(m.relatedActionIds));
    return actions.filter(a => a.relatedMeetingId === m.id || idSet.has(a.id));
  }

  function getMeetingLinkedTasks(m: Meeting): Task[] {
    const idSet = new Set(parseIdList(m.relatedTaskIds));
    return tasks.filter(t => idSet.has(t.id));
  }

  function getMeetingLinkedDecisions(m: Meeting): Decision[] {
    const idSet = new Set(parseIdList(m.relatedDecisionIds));
    return decisions.filter(d => d.relatedMeetingId === m.id || idSet.has(d.id));
  }

  // Direct link/unlink actions from meeting card
  function handleLinkAction(meeting: Meeting, actionId: string) {
    if (!actionId) return;
    const currentIds = parseIdList(meeting.relatedActionIds);
    const updated = serializeIdList([...currentIds, actionId]);
    updateMeeting(meeting.id, { relatedActionIds: updated });
    updateAction(actionId, { relatedMeetingId: meeting.id });
    setQuickLinkActionId(prev => ({ ...prev, [meeting.id]: '' }));
  }

  function handleUnlinkAction(meeting: Meeting, action: Action, e?: React.MouseEvent) {
    e?.stopPropagation();
    const currentIds = parseIdList(meeting.relatedActionIds).filter(id => id !== action.id);
    updateMeeting(meeting.id, { relatedActionIds: serializeIdList(currentIds) });
    if (action.relatedMeetingId === meeting.id) {
      updateAction(action.id, { relatedMeetingId: null });
    }
  }

  function handleLinkTask(meeting: Meeting, taskId: string) {
    if (!taskId) return;
    const currentIds = parseIdList(meeting.relatedTaskIds);
    const updated = serializeIdList([...currentIds, taskId]);
    updateMeeting(meeting.id, { relatedTaskIds: updated });
    setQuickLinkTaskId(prev => ({ ...prev, [meeting.id]: '' }));
  }

  function handleUnlinkTask(meeting: Meeting, taskId: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    const currentIds = parseIdList(meeting.relatedTaskIds).filter(id => id !== taskId);
    updateMeeting(meeting.id, { relatedTaskIds: serializeIdList(currentIds) });
  }

  function handleLinkDecision(meeting: Meeting, decisionId: string) {
    if (!decisionId) return;
    const currentIds = parseIdList(meeting.relatedDecisionIds);
    const updated = serializeIdList([...currentIds, decisionId]);
    updateMeeting(meeting.id, { relatedDecisionIds: updated });
    updateDecision(decisionId, { relatedMeetingId: meeting.id });
    setQuickLinkDecisionId(prev => ({ ...prev, [meeting.id]: '' }));
  }

  function handleUnlinkDecision(meeting: Meeting, decision: Decision, e?: React.MouseEvent) {
    e?.stopPropagation();
    const currentIds = parseIdList(meeting.relatedDecisionIds).filter(id => id !== decision.id);
    updateMeeting(meeting.id, { relatedDecisionIds: serializeIdList(currentIds) });
    if (decision.relatedMeetingId === meeting.id) {
      updateDecision(decision.id, { relatedMeetingId: null });
    }
  }

  function handleToggleActionDone(action: Action, e?: React.MouseEvent) {
    e?.stopPropagation();
    updateAction(action.id, { status: action.status === 'done' ? 'open' : 'done' });
  }

  const sorted = useMemo(() => {
    return [...meetings].sort((a, b) => b.date.localeCompare(a.date));
  }, [meetings]);

  const filtered = useMemo(() => {
    return sorted.filter(m => {
      if (filterType !== 'all' && m.type !== filterType) return false;

      const linkedActs = getMeetingLinkedActions(m);
      const linkedTsks = getMeetingLinkedTasks(m);
      const linkedDecs = getMeetingLinkedDecisions(m);

      if (filterLinked === 'actions' && linkedActs.length === 0) return false;
      if (filterLinked === 'tasks' && linkedTsks.length === 0) return false;
      if (filterLinked === 'decisions' && linkedDecs.length === 0) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchParticipants = m.participants.toLowerCase().includes(q);
        const matchAgenda = m.agenda.toLowerCase().includes(q);
        const matchNotes = m.notes.toLowerCase().includes(q);
        const matchActions = linkedActs.some(a => a.action.toLowerCase().includes(q));
        const matchTasks = linkedTsks.some(t => t.title.toLowerCase().includes(q));
        const matchDecisions = linkedDecs.some(d => d.title.toLowerCase().includes(q));
        if (!matchTitle && !matchParticipants && !matchAgenda && !matchNotes && !matchActions && !matchTasks && !matchDecisions) {
          return false;
        }
      }
      return true;
    });
  }, [sorted, filterType, filterLinked, search, actions, tasks, decisions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="page-title">Meetings & Governance</h1>
          <p className="page-subtitle">
            {meetings.length} meetings recorded · Link agenda notes with actionable tasks, decisions, and action items
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button className="btn btn-primary" onClick={() => setEdit({})}>
            <Plus size={14} /> New Meeting
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '10px 14px',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="input"
            placeholder="Search meetings, linked tasks, actions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 30, height: 32, fontSize: 12 }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Type:</label>
          <select
            className="select"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ height: 32, fontSize: 12, padding: '0 8px' }}
          >
            <option value="all">All Types</option>
            {MEETING_TYPES.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Linked Object:</label>
          <select
            className="select"
            value={filterLinked}
            onChange={e => setFilterLinked(e.target.value as any)}
            style={{ height: 32, fontSize: 12, padding: '0 8px' }}
          >
            <option value="all">All Meetings</option>
            <option value="actions">⚡ Has Linked Actions</option>
            <option value="tasks">📋 Has Linked Tasks</option>
            <option value="decisions">⚖️ Has Linked Decisions</option>
          </select>
        </div>

        {(search || filterType !== 'all' || filterLinked !== 'all') && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSearch('');
              setFilterType('all');
              setFilterLinked('all');
            }}
            style={{ fontSize: 11, height: 30, marginLeft: 'auto' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Meetings List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No meetings found"
          desc={
            search || filterType !== 'all' || filterLinked !== 'all'
              ? 'No meetings match your current filters. Try resetting search.'
              : 'Record meeting notes, discussions, and link them to project actions, tasks, and decisions.'
          }
          action={
            <button className="btn btn-primary" onClick={() => setEdit({})}>
              <Plus size={14} /> Add Meeting
            </button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(m => {
            const isExpanded = expandedIds.has(m.id);
            const linkedActions = getMeetingLinkedActions(m);
            const linkedTasks = getMeetingLinkedTasks(m);
            const linkedDecisions = getMeetingLinkedDecisions(m);
            const openActionsCount = linkedActions.filter(a => a.status === 'open' || a.status === 'in-progress').length;

            // Compute available items to link in expanded view
            const linkedActionIdSet = new Set(linkedActions.map(a => a.id));
            const availableToLinkActions = actions.filter(a => !linkedActionIdSet.has(a.id));

            const linkedTaskIdSet = new Set(linkedTasks.map(t => t.id));
            const availableToLinkTasks = tasks.filter(t => !linkedTaskIdSet.has(t.id));

            const linkedDecisionIdSet = new Set(linkedDecisions.map(d => d.id));
            const availableToLinkDecisions = decisions.filter(d => !linkedDecisionIdSet.has(d.id));

            return (
              <div
                key={m.id}
                className="card"
                style={{
                  overflow: 'hidden',
                  border: isExpanded ? '1px solid var(--accent)' : '1px solid var(--border)',
                  boxShadow: isExpanded ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                  transition: 'border var(--transition-fast), box-shadow var(--transition-fast)',
                }}
              >
                {/* Meeting Card Header / Summary Row */}
                <div
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16,
                    cursor: 'pointer',
                    background: isExpanded ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                  }}
                  onClick={() => toggleExpand(m.id)}
                >
                  {/* Date Block */}
                  <div
                    style={{
                      textAlign: 'center',
                      background: 'var(--accent-soft)',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 14px',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                      {m.date ? format(parseISO(m.date), 'MMM') : '—'}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                      {m.date ? format(parseISO(m.date), 'd') : '—'}
                    </div>
                    {m.date && (
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                        {format(parseISO(m.date), 'yyyy')}
                      </div>
                    )}
                  </div>

                  {/* Main Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>
                        {m.title}
                      </span>
                      <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                        {m.type}
                      </span>
                    </div>

                    {m.participants && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <User size={12} />
                        <span className="truncate">{m.participants}</span>
                      </div>
                    )}

                    {/* Rich Linked Object Pills */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {linkedActions.length > 0 && (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(79, 142, 247, 0.15)',
                            color: '#4f8ef7',
                            border: '1px solid rgba(79, 142, 247, 0.3)',
                            fontSize: 11,
                            padding: '2px 8px',
                            fontWeight: 600,
                          }}
                        >
                          ⚡ {linkedActions.length} Action{linkedActions.length > 1 ? 's' : ''}
                          {openActionsCount > 0 && ` (${openActionsCount} open)`}
                        </span>
                      )}

                      {linkedTasks.length > 0 && (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(124, 106, 247, 0.15)',
                            color: '#7c6af7',
                            border: '1px solid rgba(124, 106, 247, 0.3)',
                            fontSize: 11,
                            padding: '2px 8px',
                            fontWeight: 600,
                          }}
                        >
                          📋 {linkedTasks.length} Task{linkedTasks.length > 1 ? 's' : ''}
                        </span>
                      )}

                      {linkedDecisions.length > 0 && (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(247, 154, 79, 0.15)',
                            color: '#f79a4f',
                            border: '1px solid rgba(247, 154, 79, 0.3)',
                            fontSize: 11,
                            padding: '2px 8px',
                            fontWeight: 600,
                          }}
                        >
                          ⚖️ {linkedDecisions.length} Decision{linkedDecisions.length > 1 ? 's' : ''}
                        </span>
                      )}

                      {/* Text Note Badges */}
                      {m.agenda && (
                        <span className="badge badge-sm badge-neutral" style={{ fontSize: 10 }}>
                          Agenda
                        </span>
                      )}
                      {m.notes && (
                        <span className="badge badge-sm badge-neutral" style={{ fontSize: 10 }}>
                          Notes
                        </span>
                      )}
                      {m.risksIdentified && (
                        <span className="badge badge-sm badge-warning" style={{ fontSize: 10 }}>
                          ⚠ Risks
                        </span>
                      )}
                      {m.blockersIdentified && (
                        <span className="badge badge-sm badge-danger" style={{ fontSize: 10 }}>
                          🚫 Blockers
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Expand Toggle */}
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => toggleExpand(m.id)}
                      title={isExpanded ? 'Collapse meeting details' : 'Expand meeting details & linked objects'}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      <span style={{ fontSize: 11 }}>{isExpanded ? 'Collapse' : 'Details & Links'}</span>
                    </button>
                    <button
                      className="btn-icon btn-ghost"
                      onClick={() => setEdit(m)}
                      title="Edit meeting"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      className="btn-icon btn-ghost"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => setDeleteId(m.id)}
                      title="Delete meeting"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded Section: Agenda, Notes & 3-Column Linked Objects Panel */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: '1px solid var(--border)',
                      padding: '16px 20px',
                      background: 'var(--bg-surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                    }}
                  >
                    {/* Agenda & Notes Block */}
                    {(m.agenda || m.notes || m.decisions || m.actions || m.risksIdentified || m.blockersIdentified) && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                          gap: 14,
                          background: 'var(--bg-elevated)',
                          padding: 14,
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {m.agenda && (
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                              Agenda
                            </div>
                            <div className="prose prose-sm" style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.agenda}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                        {m.notes && (
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                              Discussion Notes
                            </div>
                            <div className="prose prose-sm" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.notes}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                        {m.risksIdentified && (
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--warning)', textTransform: 'uppercase', marginBottom: 4 }}>
                              ⚠ Risks Identified
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                              {m.risksIdentified}
                            </div>
                          </div>
                        )}
                        {m.blockersIdentified && (
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--danger)', textTransform: 'uppercase', marginBottom: 4 }}>
                              🚫 Blockers Identified
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                              {m.blockersIdentified}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Section Header for Linked Objects */}
                    <div className="flex items-center justify-between gap-2 border-b pb-2">
                      <div className="flex items-center gap-2">
                        <Link2 size={16} color="var(--accent)" />
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                          Linked Project Objects
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Items directly associated with this meeting
                      </span>
                    </div>

                    {/* 3-Column Linked Objects Dashboard */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 16 }}>
                      {/* COLUMN 1: LINKED ACTIONS */}
                      <div
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Zap size={15} color="var(--accent)" />
                            <span style={{ fontWeight: 700, fontSize: 12 }}>
                              Actions ({linkedActions.length})
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {openActionsCount} open
                          </span>
                        </div>

                        {/* Quick link existing action combobox */}
                        <div className="flex items-center gap-1.5">
                          <select
                            className="select"
                            value={quickLinkActionId[m.id] || ''}
                            onChange={e => setQuickLinkActionId(prev => ({ ...prev, [m.id]: e.target.value }))}
                            style={{ height: 28, fontSize: 11, padding: '0 6px', flex: 1 }}
                          >
                            <option value="">+ Link existing action...</option>
                            {availableToLinkActions.map(a => (
                              <option key={a.id} value={a.id}>
                                [{a.status}] {a.action}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ height: 28, padding: '0 8px', fontSize: 11 }}
                            onClick={() => handleLinkAction(m, quickLinkActionId[m.id])}
                            disabled={!quickLinkActionId[m.id]}
                          >
                            Link
                          </button>
                        </div>

                        {/* Actions List */}
                        {linkedActions.length === 0 ? (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0', textAlign: 'center' }}>
                            No actions linked to this meeting.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {linkedActions.map(a => (
                              <div
                                key={a.id}
                                style={{
                                  background: 'var(--bg-surface)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '8px 10px',
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: 8,
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={e => handleToggleActionDone(a, e)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    color: a.status === 'done' ? 'var(--success)' : 'var(--text-muted)',
                                    marginTop: 2,
                                  }}
                                  title={a.status === 'done' ? 'Mark open' : 'Mark done'}
                                >
                                  {a.status === 'done' ? <CheckSquare size={14} /> : <Square size={14} />}
                                </button>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontWeight: 600,
                                      fontSize: 12,
                                      textDecoration: a.status === 'done' ? 'line-through' : 'none',
                                      color: a.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)',
                                    }}
                                  >
                                    {a.action}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                    <ActionBadge status={a.status} />
                                    {a.owner && <span>👤 {a.owner}</span>}
                                    {a.dueDate && <span>📅 {a.dueDate}</span>}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="btn-icon btn-ghost btn-sm"
                                  style={{ color: 'var(--text-muted)', padding: 2 }}
                                  title="Unlink from meeting"
                                  onClick={e => handleUnlinkAction(m, a, e)}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* COLUMN 2: LINKED TASKS */}
                      <div
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <ListTodo size={15} color="var(--primary)" />
                            <span style={{ fontWeight: 700, fontSize: 12 }}>
                              Tasks ({linkedTasks.length})
                            </span>
                          </div>
                        </div>

                        {/* Quick link existing task combobox */}
                        <div className="flex items-center gap-1.5">
                          <select
                            className="select"
                            value={quickLinkTaskId[m.id] || ''}
                            onChange={e => setQuickLinkTaskId(prev => ({ ...prev, [m.id]: e.target.value }))}
                            style={{ height: 28, fontSize: 11, padding: '0 6px', flex: 1 }}
                          >
                            <option value="">+ Link existing task...</option>
                            {availableToLinkTasks.map(t => (
                              <option key={t.id} value={t.id}>
                                [{t.status}] {t.title}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ height: 28, padding: '0 8px', fontSize: 11 }}
                            onClick={() => handleLinkTask(m, quickLinkTaskId[m.id])}
                            disabled={!quickLinkTaskId[m.id]}
                          >
                            Link
                          </button>
                        </div>

                        {/* Tasks List */}
                        {linkedTasks.length === 0 ? (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0', textAlign: 'center' }}>
                            No tasks linked to this meeting.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {linkedTasks.map(t => (
                              <div
                                key={t.id}
                                style={{
                                  background: 'var(--bg-surface)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '8px 10px',
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: 8,
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>
                                    {t.title}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap" style={{ fontSize: 10 }}>
                                    <StatusBadge status={t.status} />
                                    <PriorityBadge priority={t.priority} />
                                    {t.owner && <span style={{ color: 'var(--text-secondary)' }}>👤 {t.owner}</span>}
                                    {t.dueDate && <span style={{ color: 'var(--text-muted)' }}>📅 {t.dueDate}</span>}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="btn-icon btn-ghost btn-sm"
                                  style={{ color: 'var(--text-muted)', padding: 2 }}
                                  title="Unlink from meeting"
                                  onClick={e => handleUnlinkTask(m, t.id, e)}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* COLUMN 3: LINKED DECISIONS */}
                      <div
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Scale size={15} color="var(--warning)" />
                            <span style={{ fontWeight: 700, fontSize: 12 }}>
                              Decisions ({linkedDecisions.length})
                            </span>
                          </div>
                        </div>

                        {/* Quick link existing decision combobox */}
                        <div className="flex items-center gap-1.5">
                          <select
                            className="select"
                            value={quickLinkDecisionId[m.id] || ''}
                            onChange={e => setQuickLinkDecisionId(prev => ({ ...prev, [m.id]: e.target.value }))}
                            style={{ height: 28, fontSize: 11, padding: '0 6px', flex: 1 }}
                          >
                            <option value="">+ Link existing decision...</option>
                            {availableToLinkDecisions.map(d => (
                              <option key={d.id} value={d.id}>
                                [{d.status}] {d.title}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ height: 28, padding: '0 8px', fontSize: 11 }}
                            onClick={() => handleLinkDecision(m, quickLinkDecisionId[m.id])}
                            disabled={!quickLinkDecisionId[m.id]}
                          >
                            Link
                          </button>
                        </div>

                        {/* Decisions List */}
                        {linkedDecisions.length === 0 ? (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0', textAlign: 'center' }}>
                            No decisions linked to this meeting.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {linkedDecisions.map(d => (
                              <div
                                key={d.id}
                                style={{
                                  background: 'var(--bg-surface)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '8px 10px',
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: 8,
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>
                                    {d.title}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap" style={{ fontSize: 10 }}>
                                    <DecisionBadge status={d.status} />
                                    {d.owner && <span style={{ color: 'var(--text-secondary)' }}>👤 {d.owner}</span>}
                                    {d.deadline && <span style={{ color: 'var(--text-muted)' }}>⏱ {d.deadline}</span>}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="btn-icon btn-ghost btn-sm"
                                  style={{ color: 'var(--text-muted)', padding: 2 }}
                                  title="Unlink from meeting"
                                  onClick={e => handleUnlinkDecision(m, d, e)}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Meeting Modal */}
      {edit !== null && <MeetingModal meeting={edit} onClose={() => setEdit(null)} />}

      {/* Confirm Delete Dialog */}
      {deleteId && (
        <ConfirmDialog
          message="Are you sure you want to delete this meeting? Linked actions and decisions will remain in the system with their meeting association unlinked."
          onConfirm={() => {
            deleteMeeting(deleteId);
            setDeleteId(null);
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
