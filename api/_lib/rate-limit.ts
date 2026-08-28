import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Per-IP request limits.
 *
 *
 * WHAT THIS IS, AND WHAT IT HONESTLY IS NOT
 *
 * The counters live in module scope, which in a serverless runtime means one
 * bucket per warm container rather than one per site. A client spread across
 * enough cold starts gets more through than the numbers below suggest, and two
 * containers serving at once each allow a full budget.
 *
 * That is a real weakness and it is still worth having. The threat here is not
 * a funded adversary; it is a loop in a terminal. `/api/checkout/session`
 * creates a genuine Razorpay order on every call, so an unattended `while true`
 * fills a live merchant dashboard with junk and buries the real orders in it —
 * and `/api/serviceability` will happily burn the Shiprocket rate limit until
 * actual buyers cannot check delivery. Both are stopped by counting in one
 * process.
 *
 * The alternative is a shared store, and the same argument in `shiprocket.ts`
 * applies: standing up Redis to hold a handful of integers is a bigger system
 * to keep alive than the problem justifies today. Revisit when there is a
 * datastore for other reasons.
 *
 *
 * WHAT IS DELIBERATELY NOT LIMITED
 *
 * `/api/orders/create` and `/api/webhooks/razorpay` are on the money path. A
 * limiter there refuses to ship an order somebody has already paid for, or
 * turns Razorpay's retry into a permanent failure — both far worse than the
 * abuse they would prevent. Neither needs it anyway: order creation does
 * nothing expensive until an HMAC verifies, and the webhook does nothing until
 * an authenticated lookup confirms the payment is real and captured.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Bounded so a stream of unique IPs cannot grow the map without limit — which
 * would turn a rate limiter into the memory leak that takes the function down.
 */
const MAX_TRACKED = 10_000;

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Still oversized after dropping the expired: the traffic is not what this is
  // sized for, so start clean rather than creep.
  if (buckets.size > MAX_TRACKED) buckets.clear();
}

/**
 * The caller's address.
 *
 * `x-real-ip` is set by Vercel's proxy and is the trustworthy one. A client can
 * send its own `x-forwarded-for`, so that is only a fallback — and reading the
 * wrong header means one attacker rotating a header value gets an unlimited
 * budget while sharing a bucket with nobody.
 */
function clientIp(request: VercelRequest): string {
  const real = request.headers['x-real-ip'];
  if (typeof real === 'string' && real) return real;

  const forwarded = request.headers['x-forwarded-for'];
  const chain = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = chain?.split(',')[0]?.trim();
  return first || 'unknown';
}

export type RateLimitRule = {
  /** Names the bucket, so one route's budget is not spent by another. */
  name: string;
  limit: number;
  windowMs: number;
};

/** Order creation at Razorpay — the expensive one, and the one worth guarding. */
export const CHECKOUT_LIMIT: RateLimitRule = {
  name: 'checkout',
  limit: 12,
  windowMs: 10 * 60 * 1000,
};

/**
 * Cheap for us, metered by Shiprocket. Loose enough that a buyer trying several
 * pincodes for family and friends never notices it.
 */
export const LOOKUP_LIMIT: RateLimitRule = {
  name: 'lookup',
  limit: 40,
  windowMs: 5 * 60 * 1000,
};

/** Operational, not a buyer route. Nobody legitimate calls this in a loop. */
export const ADMIN_LIMIT: RateLimitRule = {
  name: 'admin',
  limit: 6,
  windowMs: 60 * 60 * 1000,
};

/**
 * Counts this request and answers whether to serve it.
 *
 * Sends `Retry-After` and the `RateLimit-*` headers on refusal, because a
 * client that is being throttled can only back off correctly if it is told for
 * how long — and a 429 with no guidance produces a tighter retry loop than the
 * one that caused it.
 *
 * Returns `true` when the request was refused AND the response has been sent,
 * so a handler reads as: `if (rateLimited(request, response, RULE)) return;`
 */
export function rateLimited(
  request: VercelRequest,
  response: VercelResponse,
  rule: RateLimitRule,
): boolean {
  const now = Date.now();
  prune(now);

  const key = `${rule.name}:${clientIp(request)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return false;
  }

  bucket.count += 1;
  if (bucket.count <= rule.limit) return false;

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  console.warn('[rate-limit] refused', rule.name, clientIp(request), `${bucket.count} in window`);

  response.setHeader('Retry-After', String(retryAfter));
  response.setHeader('RateLimit-Limit', String(rule.limit));
  response.setHeader('RateLimit-Remaining', '0');
  response.setHeader('RateLimit-Reset', String(retryAfter));
  response.status(429).json({
    error: 'rate_limited',
    message: 'Too many requests. Please wait a moment and try again.',
  });
  return true;
}
