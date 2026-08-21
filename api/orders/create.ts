import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validatePaymentVerification } from 'razorpay/dist/utils/razorpay-utils.js';
import { isConfigured } from '../_lib/env.js';
import { ShiprocketError } from '../_lib/shiprocket.js';
import { InvalidCartError, parseLines, priceCart } from '../_lib/pricing.js';
import { InvalidAddressError, parseAddress } from '../_lib/address.js';
import { isRazorpayConfigured, isTestMode, razorpayClient, razorpayConfig } from '../_lib/razorpay.js';
import { buildOrderPayload, placeOrder, totalsFor } from '../_lib/fulfil.js';
import type { PaymentMethod } from '../_lib/fulfil.js';

/**
 * Places the order in Shiprocket. The end of the purchase, for both paths.
 *
 * Prepaid arrives here after Razorpay has taken the money, carrying the payment
 * signature; that signature is verified before anything is created, because a
 * browser claiming payment is a claim and only the signature is proof. Cash on
 * delivery arrives with no payment at all and is created directly.
 *
 * Shiprocket is the order store — the reason this needs no database. Both paths
 * converge on one record in the panel that fulfilment already works from.
 *
 * The cart is re-priced here from the catalog rather than trusted from the
 * request, exactly as everywhere else. For prepaid there is a second reason:
 * the amount actually captured must be checked against what the order claims,
 * or a tampered client could pay for one item and be shipped ten.
 */

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!isConfigured.shiprocket()) {
    return response.status(501).json({
      error: 'not_configured',
      message: 'Shiprocket credentials are not set.',
    });
  }

  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION;
  if (!pickupLocation) {
    return response.status(501).json({
      error: 'not_configured',
      message:
        'SHIPROCKET_PICKUP_LOCATION is not set. It must match a verified pickup ' +
        'address nickname exactly — call /api/pickup-locations to list them.',
    });
  }

  try {
    const body = request.body as Record<string, unknown>;
    const method: PaymentMethod = body?.paymentMethod === 'COD' ? 'COD' : 'Prepaid';

    const address = parseAddress(body?.address);
    const cart = priceCart(parseLines(body));
    const { totalMinor } = totalsFor(cart, method);

    /*
     * Ours, and unique. Shiprocket rejects a repeat, which is what makes the
     * webhook safe to run alongside this: whichever arrives second is refused
     * rather than shipping the same goods twice.
     *
     * For a prepaid order the reference is not minted here — it was minted when
     * the Razorpay order was created and lives in its notes. Reading it back
     * means this path and the webhook converge on one Shiprocket record. Cash
     * on delivery has no Razorpay order, so it mints its own.
     */
    let reference = `${isTestMode() ? 'TEST-' : ''}CHU-${Date.now().toString(36).toUpperCase()}`;

    /*
     * Prepaid must prove the payment before an order exists. Creating first and
     * verifying after would mean a failed signature leaves a real shipment in
     * the panel that somebody has to notice and cancel by hand.
     */
    if (method === 'Prepaid') {
      if (!isRazorpayConfigured()) {
        return response.status(501).json({ error: 'not_configured' });
      }
      const orderId = String(body?.razorpay_order_id ?? '');
      const paymentId = String(body?.razorpay_payment_id ?? '');
      const signature = String(body?.razorpay_signature ?? '');
      if (!orderId || !paymentId || !signature) {
        return response.status(400).json({ error: 'missing_payment_proof' });
      }

      const { keySecret } = razorpayConfig();
      const valid = validatePaymentVerification(
        { order_id: orderId, payment_id: paymentId },
        signature,
        keySecret,
      );
      if (!valid) {
        console.warn('[orders/create] signature mismatch', orderId);
        return response.status(400).json({ error: 'invalid_signature' });
      }

      /*
       * Read after the signature is verified, so this is a lookup of an order
       * the buyer has provably paid for. If the note is missing — an order made
       * before this existed, say — the locally minted reference above stands,
       * and the worst case is the old behaviour rather than a failed checkout.
       */
      try {
        const rzpOrder = (await razorpayClient().orders.fetch(orderId)) as {
          notes?: Record<string, unknown>;
        };
        const stored = rzpOrder.notes?.reference;
        if (typeof stored === 'string' && stored) reference = stored;
      } catch (cause) {
        console.warn('[orders/create] could not read order notes', orderId, cause);
      }
    }

    const created = await placeOrder(
      buildOrderPayload({ reference, address, cart, method, pickupLocation }),
    );

    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({
      reference,
      shiprocketOrderId: created.order_id,
      shipmentId: created.shipment_id,
      paymentMethod: method,
      totalMinor,
      itemCount: cart.itemCount,
    });
  } catch (cause) {
    if (cause instanceof InvalidAddressError) {
      return response
        .status(400)
        .json({ error: 'invalid_address', field: cause.field, message: cause.message });
    }
    if (cause instanceof InvalidCartError) {
      return response.status(400).json({ error: 'invalid_cart', message: cause.message });
    }
    if (cause instanceof ShiprocketError) {
      // Deliberately loud: a payment may already have been taken, so a failure
      // here is money in without goods out and needs a human.
      console.error('[orders/create] SHIPROCKET FAILED', cause.status, cause.message);
      return response.status(502).json({ error: 'order_creation_failed' });
    }
    console.error('[orders/create]', cause);
    return response.status(500).json({ error: 'server_error' });
  }
}
