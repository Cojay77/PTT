// ============================================================
// Data Export Utilities (CSV, JSON, Markdown)
// ============================================================
import { saveAs } from 'file-saver';
import type { Task, Risk, Issue, Decision, Action, Milestone, Communication, Stakeholder, Resource, ProjectConfig } from '../types';

export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  saveAs(blob, filename);
}

function escapeCsvCell(cell: unknown): string {
  if (cell === null || cell === undefined) return '';
  const str = String(cell);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map(row => row.map(escapeCsvCell).join(','))
  ];
  const csvContent = '\uFEFF' + csvLines.join('\r\n'); // UTF-8 BOM for Excel compatibility
  downloadFile(filename, csvContent, 'text/csv;charset=utf-8');
}

export function exportTasksToCsv(tasks: Task[]): void {
  const headers = ['ID', 'Title', 'Status', 'Priority', 'Owner', 'Due Date', 'Estimated (h)', 'Actual (h)', 'Remaining (h)', 'Phase', 'Category', 'Description'];
  const rows = tasks.map(t => [
    t.id, t.title, t.status, t.priority, t.owner, t.dueDate,
    t.estimatedWorkload, t.actualWorkload, t.remainingWorkload,
    t.phase, t.category, t.description
  ]);
  const dateStr = new Date().toISOString().split('T')[0];
  exportToCsv(`tasks-export-${dateStr}.csv`, headers, rows);
}

export function exportRaidToCsv(risks: Risk[], actions: Action[], issues: Issue[], decisions: Decision[]): void {
  const headers = ['Type', 'ID', 'Title / Description', 'Status', 'Severity / Priority', 'Owner', 'Target / Due Date', 'Details / Strategy'];
  const rows = [
    ...risks.map(r => ['Risk', r.id, r.title, r.status, r.severity, r.owner, r.targetResolutionDate, r.mitigationStrategy]),
    ...issues.map(i => ['Issue', i.id, i.title, i.status, i.severity, i.owner, i.resolutionTarget, i.impact]),
    ...actions.map(a => ['Action', a.id, a.action, a.status, a.source, a.owner, a.dueDate, a.notes]),
    ...decisions.map(d => ['Decision', d.id, d.title, d.status, d.impact, d.owner, d.decisionDate || d.deadline, d.finalDecision || d.context]),
  ];
  const dateStr = new Date().toISOString().split('T')[0];
  exportToCsv(`raid-log-${dateStr}.csv`, headers, rows);
}

export function exportFullJson(data: {
  projectConfig: ProjectConfig | null;
  tasks: Task[];
  milestones: Milestone[];
  risks: Risk[];
  issues: Issue[];
  decisions: Decision[];
  actions: Action[];
  communications: Communication[];
  stakeholders: Stakeholder[];
  resources: Resource[];
}): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(`project-export-${dateStr}.json`, jsonContent, 'application/json;charset=utf-8');
}
