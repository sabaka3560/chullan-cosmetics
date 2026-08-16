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

  inStock: boolean;
};

export type Product = {
  /** URL slug and React key. User-facing, so it reads as words. */
  id: string;

  name: string;
  line: ProductLine;
  category: string;

  /** Display copy for the size line — not a parseable quantity. */
  size: string;

  /** One sentence, taken from the pack copy. */
  blurb: string;

  /** All shades of one product share a price in this range. */
  priceMinor: Money;
  /** Set only when there is a genuine former price to strike through. */
  compareAtMinor?: Money;

  rating: number;
  reviews: number;

  image?: string;
  /** Rendered live in WebGL instead of shipped as a photograph. */
  live?: boolean;

  /**
   * Small flat image for cart lines. Required even for `live` products: a bag
   * with three items must not stand up three WebGL contexts to draw three
   * 64px thumbnails, and browsers cap concurrent contexts anyway — the cart is
   * exactly where that limit gets hit and the hero canvas goes black.
   */
  thumb: string;

  /**
   * Packed shipping weight in grams, carton included — not the net fill weight
   * on the label. A 30ml bottle is 30g of product and about 140g of glass,
   * pump, carton and filler, and couriers bill the second number.
   *
   * Shiprocket bills off its own SKU record rather than this field. The copy
   * lives here so the cart can show a delivery estimate before handoff, which
   * is a pre-checkout concern and therefore ours. Treat the panel as the
   * source of truth if the two ever disagree.
   */
  weightGrams: number;

  variants: Variant[];
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
