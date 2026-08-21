import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isConfigured, shiprocket } from './_lib/env.js';
import { ShiprocketAuthError, ShiprocketError, shiprocketFetch } from './_lib/shiprocket.js';
import { FREE_SHIPPING_THRESHOLD_MINOR, COD_FEE_MINOR, SHIPPING_FEE_MINOR } from '../src/commerce/policy.js';

/**
 * Razorpay Magic Checkout calls this while the buyer is choosing an address.
 *
 * It sends a list of candidate addresses and expects, per address: whether we
 * ship there, whether cash on delivery is allowed, and what each costs. That
 * question is one we can already answer — Shiprocket serviceability is wired
 * and working — so the checkout screen ends up driven by real courier coverage
 * rather than a flat guess.
 *
 * Two properties matter here and both are about not lying:
 *
 *   - Serviceability comes from the courier, not from a hardcoded list. A
 *     pincode nobody delivers to is refused at the checkout screen rather than
 *     accepted and cancelled a day later.
 *   - The shipping fee is derived from our own free-shipping threshold, so the
 *     figure in the announce bar, the figure in the bag, and the figure the
 *     buyer is charged are the same number from the same constant.
 *
 * Failures are soft on purpose. If Shiprocket is unreachable, saying "we cannot
 * ship anywhere" would empty the checkout for everyone; falling back to
 * serviceable-and-prepaid keeps orders flowing and is recoverable, whereas a
 * refused sale is not.
 */

type IncomingAddress = {
  id?: string;
  zipcode?: string;
  country?: string;
  state?: string;
  city?: string;
};

/** Flat fee below the free-shipping threshold. Paise. */
/** Charged on top for cash on delivery. Paise. */

const PINCODE = /^[1-9][0-9]{5}$/;

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const body = request.body as { addresses?: IncomingAddress[]; order_amount?: number };
  const addresses = Array.isArray(body?.addresses) ? body.addresses : [];
  if (addresses.length === 0) {
    return response.status(400).json({ error: 'no_addresses' });
  }

  // Razorpay reports the order total; falling back to the threshold means an
  // absent value never accidentally charges for shipping.
  const orderAmount = Number(body?.order_amount);
  const qualifiesFree =
    !Number.isFinite(orderAmount) || orderAmount >= FREE_SHIPPING_THRESHOLD_MINOR;
  const shippingFee = qualifiesFree ? 0 : SHIPPING_FEE_MINOR;

  const results = await Promise.all(
    addresses.map(async (address) => {
      const zip = String(address?.zipcode ?? '').trim();
      const base = { id: address?.id, zipcode: zip };

      if (!PINCODE.test(zip)) {
        return { ...base, serviceable: false, cod: false, shipping_fee: 0, cod_fee: 0 };
      }

      try {
        const { pickupPincode } = shiprocket();
        const params = new URLSearchParams({
          pickup_postcode: pickupPincode,
          delivery_postcode: zip,
          // A representative parcel. Per-address weight is not knowable here —
          // Razorpay asks about addresses, not baskets.
          weight: '0.5',
          cod: '1',
        });

        const raw = (await shiprocketFetch(`/courier/serviceability/?${params}`, {
          method: 'GET',
        })) as {
          data?: { available_courier_companies?: Array<{ cod?: number | boolean }> };
        };

        const couriers = raw.data?.available_courier_companies ?? [];
        if (couriers.length === 0) {
          return { ...base, serviceable: false, cod: false, shipping_fee: 0, cod_fee: 0 };
        }

        const codAvailable = couriers.some((c) => Boolean(c.cod));
        return {
          ...base,
          serviceable: true,
          cod: codAvailable,
          shipping_fee: shippingFee,
          cod_fee: codAvailable ? COD_FEE_MINOR : 0,
        };
      } catch (cause) {
        if (cause instanceof ShiprocketAuthError) {
          console.error('[shipping-info] credentials rejected', cause.status);
        } else if (cause instanceof ShiprocketError) {
          console.error('[shipping-info] shiprocket', cause.status);
        } else {
          console.error('[shipping-info]', cause);
        }
        // Soft fail: prepaid only, standard fee. Refusing every sale because a
        // courier API blinked is the more expensive mistake.
        return { ...base, serviceable: true, cod: false, shipping_fee: shippingFee, cod_fee: 0 };
      }
    }),
  );

  response.setHeader('Cache-Control', 'no-store');
  return response.status(200).json({
    addresses: results,
    // Surfaced so a misconfiguration is visible in the response rather than
    // only showing up as every address being prepaid-only.
    shiprocket_configured: isConfigured.shiprocket(),
  });
}
