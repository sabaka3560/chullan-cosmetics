import { Reveal } from './Reveal';
import featuredImg from '../assets/featured_product.png';

const POINTS = [
  'Buildable coverage that never cakes',
  'Twelve-hour shine control',
  'No fragrance, no parabens, no talc',
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
              Three products. That's the entire routine. A foundation, a concealer
              and a balm, formulated to work as one system so you never have to
              learn a second one.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <ul className="split__list">
              {POINTS.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <a className="btn btn--secondary" href="#bestsellers">Shop the set</a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
