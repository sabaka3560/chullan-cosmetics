import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { m } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Reveal, revealGroup } from '../components/Reveal';
import { ProductCard } from '../components/ProductCard';
import { DeliveryCheck } from '../components/DeliveryCheck';
import { useCart } from '../commerce/CartProvider';
import { formatMoney } from '../commerce/money';
import { unitPriceMinor } from '../data/catalog';
import { VIEWPORT } from '../motion/tokens';
import { productById, products } from '../data/products';
import { SITE_ORIGIN, useSeo } from '../seo/useSeo';

/**
 * Product detail.
 *
 * The shade picker here is the same control as the one on the card, and that is
 * intentional — someone who picked a shade in the grid and clicked through
 * should find the choice still made, not reset. The state is local rather than
 * lifted because a shade is a browsing preference, not cart state: it must not
 * survive a reload the way the bag does.
 */
export default function Product() {
  const { id } = useParams();
  const product = id ? productById(id) : undefined;
  const { add, lastAdded, open } = useCart();

  /**
   * The SKU is held, not the variant object, and the variant is looked up from
   * the current product every render.
   *
   * The obvious version — `useState(product.variants[0])` — is quietly wrong.
   * React Router reuses this component across `/product/a` → `/product/b`, so
   * the initialiser never re-runs and the held variant stays pointed at the
   * previous product. The page would render the new product's name and price
   * while "Add to bag" added the old product's SKU. Deriving instead of storing
   * makes that state unrepresentable: a SKU that isn't in this product simply
   * doesn't match, and the fallback takes over.
   */
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const selected =
    product?.variants.find((variant) => variant.sku === selectedSku) ??
    product?.variants[0];

  /*
   * Called before the early return for an unknown id, because hooks cannot be
   * called conditionally. The fallback strings are what a missing product would
   * show, and the canonical is omitted in that case so a 404 never claims to be
   * the authoritative version of anything.
   */
  useSeo({
    title: product
      ? `${product.name} | Chullan Professional Makeup`
      : 'Product not found | Chullan',
    description: product?.blurb ?? 'This product is no longer available.',
    canonical: product ? `${SITE_ORIGIN}/product/${product.id}` : undefined,
  });

  // `replace` so a dead product link doesn't sit in history and re-break on back.
  if (!product || !selected) return <Navigate to="/shop" replace />;

  const hasChoice = product.variants.length > 1;
  const justAdded = lastAdded === selected.sku;

  const related = products.filter((other) => other.id !== product.id).slice(0, 3);

  return (
    <Layout>
      <section className="section section--paper pdp">
        <div className="shell">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <ChevronRight size={13} strokeWidth={1.8} aria-hidden="true" />
            <Link to="/shop">The Range</Link>
            <ChevronRight size={13} strokeWidth={1.8} aria-hidden="true" />
            <span aria-current="page">{product.name}</span>
          </nav>

          <div className="pdp__grid">
            <Reveal>
              <div className="pdp__media">
                <img
                  src={product.image ?? product.thumb}
                  alt={product.name}
                  width={1024}
                  height={1024}
                  decoding="async"
                />
              </div>
            </Reveal>

            <div className="pdp__body">
              <Reveal delay={0.06}>
                {/* A "Chullan — Make Up For Men" banner used to render here for
                    `line === 'men'`. Nothing in the catalog has been on that
                    line since the range became the professional base system, so
                    it was dead code — and dead code that would have put male-only
                    branding on a product page if a row was ever mislabelled. */}
                <p className="eyebrow">{product.category}</p>
                <h1 className="h2 pdp__title">{product.name}</h1>

                <div className="pdp__meta">
                  {/* The shade on screen, not the product's default. This page
                      always has a shade selected, so there is no range to show
                      and no reason to quote anything but what will be charged. */}
                  <span className="pdp__price">
                    {selected ? formatMoney(unitPriceMinor(product, selected)) : null}
                  </span>
                  {/* Star rating removed with the testimonials — the review
                      count behind it was invented. See `ProductCard`. */}
                </div>

                <p className="deck pdp__blurb">{product.blurb}</p>
              </Reveal>

              <Reveal delay={0.12}>
                {hasChoice && (
                  <div className="pdp__shades">
                    {/* The code is printed on the pack, so showing it here is
                        what lets someone reorder the same shade a year later
                        without holding the bottle up to the screen. */}
                    <p className="eyebrow">
                      Shade — <span className="pdp__shade-name">{selected.label}</span>
                      {selected.code && (
                        /* A real separator character, not a CSS margin. The gap
                           has to survive being copied into a reorder email, and
                           `BisqueC1W1` is what a margin alone produces there. */
                        <span className="pdp__shade-code"> · {selected.code}</span>
                      )}
                    </p>
                    <div className="swatches" role="group" aria-label="Choose a shade">
                      {product.variants.map((variant) => (
                        <button
                          key={variant.sku}
                          type="button"
                          className="swatch swatch--lg"
                          data-selected={variant.sku === selected.sku}
                          disabled={!variant.inStock}
                          style={{ '--swatch': variant.swatch } as React.CSSProperties}
                          onClick={() => setSelectedSku(variant.sku)}
                          aria-pressed={variant.sku === selected.sku}
                          /* The code goes in the accessible name too. A screen
                             reader hearing eight shade names in a row has no
                             other way to tell Amber from Espresso. */
                          aria-label={
                            [variant.label, variant.code, variant.inStock ? '' : 'sold out']
                              .filter(Boolean)
                              .join(', ')
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn--primary pdp__add"
                  disabled={!selected.inStock}
                  onClick={() => {
                    add(selected.sku);
                    // Opening the bag is the confirmation. A toast that fades
                    // leaves the buyer guessing whether it worked; the drawer
                    // shows the actual state and the subtotal it produced.
                    open();
                  }}
                >
                  {!selected.inStock ? 'Sold out' : justAdded ? 'Added to bag' : 'Add to bag'}
                </button>

                {/* Packed weight removed. It is a courier's number, not a
                    shopper's — "140g packed" says nothing about the product and
                    quietly invites comparison against the fill weight printed
                    on the box. It stays on the catalog row, where the delivery
                    estimate and Shiprocket both read it. */}
                <dl className="pdp__specs">
                  <div>
                    <dt>Size</dt>
                    <dd>{product.size}</dd>
                  </div>
                  <div>
                    <dt>SKU</dt>
                    <dd className="mono">{selected.sku}</dd>
                  </div>
                </dl>

                <DeliveryCheck lines={[{ sku: selected.sku, qty: 1 }]} />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--bone section--follows-same-tone">
        <div className="shell">
          <Reveal className="section-head" as="header">
            <div>
              <p className="eyebrow eyebrow--rule">Goes with</p>
              <h2 className="h2 section-head__title">The rest of the routine</h2>
            </div>
          </Reveal>

          <m.div
            className="product-grid"
            variants={revealGroup}
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT}
          >
            {related.map((other) => (
              <ProductCard key={other.id} product={other} />
            ))}
          </m.div>
        </div>
      </section>
    </Layout>
  );
}
