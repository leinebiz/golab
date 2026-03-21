/**
 * Format a numeric value as South African Rand.
 * Accepts string (from Decimal fields) or number.
 */
export function formatZAR(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(num);
}

/**
 * Format an ISO date string for display.
 */
export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
