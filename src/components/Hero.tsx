import { m, useReducedMotion } from 'framer-motion';
import { MaskedLine } from './Reveal';
import { DUR, EASE } from '../motion/tokens';
import heroImg from '../assets/hero_product.png';

/**
 * Authored beats rather than a chain of nested staggers.
 *
 *   0.00  background begins its 2.4s scale settle, under everything
 *   0.15  eyebrow lands first and is readable — it's the only thing on screen
 *   0.32  headline line one   ┐ 0.09 apart, so the two read as one gesture
 *   0.41  headline line two   ┘
 *   0.62  paragraph enters while the headline's 1.05s rise is still resolving
 *   0.76  CTA
 *   0.95  spec row
 *
 * Beats under ~80ms merge into one event; beats over ~250ms read as separate
 * events. Every gap above is chosen against those two thresholds.
 */
const T = { eyebrow: 0.15, line1: 0.32, line2: 0.41, body: 0.62, cta: 0.76, meta: 0.95 };

const SPECS = [
  { label: 'Finish', value: 'Luminous Matte' },
  { label: 'Volume', value: '30ml / 1.0 fl oz' },
  { label: 'Tested', value: 'Dermatologist' },
];

/**
 * Photography and type only — no canvas.
 *
 * The 3D lives in its own boxes further down the page, where it can be framed
 * and grounded. A canvas floating over the headline is what made the previous
 * build read as an experiment rather than a shop.
 */
export function Hero() {
  const reduced = useReducedMotion();

  return (
    <section className="hero on-dark" id="top">
      {/* Opacity resolves much faster than scale, so the image is *there*
          immediately and only its framing is still settling. That asymmetry is
          what makes it read as a camera settling rather than a page loading. */}
      <m.div
        className="hero__media"
        initial={{ scale: reduced ? 1 : 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          scale: { duration: DUR.ambient, ease: EASE.entrance },
          opacity: { duration: 1, ease: 'linear' },
        }}
      >
        <img
          src={heroImg}
          alt=""
          width={1024}
          height={1024}
          fetchPriority="high"
          decoding="sync"
        />
      </m.div>
      <div className="hero__scrim" />

      <div className="shell hero__inner">
        <div className="hero__copy">
          <m.p
            className="eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: T.eyebrow, ease: EASE.editorial }}
          >
            Introducing Chullan
          </m.p>

          <h1 className="display-xl hero__title">
            <MaskedLine delay={T.line1}>Pure.</MaskedLine>
            <MaskedLine delay={T.line2}>Impact.</MaskedLine>
          </h1>

          <m.p
            className="deck"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: T.body, ease: EASE.editorial }}
          >
            Premium cosmetics engineered for the modern man. Weightless coverage,
            zero shine, and nothing that looks like you're wearing anything at all.
          </m.p>

          <m.div
            className="hero__actions"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: T.cta, ease: EASE.editorial }}
          >
            <a className="btn btn--primary" href="#bestsellers">Shop the range</a>
            <a className="btn--ghost" href="#detail">See it in 3D</a>
          </m.div>
        </div>

        <m.div
          className="hero__meta"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: T.meta, ease: EASE.editorial }}
        >
          <dl className="hero__specs">
            {SPECS.map((spec) => (
              <div className="hero__spec" key={spec.label}>
                <dt>{spec.label}</dt>
                <dd>{spec.value}</dd>
              </div>
            ))}
          </dl>

          <span className="hero__scroll">
            Scroll
            <i />
          </span>
        </m.div>
      </div>
    </section>
  );
}
