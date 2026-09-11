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
 * │  • Foundation and Concealer shades are now the client's published shade │
 * │    charts — real names, real codes, real hex values. They were numbered │
 * │    placeholders with interpolated swatches until 2026-08-24.            │
 * │  • `rating`/`reviews` — invented. Publishing fabricated review counts is │
 * │    a legal problem, not just an inaccuracy.                              │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
/* `.js` required — see the note in `commerce/policy.ts`. This catalog is the
   single source the serverless re-pricing reads, so Node resolves it too. */
import type { CatalogItem, Money, Variant } from '../commerce/types.js';

/**
 * The launch offer.
 *
 * ONE RATE, APPLIED IN ONE PLACE. The alternative — typing a second discounted
 * figure beside every `priceMinor` — is nine chances to fat-finger a number
 * that is charged to a real card, and no way to end the sale except editing all
 * nine back. Here, `active: false` ends it and every price on the site reverts
 * in the same commit.
 *
 * It is applied inside `unitPriceMinor` rather than at render, which is the
 * whole point: `api/_lib/pricing.ts` prices every cart through that function,
 * so the discount reaches the payment request automatically. A discount applied
 * only in the UI shows ₹935 on the card and charges ₹1,100 to the card.
 */
export const OFFER = {
  active: true,
  /** Fraction off the list price. 0.15 is fifteen percent. */
  rate: 0.15,
  label: 'Launch offer',
  terms: 'Limited period',
} as const;

/**
 * What one unit of a given shade costs BEFORE the offer — the struck-through
 * figure, and the only honest thing to strike through. Showing a "was" price
 * the product never sold at is the practice consumer regulators actually
 * prosecute, so this stays the real list price rather than an inflated one.
 */
export function listPriceMinor(product: CatalogItem, variant: Variant): Money {
  return variant.priceMinor ?? product.priceMinor;
}

/**
 * What one unit of a given shade costs today.
 *
 * The single definition of that, deliberately. The server prices every cart
 * through this function and the storefront displays through it, so the figure
 * on the card and the figure in the payment request are one expression
 * evaluated twice rather than two rules kept in step by hand. Reading
 * `product.priceMinor` directly is the bug this exists to prevent: it is
 * correct for seven products and silently wrong for the Foundation.
 */
export function unitPriceMinor(product: CatalogItem, variant: Variant): Money {
  const list = listPriceMinor(product, variant);
  if (!OFFER.active) return list;
  // Rounded to whole rupees. A sale price of ₹636.40 reads as a rounding bug
  // and prints badly at the sizes this page sets prices in.
  return Math.round((list * (1 - OFFER.rate)) / 100) * 100;
}

/** What this shade saves against its list price. Zero when the offer is off. */
export function savingMinor(product: CatalogItem, variant: Variant): Money {
  return listPriceMinor(product, variant) - unitPriceMinor(product, variant);
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

/** The same range before the offer, so a card can strike through its headline. */
export function listPriceRangeMinor(product: CatalogItem): { min: Money; max: Money } {
  const prices = product.variants.map((variant) => listPriceMinor(product, variant));
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
    weightGrams: 140,
    dimensionsCm: { length: 5, width: 5, height: 11 },
    /*
     * Eight shades, fair neutral to deep warm, in the order the client's shade
     * chart prints them: five fair, then three deep. That order is not
     * cosmetic — the price tier is attached to position, so re-sorting this
     * list silently re-prices the range.
     *
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
     *
     * Names, codes and swatch values are the client's own shade chart
     * (`Chullan Foundation Shades`), not sampled from a photograph and not
     * interpolated. The hex values are what the chart publishes, so what a
     * buyer taps on screen is the colour the brand says the shade is.
     *
     * The chart's own split is the price split: five "Fair shades" carrying
     * C-codes are Pro Glow, three "Deep shades" carrying FC-codes are
     * Professional Base. The two tiers were already priced that way before the
     * names existed, and the chart confirms the boundary rather than moving it.
     */
    variants: [
      { sku: 'CHU-FDN-30-01', label: 'Bisque', code: 'C1W1', swatch: '#ffe1be', tier: 'Pro Glow', priceMinor: 180000, inStock: true },
      { sku: 'CHU-FDN-30-02', label: 'Cashew', code: 'C2W1', swatch: '#f8d2a5', tier: 'Pro Glow', priceMinor: 180000, inStock: true },
      { sku: 'CHU-FDN-30-03', label: 'Almond', code: 'C2W2', swatch: '#e5b397', tier: 'Pro Glow', priceMinor: 180000, inStock: true },
      { sku: 'CHU-FDN-30-04', label: 'Fawn', code: 'C3W1', swatch: '#dcaa86', tier: 'Pro Glow', priceMinor: 180000, inStock: true },
      { sku: 'CHU-FDN-30-05', label: 'Hazel', code: 'C3W2', swatch: '#d69b6c', tier: 'Pro Glow', priceMinor: 180000, inStock: true },
      { sku: 'CHU-FDN-30-06', label: 'Amber', code: 'FC01A', swatch: '#b26009', tier: 'Professional Base', inStock: true },
      { sku: 'CHU-FDN-30-07', label: 'Espresso', code: 'FC01E', swatch: '#986739', tier: 'Professional Base', inStock: true },
      { sku: 'CHU-FDN-30-08', label: 'Cocoa', code: 'FC01C', swatch: '#6d3e2a', tier: 'Professional Base', inStock: true },
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
      // The concealer chart publishes the same three deep shades as the
      // foundation's Professional Base tier — same names, same codes, same hex.
      // They are matched to correct against those shades, so sharing the
      // identifiers is the point rather than a duplication to tidy away.
      { sku: 'CHU-CNC-30-01', label: 'Amber', code: 'FC01A', swatch: '#b26009', inStock: true },
      { sku: 'CHU-CNC-30-02', label: 'Espresso', code: 'FC01E', swatch: '#986739', inStock: true },
      { sku: 'CHU-CNC-30-03', label: 'Cocoa', code: 'FC01C', swatch: '#6d3e2a', inStock: true },
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
    /*
     * `Primer`, not `Hydra Primer`. The pack itself reads PRIMER, and a listing
     * that names the product something the box does not is the kind of small
     * mismatch a buyer notices when the parcel arrives.
     *
     * The id moved with the name, so the URL is `/product/primer`.
     * `vercel.json` redirects the old path permanently, so any link shared
     * before the rename still resolves instead of hitting a dead route.
     */
    id: 'primer',
    name: 'Primer',
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
