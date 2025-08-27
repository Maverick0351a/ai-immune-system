import { describe, it, expect } from "vitest";
import { validateAgainstSchema, Schemas } from "../pipeline/schema.js";

const payment = Schemas.payment;

describe("payment schema validation", () => {
  it("accepts a valid payment", () => {
    const obj = { amount: 123.45, currency: "USD", timestamp: new Date().toISOString() };
    const v = validateAgainstSchema(obj, payment);
    expect(v.ok).toBe(true);
  });

  it("rejects negative amount", () => {
    const obj = { amount: -1, currency: "USD", timestamp: new Date().toISOString() };
    const v = validateAgainstSchema(obj, payment);
    expect(v.ok).toBe(false);
  });

  it("rejects overly large amount", () => {
    const obj = { amount: 1000001, currency: "USD", timestamp: new Date().toISOString() };
    const v = validateAgainstSchema(obj, payment);
    expect(v.ok).toBe(false);
  });

  it("rejects unsupported currency", () => {
    const obj = { amount: 10, currency: "JPY", timestamp: new Date().toISOString() };
    const v = validateAgainstSchema(obj, payment);
    expect(v.ok).toBe(false);
  });

  it("rejects timestamp too old", () => {
    const obj = { amount: 10, currency: "USD", timestamp: new Date(Date.now() - 25*3600*1000).toISOString() };
    const v = validateAgainstSchema(obj, payment);
    expect(v.ok).toBe(false);
  });

  it("rejects timestamp too far in future", () => {
    const obj = { amount: 10, currency: "USD", timestamp: new Date(Date.now() + 25*3600*1000).toISOString() };
    const v = validateAgainstSchema(obj, payment);
    expect(v.ok).toBe(false);
  });

  it("rejects invalid timestamp format", () => {
    const obj = { amount: 10, currency: "USD", timestamp: "not-a-date" };
    const v = validateAgainstSchema(obj, payment);
    expect(v.ok).toBe(false);
  });
});
