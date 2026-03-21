import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const subRequest = await prisma.subRequest.findUnique({
      where: { id },
      select: { id: true, status: true, subReference: true },
    });

    if (!subRequest) {
      return NextResponse.json({ error: 'Sub-request not found' }, { status: 404 });
    }

    const validStatuses = [
      'TESTING_IN_PROGRESS',
      'TESTING_COMPLETED',
      'TESTING_DELAYED',
      'RETURNED_TO_LAB',
    ];

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

    const result = await prisma.$transaction(async (tx) => {
      const existingCount = await tx.certificate.count({
        where: { subRequestId: id },
      });

      const certificate = await tx.certificate.create({
        data: {
          subRequestId: id,
          uploadedById: 'lab-user',
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
          status: 'AWAITING_GOLAB_REVIEW',
          testingCompletedAt: new Date(),
        },
      });

      await tx.statusTransition.create({
        data: {
          subRequestId: id,
          fromStatus: subRequest.status,
          toStatus: 'AWAITING_GOLAB_REVIEW',
          triggeredBy: 'lab-user',
          reason: `Certificate uploaded: ${file.name}`,
        },
      });

      return certificate;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Failed to upload certificate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
