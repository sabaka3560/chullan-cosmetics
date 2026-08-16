import { useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { Layout } from '../components/Layout';
import { ProductCard } from '../components/ProductCard';
import { Reveal, revealGroup } from '../components/Reveal';
import { VIEWPORT } from '../motion/tokens';
import { products } from '../data/products';

/**
 * The full range.
 *
 * Filtering is client-side and stays that way at this size: eight products fit
 * in one payload, so a server round trip per filter would add latency to an
 * operation that is currently instant. The moment the catalog needs pagination
 * this becomes a query, and the component shape barely changes.
 *
 * Categories are derived rather than declared. A hand-maintained filter list is
 * the same bug as a hand-maintained product count — it goes stale the first
 * time a SKU lands in a category nobody thought to add.
 */
const ALL = 'All';

export default function Shop() {
  const [active, setActive] = useState(ALL);

  const categories = useMemo(
    () => [ALL, ...new Set(products.map((product) => product.category))],
    [],
  );

  const visible = useMemo(
    () => (active === ALL ? products : products.filter((p) => p.category === active)),
    [active],
  );

  return (
    <Layout>
      <section className="section section--bone range">
        <div className="shell">
          <Reveal className="section-head" as="header">
            <div>
              <p className="eyebrow eyebrow--rule">Everything we make</p>
              <h1 className="h2 section-head__title">The Range</h1>
            </div>
            <p className="range__count mono">
              {visible.length} of {products.length}
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="filters" role="group" aria-label="Filter by category">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className="filter"
                  data-active={category === active}
                  aria-pressed={category === active}
                  onClick={() => setActive(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </Reveal>

          {/*
            Keyed on the active filter so the grid remounts and re-runs its
            stagger when the set changes. Without the key React reuses the
            existing cards, the variants never replay, and swapping filters
            silently swaps content with no motion at all.
          */}
          <m.div
            key={active}
            className="product-grid product-grid--range"
            variants={revealGroup}
            initial="hidden"
            animate="show"
            viewport={VIEWPORT}
          >
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </m.div>
        </div>
      </section>
    </Layout>
  );
}
