import { m, useReducedMotion } from 'framer-motion';
import { EASE } from '../motion/tokens';

/**
 * The mark that draws itself when an order lands.
 *
 * The brand device is the wordmark inside a hard-cornered box — it is on the
 * nav, on the favicon, and on every pack in the catalogue. So the confirmation
 * is that box being drawn: the identity completing itself around a check,
 * rather than an effect borrowed from somewhere else.
 *
 * Deliberately not confetti. This palette is black and bone with no accent
 * colour anywhere, and a burst of colour at the one moment a buyer is paying
 * closest attention would read as a different product entirely. Restraint is
 * the brand; the animation has to be the brand too.
 *
 * The order matters. The box draws first and encloses nothing, then the check
 * strokes inside it — enclose, then confirm. Reversing it reads as a tick that
 * happens to get boxed afterwards, which is a weaker sentence.
 */

const BOX = { x: 10, y: 10, size: 100 };

export function OrderSeal({ tone = 'confirmed' }: { tone?: 'confirmed' | 'pending' }) {
  const reduced = useReducedMotion();

  /*
   * Under reduced motion the whole thing simply appears. A drawn line is
   * movement across the screen, which is exactly what the preference is asking
   * not to see — dropping the duration to zero rather than removing the mark
   * keeps the meaning and loses only the travel.
   */
  const draw = (delay: number, duration: number) =>
    reduced
      ? { duration: 0, delay: 0 }
      : { duration, delay, ease: EASE.entrance };

  return (
    <m.svg
      className="seal"
      viewBox="0 0 120 120"
      width="120"
      height="120"
      role="img"
      aria-label={tone === 'pending' ? 'Payment received' : 'Order confirmed'}
      /* A whisper of settle on the whole mark, so it lands rather than simply
         being present. Scale only — no rotation, which would read as playful
         and this identity is not. */
      initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduced ? 0 : 0.5, ease: EASE.entrance }}
    >
      {/*
        Square corners and a butt cap, matching `border-radius: 0` and the cut
        terminals used everywhere else. `pathLength` lets framer animate the
        stroke without hand-computing a dasharray for each shape.
      */}
      <m.rect
        x={BOX.x}
        y={BOX.y}
        width={BOX.size}
        height={BOX.size}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        initial={{ pathLength: reduced ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={draw(0.1, 0.85)}
      />

      {tone === 'pending' ? (
        /* An ellipsis rather than a check: the payment arrived but the order
           has not been confirmed, and a tick would be a claim we cannot make. */
        [38, 60, 82].map((cx, index) => (
          <m.circle
            key={cx}
            cx={cx}
            cy={60}
            r={4}
            fill="currentColor"
            initial={{ opacity: reduced ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={draw(0.75 + index * 0.12, 0.3)}
          />
        ))
      ) : (
        <m.path
          d="M40 61 L54 75 L82 45"
          fill="none"
          stroke="currentColor"
          strokeWidth={5}
          strokeLinecap="butt"
          strokeLinejoin="miter"
          initial={{ pathLength: reduced ? 1 : 0 }}
          // Starts a beat before the box finishes, so the two read as one
          // gesture rather than two animations queued back to back.
          animate={{ pathLength: 1 }}
          transition={draw(0.7, 0.45)}
        />
      )}
    </m.svg>
  );
}
