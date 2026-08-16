const ITEMS = [
  'Luminous matte finish',
  'Non-comedogenic',
  'Dermatologist tested',
  'Fragrance free',
  'Cruelty free',
  'Built for the Chullan',
];

/**
 * Two identical tracks translated by -50% — the loop point lands exactly where
 * the second copy replaces the first, so it never jumps. Kept in CSS rather
 * than framer-motion: it's a compositor-only animation that should keep running
 * without any JS on the main thread while WebGL is drawing next to it.
 */
export function Ticker() {
  const group = (
    <div className="ticker__group" aria-hidden="true">
      {ITEMS.map((item) => (
        <span className="ticker__item" key={item}>
          {item}
        </span>
      ))}
    </div>
  );

  return (
    <div className="ticker">
      <p className="sr-only">{ITEMS.join('. ')}.</p>
      <div className="ticker__track">
        {group}
        {group}
      </div>
    </div>
  );
}
