import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { organizationId, acceptedById, ipAddress } = body;

    if (!organizationId || !acceptedById) {
      return NextResponse.json(
        { error: 'organizationId and acceptedById are required' },
        { status: 400 },
      );
    }

    const disclaimer = await prisma.disclaimer.findUnique({ where: { id } });
    if (!disclaimer) {
      return NextResponse.json({ error: 'Disclaimer not found' }, { status: 404 });
    }
    if (!disclaimer.isActive) {
      return NextResponse.json({ error: 'Cannot accept an inactive disclaimer' }, { status: 400 });
    }

    const acceptance = await prisma.disclaimerAcceptance.upsert({
      where: {
        disclaimerId_organizationId: {
          disclaimerId: id,
          organizationId,
        },
      },
      update: {
        acceptedById,
        acceptedAt: new Date(),
        ipAddress: ipAddress ?? null,
      },
      create: {
        disclaimerId: id,
        organizationId,
        acceptedById,
        ipAddress: ipAddress ?? null,
      },
    });

    return NextResponse.json(acceptance, { status: 201 });
  } catch (error) {
    console.error('Failed to record disclaimer acceptance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
