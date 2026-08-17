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
 * Per-line cap. Not an inventory limit — it is a guard against a stuck key or a
 * fat-fingered paste putting 900 units into a bag and handing that to checkout.
 * Real stock enforcement belongs wherever inventory actually lives.
 */
export const MAX_QTY_PER_LINE = 10;
