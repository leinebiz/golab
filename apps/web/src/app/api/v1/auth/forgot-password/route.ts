import { NextResponse } from 'next/server';
import crypto, { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { ForgotPasswordSchema } from '@golab/shared';
import { logger } from '@/lib/observability/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ForgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { email } = parsed.data;

    const successResponse = NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return successResponse;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorType: 'system',
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'User',
        entityId: user.id,
        metadata: {
          tokenHash,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    return successResponse;
  } catch (error) {
    logger.error({ error }, 'auth.forgot_password.failed');
    return NextResponse.json({ message: 'An unexpected error occurred' }, { status: 500 });
  }
}
