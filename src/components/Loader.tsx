import { useEffect } from 'react';
import { m, useAnimation } from 'framer-motion';
import logoBone from '../assets/logo-bone.png';

export function Loader({ onComplete }: { onComplete: () => void }) {
  const containerControls = useAnimation();
  const textControls = useAnimation();
  const fillControls = useAnimation();

  useEffect(() => {
    async function sequence() {
      // 1. Text container fades in
      await textControls.start({
        opacity: 1,
        transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
      });
      
      // 2. The fill cleanly sweeps from left to right without cutting the logo
      await fillControls.start({
        width: '100%',
        transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] }
      });

      // 4. Short pause to appreciate the inverted logo
      await new Promise(r => setTimeout(r, 200));
      
      // 5. Fade the entire logo block out
      await textControls.start({ opacity: 0, scale: 0.95, transition: { duration: 0.3, ease: 'easeOut' } });

      // 6. Slide the ENTIRE dark screen up to reveal the site (no cutting from center)
      await containerControls.start({
        y: '-100vh',
        transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] }
      });
      
      onComplete();
    }
    sequence();
  }, [containerControls, textControls, fillControls, onComplete]);

  return (
    <m.div
      /* Decorative chrome, so it stays out of the accessibility tree entirely.
         It previously carried the page's only <h1> during load, which made the
         first heading a crawler or screen reader met "CHULLAN" rather than the
         actual page title. `data-intro` is the hook tests use to tell the
         overlay apart from real page content. */
      data-intro
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        background: 'var(--ink)'
      }}
      animate={containerControls}
    >
      {/* Center content */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <m.div 
          style={{
            position: 'relative',
            /* No drawn border: the artwork carries its own rule box, and the CSS
               one sat a few pixels outside it as a second frame. The wrapper
               stays because the fill still needs something clipped to sweep
               inside. */
            padding: '10px 18px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1
          }}
          initial={{ opacity: 0 }}
          animate={textControls}
        >
          {/* The solid filling background */}
          <m.div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: '0%',
              background: 'var(--void-ink)',
              zIndex: 0,
            }}
            animate={fillControls}
          />

          {/*
            The logo, blended the same way the wordmark was.

            `mixBlendMode: difference` is what makes this work, and it is why the
            *bone* copy is used rather than the supplied black artwork. Against
            the dark ground the light mark stays light; as the bone fill sweeps
            underneath, difference flips it to near-black. One image reads as two
            colours, and the letterforms invert exactly on the fill's edge —
            which was the whole point of the original effect.

            The black original would have done the opposite: invisible on the
            dark ground, then appearing only once the fill arrived.
          */}
          <img
            src={logoBone}
            alt=""
            width={900}
            height={425}
            style={{
              display: 'block',
              height: 'clamp(46px, 11vw, 72px)',
              width: 'auto',
              position: 'relative',
              zIndex: 1,
              mixBlendMode: 'difference'
            }}
          />
        </m.div>
      </div>
    </m.div>
  );
}
