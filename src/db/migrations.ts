import type Database from 'better-sqlite3';
import { applyMigrations } from './index.js';

// Example future migration scaffold
export function runMigrations(db: Database.Database) {
  const migrations: Array<{ name: string; up: (db: Database.Database) => void }> = [
    // { name: '2025-08-27-add-example', up: (db) => { db.exec('alter table tenants add column example text'); } }
  ];
  applyMigrations(db, migrations);
}
