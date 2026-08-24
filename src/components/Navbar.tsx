import { useState } from 'react';
import { useMotionValueEvent, useScroll } from 'framer-motion';
import { Menu, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../commerce/CartProvider';
import { MobileMenu } from './MobileMenu';
import logoBone from '../assets/logo-bone.png';
import logoInk from '../assets/logo-ink.png';

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
          <Link className="nav__link" to="/about">Story</Link>
        </div>

        {/*
          Two copies of the mark, stacked and cross-faded, rather than one image
          recoloured by a filter.

          The bar is transparent over the dark hero and bone once you scroll into
          the light half, so the logo has to be light in one state and dark in
          the other. The artwork is a single flat black, and `filter: invert()`
          would also invert the gold sweep that crosses the mark. Two tinted PNGs
          are 30kB each and let the swap ride the same 220ms/140ms curve the
          navigation's own colour change uses, so the mark and the links change
          together rather than racing.

          Both carry `alt=""`: the link already has an accessible name, and
          naming the image too would make a screen reader announce the brand
          twice for one control.
        */}
        <Link
          className="nav__wordmark"
          to="/"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Chullan, home"
        >
          <img
            className="nav__logo nav__logo--bone"
            src={logoBone}
            alt=""
            width={900}
            height={425}
            /* Above the fold on every route. A logo that fades in after the
               page has settled reads as a fault, not as a transition. */
            fetchPriority="high"
            decoding="sync"
          />
          <img
            className="nav__logo nav__logo--ink"
            src={logoInk}
            alt=""
            width={900}
            height={425}
            fetchPriority="high"
            decoding="sync"
          />
        </Link>

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
