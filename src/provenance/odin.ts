import nacl from "tweetnacl";

// Cached keypair so we only derive once
let cached: { seed: string; publicKey: Uint8Array; secretKey: Uint8Array; kid: string } | null = null;

function b64urlToBytes(b64url: string): Uint8Array {
  const pad = (str: string) => str + "===".slice((str.length + 3) % 4);
  const b64 = pad(b64url.replace(/-/g, "+").replace(/_/g, "/"));
  return new Uint8Array(Buffer.from(b64, "base64"));
}

function bytesToB64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export interface OdinSignature {
  cid: string;
  trace_id: string;
  ts: string;
  signature: string; // base64url
  kid: string;       // base64url(publicKey) (could be truncated later if desired)
}

function loadKey(): typeof cached {
  if (cached) return cached;
  const raw = process.env.ODIN_PRIVATE_KEY_B64?.trim();
  if (!raw) return null;
  const seedBytes = b64urlToBytes(raw);
  if (seedBytes.length !== 32) {
    // If a 64-byte key is provided (seed+pub), take first 32 as seed
    if (seedBytes.length >= 32) {
      const seed32 = seedBytes.slice(0, 32);
      const kp = nacl.sign.keyPair.fromSeed(seed32);
      cached = { seed: raw, publicKey: kp.publicKey, secretKey: kp.secretKey, kid: bytesToB64Url(kp.publicKey) };
      return cached;
    }
    throw new Error("ODIN private key must be 32-byte seed (base64url)");
  }
  const kp = nacl.sign.keyPair.fromSeed(seedBytes);
  cached = { seed: raw, publicKey: kp.publicKey, secretKey: kp.secretKey, kid: bytesToB64Url(kp.publicKey) };
  return cached;
}

export function signOdinReceipt(cid: string, trace_id: string, ts?: string): OdinSignature | null {
  const kp = loadKey();
  if (!kp) return null;
  const timestamp = ts || new Date().toISOString();
  const msg = `${cid}|${trace_id}|${timestamp}`;
  const sig = nacl.sign.detached(Buffer.from(msg), kp.secretKey);
  return { cid, trace_id, ts: timestamp, signature: bytesToB64Url(sig), kid: kp.kid };
}

export function verifyOdinReceipt(sig: OdinSignature): boolean {
  try {
    const msg = `${sig.cid}|${sig.trace_id}|${sig.ts}`;
    const pub = Buffer.from(sig.kid.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const sigBytes = b64urlToBytes(sig.signature);
    return nacl.sign.detached.verify(Buffer.from(msg), sigBytes, new Uint8Array(pub));
  } catch {
    return false;
  }
}
