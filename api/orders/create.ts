import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validatePaymentVerification } from 'razorpay/dist/utils/razorpay-utils.js';
import { isConfigured } from '../_lib/env.js';
import { ShiprocketError } from '../_lib/shiprocket.js';
import { InvalidCartError, parseLines, priceCart } from '../_lib/pricing.js';
import type { PricedCart } from '../_lib/pricing.js';
import { InvalidAddressError, parseAddress } from '../_lib/address.js';
import type { Address } from '../_lib/address.js';
import { IncompleteNotesError, fromNotes } from '../_lib/pending.js';
import { isRazorpayConfigured, isTestMode, razorpayClient, razorpayConfig } from '../_lib/razorpay.js';
import { buildOrderPayload, paidAmountMatches, placeOrder, totalsFor } from '../_lib/fulfil.js';
import { TimeoutError, withTimeout } from '../_lib/timeout.js';
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
 * request, exactly as everywhere else.
 *
 *
 * WHY THE PREPAID BAG DOES NOT COME FROM THE REQUEST
 *
 * Re-pricing alone is not enough here, and the gap is worth naming because
 * every individual check passes while it is open.
 *
 * Razorpay's signature is an HMAC over `order_id|payment_id`. It proves a
 * payment exists and belongs to that order. There is no basket inside it and it
 * says nothing about goods. So if the bag arrives in the same request as the
 * signature, a buyer can pay for the cheapest thing in the catalog, keep the
 * signature they were legitimately given, and post it back beside a different,
 * larger bag: real signature, real payment, real SKUs, dutifully re-priced — to
 * a total nobody paid. Ten Pro Glow foundations shipped against ₹795.
 *
 * The bag is therefore read from the Razorpay order's own `notes`, fetched over
 * an authenticated connection, which is the same source and the same reasoning
 * the webhook uses. The request supplies the payment proof and nothing else.
 *
 * Where notes are missing — an order created before they were stored — the
 * request is used, but only if re-pricing it lands exactly on the amount the
 * Razorpay order was created for. That figure came from the server at session
 * time, so it is ours rather than the caller's, and a swapped bag cannot match
 * it.
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

    /*
     * Ours, and unique. Shiprocket rejects a repeat, which is what makes the
     * webhook safe to run alongside this: whichever arrives second is refused
     * rather than shipping the same goods twice.
     *
     * Cash on delivery has no Razorpay order to carry a reference, so it mints
     * its own. Prepaid overwrites this with the one stored at session time.
     */
    let reference = `${isTestMode() ? 'TEST-' : ''}CHU-${Date.now().toString(36).toUpperCase()}`;
    let address: Address;
    let cart: PricedCart;

    if (method === 'COD') {
      // Nothing has been paid, so there is no authenticated record to read
      // from: the request is all there is, and re-pricing is what protects the
      // amount that will be collected on the doorstep.
      address = parseAddress(body?.address);
      cart = priceCart(parseLines(body));
    } else {
      /*
       * Prepaid must prove the payment before an order exists. Creating first
       * and verifying after would mean a failed signature leaves a real
       * shipment in the panel that somebody has to notice and cancel by hand.
       */
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
       * Fetched after the signature is verified, so this is a lookup of an
       * order the buyer has provably paid for — and it is the authority for
       * what to ship, not the request body.
       */
      const rzpOrder = (await withTimeout(
        'Razorpay orders.fetch',
        razorpayClient().orders.fetch(orderId),
      )) as {
        notes?: unknown;
        amount?: number | string;
      };
      const paidMinor = Number(rzpOrder.amount);

      try {
        const pending = fromNotes(rzpOrder.notes);
        reference = pending.reference;
        address = pending.address;
        cart = priceCart(pending.lines);
      } catch (cause) {
        if (!(cause instanceof IncompleteNotesError)) throw cause;
        /*
         * An order predating the notes format. The request is the only record
         * of the bag, so it is used — but it has to land exactly on the amount
         * this order was created for, which the server computed at session time
         * and the caller cannot influence. A swapped bag prices to a different
         * number and is refused below.
         */
        console.warn('[orders/create] no notes on', orderId, '— falling back to request');
        address = parseAddress(body?.address);
        cart = priceCart(parseLines(body));
      }

      /*
       * The last gate, and it applies to both branches above.
       *
       * In the notes branch a mismatch means the catalog moved between payment
       * and fulfilment, so the goods are not the goods that were paid for. In
       * the fallback branch it is the check doing the actual work. Either way
       * it needs a person, not an automatic shipment.
       */
      if (!paidAmountMatches(paidMinor, cart)) {
        console.error(
          '[orders/create] AMOUNT MISMATCH — not shipping',
          orderId,
          'paid',
          paidMinor,
          'cart',
          cart.subtotalMinor,
        );
        return response.status(400).json({ error: 'amount_mismatch' });
      }
    }

    const { totalMinor } = totalsFor(cart, method);

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
    /*
     * Everything below may be running after the money has moved, so each log
     * carries the two ids that identify the payment in Razorpay. Without them
     * a failure here is a line saying something went wrong for somebody, and
     * reconciling it means reading the whole day's payments by hand.
     *
     * `reference` is scoped inside the try and is not reachable here; these are.
     */
    const ids = request.body as {
      razorpay_payment_id?: unknown;
      razorpay_order_id?: unknown;
    };
    const paid = `payment ${String(ids?.razorpay_payment_id ?? '-')} order ${String(ids?.razorpay_order_id ?? '-')}`;

    if (cause instanceof TimeoutError) {
      // Upstream went quiet rather than refused. The webhook will retry this
      // order for hours, so the buyer is not stranded — but say so plainly.
      console.error('[orders/create] TIMEOUT', cause.message, paid);
      return response.status(504).json({ error: 'upstream_timeout' });
    }
    if (cause instanceof ShiprocketError) {
      // Deliberately loud: a payment may already have been taken, so a failure
      // here is money in without goods out and needs a human.
      console.error('[orders/create] SHIPROCKET FAILED', cause.status, cause.message, paid);
      return response.status(502).json({ error: 'order_creation_failed' });
    }
    console.error('[orders/create]', cause, paid);
    return response.status(500).json({ error: 'server_error' });
  }
}
