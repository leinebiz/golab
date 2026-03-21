import { NextResponse } from 'next/server';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/errors';

const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? 'af-south-1',
  ...(process.env.AWS_ENDPOINT_URL
    ? { endpoint: process.env.AWS_ENDPOINT_URL, forcePathStyle: true }
    : {}),
});

const BUCKET_NAME = process.env.CERTIFICATES_BUCKET ?? 'golab-certificates';
const SIGNED_URL_EXPIRES_SECONDS = 300; // 5 minutes

/**
 * GET /api/v1/certificates/:id/download
 *
 * Generates a pre-signed S3 URL for downloading the certificate PDF.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('certificates', 'read');
    const { id } = await params;

    const certificate = await prisma.certificate.findUnique({
      where: { id },
      select: {
        id: true,
        originalFileKey: true,
        golabFileKey: true,
        fileName: true,
        mimeType: true,
        format: true,
      },
    });

    if (!certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    // Prefer GoLab-branded version if available
    const fileKey = certificate.golabFileKey ?? certificate.originalFileKey;

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ResponseContentDisposition: `inline; filename="${certificate.fileName}"`,
      ResponseContentType: certificate.mimeType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: SIGNED_URL_EXPIRES_SECONDS,
    });

    return NextResponse.json({
      data: {
        url: signedUrl,
        fileName: certificate.fileName,
        mimeType: certificate.mimeType,
        expiresInSeconds: SIGNED_URL_EXPIRES_SECONDS,
      },
    });
  } catch (err) {
    return handleApiError(err, 'certificates.download.failed');
  }
}
