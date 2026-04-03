import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/middleware';
import { executeTransition } from '@/lib/workflow/engine';
import { logger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const start = performance.now();
  try {
    const session = await requireRole(['LAB_STAFF', 'LAB_MANAGER', 'ADMIN']);
    const user = session.user as { id: string; role: string };
    const { id } = await params;

    const subRequest = await prisma.subRequest.findUnique({
      where: { id },
      select: { id: true, status: true, subReference: true },
    });

    if (!subRequest) {
      return NextResponse.json({ error: 'Sub-request not found' }, { status: 404 });
    }

    const validStatuses = ['TESTING_COMPLETED', 'RETURNED_TO_LAB'];

    if (!validStatuses.includes(subRequest.status)) {
      return NextResponse.json(
        { error: `Cannot upload certificate in status ${subRequest.status}.` },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
    }

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 20MB limit' }, { status: 400 });
    }

    // In production, file would be uploaded to S3/R2.
    // For now, generate a placeholder key.
    const fileKey = `certificates/${subRequest.subReference}/${Date.now()}-${file.name}`;

    const certificate = await prisma.$transaction(async (tx) => {
      const existingCount = await tx.certificate.count({
        where: { subRequestId: id },
      });

      const cert = await tx.certificate.create({
        data: {
          subRequestId: id,
          uploadedById: user.id,
          format: 'LAB_ORIGINAL',
          version: existingCount + 1,
          originalFileKey: fileKey,
          fileName: file.name,
          mimeType: file.type,
        },
      });

      await tx.subRequest.update({
        where: { id },
        data: {
          testingCompletedAt: new Date(),
        },
      });

      return cert;
    });

    await executeTransition({
      entityType: 'SubRequest',
      entityId: id,
      targetStatus: 'AWAITING_GOLAB_REVIEW',
      triggeredBy: { userId: user.id, role: user.role, type: 'user' },
      reason: `Certificate uploaded: ${certificate.fileName}`,
    });

    metrics.recordApiRequest(performance.now() - start, {
      route: 'sub-requests.upload-certificate',
      status: 'success',
    });
    return NextResponse.json(certificate, { status: 201 });
  } catch (error) {
    metrics.recordApiRequest(performance.now() - start, {
      route: 'sub-requests.upload-certificate',
      status: 'error',
    });
    logger.error({ error }, 'certificate.upload.failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
