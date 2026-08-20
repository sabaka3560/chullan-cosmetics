import { useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { Layout } from '../components/Layout';
import { ProductCard } from '../components/ProductCard';
import { Faq } from '../components/Faq';
import { Reveal, revealGroup } from '../components/Reveal';
import { VIEWPORT } from '../motion/tokens';
import { products, routine } from '../data/products';
import { SHOP_FAQ } from '../data/faq';
import { faqSchema, SITE_ORIGIN, useSeo } from '../seo/useSeo';

/**
 * The range.
 *
 * Written to the content brief's Products Page, which frames the eight products
 * as one sequence rather than a shelf: prep, protect, prime, correct, refine,
 * build, control, set. The process bar states that sequence and the grid below
 * is sorted into it, both from the same `step` field, so the strip cannot end
 * up labelling CORRECT above the concealer.
 *
 * Cards here carry the short tagline rather than the full description. Eight
 * paragraphs read as a wall; eight three-word lines read as a system.
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
  useSeo({
    title: 'Shop Professional Makeup | Chullan Cosmetics India',
    description:
      '8 professional makeup products formulated in the USA for Indian skin. Foundation, concealer, primer, powder, setting spray, moisturiser, and SPF 50 sunscreen.',
    canonical: `${SITE_ORIGIN}/shop`,
    jsonLd: [faqSchema(SHOP_FAQ)],
  });

  const [active, setActive] = useState(ALL);

  const categories = useMemo(
    () => [ALL, ...new Set(products.map((product) => product.category))],
    [],
  );

  const visible = useMemo(
    () => (active === ALL ? routine : routine.filter((p) => p.category === active)),
    [active],
  );

  return (
    <Layout>
      <section className="section section--bone range">
        <div className="shell">
          <Reveal className="range__head" as="header">
            <div>
              {/*
                The keyword sentence is the h1 and the editorial line is not.
                Search needs the literal phrase someone types; the page needs a
                line worth reading. Setting the h1 at eyebrow size lets both be
                true without a hidden heading, which is the version of this that
                gets a site penalised.
              */}
              <p className="eyebrow eyebrow--rule">The Chullan collection</p>
              <h1 className="range__h1">Professional Makeup Products for Indian Skin</h1>
              <p className="display-m range__title">
                One collection.
                <br />
                One flawless process.
              </p>
            </div>
            <p className="deck range__lede">
              Great makeup starts before foundation and lasts long after it. Chullan
              covers every step, from skin preparation and protection through
              correction, coverage, and setting. Eight products formulated in the USA,
              made to work together on Indian skin.
            </p>
          </Reveal>

          {/* The sequence, stated once. Read off `step` so it agrees with the
              order of the grid underneath by construction. */}
          <Reveal delay={0.06}>
            <ol className="process" aria-label="The eight-step routine">
              {routine.map((product) => (
                <li className="process__step" key={product.id}>
                  <span className="process__index">
                    {String(product.step.index).padStart(2, '0')}
                  </span>
                  <span className="process__label">{product.step.label}</span>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal delay={0.1}>
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
              <p className="range__count mono">
                {visible.length} of {products.length}
              </p>
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
              <ProductCard key={product.id} product={product} copy="tagline" />
            ))}
          </m.div>
        </div>
      </section>

      <section className="section section--void on-dark closing">
        <div className="shell">
          <Reveal>
            <p className="display-m closing__line">
              Eight products. One sequence. From first prep to final set.
            </p>
            <p className="closing__seo">
              Professional makeup formulated in the USA for Indian skin tones. Each
              product is designed to work with the next. A complete system that
              performs as one layer, not eight separate products.
            </p>
          </Reveal>
        </div>
      </section>

      <Faq eyebrow="FAQ" title="Before you start" items={SHOP_FAQ} id="faq" />
    </Layout>
  );
}
