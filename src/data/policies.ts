/**
 * Policy page content.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ THIS IS A SCAFFOLD, NOT LEGAL COPY. Every `[…]` below is a value only    │
 * │ the business can supply, and the surrounding sentences still need a      │
 * │ lawyer's eye before launch. The bracketed markers render visibly on the  │
 * │ page on purpose: half-finished policy text that *looks* finished is the  │
 * │ genuinely dangerous state, because nobody proofreads a page that reads   │
 * │ as done.                                                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * The section list is not arbitrary. India's Consumer Protection (E-Commerce)
 * Rules 2020 require an e-commerce seller to display, among other things: the
 * legal entity name, the principal geographic address, working contact details,
 * a named Grievance Officer with a 48-hour acknowledgement and one-month
 * resolution commitment, country of origin, and the returns, refunds, exchange,
 * warranty, delivery and payment terms. Shiprocket's own onboarding asks for
 * most of the same URLs, so these pages gate the integration as well as the law.
 */

export type PolicySection = {
  heading: string;
  body: string[];
};

export type Policy = {
  slug: string;
  title: string;
  eyebrow: string;
  intro: string;
  sections: PolicySection[];
};

/**
 * Rendered on every policy page. These are the fields that are mandatory
 * rather than advisable, which is why they live in one place instead of being
 * retyped per page and drifting.
 */
export const legalEntity = {
  name: 'NOWGENN Cosmetics Pvt Ltd',
  address:
    'Site No. 35, K. No. 35/35, Balaji Layout, Sathanur, Bengaluru, Karnataka 562149, India',
  gstin: '29AAKCN9776F1ZO',
  countryOfOrigin: 'India',

  /*
   * The Grievance Officer is a formally appointed role, and the Consumer
   * Protection (E-Commerce) Rules bind whoever is named here to acknowledge a
   * complaint within 48 hours and resolve it within one month. It is displayed
   * on every policy page because the rules require it to be findable, not
   * buried behind a contact link.
   */
  grievanceOfficer: 'Ratheesh Rajan',
  phone: '+91 95267 46656',

  /*
   * One address serves both roles for now. That is a real decision rather than
   * a shortcut: the rules require a grievance contact that is monitored and
   * answered within the stated window, and one inbox somebody actually reads
   * beats two where the second is forwarded and forgotten. Split them when
   * there is a separate person behind the second one.
   */
  email: 'chullantech@gmail.com',
  grievanceEmail: 'chullantech@gmail.com',
};

export const policies: Policy[] = [
  {
    slug: 'shipping',
    title: 'Shipping',
    eyebrow: 'Policy',
    intro:
      'How orders leave us, how long they take, and what happens when something goes wrong on the way.',
    sections: [
      {
        heading: 'Dispatch',
        body: [
          'Orders placed before [cut-off time] on a working day are dispatched the same day. Orders after that, or on a Sunday or public holiday, go out on the next working day.',
          'You will receive a tracking link by email and SMS once the parcel is handed to the courier.',
        ],
      },
      {
        heading: 'Delivery times',
        body: [
          'Metro cities: [X–Y] working days from dispatch. Rest of India: [X–Y] working days.',
          'Delivery estimates shown at checkout are provided by the courier and are not guarantees. Remote PIN codes may take longer.',
        ],
      },
      {
        heading: 'Charges',
        body: [
          'Shipping is free on orders above the threshold shown in the header. Below that, a flat charge of [₹X] applies and is shown before payment.',
          'Cash on delivery, where available, carries an additional [₹X] handling fee.',
        ],
      },
      {
        heading: 'Undelivered parcels',
        body: [
          'Couriers attempt delivery [N] times. After that the parcel returns to us and we will contact you to arrange a re-ship or a refund.',
          'Repeated refusal of a cash-on-delivery order may mean prepaid-only on future orders.',
        ],
      },
    ],
  },
  {
    slug: 'returns',
    title: 'Returns & Refunds',
    eyebrow: 'Policy',
    intro:
      'What can come back, how long you have, and when the money reaches you.',
    sections: [
      {
        heading: 'Window',
        body: [
          'Unopened products in their original packaging can be returned within [30] days of delivery.',
          'For hygiene reasons, opened or used cosmetics cannot be returned unless the product is faulty or was sent in error. This does not affect your statutory rights.',
        ],
      },
      {
        heading: 'Damaged or wrong items',
        body: [
          'If a product arrives damaged, leaking, or is not what you ordered, contact us within [48 hours] of delivery with photographs of the item and the outer packaging.',
          'We arrange the return pickup and cover the cost. No return shipping is charged to you in these cases.',
        ],
      },
      {
        heading: 'Change of mind',
        body: [
          'Return shipping for a change-of-mind return is [borne by the customer / free], and is deducted from the refund where applicable.',
        ],
      },
      {
        heading: 'Refunds',
        body: [
          'Refunds are issued to the original payment method within [7–10] working days of the returned item reaching us and passing inspection.',
          'Cash-on-delivery orders are refunded by bank transfer to an account you nominate.',
        ],
      },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy',
    eyebrow: 'Legal',
    intro: 'What we collect, why, and who else sees it.',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Name, delivery address, email address and phone number, so that an order can be delivered and you can be contacted about it.',
          'Payment is processed by our checkout and payment partners. Card and UPI details are never received or stored by us.',
        ],
      },
      {
        heading: 'Who we share it with',
        body: [
          'Our logistics partner, in order to ship and track your order.',
          'Our checkout and payment partners, in order to take payment.',
          'We do not sell personal data.',
        ],
      },
      {
        heading: 'Analytics',
        body: [
          'We record which pages and products are viewed and what is added to a bag, in aggregate, to understand how the shop is used. [State the analytics tools in use, and whether a consent banner is required for your traffic.]',
        ],
      },
      {
        heading: 'Your rights',
        body: [
          'Write to us to access, correct or delete the personal data we hold about you. We respond within [30] days.',
        ],
      },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms',
    eyebrow: 'Legal',
    intro: 'The terms on which we sell.',
    sections: [
      {
        heading: 'Orders',
        body: [
          'An order is an offer to buy. A contract forms when we confirm dispatch, not when payment is taken.',
          'We may decline or cancel an order — with a full refund — where a product is out of stock, a price is listed in error, or the order appears fraudulent.',
        ],
      },
      {
        heading: 'Pricing',
        body: [
          'Prices are in Indian Rupees and include GST unless stated otherwise. Shipping is shown separately before payment.',
          'Country of origin: India.',
        ],
      },
      {
        heading: 'Product use',
        body: [
          'Cosmetics are for external use only. Patch-test before first use and discontinue if irritation occurs.',
          'Shade reproduction on a screen is approximate and will differ from the product in daylight.',
        ],
      },
      {
        heading: 'Grievance redressal',
        body: [
          'Complaints are acknowledged within 48 hours and resolved within one month of receipt, in line with the Consumer Protection (E-Commerce) Rules, 2020.',
        ],
      },
    ],
  },
];

export function policyBySlug(slug: string): Policy | undefined {
  return policies.find((policy) => policy.slug === slug);
}
