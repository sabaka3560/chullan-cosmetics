import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Reveal } from '../components/Reveal';
import { ingredientsForCatalog } from '../data/ingredients';

/**
 * Full ingredient disclosures for every product.
 *
 * Built on the same shell as the policy pages rather than as its own layout.
 * This is reference material a buyer arrives at with a specific question —
 * "does this contain talc" — and it should read like the returns policy, not
 * like a product page trying to sell them something on the way past.
 *
 * The lists render as paragraphs, not bullets, because they are stored as one
 * string each. See the note in `data/ingredients.ts`: splitting on commas
 * destroys `1,3 butylene glycol`, and a mangled ingredient on a page somebody
 * checks for allergens is a worse failure than an unfashionable paragraph.
 */
export default function Ingredients() {
  const products = ingredientsForCatalog();

  return (
    <Layout>
      <article className="section section--bone prose">
        <div className="shell prose__shell">
          <Reveal>
            <p className="eyebrow eyebrow--rule">Reference</p>
            <h1 className="h2 section-head__title">Ingredients</h1>
            <p className="deck section-head__deck">
              The full list for every product we make, exactly as supplied by the
              manufacturer. If you have a known sensitivity, read the relevant
              list before use rather than relying on the summary on a product
              page.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            {products.map((product) => (
              <section className="prose__section" key={product.id}>
                <h2 className="h3">
                  {/* Linked back to the product, because somebody who has just
                      satisfied themselves about an ingredient is one click from
                      buying it, and making them navigate back is a small
                      insult.

                      NOT `card__link`, which was the first thing tried here.
                      That class carries a stretched `::after` (`inset: 0`) so a
                      whole product card is clickable; dropped into a text page
                      it expands to the nearest positioned ancestor instead —
                      the article — and the last heading in the DOM ends up
                      covering every one above it. The measured result was that
                      clicking anywhere in Foundation's ingredient list
                      navigated to /product/sunscreen, and no text on the page
                      could be selected. */}
                  <Link to={`/product/${product.id}`} className="ingredients__link">
                    {product.name}
                  </Link>
                </h2>
                <p className="ingredients__size">{product.size}</p>
                <p className="ingredients__list">{product.list}</p>
              </section>
            ))}

            <section className="prose__section">
              <h2 className="h3">Reformulation</h2>
              <p>
                Formulations change. The list printed on the carton you receive
                is the authority for the product in your hand — this page
                reflects the current formulation and is updated when it changes,
                but a jar bought earlier may differ.
              </p>
            </section>
          </Reveal>
        </div>
      </article>
    </Layout>
  );
}
