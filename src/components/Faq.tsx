import { Reveal } from './Reveal';
import type { FaqItem } from '../data/faq';

/**
 * Native `<details>`, not a React-controlled accordion.
 *
 * The brief's requirement is that every answer sits in the HTML source so it
 * can be indexed, and this is the one disclosure pattern where that is
 * guaranteed rather than arranged: the text is in the markup whether the panel
 * is open or shut, the keyboard behaviour and the expanded/collapsed semantics
 * come from the browser, and it works with no JavaScript at all.
 *
 * A hand-rolled version would need `aria-expanded`, `aria-controls`, key
 * handling, and a decision about whether collapsed text stays in the
 * accessibility tree — three of which are easy to get subtly wrong and the
 * fourth of which pits indexability against screen-reader correctness.
 *
 * The trade is animation: a UA stops rendering closed `<details>` content, so
 * there is nothing to transition on browsers without `::details-content`. Those
 * browsers get an instant open, which is a fair price for markup that is
 * correct everywhere.
 */
export function Faq({
  eyebrow,
  title,
  items,
  id,
}: {
  eyebrow: string;
  title: string;
  items: FaqItem[];
  id?: string;
}) {
  return (
    <section className="section section--bone cv-auto" id={id}>
      <div className="shell">
        <Reveal className="section-head" as="header">
          <div>
            <p className="eyebrow eyebrow--rule">{eyebrow}</p>
            <h2 className="h2 section-head__title">{title}</h2>
          </div>
        </Reveal>

        <div className="faq">
          {items.map((item, index) => (
            <Reveal key={item.q} delay={Math.min(index, 4) * 0.05}>
              <details className="faq__item">
                <summary className="faq__q">
                  <span>{item.q}</span>
                  {/* A plus that becomes a minus. Drawn rather than typed so it
                      stays optically centred and matches the hairline weight
                      used everywhere else. */}
                  <i className="faq__mark" aria-hidden="true" />
                </summary>
                <div className="faq__a">
                  <p>{item.a}</p>
                </div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
