import type { SpringOptions, Transition, ViewportOptions } from 'framer-motion';

/**
 * Six durations and four easings for the whole page. The single biggest thing
 * that makes motion read as authored rather than assembled is that there simply
 * aren't many values in play.
 */

/** All decelerating — fast off the mark, long settle. That's what reads as weight. */
export const EASE = {
  /** Quint-out. The default scroll reveal. */
  editorial: [0.22, 0.61, 0.36, 1],
  /** Expo-out. Masked headline lines and ambient settles. */
  entrance: [0.16, 1, 0.3, 1],
  /** Cubic-out. Hover and other small state changes. */
  soft: [0.33, 1, 0.68, 1],
} as const;

export const DUR = {
  micro: 0.28,
  hover: 0.45,
  reveal: 0.78,
  headline: 1.05,
  ambient: 2.4,
} as const;

/**
 * Springs described by damping ratio ζ = damping / (2·√(stiffness·mass)).
 * ζ ≥ 1 never overshoots. Design to ζ: if something feels bouncy and shouldn't,
 * raise damping rather than fiddling with stiffness.
 */
export const SPRING = {
  /** ζ ≈ 2.67 — smooth lag, zero wobble. Scroll smoothing only. */
  scroll: { stiffness: 90, damping: 30, mass: 0.35 } satisfies SpringOptions,
} as const;

/**
 * A POSITIVE bottom margin grows the observer root *below* the fold, so an
 * element starts moving while it is still off-screen and has mostly settled by
 * the time you can see it.
 *
 * The negative form that most tutorials use does the opposite — it shrinks the
 * root, so the animation fires only after the element is already visible and
 * you watch it chase you down the page.
 */
export const VIEWPORT: ViewportOptions = {
  once: true,
  amount: 0.2,
  margin: '0px 0px 15% 0px',
};

/**
 * For blocks taller than the viewport. `amount` is a fraction of the *element*,
 * so a numeric threshold on a 100vh+ section can never be satisfied and the
 * reveal would never fire.
 */
export const VIEWPORT_TALL: ViewportOptions = {
  once: true,
  amount: 'some',
  margin: '0px 0px 12% 0px',
};

export const REVEAL_TRANSITION: Transition = {
  duration: DUR.reveal,
  ease: EASE.editorial,
};
