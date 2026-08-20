/**
 * FAQ copy, kept as data because it is rendered twice: once as an accordion a
 * person reads, and once as FAQPage JSON-LD a machine reads. Two hand-written
 * copies of the same answer is exactly how the two drift apart, and a schema
 * that disagrees with the page it describes is a structured-data violation
 * rather than a typo.
 *
 * Source: the client's website content brief (Chullan Website Content, Part 1).
 */
export type FaqItem = { q: string; a: string };

export const HOME_FAQ: FaqItem[] = [
  {
    q: 'What is Chullan?',
    a: 'Chullan is a professional base makeup brand formulated in the USA and manufactured in India. The range includes eight products, moisturiser, sunscreen, primer, liquid foundation, concealer, colour corrector palette, anti-shine setting powder, and setting spray, all designed specifically for Indian skin tones and tested to perform in Indian climate conditions.',
  },
  {
    q: 'How many foundation shades does Chullan offer?',
    a: 'Chullan offers eight liquid foundation shades spanning fair neutral to deep warm undertones. The range includes two formulation tiers: the Professional Base line and the Pro Glow range with enhanced luminosity. All eight shades are purpose-built for the full spectrum of Indian skin tones, not adapted from Western shade systems.',
  },
  {
    q: 'Is Chullan makeup only for professionals?',
    a: 'Chullan is built to professional salon-grade standards and is used daily by makeup artists, salons, and beauty academies across India. The range is equally designed for anyone who wants professional-quality base makeup, whether for daily wear, bridal occasions, events, or professional work. The same products professionals reach for are available to every customer.',
  },
  {
    q: 'Where is Chullan makeup formulated and manufactured?',
    a: 'Chullan is formulated in the USA and manufactured in India. The products are stability tested at 40°C, conform to IS 14318:1996, and carry a three-year shelf life from date of manufacture. The Moisturiser and Sunscreen have additionally undergone dermatological testing under IS 4011:2018 guidelines and are classified as Non-Irritant.',
  },
  {
    q: 'Is Chullan suitable for oily skin in humid weather?',
    a: 'The Anti-Shine Powder is a talc-based setting powder available in four shades, Banana, Beige, Light Pink, and White, designed for oil control and a smooth matte finish. The Setting Spray uses an alcohol-free, silicone film-forming formula that professionals trust to hold makeup through long events and humid conditions. Together, they form a setting system built for Indian weather.',
  },
  {
    q: 'Is Chullan dermatologically tested?',
    a: 'The Chullan Moisturiser and Sunscreen SPF 50 have been dermatologically tested under IS 4011:2018 guidelines by a registered dermatologist. Both products were tested on 26 participants, men and women aged 18 to 55, and classified as Non-Irritant with zero adverse events.',
  },
];

export const ABOUT_FAQ: FaqItem[] = [
  {
    q: 'What quality standards does Chullan test against?',
    a: 'The range is stability tested at 40°C and conforms to IS 14318:1996 with a three-year shelf life. The Moisturiser and Sunscreen comply with IS 6608:2004 covering pH, thermal stability, heavy metal limits, and microbiological purity.',
  },
  {
    q: 'What does dermatologically tested mean for Chullan?',
    a: 'The Moisturiser and Sunscreen underwent a skin irritation patch test under IS 4011:2018 guidelines, supervised by a registered dermatologist. Both classified Non-Irritant. Zero adverse events.',
  },
  {
    q: 'How is the SPF 50 rating verified?',
    a: 'Tested at 50.8 via UV transmittance analysis and documented in a Certificate of Analysis. Chemical UV filters, Octinoxate, Avobenzone, Oxybenzone.',
  },
  {
    q: 'Does Chullan offer makeup education?',
    a: "Chullan's long-term vision includes professional makeup education institutions, certification programmes, and a franchise network across India.",
  },
];

export const SHOP_FAQ: FaqItem[] = [
  {
    q: 'What products do I need for a complete base makeup routine?',
    a: 'A complete professional base routine follows eight steps: moisturise, protect (sunscreen), prime, colour correct, conceal, foundation, set with powder, and lock with setting spray. This sequence is the same routine used by professional MUAs in salon and bridal settings. The Chullan range covers all eight steps in one system, every product formulated to work with the next.',
  },
  {
    q: 'Does Chullan work on oily skin in humid weather?',
    a: 'The Anti-Shine Powder is talc-based and designed for oil control. The Setting Spray uses an alcohol-free silicone film-forming formula built for Indian humidity. Together they form a setting combination that professional MUAs trust through long events and outdoor sessions. The Moisturiser can be used in smaller quantities for oily skin types.',
  },
  {
    q: 'Can I buy individual products or do I need the full set?',
    a: 'Every product works on its own and can be purchased individually. The range is designed as a system, but you can start with what you need and build from there. Most customers begin with foundation and setting spray, then add products as their routine grows.',
  },
];
