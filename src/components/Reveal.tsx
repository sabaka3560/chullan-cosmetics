import type { ReactNode } from 'react';
import { m, stagger } from 'framer-motion';
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
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
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
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE.editorial },
  },
};

/**
 * One masked line of display type.
 *
 * 110% rather than 100%: descenders and line-height overshoot otherwise leave a
 * sliver of ghost text visible above the mask at the start of the animation.
 */
export function MaskedLine({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <span className="line-mask">
      <m.span
        style={{ display: 'block' }}
        initial={{ y: '110%', opacity: 0 }}
        animate={{ y: '0%', opacity: 1 }}
        transition={{
          y: { duration: DUR.headline, delay, ease: EASE.entrance },
          opacity: { duration: 0.4, delay, ease: 'linear' },
        }}
      >
        {children}
      </m.span>
    </span>
  );
}
