import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, PerformanceMonitor, PresentationControls, Preload } from '@react-three/drei';
import * as THREE from 'three';
import { Bottle } from './Bottle';
import { Studio } from './Studio';

/**
 * A self-contained 3D slot.
 *
 * The previous build put one `position: fixed` canvas at `z-index: 2` across the
 * whole document, which is why the bottle appeared to hang in front of the page.
 * Here the canvas is `position: absolute; inset: 0` inside whatever box it's
 * given — it cannot paint outside its own card.
 *
 * Two independent canvases rather than drei's `<View>`: `View` scissors a single
 * canvas, which for slots in different page regions means that canvas has to
 * span the viewport — i.e. exactly the fullscreen overlay we're getting rid of,
 * plus its stacking problems (no DOM can interleave in z, and the card can't
 * clip the 3D with `overflow: hidden`). Two contexts is well inside every
 * browser's budget, and all R3F roots already share one rAF.
 */

type BottleStageProps = {
  variant: 'card' | 'showcase';
  className?: string;
};

const CONFIG = {
  card: {
    // Product photography is an 85–105mm equivalent. R3F's unset default is
    // fov 75, which is a fisheye and reads as a toy.
    fov: 24,
    position: [0, 0, 8.4] as [number, number, number],
    exposure: 1.05,
    dprMax: 2,
    envResolution: 384,
    textureSize: 1024,
    segments: 128,
  },
  showcase: {
    fov: 26,
    position: [0, 0, 6.6] as [number, number, number],
    exposure: 1.08,
    dprMax: 1.75,
    envResolution: 512,
    textureSize: 2048,
    segments: 192,
  },
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Trades resolution rather than framerate when the GPU can't keep up. */
function AdaptiveQuality({ max }: { max: number }) {
  const setDpr = useThree((s) => s.setDpr);
  return (
    <PerformanceMonitor
      onIncline={() => setDpr(max)}
      onDecline={() => setDpr(1)}
      onFallback={() => setDpr(1)}
      flipflops={3}
    />
  );
}

/**
 * Grounding.
 *
 * `far` is the height over which the shadow fades out, and drei's default of 10
 * captures the entire bottle at near-uniform alpha — that's the grey blob you
 * see on most implementations. Pulling it to ~0.6 makes the shadow dense at the
 * contact ring and gone by mid-body.
 *
 * Two layers, like a real studio floor: a tight dark contact ring, plus a wide
 * soft occlusion pool. That separation is what reads as contact rather than as
 * a blur. Never pure black — a black shadow on white looks like a pasted
 * sticker.
 */
function Ground({ large, moving }: { large: boolean; moving: boolean }) {
  // A lathe spun about Y is rotationally symmetric, so its shadow never
  // changes and can be baked once. Only the draggable stage, which can tilt,
  // needs a live one.
  const frames = moving ? Infinity : 1;
  return (
    <>
      <ContactShadows
        position={[0, -1.001, 0]}
        scale={large ? 2.6 : 2.2}
        resolution={large ? 1024 : 512}
        far={large ? 0.65 : 0.55}
        blur={large ? 1.4 : 1.6}
        opacity={large ? 0.78 : 0.72}
        color="#101118"
        smooth
        frames={frames}
      />
      <ContactShadows
        position={[0, -1.004, 0]}
        scale={large ? 6.5 : 5}
        resolution={large ? 512 : 256}
        far={large ? 2.4 : 1.9}
        blur={large ? 5 : 4}
        opacity={large ? 0.22 : 0.24}
        color="#171a22"
        smooth
        frames={frames}
      />
    </>
  );
}

export function BottleStage({ variant, className }: BottleStageProps) {
  const host = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const reduced = usePrefersReducedMotion();

  const cfg = CONFIG[variant];
  const isShowcase = variant === 'showcase';

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setLive(entries[0]?.isIntersecting ?? false),
      { rootMargin: '250px 0px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /**
   * Idle motion is an attract loop, and it has to yield the moment someone
   * takes hold of the object.
   *
   * It did not. `Bottle` drives `rotation.y` on a group *inside*
   * `PresentationControls` every single frame — `+=` for spin, and a bare `=`
   * for sway, which is worse because it overwrites rather than accumulates. The
   * controls rotate their own outer group, so the two fought: the idle motion
   * never stopped, and on release `snap` sprang the outer group back to zero and
   * threw the drag away. What was left to look at was the idle spin, which reads
   * exactly like a control that has stopped responding.
   *
   * Once engaged the object stays under the pointer's control. Handing it back
   * on a timer would mean the thing starts moving on its own again while the
   * user is still looking at it, which is the same surprise a second time.
   */
  const idle = isShowcase && !reduced && !engaged;

  const bottle = (
    <Bottle
      spin={idle ? 0.18 : 0}
      sway={reduced || engaged ? 0 : 0.42}
      textureSize={cfg.textureSize}
      segments={cfg.segments}
    />
  );

  return (
    // Always fills its slot. R3F only creates a root once the container has
    // non-zero width AND height — a parent without a definite height gives a
    // silent, error-free blank box.
    <div
      ref={host}
      className={className}
      data-stage={variant}
      /* Surfaced in the DOM so the hand-off from idle motion to user control is
         observable from outside WebGL. Rotation state lives in a three.js scene
         graph a test cannot reach; without this the fix is unverifiable, and an
         unverifiable fix is one refactor from silently coming undone. */
      data-engaged={isShowcase ? engaged : undefined}
      /* Captured on the host rather than through the controls: it must fire on
         the first touch anywhere in the stage, including the empty space the
         controls themselves ignore. */
      onPointerDown={isShowcase ? () => setEngaged(true) : undefined}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Canvas
        // Stops rendering entirely when scrolled away, so two of these on one
        // page cost nothing while you're reading the rest of it.
        frameloop={live ? 'always' : 'never'}
        dpr={[1, cfg.dprMax]}
        camera={{ fov: cfg.fov, position: cfg.position, near: 1, far: 40 }}
        gl={{
          // Transparent, so the card's CSS white shows through. No tone mapper
          // maps 1.0 to #FFFFFF — Neutral gives #F0 — so an in-canvas white
          // could never match the surrounding DOM.
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
          // Khronos PBR Neutral: linear 1:1 between 0.08 and 0.76, which is the
          // band the rim highlights are tuned to land in. ACES compresses
          // everything and can't reach white; AgX washes the blacks out.
          toneMapping: THREE.NeutralToneMapping,
          toneMappingExposure: cfg.exposure,
        }}
        style={{ position: 'absolute', inset: 0, background: 'transparent' }}
      >
        <AdaptiveQuality max={cfg.dprMax} />

        <Suspense fallback={null}>
          <Studio resolution={cfg.envResolution} />

          {/*
            `global` so the whole stage is the drag surface. With it off, drei
            only listens on the mesh itself — you had to land on the bottle's
            silhouette to start rotating, and sliding off it mid-gesture ended
            the drag. That silhouette is a narrow shape in a square box, which is
            a fair target for a cursor and a poor one for a thumb.

            `snap` is gone. It sprang the rotation back to its start on release,
            so on a touchscreen — where the finger lifts as soon as the gesture
            ends — every drag visibly undid itself.
          */}
          {isShowcase ? (
            <PresentationControls
              global
              cursor
              speed={1.1}
              zoom={1}
              polar={[-0.2, 0.2]}
              azimuth={[-Math.PI, Math.PI]}
              damping={0.28}
            >
              {bottle}
            </PresentationControls>
          ) : (
            bottle
          )}

          <Ground large={isShowcase} moving={isShowcase} />

          {/* Compiles the shader up front. The physical program with sheen +
              clearcoat + PMREM env is large, and without this the first visible
              frame stalls for a few hundred ms. */}
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  );
}
