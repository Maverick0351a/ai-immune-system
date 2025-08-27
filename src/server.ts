import express from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";
import bodyParser from "body-parser";
import { registry, rateLimitCounter } from "./observability/metrics.js";
import { openDb, initDb } from "./db/index.js";
import { runMigrations } from './db/migrations.js';
import { immuneRoutes } from "./routes/immune.js";
import { adminRoutes } from "./routes/admin.js";
import { UsageMeter } from "./billing/stripe.js";
import { stripeWebhookRoute } from './routes/stripe.js';
import dotenv from "dotenv";

dotenv.config();
const log = pino({
	name: "ais",
	redact: {
		paths: [
			'req.headers.authorization',
			'req.headers["x-api-key"]',
			'req.headers["x-admin-token"]',
			'req.headers.cookie'
		],
		censor: '[REDACTED]'
	}
});

// Lazy read package version for health reporting
let PKG_VERSION = "0.0.0";
try {
	PKG_VERSION = (await import('../package.json', { assert: { type: 'json' } }) as any).default.version || '0.0.0';
} catch { /* ignore */ }

const app = express();
app.use(pinoHttp({ logger: log, serializers: { req(req) { return { id: (req as any).id, method: req.method, url: req.url }; } } }));
app.use(helmet());
app.use(cors({ origin: true }));
// JSON parser (skip for Stripe webhook raw route)
app.use(bodyParser.json({ limit: "1mb" }));

// Basic in-memory rate limit (per API key) - adaptive replacement suggested for production
const rlWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const rlMax = Number(process.env.RATE_LIMIT_MAX || 300);
const rlMap = new Map<string,{count:number,reset:number}>();
app.use((req,res,next) => {
	const key = String(req.header('X-API-Key')||'');
	if (!key) return next();
	const now = Date.now();
	let entry = rlMap.get(key);
	if (!entry || entry.reset < now) { entry = { count:0, reset: now + rlWindowMs }; rlMap.set(key, entry); }
	entry.count++;
		res.setHeader('X-RateLimit-Limit', String(rlMax));
		res.setHeader('X-RateLimit-Remaining', String(Math.max(0, rlMax - entry.count)));
		res.setHeader('X-RateLimit-Reset', String(Math.floor(entry.reset/1000)));
			if (entry.count > rlMax) {
				rateLimitCounter.inc();
			res.setHeader('Retry-After', Math.ceil((entry.reset-now)/1000));
			return res.status(429).json({ error: 'rate_limited', window_ms: rlWindowMs });
		}
	next();
});

const dbUrl = process.env.DATABASE_URL || "file:./data/ais.db";
const db = openDb(dbUrl);
initDb(db);
runMigrations(db);

const meter = new UsageMeter(db);

app.get("/healthz", (req, res) => res.json({ ok: true, version: PKG_VERSION }));
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
const server = app.listen(port, '0.0.0.0', () => log.info({ port }, "AI Immune System listening"));

function shutdown(sig: string) {
	log.info({ sig }, 'shutdown signal received');
	server.close(err => {
		if (err) {
			log.error({ err }, 'error during shutdown');
			process.exit(1);
		}
		log.info('server closed');
		process.exit(0);
	});
	setTimeout(() => {
		log.warn('forced exit after timeout');
		process.exit(1);
	}, 5000).unref();
}
['SIGINT','SIGTERM'].forEach(s => process.on(s as NodeJS.Signals, () => shutdown(s)));
