import { m, useReducedMotion } from 'framer-motion';
import { SplitText } from './Reveal';
import { EASE } from '../motion/tokens';
import heroImg from '../assets/hero-primer-spray.jpg';

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
const T = {
  eyebrow: 0.15,
  lines: [0.32, 0.39, 0.46, 0.53],
  sub: 0.66,
  body: 0.74,
  cta: 0.86,
  meta: 1.02,
};

/**
 * Four lines, not two.
 *
 * "Professional makeup for Indian skin tones" is six words where the previous
 * headline was two, and at the extra-large display size its longest line runs
 * about 770px against a 740px copy column. Dropping one step of the scale and
 * breaking it four ways keeps it inside the column and lands "skin tones" — the
 * part that is actually the claim — on its own line.
 *
 * The breaks are hand-set rather than left to wrapping, because a headline that
 * rewraps at every viewport width reads as a different headline at every width.
 */
const HEADLINE = ['Professional', 'makeup', 'for Indian', 'skin tones'];

const SPECS = [
  { label: 'Formulated in', value: 'USA' },
  { label: 'Shades', value: '8 Foundation · 3 Concealer' },
  { label: 'Tested', value: 'Stability at 40°C' },
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
      {/* The drift lives on the image, not on its frame.
          On a phone `.hero__media` is a fixed-height band above the copy rather
          than a full-bleed backdrop, and animating the frame would animate that
          band's bottom edge — the photograph would visibly grow into the
          headline for six seconds. Scaling the image inside a clipped frame
          reads identically and leaves the edge where it was put. */}
      <div className="hero__media">
        <m.img
          src={heroImg}
          alt=""
          width={1264}
          height={848}
          fetchPriority="high"
          decoding="sync"
          /* Opacity resolves much faster than scale, so the image is *there*
             immediately and only its framing is still settling. That asymmetry
             is what makes it read as a camera settling, not a page loading. */
          initial={{ scale: reduced ? 1 : 1.15, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            /* Ken Burns. 6s rather than 15s: while the hero image is still
               resizing it keeps producing new largest-contentful-paint
               candidates, so a 15s drift reported an LCP of ~15.7s against a
               2.5s "good" threshold. Six seconds reads the same and settles
               well inside the window. */
            scale: { duration: 6, ease: 'easeOut' },
            opacity: { duration: 1.2, ease: 'linear' },
          }}
        />
        {/* Nested inside the frame rather than a sibling of it. On desktop both
            are `inset: 0` so this is the same picture; on a phone the frame
            sizes itself and the scrim has to follow it, which it cannot do from
            outside. */}
        <div className="hero__scrim" />
      </div>
      <div className="hero__grid" />

      <div className="shell hero__inner">
        <div className="hero__copy">
          <m.p
            className="eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: T.eyebrow, ease: EASE.editorial }}
          >
            Chullan Make Up Professional
          </m.p>

          {/* The wording lives here because SplitText renders one span per
              letter and hides them from assistive tech. See `SplitText`. */}
          <h1
            className="display-l hero__title"
            aria-label="Professional makeup for Indian skin tones"
          >
            {HEADLINE.map((line, index) => (
              <SplitText key={line} delay={T.lines[index]}>
                {line}
              </SplitText>
            ))}
          </h1>

          {/* Two paragraphs, deliberately unequal. The first is the claim and is
              set at deck size; the second is the evidence for it and steps down,
              so the eye takes the promise before the specification. */}
          <m.p
            className="deck hero__sub"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: T.sub, ease: EASE.editorial }}
          >
            Not adapted. Not approximated. Formulated from the ground up for your
            skin tone.
          </m.p>

          <m.p
            className="hero__body"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: T.body, ease: EASE.editorial }}
          >
            Professional base makeup with eight foundation shades engineered for
            Indian undertones. From fair neutral to deep warm. Formulated in the
            USA, manufactured in India.
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
