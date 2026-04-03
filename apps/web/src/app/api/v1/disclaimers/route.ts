import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = request.nextUrl;
    const activeOnly = searchParams.get('active') !== 'false';

    const disclaimers = await prisma.disclaimer.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: {
        acceptances: {
          select: {
            id: true,
            organizationId: true,
            acceptedById: true,
            acceptedAt: true,
            organization: { select: { name: true } },
          },
        },
        _count: { select: { acceptances: true } },
      },
      orderBy: [{ type: 'asc' }, { version: 'desc' }],
    });

    return NextResponse.json({ disclaimers });
  } catch (err) {
    return handleApiError(err, 'disclaimers.list.failed');
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(['GOLAB_ADMIN']);
    const body = await request.json();
    const { type, title, content } = body;

    if (!type || !title || !content) {
      return NextResponse.json({ error: 'type, title, and content are required' }, { status: 400 });
    }

    // Determine next version for this type
    const latestVersion = await prisma.disclaimer.findFirst({
      where: { type },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latestVersion?.version ?? 0) + 1;

    // Deactivate previous versions of the same type
    await prisma.disclaimer.updateMany({
      where: { type, isActive: true },
      data: { isActive: false },
    });

    const disclaimer = await prisma.disclaimer.create({
      data: {
        type,
        title,
        content,
        version: nextVersion,
        isActive: true,
      },
    });

    return NextResponse.json(disclaimer, { status: 201 });
  } catch (err) {
    return handleApiError(err, 'disclaimers.create.failed');
  }
}
