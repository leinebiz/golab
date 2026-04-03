/**
 * Integer-cent arithmetic for financial calculations.
 *
 * Never use parseFloat() or Number() for financial math — floating-point
 * representation silently loses precision on decimal values. These helpers
 * convert decimal strings to integer cents, perform arithmetic in integers,
 * and convert back to strings at the boundary.
 */

/**
 * Parse a decimal string (e.g. "1234.56") to integer cents.
 * Handles up to 2 decimal places, whole numbers, and negative values.
 */
export function toCents(value: string): number {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '0' || trimmed === '0.00') return 0;
  const negative = trimmed.startsWith('-');
  const abs = negative ? trimmed.slice(1) : trimmed;
  const [whole, frac = ''] = abs.split('.');
  const paddedFrac = (frac + '00').slice(0, 2);
  const cents = parseInt(whole, 10) * 100 + parseInt(paddedFrac, 10);
  return negative ? -cents : cents;
}

/**
 * Convert integer cents back to a decimal string with 2 decimal places.
 */
export function fromCents(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${negative ? '-' : ''}${whole}.${frac.toString().padStart(2, '0')}`;
}

/**
 * Add two decimal-string values using integer-cent arithmetic.
 */
export function addDecimalStrings(a: string, b: string): string {
  return fromCents(toCents(a) + toCents(b));
}
