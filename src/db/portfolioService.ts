// ============================================================
// Portfolio Service — Workspace-wide Multi-Project Extraction
// ------------------------------------------------------------
// Aggregates all projects in the workspace (plus custom initiatives)
// into a unified executive portfolio register with live health,
// metrics, progress, budget spend, and milestone tracking.
// ============================================================
import type { Database } from 'sql.js';
import {
  mapWorkspaceProjects,
  switchProject,
  deleteProject,
  createProject,
  updateWorkspaceProjectConfig,
  type WorkspaceProject,
} from './db';
import type {
  PortfolioProject,
  PortfolioProjectStatus,
  ProjectHealthStatus,
} from '../types';

type Row = Record<string, unknown>;

function rows(d: Database, sqlStr: string, params: (string | number)[] = []): Row[] {
  try {
    const stmt = d.prepare(sqlStr);
    stmt.bind(params);
    const out: Row[] = [];
    while (stmt.step()) out.push(stmt.getAsObject() as Row);
    stmt.free();
    return out;
  } catch {
    // If a table or column does not exist in an older database, gracefully return empty
    return [];
  }
}

const s = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

// ------------------------------------------------------------
// Extraction from an individual project database
// ------------------------------------------------------------
export function extractProjectPortfolio(
  d: Database,
  meta: WorkspaceProject,
  isActive: boolean,
  todayStr: string
): PortfolioProject {
  const cfg = rows(
    d,
    `SELECT name, code, description, manager, sponsor, start_date, target_date, current_phase, status, status_note, created_at, updated_at FROM project_config WHERE id = 'main'`
  )[0] || {};

  // Task metrics: total, done, blocked, overdue
  const taskRow = rows(
    d,
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
       SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) AS blocked,
       SUM(CASE WHEN status NOT IN ('done','cancelled') AND due_date != '' AND due_date < ? THEN 1 ELSE 0 END) AS overdue
     FROM tasks
     WHERE is_backlog = 0 AND status != 'cancelled'`,
    [todayStr]
  )[0] || {};

  const totalTasks = Number(taskRow.total) || 0;
  const doneTasks = Number(taskRow.done) || 0;
  const blockedTasks = Number(taskRow.blocked) || 0;
  const overdueTasks = Number(taskRow.overdue) || 0;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Critical & high risks
  const riskRow = rows(
    d,
    `SELECT
       SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) AS critical,
       SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) AS high,
       COUNT(*) AS total
     FROM risks
     WHERE status NOT IN ('closed', 'accepted')`
  )[0] || {};
  const criticalRisks = Number(riskRow.critical) || 0;

  // Critical issues
  const issueRow = rows(
    d,
    `SELECT
       SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) AS critical,
       COUNT(*) AS total
     FROM issues
     WHERE status NOT IN ('resolved', 'closed')`
  )[0] || {};
  const criticalIssues = Number(issueRow.critical) || 0;

  // Pending decisions requiring attention
  const decRow = rows(
    d,
    `SELECT COUNT(*) AS pending
     FROM decisions
     WHERE status IN ('proposed', 'under-discussion', 'decision-required')`
  )[0] || {};
  const pendingDecisions = Number(decRow.pending) || 0;

  // Weighted health score calculation (matches PTT standards)
  let score = 100;
  score -= Math.min(35, overdueTasks * 7);
  score -= Math.min(25, blockedTasks * 6);
  score -= Math.min(25, criticalRisks * 8);
  score -= Math.min(20, criticalIssues * 6);
  score -= Math.min(15, pendingDecisions * 4);
  score = Math.max(0, Math.min(100, score));

  const health: ProjectHealthStatus = score >= 80 ? 'green' : score >= 60 ? 'amber' : 'red';

  // Budget stats
  const budgetRow = rows(
    d,
    `SELECT
       SUM(planned_amount) AS planned,
       SUM(actual_amount) AS actual
     FROM budget_items`
  )[0] || {};
  const currencyRow = rows(d, `SELECT currency FROM budget_items WHERE currency != '' LIMIT 1`)[0];
  const currency = s(currencyRow?.currency) || 'EUR';

  // Key Milestone: next upcoming milestone
  const upcomingMilestone =
    rows(
      d,
      `SELECT name, target_date
       FROM milestones
       WHERE status != 'completed' AND target_date != '' AND target_date >= ?
       ORDER BY target_date ASC LIMIT 1`,
      [todayStr]
    )[0] ||
    rows(
      d,
      `SELECT name, target_date
       FROM milestones
       WHERE status != 'completed'
       ORDER BY CASE WHEN target_date != '' THEN target_date ELSE '9999' END ASC LIMIT 1`
    )[0];

  const keyMilestoneStr = upcomingMilestone
    ? `${s(upcomingMilestone.name) || 'Milestone'}${upcomingMilestone.target_date ? ` (${s(upcomingMilestone.target_date)})` : ''}`
    : '';

  // Status mapping
  const rawStatus = s(cfg.status).toLowerCase();
  let status: PortfolioProjectStatus = 'active';
  if (rawStatus === 'completed') status = 'completed';
  else if (rawStatus === 'on-hold') status = 'on-hold';
  else if (rawStatus === 'planning') status = 'planning';
  else if (rawStatus === 'cancelled') status = 'cancelled';
  else status = 'active';

  return {
    id: meta.id,
    name: s(cfg.name) || meta.name || 'Untitled Project',
    code: s(cfg.code) || meta.code || '',
    description: s(cfg.description) || '',
    status,
    health,
    manager: s(cfg.manager) || meta.summary?.manager || '',
    sponsor: s(cfg.sponsor) || '',
    startDate: s(cfg.start_date) || '',
    targetDate: s(cfg.target_date) || meta.summary?.targetDate || '',
    currentPhase: s(cfg.current_phase) || meta.summary?.phase || 'Execution',
    progressPercent,
    budgetPlanned: Number(budgetRow?.planned) || 0,
    budgetActual: Number(budgetRow?.actual) || 0,
    currency,
    keyMilestone: keyMilestoneStr,
    filePath: meta.linkedFilePath || undefined,
    notes: s(cfg.status_note) || '',
    createdAt: s(cfg.created_at) || meta.createdAt || new Date().toISOString(),
    updatedAt: meta.updatedAt || s(cfg.updated_at) || new Date().toISOString(),
    isWorkspaceProject: true,
    isActiveProject: isActive,
    color: meta.color,
    score,
    openTasks: Math.max(0, totalTasks - doneTasks),
    overdueTasks,
    blockedTasks,
    criticalRisks,
    criticalIssues,
  };
}

// ------------------------------------------------------------
// Per-project extraction cache
// ------------------------------------------------------------
const cache = new Map<string, { updatedAt: string; project: PortfolioProject }>();

export function invalidatePortfolioCache(): void {
  cache.clear();
}

// ------------------------------------------------------------
// Custom / External Initiatives (persistent across projects)
// ------------------------------------------------------------
const CUSTOM_PORTFOLIO_KEY = 'ptt_custom_portfolio_initiatives';

export function getCustomPortfolioInitiatives(): PortfolioProject[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PORTFOLIO_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomPortfolioInitiative(item: Partial<PortfolioProject>): PortfolioProject {
  const existing = getCustomPortfolioInitiatives();
  const id = item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
  const now = new Date().toISOString();
  const created: PortfolioProject = {
    id,
    name: (item.name || 'New Initiative').trim(),
    code: (item.code || '').trim().toUpperCase(),
    description: (item.description || '').trim(),
    status: item.status || 'active',
    health: item.health || 'green',
    manager: (item.manager || '').trim(),
    sponsor: (item.sponsor || '').trim(),
    startDate: item.startDate || '',
    targetDate: item.targetDate || '',
    currentPhase: (item.currentPhase || 'Planning').trim(),
    progressPercent: Number(item.progressPercent || 0),
    budgetPlanned: Number(item.budgetPlanned || 0),
    budgetActual: Number(item.budgetActual || 0),
    currency: item.currency || 'EUR',
    keyMilestone: (item.keyMilestone || '').trim(),
    notes: (item.notes || '').trim(),
    createdAt: item.createdAt || now,
    updatedAt: now,
    isWorkspaceProject: false,
    isActiveProject: false,
  };

  const idx = existing.findIndex((i) => i.id === id);
  if (idx >= 0) {
    existing[idx] = created;
  } else {
    existing.push(created);
  }
  localStorage.setItem(CUSTOM_PORTFOLIO_KEY, JSON.stringify(existing));
  window.dispatchEvent(new CustomEvent('ptt:workspace-changed'));
  return created;
}

export function updateCustomPortfolioInitiative(
  id: string,
  updates: Partial<PortfolioProject>
): PortfolioProject | null {
  const existing = getCustomPortfolioInitiatives();
  const idx = existing.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  const updated: PortfolioProject = {
    ...existing[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  existing[idx] = updated;
  localStorage.setItem(CUSTOM_PORTFOLIO_KEY, JSON.stringify(existing));
  window.dispatchEvent(new CustomEvent('ptt:workspace-changed'));
  return updated;
}

export function deleteCustomPortfolioInitiative(id: string): void {
  const existing = getCustomPortfolioInitiatives().filter((i) => i.id !== id);
  localStorage.setItem(CUSTOM_PORTFOLIO_KEY, JSON.stringify(existing));
  window.dispatchEvent(new CustomEvent('ptt:workspace-changed'));
}

// ------------------------------------------------------------
// Main Loader: Aggregates Workspace Projects + Custom Initiatives
// ------------------------------------------------------------
export async function loadWorkspacePortfolio(): Promise<PortfolioProject[]> {
  const todayStr = new Date().toISOString().split('T')[0];

  const results = await mapWorkspaceProjects(
    (d, meta, isActive) => extractProjectPortfolio(d, meta, isActive, todayStr),
    (meta, isActive) => isActive || cache.get(meta.id)?.updatedAt !== meta.updatedAt
  );

  const liveIds = new Set(results.map((r) => r.meta.id));
  for (const id of cache.keys()) {
    if (!liveIds.has(id)) cache.delete(id);
  }

  const workspaceProjects: PortfolioProject[] = [];

  for (const r of results) {
    if (r.value) {
      if (!r.isActive) {
        cache.set(r.meta.id, { updatedAt: r.meta.updatedAt, project: r.value });
      }
      workspaceProjects.push(r.value);
    } else if (r.skipped) {
      const cached = cache.get(r.meta.id)?.project;
      if (cached) {
        workspaceProjects.push({ ...cached, isActiveProject: r.isActive });
      }
    }
  }

  const custom = getCustomPortfolioInitiatives();
  return [...workspaceProjects, ...custom];
}

// ------------------------------------------------------------
// Unified CRUD Dispatcher
// ------------------------------------------------------------
export async function deletePortfolioItem(project: PortfolioProject): Promise<void> {
  if (project.isWorkspaceProject) {
    cache.delete(project.id);
    await deleteProject(project.id);
  } else {
    deleteCustomPortfolioInitiative(project.id);
  }
}

export async function savePortfolioItem(
  payload: Partial<PortfolioProject>,
  existing?: PortfolioProject | null
): Promise<PortfolioProject> {
  if (existing?.isWorkspaceProject) {
    // Updating existing workspace project metadata & config
    await updateWorkspaceProjectConfig(existing.id, {
      name: payload.name,
      code: payload.code,
      description: payload.description,
      manager: payload.manager,
      sponsor: payload.sponsor,
      startDate: payload.startDate,
      targetDate: payload.targetDate,
      currentPhase: payload.currentPhase,
      status: payload.status,
      notes: payload.notes,
    });
    cache.delete(existing.id);
    return { ...existing, ...payload, updatedAt: new Date().toISOString() };
  }

  if (!existing && payload.isWorkspaceProject) {
    // User chose to create a new workspace project from portfolio
    const created = await createProject({
      name: payload.name || 'New Project',
      code: payload.code || '',
    });
    await updateWorkspaceProjectConfig(created.id, {
      description: payload.description,
      manager: payload.manager,
      sponsor: payload.sponsor,
      startDate: payload.startDate,
      targetDate: payload.targetDate,
      currentPhase: payload.currentPhase,
      status: payload.status,
      notes: payload.notes,
    });
    return {
      id: created.id,
      name: created.name,
      code: created.code,
      description: payload.description || '',
      status: payload.status || 'active',
      health: 'green',
      manager: payload.manager || '',
      sponsor: payload.sponsor || '',
      startDate: payload.startDate || '',
      targetDate: payload.targetDate || '',
      currentPhase: payload.currentPhase || 'Planning',
      progressPercent: 0,
      budgetPlanned: payload.budgetPlanned || 0,
      budgetActual: payload.budgetActual || 0,
      currency: payload.currency || 'EUR',
      keyMilestone: payload.keyMilestone || '',
      notes: payload.notes || '',
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      isWorkspaceProject: true,
      isActiveProject: true,
      color: created.color,
    };
  }

  // Custom standalone initiative
  return saveCustomPortfolioInitiative({
    ...payload,
    id: existing?.id,
  });
}

export { switchProject };
