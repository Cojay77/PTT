import { useState, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { useTaskStore } from '../store/useTaskStore';
import { useDataStore } from '../store/useDataStore';
import { ProgressBar, SeverityBadge, StatusBadge, MilestoneBadge, Avatar } from '../components/ui/shared';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  Download, FileText, CheckSquare, Presentation, BarChart3, Copy, Check,
  AlertTriangle, TrendingUp, TrendingDown, Clock, Shield, Target, Zap,
  DollarSign, Activity, ArrowUpRight, ArrowDownRight, Minus, LayoutGrid,
  Image, Loader2, Calendar, User, Layers,
} from 'lucide-react';
import { exportTasksToCsv, exportRaidToCsv, downloadFile } from '../utils/export';
import { projectConfigQueries } from '../db/queries';
import { differenceInDays, parseISO, format } from 'date-fns';
import { BurndownCard } from '../components/ui/BurndownCard';
import { computeBurndown } from '../utils/burndown';

const COLORS = ['#4f8ef7', '#7c6af7', '#f74f8e', '#f79a4f', '#4ff7a8', '#f7d14f', '#4fd9f7'];
const RISK_COLORS: Record<string, string> = {
  critical: '#dc2626', high: '#f97316', medium: '#fbbf24', low: '#22c55e',
};
const TASK_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  done: { label: 'Done', color: '#22c55e' },
  'in-progress': { label: 'In Progress', color: '#4f8ef7' },
  blocked: { label: 'Blocked', color: '#ef4444' },
  waiting: { label: 'Waiting', color: '#f59e0b' },
  planned: { label: 'Planned', color: '#64748b' },
  backlog: { label: 'Backlog', color: '#8b5cf6' },
  cancelled: { label: 'Cancelled', color: '#94a3b8' },
};
const RISK_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#dc2626' },
  high: { label: 'High', color: '#f97316' },
  medium: { label: 'Medium', color: '#fbbf24' },
  low: { label: 'Low', color: '#22c55e' },
};

// ── KpiCard ──────────────────────────────────────────────────
function KpiCard({
  value, label, icon: Icon, color, bgColor, sub, trend, trendLabel,
}: {
  value: string | number;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  bgColor: string;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
}) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  const trendColor = trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--danger)' : 'var(--text-muted)';
  return (
    <div className="stat-card" style={{ '--stat-accent': color, '--stat-accent-bg': bgColor } as React.CSSProperties}>
      <div className="stat-icon"><Icon size={18} color={color} /></div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {trendLabel && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <TrendIcon size={12} color={trendColor} />
          <span style={{ fontSize: 11, color: trendColor, fontWeight: 600 }}>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

// ── SlideWrapper ─────────────────────────────────────────────
// ── Image export helpers ─────────────────────────────────────
async function captureElement(el: HTMLElement, scale = 2): Promise<Blob> {
  const canvas = await html2canvas(el, {
    scale,
    useCORS: true,
    backgroundColor: null,
    logging: false,
    // Resolve CSS custom properties to actual colours so html2canvas renders them
    onclone: (clonedDoc) => {
      const root = clonedDoc.documentElement;
      const computed = getComputedStyle(document.documentElement);
      // Copy all custom properties across to the cloned document
      const props = Array.from(computed).filter(p => p.startsWith('--'));
      props.forEach(p => root.style.setProperty(p, computed.getPropertyValue(p)));
    },
  });
  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png'));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function copyBlobToClipboard(blob: Blob) {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

// ── SlideWrapper ─────────────────────────────────────────────
function SlideWrapper({
  slideNum, title, children, exportRef,
}: {
  slideNum: number;
  title: string;
  children: React.ReactNode;
  exportRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [busy, setBusy] = useState<'copy' | 'save' | null>(null);

  async function handleCopyImage() {
    if (!exportRef.current) return;
    setBusy('copy');
    try {
      const blob = await captureElement(exportRef.current);
      await copyBlobToClipboard(blob);
    } finally { setBusy(null); }
  }

  async function handleSavePng() {
    if (!exportRef.current) return;
    setBusy('save');
    try {
      const blob = await captureElement(exportRef.current);
      const today = new Date().toISOString().split('T')[0];
      downloadBlob(blob, `slide-${slideNum}-${today}.png`);
    } finally { setBusy(null); }
  }

  return (
    <div className="card" style={{ border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-md)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, var(--accent), hsl(262,72%,58%))' }} />
      {/* Toolbar — above the captured area */}
      <div className="flex items-center justify-between gap-3" style={{ padding: '12px 20px 0', marginBottom: 0 }}>
        <div className="flex items-center gap-3">
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 'var(--radius-full)', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{slideNum}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={handleCopyImage} disabled={busy !== null} title="Copy this slide as image — paste directly into PowerPoint, Slides, Teams…">
            {busy === 'copy' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Copy size={13} />}
            {busy === 'copy' ? 'Copying…' : 'Copy Image'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleSavePng} disabled={busy !== null} title="Save as PNG file">
            {busy === 'save' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Image size={13} />}
            {busy === 'save' ? 'Saving…' : 'Save PNG'}
          </button>
        </div>
      </div>
      {/* This div is the one we capture */}
      <div ref={exportRef} style={{ padding: '16px 20px 20px', background: 'var(--bg-surface)' }}>
        {children}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
export default function Reports() {
  const { tasks } = useTaskStore();
  const { risks, issues, milestones, actions, decisions, resources, budgetItems, changeRequests } = useDataStore();
  const projectConfig = projectConfigQueries.get();

  const [activeTab, setActiveTab] = useState<'analytics' | 'presentation'>('analytics');
  const [exportingAll, setExportingAll] = useState(false);

  const [includeSections, setIncludeSections] = useState({
    status: true, milestones: true, decisions: true,
    risks: true, blockers: true, budget: true, nextSteps: true,
  });

  // One ref per slide — always declare all 7 unconditionally
  const slideRefs = [
    useRef<HTMLDivElement | null>(null),
    useRef<HTMLDivElement | null>(null),
    useRef<HTMLDivElement | null>(null),
    useRef<HTMLDivElement | null>(null),
    useRef<HTMLDivElement | null>(null),
    useRef<HTMLDivElement | null>(null),
    useRef<HTMLDivElement | null>(null),
  ] as const;

  const activeTasks = tasks.filter(t => !t.isBacklog);
  const today = new Date().toISOString().split('T')[0];
  const todayFormatted = format(new Date(), 'MMMM d, yyyy');

  // ── KPIs ─────────────────────────────────────────────────
  const doneTasks = activeTasks.filter(t => t.status === 'done').length;
  const completionRate = activeTasks.length > 0 ? Math.round((doneTasks / activeTasks.length) * 100) : 0;
  const inProgressTasks = activeTasks.filter(t => t.status === 'in-progress').length;
  const blockedTasks = activeTasks.filter(t => t.status === 'blocked').length;
  const overdueTasks = activeTasks.filter(t => t.dueDate && t.dueDate < today && !['done', 'cancelled'].includes(t.status));
  const totalEstimated = activeTasks.reduce((s, t) => s + (t.estimatedWorkload || 0), 0);
  const totalActual = activeTasks.reduce((s, t) => s + (t.actualWorkload || 0), 0);
  const totalRemaining = activeTasks.reduce((s, t) => s + (t.remainingWorkload || 0), 0);
  const workloadBurnRate = totalEstimated > 0 ? Math.round((totalActual / totalEstimated) * 100) : 0;

  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const delayedMilestones = milestones.filter(m => m.status === 'delayed' || m.status === 'at-risk').length;
  const upcomingMilestones = milestones.filter(m => m.targetDate && m.targetDate >= today && !['completed', 'cancelled'].includes(m.status));
  const nextMilestone = [...upcomingMilestones].sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0];
  const daysToNextMilestone = nextMilestone?.targetDate ? differenceInDays(parseISO(nextMilestone.targetDate), new Date()) : null;
  const daysToDelivery = projectConfig?.targetDate ? differenceInDays(parseISO(projectConfig.targetDate), new Date()) : null;

  const openRisks = risks.filter(r => r.status !== 'closed');
  const criticalRisks = risks.filter(r => r.severity === 'critical' && r.status !== 'closed').length;
  const highRisks = risks.filter(r => r.severity === 'high' && r.status !== 'closed').length;
  const openIssues = issues.filter(i => !['resolved', 'closed'].includes(i.status));
  const criticalIssues = issues.filter(i => i.severity === 'critical' && !['resolved', 'closed'].includes(i.status)).length;

  const openActions = actions.filter(a => a.status !== 'done' && a.status !== 'cancelled');
  const overdueActions = actions.filter(a => a.dueDate && a.dueDate < today && a.status !== 'done' && a.status !== 'cancelled');
  const pendingDecisions = decisions.filter(d => !['approved', 'rejected', 'superseded'].includes(d.status));
  const decisionRequired = decisions.filter(d => d.status === 'decision-required');

  const totalPlanned = budgetItems.reduce((s, b) => s + b.plannedAmount, 0);
  const totalSpent = budgetItems.reduce((s, b) => s + b.actualAmount, 0);
  const totalForecast = budgetItems.reduce((s, b) => s + b.forecastAmount, 0);
  const budgetVariance = totalForecast - totalPlanned;
  const budgetPct = totalPlanned > 0 ? Math.round((totalSpent / totalPlanned) * 100) : 0;
  const openCRs = changeRequests.filter(c => !['approved', 'rejected', 'withdrawn', 'implemented'].includes(c.status)).length;

  const topRisks = openRisks.filter(r => r.severity === 'critical' || r.severity === 'high').slice(0, 5);
  const majorBlockers = openIssues.filter(i => i.severity === 'critical' || i.severity === 'high').slice(0, 5);
  const keyDecisions = decisions.slice(0, 5);
  const nextActions = openActions.slice(0, 6);

  // ── Charts ───────────────────────────────────────────────
  const statusData = useMemo(() => {
    const rawOrder = ['done', 'in-progress', 'blocked', 'waiting', 'planned', 'backlog', 'cancelled'];
    return rawOrder
      .map(status => {
        const count = activeTasks.filter(t => t.status === status).length;
        const config = TASK_STATUS_CONFIG[status] || { label: status, color: '#64748b' };
        return {
          name: status,
          label: config.label,
          value: count,
          color: config.color,
        };
      })
      .filter(item => item.value > 0);
  }, [activeTasks]);

  const priorityData = ['critical', 'high', 'medium', 'low'].map(p => ({
    name: p, Tasks: activeTasks.filter(t => t.priority === p && !['done', 'cancelled'].includes(t.status)).length,
  }));

  const riskChartData = useMemo(() => {
    const severities = ['critical', 'high', 'medium', 'low'];
    return severities
      .map(severity => {
        const count = risks.filter(r => r.severity === severity && r.status !== 'closed').length;
        const config = RISK_CONFIG[severity] || { label: severity, color: '#94a3b8' };
        return {
          name: severity,
          label: config.label,
          value: count,
          color: config.color,
        };
      })
      .filter(item => item.value > 0);
  }, [risks]);

  const radarData = [
    { subject: 'Schedule', value: Math.max(0, 100 - overdueTasks.length * 15) },
    { subject: 'Resources', value: resources.length > 0 ? 75 : 50 },
    { subject: 'Risks', value: Math.max(0, 100 - criticalRisks * 25 - highRisks * 10) },
    { subject: 'Issues', value: Math.max(0, 100 - criticalIssues * 30 - openIssues.filter(i => i.severity === 'high').length * 15) },
    { subject: 'Progress', value: completionRate },
    { subject: 'Actions', value: Math.max(0, 100 - overdueActions.length * 15) },
  ];

  const sortedMilestones = useMemo(() => {
    return [...milestones].sort((a, b) => {
      if (!a.targetDate && !b.targetDate) return 0;
      if (!a.targetDate) return 1;
      if (!b.targetDate) return -1;
      return a.targetDate.localeCompare(b.targetDate);
    });
  }, [milestones]);

  const milestoneStats = useMemo(() => {
    const total = milestones.length;
    const completed = milestones.filter(m => m.status === 'completed' || m.progress === 100).length;
    const inProgress = milestones.filter(m => m.status === 'in-progress' && m.progress < 100).length;
    const delayed = milestones.filter(m => m.status === 'delayed').length;
    const atRisk = milestones.filter(m => m.status === 'at-risk').length;
    const planned = milestones.filter(m => m.status === 'planned').length;
    const avgProgress = total > 0 ? Math.round(milestones.reduce((acc, m) => acc + (m.progress || 0), 0) / total) : 0;
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, delayed, atRisk, planned, avgProgress, completionPct };
  }, [milestones]);

  const budgetChartData = budgetItems.length > 0 ? [
    { name: 'Planned', amount: totalPlanned },
    { name: 'Spent', amount: totalSpent },
    { name: 'Forecast', amount: totalForecast },
  ] : [];

  // ── Health Score ─────────────────────────────────────────
  const healthScore = Math.round(radarData.reduce((s, d) => s + d.value, 0) / radarData.length);
  const healthColor = healthScore >= 75 ? 'var(--success)' : healthScore >= 50 ? 'var(--warning)' : 'var(--danger)';
  const healthLabel = healthScore >= 75 ? 'Healthy' : healthScore >= 50 ? 'At Risk' : 'Critical';
  const burndown = useMemo(() => computeBurndown(tasks, projectConfig, milestones), [tasks, projectConfig, milestones]);

  const fmt = (n: number) => new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  function generateFullMarkdown(): string {
    const projName = projectConfig?.name || 'Project';
    const phase = projectConfig?.currentPhase || 'Execution';
    const status = projectConfig?.status || 'on-track';
    let md = `# ${projName} — Executive Status Report\n\n`;
    md += `**Date:** ${todayFormatted} | **Phase:** ${phase} | **Status:** ${status.toUpperCase()} | **Health:** ${healthScore}/100 (${healthLabel})\n\n`;
    if (includeSections.status) {
      md += `## 1. Project Status & Progress\n`;
      md += `- **Health Score:** ${healthScore}/100 (${healthLabel})\n`;
      md += `- **Task Completion:** ${completionRate}% (${doneTasks}/${activeTasks.length})\n`;
      md += `- **In Progress:** ${inProgressTasks} | **Blocked:** ${blockedTasks} | **Overdue:** ${overdueTasks.length}\n`;
      md += `- **Workload:** ${totalActual}h spent / ${totalEstimated}h estimated (${totalRemaining}h remaining)\n`;
      if (daysToDelivery !== null) md += `- **Days to Delivery:** ${daysToDelivery} days (${projectConfig?.targetDate})\n`;
      md += `- **Delivery Trajectory:** ${burndown.statusLabel} (Velocity: ${burndown.velocityPerWeek} tasks/week)\n`;
      md += `\n> ${projectConfig?.statusNote || 'Project progressing per current phase priorities.'}\n\n`;
    }
    if (includeSections.milestones) {
      md += `## 2. Milestones\n`;
      md += `**Completed:** ${completedMilestones}/${milestones.length} | **Delayed/At-Risk:** ${delayedMilestones}\n\n`;
      milestones.forEach(m => { md += `- [${m.progress}%] **${m.name}** — Target: ${m.targetDate || 'TBD'} — \`${m.status}\` — Owner: ${m.owner || 'Lead'}\n`; });
      md += '\n';
    }
    if (includeSections.decisions && keyDecisions.length > 0) {
      md += `## 3. Key Decisions\n`;
      md += `**Pending:** ${pendingDecisions.length} | **Requiring Decision:** ${decisionRequired.length}\n\n`;
      keyDecisions.forEach(d => { md += `- **${d.title}** (\`${d.status}\`): ${d.finalDecision || d.decisionRequired || d.context || 'Pending'}\n`; });
      md += '\n';
    }
    if (includeSections.risks && topRisks.length > 0) {
      md += `## 4. Top Risks\n`;
      md += `**Critical:** ${criticalRisks} | **High:** ${highRisks} | **Total Open:** ${openRisks.length}\n\n`;
      topRisks.forEach(r => { md += `- [${r.severity.toUpperCase()}] **${r.title}**: ${r.mitigationStrategy || 'Under assessment'} (Owner: ${r.owner || 'Unassigned'}, Target: ${r.targetResolutionDate || 'TBD'})\n`; });
      md += '\n';
    }
    if (includeSections.blockers && majorBlockers.length > 0) {
      md += `## 5. Major Blockers\n`;
      md += `**Critical Issues:** ${criticalIssues} | **Total Open:** ${openIssues.length}\n\n`;
      majorBlockers.forEach(b => { md += `- [${b.severity.toUpperCase()}] **${b.title}**: ${b.impact || 'Action required'}${b.resolutionActions ? ` — Action: ${b.resolutionActions}` : ''}\n`; });
      md += '\n';
    }
    if (includeSections.budget && budgetItems.length > 0) {
      md += `## 6. Budget\n`;
      md += `- **Planned:** ${totalPlanned.toLocaleString()} EUR\n`;
      md += `- **Spent:** ${totalSpent.toLocaleString()} EUR (${budgetPct}%)\n`;
      md += `- **Forecast:** ${totalForecast.toLocaleString()} EUR | **Variance:** ${budgetVariance >= 0 ? '+' : ''}${budgetVariance.toLocaleString()} EUR\n`;
      md += `- **Open Change Requests:** ${openCRs}\n\n`;
    }
    if (includeSections.nextSteps && nextActions.length > 0) {
      md += `## 7. Next Steps\n`;
      nextActions.forEach(a => { md += `- [ ] **${a.action}** (Owner: ${a.owner || 'Unassigned'}, Due: ${a.dueDate || 'ASAP'})\n`; });
      md += '\n';
    }
    return md;
  }

  function handleDownloadMarkdown() {
    downloadFile(`status-report-${today}.md`, generateFullMarkdown(), 'text/markdown;charset=utf-8');
  }

  const slideDefs = [
    { key: 'status', num: 1, title: 'Status' },
    { key: 'milestones', num: 2, title: 'Milestones' },
    { key: 'decisions', num: 3, title: 'Decisions' },
    { key: 'risks', num: 4, title: 'Risks' },
    { key: 'blockers', num: 5, title: 'Blockers' },
    { key: 'budget', num: 6, title: 'Budget' },
    { key: 'nextSteps', num: 7, title: 'Next Steps' },
  ] as const;

  /** Capture all visible slide refs, stitch them vertically, download as one PNG */
  async function handleExportAllPng() {
    setExportingAll(true);
    try {
      // Collect refs that are currently rendered (slide enabled and ref set)
      const activeRefs = [
        includeSections.status ? slideRefs[0].current : null,
        includeSections.milestones ? slideRefs[1].current : null,
        includeSections.decisions ? slideRefs[2].current : null,
        includeSections.risks ? slideRefs[3].current : null,
        includeSections.blockers ? slideRefs[4].current : null,
        includeSections.budget ? slideRefs[5].current : null,
        includeSections.nextSteps ? slideRefs[6].current : null,
      ].filter((r): r is HTMLDivElement => r !== null);

      if (activeRefs.length === 0) return;

      const SCALE = 2;
      const GAP = 24;
      const PADDING = 40;
      const canvases = await Promise.all(activeRefs.map(el => html2canvas(el, {
        scale: SCALE,
        useCORS: true,
        backgroundColor: null,
        logging: false,
        onclone: (clonedDoc) => {
          const root = clonedDoc.documentElement;
          const computed = getComputedStyle(document.documentElement);
          const props = Array.from(computed).filter(p => p.startsWith('--'));
          props.forEach(p => root.style.setProperty(p, computed.getPropertyValue(p)));
        },
      })));

      const maxW = Math.max(...canvases.map(c => c.width));
      const totalH = canvases.reduce((s, c) => s + c.height, 0) + (canvases.length - 1) * GAP * SCALE + PADDING * 2 * SCALE;

      const merged = document.createElement('canvas');
      merged.width = maxW + PADDING * 2 * SCALE;
      merged.height = totalH;
      const ctx = merged.getContext('2d')!;

      // Background
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-base').trim() || '#f4f6fb';
      ctx.fillRect(0, 0, merged.width, merged.height);

      let y = PADDING * SCALE;
      for (const c of canvases) {
        ctx.drawImage(c, PADDING * SCALE, y);
        y += c.height + GAP * SCALE;
      }

      merged.toBlob(blob => {
        if (blob) downloadBlob(blob, `report-${today}.png`);
      }, 'image/png');
    } finally {
      setExportingAll(false);
    }
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="page-title">Reports & Presentation</h1>
          <p className="page-subtitle">Executive KPI dashboard and steering committee slide builder</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="tabs" style={{ border: 'none', margin: 0 }}>
            <button className={`tab${activeTab === 'analytics' ? ' active' : ''}`} onClick={() => setActiveTab('analytics')}>
              <BarChart3 size={15} style={{ marginRight: 6 }} /> Analytics & KPIs
            </button>
            <button className={`tab${activeTab === 'presentation' ? ' active' : ''}`} onClick={() => setActiveTab('presentation')}>
              <Presentation size={15} style={{ marginRight: 6 }} /> Slide Builder
            </button>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => exportTasksToCsv(tasks)} title="Export Tasks CSV">
              <Download size={14} /> Tasks CSV
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => exportRaidToCsv(risks, actions, issues, decisions)} title="Export RAID CSV">
              <Download size={14} /> RAID CSV
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <>
          {/* ── Health Banner ── */}
          <div className="card" style={{ marginBottom: 24, padding: '20px 24px', background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--accent-soft) 100%)', borderColor: 'var(--accent-glow)' }}>
            <div className="flex items-center gap-6 flex-wrap">
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="flex items-center gap-3 mb-2">
                  <Activity size={20} color="var(--accent)" />
                  <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>{projectConfig?.name || 'Project'} — Executive Summary</span>
                  <StatusBadge status={projectConfig?.status || 'on-track'} />
                  {projectConfig?.currentPhase && <span className="badge status-in-progress">{projectConfig.currentPhase}</span>}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  {projectConfig?.statusNote || 'Project progressing per current phase priorities.'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 32, flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: healthColor, lineHeight: 1 }}>{healthScore}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: healthColor }}>{healthLabel}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Health Score</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{completionRate}%</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>Completion</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{doneTasks} / {activeTasks.length} tasks</div>
                </div>
                {daysToDelivery !== null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: daysToDelivery < 30 ? 'var(--warning)' : 'var(--text-primary)' }}>{daysToDelivery}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>Days Left</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{projectConfig?.targetDate}</div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Overall Progress</div>
              <ProgressBar value={completionRate} color={healthColor} />
            </div>
          </div>

          {/* ── Delivery KPIs ── */}
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>Delivery KPIs</div>
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <KpiCard value={completionRate + '%'} label="Task Completion" icon={Target} color="var(--accent)" bgColor="var(--accent-soft)" sub={`${doneTasks} done of ${activeTasks.length}`} />
            <KpiCard value={overdueTasks.length} label="Overdue Tasks" icon={Clock} color={overdueTasks.length > 0 ? 'var(--danger)' : 'var(--success)'} bgColor={overdueTasks.length > 0 ? 'var(--danger-bg)' : 'var(--success-bg)'} sub={overdueTasks.length > 0 ? 'Needs immediate attention' : 'All on schedule'} trend={overdueTasks.length > 0 ? 'down' : 'up'} trendLabel={overdueTasks.length > 0 ? 'Action required' : 'On track'} />
            <KpiCard value={blockedTasks} label="Blocked Tasks" icon={Shield} color={blockedTasks > 0 ? 'var(--danger)' : 'var(--success)'} bgColor={blockedTasks > 0 ? 'var(--danger-bg)' : 'var(--success-bg)'} sub={inProgressTasks + ' in progress'} />
            <KpiCard value={completedMilestones + ' / ' + milestones.length} label="Milestones Met" icon={Target} color={delayedMilestones > 0 ? 'var(--warning)' : 'var(--success)'} bgColor={delayedMilestones > 0 ? 'var(--warning-bg)' : 'var(--success-bg)'} sub={delayedMilestones > 0 ? `${delayedMilestones} delayed / at-risk` : 'All on track'} trend={delayedMilestones > 0 ? 'down' : 'up'} />
            <KpiCard value={daysToNextMilestone !== null ? daysToNextMilestone + 'd' : '—'} label="Next Milestone" icon={TrendingUp} color="var(--teal)" bgColor="var(--teal-bg)" sub={nextMilestone?.name?.slice(0, 24) || 'No upcoming milestones'} />
            <KpiCard value={workloadBurnRate + '%'} label="Workload Burn Rate" icon={Activity} color="var(--purple)" bgColor="var(--purple-bg)" sub={`${totalActual}h of ${totalEstimated}h`} trend={workloadBurnRate > completionRate + 15 ? 'down' : workloadBurnRate < completionRate - 15 ? 'up' : 'neutral'} trendLabel={workloadBurnRate > completionRate + 10 ? 'Over-spending' : workloadBurnRate < completionRate - 10 ? 'Under-spending' : 'Balanced'} />
          </div>

          {/* ── Risk & Governance KPIs ── */}
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>Risk, Issues & Governance</div>
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <KpiCard value={criticalRisks} label="Critical Risks" icon={AlertTriangle} color={criticalRisks > 0 ? 'var(--danger)' : 'var(--success)'} bgColor={criticalRisks > 0 ? 'var(--danger-bg)' : 'var(--success-bg)'} sub={`${openRisks.length} total open risks`} trend={criticalRisks > 0 ? 'down' : 'up'} />
            <KpiCard value={criticalIssues} label="Critical Issues" icon={AlertTriangle} color={criticalIssues > 0 ? 'var(--danger)' : 'var(--success)'} bgColor={criticalIssues > 0 ? 'var(--danger-bg)' : 'var(--success-bg)'} sub={`${openIssues.length} total open issues`} trend={criticalIssues > 0 ? 'down' : 'up'} />
            <KpiCard value={decisionRequired.length} label="Decisions Required" icon={Zap} color={decisionRequired.length > 0 ? 'var(--orange)' : 'var(--success)'} bgColor={decisionRequired.length > 0 ? 'var(--orange-bg)' : 'var(--success-bg)'} sub={`${pendingDecisions.length} total pending`} trend={decisionRequired.length > 0 ? 'neutral' : 'up'} />
            <KpiCard value={overdueActions.length} label="Overdue Actions" icon={Clock} color={overdueActions.length > 0 ? 'var(--warning)' : 'var(--success)'} bgColor={overdueActions.length > 0 ? 'var(--warning-bg)' : 'var(--success-bg)'} sub={`${openActions.length} total open actions`} trend={overdueActions.length > 0 ? 'down' : 'up'} />
            {budgetItems.length > 0 && (
              <KpiCard value={budgetPct + '%'} label="Budget Consumed" icon={DollarSign} color={budgetVariance > 0 ? 'var(--danger)' : 'var(--success)'} bgColor={budgetVariance > 0 ? 'var(--danger-bg)' : 'var(--success-bg)'} sub={`${totalSpent.toLocaleString()} / ${totalPlanned.toLocaleString()} EUR`} trend={budgetVariance > 0 ? 'down' : 'up'} trendLabel={budgetVariance !== 0 ? `${budgetVariance > 0 ? '+' : ''}${Math.round(budgetVariance / 1000)}k variance` : 'On budget'} />
            )}
            {openCRs > 0 && (
              <KpiCard value={openCRs} label="Open Change Requests" icon={TrendingUp} color="var(--purple)" bgColor="var(--purple-bg)" sub="Pending review" />
            )}
          </div>

          {/* ── Charts ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Task Burndown & Trajectory */}
            <div style={{ gridColumn: '1 / -1' }}>
              <BurndownCard
                tasks={tasks}
                config={projectConfig}
                milestones={milestones}
                height={240}
              />
            </div>

            <div className="card">
              <div className="card-header">
                <Activity size={16} color="var(--accent)" />
                <span className="section-title">Project Health Radar</span>
                <span className="badge" style={{ marginLeft: 'auto', background: `${healthColor}22`, color: healthColor, borderColor: `${healthColor}44` }}>{healthScore}/100</span>
              </div>
              <div style={{ height: 280, padding: '8px 16px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                    <Radar name="Health" dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Task Status Distribution (Donut + Side Legend - No Cropped Labels) ── */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <LayoutGrid size={16} color="var(--accent)" />
                  <span className="section-title">Task Status Distribution</span>
                </div>
                <span className="badge" style={{ marginLeft: 'auto', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  {activeTasks.length} active tasks
                </span>
              </div>
              {activeTasks.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <CheckSquare size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <div style={{ fontSize: 13, fontWeight: 500 }}>No active tasks in this project</div>
                </div>
              ) : (
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flex: 1, minHeight: 250 }}>
                  {/* Donut Chart with Center Metric */}
                  <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="value"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={74}
                          paddingAngle={3}
                          cornerRadius={4}
                          stroke="var(--bg-card)"
                          strokeWidth={2}
                        >
                          {statusData.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: number, name: string) => [
                            `${val} task${val > 1 ? 's' : ''} (${Math.round((val / activeTasks.length) * 100)}%)`,
                            name,
                          ]}
                          contentStyle={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            fontSize: 12,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Centered Total */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                        {activeTasks.length}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>
                        Tasks
                      </div>
                    </div>
                  </div>

                  {/* Structured Status Legend */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {statusData.map((item) => (
                      <div
                        key={item.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span
                            style={{
                              width: 9,
                              height: 9,
                              borderRadius: '50%',
                              background: item.color,
                              flexShrink: 0,
                              boxShadow: `0 0 6px ${item.color}66`,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: 'var(--text-primary)',
                            }}
                            className="truncate"
                          >
                            {item.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {item.value}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              background: 'var(--bg-hover)',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                          >
                            {Math.round((item.value / activeTasks.length) * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Open Tasks by Priority ── */}
            <div className="card">
              <div className="card-header">
                <AlertTriangle size={16} color="var(--accent)" />
                <span className="section-title">Open Tasks by Priority</span>
              </div>
              <div style={{ height: 240, padding: '8px 16px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={60} />
                    <Bar dataKey="Tasks" radius={[0, 4, 4, 0]}>
                      {priorityData.map((d) => (
                        <Cell key={d.name} fill={d.name === 'critical' ? '#dc2626' : d.name === 'high' ? '#f97316' : d.name === 'medium' ? '#fbbf24' : '#4f8ef7'} />
                      ))}
                    </Bar>
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Risk Severity Breakdown (Donut + Side Legend - No Cropped Labels) ── */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} color={criticalRisks > 0 ? 'var(--danger)' : highRisks > 0 ? 'var(--warning)' : 'var(--accent)'} />
                  <span className="section-title">Risk Severity Breakdown</span>
                </div>
                <span
                  className={`badge ${criticalRisks > 0 ? 'priority-critical' : highRisks > 0 ? 'priority-high' : 'status-done'}`}
                  style={{ marginLeft: 'auto' }}
                >
                  {openRisks.length} open
                </span>
              </div>
              {openRisks.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Shield size={32} color="var(--success)" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>No Open Risks</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>All identified risks are resolved or mitigated</div>
                </div>
              ) : (
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flex: 1, minHeight: 240 }}>
                  {/* Donut Chart with Center Metric */}
                  <div style={{ position: 'relative', width: 150, height: 150, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskChartData}
                          dataKey="value"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={46}
                          outerRadius={68}
                          paddingAngle={3}
                          cornerRadius={4}
                          stroke="var(--bg-card)"
                          strokeWidth={2}
                        >
                          {riskChartData.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: number, name: string) => [
                            `${val} risk${val > 1 ? 's' : ''} (${Math.round((val / openRisks.length) * 100)}%)`,
                            name,
                          ]}
                          contentStyle={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            fontSize: 12,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Centered Total */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                        {openRisks.length}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>
                        Open
                      </div>
                    </div>
                  </div>

                  {/* Structured Severity Legend */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {riskChartData.map((item) => (
                      <div
                        key={item.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span
                            style={{
                              width: 9,
                              height: 9,
                              borderRadius: '50%',
                              background: item.color,
                              flexShrink: 0,
                              boxShadow: `0 0 6px ${item.color}66`,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: 'var(--text-primary)',
                            }}
                            className="truncate"
                          >
                            {item.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {item.value}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              background: 'var(--bg-hover)',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                          >
                            {Math.round((item.value / openRisks.length) * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Budget Overview (if configured) ── */}
            {budgetChartData.length > 0 && (
              <div className="card" style={{ gridColumn: '1 / -1', padding: 0, overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} color="var(--success)" />
                    <span className="section-title">Financial & Budget Overview</span>
                  </div>
                  <span className={`badge ${budgetVariance > 0 ? 'priority-high' : 'status-done'}`} style={{ marginLeft: 'auto' }}>
                    {budgetVariance >= 0 ? '+' : ''}{Math.round(budgetVariance / 1000)}k variance ({budgetPct}% consumed)
                  </span>
                </div>
                <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 360px', height: 220, minWidth: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={budgetChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                          {budgetChartData.map((_, i) => (
                            <Cell key={i} fill={i === 0 ? '#4f8ef7' : i === 1 ? '#22c55e' : budgetVariance > 0 ? '#dc2626' : '#7c6af7'} />
                          ))}
                        </Bar>
                        <Tooltip formatter={(v: number) => [fmt(v), 'Amount']} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: '1 1 240px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Planned</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#4f8ef7', marginTop: 4 }}>{fmt(totalPlanned)}</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spent to Date</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#22c55e', marginTop: 4 }}>{fmt(totalSpent)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{budgetPct}% of planned</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Forecast</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{fmt(totalForecast)}</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Variance</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: budgetVariance > 0 ? 'var(--danger)' : 'var(--success)', marginTop: 4 }}>
                        {budgetVariance >= 0 ? '+' : ''}{fmt(budgetVariance)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Milestone Delivery Gates & Completion Roadmap (Executive Replacement for Histogram) ── */}
            <div className="card" style={{ gridColumn: '1 / -1', padding: 0, overflow: 'hidden' }}>
              <div className="card-header" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
                <div className="flex items-center gap-2">
                  <Target size={16} color="var(--accent)" />
                  <span className="section-title">Milestone Delivery Gates & Completion Roadmap</span>
                </div>
                <div className="flex items-center gap-2" style={{ marginLeft: 'auto', flexWrap: 'wrap' }}>
                  <span className="badge status-done" style={{ fontWeight: 700 }}>
                    {milestoneStats.completed}/{milestoneStats.total} Completed ({milestoneStats.completionPct}%)
                  </span>
                  {milestoneStats.inProgress > 0 && (
                    <span className="badge status-in-progress">{milestoneStats.inProgress} In Progress</span>
                  )}
                  {milestoneStats.atRisk > 0 && (
                    <span className="badge status-waiting">{milestoneStats.atRisk} At Risk</span>
                  )}
                  {milestoneStats.delayed > 0 && (
                    <span className="badge status-blocked">{milestoneStats.delayed} Delayed</span>
                  )}
                </div>
              </div>

              {milestoneStats.total === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Target size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>No Milestones Configured</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Add project milestones in the Milestones tab to track delivery gates and completion status.</div>
                </div>
              ) : (
                <>
                  {/* Health Ribbon & Next Delivery Target */}
                  <div style={{ padding: '12px 20px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Delivery Completion Health:</span>
                        <span style={{ fontWeight: 700, color: milestoneStats.avgProgress >= 70 ? 'var(--success)' : milestoneStats.avgProgress >= 40 ? 'var(--accent)' : 'var(--warning)' }}>
                          {milestoneStats.avgProgress}% Average Progress
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {nextMilestone ? (
                          <span>
                            Next Gate: <strong style={{ color: 'var(--text-primary)' }}>{nextMilestone.name}</strong> ({nextMilestone.targetDate}
                            {daysToNextMilestone !== null && (
                              <span style={{ color: daysToNextMilestone < 0 ? 'var(--danger)' : daysToNextMilestone <= 7 ? 'var(--warning)' : 'var(--accent)', fontWeight: 600 }}>
                                {' '}· {daysToNextMilestone < 0 ? `${Math.abs(daysToNextMilestone)}d overdue` : `${daysToNextMilestone}d left`}
                              </span>
                            )})
                          </span>
                        ) : (
                          <span>All active milestones reached</span>
                        )}
                      </div>
                    </div>
                    {/* Multi-segment status bar */}
                    <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-hover)', display: 'flex', overflow: 'hidden' }}>
                      <div style={{ width: `${(milestoneStats.completed / milestoneStats.total) * 100}%`, background: '#22c55e', transition: 'width 0.4s ease' }} title={`Completed: ${milestoneStats.completed}`} />
                      <div style={{ width: `${(milestoneStats.inProgress / milestoneStats.total) * 100}%`, background: '#4f8ef7', transition: 'width 0.4s ease' }} title={`In Progress: ${milestoneStats.inProgress}`} />
                      <div style={{ width: `${(milestoneStats.atRisk / milestoneStats.total) * 100}%`, background: '#fbbf24', transition: 'width 0.4s ease' }} title={`At Risk: ${milestoneStats.atRisk}`} />
                      <div style={{ width: `${(milestoneStats.delayed / milestoneStats.total) * 100}%`, background: '#ef4444', transition: 'width 0.4s ease' }} title={`Delayed: ${milestoneStats.delayed}`} />
                      <div style={{ width: `${(milestoneStats.planned / milestoneStats.total) * 100}%`, background: '#64748b', transition: 'width 0.4s ease' }} title={`Planned: ${milestoneStats.planned}`} />
                    </div>
                  </div>

                  {/* Chronological Gate Stepper Pipeline */}
                  <div style={{ padding: '24px 20px', overflowX: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: sortedMilestones.length > 3 ? `${sortedMilestones.length * 170}px` : '100%', position: 'relative' }}>
                      {sortedMilestones.map((m, idx) => {
                        const isLast = idx === sortedMilestones.length - 1;
                        const isCompleted = m.status === 'completed' || m.progress === 100;
                        const isDelayed = m.status === 'delayed';
                        const isAtRisk = m.status === 'at-risk';
                        const isInProgress = m.status === 'in-progress';
                        const diff = m.targetDate ? differenceInDays(parseISO(m.targetDate), new Date()) : null;
                        const isLate = diff !== null && diff < 0 && !isCompleted;

                        const nodeColor = isCompleted
                          ? '#22c55e'
                          : isDelayed || isLate
                          ? '#ef4444'
                          : isAtRisk
                          ? '#f59e0b'
                          : isInProgress
                          ? '#4f8ef7'
                          : '#64748b';

                        const nodeBg = isCompleted
                          ? 'rgba(34, 197, 94, 0.15)'
                          : isDelayed || isLate
                          ? 'rgba(239, 68, 68, 0.15)'
                          : isAtRisk
                          ? 'rgba(245, 158, 11, 0.15)'
                          : isInProgress
                          ? 'rgba(79, 142, 247, 0.15)'
                          : 'var(--bg-surface)';

                        return (
                          <div
                            key={m.id}
                            style={{
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              position: 'relative',
                              padding: '0 8px',
                            }}
                          >
                            {/* Connector Line to next node */}
                            {!isLast && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 15,
                                  left: '50%',
                                  width: '100%',
                                  height: 3,
                                  background: isCompleted ? '#22c55e' : isInProgress ? 'linear-gradient(90deg, #4f8ef7, var(--border))' : 'var(--border)',
                                  zIndex: 1,
                                }}
                              />
                            )}

                            {/* Gate Node Circle */}
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: nodeBg,
                                border: `2px solid ${nodeColor}`,
                                color: nodeColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 2,
                                boxShadow: isInProgress ? `0 0 10px ${nodeColor}88` : undefined,
                                marginBottom: 10,
                                fontSize: 12,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {isCompleted ? (
                                <Check size={16} strokeWidth={2.5} />
                              ) : isDelayed || isLate ? (
                                <AlertTriangle size={14} />
                              ) : isAtRisk ? (
                                <AlertTriangle size={14} />
                              ) : isInProgress ? (
                                <Clock size={14} />
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </div>

                            {/* Gate Title */}
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                maxWidth: 150,
                                lineHeight: 1.3,
                                marginBottom: 4,
                              }}
                              title={m.name}
                              className="truncate"
                            >
                              {m.name}
                            </div>

                            {/* Date & Countdown */}
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                              {m.targetDate || 'TBD'}
                              {diff !== null && (
                                <div
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 10,
                                    marginTop: 1,
                                    color: isCompleted
                                      ? 'var(--success)'
                                      : diff < 0
                                      ? 'var(--danger)'
                                      : diff <= 7
                                      ? 'var(--warning)'
                                      : 'var(--text-secondary)',
                                  }}
                                >
                                  {isCompleted
                                    ? 'Completed'
                                    : diff < 0
                                    ? `${Math.abs(diff)}d overdue`
                                    : diff === 0
                                    ? 'Due today'
                                    : `in ${diff}d`}
                                </div>
                              )}
                            </div>

                            {/* Mini Progress Bar */}
                            <div style={{ width: '85%', maxWidth: 120 }}>
                              <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-hover)', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${m.progress}%`,
                                    background: nodeColor,
                                    borderRadius: 3,
                                    transition: 'width 0.4s ease',
                                  }}
                                />
                              </div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: nodeColor, marginTop: 3 }}>
                                {m.progress}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detailed Milestone Status & Ownership Cards */}
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Layers size={14} />
                      <span>Detailed Milestone Status & Ownership</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                      {sortedMilestones.map(m => {
                        const diff = m.targetDate ? differenceInDays(parseISO(m.targetDate), new Date()) : null;
                        const isDone = m.status === 'completed' || m.progress === 100;
                        const isLate = diff !== null && diff < 0 && !isDone;
                        return (
                          <div
                            key={m.id}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-md)',
                              padding: '12px 14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                              borderLeft: `3px solid ${isDone ? 'var(--success)' : isLate || m.status === 'delayed' ? 'var(--danger)' : m.status === 'at-risk' ? 'var(--warning)' : m.status === 'in-progress' ? 'var(--accent)' : 'var(--border)'}`,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.3, flex: 1 }}>
                                {m.name}
                              </div>
                              <MilestoneBadge status={m.status} />
                            </div>
                            {m.description && (
                              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }} className="truncate">
                                {m.description}
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                              <div className="flex items-center gap-1.5">
                                {m.owner ? <Avatar name={m.owner} size={18} /> : <User size={12} />}
                                <span>{m.owner || 'Unassigned'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar size={12} />
                                <span>{m.targetDate || 'No date'}</span>
                                {diff !== null && (
                                  <span style={{ fontWeight: 600, color: isDone ? 'var(--success)' : isLate ? 'var(--danger)' : diff <= 7 ? 'var(--warning)' : 'var(--text-muted)' }}>
                                    ({isDone ? 'Done' : diff < 0 ? `${Math.abs(diff)}d late` : `${diff}d`})
                                  </span>
                                )}
                              </div>
                            </div>
                            <ProgressBar
                              value={m.progress}
                              color={m.status === 'delayed' || isLate ? 'var(--danger)' : m.status === 'at-risk' ? 'var(--warning)' : m.status === 'completed' ? 'var(--success)' : undefined}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Slide Builder */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Controls */}
          <div className="card" style={{ padding: 16 }}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Include slides:</div>
                <div className="flex items-center gap-3 flex-wrap">
                  {slideDefs.map(({ key, num, title }) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={includeSections[key]} onChange={e => setIncludeSections(prev => ({ ...prev, [key]: e.target.checked }))} />
                      <span style={{ color: includeSections[key] ? 'var(--text-primary)' : 'var(--text-muted)' }}>{num}. {title}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2" style={{ flexShrink: 0 }}>
                <button className="btn btn-primary btn-sm" onClick={handleExportAllPng} disabled={exportingAll}>
                  {exportingAll ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Image size={14} />}
                  {exportingAll ? 'Exporting…' : 'Export All as PNG'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleDownloadMarkdown}>
                  <FileText size={14} /> Download .md
                </button>
              </div>
            </div>
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--accent)' }}>💡 How to use:</strong> Click <strong>"Copy Image"</strong> on any slide to copy it as a PNG → paste directly into PowerPoint, Google Slides, Teams or any app. Use <strong>"Export All as PNG"</strong> to download all selected slides stitched into one image.
            </div>
          </div>

          {/* ── Slide 1: Status ── */}
          {includeSections.status && (
            <SlideWrapper slideNum={1} title="Project Status & Progress" exportRef={slideRefs[0]}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start' }}>
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{projectConfig?.name || 'Project Name'}</h2>
                      <StatusBadge status={projectConfig?.status || 'on-track'} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {projectConfig?.code && <><strong>Code:</strong> {projectConfig.code} · </>}
                      <strong>Phase:</strong> {projectConfig?.currentPhase || 'Execution'} · <strong>Manager:</strong> {projectConfig?.manager || 'Lead'} · <strong>As of:</strong> {todayFormatted}
                    </div>
                  </div>
                  {projectConfig?.statusNote && (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--accent)' }}>
                      {projectConfig.statusNote}
                    </p>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Task Completion', value: completionRate + '%', sub: `${doneTasks}/${activeTasks.length} done`, color: 'var(--accent)' },
                      { label: 'Overdue Tasks', value: overdueTasks.length, sub: 'needs attention', color: overdueTasks.length > 0 ? 'var(--danger)' : 'var(--success)' },
                      { label: 'Blocked Tasks', value: blockedTasks, sub: `${inProgressTasks} in progress`, color: blockedTasks > 0 ? 'var(--danger)' : 'var(--success)' },
                      { label: 'Milestones Met', value: `${completedMilestones}/${milestones.length}`, sub: delayedMilestones > 0 ? `${delayedMilestones} delayed` : 'on track', color: delayedMilestones > 0 ? 'var(--warning)' : 'var(--success)' },
                      { label: 'Open Issues', value: openIssues.length, sub: `${criticalIssues} critical`, color: criticalIssues > 0 ? 'var(--danger)' : 'var(--success)' },
                      { label: 'Workload Burn', value: workloadBurnRate + '%', sub: `${totalActual}h / ${totalEstimated}h`, color: 'var(--purple)' },
                    ].map(kpi => (
                      <div key={kpi.label} style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', borderTop: `3px solid ${kpi.color}` }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{kpi.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{kpi.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ width: 120, textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: healthColor, lineHeight: 1 }}>{healthScore}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: healthColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{healthLabel}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Health Score</div>
                  {daysToDelivery !== null && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: daysToDelivery < 30 ? 'var(--warning)' : 'var(--text-primary)', lineHeight: 1 }}>{daysToDelivery}d</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>To Delivery</div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>Overall Progress</span><span>{completionRate}%</span>
                </div>
                <ProgressBar value={completionRate} color={healthColor} />
              </div>

              {activeTasks.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <BurndownCard
                    tasks={tasks}
                    config={projectConfig}
                    milestones={milestones}
                    height={180}
                    showKpis={false}
                    title="Delivery Trajectory & Burndown"
                  />
                </div>
              )}
            </SlideWrapper>
          )}

          {/* ── Slide 2: Milestones ── */}
          {includeSections.milestones && (
            <SlideWrapper slideNum={2} title="Milestones & Delivery Roadmap" exportRef={slideRefs[1]}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                {[
                  { label: 'Total', value: milestones.length, color: 'var(--text-primary)' },
                  { label: 'Completed', value: completedMilestones, color: 'var(--success)' },
                  { label: 'In Progress', value: milestones.filter(m => m.status === 'in-progress').length, color: 'var(--accent)' },
                  { label: 'Delayed / At-Risk', value: delayedMilestones, color: delayedMilestones > 0 ? 'var(--danger)' : 'var(--text-muted)' },
                  ...(daysToDelivery !== null ? [{ label: 'Days to Delivery', value: `${daysToDelivery}d`, color: daysToDelivery < 30 ? 'var(--warning)' : 'var(--text-primary)' }] : []),
                ].map(kpi => (
                  <div key={kpi.label} style={{ padding: '8px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', minWidth: 90 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {milestones.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${m.status === 'completed' ? 'var(--success)' : m.status === 'delayed' ? 'var(--danger)' : m.status === 'at-risk' ? 'var(--warning)' : 'var(--border)'}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Target: {m.targetDate || 'TBD'} · Owner: {m.owner || 'Lead'}</div>
                    </div>
                    <div style={{ width: 120, flexShrink: 0 }}>
                      <ProgressBar value={m.progress} color={m.status === 'delayed' ? 'var(--danger)' : m.status === 'at-risk' ? 'var(--warning)' : undefined} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: 'right' }}>{m.progress}%</span>
                    <MilestoneBadge status={m.status} />
                  </div>
                ))}
                {milestones.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No milestones configured.</div>}
              </div>
            </SlideWrapper>
          )}

          {/* ── Slide 3: Decisions ── */}
          {includeSections.decisions && (
            <SlideWrapper slideNum={3} title="Key Decisions & Strategic Topics" exportRef={slideRefs[2]}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                {[
                  { label: 'Total', value: decisions.length, color: 'var(--text-primary)' },
                  { label: 'Pending', value: pendingDecisions.length, color: pendingDecisions.length > 0 ? 'var(--warning)' : 'var(--text-muted)' },
                  { label: 'Decision Required', value: decisionRequired.length, color: decisionRequired.length > 0 ? 'var(--danger)' : 'var(--text-muted)' },
                  { label: 'Approved', value: decisions.filter(d => d.status === 'approved').length, color: 'var(--success)' },
                ].map(kpi => (
                  <div key={kpi.label} style={{ padding: '8px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {keyDecisions.map(d => (
                  <div key={d.id} style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', borderLeft: d.status === 'decision-required' ? '3px solid var(--danger)' : '3px solid var(--border)' }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{d.title}</span>
                      <span className="badge badge-info">{d.status}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{d.finalDecision || d.decisionRequired || d.context || 'Decision under active review.'}</p>
                    {(d.owner || d.deadline) && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {d.owner && <>Owner: {d.owner}</>}{d.deadline && <> · Deadline: {d.deadline}</>}
                      </div>
                    )}
                  </div>
                ))}
                {keyDecisions.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No key decisions recorded.</div>}
              </div>
            </SlideWrapper>
          )}

          {/* ── Slide 4: Risks ── */}
          {includeSections.risks && (
            <SlideWrapper slideNum={4} title="Top Risks & Mitigation Strategies" exportRef={slideRefs[3]}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                {['critical', 'high', 'medium', 'low'].map(sev => {
                  const count = risks.filter(r => r.severity === sev && r.status !== 'closed').length;
                  return (
                    <div key={sev} style={{ padding: '8px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', borderTop: `3px solid ${RISK_COLORS[sev]}` }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: RISK_COLORS[sev] }}>{count}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{sev}</div>
                    </div>
                  );
                })}
                <div style={{ padding: '8px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{risks.filter(r => r.status === 'closed').length}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Closed</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topRisks.map(r => (
                  <div key={r.id} style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${RISK_COLORS[r.severity] || 'var(--border)'}` }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{r.title}</span>
                      <SeverityBadge severity={r.severity} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}><strong>Mitigation:</strong> {r.mitigationStrategy || 'Assessment underway'}</div>
                    {(r.owner || r.targetResolutionDate) && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {r.owner && <>Owner: {r.owner}</>}{r.targetResolutionDate && <> · Target: {r.targetResolutionDate}</>}
                      </div>
                    )}
                  </div>
                ))}
                {topRisks.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>✓ No critical or high risks currently open.</div>}
              </div>
            </SlideWrapper>
          )}

          {/* ── Slide 5: Blockers ── */}
          {includeSections.blockers && (
            <SlideWrapper slideNum={5} title="Major Blockers & Escalations" exportRef={slideRefs[4]}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                {[
                  { label: 'Critical Issues', value: criticalIssues, color: criticalIssues > 0 ? 'var(--danger)' : 'var(--success)' },
                  { label: 'High Issues', value: issues.filter(i => i.severity === 'high' && !['resolved', 'closed'].includes(i.status)).length, color: 'var(--warning)' },
                  { label: 'Total Open', value: openIssues.length, color: 'var(--text-primary)' },
                  { label: 'Resolved', value: issues.filter(i => ['resolved', 'closed'].includes(i.status)).length, color: 'var(--success)' },
                ].map(kpi => (
                  <div key={kpi.label} style={{ padding: '8px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {majorBlockers.map(b => (
                  <div key={b.id} style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${b.severity === 'critical' ? 'var(--danger)' : 'var(--warning)'}` }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{b.title}</span>
                      <SeverityBadge severity={b.severity} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}><strong>Impact:</strong> {b.impact || 'Under assessment'}</div>
                    {b.resolutionActions && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}><strong>Action:</strong> {b.resolutionActions}</div>}
                    {b.resolutionTarget && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Target: {b.resolutionTarget}</div>}
                  </div>
                ))}
                {majorBlockers.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>✓ No critical blockers reported at this time.</div>}
              </div>
            </SlideWrapper>
          )}

          {/* ── Slide 6: Budget ── */}
          {includeSections.budget && (
            <SlideWrapper slideNum={6} title="Budget Overview" exportRef={slideRefs[5]}>
              {budgetItems.length > 0 ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
                    {[
                      { label: 'Total Planned', value: fmt(totalPlanned), color: 'var(--accent)' },
                      { label: 'Total Spent', value: fmt(totalSpent), sub: `${budgetPct}% consumed`, color: budgetPct > 90 ? 'var(--danger)' : 'var(--success)' },
                      { label: 'Forecast', value: fmt(totalForecast), color: 'var(--text-primary)' },
                      { label: 'Variance', value: `${budgetVariance >= 0 ? '+' : ''}${fmt(budgetVariance)}`, color: budgetVariance > 0 ? 'var(--danger)' : 'var(--success)', sub: budgetVariance > 0 ? 'Over budget' : 'Under budget' },
                      { label: 'Open Change Requests', value: String(openCRs), color: openCRs > 0 ? 'var(--warning)' : 'var(--text-muted)' },
                    ].map(kpi => (
                      <div key={kpi.label} style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', borderTop: `3px solid ${kpi.color}` }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.label}</div>
                        {kpi.sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{kpi.sub}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Budget Consumption</span><span>{budgetPct}%</span>
                  </div>
                  <ProgressBar value={budgetPct} color={budgetPct > 90 ? 'var(--danger)' : budgetPct > 75 ? 'var(--warning)' : 'var(--success)'} />
                </>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '20px 0' }}>No budget items recorded. Add budget entries in the Budget module.</div>
              )}
            </SlideWrapper>
          )}

          {/* ── Slide 7: Next Steps ── */}
          {includeSections.nextSteps && (
            <SlideWrapper slideNum={7} title="Next Steps & Priority Actions" exportRef={slideRefs[6]}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                {[
                  { label: 'Open Actions', value: openActions.length, color: 'var(--accent)' },
                  { label: 'Overdue', value: overdueActions.length, color: overdueActions.length > 0 ? 'var(--danger)' : 'var(--success)' },
                  { label: 'Due This Week', value: openActions.filter(a => { if (!a.dueDate) return false; const d = differenceInDays(parseISO(a.dueDate), new Date()); return d >= 0 && d <= 7; }).length, color: 'var(--warning)' },
                ].map(kpi => (
                  <div key={kpi.label} style={{ padding: '8px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {nextActions.map(a => (
                  <div key={a.id} style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'flex-start', gap: 8, borderLeft: a.dueDate && a.dueDate < today ? '3px solid var(--danger)' : '3px solid var(--border)' }}>
                    <CheckSquare size={16} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{a.action}</div>
                      <div style={{ fontSize: 11, color: a.dueDate && a.dueDate < today ? 'var(--danger)' : 'var(--text-muted)' }}>Due: {a.dueDate || 'Immediate'} · {a.owner || 'Team'}</div>
                    </div>
                  </div>
                ))}
                {nextActions.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No pending priority actions.</div>}
              </div>
            </SlideWrapper>
          )}
        </div>
      )}
    </div>
  );
}
