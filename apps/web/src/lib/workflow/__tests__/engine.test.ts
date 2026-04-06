import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — use vi.hoisted so they are available inside vi.mock factories
// ---------------------------------------------------------------------------

const { mockPrisma, mockLogger, mockFindValidTransition } = vi.hoisted(() => ({
  mockPrisma: {
    request: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    subRequest: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    statusTransition: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  mockLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn(),
  },
  mockFindValidTransition: vi.fn(),
}));

vi.mock('@golab/database', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/observability/logger', () => ({ logger: mockLogger }));
vi.mock('../state-machine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../state-machine')>();
  return { ...actual, findValidTransition: mockFindValidTransition };
});

// ---------------------------------------------------------------------------
// Import module under test
// ---------------------------------------------------------------------------
import { executeTransition } from '../engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseParams(overrides: Record<string, unknown> = {}) {
  return {
    entityType: 'Request' as const,
    entityId: 'req-1',
    targetStatus: 'QUOTE_CALCULATED',
    triggeredBy: { userId: 'user-1', role: 'SYSTEM', type: 'system' as const },
    reason: 'Test transition',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('executeTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.request.findUniqueOrThrow.mockResolvedValue({ status: 'DRAFT' });
    mockPrisma.subRequest.findUniqueOrThrow.mockResolvedValue({ status: 'PICKUP_REQUESTED' });

    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
        return fn(mockPrisma);
      },
    );

    mockFindValidTransition.mockReturnValue({
      from: 'DRAFT',
      to: 'QUOTE_CALCULATED',
      roles: ['SYSTEM'],
    });

    mockPrisma.request.update.mockResolvedValue({});
    mockPrisma.statusTransition.create.mockResolvedValue({});
  });

  it('performs a valid Request transition and records audit trail', async () => {
    await executeTransition(baseParams());

    expect(mockPrisma.request.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'req-1' },
    });
    expect(mockPrisma.request.update).toHaveBeenCalledWith({
      where: { id: 'req-1' },
      data: { status: 'QUOTE_CALCULATED' },
    });
    expect(mockPrisma.statusTransition.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requestId: 'req-1',
        fromStatus: 'DRAFT',
        toStatus: 'QUOTE_CALCULATED',
        triggeredBy: 'user-1',
        reason: 'Test transition',
      }),
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Request',
        entityId: 'req-1',
        fromStatus: 'DRAFT',
        toStatus: 'QUOTE_CALCULATED',
      }),
      'workflow.transition',
    );
  });

  it('performs a valid SubRequest transition', async () => {
    mockFindValidTransition.mockReturnValue({
      from: 'PICKUP_REQUESTED',
      to: 'WAYBILL_AVAILABLE',
      roles: ['SYSTEM'],
    });
    mockPrisma.subRequest.update.mockResolvedValue({});

    await executeTransition(
      baseParams({
        entityType: 'SubRequest',
        entityId: 'sub-1',
        targetStatus: 'WAYBILL_AVAILABLE',
      }),
    );

    expect(mockPrisma.subRequest.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
    });
    expect(mockPrisma.subRequest.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { status: 'WAYBILL_AVAILABLE' },
    });
  });

  it('throws when no valid transition exists', async () => {
    mockFindValidTransition.mockReturnValue(null);

    await expect(executeTransition(baseParams({ targetStatus: 'IN_PROGRESS' }))).rejects.toThrow(
      /Invalid transition.*DRAFT.*IN_PROGRESS/,
    );
  });

  it('rejects transition when guard returns false', async () => {
    const guardFn = vi.fn().mockResolvedValue(false);
    mockFindValidTransition.mockReturnValue({
      from: 'DRAFT',
      to: 'QUOTE_CALCULATED',
      roles: ['SYSTEM'],
      guard: guardFn,
    });

    await expect(executeTransition(baseParams())).rejects.toThrow(/Guard rejected transition/);

    expect(guardFn).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: 'req-1',
        entityType: 'Request',
        currentStatus: 'DRAFT',
        targetStatus: 'QUOTE_CALCULATED',
      }),
    );

    // Guard now runs inside the transaction, so $transaction IS called
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    // But the status update should NOT have happened (guard rejected before update)
    expect(mockPrisma.request.update).not.toHaveBeenCalled();
  });

  it('allows transition when guard returns true', async () => {
    const guardFn = vi.fn().mockResolvedValue(true);
    mockFindValidTransition.mockReturnValue({
      from: 'DRAFT',
      to: 'QUOTE_CALCULATED',
      roles: ['SYSTEM'],
      guard: guardFn,
    });

    await executeTransition(baseParams());

    expect(guardFn).toHaveBeenCalled();
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('fires onTransition callback after successful transition', async () => {
    const onTransitionFn = vi.fn().mockResolvedValue(undefined);
    mockFindValidTransition.mockReturnValue({
      from: 'DRAFT',
      to: 'QUOTE_CALCULATED',
      roles: ['SYSTEM'],
      onTransition: onTransitionFn,
    });

    await executeTransition(baseParams());

    // onTransition is called non-blocking (via .catch), wait for microtask
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(onTransitionFn).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: 'req-1',
        currentStatus: 'DRAFT',
        targetStatus: 'QUOTE_CALCULATED',
      }),
    );
  });

  it('logs error but does not throw when onTransition callback fails', async () => {
    const onTransitionFn = vi.fn().mockRejectedValue(new Error('callback boom'));
    mockFindValidTransition.mockReturnValue({
      from: 'DRAFT',
      to: 'QUOTE_CALCULATED',
      roles: ['SYSTEM'],
      onTransition: onTransitionFn,
    });

    // Should NOT throw
    await executeTransition(baseParams());

    // Wait for the .catch handler to fire
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Request',
        entityId: 'req-1',
        fromStatus: 'DRAFT',
        toStatus: 'QUOTE_CALCULATED',
      }),
      'workflow.onTransition.failed',
    );
  });

  it('handles multiple sequential transitions', async () => {
    await executeTransition(baseParams());

    // Second transition
    mockPrisma.request.findUniqueOrThrow.mockResolvedValue({ status: 'QUOTE_CALCULATED' });
    mockFindValidTransition.mockReturnValue({
      from: 'QUOTE_CALCULATED',
      to: 'PENDING_CUSTOMER_REVIEW',
      roles: ['SYSTEM'],
    });

    await executeTransition(baseParams({ targetStatus: 'PENDING_CUSTOMER_REVIEW' }));

    expect(mockPrisma.statusTransition.create).toHaveBeenCalledTimes(2);

    const secondCall = mockPrisma.statusTransition.create.mock.calls[1][0];
    expect(secondCall.data).toEqual(
      expect.objectContaining({
        fromStatus: 'QUOTE_CALCULATED',
        toStatus: 'PENDING_CUSTOMER_REVIEW',
      }),
    );
  });

  it('records audit log with correct params including metadata', async () => {
    await executeTransition(baseParams({ metadata: { source: 'webhook', externalId: 'ext-123' } }));

    expect(mockPrisma.statusTransition.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requestId: 'req-1',
        fromStatus: 'DRAFT',
        toStatus: 'QUOTE_CALCULATED',
        triggeredBy: 'user-1',
        reason: 'Test transition',
        metadata: { source: 'webhook', externalId: 'ext-123' },
      }),
    });
  });
});
