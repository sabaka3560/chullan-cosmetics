import { Layout } from '../components/Layout';
import { Hero } from '../components/Hero';
import { Ticker } from '../components/Ticker';
import { BestSellers } from '../components/BestSellers';
import { Showcase } from '../components/Showcase';
import { Essentials } from '../components/Essentials';
import { Lifestyle } from '../components/Lifestyle';
import { Faq } from '../components/Faq';
import { Newsletter } from '../components/Newsletter';
import { HOME_FAQ } from '../data/faq';
import { faqSchema, SITE_ORIGIN, useSeo } from '../seo/useSeo';

/**
 * Tonal rhythm, top to bottom:
 *
 *   announce · hero · ticker   DARK   ← one cinematic chapter, not three sections
 *   best sellers               bone
 *   showcase                   paper
 *   essentials                 DARK
 *   lifestyle band             DARK image
 *   reviews                    paper
 *   faq                        bone
 *   newsletter                 bone-2
 *   footer                     DARK
 *
 * Roughly 70% of the page by area is light, which is the point: black becomes
 * expensive by being rationed. The all-black original had nowhere left to go.
 *
 * The first cut lands after the ticker rather than after the hero, so the
 * transition happens between two flat planes. Cutting straight from a
 * photograph to a flat colour leaves a seam, and a seam is what makes a page
 * read as assembled.
 *
 * Best Sellers (bone) → Showcase (paper) is a deliberate 11-point lift with no
 * rule between them: it reads as zooming into the product before the page cuts
 * back to black.
 *
 * The announce bar, nav and footer moved into `Layout` once there was more than
 * one page — the rhythm above still starts at the hero.
 */
export default function Home() {
  useSeo({
    title: 'Chullan | Professional Makeup for Indian Skin Tones',
    description:
      'Professional base makeup formulated in the USA for Indian skin tones. 8 foundation shades, salon-grade primer, anti-shine powder, setting spray, and more. Built for Indian conditions.',
    canonical: `${SITE_ORIGIN}/`,
    jsonLd: [faqSchema(HOME_FAQ)],
  });

  return (
    <Layout>
      <Hero />
      <Ticker />
      <Showcase />
      <BestSellers />
      <Essentials />
      <Lifestyle />
      {/* Testimonials are unmounted, not deleted — `components/Reviews.tsx` is
          intact and ready for real, attributable quotes. Every one it carried
          was written to fill the layout, and the brief labelled them with
          professional roles, which turns an invented sentence into a sourced
          endorsement. That is a misleading representation under the Consumer
          Protection (E-Commerce) Rules now that the store takes real money.
          Restoring it is one import and one line. */}
      <Faq eyebrow="Questions" title="Frequently asked" items={HOME_FAQ} id="faq" />
      <Newsletter />
    </Layout>
  );
}
