# AI Immune System (AIS) 🛡️

<p align="center">
<strong>A drop-in JSON firewall for AI apps</strong><br/>
Deterministic repair → schema validation → guarded LLM fallback (metered) → strict re-validate; with provenance, policy, redaction, metrics & Stripe usage billing.
</p>

<p align="center">
<a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue"></a>
<img alt="TypeScript" src="https://img.shields.io/badge/TS-5.x-3178c6?logo=typescript&logoColor=white">
<img alt="OpenAI" src="https://img.shields.io/badge/LLM-OpenAI-412991?logo=openai&logoColor=white">
<img alt="Stripe" src="https://img.shields.io/badge/Billing-Stripe-6772e5?logo=stripe&logoColor=white">
<img alt="CI" src="https://img.shields.io/badge/Tests-Vitest-6DA83B?logo=vite&logoColor=white">
</p>

## About

AI Immune System (AIS) sits in front of your application and makes untrusted JSON safe & billable:

Why it exists:
- LLM outputs are messy; deterministic repair first keeps costs near-zero.
- Guardrails (schema + policy + redaction) shrink attack surface before any model call.
- Provenance (CIDs + optional ODIN signatures) enables audit & tamper detection.
- Per-fallback metering + Stripe ties cost directly to actual LLM usage, not tokens.

Core guarantees:
- Never returns non-JSON.
- LLM fallback only after validation failure & with temp=0 + JSON-only response_format.
- Sensitive fields redacted before model exposure.
- Billing only increments on successful LLM repairs.

Use cases:
- Gate partner ingestion pipelines.
- Offer “clean JSON” API to downstream teams.
- Track & monetize reliability bandaids for upstream flaky sources.

Tags: json, firewall, llm, guardrails, openai, stripe, billing, observability, opa, rego, security, validation, json-schema, metering, nodejs, typescript

**A drop-in JSON firewall for AI apps** — deterministic repair → schema validation → LLM fallback (metered) → strict re-validate; with provenance, usage metering, and Stripe billing. Built for speed, safety, and audits.

> Free deterministic fixes; pay only **per LLM fallback** (beyond free tier).

---

## ✨ What you get

- **4-stage pipeline**: autocorrect → JSON repair → **LLM fallback** (optional) → JSON re-validate.
- **Schema-first**: JSON Schema / Zod validation, coercions, formats, ranges.
- **Security filters**: secret/PII scan, prompt-injection residue scrub, redaction.
- **Deterministic first**: most inputs fixed without AI (free).
- **Fallback with guardrails**: schema-constrained LLM prompt; temp=0; JSON-only.
- **Provenance**: canonical JSON + CID (`sha256:<hex>`), trace IDs, optional ODIN receipts.
- **Metered billing**: Stripe-ready usage reporting **per LLM fallback**; free tier included.
- **Tenants & API keys**: SQLite dev DB, simple admin endpoints.
- **DX-first**: cURLable API + TypeScript library + CLI (`ais`).

---

## Quick start (local)

```bash
git clone <your-repo>.git ai-immune-system
cd ai-immune-system
cp .env.example .env
npm i
npm run init-db
npm run dev
```

Open another terminal and test:

```bash
# Example broken JSON fixed deterministically (no LLM) — FREE
curl -s http://127.0.0.1:8088/v1/immune/run   -H "X-API-Key: demokey-123"   -H "Content-Type: application/json"   -d '{"schema":{"type":"object","properties":{"amount":{"type":"number"}},"required":["amount"]},"json":"{\"amount\": \"42\"}"}' | jq
```

LLM fallback example (requires `OPENAI_API_KEY` in `.env`):

```bash
curl -s http://127.0.0.1:8088/v1/immune/run   -H "X-API-Key: demokey-123"   -H "Content-Type: application/json"   -d '{"schema":{"type":"object","properties":{"invoice_id":{"type":"string"},"amount":{"type":"number"},"currency":{"type":"string"}},"required":["invoice_id","amount","currency"]},"json":"{invoice_id: INV-1, amount: \"123.45\", currency: USD}"}' | jq
```

---

## Pricing model (Stripe-friendly)

- **Free**: deterministic repairs unlimited; **LLM fallbacks: 25 / month free**.
- **Pay-as-you-go**: **$0.008 per LLM fallback** beyond free tier (metered billing).
- **Pro (optional)**: $29 / month includes 1,000 fallbacks, then $0.006 each (configure in Stripe).

This repo ships **usage counters** per tenant and an optional `report-usage` helper that aggregates and pushes usage records to Stripe metered subscriptions. You control pricing & products in Stripe.

---

## API

### `POST /v1/immune/run`

**Headers**
- `X-API-Key: <tenant key>`

**Body**
```jsonc
{
  "schema": { /* JSON Schema OR null */ },
  "json": "{... or object ...}",
  "options": {
    "coerce": true,
    "dropUnknown": true,
    "redactPaths": ["auth.token", "secret"],
    "disableLLM": false
  },
  "forward_url": "https://api.example.com/ingest" // optional; subject to policy if POLICY_PROFILE=rego
}
```

**Response**
```jsonc
{
  "trace_id": "nanoid",
  "cid": "sha256:...",
  "decision": "ACCEPT|ACCEPT_WITH_REPAIRS|QUARANTINE|REJECT",
  "repairs": ["jsonrepair", "llm"],
  "final": { "your": "object" },
  "diagnostics": [ /* steps, messages, timings */ ]
}
```

### Admin (dev)
- `POST /v1/admin/tenants` → `{name}` → returns `{api_key}`
- `GET  /v1/admin/tenants/:id`
- `POST /v1/admin/issue-key/:id`
- `POST /v1/admin/tenants/:id/allow-hosts` → `{hosts:["host1","host2"]}` set allowed forward hosts
- `POST /v1/admin/tenants/:id/redact-paths` → `{paths:["a.b","secret.*"]}` set wildcard redact paths
- `POST /v1/admin/tenants/:id/attach-stripe` → auto-create Stripe customer + subscription (when STRIPE_API_KEY & STRIPE_METERED_PRICE_ID set)
- `GET  /v1/admin/tenants/:id/usage` → current period usage + billable
- `POST /v1/admin/tenants/:id/set-plan` → `{ free_fallback_quota?: number, subscription_price_id?: string }` override free tier or move tenant to new price

> Add header `X-Admin-Token: <ADMIN_TOKEN>`

---

## Stripe metering (optional, simple)

1. Set `STRIPE_API_KEY`.
2. Create a live metered product + price (monthly, per fallback) via script:
  ```bash
  npm run stripe:create-metered
  # Output includes "price": "price_..."
  ```
3. Set `STRIPE_METERED_PRICE_ID` in env to that price id.
4. For existing tenants, bulk attach subscriptions:
  ```bash
  npm run stripe:attach-all
  ```
  Or individually: `POST /v1/admin/tenants/:id/attach-stripe`.
5. New tenants auto-provision if both env vars set.
6. (Optional) Override a tenant free tier or plan:
   ```bash
   curl -X POST -H "X-Admin-Token: $ADMIN_TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{"free_fallback_quota":100}' \
     http://localhost:8088/v1/admin/tenants/<id>/set-plan
   ```
7. Run usage reporter daily/hourly:
   ```bash
   npm run report-usage
   ```
   It will push the count of **LLM fallbacks above the free tier** to Stripe for the current billing period.

Example cron (every hour) using crontab:
```
0 * * * * cd /app/ai-immune-system && /usr/bin/node npm run report-usage >> usage.log 2>&1
```

> For production, wire this into a cron/Cloud Scheduler and/or record usage on each fallback.

---

## VS Code + Copilot

Open `.copilot/INSTRUCTIONS.md` for “ask commands” you can paste to Copilot Chat to extend schemas, plug Rego, or integrate ODIN receipts.

### Policy Enforcement (Rego / OPA)

Set `POLICY_PROFILE=rego` and ensure the `opa` binary is on PATH. When enabled, each `/v1/immune/run` request with a `forward_url` will be checked: the request host must be present in the tenant's allowlist (`forward_allow_hosts` JSON array). Update via the admin endpoint. Denied requests return `403 {"error":"policy_denied","reason":"host_not_allowlisted"}`.

### Redaction (Per-tenant)

Each tenant can define `redact_paths` (stored in DB) which are merged with request `options.redactPaths`. Wildcards (`*`) match any property at that depth. Examples:

- `auth.token` → redact specific field
- `credentials.*` → redact all direct children under `credentials`
- `items.*.secret` → redact `secret` inside every object in `items` array

Redaction is applied before LLM fallback and on the final output (CID is computed after redaction so it reflects the sanitized object).

---

## CLI

```bash
# From JSON file, print result
npx ais -f sample/broken.json --schema sample/schemas/invoice.schema.json
```

---

## Deploy

- **Docker**: `docker build -t ai-immune-system . && docker run -p 8088:8088 --env-file .env ai-immune-system`
- **Vercel / Render / Fly**: set env; run `npm run start` (uses compiled `dist/`)

### Vercel (Serverless) Deployment

Two options:

1. Full server (single instance) — deploy the Docker image (recommended for full feature set).
2. Functions — use provided `api/health.ts` for uptime and (optionally) add more endpoints as serverless functions.

Included `vercel.json` sets Node 20 runtime, region `iad1`, 1024MB memory. Adjust as needed.

Required Environment Variables (set in Vercel Project Settings → Environment Variables):

| Key | Purpose |
|-----|---------|
| `OPENAI_API_KEY` | Enable LLM fallback |
| `OPENAI_MODEL` | Primary OpenAI model (default `gpt-4o-mini`) |
| `OPENAI_FALLBACK_MODEL` | Optional second model used if primary fails (default `gpt-4o`) |
| `OPENAI_TIMEOUT_MS` | Timeout per LLM attempt (default `8000`) |
| `LLM_DEBUG` | Set to any value to enable verbose LLM attempt logs |
| `LLM_CACHE` | Set to `0` to disable in-memory success cache for identical repairs |
| `STRIPE_API_KEY` | Stripe API access for billing |
| `STRIPE_METERED_PRICE_ID` | Metered price ID for auto subscription |
| `STRIPE_WEBHOOK_SECRET` | (Future) webhook validation |
| `ADMIN_TOKEN` | Protect admin routes |
| `ODIN_PRIVATE_KEY_B64` | Enable ODIN provenance signatures |
| `FREE_TIER_FALLBACKS` | (Optional) override free fallback quota |

Basic health check after deploy:

```bash
curl https://<your-vercel-deployment>/api/health
```

To expose the existing Express server via Vercel you can wrap `src/server.ts` with a serverless entry (e.g. `api/server.ts`) that imports and exports the app or run with an Edge adapter (not included here). For heavier sustained traffic prefer a container runtime.

## Observability & Metrics

The server exposes Prometheus metrics at `/metrics` using `prom-client` with default system/runtime gauges (prefixed `ais_`) plus custom metrics:

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `requests_total` | Counter | method, route, status | Total HTTP requests served |
| `llm_fallback_total` | Counter | (none) | Count of LLM fallback repairs performed |
| `repair_duration_seconds` | Histogram | step | Duration of parse/repair and LLM fallback steps |

Logging uses `pino-http` with redaction of sensitive headers (`authorization`, `x-api-key`, `x-admin-token`, `cookie`).

Scrape example:
```bash
curl -s http://localhost:8088/metrics | grep requests_total
```

---

## License

Apache 2.0
