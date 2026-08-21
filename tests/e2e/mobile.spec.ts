import { expect, test } from '@playwright/test';
import { MIN_INPUT_FONT_SIZE, MIN_TAP_TARGET, ROUTES } from './routes';
import { renderWholePage } from './helpers';

/**
 * Mobile-friendliness.
 *
 * These assert the things that make a page unusable on a phone rather than
 * merely imperfect: content wider than the screen, controls too small to hit,
 * inputs that trigger iOS zoom, and navigation that cannot be reached at all.
 *
 * Everything here is measured from the rendered page rather than read off the
 * stylesheet. A CSS rule can be correct and still lose to specificity, a
 * cascade order or a parent's `overflow` — only the computed box tells the
 * truth.
 */

/**
 * The intro overlay must never gate the page behind it.
 *
 * It did: routes were rendered only after the sequence finished, so the load
 * event fired at ~250ms and the screen stayed black for another 4.5s — on every
 * load, including a policy URL pasted into an onboarding form. Overlaying it
 * instead is visually identical and costs nothing.
 *
 * Deliberately asserted on a fresh context per route, because the intro is now
 * once-per-session: a test that reuses a warmed session would skip the overlay
 * entirely and prove nothing.
 */
test.describe('content paints immediately', () => {
  for (const route of ROUTES) {
    test(`on ${route.name}, without waiting for the intro`, async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(route.path, { waitUntil: 'load' });
      // 2s is generous for a static build and still far under the 3.5-4.8s the
      // blocking version cost.
      await expect(page.locator('#root > *:not([data-intro])')).toBeAttached({
        timeout: 2000,
      });

      await context.close();
    });
  }
});

for (const route of ROUTES) {
  test.describe(route.name, () => {
    test('never scrolls horizontally', async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await renderWholePage(page);

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
      });

      // 1px of slack absorbs sub-pixel rounding on fractional device ratios,
      // which is a rendering artefact rather than a layout error.
      expect(
        overflow.scrollWidth,
        `page is ${overflow.scrollWidth - overflow.clientWidth}px wider than the viewport`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);
    });

    test('no readable or tappable content is cut off', async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await renderWholePage(page);

      /**
       * Restricted to elements a buyer reads or touches.
       *
       * Checking *every* element flags things that overflow on purpose and are
       * clipped harmlessly — the hero photograph is scaled ~5% so it can
       * parallax without exposing an edge, and `body { overflow-x: hidden }`
       * contains it. That is invisible to a user, and a test that fails on it
       * trains you to ignore the test.
       *
       * Text and controls are different: if those extend past the edge they are
       * genuinely unreadable or untappable, whether or not the page scrolls.
       */
      const spills = await page.evaluate(() => {
        /**
         * A horizontal snapping rail is a deliberate pattern — the promoted
         * product row shows a peek of the next card precisely so it reads as
         * scrollable. Its children overflow the viewport by design and the
         * container owns that overflow, so the page never scrolls sideways.
         *
         * What matters is whether the overflow is *contained*, so this walks up
         * looking for an ancestor that actually scrolls horizontally.
         */
        const inScrollableRail = (el: HTMLElement) => {
          let parent = el.parentElement;
          while (parent && parent !== document.body) {
            const style = getComputedStyle(parent);
            const scrollsX = style.overflowX === 'auto' || style.overflowX === 'scroll';
            if (scrollsX && parent.scrollWidth > parent.clientWidth) return true;
            parent = parent.parentElement;
          }
          return false;
        };

        const limit = document.documentElement.clientWidth;
        const CONTENT = 'a, button, input, p, h1, h2, h3, h4, dt, dd, label, li';

        return [...document.querySelectorAll<HTMLElement>(CONTENT)]
          .filter((el) => {
            const style = getComputedStyle(el);
            if (style.visibility === 'hidden' || style.display === 'none') return false;
            if (style.opacity === '0') return false;
            // Deliberately off-screen: the marquee and decorative bleed.
            if (el.closest('[aria-hidden="true"], .ticker, .footer__mark')) return false;
            if (inScrollableRail(el)) return false;
            // Empty wrappers carry no content to lose.
            if (!el.textContent?.trim() && el.tagName !== 'INPUT') return false;

            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.right > limit + 1;
          })
          .slice(0, 5)
          .map((el) => {
            const r = el.getBoundingClientRect();
            const text = el.textContent?.trim().slice(0, 24) ?? '';
            return `${el.tagName.toLowerCase()}["${text}"] right=${Math.round(r.right)}`;
          });
      });

      expect(spills, `elements overflowing: ${spills.join(', ')}`).toEqual([]);
    });

    test('inputs are at least 16px so iOS does not zoom', async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      const tooSmall = await page.evaluate((min) => {
        return [...document.querySelectorAll<HTMLInputElement>('input, select, textarea')]
          .filter((el) => parseFloat(getComputedStyle(el).fontSize) < min)
          .map((el) => `${el.id || el.name || el.type}`);
      }, MIN_INPUT_FONT_SIZE);

      expect(tooSmall, `inputs under ${MIN_INPUT_FONT_SIZE}px: ${tooSmall.join(', ')}`).toEqual([]);
    });
  });
}

test.describe('touch targets', () => {
  // Only meaningful without a pointer: the 44px rules are scoped to
  // `hover: none`, and asserting them on desktop would be asserting the
  // opposite of what the design intends.
  test.skip(({ isMobile }) => !isMobile, 'touch-only');

  for (const route of ROUTES) {
    test(`are large enough on ${route.name}`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await renderWholePage(page);

      const small = await page.evaluate((min) => {
        return [...document.querySelectorAll<HTMLElement>('a, button')]
          .filter((el) => {
            const style = getComputedStyle(el);
            if (style.visibility === 'hidden' || style.display === 'none') return false;

            /*
             * `checkVisibility` with `opacityProperty` also accounts for an
             * *ancestor* faded to zero, which `getComputedStyle(el).opacity`
             * cannot see. The scroll reveals wrap whole blocks and animate both
             * opacity and scale, so a section that has not revealed yet reports
             * its controls at 0.96 scale — 42px for a box that settles at 44.
             * Measuring those was measuring something nobody can tap.
             */
            if (el.checkVisibility && !el.checkVisibility({
              opacityProperty: true,
              visibilityProperty: true,
              contentVisibilityAuto: true,
            })) return false;

            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;

            // An inline link inside a paragraph is exempt — WCAG carves these
            // out, and padding one to 44px would wreck the line rhythm.
            const inProse = el.closest('p, li.prose-item');
            if (inProse && style.display.startsWith('inline')) return false;

            // The stretched card link is a full-card overlay measured via its
            // pseudo-element, which getBoundingClientRect cannot see.
            if (el.classList.contains('card__link')) return false;

            /*
             * Layout size, not the painted box.
             *
             * `getBoundingClientRect` includes transforms, and the scroll
             * reveals animate scale — so a control caught a frame before its
             * reveal settles reports 43.1px for a box that is 44px the instant
             * the animation ends. `checkVisibility` above does not filter those
             * out, because opacity has already reached 1 while scale is still
             * arriving. `offsetWidth`/`offsetHeight` ignore transforms, which
             * is the honest measure: what a finger meets is the settled size,
             * not a frame of an animation nobody can tap during.
             *
             * Half a pixel of tolerance on top. Device pixel ratios produce
             * widths like 43.996 for a box that is 44px by every definition
             * that matters, and reporting those teaches you to skim.
             */
            return el.offsetHeight < min - 0.5 || el.offsetWidth < min - 0.5;
          })
          .slice(0, 6)
          .map((el) => {
            const label = el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 24);
            return `${el.tagName.toLowerCase()}[${label}] ${el.offsetWidth}x${el.offsetHeight}`;
          });
      }, MIN_TAP_TARGET);

      expect(small, `targets under ${MIN_TAP_TARGET}px: ${small.join(' | ')}`).toEqual([]);
    });
  }
});

test.describe('mobile navigation', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch-only');

  test('the burger opens a menu that reaches every page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The regression this exists for: the burger rendered but had no handler,
    // so on a phone /shop and every policy page were unreachable from the nav.
    await page.getByRole('button', { name: 'Open menu' }).click();

    const menu = page.getByRole('dialog', { name: 'Menu' });
    await expect(menu).toBeVisible();

    await expect(menu.getByRole('link', { name: 'The Range' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Foundation', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Shipping' })).toBeVisible();
  });

  test('closes itself after navigating', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: 'The Range' }).click();

    await expect(page).toHaveURL(/\/shop$/);
    // A panel left open over the page it just navigated to reads as a dead tap.
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
  });

  test('Escape closes it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
  });
});

test.describe('the range browses as a grid on mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch-only');

  test('is not a horizontal rail', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');

    const grid = page.locator('.product-grid--range');
    await expect(grid).toBeVisible();

    // The landing page's promoted row is a snapping rail, which is right for
    // three curated items and wrong for a catalogue — it hides how much there
    // is behind a sideways swipe.
    const display = await grid.evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe('grid');

    const scrolls = await grid.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(scrolls, 'the range grid scrolls sideways').toBe(false);
  });

  test('shows every product', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.product-grid--range .card')).toHaveCount(8);
  });
});

test.describe('the bag works on a phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch-only');

  test('adds, opens, and fits the screen', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');

    await page.locator('.card__add').first().click();
    await page.getByRole('button', { name: /^Bag/ }).click();

    const drawer = page.getByRole('dialog', { name: 'Your bag' });
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('.line')).toHaveCount(1);

    // A full-width panel on a narrow screen; anything wider means the close
    // button or the checkout CTA is off-screen.
    const box = await drawer.locator('.drawer__panel').boundingBox();
    const width = page.viewportSize()!.width;
    expect(box!.width).toBeLessThanOrEqual(width + 1);
    expect(box!.x).toBeGreaterThanOrEqual(-1);

    // A link, not a button — checkout is its own route now, and the drawer
    // navigates to it rather than handling payment inline.
    await expect(drawer.getByRole('link', { name: 'Checkout' })).toBeInViewport();
  });
});
