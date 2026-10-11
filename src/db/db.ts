// ============================================================
// Database Layer — sql.js SQLite in-browser
// ------------------------------------------------------------
// Multi-project workspace: every project is an independent SQLite
// database persisted in IndexedDB (see ./projectStore.ts). Exactly one
// project is "active" (loaded in memory) at a time; switching projects
// flushes pending writes, then loads the other database.
// ============================================================
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import { SCHEMA } from './schema';
import { runMigrations } from './migrations';
import {
  listProjects, getProjectMeta, putProjectMeta, putProject, loadProjectData,
  deleteProjectRecord, deleteWorkspace, getStoredActiveProjectId, setStoredActiveProjectId,
  requestPersistentStorage, pickProjectColor,
  type WorkspaceProject, type WorkspaceProjectSummary,
} from './projectStore';

export type { WorkspaceProject, WorkspaceProjectSummary } from './projectStore';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

/** Legacy single-project key (pre multi-project). Migrated on first launch. */
const DB_KEY = 'ptt_db';

let activeProjectId: string | null = null;
let freshWorkspace = false;
let initPromise: Promise<Database> | null = null;

let currentProjectFilePath: string | null = null;
let projectChangeListeners: Array<(filePath: string | null) => void> = [];

const TAB_ID = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random());
const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ptt_workspace') : null;

export function onProjectFileChange(cb: (filePath: string | null) => void): () => void {
  projectChangeListeners.push(cb);
  return () => {
    projectChangeListeners = projectChangeListeners.filter(l => l !== cb);
  };
}

function notifyProjectChange(filePath: string | null) {
  currentProjectFilePath = filePath;
  projectChangeListeners.forEach(cb => cb(filePath));
}

export function getCurrentProjectFilePath(): string | null {
  return currentProjectFilePath;
}

export function getActiveProjectId(): string | null {
  return activeProjectId;
}

/** True when the app was launched on an empty workspace (first ever run). */
export function isFreshWorkspace(): boolean {
  return freshWorkspace;
}

function emitWorkspaceChanged(broadcast = true) {
  window.dispatchEvent(new CustomEvent('ptt:workspace-changed'));
  if (broadcast) channel?.postMessage({ type: 'workspace-changed', from: TAB_ID });
}

// Initialize sql.js WASM
async function getSql(): Promise<SqlJsStatic> {
  if (SQL) return SQL;
  SQL = await initSqlJs({
    locateFile: (file: string) => {
      if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
        return `./${file}`;
      }
      return `/${file}`;
    },
  });
  return SQL;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function base64ToBytes(b64: string): Uint8Array {
  const binaryStr = atob(b64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 0x8000;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

function safeFileName(name: string): string {
  return (name || 'Project').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_') || 'Project';
}

function downloadBytes(data: Uint8Array, fileName: string, mime = 'application/octet-stream') {
  const blob = new Blob([new Uint8Array(data)], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function openDatabaseFromBytes(bytes?: Uint8Array | null): Promise<Database> {
  const sql = await getSql();
  const d = bytes ? new sql.Database(bytes) : new sql.Database();
  if (!bytes) d.run(SCHEMA);
  await runMigrations(d);
  return d;
}

function replaceActiveDb(next: Database) {
  if (db && db !== next) {
    try { db.close(); } catch { /* noop */ }
  }
  db = next;
}

function scalar(d: Database, sql: string, params: (string | number)[] = []): number {
  try {
    const stmt = d.prepare(sql);
    stmt.bind(params);
    let v = 0;
    if (stmt.step()) v = Number(stmt.get()[0]) || 0;
    stmt.free();
    return v;
  } catch {
    return 0;
  }
}

interface ProjectInfo { name: string; code: string; summary: WorkspaceProjectSummary }

function readProjectInfo(d: Database): ProjectInfo {
  let cfg: Record<string, unknown> = {};
  try {
    const stmt = d.prepare(`SELECT name, code, status, current_phase, manager, target_date FROM project_config WHERE id = 'main'`);
    if (stmt.step()) cfg = stmt.getAsObject();
    stmt.free();
  } catch { /* noop */ }
  const today = new Date().toISOString().split('T')[0];
  const summary: WorkspaceProjectSummary = {
    status: (cfg.status as string) || '',
    phase: (cfg.current_phase as string) || '',
    manager: (cfg.manager as string) || '',
    targetDate: (cfg.target_date as string) || '',
    openTasks: scalar(d, `SELECT COUNT(*) FROM tasks WHERE is_backlog = 0 AND status NOT IN ('done','cancelled')`),
    overdueTasks: scalar(d, `SELECT COUNT(*) FROM tasks WHERE is_backlog = 0 AND status NOT IN ('done','cancelled') AND due_date != '' AND due_date < ?`, [today]),
    blockedTasks: scalar(d, `SELECT COUNT(*) FROM tasks WHERE is_backlog = 0 AND status = 'blocked'`),
    openRisks: scalar(d, `SELECT COUNT(*) FROM risks WHERE status NOT IN ('closed','accepted')`),
    criticalRisks: scalar(d, `SELECT COUNT(*) FROM risks WHERE status NOT IN ('closed','accepted') AND severity = 'critical'`),
    openIssues: scalar(d, `SELECT COUNT(*) FROM issues WHERE status IN ('open','in-progress','escalated')`),
    milestonesTotal: scalar(d, `SELECT COUNT(*) FROM milestones WHERE status != 'cancelled'`),
    milestonesDone: scalar(d, `SELECT COUNT(*) FROM milestones WHERE status = 'completed'`),
  };
  return { name: ((cfg.name as string) || '').trim(), code: (cfg.code as string) || '', summary };
}

function setConfigIdentity(d: Database, name: string, code?: string) {
  d.run(
    `INSERT INTO project_config (id, name, code) VALUES ('main', ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, code = excluded.code, updated_at = datetime('now')`,
    [name, code ?? '']
  );
}

async function registerNewProject(
  d: Database,
  opts: { name?: string; code?: string; color?: string; linkedFilePath?: string | null } = {}
): Promise<WorkspaceProject> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  if (opts.name) {
    setConfigIdentity(d, opts.name, opts.code ?? '');
  }
  const info = readProjectInfo(d);
  const meta: WorkspaceProject = {
    id,
    name: opts.name || info.name || 'My Project',
    code: opts.code ?? info.code ?? '',
    color: opts.color || pickProjectColor(id),
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    sizeBytes: 0,
    summary: info.summary,
    linkedFilePath: opts.linkedFilePath ?? null,
  };
  await putProject(meta, d.export());
  emitWorkspaceChanged();
  return meta;
}

async function activate(
  next: Database,
  meta: WorkspaceProject,
  lock?: { isReadOnly?: boolean; lockInfo?: { pilot: string; computer: string; timestamp: string } | null }
) {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  replaceActiveDb(next);
  activeProjectId = meta.id;
  setStoredActiveProjectId(meta.id);
  isReadOnlyMode = !!lock?.isReadOnly;
  activeLockInfo = lock?.lockInfo ?? null;
  const fresh = (await getProjectMeta(meta.id)) ?? meta;
  await putProjectMeta({ ...fresh, lastOpenedAt: new Date().toISOString() });
  notifyProjectChange(fresh.linkedFilePath ?? null);
  window.dispatchEvent(new CustomEvent('ptt:data-reloaded'));
  window.dispatchEvent(new CustomEvent('ptt:lock-status-changed', {
    detail: { isReadOnly: isReadOnlyMode, lockInfo: activeLockInfo },
  }));
  emitWorkspaceChanged();
}

// ------------------------------------------------------------
// Initialization (with clean slate reset)
// ------------------------------------------------------------
export async function initDatabase(): Promise<Database> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await getSql();
    void requestPersistentStorage();

    // Clean reset: purge any previous demo/example data so user starts completely clean
    const CLEAN_KEY = 'ptt_clean_slate_v2';
    if (!localStorage.getItem(CLEAN_KEY)) {
      localStorage.setItem(CLEAN_KEY, 'true');
      localStorage.removeItem(DB_KEY);
      await deleteWorkspace();
    }

    let projects = await listProjects();

    let targetId = getStoredActiveProjectId();
    if (!targetId || !projects.some(p => p.id === targetId)) targetId = projects[0]?.id ?? null;
    const bytes = targetId ? await loadProjectData(targetId) : null;

    let meta: WorkspaceProject | null = null;
    if (targetId && bytes) {
      db = await openDatabaseFromBytes(bytes);
      activeProjectId = targetId;
      meta = await getProjectMeta(targetId);
    } else {
      db = await openDatabaseFromBytes();
      freshWorkspace = true;
      meta = await registerNewProject(db, { name: 'My Project' });
      activeProjectId = meta.id;
    }

    setStoredActiveProjectId(activeProjectId);
    if (meta) {
      await putProjectMeta({ ...meta, lastOpenedAt: new Date().toISOString() });
      currentProjectFilePath = meta.linkedFilePath ?? null;
    }

    setupElectronBridge();
    setupCrossTabSync();
    setupLifecycleFlush();

    return db;
  })();

  try {
    return await initPromise;
  } catch (err) {
    initPromise = null;
    throw err;
  }
}

let isReadOnlyMode = false;
let activeLockInfo: { pilot: string; computer: string; timestamp: string } | null = null;

export function isReadOnlyProject(): boolean {
  return isReadOnlyMode;
}

export function getActiveLockInfo() {
  return activeLockInfo;
}

export function setReadOnlyMode(val: boolean): void {
  isReadOnlyMode = val;
  window.dispatchEvent(new CustomEvent('ptt:lock-status-changed', { detail: { isReadOnly: val } }));
}

function setupCrossTabSync(): void {
  if (!channel) return;
  channel.onmessage = async (ev: MessageEvent) => {
    const msg = ev.data as { type: string; from: string; projectId?: string };
    if (!msg || msg.from === TAB_ID) return;
    if (msg.type === 'project-saved' && msg.projectId && msg.projectId === activeProjectId) {
      const meta = await getProjectMeta(msg.projectId);
      window.dispatchEvent(new CustomEvent('ptt:external-change', {
        detail: { source: 'tab', projectId: msg.projectId, fileName: meta?.name || 'this project', filePath: '' },
      }));
    }
    emitWorkspaceChanged(false);
  };
}

function setupLifecycleFlush(): void {
  if (typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && saveTimer) void saveDbNow();
  });
  window.addEventListener('pagehide', () => {
    if (saveTimer) void saveDbNow();
  });
}

function setupElectronBridge(): void {
  if (typeof window === 'undefined' || !window.electronAPI) return;

  window.electronAPI.onProjectLoaded(async (payload) => {
    try {
      await adoptExternalFile(new Uint8Array(payload.data), payload.filePath, payload.fileName, {
        isReadOnly: !!payload.isLockedByOther,
        lockInfo: payload.lockInfo || null,
      });
    } catch (err) {
      console.error('Failed to load project from Electron:', err);
    }
  });

  window.electronAPI.onNewProject(async () => {
    try {
      await createProject({ name: 'New Project' });
    } catch (err) {
      console.error('Failed to create new project:', err);
    }
  });

  window.electronAPI.onRequestSave(() => {
    void saveDbNow();
  });

  window.electronAPI.onRequestSaveAs(async () => {
    await saveProjectAsDialog();
  });

  window.electronAPI.onExternalChange((payload) => {
    window.dispatchEvent(new CustomEvent('ptt:external-change', { detail: { ...payload, source: 'file' } }));
  });
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

// ------------------------------------------------------------
// Persistence
// ------------------------------------------------------------
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saveChain: Promise<void> = Promise.resolve();

export function scheduleDbSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveDbNow();
  }, 500);
}

/** Persist the active project to IndexedDB (and its linked desktop file, if any). */
export function saveDbNow(): Promise<void> {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (!db || !activeProjectId) return saveChain;

  const id = activeProjectId;
  let data: Uint8Array;
  let info: ProjectInfo;
  try {
    info = readProjectInfo(db);
    data = db.export();
  } catch (err) {
    console.error('Failed to export database:', err);
    return saveChain;
  }

  // Desktop app: also write the linked project file unless read-only
  if (typeof window !== 'undefined' && window.electronAPI && currentProjectFilePath && !isReadOnlyMode) {
    window.electronAPI.saveProject(data, currentProjectFilePath);
  }

  saveChain = saveChain
    .then(async () => {
      const existing = await getProjectMeta(id);
      if (!existing) return; // project was deleted meanwhile
      await putProject({
        ...existing,
        name: info.name || existing.name,
        code: info.code,
        summary: info.summary,
        updatedAt: new Date().toISOString(),
      }, data);
      channel?.postMessage({ type: 'project-saved', projectId: id, from: TAB_ID });
      emitWorkspaceChanged(false);
    })
    .catch((err) => {
      console.error('Failed to save database:', err);
      window.dispatchEvent(new CustomEvent('ptt:save-error', { detail: String(err) }));
    });
  return saveChain;
}

/** Wait for any pending (debounced) write of the active project to complete. */
export function flushPendingSave(): Promise<void> {
  if (saveTimer) return saveDbNow();
  return saveChain;
}

// ------------------------------------------------------------
// Workspace / multi-project operations
// ------------------------------------------------------------
export async function listWorkspaceProjects(): Promise<WorkspaceProject[]> {
  return listProjects();
}

export async function switchProject(id: string): Promise<void> {
  if (id === activeProjectId) return;
  await flushPendingSave();
  const bytes = await loadProjectData(id);
  const meta = await getProjectMeta(id);
  if (!bytes || !meta) throw new Error('Project data not found.');
  const next = await openDatabaseFromBytes(bytes);
  await activate(next, meta);
}

export type NewProjectTemplate = 'blank' | 'duplicate' | 'demo';

/**
 * Create a new project and make it active.
 * For 'demo', the caller is responsible for seeding demo data afterwards.
 */
export async function createProject(opts: {
  name: string; code?: string; color?: string; template?: NewProjectTemplate;
}): Promise<WorkspaceProject> {
  await flushPendingSave();
  const template = opts.template || 'blank';
  const next = template === 'duplicate' && db
    ? await openDatabaseFromBytes(db.export())
    : await openDatabaseFromBytes();
  setConfigIdentity(next, opts.name.trim() || 'New Project', opts.code?.trim() || '');
  const meta = await registerNewProject(next, { name: opts.name.trim() || 'New Project', code: opts.code?.trim() || '', color: opts.color });
  await activate(next, meta);
  return meta;
}

export async function importProjectFromBytes(
  bytes: Uint8Array,
  fileName: string,
  opts: { linkedFilePath?: string | null; activate?: boolean } = {}
): Promise<WorkspaceProject> {
  const next = await openDatabaseFromBytes(bytes);
  const info = readProjectInfo(next);
  const fallbackName = fileName.replace(/\.(ptt|db|sqlite)$/i, '').replace(/_/g, ' ');
  if (opts.activate === false) {
    const meta = await registerNewProject(next, { name: info.name || fallbackName, linkedFilePath: opts.linkedFilePath });
    next.close();
    return meta;
  }
  await flushPendingSave();
  const meta = await registerNewProject(next, { name: info.name || fallbackName, linkedFilePath: opts.linkedFilePath });
  await activate(next, meta);
  return meta;
}

/** Desktop: open a file from disk, reusing the workspace entry already linked to it. */
async function adoptExternalFile(
  bytes: Uint8Array,
  filePath: string,
  fileName: string,
  lock?: { isReadOnly?: boolean; lockInfo?: { pilot: string; computer: string; timestamp: string } | null }
): Promise<WorkspaceProject> {
  await flushPendingSave();
  const next = await openDatabaseFromBytes(bytes);
  const existing = (await listProjects()).find(p => p.linkedFilePath === filePath);
  let meta: WorkspaceProject;
  if (existing) {
    const info = readProjectInfo(next);
    meta = { ...existing, name: info.name || existing.name, code: info.code, summary: info.summary, updatedAt: new Date().toISOString() };
    await putProject(meta, next.export());
  } else {
    meta = await registerNewProject(next, {
      name: readProjectInfo(next).name || fileName.replace(/\.(ptt|db)$/i, ''),
      linkedFilePath: filePath,
    });
  }
  await activate(next, meta, lock);
  return meta;
}

export async function duplicateProject(id: string, newName?: string): Promise<WorkspaceProject> {
  let bytes: Uint8Array | null;
  if (id === activeProjectId && db) {
    await flushPendingSave();
    bytes = db.export();
  } else {
    bytes = await loadProjectData(id);
  }
  const source = await getProjectMeta(id);
  if (!bytes || !source) throw new Error('Project not found.');
  const copy = await openDatabaseFromBytes(bytes);
  const name = newName?.trim() || `Copy of ${source.name}`;
  setConfigIdentity(copy, name, source.code);
  const meta = await registerNewProject(copy, { name, code: source.code });
  copy.close();
  return meta;
}

export async function renameProject(id: string, name: string, code?: string): Promise<void> {
  const meta = await getProjectMeta(id);
  if (!meta) return;
  const finalName = name.trim() || meta.name;
  const finalCode = code !== undefined ? code.trim() : meta.code;
  if (id === activeProjectId && db) {
    setConfigIdentity(db, finalName, finalCode);
    await saveDbNow();
    window.dispatchEvent(new CustomEvent('ptt:data-reloaded'));
  } else {
    const bytes = await loadProjectData(id);
    if (!bytes) return;
    const d = await openDatabaseFromBytes(bytes);
    setConfigIdentity(d, finalName, finalCode);
    await putProject({ ...meta, name: finalName, code: finalCode, updatedAt: new Date().toISOString() }, d.export());
    d.close();
    emitWorkspaceChanged();
  }
}

export async function setProjectColor(id: string, color: string): Promise<void> {
  const meta = await getProjectMeta(id);
  if (!meta) return;
  await putProjectMeta({ ...meta, color });
  emitWorkspaceChanged();
}

export async function deleteProject(id: string): Promise<void> {
  if (id === activeProjectId) {
    const others = (await listProjects()).filter(p => p.id !== id);
    if (others.length > 0) {
      await switchProject(others[0].id);
    } else {
      await createProject({ name: 'New Project' });
    }
  }
  await deleteProjectRecord(id);
  emitWorkspaceChanged();
}

/** Re-read the active project from storage (e.g. after another tab saved it). */
export async function reloadActiveProjectFromStorage(): Promise<void> {
  if (!activeProjectId) return;
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  await saveChain;
  const bytes = await loadProjectData(activeProjectId);
  if (!bytes) return;
  replaceActiveDb(await openDatabaseFromBytes(bytes));
  window.dispatchEvent(new CustomEvent('ptt:data-reloaded'));
}

/** Download a project as a portable .ptt (SQLite) file. Defaults to the active project. */
export async function exportProjectFile(id?: string): Promise<void> {
  const targetId = id || activeProjectId;
  if (!targetId) return;
  let bytes: Uint8Array | null;
  if (targetId === activeProjectId && db) {
    await flushPendingSave();
    bytes = db.export();
  } else {
    bytes = await loadProjectData(targetId);
  }
  const meta = await getProjectMeta(targetId);
  if (!bytes) return;
  const date = new Date().toISOString().split('T')[0];
  downloadBytes(bytes, `${safeFileName(meta?.name || 'Project')}_${date}.ptt`, 'application/x-sqlite3');
}

interface WorkspaceBundle {
  format: 'ptt-workspace';
  version: 1;
  exportedAt: string;
  projects: Array<{ meta: WorkspaceProject; data: string }>;
}

/** Download every project in a single backup file (.pttw). */
export async function exportWorkspaceBundle(): Promise<number> {
  await flushPendingSave();
  const projects = await listProjects();
  const bundle: WorkspaceBundle = { format: 'ptt-workspace', version: 1, exportedAt: new Date().toISOString(), projects: [] };
  for (const meta of projects) {
    const bytes = await loadProjectData(meta.id);
    if (bytes) bundle.projects.push({ meta, data: uint8ArrayToBase64(bytes) });
  }
  const json = new TextEncoder().encode(JSON.stringify(bundle));
  downloadBytes(json, `PTT_Workspace_${new Date().toISOString().split('T')[0]}.pttw`, 'application/json');
  return bundle.projects.length;
}

/** Restore projects from a .pttw bundle. Existing projects with the same id are kept; imports get new ids. */
export async function importWorkspaceBundle(file: File): Promise<number> {
  const text = await file.text();
  const bundle = JSON.parse(text) as WorkspaceBundle;
  if (bundle?.format !== 'ptt-workspace' || !Array.isArray(bundle.projects)) {
    throw new Error('This file is not a PTT workspace backup (.pttw).');
  }
  const existingIds = new Set((await listProjects()).map(p => p.id));
  let count = 0;
  for (const entry of bundle.projects) {
    const bytes = base64ToBytes(entry.data);
    // Validate the database before storing it
    const check = await openDatabaseFromBytes(bytes);
    const info = readProjectInfo(check);
    const clash = existingIds.has(entry.meta.id);
    const id = clash ? crypto.randomUUID() : entry.meta.id;
    await putProject({
      ...entry.meta,
      id,
      name: clash ? `${entry.meta.name} (restored)` : entry.meta.name,
      summary: info.summary,
      linkedFilePath: null,
    }, check.export());
    check.close();
    existingIds.add(id);
    count++;
  }
  emitWorkspaceChanged();
  return count;
}

/** Wipe every project from this browser and restart with a fresh workspace. */
export async function resetWorkspace(): Promise<void> {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  db = null;
  activeProjectId = null;
  await deleteWorkspace();
  localStorage.removeItem(DB_KEY);
  channel?.postMessage({ type: 'workspace-changed', from: TAB_ID });
  window.location.reload();
}

/** Replace the active project's content with an empty database (keeps its name). */
export async function resetCurrentProject(): Promise<void> {
  if (!db || !activeProjectId) return;
  const info = readProjectInfo(db);
  const next = await openDatabaseFromBytes();
  setConfigIdentity(next, info.name || 'New Project', info.code);
  replaceActiveDb(next);
  await saveDbNow();
  window.dispatchEvent(new CustomEvent('ptt:data-reloaded'));
}

// ------------------------------------------------------------
// File-based open / save (desktop dialogs or browser fallbacks)
// ------------------------------------------------------------

// Open project directly by file path (e.g. from shared folder list)
export async function openProjectByFilePath(filePath: string, pilotName?: string): Promise<string | null> {
  if (typeof window !== 'undefined' && window.electronAPI) {
    const res = await window.electronAPI.openFileByPath(filePath, pilotName);
    if (res) {
      await adoptExternalFile(new Uint8Array(res.data), res.filePath, res.fileName, {
        isReadOnly: !!res.isLockedByOther,
        lockInfo: res.lockInfo || null,
      });
      return res.fileName;
    }
  }
  return null;
}

// Save Project As (.ptt) via native desktop dialog or browser download
export async function saveProjectAsDialog(suggestedName?: string): Promise<string | null> {
  if (!db) return null;
  const data = db.export();
  const defaultName: string = suggestedName || (currentProjectFilePath ? currentProjectFilePath.split(/[\\/]/).pop() || 'Project.ptt' : 'Project.ptt');

  if (typeof window !== 'undefined' && window.electronAPI) {
    const res = await window.electronAPI.saveProjectAs(data, defaultName);
    if (res?.filePath) {
      if (activeProjectId) {
        const meta = await getProjectMeta(activeProjectId);
        if (meta) await putProjectMeta({ ...meta, linkedFilePath: res.filePath });
      }
      notifyProjectChange(res.filePath);
      emitWorkspaceChanged();
      return res.filePath;
    }
    return null;
  }

  // Web fallback: download .ptt file
  const fileName = defaultName.endsWith('.ptt') ? defaultName : `${defaultName}.ptt`;
  downloadBytes(data, fileName);
  return fileName;
}

/** Let the user pick a .ptt/.db file. Resolves with the File or null. */
function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = (e) => resolve((e.target as HTMLInputElement).files?.[0] || null);
    input.click();
  });
}

// Open Project File (.ptt / .db): imported as a new project in the workspace and activated
export async function openProjectFileDialog(): Promise<string | null> {
  if (typeof window !== 'undefined' && window.electronAPI) {
    const res = await window.electronAPI.openProjectFile();
    if (res) {
      await adoptExternalFile(new Uint8Array(res.data), res.filePath, res.fileName);
      return res.fileName;
    }
    return null;
  }

  const file = await pickFile('.ptt,.db,.sqlite,application/x-sqlite3');
  if (!file) return null;
  try {
    const meta = await importProjectFromBytes(new Uint8Array(await file.arrayBuffer()), file.name);
    return meta.name;
  } catch (err) {
    console.error('Failed to import project file:', err);
    window.alert('This file could not be opened as a PTT project.');
    return null;
  }
}

/** Let the user pick a .pttw workspace backup and restore it. */
export async function openWorkspaceBundleDialog(): Promise<number> {
  const file = await pickFile('.pttw,application/json');
  if (!file) return 0;
  return importWorkspaceBundle(file);
}

// Create a new blank project
export async function createNewBlankProject(): Promise<void> {
  await createProject({ name: 'New Project' });
}

// Export the active project as a downloadable file
export function exportDatabase(): void {
  void exportProjectFile();
}

// Import a database file as a NEW project in the workspace
export async function importDatabase(file: File): Promise<void> {
  await importProjectFromBytes(new Uint8Array(await file.arrayBuffer()), file.name);
}

// Restore a database file INTO the active project (overwrites its content)
export async function restoreIntoCurrentProject(file: File): Promise<void> {
  const next = await openDatabaseFromBytes(new Uint8Array(await file.arrayBuffer()));
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  replaceActiveDb(next);
  await saveDbNow();
  window.dispatchEvent(new CustomEvent('ptt:data-reloaded'));
}

// Generic query helpers
export function query<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null | boolean)[] = []
): T[] {
  const database = getDb();
  const stmt = database.prepare(sql);
  const sanitizedParams = params.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p));
  stmt.bind(sanitizedParams as (string | number | null)[]);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null | boolean)[] = []
): T | null {
  const results = query<T>(sql, params);
  return results[0] ?? null;
}

export function execute(
  sql: string,
  params: (string | number | null | boolean)[] = []
): void {
  const database = getDb();
  const sanitizedParams = params.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p));
  database.run(sql, sanitizedParams as (string | number | null)[]);
  scheduleDbSave();
}

export function generateId(): string {
  return crypto.randomUUID();
}
