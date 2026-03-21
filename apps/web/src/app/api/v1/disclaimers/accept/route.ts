import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@golab/database';
import { requireAuth } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const organizationId = user.organizationId as string;
    const { searchParams } = request.nextUrl;
    const checkOnly = searchParams.get('check') === 'true';

    const activeDisclaimers = await prisma.disclaimer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        type: true,
        version: true,
        title: true,
        content: checkOnly ? false : true,
      },
    });
    const acceptances = await prisma.disclaimerAcceptance.findMany({
      where: { organizationId },
      select: { disclaimerId: true, acceptedAt: true },
    });
    const acceptedIds = new Set(acceptances.map((a) => a.disclaimerId));
    const pending = activeDisclaimers.filter((d) => !acceptedIds.has(d.id));

    if (checkOnly)
      return NextResponse.json({
        allAccepted: pending.length === 0,
        pendingCount: pending.length,
        pendingTypes: pending.map((d) => d.type),
      });

    return NextResponse.json({
      allAccepted: pending.length === 0,
      pending,
      accepted: activeDisclaimers
        .filter((d) => acceptedIds.has(d.id))
        .map((d) => ({
          ...d,
          acceptedAt: acceptances.find((a) => a.disclaimerId === d.id)?.acceptedAt,
        })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'disclaimers.accept.check.failed');
    if (message === 'Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const userId = user.id as string;
    const organizationId = user.organizationId as string;
    const body = await request.json();
    const { disclaimerIds } = body as { disclaimerIds: string[] };
    if (!disclaimerIds || !Array.isArray(disclaimerIds) || disclaimerIds.length === 0)
      return NextResponse.json({ error: 'disclaimerIds array is required' }, { status: 400 });

    const disclaimers = await prisma.disclaimer.findMany({
      where: { id: { in: disclaimerIds }, isActive: true },
      select: { id: true },
    });
    if (disclaimers.length !== disclaimerIds.length)
      return NextResponse.json(
        { error: 'One or more disclaimers not found or inactive' },
        { status: 400 },
      );

    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? null;

    const results = await Promise.all(
      disclaimerIds.map(async (disclaimerId) => {
        return prisma.disclaimerAcceptance.upsert({
          where: { disclaimerId_organizationId: { disclaimerId, organizationId } },
          create: { disclaimerId, organizationId, acceptedById: userId, ipAddress },
          update: { acceptedById: userId, acceptedAt: new Date(), ipAddress },
        });
      }),
    );

    await Promise.all(
      results.map((acceptance) =>
        prisma.auditLog.create({
          data: {
            actorId: userId,
            action: 'disclaimer.accepted',
            entityType: 'DisclaimerAcceptance',
            entityId: acceptance.id,
            changes: {
              disclaimerId: acceptance.disclaimerId,
              organizationId,
              acceptedAt: acceptance.acceptedAt.toISOString(),
            },
          },
        }),
      ),
    );

    return NextResponse.json({
      data: { accepted: results.length, acceptedIds: results.map((r) => r.disclaimerId) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'disclaimers.accept.failed');
    if (message === 'Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
