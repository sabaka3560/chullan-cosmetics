import { useEffect, useRef } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { products } from '../data/products';
import { policies } from '../data/policies';
import { DUR, EASE } from '../motion/tokens';

/**
 * The mobile navigation.
 *
 * It exists because below 720px the nav links are hidden and the burger that
 * replaced them did nothing — every route added in this build (`/shop`, the
 * product pages, all four policy pages) was unreachable on a phone except by
 * scrolling to the footer. On a storefront where most traffic is mobile, that
 * is the whole site being broken, not a missing nicety.
 *
 * Links are generated from the catalog and the policy list rather than typed
 * out, so a new SKU or policy cannot go missing from mobile navigation while
 * still appearing in the footer.
 */

const SELECTORS = 'a[href], button:not([disabled])';

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  // Navigating from inside the menu must close it. Without this the panel
  // stays open over the page it just navigated to, which reads as a dead tap.
  useEffect(() => {
    onClose();
    // Intentionally keyed on pathname only: `onClose` is stable, and including
    // it would re-fire this on every parent render and close the menu instantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const returnFocusTo = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

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
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="menu" role="dialog" aria-modal="true" aria-label="Menu">
          <m.button
            type="button"
            className="menu__scrim"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.micro, ease: 'linear' }}
            onClick={onClose}
          />

          <m.div
            ref={panelRef}
            tabIndex={-1}
            className="menu__panel on-dark"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: DUR.hover, ease: EASE.entrance }}
          >
            <div className="menu__head">
              <span className="wordmark menu__mark">Chullan</span>
              <button
                type="button"
                className="menu__close"
                onClick={onClose}
                aria-label="Close menu"
              >
                <X size={20} strokeWidth={1.6} />
              </button>
            </div>

            <nav className="menu__nav" aria-label="Main">
              <Link className="menu__primary" to="/shop">
                The Range
              </Link>

              <p className="eyebrow menu__label">Products</p>
              <ul className="menu__list">
                {products.map((product) => (
                  <li key={product.id}>
                    <Link to={`/product/${product.id}`}>{product.name}</Link>
                  </li>
                ))}
              </ul>

              <p className="eyebrow menu__label">Support</p>
              <ul className="menu__list">
                {policies.map((policy) => (
                  <li key={policy.slug}>
                    <Link to={`/${policy.slug}`}>{policy.title}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
