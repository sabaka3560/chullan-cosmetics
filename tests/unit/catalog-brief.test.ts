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
import { CATALOG, priceRangeMinor, unitPriceMinor } from '../../src/data/catalog';
import { formatMoney } from '../../src/commerce/money';

/** Transcribed from Chullan Website Content, Parts 1 and 2 — both pages agree. */
const BRIEF: Record<string, { price: string; minor: number; from?: boolean; shades: number }> = {
  foundation:          { price: 'FROM ₹1,200', minor: 120000, from: true, shades: 8 },
  concealer:           { price: '₹1,200', minor: 120000, shades: 3 },
  moisturiser:         { price: '₹1,100', minor: 110000, shades: 1 },
  'hydra-primer':      { price: '₹1,500', minor: 150000, shades: 1 },
  'anti-shine-powder': { price: '₹795',   minor: 79500,  shades: 4 },
  'setting-spray':     { price: '₹1,200', minor: 120000, shades: 1 },
  'colour-corrector':  { price: '₹1,950', minor: 195000, shades: 1 },
  sunscreen:           { price: '₹1,200', minor: 120000, shades: 1 },
};

describe('catalog matches the content brief', () => {
  it('covers exactly the eight briefed products', () => {
    expect(CATALOG.map((p) => p.id).sort()).toEqual(Object.keys(BRIEF).sort());
  });

  for (const [id, want] of Object.entries(BRIEF)) {
    it(`${id}: ${want.price}, ${want.shades} shade(s)`, () => {
      const item = CATALOG.find((p) => p.id === id)!;
      expect(item, `${id} missing`).toBeDefined();
      const range = priceRangeMinor(item);
      const shown =
        range.min === range.max
          ? formatMoney(range.min)
          : `FROM ${formatMoney(range.min)}`;
      expect(shown).toBe(want.price);
      expect(range.min).toBe(want.minor);
      expect(item.variants.length).toBe(want.shades);
    });
  }
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
  const expected: Record<string, { code: string; tier: string; price: number }> = {
    Bisque: { code: 'C1W1', tier: 'Pro Glow', price: 180000 },
    Cashew: { code: 'C2W1', tier: 'Pro Glow', price: 180000 },
    Almond: { code: 'C2W2', tier: 'Pro Glow', price: 180000 },
    Fawn: { code: 'C3W1', tier: 'Pro Glow', price: 180000 },
    Hazel: { code: 'C3W2', tier: 'Pro Glow', price: 180000 },
    Amber: { code: 'FC01A', tier: 'Professional Base', price: 120000 },
    Espresso: { code: 'FC01E', tier: 'Professional Base', price: 120000 },
    Cocoa: { code: 'FC01C', tier: 'Professional Base', price: 120000 },
  };

  for (const [label, want] of Object.entries(expected)) {
    it(`${label} (${want.code}) is ${want.tier} at ${want.price / 100}`, () => {
      const variant = foundation.variants.find((v) => v.label === label)!;
      expect(variant, `${label} missing`).toBeDefined();
      expect(variant.code).toBe(want.code);
      expect(variant.tier).toBe(want.tier);
      expect(unitPriceMinor(foundation, variant)).toBe(want.price);
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

  it('spans ₹1,200 to ₹1,800', () => {
    const range = priceRangeMinor(foundation);
    expect(range.min).toBe(120000);
    expect(range.max).toBe(180000);
  });

  it('prices every other product identically across its shades', () => {
    for (const product of CATALOG.filter((p) => p.id !== 'foundation')) {
      const range = priceRangeMinor(product);
      expect(range.min, `${product.id} has a shade price spread`).toBe(range.max);
    }
  });
});
