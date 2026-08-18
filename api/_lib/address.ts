/**
 * The delivery address, parsed from untrusted input.
 *
 * Everything here arrives from a browser, so nothing is assumed. The rules are
 * deliberately the courier's rules rather than a generic form validator's: a
 * 10-digit Indian mobile, a 6-digit PIN with no leading zero, and a name that
 * can be split into first and last because Shiprocket requires both.
 */

export type Address = {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

export class InvalidAddressError extends Error {
  constructor(readonly field: string, message: string) {
    super(message);
    this.name = 'InvalidAddressError';
  }
}

const PINCODE = /^[1-9][0-9]{5}$/;
/** Ten digits starting 6-9. Accepts a +91 or 0 prefix and strips it. */
const MOBILE = /^[6-9][0-9]{9}$/;
const EMAIL = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export function parseAddress(input: unknown): Address {
  if (typeof input !== 'object' || input === null) {
    throw new InvalidAddressError('address', 'Address is missing');
  }
  const raw = input as Record<string, unknown>;

  const name = text(raw.name);
  if (name.length < 2) throw new InvalidAddressError('name', 'Enter a name');

  /*
   * Shiprocket wants first and last name separately, and a single-word name is
   * common in India. Repeating the given name as the surname is what their own
   * panel does in that case, and it beats rejecting a legitimate name.
   */
  const parts = name.split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];

  const email = text(raw.email);
  if (!EMAIL.test(email)) throw new InvalidAddressError('email', 'Enter a valid email address');

  // A pasted number often carries +91, a leading zero, spaces or hyphens. All of
  // those are the same number, so they are normalised rather than refused.
  const phone = text(raw.phone).replace(/[\s-]/g, '').replace(/^(\+91|0)/, '');
  if (!MOBILE.test(phone)) {
    throw new InvalidAddressError('phone', 'Enter a 10-digit mobile number');
  }

  const line1 = text(raw.line1);
  if (line1.length < 5) throw new InvalidAddressError('line1', 'Enter the street address');

  const city = text(raw.city);
  if (!city) throw new InvalidAddressError('city', 'Enter the city');

  const state = text(raw.state);
  if (!state) throw new InvalidAddressError('state', 'Enter the state');

  const pincode = text(raw.pincode);
  if (!PINCODE.test(pincode)) {
    throw new InvalidAddressError('pincode', 'Enter a valid 6-digit PIN code');
  }

  return { name, firstName, lastName, email, phone, line1, line2: text(raw.line2), city, state, pincode };
}
