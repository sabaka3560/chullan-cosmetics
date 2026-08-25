import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * `/api` is served by Vercel Functions in production, which Vite knows nothing
 * about — so locally those requests 404 and the cart looks broken for reasons
 * that have nothing to do with the cart.
 *
 * Proxying to `vercel dev` on 3100 makes local behave like production: same
 * paths, same origin, no CORS, no separate client config. Run the two side by
 * side:
 *
 *   COMMERCE_MODE=mock npx vercel dev --listen 3100     # API
 *   npm run dev                                         # storefront
 *
 * `changeOrigin` matters because the checkout session builds its return URL
 * from the incoming Origin header; without it the redirect points at the proxy
 * target rather than the page the buyer is actually on.
 */
const apiProxy = {
  '/api': {
    target: 'http://localhost:3100',
    changeOrigin: false,
  },
};

/**
 * The production security headers, mirrored onto `vite preview`.
 *
 * These live in `vercel.json`, which Vite does not read — so without this copy
 * the only place a Content-Security-Policy can be tested is production, on a
 * site taking real card payments. A policy that blocks
 * `checkout.razorpay.com` does not fail loudly; it fails as a checkout button
 * that quietly does nothing.
 *
 * Kept deliberately as a literal duplicate rather than generated from
 * `vercel.json`: the two are read by different tools at different times, and a
 * clever single source would be one more thing between a header and the
 * browser it has to reach. `tests/e2e/security.spec.ts` asserts they agree, so
 * the copy cannot drift silently.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy':
    "default-src 'self'; " +
    "script-src 'self' https://checkout.razorpay.com https://cdn.razorpay.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.razorpay.com; " +
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.razorpay.com; " +
    "img-src 'self' data: blob: https://cdn.razorpay.com https://checkout.razorpay.com; " +
    "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://lumberjack-cx.razorpay.com https://cdn.razorpay.com; " +
    'frame-src https://api.razorpay.com https://checkout.razorpay.com; ' +
    "worker-src 'self' blob:; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "object-src 'none'",
  /*
   * `upgrade-insecure-requests` is deliberately absent here and present in
   * `vercel.json`.
   *
   * It rewrites http:// subresource requests to https://. In production every
   * request is already https, so it costs nothing and closes a mixed-content
   * hole. On this preview server, which is plain http on localhost, it is
   * actively destructive — and only in WebKit, which is what the `iphone-12`
   * project runs. Chromium exempts localhost from the upgrade; WebKit does
   * not, so it rewrote every asset URL to https://localhost:4173, got
   * `SSL connect error` on all of them, and rendered a blank page. Fifty-six
   * tests failed with "expected 1 h1, received 0" for that one reason.
   *
   * The drift test in `security.spec.ts` knows about this single exception.
   */
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(self "https://checkout.razorpay.com")',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
};

export default defineConfig({
  plugins: [react()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy, headers: SECURITY_HEADERS },
  /*
   * No `manualChunks` any more.
   *
   * It used to split three and drei out of the entry chunk, because the 3D slots
   * only needed them once one scrolled into range. Nothing imports either now
   * that the WebGL bottle is retired — but naming a package in `manualChunks`
   * pulls it into the graph whether or not anything imports it, so the split was
   * keeping 188kB of drei alive and, worse, referenced from `index.html`. Every
   * visitor was downloading a 3D library for a feature that no longer exists.
   *
   * The archived code under `src/three/` still imports both, which is why they
   * stay in package.json. Unimported, Rollup drops them entirely.
   */
})
