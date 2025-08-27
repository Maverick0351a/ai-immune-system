import crypto from "crypto";
import stringify from "fast-json-stable-stringify";

export function canonical(obj: any): string {
  return stringify(obj);
}

export function cid(obj: any): string {
  const canon = canonical(obj);
  const h = crypto.createHash("sha256").update(canon).digest("hex");
  return `sha256:${h}`;
}
