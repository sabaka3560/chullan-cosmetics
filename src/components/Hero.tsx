import { useEffect, useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { SplitText } from './Reveal';
import { EASE } from '../motion/tokens';
import slide02 from '../assets/hero-02-foundation.jpg';
import slide03 from '../assets/hero-03-moisturiser.jpg';
import slide04 from '../assets/hero-04-spray.jpg';
import slide05 from '../assets/hero-05-sunscreen.jpg';
import slide06 from '../assets/hero-06-sunscreen.jpg';

/**
 * The hero cycles rather than sitting on one photograph.
 *
 * All five are landscape (1.80), which is why they sit together cleanly. A
 * portrait frame briefly rode in this list and had to carry its own
 * `object-position` to survive the crop — a wide hero takes a narrow horizontal
 * band out of a portrait, and a phone takes a narrow vertical one out of a
 * landscape. It reads better in the Essentials column, where the frame is
 * tall, and that is where it now lives.
 *
 * The positions stay per-slide even so: the subject is not in the same place
 * in every frame, and a phone crops these to roughly a third of their width.
 */
const SLIDES = [
  { src: slide02, position: '50% 45%', alt: '' },
  { src: slide03, position: '50% 40%', alt: '' },
  { src: slide04, position: '50% 45%', alt: '' },
  { src: slide05, position: '50% 42%', alt: '' },
  { src: slide06, position: '50% 42%', alt: '' },
];

/** Long enough to read the frame, short enough that the loop is noticed. */
const SLIDE_MS = 5200;

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
 * Photography and type only.
 *
 * The landing page carried a live WebGL bottle for several releases — in this
 * hero's second button, in a full section below it, and as one card in the
 * range. All of it is gone now that there are photographs of the actual
 * products with a model holding them, which is a stronger answer to "what am I
 * buying" than a rotatable render of a bottle ever was. The 3D code is kept
 * under `src/three/` rather than deleted; see the note in `Showcase`.
 */
export function Hero() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  /*
   * Advances forever, wrapping with a modulo — the loop has no end state, which
   * is what "infinite" has to mean here.
   *
   * Paused when the tab is hidden. A setInterval in a background tab keeps
   * firing, and every fire swaps a full-bleed photograph and starts a scale
   * animation on it, so an unattended tab would burn compositor work for hours
   * on frames nobody is looking at.
   */
  useEffect(() => {
    if (reduced) return;
    let timer: number | undefined;
    const start = () => {
      timer = window.setInterval(() => {
        setIndex((current) => (current + 1) % SLIDES.length);
      }, SLIDE_MS);
    };
    const stop = () => { if (timer !== undefined) window.clearInterval(timer); timer = undefined; };
    const onVisibility = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [reduced]);

  return (
    <section className="hero on-dark" id="top">
      {/* The drift lives on the image, not on its frame. Animating the frame
          would animate its edges, and the frame is what the scrim and the
          section's own bounds are measured against — so the darkening would
          drift out of register with the photograph. Scaling the image inside a
          clipped frame reads identically and leaves every edge where it was
          put. */}
      <div className="hero__media">
        {/*
          `mode="popLayout"` is deliberately not used: the outgoing slide has to
          stay in the DOM and fade *under* the incoming one, or the scrim briefly
          sits on bare background between frames.

          Only the first slide is eager. The rest are lazy and decode async —
          six hero-sized photographs fetched at once would be about 1.3MB
          competing with the bundle for the first paint, and slide two is not
          needed for another five seconds.
        */}
        <AnimatePresence initial={false}>
          <m.img
            key={index}
            src={SLIDES[index].src}
            alt={SLIDES[index].alt}
            width={1600}
            height={890}
            fetchPriority={index === 0 ? 'high' : 'low'}
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding={index === 0 ? 'sync' : 'async'}
            style={{ objectPosition: SLIDES[index].position }}
            /* Opacity resolves much faster than scale, so the image is *there*
               immediately and only its framing is still settling. That asymmetry
               is what makes it read as a camera settling, not a page loading. */
            initial={{ scale: reduced ? 1 : 1.08, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              /* A slow drift across the whole time a slide is up, so the motion
                 never stops and starts. The fade is far shorter than the hold,
                 so the crossfade reads as a cut with a soft edge rather than as
                 a dissolve you sit through. */
              scale: { duration: reduced ? 0 : SLIDE_MS / 1000 + 1.5, ease: 'easeOut' },
              opacity: { duration: 1.1, ease: 'linear' },
            }}
          />
        </AnimatePresence>
        {/* Nested inside the frame rather than a sibling of it, so it is
            clipped by the same `overflow: hidden` and cannot be left behind if
            the frame is ever sized by something other than the section. */}
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
            {/* Short on purpose. At 360px the primary button is 191px of a
                320px column, so anything past about twelve characters wraps
                this row onto two lines — which cost 72px and pushed the hero
                copy up underneath the fixed navigation. */}
            <a className="btn--ghost" href="#detail">The formula</a>
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
