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

/**
 * Upper bounds, which every field needs and none of them had.
 *
 * Each check below was a minimum with no maximum, so a 5,000-character street
 * address validated cleanly, was charged for, and only then went to Shiprocket
 * — which refuses it. That is the worst shape a failure can take here: the
 * money is taken, no order exists behind it, and somebody has to notice.
 *
 * Refusing at the door turns that into a 400 naming the field, before a payment
 * sheet has opened. The numbers are the courier's own column widths with room
 * to spare, not guesses about how long a name can be — nobody legitimate is
 * near them.
 */
const LIMITS = {
  name: 120,
  email: 254, // RFC 5321
  line1: 255,
  line2: 255,
  city: 100,
  state: 100,
} as const;

/**
 * Angle brackets, which no name or Indian postal address contains.
 *
 * These fields are copied verbatim into somebody else's admin panel — the
 * Shiprocket order list — and we control neither how that panel escapes what we
 * send nor what it does with a `<script>` in a customer name. Our own pages are
 * safe by construction, because React escapes on render, but "safe where we
 * render it" is not the same as "safe to forward".
 *
 * Razorpay turned out to reject `<script>` in order notes itself, which is why
 * this went unnoticed: the prepaid path had an accidental second filter. The
 * COD path has none — it goes straight from here to Shiprocket without passing
 * through Razorpay at all — so the guard belongs at our own door rather than
 * borrowed from a payment provider that never promised it.
 *
 * Refused outright rather than stripped. Silently editing somebody's name is
 * its own small failure, and a buyer told which field to fix can fix it.
 */
const MARKUP = /[<>]/;

function bounded(field: keyof typeof LIMITS, value: string): string {
  if (value.length > LIMITS[field]) {
    throw new InvalidAddressError(field, `That ${field} is too long`);
  }
  if (MARKUP.test(value)) {
    throw new InvalidAddressError(field, `That ${field} cannot contain < or >`);
  }
  return value;
}

export function parseAddress(input: unknown): Address {
  if (typeof input !== 'object' || input === null) {
    throw new InvalidAddressError('address', 'Address is missing');
  }
  const raw = input as Record<string, unknown>;

  const name = bounded('name', text(raw.name));
  if (name.length < 2) throw new InvalidAddressError('name', 'Enter a name');

  /*
   * Shiprocket wants first and last name separately, and a single-word name is
   * common in India. Repeating the given name as the surname is what their own
   * panel does in that case, and it beats rejecting a legitimate name.
   */
  const parts = name.split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];

  const email = bounded('email', text(raw.email));
  if (!EMAIL.test(email)) throw new InvalidAddressError('email', 'Enter a valid email address');

  // A pasted number often carries +91, a leading zero, spaces or hyphens. All of
  // those are the same number, so they are normalised rather than refused.
  const phone = text(raw.phone).replace(/[\s-]/g, '').replace(/^(\+91|0)/, '');
  if (!MOBILE.test(phone)) {
    throw new InvalidAddressError('phone', 'Enter a 10-digit mobile number');
  }

  const line1 = bounded('line1', text(raw.line1));
  if (line1.length < 5) throw new InvalidAddressError('line1', 'Enter the street address');

  const city = bounded('city', text(raw.city));
  if (!city) throw new InvalidAddressError('city', 'Enter the city');

  const state = bounded('state', text(raw.state));
  if (!state) throw new InvalidAddressError('state', 'Enter the state');

  const pincode = text(raw.pincode);
  if (!PINCODE.test(pincode)) {
    throw new InvalidAddressError('pincode', 'Enter a valid 6-digit PIN code');
  }

  return { name, firstName, lastName, email, phone, line1, line2: bounded('line2', text(raw.line2)), city, state, pincode };
}
