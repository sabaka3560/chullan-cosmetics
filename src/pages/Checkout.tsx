import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Reveal } from '../components/Reveal';
import { useCart } from '../commerce/CartProvider';
import { formatMoney } from '../commerce/money';
import { FREE_SHIPPING_THRESHOLD_MINOR } from '../commerce/policy';
import { normalisePincode, validatePincode } from '../commerce/shipping';
import { placeOrder } from '../commerce/checkout';
import type { PaymentMethod } from '../commerce/checkout';

/**
 * The checkout.
 *
 * A page rather than more drawer, because there is genuinely too much here for
 * a panel on a phone: seven address fields, a delivery estimate that changes
 * with the PIN code, and a payment choice that changes the total.
 *
 * The delivery estimate is what earns this page its keep. It runs as soon as a
 * valid PIN code is entered, so the buyer learns whether the parcel can reach
 * them — and whether cash on delivery is even offered there — before committing
 * to anything. Discovering that after payment is how refunds happen.
 */

const FIELDS = [
  { name: 'name', label: 'Full name', autoComplete: 'name', type: 'text' },
  { name: 'phone', label: 'Mobile number', autoComplete: 'tel', type: 'tel' },
  { name: 'email', label: 'Email', autoComplete: 'email', type: 'email' },
  { name: 'line1', label: 'Address', autoComplete: 'address-line1', type: 'text' },
  {
    name: 'line2',
    label: 'Apartment, landmark (optional)',
    autoComplete: 'address-line2',
    type: 'text',
  },
  { name: 'city', label: 'City', autoComplete: 'address-level2', type: 'text' },
  { name: 'state', label: 'State', autoComplete: 'address-level1', type: 'text' },
] as const;

const SHIPPING_FEE_MINOR = 9900;
const COD_FEE_MINOR = 4900;

type Delivery =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'done'; serviceable: boolean; etaDate?: string; codAvailable?: boolean }
  | { status: 'error' };

const DATE = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
});

export default function Checkout() {
  const { cart, isHydrated } = useCart();
  const navigate = useNavigate();

  const [values, setValues] = useState<Record<string, string>>({});
  const [pincode, setPincode] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('Prepaid');
  const [delivery, setDelivery] = useState<Delivery>({ status: 'idle' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // An empty bag has nothing to check out. Waits for hydration first, or a
  // reload on this page bounces before the cart has been read back from storage.
  useEffect(() => {
    if (isHydrated && cart.lines.length === 0) navigate('/shop', { replace: true });
  }, [isHydrated, cart.lines.length, navigate]);

  // Fires on a complete PIN code rather than behind a button: by the time
  // someone has typed six digits they have already asked the question.
  useEffect(() => {
    if (validatePincode(pincode)) {
      setDelivery({ status: 'idle' });
      return;
    }

    let cancelled = false;
    setDelivery({ status: 'checking' });

    fetch('/api/serviceability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pincode,
        lines: cart.lines.map((line) => ({ sku: line.variant.sku, qty: line.qty })),
      }),
    })
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error(String(response.status))),
      )
      .then((data) => {
        if (cancelled) return;
        setDelivery({ status: 'done', ...data });
        // Leaving COD selected where it is not offered would fail only at the
        // final step, after the whole address had been filled in.
        if (data.codAvailable === false) setMethod('Prepaid');
      })
      .catch(() => {
        if (!cancelled) setDelivery({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [pincode, cart.lines]);

  const shippingFee =
    cart.subtotalMinor >= FREE_SHIPPING_THRESHOLD_MINOR ? 0 : SHIPPING_FEE_MINOR;
  const codFee = method === 'COD' ? COD_FEE_MINOR : 0;
  const total = cart.subtotalMinor + shippingFee + codFee;

  const codOffered = delivery.status === 'done' && delivery.codAvailable === true;
  const unserviceable = delivery.status === 'done' && !delivery.serviceable;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await placeOrder({
        cart,
        address: { ...values, pincode },
        method,
      });
      const params = new URLSearchParams({
        ref: result.reference,
        total: String(result.totalMinor),
        items: String(result.itemCount),
      });
      if (result.testMode) params.set('mock', '1');
      navigate(`/order-confirmed?${params}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Try again.');
      setPending(false);
    }
  };

  return (
    <Layout>
      <section className="section section--bone checkout">
        <div className="shell checkout__grid">
          <div>
            <Reveal>
              <p className="eyebrow eyebrow--rule">Checkout</p>
              <h1 className="h2 section-head__title">Where is it going?</h1>
            </Reveal>

            <Reveal delay={0.06}>
              <form className="checkout__form" onSubmit={onSubmit} noValidate>
                {FIELDS.map((field) => (
                  <label className="field-block" key={field.name}>
                    <span className="eyebrow">{field.label}</span>
                    <input
                      type={field.type}
                      autoComplete={field.autoComplete}
                      required={field.name !== 'line2'}
                      value={values[field.name] ?? ''}
                      onChange={(event) =>
                        setValues((prev) => ({ ...prev, [field.name]: event.target.value }))
                      }
                    />
                  </label>
                ))}

                <label className="field-block">
                  <span className="eyebrow">PIN code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    required
                    value={pincode}
                    onChange={(event) => setPincode(normalisePincode(event.target.value))}
                  />
                  <span className="field-note" role="status">
                    {delivery.status === 'checking' && 'Checking delivery…'}
                    {delivery.status === 'error' && 'Could not check delivery just now.'}
                    {delivery.status === 'done' &&
                      (delivery.serviceable
                        ? delivery.etaDate
                          ? `Arrives by ${DATE.format(new Date(delivery.etaDate))}`
                          : 'Delivers to this PIN code'
                        : 'We do not deliver to this PIN code yet.')}
                  </span>
                </label>

                <fieldset className="pay">
                  <legend className="eyebrow">Payment</legend>

                  <label className="pay__option" data-selected={method === 'Prepaid'}>
                    <input
                      type="radio"
                      name="payment"
                      checked={method === 'Prepaid'}
                      onChange={() => setMethod('Prepaid')}
                    />
                    <span>
                      <strong>Pay now</strong>
                      <em>UPI, cards, netbanking or wallet</em>
                    </span>
                  </label>

                  <label
                    className="pay__option"
                    data-selected={method === 'COD'}
                    data-disabled={!codOffered}
                  >
                    <input
                      type="radio"
                      name="payment"
                      disabled={!codOffered}
                      checked={method === 'COD'}
                      onChange={() => setMethod('COD')}
                    />
                    <span>
                      <strong>Cash on delivery</strong>
                      <em>
                        {codOffered
                          ? `${formatMoney(COD_FEE_MINOR)} handling fee`
                          : 'Enter a PIN code to see if this is available'}
                      </em>
                    </span>
                  </label>
                </fieldset>

                {error && (
                  <p className="drawer__error" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn btn--primary checkout__submit"
                  disabled={pending || unserviceable}
                >
                  {pending
                    ? 'One moment…'
                    : unserviceable
                      ? 'Not deliverable'
                      : method === 'COD'
                        ? `Place order · ${formatMoney(total)}`
                        : `Pay ${formatMoney(total)}`}
                </button>
              </form>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <aside className="summary">
              <h2 className="eyebrow">Your order</h2>

              <ul className="summary__lines">
                {cart.lines.map(({ product, variant, qty, lineTotalMinor }) => (
                  <li key={variant.sku}>
                    <img src={product.thumb} alt="" width={48} height={60} loading="lazy" />
                    <span>
                      <strong>{product.name}</strong>
                      {product.variants.length > 1 && <em>{variant.label}</em>}
                      <em>Qty {qty}</em>
                    </span>
                    <span className="summary__price">{formatMoney(lineTotalMinor)}</span>
                  </li>
                ))}
              </ul>

              <dl className="summary__totals">
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(cart.subtotalMinor)}</dd>
                </div>
                <div>
                  <dt>Shipping</dt>
                  <dd>{shippingFee === 0 ? 'Free' : formatMoney(shippingFee)}</dd>
                </div>
                {codFee > 0 && (
                  <div>
                    <dt>COD handling</dt>
                    <dd>{formatMoney(codFee)}</dd>
                  </div>
                )}
                <div className="summary__grand">
                  <dt>Total</dt>
                  <dd>{formatMoney(total)}</dd>
                </div>
              </dl>

              <Link to="/shop" className="btn--ghost summary__back">
                Keep shopping
              </Link>
            </aside>
          </Reveal>
        </div>
      </section>
    </Layout>
  );
}
