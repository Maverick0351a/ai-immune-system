import Ajv, { type DefinedError } from "ajv";
import addFormats from "ajv-formats";
// @ts-ignore - JSON module outside src included via tsconfig include
import paymentSchema from "../../schemas/payment.schema.json" assert { type: "json" };

const ajv = new Ajv({ allErrors: true, coerceTypes: true, removeAdditional: "failing" });
addFormats(ajv);

// Custom keyword: ensure a date-time string is within +/- 24h of now
ajv.addKeyword({
  keyword: "within24h",
  type: "string",
  errors: true,
  validate: function (_schema: boolean, data: any) {
    const t = Date.parse(data);
    if (isNaN(t)) return false;
    const delta = Math.abs(Date.now() - t);
    return delta <= 24 * 3600 * 1000; // 24h in ms
  }
});

export const Schemas = {
  payment: paymentSchema as any
};

export function validateAgainstSchema(obj: any, schema?: any): { ok: boolean; errors?: string[]; coerced?: any } {
  if (!schema) return { ok: true, coerced: obj };
  const validate = ajv.compile(schema);
  const ok = validate(obj);
  if (ok) return { ok: true, coerced: obj };
  const errors = (validate.errors as DefinedError[] || []).map(e => `${e.instancePath || '/'} ${e.message}`);
  return { ok: false, errors };
}
