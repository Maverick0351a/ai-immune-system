import express from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";
import bodyParser from "body-parser";
import { registry } from "./observability/metrics.js";
import { openDb, initDb } from "./db/index.js";
import { immuneRoutes } from "./routes/immune.js";
import { adminRoutes } from "./routes/admin.js";
import { UsageMeter } from "./billing/stripe.js";
import { stripeWebhookRoute } from './routes/stripe.js';
import dotenv from "dotenv";

dotenv.config();
const log = pino({ name: "ais", redact: { paths: ['req.headers.authorization','req.headers.x-api-key','req.headers.x-admin-token','req.headers.cookie'], censor: '[REDACTED]' } });

const app = express();
app.use(pinoHttp({ logger: log, serializers: { req(req) { return { id: (req as any).id, method: req.method, url: req.url }; } } }));
app.use(helmet());
app.use(cors({ origin: true }));
// JSON parser (skip for Stripe webhook raw route)
app.use(bodyParser.json({ limit: "1mb" }));

const dbUrl = process.env.DATABASE_URL || "file:./data/ais.db";
const db = openDb(dbUrl);
initDb(db);

const meter = new UsageMeter(dbUrl.startsWith("file:") ? dbUrl.slice(5) : dbUrl);

app.get("/healthz", (req, res) => res.json({ ok: true, version: "0.1.0" }));
app.get('/metrics', async (req, res) => {
	try {
		res.setHeader('Content-Type', registry.contentType);
		res.end(await registry.metrics());
	} catch (e:any) {
		res.status(500).end(e.message);
	}
});

app.use("/v1/immune", immuneRoutes(db, meter));
app.use("/v1/admin", adminRoutes(db));
app.use('/v1/stripe', stripeWebhookRoute());

const port = Number(process.env.PORT || 8088);
app.listen(port, () => log.info({ port }, "AI Immune System listening"));
