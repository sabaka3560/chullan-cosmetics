import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { ROUTES } from './routes';

/**
 * The headers, and whether the page can actually live under them.
 *
 * A Content-Security-Policy is the one piece of hardening that can silently
 * break the thing it protects. Get `script-src` wrong and Razorpay's checkout
 * script never loads — the button does nothing, no error reaches the buyer, and
 * the only symptom is that sales stop. So this file checks both directions: the
 * policy is present and strict, *and* nothing the site legitimately needs is
 * blocked by it.
 *
 * The policy is enforced by `vercel.json` in production and mirrored onto
 * `vite preview` in `vite.config.ts`, because otherwise the only place to test
 * it would be the live site.
 */

const PAY_ORIGIN = 'https://checkout.razorpay.com';

/* ── The headers exist and say what they should ────────────────────────── */

test.describe('security headers', () => {
  test('every one is present on a page response', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    const headers = response!.headers();

    for (const name of [
      'content-security-policy',
      'x-frame-options',
      'x-content-type-options',
      'referrer-policy',
      'permissions-policy',
    ]) {
      expect(headers[name], `${name} is missing`).toBeTruthy();
    }

    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  /*
   * Clickjacking is the specific attack this closes, and a checkout is the
   * specific page worth doing it to: frame the real site, lay an invisible
   * button over "Pay", and the victim's own click authorises something they
   * cannot see. Both headers are set because `X-Frame-Options` is what older
   * browsers understand and `frame-ancestors` is what current ones enforce.
   */
  test('the site cannot be framed', async ({ page }) => {
    const response = await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    const headers = response!.headers();

    expect(headers['x-frame-options']?.toUpperCase()).toBe('DENY');
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });

  test('the policy forbids the things that make XSS useful', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    const csp = response!.headers()['content-security-policy'] ?? '';

    // No inline or eval'd script. `style-src` does allow inline, which is a
    // deliberate and much smaller concession — framer-motion animates through
    // element.style, and a style injection cannot execute code.
    const scriptSrc = csp.match(/script-src([^;]*)/)?.[1] ?? '';
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");

    // A stolen page cannot be repointed at an attacker's endpoint.
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("object-src 'none'");
  });

  /*
   * Only meaningful against a real deployment. `vite preview` proxies `/api` to
   * a `vercel dev` that is usually not running, and it does not read the
   * `/api/(.*)` rule out of `vercel.json` at all — so locally this would assert
   * against a 502 from the proxy and pass or fail for reasons unrelated to the
   * header. Skipped rather than weakened, so it still guards production.
   */
  test('API responses are never cached', async ({ request, baseURL }) => {
    test.skip(
      !!baseURL?.includes('localhost'),
      'API headers come from vercel.json; only observable on a deployment',
    );

    // A shared cache holding a checkout session would hand one buyer's order to
    // the next person behind the same proxy.
    const response = await request.post('/api/orders/create', {
      data: {},
      failOnStatusCode: false,
    });
    expect(response.headers()['cache-control']).toContain('no-store');
  });
});

/* ── The policy does not break the site ────────────────────────────────── */

test.describe('the policy does not break the site', () => {
  /*
   * The failure this exists for: a CSP that blocks the payment script. It is
   * invisible from the outside — the page renders perfectly and the checkout
   * button simply stops working — so it is asserted directly rather than
   * inferred from the page looking fine.
   */
  test('the Razorpay checkout script is allowed to load', async ({ page }, testInfo) => {
    /*
     * This one genuinely reaches out to Razorpay's CDN, which is why it earns
     * its keep — it is what caught `cdn.razorpay.com` being blocked, a fault no
     * amount of reading the policy string would have revealed, because
     * `checkout.js` pulls its risk-detection bundle from a second origin.
     *
     * It runs on one project only. The policy is not viewport-dependent, and
     * fetching a third party's script three times per suite is both flaky under
     * parallel load and rude to them.
     */
    test.skip(testInfo.project.name !== 'desktop', 'CSP does not vary by viewport');

    const blocked: string[] = [];
    page.on('console', (m) => {
      const text = m.text();
      if (/Content Security Policy|Refused to/i.test(text)) blocked.push(text);
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const verdict = await page.evaluate(async (src) => {
      try {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = src;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('did not load'));
          document.head.appendChild(s);
        });
        return 'loaded';
      } catch (e) {
        return (e as Error).message;
      }
    }, `${PAY_ORIGIN}/v1/checkout.js`);

    /*
     * The CSP violation is the assertion. Reachability is not: Razorpay being
     * slow, throttling a test runner, or the machine being offline are all
     * things that must not turn into a red build, because none of them say
     * anything about the policy. A blocked script always logs a violation, so
     * the check below cannot be fooled by a silent block.
     */
    const razorpayBlocks = blocked.filter((b) => /razorpay/i.test(b));
    expect(
      razorpayBlocks,
      `The CSP is blocking Razorpay. Checkout would silently stop working:\n${razorpayBlocks.join('\n')}`,
    ).toHaveLength(0);

    test.skip(verdict !== 'loaded', `CDN unreachable (${verdict}) — not a policy failure`);
    expect(verdict).toBe('loaded');
  });

  test('no page reports a CSP violation', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (m) => {
      const t = m.text();
      if (/Content Security Policy|Refused to (load|execute|apply|connect)/i.test(t)) {
        violations.push(t);
      }
    });

    for (const route of ROUTES) {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
    }

    expect(violations, `CSP violations:\n${violations.join('\n')}`).toHaveLength(0);
  });

  test('the stylesheet is not blocked by style-src', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });

    /*
     * Asserted against a custom property rather than a rendered font weight.
     *
     * The first version of this checked the `h1`'s computed weight, which is a
     * bad proxy twice over: `getComputedStyle` reports the *declared* weight
     * whether or not the font file ever arrived, and the value legitimately
     * differs between viewports — so it failed on iPhone while proving nothing
     * about the policy. A custom property only has a value if our stylesheet
     * parsed and applied, which is exactly the question `style-src 'self'`
     * decides, and it is identical on every screen.
     */
    const applied = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return {
        announceH: root.getPropertyValue('--announce-h').trim(),
        navH: root.getPropertyValue('--nav-h').trim(),
        bodyBackground: getComputedStyle(document.body).backgroundColor,
      };
    });

    expect(applied.announceH, 'our stylesheet did not apply').toMatch(/^\d+px$/);
    expect(applied.navH).toMatch(/^\d+px$/);
    // A transparent body would mean the theme tokens never landed.
    expect(applied.bodyBackground).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('the structured data survives the policy', async ({ page }) => {
    // JSON-LD sits in inline <script> tags. Browsers do not execute them, so a
    // strict script-src should leave them alone — but "should" is why this is
    // a test. Losing it costs the rich results the SEO work was for.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const blocks = await page.locator('script[type="application/ld+json"]').count();
    expect(blocks).toBeGreaterThan(0);

    const parsed = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .evaluate((el) => JSON.parse(el.textContent ?? '{}'));
    expect(parsed['@context']).toContain('schema.org');
  });
});

/* ── The two copies of the policy agree ────────────────────────────────── */

test.describe('the policy is defined once, in effect', () => {
  /*
   * Compared against the header the server actually sends, not against the
   * text of `vite.config.ts`.
   *
   * The first version read the config file and asserted the exempt directive
   * was absent from it — and failed, because the comment explaining the
   * exemption contains the directive's name. It was grepping prose. What
   * matters is not what the file says but what reaches the browser, so that is
   * what is measured now.
   */
  test('what the server sends matches what vercel.json declares', async ({ page, baseURL }) => {
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      headers: { source: string; headers: { key: string; value: string }[] }[];
    };
    const declared = vercel.headers
      .find((h) => h.source === '/(.*)')!
      .headers.find((h) => h.key === 'Content-Security-Policy')!.value;

    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    const served = response!.headers()['content-security-policy'] ?? '';

    /*
     * `upgrade-insecure-requests` rewrites http:// subresources to https://.
     * Free in production, where everything is already https — and fatal on the
     * plain-http preview server, because WebKit (unlike Chromium) applies it to
     * localhost, turning every asset into a TLS error and the page into a blank
     * screen. Named as the one deliberate difference so the next directive
     * cannot quietly go missing too.
     */
    const HTTPS_ONLY = ['upgrade-insecure-requests'];
    const overHttps = !!baseURL?.startsWith('https://');

    for (const directive of declared.split(';').map((d) => d.trim()).filter(Boolean)) {
      if (HTTPS_ONLY.includes(directive) && !overHttps) {
        expect(
          served,
          `${directive} must not be served over plain http — it blanks the page in WebKit`,
        ).not.toContain(directive);
        continue;
      }
      expect(served, `the server is not sending: ${directive}`).toContain(directive);
    }

    // Production must still declare them, wherever this test happens to run.
    for (const directive of HTTPS_ONLY) {
      expect(declared, `vercel.json lost: ${directive}`).toContain(directive);
    }
  });
});
