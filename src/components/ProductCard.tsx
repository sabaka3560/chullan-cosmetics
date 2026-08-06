import { m } from 'framer-motion';
import { Rating } from './Rating';
import { LazyBottleStage } from '../three/LazyBottleStage';
import { revealChild } from './Reveal';
import type { Product } from '../data/products';

/**
 * One card renders a photograph, one renders a live WebGL bottle — but they
 * share the same shell, the same 4:5 media box, the same optical frame, the
 * same hairline, the same shadow and the same caption block.
 *
 * That sameness is the entire point. The 3D piece has to read as another
 * product in the row, not as a demo bolted onto the page, so the only thing
 * that differs is what's inside the media box.
 */
export function ProductCard({ product }: { product: Product }) {
  return (
    <m.article variants={revealChild} className="card">
      <a href="#" className="card__media" aria-label={product.name}>
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
            src={product.image}
            alt={product.name}
            width={1024}
            height={1024}
            loading="lazy"
            decoding="async"
          />
        )}
        <span className="card__add">Add — ${product.price}</span>
      </a>

      <div className="card__body">
        <p className="eyebrow">{product.category}</p>
        <h3 className="card__name">{product.name}</h3>
        <div className="card__meta">
          <span className="card__price">${product.price}</span>
          <Rating value={product.rating} count={product.reviews} />
        </div>
        <span className="card__size">{product.size}</span>
      </div>
    </m.article>
  );
}
