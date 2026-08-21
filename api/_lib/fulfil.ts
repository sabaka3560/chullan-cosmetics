import { ShiprocketError, shiprocketFetch } from './shiprocket.js';
import type { Address } from './address.js';
import type { PricedCart } from './pricing.js';
import { orderTotals } from '../../src/commerce/policy.js';
import type { PaymentMethod } from '../../src/commerce/policy.js';

export type { PaymentMethod };

/**
 * Turning a paid cart into a Shiprocket order. One definition, two callers.
 *
 * The browser reaches here through `/api/orders/create` the moment Razorpay's
 * handler fires. The webhook reaches here when Razorpay reports the capture,
 * which is the path that matters when the browser never came back — a closed
 * tab, a dead battery, a train tunnel. Money has been taken in both cases, so
 * both must end at the same record.
 *
 * They therefore cannot be two implementations. A shipping fee that differs by
 * a rupee between them, or a payload the webhook builds slightly differently,
 * is a discrepancy nobody sees until a customer asks why their invoice does not
 * match — so the payload, the fees and the totals are all built here.
 */

/** Thin wrapper so callers here can pass a priced cart rather than a number. */
export function totalsFor(cart: PricedCart, method: PaymentMethod) {
  return orderTotals(cart.subtotalMinor, method);
}

export function buildOrderPayload({
  reference,
  address,
  cart,
  method,
  pickupLocation,
}: {
  reference: string;
  address: Address;
  cart: PricedCart;
  method: PaymentMethod;
  pickupLocation: string;
}) {
  const { shippingFee, totalMinor } = totalsFor(cart, method);

  return {
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
}

export type CreatedOrder = {
  order_id?: number;
  shipment_id?: number;
  status?: string;
};

/**
 * True when Shiprocket refused because this reference already exists.
 *
 * That refusal is the thing that makes the whole design safe. Both the browser
 * and the webhook may arrive with the same order — sometimes seconds apart, if
 * the buyer's tab survived just long enough — and the second one must not ship
 * the goods twice. Shiprocket enforces uniqueness on `order_id`, so the loser
 * of that race gets an error that means "already done", not "failed".
 *
 * Matched on the message because their API returns 422 for several distinct
 * problems and does not carry a machine-readable code for this one. Deliberately
 * narrow: anything that is not recognisably a duplicate is still a real error.
 */
export function isDuplicateOrder(cause: unknown): boolean {
  if (!(cause instanceof ShiprocketError)) return false;
  const message = cause.message.toLowerCase();
  return (
    message.includes('already exists') ||
    message.includes('already been taken') ||
    message.includes('duplicate')
  );
}

/**
 * Creates the order, treating "already exists" as success.
 *
 * `duplicate: true` in the result says the order was there before this call —
 * the caller wants to know, because it is the difference between a webhook that
 * rescued an order and a webhook that found nothing to do.
 */
export async function placeOrder(
  payload: ReturnType<typeof buildOrderPayload>,
): Promise<CreatedOrder & { duplicate: boolean }> {
  try {
    const created = (await shiprocketFetch('/orders/create/adhoc', {
      method: 'POST',
      body: JSON.stringify(payload),
    })) as CreatedOrder;
    return { ...created, duplicate: false };
  } catch (cause) {
    if (isDuplicateOrder(cause)) return { duplicate: true };
    throw cause;
  }
}
