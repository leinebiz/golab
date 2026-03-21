import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const disclaimer = await prisma.disclaimer.findUnique({
      where: { id },
      include: {
        acceptances: {
          include: {
            organization: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!disclaimer) {
      return NextResponse.json({ error: 'Disclaimer not found' }, { status: 404 });
    }

    return NextResponse.json(disclaimer);
  } catch (error) {
    console.error('Failed to fetch disclaimer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { title, content, isActive } = body;

    const existing = await prisma.disclaimer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Disclaimer not found' }, { status: 404 });
    }

    // If activating this disclaimer, deactivate other versions of same type
    if (isActive === true && !existing.isActive) {
      await prisma.disclaimer.updateMany({
        where: { type: existing.type, isActive: true, id: { not: id } },
        data: { isActive: false },
      });
    }

    const updated = await prisma.disclaimer.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update disclaimer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
