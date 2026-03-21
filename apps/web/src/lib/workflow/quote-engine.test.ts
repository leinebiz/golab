import { describe, it, expect } from 'vitest';
import {
  calculateQuote,
  generateReferenceNumber,
  SA_VAT_RATE,
  LOGISTICS_FEE_PER_LAB,
  type QuoteLabGroup,
} from './quote-engine';

describe('generateReferenceNumber', () => {
  it('generates correct format GL-YYYYMMDD-CODE-SEQ', () => {
    const date = new Date(2026, 2, 15); // March 15, 2026
    const ref = generateReferenceNumber('ACME', 42, date);
    expect(ref).toBe('GL-20260315-ACME-0042');
  });

  it('pads sequence number to 4 digits', () => {
    const date = new Date(2026, 0, 1);
    const ref = generateReferenceNumber('TEST', 1, date);
    expect(ref).toBe('GL-20260101-TEST-0001');
  });

  it('truncates long customer codes to 8 chars', () => {
    const date = new Date(2026, 0, 1);
    const ref = generateReferenceNumber('VERYLONGCOMPANYNAME', 1, date);
    expect(ref).toBe('GL-20260101-VERYLONG-0001');
  });

  it('uppercases the customer code', () => {
    const date = new Date(2026, 0, 1);
    const ref = generateReferenceNumber('acme', 1, date);
    expect(ref).toBe('GL-20260101-ACME-0001');
  });
});

describe('calculateQuote', () => {
  const fixedDate = new Date(2026, 2, 21);

  const singleLabGroup: QuoteLabGroup[] = [
    {
      labId: 'lab-1',
      labName: 'Test Lab',
      tests: [
        {
          testCatalogueId: 'test-1',
          testName: 'Water pH',
          sampleCount: 10,
          basePrice: '150.00',
          expediteSurcharge: '75.00',
        },
      ],
    },
  ];

  it('calculates correct subtotal for standard turnaround', () => {
    const quote = calculateQuote(singleLabGroup, 'STANDARD', 'DEMO', 1, fixedDate);
    expect(quote.subtotal).toBe('1500.00');
    expect(quote.expediteSurchargeTotal).toBe('0.00');
  });

  it('applies expedite surcharge for expedited turnaround', () => {
    const quote = calculateQuote(singleLabGroup, 'EXPEDITED', 'DEMO', 1, fixedDate);
    expect(quote.subtotal).toBe('1500.00');
    expect(quote.expediteSurchargeTotal).toBe('750.00');
  });

  it('charges logistics fee per lab', () => {
    const quote = calculateQuote(singleLabGroup, 'STANDARD', 'DEMO', 1, fixedDate);
    expect(quote.logisticsCost).toBe(LOGISTICS_FEE_PER_LAB);
  });

  it('charges multiple logistics fees for multiple labs', () => {
    const multiLabGroups: QuoteLabGroup[] = [
      {
        labId: 'lab-1',
        labName: 'Lab A',
        tests: [
          {
            testCatalogueId: 't1',
            testName: 'Test A',
            sampleCount: 1,
            basePrice: '100.00',
            expediteSurcharge: null,
          },
        ],
      },
      {
        labId: 'lab-2',
        labName: 'Lab B',
        tests: [
          {
            testCatalogueId: 't2',
            testName: 'Test B',
            sampleCount: 1,
            basePrice: '200.00',
            expediteSurcharge: null,
          },
        ],
      },
    ];

    const quote = calculateQuote(multiLabGroups, 'STANDARD', 'DEMO', 1, fixedDate);
    expect(quote.logisticsCost).toBe('700.00');
  });

  it('calculates VAT at 15%', () => {
    const quote = calculateQuote(singleLabGroup, 'STANDARD', 'DEMO', 1, fixedDate);
    expect(quote.vatRate).toBe(SA_VAT_RATE);
    // Subtotal: 1500.00 + logistics: 350.00 = 1850.00
    // VAT: 1850.00 * 0.15 = 277.50
    expect(quote.vatAmount).toBe('277.50');
  });

  it('calculates correct total', () => {
    const quote = calculateQuote(singleLabGroup, 'STANDARD', 'DEMO', 1, fixedDate);
    // Pre-VAT: 1850.00, VAT: 277.50, Total: 2127.50
    expect(quote.totalAmount).toBe('2127.50');
  });

  it('generates correct reference number', () => {
    const quote = calculateQuote(singleLabGroup, 'STANDARD', 'DEMO', 1, fixedDate);
    expect(quote.referenceNumber).toBe('GL-20260321-DEMO-0001');
  });

  it('produces correct line items', () => {
    const quote = calculateQuote(singleLabGroup, 'EXPEDITED', 'DEMO', 1, fixedDate);

    expect(quote.lineItems).toHaveLength(1);
    expect(quote.lineItems[0]).toEqual({
      testCatalogueId: 'test-1',
      testName: 'Water pH',
      labId: 'lab-1',
      labName: 'Test Lab',
      sampleCount: 10,
      unitPrice: '150.00',
      expediteSurcharge: '750.00',
      lineTotal: '2250.00',
    });
  });

  it('handles tests with no expedite surcharge gracefully', () => {
    const noSurchargeGroups: QuoteLabGroup[] = [
      {
        labId: 'lab-1',
        labName: 'Lab',
        tests: [
          {
            testCatalogueId: 't1',
            testName: 'Test',
            sampleCount: 5,
            basePrice: '200.00',
            expediteSurcharge: null,
          },
        ],
      },
    ];

    const quote = calculateQuote(noSurchargeGroups, 'EXPEDITED', 'DEMO', 1, fixedDate);
    expect(quote.expediteSurchargeTotal).toBe('0.00');
    expect(quote.subtotal).toBe('1000.00');
  });

  it('uses decimal arithmetic without floating-point drift', () => {
    const precisionGroups: QuoteLabGroup[] = [
      {
        labId: 'lab-1',
        labName: 'Lab',
        tests: [
          {
            testCatalogueId: 't1',
            testName: 'A',
            sampleCount: 3,
            basePrice: '33.33',
            expediteSurcharge: null,
          },
        ],
      },
    ];

    const quote = calculateQuote(precisionGroups, 'STANDARD', 'DEMO', 1, fixedDate);
    expect(quote.subtotal).toBe('99.99');
    expect(quote.subtotal).not.toContain('e');
    expect(quote.totalAmount).not.toContain('e');
  });
});
