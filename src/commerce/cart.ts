import { productBySku } from '../data/products';
import { CURRENCY } from './money';
import { MAX_QTY_PER_LINE } from './policy';
import type { Cart, CartLine, ResolvedCart } from './types';

/**
 * Cart logic as pure functions over plain data — no React, no storage, no
 * side effects. The provider in `CartProvider.tsx` is a thin shell around this.
 *
 * Keeping the rules here rather than inside a hook means they can be reasoned
 * about (and tested) without mounting anything, which matters because this is
 * the one part of a storefront where a subtle bug costs money rather than
 * looking wrong.
 */

export const EMPTY_CART: Cart = { lines: [] };

export type CartAction =
  | { type: 'add'; sku: string; qty?: number }
  | { type: 'setQty'; sku: string; qty: number }
  | { type: 'remove'; sku: string }
  | { type: 'clear' }
  | { type: 'hydrate'; cart: Cart };

const clampQty = (qty: number) =>
  Math.max(0, Math.min(MAX_QTY_PER_LINE, Math.floor(qty)));

export function cartReducer(state: Cart, action: CartAction): Cart {
  switch (action.type) {
    case 'add': {
      const existing = state.lines.find((line) => line.sku === action.sku);
      const nextQty = clampQty((existing?.qty ?? 0) + (action.qty ?? 1));

      // Adding to a line already at the cap is a no-op that must still return
      // the *same* state object, or every "Add" click past 10 re-renders the
      // drawer and re-fires the open animation for no visible reason.
      if (existing && nextQty === existing.qty) return state;

      if (existing) {
        return {
          lines: state.lines.map((line) =>
            line.sku === action.sku ? { ...line, qty: nextQty } : line,
          ),
        };
      }
      // New lines append. Sorting the cart by anything other than insertion
      // order makes items appear to jump when a quantity changes.
      return { lines: [...state.lines, { sku: action.sku, qty: nextQty }] };
    }

    case 'setQty': {
      const qty = clampQty(action.qty);
      // Setting a line to zero is how the stepper's "−" reaches removal, so it
      // has to mean remove rather than leaving a zero-quantity ghost line.
      if (qty === 0) return cartReducer(state, { type: 'remove', sku: action.sku });
      return {
        lines: state.lines.map((line) =>
          line.sku === action.sku ? { ...line, qty } : line,
        ),
      };
    }

    case 'remove':
      return { lines: state.lines.filter((line) => line.sku !== action.sku) };

    case 'clear':
      return EMPTY_CART;

    case 'hydrate':
      return action.cart;
  }
}

/**
 * Joins the stored lines back to the catalog.
 *
 * Lines whose SKU no longer exists are dropped rather than rendered as a
 * placeholder. A buyer cannot act on a shade that isn't for sale any more, so
 * showing them "this item is no longer available" in the bag is a dead end that
 * only invites them to abandon; the honest behaviour is that it quietly isn't
 * there. Out-of-stock is different — that variant still exists and is surfaced.
 */
export function resolveCart(cart: Cart): ResolvedCart {
  const lines = cart.lines.flatMap((line) => {
    const entry = productBySku(line.sku);
    if (!entry) return [];
    return [{
      product: entry.product,
      variant: entry.variant,
      qty: line.qty,
      lineTotalMinor: entry.product.priceMinor * line.qty,
    }];
  });

  return {
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.qty, 0),
    subtotalMinor: lines.reduce((sum, line) => sum + line.lineTotalMinor, 0),
    currency: CURRENCY,
    totalWeightGrams: lines.reduce(
      (sum, line) => sum + line.product.weightGrams * line.qty,
      0,
    ),
  };
}

/**
 * Anything read back from localStorage is untrusted input: it may have been
 * written by an older build with a different shape, or edited by hand.
 *
 * Quantities are clamped rather than rejected, unknown SKUs are dropped here as
 * well as at resolve time, and duplicate lines for one SKU are merged — an old
 * build that appended instead of merging would otherwise leave a cart that
 * shows the same product twice and can never be reduced to one line.
 */
export function parseStoredCart(raw: unknown): Cart {
  if (typeof raw !== 'object' || raw === null) return EMPTY_CART;
  const lines = (raw as { lines?: unknown }).lines;
  if (!Array.isArray(lines)) return EMPTY_CART;

  const merged = new Map<string, number>();
  for (const entry of lines) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { sku, qty } = entry as Partial<CartLine>;
    if (typeof sku !== 'string' || typeof qty !== 'number') continue;
    if (!Number.isFinite(qty) || !productBySku(sku)) continue;

    const next = clampQty((merged.get(sku) ?? 0) + qty);
    if (next > 0) merged.set(sku, next);
  }

  return { lines: [...merged].map(([sku, qty]) => ({ sku, qty })) };
}
