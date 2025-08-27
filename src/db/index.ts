import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

export interface Tenant {
  id: string; name: string; api_key: string; stripe_subscription_item_id?: string | null; forward_allow_hosts?: string | null; redact_paths?: string | null; stripe_customer_id?: string | null; free_fallback_quota?: number | null;
}

export function openDb(url: string) {
  const file = url.startsWith("file:") ? url.slice(5) : url;
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(file);
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');
  } catch { /* ignore */ }
  return db;
}

// Embedded schema (deployment-safe). Falls back to reading file if present for dev edits.
const EMBEDDED_SCHEMA = `create table if not exists tenants (
  id text primary key,
  name text not null,
  api_key text not null unique,
  stripe_subscription_item_id text,
  forward_allow_hosts text,
  redact_paths text,
  stripe_customer_id text,
  free_fallback_quota integer
);

create table if not exists fallback_usage (
  tenant_id text not null,
  period text not null,
  count integer not null default 0,
  primary key (tenant_id, period),
  foreign key (tenant_id) references tenants(id) on delete cascade
);

create table if not exists runs (
  trace_id text primary key,
  tenant_id text not null,
  cid text not null,
  decision text not null,
  repairs text not null,
  created_at text not null,
  foreign key (tenant_id) references tenants(id) on delete cascade
);`;

export function initDb(db: Database.Database) {
  let schema = EMBEDDED_SCHEMA;
  try {
    const schemaPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'schema.sql');
    if (fs.existsSync(schemaPath)) schema = fs.readFileSync(schemaPath, 'utf-8');
  } catch { /* ignore */ }
  db.exec(schema);
  // migrations table
  db.exec("create table if not exists migrations (id integer primary key autoincrement, name text not null unique, applied_at text not null)");
  // seed single tenant for dev
  if (process.env.TEST_API_KEY) {
    const exists = db.prepare("select id from tenants where api_key=?").get(process.env.TEST_API_KEY);
    if (!exists) {
      db.prepare("insert into tenants(id,name,api_key,forward_allow_hosts,redact_paths,free_fallback_quota) values(?,?,?,?,?,?)").run(
        nanoid(), "dev", process.env.TEST_API_KEY, JSON.stringify(["localhost","127.0.0.1"]), JSON.stringify(["auth.token","secret","credentials.*"]), null
      );
    }
  }
}

export function applyMigrations(db: Database.Database, migrations: Array<{ name: string; up: (db: Database.Database) => void }>) {
  const existing = new Set<string>((db.prepare('select name from migrations').all() as Array<{ name: string }>).map(r => r.name));
  for (const m of migrations) {
    if (existing.has(m.name)) continue;
    db.transaction(() => {
      m.up(db);
      db.prepare('insert into migrations(name, applied_at) values(?, ?)').run(m.name, new Date().toISOString());
    })();
  }
}

export function findTenantByKey(db: Database.Database, apiKey: string): Tenant | null {
  const row = db.prepare("select * from tenants where api_key=?").get(apiKey) as Tenant | undefined;
  return row || null;
}
