import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Product from './pages/Product';
import About from './pages/About';
import Policy from './pages/Policy';
import NotFound from './pages/NotFound';
import OrderConfirmed from './pages/OrderConfirmed';
import Checkout from './pages/Checkout';
import Placeholder from './pages/Placeholder';
import Ingredients from './pages/Ingredients';
import { CartProvider } from './commerce/CartProvider';
import { CartDrawer } from './components/CartDrawer';
import { ScrollToTop } from './components/Layout';
import { Loader } from './components/Loader';
import { policies } from './data/policies';

/**
 * `basename` is taken from Vite's BASE_URL so the router keeps working when the
 * build is served from a sub-path (GitHub Pages, a /shop mount) rather than the
 * domain root. The catch-all keeps a deep link from rendering a blank document.
 *
 * The policy routes are flat (`/shipping`, not `/policies/shipping`) because
 * they get handed to third parties — Shiprocket's onboarding and the payment
 * gateway's KYC both ask for these URLs, and a short one survives being retyped
 * into a form.
 */
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/about" element={<About />} />
        <Route path="/product/:id" element={<Product />} />
        {policies.map((policy) => (
          <Route
            key={policy.slug}
            path={`/${policy.slug}`}
            element={<Policy slug={policy.slug} />}
          />
        ))}
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmed" element={<OrderConfirmed />} />
        <Route path="/gift-cards" element={<Placeholder title="Gift Cards" />} />
        <Route path="/shade-finder" element={<Placeholder title="Shade Finder" />} />
        <Route path="/ingredients" element={<Ingredients />} />
        <Route path="/sustainability" element={<Placeholder title="Sustainability" />} />
        <Route path="/stockists" element={<Placeholder title="Stockists" />} />
        <Route path="/reviews" element={<Placeholder title="All Reviews" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

const INTRO_KEY = 'chullan.intro';

/**
 * Whether to play the intro at all.
 *
 * Once per session, and never for someone who has asked for reduced motion.
 * Read lazily in `useState` rather than in an effect so the first render is
 * already correct — deciding after mount would flash the overlay for one frame
 * on every navigation that should have skipped it.
 *
 * sessionStorage throws rather than returning null in Safari private browsing,
 * so a failure falls back to playing the intro: a repeated animation is a much
 * smaller problem than a blank screen.
 */
function shouldPlayIntro() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    return window.sessionStorage.getItem(INTRO_KEY) !== 'seen';
  } catch {
    return true;
  }
}

export default function App() {
  const [showIntro, setShowIntro] = useState(shouldPlayIntro);

  /**
   * Stable, so the sequence inside `Loader` cannot be restarted by a parent
   * re-render — it sits in that effect's dependency array.
   */
  const dismissIntro = useCallback(() => {
    try {
      window.sessionStorage.setItem(INTRO_KEY, 'seen');
    } catch {
      // Storage unavailable; the intro simply plays again next navigation.
    }
    setShowIntro(false);
  }, []);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {/* The provider wraps the router, not a page: the bag has to survive
          navigation, and the drawer has to be mountable from any route. */}
      <CartProvider>
        <ScrollToTop />
        {/*
          The routes render unconditionally, with the intro laid over the top.

          Gating them behind `loading` meant no route existed until the sequence
          finished: the load event fired at ~250ms and the screen stayed black
          for another 4.5s, on every page load including deep links. Overlaying
          instead is visually identical and lets content paint immediately.
        */}
        <AnimatedRoutes />
        <CartDrawer />
        {showIntro && <Loader onComplete={dismissIntro} />}
      </CartProvider>
    </BrowserRouter>
  );
}
