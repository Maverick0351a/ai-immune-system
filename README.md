<!-- Hero -->
# AI Immune System (AIS) 🛡️

<p align="center">
<strong>Drop‑in JSON firewall for AI & partner data pipelines</strong><br/>
Turns noisy / malformed / risky JSON into clean, validated, policy‑compliant, metered objects — only bills when an LLM rescue is truly needed.
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
  <a href="#try-in-60s"><img alt="Quick Start" src="https://img.shields.io/badge/Try%20It-60s-ff5722?logo=thunderbird" /></a>
  <a href="#quick-use"><img alt="Quick Use" src="https://img.shields.io/badge/Snippets-cURL%20%7C%20Python%20%7C%20TS-ff9800?logo=code" /></a>
  <a href="#api"><img alt="API" src="https://img.shields.io/badge/Docs-API-4caf50?logo=markdown" /></a>
  <a href="#architecture"><img alt="Arch" src="https://img.shields.io/badge/Diagram-Architecture-673ab7" /></a>
</p>

---

## About (Immune System Analogy)

Think of every incoming JSON blob (from an LLM, partner feed, or user) as a “cell” entering your system.

AIS behaves like a lightweight immune system:

| Immune Concept | AIS Step | Purpose (Plain Language) |
|----------------|---------|---------------------------|
| Innate barrier | Fast parse + deterministic repair | Instantly fix obvious cuts & scrapes (typos, stray commas) for free. |
| Pattern check (PAMPs) | JSON Schema validation | Reject shapes that don’t belong before they spread. |
| Redaction (masking) | Sensitive field stripping | Hide secrets before deeper inspection so they never leak. |
| Adaptive response | Guarded LLM fallback | Only call the “specialist” (LLM) if the quick defenses failed. |
| Antibodies | Re‑validation of LLM output | Ensure the specialist’s result really fits the schema. |
| Quarantine | REJECT / QUARANTINE decision | Isolate stuff that cannot be safely repaired. |
| Immune memory | Canonical hash + provenance | Remember exactly what was seen & how it was fixed. |
| Vital signs | Metrics & logs | Observe health: how many infections (repairs), how many escalations (LLM). |
| Energy budget | Metered billing per fallback | You only “spend calories” when adaptive response triggers. |

Plain version: AIS quietly fixes most broken JSON instantly. Only when that fails does it (optionally) escalate to an LLM under strict rules and then double‑checks the result. You get clean, safe objects or a clear, contained rejection — plus a receipt of what happened.

Why this matters:
- Prevents ad‑hoc regex & scattered validation drift.
- Cuts LLM spend by handling the easy 80–90% deterministically.
- Reduces risk: sensitive data is removed before model calls.
- Gives you audit trails & usage-based cost alignment.

You pay (metered) only when the adaptive layer (LLM fallback) actually succeeds and returns value.

---

## ✨ Feature Highlights

<details open>
<summary><strong>Pipeline</strong></summary>

1. Parse & deterministic repair (jsonrepair)
2. Schema validate (JSON Schema 2020-12 + custom keywords)
3. Conditional LLM fallback (guarded: temp=0, JSON-only, redacted)
4. Re‑validate & provenance stamp (CID / optional signature)
</details>

<details>
<summary><strong>Security & Policy</strong></summary>
Field & wildcard redaction, host allow‑lists via Rego/OPA, prompt residue scrubbing, signature-ready provenance.
</details>

<details>
<summary><strong>Billing & Quotas</strong></summary>
Per‑tenant free quota + metered Stripe usage (fallback successes only), overrideable per tenant.
</details>

<details>
<summary><strong>Observability</strong></summary>
Prometheus metrics, structured redacted logs, repair provenance trail.
</details>

<details>
<summary><strong>DX</strong></summary>
CLI (`ais`), Python client (`pip install ais-client`), simple REST endpoints, minimal env surface.
</details>

---

## Try in 60s

```bash
git clone https://github.com/Maverick0351a/ai-immune-system.git
cd ai-immune-system
cp .env.example .env
echo "TEST_API_KEY=demokey-123" >> .env
npm i
npm run init-db
npm run dev &

# Deterministic repair (no LLM spend)
curl -s http://127.0.0.1:8088/v1/immune/run \
  -H "X-API-Key: demokey-123" -H "Content-Type: application/json" \
  -d '{"schema":{"type":"object","properties":{"amount":{"type":"number"}},"required":["amount"]},"json":"{amount: \"42\"}"}' | jq
```

Add an OpenAI key in `.env` to enable fallback: `OPENAI_API_KEY=sk-...`

---

## Quick Use

### cURL
```bash
curl -s http://127.0.0.1:8088/v1/immune/run \
  -H "X-API-Key: demokey-123" -H "Content-Type: application/json" \
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
console.log((await resp.json()).final.amount);
```

---

## Pricing (Stripe-Friendly)

| Tier | Included | Overages (example config) |
|------|----------|---------------------------|
| Free | Unlimited deterministic + 25 LLM fallbacks/mo | – |
| Pay‑as‑you‑go | + On‑demand fallbacks | $0.008 / fallback |
| Pro (sample) | 1,000 fallbacks / mo | $0.006 thereafter |

Metering counts only successful LLM repairs after deterministic + schema attempts fail. You own product & price configuration in Stripe.

---

## Core API

### POST /v1/immune/run
Headers: `X-API-Key: <tenant>`, `Content-Type: application/json`

Request (minimal):
```jsonc
{
  "schema": {"type":"object","properties":{"amount":{"type":"number"}},"required":["amount"]},
  "json": "{amount: '42'}"
}
```

Example response:
```jsonc
{
  "decision": "ACCEPT_WITH_REPAIRS",
  "repairs": ["jsonrepair"],
  "final": {"amount": 42},
  "cid": "sha256:...",
  "usage": {"llmFallbacksBilled": 0}
}
```

Failure modes: `REJECT`, `QUARANTINE`, or `ERROR` if unrecoverable.

---

## Environment (Key Variables)

| Variable | Purpose |
|----------|---------|
| OPENAI_API_KEY | Enables guarded LLM fallback |
| OPENAI_MODEL / OPENAI_FALLBACK_MODEL | Primary / secondary model IDs |
| OPENAI_TIMEOUT_MS | Hard timeout for LLM request |
| LLM_DEBUG | Verbose fallback logging when set (e.g. "1") |
| STRIPE_API_KEY / STRIPE_METERED_PRICE_ID | Enable usage metering to Stripe |
| FREE_TIER_FALLBACKS | Override global free fallback quota |
| ADMIN_TOKEN | Protects admin endpoints |
| TEST_API_KEY | Seed tenant key during init |

---

## Architecture

```
          Incoming JSON / Partner Feed / LLM Output
                            │
                  Parse + Deterministic Repair
                            │ (fast, free)
                      JSON Schema Validate
                      │           │
                      │ success   │ fail
                      │           ▼
                      │     Redact Sensitive Fields
                      │           │
                      │      Guarded LLM Fallback (temp=0, JSON-only)
                      │           │
                      └───────────┴─► Re-Validate
                                      │
                                Provenance (CID + optional signature)
                                      │
                              Usage Meter (if LLM used)
                                      │
                                   Response
```

---

## Roadmap (Public)

- Tiered pricing helper scripts
- Webhook-driven subscription state sync
- Optional local model fallback mode
- Extended secret classification plugins

---

## Contributing

PRs welcome. For major extensions (new policy engines, billing providers) open an issue first. Keep security-impacting diffs tight & well documented.

---

## License

Apache 2.0

---

© 2025 Odin Secure / AI Immune System

