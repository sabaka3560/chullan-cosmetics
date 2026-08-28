import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { catalogBySku, unitPriceMinor } from '../../src/data/catalog';

/**
 * What one unit of a SKU costs today, offer included.
 *
 * These fixtures used to carry the figure written out beside the SKU. That is
 * the same mistake the code under test exists to prevent — a price transcribed
 * in a second place drifts from the catalog, and here it drifts silently into
 * an amount-mismatch failure that looks like the gate working when it is only
 * the fixture being wrong.
 */
const priceOf = (sku: string) => {
  const entry = catalogBySku(sku)!;
  return unitPriceMinor(entry.product, entry.variant);
};

/**
 * What `/api/orders/create` is allowed to ship.
 *
 * The signature Razorpay hands back proves that a payment exists and belongs to
 * a given order. It proves nothing whatsoever about the goods — it is an HMAC
 * over `order_id|payment_id` and no basket is inside it.
 *
 * So the bag cannot come from the same request that carries the signature. If
 * it does, a buyer can pay for the cheapest thing in the catalog, keep the
 * signature they were legitimately given, and post it back alongside a
 * different, larger bag. Every individual check passes: the signature is real,
 * the payment is real, the SKUs are real, and the server dutifully re-prices
 * them — to a number nobody paid.
 *
 * The bag is therefore read from the Razorpay order's own notes, fetched over
 * an authenticated connection, exactly as the webhook does. These tests exist
 * to keep it that way: the first one is the attack, and it must not work.
 */

const KEY_SECRET = 'test-key-secret';
const ORDER_ID = 'order_TESTORDER1';
const PAYMENT_ID = 'pay_TESTPAYMENT1';

const CHEAP = { sku: 'CHU-ASP-10-BAN', qty: 1, minor: priceOf('CHU-ASP-10-BAN') };
const PRICEY = {
  sku: 'CHU-FDN-30-01',
  qty: 10,
  minor: priceOf('CHU-FDN-30-01') * 10,
};

/** The bag the buyer actually paid for, as stored when the order was created. */
const PAID_NOTES = {
  reference: 'CHU-TESTREF',
  lines: `${CHEAP.sku}:${CHEAP.qty}`,
  name: 'Test Buyer',
  email: 'buyer@example.com',
  phone: '9876543210',
  line1: '1 Test Street',
  line2: '',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
  itemCount: '1',
  weightGrams: '100',
};

/** Captures what would have been sent to Shiprocket, and never calls out. */
const shipped: Array<Record<string, unknown>> = [];

vi.mock('../../api/_lib/shiprocket.js', async () => {
  const actual = await vi.importActual<typeof import('../../api/_lib/shiprocket.js')>(
    '../../api/_lib/shiprocket.js',
  );
  return {
    ...actual,
    shiprocketFetch: vi.fn(async (_path: string, init?: { body?: string }) => {
      shipped.push(JSON.parse(init?.body ?? '{}'));
      return { order_id: 12345, shipment_id: 67890, status: 'NEW' };
    }),
  };
});

/** What the mocked Razorpay account returns. Reset per test. */
const rzp: { amount: number; notes: unknown } = { amount: CHEAP.minor, notes: PAID_NOTES };

vi.mock('../../api/_lib/razorpay.js', async () => {
  const actual = await vi.importActual<typeof import('../../api/_lib/razorpay.js')>(
    '../../api/_lib/razorpay.js',
  );
  return {
    ...actual,
    razorpayClient: () => ({
      orders: {
        fetch: async () => ({ id: ORDER_ID, amount: rzp.amount, notes: rzp.notes }),
      },
      payments: {
        fetch: async () => ({ id: PAYMENT_ID, status: 'captured', amount: rzp.amount, order_id: ORDER_ID }),
      },
    }),
  };
});

const handler = (await import('../../api/orders/create.js')).default;

function res() {
  const out: { code?: number; body?: any; headers: Record<string, string> } = { headers: {} };
  const self = {
    status(code: number) { out.code = code; return self; },
    json(body: unknown) { out.body = body; return self; },
    setHeader(k: string, v: string) { out.headers[k] = v; return self; },
    out,
  };
  return self;
}

async function post(body: Record<string, unknown>) {
  const r = res();
  await (handler as unknown as (a: unknown, b: unknown) => Promise<unknown>)(
    { method: 'POST', headers: {}, body },
    r,
  );
  return r.out;
}

/** A genuine signature — this is the whole point: the attacker has a real one. */
const realSignature = createHmac('sha256', KEY_SECRET)
  .update(`${ORDER_ID}|${PAYMENT_ID}`)
  .digest('hex');

const ADDRESS = {
  name: 'Test Buyer',
  email: 'buyer@example.com',
  phone: '9876543210',
  line1: '1 Test Street',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
};

describe('/api/orders/create cannot be talked into shipping unpaid goods', () => {
  beforeEach(() => {
    shipped.length = 0;
    rzp.amount = CHEAP.minor;
    rzp.notes = PAID_NOTES;
    process.env.RAZORPAY_KEY_ID = 'rzp_test_x';
    process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
    process.env.SHIPROCKET_API_EMAIL = 'a@b.c';
    process.env.SHIPROCKET_API_PASSWORD = 'pw';
    process.env.SHIPROCKET_PICKUP_LOCATION = 'Primary';
  });

  it('ignores a swapped-in bag and ships only what was paid for', async () => {
    const out = await post({
      paymentMethod: 'Prepaid',
      razorpay_order_id: ORDER_ID,
      razorpay_payment_id: PAYMENT_ID,
      razorpay_signature: realSignature,
      address: ADDRESS,
      // The tamper: a valid signature for a ₹795 payment, posted with ₹18,000
      // of goods. Everything here is individually legitimate.
      lines: [{ sku: PRICEY.sku, qty: PRICEY.qty }],
    });

    expect(out.code).toBe(200);
    expect(shipped).toHaveLength(1);

    const items = shipped[0].order_items as Array<{ sku: string; units: number }>;
    expect(items).toHaveLength(1);
    expect(items[0].sku).toBe(CHEAP.sku);
    expect(items[0].units).toBe(CHEAP.qty);

    // In rupees at the Shiprocket boundary, and it must be the paid figure.
    expect(shipped[0].sub_total).toBe((CHEAP.minor + 9900) / 100);
  });

  it('still refuses a forged signature', async () => {
    const out = await post({
      paymentMethod: 'Prepaid',
      razorpay_order_id: ORDER_ID,
      razorpay_payment_id: PAYMENT_ID,
      razorpay_signature: 'deadbeef',
      address: ADDRESS,
      lines: [{ sku: CHEAP.sku, qty: 1 }],
    });

    expect(out.code).toBe(400);
    expect(out.body.error).toBe('invalid_signature');
    expect(shipped).toHaveLength(0);
  });

  it('refuses when payment proof is absent entirely', async () => {
    const out = await post({
      paymentMethod: 'Prepaid',
      address: ADDRESS,
      lines: [{ sku: CHEAP.sku, qty: 1 }],
    });

    expect(out.code).toBe(400);
    expect(out.body.error).toBe('missing_payment_proof');
    expect(shipped).toHaveLength(0);
  });

  it('uses the reference minted at session time, so the webhook cannot double-ship', async () => {
    const out = await post({
      paymentMethod: 'Prepaid',
      razorpay_order_id: ORDER_ID,
      razorpay_payment_id: PAYMENT_ID,
      razorpay_signature: realSignature,
      address: ADDRESS,
      lines: [{ sku: CHEAP.sku, qty: 1 }],
    });

    expect(out.body.reference).toBe(PAID_NOTES.reference);
    expect(shipped[0].order_id).toBe(PAID_NOTES.reference);
  });
});

/*
 * The amount gate, in both directions.
 *
 * Magic Checkout creates the Razorpay order for the subtotal and then adds
 * delivery on top, having asked `/api/shipping-info` what it costs. So a
 * genuine payment is routinely larger than the order was created for, by
 * exactly our own shipping fee. A gate that only accepted the bare subtotal
 * would reject real orders — and on the webhook, which exists precisely to
 * rescue an order nobody is watching, it would do it silently.
 */
describe('the paid-amount gate', () => {
  beforeEach(() => {
    shipped.length = 0;
    rzp.amount = CHEAP.minor;
    rzp.notes = PAID_NOTES;
    process.env.RAZORPAY_KEY_ID = 'rzp_test_x';
    process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
    process.env.SHIPROCKET_API_EMAIL = 'a@b.c';
    process.env.SHIPROCKET_API_PASSWORD = 'pw';
    process.env.SHIPROCKET_PICKUP_LOCATION = 'Primary';
  });

  it('accepts a payment that includes the shipping fee', async () => {
    rzp.amount = CHEAP.minor + 9900; // subtotal + ₹99 delivery, as charged

    const out = await post({
      paymentMethod: 'Prepaid',
      razorpay_order_id: ORDER_ID,
      razorpay_payment_id: PAYMENT_ID,
      razorpay_signature: realSignature,
      address: ADDRESS,
      lines: [{ sku: CHEAP.sku, qty: CHEAP.qty }],
    });

    expect(out.code).toBe(200);
    expect(shipped).toHaveLength(1);
  });

  /*
   * The fallback path: an order created before the notes format existed. There
   * is no authenticated record of the bag, so the request is used — and this is
   * the check standing between that and a swapped bag.
   */
  it('refuses a swapped bag when there are no notes to read', async () => {
    rzp.notes = {};

    const out = await post({
      paymentMethod: 'Prepaid',
      razorpay_order_id: ORDER_ID,
      razorpay_payment_id: PAYMENT_ID,
      razorpay_signature: realSignature,
      address: ADDRESS,
      lines: [{ sku: PRICEY.sku, qty: PRICEY.qty }],
    });

    expect(out.code).toBe(400);
    expect(out.body.error).toBe('amount_mismatch');
    expect(shipped).toHaveLength(0);
  });

  it('still fulfils an honest bag when there are no notes', async () => {
    rzp.notes = {};

    const out = await post({
      paymentMethod: 'Prepaid',
      razorpay_order_id: ORDER_ID,
      razorpay_payment_id: PAYMENT_ID,
      razorpay_signature: realSignature,
      address: ADDRESS,
      lines: [{ sku: CHEAP.sku, qty: CHEAP.qty }],
    });

    expect(out.code).toBe(200);
    expect(shipped).toHaveLength(1);
    expect((shipped[0].order_items as Array<{ sku: string }>)[0].sku).toBe(CHEAP.sku);
  });
});
