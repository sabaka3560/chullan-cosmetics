import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Reveal } from '../components/Reveal';
import { OrderSeal } from '../components/OrderSeal';
import { useCart } from '../commerce/CartProvider';
import { formatMoney } from '../commerce/money';

/**
 * Where the buyer lands after checkout.
 *
 * With fastrr live this is their screen, not ours — but the mock provider needs
 * somewhere to return to, and having it means the whole purchase can be walked
 * end to end today. It is also the screen that gets used if the checkout
 * provider is ever swapped for one that redirects back rather than hosting its
 * own confirmation.
 *
 * The bag is cleared here rather than at handoff, and that ordering is the
 * whole point: "we sent them to checkout" and "they paid" are different events,
 * and only the second one means the bag is spent. A buyer who bounces off a
 * broken payment page and finds an empty cart is gone for good.
 */
export default function OrderConfirmed() {
  const [params] = useSearchParams();
  const { clear, isHydrated } = useCart();

  const reference = params.get('ref');
  const totalMinor = Number(params.get('total'));
  const items = Number(params.get('items'));
  const isMock = params.get('mock') === '1';
  /*
   * Payment succeeded but the signature could not be confirmed server-side.
   *
   * Deliberately its own state rather than folded into either success or
   * failure: the money may well have left the buyer's account, so calling it a
   * failure is wrong, and calling it a confirmed order is worse. The honest
   * answer is that we are checking — with a reference they can quote.
   */
  const unverified = params.get('unverified') === '1';

  useEffect(() => {
    // Two guards, both load-bearing.
    //
    // `reference` — someone who opens this URL bare has not bought anything,
    // and emptying their bag for them would be a genuinely expensive bug.
    //
    // `isHydrated` — React runs child effects before parent ones, so clearing
    // on mount happened *before* the provider read storage, and the old cart
    // was promptly restored over the top. The bag looked full again seconds
    // after a completed order.
    // Not cleared when unverified: if the order cannot be confirmed, the buyer
    // may need to try again, and an emptied bag makes that a rebuild from
    // scratch.
    if (isHydrated && reference && !unverified) clear();
  }, [isHydrated, reference, unverified, clear]);

  return (
    <Layout>
      <section className="section section--bone prose">
        <div className="shell prose__shell">
          {/*
            Outside the reveal below, deliberately.

            The seal has to be drawing while the copy is still held back — that
            staging is the whole effect. Nesting it inside a delayed `Reveal`
            put it at opacity 0 for the first second, so it drew invisibly and
            appeared already finished, which is precisely the plain version this
            replaces.
          */}
          {reference && <OrderSeal tone={unverified ? 'pending' : 'confirmed'} />}

          <Reveal delay={reference ? 0.95 : 0}>
            {isMock && (
              <p className="test-banner" role="status">
                Test order — no payment was taken and nothing will ship.
              </p>
            )}

            {unverified && (
              <p className="test-banner test-banner--warn" role="alert">
                We’re still confirming this payment. Keep your reference below.
              </p>
            )}

            <p className="eyebrow eyebrow--rule">{unverified ? 'Payment received' : 'Order placed'}</p>
            <h1 className="h2 section-head__title">{unverified ? 'Almost there' : 'Thank you'}</h1>
            <p className="deck section-head__deck">
              {!reference
                ? 'There’s no order to show here — if you’ve just bought something, check your email for the confirmation.'
                : unverified
                  ? 'Your payment went through, but we couldn’t confirm it automatically. Nothing further is needed from you — we’ll email you once it’s checked. Quote the reference below if you get in touch.'
                  : 'We’ve got your order. A confirmation is on its way, and you’ll get a tracking link as soon as it leaves us.'}
            </p>
          </Reveal>

          {reference && (
            <Reveal delay={reference ? 1.05 : 0.08}>
              <section className="prose__section prose__entity">
                <h2 className="h3">Your order</h2>
                <dl>
                  <div>
                    <dt>Reference</dt>
                    <dd className="mono">{reference}</dd>
                  </div>
                  {Number.isFinite(items) && items > 0 && (
                    <div>
                      <dt>Items</dt>
                      <dd>{items}</dd>
                    </div>
                  )}
                  {Number.isFinite(totalMinor) && totalMinor > 0 && (
                    <div>
                      <dt>Total</dt>
                      <dd>{formatMoney(totalMinor)}</dd>
                    </div>
                  )}
                </dl>
              </section>
            </Reveal>
          )}

          <Reveal delay={reference ? 1.15 : 0.12}>
            <nav className="prose__nav" aria-label="Continue">
              <Link to="/shop" className="btn--ghost">Keep shopping</Link>
              <Link to="/shipping" className="btn--ghost">Shipping &amp; delivery</Link>
              <Link to="/returns" className="btn--ghost">Returns</Link>
            </nav>
          </Reveal>
        </div>
      </section>
    </Layout>
  );
}
