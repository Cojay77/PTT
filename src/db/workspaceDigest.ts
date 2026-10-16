// ============================================================
// Workspace Digest — cross-project extraction for the "Today" view
// ------------------------------------------------------------
// Reads every project of the workspace (read-only) and extracts the
// actionable objects: open tasks & actions, pending decisions, open
// issues, high risks, live communications, upcoming meetings,
// milestones and change requests awaiting decision.
//
// Extraction is intentionally date-independent (bucketing into
// overdue / today / this week happens in the UI) so cached digests
// stay valid across midnight. Non-active projects are cached by their
// `updatedAt` stamp; the active project is always re-read from memory.
// ============================================================
import type { Database } from 'sql.js';
import { mapWorkspaceProjects, type WorkspaceProject } from './db';

export type DigestKind =
  | 'task' | 'action' | 'milestone' | 'decision' | 'issue'
  | 'risk' | 'communication' | 'meeting' | 'change-request';

export type DigestLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface DigestItem {
  /** Globally unique: projectId:kind:rowId */
  key: string;
  kind: DigestKind;
  rowId: string;
  projectId: string;
  title: string;
  detail: string;
  /** Person accountable — used for "mine" matching. */
  owner: string;
  /** Other people involved (recipients, participants…) — also used for matching. */
  people: string;
  /** YYYY-MM-DD, '' when undated. */
  date: string;
  /** HH:mm when the source carries a time. */
  time: string;
  dateLabel: string;
  level: DigestLevel;
  status: string;
  /** Prevents progress (blocked task, critical issue, decision required…). */
  blocker: boolean;
  /** Ball is in someone else's court (awaiting response). */
  waiting: boolean;
  /** For communications: when it was sent (to show "waiting for N days"). */
  sinceDate: string;
  link: string;
}

export interface DigestActivity {
  key: string;
  projectId: string;
  entityType: string;
  entityTitle: string;
  action: string;
  description: string;
  createdAt: string;
}

export interface ProjectDigest {
  status: string;
  phase: string;
  manager: string;
  targetDate: string;
  statusNote: string;
  totalTasks: number;
  doneTasks: number;
  items: DigestItem[];
  activity: DigestActivity[];
}

export interface WorkspaceDigestEntry {
  project: WorkspaceProject;
  isActive: boolean;
  digest: ProjectDigest | null;
  error?: string;
}

// ------------------------------------------------------------
// Low-level helpers
// ------------------------------------------------------------
type Row = Record<string, unknown>;

function rows(d: Database, sql: string, params: (string | number)[] = []): Row[] {
  try {
    const stmt = d.prepare(sql);
    stmt.bind(params);
    const out: Row[] = [];
    while (stmt.step()) out.push(stmt.getAsObject() as Row);
    stmt.free();
    return out;
  } catch {
    // Older databases may miss a table/column — never break the whole digest.
    return [];
  }
}

const s = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

/** Split a free-form date ("2026-10-16", "2026-10-16T09:30", "2026-10-16 09:30:00") into parts. */
function splitDate(raw: unknown): { date: string; time: string } {
  const v = s(raw).trim();
  if (!v) return { date: '', time: '' };
  const date = /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '';
  const m = v.match(/[T\s](\d{2}:\d{2})/);
  return { date, time: m ? m[1] : '' };
}

function asLevel(v: unknown, fallback: DigestLevel = 'medium'): DigestLevel {
  const x = s(v).toLowerCase();
  return (['critical', 'high', 'medium', 'low', 'none'] as const).includes(x as DigestLevel) ? (x as DigestLevel) : fallback;
}

function firstLine(v: unknown, max = 140): string {
  const line = s(v).split(/\r?\n/).map(l => l.trim()).find(Boolean) || '';
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

// ------------------------------------------------------------
// Extraction
// ------------------------------------------------------------
export function extractProjectDigest(d: Database, projectId: string): ProjectDigest {
  const items: DigestItem[] = [];
  const push = (it: Omit<DigestItem, 'key' | 'projectId'>) =>
    items.push({ ...it, projectId, key: `${projectId}:${it.kind}:${it.rowId}` });

  const cfg = rows(d, `SELECT status, current_phase, manager, target_date, status_note FROM project_config WHERE id = 'main'`)[0] || {};

  // Tasks (active, not backlog)
  for (const r of rows(d, `SELECT id, title, status, priority, owner, contributors, due_date, blocking_reason, phase
                           FROM tasks WHERE is_backlog = 0 AND status NOT IN ('done','cancelled')`)) {
    const status = s(r.status);
    const { date } = splitDate(r.due_date);
    push({
      kind: 'task', rowId: s(r.id), title: s(r.title) || 'Untitled task',
      detail: status === 'blocked' ? (firstLine(r.blocking_reason) || 'Blocked — no reason given') : s(r.phase),
      owner: s(r.owner), people: s(r.contributors), date, time: '', dateLabel: 'Due',
      level: asLevel(r.priority), status, blocker: status === 'blocked', waiting: status === 'waiting',
      sinceDate: '', link: '/tasks',
    });
  }

  // Actions
  for (const r of rows(d, `SELECT id, action, owner, due_date, status, source FROM actions WHERE status NOT IN ('done','cancelled')`)) {
    const { date } = splitDate(r.due_date);
    push({
      kind: 'action', rowId: s(r.id), title: firstLine(r.action, 200) || 'Untitled action',
      detail: s(r.source) ? `From ${s(r.source)}` : '', owner: s(r.owner), people: '',
      date, time: '', dateLabel: 'Due', level: 'medium', status: s(r.status),
      blocker: false, waiting: false, sinceDate: '', link: '/actions',
    });
  }

  // Milestones
  for (const r of rows(d, `SELECT id, name, target_date, status, progress, owner FROM milestones WHERE status NOT IN ('completed','cancelled')`)) {
    const status = s(r.status);
    const { date } = splitDate(r.target_date);
    push({
      kind: 'milestone', rowId: s(r.id), title: s(r.name) || 'Milestone',
      detail: `${Number(r.progress) || 0}% complete${status === 'delayed' || status === 'at-risk' ? ` · ${status.replace('-', ' ')}` : ''}`,
      owner: s(r.owner), people: '', date, time: '', dateLabel: 'Target',
      level: status === 'delayed' || status === 'at-risk' ? 'high' : 'medium', status,
      blocker: false, waiting: false, sinceDate: '', link: '/milestones',
    });
  }

  // Decisions awaiting a call
  for (const r of rows(d, `SELECT id, title, decision_required, context, owner, contributors, deadline, status FROM decisions
                           WHERE status IN ('proposed','under-discussion','decision-required')`)) {
    const status = s(r.status);
    const { date } = splitDate(r.deadline);
    push({
      kind: 'decision', rowId: s(r.id), title: s(r.title) || 'Decision',
      detail: firstLine(r.decision_required) || firstLine(r.context),
      owner: s(r.owner), people: s(r.contributors), date, time: '', dateLabel: 'Deadline',
      level: status === 'decision-required' ? 'high' : 'medium', status,
      blocker: status === 'decision-required', waiting: false, sinceDate: '', link: '/decisions',
    });
  }

  // Open issues
  for (const r of rows(d, `SELECT id, title, impact, description, severity, owner, resolution_target, status FROM issues
                           WHERE status IN ('open','in-progress','escalated')`)) {
    const level = asLevel(r.severity);
    const status = s(r.status);
    const { date } = splitDate(r.resolution_target);
    push({
      kind: 'issue', rowId: s(r.id), title: s(r.title) || 'Issue',
      detail: firstLine(r.impact) || firstLine(r.description), owner: s(r.owner), people: '',
      date, time: '', dateLabel: 'Resolve by', level, status,
      blocker: level === 'critical' || level === 'high' || status === 'escalated',
      waiting: false, sinceDate: '', link: '/issues',
    });
  }

  // Risks — only the ones worth a morning glance
  for (const r of rows(d, `SELECT id, title, severity, owner, mitigation_strategy, target_resolution_date, status, probability, impact FROM risks
                           WHERE status NOT IN ('closed','accepted') AND severity IN ('critical','high')`)) {
    const { date } = splitDate(r.target_resolution_date);
    push({
      kind: 'risk', rowId: s(r.id), title: s(r.title) || 'Risk',
      detail: firstLine(r.mitigation_strategy) ? `Mitigation: ${firstLine(r.mitigation_strategy)}` : `P${s(r.probability)} × I${s(r.impact)}`,
      owner: s(r.owner), people: '', date, time: '', dateLabel: 'Treat by', level: asLevel(r.severity, 'high'),
      status: s(r.status), blocker: s(r.severity) === 'critical', waiting: false, sinceDate: '', link: '/risks',
    });
  }

  // Communications still alive
  for (const r of rows(d, `SELECT id, subject, sender, recipients, date, status, expected_response_date, follow_up_required,
                                  next_follow_up_date, information_requested
                           FROM communications
                           WHERE status NOT IN ('closed','response-received')
                             AND (status IN ('awaiting-response','follow-up-needed') OR follow_up_required = 1)`)) {
    const status = s(r.status);
    const awaiting = status === 'awaiting-response';
    const expected = splitDate(r.expected_response_date).date;
    const followUp = splitDate(r.next_follow_up_date).date;
    // Waiting → the relevant date is when the answer is due (or when I planned to chase).
    // Follow-up → the relevant date is my own follow-up date.
    const date = awaiting
      ? ([expected, followUp].filter(Boolean).sort()[0] || '')
      : (followUp || expected);
    push({
      kind: 'communication', rowId: s(r.id), title: s(r.subject) || 'Communication',
      detail: awaiting
        ? `Waiting on ${s(r.recipients) || 'recipient'}${firstLine(r.information_requested) ? ` · ${firstLine(r.information_requested, 80)}` : ''}`
        : `Follow up${s(r.recipients) ? ` with ${s(r.recipients)}` : ''}`,
      owner: s(r.sender), people: s(r.recipients), date, time: '',
      dateLabel: awaiting ? 'Reply expected' : 'Follow up',
      level: 'medium', status, blocker: false, waiting: awaiting,
      sinceDate: splitDate(r.date).date, link: '/communications',
    });
  }

  // Scheduled meetings (past ones are filtered by the UI)
  for (const r of rows(d, `SELECT id, title, date, type, participants, status FROM meetings
                           WHERE COALESCE(status, 'scheduled') = 'scheduled' AND date != ''`)) {
    const { date, time } = splitDate(r.date);
    push({
      kind: 'meeting', rowId: s(r.id), title: s(r.title) || 'Meeting',
      detail: s(r.type).replace(/-/g, ' '), owner: '', people: s(r.participants),
      date, time, dateLabel: 'Meeting', level: 'none', status: 'scheduled',
      blocker: false, waiting: false, sinceDate: '', link: '/meetings',
    });
  }

  // Change requests awaiting a decision
  for (const r of rows(d, `SELECT id, title, priority, approver, requestor, request_date, status FROM change_requests
                           WHERE status IN ('submitted','under-review')`)) {
    push({
      kind: 'change-request', rowId: s(r.id), title: s(r.title) || 'Change request',
      detail: s(r.requestor) ? `Requested by ${s(r.requestor)}` : 'Awaiting approval',
      owner: s(r.approver), people: s(r.requestor), date: '', time: '', dateLabel: 'Awaiting decision',
      level: asLevel(r.priority), status: s(r.status),
      blocker: false, waiting: false, sinceDate: splitDate(r.request_date).date, link: '/change-requests',
    });
  }

  const counts = rows(d, `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done
                          FROM tasks WHERE is_backlog = 0 AND status != 'cancelled'`)[0] || {};

  const cutoff = Date.now() - 3 * 86400000;
  const activity: DigestActivity[] = rows(d, `SELECT id, entity_type, entity_title, action, description, created_at
                                              FROM activity_log ORDER BY created_at DESC LIMIT 60`)
    .filter(r => {
      const t = new Date(s(r.created_at)).getTime();
      return !Number.isNaN(t) && t >= cutoff;
    })
    .map(r => ({
      key: `${projectId}:act:${s(r.id)}`, projectId,
      entityType: s(r.entity_type), entityTitle: s(r.entity_title), action: s(r.action),
      description: s(r.description), createdAt: s(r.created_at),
    }));

  return {
    status: s(cfg.status), phase: s(cfg.current_phase), manager: s(cfg.manager),
    targetDate: splitDate(cfg.target_date).date, statusNote: s(cfg.status_note),
    totalTasks: Number(counts.total) || 0, doneTasks: Number(counts.done) || 0,
    items, activity,
  };
}

// ------------------------------------------------------------
// Workspace-level loading with per-project cache
// ------------------------------------------------------------
const cache = new Map<string, { updatedAt: string; digest: ProjectDigest }>();

export async function loadWorkspaceDigest(): Promise<WorkspaceDigestEntry[]> {
  const results = await mapWorkspaceProjects(
    (d, meta) => extractProjectDigest(d, meta.id),
    (meta, isActive) => isActive || cache.get(meta.id)?.updatedAt !== meta.updatedAt,
  );

  const liveIds = new Set(results.map(r => r.meta.id));
  for (const id of cache.keys()) if (!liveIds.has(id)) cache.delete(id);

  return results.map((r) => {
    if (r.value) {
      if (!r.isActive) cache.set(r.meta.id, { updatedAt: r.meta.updatedAt, digest: r.value });
      return { project: r.meta, isActive: r.isActive, digest: r.value };
    }
    if (r.skipped) {
      return { project: r.meta, isActive: r.isActive, digest: cache.get(r.meta.id)?.digest ?? null };
    }
    return { project: r.meta, isActive: r.isActive, digest: null, error: r.error };
  });
}

// ------------------------------------------------------------
// "Me" matching
// ------------------------------------------------------------
const MY_ALIASES_KEY = 'ptt_my_aliases';
const INCLUDE_UNASSIGNED_KEY = 'ptt_today_include_unassigned';

export function getMyAliases(): string[] {
  try {
    return (localStorage.getItem(MY_ALIASES_KEY) || '').split(',').map(a => a.trim()).filter(Boolean);
  } catch { return []; }
}

export function setMyAliases(aliases: string[]): void {
  try { localStorage.setItem(MY_ALIASES_KEY, aliases.map(a => a.trim()).filter(Boolean).join(', ')); } catch { /* noop */ }
}

export function getIncludeUnassigned(): boolean {
  try { return localStorage.getItem(INCLUDE_UNASSIGNED_KEY) !== '0'; } catch { return true; }
}

export function setIncludeUnassigned(v: boolean): void {
  try { localStorage.setItem(INCLUDE_UNASSIGNED_KEY, v ? '1' : '0'); } catch { /* noop */ }
}

const normalize = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** True if any alias appears as a whole word/phrase in the free-text people field. */
export function mentionsAlias(field: string, aliases: string[]): boolean {
  if (!field || aliases.length === 0) return false;
  const hay = ` ${normalize(field).replace(/[,;/|&+()[\]]+/g, ' ')} `;
  return aliases.some((a) => {
    const n = normalize(a);
    return n.length > 0 && hay.includes(` ${n} `);
  });
}

/**
 * Is this item mine? Owner match, or participant/recipient match for
 * meetings & communications, or (optionally) unassigned.
 */
export function isMine(item: DigestItem, aliases: string[], includeUnassigned: boolean): boolean {
  if (mentionsAlias(item.owner, aliases)) return true;
  if ((item.kind === 'meeting' || item.kind === 'communication' || item.kind === 'decision') && mentionsAlias(item.people, aliases)) return true;
  if (includeUnassigned && !item.owner.trim()) {
    // Meetings with a participant list that doesn't include me aren't mine.
    if (item.kind === 'meeting' && item.people.trim()) return false;
    return true;
  }
  return false;
}

/** Most frequent people names across the workspace — used to suggest aliases. */
export function suggestPeople(entries: WorkspaceDigestEntry[], limit = 8): string[] {
  const freq = new Map<string, { label: string; n: number }>();
  const add = (raw: string, weight = 1) => {
    raw.split(/[,;]/).map(x => x.trim()).filter(x => x.length > 1 && x.length < 40).forEach((name) => {
      const k = normalize(name);
      const cur = freq.get(k);
      if (cur) cur.n += weight; else freq.set(k, { label: name, n: weight });
    });
  };
  for (const e of entries) {
    if (e.digest?.manager) add(e.digest.manager, 5);
    e.digest?.items.forEach(i => { if (i.owner) add(i.owner); });
  }
  return [...freq.values()].sort((a, b) => b.n - a.n).slice(0, limit).map(x => x.label);
}
