import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { EMPTY_CART, cartReducer, parseStoredCart, resolveCart } from './cart';
import { analytics } from './analytics';
import { productBySku } from '../data/products';
import { CURRENCY } from './money';
import type { ResolvedCart } from './types';

/**
 * Versioned, because the key is the migration boundary. If the stored shape
 * ever changes incompatibly, bumping this abandons every old cart instead of
 * feeding a shape the parser doesn't expect — cheaper and safer than writing a
 * migration for data whose worst-case loss is a few items in a bag.
 */
const STORAGE_KEY = 'chullan.cart.v1';

type CartContextValue = {
  cart: ResolvedCart;
  add: (sku: string, qty?: number) => void;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  clear: () => void;

  isOpen: boolean;
  open: () => void;
  close: () => void;

  /**
   * Whether the bag has been read back from storage yet.
   *
   * Consumers that *write* to the cart on mount have to wait for this. React
   * runs child effects before parent ones, so an order-confirmation screen that
   * clears the bag on mount is undone a moment later when this provider's own
   * hydration effect reads the old contents back out of localStorage — the cart
   * empties and then refills, and the buyer is left holding what they just paid
   * for.
   */
  isHydrated: boolean;

  /**
   * SKU of the most recent add, cleared on a timer. Drives the transient
   * "Added" state on the card button — kept here rather than in the card so it
   * survives the card unmounting and so only one can be active at a time.
   */
  lastAdded: string | null;
};

const CartContext = createContext<CartContextValue | null>(null);

const ADDED_FLASH_MS = 1400;

/**
 * localStorage throws rather than returning null in two ordinary cases: Safari
 * private browsing, and a browser configured to block site data. Neither is an
 * error worth surfacing to a buyer — the cart just stops surviving reloads —
 * so both reads and writes are wrapped and swallowed.
 */
function readStoredCart() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? parseStoredCart(JSON.parse(raw)) : EMPTY_CART;
  } catch {
    return EMPTY_CART;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, EMPTY_CART);
  const [isOpen, setIsOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  /**
   * Hydration happens in an effect rather than in `useReducer`'s lazy
   * initialiser so the first render is identical on server and client. The app
   * is a pure SPA today, but a cart that reads storage during render is exactly
   * the thing that breaks the day anyone tries to prerender this page — and it
   * fails as a hydration mismatch, which is a miserable bug to trace back here.
   */
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredCart();
    if (stored.lines.length > 0) dispatch({ type: 'hydrate', cart: stored });
    setIsHydrated(true);
  }, []);

  const hydrated = useRef(false);
  useEffect(() => {
    // Skip the first pass, or the empty initial state overwrites stored lines
    // before the hydration effect above has had a chance to read them.
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Storage unavailable — the cart still works for this session.
    }
  }, [cart]);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const add = useCallback((sku: string, qty = 1) => {
    dispatch({ type: 'add', sku, qty });
    setLastAdded(sku);
    // Restart rather than stack, so adding a second item doesn't cancel its own
    // flash early because the first item's timer is still pending.
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setLastAdded(null), ADDED_FLASH_MS);

    // Reports the quantity *added*, not the new line total — that is what the
    // GA4 event means, and reporting the total would double-count a second add.
    const entry = productBySku(sku);
    if (entry) {
      analytics.addToCart(
        {
          product: entry.product,
          variant: entry.variant,
          qty,
          lineTotalMinor: entry.product.priceMinor * qty,
        },
        CURRENCY,
      );
    }
  }, []);

  const setQty = useCallback((sku: string, qty: number) => {
    dispatch({ type: 'setQty', sku, qty });
  }, []);

  /** The cart joined to the catalog — everything the UI and analytics read. */
  const resolved = useMemo(() => resolveCart(cart), [cart]);

  const remove = useCallback(
    (sku: string) => {
      // Read before the dispatch: afterwards the line is gone and there is no
      // price left to report.
      const line = resolved.lines.find((candidate) => candidate.variant.sku === sku);
      if (line) analytics.removeFromCart(line, CURRENCY);
      dispatch({ type: 'remove', sku });
    },
    [resolved],
  );

  const clear = useCallback(() => dispatch({ type: 'clear' }), []);
  const close = useCallback(() => setIsOpen(false), []);

  const open = useCallback(() => {
    setIsOpen(true);
    analytics.viewCart(resolved);
  }, [resolved]);

  const value = useMemo(
    () => ({
      cart: resolved, add, setQty, remove, clear,
      isOpen, open, close, lastAdded, isHydrated,
    }),
    [resolved, add, setQty, remove, clear, isOpen, open, close, lastAdded, isHydrated],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}
