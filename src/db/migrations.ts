import type { Database } from 'sql.js';
import { SCHEMA_VERSION } from './schema';

interface Migration {
  version: number;
  up: string;
}

const MIGRATIONS: Migration[] = [
  // Future migrations go here
  // { version: 2, up: `ALTER TABLE tasks ADD COLUMN new_field TEXT DEFAULT '';` },
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
