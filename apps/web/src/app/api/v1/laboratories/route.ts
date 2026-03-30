import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreateLaboratorySchema } from '@golab/shared';
import { requireAuth, requireRole } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') ?? undefined;
    const isActiveParam = searchParams.get('isActive');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActiveParam !== null && isActiveParam !== undefined) {
      where.isActive = isActiveParam === 'true';
    }

    const includeTests = searchParams.get('includeTests') === 'true';

    const [labs, total] = await Promise.all([
      prisma.laboratory.findMany({
        where,
        include: {
          organization: { select: { id: true, name: true } },
          _count: { select: { labTests: true } },
          ...(includeTests
            ? { labTests: { where: { isActive: true }, select: { testCatalogueId: true } } }
            : {}),
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.laboratory.count({ where }),
    ]);

    return NextResponse.json({
      data: labs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(['GOLAB_ADMIN']);

    const body = await request.json();
    const parsed = CreateLaboratorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 },
      );
    }

    const existing = await prisma.laboratory.findUnique({
      where: { code: parsed.data.code },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A laboratory with this code already exists' },
        { status: 409 },
      );
    }

    const lab = await prisma.laboratory.create({
      data: parsed.data,
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: lab }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
