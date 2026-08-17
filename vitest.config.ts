import { defineConfig } from 'vitest/config';

/**
 * Unit tests only. `tests/e2e` belongs to Playwright, and pointing both runners
 * at one directory means whichever runs second tries to execute the other's
 * files and fails in a way that looks like a broken test rather than a broken
 * config.
 */
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
