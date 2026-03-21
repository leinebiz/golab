import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { ResetPasswordSchema } from '@golab/shared';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ResetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { token, password } = parsed.data;

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        action: 'PASSWORD_RESET_REQUESTED',
        metadata: {
          path: ['tokenHash'],
          equals: token,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!auditLog) {
      return NextResponse.json({ message: 'Invalid or expired reset token' }, { status: 400 });
    }

    const metadata = auditLog.metadata as { expiresAt: string } | null;
    if (!metadata?.expiresAt || new Date(metadata.expiresAt) < new Date()) {
      return NextResponse.json(
        { message: 'Reset token has expired. Please request a new one.' },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: auditLog.entityId },
        data: { passwordHash },
      });

      await tx.auditLog.create({
        data: {
          actorId: auditLog.entityId,
          actorType: 'system',
          action: 'PASSWORD_RESET_COMPLETED',
          entityType: 'User',
          entityId: auditLog.entityId,
          metadata: { resetAuditLogId: auditLog.id },
        },
      });
    });

    return NextResponse.json({
      message: 'Password has been reset successfully.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ message: 'An unexpected error occurred' }, { status: 500 });
  }
}
