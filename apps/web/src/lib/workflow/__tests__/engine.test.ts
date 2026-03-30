import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the module under test
vi.mock('@golab/database', () => {
  const mockTx = {
    request: {
      updateMany: vi.fn(),
    },
    subRequest: {
      updateMany: vi.fn(),
    },
    statusTransition: {
      create: vi.fn(),
    },
  };

  return {
    prisma: {
      request: {
        findUniqueOrThrow: vi.fn(),
      },
      subRequest: {
        findUniqueOrThrow: vi.fn(),
      },
      $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<void>) => {
        await fn(mockTx);
      }),
      // Expose mockTx for test assertions
      __mockTx: mockTx,
    },
  };
});

vi.mock('../../observability/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../audit/prisma-audit-middleware', () => ({
  logAuditActivity: vi.fn().mockResolvedValue(undefined),
}));

import { executeTransition } from '../engine';
import { prisma } from '@golab/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockTx = (prisma as any).__mockTx;

describe('workflow engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeTransition', () => {
    it('calls updateMany with optimistic locking for Request', async () => {
      // Setup: request is in DRAFT, transition DRAFT -> QUOTE_CALCULATED (SYSTEM role)
      vi.mocked(prisma.request.findUniqueOrThrow).mockResolvedValue({
        id: 'req-1',
        status: 'DRAFT',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      mockTx.request.updateMany.mockResolvedValue({ count: 1 });
      mockTx.statusTransition.create.mockResolvedValue({});

      await executeTransition({
        entityType: 'Request',
        entityId: 'req-1',
        targetStatus: 'QUOTE_CALCULATED',
        triggeredBy: { userId: 'system', role: 'SYSTEM', type: 'system' },
      });

      // Verify optimistic locking: where clause includes BOTH id AND current status
      expect(mockTx.request.updateMany).toHaveBeenCalledWith({
        where: { id: 'req-1', status: 'DRAFT' },
        data: { status: 'QUOTE_CALCULATED' },
      });
    });

    it('calls updateMany with optimistic locking for SubRequest', async () => {
      vi.mocked(prisma.subRequest.findUniqueOrThrow).mockResolvedValue({
        id: 'sub-1',
        status: 'PICKUP_REQUESTED',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      mockTx.subRequest.updateMany.mockResolvedValue({ count: 1 });
      mockTx.statusTransition.create.mockResolvedValue({});

      await executeTransition({
        entityType: 'SubRequest',
        entityId: 'sub-1',
        targetStatus: 'WAYBILL_AVAILABLE',
        triggeredBy: { userId: 'system', role: 'SYSTEM', type: 'system' },
      });

      expect(mockTx.subRequest.updateMany).toHaveBeenCalledWith({
        where: { id: 'sub-1', status: 'PICKUP_REQUESTED' },
        data: { status: 'WAYBILL_AVAILABLE' },
      });
    });

    it('records a status transition after successful update', async () => {
      vi.mocked(prisma.request.findUniqueOrThrow).mockResolvedValue({
        id: 'req-1',
        status: 'DRAFT',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      mockTx.request.updateMany.mockResolvedValue({ count: 1 });
      mockTx.statusTransition.create.mockResolvedValue({});

      await executeTransition({
        entityType: 'Request',
        entityId: 'req-1',
        targetStatus: 'QUOTE_CALCULATED',
        triggeredBy: { userId: 'system', role: 'SYSTEM', type: 'system' },
        reason: 'auto-calculated',
      });

      expect(mockTx.statusTransition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requestId: 'req-1',
          fromStatus: 'DRAFT',
          toStatus: 'QUOTE_CALCULATED',
          triggeredBy: 'system',
          reason: 'auto-calculated',
        }),
      });
    });

    it('throws on concurrent modification (count=0)', async () => {
      vi.mocked(prisma.request.findUniqueOrThrow).mockResolvedValue({
        id: 'req-1',
        status: 'DRAFT',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      // Simulate another process already changed the status
      mockTx.request.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        executeTransition({
          entityType: 'Request',
          entityId: 'req-1',
          targetStatus: 'QUOTE_CALCULATED',
          triggeredBy: { userId: 'system', role: 'SYSTEM', type: 'system' },
        }),
      ).rejects.toThrow('Concurrent modification detected');
    });

    it('throws for invalid transition', async () => {
      vi.mocked(prisma.request.findUniqueOrThrow).mockResolvedValue({
        id: 'req-1',
        status: 'DRAFT',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // DRAFT -> CLOSED is not a valid transition
      await expect(
        executeTransition({
          entityType: 'Request',
          entityId: 'req-1',
          targetStatus: 'CLOSED',
          triggeredBy: { userId: 'user-1', role: 'CUSTOMER_USER', type: 'user' },
        }),
      ).rejects.toThrow('Invalid transition');
    });

    it('throws for unauthorized role', async () => {
      vi.mocked(prisma.request.findUniqueOrThrow).mockResolvedValue({
        id: 'req-1',
        status: 'DRAFT',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // DRAFT -> QUOTE_CALCULATED requires SYSTEM role, not CUSTOMER_USER
      await expect(
        executeTransition({
          entityType: 'Request',
          entityId: 'req-1',
          targetStatus: 'QUOTE_CALCULATED',
          triggeredBy: { userId: 'user-1', role: 'CUSTOMER_USER', type: 'user' },
        }),
      ).rejects.toThrow('Invalid transition');
    });
  });
});
