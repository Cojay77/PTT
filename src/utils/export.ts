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

export function downloadTaskTemplateCsv(): void {
  const headers = ['Title', 'Status', 'Priority', 'Owner', 'Due Date', 'Estimated (h)', 'Phase', 'Category', 'Description'];
  const sampleRows = [
    ['Setup CI/CD deployment pipeline', 'planned', 'high', 'Thomas Laurent', '2026-10-15', '16', 'Build', 'DevOps', 'Configure automated pipelines and checks'],
    ['Security vulnerability audit', 'in-progress', 'critical', 'Sophie Chen', '2026-10-20', '24', 'Security', 'Audit', 'Review third-party packages and API tokens'],
  ];
  exportToCsv('ptt-task-template.csv', headers, sampleRows);
}

export function parseCsv(csvText: string): { headers: string[]; rows: string[][] } {
  const text = csvText.replace(/^\uFEFF/, '');
  let currentField = '';
  let inQuotes = false;
  let currentLine: string[] = [];
  const result: string[][] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentLine.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        // ignore
      } else if (char === '\n') {
        currentLine.push(currentField.trim());
        if (currentLine.some(c => c.length > 0)) {
          result.push(currentLine);
        }
        currentLine = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    if (currentLine.some(c => c.length > 0)) {
      result.push(currentLine);
    }
  }

  if (result.length === 0) return { headers: [], rows: [] };
  const headers = result[0];
  const rows = result.slice(1);
  return { headers, rows };
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
  budgetItems?: unknown[];
  changeRequests?: unknown[];
  weeklyReviews?: unknown[];
  meetings?: unknown[];
  notes?: unknown[];
}): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(`project-export-${dateStr}.json`, jsonContent, 'application/json;charset=utf-8');
}

