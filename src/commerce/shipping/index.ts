import { ShippingNotConnectedError } from './types';
import type { DeliveryEstimate, ShippingProvider } from './types';

export { ShippingNotConnectedError } from './types';
export type { DeliveryEstimate, ShippingProvider } from './types';
export { normalisePincode, validatePincode } from './pincode';

/**
 * Serviceability, via our own API route.
 *
 * The call goes to `/api/serviceability` rather than to Shiprocket directly,
 * and it has to: Shiprocket authenticates with the email and password of an API
 * user, which would be readable by anyone who opened devtools if it were called
 * from here.
 *
 * The request carries SKUs and quantities, never a weight. Serviceability is
 * weight-banded, so a client that supplied its own weight could ask about a
 * lighter parcel than the one being sold and get an answer that does not hold
 * at dispatch. The server derives weight from the catalog.
 */
const apiProvider: ShippingProvider = {
  id: 'shiprocket',

  async check(pincode, lines) {
    const response = await fetch('/api/serviceability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pincode, lines }),
    });

    // 501 is the backend saying "no credentials configured". Surfaced as the
    // not-connected state so the drawer says something true during the build
    // rather than a generic failure.
    if (response.status === 501) throw new ShippingNotConnectedError();

    if (!response.ok) {
      throw new Error(`Serviceability failed: ${response.status}`);
    }

    return (await response.json()) as DeliveryEstimate;
  },
};

export const shippingProvider = apiProvider;

export function checkDelivery(pincode: string, lines: { sku: string; qty: number }[]) {
  return shippingProvider.check(pincode, lines);
}
