import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/useUIStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import {
  saveDbNow, exportProjectFile, exportWorkspaceBundle, importWorkspaceBundle,
  openProjectFileDialog, resetWorkspace, resetCurrentProject, getStorageEstimate
} from '../db';
import { Download, Upload, Trash2, Sun, Moon, Database, RefreshCw, Bell, FolderKanban, HardDrive } from 'lucide-react';
import { seedDemoData } from '../data/demoData';
import { useTaskStore } from '../store/useTaskStore';
import { useDataStore } from '../store/useDataStore';
import { exportFullJson, exportTasksToCsv, exportRaidToCsv, exportToCsv } from '../utils/export';
import { projectConfigQueries, activityQueries } from '../db/queries';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendDesktopNotification,
} from '../utils/notifications';
import { formatBytes } from '../components/workspace/workspaceUtils';

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useUIStore();
  const { projects, refresh: refreshWorkspace } = useWorkspaceStore();
  const [resetConfirmProject, setResetConfirmProject] = useState(false);
  const [resetConfirmAll, setResetConfirmAll] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(getNotificationPermission());
  const [notifMsg, setNotifMsg] = useState('');
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number; persisted: boolean } | null>(null);

  const loadTasks = useTaskStore(s => s.load);
  const loadAll = useDataStore(s => s.loadAll);

  useEffect(() => {
    void getStorageEstimate().then(setStorageEstimate);
  }, []);

  async function handleEnableNotifications() {
    const granted = await requestNotificationPermission();
    setNotifPermission(getNotificationPermission());
    if (granted) {
      setNotifMsg('Desktop notifications enabled!');
      sendDesktopNotification('PTT Notifications Enabled', 'You will now receive desktop notifications for critical project alerts.');
      setTimeout(() => setNotifMsg(''), 3000);
    } else {
      setNotifMsg('Notification permission was not granted by your system.');
      setTimeout(() => setNotifMsg(''), 4000);
    }
  }

  function handleTestNotification() {
    const sent = sendDesktopNotification(
      'PTT Test Notification',
      'This is a test desktop notification from Project Tracking Tool.'
    );
    if (sent) {
      setNotifMsg('Test notification sent!');
    } else {
      setNotifMsg('Could not send notification. Please enable permission first.');
    }
    setTimeout(() => setNotifMsg(''), 3000);
  }

  async function handleImportProject() {
    try {
      const fileName = await openProjectFileDialog();
      if (fileName) {
        loadTasks();
        loadAll();
        await refreshWorkspace();
        setImportMsg(`Project "${fileName}" imported into workspace!`);
        setTimeout(() => setImportMsg(''), 3500);
      }
    } catch (err) {
      setImportMsg('Failed to import project: ' + String(err));
    }
  }

  async function handleExportWorkspace() {
    try {
      const count = await exportWorkspaceBundle();
      setImportMsg(`Exported bundle with ${count} project(s)!`);
      setTimeout(() => setImportMsg(''), 3500);
    } catch (err) {
      setImportMsg('Failed to export bundle: ' + String(err));
    }
  }

  async function handleRestoreWorkspace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const count = await importWorkspaceBundle(file);
      await refreshWorkspace();
      loadTasks();
      loadAll();
      setImportMsg(`Restored ${count} project(s) into workspace!`);
      setTimeout(() => setImportMsg(''), 3500);
    } catch (err) {
      setImportMsg('Failed to restore bundle: ' + String(err));
    } finally {
      e.target.value = '';
    }
  }

  async function handleResetCurrentProject() {
    if (!resetConfirmProject) { setResetConfirmProject(true); return; }
    await resetCurrentProject();
    loadTasks();
    loadAll();
    await refreshWorkspace();
    setResetConfirmProject(false);
    setImportMsg('Current project reset to a clean state.');
    setTimeout(() => setImportMsg(''), 3000);
  }

  async function handleResetAllWorkspace() {
    if (!resetConfirmAll) { setResetConfirmAll(true); return; }
    await resetWorkspace();
  }

  function handleReseed() {
    seedDemoData();
    loadTasks();
    loadAll();
    void refreshWorkspace();
    setImportMsg('Demo data added to the active project!');
    setTimeout(() => setImportMsg(''), 3000);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Appearance, multi-project workspace, backups and storage</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 680 }}>
        {/* Appearance */}
        <div className="card">
          <div className="card-header"><Sun size={16} color="var(--accent)" /><span className="section-title">Appearance</span></div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Theme</label>
              <div className="flex gap-3 mt-2">
                {(['dark', 'light'] as const).map(t => (
                  <button
                    key={t}
                    className={`btn${theme === t ? ' btn-primary' : ' btn-secondary'}`}
                    onClick={() => setTheme(t)}
                    style={{ minWidth: 80 }}
                  >
                    {t === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Workspace & Multi-Project */}
        <div className="card">
          <div className="card-header">
            <FolderKanban size={16} color="var(--accent)" />
            <span className="section-title">Multi-Project Workspace</span>
            <span className="badge badge-primary" style={{ marginLeft: 'auto' }}>
              {projects.length} project{projects.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              PTT is completely web-first and works without any executable or cloud requirement.
              Your projects are isolated in browser storage as fast in-memory SQLite instances.
            </p>

            {storageEstimate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                <Database size={16} color="var(--accent)" />
                <div>
                  <strong>Storage Usage:</strong> {formatBytes(storageEstimate.usage)} used
                  {storageEstimate.persisted && <span style={{ color: 'var(--success)', marginLeft: 8 }}>● Persistent</span>}
                </div>
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <button className="btn btn-primary" onClick={() => navigate('/projects')}>
                <FolderKanban size={14} /> Open Projects Hub
              </button>
              <button className="btn btn-secondary" onClick={() => useWorkspaceStore.getState().setSwitcherOpen(true)}>
                Quick Switcher (Alt+P)
              </button>
              <button className="btn btn-secondary" onClick={() => useWorkspaceStore.getState().setNewProjectOpen(true)}>
                + New Project
              </button>
            </div>
          </div>
        </div>

        {/* Database Backup & Restore */}
        <div className="card">
          <div className="card-header"><Database size={16} color="var(--accent)" /><span className="section-title">Database Backup &amp; Portability</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Export individual project files (<code>.ptt</code>) or a full workspace bundle (<code>.pttw</code>) containing all your projects.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button className="btn btn-secondary" onClick={saveDbNow}>
                <Download size={14} /> Save Current Now
              </button>
              <button className="btn btn-secondary" onClick={() => exportProjectFile()}>
                <Download size={14} /> Export Current (.ptt)
              </button>
              <button className="btn btn-secondary" onClick={handleExportWorkspace}>
                <Download size={14} /> Backup All Projects (.pttw)
              </button>
              <button className="btn btn-secondary" onClick={handleImportProject}>
                <Upload size={14} /> Import Project (.ptt)
              </button>
              <label className="btn btn-secondary cursor-pointer">
                <HardDrive size={14} /> Restore Bundle (.pttw)
                <input
                  type="file"
                  accept=".pttw,application/json"
                  style={{ display: 'none' }}
                  onChange={handleRestoreWorkspace}
                />
              </label>
            </div>
            {importMsg && <div style={{ color: 'var(--success)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{importMsg}</div>}
          </div>
        </div>

        {/* Desktop Notifications */}
        <div className="card">
          <div className="card-header">
            <Bell size={16} color="var(--accent)" />
            <span className="section-title">System & Desktop Notifications</span>
            <span
              className={`badge ${notifPermission === 'granted' ? 'badge-success' : notifPermission === 'denied' ? 'badge-danger' : 'badge-neutral'}`}
              style={{ marginLeft: 'auto', textTransform: 'capitalize' }}
            >
              {notifPermission}
            </span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Enable native system notifications to receive alerts for impending milestones, overdue tasks, and critical risks.
            </p>
            <div className="flex gap-3 flex-wrap">
              {notifPermission !== 'granted' ? (
                <button className="btn btn-primary" onClick={handleEnableNotifications}>
                  <Bell size={14} /> Enable Desktop Notifications
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={handleTestNotification}>
                  <Bell size={14} /> Send Test Notification
                </button>
              )}
            </div>
            {notifMsg && (
              <div style={{ color: notifMsg.includes('enabled') || notifMsg.includes('sent') ? 'var(--success)' : 'var(--danger)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                {notifMsg}
              </div>
            )}
          </div>
        </div>

        {/* Data Export & Portability (Section 27) */}
        <div className="card">
          <div className="card-header"><Download size={16} color="var(--accent)" /><span className="section-title">Data Export & Portability</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Extract active project data into open formats for reporting, spreadsheets, or archiving.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  const dataStore = useDataStore.getState();
                  const taskStore = useTaskStore.getState();
                  exportFullJson({
                    projectConfig: projectConfigQueries.get(),
                    tasks: taskStore.tasks,
                    milestones: dataStore.milestones,
                    risks: dataStore.risks,
                    issues: dataStore.issues,
                    decisions: dataStore.decisions,
                    actions: dataStore.actions,
                    communications: dataStore.communications,
                    stakeholders: dataStore.stakeholders,
                    resources: dataStore.resources,
                    budgetItems: dataStore.budgetItems,
                    changeRequests: dataStore.changeRequests,
                    meetings: dataStore.meetings,
                    notes: dataStore.notes,
                  });
                }}
              >
                <Download size={14} /> Export All (JSON)
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => exportTasksToCsv(useTaskStore.getState().tasks)}
              >
                <Download size={14} /> Export Tasks (CSV)
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  const s = useDataStore.getState();
                  exportRaidToCsv(s.risks, s.actions, s.issues, s.decisions);
                }}
              >
                <Download size={14} /> Export RAID Log (CSV)
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  const log = activityQueries.getRecent(9999);
                  const headers = ['Date', 'Entity Type', 'Entity Title', 'Action', 'Details'];
                  const rows = log.map(a => [a.createdAt, a.entityType, a.entityTitle, a.action, a.description || '']);
                  exportToCsv(`audit-trail-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
                }}
              >
                <Download size={14} /> Export Audit Trail (CSV)
              </button>
            </div>
          </div>
        </div>

        {/* Demo data */}
        <div className="card">
          <div className="card-header"><RefreshCw size={16} color="var(--accent)" /><span className="section-title">Demo Data</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Optionally load sample project data to test or explore features in the active project.
            </p>
            <button className="btn btn-secondary" onClick={handleReseed} style={{ alignSelf: 'flex-start' }}>
              <RefreshCw size={14} /> Add Demo Data
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="card" style={{ borderColor: 'var(--danger-border)' }}>
          <div className="card-header"><Trash2 size={16} color="var(--danger)" /><span className="section-title" style={{ color: 'var(--danger)' }}>Danger Zone</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Reset Active Project</h4>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>
                Clears all tasks, RAID items, and notes from the active project. Other projects in your workspace remain safe.
              </p>
              <button
                className="btn btn-secondary mt-2"
                onClick={handleResetCurrentProject}
                style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
              >
                <Trash2 size={13} /> {resetConfirmProject ? 'Click again to confirm project reset' : 'Reset Active Project'}
              </button>
            </div>

            <hr style={{ borderColor: 'var(--border-subtle)', margin: '4px 0' }} />

            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}>Reset Entire Workspace</h4>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>
                Permanently deletes <strong>all projects</strong> from browser storage. Make sure you have exported a workspace backup first.
              </p>
              <button
                className="btn btn-danger mt-2"
                onClick={handleResetAllWorkspace}
              >
                <Trash2 size={14} /> {resetConfirmAll ? 'Click again to confirm FULL WORKSPACE RESET' : 'Reset All Workspace Data'}
              </button>
              {resetConfirmAll && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)', marginTop: 4 }}>⚠️ This will permanently delete all projects from IndexedDB.</p>}
            </div>
          </div>
        </div>

        {/* About */}
        <div className="card">
          <div className="card-header"><span className="section-title">About</span></div>
          <div className="card-body">
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <strong>Project Tracking Tool (PTT)</strong> — Local-first IT project management workspace.<br />
              Deployable directly on Vercel or any static host. No server dependencies, no login required.<br />
              All data stays on your machine using in-browser SQLite WASM + IndexedDB persistence.
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 8 }}>
              Keyboard shortcuts: <code>Alt+P</code> Project Switcher · <code>Ctrl+K</code> Quick Capture · <code>Ctrl+/</code> Search
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
