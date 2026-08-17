import { Link } from 'react-router-dom';
import { products } from '../data/products';
import { policies } from '../data/policies';

/**
 * Every link here goes somewhere that exists.
 *
 * The previous columns advertised Gift Cards, a Shade Finder, Ingredients,
 * Sustainability and Stockists — five pages that were never built, all pointing
 * at `#`. A footer full of dead links costs more trust than a short one costs
 * in perceived range, and on a storefront it is also the place buyers go
 * looking for the returns policy before they order.
 */
const shopLinks = products.slice(0, 4).map((product) => ({
  label: product.name,
  to: `/product/${product.id}`,
}));

export function Footer() {
  return (
    <footer className="footer on-dark">
      <div className="shell">
        <div className="footer__grid">
          <div>
            <p className="h3" style={{ color: 'var(--void-ink)' }}>
              Handsome, inside and out.
            </p>
            <p className="footer__blurb">
              Premium cosmetics for the inherently handsome. Crafted with pure
              South Indian charm.
            </p>
          </div>

          <nav className="footer__col" aria-label="Shop">
            <h4>Shop</h4>
            <ul>
              {shopLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
              <li>
                <Link to="/shop">The full range</Link>
              </li>
            </ul>
          </nav>

          <nav className="footer__col" aria-label="Support">
            <h4>Support</h4>
            <ul>
              {policies.map((policy) => (
                <li key={policy.slug}>
                  <Link to={`/${policy.slug}`}>{policy.title}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="footer__col" aria-label="Explore">
            <h4>Explore</h4>
            <ul>
              <li><Link to="/gift-cards">Gift Cards</Link></li>
              <li><Link to="/shade-finder">Shade Finder</Link></li>
              <li><Link to="/ingredients">Ingredients</Link></li>
              <li><Link to="/sustainability">Sustainability</Link></li>
              <li><Link to="/stockists">Stockists</Link></li>
            </ul>
          </nav>
        </div>

        <div className="footer__bar">
          <span>© {new Date().getFullYear()} Chullan. All rights reserved.</span>
          <nav>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            {/* External, so it stays an anchor — and rel guards the opener. */}
            <a
              href="https://instagram.com/"
              target="_blank"
              rel="noreferrer noopener"
            >
              Instagram
            </a>
          </nav>
        </div>
      </div>

      {/* Oversized wordmark, bottom-cropped by the page edge. Full opacity —
          a ghosted version reads as timid. */}
      <div className="footer__mark" aria-hidden="true">
        <span>Chullan</span>
      </div>
    </footer>
  );
}
