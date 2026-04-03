import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id } = await context.params;

    const disclaimer = await prisma.disclaimer.findUnique({
      where: { id },
      include: {
        acceptances: {
          include: {
            organization: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!disclaimer) {
      return NextResponse.json({ error: 'Disclaimer not found' }, { status: 404 });
    }

    return NextResponse.json(disclaimer);
  } catch (err) {
    return handleApiError(err, 'disclaimers.get.failed');
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(['GOLAB_ADMIN']);
    const { id } = await context.params;
    const body = await request.json();
    const { title, content, isActive } = body;

    const existing = await prisma.disclaimer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Disclaimer not found' }, { status: 404 });
    }

    // If activating this disclaimer, deactivate other versions of same type
    if (isActive === true && !existing.isActive) {
      await prisma.disclaimer.updateMany({
        where: { type: existing.type, isActive: true, id: { not: id } },
        data: { isActive: false },
      });
    }

    const updated = await prisma.disclaimer.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err, 'disclaimers.update.failed');
  }
}
