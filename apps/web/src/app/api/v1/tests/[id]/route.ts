import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { UpdateTestCatalogueSchema } from '@golab/shared';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    return NextResponse.json({ error: 'Test not found' }, { status: 404 });
  }

  return NextResponse.json({ data: test });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateTestCatalogueSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 },
    );
  }

  const existing = await prisma.testCatalogue.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Test not found' }, { status: 404 });
  }

  const { basePrice, expediteSurcharge, code, ...rest } = parsed.data;

  if (code && code !== existing.code) {
    const codeExists = await prisma.testCatalogue.findUnique({ where: { code } });
    if (codeExists) {
      return NextResponse.json({ error: 'A test with this code already exists' }, { status: 409 });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = { ...rest };
  if (code !== undefined) updateData.code = code;
  if (basePrice !== undefined) updateData.basePrice = basePrice;
  if (expediteSurcharge !== undefined) {
    updateData.expediteSurcharge = expediteSurcharge ?? null;
  }

  const test = await prisma.testCatalogue.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ data: test });
}
