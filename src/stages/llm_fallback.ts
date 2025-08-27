import OpenAI from "openai";
import { llmFallbackCounter } from "../observability/metrics.js";

export interface LLMResult {
  ok: boolean;
  value?: any;
  note?: string; // description of outcome or failure reason
}

// Internal helper: run promise with timeout race
async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  if (ms <= 0) return p; // disabled
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timeout after ${ms}ms`)), ms))
  ]);
}

/**
 * Attempt to repair JSON using OpenAI.
 * Features:
 *  - Primary + optional fallback model retry (env: OPENAI_MODEL / OPENAI_FALLBACK_MODEL)
 *  - Timeout (env: OPENAI_TIMEOUT_MS, default 8000)
 *  - Debug logging when LLM_DEBUG is truthy (no payload leaking unless explicitly allowed)
 *  - Metrics increment on success
 */
export async function llmFixJson(raw: string, schema?: any): Promise<LLMResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, note: "OPENAI_API_KEY not set; LLM disabled" };

  const primaryModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const fallbackModel = process.env.OPENAI_FALLBACK_MODEL || "gpt-4o"; // only used if different
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 8000);
  const debug = !!process.env.LLM_DEBUG;

  const openai = new OpenAI({ apiKey: key });
  const sys = "You are a strict JSON repair assistant. Always output ONLY minified JSON. No comments. No markdown.";
  const schemaNote = schema ? `Here is a JSON Schema (draft 2020-12). Output must validate strictly: ${JSON.stringify(schema)}` : "No schema is provided; preserve original structure.";
  // We do not include full raw input in debug logs to avoid sensitive data leakage.
  const prompt = `Fix this to valid JSON. Do not change meaning. ${schemaNote}\nINPUT:\n${raw}`;

  async function attempt(model: string) {
    if (debug) console.log(`[llm] attempt model=${model} timeoutMs=${timeoutMs}`);
    const resp = await withTimeout(
      openai.chat.completions.create({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      }),
      timeoutMs,
      `openai:${model}`
    );
    const content = resp.choices[0]?.message?.content || "";
    const text = typeof content === "string" ? content : JSON.stringify(content);
    try {
      return JSON.parse(text);
    } catch (e: any) {
      throw new Error(`parse failure for model ${model}: ${e.message}`);
    }
  }

  let usedModel = primaryModel;
  try {
    const parsed = await attempt(primaryModel);
    llmFallbackCounter.inc();
    return { ok: true, value: parsed, note: `llm:${usedModel}` };
  } catch (ePrimary: any) {
    if (debug) console.warn(`[llm] primary failed model=${primaryModel} err=${ePrimary?.message}`);
    if (fallbackModel && fallbackModel !== primaryModel) {
      try {
        usedModel = fallbackModel;
        const parsed = await attempt(fallbackModel);
        llmFallbackCounter.inc();
        return { ok: true, value: parsed, note: `llm:${usedModel}` };
      } catch (eFallback: any) {
        if (debug) console.warn(`[llm] fallback failed model=${fallbackModel} err=${eFallback?.message}`);
        return { ok: false, note: `LLM error: ${eFallback?.message}; primary: ${ePrimary?.message}` };
      }
    }
    return { ok: false, note: `LLM error: ${ePrimary?.message}` };
  }
}
