import Stripe from "stripe";
import Database from "better-sqlite3";

const FREE = Number(process.env.FREE_TIER_FALLBACKS || 25);

export interface Tenant {
  id: string;
  name: string;
  api_key: string;
  stripe_subscription_item_id?: string | null;
  stripe_customer_id?: string | null;
  free_fallback_quota?: number | null;
}

export class UsageMeter {
  private db: Database.Database;
  private stripe?: Stripe;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    const key = process.env.STRIPE_API_KEY;
    if (key) this.stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  }

  recordFallback(tenantId: string, when: Date) {
    const period = when.toISOString().slice(0,7); // YYYY-MM
    this.db.prepare("insert into fallback_usage(tenant_id, period, count) values(?,?,1) on conflict(tenant_id,period) do update set count=count+1").run(tenantId, period);
  }

  getUsage(tenantId: string, period: string): number {
  const row = this.db.prepare("select count from fallback_usage where tenant_id=? and period=?").get(tenantId, period) as { count: number } | undefined;
  return row?.count || 0;
    }

  async reportStripeIfNeeded(tenant: Tenant, when: Date) {
    if (!this.stripe) return { ok: false, note: "stripe disabled" };
    if (!tenant.stripe_subscription_item_id) return { ok: false, note: "no subscription item id" };
    const period = when.toISOString().slice(0,7);
    const count = this.getUsage(tenant.id, period);
    const freeTier = typeof tenant.free_fallback_quota === 'number' ? tenant.free_fallback_quota : FREE;
    const billable = Math.max(0, count - freeTier);
    if (billable <= 0) return { ok: true, note: "within free tier" };
    // We report total-to-date; Stripe will handle deltas
    await this.stripe.subscriptionItems.createUsageRecord(tenant.stripe_subscription_item_id, {
      quantity: billable,
      timestamp: Math.floor(when.getTime()/1000),
      action: "set"
    });
    return { ok: true, note: `reported ${billable} units` };
  }
}

export async function ensureSubscriptionForTenant(db: Database.Database, tenantId: string) {
  const stripeKey = process.env.STRIPE_API_KEY;
  const priceId = process.env.STRIPE_METERED_PRICE_ID;
  if (!stripeKey || !priceId) return { ok: false, note: "stripe disabled or price missing" };
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const row = db.prepare("select id,name,stripe_subscription_item_id,stripe_customer_id from tenants where id=?").get(tenantId) as Tenant | undefined;
  if (!row) return { ok: false, note: "tenant not found" };
  if (row.stripe_subscription_item_id) return { ok: true, note: "already attached" };
  // Create (or reuse) customer
  let customerId = row.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ name: row.name, metadata: { tenant_id: row.id } });
    customerId = customer.id;
    db.prepare("update tenants set stripe_customer_id=? where id=?").run(customerId, tenantId);
  }
  // Create subscription with metered price
  const sub = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId, quantity: 0 }],
    collection_method: 'charge_automatically',
    expand: ['items.data.price']
  });
  const item = sub.items.data.find(i => i.price.id === priceId);
  if (!item) return { ok: false, note: "subscription item not found" };
  db.prepare("update tenants set stripe_subscription_item_id=? where id=?").run(item.id, tenantId);
  return { ok: true, note: "subscription created", subscription_item_id: item.id };
}

export function currentPeriod(date = new Date()): string {
  return date.toISOString().slice(0,7); // YYYY-MM
}

export function getTenantUsageSummary(db: Database.Database, tenantId: string, date = new Date()) {
  const period = currentPeriod(date);
  const meter = new UsageMeter((db as any).name || ':memory:');
  const total = meter.getUsage(tenantId, period);
  const row = db.prepare('select free_fallback_quota from tenants where id=?').get(tenantId) as { free_fallback_quota?: number } | undefined;
  const free = typeof row?.free_fallback_quota === 'number' ? row!.free_fallback_quota : Number(process.env.FREE_TIER_FALLBACKS || 25);
  const billable = Math.max(0, total - free);
  return { period, total, free, billable };
}
