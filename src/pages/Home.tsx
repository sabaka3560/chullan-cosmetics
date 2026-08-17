import { Layout } from '../components/Layout';
import { Hero } from '../components/Hero';
import { Ticker } from '../components/Ticker';
import { BestSellers } from '../components/BestSellers';
import { Showcase } from '../components/Showcase';
import { Essentials } from '../components/Essentials';
import { Lifestyle } from '../components/Lifestyle';
import { Reviews } from '../components/Reviews';
import { Newsletter } from '../components/Newsletter';

/**
 * Tonal rhythm, top to bottom:
 *
 *   announce · hero · ticker   DARK   ← one cinematic chapter, not three sections
 *   best sellers               bone
 *   showcase                   paper
 *   essentials                 DARK
 *   lifestyle band             DARK image
 *   reviews                    paper
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
  return (
    <Layout>
      <Hero />
      <Ticker />
      <Showcase />
      <BestSellers />
      <Essentials />
      <Lifestyle />
      <Reviews />
      <Newsletter />
    </Layout>
  );
}
