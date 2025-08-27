import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { ensureSubscriptionForTenant, getTenantUsageSummary, currentPeriod, UsageMeter } from '../billing/stripe.js';

describe('billing basics', () => {
  it('ensureSubscriptionForTenant early exit when env not set', async () => {
    const db = new Database(':memory:');
    const schema = fs.readFileSync(path.join(process.cwd(), 'src/db/schema.sql')).toString();
    db.exec(schema);
    db.prepare('insert into tenants(id,name,api_key) values(?,?,?)').run('t1','Test','key');
    delete process.env.STRIPE_API_KEY;
    delete process.env.STRIPE_METERED_PRICE_ID;
    const res = await ensureSubscriptionForTenant(db as any, 't1');
    expect(res.ok).toBe(false);
  });

  it('usage summary reflects override free tier logic', () => {
    const dbPath = path.join(process.cwd(), 'tmp_usage.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const db = new Database(dbPath);
    const schema = fs.readFileSync(path.join(process.cwd(), 'src/db/schema.sql')).toString();
    db.exec(schema);
    db.prepare('insert into tenants(id,name,api_key,free_fallback_quota) values(?,?,?,?)').run('t2','Test2','key2', 2);
    const meter = new UsageMeter(dbPath);
    const now = new Date();
    for (let i=0;i<5;i++) meter.recordFallback('t2', now);
    const summary = getTenantUsageSummary(db as any, 't2', now);
    expect(summary.total).toBe(5);
    expect(summary.free).toBe(2);
    expect(summary.billable).toBe(3);
    expect(summary.period).toBe(currentPeriod(now));
  });
});
