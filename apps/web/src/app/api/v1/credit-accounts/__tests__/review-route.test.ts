import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — use vi.hoisted so they are available inside vi.mock factories
// ---------------------------------------------------------------------------

const { mockPrisma, mockAuth, mockLogger, mockDispatchNotification } = vi.hoisted(() => ({
  mockPrisma: {
    creditAccount: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
  mockAuth: vi.fn(),
  mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  mockDispatchNotification: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth/config', () => ({ auth: mockAuth }));
vi.mock('@/lib/observability/logger', () => ({
  createRequestLogger: vi.fn().mockReturnValue(mockLogger),
}));
vi.mock('@/lib/observability/metrics', () => ({
  metrics: { reviewDequeued: vi.fn() },
}));
vi.mock('@/lib/notifications/dispatcher', () => ({
  dispatchNotification: mockDispatchNotification,
}));

// ---------------------------------------------------------------------------
// Import route handler
// ---------------------------------------------------------------------------
import { POST } from '../../credit-accounts/[id]/review/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/credit-accounts/ca-1/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockAdminSession() {
  mockAuth.mockResolvedValue({
    user: { id: 'admin-1', role: 'GOLAB_ADMIN' },
    expires: new Date().toISOString(),
  });
}

function creditAccountFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ca-1',
    status: 'PENDING',
    creditLimit: 0,
    availableCredit: 0,
    organizationId: 'org-1',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/v1/credit-accounts/[id]/review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminSession();
    mockDispatchNotification.mockResolvedValue(undefined);
  });

  it('approves credit account with limit in a transaction', async () => {
    mockPrisma.creditAccount.findUnique
      .mockResolvedValueOnce(creditAccountFixture())
      .mockResolvedValueOnce({
        ...creditAccountFixture({ status: 'APPROVED' }),
        organization: { name: 'Test Corp', users: [{ id: 'u1' }] },
      });

    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
        const tx = { creditAccount: { update: vi.fn().mockResolvedValue({}) } };
        return fn(tx as unknown as typeof mockPrisma);
      },
    );

    const res = await POST(createRequest({ action: 'approve', approvedLimit: '50000' }), {
      params: Promise.resolve({ id: 'ca-1' }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('declines credit account with reason', async () => {
    mockPrisma.creditAccount.findUnique
      .mockResolvedValueOnce(creditAccountFixture())
      .mockResolvedValueOnce({
        ...creditAccountFixture({ status: 'DECLINED' }),
        organization: { name: 'Test Corp', users: [{ id: 'u1' }] },
      });

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({ creditAccount: { update: vi.fn().mockResolvedValue({}) } });
    });

    const res = await POST(
      createRequest({ action: 'decline', notes: 'Insufficient documentation' }),
      { params: Promise.resolve({ id: 'ca-1' }) },
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('returns 404 when credit account does not exist', async () => {
    mockPrisma.creditAccount.findUnique.mockResolvedValue(null);

    const res = await POST(createRequest({ action: 'approve', approvedLimit: '10000' }), {
      params: Promise.resolve({ id: 'ca-missing' }),
    });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toMatch(/not found/i);
  });

  it('returns 400 for invalid action', async () => {
    const res = await POST(createRequest({ action: 'cancel' }), {
      params: Promise.resolve({ id: 'ca-1' }),
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 for missing body fields', async () => {
    const res = await POST(createRequest({}), { params: Promise.resolve({ id: 'ca-1' }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/invalid/i);
  });

  it('returns 400 for invalid credit limit format', async () => {
    mockPrisma.creditAccount.findUnique.mockResolvedValue(creditAccountFixture());

    const res = await POST(createRequest({ action: 'approve', approvedLimit: 'abc' }), {
      params: Promise.resolve({ id: 'ca-1' }),
    });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/credit limit/i);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(createRequest({ action: 'approve', approvedLimit: '10000' }), {
      params: Promise.resolve({ id: 'ca-1' }),
    });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 403 when user has non-finance/admin role', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u2', role: 'CUSTOMER_ADMIN' },
      expires: new Date().toISOString(),
    });

    const res = await POST(createRequest({ action: 'approve', approvedLimit: '10000' }), {
      params: Promise.resolve({ id: 'ca-1' }),
    });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe('Forbidden');
  });

  it('allows GOLAB_FINANCE role to approve', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'finance-1', role: 'GOLAB_FINANCE' },
      expires: new Date().toISOString(),
    });

    mockPrisma.creditAccount.findUnique
      .mockResolvedValueOnce(creditAccountFixture())
      .mockResolvedValueOnce({
        ...creditAccountFixture(),
        organization: { name: 'Corp', users: [{ id: 'u1' }] },
      });

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({ creditAccount: { update: vi.fn().mockResolvedValue({}) } });
    });

    const res = await POST(createRequest({ action: 'approve', approvedLimit: '25000' }), {
      params: Promise.resolve({ id: 'ca-1' }),
    });

    expect(res.status).toBe(200);
  });

  it('dispatches notification after successful review', async () => {
    mockPrisma.creditAccount.findUnique
      .mockResolvedValueOnce(creditAccountFixture())
      .mockResolvedValueOnce({
        ...creditAccountFixture({ status: 'APPROVED' }),
        organization: { name: 'Test Corp', users: [{ id: 'u1' }, { id: 'u2' }] },
      });

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({ creditAccount: { update: vi.fn().mockResolvedValue({}) } });
    });

    await POST(createRequest({ action: 'approve', approvedLimit: '10000' }), {
      params: Promise.resolve({ id: 'ca-1' }),
    });

    expect(mockDispatchNotification).toHaveBeenCalledWith(
      'credit.approved',
      expect.objectContaining({
        recipientUserIds: ['u1', 'u2'],
        data: expect.objectContaining({ action: 'approve' }),
      }),
    );
  });

  it('returns 500 when database transaction fails', async () => {
    mockPrisma.creditAccount.findUnique.mockResolvedValue(creditAccountFixture());
    mockPrisma.$transaction.mockRejectedValue(new Error('DB error'));

    const res = await POST(createRequest({ action: 'approve', approvedLimit: '5000' }), {
      params: Promise.resolve({ id: 'ca-1' }),
    });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toMatch(/failed/i);
  });
});
