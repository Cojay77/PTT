import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Plus, RefreshCw, FolderOpen, Download, Search,
  Calendar, DollarSign, User, CheckCircle2, AlertTriangle, Flame,
  ExternalLink, Edit2, Trash2, ArrowUpDown, Clock, Milestone,
  Layers, ChevronRight, Globe, Building2, Check,
} from 'lucide-react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useDataStore } from '../store/useDataStore';
import type { PortfolioProject, PortfolioProjectStatus, ProjectHealthStatus } from '../types';
import { ConfirmDialog, ProgressBar } from '../components/ui/shared';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  loadWorkspacePortfolio,
  savePortfolioItem,
  deletePortfolioItem,
  switchProject,
  invalidatePortfolioCache,
} from '../db/portfolioService';

const HEALTH_CONFIG: Record<ProjectHealthStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  green: { label: 'Healthy', color: 'var(--success)', bg: 'rgba(34, 197, 94, 0.12)', icon: CheckCircle2 },
  amber: { label: 'At Risk', color: 'var(--warning)', bg: 'rgba(234, 179, 8, 0.12)', icon: AlertTriangle },
  red: { label: 'Critical', color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.12)', icon: Flame },
};

const STATUS_LABELS: Record<PortfolioProjectStatus, string> = {
  active: 'Active',
  planning: 'Planning',
  'on-hold': 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function Portfolio() {
  const navigate = useNavigate();
  const { activeId, refresh: refreshWorkspaceStore } = useWorkspaceStore();
  const { projectConfig } = useDataStore();

  const [portfolioProjects, setPortfolioProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'roadmap' | 'table'>('cards');
  const [search, setSearch] = useState('');
  const [filterHealth, setFilterHealth] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<'all' | 'workspace' | 'external'>('all');
  const [sortField, setSortField] = useState<'targetDate' | 'progress' | 'budget' | 'name' | 'health'>('targetDate');
  const [sortAsc, setSortAsc] = useState(true);

  // Modals & confirmation
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<PortfolioProject | null>(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scannedFiles, setScannedFiles] = useState<{ fileName: string; filePath: string; modifiedTime: number; sizeBytes: number }[]>([]);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Form state
  const [formType, setFormType] = useState<'workspace' | 'external'>('workspace');
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStatus, setFormStatus] = useState<PortfolioProjectStatus>('active');
  const [formHealth, setFormHealth] = useState<ProjectHealthStatus>('green');
  const [formManager, setFormManager] = useState('');
  const [formSponsor, setFormSponsor] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formTargetDate, setFormTargetDate] = useState('');
  const [formPhase, setFormPhase] = useState('');
  const [formProgress, setFormProgress] = useState(0);
  const [formBudgetPlanned, setFormBudgetPlanned] = useState(0);
  const [formBudgetActual, setFormBudgetActual] = useState(0);
  const [formCurrency, setFormCurrency] = useState('EUR');
  const [formKeyMilestone, setFormKeyMilestone] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

  // Load all workspace projects & external initiatives
  const refreshPortfolioData = useCallback(async (showToastNotice = false) => {
    setLoading(true);
    try {
      const list = await loadWorkspacePortfolio();
      setPortfolioProjects(list);
      if (showToastNotice) {
        setSyncToast(`Portfolio refreshed (${list.length} initiatives active)`);
        setTimeout(() => setSyncToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to load workspace portfolio:', err);
      setSyncToast(`Error loading portfolio: ${String(err)}`);
      setTimeout(() => setSyncToast(null), 4000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPortfolioData();

    const handleWorkspaceChanged = () => {
      void refreshPortfolioData();
    };

    window.addEventListener('ptt:workspace-changed', handleWorkspaceChanged);
    window.addEventListener('ptt:data-reloaded', handleWorkspaceChanged);
    return () => {
      window.removeEventListener('ptt:workspace-changed', handleWorkspaceChanged);
      window.removeEventListener('ptt:data-reloaded', handleWorkspaceChanged);
    };
  }, [refreshPortfolioData]);

  // Switch to Project
  const handleSwitchProject = async (p: PortfolioProject) => {
    if (p.isWorkspaceProject) {
      setSyncToast(`Switching workspace to "${p.name}"...`);
      try {
        if (p.id !== activeId) {
          await switchProject(p.id);
          await refreshWorkspaceStore();
        }
        setSyncToast(`Switched active workspace to "${p.name}"`);
        await refreshPortfolioData();
      } catch (err) {
        console.error('Error switching project:', err);
        setSyncToast(`Failed to switch project: ${String(err)}`);
      } finally {
        setTimeout(() => setSyncToast(null), 3000);
      }
    } else if (p.filePath && isElectron && window.electronAPI) {
      try {
        const res = await window.electronAPI.openFileByPath(p.filePath);
        if (res) {
          setSyncToast(`Switched project to ${res.fileName}`);
          setTimeout(() => setSyncToast(null), 3000);
        }
      } catch (err) {
        console.error('Error switching project file:', err);
      }
    }
  };

  // Switch and navigate to Project Overview
  const handleOpenProjectOverview = async (p: PortfolioProject) => {
    try {
      if (p.id !== activeId && p.isWorkspaceProject) {
        await switchProject(p.id);
        await refreshWorkspaceStore();
      }
      navigate('/overview');
    } catch (err) {
      console.error('Failed to open project:', err);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (p?: PortfolioProject) => {
    if (p) {
      setSelectedProject(p);
      setFormType(p.isWorkspaceProject ? 'workspace' : 'external');
      setFormName(p.name);
      setFormCode(p.code);
      setFormDesc(p.description);
      setFormStatus(p.status);
      setFormHealth(p.health);
      setFormManager(p.manager);
      setFormSponsor(p.sponsor);
      setFormStartDate(p.startDate);
      setFormTargetDate(p.targetDate);
      setFormPhase(p.currentPhase);
      setFormProgress(p.progressPercent);
      setFormBudgetPlanned(p.budgetPlanned);
      setFormBudgetActual(p.budgetActual);
      setFormCurrency(p.currency);
      setFormKeyMilestone(p.keyMilestone);
      setFormNotes(p.notes);
    } else {
      setSelectedProject(null);
      setFormType('workspace');
      setFormName('');
      setFormCode('');
      setFormDesc('');
      setFormStatus('active');
      setFormHealth('green');
      setFormManager('');
      setFormSponsor('');
      setFormStartDate('');
      setFormTargetDate('');
      setFormPhase('');
      setFormProgress(0);
      setFormBudgetPlanned(0);
      setFormBudgetActual(0);
      setFormCurrency('EUR');
      setFormKeyMilestone('');
      setFormNotes('');
    }
    setEditModalOpen(true);
  };

  // Save Project Form
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const payload: Partial<PortfolioProject> = {
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
      description: formDesc.trim(),
      status: formStatus,
      health: formHealth,
      manager: formManager.trim(),
      sponsor: formSponsor.trim(),
      startDate: formStartDate,
      targetDate: formTargetDate,
      currentPhase: formPhase.trim(),
      progressPercent: Number(formProgress),
      budgetPlanned: Number(formBudgetPlanned),
      budgetActual: Number(formBudgetActual),
      currency: formCurrency,
      keyMilestone: formKeyMilestone.trim(),
      notes: formNotes.trim(),
      isWorkspaceProject: selectedProject ? selectedProject.isWorkspaceProject : formType === 'workspace',
    };

    try {
      await savePortfolioItem(payload, selectedProject);
      setSyncToast(selectedProject ? `Updated "${payload.name}"` : `Added "${payload.name}" to portfolio`);
      setEditModalOpen(false);
      await refreshPortfolioData();
      await refreshWorkspaceStore();
    } catch (err) {
      console.error('Failed to save project:', err);
      setSyncToast(`Failed to save: ${String(err)}`);
    } finally {
      setTimeout(() => setSyncToast(null), 3500);
    }
  };

  // Delete Project Confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmProject) return;
    try {
      await deletePortfolioItem(deleteConfirmProject);
      setSyncToast(`Removed "${deleteConfirmProject.name}" from portfolio`);
      setDeleteConfirmProject(null);
      await refreshPortfolioData();
      await refreshWorkspaceStore();
    } catch (err) {
      console.error('Failed to delete project:', err);
      setSyncToast(`Failed to delete: ${String(err)}`);
    } finally {
      setTimeout(() => setSyncToast(null), 3500);
    }
  };

  // Scan Folder in Electron
  const handleScanFolder = useCallback(async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const folder = await window.electronAPI.getSavedProjectsFolder();
        if (folder) {
          const files = await window.electronAPI.listProjectsInFolder(folder);
          setScannedFiles(files);
          setScanModalOpen(true);
        }
      } catch (err) {
        console.error('Failed to scan projects folder:', err);
      }
    }
  }, []);

  // Export Portfolio CSV
  const handleExportCSV = () => {
    const headers = [
      'Type', 'Code', 'Name', 'Status', 'Health', 'Manager', 'Sponsor',
      'Phase', 'Progress %', 'Planned Budget', 'Actual Spend', 'Currency',
      'Start Date', 'Target Date', 'Key Milestone', 'Notes'
    ];
    const rows = filteredProjects.map(p => [
      p.isWorkspaceProject ? 'Workspace Project' : 'External Initiative',
      `"${p.code}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      p.status,
      p.health,
      `"${p.manager}"`,
      `"${p.sponsor}"`,
      `"${p.currentPhase}"`,
      p.progressPercent,
      p.budgetPlanned,
      p.budgetActual,
      p.currency,
      p.startDate,
      p.targetDate,
      `"${p.keyMilestone.replace(/"/g, '""')}"`,
      `"${p.notes.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `portfolio-summary-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    return portfolioProjects
      .filter(p => {
        if (filterHealth !== 'all' && p.health !== filterHealth) return false;
        if (filterStatus !== 'all' && p.status !== filterStatus) return false;
        if (filterSource === 'workspace' && !p.isWorkspaceProject) return false;
        if (filterSource === 'external' && p.isWorkspaceProject) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchCode = p.code.toLowerCase().includes(q);
          const matchManager = p.manager.toLowerCase().includes(q);
          const matchSponsor = p.sponsor.toLowerCase().includes(q);
          const matchPhase = p.currentPhase.toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchManager && !matchSponsor && !matchPhase) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'name') cmp = a.name.localeCompare(b.name);
        else if (sortField === 'progress') cmp = a.progressPercent - b.progressPercent;
        else if (sortField === 'budget') cmp = a.budgetPlanned - b.budgetPlanned;
        else if (sortField === 'health') {
          const weight = { red: 0, amber: 1, green: 2 };
          cmp = weight[a.health] - weight[b.health];
        } else {
          // targetDate
          cmp = (a.targetDate || '9999').localeCompare(b.targetDate || '9999');
        }
        return sortAsc ? cmp : -cmp;
      });
  }, [portfolioProjects, filterHealth, filterStatus, filterSource, search, sortField, sortAsc]);

  // Aggregate Portfolio Metrics
  const stats = useMemo(() => {
    const total = portfolioProjects.length;
    const active = portfolioProjects.filter(p => p.status === 'active').length;
    const green = portfolioProjects.filter(p => p.health === 'green').length;
    const amber = portfolioProjects.filter(p => p.health === 'amber').length;
    const red = portfolioProjects.filter(p => p.health === 'red').length;

    const totalPlanned = portfolioProjects.reduce((acc, p) => acc + (p.budgetPlanned || 0), 0);
    const totalActual = portfolioProjects.reduce((acc, p) => acc + (p.budgetActual || 0), 0);
    const variance = totalPlanned > 0 ? Math.round(((totalActual - totalPlanned) / totalPlanned) * 100) : 0;
    const avgProgress = total > 0 ? Math.round(portfolioProjects.reduce((acc, p) => acc + (p.progressPercent || 0), 0) / total) : 0;
    const workspaceCount = portfolioProjects.filter(p => p.isWorkspaceProject).length;

    return { total, active, green, amber, red, totalPlanned, totalActual, variance, avgProgress, workspaceCount };
  }, [portfolioProjects]);

  // Timeline boundaries for Roadmap View
  const roadmapBounds = useMemo(() => {
    const validDates = portfolioProjects
      .flatMap(p => [p.startDate, p.targetDate])
      .filter(Boolean)
      .map(d => parseISO(d).getTime())
      .filter(t => !isNaN(t));

    if (validDates.length === 0) {
      const now = Date.now();
      return { min: now - 30 * 86400000, max: now + 180 * 86400000 };
    }

    const min = Math.min(...validDates);
    const max = Math.max(...validDates);
    return { min: min - 15 * 86400000, max: max + 15 * 86400000 };
  }, [portfolioProjects]);

  const activeProjectEntry = useMemo(() => {
    return portfolioProjects.find(p => p.isActiveProject || p.id === activeId);
  }, [portfolioProjects, activeId]);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
      {/* Toast Alert */}
      {syncToast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: 'var(--bg-surface)', border: '1px solid var(--accent)',
          borderRadius: 8, padding: '12px 20px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--text-sm)', color: 'var(--text-primary)',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <CheckCircle2 size={16} color="var(--success)" />
          {syncToast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent) 0%, #6366f1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Briefcase size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 700, letterSpacing: '-0.02em' }}>
                  Multi-Project Portfolio
                </h1>
                <span className="badge badge-sm" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 }}>
                  Live Workspace
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                Cross-project governance, live status tracking & aggregate budget balance across all workspace initiatives
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              invalidatePortfolioCache();
              void refreshPortfolioData(true);
            }}
            disabled={loading}
            title="Reload live health, tasks, and budget extraction from all workspace databases"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh All Projects</span>
          </button>

          {isElectron && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleScanFolder}
              title="Scan directory for external .ptt project databases"
            >
              <FolderOpen size={14} /> Scan Folder
            </button>
          )}

          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV} title="Export entire multi-project portfolio to CSV">
            <Download size={14} /> Export CSV
          </button>

          <button className="btn btn-primary btn-sm" onClick={() => handleOpenEdit()}>
            <Plus size={14} /> Add Initiative
          </button>
        </div>
      </div>

      {/* KPI Stat Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Total & Active Initiatives */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Portfolio Initiatives
            </span>
            <Layers size={16} color="var(--accent)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
              {stats.total}
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              ({stats.active} active · {stats.workspaceCount} in workspace)
            </span>
          </div>
          <div style={{ marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Average Completion: <strong style={{ color: 'var(--text-primary)' }}>{stats.avgProgress}%</strong>
          </div>
        </div>

        {/* Portfolio Health Breakdown */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Overall Health Distribution
            </span>
            <CheckCircle2 size={16} color="var(--success)" />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 10px', borderRadius: 6, background: HEALTH_CONFIG.green.bg, color: HEALTH_CONFIG.green.color, fontWeight: 700, fontSize: 'var(--text-sm)' }}>
              🟢 {stats.green} Healthy
            </span>
            <span style={{ padding: '4px 10px', borderRadius: 6, background: HEALTH_CONFIG.amber.bg, color: HEALTH_CONFIG.amber.color, fontWeight: 700, fontSize: 'var(--text-sm)' }}>
              🟡 {stats.amber} At Risk
            </span>
            <span style={{ padding: '4px 10px', borderRadius: 6, background: HEALTH_CONFIG.red.bg, color: HEALTH_CONFIG.red.color, fontWeight: 700, fontSize: 'var(--text-sm)' }}>
              🔴 {stats.red} Critical
            </span>
          </div>
          <div style={{ marginTop: 8, fontSize: 'var(--text-xs)', color: stats.red > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
            {stats.red > 0 ? `⚠️ ${stats.red} project(s) require executive intervention` : '✓ All initiatives within acceptable risk thresholds'}
          </div>
        </div>

        {/* Aggregate Budget & Spend */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Aggregate Portfolio Budget
            </span>
            <DollarSign size={16} color="var(--info)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
              €{stats.totalActual.toLocaleString()}
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              / €{stats.totalPlanned.toLocaleString()} planned
            </span>
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 'var(--text-xs)', padding: '2px 6px', borderRadius: 4, fontWeight: 600,
              background: stats.variance > 0 ? 'var(--danger-bg)' : 'var(--success-bg)',
              color: stats.variance > 0 ? 'var(--danger)' : 'var(--success)'
            }}>
              {stats.variance > 0 ? `+${stats.variance}% over plan` : `${stats.variance}% variance`}
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              across all initiatives
            </span>
          </div>
        </div>

        {/* Current Active Workspace Indicator */}
        <div className="card" style={{ padding: '16px 20px', borderColor: 'var(--accent)', background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--accent-soft) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase' }}>
              Currently Open Project
            </span>
            <span className="badge badge-sm" style={{ background: 'var(--accent)', color: '#fff', fontWeight: 600 }}>Active</span>
          </div>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeProjectEntry?.name || projectConfig?.name || 'My Project'}
          </div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              Phase: <strong>{activeProjectEntry?.currentPhase || projectConfig?.currentPhase || 'Execution'}</strong>
              {activeProjectEntry?.score !== undefined && ` · Health: ${activeProjectEntry.score}/100`}
            </span>
            <button
              className="btn btn-ghost btn-xs"
              style={{ color: 'var(--accent)', fontWeight: 600, padding: 0 }}
              onClick={() => navigate('/overview')}
            >
              Open <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & View Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1, minWidth: 280 }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search initiatives, pilots, codes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 30, height: 32, fontSize: 'var(--text-xs)' }}
            />
          </div>

          {/* Health Filter Chips */}
          <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: 2, borderRadius: 6, border: '1px solid var(--border)' }}>
            {(['all', 'green', 'amber', 'red'] as const).map(h => (
              <button
                key={h}
                onClick={() => setFilterHealth(h)}
                style={{
                  border: 'none', background: filterHealth === h ? 'var(--accent)' : 'transparent',
                  color: filterHealth === h ? '#fff' : 'var(--text-secondary)',
                  padding: '4px 10px', borderRadius: 4, fontSize: 'var(--text-xs)', fontWeight: 500, cursor: 'pointer'
                }}
              >
                {h === 'all' ? 'All Health' : h === 'green' ? '🟢 Healthy' : h === 'amber' ? '🟡 At Risk' : '🔴 Critical'}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-select"
            style={{ height: 32, fontSize: 'var(--text-xs)', padding: '0 8px' }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="planning">Planning</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Source Filter */}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as typeof filterSource)}
            className="form-select"
            style={{ height: 32, fontSize: 'var(--text-xs)', padding: '0 8px' }}
          >
            <option value="all">All Sources</option>
            <option value="workspace">Workspace Projects Only</option>
            <option value="external">External Initiatives Only</option>
          </select>
        </div>

        {/* View Switcher & Sorting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 8 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Sort:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as typeof sortField)}
              className="form-select"
              style={{ height: 30, fontSize: 'var(--text-xs)', padding: '0 6px' }}
            >
              <option value="targetDate">Target Date</option>
              <option value="progress">Progress %</option>
              <option value="budget">Budget</option>
              <option value="health">Health Risk</option>
              <option value="name">Name</option>
            </select>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSortAsc(!sortAsc)}
              title={sortAsc ? 'Ascending' : 'Descending'}
              style={{ padding: 4 }}
            >
              <ArrowUpDown size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: 2, borderRadius: 6, border: '1px solid var(--border)' }}>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                border: 'none', background: viewMode === 'cards' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'cards' ? '#fff' : 'var(--text-secondary)',
                padding: '4px 10px', borderRadius: 4, fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer'
              }}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('roadmap')}
              style={{
                border: 'none', background: viewMode === 'roadmap' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'roadmap' ? '#fff' : 'var(--text-secondary)',
                padding: '4px 10px', borderRadius: 4, fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer'
              }}
            >
              Roadmap
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                border: 'none', background: viewMode === 'table' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'table' ? '#fff' : 'var(--text-secondary)',
                padding: '4px 10px', borderRadius: 4, fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer'
              }}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* ── Content View Modes ────────────────────────────────────────── */}

      {/* 1. Roadmap View */}
      {viewMode === 'roadmap' && (
        <div className="card" style={{ padding: '24px 20px', marginBottom: 24, overflowX: 'auto' }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600 }}>Multi-Project Timeline Schedule</h3>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Cross-project delivery horizon spanning {format(new Date(roadmapBounds.min), 'MMM yyyy')} to {format(new Date(roadmapBounds.max), 'MMM yyyy')}
              </p>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Showing {filteredProjects.length} initiatives
            </span>
          </div>

          <div style={{ minWidth: 800 }}>
            {filteredProjects.map((p) => {
              const startT = p.startDate ? parseISO(p.startDate).getTime() : roadmapBounds.min;
              const endT = p.targetDate ? parseISO(p.targetDate).getTime() : roadmapBounds.max;
              const totalDuration = Math.max(1, roadmapBounds.max - roadmapBounds.min);

              const leftPct = Math.max(0, Math.min(95, ((startT - roadmapBounds.min) / totalDuration) * 100));
              const widthPct = Math.max(5, Math.min(100 - leftPct, ((endT - startT) / totalDuration) * 100));
              const healthStyle = HEALTH_CONFIG[p.health];
              const isActive = p.isActiveProject || p.id === activeId;

              return (
                <div
                  key={p.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '260px 1fr', alignItems: 'center',
                    padding: '10px 0', borderBottom: '1px solid var(--border)',
                    background: isActive ? 'var(--accent-soft)' : 'transparent',
                    borderRadius: 4,
                  }}
                >
                  <div style={{ paddingLeft: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: healthStyle.color, flexShrink: 0 }} />
                      <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </strong>
                      {isActive && (
                        <span className="badge badge-sm" style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, padding: '1px 5px' }}>
                          Open
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginLeft: 14 }}>
                      {p.code ? `${p.code} · ` : ''}{p.currentPhase || 'Active'} · {p.progressPercent}%
                    </div>
                  </div>

                  <div style={{ position: 'relative', height: 28, background: 'var(--bg-base)', borderRadius: 6, overflow: 'hidden', marginRight: 8 }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        height: '100%',
                        borderRadius: 6,
                        background: healthStyle.bg,
                        border: `1px solid ${healthStyle.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 8px',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        cursor: p.isWorkspaceProject ? 'pointer' : 'default',
                      }}
                      onClick={() => {
                        if (p.isWorkspaceProject) void handleOpenProjectOverview(p);
                      }}
                      title={`${p.name}: ${p.startDate || '?'} → ${p.targetDate || '?'}${p.isWorkspaceProject ? ' (Click to open)' : ''}`}
                    >
                      {/* Inner Progress fill */}
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${p.progressPercent}%`,
                        background: healthStyle.color,
                        opacity: 0.25,
                      }} />
                      <span style={{ position: 'relative', zIndex: 1, fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {p.progressPercent}% · {p.keyMilestone || p.currentPhase}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Grid Cards View */}
      {viewMode === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {filteredProjects.map((p) => {
            const healthStyle = HEALTH_CONFIG[p.health];
            const isActive = p.isActiveProject || p.id === activeId;

            let daysLeft: number | null = null;
            if (p.targetDate) {
              daysLeft = differenceInDays(parseISO(p.targetDate), new Date());
            }

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  display: 'flex', flexDirection: 'column', padding: '20px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  borderTop: `3px solid ${healthStyle.color}`,
                  borderColor: isActive ? 'var(--accent)' : undefined,
                  boxShadow: isActive ? '0 0 0 1px var(--accent)' : undefined,
                }}
              >
                {/* Card Top: Code, Source & Health */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.color && (
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color }} />
                    )}
                    {p.code && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                        {p.code}
                      </span>
                    )}
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
                      {STATUS_LABELS[p.status]}
                    </span>
                    {isActive ? (
                      <span className="badge badge-sm" style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, padding: '1px 6px' }}>
                        Open Now
                      </span>
                    ) : p.isWorkspaceProject ? (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Building2 size={10} /> Workspace
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Globe size={10} /> External
                      </span>
                    )}
                  </div>

                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                    background: healthStyle.bg, color: healthStyle.color
                  }}>
                    <healthStyle.icon size={12} />
                    {healthStyle.label}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 style={{ margin: '0 0 6px 0', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {p.name}
                </h3>
                <p style={{
                  margin: '0 0 16px 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: 32
                }}>
                  {p.description || 'No initiative description provided.'}
                </p>

                {/* Progress Bar */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Completion Progress {p.openTasks !== undefined ? `(${p.openTasks} tasks open)` : ''}
                    </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{p.progressPercent}%</strong>
                  </div>
                  <ProgressBar value={p.progressPercent} color={healthStyle.color} />
                </div>

                {/* Key Milestone */}
                {p.keyMilestone && (
                  <div style={{
                    marginBottom: 12, padding: '6px 10px', borderRadius: 6,
                    background: 'var(--bg-base)', border: '1px solid var(--border)',
                    fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 6
                  }}>
                    <Milestone size={13} color="var(--accent)" style={{ flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.keyMilestone}
                    </span>
                  </div>
                )}

                {/* Meta Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 'var(--text-xs)', marginBottom: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Lead / Pilot:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <User size={12} /> {p.manager || 'Unassigned'}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Target Delivery:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Calendar size={12} /> {p.targetDate ? format(parseISO(p.targetDate), 'MMM d, yyyy') : 'TBD'}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Budget:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                      {p.currency} {p.budgetActual.toLocaleString()} / {p.budgetPlanned.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Timeline:</span>
                    <div style={{ fontWeight: 600, color: daysLeft !== null && daysLeft < 0 ? 'var(--danger)' : 'var(--text-primary)', marginTop: 2 }}>
                      {daysLeft === null ? 'No date' : daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d remaining`}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Actions */}
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div>
                    {p.isWorkspaceProject ? (
                      isActive ? (
                        <button
                          className="btn btn-secondary btn-xs"
                          onClick={() => handleOpenProjectOverview(p)}
                          style={{ color: 'var(--accent)', fontWeight: 600 }}
                        >
                          View Overview <ChevronRight size={12} />
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-xs"
                          onClick={() => handleSwitchProject(p)}
                          title={`Switch active workspace to ${p.name}`}
                        >
                          <ExternalLink size={12} /> Switch to Project
                        </button>
                      )
                    ) : p.filePath && isElectron ? (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleSwitchProject(p)}
                        style={{ color: 'var(--accent)', fontWeight: 600 }}
                      >
                        <ExternalLink size={12} /> Open File
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {p.currentPhase || 'Strategic Initiative'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button className="btn btn-ghost btn-xs" onClick={() => handleOpenEdit(p)} title="Edit Initiative">
                      <Edit2 size={13} />
                    </button>
                    <button className="btn btn-ghost btn-xs" onClick={() => setDeleteConfirmProject(p)} title="Delete Initiative">
                      <Trash2 size={13} color="var(--danger)" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Table View */}
      {viewMode === 'table' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Code</th>
                <th>Initiative Name</th>
                <th style={{ width: 110 }}>Health</th>
                <th style={{ width: 100 }}>Status</th>
                <th style={{ width: 130 }}>Progress</th>
                <th style={{ width: 130 }}>Manager</th>
                <th style={{ width: 110 }}>Target Date</th>
                <th style={{ width: 150 }}>Budget (Spend / Plan)</th>
                <th style={{ width: 120, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p) => {
                const healthStyle = HEALTH_CONFIG[p.health];
                const isActive = p.isActiveProject || p.id === activeId;

                return (
                  <tr key={p.id} style={{ background: isActive ? 'var(--accent-soft)' : undefined }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {p.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />}
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                          {p.code || '—'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                        {isActive && (
                          <span className="badge badge-sm" style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, padding: '1px 5px' }}>
                            Open
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {p.currentPhase} {p.isWorkspaceProject ? '· Workspace Project' : '· External Initiative'}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                        background: healthStyle.bg, color: healthStyle.color
                      }}>
                        <healthStyle.icon size={11} />
                        {healthStyle.label}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-sm">{STATUS_LABELS[p.status]}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ProgressBar value={p.progressPercent} color={healthStyle.color} />
                        <span style={{ fontSize: 11, fontWeight: 600, minWidth: 28 }}>{p.progressPercent}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)' }}>{p.manager || 'Unassigned'}</td>
                    <td style={{ fontSize: 'var(--text-xs)' }}>
                      {p.targetDate ? format(parseISO(p.targetDate), 'MMM d, yyyy') : '—'}
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)' }}>
                      {p.currency} {p.budgetActual.toLocaleString()} / {p.budgetPlanned.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {p.isWorkspaceProject && (
                          isActive ? (
                            <button className="btn btn-ghost btn-xs" onClick={() => handleOpenProjectOverview(p)} title="Open Project Overview">
                              <ChevronRight size={14} color="var(--accent)" />
                            </button>
                          ) : (
                            <button className="btn btn-ghost btn-xs" onClick={() => handleSwitchProject(p)} title="Switch to this project">
                              <ExternalLink size={13} color="var(--accent)" />
                            </button>
                          )
                        )}
                        <button className="btn btn-ghost btn-xs" onClick={() => handleOpenEdit(p)} title="Edit">
                          <Edit2 size={12} />
                        </button>
                        <button className="btn btn-ghost btn-xs" onClick={() => setDeleteConfirmProject(p)} title="Delete">
                          <Trash2 size={12} color="var(--danger)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {filteredProjects.length === 0 && !loading && (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Briefcase size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)' }}>No Initiatives Found</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: 'var(--text-sm)' }}>
            No projects matched your filters. Create a new workspace project or register an executive initiative.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => handleOpenEdit()}>
            <Plus size={14} /> Add Initiative
          </button>
        </div>
      )}

      {/* ── Add / Edit Modal ────────────────────────────────────────── */}
      {editModalOpen && (
        <div className="modal-backdrop" onClick={() => setEditModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                {selectedProject
                  ? `Edit ${selectedProject.isWorkspaceProject ? 'Workspace Project' : 'External Initiative'}`
                  : 'Add New Portfolio Initiative'}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveProject}>
              {!selectedProject && (
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, background: 'var(--bg-base)', padding: 4, borderRadius: 8 }}>
                  <button
                    type="button"
                    onClick={() => setFormType('workspace')}
                    style={{
                      flex: 1, padding: '8px 12px', border: 'none', borderRadius: 6,
                      background: formType === 'workspace' ? 'var(--accent)' : 'transparent',
                      color: formType === 'workspace' ? '#fff' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: 'var(--text-xs)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <Building2 size={14} /> Create as Workspace Project (full .ptt database)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('external')}
                    style={{
                      flex: 1, padding: '8px 12px', border: 'none', borderRadius: 6,
                      background: formType === 'external' ? 'var(--accent)' : 'transparent',
                      color: formType === 'external' ? '#fff' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: 'var(--text-xs)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <Globe size={14} /> Track as External Initiative (governance only)
                  </button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">Project Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. NextGen ERP Cloud Migration"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Project Code / Key</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. ERP-2026"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Summary / Objectives</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Key strategic objectives and executive deliverables..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as PortfolioProjectStatus)}
                  >
                    <option value="active">Active</option>
                    <option value="planning">Planning</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Health</label>
                  <select
                    className="form-select"
                    value={formHealth}
                    onChange={(e) => setFormHealth(e.target.value as ProjectHealthStatus)}
                    disabled={selectedProject?.isWorkspaceProject}
                    title={selectedProject?.isWorkspaceProject ? 'Health is computed dynamically from workspace tasks, risks & issues' : ''}
                  >
                    <option value="green">🟢 Healthy (On Track)</option>
                    <option value="amber">🟡 At Risk (Attention)</option>
                    <option value="red">🔴 Critical (Action Required)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Current Phase</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formPhase}
                    onChange={(e) => setFormPhase(e.target.value)}
                    placeholder="e.g. Phase 2 — Testing"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">Project Manager / Pilot</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formManager}
                    onChange={(e) => setFormManager(e.target.value)}
                    placeholder="e.g. Alex Taylor"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Executive Sponsor</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formSponsor}
                    onChange={(e) => setFormSponsor(e.target.value)}
                    placeholder="e.g. Claire Fontaine (CTO)"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Target Delivery Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formTargetDate}
                    onChange={(e) => setFormTargetDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Progress: {formProgress}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formProgress}
                    onChange={(e) => setFormProgress(Number(e.target.value))}
                    disabled={selectedProject?.isWorkspaceProject}
                    style={{ width: '100%', marginTop: 8 }}
                    title={selectedProject?.isWorkspaceProject ? 'Progress is calculated from workspace task completion' : ''}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 12, marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">Planned Budget</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="form-input"
                    value={formBudgetPlanned}
                    onChange={(e) => setFormBudgetPlanned(Number(e.target.value))}
                    disabled={selectedProject?.isWorkspaceProject}
                    title={selectedProject?.isWorkspaceProject ? 'Budget is extracted from project budget items' : ''}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Actual Spend</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="form-input"
                    value={formBudgetActual}
                    onChange={(e) => setFormBudgetActual(Number(e.target.value))}
                    disabled={selectedProject?.isWorkspaceProject}
                    title={selectedProject?.isWorkspaceProject ? 'Spend is extracted from project budget items' : ''}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Curr</label>
                  <select
                    className="form-select"
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Key Milestone</label>
                <input
                  type="text"
                  className="form-input"
                  value={formKeyMilestone}
                  onChange={(e) => setFormKeyMilestone(e.target.value)}
                  placeholder="e.g. UAT Signoff (Nov 15)"
                  disabled={selectedProject?.isWorkspaceProject}
                  title={selectedProject?.isWorkspaceProject ? 'Upcoming milestone is read automatically from project milestones' : ''}
                />
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {selectedProject?.isWorkspaceProject && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setEditModalOpen(false);
                        void handleOpenProjectOverview(selectedProject);
                      }}
                      style={{ color: 'var(--accent)' }}
                    >
                      <ExternalLink size={13} /> Open & Detailed Edit in Workspace
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {selectedProject ? 'Save Changes' : 'Create Initiative'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Scan Workspace Files Modal (Electron) ───────────────────── */}
      {scanModalOpen && (
        <div className="modal-backdrop" onClick={() => setScanModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FolderOpen size={18} color="var(--accent)" /> Projects Directory Files
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setScanModalOpen(false)}>✕</button>
            </div>

            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 16 }}>
              The following project database files (.ptt) were detected in your shared projects folder:
            </p>

            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
              {scannedFiles.map((f) => (
                <div key={f.filePath} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border)',
                  marginBottom: 8, background: 'var(--bg-base)'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{f.fileName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {(f.sizeBytes / 1024).toFixed(1)} KB · Modified {format(new Date(f.modifiedTime), 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      className="btn btn-primary btn-xs"
                      onClick={() => {
                        void handleSwitchProject({ filePath: f.filePath, isWorkspaceProject: false, name: f.fileName } as PortfolioProject);
                        setScanModalOpen(false);
                      }}
                    >
                      Open in PTT
                    </button>
                    <button
                      className="btn btn-secondary btn-xs"
                      onClick={() => {
                        void savePortfolioItem({
                          name: f.fileName.replace(/\.ptt$/i, ''),
                          code: f.fileName.slice(0, 4).toUpperCase(),
                          filePath: f.filePath,
                          status: 'active',
                          health: 'green',
                          notes: `Imported from file: ${f.filePath}`,
                        });
                        setSyncToast(`Added ${f.fileName} to portfolio`);
                        setTimeout(() => setSyncToast(null), 3000);
                        void refreshPortfolioData();
                      }}
                    >
                      Add to Portfolio
                    </button>
                  </div>
                </div>
              ))}

              {scannedFiles.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  No .ptt project files found in folder.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setScanModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmProject && (
        <ConfirmDialog
          message={`Are you sure you want to remove "${deleteConfirmProject.name}" from your portfolio?${deleteConfirmProject.isWorkspaceProject ? ' (This will delete the project from your workspace).' : ''}`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmProject(null)}
        />
      )}
    </div>
  );
}
