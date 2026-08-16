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
    value: 'The same fill across Foundation, Concealer and the Primer for men.',
  },
  {
    label: 'Tinted glass',
    value: 'Weighted glass body with a lacquered black pump and over-cap.',
  },
  {
    label: 'Printed direct',
    value: 'Pack copy prints onto the glass itself rather than onto a wrap label.',
  },
  {
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
  return (
    <section className="section section--lg section--paper" id="detail">
      <div className="shell">
        <div className="showcase__grid">
          <Reveal viewport={VIEWPORT_TALL}>
            <div className="showcase__stage">
              <LazyBottleStage variant="showcase" className="card__stage" />
              <span className="showcase__badge">
                <RotateCcw size={12} strokeWidth={2} />
                Drag to rotate
              </span>
            </div>
          </Reveal>

          <div>
            <Reveal delay={0.08}>
              <p className="eyebrow eyebrow--rule">The object</p>
              <h2 className="h2 section-head__title">Designed for the Chullan</h2>
              <p className="deck section-head__deck">
                Every part of the bottle is crafted to match the elegance of a true
                South Indian gentleman. Turn it over — this is the actual geometry,
                rendered live in your browser, not a spin of photographs.
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
