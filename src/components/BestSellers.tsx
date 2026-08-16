import { m } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductCard } from './ProductCard';
import { Reveal, revealChild, revealGroup } from './Reveal';
import { VIEWPORT } from '../motion/tokens';
import { bestSellers, products } from '../data/products';

/**
 * Created once at module scope, never inline in the render. `m.create` returns a
 * new component type on every call, so building it during render would give
 * React a different type each pass and remount the tile — losing its animation
 * state and re-running the reveal on every parent update.
 */
const MotionLink = m.create(Link);

export function BestSellers() {
  return (
    <section className="section section--bone" id="bestsellers">
      <div className="shell">
        <Reveal className="section-head" as="header">
          <div>
            <p className="eyebrow eyebrow--rule">Shop the range</p>
            <h2 className="h2 section-head__title">Best Sellers</h2>
          </div>
          <Link className="btn--ghost" to="/shop">
            Shop all
            <ArrowRight className="icon" size={15} strokeWidth={2} />
          </Link>
        </Reveal>

        {/*
          `whileInView` and `initial` live on the grid; the children carry only
          `variants`. The moment a child declares its own `whileInView` it
          triggers off its own observer and the parent's stagger stops applying
          — the animation still runs, which is why the bug is easy to miss.
        */}
        <m.div
          className="product-grid"
          variants={revealGroup}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
        >
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}

          <MotionLink variants={revealChild} className="tile" to="/shop">
            <span className="eyebrow">The full range</span>
            <div>
              {/* Read off the catalog — a hand-typed count goes stale the first
                  time a SKU is added and nobody thinks to edit the tile. */}
              <span className="tile__count">{products.length}</span>
              <p className="card__size" style={{ marginTop: 14 }}>Products</p>
            </div>
            <span className="btn--ghost" style={{ color: 'inherit' }}>
              Shop all
              <ArrowRight className="tile__arrow" size={15} strokeWidth={2} />
            </span>
          </MotionLink>
        </m.div>
      </div>
    </section>
  );
}
