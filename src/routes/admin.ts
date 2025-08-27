import { Router } from "express";
import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import { ensureSubscriptionForTenant } from "../billing/stripe.js";

function requireAdmin(req: any, res: any, next: any) {
  if (req.header("X-Admin-Token") !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

export function adminRoutes(db: Database.Database) {
  const r = Router();
  r.use(requireAdmin);

  r.post("/tenants", async (req, res) => {
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "name required" });
    const apiKey = "tenant_" + nanoid(16);
    const id = nanoid();
    db.prepare("insert into tenants(id,name,api_key) values(?,?,?)").run(id, name, apiKey);
    // Auto-create subscription if configured
    const sub = await ensureSubscriptionForTenant(db, id);
    return res.json({ id, name, api_key: apiKey, stripe: sub });
  });

  r.get("/tenants/:id", (req, res) => {
    const row = db.prepare("select * from tenants where id=?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "not found" });
    return res.json(row);
  });

  r.get("/tenants/:id/usage", (req, res) => {
    const u = db.prepare("select id from tenants where id=?").get(req.params.id);
    if (!u) return res.status(404).json({ error: 'not found' });
    const { getTenantUsageSummary } = require('../billing/stripe.js');
    return res.json(getTenantUsageSummary(db, req.params.id));
  });

  r.post("/tenants/:id/allow-hosts", (req, res) => {
    const hosts: unknown = req.body?.hosts;
    if (!Array.isArray(hosts) || hosts.some(h => typeof h !== 'string')) return res.status(400).json({ error: 'hosts must be string[]' });
    const info = db.prepare("update tenants set forward_allow_hosts=? where id=?").run(JSON.stringify(hosts), req.params.id);
    return res.json({ updated: info.changes > 0, hosts });
  });

  r.post("/tenants/:id/redact-paths", (req, res) => {
    const paths: unknown = req.body?.paths;
    if (!Array.isArray(paths) || paths.some(h => typeof h !== 'string')) return res.status(400).json({ error: 'paths must be string[]' });
    const info = db.prepare("update tenants set redact_paths=? where id=?").run(JSON.stringify(paths), req.params.id);
    return res.json({ updated: info.changes > 0, paths });
  });

  r.post("/tenants/:id/attach-subscription-item", (req, res) => {
    const { subscription_item_id } = req.body || {};
    if (!subscription_item_id) return res.status(400).json({ error: "subscription_item_id required" });
    const info = db.prepare("update tenants set stripe_subscription_item_id=? where id=?").run(subscription_item_id, req.params.id);
    return res.json({ updated: info.changes > 0 });
  });

  r.post("/tenants/:id/attach-stripe", async (req, res) => {
    const out = await ensureSubscriptionForTenant(db, req.params.id);
    return res.json(out);
  });

  r.post('/tenants/:id/set-plan', async (req, res) => {
    const { free_fallback_quota, subscription_price_id } = req.body || {};
    const t = db.prepare('select * from tenants where id=?').get(req.params.id) as { id: string; name: string; stripe_customer_id?: string | null } | undefined;
    if (!t) return res.status(404).json({ error: 'not found' });
    if (typeof free_fallback_quota === 'number') {
      db.prepare('update tenants set free_fallback_quota=? where id=?').run(free_fallback_quota, req.params.id);
    }
    if (subscription_price_id) {
      // Force create new subscription item on provided price
      const stripeKey = process.env.STRIPE_API_KEY;
      if (!stripeKey) return res.status(400).json({ error: 'stripe disabled' });
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
      // Ensure customer
      let customerId = t.stripe_customer_id;
      if (!customerId) {
        const c = await stripe.customers.create({ name: t.name, metadata: { tenant_id: t.id } });
        customerId = c.id;
        db.prepare('update tenants set stripe_customer_id=? where id=?').run(customerId, t.id);
      }
      // Create subscription
      const sub = await stripe.subscriptions.create({ customer: customerId, items: [{ price: subscription_price_id, quantity: 0 }], collection_method: 'charge_automatically', expand: ['items.data.price'] });
      const item = sub.items.data.find(i => i.price.id === subscription_price_id);
      if (item) db.prepare('update tenants set stripe_subscription_item_id=? where id=?').run(item.id, t.id);
    }
    const updated = db.prepare('select * from tenants where id=?').get(req.params.id);
    return res.json({ ok: true, tenant: updated });
  });

  return r;
}
