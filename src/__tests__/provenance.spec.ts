import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { signOdinReceipt, verifyOdinReceipt } from "../provenance/odin.js";

// 32 zero bytes base64 => AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
const TEST_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"; // no padding
let previous: string | undefined;

describe("ODIN provenance signatures", () => {
  beforeAll(() => {
    previous = process.env.ODIN_PRIVATE_KEY_B64;
    process.env.ODIN_PRIVATE_KEY_B64 = TEST_KEY;
  });
  afterAll(() => {
    if (previous === undefined) delete process.env.ODIN_PRIVATE_KEY_B64; else process.env.ODIN_PRIVATE_KEY_B64 = previous;
  });

  it("signs and verifies a receipt", () => {
    const sig = signOdinReceipt("cid123", "trace456", "2024-01-01T00:00:00.000Z");
    expect(sig).not.toBeNull();
    expect(sig!.signature).toBeTypeOf("string");
    expect(verifyOdinReceipt(sig!)).toBe(true);
  });

  it("fails verification if message mutated", () => {
    const sig = signOdinReceipt("cid999", "traceABC", "2024-01-01T00:00:00.000Z")!;
    // Tamper by changing cid
    const tampered = { ...sig, cid: "other" };
    expect(verifyOdinReceipt(tampered as any)).toBe(false);
  });
});
