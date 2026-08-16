import type { Money } from './types';

/**
 * Storefront rules that more than one component has to agree about.
 *
 * The free-shipping threshold in particular was previously a number typed into
 * the announce bar copy. The moment a cart exists, a second place needs it (the
 * "you're $12 away" nudge), and two hand-maintained copies of a promotional
 * number is how a site ends up promising free shipping in the header that the
 * cart refuses to honour.
 */
export const FREE_SHIPPING_THRESHOLD_MINOR: Money = 6000;

/**
 * Per-line cap. Not an inventory limit — it is a guard against a stuck key or a
 * fat-fingered paste putting 900 units into a bag and handing that to checkout.
 * Real stock enforcement belongs wherever inventory actually lives.
 */
export const MAX_QTY_PER_LINE = 10;
