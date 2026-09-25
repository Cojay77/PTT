import { useState } from 'react';
import { useUIStore } from '../store/useUIStore';
import { exportDatabase, importDatabase, saveDbNow } from '../db';
import { Download, Upload, Trash2, Sun, Moon, Database, RefreshCw, Bell } from 'lucide-react';
import { hasDemoData, seedDemoData } from '../data/demoData';
import { useTaskStore } from '../store/useTaskStore';
import { useDataStore } from '../store/useDataStore';
import { exportFullJson, exportTasksToCsv, exportRaidToCsv, exportToCsv } from '../utils/export';
import { projectConfigQueries, activityQueries } from '../db/queries';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendDesktopNotification,
} from '../utils/notifications';

export default function Settings() {
  const { theme, setTheme } = useUIStore();
  const [resetConfirm, setResetConfirm] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(getNotificationPermission());
  const [notifMsg, setNotifMsg] = useState('');
  const loadTasks = useTaskStore(s => s.load);
  const loadAll = useDataStore(s => s.loadAll);

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

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ptt,.db,application/x-sqlite3';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        await importDatabase(file);
        loadTasks();
        loadAll();
        setImportMsg('Database imported successfully!');
        setTimeout(() => setImportMsg(''), 3000);
      } catch (err) {
        setImportMsg('Failed to import database: ' + String(err));
      }
    };
    input.click();
  }

  function handleReset() {
    if (!resetConfirm) { setResetConfirm(true); return; }
    localStorage.removeItem('ptt_db');
    window.location.reload();
  }

  function handleReseed() {
    seedDemoData();
    loadTasks();
    loadAll();
    setImportMsg('Demo data added!');
    setTimeout(() => setImportMsg(''), 3000);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Appearance, data management, database backup</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
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

        {/* Desktop Notifications (F-18) */}
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
              Enable native system notifications to receive alerts for impending milestones, overdue tasks, and critical risks even when PTT is minimized.
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

        {/* Database */}
        <div className="card">
          <div className="card-header"><Database size={16} color="var(--accent)" /><span className="section-title">Database Backup & Restore</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Your data is stored locally in <strong>localStorage</strong> as a SQLite database. Export regularly to keep a backup.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button className="btn btn-secondary" onClick={saveDbNow}>
                <Download size={14} /> Save Now
              </button>
              <button className="btn btn-secondary" onClick={exportDatabase}>
                <Download size={14} /> Export Backup (.db)
              </button>
              <button className="btn btn-secondary" onClick={handleImport}>
                <Upload size={14} /> Import Database (.db)
              </button>
            </div>
            {importMsg && <div style={{ color: 'var(--success)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{importMsg}</div>}
          </div>
        </div>

        {/* Data Export & Portability (Section 27) */}
        <div className="card">
          <div className="card-header"><Download size={16} color="var(--accent)" /><span className="section-title">Data Export & Portability</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Extract project data into open formats for reporting, spreadsheets, or archiving.
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
              Add the sample "Customer Portal Migration" project data to explore all features.
            </p>
            <button className="btn btn-secondary" onClick={handleReseed} style={{ alignSelf: 'flex-start' }}>
              <RefreshCw size={14} /> Add Demo Data
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="card" style={{ borderColor: 'var(--danger-border)' }}>
          <div className="card-header"><Trash2 size={16} color="var(--danger)" /><span className="section-title" style={{ color: 'var(--danger)' }}>Danger Zone</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Permanently delete all project data from localStorage and reset the application to a blank state.
            </p>
            <button
              className={`btn btn-danger`}
              onClick={handleReset}
              style={{ alignSelf: 'flex-start' }}
            >
              <Trash2 size={14} /> {resetConfirm ? 'Click again to confirm RESET' : 'Reset All Data'}
            </button>
            {resetConfirm && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)' }}>⚠️ This will permanently delete all data. Export a backup first!</p>}
          </div>
        </div>

        {/* About */}
        <div className="card">
          <div className="card-header"><span className="section-title">About</span></div>
          <div className="card-body">
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <strong>Project Tracking Tool</strong> — Local-first IT project management workspace.<br />
              Built with React + TypeScript + sql.js (SQLite WASM).<br />
              All data stays on your machine. No cloud. No account. No dependencies.
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 8 }}>
              Keyboard shortcuts: <code>Ctrl+K</code> Quick Capture · <code>Ctrl+/</code> Search
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
