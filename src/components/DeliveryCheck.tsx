import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  ShippingNotConnectedError,
  checkDelivery,
  normalisePincode,
  validatePincode,
} from '../commerce/shipping';
import type { DeliveryEstimate } from '../commerce/shipping';

/**
 * "Does it reach me, and when" — asked in the bag, before the buyer commits to
 * a checkout they can't see into.
 *
 * This sits above the checkout button rather than below it because it is a
 * reason to press the button, not a footnote to it. In India it also answers
 * the COD question, which for a large share of buyers is the actual decision
 * being made.
 */

const DATE_FORMAT = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
});

type State =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'done'; estimate: DeliveryEstimate }
  | { status: 'error'; message: string };

export function DeliveryCheck({ weightGrams }: { weightGrams: number }) {
  const [pincode, setPincode] = useState('');
  const [state, setState] = useState<State>({ status: 'idle' });

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const problem = validatePincode(pincode);
    if (problem) {
      setState({
        status: 'error',
        message:
          problem === 'empty'
            ? 'Enter a PIN code.'
            : 'That doesn’t look like a PIN code — six digits, no leading zero.',
      });
      return;
    }

    setState({ status: 'checking' });
    try {
      const estimate = await checkDelivery(pincode, weightGrams);
      setState({ status: 'done', estimate });
    } catch (cause) {
      setState({
        status: 'error',
        message:
          cause instanceof ShippingNotConnectedError
            ? 'Delivery estimates aren’t connected yet.'
            : 'Couldn’t check that right now.',
      });
    }
  };

  return (
    <form className="delivery" onSubmit={onSubmit} noValidate>
      <label className="eyebrow" htmlFor="delivery-pincode">
        Delivery PIN code
      </label>

      <div className="delivery__row">
        <input
          id="delivery-pincode"
          /* `text` with a numeric inputMode, never `type="number"`: a number
             input strips leading characters, offers a spinner nobody wants on a
             PIN code, and silently drops the value on some Android keyboards. */
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="400001"
          value={pincode}
          onChange={(event) => {
            setPincode(normalisePincode(event.target.value));
            // Clear the previous answer the moment the question changes, so a
            // stale "delivers Tuesday" can never sit under a different pincode.
            setState({ status: 'idle' });
          }}
        />
        <button
          type="submit"
          className="delivery__submit"
          disabled={state.status === 'checking'}
        >
          {state.status === 'checking' ? 'Checking…' : 'Check'}
        </button>
      </div>

      {state.status === 'error' && (
        <p className="delivery__msg delivery__msg--error" role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'done' && (
        <p className="delivery__msg" role="status">
          {!state.estimate.serviceable ? (
            <>We don’t deliver to that PIN code yet.</>
          ) : (
            <>
              {state.estimate.etaDate
                ? `Arrives by ${DATE_FORMAT.format(new Date(state.estimate.etaDate))}`
                : 'Delivers to this PIN code'}
              {state.estimate.codAvailable === false && ' · Prepaid only'}
              {state.estimate.codAvailable === true && ' · Cash on delivery available'}
            </>
          )}
        </p>
      )}
    </form>
  );
}
