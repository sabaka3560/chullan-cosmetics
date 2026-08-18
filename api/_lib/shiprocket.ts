import { shiprocket } from './env.js';

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

async function login(): Promise<string> {
  const { email, password, baseUrl } = shiprocket();

  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    // Deliberately does not echo the response body: a failed auth response can
    // contain the submitted credentials, and this string ends up in logs.
    //
    // 4xx means the email/password pair was refused — a configuration problem
    // nobody will solve by retrying. 5xx is Shiprocket having a bad day.
    if (response.status >= 400 && response.status < 500) {
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

/**
 * A thin authenticated fetch. Retries once on 401 with a fresh token, because
 * the only way to discover a token was revoked early is to be told.
 */
export async function shiprocketFetch(
  path: string,
  init: RequestInit = {},
  retryOnUnauthorised = true,
): Promise<unknown> {
  const { baseUrl } = shiprocket();
  const token = await getToken();

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (response.status === 401 && retryOnUnauthorised) {
    cache = null;
    return shiprocketFetch(path, init, false);
  }

  if (!response.ok) {
    throw new ShiprocketError(`Shiprocket ${path} failed`, response.status);
  }

  return response.json();
}
