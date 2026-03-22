/**
 * Format a value as South African Rand for display.
 *
 * Accepts string (from Prisma Decimal fields) or number.
 * This is display-only — no arithmetic is performed on the value.
 * Prisma Decimal values should be passed as strings (via .toString())
 * to preserve precision through to the display layer.
 */
export function formatZAR(value: string | number): string {
  const num = Number(value);
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
