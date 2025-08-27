import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/server.ts',
    'src/cli.ts',
    'src/pipeline/core.ts',
    'src/types.ts',
    'src/billing/stripe.ts',
    'src/policy/rego.ts',
    'src/observability/metrics.ts',
    'src/provenance/odin.ts',
    'src/routes/immune.ts',
    'src/routes/admin.ts',
    'src/routes/stripe.ts',
    'src/security/sanitizers.ts',
    'src/stages/json_repair.ts',
    'src/stages/llm_fallback.ts',
    'src/utils/canonical.ts'
  ],
  platform: 'node',
  target: 'node18',
  sourcemap: false,
  splitting: false, // avoid chunk wrappers that caused dynamic require issues on Fly
  clean: true,
  format: ['cjs'], // single CJS output for runtime simplicity
  dts: false,
  external: [
    'better-sqlite3',
    'express',
    'body-parser'
  ],
  // We rely on fs to read schema.sql; keep it in src and copy manually via Docker layer.
});
