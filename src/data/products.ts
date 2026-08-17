import bottleImg from '../assets/bottle.png';
import stickImg from '../assets/stick.png';
import tubeImg from '../assets/tube.png';
import { CATALOG, catalogById, catalogBySku } from './catalog';
import type { Product, Variant } from '../commerce/types';

export type { Product, Variant };

/**
 * The browser's view of the catalog: the shared commerce rows from
 * `catalog.ts`, with imagery attached.
 *
 * Prices, SKUs and weights deliberately do not live here. They live in
 * `catalog.ts`, which a serverless function can also read — so the amount a
 * buyer is charged is computed from the same rows the page rendered from
 * rather than from a second, drifting copy.
 *
 * Imagery is the one thing that cannot be shared: these are Vite asset imports
 * that resolve to hashed URLs at build time, and there is nothing for Node to
 * resolve them to.
 *
 * TODO — Colour Corrector, Anti-Shine Powder and Finishing Spray have no
 * photography yet and are borrowing another product's cutout. The design needs
 * 4:5 images on white.
 */
const IMAGERY: Record<string, { image?: string; thumb: string }> = {
  foundation: { thumb: bottleImg },
  concealer: { image: stickImg, thumb: stickImg },
  'colour-corrector': { thumb: stickImg },
  'anti-shine-powder': { thumb: stickImg },
  'finishing-spray': { thumb: tubeImg },
  moisturiser: { image: tubeImg, thumb: tubeImg },
  sunscreen: { thumb: tubeImg },
  'primer-men': { thumb: bottleImg },
};

export const products: Product[] = CATALOG.map((item) => ({
  ...item,
  // Falls back rather than throwing: a new SKU with no photograph yet should
  // show a placeholder, not blank the whole shop.
  ...(IMAGERY[item.id] ?? { thumb: bottleImg }),
}));

const bySku = new Map<string, { product: Product; variant: Variant }>(
  products.flatMap((product) =>
    product.variants.map((variant) => [variant.sku, { product, variant }] as const),
  ),
);

/** What a cart line resolves to: the product and the specific shade. */
export type CatalogEntry = { product: Product; variant: Variant };

/**
 * Returns `undefined` for unknown codes rather than throwing. A SKU that has
 * been pulled from the catalog is an expected state, not an exception: it is
 * exactly what a stale localStorage cart looks like after a shade is retired,
 * and the cart is responsible for dropping those lines quietly.
 */
export function productBySku(sku: string): CatalogEntry | undefined {
  return bySku.get(sku);
}

export function productById(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}

/**
 * The row on the landing page. Explicit rather than `slice(0, 3)` so changing
 * what gets promoted is an edit here and not a reshuffle of the catalog.
 */
export const bestSellerIds = ['concealer', 'foundation', 'moisturiser'] as const;

export const bestSellers = bestSellerIds
  .map(productById)
  .filter((product): product is Product => product !== undefined);

// Re-exported so server-shared helpers stay reachable from one import site.
export { CATALOG, catalogById, catalogBySku };
