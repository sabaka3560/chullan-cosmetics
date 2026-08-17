import type { PricedCart } from './pricing.js';

/**
 * Development mode.
 *
 * Neither Shiprocket nor fastrr publishes a sandbox, and both gate real
 * credentials behind onboarding that takes days. Waiting on that to find out
 * whether the checkout flow holds together is the wrong order of work — so this
 * stands in for both, and the whole purchase can be walked end to end with no
 * third-party account at all.
 *
 * Deliberately server-side rather than a client flag. The browser talks to the
 * same routes, gets the same response shapes, and runs the same pricing,
 * validation and signing code it will run in production. Only the outbound call
 * is replaced. A mock that bypassed the API would be testing a code path that
 * ships to nobody.
 *
 * OFF UNLESS EXPLICITLY ASKED FOR. `COMMERCE_MODE` must equal `mock` exactly —
 * not merely be present, not "truthy". A fake delivery promise reaching a real
 * buyer is the failure this guard exists to prevent, so it fails closed.
 */
export function isMockMode(): boolean {
  return process.env.COMMERCE_MODE === 'mock';
}

/**
 * A plausible courier answer.
 *
 * Derived from the pincode rather than constant, so the UI is exercised against
 * varying data instead of one happy path — a serviceable metro, a slower
 * remote pincode, and a genuinely unserviceable one all appear.
 *
 * The unserviceable case matters most. It is the branch nobody remembers to
 * design, and with a constant "yes" it would never render until a real buyer in
 * a remote pincode hit it.
 */
export function mockServiceability(pincode: string, weightGrams: number) {
  const seed = Number(pincode.slice(-2));

  // Roughly one pincode in ten refuses, so the negative branch is reachable by
  // trying a couple of codes rather than by reading the source.
  if (seed % 10 === 7) {
    return { serviceable: false, mock: true };
  }

  // Heavier parcels take longer, which is true of real couriers and keeps the
  // weight path honest.
  const days = 2 + (seed % 4) + (weightGrams > 1000 ? 1 : 0);

  return {
    serviceable: true,
    etaDate: new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10),
    place: 'Bengaluru',
    // COD off on a slice of pincodes, since prepaid-only is a real state the
    // drawer has copy for.
    codAvailable: seed % 5 !== 3,
    mock: true,
  };
}

/**
 * Stands in for the fastrr session.
 *
 * Returns a URL back into this app rather than to a payment page, because there
 * is nothing to pay. The reference is passed along so the confirmation screen
 * can show something order-shaped, and `mock=1` is in the query string so that
 * screen can say plainly what it is.
 */
export function mockCheckoutHandoff(cart: PricedCart, origin: string) {
  const reference = `MOCK-${Date.now().toString(36).toUpperCase()}`;
  const params = new URLSearchParams({
    ref: reference,
    total: String(cart.subtotalMinor),
    items: String(cart.itemCount),
    mock: '1',
  });

  return { url: `${origin}/order-confirmed?${params}`, reference, mock: true };
}
