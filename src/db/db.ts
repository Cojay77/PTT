// ============================================================
// Database Layer — sql.js SQLite in-browser
// ============================================================
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import { SCHEMA } from './schema';
import { runMigrations } from './migrations';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

const DB_KEY = 'ptt_db';

let currentProjectFilePath: string | null = null;
let projectChangeListeners: Array<(filePath: string | null) => void> = [];

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

// Load database from localStorage (or create fresh)
export async function initDatabase(): Promise<Database> {
  if (db) return db;

  const sql = await getSql();
  const saved = localStorage.getItem(DB_KEY);

  if (saved) {
    // Restore from base64 string
    const binaryStr = atob(saved);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    db = new sql.Database(bytes);
  } else {
    db = new sql.Database();
    db.run(SCHEMA);
  }

  await runMigrations(db);

  // Setup Electron listeners if in desktop app
  setupElectronBridge();

  return db;
}

function setupElectronBridge(): void {
  if (typeof window === 'undefined' || !window.electronAPI) return;

  window.electronAPI.onProjectLoaded(async (payload) => {
    try {
      const sql = await getSql();
      const bytes = new Uint8Array(payload.data);
      db = new sql.Database(bytes);
      await runMigrations(db);
      notifyProjectChange(payload.filePath);
      saveDbNow();
      window.dispatchEvent(new CustomEvent('ptt:data-reloaded'));
    } catch (err) {
      console.error('Failed to load project from Electron:', err);
    }
  });

  window.electronAPI.onNewProject(async () => {
    try {
      const sql = await getSql();
      db = new sql.Database();
      db.run(SCHEMA);
      await runMigrations(db);
      notifyProjectChange(null);
      saveDbNow();
      window.dispatchEvent(new CustomEvent('ptt:data-reloaded'));
    } catch (err) {
      console.error('Failed to create new project:', err);
    }
  });

  window.electronAPI.onRequestSave(() => {
    saveDbNow();
  });

  window.electronAPI.onRequestSaveAs(async () => {
    await saveProjectAsDialog();
  });
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

// Persist to localStorage and/or active desktop file
let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleDbSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveDbNow();
  }, 500);
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

export function saveDbNow(): void {
  if (!db) return;
  try {
    const data = db.export();
    const base64 = uint8ArrayToBase64(data);
    localStorage.setItem(DB_KEY, base64);

    // If running in Electron with an active project file, save directly to disk
    if (typeof window !== 'undefined' && window.electronAPI && currentProjectFilePath) {
      window.electronAPI.saveProject(data, currentProjectFilePath);
    }
  } catch (err) {
    console.error('Failed to save database:', err);
  }
}

// Save Project As (.ptt) via native desktop dialog or browser download
export async function saveProjectAsDialog(suggestedName?: string): Promise<string | null> {
  if (!db) return null;
  const data = db.export();
  const defaultName: string = suggestedName || (currentProjectFilePath ? currentProjectFilePath.split(/[\\/]/).pop() || 'Project.ptt' : 'Project.ptt');

  if (typeof window !== 'undefined' && window.electronAPI) {
    const res = await window.electronAPI.saveProjectAs(data, defaultName);
    if (res?.filePath) {
      notifyProjectChange(res.filePath);
      return res.filePath;
    }
    return null;
  }

  // Web fallback: download .ptt file
  const blob = new Blob([new Uint8Array(data)], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName.endsWith('.ptt') ? defaultName : `${defaultName}.ptt`;
  a.click();
  URL.revokeObjectURL(url);
  return a.download;
}

// Open Project File (.ptt / .db) via native desktop dialog or browser file picker
export async function openProjectFileDialog(): Promise<string | null> {
  const sql = await getSql();

  if (typeof window !== 'undefined' && window.electronAPI) {
    const res = await window.electronAPI.openProjectFile();
    if (res) {
      const bytes = new Uint8Array(res.data);
      db = new sql.Database(bytes);
      await runMigrations(db);
      notifyProjectChange(res.filePath);
      saveDbNow();
      window.dispatchEvent(new CustomEvent('ptt:data-reloaded'));
      return res.fileName;
    }
    return null;
  }

  // Web file input fallback
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ptt,.db,application/x-sqlite3';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        db = new sql.Database(bytes);
        await runMigrations(db);
        notifyProjectChange(file.name);
        saveDbNow();
        window.dispatchEvent(new CustomEvent('ptt:data-reloaded'));
        resolve(file.name);
      } catch (err) {
        console.error('Failed to import project file:', err);
        resolve(null);
      }
    };
    input.click();
  });
}

// Create a new blank project
export async function createNewBlankProject(): Promise<void> {
  const sql = await getSql();
  db = new sql.Database();
  db.run(SCHEMA);
  await runMigrations(db);
  notifyProjectChange(null);
  saveDbNow();
  window.dispatchEvent(new CustomEvent('ptt:data-reloaded'));
}

// Export full database as downloadable file
export function exportDatabase(): void {
  if (!db) return;
  const data = db.export();
  const blob = new Blob([new Uint8Array(data)], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `project-backup-${new Date().toISOString().split('T')[0]}.ptt`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import database from file
export async function importDatabase(file: File): Promise<void> {
  const sql = await getSql();
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  db = new sql.Database(bytes);
  await runMigrations(db);
  notifyProjectChange(file.name);
  saveDbNow();
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
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
