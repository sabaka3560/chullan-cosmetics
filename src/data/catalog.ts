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
 * Prices, names, sizes and copy below come from the client's website content
 * brief (Chullan Website Content, Parts 1 and 2).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ STILL UNCONFIRMED — MUST BE RESOLVED BEFORE LAUNCH:                      │
 * │  • Foundation shade tiers were confirmed by the client on 2026-08-20    │
 * │    and are not in the brief: shades 06-08 are Professional Base at       │
 * │    ₹1,200, shades 01-05 are Pro Glow at ₹1,800. Get these wrong and a    │
 * │    buyer is charged the wrong amount, silently.                          │
 * │  • Foundation and Concealer shade `label`/`swatch` — the brief gives     │
 * │    counts and a span ("fair neutral to deep warm") but no shade names,   │
 * │    so they stay numbered and the swatches are interpolated. Anti-Shine   │
 * │    Powder is the exception: its four shades are named in the brief.      │
 * │  • `rating`/`reviews` — invented. Publishing fabricated review counts is │
 * │    a legal problem, not just an inaccuracy.                              │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
import type { CatalogItem, Money, Variant } from '../commerce/types';

/**
 * What one unit of a given shade costs.
 *
 * The single definition of that, deliberately. The server prices every cart
 * through this function and the storefront displays through it, so the figure
 * on the card and the figure in the payment request are one expression
 * evaluated twice rather than two rules kept in step by hand. Reading
 * `product.priceMinor` directly is the bug this exists to prevent: it is
 * correct for seven products and silently wrong for the Foundation.
 */
export function unitPriceMinor(product: CatalogItem, variant: Variant): Money {
  return variant.priceMinor ?? product.priceMinor;
}

/**
 * The cheapest and dearest shade of a product.
 *
 * Lets a card decide for itself whether to say "From ₹1,200" or just "₹1,200" —
 * derived, so the prefix cannot outlive the price spread that justified it. A
 * hand-set "show From here" flag stays on after the tiers are merged, and then
 * the card is advertising a range of one.
 */
export function priceRangeMinor(product: CatalogItem): { min: Money; max: Money } {
  const prices = product.variants.map((variant) => unitPriceMinor(product, variant));
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

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
    tagline: 'Eight shades. Two tiers',
    step: { index: 6, label: 'Build' },
    blurb:
      'Professional liquid foundation in 8 shades, fair neutral to deep warm. Two formulation tiers engineered for Indian undertones. Stability tested at 40°C.',
    priceMinor: 120000,
    rating: 4.9,
    reviews: 212,
    // The 3D bottle models a 30ml pump bottle, which is exactly this pack.
    live: true,
    weightGrams: 140,
    dimensionsCm: { length: 5, width: 5, height: 11 },
    /*
     * Eight steps walked from fair neutral to deep warm. The swatches are
     * interpolated along that line rather than sampled from the product, so
     * they read as an ordered range on screen — they are not shade matches and
     * have to be replaced with measured values before anyone buys off them.
     */
    /*
     * Two tiers, two prices, and the shade decides which.
     *
     * The five lighter shades are Pro Glow at 1,80,000 paise; the three deepest
     * are the original Professional Base at the product's own 1,20,000. Because
     * the tiers do not share a price, `priceMinor` on the row above is only the
     * default — what a buyer actually pays comes from `unitPriceMinor()`, which
     * is also what the server charges.
     *
     * Confirmed with the client 2026-08-20. The brief names both tiers but
     * prices only one, so this mapping does not exist in the document.
     */
    variants: [
      { sku: 'CHU-FDN-30-01', label: 'Shade 01', swatch: '#f0d3b8', tier: 'Pro Glow', priceMinor: 180000, inStock: true },
      { sku: 'CHU-FDN-30-02', label: 'Shade 02', swatch: '#e8c2a1', tier: 'Pro Glow', priceMinor: 180000, inStock: true },
      { sku: 'CHU-FDN-30-03', label: 'Shade 03', swatch: '#dfae87', tier: 'Pro Glow', priceMinor: 180000, inStock: true },
      { sku: 'CHU-FDN-30-04', label: 'Shade 04', swatch: '#d3996d', tier: 'Pro Glow', priceMinor: 180000, inStock: true },
      { sku: 'CHU-FDN-30-05', label: 'Shade 05', swatch: '#c2855a', tier: 'Pro Glow', priceMinor: 180000, inStock: true },
      { sku: 'CHU-FDN-30-06', label: 'Shade 06', swatch: '#ab6f48', tier: 'Professional Base', inStock: true },
      { sku: 'CHU-FDN-30-07', label: 'Shade 07', swatch: '#8f5a39', tier: 'Professional Base', inStock: true },
      { sku: 'CHU-FDN-30-08', label: 'Shade 08', swatch: '#70452b', tier: 'Professional Base', inStock: true },
    ],
  },
  {
    id: 'concealer',
    name: 'Concealer',
    line: 'professional',
    category: 'Face',
    size: '30ml · 1fl oz',
    tagline: 'Precision where it matters',
    step: { index: 5, label: 'Refine' },
    blurb:
      'Full-coverage liquid concealer for dark circles, pigmentation, and blemishes. 3 warm shades matched to the foundation system for seamless correction on Indian skin.',
    priceMinor: 120000,
    rating: 4.7,
    reviews: 148,
    weightGrams: 140,
    dimensionsCm: { length: 5, width: 5, height: 11 },
    variants: [
      { sku: 'CHU-CNC-30-01', label: 'Shade 01', swatch: '#e7bd97', inStock: true },
      { sku: 'CHU-CNC-30-02', label: 'Shade 02', swatch: '#d09a6d', inStock: true },
      { sku: 'CHU-CNC-30-03', label: 'Shade 03', swatch: '#b07a4f', inStock: true },
    ],
  },
  {
    id: 'moisturiser',
    name: 'Moisturiser',
    line: 'professional',
    category: 'Skin',
    size: '100g · Vitamin E',
    tagline: 'The first layer',
    step: { index: 1, label: 'Prep' },
    blurb:
      'Pre-makeup hydration with Jojoba Oil, Cocoa Butter, Vitamin E, and Grape Seed Oil. Dermatologically tested under IS 4011:2018 — classified Non-Irritant. Suitable for normal to dry skin. Oily skin types can use a lighter application.',
    priceMinor: 110000,
    rating: 4.7,
    reviews: 118,
    weightGrams: 150,
    dimensionsCm: { length: 5, width: 4, height: 16 },
    variants: only('CHU-MST-100'),
  },
  {
    id: 'hydra-primer',
    name: 'Hydra Primer',
    line: 'professional',
    category: 'Face',
    size: '30ml · 1fl oz',
    tagline: 'Smoother skin before makeup',
    step: { index: 3, label: 'Prime' },
    blurb:
      'Hydrating primer that creates a smooth, even base for long-lasting foundation application. Prepares skin so makeup sits evenly and wears longer through heat and humidity.',
    priceMinor: 150000,
    rating: 4.8,
    reviews: 118,
    weightGrams: 140,
    dimensionsCm: { length: 5, width: 5, height: 11 },
    variants: only('CHU-PRM-30'),
  },
  {
    id: 'anti-shine-powder',
    name: 'Anti-Shine Powder',
    line: 'professional',
    category: 'Face',
    size: '10g · 4 shades',
    tagline: 'Shine gone. Base locked.',
    step: { index: 7, label: 'Control' },
    blurb:
      'Setting powder in Banana, Beige, Light Pink, and White. Sets foundation with a smooth matte finish. Professional salon-grade formula for oil control.',
    priceMinor: 79500,
    rating: 4.6,
    reviews: 74,
    weightGrams: 90,
    dimensionsCm: { length: 6, width: 6, height: 5 },
    // The only shade names in the range that are actually documented.
    variants: [
      { sku: 'CHU-ASP-10-BAN', label: 'Banana', swatch: '#f2e3b0', inStock: true },
      { sku: 'CHU-ASP-10-BEI', label: 'Beige', swatch: '#e8d5bb', inStock: true },
      { sku: 'CHU-ASP-10-LPK', label: 'Light Pink', swatch: '#f2dcd8', inStock: true },
      { sku: 'CHU-ASP-10-WHT', label: 'White', swatch: '#f5f2ee', inStock: true },
    ],
  },
  {
    id: 'setting-spray',
    name: 'Setting Spray',
    line: 'professional',
    category: 'Face',
    size: '100ml',
    tagline: 'Lasting hold. One spray.',
    step: { index: 8, label: 'Set' },
    blurb:
      'Alcohol-free makeup fixer with silicone film-forming technology. Locks makeup in place through long events, outdoor sessions, and humid Indian conditions. Professional MUAs report consistent hold without colour shift.',
    priceMinor: 120000,
    rating: 4.8,
    reviews: 131,
    weightGrams: 190,
    dimensionsCm: { length: 5, width: 5, height: 17 },
    variants: only('CHU-SSP-100'),
  },
  {
    id: 'colour-corrector',
    name: 'Colour Corrector Palette',
    line: 'professional',
    category: 'Face',
    size: '6 shades · 4g each',
    tagline: 'Dark circles gone',
    step: { index: 4, label: 'Correct' },
    blurb:
      'Professional 6-shade corrector palette. Neutralises dark circles, pigmentation, and redness before foundation application. Creamy, blendable formula for precise colour correction on Indian skin.',
    priceMinor: 195000,
    rating: 4.8,
    reviews: 96,
    weightGrams: 180,
    dimensionsCm: { length: 13, width: 9, height: 2 },
    // Sold as one palette — the six shades are what is inside it, not a choice.
    variants: only('CHU-COR-P6'),
  },
  {
    id: 'sunscreen',
    name: 'Sunscreen SPF 50',
    line: 'professional',
    category: 'Skin',
    size: '100g · SPF 50',
    tagline: 'Invisible protection',
    step: { index: 2, label: 'Protect' },
    blurb:
      'SPF 50 daily sun protection that sits smoothly under makeup without pilling or white cast. Dermatologically tested under IS 4011:2018, classified Non-Irritant. Apply after moisturiser, before primer.',
    priceMinor: 120000,
    rating: 4.9,
    reviews: 167,
    weightGrams: 150,
    dimensionsCm: { length: 5, width: 4, height: 16 },
    variants: only('CHU-SUN-100'),
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

/**
 * The range in the order it is used: prep, protect, prime, correct, refine,
 * build, control, set.
 *
 * Sorted from `step` rather than written out again, so the process bar, the
 * range grid and the home page grid are all reading one sequence. A second
 * hand-typed ordering is how the strip ends up saying CORRECT above a card for
 * the concealer.
 */
export const ROUTINE: CatalogItem[] = [...CATALOG].sort(
  (a, b) => a.step.index - b.step.index,
);
