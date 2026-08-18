import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isConfigured, shiprocket } from './_lib/env.js';
import { ShiprocketAuthError, ShiprocketError, shiprocketFetch } from './_lib/shiprocket.js';
import { InvalidCartError, parseLines, priceCart } from './_lib/pricing.js';
import { isMockMode, mockServiceability } from './_lib/mock.js';

/**
 * "Does it reach me, and when" — asked in the bag, before the buyer commits.
 *
 * This is the one Shiprocket call that belongs on our side of the checkout
 * handoff: it happens while someone is still deciding, which makes it a
 * conversion tool rather than a fulfilment one. It is also the reason a backend
 * is needed even with a hosted checkout — Shiprocket authenticates with an
 * email and password, and those cannot go in a browser bundle.
 *
 * Weight comes from the catalog rather than the request. Serviceability is
 * weight-banded, so a courier that covers a pincode for 200g may not cover it
 * for 5kg; letting the client state the weight would let it ask about a
 * different parcel than the one being sold.
 */

const PINCODE = /^[1-9][0-9]{5}$/;

type CourierResponse = {
  data?: {
    available_courier_companies?: Array<{
      etd?: string;
      estimated_delivery_days?: string;
      cod?: number | boolean;
      city?: string;
      state?: string;
    }>;
  };
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Checked before the credential guard, so the whole flow is walkable with no
  // Shiprocket account at all.
  if (!isConfigured.shiprocket() && !isMockMode()) {
    return response.status(501).json({
      error: 'not_configured',
      message: 'SHIPROCKET_API_EMAIL and SHIPROCKET_API_PASSWORD are not set.',
    });
  }

  const pincode = String((request.body as { pincode?: unknown })?.pincode ?? '').trim();
  // Re-checked here even though the client validates: the client check is for
  // speed, this one is because the client is not the only possible caller.
  if (!PINCODE.test(pincode)) {
    return response.status(400).json({ error: 'invalid_pincode' });
  }

  try {
    // Priced first either way: mock mode must exercise the same validation and
    // catalog lookup the real path does, or it is testing nothing.
    const cart = priceCart(parseLines(request.body));

    if (isMockMode()) {
      response.setHeader('Cache-Control', 'no-store');
      return response.status(200).json(mockServiceability(pincode, cart.totalWeightGrams));
    }

    const { pickupPincode } = shiprocket();

    const params = new URLSearchParams({
      pickup_postcode: pickupPincode,
      delivery_postcode: pincode,
      weight: (cart.totalWeightGrams / 1000).toFixed(3),
      cod: '1',
    });

    const raw = (await shiprocketFetch(
      `/courier/serviceability/?${params}`,
      { method: 'GET' },
    )) as CourierResponse;

    const couriers = raw.data?.available_courier_companies ?? [];
    if (couriers.length === 0) {
      return response.status(200).json({ serviceable: false });
    }

    // The soonest promise across couriers, since that is the one the buyer
    // would actually be given.
    const soonest = couriers.reduce((best, courier) => {
      const days = Number(courier.estimated_delivery_days);
      const bestDays = Number(best.estimated_delivery_days);
      return Number.isFinite(days) && (!Number.isFinite(bestDays) || days < bestDays)
        ? courier
        : best;
    });

    // `etd` is only surfaced when the courier actually returned one. Showing
    // "delivers by —" is worse than showing serviceability alone, and inventing
    // a date is a promise the business has to keep.
    const days = Number(soonest.estimated_delivery_days);
    const etaDate = Number.isFinite(days)
      ? new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
      : undefined;

    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({
      serviceable: true,
      etaDate,
      place: soonest.city,
      codAvailable: couriers.some((c) => Boolean(c.cod)),
    });
  } catch (cause) {
    if (cause instanceof InvalidCartError) {
      return response.status(400).json({ error: 'invalid_cart', message: cause.message });
    }
    // Split out so the response says which of the two it is. Chasing a
    // "service unavailable" for an hour when the real answer was a wrong
    // password is a bad afternoon that better error codes prevent.
    if (cause instanceof ShiprocketAuthError) {
      console.error('[serviceability] credentials rejected', cause.status);
      return response.status(502).json({
        error: 'shiprocket_auth_failed',
        message:
          'Shiprocket rejected the API credentials. Check SHIPROCKET_API_EMAIL and ' +
          'SHIPROCKET_API_PASSWORD — these must be a dedicated API user created under ' +
          'Settings → API, not your panel login.',
      });
    }
    if (cause instanceof ShiprocketError) {
      console.error('[serviceability] shiprocket', cause.status, cause.message);
      // 502, not 500: the failure is upstream, and the distinction is what
      // stops someone debugging this service when Shiprocket is down.
      return response.status(502).json({ error: 'upstream_unavailable' });
    }
    console.error('[serviceability]', cause);
    return response.status(500).json({ error: 'server_error' });
  }
}
