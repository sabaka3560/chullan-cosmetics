import { useState } from 'react';
import { Link } from 'react-router-dom';
import { m, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Rating } from './Rating';
import { LazyBottleStage } from '../three/LazyBottleStage';
import { revealChild } from './Reveal';
import { useCart } from '../commerce/CartProvider';
import { formatMoney } from '../commerce/money';
import { priceRangeMinor, unitPriceMinor } from '../data/catalog';
import type { Product } from '../commerce/types';

/**
 * One card renders a photograph, one renders a live WebGL bottle — but they
 * share the same shell, the same 4:5 media box, the same optical frame, the
 * same hairline, the same shadow and the same caption block.
 *
 * That sameness is the entire point. The 3D piece has to read as another
 * product in the row, not as a demo bolted onto the page, so the only thing
 * that differs is what's inside the media box.
 *
 * The whole card is a link to the detail page, but there is only ONE anchor in
 * the markup: the product name, stretched over the card with a pseudo-element.
 * Wrapping the media in a second anchor to the same place would make every card
 * announce itself twice to a screen reader and double the tab stops in the grid.
 *
 * Quick-add and the shade swatches sit above that stretched layer, so choosing
 * a shade or adding to the bag never navigates by accident.
 */
export function ProductCard({
  product,
  copy = 'description',
}: {
  product: Product;
  /**
   * Which caption the card carries.
   *
   * `description` is the full sentence, for the home page where a shopper is
   * being introduced to a product. `tagline` is three or four words, for the
   * range page where eight cards are read as one sequence and eight long
   * paragraphs would be a wall.
   */
  copy?: 'description' | 'tagline';
}) {
  const { add, lastAdded } = useCart();

  // Holds the SKU and derives the variant, for the same reason the detail page
  // does: a stored variant object can outlive the product it belongs to, and
  // the failure mode is a card that displays one product and adds another.
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const selected =
    product.variants.find((variant) => variant.sku === selectedSku) ?? product.variants[0];

  const hasChoice = product.variants.length > 1;

  /*
   * Before a shade is chosen the caption sells the range — "8 shades" is the
   * fact worth advertising on a shelf, and it is what the content brief asks
   * for. After a tap it becomes the shade that was picked, because at that
   * point the shopper is asking a different question: not how many are there,
   * but which one is selected. The button's own label always names the shade,
   * so a screen reader never depends on this either way.
   */
  const shadeCaption = selectedSku
    ? selected.label
    : `${product.variants.length} shades`;
  const justAdded = lastAdded === selected.sku;

  /*
   * Two different prices, and the difference matters.
   *
   * The caption advertises the range, because before a shade is chosen there is
   * no single answer — "From ₹1,200" is the honest headline for a product whose
   * shades are priced in tiers. The button quotes the shade actually selected,
   * because that is the amount about to be charged, and a button that says
   * ₹1,200 while taking ₹1,800 is the worst version of this component.
   *
   * Both derive from the variants, so a card can never advertise a spread that
   * the catalog no longer has.
   */
  const range = priceRangeMinor(product);
  const caption =
    range.min === range.max
      ? formatMoney(range.min)
      : `From ${formatMoney(range.min)}`;
  const selectedPrice = formatMoney(unitPriceMinor(product, selected));

  // 3D Parallax hover logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <m.article 
      variants={revealChild} 
      className="card"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
    >
      <div className="card__media" data-shot={product.shot}>
        {product.shot === 'tile' ? (
          /*
             Stands in for a photograph that does not exist yet. The brand
             device rather than a stock silhouette, because the one thing this
             card must not do is imply a shape the product may not have.
          */
          <span className="pack-tile" aria-hidden="true">
            <span className="pack-tile__mark">Chullan</span>
            <span className="pack-tile__name">{product.name}</span>
          </span>
        ) : product.live ? (
          <>
            <span className="card__flag">
              <i />
              Live
            </span>
            <LazyBottleStage variant="card" className="card__stage" />
            <span className="card__hint">Rendered in real time</span>
          </>
        ) : (
          <img
            src={product.image ?? product.thumb}
            alt={product.name}
            width={1024}
            height={1024}
            loading="lazy"
            decoding="async"
          />
        )}

        <button
          type="button"
          className="card__add"
          onClick={() => add(selected.sku)}
          disabled={!selected.inStock}
          /* The label carries the shade so the button is unambiguous out of
             context, which is how a screen reader reaches it. */
          aria-label={
            hasChoice
              ? `Add ${product.name}, ${selected.label}, to bag`
              : `Add ${product.name} to bag`
          }
        >
          {!selected.inStock
            ? 'Sold out'
            : justAdded
              ? 'Added'
              : `Add — ${selectedPrice}`}
        </button>
      </div>

      <div className="card__body">
        <p className="eyebrow">{product.category}</p>
        <h3 className="card__name">
          <Link to={`/product/${product.id}`} className="card__link">
            {product.name}
          </Link>
        </h3>
        <div className="card__meta">
          <span className="card__price">{caption}</span>
          <Rating value={product.rating} count={product.reviews} />
        </div>
        <span className="card__size">{product.size}</span>

        {/* Clamped to three lines rather than truncated, so the full sentence
            stays in the markup for indexing while the grid keeps even rows. */}
        {copy === 'description' ? (
          <p className="card__desc">{product.blurb}</p>
        ) : (
          <p className="card__tagline">{product.tagline}</p>
        )}

        {hasChoice && (
          <div className="swatches" role="group" aria-label={`${product.name} shade`}>
            {product.variants.map((variant) => (
              <button
                key={variant.sku}
                type="button"
                className="swatch"
                data-selected={variant.sku === selected.sku}
                disabled={!variant.inStock}
                style={{ '--swatch': variant.swatch } as React.CSSProperties}
                onClick={() => setSelectedSku(variant.sku)}
                aria-pressed={variant.sku === selected.sku}
                aria-label={variant.inStock ? variant.label : `${variant.label}, sold out`}
              />
            ))}
            <span className="swatch__label">{shadeCaption}</span>
          </div>
        )}
      </div>
    </m.article>
  );
}
