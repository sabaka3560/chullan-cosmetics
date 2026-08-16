import type { ResolvedCart, ResolvedLine } from './types';

/**
 * Funnel instrumentation.
 *
 * The storefront hands the buyer to a checkout it cannot see into. The moment
 * that happens, every number after it — completion rate, revenue, which shade
 * actually sells — belongs to the provider's dashboard and arrives in their
 * shape, on their schedule, joined to nothing.
 *
 * What stays ours is everything up to the handoff, and that is precisely the
 * part being optimised: did the landing page produce a bag, and did the bag
 * produce a checkout. So `begin_checkout` fires *before* control leaves the
 * page. Firing it after would mean it never fires at all on a redirect, and the
 * denominator of the only conversion rate we own would silently be wrong.
 *
 * No vendor SDK. Events are pushed to `window.dataLayer`, which GTM, GA4 and
 * the Meta pixel all read, so the tag manager decides where they go without a
 * redeploy. Event names follow the GA4 ecommerce vocabulary because it is the
 * one every tool already understands.
 */

type EventName =
  | 'view_item'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'view_cart'
  | 'begin_checkout';

type ItemPayload = {
  item_id: string;
  item_name: string;
  item_variant: string;
  item_category: string;
  price: number;
  quantity: number;
};

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * GA4 wants a major-unit decimal, the cart stores minor-unit integers. The
 * conversion happens here and only here — it is the boundary where money stops
 * being ours and starts being a reporting figure.
 */
const toMajor = (minor: number) => minor / 100;

function toItem(line: ResolvedLine): ItemPayload {
  return {
    item_id: line.variant.sku,
    item_name: line.product.name,
    item_variant: line.variant.label,
    item_category: line.product.category,
    price: toMajor(line.product.priceMinor),
    quantity: line.qty,
  };
}

function push(event: EventName, payload: Record<string, unknown>) {
  // Created lazily rather than assumed: the array normally comes from the GTM
  // snippet, but events can fire before that loads, and a page with no tag
  // manager at all must not throw.
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...payload });

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', event, payload);
  }
}

export const analytics = {
  addToCart(line: ResolvedLine, currency: string) {
    push('add_to_cart', {
      currency,
      value: toMajor(line.lineTotalMinor),
      items: [toItem(line)],
    });
  },

  removeFromCart(line: ResolvedLine, currency: string) {
    push('remove_from_cart', {
      currency,
      value: toMajor(line.lineTotalMinor),
      items: [toItem(line)],
    });
  },

  viewCart(cart: ResolvedCart) {
    push('view_cart', {
      currency: cart.currency,
      value: toMajor(cart.subtotalMinor),
      items: cart.lines.map(toItem),
    });
  },

  /**
   * Fire this before handing off, never after. See the note at the top.
   */
  beginCheckout(cart: ResolvedCart, provider: string) {
    push('begin_checkout', {
      currency: cart.currency,
      value: toMajor(cart.subtotalMinor),
      checkout_provider: provider,
      items: cart.lines.map(toItem),
    });
  },
};
