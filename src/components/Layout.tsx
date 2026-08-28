import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { m } from 'framer-motion';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { formatMoney } from '../commerce/money';
import { FREE_SHIPPING_THRESHOLD_MINOR } from '../commerce/policy';
import { OFFER } from '../data/catalog';

/**
 * The page chrome, extracted once there was more than one page.
 *
 * The threshold in the announce bar comes from the same constant the drawer
 * nudges against, so the header can never promise what the bag won't honour.
 */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      {/*
        The offer REPLACES the brand claims rather than joining them.
        `.announce` is a fixed-height grid, so a longer string does not push the
        bar taller — it wraps inside it and spills over the navigation. At phone
        widths the original line already fills two rows, and the two claims that
        give way here ("professional base makeup", "formulated in the USA")
        appear again further down every page, whereas the offer does not appear
        anywhere else and expires.

        Both branches are conditional on `OFFER.active`, so ending the sale
        restores the old line in the same edit that restores the prices.
      */}
      <p className="announce">
        {OFFER.active ? (
          /*
            Separators sit at the END of the segment they follow, never at the
            start of the next one. At phone widths this line wraps, and written
            the other way round the second line began with a bare "·" — a
            dangling separator reads as a typo rather than as punctuation.
          */
          <>
            <strong className="announce__offer">
              {OFFER.label} · {Math.round(OFFER.rate * 100)}% off ·
            </strong>{' '}
            {OFFER.terms} · Free shipping over{' '}
            {formatMoney(FREE_SHIPPING_THRESHOLD_MINOR)}
          </>
        ) : (
          <>
            Free shipping over {formatMoney(FREE_SHIPPING_THRESHOLD_MINOR)} · Professional
            base makeup · Formulated in the USA
          </>
        )}
      </p>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </m.div>
  );
}

/**
 * React Router keeps the scroll position across navigations, which is correct
 * for back/forward and wrong for everything else — following a link into a
 * product and landing halfway down its page reads as a broken site.
 *
 * `history.scrollRestoration` handles the back/forward half natively, so this
 * only overrides PUSH. REPLACE is left alone too: it is what a filter or a
 * shade change uses to rewrite the URL in place, and yanking the page to the
 * top mid-interaction is worse than doing nothing.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (window.history.state?.idx !== undefined && window.history.state.idx > 0) {
      // A real navigation. `instant` rather than the CSS `smooth` on <html>,
      // which would otherwise animate a full page-height scroll on every click.
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pathname]);

  return null;
}
