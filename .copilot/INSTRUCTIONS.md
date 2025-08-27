# Copilot playbook for AI Immune System

**Paste any of these into Copilot Chat inside VS Code** (they reference file paths in this repo).

---

## 1) Add a new schema & tighten validation

**Prompt**
> Open `src/pipeline/schema.ts`. Add a new `schemas/payment.schema.json` and register it. Enforce:
> - `amount`: number, min 0, max 1_000_000
> - `currency`: ISO-4217 enum for USD, EUR, GBP
> - `timestamp`: `date-time` format, must be within +/- 24h of now (implement a custom keyword in Ajv and wire it)
> Write tests in `src/__tests__/pipeline.spec.ts` for valid/invalid cases.

---

## 2) Integrate ODIN receipt signatures

**Prompt**
> Open `src/provenance/odin.ts` and `src/routes/immune.ts`. Implement the TODO to sign `{cid}|{trace_id}|{ts}` with Ed25519 using a base64url key from env `ODIN_PRIVATE_KEY_B64`. Include headers `X-ODIN-Response-CID`, `X-ODIN-Signature`, and `X-ODIN-KID`. Add a unit test in `src/__tests__/provenance.spec.ts`.

---

## 3) Add policy enforcement (HEL/Rego)

**Prompt**
> Create `src/policy/rego.ts` with a simple OPA policy runner using the `opa` binary via child_process (guarded behind `POLICY_PROFILE=rego`). The policy should reject `forward_url` hosts not in a per-tenant allowlist stored in DB. Update `src/routes/immune.ts` to call this check before returning ACCEPT. Provide dev docs in README.

---

## 4) Enable per-tenant secrets & redaction

**Prompt**
> In `src/security/sanitizers.ts`, add a `redactByPath(obj, paths)` utility supporting wildcards. Update the pipeline to apply it before logging and before LLM fallback. Extend `Tenant` schema with `redact_paths` JSON array and persist it. Add admin endpoints to set it.

---

## 5) Stripe: auto-create subscriptions

**Prompt**
> In `src/billing/stripe.ts`, add an `ensureSubscriptionForTenant(tenant)` that creates a customer & subscription with the metered price `STRIPE_METERED_PRICE_ID` (if missing). Call this on tenant creation. Add `/v1/admin/tenants/:id/attach-stripe` endpoint. Update README with steps.

---

## 6) Vercel deployment guide

**Prompt**
> Add a section to README for Vercel deploy (Node 20). Provide `vercel.json` with memory/region, and list required ENV vars (OPENAI_API_KEY, STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET). Include a small `api/health.ts` for uptime check if deployed as functions.

---

## 7) Observability

**Prompt**
> Integrate pino-http in `src/server.ts` with redaction of sensitive fields. Add `/metrics` endpoint with Prometheus exposition (use prom-client). Add basic counters for `requests_total`, `llm_fallback_total`, and histograms for repair times. Update docs.

---
