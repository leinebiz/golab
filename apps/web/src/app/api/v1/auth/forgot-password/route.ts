import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { ForgotPasswordSchema } from '@golab/shared';
import { checkRateLimit, rateLimitResponse } from '@/lib/security/rate-limiter';
import { logger } from '@/lib/observability/logger';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed, resetAt } = checkRateLimit(ip, 'auth');
  if (!allowed) return rateLimitResponse(resetAt);

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
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorType: 'system',
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'User',
        entityId: user.id,
        metadata: {
          tokenHash: token,
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
