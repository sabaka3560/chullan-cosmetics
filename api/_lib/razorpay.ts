import Razorpay from 'razorpay';

/**
 * Razorpay client and configuration.
 *
 * Two keys, and only one of them is a secret. `keyId` (`rzp_test_…` /
 * `rzp_live_…`) is published to the browser by design — Checkout needs it to
 * identify the merchant. `keySecret` signs orders and verifies payments and
 * must never leave the server, which is why it has no `VITE_` prefix and is
 * read here rather than imported anywhere near the bundle.
 *
 * Constructed lazily. A module-scope client would throw during import when the
 * variables are unset, which surfaces as an opaque 500 with nothing in the log
 * pointing at the cause; building it per call lets the handler answer 501 and
 * name what is missing.
 */

export class MissingRazorpayConfigError extends Error {
  constructor(name: string) {
    super(`Missing required environment variable: ${name}`);
    this.name = 'MissingRazorpayConfigError';
  }
}

export function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId) throw new MissingRazorpayConfigError('RAZORPAY_KEY_ID');
  if (!keySecret) throw new MissingRazorpayConfigError('RAZORPAY_KEY_SECRET');
  return { keyId, keySecret };
}

export function razorpayClient(): Razorpay {
  const { keyId, keySecret } = razorpayConfig();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export const isRazorpayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

/**
 * Test keys are prefixed `rzp_test_`. Surfaced to the client so the order
 * confirmation can say plainly that no money moved — a "thank you" screen for a
 * payment that never happened is exactly the thing that must not look real.
 */
export const isTestMode = () =>
  (process.env.RAZORPAY_KEY_ID ?? '').startsWith('rzp_test_');
