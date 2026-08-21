import type { Money } from './types';

/**
 * Storefront rules that more than one component has to agree about.
 *
 * The free-shipping threshold in particular was previously a number typed into
 * the announce bar copy. The moment a cart exists, a second place needs it (the
 * "you're ₹120 away" nudge), and two hand-maintained copies of a promotional
 * number is how a site ends up promising free shipping in the header that the
 * cart refuses to honour.
 *
 * ₹999 is set against the real cost of a parcel rather than picked for looks. A
 * 500g cash-on-delivery shipment runs ₹73-86 once the COD fee and GST land, so
 * a threshold much below this gives away most of the margin on a small basket.
 * Revisit it if the COD share drops — prepaid parcels cost roughly ₹42 less.
 */
export const FREE_SHIPPING_THRESHOLD_MINOR: Money = 99900;

/**
 * What a parcel costs the buyer when the bag is under the free threshold, and
 * what cash on delivery adds on top.
 *
 * Here rather than beside whichever code uses them, because four places need
 * these and they must all say the same thing: the checkout page quotes them to
 * the buyer, `/api/shipping-info` publishes them, and both fulfilment paths —
 * the browser's and the webhook's — charge them. Three separate copies had
 * already appeared, which is a total shown to a buyer drifting from the total
 * they are charged, and nothing fails when it does.
 */
export const SHIPPING_FEE_MINOR: Money = 9900;
export const COD_FEE_MINOR: Money = 4900;

export type PaymentMethod = 'Prepaid' | 'COD';

/**
 * What the buyer pays, in one function.
 *
 * The fees above being shared was not enough on its own — the formula that
 * combines them was still written out separately on the checkout page and again
 * on the server, and two copies of an arithmetic rule drift exactly as easily as
 * two copies of a number. This is the amount quoted to the buyer, the amount the
 * payment is taken for, and the amount written on the Shiprocket order, so it
 * can only be computed once.
 *
 * Takes the subtotal rather than a cart, so the browser's resolved cart and the
 * server's priced cart can both be passed without either knowing about the
 * other's shape.
 */
export function orderTotals(subtotalMinor: Money, method: PaymentMethod) {
  const shippingFee = subtotalMinor >= FREE_SHIPPING_THRESHOLD_MINOR ? 0 : SHIPPING_FEE_MINOR;
  const codFee = method === 'COD' ? COD_FEE_MINOR : 0;
  return { shippingFee, codFee, totalMinor: subtotalMinor + shippingFee + codFee };
}

/**
 * Per-line cap. Not an inventory limit — it is a guard against a stuck key or a
 * fat-fingered paste putting 900 units into a bag and handing that to checkout.
 * Real stock enforcement belongs wherever inventory actually lives.
 */
export const MAX_QTY_PER_LINE = 10;
