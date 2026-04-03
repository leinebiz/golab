import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { DefaultToleranceSchema } from '@golab/shared';
import { logger } from '@/lib/observability/logger';

const ADMIN_ROLES = ['GOLAB_ADMIN', 'GOLAB_REVIEWER', 'GOLAB_FINANCE'];

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    const user = session.user as { id: string; role: string; organizationId: string };
    const { id } = await context.params;

    if (!ADMIN_ROLES.includes(user.role) && user.organizationId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tolerances = await prisma.defaultTolerance.findMany({
      where: { organizationId: id },
      include: {
        testCatalogue: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            toleranceUnit: true,
            toleranceApplicable: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    return NextResponse.json(tolerances);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 });
    logger.error({ error }, 'tolerances.fetch.failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface TolerancePayload {
  testCatalogueId: string;
  minValue?: number;
  maxValue?: number;
  unit: string;
  notes?: string;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    const user = session.user as { id: string; role: string; organizationId: string };
    const { id } = await context.params;

    if (!ADMIN_ROLES.includes(user.role) && user.organizationId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();

    if (!Array.isArray(body.tolerances)) {
      return NextResponse.json({ error: 'tolerances must be an array' }, { status: 400 });
    }

    const toleranceItems = body.tolerances as TolerancePayload[];

    // Validate each tolerance entry
    for (const entry of toleranceItems) {
      const parsed = DefaultToleranceSchema.safeParse(entry);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }
    }

    // Delete and recreate
    await prisma.defaultTolerance.deleteMany({
      where: { organizationId: id },
    });

    if (toleranceItems.length > 0) {
      await prisma.defaultTolerance.createMany({
        data: toleranceItems.map((t) => ({
          organizationId: id,
          testCatalogueId: t.testCatalogueId,
          minValue: t.minValue,
          maxValue: t.maxValue,
          unit: t.unit,
          notes: t.notes,
        })),
      });
    }

    const tolerances = await prisma.defaultTolerance.findMany({
      where: { organizationId: id },
      include: {
        testCatalogue: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            toleranceUnit: true,
            toleranceApplicable: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    return NextResponse.json(tolerances);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 });
    logger.error({ error }, 'tolerances.update.failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
