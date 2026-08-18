import type { VercelRequest, VercelResponse } from '@vercel/node';
import { InvalidCartError, parseLines, priceCart } from '../_lib/pricing.js';
import {
  isRazorpayConfigured,
  isTestMode,
  razorpayConfig,
  razorpayClient,
} from '../_lib/razorpay.js';

/**
 * Creates a Razorpay order for the bag and hands the browser what it needs to
 * open Magic Checkout.
 *
 * The browser posts `{ lines: [{ sku, qty }] }` and gets back an `order_id`
 * plus the publishable key. Every amount is computed here from the catalog, so
 * the request cannot express a price and therefore cannot express a wrong one.
 *
 * This replaces an earlier attempt that HMAC-signed a cart for fastrr's hosted
 * checkout. That was built on a guess about how fastrr worked, and reading
 * their own integration script showed the guess was wrong — they key every
 * channel to a platform catalogue (Shopify, WooCommerce, Magento) and have no
 * path for a custom storefront. Razorpay's `line_items` take a `sku` and
 * `variant_id` "defined by you", which is exactly what a custom catalog needs.
 *
 * Amounts are in paise throughout, which is also how `priceMinor` is stored, so
 * nothing is converted and nothing is rounded.
 */

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!isRazorpayConfigured()) {
    return response.status(501).json({
      error: 'not_configured',
      message: 'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not set.',
    });
  }

  try {
    const cart = priceCart(parseLines(request.body));
    const { keyId } = razorpayConfig();

    // Used for `product_url`, so Magic Checkout can link a line back to the
    // page it was bought from. Derived from the request rather than configured,
    // so preview deployments link to themselves rather than to production.
    const host = request.headers.host ?? 'localhost';
    const proto =
      (request.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] ??
      (host.startsWith('localhost') ? 'http' : 'https');
    const origin = `${proto}://${host}`;

    const order = (await razorpayClient().orders.create({
      amount: cart.subtotalMinor,
      currency: cart.currency,
      // Ours, not theirs — it comes back on the payment so an order can be
      // matched to this cart without trusting anything the browser says.
      receipt: `chullan_${Date.now().toString(36)}`,

      /*
       * `line_items` is what makes Magic Checkout show the real basket rather
       * than a bare total, and it is what RTO risk prediction reads.
       *
       * `sku` and `variant_id` are explicitly "defined by you" in Razorpay's
       * own types — our SKU codes go in directly, with no platform catalogue in
       * between. That single fact is why this works and fastrr did not.
       */
      line_items_total: cart.subtotalMinor,
      line_items: cart.lines.map((line) => ({
        type: 'e-commerce',
        sku: line.sku,
        variant_id: line.sku,
        name: line.name,
        // Strings, per their type definition. Both in paise.
        price: String(line.unitPriceMinor),
        offer_price: String(line.unitPriceMinor),
        // Prices already include GST, so no tax is added on top here. If that
        // ever changes, this and `line_items_total` must move together.
        tax_amount: 0,
        quantity: line.qty,
        description: line.description,
        // Grams and centimetres, per unit. Razorpay uses these for shipping
        // estimation, and they are the same figures Shiprocket bills against.
        weight: String(line.unitWeightGrams),
        dimensions: {
          length: String(line.dimensionsCm.length),
          width: String(line.dimensionsCm.width),
          height: String(line.dimensionsCm.height),
        },
        /*
         * Empty until product photography lives at a stable public URL. The
         * current images are Vite asset imports with content-hashed names that
         * only exist in the client bundle, so the server cannot address them —
         * and three SKUs have no photograph at all yet. An empty string shows
         * no image; a guessed URL would show a broken one.
         */
        image_url: '',
        product_url: `${origin}/product/${line.productId}`,
      })),

      // Lets Razorpay score the order for return-to-origin risk, which in
      // Indian D2C is the single largest avoidable cost.
      rto_review: true,

      notes: {
        itemCount: String(cart.itemCount),
        weightGrams: String(cart.totalWeightGrams),
      },
      // The SDK overloads `create` for the callback form, so the promise
      // signature needs narrowing before the result can be read.
    })) as { id: string; amount: number | string; currency: string };

    // A priced cart belongs to one buyer at one moment; a CDN copy of it is
    // somebody else's order.
    response.setHeader('Cache-Control', 'no-store');

    return response.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      // Publishable by design — Checkout needs it to identify the merchant.
      keyId,
      testMode: isTestMode(),
      cart,
    });
  } catch (cause) {
    if (cause instanceof InvalidCartError) {
      return response.status(400).json({ error: 'invalid_cart', message: cause.message });
    }
    console.error('[checkout/session]', cause);
    return response.status(502).json({ error: 'order_creation_failed' });
  }
}
