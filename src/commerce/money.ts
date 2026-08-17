import type { Currency, Money } from './types';

/**
 * Currency lives here as one constant, and the server imports this same value
 * so a priced cart can never disagree with the page that produced it.
 *
 * INR, because the business is Indian and Shiprocket bills in rupees. Note that
 * flipping this constant is only half the job: `priceMinor` is in minor units,
 * so a figure of 2900 means $29.00 or ₹29.00 depending on this line. The
 * catalog figures were rescaled to rupee magnitudes at the same time.
 */
export const CURRENCY: Currency = 'INR';

const LOCALE: Record<Currency, string> = {
  USD: 'en-US',
  INR: 'en-IN',
};

/**
 * Formatters are expensive to construct and this runs on every line of the
 * cart on every render, so they are built once and cached.
 */
const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: Currency, fractionDigits: number) {
  const key = `${currency}:${fractionDigits}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE[currency], {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/**
 * Whole amounts print without decimals — `$29`, not `$29.00`. The page is set
 * in a display face at large sizes and a trailing `.00` on every price reads as
 * a spreadsheet export. Anything with a real fractional part keeps its cents.
 */
export function formatMoney(minor: Money, currency: Currency = CURRENCY): string {
  const isWhole = minor % 100 === 0;
  return formatterFor(currency, isWhole ? 0 : 2).format(minor / 100);
}
