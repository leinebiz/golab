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

  // Execute guard if present
  const context: TransitionContext = {
    entityId,
    entityType,
    currentStatus,
    targetStatus,
    triggeredBy: triggeredBy as TransitionContext['triggeredBy'],
    metadata,
  };

  if (transition.guard) {
    const allowed = await transition.guard(context);
    if (!allowed) {
      throw new Error(`Guard rejected transition: ${currentStatus} → ${targetStatus}`);
    }
  }

  // Perform the transition in a transaction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.$transaction(async (tx: any) => {
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

  // Execute onTransition callback (non-blocking)
  if (transition.onTransition) {
    transition.onTransition(context).catch((err) => {
      logger.error(
        { entityType, entityId, fromStatus: currentStatus, toStatus: targetStatus, error: err },
        'workflow.onTransition.failed',
      );
    });
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
