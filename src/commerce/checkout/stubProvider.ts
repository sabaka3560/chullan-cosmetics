import { CheckoutNotConnectedError } from './types';
import type { CheckoutProvider } from './types';

/**
 * Stands in until a real provider is wired.
 *
 * It logs the exact payload a provider would receive and then rejects. Both
 * halves matter: the log is how the handoff shape gets validated against
 * whatever Shiprocket actually wants before a line of integration code is
 * written, and the rejection is what keeps the drawer honest — a checkout
 * button that silently does nothing is indistinguishable from a broken one.
 */
export const stubProvider: CheckoutProvider = {
  id: 'stub',

  async begin({ cart, returnUrl }) {
    // eslint-disable-next-line no-console
    console.info('[checkout] handoff payload', {
      returnUrl,
      currency: cart.currency,
      itemCount: cart.itemCount,
      subtotalMinor: cart.subtotalMinor,
      totalWeightGrams: cart.totalWeightGrams,
      // The reference-only shape a catalog-synced provider should receive:
      // the variant SKU is the unit of inventory, so it — not the product id —
      // is what crosses the boundary.
      lines: cart.lines.map((line) => ({
        sku: line.variant.sku,
        qty: line.qty,
      })),
    });

    throw new CheckoutNotConnectedError();
  },
};
