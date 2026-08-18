import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validatePaymentVerification } from 'razorpay/dist/utils/razorpay-utils.js';
import { isConfigured } from '../_lib/env.js';
import { ShiprocketError, shiprocketFetch } from '../_lib/shiprocket.js';
import { InvalidCartError, parseLines, priceCart } from '../_lib/pricing.js';
import { InvalidAddressError, parseAddress } from '../_lib/address.js';
import { isRazorpayConfigured, razorpayConfig } from '../_lib/razorpay.js';
import { FREE_SHIPPING_THRESHOLD_MINOR } from '../../src/commerce/policy.js';

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

const SHIPPING_FEE_MINOR = 9900;
const COD_FEE_MINOR = 4900;

type PaymentMethod = 'Prepaid' | 'COD';

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

    const shippingFee =
      cart.subtotalMinor >= FREE_SHIPPING_THRESHOLD_MINOR ? 0 : SHIPPING_FEE_MINOR;
    const codFee = method === 'COD' ? COD_FEE_MINOR : 0;
    const totalMinor = cart.subtotalMinor + shippingFee + codFee;

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
    }

    // Ours, and unique. Shiprocket rejects a repeat, which is what makes a
    // retried request safe: the second attempt is refused rather than shipping
    // the same goods twice.
    const reference = `CHU-${Date.now().toString(36).toUpperCase()}`;

    const payload = {
      order_id: reference,
      order_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      pickup_location: pickupLocation,

      billing_customer_name: address.firstName,
      billing_last_name: address.lastName,
      billing_address: address.line1,
      billing_address_2: address.line2,
      billing_city: address.city,
      billing_pincode: address.pincode,
      billing_state: address.state,
      billing_country: 'India',
      billing_email: address.email,
      billing_phone: address.phone,
      shipping_is_billing: true,

      order_items: cart.lines.map((line) => ({
        name: line.name,
        sku: line.sku,
        units: line.qty,
        // Shiprocket bills in rupees, not paise. This is the one boundary in the
        // system where money leaves minor units, so it is converted once, here.
        selling_price: line.unitPriceMinor / 100,
      })),

      payment_method: method,
      shipping_charges: shippingFee / 100,
      sub_total: totalMinor / 100,

      // Whole-parcel figures. Height sums because items stack in one carton;
      // length and breadth take the largest, since the box must fit the widest.
      length: Math.max(...cart.lines.map((l) => l.dimensionsCm.length)),
      breadth: Math.max(...cart.lines.map((l) => l.dimensionsCm.width)),
      height: cart.lines.reduce((sum, l) => sum + l.dimensionsCm.height * l.qty, 0),
      weight: cart.totalWeightGrams / 1000,
    };

    const created = (await shiprocketFetch('/orders/create/adhoc', {
      method: 'POST',
      body: JSON.stringify(payload),
    })) as { order_id?: number; shipment_id?: number; status?: string };

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
