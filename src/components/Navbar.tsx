import { useState } from 'react';
import { useMotionValueEvent, useScroll } from 'framer-motion';
import { Menu, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../commerce/CartProvider';
import { MobileMenu } from './MobileMenu';

const SOLID_AT = 24;
const CLEAR_AT = 8;

/**
 * Transparent over the dark hero, bone + blur once you're into the light half.
 *
 * State comes off framer's scroll motion value rather than a `window.scrollY`
 * read inside a scroll listener. That read is a forced synchronous layout,
 * fired outside the animation frame, right next to a live WebGL context — the
 * classic layout-thrash setup. `useScroll` shares one passive listener and
 * reports from inside Motion's batched frameloop instead.
 */
export function Navbar() {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { cart, open } = useCart();

  useMotionValueEvent(scrollY, 'change', (y) => {
    // Hysteresis: without the two thresholds the nav strobes when someone
    // rests the page exactly on the boundary.
    setSolid((prev) => (prev ? y > CLEAR_AT : y > SOLID_AT));
  });

  return (
    <>
    <header className="nav" data-state={solid ? 'solid' : 'clear'}>
      <div className="shell nav__inner">
        <div className="nav__group nav__group--start">
          <button
            className="nav__burger"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Menu size={20} strokeWidth={1.6} />
          </button>
          <Link className="nav__link" to="/shop">Shop</Link>
          <Link className="nav__link" to="/#detail">The Object</Link>
          <Link className="nav__link" to="/#story">Story</Link>
        </div>

        <Link className="nav__wordmark" to="/" aria-label="Chullan, home">Chullan</Link>

        <div className="nav__group nav__group--end">
          <Link className="nav__link" to="/shipping">Shipping</Link>
          <button
            className="nav__bag"
            onClick={open}
            aria-label={`Bag, ${cart.itemCount} ${cart.itemCount === 1 ? 'item' : 'items'}`}
          >
            <ShoppingBag size={18} strokeWidth={1.6} />
            Bag
            <span className="nav__count">({cart.itemCount})</span>
          </button>
        </div>
      </div>
    </header>

    <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
