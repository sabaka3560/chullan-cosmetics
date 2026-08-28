import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../src/data/catalog';
import {
  INGREDIENTS,
  SUSPECTED_TYPOS,
  ingredientsForCatalog,
  productsMissingIngredients,
} from '../../src/data/ingredients';

/**
 * An ingredient list is what somebody with an allergy reads before deciding a
 * product is safe for them. It is the one body of copy on this site where being
 * approximately right is worse than being absent, so these lock the things that
 * could silently go wrong: a key that matches no product, a disclosure quietly
 * dropped, and the comma that would split a real ingredient in half.
 */

describe('ingredient disclosures', () => {
  it('keys every entry to a real catalog product', () => {
    const ids = new Set(CATALOG.map((p) => p.id));
    for (const key of Object.keys(INGREDIENTS)) {
      expect(ids.has(key), `"${key}" matches no catalog product`).toBe(true);
    }
  });

  it('covers every product in the catalog', () => {
    // If this fails, a product ships with no published ingredients. That is a
    // real gap rather than a test to relax.
    expect(productsMissingIngredients()).toEqual([]);
  });

  it('carries the catalog name, not the manufacturer document name', () => {
    // The source document says "FINISHING SPRAY" and "LIQUID CONCEALER". The
    // page must not introduce a third set of product names to the site.
    const spray = ingredientsForCatalog().find((p) => p.id === 'setting-spray')!;
    expect(spray.name).toBe(CATALOG.find((p) => p.id === 'setting-spray')!.name);
    expect(spray.name).not.toMatch(/finishing/i);
  });

  it('keeps 1,3 butylene glycol intact', () => {
    /*
     * The reason these are stored as one string rather than a split array. A
     * naive split on "," turns this single ingredient into "1" and
     * "3 butylene glycol" — inventing one and destroying another.
     */
    expect(INGREDIENTS.sunscreen).toContain('1,3 butylene glycol');
    const naive = INGREDIENTS.sunscreen.split(',').map((s) => s.trim());
    expect(naive).toContain('1');
  });

  it('renders every list as non-empty prose ending in a full stop', () => {
    for (const product of ingredientsForCatalog()) {
      expect(product.list.length, `${product.id} is empty`).toBeGreaterThan(20);
      expect(product.list.trim().endsWith('.'), `${product.id} is truncated`).toBe(true);
    }
  });

  it('still contains the spellings flagged as suspect, uncorrected', () => {
    // The typos are reported to the business, not fixed here. If one disappears
    // from the data it must also leave SUSPECTED_TYPOS, or this page and the
    // printed carton have quietly diverged.
    for (const typo of SUSPECTED_TYPOS) {
      for (const id of typo.in) {
        expect(INGREDIENTS[id], `${id} no longer contains "${typo.as_written}"`).toContain(
          typo.as_written,
        );
      }
    }
  });
});
