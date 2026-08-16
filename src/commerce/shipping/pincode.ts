/**
 * Indian PIN code validation.
 *
 * This is deliberately local. Format errors are the overwhelming majority of
 * what a pincode field receives — typos, five digits, a phone number pasted
 * into the wrong box — and every one of those sent to a serviceability API is a
 * round trip spent to be told something a regex knows instantly. Checking here
 * makes the common failure feel immediate and keeps the network call for the
 * question only the network can answer.
 *
 * Six digits, first digit 1–9. The leading digit is the postal region: 1–8 are
 * the civilian regions, 9 is the Army Postal Service. Zero is never valid as a
 * leading digit, which is the single most common real typo this catches.
 */
const PINCODE = /^[1-9][0-9]{5}$/;

export type PincodeError = 'empty' | 'format';

export function validatePincode(raw: string): PincodeError | null {
  const trimmed = raw.trim();
  if (!trimmed) return 'empty';
  return PINCODE.test(trimmed) ? null : 'format';
}

/**
 * Strips everything that isn't a digit and caps at six.
 *
 * Applied on input rather than on submit so a pasted "400 001" or "400-001"
 * silently becomes valid instead of being rejected for punctuation the buyer
 * did not think of as part of the number.
 */
export function normalisePincode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 6);
}
