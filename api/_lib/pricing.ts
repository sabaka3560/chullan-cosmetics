import { catalogBySku } from '../../src/data/catalog';
import type { CatalogItem, Variant } from '../../src/commerce/types';

/**
 * Prices a cart on the server.
 *
 * This is the reason the backend exists at all. The browser sends what the
 * buyer chose — SKUs and quantities — and never what it costs. Every amount is
 * recomputed here from the catalog before anything is signed or handed to a
 * payment provider.
 *
 * The rule is not "validate the client's prices", it is "never receive them".
 * Validation invites the question of what to do when they disagree, and every
 * answer to that question is a bug. A request that cannot express a price
 * cannot express a wrong one.
 *
 * It imports the same `catalog.ts` the storefront renders from, so the figure
 * on the product card and the figure in the payment request are the same
 * expression evaluated twice, not two numbers maintained in parallel.
 */

/** Matches the client-side cap in `src/commerce/policy.ts`. */
const MAX_QTY_PER_LINE = 10;
/** A bag larger than this is a script, not a shopper. */
const MAX_LINES = 20;

export type IncomingLine = { sku: string; qty: number };

export type PricedLine = {
  sku: string;
  name: string;
  variantLabel: string;
  qty: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  weightGrams: number;
};

export type PricedCart = {
  lines: PricedLine[];
  itemCount: number;
  subtotalMinor: number;
  totalWeightGrams: number;
  currency: 'INR' | 'USD';
};

export class InvalidCartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCartError';
  }
}

/**
 * Parses untrusted request input into cart lines.
 *
 * Everything arriving here came off the public internet, so nothing is assumed:
 * not that the body is an object, not that `lines` is an array, not that a
 * quantity is a whole number. Duplicate SKUs are merged rather than rejected,
 * because a client that appends instead of merging is a client bug, not an
 * attack, and failing the buyer's checkout over it helps nobody.
 */
export function parseLines(body: unknown): IncomingLine[] {
  if (typeof body !== 'object' || body === null) {
    throw new InvalidCartError('Body must be an object');
  }
  const raw = (body as { lines?: unknown }).lines;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new InvalidCartError('Body must include a non-empty lines array');
  }
  if (raw.length > MAX_LINES) {
    throw new InvalidCartError('Too many lines');
  }

  const merged = new Map<string, number>();
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { sku, qty } = entry as Partial<IncomingLine>;
    if (typeof sku !== 'string' || !sku) continue;
    if (typeof qty !== 'number' || !Number.isFinite(qty)) continue;

    const next = Math.min(MAX_QTY_PER_LINE, Math.floor((merged.get(sku) ?? 0) + qty));
    if (next > 0) merged.set(sku, next);
  }

  if (merged.size === 0) throw new InvalidCartError('No valid lines');
  return [...merged].map(([sku, qty]) => ({ sku, qty }));
}

/**
 * Unknown or out-of-stock SKUs are rejected outright rather than dropped.
 *
 * The client drops unknown lines silently, which is right there — a retired
 * shade should just disappear from the bag. Here it is the opposite: charging
 * for a subset of what someone thought they were buying, without telling them,
 * is worse than refusing the request and letting the page re-sync.
 */
export function priceCart(lines: IncomingLine[]): PricedCart {
  const priced: PricedLine[] = lines.map((line) => {
    const entry = catalogBySku(line.sku);
    if (!entry) throw new InvalidCartError(`Unknown SKU: ${line.sku}`);
    if (!entry.variant.inStock) throw new InvalidCartError(`Out of stock: ${line.sku}`);

    const { product, variant }: { product: CatalogItem; variant: Variant } = entry;
    return {
      sku: variant.sku,
      name: product.name,
      variantLabel: variant.label,
      qty: line.qty,
      unitPriceMinor: product.priceMinor,
      lineTotalMinor: product.priceMinor * line.qty,
      weightGrams: product.weightGrams * line.qty,
    };
  });

  return {
    lines: priced,
    itemCount: priced.reduce((sum, l) => sum + l.qty, 0),
    subtotalMinor: priced.reduce((sum, l) => sum + l.lineTotalMinor, 0),
    totalWeightGrams: priced.reduce((sum, l) => sum + l.weightGrams, 0),
    // Mirrors CURRENCY in src/commerce/money.ts. Both must move together when
    // the storefront switches to INR.
    currency: 'USD',
  };
}
