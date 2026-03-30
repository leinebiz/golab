import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireAuth } from '@/lib/auth/middleware';
import { executeTransition } from '@/lib/workflow/engine';
import { createRequestLogger } from '@/lib/observability/logger';
import { dispatchNotification } from '@/lib/notifications/dispatcher';
import { z } from 'zod';

const CustomerActionSchema = z.object({
  action: z.enum([
    'ACCEPT_AND_CLOSE',
    'REQUEST_CALLBACK',
    'RETEST',
    'SEND_TO_ANOTHER_LAB',
    'ADDITIONAL_TESTING',
    'DISPUTE',
  ]),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const organizationId = user.organizationId as string;
    const userId = user.id as string;
    const { id } = await params;

    const body = await req.json();
    const parsed = CustomerActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { action, notes } = parsed.data;
    const reqLogger = createRequestLogger(crypto.randomUUID(), userId);

    // Verify the request belongs to the customer's organization
    const request = await prisma.request.findFirst({
      where: { id, organizationId },
      select: { id: true, reference: true, status: true, organizationId: true },
    });

    if (!request) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (request.status !== 'PENDING_CUSTOMER_ACTION') {
      return NextResponse.json(
        { error: 'Request is not awaiting customer action' },
        { status: 409 },
      );
    }

    // Map action to the Prisma enum values
    const prismaAction = action === 'DISPUTE' ? 'ADDITIONAL_TESTING' : action;

    // Update the request with customer action
    await prisma.request.update({
      where: { id },
      data: {
        customerAction: prismaAction as Parameters<
          typeof prisma.request.update
        >[0]['data']['customerAction'],
        customerActionDate: new Date(),
        customerActionNotes: notes ?? null,
      },
    });

    // For ACCEPT_AND_CLOSE, transition to CLOSED
    if (action === 'ACCEPT_AND_CLOSE') {
      try {
        await executeTransition({
          entityType: 'Request',
          entityId: id,
          targetStatus: 'CLOSED',
          triggeredBy: { userId, role: user.role, type: 'user' },
          reason: 'Customer accepted and closed',
        });
        await prisma.request.update({
          where: { id },
          data: { closedAt: new Date() },
        });
      } catch (err) {
        reqLogger.warn({ error: err }, 'customer-action.close_transition_skipped');
      }

      // Dispatch request.closed notification
      const orgUsers = await prisma.user.findMany({
        where: { organizationId },
        select: { id: true },
      });
      const golabUsers = await prisma.user.findMany({
        where: { role: { in: ['GOLAB_ADMIN', 'GOLAB_REVIEWER'] } },
        select: { id: true },
      });
      dispatchNotification('request.closed', {
        recipientUserIds: [...orgUsers.map((u) => u.id), ...golabUsers.map((u) => u.id)],
        requestId: id,
        data: { requestRef: request.reference },
      }).catch(() => {});
    }

    // For other actions, notify GoLab admin about the customer's choice
    if (action !== 'ACCEPT_AND_CLOSE') {
      const golabUsers = await prisma.user.findMany({
        where: { role: { in: ['GOLAB_ADMIN', 'GOLAB_REVIEWER'] } },
        select: { id: true },
      });
      dispatchNotification('customer.action_required', {
        recipientUserIds: golabUsers.map((u) => u.id),
        requestId: id,
        data: {
          requestRef: request.reference,
          customerAction: action,
          notes: notes ?? '',
        },
      }).catch(() => {});
    }

    reqLogger.info({ requestId: id, action }, 'customer-action.submitted');

    return NextResponse.json({ success: true, action });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
