import { CheckoutNotConnectedError } from './types';
import type { CheckoutHandoff, CheckoutProvider } from './types';

export { CheckoutNotConnectedError } from './types';
export type { CheckoutHandoff, CheckoutProvider } from './types';

/**
 * Razorpay Magic Checkout.
 *
 * The browser sends SKUs and quantities, the server prices them and creates a
 * Razorpay order, and Checkout opens against that order id. The buyer's address
 * and payment are collected by Razorpay — the storefront never sees a card and
 * never handles an amount it could get wrong.
 *
 * On success Razorpay hands back a signature, which is verified server-side
 * before anything is treated as paid. A browser saying "I paid" is a claim;
 * only the signature is proof.
 */

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

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
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/**
 * Loaded on demand rather than in `index.html`.
 *
 * Most visitors never reach checkout, and a third-party script in the document
 * head blocks first paint for all of them. Fetching it when the button is
 * pressed costs a few hundred milliseconds at the one moment the buyer is
 * already expecting something to happen.
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
      // Cleared so a later attempt can retry rather than being stuck with a
      // permanently rejected promise — the usual cause is a blocked network,
      // which the next tap may not hit.
      scriptPromise = null;
      reject(new Error('Could not load the payment provider'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

const razorpayProvider: CheckoutProvider = {
  id: 'razorpay',

  async begin({ cart }: CheckoutHandoff) {
    const response = await fetch('/api/checkout/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Reference-only. The server owns every amount.
        lines: cart.lines.map((line) => ({ sku: line.variant.sku, qty: line.qty })),
      }),
    });

    if (response.status === 501) throw new CheckoutNotConnectedError();
    if (!response.ok) throw new Error(`Checkout session failed: ${response.status}`);

    const session = (await response.json()) as SessionResponse;
    await loadCheckoutScript();
    if (!window.Razorpay) throw new Error('Payment provider unavailable');

    const checkout = new window.Razorpay({
      key: session.keyId,
      order_id: session.orderId,
      amount: session.amount,
      currency: session.currency,
      name: 'Chullan',
      description: `${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'}`,
      // The flag that turns Standard Checkout into Magic Checkout: Razorpay
      // collects the address and offers COD instead of taking payment alone.
      one_click_checkout: true,
      // Where the shipping-info endpoint's answers are surfaced.
      show_coupons: false,
      theme: { color: '#111111' },

      handler: async (result: RazorpaySuccess) => {
        // Verified before the buyer is told anything. The confirmation screen
        // is only reached once the server has checked the signature.
        const verify = await fetch('/api/checkout/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result),
        });

        const params = new URLSearchParams({
          ref: result.razorpay_payment_id,
          total: String(cart.subtotalMinor),
          items: String(cart.itemCount),
        });
        if (session.testMode) params.set('mock', '1');

        if (!verify.ok) {
          // Payment may well have succeeded — only the proof failed. Say so
          // rather than claiming an order, and never clear the bag.
          params.set('unverified', '1');
        }

        window.location.assign(`/order-confirmed?${params}`);
      },

      modal: {
        // Dismissing is not an error. Leaving the drawer as it was lets the
        // buyer simply try again.
        ondismiss: () => undefined,
      },
    });

    checkout.open();
  },
};

export const checkoutProvider = razorpayProvider;

export function beginCheckout(cart: CheckoutHandoff['cart']): Promise<void> {
  return checkoutProvider.begin({ cart, returnUrl: window.location.href });
}
