import { describe, expect, it } from 'vitest';
import { fromNotes, toNotes, IncompleteNotesError } from '../../api/_lib/pending';
import { isDuplicateOrder, totalsFor } from '../../api/_lib/fulfil';
import { ShiprocketError } from '../../api/_lib/shiprocket';
import { priceCart } from '../../api/_lib/pricing';
import { parseAddress } from '../../api/_lib/address';
import { CATALOG } from '../../src/data/catalog';

/**
 * The webhook exists for the case where the browser never comes back, so it
 * cannot be exercised by clicking through a checkout. These cover the parts
 * that decide whether a paid order ships: what survives the round trip through
 * Razorpay's notes, and whether a second delivery of the same event is
 * recognised as already done.
 */

const address = parseAddress({
  name: 'Asha Menon',
  email: 'asha@example.com',
  phone: '9876543210',
  line1: '12 Residency Road, Flat 4B',
  line2: 'Near the old post office',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560025',
});

const sku = CATALOG.find((p) => p.id === 'foundation')!.variants[0].sku;
const second = CATALOG.find((p) => p.id === 'moisturiser')!.variants[0].sku;

describe('pending order notes', () => {
  const lines = [{ sku, qty: 2 }, { sku: second, qty: 1 }];
  const notes = toNotes({ reference: 'CHU-ABC123', address, lines, itemCount: 3, weightGrams: 430 });

  it('fits inside Razorpay limits', () => {
    // 15 keys, 256 characters each. Exceeding either is rejected outright at
    // order creation, which would break checkout rather than the webhook.
    expect(Object.keys(notes).length).toBeLessThanOrEqual(15);
    for (const [key, value] of Object.entries(notes)) {
      expect(typeof value, `${key} must be a string`).toBe('string');
      expect(value.length, `${key} is ${value.length} chars`).toBeLessThanOrEqual(256);
    }
  });

  it('round-trips the reference, the bag and the address', () => {
    const back = fromNotes(notes);
    expect(back.reference).toBe('CHU-ABC123');
    expect(back.lines).toEqual(lines);
    expect(back.address).toEqual(address);
  });

  it('carries a full bag of every product without truncating', () => {
    const full = CATALOG.map((p) => ({ sku: p.variants[0].sku, qty: 9 }));
    const packed = toNotes({ reference: 'CHU-FULL', address, lines: full, itemCount: 72, weightGrams: 9000 });
    expect(packed.lines.length).toBeLessThanOrEqual(256);
    expect(fromNotes(packed).lines).toEqual(full);
  });

  it('refuses to guess when the notes are not ours', () => {
    expect(() => fromNotes({})).toThrow(IncompleteNotesError);
    expect(() => fromNotes({ reference: 'CHU-1' })).toThrow(IncompleteNotesError);
    expect(() => fromNotes(null)).toThrow(IncompleteNotesError);
  });

  it('prices from the catalog, never from the notes', () => {
    // Whatever a note claims, the amount comes from the catalog rows.
    const cart = priceCart(fromNotes(notes).lines);
    const expected = CATALOG.find((p) => p.id === 'foundation')!;
    expect(cart.lines[0].unitPriceMinor).toBe(
      expected.variants[0].priceMinor ?? expected.priceMinor,
    );
  });
});

describe('idempotency', () => {
  it('recognises Shiprocket refusing a repeated reference', () => {
    for (const message of [
      'The order id has already been taken.',
      'Order already exists',
      'Duplicate order_id',
    ]) {
      expect(isDuplicateOrder(new ShiprocketError(message, 422))).toBe(true);
    }
  });

  it('does not mistake a real failure for a duplicate', () => {
    expect(isDuplicateOrder(new ShiprocketError('Wrong pickup location', 400))).toBe(false);
    expect(isDuplicateOrder(new ShiprocketError('Internal server error', 500))).toBe(false);
    expect(isDuplicateOrder(new Error('network down'))).toBe(false);
  });
});

describe('totals agree across both fulfilment paths', () => {
  it('charges shipping under the free threshold and not over it', () => {
    const small = priceCart([{ sku: CATALOG.find((p) => p.id === 'anti-shine-powder')!.variants[0].sku, qty: 1 }]);
    const big = priceCart([{ sku, qty: 3 }]);
    expect(totalsFor(small, 'Prepaid').shippingFee).toBeGreaterThan(0);
    expect(totalsFor(big, 'Prepaid').shippingFee).toBe(0);
  });

  it('adds the COD fee only for COD', () => {
    const cart = priceCart([{ sku, qty: 1 }]);
    expect(totalsFor(cart, 'Prepaid').codFee).toBe(0);
    expect(totalsFor(cart, 'COD').codFee).toBeGreaterThan(0);
    expect(totalsFor(cart, 'COD').totalMinor).toBeGreaterThan(
      totalsFor(cart, 'Prepaid').totalMinor,
    );
  });
});
