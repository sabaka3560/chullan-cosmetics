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
    // Half-viewport steps. Whole-viewport jumps can skip past a section fast
    // enough that its `whileInView` observer never reports it as intersecting,
    // leaving that block stuck in its hidden variant for the whole test.
    const step = Math.round(window.innerHeight / 2);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    window.scrollTo(0, 0);
  });
  /*
   * 1800ms, not 400ms. The scroll reveals now animate `scale` as well as `y`,
   * and unlike `y` a scale changes an element's measured width and height — so
   * a tap-target check that ran mid-flight saw 42px boxes for controls that
   * settle at 44px. Longest path is a 0.8s reveal behind ~0.3s of stagger plus
   * a 0.14s group delay, so this clears it with room to spare.
   */
  await page.waitForTimeout(600);

  /*
   * Then wait for the animations themselves rather than guessing a duration.
   * A fixed timeout is a bet on the slowest machine in the fleet, and WebKit
   * kept losing it — a reveal still a few frames from settling reported 43px
   * for a control that ends at 44.
   *
   * Infinite animations are excluded or this would never return: the idle float
   * on the showcase stage repeats until someone touches it.
   */
  await page.evaluate(async () => {
    const settling = document
      .getAnimations()
      .filter((a) => {
        const iterations = (a.effect?.getTiming().iterations ?? 1) as number;
        return Number.isFinite(iterations);
      })
      .map((a) => a.finished.catch(() => undefined));
    await Promise.all(settling);
  });
}
