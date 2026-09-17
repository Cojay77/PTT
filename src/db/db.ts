// ============================================================
// Database Layer — sql.js SQLite in-browser
// ============================================================
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import { SCHEMA } from './schema';
import { runMigrations } from './migrations';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

const DB_KEY = 'ptt_db';

// Initialize sql.js WASM
async function getSql(): Promise<SqlJsStatic> {
  if (SQL) return SQL;
  SQL = await initSqlJs({
    locateFile: (file: string) => `/${file}`,
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
  return db;
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

// Persist to localStorage (called after every write)
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
  } catch (err) {
    console.error('Failed to save database:', err);
  }
}

// Export full database as downloadable file
export function exportDatabase(): void {
  if (!db) return;
  const data = db.export();
  const blob = new Blob([new Uint8Array(data)], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `project-backup-${new Date().toISOString().split('T')[0]}.db`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import database from file
export async function importDatabase(file: File): Promise<void> {
  const sql = await getSql();
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  db = new sql.Database(bytes);
  saveDbNow();
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
