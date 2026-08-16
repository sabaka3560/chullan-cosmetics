import { ShippingNotConnectedError } from './types';
import type { ShippingProvider } from './types';

export { ShippingNotConnectedError } from './types';
export type { DeliveryEstimate, ShippingProvider } from './types';
export { normalisePincode, validatePincode } from './pincode';

/**
 * Stands in until Shiprocket's serviceability API is wired.
 *
 * It rejects rather than returning a plausible-looking estimate, and that is
 * the important part. A stub that answers "delivers by Tuesday" is a delivery
 * promise the business cannot keep, and the day it survives into production
 * nobody notices, because a wrong date looks exactly like a right one. An
 * error state is visibly unfinished, which is what an unfinished integration
 * should look like.
 */
const stubProvider: ShippingProvider = {
  id: 'stub',
  async check(pincode, weightGrams) {
    // eslint-disable-next-line no-console
    console.info('[shipping] serviceability request', { pincode, weightGrams });
    throw new ShippingNotConnectedError();
  },
};

/**
 * When the real provider lands this becomes a switch on an env var with the
 * stub as the fallback, so a misconfigured key fails visibly rather than
 * half-working. The call itself must be server-side: Shiprocket authenticates
 * with an email/password pair that mints a ~10-day JWT, and neither the
 * credentials nor the token can be allowed near the browser bundle.
 */
function resolveProvider(): ShippingProvider {
  return stubProvider;
}

export const shippingProvider = resolveProvider();

export function checkDelivery(pincode: string, weightGrams: number) {
  return shippingProvider.check(pincode, weightGrams);
}
