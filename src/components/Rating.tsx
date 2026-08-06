/**
 * Star rating.
 *
 * Ink rather than gold. This is the least brand-controlled element on a product
 * card, and making it the page's only chromatic object would spend the entire
 * colour budget on the one component that reads as a review-app widget. Ink
 * stars read as engraved, and they clear AA everywhere the card can sit.
 *
 * Partial fills come from clipping a duplicated row, so 4.7 renders as 4.7.
 */

const STAR = 11;

function Stars() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          width={STAR}
          height={STAR}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          style={{ display: 'inline-block', verticalAlign: 'top', marginRight: 2 }}
        >
          <path d="M12 1.8l3.1 6.28 6.93 1.01-5.02 4.89 1.19 6.9L12 17.62l-6.2 3.26 1.19-6.9L1.97 9.09 8.9 8.08z" />
        </svg>
      ))}
    </>
  );
}

export function Rating({ value, count }: { value: number; count: number }) {
  const clamped = Math.max(0, Math.min(5, value));

  return (
    <div className="rating" role="img" aria-label={`Rated ${value} out of 5 from ${count} reviews`}>
      <span className="rating__stars">
        <Stars />
        <span className="rating__fill" style={{ width: `${(clamped / 5) * 100}%` }}>
          <Stars />
        </span>
      </span>
      {/* Parentheses rather than "128 reviews" — shorter, aligns to the price
          better, and reads as an annotation instead of a claim. */}
      <span className="rating__count">({count})</span>
    </div>
  );
}
