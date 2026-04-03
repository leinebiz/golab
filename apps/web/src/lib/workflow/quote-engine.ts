/**
 * Quote Calculation Engine
 *
 * Calculates pricing for test requests with proper decimal arithmetic.
 * All financial calculations use integer cents to avoid floating-point
 * precision errors. Values are converted to/from string representation
 * at boundaries only.
 */
import { toCents, fromCents, addDecimalStrings as add } from '@/lib/finance/decimal';

/**
 * Multiply two decimal strings and return result as decimal string.
 * Uses integer cents to avoid floating-point drift.
 */
function multiply(a: string, b: string): string {
  const ca = toCents(a);
  const cb = toCents(b);
  // (a_cents * b_cents) / 100 gives result in cents
  // Need to round to avoid fractional cents
  const resultCents = Math.round((ca * cb) / 100);
  return fromCents(resultCents);
}

/** South African VAT rate */
export const SA_VAT_RATE = '0.15';

/** Flat logistics fee per lab (ZAR) */
export const LOGISTICS_FEE_PER_LAB = '350.00';

/** A test line item for quoting */
export interface QuoteTestItem {
  testCatalogueId: string;
  testName: string;
  sampleCount: number;
  /** Base price per sample as decimal string, e.g. "250.00" */
  basePrice: string;
  /** Expedite surcharge per sample as decimal string, or null if not applicable */
  expediteSurcharge: string | null;
}

/** Which lab is handling which tests */
export interface QuoteLabGroup {
  labId: string;
  labName: string;
  tests: QuoteTestItem[];
}

export interface QuoteLineItem {
  testCatalogueId: string;
  testName: string;
  labId: string;
  labName: string;
  sampleCount: number;
  unitPrice: string;
  expediteSurcharge: string;
  lineTotal: string;
}

export interface QuoteResult {
  referenceNumber: string;
  lineItems: QuoteLineItem[];
  subtotal: string;
  expediteSurchargeTotal: string;
  logisticsCost: string;
  vatRate: string;
  vatAmount: string;
  totalAmount: string;
}

/**
 * Generate a quote reference number.
 * Format: GL-YYYYMMDD-CUST-SEQ
 */
export function generateReferenceNumber(
  customerCode: string,
  sequenceNumber: number,
  date: Date = new Date(),
): string {
  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const seq = sequenceNumber.toString().padStart(4, '0');
  const code = customerCode.toUpperCase().slice(0, 8);
  return `GL-${yyyy}${mm}${dd}-${code}-${seq}`;
}

/**
 * Calculate a complete quote for a set of lab groups.
 */
export function calculateQuote(
  labGroups: QuoteLabGroup[],
  turnaroundType: 'STANDARD' | 'EXPEDITED',
  customerCode: string,
  sequenceNumber: number,
  date?: Date,
): QuoteResult {
  const lineItems: QuoteLineItem[] = [];
  let subtotal = '0.00';
  let expediteSurchargeTotal = '0.00';

  for (const group of labGroups) {
    for (const test of group.tests) {
      const sampleCountStr = test.sampleCount.toString();
      const baseLineTotal = multiply(test.basePrice, sampleCountStr);

      let expediteLine = '0.00';
      if (turnaroundType === 'EXPEDITED' && test.expediteSurcharge) {
        expediteLine = multiply(test.expediteSurcharge, sampleCountStr);
      }

      const lineTotal = add(baseLineTotal, expediteLine);

      lineItems.push({
        testCatalogueId: test.testCatalogueId,
        testName: test.testName,
        labId: group.labId,
        labName: group.labName,
        sampleCount: test.sampleCount,
        unitPrice: test.basePrice,
        expediteSurcharge: expediteLine,
        lineTotal,
      });

      subtotal = add(subtotal, baseLineTotal);
      expediteSurchargeTotal = add(expediteSurchargeTotal, expediteLine);
    }
  }

  // Logistics: flat fee per lab
  const labCount = labGroups.length.toString();
  const logisticsCost = multiply(LOGISTICS_FEE_PER_LAB, labCount);

  // Pre-VAT total
  const preVat = add(add(subtotal, expediteSurchargeTotal), logisticsCost);

  // VAT
  const vatAmount = multiply(preVat, SA_VAT_RATE);

  // Grand total
  const totalAmount = add(preVat, vatAmount);

  return {
    referenceNumber: generateReferenceNumber(customerCode, sequenceNumber, date),
    lineItems,
    subtotal,
    expediteSurchargeTotal,
    logisticsCost,
    vatRate: SA_VAT_RATE,
    vatAmount,
    totalAmount,
  };
}
