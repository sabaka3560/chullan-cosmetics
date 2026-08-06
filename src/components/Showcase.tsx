import { RotateCcw } from 'lucide-react';
import { Reveal } from './Reveal';
import { VIEWPORT_TALL } from '../motion/tokens';
import { LazyBottleStage } from '../three/LazyBottleStage';

const SPECS = [
  {
    label: 'Soft-touch shell',
    value:
      'Injection-moulded PP under a matte elastomer coat. No gloss, no fingerprints, no shine-through.',
  },
  {
    label: 'Airless pump',
    value:
      'Vacuum-sealed dispensing keeps the formula stable to the last dose. Ships with a locking collar.',
  },
  {
    label: '30ml / 1.0 fl oz',
    value: 'Roughly 220 pumps. Sized to clear cabin baggage limits without decanting.',
  },
  {
    label: 'Screen-printed',
    value: 'Two-pass white ink, cured — not a wrap label. It will not peel in a wet bathroom.',
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
              <h2 className="h2 section-head__title">Engineered in detail</h2>
              <p className="deck section-head__deck">
                Every part of the bottle is drawn to the same brief as the formula
                inside it. Turn it over — this is the actual geometry, rendered live
                in your browser, not a spin of photographs.
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
