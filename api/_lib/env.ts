/**
 * Server-side configuration.
 *
 * Every value here is a secret and must never reach the browser bundle. Note
 * the absence of a `VITE_` prefix on all of them — that prefix is precisely how
 * a value gets inlined into client JavaScript by Vite, so using it here would
 * publish the credentials it is meant to protect.
 *
 * Read lazily rather than at module load. A serverless function that throws
 * while importing fails with an opaque 500 and no log line pointing at the
 * cause; reading at call time lets the handler return something a developer can
 * act on.
 */

export class MissingConfigError extends Error {
  constructor(name: string) {
    super(`Missing required environment variable: ${name}`);
    this.name = 'MissingConfigError';
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new MissingConfigError(name);
  return value;
}

/**
 * Shiprocket authenticates with the email and password of a dedicated **API
 * user**, created under Settings → API in the panel. That is deliberately not
 * the account you log in with: it can be rotated without locking anyone out,
 * and it limits what a leak exposes.
 */
export const shiprocket = () => ({
  email: required('SHIPROCKET_API_EMAIL'),
  password: required('SHIPROCKET_API_PASSWORD'),
  baseUrl: process.env.SHIPROCKET_BASE_URL ?? 'https://apiv2.shiprocket.in/v1/external',
  /** Pickup PIN code that serviceability is measured from. */
  pickupPincode: required('SHIPROCKET_PICKUP_PINCODE'),
});

/** Whether the integrations are wired at all. Lets handlers 501 rather than 500. */
export const isConfigured = {
  shiprocket: () => Boolean(process.env.SHIPROCKET_API_EMAIL && process.env.SHIPROCKET_API_PASSWORD),
};
