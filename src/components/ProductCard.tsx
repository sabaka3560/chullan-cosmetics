import { useState } from 'react';
import { Link } from 'react-router-dom';
import { m, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Rating } from './Rating';
import { LazyBottleStage } from '../three/LazyBottleStage';
import { revealChild } from './Reveal';
import { useCart } from '../commerce/CartProvider';
import { formatMoney } from '../commerce/money';
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
export function ProductCard({ product }: { product: Product }) {
  const { add, lastAdded } = useCart();

  // Holds the SKU and derives the variant, for the same reason the detail page
  // does: a stored variant object can outlive the product it belongs to, and
  // the failure mode is a card that displays one product and adds another.
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const selected =
    product.variants.find((variant) => variant.sku === selectedSku) ?? product.variants[0];

  const hasChoice = product.variants.length > 1;
  const justAdded = lastAdded === selected.sku;

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
      <div className="card__media">
        {product.live ? (
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
              : `Add — ${formatMoney(product.priceMinor)}`}
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
          <span className="card__price">{formatMoney(product.priceMinor)}</span>
          <Rating value={product.rating} count={product.reviews} />
        </div>
        <span className="card__size">{product.size}</span>

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
            <span className="swatch__label">{selected.label}</span>
          </div>
        )}
      </div>
    </m.article>
  );
}
