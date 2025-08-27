import { z } from "zod";

export const OptionsSchema = z.object({
  coerce: z.boolean().default(true),
  dropUnknown: z.boolean().default(true),
  redactPaths: z.array(z.string()).default([]),
  disableLLM: z.boolean().default(false),
}).default({});

export type Options = z.infer<typeof OptionsSchema>;

export const RequestSchema = z.object({
  schema: z.any().nullable().optional(),
  json: z.union([z.string(), z.record(z.any())]),
  options: OptionsSchema.optional(),
  forward_url: z.string().url().refine(u => u.startsWith('http://') || u.startsWith('https://'), 'must be http(s) URL').optional()
});

export type ImmuneRequest = z.infer<typeof RequestSchema>;

export type Decision = "ACCEPT" | "ACCEPT_WITH_REPAIRS" | "QUARANTINE" | "REJECT";

export interface ImmuneResponse {
  trace_id: string;
  cid: string;
  decision: Decision;
  repairs: string[];
  final?: any;
  diagnostics: Array<{ step: string; ok: boolean; note?: string; ms?: number }>;
}
