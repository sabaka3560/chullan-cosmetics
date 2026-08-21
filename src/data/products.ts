import bottleImg from '../assets/bottle.png';
import foundationImg from '../assets/product-foundation.jpg';
import concealerImg from '../assets/product-concealer.jpg';
import moisturiserImg from '../assets/product-moisturiser.jpg';
import correctorImg from '../assets/product-colour-corrector.jpg';
import antiShineImg from '../assets/product-anti-shine-powder.jpg';
import sunscreenImg from '../assets/hero-sunscreen.jpg';
import hydraPrimerImg from '../assets/product-hydra-primer.jpg';
import settingSprayImg from '../assets/product-setting-spray.jpg';
import { CATALOG, ROUTINE, catalogById, catalogBySku } from './catalog';
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
 * `shot` records what kind of picture each row has, because they want different
 * treatment in the same box — see `.card__media`.
 *
 *   pack   The commissioned photography: the product lit on stone, filling its
 *          own frame. Cropped to fill, on a dark ground.
 *   cutout The product floating on white. Fitted inside, or the cap is sliced
 *          off. Light ground.
 *   tile   No photograph exists. Draws the brand device instead.
 *
 * Every row now has a photograph, so nothing renders a `tile` today. The case
 * is kept because it is the honest answer to a product arriving before its
 * shot does: it shows no product rather than a wrong one, and being dark it
 * keeps the grid's rhythm instead of punching a white hole in it. That is not
 * hypothetical — Hydra Primer and Setting Spray sat on tiles precisely because
 * the nearest cutouts to hand were a bottle labelled LUMINOUS MATTE FOUNDATION
 * and a generic tube, which would have advertised the wrong product on a page
 * where people buy things.
 *
 * Those two are now cropped from the primer/setting-spray hero photograph
 * rather than shot separately, framed above the cap-to-label band so each fills
 * a 4:5 frame like the other six.
 */
type Imagery = { image?: string; thumb: string; shot: 'pack' | 'cutout' | 'tile' };

const IMAGERY: Record<string, Imagery> = {
  foundation: { image: foundationImg, thumb: foundationImg, shot: 'pack' },
  concealer: { image: concealerImg, thumb: concealerImg, shot: 'pack' },
  moisturiser: { image: moisturiserImg, thumb: moisturiserImg, shot: 'pack' },
  'colour-corrector': { image: correctorImg, thumb: correctorImg, shot: 'pack' },
  'anti-shine-powder': { image: antiShineImg, thumb: antiShineImg, shot: 'pack' },
  sunscreen: { image: sunscreenImg, thumb: sunscreenImg, shot: 'pack' },
  'hydra-primer': { image: hydraPrimerImg, thumb: hydraPrimerImg, shot: 'pack' },
  'setting-spray': { image: settingSprayImg, thumb: settingSprayImg, shot: 'pack' },
};

export const products: Product[] = CATALOG.map((item) => ({
  ...item,
  // Falls back rather than throwing: a new SKU with no photograph yet should
  // show a placeholder, not blank the whole shop.
  ...(IMAGERY[item.id] ?? { thumb: bottleImg, shot: 'cutout' as const }),
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
 * The range in the order it is used, with imagery attached.
 *
 * Ordered by `step` rather than by a list written here, so this grid, the range
 * page and the process bar above it cannot drift into three different
 * sequences.
 */
export const routine: Product[] = [...products].sort(
  (a, b) => a.step.index - b.step.index,
);

/**
 * The row on the landing page — now the whole range rather than a promoted
 * three, which is what the content brief asks for, and in routine order so the
 * grid reads as a sequence rather than a shelf.
 */
export const bestSellers = routine;

// Re-exported so server-shared helpers stay reachable from one import site.
export { CATALOG, ROUTINE, catalogById, catalogBySku };
