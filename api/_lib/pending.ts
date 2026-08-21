import { parseAddress } from './address.js';
import type { Address } from './address.js';
import type { IncomingLine } from './pricing.js';

/**
 * Everything needed to fulfil an order, stashed on the Razorpay order itself.
 *
 * This is what lets the webhook work without a database.
 *
 * The problem it solves: when Razorpay tells us a payment was captured, all we
 * receive is a payment id. Not the address, not the bag. Today that information
 * only exists in the buyer's browser — which is precisely the thing that has
 * gone away in every case where the webhook is needed.
 *
 * So it is written into the Razorpay order's `notes` at the moment the order is
 * created, before the buyer is ever shown a payment sheet. Razorpay becomes the
 * durable record of a purchase in flight, which is a role it can hold because
 * the order already has to exist there for the payment to happen at all.
 *
 * Two constraints shape the format. Notes allow at most 15 keys with values up
 * to 256 characters, and every value must be a string — so the bag is packed
 * into one field rather than one field per line, and the address is split only
 * as far as the limit requires.
 *
 * Nothing here is trusted on the way back. The SKUs are re-priced from the
 * catalog and the address is re-validated, exactly as if a browser had posted
 * them, because notes on a Razorpay order are not a security boundary.
 */

export type Pending = {
  reference: string;
  address: Address;
  lines: IncomingLine[];
};

/** `SKU:qty|SKU:qty`. Compact enough that eight lines fit inside 256 chars. */
function packLines(lines: IncomingLine[]): string {
  return lines.map((line) => `${line.sku}:${line.qty}`).join('|');
}

function unpackLines(packed: string): IncomingLine[] {
  return packed
    .split('|')
    .filter(Boolean)
    .map((part) => {
      const at = part.lastIndexOf(':');
      return { sku: part.slice(0, at), qty: Number(part.slice(at + 1)) };
    })
    .filter((line) => line.sku && Number.isFinite(line.qty) && line.qty > 0);
}

/** Razorpay rejects a note longer than 256 characters outright. */
const cap = (value: string) => value.slice(0, 256);

export function toNotes({
  reference,
  address,
  lines,
  itemCount,
  weightGrams,
}: {
  reference: string;
  address: Address;
  lines: IncomingLine[];
  itemCount: number;
  weightGrams: number;
}): Record<string, string> {
  return {
    // Read back by both the browser path and the webhook, so the two agree on
    // one Shiprocket reference and the second one to arrive is a duplicate
    // rather than a second shipment.
    reference,
    lines: cap(packLines(lines)),
    // `name` is stored whole. `parseAddress` splits it into first and last the
    // same way on the way back, so the split lives in one place.
    name: cap(`${address.firstName} ${address.lastName}`.trim()),
    email: cap(address.email),
    phone: cap(address.phone),
    line1: cap(address.line1),
    line2: cap(address.line2),
    city: cap(address.city),
    state: cap(address.state),
    pincode: cap(address.pincode),
    itemCount: String(itemCount),
    weightGrams: String(weightGrams),
  };
}

export class IncompleteNotesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IncompleteNotesError';
  }
}

/**
 * Rebuilds a pending order from an existing Razorpay order's notes.
 *
 * Throws rather than guessing. An order created before this format existed, or
 * one made by hand in the Razorpay dashboard, has no notes to read — and a
 * half-built shipment is worse than a webhook that declines and leaves a log
 * line for a human.
 */
export function fromNotes(notes: unknown): Pending {
  const raw = (notes ?? {}) as Record<string, unknown>;
  const text = (key: string) => (typeof raw[key] === 'string' ? (raw[key] as string) : '');

  const reference = text('reference');
  if (!reference) {
    throw new IncompleteNotesError('Razorpay order carries no reference note');
  }

  const lines = unpackLines(text('lines'));
  if (lines.length === 0) {
    throw new IncompleteNotesError('Razorpay order carries no line notes');
  }

  // Re-validated through the same parser the checkout form goes through, so a
  // malformed note fails here rather than reaching Shiprocket.
  const address = parseAddress({
    name: text('name'),
    email: text('email'),
    phone: text('phone'),
    line1: text('line1'),
    line2: text('line2'),
    city: text('city'),
    state: text('state'),
    pincode: text('pincode'),
  });

  return { reference, address, lines };
}
