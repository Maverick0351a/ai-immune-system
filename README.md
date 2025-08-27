# AI Immune System (AIS) 🛡️

<p align="center">
<strong>Production firewall & hygiene layer for AI JSON.</strong><br/>
Stop shipping brittle parsing glue. AIS turns noisy / malformed / risky model JSON into clean, validated, policy‑compliant objects — and only bills when an LLM rescue is actually needed.
</p>

<p align="center">
<a href="https://www.odinsecure.ai" target="_blank">Website</a> ·
<a href="#features">Features</a> ·
<a href="#why">Why</a> ·
<a href="#api-glimpse">API Glimpse</a> ·
<a href="#pricing">Pricing</a> ·
<a href="#license">License</a>
</p>

---

## Why

LLM + partner outputs are messy: trailing commas, wrong types, hallucinated keys, sensitive fragments. You waste cycles writing ad‑hoc repair code and still miss edge cases. AIS centralizes:

* Deterministic repair first (free) – fast JSON salvage before any tokens are spent.
* Strict schema validation & coercion – reject or auto-correct shape early.
* Guarded LLM fallback – only when validation fails, temp=0, JSON-only contract.
* Redaction & policy gates – sensitive paths removed and outbound targets allow‑listed.
* Provenance & audit – canonical hash (CID) + optional signed receipts.
* Usage metering – pay exactly per successful LLM fallback; free tier included.

Result: Lower spend, higher reliability, verifiable safety trail.

---

## Features

| Category | Highlights |
|----------|------------|
| Repair Pipeline | jsonrepair → schema → guarded LLM → re-validate |
| Validation | Draft 2020-12 JSON Schema + custom keywords (e.g. freshness) |
| Security | Field/path redaction (wildcards), host allow‑lists (Rego/OPA) |
| Provenance | Canonical serialization + SHA-256 CID, optional Ed25519 ODIN signatures |
| Billing | Stripe metered: only count successful LLM fallbacks (custom free quota per tenant) |
| Observability | Prometheus metrics + structured redacted logs |
| Admin Controls | Per-tenant keys, policies, redaction sets, plan overrides |

---

## API Glimpse

Minimal request (LLM only if strictly needed):

```jsonc
POST /v1/immune/run
{
  "schema": { "type":"object", "properties": { "amount": {"type":"number"} }, "required": ["amount"] },
  "json": "{amount: '42'}"
}
```

Indicative response:

```jsonc
{
  "decision": "ACCEPT_WITH_REPAIRS",
  "repairs": ["jsonrepair"],
  "final": { "amount": 42 },
  "cid": "sha256:..."
}
```

If deterministic repair fails schema, an LLM attempt (with redactions applied) is made; success adds `"llm"` to `repairs` and increments metered usage.

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