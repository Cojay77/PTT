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
  {
    version: 3,
    up: `
      CREATE TABLE IF NOT EXISTS budget_items (
        id TEXT PRIMARY KEY,
        category TEXT DEFAULT 'general',
        description TEXT NOT NULL DEFAULT '',
        type TEXT DEFAULT 'opex',
        vendor TEXT DEFAULT '',
        planned_amount REAL DEFAULT 0,
        actual_amount REAL DEFAULT 0,
        forecast_amount REAL DEFAULT 0,
        currency TEXT DEFAULT 'EUR',
        status TEXT DEFAULT 'planned',
        invoice_date TEXT DEFAULT '',
        payment_date TEXT DEFAULT '',
        purchase_order TEXT DEFAULT '',
        phase TEXT DEFAULT '',
        milestone_id TEXT DEFAULT NULL,
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_budget_items_type ON budget_items(type);
      CREATE INDEX IF NOT EXISTS idx_budget_items_status ON budget_items(status);

      CREATE TABLE IF NOT EXISTS change_requests (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        description TEXT DEFAULT '',
        category TEXT DEFAULT 'scope',
        requestor TEXT DEFAULT '',
        request_date TEXT DEFAULT '',
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'draft',
        impact_scope TEXT DEFAULT '',
        impact_schedule TEXT DEFAULT '',
        impact_budget TEXT DEFAULT '',
        impact_resources TEXT DEFAULT '',
        impact_risk TEXT DEFAULT '',
        estimated_cost REAL DEFAULT 0,
        estimated_duration_days INTEGER DEFAULT 0,
        justification TEXT DEFAULT '',
        alternatives TEXT DEFAULT '',
        recommendation TEXT DEFAULT '',
        approver TEXT DEFAULT '',
        approval_date TEXT DEFAULT '',
        decision_notes TEXT DEFAULT '',
        linked_milestone_id TEXT DEFAULT NULL,
        linked_task_ids TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);
      CREATE INDEX IF NOT EXISTS idx_change_requests_priority ON change_requests(priority);
    `,
  },
  {
    version: 4,
    up: `
      ALTER TABLE meetings ADD COLUMN related_action_ids TEXT DEFAULT '';
      ALTER TABLE meetings ADD COLUMN related_task_ids TEXT DEFAULT '';
      ALTER TABLE meetings ADD COLUMN related_decision_ids TEXT DEFAULT '';
      ALTER TABLE decisions ADD COLUMN related_meeting_id TEXT DEFAULT NULL;
    `,
  },
];

function safeRunMigration(db: Database, sql: string) {
  const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    try {
      db.run(stmt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.toLowerCase().includes('duplicate column')) {
        console.warn('Migration statement warning:', msg, stmt);
      }
    }
  }
}

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
      safeRunMigration(db, migration.up);
      db.run(`INSERT INTO schema_version (version) VALUES (?)`, [migration.version]);
      console.log(`Applied migration v${migration.version}`);
    }
  }
}
