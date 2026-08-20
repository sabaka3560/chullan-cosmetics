/**
 * The commerce data model.
 *
 * The single rule that shapes everything in this folder: **the cart stores SKU
 * codes and quantities, and nothing else.** No prices, no names, no images. All
 * of that is resolved from the catalog every time the cart is read.
 *
 * That constraint is what makes the checkout provider swappable later. A cart
 * that carries its own prices has to be reconciled against the real catalogue
 * at handoff, and every hosted checkout wants that reconciliation done
 * differently. A cart that carries only references has nothing to reconcile —
 * it hands over `[{ sku, qty }]` and the priced side of the transaction is
 * whoever owns the catalogue.
 *
 * It also kills the stale-price bug by construction: a cart sitting in
 * localStorage for three weeks cannot resurrect last month's price, because it
 * never knew the price in the first place.
 */

/**
 * Money in minor units (paise, cents) as an integer — never a float.
 *
 * Float money produces sub-unit drift that surfaces as a one-paise gap between
 * the total the cart shows and the total the buyer is charged. That gap gets
 * reported as a billing error, and it is unfalsifiable from logs because both
 * numbers look correct when printed.
 */
export type Money = number;

export type Currency = 'USD' | 'INR';

/** The two brand lines in the catalogue. */
export type ProductLine = 'professional' | 'men';

/**
 * A buyable thing.
 *
 * Shade is the only variant axis in this range, and it is the reason variants
 * exist as a concept here at all: Foundation and Concealer are one product on
 * the page and several distinct things in a warehouse. Shiprocket ships a
 * variant, not a product — so the variant SKU is the unit of inventory, the
 * unit of the cart line, and the thing that gets handed to checkout.
 *
 * Products with nothing to choose (Moisturiser, Sunscreen) still carry exactly
 * one variant rather than making the field optional. A single shape that is
 * sometimes trivial beats two shapes that every consumer has to branch on.
 */
export type Variant = {
  /**
   * Inventory code, and the join key with Shiprocket's SKU master.
   *
   * Deliberately not derived from the name: it has to match what is typed into
   * the Shiprocket panel character for character, and a derived code silently
   * breaks the join the first time someone renames a shade for marketing
   * reasons.
   */
  sku: string;

  /** Shade name. Shown in the picker, the cart line and the order. */
  label: string;

  /** Approximate shade colour for the picker swatch. Cosmetic only. */
  swatch?: string;

  /**
   * Overrides the product price for this shade alone.
   *
   * Real money, not decoration: some shades belong to a costlier formulation
   * tier, so the shade a buyer picks decides what they pay. Read it through
   * `unitPriceMinor()` and never directly — the server prices the cart from the
   * same helper, and a call site that reaches past it charges the wrong amount
   * without failing anything.
   */
  priceMinor?: Money;

  /** Formulation tier, where a product has more than one. Display only. */
  tier?: string;

  inStock: boolean;
};

/**
 * A product's commerce facts — everything that decides what is sold and for how
 * much. Deliberately excludes imagery, so this half can be read by a serverless
 * function that has no way to resolve a Vite asset import.
 *
 * The split exists because the price a buyer is charged must be computed on the
 * server from the same rows the page rendered from. Two copies of a price list
 * eventually disagree, and the disagreement surfaces as a buyer being charged
 * something other than what they saw.
 */
export type CatalogItem = {
  /** URL slug and React key. User-facing, so it reads as words. */
  id: string;

  name: string;
  line: ProductLine;
  category: string;

  /** Display copy for the size line — not a parseable quantity. */
  size: string;

  /** The product description. Rendered on the card and on the product page. */
  blurb: string;

  /**
   * Three or four words, for the range page.
   *
   * Not a shortened `blurb` — a different job. `blurb` explains one product to
   * someone deciding on it; this names that product's role in a sequence of
   * eight, where the reader is scanning the whole system rather than reading
   * any single row. Truncating the long copy would give neither.
   */
  tagline: string;

  /**
   * Position in the eight-step routine: prep, protect, prime, correct, refine,
   * build, control, set. Drives the process bar and the order of the range
   * page, so the strip and the grid beneath it cannot disagree.
   */
  step: { index: number; label: string };

  /**
   * The default price for this product's shades. A shade that costs something
   * else overrides it with its own `priceMinor`.
   */
  priceMinor: Money;
  /** Set only when there is a genuine former price to strike through. */
  compareAtMinor?: Money;

  rating: number;
  reviews: number;

  /** Rendered live in WebGL instead of shipped as a photograph. */
  live?: boolean;

  /**
   * Packed shipping weight in grams, carton included — not the net fill weight
   * on the label. A 30ml bottle is 30g of product and about 140g of glass,
   * pump, carton and filler, and couriers bill the second number.
   *
   * Shiprocket bills off its own SKU record rather than this field. The copy
   * lives here so the cart can show a delivery estimate before handoff.
   */
  weightGrams: number;

  /**
   * Packed carton dimensions in centimetres.
   *
   * Couriers bill whichever is greater, actual or volumetric weight, and
   * volumetric is derived entirely from these three numbers. A tall light box
   * can cost more than a small heavy one, so getting these wrong quietly erodes
   * margin on every parcel rather than failing loudly once.
   *
   * TODO — measured estimates, not verified. Confirm against real packed
   * cartons before launch; the same figures go into Shiprocket's SKU master.
   */
  dimensionsCm: { length: number; width: number; height: number };

  variants: Variant[];
};

/** A catalog item with its imagery resolved. Browser-side only. */
export type Product = CatalogItem & {
  image?: string;

  /**
   * Small flat image for cart lines. Required even for `live` products: a bag
   * with three items must not stand up three WebGL contexts to draw three
   * 64px thumbnails, and browsers cap concurrent contexts anyway — the cart is
   * exactly where that limit gets hit and the hero canvas goes black.
   */
  thumb: string;

  /**
   * Which kind of picture this is, because the two want opposite treatment in
   * the same box: a `pack` shot is lit photography that fills its own frame and
   * is cropped to fill; a `cutout` floats on white and is fitted inside, or the
   * cap gets sliced off. See `.card__media img` in `components.css`.
   */
  shot: 'pack' | 'cutout';
};

/**
 * What actually persists. Keep this type boring — every field added here is a
 * field that can go stale in someone's localStorage and has to be migrated.
 */
export type CartLine = {
  sku: string;
  qty: number;
};

export type Cart = {
  lines: CartLine[];
};

/** A cart line joined back to its catalog entry, ready to render. */
export type ResolvedLine = {
  product: Product;
  variant: Variant;
  qty: number;
  lineTotalMinor: Money;
};

export type ResolvedCart = {
  lines: ResolvedLine[];
  /** Total units, not total lines — this is what the bag badge shows. */
  itemCount: number;
  subtotalMinor: Money;
  currency: Currency;
  /** Drives the free-shipping threshold copy in the drawer. */
  totalWeightGrams: number;
};
