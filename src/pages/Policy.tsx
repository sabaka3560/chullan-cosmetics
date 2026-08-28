import { Link, Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Reveal } from '../components/Reveal';
import { legalEntity, policies, policyBySlug } from '../data/policies';

/**
 * One component for all four policy pages — they differ only in content, and
 * four near-identical page files would drift apart the first time one of them
 * gets a layout fix.
 *
 * The slug arrives as a prop rather than from `useParams`. The routes are
 * enumerated as static paths (`/shipping`) so they cannot swallow unknown URLs
 * ahead of the 404 route — and a static path declares no params, so `useParams`
 * returned an empty object and every policy page silently redirected home.
 * Passing it explicitly makes the route and the component agree by construction.
 */
export default function Policy({ slug }: { slug: string }) {
  const policy = policyBySlug(slug);

  if (!policy) return <Navigate to="/" replace />;

  return (
    <Layout>
      <article className="section section--bone prose">
        <div className="shell prose__shell">
          <Reveal>
            <p className="eyebrow eyebrow--rule">{policy.eyebrow}</p>
            <h1 className="h2 section-head__title">{policy.title}</h1>
            <p className="deck section-head__deck">{policy.intro}</p>
          </Reveal>

          <Reveal delay={0.08}>
            {policy.sections.map((section) => (
              <section className="prose__section" key={section.heading}>
                <h2 className="h3">{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}

            {/* Repeated on every policy page rather than hidden behind a
                Contact link: the e-commerce rules require these details to be
                displayed, and a buyer chasing a complaint should not have to
                navigate to find who to write to. */}
            <section className="prose__section prose__entity">
              <h2 className="h3">Seller & grievance details</h2>
              <dl>
                <div>
                  <dt>Legal entity</dt>
                  <dd>{legalEntity.name}</dd>
                </div>
                <div>
                  <dt>Registered address</dt>
                  <dd>{legalEntity.address}</dd>
                </div>
                {/* Returns go to a different address, and to a different
                    entity, than the registered one above. Stated here rather
                    than only in the Returns policy text, because this block is
                    the part buyers actually copy from. */}
                <div>
                  <dt>Returns address</dt>
                  <dd>
                    {legalEntity.returnsAddressee}, {legalEntity.returnsAddress}
                  </dd>
                </div>
                {/* Each contact detail is its own `.atom`, so a line break is
                    taken at a separator rather than through the middle of a
                    phone number — "+91 79941" on one line and "31777" on the
                    next is not a number anybody can ring. */}
                <div>
                  <dt>Customer care</dt>
                  <dd>
                    <span className="atom">{legalEntity.email}</span>
                    {legalEntity.customerCarePhones.map((phone) => (
                      <span key={phone}>
                        {' · '}
                        <span className="atom">{phone}</span>
                      </span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt>Grievance Officer</dt>
                  <dd>
                    <span className="atom">{legalEntity.grievanceOfficer}</span>
                    {' · '}
                    <span className="atom">{legalEntity.grievanceEmail}</span>
                    {' · '}
                    <span className="atom">{legalEntity.phone}</span>
                  </dd>
                </div>
                <div>
                  <dt>GSTIN</dt>
                  <dd className="mono">{legalEntity.gstin}</dd>
                </div>
                <div>
                  <dt>Country of origin</dt>
                  <dd>{legalEntity.countryOfOrigin}</dd>
                </div>
              </dl>
            </section>

            <nav className="prose__nav" aria-label="Other policies">
              {policies
                .filter((other) => other.slug !== policy.slug)
                .map((other) => (
                  <Link key={other.slug} to={`/${other.slug}`} className="btn--ghost">
                    {other.title}
                  </Link>
                ))}
            </nav>
          </Reveal>
        </div>
      </article>
    </Layout>
  );
}
