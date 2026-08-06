import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import './index.css';
import './styles/components.css';
import App from './App';
import { EASE } from './motion/tokens';

/**
 * `domAnimation` ships the renderer plus animations, variants, exits and the
 * hover/tap/focus/in-view gestures — everything this page uses — at roughly a
 * fifth of the size of the full `motion` bundle. `strict` throws in dev if a
 * `motion.*` import sneaks back in and quietly defeats the split.
 *
 * It also deliberately excludes layout projection, which must never run near a
 * WebGL canvas: it reads getBoundingClientRect every layout-affecting render
 * and writes compensating transforms every frame.
 *
 * `reducedMotion="user"` makes framer resolve positional keys instantly while
 * leaving opacity animating, so every reveal on the page degrades to a clean
 * crossfade rather than disappearing.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: EASE.editorial }}>
        <App />
      </MotionConfig>
    </LazyMotion>
  </StrictMode>,
);
