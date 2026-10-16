import { useState, useMemo, useCallback } from 'react';
import { format, differenceInDays, parseISO, isPast, isToday } from 'date-fns';
import { useDataStore } from '../store/useDataStore';
import { useTaskStore } from '../store/useTaskStore';
import { projectConfigQueries } from '../db/queries';
import {
  ProgressBar,
  SeverityBadge,
  StatusBadge,
  MilestoneBadge,
  DecisionBadge,
  Avatar,
} from '../components/ui/shared';
import {
  Copy,
  Printer,
  AlertTriangle,
  User,
  Users,
  Mail,
  Phone,
  Search,
  CheckSquare,
  HelpCircle,
  Pin,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { Action } from '../types';

type TabView = 'all' | 'blockers' | 'actions' | 'tasks' | 'decisions' | 'contacts' | 'notes';

export default function Handover() {
  const {
    risks,
    issues,
    decisions,
    actions,
    milestones,
    stakeholders,
    resources,
    notes,
    communications,
    updateAction,
  } = useDataStore();
  const { tasks } = useTaskStore();
  const config = projectConfigQueries.get();

  const [activeTab, setActiveTab] = useState<TabView>('all');
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<string>('all');
  const [incomingPm, setIncomingPm] = useState<string>(() => {
    return localStorage.getItem('ptt_handover_incoming_pm') || 'Incoming Project Manager';
  });
  const [outgoingNote, setOutgoingNote] = useState<string>(() => {
    return localStorage.getItem('ptt_handover_pm_note') || '';
  });

  const today = format(new Date(), 'MMMM d, yyyy');

  // Filtered task collections
  const activeTasks = useMemo(() => tasks.filter(t => !t.isBacklog), [tasks]);
  const blockedTasks = useMemo(() => activeTasks.filter(t => t.status === 'blocked'), [activeTasks]);
  const inProgressTasks = useMemo(() => activeTasks.filter(t => t.status === 'in-progress'), [activeTasks]);
  const incomingTasks = useMemo(
    () => activeTasks.filter(t => t.status === 'planned' || t.status === 'ready'),
    [activeTasks]
  );
  const doneTasks = useMemo(() => activeTasks.filter(t => t.status === 'done'), [activeTasks]);

  // Open issues and critical risks
  const openIssues = useMemo(
    () => issues.filter(i => ['open', 'in-progress', 'escalated'].includes(i.status)),
    [issues]
  );

  const pendingDecisions = useMemo(
    () => decisions.filter(d => ['decision-required', 'under-discussion', 'proposed'].includes(d.status)),
    [decisions]
  );
  const urgentDecisions = useMemo(
    () => pendingDecisions.filter(d => d.status === 'decision-required'),
    [pendingDecisions]
  );

  const openActions = useMemo(
    () => actions.filter(a => ['open', 'in-progress'].includes(a.status)),
    [actions]
  );

  const waitingComms = useMemo(
    () => communications.filter(c => c.status === 'awaiting-response' || c.status === 'follow-up-needed' || c.followUpRequired),
    [communications]
  );

  const openRisks = useMemo(
    () => risks.filter(r => !['closed', 'accepted'].includes(r.status)),
    [risks]
  );
  const criticalRisks = useMemo(
    () => openRisks.filter(r => r.severity === 'critical' || r.severity === 'high'),
    [openRisks]
  );

  const pinnedNotes = useMemo(() => notes.filter(n => n.isPinned), [notes]);

  const completionRate =
    activeTasks.length > 0 ? Math.round((doneTasks.length / activeTasks.length) * 100) : 0;

  const daysToTarget = config?.targetDate
    ? differenceInDays(parseISO(config.targetDate), new Date())
    : null;

  // Contact directory mapping helper
  const allContacts = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      role: string;
      organization: string;
      email: string;
      phone?: string;
      category: 'governance' | 'delivery' | 'supplier' | 'stakeholder';
      topics?: string;
      commPreferences?: string;
      allocationPercent?: number;
    }> = [];

    // Stakeholders
    stakeholders.forEach(s => {
      const isGov =
        s.role?.toLowerCase().includes('sponsor') ||
        s.role?.toLowerCase().includes('owner') ||
        s.role?.toLowerCase().includes('cto') ||
        s.role?.toLowerCase().includes('director');
      list.push({
        id: `s-${s.id}`,
        name: s.name,
        role: s.role || 'Stakeholder',
        organization: s.organization || 'Client',
        email: s.email || '',
        phone: s.phone || '',
        category: isGov ? 'governance' : 'stakeholder',
        topics: s.projectTopics || s.responsibilities || '',
        commPreferences: s.communicationPreferences || '',
      });
    });

    // Resources
    resources.forEach(r => {
      const isSupplier =
        r.organization &&
        r.organization.toLowerCase() !== 'internal' &&
        r.organization.toLowerCase() !== 'client' &&
        r.organization.toLowerCase() !== 'client corp';
      list.push({
        id: `r-${r.id}`,
        name: r.name,
        role: r.role || 'Team Member',
        organization: r.organization || 'Internal',
        email: r.email || '',
        phone: '',
        category: isSupplier ? 'supplier' : 'delivery',
        topics: r.skills || '',
        allocationPercent: r.allocationPercent,
      });
    });

    return list;
  }, [stakeholders, resources]);

  // Quick lookup map for person details
  const personMap = useMemo(() => {
    const map = new Map<string, { role: string; org: string; email: string; phone?: string }>();
    allContacts.forEach(c => {
      if (c.name) {
        map.set(c.name.toLowerCase().trim(), {
          role: c.role,
          org: c.organization,
          email: c.email,
          phone: c.phone,
        });
      }
    });
    return map;
  }, [allContacts]);

  function getPersonInfo(name?: string) {
    if (!name) return null;
    return personMap.get(name.toLowerCase().trim());
  }

  // Count items assigned to a person
  function getPersonWorkload(personName: string) {
    const p = personName.toLowerCase().trim();
    const taskCount = activeTasks.filter(t => t.owner?.toLowerCase().trim() === p).length;
    const issueCount = openIssues.filter(i => i.owner?.toLowerCase().trim() === p).length;
    const actionCount = openActions.filter(a => a.owner?.toLowerCase().trim() === p).length;
    const decisionCount = pendingDecisions.filter(d => d.owner?.toLowerCase().trim() === p).length;
    return {
      total: taskCount + issueCount + actionCount + decisionCount,
      tasks: taskCount,
      issues: issueCount,
      actions: actionCount,
      decisions: decisionCount,
    };
  }

  // Search & Person filter predicates
  const query = searchQuery.toLowerCase().trim();
  const personFilter = selectedPerson.toLowerCase().trim();

  const matchesFilter = useCallback((text: string, owner?: string) => {
    const matchQuery = !query || text.toLowerCase().includes(query) || (owner && owner.toLowerCase().includes(query));
    const matchPerson =
      personFilter === 'all' || (owner && owner.toLowerCase().trim() === personFilter);
    return matchQuery && matchPerson;
  }, [query, personFilter]);

  // Filtered lists based on user search & person selector
  const filteredBlockedTasks = useMemo(
    () => blockedTasks.filter(t => matchesFilter(`${t.title} ${t.blockingReason || ''}`, t.owner)),
    [blockedTasks, matchesFilter]
  );

  const filteredOpenIssues = useMemo(
    () =>
      openIssues.filter(i =>
        matchesFilter(`${i.title} ${i.impact || ''} ${i.resolutionActions || ''} ${i.escalationStatus || ''}`, i.owner)
      ),
    [openIssues, matchesFilter]
  );

  const filteredOpenActions = useMemo(
    () => openActions.filter(a => matchesFilter(`${a.action} ${a.source || ''} ${a.notes || ''}`, a.owner)),
    [openActions, matchesFilter]
  );

  const filteredPendingDecisions = useMemo(
    () =>
      pendingDecisions.filter(d =>
        matchesFilter(`${d.title} ${d.decisionRequired || ''} ${d.alternativesConsidered || ''} ${d.context || ''}`, d.owner)
      ),
    [pendingDecisions, matchesFilter]
  );

  const filteredInProgressTasks = useMemo(
    () => inProgressTasks.filter(t => matchesFilter(`${t.title} ${t.phase || ''}`, t.owner)),
    [inProgressTasks, matchesFilter]
  );

  const filteredIncomingTasks = useMemo(
    () => incomingTasks.filter(t => matchesFilter(`${t.title} ${t.phase || ''}`, t.owner)),
    [incomingTasks, matchesFilter]
  );

  const filteredWaitingComms = useMemo(
    () =>
      waitingComms.filter(c =>
        matchesFilter(
          `${c.subject} ${c.summary || ''} ${c.informationRequested || ''} ${c.recipients || ''}`,
          c.sender
        )
      ),
    [waitingComms, matchesFilter]
  );

  const filteredRisks = useMemo(
    () =>
      criticalRisks.filter(r =>
        matchesFilter(`${r.title} ${r.mitigationStrategy || ''} ${r.contingencyPlan || ''}`, r.owner)
      ),
    [criticalRisks, matchesFilter]
  );

  // Markdown Handover Briefing Generator (Actionable & Successor-Focused)
  function generateHandover(): string {
    return `# 📋 PROJECT HANDOVER DOSSIER
**Project**: ${(config?.name as string) || 'Project'} (${(config?.code as string) || 'N/A'})
**Handover Date**: ${today}
**Outgoing PM**: ${(config?.manager as string) || 'Current PM'} ➔ **Incoming PM**: ${incomingPm || 'Successor PM'}
**Current Phase**: ${config?.currentPhase || 'N/A'} | **Overall Health**: ${config?.status || 'N/A'} | **Progress**: ${completionRate}%
**Target Delivery Date**: ${config?.targetDate || 'N/A'}${daysToTarget !== null ? ` (${daysToTarget} days remaining)` : ''}

${outgoingNote ? `> **Outgoing PM Handover Notes & Remarks**:\n> ${outgoingNote.replace(/\n/g, '\n> ')}\n` : ''}

---

## 🚨 1. IMMEDIATE DAY-1 ATTENTION: BLOCKERS & ESCALATIONS
*Items that currently halt project progress and require immediate push from the incoming PM:*

### Blocked Tasks (${blockedTasks.length})
${
  blockedTasks.length === 0
    ? '✓ No blocked tasks.'
    : blockedTasks
        .map(t => {
          const info = getPersonInfo(t.owner);
          return `- **[BLOCKED] ${t.title}**
  - **Reason**: ${t.blockingReason || 'Reason not specified'}
  - **Owner / Contact**: ${t.owner || 'Unassigned'}${info ? ` (${info.role} · ${info.email})` : ''}
  - **Due Date**: ${t.dueDate || 'N/A'} | Priority: ${t.priority}`;
        })
        .join('\n\n')
}

### Open & Escalated Issues (${openIssues.length})
${
  openIssues.length === 0
    ? '✓ No open issues.'
    : openIssues
        .map(i => {
          const info = getPersonInfo(i.owner);
          return `- **[${i.severity.toUpperCase()}] ${i.title}** (Status: ${i.status})
  - **Escalation**: ${i.escalationStatus || 'Not escalated'}
  - **Impact**: ${i.impact || 'N/A'}
  - **Current Actions**: ${i.resolutionActions || 'N/A'}
  - **Responsible Contact**: ${i.owner || 'Unassigned'}${info ? ` (${info.role} · ${info.email})` : ''}
  - **Resolution Target**: ${i.resolutionTarget || 'N/A'}`;
        })
        .join('\n\n')
}

### Communications Awaiting Response / Follow-up Needed (${waitingComms.length})
${
  waitingComms.length === 0
    ? '✓ No pending communications requiring response.'
    : waitingComms
        .map(c => {
          return `- **${c.subject}** [${c.channel || 'Email'}]
  - **Awaiting from**: ${c.recipients || 'Recipients'} (Sent: ${c.date || 'N/A'})
  - **Information Requested**: ${c.informationRequested || c.summary || 'Follow-up needed'}
  - **Expected By**: ${c.expectedResponseDate || c.nextFollowUpDate || 'ASAP'}`;
        })
        .join('\n\n')
}

---

## ⚡ 2. IMMEDIATE NEXT STEPS & OPEN ACTIONS
*Action items to execute in the first 7 to 14 days:*

${
  openActions.length === 0
    ? '✓ No open action items.'
    : openActions
        .map(a => {
          const info = getPersonInfo(a.owner);
          return `- [ ] **${a.action}**
  - **Due Date**: ${a.dueDate || 'N/A'} | **Status**: ${a.status}
  - **Owner**: ${a.owner || 'Unassigned'}${info ? ` (${info.role} · ${info.email})` : ''}
  - **Origin / Source**: ${a.source || 'N/A'}`;
        })
        .join('\n\n')
}

---

## ⚖️ 3. PENDING DECISIONS REQUIRING ACTION
*Decisions with deadlines or choices that must be resolved soon:*

${
  pendingDecisions.length === 0
    ? '✓ No pending decisions.'
    : pendingDecisions
        .map(d => {
          const info = getPersonInfo(d.owner);
          return `- **${d.title}** [Status: ${d.status}]
  - **Decision Required**: ${d.decisionRequired || d.context || 'N/A'}
  - **Alternatives Considered**: ${d.alternativesConsidered || 'N/A'}
  - **Decision Owner**: ${d.owner || 'Unassigned'}${info ? ` (${info.role} · ${info.email})` : ''}
  - **Deadline**: ${d.deadline || 'N/A'}`;
        })
        .join('\n\n')
}

---

## 📅 4. INCOMING & ACTIVE TASKS PIPELINE
*Tasks in flight right now and upcoming items starting next:*

### Currently In Progress (${inProgressTasks.length})
${
  inProgressTasks.length === 0
    ? '✓ No tasks currently in progress.'
    : inProgressTasks
        .map(t => {
          const info = getPersonInfo(t.owner);
          return `- **${t.title}** (${t.phase || 'General'})
  - **Lead**: ${t.owner || 'Unassigned'}${info ? ` (${info.role} · ${info.email})` : ''}
  - **Due**: ${t.dueDate || 'N/A'} | Workload Left: ${t.remainingWorkload ?? 'N/A'}h / ${t.estimatedWorkload ?? 'N/A'}h`;
        })
        .join('\n')
}

### Incoming / Next Tasks (${incomingTasks.slice(0, 10).length})
${
  incomingTasks.length === 0
    ? '✓ No upcoming tasks scheduled.'
    : incomingTasks
        .slice(0, 10)
        .map(t => {
          const info = getPersonInfo(t.owner);
          return `- **${t.title}** [${t.priority}] — Target: ${t.dueDate || 'N/A'} — Assignee: ${t.owner || 'Unassigned'}${info ? ` (${info.role})` : ''}`;
        })
        .join('\n')
}

---

## 👥 5. "WHO TO CONTACT FOR WHAT" DIRECTORY & ESCALATION PATH
*Essential rolodex so the incoming PM knows exactly who to contact for every topic:*

### 👑 Governance & Sponsors
${
  allContacts
    .filter(c => c.category === 'governance')
    .map(c => `- **${c.name}** — ${c.role} (${c.organization})
  - Email: ${c.email || 'N/A'} ${c.phone ? `| Phone: ${c.phone}` : ''}
  - Topics: ${c.topics || 'Governance, strategic direction, budget'}
  - Comm Preferences: ${c.commPreferences || 'Direct email / escalation'}`)
    .join('\n\n') || '(None listed)'
}

### 💻 Core Delivery Team
${
  allContacts
    .filter(c => c.category === 'delivery')
    .map(c => {
      const load = getPersonWorkload(c.name);
      return `- **${c.name}** — ${c.role} (${c.organization})
  - Email: ${c.email || 'N/A'} | Allocation: ${c.allocationPercent ?? 100}%
  - Skills / Focus: ${c.topics || 'Delivery'}
  - Active Workload: ${load.total} item(s) (${load.tasks} tasks, ${load.issues} issues)`;
    })
    .join('\n\n') || '(None listed)'
}

### 🤝 External Suppliers & Partners
${
  allContacts
    .filter(c => c.category === 'supplier')
    .map(c => `- **${c.name}** — ${c.role} (${c.organization})
  - Email: ${c.email || 'N/A'}
  - Focus / Contracts: ${c.topics || 'External vendor support'}`)
    .join('\n\n') || '(None listed)'
}

### 🏢 Key Operational Stakeholders
${
  allContacts
    .filter(c => c.category === 'stakeholder')
    .map(c => `- **${c.name}** — ${c.role} (${c.organization})
  - Email: ${c.email || 'N/A'}
  - Topics: ${c.topics || 'Operational topics'}`)
    .join('\n\n') || '(None listed)'
}

---

## 🛡️ 6. KEY RISKS UNDER ACTIVE SURVEILLANCE
${
  criticalRisks.length === 0
    ? '✓ No critical risks.'
    : criticalRisks
        .map(r => {
          const info = getPersonInfo(r.owner);
          return `- **[${r.severity.toUpperCase()}] ${r.title}**
  - **Mitigation Strategy**: ${r.mitigationStrategy || 'N/A'}
  - **Contingency Plan**: ${r.contingencyPlan || 'N/A'}
  - **Owner**: ${r.owner || 'Unassigned'}${info ? ` (${info.role} · ${info.email})` : ''}
  - **Target Resolution**: ${r.targetResolutionDate || 'N/A'}`;
        })
        .join('\n\n')
}

---

## 🔗 7. ENVIRONMENTS, DOCUMENTATION & ESSENTIAL LINKS
- **Environments**: ${config?.environments || 'N/A'}
- **Documentation**: ${config?.documentationLocations || 'N/A'}
- **Important Links**: ${config?.importantLinks || 'N/A'}
- **External Suppliers Summary**: ${config?.suppliers || 'N/A'}

---

## 📌 8. KEY TRANSITION NOTES & BRIEFING MEMOS
${
  pinnedNotes.length === 0
    ? '(No pinned notes)'
    : pinnedNotes.map(n => `### ${n.title}\n${n.content}`).join('\n\n')
}

---
*Generated by Project Tracking Tool (PTT) · Local-First Handover · ${today}*
`;
  }

  function handleCopy() {
    navigator.clipboard.writeText(generateHandover());
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  function handleSaveIncomingPm(val: string) {
    setIncomingPm(val);
    localStorage.setItem('ptt_handover_incoming_pm', val);
  }

  function handleSaveOutgoingNote(val: string) {
    setOutgoingNote(val);
    localStorage.setItem('ptt_handover_pm_note', val);
  }

  function toggleActionStatus(action: Action) {
    const nextStatus = action.status === 'done' ? 'open' : 'done';
    updateAction(action.id, { status: nextStatus });
  }

  // Count badges for tabs
  const tabCounts = {
    blockers: blockedTasks.length + openIssues.length + waitingComms.length,
    actions: openActions.length,
    tasks: inProgressTasks.length + incomingTasks.length,
    decisions: pendingDecisions.length + criticalRisks.length,
    contacts: allContacts.length,
    notes: pinnedNotes.length + (config?.environments ? 1 : 0),
  };

  return (
    <div className="handover-container">
      {/* 1. Sleek Handover Header Bar (Minimal Project Identity, Focus on Transition) */}
      <div className="handover-banner">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge" style={{ background: 'var(--accent)', color: '#fff', fontWeight: 700, padding: '3px 8px' }}>
                HANDOVER DOSSIER
              </span>
              <h1 className="page-title" style={{ margin: 0, fontSize: 'var(--text-xl)', display: 'inline' }}>
                {(config?.name as string) || 'Project Handover'}
              </h1>
              {config?.code && (
                <span className="badge" style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                  {config.code}
                </span>
              )}
              {config?.status && <StatusBadge status={config.status} />}
              {config?.currentPhase && (
                <span className="badge status-in-progress">
                  Phase: {config.currentPhase}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
              <span>Handover Date: <strong>{today}</strong></span>
              <span>•</span>
              <span>
                Outgoing PM: <strong>{(config?.manager as string) || 'Current PM'}</strong>
              </span>
              <span>➔</span>
              <span>
                Incoming PM:{' '}
                <input
                  type="text"
                  value={incomingPm}
                  onChange={e => handleSaveIncomingPm(e.target.value)}
                  placeholder="Enter successor name..."
                  className="input no-print"
                  style={{
                    display: 'inline-block',
                    width: 170,
                    padding: '2px 8px',
                    fontSize: 'var(--text-xs)',
                    height: 24,
                    background: 'var(--bg-surface)',
                  }}
                />
                <span className="print-only" style={{ display: 'none' }}>
                  <strong>{incomingPm}</strong>
                </span>
              </span>
              {daysToTarget !== null && (
                <>
                  <span>•</span>
                  <span style={{ color: daysToTarget < 14 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                    Target: <strong>{config?.targetDate}</strong> ({daysToTarget >= 0 ? `${daysToTarget} days left` : `${Math.abs(daysToTarget)} days overdue`})
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 no-print">
            <button
              className="btn btn-secondary"
              onClick={() => window.print()}
              title="Print or export as clean PDF"
            >
              <Printer size={14} /> Print / Save PDF
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCopy}
              title="Copy complete markdown dossier to clipboard"
            >
              <Copy size={14} /> {copied ? '✓ Copied Dossier!' : 'Copy Handover Doc'}
            </button>
          </div>
        </div>

        {/* Mini progress bar & Outgoing PM farewell remark */}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div className="flex justify-between" style={{ fontSize: 11, marginBottom: 3, color: 'var(--text-muted)' }}>
              <span>Delivery Progress ({doneTasks.length} / {activeTasks.length} tasks completed)</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{completionRate}%</span>
            </div>
            <ProgressBar value={completionRate} />
          </div>
        </div>
      </div>

      {/* 2. Transition Priority KPI Cards (Interactive Quick Filters) */}
      <div className="handover-kpi-grid no-print">
        <div
          className={`handover-kpi-card ${blockedTasks.length > 0 || openIssues.length > 0 ? 'alert' : ''} ${activeTab === 'blockers' ? 'active' : ''}`}
          onClick={() => setActiveTab('blockers')}
          title="Click to view blockers and escalated issues"
        >
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>1. Roadblocks</span>
            <AlertTriangle size={15} style={{ color: blockedTasks.length > 0 || openIssues.length > 0 ? 'var(--danger)' : 'var(--text-muted)' }} />
          </div>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: blockedTasks.length > 0 || openIssues.length > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
            {blockedTasks.length + openIssues.length}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {blockedTasks.length} blocked · {openIssues.length} open issues
          </span>
        </div>

        <div
          className={`handover-kpi-card warning ${activeTab === 'actions' ? 'active' : ''}`}
          onClick={() => setActiveTab('actions')}
          title="Click to view open actions for immediate execution"
        >
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>2. Immediate Actions</span>
            <CheckSquare size={15} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: openActions.length > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
            {openActions.length}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Open tasks needing push
          </span>
        </div>

        <div
          className={`handover-kpi-card info ${activeTab === 'decisions' ? 'active' : ''}`}
          onClick={() => setActiveTab('decisions')}
          title="Click to view pending decisions and critical risks"
        >
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>3. Decisions & Risks</span>
            <HelpCircle size={15} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--accent)' }}>
            {pendingDecisions.length}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {urgentDecisions.length} urgent · {criticalRisks.length} key risks
          </span>
        </div>

        <div
          className={`handover-kpi-card ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
          title="Click to view active and incoming pipeline tasks"
        >
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>4. Incoming Tasks</span>
            <Layers size={15} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>
            {incomingTasks.length}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {inProgressTasks.length} in flight now
          </span>
        </div>

        <div
          className={`handover-kpi-card ${activeTab === 'contacts' ? 'active' : ''}`}
          onClick={() => setActiveTab('contacts')}
          title="Click to view Who to Contact directory"
        >
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>5. Key Contacts</span>
            <Users size={15} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>
            {allContacts.length}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Who to contact for what
          </span>
        </div>
      </div>

      {/* 3. Search and Person Filtering Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4 no-print flex-wrap">
        {/* Navigation Tabs */}
        <div className="handover-nav-pills" style={{ margin: 0, border: 'none', padding: 0 }}>
          <button
            className={`handover-nav-pill ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <Sparkles size={13} /> Complete Briefing
          </button>
          <button
            className={`handover-nav-pill ${activeTab === 'blockers' ? 'active' : ''}`}
            onClick={() => setActiveTab('blockers')}
          >
            <AlertTriangle size={13} /> Blockers & Issues
            <span className="handover-pill-badge">{tabCounts.blockers}</span>
          </button>
          <button
            className={`handover-nav-pill ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            <CheckSquare size={13} /> Immediate Actions
            <span className="handover-pill-badge">{tabCounts.actions}</span>
          </button>
          <button
            className={`handover-nav-pill ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            <Layers size={13} /> Incoming Tasks
            <span className="handover-pill-badge">{tabCounts.tasks}</span>
          </button>
          <button
            className={`handover-nav-pill ${activeTab === 'decisions' ? 'active' : ''}`}
            onClick={() => setActiveTab('decisions')}
          >
            <HelpCircle size={13} /> Decisions & Risks
            <span className="handover-pill-badge">{tabCounts.decisions}</span>
          </button>
          <button
            className={`handover-nav-pill ${activeTab === 'contacts' ? 'active' : ''}`}
            onClick={() => setActiveTab('contacts')}
          >
            <Users size={13} /> Who to Contact
            <span className="handover-pill-badge">{tabCounts.contacts}</span>
          </button>
          <button
            className={`handover-nav-pill ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            <Pin size={13} /> Access & Notes
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Person Filter */}
          <div className="flex items-center gap-1.5" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            <User size={13} />
            <select
              value={selectedPerson}
              onChange={e => setSelectedPerson(e.target.value)}
              className="select"
              style={{ fontSize: 'var(--text-xs)', height: 30, padding: '2px 8px', minWidth: 140 }}
            >
              <option value="all">Filter: All Contacts</option>
              {allContacts.map(c => (
                <option key={c.id} value={c.name}>
                  {c.name} ({c.role})
                </option>
              ))}
            </select>
          </div>

          {/* Keyword Search */}
          <div style={{ position: 'relative' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: 9,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="input"
              style={{
                paddingLeft: 28,
                fontSize: 'var(--text-xs)',
                height: 30,
                width: 160,
              }}
            />
          </div>
          {(selectedPerson !== 'all' || searchQuery) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSelectedPerson('all');
                setSearchQuery('');
              }}
              style={{ fontSize: 11, height: 30 }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Outgoing PM Farewell / Custom Transition Note (Collapsible/Editable in Briefing) */}
      {(activeTab === 'all' || activeTab === 'notes') && (
        <div className="card mb-4" style={{ borderLeft: '4px solid var(--accent)' }}>
          <div className="card-header flex items-center justify-between" style={{ padding: '10px 16px' }}>
            <div className="flex items-center gap-2">
              <Sparkles size={15} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                Outgoing PM Transition Advice & Handover Memo
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              From: {(config?.manager as string) || 'PM'} ➔ To: {incomingPm}
            </span>
          </div>
          <div style={{ padding: '12px 16px' }}>
            <textarea
              className="input no-print"
              rows={3}
              value={outgoingNote}
              onChange={e => handleSaveOutgoingNote(e.target.value)}
              placeholder="Add key transition remarks before leaving: e.g. 'Meet Sophie on Tuesday for codebase walkthrough; firewall ticket #NET-4421 is top priority; escalate directly to Claire Fontaine if not resolved by Friday...'"
              style={{ width: '100%', fontSize: 'var(--text-sm)', resize: 'vertical' }}
            />
            {outgoingNote && (
              <div
                className="print-only"
                style={{
                  display: 'none',
                  fontSize: 'var(--text-sm)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5,
                  padding: 8,
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {outgoingNote}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MAIN CONTENT SECTIONS ACCORDING TO USER'S SELECTION
          ======================================================== */}

      {/* SECTION 1: 🚨 CRITICAL BLOCKERS, ROADBLOCKS & ESCALATED ISSUES */}
      {(activeTab === 'all' || activeTab === 'blockers') && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
            <h2 className="section-title" style={{ margin: 0, fontSize: 'var(--text-md)' }}>
              1. Day-1 Critical Focus: Blockers & Issues Needing Immediate Push
            </h2>
            <span className="badge" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', fontWeight: 700 }}>
              {filteredBlockedTasks.length + filteredOpenIssues.length + filteredWaitingComms.length} items
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Blocked Tasks Column */}
            <div className="card">
              <div className="card-header flex items-center justify-between" style={{ padding: '10px 16px' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--danger)' }}>
                  🚨 Blocked Tasks ({filteredBlockedTasks.length})
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Action required to unblock</span>
              </div>
              <div style={{ padding: '12px 16px' }}>
                {filteredBlockedTasks.length === 0 ? (
                  <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                    ✓ No blocked tasks
                  </div>
                ) : (
                  filteredBlockedTasks.map(t => {
                    const info = getPersonInfo(t.owner);
                    return (
                      <div key={t.id} className="handover-item-card critical">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                            {t.title}
                          </span>
                          <span className="badge priority-critical">Blocked</span>
                        </div>

                        {/* Blocker reason alert */}
                        <div
                          style={{
                            background: 'var(--danger-bg)',
                            color: 'var(--danger)',
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--text-xs)',
                            marginTop: 6,
                            marginBottom: 8,
                            border: '1px solid var(--danger-border)',
                          }}
                        >
                          <strong>Blocker:</strong> {t.blockingReason || 'No blocking reason documented.'}
                        </div>

                        {/* Owner & contact info */}
                        <div className="flex items-center justify-between gap-2" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                          <div className="flex items-center gap-1.5">
                            <span style={{ color: 'var(--text-muted)' }}>Responsible:</span>
                            {t.owner ? (
                              <button
                                className="handover-contact-chip"
                                onClick={() => setSelectedPerson(t.owner)}
                                title="Click to filter by this contact"
                              >
                                <Avatar name={t.owner} size={16} />
                                <strong>{t.owner}</strong>
                                {info?.role && <span style={{ color: 'var(--text-muted)' }}>({info.role})</span>}
                              </button>
                            ) : (
                              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Unassigned</span>
                            )}
                          </div>
                          {info?.email && (
                            <a
                              href={`mailto:${info.email}?subject=${encodeURIComponent(`[PTT Handover Blocker] ${t.title}`)}`}
                              className="btn btn-ghost btn-sm"
                              style={{ height: 22, padding: '0 6px', fontSize: 11 }}
                              title="Send email to owner"
                            >
                              <Mail size={11} /> Email
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Open & Escalated Issues Column */}
            <div className="card">
              <div className="card-header flex items-center justify-between" style={{ padding: '10px 16px' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--warning)' }}>
                  ⚠️ Open Issues & Escalations ({filteredOpenIssues.length})
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Resolution actions underway</span>
              </div>
              <div style={{ padding: '12px 16px' }}>
                {filteredOpenIssues.length === 0 ? (
                  <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                    ✓ No open issues
                  </div>
                ) : (
                  filteredOpenIssues.map(i => {
                    const info = getPersonInfo(i.owner);
                    const isCrit = i.severity === 'critical' || i.status === 'escalated';
                    return (
                      <div key={i.id} className={`handover-item-card ${isCrit ? 'critical' : 'warning'}`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{i.title}</span>
                          <SeverityBadge severity={i.severity} />
                        </div>

                        {i.escalationStatus && (
                          <div
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              background: 'var(--danger-bg)',
                              color: 'var(--danger)',
                              borderRadius: 'var(--radius-xs)',
                              fontSize: 10,
                              fontWeight: 700,
                              marginBottom: 6,
                            }}
                          >
                            ⚡ {i.escalationStatus}
                          </div>
                        )}

                        {i.impact && (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 6 }}>
                            <strong>Impact:</strong> {i.impact}
                          </div>
                        )}

                        {i.resolutionActions && (
                          <div
                            style={{
                              fontSize: 11,
                              background: 'var(--bg-elevated)',
                              padding: '6px 8px',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--text-secondary)',
                              whiteSpace: 'pre-line',
                              marginBottom: 6,
                            }}
                          >
                            <strong>Next Resolution Action:</strong>
                            <div>{i.resolutionActions}</div>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                          <div className="flex items-center gap-1.5">
                            <span style={{ color: 'var(--text-muted)' }}>Contact:</span>
                            {i.owner ? (
                              <button
                                className="handover-contact-chip"
                                onClick={() => setSelectedPerson(i.owner)}
                                title="Click to filter by contact"
                              >
                                <Avatar name={i.owner} size={16} />
                                <strong>{i.owner}</strong>
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                            )}
                          </div>
                          {info?.email && (
                            <a
                              href={`mailto:${info.email}?subject=${encodeURIComponent(`[Handover Issue Follow-up] ${i.title}`)}`}
                              className="btn btn-ghost btn-sm"
                              style={{ height: 22, padding: '0 6px', fontSize: 11 }}
                            >
                              <Mail size={11} /> Contact
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Communications Awaiting Response Banner */}
          {filteredWaitingComms.length > 0 && (
            <div className="card mt-3" style={{ borderLeft: '4px solid var(--warning)' }}>
              <div className="card-header flex items-center justify-between" style={{ padding: '8px 16px' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--warning)' }}>
                  ⏳ Communications Awaiting Response / Approvals Needed ({filteredWaitingComms.length})
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Incoming PM must follow up</span>
              </div>
              <div style={{ padding: '8px 16px' }}>
                {filteredWaitingComms.map(c => (
                  <div
                    key={c.id}
                    style={{
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight: 600, fontSize: 'var(--text-xs)' }}>{c.subject}</span>
                        <span className="badge status-waiting" style={{ fontSize: 10 }}>{c.channel || 'Email'}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Awaiting from: <strong>{c.recipients}</strong> · Request: {c.informationRequested || c.summary}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 11, flexShrink: 0 }}>
                      <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                        Expected: {c.expectedResponseDate || c.nextFollowUpDate || 'ASAP'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: ⚡ IMMEDIATE NEXT STEPS & OPEN ACTIONS (Day 1 - 14 Checklist) */}
      {(activeTab === 'all' || activeTab === 'actions') && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare size={18} style={{ color: 'var(--warning)' }} />
            <h2 className="section-title" style={{ margin: 0, fontSize: 'var(--text-md)' }}>
              2. Immediate Next Steps & Open Action Items
            </h2>
            <span className="badge" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', fontWeight: 700 }}>
              {filteredOpenActions.length} open actions
            </span>
          </div>

          <div className="card">
            <div className="card-header flex items-center justify-between" style={{ padding: '10px 16px' }}>
              <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                Action Items Checklist for Transition Period
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Sorted by urgency · Click checkbox to complete
              </span>
            </div>
            <div style={{ padding: '8px 16px' }}>
              {filteredOpenActions.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  ✓ All actions completed!
                </div>
              ) : (
                filteredOpenActions.map(a => {
                  const info = getPersonInfo(a.owner);
                  const isLate = a.dueDate && isPast(parseISO(a.dueDate)) && !isToday(parseISO(a.dueDate));
                  const isDueToday = a.dueDate && isToday(parseISO(a.dueDate));
                  return (
                    <div
                      key={a.id}
                      style={{
                        padding: '10px 0',
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={a.status === 'done'}
                        onChange={() => toggleActionStatus(a)}
                        className="no-print"
                        style={{ marginTop: 3, cursor: 'pointer', width: 16, height: 16 }}
                        title="Mark action as done"
                      />
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: 'var(--text-sm)',
                              textDecoration: a.status === 'done' ? 'line-through' : 'none',
                              color: a.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)',
                            }}
                          >
                            {a.action}
                          </span>
                          {a.source && (
                            <span className="badge" style={{ fontSize: 10, background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                              Source: {a.source}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1.5" style={{ fontSize: 'var(--text-xs)' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Owner:</span>
                          {a.owner ? (
                            <button
                              className="handover-contact-chip"
                              onClick={() => setSelectedPerson(a.owner)}
                              title="Filter by this owner"
                            >
                              <Avatar name={a.owner} size={14} />
                              <strong>{a.owner}</strong>
                              {info?.role && <span style={{ color: 'var(--text-muted)' }}>({info.role})</span>}
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                          )}
                          {info?.email && (
                            <a href={`mailto:${info.email}`} style={{ color: 'var(--accent)', fontSize: 11 }}>
                              {info.email}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Due date badge */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {a.dueDate ? (
                          <span
                            className="badge"
                            style={{
                              background: isLate ? 'var(--danger-bg)' : isDueToday ? 'var(--warning-bg)' : 'var(--bg-elevated)',
                              color: isLate ? 'var(--danger)' : isDueToday ? 'var(--warning)' : 'var(--text-secondary)',
                              fontWeight: isLate || isDueToday ? 700 : 500,
                              fontSize: 11,
                            }}
                          >
                            Due: {a.dueDate} {isLate ? '(Late!)' : isDueToday ? '(Today)' : ''}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-placeholder)', fontSize: 11 }}>No due date</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: ⚖️ PENDING DECISIONS REQUIRING ACTION */}
      {(activeTab === 'all' || activeTab === 'decisions') && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle size={18} style={{ color: 'var(--accent)' }} />
            <h2 className="section-title" style={{ margin: 0, fontSize: 'var(--text-md)' }}>
              3. Pending Decisions & Critical Strategic Choices
            </h2>
            <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 700 }}>
              {filteredPendingDecisions.length} decisions
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
            {filteredPendingDecisions.length === 0 ? (
              <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                ✓ No pending decisions requiring action
              </div>
            ) : (
              filteredPendingDecisions.map(d => {
                const info = getPersonInfo(d.owner);
                const isUrgent = d.status === 'decision-required';
                return (
                  <div key={d.id} className={`handover-item-card ${isUrgent ? 'warning' : 'accent'}`}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                        {d.title}
                      </span>
                      <DecisionBadge status={d.status} />
                    </div>

                    {d.decisionRequired && (
                      <div
                        style={{
                          background: 'var(--bg-elevated)',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 'var(--text-xs)',
                          marginBottom: 8,
                          color: 'var(--text-primary)',
                        }}
                      >
                        <strong>Decision Needed:</strong>
                        <div style={{ marginTop: 2 }}>{d.decisionRequired}</div>
                      </div>
                    )}

                    {d.alternativesConsidered && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, whiteSpace: 'pre-line' }}>
                        <strong>Alternatives / Options:</strong>
                        <div style={{ marginTop: 2, paddingLeft: 6, borderLeft: '2px solid var(--border)' }}>
                          {d.alternativesConsidered}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-subtle" style={{ fontSize: 'var(--text-xs)' }}>
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: 'var(--text-muted)' }}>Decision Lead:</span>
                        {d.owner ? (
                          <button
                            className="handover-contact-chip"
                            onClick={() => setSelectedPerson(d.owner)}
                            title="Filter by decision owner"
                          >
                            <Avatar name={d.owner} size={14} />
                            <strong>{d.owner}</strong>
                            {info?.role && <span style={{ color: 'var(--text-muted)' }}>({info.role})</span>}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                        )}
                      </div>
                      {d.deadline && (
                        <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: 11 }}>
                          Deadline: {d.deadline}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: 📅 INCOMING & ACTIVE TASKS PIPELINE */}
      {(activeTab === 'all' || activeTab === 'tasks') && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={18} style={{ color: 'var(--teal)' }} />
            <h2 className="section-title" style={{ margin: 0, fontSize: 'var(--text-md)' }}>
              4. Active In-Progress Tasks & Incoming Pipeline
            </h2>
            <span className="badge status-in-progress">
              {filteredInProgressTasks.length} in flight · {filteredIncomingTasks.length} incoming
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* In Progress Tasks */}
            <div className="card">
              <div className="card-header flex items-center justify-between" style={{ padding: '10px 16px' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--accent)' }}>
                  ⚡ Currently In Progress ({filteredInProgressTasks.length})
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Team is actively coding/testing</span>
              </div>
              <div style={{ padding: '8px 16px' }}>
                {filteredInProgressTasks.length === 0 ? (
                  <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                    No tasks currently in progress
                  </div>
                ) : (
                  filteredInProgressTasks.map(t => {
                    const info = getPersonInfo(t.owner);
                    return (
                      <div
                        key={t.id}
                        style={{
                          padding: '10px 0',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span style={{ fontWeight: 600, fontSize: 'var(--text-xs)' }}>{t.title}</span>
                          <span className="badge priority-medium" style={{ fontSize: 10 }}>{t.priority}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-2" style={{ fontSize: 11 }}>
                          <div className="flex items-center gap-1.5">
                            {t.owner ? (
                              <button
                                className="handover-contact-chip"
                                onClick={() => setSelectedPerson(t.owner)}
                                title="Filter by owner"
                              >
                                <Avatar name={t.owner} size={14} />
                                <strong>{t.owner}</strong>
                                {info?.role && <span style={{ color: 'var(--text-muted)' }}>({info.role})</span>}
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                            )}
                            {t.phase && <span style={{ color: 'var(--text-muted)' }}>· {t.phase}</span>}
                          </div>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            Due: {t.dueDate || 'N/A'} {t.remainingWorkload ? `(${t.remainingWorkload}h left)` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Incoming Scheduled Tasks */}
            <div className="card">
              <div className="card-header flex items-center justify-between" style={{ padding: '10px 16px' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                  📅 Incoming Tasks in Pipeline ({filteredIncomingTasks.length})
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Scheduled for next sprints</span>
              </div>
              <div style={{ padding: '8px 16px' }}>
                {filteredIncomingTasks.length === 0 ? (
                  <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                    No planned tasks found
                  </div>
                ) : (
                  filteredIncomingTasks.slice(0, 8).map(t => {
                    const info = getPersonInfo(t.owner);
                    return (
                      <div
                        key={t.id}
                        style={{
                          padding: '8px 0',
                          borderBottom: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div className="flex items-center gap-1.5">
                            <span style={{ fontWeight: 500, fontSize: 'var(--text-xs)' }}>{t.title}</span>
                            <span className="badge status-planned" style={{ fontSize: 9 }}>{t.status}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            Phase: {t.phase || 'General'} · Assignee: <strong>{t.owner || 'To be assigned'}</strong>
                            {info?.role && ` (${info.role})`}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'right' }}>
                          Target: {t.dueDate || 'TBD'}
                        </div>
                      </div>
                    );
                  })
                )}
                {filteredIncomingTasks.length > 8 && (
                  <div style={{ padding: '6px 0', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                    + {filteredIncomingTasks.length - 8} more scheduled tasks in backlog/plan
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: 👥 "WHO TO CONTACT FOR WHAT" DIRECTORY & ESCALATION MATRIX */}
      {(activeTab === 'all' || activeTab === 'contacts') && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users size={18} style={{ color: 'var(--accent)' }} />
            <h2 className="section-title" style={{ margin: 0, fontSize: 'var(--text-md)' }}>
              5. "Who to Contact for What" Directory & Escalation Matrix
            </h2>
            <span className="badge status-done">{allContacts.length} contacts</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Category: Governance & Sponsors */}
            <div className="card">
              <div className="card-header" style={{ padding: '10px 16px', background: 'var(--bg-elevated)' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--purple)' }}>
                  👑 Governance & Project Sponsor
                </span>
              </div>
              <div style={{ padding: '10px 16px' }}>
                {allContacts
                  .filter(c => c.category === 'governance')
                  .map(c => {
                    const load = getPersonWorkload(c.name);
                    return (
                      <div key={c.id} className="handover-contact-card mb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Avatar name={c.name} size={32} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{c.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {c.role} · {c.organization}
                              </div>
                            </div>
                          </div>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setSelectedPerson(c.name)}
                            title="Filter view to this contact"
                            style={{ height: 24, fontSize: 10, padding: '0 6px' }}
                          >
                            Filter
                          </button>
                        </div>

                        {c.topics && (
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            <strong>Contact for:</strong> {c.topics}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-subtle" style={{ fontSize: 11 }}>
                          <div className="flex items-center gap-3">
                            {c.email && (
                              <a href={`mailto:${c.email}`} className="flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                                <Mail size={12} /> {c.email}
                              </a>
                            )}
                            {c.phone && (
                              <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                <Phone size={12} /> {c.phone}
                              </span>
                            )}
                          </div>
                          {load.total > 0 && (
                            <span style={{ color: 'var(--text-muted)' }}>
                              {load.total} item(s)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Category: Core Delivery Team */}
            <div className="card">
              <div className="card-header" style={{ padding: '10px 16px', background: 'var(--bg-elevated)' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--accent)' }}>
                  💻 Core Delivery & Technical Leads
                </span>
              </div>
              <div style={{ padding: '10px 16px' }}>
                {allContacts
                  .filter(c => c.category === 'delivery')
                  .map(c => {
                    const load = getPersonWorkload(c.name);
                    return (
                      <div key={c.id} className="handover-contact-card mb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Avatar name={c.name} size={32} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{c.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {c.role} {c.allocationPercent ? `(${c.allocationPercent}%)` : ''}
                              </div>
                            </div>
                          </div>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setSelectedPerson(c.name)}
                            style={{ height: 24, fontSize: 10, padding: '0 6px' }}
                          >
                            Filter
                          </button>
                        </div>

                        {c.topics && (
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            <strong>Skills / Scope:</strong> {c.topics}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-subtle" style={{ fontSize: 11 }}>
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                              <Mail size={12} /> {c.email}
                            </a>
                          )}
                          <span style={{ color: 'var(--text-muted)' }}>
                            {load.total} assigned item(s)
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Category: External Suppliers & Technical Partners */}
            <div className="card">
              <div className="card-header" style={{ padding: '10px 16px', background: 'var(--bg-elevated)' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--teal)' }}>
                  🤝 External Suppliers & Partners
                </span>
              </div>
              <div style={{ padding: '10px 16px' }}>
                {allContacts
                  .filter(c => c.category === 'supplier')
                  .map(c => (
                    <div key={c.id} className="handover-contact-card mb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Avatar name={c.name} size={32} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {c.role} · {c.organization}
                            </div>
                          </div>
                        </div>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedPerson(c.name)}
                          style={{ height: 24, fontSize: 10, padding: '0 6px' }}
                        >
                          Filter
                        </button>
                      </div>

                      {c.topics && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          <strong>Contract / Topics:</strong> {c.topics}
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-1 border-t border-subtle" style={{ fontSize: 11 }}>
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                            <Mail size={12} /> {c.email}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Category: Key Operational Stakeholders */}
            <div className="card">
              <div className="card-header" style={{ padding: '10px 16px', background: 'var(--bg-elevated)' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--warning)' }}>
                  🏢 Key Stakeholders & Client Management
                </span>
              </div>
              <div style={{ padding: '10px 16px' }}>
                {allContacts
                  .filter(c => c.category === 'stakeholder')
                  .map(c => (
                    <div key={c.id} className="handover-contact-card mb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Avatar name={c.name} size={32} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {c.role} · {c.organization}
                            </div>
                          </div>
                        </div>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedPerson(c.name)}
                          style={{ height: 24, fontSize: 10, padding: '0 6px' }}
                        >
                          Filter
                        </button>
                      </div>

                      {c.topics && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          <strong>Topics:</strong> {c.topics}
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-1 border-t border-subtle" style={{ fontSize: 11 }}>
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                            <Mail size={12} /> {c.email}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: 🛡️ KEY RISKS & UPCOMING MILESTONES */}
      {(activeTab === 'all' || activeTab === 'decisions') && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="mb-6">
          {/* Critical Risks */}
          <div className="card">
            <div className="card-header flex items-center justify-between" style={{ padding: '10px 16px' }}>
              <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--danger)' }}>
                🛡️ Critical Risks Under Surveillance ({filteredRisks.length})
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>High impact on delivery</span>
            </div>
            <div style={{ padding: '8px 16px' }}>
              {filteredRisks.length === 0 ? (
                <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  ✓ No critical risks under surveillance
                </div>
              ) : (
                filteredRisks.map(r => (
                  <div key={r.id} className="handover-item-card critical">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-xs)' }}>{r.title}</span>
                      <SeverityBadge severity={r.severity} />
                    </div>
                    {r.mitigationStrategy && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <strong>Mitigation:</strong> {r.mitigationStrategy}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-subtle" style={{ fontSize: 11 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Owner: {r.owner || 'Unassigned'}</span>
                      {r.targetResolutionDate && (
                        <span style={{ color: 'var(--text-secondary)' }}>Target: {r.targetResolutionDate}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Key Milestones */}
          <div className="card">
            <div className="card-header flex items-center justify-between" style={{ padding: '10px 16px' }}>
              <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                🎯 Milestone Roadmap ({milestones.length})
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Major checkpoints</span>
            </div>
            <div style={{ padding: '8px 16px' }}>
              {milestones.map(m => (
                <div key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-xs)' }}>{m.name}</span>
                    <MilestoneBadge status={m.status} />
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <ProgressBar value={m.progress} />
                  </div>
                  <div className="flex justify-between" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    <span>Target: {m.targetDate || 'N/A'}</span>
                    <span>Lead: {m.owner || 'Unassigned'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: 🔗 ACCESS, ENVIRONMENTS & PINNED KNOWLEDGE */}
      {(activeTab === 'all' || activeTab === 'notes') && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Pin size={18} style={{ color: 'var(--accent)' }} />
            <h2 className="section-title" style={{ margin: 0, fontSize: 'var(--text-md)' }}>
              6. Access, Environments & Essential Handover Knowledge
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Technical Environments & Links */}
            <div className="card">
              <div className="card-header" style={{ padding: '10px 16px' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                  🌐 Environments & Documentation Locations
                </span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 'var(--text-xs)' }}>
                {config?.environments && (
                  <div>
                    <strong style={{ color: 'var(--text-muted)' }}>Environments:</strong>
                    <div style={{ marginTop: 3, padding: '6px 8px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                      {config.environments}
                    </div>
                  </div>
                )}
                {config?.documentationLocations && (
                  <div>
                    <strong style={{ color: 'var(--text-muted)' }}>Documentation Locations:</strong>
                    <div style={{ marginTop: 3, padding: '6px 8px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                      {config.documentationLocations}
                    </div>
                  </div>
                )}
                {config?.importantLinks && (
                  <div>
                    <strong style={{ color: 'var(--text-muted)' }}>Important Links:</strong>
                    <div style={{ marginTop: 3, padding: '6px 8px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                      {config.importantLinks}
                    </div>
                  </div>
                )}
                {config?.suppliers && (
                  <div>
                    <strong style={{ color: 'var(--text-muted)' }}>External Vendors / Suppliers:</strong>
                    <div style={{ marginTop: 3, padding: '6px 8px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                      {config.suppliers}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pinned Notes */}
            <div className="card">
              <div className="card-header" style={{ padding: '10px 16px' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                  📌 Pinned Transition Notes ({pinnedNotes.length})
                </span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pinnedNotes.length === 0 ? (
                  <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                    No pinned notes
                  </div>
                ) : (
                  pinnedNotes.map(n => (
                    <div
                      key={n.id}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: '3px solid var(--accent)',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 'var(--text-xs)', marginBottom: 4 }}>
                        {n.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-secondary)',
                          whiteSpace: 'pre-wrap',
                          maxHeight: 180,
                          overflowY: 'auto',
                          lineHeight: 1.5,
                        }}
                      >
                        {n.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
