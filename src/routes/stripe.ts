import { Router } from 'express';
import Stripe from 'stripe';
import pino from 'pino';

const log = pino({ name: 'stripe-webhook' });

export function stripeWebhookRoute() {
  const r = Router();
  r.post('/webhook', expressRawBody(), (req, res) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return res.status(400).json({ error: 'webhook secret not configured' });
    const stripe = new Stripe(process.env.STRIPE_API_KEY || '', { apiVersion: '2024-06-20' });
    let event: Stripe.Event;
    try {
      const sig = req.header('stripe-signature') || '';
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err:any) {
      return res.status(400).json({ error: 'signature_verification_failed', message: err.message });
    }
    switch (event.type) {
      case 'invoice.payment_succeeded':
        log.info({ id: event.id, type: event.type }, 'invoice payment succeeded');
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        log.info({ id: event.id, type: event.type }, 'subscription event');
        break;
      default:
        log.debug({ id: event.id, type: event.type }, 'other stripe event');
    }
    res.json({ received: true });
  });
  return r;
}

// Minimal raw body middleware for Stripe webhook signature validation
import type { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
function expressRawBody() {
  return bodyParser.raw({ type: '*/*' });
}
