import type { Database } from 'sql.js';
import { SCHEMA_VERSION } from './schema';

interface Migration {
  version: number;
  up: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 2,
    up: `
      CREATE TABLE IF NOT EXISTS weekly_reviews (
        id TEXT PRIMARY KEY,
        week_number INTEGER NOT NULL,
        year INTEGER NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        overall_health TEXT DEFAULT 'on-track',
        summary TEXT DEFAULT '',
        achievements TEXT DEFAULT '',
        priorities_next_week TEXT DEFAULT '',
        blockers_notes TEXT DEFAULT '',
        snapshot_json TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_weekly_reviews_week ON weekly_reviews(year DESC, week_number DESC);
    `,
  },
];

export async function runMigrations(db: Database): Promise<void> {
  // Ensure schema_version table has current version
  const result = db.exec(`SELECT MAX(version) as v FROM schema_version`);
  const currentVersion = (result[0]?.values?.[0]?.[0] as number) ?? 0;

  if (currentVersion === 0) {
    db.run(`INSERT OR IGNORE INTO schema_version (version) VALUES (?)`, [SCHEMA_VERSION]);
    return;
  }

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      db.run(migration.up);
      db.run(`INSERT INTO schema_version (version) VALUES (?)`, [migration.version]);
      console.log(`Applied migration v${migration.version}`);
    }
  }
}
