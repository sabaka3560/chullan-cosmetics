import type { ResolvedCart } from '../types';

/**
 * THE SEAM.
 *
 * Everything upstream of this file — catalog, cart, drawer, add buttons — is
 * checkout-agnostic and can be finished, reviewed and shipped without knowing
 * anything about Shiprocket. Connecting fastrr means writing one new file that
 * implements `CheckoutProvider` and pointing `resolveProvider()` at it. Nothing
 * else in the app should need to change.
 *
 * The port is deliberately narrow. It takes a cart and returns nothing, because
 * the one thing we know about every hosted checkout is that the buyer leaves:
 * into an iframe, a modal, or a redirect. Anything richer than "here is the
 * cart, take it from here" would be guessing at a contract we haven't seen yet.
 */

export type CheckoutHandoff = {
  /**
   * The priced cart as we understand it.
   *
   * Whether the provider is *told* these prices or merely told the SKUs is the
   * provider's business. A catalog-synced checkout should send `sku` and `qty`
   * and let its own catalogue price the order — browser-supplied prices are
   * trivially tampered with, so a provider that accepts them without a
   * server-side signature should be treated as a finding, not a feature.
   */
  cart: ResolvedCart;

  /** Where the buyer lands if they back out. Absolute — providers redirect. */
  returnUrl: string;
};

export type CheckoutProvider = {
  /** Shows up in analytics and error copy. */
  readonly id: string;

  /**
   * Hands the buyer off. Resolves once the handoff has *started* — not once an
   * order exists, which happens on the provider's side and which we may never
   * observe.
   *
   * Must reject rather than throw silently if handoff fails. The caller leaves
   * the drawer open and the cart intact on rejection: a buyer who bounces off a
   * broken checkout and finds an empty bag is gone for good.
   *
   * NEVER clear the cart here. Clearing belongs on a confirmed return, because
   * "we sent them to checkout" and "they paid" are different events and only
   * the second one means the bag is spent.
   */
  begin(handoff: CheckoutHandoff): Promise<void>;
};

/** Thrown by the stub so the drawer can show an honest state during the build. */
export class CheckoutNotConnectedError extends Error {
  constructor() {
    super('Checkout is not connected yet.');
    this.name = 'CheckoutNotConnectedError';
  }
}
