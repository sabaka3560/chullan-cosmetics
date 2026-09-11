/**
 * The catalog, checked against the signed-off content brief.
 *
 * This exists because `priceMinor` is not copy — it is the amount a card is
 * charged, computed server-side from these same rows. A price that drifts from
 * the brief is not a typo anyone spots in review; it is a customer paying the
 * wrong amount, and it is silent.
 *
 * The expected values below are transcribed from the document by hand. When the
 * client sends a new price, change it here first and let the failure tell you
 * what to edit.
 */
import { describe, it, expect } from 'vitest';
import {
  CATALOG,
  OFFER,
  listPriceMinor,
  listPriceRangeMinor,
  priceRangeMinor,
  unitPriceMinor,
} from '../../src/data/catalog';
import { formatMoney } from '../../src/commerce/money';

/**
 * Transcribed from Chullan Website Content, Parts 1 and 2 — both pages agree.
 *
 * `minor` is the LIST price, which is what the brief signed off and what the
 * page strikes through. `nowMinor` is what a card is actually charged while the
 * launch offer runs. Both are pinned: the discount reaches the payment request
 * through `unitPriceMinor`, so an arithmetic slip there is not a cosmetic bug,
 * it is every buyer paying the wrong amount.
 */
const BRIEF: Record<
  string,
  { price: string; minor: number; now: string; nowMinor: number; from?: boolean; shades: number }
> = {
  foundation:          { price: 'FROM ₹1,200', minor: 120000, now: 'FROM ₹1,020', nowMinor: 102000, from: true, shades: 8 },
  concealer:           { price: '₹1,200', minor: 120000, now: '₹1,020', nowMinor: 102000, shades: 3 },
  moisturiser:         { price: '₹1,100', minor: 110000, now: '₹935',   nowMinor: 93500,  shades: 1 },
  primer:              { price: '₹1,500', minor: 150000, now: '₹1,275', nowMinor: 127500, shades: 1 },
  'anti-shine-powder': { price: '₹795',   minor: 79500,  now: '₹676',   nowMinor: 67600,  shades: 4 },
  'setting-spray':     { price: '₹1,200', minor: 120000, now: '₹1,020', nowMinor: 102000, shades: 1 },
  'colour-corrector':  { price: '₹1,950', minor: 195000, now: '₹1,658', nowMinor: 165800, shades: 1 },
  sunscreen:           { price: '₹1,200', minor: 120000, now: '₹1,020', nowMinor: 102000, shades: 1 },
};

const shown = (range: { min: number; max: number }, from?: boolean) =>
  range.min === range.max || !from ? formatMoney(range.min) : `FROM ${formatMoney(range.min)}`;

describe('catalog matches the content brief', () => {
  it('covers exactly the eight briefed products', () => {
    expect(CATALOG.map((p) => p.id).sort()).toEqual(Object.keys(BRIEF).sort());
  });

  for (const [id, want] of Object.entries(BRIEF)) {
    it(`${id}: list ${want.price}, ${want.shades} shade(s)`, () => {
      const item = CATALOG.find((p) => p.id === id)!;
      expect(item, `${id} missing`).toBeDefined();
      const range = listPriceRangeMinor(item);
      expect(shown(range, want.from)).toBe(want.price);
      expect(range.min).toBe(want.minor);
      expect(item.variants.length).toBe(want.shades);
    });

    it(`${id}: charges ${want.now} under the launch offer`, () => {
      const item = CATALOG.find((p) => p.id === id)!;
      const range = priceRangeMinor(item);
      expect(shown(range, want.from)).toBe(want.now);
      expect(range.min).toBe(want.nowMinor);
    });
  }

  it('discounts every product by exactly the offer rate', () => {
    expect(OFFER.active).toBe(true);
    for (const product of CATALOG) {
      for (const variant of product.variants) {
        const list = listPriceMinor(product, variant);
        expect(unitPriceMinor(product, variant)).toBe(Math.round((list * (1 - OFFER.rate)) / 100) * 100);
      }
    }
  });

  it('never prices a shade above its list price', () => {
    for (const product of CATALOG) {
      for (const variant of product.variants) {
        expect(unitPriceMinor(product, variant)).toBeLessThanOrEqual(
          listPriceMinor(product, variant),
        );
      }
    }
  });
});

/**
 * The tier split is the one pricing rule that exists nowhere in the brief — it
 * came from the client directly — so it is the one most likely to be lost in a
 * later edit. Charging ₹1,200 for a ₹1,800 shade fails nothing at runtime.
 */
describe('foundation shade tiers', () => {
  const foundation = CATALOG.find((p) => p.id === 'foundation')!;

  /*
   * Keyed on the real shade names and the client's own codes, which is what
   * makes this test worth having: the tier is what decides whether a buyer is
   * charged ₹1,200 or ₹1,800, and it is attached to the shade rather than
   * derived from anything. Renaming a shade for marketing, or re-sorting the
   * list, must not quietly move a price — so both the name and the code are
   * pinned alongside the money.
   *
   * The chart's split is the price split: C-coded fair shades are Pro Glow,
   * FC-coded deep shades are Professional Base.
   */
  const expected: Record<string, { code: string; tier: string; price: number; now: number }> = {
    Bisque: { code: 'C1W1', tier: 'Pro Glow', price: 180000, now: 153000 },
    Cashew: { code: 'C2W1', tier: 'Pro Glow', price: 180000, now: 153000 },
    Almond: { code: 'C2W2', tier: 'Pro Glow', price: 180000, now: 153000 },
    Fawn: { code: 'C3W1', tier: 'Pro Glow', price: 180000, now: 153000 },
    Hazel: { code: 'C3W2', tier: 'Pro Glow', price: 180000, now: 153000 },
    Amber: { code: 'FC01A', tier: 'Professional Base', price: 120000, now: 102000 },
    Espresso: { code: 'FC01E', tier: 'Professional Base', price: 120000, now: 102000 },
    Cocoa: { code: 'FC01C', tier: 'Professional Base', price: 120000, now: 102000 },
  };

  for (const [label, want] of Object.entries(expected)) {
    it(`${label} (${want.code}) is ${want.tier}, listed ${want.price / 100}, charged ${want.now / 100}`, () => {
      const variant = foundation.variants.find((v) => v.label === label)!;
      expect(variant, `${label} missing`).toBeDefined();
      expect(variant.code).toBe(want.code);
      expect(variant.tier).toBe(want.tier);
      expect(listPriceMinor(foundation, variant)).toBe(want.price);
      expect(unitPriceMinor(foundation, variant)).toBe(want.now);
    });
  }

  it('has no placeholder shade names left', () => {
    for (const product of CATALOG) {
      for (const variant of product.variants) {
        expect(variant.label, `${product.id} still has a numbered placeholder`).not.toMatch(
          /^Shade \d+$/,
        );
      }
    }
  });

  it('gives every tinted shade a real swatch, not an interpolated one', () => {
    // The old placeholders walked a smooth ramp. The published chart does not:
    // Amber is a saturated orange sitting beside a far browner Espresso, which
    // a generated gradient would never produce.
    const amber = foundation.variants.find((v) => v.code === 'FC01A')!;
    const espresso = foundation.variants.find((v) => v.code === 'FC01E')!;
    expect(amber.swatch).toBe('#b26009');
    expect(espresso.swatch).toBe('#986739');
  });

  it('shares the deep shades with the concealer, name code and colour', () => {
    const concealer = CATALOG.find((p) => p.id === 'concealer')!;
    for (const variant of concealer.variants) {
      const match = foundation.variants.find((f) => f.code === variant.code);
      expect(match, `concealer ${variant.label} has no foundation counterpart`).toBeDefined();
      expect(match!.label).toBe(variant.label);
      expect(match!.swatch).toBe(variant.swatch);
    }
  });

  it('spans ₹1,200 to ₹1,800 at list, ₹1,020 to ₹1,530 under the offer', () => {
    const list = listPriceRangeMinor(foundation);
    expect(list.min).toBe(120000);
    expect(list.max).toBe(180000);

    const now = priceRangeMinor(foundation);
    expect(now.min).toBe(102000);
    expect(now.max).toBe(153000);
  });

  it('prices every other product identically across its shades', () => {
    for (const product of CATALOG.filter((p) => p.id !== 'foundation')) {
      const range = priceRangeMinor(product);
      expect(range.min, `${product.id} has a shade price spread`).toBe(range.max);
    }
  });
});
