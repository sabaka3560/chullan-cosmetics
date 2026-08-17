import { CheckoutNotConnectedError } from './types';
import type { CheckoutHandoff, CheckoutProvider } from './types';

export { CheckoutNotConnectedError } from './types';
export type { CheckoutHandoff, CheckoutProvider } from './types';

/**
 * Hands the bag to fastrr, via our own API route.
 *
 * The browser posts SKUs and quantities. `/api/checkout/session` prices them
 * from the catalog and signs the result with the shared secret fastrr issues in
 * its platform settings — which is the whole reason this hop exists. A secret
 * used in a browser is not a secret, and a cart priced in a browser is a cart
 * anyone can edit before they pay for it.
 *
 * STILL NOT COMPLETE, and honestly so: fastrr's custom-platform request shape
 * is not published, so the session route returns `handoff: null` where the
 * redirect or token should be. Everything knowable without their spec —
 * validation, server-side pricing, signing — is done, and finishing this is one
 * function once their solutions team confirms the contract.
 */
type SessionResponse = {
  handoff: { url?: string; token?: string } | null;
};

const fastrrProvider: CheckoutProvider = {
  id: 'fastrr',

  async begin({ cart }: CheckoutHandoff) {
    const response = await fetch('/api/checkout/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Reference-only, as everywhere else. The server owns the money.
        lines: cart.lines.map((line) => ({ sku: line.variant.sku, qty: line.qty })),
        // The page is the only party that authoritatively knows its own origin.
        // The server still checks it against the request host before using it.
        returnOrigin: window.location.origin,
      }),
    });

    if (response.status === 501) throw new CheckoutNotConnectedError();

    if (!response.ok) {
      throw new Error(`Checkout session failed: ${response.status}`);
    }

    const session = (await response.json()) as SessionResponse;

    // The remaining gap, surfaced rather than swallowed. A checkout button that
    // silently does nothing is indistinguishable from a broken one.
    if (!session.handoff?.url) throw new CheckoutNotConnectedError();

    // Assignment rather than window.open: a popup on a phone is blocked often
    // enough that it cannot be the payment path.
    window.location.assign(session.handoff.url);
  },
};

function resolveProvider(): CheckoutProvider {
  return fastrrProvider;
}

export const checkoutProvider = resolveProvider();

/**
 * `window.location.href` rather than a stored route: the buyer should come back
 * to whatever they were looking at when they opened the bag, and by the time
 * this runs that is already the current URL.
 */
export function beginCheckout(cart: CheckoutHandoff['cart']): Promise<void> {
  return checkoutProvider.begin({
    cart,
    returnUrl: window.location.href,
  });
}
