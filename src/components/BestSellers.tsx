import { m } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { Reveal, revealChild, revealGroup } from './Reveal';
import { VIEWPORT } from '../motion/tokens';
import { products } from '../data/products';

export function BestSellers() {
  return (
    <section className="section section--bone" id="bestsellers">
      <div className="shell">
        <Reveal className="section-head" as="header">
          <div>
            <p className="eyebrow eyebrow--rule">Shop the range</p>
            <h2 className="h2 section-head__title">Best Sellers</h2>
          </div>
          <a className="btn--ghost" href="#">
            Shop all
            <ArrowRight className="icon" size={15} strokeWidth={2} />
          </a>
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
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}

          <m.a variants={revealChild} className="tile" href="#">
            <span className="eyebrow">The full range</span>
            <div>
              <span className="tile__count">12</span>
              <p className="card__size" style={{ marginTop: 14 }}>Products</p>
            </div>
            <span className="btn--ghost" style={{ color: 'inherit' }}>
              Shop all
              <ArrowRight className="tile__arrow" size={15} strokeWidth={2} />
            </span>
          </m.a>
        </m.div>
      </div>
    </section>
  );
}
