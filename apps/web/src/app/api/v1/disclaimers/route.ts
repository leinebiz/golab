import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@golab/database';
import { requirePermission } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('disclaimers', 'read');
    const { searchParams } = request.nextUrl;
    const activeOnly = searchParams.get('active') === 'true';
    const type = searchParams.get('type');
    const where = {
      ...(activeOnly ? { isActive: true } : {}),
      ...(type ? { type: type as never } : {}),
    };
    const disclaimers = await prisma.disclaimer.findMany({
      where,
      include: { _count: { select: { acceptances: true } } },
      orderBy: [{ type: 'asc' }, { version: 'desc' }],
    });
    return NextResponse.json({ data: disclaimers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'disclaimers.list.failed');
    if (message === 'Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission('disclaimers', 'create');
    const body = await request.json();
    const { type, title, content, isActive } = body as {
      type: string;
      title: string;
      content: string;
      isActive?: boolean;
    };
    if (!type || !title || !content)
      return NextResponse.json({ error: 'type, title, and content are required' }, { status: 400 });

    const latest = await prisma.disclaimer.findFirst({
      where: { type: type as never },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;
    if (isActive !== false)
      await prisma.disclaimer.updateMany({
        where: { type: type as never, isActive: true },
        data: { isActive: false },
      });

    const disclaimer = await prisma.disclaimer.create({
      data: {
        type: type as never,
        version: nextVersion,
        title,
        content,
        isActive: isActive !== false,
      },
    });
    return NextResponse.json({ data: disclaimer }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'disclaimers.create.failed');
    if (message === 'Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
