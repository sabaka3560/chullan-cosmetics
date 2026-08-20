import { useState } from 'react';
import { m } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { Reveal } from './Reveal';
import { VIEWPORT_TALL } from '../motion/tokens';
import { LazyBottleStage } from '../three/LazyBottleStage';

/**
 * TODO — CONFIRM WITH THE MANUFACTURER BEFORE LAUNCH.
 *
 * The original list described a soft-touch injection-moulded PP bottle with
 * screen-printed white ink. The actual pack in the 2026 catalogue is tinted
 * glass with a black pump and dark printing, so every one of those four specs
 * was describing a product that does not exist.
 *
 * What is left below is only what can be read off the catalogue photographs and
 * pack copy. Fill and pump-count figures in particular are the sort of claim a
 * buyer measures you against, so they stay out until someone confirms them.
 */
const SPECS = [
  {
    label: '30ml / 1.0 fl oz',
    value: 'Foundation, Concealer and Primer. Consistent professional sizing across the base range.',
  },
  {
    label: 'Pump dispenser',
    value:
      'Sealed pump keeps the formula protected from air and direct contact. No contamination, no waste, no oxidation between uses.',
  },
  {
    label: 'Printed direct',
    value: 'Pack copy prints onto the glass itself rather than onto a wrap label.',
  },
  {
    // TODO — the brief flags this one as unconfirmed: it depends on whether the
    // bottles are in fact tinted per shade. Ratheesh to confirm before launch.
    label: 'Shade-matched',
    value: 'Each bottle is tinted to its own shade, so the pack reads as the product.',
  },
];

/**
 * Pure `--paper`, not bone. The section is deliberately the product card scaled
 * to full width: same white, same hairlines, same caption voice. That's what
 * makes the card in the grid above feel native to the page rather than bolted
 * onto it.
 */
export function Showcase() {
  const [held, setHeld] = useState(false);

  return (
    <section className="section section--lg section--paper" id="detail">
      <div className="shell">
        <div className="showcase__grid">
          <Reveal viewport={VIEWPORT_TALL}>
            {/*
              The idle float stops the moment someone takes hold of the bottle,
              for the same reason the bottle's own idle spin does: the object
              inside this box is draggable, and a container that keeps drifting
              under the finger fights the gesture it is meant to invite.

              It also means the element eventually comes to rest. An animation
              with `repeat: Infinity` never settles, which costs compositor work
              for as long as the page is open.
            */}
            <m.div
              className="showcase__stage"
              onPointerDown={() => setHeld(true)}
              animate={held ? { y: 0 } : { y: [0, -15, 0] }}
              transition={
                held
                  ? { duration: 0.4, ease: 'easeOut' }
                  : { duration: 6, repeat: Infinity, ease: 'easeInOut' }
              }
              style={{ position: 'relative' }}
            >
              <div className="showcase__glow" />
              <LazyBottleStage variant="showcase" className="card__stage" />
              <span className="showcase__badge">
                <RotateCcw size={12} strokeWidth={2} />
                Drag to rotate
              </span>
            </m.div>
          </Reveal>

          <div>
            <Reveal delay={0.08}>
              <p className="eyebrow eyebrow--rule">The formulation</p>
              <h2 className="h2 section-head__title">Made for Indian skin</h2>
              <p className="deck section-head__deck">
                Eight products. One system. Every formula built to perform on Indian
                undertones — in Indian heat, Indian humidity, and under professional
                studio demands. Formulated in the USA, manufactured in India.
              </p>
            </Reveal>

            <Reveal delay={0.14}>
              <dl className="spec-list">
                {SPECS.map((spec, i) => (
                  <div className="spec" key={spec.label}>
                    <dt className="spec__index">{String(i + 1).padStart(2, '0')}</dt>
                    <dd>
                      <p className="spec__label">{spec.label}</p>
                      <p className="spec__value">{spec.value}</p>
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
