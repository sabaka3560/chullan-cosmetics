import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validatePaymentVerification } from 'razorpay/dist/utils/razorpay-utils.js';
import { isRazorpayConfigured, razorpayConfig } from '../_lib/razorpay.js';

/**
 * Confirms a payment actually happened.
 *
 * Razorpay's checkout hands the browser `razorpay_order_id`,
 * `razorpay_payment_id` and `razorpay_signature` on success. The signature is
 * an HMAC of the first two under the key secret, so only someone holding that
 * secret could have produced it — which is what makes it proof rather than a
 * claim.
 *
 * This exists because the browser saying "I paid" means nothing. Anyone can
 * call a success URL. Without verifying here, a fabricated callback would show
 * an order confirmation and clear the cart for a payment that never happened.
 *
 * Uses the SDK's own `validatePaymentVerification` rather than a hand-rolled
 * HMAC: it is constant-time internally, and getting the concatenation order
 * wrong by hand fails open in the worst way — every signature verifies.
 */

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!isRazorpayConfigured()) {
    return response.status(501).json({ error: 'not_configured' });
  }

  const body = request.body as {
    razorpay_order_id?: unknown;
    razorpay_payment_id?: unknown;
    razorpay_signature?: unknown;
  };

  const orderId = String(body?.razorpay_order_id ?? '');
  const paymentId = String(body?.razorpay_payment_id ?? '');
  const signature = String(body?.razorpay_signature ?? '');

  if (!orderId || !paymentId || !signature) {
    return response.status(400).json({ error: 'missing_fields' });
  }

  try {
    const { keySecret } = razorpayConfig();
    const valid = validatePaymentVerification(
      { order_id: orderId, payment_id: paymentId },
      signature,
      keySecret,
    );

    if (!valid) {
      // Logged as a warning rather than an error: a mismatch is far more often
      // a stale callback or a mixed-up test/live key than an attack, and
      // burying real attacks under noise helps nobody either way.
      console.warn('[checkout/verify] signature mismatch', orderId);
      return response.status(400).json({ verified: false, error: 'invalid_signature' });
    }

    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({ verified: true, orderId, paymentId });
  } catch (cause) {
    console.error('[checkout/verify]', cause);
    return response.status(500).json({ error: 'server_error' });
  }
}
