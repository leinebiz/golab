import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { logger } from '@/lib/observability/logger';

const ADMIN_ROLES = ['GOLAB_ADMIN'];

/**
 * GET /api/v1/notification-templates
 * List all notification templates. If none exist in DB, seeds from defaults.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = (session.user as Record<string, unknown>).role as string;
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const eventType = searchParams.get('eventType');

  const where: Record<string, unknown> = {};
  if (eventType) where.eventType = eventType;

  const templates = await prisma.notificationTemplate.findMany({
    where,
    orderBy: [{ eventType: 'asc' }, { channel: 'asc' }],
  });

  return NextResponse.json({ data: templates });
}

/**
 * POST /api/v1/notification-templates
 * Create or upsert a notification template.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };
  if (!ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { eventType, channel, subject, body: templateBody, isActive } = body;

    if (!eventType || !channel || !subject || !templateBody) {
      return NextResponse.json(
        { error: 'eventType, channel, subject, and body are required' },
        { status: 400 },
      );
    }

    const template = await prisma.notificationTemplate.upsert({
      where: { eventType_channel: { eventType, channel } },
      update: {
        subject,
        body: templateBody,
        isActive: isActive ?? true,
        updatedById: user.id,
      },
      create: {
        eventType,
        channel,
        subject,
        body: templateBody,
        isActive: isActive ?? true,
        updatedById: user.id,
      },
    });

    logger.info({ templateId: template.id, eventType, channel }, 'notification_template.upserted');

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (err) {
    logger.error({ error: err }, 'notification_template.create.failed');
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
  }
}
