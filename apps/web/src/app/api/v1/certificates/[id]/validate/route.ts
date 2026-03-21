import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/middleware';
import { validateCertificate } from '@/lib/workflow/certificate-validation';
import { logger } from '@/lib/observability/logger';

/**
 * GET /api/v1/certificates/:id/validate
 * Run validation checks on a certificate.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('certificates', 'review');
    const { id } = await params;

    const result = await validateCertificate(id);

    logger.info(
      { userId: session.user!.id, certificateId: id, isValid: result.isValid },
      'certificate.validation.requested',
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Forbidden') {
      return NextResponse.json(
        { error: message },
        { status: message === 'Unauthorized' ? 401 : 403 },
      );
    }
    logger.error({ error }, 'certificate.validation.error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
