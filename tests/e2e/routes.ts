/**
 * Every route the site serves, in one place.
 *
 * The mobile and consistency suites both iterate this list, so adding a page
 * without adding it here is the one way a screen can escape the tests — which
 * is why it lives beside them rather than being re-typed per spec.
 */
export const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/shop', name: 'shop' },
  { path: '/product/foundation', name: 'product (3D, multi-shade)' },
  { path: '/product/primer-men', name: 'product (photo, single variant)' },
  { path: '/shipping', name: 'policy: shipping' },
  { path: '/returns', name: 'policy: returns' },
  { path: '/privacy', name: 'policy: privacy' },
  { path: '/terms', name: 'policy: terms' },
  { path: '/nonsense', name: '404' },
] as const;

/** WCAG 2.5.5 (AAA) and the Apple HIG both land here. */
export const MIN_TAP_TARGET = 44;

/**
 * iOS zooms the viewport when a focused input's text is under 16px. It is not a
 * setting — it is unconditional — so any input below this is a layout bug that
 * only manifests on a real iPhone, at the exact moment a buyer starts typing
 * their PIN code.
 */
export const MIN_INPUT_FONT_SIZE = 16;
