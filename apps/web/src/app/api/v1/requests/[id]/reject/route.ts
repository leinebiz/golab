import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireAuth } from '@/lib/auth/middleware';
import { executeTransition } from '@/lib/workflow/engine';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const organizationId = user.organizationId as string;
    const userId = user.id as string;
    const role = user.role as string;
    const { id } = await params;

    const body = (await req.json()) as { reason?: string };

    // Verify the request belongs to the customer's organization
    const request = await prisma.request.findFirst({
      where: { id, organizationId },
    });

    if (!request) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (request.status !== 'PENDING_CUSTOMER_REVIEW') {
      return NextResponse.json(
        { error: 'Request is not in a state that can be rejected' },
        { status: 409 },
      );
    }

    await executeTransition({
      entityType: 'Request',
      entityId: id,
      targetStatus: 'CANCELLED',
      triggeredBy: { userId, role, type: 'user' },
      reason: body.reason ?? 'Customer rejected quote',
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Invalid transition')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof Error && error.message.startsWith('Guard rejected')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
