import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Reveal } from '../components/Reveal';
import { Faq } from '../components/Faq';
import { ABOUT_FAQ } from '../data/faq';
import { faqSchema, SITE_ORIGIN, useSeo } from '../seo/useSeo';

/**
 * The brand story page.
 *
 * Structured to the content brief, which writes it as an SEO and answer-engine
 * asset rather than an "about us": the opening sentence of The Gap is composed
 * as a standalone extractable fact, the standards are given as numbers with
 * their sources, and the FAQ at the end is the same data the FAQPage schema is
 * generated from.
 *
 * Tonally it runs dark → light → dark → light so it has the same rhythm as the
 * home page instead of being a wall of text on one plane.
 */

const PILLARS = [
  {
    heading: 'The range',
    text: 'A complete professional makeup range. Not just base, but every category a working artist needs. The current eight products are the starting point.',
  },
  {
    heading: 'Access',
    text: 'Professional-grade performance at a price point that does not gatekeep quality. The same products professionals trust in the studio are available to every customer at the same price.',
  },
  {
    heading: 'Education',
    text: 'Professional makeup education across India. Training centres, certification programmes, and structured courses designed to make professional-level skills accessible to anyone, not just those who can afford premium academies. If you want to learn, there should be a place near you to do it.',
  },
];

/**
 * Four claims, each tied to a specific test or standard. They are displayed as
 * figures because that is the form the evidence actually takes — a rounded
 * marketing number here would undo the point the section is making.
 */
const CREDENTIALS = [
  { figure: '40°C', label: 'Stability tested' },
  { figure: 'IS 4011:2018', label: 'Dermatologically tested' },
  { figure: 'SPF 50.8', label: 'UV transmittance verified' },
  { figure: '3 years', label: 'Shelf life' },
];

export default function About() {
  useSeo({
    title: 'About Chullan | Professional Makeup Brand for Indian Skin',
    description:
      'Chullan is professional base makeup formulated in the USA, manufactured in India. 8 products built for Indian skin tones. Used by salon professionals.',
    canonical: `${SITE_ORIGIN}/about`,
    jsonLd: [faqSchema(ABOUT_FAQ)],
  });

  return (
    <Layout>
      {/* 1 — Hero. Type only: there is no photograph that says this better than
             the sentence does, and a stock image would weaken it. */}
      <section className="section section--void on-dark about__hero">
        <div className="shell">
          <Reveal>
            <p className="eyebrow eyebrow--rule">About Chullan</p>
            <h1 className="display-l about__title">
              Professional makeup brand for Indian skin tones
            </h1>
            <p className="deck about__sub">
              Formulated in the USA. Manufactured in India. Built for the skin that
              other brands forgot.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 2 — The Problem. */}
      <section className="section section--bone">
        <div className="shell prose__shell">
          <Reveal>
            <p className="eyebrow eyebrow--rule">The gap</p>
            <h2 className="h2 section-head__title">
              Indian skin. International shades. The mismatch.
            </h2>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="prose__section">
              {/* Written as a standalone extractable statement — it has to make
                  sense lifted out of the page and quoted on its own. */}
              <p>
                Most makeup brands in India build shade systems for Western
                complexions and extend them into warmer markets. Foundations that
                oxidise, undertones that do not match, shade ranges that treat
                Indian skin as an afterthought.
              </p>
              <p>
                For professional MUAs working in salons, on bridal sets, and in
                studios, this is a daily working problem. Every shade adjustment
                costs time, product, and credibility.
              </p>
              <p>Chullan started with that problem.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3 — The Solution. */}
      <section className="section section--void on-dark">
        <div className="shell prose__shell">
          <Reveal>
            <p className="eyebrow eyebrow--rule">Why Chullan</p>
            <h2 className="h2 section-head__title">Built for Indian skin. Not adapted.</h2>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="prose__section">
              <p>
                Chullan started where most brands do not. With Indian undertones as
                the starting point, not the afterthought. The shade system was built
                from the ground up for the way Indian skin reflects light, holds
                colour, and responds to heat and humidity. Formulated in the USA for
                performance. Manufactured in India for accessibility. Designed as one
                complete system so professionals do not have to piece together
                products from five different brands.
              </p>
            </div>
            <Link className="btn btn--primary about__cta" to="/shop">
              Explore the range
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 4 — The Vision. */}
      <section className="section section--paper">
        <div className="shell">
          <Reveal className="section-head" as="header">
            <div>
              <p className="eyebrow eyebrow--rule">Chullan&rsquo;s vision</p>
              <h2 className="h2 section-head__title">Products. Education. Access.</h2>
            </div>
          </Reveal>

          <div className="pillars">
            {PILLARS.map((pillar, index) => (
              <Reveal className="pillar" key={pillar.heading} delay={index * 0.07}>
                <h3 className="pillar__heading">{pillar.heading}</h3>
                <p className="pillar__text">{pillar.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — Quality & Standards. */}
      <section className="section section--bone">
        <div className="shell">
          <Reveal className="prose__shell">
            <p className="eyebrow eyebrow--rule">The standards</p>
            <h2 className="h2 section-head__title">Tested. Certified. Documented.</h2>
            <div className="prose__section">
              <p>
                The Chullan range is tested against Indian and international quality
                standards before it reaches a salon, a studio, or a customer.
              </p>
              <p>
                The foundation range is stability tested at 40°C and conforms to
                IS 14318:1996. The Moisturiser and Sunscreen are dermatologically
                tested under IS 4011:2018 guidelines, classified Non-Irritant. The
                Sunscreen SPF 50 rating is verified through UV transmittance
                analysis.
              </p>
              <p>Not label claims. Documented.</p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <dl className="creds">
              {CREDENTIALS.map((credential) => (
                <div className="cred" key={credential.label}>
                  <dt className="cred__figure">{credential.figure}</dt>
                  <dd className="cred__label">{credential.label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* 6 — FAQ. Same component and same data the home page uses. */}
      <Faq eyebrow="FAQ" title="About Chullan" items={ABOUT_FAQ} id="faq" />
    </Layout>
  );
}
