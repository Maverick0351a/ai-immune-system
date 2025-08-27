#!/usr/bin/env tsx
import Stripe from 'stripe';

async function main() {
  const key = process.env.STRIPE_API_KEY;
  if (!key) {
    console.error('STRIPE_API_KEY not set');
    process.exit(1);
  }
  const [,, productId, unitAmountArg, intervalArg] = process.argv;
  if (!productId) {
    console.error('Usage: tsx createMeteredPrice.ts <product_id> [unit_amount_cents=1] [interval=month]');
    process.exit(2);
  }
  const unitAmount = Number(unitAmountArg || '1');
  const interval = intervalArg || 'month';
  const stripe = new Stripe(key, { apiVersion: '2024-06-20' });
  const price = await stripe.prices.create({
    product: productId,
    currency: 'usd',
    unit_amount: unitAmount,
    recurring: { interval, usage_type: 'metered' }
  } as any); // usage_type typed limitation
  console.log(JSON.stringify({ id: price.id, recurring: price.recurring }, null, 2));
}

main().catch(e => { console.error(e); process.exit(3); });
