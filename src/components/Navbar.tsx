import { useState } from 'react';
import { useMotionValueEvent, useScroll } from 'framer-motion';
import { Menu, ShoppingBag } from 'lucide-react';

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

  useMotionValueEvent(scrollY, 'change', (y) => {
    // Hysteresis: without the two thresholds the nav strobes when someone
    // rests the page exactly on the boundary.
    setSolid((prev) => (prev ? y > CLEAR_AT : y > SOLID_AT));
  });

  return (
    <header className="nav" data-state={solid ? 'solid' : 'clear'}>
      <div className="shell nav__inner">
        <div className="nav__group nav__group--start">
          <button className="nav__burger" aria-label="Open menu">
            <Menu size={20} strokeWidth={1.6} />
          </button>
          <a className="nav__link" href="#bestsellers">Shop</a>
          <a className="nav__link" href="#detail">The Object</a>
          <a className="nav__link" href="#story">Story</a>
        </div>

        <a className="nav__wordmark" href="/" aria-label="Chullan, home">Chullan</a>

        <div className="nav__group nav__group--end">
          <a className="nav__link" href="#">Account</a>
          <button className="nav__bag" aria-label="Bag, 0 items">
            <ShoppingBag size={18} strokeWidth={1.6} />
            Bag
            <span className="nav__count">(0)</span>
          </button>
        </div>
      </div>
    </header>
  );
}
