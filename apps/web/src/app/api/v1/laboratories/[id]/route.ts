import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { UpdateLaboratorySchema } from '@golab/shared';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const lab = await prisma.laboratory.findUnique({
    where: { id },
    include: {
      organization: { select: { id: true, name: true } },
      labTests: {
        include: {
          testCatalogue: { select: { id: true, code: true, name: true, category: true } },
        },
      },
    },
  });

  if (!lab) {
    return NextResponse.json({ error: 'Laboratory not found' }, { status: 404 });
  }

  return NextResponse.json({ data: lab });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateLaboratorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 },
    );
  }

  const existing = await prisma.laboratory.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Laboratory not found' }, { status: 404 });
  }

  if (parsed.data.code && parsed.data.code !== existing.code) {
    const codeExists = await prisma.laboratory.findUnique({
      where: { code: parsed.data.code },
    });
    if (codeExists) {
      return NextResponse.json(
        { error: 'A laboratory with this code already exists' },
        { status: 409 },
      );
    }
  }

  const lab = await prisma.laboratory.update({
    where: { id },
    data: parsed.data,
    include: {
      organization: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: lab });
}
