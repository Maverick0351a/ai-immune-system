// Lightweight Vercel function for uptime / health checks
export default function handler(req: any, res: any) {
  return res.status(200).json({ ok: true, service: "ai-immune-system", ts: new Date().toISOString() });
}
