import { describe, expect, it } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimited, type RateLimitRule } from '../../api/_lib/rate-limit';

/**
 * The limiter counts in module scope, so these tests must not share an IP or a
 * rule name between cases — a leaked bucket makes one test's budget disappear
 * into another's, and the failure looks like a limiter bug rather than a test
 * one. Every case below mints its own.
 */

let n = 0;
const uniqueRule = (limit: number, windowMs = 60_000): RateLimitRule => ({
  name: `test-${n++}`,
  limit,
  windowMs,
});

function fakeRequest(ip: string) {
  return { headers: { 'x-real-ip': ip } } as unknown as VercelRequest;
}

function fakeResponse() {
  const sent: { status?: number; body?: unknown; headers: Record<string, string> } = {
    headers: {},
  };
  const response = {
    setHeader: (k: string, v: string) => {
      sent.headers[k] = v;
    },
    status: (code: number) => {
      sent.status = code;
      return response;
    },
    json: (body: unknown) => {
      sent.body = body;
      return response;
    },
  } as unknown as VercelResponse;
  return { response, sent };
}

describe('rate limiting', () => {
  it('serves requests up to the limit and refuses the next', () => {
    const rule = uniqueRule(3);
    const request = fakeRequest('1.1.1.1');

    for (let i = 0; i < 3; i += 1) {
      const { response } = fakeResponse();
      expect(rateLimited(request, response, rule), `call ${i + 1} should pass`).toBe(false);
    }

    const { response, sent } = fakeResponse();
    expect(rateLimited(request, response, rule)).toBe(true);
    expect(sent.status).toBe(429);
  });

  it('tells a throttled client how long to wait', () => {
    const rule = uniqueRule(1);
    const request = fakeRequest('2.2.2.2');

    rateLimited(request, fakeResponse().response, rule);
    const { response, sent } = fakeResponse();
    rateLimited(request, response, rule);

    /*
     * A 429 with no Retry-After produces a tighter retry loop than the one that
     * caused it, so this header is the difference between backing a client off
     * and inviting it back immediately.
     */
    expect(Number(sent.headers['Retry-After'])).toBeGreaterThan(0);
    expect(sent.headers['RateLimit-Remaining']).toBe('0');
  });

  it('gives each address its own budget', () => {
    const rule = uniqueRule(1);

    expect(rateLimited(fakeRequest('3.3.3.3'), fakeResponse().response, rule)).toBe(false);
    expect(rateLimited(fakeRequest('3.3.3.3'), fakeResponse().response, rule)).toBe(true);
    // A different buyer must not inherit the first one's exhausted bucket.
    expect(rateLimited(fakeRequest('4.4.4.4'), fakeResponse().response, rule)).toBe(false);
  });

  it('keeps each route on its own budget', () => {
    const checkout = uniqueRule(1);
    const lookup = uniqueRule(1);
    const request = fakeRequest('5.5.5.5');

    expect(rateLimited(request, fakeResponse().response, checkout)).toBe(false);
    expect(rateLimited(request, fakeResponse().response, checkout)).toBe(true);
    // Spending the checkout budget must not close the delivery checker.
    expect(rateLimited(request, fakeResponse().response, lookup)).toBe(false);
  });

  it('reopens once the window has passed', () => {
    const rule = uniqueRule(1, 1); // one request, one millisecond
    const request = fakeRequest('6.6.6.6');

    expect(rateLimited(request, fakeResponse().response, rule)).toBe(false);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(rateLimited(request, fakeResponse().response, rule)).toBe(false);
        resolve();
      }, 5);
    });
  });

  it('does not let a client hand itself a fresh budget via x-forwarded-for', () => {
    const rule = uniqueRule(1);
    // Vercel sets `x-real-ip`; `x-forwarded-for` is client-controllable. If the
    // limiter preferred the spoofable one, rotating it would be an unlimited
    // budget — so the two must not disagree about who this is.
    const spoofing = {
      headers: { 'x-real-ip': '7.7.7.7', 'x-forwarded-for': '9.9.9.9' },
    } as unknown as VercelRequest;

    expect(rateLimited(spoofing, fakeResponse().response, rule)).toBe(false);

    const rotated = {
      headers: { 'x-real-ip': '7.7.7.7', 'x-forwarded-for': '8.8.8.8' },
    } as unknown as VercelRequest;
    expect(rateLimited(rotated, fakeResponse().response, rule)).toBe(true);
  });
});
