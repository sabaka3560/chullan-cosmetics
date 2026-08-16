import type { Currency, Money } from './types';

/**
 * Currency lives here as one constant so switching the storefront is a
 * single-line change rather than a grep across every component.
 *
 * NOTE: this is still USD because that is what the page copy says today.
 * Shiprocket is an India-first platform — going live on it means INR, and INR
 * means real rupee prices, not the dollar figures reinterpreted. That is a
 * pricing decision, not a refactor, so it is deliberately left alone here.
 */
export const CURRENCY: Currency = 'USD';

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
