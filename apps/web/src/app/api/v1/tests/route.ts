import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/middleware';
import { CreateTestSchema } from '@golab/shared';
import { Prisma } from '@golab/database';

export async function GET(request: NextRequest) {
  await requirePermission('testCatalogue', 'read');

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const search = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? '';
  const accreditation = searchParams.get('accreditation') ?? '';
  const activeOnly = searchParams.get('activeOnly') !== 'false';

  const where: Prisma.TestCatalogueWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (category) {
    where.category = category;
  }

  if (accreditation === 'ACCREDITED' || accreditation === 'NON_ACCREDITED') {
    where.accreditation = accreditation;
  }

  if (activeOnly) {
    where.isActive = true;
  }

  const [tests, total] = await Promise.all([
    prisma.testCatalogue.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.testCatalogue.count({ where }),
  ]);

  const serialized = tests.map((t) => ({
    ...t,
    basePrice: t.basePrice.toString(),
    expediteSurcharge: t.expediteSurcharge?.toString() ?? null,
  }));

  return Response.json({
    data: serialized,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  await requirePermission('testCatalogue', 'create');

  const body = await request.json();
  const parsed = CreateTestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const existing = await prisma.testCatalogue.findUnique({ where: { code: data.code } });
  if (existing) {
    return Response.json(
      { error: `Test with code "${data.code}" already exists` },
      { status: 409 },
    );
  }

  let expediteSurcharge: Prisma.Decimal | undefined;
  if (data.expediteSurchargePercent != null && data.basePrice) {
    const base = new Prisma.Decimal(data.basePrice);
    expediteSurcharge = base.mul(data.expediteSurchargePercent).div(100);
  }

  const test = await prisma.testCatalogue.create({
    data: {
      name: data.name,
      code: data.code,
      description: data.description ?? null,
      category: data.category,
      accreditation: data.accreditation,
      basePrice: new Prisma.Decimal(data.basePrice),
      standardTatDays: data.standardTatDays,
      expeditedTatDays: data.expeditedTatDays ?? null,
      expediteSurcharge: expediteSurcharge ?? null,
      toleranceApplicable: data.toleranceApplicable,
      toleranceUnit: data.toleranceUnit ?? null,
      isActive: data.isActive,
    },
  });

  return Response.json(
    {
      ...test,
      basePrice: test.basePrice.toString(),
      expediteSurcharge: test.expediteSurcharge?.toString() ?? null,
    },
    { status: 201 },
  );
}
