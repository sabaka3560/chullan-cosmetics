import { useRef } from 'react';
import { m, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Reveal } from './Reveal';
import featuredImg from '../assets/feature-sunscreen.jpg';

/**
 * Every claim here is traceable to the pack copy or to the client's content
 * brief. Cosmetic claims on a storefront are regulated, so nothing goes on this
 * list that isn't printed on a box or signed off in writing.
 */
const POINTS = [
  'Alcohol-free setting spray with silicone film-forming technology',
  'Moisturiser with Jojoba Oil, Cocoa Butter, Vitamin E, and Grape Seed Oil',
  'SPF 50 sunscreen that sits smoothly under makeup',
  '8 foundation shades engineered for Indian undertones, from fair neutral to deep warm',
  '6-shade colour corrector palette for dark circles, pigmentation, and redness',
  'Full-coverage concealer in 3 warm shades, matched to the foundation system',
];

export function Essentials() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);

  return (
    <section ref={ref} className="section--void on-dark cv-auto" id="story">
      <div className="split">
        <div className="split__media" style={{ overflow: 'hidden' }}>
          <m.img
            style={{ y, scale: 1.15, transformOrigin: 'center' }}
            src={featuredImg}
            alt="A model holding the Chullan sunscreen"
            /* The real intrinsic size. This said 1024x1024 while every image
               that has actually sat here was something else — the attributes
               exist to reserve the right box before the file arrives, and a
               square reservation for a 2:3 portrait reserves the wrong one. */
            width={1600}
            height={2400}
            loading="lazy"
            decoding="async"
          />
        </div>

        <div className="split__body">
          <Reveal>
            <p className="eyebrow eyebrow--rule">The complete base</p>
            <h2 className="display-m split__title">
              The
              <br />
              Essentials
            </h2>
            <p className="deck">
              Eight products. Prep, correct, cover, set. A complete professional
              base range formulated to work as one system, from moisturiser and
              SPF 50 sunscreen through primer, foundation, concealer, colour
              corrector, setting powder, and setting spray. Every formula built to
              perform together, so your base works as one layer, not eight
              separate products.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <ul className="split__list">
              {POINTS.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <Link className="btn btn--secondary" to="/shop">Shop the range</Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
