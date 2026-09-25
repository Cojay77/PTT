import React, { useState, useEffect, useMemo } from 'react';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  addWeeks,
  getISOWeek,
  getISOWeekYear,
} from 'date-fns';
import { useTaskStore } from '../store/useTaskStore';
import { useDataStore } from '../store/useDataStore';
import type { WeeklyReview, WeeklyReviewSnapshot, Task, Risk, Issue, Decision, Milestone, Communication } from '../types';
import {
  ClipboardCheck,
  Copy,
  Plus,
  Trash2,
  RefreshCw,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  FileText,
  TrendingUp,
  Check,
  AlertCircle,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';

function getWeekPeriod(year: number, week: number): { start: string; end: string } {
  const jan4 = new Date(year, 0, 4);
  const week1Start = startOfWeek(jan4, { weekStartsOn: 1 });
  const targetMonday = addWeeks(week1Start, week - 1);
  const targetSunday = endOfWeek(targetMonday, { weekStartsOn: 1 });
  return {
    start: format(targetMonday, 'yyyy-MM-dd'),
    end: format(targetSunday, 'yyyy-MM-dd'),
  };
}

function computeSnapshot(
  tasks: Task[],
  risks: Risk[],
  issues: Issue[],
  decisions: Decision[],
  milestones: Milestone[],
  comms: Communication[],
  periodStart: string,
  periodEnd: string
): WeeklyReviewSnapshot {
  const activeTasks = tasks.filter((t) => !t.isBacklog);

  // Completed tasks: status is done AND updated (or due) within the review period
  const completed = activeTasks.filter(
    (t) =>
      t.status === 'done' &&
      ((t.updatedAt && t.updatedAt.slice(0, 10) >= periodStart && t.updatedAt.slice(0, 10) <= periodEnd) ||
        (t.dueDate && t.dueDate >= periodStart && t.dueDate <= periodEnd))
  );

  const inProgress = activeTasks.filter((t) => t.status === 'in-progress');
  const blocked = activeTasks.filter((t) => t.status === 'blocked' || t.status === 'waiting');
  const overdue = activeTasks.filter(
    (t) => t.dueDate && t.dueDate < periodEnd && !['done', 'cancelled'].includes(t.status)
  );

  const activeR = risks.filter((r) => r.status !== 'closed');
  const criticalR = activeR.filter((r) => r.severity === 'critical');

  const openI = issues.filter((i) => ['open', 'in-progress', 'escalated'].includes(i.status));
  const criticalI = openI.filter((i) => i.severity === 'critical');

  const pendingD = decisions.filter((d) =>
    ['proposed', 'under-discussion', 'decision-required'].includes(d.status)
  );
  const upcomingM = milestones.filter(
    (m) => m.targetDate && m.targetDate >= periodStart && m.status !== 'completed'
  );
  const awaitingC = comms.filter((c) => c.status === 'awaiting-response');

  return {
    totalTasks: activeTasks.length,
    completedTasks: completed.length > 0 ? completed.length : activeTasks.filter((t) => t.status === 'done').length,
    inProgressTasks: inProgress.length,
    blockedTasks: blocked.length,
    overdueTasks: overdue.length,
    activeRisks: activeR.length,
    criticalRisks: criticalR.length,
    activeIssues: openI.length,
    criticalIssues: criticalI.length,
    pendingDecisions: pendingD.length,
    upcomingMilestones: upcomingM.length,
    awaitingCommunications: awaitingC.length,
    completedTaskTitles: completed.map((t) => t.title),
    inProgressTaskTitles: inProgress.map((t) => t.title),
    blockedTaskTitles: blocked.map(
      (t) => t.title + (t.blockingReason ? ` — Reason: ${t.blockingReason}` : '')
    ),
    openIssueTitles: openI.map((i) => `[${i.severity.toUpperCase()}] ${i.title}`),
    criticalRiskTitles: criticalR.map((r) => r.title),
    upcomingMilestoneTitles: upcomingM.map((m) => `${m.name} (target: ${m.targetDate})`),
  };
}

export default function WeeklyReviewPage() {
  const { tasks } = useTaskStore();
  const {
    weeklyReviews,
    createWeeklyReview,
    updateWeeklyReview,
    deleteWeeklyReview,
    risks,
    issues,
    decisions,
    milestones,
    communications,
  } = useDataStore();

  const now = new Date();
  const currentWeek = getISOWeek(now);
  const currentYear = getISOWeekYear(now);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'report'>('overview');
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newYear, setNewYear] = useState<number>(currentYear);
  const [newWeek, setNewWeek] = useState<number>(currentWeek);
  const [saveIndicator, setSaveIndicator] = useState<'saved' | 'saving' | 'dirty'>('saved');

  // Form state for current selected review
  const [formData, setFormData] = useState<{
    overallHealth: WeeklyReview['overallHealth'];
    status: WeeklyReview['status'];
    summary: string;
    achievements: string;
    prioritiesNextWeek: string;
    blockersNotes: string;
  }>({
    overallHealth: 'on-track',
    status: 'draft',
    summary: '',
    achievements: '',
    prioritiesNextWeek: '',
    blockersNotes: '',
  });

  // Sort reviews descending (newest first)
  const sortedReviews = useMemo(() => {
    return [...weeklyReviews].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.weekNumber - a.weekNumber;
    });
  }, [weeklyReviews]);

  // Default selection to first review or current week
  useEffect(() => {
    if (!selectedId && sortedReviews.length > 0) {
      const currentReview = sortedReviews.find(
        (r) => r.weekNumber === currentWeek && r.year === currentYear
      );
      setSelectedId(currentReview ? currentReview.id : sortedReviews[0].id);
    } else if (selectedId && !sortedReviews.find((r) => r.id === selectedId) && sortedReviews.length > 0) {
      setSelectedId(sortedReviews[0].id);
    }
  }, [sortedReviews, selectedId, currentWeek, currentYear]);

  // Current selected review object
  const currentReview = useMemo(() => {
    return weeklyReviews.find((r) => r.id === selectedId) || null;
  }, [weeklyReviews, selectedId]);

  // Parse snapshot JSON
  const currentSnapshot: WeeklyReviewSnapshot = useMemo(() => {
    if (!currentReview || !currentReview.snapshotJson) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        blockedTasks: 0,
        overdueTasks: 0,
        activeRisks: 0,
        criticalRisks: 0,
        activeIssues: 0,
        pendingDecisions: 0,
        upcomingMilestones: 0,
        awaitingCommunications: 0,
      };
    }
    try {
      return JSON.parse(currentReview.snapshotJson);
    } catch {
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        blockedTasks: 0,
        overdueTasks: 0,
        activeRisks: 0,
        criticalRisks: 0,
        activeIssues: 0,
        pendingDecisions: 0,
        upcomingMilestones: 0,
        awaitingCommunications: 0,
      };
    }
  }, [currentReview]);

  // Find previous review to calculate comparison
  const previousReview = useMemo(() => {
    if (!currentReview) return null;
    const currentIndex = sortedReviews.findIndex((r) => r.id === currentReview.id);
    if (currentIndex >= 0 && currentIndex < sortedReviews.length - 1) {
      return sortedReviews[currentIndex + 1];
    }
    return null;
  }, [currentReview, sortedReviews]);

  const previousSnapshot: WeeklyReviewSnapshot | null = useMemo(() => {
    if (!previousReview || !previousReview.snapshotJson) return null;
    try {
      return JSON.parse(previousReview.snapshotJson);
    } catch {
      return null;
    }
  }, [previousReview]);

  // Sync form data when selection changes
  useEffect(() => {
    if (currentReview) {
      setFormData({
        overallHealth: currentReview.overallHealth,
        status: currentReview.status,
        summary: currentReview.summary || '',
        achievements: currentReview.achievements || '',
        prioritiesNextWeek: currentReview.prioritiesNextWeek || '',
        blockersNotes: currentReview.blockersNotes || '',
      });
      setSaveIndicator('saved');
    }
  }, [currentReview?.id]);

  // Check if current week has a review
  const hasCurrentWeekReview = useMemo(() => {
    return weeklyReviews.some((r) => r.weekNumber === currentWeek && r.year === currentYear);
  }, [weeklyReviews, currentWeek, currentYear]);

  // Quick action: start current week review
  const handleStartCurrentWeek = () => {
    const existing = weeklyReviews.find(
      (r) => r.weekNumber === currentWeek && r.year === currentYear
    );
    if (existing) {
      setSelectedId(existing.id);
      return;
    }
    const period = getWeekPeriod(currentYear, currentWeek);
    const snap = computeSnapshot(
      tasks,
      risks,
      issues,
      decisions,
      milestones,
      communications,
      period.start,
      period.end
    );
    const newRev = createWeeklyReview({
      weekNumber: currentWeek,
      year: currentYear,
      periodStart: period.start,
      periodEnd: period.end,
      status: 'draft',
      overallHealth: 'on-track',
      summary: '',
      achievements: '',
      prioritiesNextWeek: '',
      blockersNotes: '',
      snapshotJson: JSON.stringify(snap),
    });
    setSelectedId(newRev.id);
  };

  // Create review for chosen week
  const handleCreateCustomWeek = (e: React.FormEvent) => {
    e.preventDefault();
    const existing = weeklyReviews.find(
      (r) => r.weekNumber === newWeek && r.year === newYear
    );
    if (existing) {
      setSelectedId(existing.id);
      setIsModalOpen(false);
      return;
    }
    const period = getWeekPeriod(newYear, newWeek);
    const snap = computeSnapshot(
      tasks,
      risks,
      issues,
      decisions,
      milestones,
      communications,
      period.start,
      period.end
    );
    const newRev = createWeeklyReview({
      weekNumber: newWeek,
      year: newYear,
      periodStart: period.start,
      periodEnd: period.end,
      status: 'draft',
      overallHealth: 'on-track',
      summary: '',
      achievements: '',
      prioritiesNextWeek: '',
      blockersNotes: '',
      snapshotJson: JSON.stringify(snap),
    });
    setSelectedId(newRev.id);
    setIsModalOpen(false);
  };

  // Save current review form
  const handleSave = () => {
    if (!currentReview) return;
    setSaveIndicator('saving');
    updateWeeklyReview(currentReview.id, {
      overallHealth: formData.overallHealth,
      status: formData.status,
      summary: formData.summary,
      achievements: formData.achievements,
      prioritiesNextWeek: formData.prioritiesNextWeek,
      blockersNotes: formData.blockersNotes,
    });
    setTimeout(() => {
      setSaveIndicator('saved');
    }, 300);
  };

  // Refresh live snapshot metrics
  const handleRefreshLiveMetrics = () => {
    if (!currentReview) return;
    const snap = computeSnapshot(
      tasks,
      risks,
      issues,
      decisions,
      milestones,
      communications,
      currentReview.periodStart,
      currentReview.periodEnd
    );
    updateWeeklyReview(currentReview.id, {
      snapshotJson: JSON.stringify(snap),
    });
    setSaveIndicator('saved');
  };

  // Toggle review status (draft vs completed)
  const handleToggleStatus = () => {
    if (!currentReview) return;
    const nextStatus = formData.status === 'completed' ? 'draft' : 'completed';
    setFormData((prev) => ({ ...prev, status: nextStatus }));
    updateWeeklyReview(currentReview.id, { status: nextStatus });
  };

  // Delete review
  const handleDelete = () => {
    if (!currentReview) return;
    if (window.confirm(`Delete Weekly Review for Week ${currentReview.weekNumber}, ${currentReview.year}?`)) {
      deleteWeeklyReview(currentReview.id);
      setSelectedId(null);
    }
  };

  // Generate markdown report
  const reportMarkdown = useMemo(() => {
    if (!currentReview) return '';
    return `# Weekly Status Report — Week ${currentReview.weekNumber}, ${currentReview.year}
**Period:** ${currentReview.periodStart} to ${currentReview.periodEnd}
**Project Health:** ${formData.overallHealth.toUpperCase()}
**Status:** ${formData.status.toUpperCase()}

---

## 📊 Executive Summary
${formData.summary || '*(No executive summary recorded)*'}

## 🎯 Key Achievements
${formData.achievements || '*(No achievements logged)*'}

## 📈 Weekly Metrics & Snapshot
- **Tasks Completed:** ${currentSnapshot.completedTasks}
- **Tasks In Progress:** ${currentSnapshot.inProgressTasks}
- **Blocked Tasks:** ${currentSnapshot.blockedTasks}
- **Overdue Tasks:** ${currentSnapshot.overdueTasks}
- **Active Issues:** ${currentSnapshot.activeIssues} (${currentSnapshot.criticalIssues || 0} critical)
- **Active Risks:** ${currentSnapshot.activeRisks} (${currentSnapshot.criticalRisks || 0} critical)
- **Pending Decisions:** ${currentSnapshot.pendingDecisions}
- **Upcoming Milestones:** ${currentSnapshot.upcomingMilestones}
- **Communications Awaiting Response:** ${currentSnapshot.awaitingCommunications}

${
  currentSnapshot.completedTaskTitles?.length
    ? `### ✅ Completed Deliverables\n${currentSnapshot.completedTaskTitles
        .map((t) => `- ${t}`)
        .join('\n')}\n`
    : ''
}
${
  currentSnapshot.blockedTaskTitles?.length
    ? `### 🚫 Blocked Items\n${currentSnapshot.blockedTaskTitles
        .map((t) => `- ${t}`)
        .join('\n')}\n`
    : ''
}
${
  currentSnapshot.openIssueTitles?.length
    ? `### ⚠️ Open Issues\n${currentSnapshot.openIssueTitles
        .map((t) => `- ${t}`)
        .join('\n')}\n`
    : ''
}

## 🚀 Priorities for Next Week
${formData.prioritiesNextWeek || '*(No priorities defined)*'}

## 🛑 Blockers & Items Requiring Escalation
${formData.blockersNotes || '*(None reported)*'}

---
*Generated by Project Tracking Tool · ${format(new Date(), 'MMMM d, yyyy HH:mm')}*
`;
  }, [currentReview, formData, currentSnapshot]);

  const handleCopyReport = () => {
    navigator.clipboard.writeText(reportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getHealthBadge = (health: WeeklyReview['overallHealth']) => {
    switch (health) {
      case 'on-track':
        return <span className="weekly-health-pill health-on-track">● On Track</span>;
      case 'at-risk':
        return <span className="weekly-health-pill health-at-risk">▲ At Risk</span>;
      case 'off-track':
        return <span className="weekly-health-pill health-off-track">✕ Off Track</span>;
      default:
        return null;
    }
  };

  return (
    <div className="weekly-review-page">
      {/* Top Page Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Weekly Reviews</h1>
            <span className="badge badge-primary">{sortedReviews.length} weeks archived</span>
          </div>
          <p className="page-subtitle">
            Maintain consistent weekly project health checks, review progress, track blockers, and export reports for stakeholders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!hasCurrentWeekReview && (
            <button className="btn btn-primary" onClick={handleStartCurrentWeek}>
              <Plus size={15} /> Review Current Week (W{currentWeek})
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setIsModalOpen(true)}>
            <Calendar size={15} /> + New Review for Any Week...
          </button>
        </div>
      </div>

      {/* Main 2-Column Master-Detail Layout */}
      <div className="weekly-review-container">
        {/* Left Sidebar: Week History List */}
        <div className="weekly-review-sidebar card">
          <div className="card-header flex items-center justify-between" style={{ padding: '14px 16px' }}>
            <div className="flex items-center gap-2 font-semibold" style={{ fontSize: 13 }}>
              <Clock size={15} color="var(--accent)" />
              <span>Review Archive</span>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setIsModalOpen(true)}
              title="Add a review for another week"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          <div className="weekly-review-list">
            {!hasCurrentWeekReview && (
              <div
                className="weekly-current-prompt"
                onClick={handleStartCurrentWeek}
                title="Click to start reviewing current week"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={14} color="var(--accent)" />
                  <strong style={{ fontSize: 13, color: 'var(--accent)' }}>
                    Week {currentWeek} (Current)
                  </strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  No review started yet for this week.
                </div>
                <div className="weekly-start-btn-link">+ Start Review Now</div>
              </div>
            )}

            {sortedReviews.length === 0 ? (
              <div className="weekly-empty-list">
                <FileText size={28} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: 8 }} />
                <p>No reviews created yet.</p>
                <button className="btn btn-primary btn-sm mt-2" onClick={handleStartCurrentWeek}>
                  Create Week {currentWeek} Review
                </button>
              </div>
            ) : (
              sortedReviews.map((rev) => {
                const isSelected = rev.id === selectedId;
                const isCurrent = rev.weekNumber === currentWeek && rev.year === currentYear;
                let snap: WeeklyReviewSnapshot | null = null;
                try {
                  snap = JSON.parse(rev.snapshotJson || '{}');
                } catch {
                  snap = null;
                }

                return (
                  <div
                    key={rev.id}
                    className={`weekly-list-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedId(rev.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="weekly-item-title">
                          Week {rev.weekNumber}
                        </span>
                        <span className="weekly-item-year">· {rev.year}</span>
                        {isCurrent && <span className="weekly-tag-current">Current</span>}
                      </div>
                      <span className={`weekly-status-tag status-${rev.status}`}>
                        {rev.status === 'completed' ? '✓ Completed' : 'Draft'}
                      </span>
                    </div>

                    <div className="weekly-item-period">
                      {rev.periodStart} → {rev.periodEnd}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      {getHealthBadge(rev.overallHealth)}
                      {snap && (
                        <div className="weekly-item-metrics">
                          <span title="Completed tasks">✓ {snap.completedTasks}</span>
                          {snap.blockedTasks > 0 && (
                            <span className="blocked-count" title="Blocked tasks">
                              ⚠ {snap.blockedTasks}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Main Pane: Active Review Editor & Snapshot */}
        <div className="weekly-review-main">
          {currentReview ? (
            <div>
              {/* Review Main Header Card */}
              <div className="card mb-4 weekly-header-card">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h2 className="weekly-main-title">
                        Week {currentReview.weekNumber} Review ({currentReview.year})
                      </h2>
                      <span className={`badge ${formData.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                        {formData.status === 'completed' ? 'Completed Review' : 'Draft in Progress'}
                      </span>
                      {currentReview.weekNumber === currentWeek && currentReview.year === currentYear && (
                        <span className="badge badge-accent">Current Week</span>
                      )}
                    </div>
                    <div className="weekly-period-subtitle">
                      <Calendar size={14} color="var(--text-muted)" />
                      <span>
                        Period: <strong>{currentReview.periodStart}</strong> to <strong>{currentReview.periodEnd}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions Header Bar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={handleRefreshLiveMetrics}
                      title="Update snapshot with current project data"
                    >
                      <RefreshCw size={13} /> Sync Live Data
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleCopyReport}
                      title="Copy complete status report formatted in Markdown"
                    >
                      {copied ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
                      {copied ? 'Copied!' : 'Copy Markdown'}
                    </button>
                    <button
                      className={`btn btn-sm ${formData.status === 'completed' ? 'btn-ghost' : 'btn-success'}`}
                      onClick={handleToggleStatus}
                    >
                      <CheckCircle2 size={13} />
                      {formData.status === 'completed' ? 'Mark as Draft' : 'Complete Review'}
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleSave}
                      title="Save modifications"
                    >
                      {saveIndicator === 'saving' ? 'Saving...' : saveIndicator === 'saved' ? 'Saved' : 'Save'}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={handleDelete}
                      title="Delete this weekly review"
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Health Selector & Quick Controls */}
                <div className="weekly-controls-bar">
                  <div className="flex items-center gap-3">
                    <span className="weekly-control-label">Project Health:</span>
                    <div className="weekly-health-selector">
                      <button
                        type="button"
                        className={`health-btn on-track ${formData.overallHealth === 'on-track' ? 'active' : ''}`}
                        onClick={() => {
                          setFormData((f) => ({ ...f, overallHealth: 'on-track' }));
                          setSaveIndicator('dirty');
                        }}
                      >
                        ● On Track
                      </button>
                      <button
                        type="button"
                        className={`health-btn at-risk ${formData.overallHealth === 'at-risk' ? 'active' : ''}`}
                        onClick={() => {
                          setFormData((f) => ({ ...f, overallHealth: 'at-risk' }));
                          setSaveIndicator('dirty');
                        }}
                      >
                        ▲ At Risk
                      </button>
                      <button
                        type="button"
                        className={`health-btn off-track ${formData.overallHealth === 'off-track' ? 'active' : ''}`}
                        onClick={() => {
                          setFormData((f) => ({ ...f, overallHealth: 'off-track' }));
                          setSaveIndicator('dirty');
                        }}
                      >
                        ✕ Off Track
                      </button>
                    </div>
                  </div>

                  {saveIndicator === 'dirty' && (
                    <div className="weekly-unsaved-badge">
                      Unsaved changes — click <strong>Save</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* KPI Snapshot Cards */}
              <div className="weekly-snapshot-grid">
                <div className="weekly-stat-card card">
                  <div className="weekly-stat-icon-wrapper success">
                    <ClipboardCheck size={20} color="var(--success)" />
                  </div>
                  <div className="weekly-stat-info">
                    <span className="weekly-stat-number">{currentSnapshot.completedTasks}</span>
                    <span className="weekly-stat-label">Tasks Completed</span>
                  </div>
                </div>

                <div className="weekly-stat-card card">
                  <div className="weekly-stat-icon-wrapper info">
                    <Clock size={20} color="var(--info)" />
                  </div>
                  <div className="weekly-stat-info">
                    <span className="weekly-stat-number">{currentSnapshot.inProgressTasks}</span>
                    <span className="weekly-stat-label">In Progress</span>
                  </div>
                </div>

                <div className="weekly-stat-card card">
                  <div className={`weekly-stat-icon-wrapper ${currentSnapshot.blockedTasks > 0 ? 'danger' : 'neutral'}`}>
                    <AlertCircle size={20} color={currentSnapshot.blockedTasks > 0 ? 'var(--danger)' : 'var(--text-muted)'} />
                  </div>
                  <div className="weekly-stat-info">
                    <span className="weekly-stat-number" style={{ color: currentSnapshot.blockedTasks > 0 ? 'var(--danger)' : undefined }}>
                      {currentSnapshot.blockedTasks}
                    </span>
                    <span className="weekly-stat-label">Blocked / Waiting</span>
                  </div>
                </div>

                <div className="weekly-stat-card card">
                  <div className={`weekly-stat-icon-wrapper ${currentSnapshot.activeIssues > 0 || currentSnapshot.criticalRisks > 0 ? 'warning' : 'neutral'}`}>
                    <AlertTriangle size={20} color="var(--warning)" />
                  </div>
                  <div className="weekly-stat-info">
                    <span className="weekly-stat-number">{currentSnapshot.activeIssues + currentSnapshot.activeRisks}</span>
                    <span className="weekly-stat-label">
                      {currentSnapshot.activeIssues} Issues · {currentSnapshot.activeRisks} Risks
                    </span>
                  </div>
                </div>

                <div className="weekly-stat-card card">
                  <div className="weekly-stat-icon-wrapper purple">
                    <Layers size={20} color="var(--purple)" />
                  </div>
                  <div className="weekly-stat-info">
                    <span className="weekly-stat-number">{currentSnapshot.upcomingMilestones}</span>
                    <span className="weekly-stat-label">
                      {currentSnapshot.upcomingMilestones} Milestones · {currentSnapshot.pendingDecisions} Decisions
                    </span>
                  </div>
                </div>
              </div>

              {/* Comparison with Previous Week (if available) */}
              {previousReview && previousSnapshot && (
                <div className="weekly-comparison-banner card mb-4">
                  <div className="flex items-center gap-2 font-medium" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    <TrendingUp size={15} color="var(--accent)" />
                    <span>Comparison vs Week {previousReview.weekNumber} ({previousReview.year}):</span>
                  </div>
                  <div className="weekly-comparison-chips">
                    <span className="chip">
                      Completed:{' '}
                      <strong style={{ color: currentSnapshot.completedTasks >= previousSnapshot.completedTasks ? 'var(--success)' : 'var(--danger)' }}>
                        {currentSnapshot.completedTasks >= previousSnapshot.completedTasks ? `+${currentSnapshot.completedTasks - previousSnapshot.completedTasks}` : currentSnapshot.completedTasks - previousSnapshot.completedTasks}
                      </strong>
                    </span>
                    <span className="chip">
                      Blocked:{' '}
                      <strong style={{ color: currentSnapshot.blockedTasks <= previousSnapshot.blockedTasks ? 'var(--success)' : 'var(--danger)' }}>
                        {currentSnapshot.blockedTasks <= previousSnapshot.blockedTasks ? `${currentSnapshot.blockedTasks - previousSnapshot.blockedTasks}` : `+${currentSnapshot.blockedTasks - previousSnapshot.blockedTasks}`}
                      </strong>
                    </span>
                    <span className="chip">
                      Health:{' '}
                      <span style={{ textTransform: 'capitalize' }}>
                        {previousReview.overallHealth} → <strong>{formData.overallHealth}</strong>
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {/* Navigation Tabs */}
              <div className="weekly-tabs-container mb-4">
                <button
                  className={`weekly-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  <FileText size={15} /> Executive Notes & Review
                </button>
                <button
                  className={`weekly-tab-btn ${activeTab === 'items' ? 'active' : ''}`}
                  onClick={() => setActiveTab('items')}
                >
                  <Layers size={15} /> Snapshot Breakdown ({currentSnapshot.completedTasks + currentSnapshot.inProgressTasks + currentSnapshot.blockedTasks} tasks)
                </button>
                <button
                  className={`weekly-tab-btn ${activeTab === 'report' ? 'active' : ''}`}
                  onClick={() => setActiveTab('report')}
                >
                  <Copy size={15} /> Export Markdown Report
                </button>
              </div>

              {/* Tab 1: Executive Notes & Narrative Editor */}
              {activeTab === 'overview' && (
                <div className="weekly-editor-sections">
                  {/* Executive Summary */}
                  <div className="card mb-4">
                    <div className="card-header">
                      <span className="section-title">📊 Executive Summary / Highlights</span>
                    </div>
                    <div style={{ padding: '16px' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                        High-level synthesis for sponsors, steering committees, and leadership. Summarize the week in 2–4 sentences.
                      </p>
                      <textarea
                        className="textarea"
                        rows={3}
                        value={formData.summary}
                        onChange={(e) => {
                          setFormData((f) => ({ ...f, summary: e.target.value }));
                          setSaveIndicator('dirty');
                        }}
                        placeholder="e.g. Major milestone delivered on schedule. Infrastructure dependencies are under close coordination. No budget deviation."
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    {/* Key Achievements */}
                    <div className="card">
                      <div className="card-header">
                        <span className="section-title" style={{ color: 'var(--success)' }}>
                          🎯 Key Achievements This Week
                        </span>
                      </div>
                      <div style={{ padding: '16px' }}>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                          Specific deliverables completed, milestones signed off, or major wins.
                        </p>
                        <textarea
                          className="textarea"
                          rows={6}
                          value={formData.achievements}
                          onChange={(e) => {
                            setFormData((f) => ({ ...f, achievements: e.target.value }));
                            setSaveIndicator('dirty');
                          }}
                          placeholder="- Delivered Azure AD SSO integration&#10;- Ran automated migration dry run with zero data loss&#10;- Closed 4 customer tickets"
                        />
                      </div>
                    </div>

                    {/* Priorities for Next Week */}
                    <div className="card">
                      <div className="card-header">
                        <span className="section-title" style={{ color: 'var(--accent)' }}>
                          🚀 Priorities & Focus for Next Week
                        </span>
                      </div>
                      <div style={{ padding: '16px' }}>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                          Top 3–5 items the team will commit to during the coming week.
                        </p>
                        <textarea
                          className="textarea"
                          rows={6}
                          value={formData.prioritiesNextWeek}
                          onChange={(e) => {
                            setFormData((f) => ({ ...f, prioritiesNextWeek: e.target.value }));
                            setSaveIndicator('dirty');
                          }}
                          placeholder="- Finalize UAT deployment configuration&#10;- Review database latency with backend lead&#10;- Prepare steering committee slides"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Blockers & Needs */}
                  <div className="card mb-4">
                    <div className="card-header">
                      <span className="section-title" style={{ color: 'var(--danger)' }}>
                        🛑 Blockers, Critical Risks & Escalation Needs
                      </span>
                    </div>
                    <div style={{ padding: '16px' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                        Dependencies waiting on external teams, decisions overdue, or blockers impacting the schedule.
                      </p>
                      <textarea
                        className="textarea"
                        rows={4}
                        value={formData.blockersNotes}
                        onChange={(e) => {
                          setFormData((f) => ({ ...f, blockersNotes: e.target.value }));
                          setSaveIndicator('dirty');
                        }}
                        placeholder="e.g. Ticket #NET-4421 pending client IT action. If not approved by Friday, Phase 3 MVP delivery date will slide."
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button className="btn btn-secondary" onClick={handleCopyReport}>
                      <Copy size={14} /> Copy Report
                    </button>
                    <button className="btn btn-primary" onClick={handleSave}>
                      {saveIndicator === 'saving' ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Snapshot Breakdown Details */}
              {activeTab === 'items' && (
                <div className="weekly-items-grid">
                  <div className="card">
                    <div className="card-header">
                      <ClipboardCheck size={16} color="var(--success)" />
                      <span className="section-title">Completed Deliverables ({currentSnapshot.completedTasks})</span>
                    </div>
                    <div style={{ padding: '12px 16px' }}>
                      {currentSnapshot.completedTaskTitles && currentSnapshot.completedTaskTitles.length > 0 ? (
                        <ul className="weekly-bullet-list">
                          {currentSnapshot.completedTaskTitles.map((title, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <CheckCircle2 size={13} color="var(--success)" style={{ flexShrink: 0 }} />
                              <span>{title}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No tasks recorded in this period snapshot.</div>
                      )}
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <AlertCircle size={16} color="var(--danger)" />
                      <span className="section-title" style={{ color: 'var(--danger)' }}>
                        Blocked & Impediments ({currentSnapshot.blockedTasks})
                      </span>
                    </div>
                    <div style={{ padding: '12px 16px' }}>
                      {currentSnapshot.blockedTaskTitles && currentSnapshot.blockedTaskTitles.length > 0 ? (
                        <ul className="weekly-bullet-list">
                          {currentSnapshot.blockedTaskTitles.map((title, idx) => (
                            <li key={idx} className="flex items-center gap-2" style={{ color: 'var(--danger)' }}>
                              <AlertCircle size={13} color="var(--danger)" style={{ flexShrink: 0 }} />
                              <span>{title}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No blocked tasks recorded.</div>
                      )}
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <Clock size={16} color="var(--info)" />
                      <span className="section-title">Tasks In Progress ({currentSnapshot.inProgressTasks})</span>
                    </div>
                    <div style={{ padding: '12px 16px' }}>
                      {currentSnapshot.inProgressTaskTitles && currentSnapshot.inProgressTaskTitles.length > 0 ? (
                        <ul className="weekly-bullet-list">
                          {currentSnapshot.inProgressTaskTitles.map((title, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <ChevronRight size={13} color="var(--info)" style={{ flexShrink: 0 }} />
                              <span>{title}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No in-progress tasks recorded.</div>
                      )}
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <AlertTriangle size={16} color="var(--warning)" />
                      <span className="section-title">Open Issues & Critical Risks</span>
                    </div>
                    <div style={{ padding: '12px 16px' }}>
                      <div className="flex flex-col gap-2">
                        {currentSnapshot.openIssueTitles?.map((issue, idx) => (
                          <div key={idx} className="flex items-center gap-2" style={{ fontSize: 13 }}>
                            <span className="badge badge-danger">Issue</span>
                            <span>{issue}</span>
                          </div>
                        ))}
                        {currentSnapshot.criticalRiskTitles?.map((risk, idx) => (
                          <div key={idx} className="flex items-center gap-2" style={{ fontSize: 13 }}>
                            <span className="badge badge-warning">Risk</span>
                            <span>{risk}</span>
                          </div>
                        ))}
                        {(!currentSnapshot.openIssueTitles || currentSnapshot.openIssueTitles.length === 0) &&
                          (!currentSnapshot.criticalRiskTitles || currentSnapshot.criticalRiskTitles.length === 0) && (
                            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No critical issues or risks recorded.</div>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Formatted Markdown Report */}
              {activeTab === 'report' && (
                <div className="card">
                  <div className="card-header flex items-center justify-between">
                    <span className="section-title">📄 Formatted Markdown Report (Ready for Email / Slack / Confluence)</span>
                    <button className="btn btn-primary btn-sm" onClick={handleCopyReport}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
                    </button>
                  </div>
                  <div style={{ padding: '16px' }}>
                    <pre className="weekly-markdown-preview">{reportMarkdown}</pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card weekly-empty-state">
              <Calendar size={48} color="var(--text-muted)" style={{ opacity: 0.4, marginBottom: 12 }} />
              <h3>Select a Weekly Review</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: 420, margin: '8px auto 16px' }}>
                Select a week from the archive on the left to view historical metrics, or create a new review.
              </p>
              <button className="btn btn-primary" onClick={handleStartCurrentWeek}>
                <Plus size={15} /> Start Review for Week {currentWeek}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create New Review for Any Week */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="modal-title">Create Weekly Review</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCustomWeek}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  Select the calendar week and year to create or initialize a review for that period:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <select
                      className="input"
                      value={newYear}
                      onChange={(e) => setNewYear(Number(e.target.value))}
                    >
                      <option value={currentYear - 1}>{currentYear - 1}</option>
                      <option value={currentYear}>{currentYear} (Current)</option>
                      <option value={currentYear + 1}>{currentYear + 1}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Week Number (1–53)</label>
                    <input
                      type="number"
                      min={1}
                      max={53}
                      className="input"
                      value={newWeek}
                      onChange={(e) => setNewWeek(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                {/* Period Preview */}
                {(() => {
                  const period = getWeekPeriod(newYear, newWeek);
                  const isExisting = weeklyReviews.some(
                    (r) => r.weekNumber === newWeek && r.year === newYear
                  );
                  return (
                    <div
                      style={{
                        padding: '10px 14px',
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        fontSize: 12,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ color: 'var(--text-muted)' }}>Period Range:</span>
                        <strong>
                          {period.start} → {period.end}
                        </strong>
                      </div>
                      {isExisting && (
                        <div style={{ color: 'var(--warning)', marginTop: 4 }}>
                          ⚠️ A review for Week {newWeek}, {newYear} already exists. Selecting it will open the existing review.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Continue to Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
