import { expect, test } from '@playwright/test';

/**
 * The draggable bottle on the product showcase.
 *
 * The reported symptom was that on a phone the bottle responds for a moment and
 * then rotates on its own, ignoring the finger. Three separate causes, each of
 * which these tests pin down:
 *
 *   1. The idle spin wrote `rotation.y` every frame on a group *inside*
 *      `PresentationControls`, so it never yielded to the drag.
 *   2. `snap` sprang the rotation back to its origin on release — and on a
 *      touchscreen the release happens the instant the gesture ends.
 *   3. `global={false}` meant the drag only tracked while the pointer was over
 *      the bottle's silhouette, which is a narrow target for a thumb.
 *
 * Rotation itself lives in a three.js scene graph Playwright cannot read, so
 * these assert the observable contract instead: control is handed over on first
 * contact and kept, and the page is still scrollable from on top of the canvas.
 *
 * Note the DOM nesting, which is easy to get wrong:
 *   .showcase__stage        ← owns `touch-action`
 *     └ .card__stage        ← LazyBottleStage host
 *         └ [data-stage]    ← BottleStage host, owns `data-engaged`
 */

const STAGE = '[data-stage="showcase"]';

/*
 * Generous, because these are the most expensive interactions in the suite.
 * Headless WebGL falls back to software rasterisation, and with `global`
 * controls every pointer move raycasts through a live scene and re-renders it.
 * A synthetic drag that takes a few frames on real hardware takes tens of
 * seconds here — which is a fact about the test environment, not about the page.
 */
test.setTimeout(150_000);

/** The stage is lazy-mounted behind an IntersectionObserver. */
async function openShowcase(page: import('@playwright/test').Page) {
  await page.goto('/', { waitUntil: 'load' });
  // The outer container always exists; the inner one only after the chunk lands.
  await page.locator('.showcase__stage').scrollIntoViewIfNeeded();
  await expect(page.locator(STAGE)).toBeVisible({ timeout: 30_000 });
}

test.describe('the showcase bottle', () => {
  test.beforeEach(async ({ page }) => {
    await openShowcase(page);
  });

  test('starts in idle motion, under its own control', async ({ page }) => {
    await expect(page.locator(STAGE)).toHaveAttribute('data-engaged', 'false');
  });

  test('hands control over on first contact anywhere in the stage', async ({ page }) => {
    const stage = page.locator(STAGE);
    const box = (await stage.boundingBox())!;

    // Deliberately near the top-left corner rather than the middle: the bottle
    // silhouette is not there, and that empty space is exactly what the old
    // `global={false}` ignored.
    await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.25, { steps: 4 });
    await page.mouse.up();

    await expect(stage).toHaveAttribute('data-engaged', 'true');
  });

  test('keeps control after the drag ends', async ({ page }) => {
    const stage = page.locator(STAGE);
    const box = (await stage.boundingBox())!;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 4 });
    await page.mouse.up();

    // The idle spin must not resume and start moving the object again while the
    // user is still looking at it.
    await page.waitForTimeout(800);
    await expect(stage).toHaveAttribute('data-engaged', 'true');
  });

  test('never traps the page scroll', async ({ page }) => {
    // `pan-y` hands vertical panning to the browser and keeps horizontal for
    // rotation. `none` would make the drag flawless and turn a canvas that fills
    // most of a phone screen into a region the page cannot be scrolled from,
    // which is the worse failure by a distance.
    const touchAction = await page
      .locator('.showcase__stage')
      .evaluate((el) => getComputedStyle(el).touchAction);

    expect(touchAction).toBe('pan-y');
  });
});

test.describe('the card bottle', () => {
  test('is not interactive', async ({ page }) => {
    await page.goto('/shop', { waitUntil: 'load' });
    const card = page.locator('[data-stage="card"]').first();
    await card.scrollIntoViewIfNeeded();

    // Only the showcase carries controls. A card in a grid that swallowed drags
    // would fight the horizontal product rail it sits inside on mobile.
    await expect(card).not.toHaveAttribute('data-engaged', /.*/);
  });
});
