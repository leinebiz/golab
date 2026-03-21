import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/middleware';
import { UpdateTestSchema } from '@golab/shared';
import { Prisma } from '@golab/database';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission('testCatalogue', 'read');
  const { id } = await params;

  const test = await prisma.testCatalogue.findUnique({
    where: { id },
    include: {
      labTests: {
        include: { laboratory: { select: { id: true, name: true, code: true } } },
      },
    },
  });

  if (!test) {
    return Response.json({ error: 'Test not found' }, { status: 404 });
  }

  return Response.json({
    ...test,
    basePrice: test.basePrice.toString(),
    expediteSurcharge: test.expediteSurcharge?.toString() ?? null,
    labTests: test.labTests.map((lt) => ({
      ...lt,
      labPrice: lt.labPrice?.toString() ?? null,
    })),
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission('testCatalogue', 'update');
  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateTestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 },
    );
  }

  const existing = await prisma.testCatalogue.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: 'Test not found' }, { status: 404 });
  }

  const data = parsed.data;

  if (data.code && data.code !== existing.code) {
    const duplicate = await prisma.testCatalogue.findUnique({ where: { code: data.code } });
    if (duplicate) {
      return Response.json(
        { error: `Test with code "${data.code}" already exists` },
        { status: 409 },
      );
    }
  }

  const updateData: Prisma.TestCatalogueUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.description !== undefined) updateData.description = data.description ?? null;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.accreditation !== undefined) updateData.accreditation = data.accreditation;
  if (data.basePrice !== undefined) updateData.basePrice = new Prisma.Decimal(data.basePrice);
  if (data.standardTatDays !== undefined) updateData.standardTatDays = data.standardTatDays;
  if (data.expeditedTatDays !== undefined)
    updateData.expeditedTatDays = data.expeditedTatDays ?? null;
  if (data.toleranceApplicable !== undefined)
    updateData.toleranceApplicable = data.toleranceApplicable;
  if (data.toleranceUnit !== undefined) updateData.toleranceUnit = data.toleranceUnit ?? null;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  if (data.expediteSurchargePercent !== undefined || data.basePrice !== undefined) {
    const base = data.basePrice ? new Prisma.Decimal(data.basePrice) : existing.basePrice;
    if (data.expediteSurchargePercent != null) {
      updateData.expediteSurcharge = base.mul(data.expediteSurchargePercent).div(100);
    } else {
      updateData.expediteSurcharge = null;
    }
  }

  const updated = await prisma.testCatalogue.update({ where: { id }, data: updateData });

  return Response.json({
    ...updated,
    basePrice: updated.basePrice.toString(),
    expediteSurcharge: updated.expediteSurcharge?.toString() ?? null,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requirePermission('testCatalogue', 'deactivate');
  const { id } = await params;

  const existing = await prisma.testCatalogue.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: 'Test not found' }, { status: 404 });
  }

  const updated = await prisma.testCatalogue.update({ where: { id }, data: { isActive: false } });

  return Response.json({
    ...updated,
    basePrice: updated.basePrice.toString(),
    expediteSurcharge: updated.expediteSurcharge?.toString() ?? null,
  });
}
