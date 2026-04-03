import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — use vi.hoisted so they are available inside vi.mock factories
// ---------------------------------------------------------------------------

const { mockPrisma, mockRequireRole, mockCreatePaymentLink, mockExecuteTransition, mockLogger } =
  vi.hoisted(() => ({
    mockPrisma: {
      invoice: { findUnique: vi.fn(), update: vi.fn() },
    },
    mockRequireRole: vi.fn(),
    mockCreatePaymentLink: vi.fn(),
    mockExecuteTransition: vi.fn(),
    mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  }));

vi.mock('@golab/database', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth/middleware', () => ({ requireRole: mockRequireRole }));
vi.mock('@/lib/integrations/stripe/provider', () => ({
  createPaymentLink: mockCreatePaymentLink,
}));
vi.mock('@/lib/workflow/engine', () => ({
  executeTransition: mockExecuteTransition,
}));
vi.mock('@/lib/observability/logger', () => ({
  createRequestLogger: vi.fn().mockReturnValue(mockLogger),
}));

// ---------------------------------------------------------------------------
// Import route handler
// ---------------------------------------------------------------------------
import { POST } from '../../invoices/[id]/payment-link/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockRequest() {
  return new NextRequest('http://localhost/api/v1/invoices/inv-1/payment-link', {
    method: 'POST',
  });
}

function mockSession() {
  mockRequireRole.mockResolvedValue({
    user: { id: 'user-1', role: 'GOLAB_ADMIN' },
    expires: new Date().toISOString(),
  });
}

function invoiceFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    invoiceNumber: 'INV-001',
    status: 'ISSUED',
    totalAmount: '1500.50',
    paymentLinkUrl: null,
    paymentLinkId: null,
    request: {
      id: 'req-1',
      organization: {
        name: 'Test Corp',
        users: [{ id: 'cust-1', email: 'cust@example.com', name: 'Customer' }],
      },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/v1/invoices/[id]/payment-link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession();
    mockExecuteTransition.mockResolvedValue(undefined);
    mockPrisma.invoice.update.mockResolvedValue({});
  });

  it('creates a Stripe payment session and returns the URL', async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue(invoiceFixture());
    mockCreatePaymentLink.mockResolvedValue({
      sessionId: 'sess-1',
      paymentUrl: 'https://checkout.stripe.com/sess-1',
    });

    const res = await POST(createMockRequest(), { params: Promise.resolve({ id: 'inv-1' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.paymentUrl).toBe('https://checkout.stripe.com/sess-1');

    // Verify amount conversion: 1500.50 * 100 = 150050 cents
    expect(mockCreatePaymentLink).toHaveBeenCalledWith(
      expect.objectContaining({
        totalAmountCents: 150050,
        currency: 'ZAR',
        invoiceId: 'inv-1',
      }),
    );

    expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: expect.objectContaining({
        paymentLinkUrl: 'https://checkout.stripe.com/sess-1',
        paymentLinkId: 'sess-1',
        status: 'PAYMENT_LINK_SENT',
      }),
    });
  });

  it('returns 404 when invoice does not exist', async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue(null);

    const res = await POST(createMockRequest(), { params: Promise.resolve({ id: 'inv-missing' }) });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toMatch(/not found/i);
  });

  it('returns 400 when invoice is not in ISSUED status', async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue(invoiceFixture({ status: 'PAID' }));

    const res = await POST(createMockRequest(), { params: Promise.resolve({ id: 'inv-1' }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/ISSUED/);
  });

  it('returns cached URL for idempotent call (existing payment link)', async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue(
      invoiceFixture({ paymentLinkUrl: 'https://checkout.stripe.com/existing' }),
    );

    const res = await POST(createMockRequest(), { params: Promise.resolve({ id: 'inv-1' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.paymentUrl).toBe('https://checkout.stripe.com/existing');
    expect(json.message).toMatch(/already exists/i);
    expect(mockCreatePaymentLink).not.toHaveBeenCalled();
  });

  it('converts decimal amount to cents with correct precision', async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue(invoiceFixture({ totalAmount: '49999.99' }));
    mockCreatePaymentLink.mockResolvedValue({
      sessionId: 'sess-2',
      paymentUrl: 'https://checkout.stripe.com/sess-2',
    });

    await POST(createMockRequest(), { params: Promise.resolve({ id: 'inv-1' }) });

    expect(mockCreatePaymentLink).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmountCents: 4999999 }),
    );
  });

  it('converts amount with single decimal to cents correctly', async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue(invoiceFixture({ totalAmount: '100.5' }));
    mockCreatePaymentLink.mockResolvedValue({
      sessionId: 'sess-3',
      paymentUrl: 'https://checkout.stripe.com/sess-3',
    });

    await POST(createMockRequest(), { params: Promise.resolve({ id: 'inv-1' }) });

    expect(mockCreatePaymentLink).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmountCents: 10050 }),
    );
  });

  it('returns 500 when Stripe API fails', async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue(invoiceFixture());
    mockCreatePaymentLink.mockRejectedValue(new Error('Stripe connection failed'));

    const res = await POST(createMockRequest(), { params: Promise.resolve({ id: 'inv-1' }) });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toMatch(/failed/i);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockRequireRole.mockRejectedValue(new Error('Unauthorized'));

    const res = await POST(createMockRequest(), { params: Promise.resolve({ id: 'inv-1' }) });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 403 when user has insufficient role', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    const res = await POST(createMockRequest(), { params: Promise.resolve({ id: 'inv-1' }) });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe('Forbidden');
  });

  it('returns 400 when no customer user found for the organization', async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue(
      invoiceFixture({
        request: {
          id: 'req-1',
          organization: { name: 'Empty Org', users: [] },
        },
      }),
    );

    const res = await POST(createMockRequest(), { params: Promise.resolve({ id: 'inv-1' }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/no customer user/i);
  });
});
