import { tryParse } from "../stages/json_repair.js";
import { validateAgainstSchema } from "./schema.js";
import { llmFixJson } from "../stages/llm_fallback.js";
import { canonical, cid } from "../utils/canonical.js";
import { redact, redactByPath } from "../security/sanitizers.js";
import type { Options } from "../types.js";
import crypto from "crypto";

// Declare global cache typing
declare global {
  // eslint-disable-next-line no-var
  var __ais_llm_cache: Map<string, any> | undefined;
}

export interface PipelineResult {
  ok: boolean;
  decision: "ACCEPT" | "ACCEPT_WITH_REPAIRS" | "QUARANTINE" | "REJECT";
  json?: any;
  repairs: string[];
  diagnostics: Array<{ step: string; ok: boolean; note?: string; ms?: number }>;
  cid?: string;
}

function pruneUnknown(obj: any, schema: any): any {
  if (!schema || typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) {
    if (schema.items) return obj.map(i => pruneUnknown(i, schema.items));
    return obj;
  }
  const additional = schema.additionalProperties;
  if (additional === undefined || additional === true) return obj; // do not prune unless explicitly false
  if (additional === false) {
    const props = schema.properties && typeof schema.properties === 'object' ? schema.properties : {};
    const out: any = {};
    for (const k of Object.keys(obj)) {
      if (props[k]) out[k] = pruneUnknown(obj[k], props[k]);
    }
    return out;
  }
  // additionalProperties is a schema – recurse into allowed extra
  if (typeof additional === 'object') {
    const out: any = {};
    for (const k of Object.keys(obj)) {
      const subschema = (schema.properties && schema.properties[k]) || additional;
      out[k] = pruneUnknown(obj[k], subschema);
    }
    return out;
  }
  return obj;
}

export async function runPipeline(raw: string|object, schema?: any, options?: Options): Promise<PipelineResult> {
  const diagnostics: PipelineResult["diagnostics"] = [];
  const repairs: string[] = [];
  const t0 = Date.now();

  // 1) Parse or repair deterministically
  const p1 = tryParse(raw);
  diagnostics.push({ step: "parse/repair", ok: p1.ok, note: p1.note, ms: Date.now()-t0 });
  if (!p1.ok) return { ok: false, decision: "REJECT", repairs, diagnostics };

  let obj: any = p1.value;
  if (p1.note === "jsonrepair") repairs.push("jsonrepair");

  // 2) Schema validation / coercion
  const t2 = Date.now();
  const v1 = validateAgainstSchema(obj, schema);
  diagnostics.push({ step: "schema.validate", ok: v1.ok, note: v1.ok ? "valid" : (v1.errors||[]).join("; "), ms: Date.now()-t2 });
  if (!v1.ok) {
    if (options?.disableLLM) {
      diagnostics.push({ step: "llm.skip", ok: false, note: "LLM disabled via options" });
      return { ok: false, decision: "REJECT", repairs, diagnostics };
    }
    // 3) LLM fallback (if configured)
    const t3 = Date.now();
    // sanitize before sending to LLM
    const redactPaths = options?.redactPaths || [];
    let redactedForLlm: any;
    try { redactedForLlm = redactByPath(obj, redactPaths); } catch { redactedForLlm = obj; }
    const s = JSON.stringify(redactedForLlm);
    // Cache key: hash of raw redacted + schema canonical for repeated identical failures to avoid cost
    let llm;
    const enableCache = process.env.LLM_CACHE !== '0';
    let cacheKey: string | undefined;
    if (enableCache) {
      const schemaStr = schema ? JSON.stringify(schema) : "";
      cacheKey = crypto.createHash('sha256').update(s + '|' + schemaStr).digest('hex');
  if (!globalThis.__ais_llm_cache) globalThis.__ais_llm_cache = new Map<string, any>();
  const map = globalThis.__ais_llm_cache!;
      if (map.has(cacheKey)) {
        llm = map.get(cacheKey);
      }
    }
    if (!llm) {
      llm = await llmFixJson(s, schema);
      if (enableCache && cacheKey && globalThis.__ais_llm_cache) {
        // Only cache successful repairs to short-circuit repeated identical inputs
        if (llm.ok) globalThis.__ais_llm_cache.set(cacheKey, llm);
      }
    }
    diagnostics.push({ step: "llm.fallback", ok: llm.ok, note: llm.note, ms: Date.now()-t3 });
    if (!llm.ok) return { ok: false, decision: "QUARANTINE", repairs, diagnostics };
    obj = llm.value;
    repairs.push("llm");

    // 4) Re-validate strictly
    const t4 = Date.now();
    const v2 = validateAgainstSchema(obj, schema);
    diagnostics.push({ step: "schema.revalidate", ok: v2.ok, note: v2.ok ? "valid" : (v2.errors||[]).join("; "), ms: Date.now()-t4 });
    if (!v2.ok) return { ok: false, decision: "QUARANTINE", repairs, diagnostics };
  }
  // Optionally drop unknown properties (post validation so diagnostics reflect original)
  if (options?.dropUnknown && schema) {
    try { obj = pruneUnknown(obj, schema); } catch { /* ignore prune errors */ }
  }
  const final = redact(obj, options?.redactPaths || []);
  const finalCid = cid(final);
  const decision = repairs.length ? "ACCEPT_WITH_REPAIRS" : "ACCEPT";
  return { ok: true, decision, json: final, repairs, diagnostics, cid: finalCid };
}
