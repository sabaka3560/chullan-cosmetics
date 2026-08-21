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

## 3. Two of the generated images have misspelt text baked into the pixels

**Where:** `src/assets/hero-primer-spray.jpg`, `src/assets/lifestyle-shades.jpg`
**Risk:** brand credibility

These were generated rather than photographed, and the generator garbled the
small text. It is in the pixels, so it cannot be fixed in code — only by
replacing the file. The imports do not change: drop a corrected JPEG in at the
same filename and rebuild.

**Hero** (`hero-primer-spray.jpg`) — legible at desktop size, illegible on a
phone:

| Reads | Should read |
| --- | --- |
| CUN PRIMER | OUR PRIMER |
| MOISTUNE | MOISTURE |
| A EMOOTH | A SMOOTH |
| PLAWLESS | FLAWLESS |
| MAKEOP | MAKEUP |
| ENEURES | ENSURES |
| A BEFRESHEO | A REFRESHED |
| ALL-OAY | ALL-DAY |
| 3.4 fl oɛ | 3.4 fl oz |

**Shades band** (`lifestyle-shades.jpg`) — worse, because it garbles the
wordmark lockup itself: `FFOFCEDIOM`, `M&RS DP` and `PROFSSSIONAL` all stand in
for *MAKE UP PROFESSIONAL*, one bottle reads `SKIN PEDFECTING`, and **two
different bottles are both labelled PORCELAIN**. The shade names it does show —
Porcelain, Medium Tan, Ebony — are also not the names in `catalog.ts`, which
ties into item 4.

**Setting Spray product shot** (`product-setting-spray.jpg`) carries one word
from the same defect: the lockup reads `MANE UP`. Verified against the source at
native resolution with nearest-neighbour magnification, so it is in the original
and not an artefact of the crop.

`essentials-moisturizer.jpg` and `product-hydra-primer.jpg` are **clean** —
every word correct. That is the useful signal: the generator handles a short
label fine and falls apart on dense fine print, so regenerating with less text
on the pack is likely to fix it.

**Resolved by this pass:** Hydra Primer and Setting Spray no longer render brand
tiles. Both are cropped 4:5 from the hero photograph, framed cap-to-label so the
garbled paragraph sits below the crop. All eight products now carry real
imagery, and `shot: 'tile'` is currently unused.

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

- Six image assets are now orphaned by the swaps and can be deleted:
  `featured_product.png`, `hero.png`, `hero_product.png`, `lifestyle_1.png`,
  `lifestyle_2.png`, `stick.png`. Vite only bundles what is imported, so they
  cost buyers nothing today — this is repo weight, not page weight.
- `bottle.png` (448 kB) and `tube.png` (381 kB) are photographs saved as PNG.
  Palette-quantising them as PNG saves ~45%, but they are smooth dark gradients
  and quantisation bands them visibly — and `bottle.png` is the poster frame the
  3D stage shows before WebGL mounts, so the banding would be on screen. Doing
  this properly means re-encoding to JPEG and changing the imports in
  `products.ts` and `LazyBottleStage.tsx`; neither has an alpha channel, so
  nothing blocks it.
- Cancel the test orders in Shiprocket: `CHU-MSYPHPKB`, `TEST-CHU-MSYPPXDG`.
- Two policy email addresses are still `[Customer care email]` and
  `[Grievance Officer email]` in `src/data/policies.ts`. The e-commerce rules
  require a reachable grievance contact, and a phone number alone limits it to
  office hours.
- The Foundation "Shade-matched" claim in `src/components/Showcase.tsx` is
  flagged in the brief as needing confirmation from Ratheesh — it depends on
  whether the bottles are in fact tinted per shade.
