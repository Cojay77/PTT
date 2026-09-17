import { query, queryOne, execute, generateId } from '../db';
import type { Task } from '../../types';

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || '',
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    owner: (row.owner as string) || '',
    contributors: (row.contributors as string) || '',
    createdAt: (row.created_at as string) || '',
    startDate: (row.start_date as string) || '',
    dueDate: (row.due_date as string) || '',
    estimatedWorkload: (row.estimated_workload as number) || 0,
    remainingWorkload: (row.remaining_workload as number) || 0,
    actualWorkload: (row.actual_workload as number) || 0,
    category: (row.category as string) || '',
    tags: (row.tags as string) || '',
    phase: (row.phase as string) || '',
    milestoneId: (row.milestone_id as string) || null,
    dependencies: (row.dependencies as string) || '',
    blockingReason: (row.blocking_reason as string) || '',
    notes: (row.notes as string) || '',
    references: (row.ref_links as string) || (row.references as string) || '',
    updatedAt: (row.updated_at as string) || '',
    isBacklog: Boolean(row.is_backlog),
    backlogPriority: (row.backlog_priority as number) || 0,
    effort: (row.effort as string) || '',
    businessValue: (row.business_value as string) || '',
    technicalValue: (row.technical_value as string) || '',
  };
}

export const taskQueries = {
  getAll(): Task[] {
    return query<Record<string, unknown>>(
      `SELECT * FROM tasks WHERE is_backlog = 0 ORDER BY 
       CASE priority 
         WHEN 'critical' THEN 0 WHEN 'high' THEN 1 
         WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
       due_date ASC, created_at DESC`
    ).map(rowToTask);
  },

  getBacklog(): Task[] {
    return query<Record<string, unknown>>(
      `SELECT * FROM tasks WHERE is_backlog = 1 ORDER BY backlog_priority ASC, created_at DESC`
    ).map(rowToTask);
  },

  getById(id: string): Task | null {
    const row = queryOne<Record<string, unknown>>(`SELECT * FROM tasks WHERE id = ?`, [id]);
    return row ? rowToTask(row) : null;
  },

  getOverdue(): Task[] {
    const today = new Date().toISOString().split('T')[0];
    return query<Record<string, unknown>>(
      `SELECT * FROM tasks WHERE is_backlog = 0 AND due_date != '' AND due_date < ? AND status NOT IN ('done', 'cancelled') ORDER BY due_date ASC`,
      [today]
    ).map(rowToTask);
  },

  getBlocked(): Task[] {
    return query<Record<string, unknown>>(
      `SELECT * FROM tasks WHERE is_backlog = 0 AND status = 'blocked' ORDER BY due_date ASC`
    ).map(rowToTask);
  },

  getByMilestone(milestoneId: string): Task[] {
    return query<Record<string, unknown>>(
      `SELECT * FROM tasks WHERE milestone_id = ? AND is_backlog = 0 ORDER BY due_date ASC`,
      [milestoneId]
    ).map(rowToTask);
  },

  getByOwner(owner: string): Task[] {
    return query<Record<string, unknown>>(
      `SELECT * FROM tasks WHERE is_backlog = 0 AND owner = ? AND status NOT IN ('done', 'cancelled') ORDER BY due_date ASC`,
      [owner]
    ).map(rowToTask);
  },

  getUpcoming(days = 14): Task[] {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
    return query<Record<string, unknown>>(
      `SELECT * FROM tasks WHERE is_backlog = 0 AND due_date >= ? AND due_date <= ? AND status NOT IN ('done', 'cancelled') ORDER BY due_date ASC`,
      [today, future]
    ).map(rowToTask);
  },

  create(task: Partial<Task>): Task {
    const id = generateId();
    const now = new Date().toISOString();
    execute(
      `INSERT INTO tasks (id, title, description, status, priority, owner, contributors, start_date, due_date, 
       estimated_workload, remaining_workload, actual_workload, category, tags, phase, milestone_id, 
       dependencies, blocking_reason, notes, ref_links, is_backlog, backlog_priority, effort, business_value, technical_value,
       created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        task.title || 'New Task',
        task.description || '',
        task.status || (task.isBacklog ? 'backlog' : 'planned'),
        task.priority || 'medium',
        task.owner || '',
        task.contributors || '',
        task.startDate || '',
        task.dueDate || '',
        task.estimatedWorkload || 0,
        task.remainingWorkload || 0,
        task.actualWorkload || 0,
        task.category || '',
        task.tags || '',
        task.phase || '',
        task.milestoneId || null,
        task.dependencies || '',
        task.blockingReason || '',
        task.notes || '',
        task.references || '',
        task.isBacklog ? 1 : 0,
        task.backlogPriority || 0,
        task.effort || '',
        task.businessValue || '',
        task.technicalValue || '',
        now,
        now,
      ]
    );
    return this.getById(id)!;
  },

  update(id: string, updates: Partial<Task>): Task | null {
    const now = new Date().toISOString();
    const fields = [];
    const values: (string | number | null | boolean)[] = [];

    const fieldMap: Record<string, string> = {
      title: 'title', description: 'description', status: 'status', priority: 'priority',
      owner: 'owner', contributors: 'contributors', startDate: 'start_date', dueDate: 'due_date',
      estimatedWorkload: 'estimated_workload', remainingWorkload: 'remaining_workload', actualWorkload: 'actual_workload',
      category: 'category', tags: 'tags', phase: 'phase', milestoneId: 'milestone_id',
      dependencies: 'dependencies', blockingReason: 'blocking_reason', notes: 'notes', references: 'ref_links',
      isBacklog: 'is_backlog', backlogPriority: 'backlog_priority', effort: 'effort',
      businessValue: 'business_value', technicalValue: 'technical_value',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in updates) {
        fields.push(`${col} = ?`);
        const val = updates[key as keyof Task];
        values.push(typeof val === 'boolean' ? (val ? 1 : 0) : (val as string | number | null));
      }
    }

    if (fields.length === 0) return this.getById(id);
    fields.push('updated_at = ?');
    values.push(now, id);

    execute(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },

  delete(id: string): void {
    execute(`DELETE FROM tasks WHERE id = ?`, [id]);
  },

  promoteFromBacklog(id: string): Task | null {
    return this.update(id, { isBacklog: false, status: 'planned' });
  },

  getStats() {
    const rows = query<Record<string, unknown>>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
        SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN due_date != '' AND due_date < ? AND status NOT IN ('done','cancelled') THEN 1 ELSE 0 END) as overdue,
        SUM(estimated_workload) as total_workload,
        SUM(actual_workload) as actual_workload,
        SUM(remaining_workload) as remaining_workload
       FROM tasks WHERE is_backlog = 0`,
      [new Date().toISOString().split('T')[0]]
    );
    return rows[0] || {};
  },
};
