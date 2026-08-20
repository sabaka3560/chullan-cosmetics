import { useEffect } from 'react';

/**
 * Per-route head tags, without pulling in a head-management library.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ KNOWN LIMIT — THIS RUNS IN JAVASCRIPT.                                   │
 * │                                                                          │
 * │ The site is a client-rendered SPA, so everything set here exists only     │
 * │ after the bundle executes. Googlebot renders JavaScript and will see it. │
 * │ Several crawlers that matter for the brief's AEO/GEO goals do not — they │
 * │ fetch the HTML and stop, and the HTML they get is an empty root div.     │
 * │                                                                          │
 * │ The durable fix is prerendering each route to static HTML at build time. │
 * │ Until that exists, anything that must reach a non-rendering crawler      │
 * │ belongs in `index.html` instead, which is why the Organization schema    │
 * │ lives there and not here.                                                │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

export type Seo = {
  title: string;
  description: string;
  /** Absolute URL. Omit on routes that should not advertise a canonical. */
  canonical?: string;
  /** Any number of JSON-LD graphs. Serialised into their own script tags. */
  jsonLd?: unknown[];
};

/** Creates the tag on first use rather than assuming index.html declared it. */
function meta(selector: string, create: () => HTMLElement): HTMLElement {
  const existing = document.head.querySelector<HTMLElement>(selector);
  if (existing) return existing;
  const made = create();
  document.head.appendChild(made);
  return made;
}

function setMetaContent(selector: string, attr: 'name' | 'property', key: string, value: string) {
  const tag = meta(selector, () => {
    const element = document.createElement('meta');
    element.setAttribute(attr, key);
    return element;
  });
  tag.setAttribute('content', value);
}

export function useSeo({ title, description, canonical, jsonLd }: Seo) {
  useEffect(() => {
    document.title = title;

    setMetaContent('meta[name="description"]', 'name', 'description', description);
    setMetaContent('meta[property="og:title"]', 'property', 'og:title', title);
    setMetaContent(
      'meta[property="og:description"]',
      'property',
      'og:description',
      description,
    );

    if (canonical) {
      const link = meta('link[rel="canonical"]', () => {
        const element = document.createElement('link');
        element.setAttribute('rel', 'canonical');
        return element;
      });
      link.setAttribute('href', canonical);
      setMetaContent('meta[property="og:url"]', 'property', 'og:url', canonical);
    }

    /*
     * Route-owned graphs are tagged and removed on the way out. Without the
     * marker a second route's schema would stack on top of the first, and a
     * page would end up claiming to be two different things at once.
     */
    const scripts = (jsonLd ?? []).map((graph) => {
      const element = document.createElement('script');
      element.type = 'application/ld+json';
      element.dataset.seo = 'route';
      element.textContent = JSON.stringify(graph);
      document.head.appendChild(element);
      return element;
    });

    return () => {
      scripts.forEach((element) => element.remove());
    };
    // Serialised rather than compared by identity: callers build these graphs
    // inline, and a fresh array every render would tear the scripts down and
    // rebuild them on every render.
  }, [title, description, canonical, JSON.stringify(jsonLd ?? null)]);
}

/** The origin every canonical is built from. */
export const SITE_ORIGIN = 'https://chullancosmetics.com';

/** Builds an FAQPage graph from the same items the accordion renders. */
export function faqSchema(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}
