/**
 * THE SHIPPING SEAM.
 *
 * Same shape as the checkout seam, same reason. Serviceability is the one
 * Shiprocket call that belongs on our side of the handoff — it happens while
 * the buyer is still deciding, which makes it a conversion tool rather than a
 * fulfilment one. "Delivers to 400001 by Tuesday, COD available" in the bag is
 * worth more than the same information after payment.
 *
 * Everything above this file is written against the port, so the estimate UI
 * can be finished and reviewed before an API key exists.
 */

export type DeliveryEstimate = {
  /** Whether any courier will carry this parcel to this pincode at all. */
  serviceable: boolean;

  /** Human-facing place name for the pincode, when the provider returns one. */
  place?: string;

  /**
   * Estimated delivery date, ISO `YYYY-MM-DD`.
   *
   * Optional on purpose: some couriers return serviceability with no ETA, and
   * showing "delivers by —" is worse than showing serviceability alone. The UI
   * must degrade rather than invent a date.
   */
  etaDate?: string;

  /** Whether cash on delivery is available for this pincode. */
  codAvailable?: boolean;
};

export type ShippingProvider = {
  readonly id: string;

  /**
   * Weight matters because serviceability is weight-banded — a courier that
   * covers a pincode for 200g may not cover it for 5kg, so checking without the
   * cart's actual weight produces an answer that can be wrong at checkout.
   */
  check(pincode: string, weightGrams: number): Promise<DeliveryEstimate>;
};

/** Thrown by the stub so the UI can show an honest state during the build. */
export class ShippingNotConnectedError extends Error {
  constructor() {
    super('Delivery estimates are not connected yet.');
    this.name = 'ShippingNotConnectedError';
  }
}
