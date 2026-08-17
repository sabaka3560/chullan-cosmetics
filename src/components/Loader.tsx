import { useEffect } from 'react';
import { m, useAnimation } from 'framer-motion';

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
            border: '2px solid rgba(243, 241, 237, 0.4)',
            padding: '16px 32px',
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

          {/* Text inside the rectangle with difference blending */}
          <span
            className="wordmark"
            style={{
              display: 'block',
              fontSize: '2.5rem',
              letterSpacing: '0.2em',
              color: 'var(--void-ink)',
              margin: 0,
              lineHeight: 1,
              position: 'relative',
              zIndex: 1,
              mixBlendMode: 'difference'
            }}
          >
            CHULLAN
          </span>
        </m.div>
      </div>
    </m.div>
  );
}
