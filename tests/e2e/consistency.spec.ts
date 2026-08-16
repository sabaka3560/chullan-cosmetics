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
    test('renders without console errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));

      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      // WebGL is unavailable in headless CI on some machines; a warning about
      // the context is an environment fact, not a defect in the page.
      const real = errors.filter((e) => !/webgl|WebGL|GPU/i.test(e));
      expect(real, `console errors: ${real.join(' | ')}`).toEqual([]);
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

    expect(
      [...seen.keys()],
      `primary buttons render in ${seen.size} different shapes`,
    ).toHaveLength(1);
  });

  test('the eyebrow label is one style everywhere', async ({ page }) => {
    const styles = new Set<string>();

    for (const route of ROUTES) {
      await page.goto(route.path, { waitUntil: 'load' });

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

    await page.locator('.card__add').first().click();
    await expect(page.getByRole('button', { name: /^Bag, 1 item$/ })).toBeVisible();

    await page.reload({ waitUntil: 'load' });

    // The bag is persisted by SKU reference, so a reload must rebuild it from
    // the catalog rather than losing it.
    await expect(page.getByRole('button', { name: /^Bag, 1 item$/ })).toBeVisible();
  });

  test('follows the buyer across pages', async ({ page }) => {
    await page.goto('/shop', { waitUntil: 'load' });
    await page.locator('.card__add').first().click();

    await page.goto('/shipping', { waitUntil: 'load' });
    await expect(page.getByRole('button', { name: /^Bag, 1 item$/ })).toBeVisible();
  });

  test('the detail page adds the product you are looking at', async ({ page }) => {
    // The regression this exists for: the selected variant was held as an
    // object, and React Router reuses the component across product routes — so
    // the page could show one product while Add to bag sent another's SKU.
    await page.goto('/product/foundation', { waitUntil: 'load' });
    await page.getByRole('button', { name: 'Add to bag' }).click();

    const drawer = page.getByRole('dialog', { name: 'Your bag' });
    await expect(drawer.locator('.line__name')).toHaveText('Foundation');

    await page.keyboard.press('Escape');
    await page.goto('/product/primer-men', { waitUntil: 'load' });
    await page.getByRole('button', { name: 'Add to bag' }).click();

    await expect(drawer.locator('.line__name').nth(1)).toHaveText('Primer');
  });
});
