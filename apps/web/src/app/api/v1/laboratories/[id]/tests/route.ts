import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/middleware';
import { SetLabTestsSchema } from '@golab/shared';
import { Prisma } from '@golab/database';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission('laboratories', 'read');
  const { id } = await params;

  const lab = await prisma.laboratory.findUnique({ where: { id } });
  if (!lab) {
    return Response.json({ error: 'Laboratory not found' }, { status: 404 });
  }

  const labTests = await prisma.labTest.findMany({
    where: { laboratoryId: id },
    include: {
      testCatalogue: {
        select: { id: true, name: true, code: true, category: true, basePrice: true },
      },
    },
    orderBy: { testCatalogue: { name: 'asc' } },
  });

  return Response.json(
    labTests.map((lt) => ({
      ...lt,
      labPrice: lt.labPrice?.toString() ?? null,
      testCatalogue: { ...lt.testCatalogue, basePrice: lt.testCatalogue.basePrice.toString() },
    })),
  );
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission('laboratories', 'update');
  const { id } = await params;
  const body = await request.json();
  const parsed = SetLabTestsSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 },
    );
  }

  const lab = await prisma.laboratory.findUnique({ where: { id } });
  if (!lab) {
    return Response.json({ error: 'Laboratory not found' }, { status: 404 });
  }

  const { tests } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.labTest.deleteMany({ where: { laboratoryId: id } });
    if (tests.length > 0) {
      await tx.labTest.createMany({
        data: tests.map((t) => ({
          laboratoryId: id,
          testCatalogueId: t.testCatalogueId,
          accreditation: t.accreditation,
          labTatDays: t.labTatDays,
          labPrice: t.labPrice ? new Prisma.Decimal(t.labPrice) : null,
          isActive: t.isActive,
          organizationId: lab.organizationId,
        })),
      });
    }
  });

  const labTests = await prisma.labTest.findMany({
    where: { laboratoryId: id },
    include: {
      testCatalogue: {
        select: { id: true, name: true, code: true, category: true, basePrice: true },
      },
    },
    orderBy: { testCatalogue: { name: 'asc' } },
  });

  return Response.json(
    labTests.map((lt) => ({
      ...lt,
      labPrice: lt.labPrice?.toString() ?? null,
      testCatalogue: { ...lt.testCatalogue, basePrice: lt.testCatalogue.basePrice.toString() },
    })),
  );
}
