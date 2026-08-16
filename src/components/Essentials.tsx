import { Link } from 'react-router-dom';
import { Reveal } from './Reveal';
import featuredImg from '../assets/featured_product.png';

/**
 * Every claim here is traceable to the pack copy in the 2026 catalogue.
 *
 * The previous list ("twelve-hour shine control", "no fragrance, no parabens,
 * no talc") was written against placeholder products and contradicted the
 * actual packs — the Finishing Spray states up to ten hours, and the free-from
 * claims were never sourced from anywhere. Cosmetic claims on a storefront are
 * regulated, so nothing goes on this list that isn't printed on a box.
 */
const POINTS = [
  'Finishing spray holds for up to ten hours',
  'Moisturiser with Vitamin E, grape seed and carrot oil',
  'Broad-spectrum SPF 50 that wears under make-up',
];

export function Essentials() {
  return (
    <section className="section--void on-dark cv-auto" id="story">
      <div className="split">
        <div className="split__media">
          <img
            src={featuredImg}
            alt="Chullan revitalising moisturiser resting on coal"
            width={1024}
            height={1024}
            loading="lazy"
            decoding="async"
          />
        </div>

        <div className="split__body">
          <Reveal>
            <p className="eyebrow eyebrow--rule">The collection</p>
            <h2 className="display-m split__title">
              The
              <br />
              Essentials
            </h2>
            <p className="deck">
              Eight products. Prep, face, set, skin — and a line built for men.
              Formulated to work as one system, so you never have to learn a
              second one.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <ul className="split__list">
              {POINTS.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <Link className="btn btn--secondary" to="/shop">Shop the set</Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
