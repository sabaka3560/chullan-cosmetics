import { describe, expect, it } from 'vitest';
import { InvalidCartError, parseLines, priceCart } from '../../api/_lib/pricing';
import { CATALOG, unitPriceMinor } from '../../src/data/catalog';

/**
 * The server-side pricing path.
 *
 * This is the code that decides what a buyer is charged, and it is the only
 * part of the system where a mistake costs money rather than looking wrong. It
 * is also pure — no network, no React, no browser — so there is no excuse for
 * it to be untested.
 *
 * The property these tests exist to protect: **a request cannot express a
 * price.** Not "a wrong price is rejected" — there is no field for one. That
 * distinction is the whole security model, so the first test asserts it
 * directly rather than trusting the type signature to hold forever.
 */

const foundation = CATALOG.find((p) => p.id === 'foundation')!;
const sku = foundation.variants[0].sku;

describe('parseLines', () => {
  it('ignores any price the client tries to send', () => {
    const lines = parseLines({
      lines: [{ sku, qty: 1, priceMinor: 1, unitPriceMinor: 1, total: 1 }],
    });
    // Only the reference survives. Nothing downstream can read an amount that
    // arrived over the wire, because it was never carried forward.
    expect(lines).toEqual([{ sku, qty: 1 }]);
  });

  it('merges duplicate SKUs rather than rejecting them', () => {
    // A client that appends instead of merging is a client bug, not an attack.
    // Failing someone's checkout over it helps nobody.
    expect(parseLines({ lines: [{ sku, qty: 2 }, { sku, qty: 3 }] })).toEqual([{ sku, qty: 5 }]);
  });

  it('clamps quantity to the per-line cap', () => {
    expect(parseLines({ lines: [{ sku, qty: 9999 }] })).toEqual([{ sku, qty: 10 }]);
  });

  it('floors fractional quantities', () => {
    expect(parseLines({ lines: [{ sku, qty: 2.9 }] })).toEqual([{ sku, qty: 2 }]);
  });

  it('drops non-positive quantities', () => {
    expect(() => parseLines({ lines: [{ sku, qty: 0 }] })).toThrow(InvalidCartError);
    expect(() => parseLines({ lines: [{ sku, qty: -5 }] })).toThrow(InvalidCartError);
  });

  it.each([
    ['not an object', 'nonsense'],
    ['null', null],
    ['no lines', {}],
    ['empty lines', { lines: [] }],
    ['lines not an array', { lines: 'x' }],
    ['garbage entries', { lines: [null, 3, 'x'] }],
    ['non-numeric qty', { lines: [{ sku, qty: 'many' }] }],
    ['NaN qty', { lines: [{ sku, qty: Number.NaN }] }],
  ])('rejects %s', (_label, body) => {
    expect(() => parseLines(body)).toThrow(InvalidCartError);
  });

  it('rejects an absurd number of lines', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ sku: `X-${i}`, qty: 1 }));
    expect(() => parseLines({ lines: many })).toThrow(InvalidCartError);
  });
});

describe('priceCart', () => {
  it('prices from the catalog, not from the request', () => {
    const cart = priceCart([{ sku, qty: 3 }]);
    const unit = unitPriceMinor(foundation, foundation.variants[0]);
    expect(cart.lines[0].unitPriceMinor).toBe(unit);
    expect(cart.subtotalMinor).toBe(unit * 3);
  });

  /*
   * The Foundation's shades are priced in two tiers, so the SKU — not the
   * product — decides the amount. This asserts it on the server path
   * specifically, because that is the number a card is actually charged; the
   * storefront agreeing is not the same guarantee.
   */
  it('charges per shade where the tiers differ', () => {
    const proGlow = foundation.variants.find((v) => v.tier === 'Pro Glow')!;
    const base = foundation.variants.find((v) => v.tier === 'Professional Base')!;

    /*
     * Derived rather than transcribed, so a launch offer cannot make this fail
     * for a reason that has nothing to do with tiers. The claim under test is
     * that the two tiers price differently and do not collapse — not what
     * either happens to cost this month. `catalog-brief.test.ts` is where the
     * absolute figures are pinned.
     */
    const proGlowPrice = unitPriceMinor(foundation, proGlow);
    const basePrice = unitPriceMinor(foundation, base);
    expect(proGlowPrice).toBeGreaterThan(basePrice);

    expect(priceCart([{ sku: proGlow.sku, qty: 1 }]).subtotalMinor).toBe(proGlowPrice);
    expect(priceCart([{ sku: base.sku, qty: 1 }]).subtotalMinor).toBe(basePrice);

    // Both shades of the same product in one bag must not collapse to one price.
    const mixed = priceCart([
      { sku: proGlow.sku, qty: 1 },
      { sku: base.sku, qty: 1 },
    ]);
    expect(mixed.subtotalMinor).toBe(proGlowPrice + basePrice);
  });

  it('sums weight for the courier band', () => {
    const cart = priceCart([{ sku, qty: 2 }]);
    expect(cart.totalWeightGrams).toBe(foundation.weightGrams * 2);
  });

  it('counts units, not lines', () => {
    const second = CATALOG.find((p) => p.id === 'moisturiser')!.variants[0].sku;
    const cart = priceCart([{ sku, qty: 2 }, { sku: second, qty: 3 }]);
    expect(cart.itemCount).toBe(5);
    expect(cart.lines).toHaveLength(2);
  });

  it('rejects an unknown SKU instead of dropping it', () => {
    // The client drops unknown lines silently, which is right there — a retired
    // shade should just disappear. Here it is the opposite: charging for a
    // subset of what someone thought they were buying is worse than refusing.
    expect(() => priceCart([{ sku: 'CHU-NOPE-00', qty: 1 }])).toThrow(InvalidCartError);
  });

  it('keeps money in integer minor units', () => {
    const cart = priceCart([{ sku, qty: 7 }]);
    expect(Number.isInteger(cart.subtotalMinor)).toBe(true);
    for (const line of cart.lines) {
      expect(Number.isInteger(line.lineTotalMinor)).toBe(true);
    }
  });
});

describe('the catalog itself', () => {
  it('has no duplicate SKUs', () => {
    const skus = CATALOG.flatMap((p) => p.variants.map((v) => v.sku));
    // A duplicate would make `catalogBySku` silently resolve to whichever came
    // last, so one product would be sold at another's price.
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('has no duplicate product ids', () => {
    const ids = CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('prices everything in whole minor units above zero', () => {
    for (const product of CATALOG) {
      expect(Number.isInteger(product.priceMinor), product.id).toBe(true);
      expect(product.priceMinor, product.id).toBeGreaterThan(0);
    }
  });

  it('gives every product a shippable weight', () => {
    // A zero here would quietly ask couriers about a weightless parcel and get
    // back a serviceability answer that does not hold at dispatch.
    for (const product of CATALOG) {
      expect(product.weightGrams, product.id).toBeGreaterThan(0);
    }
  });

  it('gives every product at least one variant', () => {
    for (const product of CATALOG) {
      expect(product.variants.length, product.id).toBeGreaterThan(0);
    }
  });
});
