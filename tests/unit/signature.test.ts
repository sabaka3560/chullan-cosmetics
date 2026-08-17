import { describe, expect, it } from 'vitest';
import { signCart, verifyCartSignature } from '../../api/checkout/session';
import { priceCart } from '../../api/_lib/pricing';
import { CATALOG } from '../../src/data/catalog';

/**
 * The cart signature.
 *
 * fastrr issues a shared secret, and this is what it is for: proving that a
 * cart which travelled through a browser is the one the server priced. Without
 * it the handoff is a request anyone can compose by hand.
 *
 * No real secret appears here or anywhere in the repo. An obvious fake is all a
 * signing algorithm needs.
 */

const SECRET = 'test-secret-not-a-real-one';
const NONCE = 'nonce-1';
const AT = 1_700_000_000_000;

const sku = CATALOG.find((p) => p.id === 'foundation')!.variants[0].sku;
const other = CATALOG.find((p) => p.id === 'moisturiser')!.variants[0].sku;

describe('signCart', () => {
  it('verifies its own signature', () => {
    const cart = priceCart([{ sku, qty: 2 }]);
    const signature = signCart(cart, SECRET, NONCE, AT);
    expect(verifyCartSignature(cart, SECRET, NONCE, AT, signature)).toBe(true);
  });

  it('is stable across line order', () => {
    // The signer sorts, so a client that reorders the array still produces a
    // cart the server will accept.
    const a = priceCart([{ sku, qty: 1 }, { sku: other, qty: 2 }]);
    const b = priceCart([{ sku: other, qty: 2 }, { sku, qty: 1 }]);
    expect(signCart(a, SECRET, NONCE, AT)).toBe(signCart(b, SECRET, NONCE, AT));
  });
});

describe('verifyCartSignature rejects', () => {
  const cart = priceCart([{ sku, qty: 2 }]);
  const signature = signCart(cart, SECRET, NONCE, AT);

  it('a tampered quantity', () => {
    // The attack this exists to stop: buy ten, pay for two.
    const tampered = priceCart([{ sku, qty: 10 }]);
    expect(verifyCartSignature(tampered, SECRET, NONCE, AT, signature)).toBe(false);
  });

  it('a swapped SKU', () => {
    const swapped = priceCart([{ sku: other, qty: 2 }]);
    expect(verifyCartSignature(swapped, SECRET, NONCE, AT, signature)).toBe(false);
  });

  it('an edited subtotal', () => {
    const edited = { ...cart, subtotalMinor: 1 };
    expect(verifyCartSignature(edited, SECRET, NONCE, AT, signature)).toBe(false);
  });

  it('an edited unit price', () => {
    const edited = {
      ...cart,
      lines: cart.lines.map((l) => ({ ...l, unitPriceMinor: 1 })),
    };
    expect(verifyCartSignature(edited, SECRET, NONCE, AT, signature)).toBe(false);
  });

  it('a different secret', () => {
    // The likeliest real-world failure: mismatched env vars between deploys.
    expect(verifyCartSignature(cart, 'other-secret', NONCE, AT, signature)).toBe(false);
  });

  it('a replayed nonce or timestamp', () => {
    expect(verifyCartSignature(cart, SECRET, 'nonce-2', AT, signature)).toBe(false);
    expect(verifyCartSignature(cart, SECRET, NONCE, AT + 1, signature)).toBe(false);
  });

  it.each([
    ['empty', ''],
    ['too short', 'deadbeef'],
    ['not hex', 'zz'.repeat(32)],
  ])('a malformed signature (%s)', (_label, bad) => {
    // Must return false rather than throw: `timingSafeEqual` rejects buffers of
    // unequal length, and an uncaught throw here would be a 500 on a request an
    // attacker fully controls.
    expect(() => verifyCartSignature(cart, SECRET, NONCE, AT, bad)).not.toThrow();
    expect(verifyCartSignature(cart, SECRET, NONCE, AT, bad)).toBe(false);
  });
});
