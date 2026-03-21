import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { DefaultToleranceSchema } from '@golab/shared';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

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
    });

    return NextResponse.json(tolerances);
  } catch (error) {
    console.error('Failed to fetch tolerances:', error);
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
    const { id } = await context.params;
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
    });

    return NextResponse.json(tolerances);
  } catch (error) {
    console.error('Failed to update tolerances:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
