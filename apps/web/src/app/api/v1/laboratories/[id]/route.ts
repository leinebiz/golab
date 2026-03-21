import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/middleware';
import { UpdateLaboratorySchema } from '@golab/shared';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission('laboratories', 'read');
  const { id } = await params;

  const lab = await prisma.laboratory.findUnique({
    where: { id },
    include: {
      organization: { select: { id: true, name: true } },
      labTests: {
        include: {
          testCatalogue: { select: { id: true, name: true, code: true, category: true } },
        },
        orderBy: { testCatalogue: { name: 'asc' } },
      },
    },
  });

  if (!lab) {
    return Response.json({ error: 'Laboratory not found' }, { status: 404 });
  }

  return Response.json({
    ...lab,
    labTests: lab.labTests.map((lt) => ({ ...lt, labPrice: lt.labPrice?.toString() ?? null })),
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission('laboratories', 'update');
  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateLaboratorySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 },
    );
  }

  const existing = await prisma.laboratory.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: 'Laboratory not found' }, { status: 404 });
  }

  const data = parsed.data;

  if (data.code && data.code !== existing.code) {
    const duplicate = await prisma.laboratory.findUnique({ where: { code: data.code } });
    if (duplicate) {
      return Response.json(
        { error: `Laboratory with code "${data.code}" already exists` },
        { status: 409 },
      );
    }
  }

  const existingLocation = existing.location as Record<string, unknown> | null;
  let location = existingLocation;
  if (data.latitude !== undefined || data.longitude !== undefined) {
    location = {
      ...existingLocation,
      latitude: data.latitude ?? (existingLocation?.latitude as number),
      longitude: data.longitude ?? (existingLocation?.longitude as number),
    };
  }
  if (data.accreditationBody !== undefined)
    location = { ...location, accreditationBody: data.accreditationBody };
  if (data.accreditationNumber !== undefined)
    location = { ...location, accreditationNumber: data.accreditationNumber };

  // Build update data explicitly to satisfy Prisma's union type
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.organizationId !== undefined)
    updateData.organization = { connect: { id: data.organizationId } };
  if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
  if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
  if (location !== existingLocation) updateData.location = location;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await prisma.laboratory.update({
    where: { id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: updateData as any,
    include: { organization: { select: { id: true, name: true } } },
  });

  return Response.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requirePermission('laboratories', 'deactivate');
  const { id } = await params;

  const existing = await prisma.laboratory.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: 'Laboratory not found' }, { status: 404 });
  }

  const updated = await prisma.laboratory.update({ where: { id }, data: { isActive: false } });
  return Response.json(updated);
}
