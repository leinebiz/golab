import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { logger } from '@/lib/observability/logger';

const ADMIN_ROLES = ['GOLAB_ADMIN'];

/**
 * PUT /api/v1/notification-templates/:id
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };
  if (!ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { subject, body: templateBody, isActive } = body;

    const template = await prisma.notificationTemplate.update({
      where: { id },
      data: {
        ...(subject !== undefined && { subject }),
        ...(templateBody !== undefined && { body: templateBody }),
        ...(isActive !== undefined && { isActive }),
        updatedById: user.id,
      },
    });

    logger.info({ templateId: id }, 'notification_template.updated');
    return NextResponse.json({ data: template });
  } catch (err) {
    logger.error({ error: err, templateId: id }, 'notification_template.update.failed');
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}
