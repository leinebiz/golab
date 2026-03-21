import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@golab/database';
import { requirePermission } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('disclaimers', 'read');
    const { id } = await params;
    const disclaimer = await prisma.disclaimer.findUnique({
      where: { id },
      include: {
        acceptances: {
          select: {
            id: true,
            acceptedAt: true,
            acceptedById: true,
            ipAddress: true,
            organization: { select: { id: true, name: true } },
          },
          orderBy: { acceptedAt: 'desc' },
        },
      },
    });
    if (!disclaimer) return NextResponse.json({ error: 'Disclaimer not found' }, { status: 404 });
    return NextResponse.json({ data: disclaimer });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'disclaimers.get.failed');
    if (message === 'Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('disclaimers', 'update');
    const { id } = await params;
    const body = await request.json();
    const { title, content, isActive } = body as {
      title?: string;
      content?: string;
      isActive?: boolean;
    };
    const existing = await prisma.disclaimer.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Disclaimer not found' }, { status: 404 });
    if (isActive === true && !existing.isActive)
      await prisma.disclaimer.updateMany({
        where: { type: existing.type, isActive: true, id: { not: id } },
        data: { isActive: false },
      });
    const disclaimer = await prisma.disclaimer.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });
    return NextResponse.json({ data: disclaimer });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'disclaimers.update.failed');
    if (message === 'Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission('disclaimers', 'delete');
    const { id } = await params;
    const existing = await prisma.disclaimer.findUnique({
      where: { id },
      include: { _count: { select: { acceptances: true } } },
    });
    if (!existing) return NextResponse.json({ error: 'Disclaimer not found' }, { status: 404 });
    if (existing._count.acceptances > 0) {
      await prisma.disclaimer.update({ where: { id }, data: { isActive: false } });
      return NextResponse.json({ data: { deactivated: true } });
    }
    await prisma.disclaimer.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'disclaimers.delete.failed');
    if (message === 'Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
