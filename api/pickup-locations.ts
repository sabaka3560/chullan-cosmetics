import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isConfigured } from './_lib/env.js';
import { ShiprocketError, shiprocketFetch } from './_lib/shiprocket.js';

/**
 * Lists the pickup locations configured on the Shiprocket account.
 *
 * Order creation identifies the origin by its *nickname* — the label typed into
 * the panel — not by pincode, and there is no way to guess it. This reads the
 * real list so the value can be set correctly rather than by trial and error,
 * which with an order-creation endpoint means leaving stray orders behind.
 *
 * Read-only, and deliberately returns nothing but names and pincodes. It exists
 * for setup rather than for the storefront, so it never gets called by the app.
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!isConfigured.shiprocket()) {
    return response.status(501).json({ error: 'not_configured' });
  }

  try {
    const raw = (await shiprocketFetch('/settings/company/pickup', { method: 'GET' })) as {
      data?: {
        shipping_address?: Array<{
          pickup_location?: string;
          pin_code?: string | number;
          city?: string;
          address?: string;
          status?: number;
        }>;
      };
    };

    const locations = (raw.data?.shipping_address ?? []).map((entry) => ({
      // This exact string is what `pickup_location` must be set to.
      nickname: entry.pickup_location,
      pincode: String(entry.pin_code ?? ''),
      city: entry.city,
      verified: entry.status === 1,
    }));

    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({ locations });
  } catch (cause) {
    if (cause instanceof ShiprocketError) {
      console.error('[pickup-locations]', cause.status, cause.message);
      return response.status(502).json({ error: 'upstream_unavailable' });
    }
    console.error('[pickup-locations]', cause);
    return response.status(500).json({ error: 'server_error' });
  }
}
