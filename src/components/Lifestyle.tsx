import { useRef } from 'react';
import { m, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Reveal } from './Reveal';
import { SPRING, VIEWPORT_TALL } from '../motion/tokens';
import lifestyleImg from '../assets/lifestyle_2.png';

/**
 * Transform parallax, not `background-attachment: fixed` — which iOS Safari
 * ignores outright, forces a full-area repaint in Chrome, and can't be gated on
 * reduced motion.
 *
 * The media layer is inset by -15% top and bottom. That overscan is what the
 * ±12% translate eats; without it you'd see a bare edge at the ends of the
 * scroll range. Keep `overscan ≥ translate` if you change either.
 *
 * The spring is heavily overdamped (ζ ≈ 2.67), so it lags without wobbling —
 * and here the lag *is* the effect.
 */
export function Lifestyle() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    // 'start end' → section top meets viewport bottom, as it enters.
    // 'end start' → section bottom meets viewport top, as it leaves.
    offset: ['start end', 'end start'],
  });

  const smooth = useSpring(scrollYProgress, SPRING.scroll);
  const y = useTransform(smooth, [0, 1], ['-12%', '12%']);

  return (
    <section className="band on-dark" ref={ref}>
      <m.div className="band__media" style={reduced ? undefined : { y }}>
        <img src={lifestyleImg} alt="" width={1024} height={1024} loading="lazy" decoding="async" />
      </m.div>
      <div className="band__scrim" />

      <div className="band__inner">
        <Reveal viewport={VIEWPORT_TALL}>
          <p className="eyebrow">Professional grade. For every skin tone</p>
          <h2 className="display-l band__title">Your shade exists</h2>
          <p className="deck">
            Eight foundation shades. Fair neutral to deep warm. Two formulation
            tiers, the original Professional Base and the advanced Pro Glow with
            enhanced luminosity. Every shade is engineered for Indian undertones,
            not borrowed from a Western palette.
          </p>
          <p className="deck band__deck-2">
            Pair with the Concealer for targeted correction, set with the Anti-Shine
            Powder, and lock with the Setting Spray. One complete system, prep to
            finish.
          </p>

          {/* This section has the strongest visual treatment on the page, so the
              CTA is pointed at the highest-value page rather than back to the
              range — the shopper is already convinced by the time they read it. */}
          <Link className="btn btn--primary band__cta" to="/product/foundation">
            Find your shade
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
