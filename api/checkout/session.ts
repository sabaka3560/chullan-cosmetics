import { createHmac, timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fastrr, isConfigured } from '../_lib/env.js';
import { InvalidCartError, parseLines, priceCart } from '../_lib/pricing.js';
import type { PricedCart } from '../_lib/pricing.js';

/**
 * Turns a bag of SKUs into a signed, priced checkout session for fastrr.
 *
 * The browser posts `{ lines: [{ sku, qty }] }` and gets back a payload it
 * cannot have forged: the amounts are computed here from the catalog, and the
 * whole thing is signed with the shared secret fastrr issues in its platform
 * settings. That secret is the reason this endpoint exists — it is what lets
 * the checkout trust a cart that arrived via a browser.
 *
 * NOT YET CONNECTED. The exact request fastrr expects is not published, and
 * their custom-platform path is thinly documented next to the Shopify plugin.
 * Rather than guess at field names, this returns the priced and signed payload
 * and leaves the final POST behind one clearly marked call. Everything that is
 * knowable without their spec — pricing, validation, signing — is done.
 */

/**
 * Signs the canonical form of the cart. Exported so the round-trip is testable:
 * a verifier tested only against invalid input proves it rejects things, not
 * that it accepts the right one.
 *
 * Signing a re-serialised object rather than the raw body on purpose: two JSON
 * encoders disagree about key order and whitespace, so a signature computed
 * over "the JSON" is a signature over one library's opinion of it. Sorting the
 * lines and joining primitives gives a string both ends can reproduce.
 */
export function signCart(cart: PricedCart, secret: string, nonce: string, issuedAt: number): string {
  const canonical = [
    issuedAt,
    nonce,
    cart.currency,
    cart.subtotalMinor,
    ...[...cart.lines]
      .sort((a, b) => a.sku.localeCompare(b.sku))
      .map((l) => `${l.sku}:${l.qty}:${l.unitPriceMinor}`),
  ].join('|');

  return createHmac('sha256', secret).update(canonical).digest('hex');
}

/**
 * Exported for the verification side and for tests. Compared with
 * `timingSafeEqual` rather than `===`: string comparison short-circuits on the
 * first differing byte, which leaks how much of a guess was right.
 */
export function verifyCartSignature(
  cart: PricedCart,
  secret: string,
  nonce: string,
  issuedAt: number,
  signature: string,
): boolean {
  const expected = signCart(cart, secret, nonce, issuedAt);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // 501 rather than 500: this is "not wired up yet", which is a different thing
  // to a developer than "wired up and broken".
  if (!isConfigured.fastrr()) {
    return response.status(501).json({
      error: 'not_configured',
      message: 'FASTRR_API_KEY and FASTRR_SHARED_SECRET are not set.',
    });
  }

  try {
    const cart = priceCart(parseLines(request.body));
    const { sharedSecret, apiKey } = fastrr();

    const issuedAt = Date.now();
    // Lets the provider reject a replayed session even though this service
    // keeps no state of its own.
    const nonce = crypto.randomUUID();
    const signature = signCart(cart, sharedSecret, nonce, issuedAt);

    // No caching: a priced cart is specific to one buyer at one moment, and a
    // CDN copy of it is somebody else's prices.
    response.setHeader('Cache-Control', 'no-store');

    return response.status(200).json({
      apiKey,
      issuedAt,
      nonce,
      signature,
      cart,
      // TODO — replace with the real fastrr session call once their
      // custom-platform request shape is confirmed. Ask their solutions team
      // whether they price from a synced SKU catalog or accept these amounts.
      handoff: null,
    });
  } catch (cause) {
    if (cause instanceof InvalidCartError) {
      return response.status(400).json({ error: 'invalid_cart', message: cause.message });
    }
    // Deliberately opaque to the client; the detail goes to the server log.
    console.error('[checkout/session]', cause);
    return response.status(500).json({ error: 'server_error' });
  }
}
