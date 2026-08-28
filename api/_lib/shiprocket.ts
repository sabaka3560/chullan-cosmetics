import { shiprocket } from './env.js';
import { UPSTREAM_TIMEOUT_MS } from './timeout.js';

/**
 * Shiprocket auth.
 *
 * Their `/auth/login` mints a JWT that lasts roughly ten days. Two consequences
 * shape everything below:
 *
 *   1. It must be cached. Logging in on every request would burn the rate limit
 *      and add a round trip to a call that is already on the buyer's critical
 *      path.
 *   2. It cannot be cached *durably* in a serverless runtime without a store.
 *      Module scope survives while a container stays warm and vanishes when it
 *      is recycled, which is the right trade here: worst case is an extra
 *      login, and the alternative is standing up Redis for one string.
 *
 * The token is refreshed a day early rather than on expiry. A token that
 * expires mid-request fails the buyer's serviceability check for no reason a
 * log would explain.
 */

type CachedToken = { token: string; expiresAt: number };

let cache: CachedToken | null = null;
/** Collapses concurrent cold-start logins into one request. */
let inFlight: Promise<string> | null = null;

const TOKEN_TTL_MS = 10 * 24 * 60 * 60 * 1000;
const REFRESH_EARLY_MS = 24 * 60 * 60 * 1000;

export class ShiprocketError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ShiprocketError';
  }
}

/**
 * Credentials were rejected, as opposed to Shiprocket being unreachable.
 *
 * Worth its own type because the two need completely different responses from
 * whoever is on call: one is "fix the environment variables", the other is
 * "wait". Collapsing them into a single upstream error sends people to read
 * status pages when the actual problem is a typo in a password.
 */
export class ShiprocketAuthError extends ShiprocketError {
  constructor(status: number) {
    super('Shiprocket rejected the API credentials', status);
    this.name = 'ShiprocketAuthError';
  }
}

/**
 * Turns transport failures into `ShiprocketError`.
 *
 * A timeout and a DNS failure arrive as `AbortError` and `TypeError`, which
 * every caller's `instanceof ShiprocketError` branch misses — so they fell
 * through to the generic 500 handler and, in the webhook, to a path that does
 * not ask Razorpay to retry. They are upstream trouble like any 5xx and want
 * the same treatment, so they are relabelled here at the boundary.
 */
async function withNetworkErrorsAsShiprocketErrors<T>(
  what: string,
  call: () => Promise<T>,
): Promise<T> {
  try {
    return await call();
  } catch (cause) {
    if (cause instanceof ShiprocketError) throw cause;
    const timedOut = cause instanceof Error && cause.name === 'TimeoutError';
    throw new ShiprocketError(
      timedOut
        ? `Shiprocket ${what} timed out`
        : `Shiprocket ${what} unreachable: ${cause instanceof Error ? cause.message : 'unknown'}`,
    );
  }
}

async function login(): Promise<string> {
  const { email, password, baseUrl } = shiprocket();

  const response = await withNetworkErrorsAsShiprocketErrors('auth/login', () =>
    fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      // Without a deadline a hung login holds the whole function until the
      // platform kills it, and a killed function logs no reason at all.
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    }),
  );

  if (!response.ok) {
    // Deliberately does not echo the response body: a failed auth response can
    // contain the submitted credentials, and this string ends up in logs.
    //
    // 4xx means the email/password pair was refused — a configuration problem
    // nobody will solve by retrying. 5xx is Shiprocket having a bad day.
    if (response.status >= 400 && response.status < 500) {
      /*
       * Logs the upstream's own `message` and nothing else.
       *
       * Shiprocket answers a bad credential with 403 rather than 401, so the
       * status alone cannot distinguish "wrong password" from "this account may
       * not use the API" — which is the difference between resetting a password
       * and ringing support. Its message says which; during setup here it read
       * "Invalid email and password combination", which settled it immediately.
       *
       * The full body stays out of the log: a failed auth response can echo the
       * submitted credentials.
       */
      const detail = await response
        .json()
        .then((body: unknown) =>
          typeof body === 'object' && body !== null
            ? String((body as { message?: unknown }).message ?? '')
            : '',
        )
        .catch(() => '');
      console.error('[shiprocket] auth refused', response.status, detail.slice(0, 200));
      throw new ShiprocketAuthError(response.status);
    }
    throw new ShiprocketError('Shiprocket authentication failed', response.status);
  }

  const data = (await response.json()) as { token?: string };
  if (!data.token) throw new ShiprocketError('Shiprocket returned no token');

  cache = { token: data.token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return data.token;
}

export async function getToken(): Promise<string> {
  if (cache && Date.now() < cache.expiresAt - REFRESH_EARLY_MS) return cache.token;

  // Without this, a cold start under load fires one login per concurrent
  // request and Shiprocket rate-limits the lot.
  if (!inFlight) {
    inFlight = login().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/** Attempts made when Shiprocket answers 5xx or the transport fails. */
const TRANSIENT_ATTEMPTS = 3;
/** Backoff between those attempts. Short: a buyer is waiting on this. */
const BACKOFF_MS = [0, 400, 1200];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads whatever the upstream said about a failure.
 *
 * Safe on these endpoints in a way it is not on `/auth/login`: no credentials
 * are submitted, so nothing sensitive can be echoed back. Worth having, because
 * `Shiprocket /orders/create/adhoc failed 422` alone never says *which* field
 * it disliked, and that is the whole question when an order will not go.
 */
async function failureDetail(response: Response): Promise<string> {
  return response
    .text()
    .then((body) => body.slice(0, 300))
    .catch(() => '');
}

/**
 * A thin authenticated fetch.
 *
 * Three failure modes, three different responses:
 *
 *   401  the token was revoked early. Re-auth once and try again — being told
 *        is the only way to discover it.
 *   5xx  Shiprocket is having a bad day. Retry with backoff.
 *   4xx  we sent something wrong. Retrying cannot fix it, so it fails at once
 *        carrying the upstream's own explanation.
 *
 * Retrying a create is safe because Shiprocket enforces uniqueness on
 * `order_id`, so a second arrival is refused rather than duplicated — the same
 * property the webhook already depends on.
 */
export async function shiprocketFetch(
  path: string,
  init: RequestInit = {},
  { timeoutMs = UPSTREAM_TIMEOUT_MS, retryOnUnauthorised = true } = {},
): Promise<unknown> {
  const { baseUrl } = shiprocket();

  let lastError: ShiprocketError | null = null;

  for (let attempt = 0; attempt < TRANSIENT_ATTEMPTS; attempt += 1) {
    if (BACKOFF_MS[attempt]) await sleep(BACKOFF_MS[attempt]);

    const token = await getToken();

    let response: Response;
    try {
      response = await withNetworkErrorsAsShiprocketErrors(path, () =>
        fetch(`${baseUrl}${path}`, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...init.headers,
          },
          signal: AbortSignal.timeout(timeoutMs),
        }),
      );
    } catch (cause) {
      // Transport-level: worth another go, but remember it in case this was
      // the last one.
      lastError = cause as ShiprocketError;
      continue;
    }

    if (response.status === 401 && retryOnUnauthorised) {
      cache = null;
      return shiprocketFetch(path, init, { timeoutMs, retryOnUnauthorised: false });
    }

    if (response.status >= 500) {
      lastError = new ShiprocketError(
        `Shiprocket ${path} failed: ${await failureDetail(response)}`,
        response.status,
      );
      console.warn('[shiprocket] transient', response.status, path, `attempt ${attempt + 1}`);
      continue;
    }

    if (!response.ok) {
      throw new ShiprocketError(
        `Shiprocket ${path} failed: ${await failureDetail(response)}`,
        response.status,
      );
    }

    return response.json();
  }

  console.error('[shiprocket] exhausted retries', path, lastError?.message);
  throw lastError ?? new ShiprocketError(`Shiprocket ${path} failed`);
}
