import { Router } from "express";
import { RequestSchema } from "../types.js";
import { nanoid } from "nanoid";
import { runPipeline } from "../pipeline/core.js";
import { findTenantByKey } from "../db/index.js";
import type Database from "better-sqlite3";
import { UsageMeter } from "../billing/stripe.js";
import { signOdinReceipt } from "../provenance/odin.js";
import { evaluatePolicy } from "../policy/rego.js";
import { llmFallbackCounter, requestCounter, observeDiagnostics } from "../observability/metrics.js";

export function immuneRoutes(db: Database.Database, meter: UsageMeter) {
  const r = Router();

  r.post("/run", async (req, res) => {
    const apiKey = String(req.header("X-API-Key") || "");
    const tenant = apiKey ? findTenantByKey(db, apiKey) : null;
    if (!tenant) return res.status(401).json({ error: "invalid api key" });

    const parsed = RequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const trace_id = nanoid();
  const { schema, json, options, forward_url } = parsed.data;
  // Merge tenant redaction defaults
  let tenantRedact: string[] = [];
  try { tenantRedact = tenant.redact_paths ? JSON.parse(tenant.redact_paths) : []; } catch {}
    const mergedOptions = {
      coerce: options?.coerce !== false,
      dropUnknown: options?.dropUnknown !== false,
      redactPaths: Array.from(new Set([...(options?.redactPaths||[]), ...tenantRedact]))
    };
    const s = typeof json === "string" ? json : JSON.stringify(json);
    const t0 = Date.now();
  const out = await runPipeline(s, schema, mergedOptions);
    const ms = Date.now() - t0;

  // record usage & runs
    if (out.repairs.includes("llm")) meter.recordFallback(tenant.id, new Date());
  if (out.repairs.includes('llm')) llmFallbackCounter.inc();
  observeDiagnostics(out.diagnostics);
    db.prepare("insert into runs(trace_id,tenant_id,cid,decision,repairs,created_at) values(?,?,?,?,?,?)").run(
      trace_id, tenant.id, out.cid || "", out.decision, JSON.stringify(out.repairs), new Date().toISOString()
    );

    // Policy enforcement (HEL/Rego style)
    const policy = evaluatePolicy(db, { tenantId: tenant.id, forwardUrl: forward_url });
    if (!policy.allow) {
      return res.status(403).json({ error: "policy_denied", reason: policy.reason });
    }

    const resp = {
      trace_id,
      cid: out.cid,
      decision: out.decision,
      repairs: out.repairs,
      final: out.json,
      diagnostics: out.diagnostics,
      ms
    };
  res.setHeader("X-AIS-Trace", trace_id);
    res.setHeader("X-AIS-CID", out.cid || "");

    // ODIN provenance headers (optional)
    if (out.cid) {
      const odin = signOdinReceipt(out.cid, trace_id);
      if (odin) {
        res.setHeader("X-ODIN-Response-CID", odin.cid);
        res.setHeader("X-ODIN-Signature", odin.signature);
        res.setHeader("X-ODIN-KID", odin.kid);
      }
    }
    const routeLabel = '/v1/immune/run';
    res.on('finish', () => {
      requestCounter.inc({ method: req.method, route: routeLabel, status: String(res.statusCode) });
    });
    return res.json(resp);
  });

  return r;
}
