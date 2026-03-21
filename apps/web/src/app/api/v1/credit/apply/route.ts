import { NextRequest, NextResponse } from 'next/server';
import { prisma, Prisma } from '@golab/database';
import { requirePermission } from '@/lib/auth/middleware';
import { logger } from '@/lib/observability/logger';

/**
 * POST /api/v1/credit/apply -- submit a credit application.
 * Accepts multipart form data with optional document uploads.
 */
export async function POST(request: NextRequest) {
  const session = await requirePermission('creditAccount', 'apply');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;

  const formData = await request.formData();
  const organizationId = formData.get('organizationId') as string;
  const requestedLimit = formData.get('requestedLimit') as string;
  const reason = formData.get('reason') as string | null;

  if (!organizationId || !requestedLimit) {
    return NextResponse.json(
      { error: 'organizationId and requestedLimit are required' },
      { status: 400 },
    );
  }

  if (user.organizationId !== organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const limit = new Prisma.Decimal(requestedLimit);
  if (limit.lte(0)) {
    return NextResponse.json({ error: 'Credit limit must be positive' }, { status: 400 });
  }

  const documentFiles = formData.getAll('documents') as File[];
  const documentNames = documentFiles
    .filter((f) => f.size > 0)
    .map((f) => ({ name: f.name, size: f.size, type: f.type }));

  const existing = await prisma.creditAccount.findUnique({
    where: { organizationId },
  });
  if (existing && existing.status === 'PENDING_REVIEW') {
    return NextResponse.json({ error: 'Application already pending' }, { status: 409 });
  }
  if (existing && existing.status === 'APPROVED') {
    return NextResponse.json({ error: 'Already approved' }, { status: 409 });
  }

  const creditAccount = await prisma.creditAccount.upsert({
    where: { organizationId },
    update: {
      status: 'PENDING_REVIEW',
      creditLimit: limit,
      applicationDate: new Date(),
      applicationDocs: {
        requestedLimit: limit.toString(),
        reason: reason ?? '',
        documents: documentNames,
        submittedBy: user.id,
      },
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
    },
    create: {
      organizationId,
      status: 'PENDING_REVIEW',
      creditLimit: limit,
      applicationDate: new Date(),
      applicationDocs: {
        requestedLimit: limit.toString(),
        reason: reason ?? '',
        documents: documentNames,
        submittedBy: user.id,
      },
    },
  });

  logger.info(
    {
      creditAccountId: creditAccount.id,
      organizationId,
      requestedLimit: limit.toString(),
      actor: user.id,
    },
    'credit.application.submitted',
  );

  return NextResponse.json({ data: creditAccount }, { status: 201 });
}
