#!/usr/bin/env tsx
import Stripe from 'stripe';

async function main() {
  const key = process.env.STRIPE_API_KEY;
  if (!key) { console.error('STRIPE_API_KEY not set'); process.exit(1); }
  const [,, nameArg, unitAmountArg, intervalArg] = process.argv;
  const name = nameArg || 'AIS LLM Fallback (Live)';
  const unitAmount = Number(unitAmountArg || '1'); // cents
  const interval = intervalArg || 'month';
  if (Number.isNaN(unitAmount) || unitAmount <= 0) { console.error('Invalid unit amount (cents)'); process.exit(2); }
  const stripe = new Stripe(key, { apiVersion: '2024-06-20' });
  const product = await stripe.products.create({ name, description: 'Metered LLM fallback repairs for AI Immune System (live)' });
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: unitAmount,
    recurring: { interval, usage_type: 'metered' }
  } as any);
  console.log(JSON.stringify({ product: product.id, price: price.id, interval, unit_amount_cents: unitAmount }, null, 2));
}

main().catch(e => { console.error(e); process.exit(3); });
