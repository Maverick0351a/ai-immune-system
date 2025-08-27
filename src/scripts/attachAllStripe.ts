#!/usr/bin/env tsx
import dotenv from 'dotenv'; dotenv.config();
import { openDb } from '../db/index.js';
import { ensureSubscriptionForTenant } from '../billing/stripe.js';

async function main() {
  const dbUrl = process.env.DATABASE_URL || 'file:./data/ais.db';
  const db = openDb(dbUrl);
  const rows = db.prepare('select id,name,stripe_subscription_item_id from tenants').all() as Array<{ id: string; name: string; stripe_subscription_item_id?: string|null }>;
  const results: any[] = [];
  for (const r of rows) {
    const res = await ensureSubscriptionForTenant(db, r.id);
    results.push({ tenant: r.id, note: res.note, subscription_item_id: (res as any).subscription_item_id || r.stripe_subscription_item_id });
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
