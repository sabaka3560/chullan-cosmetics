import type { Page } from '@playwright/test';

/**
 * Force the whole page to render before measuring it.
 *
 * Two things otherwise make layout assertions non-deterministic, and both fail
 * in the direction of a false pass:
 *
 *   - `content-visibility: auto` on below-fold sections skips their layout
 *     entirely, so every descendant measures as a zero-size box and quietly
 *     drops out of any filter that ignores zero-size boxes.
 *   - Scroll reveals start at `opacity: 0` with a transform, so an element can
 *     be measured mid-flight and report a position it will not keep.
 *
 * Scrolling to the bottom and back forces layout on every section, then the
 * wait lets the reveals settle at their final transforms.
 */
export async function renderWholePage(page: Page) {
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
}
