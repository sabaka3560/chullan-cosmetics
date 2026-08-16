import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { formatMoney } from '../commerce/money';
import { FREE_SHIPPING_THRESHOLD_MINOR } from '../commerce/policy';

/**
 * The page chrome, extracted once there was more than one page.
 *
 * The threshold in the announce bar comes from the same constant the drawer
 * nudges against, so the header can never promise what the bag won't honour.
 */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <p className="announce">
        Free shipping over {formatMoney(FREE_SHIPPING_THRESHOLD_MINOR)} · 30-day returns
      </p>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
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
