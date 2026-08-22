import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { isConfigured } from '../_lib/env.js';
import { ShiprocketError } from '../_lib/shiprocket.js';
import { InvalidCartError, priceCart } from '../_lib/pricing.js';
import { InvalidAddressError } from '../_lib/address.js';
import { isRazorpayConfigured, razorpayClient } from '../_lib/razorpay.js';
import { buildOrderPayload, paidAmountMatches, placeOrder, totalsFor } from '../_lib/fulfil.js';
import { IncompleteNotesError, fromNotes } from '../_lib/pending.js';

/**
 * Razorpay's `payment.captured` webhook. The safety net under the checkout.
 *
 * The hole it closes: the browser creates the Shiprocket order immediately
 * after Razorpay's handler fires, and for the overwhelming majority of buyers
 * that works. But the browser is not a reliable place to finish a transaction.
 * A tab closed on the confirmation screen, a phone that sleeps, a train that
 * enters a tunnel — and the money is gone with no order behind it. Before this
 * endpoint existed the buyer saw a payment reference and a request to email us,
 * which is a refund and an apology dressed up as a recovery.
 *
 * Razorpay retries this call for hours, so the order lands even if we are down
 * at the moment of capture.
 *
 *
 * WHY THE PAYLOAD IS NOT TRUSTED
 *
 * The signature is checked when a raw body is available, but it is not what
 * authorises the order. The body is re-fetched from Razorpay over an
 * authenticated connection before anything ships: the payment must exist under
 * our own account and its status must be `captured` according to Razorpay
 * rather than according to the caller.
 *
 * That inversion matters, because a serverless runtime may have already parsed
 * and re-serialised the body by the time we see it, and an HMAC over
 * re-serialised JSON is an HMAC over different bytes. Rather than depend on the
 * platform preserving them, the request is treated as nothing more than a
 * nudge: "look at this payment id". A forged one names a payment that does not
 * exist, the lookup fails, and nothing is created.
 *
 *
 * WHY IT IS SAFE TO RUN TWICE
 *
 * It usually does. The normal path is that the browser already created the
 * order seconds ago. Both paths use the reference stored on the Razorpay order,
 * so the second arrival asks Shiprocket to create an `order_id` that already
 * exists and is refused — which is exactly the desired outcome, and is reported
 * as success so Razorpay stops retrying.
 */

/** Razorpay retries on any non-2xx, so a 200 means "stop sending this". */
const STOP = 200;
/** Ask for a retry: something on our side failed and may work next time. */
const RETRY = 500;

function verifySignature(request: VercelRequest, secret: string): 'ok' | 'bad' | 'unavailable' {
  const header = request.headers['x-razorpay-signature'];
  const signature = Array.isArray(header) ? header[0] : header;
  if (!signature) return 'bad';

  // Only a body still in its original bytes can be verified. Anything the
  // runtime has already turned into an object cannot be re-serialised back to
  // the exact input Razorpay signed.
  const body = request.body as unknown;
  const raw =
    typeof body === 'string' ? body : Buffer.isBuffer(body) ? body.toString('utf8') : null;
  if (raw === null) return 'unavailable';

  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return 'bad';
  return timingSafeEqual(a, b) ? 'ok' : 'bad';
}

/** The payment id is all we take from the request. Everything else is fetched. */
function paymentIdFrom(body: unknown): string {
  const parsed =
    typeof body === 'string'
      ? (JSON.parse(body) as Record<string, unknown>)
      : Buffer.isBuffer(body)
        ? (JSON.parse(body.toString('utf8')) as Record<string, unknown>)
        : ((body ?? {}) as Record<string, unknown>);

  const payload = parsed.payload as { payment?: { entity?: { id?: unknown } } } | undefined;
  const id = payload?.payment?.entity?.id;
  return typeof id === 'string' ? id : '';
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!isRazorpayConfigured() || !isConfigured.shiprocket()) {
    console.error('[webhook] not configured');
    return response.status(501).json({ error: 'not_configured' });
  }

  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION;
  if (!pickupLocation) {
    console.error('[webhook] SHIPROCKET_PICKUP_LOCATION is not set');
    return response.status(501).json({ error: 'not_configured' });
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (secret) {
    const result = verifySignature(request, secret);
    if (result === 'bad') {
      // Not retryable and not ours. Loud, because a stream of these is either a
      // misconfigured secret or somebody probing the endpoint.
      console.warn('[webhook] signature rejected');
      return response.status(400).json({ error: 'invalid_signature' });
    }
    if (result === 'unavailable') {
      // Expected on runtimes that parse the body before we see it. The
      // authenticated re-fetch below is what actually gates the order.
      console.warn('[webhook] raw body unavailable; relying on payment lookup');
    }
  } else {
    console.warn('[webhook] RAZORPAY_WEBHOOK_SECRET is not set; relying on payment lookup');
  }

  let paymentId = '';
  try {
    paymentId = paymentIdFrom(request.body);
  } catch {
    return response.status(STOP).json({ ok: true, ignored: 'unparseable body' });
  }
  if (!paymentId) {
    return response.status(STOP).json({ ok: true, ignored: 'no payment id' });
  }

  try {
    /*
     * The authorisation step. This runs against Razorpay with our key secret,
     * so it answers "is this a real captured payment on our account" rather
     * than "did something claim it was".
     */
    const payment = (await razorpayClient().payments.fetch(paymentId)) as {
      status?: string;
      order_id?: string;
      amount?: number | string;
    };

    if (payment.status !== 'captured') {
      // Authorised-but-not-captured, failed, refunded. Nothing to ship, and
      // nothing that will change by retrying.
      return response.status(STOP).json({ ok: true, ignored: `status ${payment.status}` });
    }
    if (!payment.order_id) {
      console.error('[webhook] captured payment has no order', paymentId);
      return response.status(STOP).json({ ok: true, ignored: 'no order on payment' });
    }

    const order = (await razorpayClient().orders.fetch(payment.order_id)) as {
      notes?: unknown;
    };

    const pending = fromNotes(order.notes);
    // Re-priced from the catalog, never from the notes. The notes carry SKUs
    // and quantities; what they cost is not theirs to say.
    const cart = priceCart(pending.lines);

    /*
     * The captured amount is checked against what this bag costs.
     *
     * Prices can move between a payment being taken and a webhook arriving, and
     * a mismatch means the goods about to be shipped are not the goods that
     * were paid for. That needs a human, not an automatic shipment.
     *
     * The comparison allows the subtotal *or* the subtotal plus our shipping
     * fee, because Magic Checkout adds delivery on top of the amount the order
     * was created for — see `paidAmountMatches`. This previously compared
     * against the subtotal alone, which would have refused every real order
     * that paid for shipping, on the one path where nobody is watching.
     */
    const { totalMinor } = totalsFor(cart, 'Prepaid');
    const captured = Number(payment.amount);
    if (!paidAmountMatches(captured, cart)) {
      console.error(
        '[webhook] AMOUNT MISMATCH — not shipping',
        pending.reference,
        'captured',
        captured,
        'cart',
        cart.subtotalMinor,
      );
      return response.status(STOP).json({ ok: true, ignored: 'amount mismatch' });
    }

    const created = await placeOrder(
      buildOrderPayload({
        reference: pending.reference,
        address: pending.address,
        cart,
        method: 'Prepaid',
        pickupLocation,
      }),
    );

    if (created.duplicate) {
      // The ordinary case: the browser got there first.
      console.log('[webhook] already fulfilled', pending.reference);
      return response.status(STOP).json({ ok: true, reference: pending.reference, already: true });
    }

    // The case this endpoint exists for. Logged loudly because it means a
    // buyer's browser did not finish, and a run of these is worth investigating.
    console.log(
      '[webhook] RESCUED ORDER',
      pending.reference,
      'shiprocket',
      created.order_id,
      'total',
      totalMinor,
    );
    return response
      .status(STOP)
      .json({ ok: true, reference: pending.reference, rescued: true });
  } catch (cause) {
    if (cause instanceof IncompleteNotesError) {
      // Nothing to rebuild from, and retrying cannot invent it.
      console.error('[webhook] cannot fulfil', paymentId, cause.message);
      return response.status(STOP).json({ ok: true, ignored: 'incomplete notes' });
    }
    if (cause instanceof InvalidAddressError || cause instanceof InvalidCartError) {
      console.error('[webhook] unfulfillable order', paymentId, cause.message);
      return response.status(STOP).json({ ok: true, ignored: 'invalid order data' });
    }
    if (cause instanceof ShiprocketError) {
      // Worth retrying: Shiprocket being briefly unavailable is exactly the
      // situation Razorpay's retry schedule is for.
      console.error('[webhook] SHIPROCKET FAILED', cause.status, cause.message);
      return response.status(RETRY).json({ error: 'shiprocket_failed' });
    }
    console.error('[webhook]', cause);
    return response.status(RETRY).json({ error: 'server_error' });
  }
}
