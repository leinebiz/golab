import { prisma } from '@golab/database';
import { logger } from '../observability/logger';
import {
  type TransitionContext,
  REQUEST_TRANSITIONS,
  SUB_REQUEST_TRANSITIONS,
  findValidTransition,
} from './state-machine';

interface TransitionParams {
  entityType: 'Request' | 'SubRequest';
  entityId: string;
  targetStatus: string;
  triggeredBy: {
    userId: string;
    role: string;
    type: 'user' | 'system' | 'webhook';
  };
  reason?: string;
  metadata?: Record<string, unknown>;
}

export async function executeTransition(params: TransitionParams): Promise<void> {
  const { entityType, entityId, targetStatus, triggeredBy, reason, metadata } = params;

  // Get current status
  let currentStatus: string;
  if (entityType === 'Request') {
    const request = await prisma.request.findUniqueOrThrow({ where: { id: entityId } });
    currentStatus = request.status;
  } else {
    const subRequest = await prisma.subRequest.findUniqueOrThrow({ where: { id: entityId } });
    currentStatus = subRequest.status;
  }

  // Find valid transition
  const transitions = entityType === 'Request' ? REQUEST_TRANSITIONS : SUB_REQUEST_TRANSITIONS;
  const transition = findValidTransition(
    transitions as Parameters<typeof findValidTransition>[0],
    currentStatus,
    targetStatus,
    triggeredBy.role,
  );

  if (!transition) {
    throw new Error(
      `Invalid transition: ${currentStatus} → ${targetStatus} for role ${triggeredBy.role}`,
    );
  }

  const context: TransitionContext = {
    entityId,
    entityType,
    currentStatus,
    targetStatus,
    triggeredBy: triggeredBy as TransitionContext['triggeredBy'],
    metadata,
  };

  // Perform guard check and transition in a single transaction to prevent TOCTOU races
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.$transaction(async (tx: any) => {
    // Re-verify current status inside transaction (optimistic lock)
    let verifiedStatus: string;
    if (entityType === 'Request') {
      const entity = await tx.request.findUniqueOrThrow({ where: { id: entityId } });
      verifiedStatus = entity.status;
    } else {
      const entity = await tx.subRequest.findUniqueOrThrow({ where: { id: entityId } });
      verifiedStatus = entity.status;
    }

    if (verifiedStatus !== currentStatus) {
      throw new Error(
        `Status changed concurrently: expected ${currentStatus}, found ${verifiedStatus}`,
      );
    }

    // Execute guard inside transaction for consistent reads
    if (transition.guard) {
      const allowed = await transition.guard(context);
      if (!allowed) {
        throw new Error(`Guard rejected transition: ${currentStatus} → ${targetStatus}`);
      }
    }

    // Update status
    if (entityType === 'Request') {
      await tx.request.update({
        where: { id: entityId },
        data: { status: targetStatus },
      });
    } else {
      await tx.subRequest.update({
        where: { id: entityId },
        data: { status: targetStatus },
      });
    }

    // Record transition
    await tx.statusTransition.create({
      data: {
        ...(entityType === 'Request' ? { requestId: entityId } : { subRequestId: entityId }),
        fromStatus: currentStatus,
        toStatus: targetStatus,
        triggeredBy: triggeredBy.userId,
        reason,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });
  });

  if (transition.onTransition) {
    const logContext = { entityType, entityId, fromStatus: currentStatus, toStatus: targetStatus };
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('onTransition timed out after 30s')), 30_000);
    });
    Promise.race([transition.onTransition(context), timeoutPromise])
      .catch((err) => {
        logger.error({ ...logContext, error: err }, 'workflow.onTransition.failed');
      })
      .finally(() => clearTimeout(timeoutId));
  }

  logger.info(
    {
      entityType,
      entityId,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      actor: triggeredBy.userId,
    },
    'workflow.transition',
  );
}
