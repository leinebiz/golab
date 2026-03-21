import { renderToBuffer } from '@react-pdf/renderer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ReactElement } from 'react';

const s3 = new S3Client({
  region: process.env.S3_REGION ?? 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? '',
    secretAccessKey: process.env.S3_SECRET_KEY ?? '',
  },
});

const BUCKET = process.env.S3_BUCKET ?? 'golab-dev';

/**
 * Render a React-PDF template to a PDF buffer.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generatePdf(template: ReactElement<any>): Promise<Buffer> {
  const buffer = await renderToBuffer(template);
  return Buffer.from(buffer);
}

/**
 * Upload a PDF buffer to S3.
 */
export async function storePdf(key: string, buffer: Buffer): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    }),
  );
}

/**
 * Generate a pre-signed URL for downloading a PDF from S3.
 * Default expiry: 1 hour (3600 seconds).
 */
export async function getSignedPdfUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  const url = await getSignedUrl(s3, command, { expiresIn });
  return url;
}
