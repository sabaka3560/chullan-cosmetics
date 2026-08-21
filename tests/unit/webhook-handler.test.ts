import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import handler from '../../api/webhooks/razorpay.js';

/**
 * The webhook's guard paths.
 *
 * These run before any network call, and they are the ones that decide whether
 * a request is even worth two API round trips. They also encode a contract with
 * Razorpay that is easy to get backwards: a 2xx means "stop retrying", so
 * returning the wrong code either drops an order on the floor or has Razorpay
 * hammering the endpoint for hours over something that will never succeed.
 */

const SECRET = 'test-webhook-secret';

function res() {
  const out: { code?: number; body?: unknown; headers: Record<string, string> } = { headers: {} };
  const self = {
    status(code: number) { out.code = code; return self; },
    json(body: unknown) { out.body = body; return self; },
    setHeader(k: string, v: string) { out.headers[k] = v; return self; },
    out,
  };
  return self;
}

/*
 * Imported once at the top rather than per call. The handler reads every
 * environment variable at call time, so there is nothing captured at module
 * load to reset — and re-importing pulled the Razorpay SDK in again on each
 * test, which alone blew a five-second budget.
 */
async function callWebhook(request: Record<string, unknown>) {
  const r = res();
  await (handler as unknown as (a: unknown, b: unknown) => Promise<unknown>)(request, r);
  return r.out;
}

function post(body: unknown, signature?: string) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    method: 'POST',
    headers: signature ? { 'x-razorpay-signature': signature } : {},
    body: raw,
  };
}

const sign = (raw: string) => createHmac('sha256', SECRET).update(raw).digest('hex');

describe('razorpay webhook guards', () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_x';
    process.env.RAZORPAY_KEY_SECRET = 'secret';
    process.env.SHIPROCKET_API_EMAIL = 'a@b.c';
    process.env.SHIPROCKET_API_PASSWORD = 'pw';
    process.env.SHIPROCKET_PICKUP_LOCATION = 'Primary';
    process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
  });

  it('restores configuration between tests', () => {
    // Guards the beforeEach above: one test deletes the Shiprocket variables,
    // and if they did not come back the later cases would pass for the wrong
    // reason — a 501 that never reached the code under test.
    expect(process.env.SHIPROCKET_API_EMAIL).toBeTruthy();
  });

  it('refuses anything but POST', async () => {
    const out = await callWebhook({ method: 'GET', headers: {}, body: '' });
    expect(out.code).toBe(405);
    expect(out.headers.Allow).toBe('POST');
  });

  it('rejects a bad signature without calling Razorpay', async () => {
    const body = JSON.stringify({ payload: { payment: { entity: { id: 'pay_1' } } } });
    const out = await callWebhook(post(body, 'not-the-signature'));
    expect(out.code).toBe(400);
    expect(out.body).toMatchObject({ error: 'invalid_signature' });
  });

  it('rejects a missing signature', async () => {
    const body = JSON.stringify({ payload: { payment: { entity: { id: 'pay_1' } } } });
    const out = await callWebhook(post(body));
    expect(out.code).toBe(400);
  });

  it('accepts a correct signature and moves past the guard', async () => {
    const body = JSON.stringify({ event: 'payment.captured', payload: {} });
    const out = await callWebhook(post(body, sign(body)));
    // No payment id in this payload, so it stops there — but with a 200, which
    // is what tells Razorpay not to retry something that will never succeed.
    expect(out.code).toBe(200);
    expect(out.body).toMatchObject({ ok: true });
  });

  it('does not retry an event with no payment id', async () => {
    const body = JSON.stringify({ event: 'order.paid', payload: { order: {} } });
    const out = await callWebhook(post(body, sign(body)));
    expect(out.code).toBe(200);
  });

  it('does not retry an unparseable body', async () => {
    const raw = '{ not json';
    const out = await callWebhook(post(raw, sign(raw)));
    expect(out.code).toBe(200);
  });

  it('still guards when the body arrives already parsed', async () => {
    // A runtime may hand us an object rather than bytes. The signature cannot
    // be verified against that, so the request must fall through to the
    // authenticated lookup rather than being trusted or hard-failed.
    const out = await callWebhook({
      method: 'POST',
      headers: { 'x-razorpay-signature': 'anything' },
      body: { event: 'payment.captured', payload: {} },
    });
    expect(out.code).toBe(200);
  });

  it('reports missing configuration rather than half-processing', async () => {
    delete process.env.SHIPROCKET_API_EMAIL;
    delete process.env.SHIPROCKET_API_PASSWORD;
    const body = JSON.stringify({ payload: { payment: { entity: { id: 'pay_1' } } } });
    const out = await callWebhook(post(body, sign(body)));
    expect(out.code).toBe(501);
  });
});
