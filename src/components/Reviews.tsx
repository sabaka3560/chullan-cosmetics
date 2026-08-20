import { Rating } from './Rating';
import { Link } from 'react-router-dom';
import { Reveal } from './Reveal';

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ PLACEHOLDER — THESE TESTIMONIALS ARE NOT REAL.                           │
 * │                                                                          │
 * │ Every quote, name and star rating below is written copy. The content     │
 * │ brief renamed the badge from "Verified buyer" to professional roles      │
 * │ (Salon professional, Bridal MUA, Makeup artist), which makes an invented │
 * │ quote read as a sourced professional endorsement — a materially stronger │
 * │ claim, and one the Consumer Protection (E-Commerce) Rules 2020 treat as  │
 * │ a misleading representation if it is not genuine.                        │
 * │                                                                          │
 * │ Replace with real, attributable reviews before launch, or remove the     │
 * │ section. Do not ship invented ones under a professional badge.           │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
const REVIEWS = [
  {
    quote:
      'The shade range actually covers my clients. I am not mixing two foundations to get a match any more.',
    name: 'Placeholder name',
    tag: 'Salon professional',
    rating: 5,
    count: 1,
  },
  {
    quote:
      'Held through a full wedding day — ceremony, photographs, and the reception — without a touch-up.',
    name: 'Placeholder name',
    tag: 'Bridal MUA',
    rating: 5,
    count: 1,
  },
  {
    quote:
      'The corrector palette does the work of three products I used to carry in the kit.',
    name: 'Placeholder name',
    tag: 'Makeup artist',
    rating: 5,
    count: 1,
  },
];

/** Third-party validation, placed right after the emotional peak of the band. */
export function Reviews() {
  return (
    <section className="section section--paper cv-auto">
      <div className="shell">
        <Reveal className="section-head" as="header">
          <div>
            <p className="eyebrow eyebrow--rule">What people say</p>
            <h2 className="h2 section-head__title">Trusted by professionals</h2>
            <p className="deck section-head__deck">
              Salon professionals and makeup artists across India use Chullan as
              their working base range. Here is what they say.
            </p>
          </div>
          <Link className="btn--ghost" to="/reviews">Read all</Link>
        </Reveal>

        <div className="reviews">
          {REVIEWS.map((review, i) => (
            <Reveal className="review" key={review.tag} delay={i * 0.07}>
              <Rating value={review.rating} count={review.count} />
              <blockquote>&ldquo;{review.quote}&rdquo;</blockquote>
              <p className="review__by">
                <span className="review__name">{review.name}</span>
                <span className="review__tag">{review.tag}</span>
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
