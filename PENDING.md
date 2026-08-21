# Pending before launch

The site is technically complete. What remains is **content and configuration** —
none of it requires code changes, and all of it can be edited after the site is
live without a rebuild of anything structural.

Ordered by consequence, not by effort.

---

## 1. The testimonials are written copy, not real reviews

**Where:** `src/components/Reviews.tsx`
**Risk:** legal

Every quote, name and star rating in the testimonials section was written to
fill the layout. The content brief renamed the badge from "Verified buyer" to
professional roles — *Salon professional*, *Bridal MUA*, *Makeup artist* — which
turns an invented sentence into a sourced professional endorsement.

The Consumer Protection (E-Commerce) Rules 2020 treat a fabricated
representation of that kind as a misleading trade practice. This is the one
pending item that is not merely unfinished but actively risky once real money is
moving.

**To resolve:** replace all three with real, attributable reviews, or delete the
section. The names are currently the literal string "Placeholder name" so nothing
ships looking accidentally real.

Related: `rating` and `reviews` counts in `src/data/catalog.ts` (212, 148, 118 …)
are also invented, and appear as star ratings on every product card.

---

## 2. The canonical URL points at a domain that may not exist

**Where:** `src/seo/useSeo.ts` → `SITE_ORIGIN`, and `index.html`
**Risk:** the site does not get indexed

Every page currently declares:

```
<link rel="canonical" href="https://chullancosmetics.com/...">
```

That is the domain the content brief specifies. The site is deployed at
`chullan.tanmaybohra.com`.

A canonical tag tells search engines *"the real version of this page lives
here"*. If `chullancosmetics.com` is not live and serving this site, every page
is pointing search engines at nothing, and the deployed site will not rank for
its own content.

**To resolve, one of:**

- Point `chullancosmetics.com` at this deployment, then nothing changes; or
- Change `SITE_ORIGIN` to the domain actually being used, and the `<link
  rel="canonical">` plus `og:url` in `index.html` alongside it.

---

## 3. Two products have no photography

**Where:** `src/data/products.ts` → `IMAGERY`
**Risk:** cosmetic

**Hydra Primer** and **Setting Spray** have no product shots. They currently
render a dark brand tile — the wordmark and the product name on the same ground
as the photographed products.

That is deliberate. The nearest available images were a bottle whose label reads
*LUMINOUS MATTE FOUNDATION* and a generic tube, and showing the wrong product on
a page where people buy things is worse than showing none.

**To resolve:** add the two photographs to `src/assets/`, import them, and change
each row's `shot` from `'tile'` back to `'pack'`. The tile disappears on its own.

Ideally shot to match the existing six: product lit on dark stone, filling the
frame, roughly 4:5.

---

## 4. Foundation and Concealer shade names are placeholders

**Where:** `src/data/catalog.ts`
**Risk:** a buyer cannot tell which shade they are ordering

Shades are labelled `Shade 01` … `Shade 08` and their swatch colours are
**interpolated along a fair-to-deep line, not sampled from the product**. They
read as an ordered range on screen but they are not shade matches, and nobody
should choose a foundation from them.

Anti-Shine Powder is the exception — Banana, Beige, Light Pink and White are the
only shade names the brief actually documents.

**To resolve:** real shade names and measured swatch values. Note the price tiers
are attached to shade *position*, so if the ordering changes, re-check
`tests/unit/catalog-brief.test.ts` — it pins which shades are ₹1,200 and which
are ₹1,800.

---

## 5. Search engines that do not run JavaScript see an empty page

**Where:** architectural — documented in `src/seo/useSeo.ts`
**Risk:** the AEO/GEO goals in the brief do not land

This is a client-rendered single-page app. Titles, descriptions, canonicals and
the FAQ schema are all set from JavaScript after the bundle executes.

Googlebot renders JavaScript and sees all of it. Several crawlers that matter for
the brief's answer-engine goals do not — they fetch the HTML and stop, and the
HTML they receive is an empty root element. This is demonstrable: fetching the
deployed page returns the `<title>` and the Organization schema (both static in
`index.html`) but none of the body copy.

**To resolve:** prerender each route to static HTML at build time. Roughly a
half-day, and it is the difference between the structured-data work paying off
for AI answers or only for Google.

---

# Configuration, not content

## Razorpay live keys

Currently `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are scoped to **Preview and
Production together**. Overwriting them in place with live keys would make every
preview deployment take real money.

1. Remove both existing variables.
2. Add the **live** keys to **Production only**.
3. Add the **test** keys to **Preview** and **Development**.
4. Redeploy — environment changes do not reach deployments that already exist.

No code change is needed. `isTestMode()` reads the `rzp_test_` key prefix, so
live keys automatically drop the `TEST-` order prefix and the test-mode banner.

## Razorpay webhook

Set `RAZORPAY_WEBHOOK_SECRET` and register the endpoint in the Razorpay
dashboard. See `docs/razorpay-webhook.md` for the exact steps.

## Housekeeping

- Cancel the test orders in Shiprocket: `CHU-MSYPHPKB`, `TEST-CHU-MSYPPXDG`.
- Two policy email addresses are still `[Customer care email]` and
  `[Grievance Officer email]` in `src/data/policies.ts`. The e-commerce rules
  require a reachable grievance contact, and a phone number alone limits it to
  office hours.
- The Foundation "Shade-matched" claim in `src/components/Showcase.tsx` is
  flagged in the brief as needing confirmation from Ratheesh — it depends on
  whether the bottles are in fact tinted per shade.
