import { describe, it, expect, vi } from 'vitest';
import * as llm from '../src/stages/llm_fallback.js';
import { runPipeline } from '../src/pipeline/core.js';

describe('LLM cache', () => {
  it('caches successful fallback for identical input', async () => {
  const schema = { type: 'object', properties: { v: { type: 'integer' } }, required: ['v'] };
  const spy = vi.spyOn(llm, 'llmFixJson').mockResolvedValue({ ok: true, value: { v: 123 }, note: 'mock' });
  // Provide an object where v is a spelled-out word so ajv cannot coerce to integer
  const raw = '{"v":"one two three"}';
    const first = await runPipeline(raw, schema, { coerce: true, dropUnknown: true, redactPaths: [], disableLLM: false });
    const second = await runPipeline(raw, schema, { coerce: true, dropUnknown: true, redactPaths: [], disableLLM: false });
    expect(first.repairs).toContain('llm');
    expect(second.repairs).toContain('llm');
    expect(spy).toHaveBeenCalledTimes(1); // second hit from cache
  });
});
