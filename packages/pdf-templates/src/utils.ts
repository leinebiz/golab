/**
 * Format a numeric amount as a currency string.
 * Default currency: South African Rand (ZAR).
 */
export function formatCurrency(amount: number, currency = 'ZAR'): string {
  return `${currency} ${amount.toFixed(2)}`;
}
