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

/**
 * The payment succeeded but the order did not get created.
 *
 * Its own type because the recovery is completely different from every other
 * failure here: the money has gone, so the one thing the buyer must not be
 * offered is a Pay button. It carries the payment id, which is the only
 * reference either side has to reconcile with.
 */
export class PaymentTakenError extends Error {
  // A plain field rather than a constructor parameter property: the app builds
  // with `erasableSyntaxOnly`, which forbids syntax that emits runtime code.
  paymentId: string;

  constructor(paymentId: string, message: string) {
    super(message);
    this.name = 'PaymentTakenError';
    this.paymentId = paymentId;
  }
}

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
    /*
     * The address goes with the session, not just with fulfilment.
     *
     * It is stored on the Razorpay order so the `payment.captured` webhook can
     * finish this purchase if this browser never gets the chance to — which is
     * the one situation where the buyer has paid and nothing else knows what
     * they bought or where it goes.
     */
    body: JSON.stringify({ lines: toLines(cart), address }),
  });

  if (sessionResponse.status === 501) throw new CheckoutNotConnectedError();
  if (!sessionResponse.ok) await readError(sessionResponse, 'Could not start the payment.');

  const session = (await sessionResponse.json()) as SessionResponse;
  await loadCheckoutScript();
  if (!window.Razorpay) throw new Error('Payment provider unavailable');

  // Tracks whether Razorpay reported a successful payment, so the dismiss
  // handler can tell "closed without paying" from "closed because it paid".
  let paid = false;

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
        /*
         * Marked before the await, not after.
         *
         * Razorpay closes its modal once a payment succeeds, and closing fires
         * `ondismiss`. Creating the Shiprocket order takes a second or two, so
         * without this flag the dismiss handler rejected the promise first and
         * a completed payment was reported to the buyer as "Payment cancelled"
         * — with a Pay button still in front of them. A promise settles once,
         * and the wrong outcome was winning the race.
         */
        paid = true;
        createShiprocketOrder(cart, address, 'Prepaid', result)
          .then((order) => resolve({ ...order, testMode: session.testMode }))
          .catch((cause) =>
            reject(
              new PaymentTakenError(
                result.razorpay_payment_id,
                cause instanceof Error ? cause.message : 'Order could not be placed.',
              ),
            ),
          );
      },

      modal: {
        // Closing the window before paying is a decision, not a fault. Closing
        // it *after* paying is just Razorpay tidying up, and must not be
        // mistaken for the buyer walking away.
        ondismiss: () => {
          if (!paid) reject(new Error('Payment cancelled.'));
        },
      },
    });

    checkout.on('payment.failed', (payload: unknown) => {
      // A genuine decline. The buyer has not been charged, so retrying is the
      // right thing to offer.
      const description = (payload as { error?: { description?: string } })?.error?.description;
      reject(new Error(description ?? 'The payment did not go through. Try another method.'));
    });

    checkout.open();
  });
}
