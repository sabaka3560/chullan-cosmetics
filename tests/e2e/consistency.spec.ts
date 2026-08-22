import { expect, test } from '@playwright/test';
import { ROUTES } from './routes';

/**
 * UI consistency.
 *
 * The design system's whole claim is that there aren't many values in play —
 * a handful of durations, one set of surfaces, one button shape. That property
 * is invisible in any single component and only fails in aggregate, which makes
 * it exactly the kind of thing a person stops noticing and a test does not.
 *
 * These do not assert a specific look. They assert that the look is the *same*
 * everywhere, which is what survives someone adding a page in six months.
 */

/**
 * `load` fires when the document's resources are done, which on a client-
 * rendered SPA can be *before* React has put anything in `#root`. Querying at
 * that moment finds an empty page and reports "0 eyebrows" — a confident,
 * completely wrong answer rather than an error.
 *
 * Waiting for the root to have a child is the cheap, honest signal that the app
 * has actually rendered.
 */
async function waitForApp(page: import('@playwright/test').Page) {
  // `:not([data-intro])` matters: the intro overlay mounts inside #root, so a
  // bare `#root > *` is satisfied while the screen is still the black splash.
  // That is exactly how this helper reported "0 eyebrows found" as a
  // consistency failure rather than as a failure to look.
  await page.locator('#root > *:not([data-intro])').first().waitFor({ state: 'attached' });
}

/** Every surface a section is allowed to sit on, from `:root`. */
const SURFACES = [
  'rgb(255, 255, 255)', // --paper
  'rgb(243, 241, 237)', // --bone
  'rgb(234, 231, 225)', // --bone-2
  'rgb(11, 11, 11)', //    --void
  'rgb(20, 20, 19)', //    --void-2
  'rgba(0, 0, 0, 0)', //   transparent — inherits its parent's surface
];

for (const route of ROUTES) {
  test.describe(route.name, () => {
    test('renders without console errors or broken assets', async ({ page, baseURL }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));

      /*
       * Failed responses are tracked by URL rather than scraped out of console
       * text, and only for our own origin.
       *
       * The console message for a failed asset is just "Failed to load
       * resource: the server responded with a status of 404" with no URL, so a
       * flaky fetch of the Google Fonts stylesheet under parallel load was
       * indistinguishable from a genuinely broken asset — and failed the suite
       * at random, on a different route each run. Third-party network weather
       * is not something this page can fix; a 404 on our own domain is.
       */
      const origin = new URL(baseURL!).origin;
      const brokenAssets: string[] = [];
      page.on('response', (response) => {
        if (response.status() >= 400 && response.url().startsWith(origin)) {
          brokenAssets.push(`${response.status()} ${response.url()}`);
        }
      });

      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      // WebGL is unavailable in headless CI on some machines; a warning about
      // the context is an environment fact, not a defect in the page.
      const real = errors.filter(
        (e) => !/webgl|WebGL|GPU/i.test(e) && !/Failed to load resource/i.test(e),
      );
      expect(real, `console errors: ${real.join(' | ')}`).toEqual([]);
      expect(brokenAssets, `broken same-origin assets: ${brokenAssets.join(' | ')}`).toEqual([]);
    });

    test('has exactly one h1', async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      // Not pedantry: the h1 is what a screen reader and every search crawler
      // use as the page's identity. Zero is anonymous, two is ambiguous.
      await expect(page.locator('h1')).toHaveCount(1);
    });

    test('carries the nav and the footer', async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      if (route.name === '404') return; // Deliberately bare.

      await expect(page.locator('header.nav')).toBeVisible();
      await expect(page.locator('footer.footer')).toBeVisible();
      await expect(page.getByRole('button', { name: /^Bag/ })).toBeVisible();
    });

    test('sections sit on system surfaces only', async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      const rogue = await page.evaluate((allowed) => {
        return [...document.querySelectorAll<HTMLElement>('section, article')]
          .map((el) => getComputedStyle(el).backgroundColor)
          .filter((color) => !allowed.includes(color));
      }, SURFACES);

      expect(rogue, `off-system surfaces: ${[...new Set(rogue)].join(', ')}`).toEqual([]);
    });
  });
}

test.describe('cross-page consistency', () => {
  // These walk every route in one test, so they need a budget scaled to the
  // number of routes rather than the per-page default.
  test.setTimeout(150_000);

  test('every primary button is the same shape', async ({ page }) => {
    const seen = new Map<string, string[]>();

    for (const route of ROUTES) {
      await page.goto(route.path, { waitUntil: 'load' });
      await waitForApp(page);

      const shapes = await page.evaluate(() => {
        return [...document.querySelectorAll<HTMLElement>('.btn--primary')]
          .filter((el) => getComputedStyle(el).display !== 'none')
          .map((el) => {
            const s = getComputedStyle(el);
            /*
             * Size-coupled properties are excluded on purpose. `.btn--sm` is a
             * legitimate variant, and it carries both a smaller font size and
             * slightly looser tracking (0.12em at 11px vs 0.1em at 13px) —
             * which is correct typography, not drift. Asserting on tracking
             * flagged that as an inconsistency.
             *
             * What must never vary is the button's identity: square corners,
             * the same weight, the same casing.
             */
            return [s.borderRadius, s.fontWeight, s.textTransform].join('|');
          });
      });

      for (const shape of shapes) {
        seen.set(shape, [...(seen.get(shape) ?? []), route.path]);
      }
    }

    // A zero here would mean nothing was found rather than everything agreeing,
    // which is the failure this whole helper exists to stop passing silently.
    expect(seen.size, 'no primary buttons found on any route').toBeGreaterThan(0);
    expect(
      [...seen.keys()],
      `primary buttons render in ${seen.size} different shapes`,
    ).toHaveLength(1);
  });

  test('the eyebrow label is one style everywhere', async ({ page }) => {
    const styles = new Set<string>();

    for (const route of ROUTES) {
      await page.goto(route.path, { waitUntil: 'load' });
      await waitForApp(page);

      const found = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.eyebrow')]
          .filter((el) => getComputedStyle(el).display !== 'none')
          .map((el) => {
            const s = getComputedStyle(el);
            // Rounded to 1dp: sub-pixel differences are the browser resolving
            // the same em value against the same font size, not two designs.
            const round = (v: string) => parseFloat(v).toFixed(1);
            return [
              round(s.fontSize),
              s.fontWeight,
              round(s.letterSpacing),
              s.textTransform,
            ].join('|');
          }),
      );
      found.forEach((style) => styles.add(style));
    }

    // The eyebrow is deliberately fixed at 11px rather than fluid — a 11→12px
    // ramp is imperceptible and only breaks the tracking rhythm.
    expect(styles.size, 'no eyebrows found on any route').toBeGreaterThan(0);
    expect([...styles], `eyebrow renders ${styles.size} ways`).toHaveLength(1);
  });

  test('no route 404s or redirects away', async ({ page }) => {
    for (const route of ROUTES) {
      const response = await page.goto(route.path);
      expect(response?.status(), `${route.path} returned ${response?.status()}`).toBe(200);

      if (route.name === '404') continue;
      // Catches the class of bug where a page bails to a redirect on mount —
      // which is exactly what the detail page does for an unknown product.
      expect(new URL(page.url()).pathname, `${route.path} redirected`).toBe(route.path);
    }
  });
});

/**
 * Clicks the detail page's Add button, scrolling to it instantly first.
 *
 * `html { scroll-behavior: smooth }` applies to programmatic scrolling too, so
 * Playwright's own scroll-into-view starts an animation and the element is
 * still travelling when the click is attempted — the run log reads "done
 * scrolling / element is outside of the viewport" and then retries until the
 * test times out. Placing the element instantly removes the race without
 * touching the site's scrolling behaviour.
 */
async function addToBag(page: import('@playwright/test').Page) {
  const button = page.getByRole('button', { name: 'Add to bag' });
  await button.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await button.click();
}

test.describe('the cart holds together', () => {
  /*
   * `load` rather than `networkidle` throughout this block.
   *
   * networkidle waits for the network to go quiet, which against a remote host
   * serving a 700KB three.js chunk is latency-bound and blew the 60s budget
   * when the suite was pointed at the deployed site — a red result for a cart
   * that works fine. The assertions below already auto-retry, so waiting for
   * `load` and letting `expect` poll is both faster and more honest about what
   * is being tested.
   */

  test('survives a reload', async ({ page }) => {
    await page.goto('/shop', { waitUntil: 'load' });

    await page.locator('button.card__add').first().click();
    await expect(page.getByRole('button', { name: /^Bag, 1 item$/ })).toBeVisible();

    await page.reload({ waitUntil: 'load' });

    // The bag is persisted by SKU reference, so a reload must rebuild it from
    // the catalog rather than losing it.
    await expect(page.getByRole('button', { name: /^Bag, 1 item$/ })).toBeVisible();
  });

  test('follows the buyer across pages', async ({ page }) => {
    await page.goto('/shop', { waitUntil: 'load' });
    await page.locator('button.card__add').first().click();

    await page.goto('/shipping', { waitUntil: 'load' });
    await expect(page.getByRole('button', { name: /^Bag, 1 item$/ })).toBeVisible();
  });

  test('the detail page adds the product you are looking at', async ({ page }) => {
    // The regression this exists for: the selected variant was held as an
    // object, and React Router reuses the component across product routes — so
    // the page could show one product while Add to bag sent another's SKU.
    await page.goto('/product/foundation', { waitUntil: 'load' });
    await addToBag(page);

    const drawer = page.getByRole('dialog', { name: 'Your bag' });
    await expect(drawer.locator('.line__name')).toHaveText('Foundation');

    await page.keyboard.press('Escape');
    await page.goto('/product/hydra-primer', { waitUntil: 'load' });
    await addToBag(page);

    await expect(drawer.locator('.line__name').nth(1)).toHaveText('Hydra Primer');
  });
});

/*
 * A grid is for choosing a product. A product page is for choosing a shade.
 *
 * The swatch row used to sit on both, which put eight decisions in front of a
 * shopper who had not yet made the first one — and on a phone, eight 28px
 * targets inside the card's own tap area.
 *
 * Removing it leaves one trap worth a test of its own. Quick-add still has to
 * add *something*, and for a product with eight shades there is no defensible
 * default: the first variant means a buyer who taps Add on a foundation gets
 * the palest shade in the range and is never told a choice was made. So the
 * button is absent exactly where the choice exists, and these pin that down in
 * both directions — no picker in the grid, and the picker still on the page
 * that owns it.
 */
test.describe('shades belong to the product page', () => {
  test('no card in the range carries a shade picker', async ({ page }) => {
    await page.goto('/shop', { waitUntil: 'load' });
    await expect(page.locator('.card').first()).toBeVisible();
    await expect(page.locator('.card .swatch')).toHaveCount(0);
  });

  test('a multi-shade product cannot be quick-added from the grid', async ({ page }) => {
    await page.goto('/shop', { waitUntil: 'load' });

    // Named, not indexed. This assertion is about Foundation having eight
    // shades, not about where the routine order happens to put it today.
    const foundation = page.locator('.card:has(a[href$="/product/foundation"])');
    await expect(foundation).toBeVisible();

    await expect(foundation.locator('button.card__add')).toHaveCount(0);
    await expect(foundation.locator('.card__add--shades')).toHaveText(/8 shades/i);
  });

  test('a single-variant product still quick-adds', async ({ page }) => {
    await page.goto('/shop', { waitUntil: 'load' });

    const moisturiser = page.locator('.card:has(a[href$="/product/moisturiser"])');
    await expect(moisturiser.locator('button.card__add')).toHaveCount(1);

    await moisturiser.locator('button.card__add').click();
    await expect(page.getByRole('button', { name: /^Bag, 1 item$/ })).toBeVisible();
  });

  test('the product page still chooses shades', async ({ page }) => {
    await page.goto('/product/foundation', { waitUntil: 'load' });
    await expect(page.locator('.swatch')).toHaveCount(8);
  });
});
