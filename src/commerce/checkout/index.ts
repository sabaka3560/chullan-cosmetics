import { CheckoutNotConnectedError } from './types';
import type { ResolvedCart } from '../types';

export { CheckoutNotConnectedError } from './types';

/**
 * Placing an order.
 *
 * Two paths converging on one place. Cash on delivery posts straight to our own
 * API, which creates the order in Shiprocket. Prepaid first creates a Razorpay
 * order, opens Checkout, and only on a successful payment posts the result —
 * signature included — to that same endpoint.
 *
 * The signature is the difference between a claim and proof. A browser saying
 * "I paid" is worth nothing; the server re-checks the HMAC before a shipment
 * exists.
 *
 * Nothing here sends a price. The cart travels as SKUs and quantities and the
 * server prices it, so the amount charged and the amount shipped are both
 * computed from the catalog rather than from anything a page could edit.
 */

export type PaymentMethod = 'Prepaid' | 'COD';

export type PlacedOrder = {
  reference: string;
  totalMinor: number;
  itemCount: number;
  testMode: boolean;
};

type SessionResponse = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  testMode: boolean;
};

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (payload: unknown) => void) => void;
    };
  }
}

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Loaded on demand rather than from `index.html`. Most visitors never reach
 * checkout, and a third-party script in the head blocks first paint for all of
 * them; fetching it on submit costs a moment at the one point where the buyer
 * already expects something to happen.
 */
let scriptPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Cleared so a retry can genuinely retry rather than inheriting a
      // permanently rejected promise; the usual cause is a blocked network.
      scriptPromise = null;
      reject(new Error('Could not reach the payment provider. Check your connection.'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

const toLines = (cart: ResolvedCart) =>
  cart.lines.map((line) => ({ sku: line.variant.sku, qty: line.qty }));

/** Surfaces the API's own message when it has one worth showing a buyer. */
async function readError(response: Response, fallback: string): Promise<never> {
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  throw new Error(body?.message ?? fallback);
}

async function createShiprocketOrder(
  cart: ResolvedCart,
  address: Record<string, string>,
  method: PaymentMethod,
  payment?: RazorpaySuccess,
): Promise<Omit<PlacedOrder, 'testMode'>> {
  const response = await fetch('/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lines: toLines(cart),
      address,
      paymentMethod: method,
      ...payment,
    }),
  });

  if (response.status === 501) throw new CheckoutNotConnectedError();
  if (!response.ok) {
    await readError(
      response,
      method === 'Prepaid'
        ? // Deliberately explicit. The money has already gone, and the worst
          // thing to show now is a vague failure that invites a second payment.
          'Your payment went through but we could not place the order. Do not pay again — contact us with your payment reference.'
        : 'We could not place that order. Please try again.',
    );
  }

  return response.json();
}

export async function placeOrder({
  cart,
  address,
  method,
}: {
  cart: ResolvedCart;
  address: Record<string, string>;
  method: PaymentMethod;
}): Promise<PlacedOrder> {
  if (method === 'COD') {
    const order = await createShiprocketOrder(cart, address, 'COD');
    return { ...order, testMode: false };
  }

  const sessionResponse = await fetch('/api/checkout/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines: toLines(cart) }),
  });

  if (sessionResponse.status === 501) throw new CheckoutNotConnectedError();
  if (!sessionResponse.ok) await readError(sessionResponse, 'Could not start the payment.');

  const session = (await sessionResponse.json()) as SessionResponse;
  await loadCheckoutScript();
  if (!window.Razorpay) throw new Error('Payment provider unavailable');

  return new Promise<PlacedOrder>((resolve, reject) => {
    const checkout = new window.Razorpay!({
      key: session.keyId,
      order_id: session.orderId,
      amount: session.amount,
      currency: session.currency,
      name: 'Chullan',
      description: `${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'}`,
      // Saves the buyer retyping what they just entered on our own form.
      prefill: {
        name: address.name,
        email: address.email,
        contact: address.phone,
      },
      theme: { color: '#111111' },

      handler: (result: RazorpaySuccess) => {
        createShiprocketOrder(cart, address, 'Prepaid', result)
          .then((order) => resolve({ ...order, testMode: session.testMode }))
          .catch(reject);
      },

      modal: {
        // Closing the window is a decision, not a fault. Rejecting with a plain
        // sentence re-enables the form without dressing it up as an error.
        ondismiss: () => reject(new Error('Payment cancelled.')),
      },
    });

    checkout.on('payment.failed', (payload: unknown) => {
      const description = (payload as { error?: { description?: string } })?.error?.description;
      reject(new Error(description ?? 'The payment did not go through. Try another method.'));
    });

    checkout.open();
  });
}
