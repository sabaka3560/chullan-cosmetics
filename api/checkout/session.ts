import type { VercelRequest, VercelResponse } from '@vercel/node';
import { InvalidCartError, parseLines, priceCart } from '../_lib/pricing.js';
import { InvalidAddressError, parseAddress } from '../_lib/address.js';
import { toNotes } from '../_lib/pending.js';
import { totalsFor } from '../_lib/fulfil.js';
import { withTimeout } from '../_lib/timeout.js';
import { CHECKOUT_LIMIT, rateLimited } from '../_lib/rate-limit.js';
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

  /*
   * Before anything else that costs something.
   *
   * Every successful call here creates a real order on the live Razorpay
   * account. Left open, a loop in a terminal fills the merchant dashboard with
   * orders nobody placed and buries the genuine ones among them — which is not
   * a security breach so much as an operations one, and just as expensive.
   */
  if (rateLimited(request, response, CHECKOUT_LIMIT)) return;

  if (!isRazorpayConfigured()) {
    return response.status(501).json({
      error: 'not_configured',
      message: 'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not set.',
    });
  }

  try {
    const lines = parseLines(request.body);
    const cart = priceCart(lines);
    const { keyId } = razorpayConfig();

    /*
     * The address is captured here, before the payment sheet opens, and stored
     * on the Razorpay order — see `pending.ts`. It is the only way the webhook
     * can fulfil an order whose browser never came back, because at that point
     * this is the only copy of it that still exists.
     */
    const address = parseAddress((request.body as Record<string, unknown>)?.address);

    /*
     * Ours, and generated once — here rather than at fulfilment.
     *
     * Both the browser and the webhook can reach Shiprocket with this order,
     * and Shiprocket enforces uniqueness on `order_id`. Minting the reference
     * at the moment of payment means the two paths carry the same one, so the
     * second to arrive is refused as a duplicate instead of shipping the goods
     * a second time. A reference generated at fulfilment would differ between
     * them and both would succeed.
     *
     * Prefixed while Razorpay is on test keys, because demo orders are real
     * orders — they appear in the panel next to genuine ones.
     */
    const reference = `${isTestMode() ? 'TEST-' : ''}CHU-${Date.now().toString(36).toUpperCase()}`;

    // Used for `product_url`, so Magic Checkout can link a line back to the
    // page it was bought from. Derived from the request rather than configured,
    // so preview deployments link to themselves rather than to production.
    const host = request.headers.host ?? 'localhost';
    const proto =
      (request.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] ??
      (host.startsWith('localhost') ? 'http' : 'https');
    const origin = `${proto}://${host}`;

    /*
     * The charge is the subtotal PLUS delivery.
     *
     * This used to be `cart.subtotalMinor` alone, on the assumption — stated
     * throughout the comments here — that Magic Checkout would ask
     * `/api/shipping-info` for the delivery cost and add it before charging.
     * Magic Checkout is not enabled on this account, so nothing ever added it:
     * every prepaid bag under the free-shipping threshold was charged ₹99 less
     * than the summary in front of the buyer said, while `buildOrderPayload`
     * went on reporting the higher total to Shiprocket.
     *
     * `orderTotals` is the same function the bag and the checkout summary use,
     * so the amount charged is now the number the buyer was shown.
     */
    const { shippingFee, totalMinor } = totalsFor(cart, 'Prepaid');

    const order = (await withTimeout(
      'Razorpay orders.create',
      razorpayClient().orders.create({
      amount: totalMinor,
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

      // Everything the webhook needs to finish this order without a browser.
      notes: toNotes({
        reference,
        address,
        lines,
        itemCount: cart.itemCount,
        weightGrams: cart.totalWeightGrams,
      }),
      // The SDK overloads `create` for the callback form, so the promise
      // signature needs narrowing before the result can be read.
      }) as Promise<{ id: string; amount: number | string; currency: string }>,
    )) as { id: string; amount: number | string; currency: string };

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
      /*
       * Returned for logging and support only. The browser does not send it
       * back — `/api/orders/create` reads the reference from the Razorpay order
       * itself once the payment signature checks out, so the value that decides
       * what gets shipped is never one the client could have altered.
       */
      reference,
      cart,
      /*
       * Sent so the browser can show the same breakdown the charge was built
       * from, rather than recomputing it and hoping the two agree. `amount`
       * above already includes this.
       */
      shippingFee,
    });
  } catch (cause) {
    if (cause instanceof InvalidCartError) {
      return response.status(400).json({ error: 'invalid_cart', message: cause.message });
    }
    if (cause instanceof InvalidAddressError) {
      return response
        .status(400)
        .json({ error: 'invalid_address', field: cause.field, message: cause.message });
    }
    console.error('[checkout/session]', cause);
    return response.status(502).json({ error: 'order_creation_failed' });
  }
}
