/**
 * The catalog, as pure data.
 *
 * Deliberately free of Vite asset imports so it can be read by a serverless
 * function as well as the browser. That matters more than it looks: the price
 * a buyer is charged has to be computed on the server from the same rows the
 * page rendered from, and two copies of a price list are two prices.
 *
 * `src/data/products.ts` re-exports this with image URLs attached for the
 * client. Commerce fields live here and nowhere else.
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │ PLACEHOLDERS — MUST BE REPLACED BEFORE LAUNCH:                            │
 * │  • `priceMinor` — the 2026 catalogue carries no prices. Every figure      │
 * │    below is invented to make the cart render.                            │
 * │  • shade `label`/`swatch` — the catalogue shows shades but never names    │
 * │    them, so they are numbered.                                           │
 * │  • `rating`/`reviews` — invented. Publishing fabricated review counts is  │
 * │    a legal problem, not just an inaccuracy.                              │
 * └────────────────────────────────────────────────────────────────────────┘
 */
import type { CatalogItem, Variant } from '../commerce/types';

/** Products with nothing to choose still carry one variant. See `Variant`. */
const only = (sku: string, inStock = true): Variant[] => [
  { sku, label: 'One size', inStock },
];

export const CATALOG: CatalogItem[] = [
  {
    id: 'foundation',
    name: 'Foundation',
    line: 'professional',
    category: 'Face',
    size: '30ml · 1fl oz',
    blurb:
      'Seamless perfection. Flawless coverage for a radiant, natural look that lasts all day.',
    priceMinor: 2900,
    rating: 4.9,
    reviews: 212,
    // The 3D bottle models a 30ml pump bottle, which is exactly this pack.
    live: true,
    weightGrams: 140,
    variants: [
      { sku: 'CHU-FDN-30-01', label: 'Shade 01', swatch: '#e8bfa0', inStock: true },
      { sku: 'CHU-FDN-30-02', label: 'Shade 02', swatch: '#d79b70', inStock: true },
      { sku: 'CHU-FDN-30-03', label: 'Shade 03', swatch: '#b9764a', inStock: true },
    ],
  },
  {
    id: 'concealer',
    name: 'Concealer',
    line: 'professional',
    category: 'Face',
    size: '30ml · 1fl oz',
    blurb:
      'Flawless confidence. Hides dark circles, scars and blemishes from day to night.',
    priceMinor: 2400,
    rating: 4.7,
    reviews: 148,
    weightGrams: 140,
    variants: [
      { sku: 'CHU-CNC-30-01', label: 'Shade 01', swatch: '#e0ae8b', inStock: true },
      { sku: 'CHU-CNC-30-02', label: 'Shade 02', swatch: '#c98a5c', inStock: true },
    ],
  },
  {
    id: 'colour-corrector',
    name: 'Colour Corrector',
    line: 'professional',
    category: 'Face',
    size: '6 pans · Palette',
    blurb:
      'A 3-in-1 palette that conceals, corrects and contours. Enriched with hibiscus and tea tree.',
    priceMinor: 3200,
    rating: 4.8,
    reviews: 96,
    weightGrams: 180,
    variants: only('CHU-COR-P6'),
  },
  {
    id: 'anti-shine-powder',
    name: 'Anti-Shine Powder',
    line: 'professional',
    category: 'Set',
    size: '10g · Loose',
    blurb: 'A translucent veil that kills shine across the T-zone without flattening the skin.',
    priceMinor: 1900,
    rating: 4.6,
    reviews: 74,
    weightGrams: 90,
    variants: only('CHU-ASP-10'),
  },
  {
    id: 'finishing-spray',
    name: 'Finishing Spray',
    line: 'professional',
    category: 'Set',
    size: '100g · Correct · Set · Prepare · Fix',
    blurb: 'Sets the whole face and holds it for up to ten hours.',
    priceMinor: 2200,
    rating: 4.8,
    reviews: 131,
    weightGrams: 190,
    variants: only('CHU-FSP-100'),
  },
  {
    id: 'moisturiser',
    name: 'Moisturiser',
    line: 'professional',
    category: 'Skin',
    size: '100g · Vitamin E',
    blurb: 'Grape seed and carrot oil, for the base every other step sits on.',
    priceMinor: 2100,
    rating: 4.7,
    reviews: 118,
    weightGrams: 150,
    variants: only('CHU-MST-100'),
  },
  {
    id: 'sunscreen',
    name: 'Sunscreen SPF 50',
    line: 'professional',
    category: 'Skin',
    size: '100g · SPF 50',
    blurb: 'Aloe vera and shea butter. Wears under make-up without pilling.',
    priceMinor: 2300,
    rating: 4.9,
    reviews: 167,
    weightGrams: 150,
    variants: only('CHU-SUN-100'),
  },
  {
    id: 'primer-men',
    name: 'Primer',
    line: 'men',
    category: 'Prep',
    size: '30ml · 1fl oz',
    blurb: 'Flawless canvas. A smooth base for a perfect, long-lasting finish.',
    priceMinor: 2600,
    rating: 4.8,
    reviews: 89,
    weightGrams: 140,
    variants: only('CHU-MEN-PRM-30'),
  },
];

/** What a cart line resolves to: the product and the specific shade. */
export type CatalogEntry = { product: CatalogItem; variant: Variant };

/**
 * Indexed once at module load. The cart resolves every line against this on
 * every render, so a nested scan per line per frame is the wrong shape even at
 * eight products — and it is the kind of thing nobody revisits at three hundred.
 */
const bySku = new Map<string, CatalogEntry>(
  CATALOG.flatMap((product) =>
    product.variants.map((variant) => [variant.sku, { product, variant }] as const),
  ),
);

/**
 * Returns `undefined` for unknown codes rather than throwing. A SKU pulled from
 * the catalog is an expected state, not an exception: it is exactly what a stale
 * localStorage cart looks like after a shade is retired.
 */
export function catalogBySku(sku: string): CatalogEntry | undefined {
  return bySku.get(sku);
}

export function catalogById(id: string): CatalogItem | undefined {
  return CATALOG.find((product) => product.id === id);
}
