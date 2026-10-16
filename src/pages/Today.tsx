import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sunrise, Sun, Moon, Sparkles, RefreshCw, Settings2,
  TriangleAlert, SquareCheck, Clock, Hourglass, Scale,
  MessageSquare, CalendarCheck, GitMerge, Milestone,
  Flame, Zap, ChevronRight, ArrowRight, Search, Check, Copy,
  ExternalLink, User, Users, Target, Shield, Activity,
  SlidersHorizontal, X, CircleCheck, CircleDashed
} from 'lucide-react';
import { format, parseISO, differenceInDays, addDays, isPast } from 'date-fns';
import {
  loadWorkspaceDigest, getMyAliases, setMyAliases,
  getIncludeUnassigned, setIncludeUnassigned, isMine,
  suggestPeople, type WorkspaceDigestEntry, type DigestItem,
  type DigestKind, type DigestLevel, type DigestActivity,
} from '../db/workspaceDigest';
import { switchProject, getActiveProjectId } from '../db';
import { ProjectAvatar } from '../components/workspace/workspaceUtils';

// Kind metadata configuration
const KIND_CONFIG: Record<DigestKind, { label: string; icon: typeof SquareCheck; color: string; bg: string }> = {
  task: { label: 'Task', icon: SquareCheck, color: 'var(--accent)', bg: 'var(--accent-soft)' },
  action: { label: 'Action', icon: Zap, color: 'var(--orange)', bg: 'var(--orange-bg)' },
  milestone: { label: 'Milestone', icon: Milestone, color: 'var(--success)', bg: 'var(--success-bg)' },
  decision: { label: 'Decision', icon: Scale, color: 'var(--purple)', bg: 'var(--purple-bg)' },
  issue: { label: 'Issue', icon: TriangleAlert, color: 'var(--danger)', bg: 'var(--danger-bg)' },
  risk: { label: 'Risk', icon: Shield, color: 'var(--warning)', bg: 'var(--warning-bg)' },
  communication: { label: 'Communication', icon: MessageSquare, color: 'var(--teal)', bg: 'var(--teal-bg)' },
  meeting: { label: 'Meeting', icon: CalendarCheck, color: 'var(--info)', bg: 'var(--info-bg)' },
  'change-request': { label: 'Change Request', icon: GitMerge, color: 'var(--purple)', bg: 'var(--purple-bg)' },
};

export default function Today() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<WorkspaceDigestEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'briefing' | 'projects' | 'activity'>('briefing');

  // Filtering and preferences
  const [onlyMine, setOnlyMine] = useState<boolean>(true);
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedKind, setSelectedKind] = useState<string>('all');

  // Identity Modal
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [aliasesInput, setAliasesInput] = useState('');
  const [includeUnassigned, setIncludeUnassignedState] = useState(true);

  // Switching toast & copy feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Time & Greeting
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const currentHour = now.getHours();

  const greeting = useMemo(() => {
    if (currentHour < 12) return { text: 'Good morning', icon: Sunrise, period: 'morning' };
    if (currentHour < 18) return { text: 'Good afternoon', icon: Sun, period: 'afternoon' };
    return { text: 'Good evening', icon: Moon, period: 'evening' };
  }, [currentHour]);

  // Load workspace digest
  const refreshDigest = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadWorkspaceDigest();
      setEntries(data);
    } catch (err) {
      console.error('Failed to load workspace digest:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDigest();
    setAliasesInput(getMyAliases().join(', '));
    setIncludeUnassignedState(getIncludeUnassigned());

    const handleWorkspaceChanged = () => {
      void refreshDigest();
    };
    window.addEventListener('ptt:workspace-changed', handleWorkspaceChanged);
    window.addEventListener('ptt:data-reloaded', handleWorkspaceChanged);
    return () => {
      window.removeEventListener('ptt:workspace-changed', handleWorkspaceChanged);
      window.removeEventListener('ptt:data-reloaded', handleWorkspaceChanged);
    };
  }, [refreshDigest]);

  // Aliases list
  const currentAliases = useMemo(() => {
    return aliasesInput.split(',').map(a => a.trim()).filter(Boolean);
  }, [aliasesInput]);

  const activePilotName = useMemo(() => {
    return currentAliases[0] || 'Pilot';
  }, [currentAliases]);

  // Project map for quick lookup
  const projectMap = useMemo(() => {
    const map = new Map<string, WorkspaceDigestEntry['project']>();
    entries.forEach(e => map.set(e.project.id, e.project));
    return map;
  }, [entries]);

  // Suggested people for identity setup
  const peopleSuggestions = useMemo(() => {
    return suggestPeople(entries);
  }, [entries]);

  // Handle switching project and navigating to object
  const handleOpenItem = async (item: DigestItem) => {
    const targetProject = projectMap.get(item.projectId);
    setToastMessage(`Opening ${targetProject?.name || 'Project'} → ${KIND_CONFIG[item.kind]?.label}...`);
    try {
      if (getActiveProjectId() !== item.projectId) {
        await switchProject(item.projectId);
      }
      navigate(item.link);
    } catch (err) {
      console.error('Failed to switch project:', err);
      setToastMessage(`Error opening item: ${String(err)}`);
    } finally {
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  // Flatten all items across all projects
  const allRawItems = useMemo(() => {
    const items: (DigestItem & { projectName: string; projectCode: string; projectColor: string })[] = [];
    entries.forEach(e => {
      if (!e.digest) return;
      e.digest.items.forEach(item => {
        items.push({
          ...item,
          projectName: e.project.name,
          projectCode: e.project.code || '',
          projectColor: e.project.color,
        });
      });
    });
    return items;
  }, [entries]);

  // Filter items by personal filter, search query, project, and kind
  const filteredItems = useMemo(() => {
    return allRawItems.filter(item => {
      // 1. Personal filter ("Mine only")
      if (onlyMine && !isMine(item, currentAliases, includeUnassigned)) {
        return false;
      }
      // 2. Project filter
      if (selectedProjectId !== 'all' && item.projectId !== selectedProjectId) {
        return false;
      }
      // 3. Kind filter
      if (selectedKind !== 'all' && item.kind !== selectedKind) {
        return false;
      }
      // 4. Text search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDetail = item.detail.toLowerCase().includes(q);
        const matchOwner = item.owner.toLowerCase().includes(q);
        const matchPeople = item.people.toLowerCase().includes(q);
        const matchProject = item.projectName.toLowerCase().includes(q) || item.projectCode.toLowerCase().includes(q);
        if (!matchTitle && !matchDetail && !matchOwner && !matchPeople && !matchProject) {
          return false;
        }
      }
      return true;
    });
  }, [allRawItems, onlyMine, currentAliases, includeUnassigned, selectedProjectId, selectedKind, search]);

  // Group items into smart daily buckets
  const next7DaysStr = format(addDays(now, 7), 'yyyy-MM-dd');

  const { overdueAndBlockers, todayItems, waitingItems, upcomingItems, unscheduledItems } = useMemo(() => {
    const overdueAndBlockers: typeof filteredItems = [];
    const todayItems: typeof filteredItems = [];
    const waitingItems: typeof filteredItems = [];
    const upcomingItems: typeof filteredItems = [];
    const unscheduledItems: typeof filteredItems = [];

    filteredItems.forEach(item => {
      const isOverdueDate = item.date && item.date < todayStr && item.kind !== 'milestone' && item.kind !== 'meeting';
      const isCriticalOrBlocker = item.blocker || item.level === 'critical' || item.status === 'blocked';

      if (isOverdueDate || isCriticalOrBlocker) {
        overdueAndBlockers.push(item);
      } else if (item.date === todayStr) {
        todayItems.push(item);
      } else if (item.waiting) {
        waitingItems.push(item);
      } else if (item.date && item.date > todayStr && item.date <= next7DaysStr) {
        upcomingItems.push(item);
      } else {
        unscheduledItems.push(item);
      }
    });

    // Sort items within buckets
    const sortByDateOrUrgency = (a: typeof filteredItems[0], b: typeof filteredItems[0]) => {
      if (a.level === 'critical' && b.level !== 'critical') return -1;
      if (b.level === 'critical' && a.level !== 'critical') return 1;
      if (a.date && b.date) return a.date.localeCompare(b.date);
      if (a.date) return -1;
      if (b.date) return 1;
      return a.title.localeCompare(b.title);
    };

    overdueAndBlockers.sort(sortByDateOrUrgency);
    todayItems.sort(sortByDateOrUrgency);
    waitingItems.sort(sortByDateOrUrgency);
    upcomingItems.sort(sortByDateOrUrgency);
    unscheduledItems.sort(sortByDateOrUrgency);

    return { overdueAndBlockers, todayItems, waitingItems, upcomingItems, unscheduledItems };
  }, [filteredItems, todayStr, next7DaysStr]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const totalProjects = entries.length;
    const totalItems = filteredItems.length;
    const criticalCount = overdueAndBlockers.length;
    const todayCount = todayItems.length;
    const waitingCount = waitingItems.length;
    const upcomingCount = upcomingItems.length;
    return { totalProjects, totalItems, criticalCount, todayCount, waitingCount, upcomingCount };
  }, [entries.length, filteredItems.length, overdueAndBlockers.length, todayItems.length, waitingItems.length, upcomingItems.length]);

  // Aggregate recent activity across all projects (last 72h)
  type EnrichedActivity = DigestActivity & { projectName: string; projectColor: string };
  const recentActivities = useMemo(() => {
    const list: EnrichedActivity[] = [];
    entries.forEach(e => {
      if (!e.digest) return;
      e.digest.activity.forEach(a => {
        list.push({
          ...a,
          projectName: e.project.name,
          projectColor: e.project.color,
        });
      });
    });
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 40);
  }, [entries]);

  // Copy Daily Briefing Markdown
  const handleCopyBriefing = () => {
    let md = `# ☀️ Daily Briefing — ${format(now, 'EEEE, MMMM d, yyyy')}\n`;
    md += `*Generated from PTT Workspace (${stats.totalProjects} active projects)*\n\n`;

    if (overdueAndBlockers.length > 0) {
      md += `## 🚨 Needs Immediate Attention (${overdueAndBlockers.length})\n`;
      overdueAndBlockers.forEach(i => {
        md += `- [${i.projectCode || i.projectName}] **${i.title}** (${KIND_CONFIG[i.kind]?.label || i.kind}) — ${i.date ? `Due ${i.date}` : 'No date'} · Owner: ${i.owner || 'Unassigned'}\n`;
        if (i.detail) md += `  > ${i.detail}\n`;
      });
      md += '\n';
    }

    if (todayItems.length > 0) {
      md += `## ⚡ Scheduled For Today (${todayItems.length})\n`;
      todayItems.forEach(i => {
        md += `- [${i.projectCode || i.projectName}] **${i.title}** ${i.time ? `at ${i.time}` : ''} (${KIND_CONFIG[i.kind]?.label || i.kind}) · Owner: ${i.owner || 'Me'}\n`;
      });
      md += '\n';
    }

    if (waitingItems.length > 0) {
      md += `## 💬 Waiting On Others / Follow-ups (${waitingItems.length})\n`;
      waitingItems.forEach(i => {
        md += `- [${i.projectCode || i.projectName}] **${i.title}** — ${i.detail || 'Awaiting response'}\n`;
      });
      md += '\n';
    }

    if (upcomingItems.length > 0) {
      md += `## 📅 Next Up This Week (${upcomingItems.length})\n`;
      upcomingItems.slice(0, 8).forEach(i => {
        md += `- [${i.projectCode || i.projectName}] ${i.title} (${i.date})\n`;
      });
      md += '\n';
    }

    navigator.clipboard.writeText(md).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    });
  };

  // Save Identity Modal
  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    const newAliases = aliasesInput.split(',').map(s => s.trim()).filter(Boolean);
    setMyAliases(newAliases);
    setIncludeUnassigned(includeUnassigned);
    setIdentityModalOpen(false);
  };

  const addAliasSuggestion = (name: string) => {
    const list = aliasesInput.split(',').map(s => s.trim()).filter(Boolean);
    if (!list.includes(name)) {
      list.push(name);
      setAliasesInput(list.join(', '));
    }
  };

  const GreetingIcon = greeting.icon;

  return (
    <div className="today-meta-dashboard">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="today-toast">
          <CircleDashed size={16} className="animate-spin text-accent" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Morning Hero Header ────────────────────────────────────────── */}
      <div className="today-hero-card">
        <div className="today-hero-content">
          <div className="today-greeting-wrap">
            <div className="today-greeting-icon-box">
              <GreetingIcon size={26} />
            </div>
            <div>
              <div className="today-date-badge">
                <Clock size={13} />
                <span>{format(now, 'EEEE, MMMM d, yyyy')}</span>
                <span className="today-time-badge">{format(now, 'HH:mm')}</span>
              </div>
              <h1 className="today-greeting-title">
                {greeting.text}, <span className="today-pilot-highlight">{activePilotName}</span>
              </h1>
              <p className="today-greeting-subtitle">
                {onlyMine
                  ? `You have ${stats.totalItems} active object${stats.totalItems === 1 ? '' : 's'} assigned to you across ${stats.totalProjects} project${stats.totalProjects === 1 ? '' : 's'}.`
                  : `Observing ${stats.totalItems} objects across all ${stats.totalProjects} projects in your workspace.`}
              </p>
            </div>
          </div>

          {/* Action Header Controls */}
          <div className="today-hero-actions">
            {/* Scope Segment Toggle: Mine vs All */}
            <div className="today-segment-control">
              <button
                type="button"
                className={`today-segment-btn ${onlyMine ? 'active' : ''}`}
                onClick={() => setOnlyMine(true)}
                title="Filter items assigned to you or your team aliases"
              >
                <User size={14} />
                <span>My Focus</span>
                <span className="today-segment-badge">{allRawItems.filter(i => isMine(i, currentAliases, includeUnassigned)).length}</span>
              </button>
              <button
                type="button"
                className={`today-segment-btn ${!onlyMine ? 'active' : ''}`}
                onClick={() => setOnlyMine(false)}
                title="Show all items from all projects across the workspace"
              >
                <Users size={14} />
                <span>All Projects</span>
                <span className="today-segment-badge">{allRawItems.length}</span>
              </button>
            </div>

            {/* Identity Setup Button */}
            <button
              type="button"
              className="btn btn-secondary btn-sm today-identity-btn"
              onClick={() => setIdentityModalOpen(true)}
              title="Configure your name and aliases for smart task attribution"
            >
              <Settings2 size={14} />
              <span className="today-alias-preview truncate">
                {currentAliases.length > 0 ? currentAliases.join(', ') : 'Set My Identity'}
              </span>
            </button>

            {/* Copy Recap */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopyBriefing}
              title="Copy markdown briefing of your day to clipboard"
            >
              {copySuccess ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
              <span>{copySuccess ? 'Copied!' : 'Copy Recap'}</span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-icon"
              onClick={refreshDigest}
              disabled={loading}
              title="Refresh all projects data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── KPI Stat Strip ────────────────────────────────────────── */}
        <div className="today-kpi-ribbon">
          <div
            className={`today-kpi-card ${stats.criticalCount > 0 ? 'critical-glow' : ''}`}
            onClick={() => { setSelectedKind('all'); setSearch(''); }}
          >
            <div className="today-kpi-icon-wrap danger">
              <Flame size={18} />
            </div>
            <div>
              <div className="today-kpi-val danger">{stats.criticalCount}</div>
              <div className="today-kpi-lbl">Needs Attention</div>
            </div>
            <div className="today-kpi-sub">Overdue & Blockers</div>
          </div>

          <div
            className="today-kpi-card"
            onClick={() => { setSelectedKind('all'); setSearch(''); }}
          >
            <div className="today-kpi-icon-wrap warning">
              <Zap size={18} />
            </div>
            <div>
              <div className="today-kpi-val warning">{stats.todayCount}</div>
              <div className="today-kpi-lbl">Due Today</div>
            </div>
            <div className="today-kpi-sub">Today's queue & meetings</div>
          </div>

          <div
            className="today-kpi-card"
            onClick={() => { setSelectedKind('communication'); }}
          >
            <div className="today-kpi-icon-wrap teal">
              <MessageSquare size={18} />
            </div>
            <div>
              <div className="today-kpi-val teal">{stats.waitingCount}</div>
              <div className="today-kpi-lbl">Awaiting Response</div>
            </div>
            <div className="today-kpi-sub">Ball in their court</div>
          </div>

          <div
            className="today-kpi-card"
            onClick={() => { setSelectedKind('all'); }}
          >
            <div className="today-kpi-icon-wrap accent">
              <Clock size={18} />
            </div>
            <div>
              <div className="today-kpi-val accent">{stats.upcomingCount}</div>
              <div className="today-kpi-lbl">Next 7 Days</div>
            </div>
            <div className="today-kpi-sub">Upcoming milestones & tasks</div>
          </div>

          <div
            className="today-kpi-card"
            onClick={() => setActiveTab('projects')}
          >
            <div className="today-kpi-icon-wrap info">
              <Target size={18} />
            </div>
            <div>
              <div className="today-kpi-val info">{stats.totalProjects}</div>
              <div className="today-kpi-lbl">Projects</div>
            </div>
            <div className="today-kpi-sub">Monitored live</div>
          </div>
        </div>
      </div>

      {/* ── Sub Navigation Tabs (Briefing vs Projects vs Activity) ───────── */}
      <div className="today-view-tabs-bar">
        <div className="today-view-tabs">
          <button
            type="button"
            className={`today-view-tab ${activeTab === 'briefing' ? 'active' : ''}`}
            onClick={() => setActiveTab('briefing')}
          >
            <Sparkles size={15} />
            <span>Morning Briefing & Action Queue</span>
            <span className="tab-counter">{filteredItems.length}</span>
          </button>
          <button
            type="button"
            className={`today-view-tab ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            <Target size={15} />
            <span>Projects Health Radar</span>
            <span className="tab-counter">{entries.length}</span>
          </button>
          <button
            type="button"
            className={`today-view-tab ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <Activity size={15} />
            <span>48h Cross-Project Stream</span>
            <span className="tab-counter">{recentActivities.length}</span>
          </button>
        </div>

        {/* Search & Project filter chips */}
        <div className="today-filter-controls">
          <div className="today-search-wrap">
            <Search size={14} className="today-search-icon" />
            <input
              type="text"
              placeholder="Search items, projects, people..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input today-search-input"
            />
            {search && (
              <button type="button" className="today-search-clear" onClick={() => setSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Project Dropdown Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="form-select today-project-select"
          >
            <option value="all">All Projects ({entries.length})</option>
            {entries.map(e => (
              <option key={e.project.id} value={e.project.id}>
                {e.project.code ? `[${e.project.code}] ` : ''}{e.project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kind Filter Chips Bar */}
      {activeTab === 'briefing' && (
        <div className="today-kind-chips-bar">
          <button
            type="button"
            className={`today-kind-chip ${selectedKind === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedKind('all')}
          >
            All Items ({allRawItems.length})
          </button>
          {(['task', 'action', 'communication', 'decision', 'issue', 'risk', 'milestone', 'meeting'] as DigestKind[]).map(k => {
            const count = allRawItems.filter(i => i.kind === k).length;
            if (count === 0 && selectedKind !== k) return null;
            const Icon = KIND_CONFIG[k].icon;
            return (
              <button
                key={k}
                type="button"
                className={`today-kind-chip ${selectedKind === k ? 'active' : ''}`}
                onClick={() => setSelectedKind(selectedKind === k ? 'all' : k)}
              >
                <Icon size={12} style={{ color: KIND_CONFIG[k].color }} />
                <span>{KIND_CONFIG[k].label}s</span>
                <span className="kind-badge">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Tab 1: Briefing & Action Queue ─────────────────────────────── */}
      {activeTab === 'briefing' && (
        <div className="today-briefing-grid">
          {/* Main Left Stream */}
          <div className="today-main-stream">
            {/* Section 1: Urgent Attention & Overdue */}
            {overdueAndBlockers.length > 0 && (
              <div className="today-section-box critical-section">
                <div className="today-section-header">
                  <div className="today-section-icon-badge danger">
                    <Flame size={16} />
                  </div>
                  <div>
                    <h2 className="today-section-title">🚨 Needs Immediate Attention</h2>
                    <p className="today-section-subtitle">Overdue deliveries, blockers, critical issues, and urgent risks</p>
                  </div>
                  <span className="today-section-count danger">{overdueAndBlockers.length} item{overdueAndBlockers.length === 1 ? '' : 's'}</span>
                </div>

                <div className="today-items-list">
                  {overdueAndBlockers.map(item => (
                    <TodayItemCard
                      key={item.key}
                      item={item}
                      todayStr={todayStr}
                      onOpen={handleOpenItem}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Due Today & Scheduled Meetings */}
            <div className="today-section-box">
              <div className="today-section-header">
                <div className="today-section-icon-badge warning">
                  <Zap size={16} />
                </div>
                <div>
                  <h2 className="today-section-title">⚡ Scheduled For Today</h2>
                  <p className="today-section-subtitle">Tasks, actions, meetings, and deadlines on today's calendar</p>
                </div>
                <span className="today-section-count warning">{todayItems.length}</span>
              </div>

              {todayItems.length > 0 ? (
                <div className="today-items-list">
                  {todayItems.map(item => (
                    <TodayItemCard
                      key={item.key}
                      item={item}
                      todayStr={todayStr}
                      onOpen={handleOpenItem}
                    />
                  ))}
                </div>
              ) : (
                <div className="today-empty-subbox">
                  <CircleCheck size={20} color="var(--success)" />
                  <span>No scheduled deadlines or meetings due today. You are clear!</span>
                </div>
              )}
            </div>

            {/* Section 3: Waiting On Others / Delegations */}
            {waitingItems.length > 0 && (
              <div className="today-section-box">
                <div className="today-section-header">
                  <div className="today-section-icon-badge teal">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h2 className="today-section-title">💬 Awaiting Response & Delegations</h2>
                    <p className="today-section-subtitle">Communications sent where the ball is in someone else's court</p>
                  </div>
                  <span className="today-section-count teal">{waitingItems.length}</span>
                </div>

                <div className="today-items-list">
                  {waitingItems.map(item => (
                    <TodayItemCard
                      key={item.key}
                      item={item}
                      todayStr={todayStr}
                      onOpen={handleOpenItem}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Section 4: Upcoming in the Next 7 Days */}
            {upcomingItems.length > 0 && (
              <div className="today-section-box">
                <div className="today-section-header">
                  <div className="today-section-icon-badge accent">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h2 className="today-section-title">📅 Horizon: Next 7 Days</h2>
                    <p className="today-section-subtitle">Approaching milestone deliveries, task commitments, and decisions</p>
                  </div>
                  <span className="today-section-count accent">{upcomingItems.length}</span>
                </div>

                <div className="today-items-list">
                  {upcomingItems.map(item => (
                    <TodayItemCard
                      key={item.key}
                      item={item}
                      todayStr={todayStr}
                      onOpen={handleOpenItem}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Section 5: Unscheduled / Ongoing Backlog items */}
            {unscheduledItems.length > 0 && (
              <div className="today-section-box">
                <div className="today-section-header">
                  <div className="today-section-icon-badge muted">
                    <SlidersHorizontal size={16} />
                  </div>
                  <div>
                    <h2 className="today-section-title">📌 Priority Items Without Fixed Deadline</h2>
                    <p className="today-section-subtitle">Important high/medium items open for progression</p>
                  </div>
                  <span className="today-section-count muted">{unscheduledItems.length}</span>
                </div>

                <div className="today-items-list">
                  {unscheduledItems.slice(0, 15).map(item => (
                    <TodayItemCard
                      key={item.key}
                      item={item}
                      todayStr={todayStr}
                      onOpen={handleOpenItem}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredItems.length === 0 && (
              <div className="card today-clean-slate-card">
                <CircleCheck size={44} color="var(--success)" />
                <h3 className="today-clean-title">All Caught Up!</h3>
                <p className="today-clean-desc">
                  {onlyMine
                    ? 'No pending items found matching your identity filter. You can switch to "All Projects" to view the broader workspace queue.'
                    : 'No active items match your current filter settings.'}
                </p>
                {onlyMine && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOnlyMine(false)}>
                    View All Workspace Items
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Side Column: Projects Overview & Today Summary */}
          <div className="today-sidebar-column">
            {/* Quick Pilot Snapshot Card */}
            <div className="card today-side-card">
              <div className="card-header" style={{ padding: '14px 18px' }}>
                <Target size={16} color="var(--accent)" />
                <span className="section-title" style={{ fontSize: 13 }}>Workspace Portfolio Status</span>
              </div>
              <div className="today-projects-mini-list">
                {entries.map(e => {
                  const p = e.project;
                  const d = e.digest;
                  const progress = d && d.totalTasks > 0 ? Math.round((d.doneTasks / d.totalTasks) * 100) : 0;
                  const overdueCount = d?.items.filter(i => i.date && i.date < todayStr && !['done', 'completed'].includes(i.status)).length || 0;
                  const isActive = e.isActive;

                  return (
                    <div
                      key={p.id}
                      className={`today-proj-row ${isActive ? 'is-active-project' : ''}`}
                      onClick={() => handleOpenItem({ projectId: p.id, link: '/overview' } as DigestItem)}
                      title={`Click to switch to ${p.name}`}
                    >
                      <div className="today-proj-avatar" style={{ background: p.color }}>
                        {p.code ? p.code.slice(0, 3) : p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="today-proj-info">
                        <div className="today-proj-name truncate">{p.name}</div>
                        <div className="today-proj-meta">
                          <span>{d?.phase || 'Execution'}</span>
                          <span>·</span>
                          <span>{progress}% done</span>
                        </div>
                      </div>
                      <div className="today-proj-badges">
                        {overdueCount > 0 && (
                          <span className="today-mini-badge danger" title={`${overdueCount} overdue items`}>
                            {overdueCount}
                          </span>
                        )}
                        {isActive && <span className="today-active-dot" title="Currently open project" />}
                        <ChevronRight size={14} className="text-muted" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick 24h Activity Mini Widget */}
            <div className="card today-side-card">
              <div className="card-header" style={{ padding: '14px 18px' }}>
                <Activity size={16} color="var(--teal)" />
                <span className="section-title" style={{ fontSize: 13 }}>Recent Cross-Project Pulse</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs ml-auto"
                  onClick={() => setActiveTab('activity')}
                >
                  View all
                </button>
              </div>
              <div className="today-activity-mini-stream">
                {recentActivities.slice(0, 8).map(act => (
                  <div key={act.key} className="today-mini-act-item">
                    <div className="today-mini-act-dot" style={{ background: act.projectColor }} />
                    <div className="today-mini-act-body">
                      <div className="today-mini-act-title truncate">
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>[{act.projectName}]</span>{' '}
                        <span>{act.action}:</span> {act.entityTitle}
                      </div>
                      <div className="today-mini-act-time">
                        {format(new Date(act.createdAt), 'MMM d, HH:mm')}
                      </div>
                    </div>
                  </div>
                ))}
                {recentActivities.length === 0 && (
                  <div className="p-3 text-muted text-xs text-center">No recent changes logged in the last 48 hours.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Projects Health Radar ──────────────────────────────── */}
      {activeTab === 'projects' && (
        <div className="today-projects-radar-grid">
          {entries.map(e => {
            const p = e.project;
            const d = e.digest;
            const progress = d && d.totalTasks > 0 ? Math.round((d.doneTasks / d.totalTasks) * 100) : 0;
            const items = d?.items || [];
            const overdueCount = items.filter(i => i.date && i.date < todayStr && !['done', 'completed'].includes(i.status)).length;
            const criticalRisks = items.filter(i => i.kind === 'risk' && i.level === 'critical').length;
            const openIssues = items.filter(i => i.kind === 'issue' && (i.level === 'critical' || i.level === 'high')).length;
            const pendingDecisions = items.filter(i => i.kind === 'decision').length;

            return (
              <div key={p.id} className="card today-radar-card" style={{ borderTop: `4px solid ${p.color}` }}>
                <div className="today-radar-top">
                  <div className="flex items-center gap-2">
                    <ProjectAvatar project={p} size={32} />
                    <div>
                      <h3 className="today-radar-title">{p.name}</h3>
                      <div className="today-radar-code">{p.code || 'NO-CODE'} · Phase: {d?.phase || 'Active'}</div>
                    </div>
                  </div>
                  {e.isActive && <span className="badge badge-sm badge-primary">Active Now</span>}
                </div>

                {d?.statusNote && (
                  <div className="today-radar-note">
                    "{d.statusNote}"
                  </div>
                )}

                <div className="today-radar-progress-wrap">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted">Task Completion</span>
                    <strong>{progress}% ({d?.doneTasks || 0} / {d?.totalTasks || 0})</strong>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%`, background: p.color }} />
                  </div>
                </div>

                <div className="today-radar-kpis">
                  <div className={`today-radar-kpi ${overdueCount > 0 ? 'alert' : ''}`}>
                    <div className="kpi-num">{overdueCount}</div>
                    <div className="kpi-txt">Overdue</div>
                  </div>
                  <div className={`today-radar-kpi ${criticalRisks > 0 ? 'warning' : ''}`}>
                    <div className="kpi-num">{criticalRisks}</div>
                    <div className="kpi-txt">Crit Risks</div>
                  </div>
                  <div className={`today-radar-kpi ${openIssues > 0 ? 'alert' : ''}`}>
                    <div className="kpi-num">{openIssues}</div>
                    <div className="kpi-txt">Issues</div>
                  </div>
                  <div className="today-radar-kpi">
                    <div className="kpi-num">{pendingDecisions}</div>
                    <div className="kpi-txt">Decisions</div>
                  </div>
                </div>

                <div className="today-radar-footer">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm w-full"
                    onClick={() => handleOpenItem({ projectId: p.id, link: '/dashboard' } as DigestItem)}
                  >
                    <span>Open Dashboard</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab 3: Cross-Project Activity Stream ───────────────────────── */}
      {activeTab === 'activity' && (
        <div className="card today-activity-full-card">
          <div className="card-header">
            <Activity size={18} color="var(--accent)" />
            <span className="section-title">Consolidated 72h Audit Trail Across All Projects</span>
            <span className="badge badge-primary ml-auto">{recentActivities.length} events</span>
          </div>

          <div className="today-activity-full-list">
            {recentActivities.map(act => (
              <div key={act.key} className="today-activity-row">
                <div className="today-act-project-pill" style={{ borderColor: act.projectColor, color: act.projectColor }}>
                  {act.projectName}
                </div>
                <div className="today-act-content">
                  <div className="today-act-header">
                    <span className="today-act-type">{act.entityType}</span>
                    <span className="today-act-action">{act.action}</span>
                    <strong className="today-act-title">{act.entityTitle}</strong>
                  </div>
                  {act.description && <div className="today-act-desc">{act.description}</div>}
                </div>
                <div className="today-act-time">
                  {format(new Date(act.createdAt), 'MMM d, HH:mm')}
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <div className="p-6 text-center text-muted">No recent changes found across your projects.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Identity Configuration Modal ───────────────────────────────── */}
      {identityModalOpen && (
        <div className="modal-overlay" onClick={() => setIdentityModalOpen(false)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <User size={18} color="var(--accent)" />
                <span className="modal-title">Configure Your Identity & Aliases</span>
              </div>
              <button type="button" className="btn-icon btn-ghost" onClick={() => setIdentityModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveIdentity}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p className="text-sm text-secondary" style={{ margin: 0 }}>
                  Enter your name, initials, or team nicknames. The morning dashboard uses these to extract items
                  specifically assigned to you or waiting on your decision.
                </p>

                <div className="form-group">
                  <label className="form-label">Your Names & Aliases (comma-separated):</label>
                  <input
                    type="text"
                    value={aliasesInput}
                    onChange={(e) => setAliasesInput(e.target.value)}
                    placeholder="e.g. Cojay, CJ, Project Lead, Me"
                    className="form-input"
                    autoFocus
                  />
                  <span className="form-hint">Matches task owners, action assignees, meeting participants, and communicators.</span>
                </div>

                {peopleSuggestions.length > 0 && (
                  <div>
                    <label className="form-label" style={{ marginBottom: 6 }}>Detected people in your projects (click to add):</label>
                    <div className="flex flex-wrap gap-2">
                      {peopleSuggestions.map(name => (
                        <button
                          key={name}
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => addAliasSuggestion(name)}
                        >
                          + {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ marginTop: 8 }}>
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includeUnassigned}
                      onChange={(e) => setIncludeUnassignedState(e.target.checked)}
                    />
                    <span className="text-sm text-primary">Include unassigned tasks & actions in "My Focus"</span>
                  </label>
                  <span className="form-hint" style={{ marginLeft: 24 }}>
                    Helpful if you are the project lead / pilot responsible for unassigned items before delegation.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIdentityModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Preferences
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: Individual Today Item Card
// ─────────────────────────────────────────────────────────────────────────────
interface TodayItemCardProps {
  item: DigestItem & { projectName: string; projectCode: string; projectColor: string };
  todayStr: string;
  onOpen: (item: DigestItem) => void;
}

function TodayItemCard({ item, todayStr, onOpen }: TodayItemCardProps) {
  const config = KIND_CONFIG[item.kind] || KIND_CONFIG.task;
  const KindIcon = config.icon;

  // Compute status / urgency label
  let relativeDue = '';
  let dueColor = 'var(--text-muted)';
  let isLate = false;

  if (item.date) {
    if (item.date < todayStr) {
      const days = differenceInDays(parseISO(todayStr), parseISO(item.date));
      relativeDue = `${days}d overdue`;
      dueColor = 'var(--danger)';
      isLate = true;
    } else if (item.date === todayStr) {
      relativeDue = item.time ? `Today at ${item.time}` : 'Due Today';
      dueColor = 'var(--warning)';
    } else {
      const days = differenceInDays(parseISO(item.date), parseISO(todayStr));
      relativeDue = days === 1 ? 'Tomorrow' : `In ${days} days (${format(parseISO(item.date), 'MMM d')})`;
      dueColor = days <= 3 ? 'var(--warning)' : 'var(--text-secondary)';
    }
  }

  return (
    <div
      className={`today-item-card ${isLate ? 'is-overdue' : ''} ${item.blocker ? 'is-blocker' : ''}`}
      onClick={() => onOpen(item)}
    >
      {/* Left Color Project Strip */}
      <div className="today-item-strip" style={{ background: item.projectColor }} />

      {/* Main Item Body */}
      <div className="today-item-main">
        {/* Top Badges Row */}
        <div className="today-item-top-row">
          {/* Project Tag */}
          <span className="today-item-project-tag" style={{ ['--proj-color' as string]: item.projectColor }}>
            <span className="today-item-project-dot" style={{ background: item.projectColor }} />
            {item.projectCode || item.projectName}
          </span>

          {/* Kind Tag */}
          <span className="today-item-kind-badge" style={{ color: config.color, background: config.bg }}>
            <KindIcon size={12} />
            <span>{config.label}</span>
          </span>

          {/* Status Badge if special */}
          {item.status && item.status !== 'open' && item.status !== 'planned' && (
            <span className={`badge badge-xs status-${item.status}`}>
              {item.status.replace(/-/g, ' ')}
            </span>
          )}

          {/* Level Badge if critical */}
          {item.level === 'critical' && (
            <span className="badge badge-xs priority-critical">
              Critical
            </span>
          )}

          {/* Due / Target Date Tag */}
          {item.date && (
            <span className="today-item-date-tag" style={{ color: dueColor }}>
              <Clock size={11} />
              <span>{relativeDue}</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className="today-item-title truncate">
          {item.title}
        </h4>

        {/* Detail snippet */}
        {item.detail && (
          <p className="today-item-detail truncate">
            {item.detail}
          </p>
        )}

        {/* Bottom meta: Owner, People, and Action button */}
        <div className="today-item-footer">
          <div className="today-item-people">
            {item.owner && (
              <span className="today-item-owner">
                <User size={12} />
                <span>{item.owner}</span>
              </span>
            )}
            {item.people && (
              <span className="today-item-contributors">
                <span className="text-muted">with</span> {item.people}
              </span>
            )}
          </div>

          <div className="today-item-action-link">
            <span>Open in project</span>
            <ExternalLink size={12} />
          </div>
        </div>
      </div>
    </div>
  );
}
