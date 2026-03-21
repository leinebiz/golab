import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const subRequest = await prisma.subRequest.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            organization: { select: { id: true, name: true } },
          },
        },
        laboratory: { select: { id: true, name: true, code: true } },
        tests: {
          include: {
            testCatalogue: {
              select: { id: true, code: true, name: true, category: true },
            },
          },
        },
        sampleIssues: {
          orderBy: { createdAt: 'desc' },
        },
        certificates: {
          orderBy: { createdAt: 'desc' },
        },
        waybill: true,
      },
    });

    if (!subRequest) {
      return NextResponse.json({ error: 'Sub-request not found' }, { status: 404 });
    }

    return NextResponse.json(subRequest);
  } catch (error) {
    console.error('Failed to fetch sub-request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
