import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Product from './pages/Product';
import Policy from './pages/Policy';
import NotFound from './pages/NotFound';
import { CartProvider } from './commerce/CartProvider';
import { CartDrawer } from './components/CartDrawer';
import { ScrollToTop } from './components/Layout';
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
export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {/* The provider wraps the router, not a page: the bag has to survive
          navigation, and the drawer has to be mountable from any route. */}
      <CartProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<Product />} />
          {/* Enumerated rather than a `/:slug` catch-all, which would sit above
              the 404 route and turn every mistyped URL into a policy page. */}
          {policies.map((policy) => (
            <Route
              key={policy.slug}
              path={`/${policy.slug}`}
              element={<Policy slug={policy.slug} />}
            />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <CartDrawer />
      </CartProvider>
    </BrowserRouter>
  );
}
