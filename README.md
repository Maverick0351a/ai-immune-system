# AI Immune System (AIS) 🛡️

<p align="center">
<<<<<<< HEAD
<strong>Production firewall & hygiene layer for AI JSON.</strong><br/>
Stop shipping brittle parsing glue. AIS turns noisy / malformed / risky model JSON into clean, validated, policy‑compliant objects — and only bills when an LLM rescue is actually needed.
</p>

<p align="center">
<a href="https://www.odinsecure.ai" target="_blank">Website</a> ·
<a href="#features">Features</a> ·
# AI Immune System (AIS) 🛡️

<p align="center">
<strong>A drop-in JSON firewall for AI & partner data</strong><br/>
Deterministic repair → schema validation → guarded LLM fallback (metered) → re‑validate; with provenance, policy, redaction, metrics & Stripe usage billing.
</p>

<p align="center">
<a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue"></a>
<a href="https://pypi.org/project/ais-client"><img alt="PyPI" src="https://img.shields.io/pypi/v/ais-client?color=3775A9&label=PyPI&logo=pypi"></a>
<img alt="TypeScript" src="https://img.shields.io/badge/TS-5.x-3178c6?logo=typescript&logoColor=white">
<img alt="OpenAI" src="https://img.shields.io/badge/LLM-OpenAI-412991?logo=openai&logoColor=white">
<img alt="Stripe" src="https://img.shields.io/badge/Billing-Stripe-6772e5?logo=stripe&logoColor=white">
<img alt="CI" src="https://img.shields.io/badge/Tests-Vitest-6DA83B?logo=vite&logoColor=white">
</p>

<p align="center">
  <a href="#quick-use"><img alt="Quick Use" src="https://img.shields.io/badge/Quick%20Use-cURL%20%7C%20Python-ff9800?logo=lightning" /></a>
  <a href="#api"><img alt="API" src="https://img.shields.io/badge/Docs-API-green?logo=markdown" /></a>
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

## Quick Use

Minimal copy‑paste snippets.

### cURL (deterministic repair)
```bash
curl -s http://127.0.0.1:8088/v1/immune/run \
  -H "X-API-Key: demokey-123" \
  -H "Content-Type: application/json" \
  -d '{"schema":{"type":"object","properties":{"amount":{"type":"number"}},"required":["amount"]},"json":"{amount: '42'}"}'
```

### Python
```python
from ais_client import AISClient

client = AISClient(api_key="demokey-123", base_url="http://127.0.0.1:8088")
res = client.run(
  schema={"type":"object","properties":{"amount":{"type":"number"}},"required":["amount"]},
  data={"amount": "42"}
)
print(res.ok, res.data)
```

### TypeScript (fetch)
```ts
const resp = await fetch("http://127.0.0.1:8088/v1/immune/run", {
  method: "POST",
  headers: {"Content-Type":"application/json","X-API-Key":"demokey-123"},
  body: JSON.stringify({
    schema: { type: "object", properties: { amount: { type: "number" } }, required: ["amount"] },
    json: "{amount: '42'}"
  })
});
const out = await resp.json();
console.log(out.final.amount);
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

Headers:
* `X-API-Key: <tenant key>`

Body (core fields):
```jsonc
{
  "schema": { /* JSON Schema or null */ },
  "json": "{raw possibly broken json}" ,
  "options": {
    "coerce": true,
    "dropUnknown": true,
    "redactPaths": ["auth.token", "secret"],
    "disableLLM": false
  }
}
```

Response (example):
```jsonc
{
  "decision": "ACCEPT_WITH_REPAIRS",
  "repairs": ["jsonrepair"],
  "final": {"amount": 42},
  "cid": "sha256:...",
  "usage": {"llmFallbacksBilled": 0}
}
```

---

## Pricing

| Tier | Included | Overages |
|------|----------|----------|
| Free | Unlimited deterministic fixes + 25 LLM fallbacks/mo | – |
| Pay‑as‑you‑go | All Free + on‑demand fallbacks | $0.008 / fallback |
| Pro (example) | 1,000 fallbacks / mo | $0.006 thereafter |

You own the Stripe product & can tune prices. AIS reports cumulative billable fallbacks to your metered subscription items.

---

## Integration Overview

1. Define / reuse JSON Schemas for the structures you expect.
2. Send raw (possibly broken) JSON + schema to `/v1/immune/run` with your tenant API key.
3. Use the returned `final` object (or handle a QUARANTINE/REJECT decision).
4. (Optional) Attach tenant to Stripe for paid tiers; usage auto‑reported.

Advanced (documented in code): per‑tenant redaction, Rego host policy, plan overrides, signed provenance.

---

## Architecture (High Level)

Input → Deterministic Parse/Repair → Schema Validate → (Fail?) → Redact → LLM Constrained Repair → Re‑validate → Redact Final → CID/Provenance → Response + (Optional Forward) → Usage Meter.

---

## Roadmap (Public Cut)

* Tiered pricing helper scripts
* Webhook-driven subscription state sync
* Pluggable local model fallback mode
* Secrets classification library adapters

---

## Contributing

Issues & PRs welcome. Please keep security‑relevant changes small & well‑described. For major extensions (new policy engines, billing systems) open an issue first.

---

## License

Apache 2.0

---

© 2025 Odin Secure / AI Immune System

