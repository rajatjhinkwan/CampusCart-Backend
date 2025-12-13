// services/paymentService.js
/**
 * paymentService
 * - Uses Stripe SDK for:
 *   - creating checkout sessions (one-off payments for premium listings / ads)
 *   - verifying webhooks (server)
 * - Also provides a small helper to create payment intents if you prefer custom flows.
 */

let Stripe = null;
try { Stripe = require('stripe'); } catch (_) { Stripe = null; }

const stripe = Stripe && process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;
if (!stripe) console.warn('[paymentService] STRIPE_SECRET_KEY missing in .env');

const { STRIPE_WEBHOOK_SECRET } = process.env;

/** Create a Stripe Checkout Session */
async function createCheckoutSession({ priceCents, currency = 'inr', successUrl, cancelUrl, metadata = {}, customerEmail = null }) {
  if (!stripe) throw new Error('Stripe not configured');
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: metadata?.title || 'Premium Listing',
          },
          unit_amount: priceCents,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    customer_email: customerEmail || undefined,
  });
  return session;
}

/** Create PaymentIntent (for custom client flows) */
async function createPaymentIntent({ amountCents, currency = 'inr', metadata = {} }) {
  if (!stripe) throw new Error('Stripe not configured');
  const pi = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    metadata,
  });
  return pi;
}

/** Verify webhook signature & return event */
function constructStripeEvent(rawBody, signatureHeader) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook secret is not set');
  }
  try {
    const event = stripe.webhooks.constructEvent(rawBody, signatureHeader, STRIPE_WEBHOOK_SECRET);
    return event;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  createCheckoutSession,
  createPaymentIntent,
  constructStripeEvent,
  stripe, // exported for advanced use or tests
};
