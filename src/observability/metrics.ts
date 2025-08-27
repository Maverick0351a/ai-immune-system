import client from 'prom-client';

// Default registry & standard metrics
export const registry = new client.Registry();
registry.setDefaultLabels({ service: 'ai-immune-system' });
client.collectDefaultMetrics({ register: registry, prefix: 'ais_' });

export const requestCounter = new client.Counter({
  name: 'requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method','route','status']
});
export const llmFallbackCounter = new client.Counter({
  name: 'llm_fallback_total',
  help: 'Total LLM fallback repairs'
});

export const repairTimeHistogram = new client.Histogram({
  name: 'repair_duration_seconds',
  help: 'Duration of parse/repair and llm fallback steps in seconds',
  labelNames: ['step'],
  buckets: [0.005,0.01,0.025,0.05,0.1,0.25,0.5,1,2,5]
});

registry.registerMetric(requestCounter);
registry.registerMetric(llmFallbackCounter);
registry.registerMetric(repairTimeHistogram);

export function observeDiagnostics(diags: Array<{ step: string; ms?: number }>) {
  for (const d of diags) {
    if (!d.ms) continue;
    if (d.step === 'parse/repair' || d.step.startsWith('llm.')) {
      repairTimeHistogram.observe({ step: d.step }, d.ms / 1000);
    }
  }
}
