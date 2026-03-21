import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';

/**
 * GET /api/v1/certificates/:id
 *
 * Returns full certificate details including related sub-request,
 * laboratory, request, and test information.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('certificates', 'read');
    const { id } = await params;

    const certificate = await prisma.certificate.findUnique({
      where: { id },
      include: {
        subRequest: {
          include: {
            laboratory: { select: { id: true, name: true, code: true } },
            request: {
              select: {
                id: true,
                reference: true,
                organizationId: true,
                organization: { select: { id: true, name: true } },
                turnaroundType: true,
                specialInstructions: true,
              },
            },
            tests: {
              include: {
                testCatalogue: {
                  select: { id: true, code: true, name: true, category: true },
                },
              },
            },
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    return NextResponse.json({ data: certificate });
  } catch (err) {
    return handleApiError(err, 'certificates.get.failed');
  }
}
