import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@golab/database';
import { requireAuth } from '@/lib/auth/middleware';
import type { Prisma } from '@golab/database';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const organizationId = user.organizationId as string;

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Prisma.RequestWhereInput = {
      organizationId,
    };

    if (status && status !== 'ALL') {
      where.status = status as Prisma.RequestWhereInput['status'];
    }

    if (search) {
      where.reference = { contains: search, mode: 'insensitive' };
    }

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        include: {
          subRequests: {
            select: {
              id: true,
              status: true,
              laboratory: { select: { name: true } },
              tests: {
                select: {
                  id: true,
                  testCatalogue: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.request.count({ where }),
    ]);

    const data = requests.map((r) => ({
      id: r.id,
      reference: r.reference,
      status: r.status,
      testsCount: r.subRequests.reduce((acc, sr) => acc + sr.tests.length, 0),
      labs: [...new Set(r.subRequests.map((sr) => sr.laboratory.name))],
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({
      data,
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
