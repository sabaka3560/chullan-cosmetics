/**
 * Development mode.
 *
 * Shiprocket publishes no sandbox and gates credentials behind onboarding, so
 * this stands in for its serviceability call and the bag can be exercised with
 * no account at all.
 *
 * Checkout no longer needs a stand-in: Razorpay issues test keys immediately on
 * signup and they run against the real API, which is a better test than any
 * mock — the same code path, the same responses, only the money is imaginary.
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
