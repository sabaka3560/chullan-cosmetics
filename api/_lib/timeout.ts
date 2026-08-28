/**
 * Deadlines for outbound calls.
 *
 * Nothing in this codebase used to have one. That is not a theoretical gap: a
 * serverless function whose upstream never answers does not fail, it hangs
 * until the platform kills it — and a killed function returns no response at
 * all. In the Vercel log that surfaces as `responseStatusCode: 0`, with no
 * error line to explain it, which is exactly as useful as it sounds.
 *
 * A deadline converts that into a real error at a moment we choose, with a
 * message naming what we were waiting on.
 *
 * The values are deliberately shorter than the function's own limit. A timeout
 * that fires after the platform has already given up teaches us nothing.
 */

/** Upstreams on the buyer's critical path. Long enough for a slow but working API. */
export const UPSTREAM_TIMEOUT_MS = 10_000;

/** Order creation, which is slower and much more expensive to lose. */
export const FULFILMENT_TIMEOUT_MS = 15_000;

export class TimeoutError extends Error {
  constructor(
    readonly operation: string,
    readonly ms: number,
  ) {
    super(`${operation} did not respond within ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Races a promise against a deadline.
 *
 * Used for the Razorpay SDK, which builds its own requests and takes no
 * `AbortSignal`. The underlying call is not cancelled — it is abandoned. That
 * is an accepted cost: these are reads (`payments.fetch`, `orders.fetch`) and a
 * read nobody is waiting on does no harm, whereas a request we cannot stop
 * waiting for takes the whole function down with it.
 *
 * For `fetch`, prefer `AbortSignal.timeout()` — it cancels for real.
 */
export function withTimeout<T>(
  operation: string,
  promise: Promise<T>,
  ms: number = UPSTREAM_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(operation, ms)), ms);
  });

  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer)) as Promise<T>;
}
