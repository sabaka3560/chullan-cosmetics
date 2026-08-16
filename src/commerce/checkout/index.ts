import { stubProvider } from './stubProvider';
import type { CheckoutHandoff, CheckoutProvider } from './types';

export { CheckoutNotConnectedError } from './types';
export type { CheckoutHandoff, CheckoutProvider } from './types';

/**
 * Provider resolution.
 *
 * When fastrr is ready, this becomes a switch on `VITE_CHECKOUT_PROVIDER` with
 * the stub kept as the fallback — so a missing or misconfigured env var lands
 * on a checkout that says "not connected" rather than one that half-works.
 *
 *   const providers = { stub: stubProvider, fastrr: fastrrProvider };
 *   return providers[import.meta.env.VITE_CHECKOUT_PROVIDER] ?? stubProvider;
 */
function resolveProvider(): CheckoutProvider {
  return stubProvider;
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
