import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreateTestCatalogueSchema } from '@golab/shared';
import { requireRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') ?? undefined;
    const category = searchParams.get('category') ?? undefined;
    const isActiveParam = searchParams.get('isActive');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));

    // Build where clause dynamically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (isActiveParam !== null && isActiveParam !== undefined) {
      where.isActive = isActiveParam === 'true';
    }

    const [tests, total] = await Promise.all([
      prisma.testCatalogue.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.testCatalogue.count({ where }),
    ]);

    return NextResponse.json({
      data: tests,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    return handleApiError(err, 'tests.list.failed');
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(['GOLAB_ADMIN']);
    const body = await request.json();
    const parsed = CreateTestCatalogueSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { basePrice, expediteSurcharge, ...rest } = parsed.data;

    const existing = await prisma.testCatalogue.findUnique({
      where: { code: rest.code },
    });
    if (existing) {
      return NextResponse.json({ error: 'A test with this code already exists' }, { status: 409 });
    }

    const test = await prisma.testCatalogue.create({
      data: {
        ...rest,
        basePrice,
        expediteSurcharge: expediteSurcharge ?? null,
      },
    });

    return NextResponse.json({ data: test }, { status: 201 });
  } catch (err) {
    return handleApiError(err, 'tests.create.failed');
  }
}
