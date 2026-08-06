import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import posterImg from '../assets/bottle.png';

/**
 * three + drei are ~1MB of the bundle. Loading them eagerly would hold up first
 * paint for a card that may never be scrolled to, so the stage is split out and
 * only imported once its slot is close to the viewport.
 *
 * Until then the slot shows the studio photograph of the same bottle. The box
 * is never empty, nothing reflows when WebGL takes over, and if a device can't
 * run it at all the card just stays a normal product photo.
 */

const BottleStage = lazy(() =>
  import('./BottleStage').then((m) => ({ default: m.BottleStage })),
);

type LazyBottleStageProps = {
  variant: 'card' | 'showcase';
  className?: string;
};

function Poster({ fade }: { fade: boolean }) {
  return (
    <img
      src={posterImg}
      alt=""
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        opacity: fade ? 0 : 1,
        transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        pointerEvents: 'none',
      }}
    />
  );
}

export function LazyBottleStage({ variant, className }: LazyBottleStageProps) {
  const host = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setNear(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Hold the poster for a beat after mount so the first WebGL frame — which
  // includes baking the environment and the label texture — has landed before
  // we cross-fade. Swapping on mount alone shows one blank frame.
  useEffect(() => {
    if (!near) return;
    const t = window.setTimeout(() => setReady(true), 420);
    return () => window.clearTimeout(t);
  }, [near]);

  return (
    <div ref={host} className={className} style={{ position: 'absolute', inset: 0 }}>
      {near && (
        <Suspense fallback={null}>
          <BottleStage variant={variant} />
        </Suspense>
      )}
      <Poster fade={ready} />
    </div>
  );
}
