import { Rating } from './Rating';
import { Reveal } from './Reveal';

const REVIEWS = [
  {
    quote: 'Third one I have bought. Nobody at work has noticed, which is the entire point.',
    name: 'Arjun M.',
    tag: 'Verified buyer',
    rating: 5,
    count: 1,
  },
  {
    quote: 'Survived a fourteen-hour shift and a monsoon commute without sliding off my face.',
    name: 'Daniel R.',
    tag: 'Verified buyer',
    rating: 5,
    count: 1,
  },
  {
    quote: 'Took two tries to find my shade. Support sorted the exchange in a day.',
    name: 'Kwame A.',
    tag: 'Verified buyer',
    rating: 4,
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
            <h2 className="h2 section-head__title">4.8 from 456 reviews</h2>
          </div>
          <a className="btn--ghost" href="#">Read all</a>
        </Reveal>

        <div className="reviews">
          {REVIEWS.map((review, i) => (
            <Reveal className="review" key={review.name} delay={i * 0.07}>
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
