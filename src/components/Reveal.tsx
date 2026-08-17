import type { ReactNode } from 'react';
import { m, stagger, useReducedMotion } from 'framer-motion';
import type { Variants, ViewportOptions } from 'framer-motion';
import { DUR, EASE, VIEWPORT } from '../motion/tokens';

/**
 * Editorial scroll-in: short travel, long duration, soft landing. Long travel
 * with a short duration is what makes a page feel like a template.
 *
 * `opacity` is always part of the animation. Under `reducedMotion="user"`,
 * framer zeroes out positional keys (`y`) but leaves opacity alone, so this
 * degrades by itself to a clean crossfade with no extra branching.
 */

type RevealProps = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'li' | 'section' | 'header';
  viewport?: ViewportOptions;
};

export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  as = 'div',
  viewport = VIEWPORT,
}: RevealProps) {
  const Tag = m[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={viewport}
      transition={{ duration: DUR.reveal, delay, ease: EASE.editorial }}
    >
      {children}
    </Tag>
  );
}

/**
 * Stagger lives on the parent. Children carry `variants` and nothing else —
 * the moment a child declares its own `whileInView` it starts triggering off
 * its own observer and the parent's orchestration stops applying.
 */
export const revealGroup: Variants = {
  hidden: {},
  show: {
    transition: { delayChildren: stagger(0.09, { startDelay: 0.05 }) },
  },
};

export const revealChild: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, ease: EASE.editorial },
  },
};

/**
 * Cinematic blur reveal, one letter at a time.
 *
 * The per-letter spans are hidden from assistive tech, and the heading that
 * contains them carries an `aria-label` with the real wording. Without that, a
 * screen reader is free to treat twelve `inline-block` spans as twelve separate
 * runs and spell the headline out \u2014 and this is the page's `h1`, so it is the
 * first thing announced.
 *
 * The naming deliberately lives on the heading rather than in a visually-hidden
 * copy of the text here. A duplicate would leave the letters *and* the copy in
 * `textContent`, so a crawler reads "Pure.Pure.Impact.Impact." \u2014 correct to a
 * screen reader and nonsense to everything else.
 *
 * Under reduced motion the letters fade together with no blur and no travel.
 * `MotionConfig reducedMotion="user"` neutralises transforms for us but not
 * `filter`, and an animated blur is the most expensive property in play: unlike
 * a transform it cannot be handed to the compositor, so every frame is a full
 * repaint of the largest type on the page.
 */
export function SplitText({ children, delay = 0 }: { children: string; delay?: number }) {
  const reduced = useReducedMotion();
  const letters = children.split('');

  return (
    <span className="split-text" style={{ display: 'block' }}>
      <span aria-hidden="true">
        {letters.map((letter, i) => (
          <m.span
            key={i}
            style={{ display: 'inline-block' }}
            initial={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, filter: 'blur(12px)', scale: 1.1, x: -10 }
            }
            animate={
              reduced
                ? { opacity: 1 }
                : { opacity: 1, filter: 'blur(0px)', scale: 1, x: 0 }
            }
            transition={{
              duration: reduced ? 0.4 : 1.2,
              delay: reduced ? delay : delay + i * 0.05,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {letter === ' ' ? '\u00A0' : letter}
          </m.span>
        ))}
      </span>
    </span>
  );
}
