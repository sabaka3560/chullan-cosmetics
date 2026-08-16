import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { Minus, Plus, X } from 'lucide-react';
import { useCart } from '../commerce/CartProvider';
import { formatMoney } from '../commerce/money';
import { FREE_SHIPPING_THRESHOLD_MINOR } from '../commerce/policy';
import { CheckoutNotConnectedError, beginCheckout, checkoutProvider } from '../commerce/checkout';
import { analytics } from '../commerce/analytics';
import { DeliveryCheck } from './DeliveryCheck';
import { DUR, EASE } from '../motion/tokens';

/**
 * The bag.
 *
 * This is the last screen we own. Everything after the checkout button belongs
 * to the provider, so the work this panel has to do is narrow and worth doing
 * properly: show exactly what is being bought, make quantity trivial to change,
 * and never lose the cart.
 *
 * Deliberately a drawer rather than a route. A cart page costs a navigation in
 * each direction and drops the buyer out of the page they were browsing; the
 * panel keeps the product row underneath it, which is the thing that earns the
 * second item.
 */

const SELECTORS = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

export function CartDrawer() {
  const { cart, isOpen, close, setQty, remove } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A stale error from a previous visit reading as a fresh failure is worse
  // than no message at all.
  useEffect(() => {
    if (!isOpen) setError(null);
  }, [isOpen]);

  /**
   * Scroll lock, focus capture and Escape all hang off `isOpen` in one effect
   * so they cannot get out of step — the classic version of this bug is a
   * drawer that closes while the body is still locked.
   */
  useEffect(() => {
    if (!isOpen) return;

    const returnFocusTo = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Focus the panel itself rather than the close button: a screen reader
    // lands on the heading and hears what opened, instead of hearing "Close".
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      // Without this, Tab walks straight out of the drawer and into the page
      // behind it, which is still rendered and still focusable.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(SELECTORS);
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      returnFocusTo?.focus();
    };
  }, [isOpen, close]);

  const onCheckout = async () => {
    setPending(true);
    setError(null);

    // Before the handoff, deliberately. A redirect never comes back to run
    // this, so firing it afterwards would lose every successful checkout —
    // exactly the ones that matter. The cost is that an abandoned handoff also
    // counts, which is the right trade: an over-counted numerator is visible in
    // the data, a missing one is not.
    analytics.beginCheckout(cart, checkoutProvider.id);

    try {
      await beginCheckout(cart);
    } catch (cause) {
      setError(
        cause instanceof CheckoutNotConnectedError
          ? 'Checkout isn’t connected yet.'
          : 'Something went wrong. Your bag is safe — try again.',
      );
    } finally {
      setPending(false);
    }
  };

  const remaining = FREE_SHIPPING_THRESHOLD_MINOR - cart.subtotalMinor;
  const isEmpty = cart.lines.length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="drawer" role="dialog" aria-modal="true" aria-label="Your bag">
          <m.button
            type="button"
            className="drawer__scrim"
            aria-label="Close bag"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.micro, ease: 'linear' }}
            onClick={close}
          />

          <m.div
            ref={panelRef}
            tabIndex={-1}
            className="drawer__panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: DUR.hover, ease: EASE.entrance }}
          >
            <header className="drawer__head">
              <p className="eyebrow">
                Your bag
                {cart.itemCount > 0 && <span className="drawer__count">({cart.itemCount})</span>}
              </p>
              <button type="button" className="drawer__close" onClick={close} aria-label="Close bag">
                <X size={18} strokeWidth={1.6} />
              </button>
            </header>

            {isEmpty ? (
              <div className="drawer__empty">
                <p className="h3">Nothing here yet.</p>
                <p className="drawer__empty-note">
                  Everything in the range ships free over {formatMoney(FREE_SHIPPING_THRESHOLD_MINOR)}.
                </p>
                <button type="button" className="btn btn--sm btn--secondary" onClick={close}>
                  Keep looking
                </button>
              </div>
            ) : (
              <>
                <ul className="drawer__lines">
                  {cart.lines.map(({ product, variant, qty, lineTotalMinor }) => (
                    <li key={variant.sku} className="line">
                      <img
                        className="line__thumb"
                        src={product.thumb}
                        alt=""
                        width={128}
                        height={160}
                        loading="lazy"
                        decoding="async"
                      />

                      <div className="line__body">
                        <h3 className="line__name">{product.name}</h3>
                        {/* Only worth a line of its own when there was a choice. */}
                        {product.variants.length > 1 && (
                          <p className="line__variant">{variant.label}</p>
                        )}
                        <p className="line__size">{product.size}</p>

                        <div className="line__controls">
                          <div className="stepper">
                            <button
                              type="button"
                              onClick={() => setQty(variant.sku, qty - 1)}
                              aria-label={`Reduce ${product.name} quantity`}
                            >
                              <Minus size={13} strokeWidth={2} />
                            </button>
                            {/* aria-live so the change is announced without
                                moving focus off the button being pressed. */}
                            <span aria-live="polite">{qty}</span>
                            <button
                              type="button"
                              onClick={() => setQty(variant.sku, qty + 1)}
                              aria-label={`Increase ${product.name} quantity`}
                            >
                              <Plus size={13} strokeWidth={2} />
                            </button>
                          </div>

                          <button
                            type="button"
                            className="line__remove"
                            onClick={() => remove(variant.sku)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <span className="line__price">{formatMoney(lineTotalMinor)}</span>
                    </li>
                  ))}
                </ul>

                <footer className="drawer__foot">
                  <DeliveryCheck weightGrams={cart.totalWeightGrams} />

                  {remaining > 0 ? (
                    <p className="drawer__ship">
                      {formatMoney(remaining)} away from free shipping
                    </p>
                  ) : (
                    <p className="drawer__ship drawer__ship--met">Free shipping unlocked</p>
                  )}

                  <div className="drawer__total">
                    <span className="eyebrow">Subtotal</span>
                    <span className="drawer__total-value">{formatMoney(cart.subtotalMinor)}</span>
                  </div>

                  <p className="drawer__note">
                    Shipping and taxes are calculated at checkout.
                  </p>

                  {error && (
                    <p className="drawer__error" role="alert">
                      {error}
                    </p>
                  )}

                  <button
                    type="button"
                    className="btn btn--primary drawer__checkout"
                    onClick={onCheckout}
                    disabled={pending}
                  >
                    {pending ? 'One moment…' : 'Checkout'}
                  </button>
                </footer>
              </>
            )}
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
