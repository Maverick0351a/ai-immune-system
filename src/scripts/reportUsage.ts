import dotenv from "dotenv"; dotenv.config();
import { openDb } from "../db/index.js";
import { UsageMeter } from "../billing/stripe.js";

const url = process.env.DATABASE_URL || "file:./data/ais.db";
const db = openDb(url);
const meter = new UsageMeter(url.startsWith("file:") ? url.slice(5) : url);

// naive iteration across tenants
const rows = db.prepare("select * from tenants").all();
const now = new Date();

const tasks = rows.map(async (t:any) => {
  const r = await meter.reportStripeIfNeeded(t, now);
  return { tenant: t.id, note: r.note };
});

Promise.all(tasks).then(r => {
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(2);
});
