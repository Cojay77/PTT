// ============================================================
// Project Workspace Store — IndexedDB persistence for multiple projects
// ------------------------------------------------------------
// Each project is an independent SQLite database (binary) stored in
// IndexedDB, plus a lightweight metadata record used by the project
// switcher / projects hub. IndexedDB is used instead of localStorage
// because it supports binary data and a much larger quota.
// ============================================================

export interface WorkspaceProjectSummary {
  status: string;
  phase: string;
  manager: string;
  targetDate: string;
  openTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  openRisks: number;
  criticalRisks: number;
  openIssues: number;
  milestonesTotal: number;
  milestonesDone: number;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  code: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  sizeBytes: number;
  summary?: WorkspaceProjectSummary;
  /** Desktop (Electron) only: file on disk this project is linked to */
  linkedFilePath?: string | null;
}

const IDB_NAME = 'ptt_workspace';
const IDB_VERSION = 1;
const META_STORE = 'projects';
const DATA_STORE = 'project_data';
const ACTIVE_KEY = 'ptt_active_project';

export const PROJECT_COLORS = [
  'hsl(217, 91%, 60%)', // blue
  'hsl(262, 72%, 62%)', // violet
  'hsl(174, 72%, 42%)', // teal
  'hsl(25, 90%, 56%)',  // orange
  'hsl(330, 75%, 60%)', // pink
  'hsl(145, 60%, 45%)', // green
  'hsl(45, 95%, 52%)',  // amber
  'hsl(195, 85%, 50%)', // cyan
];

export function pickProjectColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PROJECT_COLORS[h % PROJECT_COLORS.length];
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openIdb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(META_STORE)) idb.createObjectStore(META_STORE, { keyPath: 'id' });
      if (!idb.objectStoreNames.contains(DATA_STORE)) idb.createObjectStore(DATA_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
    req.onblocked = () => console.warn('[PTT] Workspace database upgrade blocked by another tab.');
  });
  return dbPromise;
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

export async function listProjects(): Promise<WorkspaceProject[]> {
  const idb = await openIdb();
  const tx = idb.transaction(META_STORE, 'readonly');
  const all = await reqToPromise(tx.objectStore(META_STORE).getAll() as IDBRequest<WorkspaceProject[]>);
  return all.sort((a, b) => (b.lastOpenedAt || '').localeCompare(a.lastOpenedAt || ''));
}

export async function getProjectMeta(id: string): Promise<WorkspaceProject | null> {
  const idb = await openIdb();
  const tx = idb.transaction(META_STORE, 'readonly');
  const res = await reqToPromise(tx.objectStore(META_STORE).get(id) as IDBRequest<WorkspaceProject | undefined>);
  return res ?? null;
}

export async function putProjectMeta(meta: WorkspaceProject): Promise<void> {
  const idb = await openIdb();
  const tx = idb.transaction(META_STORE, 'readwrite');
  tx.objectStore(META_STORE).put(meta);
  await txDone(tx);
}

/** Atomically write both the binary database and its metadata. */
export async function putProject(meta: WorkspaceProject, data: Uint8Array): Promise<void> {
  const idb = await openIdb();
  const tx = idb.transaction([META_STORE, DATA_STORE], 'readwrite');
  tx.objectStore(META_STORE).put({ ...meta, sizeBytes: data.byteLength });
  tx.objectStore(DATA_STORE).put(data, meta.id);
  await txDone(tx);
}

export async function loadProjectData(id: string): Promise<Uint8Array | null> {
  const idb = await openIdb();
  const tx = idb.transaction(DATA_STORE, 'readonly');
  const res = await reqToPromise(tx.objectStore(DATA_STORE).get(id) as IDBRequest<Uint8Array | ArrayBuffer | undefined>);
  if (!res) return null;
  return res instanceof Uint8Array ? res : new Uint8Array(res);
}

export async function deleteProjectRecord(id: string): Promise<void> {
  const idb = await openIdb();
  const tx = idb.transaction([META_STORE, DATA_STORE], 'readwrite');
  tx.objectStore(META_STORE).delete(id);
  tx.objectStore(DATA_STORE).delete(id);
  await txDone(tx);
}

export async function deleteWorkspace(): Promise<void> {
  if (dbPromise) {
    try { (await dbPromise).close(); } catch { /* noop */ }
    dbPromise = null;
  }
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(IDB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
  localStorage.removeItem(ACTIVE_KEY);
}

export function getStoredActiveProjectId(): string | null {
  try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
}

export function setStoredActiveProjectId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch { /* noop */ }
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch { /* noop */ }
  return false;
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number; persisted: boolean } | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const est = await navigator.storage.estimate();
    const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    return { usage: est.usage || 0, quota: est.quota || 0, persisted };
  } catch {
    return null;
  }
}
