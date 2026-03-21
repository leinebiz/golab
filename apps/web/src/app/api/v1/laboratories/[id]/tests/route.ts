import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { UpdateLabTestMappingsSchema } from '@golab/shared';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const lab = await prisma.laboratory.findUnique({ where: { id } });
  if (!lab) {
    return NextResponse.json({ error: 'Laboratory not found' }, { status: 404 });
  }

  const labTests = await prisma.labTest.findMany({
    where: { laboratoryId: id },
    include: {
      testCatalogue: {
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
          basePrice: true,
          standardTatDays: true,
          accreditation: true,
        },
      },
    },
    orderBy: { testCatalogue: { name: 'asc' } },
  });

  return NextResponse.json({ data: labTests });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateLabTestMappingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 },
    );
  }

  const lab = await prisma.laboratory.findUnique({ where: { id } });
  if (!lab) {
    return NextResponse.json({ error: 'Laboratory not found' }, { status: 404 });
  }

  // Verify all test catalogue IDs exist
  const testIds = parsed.data.mappings.map((m) => m.testCatalogueId);
  const existingTests = await prisma.testCatalogue.findMany({
    where: { id: { in: testIds } },
    select: { id: true },
  });
  const existingTestIds = new Set(existingTests.map((t: { id: string }) => t.id));
  const missingIds = testIds.filter((tid) => !existingTestIds.has(tid));
  if (missingIds.length > 0) {
    return NextResponse.json(
      { error: `Test catalogue IDs not found: ${missingIds.join(', ')}` },
      { status: 400 },
    );
  }

  // Upsert each mapping in a transaction
  const result = await prisma.$transaction(
    parsed.data.mappings.map((mapping) =>
      prisma.labTest.upsert({
        where: {
          laboratoryId_testCatalogueId: {
            laboratoryId: id,
            testCatalogueId: mapping.testCatalogueId,
          },
        },
        create: {
          laboratoryId: id,
          testCatalogueId: mapping.testCatalogueId,
          accreditation: mapping.accreditation,
          labTatDays: mapping.labTatDays,
          labPrice: mapping.labPrice ?? null,
          isActive: mapping.isActive,
          organizationId: lab.organizationId,
        },
        update: {
          accreditation: mapping.accreditation,
          labTatDays: mapping.labTatDays,
          labPrice: mapping.labPrice ?? null,
          isActive: mapping.isActive,
        },
      }),
    ),
  );

  return NextResponse.json({ data: result });
}
