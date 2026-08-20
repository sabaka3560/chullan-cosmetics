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

  const expected: Record<string, { tier: string; price: number }> = {
    'Shade 01': { tier: 'Pro Glow', price: 180000 },
    'Shade 02': { tier: 'Pro Glow', price: 180000 },
    'Shade 03': { tier: 'Pro Glow', price: 180000 },
    'Shade 04': { tier: 'Pro Glow', price: 180000 },
    'Shade 05': { tier: 'Pro Glow', price: 180000 },
    'Shade 06': { tier: 'Professional Base', price: 120000 },
    'Shade 07': { tier: 'Professional Base', price: 120000 },
    'Shade 08': { tier: 'Professional Base', price: 120000 },
  };

  for (const [label, want] of Object.entries(expected)) {
    it(`${label} is ${want.tier} at ${want.price / 100}`, () => {
      const variant = foundation.variants.find((v) => v.label === label)!;
      expect(variant, `${label} missing`).toBeDefined();
      expect(variant.tier).toBe(want.tier);
      expect(unitPriceMinor(foundation, variant)).toBe(want.price);
    });
  }

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
