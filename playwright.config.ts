import { defineConfig, devices } from '@playwright/test';

/**
 * Runs against the production build, not the dev server.
 *
 * Dev serves unminified modules through Vite's transform pipeline, which papers
 * over things that only bite in production — and the whole point of these tests
 * is to catch layout that breaks in what actually ships. `vite preview` serves
 * `dist/`, so a failure here is a failure a buyer would have seen.
 */
const PORT = 4173;

/**
 * Pointing at a deployed URL skips the local build entirely, which is how these
 * get run against a preview or production deploy to confirm what actually
 * shipped — and how they were verified as non-vacuous in the first place, by
 * being aimed at a build that predated the fixes and made to fail.
 */
const EXTERNAL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  // Layout assertions are deterministic; a retry would only hide a real flake.
  retries: 0,

  /**
   * 60s rather than the 30s default. Pages carrying a live WebGL canvas take
   * real time to reach network idle, and the cross-page tests walk all nine
   * routes inside a single test — under the default budget those failed as
   * timeouts, which reads exactly like a genuine assertion failure and sent me
   * looking for a CSS bug that was not there.
   */
  timeout: 60_000,
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: EXTERNAL ?? `http://localhost:${PORT}`,
  },

  projects: [
    // The two phones that bracket the real range: a 360px Android is about the
    // narrowest screen still in meaningful use, and iPhone 12 covers the
    // notched-iOS side with a different pixel ratio and safe-area behaviour.
    {
      name: 'android-360',
      use: { ...devices['Galaxy S9+'], viewport: { width: 360, height: 740 } },
    },
    {
      name: 'iphone-12',
      use: { ...devices['iPhone 12'] },
    },
    // Desktop is here to prove the mobile fixes did not regress the wide
    // layout — several of them are scoped to `hover: none` precisely so they
    // do not apply here, and that scoping needs a test or it will rot.
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],

  webServer: EXTERNAL
    ? undefined
    : {
        command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
        port: PORT,
        /**
         * Never reuse. Playwright's reuse check is "is something listening on
         * this port", which cannot tell a current build from a stale one — so a
         * `vite preview` left over from an earlier run keeps serving the old
         * `dist/` and the whole suite silently grades the previous commit.
         *
         * That is the worst possible failure mode for a test suite: it reports
         * confidently about code that is not the code you wrote.
         */
        reuseExistingServer: false,
        timeout: 180_000,
      },
});
