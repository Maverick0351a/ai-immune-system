import { jsonrepair } from "jsonrepair";
import { stripWeirdChars } from "../security/sanitizers.js";

export function tryParse(input: string | object): { ok: boolean; value?: any; note?: string } {
  if (typeof input !== "string") return { ok: true, value: input, note: "input was object" };
  try {
    return { ok: true, value: JSON.parse(stripWeirdChars(input)), note: "parsed" };
  } catch {}
  try {
    const repaired = jsonrepair(stripWeirdChars(input));
    return { ok: true, value: JSON.parse(repaired), note: "jsonrepair" };
  } catch (e: any) {
    return { ok: false, note: e?.message || "failed to parse" };
  }
}
