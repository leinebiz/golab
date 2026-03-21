import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/middleware';
import { CreateLaboratorySchema } from '@golab/shared';

export async function GET(request: NextRequest) {
  await requirePermission('laboratories', 'read');

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const search = searchParams.get('search') ?? '';
  const activeOnly = searchParams.get('activeOnly') !== 'false';

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (activeOnly) {
    where.isActive = true;
  }

  const [labs, total] = await Promise.all([
    prisma.laboratory.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true } },
        _count: { select: { labTests: true } },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.laboratory.count({ where }),
  ]);

  return Response.json({
    data: labs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  await requirePermission('laboratories', 'create');

  const body = await request.json();
  const parsed = CreateLaboratorySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const existing = await prisma.laboratory.findUnique({ where: { code: data.code } });
  if (existing) {
    return Response.json(
      { error: `Laboratory with code "${data.code}" already exists` },
      { status: 409 },
    );
  }

  const lab = await prisma.laboratory.create({
    data: {
      name: data.name,
      code: data.code,
      organizationId: data.organizationId,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        accreditationBody: data.accreditationBody,
        accreditationNumber: data.accreditationNumber,
      },
      isActive: data.isActive,
    },
    include: { organization: { select: { id: true, name: true } } },
  });

  return Response.json(lab, { status: 201 });
}
