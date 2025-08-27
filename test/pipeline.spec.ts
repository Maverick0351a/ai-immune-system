import { describe, it, expect } from 'vitest';
import { runPipeline } from '../src/pipeline/core.js';

describe('pipeline', () => {
  it('repairs simple numeric string deterministically', async () => {
    const schema = { type: 'object', properties: { amount: { type: 'number' } }, required: ['amount'] };
  const out = await runPipeline("{amount: '42'}", schema, { coerce: true, dropUnknown: true, redactPaths: [], disableLLM: false });
    expect(out.ok).toBe(true);
    expect(out.decision).toMatch(/ACCEPT/);
    expect(out.json?.amount).toBe(42);
    expect(out.repairs).toContain('jsonrepair');
  });

  it('QUARANTINE when schema invalid and LLM disabled', async () => {
    const schema = { type: 'object', properties: { v: { type: 'number' } }, required: ['v'] };
  const out = await runPipeline('{"v":"not-a-number"}', schema, { coerce: true, dropUnknown: true, redactPaths: [], disableLLM: true });
  expect(out.ok).toBe(false);
  // With disableLLM true we expect a direct REJECT (no fallback)
  expect(out.decision).toBe('REJECT');
  });
});
