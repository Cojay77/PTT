import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban, Plus, Upload, Download, Copy, Trash2, Edit3, Check,
  Search, AlertCircle, AlertTriangle, CheckCircle2, Database,
  ArrowRight, HardDrive, RefreshCw, X, Loader2
} from 'lucide-react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import {
  switchProject, duplicateProject, renameProject, setProjectColor,
  deleteProject, exportProjectFile, exportWorkspaceBundle, importWorkspaceBundle,
  openProjectFileDialog, getStorageEstimate, PROJECT_COLORS,
  type WorkspaceProject,
} from '../db';
import { ProjectAvatar, formatRelative, formatBytes, STATUS_LABEL } from '../components/workspace/workspaceUtils';

export default function Projects() {
  const navigate = useNavigate();
  const { projects, activeId, refresh, setNewProjectOpen } = useWorkspaceStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number; persisted: boolean } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Rename modal state
  const [editingProject, setEditingProject] = useState<WorkspaceProject | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editColor, setEditColor] = useState('');

  // Delete confirm state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
    void getStorageEstimate().then(setStorageInfo);
  }, [refresh]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const filtered = useMemo(() => {
    return projects.filter((p: WorkspaceProject) => {
      const matchSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.code || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.summary?.manager || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === 'all' ||
        (p.summary?.status || 'on-track') === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [projects, search, statusFilter]);

  async function handleSwitch(id: string) {
    if (id === activeId) {
      navigate('/dashboard');
      return;
    }
    setBusyId(id);
    try {
      await switchProject(id);
      showToast('success', 'Project switched successfully.');
      navigate('/dashboard');
    } catch (err) {
      showToast('error', `Failed to switch project: ${String(err)}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicate(p: WorkspaceProject) {
    setBusyId(p.id);
    try {
      const copy = await duplicateProject(p.id, `Copy of ${p.name}`);
      await refresh();
      showToast('success', `Created duplicate: "${copy.name}".`);
    } catch (err) {
      showToast('error', `Failed to duplicate: ${String(err)}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      await deleteProject(id);
      setConfirmDeleteId(null);
      await refresh();
      showToast('success', 'Project removed from workspace.');
    } catch (err) {
      showToast('error', `Failed to delete project: ${String(err)}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProject) return;
    const finalName = editName.trim();
    if (!finalName) return;
    try {
      await renameProject(editingProject.id, finalName, editCode.trim());
      if (editColor && editColor !== editingProject.color) {
        await setProjectColor(editingProject.id, editColor);
      }
      setEditingProject(null);
      await refresh();
      showToast('success', 'Project details updated.');
    } catch (err) {
      showToast('error', `Failed to update project: ${String(err)}`);
    }
  }

  async function handleImportFile() {
    try {
      const name = await openProjectFileDialog();
      if (name) {
        await refresh();
        showToast('success', `Imported project "${name}".`);
      }
    } catch (err) {
      showToast('error', `Import failed: ${String(err)}`);
    }
  }

  async function handleBackupWorkspace() {
    try {
      const count = await exportWorkspaceBundle();
      showToast('success', `Exported workspace bundle containing ${count} project(s).`);
    } catch (err) {
      showToast('error', `Export failed: ${String(err)}`);
    }
  }

  async function handleRestoreWorkspace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const count = await importWorkspaceBundle(file);
      await refresh();
      showToast('success', `Restored ${count} project(s) into workspace.`);
    } catch (err) {
      showToast('error', `Restore failed: ${String(err)}`);
    } finally {
      e.target.value = '';
    }
  }

  return (
    <div className="projects-page-container">
      {/* Toast Alert */}
      {feedbackMsg && (
        <div className={`ws-toast ${feedbackMsg.type}`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="projects-header-bar">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Projects Hub</h1>
            <span className="badge badge-primary">{projects.length} source{projects.length === 1 ? '' : 's'}</span>
          </div>
          <p className="page-subtitle">
            Switch smoothly between projects in your browser. All projects are stored independently and privately on your machine.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleImportFile}
            title="Import an existing .ptt or .db database file"
            id="projects-import-btn"
          >
            <Upload size={14} /> Import .ptt
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleBackupWorkspace}
            title="Download all projects in a single .pttw backup bundle"
            id="projects-backup-bundle-btn"
          >
            <Download size={14} /> Backup All (.pttw)
          </button>
          <label className="btn btn-secondary btn-sm cursor-pointer" title="Restore projects from a .pttw bundle">
            <HardDrive size={14} /> Restore Bundle
            <input
              type="file"
              accept=".pttw,application/json"
              style={{ display: 'none' }}
              onChange={handleRestoreWorkspace}
            />
          </label>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setNewProjectOpen(true)}
            id="projects-new-btn"
          >
            <Plus size={14} /> New Project
          </button>
        </div>
      </div>

      {/* Filters & Storage Bar */}
      <div className="projects-controls-bar">
        <div className="search-box-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="input"
            placeholder="Search projects by name, code or manager..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 34, height: 36 }}
          />
          {search && (
            <button className="btn-icon btn-ghost search-clear" onClick={() => setSearch('')}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ height: 36, fontSize: 13, minWidth: 140 }}
          >
            <option value="all">All Statuses</option>
            <option value="on-track">On Track</option>
            <option value="at-risk">At Risk</option>
            <option value="off-track">Off Track</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>

          {storageInfo && (
            <div className="storage-chip" title={`Browser storage used: ${formatBytes(storageInfo.usage)}`}>
              <Database size={13} color="var(--accent)" />
              <span>{formatBytes(storageInfo.usage)} used</span>
            </div>
          )}
        </div>
      </div>

      {/* Project Cards Grid */}
      {filtered.length === 0 ? (
        <div className="empty-projects-card">
          <FolderKanban size={44} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: 12 }} />
          <h3>No projects found</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 360, margin: '6px auto 16px' }}>
            {search ? `No projects match "${search}". Try clearing the search query.` : 'Start piloting your first project or import an existing .ptt file.'}
          </p>
          <button className="btn btn-primary" onClick={() => setNewProjectOpen(true)}>
            <Plus size={14} /> Create a Project
          </button>
        </div>
      ) : (
        <div className="projects-cards-grid">
          {filtered.map((p: WorkspaceProject) => {
            const isActive = p.id === activeId;
            const s = p.summary;
            const milestonePct = s && s.milestonesTotal > 0
              ? Math.round((s.milestonesDone / s.milestonesTotal) * 100)
              : null;

            return (
              <div
                key={p.id}
                className={`project-card ${isActive ? 'is-active' : ''}`}
                style={{ ['--card-color' as string]: p.color }}
              >
                {/* Active Indicator Strip */}
                <div className="project-card-top-strip" />

                <div className="project-card-header">
                  <ProjectAvatar project={p} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2">
                      <h3 className="project-card-title truncate" title={p.name}>
                        {p.name}
                      </h3>
                      {isActive && (
                        <span className="badge badge-primary ws-active-tag">
                          <Check size={10} /> Active
                        </span>
                      )}
                    </div>
                    <div className="project-card-subtitle">
                      {p.code ? <span className="mono font-semibold">{p.code}</span> : <span>No code</span>}
                      {s?.manager && <span> · Lead: {s.manager}</span>}
                    </div>
                  </div>
                </div>

                {/* Status & Phase info */}
                <div className="project-card-details">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Phase</span>
                    <span className="text-xs font-medium truncate" style={{ maxWidth: 170 }} title={s?.phase || 'Not specified'}>
                      {s?.phase || 'Initial Setup'}
                    </span>
                  </div>
                  {s?.status && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted">Status</span>
                      <span className={`badge status-${s.status}`}>
                        {STATUS_LABEL[s.status] || s.status}
                      </span>
                    </div>
                  )}
                </div>

                {/* KPI Metrics Chips */}
                <div className="project-card-kpis">
                  <div className="kpi-mini-box">
                    <div className="kpi-mini-val">{s?.openTasks ?? 0}</div>
                    <div className="kpi-mini-label">Tasks</div>
                  </div>
                  <div className={`kpi-mini-box ${s && s.overdueTasks > 0 ? 'alert' : ''}`}>
                    <div className="kpi-mini-val flex items-center justify-center gap-1">
                      {s && s.overdueTasks > 0 && <AlertCircle size={11} />}
                      {s?.overdueTasks ?? 0}
                    </div>
                    <div className="kpi-mini-label">Overdue</div>
                  </div>
                  <div className={`kpi-mini-box ${s && s.criticalRisks > 0 ? 'warning' : ''}`}>
                    <div className="kpi-mini-val flex items-center justify-center gap-1">
                      {s && s.criticalRisks > 0 && <AlertTriangle size={11} />}
                      {s?.openRisks ?? 0}
                    </div>
                    <div className="kpi-mini-label">Risks</div>
                  </div>
                  <div className="kpi-mini-box">
                    <div className="kpi-mini-val">{milestonePct !== null ? `${milestonePct}%` : '—'}</div>
                    <div className="kpi-mini-label">Milestones</div>
                  </div>
                </div>

                {/* Footer with actions */}
                <div className="project-card-footer">
                  <span className="text-xs text-muted" title={p.updatedAt}>
                    Updated {formatRelative(p.updatedAt)}
                  </span>

                  <div className="project-card-actions">
                    <button
                      className="btn-icon btn-ghost btn-sm"
                      title="Edit name, code, color"
                      onClick={() => {
                        setEditingProject(p);
                        setEditName(p.name);
                        setEditCode(p.code);
                        setEditColor(p.color);
                      }}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      className="btn-icon btn-ghost btn-sm"
                      title="Duplicate project"
                      onClick={() => handleDuplicate(p)}
                      disabled={busyId === p.id}
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      className="btn-icon btn-ghost btn-sm"
                      title="Export backup (.ptt)"
                      onClick={() => exportProjectFile(p.id)}
                    >
                      <Download size={14} />
                    </button>
                    <button
                      className="btn-icon btn-ghost btn-sm text-danger"
                      title="Delete project"
                      onClick={() => setConfirmDeleteId(p.id)}
                      disabled={projects.length <= 1}
                    >
                      <Trash2 size={14} />
                    </button>

                    <button
                      className={`btn btn-sm ${isActive ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => handleSwitch(p.id)}
                      disabled={busyId === p.id}
                    >
                      {busyId === p.id ? (
                        <Loader2 size={13} className="ws-spin" />
                      ) : isActive ? (
                        <>Open Dashboard <ArrowRight size={13} /></>
                      ) : (
                        <>Switch to Project <ArrowRight size={13} /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="ws-backdrop" onMouseDown={() => setEditingProject(null)}>
          <form
            className="ws-dialog"
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={handleSaveEdit}
          >
            <div className="ws-dialog-header">
              <ProjectAvatar project={{ name: editName || editingProject.name, color: editColor }} size={40} />
              <div style={{ flex: 1 }}>
                <h3 className="ws-dialog-title">Edit Project Details</h3>
                <p className="ws-dialog-sub">Change display name, identifier code and theme color.</p>
              </div>
              <button type="button" className="btn-icon btn-ghost" onClick={() => setEditingProject(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="ws-dialog-body">
              <div className="ws-form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Project Name *</label>
                  <input
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Code</label>
                  <input
                    className="form-input"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Theme Color</label>
                <div className="ws-swatches">
                  {PROJECT_COLORS.map((c: string) => (
                    <button
                      type="button"
                      key={c}
                      className={`ws-swatch ${c === editColor ? 'selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => setEditColor(c)}
                    >
                      {c === editColor && <Check size={12} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="ws-dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEditingProject(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={!editName.trim()}>
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="ws-backdrop" onMouseDown={() => setConfirmDeleteId(null)}>
          <div className="ws-dialog" style={{ maxWidth: 440 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="ws-dialog-header">
              <div className="stat-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 8, padding: 8 }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="ws-dialog-title" style={{ color: 'var(--danger)' }}>Delete Project?</h3>
                <p className="ws-dialog-sub">This action cannot be undone.</p>
              </div>
            </div>
            <div className="ws-dialog-body">
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Are you sure you want to permanently delete this project from your browser storage? All tasks, risks, meetings and notes inside this project will be removed.
              </p>
            </div>
            <div className="ws-dialog-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmDeleteId(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDeleteId)}>
                <Trash2 size={14} /> Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
