import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { notificationMatrix } from '@/lib/notifications/matrix';
import { logger } from '@/lib/observability/logger';

const ADMIN_ROLES = ['GOLAB_ADMIN'];

/**
 * POST /api/v1/notification-templates/seed
 * Seeds default templates from the notification matrix for any event/channel combos
 * that don't yet have a DB row. Does NOT overwrite existing customized templates.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = (session.user as Record<string, unknown>).role as string;
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let created = 0;
  const sampleData = {
    requestRef: 'REQ-EXAMPLE',
    amount: 'R 1,250.00',
    labName: 'Example Lab',
    reason: 'Sample reason',
  };

  for (const [eventType, entry] of Object.entries(notificationMatrix)) {
    for (const channel of entry.channels) {
      const exists = await prisma.notificationTemplate.findUnique({
        where: { eventType_channel: { eventType, channel } },
      });
      if (!exists) {
        await prisma.notificationTemplate.create({
          data: {
            eventType,
            channel,
            subject: entry.title(sampleData),
            body: entry.body(sampleData),
            isActive: true,
          },
        });
        created++;
      }
    }
  }

  logger.info({ created }, 'notification_templates.seeded');
  return NextResponse.json({ data: { created } });
}
