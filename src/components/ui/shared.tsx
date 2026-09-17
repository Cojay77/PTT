import type { TaskStatus, ProjectStatus, Priority, Severity, MilestoneStatus, DecisionStatus, IssueStatus, RiskStatus, CommunicationStatus, ActionStatus } from '../../types';

// ============================================================
// Status / Priority badge helpers
// ============================================================

export function StatusBadge({ status }: { status: TaskStatus | ProjectStatus }) {
  const labels: Record<string, string> = {
    backlog: 'Backlog', planned: 'Planned', ready: 'Ready',
    'in-progress': 'In Progress', blocked: 'Blocked', waiting: 'Waiting',
    done: 'Done', cancelled: 'Cancelled',
    'on-track': 'On Track', 'at-risk': 'At Risk', 'off-track': 'Off Track', 'on-hold': 'On Hold', completed: 'Completed',
  };
  return (
    <span className={`badge status-${status}`}>
      <span className="badge-dot" />
      {labels[status] || status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const labels: Record<Priority, string> = {
    critical: '🔴 Critical', high: 'High', medium: 'Medium', low: 'Low', none: 'None',
  };
  return (
    <span className={`badge priority-${priority}`}>{labels[priority] || priority}</span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const labels: Record<Severity, string> = {
    critical: '🔴 Critical', high: 'High', medium: 'Medium', low: 'Low',
  };
  return (
    <span className={`badge severity-${severity}`}>{labels[severity] || severity}</span>
  );
}

export function MilestoneBadge({ status }: { status: MilestoneStatus }) {
  const map: Record<MilestoneStatus, string> = {
    planned: 'status-planned', 'in-progress': 'status-in-progress',
    completed: 'status-done', delayed: 'status-blocked', 'at-risk': 'status-waiting', cancelled: 'status-cancelled',
  };
  const labels: Record<MilestoneStatus, string> = {
    planned: 'Planned', 'in-progress': 'In Progress', completed: 'Completed',
    delayed: 'Delayed', 'at-risk': 'At Risk', cancelled: 'Cancelled',
  };
  return <span className={`badge ${map[status] || ''}`}>{labels[status] || status}</span>;
}

export function DecisionBadge({ status }: { status: DecisionStatus }) {
  const map: Record<DecisionStatus, string> = {
    proposed: 'status-planned', 'under-discussion': 'status-in-progress',
    'decision-required': 'status-blocked', approved: 'status-done',
    rejected: 'status-cancelled', superseded: 'status-cancelled',
  };
  return <span className={`badge ${map[status] || ''}`}>{status.replace(/-/g, ' ')}</span>;
}

export function IssueBadge({ status }: { status: IssueStatus }) {
  const map: Record<IssueStatus, string> = {
    open: 'status-blocked', 'in-progress': 'status-in-progress',
    resolved: 'status-done', escalated: 'priority-critical', closed: 'status-cancelled',
  };
  return <span className={`badge ${map[status] || ''}`}>{status}</span>;
}

export function CommBadge({ status }: { status: CommunicationStatus }) {
  const map: Record<CommunicationStatus, string> = {
    sent: 'status-done', received: 'status-ready', 'awaiting-response': 'status-waiting',
    'response-received': 'status-done', 'follow-up-needed': 'status-blocked', closed: 'status-cancelled',
  };
  const labels: Record<CommunicationStatus, string> = {
    sent: 'Sent', received: 'Received', 'awaiting-response': 'Awaiting Response',
    'response-received': 'Response Received', 'follow-up-needed': 'Follow-up Needed', closed: 'Closed',
  };
  return <span className={`badge ${map[status] || ''}`}>{labels[status] || status}</span>;
}

export function ActionBadge({ status }: { status: ActionStatus }) {
  const map: Record<ActionStatus, string> = {
    open: 'status-planned', 'in-progress': 'status-in-progress',
    done: 'status-done', cancelled: 'status-cancelled',
  };
  return <span className={`badge ${map[status] || ''}`}>{status}</span>;
}

// ============================================================
// Progress bar
// ============================================================
export function ProgressBar({ value, max = 100, color }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const cls = pct === 100 ? 'success' : pct < 30 ? 'danger' : pct < 60 ? 'warning' : '';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="progress-bar" style={{ flex: 1 }}>
        <div
          className={`progress-fill ${color || cls}`}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

// ============================================================
// Date display
// ============================================================
import { format, differenceInDays, isPast, isToday, parseISO } from 'date-fns';

export function DateDisplay({ date, showRelative = true }: { date: string; showRelative?: boolean }) {
  if (!date) return <span style={{ color: 'var(--text-placeholder)' }}>—</span>;
  try {
    const d = parseISO(date);
    const diff = differenceInDays(d, new Date());
    const formatted = format(d, 'MMM d, yyyy');
    if (!showRelative) return <span>{formatted}</span>;
    let extra = '';
    let color = 'var(--text-muted)';
    if (isToday(d)) { extra = ' (today)'; color = 'var(--warning)'; }
    else if (isPast(d)) { extra = ` (${Math.abs(diff)}d late)`; color = 'var(--danger)'; }
    else if (diff <= 7) { extra = ` (${diff}d)`; color = 'var(--warning)'; }
    else if (diff <= 14) { extra = ` (${diff}d)`; color = 'var(--text-secondary)'; }
    return <span style={{ color }}>{formatted}{extra}</span>;
  } catch {
    return <span style={{ color: 'var(--text-placeholder)' }}>{date}</span>;
  }
}

export function daysUntil(date: string): number {
  if (!date) return Infinity;
  return differenceInDays(parseISO(date), new Date());
}

export function isOverdue(date: string): boolean {
  if (!date) return false;
  return isPast(parseISO(date)) && !isToday(parseISO(date));
}

// ============================================================
// Avatar / Initials
// ============================================================
const AVATAR_COLORS = [
  '#4f8ef7', '#7c6af7', '#f74f8e', '#f79a4f', '#4ff7a8',
  '#f7d14f', '#4fd9f7', '#f74f4f', '#8ef74f',
];

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colorIdx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  const bg = AVATAR_COLORS[colorIdx];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: 'white', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0, userSelect: 'none',
    }}>
      {initials}
    </div>
  );
}

// ============================================================
// Empty state
// ============================================================
export function EmptyState({ icon: Icon, title, desc, action }: {
  icon: React.ElementType; title: string; desc?: string; action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><Icon /></div>
      <div className="empty-state-title">{title}</div>
      {desc && <div className="empty-state-desc">{desc}</div>}
      {action}
    </div>
  );
}

// ============================================================
// Modal
// ============================================================
export function Modal({ title, onClose, children, footer, size = '' }: {
  title: string; onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'lg' | 'xl' | '';
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal${size ? ` modal-${size}` : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn-icon btn-ghost" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ============================================================
// Confirm Dialog
// ============================================================
export function ConfirmDialog({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-body" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-6)' }}>{message}</p>
          <div className="flex gap-3 justify-end">
            <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Needed for useEffect in Modal
import { useEffect } from 'react';
import { X } from 'lucide-react';
