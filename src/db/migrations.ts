import type Database from 'better-sqlite3';
import { applyMigrations } from './index.js';

// Example future migration scaffold
export function runMigrations(db: Database.Database) {
  const migrations: Array<{ name: string; up: (db: Database.Database) => void }> = [
  { name: '2025-08-27-add-runs-created_at-index', up: (db) => { db.exec('create index if not exists runs_tenant_created_idx on runs(tenant_id, created_at)'); } }
  ];
  applyMigrations(db, migrations);
}
