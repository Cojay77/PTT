import { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { useDataStore } from '../store/useDataStore';
import { ProgressBar, SeverityBadge, StatusBadge, PriorityBadge, MilestoneBadge } from '../components/ui/shared';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Printer, Download, FileText, CheckSquare, Eye, Presentation, BarChart3, Copy, Check } from 'lucide-react';
import { exportTasksToCsv, exportRaidToCsv, downloadFile } from '../utils/export';
import { projectConfigQueries } from '../db/queries';

const COLORS = ['#4f8ef7', '#7c6af7', '#f74f8e', '#f79a4f', '#4ff7a8', '#f7d14f', '#4fd9f7'];

export default function Reports() {
  const { tasks } = useTaskStore();
  const { risks, issues, milestones, actions, decisions } = useDataStore();
  const projectConfig = projectConfigQueries.get();

  const [activeTab, setActiveTab] = useState<'analytics' | 'presentation'>('analytics');
  const [copied, setCopied] = useState(false);

  // Section visibility toggles for Presentation Mode
  const [includeSections, setIncludeSections] = useState({
    status: true,
    milestones: true,
    decisions: true,
    risks: true,
    blockers: true,
    nextSteps: true,
  });

  const activeTasks = tasks.filter(t => !t.isBacklog);
  const today = new Date().toISOString().split('T')[0];

  // Task distribution
  const statusGroups = ['planned', 'in-progress', 'blocked', 'waiting', 'done', 'cancelled'].map(s => ({
    name: s, value: activeTasks.filter(t => t.status === s).length,
  })).filter(g => g.value > 0);

  // Priority distribution
  const priorityData = ['critical', 'high', 'medium', 'low'].map(p => ({
    name: p, Tasks: activeTasks.filter(t => t.priority === p && !['done', 'cancelled'].includes(t.status)).length,
  }));

  // Milestone progress
  const milestoneData = milestones.slice(0, 6).map(m => ({ name: m.name.slice(0, 18), progress: m.progress, target: 100 }));

  // Risk breakdown
  const riskData = ['critical', 'high', 'medium', 'low'].map(s => ({
    name: s, value: risks.filter(r => r.severity === s && r.status !== 'closed').length,
  })).filter(g => g.value > 0);

  // Workload
  const totalEstimated = activeTasks.reduce((s, t) => s + (t.estimatedWorkload || 0), 0);
  const totalActual = activeTasks.reduce((s, t) => s + (t.actualWorkload || 0), 0);
  const totalRemaining = activeTasks.reduce((s, t) => s + (t.remainingWorkload || 0), 0);
  const overdueTasks = activeTasks.filter(t => t.dueDate && t.dueDate < today && !['done', 'cancelled'].includes(t.status));
  const completionRate = activeTasks.length > 0 ? Math.round((activeTasks.filter(t => t.status === 'done').length / activeTasks.length) * 100) : 0;

  // Health radar
  const radarData = [
    { subject: 'Schedule', value: Math.max(0, 100 - overdueTasks.length * 15) },
    { subject: 'Resources', value: 75 },
    { subject: 'Risks', value: Math.max(0, 100 - risks.filter(r => r.severity === 'critical').length * 25 - risks.filter(r => r.severity === 'high').length * 10) },
    { subject: 'Issues', value: Math.max(0, 100 - issues.filter(i => i.severity === 'critical').length * 30 - issues.filter(i => i.severity === 'high').length * 15) },
    { subject: 'Progress', value: completionRate },
    { subject: 'Actions', value: Math.max(0, 100 - actions.filter(a => a.dueDate && a.dueDate < today && a.status !== 'done').length * 15) },
  ];

  // Executive items
  const topRisks = risks.filter(r => r.status !== 'closed' && (r.severity === 'critical' || r.severity === 'high')).slice(0, 5);
  const majorBlockers = issues.filter(i => i.status !== 'resolved' && i.status !== 'closed' && (i.severity === 'critical' || i.severity === 'high')).slice(0, 5);
  const keyDecisions = decisions.slice(0, 5);
  const nextActions = actions.filter(a => a.status !== 'done' && a.status !== 'cancelled').slice(0, 6);

  function generateMarkdownBrief(): string {
    const projName = projectConfig?.name || 'Project';
    const phase = projectConfig?.currentPhase || 'Execution';
    const status = projectConfig?.status || 'on-track';

    let md = `# ${projName} — Executive Status Report\n\n`;
    md += `**Date:** ${today} | **Current Phase:** ${phase} | **Overall Status:** ${status.toUpperCase()}\n\n`;

    if (includeSections.status) {
      md += `## 1. Project Status & Highlights\n`;
      md += `- **Completion Rate:** ${completionRate}%\n`;
      md += `- **Total Workload:** ${totalActual}h completed / ${totalEstimated}h estimated (${totalRemaining}h remaining)\n`;
      md += `- **Status Summary:** ${projectConfig?.statusNote || 'Project is progressing in accordance with current phase priorities.'}\n\n`;
    }

    if (includeSections.milestones) {
      md += `## 2. Key Milestones\n`;
      milestones.forEach(m => {
        md += `- [${m.progress}%] **${m.name}** (Target: ${m.targetDate || 'TBD'}) — Status: ${m.status}\n`;
      });
      md += '\n';
    }

    if (includeSections.decisions && keyDecisions.length > 0) {
      md += `## 3. Key Decisions\n`;
      keyDecisions.forEach(d => {
        md += `- **${d.title}** (${d.status}): ${d.finalDecision || d.context || 'Pending'}\n`;
      });
      md += '\n';
    }

    if (includeSections.risks && topRisks.length > 0) {
      md += `## 4. Top Risks & Mitigation\n`;
      topRisks.forEach(r => {
        md += `- [${r.severity.toUpperCase()}] **${r.title}**: ${r.mitigationStrategy || 'Under assessment'}\n`;
      });
      md += '\n';
    }

    if (includeSections.blockers && majorBlockers.length > 0) {
      md += `## 5. Major Blockers\n`;
      majorBlockers.forEach(b => {
        md += `- [${b.severity.toUpperCase()}] **${b.title}**: ${b.resolutionTarget || b.impact || 'Action required'}\n`;
      });
      md += '\n';
    }

    if (includeSections.nextSteps && nextActions.length > 0) {
      md += `## 6. Next Steps & Priority Actions\n`;
      nextActions.forEach(a => {
        md += `- **${a.action}** (Owner: ${a.owner || 'Unassigned'}, Due: ${a.dueDate || 'ASAP'})\n`;
      });
      md += '\n';
    }

    return md;
  }

  function handleCopyMarkdown() {
    const md = generateMarkdownBrief();
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleDownloadMarkdown() {
    const md = generateMarkdownBrief();
    downloadFile(`status-report-${today}.md`, md, 'text/markdown;charset=utf-8');
  }

  return (
    <div>
      {/* Header & Tabs */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="page-title">Reports & Presentation</h1>
          <p className="page-subtitle">Project analytics, KPI dashboards, and executive reporting mode</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="tabs" style={{ border: 'none', margin: 0 }}>
            <button
              className={`tab${activeTab === 'analytics' ? ' active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart3 size={15} style={{ marginRight: 6 }} /> Analytics & KPIs
            </button>
            <button
              className={`tab${activeTab === 'presentation' ? ' active' : ''}`}
              onClick={() => setActiveTab('presentation')}
            >
              <Presentation size={15} style={{ marginRight: 6 }} /> Presentation Mode
            </button>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => window.print()} title="Print or save as PDF">
              <Printer size={14} /> Print / PDF
            </button>
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
          {/* KPI Row */}
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-value">{completionRate}%</div>
              <div className="stat-label">Task Completion</div>
              <div style={{ marginTop: 8 }}><ProgressBar value={completionRate} /></div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalEstimated}h</div>
              <div className="stat-label">Estimated Workload</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalActual}h</div>
              <div className="stat-label">Actual Workload</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalRemaining}h</div>
              <div className="stat-label">Remaining Work</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{overdueTasks.length}</div>
              <div className="stat-label">Overdue Tasks</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{risks.filter(r => r.severity === 'critical').length}</div>
              <div className="stat-label">Critical Risks</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Health Radar */}
            <div className="card">
              <div className="card-header"><span className="section-title">Project Health Radar</span></div>
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

            {/* Task Status Distribution */}
            <div className="card">
              <div className="card-header"><span className="section-title">Task Status Distribution</span></div>
              <div style={{ height: 280, padding: '8px 16px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusGroups} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {statusGroups.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Priority breakdown */}
            <div className="card">
              <div className="card-header"><span className="section-title">Open Tasks by Priority</span></div>
              <div style={{ height: 220, padding: '8px 16px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={60} />
                    <Bar dataKey="Tasks" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Milestone progress */}
            <div className="card">
              <div className="card-header"><span className="section-title">Milestone Progress</span></div>
              <div style={{ padding: '8px 24px' }}>
                {milestones.slice(0, 6).map(m => (
                  <div key={m.id} style={{ marginBottom: 12 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontSize: 12, fontWeight: 500, flex: 1, minWidth: 0 }} className="truncate">{m.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{m.progress}%</span>
                    </div>
                    <ProgressBar value={m.progress} />
                  </div>
                ))}
                {milestones.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>No milestones</div>}
              </div>
            </div>

            {/* Risk distribution */}
            {riskData.length > 0 && (
              <div className="card">
                <div className="card-header"><span className="section-title">Risk Severity</span></div>
                <div style={{ height: 220, padding: '8px 16px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                        {riskData.map((d) => <Cell key={d.name} fill={d.name === 'critical' ? '#dc2626' : d.name === 'high' ? '#f97316' : d.name === 'medium' ? '#fbbf24' : '#22c55e'} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ============================================================
           Dedicated Reporting / Presentation Mode (Section 21)
           ============================================================ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Controls Bar */}
          <div className="card" style={{ padding: 16 }}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 flex-wrap">
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Include in Presentation:</span>
                {([
                  ['status', 'Project Status'],
                  ['milestones', 'Planning / Milestones'],
                  ['decisions', 'Key Decisions'],
                  ['risks', 'Top Risks'],
                  ['blockers', 'Blockers'],
                  ['nextSteps', 'Next Steps'],
                ] as const).map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includeSections[key]}
                      onChange={e => setIncludeSections(prev => ({ ...prev, [key]: e.target.checked }))}
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm" onClick={handleCopyMarkdown}>
                  {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />} {copied ? 'Copied!' : 'Copy Markdown'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleDownloadMarkdown}>
                  <FileText size={14} /> Download .md Brief
                </button>
              </div>
            </div>
          </div>

          {/* Presentation Document Sheet */}
          <div className="card" style={{ padding: 32, maxWidth: 960, margin: '0 auto', width: '100%', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-md)' }}>
            {/* Header */}
            <div style={{ borderBottom: '2px solid var(--border)', paddingBottom: 20, marginBottom: 24 }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{projectConfig?.name || 'Project Name'}</h2>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                    Code: <strong>{projectConfig?.code || 'PTT'}</strong> · Phase: <strong>{projectConfig?.currentPhase || 'Execution'}</strong> · Manager: <strong>{projectConfig?.manager || 'Lead'}</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <StatusBadge status={projectConfig?.status || 'on-track'} />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>As of {today}</div>
                </div>
              </div>
            </div>

            {/* Section 1: Status & Key Achievements */}
            {includeSections.status && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6, marginBottom: 12 }}>
                  1. Project Status & Progress
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
                  {projectConfig?.statusNote || 'The project is currently proceeding on track towards defined milestone commitments.'}
                </p>
                <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                  <div className="stat-card" style={{ padding: 12 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{completionRate}%</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Progress</div>
                  </div>
                  <div className="stat-card" style={{ padding: 12 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{totalActual}h / {totalEstimated}h</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Workload Spent</div>
                  </div>
                  <div className="stat-card" style={{ padding: 12 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{milestones.filter(m => m.status === 'completed').length} / {milestones.length}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Milestones Met</div>
                  </div>
                  <div className="stat-card" style={{ padding: 12 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: majorBlockers.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {majorBlockers.length}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Open Critical Issues</div>
                  </div>
                </div>
              </div>
            )}

            {/* Section 2: Milestones & Roadmap */}
            {includeSections.milestones && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6, marginBottom: 12 }}>
                  2. Milestones & Delivery Roadmap
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {milestones.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Target: {m.targetDate || 'TBD'} · Owner: {m.owner || 'Lead'}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div style={{ width: 100 }}><ProgressBar value={m.progress} /></div>
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 36 }}>{m.progress}%</span>
                        <MilestoneBadge status={m.status} />
                      </div>
                    </div>
                  ))}
                  {milestones.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No milestones configured.</div>}
                </div>
              </div>
            )}

            {/* Section 3: Current Topics & Decisions */}
            {includeSections.decisions && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6, marginBottom: 12 }}>
                  3. Key Decisions & Strategic Topics
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {keyDecisions.map(d => (
                    <div key={d.id} style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{d.title}</span>
                        <span className="badge badge-info">{d.status}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                        {d.finalDecision || d.decisionRequired || d.context || 'Decision under active review.'}
                      </p>
                    </div>
                  ))}
                  {keyDecisions.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No key decisions recorded.</div>}
                </div>
              </div>
            )}

            {/* Section 4: Top Risks */}
            {includeSections.risks && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6, marginBottom: 12 }}>
                  4. Top Risks & Mitigation Strategies
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topRisks.map(r => (
                    <div key={r.id} style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 6, borderLeft: '3px solid var(--danger)' }}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{r.title}</span>
                        <SeverityBadge severity={r.severity} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        <strong>Mitigation:</strong> {r.mitigationStrategy || 'Assessment underway'}
                      </div>
                      {r.targetResolutionDate && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                          Target resolution: {r.targetResolutionDate} · Owner: {r.owner || 'Unassigned'}
                        </div>
                      )}
                    </div>
                  ))}
                  {topRisks.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No critical or high risks currently open.</div>}
                </div>
              </div>
            )}

            {/* Section 5: Major Blockers */}
            {includeSections.blockers && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6, marginBottom: 12 }}>
                  5. Major Blockers & Escalations
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {majorBlockers.map(b => (
                    <div key={b.id} style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 6, borderLeft: '3px solid var(--warning)' }}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{b.title}</span>
                        <SeverityBadge severity={b.severity} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        <strong>Impact:</strong> {b.impact || 'Under assessment'}
                      </div>
                      {b.resolutionActions && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          <strong>Action:</strong> {b.resolutionActions}
                        </div>
                      )}
                    </div>
                  ))}
                  {majorBlockers.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No critical blockers reported.</div>}
                </div>
              </div>
            )}

            {/* Section 6: Next Steps */}
            {includeSections.nextSteps && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6, marginBottom: 12 }}>
                  6. Next Steps & Priorities
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {nextActions.map(a => (
                    <div key={a.id} style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 6, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <CheckSquare size={16} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{a.action}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Due: {a.dueDate || 'Immediate'} · {a.owner || 'Team'}</div>
                      </div>
                    </div>
                  ))}
                  {nextActions.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No pending priority actions.</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
