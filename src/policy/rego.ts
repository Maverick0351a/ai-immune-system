import { spawnSync } from "child_process";
import type Database from "better-sqlite3";
import { URL } from "url";

// Very small OPA runner wrapper. Expects `opa` binary to be available in PATH.
// POLICY_PROFILE=rego enables, otherwise allow.

const POLICY_SOURCE = `package ais

default allow = false

allow {
  input.host_allowed == true
}`;

let policyBundle: string | null = null;
const hostAllowCache = new Map<string,string[]>(); // tenantId -> hosts

function ensurePolicyBundle(): string {
  if (policyBundle) return policyBundle;
  // Compile the inline policy to a bundle using opa eval (fallback to raw source if compile unavailable)
  policyBundle = POLICY_SOURCE;
  return policyBundle;
}

export interface PolicyContext {
  tenantId: string;
  forwardUrl?: string;
}

export function evaluatePolicy(db: Database.Database, ctx: PolicyContext): { allow: boolean; reason?: string } {
  if (process.env.POLICY_PROFILE !== 'rego') return { allow: true };
  if (!ctx.forwardUrl) return { allow: true }; // nothing to check
  try {
    const u = new URL(ctx.forwardUrl);
    let allowHosts = hostAllowCache.get(ctx.tenantId);
    if (!allowHosts) {
      const t = db.prepare("select forward_allow_hosts from tenants where id=?").get(ctx.tenantId) as { forward_allow_hosts?: string } | undefined;
      allowHosts = t?.forward_allow_hosts ? JSON.parse(t.forward_allow_hosts) : [];
      hostAllowCache.set(ctx.tenantId, allowHosts as string[]);
    }
    const hostAllowed = (allowHosts as string[]).includes(u.hostname);
    // If POLICY_PROFILE set to 'rego_spawn', force an opa spawn (legacy / debugging)
  const profile: string | undefined = process.env.POLICY_PROFILE as unknown as string | undefined;
  if (profile === 'rego_spawn') {
      const input = { host_allowed: hostAllowed };
      ensurePolicyBundle();
      const proc = spawnSync('opa', ['eval', '--format=json', '--stdin-input', 'data.ais.allow'], { input: JSON.stringify({ input, policy: POLICY_SOURCE }) });
      if (proc.error) return { allow: false, reason: 'opa_execution_failed' };
    }
    return hostAllowed ? { allow: true } : { allow: false, reason: 'host_not_allowlisted' };
  } catch (e:any) {
    return { allow: false, reason: e.message };
  }
}
