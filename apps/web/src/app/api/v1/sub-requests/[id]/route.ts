import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
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
  } catch (err) {
    return handleApiError(err, 'sub-requests.get.failed');
  }
}
