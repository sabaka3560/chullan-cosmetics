import { Link, Navigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Reveal } from '../components/Reveal';
import { legalEntity, policies, policyBySlug } from '../data/policies';

/**
 * One component for all four policy pages — they differ only in content, and
 * four near-identical page files would drift apart the first time one of them
 * gets a layout fix.
 */
export default function Policy() {
  const { slug } = useParams();
  const policy = slug ? policyBySlug(slug) : undefined;

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
                <div>
                  <dt>Customer care</dt>
                  <dd>
                    {legalEntity.email} · {legalEntity.phone}
                  </dd>
                </div>
                <div>
                  <dt>Grievance Officer</dt>
                  <dd>
                    {legalEntity.grievanceOfficer} · {legalEntity.grievanceEmail}
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
